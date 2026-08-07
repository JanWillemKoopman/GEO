import type { MarkdownHeading } from "@/lib/markdown";

/**
 * Inhoudsopgave voor een lange contentpagina (H.68).
 *
 * Alleen zinvol vanaf een paar koppen: bij één of twee is een lijstje die naar
 * dezelfde twee koppen verwijst decoratie, geen navigatie. De drempel ligt bij
 * de UI, niet in `extractHeadings()` zelf, dat blijft een neutrale afleiding.
 */
export function TableOfContents({ headings }: { headings: MarkdownHeading[] }) {
  if (headings.length < 3) return null;

  // Niet dieper dan twee niveaus inspringen: een derde niveau in een chip-achtige
  // lijst wordt onleesbaar smal op mobiel.
  const top = Math.min(...headings.map((h) => h.level));

  return (
    <nav aria-label="Inhoud van deze pagina" className="card flex flex-col gap-2">
      <span className="mono-label">Inhoud</span>
      <ul className="flex flex-col gap-1 text-sm">
        {headings.map((h) => (
          <li key={h.slug} style={{ paddingLeft: `${(h.level - top) * 1}rem` }}>
            <a href={`#${h.slug}`} className="text-secondary underline-offset-2 hover:underline">
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
