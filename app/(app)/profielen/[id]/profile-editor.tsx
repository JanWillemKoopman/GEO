"use client";

import { useState } from "react";
import { CollapsibleSection } from "@/components/collapsible-section";
import { TagListEditor } from "@/components/tag-list-editor";
import type { Persona, Profile } from "@/lib/types/database";

/**
 * Bewerkbaar klantprofiel — zelfde CRUD-mechaniek als de vroegere
 * BrandDnaEditor, nu op profielniveau (eenmalig per merk i.p.v. per analyse).
 */
export function ProfileEditor({ initial, inventoryCount }: { initial: Profile; inventoryCount: number }) {
  const [profile, setProfile] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [count, setCount] = useState(inventoryCount);
  const [refreshState, setRefreshState] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [refreshError, setRefreshError] = useState<string | null>(null);

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
          intake_description: profile.intake_description,
          intake_audience: profile.intake_audience,
          aliases: profile.aliases,
          service_scope: profile.service_scope,
          service_regions: profile.service_regions,
          market_language: profile.market_language,
          sitemap_url: profile.sitemap_url,
          max_inventory_pages: profile.max_inventory_pages,
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

  // Slaat eerst de (mogelijk gewijzigde) crawl-instellingen op en crawlt daarna
  // de content-inventaris opnieuw met die instellingen.
  async function refreshInventory() {
    setRefreshState("pending");
    setRefreshError(null);
    try {
      await save();
      const res = await fetch(`/api/profiles/${profile.id}/refresh-inventory`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRefreshState("error");
        setRefreshError(json.detail ?? json.error ?? null);
        return;
      }
      setCount(json.count ?? 0);
      setRefreshState("done");
    } catch (err) {
      setRefreshState("error");
      setRefreshError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div id="profiel" className="card flex scroll-mt-4 flex-col gap-4">
      <span className="mono-label">Merkprofiel</span>

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
        <div className="flex flex-col gap-1.5">
          <span className="mono-label">Andere namen / schrijfwijzen (aliassen)</span>
          <TagListEditor
            items={profile.aliases}
            onChange={(aliases) => setProfile((p) => ({ ...p, aliases }))}
            placeholder="Nieuwe schrijfwijze…"
          />
          <span className="text-sm text-muted">Meegewogen in de meting: het merk wordt zo breder herkend.</span>
        </div>
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
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Omschrijving (jouw eigen input)</span>
          <textarea
            className="field"
            rows={3}
            value={profile.intake_description ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, intake_description: e.target.value }))}
            placeholder="Wat doen jullie, en wat maakt jullie uniek?"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Doelgroep (jouw eigen input)</span>
          <textarea
            className="field"
            rows={2}
            value={profile.intake_audience ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, intake_audience: e.target.value }))}
            placeholder="Wie zijn jullie klanten?"
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

      <CollapsibleSection title="Werkgebied & markt">
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Bereik</span>
          <select
            className="field"
            value={profile.service_scope ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, service_scope: e.target.value || null }))}
          >
            <option value="">— Onbekend —</option>
            <option value="lokaal">Lokaal</option>
            <option value="landelijk">Landelijk</option>
            <option value="internationaal">Internationaal</option>
          </select>
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="mono-label">Plaatsen / regio&apos;s</span>
          <TagListEditor
            items={profile.service_regions}
            onChange={(service_regions) => setProfile((p) => ({ ...p, service_regions }))}
            placeholder="Nieuwe plaats/regio…"
          />
          <span className="text-sm text-muted">Gebruikt voor lokale zoekvragen in de meting.</span>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Markt &amp; taal</span>
          <input
            className="field"
            value={profile.market_language ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, market_language: e.target.value }))}
            placeholder="bijv. Nederland + België"
          />
        </label>
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

      <CollapsibleSection title="Content-inventaris (crawl)">
        <p className="text-sm text-secondary">
          We brengen in kaart welke pagina&apos;s er al op de website staan, zodat aanbevelingen
          bestaande content kunnen verbeteren i.p.v. altijd iets nieuws voor te stellen.
          Productpagina&apos;s van webshops worden overgeslagen. Dit staat nu op{" "}
          <span className="font-medium">{count} pagina&apos;s</span>.
        </p>

        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Sitemap-URL (optioneel)</span>
          <input
            className="field"
            value={profile.sitemap_url ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, sitemap_url: e.target.value }))}
            placeholder="https://voorbeeld.nl/sitemap.xml"
          />
          <span className="text-sm text-muted">
            Weet je de sitemap-locatie? Vul die hier in — dan gebruikt de crawler die met zekerheid.
            Laat leeg om automatisch te zoeken (robots.txt + standaardlocaties).
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Maximaal aantal pagina&apos;s</span>
          <input
            type="number"
            min={5}
            max={150}
            className="field w-32"
            value={profile.max_inventory_pages}
            onChange={(e) =>
              setProfile((p) => ({ ...p, max_inventory_pages: Number(e.target.value) || 0 }))
            }
          />
          <span className="text-sm text-muted">Tussen 5 en 150. Meer pagina&apos;s = grondiger, maar trager.</span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void refreshInventory()}
            disabled={refreshState === "pending"}
            className="btn-outline disabled:opacity-60"
          >
            {refreshState === "pending" ? "Bezig met crawlen…" : "Vernieuw inventaris"}
          </button>
          {refreshState === "done" && (
            <span className="text-sm text-[var(--accent-green-text)]">Bijgewerkt — {count} pagina&apos;s ✓</span>
          )}
          {refreshState === "error" && (
            <span className="text-sm text-[var(--status-error)]">
              Vernieuwen mislukt{refreshError ? `: ${refreshError}` : "."}
            </span>
          )}
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
