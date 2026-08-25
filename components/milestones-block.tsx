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
 * besluit niet. Sinds 25 augustus 2026 verdwijnt het blok in de eerste maand
 * helemaal, want dan zijn die drie nullen het eerste wat een nieuwe klant van
 * het product ziet (`lib/overview.ts`, `isEersteMaand`).
 *
 * ── ⚠️ ÉÉN BAND, GEEN DRIE KAARTEN (25 AUGUSTUS 2026) ───────────────────────
 *
 * Het waren drie losse kaarten met elk een eigen rand. Drie kaders naast elkaar
 * die één ding zeggen, in een scherm dat verderop nog vijf kaders heeft, is
 * precies de kaartinflatie waar `docs/ux-design.md` §1 voor waarschuwt. Nu is
 * het één kaart met twee scheidingslijnen erin: hetzelfde raster, twee randen
 * minder, en de drie getallen lezen als één uitspraak in plaats van als drie
 * losse mededelingen.
 *
 * ⚠️ De kop staat BUITEN de kaart, net als bij elke andere sectie van het
 * overzicht. Hij stond erbinnen, en dat gaf één pagina twee soorten secties.
 *
 * Servercomponent: er is niets interactiefs aan. Dat scheelt de hele
 * client-bundel voor drie getallen.
 */
export function MilestonesBlock({ milestones }: { milestones: Milestone[] }) {
  return (
    <div className="card grid gap-x-6 gap-y-5 p-0 sm:grid-cols-3">
      {milestones.map((m, i) => (
        <div
          key={m.label}
          className={`flex min-w-0 flex-col gap-1 p-5 ${
            // De scheidingslijn hoort tussen de kolommen en niet eromheen: op
            // mobiel staan ze onder elkaar en is het een horizontale lijn, op
            // desktop naast elkaar en is het een verticale.
            i > 0
              ? "border-t border-[var(--border-subtle)] sm:border-l sm:border-t-0"
              : ""
          }`}
        >
          <span className="stat-value text-2xl">{m.waarde}</span>
          <span className="text-sm font-medium">{m.label}</span>
          {m.detail && <span className="text-sm text-muted">{m.detail}</span>}
        </div>
      ))}
    </div>
  );
}
