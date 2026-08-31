import "server-only";

/**
 * Vernieuwt de content-inventaris van een profiel (abcplan.md §12.23,
 * uitgebreid met crawlbeheer in onboarding Ronde D, §17.8). Twee modi:
 *
 *   - "opnieuw": vervangt de gecrawlde pagina's, zoals dit altijd al deed.
 *     Handmatig toegevoegde pagina's (migratie 0061) overleven, net als de
 *     merkonderzoeksvelden (brand_name/industry/personas/...): die kan de
 *     klant handmatig hebben bijgewerkt en mag niet overschreven worden.
 *   - "meer": vult aan met de eerstvolgende pagina's die nog niet in de
 *     inventaris staan. Vervangt niets.
 *
 * Draait sinds Ronde D als achtergrondtaak (`crawl_inventory`, §17.7): op
 * "langzaam" duurt 150 pagina's ruim tien minuten, en de synchrone route mag
 * hooguit 300 seconden.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { crawlInventory, MAX_PAGES_HARD_CAP, MAX_PAGES_BACKGROUND } from "@/lib/crawler";
import { replaceCrawledPages, appendCrawledPages } from "@/lib/pipeline/discover";
import { assessInventory } from "@/lib/pipeline/inventory-quality";
import type { CrawlSpeed } from "@/lib/crawl-speed";
import type { Profile } from "@/lib/types/database";

export type RefreshMode = "meer" | "opnieuw";

export interface RefreshOptions {
  mode?: RefreshMode;
  /** Hoeveel pagina's deze ronde. Zonder opgave: het profielplafond (`max_inventory_pages`). */
  maxPages?: number;
  /** Het tempo voor deze ronde. Zonder opgave: `profiles.crawl_speed`. */
  speed?: CrawlSpeed;
  /** Wandkloktijd die deze aanroep zichzelf gunt, zie `InventoryOptions.budgetMs` in lib/crawler.ts. */
  budgetMs?: number;
}

export interface RefreshResult {
  /** Hoeveel pagina's er nu in de inventaris staan, handmatige meegeteld. */
  count: number;
  /** Hoeveel pagina's de site in totaal heeft. Groter dan `count` = afgekapt. */
  totalFound: number;
  truncated: boolean;
  /** Kwam de site met een 403? Dan is de ronde gestopt in plaats van doorgegaan met lege pagina's. */
  blocked: boolean;
  /** Zijn er nog geselecteerde pagina's die niet aan de beurt kwamen (403, of het tijdbudget op)? */
  remaining: number;
}

export async function refreshInventory(
  id: string,
  opts: RefreshOptions = {},
): Promise<RefreshResult> {
  const admin = createAdminClient();
  const mode = opts.mode ?? "opnieuw";

  const { data: row } = await admin.from("profiles").select("*").eq("id", id).single();
  if (!row) throw new Error(`Profiel ${id} niet gevonden.`);
  const profile = row as Profile;

  const speed = opts.speed ?? profile.crawl_speed;
  const hardCap = opts.budgetMs !== undefined ? MAX_PAGES_BACKGROUND : MAX_PAGES_HARD_CAP;
  const maxPages = Math.min(Math.max(opts.maxPages ?? profile.max_inventory_pages, 5), hardCap);

  let exclude: string[] = [];
  if (mode === "meer") {
    const { data: bekend } = await admin
      .from("profile_pages")
      .select("url")
      .eq("profile_id", id);
    exclude = ((bekend ?? []) as { url: string }[]).map((r) => r.url);
  }

  const { pages, totalFound, truncated, blocked, remaining } = await crawlInventory(
    profile.url,
    {
      maxPages,
      sitemapUrl: profile.sitemap_url,
      priorityPaths: profile.crawl_priority_paths ?? [],
      speed,
      exclude,
      asBrowser: profile.crawl_as_browser,
      budgetMs: opts.budgetMs,
    },
  );

  const storablePages = pages
    .filter((p) => p.text)
    .map((p) => ({ url: p.url, title: p.title, text: p.text ?? "" }));

  // ⚠️ Een 403 vóór de EERSTE pagina levert nul bruikbare pagina's op. Zou
  // "opnieuw" dan gewoon doorlopen, dan VERVANGT `replaceCrawledPages()` de
  // hele bestaande inventaris door niets: de blokkade van vandaag zou de
  // gecrawlde pagina's van vorige week wissen. Precies het scenario waar §17.3
  // voor waarschuwt ("de crawl loopt stil door met lege pagina's"), alleen dan
  // met dataverlies erbij. Bij nul nieuwe pagina's raken we de tabel niet aan.
  let stored = 0;
  let failed = 0;
  let kept = 0;
  if (storablePages.length > 0) {
    ({ stored, failed, kept } =
      mode === "meer"
        ? { ...(await appendCrawledPages(admin, id, storablePages)), kept: exclude.length }
        : await replaceCrawledPages(admin, id, storablePages));
  }

  // Anders dan bij het profielonderzoek is dit een handeling die de klant zelf
  // startte en waarvan hij het getal te zien krijgt ("22 pagina's gevonden").
  // Dan mag een mislukte insert geen 22 opleveren: hier gooien we, zodat de
  // route een echte foutmelding toont in plaats van een leugen. Een 403 is
  // geen mislukte insert: die stopt de crawl zelf al netjes, met nul nieuwe
  // pagina's als resultaat, en dat hoort geen fout te zijn.
  if (!blocked && failed > 0 && stored === 0) {
    throw new Error(
      `Content-inventaris opslaan mislukt: ${pages.length} pagina's gecrawld, geen enkele opgeslagen.`,
    );
  }

  // Bij nul nieuwe pagina's is de inventaris niet aangeraakt (zie boven): het
  // aantal in het resultaat moet dan de WERKELIJKE stand blijven, niet 0.
  let huidigAantal = stored + kept;
  if (storablePages.length === 0) {
    const { count } = await admin
      .from("profile_pages")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", id);
    huidigAantal = count ?? 0;
  }

  const nu = new Date().toISOString();
  const update: Record<string, unknown> = {
    crawl_last_run_at: nu,
    crawl_last_mode: mode,
    // De GEKOZEN stand wordt de nieuwe standaard (§17.2, "per merk
    // opgeslagen"), niet `usedSpeed`: die kan door een 429/503 halverwege een
    // stand zijn gezakt, en dat is een noodgreep voor déze ronde, geen keuze
    // van de consultant voor de volgende.
    crawl_speed: speed,
  };
  // Gezet bij een blokkade, en pas weer op null zodra een latere ronde
  // daadwerkelijk doorkomt: zo blijft "geblokkeerd sinds…" op het scherm staan
  // totdat een ronde echt lukt, in plaats van na één toevallig geslaagde
  // pagina alweer te verdwijnen.
  update.crawl_last_blocked_at = blocked ? nu : null;

  // De ware omvang van de site komt uit de sitemap, los van of het lezen van
  // de PAGINA'S zelf lukte, dus dat cijfer klopt ook bij een blokkade.
  update.sitemap_total_urls = totalFound;
  // Het kwaliteitsoordeel alleen bijwerken als er ook echt iets gelezen is:
  // `assessInventory()` op een lege of gedeeltelijke lijst zou een goede
  // vorige beoordeling overschrijven met "dun", terwijl er niets mis is met de
  // bestaande inventaris, alleen deze ronde leverde niets op. Bij "opnieuw" is
  // de inventaris net vervangen, dus dan hoort het oordeel over de VOLLEDIGE
  // nieuwe set te gaan; bij "meer" blijft het oordeel over wat er al stond.
  if (mode === "opnieuw" && storablePages.length > 0) {
    update.inventory_quality_json = assessInventory(pages, { totalFound }) as never;
  }

  await admin.from("profiles").update(update).eq("id", id);

  return {
    count: huidigAantal,
    totalFound,
    truncated,
    blocked,
    remaining: remaining.length,
  };
}
