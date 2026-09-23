"use client";

import { CopyButton } from "@/components/copy-button";
import { InfoHint } from "@/components/info-hint";
import { kopieeropties } from "@/lib/kopieervormen";

/**
 * Kopiëren en downloaden van een gegenereerde pagina (abcplan.md §8).
 *
 * ── DRIE KOPIEERVORMEN IN PLAATS VAN ÉÉN ────────────────────────────────────
 *
 * Tot 16 september 2026 stond hier één knop, "Kopieer tekst", en die zette
 * Markdown op het klembord. Voor bijna elk CMS is dat het verkeerde formaat, en
 * dit is de laatste handeling vóór de klant zijn eigen site aanraakt. De drie
 * vormen en de reden om er één te kiezen staan in `lib/kopieervormen.ts`, puur
 * en getest; dit scherm toont ze en verzint er niets bij.
 *
 * ⚠️ **De reden staat naast de knop en niet achter een vraagteken.** Een klant
 * die niet weet wat HTML is, moet zonder klikken kunnen zien welke rij bij zijn
 * situatie hoort. Daarom leest elke regel over zíjn CMS ("een editor waarin je
 * zelf opmaakt") en niet over het formaat.
 *
 * ── VAN ZEVEN KNOPPEN BOVEN DE TEKST NAAR ÉÉN MENU (22 september 2026) ──────
 *
 * Deze knoppen stonden bovenaan de pagina, vóór de tekst: drie kopieervormen,
 * twee downloads, de schema-markup en de sjabloonexport. De eerste
 * schermhoogte ging daarmee op aan exporteren in plaats van aan lezen, terwijl
 * exporteren de laatste handeling is en niet de eerste.
 *
 * Het besluit van 16 september blijft overeind: de reden staat nog steeds per
 * regel in beeld zodra het menu open is. Wat veranderde is dat het menu dicht
 * is tot je het nodig hebt, niet dat de uitleg achter een vraagteken verdween.
 */
export function ContentActions({
  title,
  markdown,
  html,
  schemaJsonLd,
  templateExport,
  handleiding,
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
  /**
   * "Hoe zet je dit op je site?" (`components/publish-guide.tsx`). Stond als
   * eigen ingeklapte kaart op de pagina; hoort bij het exporteren en dus in
   * hetzelfde menu. Weglaten zodra de pagina gepubliceerd is: wie voor de
   * tweede keer publiceert heeft hem niet meer nodig.
   */
  handleiding?: React.ReactNode;
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
  const opties = kopieeropties(markdown, html);

  return (
    <div className="flex flex-col gap-4">
      {opties.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="mono-label">
            Kies het formaat dat bij je CMS past
          </p>
          <ul className="flex flex-col gap-2">
            {opties.map((optie) => (
              <li key={optie.vorm} className="flex flex-col gap-0.5">
                <CopyButton
                  value={optie.waarde}
                  label={optie.label}
                  copiedLabel="Gekopieerd"
                  className="w-fit text-sm font-medium hover:underline"
                />
                <span className="text-sm text-secondary">{optie.waarvoor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3">
        <button
          onClick={() => download(`${slug}.md`, markdown, "text/markdown")}
          className="w-fit text-sm hover:underline"
        >
          Download .md
        </button>
        <button
          onClick={() => download(`${slug}.html`, htmlDoc, "text/html")}
          className="w-fit text-sm hover:underline"
        >
          Download .html
        </button>
        {schemaJsonLd && (
          <CopyButton
            value={schemaJsonLd}
            label="Kopieer schema-markup"
            copiedLabel="Gekopieerd"
            className="w-fit text-sm hover:underline"
          />
        )}
        {templateExport && (
          <span className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1">
              <button
                onClick={() => download(templateExport.filename, templateExport.content, "text/html")}
                className="w-fit text-sm hover:underline"
              >
                {templateExport.label}
              </button>
              <InfoHint label="Wat is dit?">
                ORBIT ENGINE herkende tijdens het onderzoek hoe jouw site is opgebouwd, en heeft deze
                pagina alvast in diezelfde vorm klaargezet. Zo hoef je bij het plakken niets meer om
                te bouwen.
              </InfoHint>
            </span>
          </span>
        )}
      </div>

      {handleiding && (
        <div className="border-t border-[var(--border-subtle)] pt-3">{handleiding}</div>
      )}
    </div>
  );
}
