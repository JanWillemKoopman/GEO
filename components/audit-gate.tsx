import Link from "next/link";
import type { AuditCheck } from "@/lib/audit/technical";
import { formatDateLong } from "@/lib/format";

/**
 * Blokkades als poort, niet als voetnoot (optimalisatie.md 3.7).
 *
 * Dit is bewust een rode balk bóvenaan het rapport en niet een regeltje onderin
 * de technische controle. Een klant die content laat schrijven terwijl zijn site
 * ChatGPT weigert, geeft geld uit aan teksten die nooit gelezen worden, en dat
 * is niet iets wat je meldt op een pagina waar hij misschien komt.
 *
 * De toon is expres feitelijk en niet alarmerend: de klant heeft dit meestal niet
 * zelf gedaan (het staat vaak standaard aan in een thema of een securityplug-in)
 * en het is meestal in vijf minuten opgelost door de webbouwer.
 */
export function AuditGate({
  blockers,
  profileId,
  /** Sinds wanneer de eerste blokkade er is, als we dat weten (3.8). */
  since,
}: {
  blockers: AuditCheck[];
  profileId: string;
  since?: string | null;
}) {
  if (blockers.length === 0) return null;

  return (
    <div
      className="card card-danger flex flex-col gap-3"
      style={{ background: "color-mix(in srgb, var(--intent-danger-solid) 4%, transparent)" }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip chip-danger">
          {blockers.length === 1 ? "Blokkade" : `${blockers.length} blokkades`}
        </span>
        {since && (
          <span className="mono-label">
            al vastgesteld op{" "}
            {formatDateLong(since)}
          </span>
        )}
      </div>

      {/* role="alert" zodat een schermlezer dit aankondigt en het niet visueel-only is. */}
      <h3 className="text-lg font-semibold" role="alert">
        Je website houdt AI-assistenten buiten
      </h3>

      <ul className="flex flex-col gap-2">
        {blockers.map((b) => (
          <li key={b.id} className="text-sm text-secondary">
            <span className="font-medium text-[var(--text-primary)]">{b.label}: </span>
            {b.finding}
            {b.fix && (
              <>
                {" "}
                <span className="text-[var(--text-primary)]">{b.fix}</span>
              </>
            )}
          </li>
        ))}
      </ul>

      <p className="text-sm text-secondary">
        Zolang dit zo staat, kan ChatGPT geen enkele pagina van je citeren. Meestal staat het
        standaard aan in een thema of beveiligingsplug-in, en lost je webbouwer het in een paar
        minuten op.
      </p>

      <Link href={`/profielen/${profileId}/techniek`} className="btn-outline w-fit">
        Bekijk de volledige controle
      </Link>
    </div>
  );
}
