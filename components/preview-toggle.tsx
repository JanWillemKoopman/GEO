"use client";

import { usePathname } from "next/navigation";
import { setClientPreview } from "@/app/(app)/workspace-actions";

/**
 * De wisselknop tussen "Admin" en "Klant", alleen getoond aan de admin
 * (`app/(app)/layout.tsx` rendert dit component alleen als `isStaffAccount()`
 * waar is, ongeacht welke weergave nu aanstaat).
 *
 * ── EEN SEGMENT MET TWEE STANDEN ────────────────────────────────────────────
 *
 * Tot 30 september 2026 was dit een icoonknop die een gekleurde "Klantweergave"-
 * pil werd. Nu er precies twee rollen zijn is een wissel van weergave een
 * segment (`docs/designsystem.md`: een wissel van weergave is een segment): je
 * ziet beide standen tegelijk en welke er aanstaat, en de weg terug is één klik
 * op de andere helft. De gekozen stand draagt de kaart, dus een admin die op
 * Klant staat ziet dat aan de knop zonder erover na te denken.
 *
 * De klik roept de server action rechtstreeks aan (net als de merkkiezer
 * `selectBrand`); die zet de cookie en stuurt terug naar dezelfde pagina, zodat
 * het scherm meteen opnieuw tekent met de nieuwe rechten.
 */
export function PreviewToggle({ previewing }: { previewing: boolean }) {
  const pathname = usePathname();

  return (
    <div className="segment" role="group" aria-label="Bekijk de app als">
      <button
        type="button"
        className="segment-item"
        aria-pressed={!previewing}
        onClick={() => {
          if (previewing) void setClientPreview(false, pathname);
        }}
      >
        Admin
      </button>
      <button
        type="button"
        className="segment-item"
        aria-pressed={previewing}
        title="Je bekijkt de app zoals een klant hem ziet"
        onClick={() => {
          if (!previewing) void setClientPreview(true, pathname);
        }}
      >
        Klant
      </button>
    </div>
  );
}
