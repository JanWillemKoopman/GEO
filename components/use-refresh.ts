"use client";

/**
 * Het scherm verversen, en weten wanneer dat klaar is.
 *
 * ── ⚠️ DE FOUT DIE DIT REPAREERT (28 AUGUSTUS 2026) ─────────────────────────
 *
 * Dertien knoppen deden hetzelfde: een `fetch()` naar een API-route, en daarna
 * `router.refresh()` om het scherm de nieuwe stand te laten ophalen. En daarna,
 * in een `finally`, hun bezig-stand weer uit.
 *
 * `router.refresh()` geeft niets terug om op te wachten. Die `finally` liep dus
 * op hetzelfde moment als de aanvraag de deur uit ging, niet als het antwoord
 * binnen was. Wat de klant zag: de knop springt terug, het bevestigingsvenster
 * sluit, er komt een melding "maand 3 vrijgegeven", en dan staan de cijfers op
 * het scherm nog een seconde of langer op de oude waarde. De app zei klaar en
 * was het niet, en dat is precies waarom knoppen traag voelen ook als ze het
 * niet zijn.
 *
 * `useTransition` lost dat op zoals React het bedoeld heeft: `bezig` blijft
 * waar tot de server de nieuwe pagina heeft teruggestuurd én React hem heeft
 * getekend. De knop laat dus los op het moment dat het scherm klopt.
 *
 * ⚠️ Dit is geen vervanging van de eigen bezig-stand van een knop. Die dekt de
 * `fetch()` (het werk), deze dekt de verversing (het scherm). Een knop die
 * allebei goed doet, zet ze naast elkaar: `disabled={bezig || verversen}`.
 */
import { useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";

export function useRefresh(): { refresh: () => void; refreshing: boolean } {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();

  const refresh = useCallback(() => {
    startTransition(() => router.refresh());
  }, [router]);

  return { refresh, refreshing };
}
