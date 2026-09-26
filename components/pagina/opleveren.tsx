"use client";

import { CopyButton } from "@/components/copy-button";
import { InfoHint } from "@/components/info-hint";
import { kopieeropties } from "@/lib/kopieervormen";
import { renderMarkdown } from "@/lib/markdown";
import { bestandsnaam, faqMarkdown, htmlDocument, volledigeMarkdown, type FaqPaar } from "@/lib/oplevering";

/**
 * WAT DE KLANT OP ZIJN SITE ZET: de zoekmachinegegevens, de veelgestelde vragen,
 * en na het goedkeuren alles om het mee te nemen (`lib/oplevering.ts`).
 *
 * ── TWEE STANDEN ────────────────────────────────────────────────────────────
 *
 * Vóór het goedkeuren alleen lezen: de titel en omschrijving voor zoekmachines
 * en de FAQ horen bij wat de ondernemer goedkeurt, dus hij moet ze zien. Tot 26
 * september 2026 keurde hij een pagina goed waarvan hij de FAQ nooit gezien had.
 *
 * Na het goedkeuren komen de kopieerknoppen en downloads erbij. Niet eerder:
 * wie vóór het goedkeuren kopieert, plakt misschien een versie met een gele zin
 * op zijn site.
 *
 * De kopieervormen en hun uitleg per CMS komen uit `lib/kopieervormen.ts`; de
 * sjabloonexport uit `lib/pipeline/content-export.ts`, als het onderzoek de
 * opbouw van de site herkende.
 */
export function Opleveren({
  titel,
  tekst,
  metaTitel,
  metaBeschrijving,
  faq,
  schemaJsonLd,
  templateExport,
  goedgekeurd,
}: {
  /** De titel van de schrijver, voor de bestandsnamen. */
  titel: string;
  tekst: string;
  metaTitel: string | null;
  metaBeschrijving: string | null;
  faq: FaqPaar[];
  schemaJsonLd: string | null;
  templateExport: { label: string; filename: string; content: string } | null;
  goedgekeurd: boolean;
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

  const slug = bestandsnaam(titel);
  const tekstOpties = kopieeropties(tekst, renderMarkdown(tekst));
  const faqMd = faqMarkdown(faq);
  const faqOpties = faqMd ? kopieeropties(faqMd, renderMarkdown(faqMd)) : [];
  const heeftMeta = Boolean(metaTitel?.trim() || metaBeschrijving?.trim());

  return (
    <div className="flex flex-col gap-6">
      {heeftMeta && (
        <section className="card flex flex-col gap-3">
          <h2 className="type-section flex items-center gap-1">
            Zo staat de pagina in zoekmachines
            <InfoHint label="Wat is dit?">
              Google en AI-assistenten tonen deze titel en omschrijving als ze naar je pagina verwijzen. Je
              zet ze in de instellingen van de pagina op je site, meestal onder SEO.
            </InfoHint>
          </h2>
          {metaTitel?.trim() && (
            <div className="flex flex-col gap-1">
              <span className="mono-label">Titel</span>
              <p className="type-body">{metaTitel}</p>
              {goedgekeurd && <CopyButton value={metaTitel} label="Kopieer de titel" copiedLabel="Gekopieerd" />}
            </div>
          )}
          {metaBeschrijving?.trim() && (
            <div className="flex flex-col gap-1">
              <span className="mono-label">Omschrijving</span>
              <p className="type-body">{metaBeschrijving}</p>
              {goedgekeurd && (
                <CopyButton value={metaBeschrijving} label="Kopieer de omschrijving" copiedLabel="Gekopieerd" />
              )}
            </div>
          )}
        </section>
      )}

      {faq.length > 0 && (
        <section className="card flex flex-col gap-3">
          <h2 className="type-section">Veelgestelde vragen</h2>
          <dl className="flex flex-col gap-3">
            {faq.map((f, i) => (
              <div key={i} className="flex flex-col gap-1">
                <dt className="type-body font-medium">{f.q}</dt>
                <dd className="type-body text-secondary">{f.a}</dd>
              </div>
            ))}
          </dl>
          {goedgekeurd && faqOpties.length > 0 && (
            <ul className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3">
              {faqOpties.map((optie) => (
                <li key={optie.vorm}>
                  <CopyButton
                    value={optie.waarde}
                    label={optie.label.replace("Kopieer", "Kopieer de vragen")}
                    copiedLabel="Gekopieerd"
                    className="w-fit text-sm font-medium hover:underline"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {goedgekeurd && (
        <section className="card flex flex-col gap-4">
          <h2 className="type-section">Zet de pagina op je site</h2>

          {tekstOpties.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="mono-label">De tekst, in het formaat dat bij je site past</p>
              <ul className="flex flex-col gap-2">
                {tekstOpties.map((optie) => (
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
            <p className="mono-label">Alles in één bestand</p>
            <button
              type="button"
              onClick={() =>
                download(
                  `${slug}.html`,
                  htmlDocument({ metaTitel, metaBeschrijving, tekst, faq, schemaJsonLd }),
                  "text/html",
                )
              }
              className="w-fit text-sm hover:underline"
            >
              Download als HTML
            </button>
            <span className="text-sm text-secondary">
              Met de tekst, de veelgestelde vragen, de titel en omschrijving voor zoekmachines, en de
              gestructureerde gegevens. Handig voor je webbouwer.
            </span>
            <button
              type="button"
              onClick={() => download(`${slug}.md`, volledigeMarkdown(tekst, faq), "text/markdown")}
              className="w-fit text-sm hover:underline"
            >
              Download als Markdown
            </button>
            {templateExport && (
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => download(templateExport.filename, templateExport.content, "text/html")}
                  className="w-fit text-sm hover:underline"
                >
                  {templateExport.label}
                </button>
                <InfoHint label="Wat is dit?">
                  ORBIT ENGINE herkende tijdens het onderzoek hoe jouw site is opgebouwd, en heeft deze pagina
                  alvast in diezelfde vorm klaargezet. Zo hoef je bij het plakken niets meer om te bouwen.
                </InfoHint>
              </span>
            )}
            {schemaJsonLd?.trim() && (
              <span className="flex items-center gap-1">
                <CopyButton
                  value={schemaJsonLd}
                  label="Kopieer de gestructureerde gegevens"
                  copiedLabel="Gekopieerd"
                  className="w-fit text-sm hover:underline"
                />
                <InfoHint label="Wat is dit?">
                  Een stukje code dat zoekmachines en AI-assistenten vertelt waar de pagina over gaat en van
                  wie hij is. Het hoort in de kop van deze ene pagina; je webbouwer weet waar.
                </InfoHint>
              </span>
            )}
          </div>

        </section>
      )}
    </div>
  );
}
