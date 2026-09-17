"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthLabel } from "./auth-card";
import { Alert } from "@/components/alert";
import type { AuthState } from "./actions";

/**
 * Het registratieformulier. Inloggen heeft sinds stap 8 zijn eigen
 * `login/login-form.tsx` (met een oogknop in het wachtwoordveld); dit
 * component deed ooit beide met een `mode`-prop, maar de inlogtak was al een
 * tijd dood (`register/page.tsx` is de enige aanroeper, altijd met
 * `mode="register"`). Twee vormen in één component voor een tak die niemand
 * meer aanroept is precies het soort halve implementatie die niet moet
 * blijven staan, dus die tak is weg.
 */
export function AuthForm({
  action,
  signupsEnabled,
}: {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  /** Toont de link "Al een account? Inloggen" alleen als registratie openstaat
   *  (bouwfase = dicht); zonder registratie is er niemand die deze pagina
   *  bereikt om aan die link iets te hebben. */
  signupsEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <AuthLabel htmlFor="email" required>
          Werk-e-mailadres
        </AuthLabel>
        <input
          id="email"
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="jij@bedrijf.nl"
          className="field field-lg"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <AuthLabel htmlFor="wachtwoord" required>
          Wachtwoord
        </AuthLabel>
        <input
          id="wachtwoord"
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Minimaal 8 tekens"
          className="field field-lg"
        />
      </div>

      {state.error && (
        <Alert intent="danger" role="alert">
          {state.error}
        </Alert>
      )}

      <button type="submit" disabled={pending} className="btn-primary btn-lg mt-2 w-full">
        {pending ? "Bezig…" : "Account aanmaken"}
      </button>

      {signupsEnabled && (
        <p className="type-compact mt-2 text-center">
          Al een account?{" "}
          <Link
            href="/login"
            className="text-[var(--text-primary)] underline underline-offset-2 hover:text-[var(--text-secondary)]"
          >
            Inloggen
          </Link>
        </p>
      )}
    </form>
  );
}
