import { ExternalLink } from "@/components/external-link";
import { Icon } from "@/components/icon";
import { InfoHint } from "@/components/info-hint";
import { VersionDiff } from "@/components/version-diff";
import type { Improvement } from "@/lib/pipeline/contract-format";

/**
 * "Wat er aan je bestaande pagina verandert"
 * (docs/tasks/paginakeuze-nieuw-of-verbeteren.md O5).
 *
 * ── WAAROM DIT BLOK ER MOEST KOMEN ──────────────────────────────────────────
 *
 * Bijna de helft van wat de app voorstelt is het verbeteren van een pagina die
 * de klant al heeft: 59 van de 129 aanbevelingen over 20 rapporten, nagerekend
 * op 1 september 2026. Wat die klant tot dan toe kreeg, was een vervangende
 * tekst plus de instructie "houd dezelfde URL aan". Nergens stond wat er nu
 * eigenlijk aan schortte, en dus ook niet wat hij zou weggooien als hij die
 * instructie opvolgde.
 *
 * Deze lijst is het antwoord op die vraag, en hij komt uit het contentcontract
 * dat de tekst zelf heeft gestuurd (`contract-format.ts`). Geen tweede bron die
 * kan verouderen: dezelfde lijst die de opdracht gaf, legt hem hier uit.
 *
 * ⚠️ De secties die al goed op de pagina staan gaan bewust MEE in de lijst.
 * "Deze vier dingen blijven zoals ze zijn" is precies de geruststelling die
 * iemand nodig heeft voordat hij zijn eigen pagina overschrijft.
 */
export function ImprovementList({
  improvements,
  samenvatting,
  existingUrl,
  analysisId,
  pieceId,
  heeftHuidigeTekst,
}: {
  improvements: Improvement[];
  samenvatting: string;
  existingUrl: string | null;
  analysisId: string;
  pieceId: string;
  /** Is de tekst van de bestaande pagina bewaard? Zonder dat valt er niets te vergelijken. */
  heeftHuidigeTekst: boolean;
}) {
  if (improvements.length === 0) return null;

  return (
    <div className="card flex flex-col gap-3">
      <span className="mono-label flex items-center gap-1">
        Wat er aan je pagina verandert
        <InfoHint label="Verbeterplan">
          Dit is de vergelijking tussen de pagina zoals hij nu op je site staat en de tekst
          hiernaast. Wat er al goed op stond blijft staan.
        </InfoHint>
      </span>

      {existingUrl && (
        <p className="text-sm text-secondary">
          Gaat over <ExternalLink href={existingUrl}>{existingUrl}</ExternalLink>.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {improvements.map((i) => (
          <li key={i.sectionId} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 shrink-0">
              <Icon
                naam={i.stand === "aanwezig" ? "klaar" : i.stand === "deels" ? "paginabijwerken" : "nieuwepagina"}
                size={14}
              />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-medium text-[var(--text-primary)]">
                {i.heading}
                <span className="ml-2 text-xs font-normal text-muted">
                  {i.stand === "aanwezig"
                    ? "staat er al"
                    : i.stand === "deels"
                      ? "wordt aangevuld"
                      : "is nieuw"}
                </span>
              </span>
              {i.wat && <span className="text-secondary">{i.wat}</span>}
            </span>
          </li>
        ))}
      </ul>

      {samenvatting && <p className="text-sm text-muted">{samenvatting}</p>}

      {heeftHuidigeTekst && (
        <VersionDiff
          analysisId={analysisId}
          pieceId={pieceId}
          previousId="huidige-pagina"
          bron="huidige-pagina"
        />
      )}
    </div>
  );
}
