import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CompetitorCard, AlsoMentionedCard } from "../score-panel";
import { AnswersView } from "../antwoorden/answers-view";
import { loadAnswers } from "@/lib/pipeline/answers";
import { InfoHint } from "@/components/info-hint";
import type { Analysis, CompetitorBreakdown, Entity, Report, VisibilityScore } from "@/lib/types/database";

interface ReportGap {
  cluster: string;
  problem: string;
  evidenceRunIds: string[];
}

/**
 * Hoofdstuk 02, "Waar je wint en mist".
 *
 * ── DRIE PLEKKEN DIE ÉÉN PLEK HOORDEN TE ZIJN ───────────────────────────────
 *
 * Dezelfde vraag werd op drie tabbladen beantwoord: de concurrentiebalken op
 * Overzicht, de gemiste vragen op Vragen & antwoorden, en de gaten-analyse in
 * het Rapport. Dat laatste tabblad linkte voor elk gat terug naar het tweede
 * ("3× aangetoond, bekijk het bewijs"), en elke aanbeveling deed dat nog eens.
 *
 * Die links waren het bewijs dat de scheiding niet klopte: het rapport moest je
 * naar een ander scherm sturen om zijn eigen bewering te onderbouwen. Nu staat
 * de bewering bovenaan dit hoofdstuk en het bewijs eronder, je klikt op een
 * gat en de vragenlijst eronder filtert zichzelf.
 */
export async function BewijsChapter({
  analysis,
  weekNo,
  /** Uit `?runs=`, een doorklik vanaf een gat of een aanbeveling. */
  focusRuns,
}: {
  analysis: Analysis;
  weekNo: number | null;
  focusRuns?: string;
}) {
  if (weekNo === null) {
    return (
      <div className="card flex flex-col gap-2">
        <span className="mono-label">Nog geen metingen</span>
        <p className="text-secondary">
          Hier komen straks de letterlijke antwoorden die AI-assistenten op jouw vragen gaven, met
          jouw merk en dat van je concurrenten erin gemarkeerd.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const [
    { data: scoreRow },
    { data: competitorRows },
    { count: runCount },
    { data: entityRows },
    { data: reportRow },
    answers,
  ] = await Promise.all([
    supabase
      .from("visibility_scores")
      .select("*")
      .eq("analysis_id", analysis.id)
      .eq("week_no", weekNo)
      .maybeSingle(),
    supabase
      .from("competitor_breakdown")
      .select("*")
      .eq("analysis_id", analysis.id)
      .eq("week_no", weekNo)
      .order("mentions_count", { ascending: false }),
    supabase
      .from("tracking_runs")
      .select("id", { count: "exact", head: true })
      .eq("analysis_id", analysis.id)
      .eq("week_no", weekNo)
      .eq("purpose", "periodic"),
    // Merken die de meting wél tegenkwam maar die geen concurrent zijn
    // (migratie 0026): marktplaatsen, vergelijkers, brancheorganisaties. Ze
    // tellen niet mee in het aandeel, maar de klant moet ze zien. Anders is
    // niet te verklaren waarom een merk uit de antwoorden niet in de grafiek
    // staat. Nog niet geclassificeerde merken ('onbepaald') laten we weg: die
    // zijn nog onderweg en zouden hier als 'geen concurrent' overkomen.
    supabase
      .from("entities")
      .select("*")
      .eq("profile_id", analysis.profile_id)
      .not("entity_role", "in", "(concurrent,eigen_merk)")
      .neq("role_source", "onbepaald")
      .eq("dismissed", false)
      .order("canonical_name"),
    supabase
      .from("reports")
      .select("*")
      .eq("analysis_id", analysis.id)
      .eq("week_no", weekNo)
      .maybeSingle(),
    loadAnswers(supabase, analysis.id, analysis.profile_id),
  ]);

  const score = scoreRow as VisibilityScore | null;
  if (!score) {
    return (
      <div className="card flex flex-col gap-2">
        <span className="mono-label">Nog geen metingen</span>
        <p className="text-secondary">Voor deze periode zijn nog geen metingen beschikbaar.</p>
      </div>
    );
  }

  const gaps = ((reportRow as Report | null)?.gaps_json ?? []) as ReportGap[];

  // Alleen id's die ook echt in deze periode zitten; een oude link uit een
  // eerder rapport mag geen leeg scherm opleveren.
  const known = new Set((answers?.rows ?? []).map((r) => r.runId));
  const focusRunIds = focusRuns
    ? focusRuns
        .split(",")
        .map((s) => s.trim())
        .filter((s) => known.has(s))
    : null;

  return (
    <>
      <CompetitorCard
        score={score}
        measuredRunCount={runCount ?? 0}
        competitors={(competitorRows ?? []) as CompetitorBreakdown[]}
      />

      <AlsoMentionedCard
        alsoMentioned={(entityRows ?? []) as Entity[]}
        profileId={analysis.profile_id}
      />

      {gaps.length > 0 && (
        <div className="card flex flex-col gap-4">
          <span className="mono-label flex items-center gap-1">
            Waar je zichtbaarheid mist
            <InfoHint label="Waar je zichtbaarheid mist">
              De patronen die Aura in de antwoorden terugzag. Klik op een punt om precies de
              metingen te zien waarop die uitspraak rust. Die staan hieronder.
            </InfoHint>
          </span>
          <ul className="flex flex-col gap-3">
            {gaps.map((g, i) => (
              <li
                key={i}
                className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="chip">{g.cluster}</span>
                  {/* Doorklikken naar het bewijs (optimalisatie.md 3.3). Dit
                      stuurde je vroeger naar een ander tabblad; nu filtert het
                      de vragenlijst een stuk lager op dezelfde pagina. */}
                  {g.evidenceRunIds?.length > 0 && (
                    <Link
                      href={`/analyses/${analysis.id}?runs=${g.evidenceRunIds.join(",")}#antwoorden`}
                      className="mono-label underline transition-colors hover:text-[var(--text-primary)]"
                    >
                      {g.evidenceRunIds.length}× aangetoond, toon het bewijs
                    </Link>
                  )}
                </div>
                <p className="text-secondary">{g.problem}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div id="antwoorden" className="scroll-mt-24">
        {answers ? (
          <AnswersView
            rows={answers.rows}
            ownLabel={answers.ownLabel}
            ownTerms={answers.ownTerms}
            focusRunIds={focusRunIds && focusRunIds.length > 0 ? focusRunIds : null}
          />
        ) : (
          <div className="card">
            <p className="text-secondary">
              De letterlijke antwoorden staan hier zodra de meting gedraaid heeft.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
