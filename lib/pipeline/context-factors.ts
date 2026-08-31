/**
 * Wat de pijplijn niet kan waarnemen (docs/tasks/onboarding-2.0.md, blok C).
 *
 * ── WAAROM DIT GESTRUCTUREERD IS EN GEEN TEKSTVAK ───────────────────────────
 *
 * Het uur consultancy levert twee dingen op die een model niet kan weten: welke
 * onderwerpen er commercieel toe doen (dat staat op `profile_topics.client_note`)
 * en wat er buiten de website om speelt. Dat tweede is verleidelijk om als vrije
 * notitie op te slaan, en dan verdwijnt het.
 *
 * Neem *"we bouwen een nieuwe site"*. Dat verandert wat het advies wáárd is: de
 * technische audit gaat dan over een site die straks niet meer bestaat, en het
 * nieuw/verbeteren-oordeel rust op URL's die verdwijnen. In een notitieveld leest
 * niemand dat terug op het moment dat het uitmaakt, namelijk drie weken later,
 * als het rapport gegenereerd wordt.
 *
 * Dus: een gesloten lijst soorten, en per soort een gevolg dat in code staat.
 * Puur, dus testbaar (conventie 2).
 */
import type { ContextFactor, ContextFactorKind } from "@/lib/types/database";

export const CONTEXT_FACTOR_KINDS: ContextFactorKind[] = [
  "nieuwe_website",
  "rebranding",
  "naamswijziging",
  "nieuwe_dienst",
  "gestopte_dienst",
  "nieuwe_regio",
  "overig",
];

/** Wat de consultant in het keuzemenu ziet. */
export const CONTEXT_FACTOR_LABELS: Record<ContextFactorKind, string> = {
  nieuwe_website: "Er komt een nieuwe website",
  rebranding: "Rebranding op komst",
  naamswijziging: "De bedrijfsnaam verandert",
  nieuwe_dienst: "Nieuwe dienst of product (staat nog niet op de site)",
  gestopte_dienst: "Dienst of product is gestopt",
  nieuwe_regio: "Nieuw werkgebied",
  overig: "Iets anders",
};

/** Wat de app ermee doet, één zin, zichtbaar naast het veld. */
export const CONTEXT_FACTOR_EFFECTS: Record<ContextFactorKind, string> = {
  nieuwe_website:
    "De technische bevindingen en het advies over bestaande pagina's krijgen een houdbaarheidsmelding: ze gaan over een site die straks niet meer bestaat.",
  rebranding:
    "Oude én nieuwe naam gaan mee in de meting, zodat vermeldingen onder beide namen meetellen.",
  naamswijziging:
    "Oude én nieuwe naam gaan mee in de meting. Zonder dit telt de helft van je vermeldingen niet mee.",
  nieuwe_dienst:
    "De crawl vindt hem niet, want hij staat nog nergens. Voeg hem met de hand toe aan het aanbod, dan telt hij mee bij de onderwerpen.",
  gestopte_dienst: "Valt uit het aanbod en uit de voorgestelde onderwerpen.",
  nieuwe_regio:
    "Gaat mee in het werkgebied, dus ook in de lokale zoekvragen van de meting. Schrijf alleen plaatsnamen op, gescheiden door een komma; een hele zin komt niet in het werkgebied terecht.",
  overig: "Alleen ter informatie; hier hangt geen automatische actie aan.",
};

export function isContextFactorKind(
  value: unknown,
): value is ContextFactorKind {
  return (
    typeof value === "string" &&
    (CONTEXT_FACTOR_KINDS as string[]).includes(value)
  );
}

/**
 * Leest wat er uit de database komt en gooit weg wat niet klopt.
 *
 * `context_factors` is een `jsonb`-kolom, dus er kan van alles in staan,
 * handmatig bewerkte rijen, een oudere vorm, een half opgeslagen formulier. Elke
 * consument moet daarvan uit kunnen gaan zonder zelf te controleren, anders
 * staat de controle op vijf plekken en op de zesde niet.
 */
export function parseContextFactors(raw: unknown): ContextFactor[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item): ContextFactor[] => {
    if (!item || typeof item !== "object") return [];
    const o = item as Record<string, unknown>;
    if (!isContextFactorKind(o.kind)) return [];
    const description =
      typeof o.description === "string" ? o.description.trim() : "";
    const from =
      typeof o.effective_from === "string" && o.effective_from
        ? o.effective_from
        : null;
    return [{ kind: o.kind, description, effective_from: from }];
  });
}

/**
 * Is het technische advies nog houdbaar?
 *
 * Dit is het gevolg dat er het meest toe doet. Een audit die zegt "voeg
 * schema.org toe aan /diensten/massage" is waardeloos als die pagina over een
 * maand niet meer bestaat, en erger dan waardeloos, want de klant gaat ermee
 * aan de slag.
 */
export function technicalAdviceStale(
  factors: ContextFactor[],
): ContextFactor | null {
  return factors.find((f) => f.kind === "nieuwe_website") ?? null;
}

/** De waarschuwing die dan boven de audit en in de rapportinvoer hoort. */
export function staleAdviceNotice(factor: ContextFactor): string {
  const wanneer = factor.effective_from
    ? ` (verwacht ${formatDate(factor.effective_from)})`
    : "";
  const toelichting = factor.description ? ` ${factor.description}` : "";
  return (
    `Er komt een nieuwe website${wanneer}. De technische bevindingen en het advies over ` +
    `bestaande pagina's hieronder gaan over de huidige site. Controleer ze opnieuw zodra de ` +
    `nieuwe live staat.${toelichting}`
  );
}

/**
 * Welke namen er in de meting mee moeten, bovenop wat de klant al opgaf.
 *
 * Bij een naamswijziging of rebranding wordt het merk een tijd lang onder twee
 * namen genoemd. Alleen de nieuwe meten laat de helft van de vermeldingen
 * vallen; alleen de oude meten laat de nieuwe zichtbaarheid ongemeten.
 */
export function extraAliasesFrom(factors: ContextFactor[]): string[] {
  return factors
    .filter((f) => f.kind === "naamswijziging" || f.kind === "rebranding")
    .map((f) => f.description.trim())
    .filter((d) => d.length >= 2);
}

/** Namen van diensten die gestopt zijn. Die vallen uit de topicvoorstellen. */
export function discontinuedNames(factors: ContextFactor[]): string[] {
  return factors
    .filter((f) => f.kind === "gestopte_dienst")
    .map((f) => f.description.trim().toLowerCase())
    .filter((d) => d.length >= 2);
}

/**
 * Hoeveel tekens een plaatsnaam hoogstens is, en uit hoeveel woorden.
 *
 * "'s-Hertogenbosch" is 16 tekens, "Bergen op Zoom" is drie woorden, en
 * "Gilze en Rijen" ook. Daarboven is het geen plaatsnaam meer maar een zin.
 */
const MAX_PLAATS_TEKENS = 40;
const MAX_PLAATS_WOORDEN = 4;

/**
 * De kleine woorden die in een Nederlandse plaatsnaam met kleine letter
 * geschreven worden. Alle andere woorden in een plaatsnaam beginnen met een
 * hoofdletter, en dát is wat een plaatsnaam van een zin onderscheidt:
 * "Gilze en Rijen" en "Bergen op Zoom" mogen, "Uitbreiding richting Oosterhout"
 * niet, want "richting" staat hier niet tussen.
 */
const TUSSENVOEGSELS = new Set([
  "aan",
  "bij",
  "de",
  "den",
  "der",
  "en",
  "het",
  "op",
  "over",
  "te",
  "ten",
  "ter",
  "van",
]);

/**
 * Plaatsnamen uit de omschrijving van een `nieuwe_regio`, of niets.
 *
 * ── DE FOUT DIE DIT REPAREERT ───────────────────────────────────────────────
 *
 * ⚠️ Gevonden op 31 augustus 2026, in de eerste live doorloop van de hele
 * klantreis. In het gesprek stond bij een nieuwe regio de omschrijving
 * "Uitbreiding richting Oosterhout en Geertruidenberg." Die hele zin, punt en
 * al, kwam als dertiende "plaatsnaam" in `profiles.service_regions` terecht.
 *
 * Dat veld is geen administratie. `service_regions[0]` wordt letterlijk in de
 * kennistestvragen geplakt, de promptgeneratie maakt er lokale zoekvragen mee,
 * en het AANTAL regio's stuurt `suggestPromptMix()` aan. Eén zin op die plek
 * levert dus onbruikbare meetvragen op én een duurdere meting, en de klant
 * betaalt voor allebei.
 *
 * ── WAAROM WEIGEREN EN NIET ONTLEDEN ────────────────────────────────────────
 *
 * De verleiding is een zin uit elkaar te trekken op "en" en op komma's. Dat
 * gaat in het Nederlands gegarandeerd mis: "Gilze en Rijen" is één gemeente en
 * "Bergen op Zoom" ook. Een half ontleed werkgebied is erger dan geen, want het
 * meet dan onder een naam die niet bestaat (conventie 3, onbekend is een betere
 * waarde dan een verkeerde).
 *
 * Deze functie splitst daarom alleen op komma's, wat een opsomming is en geen
 * zin, en accepteert een deel pas als het er ook echt uitziet als een
 * plaatsnaam: kort genoeg, hooguit vier woorden, en beginnend met een
 * hoofdletter. Een zin als hierboven levert nul plaatsen op. De contextfactor
 * zelf blijft gewoon staan (conventie 8, niets gaat verloren) en de consultant
 * ziet in het gespreksscherm wat er wél verwacht wordt.
 */
export function regionsFromDescription(description: string): string[] {
  return description
    .split(",")
    .map((deel) => deel.trim().replace(/^[-–—]+/, "").replace(/[.;:!?]+$/, "").trim())
    .filter(isPlaatsnaam);
}

/**
 * Ziet dit eruit als een plaatsnaam?
 *
 * Kort, hooguit vier woorden, en elk woord begint met een hoofdletter behalve
 * de tussenvoegsels hierboven. Een zinsdeel als "We gaan uitbreiden" valt af op
 * "gaan", "Uitbreiding richting Oosterhout" op "richting".
 */
function isPlaatsnaam(deel: string): boolean {
  if (deel.length < 2 || deel.length > MAX_PLAATS_TEKENS) return false;
  const woorden = deel.split(/\s+/).filter(Boolean);
  if (woorden.length === 0 || woorden.length > MAX_PLAATS_WOORDEN) return false;
  return woorden.every((woord, i) => {
    if (i > 0 && TUSSENVOEGSELS.has(woord.toLowerCase())) return true;
    // "'s-Hertogenbosch" en "'t Harde" beginnen met een apostrof; daarna telt
    // de eerste letter.
    return /^['’]?[a-z]?-?[A-ZÀ-Þ]/.test(woord) || /^['’][a-z]$/.test(woord);
  });
}

/**
 * Extra werkgebieden die nog niet op de site staan.
 *
 * Levert alleen op wat er als plaatsnaam doorheen komt; zie
 * `regionsFromDescription()` voor waarom een hele zin hier niets oplevert.
 */
export function extraRegionsFrom(factors: ContextFactor[]): string[] {
  return factors
    .filter((f) => f.kind === "nieuwe_regio")
    .flatMap((f) => regionsFromDescription(f.description));
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
