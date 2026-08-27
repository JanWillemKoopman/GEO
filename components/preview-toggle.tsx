"use client";

import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";
import { setClientPreview } from "@/app/(app)/workspace-actions";

/**
 * De wisselknop tussen "jouw weergave" en "wat een klant ziet", alleen
 * getoond aan beheerders (`app/(app)/layout.tsx` rendert dit component alleen
 * als `isStaffAccount()` waar is, ongeacht of de klantweergave al aanstaat).
 *
 * ── TWEE STANDEN, BEWUST ONGELIJK VAN VORM ──────────────────────────────────
 *
 * Uit staat als een gewone icoonknop, net als de themaschakelaar ernaast: iets
 * dat je gebruikt en weer vergeet. Aan staat als een gekleurde pil met tekst
 * erop, want dit is het soort stand die je NIET mag vergeten dat hij aanstaat.
 * Een beheerder die op de klantweergave staat en denkt dat hij zijn eigen
 * account bekijkt, trekt de verkeerde conclusie uit alles wat hij daarna ziet.
 *
 * De klik roept de server action rechtstreeks aan (net als de merkkiezer
 * `selectBrand`); die zet de cookie en stuurt terug naar dezelfde pagina, zodat
 * het scherm meteen opnieuw tekent met de nieuwe rechten.
 */
export function PreviewToggle({ previewing }: { previewing: boolean }) {
  const pathname = usePathname();

  if (previewing) {
    return (
      <button
        type="button"
        onClick={() => void setClientPreview(false, pathname)}
        className="chip chip-warning flex h-9 items-center gap-1.5 px-3 transition-opacity hover:opacity-80"
        title="Je bekijkt de app nu zoals een klant hem ziet"
      >
        <Icon naam="klantweergave" size={14} />
        Klantweergave
        <Icon naam="sluiten" size={12} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void setClientPreview(true, pathname)}
      className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]"
      aria-label="Bekijk als klant"
      title="Bekijk als klant"
    >
      <Icon naam="klantweergave" size={18} />
    </button>
  );
}
