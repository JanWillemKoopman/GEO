/**
 * Verificatie van drie DataForSEO-producten vóór er iets gebouwd wordt
 * (conventie 10: gebouwd is niet geverifieerd).
 *
 * ── WAT DIT SCRIPT MOET BEANTWOORDEN ────────────────────────────────────────
 *
 * Er liggen drie voorstellen op tafel die alle drie op een onbekend cijfer
 * rusten. Dit script maakt die cijfers hard met echte aanroepen op de vragen
 * van Van den Udenhout, en niet met een schatting uit documentatie:
 *
 *   A. Bestaat Nederland met het Nederlands in het AI-zoekvolume-endpoint?
 *      Zo niet, dan valt voorstel C hier om en hoeft de rest niet gebouwd.
 *      GRATIS.
 *   B. Welke modellen van ChatGPT en Gemini ondersteunen web search bij
 *      DataForSEO, en hoe heten ze precies? GRATIS.
 *   C. Levert `ai_search_volume` iets op voor onze soort termen? Drie vormen
 *      gaan erin: de hele meetvraag, het clusterlabel plus plaats, en het
 *      clusterlabel alleen. Dat is exact de drietrap uit
 *      `lib/search-demand/keywords.ts`, waar op 19 september 2026 bij het
 *      gewone zoekvolume 1 van de 10 volzinnen een resultaat gaf. BETAALD,
 *      ongeveer $0,01 voor de hele lijst.
 *   D. Wat kost één meting werkelijk via ChatGPT en via Gemini met web search
 *      aan, en komt er een bruikbaar Nederlands antwoord uit? BETAALD, de
 *      prijs is juist de onbekende die dit script moet vaststellen.
 *
 * ── DRAAIEN ─────────────────────────────────────────────────────────────────
 *
 *   1. Zet DATAFORSEO_LOGIN en DATAFORSEO_PASSWORD in .env.local
 *   2. npx tsx scripts/probe-dataforseo-ai.ts            (alleen A en B, gratis)
 *      npx tsx scripts/probe-dataforseo-ai.ts --betaald  (ook C en D)
 *
 * ⚠️ Met `--betaald` maakt dit ECHTE, betaalde aanroepen. De verwachte uitgave
 * staat hieronder in `VERWACHTE_KOSTEN_USD` en wordt vooraf getoond; achteraf
 * rapporteert het script wat er daadwerkelijk is afgeschreven, uit het veld
 * `cost` dat DataForSEO per taak teruggeeft.
 *
 * Standalone, zonder tsconfig-path-resolutie, zelfde opzet als
 * `scripts/test-openai.ts`.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";

// .env.local heeft voorrang op .env (zoals Next.js dat ook doet).
loadEnv({ path: ".env.local", override: true });

const BASIS = "https://api.dataforseo.com/v3";

/** Ruwe schatting vooraf, puur om te kunnen afbreken als het uit de hand loopt. */
const VERWACHTE_KOSTEN_USD = 0.25;

/**
 * Waar we op meten. Zelfde land- en taalkeuze als
 * `lib/ai-overview/client.ts` en `lib/search-demand/dataforseo.ts`.
 */
const LOCATIE = "Netherlands";
const TAAL = "nl";
const LAND_ISO = "NL";

/**
 * Vijf echte meetvragen van Van den Udenhout, uit `prompts` op productie
 * (analyse 027487ec, cluster "Occasion kopen in Noord-Brabant").
 *
 * Echte vragen en geen verzonnen voorbeelden: het gaat er juist om of een
 * lokale koopvraag in het Nederlands een bruikbaar antwoord oplevert bij een
 * bron die daar tot nu toe niet op getest is.
 */
const MEETVRAGEN = [
  "Welke autodealer in Den Bosch heeft occasions die vooraf grondig zijn gecontroleerd en onder BOVAG-voorwaarden worden verkocht?",
  "Waar kan ik in Eindhoven betrouwbare occasions bekijken zonder risico op verborgen gebreken?",
  "Waar kan ik in Oss een occasion kopen en mijn huidige auto meteen laten taxeren en inruilen?",
  "Welke occasiondealer in Boxtel kan mijn huidige auto taxeren en helpen bij het vinden van een passende gebruikte auto?",
  "Is een occasion kopen bij een merkdealer in Noord-Brabant veiliger dan kopen bij een universele occasionaanbieder of particulier?",
];

/** Het merk waar we op letten in het antwoord. Zoals de klant zichzelf noemt. */
const MERK = "Van den Udenhout";

/**
 * De systeeminstructie, LETTERLIJK dezelfde als `SIMULATE_SYSTEM` in
 * `lib/pipeline/measure.ts` (327 tekens, ruim binnen de limiet van 500).
 *
 * Letterlijk, want anders meet dit script het verschil tussen twee instructies
 * in plaats van het verschil tussen twee bronnen, en is de vergelijking met
 * onze eigen ChatGPT-route niets waard.
 */
const SIMULATE_SYSTEM =
  "Je bent een behulpzame AI-assistent (zoals ChatGPT) die vragen van gebruikers beantwoordt. " +
  "Gebruik web search om actuele, feitelijke informatie te vinden. Noem concrete merken, bedrijven " +
  "of bronnen waar relevant voor het antwoord. Antwoord in het Nederlands, zoals je dat voor een " +
  "echte gebruiker zou doen die deze vraag stelt.";

/**
 * De zoektermen voor stap C, in drie vormen naast elkaar.
 *
 * De drie clusterlabels komen uit `profile_topics` op productie, de plaatsen
 * uit `profiles.service_regions` van hetzelfde merk. De twee indexcijfers
 * erachter zijn wat de huidige AI-schatting ervan maakte; die staan hier zodat
 * de uitdraai het gemeten cijfer er meteen naast zet.
 */
const ZOEKTERMEN: { term: string; vorm: "volzin" | "cluster+plaats" | "cluster"; nu?: number }[] = [
  { term: MEETVRAGEN[0], vorm: "volzin" },
  { term: MEETVRAGEN[1], vorm: "volzin" },
  { term: MEETVRAGEN[2], vorm: "volzin" },
  { term: "occasion kopen eindhoven", vorm: "cluster+plaats" },
  { term: "occasion kopen den bosch", vorm: "cluster+plaats" },
  { term: "occasion kopen noord-brabant", vorm: "cluster+plaats" },
  { term: "zakelijke lease eindhoven", vorm: "cluster+plaats" },
  { term: "wagenparkbeheer eindhoven", vorm: "cluster+plaats" },
  { term: "occasion kopen", vorm: "cluster" },
  { term: "zakelijke lease", vorm: "cluster", nu: 68 },
  { term: "wagenparkbeheer", vorm: "cluster", nu: 30 },
  { term: "tweedehands auto kopen", vorm: "cluster" },
];

function inloggegevens(): string {
  const login = process.env.DATAFORSEO_LOGIN?.trim();
  const wachtwoord = process.env.DATAFORSEO_PASSWORD?.trim();
  if (!login || !wachtwoord) {
    console.error(
      "❌ DATAFORSEO_LOGIN of DATAFORSEO_PASSWORD ontbreekt. Zet ze in .env.local en probeer opnieuw.",
    );
    process.exit(1);
  }
  return Buffer.from(`${login}:${wachtwoord}`).toString("base64");
}

/** Wat elke aanroep werkelijk gekost heeft, opgeteld over het hele script. */
let uitgegeven = 0;

async function roep(
  auth: string,
  pad: string,
  body?: unknown,
): Promise<{ data: Record<string, unknown>; kosten: number }> {
  const res = await fetch(`${BASIS}${pad}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} op ${pad}`);
  const data = (await res.json()) as Record<string, unknown>;
  const kosten = Number(data.cost ?? 0);
  uitgegeven += kosten;
  return { data, kosten };
}

/** De eerste taak uit een respons, met zijn eigen statuscode. */
function eersteTaak(data: Record<string, unknown>): Record<string, unknown> | null {
  const taken = data.tasks as Record<string, unknown>[] | undefined;
  return taken && taken.length > 0 ? taken[0] : null;
}

// ── A. Bestaat Nederland in het AI-zoekvolume-endpoint? ─────────────────────

async function stapA(auth: string): Promise<boolean> {
  console.log("\n─── A. Landen en talen van het AI-zoekvolume (gratis) ───");
  const { data } = await roep(auth, "/ai_optimization/ai_keyword_data/locations_and_languages");
  const taak = eersteTaak(data);
  const resultaat = (taak?.result ?? []) as { location_name: string; available_languages: { language_name: string; language_code: string }[] }[];

  console.log(`Beschikbare landen: ${resultaat.length}`);
  const nl = resultaat.find((r) => r.location_name === LOCATIE);
  if (!nl) {
    console.log(`❌ ${LOCATIE} staat er NIET in. Het zoekvolume-voorstel valt hiermee om.`);
    return false;
  }
  const talen = nl.available_languages.map((t) => `${t.language_name} (${t.language_code})`);
  const heeftNederlands = nl.available_languages.some((t) => t.language_code === TAAL);
  console.log(`✅ ${LOCATIE} bestaat. Talen: ${talen.join(", ")}`);
  console.log(
    heeftNederlands
      ? "✅ Nederlands zit erbij."
      : "❌ Nederlands zit er NIET bij. Meten in een andere taal meet een ander land mee.",
  );
  return heeftNederlands;
}

// ── B. Welke modellen kunnen web search? ────────────────────────────────────

async function stapB(auth: string): Promise<{ chatgpt: string | null; gemini: string | null }> {
  console.log("\n─── B. Modellen met web search (gratis) ───");
  const uitkomst: { chatgpt: string | null; gemini: string | null } = { chatgpt: null, gemini: null };

  for (const platform of ["chat_gpt", "gemini"] as const) {
    const { data } = await roep(auth, `/ai_optimization/${platform}/llm_responses/models`);
    const taak = eersteTaak(data);
    const modellen = (taak?.result ?? []) as {
      model_name: string;
      web_search_supported: boolean;
      reasoning: boolean;
    }[];
    const metZoek = modellen.filter((m) => m.web_search_supported);
    console.log(`\n${platform}: ${modellen.length} modellen, ${metZoek.length} met web search.`);
    console.log(
      metZoek
        .slice(0, 15)
        .map((m) => `  • ${m.model_name}${m.reasoning ? " (redeneermodel)" : ""}`)
        .join("\n") || "  (geen)",
    );
    const gekozen = metZoek[0]?.model_name ?? null;
    if (platform === "chat_gpt") uitkomst.chatgpt = gekozen;
    else uitkomst.gemini = gekozen;
  }
  return uitkomst;
}

// ── C. Levert ai_search_volume iets op voor onze termen? ────────────────────

async function stapC(auth: string): Promise<void> {
  console.log("\n─── C. AI-zoekvolume op onze eigen termen (betaald) ───");
  const { data, kosten } = await roep(
    auth,
    "/ai_optimization/ai_keyword_data/keywords_search_volume/live",
    [
      {
        keywords: ZOEKTERMEN.map((z) => z.term),
        location_name: LOCATIE,
        language_code: TAAL,
      },
    ],
  );

  const taak = eersteTaak(data);
  if (Number(taak?.status_code) !== 20000) {
    console.log(`❌ Mislukt: ${taak?.status_code} ${taak?.status_message}`);
    return;
  }

  const items = ((taak?.result ?? []) as Record<string, unknown>[]).flatMap(
    (r) => (r.items ?? [r]) as Record<string, unknown>[],
  );
  const perTerm = new Map<string, Record<string, unknown>>();
  for (const it of items) perTerm.set(String(it.keyword ?? "").toLowerCase(), it);

  console.log(`Kosten van deze aanroep: $${kosten.toFixed(4)}\n`);
  console.log("vorm             | volume | huidige schatting | term");
  console.log("-----------------|--------|-------------------|------------------------------");
  const raak: Record<string, { met: number; totaal: number }> = {};
  for (const z of ZOEKTERMEN) {
    const it = perTerm.get(z.term.toLowerCase());
    const volume = it?.ai_search_volume as number | null | undefined;
    raak[z.vorm] ??= { met: 0, totaal: 0 };
    raak[z.vorm].totaal += 1;
    if (typeof volume === "number" && volume > 0) raak[z.vorm].met += 1;
    console.log(
      `${z.vorm.padEnd(16)} | ${String(volume ?? "null").padStart(6)} | ${String(z.nu ?? "-").padStart(17)} | ${z.term.slice(0, 60)}`,
    );
  }

  console.log("\nRaakpercentage per vorm:");
  for (const [vorm, telling] of Object.entries(raak)) {
    console.log(`  ${vorm.padEnd(16)} ${telling.met}/${telling.totaal}`);
  }

  // De twaalf maanden historie zijn de tweede belofte van dit endpoint: zonder
  // historie is er geen trend te tonen en blijft het een los getal.
  const eersteMetHistorie = items.find(
    (it) => Array.isArray(it.ai_monthly_searches) && (it.ai_monthly_searches as unknown[]).length > 0,
  );
  console.log(
    eersteMetHistorie
      ? `✅ Maandhistorie aanwezig: ${(eersteMetHistorie.ai_monthly_searches as unknown[]).length} maanden bij "${eersteMetHistorie.keyword}".`
      : "❌ Geen maandhistorie teruggekregen, dus geen trendlijn mogelijk.",
  );
}

// ── D. Wat kost en levert één meting via de twee nieuwe bronnen? ────────────

interface Meting {
  bron: string;
  vraag: string;
  gelukt: boolean;
  kosten: number;
  tekens: number;
  merkGenoemd: boolean;
  bronnen: number;
  zochtEchtOpWeb: boolean;
  melding: string;
}

async function meetEen(
  auth: string,
  platform: "chat_gpt" | "gemini",
  model: string,
  vraag: string,
): Promise<Meting> {
  // ⚠️ Gemini kent `web_search_country_iso_code` en `force_web_search` niet
  // (documentatie van 20 september 2026 nagelezen). Ze meesturen zou een fout
  // op de hele taak opleveren, dus alleen ChatGPT krijgt ze mee. Dat verschil
  // is precies wat dit script moet aantonen, niet iets om glad te strijken.
  const taakBody: Record<string, unknown> = {
    user_prompt: vraag,
    model_name: model,
    system_message: SIMULATE_SYSTEM,
    web_search: true,
    max_output_tokens: 2048,
  };
  if (platform === "chat_gpt") {
    taakBody.force_web_search = true;
    taakBody.web_search_country_iso_code = LAND_ISO;
  }

  try {
    const { data, kosten } = await roep(
      auth,
      `/ai_optimization/${platform}/llm_responses/live`,
      [taakBody],
    );
    const taak = eersteTaak(data);
    if (Number(taak?.status_code) !== 20000) {
      return {
        bron: platform,
        vraag,
        gelukt: false,
        kosten,
        tekens: 0,
        merkGenoemd: false,
        bronnen: 0,
        zochtEchtOpWeb: false,
        melding: `${taak?.status_code} ${taak?.status_message}`,
      };
    }

    const resultaat = ((taak?.result ?? []) as Record<string, unknown>[])[0] ?? {};
    const items = (resultaat.items ?? []) as Record<string, unknown>[];
    let tekst = "";
    let bronnen = 0;
    for (const item of items) {
      const bericht = item.message as Record<string, unknown> | undefined;
      const secties = (bericht?.sections ?? []) as Record<string, unknown>[];
      for (const sectie of secties) {
        tekst += String(sectie.text ?? "");
        const verwijzingen = sectie.annotations as unknown[] | null | undefined;
        if (Array.isArray(verwijzingen)) bronnen += verwijzingen.length;
      }
    }

    return {
      bron: platform,
      vraag,
      gelukt: tekst.length >= 40,
      kosten,
      tekens: tekst.length,
      merkGenoemd: tekst.toLowerCase().includes(MERK.toLowerCase()),
      bronnen,
      zochtEchtOpWeb: Boolean(resultaat.web_search),
      melding: tekst.length >= 40 ? "ok" : "antwoord te kort om een meting te zijn",
    };
  } catch (err) {
    return {
      bron: platform,
      vraag,
      gelukt: false,
      kosten: 0,
      tekens: 0,
      merkGenoemd: false,
      bronnen: 0,
      zochtEchtOpWeb: false,
      melding: err instanceof Error ? err.message : String(err),
    };
  }
}

async function stapD(
  auth: string,
  modellen: { chatgpt: string | null; gemini: string | null },
): Promise<void> {
  console.log("\n─── D. Vijf echte meetvragen via beide nieuwe bronnen (betaald) ───");

  const metingen: Meting[] = [];
  for (const [platform, model] of [
    ["chat_gpt", modellen.chatgpt],
    ["gemini", modellen.gemini],
  ] as const) {
    if (!model) {
      console.log(`⚠️ Geen model met web search gevonden voor ${platform}, overgeslagen.`);
      continue;
    }
    console.log(`\n${platform} op model ${model}:`);
    for (const vraag of MEETVRAGEN) {
      const m = await meetEen(auth, platform, model, vraag);
      metingen.push(m);
      console.log(
        `  ${m.gelukt ? "✅" : "❌"} $${m.kosten.toFixed(4)} | ${String(m.tekens).padStart(5)} tekens | ` +
          `${m.bronnen} bronnen | web:${m.zochtEchtOpWeb ? "ja" : "nee"} | ` +
          `merk:${m.merkGenoemd ? "GENOEMD" : "niet"} | ${m.vraag.slice(0, 45)}...` +
          (m.melding === "ok" ? "" : ` [${m.melding}]`),
      );
    }
  }

  console.log("\nSamenvatting per bron:");
  for (const platform of ["chat_gpt", "gemini"]) {
    const van = metingen.filter((m) => m.bron === platform);
    if (van.length === 0) continue;
    const gelukt = van.filter((m) => m.gelukt);
    const kosten = van.reduce((s, m) => s + m.kosten, 0);
    const gemiddeld = kosten / van.length;
    console.log(
      `  ${platform.padEnd(9)} ${gelukt.length}/${van.length} bruikbaar | ` +
        `$${gemiddeld.toFixed(4)} per meting | ` +
        `$${(gemiddeld * 30).toFixed(2)} per cluster van 30 vragen | ` +
        `merk genoemd bij ${van.filter((m) => m.merkGenoemd).length}/${van.length}`,
    );
  }

  // Het vergelijkingspunt, gemeten in `ai_calls` op deze zelfde clusters op
  // 20 september 2026: $0,017 per ChatGPT-meting via onze eigen route,
  // $0,0037 per Google AI Overview.
  console.log(
    "\nTer vergelijking, gemeten op productie: onze eigen ChatGPT-route $0,0170 per meting,\n" +
      "Google AI Overview $0,0037 per meting.",
  );
}

async function main() {
  const betaald = process.argv.includes("--betaald");
  const auth = inloggegevens();

  console.log("ORBIT ENGINE, verificatie DataForSEO AI Optimization");
  console.log(betaald ? `Modus: ook de betaalde stappen (verwacht ~$${VERWACHTE_KOSTEN_USD}).` : "Modus: alleen de gratis stappen. Voeg --betaald toe voor C en D.");

  const nederlandsKan = await stapA(auth);
  const modellen = await stapB(auth);

  if (betaald) {
    if (nederlandsKan) await stapC(auth);
    else console.log("\n─── C overgeslagen: zonder Nederlands is het cijfer betekenisloos. ───");
    await stapD(auth, modellen);
  }

  console.log(`\nTotaal afgeschreven bij DataForSEO: $${uitgegeven.toFixed(4)}`);
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
