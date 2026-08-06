"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CONTEXT_FACTOR_KINDS,
  CONTEXT_FACTOR_LABELS,
  CONTEXT_FACTOR_EFFECTS,
} from "@/lib/pipeline/context-factors";
import type { ContextFactor, ContextFactorKind } from "@/lib/types/database";

/**
 * Wat er uit het gesprek komt (blok C).
 *
 * Eén kaart, twee velden. De strategie in vrije tekst, en daaronder de dingen
 * die de pijplijn niet kan waarnemen. Die tweede gestructureerd, want elke
 * soort heeft een gevolg in code. Zie lib/pipeline/context-factors.ts.
 *
 * Bewust geen apart gespreksscherm: het gesprek gaat over hetzelfde profiel dat
 * hier al staat, en een tweede scherm met dezelfde velden is een tweede plek
 * waar iets kan verouderen.
 */
export function StrategyBox({
  profileId,
  initialNotes,
  initialFactors,
}: {
  profileId: string;
  initialNotes: string | null;
  initialFactors: ContextFactor[];
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [factors, setFactors] = useState<ContextFactor[]>(initialFactors);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function addFactor() {
    setFactors((f) => [
      ...f,
      { kind: "nieuwe_website", description: "", effective_from: null },
    ]);
  }

  function update(i: number, patch: Partial<ContextFactor>) {
    setFactors((f) =>
      f.map((item, idx) => (idx === i ? { ...item, ...patch } : item)),
    );
  }

  function remove(i: number) {
    setFactors((f) => f.filter((_, idx) => idx !== i));
  }

  async function save() {
    setPending(true);
    setError(null);
    setSaved(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/strategy`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strategyNotes: notes, contextFactors: factors }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Opslaan is niet gelukt.");
        setPending(false);
        return;
      }
      // Terugmelden wat er is doorgewerkt: een alias die stilzwijgend wordt
      // toegevoegd is precies het soort verandering waarvan je later niet meer
      // weet waar hij vandaan kwam.
      const doorgewerkt = [
        ...(json.addedAliases ?? []).map(
          (a: string) => `naam "${a}" telt nu mee in de meting`,
        ),
        ...(json.addedRegions ?? []).map(
          (r: string) => `werkgebied "${r}" toegevoegd`,
        ),
      ];
      setSaved(
        doorgewerkt.length > 0
          ? `Opgeslagen. ${doorgewerkt.join(", ")}.`
          : "Opgeslagen.",
      );
      setPending(false);
      router.refresh();
    } catch {
      setError("Opslaan is niet gelukt. Controleer je verbinding.");
      setPending(false);
    }
  }

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono-label">Uit het gesprek</span>
        {factors.length > 0 && (
          <span className="chip chip-neutral">
            {factors.length} contextfactor{factors.length === 1 ? "" : "en"}
          </span>
        )}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="mono-label">Strategie</span>
        <textarea
          className="field"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Wat wil de klant bereiken, en waarom? Aura neemt dit mee in de vragen die het bedenkt en in het rapport."
        />
      </label>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="mono-label">Wat Aura niet kan zien</span>
          <span className="text-sm text-secondary">
            Dingen die niet op de website staan, maar wel bepalen wat het advies
            waard is. Aan elk hangt een gevolg, geen notitie die niemand
            terugleest.
          </span>
        </div>

        {factors.map((f, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3"
          >
            <div className="flex flex-wrap gap-2">
              <select
                className="field flex-1"
                value={f.kind}
                onChange={(e) =>
                  update(i, { kind: e.target.value as ContextFactorKind })
                }
              >
                {CONTEXT_FACTOR_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {CONTEXT_FACTOR_LABELS[k]}
                  </option>
                ))}
              </select>
              <input
                type="date"
                className="field w-44"
                value={f.effective_from ?? ""}
                onChange={(e) =>
                  update(i, { effective_from: e.target.value || null })
                }
                aria-label="Vanaf wanneer (optioneel)"
              />
            </div>

            <input
              className="field"
              value={f.description}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder={
                f.kind === "naamswijziging" || f.kind === "rebranding"
                  ? "De andere naam, precies zoals hij geschreven wordt"
                  : f.kind === "nieuwe_regio"
                    ? "De plaats of regio"
                    : "Korte omschrijving"
              }
            />

            <div className="flex items-start justify-between gap-3">
              <span className="text-sm text-muted">
                {CONTEXT_FACTOR_EFFECTS[f.kind]}
              </span>
              <button
                type="button"
                className="btn-outline btn-sm"
                onClick={() => remove(i)}
              >
                Weg
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          className="btn-outline btn-sm w-fit"
          onClick={addFactor}
        >
          + Contextfactor
        </button>
      </div>

      {saved && (
        <p className="text-sm text-[var(--intent-growth-text)]" role="status">
          {saved}
        </p>
      )}
      {error && (
        <p className="text-sm text-[var(--status-error)]" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className="btn-primary w-fit disabled:opacity-60"
        disabled={pending}
        onClick={() => void save()}
      >
        {pending ? "Opslaan…" : "Bewaren"}
      </button>
    </div>
  );
}
