"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";

/**
 * De secundaire navigatie van een analyse.
 *
 * ── WAT HIER STOND EN WAAROM HET WEG IS ─────────────────────────────────────
 *
 * Hier stond een tabbalk met vijf tabbladen: Overzicht, Vragen & antwoorden,
 * Rapport, Content Bibliotheek, Instellingen. Vijf gelijkwaardige, parallelle
 * keuzes voor werk dat één vaste volgorde heeft, en waarvan er tijdens de
 * eerste minuten van een analyse vier leeg waren, zonder dat de balk dat liet
 * zien.
 *
 * Drie van die tabbladen zijn hoofdstukken van het dossier geworden. Wat
 * overblijft zijn de twee plekken die géén hoofdstuk zijn:
 *
 *   • de BIBLIOTHEEK: het eindproduct waar de klant voor betaalt. In het
 *     dossier is een pagina een taak; hier staat de tekst zelf, netjes bij
 *     elkaar, ook lang nadat de taak eromheen is afgerond.
 *   • de INSTELLINGEN: configuratie, en dus bewust ondergeschikt.
 *
 * Vandaar de ongelijke opmaak: de bibliotheek is een echte bestemming, de
 * instellingen zijn een klein icoon rechts. Twee even zware knoppen zouden
 * suggereren dat het even belangrijke plekken zijn.
 */
export function AnalysisNav({
  analysisId,
  libraryCount,
}: {
  analysisId: string;
  libraryCount: number;
}) {
  const pathname = usePathname();
  const base = `/analyses/${analysisId}`;

  const onDossier = pathname === base;
  const onLibrary = pathname.startsWith(`${base}/bibliotheek`);
  const onSettings = pathname.startsWith(`${base}/instellingen`);

  return (
    <div className="no-print flex flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
      <NavLink href={base} active={onDossier}>
        Cluster
      </NavLink>
      <NavLink href={`${base}/bibliotheek`} active={onLibrary}>
        Bibliotheek
        {libraryCount > 0 && (
          <span className="mono-label" style={{ fontSize: "0.6rem", opacity: 0.75 }}>
            {libraryCount}
          </span>
        )}
      </NavLink>

      <Link
        href={`${base}/instellingen`}
        aria-label="Instellingen van dit cluster"
        aria-current={onSettings ? "page" : undefined}
        className="mono-label ml-auto flex items-center gap-1.5 px-3 py-2 transition-colors hover:text-[var(--text-primary)]"
        style={onSettings ? { color: "var(--text-primary)" } : undefined}
      >
        <Icon naam="instellingen" size={14} />
        Instellingen
      </Link>
    </div>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      // De waas bij hover staat in een klasse en het actieve vlak in een
      // inline-stijl, en dat is met opzet: een inline-stijl wint van een klasse,
      // dus het actieve tabblad negeert de hover vanzelf en de andere niet.
      // Zonder dit beloofde `transition-colors` een overgang die nergens heen
      // ging: je wees een tabblad aan en er gebeurde niets.
      className="flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--wash-hover)]"
      style={{
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        background: active ? "var(--bg-elevated)" : undefined,
      }}
    >
      {children}
    </Link>
  );
}
