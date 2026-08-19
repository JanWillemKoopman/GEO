import "server-only";

/**
 * De queries onder het CSM-paneel (fase 8, zie `docs/logbook.md`).
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
import { profileStage } from "@/lib/profile-stage";
import { sortForCsm, unresolvedFailures, type CsmBrand, type JobOutcome } from "@/lib/csm";
import type { AnalysisStatus, Profile } from "@/lib/types/database";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Vanaf welk percentage geldt een merkprofiel als nagekeken?
 *
 * Niet 100%. Van de 27 velden leidt ORBIT ENGINE er 25 zelf af, en de laatste paar zijn
 * vaak dingen die alleen de klant weet. Zou de drempel op
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
    { data: strategieRows },
    { data: openJobRows },
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
    // ⚠️ Ook de GESLAAGDE taken, niet alleen de mislukte.
    //
    // `failed` is pas de eindstand na vier pogingen (`MAX_ATTEMPTS`), dus zo'n
    // rij is echt kapot geweest. Maar hij blijft voor altijd staan (conventie 8),
    // en werk dat later alsnog lukte is geen probleem meer. Zonder de geslaagde
    // taken erbij stond Van den Udenhout eeuwig onder "Vastgelopen" om drie
    // onderzoekstaken van 5 augustus die op 9 augustus gewoon doorliepen.
    // `unresolvedFailures()` legt die twee naast elkaar.
    admin
      .from("jobs")
      .select("type, status, profile_id, analysis_id, finished_at, created_at")
      .in("status", ["failed", "done"]),
    // Voor de fase (deel B4): is het gesprek vastgelegd, en staat er nog
    // onderzoek open? Twee kleine queries, geen AI, geen extra tabel.
    admin.from("profile_strategy").select("profile_id, recorded_at").in("profile_id", profileIds),
    admin
      .from("jobs")
      .select("profile_id")
      .in("profile_id", profileIds)
      .in("status", ["queued", "running"]),
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

  // De eigenaar van een taak is een merk óf een analyse, en die twee mogen niet
  // op één hoop: een mislukte meting van analyse A zegt niets over analyse B van
  // hetzelfde merk. Vandaar een sleutel per eigenaar, en pas daarna optellen
  // naar het merk.
  const uitkomsten: (JobOutcome & { profileId: string | null })[] = (
    (jobRows ?? []) as {
      type: string;
      status: string;
      profile_id: string | null;
      analysis_id: string | null;
      finished_at: string | null;
      created_at: string;
    }[]
  ).map((j) => ({
    type: j.type,
    ownerKey: j.analysis_id ? `analysis:${j.analysis_id}` : `profile:${j.profile_id ?? "?"}`,
    status: j.status === "failed" ? "failed" : "done",
    at: j.finished_at ?? j.created_at,
    // Een taak aan een analyse leidt via de analyse naar het merk; staat die er
    // niet meer, dan telt hij nergens mee, en dat klopt: er is geen merk om hem
    // bij te tonen.
    profileId: j.profile_id ?? (j.analysis_id ? analyseProfiel.get(j.analysis_id) ?? null : null),
  }));

  const fouten = new Map<string, number>();
  for (const j of unresolvedFailures(uitkomsten)) {
    const profileId = (j as JobOutcome & { profileId: string | null }).profileId;
    if (!profileId) continue;
    fouten.set(profileId, (fouten.get(profileId) ?? 0) + 1);
  }

  // Per merk: wanneer het gesprek is vastgelegd, en hoeveel werk er openstaat.
  const gesprekVan = new Map(
    ((strategieRows ?? []) as { profile_id: string; recorded_at: string | null }[]).map((r) => [
      r.profile_id,
      r.recorded_at,
    ]),
  );
  const openWerk = new Map<string, number>();
  for (const rij of (openJobRows ?? []) as { profile_id: string | null }[]) {
    if (!rij.profile_id) continue;
    openWerk.set(rij.profile_id, (openWerk.get(rij.profile_id) ?? 0) + 1);
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
      fase: profileStage({
        openResearchJobs: openWerk.get(p.id) ?? 0,
        researchDone: p.status === "klaar",
        recordedAt: gesprekVan.get(p.id) ?? null,
        assignedAt: p.assigned_at,
      }),
    };
  });

  return sortForCsm(brands);
}
