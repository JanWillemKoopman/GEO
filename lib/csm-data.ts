import "server-only";

/**
 * De queries onder het CSM-paneel (fase 8, `docs/Nova.md` §3.8).
 *
 * De rekenkant staat in `lib/csm.ts`, zonder `server-only` (conventie 2). Hier
 * staat alleen het ophalen.
 *
 * ── WAAROM DIT ZES QUERY'S ZIJN EN GEEN ZES PER MERK ────────────────────────
 *
 * Dit scherm toont álle merken van álle klanten. Zou het per merk zijn tellers
 * ophalen, dan is dat bij twintig klanten met elk een paar merken al honderden
 * ronden naar Supabase op één pagina. Vandaar: zes brede query's en de
 * groepering hier in geheugen. Dat is dezelfde afweging als in
 * `enqueueMeasurement()`, waar 2×N sequentiële aanroepen de route omver duwden.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { overallProgress } from "@/lib/pipeline/brand-fields";
import { sortForCsm, type CsmBrand } from "@/lib/csm";
import type { AnalysisStatus, Profile } from "@/lib/types/database";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Vanaf welk percentage geldt een merkprofiel als nagekeken?
 *
 * Niet 100%. Van de 27 velden leidt Aura er 25 zelf af, en de laatste paar zijn
 * vaak dingen die alleen de klant weet (`docs/Nova.md` §13). Zou de drempel op
 * 100 staan, dan stond élk merk eeuwig in "wacht op jouw nakijkwerk" en werd het
 * segment betekenisloos. Tachtig procent is de grens waarboven het dossier
 * deelbaar is in een demogesprek.
 */
export const NAGEKEKEN_DREMPEL = 0.8;

/**
 * Alle merken met alles wat het CSM-paneel erover moet weten.
 *
 * Alleen voor beheerders; de aanroeper controleert dat (`isStaff`). Deze functie
 * kijkt bewust langs elke eigenaarscontrole heen: dat is het hele punt van het
 * scherm.
 */
export async function loadCsmBrands(admin: Admin): Promise<CsmBrand[]> {
  // Gearchiveerde merken horen hier niet: ze staan in geen enkele lijst
  // (migratie 0044) en een operationeel scherm dat werk toont voor een merk dat
  // niemand meer ziet, stuurt je achter spoken aan.
  const { data: profileRows } = await admin
    .from("profiles")
    .select("*")
    .is("archived_at", null)
    .order("created_at");

  const profiles = (profileRows ?? []) as Profile[];
  if (profiles.length === 0) return [];

  const profileIds = profiles.map((p) => p.id);
  const accountIds = [
    ...new Set(profiles.map((p) => p.account_id).filter((x): x is string => Boolean(x))),
  ];

  const vandaag = new Date();
  const eersteVanDeMaand = new Date(
    Date.UTC(vandaag.getUTCFullYear(), vandaag.getUTCMonth(), 1),
  )
    .toISOString()
    .slice(0, 10);
  const vandaagIso = vandaag.toISOString().slice(0, 10);

  const [
    { data: accountRows },
    { data: analysisRows },
    { data: planRows },
    { data: monthRows },
    { data: pageRows },
    { data: jobRows },
  ] = await Promise.all([
    accountIds.length > 0
      ? admin.from("accounts").select("id, name, package_pages_per_month").in("id", accountIds)
      : Promise.resolve({ data: [] }),
    admin
      .from("analyses")
      .select("id, profile_id, status")
      .in("profile_id", profileIds)
      .is("archived_at", null),
    admin
      .from("content_plans")
      .select("id, profile_id")
      .in("profile_id", profileIds)
      .neq("status", "gestopt"),
    admin.from("plan_months").select("plan_id, status"),
    admin
      .from("planned_pages")
      .select("profile_id, status, scheduled_for, posted_at, is_buffer")
      .in("profile_id", profileIds),
    // Definitief mislukte taken. `failed` is pas de eindstand na vier pogingen
    // (`MAX_ATTEMPTS`), dus dit is echt kapot en geen tegenslag onderweg.
    admin.from("jobs").select("profile_id, analysis_id").eq("status", "failed"),
  ]);

  const account = new Map(
    ((accountRows ?? []) as { id: string; name: string; package_pages_per_month: number | null }[])
      .map((a) => [a.id, a]),
  );

  const analyseVan = new Map<string, AnalysisStatus[]>();
  const analyseProfiel = new Map<string, string>();
  for (const a of (analysisRows ?? []) as {
    id: string;
    profile_id: string | null;
    status: AnalysisStatus;
  }[]) {
    if (!a.profile_id) continue;
    const lijst = analyseVan.get(a.profile_id) ?? [];
    lijst.push(a.status);
    analyseVan.set(a.profile_id, lijst);
    analyseProfiel.set(a.id, a.profile_id);
  }

  const planVan = new Map<string, string>();
  for (const p of (planRows ?? []) as { id: string; profile_id: string }[]) {
    planVan.set(p.profile_id, p.id);
  }
  const planProfiel = new Map([...planVan].map(([profileId, planId]) => [planId, profileId]));

  const maandenTerGoedkeuring = new Map<string, number>();
  for (const m of (monthRows ?? []) as { plan_id: string; status: string }[]) {
    if (m.status !== "ter_goedkeuring") continue;
    const profileId = planProfiel.get(m.plan_id);
    if (!profileId) continue;
    maandenTerGoedkeuring.set(profileId, (maandenTerGoedkeuring.get(profileId) ?? 0) + 1);
  }

  interface Tellers {
    terGoedkeuring: number;
    tePlaatsen: number;
    teLaat: number;
    dezeMaand: number;
    laatst: string | null;
  }
  const leeg = (): Tellers => ({
    terGoedkeuring: 0,
    tePlaatsen: 0,
    teLaat: 0,
    dezeMaand: 0,
    laatst: null,
  });
  const tellers = new Map<string, Tellers>();

  for (const p of (pageRows ?? []) as {
    profile_id: string;
    status: string;
    scheduled_for: string | null;
    posted_at: string | null;
    is_buffer: boolean;
  }[]) {
    if (p.is_buffer) continue; // een reserve is geen belofte
    const t = tellers.get(p.profile_id) ?? leeg();

    if (p.status === "ter_goedkeuring") t.terGoedkeuring++;
    if (p.status === "goedgekeurd") t.tePlaatsen++;
    // Te laat = de publicatiedatum is voorbij en er staat nog geen tekst.
    if (
      (p.status === "gepland" || p.status === "schrijven") &&
      p.scheduled_for &&
      p.scheduled_for < vandaagIso
    ) {
      t.teLaat++;
    }
    if (p.posted_at) {
      const dag = p.posted_at.slice(0, 10);
      if (dag >= eersteVanDeMaand) t.dezeMaand++;
      if (!t.laatst || dag > t.laatst) t.laatst = dag;
    }

    tellers.set(p.profile_id, t);
  }

  const fouten = new Map<string, number>();
  for (const j of (jobRows ?? []) as { profile_id: string | null; analysis_id: string | null }[]) {
    // Een taak hangt aan een merk of aan een analyse. Bij het tweede leidt de
    // analyse naar het merk; staat die er niet meer, dan telt hij nergens mee,
    // en dat klopt: er is geen merk om hem bij te tonen.
    const profileId =
      j.profile_id ?? (j.analysis_id ? analyseProfiel.get(j.analysis_id) ?? null : null);
    if (!profileId) continue;
    fouten.set(profileId, (fouten.get(profileId) ?? 0) + 1);
  }

  const brands: CsmBrand[] = profiles.map((p) => {
    const acc = p.account_id ? account.get(p.account_id) : undefined;
    const t = tellers.get(p.id) ?? leeg();
    const voortgang = overallProgress(p);

    return {
      profileId: p.id,
      name: p.brand_name ?? p.name,
      accountName: acc?.name ?? null,
      profileStatus: p.status,
      profielCompleet: voortgang.gevuld / voortgang.totaal >= NAGEKEKEN_DREMPEL,
      analyseStatussen: analyseVan.get(p.id) ?? [],
      quota: acc?.package_pages_per_month ?? null,
      heeftPlan: planVan.has(p.id),
      maandenTerGoedkeuring: maandenTerGoedkeuring.get(p.id) ?? 0,
      paginasTerGoedkeuring: t.terGoedkeuring,
      paginasTePlaatsen: t.tePlaatsen,
      paginasTeLaat: t.teLaat,
      geplaatstDezeMaand: t.dezeMaand,
      laatstGeplaatst: t.laatst,
      pijplijnfouten: fouten.get(p.id) ?? 0,
    };
  });

  return sortForCsm(brands);
}
