import { CollapsibleSection } from "@/components/collapsible-section";
import { RerunResearchButton } from "./rerun-research-button";
import { ConfidenceChip } from "@/components/confidence-chip";
import {
  describeCoverage,
  type StructureCoverage,
} from "@/lib/pipeline/structure-gap";
import type { InventoryQuality, ProfileOffering } from "@/lib/types/database";

/**
 * Het aanbod zoals wij het op de site vonden (blok B fase 1).
 *
 * ── WAAROM DE BRON ZICHTBAAR IS ─────────────────────────────────────────────
 *
 * De klant vulde drie velden in; alles hier komt van een model dat naar
 * gecrawlde pagina's keek. Zonder de bron-URL erbij is een verkeerde dienst niet
 * te corrigeren — niemand gaat bij dertig regels handmatig uitzoeken waar er één
 * vandaan komt. Vandaar dat elke knoop zijn pagina toont.
 *
 * ── EN WAAROM DE INVENTARISKWALITEIT ERBOVEN STAAT ──────────────────────────
 *
 * Bij Bol leverde de crawl één pagina op, bij HEMA veertig productpagina's. In
 * beide gevallen draaide de pijplijn gewoon door en zei het rapport nergens dat
 * het op vrijwel niets rustte (R6.2). Als het aanbod dun is omdat de crawl dun
 * was, hoort dat hier te staan — bóven de lijst, niet eronder.
 */

const KIND_LABELS: Record<ProfileOffering["kind"], string> = {
  dienst: "dienst",
  product: "product",
  categorie: "categorie",
  merk: "merk",
  vestiging: "vestiging",
};

export function OfferingsPanel({
  profileId,
  offerings,
  inventory,
  confidence,
  coverage,
}: {
  profileId: string;
  offerings: ProfileOffering[];
  inventory: InventoryQuality | null;
  /** Het aandeel knopen dat een geldige bron overleefde (fase 1). */
  confidence?: number | null;
  /**
   * Welke onderdelen een eigen pagina hebben en welke niet
   * (docs/tasks/inspace-optimalisaties-1-4.md, 1). Afgeleid bij het lezen, niet
   * opgeslagen — hij verandert zodra er een pagina bijkomt.
   */
  coverage?: StructureCoverage | null;
}) {
  // Geen aanbod én geen inventarisoordeel: het onderzoek is hier niet langs
  // geweest. Ook dan een blok tonen, met de knop die het alsnog start — dit is
  // het paneel waar "Onderzoek opnieuw" woont, en juist een klant met een lege
  // boom heeft die knop nodig.
  if (offerings.length === 0 && !inventory) {
    return (
      <div className="card flex flex-col gap-3">
        <span className="mono-label">Wat je aanbiedt</span>
        <p className="text-secondary">
          Je aanbod is nog niet in kaart gebracht. Zodra het onderzoek klaar is
          staat hier elke dienst of productgroep die we op je site vonden, met de
          pagina waar we hem vandaan haalden.
        </p>
        <RerunResearchButton profileId={profileId} />
      </div>
    );
  }

  const byParent = new Map<string | null, ProfileOffering[]>();
  for (const o of offerings) {
    const list = byParent.get(o.parent_id) ?? [];
    list.push(o);
    byParent.set(o.parent_id, list);
  }
  const roots = byParent.get(null) ?? [];

  const dekkingPerId = new Map(
    (coverage?.coverage ?? []).map((c) => [c.offeringId, c]),
  );

  /**
   * ⚠️ EEN REGEL PER KNOOP, DETAILS ACHTER EEN KLIK
   *
   * Elke knoop toonde naam, omschrijving, doelgroep, prijs én bronlink onder
   * elkaar. Bij Fysi-Unique zijn dat 22 knopen — twee tot drie schermen scrollen
   * midden in een demo, terwijl de interessante regels juist de knopen mét een
   * dekkingsgat zijn.
   *
   * Nu is de knoop één scanbare regel en zit de rest in een `<details>`. Bewust
   * native en geen client-state: dit paneel is een servercomponent, en er is
   * geen enkele reden om er JavaScript voor te laden.
   */
  function renderNode(o: ProfileOffering, depth: number) {
    const kinderen = byParent.get(o.id) ?? [];
    const dekking = dekkingPerId.get(o.id);
    const heeftDetails = Boolean(o.description || o.audience || o.evidence_url);

    const kopregel = (
      <span className="flex flex-wrap items-baseline gap-2">
          <span className="chip chip-neutral">{KIND_LABELS[o.kind]}</span>
          <span className="font-medium">{o.name}</span>
          {o.price_indication && (
            <span className="mono-label text-muted">{o.price_indication}</span>
          )}
          {o.source !== "ai" && (
            <span className="chip chip-green">{o.source}</span>
          )}
          {/* Alleen het gebrek krijgt een chip. Naast elk onderdeel "heeft een
              pagina" zetten maakt van de lijst een formulier; de bedoeling is
              dat het gat opvalt. */}
          {dekking?.dekking === "ontbreekt" && (
            <span className="chip chip-warning" title={dekking.reason}>
              geen eigen pagina
            </span>
          )}
          {dekking?.dekking === "zwak_gedekt" && (
            <span className="chip chip-neutral" title={dekking.reason}>
              zwak gedekt
            </span>
          )}
      </span>
    );

    const details = (
      <div className="mt-1 flex flex-col gap-1">
        {o.description && (
          <p className="text-sm text-secondary">{o.description}</p>
        )}
        {o.audience && (
          <p className="text-sm text-muted">
            <span className="mono-label">voor</span> {o.audience}
          </p>
        )}
        {o.evidence_url && (
          <a
            href={o.evidence_url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-sm text-[var(--accent-purple-soft)] hover:underline"
          >
            gevonden op {shortUrl(o.evidence_url)}
          </a>
        )}
      </div>
    );

    return (
      <li key={o.id} className="flex flex-col">
        {heeftDetails ? (
          <details className="group">
            <summary className="cursor-pointer list-none marker:content-none">
              {kopregel}
            </summary>
            {details}
          </details>
        ) : (
          kopregel
        )}
        {kinderen.length > 0 && (
          <ul className="mt-2 flex flex-col gap-2 border-l border-[var(--border-subtle)] pl-4">
            {kinderen.map((k) => renderNode(k, depth + 1))}
          </ul>
        )}
      </li>
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
          <span className="mono-label">
            {inventory.verdict === "dun"
              ? "Weinig gevonden"
              : "Vooral productpagina's"}
          </span>
          <p className="mt-1 text-secondary">{inventory.advice}</p>
        </div>
      )}

      {offerings.length === 0 ? (
        <p className="text-sm text-secondary">
          We konden het aanbod niet uit de website halen. Vul het hieronder aan
          tijdens het gesprek, of controleer of de site zonder JavaScript
          leesbaar is.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {roots.map((o) => renderNode(o, 0))}
        </ul>
      )}

      {/* De knop staat hier en niet ergens in de instellingen: als de crawl dun
          was of het aanbod klopt niet, is dit de plek waar je dat ziet. */}
      <RerunResearchButton profileId={profileId} />

      {inventory && (
        <CollapsibleSection title="Hoe volledig was de crawl?">
          <ul className="flex flex-col gap-1 text-sm text-secondary">
            <li>{inventory.pages} pagina&apos;s gevonden</li>
            <li>
              {Math.round(inventory.usableTextRatio * 100)}% met bruikbare tekst
            </li>
            <li>
              {Math.round(inventory.productPageRatio * 100)}% vermoedelijke
              productpagina&apos;s
            </li>
          </ul>
        </CollapsibleSection>
      )}
    </div>
  );
}

/** Alleen het pad, want het domein staat overal hetzelfde bovenaan. */
function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === "/" ? u.hostname : u.pathname;
  } catch {
    return url;
  }
}
