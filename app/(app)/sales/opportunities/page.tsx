import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Opportunities" };

/**
 * De prioriteitenlijst, en straks het belangrijkste scherm van de module
 * (plan §5.2).
 *
 * ⚠️ Er komt hier géén kolom met een zichtbaarheidspercentage. Dat is de vanity
 * metric uit hoofdstuk 2 van het plan: de laagste zichtbaarheid is niet
 * automatisch de hoogste saleskans. Wie het cijfer wil zien, klikt door naar het
 * dossier van het bedrijf.
 *
 * Gevuld vanaf sprint 4. Wat er dan staat: de kansen op volgorde van de GEO
 * Opportunity Score, in drie temperaturen, met per regel wie het is, waarom hij
 * interessant is en of iemand er al mee bezig is.
 */
export default function SalesOpportunitiesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Sales"
        title="Opportunities"
        description="De bedrijven met de interessantste GEO-kans, op volgorde. Per regel lees je binnen twee seconden wie het is en waarom je belt."
      />
      <EmptyState title="Nog geen kansen gevonden">
        ORBIT ENGINE vult dit scherm nadat een markt gemeten is. Dat meten wordt nu gebouwd.
      </EmptyState>
    </div>
  );
}
