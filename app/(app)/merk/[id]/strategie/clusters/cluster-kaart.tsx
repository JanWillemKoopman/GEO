"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { AnalysisCardMetrics } from "@/components/analysis-card-metrics";
import { LastUpdated } from "@/components/last-updated";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Icon } from "@/components/icon";
import { useRefresh } from "@/components/use-refresh";
import { MAX_LABELNAAM, normaliseerLabelnaam } from "@/lib/cluster-labels";
import type { AnalysisCardMetrics as Metrics } from "@/lib/dashboard";
import type { Analysis, ClusterLabel } from "@/lib/types/database";

/** De waarde van de keuzelijst die zegt: ik typ er zelf een nieuwe. */
const NIEUW_LABEL = "__nieuw__";

/**
 * Eén cluster in het overzicht, met zijn label en zijn weg naar de prullenbak.
 *
 * ── WAAROM DE HELE KAART GEEN LINK MEER IS ──────────────────────────────────
 *
 * Tot 1 september 2026 was het kaartje één grote `<Link>` naar het dossier. Dat
 * kan niet meer zodra er een keuzelijst en een knop op staan: een `<select>` in
 * een link is niet te bedienen met het toetsenbord, en een klik erop opent het
 * dossier in plaats van het menu. De kop is nu de link, de bediening staat
 * eronder op een eigen regel.
 *
 * ── HET LABEL WIJZIGEN IS ÉÉN KEUZE, GEEN BEWERKSTAND ───────────────────────
 *
 * Geen potloodje en geen opslaan-knop: kiezen ís opslaan. Het label raakt geen
 * enkele meting, dus er valt niets te bevestigen. Alleen "nieuw label" vraagt
 * een tweede handeling, want daar moet nog een woord bij.
 */
export function ClusterKaart({
  analyse,
  metrics,
  labels,
  gearchiveerd = false,
}: {
  analyse: Analysis;
  /** Ontbreekt in de prullenbak: daar zijn de kaartcijfers niet geladen. */
  metrics?: Metrics;
  labels: ClusterLabel[];
  gearchiveerd?: boolean;
}) {
  const { refresh, refreshing } = useRefresh();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [vraagPrullenbak, setVraagPrullenbak] = useState(false);
  const [nieuwLabel, setNieuwLabel] = useState<string | null>(null);

  const label = labels.find((l) => l.id === analyse.label_id) ?? null;

  async function zetLabel(labelId: string | null) {
    setFout(null);
    setBezig(true);
    try {
      const res = await fetch(`/api/analyses/${analyse.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label_id: labelId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFout(json.error ?? "Het label opslaan is niet gelukt.");
        return;
      }
      setNieuwLabel(null);
      refresh();
    } catch {
      setFout("We konden ORBIT ENGINE niet bereiken. Probeer het opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  /** Eerst het label aanmaken, dan er het cluster aan hangen. */
  async function maakLabelEnKoppel() {
    const naam = normaliseerLabelnaam(nieuwLabel);
    if (!naam) {
      setFout("Vul een labelnaam in.");
      return;
    }
    setFout(null);
    setBezig(true);
    try {
      const res = await fetch(`/api/profiles/${analyse.profile_id}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: naam }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFout(json.error ?? "Het label aanmaken is niet gelukt.");
        setBezig(false);
        return;
      }
      setBezig(false);
      await zetLabel(json.label.id as string);
    } catch {
      setFout("We konden ORBIT ENGINE niet bereiken. Probeer het opnieuw.");
      setBezig(false);
    }
  }

  async function zetArchief(archived: boolean) {
    setFout(null);
    setBezig(true);
    try {
      const res = await fetch(`/api/analyses/${analyse.id}/archief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFout(json.error ?? "Dat is niet gelukt.");
        return;
      }
      setVraagPrullenbak(false);
      refresh();
    } catch {
      setFout("We konden ORBIT ENGINE niet bereiken. Probeer het opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  const opSlot = bezig || refreshing;

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/analyses/${analyse.id}`} className="truncate text-lg font-semibold hover:underline">
            {analyse.name}
          </Link>
          <LastUpdated at={analyse.updated_at} className="mono-label mt-1 block" />
        </div>
        <div className="flex items-center gap-2">
          {label && (
            <span className="chip chip-neutral">
              <Icon naam="label" size={12} />
              {label.name}
            </span>
          )}
          <StatusBadge status={analyse.status} />
        </div>
      </div>

      {metrics && <AnalysisCardMetrics metrics={metrics} />}

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-3">
        {gearchiveerd ? (
          <>
            <button
              type="button"
              className="btn-outline btn-sm"
              disabled={opSlot}
              onClick={() => zetArchief(false)}
            >
              <Icon naam="herstel" size={14} />
              {opSlot ? "Bezig…" : "Terugzetten"}
            </button>
            <span className="text-sm text-muted">
              Zolang dit cluster hier staat, wordt er niet meer gemeten.
            </span>
          </>
        ) : (
          <>
            <label className="flex items-center gap-2">
              <span className="mono-label">Label</span>
              <select
                value={nieuwLabel !== null ? NIEUW_LABEL : (analyse.label_id ?? "")}
                disabled={opSlot}
                className="field w-auto"
                aria-label={`Label van ${analyse.name}`}
                onChange={(e) => {
                  const waarde = e.target.value;
                  if (waarde === NIEUW_LABEL) {
                    setNieuwLabel("");
                    return;
                  }
                  setNieuwLabel(null);
                  void zetLabel(waarde || null);
                }}
              >
                <option value="">Geen label</option>
                {labels.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
                <option value={NIEUW_LABEL}>+ Nieuw label maken</option>
              </select>
            </label>

            {nieuwLabel !== null && (
              <span className="flex items-center gap-2">
                <input
                  type="text"
                  value={nieuwLabel}
                  onChange={(e) => setNieuwLabel(e.target.value)}
                  maxLength={MAX_LABELNAAM}
                  placeholder="bijv. Onderhoud"
                  className="field w-auto"
                  aria-label="Naam van het nieuwe label"
                  autoFocus
                />
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  disabled={opSlot}
                  onClick={maakLabelEnKoppel}
                >
                  {opSlot ? "Bezig…" : "Opslaan"}
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  disabled={opSlot}
                  onClick={() => setNieuwLabel(null)}
                >
                  Annuleren
                </button>
              </span>
            )}

            <button
              type="button"
              className="btn-ghost btn-sm ml-auto"
              disabled={opSlot}
              onClick={() => setVraagPrullenbak(true)}
            >
              <Icon naam="prullenbak" size={14} />
              Naar de prullenbak
            </button>
          </>
        )}
      </div>

      {fout && (
        <p className="text-sm text-[var(--status-error)]" role="alert">
          {fout}
        </p>
      )}

      {/* De gevolgen staan er letterlijk in: wat er stopt, en wat er blijft.
          Zonder die tweede zin leest "naar de prullenbak" als "weg", en dan
          durft niemand hem te gebruiken.

          ⚠️ Bewust ZONDER het `irreversible`-blok van `ConfirmDialog`: dit is
          juist wel terug te draaien, en dat blok in een rood kader zetten zou
          het tegenovergestelde beweren van wat de tekst zegt. */}
      <ConfirmDialog
        open={vraagPrullenbak}
        title="Dit cluster naar de prullenbak?"
        body={
          `"${analyse.name}" verdwijnt uit je overzicht en uit de maandelijkse meetronde, dus er ` +
          "wordt vanaf nu niets meer gemeten voor dit cluster. Alle metingen, rapporten en " +
          "geschreven pagina's blijven bewaard: je kunt het cluster later terugzetten, en dan gaat " +
          "het meten weer verder."
        }
        confirmLabel="Naar de prullenbak"
        confirmingLabel="Bezig…"
        busy={opSlot}
        danger
        onConfirm={() => zetArchief(true)}
        onCancel={() => setVraagPrullenbak(false)}
      />
    </div>
  );
}
