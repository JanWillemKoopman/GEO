/**
 * CITEERBARE KLANTANTWOORDEN: de motivering moet de parafrase overleven
 * (V4 uit `docs/tasks/contentkwaliteit-copywriterronde.md`).
 *
 * ── WAT ER MISGING ──────────────────────────────────────────────────────────
 *
 * Op vier van de twaalf pagina's van 3 september 2026 is een letterlijk
 * klantantwoord omgezet in een procedurezin, waarbij telkens de REDEN wegviel.
 * De reden was het overtuigende deel:
 *
 *   Klant:  "Doorwerken over houtrot heen doen we niet, ook niet als de klant
 *            erom vraagt, want dan kunnen we onze garantie op het werk niet
 *            waarmaken."
 *   Pagina: "Wordt tijdens isolatiewerk schade gevonden, dan legt MJB Dakservice
 *            het werk stil, maakt foto's en meldt eerst de herstelkosten."
 *
 * Het feit blijft, de motivering verdwijnt, en de zin gaat naar de derde
 * persoon. Precies het deel dat geen concurrent kan kopiëren, is eruit gehaald.
 * Zo ging het ook met "neem de schoenen mee waar je het meest op loopt, daar
 * zien we vaak aan waar de belasting zit" (de reden geschrapt, de schoenen
 * bewaard) en met "hoe lang herstel duurt zeggen we nooit vooraf, want we willen
 * geen verwachting wekken die we niet waar kunnen maken" (een belofte die een
 * beleidsregel werd).
 *
 * ── WAT DEZE MODULE DOET ────────────────────────────────────────────────────
 *
 * Antwoorden herkennen die een motivering bevatten en lang genoeg zijn om
 * eigen te klinken, ze apart aan de schrijver aanbieden als CITEERBAAR, en
 * achteraf meten of er minstens één van terug te vinden is. Puur en zonder
 * `server-only` (conventie 2).
 */

/** Woorden waarmee een ondernemer zijn reden inleidt. */
const MOTIVERING = /\b(want|omdat|daarom|zodat|anders kunnen|anders is|dus)\b/i;

/**
 * Onder dit aantal woorden klinkt een antwoord niet als iemand die praat.
 *
 * Vijftien, gekozen en niet gemeten. De vier antwoorden die op 3 september
 * sneuvelden waren 19, 21, 24 en 31 woorden lang; korte antwoorden als "ja" of
 * "binnen 24 uur" zijn feiten en geen citaten.
 */
export const MIN_WOORDEN_CITAAT = 15;

/** Hoeveel citeerbare antwoorden er hooguit in de prompt gaan. */
export const MAX_CITATEN = 6;

export interface Klantcitaat {
  /** Het antwoord zoals de klant het gaf, zonder de vraag ervoor. */
  tekst: string;
  woorden: number;
}

/** De vraag eraf halen: de kaart bewaart een feit als "vraag: antwoord". */
function antwoordDeel(tekst: string): string {
  const dubbelePunt = tekst.indexOf(":");
  // Alleen splitsen als er een echte vraag vóór staat; een dubbele punt
  // halverwege een zin ("Drie dingen: ...") hoort bij het antwoord.
  if (dubbelePunt > 12 && dubbelePunt < tekst.length - 20) {
    return tekst.slice(dubbelePunt + 1).trim();
  }
  return tekst.trim();
}

function telWoorden(tekst: string): number {
  return tekst.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w)).length;
}

/**
 * Welke klantantwoorden zijn het waard om vrijwel letterlijk over te nemen?
 *
 * Twee eisen: lang genoeg om eigen te klinken, en met een motivering erin.
 * Dat tweede is de kern: "wij werken met vier eigen dakdekkers" is een feit,
 * "want dan kunnen we onze garantie niet waarmaken" is een reden, en het is de
 * reden die de parafrase niet overleeft.
 */
export function vindCiteerbareAntwoorden(teksten: readonly string[]): Klantcitaat[] {
  const gevonden: Klantcitaat[] = [];
  const gezien = new Set<string>();

  for (const ruw of teksten) {
    const tekst = antwoordDeel(ruw ?? "");
    if (!tekst || !MOTIVERING.test(tekst)) continue;
    const woorden = telWoorden(tekst);
    if (woorden < MIN_WOORDEN_CITAAT) continue;
    const sleutel = tekst.toLowerCase().slice(0, 120);
    if (gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    gevonden.push({ tekst, woorden });
  }

  // Langste eerst: die dragen de meeste eigen taal.
  return gevonden.sort((a, b) => b.woorden - a.woorden).slice(0, MAX_CITATEN);
}

/**
 * Hoeveel van de betekenisvolle woorden van een antwoord staan in de tekst?
 *
 * Bewust een lossere maat dan `betekenisStaatInTekst()` in `bewijspunten.ts`:
 * daar gaat het om één zin die er letterlijk hoort te staan, hier om de vraag
 * of er íets van het antwoord is blijven hangen. Een parafrase die de helft van
 * de eigen woorden bewaart, telt mee.
 */
export function overlapMetTekst(citaat: string, tekst: string): number {
  const woorden = Array.from(
    new Set(
      citaat
        .toLowerCase()
        .replace(/[^a-z0-9àâéèêëîïôûùüÿç\s-]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 4),
    ),
  );
  if (woorden.length === 0) return 0;
  const laag = (tekst ?? "").toLowerCase();
  return woorden.filter((w) => laag.includes(w)).length / woorden.length;
}

/** Onder deze overlap is er van het antwoord niets teruggebleven. */
export const CITAAT_DREMPEL = 0.4;

export interface KlantcitatenResult {
  /** Hoeveel citeerbare antwoorden er waren. */
  beschikbaar: number;
  /** De hoogste overlap die één antwoord haalde, of null zonder antwoorden. */
  besteOverlap: number | null;
  issues: string[];
}

/**
 * Is er iets van de eigen woorden van de klant blijven staan?
 *
 * Eén hoeft er maar te halen. Dit is geen eis dat élk antwoord letterlijk in de
 * tekst komt: dat zou een pagina opleveren die uit citaten bestaat. Het is de
 * ondergrens dat er ergens op de pagina iemand aan het woord is.
 */
export function checkKlantcitaten(input: {
  citaten: readonly Klantcitaat[];
  tekst: string;
}): KlantcitatenResult {
  if (input.citaten.length === 0) {
    return { beschikbaar: 0, besteOverlap: null, issues: [] };
  }

  const overlappen = input.citaten.map((c) => overlapMetTekst(c.tekst, input.tekst));
  const beste = Math.max(...overlappen);

  if (beste >= CITAAT_DREMPEL) {
    return { beschikbaar: input.citaten.length, besteOverlap: beste, issues: [] };
  }

  const sterkste = input.citaten[0];
  return {
    beschikbaar: input.citaten.length,
    besteOverlap: beste,
    issues: [
      `De ondernemer heeft ${input.citaten.length} keer in eigen woorden uitgelegd waaróm hij iets ` +
        `doet, en daar is niets van teruggekomen in de tekst. Neem er minstens één vrijwel ` +
        `letterlijk over, inclusief de reden. Bijvoorbeeld: "${sterkste.tekst.slice(0, 160)}"`,
    ],
  };
}

/** Het promptblok met de citeerbare antwoorden. */
export function citatenblok(citaten: readonly Klantcitaat[]): string {
  if (citaten.length === 0) return "";
  const regels = citaten.map((c) => `- "${c.tekst}"`);
  return (
    `\nIN DE WOORDEN VAN DE ONDERNEMER. Dit heeft hij zelf gezegd, inclusief de reden erachter. ` +
    `Neem er minstens één vrijwel letterlijk over, mét die reden: dat is het deel dat geen ` +
    `concurrent kan kopiëren. Maak er geen procedurezin van, want dan blijft het feit staan en ` +
    `verdwijnt precies datgene wat overtuigt:\n${regels.join("\n")}`
  );
}
