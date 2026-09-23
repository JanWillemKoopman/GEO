"use client";

import { Alert } from "@/components/alert";
import { Dialog, DialogKnoppen } from "@/components/dialog";

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
  if (!open) return null;

  return (
    <Dialog label={title} onSluit={onCancel} bezig={busy}>
      <div className="flex flex-col gap-3">
        <h2 className="type-title">{title}</h2>
        <p className="text-secondary">{body}</p>

        {children}

        {irreversible && (
          <Alert intent="danger">
            <span className="flex flex-col gap-1">
              <span className="type-compact-emphasis text-[var(--intent-danger-content)]">
                {irreversible.title}
              </span>
              {irreversible.description}
            </span>
          </Alert>
        )}

        <DialogKnoppen>
          {/* De uitweg is een ghost-knop, de handeling de gevulde ernaast
              (`designsystem.md` §9). Bij iets onomkeerbaars is dat
              `.btn-danger` en niet de hoofdknop met een rode inline-kleur: die
              bleef rood als hij uitgeschakeld was en kreeg in de donkere stand
              zwarte letters. */}
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
            Annuleren
          </button>
          <button
            type="button"
            className={danger ? "btn-danger" : "btn-primary"}
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
          >
            {busy ? (confirmingLabel ?? "Bezig…") : confirmLabel}
          </button>
        </DialogKnoppen>
      </div>
    </Dialog>
  );
}
