import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { isStaff } from "@/lib/staff";
import { COST_DENIED } from "@/lib/cost-rules";
import { emailsEnabled } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";
import { NewAnalysisForm } from "./new-analysis-form";
import { Icon } from "@/components/icon";

export const metadata = { title: "Nieuw cluster" };

export default async function NewAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ merk?: string }>;
}) {
  const { merk } = await searchParams;
  const user = await requireUser();
  const staff = await isStaff(user.id);
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "klaar")
    .order("name");
  const profiles = (data ?? []) as Profile[];

  // Kwam hij van een merk, dan gaat hij daar ook naar terug. Zonder merk in de
  // link is `/analyses` de doorverwijzing naar het actieve merk, dus die weg
  // klopt ook (`app/(app)/analyses/page.tsx`).
  const vanMerk = profiles.find((p) => p.id === merk) ?? null;
  const terug = vanMerk ? `/merk/${vanMerk.id}/strategie/clusters` : "/analyses";

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <Link href={terug} className="mono-label transition-colors hover:text-[var(--text-primary)]">
          <Icon naam="terug" size={14} />
          Terug naar Clusters
        </Link>
        <h1 className="type-title mt-3">Nieuw cluster</h1>
        <p className="mt-2 text-secondary">
          Kies een merk en het product of onderwerp dat je wilt meten. ORBIT ENGINE zoekt alleen nog uit wat
          je website hierover zegt en wie op dít onderwerp je concurrenten zijn. De rest weet het
          al uit het merkdossier.
        </p>
      </div>

      {profiles.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 py-12 text-center">
          <h2 className="text-xl font-semibold">Eerst een merk</h2>
          <p className="max-w-md text-secondary">
            {staff
              ? "ORBIT ENGINE meet altijd binnen een merk. Voeg er één toe, en daarna koppel je hier zoveel clusters aan als je wilt, één per product of onderwerp."
              : `ORBIT ENGINE meet altijd binnen een merk, en er staat er nog geen klaar. ${COST_DENIED.merk_onderzoeken}`}
          </p>
          {/* Een merk toevoegen kost geld en blijft van de beheerder
              (`lib/cost-rules.ts`). De klant kreeg hier tot 27 augustus 2026
              een knop die na het formulier weigerde. */}
          {staff && (
            <Link href="/merk/nieuw" className="btn-primary mt-2">
              Merk toevoegen
            </Link>
          )}
        </div>
      ) : (
        /* Staat de mail uit, dan verbergt het formulier het vinkje "mail me
           zodra het rapport klaar is". Een keuze aanbieden die niets doet, is
           erger dan hem niet aanbieden. */
        <NewAnalysisForm
          profiles={profiles}
          initialProfileId={vanMerk?.id}
          emailsEnabled={emailsEnabled()}
        />
      )}
    </div>
  );
}
