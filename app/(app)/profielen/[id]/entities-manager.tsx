"use client";

import { useMemo, useState } from "react";
import { InfoHint } from "@/components/info-hint";
import { ErrorNotice, problemFromResponse, networkProblem } from "@/components/error-notice";
import type { UserFacingError } from "@/lib/errors";
import type { Entity } from "@/lib/types/database";

/**
 * Concurrenten beheren (optimalisatie.md 2.7).
 *
 * Dit is niet alleen opruimwerk. Het is het moment waarop de klant merkt dat de
 * app zijn markt begrijpt — en tegelijk het moment waarop de data beter wordt,
 * want alleen BEVESTIGDE concurrenten tellen mee in het aandeel.
 *
 * Drie groepen, in de volgorde waarin ze aandacht verdienen:
 *   1. Nieuw gevonden — wachten op een oordeel. Bovenaan, want hier is iets te doen.
 *   2. Jouw concurrenten — de vaste noemer van het aandeel.
 *   3. Weggezet — dichtgeklapt, terug te halen.
 */
export function EntitiesManager({ profileId, initial }: { profileId: string; initial: Entity[] }) {
  const [entities, setEntities] = useState(initial);
  const [problem, setProblem] = useState<UserFacingError | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);

  // Sinds migratie 0026 bepaalt de ROL wie meetelt, niet het bevestigingsvinkje.
  // 'pending' is daarom niet meer "wacht op de klant" maar "de classificatie is
  // er nog niet aan toegekomen" — een tussenstand van seconden, geen werklijst.
  const { pending, competitors, others, dismissed } = useMemo(() => {
    const sorted = [...entities].sort((a, b) => a.canonical_name.localeCompare(b.canonical_name, "nl"));
    const live = sorted.filter((e) => !e.dismissed);
    return {
      pending: live.filter((e) => e.role_source === "onbepaald"),
      competitors: live.filter((e) => e.role_source !== "onbepaald" && e.entity_role === "concurrent"),
      others: live.filter((e) => e.role_source !== "onbepaald" && e.entity_role !== "concurrent"),
      dismissed: sorted.filter((e) => e.dismissed),
    };
  }, [entities]);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    setProblem(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/entities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setProblem(problemFromResponse(await res.json().catch(() => null)));
        return;
      }
      const data = (await res.json()) as Entity | { ok: true; mergedInto: string };

      if ("mergedInto" in data) {
        // De bronrij bestaat niet meer; hem lokaal weghalen is genoeg. De
        // aliassen van het doel zijn wel gewijzigd, maar die tonen we niet.
        setEntities((es) => es.filter((e) => e.id !== id));
      } else {
        setEntities((es) => es.map((e) => (e.id === id ? data : e)));
      }
    } catch (err) {
      setProblem(networkProblem(err));
    } finally {
      setBusy(null);
    }
  }

  async function add(name: string) {
    setProblem(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/entities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        setProblem(problemFromResponse(await res.json().catch(() => null)));
        return;
      }
      const created = (await res.json()) as Entity;
      setEntities((es) => [...es.filter((e) => e.id !== created.id), created]);
    } catch (err) {
      setProblem(networkProblem(err));
    }
  }

  const mergeTargets = competitors;

  return (
    <div id="concurrenten" className="card flex flex-col gap-4 scroll-mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono-label flex items-center gap-1">
          Concurrenten
          <InfoHint label="Concurrenten">
            Deze lijst komt uit de metingen: elk merk dat een AI-assistent in zijn antwoorden noemt,
            deelt Aura automatisch in. Alleen echte concurrenten tellen mee in je aandeel — een
            vergelijkingssite of brancheorganisatie zou dat cijfer vertekenen. Klopt een indeling
            niet? Pas hem hier aan; jouw keuze overschrijft Aura daarna nooit meer.
          </InfoHint>
        </span>
        <span className="mono-label">{competitors.length} concurrenten</span>
      </div>

      {problem && <ErrorNotice error={problem} />}

      {pending.length > 0 && (
        <section className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[rgba(165,120,240,0.4)] p-3">
          <p className="text-sm text-secondary">
            <span className="font-medium text-[var(--text-primary)]">
              {pending.length} nieuw gevonden {pending.length === 1 ? "merk" : "merken"}
            </span>{" "}
            in de laatste meting, nog niet ingedeeld. Aura doet dat bij de eerstvolgende ronde
            automatisch — jij hoeft niets.
          </p>
          <ul className="flex flex-col gap-2">
            {pending.map((e) => (
              <EntityRow
                key={e.id}
                entity={e}
                busy={busy === e.id}
                mergeTargets={mergeTargets}
                onPatch={patch}
              />
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <span className="text-sm font-medium">Jouw concurrenten</span>
        {competitors.length === 0 ? (
          <p className="text-sm text-muted">
            De metingen kwamen nog geen concurrent tegen. Zodra een AI-assistent een concurrent
            naast je noemt, staat hij hier automatisch. Je kunt er ook zelf een toevoegen.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {competitors.map((e) => (
              <EntityRow
                key={e.id}
                entity={e}
                busy={busy === e.id}
                mergeTargets={mergeTargets.filter((t) => t.id !== e.id)}
                onPatch={patch}
              />
            ))}
          </ul>
        )}
      </section>

      {others.length > 0 && (
        <section className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3">
          <span className="text-sm font-medium">Genoemd, maar geen concurrent</span>
          <p className="text-sm text-muted">
            Deze merken kwamen in de antwoorden voor maar tellen niet mee in je aandeel. Hoort er
            een tóch bij? Zet hem op concurrent.
          </p>
          <ul className="flex flex-col gap-2">
            {others.map((e) => (
              <EntityRow
                key={e.id}
                entity={e}
                busy={busy === e.id}
                mergeTargets={mergeTargets}
                onPatch={patch}
              />
            ))}
          </ul>
        </section>
      )}

      <AddEntityForm onAdd={add} />

      {dismissed.length > 0 && (
        <section className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3">
          <button
            type="button"
            onClick={() => setShowDismissed((s) => !s)}
            className="w-fit text-sm text-secondary hover:underline"
            aria-expanded={showDismissed}
          >
            {showDismissed ? "Verberg" : "Toon"} weggezette merken ({dismissed.length})
          </button>
          {showDismissed && (
            <ul className="flex flex-col gap-2">
              {dismissed.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-muted">{e.canonical_name}</span>
                  <button
                    type="button"
                    disabled={busy === e.id}
                    onClick={() => patch(e.id, { confirmed: true })}
                    className="shrink-0 text-sm hover:underline"
                  >
                    Toch een concurrent
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

/**
 * De rollen zoals de klant ze ziet. Zelfde waarden als de check-constraint op
 * entities.entity_role (migratie 0024) en ENTITY_ROLES in het schema.
 */
const ROLE_OPTIONS = [
  { value: "concurrent", label: "Concurrent" },
  { value: "vergelijker", label: "Vergelijkingssite" },
  { value: "brancheorganisatie", label: "Brancheorganisatie" },
  { value: "eigen_product", label: "Merk dat ik zelf voer" },
  { value: "eigen_merk", label: "Mijn eigen merk" },
  { value: "niet_relevant", label: "Geen concurrent" },
] as const;

function EntityRow({
  entity,
  busy,
  mergeTargets,
  onPatch,
}: {
  entity: Entity;
  busy: boolean;
  mergeTargets: Entity[];
  onPatch: (id: string, body: Record<string, unknown>) => void;
}) {
  const [merging, setMerging] = useState(false);

  return (
    <li className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 sm:flex-row sm:items-center">
      <input
        className="field flex-1"
        defaultValue={entity.canonical_name}
        disabled={busy}
        aria-label="Naam van de concurrent"
        onBlur={(e) => {
          const name = e.target.value.trim();
          if (name && name !== entity.canonical_name) onPatch(entity.id, { canonical_name: name });
        }}
      />

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {/* De rol is sinds migratie 0026 het enige wat bepaalt of dit merk
            meetelt. Kiezen zet role_source op 'handmatig', waarna de
            automatische classificatie deze rij voorgoed met rust laat. */}
        <select
          className="field"
          disabled={busy}
          value={entity.entity_role}
          aria-label={`Rol van ${entity.canonical_name}`}
          onChange={(e) => onPatch(entity.id, { entity_role: e.target.value })}
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {entity.role_source === "ai" && (
          <span className="text-xs text-muted" title="Automatisch ingedeeld op basis van de meting.">
            automatisch
          </span>
        )}

        {mergeTargets.length > 0 &&
          (merging ? (
            <select
              className="field"
              autoFocus
              disabled={busy}
              defaultValue=""
              aria-label="Samenvoegen met"
              onChange={(e) => {
                if (e.target.value) onPatch(entity.id, { mergeIntoId: e.target.value });
                setMerging(false);
              }}
              onBlur={() => setMerging(false)}
            >
              <option value="" disabled>
                Zelfde als…
              </option>
              {mergeTargets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.canonical_name}
                </option>
              ))}
            </select>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => setMerging(true)}
              className="text-sm text-secondary hover:underline"
              // Samenvoegen is niet terug te draaien met één klik; dat mag de
              // knop laten zien voordat er geklikt wordt.
              title="Voegt deze naam samen met een bestaande concurrent. Alle metingen verhuizen mee."
            >
              Zelfde als…
            </button>
          ))}

        {!entity.dismissed && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onPatch(entity.id, { dismissed: true })}
            className="text-sm text-secondary hover:underline"
            title="Blijft bewaard, zodat we hem niet elke meting opnieuw voorstellen."
          >
            Geen concurrent
          </button>
        )}
      </div>
    </li>
  );
}

function AddEntityForm({ onAdd }: { onAdd: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const value = name.trim();
        if (!value) return;
        onAdd(value);
        setName("");
      }}
      className="flex gap-2"
    >
      <input
        className="field flex-1"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Concurrent toevoegen…"
        aria-label="Concurrent toevoegen"
      />
      <button type="submit" className="btn-outline shrink-0">
        + Toevoegen
      </button>
    </form>
  );
}
