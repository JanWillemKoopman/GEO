import type { Milestone } from "@/lib/milestones";

/**
 * Het opbrengstblok: drie getallen op het overzicht van een merk.
 *
 * ── WAAROM DIT BOVEN WATER STAAT EN NIET IN EEN ANALYSESCHERM ───────────────
 *
 * Door besluit 7 (doorlopend opzegbaar) is dit het middel dat
 * opzeggen tegenhoudt. Nova stopt hun `analytics.milestones` weg in het
 * analysescherm; hier staat het op de plek waar de klant sowieso komt. Een blok
 * dat je moet zoeken, werkt niet als het antwoord op de vraag "waar betaal ik
 * eigenlijk voor".
 *
 * ── ⚠️ WEL OP HET OVERZICHT, NIET MEER PAL ONDER HET HOOFDCIJFER ────────────
 *
 * Het stond boven de wachtrij, en in maand 1 zijn alle drie de getallen nul.
 * Drie nullen direct onder een zichtbaarheid van 0% is precies het tegendeel van
 * wat dit blok moet doen. Het staat sinds 24 augustus 2026 bij de verdieping
 * onderaan, op hetzelfde scherm en in dezelfde vorm. De plaats is veranderd, het
 * besluit niet.
 *
 * ⚠️ De kop staat BUITEN de kaart, net als bij elke andere sectie van het
 * overzicht. Hij stond erbinnen, en dat gaf één pagina twee soorten secties.
 *
 * Servercomponent: er is niets interactiefs aan. Dat scheelt de hele
 * client-bundel voor drie getallen.
 */
export function MilestonesBlock({ milestones }: { milestones: Milestone[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {milestones.map((m) => (
        <div key={m.label} className="card flex min-w-0 flex-col gap-1">
          <span className="stat-value text-2xl">{m.waarde}</span>
          <span className="text-sm font-medium">{m.label}</span>
          {m.detail && <span className="text-sm text-muted">{m.detail}</span>}
        </div>
      ))}
    </div>
  );
}
