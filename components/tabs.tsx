"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Tabbladen, in twee soorten.
 *
 * ── WAAROM TWEE EN NIET ÉÉN ─────────────────────────────────────────────────
 *
 * Een onderstreepte tab zegt **"je bent hier"**. Hij hoort bij navigatie: de
 * hoofdstukken van een cluster, de vier Analytics-schermen. Je wisselt van
 * plek, dus de terugknop brengt je terug.
 *
 * Een segment zegt **"zo kijk je ernaar"**. Hij hoort bij een keuze die het
 * beeld verandert zonder dat je van plek wisselt: een periodefilter, een
 * weergavewissel. De terugknop doet hier niets, want je bent nergens heen
 * gegaan.
 *
 * Waar die twee door elkaar lopen weet niemand meer wat de terugknop doet. Dat
 * is de reden dat het twee componenten zijn en geen `variant`-prop: de keuze
 * tussen navigatie en instelling is een ontwerpbeslissing en geen stijl.
 *
 * De vorm staat in `app/globals.css` onder "Tabbladen"; hier staat alleen het
 * gedrag. Zie `redesign2026.md` §7.6 voor de maten en waar ze vandaan komen.
 */

type TabItem = {
  /** Wat er op het tabblad staat. */
  label: string;
  /** Waar hij heen gaat. */
  href: string;
  /**
   * Actief? Laat leeg om het aan het adres over te laten: dan is een tab actief
   * zodra het huidige pad ermee begint. Geef het expliciet mee als dat niet
   * klopt, bijvoorbeeld bij een tab die ook op onderliggende routes actief moet
   * blijven.
   */
  actief?: boolean;
  /** Een getal rechts van het label, bijvoorbeeld hoeveel er in de lijst staan. */
  aantal?: number;
};

/**
 * De onderstreepte tabbalk, voor navigatie binnen een scherm.
 *
 * ⚠️ Dit zijn `Link`s en geen knoppen, ook al zien ze eruit als een schakelaar.
 * Een tabblad dat een bestemming is hoort een adres te hebben: dan is een
 * gefilterd of geopend beeld te delen en te bewaren, en werkt openen in een
 * nieuw tabblad zoals iedereen verwacht.
 */
export function Tabs({ items, label }: { items: TabItem[]; label: string }) {
  const pathname = usePathname();

  return (
    <nav className="tabs no-print" aria-label={label}>
      {items.map((item) => {
        const actief = item.actief ?? pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="tab"
            // `aria-current="page"` is wat een schermlezer voorleest én wat de
            // CSS aangrijpt. Eén bron voor de staat, geen tweede klasse die
            // ermee uit de pas kan lopen.
            aria-current={actief ? "page" : undefined}
          >
            {item.label}
            {item.aantal != null && item.aantal > 0 && (
              <span className="chip chip-neutral" aria-hidden>
                {item.aantal}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Het segment, voor een keuze die het beeld verandert zonder van plek te
 * wisselen.
 *
 * Twee of drie opties, niet meer. Bij vier wordt het een keuzelijst: een
 * segment van vier is breder dan de helft van een filterbalk en dan gaat hij
 * de rij eronder duwen zodra er een lange optie bij komt.
 */
export function Segment<T extends string>({
  opties,
  gekozen,
  onKies,
  label,
}: {
  opties: { waarde: T; label: string }[];
  gekozen: T;
  onKies: (waarde: T) => void;
  label: string;
}) {
  return (
    <div className="segment" role="group" aria-label={label}>
      {opties.map((optie) => (
        <button
          key={optie.waarde}
          type="button"
          className="segment-item"
          // `aria-pressed` en niet een klasse, om dezelfde reden als bij `Tabs`:
          // de staat staat op één plek en de CSS leest hem daar.
          aria-pressed={optie.waarde === gekozen}
          onClick={() => onKies(optie.waarde)}
        >
          {optie.label}
        </button>
      ))}
    </div>
  );
}
