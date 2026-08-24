"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { AuthLabel } from "../auth-card";
import type { AuthState } from "../actions";

/**
 * Het inlogformulier: twee velden, één knop.
 *
 * ── WAAROM DIT NIET IN `auth-form.tsx` ZIT ──────────────────────────────────
 *
 * Om dezelfde reden die boven `password-forms.tsx` staat. Dat component doet
 * inloggen én registreren met twee kale velden. Dit formulier heeft iconen in
 * het veld, een oogknop en een andere veldhoogte: dat er met vlaggen in wringen
 * levert een component op dat drie vormen kent en geen ervan goed. Registreren
 * blijft op `auth-form.tsx`, en dat scherm staat tijdens de bouwfase toch dicht
 * (`signupsEnabled`).
 */
export function LoginForm({
  action,
  notice,
}: {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  notice?: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [wachtwoordZichtbaar, setWachtwoordZichtbaar] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {notice && (
        <p className="rounded-[10px] border border-[var(--intent-growth-border)] bg-[var(--intent-growth-surface)] px-4 py-3 text-sm text-[var(--intent-growth-text)]">
          {notice}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <AuthLabel htmlFor="email" required>
          Werk-e-mailadres
        </AuthLabel>
        <div className="relative">
          <Mail
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            id="email"
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="jij@bedrijf.nl"
            className="auth-field"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <AuthLabel htmlFor="wachtwoord" required>
          Wachtwoord
        </AuthLabel>
        <div className="relative">
          <Lock
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            id="wachtwoord"
            type={wachtwoordZichtbaar ? "text" : "password"}
            name="password"
            required
            autoComplete="current-password"
            placeholder="Voer je wachtwoord in"
            className="auth-field auth-field-toggle"
          />
          {/* Een oogknop is geen sier: hij haalt de meest voorkomende
              inlogfout weg, een typefout in een veld dat je niet kunt lezen.
              Het label zegt wat er gebeurt als je klikt, niet wat de stand nu
              is: dat laatste leest een schermlezer als een raadsel voor. */}
          <button
            type="button"
            onClick={() => setWachtwoordZichtbaar((zichtbaar) => !zichtbaar)}
            aria-label={wachtwoordZichtbaar ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
            className="absolute right-2.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-[var(--radius-sm)] text-muted transition-colors hover:text-[var(--text-primary)]"
          >
            {wachtwoordZichtbaar ? (
              <EyeOff size={17} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Eye size={17} strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {state.error && (
        <p className="-mt-2 text-sm text-[var(--status-error)]" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="auth-submit">
        {pending ? "Bezig…" : "Inloggen"}
      </button>
    </form>
  );
}

/** De regel onder de knop. Staat los van het formulier: het is geen handeling
    binnen het formulier maar een uitweg eruit. */
export function LoginFooter({ signupsEnabled }: { signupsEnabled: boolean }) {
  return (
    <>
      {/* Dezelfde maatvoering als de knop erboven, met een waas bij hover in
          plaats van een vlak. Dat is hoe Nova de uitweg naast een handeling
          zet: zichtbaar een knop, zichtbaar niet dé knop. Was een kale link met
          alleen een onderstreping, waardoor er onder een knop van 50 pixels een
          regel tekst zweefde zonder eigen vorm. */}
      <Link href="/wachtwoord-vergeten" className="btn-ghost w-full">
        Wachtwoord vergeten?
      </Link>
      {signupsEnabled && (
        <p className="mt-3 text-secondary">
          Nog geen account?{" "}
          <Link
            href="/register"
            className="font-semibold text-[var(--text-primary)] underline underline-offset-2 hover:text-[var(--text-secondary)]"
          >
            Registreren
          </Link>
        </p>
      )}
    </>
  );
}
