import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Prospects" };

/**
 * Alle bedrijven over alle markten heen (plan §5.3).
 *
 * ⚠️ **Eén bedrijf, meerdere markten.** Dat is de reden dat dit scherm bestaat
 * naast Opportunities: een makelaar in Eindhoven die ook onder "aankoopmakelaar
 * Brabant" valt is één bedrijf met twee marktlidmaatschappen, en die moet je op
 * één plek kunnen terugvinden. Anders benader je hem twee keer.
 *
 * Lezen loopt via de sessie van de gebruiker en dus mét RLS (migratie 0065:
 * alleen `is_sales()` krijgt rijen). De poort in `layout.tsx` is het eerste
 * slot, dit is het tweede.
 */
export default async function SalesProspectsPage() {
  await requireUser();
  const supabase = await createClient();
  const { count } = await supabase
    .from("sales_companies")
    .select("id", { count: "exact", head: true });

  const aantal = count ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Sales"
        title="Prospects"
        description="Alle bedrijven die ORBIT ENGINE in een markt is tegengekomen, doorzoekbaar op naam en webadres."
      />
      {aantal === 0 ? (
        <EmptyState title="Nog geen bedrijven" action={{ href: "/sales/markten", label: "Naar de markten" }}>
          Bedrijven komen binnen zodra ORBIT ENGINE een markt in kaart brengt. Maak eerst een markt aan.
        </EmptyState>
      ) : (
        <p className="text-secondary">
          {aantal === 1 ? "1 bedrijf" : `${aantal} bedrijven`} bekend. Het dossier per bedrijf komt
          bij de opportunities.
        </p>
      )}
    </div>
  );
}
