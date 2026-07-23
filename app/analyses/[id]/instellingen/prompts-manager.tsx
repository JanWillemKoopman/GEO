"use client";

import { useState } from "react";
import { CollapsibleSection } from "@/components/collapsible-section";
import { PROMPT_CATEGORIES } from "@/lib/types/database";
import type { Prompt } from "@/lib/types/database";

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

  async function updatePrompt(id: string, patch: Partial<Pick<Prompt, "text" | "category" | "active">>) {
    setPrompts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
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
        <span className="mono-label">Prompts</span>
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
  onUpdate: (id: string, patch: Partial<Pick<Prompt, "text" | "category" | "active">>) => void;
  onDelete: (id: string) => void;
}) {
  if (prompts.length === 0) {
    return <p className="text-sm text-muted">Nog geen prompts in deze categorie.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {prompts.map((p) => (
        <li
          key={p.id}
          className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 sm:flex-row sm:items-start"
        >
          <textarea
            className="field flex-1"
            rows={2}
            defaultValue={p.text}
            style={{ opacity: p.active ? 1 : 0.5 }}
            onBlur={(e) => {
              const text = e.target.value.trim();
              if (text && text !== p.text) onUpdate(p.id, { text });
            }}
          />
          <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
            <button
              type="button"
              onClick={() => onUpdate(p.id, { active: !p.active })}
              className="chip"
              style={
                p.active
                  ? undefined
                  : { background: "rgba(255,255,255,0.06)", color: "var(--text-muted)", borderColor: "var(--border-subtle)" }
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
        placeholder={`Nieuwe prompt in "${category}"…`}
      />
      <button type="submit" className="btn-outline shrink-0">
        + Toevoegen
      </button>
    </form>
  );
}
