"use client";

import { useActionState, useState } from "react";
import { AuthLabel } from "./auth-card";
import { Alert } from "@/components/alert";
import { Icon } from "@/components/icon";
import { requestPasswordReset, updatePassword, type AuthState } from "./actions";

/**
 * De twee wachtwoordherstel-formulieren (docs/tasks/onboarding-2.0.md, blok A).
 *
 * Bewust niet in `auth-form.tsx` gepropt: dat component doet alleen
 * registreren, met één e-mail- en één wachtwoordveld zonder oogknop. Herstel
 * heeft één keer alleen een e-mailveld en één keer twee wachtwoordvelden mét
 * oogknop, en dat er met vlaggen in wringen levert een component op dat drie
 * vormen kent en geen ervan goed.
 *
 * De maatvoering is dezelfde als die van het inlogformulier (`login-form.tsx`,
 * stap 8 van de redesign): `.field-lg`, `Alert` voor de foutmelding, geen
 * iconen in de velden zelf behalve de wachtwoordwissel.
 */
export function PasswordResetRequestForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(requestPasswordReset, {
    error: null,
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <AuthLabel htmlFor="herstel-email" required>
          Werk-e-mailadres
        </AuthLabel>
        <input
          id="herstel-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="jij@bedrijf.nl"
          className="field field-lg"
        />
      </div>

      {state.error && (
        <Alert intent="danger" role="alert">
          {state.error}
        </Alert>
      )}

      <button type="submit" disabled={pending} className="btn-primary btn-lg mt-2 w-full">
        {pending ? "Versturen…" : "Stuur me een herstel-link"}
      </button>
    </form>
  );
}

/** Eén wachtwoordveld met een oogknop erin, zodat `NewPasswordForm` hem twee
 *  keer kan neerzetten zonder de opbouw te herhalen. Elk veld heeft zijn
 *  eigen zichtbaarheidsstaat: tonen bij "Nieuw wachtwoord" hoeft niet ook
 *  "Nogmaals" te tonen. */
function WachtwoordVeld({
  id,
  name,
  label,
  placeholder,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
}) {
  const [zichtbaar, setZichtbaar] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <AuthLabel htmlFor={id} required>
        {label}
      </AuthLabel>
      <div className="relative">
        <input
          id={id}
          type={zichtbaar ? "text" : "password"}
          name={name}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder={placeholder}
          className="field field-lg field-toggle-inset w-full"
        />
        <button
          type="button"
          onClick={() => setZichtbaar((z) => !z)}
          aria-label={zichtbaar ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
          className="icon-btn absolute right-2 top-1/2 -translate-y-1/2"
        >
          <Icon naam={zichtbaar ? "wachtwoordverbergen" : "wachtwoordtonen"} size={17} />
        </button>
      </div>
    </div>
  );
}

export function NewPasswordForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(updatePassword, {
    error: null,
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <WachtwoordVeld
        id="nieuw-wachtwoord"
        name="password"
        label="Nieuw wachtwoord"
        placeholder="Minimaal 8 tekens"
      />
      <WachtwoordVeld
        id="nieuw-wachtwoord-nogmaals"
        name="password_repeat"
        label="Nogmaals"
        placeholder="Herhaal het wachtwoord"
      />

      {state.error && (
        <Alert intent="danger" role="alert">
          {state.error}
        </Alert>
      )}

      <button type="submit" disabled={pending} className="btn-primary btn-lg mt-2 w-full">
        {pending ? "Opslaan…" : "Wachtwoord opslaan"}
      </button>
    </form>
  );
}
