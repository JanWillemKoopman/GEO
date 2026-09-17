"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { isNewerVersionAvailable } from "@/lib/deployment";

/** Vijf minuten: vaak genoeg voor een dashboardsessie van een uur, zonder de
 *  server bij elke klik te bevragen. */
const CONTROLE_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Melding dat er een nieuwe versie van de app klaarstaat (Nova's
 * `common.deployment`, punt 25 uit
 * `docs/tasks/nova-vergelijking-verbeterpunten.md`).
 *
 * ── WAAROM DIT ER NIET AL WAS ────────────────────────────────────────────
 *
 * ORBIT ENGINE deployt bij elke merge naar main. Zonder deze melding werkt
 * iemand met een sessie van een uur gewoon door op een verouderde JS-bundel,
 * en het eerste zichtbare gevolg is een knop die een fout geeft omdat de API
 * onder zijn voeten is veranderd. Dat oogt als een bug in de app, niet als een
 * deploy die net heeft plaatsgevonden.
 *
 * ── GEEN AUTOMATISCH HERLADEN ────────────────────────────────────────────
 *
 * Nova telt zelf af en herlaadt vanzelf ("NOVA will reload in {seconds}
 * seconds"). Dat kan bij hen omdat vrijwel elk scherm autosave heeft. Hier
 * bewaart het merkprofiel (`brand-wizard.tsx`) pas op een expliciete klik, dus
 * een geforceerd herladen kan werk wegvegen dat alleen nog client-side staat.
 * De klant beslist zelf wanneer, en de browser waarschuwt daar zelf al
 * bovenop via `beforeunload` als er iets openstaat.
 *
 * ── EIGEN PLEK, NIET DE TOAST-HOEK ───────────────────────────────────────
 *
 * Toasts (`components/toast.tsx`) verschijnen rechtsboven en verdwijnen
 * vanzelf: prima voor een gebeurtenis, verkeerd voor iets dat moet blijven
 * staan tot de klant een keuze maakt. Deze balk zit onderin het scherm, met
 * dezelfde glasachtige kaart en schaduw (`.toast-card`), zodat hij bij de rest
 * van de meldingstaal hoort zonder ermee te kunnen overlappen.
 */
export function DeploymentBanner() {
  const [nieuweVersie, setNieuweVersie] = useState(false);
  const [weggeklikt, setWeggeklikt] = useState(false);

  useEffect(() => {
    const eigenVersie = process.env.NEXT_PUBLIC_APP_VERSION ?? "";
    if (!eigenVersie) return;

    let actief = true;

    async function controleer() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { version?: string };
        if (actief && isNewerVersionAvailable(eigenVersie, json.version ?? "")) {
          setNieuweVersie(true);
        }
      } catch {
        // Geen verbinding of even geen antwoord: dit is geen kritieke
        // functie, gewoon de volgende ronde opnieuw proberen.
      }
    }

    void controleer();
    const interval = setInterval(() => void controleer(), CONTROLE_INTERVAL_MS);
    return () => {
      actief = false;
      clearInterval(interval);
    };
  }, []);

  if (!nieuweVersie || weggeklikt) return null;

  return (
    <div
      className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-4"
      role="status"
      aria-live="polite"
    >
      <div className="toast-card pointer-events-auto flex w-full max-w-lg flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Icon naam="opnieuw" size={18} className="mt-0.5 text-[var(--text-secondary)]" />
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium">Er is een nieuwe versie van ORBIT ENGINE</p>
            <p className="text-sm text-secondary">
              Herlaad de pagina om verder te gaan met de laatste versie.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
          <button type="button" onClick={() => setWeggeklikt(true)} className="btn-outline btn-sm">
            Niet nu
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary btn-sm"
          >
            Herlaad nu
          </button>
        </div>
      </div>
    </div>
  );
}
