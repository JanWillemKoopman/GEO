"use client";

import { useEffect, useRef } from "react";

/**
 * Een bevestiging vóór een handeling die je niet terug kunt draaien.
 *
 * ── WAAROM DIT EEN EIGEN BLOK HEEFT EN GEEN ZINNETJE ────────────────────────
 *
 * Nova zet bij drie van hun vier dialogen een apart kopje `cannotBeUndoneTitle`
 * met een `cannotBeUndoneDescription` eronder, visueel afgezet van de lopende
 * tekst. Niet als waarschuwing tússen de uitleg, maar als eigen blok. En de
 * gevolgen staan er letterlijk: "Once approved, these pages are scheduled for
 * posting."
 *
 * Dat is de moeite waard om over te nemen. Een waarschuwing in een alinea wordt
 * gelezen als toon; een waarschuwing in een eigen kader wordt gelezen als feit.
 *
 * ── DE BEWEGING KOMT VAN NOVA ───────────────────────────────────────────────
 *
 * `modal-overlay-in` 0,15s en `modal-content-in` 0,15s vanaf `scale(.96)`. Niet
 * vanaf onder, niet met een veer: een dialoog die opvalt door zijn beweging
 * leidt af van waar hij over gaat.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  irreversible,
  confirmLabel,
  confirmingLabel,
  busy = false,
  danger = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  body: string;
  /** Het aparte blok. Weglaten als de handeling wél terug te draaien is. */
  irreversible?: { title: string; description: string };
  confirmLabel: string;
  confirmingLabel?: string;
  busy?: boolean;
  danger?: boolean;
  /** De bevestiging staat uit zolang de invoer nog niet klopt. */
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Extra invoer binnen de dialoog, bijvoorbeeld het pad bij "markeer als geplaatst". */
  children?: React.ReactNode;
}) {
  const paneel = useRef<HTMLDivElement>(null);

  // Escape sluit, en de focus gaat naar het paneel zodat een toetsenbordgebruiker
  // niet achter de dialoog blijft hangen.
  useEffect(() => {
    if (!open) return;
    paneel.current?.focus();
    function toets(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", toets);
    return () => document.removeEventListener("keydown", toets);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="modal-overlay absolute inset-0"
        aria-label="Sluiten"
        onClick={() => !busy && onCancel()}
      />
      <div
        ref={paneel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal-panel relative w-full max-w-md"
      >
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-secondary">{body}</p>

          {children}

          {irreversible && (
            <div className="card card-danger flex flex-col gap-1">
              <span
                className="mono-label"
                style={{ color: "var(--intent-danger-text)" }}
              >
                {irreversible.title}
              </span>
              <p className="text-sm text-secondary">{irreversible.description}</p>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              className="btn-outline"
              onClick={onCancel}
              disabled={busy}
            >
              Annuleren
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={onConfirm}
              disabled={busy || confirmDisabled}
              style={
                danger
                  ? { background: "var(--intent-danger-solid)" }
                  : undefined
              }
            >
              {busy ? (confirmingLabel ?? "Bezig…") : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
