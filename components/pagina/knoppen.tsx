"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * De handelingen in de kaart "Aan zet" (`docs/tasks/contentflow-een-lijn.md` §4.6a).
 *
 * Elk van deze knoppen hoort bij precies één stand. Ze zeggen bij een weigering
 * wat er aan de hand is in plaats van een foutcode, en verversen daarna het
 * scherm, zodat de standbalk en de zin meteen de nieuwe stand tonen.
 */
function useActie() {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  async function doe(url: string, body: unknown) {
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setFout(json?.error ?? "Dat is niet gelukt. Probeer het opnieuw.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setFout("Er is geen verbinding. Probeer het opnieuw.");
      return false;
    } finally {
      setBezig(false);
    }
  }
  return { bezig, fout, doe };
}

function Fout({ tekst }: { tekst: string | null }) {
  if (!tekst) return null;
  return <p className="type-caption w-full text-[var(--intent-danger-content)]">{tekst}</p>;
}

/** "Keur goed": dezelfde route als altijd, met de eindpoort erachter. */
export function KeurGoedKnop({ analysisId, pieceId }: { analysisId: string; pieceId: string }) {
  const { bezig, fout, doe } = useActie();
  return (
    <>
      <button
        type="button"
        className="btn-primary"
        disabled={bezig}
        onClick={() => void doe(`/api/analyses/${analysisId}/content/${pieceId}/approve`, {})}
      >
        {bezig ? "Bezig…" : "Keur goed"}
      </button>
      <Fout tekst={fout} />
    </>
  );
}

/**
 * De keuze bij te weinig onderbouwing: algemeen schrijven of laten vallen.
 * Via de bestaande briefingroute (`pageChoices`), die ook de kostenrem draagt.
 */
export function KeuzeKnoppen({ analysisId, pieceId }: { analysisId: string; pieceId: string }) {
  const { bezig, fout, doe } = useActie();
  return (
    <>
      <button
        type="button"
        className="btn-primary"
        disabled={bezig}
        onClick={() =>
          void doe(`/api/analyses/${analysisId}/briefing`, { pageChoices: [{ id: pieceId, mode: "algemeen" }] })
        }
      >
        Schrijf hem algemeen
      </button>
      <button
        type="button"
        className="btn-outline"
        disabled={bezig}
        onClick={() =>
          void doe(`/api/analyses/${analysisId}/briefing`, { pageChoices: [{ id: pieceId, mode: "laten_vallen" }] })
        }
      >
        Laat deze pagina vallen
      </button>
      <Fout tekst={fout} />
    </>
  );
}
