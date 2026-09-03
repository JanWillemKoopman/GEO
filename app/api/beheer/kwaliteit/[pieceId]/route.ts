import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { describeError } from "@/lib/errors";

/**
 * POST /api/beheer/kwaliteit/[pieceId], een menselijke beoordeling opslaan
 * (docs/tasks/contentkwaliteit-framework.md §6, migratie 0091).
 *
 * ── ALLEEN VOOR BEHEERDERS ──────────────────────────────────────────────────
 *
 * Dit is intern materiaal en geen klantdata: `content_quality_reviews` heeft nul
 * RLS-policies, net als `jobs`, en deze route is de enige manier om er iets in
 * te krijgen. Bij een gewone gebruiker een 404 en geen 403, net als het scherm
 * ernaast: een 403 bevestigt dat het bestaat.
 *
 * ── ÉÉN RIJ PER BEOORDELAAR PER PAGINA ──────────────────────────────────────
 *
 * Beoordeelt dezelfde persoon dezelfde pagina opnieuw, dan werkt hij zijn eigen
 * rij bij in plaats van er een tweede naast te zetten. Twee beoordelaars over
 * dezelfde pagina krijgen wél elk hun eigen rij: dat verschil van mening is
 * precies wat de ijking later nodig heeft.
 *
 * ── ALLES MAG LEEG ──────────────────────────────────────────────────────────
 *
 * Een half ingevulde beoordeling is meer waard dan geen, en een verplicht veld
 * is de snelste manier om te zorgen dat er nooit één wordt ingevuld. De route
 * valideert daarom alleen de VORM (een cijfer van 1 tot 5, een van de vier
 * correctiestanden) en nooit de aanwezigheid.
 */

const CORRECTIES = new Set(["geen", "licht", "zwaar", "opnieuw"]);

/** Een cijfer van 1 tot 5, of `null`. Alles daarbuiten wordt `null` (conventie 3). */
function schaal(waarde: unknown): number | null {
  const getal = Number(waarde);
  if (!Number.isFinite(getal) || getal < 1 || getal > 5) return null;
  return Math.round(getal);
}

/** Tekst met een bovengrens, of `null`. */
function tekst(waarde: unknown, max: number): string | null {
  if (typeof waarde !== "string") return null;
  const schoon = waarde.trim();
  return schoon ? schoon.slice(0, max) : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pieceId: string }> },
) {
  const { pieceId } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  if (!(await isStaff(user.id))) {
    return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const admin = createAdminClient();

    // Bestaat de pagina? Zonder deze controle levert een verkeerd id een rij op
    // die naar niets wijst, en die verpest elke telling in het lab.
    const { data: piece } = await admin
      .from("content_pieces")
      .select("id")
      .eq("id", pieceId)
      .maybeSingle();
    if (!piece) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

    const velden = {
      content_piece_id: pieceId,
      reviewer_id: user.id,
      reviewer_name: user.email ?? null,
      benchmark_set: tekst(body.benchmarkSet, 80),
      copywriter_equivalence: schaal(body.copywriterEquivalence),
      company_specificity: schaal(body.companySpecificity),
      generic_ai_feel: schaal(body.genericAiFeel),
      persuasiveness: schaal(body.persuasiveness),
      brand_representation: schaal(body.brandRepresentation),
      correction_effort: CORRECTIES.has(String(body.correctionEffort))
        ? String(body.correctionEffort)
        : null,
      would_send: body.wouldSend === true ? true : body.wouldSend === false ? false : null,
      first_thing_to_change: tekst(body.firstThingToChange, 500),
      notes: tekst(body.notes, 4000),
      reference_markdown: tekst(body.referenceMarkdown, 60000),
      reference_source: tekst(body.referenceSource, 300),
      updated_at: new Date().toISOString(),
    };

    // Dezelfde beoordelaar over dezelfde pagina werkt zijn eigen rij bij.
    const { data: bestaand } = await admin
      .from("content_quality_reviews")
      .select("id")
      .eq("content_piece_id", pieceId)
      .eq("reviewer_id", user.id)
      .maybeSingle();

    if (bestaand) {
      const { error } = await admin
        .from("content_quality_reviews")
        .update(velden)
        .eq("id", bestaand.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await admin.from("content_quality_reviews").insert(velden);
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
