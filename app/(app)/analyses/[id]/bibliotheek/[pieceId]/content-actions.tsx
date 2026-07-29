"use client";

import { useState } from "react";

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
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }

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
      <button onClick={() => void copy("markdown", markdown)} className="btn-outline">
        {copied === "markdown" ? "Gekopieerd ✓" : "Kopieer tekst"}
      </button>
      <button onClick={() => download(`${slug}.md`, markdown, "text/markdown")} className="btn-outline">
        Download .md
      </button>
      <button onClick={() => download(`${slug}.html`, htmlDoc, "text/html")} className="btn-outline">
        Download .html
      </button>
      {schemaJsonLd && (
        <button onClick={() => void copy("schema", schemaJsonLd)} className="btn-outline">
          {copied === "schema" ? "Gekopieerd ✓" : "Kopieer schema-markup"}
        </button>
      )}
    </div>
  );
}
