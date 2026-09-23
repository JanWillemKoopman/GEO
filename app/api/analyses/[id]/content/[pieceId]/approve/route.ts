import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { EINDPOORT_STATUS } from "@/lib/content-final-gate";
import { keurTekstGoed } from "@/lib/content-approve";

/**
 * POST /api/analyses/[id]/content/[pieceId]/approve, de klant geeft een pagina
 * vrij (implementatieplan.md S6).
 *
 * ── WAAROM DEZE ROUTE BESTAAT ───────────────────────────────────────────────
 *
 * `status: 'ready'` betekende "de pijplijn is klaar met deze pagina", en de
 * bibliotheek toonde dat als "klaar om te publiceren". Dat is niet hetzelfde.
 * Uit de contentronde van 31 juli: alle tien de pagina's kwamen op `ready`, en
 * één daarvan had vijf concrete verbeterpunten van de eigen redactie in
 * `review_notes` staan, inclusief "het directe antwoord op de hoofdvraag is
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
 * Uitsluitend `needs_review`, `reviewed_at` en `reviewed_by`. Nooit de tekst,
 * nooit de status, nooit `review_notes`. Die blijven staan, want vrijgeven is
 * niet hetzelfde als "er was niets aan de hand". Zelfde patroon als de
 * briefingroute: service role plus een expliciete eigenaarschapscontrole
 * (abcplan.md §5).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; pieceId: string }> },
) {
  const { id, pieceId } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  // ── De eindpoort (28 augustus 2026) ──────────────────────────────────────
  //
  // Vrijgeven is de handeling die zegt: deze tekst is af. Dat kan niet terwijl
  // ORBIT ENGINE nog wacht op de feiten waar de tekst om vroeg. De uitweg is één
  // klik: overslaan telt als antwoord (`lib/content-final-gate.ts`).
  //
  // ⚠️ Dit nuanceert het besluit "geen muur" uit `release-panel.tsx`. Wat er van
  // dat besluit staan blijft: de tekst blijft leesbaar, kopieerbaar en
  // bewerkbaar, en de klant kan zelf publiceren wat hij wil. Wat op slot gaat is
  // dat ORBIT ENGINE hem als afgerond registreert.
  // De eindpoort en het bijwerken van het contentplan staan sinds 23 september
  // 2026 in `keurTekstGoed()`, zodat goedkeuren in het plan precies hetzelfde doet.
  const uitkomst = await keurTekstGoed(admin, { pieceId, analysisId: id, userId: user.id });
  if (!uitkomst.ok) {
    return NextResponse.json(
      { error: uitkomst.error, ...(uitkomst.openVragen !== undefined ? { openVragen: uitkomst.openVragen } : {}) },
      { status: uitkomst.status === 409 ? EINDPOORT_STATUS : uitkomst.status },
    );
  }
  return NextResponse.json({ approved: true, reviewedAt: uitkomst.reviewedAt });
}
