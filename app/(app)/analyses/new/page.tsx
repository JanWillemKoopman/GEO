import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { emailsEnabled } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { ClusterLabel, Profile } from "@/lib/types/database";
import { NewAnalysisForm } from "./new-analysis-form";
import { Icon } from "@/components/icon";

export const metadata = { title: "Nieuw cluster" };

export default async function NewAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ merk?: string }>;
}) {
  const { merk } = await searchParams;
  await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "klaar")
    .order("name");
  const profiles = (data ?? []) as Profile[];

  // De bestaande labels (migratie 0083), per merk gebundeld. In één query voor
  // alle merken tegelijk: het formulier laat het merk wisselen zonder de pagina
  // opnieuw te laden, dus de labels van elk merk moeten al klaarstaan.
  const labelsPerMerk: Record<string, ClusterLabel[]> = {};
  if (profiles.length > 0) {
    const { data: labelRijen } = await supabase
      .from("cluster_labels")
      .select("*")
      .in(
        "profile_id",
        profiles.map((p) => p.id),
      );
    for (const label of (labelRijen ?? []) as ClusterLabel[]) {
      labelsPerMerk[label.profile_id] = [...(labelsPerMerk[label.profile_id] ?? []), label];
    }
  }

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
            ORBIT ENGINE meet altijd binnen een merk. Voeg er één toe, en daarna koppel je hier zoveel
            clusters aan als je wilt, één per product of onderwerp.
          </p>
          <Link href="/merk/nieuw" className="btn-primary mt-2">
            Merk toevoegen
          </Link>
        </div>
      ) : (
        /* Staat de mail uit, dan verbergt het formulier het vinkje "mail me
           zodra het rapport klaar is". Een keuze aanbieden die niets doet, is
           erger dan hem niet aanbieden. */
        <NewAnalysisForm
          profiles={profiles}
          labelsPerMerk={labelsPerMerk}
          initialProfileId={vanMerk?.id}
          emailsEnabled={emailsEnabled()}
        />
      )}
    </div>
  );
}
