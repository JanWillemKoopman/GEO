import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnalysis } from "@/lib/analyses";
import { createClient } from "@/lib/supabase/server";
import { determineStage } from "@/lib/pipeline/stage";
import { EmptyState } from "@/components/empty-state";
import { ReportProgress } from "../report-progress";
import { GenerateButton } from "./generate-button";
import { AuditGate } from "@/components/audit-gate";
import { loadAuditGate } from "@/lib/audit/gate";
import { InfoHint } from "@/components/info-hint";
import { readRecommendations } from "@/lib/pipeline/recommendation";
import { GenerateAllButton } from "./generate-all-button";
import { OffsitePanel } from "./offsite-panel";
import type { Report, OffsiteTask, SourceLandscapeRow } from "@/lib/types/database";

interface ReportGap {
  cluster: string;
  problem: string;
  evidenceRunIds: string[];
}

/**
 * Rapport-tab (abcplan.md §7/§9). Tussen 'gemeten' en 'gereed' toont dit tabblad
 * een korte "wordt opgesteld"-status i.p.v. een lege of foutieve staat.
 */
export default async function RapportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ periode?: string }>;
}) {
  const { id } = await params;
  const { periode } = await searchParams;
  const analysis = await getAnalysis(id);
  if (!analysis) notFound();

  if (analysis.status === "bezig" || analysis.status === "concept_klaar") {
    return (
      <EmptyState title="Nog geen rapport">
        Eerst moet de meting starten. Ga naar het tabblad Overzicht om verder te gaan.
      </EmptyState>
    );
  }

  if (analysis.status === "meten") {
    return (
      <EmptyState title="Meting loopt nog">
        Zodra de meting klaar is, stellen we automatisch het rapport op — geen actie nodig.
      </EmptyState>
    );
  }

  if (analysis.status === "gemeten") {
    return <ReportProgress analysisId={id} />;
  }

  const supabase = await createClient();

  if (analysis.status === "mislukt") {
    const stage = await determineStage(supabase, id);
    if (stage !== "report") {
      return (
        <EmptyState title="Nog geen rapport">
          Er ging iets mis in een eerdere stap. Ga naar het tabblad Overzicht om dit op te lossen.
        </EmptyState>
      );
    }
    return <ReportProgress analysisId={id} initialStatus="mislukt" />;
  }

  // status === "gereed"
  // Rapporten zijn sinds fase 6 een REEKS (6.1/6.8): standaard de nieuwste,
  // maar de klant kan terugkijken. Hij wil kunnen zien wat er stond toen hij
  // die beslissing nam.
  const { data: reportRows } = await supabase
    .from("reports")
    .select("*")
    .eq("analysis_id", id)
    .order("week_no", { ascending: false });

  const reports = (reportRows ?? []) as Report[];
  if (reports.length === 0) {
    return <ReportProgress analysisId={id} />;
  }

  const requested = periode != null ? Number(periode) : null;
  const reportRow =
    (requested != null && reports.find((r) => r.week_no === requested)) || reports[0];

  // Blokkades als poort, niet als voetnoot (optimalisatie.md 3.7). Dit staat
  // bewust bovenaan het rapport: content laten schrijven voor een site die
  // AI-crawlers weigert, is de klant geld laten uitgeven aan niets.
  const gate = await loadAuditGate(supabase, analysis.profile_id);

  // Off-site (optimalisatie.md fase 7): wat er BUITEN de eigen site moet
  // gebeuren. Ander soort werk, andere doorlooptijd, vaak een ander persoon —
  // dus een eigen blok en geen extra regel tussen de aanbevelingen.
  const [{ data: offsiteRows }, { data: landscapeRows }] = await Promise.all([
    supabase.from("offsite_tasks").select("*").eq("analysis_id", id).order("priority"),
    supabase
      .from("source_landscape")
      .select("*")
      .eq("analysis_id", id)
      .order("prompt_count", { ascending: false }),
  ]);

  const report = reportRow as Report;
  const gaps = (report.gaps_json ?? []) as ReportGap[];
  const recommendations = readRecommendations(report.recommendations_json).sort(
    (a, b) => a.priority - b.priority,
  );

  // Welke aanbevelingen zijn al omgezet in een pagina? Alleen de HUIDIGE versie
  // telt (optimalisatie.md 4.7): een oude versie die vervangen is, is geen
  // reden om de knop weg te halen.
  const { data: pieceRows } = await supabase
    .from("content_pieces")
    .select("title, status")
    .eq("analysis_id", id)
    .eq("is_current", true);
  const generatedTitles = new Set(
    (pieceRows ?? []).filter((p) => p.status !== "draft").map((p) => p.title as string),
  );

  return (
    <div className="flex flex-col gap-4">
      <AuditGate blockers={gate.blockers} profileId={analysis.profile_id} since={gate.since} />

      {/* Geschiedenis (optimalisatie.md 6.8). Alleen zichtbaar zodra er iets te
          kiezen valt — één rapport heeft geen kiezer nodig. */}
      {reports.length > 1 && (
        <div className="card flex flex-wrap items-center gap-2">
          <span className="mono-label">Rapport van</span>
          {reports.map((r) => {
            const active = r.id === report.id;
            return (
              <Link
                key={r.id}
                href={`/analyses/${id}/rapport?periode=${r.week_no}`}
                className="chip"
                style={
                  active
                    ? undefined
                    : {
                        background: "transparent",
                        color: "var(--text-muted)",
                        borderColor: "var(--border-subtle)",
                      }
                }
              >
                {r.week_no === 0
                  ? "nulmeting"
                  : new Date(r.generated_at).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "short",
                    })}
              </Link>
            );
          })}
        </div>
      )}

      <div className="card flex flex-col gap-2">
        <span className="mono-label">Samenvatting</span>
        <p className="text-secondary">{report.summary}</p>
      </div>

      {gaps.length > 0 && (
        <div className="card flex flex-col gap-4">
          <span className="mono-label">Waar je zichtbaarheid mist</span>
          <ul className="flex flex-col gap-3">
            {gaps.map((g, i) => (
              <li
                key={i}
                className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="chip">{g.cluster}</span>
                  {/* Doorklikken naar het bewijs (optimalisatie.md 3.3). Deze
                      id's stonden er al, maar werden alleen geteld — nu leiden
                      ze naar de antwoorden waar de uitspraak op rust. */}
                  {g.evidenceRunIds?.length > 0 && (
                    <Link
                      href={`/analyses/${id}/antwoorden?runs=${g.evidenceRunIds.join(",")}`}
                      className="mono-label underline transition-colors hover:text-[var(--text-primary)]"
                    >
                      {g.evidenceRunIds.length}× aangetoond — bekijk het bewijs
                    </Link>
                  )}
                </div>
                <p className="text-secondary">{g.problem}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="card">
          <span className="mono-label">Op je eigen site</span>
          <p className="mt-1 text-sm text-secondary">
            Pagina&apos;s die we voor je kunnen schrijven. Dit doe je zelf en het kan vandaag.
          </p>
        </div>
      )}

      {recommendations.length > 0 && (
        <GenerateAllButton
          analysisId={id}
          total={recommendations.length}
          remaining={recommendations.filter((r) => !generatedTitles.has(r.title)).length}
          blocked={gate.blockers.length > 0}
        />
      )}

      {recommendations.length > 0 && (
        <div className="card flex flex-col gap-4">
          <span className="mono-label flex items-center gap-1">
            Aanbevelingen
            <InfoHint label="Aanbevelingen">
              Elke pagina hieronder is gekoppeld aan de concrete vragen waarop je nu niet genoemd
              wordt. Dat is waar de tekst voor gemaakt wordt — en waaraan we later kunnen meten of
              het gewerkt heeft.
            </InfoHint>
          </span>
          <ul className="flex flex-col gap-3">
            {recommendations.map((r, i) => (
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
                          <a href={r.existingUrl} target="_blank" rel="noopener noreferrer" className="underline">
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
                    vóórdat de klant het vraagt: dit zijn de vragen waarop een
                    AI-assistent hem nu niet noemt. */}
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
                        href={`/analyses/${id}/antwoorden?runs=${r.targets
                          .map((t) => t.runId)
                          .filter(Boolean)
                          .join(",")}`}
                        className="mono-label w-fit underline transition-colors hover:text-[var(--text-primary)]"
                      >
                        Bekijk wat de AI hier nu antwoordt
                      </Link>
                    )}
                  </div>
                )}

                {generatedTitles.has(r.title) ? (
                  <a href={`/analyses/${id}/bibliotheek`} className="btn-outline w-fit">
                    ✓ Al gegenereerd — bekijk in de Bibliotheek
                  </a>
                ) : (
                  <GenerateButton
                    analysisId={id}
                    reportId={report.id}
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
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <OffsitePanel
        analysisId={id}
        initialTasks={(offsiteRows ?? []) as OffsiteTask[]}
        landscape={(landscapeRows ?? []) as SourceLandscapeRow[]}
      />
    </div>
  );
}
