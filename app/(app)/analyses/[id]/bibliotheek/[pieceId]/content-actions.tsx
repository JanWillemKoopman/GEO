"use client";

import { CopyButton } from "@/components/copy-button";

/** Kopiëren / downloaden van een gegenereerde pagina (abcplan.md §8). */
export function ContentActions({
  title,
  markdown,
  html,
  schemaJsonLd,
}: {
  title: string;
  markdown: string;
  html: string;
  schemaJsonLd: string | null;
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
    </div>
  );
}
