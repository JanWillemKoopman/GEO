import { InfoHint } from "@/components/info-hint";
import { geoRegels } from "@/lib/pipeline/content-gate";
import { Icon } from "@/components/icon";

/**
 * Zou een AI-assistent deze pagina citeren? (optimalisatie.md 4.5, R8.7)
 *
 * De redactionele score zei alleen of de tekst lekker las. Deze criteria gaan
 * over iets anders: of het ding waarvoor de pagina gemaakt is, ook echt kan
 * gebeuren. Een tekst kan vlekkeloos zijn en tegelijk volstrekt onciteerbaar.
 *
 * Bewust vinkjes en geen enkel getal als hoofdzaak. "GEO-score 60" zegt de klant
 * niets; "noemt het bedrijf expliciet: nee" is een concreet gebrek dat hij
 * herkent zodra hij het leest.
 *
 * Sinds R8.7 komen deze vinkjes uit een DETERMINISTISCHE controle in code en
 * niet meer uit een zelfbeoordeling door het model dat de tekst schreef. Dat
 * verschil is gemeten: in de contentronde van 31 juli gaf de zelfrapportage
 * 100/100 op alle tien de pagina's, óók op de pagina waarvan dezelfde aanroep in
 * z'n eigen verbeterpunten schreef dat de hoofdvraag niet beantwoord werd.
 */
export function GeoScorecard({ geo, score }: { geo: unknown; score: number | null }) {
  const regels = geoRegels(geo);
  // Alleen de uitgevoerde controles tellen mee in "x van de y". Een controle die
  // niet van toepassing was (geen ja-of-nee-vraag, geen onderscheidend antwoord)
  // is geen onvoldoende, onbekend is een betere waarde dan een verkeerde.
  const getoetst = regels.filter((r) => r.ok !== null);
  const geslaagd = getoetst.filter((r) => r.ok).length;

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono-label flex items-center gap-1">
          Citeerbaarheid voor AI-assistenten
          <InfoHint label="Citeerbaarheid voor AI-assistenten">
            Goed geschreven is één ding. Of een AI-assistent deze tekst kán aanhalen als iemand jouw
            vraag stelt, is iets anders. Daar gaat dit over.
          </InfoHint>
        </span>
        <span className="mono-label">
          {geslaagd} van de {getoetst.length}
          {score != null ? ` · ${score}/100` : ""}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {regels.map((regel) => (
          <li key={regel.label} className="flex items-start gap-2 text-sm">
            <span
              aria-hidden
              className="mt-0.5 shrink-0"
              style={{
                color:
                  regel.ok === null
                    ? "var(--text-muted)"
                    : regel.ok
                      ? "var(--status-success)"
                      : "var(--status-error)",
              }}
            >
              <Icon naam={regel.ok === null ? "nvt" : regel.ok ? "klaar" : "mislukt"} />
            </span>
            <span className="flex flex-col gap-0.5">
              {/* Zelfde tekstkleur voor alle drie de toestanden: de betekenis zit
                  in het teken ernaast. Identiteit mag nooit alleen op kleur leunen. */}
              <span>
                {regel.label}
                <span className="sr-only">
                  {regel.ok === null
                    ? ", niet van toepassing"
                    : regel.ok
                      ? ", in orde"
                      : ", nog niet in orde"}
                </span>
              </span>
              {regel.ok === false && <span className="text-muted">{regel.uitleg}</span>}
              {regel.ok === null && (
                <span className="text-muted">
                  Niet van toepassing op deze pagina, dus niet meegeteld.
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
