/**
 * Welke meetlat heeft deze run gebruikt?
 *
 * Bewust ZONDER `server-only` (conventie 2).
 *
 * ── WAAROM DIT BESTAAT, EN WAAROM HET GOEDKOOPSTE VANGNET VAN HET PRODUCT IS ─
 *
 * Dit onderdeel wordt verkocht op HERHALING: over drie maanden nog een keer, en
 * dan het verschil. Dat is de belofte, en het is de enige manier waarop de klant
 * ziet dat er iets verbeterd is.
 *
 * Maar de meetlat ligt bij OpenAI. Werken zij het model bij, of verandert hun
 * zoektool, dan verschuift de lat en niet de reputatie. Zonder deze kolom zou
 * het scherm dat verschil netjes als vooruitgang of achteruitgang tekenen, en
 * dan verkoop je een trendlijn die ruis is. Dat is erger dan geen trendlijn: het
 * is een cijfer waar iemand een beslissing op neemt.
 *
 * De oplossing is niet ingewikkeld. Leg vast waarmee je gemeten hebt, en weiger
 * twee runs zonder waarschuwing te vergelijken als die sleutels verschillen.
 */
import { MODELS } from "@/lib/openai/models";

/**
 * De versie van de vraagstelling zelf.
 *
 * ⚠️ HANDMATIG OPHOGEN bij elke wijziging in een prompt die de uitkomst kan
 * verschuiven: een andere formulering van de nadelenvraag, een extra
 * uitsluiting, een aangepaste oordeelsinstructie. Dat is bewust handwerk en
 * geen hash over de promptteksten: niet elke tekstwijziging verschuift de
 * uitkomst, en een versie die bij elke komma opspringt maakt elke trend
 * onvergelijkbaar en wordt daarom genegeerd.
 *
 * v1  22 augustus 2026, de eerste bouw.
 * v2  23 augustus 2026, na de eerste echte run: scherpere instructie over wat
 *     een plus- of minpunt is, de open marktvraag erbij, en de dienstvragen
 *     tegen een gedeeld bewijscorpus in plaats van elk hun eigen zoekactie.
 * v3  23 augustus 2026, na de tweede echte run: lof met twee of meer echte
 *     bezwaren erin telt als gemengd, en de standaardfout van de toon heeft een
 *     ondergrens gekregen.
 * v4  23 augustus 2026, na het nalezen van de vierentwintig oordelen van die
 *     tweede run: een opmerking over ons eigen bewijs ("weinig onafhankelijke
 *     reviews over deze dienst") telt niet meer als bezwaar, en het vangnet
 *     werkt nu in beide richtingen.
 *
 * ⚠️ HET OPHOGEN IS ÉÉN KEER VERGETEN, EN DAT IS PRECIES DE FOUT DIE DEZE KOLOM
 * MOET VOORKOMEN. De twee runs op Gasservice Brabant van 23 augustus staan
 * allebei op `v2`, terwijl de oordeelsregel er tussenin veranderd is. De toon
 * ging van 47 naar 0, en zonder deze regel zou het scherm dat presenteren als
 * "de reputatie is echt achteruitgegaan". Het merk is niet veranderd, de
 * meetlat wel. Ophogen hoort bij dezelfde commit als de wijziging, niet bij de
 * volgende.
 */
export const PROMPT_VERSION = "v4";

/**
 * De sleutel die op de run wordt vastgelegd.
 *
 * Bevat het model dat de vragen stelt, het model dat beoordeelt, en de
 * promptversie. De redeneerinspanning zit impliciet in de promptversie, want die
 * hoogt op zodra we daaraan draaien.
 */
export function instrumentVersion(): string {
  return `${MODELS.quality}+${MODELS.volume}+${PROMPT_VERSION}`;
}

/**
 * Mogen deze twee runs naast elkaar gelegd worden?
 *
 * ⚠️ Geeft `false` bij een ONBEKENDE versie, niet `true`. Runs van vóór deze
 * kolom hebben `null`, en die weten we per definitie niet zeker. De veilige kant
 * is hier "zeg dat het niet vergelijkbaar is", want de andere kant levert een
 * cijfer op dat er hard uitziet en het niet is.
 */
export function comparableRuns(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return a === b;
}

/** Wat de klant leest als twee runs niet op dezelfde meetlat rusten. */
export function instrumentWarning(a: string | null, b: string | null): string | null {
  if (comparableRuns(a, b)) return null;
  return (
    "Deze twee metingen zijn met een andere versie van de meting gedaan. Het verschil dat je " +
    "hieronder ziet kan dus ook aan de meting liggen en niet aan je reputatie. Vanaf de volgende " +
    "meting is de vergelijking weer zuiver."
  );
}
