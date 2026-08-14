"use client";

import { useState } from "react";
import { CollapsibleSection } from "@/components/collapsible-section";
import { TagListEditor } from "@/components/tag-list-editor";
import { DossierBox } from "./dossier-box";
import { FORMALITY, ENERGY, COMPLEXITY, HUMOR } from "@/lib/pipeline/tone-sliders";
import type { Persona, Profile } from "@/lib/types/database";

/**
 * Eén schuif: drie knoppen, geen getal. Nogmaals klikken op de actieve knop
 * zet hem terug op "onbekend", zodat "niets ingesteld" altijd bereikbaar
 * blijft zonder een aparte resetknop (C.28, migratie 0045).
 */
function ToneSliderRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: 1 | 2 | 3 | null;
  options: Record<1 | 2 | 3, string>;
  onChange: (value: 1 | 2 | 3 | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="mono-label">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {([1, 2, 3] as const).map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : n)}
              className="chip"
              style={{
                fontSize: "0.8rem",
                cursor: "pointer",
                ...(selected
                  ? undefined
                  : { background: "transparent", color: "var(--text-muted)", borderColor: "var(--border-subtle)" }),
              }}
            >
              {options[n]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Bewerkbaar klantprofiel, zelfde CRUD-mechaniek als de vroegere
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
          business_model: profile.business_model,
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
          taboo_phrases: profile.taboo_phrases,
          compliance_notes: profile.compliance_notes,
          author_name: profile.author_name,
          author_role: profile.author_role,
          author_bio: profile.author_bio,
          author_linkedin_url: profile.author_linkedin_url,
          tone_formality: profile.tone_formality,
          tone_energy: profile.tone_energy,
          tone_complexity: profile.tone_complexity,
          tone_humor: profile.tone_humor,
        }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
    } catch {
      setError("Opslaan is niet gelukt. Probeer het opnieuw.");
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
    } catch {
      // A.5: geen rauwe JS-foutmelding ("Failed to fetch") op het scherm, dat
      // zegt niets over wat de klant eraan kan doen.
      setRefreshState("error");
      setRefreshError("We konden Aura niet bereiken. Controleer je verbinding en probeer het opnieuw.");
    }
  }

  return (
    <div id="profiel" className="card flex scroll-mt-4 flex-col gap-4">
      <span className="mono-label">Merkprofiel</span>

      <div className="flex justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
        <span className="text-secondary">Website</span>
        <span className="break-url font-medium">{profile.url}</span>
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
          <span className="mono-label">Andere namen en schrijfwijzen</span>
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
        {/* Het bedrijfsmodel (R8.5) stuurt welke vragen de klant bij het schrijven
            krijgt: een platform of keten heeft geen enkel adres of telefoonnummer,
            en die vraag verplicht stellen levert een antwoord op dat niet kan
            kloppen. De klant weet dit beter dan het model, dus hij kan het
            corrigeren. */}
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Bedrijfsmodel</span>
          <select
            className="field"
            value={profile.business_model ?? ""}
            onChange={(e) =>
              setProfile((p) => ({
                ...p,
                business_model: (e.target.value || null) as typeof p.business_model,
              }))
            }
          >
            <option value="">Nog niet bepaald</option>
            <option value="dienstverlener">Dienstverlener: eigen mensen leveren de dienst</option>
            <option value="retailer">Retailer: verkoopt producten van andere merken</option>
            <option value="platform">Platform: brengt vraag en aanbod van derden samen</option>
            <option value="fabrikant">Fabrikant: maakt en verkoopt eigen producten</option>
            <option value="overig">Overig</option>
          </select>
          <span className="text-sm text-muted">
            Bepaalt welke vragen we je stellen voordat we een pagina schrijven.
          </span>
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
            <option value="">Onbekend</option>
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
            placeholder="Nieuwe plaats of regio…"
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
            Clusters vullen dit per onderwerp aan met eigen, specifieke concurrenten.
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

      <CollapsibleSection title="Wat er al op je site staat">
        <p className="text-sm text-secondary">
          Aura brengt in kaart welke pagina&apos;s je website al heeft, zodat een aanbeveling
          bestaande content kan verbeteren in plaats van altijd iets nieuws voor te stellen.
          Productpagina&apos;s van webshops blijven buiten beschouwing. Nu op{" "}
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
            Weet je waar je sitemap staat? Vul het adres in, dan gebruikt Aura die met zekerheid.
            Laat leeg en Aura zoekt hem zelf (robots.txt + de standaardlocaties).
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
            {refreshState === "pending" ? "Aura leest je site…" : "Vernieuw inventaris"}
          </button>
          {refreshState === "done" && (
            <span className="text-sm text-[var(--intent-growth-text)]">Bijgewerkt: {count} pagina&apos;s ✓</span>
          )}
          {refreshState === "error" && (
            <span className="text-sm text-[var(--status-error)]">
              Vernieuwen is niet gelukt{refreshError ? `: ${refreshError}` : "."}
            </span>
          )}
        </div>
      </CollapsibleSection>

      {/* Schrijfregels (migratie 0045, C.28/C.29). De vier schuiven en de
          verboden-woordenlijst zijn de "intentie"; de garantie zit in code
          (describeToneSliders → de schrijfprompt, checkTabooWords → de
          deterministische poort in lib/pipeline/content-gate.ts). */}
      <CollapsibleSection title="Schrijfregels">
        <p className="text-sm text-secondary">
          Stuurt hoe Aura schrijft. Los van &quot;Tone of voice&quot; hierboven: dat is jouw eigen
          omschrijving, dit zijn vier knoppen die het model letterlijk krijgt voorgelegd.
        </p>
        <ToneSliderRow
          label="Formaliteit"
          value={profile.tone_formality}
          options={FORMALITY}
          onChange={(tone_formality) => setProfile((p) => ({ ...p, tone_formality }))}
        />
        <ToneSliderRow
          label="Energie"
          value={profile.tone_energy}
          options={ENERGY}
          onChange={(tone_energy) => setProfile((p) => ({ ...p, tone_energy }))}
        />
        <ToneSliderRow
          label="Complexiteit"
          value={profile.tone_complexity}
          options={COMPLEXITY}
          onChange={(tone_complexity) => setProfile((p) => ({ ...p, tone_complexity }))}
        />
        <ToneSliderRow
          label="Humor"
          value={profile.tone_humor}
          options={HUMOR}
          onChange={(tone_humor) => setProfile((p) => ({ ...p, tone_humor }))}
        />

        <div className="flex flex-col gap-1.5">
          <span className="mono-label">Verboden woorden en claims</span>
          <TagListEditor
            items={profile.taboo_phrases}
            onChange={(taboo_phrases) => setProfile((p) => ({ ...p, taboo_phrases }))}
            placeholder="Nieuw verboden woord of claim…"
          />
          <span className="text-sm text-muted">
            Elke tekst die Aura schrijft wordt hierop gecontroleerd, vóór publicatie. Staat een woord
            er toch in, dan gaat de pagina eerst terug de kwaliteitscontrole in.
          </span>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Regels waar elke pagina aan moet voldoen</span>
          <textarea
            className="field"
            rows={3}
            value={profile.compliance_notes ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, compliance_notes: e.target.value }))}
            placeholder="Bijvoorbeeld: noem nooit een concreet rendement, vermeld altijd dat advies vrijblijvend is."
          />
          <span className="text-sm text-muted">
            Voor branches met eigen regels (AFM, KOA, medisch). Aura neemt dit letterlijk mee in de
            schrijfopdracht.
          </span>
        </label>
      </CollapsibleSection>

      {/* Auteur (migratie 0045, H.66-achtig maar hoort inhoudelijk hier: het
          bepaalt "wie schreef dit", niet vormgeving). Optioneel: E-E-A-T-
          signaal voor content die als menselijk geschreven wil overkomen. */}
      <CollapsibleSection title="Auteur">
        <p className="text-sm text-secondary">
          Optioneel. Vul dit in als je content onder een naam wilt publiceren in plaats van anoniem.
        </p>
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Naam</span>
          <input
            className="field"
            value={profile.author_name ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, author_name: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Functie</span>
          <input
            className="field"
            value={profile.author_role ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, author_role: e.target.value }))}
            placeholder="bijv. Oprichter, Financieel adviseur"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Korte bio</span>
          <textarea
            className="field"
            rows={2}
            value={profile.author_bio ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, author_bio: e.target.value }))}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">LinkedIn-profiel</span>
          <input
            className="field"
            value={profile.author_linkedin_url ?? ""}
            onChange={(e) => setProfile((p) => ({ ...p, author_linkedin_url: e.target.value }))}
            placeholder="https://linkedin.com/in/…"
          />
        </label>
      </CollapsibleSection>

      {/* Het merkdossier (S5). Onderaan en ingeklapt: dit is de rijkste bron die
          we hebben, maar hij mag het invullen van het profiel niet in de weg
          zitten. Dat is de stap waar de klant hier voor kwam. */}
      <CollapsibleSection title="Wat je al hebt liggen">
        <DossierBox profileId={profile.id} />
      </CollapsibleSection>

      <div className="flex items-center gap-3">
        <button onClick={() => void save()} disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? "Opslaan…" : "Wijzigingen opslaan"}
        </button>
        {saved && <span className="text-sm text-[var(--intent-growth-text)]">Opgeslagen ✓</span>}
        {error && <span className="text-sm text-[var(--status-error)]">{error}</span>}
      </div>
    </div>
  );
}
