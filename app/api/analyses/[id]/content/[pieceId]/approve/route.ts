import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { describeError, classifyError } from "@/lib/errors";

/**
 * POST /api/analyses/[id]/content/[pieceId]/approve — de klant geeft een pagina
 * vrij (implementatieplan.md S6).
 *
 * ── WAAROM DEZE ROUTE BESTAAT ───────────────────────────────────────────────
 *
 * `status: 'ready'` betekende "de pijplijn is klaar met deze pagina", en de
 * bibliotheek toonde dat als "klaar om te publiceren". Dat is niet hetzelfde.
 * Uit de contentronde van 31 juli: alle tien de pagina's kwamen op `ready`, en
 * één daarvan had vijf concrete verbeterpunten van de eigen redactie in
 * `review_notes` staan — inclusief "het directe antwoord op de hoofdvraag is
 * niet expliciet genoeg in de eerste twee zinnen".
 *
 * Sinds S6 betekent `needs_review = true` "nog niet vrijgegeven". Deze route is
 * de enige manier om dat op `false` te zetten, en dat gebeurt alleen doordat een
 * mens op de knop drukt nadat hij het vrijgavepaneel gezien heeft.
 *
 * ── WAAROM GEEN NIEUWE STATUSWAARDE ─────────────────────────────────────────
 *
 * Een status `te_beoordelen` tussen `draft` en `ready` zou een migratie op een
 * Postgres-enum vragen, plus een aanpassing op elke plek die op status filtert
 * (de pollroute, de bibliotheek, planContentDraft, runBriefing,
 * draftContentPiece). Veel bewegende delen voor een onderscheid dat
 * `needs_review` al draagt. Zie implementatieplan.md §S6.
 *
 * ── DE ROUTE MAG WEINIG, EN DAT IS HET PUNT ─────────────────────────────────
 *
 * Uitsluitend `needs_review` op `false`. Nooit de tekst, nooit de status, nooit
 * `review_notes` — die blijven staan, want vrijgeven is niet hetzelfde als
 * "er was niets aan de hand". Zelfde patroon als de briefingroute: service role
 * plus een expliciete eigenaarschapscontrole (abcplan.md §5).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; pieceId: string }> },
) {
  const { id, pieceId } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  try {
    // De pagina moet bij DEZE analyse horen. Zonder deze voorwaarde zou een
    // geldig ingelogde gebruiker met een gegokt pieceId een pagina van iemand
    // anders kunnen vrijgeven — de eigenaarschapscontrole hierboven dekt de
    // analyse, niet de pagina.
    const { data, error } = await admin
      .from("content_pieces")
      .update({ needs_review: false })
      .eq("id", pieceId)
      .eq("analysis_id", id)
      .select("id")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: "Pagina niet gevonden." }, { status: 404 });

    return NextResponse.json({ approved: true });
  } catch (err) {
    console.error(`vrijgeven mislukt voor pagina ${pieceId}:`, err);
    return NextResponse.json(
      { error: "Vrijgeven mislukt.", detail: describeError(err), problem: classifyError(err) },
      { status: 500 },
    );
  }
}
