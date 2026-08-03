"use client";

import { useActionState } from "react";
import { requestPasswordReset, updatePassword, type AuthState } from "./actions";

/**
 * De twee wachtwoordherstel-formulieren (docs/tasks/onboarding-2.0.md, blok A).
 *
 * Bewust niet in `auth-form.tsx` gepropt: dat component doet inloggen en
 * registreren met één e-mail- en één wachtwoordveld. Herstel heeft één keer
 * alleen een e-mailveld en één keer twee wachtwoordvelden, en dat er met vlaggen
 * in wringen levert een component op dat vier vormen kent en geen ervan goed.
 */

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="text-sm text-[var(--status-error)]" role="alert">
      {error}
    </p>
  );
}

export function PasswordResetRequestForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(requestPasswordReset, {
    error: null,
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="mono-label">E-mail</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="jij@bedrijf.nl"
          className="field"
        />
      </label>

      <ErrorLine error={state.error} />

      <button
        type="submit"
        disabled={pending}
        className="btn-primary mt-1 w-full disabled:opacity-60"
      >
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
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="mono-label">Nieuw wachtwoord</span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="minimaal 8 tekens"
          className="field"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="mono-label">Nogmaals</span>
        <input
          type="password"
          name="password_repeat"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="herhaal het wachtwoord"
          className="field"
        />
      </label>

      <ErrorLine error={state.error} />

      <button
        type="submit"
        disabled={pending}
        className="btn-primary mt-1 w-full disabled:opacity-60"
      >
        {pending ? "Opslaan…" : "Wachtwoord opslaan"}
      </button>
    </form>
  );
}
