"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { CONTENT_TYPES } from "@/lib/plan-writing";
import { SOORTEN } from "@/lib/pagina/soorten";
import type { ContentType } from "@/lib/types/database";

/**
 * De handmatige kans (N5): een kans die de meting niet vond, door de
 * consultant zelf klaargezet. Alleen zichtbaar voor staff (`plan-view.tsx`
 * geeft `kennisOpties` alleen dan mee); de klant ziet de kans zelf pas terug in
 * de voorraad zodra hij bestaat, met het label "Niet gemeten" (N7).
 */
export interface KennisOptie {
  id: string;
  soort: string;
  bewering: string;
}

export function HandmatigeKansFormulier({
  profileId,
  kennisOpties,
}: {
  profileId: string;
  kennisOpties: KennisOptie[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [titel, setTitel] = useState("");
  const [lezer, setLezer] = useState("");
  const [handeling, setHandeling] = useState<"nieuwe_pagina" | "pagina_verbeteren">("nieuwe_pagina");
  const [bestaandeUrl, setBestaandeUrl] = useState("");
  const [geldtVoor, setGeldtVoor] = useState<string[]>([]);
  const [doelvragenTekst, setDoelvragenTekst] = useState("");
  // B33: de soort tekst. Standaard een artikel, zoals een handmatige kans tot
  // 29 september 2026 altijd werd.
  const [soort, setSoort] = useState<ContentType>("article");

  const reset = () => {
    setTitel("");
    setLezer("");
    setHandeling("nieuwe_pagina");
    setBestaandeUrl("");
    setGeldtVoor([]);
    setDoelvragenTekst("");
    setSoort("article");
  };

  const versturen = async () => {
    if (!titel.trim()) {
      toast({ title: "Vul een titel in.", intent: "fout" });
      return;
    }
    if (handeling === "pagina_verbeteren" && !bestaandeUrl.trim()) {
      toast({ title: "Vul het bestaande adres in.", intent: "fout" });
      return;
    }
    setBezig(true);
    try {
      const res = await fetch(`/api/profiles/${profileId}/kansen/handmatig`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titel,
          lezer: lezer.trim() || null,
          handeling,
          contentType: soort,
          bestaandeUrl: handeling === "pagina_verbeteren" ? bestaandeUrl : null,
          geldtVoor,
          doelvragen: doelvragenTekst
            .split("\n")
            .map((r) => r.trim())
            .filter(Boolean),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast({ title: "Aanmaken is niet gelukt", description: data.error, intent: "fout" });
        return;
      }
      toast({ title: "Kans toegevoegd", description: "Staat met het label 'Niet gemeten' in de voorraad." });
      reset();
      setOpen(false);
      router.refresh();
    } finally {
      setBezig(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="btn-outline btn-sm" onClick={() => setOpen(true)}>
        + Kans toevoegen
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="flex items-baseline justify-between">
        <span className="type-body-emphasis text-sm">Handmatige kans</span>
        <button type="button" className="text-xs text-secondary hover:underline" onClick={() => setOpen(false)}>
          Sluiten
        </button>
      </div>
      <p className="text-xs text-secondary">
        Voor een kans die de meting niet vond. Hij komt in de voorraad met het label &quot;Niet gemeten&quot;.
      </p>
      <input
        className="field field-sm"
        placeholder="Titel, bijvoorbeeld 'Prijzen dakisolatie Tilburg'"
        value={titel}
        onChange={(e) => setTitel(e.target.value)}
      />
      <input
        className="field field-sm"
        placeholder="Voor wie is dit (optioneel)"
        value={lezer}
        onChange={(e) => setLezer(e.target.value)}
      />
      <select
        className="field field-sm field-select"
        aria-label="Soort pagina"
        value={soort}
        onChange={(e) => setSoort(e.target.value as ContentType)}
      >
        {CONTENT_TYPES.map((t) => (
          <option key={t} value={t}>
            {SOORTEN[t].keuze}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <select
          className="field field-sm field-select"
          value={handeling}
          onChange={(e) => setHandeling(e.target.value as "nieuwe_pagina" | "pagina_verbeteren")}
        >
          <option value="nieuwe_pagina">Nieuwe pagina</option>
          <option value="pagina_verbeteren">Pagina verbeteren</option>
        </select>
        {handeling === "pagina_verbeteren" && (
          <input
            className="field field-sm flex-1"
            placeholder="Bestaand adres"
            value={bestaandeUrl}
            onChange={(e) => setBestaandeUrl(e.target.value)}
          />
        )}
      </div>
      {kennisOpties.length > 0 && (
        <select
          multiple
          className="field field-sm"
          style={{ height: 88 }}
          value={geldtVoor}
          onChange={(e) => setGeldtVoor(Array.from(e.target.selectedOptions, (o) => o.value))}
        >
          {kennisOpties.map((k) => (
            <option key={k.id} value={k.id}>
              {k.soort === "dienst" ? "Dienst" : "Werkgebied"}: {k.bewering}
            </option>
          ))}
        </select>
      )}
      <textarea
        className="field field-sm"
        style={{ height: 64 }}
        placeholder={"Doelvragen om later te meten, één per regel (optioneel)"}
        value={doelvragenTekst}
        onChange={(e) => setDoelvragenTekst(e.target.value)}
      />
      <button type="button" className="btn-primary btn-sm" disabled={bezig} onClick={() => void versturen()}>
        {bezig ? "Bezig…" : "Kans toevoegen"}
      </button>
    </div>
  );
}
