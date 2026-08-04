"use client";

import { useEffect, useState } from "react";

/**
 * Eén blok van het profielscherm, op mobiel standaard dicht.
 *
 * ── WAAROM DIT NODIG WAS ────────────────────────────────────────────────────
 *
 * `ux-design.md` §7 is expliciet: "mobiel is nadrukkelijk geen verkleinde
 * desktop", en voor dichte detailschermen schrijft de tabel accordion-dicht
 * voor. Het profielscherm telt inmiddels twaalf kaarten — dichter dan het
 * conceptscherm, dat in datzelfde document als toetssteen geldt — en had over
 * alle panelen samen twee responsive classes. Op een telefoon was dat één
 * scrollbaan van een meter.
 *
 * ── WAAROM NIET `CollapsibleSection` HERGEBRUIKT ────────────────────────────
 *
 * Die zit al ÍN de panelen (de crawl-uitleg, de antwoorden van ChatGPT, de
 * velden van de editor). Diezelfde component er ook omheen zetten geeft een
 * accordeon in een accordeon met dezelfde rand en dezelfde kop — dan weet
 * niemand meer welk kruisje welk blok sluit. Dit is een niveau hoger: geen
 * eigen omlijsting, alleen een kop die op mobiel inklapt.
 *
 * De kop draagt een `id`, zodat de consultant er tijdens het gesprek
 * rechtstreeks naartoe kan springen.
 */
const DESKTOP_QUERY = "(min-width: 1024px)";

export function ProfileSection({
  id,
  title,
  badge,
  children,
}: {
  id: string;
  title: string;
  /** Kort cijfer of woord naast de kop, bv. "22 onderdelen". */
  badge?: string;
  children: React.ReactNode;
}) {
  // Standaard open: zonder JavaScript, en in de eerste render vóór hydratie, is
  // alles zichtbaar. Een blok dat dichtgaat omdat de bundel nog niet geladen is,
  // is erger dan een blok dat te lang open staat.
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(window.matchMedia(DESKTOP_QUERY).matches);
  }, []);

  return (
    <section id={id} className="flex flex-col gap-2 scroll-mt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 py-1 text-left lg:cursor-default"
      >
        <span className="flex items-baseline gap-2">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {badge && <span className="mono-label text-muted">{badge}</span>}
        </span>
        {/* Het pijltje alleen op mobiel: op desktop staat alles open en is de
            kop geen knop maar een kop. */}
        <span className="mono-label text-muted lg:hidden" aria-hidden>
          {open ? "sluit" : "open"}
        </span>
      </button>

      {open && children}
    </section>
  );
}
