/**
 * Programmatische validatie/reparatie van schema.org JSON-LD
 * (contentkwaliteit-analyse.md E1, abcplan.md §8, 6f).
 *
 * Het schrijfmodel levert `schemaJsonLd` als string; die is regelmatig ongeldig
 * of gehallucineerd. In plaats van dat blind op te slaan valideren we het in
 * code: parst het en is het een plausibel schema.org-object, dan behouden we het;
 * anders bouwen we een minimaal-geldig object op uit de bekende velden. Zo staat
 * er altijd plak-klare, geldige structured data in de bibliotheek — geen API-kosten.
 */
import type { ContentType } from "@/lib/types/database";

interface RebuildInput {
  type: ContentType;
  title: string;
  description: string;
  url: string;
  faq: { q: string; a: string }[];
}

/** @type-mapping van onze content-types naar schema.org-types. */
function schemaTypeFor(type: ContentType): string {
  if (type === "faq") return "FAQPage";
  if (type === "landing" || type === "comparison") return "WebPage";
  return "Article";
}

/** Bouwt een minimaal-geldig schema.org-object op uit de bekende velden. */
function buildFallback(input: RebuildInput): Record<string, unknown> {
  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaTypeFor(input.type),
    name: input.title,
    headline: input.title,
    description: input.description,
    url: input.url,
  };
  if (input.type === "faq" && input.faq.length > 0) {
    base.mainEntity = input.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    }));
  }
  return base;
}

/** Heeft het geparste object de minimale schema.org-vorm? */
function looksLikeSchema(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return "@context" in obj && "@type" in obj;
}

/**
 * Geeft een gegarandeerd geldige JSON-LD-string terug: het model-resultaat als
 * dat parst en de juiste vorm heeft, anders een opgebouwde fallback.
 */
export function validateOrRebuildJsonLd(modelJsonLd: string | null | undefined, input: RebuildInput): string {
  if (modelJsonLd) {
    try {
      const parsed = JSON.parse(modelJsonLd);
      if (looksLikeSchema(parsed)) {
        return JSON.stringify(parsed, null, 2);
      }
    } catch {
      // val door naar de fallback
    }
  }
  return JSON.stringify(buildFallback(input), null, 2);
}
