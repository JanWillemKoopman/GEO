"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";

/**
 * Bewerkbare FAQ (content-editie, onderdeel 3): dezelfde vorm als
 * `TagListEditor` (`items`/`onChange`, geen eigen save-logica, de aanroeper
 * bepaalt wanneer er opgeslagen wordt), nu voor vraag-antwoordparen in plaats
 * van losse waarden.
 *
 * Herordenen met twee pijlknoppen, geen sleep-library: consistent met de keuze om
 * geen sleepbare kalender te bouwen (zie de content-editie-uitsluitingen), en
 * toetsenbord-/schermlezervriendelijker dan slepen.
 */
export interface FaqEditItem {
  q: string;
  a: string;
}

export function FaqEditor({
  items,
  onChange,
  maxItems = 12,
}: {
  items: FaqEditItem[];
  onChange: (items: FaqEditItem[]) => void;
  maxItems?: number;
}) {
  function update(index: number, patch: Partial<FaqEditItem>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function add() {
    if (items.length >= maxItems) return;
    onChange([...items, { q: "", a: "" }]);
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && (
        <p className="text-sm text-muted">Nog geen vragen. Voeg er hieronder een toe.</p>
      )}
      {items.map((item, i) => (
        <div
          key={i}
          className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="mono-label" style={{ fontSize: "0.65rem" }}>
              Vraag {i + 1}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Naar boven"
                className="text-secondary hover:text-[var(--text-primary)] disabled:opacity-30"
              >
                <Icon naam="omhoog" size={14} />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                aria-label="Naar beneden"
                className="text-secondary hover:text-[var(--text-primary)] disabled:opacity-30"
              >
                <Icon naam="omlaag" size={14} />
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Verwijder vraag ${i + 1}`}
                className="text-sm text-[var(--status-error)] hover:underline"
              >
                Verwijderen
              </button>
            </div>
          </div>
          <input
            className="field"
            value={item.q}
            onChange={(e) => update(i, { q: e.target.value })}
            placeholder="Vraag…"
            maxLength={200}
          />
          <textarea
            className="field"
            rows={2}
            value={item.a}
            onChange={(e) => update(i, { a: e.target.value })}
            placeholder="Antwoord…"
            maxLength={600}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        disabled={items.length >= maxItems}
        className="btn-outline w-fit disabled:opacity-50"
      >
        + Vraag toevoegen
      </button>
      {items.length >= maxItems && (
        <span className="text-sm text-muted">Maximaal {maxItems} vragen per pagina.</span>
      )}
    </div>
  );
}
