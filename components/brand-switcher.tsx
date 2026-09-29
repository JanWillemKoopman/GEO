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
 * Bij precies één merk is er niets te kiezen. Dan is er niets te zien, ook geen
 * naam als tekst (sinds 29 september 2026). Een kiezer met één optie belooft een
 * keuze die er niet is, en dat is exact het soort holle navigatie dat
 * `lib/nav.ts` eerder al opruimde.
 *
 * Hij staat bovenin de zijbalk, onder het woordmerk, over de volle breedte.
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

  // Eén merk: niets te kiezen, dus ook niets te tonen (29 september 2026). Tot
  // dan stond de naam hier als platte tekst; de eigenaar wil dat een klant met
  // één profiel geen kiezer ziet.
  if (brands.length === 1) return null;

  const label = active ? active.name : "Alle merken";

  return (
    <div ref={wrap} className="relative w-full min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="field flex h-10 w-full min-w-0 items-center gap-2 text-left font-medium"
      >
        <Icon naam="bedrijven" size={16} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span className="text-[var(--text-subtle)]">
          <Icon naam="openen" size={14} />
        </span>
      </button>

      {open && (
        <div
          className="menu-surface absolute left-0 z-40 mt-1 w-full min-w-64 overflow-hidden py-0"
          role="listbox"
        >
          {zoekbaar && (
            <div className="menu-sectie border-b border-[var(--line-muted)]">
              <input
                ref={zoekveld}
                className="field"
                value={zoek}
                onChange={(e) => setZoek(e.target.value)}
                placeholder="Zoek een merk…"
                aria-label="Zoek een merk"
              />
            </div>
          )}

          <div className="max-h-72 overflow-y-auto py-1">
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
                  className="menu-item menu-item-dubbel"
                >
                  <span className="flex w-full items-center gap-2">
                    <span className="truncate font-medium text-[var(--text-primary)]">{b.name}</span>
                    {b.busy && (
                      <span className="chip chip-info shrink-0">bezig</span>
                    )}
                  </span>
                  <span className="mono-label break-url">{b.url}</span>
                </button>
              ))
            )}
          </div>

          {/* "Alle merken" is een bestemming en geen merk, dus visueel gescheiden. */}
          <div className="border-t border-[var(--line-muted)] py-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSelect("");
              }}
              className="menu-item"
            >
              Alle merken bekijken
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
