import "server-only";

/**
 * Fase 0 van de onboarding: ontdekken (docs/tasks/onboarding-2.0.md, blok B).
 *
 * ── WAAROM DIT DE BELANGRIJKSTE FASE IS, EN DE GOEDKOOPSTE ──────────────────
 *
 * Het profielonderzoek deed één AI-aanroep op `crawlSite()`, en dat is de
 * HOMEPAGE afgekapt op 6000 tekens (`crawler.ts`, MAX_CHARS). De 60 pagina's uit
 * de content-inventaris draaiden er parallel aan en werden pas ná de aanroep
 * opgeslagen. Die kwamen het onderzoek dus nooit in. Alles wat het model over
 * diensten, prijzen, vestigingen en team "wist", kwam uit een homepage plus een
 * gok.
 *
 * Deze fase haalt tot 150 pagina's op, kamt ze uit en zet er een feitenbasis van
 * neer waar de rest van de pijplijn op leunt in plaats van hem te herontdekken.
 * Kosten: **nul** bij vrijwel elke klant. Alleen een fetch en een reguliere
 * expressie. Precies de scheidslijn uit `docs/architecture.md` §6
 * "Bewust géén AI".
 *
 * ── DE ENIGE UITZONDERING OP "GEEN AI" (22 augustus 2026) ───────────────────
 *
 * Is de site GROTER dan wat we mogen lezen, dan draait er één goedkope aanroep
 * (`crawl-focus.ts`, ~$0,01) die uit de echte sectielijst kiest waar het aanbod
 * staat. Een MKB-site van 40 pagina's raakt hem nooit: daar wordt alles gelezen
 * en valt er niets te kiezen. De aanroep verzint niets, hij kiest uit wat er is.
 *
 * ── WAT HET OPLEVERT ────────────────────────────────────────────────────────
 *
 *   • `profile_pages`: de content-inventaris (bestond al, nu breder)
 *   • `profiles.inventory_quality_json`, deugt die inventaris? (R6.2)
 *   • `profiles.sitemap_total_urls`, hoe groot de site écht is (migratie 0061)
 *   • `profiles.crawl_priority_paths`, waar de crawl zich op richtte
 *   • `profile_facets` rij 'techniek', sitestructuur, gestructureerde data,
 *     renderbaarheid, naamvarianten én de geoogste feiten in `raw_json.facts`
 *
 * Bij een MKB-site met een SEO-plugin komt daar in één klap het adres, het
 * telefoonnummer, de openingstijden en de beoordelingen uit. Dat een model
 * daarnaar laten raden is geld uitgeven aan een slechter antwoord.
 *
 * ⚠️ NIET `brand_facts`. Die tabel wordt gevuld door `synthesis.ts`, aan het
 * eind van de pijplijn en alleen met feiten waarvan het citaat letterlijk op de
 * bronpagina staat. Wat hier geoogst wordt is de RUWE opbrengst, inclusief
 * paginatitels uit `WebPage`-opmaak, die op entiteitsniveau niets betekenen.
 * Vandaar dat `llm-baseline.ts` ze door `checkableFacts()` haalt voordat hij er
 * een kennistest op baseert.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { collectPageUrls, crawlPages, MAX_PAGES_HARD_CAP } from "@/lib/crawler";
import { assessInventory, buildTaxonomy, type SiteSection } from "@/lib/pipeline/inventory-quality";
import { selectUrls } from "@/lib/pipeline/url-priority";
import { chooseCrawlFocus } from "@/lib/pipeline/crawl-focus";
import { mergeTextFacts } from "@/lib/pipeline/text-facts";
import type { HarvestedFact } from "@/lib/pipeline/structured-data";
import {
  aggregateTemplateProfile,
  templateSummary,
  type SiteTemplateProfile,
} from "@/lib/pipeline/template-detect";
import type { InventoryQuality, Profile } from "@/lib/types/database";

/** Wat fase 0 aan de volgende fases doorgeeft. */
export interface DiscoveryResult {
  /** Hoeveel pagina's er gelezen zijn. */
  pagesFound: number;
  /**
   * Hoeveel pagina's de site in totaal heeft. Groter dan `pagesFound` betekent
   * dat we een keuze hebben moeten maken, en dat is het cijfer dat tot 22
   * augustus 2026 nergens bestond.
   */
  totalFound: number;
  /** Welke secties voorrang kregen, en waarom. Leeg als de hele site paste. */
  priorityPaths: string[];
  focusReasoning: string | null;
  /** Wat deze fase gekost heeft. Nul, tenzij de site te groot was. */
  costUsd: number;
  inventory: InventoryQuality;
  sections: SiteSection[];
  /** Alle @type-waarden die ergens op de site voorkomen. */
  schemaTypes: string[];
  /** Op hoeveel pagina's stond überhaupt JSON-LD? */
  pagesWithSchema: number;
  /** Pagina's waarvan de tekst waarschijnlijk pas door JavaScript verschijnt. */
  clientRenderedPages: number;
  facts: HarvestedFact[];
  sameAs: string[];
  /** Naamvarianten zoals ze in de opmaak van de site staan. */
  names: string[];
  /** Hoe de site technisch is opgebouwd: CMS, FAQ-accordions, citaatblokken. */
  templateProfile: SiteTemplateProfile;
}

/**
 * Hoeveel feiten we bewaren. Een grote site levert al snel honderden identieke
 * organisatie-regels op; de eerste vijftig unieke bevatten alles wat ertoe doet.
 */
const MAX_FACTS = 50;

export async function discoverSite(profileId: string): Promise<DiscoveryResult> {
  const admin = createAdminClient();

  const { data: row } = await admin.from("profiles").select("*").eq("id", profileId).single();
  if (!row) throw new Error(`Profiel ${profileId} niet gevonden.`);
  const profile = row as Profile;

  // ── Stap 1: de hele site in kaart, zonder iets op te halen ────────────────
  //
  // Alleen de URL-lijst uit de sitemap(s), en die lezen we nu VOLLEDIG uit, ook
  // bij 8.000 pagina's. Dat kost bijna niets (het zijn een paar XML-bestanden)
  // en het is de enige manier om te weten hoe groot de site werkelijk is. Tot 22
  // augustus 2026 stopte de crawl bij 150 URL's, waardoor "de site heeft precies
  // 150 pagina's" en "de site heeft er 8.000" in de data niet te onderscheiden
  // waren.
  const { urls: alleUrls } = await collectPageUrls(profile.url, profile.sitemap_url);

  // Bewust het maximum en niet de instelling van het profiel: dit is een
  // eenmalige onboarding en het kost alleen tijd, geen geld. De per-profiel
  // instelling (`max_inventory_pages`) blijft gelden voor de latere
  // verversingen, waar hij wél een kostenafweging is.
  const maxPages = MAX_PAGES_HARD_CAP;

  // ── Stap 2: waar richten we ons op? ───────────────────────────────────────
  //
  // Alleen als de site niet in één keer past. Wat een mens al invulde
  // (`crawl_priority_paths`) wint van het model: dat is een beslissing, en die
  // hoort niet elke ronde overschreven te worden door een oordeel.
  const handmatigeVoorrang = profile.crawl_priority_paths ?? [];
  let priorityPaths: string[] = [...handmatigeVoorrang];
  let focusReasoning: string | null = null;
  let costUsd = 0;

  if (alleUrls.length > maxPages && handmatigeVoorrang.length === 0) {
    const focus = await chooseCrawlFocus(profileId, {
      brandName: profile.brand_name ?? profile.name,
      url: profile.url,
      industry: profile.industry,
      businessModel: profile.business_model,
      // Op ALLE URL's, niet op een selectie: het model moet juist de secties
      // kunnen aanwijzen die anders zouden afvallen.
      sections: buildTaxonomy(alleUrls),
      totalFound: alleUrls.length,
      maxPages,
    });
    priorityPaths = focus.prioritySegments;
    focusReasoning = focus.reasoning;
    costUsd = focus.costUsd;
  }

  // ── Stap 3: kiezen en ophalen ─────────────────────────────────────────────
  const selectie = selectUrls(alleUrls, maxPages, priorityPaths);
  const urls = selectie.urls;
  const pages = await crawlPages(urls, { harvest: true });

  if (selectie.truncated) {
    console.info(
      `Profiel ${profileId}: site heeft ${selectie.totalFound} pagina's, ` +
        `${urls.length} gelezen over ${selectie.sections.length} secties` +
        (priorityPaths.length > 0 ? ` (voorrang: ${priorityPaths.join(", ")})` : ""),
    );
  }

  // De inventaris beoordelen op ALLE gevonden URL's, niet alleen op wat gelukt
  // is: een site waarvan 140 van de 150 pagina's een time-out geven is geen
  // site met 10 pagina's. Dat is een probleem, en het oordeel moet dat zien.
  const inventory = assessInventory(
    urls.map((url) => {
      const page = pages.find((p) => p.url === url);
      return { url, title: page?.title ?? null, text: page?.text ?? null };
    }),
    { totalFound: selectie.totalFound },
  );

  const schemaTypes = new Set<string>();
  const names = new Set<string>();
  const sameAs = new Set<string>();
  let pagesWithSchema = 0;
  let clientRenderedPages = 0;

  // ── Feiten uit de lopende tekst (4 aug 2026) ──────────────────────────────
  //
  // Deze gaan VÓÓR de opmaak-feiten in de lijst, en dat is geen smaakkwestie.
  // De lijst wordt afgekapt op MAX_FACTS, en bij Fysi-Unique vulden 50
  // paginatitels uit `WebPage`-opmaak hem helemaal, het telefoonnummer van de
  // contactpagina zou er dus buiten vallen terwijl het het enige feit is dat de
  // kennistest écht kan controleren.
  //
  // Ze zijn ook canonieker: `harvestTextFacts` kijkt alleen naar de homepage en
  // contact-/over-pagina's, en neemt per soort de waarde die op de meeste
  // daarvan staat. Staat hetzelfde nummer óók in de JSON-LD, dan filtert de
  // ontdubbeling hieronder het tweede exemplaar weg.
  // De crawler heeft ze al geoogst, op de VOLLEDIGE tekst van elke pagina,
  // `p.text` hierboven is afgekapt op 1500 tekens en bij Fysi-Unique viel het
  // telefoonnummer daar net buiten. Hier alleen nog samenvoegen en de canonieke
  // waarde per soort kiezen (`mergeTextFacts`).
  const facts: HarvestedFact[] = mergeTextFacts(
    pages.map((p) => ({ url: p.url, facts: p.textFacts ?? [] })),
  );

  for (const page of pages) {
    if (page.rendering?.likelyClientRendered) clientRenderedPages++;
    const h = page.harvest;
    if (!h) continue;
    if (h.types.length > 0) pagesWithSchema++;
    for (const t of h.types) schemaTypes.add(t);
    for (const n of h.names) names.add(n);
    for (const s of h.sameAs) sameAs.add(s);
    for (const f of h.facts) {
      if (facts.length >= MAX_FACTS) break;
      if (facts.some((existing) => existing.key === f.key && existing.value === f.value)) continue;
      facts.push(f);
    }
  }

  const result: DiscoveryResult = {
    pagesFound: urls.length,
    totalFound: selectie.totalFound,
    priorityPaths,
    focusReasoning,
    costUsd,
    inventory,
    // Op de GELEZEN pagina's en niet op alles: dit is de structuur die de rest
    // van de pijplijn als context meekrijgt, en die moet kloppen met wat er
    // daadwerkelijk aan tekst achter zit. De ware omvang staat in `totalFound`.
    sections: buildTaxonomy(urls),
    schemaTypes: [...schemaTypes].sort(),
    pagesWithSchema,
    clientRenderedPages,
    facts,
    sameAs: [...sameAs],
    names: [...names],
    templateProfile: aggregateTemplateProfile(
      pages.map((p) => p.template).filter((t): t is NonNullable<typeof t> => Boolean(t)),
    ),
  };

  await persist(admin, profileId, pages, result);
  return result;
}

async function persist(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
  pages: Awaited<ReturnType<typeof crawlPages>>,
  result: DiscoveryResult,
): Promise<void> {
  // ── De inventaris ─────────────────────────────────────────────────────────
  //
  // Vervangen en niet aanvullen: een pagina die van de site verdwenen is, hoort
  // niet in de inventaris te blijven staan.
  //
  // ⚠️ ALLEEN DE GECRAWLDE PAGINA'S (migratie 0061). Zie `replaceCrawledPages`.
  await replaceCrawledPages(admin, profileId, pages);

  // ── Het technische facet ──────────────────────────────────────────────────
  const summary = beschrijf(result);
  await admin.from("profile_facets").upsert(
    {
      profile_id: profileId,
      facet: "techniek",
      summary,
      raw_json: {
        sections: result.sections,
        schemaTypes: result.schemaTypes,
        pagesWithSchema: result.pagesWithSchema,
        clientRenderedPages: result.clientRenderedPages,
        sameAs: result.sameAs,
        names: result.names,
        facts: result.facts,
      } as never,
      // Deze fase kent geen onzekerheid: alles komt letterlijk uit de HTML.
      confidence: 1,
      sources: result.sameAs.slice(0, 10),
      cost_usd: 0,
      researched_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,facet" },
  );

  await admin
    .from("profiles")
    .update({
      inventory_quality_json: result.inventory as never,
      // Het cijfer dat de vraag "knelt het plafond?" beantwoordbaar maakt.
      sitemap_total_urls: result.totalFound,
      crawl_priority_paths: result.priorityPaths,
    })
    .eq("id", profileId);

  // ── Het sjabloonfacet ──────────────────────────────────────────────────────
  //
  // Los van het techniek-facet hierboven, want dit gaat over iets anders: niet
  // "is de site vindbaar voor een AI-crawler" maar "in welke vorm past
  // gegenereerde content technisch op deze site". `content-export.ts` leest dit
  // terug bij het aanbieden van een sjabloongerichte downloadknop.
  await admin.from("profile_facets").upsert(
    {
      profile_id: profileId,
      facet: "sjabloon",
      summary: templateSummary(result.templateProfile),
      raw_json: result.templateProfile as never,
      // Zelfde reden als bij het techniek-facet: dit komt letterlijk uit de
      // HTML, geen AI-oordeel, dus geen onzekerheid te melden.
      confidence: 1,
      sources: [],
      cost_usd: 0,
      researched_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,facet" },
  );
}

/**
 * Vervangt de GECRAWLDE inventaris en laat de handmatige pagina's staan.
 *
 * ── WAAROM DIT ÉÉN FUNCTIE IS EN GEEN TWEE (conventie: één feit, één eigenaar) ─
 *
 * Zowel fase 0 als "Vernieuw inventaris" doet deze handeling. Twee kopieën van
 * dezelfde regel lopen gegarandeerd uit elkaar, en de fout die dan ontstaat is
 * onzichtbaar: een handmatig toegevoegde pagina die stil verdwijnt bij de
 * volgende ronde. Precies de correctie waarvoor die knop bestaat.
 */
export async function replaceCrawledPages(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
  pages: readonly StorablePage[],
): Promise<{ stored: number; failed: number; kept: number }> {
  const { data: bewaarde } = await admin
    .from("profile_pages")
    .select("url")
    .eq("profile_id", profileId)
    .eq("source", "handmatig");
  const handmatig = new Set(((bewaarde ?? []) as { url: string }[]).map((r) => r.url));

  await admin.from("profile_pages").delete().eq("profile_id", profileId).eq("source", "crawl");

  // Een handmatige pagina die de crawl óók vond, blijft handmatig: de kolom
  // `(profile_id, url)` is uniek, dus twee rijen kan niet, en de handmatige is
  // de rij die een volgende ronde moet overleven.
  const nieuw = pages.filter((p) => p.text.trim().length > 0 && !handmatig.has(p.url));
  const { stored, failed } = await insertPages(admin, profileId, nieuw, "crawl");
  return { stored, failed, kept: handmatig.size };
}

/** Hoeveel pagina's er per insert meegaan. Zie `insertPages` voor waarom niet alles in één keer. */
const INSERT_CHUNK = 25;

export interface StorablePage {
  url: string;
  title: string | null;
  text: string;
}

/**
 * Schrijft pagina's weg in blokken, en telt wat er echt geland is.
 *
 * ── WAAROM NIET IN ÉÉN BATCH (22 augustus 2026) ─────────────────────────────
 *
 * Dat was het: één insert met alle pagina's tegelijk. Weigert Postgres er één,
 * dan gaat de HELE batch niet door. Bij swapfiets.nl gebeurde dat: twee van de
 * 22 pagina's bevatten een NUL-byte, de crawl meldde 22 pagina's en de database
 * hield er nul. De oorzaak van die ene keer is verholpen
 * (`sanitizeForPostgres`), het patroon niet: elke rij die Postgres om welke
 * reden dan ook weigert kost nog steeds alles, en hoe groter de crawl hoe groter
 * die kans.
 *
 * In blokken van 25 kost een rotte rij hoogstens 24 buren, en de teller
 * hieronder zegt eerlijk hoeveel er over is. Een fout wordt gelogd én geteld,
 * nooit meer alleen gelogd: de aanroeper beslist of nul opgeslagen pagina's een
 * mislukte taak is.
 */
export async function insertPages(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
  pages: readonly StorablePage[],
  source: "crawl" | "handmatig",
): Promise<{ stored: number; failed: number }> {
  let stored = 0;
  let failed = 0;

  for (let i = 0; i < pages.length; i += INSERT_CHUNK) {
    const blok = pages.slice(i, i + INSERT_CHUNK);
    const { error } = await admin.from("profile_pages").insert(
      blok.map((p) => ({
        profile_id: profileId,
        url: p.url,
        title: p.title,
        text_excerpt: p.text,
        source,
      })),
    );
    if (error) {
      failed += blok.length;
      console.error(
        `Content-inventaris: blok ${i / INSERT_CHUNK + 1} van profiel ${profileId} ` +
          `(${blok.length} pagina's) geweigerd: ${error.message}`,
      );
      continue;
    }
    stored += blok.length;
  }

  if (failed > 0) {
    console.error(
      `Content-inventaris profiel ${profileId}: ${stored} van de ${pages.length} pagina's opgeslagen, ${failed} niet.`,
    );
  }

  return { stored, failed };
}

/**
 * De samenvatting die een mens leest op het profielscherm. Bewust in gewone
 * taal en met cijfers: "31 pagina's, 12 met gestructureerde data" is bruikbaar,
 * "inventaris opgebouwd" niet.
 */
function beschrijf(r: DiscoveryResult): string {
  // ⚠️ "150 pagina's gevonden" stond hier ook als de site er 8.000 had. Dat las
  // een klant als volledigheid terwijl het een afkapping was. Nu staat de
  // verhouding er, en alleen als er echt iets is afgekapt.
  const delen: string[] = [
    r.totalFound > r.pagesFound
      ? `${r.pagesFound} van de ${r.totalFound} pagina's gelezen`
      : `${r.pagesFound} pagina's gevonden`,
  ];

  if (r.priorityPaths.length > 0) {
    delen.push(`voorrang voor ${r.priorityPaths.join(", ")}`);
  }

  if (r.sections.length > 0) {
    const top = r.sections
      .filter((s) => s.segment !== "/")
      .slice(0, 3)
      .map((s) => `${s.segment} (${s.count})`);
    if (top.length > 0) delen.push(`grootste secties: ${top.join(", ")}`);
  }

  delen.push(
    r.pagesWithSchema > 0
      ? `${r.pagesWithSchema} pagina's met gestructureerde data (${r.schemaTypes.slice(0, 4).join(", ")})`
      : "geen gestructureerde data gevonden",
  );

  if (r.facts.length > 0) delen.push(`${r.facts.length} harde feiten uit de opmaak`);

  if (r.clientRenderedPages > 0) {
    delen.push(
      `${r.clientRenderedPages} pagina's tonen hun tekst pas via JavaScript en AI-crawlers lezen die niet`,
    );
  }

  return `${delen.join(" · ")}.`;
}
