"use client";

import { useState } from "react";

/**
 * Bewerkbare content-brief van de analyse (§6/§7/§8): de gewenste hoek/doelgroep
 * van de content. Bewerken ná de voorbereiding stuurt nog het rapport + de
 * content-generatie, maar niet de al gegenereerde meet-vragen (die zijn bij het
 * aanmaken opgesteld) — dat vermelden we in de UI.
 */
export function ContentBriefEditor({ analysisId, initial }: { analysisId: string; initial: string | null }) {
  const [brief, setBrief] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content_brief: brief }),
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
    <div className="card flex flex-col gap-3">
      <span className="mono-label">Content-richting</span>
      <p className="text-sm text-secondary">
        Stuur de hoek en doelgroep van de content. Dit werkt door in de aanbevelingen en het
        schrijven van de content. (De meet-vragen zijn al opgesteld bij het aanmaken.)
      </p>
      <textarea
        className="field"
        rows={4}
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="bijv. 'Richt de content op sollicitanten die zich voorbereiden op een gesprek…'"
      />
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
