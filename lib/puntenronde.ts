import {
  bundelOpSoort,
  issueSleutel,
  leesbareBevinding,
  type GegroepeerdeBevinding,
} from "@/lib/pipeline/quality-groups";
import { zinSleutel } from "@/lib/geaccepteerde-zinnen";

/**
 * De punten van "Te verbeteren" één voor één doorlopen.
 *
 * ── WAAROM (23 september 2026) ──────────────────────────────────────────────
 *
 * De eigenaar noemde de rail "een dood eind": een oranje zin zei dat er iets
 * mis was, maar niet wat je nu moest doen. Een klik op de zin sprong alleen
 * naar de tekst. En wie ORBIT ENGINE iets wilde laten oplossen, moest op twee
 * plekken klikken: in de rail (die het vak onderaan vulde) en daarna in dat vak
 * nog eens op "Schrijf een nieuwe versie".
 *
 * Nu opent elk punt een venster met één vraag: hoe wil je dit oplossen? Vier
 * antwoorden: ORBIT ENGINE laten oplossen, zelf aanpassen, laten staan (alleen
 * bij een zin zonder bron) of overslaan. Na elke keuze volgt het volgende punt.
 * Aan het eind staat één knop die alles wat op de lijst staat in ÉÉN
 * schrijfronde meegeeft.
 *
 * ⚠️ "ORBIT ENGINE laten oplossen" herschrijft dus niet meteen die ene zin. Dat
 * is bewust (`docs/tasks/herontwerp-contentpagina.md` §8.1): fijner knippen
 * maakte de tekst in dit systeem twee keer slechter (reparatiescore 67, 74, 68,
 * 48). De keuze zet het punt op een lijst, en de lijst gaat langs dezelfde
 * route, dezelfde poort en dezelfde nieuwe versie als het vak onderaan.
 *
 * Puur en zonder `server-only` (conventie 2).
 */

export type Keuze =
  | { soort: "orbit" }
  | { soort: "zelf" }
  | { soort: "staan" }
  | { soort: "overslaan" };

export type Keuzes = Readonly<Partial<Record<string, Keuze>>>;

/**
 * De sleutel van één punt, zodat een keuze aan het punt blijft hangen en niet
 * aan zijn plek in de lijst. Na "Klopt, laat staan" ververst het scherm en
 * verdwijnt dat punt: een index zou dan naar het verkeerde punt wijzen.
 *
 * Sectie en bevinding (`issueSleutel`) plus de zin zelf: twee punten van
 * dezelfde soort in dezelfde sectie verschillen alleen in hun zin.
 */
export function puntSleutel(item: GegroepeerdeBevinding): string {
  return `${issueSleutel(item.issue)}|${zinSleutel(item.issue.evidence ?? "")}`;
}

/**
 * De volgorde waarin de punten langskomen: dezelfde als in de rail, dus per
 * soort gebundeld. Anders springt het venster heen en weer tussen soorten
 * terwijl de lijst ernaast ze bij elkaar toont.
 */
export function rondeVolgorde(blokkades: GegroepeerdeBevinding[]): GegroepeerdeBevinding[] {
  return bundelOpSoort(blokkades).flatMap((b) => b.items);
}

/**
 * Het eerstvolgende punt zonder keuze, NA het punt `na`, en anders vanaf het
 * begin. `null` als elk punt een keuze heeft: dan is de ronde klaar.
 */
export function volgendOpen(
  volgorde: readonly GegroepeerdeBevinding[],
  keuzes: Keuzes,
  na: string | null,
): string | null {
  const sleutels = volgorde.map(puntSleutel);
  const start = na === null ? 0 : sleutels.indexOf(na) + 1;
  for (let i = 0; i < sleutels.length; i++) {
    const s = sleutels[(start + i) % sleutels.length];
    if (!keuzes[s]) return s;
  }
  return null;
}

export interface Telling {
  orbit: number;
  zelf: number;
  staan: number;
  overslaan: number;
  /** Nog geen keuze. */
  open: number;
}

/** Hoeveel punten welke keuze hebben. Alleen punten die er nu nog staan tellen. */
export function telKeuzes(volgorde: readonly GegroepeerdeBevinding[], keuzes: Keuzes): Telling {
  const t: Telling = { orbit: 0, zelf: 0, staan: 0, overslaan: 0, open: 0 };
  for (const item of volgorde) {
    const k = keuzes[puntSleutel(item)];
    if (k) t[k.soort]++;
    else t.open++;
  }
  return t;
}

/**
 * Wat er voor één bevinding in de schrijfopdracht komt. Dezelfde vorm als het
 * vak onderaan altijd al kreeg: de sectie, wat er mis is, en de aanbeveling die
 * het reparatiemodel toch al als opdracht kreeg.
 */
export function opdrachtVan(item: GegroepeerdeBevinding): string {
  const { issue } = item;
  const plek = issue.section?.trim() ? `In "${issue.section.trim()}": ` : "";
  const wat = leesbareBevinding(issue.finding);
  const hoe = issue.recommendation?.trim() ? ` ${leesbareBevinding(issue.recommendation)}` : "";
  return `${plek}${wat}${hoe}`;
}

/** De opdrachten van alle punten die ORBIT ENGINE mag oplossen, in volgorde. */
export function lijstVoorOrbit(volgorde: readonly GegroepeerdeBevinding[], keuzes: Keuzes): string[] {
  return volgorde.filter((item) => keuzes[puntSleutel(item)]?.soort === "orbit").map(opdrachtVan);
}

/**
 * De schrijfopdracht die naar de route gaat: eerst de punten van de lijst,
 * daarna wat de klant er in eigen woorden bij zette. Lege delen vallen weg.
 */
export function schrijfopdracht(lijst: readonly string[], eigen: string): string {
  return [...lijst, eigen.trim()].filter((r) => r.trim().length > 0).join("\n");
}

/** Het stuk `bereik` in `tekst` vervangen door `nieuw`. */
export function vervangBereik(tekst: string, bereik: { begin: number; eind: number }, nieuw: string): string {
  return tekst.slice(0, bereik.begin) + nieuw + tekst.slice(bereik.eind);
}
