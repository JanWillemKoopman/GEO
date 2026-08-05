import { InfoHint } from "@/components/info-hint";
import type { AuditCheck, AuditSeverity } from "@/lib/audit/technical";

/**
 * De uitslag van de technische GEO-audit (optimalisatie.md 3B).
 *
 * Volgorde is de boodschap: blokkades bovenaan, dan waarschuwingen, dan wat in
 * orde is. Wie dit scherm opent moet binnen twee seconden weten of er iets aan
 * de hand is — en zo ja, wat en wie het kan oplossen. Vandaar dat bij elke
 * blokkade niet alleen staat wat er mis is, maar ook wat eraan te doen is en bij
 * wie je daarvoor moet zijn; "je robots.txt blokkeert OAI-SearchBot" is voor een
 * ondernemer geen actie maar een raadsel.
 */
const ORDER: Record<AuditSeverity, number> = { blocker: 0, warning: 1, unknown: 2, ok: 3 };

const BADGE: Record<AuditSeverity, { text: string; style: React.CSSProperties }> = {
  blocker: {
    text: "Blokkade",
    style: { background: "rgba(211,58,63,0.1)", color: "#c2282d", borderColor: "rgba(211,58,63,0.3)" },
  },
  warning: {
    text: "Aandacht",
    style: { background: "rgba(240,180,60,0.12)", color: "#8a6100", borderColor: "rgba(240,180,60,0.35)" },
  },
  unknown: {
    text: "Onbekend",
    style: { background: "rgba(11,11,12,0.05)", color: "var(--text-muted)", borderColor: "var(--border-subtle)" },
  },
  ok: {
    text: "In orde",
    style: { background: "rgba(46,158,80,0.1)", color: "#1f7a3d", borderColor: "rgba(46,158,80,0.3)" },
  },
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
            dicht, dan heeft content laten schrijven geen zin — niemand leest hem ooit.
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
          {new Date(checkedAt).toLocaleDateString("nl-NL", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {sorted.map((check) => (
          <li
            key={check.id}
            className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3"
            style={
              check.severity === "blocker" ? { borderColor: "rgba(211,58,63,0.4)" } : undefined
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{check.label}</span>
              <span className="chip" style={BADGE[check.severity].style}>
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
