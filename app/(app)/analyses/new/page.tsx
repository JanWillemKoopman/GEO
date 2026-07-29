import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { emailsEnabled } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";
import { NewAnalysisForm } from "./new-analysis-form";

export default async function NewAnalysisPage() {
  await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", "klaar")
    .order("name");
  const profiles = (data ?? []) as Profile[];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <Link href="/analyses" className="mono-label transition-colors hover:text-[var(--text-primary)]">
          ← Terug naar Mijn analyses
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Nieuwe analyse</h1>
        <p className="mt-2 text-secondary">
          Kies een merk en vul het product of onderwerp in dat je wilt meten. We zoeken
          alleen nog uit wat de website hierover zegt en wie de concurrenten zijn voor dít
          onderwerp — de rest komt uit het merkprofiel.
        </p>
      </div>

      {profiles.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 py-12 text-center">
          <h2 className="text-xl font-semibold">Eerst een merk nodig</h2>
          <p className="max-w-md text-secondary">
            Voeg eerst het merk toe — daarna kun je hier analyses op
            verschillende producten/onderwerpen aan koppelen.
          </p>
          <Link href="/profielen/nieuw" className="btn-primary mt-2">
            Merk toevoegen
          </Link>
        </div>
      ) : (
        /* Staat de mail uit, dan verbergt het formulier het vinkje "mail me
           zodra het rapport klaar is" — een keuze aanbieden die niets doet, is
           erger dan hem niet aanbieden. */
        <NewAnalysisForm profiles={profiles} emailsEnabled={emailsEnabled()} />
      )}
    </div>
  );
}
