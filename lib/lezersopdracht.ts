/**
 * DE LEZERSOPDRACHT: voor wie is deze pagina, met welk probleem, en welke
 * beslissing moet die persoon nemen? (V7 uit
 * `docs/tasks/contentkwaliteit-copywriterronde.md`)
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * De externe copywriter die op 3 september 2026 twaalf pagina's beoordeelde,
 * noemde dit zijn belangrijkste van drie aanbevelingen: "Schrijf vanuit de
 * situatie van de lezer. Omdat vrijwel alle andere problemen hieruit
 * voortkomen." Zijn regel 2: iedere pagina moet in één zin kunnen uitleggen
 * "deze pagina helpt [type persoon] die [probleem] heeft en [beslissing] moet
 * nemen".
 *
 * Nagerekend op diezelfde twaalf pagina's stond bij ACHT van de twaalf zowel
 * "Geen doelomschrijving vastgelegd" als "Er waren geen specifiek gemeten
 * vragen aan deze pagina gekoppeld", steeds allebei bij dezelfde acht. Zijn
 * hoofdpunt faalt dus niet bij het schrijven maar bij de invoer: de schrijver
 * kreeg bij twee derde van de pagina's geen lezer en geen vraag mee. Dat
 * verklaart ook zijn observatie dat de teksten "alle mogelijke lezers tegelijk"
 * bedienen: er was er geen aangewezen.
 *
 * ── DRIE BRONNEN, IN DEZE VOLGORDE ──────────────────────────────────────────
 *
 * 1. `klant`  De doelomschrijving uit de aanbeveling. Die komt uit het rapport
 *             en is het scherpst, want hij is voor DEZE pagina bedacht.
 * 2. `meting` Is die leeg, dan de zwaarste gemeten vraag. Minder scherp maar
 *             wel echt: iemand heeft die vraag daadwerkelijk aan een
 *             AI-assistent gesteld, en dat is een lezer met een probleem.
 * 3. `geen`   Allebei leeg. Dan is er geen lezer, en dat is precies de pagina
 *             die alles probeert te zeggen.
 *
 * Puur en zonder `server-only` (conventie 2): de schrijfprompt gebruikt hem als
 * opdracht, de inputpoort als oordeel, en `scripts/test-unit.ts` kan erbij.
 */

export type LezerBron = "klant" | "meting" | "geen";

export interface Lezersopdracht {
  /** De zin die de schrijver meekrijgt. `null` betekent: er is geen lezer. */
  zin: string | null;
  bron: LezerBron;
  /**
   * Noemt de opdracht een PERSOON, of alleen een onderwerp?
   *
   * "Mensen in Apeldoorn die vandaag hulp zoeken bij water door het dak" noemt
   * er een. "Bekkenfysiotherapie in Utrecht bij urineverlies" niet: dat is een
   * onderwerp met een plaatsnaam erachter. Allebei komen ze voor in de twaalf
   * pagina's van 3 september.
   *
   * Dit BLOKKEERT niet. Het is een signaal dat de schrijfprompt gebruikt om de
   * opdracht om te laten zetten naar een persoon, en dat de poort als
   * waarschuwing toont. Een halve opdracht is beter dan geen.
   */
  noemtPersoon: boolean;
  /**
   * Beschrijft de opdracht ook een SITUATIE, dus een probleem of een beslissing?
   * (optimalisatie 10)
   *
   * "Mensen die dakisolatie zoeken" noemt wel een persoon en geen situatie.
   * "Een huiseigenaar die merkt dat zijn huis moeilijk warm blijft en wil weten
   * of isoleren kan zonder de pannen te vervangen" noemt allebei.
   *
   * Dit BLOKKEERT niet, net als `noemtPersoon`. Het stuurt de promptregel die
   * het model vraagt de opdracht eerst af te maken, en het is de maat waarmee
   * de nulmeting "0 van 12 pagina's zonder lezer" pas iets zegt: een veld dat
   * gevuld is met een doelgroep is nog steeds geen lezer.
   */
  noemtSituatie: boolean;
}

/**
 * Onder dit aantal woorden is het geen opdracht maar een label.
 *
 * Vier, gekozen en niet gemeten: "Daklekkage Apeldoorn" (2) is een onderwerp,
 * "Bekkenfysiotherapie in Utrecht bij urineverlies, met of zonder verwijzing"
 * (9) is er net wel een. De grens ligt daartussen en er is geen reeks om hem op
 * te ijken, dus hij staat hier als constante om later bij te stellen, dezelfde
 * afspraak als bij `GOED_GENOEG` in `content-input-gate.ts`.
 */
export const MIN_WOORDEN = 4;

/**
 * Waarden die "ingevuld" lijken maar niets zeggen.
 *
 * Een model dat een verplicht tekstveld moet vullen en niets weet, schrijft
 * "onbekend". Dat is geen lezersopdracht en het mag er niet als een doorgaan.
 */
const LEGE_WAARDEN = new Set([
  "onbekend",
  "onbekend.",
  "n.v.t.",
  "nvt",
  "geen",
  "geen doel",
  "niet vastgelegd",
  "-",
  "?",
]);

/**
 * Woorden waaraan je een persoon herkent.
 *
 * Bewust een GESLOTEN lijst en geen slimmigheid: "alles wat op -ers eindigt"
 * haalt ook "voorrijkosten" binnen. De lijst is een startpunt en mag groeien
 * zodra een echte ronde laat zien wat er gemist wordt.
 */
const PERSOONSWOORDEN = [
  "iemand",
  "mensen",
  "wie ",
  "bezoeker",
  "klant",
  "lezer",
  "eigenaar",
  "eigenaren",
  "ondernemer",
  "particulier",
  "bewoner",
  "huurder",
  "patiënt",
  "patient",
  "sporter",
  "hardloper",
  "vrouw",
  "man ",
  "mannen",
  "ouder",
  "gezin",
  "doelgroep",
];

/** Woorden tellen, leestekens tellen niet mee. */
function woorden(tekst: string): number {
  return tekst.split(/\s+/).filter((w) => /[a-zA-Z0-9À-ÿ]/.test(w)).length;
}

/**
 * Woorden waaraan je een PROBLEEM of een BESLISSING herkent (optimalisatie 10).
 *
 * De vorm die de externe copywriter vroeg heeft drie delen: welk type persoon,
 * welk probleem, welke beslissing. `noemtPersoon` dekt het eerste deel;
 * hieronder staat de rest. Zonder deze controle haalde "mensen die dakisolatie
 * zoeken" de poort, en dat is precies het voorbeeld dat de AI-expert als
 * ONVOLDOENDE aanwees: een doelgroep met een onderwerp erachter, geen situatie.
 *
 * Ook hier een gesloten lijst, om dezelfde reden als bij `PERSOONSWOORDEN`.
 */
const SITUATIEWOORDEN = [
  "wil weten",
  "wil kiezen",
  "wil begrijpen",
  "wil laten",
  "moet ",
  "zoekt ",
  "zoeken naar",
  "twijfelt",
  "twijfelen",
  "vraagt zich af",
  "heeft last",
  "hebben last",
  "loopt vast",
  "komt erachter",
  "merkt dat",
  "merken dat",
  "overweegt",
  "beslist",
  "beslissen",
  "vergelijkt",
  "kan niet",
  "durft niet",
  "weet niet",
  "bang",
  "haast",
  "vandaag",
  "met spoed",
];

/** Beschrijft de zin een SITUATIE, of alleen een doelgroep? */
export function noemtSituatie(zin: string): boolean {
  const laag = ` ${zin.toLowerCase()} `;
  return SITUATIEWOORDEN.some((w) => laag.includes(w));
}

/** Staat er een persoon in de zin, of alleen een onderwerp? */
export function noemtPersoon(zin: string): boolean {
  const laag = ` ${zin.toLowerCase()} `;
  return PERSOONSWOORDEN.some((w) => laag.includes(w));
}

/**
 * Bepaal voor wie deze pagina geschreven wordt.
 *
 * `doelvragen` is de lijst gemeten vragen van de aanbeveling, zwaarste eerst
 * (zo levert `resolveTargets()` hem aan). Alleen de eerste wordt gebruikt: één
 * pagina, één lezer, dat is het hele punt.
 */
export function bepaalLezersopdracht(input: {
  targetIntent?: string | null;
  doelvragen?: readonly string[];
}): Lezersopdracht {
  const intent = (input.targetIntent ?? "").trim();

  const bruikbaar =
    intent.length > 0 &&
    !LEGE_WAARDEN.has(intent.toLowerCase()) &&
    woorden(intent) >= MIN_WOORDEN;

  if (bruikbaar) {
    return {
      zin: intent,
      bron: "klant",
      noemtPersoon: noemtPersoon(intent),
      noemtSituatie: noemtSituatie(intent),
    };
  }

  const vraag = (input.doelvragen ?? []).map((v) => (v ?? "").trim()).find(Boolean);
  if (vraag) {
    // De vraag zelf is het probleem, en "iemand die vraagt" is de persoon. Zo
    // levert ook deze bron een opdracht op die een persoon noemt, en dat is wat
    // de schrijver nodig heeft om bij een situatie te kunnen beginnen.
    return {
      zin: `Iemand die aan een AI-assistent vraagt: "${vraag}"`,
      bron: "meting",
      noemtPersoon: true,
      // De vraag zelf IS de situatie: iemand die hem stelt, wil iets weten.
      noemtSituatie: true,
    };
  }

  return { zin: null, bron: "geen", noemtPersoon: false, noemtSituatie: false };
}

/**
 * Het promptblok voor de schrijver.
 *
 * Staat bewust vóór het onderwerp en vóór het contract: wat bovenaan een prompt
 * staat wordt het best gevolgd, en dit is de zin die bepaalt wat er verderop
 * wel en niet in mag. Lege string bij `bron: "geen"`, want dan hoort er
 * helemaal niet geschreven te worden en zegt de poort dat al.
 */
export function lezersblok(opdracht: Lezersopdracht): string {
  if (!opdracht.zin) return "";

  const regels = [
    `DE LEZER VAN DEZE PAGINA. Schrijf voor deze ene persoon en voor niemand anders:`,
    opdracht.zin,
    "",
    "Begin de pagina bij de situatie van die persoon, niet bij het bedrijf en niet bij het " +
      "onderwerp. Alles wat hij op dit moment niet nodig heeft om zijn volgende stap te zetten, " +
      "laat je weg, ook als het klopt en ook als het op de feitenkaart staat.",
  ];

  if (opdracht.noemtPersoon && !opdracht.noemtSituatie) {
    // Wel een persoon, geen situatie (optimalisatie 10). "Mensen die dakisolatie
    // zoeken" is een doelgroep en geen lezer: er staat niet wat die persoon op
    // dit moment meemaakt of moet beslissen, en juist daar hoort de pagina te
    // beginnen.
    regels.push(
      "",
      "⚠️ Hierboven staat wel een type persoon, maar nog geen situatie. Bedenk eerst wat die " +
        "persoon op dit moment meemaakt, waar hij mee zit, en welke beslissing hij daarna moet " +
        "nemen. Schrijf pas daarna, en begin bij die situatie.",
    );
  }

  if (!opdracht.noemtPersoon) {
    // De opdracht is een onderwerp en geen persoon. Niet blokkeren, wel
    // vertalen: het model kan van "bekkenfysiotherapie bij urineverlies" wél
    // een lezer maken, het moet er alleen om gevraagd worden.
    regels.push(
      "",
      "⚠️ Hierboven staat een onderwerp en nog geen persoon. Bedenk eerst zelf wie er met dit " +
        "onderwerp op deze pagina komt, wat die persoon op dat moment voelt of probeert op te " +
        "lossen, en welke beslissing hij daarna moet nemen. Schrijf pas daarna.",
    );
  }

  return `\n${regels.join("\n")}`;
}
