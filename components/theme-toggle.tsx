"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";

type Stand = "light" | "dark";

const SLEUTEL = "orbit-thema";

/**
 * De schakelaar tussen de lichte en de donkere stand, rechtsboven in de balk.
 *
 * ── DRIE STANDEN, TWEE KNOPPEN ─────────────────────────────────────────────
 *
 * De app kent er strikt genomen drie: licht, donker, en "wat het toestel zelf
 * doet". Die derde is de startstand en er is bewust géén knop voor. Iemand die
 * zijn laptop 's avonds op donker zet, verwacht dat een app dat volgt zonder
 * dat hij het per app moet regelen. Pas als hij hier klikt, kiest hij, en vanaf
 * dat moment wint zijn keuze van het toestel.
 *
 * Dat betekent dat deze knop bij het eerste bezoek moet weten wat het toestel
 * doet, en dat kan alleen in de browser. Vandaar de `useEffect`: op de server is
 * de stand onbekend en tekenen we de knop leeg, met vaste afmetingen zodat de
 * balk niet verspringt zodra hij zich vult. Zie `docs/ux-design.md` §5.
 *
 * ── WAAROM localStorage EN NIET DE DATABASE ────────────────────────────────
 *
 * Licht of donker is een eigenschap van het scherm waar je op zit, niet van het
 * account. Dezelfde consultant kan op zijn laptop donker willen en op de beamer
 * in een demogesprek licht. In de database zou de keuze meereizen en dat is
 * precies verkeerd. Bovendien scheelt het een tabel, een migratie en een
 * schrijfroute, voor iets wat de browser gratis onthoudt.
 *
 * Het anti-flitsscript in `app/layout.tsx` leest dezelfde sleutel, vóór de
 * eerste tekening. Verander je de naam hier, verander hem daar dan mee.
 */
export function ThemeToggle() {
  const [stand, setStand] = useState<Stand | null>(null);

  useEffect(() => {
    // Eerst de eigen keuze, dan pas het toestel. Dezelfde volgorde als in de
    // CSS, waar `[data-theme]` van de mediaquery wint.
    const gekozen = document.documentElement.getAttribute("data-theme");
    if (gekozen === "light" || gekozen === "dark") {
      setStand(gekozen);
      return;
    }
    setStand(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);

  function wissel() {
    const nieuw: Stand = stand === "dark" ? "light" : "dark";
    setStand(nieuw);

    // Overgangen uit tijdens de omslag, en er weer aan zodra de browser de
    // nieuwe stand getekend heeft. Anders animeren alle vlakken, randen en
    // teksten 120 milliseconden lang tegelijk mee, en dat leest als een veeg
    // over het scherm in plaats van als een omslag. De regel zelf staat in
    // globals.css onder `.thema-wisselt`.
    const wortel = document.documentElement;
    wortel.classList.add("thema-wisselt");
    wortel.setAttribute("data-theme", nieuw);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => wortel.classList.remove("thema-wisselt"));
    });

    try {
      window.localStorage.setItem(SLEUTEL, nieuw);
    } catch {
      // Privémodus of geblokkeerde opslag. De stand geldt dan voor dit tabblad
      // en is de volgende keer weg. Dat is een mindere uitkomst, geen fout, en
      // zeker geen reden om de schakelaar te laten struikelen.
    }
  }

  // Vóór de eerste meting weten we de stand niet. Een lege plek van dezelfde
  // maat is beter dan een knop die een halve tel het verkeerde icoon toont.
  if (stand === null) {
    return <div className="h-9 w-9" aria-hidden />;
  }

  const naarDonker = stand === "light";

  return (
    <button
      type="button"
      onClick={wissel}
      className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
      aria-label={naarDonker ? "Naar de donkere weergave" : "Naar de lichte weergave"}
      title={naarDonker ? "Donkere weergave" : "Lichte weergave"}
    >
      <Icon naam={naarDonker ? "donker" : "licht"} size={18} />
    </button>
  );
}
