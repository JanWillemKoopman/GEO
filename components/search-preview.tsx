/**
 * Een gemockt zoekresultaat (content-editie, onderdeel 2), naar Nova's
 * "Search preview, een nagebouwd Google-resultaat".
 *
 * Puur presentationeel: geen state, geen berekening. Wordt op de contentpagina
 * tweemaal ingezet met hetzelfde component, één keer server-gerenderd
 * statisch (gevoed door de opgeslagen tekst), één keer client-gerenderd live
 * binnen `ContentEditor` (gevoed door de lokale invoerstate van dat paneel).
 * Geen state hoeft over de server/client-grens te worden opgetild.
 */
export function SearchPreview({
  title,
  metaTitle,
  metaDescription,
  url,
  isReal,
}: {
  title: string;
  metaTitle: string;
  metaDescription: string;
  url: string;
  isReal: boolean;
}) {
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="mono-label">Zo verschijnt dit in een zoekresultaat</span>
        {!isReal && <span className="chip chip-neutral">Voorstel, nog geen echte URL</span>}
      </div>

      <div className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
        <span className="text-sm text-muted">{url}</span>
        <span
          className="text-lg"
          style={{ color: "var(--intent-information-text)" }}
        >
          {metaTitle.trim() || title}
        </span>
        <p className="text-sm text-secondary">
          {metaDescription.trim() ||
            "Nog geen meta-description ingevuld. Zonder omschrijving verzint de zoekmachine er zelf één bij, meestal een lukraak stuk van de pagina."}
        </p>
      </div>
    </div>
  );
}
