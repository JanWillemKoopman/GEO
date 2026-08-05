"use client";

import { useId, useMemo, useState } from "react";
import { InfoHint } from "@/components/info-hint";
import type { TrendData } from "@/lib/pipeline/trend";

/**
 * De trendlijn (optimalisatie.md 6.5/6.6).
 *
 * Vorm: een lijngrafiek over de tijd met de bandbreedte als schaduw, plus de
 * belangrijkste concurrenten in dezelfde grafiek. "Ik loop in" is een sterker
 * signaal dan een absoluut getal, daarom staan ze erbij en niet in een aparte
 * grafiek ernaast.
 *
 * De publicatiemarkeringen zijn het punt van deze hele grafiek: zonder die
 * verticale strepen is een stijging een toevalligheid, met die strepen is het
 * een gevolg. Dat is het verschil tussen een grafiek en een verhaal.
 *
 * Kleur: het eigen merk in het paars van de app, concurrenten in oranje, aqua en
 * blauw. Die vier zijn samen gevalideerd op kleurenblindheid (ΔE 9,2 op het
 * slechtste aangrenzende paar, ruim boven de ondergrens van 6). Twee daarvan
 * halen de contrastdrempel van 3:1 net niet, en dat is precies waarom elke lijn
 * een naam aan het uiteinde krijgt én er een tabelweergave onder staat:
 * identiteit mag nooit alleen op kleur leunen.
 *
 * Geen grafiekbibliotheek: dit is een lijn met een paar punten, en daar is SVG
 * voor. Een bibliotheek zou honderden kilobytes kosten voor iets wat in tachtig
 * regels past.
 */
const OWN_COLOR = "#8511d9";
const COMPETITOR_COLORS = ["#eb6834", "#1baf7a", "#2a78d6"];

const W = 760;
const H = 260;
// Rechts ruimte voor de directe labels. Bij 12 tekens op 11px is dat ~78px plus
// de stip en de tussenruimte; 130 geeft lucht zonder de grafiek te knijpen.
const PAD = { top: 16, right: 130, bottom: 34, left: 34 };

/** Bij hoeveel tekens we een naam afkappen zodat hij binnen PAD.right past. */
const LABEL_MAX_CHARS = 12;

/** Minimale verticale afstand tussen twee eindlabels, in SVG-eenheden. */
const LABEL_MIN_GAP = 14;

/**
 * Duwt eindlabels uit elkaar die anders over elkaar heen vallen.
 *
 * Zonder dit staat "Golden Fingers" bovenop "Installatiebedrijf…" zodra twee
 * lijnen op twee punten van elkaar eindigen, en dat is precies het geval dat
 * er het meest toe doet, want dan is de klant net aan het inlopen.
 *
 * De stip blijft op de echte waarde staan; alleen de TEKST schuift. Anders zou
 * het label liegen over waar de lijn eindigt.
 */
function spreadLabels<T extends { y: number }>(items: T[]): (T & { labelY: number })[] {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  const out: (T & { labelY: number })[] = [];
  let previous = -Infinity;

  for (const item of sorted) {
    const labelY = Math.max(item.y, previous + LABEL_MIN_GAP);
    out.push({ ...item, labelY });
    previous = labelY;
  }

  // Duwt de hele stapel omhoog als hij onderaan buiten het kader zou vallen.
  const overflow = (out[out.length - 1]?.labelY ?? 0) - (H - PAD.bottom);
  if (overflow > 0) {
    for (const item of out) item.labelY -= overflow;
  }
  return out;
}

export function TrendChart({ data, ownLabel }: { data: TrendData; ownLabel: string }) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const { points, competitors, publications } = data;

  const geometry = useMemo(() => {
    if (points.length === 0) return null;
    const weeks = points.map((p) => p.weekNo);
    const minWeek = Math.min(...weeks);
    const maxWeek = Math.max(...weeks);
    const span = Math.max(1, maxWeek - minWeek);

    const x = (week: number) =>
      PAD.left + ((week - minWeek) / span) * (W - PAD.left - PAD.right);
    // Vaste schaal 0-100: de score ís een percentage, en een auto-schalende
    // y-as maakt van een verschil van drie punten een dramatische klim.
    const y = (value: number) => PAD.top + (1 - value / 100) * (H - PAD.top - PAD.bottom);

    return { x, y, minWeek, maxWeek };
  }, [points]);

  if (!geometry || points.length < 2) {
    return (
      <div className="card flex flex-col gap-2">
        <span className="mono-label">Verloop</span>
        <p className="text-secondary">
          De trendlijn verschijnt zodra er een tweede meting is. Aura meet maandelijks, dus je hoeft
          niets te doen.
        </p>
      </div>
    );
  }

  const { x, y } = geometry;
  const line = (pts: { weekNo: number; value: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.weekNo).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");

  const ownPath = line(points.map((p) => ({ weekNo: p.weekNo, value: p.score })));
  const bandPath =
    points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.weekNo).toFixed(1)},${y(p.high).toFixed(1)}`).join(" ") +
    " " +
    [...points]
      .reverse()
      .map((p) => `L${x(p.weekNo).toFixed(1)},${y(p.low).toFixed(1)}`)
      .join(" ") +
    " Z";

  const publicationWeeks = new Map(publications.map((p) => [p.weekNo, p.titles]));
  const hovered = hover != null ? points.find((p) => p.weekNo === hover) : null;

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono-label flex items-center gap-1">
          Verloop over de metingen
          <InfoHint label="Verloop">
            De doorgetrokken lijn is jouw zichtbaarheid; de lichte band eromheen is de
            onzekerheid van de meting. Blijft de lijn binnen de band van de vorige meting, dan is
            er niets veranderd. De streepjes markeren wanneer je iets publiceerde.
          </InfoHint>
        </span>
        <span className="mono-label">{points.length} metingen</span>
      </div>

      {/* Legenda staat er altijd bij vanaf twee lijnen: identiteit mag nooit
          alleen op kleur leunen. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
        <LegendItem color={OWN_COLOR} label={ownLabel} bold />
        {competitors.map((c, i) => (
          <LegendItem key={c.name} color={COMPETITOR_COLORS[i % COMPETITOR_COLORS.length]} label={c.name} />
        ))}
        {publications.length > 0 && (
          <span className="flex items-center gap-1.5 text-muted">
            {/* Als SVG en niet als CSS-rand: een verticale streepjeslijn van 12px
                hoog rendert in CSS als een doorlopende pipe, en dan lijkt het een
                scheidingsteken in plaats van een legenda-item. */}
            <svg width="14" height="12" aria-hidden>
              <line
                x1="7"
                y1="0"
                x2="7"
                y2="12"
                stroke="var(--border-strong)"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
            </svg>
            gepubliceerd
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ minWidth: 480 }}
          role="img"
          aria-label={`Verloop van de zichtbaarheid van ${ownLabel} over ${points.length} metingen`}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={OWN_COLOR} stopOpacity="0.14" />
              <stop offset="100%" stopColor={OWN_COLOR} stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {/* Rasterlijnen: haarlijn, doorgetrokken, terugtredend. */}
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--border-subtle)"
                strokeWidth="1"
              />
              <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">
                {v}
              </text>
            </g>
          ))}

          {/* Publicatiemomenten, de markeringen die er een verhaal van maken. */}
          {publications.map((p) => (
            <line
              key={p.weekNo}
              x1={x(p.weekNo)}
              x2={x(p.weekNo)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="var(--border-strong)"
              strokeWidth="2"
              strokeDasharray="3 3"
            />
          ))}

          {/* De onzekerheidsband: een wash, geen verzadigd vlak. */}
          <path d={bandPath} fill={`url(#${gradientId})`} />

          {competitors.map((c, i) => (
            <path
              key={c.name}
              d={line(c.points.map((p) => ({ weekNo: p.weekNo, value: p.percent })))}
              fill="none"
              stroke={COMPETITOR_COLORS[i % COMPETITOR_COLORS.length]}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          <path
            d={ownPath}
            fill="none"
            stroke={OWN_COLOR}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {points.map((p) => (
            <circle
              key={p.weekNo}
              cx={x(p.weekNo)}
              cy={y(p.score)}
              r={hover === p.weekNo ? 6 : 4}
              fill={OWN_COLOR}
              stroke="var(--bg-surface)"
              strokeWidth="2"
            />
          ))}

          {/* Directe labels aan het uiteinde, verplicht bij vier lijnen, en de
              relief voor de kleur die de contrastdrempel net niet haalt. */}
          {spreadLabels([
            {
              key: "own",
              x: x(points[points.length - 1].weekNo),
              y: y(points[points.length - 1].score),
              color: OWN_COLOR,
              text: ownLabel,
              bold: true,
            },
            ...competitors
              .map((c, i) => {
                const last = c.points[c.points.length - 1];
                if (!last) return null;
                return {
                  key: c.name,
                  x: x(last.weekNo),
                  y: y(last.percent),
                  color: COMPETITOR_COLORS[i % COMPETITOR_COLORS.length],
                  text: c.name,
                  bold: false,
                };
              })
              .filter((v): v is NonNullable<typeof v> => v !== null),
          ]).map(({ key, ...label }) => (
            <EndLabel key={key} {...label} />
          ))}

          {/* Onzichtbare trefvlakken: het aanwijsgebied hoort ruimer te zijn dan
              de stip, anders is de tooltip op een aanraakscherm onbruikbaar. */}
          {points.map((p) => (
            <rect
              key={`hit-${p.weekNo}`}
              x={x(p.weekNo) - 18}
              y={PAD.top}
              width={36}
              height={H - PAD.top - PAD.bottom}
              fill="transparent"
              onMouseEnter={() => setHover(p.weekNo)}
              onFocus={() => setHover(p.weekNo)}
              tabIndex={0}
              role="button"
              aria-label={`Meting ${p.weekNo}: ${p.score} van 100`}
            />
          ))}

          {hovered && (
            <line
              x1={x(hovered.weekNo)}
              x2={x(hovered.weekNo)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="var(--border-strong)"
              strokeWidth="1"
            />
          )}

          {points.map((p) => (
            <text
              key={`x-${p.weekNo}`}
              x={x(p.weekNo)}
              y={H - PAD.bottom + 16}
              textAnchor="middle"
              fontSize="10"
              fill="var(--text-muted)"
            >
              {p.weekNo === 0 ? "start" : formatShortDate(p.measuredAt) ?? `#${p.weekNo}`}
            </text>
          ))}
        </svg>
      </div>

      {hovered && (
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3 text-sm">
          <span className="font-medium">
            {hovered.weekNo === 0 ? "Nulmeting" : `Meting ${hovered.weekNo}`}
            {hovered.measuredAt && (
              <span className="text-muted">
                {" "}
                · {new Date(hovered.measuredAt).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
              </span>
            )}
          </span>
          <p className="text-secondary">
            {ownLabel}: {hovered.score} van 100 (tussen {hovered.low} en {hovered.high})
            {hovered.judgedRuns ? `, over ${hovered.judgedRuns} vragen` : ""}.
          </p>
          {publicationWeeks.has(hovered.weekNo) && (
            <p className="text-secondary">
              Rond deze meting gepubliceerd: {publicationWeeks.get(hovered.weekNo)!.join(", ")}.
            </p>
          )}
        </div>
      )}

      {/* Tabelweergave: verplicht als tegenwicht voor de kleuren die de
          contrastdrempel niet halen, en sowieso de eerlijkste manier om de
          cijfers na te lezen. */}
      <details className="text-sm">
        <summary className="mono-label cursor-pointer transition-colors hover:text-[var(--text-primary)]">
          Cijfers als tabel
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="py-1 pr-4 font-normal">Meting</th>
                <th className="py-1 pr-4 font-normal">{ownLabel}</th>
                <th className="py-1 pr-4 font-normal">Marge</th>
                {competitors.map((c) => (
                  <th key={c.name} className="py-1 pr-4 font-normal">
                    {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.weekNo} className="border-t border-[var(--border-subtle)]">
                  <td className="py-1 pr-4">
                    {p.weekNo === 0 ? "Nulmeting" : formatShortDate(p.measuredAt) ?? `#${p.weekNo}`}
                  </td>
                  <td className="py-1 pr-4 font-medium">{p.score}</td>
                  <td className="py-1 pr-4 text-muted">
                    {p.low}–{p.high}
                  </td>
                  {competitors.map((c) => (
                    <td key={c.name} className="py-1 pr-4 text-secondary">
                      {c.points.find((cp) => cp.weekNo === p.weekNo)?.percent ?? "–"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function LegendItem({ color, label, bold }: { color: string; label: string; bold?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden style={{ width: 14, height: 2, background: color, borderRadius: 1 }} />
      {/* Tekst in inkt, niet in de serie-kleur: het streepje ernaast draagt de
          identiteit, de tekst hoeft dat niet over te doen. */}
      <span style={{ fontWeight: bold ? 600 : 400, color: "var(--text-secondary)" }}>{label}</span>
    </span>
  );
}

function EndLabel({
  x,
  y,
  labelY,
  color,
  text,
  bold,
}: {
  x: number;
  y: number;
  /** Waar de TEKST staat, kan verschoven zijn t.o.v. de stip (zie spreadLabels). */
  labelY: number;
  color: string;
  text: string;
  bold?: boolean;
}) {
  const shifted = Math.abs(labelY - y) > 1;
  return (
    <>
      <circle cx={x} cy={y} r="3.5" fill={color} stroke="var(--bg-surface)" strokeWidth="2" />
      {/* Is het label weggeschoven, dan een haarlijntje terug naar de stip,
          anders raadt de lezer bij welke lijn de naam hoort. */}
      {shifted && (
        <line x1={x + 4} y1={y} x2={x + 8} y2={labelY - 3} stroke={color} strokeWidth="1" opacity="0.5" />
      )}
      <text
        x={x + 10}
        y={labelY + 3.5}
        fontSize="11"
        fontWeight={bold ? 600 : 400}
        fill="var(--text-secondary)"
      >
        {text.length > LABEL_MAX_CHARS ? `${text.slice(0, LABEL_MAX_CHARS - 1)}…` : text}
      </text>
    </>
  );
}

function formatShortDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}
