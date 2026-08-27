/**
 * De ronde: de zes stappen die ORBIT ENGINE en de klant samen elke maand zetten.
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * Het product ís een kringloop: meten, kansen zien, plannen, schrijven,
 * publiceren, hermeten, en dan weer van voren af aan. Die volgorde zat overal
 * in de app, in de statussen, in de taken en in de teksten, maar stond op geen
 * enkel scherm getekend. Het menu is een kast met laden, en een kast vertelt
 * niet dat de laden samen één ronde zijn.
 *
 * Het gevolg voor de klant: hij wist wél wat hij vandaag moest doen (de
 * werklijst op het overzicht is daar goed in), maar niet waar dat toe leidde en
 * wat er daarna gebeurde. Elke handeling las als een klusje in plaats van als
 * een zet in een programma dat hij betaalt.
 *
 * ── WAAROM HET EEN PURE MODULE IS ───────────────────────────────────────────
 *
 * Conventie 2: wat de uitkomst bepaalt staat zonder `server-only` in een eigen
 * bestand, anders is het niet te testen vanuit `scripts/test-unit.ts`. Deze
 * module rekent alleen; het overzicht haalt de cijfers op en tekent ze.
 *
 * ── WAT EEN FASE "KLAAR" MAAKT ──────────────────────────────────────────────
 *
 * Eén ding is hier belangrijk en het is bewust streng: een fase is klaar als er
 * iets echts gebeurd is, niet als er iets klaarstaat. Een plan zonder
 * ingeplande pagina's is geen plan, een tekst die niet live staat is geen
 * publicatie. Dat is dezelfde lat als in de rest van de app (conventie 10:
 * gebouwd is niet geverifieerd), en het is precies wat een voortgangsbalk
 * waardeloos maakt zodra je hem loslaat: een balk die vult zonder dat er iets
 * beweegt, liegt.
 */

export type FaseId =
  | "meten"
  | "kansen"
  | "plannen"
  | "schrijven"
  | "publiceren"
  | "hermeten";

export interface RondeInput {
  /** Aantal afgeronde meetperiodes over alle clusters van dit merk. */
  metingen: number;
  /** Openstaande kansen uit het laatste rapport. */
  kansen: number;
  /** Pagina's die in een maand van het contentplan staan, zonder reserve. */
  gepland: number;
  /** Teksten die ORBIT ENGINE voor dit merk geschreven heeft. */
  geschreven: number;
  /** Teksten die volgens de klant live staan. */
  gepubliceerd: number;
  /** Gepubliceerde teksten waarvan de hermeting binnen is. */
  hermeten: number;
}

export interface RondeFase {
  id: FaseId;
  /** Wat er in de balk staat. */
  label: string;
  /** Wat er in deze stap gebeurt, in één halve zin. */
  wat: string;
  /** De stand van nu, met het getal erin. */
  stand: string;
  klaar: boolean;
  /** De eerste stap die nog niet klaar is. Hooguit één van de zes. */
  actief: boolean;
  /** Wacht deze stap op de klant, of doet ORBIT ENGINE hem zelf? */
  vanJou: boolean;
}

interface FaseDefinitie {
  id: FaseId;
  label: string;
  wat: string;
  vanJou: boolean;
  /** Het aantal dat deze stap draagt. */
  telling: (input: RondeInput) => number;
  /** De stand, in woorden. */
  stand: (n: number) => string;
}

/**
 * ⚠️ De volgorde in deze lijst is de volgorde op het scherm en de volgorde
 * waarin een stap "aan de beurt" kan zijn. Verplaats hier niets zonder dat de
 * pijplijn zelf verandert.
 *
 * `vanJou` staat op twee stappen. Plannen is van de klant sinds hij zijn eigen
 * maand vrijgeeft (27 augustus 2026, `lib/cost-rules.ts`), en publiceren was
 * altijd al van hem: ORBIT ENGINE kan niet op zijn website komen. Dat is geen
 * detail maar de kern van de arbeidsverdeling, en de klant leest het hier voor
 * het eerst op één plek.
 */
const FASES: FaseDefinitie[] = [
  {
    id: "meten",
    label: "Meten",
    wat: "ORBIT ENGINE stelt de vragen van jouw klanten aan AI-assistenten",
    vanJou: false,
    telling: (i) => i.metingen,
    stand: (n) => (n === 0 ? "nog niet gemeten" : n === 1 ? "1 meting" : `${n} metingen`),
  },
  {
    id: "kansen",
    label: "Kansen",
    wat: "waar je niet genoemd wordt, en wat dat waard is",
    vanJou: false,
    telling: (i) => i.kansen,
    stand: (n) => (n === 0 ? "nog geen kansen" : n === 1 ? "1 kans" : `${n} kansen`),
  },
  {
    id: "plannen",
    label: "Plannen",
    wat: "jij geeft de maand vrij die aan de beurt is",
    vanJou: true,
    telling: (i) => i.gepland,
    stand: (n) => (n === 0 ? "nog geen plan" : `${n} ingepland`),
  },
  {
    id: "schrijven",
    label: "Schrijven",
    wat: "ORBIT ENGINE schrijft de pagina's die de gemiste vragen moeten winnen",
    vanJou: false,
    telling: (i) => i.geschreven,
    stand: (n) => (n === 0 ? "nog niets geschreven" : n === 1 ? "1 tekst" : `${n} teksten`),
  },
  {
    id: "publiceren",
    label: "Publiceren",
    wat: "jij zet de tekst op je site en vult de link in",
    vanJou: true,
    telling: (i) => i.gepubliceerd,
    stand: (n) => (n === 0 ? "nog niets live" : n === 1 ? "1 live" : `${n} live`),
  },
  {
    id: "hermeten",
    label: "Hermeten",
    wat: "na twee en vier weken meet ORBIT ENGINE of het geholpen heeft",
    vanJou: false,
    telling: (i) => i.hermeten,
    stand: (n) => (n === 0 ? "nog niets nagemeten" : n === 1 ? "1 nagemeten" : `${n} nagemeten`),
  },
];

/**
 * De zes stappen met hun stand, en precies één actieve stap.
 *
 * Actief is de eerste stap die nog niet klaar is. Staat alles, dan is er geen
 * actieve stap: de ronde is rond en loopt vanzelf door. Dat is geen fout maar
 * de bedoeling, en `rondeZin()` zegt het ook zo.
 */
export function ronde(input: RondeInput): RondeFase[] {
  const standen = FASES.map((f) => {
    const n = Math.max(0, f.telling(input));
    return { def: f, n, klaar: n > 0 };
  });

  const eersteOpen = standen.findIndex((s) => !s.klaar);

  return standen.map((s, i) => ({
    id: s.def.id,
    label: s.def.label,
    wat: s.def.wat,
    stand: s.def.stand(s.n),
    klaar: s.klaar,
    actief: i === eersteOpen,
    vanJou: s.def.vanJou,
  }));
}

/**
 * Eén zin onder de balk: waar sta je, en wie is er aan zet.
 *
 * ⚠️ Nooit "je bent klaar". Een ronde die rond is, begint de volgende maand
 * opnieuw, en een klant die leest dat hij klaar is, komt niet terug.
 */
export function rondeZin(fases: RondeFase[]): string {
  const actief = fases.find((f) => f.actief);
  if (!actief) {
    return "Je ronde loopt rond. ORBIT ENGINE meet maandelijks door en zet nieuw werk voor je klaar.";
  }
  if (actief.vanJou) {
    return `Je bent aan zet bij ${actief.label.toLowerCase()}: ${actief.wat}.`;
  }
  return `ORBIT ENGINE is aan zet bij ${actief.label.toLowerCase()}: ${actief.wat}.`;
}
