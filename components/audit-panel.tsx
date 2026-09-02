import { InfoHint } from "@/components/info-hint";
import type { AuditCheck, AuditSeverity } from "@/lib/audit/technical";
import { formatDateLong } from "@/lib/format";

/**
 * De uitslag van de technische GEO-audit (optimalisatie.md 3B), sinds
 * 2 september 2026 ingeklapt tot drie groepen (plan analytics-herontwerp.md,
 * Z5).
 *
 * ── WAAROM DIT INGEKLAPT MOEST ──────────────────────────────────────────────
 *
 * Zeventien controles op volle grootte, waarvan er bij de meeste merken twaalf
 * gewoon in orde zijn: twaalf geruststellingen die evenveel ruimte innemen als
 * de vijf die er echt toe doen. Dit paneel toont daarom bovenaan één regel met
 * de stand, en pas bij het openklappen van een groep de controles zelf. Binnen
 * een groep blijft een aandachtspunt volledig zichtbaar; een goedgekeurde
 * controle wordt daar één regel met een vinkje, want daar is verder niets aan
 * te lezen.
 *
 * De drie groepen volgen de vraag die een klant stelt, niet de tabelstructuur
 * erachter: mag een AI-assistent naar binnen, kan hij de tekst lezen, en weet
 * hij wie hier zit. `groepVoorCheck()` is het enige dat een check-id aan een
 * groep koppelt; nieuwe controles vallen zonder aanpassing terug op "Mogen
 * AI-assistenten je site lezen", de groep met de minste aannames.
 */
type Groep = "toegang" | "begrijpen" | "identiteit";

const GROEP_LABEL: Record<Groep, string> = {
  toegang: "Mogen AI-assistenten je site lezen",
  begrijpen: "Kunnen ze je tekst begrijpen",
  identiteit: "Weten ze wie je bent",
};

const BEGRIJPEN_IDS = new Set(["no-js-content", "structured-data", "sitemap", "llms-txt"]);

function groepVoorCheck(id: string): Groep {
  if (id.startsWith("entity.")) return "identiteit";
  if (BEGRIJPEN_IDS.has(id)) return "begrijpen";
  // crawler.*, bing-index, en elke toekomstige controle die niet expliciet
  // hierboven staat: de veiligste aanname is "gaat over toegang".
  return "toegang";
}

const ORDER: Record<AuditSeverity, number> = { blocker: 0, warning: 1, unknown: 2, ok: 3 };

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
  const inOrde = checks.filter((c) => c.severity === "ok").length;

  const groepen: { groep: Groep; checks: AuditCheck[] }[] = (["toegang", "begrijpen", "identiteit"] as Groep[])
    .map((groep) => ({
      groep,
      checks: checks
        .filter((c) => groepVoorCheck(c.id) === groep)
        .sort((a, b) => ORDER[a.severity] - ORDER[b.severity]),
    }))
    .filter((g) => g.checks.length > 0);

  return (
    <div id="techniek" className="card flex scroll-mt-4 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono-label flex items-center gap-1">
          Technische controle
          <InfoHint label="Technische controle">
            ORBIT ENGINE kijkt of AI-assistenten je site überhaupt mogen en kunnen lezen. Staat die deur
            dicht, dan heeft content laten schrijven geen zin, want niemand leest hem ooit.
          </InfoHint>
        </span>
      </div>

      {checkedAt && (
        <p className="text-sm text-muted">
          {siteUrl} · gecontroleerd op {formatDateLong(checkedAt)}
        </p>
      )}

      {/* ── De ene regel (Z5) ────────────────────────────────────────────── */}
      <p className="font-medium">
        {inOrde} van de {checks.length} controles in orde
      </p>
      <div className="flex flex-wrap gap-2">
        {groepen.map(({ groep, checks: groepChecks }) => {
          const aandacht = groepChecks.filter((c) => c.severity !== "ok").length;
          return (
            <span
              key={groep}
              className={`chip ${aandacht > 0 ? (groepChecks.some((c) => c.severity === "blocker") ? "chip-danger" : "chip-warning") : "chip-success"}`}
            >
              {aandacht > 0 ? `${aandacht} bij ${GROEP_LABEL[groep].toLowerCase()}` : `${GROEP_LABEL[groep]}: in orde`}
            </span>
          );
        })}
      </div>

      {/* ── De drie groepen, elk uitklapbaar ─────────────────────────────── */}
      <div className="flex flex-col gap-2">
        {groepen.map(({ groep, checks: groepChecks }) => {
          const aandachtspunten = groepChecks.filter((c) => c.severity !== "ok");
          const goedgekeurd = groepChecks.filter((c) => c.severity === "ok");
          return (
            <details key={groep} className="rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
              <summary className="flex cursor-pointer items-center justify-between gap-2 p-3 text-sm font-medium">
                <span>{GROEP_LABEL[groep]}</span>
                <span className="mono-label text-muted">
                  {groepChecks.length - aandachtspunten.length} van de {groepChecks.length} in orde
                </span>
              </summary>
              <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] p-3">
                {aandachtspunten.map((check) => (
                  <div
                    key={check.id}
                    className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3"
                    style={check.severity === "blocker" ? { borderColor: "var(--intent-danger-border)" } : undefined}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{check.label}</span>
                      <span className={`chip ${BADGE[check.severity].chip}`}>{BADGE[check.severity].text}</span>
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
                  </div>
                ))}
                {goedgekeurd.map((check) => (
                  <div key={check.id} className="flex items-center justify-between gap-2 py-0.5 text-sm">
                    <span>{check.label}</span>
                    <span className="chip chip-success">✓ in orde</span>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
