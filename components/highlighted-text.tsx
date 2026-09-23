"use client";

/**
 * Merknamen markeren in een AI-antwoord (optimalisatie.md 3.1).
 *
 * Zonder markering is een antwoord van 400 woorden een muur waarin de klant zelf
 * moet zoeken waar hij staat, en dat is precies het werk dat de app hoort te
 * doen. Met markering ziet hij in één oogopslag: hier staat mijn concurrent drie
 * keer, en ik nergens.
 *
 * Het knipwerk zit in lib/highlight.ts (testbaar zonder React); dit component
 * doet alleen de opmaak, en zet de stukjes als echte React-elementen neer in
 * plaats van via `dangerouslySetInnerHTML`, de tekst komt van een AI-model dat
 * webpagina's las, dus daar mag nooit HTML uit in de DOM belanden.
 */
import { splitByTerms } from "@/lib/highlight";

export interface HighlightGroup {
  terms: string[];
  variant: "own" | "competitor";
}

const STYLES: Record<HighlightGroup["variant"], React.CSSProperties> = {
  own: {
    // Het eigen merk draagt het accent, net als zijn lijn in een grafiek
    // (`--chart-1`, `docs/designsystem.md` §2.4). Gewicht 500: vet is hier 500.
    background: "color-mix(in srgb, var(--accent) 22%, transparent)",
    borderBottom: "var(--border-width-sm) solid var(--accent)",
    fontWeight: 500,
    borderRadius: "var(--radius-sm)",
    padding: "0 2px",
  },
  competitor: {
    background: "var(--bg-layer-2)",
    borderBottom: "var(--border-width-sm) solid var(--border-strong)",
    borderRadius: "var(--radius-sm)",
    padding: "0 2px",
  },
};

export function HighlightedText({ text, groups }: { text: string; groups: HighlightGroup[] }) {
  const variantByTerm = new Map<string, HighlightGroup["variant"]>();
  for (const g of groups) {
    for (const t of g.terms) variantByTerm.set(t.trim().toLowerCase(), g.variant);
  }

  const parts = splitByTerms(
    text,
    groups.flatMap((g) => g.terms),
  );

  return (
    <>
      {parts.map((part, i) => {
        const variant = part.term ? variantByTerm.get(part.term.toLowerCase()) : undefined;
        if (!variant) return <span key={i}>{part.text}</span>;
        return (
          <mark key={i} style={{ ...STYLES[variant], color: "inherit" }}>
            {part.text}
          </mark>
        );
      })}
    </>
  );
}
