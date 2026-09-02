"use client";

import { useMemo } from "react";
import type { DagPunt } from "@/lib/search-console/metrics";

/**
 * Klikken op onze eigen pagina's, met een verticale markering per
 * publicatiemoment (plan analytics-herontwerp.md, V4).
 *
 * ── WAAROM DEZE GRAFIEK DE OUDE VERVANGT, EN NIET AANVULT ───────────────────
 *
 * De oude `TrafficChart` zette een kliklijn van de HELE website naast losse
 * zichtbaarheidspunten op een tweede as. Dat beeld beloofde een verband
 * tussen twee dingen die niets met elkaar te maken hoeven hebben: het
 * grootste deel van die kliklijn bestond al voordat ORBIT ENGINE begon. Deze
 * grafiek telt alleen de pagina's die ORBIT ENGINE zelf publiceerde, en de
 * verticale streep bij elke publicatiedatum is het enige "voor en na" dat
 * deze pagina nog belooft.
 *
 * Geen grafiekbibliotheek, zelfde reden als `TrendChart` en `TrafficChart`:
 * een lijn met een paar punten en een paar strepen is SVG-werk.
 */
const W = 760;
const H = 220;
const PAD = { top: 16, right: 20, bottom: 30, left: 44 };

export function PagesTrafficChart({
  dagen,
  publicatiedata,
}: {
  dagen: DagPunt[];
  /** ISO-datums waarop een pagina live ging. */
  publicatiedata: string[];
}) {
  const meetkunde = useMemo(() => {
    if (dagen.length < 2) return null;
    const eerste = dag(dagen[0].day);
    const laatste = dag(dagen[dagen.length - 1].day);
    const spanMs = Math.max(1, laatste - eerste);
    const maxKlik = Math.max(1, ...dagen.map((d) => d.clicks));
    const x = (day: string) => PAD.left + ((dag(day) - eerste) / spanMs) * (W - PAD.left - PAD.right);
    const y = (v: number) => PAD.top + (1 - v / maxKlik) * (H - PAD.top - PAD.bottom);
    return { x, y, maxKlik, eerste, laatste };
  }, [dagen]);

  if (!meetkunde) {
    return (
      <div className="card flex flex-col gap-2">
        <span className="mono-label">Klikken op onze pagina&apos;s</span>
        <p className="text-secondary">
          Er zijn nog te weinig dagen opgehaald om een verloop te tekenen.
        </p>
      </div>
    );
  }

  const { x, y, maxKlik, eerste, laatste } = meetkunde;
  const punten = dagen.map((d) => `${x(d.day).toFixed(1)},${y(d.clicks).toFixed(1)}`).join(" ");
  const markeringen = publicatiedata.filter((p) => dag(p) >= eerste && dag(p) <= laatste);

  return (
    <div className="card flex flex-col gap-2">
      <span className="mono-label">Klikken op onze pagina&apos;s</span>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Klikken per dag op de pagina's die ORBIT ENGINE publiceerde, met een streep per publicatiemoment">
        {[0, 0.5, 1].map((f) => (
          <line
            key={f}
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + f * (H - PAD.top - PAD.bottom)}
            y2={PAD.top + f * (H - PAD.top - PAD.bottom)}
            stroke="var(--border-subtle)"
          />
        ))}
        {markeringen.map((datum) => (
          <line
            key={datum}
            x1={x(datum)}
            x2={x(datum)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            stroke="var(--chart-3)"
            strokeDasharray="3 3"
          />
        ))}
        <polyline points={punten} fill="none" stroke="var(--chart-2)" strokeWidth={2} strokeLinejoin="round" />
        <text x={PAD.left} y={H - 8} className="fill-[var(--text-muted)] text-[10px]">
          {formatKort(dagen[0].day)}
        </text>
        <text x={W - PAD.right} y={H - 8} textAnchor="end" className="fill-[var(--text-muted)] text-[10px]">
          {formatKort(dagen[dagen.length - 1].day)}
        </text>
        <text x={PAD.left - 6} y={PAD.top + 4} textAnchor="end" className="fill-[var(--text-muted)] text-[10px]">
          {maxKlik}
        </text>
      </svg>
      {markeringen.length > 0 && (
        <p className="type-caption text-muted">
          De {markeringen.length === 1 ? "gestreepte lijn is" : "gestreepte lijnen zijn"} de dag
          {markeringen.length === 1 ? " dat" : "en dat"} een pagina live ging.
        </p>
      )}
    </div>
  );
}

function dag(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getTime();
}

function formatKort(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}
