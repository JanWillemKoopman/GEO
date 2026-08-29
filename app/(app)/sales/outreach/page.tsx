import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Outreach" };

/**
 * Wat er verstuurd is en wat eruit kwam (plan §5.5).
 *
 * ⚠️ **De openingsmail wordt altijd door de medewerker zelf verstuurd**, vanuit
 * zijn eigen mailbox, onder zijn eigen naam (plan §16.3). ORBIT ENGINE zet het
 * concept klaar en registreert dat het eruit is. Er komt geen knop, geen
 * instelling en geen cron die een openingsmail zelf de deur uit doet. Dit scherm
 * is dus een logboek en geen verzendcentrale.
 *
 * Gevuld vanaf sprint 5.
 */
export default function SalesOutreachPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Sales"
        title="Outreach"
        description="Wat je hebt uitstaan, wat erop terugkwam en welke soort aanleiding het beste werkt. Versturen doe je zelf, vanuit je eigen mailbox."
      />
      <EmptyState title="Nog niets verstuurd">
        Zodra er kansen zijn, zet ORBIT ENGINE hier een conceptmail klaar. Jij leest hem, past hem aan
        en verstuurt hem zelf.
      </EmptyState>
    </div>
  );
}
