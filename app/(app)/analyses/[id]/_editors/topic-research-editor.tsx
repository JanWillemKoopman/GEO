"use client";

import { useState } from "react";
import { TagListEditor } from "@/components/tag-list-editor";
import type { TopicResearch } from "@/lib/types/database";

/**
 * Bewerkbaar onderwerp-onderzoek van déze analyse (abcplan.md §3.5/§3.6, na de
 * klantprofiel-refactor): alleen nog wat specifiek is voor dit product/thema.
 * Het bedrijfsbrede Brand DNA leeft nu in het klantprofiel (zie ProfileCard
 * hierboven op deze pagina).
 */
export function TopicResearchEditor({
  analysisId,
  initial,
}: {
  analysisId: string;
  initial: TopicResearch;
}) {
  const [research, setResearch] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/topic-research`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content_summary: research.content_summary,
          competitors: research.competitors,
        }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
    } catch {
      setError("Opslaan mislukt. Probeer het opnieuw.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card flex flex-col gap-4">
      <span className="mono-label">Onderwerp-onderzoek</span>

      <label className="flex flex-col gap-1.5">
        <span className="mono-label">Wat de website hierover zegt</span>
        <textarea
          className="field"
          rows={4}
          value={research.content_summary ?? ""}
          onChange={(e) => setResearch((r) => ({ ...r, content_summary: e.target.value }))}
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="mono-label">Concurrenten voor dit onderwerp</span>
        <TagListEditor
          items={research.competitors}
          onChange={(competitors) => setResearch((r) => ({ ...r, competitors }))}
          placeholder="Nieuwe concurrent…"
        />
        <span className="text-sm text-muted">
          Naast de bedrijfsbrede concurrenten uit het merkprofiel.
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => void save()} disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? "Opslaan…" : "Wijzigingen opslaan"}
        </button>
        {saved && <span className="text-sm text-[var(--accent-green-text)]">Opgeslagen ✓</span>}
        {error && <span className="text-sm text-[var(--status-error)]">{error}</span>}
      </div>
    </div>
  );
}
