import "server-only";

/**
 * Vernieuwt ALLEEN de content-inventaris van een profiel (abcplan.md §12.23):
 * draait de crawl opnieuw met de huidige crawl-instellingen (sitemap_url,
 * max_inventory_pages) en vervangt `profile_pages`. Raakt bewust NIET het
 * merkonderzoek (brand_name/industry/personas/...) — die kan de klant handmatig
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
  if (pages.length > 0) {
    await admin.from("profile_pages").insert(
      pages.map((page) => ({
        profile_id: id,
        url: page.url,
        title: page.title,
        text_excerpt: page.text,
      })),
    );
  }

  return pages.length;
}
