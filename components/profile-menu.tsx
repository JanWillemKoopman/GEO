"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NAV, ACCOUNT_NAV, type NavItem } from "@/lib/nav";

/**
 * Het menu achter het profiel-icoon, op élk schermformaat.
 *
 * Dit was eerder alleen een mobiel menu; op desktop stonden dezelfde links plus
 * het e-mailadres en een uitlog-knop uitgestald in de bovenbalk. Twee menu's
 * met dezelfde inhoud, en ze liepen dan ook uit elkaar. Nu is het er één, en
 * bevat de balk alleen nog waar je naartoe kunt.
 *
 * Erachter zit geen kleine dropdown maar een full-screen sheet (designsystem.md
 * C3). Dat is het patroon van InSpace zelf, en het maakt van accountzaken een
 * bewuste zijstap in plaats van een uitklapmenu dat je per ongeluk opent.
 *
 * Vormgeving bewust 1-op-1 afgestemd op InSpace's eigen "Pick your orbit"
 * mobiele menu (referentie-screenshot van de opdrachtgever, juli 2026):
 * genummerde rijen in het mono-font, paarse accentkleur, groot vetgedrukt
 * kopje met één gradient-woord, en een wit rond kruisje rechtsboven, allemaal
 * met de tokens uit designsystem.md §A/§B (geen nieuwe kleuren/fonts).
 */

/**
 * De links komen uit `lib/nav.ts`, dezelfde bron als de bovenbalk. Ze stonden
 * hier als losse constanten, en dat leverde precies op wat je verwacht: de twee
 * menu's liepen uit elkaar, met een "Mijn bedrijfsgegevens" onder Account dat
 * naar dezelfde route wees als "Klantprofielen" onder Navigatie.
 */
type MenuLink = NavItem;

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NumberedNav({
  label,
  links,
  pathname,
  onNavigate,
}: {
  label: string;
  links: MenuLink[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="mono-label" style={{ color: "var(--accent-purple)" }}>
        {label}
      </span>
      <nav className="flex flex-col">
        {links.map((link, i) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.label}
              href={link.href}
              onClick={onNavigate}
              className="group flex items-center justify-between gap-4 border-b py-4 transition-colors"
              style={{
                borderColor: "var(--border-subtle)",
                borderLeft: active ? "3px solid var(--accent-purple)" : "3px solid transparent",
                paddingLeft: active ? 13 : 16,
              }}
            >
              <span className="flex items-baseline gap-4">
                <span className="mono-label" style={{ color: "var(--accent-purple)", fontSize: "0.8rem" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="text-2xl font-bold tracking-tight transition-colors"
                  style={{ color: active ? "var(--accent-purple)" : "var(--text-primary)" }}
                >
                  {link.label}
                </span>
              </span>
              <span
                className="transition-colors group-hover:text-[var(--accent-purple)]"
                style={{ color: active ? "var(--accent-purple)" : "var(--text-muted)" }}
              >
                <ChevronIcon />
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function ProfileMenu({
  email,
  signOutAction,
}: {
  email: string;
  signOutAction: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);

    // Voorkomt dat de pagina eronder meescrollt terwijl het sheet open staat.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menu openen"
        aria-haspopup="dialog"
        className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:text-[var(--accent-purple)]"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
          <path d="M4 20c1.6-3.6 4.8-5.5 8-5.5s6.4 1.9 8 5.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[var(--bg-base)]"
          >
            {/* Ambient gloed-orbs (designsystem.md A3/B), dezelfde grote, sterk
                vervaagde accent-cirkels als InSpace achter hun menu/hero. */}
            <div
              className="glow-orb"
              style={{ width: 320, height: 320, top: -100, right: -120, background: "var(--accent-purple-glow)" }}
            />
            <div
              className="glow-orb"
              style={{ width: 280, height: 280, bottom: -80, left: -100, background: "color-mix(in srgb, var(--accent-green) 22%, transparent)" }}
            />

            <div className="relative z-10 flex h-16 items-center justify-between border-b border-[var(--border-subtle)] px-6">
              <span className="text-lg font-bold tracking-tight">
                <span className="brand-gradient-text">Aura</span>
              </span>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Menu sluiten"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-surface)] text-xl text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition-colors hover:text-[var(--accent-purple)]"
              >
                ×
              </button>
            </div>

            <div className="relative z-10 flex flex-1 flex-col gap-8 overflow-y-auto px-6 py-8">
              <div>
                <span className="mono-label" style={{ color: "var(--accent-purple)" }}>
                  Menu
                </span>
                <h2 className="mt-1 text-4xl font-bold tracking-tight">
                  Waar wil je <span className="brand-gradient-text">heen</span>?
                </h2>
              </div>

              <NumberedNav label="Navigatie" links={NAV} pathname={pathname} onNavigate={() => setOpen(false)} />
              <NumberedNav label="Account" links={ACCOUNT_NAV} pathname={pathname} onNavigate={() => setOpen(false)} />

              <div className="mt-auto flex flex-col gap-4">
                <span className="text-sm text-secondary">{email}</span>
                <form action={signOutAction}>
                  <button type="submit" className="btn-outline w-full">
                    Uitloggen
                  </button>
                </form>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
