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

/**
 * "Keur goed": dezelfde route als altijd, met de eindpoort erachter.
 *
 * ── ⚠️ ALTIJD TE KIEZEN, OOK MET OPEN PUNTEN (23 september 2026) ────────────
 *
 * Besluit van de eigenaar: de klant kan een tekst altijd goedkeuren, ook als de
 * score laag is of er punten openstaan die de app publicatie laat tegenhouden.
 * Tot vandaag verdween de knop zolang er zo'n punt was, en stond er "Bekijk de
 * 5 punten" op zijn plek: wie de tekst goed genoeg vond, kon niet verder.
 *
 * De route weigerde dat nooit (`keurTekstGoed()` kijkt alleen naar open
 * vragen, niet naar de kwaliteit); het slot zat alleen in het scherm. Wat er nu
 * wel staat: bij open punten wordt één klik er twee, en de tweede noemt het
 * aantal. Zelfde patroon als "Dit staat live" in `publish-box.tsx`: niet
 * blokkeren, wel niet verzwijgen.
 *
 * De eindpoort op open vragen blijft (28 augustus 2026, `lib/content-final-gate.ts`):
 * weigert de route, dan staat zijn melding onder de knop, met de uitweg erin.
 */
export function KeurGoedKnop({
  analysisId,
  pieceId,
  openPunten = 0,
}: {
  analysisId: string;
  pieceId: string;
  /** Hoeveel punten publicatie tegenhouden. Meer dan nul: eerst bevestigen. */
  openPunten?: number;
}) {
  const { bezig, fout, doe } = useActie();
  const [bevestigen, setBevestigen] = useState(false);
  const keurGoed = () => void doe(`/api/analyses/${analysisId}/content/${pieceId}/approve`, {});

  if (bevestigen) {
    return (
      <div className="flex w-full flex-col gap-2">
        <p className="type-body">
          {openPunten === 1 ? "Er staat nog 1 punt open." : `Er staan nog ${openPunten} punten open.`} Keur je de
          tekst nu goed, dan blijven die in de tekst staan.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" disabled={bezig} onClick={keurGoed}>
            {bezig ? "Bezig…" : "Ja, keur toch goed"}
          </button>
          <button type="button" className="btn-outline" disabled={bezig} onClick={() => setBevestigen(false)}>
            Eerst verbeteren
          </button>
        </div>
        <Fout tekst={fout} />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="btn-primary"
        disabled={bezig}
        onClick={() => (openPunten > 0 ? setBevestigen(true) : keurGoed())}
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
