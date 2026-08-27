"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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
      router.refresh();
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
        disabled={busy}
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
        busy={busy}
        onCancel={() => setOpen(false)}
        onConfirm={() => void vrijgeven()}
      />
    </>
  );
}
