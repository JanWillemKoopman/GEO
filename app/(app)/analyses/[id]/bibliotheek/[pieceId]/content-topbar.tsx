"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";

/**
 * De PAGINABALK van de contentpagina (`docs/tasks/herontwerp-contentpagina.md`
 * §4).
 *
 * ── WAAROM DIT EEN BALK IS EN GEEN KAART ────────────────────────────────────
 *
 * Publiceren is de enige handeling op dit scherm die het cijfer van de klant
 * beweegt: een geschreven pagina die niet online staat, levert per definitie
 * nul op. Tot 27 augustus 2026 stond dat blok acht kaarten laag; daarna
 * bovenaan. Het bleef alleen wel meescrollen, en dit scherm is lang. Nu blijft
 * het in beeld, met dezelfde twee bevestigingsstappen eronder.
 *
 * ── ⚠️ DE `top` KOMT UIT `--header-h` EN IS NOOIT EEN EIGEN 48 ──────────────
 *
 * `app/globals.css` waarschuwt bij `--header-h` zelf dat een tweede getal een
 * kier oplevert waar de pagina-inhoud doorheen schuift. Hetzelfde patroon als
 * de hoofdstuktabs van een cluster. `ConfirmBar` is hier NIET het voorbeeld:
 * die plakt onderaan (`fixed bottom-0`) en lost een ander probleem op.
 *
 * ── WAT DE STATUSCHIP MOET KUNNEN ───────────────────────────────────────────
 *
 * Zes standen, en de vierde en vijfde zijn de reden dat dit component bestaat.
 * Een canvas dat altijd bewerkbaar is, moet kunnen zeggen dat ORBIT ENGINE
 * ondertussen zélf een nieuwe versie schrijft (die een nieuwe rij met een nieuw
 * adres oplevert), en dat je naar een versie kijkt die al vervangen is.
 */
export type PaginaStand =
  | "concept"
  | "niet-opgeslagen"
  | "opgeslagen"
  | "schrijft"
  | "oudere-versie"
  | "live";

export function ContentTopbar({
  terug,
  titel,
  stand,
  liveSinds,
  onNaarOpslaan,
  menu,
  publiceren,
  compact = false,
}: {
  /**
   * Onder de kop van het paginascherm (23 september 2026). Dan staan terug,
   * naam, stand en de hoofdknop al in `PaginaKop` en de kaart "Aan zet", en
   * blijft hier alleen over wat bij het BEWERKEN hoort: of er iets niet
   * opgeslagen is, en het menu. Twee statuschips en twee hoofdknoppen op één
   * scherm was precies de tegenspraak die de eigenaar aanwees.
   */
  compact?: boolean;
  terug: { href: string; label: string };
  titel: string;
  stand: PaginaStand;
  /** Alleen bij `live`: sinds wanneer. */
  liveSinds?: string | null;
  /** Naar de opslagknop in het canvas springen. */
  onNaarOpslaan: () => void;
  /** De inhoud van het `⋯`-menu: kopiëren, downloaden, de handleiding. */
  menu: React.ReactNode;
  /** Het URL-veld en de publicatieknop. */
  publiceren: React.ReactNode;
}) {
  if (compact) {
    const bewerkStand = stand === "niet-opgeslagen" || stand === "opgeslagen" || stand === "schrijft" || stand === "oudere-versie";
    return (
      <div className="flex items-center justify-end gap-2">
        {bewerkStand && <StatusChip stand={stand} liveSinds={liveSinds} onNaarOpslaan={onNaarOpslaan} />}
        <Menu>{menu}</Menu>
      </div>
    );
  }

  return (
    <div className="content-balk">
      <Link
        href={terug.href}
        className="mono-label flex shrink-0 items-center gap-1.5 transition-colors hover:text-[var(--text-primary)]"
        title={terug.label}
      >
        <Icon naam="terug" size={14} />
        <span className="hidden sm:inline">{terug.label}</span>
      </Link>

      <span className="content-balk-titel type-body-emphasis" title={titel}>
        {titel}
      </span>

      <StatusChip stand={stand} liveSinds={liveSinds} onNaarOpslaan={onNaarOpslaan} />

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Menu>{menu}</Menu>
        {publiceren}
      </div>
    </div>
  );
}

export function StatusChip({
  stand,
  liveSinds,
  onNaarOpslaan,
}: {
  stand: PaginaStand;
  liveSinds?: string | null;
  onNaarOpslaan: () => void;
}) {
  // Status is kleur plus vorm, nooit kleur alleen (designsystem.md regel 4).
  // Vandaar bij elke stand een icoon of een punt, en niet alleen een tint.
  if (stand === "niet-opgeslagen") {
    return (
      <button
        type="button"
        onClick={onNaarOpslaan}
        className="chip chip-attention shrink-0"
        title="Naar de opslagknop"
      >
        Niet opgeslagen
      </button>
    );
  }

  if (stand === "opgeslagen") {
    return (
      <span className="chip chip-success flex shrink-0 items-center gap-1">
        <Icon naam="klaar" size={12} />
        Opgeslagen
      </span>
    );
  }

  if (stand === "schrijft") {
    return (
      <span className="chip chip-info flex shrink-0 items-center gap-1.5">
        <span className="live-dot" />
        ORBIT ENGINE schrijft
      </span>
    );
  }

  if (stand === "oudere-versie") {
    return (
      <span className="chip chip-warning flex shrink-0 items-center gap-1">
        <Icon naam="letop" size={12} />
        Oudere versie
      </span>
    );
  }

  if (stand === "live") {
    return (
      <span className="chip chip-success flex shrink-0 items-center gap-1">
        <Icon naam="klaar" size={12} />
        Live{liveSinds ? ` sinds ${liveSinds}` : ""}
      </span>
    );
  }

  return <span className="chip chip-neutral shrink-0">Concept</span>;
}

/**
 * Het `⋯`-menu.
 *
 * ── WAAROM GEEN PAKKET ──────────────────────────────────────────────────────
 *
 * Een uitklapmenu met een klik buiten het menu en Escape erin is hier een stuk
 * of dertig regels. Een pakket erbij zou een tweede vormtaal naast het eigen
 * ontwerpsysteem zetten (`designsystem.md` §9), en dat is een hogere prijs dan
 * deze dertig regels.
 */
export function Menu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const wikkel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function buiten(e: MouseEvent) {
      if (!wikkel.current?.contains(e.target as Node)) setOpen(false);
    }
    function toets(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", buiten);
    document.addEventListener("keydown", toets);
    return () => {
      document.removeEventListener("mousedown", buiten);
      document.removeEventListener("keydown", toets);
    };
  }, [open]);

  return (
    <div className="relative" ref={wikkel}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Meer opties"
        className="btn-outline btn-sm"
      >
        <Icon naam="meer" size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-[min(22rem,calc(100vw-2rem))] rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 shadow-[var(--shadow-overlay)]"
        >
          {children}
        </div>
      )}
    </div>
  );
}
