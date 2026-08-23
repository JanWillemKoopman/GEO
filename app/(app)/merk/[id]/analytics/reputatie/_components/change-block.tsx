import type { RunComparison } from "@/lib/reputation/compare";
import { compareSentence } from "@/lib/reputation/compare";

/**
 * BLOK 1b · Vergeleken met de vorige meting (§8, sprint R5).
 *
 * ── ⚠️ DIT BLOK MAG SAAI ZIJN ───────────────────────────────────────────────
 *
 * De verleiding bij een tweede meting is een pijltje en een percentage. Die
 * verleiding is precies waarom dit blok bestaat en waarom de zin bovenaan vaak
 * "gelijk gebleven" zal zeggen: een toonindex met een marge van ±5 punten heeft
 * ruwweg 7 punten verschil nodig voordat er iets veranderd is, en de meeste
 * kwartalen halen dat niet. Een klant die drie kwartalen achter elkaar eerlijk
 * "gelijk gebleven" leest en dan één keer "echt beter", gelooft die ene keer.
 *
 * De lijstjes eronder zijn wél altijd interessant, ook zonder cijfermatige
 * verandering: een bezwaar dat nieuw opduikt of een concurrent die erbij komt is
 * een gebeurtenis, geen meetverschil.
 */
export function ChangeBlock({ c, merk }: { c: RunComparison; merk: string }) {
  const heeftLijstjes =
    c.newWeaknesses.length > 0 ||
    c.goneWeaknesses.length > 0 ||
    c.newStrengths.length > 0 ||
    c.newRivals.length > 0 ||
    c.goneRivals.length > 0;

  return (
    <div className="card flex flex-col gap-3">
      <span className="mono-label">Vergeleken met de vorige meting</span>
      <p className="text-secondary">{compareSentence(c, merk)}</p>

      {c.warning && (
        <p className="text-sm text-[var(--status-warning)]" role="note">
          {c.warning}
        </p>
      )}

      {(c.evidenceDelta !== null || c.hitRateDelta !== null) && (
        <div className="flex flex-wrap gap-2">
          {c.evidenceDelta !== null && (
            <span className="chip chip-neutral">
              bewijskracht {c.evidenceDelta > 0 ? "+" : ""}
              {c.evidenceDelta}
            </span>
          )}
          {c.hitRateDelta !== null && (
            <span className="chip chip-neutral">
              genoemd bij koopvragen {c.hitRateDelta > 0 ? "+" : ""}
              {c.hitRateDelta}%
            </span>
          )}
        </div>
      )}

      {heeftLijstjes && (
        <div className="grid gap-3 sm:grid-cols-2">
          {c.newWeaknesses.length > 0 && (
            <Lijst
              kop="Nieuw genoemde bezwaren"
              items={c.newWeaknesses}
              uitleg="Deze bezwaren kwamen vorige keer niet terug en nu wel."
            />
          )}
          {c.goneWeaknesses.length > 0 && (
            <Lijst
              kop="Bezwaren die verdwenen zijn"
              items={c.goneWeaknesses}
              uitleg="Vorige keer kwamen deze terug, nu niet meer."
            />
          )}
          {c.newStrengths.length > 0 && (
            <Lijst
              kop="Nieuw gekoppeld aan je merk"
              items={c.newStrengths}
              uitleg="Hier legt AI nu een verband dat er vorige keer niet was."
            />
          )}
          {c.newRivals.length > 0 && (
            <Lijst
              kop="Nieuwe namen in je markt"
              items={c.newRivals}
              uitleg="Deze bedrijven noemt ChatGPT nu wél als een koper vraagt wie hij moet hebben."
            />
          )}
          {c.goneRivals.length > 0 && (
            <Lijst
              kop="Namen die weg zijn"
              items={c.goneRivals}
              uitleg="Deze bedrijven noemde ChatGPT vorige keer wel en nu niet meer."
            />
          )}
        </div>
      )}

      {/* ⚠️ De scope-kanttekening staat er wel of niet, maar hij wordt nooit
          weggelaten omdat het verhaal er mooier van wordt. Andere diensten
          gemeten betekent een deels andere vraag, en dan is een deel van het
          verschil geen reputatieverschil. */}
      {c.scopeChanged && (
        <p className="text-sm text-muted">
          Er zijn deze keer andere diensten of producten gemeten dan vorige keer, omdat je
          merkprofiel is gewijzigd. Een deel van het verschil komt dus doordat er iets anders
          gevraagd is.
        </p>
      )}
    </div>
  );
}

function Lijst({ kop, items, uitleg }: { kop: string; items: string[]; uitleg: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="mono-label">{kop}</span>
      <ul className="flex flex-col gap-1 text-sm text-secondary">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
      <p className="text-sm text-muted">{uitleg}</p>
    </div>
  );
}
