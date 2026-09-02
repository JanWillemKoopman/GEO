import "server-only";

/**
 * Markt en concurrentie verdiepen (docs/tasks/onboarding-2.0.md, blok B fase 2).
 *
 * ── WAT HET MERKONDERZOEK AL DEED, EN WAT ERAAN ONTBRAK ─────────────────────
 *
 * `profile_research` levert 3–5 concurrenten als losse namen in
 * `profiles.competitors`. Dat is genoeg om een meting te kunnen duiden, maar het
 * beantwoordt de vraag niet die een ondernemer stelt zodra hij die namen ziet:
 * *waarom zij wel en ik niet?*
 *
 * Deze stap zoekt dat uit met web search, en levert per concurrent een reden met
 * een bron erbij. Zonder die bron is het een mening van een model, en precies
 * dat soort ongefundeerde uitspraken haalt `validate-claims.ts` verderop in de
 * pijplijn er weer uit.
 *
 * ── HET BRONNENLANDSCHAP OP MERKNIVEAU ──────────────────────────────────────
 *
 * `source_landscape` bestaat al sinds migratie 0022, maar hangt aan een ANALYSE.
 * Welke platforms deze markt bepalen, vergelijkers, reviewsites, vakpers, is
 * geen eigenschap van één onderwerp maar van het merk. Die lijst hier vaststellen
 * betekent dat elke analyse van deze klant hem kan hergebruiken in plaats van
 * hem opnieuw te ontdekken.
 *
 * ── VERRIJKING, GEEN VOORWAARDE ─────────────────────────────────────────────
 *
 * Zelfde afspraak als `competitor_intel` bij het rapport: mislukt dit, dan houdt
 * de klant zijn concurrentenlijst, alleen zonder het "waarom". De handler ketent
 * daarom hoe dan ook door.
 */
import { z } from "zod";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { createAdminClient } from "@/lib/supabase/admin";
import { webSearchEnabled } from "@/lib/config";
import { remainingBudgetUsd } from "@/lib/pipeline/onboarding-budget";
import { domainOf } from "@/lib/offsite/domain";
import { dedupeCompetitorNames } from "@/lib/pipeline/competitor-dedupe";
import type { Profile, ProfileOffering } from "@/lib/types/database";

export const MarketResearch = z.object({
  competitors: z.array(
    z.object({
      name: z.string(),
      /** Waarom deze partij wint, in gewone taal. Eén of twee zinnen. */
      why: z.string(),
      /** Waar je dat kunt zien. Leeg als je het niet kon terugvinden. */
      evidenceUrl: z.string(),
    }),
  ),
  /**
   * De domeinen die in deze markt gezaghebbend zijn: vergelijkers,
   * reviewplatforms, vakpers, brancheregisters. Niet de concurrenten zelf.
   */
  sourceDomains: z.array(
    z.object({
      domain: z.string(),
      /** Waarom dit domein telt voor dit type bedrijf. */
      whyItMatters: z.string(),
    }),
  ),
  /** Hoe dit bedrijf zich verhoudt tot de rest. Twee tot vier zinnen. */
  positioning: z.string(),
});

export type MarketResearch = z.infer<typeof MarketResearch>;

/** Meer dan dit is geen marktbeeld maar een lijst. */
const MAX_COMPETITORS = 8;
const MAX_DOMAINS = 10;

/** Wat deze stap ongeveer kost, met web search. Voor de budgetpoort. */
const ESTIMATED_COST = 0.12;

export interface MarketResult {
  competitors: number;
  domains: number;
  skipped: boolean;
  costUsd: number;
}

export async function researchMarket(profileId: string): Promise<MarketResult> {
  const admin = createAdminClient();

  const { data: row } = await admin
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .single();
  if (!row) throw new Error(`Profiel ${profileId} niet gevonden.`);
  const profile = row as Profile;

  // Idempotent vóór de aanroep (conventie 9).
  const { data: bestaand } = await admin
    .from("profile_facets")
    .select("facet")
    .eq("profile_id", profileId)
    .eq("facet", "markt")
    .maybeSingle();
  if (bestaand)
    return { competitors: 0, domains: 0, skipped: true, costUsd: 0 };

  const over = await remainingBudgetUsd(
    admin,
    profileId,
    profile.onboarding_budget_usd,
  );
  if (over < ESTIMATED_COST) {
    console.warn(
      `Marktonderzoek overgeslagen voor profiel ${profileId}: nog $${over.toFixed(3)} budget over.`,
    );
    return { competitors: 0, domains: 0, skipped: true, costUsd: 0 };
  }

  const { data: offeringRows } = await admin
    .from("profile_offerings")
    .select("name, kind")
    .eq("profile_id", profileId)
    .order("sort_order")
    .limit(20);
  const aanbod = (
    (offeringRows ?? []) as Pick<ProfileOffering, "name" | "kind">[]
  )
    .filter(
      (o) =>
        o.kind === "dienst" || o.kind === "product" || o.kind === "categorie",
    )
    .map((o) => o.name)
    .join(", ");

  const regio =
    profile.service_regions.length > 0
      ? profile.service_regions.join(", ")
      : null;

  // Zonder zoekfunctie zou dit een model zijn dat uit zijn geheugen redenen
  // verzint bij namen die het zelf heeft bedacht. Dan liever niets vragen dan
  // een onderbouwing die nergens op slaat (conventie 3).
  const groundingRule = webSearchEnabled
    ? `Gebruik web search. Elke reden moet je ergens KUNNEN terugvinden; zet die vindplaats in evidenceUrl.`
    : `Je hebt GEEN zoekfunctie. Laat evidenceUrl leeg en houd de redenen bij wat algemeen bekend is; ` +
      `verzin geen vindplaatsen.`;

  const system =
    `Je bent marktanalist voor een GEO-adviesbureau. Je onderzoekt het concurrentieveld van één ` +
    `bedrijf.\n\n` +
    `LEVER DRIE DINGEN:\n` +
    `1. COMPETITORS: per concurrent WAAROM die wint bij dit type klant. Niet "zij hebben een ` +
    `betere website" maar concreet: groter bereik, scherpere prijs, een specialisatie, een sterke ` +
    `aanwezigheid op een platform.\n` +
    `2. SOURCEDOMAINS, de domeinen die in deze markt gezaghebbend zijn: vergelijkers, ` +
    `reviewplatforms, vakpers, brancheregisters. NIET de concurrenten zelf, maar de plekken waar ` +
    `over dit soort bedrijven geschreven wordt.\n` +
    `3. POSITIONING: hoe dit bedrijf zich verhoudt tot de rest.\n\n` +
    `${groundingRule} Verzin geen concurrenten die niet bestaan; een korte, kloppende lijst is ` +
    `beter dan een lange. Antwoord in het Nederlands.`;

  const user =
    `Bedrijf: ${profile.brand_name ?? profile.name}\nWebsite: ${profile.url}\n` +
    (profile.industry ? `Branche: ${profile.industry}\n` : "") +
    (profile.business_model
      ? `Bedrijfsmodel: ${profile.business_model}\n`
      : "") +
    (regio ? `Werkgebied: ${regio}\n` : "") +
    (aanbod ? `Aanbod: ${aanbod}\n` : "") +
    (profile.competitors.length > 0
      ? `\nConcurrenten die het eerdere onderzoek al vond (controleer ze en vul aan):\n` +
        profile.competitors.join(", ")
      : "");

  const result = await callStructured({
    model: MODELS.quality,
    system,
    user,
    schema: MarketResearch,
    schemaName: "market_research",
    webSearch: webSearchEnabled,
    work: "analytical",
    meta: { kind: "profile_market", profileId },
  });

  const parsed = result.parsed;

  // ── Vangnetten ───────────────────────────────────────────────────────────
  // Het eigen merk mag nooit als concurrent van zichzelf in de lijst staan.
  // Dat gebeurt in de praktijk zodra het model de context te letterlijk leest,
  // en het vervuilt daarna élke share-of-voice-berekening.
  const eigenNamen = new Set(
    [profile.brand_name, profile.name, ...profile.aliases]
      .filter((n): n is string => Boolean(n))
      .map((n) => n.toLowerCase().trim()),
  );

  const gezien = new Set<string>();
  const concurrenten = parsed.competitors
    .filter((c) => {
      const naam = c.name.trim().toLowerCase();
      if (!naam || eigenNamen.has(naam) || gezien.has(naam)) return false;
      gezien.add(naam);
      return true;
    })
    .slice(0, MAX_COMPETITORS);

  // Domeinen normaliseren en het eigen domein eruit: dat is geen extern
  // bronnenlandschap maar de site die we net gecrawld hebben.
  const eigenDomein = domainOf(profile.url);
  const domeinen = dedupeDomains(parsed.sourceDomains, eigenDomein).slice(
    0,
    MAX_DOMAINS,
  );

  await admin.from("profile_facets").upsert(
    {
      profile_id: profileId,
      facet: "markt",
      summary: beschrijf(
        concurrenten.length,
        domeinen.length,
        parsed.positioning,
      ),
      raw_json: {
        ...(result.raw as object),
        competitors: concurrenten,
        sourceDomains: domeinen,
        positioning: parsed.positioning,
      } as never,
      // Zonder zoekfunctie is dit modelgeheugen en geen onderzoek. Dat hoort in
      // de zekerheid te staan, niet in een voetnoot.
      confidence: webSearchEnabled ? 0.8 : 0.4,
      sources: domeinen.map((d) => d.domain),
      model_used: MODELS.quality,
      cost_usd: result.costUsd,
      researched_at: new Date().toISOString(),
    },
    { onConflict: "profile_id,facet" },
  );

  // De namen als unie terug naar `profiles.competitors`, want dáár leest de rest
  // van de pijplijn ze. Een unie en geen vervanging: wat de klant zelf opgaf of
  // wat een eerdere ronde vond, blijft staan.
  //
  // T8.3: ontdubbelen op meer dan de exacte tekst. "Cleyburch Tandartsen" en
  // "Cleyburch Tandartsen in Noordwijk" zijn dezelfde concurrent met en zonder
  // meegeplakte plaatsnaam; `new Set` zag ze eerder als twee.
  const unie = dedupeCompetitorNames([
    ...profile.competitors,
    ...concurrenten.map((c) => c.name.trim()),
  ]);
  if (unie.length !== profile.competitors.length) {
    await admin
      .from("profiles")
      .update({ competitors: unie })
      .eq("id", profileId);
  }

  return {
    competitors: concurrenten.length,
    domains: domeinen.length,
    skipped: false,
    costUsd: result.costUsd,
  };
}

function dedupeDomains(
  domains: MarketResearch["sourceDomains"],
  eigenDomein: string | null,
): MarketResearch["sourceDomains"] {
  const gezien = new Set<string>();
  const out: MarketResearch["sourceDomains"] = [];
  for (const d of domains) {
    const genormaliseerd = domainOf(d.domain) ?? d.domain.trim().toLowerCase();
    if (
      !genormaliseerd ||
      genormaliseerd === eigenDomein ||
      gezien.has(genormaliseerd)
    )
      continue;
    gezien.add(genormaliseerd);
    out.push({ domain: genormaliseerd, whyItMatters: d.whyItMatters });
  }
  return out;
}

function beschrijf(
  concurrenten: number,
  domeinen: number,
  positionering: string,
): string {
  const delen: string[] = [];
  if (concurrenten > 0)
    delen.push(`${concurrenten} concurrenten met onderbouwing`);
  if (domeinen > 0)
    delen.push(`${domeinen} gezaghebbende bronnen in deze markt`);
  const kop =
    delen.length > 0
      ? `${delen.join(" · ")}.`
      : "Geen marktbeeld kunnen vaststellen.";
  return positionering.trim() ? `${kop} ${positionering.trim()}` : kop;
}
