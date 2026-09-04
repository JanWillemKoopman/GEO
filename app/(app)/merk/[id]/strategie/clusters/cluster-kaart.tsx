"use client";

import { useEffect, useRef, useState } from "react";
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

/**
 * Eén cluster in het overzicht, met zijn label en zijn weg naar de prullenbak.
 *
 * ── WAAROM DE HELE KAART GEEN LINK MEER IS ──────────────────────────────────
 *
 * Tot 1 september 2026 was het kaartje één grote `<Link>` naar het dossier. Dat
 * kan niet meer zodra er een keuzelijst en een knop op staan: een `<select>` in
 * een link is niet te bedienen met het toetsenbord, en een klik erop opent het
 * dossier in plaats van het menu. De kop is nu de link, de bediening staat in
 * het menu ernaast (zie hieronder).
 *
 * ── HET LABEL WIJZIGEN IS ÉÉN KEUZE, GEEN BEWERKSTAND ───────────────────────
 *
 * Geen potloodje en geen opslaan-knop: kiezen ís opslaan. Het label raakt geen
 * enkele meting, dus er valt niets te bevestigen. Alleen "nieuw label" vraagt
 * een tweede handeling, want daar moet nog een woord bij.
 *
 * ── HET LABEL EN DE PRULLENBAK ZITTEN ACHTER ÉÉN MENU (2 september 2026) ───
 *
 * Tot vandaag stonden een keuzelijst en een knop op een eigen regel onder elke
 * kaart, en dat maakte elke kaart een derde hoger dan hij zonder was: bij een
 * lijst van dertig clusters is dat een muur van keuzelijsten die niemand elke
 * dag gebruikt. Beide acties gaan nu achter het drie-puntjes-menu naast de
 * status, naar hetzelfde patroon als `components/profile-menu.tsx`: een klein
 * paneel dat sluit op een klik erbuiten of op Escape. Alleen het label dat al
 * gekozen is, blijft als chip in de kop staan, want dat is een cijfer over het
 * cluster en geen bediening.
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const label = labels.find((l) => l.id === analyse.label_id) ?? null;

  useEffect(() => {
    if (!menuOpen) return;
    function buiten(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function toets(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", buiten);
    document.addEventListener("keydown", toets);
    return () => {
      document.removeEventListener("mousedown", buiten);
      document.removeEventListener("keydown", toets);
    };
  }, [menuOpen]);

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
      setMenuOpen(false);
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
          {!gearchiveerd && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-label={`Meer acties voor ${analyse.name}`}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                disabled={opSlot}
                onClick={() => setMenuOpen((o) => !o)}
                className="rounded-[var(--radius-md)] p-1.5 text-muted transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] disabled:opacity-40"
              >
                <Icon naam="meer" size={16} />
              </button>

              {menuOpen && (
                <div
                  role="menu"
                  aria-label={`Acties voor ${analyse.name}`}
                  className="menu-surface absolute right-0 top-full z-30 mt-1 w-64 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] p-1 text-left"
                  style={{ boxShadow: "var(--shadow-overlay)" }}
                >
                  <div className="px-2 pb-1 pt-1.5">
                    <span className="mono-label text-muted">Label</span>
                  </div>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={!analyse.label_id}
                    disabled={opSlot}
                    onClick={() => void zetLabel(null)}
                    className="block w-full rounded-[var(--radius-md)] px-2 py-1.5 text-left text-sm transition-colors hover:bg-[var(--wash-hover)] disabled:opacity-40"
                  >
                    Geen label
                  </button>
                  {labels.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      role="menuitemradio"
                      aria-checked={l.id === analyse.label_id}
                      disabled={opSlot}
                      onClick={() => void zetLabel(l.id)}
                      className="block w-full rounded-[var(--radius-md)] px-2 py-1.5 text-left text-sm transition-colors hover:bg-[var(--wash-hover)] disabled:opacity-40"
                    >
                      {l.name}
                    </button>
                  ))}

                  {nieuwLabel === null ? (
                    <button
                      type="button"
                      disabled={opSlot}
                      onClick={() => setNieuwLabel("")}
                      className="block w-full rounded-[var(--radius-md)] px-2 py-1.5 text-left text-sm text-secondary transition-colors hover:bg-[var(--wash-hover)] disabled:opacity-40"
                    >
                      + Nieuw label maken
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2 px-2 py-1.5">
                      <input
                        type="text"
                        value={nieuwLabel}
                        onChange={(e) => setNieuwLabel(e.target.value)}
                        maxLength={MAX_LABELNAAM}
                        placeholder="bijv. Onderhoud"
                        className="field"
                        aria-label="Naam van het nieuwe label"
                        autoFocus
                      />
                      <div className="flex gap-2">
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
                      </div>
                    </div>
                  )}

                  <div className="mt-1 border-t border-[var(--border-subtle)] pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      disabled={opSlot}
                      onClick={() => {
                        setMenuOpen(false);
                        setVraagPrullenbak(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-left text-sm transition-colors hover:bg-[var(--wash-hover)] disabled:opacity-40"
                      style={{ color: "var(--intent-danger-text)" }}
                    >
                      <Icon naam="prullenbak" size={14} />
                      Naar de prullenbak
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {metrics && <AnalysisCardMetrics metrics={metrics} />}

      {gearchiveerd && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-3">
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
        </div>
      )}

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
