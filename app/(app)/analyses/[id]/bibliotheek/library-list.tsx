"use client";

import { useState } from "react";
import Link from "next/link";
import type { ContentPiece } from "@/lib/types/database";

const TYPE_LABEL: Record<string, string> = {
  article: "Artikel",
  faq: "FAQ",
  landing: "Landingspagina",
  comparison: "Vergelijking",
};

/**
 * De bibliotheek: het overzicht van alles wat er voor deze analyse geschreven
 * is.
 *
 * ── WAAROM DIT EEN EIGEN PLEK BLIJFT ────────────────────────────────────────
 *
 * In het dossier is een pagina een taak: hij ligt klaar, hij is gepubliceerd,
 * hij wordt hermeten. Maar de tekst zélf is het eindproduct waar de klant voor
 * betaalt — en een eindproduct hoort een vaste plek te hebben waar het netjes
 * bij elkaar staat, ook lang nadat de taak eromheen is afgerond.
 *
 * Vandaar de tweedeling: hoofdstuk 03 van het dossier zegt wat je moet dóén,
 * deze pagina is de kast waar alles in staat.
 *
 * ── DE ORDENING IS DE LEVENSLOOP ────────────────────────────────────────────
 *
 * Gegroepeerd op wat er met een tekst aan de hand is — klaar om te publiceren,
 * nog na te kijken, online, nog in de maak — in plaats van één lange lijst op
 * datum. Zo zoekt iemand zijn eigen content ook: "wat staat er al online" is
 * een andere vraag dan "wat moet ik nog nakijken".
 *
 * Het kwaliteitscijfer staat bewust niet op de kaartjes (optimalisatie.md
 * 4.14). "78/100" is een interne maat: is 78 goed? Moet ik iets doen bij 78?
 * Het cijfer hoort op de detailpagina, bij de onderbouwing — hier telt het
 * antwoord op de enige vraag die je bij een overzicht stelt: kan dit weg naar
 * de website of niet?
 */
type Group = "klaar" | "nakijken" | "live" | "bezig";

const GROUP_META: Record<Group, { label: string; hint: string; chip: string }> = {
  klaar: {
    label: "Klaar om te publiceren",
    hint: "Zolang de tekst niet online staat, verandert er niets aan je zichtbaarheid.",
    chip: "chip",
  },
  nakijken: {
    label: "Even nakijken",
    hint: "De eindredactie zag nog iets. Lees het na en publiceer daarna.",
    chip: "chip chip-warning",
  },
  live: {
    label: "Staat online",
    hint: "Het effect meten we twee en vier weken na publicatie.",
    chip: "chip chip-success",
  },
  bezig: {
    label: "Wordt geschreven",
    hint: "Dit loopt op de achtergrond. Je hoeft er niet op te wachten.",
    chip: "chip chip-neutral",
  },
};

const GROUP_ORDER: Group[] = ["klaar", "nakijken", "live", "bezig"];

function groupOf(piece: ContentPiece): Group {
  if (piece.status === "draft") return "bezig";
  if (piece.published_at) return "live";
  if (piece.needs_review) return "nakijken";
  return "klaar";
}

export function LibraryList({ analysisId, pieces }: { analysisId: string; pieces: ContentPiece[] }) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [clusterFilter, setClusterFilter] = useState<string>("all");

  const clusters = Array.from(new Set(pieces.map((p) => p.cluster).filter(Boolean))) as string[];
  const types = Array.from(new Set(pieces.map((p) => p.type)));

  const filtered = pieces.filter(
    (p) =>
      (typeFilter === "all" || p.type === typeFilter) &&
      (clusterFilter === "all" || p.cluster === clusterFilter),
  );

  const groups = GROUP_ORDER.map((g) => ({
    group: g,
    items: filtered.filter((p) => groupOf(p) === g),
  })).filter((g) => g.items.length > 0);

  const liveCount = pieces.filter((p) => p.published_at).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="card flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="mono-label">Je bibliotheek</span>
          <p className="mt-1 text-2xl font-bold tracking-tight">
            {pieces.length} {pieces.length === 1 ? "pagina" : "pagina's"} geschreven
          </p>
          <p className="mt-1 max-w-md text-sm text-secondary">
            {liveCount === 0
              ? "Nog niets online. Een tekst die niet gepubliceerd is, kan door geen enkele AI-assistent geciteerd worden."
              : `Waarvan er ${liveCount} online ${liveCount === 1 ? "staat" : "staan"}.`}
          </p>
        </div>

        {(types.length > 1 || clusters.length > 1) && (
          <div className="flex flex-wrap gap-2">
            {types.length > 1 && (
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter op soort pagina"
                className="field w-fit"
              >
                <option value="all">Alle soorten</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABEL[t] ?? t}
                  </option>
                ))}
              </select>
            )}
            {clusters.length > 1 && (
              <select
                value={clusterFilter}
                onChange={(e) => setClusterFilter(e.target.value)}
                aria-label="Filter op onderwerp"
                className="field w-fit"
              >
                <option value="all">Alle onderwerpen</option>
                {clusters.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="card">
          <p className="text-secondary">Geen pagina&apos;s die aan dit filter voldoen.</p>
        </div>
      ) : (
        groups.map(({ group, items }) => (
          <section key={group} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="mono-label flex items-center gap-2">
                {group === "bezig" && <span className="live-dot" />}
                {GROUP_META[group].label}
                <span className={GROUP_META[group].chip}>{items.length}</span>
              </span>
              <span className="max-w-sm text-sm text-muted">{GROUP_META[group].hint}</span>
            </div>

            <ul className="grid gap-3 sm:grid-cols-2">
              {items.map((p) => (
                <li key={p.id} className="flex">
                  <PieceCard analysisId={analysisId} piece={p} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function PieceCard({ analysisId, piece }: { analysisId: string; piece: ContentPiece }) {
  return (
    <Link
      href={`/analyses/${analysisId}/bibliotheek/${piece.id}`}
      className="card card-interactive flex w-full flex-col gap-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="text-lg leading-snug font-semibold">{piece.title}</span>
        <span className="chip chip-green shrink-0">{TYPE_LABEL[piece.type] ?? piece.type}</span>
      </div>

      {piece.meta_description && (
        <p className="text-sm text-secondary">{piece.meta_description}</p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
        {piece.cluster && <span className="mono-label">{piece.cluster}</span>}
        {piece.word_count != null && <span className="mono-label">{piece.word_count} woorden</span>}
        {piece.version > 1 && <span className="mono-label">versie {piece.version}</span>}
        {piece.edited_by_user && <span className="mono-label">door jou bewerkt</span>}
      </div>

      {piece.published_url ? (
        <span className="mono-label truncate" style={{ color: "var(--accent-green-text)" }}>
          {piece.published_url}
        </span>
      ) : piece.action === "verbeteren" && piece.existing_url ? (
        <span className="mono-label truncate">Verbetert: {piece.existing_url}</span>
      ) : null}
    </Link>
  );
}
