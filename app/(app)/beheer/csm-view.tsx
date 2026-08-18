"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CSM_SEGMENTS,
  CSM_SEGMENT_META,
  flagsOf,
  needsAttention,
  segmentOf,
  type CsmBrand,
  type CsmSegment,
  type CsmTotals,
} from "@/lib/csm";

/**
 * De klantentabel met segmenten (Nova's `admin.segments`).
 *
 * ── SEGMENTEN ALS TABBLADEN, NIET ALS UITKLAPLIJST ──────────────────────────
 *
 * Nova doet dit ook zo: een uitklaplijst verbergt hoeveel er in elk segment
 * zit, en dat aantal ís het bericht. Bij een tabblad zie je "3" naast
 * "Vastgelopen" zonder te klikken.
 *
 * ── ELK SEGMENT HEEFT EEN BANNER DIE ZEGT WAT JIJ MOET DOEN ─────────────────
 *
 * Dat is de vondst die dit scherm bruikbaar maakt in plaats van alleen waar.
 * Een tabel met statussen laat je zelf uitvogelen wat de volgende stap is; een
 * zin erboven doet dat werk één keer, voor iedereen.
 */
export function CsmView({ brands, kpi }: { brands: CsmBrand[]; kpi: CsmTotals }) {
  const [segment, setSegment] = useState<CsmSegment | "alles">("alles");
  const [alleenWaarschuwingen, setAlleenWaarschuwingen] = useState(false);

  const perSegment = useMemo(() => {
    const map = new Map<CsmSegment, CsmBrand[]>();
    for (const s of CSM_SEGMENTS) map.set(s, []);
    for (const b of brands) map.get(segmentOf(b))!.push(b);
    return map;
  }, [brands]);

  const zichtbaar = useMemo(() => {
    const basis = segment === "alles" ? brands : (perSegment.get(segment) ?? []);
    return alleenWaarschuwingen ? basis.filter(needsAttention) : basis;
  }, [brands, perSegment, segment, alleenWaarschuwingen]);

  if (brands.length === 0) {
    return (
      <div className="card flex flex-col gap-2">
        <span className="mono-label">Nog geen merken</span>
        <p className="text-secondary">
          Zodra je het eerste merkprofiel aanmaakt, staat het hier.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── De vier KPI's ─────────────────────────────────────────────────
          Nova heeft er vier en dat is precies genoeg: meer getallen bovenaan
          betekent dat je gaat kiezen welk getal je gelooft. */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Achter op plaatsen"
          waarde={kpi.achterOpPlaatsen}
          uitleg="Geschreven en goedgekeurd, staat nog niet live"
          alarm={kpi.achterOpPlaatsen > 0}
        />
        <Kpi
          label="Achter op schrijven"
          waarde={kpi.achterOpSchrijven}
          uitleg="De publicatiedatum is voorbij en er is nog geen tekst"
          alarm={kpi.achterOpSchrijven > 0}
        />
        <Kpi
          label="Wacht op akkoord"
          waarde={kpi.wachtOpAkkoord}
          uitleg="Maanden en pagina's waar de klant iets van moet vinden"
          alarm={false}
        />
        <Kpi
          label="Pijplijnfouten"
          waarde={kpi.pijplijnfouten}
          uitleg="Taken die na vier pogingen definitief mislukten"
          alarm={kpi.pijplijnfouten > 0}
        />
      </div>

      {/* ── De segmenten ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <Tab
          actief={segment === "alles"}
          onClick={() => setSegment("alles")}
          label="Alle merken"
          aantal={brands.length}
        />
        {CSM_SEGMENTS.map((s) => (
          <Tab
            key={s}
            actief={segment === s}
            onClick={() => setSegment(s)}
            label={CSM_SEGMENT_META[s].label}
            aantal={perSegment.get(s)?.length ?? 0}
            alarm={CSM_SEGMENT_META[s].actie && (perSegment.get(s)?.length ?? 0) > 0}
          />
        ))}
      </div>

      {segment !== "alles" && (
        <p
          className="card text-sm"
          style={{
            background: CSM_SEGMENT_META[segment].actie
              ? "var(--intent-warning-surface)"
              : "var(--bg-surface)",
            borderColor: CSM_SEGMENT_META[segment].actie
              ? "var(--intent-warning-border)"
              : "var(--border-subtle)",
          }}
        >
          {CSM_SEGMENT_META[segment].banner}
        </p>
      )}

      <label className="flex w-fit items-center gap-2 text-sm text-secondary">
        <input
          type="checkbox"
          checked={alleenWaarschuwingen}
          onChange={(e) => setAlleenWaarschuwingen(e.target.checked)}
        />
        Alleen merken die iets van je vragen ({kpi.merkenMetActie} van {kpi.merken})
      </label>

      {zichtbaar.length === 0 ? (
        <div className="card">
          <p className="text-secondary">
            {segment === "alles"
              ? "Geen enkel merk vraagt nu iets van je."
              : CSM_SEGMENT_META[segment].leeg}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {zichtbaar.map((b) => (
            <Rij key={b.profileId} brand={b} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Kpi({
  label,
  waarde,
  uitleg,
  alarm,
}: {
  label: string;
  waarde: number;
  uitleg: string;
  alarm: boolean;
}) {
  return (
    <div className="card flex flex-col gap-1">
      <span className="mono-label">{label}</span>
      <span
        className="stat-value text-3xl"
        style={{ color: alarm ? "var(--intent-danger-text)" : "var(--text-primary)" }}
      >
        {waarde}
      </span>
      <span className="text-sm text-muted">{uitleg}</span>
    </div>
  );
}

function Tab({
  actief,
  onClick,
  label,
  aantal,
  alarm = false,
}: {
  actief: boolean;
  onClick: () => void;
  label: string;
  aantal: number;
  alarm?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actief}
      className="flex items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-sm font-medium transition-colors"
      style={{
        borderColor: actief ? "var(--intent-intelligence-border)" : "var(--border-subtle)",
        background: actief ? "var(--intent-intelligence-surface)" : "var(--bg-surface)",
        color: actief ? "var(--text-primary)" : "var(--text-secondary)",
      }}
    >
      {label}
      <span
        className="stat-value text-xs"
        style={{ color: alarm ? "var(--intent-danger-text)" : "var(--text-muted)" }}
      >
        {aantal}
      </span>
    </button>
  );
}

/**
 * Eén merk. De kolommen die Nova heeft (klant, domein, status, acties), in de
 * vorm die op een telefoon niet omvalt: geen tabel maar een kaart per merk.
 */
function Rij({ brand }: { brand: CsmBrand }) {
  const meta = CSM_SEGMENT_META[segmentOf(brand)];
  const vlaggen = flagsOf(brand);

  return (
    <li className="card flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <Link href={`/merk/${brand.profileId}/merkprofiel`} className="font-medium hover:underline">
          {brand.name}
        </Link>
        <span className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {brand.accountName && <span>{brand.accountName}</span>}
          <span className="chip chip-neutral">{meta.label}</span>
          {brand.quota !== null && <span>{brand.quota} per maand</span>}
          <span>
            {brand.laatstGeplaatst
              ? `Laatst geplaatst op ${nlDatum(brand.laatstGeplaatst)}`
              : "Nog niets geplaatst"}
          </span>
        </span>
        {vlaggen.length > 0 && (
          <span className="flex flex-wrap gap-2 pt-1">
            {vlaggen.map((v) => (
              <span key={v} className="chip chip-warning">
                {v}
              </span>
            ))}
          </span>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3 text-sm">
        <Link href={`/merk/${brand.profileId}/merkprofiel`} className="text-secondary hover:underline">
          Merkdossier
        </Link>
        {brand.heeftPlan && (
          <Link
            href={`/merk/${brand.profileId}/strategie/plan`}
            className="text-secondary hover:underline"
          >
            Contentplan
          </Link>
        )}
      </div>
    </li>
  );
}

function nlDatum(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long" });
}
