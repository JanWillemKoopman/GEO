/**
 * De VORM van het bewijsdossier: types en tekstopmaak (implementatieplan.md R1.1).
 *
 * Bewust gescheiden van `evidence.ts` en bewust ZONDER `server-only`, net als
 * `period-change-format.ts` naast `period-change.ts`. De opmaak van dit blok
 * bepaalt wat het model wel en niet mag concluderen — dat is precies het soort
 * logica dat je wilt kunnen testen zonder database (scripts/test-unit.ts).
 */
import type { EntityRole } from "@/lib/schemas/entity-classification";

/** Eén merk zoals het in ÉÉN specifiek antwoord voorkwam. */
export interface EvidenceBrand {
  /** Weergavenaam van de entiteit; valt terug op de gemeten schrijfwijze. */
  name: string;
  /** Concurrent, vergelijker, brancheorganisatie… — bepaalt hoe zwaar dit weegt. */
  role: EntityRole | "onbekend";
  /** Positie in het antwoord; null als de classificatie die niet vaststelde. */
  position: number | null;
  /** Bronnen die specifiek dít merk onderbouwden. */
  citedSources: string[];
}

/** Het dossier van één gemiste vraag: wat er feitelijk in dat antwoord stond. */
export interface EvidenceEntry {
  /** V1, V2, … — waarmee het rapport deze vraag aanwijst. */
  code: string;
  runId: string;
  promptText: string;
  category: string;
  weight: number;
  cluster: string | null;
  intentType: string | null;
  /**
   * Uitsluitend de merken die in DIT antwoord genoemd werden. Leeg betekent iets
   * inhoudelijks: de AI noemde geen enkele aanbieder. Dat is geen gemiste kans
   * maar een vraag waar (nog) niemand de standaard is.
   */
  brandsInAnswer: EvidenceBrand[];
  /** Begin van het letterlijke antwoord, zodat het rapport concreet kan blijven. */
  answerExcerpt: string;
}

/**
 * Hoeveel tekens van het ruwe antwoord meegaan. Genoeg om het type antwoord te
 * herkennen ("stappenplan zonder aanbieders" versus "lijstje bedrijven"), kort
 * genoeg om vijftien dossiers naast de rest van de invoer te laten passen.
 */
export const EXCERPT_CHARS = 320;

/** Kort het antwoord af op een woordgrens, zodat het niet middenin een woord stopt. */
export function excerpt(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= EXCERPT_CHARS) return trimmed;
  const cut = trimmed.slice(0, EXCERPT_CHARS);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}…`;
}

/**
 * Zet het dossier om in het tekstblok dat B1 en B2 als invoer krijgen.
 *
 * De vorm is bewust expliciet: per vraag staat er of er merken genoemd werden en
 * zo ja welke, met positie en bronnen. Bij een leeg dossier staat er een hele
 * ZIN in plaats van een lege lijst — een model dat "geen data" ziet, vult dat
 * gat; een model dat leest "hier werd geen enkel bedrijf genoemd" heeft een
 * conclusie in handen.
 */
export function formatEvidenceDossier(entries: EvidenceEntry[]): string {
  if (entries.length === 0) return "";

  const blocks = entries.map((e) => {
    const tags = [
      `gewicht ${e.weight.toFixed(2)}`,
      e.category,
      e.intentType ?? null,
      e.cluster ? `cluster: ${e.cluster}` : null,
    ]
      .filter(Boolean)
      .join(", ");

    const brands =
      e.brandsInAnswer.length === 0
        ? "  In dit antwoord werd GEEN ENKEL bedrijf bij naam genoemd. Er is hier dus geen " +
          "concurrent die deze vraag wint — noem er ook geen."
        : e.brandsInAnswer
            .map((b) => {
              const positie = b.position != null ? `positie ${b.position}` : "positie onbekend";
              const bronnen = b.citedSources.length
                ? `; bronnen: ${b.citedSources.slice(0, 3).join(", ")}`
                : "";
              return `  - ${b.name} (${b.role}, ${positie}${bronnen})`;
            })
            .join("\n");

    return [
      `${e.code} [${tags}] "${e.promptText}"`,
      "  Genoemd in dit antwoord:",
      brands,
      `  Antwoord (begin): "${e.answerExcerpt}"`,
    ].join("\n");
  });

  return (
    `\nBEWIJSDOSSIER — de vragen waarop het eigen merk NIET genoemd werd, gesorteerd op gewicht ` +
    `(hoog gewicht = populair en/of koopklaar). Per vraag staat hieronder precies welke bedrijven ` +
    `er in DAT antwoord voorkwamen.\n\n` +
    `⚠️ HARDE REGEL: noem een concurrent alleen bij naam in verband met een specifieke vraag als ` +
    `die naam hieronder ONDER DIE VRAAG staat. Staat er dat er geen enkel bedrijf genoemd werd, ` +
    `dan is dát je conclusie — haal er geen concurrent bij uit een andere vraag.\n\n` +
    `${blocks.join("\n\n")}`
  );
}
