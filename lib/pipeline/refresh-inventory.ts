import "server-only";

/**
 * Vernieuwt ALLEEN de content-inventaris van een profiel (abcplan.md §12.23):
 * draait de crawl opnieuw met de huidige crawl-instellingen (sitemap_url,
 * max_inventory_pages, crawl_priority_paths) en vervangt de gecrawlde pagina's.
 * Raakt bewust NIET het merkonderzoek (brand_name/industry/personas/...). Die
 * kan de klant handmatig hebben bijgewerkt en mag niet overschreven worden.
 *
 * ⚠️ Raakt sinds migratie 0061 ook de HANDMATIG toegevoegde pagina's niet. Die
 * zijn er juist omdat de crawl ze niet vond; ze bij elke ronde weggooien maakt
 * dat toevoegen zinloos.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { crawlInventory } from "@/lib/crawler";
import { replaceCrawledPages } from "@/lib/pipeline/discover";
import { assessInventory } from "@/lib/pipeline/inventory-quality";
import type { Profile } from "@/lib/types/database";

export interface RefreshResult {
  /** Hoeveel pagina's er nu in de inventaris staan, handmatige meegeteld. */
  count: number;
  /** Hoeveel pagina's de site in totaal heeft. Groter dan `count` = afgekapt. */
  totalFound: number;
  truncated: boolean;
}

export async function refreshInventory(id: string): Promise<RefreshResult> {
  const admin = createAdminClient();

  const { data: row } = await admin.from("profiles").select("*").eq("id", id).single();
  if (!row) throw new Error(`Profiel ${id} niet gevonden.`);
  const profile = row as Profile;

  const { pages, totalFound, truncated } = await crawlInventory(profile.url, {
    maxPages: profile.max_inventory_pages,
    sitemapUrl: profile.sitemap_url,
    priorityPaths: profile.crawl_priority_paths ?? [],
  });

  const { stored, failed, kept } = await replaceCrawledPages(
    admin,
    id,
    pages.map((p) => ({ url: p.url, title: p.title, text: p.text ?? "" })),
  );

  // Anders dan bij het profielonderzoek is dit een handeling die de klant zelf
  // startte en waarvan hij het getal te zien krijgt ("22 pagina's gevonden").
  // Dan mag een mislukte insert geen 22 opleveren: hier gooien we, zodat de
  // route een echte foutmelding toont in plaats van een leugen.
  if (failed > 0 && stored === 0) {
    throw new Error(
      `Content-inventaris opslaan mislukt: ${pages.length} pagina's gecrawld, geen enkele opgeslagen.`,
    );
  }

  // Het oordeel en de omvang bijwerken, anders blijft het scherm de cijfers van
  // de vorige ronde tonen naast een inventaris die net vervangen is.
  await admin
    .from("profiles")
    .update({
      inventory_quality_json: assessInventory(pages, { totalFound }) as never,
      sitemap_total_urls: totalFound,
    })
    .eq("id", id);

  return { count: stored + kept, totalFound, truncated };
}
