import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuditGate } from "@/components/audit-gate";
import { loadAuditGate } from "@/lib/audit/gate";
import { InfoHint } from "@/components/info-hint";
import { PotentialInline } from "@/components/potential-metrics";
import { loadRecommendationPotential } from "@/lib/potential-data";
import { readRecommendations, describeActionRatio } from "@/lib/pipeline/recommendation";
import { leesbaarWaarom } from "@/lib/recommendation-text";
import { STATUS_LABEL, STATUS_CHIP } from "@/lib/content-status";
import { GenerateButton } from "../_work/generate-button";
import { GenerateAllButton } from "../_work/generate-all-button";
import { OffsitePanel } from "../_work/offsite-panel";
import { FactRequests } from "@/app/(app)/merk/[id]/_components/fact-requests";
import { publicFactRequest } from "@/lib/fact-request-public";
import type { Analysis, OffsiteTask, Report, SourceLandscapeRow } from "@/lib/types/database";

interface ReportGap {
  cluster: string;
  problem: string;
  evidenceRunIds: string[];
}

/**
 * HET CLUSTERSCHERM, als één tabblad in plaats van vier hoofdstukken.
 *
 * ── VAN VIER HOOFDSTUKKEN NAAR ÉÉN SCHERM (16 september 2026) ───────────────
 *
 * Op verzoek van de eigenaar: alle cijfers over hoe het cluster ervoor staat
 * (de zichtbaarheidsscore, de trendlijn, de concurrentietabellen, de letterlijke
 * antwoorden) staan al, of komen te staan, onder Analytics
 * (`/merk/[id]/analytics`, met een cluster-filter). Dit scherm is er niet om dat
 * cijferbeeld te herhalen; het is de plek waar een meting content wordt: een
 * korte samenvatting, de kansen die eruit volgen, en de pagina's die daarvoor
 * klaarstaan of al onderweg zijn, met hun status en hun potentiescore.
 *
 * `git log` op `_chapters/stand.tsx`, `bewijs.tsx` en `resultaat.tsx` heeft de
 * oude vier-hoofdstukken-indeling (26 augustus 2026) als het ooit terug moet.
 * De blokkade-poort en de aanbevelingenlijst hieronder zijn ongewijzigd
 * overgenomen uit het toenmalige hoofdstuk 03 ("Wat je moet doen"): dat was al
 * de handelingslaag, en dat is precies wat hier overblijft.
 *
 * ── WAT HIER WEL EN NIET STAAT ───────────────────────────────────────────────
 *
 * De potentiescore blijft hier wél staan, ook al is hij een cijfer: hij is nodig
 * om te kiezen wát je laat schrijven, niet om te lezen hoe het cluster ervoor
 * staat. Zie `docs/logbook.md`, 16 september 2026.
 */
export async function InhoudChapter({ analysis }: { analysis: Analysis }) {
  const supabase = await createClient();

  const [gate, { data: reportRow }, { data: offsiteRows }, { data: landscapeRows }, { data: factRows }, { data: pieceRows }] =
    await Promise.all([
      loadAuditGate(supabase, analysis.profile_id),
      // Het nieuwste rapport levert de samenvatting, de kansen en de
      // aanbevelingen. Geen periodekiezer meer: dit scherm toont altijd de
      // actuele stand, de geschiedenis staat op Analytics.
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
      supabase
        .from("fact_requests")
        .select("*")
        .eq("analysis_id", analysis.id)
        .in("status", ["open", "beantwoord"])
        .order("created_at"),
      supabase
        .from("content_pieces")
        .select("id, title, status, needs_review")
        .eq("analysis_id", analysis.id)
        .eq("is_current", true),
    ]);

  const report = reportRow as Report | null;
  const gaps = ((report?.gaps_json ?? []) as ReportGap[]).map((g) => g.problem);

  if (!report) {
    return (
      <div className="flex flex-col gap-6">
        <AuditGate blockers={gate.blockers} profileId={analysis.profile_id} since={gate.since} />
        <div className="card flex flex-col gap-2">
          <span className="mono-label">Nog geen resultaat</span>
          <p className="text-secondary">
            Zodra de eerste meting klaar is, staat hier een korte samenvatting en de pagina&apos;s die
            ORBIT ENGINE voorstelt. De cijfers achter die meting staan straks op{" "}
            <Link href={`/merk/${analysis.profile_id}/analytics`} className="underline">
              Analytics
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  const recommendations = readRecommendations(report.recommendations_json).sort(
    (a, b) => a.priority - b.priority,
  );

  // Elke aanbeveling naast zijn eigen pagina, op titel: dezelfde koppeling die
  // hoofdstuk 03 altijd al maakte, nu voor ALLE aanbevelingen en niet alleen
  // de openstaande, want de klant moet hier ook zien wat al klaar is.
  const pieces = (pieceRows ?? []) as { id: string; title: string; status: string; needs_review: boolean }[];
  const pieceByTitle = new Map(pieces.map((p) => [p.title, p]));
  const openRecommendations = recommendations.filter((r) => !pieceByTitle.has(r.title));

  const admin = createAdminClient();
  const potenties = await Promise.all(
    recommendations.map((r) => loadRecommendationPotential(admin, analysis.id, r.targets.map((t) => t.promptId))),
  );

  return (
    <div className="flex flex-col gap-8">
      <AuditGate blockers={gate.blockers} profileId={analysis.profile_id} since={gate.since} />

      {/* ── Korte samenvatting: wat de meting zegt, en welke kansen eruit volgen.
          Geen cijfer, geen bewijslink: dat staat op Analytics. Alleen de
          conclusie in gewone taal. */}
      {(report.summary || gaps.length > 0) && (
        <div className="card flex flex-col gap-3">
          <span className="mono-label flex items-center gap-1">
            Wat dit cluster laat zien
            <InfoHint label="Waar komt dit vandaan?">
              De conclusie van de laatste meting van dit cluster. De cijfers erachter (je
              zichtbaarheidsscore, de trend, wie er nog meer genoemd wordt) staan op Analytics.
            </InfoHint>
          </span>
          {report.summary && <p className="text-secondary">{report.summary}</p>}
          {gaps.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {gaps.map((problem, i) => (
                <li key={i} className="flex gap-2 text-sm text-secondary">
                  <span aria-hidden>·</span>
                  {problem}
                </li>
              ))}
            </ul>
          )}
          <Link
            href={`/merk/${analysis.profile_id}/analytics?cluster=${analysis.id}`}
            className="mono-label w-fit underline transition-colors hover:text-[var(--text-primary)]"
          >
            Bekijk de cijfers van dit cluster op Analytics
          </Link>
        </div>
      )}

      {/* Vragen die uit déze analyse kwamen (optimalisatie.md 4.6). */}
      {(factRows ?? []).length > 0 && (
        // T8.9: `factRows` komt uit `select("*")` en bevat `raw_json` (het
        // volledige ruwe antwoord van OpenAI, audit-trail conventie 8). Dat
        // veld gaat als prop mee de RSC-payload in als we de rij ongefilterd
        // doorgeven, dus ook een server component moet dit filteren.
        <FactRequests
          profileId={analysis.profile_id}
          initial={(factRows ?? []).map((r) => publicFactRequest(r as Record<string, unknown>))}
        />
      )}

      {/* ── Voorgestelde en geschreven pagina's, met status en potentiescore ── */}
      {recommendations.length > 0 && (
        <div className="card flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="mono-label flex items-center gap-1">
              Pagina&apos;s voor dit cluster
              <InfoHint label="Waar komen deze vandaan?">
                Elke pagina hieronder hangt aan concrete vragen waarop je nu niet genoemd wordt.
                Daar wordt de tekst voor gemaakt, en daaraan meet ORBIT ENGINE later of het gewerkt
                heeft.
              </InfoHint>
            </span>
            {describeActionRatio(recommendations) && (
              <p className="text-sm text-muted">{describeActionRatio(recommendations)}</p>
            )}
          </div>

          {openRecommendations.length > 0 && (
            <GenerateAllButton
              analysisId={analysis.id}
              total={recommendations.length}
              remaining={openRecommendations.length}
              blocked={gate.blockers.length > 0}
            />
          )}

          <ul className="flex flex-col gap-3">
            {recommendations.map((r, i) => {
              const piece = pieceByTitle.get(r.title) ?? null;
              const statusLabel = piece ? (STATUS_LABEL[piece.status] ?? piece.status) : "Nog niet geschreven";
              const statusChip = piece ? (STATUS_CHIP[piece.status] ?? "chip chip-neutral") : "chip chip-neutral";

              return (
                <li
                  key={i}
                  className="flex flex-col gap-2 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{r.title}</span>
                    <span className="flex items-center gap-1.5">
                      <span className="chip chip-green">{r.type}</span>
                      <span className={statusChip}>{statusLabel}</span>
                    </span>
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
                              className="break-url underline"
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

                  {r.action !== "verbeteren" && r.relatedUrl && (
                    <p className="text-sm text-secondary">
                      Je hebt al een pagina over dit onderwerp:{" "}
                      <a
                        href={r.relatedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-url underline"
                      >
                        {r.relatedUrl}
                      </a>
                      . Deze nieuwe pagina moet duidelijk iets anders doen, anders vragen ze allebei
                      dezelfde aandacht.
                    </p>
                  )}

                  <PotentialInline triple={potenties[i]} />

                  {leesbaarWaarom(r.why) && <p className="text-sm text-secondary">{leesbaarWaarom(r.why)}</p>}

                  {piece ? (
                    <Link
                      href={`/analyses/${analysis.id}/bibliotheek/${piece.id}`}
                      className="mono-label w-fit underline transition-colors hover:text-[var(--text-primary)]"
                    >
                      Naar deze pagina
                    </Link>
                  ) : (
                    <GenerateButton
                      analysisId={analysis.id}
                      reportId={report.id}
                      blocked={gate.blockers.length > 0}
                      recommendation={{
                        title: r.title,
                        type: r.type,
                        targetIntent: r.targetIntent,
                        why: r.why,
                        action: r.action,
                        existingUrl: r.existingUrl,
                        relatedUrl: r.relatedUrl,
                        targets: r.targets,
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Off-site is ander werk: een pagina schrijf je vanmiddag, op een
          platform komen te staan kan weken duren en gaat vaak via iemand
          anders. */}
      <div id="offsite" className="scroll-mt-[calc(var(--header-h)+4rem)]">
        <OffsitePanel
          analysisId={analysis.id}
          initialTasks={(offsiteRows ?? []) as OffsiteTask[]}
          landscape={(landscapeRows ?? []) as SourceLandscapeRow[]}
        />
      </div>
    </div>
  );
}
