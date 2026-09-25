/**
 * Welke zinnen in een geschreven pagina zijn een BEWERING?
 * (strategie-contentkwaliteit-vervolgstappen.md S3)
 *
 * ── WAAROM DE CODE DIT MOET BEPALEN, EN NIET HET MODEL ──────────────────────
 *
 * `source_coverage` was het percentage van `claims_json` dat standhield tegen de
 * feitenkaart. Maar `claims_json` wordt door het SCHRIJVENDE model zelf
 * samengesteld: het bepaalt welke zinnen als bewering tellen. Gemeten over de
 * tien pagina's van 31 juli:
 *
 *   4.470 woorden · ~250 zinnen · 49 getagde beweringen
 *
 * Ongeveer één op de vijf zinnen werd gemeten. De andere vier vijfde waren
 * onzichtbaar voor élke controle die dit systeem heeft, en dat is precies waar
 * de twee ergste vondsten van de contentronde in verdwenen:
 *
 *   • Van der Valk: "Op valk.com zoekt en vergelijkt u snel alle opties…
 *     reserveer direct online." Aantoonbaar onjuist (er is geen boekingsmodule),
 *     niet getagd, dus source_coverage 100.
 *   • Fysi-Unique: de openingszin beweerde "biedt preventieve begeleiding",
 *     terwijl het bevestigde antwoord "nee" was. Niet getagd.
 *
 * Een cijfer waarvan de gemeten partij de noemer kiest, is geen meting. Dit is
 * de werkafspraak "een promptinstructie is een intentie, code is een garantie",
 * toegepast op de meetlat zelf.
 *
 * ── VALS-POSITIEVEN ZIJN GOEDKOPER DAN VALS-NEGATIEVEN ──────────────────────
 *
 * Deze regels zullen zinnen aanmerken die geen echte bewering zijn. Dat kost de
 * klant een regel in `review_notes`. Een gemiste fabricage kost hem zijn
 * geloofwaardigheid. Bij twijfel dus: kandidaat.
 *
 * Bewust ZONDER `server-only`: pure tekstanalyse, testbaar in een kaal script.
 */
import { splitSentences, stripMarkdown } from "@/lib/pipeline/sentences";
import { isSupported, normalizeForQuote, type FactItem, type WrittenClaim } from "@/lib/pipeline/factcard";

/** Waaróm deze zin als bewering geldt. Gaat mee naar `review_notes`. */
export type ClaimSignal = "merknaam" | "getal" | "toezegging" | "keurmerk";

export interface DetectedClaim {
  /** De zin zoals hij in de tekst staat, zonder markdown-opmaak. */
  sentence: string;
  signal: ClaimSignal;
}

/**
 * Werkwoorden en wendingen waarmee een pagina iets TOEZEGT.
 *
 * Deze lijst is niet bedacht maar afgelezen van de tien testpagina's: dit zijn
 * de woorden waarmee de onbewaakte marketingzinnen begonnen. "Reserveer direct
 * online" (Van der Valk) valt onder `reserveer`, "Fysi-Unique biedt preventieve
 * begeleiding" onder `biedt`.
 */
const TOEZEGGINGEN = [
  "biedt", "bieden", "levert", "leveren", "garandeert", "garanderen", "verzorgt",
  "verzorgen", "regelt", "regelen", "inbegrepen", "inclusief", "beschikbaar",
  "mogelijk", "kunt u", "kun je", "kunt je", "krijg je", "krijgt u", "ontvang je",
  "ontvangt u", "reserveer", "bestel", "boek je", "boekt u", "altijd", "binnen",
  "gratis", "zonder afspraak", "dezelfde dag", "wij zorgen", "we zorgen",
];

/**
 * Cijfers, bedragen, percentages, jaartallen, tijden.
 *
 * Een los cijfer is genoeg signaal: elk getal op een klantpagina is een bewering
 * die iemand kan natrekken. "22 winkels", "€250 cashback", "9,4 op Zorgkaart",
 * "sinds 1862", "tussen 12.00 en 15.00 uur".
 */
const GETAL = /(\d|€|%)/;

/** Losse woorden en koppen zijn geen bewering; hieronder wordt het ruis. */
const MIN_WOORDEN = 5;

/**
 * Contactgegevens: een telefoonnummer, een e-mailadres of een postcode.
 * (R0b, gemeten op de benchmarkronde van 3 september 2026)
 *
 * ── WAAROM DEZE ERUIT MOETEN VÓÓR `GETAL` ───────────────────────────────────
 *
 * `GETAL` is `/(\d|€|%)/`: één cijfer maakt van een zin een bewering. Dat is
 * bewust ruim, want elk getal op een klantpagina kan iemand natrekken. Maar een
 * telefoonnummer is geen belofte, en zo werd élke oproep tot actie een
 * onbewijsbare bewering:
 *
 *   "Bel 030-2270437 of stel eerst een vraag."
 *   "Bellen kan via 030 227 04 37 en mailen via info@fysiocentrumutrecht.nl."
 *
 * Die zinnen kunnen per definitie niet naar een feit op de kaart wijzen, dus ze
 * blokkeerden de pagina. Elke pagina met een telefoonnummer eronder liep erin
 * vast.
 *
 * ⚠️ Alleen de contactgegevens gaan eruit, niet elk getal. "Wij staan binnen 24
 * uur op het dak" houdt zijn 24 en blijft dus een bewering, want dát is wel een
 * belofte. Een webadres blijft ook staan: "Op valk.com reserveert u direct
 * online" was een van de twee fabricages van 31 juli.
 */
const CONTACTGEGEVEN: RegExp[] = [
  // E-mailadres.
  /[\w.+-]+@[\w-]+\.[\w.-]+/g,
  // Nederlands telefoonnummer, met spaties of streepjes op willekeurige plek.
  /(?:\+31[\s-]?|\b0)\d(?:[\s-]?\d){7,9}\b/g,
  // Postcode.
  /\b\d{4}\s?[A-Z]{2}\b/g,
];

function zonderContactgegevens(zin: string): string {
  return CONTACTGEGEVEN.reduce((tekst, patroon) => tekst.replace(patroon, " "), zin);
}

/**
 * Hoeveel letters een toezeggingswoord langer mag worden en toch hetzelfde
 * woord blijven.
 *
 * Nederlandse vervoeging plakt er hooguit een paar letters achter:
 * "reserveer" wordt "reserveert", "bied" wordt "biedt", "lever" wordt
 * "leveren". Een AFLEIDING die de betekenis verandert is langer:
 * "beschikbaar" wordt "beschikbaarheid" (+4), "mogelijk" wordt
 * "mogelijkheden" (+5). Het eerste is nog steeds een toezegging, het tweede is
 * een zelfstandig naamwoord en belooft niets.
 */
const TOEZEGGING_SUFFIX_MAX = 3;

/**
 * Staat er een toezeggingswoord in, aan het BEGIN van een woord? (R0b)
 *
 * ── WAT HIER MISGING ────────────────────────────────────────────────────────
 *
 * Dit was een kale `includes()`, en die matchte midden in langere woorden.
 * "mogelijk" zat in "contactmogelijkheden", "beschikbaar" in "beschikbaarheid",
 * "binnen" in "binnendringt". Zinnen als "De adressen en contactmogelijkheden
 * van beide vestigingen staan op de contactpagina" golden daardoor als een
 * toezegging, terwijl er niets wordt toegezegd, en ze blokkeerden de pagina.
 *
 * ⚠️ Een woordgrens aan BEIDE kanten eisen is te streng, en dat is geen theorie:
 * die versie liet "Op valk.com … reserveert u direct online" vallen, precies een
 * van de twee fabricages van 31 juli waar deze hele controle voor bestaat. De
 * lijst bevat stammen, geen volledige vormen. Vandaar: woordbegin vast,
 * woordeinde met hooguit `TOEZEGGING_SUFFIX_MAX` letters speling.
 *
 * De meerwoordige ingangen ("kunt u", "zonder afspraak") werken hier gewoon in
 * mee: `normalizeForQuote` maakt van alle scheidingstekens spaties.
 */
function bevatToezegging(sleutel: string): boolean {
  const zin = ` ${sleutel} `;
  return TOEZEGGINGEN.some((toezegging) => {
    const t = normalizeForQuote(toezegging);
    let vanaf = 0;
    for (;;) {
      const i = zin.indexOf(` ${t}`, vanaf);
      if (i === -1) return false;
      // Waar loopt het woord af waar de treffer in begon?
      const eindeWoord = zin.indexOf(" ", i + 1 + t.length);
      const staart = (eindeWoord === -1 ? zin.length : eindeWoord) - (i + 1 + t.length);
      if (staart <= TOEZEGGING_SUFFIX_MAX) return true;
      vanaf = i + 1;
    }
  });
}

/**
 * Werkwoorden waarmee een zin een OPDRACHT AAN DE LEZER is, geen belofte van
 * het bedrijf. (gevonden bij de herkeuring van de benchmarkronde, 3 september
 * 2026, ná R0 en R0b)
 *
 * ── WAT HIER MISGING ────────────────────────────────────────────────────────
 *
 * "Maak foto's en video's van de lekkage" en "Sluit de hoofdkraan af" bevatten
 * een toezeggingswoord ("mogelijke", "beschikbaar") of worden er per ongeluk
 * mee verward, terwijl de zin niets over het bedrijf zegt: het is een
 * veiligheids- of stappeninstructie aan de lezer. Zulke zinnen kunnen niet
 * naar een feit op de kaart wijzen, dus blokkeerden ze zonder dat er iets fout
 * was aan de tekst.
 *
 * ⚠️ Bewust een KORTE, conservatieve lijst van werkwoorden die vrijwel nooit
 * een commerciële belofte inleiden. "Bel", "vraag" en "boek" staan er expres
 * NIET op: die kunnen een oproep tot actie inleiden die zelf een onbewezen
 * claim draagt ("Bel voor een gratis inspectie"), en dat moet blijven
 * blokkeren. Bij twijfel dus niet op de lijst (dezelfde regel als bovenaan dit
 * bestand: vals-positieven zijn goedkoper dan vals-negatieven).
 *
 * ⚠️ Dit lost niet elke instructiezin op. "Dit kun je zelf doen terwijl je
 * wacht" begint niet met een gebiedende wijs en glipt hier nog doorheen; dat
 * onderscheid (advies aan de lezer versus een belofte, zonder aan het begin
 * van de zin te herkennen) vraagt begrip van de zin en niet van het eerste
 * woord. Zie `docs/tasks/contentkwaliteit-framework.md` §10.
 *
 * Alleen van toepassing op het `toezegging`-signaal: een zin met de merknaam
 * of een getal blijft altijd een kandidaat, ook als hij met deze werkwoorden
 * begint.
 */
const INSTRUCTIE_WERKWOORDEN = [
  "maak", "doe", "controleer", "kijk", "sluit", "open", "zet", "leg", "houd",
  "meld", "spoel", "was", "dek", "plaats",
];

/** Begint deze zin met een instructie aan de lezer, geen belofte van het bedrijf? */
function isInstructieAanLezer(zin: string): boolean {
  const eersteWoord = normalizeForQuote(zin).split(" ")[0] ?? "";
  return INSTRUCTIE_WERKWOORDEN.includes(eersteWoord);
}

/**
 * Zinnen die NOOIT een bewering over het bedrijf zijn
 * (punt 59 van de kwaliteitsdoorlichting, 25 september 2026).
 *
 * Bij de herhaling van 24/25 september kregen 20 van de 21 nieuwe pagina's het
 * oordeel "block", en bij 19 daarvan was minstens één reden "deze zin zegt iets
 * over je bedrijf zonder bron" op een zin die niets over het bedrijf zegt. Twee
 * soorten daarvan zijn zonder begrip van de zin te herkennen, en die vallen hier
 * weg vóór er een modelaanroep aan te pas komt:
 *
 *   1. Een DATUMSTEMPEL: "Laatst bijgewerkt: 25 september 2026." Drie keer
 *      gevonden, bij drie verschillende merken. Het getal maakte er een
 *      kandidaat van (`GETAL`).
 *   2. Een verwijzing naar een EXTERNE PARTIJ zonder bewering van het bedrijf
 *      zelf: "verlaat dan de woning en bel 112", "kun je de actuele informatie
 *      van het CBR raadplegen".
 *
 * ⚠️ De tweede soort geldt alleen zolang de zin niet over het bedrijf zelf
 * praat (merknaam of wij-vorm) en er geen ander getal in staat dan het
 * alarmnummer. "Bij ons slaagt 93 procent bij het CBR" blijft dus een bewering.
 * Wat hier wel doorheen glipt, is een vergelijking zonder getal en zonder
 * wij-vorm ("leerlingen van deze rijschool slagen vaker bij het CBR"); dat is
 * een bewuste afweging tegen 19 van de 21 pagina's die onterecht vastliepen.
 */
const DATUMSTEMPEL =
  /^(laatst\s+)?(bijgewerkt|gewijzigd|aangepast|herzien|gecontroleerd|gepubliceerd)(\s+op)?\s*:?\s*\d{1,2}([\s./-]+\p{L}+|[./-]\d{1,2})[\s./-]+\d{4}\.?$/iu;

const EXTERNE_PARTIJEN = [
  "112", "alarmnummer", "hulpdienst", "hulpdiensten", "brandweer", "politie", "ambulance",
  "huisarts", "cbr", "rvo", "netbeheerder", "gemeente", "belastingdienst", "rijksoverheid",
];

/** Praat de zin over het bedrijf zelf, in de wij-vorm? */
const EERSTE_PERSOON = /(^| )(wij|we|ons|onze)( |$)/;

/** Een bedrag of percentage: altijd een bewering die iemand kan natrekken. */
const BEDRAG = /€|%|(^| )(euro|procent)( |$)/;

export function isGeenBewering(zin: string, brandName: string): boolean {
  if (DATUMSTEMPEL.test(zin.trim())) return true;
  const sleutel = normalizeForQuote(zin);
  if (bevatMerknaam(zin, brandName) || EERSTE_PERSOON.test(sleutel)) return false;
  const woorden = sleutel.split(" ");
  if (!EXTERNE_PARTIJEN.some((p) => woorden.includes(p))) return false;
  // Het alarmnummer telt niet als getal; elk ander getal wel.
  const zonderAlarm = zin.replace(/\b112\b/g, " ");
  return !GETAL.test(zonderContactgegevens(zonderAlarm));
}

/**
 * Mag een model deze zin wegzetten als "geen bewering over het bedrijf"?
 * (punt 59, het vangnet onder de modelaanroep in `claim-judge.ts`)
 *
 * Conventie 1: het model beslist per zin, de code bepaalt waar dat oordeel
 * NIET mag gelden. Een zin met de merknaam, in de wij-vorm, of met een bedrag
 * of percentage gaat altijd over het bedrijf, wat het model er ook van vindt.
 * Die zinnen kan het model alleen nog met een feit onderbouwen, niet meer
 * wegredeneren. Van de 67 tegengehouden zinnen van de herhaling vallen er 6
 * al weg op `isGeenBewering()`, en 14 in deze groep; daar zitten ook de echte
 * beweringen tussen ("Ga je na de intake bij ons lessen, dan krijg je de
 * intakekosten terug"). De overige 47 legt de code aan het model voor.
 */
export function magGeenBeweringZijn(zin: string, brandName: string): boolean {
  const sleutel = normalizeForQuote(zin);
  return !bevatMerknaam(zin, brandName) && !EERSTE_PERSOON.test(sleutel) && !BEDRAG.test(zin.toLowerCase());
}

/**
 * Keurmerken, certificeringen en wettelijke kwalificaties
 * (punt 60 van de kwaliteitsdoorlichting, 25 september 2026).
 *
 * Een keurmerk is nooit een parafrase: "erkend installateur" en "VCA-
 * gecertificeerd" delen het woord "erkend" niet, maar ook niet het feit. De
 * gewone dekkingswegen hieronder zijn daar te ruim voor: een feit van drie
 * woorden ("Erkend installateur (InstallQ)") dekt via
 * `claimMatchesSentence()` al een zin die er twee van noemt, ook als die zin er
 * een tweede keurmerk bij verzint.
 *
 * Daarom: een zin met een keurmerkwoord is alleen gedekt als ÉÉN feit alle
 * keurmerkwoorden van de zin bevat, met het merk of de wet erbij. Op stam en
 * niet letterlijk op het woord, want de site van de installateur schrijft
 * "CO-certificering" en de tekst "CO-gecertificeerd"; dat is hetzelfde feit.
 *
 * ⚠️ De aanleiding bleek bij narekenen onterecht: de "CO-certificering volgens
 * de Gasketelwet" staat letterlijk op de site van de installateur
 * (/ketelvervanging) en dus terecht op de kaart. De regel blijft, als vangnet
 * voor het geval dat de bevinding beschreef; de echte zin moet erdoor, en dat
 * toetst `test-unit.ts`.
 */
const KEURMERK_STAMMEN: [RegExp, string][] = [
  [/^(ge)?certific/, "~certific"],
  [/^keurmerk/, "~keurmerk"],
  [/^erken/, "~erken"],
  [/^(ge)?registreerd|^registratie|register$/, "~register"],
  [/^(ge)?diplomeerd|^diploma/, "~diploma"],
  [/^(ge)?kwalificeerd|^kwalificatie/, "~kwalific"],
  [/^bevoegd/, "~bevoegd"],
  [/^wettelijk/, "~wettelijk"],
];

/** De stam van een keurmerkwoord, of een wet ("Gasketelwet"), anders `null`. */
function keurmerkStam(woord: string): string | null {
  for (const [patroon, stam] of KEURMERK_STAMMEN) if (patroon.test(woord)) return stam;
  if (woord === "wet" || (woord.length > 5 && woord.endsWith("wet"))) return woord;
  return null;
}

/** Hoe ver een afkorting van een keurmerkwoord mag staan om erbij te horen. */
const KEURMERK_AFSTAND = 3;

/**
 * De keurmerkwoorden van een tekst: de stammen, plus de afkortingen en namen
 * die erbij horen ("CO" in "CO-gecertificeerd", "InstallQ" in "erkend door
 * InstallQ"). Leeg betekent: deze tekst noemt geen keurmerk.
 */
export function keurmerkKern(tekst: string): Set<string> {
  const kern = new Set<string>();
  const tokens = tekst.split(/\s+/).filter(Boolean);
  const stamPosities: number[] = [];
  tokens.forEach((token, i) => {
    const delen = normalizeForQuote(token).split(" ").filter(Boolean);
    const stammen = delen.map(keurmerkStam);
    if (stammen.some(Boolean)) {
      stamPosities.push(i);
      delen.forEach((deel, j) => kern.add(stammen[j] ?? deel));
    }
  });
  if (kern.size === 0) return kern;
  // Afkortingen en namen met twee of meer hoofdletters vlak bij een keurmerkwoord.
  tokens.forEach((token, i) => {
    if (!stamPosities.some((p) => Math.abs(p - i) <= KEURMERK_AFSTAND)) return;
    for (const deel of token.split(/[^\p{L}\d]+/u)) {
      if ((deel.match(/\p{Lu}/gu) ?? []).length >= 2) kern.add(normalizeForQuote(deel));
    }
  });
  return kern;
}

/** Bevat dit feit alle keurmerkwoorden van de zin? */
function feitDraagtKeurmerk(kern: Set<string>, feitTekst: string): boolean {
  const feitWoorden = normalizeForQuote(feitTekst).split(" ").filter(Boolean);
  const feit = new Set<string>([...feitWoorden, ...feitWoorden.map(keurmerkStam).filter((s): s is string => !!s)]);
  return [...kern].every((w) => feit.has(w));
}

/** Woordgrens-veilige merknaamcontrole, ongevoelig voor koppeltekens en accenten. */
function bevatMerknaam(zin: string, brandName: string): boolean {
  const merk = normalizeForQuote(brandName);
  if (merk.length < 2) return false;
  return ` ${normalizeForQuote(zin)} `.includes(` ${merk} `);
}

/**
 * Alle kandidaat-beweringen in een geschreven pagina.
 *
 * De FAQ gaat mee, en dat is geen detail: `TYPE_GUIDANCE` stuurt bij het type
 * `faq` juist alles naar het FAQ-veld en houdt `bodyMarkdown` kort. Zou deze
 * functie alleen de body bekijken, dan zou precies dat contenttype ongemeten
 * blijven. De vraagregels zelf tellen niet mee, een vraag is geen bewering.
 */
export function detectClaimSentences(
  args: { bodyMarkdown: string; faq?: { q: string; a: string }[] },
  brandName: string,
): DetectedClaim[] {
  const stukken = [
    stripMarkdown(args.bodyMarkdown ?? ""),
    ...(args.faq ?? []).map((f) => stripMarkdown(f.a ?? "")),
  ];

  const gezien = new Set<string>();
  const gevonden: DetectedClaim[] = [];

  for (const stuk of stukken) {
    for (const ruw of splitSentences(stuk)) {
      const zin = ruw.trim();
      if (zin.split(/\s+/).filter(Boolean).length < MIN_WOORDEN) continue;
      // Een vraag stelt niets; hij vraagt iets. FAQ-koppen en tussenvragen
      // vallen hier weg zonder dat we ze apart hoeven te herkennen.
      if (zin.endsWith("?")) continue;

      const sleutel = normalizeForQuote(zin);
      if (!sleutel || gezien.has(sleutel)) continue;
      // Punt 59: een datumstempel of een verwijzing naar het CBR of 112 zegt
      // niets over het bedrijf.
      if (isGeenBewering(zin, brandName)) continue;

      // Volgorde is de sterkte van het signaal: een zin mét de merknaam is een
      // bewering over deze klant, ook zonder getal. Dat is de categorie waarin
      // beide gemiste fabricages van 31 juli vielen.
      // R0b: contactgegevens tellen niet mee als signaal. De merknaam wordt op
      // de HELE zin gezocht, want die staat nooit in een telefoonnummer.
      const zonderContact = zonderContactgegevens(zin);

      let signal: ClaimSignal | null = null;
      if (bevatMerknaam(zin, brandName)) signal = "merknaam";
      // Punt 60: een keurmerk is een bewering, ook zonder getal of merknaam.
      else if (keurmerkKern(zin).size > 0) signal = "keurmerk";
      else if (GETAL.test(zonderContact)) signal = "getal";
      else if (bevatToezegging(normalizeForQuote(zonderContact)) && !isInstructieAanLezer(zin))
        signal = "toezegging";
      if (!signal) continue;

      gezien.add(sleutel);
      gevonden.push({ sentence: zin, signal });
    }
  }

  return gevonden;
}

/**
 * Hoort deze getagde bewering bij deze gedetecteerde zin?
 *
 * Het model tagt een parafrase ("Coolblue heeft 22 fysieke winkels"), niet de
 * letterlijke zin ("Coolblue heeft 22 fysieke winkels in Nederland waar je
 * terecht kunt voor advies"). Daarom overlap in plaats van gelijkheid: staat
 * minstens 60% van de inhoudswoorden van de claim in de zin, dan hoort hij erbij.
 *
 * 60% en niet hoger, omdat het alternatief erger is: een claim die zijn eigen
 * zin niet terugvindt telt de zin als ongemeten én de claim als los, en dan
 * straft de meting een pagina twee keer voor één formulering.
 */
export function claimMatchesSentence(claim: string, sentence: string): boolean {
  const woorden = normalizeForQuote(claim).split(" ").filter((w) => w.length > 2);
  if (woorden.length === 0) return false;
  const zin = ` ${normalizeForQuote(sentence)} `;
  const raak = woorden.filter((w) => zin.includes(` ${w} `)).length;
  return raak / woorden.length >= 0.6;
}

/**
 * Minimaal aantal betekenisvolle woorden dat een feit moet hebben om via
 * `zinIsOnderbouwdDoorKaart()` als bewijs te tellen.
 *
 * Zelfde soort grens als `MIN_CITAAT_TEKENS` in `evidence-weight.ts`, en om
 * dezelfde reden: een feit van twee woorden ("gratis parkeren") deelt met
 * bijna elke zin genoeg overlap om "bewezen" te lijken, en dan bewijst het
 * feit niets meer specifieks.
 */
const MIN_FEIT_WOORDEN = 3;

function feitWoordenAantal(tekst: string): number {
  return normalizeForQuote(tekst).split(" ").filter((w) => w.length > 2).length;
}

/**
 * Is deze GEDETECTEERDE zin, die het model niet zelf getagd heeft, toch te
 * herleiden naar een feit op de kaart?
 * (gevonden bij de herkeuring van de benchmarkronde, 3 september 2026, ná R0
 * en R0b: `docs/tasks/contentkwaliteit-framework.md` §10)
 *
 * ── HET GAT ──────────────────────────────────────────────────────────────
 *
 * `detectedCoverage()` hieronder keek tot nu toe alleen naar het lijstje
 * beweringen dat het SCHRIJVENDE model zelf meelevert (`claims`). Schreef het
 * model een kloppende, onderbouwde zin maar vergat hij die op zijn eigen
 * lijstje te zetten, dan gold de zin als onbewezen terwijl het feit er gewoon
 * stond: "MJB Dakservice kan bij een daklekkage in Zutphen binnen 24 uur ter
 * plaatse zijn" blokkeerde, terwijl `offline_proof` letterlijk "binnen 24 uur
 * ter plaatse bij een lekkage" bevat. Op de twaalf herkeurde benchmarkpagina's
 * kwamen 52 van de 56 resterende blokkades hieruit.
 *
 * ── WAAROM NIET GEWOON `isSupported()` OF `claimIsOnderbouwd()` ────────────
 *
 * Die twee hebben een `sourceRef` nodig: een concreet feit om tegen te
 * toetsen. Een ONgetagde zin heeft dat per definitie niet, dat is het hele
 * probleem. Deze functie zoekt daarom BLIND over de hele kaart, met dezelfde
 * `claimMatchesSentence()` als bij een getagde bewering, alleen nu andersom:
 * het FEIT is de korte kant die moet passen, de ZIN de lange kant waarin hij
 * moet passen.
 *
 * ── WAAROM DIT DE FABRICAGE-BESCHERMING NIET AFZWAKT ────────────────────────
 *
 * Een verzonnen bewering ("reserveer direct online" bij Van der Valk) heeft
 * per definitie geen feit op de kaart dat hem draagt: er bestaat geen feit
 * met inhoud over een boekingsmodule. Blind zoeken vindt daar dus niets, en de
 * zin blijft terecht geblokkeerd. Wat deze functie verandert is alleen het
 * geval waarin het bewijs er wél is, maar het model het simpelweg niet apart
 * heeft aangevinkt.
 *
 * ⚠️ `MIN_FEIT_WOORDEN` is de rem tegen een vals gevoel van dekking, en
 * `allowed`/`citable` zijn dezelfde twee poorten als overal elders: een
 * verboden feit (de klant heeft het ontkend) of een niet-citeerbaar
 * achtergrondblok mag nooit als bewijs tellen.
 */
function zinIsOnderbouwdDoorKaart(sentence: string, facts: readonly FactItem[]): boolean {
  return (
    facts.some(
      (f) =>
        f.allowed &&
        f.citable &&
        feitWoordenAantal(f.text) >= MIN_FEIT_WOORDEN &&
        claimMatchesSentence(f.text, sentence),
    ) || zinParafraseertFeit(sentence, facts)
  );
}

/** De getallen in een tekst, zonder duizendtalpunt en zonder euroteken. */
function getallenIn(tekst: string): string[] {
  return (tekst.match(/\d[\d.,]*/g) ?? [])
    .map((g) => g.replace(/[.,](?=\d{3}\b)/g, "").replace(/[.,]$/, ""))
    .filter((g) => g.length > 0);
}

/** Inhoudswoorden van vijf letters of meer, afgekapt op vijf: "ploeg", "vaste", "verzo". */
function kernwoorden(tekst: string): Set<string> {
  return new Set(
    normalizeForQuote(tekst)
      .split(" ")
      .filter((w) => w.length >= 5)
      .map((w) => w.slice(0, 5)),
  );
}

/**
 * Een zin die een feit van de kaart in eigen woorden weergeeft
 * (punt 54 van de kwaliteitsdoorlichting, 24 september 2026).
 *
 * `claimMatchesSentence()` eist dat 60% van de woorden van het FEIT in de zin
 * staat. Een klantantwoord is vaak lang ("Wat kost een complete tuin: meestal
 * 12.000 tot 35.000 euro, afhankelijk van ..."), en de zin die de schrijver
 * ervan maakt kort ("Reken meestal op €12.000 tot €35.000"). Die zin haalt de
 * 60% nooit, en bleef bij elke nieuwe versie van de pagina voor Best blokkeren
 * als "zin zonder bron", terwijl hij klopte.
 *
 * Twee strikte wegen, zodat een verzonnen zin er niet doorheen glipt:
 *
 *   1. GETALLEN: de zin heeft getallen en ze staan ALLEMAAL in één feit (bij
 *      één getal ook minstens één gedeeld woord). Een verzonnen bedrag of
 *      termijn heeft per definitie geen feit met datzelfde getal.
 *   2. WOORDEN, alleen bij een feit van de klant: minstens twee kernwoorden
 *      gedeeld, en die vormen minstens 40% van de kernwoorden van de zin.
 *      "Eén vaste ploeg verzorgt het hele tuinproject" tegenover "Eigen vaste
 *      ploeg van vijf man": vaste en ploeg, twee van de vijf.
 */
function zinParafraseertFeit(sentence: string, facts: readonly FactItem[]): boolean {
  const bruikbaar = facts.filter((f) => f.allowed && f.citable);
  const zinGetallen = getallenIn(sentence);
  const zinWoorden = kernwoorden(sentence);
  if (zinGetallen.length > 0) {
    // Eén los getal ("2") kan toevallig in een ander feit staan ("2 jaar
    // garantie"); dan moet er ook een woord gedeeld worden.
    return bruikbaar.some((f) => {
      const feitGetallen = new Set(getallenIn(f.text));
      if (!zinGetallen.every((g) => feitGetallen.has(g))) return false;
      if (zinGetallen.length >= 2) return true;
      const feitWoorden = kernwoorden(f.text);
      return [...zinWoorden].some((w) => feitWoorden.has(w));
    });
  }
  if (zinWoorden.size === 0) return false;
  return bruikbaar
    .filter((f) => /^(klant|opgegeven in het gesprek)/i.test(f.source.trim()))
    .some((f) => {
      const feitWoorden = kernwoorden(f.text);
      const gedeeld = [...zinWoorden].filter((w) => feitWoorden.has(w)).length;
      return gedeeld >= 2 && gedeeld / zinWoorden.size >= 0.4;
    });
}

/**
 * Noemt de zin een keurmerk, dan moet één feit alle keurmerkwoorden dragen
 * (punt 60). Zonder keurmerk verandert er niets. Dit komt BOVENOP de gewone
 * dekking, niet in plaats ervan: "Als gecertificeerd bedrijf staan wij binnen
 * 2 uur bij u" heeft voor de termijn nog steeds een eigen feit nodig.
 */
function keurmerkGedekt(sentence: string, facts: readonly FactItem[]): boolean {
  const kern = keurmerkKern(sentence);
  if (kern.size === 0) return true;
  return facts.some((f) => f.allowed && f.citable && feitDraagtKeurmerk(kern, f.text));
}

/**
 * Het oordeel van de zinnenbeoordelaar (`claim-judge.ts`) over één zin die de
 * gewone dekking niet rond kreeg.
 */
export interface ZinOordeel {
  /** De zin, letterlijk zoals hij aan het model is voorgelegd. */
  sentence: string;
  /** Is dit een controleerbare bewering over DIT bedrijf? */
  overBedrijf: boolean;
  /** Het F-nummer van het feit dat hem exact onderbouwt, of `null`. */
  feit: string | null;
}

/**
 * Onderbouwt dit feit deze zin, volgens de code? (vangnet onder `ZinOordeel.feit`)
 *
 * Het model mag een feit aanwijzen dat de woordvergelijking niet vond, maar het
 * mag geen feit aanwijzen dat de zin aantoonbaar NIET draagt. Drie harde eisen:
 *
 *   1. het feit mag gebruikt worden (`allowed` en `citable`);
 *   2. elk getal uit de zin staat in het feit, want een verzonnen bedrag of
 *      termijn heeft per definitie geen feit met datzelfde getal;
 *   3. zin en feit delen minstens één kernwoord (`kernwoorden()`), zodat een
 *      willekeurig F-nummer niet genoeg is. "Woont u in Nuenen, dan valt uw
 *      woonplaats binnen ons werkgebied voor warmtepompen" en het klantfeit
 *      "Welke plaatsen bedient Wesley voor hybride warmtepompen ... Nuenen"
 *      delen "nuene" en "warmt".
 *
 * Plus de keurmerkregel: die geldt hier net zo streng als overal.
 */
export function feitOnderbouwtZin(sentence: string, feit: FactItem | undefined): boolean {
  if (!feit || !feit.allowed || !feit.citable) return false;
  const feitGetallen = new Set(getallenIn(feit.text));
  if (!getallenIn(zonderContactgegevens(sentence)).every((g) => feitGetallen.has(g))) return false;
  const feitWoorden = kernwoorden(feit.text);
  if (![...kernwoorden(sentence)].some((w) => feitWoorden.has(w))) return false;
  return keurmerkGedekt(sentence, [feit]);
}

export interface VerfijndeDekking extends CoverageResult {
  /** Zinnen die volgens het model geen bewering over het bedrijf zijn, en dat ook mogen zijn. */
  geenBewering: string[];
  /** Zinnen die het model aan een feit koppelde en die de code ook zo gedekt vindt. */
  gekoppeld: { sentence: string; feit: string }[];
}

/**
 * Past de oordelen van de zinnenbeoordelaar toe op de dekking
 * (punt 59 van de kwaliteitsdoorlichting, 25 september 2026).
 *
 * Een zin valt uit de noemer als het model zegt dat hij niets over het bedrijf
 * beweert EN `magGeenBeweringZijn()` dat toestaat. Een zin telt als gedekt als
 * het model een feit aanwijst EN `feitOnderbouwtZin()` dat bevestigt. In elk
 * ander geval blijft de zin staan zoals de code hem vond: een ontbrekend, kapot
 * of te optimistisch oordeel maakt de keuring nooit milder (conventie 3).
 *
 * `oordelen: null` betekent dat de aanroep mislukt is; dan verandert er niets.
 */
export function verwerkZinOordelen(args: {
  dekking: CoverageResult;
  oordelen: ZinOordeel[] | null;
  facts: FactItem[];
  brandName: string;
}): VerfijndeDekking {
  const { dekking, oordelen, facts, brandName } = args;
  if (!oordelen || oordelen.length === 0 || dekking.untagged.length === 0) {
    return { ...dekking, geenBewering: [], gekoppeld: [] };
  }
  const perZin = new Map(oordelen.map((o) => [normalizeForQuote(o.sentence), o]));
  const geenBewering: string[] = [];
  const gekoppeld: { sentence: string; feit: string }[] = [];
  const untagged: DetectedClaim[] = [];

  for (const d of dekking.untagged) {
    const oordeel = perZin.get(normalizeForQuote(d.sentence));
    if (oordeel && !oordeel.overBedrijf && magGeenBeweringZijn(d.sentence, brandName)) {
      geenBewering.push(d.sentence);
      continue;
    }
    const ref = oordeel?.feit?.trim().toUpperCase() ?? "";
    const feit = ref ? facts.find((f) => f.ref.toUpperCase() === ref) : undefined;
    if (oordeel?.overBedrijf && feitOnderbouwtZin(d.sentence, feit)) {
      gekoppeld.push({ sentence: d.sentence, feit: ref });
      continue;
    }
    untagged.push(d);
  }

  const noemer = dekking.detected - geenBewering.length;
  return {
    ...dekking,
    detected: noemer,
    coverage: noemer === 0 ? null : Math.round(((noemer - untagged.length) / noemer) * 100),
    untagged,
    geenBewering,
    gekoppeld,
  };
}

/**
 * Het feit-id opzoeken bij een bronverwijzing (migratie 0036).
 *
 * Het model levert alleen het F-nummer; dat is de handle die het kent. De code
 * zoekt daar het feit bij op en legt het ID vast, zodat een bewering ook na een
 * herschrijfronde of een groeiende kaart nog naar hetzelfde feit wijst, een
 * F-nummer is een positie, geen identiteit.
 *
 * Bij een samengestelde verwijzing ("F1, F2") wint het EERSTE deel dat een feit
 * oplevert: dat is het feit waar het citaat uit komt, en daarmee de bron van de
 * bewering.
 */
export function resolveFactId(factRef: string | null | undefined, facts: FactItem[]): string | null {
  if (!factRef) return null;
  for (const deel of factRef.split(/[,;/]+/)) {
    const ref = deel.trim().toUpperCase();
    if (!ref) continue;
    const feit = facts.find((f) => f.ref.toUpperCase() === ref && f.id);
    if (feit?.id) return feit.id;
  }
  return null;
}

export interface CoverageResult {
  /** Percentage gedetecteerde beweringen dat herleidbaar is. `null` = niets gedetecteerd. */
  coverage: number | null;
  /** Hoeveel zinnen de code als bewering aanmerkte, de eerlijke noemer. */
  detected: number;
  /** Hoeveel beweringen het model zelf tagde. */
  tagged: number;
  /** Getagde beweringen die de feitenkaart niet draagt. */
  unsupported: WrittenClaim[];
  /** Zinnen die als bewering gelden maar door het model nooit getagd zijn. */
  untagged: DetectedClaim[];
}

/**
 * De bronnendekking, met een noemer die de code bepaalt.
 *
 * Een gedetecteerde zin telt als gedekt wanneer er een getagde claim bij hoort
 * die `isSupported()` overleeft, óf wanneer de zin zelf (ongetagd) toch
 * letterlijk overlapt met een feit op de kaart (`zinIsOnderbouwdDoorKaart()`,
 * 3 september 2026). Alleen dan telt een zin als ONgedekt: niet-taggen mag
 * geen manier zijn om aan de meting te ontsnappen, maar het is ook geen straf
 * voor een zin die het model gewoon vergat aan te vinken terwijl het bewijs er
 * wél is.
 *
 * Nul gedetecteerde zinnen geeft `null` en niet 100. "Ik heb niets beweerd" is
 * geen perfecte dekking maar een ontbrekend oordeel, en `null` is daar de enige
 * eerlijke weergave van (dezelfde regel als `sourceCoverage()`).
 */
export function detectedCoverage(args: {
  detected: DetectedClaim[];
  claims: WrittenClaim[];
  facts: FactItem[];
}): CoverageResult {
  const { detected, claims, facts } = args;

  const echt = claims.filter((c) => c.claim?.trim());
  const gedekteClaims = echt.filter((c) => isSupported(c.factRef, facts, c.quote ?? null));
  const unsupported = echt.filter((c) => !gedekteClaims.includes(c));

  if (detected.length === 0) {
    return { coverage: null, detected: 0, tagged: echt.length, unsupported, untagged: [] };
  }

  const untagged = detected.filter(
    (d) =>
      !(
        (gedekteClaims.some((c) => claimMatchesSentence(c.claim, d.sentence)) ||
          zinIsOnderbouwdDoorKaart(d.sentence, facts)) &&
        keurmerkGedekt(d.sentence, facts)
      ),
  );

  const gedekt = detected.length - untagged.length;
  return {
    coverage: Math.round((gedekt / detected.length) * 100),
    detected: detected.length,
    tagged: echt.length,
    unsupported,
    untagged,
  };
}
