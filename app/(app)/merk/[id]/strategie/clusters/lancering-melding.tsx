"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";

/**
 * "Cluster gelanceerd", de melding waarmee je op dit scherm terugkomt.
 *
 * ── WAAROM DIT EEN MELDING IS EN GEEN SCHERM ────────────────────────────────
 *
 * Tot 22 september 2026 landde je na "Bevestig en start de meting" op een
 * wachtscherm met een voortgangsbalk. Dat scherm deed niets wat de server niet
 * zelf doet: de meettaken staan al in de wachtrij vóórdat de knop antwoord
 * geeft (`app/api/analyses/[id]/confirm/route.ts`), en ze lopen door als je de
 * tab sluit. Wat overbleef was wachten op iets waar je niet bij hoeft te zijn.
 *
 * Nu kom je terug op je clusters, en zegt één melding wat er loopt en wat je
 * ervan gaat merken. De uitslag komt later vanzelf, waar je dan ook bent
 * (`components/cluster-melder.tsx`).
 *
 * ── WAAROM HET ADRES DAARNA SCHOONGEMAAKT WORDT ────────────────────────────
 *
 * `?gelanceerd=1` blijft anders in de bladwijzer en in de terugknop staan, en
 * dan krijg je de melding opnieuw bij een scherm waar niets nieuws gebeurd is.
 * `router.replace` haalt hem weg zonder een extra stap in de geschiedenis.
 */
export function LanceringMelding({ merkId }: { merkId: string }) {
  const toast = useToast();
  const router = useRouter();
  // React draait een effect in ontwikkelmodus twee keer. Zonder deze vlag is
  // dat twee identieke meldingen onder elkaar.
  const gedaan = useRef(false);

  useEffect(() => {
    if (gedaan.current) return;
    gedaan.current = true;
    toast({
      title: "Cluster gelanceerd",
      description:
        "Je nieuwe cluster wordt nu gemeten. Zodra het klaar is staan de vragen bij Openstaande " +
        "vragen en de voorgestelde pagina's in je Contentplan.",
      intent: "succes",
      // Langer dan de standaard zes seconden: er staan twee bestemmingen in die
      // de klant nog niet kent, en die wil je kunnen lezen.
      duration: 12_000,
    });
    router.replace(`/merk/${merkId}/strategie/clusters`);
  }, [toast, router, merkId]);

  return null;
}
