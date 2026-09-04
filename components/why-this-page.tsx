import Link from "next/link";
import { ExternalLink } from "@/components/external-link";
import { PotentialMetrics } from "@/components/potential-metrics";
import type { PotentialTriple } from "@/lib/potential";
import type { ContentAction, ContentPieceTarget } from "@/lib/types/database";
import type { WriterBrief } from "@/lib/schemas/writer-brief";

/**
 * "Waarom deze pagina" (content-editie, onderdeel 5), naar Nova's "Why This
 * Page Exists?"-paneel (search intent, cluster, funnel level, keywords met
 * volume). Vervangt de eerdere, losse targets-kaart door dezelfde lijst plus
 * de context eromheen die eerder verspreid stond (`target_intent`, `cluster`,
 * de nieuw/verbeteren-status).
 *
 * Puur lay-out van al bestaande, al opgehaalde velden: geen nieuwe query,
 * geen rekenkunde, dus geen eigen unit-test nodig. `potentie` is de enige
 * uitzondering, en die komt al berekend binnen vanuit `loadContentPotential()`
 * (lib/potential-data.ts), om diezelfde reden.
 *
 * ORBIT ENGINE's eigen, betere metriek: Nova toont geschat zoekvolume, ORBIT ENGINE's
 * `targets` bestaan uit ECHT GEMETEN AI-vragen (elke rij hangt via
 * `tracking_run_id` aan een concrete meetronde).
 *
 * ⚠️ Tot 13 augustus stond hier bewust GEEN "wint deze vraag nu al"-percentage:
 * dat zou een nieuwe join vergen die toen niet bestond, en een verzonnen getal
 * zou conventie 3 direct schenden. Die join is er nu (`lib/potential-data.ts`),
 * dus het label staat er nu wel, als onderdeel van de potentiescore
 * (docs/tasks/potentiescore.md), nooit als los, ongefundeerd percentage.
 */
export function WhyThisPage({
  analysisId,
  targets,
  targetIntent,
  cluster,
  action,
  existingUrl,
  potentie,
  opdracht,
}: {
  analysisId: string;
  targets: ContentPieceTarget[];
  targetIntent: string | null;
  cluster: string | null;
  action: ContentAction;
  existingUrl: string | null;
  potentie: PotentialTriple;
  /**
   * De schrijfopdracht waarop deze pagina geschreven is (migratie 0094).
   *
   * `null` bij een pagina van vóór 4 september 2026, en dan verdwijnt het blok
   * vanzelf: een leeg kopje is erger dan geen kopje.
   */
  opdracht: WriterBrief | null;
}) {
  const heeftContext = Boolean(targetIntent || cluster || (action === "verbeteren" && existingUrl));
  const heeftPotentie = potentie.visibility !== null || potentie.volume !== null;
  if (!heeftContext && targets.length === 0 && !heeftPotentie && !opdracht) return null;

  return (
    <div className="card flex flex-col gap-3">
      <span className="mono-label">Waarom deze pagina</span>

      {heeftPotentie && <PotentialMetrics triple={potentie} level="pagina" />}

      {heeftContext && (
        <p className="text-sm text-secondary">
          {targetIntent && (
            <>
              Bedoeld voor: <span className="font-medium text-[var(--text-primary)]">{targetIntent}</span>.{" "}
            </>
          )}
          {cluster && (
            <>
              Onderdeel van het onderwerp{" "}
              <span className="font-medium text-[var(--text-primary)]">{cluster}</span>.{" "}
            </>
          )}
          {action === "verbeteren" && existingUrl && (
            <>
              Vervangt de bestaande pagina <ExternalLink href={existingUrl}>{existingUrl}</ExternalLink>.
            </>
          )}
        </p>
      )}

      {/* De redactionele keuze achter deze tekst (optimalisatie 5 en 6). Dit is
          het enige blok dat zegt waarom juist dit bedrijf de lezer zou helpen,
          en dat is precies de vraag waarop de teksten van 3 september nog geen
          antwoord gaven. */}
      {opdracht && (
        <div className="flex flex-col gap-1.5">
          <span className="mono-label" style={{ fontSize: "0.65rem" }}>
            Voor wie deze tekst geschreven is
          </span>
          <p className="text-sm text-secondary">
            <span className="font-medium text-[var(--text-primary)]">{opdracht.lezer}</span>. Die
            persoon moet na het lezen begrijpen: {opdracht.kernantwoord}
          </p>
          {opdracht.keuzeredenen.length > 0 && (
            <>
              <span className="mono-label" style={{ fontSize: "0.65rem" }}>
                Waarom hij voor jou zou kiezen
              </span>
              <ul className="flex flex-col gap-1">
                {opdracht.keuzeredenen.map((reden) => (
                  <li key={reden.factRef} className="text-sm text-secondary">
                    {reden.reden}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {targets.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="mono-label" style={{ fontSize: "0.65rem" }}>
            Deze pagina moet deze vragen winnen
          </span>
          <ul className="flex flex-col gap-1">
            {targets.map((t) => (
              <li key={t.id} className="text-sm text-secondary">
                &ldquo;{t.prompt_text}&rdquo;
              </li>
            ))}
          </ul>
          <span className="text-sm text-muted">
            Vragen die AI-assistenten écht gesteld zijn, geen geschatte zoekwoorden.
          </span>
          {targets.some((t) => t.tracking_run_id) && (
            <Link
              href={`/analyses/${analysisId}?runs=${targets
                .map((t) => t.tracking_run_id)
                .filter(Boolean)
                .join(",")}`}
              className="mono-label w-fit underline transition-colors hover:text-[var(--text-primary)]"
            >
              Zie wat de AI hier nu antwoordt
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
