/**
 * Merknamen normaliseren zodat schrijfwijzen van hetzelfde bedrijf samenvallen
 * (optimalisatie.md 2.4).
 *
 * `competitor_breakdown` groepeerde op de exacte naam die de classificatie
 * teruggaf. "Coolblue", "coolblue.nl" en "Coolblue B.V." waren daardoor drie
 * concurrenten, en over meerdere metingen viel de data verder uiteen, precies
 * op het moment dat je een trend wilt zien.
 *
 * Bewust ZONDER `server-only`: pure tekstbewerking, testbaar in een kaal script
 * en bruikbaar in de UI om te laten zien wat er samengevoegd wordt.
 */
import { domainOf } from "@/lib/offsite/domain";

/**
 * Rechtsvormen en bedrijfssuffixen die niets zeggen over wélk bedrijf het is.
 * Alleen achteraan verwijderen: "BV Sport" is een ander bedrijf dan "Sport BV".
 */
const LEGAL_SUFFIXES = [
  "bv", "b v", "nv", "n v", "vof", "v o f", "cv", "holding", "groep", "group",
  "inc", "llc", "ltd", "limited", "gmbh", "ag", "sa", "sarl", "plc", "corp",
  "corporation", "company", "co", "nederland", "netherlands", "benelux",
];

/** Domeinextensies die eraf mogen als de naam als URL genoemd wordt. */
const TLDS = [
  "nl", "com", "be", "de", "eu", "org", "net", "info", "shop", "store", "io", "app", "co uk",
];

/**
 * Zet een merknaam om naar z'n vergelijkingsvorm.
 *
 * Wat er gebeurt, in deze volgorde:
 *   1. protocol en www. eraf          https://www.Coolblue.nl/ → coolblue.nl
 *   2. kleine letters, accenten weg   Café Zürich → cafe zurich
 *   3. leestekens → spaties           Jansen & Zn. → jansen zn
 *   4. domeinextensie eraf            coolblue.nl → coolblue
 *   5. rechtsvorm achteraan eraf      coolblue bv → coolblue
 *
 * Blijft er niets over (iemand die letterlijk "BV" heet), dan geven we de
 * opgeschoonde vorm van vóór stap 5 terug, liever een rare sleutel dan een lege.
 */
export function normalizeEntityName(input: string): string {
  let s = input.trim().toLowerCase();
  if (!s) return "";

  // 1. URL-achtige invoer terugbrengen tot de hostnaam.
  s = s.replace(/^[a-z]+:\/\//, "").replace(/^www\./, "");
  s = s.split("/")[0]; // pad eraf
  s = s.split("?")[0];

  // 2. Accenten weg (zodat "Zürich" en "Zurich" samenvallen).
  s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");

  // 3. Alles wat geen letter of cijfer is wordt een spatie; spaties inklappen.
  //    De punt in "coolblue.nl" wordt daarmee ook een spatie, daarom komt de
  //    TLD-stap hierna en niet ervoor.
  s = s.replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
  if (!s) return "";

  // 4. Domeinextensie achteraan eraf, maar alleen als er nog iets overblijft.
  const beforeTld = s;
  for (const tld of TLDS) {
    if (s.endsWith(` ${tld}`)) {
      const stripped = s.slice(0, -(tld.length + 1)).trim();
      if (stripped) s = stripped;
      break;
    }
  }

  // 5. Rechtsvorm(en) achteraan eraf. Herhaald, want "Jansen Holding BV" heeft
  //    er twee. Nooit alles wegstrippen.
  const beforeSuffix = s;
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of LEGAL_SUFFIXES) {
      if (s.endsWith(` ${suffix}`)) {
        const stripped = s.slice(0, -(suffix.length + 1)).trim();
        if (stripped) {
          s = stripped;
          changed = true;
          break;
        }
      }
    }
  }

  return s || beforeSuffix || beforeTld;
}

/**
 * Horen twee namen bij dezelfde entiteit? Puur op basis van de genormaliseerde
 * vorm, géén fuzzy matching.
 *
 * Bewust conservatief: fuzzy matching (Levenshtein en dergelijke) zou "Bakkerij
 * Jansen" en "Bakkerij Hansen" samenvoegen, en dat zijn twee bedrijven. Twee
 * concurrenten ten onrechte samenvoegen is erger dan ze apart laten staan, het
 * eerste vervalst de data stil, het tweede is zichtbaar en door de klant op te
 * lossen in het beheerscherm (2.7).
 */
export function isSameEntity(a: string, b: string): boolean {
  const na = normalizeEntityName(a);
  const nb = normalizeEntityName(b);
  return na !== "" && na === nb;
}

/**
 * Kiest de weergavenaam uit een groep schrijfwijzen: de langste die geen URL of
 * puur kleine letters is, anders de langste. "Coolblue" wint van "coolblue.nl",
 * en "Bakkerij Hendriks" van "hendriks".
 */
export function pickCanonicalName(variants: string[]): string {
  const cleaned = variants.map((v) => v.trim()).filter(Boolean);
  if (cleaned.length === 0) return "";

  const score = (v: string) => {
    let s = v.length;
    if (/^[a-z0-9.\-]+$/.test(v)) s -= 20; // ziet eruit als een domein of alles-klein
    if (/[A-Z]/.test(v)) s += 10; // heeft hoofdletters: waarschijnlijk de merknaam
    return s;
  };

  return cleaned.reduce((best, v) => (score(v) > score(best) ? v : best), cleaned[0]);
}

/**
 * Ziet deze naam eruit als een BEDRIJFSNAAM, of is het een gewoon woord?
 *
 * ── WAAROM DIT NODIG IS ─────────────────────────────────────────────────────
 *
 * De mention-classificatie haalt uit een AI-antwoord niet alleen bedrijven maar
 * ook gewone woorden. De rol-classificatie daarna zet die soms in een
 * "relevante" rol in plaats van `niet_relevant`, bij een fysiopraktijk kwamen
 * "fysiotherapie", "manuele therapie", "medische fitness" en "sportfysiotherapie"
 * als `eigen_product` binnen, en "hardloopkliniek" en "fysiotherapiepraktijken"
 * zelfs als `concurrent`. Voor een praktijk zijn dat behandelvormen, geen
 * bedrijven.
 *
 * Dat is niet onschuldig. Het brak twee dingen tegelijk:
 *   • De claimvalidator (R1.3) stripte twee volstrekt CORRECTE zinnen uit een
 *     rapport, omdat het woord "manuele therapie" erin stond en dat als
 *     onderbouwd merk gelezen werd.
 *   • De meetbaarheidstelling (R2.1) telt zo'n woord als "er werd een aanbieder
 *     genoemd", waardoor een zuivere adviesvraag alsnog winbaar lijkt.
 *
 * ── DE REGEL ────────────────────────────────────────────────────────────────
 *
 * Een bedrijfsnaam heeft een hoofdletter ("SMC Amersfoort", "FysioNieuwland") óf
 * is een domein ("fysiolution.nl", "consumentenbond.nl"). Een gewoon woord heeft
 * geen van beide. Simpel, maar het scheidt in de praktijk exact de juiste kant:
 * alle echte merken uit de vijf testanalyses komen erdoor, alle acht generieke
 * termen vallen af.
 *
 * Dit is een VANGNET, geen vervanging van betere classificatie (R0.5), ook met
 * een scherper model zullen er generieke termen doorheen glippen.
 */
export function looksLikeBrandName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  // Een domein: puntje met minstens twee letters erachter.
  if (/\.[a-z]{2,}$/i.test(trimmed)) return true;
  // Een hoofdletter ergens in de naam.
  return /\p{Lu}/u.test(trimmed);
}

/**
 * Ziet dit domein eruit als de EIGEN site van dit merk, op naam beoordeeld?
 *
 * ── WAAROM OP NAAM, EN NIET OP EEN OPGESLAGEN DOMEIN ─────────────────────────
 *
 * Voor het eigen merk kent ORBIT ENGINE het echte domein (`profiles.url`), dus daar is
 * een exacte match genoeg. Van een concurrent is nergens een domein
 * geregistreerd, de klant vult bij onboarding alleen namen in en de meting
 * ontdekt de rest uit AI-antwoorden. `citesOwnSite()` gebruikt daarom dezelfde
 * normalisatie als `isSameEntity()`: "coolblue.nl" en "Coolblue" normaliseren
 * allebei naar "coolblue", dus een geciteerde bron telt als de eigen site van
 * die concurrent zodra de domeinnaam er zelf op lijkt.
 *
 * ── DE GRENS VAN DEZE HEURISTIEK ─────────────────────────────────────────────
 *
 * Een concurrent wiens domeinnaam niets met zijn merknaam te maken heeft (een
 * los gekochte domeinnaam, een rebrand) wordt hierdoor gemist: `false` terwijl
 * het antwoord eigenlijk `true` had moeten zijn. Dat is conventie 3 in de
 * praktijk, een gemiste citatie levert een iets te lage telling op, een
 * onterecht toegekende citatie zou een concurrent krediet geven voor een bron
 * die niet van hem is. Het eerste is een tekortkoming, het tweede een fout, en
 * de eerste is de veiligere kant om op te vallen.
 */
export function citesOwnSite(citedSources: string[], entityName: string): boolean {
  for (const url of citedSources) {
    const domain = domainOf(url);
    if (domain && isSameEntity(domain, entityName)) return true;
  }
  return false;
}

/** Leestekens/accenten weg, spaties inklappen, voor woordgrens-bewuste vergelijking. */
function normalizeForContains(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Staat `name` LETTERLIJK in `text` (op hoofdletters, leestekens en accenten
 * na)? Geen fuzzy matching, zelfde conservatieve keuze als `isSameEntity`
 * hierboven, maar dan voor "komt deze naam voor in deze tekst" in plaats van
 * "zijn dit twee schrijfwijzen van hetzelfde bedrijf".
 *
 * Bestaat om de mention-classificatie (lib/pipeline/measure.ts) te controleren:
 * de LLM-beoordeling van `mentioned` bleek soms `true` terug te geven terwijl
 * het merk nergens in `raw_response` voorkomt, puur een oordeel van het model,
 * niet gegrond in de tekst. Deze functie is het onafhankelijke, deterministische
 * vangnet daarop: de tekst zelf beslist, niet het model.
 */
export function textContainsName(text: string, name: string): boolean {
  const needle = normalizeForContains(name);
  if (!needle) return false;
  const haystack = ` ${normalizeForContains(text)} `;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)${escaped}($|\\s)`).test(haystack);
}
