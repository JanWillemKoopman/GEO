/**
 * Hoeveel van de vragen moeten regionaal zijn, en zijn ze dat ook?
 *
 * ── DE VONDST DIE DEZE MODULE NODIG MAAKTE ──────────────────────────────────
 *
 * ⚠️ Gemeten op productie, 11 augustus 2026. Fysi-Unique is een fysiopraktijk in
 * Amersfoort, dus net zo lokaal als een autodealer in Brabant. De uitsplitsing
 * van al zijn metingen over drie ronden:
 *
 *                    vragen   metingen   genoemd   score
 *   niet-regionaal     20        57         0        0
 *   regionaal          10        40        11       28
 *
 * Élke vermelding die dat merk ooit verdiende, kwam uit een regionale vraag. Van
 * 57 betaalde metingen op landelijke vragen leverde er niet één iets op.
 *
 * Drie gevolgen: twee derde van het meetbudget kocht niets, de getoonde score
 * (18/36/38) was systematisch lager dan de score op de vragen die ertoe doen
 * (28), en de gap-analyse stelde pagina's voor over een markt waar de klant niet
 * in zit.
 *
 * ── WAAROM DE PROMPTREGEL ALLEEN NIET GENOEG WAS ────────────────────────────
 *
 * `prompts.ts` zei al: "verwerk in een deel van de prompts een van deze
 * plaatsen". Dat is een INTENTIE. Bij Van den Udenhout, met de scope goed op
 * `lokaal` en negen plaatsen bekend, kwam er 38% uit. Conventie 1 van deze
 * codebase gaat precies hierover: een promptinstructie is een intentie, code is
 * een garantie. Deze module is die garantie.
 *
 * Puur, dus testbaar (conventie 2).
 */

/**
 * Welk aandeel van de vragen regionaal moet zijn bij een lokaal merk: ALLE.
 *
 * ── WAAROM 100% EN NIET 70% ─────────────────────────────────────────────────
 *
 * De eerste versie stond op 70%, met het argument dat een lokale ondernemer ook
 * af en toe een landelijke vraag wint en dat dát informatie is: het zegt of hij
 * buiten zijn eigen streek in beeld is.
 *
 * ⚠️ Dat argument is teruggedraaid op 11 augustus 2026, en de reden is beter dan
 * het argument was. Een score is een AANDEEL: in hoeveel van de gemeten vragen
 * word je genoemd. Meng je daar vragen doorheen die dit bedrijf per definitie
 * niet kan winnen, dan is de uitkomst niet "iets te laag" maar onwaar. Van den
 * Udenhout werkt uitsluitend in Brabant; dat hij in Drenthe niet genoemd wordt,
 * is geen tekortkoming die je in zijn cijfer hoort te verwerken.
 *
 * Het signaal dat we ermee opgeven is bovendien niets waard voor de klant die
 * dit product koopt: een installateur die alleen in Den Bosch komt, heeft geen
 * beslissing te nemen op basis van zijn landelijke zichtbaarheid.
 *
 * De constante blijft bestaan en is geen `true`/`false` geworden, want een merk
 * met bereik `landelijk` heeft hem gewoon niet nodig en een toekomstig merk met
 * twee thuismarkten misschien wel weer op iets ertussenin.
 */
export const REGIO_DREMPEL = 1.0;

/**
 * De twaalf provincies.
 *
 * Staan erbij omdat een lokale zoeker net zo vaak "in Brabant" zegt als
 * "'s-Hertogenbosch", terwijl in `service_regions` alleen de plaatsen staan.
 * Zonder deze lijst zou "welke autodealer in Brabant" als landelijk tellen, en
 * dat is precies de vraag waar het de klant om gaat. Een vaste lijst van twaalf
 * is stabieler dan een plaats-naar-provincie-tabel die onderhouden moet worden.
 */
const PROVINCIES = [
  "Groningen",
  "Friesland",
  "Fryslân",
  "Drenthe",
  "Overijssel",
  "Flevoland",
  "Gelderland",
  "Utrecht",
  "Noord-Holland",
  "Zuid-Holland",
  "Zeeland",
  "Noord-Brabant",
  "Brabant",
  "Limburg",
];

/**
 * Uitdrukkingen waarmee een zoeker "hier in de buurt" zegt zonder een naam.
 *
 * Die tellen mee, want een AI-assistent gebruikt de locatie van de vrager en dan
 * is de vraag feitelijk regionaal. Ze staan bewust apart van de plaatsnamen:
 * hier hangt de betekenis aan de context en niet aan een woord.
 */
const NABIJHEID = [
  "in de buurt",
  "bij mij in de buurt",
  "dichtbij",
  "in de regio",
  "hier in de buurt",
  "vlakbij",
];

/** Is dit een lokaal merk waarvoor de drempel geldt? */
export function isLokaal(scope: string | null | undefined, regions: string[] | null | undefined): boolean {
  return scope === "lokaal" && (regions?.length ?? 0) > 0;
}

/**
 * Bevat deze vraag een plaats, een provincie of een nabijheidswoord?
 *
 * Woordgrenzen, want "Oss" mag niet aanslaan op "grossier" en "Best" niet op
 * "beste". Dat is geen theoretisch risico: `service_regions` van een Brabantse
 * dealer bevat letterlijk "Oss".
 */
export function containsRegion(text: string, regions: string[]): boolean {
  const lower = text.toLowerCase();

  for (const zin of NABIJHEID) {
    if (lower.includes(zin)) return true;
  }

  const termen = [...regions, ...PROVINCIES]
    .map((r) => r.trim().toLowerCase())
    .filter((r) => r.length > 1);

  for (const term of termen) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Dezelfde grensvorm als `containsForbidden` in prompts.ts: geen letter of
    // cijfer ervoor of erna. Koppeltekens en apostrofs tellen als grens, zodat
    // "'s-Hertogenbosch" gewoon matcht.
    if (new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, "iu").test(lower)) {
      return true;
    }
  }
  return false;
}

/**
 * Mag deze handgeschreven vraag erbij, of gaat hij over heel Nederland?
 *
 * ── WAAROM DE ROUTE DIT MOET VRAGEN ─────────────────────────────────────────
 *
 * De generator garandeert sinds 11 augustus 2026 dat een lokaal merk uitsluitend
 * regionale vragen krijgt. `POST /api/analyses/[id]/prompts` liet daarnaast een
 * vraag met de hand toevoegen, zonder enige controle. Dat is een gat ter grootte
 * van één tekstveld: één landelijke vraag erbij en de noemer van de score klopt
 * weer niet, terwijl de generator er drie bijvulrondes voor betaalde.
 *
 * Weigeren en niet waarschuwen, want een waarschuwing die je kunt wegklikken is
 * geen garantie. De melding noemt de plaatsen, zodat de volgende poging meteen
 * goed is.
 *
 * Geeft `null` als de vraag mag: een merk zonder lokaal bereik heeft deze regel
 * niet, en dan is elke vraag goed.
 */
export function regionGateMessage(
  scope: string | null | undefined,
  regions: string[] | null | undefined,
  text: string,
): string | null {
  if (!isLokaal(scope, regions)) return null;
  if (containsRegion(text, regions!)) return null;
  return (
    `Deze vraag noemt geen plaats. Dit merk werkt uitsluitend in ${regions!.join(", ")}, ` +
    `dus een vraag zonder plaats gaat over heel Nederland en telt wel mee in de score ` +
    `terwijl hij niet te winnen is. Zet er een plaats of de provincie in.`
  );
}

export interface GeoBalance {
  /** Hoeveel er regionaal zijn. */
  regionaal: number;
  /** Hoeveel er minstens regionaal moeten zijn. */
  nodig: number;
  /** Hoeveel er nog bij moeten. 0 = het klopt. */
  tekort: number;
  /** Het aandeel nu, 0 tot 1. */
  aandeel: number;
}

/**
 * De stand van zaken voor een set vragen.
 *
 * `doel` is het aantal vragen dat de set uiteindelijk moet tellen, niet het
 * aantal dat er nu in zit: tijdens het bijvullen is de set nog niet compleet en
 * dan zou de drempel te laag uitvallen.
 */
export function geoBalance(
  texts: string[],
  regions: string[],
  doel: number,
  drempel: number = REGIO_DREMPEL,
): GeoBalance {
  const regionaal = texts.filter((t) => containsRegion(t, regions)).length;
  const nodig = Math.ceil(doel * drempel);
  return {
    regionaal,
    nodig,
    tekort: Math.max(0, nodig - regionaal),
    aandeel: texts.length === 0 ? 0 : regionaal / texts.length,
  };
}

/**
 * Welke vragen mogen wijken om plaats te maken voor regionale?
 *
 * De set heeft een vast aantal (het pakket bepaalt dat niet, maar de analyse
 * wel: dertig vragen). Een regionale vraag erbij betekent dus een landelijke
 * eruit. Welke: de laatst gegenereerde, want het model zet zijn beste voorstel
 * vooraan en de staart is het meest inwisselbaar.
 *
 * Geeft de indexen terug die weg mogen, hoogste eerst zodat de aanroeper ze kan
 * verwijderen zonder dat de indexen verschuiven.
 */
export function droppableIndices(
  texts: string[],
  regions: string[],
  aantal: number,
): number[] {
  const weg: number[] = [];
  for (let i = texts.length - 1; i >= 0 && weg.length < aantal; i--) {
    if (!containsRegion(texts[i], regions)) weg.push(i);
  }
  return weg;
}
