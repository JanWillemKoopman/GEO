import { notFound } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/empty-state";
import { loadAnswers } from "@/lib/pipeline/answers";
import { AnswersView } from "./answers-view";

/**
 * Tabblad "Vragen & antwoorden" (optimalisatie.md 3A).
 *
 * De `runs`-parameter komt uit een doorklik in het rapport (3.3): elk probleem
 * daar heeft `evidenceRunIds`, en die werden alleen geteld ("3× aangetoond").
 * Nu kun je erop klikken en zie je precies de antwoorden waar die uitspraak op
 * rust — dat is wat "elke aanbeveling is herleidbaar" concreet maakt.
 */
export default async function AntwoordenPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ runs?: string }>;
}) {
  const { id } = await params;
  const { runs } = await searchParams;

  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  const supabase = await createClient();
  const data = await loadAnswers(supabase, id, analysis.profile_id);

  if (!data) {
    return (
      <EmptyState title="Nog geen antwoorden">
        Zodra de meting gedraaid heeft, staan hier de letterlijke antwoorden die een AI-assistent op
        jouw vragen gaf.
      </EmptyState>
    );
  }

  // Alleen id's die ook echt in deze periode zitten; een oude link uit een
  // eerder rapport mag geen leeg scherm opleveren.
  const known = new Set(data.rows.map((r) => r.runId));
  const focusRunIds = runs
    ? runs.split(",").map((s) => s.trim()).filter((s) => known.has(s))
    : null;

  return (
    <AnswersView
      rows={data.rows}
      ownLabel={data.ownLabel}
      ownTerms={data.ownTerms}
      focusRunIds={focusRunIds && focusRunIds.length > 0 ? focusRunIds : null}
    />
  );
}
