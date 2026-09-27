import "server-only";

/**
 * HET RAPPORT MAAKT KANSEN (N2 van `docs/tasks/van-pijplijn-naar-kennissysteem.md`).
 *
 * Per aanbeveling in `reports.recommendations_json` één rij in `kansen`, met het
 * bewijs van de meting per bron in `kans_bewijs` en de kennisitems voor dienst en
 * regio in `geldt_voor`. De omzetting staat in `rapport.ts` (puur), de volgorde
 * en de uitleg in `prioriteit.ts`. Dit is de enige plek die in `kansen` en
 * `kans_bewijs` schrijft; een test in `scripts/test-unit.ts` bewaakt dat.
 *
 * ── TWEE AANROEPERS, ÉÉN FUNCTIE ────────────────────────────────────────────
 *
 * `generateReport()` roept hem aan zodra het rapport is opgeslagen. De voorraad
 * (`syncBacklog()`) roept hem ook aan, voor het laatste rapport van elk cluster:
 * dat vult de kansen voor rapporten van vóór N2 (drie op productie op 26
 * september 2026), en vangt een rapport op waarvan het wegschrijven mislukte.
 * Idempotent op de sleutel (conventie 9): staan alle kansen van een rapport er
 * al, dan kost een aanroep één leesquery.
 *
 * ── WAAROM DIT NOOIT EEN FOUT GOOIT ─────────────────────────────────────────
 *
 * Het rapport is de dure stap (het denkwerk van het model); een mislukte kans
 * mag die niet opnieuw laten betalen. Tellen, loggen, doorgaan, zoals
 * `lib/kennis/uit-onderzoek.ts`. De voorraad probeert het bij de volgende
 * schermopening opnieuw.
 */
import { naarActueleVersies } from "@/lib/kennis/versies";
import type { SupabaseClient } from "@supabase/supabase-js";
import { alleRijen } from "@/lib/supabase/pagineer";
import { uitlegVan } from "@/lib/kansen/prioriteit";
import { kennisgatVan, type KennisVoorGat } from "@/lib/kansen/kennisgat";
import {
  BEWIJS_REGEL,
  bewijsUitMetingen,
  commercieleWaardeVan,
  isConcurrent,
  geldtVoorVan,
  kansUitAanbeveling,
  type KennisVoorKans,
  type MetingVoorBewijs,
  type RuweAanbeveling,
} from "@/lib/kansen/rapport";
import { legAfhankelijkhedenVast } from "@/lib/afhankelijkheden/vastleggen";

export interface KansenTelling {
  aangemaakt: number;
  bestond: number;
  /** Bestaande kansen waarvan het bewijs met een oudere regel was geteld, nu opnieuw. */
  ververst: number;
  mislukt: number;
}

const TAAK = "generate_report";

/** Hooguit zoveel ids per `in()`-filter, zodat de adresregel van PostgREST niet te lang wordt. */
const IN_GROOTTE = 100;

function inStukken<T>(lijst: readonly T[]): T[][] {
  const uit: T[][] = [];
  for (let i = 0; i < lijst.length; i += IN_GROOTTE) uit.push(lijst.slice(i, i + IN_GROOTTE));
  return uit;
}

/** De beoordeelde metingen van deze doelvragen, in de periode van het rapport. */
async function metingenVoor(
  admin: SupabaseClient,
  analysisId: string,
  weekNo: number | null,
  promptIds: readonly string[],
): Promise<MetingVoorBewijs[]> {
  if (promptIds.length === 0) return [];

  // Zonder periode op het rapport: de laatste gewone meting van het cluster.
  let week = weekNo;
  if (week === null) {
    const { data } = await admin
      .from("tracking_runs")
      .select("week_no")
      .eq("analysis_id", analysisId)
      .eq("purpose", "periodic")
      .order("week_no", { ascending: false })
      .limit(1);
    week = ((data ?? [])[0] as { week_no: number } | undefined)?.week_no ?? null;
    if (week === null) return [];
  }

  const runs: { id: string; prompt_id: string; engine: string | null; brands_in_answer: number | null }[] = [];
  for (const stuk of inStukken(promptIds)) {
    const { data, error } = await admin
      .from("tracking_runs")
      .select("id, prompt_id, engine, brands_in_answer")
      .eq("analysis_id", analysisId)
      .eq("week_no", week)
      .eq("purpose", "periodic")
      .in("prompt_id", stuk);
    if (error) throw new Error(error.message);
    runs.push(...((data ?? []) as typeof runs));
  }
  // Zelfde uitsluiting als het rapport (`computeMissedPrompts()`): waar de AI geen
  // enkele aanbieder noemt, valt er niets te winnen en telt de meting niet.
  const tellend = runs.filter((r) => r.brands_in_answer !== 0);
  if (tellend.length === 0) return [];

  const vermeldingen: {
    tracking_run_id: string;
    entity_name: string;
    is_own_brand: boolean;
    mentioned: boolean;
    mention_role: string | null;
    cited_sources: string[] | null;
  }[] = [];
  for (const stuk of inStukken(tellend.map((r) => r.id))) {
    const rijen = await alleRijen<(typeof vermeldingen)[number]>((van, tot) =>
      admin
        .from("tracking_run_mentions")
        .select("tracking_run_id, entity_name, is_own_brand, mentioned, mention_role, cited_sources")
        .in("tracking_run_id", stuk)
        .order("id")
        .range(van, tot),
    );
    vermeldingen.push(...rijen);
  }

  const eigen = new Map<string, boolean>();
  const eigenCitaten = new Map<string, string[]>();
  const anderen = new Map<string, string[]>();
  for (const v of vermeldingen) {
    if (v.is_own_brand) {
      eigen.set(v.tracking_run_id, v.mentioned);
      eigenCitaten.set(v.tracking_run_id, v.cited_sources ?? []);
    } else if (isConcurrent(v)) anderen.set(v.tracking_run_id, [...(anderen.get(v.tracking_run_id) ?? []), v.entity_name]);
  }

  // Alleen wat beoordeeld is: een meting zonder oordeel over het eigen merk is
  // een dataprobleem, geen gemis (zelfde regel als het rapport).
  return tellend
    .filter((r) => eigen.has(r.id))
    .map((r) => ({
      runId: r.id,
      promptId: r.prompt_id,
      engine: r.engine,
      genoemd: eigen.get(r.id) === true,
      concurrenten: anderen.get(r.id) ?? [],
      citedSources: eigenCitaten.get(r.id) ?? [],
    }));
}

/**
 * Zet de aanbevelingen van één rapport om in kansen. Gooit nooit; geeft een
 * telling terug.
 */
export async function legKansenVast(admin: SupabaseClient, rapportId: string): Promise<KansenTelling> {
  const telling: KansenTelling = { aangemaakt: 0, bestond: 0, ververst: 0, mislukt: 0 };
  try {
    const { data: rapport } = await admin
      .from("reports")
      .select("id, analysis_id, week_no, recommendations_json")
      .eq("id", rapportId)
      .maybeSingle();
    const r = rapport as { id: string; analysis_id: string; week_no: number | null; recommendations_json: unknown } | null;
    if (!r) return telling;

    const lijst = (Array.isArray(r.recommendations_json) ? r.recommendations_json : []) as RuweAanbeveling[];
    const kansen = lijst
      .map((ruw, i) => kansUitAanbeveling(r.id, i, ruw))
      .filter((k): k is NonNullable<typeof k> => k !== null);
    if (kansen.length === 0) return telling;

    const { data: analyse } = await admin.from("analyses").select("profile_id").eq("id", r.analysis_id).maybeSingle();
    const profileId = (analyse as { profile_id: string | null } | null)?.profile_id ?? null;
    if (!profileId) return telling;

    // Conventie 9: eerst kijken wat er al staat.
    const { data: bestaandRows } = await admin
      .from("kansen")
      .select("id, sleutel, status, vastgelegd_door_taak")
      .eq("profile_id", profileId)
      .in("sleutel", kansen.map((k) => k.sleutel));
    const bestaandeRijen = (bestaandRows ?? []) as { id: string; sleutel: string; status: string; vastgelegd_door_taak: string | null }[];
    const bestaand = new Map(bestaandeRijen.map((b) => [b.sleutel, b]));
    const nieuw = kansen.filter((k) => !bestaand.has(k.sleutel));
    telling.bestond = kansen.length - nieuw.length;

    // Bewijs dat met een oudere regel geteld is (`BEWIJS_REGEL`), opnieuw tellen.
    // Alleen bij open kansen die de code zelf maakte: een kans waar al werk aan
    // hangt, of die een mens aanmaakte, houdt het bewijs waarop hij gekozen werd.
    const teVerversen: { id: string; kans: (typeof kansen)[number] }[] = [];
    const kandidaatIds = bestaandeRijen.filter((b) => b.status === "open" && b.vastgelegd_door_taak === TAAK).map((b) => b.id);
    if (kandidaatIds.length > 0) {
      const { data: bewijsRows } = await admin.from("kans_bewijs").select("kans_id, ruw").in("kans_id", kandidaatIds);
      const verouderd = new Set(
        ((bewijsRows ?? []) as { kans_id: string; ruw: { regel?: number } | null }[])
          .filter((b) => (b.ruw?.regel ?? 1) < BEWIJS_REGEL)
          .map((b) => b.kans_id),
      );
      for (const k of kansen) {
        const rij = bestaand.get(k.sleutel);
        if (rij && verouderd.has(rij.id)) teVerversen.push({ id: rij.id, kans: k });
      }
    }
    if (nieuw.length === 0 && teVerversen.length === 0) return telling;

    const [{ data: topicRows }, { data: profiel }, { data: kennisRows }] = await Promise.all([
      admin.from("profile_topics").select("offering_ids, offering_names").eq("analysis_id", r.analysis_id),
      admin.from("profiles").select("priority_offerings, deprioritised_offerings, url").eq("id", profileId).maybeSingle(),
      // Alleen actuele, niet afgewezen kennis: een kans hangt niet aan iets wat
      // een mens heeft weggehaald.
      admin
        .from("klantkennis")
        .select("id, soort, bewering, herkomst_tabel, herkomst_id")
        .eq("profile_id", profileId)
        .is("vervangen_door", null)
        .is("afgewezen_op", null)
        .in("soort", ["dienst", "categorie", "werkgebied"]),
    ]);
    const topics = (topicRows ?? []) as { offering_ids: string[] | null; offering_names: string[] | null }[];
    const dienstIds = topics.flatMap((t) => t.offering_ids ?? []);
    const dienstNamen = topics.flatMap((t) => t.offering_names ?? []);
    const p = profiel as { priority_offerings: string[] | null; deprioritised_offerings: string[] | null; url: string | null } | null;
    const profileUrl = p?.url ?? null;
    const commercieel = commercieleWaardeVan({
      diensten: dienstNamen,
      voorrang: p?.priority_offerings ?? [],
      minder: p?.deprioritised_offerings ?? [],
    });
    const kennis: KennisVoorKans[] = (
      (kennisRows ?? []) as { id: string; soort: string | null; bewering: string; herkomst_tabel: string | null; herkomst_id: string | null }[]
    ).map((k) => ({ id: k.id, soort: k.soort, bewering: k.bewering, herkomstTabel: k.herkomst_tabel, herkomstId: k.herkomst_id }));

    const promptIds = [
      ...new Set(
        [...nieuw, ...teVerversen.map((t) => t.kans)].flatMap((k) => k.doelvragen.map((d) => d.promptId)).filter((id): id is string => !!id),
      ),
    ];
    const metingen = await metingenVoor(admin, r.analysis_id, r.week_no, promptIds);
    const bewijsRijen = (kansId: string, k: (typeof kansen)[number], bewijs: ReturnType<typeof bewijsUitMetingen>) =>
      bewijs.map((b) => ({
        kans_id: kansId,
        profile_id: profileId,
        bron: b.bron,
        vragen_gemeten: b.vragenGemeten,
        vragen_genoemd: b.vragenGenoemd,
        concurrenten: b.concurrenten,
        eigen_site_geciteerd: b.eigenSiteGeciteerd,
        run_ids: b.runIds,
        rapport_id: r.id,
        ruw: { regel: BEWIJS_REGEL, doelvragen: k.doelvragen } as never,
        updated_at: new Date().toISOString(),
      }));

    for (const t of teVerversen) {
      const bewijs = bewijsUitMetingen(t.kans.doelvragen, metingen, profileUrl);
      if (bewijs.length > 0) {
        const { error: fout } = await admin.from("kans_bewijs").upsert(bewijsRijen(t.id, t.kans, bewijs), { onConflict: "kans_id,bron" });
        if (fout) {
          telling.mislukt++;
          console.error(`Bewijs van kans ${t.id} opnieuw tellen mislukt: ${fout.message}`);
          continue;
        }
      }
      await admin
        .from("kansen")
        .update({ uitleg: uitlegVan({ handeling: t.kans.handeling, bewijs }), updated_at: new Date().toISOString() })
        .eq("id", t.id);
      telling.ververst++;
    }

    for (const k of nieuw) {
      const bewijs = bewijsUitMetingen(k.doelvragen, metingen, profileUrl);
      const geldtVoor = geldtVoorVan({ kans: k, dienstIds, kennis });
      const { data: rij, error } = await admin
        .from("kansen")
        .insert({
          profile_id: profileId,
          analysis_id: r.analysis_id,
          titel: k.titel,
          lezer: k.lezer,
          handeling: k.handeling,
          bestaande_url: k.bestaandeUrl,
          geldt_voor: geldtVoor,
          commerciele_waarde: commercieel,
          status: "open",
          uitleg: uitlegVan({ handeling: k.handeling, bewijs }),
          rapport_id: r.id,
          vastgelegd_door_taak: TAAK,
          sleutel: k.sleutel,
          ruw: k.ruw as never,
        })
        .select("id")
        .single();
      if (error || !rij) {
        // 23505: een tweede aanroep was ons net voor. Dan bestaat hij, en is dat goed.
        if ((error as { code?: string } | null)?.code === "23505") telling.bestond++;
        else {
          telling.mislukt++;
          console.error(`Kans "${k.titel}" (rapport ${r.id}) vastleggen mislukt: ${error?.message ?? "geen rij"}`);
        }
        continue;
      }
      telling.aangemaakt++;
      const kansId = (rij as { id: string }).id;
      // G2: waar deze kans op leunt, voor "wat hangt er aan deze dienst".
      await legAfhankelijkhedenVast(admin, { profileId, vanTabel: "kansen", vanId: kansId, kennisIds: geldtVoor });
      if (bewijs.length === 0) continue;
      const { error: bewijsFout } = await admin.from("kans_bewijs").insert(bewijsRijen(kansId, k, bewijs));
      if (bewijsFout) console.error(`Bewijs bij kans "${k.titel}" vastleggen mislukt: ${bewijsFout.message}`);
    }
    if (telling.aangemaakt > 0 || telling.ververst > 0 || telling.mislukt > 0) {
      console.log(
        `Kansen uit rapport ${r.id}: ${telling.aangemaakt} nieuw, ${telling.bestond} bestonden, ` +
          `${telling.ververst} met opnieuw geteld bewijs, ${telling.mislukt} mislukt.`,
      );
    }
  } catch (err) {
    telling.mislukt++;
    console.error(`Kansen uit rapport ${rapportId} vastleggen mislukt:`, err);
  }
  return telling;
}

/**
 * De potentie van kansen bijwerken. De voorraad rekent hem uit bij elke
 * synchronisatie (een nieuwe meting verandert hem); hier komt hij op de kans,
 * zodat de volgorde (`ordenKansen()`) hem kent. Alleen wat veranderde.
 */
export async function werkPotentieBij(
  admin: SupabaseClient,
  updates: readonly { kansId: string; oud: number | null; potentie: number | null }[],
): Promise<void> {
  for (const u of updates) {
    const nieuw = u.potentie === null ? null : Math.max(0, Math.min(100, u.potentie));
    if (nieuw === u.oud) continue;
    const { error } = await admin
      .from("kansen")
      .update({ potentie: nieuw, updated_at: new Date().toISOString() })
      .eq("id", u.kansId);
    if (error) console.error(`Potentie van kans ${u.kansId} bijwerken mislukt: ${error.message}`);
  }
}

/**
 * Het kennisgat van elke kans van dit merk opnieuw uitrekenen (N6) en
 * wegschrijven waar het veranderde. De voorraad roept dit aan bij elke
 * synchronisatie: een antwoord van de klant of een bevestiging van de
 * consultant verandert het gat, en dan moet het plan dat tonen.
 *
 * De pagina's van een kans zijn álle versies (zelfde cluster en titel): een
 * herschreven pagina krijgt een nieuw id, en het verhaal op de open vraag hangt
 * aan de versie waarvoor het gegeven is (gevonden in K5). Gooit nooit.
 */
export async function werkKennisgatBij(admin: SupabaseClient, profileId: string): Promise<number> {
  let bijgewerkt = 0;
  try {
    const { data: kansRows } = await admin
      .from("kansen")
      .select("id, analysis_id, geldt_voor, ruw, kennis_bekend, kennis_ontbreekt")
      .eq("profile_id", profileId)
      .neq("status", "vervallen");
    const kansen = (kansRows ?? []) as {
      id: string;
      analysis_id: string | null;
      geldt_voor: string[] | null;
      ruw: { type?: unknown } | null;
      kennis_bekend: string[] | null;
      kennis_ontbreekt: string[] | null;
    }[];
    if (kansen.length === 0) return 0;

    const { data: kaartRows } = await admin
      .from("planned_pages")
      .select("kans_id, content_piece_id")
      .eq("profile_id", profileId)
      .not("kans_id", "is", null)
      .not("content_piece_id", "is", null);
    const kaarten = (kaartRows ?? []) as { kans_id: string; content_piece_id: string }[];
    const analyses = [...new Set(kansen.map((k) => k.analysis_id).filter((id): id is string => !!id))];
    const { data: stukRows } = analyses.length
      ? await admin.from("content_pieces").select("id, analysis_id, title").in("analysis_id", analyses)
      : { data: [] };
    const stukken = (stukRows ?? []) as { id: string; analysis_id: string; title: string }[];
    const sleutelVan = new Map(stukken.map((s) => [s.id, `${s.analysis_id}\n${s.title}`]));
    const versies = new Map<string, string[]>();
    for (const s of stukken) {
      const sleutel = `${s.analysis_id}\n${s.title}`;
      versies.set(sleutel, [...(versies.get(sleutel) ?? []), s.id]);
    }
    const paginasVan = (kansId: string): string[] => [
      ...new Set(
        kaarten
          .filter((k) => k.kans_id === kansId)
          .flatMap((k) => versies.get(sleutelVan.get(k.content_piece_id) ?? "") ?? [k.content_piece_id]),
      ),
    ];

    const kennis = await alleRijen<KennisVoorGat>((van, tot) =>
      admin
        .from("klantkennis")
        .select(
          "id, domein, soort, bewering, status, bron, gebruik, bron_url, citaat, bevestigd_door, bevestigd_op, vastgelegd_door, vastgelegd_door_taak, verloopt_op, vervangen_door, afgewezen_op, bewijskracht, geldt_voor, analysis_id, content_piece_id",
        )
        .eq("profile_id", profileId)
        .is("vervangen_door", null)
        .order("id")
        .range(van, tot),
    );

    const nu = new Date();
    const zelfde = (a: readonly string[] | null, b: readonly string[]) =>
      a !== null && a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);
    for (const k of kansen) {
      const gat = kennisgatVan(
        {
          analysisId: k.analysis_id,
          // Via de actuele versie van de dienst (K8 deel 4).
          geldtVoor: await naarActueleVersies(admin, profileId, k.geldt_voor ?? []),
          paginaIds: paginasVan(k.id),
          paginaSoort: typeof k.ruw?.type === "string" ? k.ruw.type : null,
        },
        kennis.map((i) => ({ ...i, geldt_voor: i.geldt_voor ?? [] })),
        nu,
      );
      if (zelfde(k.kennis_bekend, gat.bekend) && zelfde(k.kennis_ontbreekt, gat.ontbreekt)) continue;
      const { error } = await admin
        .from("kansen")
        .update({ kennis_bekend: gat.bekend, kennis_ontbreekt: gat.ontbreekt, updated_at: nu.toISOString() })
        .eq("id", k.id);
      if (error) console.error(`Kennisgat van kans ${k.id} bijwerken mislukt: ${error.message}`);
      else bijgewerkt++;
    }
  } catch (err) {
    console.error(`Kennisgaten van merk ${profileId} bijwerken mislukt:`, err);
  }
  return bijgewerkt;
}
