"use client";

import { useEffect, useState } from "react";
import { HighlightedText } from "@/components/highlighted-text";
import type { AnswerRow } from "@/lib/pipeline/answers";

/**
 * De letterlijke antwoorden van één cluster, in het detailpaneel van Analytics
 * → Zichtbaarheid (plan analytics-herontwerp.md, Z8).
 *
 * ── WAAROM DIT HIER STAAT EN NIET MEER OP HET CLUSTER ZELF ──────────────────
 *
 * Tot 16 september 2026 stond deze lijst op het clusterdossier
 * (`/analyses/[id]`, hoofdstuk "Waar je wint en mist"). Die verhuisde naar
 * Analytics samen met de rest van de cijfers: dit ís het bewijs achter de
 * zichtbaarheidsscore, geen contentbeslissing. `docs/tasks/analytics-herontwerp.md`
 * had deze plek al klaarstaan (Z8: "de gemeten vragen"), alleen zonder de
 * letterlijke tekst.
 *
 * Alles staat standaard dichtgeklapt: bij dertig vragen is de volledige tekst
 * van elk antwoord een muur, en het paneel is hooguit 20rem breed. Eén
 * `<details>` per vraag houdt het antwoord één klik weg in plaats van
 * verplicht zichtbaar.
 */
export function ClusterAnswers({ analysisId }: { analysisId: string }) {
  const [state, setState] = useState<
    | { status: "laden" }
    | { status: "fout" }
    | { status: "klaar"; rows: AnswerRow[]; ownLabel: string; ownTerms: string[] }
  >({ status: "laden" });

  useEffect(() => {
    let actief = true;
    setState({ status: "laden" });
    fetch(`/api/analyses/${analysisId}/answers`)
      .then((res) => {
        if (!res.ok) throw new Error("mislukt");
        return res.json();
      })
      .then((data) => {
        if (!actief) return;
        setState({ status: "klaar", rows: data.rows ?? [], ownLabel: data.ownLabel, ownTerms: data.ownTerms ?? [] });
      })
      .catch(() => {
        if (actief) setState({ status: "fout" });
      });
    return () => {
      actief = false;
    };
  }, [analysisId]);

  if (state.status === "laden") {
    return <p className="text-sm text-muted">Antwoorden laden…</p>;
  }
  if (state.status === "fout") {
    return <p className="text-sm text-muted">De antwoorden konden niet geladen worden.</p>;
  }
  if (state.rows.length === 0) {
    return <p className="text-sm text-muted">Voor dit cluster zijn nog geen antwoorden bewaard.</p>;
  }

  const groups = [
    { terms: state.ownTerms, variant: "own" as const },
  ];

  return (
    <div className="flex flex-col gap-1.5">
      <span className="mono-label">Gemeten antwoorden</span>
      <ul className="flex flex-col gap-1">
        {state.rows.map((r) => (
          <li key={r.runId} className="rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
            <details>
              <summary className="flex cursor-pointer items-start gap-2 p-2 text-sm">
                <span
                  className={`mt-0.5 shrink-0 chip ${
                    r.ownMentioned === true ? "chip-success" : r.ownMentioned === false ? "chip-neutral" : "chip-neutral"
                  }`}
                  style={{ fontSize: "0.6rem" }}
                >
                  {r.ownMentioned === true ? "genoemd" : r.ownMentioned === false ? "gemist" : "onbeoordeeld"}
                </span>
                <span className="min-w-0 flex-1">{r.prompt}</span>
              </summary>
              <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] p-2 text-sm">
                {r.competitors.length > 0 && (
                  <p className="text-secondary">
                    Ook genoemd: {r.competitors.map((c) => c.name).join(", ")}.
                  </p>
                )}
                <p className="whitespace-pre-wrap text-secondary">
                  {r.answer ? <HighlightedText text={r.answer} groups={groups} /> : "Geen antwoordtekst bewaard."}
                </p>
                {r.sources.length > 0 && (
                  <p className="type-caption text-muted">Bronnen: {r.sources.join(", ")}</p>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
