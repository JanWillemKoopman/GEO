import "server-only";

/**
 * Vernieuwt ALLEEN de content-inventaris van een profiel (abcplan.md §12.23):
 * draait de crawl opnieuw met de huidige crawl-instellingen (sitemap_url,
 * max_inventory_pages) en vervangt `profile_pages`. Raakt bewust NIET het
 * merkonderzoek (brand_name/industry/personas/...). Die kan de klant handmatig
 * hebben bijgewerkt en mag niet overschreven worden. Geeft het aantal pagina's terug.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { crawlInventory } from "@/lib/crawler";

export async function refreshInventory(id: string): Promise<number> {
  const admin = createAdminClient();

  const { data: profile } = await admin.from("profiles").select("*").eq("id", id).single();
  if (!profile) throw new Error(`Profiel ${id} niet gevonden.`);

  const pages = await crawlInventory(profile.url, {
    maxPages: profile.max_inventory_pages,
    sitemapUrl: profile.sitemap_url,
  });

  await admin.from("profile_pages").delete().eq("profile_id", id);
  if (pages.length === 0) return 0;

  // Anders dan bij het profielonderzoek is dit een handeling die de klant zelf
  // startte en waarvan hij het getal te zien krijgt ("22 pagina's gevonden").
  // Dan mag een mislukte insert geen 22 opleveren: hier gooien we, zodat de
  // route een echte foutmelding toont in plaats van een leugen.
  const { error } = await admin.from("profile_pages").insert(
    pages.map((page) => ({
      profile_id: id,
      url: page.url,
      title: page.title,
      text_excerpt: page.text,
    })),
  );
  if (error) {
    throw new Error(
      `Content-inventaris opslaan mislukt (${pages.length} pagina's gecrawld): ${error.message}`,
    );
  }

  return pages.length;
}
