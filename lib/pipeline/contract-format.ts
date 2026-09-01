/**
 * Het contentcontract opschonen en als opdracht formuleren
 * (docs/tasks/contentpijplijn-herontwerp.md A2).
 *
 * Bewust GESCHEIDEN van `content-contract.ts`, dat het contract laat opstellen
 * en daarom `server-only` is. Wat hier staat bepaalt de uitkomst (welke secties
 * overleven, en hoe de opdracht in de schrijfprompt terechtkomt) en hoort dus
 * puur en testbaar te zijn vanuit `scripts/test-unit.ts` (conventie 2). Zelfde
 * scheiding als tussen `factcard.ts` (puur) en `factbase.ts` (server-only).
 */
import type { ContentContract } from "@/lib/schemas/content-contract";

/**
 * Het contract opschonen vóór opslag.
 *
 * Twee dingen die het model soms laat liggen en die de dekkingspoort scheef
 * zouden zetten: een sectie zonder id (dan kan een bevinding er niet naar
 * wijzen) en een richtlengte van 0 of onzinnig hoog. Het vangnet in code hoort
 * bij de instructie in de prompt (conventie 1).
 */
export function normaliseerContract(contract: ContentContract): ContentContract {
  return {
    ...contract,
    sections: contract.sections
      .filter((s) => s.heading?.trim() && s.subQuestion?.trim())
      .map((s, i) => ({
        ...s,
        id: s.id?.trim() || `s${i + 1}`,
        targetWords: Number.isFinite(s.targetWords)
          ? Math.min(Math.max(Math.round(s.targetWords), 40), 400)
          : 120,
        factRefs: (s.factRefs ?? []).filter((f) => f?.trim()),
        explainerTerms: (s.explainerTerms ?? []).filter((t) => t?.trim()),
        mustCover: (s.mustCover ?? []).filter((m) => m?.trim()),
      })),
    faqQuestions: (contract.faqQuestions ?? []).filter((v) => v?.trim()),
  };
}

/** Het contract als opdracht in de schrijfprompt. */
export function formatContract(contract: ContentContract | null): string {
  if (!contract || contract.sections.length === 0) return "";
  return [
    `DIT IS HET CONTRACT VOOR DEZE PAGINA. Alles wat hier staat MOET erop komen, in deze volgorde. ` +
      `Wij rekenen na of dat gelukt is, sectie voor sectie.`,
    `OPENING (de eerste twee zinnen van de pagina, vóór elke inleiding): "${contract.openingAnswer}"`,
    ...contract.sections.map((s, i) =>
      [
        `SECTIE ${i + 1} — kop: "${s.heading}" (ongeveer ${s.targetWords} woorden)`,
        `  beantwoordt: ${s.subQuestion}`,
        s.mustCover.length ? `  moet behandelen: ${s.mustCover.join("; ")}` : "",
        s.factRefs.length ? `  gebruik hier deze feiten: ${s.factRefs.join(", ")}` : "",
        s.explainerTerms.length ? `  leg hier kort uit: ${s.explainerTerms.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    contract.faqQuestions.length
      ? `FAQ (zet deze vragen in het veld faq, in de woorden van de lezer):\n- ${contract.faqQuestions.join("\n- ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
