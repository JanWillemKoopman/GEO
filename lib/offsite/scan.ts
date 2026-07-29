import "server-only";

/**
 * De off-site scan (optimalisatie.md fase 7).
 *
 * Knoopt de drie stappen aan elkaar: het bronnenlandschap in kaart brengen
 * (7.1), controleren of de klant erop staat (7.2), en daar concrete TAKEN van
 * maken (7.3/7.6).
 *
 * Dat laatste is het punt. Off-site advies dat geen taak wordt, blijft hangen
 * als goede bedoeling — "je zou eens naar reviewplatforms moeten kijken" is
 * geen advies, dat is een gevoel. Een taak met een status is iets wat je afvinkt.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeLandscape, saveLandscape } from "@/lib/offsite/landscape";
import { domainOf } from "@/lib/offsite/domain";
import { checkPresence } from "@/lib/offsite/presence";
import { checkEntityPresence } from "@/lib/offsite/entity-presence";
import type { Analysis, Profile, SourceLandscapeRow } from "@/lib/types/database";

type Admin = SupabaseClient;

export interface ScanResult {
  domains: number;
  checked: number;
  tasksCreated: number;
}

/**
 * Vanaf hoeveel vragen een bron "de markt bepaalt".
 *
 * Onder de drie is het een bron die toevallig een paar keer langskwam; daarvoor
 * een ondernemer een account laten aanmaken is hem werk geven zonder uitzicht.
 */
const RELEVANT_PROMPT_COUNT = 3;

export async function runOffsiteScan(admin: Admin, analysisId: string): Promise<ScanResult> {
  const { data: analysisRow } = await admin
    .from("analyses")
    .select("*")
    .eq("id", analysisId)
    .maybeSingle();
  if (!analysisRow) throw new Error(`Analyse ${analysisId} niet gevonden.`);
  const analysis = analysisRow as Analysis;

  const { data: profileRow } = await admin
    .from("profiles")
    .select("*")
    .eq("id", analysis.profile_id)
    .maybeSingle();
  const profile = profileRow as Profile | null;

  // ── 7.1 — het landschap ───────────────────────────────────────────────────
  const ownDomain = domainOf(
    analysis.url.startsWith("http") ? analysis.url : `https://${analysis.url}`,
  );
  const stats = await computeLandscape(admin, analysisId, ownDomain);
  const rows = await saveLandscape(admin, analysisId, stats);

  // ── 7.2 — staat de klant erop? ────────────────────────────────────────────
  const { checked } = await checkPresence(admin, {
    analysisId,
    profileId: analysis.profile_id,
    brandName: profile?.brand_name ?? analysis.url,
    siteUrl: analysis.url,
    regions: profile?.service_regions ?? [],
    industry: profile?.industry ?? null,
    rows,
  });

  // Opnieuw inlezen: `checkPresence` heeft de uitslagen weggeschreven.
  const { data: freshRows } = await admin
    .from("source_landscape")
    .select("*")
    .eq("analysis_id", analysisId)
    .order("prompt_count", { ascending: false });

  // ── 7.4 — entiteitsaanwezigheid ───────────────────────────────────────────
  const entity = profile?.brand_name
    ? await checkEntityPresence(profile.brand_name, profile.industry)
    : null;

  if (entity && profile) {
    await admin
      .from("profiles")
      .update({
        wikidata_id: entity.wikidataId,
        wikipedia_url: entity.wikipediaUrl,
        entity_checked_at: entity.checkedAt,
      })
      .eq("id", profile.id);
  }

  // ── 7.3/7.6 — er taken van maken ──────────────────────────────────────────
  const tasksCreated = await createTasks(admin, {
    analysisId,
    rows: (freshRows ?? []) as SourceLandscapeRow[],
    brandName: profile?.brand_name ?? analysis.url,
    hasWikidata: Boolean(entity?.wikidataId),
    hasWikipedia: Boolean(entity?.wikipediaUrl),
  });

  return { domains: rows.length, checked, tasksCreated };
}

async function createTasks(
  admin: Admin,
  args: {
    analysisId: string;
    rows: SourceLandscapeRow[];
    brandName: string;
    hasWikidata: boolean;
    hasWikipedia: boolean;
  },
): Promise<number> {
  const tasks: {
    analysis_id: string;
    kind: string;
    domain: string | null;
    title: string;
    why: string;
    action: string;
    priority: number;
  }[] = [];

  for (const row of args.rows) {
    // Alleen bronnen die er echt toe doen, en alleen waar de klant NIET op
    // staat. `own_present === null` (niet vast te stellen) levert bewust geen
    // taak op: iemand op pad sturen voor iets wat misschien al geregeld is, is
    // erger dan het onvermeld laten.
    if (row.prompt_count < RELEVANT_PROMPT_COUNT) continue;
    if (row.own_present !== false) continue;

    const competitorLine =
      row.competitors.length > 0
        ? ` Via deze bron wordt ${row.competitors.slice(0, 3).join(", ")} wél genoemd.`
        : "";

    tasks.push({
      analysis_id: args.analysisId,
      kind: "platform",
      domain: row.domain,
      title: `Zorg dat ${args.brandName} op ${row.domain} staat`,
      why:
        `Bij ${row.prompt_count} van je vragen haalt de AI ${row.domain} aan als bron.` +
        `${competitorLine} Jij staat er niet op, dus bij die vragen kan de AI je via deze weg niet vinden.`,
      action:
        `Kijk of je een bedrijfsprofiel kunt aanmaken op ${row.domain}. Vul het volledig in — ` +
        `naam, werkgebied, diensten en contactgegevens — want een half profiel wordt zelden aangehaald.`,
      // Meer vragen = hogere prioriteit. Laag getal is eerst.
      priority: Math.max(1, 50 - row.prompt_count),
    });
  }

  // Entiteitsaanwezigheid (7.4). Bewust een lagere prioriteit dan de platforms:
  // een Wikipedia-artikel is niet iets wat je zelf even aanmaakt (dat mag ook
  // niet zomaar), terwijl een bedrijfsprofiel op een platform een kwartier is.
  if (!args.hasWikidata) {
    tasks.push({
      analysis_id: args.analysisId,
      kind: "wikidata",
      domain: "wikidata.org",
      title: `${args.brandName} bestaat nog niet in Wikidata`,
      why:
        "Wikidata is de open feitendatabase waar AI-systemen uit putten om te bepalen of een bedrijf " +
        "een bestaande entiteit is. Staat je merk er niet in, dan is het voor een model geen ding maar " +
        "een woord — en dan noemt het je minder snel bij naam.",
      action:
        "Een Wikidata-item aanmaken kan zelf en is gratis, maar de gegevens moeten wel te " +
        "onderbouwen zijn met externe bronnen (KvK, vakpers, nieuwsberichten). Heb je die niet, " +
        "werk daar dan eerst aan — dit is een gevolg, geen startpunt.",
      priority: 70,
    });
  }

  if (!args.hasWikipedia) {
    tasks.push({
      analysis_id: args.analysisId,
      kind: "wikipedia",
      domain: "wikipedia.org",
      title: `Geen Wikipedia-artikel over ${args.brandName}`,
      why:
        "Wikipedia is voor AI-systemen een van de zwaarstwegende bronnen over wat een bedrijf is en doet.",
      action:
        "Dit is géén doe-het-zelf-actie: een artikel over je eigen bedrijf schrijven is op Wikipedia " +
        "niet toegestaan en wordt verwijderd. Een artikel ontstaat pas als onafhankelijke bronnen " +
        "over je schrijven. Zie dit dus als een gevolg van bekendheid, niet als een taak — we noemen " +
        "het omdat het verklaart waarom je in AI-antwoorden minder vaak opduikt dan grotere partijen.",
      priority: 90,
    });
  }

  if (tasks.length === 0) return 0;

  // Bestaande taken niet overschrijven: de klant kan er al "gedaan" van gemaakt
  // hebben, en die keuze mag een volgende scan niet terugdraaien.
  const { data, error } = await admin
    .from("offsite_tasks")
    .upsert(tasks, { onConflict: "analysis_id,kind,domain", ignoreDuplicates: true })
    .select("id");

  if (error) {
    console.warn(`Off-site taken opslaan mislukt voor analyse ${args.analysisId}: ${error.message}`);
    return 0;
  }
  return data?.length ?? 0;
}
