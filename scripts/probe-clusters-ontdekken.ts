/**
 * Proefronde voor "Clusters ontdekken", fase 0 van
 * `docs/tasks/clusters-ontdekken.md` (conventie 10: gebouwd is niet
 * geverifieerd, en hier is nog niets gebouwd).
 *
 * ── WAT DIT SCRIPT MOET BEANTWOORDEN ────────────────────────────────────────
 *
 * De pagina rust op drie aannames die nog nooit tegen een echt account zijn
 * nagemeten. Dit script maakt ze hard op Van den Udenhout, het enige merk met
 * Search Console (23 september 2026: 9.471 zoekopdrachten, 847 pagina's):
 *
 *   A. Werkt DataForSEO Labs voor Nederland in het Nederlands? Zo niet, dan
 *      valt fase 2 om en blijft de pagina op Search Console en het aanbod.
 *   B. Wat kost één ronde echt? Het plan schat $0,80 voor dit deel, op de
 *      prijzen uit `docs/tasks/ontwikkelplan-visie.md` §6 ($0,012 per aanroep
 *      plus $0,00012 per resultaat). Het script telt het veld `cost` dat
 *      DataForSEO per taak teruggeeft, dus het echte bedrag.
 *   C. Hoeveel ruis zit erin? Het "financiering"-voorbeeld uit het logboek
 *      (20 september 2026 (2)) is precies de fout die deze pagina op schaal
 *      zou maken. De ruwe maat hier is: welk deel van de zoektermen bevat een
 *      woord uit het aanbod. Dat is geen relevantietoets (die doet in fase 1
 *      een AI-model), wel een ondergrens om te zien hoe groot de hooiberg is.
 *
 * Vier aanroepen, alle vier naar DataForSEO Labs:
 *
 *   1. ranked_keywords   waarop udenhout.nl nu in Google staat
 *   2. competitors_domain wie er in Google echt met udenhout.nl concurreert.
 *      Nodig omdat `profiles.competitors` alleen namen bevat, geen domeinen
 *   3. ranked_keywords   van de twee grootste echte concurrenten uit stap 2
 *   4. keyword_ideas     rond de diensten uit de aanbodboom
 *
 * ⚠️ Gedraaid op 23 september 2026: stap 4 bleek onbruikbaar (10% relevant,
 * "weer amsterdam") en stap 3 koos portalen in plaats van dealers. De
 * verbeterde werkwijze en alle cijfers staan in `docs/tasks/clusters-ontdekken.md`,
 * "Uitkomst fase 0". Dit script blijft staan zoals het draaide, als bewijs.
 *
 * ── DRAAIEN ─────────────────────────────────────────────────────────────────
 *
 *   1. Zet DATAFORSEO_LOGIN en DATAFORSEO_PASSWORD in .env.local
 *   2. npx tsx scripts/probe-clusters-ontdekken.ts            (toont alleen het plan, gratis)
 *      npx tsx scripts/probe-clusters-ontdekken.ts --betaald  (doet de aanroepen)
 *
 * ⚠️ Met `--betaald` maakt dit ECHTE, betaalde aanroepen, naar verwachting
 * rond de $0,50 (zie `VERWACHTE_KOSTEN_USD`). Het script breekt af zodra de
 * werkelijke uitgave boven `KOSTENPLAFOND_USD` komt.
 *
 * De volledige ruwe antwoorden gaan naar `probe-uitvoer/` (conventie 8), zodat
 * de beoordeling achteraf op de echte data kan en niet op dit uittreksel.
 *
 * Standalone, zonder tsconfig-path-resolutie, zelfde opzet als
 * `scripts/probe-dataforseo-ai.ts`.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";

loadEnv({ path: ".env.local", override: true });

const BASIS = "https://api.dataforseo.com/v3/dataforseo_labs/google";

/** Nederland in het Nederlands, zelfde code als `lib/search-demand/dataforseo.ts`. */
const LOCATIE = 2528;
const TAAL = "nl";

/** Vier aanroepen met samen hooguit ~2.600 resultaten: 4 × $0,012 + 2.600 × $0,00012 ≈ $0,36. Ruim naar boven afgerond. */
const VERWACHTE_KOSTEN_USD = 0.5;
/** Drie keer de verwachting. Daarboven klopt de prijsaanname niet en stoppen we. */
const KOSTENPLAFOND_USD = 1.5;

const DOMEIN = "udenhout.nl";

/** Hoeveel resultaten per aanroep. Genoeg om ruis te zien, niet meer. */
const LIMIET_EIGEN = 700;
const LIMIET_CONCURRENT = 500;
const LIMIET_IDEEEN = 700;
const AANTAL_CONCURRENTEN = 2;

/**
 * Domeinen die in elke autozoekopdracht bovenaan staan maar geen concurrent
 * zijn: marktplaatsen, vergelijkers, encyclopedieën. Die zouden stap 3 vullen
 * met zoektermen waar een dealer nooit een pagina over schrijft.
 */
const GEEN_CONCURRENT = [
  "marktplaats.nl",
  "autoscout24.nl",
  "gaspedaal.nl",
  "autotrack.nl",
  "anwb.nl",
  "wikipedia.org",
  "youtube.com",
  "google.com",
  "facebook.com",
  "rdw.nl",
  "autoweek.nl",
  "independer.nl",
];

/**
 * De beginpunten voor stap 4, uit de aanbodboom van Van den Udenhout op
 * productie (23 september 2026, 55 knopen). Vertaald naar hoe iemand zoekt:
 * "Occasions kopen" wordt "occasion kopen", merknamen van pakketten
 * ("Fijner Rijden Pakket") en vestigingen vallen weg, want daar zoekt niemand
 * op die het bedrijf nog niet kent.
 */
const BEGINPUNTEN = [
  "occasion kopen",
  "nieuwe auto kopen",
  "proefrit",
  "audi dealer",
  "cupra dealer",
  "volkswagen service",
  "skoda onderhoud",
  "apk",
  "auto onderhoud",
  "bandenservice",
  "pechhulp",
  "vervangend vervoer",
  "schadeherstel auto",
  "auto accessoires",
  "private lease",
  "shortlease",
  "occasion lease",
  "zakelijke autohuur",
  "auto huren",
  "laadpaal thuis",
  "laadpaal bedrijf",
];

/**
 * Woorden die aangeven dat een zoekterm over het aanbod gaat. Bewust ruim:
 * dit is de ondergrens van de ruismeting, geen filter dat in de app komt.
 */
const AANBODWOORDEN = [
  "auto", "occasion", "lease", "apk", "onderhoud", "service", "band", "pech",
  "schade", "dealer", "audi", "volkswagen", "vw", "seat", "skoda", "škoda",
  "cupra", "bedrijfswagen", "laadpa", "laden", "huur", "proefrit", "accessoire",
  "onderde", "garage",
];

const REGIO = [
  "eindhoven", "veldhoven", "best", "den bosch", "'s-hertogenbosch", "hertogenbosch",
  "rosmalen", "vught", "oss", "boxtel", "brabant", "breda", "roosendaal",
];

interface Taak {
  status_code: number;
  status_message: string;
  cost: number;
  result: { items?: unknown[] | null; total_count?: number }[] | null;
}

interface Zoekterm {
  keyword: string;
  volume: number | null;
  positie: number | null;
  url: string | null;
}

let uitgegeven = 0;
const ruw: Record<string, unknown> = {};

async function roep(naam: string, pad: string, body: Record<string, unknown>): Promise<Taak | null> {
  const login = process.env.DATAFORSEO_LOGIN?.trim();
  const password = process.env.DATAFORSEO_PASSWORD?.trim();
  if (!login || !password) throw new Error("DATAFORSEO_LOGIN en DATAFORSEO_PASSWORD ontbreken in .env.local.");

  const res = await fetch(`${BASIS}/${pad}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([{ location_code: LOCATIE, language_code: TAAL, ...body }]),
  });
  const j = (await res.json().catch(() => null)) as { tasks?: Taak[] } | null;
  ruw[naam] = j;
  const taak = j?.tasks?.[0] ?? null;
  uitgegeven += taak?.cost ?? 0;

  if (!res.ok || !taak || taak.status_code !== 20000) {
    console.log(`  ✗ ${naam}: ${taak?.status_message ?? `HTTP ${res.status}`}`);
    return null;
  }
  console.log(`  ✓ ${naam}: $${(taak.cost ?? 0).toFixed(4)}, ${taak.result?.[0]?.items?.length ?? 0} resultaten`);
  if (uitgegeven > KOSTENPLAFOND_USD) {
    throw new Error(`Gestopt: $${uitgegeven.toFixed(2)} uitgegeven, boven het plafond van $${KOSTENPLAFOND_USD}.`);
  }
  return taak;
}

/** Items uit `ranked_keywords`. Defensief gelezen: onbekend wordt `null` (conventie 3). */
function rangItems(taak: Taak | null): Zoekterm[] {
  const items = (taak?.result?.[0]?.items ?? []) as Record<string, any>[];
  return items
    .map((it) => ({
      keyword: String(it?.keyword_data?.keyword ?? ""),
      volume: typeof it?.keyword_data?.keyword_info?.search_volume === "number"
        ? it.keyword_data.keyword_info.search_volume
        : null,
      positie: typeof it?.ranked_serp_element?.serp_item?.rank_absolute === "number"
        ? it.ranked_serp_element.serp_item.rank_absolute
        : null,
      url: typeof it?.ranked_serp_element?.serp_item?.url === "string"
        ? it.ranked_serp_element.serp_item.url
        : null,
    }))
    .filter((z) => z.keyword);
}

function ideeItems(taak: Taak | null): Zoekterm[] {
  const items = (taak?.result?.[0]?.items ?? []) as Record<string, any>[];
  return items
    .map((it) => ({
      keyword: String(it?.keyword ?? ""),
      volume: typeof it?.keyword_info?.search_volume === "number" ? it.keyword_info.search_volume : null,
      positie: null,
      url: null,
    }))
    .filter((z) => z.keyword);
}

function bevat(term: string, woorden: string[]): boolean {
  const t = term.toLowerCase();
  return woorden.some((w) => t.includes(w));
}

function samenvatting(naam: string, termen: Zoekterm[]): Record<string, unknown> {
  const metAanbod = termen.filter((z) => bevat(z.keyword, AANBODWOORDEN));
  const metRegio = termen.filter((z) => bevat(z.keyword, REGIO));
  const volume = termen.reduce((s, z) => s + (z.volume ?? 0), 0);
  const aandeel = termen.length ? Math.round((metAanbod.length / termen.length) * 100) : 0;
  console.log(`\n── ${naam} ──`);
  console.log(
    `  ${termen.length} zoektermen, samen ${volume.toLocaleString("nl-NL")} zoekopdrachten per maand. ` +
      `${aandeel}% bevat een woord uit het aanbod, ${metRegio.length} noemen een plaats uit het werkgebied.`,
  );
  console.log("  De 25 meest gezochte (ja = bevat een aanbodwoord):");
  for (const z of [...termen].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)).slice(0, 25)) {
    const pos = z.positie !== null ? `, plek ${z.positie}` : "";
    console.log(`    ${bevat(z.keyword, AANBODWOORDEN) ? "ja " : "nee"}  ${String(z.volume ?? "?").padStart(7)}  ${z.keyword}${pos}`);
  }
  return { aantal: termen.length, volume, aandeelMetAanbodwoord: aandeel, metRegio: metRegio.length };
}

async function main() {
  const betaald = process.argv.includes("--betaald");
  console.log(`Proefronde Clusters ontdekken voor ${DOMEIN}. Verwachte kosten: ~$${VERWACHTE_KOSTEN_USD.toFixed(2).replace(".", ",")}.`);
  if (!betaald) {
    console.log("Zonder --betaald gebeurt er niets. Draai opnieuw met --betaald om de vier aanroepen te doen.");
    return;
  }

  console.log("\nAanroepen:");
  const eigen = rangItems(await roep("eigen_zoektermen", "ranked_keywords/live", {
    target: DOMEIN,
    limit: LIMIET_EIGEN,
    order_by: ["keyword_data.keyword_info.search_volume,desc"],
  }));

  const concTaak = await roep("concurrenten", "competitors_domain/live", { target: DOMEIN, limit: 20 });
  const concurrenten = ((concTaak?.result?.[0]?.items ?? []) as Record<string, any>[])
    .map((it) => String(it?.domain ?? ""))
    .filter((d) => d && d !== DOMEIN && !GEEN_CONCURRENT.some((g) => d.endsWith(g)));

  const concTermen: Zoekterm[] = [];
  for (const domein of concurrenten.slice(0, AANTAL_CONCURRENTEN)) {
    concTermen.push(...rangItems(await roep(`zoektermen_${domein}`, "ranked_keywords/live", {
      target: domein,
      limit: LIMIET_CONCURRENT,
      order_by: ["keyword_data.keyword_info.search_volume,desc"],
    })));
  }

  const ideeen = ideeItems(await roep("ideeen", "keyword_ideas/live", {
    keywords: BEGINPUNTEN,
    limit: LIMIET_IDEEEN,
    order_by: ["keyword_info.search_volume,desc"],
  }));

  // Het concurrentiegat: waar een echte concurrent staat en udenhout.nl niet.
  const eigenSet = new Set(eigen.map((z) => z.keyword.toLowerCase()));
  const gat = [...new Map(
    concTermen.filter((z) => !eigenSet.has(z.keyword.toLowerCase())).map((z) => [z.keyword.toLowerCase(), z]),
  ).values()];

  // Snelle winst: plek 4 tot 20, zelfde grens als in het plan.
  const randje = eigen.filter((z) => z.positie !== null && z.positie >= 4 && z.positie <= 20);

  console.log(`\nEchte concurrenten volgens Google (na weglaten van marktplaatsen): ${concurrenten.slice(0, 8).join(", ") || "geen"}`);

  const rapport = {
    domein: DOMEIN,
    gedraaidOp: new Date().toISOString(),
    uitgegevenUsd: Number(uitgegeven.toFixed(4)),
    concurrenten: concurrenten.slice(0, 8),
    eigen: samenvatting("Waarop udenhout.nl nu gevonden wordt", eigen),
    snelleWinst: samenvatting("Daarvan op plek 4 tot 20 (snelle winst)", randje),
    concurrentiegat: samenvatting("Waar een concurrent staat en udenhout.nl niet", gat),
    ideeen: samenvatting("Zoekideeën rond de diensten", ideeen),
  };

  console.log(`\nWerkelijk uitgegeven: $${uitgegeven.toFixed(4)} (verwacht ~$${VERWACHTE_KOSTEN_USD.toFixed(2).replace(".", ",")}).`);

  mkdirSync("probe-uitvoer", { recursive: true });
  const pad = `probe-uitvoer/clusters-ontdekken-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
  writeFileSync(pad, JSON.stringify({ rapport, ruw }, null, 2));
  console.log(`Alles, inclusief de ruwe antwoorden, staat in ${pad}.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  console.error(`Tot dan uitgegeven: $${uitgegeven.toFixed(4)}.`);
  process.exit(1);
});
