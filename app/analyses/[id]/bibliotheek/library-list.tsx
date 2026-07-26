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
 * Het oordeel in WOORDEN in plaats van een cijfer (optimalisatie.md 4.14).
 *
 * "kwaliteit 78/100" is een interne maat die de klant niets zegt: is 78 goed?
 * Moet hij iets doen bij 78? Het cijfer zelf staat nog op de detailpagina, waar
 * het bij de onderbouwing hoort — hier hoort het antwoord op de enige vraag die
 * hij bij een lijst stelt: kan dit weg naar de website of niet?
 */
function verdict(piece: ContentPiece): { text: string; style: React.CSSProperties } {
  if (piece.status === "draft") {
    return {
      text: "Wordt nog geschreven",
      style: { background: "rgba(11,11,12,0.05)", color: "var(--text-muted)", borderColor: "var(--border-subtle)" },
    };
  }
  if (piece.needs_review) {
    return {
      text: "Even nakijken",
      style: { background: "rgba(240,180,60,0.12)", color: "#8a6100", borderColor: "rgba(240,180,60,0.35)" },
    };
  }
  return {
    text: "Klaar om te publiceren",
    style: { background: "rgba(46,158,80,0.1)", color: "#1f7a3d", borderColor: "rgba(46,158,80,0.3)" },
  };
}

/** Lijst met gegenereerde pagina's + simpele filters (type/cluster). */
export function LibraryList({ analysisId, pieces }: { analysisId: string; pieces: ContentPiece[] }) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [clusterFilter, setClusterFilter] = useState<string>("all");

  const clusters = Array.from(new Set(pieces.map((p) => p.cluster).filter(Boolean))) as string[];
  const types = Array.from(new Set(pieces.map((p) => p.type)));

  const filtered = pieces.filter(
    (p) => (typeFilter === "all" || p.type === typeFilter) && (clusterFilter === "all" || p.cluster === clusterFilter),
  );

  return (
    <div className="flex flex-col gap-4">
      {(types.length > 1 || clusters.length > 1) && (
        <div className="flex flex-wrap gap-2">
          {types.length > 1 && (
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="field w-fit">
              <option value="all">Alle types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t] ?? t}
                </option>
              ))}
            </select>
          )}
          {clusters.length > 1 && (
            <select value={clusterFilter} onChange={(e) => setClusterFilter(e.target.value)} className="field w-fit">
              <option value="all">Alle clusters</option>
              {clusters.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {filtered.map((p) => (
          <li key={p.id}>
            <Link
              href={`/analyses/${analysisId}/bibliotheek/${p.id}`}
              className="card flex flex-col gap-2 hover:cursor-pointer"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-lg font-semibold">{p.title}</span>
                <span className="flex items-center gap-2">
                  <span className="chip" style={verdict(p).style}>
                    {verdict(p).text}
                  </span>
                  <span className="chip chip-green">{TYPE_LABEL[p.type] ?? p.type}</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {p.cluster && <span className="mono-label">{p.cluster}</span>}
                {p.word_count != null && <span className="mono-label">{p.word_count} woorden</span>}
                {/* Het kwaliteitscijfer staat op de detailpagina, bij de
                    onderbouwing. Hier telt alleen het oordeel hierboven. */}
                {p.version > 1 && <span className="mono-label">versie {p.version}</span>}
                {p.edited_by_user && <span className="mono-label">door jou bewerkt</span>}
                <span className="chip">
                  {p.action === "verbeteren" ? `Verbetert: ${p.existing_url ?? "bestaande pagina"}` : "Nieuwe pagina"}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
