"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { Tabs } from "@/components/tabs";

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
 * Drie van die tabbladen zijn hoofdstukken van het dossier geworden, en dat
 * dossier is er sinds 22 september 2026 zelf ook niet meer
 * (`docs/tasks/clusterresultaat-zonder-eigen-scherm.md`). Daarmee viel ook het
 * tabblad "Cluster" weg: het wees naar een adres dat nu doorverwijst naar het
 * clusteroverzicht, en een tabblad dat je uit zijn eigen navigatie gooit is
 * erger dan geen tabblad.
 *
 * Wat overblijft zijn de twee plekken die géén hoofdstuk waren:
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
  profileId,
  libraryCount,
}: {
  analysisId: string;
  /** Nodig sinds de bibliotheek merkbreed is: daar hangt het adres aan het merk. */
  profileId: string;
  libraryCount: number;
}) {
  const pathname = usePathname();
  const base = `/analyses/${analysisId}`;

  const onLibrary = pathname.startsWith(`${base}/bibliotheek`);
  const onSettings = pathname.startsWith(`${base}/instellingen`);
  return (
    // `justify-between` in plaats van de losse `ml-auto` op Instellingen: die
    // knop is met opzet geen derde tabblad (zie de toelichting hierboven), dus
    // hij staat hier als eigen element naast `Tabs` en niet ertussen.
    //
    // De rand onderaan staat hier nog een keer, in dezelfde kleur als `.tabs`
    // zijn eigen rand (`--line-muted`): die van `.tabs` dekt alleen de breedte
    // van de twee tabbladen, deze dekt de volle breedte inclusief Instellingen.
    <div className="no-print flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line-muted)]">
      <Tabs
        label="Onderdelen van dit cluster"
        items={[
          {
            // ⚠️ Wijst sinds 16 september 2026 naar de MERKBREDE bibliotheek,
            // met dit cluster als filter. De bibliotheek per cluster was een
            // tweede lijst over dezelfde rijen; wat de doorklik waard was
            // (alleen dít cluster zien) doet het filter nu.
            href: `/merk/${profileId}/strategie/bibliotheek?cluster=${analysisId}`,
            label: "Bibliotheek",
            // Expliciet meegeven en niet aan `Tabs` zijn voorvoegselmatch
            // overlaten: die vergelijkt tegen `pathname`, dat nooit een
            // querystring bevat, dus zou nooit als actief herkennen.
            actief: onLibrary,
            aantal: libraryCount,
          },
        ]}
      />

      <Link
        href={`${base}/instellingen`}
        aria-label="Instellingen van dit cluster"
        aria-current={onSettings ? "page" : undefined}
        className="mono-label flex items-center gap-1.5 px-3 py-2 transition-colors hover:text-[var(--text-primary)]"
        style={onSettings ? { color: "var(--text-primary)" } : undefined}
      >
        <Icon naam="instellingen" size={14} />
        Instellingen
      </Link>
    </div>
  );
}
