import Link from "next/link";
import { EntityComparison } from "@/components/entity-comparison";
import { InfoHint } from "@/components/info-hint";
import { confidenceBand, changeIsMeaningful } from "@/lib/stats/uncertainty";
import type { VisibilityScore, CompetitorBreakdown, Entity } from "@/lib/types/database";

/**
 * De score en het concurrentiebeeld (abcplan.md §3.5).
 *
 * Herzien in fase 2 (optimalisatie.md 2.3/2.8/2.10). Wat er toen veranderde:
 *
 *   • ÉÉN hoofdgetal. Er stonden twee cijfers van 6xl naast elkaar — score en
 *     gewogen score — zonder dat duidelijk was welke leidend was. De gewogen
 *     score is nu het hoofdgetal, want die sluit aan bij wat de klant verdient;
 *     de ongewogen score staat er kleiner naast als context.
 *   • De BANDBREEDTE staat er zichtbaar bij. Met 30 vragen is de 95%-band zo'n
 *     ±18 punten. Een getal zonder die band nodigt uit tot conclusies die de
 *     meting niet draagt.
 *   • VERANDERING alleen als het er een is. Een verschil dat binnen de ruis valt
 *     wordt "gelijk gebleven", niet een pijltje omhoog.
 *
 * Sinds het dossier staat dit bestand niet meer als één paneel op één tabblad.
 * Het cijfer hoort bij "hoe sta ik ervoor" (hoofdstuk 01); de vergelijking met
 * concurrenten is een uitkomst van de metingen en hoort bij het bewijs
 * (hoofdstuk 02). Vandaar drie losse exports in plaats van één blok.
 */

/** Hoofdstuk 01 — het cijfer, de marge en de verandering. */
export function ScoreCard({
  score,
  previous,
  measuredRunCount,
}: {
  score: VisibilityScore;
  /** De vorige periode, als die er is — voor de verandering (2.3). */
  previous?: VisibilityScore | null;
  measuredRunCount: number;
}) {
  const lead = score.weighted_score ?? score.score;
  const leadStderr = (score.weighted_score != null ? score.weighted_stderr : score.score_stderr) ?? 0;
  const leadIsWeighted = score.weighted_score != null;
  const band = confidenceBand(lead, leadStderr);

  const previousLead = previous ? (previous.weighted_score ?? previous.score) : null;
  const change =
    previous && previousLead != null
      ? changeIsMeaningful(
          { score: lead, stderr: leadStderr },
          {
            score: previousLead,
            stderr:
              (previous.weighted_score != null ? previous.weighted_stderr : previous.score_stderr) ??
              0,
          },
        )
      : null;

  return (
    <div className="card flex flex-col gap-3">
      <span className="mono-label flex items-center gap-1">
        {leadIsWeighted ? "Gewogen zichtbaarheid" : "Zichtbaarheidsscore"}
        <InfoHint label={leadIsWeighted ? "Gewogen zichtbaarheid" : "Zichtbaarheidsscore"}>
          {leadIsWeighted ? (
            <>
              Van alle vragen die we aan een AI-assistent stelden, in hoeveel word jij genoemd —
              waarbij vaak gestelde en koopklare vragen zwaarder tellen. Gemeten over{" "}
              {score.judged_runs ?? measuredRunCount} vragen.
            </>
          ) : (
            <>
              Van alle vragen die we aan een AI-assistent stelden, in hoeveel word jij genoemd.
              Elke vraag telt even zwaar. Gemeten over {score.judged_runs ?? measuredRunCount}{" "}
              vragen.
            </>
          )}
        </InfoHint>
      </span>

      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <span className="text-6xl font-bold tracking-tight">{Math.round(lead)}</span>
        <span className="mb-2 text-secondary">/ 100</span>
        {band.margin > 0 && (
          <span className="mb-2 flex items-center gap-1 text-sm text-muted">
            ±{band.margin} punten
            <InfoHint label="Waarom een marge?">
              We stellen {score.judged_runs ?? measuredRunCount} vragen, geen duizend. Een andere
              set vragen — of dezelfde vragen op een andere dag — geeft een iets ander getal. De
              echte score ligt naar alle waarschijnlijkheid tussen {band.low} en {band.high}.
            </InfoHint>
          </span>
        )}
      </div>

      <ChangeLine change={change} />

      <p className="text-sm text-secondary">
        {leadIsWeighted
          ? "Zo vaak word jij genoemd als een AI-assistent een relevante vraag krijgt, waarbij vaak gestelde en koopklare vragen zwaarder tellen."
          : "Zo vaak word jij genoemd als een AI-assistent een relevante vraag krijgt — elke vraag telt even zwaar."}
      </p>

      {leadIsWeighted && (
        <div className="flex items-center gap-2 border-t border-[var(--border-subtle)] pt-3 text-sm text-secondary">
          <span>
            Ongewogen (elke vraag telt even zwaar):{" "}
            <span className="font-medium text-[var(--text-primary)]">{Math.round(score.score)}</span>
            {score.score_stderr != null && score.score_stderr > 0 && (
              <span className="text-muted">
                {" "}
                ±{confidenceBand(score.score, score.score_stderr).margin}
              </span>
            )}
          </span>
          <InfoHint label="Twee getallen?">
            Het hoofdgetal weegt mee hoe vaak een vraag gesteld wordt en hoe koopklaar hij is —
            dichter bij wat je eraan verdient. Het ongewogen getal behandelt elke vraag gelijk en
            is makkelijker te vergelijken met een ruwe telling.
          </InfoHint>
        </div>
      )}
    </div>
  );
}

/** Hoofdstuk 02 — jij naast je concurrenten, over dezelfde metingen. */
export function CompetitorCard({
  score,
  measuredRunCount,
  competitors,
}: {
  score: VisibilityScore;
  /**
   * Aantal daadwerkelijke metingen in deze periode — de enige juiste noemer voor
   * de concurrentiepercentages (optimalisatie.md 0.1). Eerder werd hier het
   * HUIDIGE aantal actieve prompts gebruikt, terwijl `mentions_count` uit
   * historische runs komt: zette de klant een prompt uit, dan schoten de balken
   * boven 100%.
   */
  measuredRunCount: number;
  competitors: CompetitorBreakdown[];
}) {
  const rows = [
    { label: "Jij", percent: Math.round(score.score), isOwnBrand: true },
    ...competitors.map((c) => ({
      label: c.competitor_name,
      // Vangnet: ook met de juiste noemer kan een concurrent theoretisch vaker
      // geteld worden dan er runs zijn — dan liever afkappen op 100 dan een
      // onmogelijke balk tonen.
      percent:
        measuredRunCount > 0
          ? Math.min(100, Math.round((c.mentions_count / measuredRunCount) * 100))
          : 0,
      isOwnBrand: false,
    })),
  ];

  return (
    <div className="card flex flex-col gap-4">
      <span className="mono-label flex items-center gap-1">
        Jij vs. concurrenten
        <InfoHint label="Jij vs. concurrenten">
          Het percentage van de {measuredRunCount} gestelde vragen waarin dit merk voorkwam. Meer
          dan één merk kan in hetzelfde antwoord staan, dus de percentages tellen niet op tot 100.
        </InfoHint>
      </span>
      {rows.length > 1 ? (
        <EntityComparison rows={rows} />
      ) : (
        <p className="text-secondary">Geen concurrenten gedetecteerd in deze meting.</p>
      )}
    </div>
  );
}

/** Hoofdstuk 02 — merken die opdoken maar nog niet bevestigd zijn. */
export function AlsoMentionedCard({
  alsoMentioned,
  profileId,
}: {
  /** Nieuw ontdekte merken die nog op bevestiging van de klant wachten (2.5/2.7). */
  alsoMentioned: Entity[];
  profileId: string;
}) {
  if (alsoMentioned.length === 0) return null;

  return (
    <div className="card flex flex-col gap-3">
      <span className="mono-label flex items-center gap-1">
        Ook genoemd
        <InfoHint label="Ook genoemd">
          Merken die in de antwoorden voorkwamen maar die je nog niet als concurrent hebt
          bevestigd. Ze tellen daarom niet mee in je aandeel — een leverancier of een
          vergelijkingssite zou dat cijfer anders vertekenen.
        </InfoHint>
      </span>
      <div className="flex flex-wrap gap-1.5">
        {alsoMentioned.map((e) => (
          <span key={e.id} className="chip" style={{ fontSize: "0.75rem" }}>
            {e.canonical_name}
          </span>
        ))}
      </div>
      <Link href={`/profielen/${profileId}#concurrenten`} className="btn-outline w-fit">
        Concurrenten beheren
      </Link>
    </div>
  );
}

/**
 * De verandering ten opzichte van de vorige meting — of het eerlijke "gelijk
 * gebleven" (optimalisatie.md 2.3).
 *
 * De drempel is niet de band rond één score maar die van het VERSCHIL tussen
 * twee metingen, en die is ruwweg 1,4× breder. Met 30 vragen komt dat neer op
 * zo'n 25 punten. Een pijltje omhoog bij +4 punten is een leugen met een
 * grafiekje eromheen.
 */
function ChangeLine({
  change,
}: {
  change: { changed: boolean; delta: number; threshold: number } | null;
}) {
  if (!change) return null;

  if (!change.changed) {
    return (
      <p className="flex items-center gap-1 text-sm text-secondary">
        <span className="font-medium">Gelijk gebleven</span>
        <span className="text-muted">
          ({change.delta > 0 ? "+" : ""}
          {change.delta} punten)
        </span>
        <InfoHint label="Waarom 'gelijk gebleven'?">
          Het verschil met de vorige meting is {Math.abs(change.delta)} punten, en pas vanaf{" "}
          {change.threshold} punten weten we zeker dat er echt iets veranderd is. Daaronder kan het
          net zo goed toeval zijn.
        </InfoHint>
      </p>
    );
  }

  const up = change.delta > 0;
  return (
    <p className="flex items-center gap-1 text-sm">
      <span
        className="font-medium"
        style={{ color: up ? "var(--status-success)" : "var(--status-error)" }}
      >
        {up ? "▲" : "▼"} {up ? "+" : ""}
        {change.delta} punten
      </span>
      <span className="text-secondary">sinds de vorige meting</span>
      <InfoHint label="Echte verandering">
        Dit verschil is groter dan de {change.threshold} punten die we nodig hebben om toeval uit
        te sluiten. Er is dus echt iets veranderd.
      </InfoHint>
    </p>
  );
}
