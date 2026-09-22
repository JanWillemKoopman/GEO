"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { AnalysisCardMetrics } from "@/components/analysis-card-metrics";
import { LastUpdated } from "@/components/last-updated";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Icon } from "@/components/icon";
import { useRefresh } from "@/components/use-refresh";
import { MAX_LABELNAAM, normaliseerLabelnaam } from "@/lib/cluster-labels";
import { getClusterDisplayName } from "@/lib/url";
import { STATUS_META } from "@/lib/analysis-status";
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
 * ── DE KOP LINKT NIET MEER NAAR EEN CLUSTERPAGINA (22 september 2026) ──────
 *
 * Er wás een clusterpagina: `/analyses/[id]`, met de uitslag van de meting. Die
 * herhaalde de cijfers van Analytics, de vragen van Openstaande vragen en de
 * pagina's van het Contentplan, en is daarom weggehaald
 * (`docs/tasks/clusterresultaat-zonder-eigen-scherm.md`). De kop gaat nu naar
 * de plek die bij de stand van het cluster hoort: naar het concept als jij aan
 * zet bent, naar Analytics zodra er gemeten is, en nergens heen zolang er nog
 * niets te zien valt. Een link naar een leeg scherm is erger dan geen link.
 *
 * ── TWEE MENU'S NAAST DE STATUS (22 september 2026) ─────────────────────────
 *
 * Eerst stonden een keuzelijst en een knop op een eigen regel onder elke
 * kaart, en dat maakte elke kaart een derde hoger dan hij zonder was: bij een
 * lijst van dertig clusters is dat een muur van keuzelijsten die niemand elke
 * dag gebruikt. Ze verhuisden daarna allebei achter één drie-puntjes-menu, maar
 * "Cluster instellingen" (de link naar `/analyses/[id]/instellingen`) hoort
 * niet bij het label kiezen: het label-icoon opent nu alleen de labellijst, het
 * drie-puntjes-menu ernaast instellingen, AI zichtbaarheid en de prullenbak.
 * Beide volgen hetzelfde patroon als `components/profile-menu.tsx`: een klein
 * paneel dat sluit op een klik erbuiten of op Escape. Alleen het label dat al
 * gekozen is, blijft als chip in de kop staan, want dat is een cijfer over het
 * cluster en geen bediening.
 *
 * ── GEREED LINKT NIET MEER, EEN OPENSTAANDE ACTIE IS DE HELE KAART ──────────
 *
 * Een gereed cluster heeft niets meer te doen: de kop is dan platte tekst, en
 * de weg naar Analytics loopt voortaan alleen via "AI zichtbaarheid" in het
 * drie-puntjes-menu. Andersom, bij een cluster dat nog op iets van de klant
 * wacht (`STATUS_META[status].actionRequired`, nu alleen "Klaar voor jouw
 * akkoord"), is de hele kaart de link naar die actie en niet alleen de kop:
 * één ding te doen mag overal op de kaart aangeklikt worden. De kop wordt dan
 * platte tekst (geen link-in-een-link) en de labelknop en het
 * drie-puntjes-menu stoppen hun klik- en toetsgebeurtenissen (`stopPropagation`)
 * voordat die de kaart zelf bereiken, anders opent een klik op "label" ook
 * meteen het concept.
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
  const router = useRouter();
  const { refresh, refreshing } = useRefresh();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [vraagPrullenbak, setVraagPrullenbak] = useState(false);
  const [nieuwLabel, setNieuwLabel] = useState<string | null>(null);
  const [labelMenuOpen, setLabelMenuOpen] = useState(false);
  const [meerMenuOpen, setMeerMenuOpen] = useState(false);
  const labelMenuRef = useRef<HTMLDivElement>(null);
  const meerMenuRef = useRef<HTMLDivElement>(null);

  const label = labels.find((l) => l.id === analyse.label_id) ?? null;

  useEffect(() => {
    if (!labelMenuOpen && !meerMenuOpen) return;
    function buiten(e: MouseEvent) {
      if (labelMenuRef.current && !labelMenuRef.current.contains(e.target as Node)) setLabelMenuOpen(false);
      if (meerMenuRef.current && !meerMenuRef.current.contains(e.target as Node)) setMeerMenuOpen(false);
    }
    function toets(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLabelMenuOpen(false);
        setMeerMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", buiten);
    document.addEventListener("keydown", toets);
    return () => {
      document.removeEventListener("mousedown", buiten);
      document.removeEventListener("keydown", toets);
    };
  }, [labelMenuOpen, meerMenuOpen]);

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
      setLabelMenuOpen(false);
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

  /**
   * Opnieuw proberen na een vastgelopen cluster.
   *
   * De server bepaalt zelf welke fase aan de beurt is
   * (`/api/analyses/[id]/hervatten`): dit kaartje kan onmogelijk weten of het
   * onderzoek of de meting struikelde, en het hoort dat ook niet te weten.
   */
  async function hervat() {
    setFout(null);
    setBezig(true);
    try {
      const res = await fetch(`/api/analyses/${analyse.id}/hervatten`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setFout(json.error ?? "Opnieuw starten is niet gelukt.");
        return;
      }
      refresh();
    } catch {
      setFout("We konden ORBIT ENGINE niet bereiken. Probeer het opnieuw.");
    } finally {
      setBezig(false);
    }
  }

  const opSlot = bezig || refreshing;

  /**
   * Waar de kop heen gaat, per stand van het cluster.
   *
   * `null` = geen link. Dat is het eerlijke antwoord zolang het onderzoek of de
   * meting loopt: er is dan nog niets om naar te kijken, en ook een gereed
   * cluster krijgt hier geen link meer: dat scherm is af, en Analytics is nu
   * alleen nog te vinden via "AI zichtbaarheid" in het drie-puntjes-menu.
   */
  const kopLink =
    analyse.status === "concept_klaar"
      ? `/analyses/${analyse.id}/concept`
      : analyse.status === "gemeten"
        ? `/merk/${analyse.profile_id}/analytics?cluster=${analyse.id}`
        : null;

  const analyticsLink = `/merk/${analyse.profile_id}/analytics?cluster=${analyse.id}`;

  // Staat er nog iets open (nu alleen "Klaar voor jouw akkoord"), dan is de
  // hele kaart de link naar die actie, niet alleen de kop.
  const heleKaartIsLink = !gearchiveerd && kopLink !== null && STATUS_META[analyse.status].actionRequired;

  function naarActie() {
    if (opSlot) return;
    router.push(kopLink!);
  }

  return (
    <div
      className={`card flex flex-col gap-3${heleKaartIsLink ? " card-link" : ""}`}
      role={heleKaartIsLink ? "link" : undefined}
      tabIndex={heleKaartIsLink ? 0 : undefined}
      onClick={heleKaartIsLink ? naarActie : undefined}
      onKeyDown={
        heleKaartIsLink
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                naarActie();
              }
            }
          : undefined
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          {kopLink && !gearchiveerd && !heleKaartIsLink ? (
            <Link href={kopLink} className="truncate text-lg font-medium hover:underline">
              {getClusterDisplayName(analyse.name)}
            </Link>
          ) : (
            <span className="block truncate text-lg font-medium">{getClusterDisplayName(analyse.name)}</span>
          )}
          <LastUpdated at={analyse.updated_at} className="mono-label mt-1 block" />
        </div>
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {label && (
            <span className="chip chip-neutral">
              <Icon naam="label" size={12} />
              {label.name}
            </span>
          )}
          <StatusBadge status={analyse.status} />
          {!gearchiveerd && (
            <div className="relative" ref={labelMenuRef}>
              <button
                type="button"
                aria-label={`Label voor ${getClusterDisplayName(analyse.name)}`}
                aria-haspopup="menu"
                aria-expanded={labelMenuOpen}
                disabled={opSlot}
                onClick={() => setLabelMenuOpen((o) => !o)}
                className="rounded-[var(--radius-xl)] p-1.5 text-muted transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] disabled:opacity-40"
              >
                <Icon naam="label" size={16} />
              </button>

              {labelMenuOpen && (
                <div
                  role="menu"
                  aria-label={`Label voor ${getClusterDisplayName(analyse.name)}`}
                  className="menu-surface absolute right-0 top-full z-30 mt-1 w-64 overflow-hidden rounded-[var(--radius-xxxl)] border border-[var(--border-subtle)] p-1 text-left"
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
                    className="block w-full rounded-[var(--radius-xl)] px-2 py-1.5 text-left text-sm transition-colors hover:bg-[var(--wash-hover)] disabled:opacity-40"
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
                      className="block w-full rounded-[var(--radius-xl)] px-2 py-1.5 text-left text-sm transition-colors hover:bg-[var(--wash-hover)] disabled:opacity-40"
                    >
                      {l.name}
                    </button>
                  ))}

                  {nieuwLabel === null ? (
                    <button
                      type="button"
                      disabled={opSlot}
                      onClick={() => setNieuwLabel("")}
                      className="block w-full rounded-[var(--radius-xl)] px-2 py-1.5 text-left text-sm text-secondary transition-colors hover:bg-[var(--wash-hover)] disabled:opacity-40"
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
                </div>
              )}
            </div>
          )}
          {!gearchiveerd && (
            <div className="relative" ref={meerMenuRef}>
              <button
                type="button"
                aria-label={`Meer acties voor ${getClusterDisplayName(analyse.name)}`}
                aria-haspopup="menu"
                aria-expanded={meerMenuOpen}
                disabled={opSlot}
                onClick={() => setMeerMenuOpen((o) => !o)}
                className="rounded-[var(--radius-xl)] p-1.5 text-muted transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)] disabled:opacity-40"
              >
                <Icon naam="meer" size={16} />
              </button>

              {meerMenuOpen && (
                <div
                  role="menu"
                  aria-label={`Acties voor ${getClusterDisplayName(analyse.name)}`}
                  className="menu-surface absolute right-0 top-full z-30 mt-1 w-64 overflow-hidden rounded-[var(--radius-xxxl)] border border-[var(--border-subtle)] p-1 text-left"
                  style={{ boxShadow: "var(--shadow-overlay)" }}
                >
                  <Link
                    href={`/analyses/${analyse.id}/instellingen`}
                    role="menuitem"
                    onClick={() => setMeerMenuOpen(false)}
                    className="flex w-full items-center gap-2 rounded-[var(--radius-xl)] px-2 py-1.5 text-left text-sm transition-colors hover:bg-[var(--wash-hover)]"
                  >
                    <Icon naam="instellingen" size={14} />
                    Cluster instellingen
                  </Link>
                  <Link
                    href={analyticsLink}
                    role="menuitem"
                    onClick={() => setMeerMenuOpen(false)}
                    className="flex w-full items-center gap-2 rounded-[var(--radius-xl)] px-2 py-1.5 text-left text-sm transition-colors hover:bg-[var(--wash-hover)]"
                  >
                    <Icon naam="analytics" size={14} />
                    AI zichtbaarheid
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={opSlot}
                    onClick={() => {
                      setMeerMenuOpen(false);
                      setVraagPrullenbak(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-[var(--radius-xl)] px-2 py-1.5 text-left text-sm transition-colors hover:bg-[var(--wash-hover)] disabled:opacity-40"
                    style={{ color: "var(--intent-danger-text)" }}
                  >
                    <Icon naam="prullenbak" size={14} />
                    Naar de prullenbak
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {metrics && <AnalysisCardMetrics metrics={metrics} />}

      {/* ── Wat er nu gebeurt, in gewone taal ───────────────────────────────
          Sinds 22 september 2026 is dit kaartje de enige plek waar je een
          lopend cluster ziet staan: het wachtscherm is weg, want het werk loopt
          op de server door en er viel niets te doen behalve kijken. Dus staat
          hier wat er gebeurt en dat je er niet bij hoeft te blijven. */}
      {!gearchiveerd && (analyse.status === "meten" || analyse.status === "bezig") && (
        <p className="text-sm text-secondary">
          {analyse.status === "meten"
            ? "ORBIT ENGINE stelt nu de vragen aan AI-assistenten. Je kunt gerust wegklikken: je krijgt een melding zodra de uitslag er is."
            : "ORBIT ENGINE onderzoekt het onderwerp en stelt de vragen op. Je hoort het zodra er iets voor je klaarstaat."}
        </p>
      )}

      {/* Een vastgelopen cluster kon alleen nog verder vanaf zijn eigen pagina.
          Die is er niet meer, dus staat de knop hier. */}
      {!gearchiveerd && analyse.status === "mislukt" && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-3">
          <button type="button" className="btn-outline btn-sm" disabled={opSlot} onClick={() => void hervat()}>
            <Icon naam="herstel" size={14} />
            {opSlot ? "Bezig…" : "Probeer het opnieuw"}
          </button>
          <span className="text-sm text-muted">
            Wat al gemeten is blijft bewaard, dus je begint niet van voren af aan.
          </span>
        </div>
      )}

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
      <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <ConfirmDialog
          open={vraagPrullenbak}
          title="Dit cluster naar de prullenbak?"
          body={
            `"${getClusterDisplayName(analyse.name)}" verdwijnt uit je overzicht en uit de maandelijkse meetronde, dus er ` +
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
    </div>
  );
}
