"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { MARKT_BUDGET_EUR } from "@/lib/sales/budget";

/**
 * De knop die het marktonderzoek start.
 *
 * ── DIT IS DE EERSTE KNOP IN DE MODULE DIE GELD KOST ────────────────────────
 *
 * Vandaar dat er een bedrag bij staat en geen "dit kan even duren". Plan 21.3:
 * een plafond per markt is een van de drie remmen, en een rem die de gebruiker
 * niet ziet, stuurt niets. De schatting staat er als schatting bij, want er is
 * nog geen enkele marktanalyse gedraaid en een precies getal zou hier gelogen zijn.
 */
export function StartOnderzoek({ marketId }: { marketId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [bezig, setBezig] = useState(false);

  async function start() {
    setBezig(true);
    try {
      const res = await fetch(`/api/sales/markets/${marketId}/discover`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast({ title: "Niet gestart", description: data.error, intent: "fout" });
        return;
      }
      toast({
        title: "Het onderzoek loopt",
        description: "Je kunt dit scherm sluiten. Ververs over een paar minuten.",
        intent: "succes",
      });
      router.refresh();
    } catch {
      toast({ title: "De verbinding viel weg", intent: "fout" });
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="card flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">Breng de markt in kaart</h2>
        <p className="mt-1 text-secondary">
          ORBIT ENGINE zoekt op het web welke bedrijven er in deze markt zitten, leest de
          ledenlijsten en bedrijvengidsen uit die het tegenkomt, en haalt de klanten van Outer
          Orbit eruit. Daarna kijk jij de lijst na voordat er iets gemeten wordt.
        </p>
      </div>
      <p className="text-sm text-muted">
        Dit is de eerste stap die geld kost. Naar schatting minder dan een euro. Het plafond voor
        deze markt staat op {MARKT_BUDGET_EUR} euro over alle stappen samen.
      </p>
      <div>
        <button type="button" className="btn-primary" onClick={start} disabled={bezig}>
          {bezig ? "Bezig" : "Start het onderzoek"}
        </button>
      </div>
    </div>
  );
}
