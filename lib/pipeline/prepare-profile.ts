import "server-only";

/**
 * Orchestratie van het klantprofiel-onderzoek: context uit fase 0 → AI-onderzoek
 * → status 'klaar'. Draait met de service-role client (schrijven). Idempotent:
 * als het onderzoek al is opgeslagen, wordt niets herhaald (geen dubbele kosten).
 *
 * ── WAT HIER VERANDERDE (docs/tasks/onboarding-2.0.md, blok B) ──────────────
 *
 * Deze functie startte de content-inventaris (60 pagina's) PARALLEL aan de
 * AI-aanroep en sloeg hem pas ná afloop op. De aanroep zelf kreeg dus alleen
 * `crawlSite()` mee: de homepage, afgekapt op 6000 tekens. Alles wat het model
 * over diensten, prijzen, vestigingen en team "wist", kwam uit die ene pagina
 * plus een gok — terwijl er 60 pagina's naast lagen te wachten.
 *
 * Nu draait fase 0 (`discover.ts`) er vóór, als eigen taak. Die zet de pagina's
 * én de uit JSON-LD geoogste feiten in de database, en dit onderzoek leest ze
 * gewoon op. Zelfde kosten, veel meer context.
 *
 * Draait dit zonder dat fase 0 langs is geweest — bijvoorbeeld via de
 * handmatige retry op `/api/profiles/[id]/research` — dan valt het terug op de
 * oude gang van zaken. Beter een mager onderzoek dan een mislukte retry.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { crawlSite } from "@/lib/crawler";
import { generateProfileResearch } from "@/lib/pipeline/profile-research";
import {
  filterProtectedFields,
  describeMerge,
  type FieldOwnership,
} from "@/lib/pipeline/field-merge";
import type { HarvestedFact } from "@/lib/pipeline/structured-data";
import type { Profile, ProfileStatus } from "@/lib/types/database";

/**
 * Kolomnaam → hoe de klant het veld kent. Voor de melding na een herhaalronde:
 * "brand_name is blijven staan" zegt hem niets, "de merknaam" wel.
 */
const PROFILE_FIELD_LABELS: Record<string, string> = {
  brand_name: "de merknaam",
  industry: "de branche",
  business_model: "het bedrijfsmodel",
  tone_of_voice: "de tone of voice",
  summary: "de samenvatting",
  products: "de producten en diensten",
  value_props: "de waardeproposities",
  competitors: "de concurrenten",
  personas: "de doelgroepen",
  aliases: "de naamvarianten",
  service_regions: "het werkgebied",
};

/** Niet-lege string? (voor "klant leidend": alleen echt ingevulde waarden winnen). */
function filled(v: string | null | undefined): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** Gededupliceerde unie: klantwaarden eerst, dan de AI-aanvullingen. */
function unionList(
  clientList: string[] | null | undefined,
  aiList: string[],
): string[] {
  return Array.from(new Set([...(clientList ?? []), ...aiList]));
}

/**
 * Hoeveel sitetekst er maximaal de aanroep in gaat.
 *
 * 60.000 tekens is ruwweg 15.000 tokens, dus ~$0,003 aan invoer op Luna. Tien
 * keer zoveel context als de oude 6.000 tekens, voor een derde cent. Dat is de
 * hele reden dat deze verandering geen kostenafweging is maar een gemiste kans
 * die rechtgezet wordt.
 */
const MAX_SITE_CHARS = 60_000;

/**
 * Bouwt het contextblok uit de inventaris. Pagina's met de meeste tekst eerst:
 * een navigatiepagina van 200 tekens draagt niets bij, en bij afkappen wil je
 * dat die eraf valt en niet de dienstenpagina.
 */
function buildSiteText(
  pages: { url: string; title: string | null; text: string | null }[],
): string {
  const usable = pages
    .filter((p) => (p.text ?? "").trim().length > 0)
    .sort((a, b) => (b.text ?? "").length - (a.text ?? "").length);

  const blocks: string[] = [];
  let total = 0;
  for (const page of usable) {
    const block = `--- ${page.url}${page.title ? ` — ${page.title}` : ""}\n${page.text}`;
    if (total + block.length > MAX_SITE_CHARS) break;
    blocks.push(block);
    total += block.length;
  }
  return blocks.join("\n\n");
}

/** De uit de opmaak geoogste feiten als leesbaar blok. */
function buildFactBlock(facts: HarvestedFact[]): string {
  if (facts.length === 0) return "";
  const lines = facts
    .slice(0, 30)
    .map((f) => `${f.key}: ${f.value} (uit ${f.fromType})`);
  return (
    `\n\nUit de GESTRUCTUREERDE DATA van de site (schema.org/OpenGraph) is dit letterlijk ` +
    `gelezen. Dit zijn harde feiten, geen interpretatie — neem ze over en spreek ze niet tegen:\n` +
    lines.join("\n")
  );
}

export async function prepareProfile(id: string): Promise<ProfileStatus> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();
  if (!profile) throw new Error(`Profiel ${id} niet gevonden.`);

  if (profile.status === "klaar") return "klaar";

  try {
    const prof = profile as Profile;

    // ── Context uit fase 0 ────────────────────────────────────────────────
    const [{ data: pageRows }, { data: facetRow }, { data: ownershipRows }] =
      await Promise.all([
        admin
          .from("profile_pages")
          .select("url, title, text_excerpt")
          .eq("profile_id", id),
        admin
          .from("profile_facets")
          .select("raw_json")
          .eq("profile_id", id)
          .eq("facet", "techniek")
          .maybeSingle(),
        admin
          .from("profile_field_sources")
          .select("field, source")
          .eq("profile_id", id),
      ]);

    const pages = (pageRows ?? []).map((p) => ({
      url: p.url as string,
      title: (p.title as string | null) ?? null,
      text: (p.text_excerpt as string | null) ?? null,
    }));

    let siteText = buildSiteText(pages);

    // Terugval als fase 0 niet gedraaid heeft (handmatige retry op een oud
    // profiel). Liever de homepage dan niets.
    if (siteText.length === 0) {
      const crawl = await crawlSite(prof.url);
      siteText = crawl.text;
    }

    const harvested = ((
      facetRow?.raw_json as { facts?: HarvestedFact[] } | null
    )?.facts ?? []) as HarvestedFact[];

    const research = await generateProfileResearch({
      url: prof.url,
      siteText: siteText + buildFactBlock(harvested),
      profileId: id,
      pageCount: pages.length,
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
      },
    });
    const p = research.parsed;

    // Klant leidend, AI vult aan (abcplan.md §12.24): scalars die de klant zelf
    // invulde blijven staan; producten/concurrenten worden een unie; de rest
    // komt van de AI. Zo staat er altijd iets (AI garandeert non-empty velden).
    // Foutcontrole: zonder dit gaf deze functie "klaar" terug terwijl het profiel
    // op 'bezig' bleef staan. De taak werd dan afgevinkt, maar het profiel hing —
    // en elke poging om er een analyse mee te starten liep op een 409 ("nog niet
    // klaar met onderzoeken") zonder dat er nog iets draaide om dat op te lossen.
    const voorstel = {
      brand_name: filled(prof.brand_name)
        ? prof.brand_name
        : p.brandName || prof.name,
      industry: filled(prof.industry) ? prof.industry : p.industry,
      // Het bedrijfsmodel (R8.5, migratie 0032). Een handmatig gezette waarde
      // wint: de klant weet beter dan het model of hij een retailer of een
      // fabrikant is, en dit stuurt welke vragen hij straks krijgt.
      business_model: filled(prof.business_model)
        ? prof.business_model
        : p.businessModel,
      tone_of_voice: filled(prof.tone_of_voice)
        ? prof.tone_of_voice
        : p.toneOfVoice,
      summary: filled(prof.summary) ? prof.summary : p.summary,
      products: unionList(prof.products, p.products),
      value_props: unionList(prof.value_props, p.valueProps),
      competitors: unionList(prof.competitors, p.competitors),
      personas: prof.personas?.length ? prof.personas : p.personas,
      // Contentkwaliteit-grondslag (A2/A3): puur uit de site geëxtraheerd, geen
      // klant-input — dus altijd de AI-waarde.
      proof_points: p.proofPoints,
      style_samples: p.styleSamples,
    };

    // ── Een mens wint van een model ──────────────────────────────────────────
    //
    // Bij de EERSTE ronde staat er niets in `profile_field_sources` en gaat
    // alles gewoon door. Bij een herhaalronde — na een gesprek waarin bleek dat
    // de site vernieuwd is — blijven de velden staan die een mens heeft gezet.
    // Zonder dit is "onderzoek opnieuw" een knop die je niet durft te gebruiken.
    const { allowed, blocked } = filterProtectedFields(
      voorstel,
      (ownershipRows ?? []) as FieldOwnership[],
    );
    if (blocked.length > 0) {
      // Dezelfde zin die de klant straks te zien krijgt na een herhaalronde.
      // Eén formulering, één plek: anders zegt de log iets anders dan het scherm.
      console.info(
        `Profiel ${id}: ${describeMerge(blocked, PROFILE_FIELD_LABELS)}`,
      );
    }

    const { error: saveError } = await admin
      .from("profiles")
      .update({
        ...allowed,
        // Deze twee gaan buiten de bescherming om: het zijn geen inhoudelijke
        // velden maar boekhouding over de ronde zelf.
        raw_json: research.raw as never,
        deep_research_at: new Date().toISOString(),
        status: "klaar",
      })
      .eq("id", id);

    if (saveError) {
      throw new Error(
        `Profielonderzoek opslaan mislukt voor profiel ${id}: ${saveError.message}`,
      );
    }

    return "klaar";
  } catch (err) {
    await admin.from("profiles").update({ status: "mislukt" }).eq("id", id);
    throw err;
  }
}
