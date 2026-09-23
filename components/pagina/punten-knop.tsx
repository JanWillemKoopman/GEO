"use client";

/**
 * De gebeurtenis waarmee de kaart "Aan zet" het puntenvenster opent.
 *
 * De kaart is een servercomponent en het venster woont in `ContentWerkblad`,
 * een clientcomponent ernaast. Een functie kan niet over die grens
 * (`herschrijf-context.tsx` legt uit wat dat eerder opleverde), een
 * gebeurtenis op `window` wel.
 */
export const PUNTEN_OPLOSSEN = "orbit:punten-oplossen";

/** "Los de punten op": opent het puntenvenster op het eerste punt zonder keuze. */
export function PuntenKnop({ aantal }: { aantal: number }) {
  return (
    <button type="button" className="btn-primary" onClick={() => window.dispatchEvent(new Event(PUNTEN_OPLOSSEN))}>
      {aantal === 1 ? "Los het punt op" : `Los de ${aantal} punten op`}
    </button>
  );
}
