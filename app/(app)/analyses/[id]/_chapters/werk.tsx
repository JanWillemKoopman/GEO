import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { WorkList } from "@/components/work-list";
import type { WorkItem } from "@/lib/work";
import { AuditGate } from "@/components/audit-gate";
import { loadAuditGate } from "@/lib/audit/gate";
import { InfoHint } from "@/components/info-hint";
import { readRecommendations } from "@/lib/pipeline/recommendation";
import { GenerateButton } from "../_work/generate-button";
import { GenerateAllButton } from "../_work/generate-all-button";
import { OffsitePanel } from "../_work/offsite-panel";
import type { Analysis, OffsiteTask, Report, SourceLandscapeRow } from "@/lib/types/database";

/**
 * Hoofdstuk 03, "Wat je nu moet doen".
 *
 * ── ZES SOORTEN WERK OP ZES BESTEMMINGEN ────────────────────────────────────
 *
 * Het werk van één analyse lag verspreid over vier schermen en twee secties van
 * de app: blokkades op het merkscherm, klaarliggende pagina's in de bibliotheek,
 * off-site punten onderaan het rapport, feitenvragen weer op dat merkscherm. Het
 * dashboard was de enige plek die het bij elkaar bracht, en zodra je erop
 * klikte, spatte je uiteen.
 *
 * Hier staat het bij elkaar, in vier lagen die elk hun eigen rol hebben:
 *
 *   1. De blokkade-poort. Content laten schrijven voor een site die AI-crawlers
 *      weigert, is de klant geld laten uitgeven aan niets, dus staat dit boven
 *      alles en niet als voetnoot eronder (optimalisatie.md 3.7).
 *   2. De werklijst: de index van álles, gegroepeerd op staat. Elke regel wijst
 *      naar de plek waar je het doet.
 *   3. Nieuwe pagina's laten schrijven, hier ontstaat nieuw werk.
 *   4. Het off-site blok: waar je de punten van buiten je site afvinkt.
 */
export async function WerkChapter({
  analysis,
  work,
}: {
  analysis: Analysis;
  /**
   * Al opgehaald door de pagina, want de rail heeft de telling nodig om te
   * kunnen tonen dat hier iets op je wacht. Doorgeven in plaats van opnieuw
   * ophalen: dezelfde vijf queries twee keer draaien is puur verlies.
   */
  work: WorkItem[];
}) {
  const supabase = await createClient();

  const [gate, { data: reportRow }, { data: offsiteRows }, { data: landscapeRows }] =
    await Promise.all([
      loadAuditGate(supabase, analysis.profile_id),
      // Het nieuwste rapport levert de aanbevelingen; oudere aanbevelingen zijn
      // achterhaald zodra er opnieuw gemeten is.
      supabase
        .from("reports")
        .select("*")
        .eq("analysis_id", analysis.id)
        .order("week_no", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("offsite_tasks").select("*").eq("analysis_id", analysis.id).order("priority"),
      supabase
        .from("source_landscape")
        .select("*")
        .eq("analysis_id", analysis.id)
        .order("prompt_count", { ascending: false }),
    ]);

  const report = reportRow as Report | null;
  const recommendations = report
    ? readRecommendations(report.recommendations_json).sort((a, b) => a.priority - b.priority)
    : [];

  // Welke aanbevelingen zijn al omgezet in een pagina? Alleen de HUIDIGE versie
  // telt (optimalisatie.md 4.7): een oude versie die vervangen is, is geen reden
  // om de knop weg te halen.
  const { data: pieceRows } = await supabase
    .from("content_pieces")
    .select("title, status")
    .eq("analysis_id", analysis.id)
    .eq("is_current", true);
  const generatedTitles = new Set(
    (pieceRows ?? []).filter((p) => p.status !== "draft").map((p) => p.title as string),
  );
  const openRecommendations = recommendations.filter((r) => !generatedTitles.has(r.title));

  return (
    <>
      <AuditGate blockers={gate.blockers} profileId={analysis.profile_id} since={gate.since} />

      <WorkList items={work} />

      {openRecommendations.length > 0 && (
        <div className="card flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="mono-label flex items-center gap-1">
              Pagina&apos;s die Aura voor je schrijft
              <InfoHint label="Waar komen deze vandaan?">
                Elke pagina hieronder hangt aan concrete vragen waarop je nu niet genoemd wordt.
                Daar wordt de tekst voor gemaakt, en daaraan meet Aura later of het gewerkt heeft.
              </InfoHint>
            </span>
            <p className="text-sm text-secondary">
              Dit kan vandaag. Zodra een pagina geschreven is, staat hij hierboven in de lijst en in
              je bibliotheek klaar om na te lezen.
            </p>
          </div>

          <GenerateAllButton
            analysisId={analysis.id}
            total={recommendations.length}
            remaining={openRecommendations.length}
            blocked={gate.blockers.length > 0}
          />

          <ul className="flex flex-col gap-3">
            {openRecommendations.map((r, i) => (
              <li
                key={i}
                className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{r.title}</span>
                  <span className="chip chip-green">{r.type}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {r.action === "verbeteren" ? (
                    <span className="chip">
                      Verbeter bestaande pagina
                      {r.existingUrl && (
                        <>
                          {": "}
                          <a
                            href={r.existingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            {r.existingUrl}
                          </a>
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="chip">Nieuwe pagina</span>
                  )}
                </div>

                <p className="text-sm text-secondary">{r.why}</p>

                {/* Aanbevelingen met bewijs erbij (optimalisatie.md 4.11).
                    "Waarom zou ik deze pagina maken" is hiermee beantwoord
                    vóórdat de klant het vraagt. De doorklik blijft nu op deze
                    pagina: hij filtert de vragenlijst in hoofdstuk 02. */}
                {r.targets.length > 0 && (
                  <div className="flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
                    <span className="mono-label" style={{ fontSize: "0.65rem" }}>
                      Deze pagina moet deze vragen winnen
                    </span>
                    <ul className="flex flex-col gap-1">
                      {r.targets.map((t, ti) => (
                        <li key={ti} className="text-sm text-secondary">
                          &ldquo;{t.text}&rdquo;
                        </li>
                      ))}
                    </ul>
                    {r.targets.some((t) => t.runId) && (
                      <Link
                        href={`/analyses/${analysis.id}?runs=${r.targets
                          .map((t) => t.runId)
                          .filter(Boolean)
                          .join(",")}#antwoorden`}
                        className="mono-label w-fit underline transition-colors hover:text-[var(--text-primary)]"
                      >
                        Zie wat de AI hier nu antwoordt
                      </Link>
                    )}
                  </div>
                )}

                <GenerateButton
                  analysisId={analysis.id}
                  reportId={report!.id}
                  blocked={gate.blockers.length > 0}
                  recommendation={{
                    title: r.title,
                    type: r.type,
                    targetIntent: r.targetIntent,
                    why: r.why,
                    action: r.action,
                    existingUrl: r.existingUrl,
                    targets: r.targets,
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Off-site is ander werk: een pagina schrijf je vanmiddag, op een
          platform komen te staan kan weken duren en gaat vaak via iemand
          anders. De werklijst hierboven wijst hiernaartoe; hier vink je af. */}
      <div id="offsite" className="scroll-mt-24">
        <OffsitePanel
          analysisId={analysis.id}
          initialTasks={(offsiteRows ?? []) as OffsiteTask[]}
          landscape={(landscapeRows ?? []) as SourceLandscapeRow[]}
        />
      </div>
    </>
  );
}
