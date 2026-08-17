import type { Milestone } from "@/lib/milestones";

/**
 * Het opbrengstblok: drie getallen, bovenaan het merkdossier.
 *
 * ── WAAROM DIT BOVENAAN STAAT EN NIET IN EEN ANALYSESCHERM ──────────────────
 *
 * Door besluit 7 (doorlopend opzegbaar) is dit het middel dat
 * opzeggen tegenhoudt. Nova stopt hun `analytics.milestones` weg in het
 * analysescherm; hier staat het op de plek waar de klant sowieso komt. Een blok
 * dat je moet zoeken, werkt niet als het antwoord op de vraag "waar betaal ik
 * eigenlijk voor".
 *
 * Servercomponent: er is niets interactiefs aan. Dat scheelt de hele
 * client-bundel voor drie getallen.
 */
export function MilestonesBlock({ milestones }: { milestones: Milestone[] }) {
  return (
    <section
      className="card flex flex-col gap-4"
      aria-label="Wat dit tot nu toe opleverde"
    >
      <span className="mono-label">Wat dit tot nu toe opleverde</span>
      <div className="grid gap-4 sm:grid-cols-3">
        {milestones.map((m) => (
          <div key={m.label} className="flex min-w-0 flex-col gap-1">
            <span className="stat-value text-2xl">{m.waarde}</span>
            <span className="text-sm font-medium">{m.label}</span>
            {m.detail && <span className="text-sm text-muted">{m.detail}</span>}
          </div>
        ))}
      </div>
    </section>
  );
}
