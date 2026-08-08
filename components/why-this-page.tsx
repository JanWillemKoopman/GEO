import Link from "next/link";
import { ExternalLink } from "@/components/external-link";
import type { ContentAction, ContentPieceTarget } from "@/lib/types/database";

/**
 * "Waarom deze pagina" (content-editie, onderdeel 5), naar Nova's "Why This
 * Page Exists?"-paneel (search intent, cluster, funnel level, keywords met
 * volume). Vervangt de eerdere, losse targets-kaart door dezelfde lijst plus
 * de context eromheen die eerder verspreid stond (`target_intent`, `cluster`,
 * de nieuw/verbeteren-status).
 *
 * Puur lay-out van al bestaande, al opgehaalde velden: geen nieuwe query,
 * geen rekenkunde, dus geen eigen unit-test nodig.
 *
 * Aura's eigen, betere metriek: Nova toont geschat zoekvolume, Aura's
 * `targets` bestaan uit ECHT GEMETEN AI-vragen (elke rij hangt via
 * `tracking_run_id` aan een concrete meetronde). Bewust GEEN "wint deze vraag
 * nu al"-percentage toegevoegd: dat zou een nieuwe join vergen die nu niet
 * bestaat, en een verzonnen getal zou conventie 3 ("onbekend is een betere
 * waarde dan een verkeerde") direct schenden.
 */
export function WhyThisPage({
  analysisId,
  targets,
  targetIntent,
  cluster,
  action,
  existingUrl,
}: {
  analysisId: string;
  targets: ContentPieceTarget[];
  targetIntent: string | null;
  cluster: string | null;
  action: ContentAction;
  existingUrl: string | null;
}) {
  const heeftContext = Boolean(targetIntent || cluster || (action === "verbeteren" && existingUrl));
  if (!heeftContext && targets.length === 0) return null;

  return (
    <div className="card flex flex-col gap-3">
      <span className="mono-label">Waarom deze pagina</span>

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
