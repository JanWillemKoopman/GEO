"use client";

import { useId, useMemo } from "react";
import type { DagPunt } from "@/lib/search-console/metrics";

/**
 * KLIKKEN UIT GOOGLE NAAST DE ZICHTBAARHEID IN AI-ANTWOORDEN.
 *
 * ── WAAROM DIT BEELD HET BELANGRIJKSTE VAN HET PRODUCT IS ───────────────────
 *
 * Het is het enige beeld dat het hele verhaal in één keer vertelt: ORBIT ENGINE
 * meet of AI-assistenten je noemen, en dit laat zien of daar ook verkeer uit
 * komt. De roadmap wachtte hier sinds 11 augustus 2026 op.
 *
 * ── TWEE TIJDSCHALEN, EN DAT MAG JE NIET WEGPOETSEN ─────────────────────────
 *
 * Google levert **per dag**, de meting levert **per periode**. De kliklijn is
 * dus een doorlopende curve, de zichtbaarheidslijn is een reeks punten met een
 * lijn ertussen. Die punten staan er als stip omdat er tussen twee metingen
 * niets gemeten is: een gladde curve zou een dagelijkse waarde suggereren die
 * niet bestaat, en dat is precies de schijnprecisie die `docs/ux-design.md`
 * verbiedt.
 *
 * ── TWEE ASSEN, EN DUS TWEE KLEUREN ─────────────────────────────────────────
 *
 * Klikken lopen van 0 tot het dagmaximum, de score van 0 tot 100. Die op één as
 * zetten maakt de ene lijn plat. Elke as draagt daarom de kleur van zijn lijn,
 * anders is niet af te lezen welk getal bij welke lijn hoort.
 *
 * Geen grafiekbibliotheek, net als bij `TrendChart`: dit is een lijn met een
 * paar punten en daar is SVG voor.
 */
const W = 760;
const H = 240;
const PAD = { top: 16, right: 44, bottom: 30, left: 44 };

const KLIK_KLEUR = "var(--chart-2)";
const SCORE_KLEUR = "var(--chart-own)";

/** Eén meting: een periode met een score, geplaatst op de dag dat hij gemeten is. */
export interface ScorePunt {
  day: string;
  score: number;
}

export function TrafficChart({
  dagen,
  scores,
}: {
  dagen: DagPunt[];
  scores: ScorePunt[];
}) {
  const gradientId = useId();

  const meetkunde = useMemo(() => {
    if (dagen.length < 2) return null;
    const eerste = dagen[0].day;
    const laatste = dagen[dagen.length - 1].day;
    const spanMs = Math.max(1, dag(laatste) - dag(eerste));
    const maxKlik = Math.max(1, ...dagen.map((d) => d.clicks));

    const x = (day: string) =>
      PAD.left + ((dag(day) - dag(eerste)) / spanMs) * (W - PAD.left - PAD.right);
    const yKlik = (v: number) => PAD.top + (1 - v / maxKlik) * (H - PAD.top - PAD.bottom);
    const yScore = (v: number) => PAD.top + (1 - v / 100) * (H - PAD.top - PAD.bottom);

    return { x, yKlik, yScore, maxKlik, eerste, laatste };
  }, [dagen]);

  if (!meetkunde) {
    return (
      <div className="card flex flex-col gap-2">
        <span className="mono-label">Klikken naast zichtbaarheid</span>
        <p className="text-secondary">
          Er zijn nog te weinig dagen opgehaald om een verloop te tekenen. Zodra Google een paar
          dagen heeft geleverd, staat de grafiek hier.
        </p>
      </div>
    );
  }

  const { x, yKlik, yScore, maxKlik } = meetkunde;

  // De kliklijn loopt door, en de laatste dagen zijn nog niet definitief. Die
  // worden gestreept getekend in plaats van weggelaten: weglaten laat de lijn
  // twee dagen te vroeg eindigen, en dan lijkt het of het verkeer stopte.
  const vast = dagen.filter((d) => !d.voorlopig);
  const voorlopig = dagen.filter((d) => d.voorlopig);
  const brugpunt = vast[vast.length - 1];

  const lijn = (punten: DagPunt[]) =>
    punten.map((d) => `${x(d.day).toFixed(1)},${yKlik(d.clicks).toFixed(1)}`).join(" ");

  // Alleen metingen binnen het venster dat Google dekt. Een stip buiten de
  // grafiek tekenen zou hem tegen de rand plakken op een datum die er niet is.
  const zichtbareScores = scores.filter(
    (s) => s.day >= meetkunde.eerste && s.day <= meetkunde.laatste,
  );

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono-label">Klikken naast zichtbaarheid</span>
        <span className="flex flex-wrap gap-3">
          <Legenda kleur={KLIK_KLEUR} tekst="Klikken uit Google, per dag" />
          <Legenda kleur={SCORE_KLEUR} tekst="Zichtbaarheid in AI, per meting" />
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Klikken uit Google per dag, naast de gemeten zichtbaarheid in AI-antwoorden per periode"
          style={{ minWidth: 520 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={KLIK_KLEUR} stopOpacity={0.18} />
              <stop offset="100%" stopColor={KLIK_KLEUR} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Rasterlijnen op de klik-as. Drie, niet vijf: meer lijnen maken de
              grafiek drukker zonder dat je beter afleest. */}
          {[0, 0.5, 1].map((f) => (
            <line
              key={f}
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yKlik(maxKlik * f)}
              y2={yKlik(maxKlik * f)}
              stroke="var(--chart-grid)"
              strokeWidth={1}
            />
          ))}

          {/* Het vlak onder de kliklijn. */}
          <polygon
            points={`${PAD.left},${yKlik(0)} ${lijn(dagen)} ${W - PAD.right},${yKlik(0)}`}
            fill={`url(#${gradientId})`}
          />

          {/* De kliklijn: doorgetrokken tot de laatste definitieve dag… */}
          <polyline
            points={lijn(vast)}
            fill="none"
            stroke={KLIK_KLEUR}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          {/* …en gestreept over de dagen die Google nog kan bijstellen. Het
              brugpunt gaat mee, anders zit er een gat tussen de twee stukken. */}
          {voorlopig.length > 0 && (
            <polyline
              points={lijn(brugpunt ? [brugpunt, ...voorlopig] : voorlopig)}
              fill="none"
              stroke={KLIK_KLEUR}
              strokeWidth={2}
              strokeDasharray="4 3"
              strokeLinejoin="round"
            />
          )}

          {/* De metingen: stippen met een lijn ertussen, nooit een curve. */}
          {zichtbareScores.length > 1 && (
            <polyline
              points={zichtbareScores
                .map((s) => `${x(s.day).toFixed(1)},${yScore(s.score).toFixed(1)}`)
                .join(" ")}
              fill="none"
              stroke={SCORE_KLEUR}
              strokeWidth={2}
              strokeDasharray="2 4"
            />
          )}
          {zichtbareScores.map((s) => (
            <circle
              key={s.day}
              cx={x(s.day)}
              cy={yScore(s.score)}
              r={4}
              fill="var(--bg-surface)"
              stroke={SCORE_KLEUR}
              strokeWidth={2}
            />
          ))}

          {/* Twee assen, elk in de kleur van zijn eigen lijn. */}
          <text x={4} y={yKlik(maxKlik) + 4} fontSize={11} fill={KLIK_KLEUR}>
            {maxKlik}
          </text>
          <text x={4} y={yKlik(0) + 4} fontSize={11} fill={KLIK_KLEUR}>
            0
          </text>
          <text x={W - PAD.right + 6} y={yScore(100) + 4} fontSize={11} fill={SCORE_KLEUR}>
            100
          </text>
          <text x={W - PAD.right + 6} y={yScore(0) + 4} fontSize={11} fill={SCORE_KLEUR}>
            0
          </text>

          <text x={PAD.left} y={H - 8} fontSize={11} fill="var(--chart-axis)">
            {kortDatum(meetkunde.eerste)}
          </text>
          <text
            x={W - PAD.right}
            y={H - 8}
            fontSize={11}
            fill="var(--chart-axis)"
            textAnchor="end"
          >
            {kortDatum(meetkunde.laatste)}
          </text>
        </svg>
      </div>

      {/* ⚠️ Zonder deze zin leest een klant de kliklijn als AI-effect. */}
      <p className="text-sm text-muted">
        Google splitst klikken uit AI-antwoorden niet uit; ze zitten in het gewone totaal. De
        gestreepte staart is nog niet definitief, want Google corrigeert de laatste twee dagen na.
      </p>
    </div>
  );
}

function Legenda({ kleur, tekst }: { kleur: string; tekst: string }) {
  return (
    <span className="mono-label flex items-center gap-1.5">
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-[var(--radius-pill)]"
        style={{ background: kleur }}
      />
      {tekst}
    </span>
  );
}

function dag(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getTime();
}

function kortDatum(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
