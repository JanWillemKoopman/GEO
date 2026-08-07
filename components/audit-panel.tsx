import { InfoHint } from "@/components/info-hint";
import type { AuditCheck, AuditSeverity } from "@/lib/audit/technical";
import { formatDateLong } from "@/lib/format";

/**
 * De uitslag van de technische GEO-audit (optimalisatie.md 3B).
 *
 * Volgorde is de boodschap: blokkades bovenaan, dan waarschuwingen, dan wat in
 * orde is. Wie dit scherm opent moet binnen twee seconden weten of er iets aan
 * de hand is, en zo ja, wat en wie het kan oplossen. Vandaar dat bij elke
 * blokkade niet alleen staat wat er mis is, maar ook wat eraan te doen is en bij
 * wie je daarvoor moet zijn; "je robots.txt blokkeert OAI-SearchBot" is voor een
 * ondernemer geen actie maar een raadsel.
 */
const ORDER: Record<AuditSeverity, number> = { blocker: 0, warning: 1, unknown: 2, ok: 3 };

/* De vier badges waren vier inline-stijlen met rauwe rgba, terwijl `.chip-danger`,
   `.chip-warning`, `.chip-neutral` en `.chip-success` in globals.css exact
   hetzelfde doen. Dezelfde drift die ux-design.md §3 al één keer opruimde. */
const BADGE: Record<AuditSeverity, { text: string; chip: string }> = {
  blocker: { text: "Blokkade", chip: "chip-danger" },
  warning: { text: "Aandacht", chip: "chip-warning" },
  unknown: { text: "Onbekend", chip: "chip-neutral" },
  ok: { text: "In orde", chip: "chip-success" },
};

export function AuditPanel({
  checks,
  checkedAt,
  siteUrl,
}: {
  checks: AuditCheck[];
  checkedAt: string | null;
  siteUrl: string | null;
}) {
  const sorted = [...checks].sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  const blockers = sorted.filter((c) => c.severity === "blocker").length;
  const warnings = sorted.filter((c) => c.severity === "warning").length;

  return (
    <div id="techniek" className="card flex scroll-mt-4 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono-label flex items-center gap-1">
          Technische controle
          <InfoHint label="Technische controle">
            Aura kijkt of AI-assistenten je site überhaupt mogen en kunnen lezen. Staat die deur
            dicht, dan heeft content laten schrijven geen zin, want niemand leest hem ooit.
          </InfoHint>
        </span>
        <span className="mono-label">
          {blockers > 0
            ? `${blockers} blokkade${blockers === 1 ? "" : "s"}`
            : warnings > 0
              ? `${warnings} aandachtspunt${warnings === 1 ? "" : "en"}`
              : "alles in orde"}
        </span>
      </div>

      {checkedAt && (
        <p className="text-sm text-muted">
          {siteUrl} · gecontroleerd op{" "}
          {formatDateLong(checkedAt)}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {sorted.map((check) => (
          <li
            key={check.id}
            className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3"
            style={
              check.severity === "blocker"
                ? { borderColor: "var(--intent-danger-border)" }
                : undefined
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{check.label}</span>
              <span className={`chip ${BADGE[check.severity].chip}`}>
                {BADGE[check.severity].text}
              </span>
            </div>
            <p className="text-sm text-secondary">{check.finding}</p>
            {check.fix && (
              <div className="border-t border-[var(--border-subtle)] pt-2 text-sm">
                <p className="text-secondary">
                  <span className="font-medium text-[var(--text-primary)]">Wat er moet gebeuren: </span>
                  {check.fix}
                </p>
                {check.who && <p className="mt-1 text-muted">Wie: {check.who}</p>}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
