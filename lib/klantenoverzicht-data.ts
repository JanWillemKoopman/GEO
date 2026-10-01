import "server-only";

/**
 * De queries onder het klantenoverzicht (`app/(app)/beheer/klanten`).
 *
 * De rekenkant staat in `lib/klantenoverzicht.ts` (conventie 2); hier staat
 * alleen het ophalen. Alle klanten in één keer, net als `lib/csm-data.ts`: brede
 * query's en de groepering in geheugen, nooit een ronde per klant.
 *
 * Alleen voor beheerders; de aanroeper controleert dat (`isStaff`). Deze
 * functie kijkt bewust langs elke eigenaarscontrole heen.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { loadCsmBrands } from "@/lib/csm-data";
import { segmentOf } from "@/lib/csm";
import { overallProgress } from "@/lib/pipeline/brand-fields";
import { countOpenQuestionsForBrand } from "@/lib/open-questions";
import { serviceAccountEmail } from "@/lib/search-console/auth";
import type { BrandScoreRow } from "@/lib/brand-score";
import type { Profile } from "@/lib/types/database";
import {
  bouwKlantRij,
  klantcijferVensters,
  type KlantCijfers,
  type KlantRij,
  type MerkInvoer,
} from "@/lib/klantenoverzicht";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Hoeveel gebruikers er per pagina uit Supabase Auth komen. De grens van de
 * API is 1000; we bladeren door tot een pagina niet meer vol is.
 */
const GEBRUIKERS_PER_PAGINA = 1000;

async function alleGebruikers(
  admin: Admin,
): Promise<Map<string, { email: string | null; laatsteInlog: string | null }>> {
  const uit = new Map<string, { email: string | null; laatsteInlog: string | null }>();
  for (let pagina = 1; pagina <= 20; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: GEBRUIKERS_PER_PAGINA });
    if (error || !data) break;
    for (const u of data.users) {
      uit.set(u.id, { email: u.email ?? null, laatsteInlog: u.last_sign_in_at ?? null });
    }
    if (data.users.length < GEBRUIKERS_PER_PAGINA) break;
  }
  return uit;
}

export async function loadKlantenoverzicht(nu: Date = new Date()): Promise<KlantRij[]> {
  const admin = createAdminClient();
  const v = klantcijferVensters(nu);

  const [
    { data: accountRows },
    { data: profileRows },
    { data: ledenRows },
    { data: uitnodigingRows },
    { data: cijferRows, error: cijferFout },
    csmBrands,
    gebruikers,
  ] = await Promise.all([
    admin
      .from("accounts")
      .select("id, name, created_at, started_at, cancelled_at, package_pages_per_month")
      .order("name"),
    admin.from("profiles").select("*").not("account_id", "is", null).is("archived_at", null),
    admin.from("account_users").select("account_id, user_id"),
    admin
      .from("account_invites")
      .select("account_id")
      .is("accepted_at", null)
      .is("revoked_at", null)
      .gt("expires_at", nu.toISOString()),
    admin.rpc("beheer_klantcijfers", {
      p_maand_start: v.maandStart,
      p_fouten_sinds: v.foutenSinds,
      p_gsc_van: v.gscVan,
      p_gsc_tot: v.gscTot,
      p_gsc_vorige_van: v.gscVorigeVan,
      p_gsc_vorige_tot: v.gscVorigeTot,
    }),
    loadCsmBrands(admin),
    alleGebruikers(admin),
  ]);

  // Lukt de telling niet, dan staan de tellers op onbekend en niet op nul
  // (conventie 3). De rest van de tabel blijft bruikbaar.
  if (cijferFout) console.error("beheer_klantcijfers mislukt:", cijferFout.message);

  const profiles = (profileRows ?? []) as Profile[];
  const profileIds = profiles.map((p) => p.id);

  // De zichtbaarheid hangt aan de analyses, en die zijn pas na de merken bekend.
  const { data: analyseRows } = profileIds.length
    ? await admin.from("analyses").select("id, profile_id").in("profile_id", profileIds).is("archived_at", null)
    : { data: [] };
  const analyseMerk = new Map(
    ((analyseRows ?? []) as { id: string; profile_id: string }[]).map((a) => [a.id, a.profile_id]),
  );

  const [{ data: scoreRows }, openVragen] = await Promise.all([
    analyseMerk.size
      ? admin
          .from("visibility_scores")
          .select("analysis_id, week_no, score, weighted_score, score_stderr, weighted_stderr, winnable_runs, judged_runs, computed_at")
          .in("analysis_id", [...analyseMerk.keys()])
      : Promise.resolve({ data: [] }),
    Promise.all(profiles.map((p) => countOpenQuestionsForBrand(admin, p.id).catch(() => 0))),
  ]);

  const scoresPerMerk = new Map<string, BrandScoreRow[]>();
  for (const r of (scoreRows ?? []) as BrandScoreRow[]) {
    const merk = analyseMerk.get(r.analysis_id);
    if (!merk) continue;
    const lijst = scoresPerMerk.get(merk) ?? [];
    lijst.push(r);
    scoresPerMerk.set(merk, lijst);
  }

  const csm = new Map(csmBrands.map((b) => [b.profileId, b]));
  const vragenPerMerk = new Map(profiles.map((p, i) => [p.id, openVragen[i] ?? 0]));

  const merkenPerKlant = new Map<string, MerkInvoer[]>();
  for (const p of profiles) {
    if (!p.account_id) continue;
    const b = csm.get(p.id);
    const voortgang = overallProgress(p);
    const merk: MerkInvoer = {
      id: p.id,
      naam: p.brand_name ?? p.name,
      url: p.url ?? null,
      isDemo: p.is_demo === true,
      dossierVoortgang: voortgang.totaal > 0 ? voortgang.gevuld / voortgang.totaal : 0,
      openVragen: vragenPerMerk.get(p.id) ?? 0,
      segment: b ? segmentOf(b) : null,
      onderzoekLoopt: p.status !== "klaar" && p.status !== "mislukt",
      onderzoekVastgelopen: p.status === "mislukt",
      paginasTerGoedkeuring: b?.paginasTerGoedkeuring ?? 0,
      maandenTerGoedkeuring: b?.maandenTerGoedkeuring ?? 0,
      gsc: {
        property: p.gsc_property ?? null,
        verifiedAt: p.gsc_verified_at ?? null,
        lastError: p.gsc_last_error ?? null,
        lastSyncAt: p.gsc_last_sync_at ?? null,
        firstDay: p.gsc_first_day ?? null,
      },
      zichtbaarheid: scoresPerMerk.get(p.id) ?? [],
    };
    const lijst = merkenPerKlant.get(p.account_id) ?? [];
    lijst.push(merk);
    merkenPerKlant.set(p.account_id, lijst);
  }

  const ledenPerKlant = new Map<string, { email: string | null; laatsteInlog: string | null }[]>();
  for (const l of (ledenRows ?? []) as { account_id: string; user_id: string }[]) {
    const lijst = ledenPerKlant.get(l.account_id) ?? [];
    lijst.push(gebruikers.get(l.user_id) ?? { email: null, laatsteInlog: null });
    ledenPerKlant.set(l.account_id, lijst);
  }

  const uitnodigingen = new Map<string, number>();
  for (const u of (uitnodigingRows ?? []) as { account_id: string }[]) {
    uitnodigingen.set(u.account_id, (uitnodigingen.get(u.account_id) ?? 0) + 1);
  }

  const cijfers = new Map(((cijferRows ?? []) as KlantCijfers[]).map((c) => [c.account_id, c]));
  const sleutel = Boolean(serviceAccountEmail());

  return (
    (accountRows ?? []) as {
      id: string;
      name: string | null;
      created_at: string;
      started_at: string | null;
      cancelled_at: string | null;
      package_pages_per_month: number | null;
    }[]
  ).map((account) =>
    bouwKlantRij(
      {
        account,
        leden: ledenPerKlant.get(account.id) ?? [],
        openUitnodigingen: uitnodigingen.get(account.id) ?? 0,
        merken: (merkenPerKlant.get(account.id) ?? []).sort((a, b) => a.naam.localeCompare(b.naam, "nl")),
        cijfers: cijfers.get(account.id) ?? null,
      },
      nu,
      sleutel,
    ),
  );
}
