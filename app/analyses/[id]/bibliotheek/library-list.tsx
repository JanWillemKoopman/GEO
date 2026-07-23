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
                <span className="chip chip-green">{TYPE_LABEL[p.type] ?? p.type}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {p.cluster && <span className="mono-label">{p.cluster}</span>}
                {p.word_count != null && <span className="mono-label">{p.word_count} woorden</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
