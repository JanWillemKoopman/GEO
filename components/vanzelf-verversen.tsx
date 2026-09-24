"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Ververst een serverpagina op de achtergrond zolang hij openstaat.
 *
 * Voor een wachtstand zonder eigen statusroute, zoals de reputatieanalyse die
 * loopt (UX-audit 23 september 2026, P2.10). Daar stond "ververs deze pagina":
 * de enige wachtstand in de app waar de klant zelf moest verversen. Elke 20
 * seconden, dezelfde maat als `components/cluster-melder.tsx`, en alleen als
 * het tabblad zichtbaar is: een verborgen tabblad hoeft de server niet te
 * bevragen.
 */
export function VanzelfVerversen({ seconden = 20 }: { seconden?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconden * 1000);
    return () => window.clearInterval(id);
  }, [router, seconden]);
  return null;
}
