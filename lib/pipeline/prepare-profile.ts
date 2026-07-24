import "server-only";

/**
 * Orchestratie van het klantprofiel-onderzoek: crawl → profielonderzoek →
 * status 'klaar'. Draait met de service-role client (schrijven). Idempotent:
 * als het onderzoek al is opgeslagen, wordt niets herhaald (geen dubbele kosten).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { crawlSite, crawlInventory, type InventoryPage } from "@/lib/crawler";
import { generateProfileResearch } from "@/lib/pipeline/profile-research";
import type { Profile, ProfileStatus } from "@/lib/types/database";

/** Niet-lege string? (voor "klant leidend": alleen echt ingevulde waarden winnen). */
function filled(v: string | null | undefined): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** Gededupliceerde unie: klantwaarden eerst, dan de AI-aanvullingen. */
function unionList(clientList: string[] | null | undefined, aiList: string[]): string[] {
  return Array.from(new Set([...(clientList ?? []), ...aiList]));
}

export async function prepareProfile(id: string): Promise<ProfileStatus> {
  const admin = createAdminClient();

  const { data: profile } = await admin.from("profiles").select("*").eq("id", id).single();
  if (!profile) throw new Error(`Profiel ${id} niet gevonden.`);

  if (profile.status === "klaar") return "klaar";

  try {
    // De content-inventaris (abcplan.md §12.23) is netwerk-zwaar maar API-gratis
    // en hangt niet af van het profielonderzoek — draai 'm daarom PARALLEL aan de
    // (trage) OpenAI-call, zodat beide binnen de 60s-route passen. Best-effort:
    // mislukt de inventaris, dan blokkeert dat het profiel niet.
    const inventoryPromise: Promise<InventoryPage[]> = crawlInventory(profile.url, {
      maxPages: profile.max_inventory_pages,
      sitemapUrl: profile.sitemap_url,
    }).catch((err) => {
      console.error(`Content-inventaris opbouwen mislukt voor profiel ${id}:`, err);
      return [];
    });

    const prof = profile as Profile;
    const crawl = await crawlSite(prof.url);
    const research = await generateProfileResearch({
      url: prof.url,
      siteText: crawl.text,
      intake: {
        name: prof.name,
        aliases: prof.aliases,
        description: prof.intake_description,
        industry: prof.industry,
        products: prof.products,
        valueProps: prof.value_props,
        competitors: prof.competitors,
        serviceScope: prof.service_scope,
        serviceRegions: prof.service_regions,
        marketLanguage: prof.market_language,
        toneOfVoice: prof.tone_of_voice,
        audience: prof.intake_audience,
        customerQuestions: prof.customer_questions,
      },
    });
    const p = research.parsed;

    // Klant leidend, AI vult aan (abcplan.md §12.24): scalars die de klant zelf
    // invulde blijven staan; producten/concurrenten worden een unie; de rest
    // komt van de AI. Zo staat er altijd iets (AI garandeert non-empty velden).
    await admin
      .from("profiles")
      .update({
        brand_name: filled(prof.brand_name) ? prof.brand_name : p.brandName || prof.name,
        industry: filled(prof.industry) ? prof.industry : p.industry,
        tone_of_voice: filled(prof.tone_of_voice) ? prof.tone_of_voice : p.toneOfVoice,
        summary: filled(prof.summary) ? prof.summary : p.summary,
        products: unionList(prof.products, p.products),
        value_props: unionList(prof.value_props, p.valueProps),
        competitors: unionList(prof.competitors, p.competitors),
        personas: prof.personas?.length ? prof.personas : p.personas,
        raw_json: research.raw as never,
        status: "klaar",
      })
      .eq("id", id);

    const pages = await inventoryPromise;
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

    return "klaar";
  } catch (err) {
    await admin.from("profiles").update({ status: "mislukt" }).eq("id", id);
    throw err;
  }
}
