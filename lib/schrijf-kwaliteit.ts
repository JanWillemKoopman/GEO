/**
 * De schrijfkwaliteitswaarschuwing: signaleert of het klantgesprek dun is
 * vóórdat er pagina's geschreven worden (`docs/doorloop-van-klant-tot-content.md`,
 * "tien belangrijkste punten om te bespreken", punt 6).
 *
 * ── WAAROM DIT APART VAN DE VOLLEDIGHEIDSMETER STAAT (`lib/profile-meter.ts`) ─
 *
 * De volledigheidsmeter telt tientallen velden bij elkaar op; een leeg
 * "Verhalen" verdwijnt daarin tussen dertig andere velden. Dit zijn precies de
 * drie velden die rechtstreeks naar de schrijver van élke pagina gaan (blok A,
 * `lib/pagina/schrijfopdracht.ts`) en die geen enkele andere controle dekt: een
 * dunne invoer hier geeft geen fout, geen gele zin en geen herschrijving, de app
 * schrijft gewoon door met wat er is. Vandaar een eigen, herkenbare melding.
 *
 * Puur en zonder `server-only` (conventie 2): rechtstreeks testbaar vanuit
 * `scripts/test-unit.ts`, en bruikbaar zowel op de server (het plan-scherm) als
 * client-side (de onboardingsessie, die de velden al in state heeft).
 */
import type { Profile, StemVoorbeeld } from "@/lib/types/database";

/** Onder deze lengte telt "Verhalen" als te dun om een schrijver iets te geven. */
const VERHALEN_MIN_LENGTE = 80;

export type SchrijfKwaliteitSignaal = "verhalen" | "stem_voorbeelden" | "taboo_phrases";

export interface SchrijfKwaliteitWaarschuwing {
  signaal: SchrijfKwaliteitSignaal;
  label: string;
}

const LABELS: Record<SchrijfKwaliteitSignaal, string> = {
  verhalen: "“Verhalen” is leeg of erg kort",
  stem_voorbeelden: "Geen stemvoorbeelden ingevuld",
  taboo_phrases: "Geen verboden woorden ingevuld",
};

/**
 * Welke van de drie signalen zwak staan. Blokkeert niets (conventie 3: een
 * ontbrekend antwoord is een betere waarde dan een gegokte drempel) en geeft
 * dus alleen aan wat de consultant nog kan aanvullen vóór er geschreven wordt.
 */
export function beoordeelSchrijfKwaliteit(
  profile: Pick<Profile, "verhalen" | "stem_voorbeelden" | "taboo_phrases">,
): SchrijfKwaliteitWaarschuwing[] {
  const waarschuwingen: SchrijfKwaliteitWaarschuwing[] = [];

  if ((profile.verhalen ?? "").trim().length < VERHALEN_MIN_LENGTE) {
    waarschuwingen.push({ signaal: "verhalen", label: LABELS.verhalen });
  }

  const stemVoorbeelden = (profile.stem_voorbeelden ?? []) as StemVoorbeeld[];
  const heeftOpgehaaldeStem = stemVoorbeelden.some((s) => (s.tekst ?? "").trim().length > 0);
  if (!heeftOpgehaaldeStem) {
    waarschuwingen.push({ signaal: "stem_voorbeelden", label: LABELS.stem_voorbeelden });
  }

  if ((profile.taboo_phrases ?? []).length === 0) {
    waarschuwingen.push({ signaal: "taboo_phrases", label: LABELS.taboo_phrases });
  }

  return waarschuwingen;
}
