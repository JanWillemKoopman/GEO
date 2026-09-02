"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

/**
 * Een hermeting vooruit zetten op een datum.
 *
 * ── WAAROM DIT NAAST DE KNOP STAAT EN HEM NIET VERVANGT ─────────────────────
 *
 * De knop "Meet deze markt opnieuw" is voor nu, deze datum is voor straks. Het
 * verschil dat telt: het sterkste verkoopmoment van deze module is een DALING,
 * en die bestaat pas als er twee metingen met tijd ertussen liggen. Wie op de
 * knop drukt omdat hij er toch is, meet een markt die vanochtend nog gemeten is
 * en krijgt precies dezelfde cijfers terug, voor hetzelfde geld.
 *
 * ⚠️ Op de geplande dag wordt er ECHT gemeten, zonder tweede bevestiging. Dat
 * staat er met zoveel woorden bij, want het is een knop die op een dag in de
 * toekomst geld uitgeeft, en dat hoort niemand te verrassen.
 */
export function HermetingPlannen({
  marketId,
  gepland,
  notitie,
  ramingEur,
}: {
  marketId: string;
  /** De geplande datum als `YYYY-MM-DD`, of leeg. */
  gepland: string | null;
  /** Wat er van een vorige geplande hermeting terugkwam. */
  notitie: string | null;
  ramingEur: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [datum, setDatum] = useState(gepland ?? "");
  const [bezig, setBezig] = useState(false);

  // Morgen is de eerste dag die je kunt kiezen: wie vandaag wil meten, gebruikt
  // de knop ernaast.
  const morgen = new Date();
  morgen.setDate(morgen.getDate() + 1);
  const eerste = morgen.toISOString().slice(0, 10);

  async function bewaar(nieuweDatum: string) {
    setBezig(true);
    try {
      const res = await fetch(`/api/sales/markets/${marketId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datum: nieuweDatum || null }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast({ title: "Niet gelukt", description: data.error, intent: "fout" });
        return;
      }
      toast({
        title: nieuweDatum ? "De hermeting staat gepland" : "De geplande hermeting is weg",
        description: nieuweDatum
          ? "Op die dag meet ORBIT ENGINE deze markt opnieuw, met dezelfde vragen."
          : undefined,
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
    <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-4">
      <div>
        <h3 className="font-medium">Of zet hem vooruit</h3>
        <p className="mt-1 text-secondary">
          Kies een datum, dan meet ORBIT ENGINE deze markt op die dag zelf opnieuw, met exact
          dezelfde vragen. Je hoeft er dan niet bij te zijn. Het kost op die dag ongeveer{" "}
          {`€ ${ramingEur.toFixed(2).replace(".", ",")}.`}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="mono-label">Datum</span>
          <input
            type="date"
            className="field"
            value={datum}
            min={eerste}
            onChange={(e) => setDatum(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn-outline"
          disabled={bezig || !datum || datum === gepland}
          onClick={() => void bewaar(datum)}
        >
          {gepland ? "Datum aanpassen" : "Zet de hermeting klaar"}
        </button>
        {gepland && (
          <button
            type="button"
            className="btn-ghost"
            disabled={bezig}
            onClick={() => {
              setDatum("");
              void bewaar("");
            }}
          >
            Haal de planning weg
          </button>
        )}
      </div>

      {gepland && (
        <p className="text-sm text-secondary">
          Staat gepland voor {new Date(`${gepland}T06:00:00Z`).toLocaleDateString("nl-NL")}. Je krijgt
          die dag een nieuwe ronde met dezelfde vragen, en de uitkomst staat klaar als je begint.
        </p>
      )}
      {notitie && <p className="text-sm text-secondary">{notitie}</p>}
    </div>
  );
}
