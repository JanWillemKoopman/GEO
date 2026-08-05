import "server-only";

/**
 * De synthese: alles samenbrengen en er feiten van maken
 * (docs/tasks/onboarding-2.0.md, blok B fase 5).
 *
 * ── WAAROM DIT DE ENIGE ONBOARDING-STAP OP HET DURE MODEL IS ────────────────
 *
 * Elke voorgaande fase kijkt naar één ding: de crawl naar de HTML, het aanbod
 * naar de dienstenpagina's, de kennistest naar wat een assistent zegt. Deze stap
 * is de enige die ze naast elkaar legt, en die uitkomst werkt door in élke
 * latere analyse van deze klant.
 *
 * `gpt-5.6-sol` kost hier ~$0,49 van een plafond van $2,15. Achter
 * `SYNTHESIS_PREMIUM` (standaard aan) zodat de keuze meetbaar blijft in plaats
 * van definitief te zijn: uit betekent terugvallen op Luna voor ~$0,02.
 *
 * ── WAAR DE INVESTERING TERUGKOMT ───────────────────────────────────────────
 *
 * Niet in het dossier. Dat is leesvoer. In `brand_facts`. De contentbriefing
 * stelt tot acht vragen aan de klant omdat de feitenkaart leeg is; elk feit dat
 * hier al uit de site komt, is een vraag die hij niet hoeft te beantwoorden.
 * Dat is de meetlat die in het plan staat.
 *
 * ── HET VANGNET ─────────────────────────────────────────────────────────────
 *
 * Een feit met een citaat dat niet LETTERLIJK op de opgegeven pagina staat,
 * vervalt. Zelfde regel als `verifyAtoms()` en `verifyDossierFacts()`: een
 * promptinstructie is een intentie, code is een garantie (conventie 1). Deze
 * feiten gaan straks ongefilterd een contentpagina in die de klant publiceert,
 * dit is niet de plek om het model op zijn woord te geloven.
 */
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProfileSynthesis } from "@/lib/schemas/synthesis";
import { claimKey } from "@/lib/pipeline/factcard";
import { remainingBudgetUsd } from "@/lib/pipeline/onboarding-budget";
import { quoteOnPage } from "@/lib/pipeline/quote-check";
import { synthesisPremium } from "@/lib/config";
import type {
  Profile,
  ProfileFacet,
  ProfileOffering,
} from "@/lib/types/database";

/** Hoeveel feiten we hoogstens overnemen. Meer is geen kaart maar een export. */
const MAX_FACTS = 25;

/**
 * Wat de synthese minimaal aan budget nodig heeft. Sol op ~50k invoer en 8k
 * uitvoer komt op ~$0,49; met marge erboven, want een te krappe schatting laat
 * de duurste stap alsnog over het plafond gaan.
 */
const ESTIMATED_COST_SOL = 0.6;

export interface SynthesisResult {
  facts: number;
  gaps: number;
  skipped: boolean;
  costUsd: number;
}

export async function synthesiseProfile(
  profileId: string,
): Promise<SynthesisResult> {
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single();
  if (!row) throw new Error(`Profiel ${profileId} niet gevonden.`);
  const profile = row as Profile;

  // Idempotent vóór de duurste aanroep van de onboarding (conventie 9).
  const { data: bestaand } = await admin
    .from("profile_facets")
    .select("facet")
    .eq("profile_id", profileId)
    .eq("facet", "synthese")
    .maybeSingle();
  if (bestaand) return { facts: 0, gaps: 0, skipped: true, costUsd: 0 };

  const [{ data: facetRows }, { data: offeringRows }, { data: pageRows }] =
    await Promise.all([
      admin.from("profile_facets").select("*").eq("profile_id", profileId),
      admin
        .from("profile_offerings")
        .select("*")
        .eq("profile_id", profileId)
        .order("sort_order"),
      admin
        .from("profile_pages")
        .select("url, title, text_excerpt")
        .eq("profile_id", profileId),
    ]);

  const facets = (facetRows ?? []) as ProfileFacet[];
  const offerings = (offeringRows ?? []) as ProfileOffering[];
  const pages = pageRows ?? [];

  if (pages.length === 0) {
    // Zonder gecrawlde pagina's kan geen enkel feit geverifieerd worden, en een
    // dossier zonder feiten is een samenvatting van niets. Geen aanroep doen is
    // hier het juiste antwoord.
    return { facts: 0, gaps: 0, skipped: true, costUsd: 0 };
  }

  // Het dure model alleen als het budget het toelaat. De volgorde van de
  // pijplijn is hierop afgestemd: deze stap komt laat, dus "budget op" raakt
  // automatisch het minst belangrijke.
  const over = await remainingBudgetUsd(
    admin,
    profileId,
    profile.onboarding_budget_usd,
  );
  const gebruikSol = synthesisPremium && over >= ESTIMATED_COST_SOL;
  const model = gebruikSol ? MODELS.content : MODELS.quality;

  if (synthesisPremium && !gebruikSol) {
    console.info(
      `Profiel ${profileId}: synthese op het goedkope model, er is nog $${over.toFixed(3)} budget over.`,
    );
  }

  const system =
    `Je vat een klantprofiel samen voor een GEO-adviesbureau. Je krijgt alles wat er over dit ` +
    `bedrijf is verzameld: de sitestructuur, het aanbod, het merkonderzoek en wat AI-assistenten ` +
    `er al over zeggen.\n\n` +
    `LEVER DRIE DINGEN:\n\n` +
    `1. DOSSIER: vier tot acht zinnen, voor een ondernemer zonder vakjargon. Wat doet dit ` +
    `bedrijf, voor wie, wat onderscheidt het, en waar staat het nu.\n\n` +
    `2. GAPS: wat je NIET kon vaststellen maar wel had willen weten. Dit wordt de agenda van ` +
    `het gesprek met de klant, dus concreet en in dertig seconden te beantwoorden. Niet "meer ` +
    `over de doelgroep" maar "hoeveel behandelkamers zijn er?".\n\n` +
    `3. FACTS: citeerbare feiten over dit bedrijf: aantallen, jaartallen, termijnen, garanties, ` +
    `specialisaties, keurmerken. HARDE REGELS:\n` +
    `   - Elk feit heeft een sourceUrl uit de meegegeven pagina's en een quote die LETTERLIJK, ` +
    `teken voor teken, in de tekst van díe pagina staat. Dit wordt nagelopen; wat niet klopt ` +
    `vervalt.\n` +
    `   - Geen marketingtaal. "Al 25 jaar actief" is een feit, "de beste van de regio" niet.\n` +
    `   - Liever tien scherpe dan veertig vage.\n\n` +
    `Antwoord in het Nederlands.`;

  const facetBlok = facets
    .filter((f) => f.summary)
    .map((f) => `[${f.facet}] ${f.summary}`)
    .join("\n");

  const aanbodBlok = offerings
    .slice(0, 60)
    .map(
      (o) =>
        `- [${o.kind}] ${o.name}${o.description ? `: ${o.description}` : ""}`,
    )
    .join("\n");

  const paginaBlok = buildPageBlock(pages);

  const user =
    `Bedrijf: ${profile.brand_name ?? profile.name}\nWebsite: ${profile.url}\n` +
    (profile.industry ? `Branche: ${profile.industry}\n` : "") +
    (profile.business_model
      ? `Bedrijfsmodel: ${profile.business_model}\n`
      : "") +
    (profile.service_regions.length > 0
      ? `Werkgebied: ${profile.service_regions.join(", ")}\n`
      : "") +
    (facetBlok ? `\nWAT HET ONDERZOEK OPLEVERDE:\n${facetBlok}\n` : "") +
    (aanbodBlok ? `\nHET AANBOD:\n${aanbodBlok}\n` : "") +
    `\nDE PAGINA'S (hieruit moeten je citaten komen):\n"""\n${paginaBlok}\n"""`;

  const result = await callStructured({
    model,
    system,
    user,
    schema: ProfileSynthesis,
    schemaName: "profile_synthesis",
    webSearch: false,
    work: gebruikSol ? "content" : "analytical",
    meta: { kind: "profile_synthesis", profileId },
  });

  const parsed = result.parsed;

  // ── Het vangnet: alleen letterlijk onderbouwde feiten overleven ──────────
  const tekstPerUrl = new Map(
    pages.map((p) => [p.url as string, (p.text_excerpt as string) ?? ""]),
  );
  const geldig = parsed.facts
    .filter((f) => {
      const bron = tekstPerUrl.get(f.sourceUrl);
      if (bron === undefined) return false;
      return quoteOnPage(f.quote, bron);
    })
    .slice(0, MAX_FACTS);

  const verworpen = parsed.facts.length - geldig.length;
  if (verworpen > 0) {
    console.info(
      `Profiel ${profileId}: ${verworpen} van de ${parsed.facts.length} feiten vervallen, ` +
        `het citaat stond niet letterlijk op de opgegeven pagina.`,
    );
  }

  const bewaard = await storeBrandFacts(admin, profileId, geldig);

  await admin.from("profile_facets").upsert(
    {
      profile_id: profileId,
      facet: "synthese",
      summary: parsed.dossier.trim() || null,
      raw_json: {
        ...(result.raw as object),
        gaps: parsed.gaps,
        rejectedFacts: verworpen,
      } as never,
      // De zekerheid is het aandeel feiten dat de verificatie overleefde. Haalt
      // de helft dat niet, dan is er iets mis met het materiaal en hoort dat
      // zichtbaar te zijn in plaats van als "klaar" weggeschreven.
      confidence:
        parsed.facts.length > 0
          ? Number((geldig.length / parsed.facts.length).toFixed(2))
          : null,
      model_used: model,
      cost_usd: result.costUsd,
      researched_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,facet" },
  );

  return {
    facts: bewaard,
    gaps: parsed.gaps.length,
    skipped: false,
    costUsd: result.costUsd,
  };
}

/**
 * Merkbrede feiten wegschrijven.
 *
 * Bewust niet via `syncBrandFacts()`: die is gebouwd voor de contentbriefing en
 * eist een `analysisId` om onderwerp-specifieke feiten aan te hangen. De
 * synthese kent geen analyse, alles wat hier uitkomt geldt voor het hele merk.
 * Die API daarvoor buigen zou hem voor beide gevallen minder duidelijk maken.
 *
 * Wél dezelfde ontdubbelsleutel (`claimKey()`), zodat een feit dat later ook uit
 * een klantantwoord komt niet twee keer op de kaart staat.
 */
async function storeBrandFacts(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
  facts: ProfileSynthesis["facts"],
): Promise<number> {
  if (facts.length === 0) return 0;

  const { data: bestaand } = await admin
    .from("brand_facts")
    .select("fact_key")
    .eq("profile_id", profileId)
    .is("superseded_by", null);
  const bekend = new Set((bestaand ?? []).map((r) => r.fact_key as string));

  const gezien = new Set<string>();
  const rijen = facts
    .map((f) => ({ f, key: claimKey(f.text) }))
    .filter(({ key }) => {
      // Binnen deze batch én tegen wat er al staat. Zonder de eerste controle
      // zou één dubbel feit de hele insert laten mislukken.
      if (!key || bekend.has(key) || gezien.has(key)) return false;
      gezien.add(key);
      return true;
    })
    .map(({ f, key }) => ({
      profile_id: profileId,
      analysis_id: null,
      text: f.text.trim(),
      source: `site ${pathOf(f.sourceUrl)}`,
      source_url: f.sourceUrl,
      kind: "site",
      citable: true,
      allowed: true,
      fact_key: key,
    }));

  if (rijen.length === 0) return 0;

  const { error } = await admin.from("brand_facts").insert(rijen);
  if (error) {
    // Verrijking, geen voorwaarde: het profiel is klaar, de feitenkaart valt
    // terug op wat hij vóór deze ronde had.
    console.error(
      `Feiten opslaan mislukt voor profiel ${profileId}: ${error.message}`,
    );
    return 0;
  }
  return rijen.length;
}

/** Hoeveel sitetekst er de aanroep in gaat. Sol is duur; dit is de knop. */
const MAX_PAGE_CHARS = 45_000;

function buildPageBlock(
  pages: { url: unknown; title: unknown; text_excerpt: unknown }[],
): string {
  const bruikbaar = pages
    .filter((p) => ((p.text_excerpt as string) ?? "").trim().length > 0)
    .sort(
      (a, b) =>
        ((b.text_excerpt as string) ?? "").length -
        ((a.text_excerpt as string) ?? "").length,
    );

  const blokken: string[] = [];
  let totaal = 0;
  for (const p of bruikbaar) {
    const blok = `--- ${p.url as string}${p.title ? ` · ${p.title as string}` : ""}\n${p.text_excerpt as string}`;
    if (totaal + blok.length > MAX_PAGE_CHARS) break;
    blokken.push(blok);
    totaal += blok.length;
  }
  return blokken.join("\n\n");
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
