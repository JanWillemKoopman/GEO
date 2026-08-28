"use client";

import { useState } from "react";
import { useRefresh } from "@/components/use-refresh";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast";

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
}: {
  profileId: string;
  monthId: string;
  monthNumber: number;
  paginas: number;
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
      toast({
        intent: "succes",
        title: `Maand ${monthNumber} vrijgegeven`,
        description:
          "ORBIT ENGINE begint tien dagen voor elke publicatiedatum met schrijven.",
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
        body={`Je geeft ${paginas} ${
          paginas === 1 ? "pagina" : "pagina's"
        } in één keer vrij om geschreven te worden. ORBIT ENGINE begint tien dagen voor elke publicatiedatum, en legt elke tekst daarna aan jou voor.`}
        irreversible={{
          title: "Dit zet het schrijven in gang",
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
