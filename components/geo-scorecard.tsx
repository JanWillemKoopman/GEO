import { InfoHint } from "@/components/info-hint";
import { GEO_CRITERIA_LABELS, type GeoCriteria } from "@/lib/schemas/critique";

/**
 * Zou een AI-assistent deze pagina citeren? (optimalisatie.md 4.5)
 *
 * De redactionele score zei alleen of de tekst lekker las. Deze vijf criteria
 * gaan over iets anders: of het ding waarvoor de pagina gemaakt is, ook echt kan
 * gebeuren. Een tekst kan vlekkeloos zijn en tegelijk volstrekt onciteerbaar.
 *
 * Bewust vijf vinkjes en geen enkel getal. "GEO-score 60" zegt de klant niets;
 * "noemt het bedrijf expliciet: nee" is een concreet gebrek dat hij herkent
 * zodra hij het leest.
 */
const EXPLANATION: Record<keyof GeoCriteria, string> = {
  answersTargetQuestionUpFront:
    "Een AI die een antwoord zoekt, leest de inleiding niet uit. Staat het antwoord pas in alinea drie, dan wordt het niet gevonden.",
  hasStandaloneCitableSentences:
    "AI-assistenten knippen zinnen uit een pagina. Een zin die alleen klopt als je de rest gelezen hebt, is onbruikbaar om te citeren.",
  namesTheBusinessExplicitly:
    "Een model dat 'wij leveren binnen 24 uur' leest, weet niet wie 'wij' is — en noemt je dus niet in het antwoord.",
  usesConcreteFacts:
    "Cijfers, jaartallen en termijnen zijn wat een AI aanhaalt. Algemene beloftes worden overgeslagen.",
  answersFollowUpQuestions:
    "Wie de hoofdvraag én de vervolgvragen beantwoordt, wordt bij meer verschillende vragen genoemd.",
};

export function GeoScorecard({ geo, score }: { geo: GeoCriteria; score: number | null }) {
  const keys = Object.keys(GEO_CRITERIA_LABELS) as (keyof GeoCriteria)[];
  const met = keys.filter((k) => geo[k]).length;

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono-label flex items-center gap-1">
          Vindbaarheid in AI-assistenten
          <InfoHint label="Vindbaarheid in AI-assistenten">
            Of deze tekst goed geschreven is, is één ding. Of een AI-assistent hem kán aanhalen als
            iemand jouw vraag stelt, is iets anders — en daar gaat dit over.
          </InfoHint>
        </span>
        <span className="mono-label">
          {met} van de {keys.length}
          {score != null ? ` · ${score}/100` : ""}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {keys.map((key) => (
          <li key={key} className="flex items-start gap-2 text-sm">
            <span
              aria-hidden
              className="mt-0.5 shrink-0 font-bold"
              style={{ color: geo[key] ? "var(--status-success)" : "var(--status-error)" }}
            >
              {geo[key] ? "✓" : "✕"}
            </span>
            <span className="flex flex-col gap-0.5">
              <span style={{ color: geo[key] ? "var(--text-primary)" : "var(--text-primary)" }}>
                {/* Zelfde kleur voor beide: de kleur zit in het teken ernaast.
                    Identiteit mag nooit alleen op kleur leunen. */}
                {GEO_CRITERIA_LABELS[key]}
                <span className="sr-only">{geo[key] ? " — in orde" : " — nog niet in orde"}</span>
              </span>
              {!geo[key] && <span className="text-muted">{EXPLANATION[key]}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
