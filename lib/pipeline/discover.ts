import "server-only";

/**
 * Fase 0 van de onboarding: ontdekken (docs/tasks/onboarding-2.0.md, blok B).
 *
 * ── WAAROM DIT DE BELANGRIJKSTE FASE IS, EN DE GOEDKOOPSTE ──────────────────
 *
 * Het profielonderzoek deed één AI-aanroep op `crawlSite()`, en dat is de
 * HOMEPAGE afgekapt op 6000 tekens (`crawler.ts`, MAX_CHARS). De 60 pagina's uit
 * de content-inventaris draaiden er parallel aan en werden pas ná de aanroep
 * opgeslagen — die kwamen het onderzoek dus nooit in. Alles wat het model over
 * diensten, prijzen, vestigingen en team "wist", kwam uit een homepage plus een
 * gok.
 *
 * Deze fase haalt tot 150 pagina's op, kamt ze uit en zet er een feitenbasis van
 * neer waar de rest van de pijplijn op leunt in plaats van hem te herontdekken.
 * Kosten: **nul**. Geen enkele AI-aanroep. Alleen een fetch en een reguliere
 * expressie — precies de scheidslijn uit `APP_FLOW_DOCUMENTATION.md`
 * §"Bewust géén AI".
 *
 * ── WAT HET OPLEVERT ────────────────────────────────────────────────────────
 *
 *   • `profile_pages`  — de content-inventaris (bestond al, nu breder)
 *   • `profiles.inventory_quality_json` — deugt die inventaris? (R6.2)
 *   • `profile_facets` rij 'techniek' — sitestructuur, gestructureerde data,
 *     renderbaarheid, naamvarianten én de geoogste feiten in `raw_json.facts`
 *
 * Bij een MKB-site met een SEO-plugin komt daar in één klap het adres, het
 * telefoonnummer, de openingstijden en de beoordelingen uit. Dat een model
 * daarnaar laten raden is geld uitgeven aan een slechter antwoord.
 *
 * ⚠️ NIET `brand_facts`. Die tabel wordt gevuld door `synthesis.ts`, aan het
 * eind van de pijplijn en alleen met feiten waarvan het citaat letterlijk op de
 * bronpagina staat. Wat hier geoogst wordt is de RUWE opbrengst — inclusief
 * paginatitels uit `WebPage`-opmaak, die op entiteitsniveau niets betekenen.
 * Vandaar dat `llm-baseline.ts` ze door `checkableFacts()` haalt voordat hij er
 * een kennistest op baseert.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { crawlPages, discoverPageUrls, MAX_PAGES_HARD_CAP } from "@/lib/crawler";
import { assessInventory, buildTaxonomy, type SiteSection } from "@/lib/pipeline/inventory-quality";
import { mergeTextFacts } from "@/lib/pipeline/text-facts";
import type { HarvestedFact } from "@/lib/pipeline/structured-data";
import type { InventoryQuality, Profile } from "@/lib/types/database";

/** Wat fase 0 aan de volgende fases doorgeeft. */
export interface DiscoveryResult {
  pagesFound: number;
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

  // Bewust het maximum en niet de instelling van het profiel: dit is een
  // eenmalige onboarding en het kost alleen tijd, geen geld. De per-profiel
  // instelling (`max_inventory_pages`) blijft gelden voor de latere
  // verversingen, waar hij wél een kostenafweging is.
  const urls = await discoverPageUrls(profile.url, MAX_PAGES_HARD_CAP, profile.sitemap_url);
  const pages = await crawlPages(urls, { harvest: true });

  // De inventaris beoordelen op ALLE gevonden URL's, niet alleen op wat gelukt
  // is: een site waarvan 140 van de 150 pagina's een time-out geven is geen
  // site met 10 pagina's — dat is een probleem, en het oordeel moet dat zien.
  const inventory = assessInventory(
    urls.map((url) => {
      const page = pages.find((p) => p.url === url);
      return { url, title: page?.title ?? null, text: page?.text ?? null };
    }),
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
  // paginatitels uit `WebPage`-opmaak hem helemaal — het telefoonnummer van de
  // contactpagina zou er dus buiten vallen terwijl het het enige feit is dat de
  // kennistest écht kan controleren.
  //
  // Ze zijn ook canonieker: `harvestTextFacts` kijkt alleen naar de homepage en
  // contact-/over-pagina's, en neemt per soort de waarde die op de meeste
  // daarvan staat. Staat hetzelfde nummer óók in de JSON-LD, dan filtert de
  // ontdubbeling hieronder het tweede exemplaar weg.
  // De crawler heeft ze al geoogst, op de VOLLEDIGE tekst van elke pagina —
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
    inventory,
    sections: buildTaxonomy(urls),
    schemaTypes: [...schemaTypes].sort(),
    pagesWithSchema,
    clientRenderedPages,
    facts,
    sameAs: [...sameAs],
    names: [...names],
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
  // Vervangen en niet aanvullen: een pagina die van de site verdwenen is, hoort
  // niet in de inventaris te blijven staan.
  await admin.from("profile_pages").delete().eq("profile_id", profileId);
  const withText = pages.filter((p) => p.text.trim().length > 0);
  if (withText.length > 0) {
    // Fout WÉL controleren. Deze insert is één batch; weigert Postgres er één,
    // dan gaat de hele batch niet door. Dat gebeurde bij swapfiets.nl (NUL-byte,
    // zie lib/pg-text.ts): de crawl meldde 22 pagina's, de database hield er
    // nul, en niemand merkte het.
    const { error } = await admin.from("profile_pages").insert(
      withText.map((p) => ({
        profile_id: profileId,
        url: p.url,
        title: p.title,
        text_excerpt: p.text,
      })),
    );
    if (error) {
      console.error(
        `Content-inventaris opslaan mislukt voor profiel ${profileId} ` +
          `(${withText.length} pagina's gecrawld, 0 opgeslagen): ${error.message}`,
      );
    }
  }

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
    .update({ inventory_quality_json: result.inventory as never })
    .eq("id", profileId);
}

/**
 * De samenvatting die een mens leest op het profielscherm. Bewust in gewone
 * taal en met cijfers: "31 pagina's, 12 met gestructureerde data" is bruikbaar,
 * "inventaris opgebouwd" niet.
 */
function beschrijf(r: DiscoveryResult): string {
  const delen: string[] = [`${r.pagesFound} pagina's gevonden`];

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
      `${r.clientRenderedPages} pagina's tonen hun tekst pas via JavaScript — AI-crawlers lezen die niet`,
    );
  }

  return `${delen.join(" · ")}.`;
}
