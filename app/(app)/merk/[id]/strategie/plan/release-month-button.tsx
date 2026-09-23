"use client";

import { useState } from "react";
import { useRefresh } from "@/components/use-refresh";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";
import { streefdatum, formatDag } from "@/lib/pagina-stand";

/**
 * De enige knop van de leesweergave: geef deze maand vrij.
 *
 * ⚠️ Dezelfde dialoog en dezelfde route als op het planbord
 * (`plan-view.tsx`, `maandActie`). Twee knoppen die hetzelfde zouden moeten
 * doen drijven uit elkaar (conventie P2), dus de tekst zegt hier hetzelfde: wat
 * er gebeurt, dat het geld kost, en dat elke tekst daarna aan hem voorgelegd
 * wordt. Een klant die vrijgeeft moet dat op beide schermen even goed weten.
 */
export function ReleaseMonthButton({
  profileId,
  monthId,
  monthNumber,
  paginas,
  eersteDatum,
}: {
  profileId: string;
  monthId: string;
  monthNumber: number;
  paginas: number;
  /**
   * De vroegste publicatiedatum in deze maand, of `null`. Daaruit volgt de
   * streefdatum voor de antwoorden die de dialoog noemt (`streefdatum()`).
   */
  eersteDatum: string | null;
}) {
  const { refresh, refreshing } = useRefresh();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // ⚠️ De knop laat pas los als het scherm de nieuwe stand heeft, niet als de
  // aanvraag de deur uit is. Zie `components/use-refresh.ts`.
  const wacht = busy || refreshing;

  async function vrijgeven() {
    setBusy(true);
    try {
      const res = await fetch(`/api/profiles/${profileId}/plan/months/${monthId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actie: "goedkeuren" }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        toast({
          intent: "fout",
          title: "Dat lukte niet",
          description: j?.error ?? "Probeer het opnieuw.",
        });
        return;
      }
      const j = (await res.json().catch(() => null)) as { voorbereid?: number; zonderOnderwerp?: number } | null;
      const los = j?.zonderOnderwerp ?? 0;
      toast({
        intent: los > 0 ? "waarschuwing" : "succes",
        title: `Maand ${monthNumber} vrijgegeven`,
        description:
          "De vragen voor deze maand staan binnen een paar minuten onder Openstaande vragen." +
          (los > 0
            ? ` ${los === 1 ? "1 pagina hangt" : `${los} pagina's hangen`} nog aan geen cluster en ${los === 1 ? "wordt" : "worden"} niet voorbereid.`
            : ""),
      });
      refresh();
    } catch {
      toast({
        intent: "fout",
        title: "Geen verbinding",
        description: "Controleer je internet en probeer het opnieuw.",
      });
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn-primary w-fit"
        onClick={() => setOpen(true)}
        disabled={wacht}
      >
        Geef deze maand vrij
      </button>

      <ConfirmDialog
        open={open}
        title={`Maand ${monthNumber} vrijgeven`}
        // Sinds 23 september 2026 (`docs/tasks/contentflow-een-lijn.md` §3.1):
        // vrijgeven zet eerst de vragen klaar; geschreven wordt er pas als die
        // gedaan zijn. De oude zin beloofde dat het schrijven meteen begon.
        body={`Na vrijgeven zetten we binnen een paar minuten de vragen voor ${
          paginas === 1 ? "deze pagina" : `deze ${paginas} pagina's`
        } klaar, onder Openstaande vragen.${
          eersteDatum && streefdatum(eersteDatum)
            ? ` Beantwoord ze graag vóór ${formatDag(streefdatum(eersteDatum)!)} om op schema te blijven.`
            : ""
        } Een pagina wordt geschreven zodra al zijn vragen beantwoord of overgeslagen zijn, en daarna leggen we de tekst aan je voor.`}
        irreversible={{
          title: "Dit zet het werk in gang",
          description:
            "Elke pagina die geschreven wordt kost geld. Klopt de indeling niet, overleg dan eerst met je consultant.",
        }}
        confirmLabel="Vrijgeven"
        confirmingLabel="Bezig…"
        busy={wacht}
        onCancel={() => setOpen(false)}
        onConfirm={() => void vrijgeven()}
      />
    </>
  );
}
