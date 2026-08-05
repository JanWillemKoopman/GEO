import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { extractDossierFacts, MAX_DOCUMENT_CHARS } from "@/lib/pipeline/dossier";
import { createHash } from "node:crypto";
import { describeError, classifyError } from "@/lib/errors";

/**
 * POST /api/profiles/[id]/dossier, de klant levert materiaal aan, de app maakt
 * er bevestigde feiten van (implementatieplan.md S5).
 *
 * ── WAT DIT OPLOST ──────────────────────────────────────────────────────────
 *
 * De briefing stelt maximaal 8 vragen per contentbatch. Over vijf testklanten
 * leverde dat 21 beantwoorde vragen op, waarvan 8 praktisch. Van de 35
 * `aanvulling`-vragen werden er 7 beantwoord. Zo vult een kennisbank zich niet.
 *
 * Eén geplakte tarievenpagina levert er in één keer meer op dan drie
 * briefingrondes, en het kost de klant minder werk, want hij hoeft niets te
 * formuleren.
 *
 * ── WAAROM DE FEITEN ALS `fact_requests` LANDEN ─────────────────────────────
 *
 * Niet als nieuwe tabel en niet als kolom op `profiles`, maar als beantwoorde
 * vragen met `scope: 'merk'`. Drie redenen: `buildFactBase()` pikt ze dan zonder
 * één regel wijziging op via het pad dat er al ligt, de klant kan ze met de
 * bestaande facts-route doorstrepen, en ze gelden meteen voor élke analyse van
 * deze klant, wat precies de belofte van de kennisbank is (contentbriefing.md
 * §7).
 */

/** Wat er terug moet naar het scherm: het feit plus of het verloopt. */
interface DossierFactView {
  id: string;
  question: string;
  answer: string;
  verifyAfter: string | null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let body: { text?: unknown; label?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const tekst = typeof body.text === "string" ? body.text.trim() : "";
  if (tekst.length < 40) {
    return NextResponse.json(
      { error: "Plak wat meer tekst. Hier valt nog geen feit uit te halen." },
      { status: 400 },
    );
  }
  if (tekst.length > MAX_DOCUMENT_CHARS) {
    return NextResponse.json(
      {
        error:
          `Dit is meer dan ${MAX_DOCUMENT_CHARS.toLocaleString("nl-NL")} tekens. ` +
          `Plak het in twee delen, dan zie je ook per stuk welke feiten eruit komen.`,
      },
      { status: 400 },
    );
  }

  try {
    // ── Het document bewaren (migratie 0035) ────────────────────────────────
    //
    // De eerste versie gooide de brontekst weg na de extractie. Dat kostte drie
    // dingen: opnieuw uitlezen kon niet, herkomst tonen kon niet, en dezelfde
    // brochure twee keer plakken leverde twee keer dezelfde feiten op.
    //
    // De hash maakt dat laatste een non-probleem: dezelfde tekst geeft dezelfde
    // hash, ook bij 12.000 tekens, en de unieke index laat er maar één door.
    const hash = createHash("sha256").update(tekst).digest("hex");
    const { data: bestaand } = await admin
      .from("brand_documents")
      .select("id, facts_extracted")
      .eq("profile_id", id)
      .eq("content_hash", hash)
      .maybeSingle();

    if (bestaand) {
      return NextResponse.json({
        facts: [],
        proposed: 0,
        skipped: 0,
        alreadyKnown: true,
        message: "Deze tekst heb je al eerder aangeleverd; de feiten eruit staan er al.",
      });
    }

    const { data: document } = await admin
      .from("brand_documents")
      .insert({
        profile_id: id,
        label: typeof body.label === "string" && body.label.trim() ? body.label.trim() : null,
        body: tekst,
        content_hash: hash,
        chars: tekst.length,
      })
      .select("id")
      .maybeSingle();

    const documentId = (document?.id as string | undefined) ?? null;

    const { facts, proposed } = await extractDossierFacts({
      documentText: tekst,
      brandName: profile.brand_name ?? profile.name,
      profileId: id,
    });

    if (facts.length < proposed) {
      // Blijft dit structureel hoog, dan is dat het signaal dat de instructie
      // niet streng genoeg is, hetzelfde patroon als `stripped_claims_json`
      // onder het rapport (R1.3).
      console.log(
        `Merkdossier ${id}: ${proposed - facts.length} van de ${proposed} voorgestelde feiten ` +
          `stonden niet letterlijk in het aangeleverde materiaal en zijn weggelaten.`,
      );
    }

    // ── Wegschrijven ────────────────────────────────────────────────────────
    //
    // Eén voor één en fouttolerant, net als bij de briefing: de unieke index op
    // (analyse, claim_key) is partieel (alleen status 'open'), dus een botsing
    // betekent dat de vraag er al staat. Dat is geen fout maar de bedoeling,
    // dezelfde tarievenpagina twee keer plakken mag niet twee keer hetzelfde
    // feit opleveren.
    const opgeslagen: DossierFactView[] = [];
    for (const feit of facts) {
      const { data, error } = await admin
        .from("fact_requests")
        .insert({
          profile_id: id,
          // Merkbreed: dit geldt voor élke analyse van deze klant, niet alleen
          // voor de analyse die toevallig openstaat.
          analysis_id: null,
          question: feit.question,
          reason: "Uit het materiaal dat je zelf hebt aangeleverd.",
          answer: feit.answer,
          status: "beantwoord",
          answered_at: new Date().toISOString(),
          scope: "merk",
          content_piece_ids: [],
          kind: "aanvulling",
          answer_type: feit.answerType,
          options: [],
          suggested_answer: null,
          required: false,
          claim_key: feit.claimKey,
          verify_after: feit.verifyAfter,
          // De letterlijke bronzin blijft hier staan voor de snelle blik; het
          // volledige document staat sinds 0035 in `brand_documents` en is via
          // `documentId` terug te vinden.
          raw_json: { bron: "merkdossier", zin: feit.sourceSentence, documentId } as never,
        })
        .select("id")
        .maybeSingle();

      if (error) {
        if (!error.message.includes("duplicate key")) {
          console.warn(`Dossierfeit opslaan mislukt (${feit.claimKey}): ${error.message}`);
        }
        continue;
      }
      if (data) {
        opgeslagen.push({
          id: data.id as string,
          question: feit.question,
          answer: feit.answer,
          verifyAfter: feit.verifyAfter,
        });
      }
    }

    // De uitkomst bij het document zetten. Blijft `facts_rejected` structureel
    // hoog, dan is dat het signaal dat de extractie-instructie niet streng genoeg
    // is, hetzelfde patroon als `reports.stripped_claims_json` onder het rapport.
    if (documentId) {
      await admin
        .from("brand_documents")
        .update({ facts_extracted: opgeslagen.length, facts_rejected: proposed - facts.length })
        .eq("id", documentId);
    }

    return NextResponse.json({
      facts: opgeslagen,
      proposed,
      skipped: proposed - facts.length,
    });
  } catch (err) {
    console.error(`merkdossier verwerken mislukt voor profiel ${id}:`, err);
    return NextResponse.json(
      { error: "Verwerken is niet gelukt.", detail: describeError(err), problem: classifyError(err) },
      { status: 500 },
    );
  }
}
