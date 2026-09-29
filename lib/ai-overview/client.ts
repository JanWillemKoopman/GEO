import "server-only";

/**
 * De aanroep naar DataForSEO's SERP-api, met de herkansing erin.
 *
 * ── HET ENDPOINT ────────────────────────────────────────────────────────────
 *
 * `serp/google/organic/live/advanced`, met `load_async_ai_overview: true`.
 * Zonder die vlag komt het overzichtsblok terug zonder inhoud. Geverifieerd
 * tegen een echt account op 20 september 2026 (conventie 10), 234 aanroepen.
 *
 * ⚠️ **Eén vraag per aanroep.** Het live-endpoint weigert een array met meer dan
 * één taak ("You can set only one task at a time"). Dat is nagemeten, niet
 * aangenomen: de eerste poging stuurde er twaalf en kreeg elf fouten terug.
 *
 * ── DE HERKANSING IS GEEN LUXE ──────────────────────────────────────────────
 *
 * Bijna een derde van de aanroepen geeft `40101 Internal SE Server Error` bij de
 * eerste poging: 26 van 90 in ronde 1, 28 van 90 in ronde 2. Alle 54
 * herkansingen slaagden. Zonder deze lus zou een derde van elke meetronde
 * ontbreken, en dan is de noemer per ronde anders en verspringt het cijfer
 * zonder dat er iets veranderd is. Precies het probleem dat deze hele bouwronde
 * moet oplossen.
 */
import { aiOverviewCredentials } from "@/lib/ai-overview/registry";
import { DFS_OK, leesAiOverview, type DfsResponse } from "@/lib/ai-overview/parse";
import { AI_OVERVIEW_POGINGEN, type AiOverviewResultaat } from "@/lib/ai-overview/types";

const ENDPOINT = "https://api.dataforseo.com/v3/serp/google/organic/live/advanced";

/** De locatie- en taalinstelling. Zelfde land als `lib/search-demand/dataforseo.ts`. */
const LOCATION_NAME = "Netherlands";
const LANGUAGE_CODE = "nl";

/**
 * Hoeveel organische resultaten we meevragen.
 *
 * Tien, en niet meer. Het AI-overzicht staat los van de organische lijst, maar
 * die lijst komt altijd mee in de respons. Hem klein houden scheelt bandbreedte
 * en geheugen bij dertig vragen maal drie herhalingen.
 */
const DEPTH = 10;

/** Een respons die er niet komt binnen deze tijd is een mislukking, geen hangende meting. */
const TIMEOUT_MS = 120_000;

/**
 * Haal het AI-overzicht op voor één vraag.
 *
 * Gooit niet bij een mislukte aanroep: de uitkomst is dan `mislukt`, met de
 * kosten erbij. De aanroeper beslist wat dat betekent. Alleen een ontbrekende
 * schakelaar of sleutel is een programmeerfout en gooit wel.
 */
export async function haalAiOverview(vraag: string): Promise<AiOverviewResultaat> {
  const creds = aiOverviewCredentials();
  if (!creds) {
    throw new Error(
      "AI Overview-bron is niet beschikbaar: zet AI_OVERVIEW_ENABLED=true en zorg voor " +
        "DATAFORSEO_LOGIN en DATAFORSEO_PASSWORD.",
    );
  }

  const auth = Buffer.from(`${creds.login}:${creds.password}`).toString("base64");
  const body = JSON.stringify([
    {
      keyword: vraag,
      location_name: LOCATION_NAME,
      language_code: LANGUAGE_CODE,
      device: "desktop",
      os: "windows",
      depth: DEPTH,
      load_async_ai_overview: true,
    },
  ]);

  let laatste: AiOverviewResultaat = {
    status: "mislukt",
    tekst: "",
    bronnen: [],
    kostenUsd: 0,
    melding: "geen poging gedaan",
  };

  for (let poging = 1; poging <= AI_OVERVIEW_POGINGEN; poging++) {
    const uitkomst = await eenPoging(auth, body);

    // ⚠️ De kosten van een mislukte poging tellen op bij die van de volgende.
    // Een herkansing is niet gratis ($0,002 per mislukking), en de
    // kostenbewaking hoort de échte uitgave te zien, niet alleen die van de
    // geslaagde poging.
    const kostenTotaal = laatste.kostenUsd + uitkomst.kostenUsd;
    laatste = { ...uitkomst, kostenUsd: kostenTotaal };

    // Alleen een echte mislukking verdient een herkansing. "Geen overzicht" is
    // een antwoord: Google toont er simpelweg geen bij deze vraag, en dat wordt
    // bij een tweede poging niet anders.
    if (uitkomst.status !== "mislukt") return laatste;

    if (poging < AI_OVERVIEW_POGINGEN) {
      console.warn(
        `AI Overview poging ${poging} mislukt (${uitkomst.melding ?? "onbekend"}), nog één keer proberen.`,
      );
    }
  }

  return laatste;
}

async function eenPoging(auth: string, body: string): Promise<AiOverviewResultaat> {
  const antwoord = await postSerp(auth, body, TIMEOUT_MS);
  if (!antwoord.ok) {
    return { status: "mislukt", tekst: "", bronnen: [], kostenUsd: 0, melding: antwoord.melding };
  }
  return leesAiOverview(antwoord.json);
}

/** Eén POST naar het SERP-endpoint. Gooit nooit: een fout wordt een melding. */
async function postSerp(
  auth: string,
  body: string,
  timeoutMs: number,
): Promise<{ ok: true; json: unknown } | { ok: false; melding: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, melding: `HTTP ${res.status}` };
    return { ok: true, json: await res.json() };
  } catch (err) {
    return { ok: false, melding: err instanceof Error ? err.message : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

// ── De hele resultatenpagina, voor de content brief (besluit B34) ───────────
//
// Dezelfde aanroep als de meting hierboven, maar de brief wil meer dan het
// AI-overzicht: ook de bovenste resultaten en de vragen die mensen erbij
// stellen. Uitpakken gebeurt in `leesZoekresultaten()` (puur, `parse-serp.ts`).
//
// Een eigen tijdslimiet en geen eigen schakelaar-controle: de brief draait
// binnen de werker (240 seconden budget, `workerTimeBudgetMs`), en een brief
// duurde op productie tot 66 seconden (32 briefs, 29 september 2026). Veertig
// seconden per poging, twee pogingen, alle zoekopdrachten tegelijk: hooguit 80
// seconden voordat de brief begint.

/** Tijdslimiet per poging voor de brief. Zie hierboven. */
export const ZOEKRESULTATEN_TIMEOUT_MS = 40_000;

export interface RuweZoekresultaten {
  status: "gelukt" | "mislukt";
  /** De respons van DataForSEO, of null bij een mislukking. */
  json: unknown | null;
  /** Wat de pogingen samen kostten; ook een mislukte poging kost geld. */
  kostenUsd: number;
  melding: string | null;
}

/**
 * Haal de resultatenpagina op voor één zoekopdracht, met één herkansing.
 * Gooit nooit: de brief gaat zonder zoekresultaten door als het niet lukt.
 */
export async function haalZoekresultatenpagina(
  zoekopdracht: string,
  creds: { login: string; password: string },
): Promise<RuweZoekresultaten> {
  const auth = Buffer.from(`${creds.login}:${creds.password}`).toString("base64");
  const body = JSON.stringify([
    {
      keyword: zoekopdracht,
      location_name: LOCATION_NAME,
      language_code: LANGUAGE_CODE,
      device: "desktop",
      os: "windows",
      depth: DEPTH,
      // Dezelfde instellingen als de meting, die op 20 september 2026 tegen het
      // echte account is nagemeten. Bewust geen extra parameters (zoals het
      // uitklappen van "Andere mensen vroegen ook"): die zijn nog niet nagemeten,
      // en een parameter die het endpoint weigert laat elke brief zonder
      // zoekresultaten draaien.
      load_async_ai_overview: true,
    },
  ]);

  let kostenUsd = 0;
  let melding: string | null = "geen poging gedaan";
  for (let poging = 1; poging <= AI_OVERVIEW_POGINGEN; poging++) {
    const antwoord = await postSerp(auth, body, ZOEKRESULTATEN_TIMEOUT_MS);
    if (!antwoord.ok) {
      melding = antwoord.melding;
      continue;
    }
    const taak = (antwoord.json as DfsResponse | null)?.tasks?.[0];
    kostenUsd += typeof taak?.cost === "number" ? taak.cost : 0;
    if (taak?.status_code === DFS_OK) return { status: "gelukt", json: antwoord.json, kostenUsd, melding: null };
    melding = typeof taak?.status_message === "string" ? taak.status_message : `status ${String(taak?.status_code)}`;
  }
  return { status: "mislukt", json: null, kostenUsd, melding };
}
