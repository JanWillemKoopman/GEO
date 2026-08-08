"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorNotice, problemFromResponse, networkProblem } from "@/components/error-notice";
import { FaqEditor, type FaqEditItem } from "@/components/faq-editor";
import { SearchPreview } from "@/components/search-preview";
import { renderMarkdown } from "@/lib/markdown";
import type { UserFacingError } from "@/lib/errors";

/**
 * De tekst zelf bijschaven (optimalisatie.md 4.12, content-editie onderdeel
 * 3/4/6).
 *
 * De klant kon alleen kopiëren of downloaden. Een tekst die je niet kunt
 * aanpassen, publiceer je niet. Dan blijft hij in de bibliotheek liggen en
 * gebeurt er niets, hoe goed hij ook is. Vaak gaat het om één zin: een naam
 * anders schrijven, een prijs erbij, een claim eruit.
 *
 * Bewust geen rijke editor met werkbalk. Markdown is wat de klant straks toch
 * plakt, en een WYSIWYG die stiekem andere HTML produceert dan wat er in de
 * database staat, levert precies het soort verrassing op dat je niet wilt bij
 * tekst die gepubliceerd wordt. De "voorbeeld"-stand hieronder haalt dezelfde
 * `renderMarkdown()` erbij als het gepubliceerde artikel elders op de pagina
 * gebruikt, dus dat verandert niets aan wat wordt opgeslagen: nog steeds
 * platte markdown.
 */
interface EditorState {
  title: string;
  bodyMarkdown: string;
  metaTitle: string;
  metaDescription: string;
  faq: FaqEditItem[];
}

export function ContentEditor({
  analysisId,
  pieceId,
  initial,
  previewUrl,
}: {
  analysisId: string;
  pieceId: string;
  initial: EditorState;
  /** Vaste URL voor de live zoekresultaat-preview, berekend in page.tsx (verandert niet tijdens het bewerken). */
  previewUrl: { url: string; isReal: boolean };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [weergave, setWeergave] = useState<"bewerken" | "voorbeeld">("bewerken");
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.bodyMarkdown);
  const [metaTitle, setMetaTitle] = useState(initial.metaTitle);
  const [metaDescription, setMetaDescription] = useState(initial.metaDescription);
  const [faq, setFaq] = useState<FaqEditItem[]>(initial.faq);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [problem, setProblem] = useState<UserFacingError | null>(null);

  const dirty =
    title !== initial.title ||
    body !== initial.bodyMarkdown ||
    metaTitle !== initial.metaTitle ||
    metaDescription !== initial.metaDescription ||
    JSON.stringify(faq) !== JSON.stringify(initial.faq);

  async function save() {
    setState("saving");
    setProblem(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/content/${pieceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body_markdown: body,
          meta_title: metaTitle,
          meta_description: metaDescription,
          faq_json: faq,
        }),
      });
      if (!res.ok) {
        setState("error");
        setProblem(problemFromResponse(await res.json().catch(() => null)));
        return;
      }
      setState("saved");
      setOpen(false);
      // De pagina opnieuw laten renderen zodat de opgemaakte weergave hierboven
      // meteen de nieuwe tekst toont in plaats van de oude.
      router.refresh();
    } catch (err) {
      setState("error");
      setProblem(networkProblem(err));
    }
  }

  if (state === "error" && problem) {
    return <ErrorNotice error={problem} onRetry={() => void save()} />;
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOpen(true)} className="btn-outline w-fit">
          Tekst bewerken
        </button>
        {state === "saved" && <span className="text-sm text-secondary">✓ Opgeslagen</span>}
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="mono-label">Tekst bewerken</span>
          <p className="text-sm text-secondary">
            Markdown. Je wijzigingen overschrijven deze versie; laat je hierna een nieuwe versie
            schrijven, dan begint die weer bij de tekst van de AI.
          </p>
        </div>
        <div className="flex shrink-0 gap-1 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-0.5">
          <button
            type="button"
            onClick={() => setWeergave("bewerken")}
            aria-pressed={weergave === "bewerken"}
            className="rounded-[calc(var(--radius-md)-2px)] px-3 py-1 text-sm"
            style={
              weergave === "bewerken"
                ? { background: "var(--intent-intelligence-surface)", color: "var(--intent-intelligence-text)" }
                : { color: "var(--text-muted)" }
            }
          >
            Bewerken
          </button>
          <button
            type="button"
            onClick={() => setWeergave("voorbeeld")}
            aria-pressed={weergave === "voorbeeld"}
            className="rounded-[calc(var(--radius-md)-2px)] px-3 py-1 text-sm"
            style={
              weergave === "voorbeeld"
                ? { background: "var(--intent-intelligence-surface)", color: "var(--intent-intelligence-text)" }
                : { color: "var(--text-muted)" }
            }
          >
            Voorbeeld
          </button>
        </div>
      </div>

      {weergave === "bewerken" ? (
        <>
          <label className="flex flex-col gap-1 text-sm">
            <span className="mono-label" style={{ fontSize: "0.65rem" }}>
              Titel
            </span>
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="mono-label" style={{ fontSize: "0.65rem" }}>
              Paginatekst
            </span>
            <textarea
              className="field font-mono"
              style={{ fontSize: "0.8rem", lineHeight: 1.6 }}
              rows={22}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              aria-label="Paginatekst in Markdown"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="mono-label" style={{ fontSize: "0.65rem" }}>
              Meta-title ({metaTitle.length}/60)
            </span>
            <input
              className="field"
              value={metaTitle}
              maxLength={70}
              onChange={(e) => setMetaTitle(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="mono-label" style={{ fontSize: "0.65rem" }}>
              Meta-description ({metaDescription.length}/160)
            </span>
            <textarea
              className="field"
              rows={2}
              value={metaDescription}
              maxLength={200}
              onChange={(e) => setMetaDescription(e.target.value)}
            />
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="mono-label" style={{ fontSize: "0.65rem" }}>
              Veelgestelde vragen
            </span>
            <FaqEditor items={faq} onChange={setFaq} />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <article
            className="card prose max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
          />
          <SearchPreview
            title={title}
            metaTitle={metaTitle}
            metaDescription={metaDescription}
            url={previewUrl.url}
            isReal={previewUrl.isReal}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={state === "saving" || !dirty}
          className="btn-primary w-fit"
        >
          {state === "saving" ? "Opslaan…" : "Opslaan"}
        </button>
        <button
          type="button"
          onClick={() => {
            setTitle(initial.title);
            setBody(initial.bodyMarkdown);
            setMetaTitle(initial.metaTitle);
            setMetaDescription(initial.metaDescription);
            setFaq(initial.faq);
            setWeergave("bewerken");
            setOpen(false);
          }}
          className="text-sm text-secondary hover:underline"
        >
          Annuleren
        </button>
      </div>
    </div>
  );
}
