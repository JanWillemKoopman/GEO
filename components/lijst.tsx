/**
 * Een lijst van gelijksoortige dingen: pagina's, clusters, maanden.
 *
 * ── WAAROM DIT BESTAAT (1 OKTOBER 2026) ─────────────────────────────────────
 *
 * Drie schermen toonden dezelfde soort lijst op drie manieren. De Bibliotheek
 * had één vlak met regels en scheidingslijnen ertussen. Clusters stapelde een
 * losse kaart per cluster. Het contentplan zette elke maand in een tabel met
 * zes kolommen, die op een telefoon zijwaarts schoof. Een stapel kaarten leest
 * als een dashboard van losse blokken; een tabel met vijf kolommen tekst is op
 * 390 pixels onleesbaar.
 *
 * De vorm van de Bibliotheek werkte en is hier het model geworden: één vlak,
 * per regel de titel, daaronder één regel bijzaak in klein schrift, en rechts
 * de status of de handeling. Op een telefoon valt het rechterdeel onder de
 * titel in plaats van ernaast, dus er schuift niets.
 *
 * ── DE PUNTHAAK, NIET DE PIJL ───────────────────────────────────────────────
 *
 * Een regel die zelf de link is, krijgt rechts een punthaak (`verder`). De
 * pijl (`naar`) hoort achter een tekstlink ("Naar het gesprek"). Tot vandaag
 * stonden ze door elkaar voor dezelfde betekenis.
 */

import Link from "next/link";
import { Icon } from "@/components/icon";

/** Het vlak waar de regels in staan. */
export function Lijst({
  children,
  label,
}: {
  children: React.ReactNode;
  /** Voor een schermlezer, als de kop erboven niet al zegt wat dit is. */
  label?: string;
}) {
  return (
    <ul
      aria-label={label}
      className="card flex flex-col divide-y divide-[var(--border-subtle)] overflow-hidden !p-0"
    >
      {children}
    </ul>
  );
}

const REGEL =
  "flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between md:px-5";

/**
 * Eén regel. Met `href` is de hele regel de link en staat er een punthaak;
 * zonder `href` is het een gewone regel, bijvoorbeeld omdat er knoppen in
 * staan die zelf iets doen.
 */
export function LijstRegel({
  titel,
  bijzaak,
  toelichting,
  rechts,
  href,
}: {
  titel: React.ReactNode;
  /** Eén regel klein schrift onder de titel: soort, cluster, datum. */
  bijzaak?: React.ReactNode;
  /** Een zin over de stand, in de leeskleur. */
  toelichting?: React.ReactNode;
  /** Status, label of handeling. Staat rechts, op een telefoon onder de titel. */
  rechts?: React.ReactNode;
  href?: string;
}) {
  const inhoud = (
    <>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="type-body-emphasis min-w-0">{titel}</div>
        {bijzaak && <p className="type-caption text-muted">{bijzaak}</p>}
        {toelichting && <p className="type-compact mt-0.5 text-secondary">{toelichting}</p>}
      </div>
      {(rechts || href) && (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {rechts}
          {href && (
            <span className="text-muted" aria-hidden>
              <Icon naam="verder" size={16} />
            </span>
          )}
        </div>
      )}
    </>
  );
  return (
    <li>
      {href ? (
        <Link
          href={href}
          className={`${REGEL} transition-colors hover:bg-[var(--bg-surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--border-focus)]`}
        >
          {inhoud}
        </Link>
      ) : (
        <div className={REGEL}>{inhoud}</div>
      )}
    </li>
  );
}
