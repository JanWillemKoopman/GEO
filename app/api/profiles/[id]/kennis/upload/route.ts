import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { describeError, classifyError } from "@/lib/errors";
import { haalKennisUitUpload } from "@/lib/pipeline/upload-kennis";
import { legUploadVast } from "@/lib/kennis/uit-upload";
import { leesUpload } from "@/lib/kennis/upload-bestand";
import { MAX_UPLOAD_CHARS, MIN_UPLOAD_CHARS } from "@/lib/kennis/upload-grenzen";

/**
 * POST /api/profiles/[id]/kennis/upload: de handmatige upload op "Feiten en
 * kennis" (30 september 2026). Multipart: `bestand` (PDF of tekst), `tekst`
 * (geplakt), of allebei; ze worden achter elkaar gelezen als één stuk materiaal.
 *
 * ── WIE HET MAG ─────────────────────────────────────────────────────────────
 *
 * De klant en de consultant, allebei: de eigenaar wil het systeem op een snelle
 * manier slimmer maken met wat de klant zelf aanlevert. Daarom `getOwnedProfile()`
 * (toegang tot het merk) en niet `isStaff()` zoals bij de route voor wijzigingen
 * op een bestaand item. Dat is ook hoe het merkdossier werkt. Wat de klant hier
 * aanlevert gaat, als "staat er", zonder tussenstap van de consultant naar de
 * schrijver (besluit V21). Een vermoeden doet dat niet: dat wacht op een bevestiging.
 *
 * ── DE VOLGORDE ─────────────────────────────────────────────────────────────
 *
 * Eerst de hash (dezelfde tekst twee keer is één upload), dan de AI-aanroep, en pas
 * daarna het document bewaren in `brand_documents`. Zo blijft er bij een mislukte
 * aanroep geen document achter dat bij een nieuwe poging als "al aangeleverd" zou
 * tellen (conventie 9: elke stap controleert eerst of zijn resultaat al bestaat).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const bestand = form.get("bestand");
  const geplakt = typeof form.get("tekst") === "string" ? (form.get("tekst") as string).trim() : "";
  const stukken: string[] = [];
  let label: string | null = null;

  if (bestand instanceof File && bestand.size > 0) {
    const gelezen = await leesUpload(bestand);
    if (!gelezen.ok) return NextResponse.json({ error: gelezen.melding ?? "Dit bestand liet zich niet lezen." }, { status: 400 });
    stukken.push(gelezen.tekst);
    label = bestand.name.slice(0, 120);
  }
  if (geplakt) stukken.push(geplakt);

  const tekst = stukken.join("\n\n").trim();
  if (tekst.length < MIN_UPLOAD_CHARS) {
    return NextResponse.json({ error: "Er staat te weinig tekst in. Kies een document of plak wat meer tekst." }, { status: 400 });
  }
  if (tekst.length > MAX_UPLOAD_CHARS) {
    return NextResponse.json(
      {
        error:
          `Dit is meer dan ${MAX_UPLOAD_CHARS.toLocaleString("nl-NL")} tekens. ` +
          `Lever het in twee delen aan, dan zie je ook per deel wat eruit komt.`,
      },
      { status: 400 },
    );
  }

  try {
    const hash = createHash("sha256").update(tekst).digest("hex");
    const { data: bestaand } = await admin.from("brand_documents").select("id").eq("profile_id", id).eq("content_hash", hash).maybeSingle();
    if (bestaand) return NextResponse.json({ alAangeleverd: true });

    const uitkomst = await haalKennisUitUpload({ tekst, merknaam: profile.brand_name ?? profile.name, profileId: id });

    const { data: document, error: documentFout } = await admin
      .from("brand_documents")
      .insert({
        profile_id: id,
        label: label ?? (typeof form.get("label") === "string" && (form.get("label") as string).trim() ? (form.get("label") as string).trim().slice(0, 120) : "Geplakte tekst"),
        body: tekst,
        content_hash: hash,
        chars: tekst.length,
      })
      .select("id")
      .maybeSingle();
    if (documentFout || !document) {
      // Zonder document is er geen herkomst om de items aan te hangen.
      throw new Error(`Het aangeleverde materiaal bewaren mislukte: ${documentFout?.message ?? "onbekende fout"}`);
    }
    const documentId = document.id as string;

    const telling = await legUploadVast(
      admin,
      { profileId: id, documentId, items: uitkomst.items, ruw: uitkomst.raw },
      { actor: "mens", gebruikerId: user.id },
    );

    await admin
      .from("brand_documents")
      .update({ facts_extracted: telling.feiten + telling.kennis + telling.vermoedens, facts_rejected: uitkomst.weggelaten })
      .eq("id", documentId);

    return NextResponse.json({ ...telling, weggelaten: uitkomst.weggelaten });
  } catch (err) {
    console.error(`Handmatige upload verwerken mislukt voor profiel ${id}:`, err);
    return NextResponse.json(
      { error: "Verwerken is niet gelukt.", detail: describeError(err), problem: classifyError(err) },
      { status: 500 },
    );
  }
}
