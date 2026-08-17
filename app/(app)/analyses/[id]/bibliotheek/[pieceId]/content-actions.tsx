"use client";

import { CopyButton } from "@/components/copy-button";
import { InfoHint } from "@/components/info-hint";

/** Kopiëren / downloaden van een gegenereerde pagina (abcplan.md §8). */
export function ContentActions({
  title,
  markdown,
  html,
  schemaJsonLd,
  templateExport,
}: {
  title: string;
  markdown: string;
  html: string;
  schemaJsonLd: string | null;
  /**
   * De sjabloongerichte variant, als ORBIT ENGINE tijdens het onderzoek een CMS of een
   * FAQ-accordion op de site van de klant herkende (`content-export.ts`). `null`
   * of `undefined`: geen bekend sjabloon, dan tonen we alleen de generieke
   * export hierboven. Zie `docs/architecture.md` §"Sjabloondetectie".
   */
  templateExport?: { label: string; filename: string; content: string } | null;
}) {
  function download(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "pagina";
  const htmlDoc = `<!doctype html>\n<html lang="nl">\n<head>\n<meta charset="utf-8">\n<title>${title}</title>\n</head>\n<body>\n${html}\n</body>\n</html>`;

  return (
    <div className="flex flex-wrap gap-2">
      <CopyButton value={markdown} label="Kopieer tekst" copiedLabel="Gekopieerd" className="btn-outline" />
      <button onClick={() => download(`${slug}.md`, markdown, "text/markdown")} className="btn-outline">
        Download .md
      </button>
      <button onClick={() => download(`${slug}.html`, htmlDoc, "text/html")} className="btn-outline">
        Download .html
      </button>
      {schemaJsonLd && (
        <CopyButton
          value={schemaJsonLd}
          label="Kopieer schema-markup"
          copiedLabel="Gekopieerd"
          className="btn-outline"
        />
      )}
      {templateExport && (
        <span className="flex items-center gap-1">
          <button
            onClick={() => download(templateExport.filename, templateExport.content, "text/html")}
            className="btn-outline"
          >
            {templateExport.label}
          </button>
          <InfoHint label="Wat is dit?">
            ORBIT ENGINE herkende tijdens het onderzoek hoe jouw site is opgebouwd, en heeft deze pagina
            alvast in diezelfde vorm klaargezet. Zo hoef je bij het plakken niets meer om te bouwen.
          </InfoHint>
        </span>
      )}
    </div>
  );
}
