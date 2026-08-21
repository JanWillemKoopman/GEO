"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import type { BrandOption } from "@/lib/workspace";

/**
 * De merkkiezer, bovenin de werkruimte.
 *
 * ── WAAROM DOORZOEKBAAR ─────────────────────────────────────────────────────
 *
 * Nova heeft `searchClientsPlaceholder` en `noClientsMatch` en dat is niet voor
 * niets: bij twintig klanten (besluit 11) is een uitklaplijst zonder zoekveld
 * een scrollbaan. Het zoekveld verschijnt pas vanaf acht merken; daaronder is
 * hij ruis.
 *
 * ── WAAROM HIJ SOMS HELEMAAL NIET VERSCHIJNT ────────────────────────────────
 *
 * Bij precies één merk is er niets te kiezen. Dan staat de naam er als tekst en
 * niet als knop. Een kiezer met één optie belooft een keuze die er niet is, en
 * dat is exact het soort holle navigatie dat `lib/nav.ts` eerder al opruimde.
 */
export function BrandSwitcher({
  brands,
  active,
  onSelect,
}: {
  brands: BrandOption[];
  active: BrandOption | null;
  /** Server action. Krijgt het merk-id, of een lege string voor "alle merken". */
  onSelect: (brandId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [zoek, setZoek] = useState("");
  const wrap = useRef<HTMLDivElement>(null);
  const zoekveld = useRef<HTMLInputElement>(null);

  const zoekbaar = brands.length >= 8;

  const zichtbaar = useMemo(() => {
    const q = zoek.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter(
      (b) => b.name.toLowerCase().includes(q) || b.url.toLowerCase().includes(q),
    );
  }, [brands, zoek]);

  // Buiten klikken en Escape sluiten het menu. Allebei nodig: een menu dat
  // alleen met Escape sluit is met een muis niet weg te krijgen, en andersom.
  useEffect(() => {
    if (!open) return;
    function omlaag(e: MouseEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    }
    function toets(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", omlaag);
    document.addEventListener("keydown", toets);
    return () => {
      document.removeEventListener("mousedown", omlaag);
      document.removeEventListener("keydown", toets);
    };
  }, [open]);

  useEffect(() => {
    if (open && zoekbaar) zoekveld.current?.focus();
    if (!open) setZoek("");
  }, [open, zoekbaar]);

  if (brands.length === 0) return null;

  // Eén merk: geen keuze, dus geen knop.
  if (brands.length === 1) {
    return (
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-semibold">{brands[0].name}</span>
      </span>
    );
  }

  const label = active ? active.name : "Alle merken";

  return (
    <div ref={wrap} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-9 min-w-0 max-w-[14rem] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 text-sm font-medium transition-colors hover:border-[var(--border-contrast)]"
      >
        <span className="truncate">{label}</span>
        <span className="text-muted">
          <Icon naam="openen" size={14} />
        </span>
      </button>

      {open && (
        <div
          className="absolute left-0 z-40 mt-1 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
          style={{ boxShadow: "var(--shadow-overlay)" }}
          role="listbox"
        >
          {zoekbaar && (
            <div className="border-b border-[var(--border-subtle)] p-2">
              <input
                ref={zoekveld}
                className="field h-9"
                value={zoek}
                onChange={(e) => setZoek(e.target.value)}
                placeholder="Zoek een merk…"
                aria-label="Zoek een merk"
              />
            </div>
          )}

          <div className="max-h-72 overflow-y-auto p-1">
            {zichtbaar.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted">
                Geen merk gevonden voor &ldquo;{zoek}&rdquo;.
              </p>
            ) : (
              zichtbaar.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="option"
                  aria-selected={active?.id === b.id}
                  onClick={() => {
                    setOpen(false);
                    onSelect(b.id);
                  }}
                  className="flex w-full flex-col items-start gap-0.5 rounded-[var(--radius-md)] px-3 py-2 text-left transition-colors hover:bg-[var(--bg-elevated)]"
                  style={{
                    background:
                      active?.id === b.id ? "var(--bg-elevated)" : "transparent",
                  }}
                >
                  <span className="flex w-full items-center gap-2">
                    <span className="truncate text-sm font-medium">{b.name}</span>
                    {b.busy && (
                      <span className="chip chip-green shrink-0">bezig</span>
                    )}
                  </span>
                  <span className="mono-label break-url">{b.url}</span>
                </button>
              ))
            )}
          </div>

          {/* "Alle merken" is een bestemming en geen merk, dus visueel gescheiden. */}
          <div className="border-t border-[var(--border-subtle)] p-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSelect("");
              }}
              className="w-full rounded-[var(--radius-md)] px-3 py-2 text-left text-sm text-secondary transition-colors hover:bg-[var(--bg-elevated)]"
            >
              Alle merken bekijken
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
