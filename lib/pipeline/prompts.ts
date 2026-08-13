import "server-only";

/**
 * Halte 2, Prompt-generatie (abcplan.md §6 A2). Eén call per FUNNELFASE
 * (Oriëntatie/Overweging/Beslissing), quality-tier, geen web_search.
 *
 * ⚠️ Sinds 12 augustus 2026 is elke funnelfase een EIGEN TAAK en draaien ze niet
 * meer parallel binnen één taak. Reden: de gezamenlijke taak liep op productie
 * één keer 228 seconden van de 300 die hij heeft, en met de verdeling per
 * analyse instelbaar (migratie 0054) kan het aantal vragen omhoog. Drie taken
 * van ~76 seconden houdt ruimte over; één taak van 228 niet. Dat is ook
 * conventie 7: één taak doet hooguit één zware AI-aanroep.
 *
 * Het aantal per fase komt uit `lib/prompt-mix.ts`, standaard 10.
 *
 * KERNPRINCIPE (merk- én concurrent-neutraliteit): een gegenereerde prompt mag
 * NOOIT de eigen merknaam/het domein van de klant bevatten, en ook GEEN
 * concurrerend bedrijf uit de concurrentenlijst. Anders is een vermelding
 * gegarandeerd (de naam staat immers al in de vraag) en meet de prompt niets,
 * het vervuilt de zichtbaarheid/share-of-voice. De meting moet SPONTANE
 * vermeldingen meten: wat vraagt iemand die de merken NOG NIET kent? Generieke
 * productmerken/categorieën (bv. "Nike-schoenen") mogen wél. Die staan niet in
 * de concurrentenlijst en zijn geen concurrerend bedrijf van de klant.
 */
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { PromptSet, VolumeCalibration } from "@/lib/schemas/prompts";
import type { PromptIntentType, PromptSpecificity } from "@/lib/types/database";
import {
  isLokaal,
  geoBalance,
  containsRegion,
  droppableIndices,
  REGIO_DREMPEL,
} from "@/lib/pipeline/geo-share";

/**
 * Vaste ijkpunten voor elke zoekvolumeschatting, in deze stap én in de
 * profielbrede herkalibratie (`lib/pipeline/search-demand.ts`).
 *
 * Zonder ankers is "gebruik de volle schaal 0-100" een schaal die bij elke
 * aanroep opnieuw wordt uitgevonden: twee losse aanroepen kunnen allebei hun
 * eigen zwaarste vraag dicht bij 100 leggen, ook als de één in werkelijkheid
 * tien keer zo vaak gezocht wordt als de ander. Dezelfde vier voorbeelden in
 * elke aanroep geven het nulpunt en het maximum een vaste, herkenbare
 * betekenis (docs/tasks/potentiescore.md §2).
 */
export const SEARCH_VOLUME_ANCHORS =
  "Gebruik deze vaste ijkpunten om de schaal steeds hetzelfde te laten betekenen, ook al gaat dit " +
  "keer over een heel andere markt:\n" +
  "- 95-100: \"wasmachine kopen\", een aankoop die vrijwel elk huishouden ooit doet.\n" +
  "- 70-80: \"beste hypotheekadviseur in [regio]\", een brede, veelgezochte dienst binnen één regio.\n" +
  "- 40-50: \"dry needling bij een frozen shoulder\", een specifieke behandelvraag binnen één vakgebied.\n" +
  "- 5-15: een sterk technische of zeer smalle B2B-vraag die alleen specialisten stellen.";

/** Korte, sturende omschrijving per FUNNELFASE: merk- én concurrent-neutraal. */
const CATEGORY_BRIEF: Record<string, string> = {
  Oriëntatie:
    "AWARENESS: brede oriëntatievragen van iemand die zich net op het onderwerp inleest en nog geen aanbieder kent " +
    "(bv. 'Waar moet ik op letten bij het kiezen van X?').",
  Overweging:
    "CONSIDERATION: vragen waarin iemand opties/aanpakken/type-aanbieders vergelijkt vóór een aankoop, ZONDER een merk " +
    "of bedrijf te noemen (bv. 'Ketenzaak of zelfstandige specialist: wat is beter voor X?').",
  Beslissing:
    "DECISION: vragen van iemand die klaar is om te kiezen/kopen/boeken (bv. 'Waar koop ik X in [plaats]?', " +
    "'Welke X-specialist is aan te raden?'), nog steeds zonder een concurrerend bedrijf bij naam te noemen.",
};

export interface BrandContext {
  brandName: string | null;
  industry: string | null;
  products: string[];
  competitors: string[];
  toneOfVoice: string | null;
  summary: string | null;
  /** Werkgebied & markt (§12.24), sturen lokale/marktgerichte prompts. */
  serviceScope?: string | null;
  serviceRegions?: string[];
  marketLanguage?: string | null;
}

export interface GeneratedPrompt {
  text: string;
  category: string; // funnelfase
  intent: string;
  intentType: PromptIntentType;
  specificity: PromptSpecificity;
  purchaseIntent: boolean;
  cluster: string;
  volumeEstimate: number;
  sourceRawJson: unknown;
}

/**
 * Bouwt de lijst met "verboden" tokens: de canonieke merknaam, het domein-label
 * (zonder TLD) én elke concurrent uit de concurrentenlijst. Deze mogen niet in
 * een prompt voorkomen. We houden het op DISTINCTIEVE tokens (lengte > 3) om te
 * voorkomen dat we legitieme categoriewoorden wegfilteren. Generieke productmerken
 * staan NIET in de concurrentenlijst en blijven dus toegestaan.
 */
function forbiddenTokens(url: string, brandName: string | null, competitors: string[]): string[] {
  const tokens: string[] = [];
  const domainLabel = url.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[./]/)[0];
  if (domainLabel && domainLabel.length > 3) tokens.push(domainLabel.toLowerCase());
  if (brandName && brandName.trim().length > 2) tokens.push(brandName.trim().toLowerCase());
  for (const c of competitors) {
    const t = c.trim().toLowerCase();
    // Een concurrentnaam die zélf een gewoon categoriewoord is (bv. een bedrijf
    // dat letterlijk "Select" of "Direct" heet) filteren we niet: dan zouden we
    // elke legitieme prompt met dat woord wegwerpen (optimalisatie.md 0.9).
    if (t.length > 3 && !GENERIC_WORDS.has(t)) tokens.push(t);
  }
  return Array.from(new Set(tokens));
}

/**
 * Woorden die weliswaar in een merknaam kunnen zitten, maar op zichzelf gewone
 * categoriewoorden zijn (optimalisatie.md 0.9). Zonder deze uitzondering wist
 * een concurrent als "Zonwering Plus" élke prompt over zonwering. Precies de
 * prompts die we willen meten.
 *
 * Alleen van toepassing op LOSSE woorden uit een meerwoordige naam; de volledige
 * naam ("Zonwering Plus") blijft altijd verboden.
 */
const GENERIC_WORDS = new Set([
  "service", "diensten", "dienst", "groep", "totaal", "centrum", "center", "shop",
  "winkel", "store", "online", "expert", "experts", "specialist", "specialisten",
  "advies", "adviseur", "partners", "partner", "company", "bedrijf", "nederland",
  "holland", "plus", "prof", "profs", "vakman", "vakmannen", "beste", "goedkoop",
  "snel", "direct", "team", "groep bv", "concept", "concepten", "select",
]);

/**
 * Bevat de prompt een verboden merk-/concurrentnaam? Match op HELE WOORDEN
 * (optimalisatie.md 0.9), niet op deelreeksen: de oude `includes()` liet een
 * merk als "Snelservice" elke prompt met het woord "snelservice" wissen, en erger,
 * een deelwoord kon midden in een ander woord matchen.
 */
function containsForbidden(text: string, tokens: string[]): boolean {
  const lower = text.toLowerCase();
  return tokens.some((t) => {
    // Escape regex-tekens in de merknaam (bv. "AH to go" of "M&S").
    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // \b werkt niet betrouwbaar rond niet-ASCII; daarom expliciete grenzen op
    // niet-woordtekens of tekstbegin/-einde.
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, "iu").test(lower);
  });
}

/**
 * Hoeveel pogingen mag één funnelfase doen om aan het gevraagde aantal prompts
 * te komen (optimalisatie.md 0.8)?
 *
 * Stond op twee: één normale ronde plus één aanvulronde, met als redenering dat
 * bij een merknaam die samenvalt met de categorie het aanvullen niet de
 * oplossing is maar de merknaam het probleem. Die redenering klopt, maar de
 * grens lag te laag voor een merk dat zijn eigen categorie definieert.
 *
 * Gemeten bij Swapfiets op 1 augustus 2026, onderwerp "fietsabonnement":
 * Oriëntatie leverde 2 van de 10 vragen op, 80% sneuvelde omdat het model in
 * een brede oriëntatievraag over fietsabonnementen vanzelf de marktleider
 * noemt, en dat is precies de klant. Overweging en Beslissing haalden allebei
 * gewoon 10. De klant zag alleen "22 actief van 22" en had geen enkele
 * aanwijzing dat een hele funnelfase vrijwel leeg was.
 *
 * Drie is geen "eindeloos doorgaan": het is één extra mini-aanroep zonder
 * web_search (fracties van een cent), en alleen in het geval dat er anders
 * daadwerkelijk vragen ontbreken.
 */
const MAX_TOPUP_ATTEMPTS = 3;

/**
 * Aanvullende instructie voor een vervolgronde.
 *
 * Zei eerder alleen "er ontbreken er nog N, herhaal deze niet". Daarmee wist het
 * model niet WAAROM zijn vorige vragen sneuvelden, het kreeg een lijst met
 * geaccepteerde vragen te zien en concludeerde daaruit niets over de merkregel.
 * Nu staat de reden er expliciet bij, met de namen die het niet mag gebruiken.
 */
/**
 * De bijvulronde die specifiek om REGIONALE vragen vraagt.
 *
 * ⚠️ Apart van `topUpNote`, met opzet. Die legt uit waarom er vragen sneuvelden
 * op de merknaamregel; deze legt uit dat er te weinig plaatsnamen in zaten. Twee
 * verschillende redenen in één melding maakt allebei de instructies vager, en
 * het model volgt dan geen van beide goed.
 */
function geoTopUpNote(missing: number, regions: string[], existing: string[]): string {
  return (
    `AANVULLING: geef er precies ${missing}, en in ELKE vraag moet een van deze plaatsen of de ` +
    `provincie voorkomen: ${regions.join(", ")}.\n` +
    `WAAROM: dit bedrijf werkt uitsluitend in dit gebied. Een vraag zonder plaatsnaam gaat over heel ` +
    `Nederland, en daar concurreert dit bedrijf niet. Schrijf ze zoals een zoeker uit die streek ze ` +
    `stelt: "welke ... in ${regions[0]}", "waar kan ik in ${regions[0]} terecht voor ...".\n` +
    `⚠️ Plak de plaats niet achter een informatieve vraag. De vraag hoort te gaan over het VINDEN, ` +
    `KIEZEN of INSCHAKELEN van een aanbieder in die streek, of over iets dat per streek verschilt. ` +
    `Een geforceerde vraag levert een algemeen antwoord op waarin geen enkel bedrijf genoemd wordt.\n` +
    `Herhaal NIET de vragen die er al zijn:\n${existing.map((t) => `- ${t}`).join("\n")}`
  );
}

function topUpNote(missing: number, existing: string[], verboden: string[]): string {
  const namen = verboden.length ? verboden.join(", ") : "de eigen merknaam";
  return (
    `AANVULLING: er ontbreken er nog ${missing}. Geef er precies ${missing}.\n` +
    `WAAROM ER VRAGEN ONTBREKEN: de vorige ronde bevatte vragen waarin een bedrijfsnaam voorkwam. ` +
    `Die zijn weggegooid. Noem in deze ronde dus GEEN van deze namen, in geen enkele vorm: ${namen}. ` +
    `Ook niet als het bedrijf het meest voor de hand liggende antwoord op de vraag is. Schrijf de ` +
    `vraag zoals iemand die het bedrijf nog niet kent 'm zou stellen.\n` +
    `Herhaal NIET de vragen die er al zijn:\n${existing.map((t) => `- ${t}`).join("\n")}`
  );
}

function geoLine(brand: BrandContext): string {
  const parts: string[] = [];
  if (brand.serviceScope) parts.push(`bereik: ${brand.serviceScope}`);
  if (brand.serviceRegions?.length) parts.push(`regio's: ${brand.serviceRegions.join(", ")}`);
  if (brand.marketLanguage) parts.push(`markt: ${brand.marketLanguage}`);
  return parts.length ? `Werkgebied & markt: ${parts.join("; ")}\n` : "";
}

function buildContextBlock(url: string, topic: string, brand: BrandContext): string {
  return (
    `Website: ${url}\n` +
    (brand.brandName ? `Eigen merknaam (NIET in prompts gebruiken): ${brand.brandName}\n` : "") +
    `Onderwerp/scope: ${topic}\n` +
    `Branche: ${brand.industry ?? "onbekend"}\n` +
    `Producten/diensten: ${brand.products.join(", ") || "onbekend"}\n` +
    `Concurrerende bedrijven (NOOIT bij naam noemen in een vraag): ${brand.competitors.join(", ") || "(geen bekend)"}\n` +
    geoLine(brand) +
    `Samenvatting: ${brand.summary ?? ""}`
  );
}

async function generateForFunnelStage(args: {
  category: string;
  analysisId: string;
  url: string;
  topic: string;
  brand: BrandContext;
  count: number;
  tokens: string[];
  contentBrief?: string | null;
}): Promise<GeneratedPrompt[]> {
  const { category, analysisId, url, topic, brand, count, tokens, contentBrief } = args;

  const scopeRule = `Alle prompts gaan UITSLUITEND over "${topic}" binnen deze branche.`;

  // Content-brief van de klant (§6/§7/§8): stuurt de vragen naar de gewenste hoek en doelgroep.
  const briefRule = contentBrief?.trim()
    ? `GEWENSTE HOEK/DOELGROEP (van de klant): ${contentBrief.trim()}. Laat de gegenereerde vragen deze ` +
      `hoek en doelgroep weerspiegelen. Schrijf de vragen zoals díe specifieke zoeker ze zou stellen.`
    : "";

  // Lokaal bereik met bekende regio's → laat de vragen (deels) een plaatsnaam
  // bevatten, zoals een echte lokale zoeker die zou stellen (§12.24).
  // ⚠️ "Een deel" leverde 38% op bij Van den Udenhout, en de metingen lieten zien
  // dat élke vermelding uit een regionale vraag kwam (zie lib/pipeline/geo-share.ts).
  // Nu staat er een AANTAL in plaats van "een deel", en er staat een
  // deterministisch vangnet achter dat bijvult als het model het niet haalt.
  const geoNodig = isLokaal(brand.serviceScope, brand.serviceRegions)
    ? Math.ceil(count * REGIO_DREMPEL)
    : 0;
  // ⚠️ De tweede alinea komt uit de generale repetitie op `gasservice-brabant.nl`
  // (12 augustus 2026). De eerste versie haalde 30 van de 30 regionaal, maar
  // vier vragen waren geforceerd, allemaal in de oriëntatiefase: "Heeft
  // regelmatig onderhoud invloed op de levensduur van een cv-ketel in Den
  // Bosch?" De levensduur van een ketel heeft niets met Den Bosch te maken, en
  // zo'n vraag stelt niemand. Een AI-assistent antwoordt er algemeen op en
  // noemt geen enkel bedrijf, dus de vraag meet niets en drukt de score.
  //
  // Het probleem was niet de drempel maar wát het model met de plaats deed: het
  // plakte hem achter een informatieve vraag in plaats van de vraag óm te
  // bouwen naar het zoeken van een aanbieder. Vandaar de expliciete
  // tegenvoorbeelden. Dit blijft een intentie (conventie 1); het vangnet
  // eronder telt of er een plaats in staat, niet of de vraag natuurlijk klinkt.
  // Dat laatste is niet deterministisch te meten, en dat hoort hier te staan in
  // plaats van gesuggereerd te worden.
  const geoRule =
    geoNodig > 0
      ? `Dit is een LOKAAL bedrijf dat uitsluitend werkt in: ${brand.serviceRegions!.join(", ")}. ` +
        `ALLE ${count} vragen moeten een van deze plaatsen of de provincie bevatten, ` +
        `zoals een zoeker uit die streek ze stelt. Een vraag zonder plaats gaat over heel Nederland, en ` +
        `daar concurreert dit bedrijf niet.\n` +
        `⚠️ De plaats moet de vraag ECHT lokaal maken, niet er los achter geplakt worden. Een vraag ` +
        `hoort te gaan over het VINDEN, KIEZEN of INSCHAKELEN van een aanbieder in die streek, of over ` +
        `iets dat per streek verschilt (prijzen, beschikbaarheid, hoe snel iemand kan komen).\n` +
        `FOUT: "Heeft regelmatig onderhoud invloed op de levensduur van een cv-ketel in Den Bosch?" ` +
        `(de levensduur is overal hetzelfde, niemand stelt deze vraag zo).\n` +
        `GOED: "Welke installateur in Den Bosch kan beoordelen of mijn cv-ketel aan vervanging toe is?"\n` +
        `Kun je een vraag niet natuurlijk lokaal maken, bedenk dan een andere vraag. Een geforceerde ` +
        `vraag levert een algemeen antwoord op waarin geen enkel bedrijf genoemd wordt, en meet dus niets.`
      : "";

  const neutralityRule =
    `HARDE REGEL: gebruik NOOIT de eigen merknaam${brand.brandName ? ` ("${brand.brandName}")` : ""} of het domein van de klant, ` +
    `en noem ook NOOIT een concurrerend bedrijf bij naam${brand.competitors.length ? ` (zoals: ${brand.competitors.join(", ")})` : ""}. ` +
    `Generieke productmerken of -categorieën (bv. "Nike-schoenen") mag je WÉL gebruiken. ` +
    `Schrijf de vraag zoals iemand die deze bedrijven NOG NIET kent 'm zou stellen. Een prompt met een eigen of concurrent-bedrijfsnaam is ONGELDIG.`;

  const system =
    `Je bedenkt realistische vragen ("prompts") die een echte koper aan een AI-assistent zoals ChatGPT stelt. ` +
    `Schrijf natuurlijke, gesproken vragen, geen losse zoekwoorden. Varieer in toon en specificiteit. Nederlands. ` +
    neutralityRule;

  const user =
    `${buildContextBlock(url, topic, brand)}\n\n` +
    (briefRule ? `${briefRule}\n\n` : "") +
    `Genereer precies ${count} prompts voor de FUNNELFASE "${category}": ${CATEGORY_BRIEF[category] ?? ""}\n` +
    `${scopeRule}\n${geoRule ? `${geoRule}\n` : ""}${neutralityRule}\n` +
    `Geef per prompt mee: de onderliggende intentie (job-to-be-done); intentType ` +
    `(informational/commercial/transactional); specificity (head = korte brede vraag, long_tail = lange specifieke vraag); ` +
    `purchaseIntent (koopintentie waar of onwaar); cluster (kort thema-label); en volumeEstimate: jouw SCHATTING van hoe ` +
    `populair deze vraag is op een schaal 0-100 (0 = zeer specifiek/zelden, 100 = zeer populair/breed). Dit is een schatting, geen echte index.`;

  // Vangnet: gooi prompts weg die tóch de eigen merknaam of een concurrent
  // bevatten. Wordt er iets weggegooid, dan VULLEN WE AAN (optimalisatie.md 0.8):
  // eerder leverde `.slice(0, count)` na het filteren stilzwijgend minder prompts
  // op, waardoor de meetbasis kromp zonder dat iemand het zag, en een kleinere
  // meetbasis betekent een grovere, minder betrouwbare score.
  const collected: PromptSet["prompts"] = [];
  const seen = new Set<string>();
  let lastRaw: unknown = null;

  for (let attempt = 0; attempt < MAX_TOPUP_ATTEMPTS && collected.length < count; attempt++) {
    const missing = count - collected.length;
    const result = await callStructured({
      model: MODELS.quality,
      system,
      // Bij een vervolgpoging vragen we alleen nog het ontbrekende aantal, en
      // zeggen we welke vragen er al zijn zodat het model niet in herhaling valt.
      user:
        attempt === 0
          ? user
          : `${user}\n\n${topUpNote(missing, collected.map((p) => p.text), tokens)}`,
      schema: PromptSet,
      schemaName: "prompt_set",
      webSearch: false,
      work: "creative",
      meta: { kind: "prompts", analysisId: args.analysisId },
    });
    lastRaw = result.raw;

    for (const p of result.parsed.prompts) {
      if (collected.length >= count) break;
      const key = p.text.trim().toLowerCase();
      if (seen.has(key)) continue;
      if (containsForbidden(p.text, tokens)) continue;
      seen.add(key);
      collected.push(p);
    }
  }

  if (collected.length < count) {
    console.warn(
      `Funnelfase "${category}": ${collected.length} van ${count} prompts na ` +
        `${MAX_TOPUP_ATTEMPTS} pogingen. De rest sneuvelde op de merkneutraliteitsregel ` +
        `(verboden namen: ${tokens.join(", ")}).`,
    );
  }

  // ── Het regionale vangnet (conventie 1) ───────────────────────────────────
  //
  // De instructie hierboven vraagt om een aantal; deze lus garandeert het. Zonder
  // dit haalde het model 38% waar 70% nodig is, en dan meet twee derde van het
  // budget vragen die dit bedrijf structureel niet kan winnen.
  const regios = brand.serviceRegions ?? [];
  if (geoNodig > 0 && collected.length > 0) {
    for (let ronde = 0; ronde < MAX_TOPUP_ATTEMPTS; ronde++) {
      const balans = geoBalance(collected.map((p) => p.text), regios, collected.length);
      if (balans.tekort === 0) break;

      const result = await callStructured({
        model: MODELS.quality,
        system,
        user: `${user}\n\n${geoTopUpNote(balans.tekort, regios, collected.map((p) => p.text))}`,
        schema: PromptSet,
        schemaName: "prompt_set",
        webSearch: false,
        work: "creative",
        meta: { kind: "prompts", analysisId: args.analysisId },
      });
      lastRaw = result.raw;

      const nieuw = result.parsed.prompts.filter((p) => {
        const key = p.text.trim().toLowerCase();
        if (seen.has(key)) return false;
        if (containsForbidden(p.text, tokens)) return false;
        // Alleen wat écht regionaal is telt mee; anders vervangt de bijvulronde
        // een landelijke vraag door een andere landelijke vraag.
        if (!containsRegion(p.text, regios)) return false;
        seen.add(key);
        return true;
      });
      if (nieuw.length === 0) break; // het model komt er niet uit, niet blijven betalen

      // Een regionale vraag erbij betekent een landelijke eruit: het aantal ligt
      // vast, want het bepaalt de meetkosten en de noemer van de score.
      //
      // ⚠️ Er wordt er nooit méér ingeruild dan er landelijke vragen zijn. De
      // eerdere vorm (`nieuw.slice(0, weg.length || nieuw.length)`) duwde bij nul
      // ruilbare vragen de hele nieuwe lading erin en kapte daarna de staart af
      // met `collected.length = count`, precies de zojuist toegevoegde regionale
      // vragen. Bij drempel 1.0 is dat pad onbereikbaar (geen tekort betekent
      // geen landelijke vraag), maar het zou terugkomen zodra de drempel ooit
      // lager gezet wordt, en dan stil.
      const weg = droppableIndices(collected.map((p) => p.text), regios, nieuw.length);
      if (weg.length === 0) break;
      for (const i of weg) collected.splice(i, 1);
      collected.push(...nieuw.slice(0, weg.length));
    }

    // ⚠️ WAT ER OVERBLIJFT GAAT ERUIT, en dat is de kern van deze regel.
    //
    // Een score is een aandeel: in hoeveel van de gemeten vragen word je
    // genoemd. Laat je bij een lokaal merk één landelijke vraag staan, dan telt
    // die mee in de noemer terwijl hij per definitie verloren is, en dan is het
    // getal niet "iets te laag" maar onwaar. Liever een kleinere set die klopt:
    // de onzekerheidsband wordt breder bij minder vragen, en dat is eerlijk
    // zichtbaar (`lib/stats/uncertainty.ts`) in plaats van verborgen.
    //
    // Het scheelt bovendien geld: elke geschrapte vraag is een betaalde
    // web_search minder, en web_search is ~94% van de meetkosten.
    const landelijk = droppableIndices(collected.map((p) => p.text), regios, collected.length);
    if (landelijk.length > 0) {
      for (const i of landelijk) collected.splice(i, 1);
      console.warn(
        `Funnelfase "${category}": ${landelijk.length} landelijke vragen geschrapt na ` +
          `${MAX_TOPUP_ATTEMPTS} bijvulrondes; ${collected.length} regionale vragen over. ` +
          `Regio's: ${regios.join(", ")}.`,
      );
    }
  }

  return collected
    .map((p) => ({
      text: p.text,
      category,
      intent: p.intent,
      intentType: p.intentType,
      specificity: p.specificity,
      purchaseIntent: p.purchaseIntent,
      cluster: p.cluster,
      volumeEstimate: 50, // voorlopig; wordt relatief gekalibreerd over alle prompts (zie calibrateVolumes)
      sourceRawJson: lastRaw, // audit-trail per fase (abcplan.md §5)
    }));
}

/**
 * Kalibreert het geschatte zoekvolume RELATIEF over alle prompts van de analyse
 * in één call (abcplan.md §6 A2), consistenter dan losse per-prompt-schattingen.
 * Geeft per prompt een 0-100-waarde terug (op input-volgorde). Faalt de call,
 * dan vallen we terug op een neutrale 50 (blokkeert de analyse niet).
 *
 * We vragen nog steeds de volle schaal, want de RANGORDE die het model daarmee
 * aanbrengt is echte informatie: deze vraag is breder dan die. Alleen overleeft
 * dat getal de opslag niet als getal, prepare.ts zet het om in een band
 * (hoog/midden/laag) en alleen die band weegt en verschijnt in de UI
 * (optimalisatie.md 2.6). De ruwe waarde blijft als audit-trail in
 * `volume_estimate` staan.
 */
export async function calibrateVolumes(texts: string[], analysisId: string): Promise<number[]> {
  if (texts.length === 0) return [];
  const numbered = texts.map((t, i) => `${i + 1}. ${t}`).join("\n");
  try {
    const result = await callStructured({
      model: MODELS.quality,
      system:
        "Je bent een zoekgedrag-analist. Schat hoe vaak elke onderstaande vraag door echte mensen aan een " +
        "AI-assistent/zoekmachine gesteld wordt, RELATIEF ten opzichte van elkaar. Gebruik de VOLLE schaal 0-100: " +
        "de meest gezochte, brede vragen richting 100, de meest specifieke/niche-vragen richting 0-10. Dit is een " +
        "schatting, geen echte index. Antwoord voor ELKE vraag met haar nummer (index) en een volume 0-100.\n\n" +
        SEARCH_VOLUME_ANCHORS,
      user: `Vragen:\n${numbered}`,
      schema: VolumeCalibration,
      schemaName: "volume_calibration",
      webSearch: false,
      // ⚠️ Was `analytical` (effort `low`) tot 13 augustus. Deze schatting voedt
      // sinds `lib/pipeline/search-demand.ts` ook de potentiescore die de klant
      // rechtstreeks ziet, dus verdient dezelfde redeneerinspanning als het
      // schrijven zelf, niet die van een classificatietaak.
      work: "content",
      meta: { kind: "volume_calibration", analysisId },
    });
    const byIndex = new Map<number, number>();
    for (const w of result.parsed.weights) {
      byIndex.set(Math.round(w.index), Math.max(0, Math.min(100, Math.round(w.volume))));
    }
    return texts.map((_, i) => byIndex.get(i + 1) ?? 50);
  } catch {
    return texts.map(() => 50);
  }
}

/**
 * Vuurt alle funnelfase-calls parallel af (geen onderlinge afhankelijkheid) en
 * bundelt het resultaat. Faalt één fase, dan faalt de hele batch, de
 * orchestratie (prepare.ts) markeert de analyse dan als 'mislukt' met retry.
 *
 * De volume-kalibratie zit hier BEWUST niet meer in. Elke funnelfase kan tot
 * MAX_TOPUP_ATTEMPTS aanroepen achter elkaar doen (vragen die de merknaam
 * bevatten worden weggegooid en bijgevuld), en met de kalibratie erachteraan
 * werden dat drie ronden in één taak, te veel voor de zestig seconden van één
 * werker-aanroep. De prompts krijgen hier een neutrale 50 mee; de losse taak
 * `calibrate_volumes` verfijnt dat daarna. Blijft die achterwege, dan is 50
 * precies de terugvalwaarde die deze functie bij een mislukte kalibratie ook al
 * gebruikte, de analyse werkt dus gewoon door.
 */
export async function generatePromptsForStage(args: {
  /** Voor de kostenregistratie (optimalisatie.md 0.6). */
  analysisId: string;
  url: string;
  topic: string;
  brand: BrandContext;
  contentBrief?: string | null;
  /** Welke funnelfase deze taak doet. */
  category: string;
  /** Hoeveel vragen deze fase moet opleveren (migratie 0054, per analyse). */
  count: number;
}): Promise<GeneratedPrompt[]> {
  // Nul is een geldige keuze: een lokale ondernemer die alleen op koopmomenten
  // beoordeeld wil worden, zet de oriëntatiefase op nul. Dan is er niets te
  // genereren en ook niets mis.
  if (args.count === 0) return [];

  const tokens = forbiddenTokens(args.url, args.brand.brandName, args.brand.competitors);
  const prompts = await generateForFunnelStage({ ...args, tokens });

  // Zonder vragen is er niets te meten, en een analyse die daar tóch mee
  // doorloopt komt nooit meer verder: de meting plant nul taken in, dus de
  // aggregatie en het rapport worden nooit afgetrapt en de klant kijkt naar een
  // voortgangsscherm dat eeuwig draait. Liever hier eerlijk falen, de wachtrij
  // probeert het opnieuw, en lukt het dan nog niet, dan ziet de klant een
  // fout met een retry-knop in plaats van stilstand.
  //
  // ⚠️ Alleen falen als er om vragen GEVRAAGD is. Sinds de verdeling per analyse
  // instelbaar is (migratie 0054) kan een fase legitiem nul opleveren, en dan is
  // een lege uitkomst geen storing maar de bedoeling.
  if (prompts.length === 0) {
    throw new Error(
      `Promptgeneratie leverde geen enkele bruikbare vraag op voor de fase "${args.category}". ` +
        "Meestal komt dat doordat de merk- of concurrentnaam samenvalt met de categoriewoorden " +
        "van het onderwerp.",
    );
  }

  return prompts;
}
