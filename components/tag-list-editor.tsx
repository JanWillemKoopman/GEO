"use client";

import { useState } from "react";

/** Bewerkbare lijst van losse waarden (bv. producten, concurrenten) als chips. */
export function TagListEditor({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value || items.includes(value)) {
      setDraft("");
      return;
    }
    onChange([...items, value]);
    setDraft("");
  }

  function remove(value: string) {
    onChange(items.filter((it) => it !== value));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="chip">
            {item}
            <button
              type="button"
              onClick={() => remove(item)}
              aria-label={`Verwijder ${item}`}
              className="ml-0.5 text-[var(--text-muted)] hover:text-[var(--status-error)]"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder ?? "Toevoegen…"}
          className="field flex-1"
        />
        <button type="button" onClick={add} className="btn-outline">
          Toevoegen
        </button>
      </div>
    </div>
  );
}
