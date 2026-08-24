"use client";

import { useMemo, useState } from "react";
import { InfoHint } from "@/components/info-hint";
import { HighlightedText } from "@/components/highlighted-text";
import { VOLUME_BAND_LABEL } from "@/lib/pipeline/volume";
import { PROMPT_CATEGORIES } from "@/lib/types/database";
import type { AnswerRow } from "@/lib/pipeline/answers";
import { Icon } from "@/components/icon";

/**
 * "Vragen & antwoorden" (optimalisatie.md 3.1/3.2).
 *
 * De standaardsortering is geen smaakkwestie: **gemist én hoog gewicht bovenaan**
 * is de lijst waar geld in zit. Een klant die dit tabblad opent, moet niet eerst
 * gaan filteren om te vinden waar hij iets kan winnen. Dat moet er staan.
 */
type SortMode = "kansen" | "gewicht" | "vraag";

const SORT_LABEL: Record<SortMode, string> = {
  kansen: "Grootste kansen eerst",
  gewicht: "Zwaarste vragen eerst",
  vraag: "Op volgorde van de vraag",
};

export function AnswersView({
  rows,
  ownLabel,
  ownTerms,
  /** Alleen deze metingen tonen, gezet vanuit een doorklik in het rapport (3.3). */
  focusRunIds,
}: {
  rows: AnswerRow[];
  ownLabel: string;
  ownTerms: string[];
  focusRunIds: string[] | null;
}) {
  const [onlyMissed, setOnlyMissed] = useState(false);
  const [category, setCategory] = useState<string>("alle");
  const [sort, setSort] = useState<SortMode>("kansen");
  const [focused, setFocused] = useState(focusRunIds);

  const visible = useMemo(() => {
    let list = rows;
    if (focused && focused.length > 0) {
      const set = new Set(focused);
      list = list.filter((r) => set.has(r.runId));
    }
    if (onlyMissed) list = list.filter((r) => r.ownMentioned === false);
    if (category !== "alle") list = list.filter((r) => r.category === category);

    const sorted = [...list];
    if (sort === "gewicht") {
      sorted.sort((a, b) => b.weight - a.weight);
    } else if (sort === "kansen") {
      // Gemist telt zwaarder dan gewicht: een zware vraag die je al wint is geen
      // kans, een lichte die je mist wel, maar tussen twee gemiste vragen wint
      // de zwaarste.
      sorted.sort((a, b) => {
        const aMissed = a.ownMentioned === false ? 1 : 0;
        const bMissed = b.ownMentioned === false ? 1 : 0;
        if (aMissed !== bMissed) return bMissed - aMissed;
        return b.weight - a.weight;
      });
    }
    return sorted;
  }, [rows, focused, onlyMissed, category, sort]);

  const missedCount = rows.filter((r) => r.ownMentioned === false).length;
  const wonCount = rows.filter((r) => r.ownMentioned === true).length;
  const categories = Array.from(new Set([...(PROMPT_CATEGORIES as readonly string[]), ...rows.map((r) => r.category)]));

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="mono-label flex items-center gap-1">
            Wat de AI antwoordt
            <InfoHint label="Wat de AI antwoordt">
              De letterlijke antwoorden die een AI-assistent op jouw vragen gaf. Niets
              samengevat, niets weggelaten. Jouw merknaam staat paars gemarkeerd, concurrenten grijs.
            </InfoHint>
          </span>
          <span className="mono-label">
            {wonCount} genoemd · {missedCount} gemist van {rows.length}
          </span>
        </div>

        {focused && focused.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--intent-intelligence-border)] p-3 text-sm">
            <span className="text-secondary">
              Het bewijs bij één punt uit je rapport: {focused.length}{" "}
              {focused.length === 1 ? "meting" : "metingen"}.
            </span>
            <button type="button" onClick={() => setFocused(null)} className="hover:underline">
              Toon alle vragen
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyMissed((v) => !v)}
            aria-pressed={onlyMissed}
            className="chip"
            style={
              onlyMissed
                ? undefined
                : { background: "transparent", color: "var(--text-muted)", borderColor: "var(--border-subtle)" }
            }
          >
            Alleen waar ik niet genoemd word
          </button>

          <select
            className="field w-auto"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Filter op fase van het aankoopproces"
          >
            <option value="alle">Alle fases</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            className="field w-auto"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            aria-label="Sorteren"
          >
            {(Object.keys(SORT_LABEL) as SortMode[]).map((m) => (
              <option key={m} value={m}>
                {SORT_LABEL[m]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <p className="text-secondary">
            Geen vragen binnen dit filter.{" "}
            {onlyMissed
              ? "Je wordt dus overal genoemd. Sterke stand."
              : "Wissel van fase of zet het filter hierboven uit om meer vragen te zien."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((row) => (
            <AnswerCard key={row.runId} row={row} ownLabel={ownLabel} ownTerms={ownTerms} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AnswerCard({
  row,
  ownLabel,
  ownTerms,
}: {
  row: AnswerRow;
  ownLabel: string;
  ownTerms: string[];
}) {
  const [open, setOpen] = useState(false);

  const status =
    row.ownMentioned === null
      ? { text: "Niet beoordeeld", className: "chip chip-neutral" }
      : row.ownMentioned
        ? { text: "Jij wordt genoemd", className: "chip chip-success" }
        : { text: "Jij ontbreekt", className: "chip chip-danger" };

  return (
    <li className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="flex-1 font-medium">{row.prompt}</p>
        <span className={`${status.className} shrink-0`}>{status.text}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="chip" style={{ fontSize: "0.7rem" }}>
          {row.category}
        </span>
        <span className="chip" style={{ fontSize: "0.7rem" }}>
          {VOLUME_BAND_LABEL[row.volumeBand]}
        </span>
        {row.ownMentioned && row.ownPosition != null && (
          <span className="chip" style={{ fontSize: "0.7rem" }}>
            jij op plek {row.ownPosition}
          </span>
        )}
      </div>

      {row.competitors.length > 0 && (
        <p className="text-sm text-secondary">
          <span className="text-muted">Wel genoemd: </span>
          {row.competitors.map((c) => c.name).join(", ")}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="btn-outline btn-sm w-fit"
        >
          {open ? "Verberg het antwoord" : "Lees het antwoord"}
        </button>
        {open && <CopyButton row={row} ownLabel={ownLabel} />}
      </div>

      {open && (
        <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-3">
          {row.answer ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-secondary">
              <HighlightedText
                text={row.answer}
                groups={[
                  { terms: ownTerms.length > 0 ? ownTerms : [ownLabel], variant: "own" },
                  { terms: row.competitors.map((c) => c.name), variant: "competitor" },
                ]}
              />
            </p>
          ) : (
            <p className="text-sm text-muted">Het antwoord is niet bewaard gebleven.</p>
          )}

          {row.sources.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="mono-label" style={{ fontSize: "0.65rem" }}>
                Bronnen die de AI aanhaalde
              </span>
              <ul className="flex flex-col gap-0.5">
                {row.sources.map((s) => (
                  <li key={s} className="truncate text-sm">
                    <a
                      href={s}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-secondary underline hover:text-[var(--text-primary)]"
                    >
                      {s}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Deelbaar bewijs (optimalisatie.md 3.4).
 *
 * Bewust kopiëren-naar-klembord en geen afbeeldingsexport: dat laatste vraagt om
 * een canvas-bibliotheek van honderden kilobytes, terwijl "plakken in een mail
 * of appje" precies is wat een bureau of ondernemer met dit bewijs doet. De
 * printknop van de browser levert een PDF voor wie dat wil.
 */
function CopyButton({ row, ownLabel }: { row: AnswerRow; ownLabel: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const lines = [
      `Vraag aan een AI-assistent: "${row.prompt}"`,
      "",
      row.ownMentioned
        ? `${ownLabel} wordt genoemd${row.ownPosition != null ? ` (op plek ${row.ownPosition})` : ""}.`
        : `${ownLabel} wordt NIET genoemd.`,
      row.competitors.length > 0 ? `Wel genoemd: ${row.competitors.map((c) => c.name).join(", ")}.` : "",
      "",
      "Het antwoord:",
      row.answer ?? "(niet bewaard)",
      row.sources.length > 0 ? `\nBronnen:\n${row.sources.join("\n")}` : "",
    ].filter((l) => l !== "");

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Klembord geweigerd (geen https, of de gebruiker zei nee). Dan doen we
      // niets. Een foutmelding voor een kopieerknop is meer ruis dan hulp.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      className="inline-flex items-center gap-1.5 text-sm text-secondary hover:underline"
    >
      <Icon naam={copied ? "klaar" : "kopieer"} size={14} />
      {copied ? "Gekopieerd" : "Kopieer als bewijs"}
    </button>
  );
}
