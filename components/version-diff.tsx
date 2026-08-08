"use client";

import { useState } from "react";
import type { DiffOp } from "@/lib/pipeline/content-diff";

/**
 * Het verschil met de vorige versie, uitklapbaar (content-editie, onderdeel
 * 1), naar Nova's "contentvoorbeeld met diff, rood is oud, groen is nieuw".
 *
 * Fetcht lazy bij de eerste keer uitklappen en cachet daarna lokaal: "Bekijk
 * verschil" is een opt-in handeling, de kosten van het ophalen van de volle
 * tekst van twee versies horen pas te vallen op het moment dat erom gevraagd
 * wordt (zie de route zelf, `.../diff/route.ts`).
 */
export function VersionDiff({
  analysisId,
  pieceId,
  previousId,
}: {
  analysisId: string;
  pieceId: string;
  previousId: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "laden" | "klaar" | "fout">("idle");
  const [ops, setOps] = useState<DiffOp[]>([]);
  const [granularity, setGranularity] = useState<"woord" | "alinea">("woord");

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || state !== "idle") return;

    setState("laden");
    try {
      const res = await fetch(
        `/api/analyses/${analysisId}/content/${pieceId}/diff?met=${previousId}`,
        { cache: "no-store" },
      );
      if (!res.ok) {
        setState("fout");
        return;
      }
      const json = (await res.json()) as { ops: DiffOp[]; granularity: "woord" | "alinea" };
      setOps(json.ops);
      setGranularity(json.granularity);
      setState("klaar");
    } catch {
      setState("fout");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-expanded={open}
        className="w-fit text-sm text-secondary hover:underline"
      >
        {open ? "Verberg verschil" : "Bekijk verschil met vorige versie"}
      </button>

      {open && state === "laden" && <p className="text-sm text-muted">Bezig met vergelijken…</p>}
      {open && state === "fout" && (
        <p className="text-sm text-[var(--status-error)]" role="alert">
          Vergelijken is niet gelukt. Probeer het opnieuw.
        </p>
      )}
      {open && state === "klaar" && (
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-sm leading-relaxed">
          {granularity === "alinea" && (
            <p className="mb-2 text-muted">
              Deze tekst is lang, dus vergeleken per alinea in plaats van per woord.
            </p>
          )}
          <p style={{ whiteSpace: "pre-wrap" }}>
            {ops.map((op, i) => {
              if (op.type === "gelijk") {
                return (
                  <span key={i} className="text-secondary">
                    {op.text}
                  </span>
                );
              }
              if (op.type === "verwijderd") {
                return (
                  <del
                    key={i}
                    style={{
                      background: "var(--intent-danger-surface)",
                      color: "var(--intent-danger-text)",
                      textDecorationColor: "var(--intent-danger-text)",
                    }}
                  >
                    {op.text}
                  </del>
                );
              }
              return (
                <ins
                  key={i}
                  style={{
                    background: "var(--intent-growth-surface)",
                    color: "var(--intent-growth-text)",
                    textDecoration: "none",
                  }}
                >
                  {op.text}
                </ins>
              );
            })}
          </p>
        </div>
      )}
    </div>
  );
}
