import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sales" };

/**
 * Het startscherm van een salesmedewerker (plan §5.1).
 *
 * ── WAT HIER STRAKS STAAT, EN WAT BEWUST NIET ───────────────────────────────
 *
 * Vier blokken: mijn werk vandaag, nieuw beschikbaar, wat er terugkomt, en mijn
 * cijfers deze maand. Geen marktcijfers en geen totalen over de database, want
 * dit scherm beantwoordt één vraag: wie moet ik vandaag bellen. Een leaderboard
 * over collega's staat er bewust niet op.
 *
 * ⚠️ **Vandaag is dat leeg, en dat mag niet verstopt worden.** Sprint 1 legt de
 * rol, de markt en het bedrijf neer. De kansen waar dit scherm op leunt komen
 * uit de meting (sprint 3) en de opportunitydetectie (sprint 4). Een lege staat
 * die doet alsof er straks vanzelf iets verschijnt, is een belofte die de app
 * nog niet kan waarmaken.
 */
export default function SalesOverzichtPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Sales"
        title="Wat moet je vandaag doen?"
        description="Je eigen werk, de kansen die niemand heeft opgepakt en wat er terugkomt op je mails. Dit scherm ziet alleen Outer Orbit."
      />
      <EmptyState title="Er staat nog geen werk klaar" action={{ href: "/sales/markten", label: "Naar de markten" }}>
        Er is nog geen markt gemeten, dus er zijn nog geen kansen om op te pakken. Begin met een
        markt: een branche, een plaats en een straal eromheen.
      </EmptyState>
    </div>
  );
}
