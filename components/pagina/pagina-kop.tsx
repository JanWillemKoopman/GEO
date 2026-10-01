import Link from "next/link";
import { Icon } from "@/components/icon";
import { STAND_CHIP, formatDag, type PaginaStand } from "@/lib/pagina-stand";
import { Standbalk } from "./standbalk";

/**
 * De kop van het paginascherm (`docs/tasks/contentflow-een-lijn.md` §4.6a).
 *
 * Terug, de ene naam van de pagina, één regel met soort, cluster en datum, de
 * standbalk. De kaart "Aan zet" komt direct hieronder en wordt door het scherm
 * zelf gevuld, want alleen dat weet welke knop er hoort.
 *
 * ── DE STAND STAAT ER ÉÉN KEER (1 oktober 2026) ─────────────────────────────
 *
 * De stand stond er drie keer: als label naast de titel, in de standbalk, en
 * als zin in "Aan zet". Het label naast de titel staat er nu alleen nog als de
 * standbalk niets laat zien (een pagina zonder fase, zoals "Nog niet
 * ingepland") of als er iets mis is: dan is het de waarschuwing, geen
 * herhaling. "Loopt achter" blijft altijd, want dat zegt de balk niet. De
 * terugweg is gewone tekst en geen label in kapitalen meer.
 */
export function PaginaKop({
  terug,
  naam,
  soort,
  cluster,
  datum,
  stand,
}: {
  terug: { href: string; label: string };
  naam: string;
  soort: string;
  cluster: string | null;
  datum: string | null;
  stand: PaginaStand;
}) {
  const regel = [soort, cluster, datum ? `gepland ${formatDag(datum)}` : null].filter(Boolean).join(" · ");
  const toonLabel = stand.fase === null || stand.toon === "fout";
  return (
    <header className="flex flex-col gap-4">
      <Link
        href={terug.href}
        className="type-compact flex w-fit items-center gap-1.5 text-muted transition-colors hover:text-[var(--text-primary)]"
      >
        <Icon naam="terug" size={14} />
        {terug.label}
      </Link>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="type-heading-lg pagina-kop-titel" title={naam}>
            {naam}
          </h1>
          {/* Oranje is op het paginascherm voorbehouden aan "Te verbeteren"
              (23 september 2026, besluit van de eigenaar). "Wacht op jou" krijgt
              hier dus het accent, net als de stang van de kaart "Aan zet"
              eronder. In de lijsten (bibliotheek, plan) blijft hij oranje: daar
              is hij het signaal tussen tientallen rijen. */}
          {toonLabel && (
            <span className={`${stand.toon === "wacht" ? "chip chip-attention" : STAND_CHIP[stand.toon]} shrink-0`}>
              {stand.label}
            </span>
          )}
          {stand.looptAchter && <span className="chip chip-danger shrink-0">Loopt achter</span>}
        </div>
        {regel && <p className="type-caption text-muted">{regel}</p>}
      </div>
      <Standbalk stand={stand} />
    </header>
  );
}
