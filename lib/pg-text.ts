/**
 * Tekst van het open web opslaanbaar maken voor Postgres.
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * Postgres accepteert in een `text`-kolom geen NUL-byte (U+0000) en geen losse
 * UTF-16-surrogate. PostgREST stuurt zo'n rij niet gedeeltelijk door: de HELE
 * batch-insert wordt geweigerd. Bij de content-inventaris is dat één insert van
 * tientallen pagina's, dus twee rotte pagina's kosten de complete inventaris.
 *
 * Dat is geen theorie. Bij het eind-tot-eind draaien van swapfiets.nl op
 * 1 augustus 2026 bevatten 2 van de 22 gecrawlde pagina's een NUL-byte
 * (/nl-NL/data-act en /en/responsible-disclosure). De crawl meldde keurig
 * "22 pagina's", `refreshInventory()` gaf 22 terug, en er stond nul in de
 * database, de fout van de insert werd nergens gecontroleerd. Gevolg: een
 * profiel dat er "klaar" uitziet, een lege feitenbank, en content die op niets
 * gebouwd wordt.
 *
 * We schonen daarom bij de bron, niet bij de insert: alles wat uit een externe
 * HTML-pagina komt gaat hierlangs voordat het de database in mag.
 *
 * Dit bestand heeft bewust GEEN `server-only`, zodat het vanuit
 * `scripts/test-unit.ts` te testen is (zie CLAUDE.md, conventie 2).
 */

/** NUL-byte: het enige codepunt dat Postgres in `text` categorisch weigert. */
const NUL_BRON = "\\u0000";

/**
 * Losse surrogates: een high zonder low erna, of een low zonder high ervoor.
 * Geldig in een JavaScript-string, niet te coderen als UTF-8, dus onopslaanbaar.
 */
const LOSSE_SURROGATE_BRON = "[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])|(?<![\\uD800-\\uDBFF])[\\uDC00-\\uDFFF]";

/** Alles wat Postgres in één keer weigert, als één patroon. */
const ONOPSLAANBAAR_BRON = `${NUL_BRON}|${LOSSE_SURROGATE_BRON}`;

/**
 * Maakt tekst opslaanbaar. Verwijdert wat Postgres niet aankan en laat de rest
 * ongemoeid, emoji, accenten en niet-Latijnse schriften horen er gewoon in.
 *
 * `null`/`undefined` blijven `null`: "onbekend is een betere waarde dan een
 * verkeerde" (CLAUDE.md, conventie 3).
 */
export function sanitizeForPostgres(value: string): string;
export function sanitizeForPostgres(value: string | null | undefined): string | null;
export function sanitizeForPostgres(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  // Nieuw RegExp-object per aanroep: een gedeelde /g-regex houdt `lastIndex`
  // vast tussen aanroepen en slaat dan willekeurige treffers over.
  return value.replace(new RegExp(ONOPSLAANBAAR_BRON, "g"), "");
}

/** Bevat deze tekst iets wat Postgres zou weigeren? Voor logging en diagnose. */
export function hasUnstorableChars(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  return new RegExp(ONOPSLAANBAAR_BRON).test(value);
}
