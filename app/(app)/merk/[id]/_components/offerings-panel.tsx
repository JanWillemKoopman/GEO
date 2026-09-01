import { CollapsibleSection } from "@/components/collapsible-section";
import { RerunResearchButton } from "./rerun-research-button";
import { ManualPagesBox } from "./manual-pages-box";
import { OfferingsEditor } from "./offerings-editor";
import { ConfidenceChip } from "@/components/confidence-chip";
import {
  describeCoverage,
  type StructureCoverage,
} from "@/lib/pipeline/structure-gap";
import type { InventoryQuality, ProfileOffering } from "@/lib/types/database";

/**
 * Het aanbod zoals wij het op de site vonden, en sinds onboarding Ronde C
 * (`documentatie/onboarding_optimalisatie.md` §16) ook te bewerken.
 *
 * ── WAAROM DE BRON ZICHTBAAR IS ─────────────────────────────────────────────
 *
 * De klant vulde drie velden in; alles hier komt van een model dat naar
 * gecrawlde pagina's keek. Zonder de bron-URL erbij is een verkeerde dienst niet
 * te corrigeren. Niemand gaat bij dertig regels handmatig uitzoeken waar er één
 * vandaan komt. Vandaar dat elke knoop zijn pagina toont.
 *
 * ── EN WAAROM DE INVENTARISKWALITEIT ERBOVEN STAAT ──────────────────────────
 *
 * Bij Bol leverde de crawl één pagina op, bij HEMA veertig productpagina's. In
 * beide gevallen draaide de pijplijn gewoon door en zei het rapport nergens dat
 * het op vrijwel niets rustte (R6.2). Als het aanbod dun is omdat de crawl dun
 * was, hoort dat hier te staan, bóven de lijst, niet eronder.
 *
 * ── SERVERCOMPONENT MET EEN CLIENT-KIND ─────────────────────────────────────
 *
 * Het paneel zelf blijft server-gerenderd (kop, inventarisoordeel, statistieken
 * onderaan). Alleen de boom zelf is nu `OfferingsEditor`, want toevoegen,
 * bewerken en verwijderen vragen om formulierstatus die een servercomponent
 * niet kan bijhouden.
 */

/**
 * De kop boven het inventarisoordeel. `afgekapt` is er sinds 22 augustus 2026
 * bij: een site met 150 gelezen pagina's kreeg tot dan het oordeel `voldoende`,
 * of er nu precies 150 pagina's waren of 8.000. Juist dat tweede geval vraagt om
 * een handeling, en het zag er hetzelfde uit als een volledig gelezen site.
 */
const VERDICT_KOPPEN: Record<InventoryQuality["verdict"], string> = {
  voldoende: "Voldoende gelezen",
  dun: "Weinig gevonden",
  vervuild: "Vooral productpagina's",
  afgekapt: "Niet je hele site gelezen",
};

export function OfferingsPanel({
  profileId,
  offerings,
  removedOfferings = [],
  inventory,
  confidence,
  coverage,
  manualPages = [],
  priorityPaths = [],
}: {
  profileId: string;
  offerings: ProfileOffering[];
  /** Uitgezette knopen (migratie 0079): "verwijderen" zet uit, wist niet. */
  removedOfferings?: ProfileOffering[];
  inventory: InventoryQuality | null;
  /** Pagina's die een mens aan de inventaris toevoegde (migratie 0061). */
  manualPages?: { url: string; title: string | null }[];
  /** Sitesecties die bij de crawl voorrang kregen. Leeg = de hele site paste. */
  priorityPaths?: string[];
  /** Het aandeel knopen dat een geldige bron overleefde (fase 1). */
  confidence?: number | null;
  /**
   * Welke onderdelen een eigen pagina hebben en welke niet
   * (docs/tasks/inspace-optimalisaties-1-4.md, 1). Afgeleid bij het lezen, niet
   * opgeslagen, hij verandert zodra er een pagina bijkomt.
   */
  coverage?: StructureCoverage | null;
}) {
  const dekkingPerId = new Map(
    (coverage?.coverage ?? []).map((c) => [c.offeringId, c]),
  );

  // Geen aanbod én geen inventarisoordeel: het onderzoek is hier niet langs
  // geweest. Ook dan een blok tonen, met de knop die het alsnog start én de
  // mogelijkheid om zelf de eerste dienst vast te leggen. Dit is het paneel
  // waar "Onderzoek opnieuw" woont, en juist een klant met een lege boom heeft
  // die knop nodig.
  if (offerings.length === 0 && !inventory && removedOfferings.length === 0) {
    return (
      <div className="card flex flex-col gap-3">
        <span className="mono-label">Wat je aanbiedt</span>
        <p className="text-secondary">
          Je aanbod is nog niet in kaart gebracht. Zodra het onderzoek klaar is,
          staat hier elke dienst en productgroep die ORBIT ENGINE op je site vond, met de
          pagina waar het die vandaan haalde. Mist er iets dat niet op de site
          staat, dan kun je het hieronder alvast zelf vastleggen.
        </p>
        <OfferingsEditor profileId={profileId} offerings={offerings} removedOfferings={removedOfferings} />
        <RerunResearchButton profileId={profileId} />
        {/* Juist bij een lege boom is dit de nuttigste knop: dan is de crawl
            niets tegengekomen en weet jij wél waar het aanbod staat. */}
        <ManualPagesBox profileId={profileId} pages={manualPages} />
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono-label flex items-center gap-2">
          Wat je aanbiedt
          <ConfidenceChip confidence={confidence} />
        </span>
        {offerings.length > 0 && (
          <span className="mono-label text-muted">
            {offerings.length} onderdelen
          </span>
        )}
      </div>

      {coverage && coverage.assessed > 0 && (
        <p className="text-sm text-secondary">{describeCoverage(coverage)}</p>
      )}

      {inventory && inventory.verdict !== "voldoende" && (
        <div
          className="rounded-[var(--radius-md)] border border-[var(--status-warning)] px-3 py-2 text-sm"
          role="status"
        >
          <span className="mono-label">{VERDICT_KOPPEN[inventory.verdict]}</span>
          <p className="mt-1 text-secondary">{inventory.advice}</p>
        </div>
      )}

      {offerings.length === 0 && (
        <p className="text-sm text-secondary">
          ORBIT ENGINE kon je aanbod niet uit de website halen. Vul het hieronder aan
          tijdens het gesprek, of controleer of de site ook zonder JavaScript
          leesbaar is.
        </p>
      )}

      <OfferingsEditor
        profileId={profileId}
        offerings={offerings}
        removedOfferings={removedOfferings}
        dekkingPerId={dekkingPerId}
      />

      {/* De knop staat hier en niet ergens in de instellingen: als de crawl dun
          was of het aanbod klopt niet, is dit de plek waar je dat ziet. */}
      <RerunResearchButton profileId={profileId} />

      <ManualPagesBox profileId={profileId} pages={manualPages} />

      {inventory && (
        <CollapsibleSection title="Hoeveel heeft ORBIT ENGINE van je site gelezen?">
          <ul className="flex flex-col gap-1 text-sm text-secondary">
            {/* ⚠️ Hier stond "N pagina's gevonden", ook als de site er 8.000 had
                en wij er 150 lazen. Dat las als volledigheid terwijl het een
                afkapping was. Profielen van vóór 22 augustus 2026 kennen
                `totalFound` niet; die tonen de oude regel, want zwijgen is
                beter dan een verzonnen totaal (conventie 3). */}
            <li>
              {typeof inventory.totalFound === "number" && inventory.totalFound > inventory.pages
                ? `${inventory.pages} van de ${inventory.totalFound} pagina's gelezen, verdeeld over alle delen van de site`
                : `${inventory.pages} pagina's gevonden`}
            </li>
            <li>
              {Math.round(inventory.usableTextRatio * 100)}% met bruikbare tekst
            </li>
            <li>
              {Math.round(inventory.productPageRatio * 100)}% vermoedelijke
              productpagina&apos;s
            </li>
            {priorityPaths.length > 0 && (
              <li>voorrang voor {priorityPaths.join(", ")}</li>
            )}
          </ul>
        </CollapsibleSection>
      )}
    </div>
  );
}
