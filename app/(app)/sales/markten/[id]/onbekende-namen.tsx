"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import type { OnbekendeNaam } from "@/lib/sales/onbekend";

/**
 * De bedrijven die de AI noemde en die niet in onze lijst stonden (plan 9.1).
 *
 * ── WAAROM DIT BLOK NU KNOPPEN HEEFT ────────────────────────────────────────
 *
 * Bij de eerste echte markt noemde ChatGPT **Feenstra drie keer**, en Feenstra
 * stond niet in onze lijst. Daarmee was de best zichtbare partij van die markt
 * onzichtbaar voor de kansdetectie: de kansen konden nergens tegen afgezet
 * worden. Het scherm toonde die naam wel, maar in één ongesorteerde rij tussen
 * `Daikin`, `Werkspot` en `Milieu Centraal`, zonder aantallen en zonder knop.
 *
 * Nu staat wie het vaakst genoemd is bovenaan, staan fabrikanten en platforms
 * apart, en kun je een gemist bedrijf met één klik meenemen.
 *
 * ⚠️ Toevoegen betekent "vanaf de volgende ronde", en dat staat er ook. Een
 * bedrijf halverwege een ronde toevoegen zou een cijfer opleveren dat op minder
 * vragen rust dan dat van de rest.
 */
export function OnbekendeNamen({
  marketId,
  namen,
}: {
  marketId: string;
  namen: OnbekendeNaam[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [bezig, setBezig] = useState<string | null>(null);
  const [toegevoegd, setToegevoegd] = useState<string[]>([]);

  if (namen.length === 0) return null;

  const bedrijven = namen.filter((n) => n.soort === "mogelijk_bedrijf");
  const merken = namen.filter((n) => n.soort === "merk_of_bron");

  async function voegToe(naam: string) {
    setBezig(naam);
    try {
      const res = await fetch(`/api/sales/markets/${marketId}/add-company`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naam }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast({ title: "Niet toegevoegd", description: data.error, intent: "fout" });
        return;
      }
      setToegevoegd((eerder) => [...eerder, naam]);
      toast({
        title: `${naam} doet mee`,
        description: "Vanaf de volgende meetronde telt dit bedrijf mee in deze markt.",
        intent: "succes",
      });
      router.refresh();
    } catch {
      toast({ title: "De verbinding viel weg", intent: "fout" });
    } finally {
      setBezig(null);
    }
  }

  return (
    <section className="card flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Genoemd, maar niet in onze lijst</h2>
        <p className="mt-1 text-secondary">
          De AI noemde deze partijen in de antwoorden over deze markt. Dat betekent één van twee
          dingen: onze lijst mist een bedrijf, of het is een merk of een vergelijkingssite. Wie
          vaak genoemd wordt en een bedrijf lijkt, staat bovenaan.
        </p>
      </div>

      {bedrijven.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="mono-label">Lijkt een bedrijf uit deze markt</span>
          {bedrijven.map((n) => (
            <div
              key={n.naam}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2 last:border-0"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium">{n.naam}</span>
                <span className="mono-label">
                  {n.keer} {n.keer === 1 ? "keer genoemd" : "keer genoemd"}
                </span>
              </div>
              {toegevoegd.includes(n.naam) ? (
                <span className="chip chip-success">doet mee vanaf de volgende ronde</span>
              ) : (
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={bezig === n.naam}
                  onClick={() => void voegToe(n.naam)}
                >
                  {bezig === n.naam ? "Bezig" : "Neem mee in deze markt"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {merken.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="mono-label">Merken, platforms en voorlichting</span>
          <p className="text-sm text-secondary">
            {merken.map((n) => `${n.naam} (${n.keer}x)`).join(" · ")}
          </p>
          <p className="text-sm text-secondary">
            Deze horen niet in een lijst met prospects: het zijn fabrikanten, vergelijkingssites of
            voorlichters. Ze tellen wel mee als bron in het antwoord.
          </p>
        </div>
      )}
    </section>
  );
}
