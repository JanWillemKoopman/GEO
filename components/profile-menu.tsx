"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ACCOUNT_NAV, type NavItem } from "@/lib/nav";
import { Icon } from "@/components/icon";

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
 * ⚠️ **Hier staat sinds 17 augustus 2026 alleen nog Account.**
 *
 * Dit sheet toonde ook de hoofdnavigatie, uit de platte lijst `NAV`. Die lijst
 * is met de herindeling verdwenen: de navigatie zit in de zijbalk, en op mobiel
 * in de lade van `WorkspaceChrome`. Twee menu's met dezelfde bestemmingen lopen
 * gegarandeerd uit elkaar, en dat was hier al eerder gebeurd.
 *
 * De links komen uit `lib/nav.ts`, dezelfde bron als de zijbalk.
 */
type MenuLink = NavItem;

/**
 * ⚠️ Hier stonden twee met de hand getekende SVG's, één chevron en één poppetje,
 * elk met hun eigen lijndikte (1,8 en 1,6). Sinds 21 augustus 2026 komen ze uit
 * `lib/icons.ts`, zodat ze meebewegen als de set ooit van gewicht verandert.
 */
function ChevronIcon() {
  return <Icon naam="verder" size={18} />;
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
      <span className="mono-label" style={{ color: "var(--intent-intelligence-text)" }}>
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
                borderLeft: active ? "var(--border-width-sm) solid var(--intent-intelligence-solid)" : "var(--border-width-sm) solid transparent",
                paddingLeft: active ? 13 : 16,
              }}
            >
              <span className="flex items-baseline gap-4">
                <span className="mono-label" style={{ color: "var(--intent-intelligence-text)", fontSize: "0.8rem" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="type-section transition-colors"
                  style={{ color: active ? "var(--intent-intelligence-text)" : "var(--text-primary)" }}
                >
                  {link.label}
                </span>
              </span>
              <span
                className="transition-colors group-hover:text-[var(--intent-intelligence-text)]"
                style={{ color: active ? "var(--intent-intelligence-text)" : "var(--text-muted)" }}
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
        className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
      >
        <Icon naam="profiel" size={20} />
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
            <div className="relative z-10 flex h-16 items-center justify-between border-b border-[var(--border-subtle)] px-6">
              <span className="text-lg font-bold tracking-tight">
                <span className="brand-gradient-text">ORBIT ENGINE</span>
              </span>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Menu sluiten"
                className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xl text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-muted)]"
              >
                ×
              </button>
            </div>

            <div className="relative z-10 flex flex-1 flex-col gap-8 overflow-y-auto px-6 py-8">
              <div>
                <span className="mono-label">Menu</span>
                <h2 className="type-title mt-1">Waar wil je heen?</h2>
              </div>

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
