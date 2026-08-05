import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ResultsPanel } from "@/components/results-panel";
import { loadResults } from "@/lib/pipeline/results";
import type { Analysis } from "@/lib/types/database";

/**
 * Hoofdstuk 04 — "Wat het heeft opgeleverd".
 *
 * Het scherm waarvoor de klant betaalt. Het stond bovenaan het overzicht-tabblad
 * en tegelijk verspreid over de detailpagina's van de bibliotheek; hier is het
 * één plek, aan het eind van het verhaal, waar het hoort: je meet, je ziet waar
 * je mist, je doet iets — en dan pas is er een resultaat.
 *
 * Dit hoofdstuk sluit de lus. Wat hier staat is volgende periode de
 * verandering in hoofdstuk 01.
 */
export async function ResultaatChapter({ analysis }: { analysis: Analysis }) {
  const supabase = await createClient();
  const results = await loadResults(supabase, analysis.id);

  if (results.funnel.generated === 0) {
    return (
      <div className="card flex flex-col gap-2">
        <span className="mono-label">Nog niets om te meten</span>
        <p className="text-secondary">
          Zodra je eerste pagina live staat, hermeet Aura na twee en na vier weken of je op díe
          vragen vaker genoemd wordt. Dat verschil komt hier te staan — naast een controlegroep van
          vragen waarvoor je niets publiceerde. Zo weet je of het je pagina&apos;s waren, en niet
          het toeval.
        </p>
        <Link href={`/analyses/${analysis.id}#werk`} className="btn-outline mt-1 w-fit">
          Naar wat je nu kunt doen
        </Link>
      </div>
    );
  }

  return <ResultsPanel analysisId={analysis.id} results={results} />;
}
