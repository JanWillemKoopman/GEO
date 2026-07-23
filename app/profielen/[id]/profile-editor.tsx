"use client";

import { useState } from "react";
import { CollapsibleSection } from "@/components/collapsible-section";
import { TagListEditor } from "@/components/tag-list-editor";
import type { Persona, Profile } from "@/lib/types/database";

/**
 * Bewerkbaar klantprofiel — zelfde CRUD-mechaniek als de vroegere
 * BrandDnaEditor, nu op profielniveau (eenmalig per merk i.p.v. per analyse).
 */
export function ProfileEditor({ initial }: { initial: Profile }) {
  const [profile, setProfile] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updatePersona(index: number, patch: Partial<Persona>) {
    setProfile((p) => ({
      ...p,
      personas: p.personas.map((persona, i) => (i === index ? { ...persona, ...patch } : persona)),
    }));
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/profiles/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          industry: profile.industry,
          tone_of_voice: profile.tone_of_voice,
          summary: profile.summary,
          products: profile.products,
          value_props: profile.value_props,
          competitors: profile.competitors,
          personas: profile.personas,
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
      <span className="mono-label">Klantprofiel</span>

      <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
        <span className="text-secondary">Website</span>
        <span className="font-medium">{profile.url}</span>
      </div>
      {profile.brand_name && (
        <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
          <span className="text-secondary">Merknaam</span>
          <span className="font-medium">{profile.brand_name}</span>
        </div>
      )}

      <CollapsibleSection title="Basis">
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Naam (label voor dit profiel)</span>
          <input
            className="field"
            value={profile.name}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Branche</span>
          <input
            className="field"
            value={profile.industry ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, industry: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Tone of voice</span>
          <input
            className="field"
            value={profile.tone_of_voice ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, tone_of_voice: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Samenvatting</span>
          <textarea
            className="field"
            rows={3}
            value={profile.summary ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, summary: e.target.value }))}
          />
        </label>
      </CollapsibleSection>

      <CollapsibleSection title="Producten & waarde">
        <div className="flex flex-col gap-1.5">
          <span className="mono-label">Producten / diensten</span>
          <TagListEditor
            items={profile.products}
            onChange={(products) => setProfile((p) => ({ ...p, products }))}
            placeholder="Nieuw product…"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="mono-label">Waardeproposities</span>
          <TagListEditor
            items={profile.value_props}
            onChange={(value_props) => setProfile((p) => ({ ...p, value_props }))}
            placeholder="Nieuwe waardepropositie…"
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Concurrenten & persona's">
        <div className="flex flex-col gap-1.5">
          <span className="mono-label">Concurrenten (bedrijfsbreed)</span>
          <TagListEditor
            items={profile.competitors}
            onChange={(competitors) => setProfile((p) => ({ ...p, competitors }))}
            placeholder="Nieuwe concurrent…"
          />
          <span className="text-sm text-muted">
            Analyses vullen dit per onderwerp aan met eigen, specifieke concurrenten.
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <span className="mono-label">Persona&apos;s</span>
          {profile.personas.map((persona, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
              <input
                className="field"
                value={persona.name}
                onChange={(e) => updatePersona(i, { name: e.target.value })}
                placeholder="Naam persona"
              />
              <input
                className="field"
                value={persona.needs.join(", ")}
                onChange={(e) =>
                  updatePersona(i, { needs: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
                }
                placeholder="Behoeftes, gescheiden door komma's"
              />
              <button
                type="button"
                onClick={() => setProfile((p) => ({ ...p, personas: p.personas.filter((_, idx) => idx !== i) }))}
                className="w-fit text-sm text-[var(--status-error)] hover:underline"
              >
                Verwijderen
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setProfile((p) => ({ ...p, personas: [...p.personas, { name: "", needs: [] }] }))}
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
