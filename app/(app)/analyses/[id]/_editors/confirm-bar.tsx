"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * De goedkeuringsbalk van het conceptscherm (abcplan.md §3.6/A2c).
 *
 * Deze knop stond eerder onderaan het tabblad "Instellingen", na vijf kaarten
 * scrollen, de enige handeling waarop de hele app staat te wachten, verstopt op
 * de plek die universeel "hier hoef je niet te zijn" betekent.
 *
 * Nu is het een blijvende balk over de volle breedte, op élk schermformaat: je
 * kunt het concept van boven tot onder doorlezen zonder de actie ooit kwijt te
 * raken. De balk is dekkend en niet doorschijnend: sinds 17 september 2026 heeft
 * dit systeem nergens een `backdrop-filter`, want OKX heeft die ook niet.
 */
export function ConfirmBar({
  analysisId,
  profileId,
  activeCount,
}: {
  analysisId: string;
  /** Waar de klant na het bevestigen heen gaat: het clusteroverzicht van dit merk. */
  profileId: string;
  /** Aantal actieve vragen (A.8): wat er gaat gebeuren, niet alleen dat er iets gebeurt. */
  activeCount: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setPending(true);
    setError(null);
    let res: Response;
    try {
      res = await fetch(`/api/analyses/${analysisId}/confirm`, { method: "POST" });
    } catch {
      // De fetch zelf strandde (netwerk/timeout), er is geen response om te lezen.
      setError("Bevestigen is niet gelukt. Probeer het opnieuw.");
      setPending(false);
      return;
    }
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Bevestigen is niet gelukt.");
      setPending(false);
      return;
    }
    // ── WAAR JE NA HET BEVESTIGEN LANDT (22 september 2026) ─────────────────
    //
    // Tot vandaag was dat `/analyses/[id]`, dat dan een wachtscherm liet zien:
    // een halve pagina voortgangsbalk voor werk dat op de server doorloopt, ook
    // als je de tab sluit. Je stond dus te kijken naar iets waar je niets aan
    // kon doen, en daarna naar een resultatenpagina die cijfers herhaalde die
    // op Analytics staan.
    //
    // Nu ga je terug naar je clusteroverzicht, met één melding rechtsonder dat
    // de meting loopt. De uitslag komt je later vanzelf achterna
    // (`components/cluster-melder.tsx`).
    //
    // Buiten de try: bevestigen is al gelukt op de server, dus een fout hier
    // (bv. tijdens router.refresh) mag niet als "bevestigen mislukt" ogen.
    router.push(`/merk/${profileId}/strategie/clusters?gelanceerd=1`);
    router.refresh();
  }

  return (
    <>
      {/* Spacer, zodat de balk het einde van de inhoud nooit bedekt. */}
      <div className="no-print h-24" aria-hidden />
      <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line-muted)] bg-[var(--bg-base)] px-6 py-3">
        {/* Volgt de inhoudsbreedte van `.stand`, anders staat de knop niet onder
            de tekst waar hij bij hoort. */}
        <div
          className="mx-auto flex flex-wrap items-center gap-x-4 gap-y-2"
          style={{ maxWidth: "var(--stand-werken)" }}
        >
          <button
            onClick={() => void confirm()}
            disabled={pending}
            className="btn-primary btn-lg w-full sm:w-auto"
          >
            {pending ? "Meting starten…" : "Bevestig en start de meting"}
          </button>
          {error ? (
            <span className="text-sm text-[var(--status-error)]" role="alert">
              {error}
            </span>
          ) : (
            <span className="hidden text-sm text-muted sm:inline">
              {/* A.8: aankondigen wat er gaat gebeuren, niet alleen dat er iets gebeurt.
                  Sinds 22 september 2026 staat er ook bij waar je heen gaat: je
                  hoeft niet te blijven kijken, want de meting loopt door op de
                  server en je hoort het vanzelf als hij klaar is. */}
              ORBIT ENGINE stelt {activeCount} {activeCount === 1 ? "vraag" : "vragen"} aan AI-assistenten
              en verwerkt de antwoorden. Je gaat terug naar je clusters en werkt gewoon verder; je
              hoort het zodra de meting klaar is.
            </span>
          )}
        </div>
      </div>
    </>
  );
}
