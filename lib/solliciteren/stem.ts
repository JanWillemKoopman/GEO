/**
 * Jouw schrijfstijl, gemeten in plaats van gevraagd.
 *
 * ── HET PROBLEEM DAT DIT OPLOST ────────────────────────────────────────────
 *
 * In de systeemprompt stond "gebruik de woorden uit het CV zelf". Dat is een
 * verzoek. Een model dat een brief schrijft heeft een eigen register, en dat
 * register wint van een zin in de instructie zodra het gesprek langer wordt.
 * Het resultaat is een brief die klopt en die niet van jou is, en dat merk je
 * pas als je hem hardop leest.
 *
 * Deze module leest jouw eerdere brieven en meet er een handvol dingen aan die
 * je zelf niet zou opschrijven maar wel meteen herkent: hoe lang je zinnen
 * zijn, of je "u" of "je" schrijft, hoe vaak je een zin met "Ik" begint, hoe
 * groot je alinea's zijn, en welke woorden echt van jou zijn. Die maten gaan
 * als harde grenzen de prompt in, en na afloop wordt de geschreven brief er
 * opnieuw langs gelegd. Conventie 1: elke promptinstructie een vangnet in code.
 *
 * ── WAT DIT NADRUKKELIJK NIET IS ───────────────────────────────────────────
 *
 * Dit meet vorm, geen inhoud en geen kwaliteit. Een brief met jouw zinslengte
 * en jouw aanspreekvorm kan nog steeds nietszeggend zijn. Het scherm zegt
 * daarom "dit wijkt af van hoe jij schrijft" en nooit "dit is fout".
 *
 * Pure module zonder `server-only` (conventie 2): de meting draait in de
 * browser terwijl je een brief toevoegt, en wordt nagerekend in
 * `scripts/test-unit.ts`.
 */
import {
  STOPWOORDEN,
  splitsInAlineas,
  splitsInWoorden,
  splitsInZinnen,
} from "@/lib/solliciteren/woorden";

/**
 * Hoeveel woorden er minstens moeten liggen voordat een meting iets betekent.
 *
 * Onder de 150 woorden is het gemiddelde van de zinslengte een toevalstreffer:
 * één lange opsomming verschuift hem dan met vijf woorden. `meetStem` geeft
 * daaronder `null` en niet een slag in de lucht (conventie 3), en het scherm
 * zegt dan hoeveel er nog bij moet.
 */
export const MINIMUM_WOORDEN = 150;

export interface Stemprofiel {
  /** Hoeveel brieven dit profiel dragen. */
  bronnen: number;
  /** Hoeveel woorden die brieven samen tellen. */
  woorden: number;
  /** Gemiddeld aantal woorden per zin, afgerond. */
  woordenPerZin: number;
  /** Hoe lang jouw langere zinnen zijn: de op één na langste van elke tien. */
  langereZin: number;
  /** Schrijf je "u" of "je" tegen de lezer? `null` als het niet uit te maken is. */
  aanspreekvorm: "u" | "je" | null;
  /** Gemiddeld aantal zinnen per alinea, op één decimaal. */
  zinnenPerAlinea: number;
  /** Van elke honderd zinnen: hoeveel beginnen er met "Ik". */
  ikBegin: number;
  /** Woorden die bij jou vaker terugkomen dan gewoon. Hoogstens twaalf. */
  eigenWoorden: string[];
}

/** Het percentiel dat "een langere zin van jou" heet. Zie `langereZin`. */
const PERCENTIEL_LANGE_ZIN = 0.9;

/**
 * Meet de stem uit een of meer eerdere brieven.
 *
 * Alleen brieven, geen CV: een CV is opsommingen en jaartallen, en dat register
 * hoort een brief juist niet te hebben. Dat onderscheid staat in de database
 * (`sollicitatie_documenten.soort`, migratie 0096) en niet alleen hier.
 *
 * Geeft `null` als er te weinig ligt. Een profiel dat op 40 woorden is gemeten
 * ziet er op het scherm precies zo betrouwbaar uit als een profiel op 4000
 * woorden, en dat is het niet.
 */
export function meetStem(brieven: readonly string[]): Stemprofiel | null {
  const teksten = brieven.map((b) => (b ?? "").trim()).filter((b) => b.length > 0);
  if (teksten.length === 0) return null;

  const samen = teksten.join("\n\n");
  const alleWoorden = splitsInWoorden(samen);
  if (alleWoorden.length < MINIMUM_WOORDEN) return null;

  const zinnen = splitsInZinnen(samen);
  if (zinnen.length === 0) return null;

  const lengtes = zinnen.map((zin) => splitsInWoorden(zin).length).sort((a, b) => a - b);
  const totaalWoorden = lengtes.reduce((som, n) => som + n, 0);

  // Het 90e percentiel en niet de allerlangste zin: één uitschieter uit een
  // opsomming zou anders de grens bepalen waaraan de hele brief wordt getoetst.
  const index = Math.min(lengtes.length - 1, Math.floor(lengtes.length * PERCENTIEL_LANGE_ZIN));

  const alineas = teksten.flatMap((tekst) => splitsInAlineas(tekst));
  const zinnenPerAlinea =
    alineas.length === 0
      ? zinnen.length
      : alineas.reduce((som, a) => som + splitsInZinnen(a).length, 0) / alineas.length;

  return {
    bronnen: teksten.length,
    woorden: alleWoorden.length,
    woordenPerZin: Math.round(totaalWoorden / zinnen.length),
    langereZin: lengtes[index],
    aanspreekvorm: bepaalAanspreekvorm(alleWoorden),
    zinnenPerAlinea: Math.round(zinnenPerAlinea * 10) / 10,
    ikBegin: Math.round((zinnen.filter(begintMetIk).length / zinnen.length) * 100),
    eigenWoorden: zoekEigenWoorden(alleWoorden),
  };
}

/** Begint deze zin met "Ik"? De eerste twee letters, hoofdletter of niet. */
function begintMetIk(zin: string): boolean {
  return /^ik\b/i.test(zin.trim());
}

/**
 * "u" of "je"?
 *
 * Geteld op de vormen die eenduidig zijn. "u" is in het Nederlands ook geen
 * ander woord, dus dat telt gewoon mee; "je" telt alleen mee met zijn
 * bezittelijke vormen erbij, anders zou "je" in "zoals je weet" de doorslag
 * geven in een brief die verder consequent "u" schrijft.
 *
 * `null` bij gelijkspel of bij te weinig treffers: dan is er geen voorkeur om
 * aan het model op te leggen, en een gok is hier erger dan zwijgen.
 */
function bepaalAanspreekvorm(woorden: readonly string[]): "u" | "je" | null {
  let u = 0;
  let je = 0;
  for (const woord of woorden) {
    if (woord === "u" || woord === "uw") u += 1;
    if (woord === "je" || woord === "jij" || woord === "jouw" || woord === "jullie") je += 1;
  }
  if (u + je < 3) return null;
  if (u === je) return null;
  return u > je ? "u" : "je";
}

/**
 * De woorden die bij jou vaker terugkomen dan gewoon.
 *
 * Minstens vijf letters, geen stopwoord, minstens twee keer gebruikt. Dat is
 * een grove zeef en dat is precies de bedoeling: dit is materiaal waaraan je
 * jezelf herkent ("aanpak", "opdrachtgever", "doorlooptijd"), geen woordenboek
 * dat het model moet naspellen.
 */
function zoekEigenWoorden(woorden: readonly string[]): string[] {
  const tellingen = new Map<string, number>();
  for (const woord of woorden) {
    if (woord.length < 5) continue;
    if (STOPWOORDEN.has(woord)) continue;
    if (/^\p{N}+$/u.test(woord)) continue;
    tellingen.set(woord, (tellingen.get(woord) ?? 0) + 1);
  }
  return [...tellingen.entries()]
    .filter(([, aantal]) => aantal >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "nl"))
    .slice(0, 12)
    .map(([woord]) => woord);
}

/**
 * De gemeten stem als regels voor de systeemprompt.
 *
 * Getallen en geen bijvoeglijke naamwoorden: "gemiddeld 14 woorden per zin" is
 * een instructie die een model kan volgen en die code kan nameten, "schrijf
 * beknopt" is geen van beide.
 */
export function formuleerStemregels(profiel: Stemprofiel): string[] {
  const regels: string[] = [
    `Gemiddeld ${profiel.woordenPerZin} woorden per zin. Een enkele zin mag richting ${profiel.langereZin} woorden, langer niet.`,
    `Alinea's van ongeveer ${profiel.zinnenPerAlinea} zinnen.`,
  ];

  if (profiel.aanspreekvorm) {
    regels.push(
      profiel.aanspreekvorm === "u"
        ? 'Spreek de lezer aan met "u", nooit met "je".'
        : 'Spreek de lezer aan met "je", nooit met "u".',
    );
  }

  // Alleen noemen als het een uitgesproken gewoonte is. Bij 20 procent is het
  // geen kenmerk en zou de instructie iets opleggen dat er niet was.
  if (profiel.ikBegin >= 35) {
    regels.push(
      `Ongeveer ${profiel.ikBegin} van de 100 zinnen beginnen bij deze schrijver met "Ik". Dat mag hier ook.`,
    );
  } else if (profiel.ikBegin <= 10) {
    regels.push('Deze schrijver begint zijn zinnen zelden met "Ik". Doe dat hier ook niet.');
  }

  if (profiel.eigenWoorden.length >= 4) {
    regels.push(
      `Woorden die deze schrijver echt gebruikt: ${profiel.eigenWoorden.join(", ")}. Gebruik ze waar ze passen, en verzin er geen mooiere variant op.`,
    );
  }

  return regels;
}

export interface Stemafwijking {
  /** Waar het over gaat, voor op het scherm. */
  wat: string;
  /** Wat er in de geschreven tekst staat. */
  deze: string;
  /** Wat jij normaal doet. */
  jij: string;
}

/**
 * Hoeveel een gemeten waarde van jouw gemiddelde mag afwijken voordat het
 * opvalt. 25 procent: onder die grens is het verschil kleiner dan de spreiding
 * tussen twee brieven van dezelfde persoon, en dan wijs je ruis aan.
 */
const SPELING = 0.25;

/**
 * Leg een geschreven brief naast het profiel.
 *
 * Dit is het vangnet onder `formuleerStemregels()` hierboven: de prompt vraagt
 * erom, deze functie rekent na of het gebeurd is. Een lege lijst betekent dat
 * de brief binnen jouw eigen marges valt.
 */
export function toetsStem(brief: string, profiel: Stemprofiel | null): Stemafwijking[] {
  if (!profiel || !brief.trim()) return [];

  const zinnen = splitsInZinnen(brief);
  if (zinnen.length < 3) return [];

  const afwijkingen: Stemafwijking[] = [];

  const lengtes = zinnen.map((zin) => splitsInWoorden(zin).length);
  const gemiddelde = Math.round(lengtes.reduce((som, n) => som + n, 0) / zinnen.length);
  const verschil = Math.abs(gemiddelde - profiel.woordenPerZin) / profiel.woordenPerZin;
  if (verschil > SPELING) {
    afwijkingen.push({
      wat: "Zinslengte",
      deze: `${gemiddelde} woorden per zin`,
      jij: `${profiel.woordenPerZin} woorden per zin`,
    });
  }

  const teLang = lengtes.filter((n) => n > profiel.langereZin).length;
  if (teLang > 0) {
    afwijkingen.push({
      wat: "Lange zinnen",
      deze: `${teLang} ${teLang === 1 ? "zin" : "zinnen"} boven ${profiel.langereZin} woorden`,
      jij: `zelden boven ${profiel.langereZin} woorden`,
    });
  }

  if (profiel.aanspreekvorm) {
    const gebruikt = bepaalAanspreekvorm(splitsInWoorden(brief));
    if (gebruikt && gebruikt !== profiel.aanspreekvorm) {
      afwijkingen.push({
        wat: "Aanspreekvorm",
        deze: `"${gebruikt}"`,
        jij: `"${profiel.aanspreekvorm}"`,
      });
    }
  }

  return afwijkingen;
}
