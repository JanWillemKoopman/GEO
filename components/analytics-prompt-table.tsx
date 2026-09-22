"use client";

import Link from "next/link";
import { AnalyticsTable, type AnalyticsColumn } from "@/components/analytics-table";
import { HighlightedText, type HighlightGroup } from "@/components/highlighted-text";
import type { PromptVisibilityRow } from "@/lib/pipeline/prompt-visibility";

/**
 * De prompttabel onder "Per cluster" op Analytics → Zichtbaarheid in AI
 * (22 september 2026).
 *
 * ── WAAROM GEEN SIDEBAR ──────────────────────────────────────────────────
 *
 * De clustertabel ernaast opende tot deze datum een zijpaneel per rij met
 * precies dit soort detail (de letterlijke antwoorden, `cluster-answers.tsx`).
 * Die klik is weggehaald: één rij aanklikken voor het antwoord van één cluster
 * terwijl je eigenlijk wilt zien waar je merk het meest en het minst
 * genoemd wordt. Elke vraag ligt hier al plat, gesorteerd op zichtbaarheid,
 * met het antwoord één klik weg via `<details>` in de rij zelf, geen paneel
 * dat de rest van de pagina verschuift.
 */
export function AnalyticsPromptTable({
  rows,
  merkId,
  ownTerms,
}: {
  rows: PromptVisibilityRow[];
  merkId: string;
  /** Voor het markeren van de eigen merknaam in het antwoord (cluster-answers.tsx doet hetzelfde). */
  ownTerms: string[];
}) {
  return (
    <div className="card">
      <AnalyticsTable
        rows={rows}
        rowKey={(r) => `${r.clusterId}:${r.promptId ?? r.prompt}`}
        defaultSortKey="zichtbaarheid"
        defaultSortDir="desc"
        columns={promptKolommen(merkId, ownTerms)}
        stickyOffset="calc(var(--header-h) + 3.5rem)"
        emptyLabel="Voor deze filters zijn nog geen vragen gemeten."
      />
    </div>
  );
}

function promptKolommen(merkId: string, ownTerms: string[]): AnalyticsColumn<PromptVisibilityRow>[] {
  const groups: HighlightGroup[] = [{ terms: ownTerms, variant: "own" }];

  return [
    {
      key: "cluster",
      header: "Cluster",
      width: "12rem",
      sortValue: (r) => r.clusterName,
      render: (r) => (
        <Link href={`/merk/${merkId}/analytics?cluster=${r.clusterId}`} className="hover:underline">
          {r.clusterName}
        </Link>
      ),
    },
    {
      key: "prompt",
      header: "Prompt",
      render: (r) => (
        <details>
          <summary className="flex cursor-pointer items-start gap-2">
            <span
              className={`mt-0.5 shrink-0 chip ${r.ownMentioned === true ? "chip-success" : "chip-neutral"}`}
              style={{ fontSize: "0.6rem" }}
            >
              {r.ownMentioned === true ? "genoemd" : r.ownMentioned === false ? "gemist" : "onbeoordeeld"}
            </span>
            <span className="min-w-0 flex-1">{r.prompt}</span>
          </summary>
          <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] py-2 pl-6 text-sm">
            {r.competitors.length > 0 && (
              <p className="text-secondary">Ook genoemd: {r.competitors.map((c) => c.name).join(", ")}.</p>
            )}
            <p className="whitespace-pre-wrap text-secondary">
              {r.answer ? <HighlightedText text={r.answer} groups={groups} /> : "Geen antwoordtekst bewaard."}
            </p>
            {r.sources.length > 0 && <p className="type-caption text-muted">Bronnen: {r.sources.join(", ")}</p>}
          </div>
        </details>
      ),
    },
    {
      key: "zichtbaarheid",
      header: "Zichtbaarheid",
      numeriek: true,
      width: "8rem",
      sortValue: (r) => r.score,
      render: (r) => (r.score === null ? "-" : `${r.score}%`),
    },
    {
      key: "gemeten",
      header: "Gemeten",
      numeriek: true,
      width: "7rem",
      sortValue: (r) => r.judgedRuns,
      render: (r) => (r.judgedRuns > 0 ? `${r.mentionedRuns}/${r.judgedRuns}` : "-"),
    },
  ];
}
