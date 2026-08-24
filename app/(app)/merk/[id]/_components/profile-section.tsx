"use client";

import { useEffect, useState } from "react";

/**
 * Eén blok van het profielscherm, op mobiel standaard dicht.
 *
 * ── WAAROM DIT NODIG WAS ────────────────────────────────────────────────────
 *
 * `ux-design.md` §7 is expliciet: "mobiel is nadrukkelijk geen verkleinde
 * desktop", en voor dichte detailschermen schrijft de tabel accordion-dicht
 * voor. Het profielscherm telt inmiddels twaalf kaarten, dichter dan het
 * conceptscherm, dat in datzelfde document als toetssteen geldt, en had over
 * alle panelen samen twee responsive classes. Op een telefoon was dat één
 * scrollbaan van een meter.
 *
 * ── WAAROM NIET `CollapsibleSection` HERGEBRUIKT ────────────────────────────
 *
 * Die zit al ÍN de panelen (de crawl-uitleg, de antwoorden van ChatGPT, de
 * velden van de editor). Diezelfde component er ook omheen zetten geeft een
 * accordeon in een accordeon met dezelfde rand en dezelfde kop. Dan weet
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
  description,
  badge,
  variant = "verhaal",
  children,
}: {
  id: string;
  title: string;
  /**
   * Eén regel onder de kop: waar gaat dit blok over, en waarom staat het er?
   *
   * Overgenomen van Nova, waar élk blok een `title` en een `description` heeft
   * (`strategyMixDescription`, `monthlyPerformanceDescription`,
   * `clicksByPageTypeDescription`, en zo nog een stuk of twintig). Het is het
   * goedkoopste middel tegen "overweldigend": een scherm met acht koppen zonder
   * uitleg dwingt de lezer elk blok open te maken om te weten of het voor hem
   * bedoeld is.
   */
  description?: string;
  /** Kort cijfer of woord naast de kop, bv. "22 onderdelen". */
  badge?: string;
  /**
   * `verhaal` is wat de consultant in de demo laat zien: open op desktop.
   * `naslag` is wat je erbij pakt als je iets moet nakijken of bijstellen, en
   * staat overal dicht.
   *
   * ── WAAROM DIT ONDERSCHEID ────────────────────────────────────────────────
   *
   * De pagina telde acht blokken die alle acht altijd openstonden, samen goed
   * voor een scrollbaan van meters. Alleen de eerste vier vertellen het verhaal;
   * de rest (techniek, profielgegevens, entiteiten, beheer) is gereedschap. Dat
   * gereedschap dichtklappen haalt ruim de helft van de pagina weg zonder één
   * functie te kosten.
   */
  variant?: "verhaal" | "naslag";
  children: React.ReactNode;
}) {
  // Standaard open: zonder JavaScript, en in de eerste render vóór hydratie, is
  // alles zichtbaar. Een blok dat dichtgaat omdat de bundel nog niet geladen is,
  // is erger dan een blok dat te lang open staat.
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setOpen(
      variant === "naslag" ? false : window.matchMedia(DESKTOP_QUERY).matches,
    );
  }, [variant]);

  // Een naslagblok is op élk formaat een knop, dus daar hoort het pijltje er
  // altijd bij. Bij een verhaalblok alleen op mobiel.
  const altijdKlapbaar = variant === "naslag";

  return (
    <section id={id} className="flex flex-col gap-2 scroll-mt-20">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex w-full items-start justify-between gap-3 py-1 text-left ${
          altijdKlapbaar ? "" : "lg:cursor-default"
        }`}
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            {badge && <span className="mono-label text-muted">{badge}</span>}
          </span>
          {description && (
            <span className="text-sm text-muted">{description}</span>
          )}
        </span>
        <span
          className={`mono-label shrink-0 text-muted ${altijdKlapbaar ? "" : "lg:hidden"}`}
          aria-hidden
        >
          {open ? "sluit" : "open"}
        </span>
      </button>

      {open && children}
    </section>
  );
}
