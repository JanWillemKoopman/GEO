"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";

/**
 * Bewerkbare content-brief van de analyse (§6/§7/§8): de gewenste hoek en doelgroep
 * van de content. Bewerken ná de voorbereiding stuurt nog het rapport + de
 * content-generatie, maar niet de al gegenereerde meet-vragen (die zijn bij het
 * aanmaken opgesteld). Dat vermelden we in de UI.
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
      setError("Opslaan is niet gelukt. Probeer het opnieuw.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card flex flex-col gap-3">
      <h3 className="type-body-emphasis">Richting van de pagina&apos;s</h3>
      <p className="text-sm text-secondary">
        Stuur de hoek en doelgroep van de pagina&apos;s. Dit werkt door in de aanbevelingen en in wat ORBIT ENGINE schrijft. (De AI-vragen staan al klaar sinds het aanmaken.)
      </p>
      <textarea
        className="field"
        rows={4}
        value={brief}
        onChange={(e) => setBrief(e.target.value)}
        placeholder="bijv. 'Richt de pagina's op sollicitanten die zich voorbereiden op een gesprek…'"
      />
      <div className="flex items-center gap-3">
        <button aria-busy={saving} onClick={() => void save()} disabled={saving} className="btn-primary">
          Wijzigingen opslaan
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-[var(--trend-up-text)]">
            <Icon naam="klaar" size={14} />
            Opgeslagen
          </span>
        )}
        {error && <span className="text-sm text-[var(--intent-danger-content)]">{error}</span>}
      </div>
    </div>
  );
}
