/**
 * Van het verhaal naar rijen: datums, vaste id's en de metingen van een jaar.
 *
 * Plan: `docs/tasks/demo-account-runx.md` §9.3. Alles hier is puur en
 * deterministisch (conventie 2): dezelfde invoer geeft altijd dezelfde rijen,
 * dus opnieuw inladen geeft geen dubbele rijen (conventie 9) en de unittests
 * kunnen het verhaal narekenen.
 *
 * ⚠️ De scores zelf rekent deze module NIET uit. Hij bepaalt per vraag per
 * meetmoment wie er in het antwoord staat; `computeAggregates()` in
 * `lib/pipeline/measure.ts` maakt daar bij het inladen de scores van, met
 * precies dezelfde rekensom als bij een echte klant. Zo kan een cijfer op het
 * scherm nooit afwijken van de antwoorden waar het op rust.
 */

import { createHash } from "node:crypto";
import { promptWeight } from "@/lib/pipeline/prompt-weight";
import type { DemoCluster, DemoVraag, Fase } from "@/lib/demo/runx/vragen";
import { WAAROM, WINKELS } from "@/lib/demo/runx/merk";

// ── Vaste id's ──────────────────────────────────────────────────────────────

/**
 * Een geldige uuid uit een sleutel. Altijd dezelfde uitkomst voor dezelfde
 * sleutel, zodat elke rij van de demo een vast id heeft en opnieuw inladen een
 * upsert is in plaats van een dubbele rij.
 */
export function demoId(sleutel: string): string {
  const h = createHash("sha256").update(`orbit-demo:${sleutel}`).digest("hex");
  // Versie 4 en variant 10xx, zodat Postgres en elke uuid-controle hem slikken.
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${((parseInt(h[16], 16) & 0x3) | 0x8).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Een pseudotoeval tussen 0 en 1 dat alleen van de sleutel afhangt. */
export function toeval(sleutel: string): number {
  const h = createHash("sha256").update(`orbit-demo-toeval:${sleutel}`).digest();
  return h.readUInt32BE(0) / 0x1_0000_0000;
}

// ── Tijd ────────────────────────────────────────────────────────────────────

/** De eerste dag van de maand `offset` maanden vanaf de maand van `nu`, 00:00 UTC. */
export function maandStart(nu: Date, offset: number): Date {
  return new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth() + offset, 1));
}

/** Dag `dag` (1-based) van die maand, om `uur` uur UTC. */
export function dagIn(nu: Date, offset: number, dag: number, uur = 9): Date {
  const d = maandStart(nu, offset);
  d.setUTCDate(dag);
  d.setUTCHours(uur, 0, 0, 0);
  return d;
}

export function isoDag(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface Meetmoment {
  weekNo: number;
  op: Date;
}

/**
 * De meetmomenten van een cluster: een nulmeting in de startmaand, daarna op
 * de 1e van elke maand tot en met de lopende maand, zoals de maandcron het doet.
 *
 * De nulmeting van de eerste vier clusters valt op de 24e (de klant werd eind
 * september verkocht); de volgende 1e ligt dan maar 7 dagen later, en die slaat
 * de cron over (21 dagen, `lib/measure-cadence.ts`). Een later cluster start op
 * de 8e en heeft die sprong niet nodig.
 */
export function meetmomenten(cluster: Pick<DemoCluster, "startMaand">, nu: Date): Meetmoment[] {
  // De 8e en niet later: dan ligt de volgende 1e altijd minstens 21 dagen
  // verder, ook na februari. Zo heeft een cluster in elke maand van het jaar
  // evenveel meetmomenten, en schuift verjongen (§9.5) niets anders dan de datums.
  const nulDag = cluster.startMaand <= -13 ? 24 : 8;
  // Om 06:00, net als de maandmeting: anders ligt de 8e februari net geen 21
  // dagen voor de 1e maart, en heeft februari een meetmoment minder.
  const nul = dagIn(nu, cluster.startMaand, nulDag, 6);
  const momenten: Meetmoment[] = [{ weekNo: 0, op: nul }];
  let weekNo = 1;
  for (let m = cluster.startMaand + 1; m <= 0; m++) {
    const op = dagIn(nu, m, 1, 6);
    if (op.getTime() - momenten[momenten.length - 1].op.getTime() < 21 * 86_400_000) continue;
    // De meting van deze maand kan pas als hij er is: niet in de toekomst.
    if (op.getTime() > nu.getTime()) break;
    momenten.push({ weekNo: weekNo++, op });
  }
  return momenten;
}

// ── Het verloop van de score ────────────────────────────────────────────────

/**
 * Het doel van een cluster op meetmoment `k` van `laatste`: van de startscore
 * naar de score van nu, eerst rustig (de eerste pagina's moeten nog
 * gepubliceerd en opgepikt worden), dan sneller, met een kleine dip halverwege
 * zodat de lijn niet geconstrueerd oogt. In procenten.
 */
export function doelScore(cluster: Pick<DemoCluster, "sleutel" | "scoreStart" | "scoreNu">, k: number, laatste: number): number {
  if (laatste <= 0) return cluster.scoreNu;
  const t = k / laatste;
  // Half recht, half een zachte S (3t² - 2t³): de eerste pagina's doen al iets
  // in de tweede maand, en daarna versnelt het.
  const s = 0.5 * t + 0.5 * (3 * t * t - 2 * t * t * t);
  let score = cluster.scoreStart + (cluster.scoreNu - cluster.scoreStart) * s;
  // Eén dip van een paar punten, op een vaste plek per cluster.
  const dipOp = Math.max(1, Math.round(laatste * (0.45 + 0.2 * toeval(`${cluster.sleutel}:dip`))));
  if (k === dipOp && k < laatste) score -= 3 + Math.round(3 * toeval(`${cluster.sleutel}:dipgrootte`));
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Het aandeel van een concurrent op meetmoment `k`, lineair van start naar nu. */
export function concurrentAandeel(c: { start: number; nu: number }, k: number, laatste: number): number {
  const t = laatste <= 0 ? 1 : k / laatste;
  return c.start + (c.nu - c.start) * t;
}

// ── De vragen ───────────────────────────────────────────────────────────────

const INTENTIE: Record<Fase, "informational" | "commercial" | "transactional"> = {
  O: "informational",
  V: "commercial",
  B: "transactional",
};
const CATEGORIE: Record<Fase, string> = { O: "Oriëntatie", V: "Overweging", B: "Beslissing" };
const BAND: Record<string, "hoog" | "midden" | "laag"> = { h: "hoog", m: "midden", l: "laag" };

export interface DemoPrompt {
  id: string;
  index: number;
  tekst: string;
  categorie: string;
  intentie: "informational" | "commercial" | "transactional";
  band: "hoog" | "midden" | "laag";
  onderwerp: string;
  gewicht: number;
  /** Hoe makkelijk RunX hier genoemd wordt: laag = vroeg genoemd. */
  drempel: number;
  /** Noemt AI hier geen enkele aanbieder (een zuivere kennisvraag)? */
  zonderMerken: boolean;
  /** Welke stad de vraag noemt, als hij er een noemt. */
  stad: string | null;
}

const STADSNAMEN: [RegExp, string][] = [
  [/Apeldoorn|Deventer|Veluwe|Posbank/, "Apeldoorn"],
  [/Groningen/, "Groningen"],
  [/Haarlem|duinen bij Haarlem/, "Haarlem"],
  [/Tilburg|Loonse/, "Tilburg"],
  [/Enschede|Twente|Hengelo|Holterberg/, "Enschede"],
  [/Zaandam|Zaanstreek|Amsterdam/, "Zaandam"],
];

export function stadVan(tekst: string): string | null {
  for (const [re, stad] of STADSNAMEN) if (re.test(tekst)) return stad;
  return null;
}

/** Kennisvragen waar AI geen winkel bij noemt: een uitleg, geen aanbeveling. */
const KENNISVRAAG = /^(Wat is|Wat betekent|Wat doet|Hoe weet ik|Hoe zie je|Waarom|Hoeveel rustdagen|Wat eet je|Hoe lang duurt het)/;

export function promptsVan(cluster: DemoCluster): DemoPrompt[] {
  return cluster.vragen.map((v: DemoVraag, index) => {
    const [fase, onderwerp, tekst, band] = v;
    const intentie = INTENTIE[fase];
    const bandNaam = BAND[band];
    const stad = stadVan(tekst);
    // Vragen met een stad en beslisvragen worden het eerst gewonnen: daar
    // schreef RunX de eerste pagina's voor. Kennisvragen het laatst.
    const basis = toeval(`${cluster.sleutel}:${index}:drempel`);
    const voorsprong = (stad ? -0.25 : 0) + (fase === "B" ? -0.1 : fase === "O" ? 0.15 : 0);
    return {
      id: demoId(`prompt:${cluster.sleutel}:${index}`),
      index,
      tekst,
      categorie: CATEGORIE[fase],
      intentie,
      band: bandNaam,
      onderwerp,
      gewicht: promptWeight(bandNaam, intentie),
      drempel: Math.max(0, Math.min(1, basis + voorsprong)),
      zonderMerken: fase === "O" && KENNISVRAAG.test(tekst) && toeval(`${cluster.sleutel}:${index}:kaal`) < 0.6,
      stad,
    };
  });
}

// ── Eén meting ──────────────────────────────────────────────────────────────

export interface DemoNoeming {
  naam: string;
  eigen: boolean;
  genoemd: boolean;
  positie: number | null;
  bronnen: string[];
  rol: "eerste_aanbeveling" | "een_van_meerdere" | "zijdelings" | null;
}

export interface DemoRun {
  id: string;
  promptId: string;
  weekNo: number;
  op: Date;
  gewicht: number;
  categorie: string;
  tekst: string;
  antwoord: string;
  noemingen: DemoNoeming[];
}

const DOMEIN: Record<string, string> = {
  Run2Day: "run2day.nl",
  Runnersworld: "runnersworld.nl",
  Decathlon: "decathlon.nl",
  Intersport: "intersport.nl",
  Zalando: "zalando.nl",
  Bol: "bol.com",
  Sportsdirect: "sportsdirect.com",
  Bever: "bever.nl",
  "Start to Run": "starttorun.nl",
  "Basic-Fit": "basic-fit.com",
};

/**
 * Bij welke vragen staat RunX in het antwoord, op dit meetmoment?
 *
 * Over de winbare vragen (een kennisvraag zonder enige aanbieder telt niet mee
 * in de score), op volgorde van drempel: zo komt de ongewogen score precies op
 * het doel van dit moment uit. Omdat het doel stijgt, blijft een vraag die
 * eenmaal gewonnen is gewonnen; alleen de dip haalt er tijdelijk een paar af.
 */
export function genoemdOp(cluster: DemoCluster, prompts: readonly DemoPrompt[], weekNo: number, laatste: number): Set<number> {
  const winbaar = prompts.filter((p) => !p.zonderMerken).sort((a, b) => a.drempel - b.drempel || a.index - b.index);
  const aantal = Math.round((doelScore(cluster, weekNo, laatste) / 100) * winbaar.length);
  return new Set(winbaar.slice(0, aantal).map((p) => p.index));
}

/**
 * Wie staat er in het antwoord op deze vraag, op dit meetmoment?
 *
 * RunX volgens `genoemdOp()`. De concurrenten staan erin met een kans die
 * meeloopt met hun aandeel.
 *
 * `eigenPagina` is het adres van een geplaatste RunX-pagina over deze vraag,
 * als die er op dit moment al is: dan citeert AI hem.
 */
export function meet(args: {
  cluster: DemoCluster;
  prompt: DemoPrompt;
  moment: Meetmoment;
  laatste: number;
  eigenPagina: string | null;
  /** Uit `genoemdOp()`: staat RunX op dit moment in het antwoord? */
  runxGenoemd: boolean;
}): DemoRun {
  const { cluster, prompt, moment, laatste } = args;
  const sleutel = `${cluster.sleutel}:${prompt.index}:${moment.weekNo}`;
  const runxGenoemd = !prompt.zonderMerken && args.runxGenoemd;

  const noemingen: DemoNoeming[] = [];
  if (!prompt.zonderMerken) {
    const concurrenten = cluster.concurrenten
      .map((c) => ({ naam: c.naam, kans: Math.min(0.92, (concurrentAandeel(c, moment.weekNo, laatste) / 100) * 2.6) }))
      .filter((c) => toeval(`${sleutel}:${c.naam}`) < c.kans);
    // Een winbare vraag zonder RunX heeft altijd minstens één andere winkel.
    if (concurrenten.length === 0 && !runxGenoemd) concurrenten.push({ naam: cluster.concurrenten[0].naam, kans: 1 });

    // RunX als eerste: vaker naarmate het jaar vordert, en bij een stadsvraag.
    const eerste = runxGenoemd && toeval(`${sleutel}:eerste`) < 0.35 + 0.4 * (moment.weekNo / Math.max(1, laatste)) + (prompt.stad ? 0.15 : 0);
    const volgorde: string[] = [];
    if (runxGenoemd && eerste) volgorde.push("RunX");
    for (const c of concurrenten) volgorde.push(c.naam);
    if (runxGenoemd && !eerste) volgorde.splice(Math.min(volgorde.length, 1 + Math.floor(toeval(`${sleutel}:plek`) * 2)), 0, "RunX");

    volgorde.forEach((naam, i) => {
      const eigen = naam === "RunX";
      noemingen.push({
        naam,
        eigen,
        genoemd: true,
        positie: i + 1,
        bronnen: eigen
          ? [args.eigenPagina ?? (prompt.stad ? winkelVan(prompt.stad).url : "https://runx.nl/")].filter(Boolean)
          : DOMEIN[naam] ? [`https://www.${DOMEIN[naam]}/`] : [],
        rol: i === 0 ? "eerste_aanbeveling" : "een_van_meerdere",
      });
    });
  }
  // Het eigen merk heeft altijd een oordeel, ook als het niet genoemd is: een
  // meting zonder eigen-merkrij telt niet mee (`computeAggregates()`).
  if (!noemingen.some((n) => n.eigen)) {
    noemingen.push({ naam: "RunX", eigen: true, genoemd: false, positie: null, bronnen: [], rol: null });
  }
  // De merken die RunX voert, als product in het antwoord.
  for (const merk of cluster.merken) {
    if (toeval(`${sleutel}:merk:${merk}`) < 0.45) {
      noemingen.push({ naam: merk, eigen: false, genoemd: true, positie: null, bronnen: [], rol: "zijdelings" });
    }
  }

  return {
    id: demoId(`run:${sleutel}`),
    promptId: prompt.id,
    weekNo: moment.weekNo,
    op: new Date(moment.op.getTime() + prompt.index * 47_000),
    gewicht: prompt.gewicht,
    categorie: prompt.categorie,
    tekst: prompt.tekst,
    antwoord: antwoordTekst(cluster, prompt, noemingen, sleutel),
    noemingen,
  };
}

function winkelVan(stad: string) {
  return WINKELS.find((w) => w.stad === stad) ?? WINKELS[0];
}

// ── De antwoordtekst ────────────────────────────────────────────────────────

const OPENING: Record<string, string[]> = {
  loopanalyse: [
    "Een loopanalyse helpt je een schoen te kiezen die past bij hoe je voet landt en afrolt.",
    "Bij een loopanalyse kijkt iemand naar je looppatroon, meestal op een loopband met video.",
  ],
  schoenen: [
    "De juiste hardloopschoen hangt af van je gewicht, je ondergrond, hoeveel je loopt en hoe je voet landt.",
    "Er is geen beste schoen voor iedereen; wel een schoen die past bij jouw manier van lopen.",
  ],
  blessures: [
    "Veel hardloopklachten ontstaan door te snel opbouwen of door schoenen die niet (meer) passen.",
    "Bij aanhoudende pijn is een fysiotherapeut of sportarts de eerste stap; voor schoenen en zolen helpt een speciaalzaak.",
  ],
  stad: [
    "Er zijn in de regio een paar plekken waar je goed terechtkunt.",
    "Lokale hardloopwinkels kennen vaak ook de routes en loopgroepen in de buurt.",
  ],
  beginnen: [
    "Beginnen met hardlopen gaat het best met korte stukken hardlopen afgewisseld met wandelen, drie keer per week.",
    "Voor beginners is vooral een goede schoen en een haalbaar schema belangrijk.",
  ],
  wedstrijd: [
    "Voor een wedstrijd telt vooral dat je schoen en je voeding vooraf getest zijn.",
    "Wedstrijdschoenen met een carbon plaat zijn lichter en reactiever, maar niet voor iedereen nodig.",
  ],
  trail: [
    "Op onverharde paden heb je vooral grip en bescherming nodig.",
    "Trailrunning vraagt om andere schoenen en vaak wat extra uitrusting.",
  ],
  hyrox: [
    "HYROX combineert acht keer een kilometer hardlopen met acht functionele oefeningen.",
    "Voor HYROX zoek je een schoen die goed loopt en stabiel staat bij de oefeningen.",
  ],
};

const AFSLUITING: Record<string, string> = {
  loopanalyse: "Tip: neem je oude hardloopschoenen mee naar de analyse, de slijtage zegt veel over hoe je loopt.",
  schoenen: "Tip: pas schoenen aan het eind van de dag, dan zijn je voeten iets dikker, zoals tijdens het lopen.",
  blessures: "Blijft de pijn langer dan een week of wordt hij erger, laat het dan nakijken.",
  stad: "Veel winkels organiseren ook loopgroepen; vraag ernaar als je samen wilt trainen.",
  beginnen: "Bouw rustig op: liever drie keer per week kort dan één keer te lang.",
  wedstrijd: "Probeer niets nieuws op de wedstrijddag, ook geen nieuwe schoenen of gels.",
  trail: "Begin op een bekende route en bouw de afstand rustig op.",
  hyrox: "Train de overgang van oefening naar lopen, daar verlies je de meeste tijd.",
};

/**
 * Een antwoord zoals ChatGPT het op deze vraag zou geven, met precies de
 * partijen uit de noemingen en in die volgorde. Dat is wat het bewijs per
 * vraag laat zien, dus het moet kloppen met wat er geteld wordt.
 */
export function antwoordTekst(cluster: DemoCluster, prompt: DemoPrompt, noemingen: DemoNoeming[], sleutel: string): string {
  const opening = OPENING[cluster.sleutel] ?? OPENING.schoenen;
  const regels: string[] = [opening[Math.floor(toeval(`${sleutel}:open`) * opening.length)]];
  const aanbieders = noemingen.filter((n) => n.genoemd && n.positie !== null).sort((a, b) => (a.positie ?? 0) - (b.positie ?? 0));
  const merken = noemingen.filter((n) => n.genoemd && n.positie === null).map((n) => n.naam);

  if (aanbieders.length > 0) {
    regels.push("", prompt.stad ? `In en rond ${prompt.stad} kun je onder meer hier terecht:` : "Plekken die vaak worden aangeraden:", "");
    aanbieders.forEach((n, i) => {
      if (n.eigen) {
        const w = prompt.stad ? winkelVan(prompt.stad) : null;
        regels.push(
          w
            ? `${i + 1}. **${w.naam}** (${w.adres}): hardloopspeciaalzaak met een gratis loopanalyse bij aanschaf van nieuwe hardloopschoenen. ${w.feit}`
            : `${i + 1}. **RunX**: ${WAAROM.RunX}.`,
        );
      } else {
        regels.push(`${i + 1}. **${n.naam}**: ${WAAROM[n.naam] ?? "een bekende aanbieder"}.`);
      }
    });
  }
  if (merken.length > 0) {
    regels.push("", `Merken die bij deze vraag vaak genoemd worden zijn ${merken.slice(0, -1).join(", ")}${merken.length > 1 ? " en " : ""}${merken[merken.length - 1]}.`);
  }
  regels.push("", AFSLUITING[cluster.sleutel] ?? AFSLUITING.schoenen);
  return regels.join("\n");
}
