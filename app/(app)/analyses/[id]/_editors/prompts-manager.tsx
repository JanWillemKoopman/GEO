"use client";

import { useState } from "react";
import { CollapsibleSection } from "@/components/collapsible-section";
import { PROMPT_CATEGORIES } from "@/lib/types/database";
import type { Prompt } from "@/lib/types/database";
import {
  VOLUME_BANDS,
  VOLUME_BAND_LABEL,
  VOLUME_BAND_HELP,
  volumeBandOf,
  type VolumeBand,
} from "@/lib/pipeline/volume";

/** Wat de klant per prompt mag wijzigen. */
type PromptPatch = Partial<Pick<Prompt, "text" | "category" | "active" | "volume_band">>;

/**
 * Prompt-beheer, gegroepeerd per categorie (abcplan.md §3.5/§6 A2b). Mobiel:
 * elke categorie is een aparte, dichte accordion-sectie — "gegroepeerd en pas
 * op tik uitklapbaar per categorie" (abcplan.md §3.7, designsystem.md §D4).
 */
export function PromptsManager({ analysisId, initial }: { analysisId: string; initial: Prompt[] }) {
  const [prompts, setPrompts] = useState(initial);

  const knownOrder = [...PROMPT_CATEGORIES] as string[];
  const categories = Array.from(new Set(prompts.map((p) => p.category))).sort(
    (a, b) => (knownOrder.indexOf(a) + 1 || 99) - (knownOrder.indexOf(b) + 1 || 99),
  );
  // Toon ook categorieën die (nog) geen prompts hebben, zodat je er meteen aan kunt toevoegen.
  for (const cat of knownOrder) if (!categories.includes(cat)) categories.push(cat);

  async function updatePrompt(id: string, patch: PromptPatch) {
    // De server zet volume_source op 'klant' zodra de band handmatig wijzigt;
    // lokaal meteen meenemen zodat het label "door jou ingesteld" niet pas na
    // een herlaadbeurt verschijnt.
    const local = patch.volume_band ? { ...patch, volume_source: "klant" as const } : patch;
    setPrompts((ps) => ps.map((p) => (p.id === id ? { ...p, ...local } : p)));
    await fetch(`/api/analyses/${analysisId}/prompts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function deletePrompt(id: string) {
    setPrompts((ps) => ps.filter((p) => p.id !== id));
    await fetch(`/api/analyses/${analysisId}/prompts/${id}`, { method: "DELETE" });
  }

  async function addPrompt(category: string, text: string) {
    const res = await fetch(`/api/analyses/${analysisId}/prompts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, category }),
    });
    if (res.ok) {
      const created = (await res.json()) as Prompt;
      setPrompts((ps) => [...ps, created]);
    }
  }

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="mono-label">Vragen aan de AI</span>
        <span className="mono-label">{prompts.filter((p) => p.active).length} actief van {prompts.length}</span>
      </div>

      {categories.map((cat) => (
        <CollapsibleSection key={cat} title={cat} badge={String(prompts.filter((p) => p.category === cat).length)}>
          <PromptCategoryList
            prompts={prompts.filter((p) => p.category === cat)}
            onUpdate={updatePrompt}
            onDelete={deletePrompt}
          />
          <AddPromptForm category={cat} onAdd={(text) => addPrompt(cat, text)} />
        </CollapsibleSection>
      ))}
    </div>
  );
}

function PromptCategoryList({
  prompts,
  onUpdate,
  onDelete,
}: {
  prompts: Prompt[];
  onUpdate: (id: string, patch: PromptPatch) => void;
  onDelete: (id: string) => void;
}) {
  if (prompts.length === 0) {
    return <p className="text-sm text-muted">Nog geen vragen in deze categorie.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {prompts.map((p) => (
        <li
          key={p.id}
          className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 sm:flex-row sm:items-start"
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <textarea
              className="field"
              rows={2}
              defaultValue={p.text}
              style={{ opacity: p.active ? 1 : 0.5 }}
              onBlur={(e) => {
                const text = e.target.value.trim();
                if (text && text !== p.text) onUpdate(p.id, { text });
              }}
            />
            <PromptTags prompt={p} />
            <VolumeBandPicker
              prompt={p}
              onChange={(volume_band) => onUpdate(p.id, { volume_band })}
            />
          </div>
          <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
            <button
              type="button"
              onClick={() => onUpdate(p.id, { active: !p.active })}
              className="chip"
              style={
                p.active
                  ? undefined
                  : { background: "rgba(11,11,12,0.05)", color: "var(--text-muted)", borderColor: "var(--border-subtle)" }
              }
            >
              {p.active ? "Actief" : "Gepauzeerd"}
            </button>
            <button
              type="button"
              onClick={() => onDelete(p.id)}
              className="text-sm text-[var(--status-error)] hover:underline"
            >
              Verwijderen
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Read-only tag-chips per prompt (funnelfase is de groep; dit toont de fijnere tags). */
const INTENT_LABEL: Record<string, string> = {
  informational: "informatief",
  commercial: "vergelijkend",
  transactional: "koopklaar",
};

function PromptTags({ prompt }: { prompt: Prompt }) {
  const chips: string[] = [];
  if (prompt.intent_type) chips.push(INTENT_LABEL[prompt.intent_type] ?? prompt.intent_type);
  if (prompt.specificity) chips.push(prompt.specificity === "head" ? "head" : "long-tail");
  if (prompt.purchase_intent != null) chips.push(prompt.purchase_intent ? "koopintentie" : "geen koopintentie");
  if (prompt.cluster) chips.push(prompt.cluster);
  // Het geschatte volume stond hier als "volume ~68/100". Dat getal suggereerde
  // een precisie die er niet is; het staat nu als band in de keuzeknoppen
  // hieronder, waar de klant hem ook kan bijstellen (optimalisatie.md 2.6).
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c, i) => (
        <span key={i} className="chip" style={{ fontSize: "0.7rem" }}>
          {c}
        </span>
      ))}
    </div>
  );
}

/**
 * Hoe vaak wordt deze vraag gesteld? (optimalisatie.md 2.6)
 *
 * Drie knoppen in plaats van een getal. De AI zet een eerste inschatting neer,
 * de klant kan hem overrulen — hij weet welke vragen zijn omzet opleveren en het
 * model niet. Zodra hij dat doet, staat er zichtbaar bij dat het zíjn keuze is,
 * zodat het verschil tussen "de app denkt" en "ik weet" niet vervaagt.
 */
function VolumeBandPicker({ prompt, onChange }: { prompt: Prompt; onChange: (band: VolumeBand) => void }) {
  const current = volumeBandOf(prompt);
  // Drie herkomsten, en die moeten uit elkaar te houden zijn: de klant heeft hem
  // gezet, de AI heeft hem geschat, of er is nooit iets over gezegd (een
  // handmatig toegevoegde vraag) en we vallen terug op 'gemiddeld'.
  const origin =
    prompt.volume_source === "klant"
      ? "door jou ingesteld"
      : prompt.volume_band == null && prompt.volume_estimate == null
        ? "standaardwaarde"
        : "schatting van Aura";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mono-label" style={{ fontSize: "0.65rem" }}>
        Hoe vaak gesteld?
      </span>
      {VOLUME_BANDS.map((band) => {
        const selected = band === current;
        return (
          <button
            key={band}
            type="button"
            title={VOLUME_BAND_HELP[band]}
            aria-pressed={selected}
            onClick={() => !selected && onChange(band)}
            className="chip"
            style={{
              fontSize: "0.7rem",
              cursor: selected ? "default" : "pointer",
              ...(selected
                ? undefined
                : {
                    background: "transparent",
                    color: "var(--text-muted)",
                    borderColor: "var(--border-subtle)",
                  }),
            }}
          >
            {VOLUME_BAND_LABEL[band]}
          </button>
        );
      })}
      <span className="text-muted" style={{ fontSize: "0.65rem" }}>
        {origin}
      </span>
    </div>
  );
}

function AddPromptForm({ category, onAdd }: { category: string; onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const value = text.trim();
        if (!value) return;
        onAdd(value);
        setText("");
      }}
      className="flex gap-2"
    >
      <input
        className="field flex-1"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Nieuwe vraag in "${category}"…`}
      />
      <button type="submit" className="btn-outline shrink-0">
        + Toevoegen
      </button>
    </form>
  );
}
