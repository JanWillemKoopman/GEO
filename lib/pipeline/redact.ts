/**
 * Concurrentnamen uit een AI-antwoord halen (optimalisatie.md 4.3).
 *
 * Het winnende antwoord. Dat waarin de concurrent wél genoemd werd, is de
 * beste context die de schrijver kan krijgen: dít geeft de AI nu, en jouw pagina
 * moet de informatie bevatten die hier ontbreekt. Maar de harde regel uit de
 * schrijfinstructie is dat er NOOIT een concurrent bij naam op de pagina van de
 * klant komt. Een model dat vijf keer "Coolblue" in z'n context leest, gaat die
 * naam vroeg of laat overnemen.
 *
 * Dus vervangen we de namen door een neutrale aanduiding vóórdat de tekst
 * meegaat. De informatie blijft, wat er inhoudelijk goed aan was, de naam niet.
 *
 * Bewust ZONDER `server-only`: pure tekstbewerking, testbaar in een kaal script.
 */
import { splitByTerms } from "@/lib/highlight";
import { stripProseDashes } from "@/lib/pipeline/dash-guard";

/**
 * Waar een concurrentnaam stond. Bewust generiek en niet "[CONCURRENT]": het
 * model leest dit als tekst, en een neutrale omschrijving levert een natuurlijke
 * zin op als het toch iets van de context overneemt.
 */
const PLACEHOLDER = "een andere aanbieder";

/**
 * Wat ervoor in de plaats komt als er een RIJTJE namen stond. "Coolblue,
 * MediaMarkt en Bol.com" wordt anders drie keer dezelfde omschrijving achter
 * elkaar, en dat leest als een fout in plaats van als een weglating.
 */
const PLACEHOLDER_PLURAL = "andere aanbieders";

/** Twee of meer omschrijvingen achter elkaar, verbonden door een komma of "en"/"of". */
const RUN_OF_PLACEHOLDERS = new RegExp(
  `${PLACEHOLDER}(?:\\s*(?:,|\\ben\\b|\\bof\\b)\\s*${PLACEHOLDER})+`,
  "gi",
);

/**
 * Vervangt elke schrijfwijze van elke concurrent door een neutrale aanduiding.
 *
 * Leunt op dezelfde matcher als de tekstmarkering (lib/highlight.ts): langste
 * naam eerst, woordgrenzen op letters/cijfers in plaats van `\b`. Dat laatste
 * doet er hier extra toe, met `\b` zou "Bol.com" als "Bol" + ".com" behandeld
 * worden en bleef er "een andere aanbieder.com" staan.
 */
export function redactCompetitors(text: string, names: string[]): string {
  if (!text || names.length === 0) return text;

  const replaced = splitByTerms(text, names)
    .map((part) => (part.term ? PLACEHOLDER : part.text))
    .join("");

  const opgeschoond = replaced
    // Rijtjes eerst inklappen, anders blijft "X, X en X" staan.
    .replace(RUN_OF_PLACEHOLDERS, PLACEHOLDER_PLURAL)
    // Wat er van de interpunctie scheef komt te staan rechttrekken. Geen
    // sluitende oplossing. Dat zou een zinsparser vragen, maar het haalt de
    // lelijkste gevallen eruit.
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();

  // T8.8: een weggehaalde naam laat het gedachtestreepje eromheen soms staan
  // ("een andere aanbieder – Noordwijkerhout — heeft..."), en dat leestteken
  // mag nergens in klanttekst staan (docs/schrijfstijl.md §10).
  return stripProseDashes(opgeschoond);
}

/**
 * Zit er ná het opschonen nog een concurrentnaam in? Vangnet vóór de tekst de
 * schrijfprompt in gaat: liever de context weglaten dan de harde regel breken.
 */
export function containsCompetitor(text: string, names: string[]): boolean {
  return splitByTerms(text, names).some((p) => p.term !== null);
}
