import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedAnalysis } from "@/lib/analyses";
import { loadAnswers } from "@/lib/pipeline/answers";

/**
 * GET /api/analyses/[id]/answers, de letterlijke antwoorden van de laatste
 * meting van dit cluster.
 *
 * ── WAAROM DIT EEN LOSSE AANVRAAG IS EN GEEN PROP ────────────────────────────
 *
 * Dit voedt het detailpaneel op Analytics → Zichtbaarheid (`Z8`,
 * `analytics-cluster-table.tsx`), een client component die per cluster in de
 * tabel opent. `raw_response` is het volledige antwoord van een AI-model, tot
 * enkele duizenden tekens per vraag; dat voor alle clusters tegelijk meesturen
 * met de tabel zou een pagina met tien clusters een pagina met driehonderd
 * antwoorden maken die niemand opent. Nu haalt de klant ze pas op zodra hij
 * echt op een cluster klikt.
 *
 * Geen staff-only slot: dit is precies de content die vroeger rechtstreeks op
 * het cluster stond (`docs/logbook.md`, 16 september 2026), en die was voor de
 * klant zelf zichtbaar.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const analysis = await getOwnedAnalysis(admin, id, user.id);
  if (!analysis) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  const answers = await loadAnswers(admin, analysis.id, analysis.profile_id);
  if (!answers) {
    return NextResponse.json({ weekNo: null, rows: [], ownLabel: "Jouw merk", ownTerms: [] });
  }

  return NextResponse.json(answers);
}
