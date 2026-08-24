"use client";

import { useActionState } from "react";
import { Lock, Mail } from "lucide-react";
import { AuthLabel } from "./auth-card";
import { requestPasswordReset, updatePassword, type AuthState } from "./actions";

/**
 * De twee wachtwoordherstel-formulieren (docs/tasks/onboarding-2.0.md, blok A).
 *
 * Bewust niet in `auth-form.tsx` gepropt: dat component doet inloggen en
 * registreren met één e-mail- en één wachtwoordveld. Herstel heeft één keer
 * alleen een e-mailveld en één keer twee wachtwoordvelden, en dat er met vlaggen
 * in wringen levert een component op dat vier vormen kent en geen ervan goed.
 *
 * De maatvoering is sinds 24 augustus 2026 dezelfde als die van het
 * inlogformulier: velden van 48 pixels met een icoon erin, een knop van 50.
 * Wie hier belandt komt van het inlogscherm, en twee formaten formulier achter
 * elkaar leest als twee verschillende producten.
 */

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="-mt-4 text-sm text-[var(--status-error)]" role="alert">
      {error}
    </p>
  );
}

export function PasswordResetRequestForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(requestPasswordReset, {
    error: null,
  });

  return (
    <form action={formAction} className="flex flex-col gap-[30px]">
      <div className="flex flex-col gap-2.5">
        <AuthLabel htmlFor="herstel-email" required>
          Werk-e-mailadres
        </AuthLabel>
        <div className="relative">
          <Mail
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute left-[15px] top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            id="herstel-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="jij@bedrijf.nl"
            className="auth-field"
          />
        </div>
      </div>

      <ErrorLine error={state.error} />

      <button type="submit" disabled={pending} className="auth-submit -mt-1">
        {pending ? "Versturen…" : "Stuur me een herstel-link"}
      </button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(updatePassword, {
    error: null,
  });

  return (
    <form action={formAction} className="flex flex-col gap-[30px]">
      <div className="flex flex-col gap-2.5">
        <AuthLabel htmlFor="nieuw-wachtwoord" required>
          Nieuw wachtwoord
        </AuthLabel>
        <div className="relative">
          <Lock
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute left-[15px] top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            id="nieuw-wachtwoord"
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Minimaal 8 tekens"
            className="auth-field"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <AuthLabel htmlFor="nieuw-wachtwoord-nogmaals" required>
          Nogmaals
        </AuthLabel>
        <div className="relative">
          <Lock
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute left-[15px] top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            id="nieuw-wachtwoord-nogmaals"
            type="password"
            name="password_repeat"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Herhaal het wachtwoord"
            className="auth-field"
          />
        </div>
      </div>

      <ErrorLine error={state.error} />

      <button type="submit" disabled={pending} className="auth-submit -mt-1">
        {pending ? "Opslaan…" : "Wachtwoord opslaan"}
      </button>
    </form>
  );
}
