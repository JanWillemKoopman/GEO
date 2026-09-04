import { vloeiendPad } from "@/lib/chart-curve";

/**
 * Een lijntje van een handvol punten, zonder assen.
 *
 * ── WAAROM DIT BESTAAT NAAST `TrendChart` ───────────────────────────────────
 *
 * `TrendChart` is de volle grafiek van één cluster: assen, concurrentlijnen,
 * publicatiemarkeringen, hover. Op Analytics staat een tabel met een regel per
 * cluster, en daar past die grafiek acht keer onder elkaar niet in. Wat er wél
 * moet staan is de vorm van het verloop: klimt het, zakt het, of ligt het stil.
 *
 * `docs/ux-design.md` §7 noemt dit ook als de mobiele variant van een grafiek:
 * kernwaarde plus sparkline. Hier is het allebei tegelijk, want het cijfer staat
 * ernaast in dezelfde regel.
 *
 * ── GEEN AS, DUS GEEN GETAL ─────────────────────────────────────────────────
 *
 * Een sparkline zonder as kan geen waarde aflezen, en dat is precies de
 * bedoeling: hij toont de richting, het getal ernaast toont de stand. Wie de
 * cijfers per periode wil, klikt door naar het cluster.
 *
 * De schaal is vast 0 tot 100, net als bij `TrendChart`. De score ís een
 * percentage, en een meeschalende y-as maakt van een verschil van drie punten
 * een dramatische klim.
 *
 * ── GEEN ASLABEL, OM DEZELFDE REDEN (3 september 2026) ──────────────────────
 *
 * De twee grote grafieken kregen op die datum een zin bij de as die zegt wat de
 * hoogte betekent. Hier komt die niet: dit lijntje is 96 bij 24 pixels en heeft
 * geen as om te labelen. Wat het voorstelt staat naast het lijntje, in de kop
 * van het kaartje (de clusternaam) en in het getal ernaast, en voor wie
 * voorleest staat het voluit in `aria-label`.
 */
const W = 96;
const H = 24;
const PAD = 2;

export function Sparkline({
  values,
  label,
}: {
  /** Op tijdsvolgorde, oudste eerst. Waarden van 0 tot 100. */
  values: number[];
  /** Voor schermlezers: wat is dit een verloop van? */
  label: string;
}) {
  // Eén punt is geen verloop. Een lijn van één punt tekenen suggereert een
  // vlakke ontwikkeling terwijl er nog niets te ontwikkelen viel.
  if (values.length < 2) {
    return (
      <span className="mono-label text-muted" title={`${label}: nog te weinig metingen`}>
        nog geen verloop
      </span>
    );
  }

  const stap = (W - PAD * 2) / (values.length - 1);
  const punten = values.map((v, i) => ({
    x: PAD + i * stap,
    y: PAD + (1 - Math.min(100, Math.max(0, v)) / 100) * (H - PAD * 2),
  }));
  // Vloeiend en niet hoekig, zelfde ronding als de grote grafieken. Op 24 pixels
  // hoogte is dit het verschil tussen een zigzagje en een verloop, en omdat de
  // ronding monotoon is (`lib/chart-curve.ts`) kan hij hier niet buiten het
  // vlakje van 0 tot 100 klimmen.
  const lijn = vloeiendPad(punten);

  const laatste = values[values.length - 1];
  const laatsteY = PAD + (1 - Math.min(100, Math.max(0, laatste)) / 100) * (H - PAD * 2);

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${label}: verloop over ${values.length} periodes, nu ${Math.round(laatste)}`}
      className="shrink-0"
    >
      <path
        d={lijn}
        fill="none"
        stroke="var(--chart-own)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* De laatste stand krijgt een punt: dat is de waarde waar het om gaat. */}
      <circle cx={W - PAD} cy={laatsteY} r={2} fill="var(--chart-own)" />
    </svg>
  );
}
