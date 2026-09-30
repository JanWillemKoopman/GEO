/**
 * De woordenlijst van docs/schrijfstijl.md §11, als regels die een test kan
 * afdwingen.
 *
 * ⚠️ Waarom in code en niet alleen in het document: de woordenlijst stond er
 * sinds augustus 2026, en op 30 september 2026 stonden er toch nog 35 verboden
 * woorden in de app, 17 keer "We konden ORBIT ENGINE niet bereiken" en een
 * menu dat "Search console" zei boven een pagina die "Zoekverkeer" heette
 * (docs/logbook.md, "30 september 2026: taalaudit"). Het verbod op gedachtestreepjes had wél een test
 * en is nooit teruggekomen. `scripts/test-unit.ts` legt elke schermtekst uit
 * `app/` en `components/` langs deze lijst.
 *
 * Elke regel zegt wat er niet mag en wat er wel moet, zodat de testmelding
 * meteen de oplossing noemt. Een tekst die bewust afwijkt (een voorbeeldzin in
 * de stem van de klant, zoals "Wij werken met eigen monteurs") staat in
 * `WOORDENLIJST_UITZONDERINGEN`, letterlijk, zodat een nieuwe afwijking niet
 * stilletjes meelift.
 */

export type Woordregel = {
  /** Wat er niet mag staan. */
  patroon: RegExp;
  /** Wat er wel hoort, voor in de testmelding. */
  liever: string;
};

export const WOORDENLIJST: readonly Woordregel[] = [
  // ── De stem (§3): ORBIT ENGINE doet het werk, je consultant is de mens ──
  { patroon: /\b(we|wij|ons|onze)\b/i, liever: "ORBIT ENGINE, of je consultant" },
  { patroon: /\bde schrijver\b/i, liever: "ORBIT ENGINE" },

  // ── Eén woord per begrip (§11) ──────────────────────────────────────────
  { patroon: /\bmislukt(e|en)?\b/i, liever: "niet gelukt" },
  { patroon: /\bmerkprofiel\b/i, liever: "merkdossier" },
  { patroon: /\b(bewaard|bewaren)\b/i, liever: "opgeslagen, of blijft staan" },
  { patroon: /\b(crawl|crawlen|crawler|gecrawld)\b/i, liever: "lezen, of onderzoek van de website" },
  { patroon: /\b(vrijgeven|vrijgegeven|vrijgave)\b/i, liever: "een maand starten" },
  { patroon: /\b(meet-vragen|meetvragen|prompts?)\b/i, liever: "AI-vragen" },
  { patroon: /\bthema('s)?\b/i, liever: "label (een groep clusters) of productgroep" },
  { patroon: /\brapport(en)?\b/i, liever: "de uitslag" },
  { patroon: /\bscore\b/i, liever: "zichtbaarheid" },
  { patroon: /\bcontent\b/i, liever: "pagina's of teksten" },
  { patroon: /\bonboarding\b/i, liever: "kennismakingsgesprek" },
  { patroon: /\bpubliceerde\b/, liever: "live staan: de klant plaatst zelf" },
  { patroon: /\buw\b/i, liever: "je, jouw" },

  // ── Menu in het Nederlands, merknamen met hoofdletter ───────────────────
  { patroon: /\b(Analytics|Admin|Support)\b/, liever: "Resultaten, Beheer, Hulp" },
  { patroon: /Search console/, liever: "Search Console, of Zoekverkeer als naam van het scherm" },

  // ── Vaste foutmeldingen (lib/meldingen.ts) ──────────────────────────────
  { patroon: /Controleer je verbinding|zo nog eens/i, liever: "GEEN_VERBINDING of nietGelukt() uit lib/meldingen.ts" },
];

/**
 * Teksten die bewust afwijken: een tekst die een van deze stukken letterlijk
 * bevat, slaat de test over. Houd deze lijst kort: elke regel hier is een
 * tekst die de test nooit meer bekijkt.
 */
export const WOORDENLIJST_UITZONDERINGEN: readonly string[] = [
  // Voorbeeldzinnen en keuzes in de stem van de klant: "wij" is daar de ondernemer.
  "Wij hebben geen btw-nummer",
  "Bijv. 'wij zijn de enige met een 24-uurs storingsdienst in de regio'",
  "Bijvoorbeeld: noem ook dat we in het weekend werken, en maak de opening korter.",
  "Vanaf november openen we in Breda",
  "&ldquo;Wij werken met eigen monteurs, geen onderaannemers&rdquo;",
  // Een WordPress-thema: zo heet het in het beheer van de klant zelf.
  "in een thema of beveiligingsplug-in",
];

/** Welke regels overtreedt deze tekst? Leeg als hij klopt of een uitzondering is. */
export function woordenlijstOvertredingen(tekst: string): Woordregel[] {
  const schoon = tekst.replace(/\s+/g, " ").trim();
  if (WOORDENLIJST_UITZONDERINGEN.some((u) => schoon.includes(u))) return [];
  return WOORDENLIJST.filter((r) => r.patroon.test(schoon));
}
