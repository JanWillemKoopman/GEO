import "server-only";

/**
 * De gegevens onder het opbrengstblok (fase 5, `docs/Nova.md` §5).
 *
 * De rekenkant staat in `lib/milestones.ts`, zonder `server-only` (conventie 2).
 *
 * ── WAAROM DE SCORE OVER ALLE ANALYSES VAN HET MERK GAAT ────────────────────
 *
 * Een merk heeft één analyse per onderwerp, en de klant heeft er geen boodschap
 * aan welk ván zijn onderwerpen groeide. De vraag die dit blok beantwoordt is
 * "levert dit abonnement iets op", en dat is een merkvraag. Vandaar het
 * gemiddelde over de analyses per periode, en niet de beste of de laatste: één
 * uitschieter zou anders het hele verhaal dragen.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { milestones, type Milestone } from "@/lib/milestones";

type Admin = ReturnType<typeof createAdminClient>;

export async function loadMilestones(
  admin: Admin,
  profileId: string,
  accountId: string | null,
): Promise<Milestone[]> {
  const [{ data: accountRow }, { data: analysisRows }] = await Promise.all([
    accountId
      ? admin
          .from("accounts")
          .select("started_at, value_per_mention_eur")
          .eq("id", accountId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from("analyses").select("id").eq("profile_id", profileId).is("archived_at", null),
  ]);

  const analysisIds = ((analysisRows ?? []) as { id: string }[]).map((a) => a.id);

  const [{ data: scoreRows }, { count: gepubliceerd }] = await Promise.all([
    analysisIds.length > 0
      ? admin
          .from("visibility_scores")
          .select("analysis_id, week_no, score")
          .in("analysis_id", analysisIds)
          .order("week_no")
      : Promise.resolve({ data: [] }),
    // Twee bronnen voor "gepubliceerd", en dit is de oudste: een contentpagina
    // met een publicatiedatum. De plan-pagina's van fase 4 wijzen naar dezelfde
    // contentpagina's, dus hier tellen levert geen dubbeltelling op.
    analysisIds.length > 0
      ? admin
          .from("content_pieces")
          .select("id", { count: "exact", head: true })
          .in("analysis_id", analysisIds)
          .not("published_at", "is", null)
      : Promise.resolve({ count: 0 }),
  ]);

  // Gemiddelde per periode over alle analyses van het merk.
  const perPeriode = new Map<number, number[]>();
  for (const r of (scoreRows ?? []) as { week_no: number; score: number | string }[]) {
    const lijst = perPeriode.get(r.week_no) ?? [];
    lijst.push(Number(r.score));
    perPeriode.set(r.week_no, lijst);
  }
  const periodes = [...perPeriode.keys()].sort((a, b) => a - b);
  const gemiddelde = (n: number) => {
    const lijst = perPeriode.get(n) ?? [];
    return lijst.length === 0 ? null : lijst.reduce((a, b) => a + b, 0) / lijst.length;
  };

  return milestones({
    startedAt: (accountRow?.started_at as string | null) ?? null,
    eersteScore: periodes.length > 0 ? gemiddelde(periodes[0]) : null,
    laatsteScore: periodes.length > 0 ? gemiddelde(periodes[periodes.length - 1]) : null,
    metingen: periodes.length,
    gepubliceerd: gepubliceerd ?? 0,
    // Besluit 16: optioneel. Staat er geen bedrag, dan toont het blok aantallen.
    waardePerVermelding: (accountRow?.value_per_mention_eur as number | null) ?? null,
  });
}
