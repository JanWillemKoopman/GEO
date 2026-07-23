import "server-only";

/**
 * Orchestratie van het klantprofiel-onderzoek: crawl → profielonderzoek →
 * status 'klaar'. Draait met de service-role client (schrijven). Idempotent:
 * als het onderzoek al is opgeslagen, wordt niets herhaald (geen dubbele kosten).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { crawlSite, discoverPageUrls, crawlPages } from "@/lib/crawler";
import { generateProfileResearch } from "@/lib/pipeline/profile-research";
import type { ProfileStatus } from "@/lib/types/database";

export async function prepareProfile(id: string): Promise<ProfileStatus> {
  const admin = createAdminClient();

  const { data: profile } = await admin.from("profiles").select("*").eq("id", id).single();
  if (!profile) throw new Error(`Profiel ${id} niet gevonden.`);

  if (profile.status === "klaar") return "klaar";

  try {
    const crawl = await crawlSite(profile.url);
    const research = await generateProfileResearch({ url: profile.url, siteText: crawl.text });
    const p = research.parsed;

    await admin
      .from("profiles")
      .update({
        brand_name: p.brandName,
        industry: p.industry,
        tone_of_voice: p.toneOfVoice,
        summary: p.summary,
        products: p.products,
        value_props: p.valueProps,
        competitors: p.competitors,
        personas: p.personas,
        raw_json: research.raw as never,
        status: "klaar",
      })
      .eq("id", id);

    // ── Content-inventaris (abcplan.md §12.23): beperkte crawl van de site
    // (sitemap, fallback: links vanaf de homepage), zodat het rapport straks
    // bestaande content kan herkennen i.p.v. altijd iets nieuws voor te stellen.
    // Eenmalig per profiel — mislukt dit, dan blokkeert het het profiel niet
    // (best-effort: gaps in de inventaris zijn geen showstopper).
    try {
      const urls = await discoverPageUrls(profile.url);
      const pages = await crawlPages(urls);
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
    } catch (err) {
      console.error(`Content-inventaris opbouwen mislukt voor profiel ${id}:`, err);
    }

    return "klaar";
  } catch (err) {
    await admin.from("profiles").update({ status: "mislukt" }).eq("id", id);
    throw err;
  }
}
