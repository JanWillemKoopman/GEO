import "server-only";

/**
 * Orchestratie van het klantprofiel-onderzoek: crawl → profielonderzoek →
 * status 'klaar'. Draait met de service-role client (schrijven). Idempotent:
 * als het onderzoek al is opgeslagen, wordt niets herhaald (geen dubbele kosten).
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { crawlSite } from "@/lib/crawler";
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

    return "klaar";
  } catch (err) {
    await admin.from("profiles").update({ status: "mislukt" }).eq("id", id);
    throw err;
  }
}
