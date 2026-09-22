import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { activeOnly } from "@/lib/archive";
import { readRecommendations } from "@/lib/pipeline/recommendation";
import { teMelden, type ClusterStand } from "@/lib/cluster-melding";
import type { Analysis, VisibilityScore } from "@/lib/types/database";

/**
 * GET /api/profiles/[id]/clusters/melding, het oog dat de resultatenpagina was.
 *
 * ── WAAROM DIT ENDPUNT ER IS ────────────────────────────────────────────────
 *
 * De resultatenpagina van een cluster is op 22 september 2026 weggehaald
 * (`docs/tasks/clusterresultaat-zonder-eigen-scherm.md`). Zij was ook het
 * wachtscherm, en dus de enige plek die merkte dát een meting klaar was. Een
 * meting duurt minuten; de klant staat dan ergens anders of helemaal niet in de
 * app. Zonder dit endpunt gaat de uitslag ongemarkeerd voorbij.
 *
 * Per MERK en niet per cluster: er staat één melder in de app-schil, en die
 * moet met één aanroep weten of er iets te melden is voor het merk waar je in
 * werkt. Eén aanroep per cluster zou bij dertig clusters dertig aanroepen per
 * ronde betekenen.
 *
 * ── HET IS EEN GOEDKOPE QUERY, EN DAT MOET ZO BLIJVEN ───────────────────────
 *
 * Hij loopt elke paar seconden, bij iedereen die ingelogd is. Daarom eerst
 * alleen de vier kolommen die bepalen óf er iets te melden valt, en pas daarna
 * de cijfers, en alleen voor de clusters die het betreft. In het normale geval
 * (niets afgerond sinds de vorige keer) is dit één select op één tabel.
 *
 * `POST` zet weg wat gemeld is. Dat gaat via de service-role client met een
 * expliciete eigenaarscontrole, want schrijven loopt nooit rechtstreeks vanaf
 * de client (conventie 6).
 */
export const dynamic = "force-dynamic";

type Rij = Pick<Analysis, "id" | "name" | "status" | "resultaat_gezien_at">;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  // Gearchiveerde clusters doen niet mee: daarvoor wordt niet meer gemeten, dus
  // er valt ook niets te melden (migratie 0044).
  const { data: rijen } = await activeOnly(
    admin.from("analyses").select("id, name, status, resultaat_gezien_at").eq("profile_id", id),
  );

  const clusters = (rijen ?? []) as Rij[];
  // Alleen de afgeronde clusters die nog niet gemeld zijn hebben cijfers nodig.
  const kandidaten = clusters.filter(
    (c) => c.resultaat_gezien_at === null && (c.status === "gereed" || c.status === "mislukt"),
  );

  if (kandidaten.length === 0) {
    return NextResponse.json({ meldingen: [], gezien: [] });
  }

  const ids = kandidaten.map((c) => c.id);
  const [{ data: scoreRijen }, { data: rapportRijen }, { data: vraagRijen }] = await Promise.all([
    admin.from("visibility_scores").select("*").in("analysis_id", ids).order("week_no"),
    admin.from("reports").select("analysis_id, week_no, recommendations_json").in("analysis_id", ids),
    // De openstaande vragen ván dit cluster, dezelfde rijen die op
    // `/strategie/vragen` staan. ⚠️ Niet te verwarren met `openQuestions` uit
    // `lib/dashboard.ts`: dat getal telt vragen waarop het merk niet genoemd
    // wordt, en dat is iets heel anders dan een vraag aan de klant.
    admin.from("fact_requests").select("analysis_id").in("analysis_id", ids).eq("status", "open"),
  ]);

  const laatsteScore = new Map<string, VisibilityScore>();
  for (const s of (scoreRijen ?? []) as VisibilityScore[]) {
    const huidig = laatsteScore.get(s.analysis_id);
    if (!huidig || s.week_no > huidig.week_no) laatsteScore.set(s.analysis_id, s);
  }

  const laatsteRapport = new Map<string, { week_no: number; recommendations_json: unknown }>();
  for (const r of (rapportRijen ?? []) as {
    analysis_id: string;
    week_no: number;
    recommendations_json: unknown;
  }[]) {
    const huidig = laatsteRapport.get(r.analysis_id);
    if (!huidig || r.week_no > huidig.week_no) laatsteRapport.set(r.analysis_id, r);
  }

  const vragenPerCluster = new Map<string, number>();
  for (const v of (vraagRijen ?? []) as { analysis_id: string | null }[]) {
    if (!v.analysis_id) continue;
    vragenPerCluster.set(v.analysis_id, (vragenPerCluster.get(v.analysis_id) ?? 0) + 1);
  }

  const standen: ClusterStand[] = kandidaten.map((c) => {
    const score = laatsteScore.get(c.id) ?? null;
    const rapport = laatsteRapport.get(c.id) ?? null;
    return {
      id: c.id,
      naam: c.name,
      status: c.status,
      resultaatGezienAt: c.resultaat_gezien_at,
      // `null` blijft `null`: een cluster zonder score heeft geen score, geen 0
      // (conventie 3).
      zichtbaarheid: score ? (score.weighted_score ?? score.score) : null,
      openVragen: vragenPerCluster.get(c.id) ?? 0,
      voorgesteld: rapport ? readRecommendations(rapport.recommendations_json).length : 0,
    };
  });

  return NextResponse.json(teMelden(standen));
}

/** Wegzetten wat gemeld is, zodat dezelfde uitslag niet twee keer verschijnt. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let body: { ids?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string") : [];
  if (ids.length === 0) return NextResponse.json({ ok: true, gezien: 0 });

  // ⚠️ `eq("profile_id", id)` is geen dubbelop: zonder die regel kan iemand met
  // toegang tot merk A de melding van een cluster van merk B wegzetten door het
  // id te raden.
  const { error } = await admin
    .from("analyses")
    .update({ resultaat_gezien_at: new Date().toISOString() })
    .in("id", ids)
    .eq("profile_id", id);

  if (error) {
    return NextResponse.json({ error: "Wegzetten is niet gelukt." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, gezien: ids.length });
}
