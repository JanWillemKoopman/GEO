"use client";

import { useEffect, useRef } from "react";

/**
 * De omhulling van elke dialoog in de app: het scrim, het paneel, de focus en
 * Escape. Wat erin staat bepaalt de aanroeper.
 *
 * ── WAAROM DIT BESTAAT (23 september 2026) ──────────────────────────────────
 *
 * Vier dialogen bouwden deze omhulling elk zelf na (`ConfirmDialog`, het
 * puntenvenster, "Nieuwe cluster" en het dagvenster van de kalender), en de
 * vierde week af: een vast zwart scherm van 40% in plaats van `--bg-scrim`,
 * een gewone kaart als paneel, geen animatie en op een telefoon geen blad van
 * onderen. De eerste drie deelden een tweede fout: 16px lucht rondom op een
 * telefoon, zodat het "blad van onderen" los boven de onderrand zweefde met
 * rechte hoeken onderaan. `.dialoog` in `app/globals.css` zet die lucht onder
 * 768px op nul, dezelfde grens waarop `.modal-panel` een blad wordt.
 *
 * `sluitMetEscape={false}` is er voor een dialoog die zijn eigen toetsen
 * afhandelt (het puntenvenster bladert met de pijltjes en sluit zelf).
 */
export function Dialog({
  label,
  onSluit,
  bezig = false,
  sluitMetEscape = true,
  className,
  children,
}: {
  /** Wat een schermlezer voorleest als naam van de dialoog. */
  label: string;
  onSluit: () => void;
  /** Zolang er iets loopt, sluit noch het scrim noch Escape de dialoog. */
  bezig?: boolean;
  sluitMetEscape?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const paneel = useRef<HTMLDivElement>(null);

  // De focus gaat naar het paneel, zodat een toetsenbordgebruiker niet achter
  // de dialoog blijft hangen.
  useEffect(() => {
    paneel.current?.focus();
  }, []);

  useEffect(() => {
    if (!sluitMetEscape) return;
    function toets(e: KeyboardEvent) {
      if (e.key === "Escape" && !bezig) onSluit();
    }
    document.addEventListener("keydown", toets);
    return () => document.removeEventListener("keydown", toets);
  }, [sluitMetEscape, bezig, onSluit]);

  return (
    <div className="dialoog no-print">
      <button
        type="button"
        className="modal-overlay absolute inset-0"
        aria-label="Sluiten"
        onClick={() => !bezig && onSluit()}
      />
      <div
        ref={paneel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`modal-panel relative flex w-full flex-col gap-4 outline-none${className ? ` ${className}` : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

/** De knoppenrij onderaan een dialoog: de uitweg links, de handeling rechts. */
export function DialogKnoppen({ children }: { children: React.ReactNode }) {
  return <div className="dialoog-knoppen">{children}</div>;
}
