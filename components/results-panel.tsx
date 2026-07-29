import Link from "next/link";
import { InfoHint } from "@/components/info-hint";
import type { ResultsSummary } from "@/lib/pipeline/results";
import type { ImpactVerdict } from "@/lib/types/database";

/**
 * Het resultaatpaneel (optimalisatie.md 5.6).
 *
 * Dit is het scherm waarvoor de klant betaalt; alles eromheen is toelichting.
 * Vandaar dat het bovenaan staat zodra er iets gepubliceerd is, en dat het in
 * gewone zinnen praat en niet in maten.
 *
 * De controlegroep staat er expres naast en niet in een uitklapper (5.5).
 * "Je werd vaker genoemd" is geen bewijs dat de pagina werkte — zichtbaarheid
 * beweegt ook vanzelf. "Op de vragen waarvoor je publiceerde +18, op de rest +3"
 * is wél een uitspraak die standhoudt.
 */
const VERDICT: Record<ImpactVerdict, { text: string; className: string }> = {
  gestegen: { text: "Gestegen", className: "chip chip-success" },
  gedaald: { text: "Gedaald", className: "chip chip-danger" },
  gelijk: { text: "Nog gelijk", className: "chip chip-neutral" },
  te_weinig_data: { text: "Nog aan het meten", className: "chip chip-neutral" },
};

export function ResultsPanel({ analysisId, results }: { analysisId: string; results: ResultsSummary }) {
  const { funnel, pieces, totals } = results;
  if (funnel.generated === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {totals && (
        <div className="card card-success flex flex-col gap-3">
          <span className="mono-label flex items-center gap-1">
            Wat het heeft opgeleverd
            <InfoHint label="Wat het heeft opgeleverd">
              We hebben precies de vragen hermeten waarvoor je publiceerde, en tegelijk een groep
              vragen waar je géén pagina voor maakte. Het verschil tussen die twee is wat je
              publicatie heeft gedaan.
            </InfoHint>
          </span>

          <p className="text-lg leading-relaxed">
            Je publiceerde{" "}
            <span className="font-semibold">
              {totals.publishedPages} {totals.publishedPages === 1 ? "pagina" : "pagina's"}
            </span>
            . Op de {totals.targetQuestions} vragen die daarbij horen werd je vóór publicatie{" "}
            <span className="font-semibold">{totals.beforeMentioned}×</span> genoemd, nu{" "}
            <span className="font-semibold">{totals.afterMentioned}×</span>.
          </p>

          {totals.controlDelta != null && (
            <p className="text-sm text-secondary">
              Op de vragen waar je géén pagina voor maakte veranderde de zichtbaarheid met{" "}
              <span className="font-medium text-[var(--text-primary)]">
                {totals.controlDelta > 0 ? "+" : ""}
                {totals.controlDelta} punten
              </span>
              . Dat is de vergelijking die telt: wat er ook zonder jouw pagina&apos;s gebeurd zou zijn.
            </p>
          )}
        </div>
      )}

      <div className="card flex flex-col gap-3">
        <span className="mono-label flex items-center gap-1">
          Van tekst naar resultaat
          <InfoHint label="Van tekst naar resultaat">
            Een tekst die niet gepubliceerd wordt, levert niets op. Blijven er pagina&apos;s steken,
            dan is dát het punt om aan te pakken — niet meer content laten schrijven.
          </InfoHint>
        </span>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <FunnelStep label="Geschreven" value={funnel.generated} />
          <FunnelStep label="Nagekeken" value={funnel.reviewed} of={funnel.generated} />
          <FunnelStep label="Gepubliceerd" value={funnel.published} of={funnel.generated} />
          <FunnelStep label="Effect gemeten" value={funnel.measured} of={funnel.published} />
        </div>

        {funnel.published === 0 && funnel.generated > 0 && (
          <p className="text-sm text-secondary">
            Er staat {funnel.generated === 1 ? "een pagina" : `${funnel.generated} pagina's`} klaar die
            nog niet online {funnel.generated === 1 ? "staat" : "staan"}. Zolang dat zo is, kan er
            niets veranderen aan je zichtbaarheid.{" "}
            <Link href={`/analyses/${analysisId}/bibliotheek`} className="underline">
              Naar je bibliotheek
            </Link>
          </p>
        )}
      </div>

      {pieces.length > 0 && (
        <div className="card flex flex-col gap-3">
          <span className="mono-label">Per pagina</span>
          <ul className="flex flex-col gap-2">
            {pieces.map((p) => (
              <li
                key={p.pieceId}
                className="flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/analyses/${analysisId}/bibliotheek/${p.pieceId}`}
                    className="font-medium hover:underline"
                  >
                    {p.title}
                  </Link>
                  <span className={VERDICT[p.impact?.verdict ?? "te_weinig_data"].className}>
                    {VERDICT[p.impact?.verdict ?? "te_weinig_data"].text}
                  </span>
                </div>

                {p.impact ? (
                  <p className="text-sm text-secondary">
                    Op {p.impact.target_total} {p.impact.target_total === 1 ? "vraag" : "vragen"}:{" "}
                    {p.impact.target_before_mentioned}× genoemd vóór, {p.impact.target_after_mentioned}×
                    nu
                    {p.impact.verdict === "gelijk" && (
                      <>
                        {" "}
                        — dat verschil valt binnen de meetruis ({Math.round(
                          Number(p.impact.delta_threshold ?? 0),
                        )}{" "}
                        punten nodig)
                      </>
                    )}
                    {p.impact.control_total > 0 && (
                      <>
                        . Controlegroep: {p.impact.control_delta! > 0 ? "+" : ""}
                        {p.impact.control_delta} punten
                      </>
                    )}
                    .
                  </p>
                ) : (
                  <p className="text-sm text-muted">
                    Gepubliceerd op{" "}
                    {new Date(p.publishedAt).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "long",
                    })}
                    . We hermeten twee en vier weken later — AI-systemen nemen nieuwe content niet
                    dezelfde dag op.
                  </p>
                )}
              </li>
            ))}
          </ul>

          <Link href={`/api/analyses/${analysisId}/results/export`} className="btn-outline btn-sm w-fit">
            Overzicht downloaden
          </Link>
        </div>
      )}
    </div>
  );
}

function FunnelStep({ label, value, of }: { label: string; value: number; of?: number }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
      <span className="text-2xl font-bold tracking-tight">{value}</span>
      <span className="mono-label" style={{ fontSize: "0.65rem" }}>
        {label}
      </span>
      {/* Het "van" erbij, want 3 gepubliceerd is iets heel anders bij 4 dan bij 12. */}
      {of != null && of > 0 && (
        <span className="text-muted" style={{ fontSize: "0.7rem" }}>
          van {of}
        </span>
      )}
    </div>
  );
}
