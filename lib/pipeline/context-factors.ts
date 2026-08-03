/**
 * Wat de pijplijn niet kan waarnemen (docs/tasks/onboarding-2.0.md, blok C).
 *
 * ── WAAROM DIT GESTRUCTUREERD IS EN GEEN TEKSTVAK ───────────────────────────
 *
 * Het uur consultancy levert twee dingen op die een model niet kan weten: welke
 * onderwerpen er commercieel toe doen (dat staat op `profile_topics.client_note`)
 * en wat er buiten de website om speelt. Dat tweede is verleidelijk om als vrije
 * notitie op te slaan — en dan verdwijnt het.
 *
 * Neem *"we bouwen een nieuwe site"*. Dat verandert wat het advies wáárd is: de
 * technische audit gaat dan over een site die straks niet meer bestaat, en het
 * nieuw/verbeteren-oordeel rust op URL's die verdwijnen. In een notitieveld leest
 * niemand dat terug op het moment dat het uitmaakt — namelijk drie weken later,
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

/** Wat de app ermee doet — één zin, zichtbaar naast het veld. */
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
    "Gaat mee in het werkgebied, dus ook in de lokale zoekvragen van de meting.",
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
 * `context_factors` is een `jsonb`-kolom, dus er kan van alles in staan —
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
 * maand niet meer bestaat — en erger dan waardeloos, want de klant gaat ermee
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
    `bestaande pagina's hieronder gaan over de huidige site — controleer ze opnieuw zodra de ` +
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

/** Namen van diensten die gestopt zijn — die vallen uit de topicvoorstellen. */
export function discontinuedNames(factors: ContextFactor[]): string[] {
  return factors
    .filter((f) => f.kind === "gestopte_dienst")
    .map((f) => f.description.trim().toLowerCase())
    .filter((d) => d.length >= 2);
}

/** Extra werkgebieden die nog niet op de site staan. */
export function extraRegionsFrom(factors: ContextFactor[]): string[] {
  return factors
    .filter((f) => f.kind === "nieuwe_regio")
    .map((f) => f.description.trim())
    .filter((d) => d.length >= 2);
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
