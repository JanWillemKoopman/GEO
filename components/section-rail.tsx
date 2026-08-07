"use client";

import { useEffect, useState } from "react";

/**
 * De hoofdstuk-rail van het dossier.
 *
 * Eén lange pagina zonder houvast is net zo verwarrend als vijf tabbladen. Deze
 * rail geeft de oriëntatie terug die de tabbalk bood, maar dan mét de volgorde:
 * je ziet dat er vier hoofdstukken zijn, in welke je bent, en, belangrijker,
 * of er in een later hoofdstuk iets op je wacht.
 *
 * De vorm is hergebruik, geen uitvinding: het is exact het genummerde menu uit
 * `components/profile-menu.tsx` ("Kies je volgende stap"), dat zelf 1-op-1
 * naar InSpace's eigen mobiele menu is gemodelleerd. Mono-nummers in paars,
 * paarse markering op actief, gedempte tekst op inactief.
 */
export interface RailSection {
  id: string;
  label: string;
  /** Stand van dit hoofdstuk, bv. "4 open" of "meting loopt". */
  badge?: string;
  /** Toont de pulserende punt: hier draait iets. */
  live?: boolean;
}

export function SectionRail({ sections }: { sections: RailSection[] }) {
  const [active, setActive] = useState(sections[0]?.id);

  // Scroll-spy: het hoofdstuk dat het dichtst bij de bovenkant van het venster
  // staat, wint. De rootMargin knijpt het venster tot een band net onder de
  // bovenbalk. Anders "wint" het hoofdstuk dat onderin nét binnenkomt.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );

    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <>
      {/* Desktop: verticale rail naast de inhoud. */}
      <nav
        aria-label="Hoofdstukken"
        className="no-print sticky top-24 hidden w-44 shrink-0 flex-col self-start lg:flex"
      >
        {sections.map((s, i) => (
          <RailItem key={s.id} section={s} index={i} active={active === s.id} />
        ))}
      </nav>

      {/* Mobiel/tablet: horizontale chiprij, meescrollend onder de bovenbalk.
          Glaslaag zoals de header (§A3) zodat de inhoud eronder doorschemert. */}
      <nav
        aria-label="Hoofdstukken"
        className="no-print sticky top-[57px] z-10 -mx-6 mb-2 flex gap-2 overflow-x-auto border-b border-[var(--border-subtle)] bg-[var(--bg-base-blur)] px-6 py-2.5 backdrop-blur-md lg:hidden"
      >
        {sections.map((s, i) => {
          const on = active === s.id;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={on ? "true" : undefined}
              className={`chip shrink-0 ${on ? "" : "chip-neutral"}`}
            >
              <span style={{ opacity: 0.7 }}>{String(i + 1).padStart(2, "0")}</span>
              {s.label}
              {s.live && <span className="live-dot" style={{ width: 6, height: 6 }} />}
            </a>
          );
        })}
      </nav>
    </>
  );
}

function RailItem({
  section,
  index,
  active,
}: {
  section: RailSection;
  index: number;
  active: boolean;
}) {
  return (
    <a
      href={`#${section.id}`}
      aria-current={active ? "true" : undefined}
      className="flex items-baseline gap-3 py-2.5 transition-colors"
      style={{
        borderLeft: active ? "var(--border-width-sm) solid var(--intent-intelligence-solid)" : "var(--border-width-sm) solid var(--border-subtle)",
        paddingLeft: 14,
      }}
    >
      <span
        className="mono-label"
        style={{ color: active ? "var(--intent-intelligence-text)" : "var(--text-muted)", fontSize: "0.68rem" }}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="flex flex-col gap-0.5">
        <span
          className="text-sm font-medium transition-colors"
          style={{ color: active ? "var(--text-primary)" : "var(--text-secondary)" }}
        >
          {section.label}
        </span>
        {section.badge && (
          <span className="mono-label flex items-center gap-1.5" style={{ fontSize: "0.6rem" }}>
            {section.live && <span className="live-dot" style={{ width: 6, height: 6 }} />}
            {section.badge}
          </span>
        )}
      </span>
    </a>
  );
}
