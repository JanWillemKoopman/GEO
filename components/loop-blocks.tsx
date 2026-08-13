import Link from "next/link";
import type { Insight } from "@/lib/insights";
import { shareLabel, type Opportunity } from "@/lib/opportunities";
import { potentialBand, POTENTIAL_BAND_LABEL } from "@/lib/potential";

/**
 * De twee blokken van fase 6: wat er gebeurde, en waar je begint.
 *
 * Servercomponenten, want er valt niets te klikken behalve links. Dat scheelt
 * de hele client-bundel voor tekst.
 */

const TOON_KLEUR: Record<Insight["toon"], string> = {
  goed: "var(--intent-growth-text)",
  let_op: "var(--intent-warning-text)",
  neutraal: "var(--text-secondary)",
};

const POTENTIAL_CHIP_TONE: Record<ReturnType<typeof potentialBand>, string> = {
  hoog: "chip-success",
  gemiddeld: "chip-info",
  beperkt: "chip-neutral",
  onbekend: "chip-neutral",
};

/**
 * Drie zinnen bovenaan: wat er gebeurde, wat dat betekent, wat nu.
 *
 * Geen kop met een getal erin en geen grafiek. `docs/Nova.md` §7 fase 6 vraagt
 * om "drie zinnen die zeggen wat er deze maand gebeurde en wat de volgende stap
 * is", en dat is precies zoveel als iemand leest voordat hij doorklikt.
 */
export function InsightsBlock({ insights }: { insights: Insight[] }) {
  return (
    <section className="card flex flex-col gap-2" aria-label="Wat er deze maand gebeurde">
      <span className="mono-label">Wat er deze maand gebeurde</span>
      <ul className="flex flex-col gap-1.5">
        {insights.map((i, n) => (
          <li key={n} className="flex gap-2 text-sm">
            <span aria-hidden style={{ color: TOON_KLEUR[i.toon] }}>
              •
            </span>
            <span style={{ color: i.toon === "neutraal" ? undefined : TOON_KLEUR[i.toon] }}>
              {i.text}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Alle kansen op één rij, met de handeling erbij.
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * Adviezen zaten verspreid over het rapport, de onderwerpenlijst en de
 * technische audit. Elk daarvan is op zichzelf te volgen, maar samen
 * beantwoordden ze de enige vraag die de klant echt stelt niet: waar begin ik.
 */
export function OpportunitiesBlock({
  opportunities,
  limiet = 6,
}: {
  opportunities: Opportunity[];
  /** Meer dan zes kansen leest niemand in één keer. */
  limiet?: number;
}) {
  if (opportunities.length === 0) {
    return (
      <p className="text-secondary">
        Er staat op dit moment niets open. De volgende meetronde levert vanzelf
        nieuwe kansen op.
      </p>
    );
  }

  const zichtbaar = opportunities.slice(0, limiet);
  const rest = opportunities.length - zichtbaar.length;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {zichtbaar.map((o) => {
          // Fase 2, docs/tasks/potentiescore.md: de potentiescore is
          // vergelijkbaar over alle onderwerpen van dit merk en gaat daarom
          // voor. `share` is het vangnet zolang dit merk nog geen enkele
          // profielbrede herberekening had.
          const band = potentialBand(o.potential);
          const omvang = shareLabel(o.share);
          return (
            <li key={o.id} className="card flex flex-col gap-1">
              <span className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium">{o.title}</span>
                {o.potential !== null ? (
                  <span className={`chip ${POTENTIAL_CHIP_TONE[band]}`}>
                    Potentie {o.potential}/100 ({POTENTIAL_BAND_LABEL[band].replace(" potentie", "")})
                  </span>
                ) : (
                  omvang && <span className="chip chip-info">{omvang}</span>
                )}
              </span>
              <span className="text-sm text-muted">{o.why}</span>
              <span className="flex flex-wrap items-center gap-2 pt-1 text-sm">
                <span className="font-medium">{o.action}</span>
                {o.href && (
                  <Link href={o.href} className="text-secondary hover:underline">
                    Ga erheen
                  </Link>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {rest > 0 && (
        <p className="text-sm text-muted">
          En nog {rest} {rest === 1 ? "kans" : "kansen"}, met een kleiner of
          onbekend effect.
        </p>
      )}
    </div>
  );
}
