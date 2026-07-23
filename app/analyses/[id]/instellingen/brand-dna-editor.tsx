"use client";

import { useState } from "react";
import { CollapsibleSection } from "@/components/collapsible-section";
import { TagListEditor } from "@/components/tag-list-editor";
import type { BrandDna, Persona } from "@/lib/types/database";

/**
 * Bewerkbaar Brand DNA (abcplan.md §3.5/§3.6). Desktop: secties staan
 * standaard open (CollapsibleSection, designsystem.md §D4). Mobiel: dicht,
 * per groep uitklapbaar — voorkomt een muur van tekst op een klein scherm.
 */
export function BrandDnaEditor({ analysisId, initial }: { analysisId: string; initial: BrandDna }) {
  const [dna, setDna] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updatePersona(index: number, patch: Partial<Persona>) {
    setDna((d) => ({
      ...d,
      personas: d.personas.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/brand-dna`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: dna.industry,
          tone_of_voice: dna.tone_of_voice,
          summary: dna.summary,
          products: dna.products,
          value_props: dna.value_props,
          competitors: dna.competitors,
          personas: dna.personas,
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
      <span className="mono-label">Brand DNA</span>

      <CollapsibleSection title="Basis">
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Branche</span>
          <input
            className="field"
            value={dna.industry ?? ""}
            onChange={(e) => setDna((d) => ({ ...d, industry: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Tone of voice</span>
          <input
            className="field"
            value={dna.tone_of_voice ?? ""}
            onChange={(e) => setDna((d) => ({ ...d, tone_of_voice: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Samenvatting</span>
          <textarea
            className="field"
            rows={3}
            value={dna.summary ?? ""}
            onChange={(e) => setDna((d) => ({ ...d, summary: e.target.value }))}
          />
        </label>
      </CollapsibleSection>

      <CollapsibleSection title="Producten & waarde">
        <div className="flex flex-col gap-1.5">
          <span className="mono-label">Producten / diensten</span>
          <TagListEditor
            items={dna.products}
            onChange={(products) => setDna((d) => ({ ...d, products }))}
            placeholder="Nieuw product…"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="mono-label">Waardeproposities</span>
          <TagListEditor
            items={dna.value_props}
            onChange={(value_props) => setDna((d) => ({ ...d, value_props }))}
            placeholder="Nieuwe waardepropositie…"
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Concurrenten & persona's">
        <div className="flex flex-col gap-1.5">
          <span className="mono-label">Concurrenten</span>
          <TagListEditor
            items={dna.competitors}
            onChange={(competitors) => setDna((d) => ({ ...d, competitors }))}
            placeholder="Nieuwe concurrent…"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="mono-label">Persona&apos;s</span>
          {dna.personas.map((p, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
              <input
                className="field"
                value={p.name}
                onChange={(e) => updatePersona(i, { name: e.target.value })}
                placeholder="Naam persona"
              />
              <input
                className="field"
                value={p.needs.join(", ")}
                onChange={(e) =>
                  updatePersona(i, { needs: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
                }
                placeholder="Behoeftes, gescheiden door komma's"
              />
              <button
                type="button"
                onClick={() => setDna((d) => ({ ...d, personas: d.personas.filter((_, idx) => idx !== i) }))}
                className="w-fit text-sm text-[var(--status-error)] hover:underline"
              >
                Verwijderen
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setDna((d) => ({ ...d, personas: [...d.personas, { name: "", needs: [] }] }))}
            className="btn-outline w-fit"
          >
            + Persona toevoegen
          </button>
        </div>
      </CollapsibleSection>

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
