"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Lock, UserRound } from "lucide-react";
import type { AuthState } from "../actions";

/**
 * Het inlogformulier van de brede kaart.
 *
 * ── WAAROM DIT NIET IN `auth-form.tsx` ZIT ──────────────────────────────────
 *
 * Om dezelfde reden die boven `password-forms.tsx` staat. Dat component doet
 * inloggen én registreren met twee kale velden. Dit formulier heeft iconen in
 * het veld, een oogknop, een andere veldhoogte en een afsluiter met een slotje:
 * dat er met vlaggen in wringen levert een component op dat drie vormen kent en
 * geen ervan goed. Registreren blijft op `auth-form.tsx`, en dat scherm staat
 * tijdens de bouwfase toch dicht (`signupsEnabled`).
 */
export function LoginForm({
  action,
  notice,
  signupsEnabled,
}: {
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  notice?: string | null;
  /** Toont de registratielink alleen als registratie openstaat (bouwfase = dicht). */
  signupsEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [wachtwoordZichtbaar, setWachtwoordZichtbaar] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {notice && (
        <p className="rounded-[var(--radius-lg)] border border-[var(--intent-growth-border)] bg-[var(--intent-growth-surface)] px-4 py-3 text-sm text-[var(--intent-growth-text)]">
          {notice}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="mono-label">
          E-mail
        </label>
        <div className="relative">
          <UserRound
            size={17}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="wachtwoord" className="mono-label">
          Wachtwoord
        </label>
        <div className="relative">
          <Lock
            size={17}
            strokeWidth={1.75}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            id="wachtwoord"
            type={wachtwoordZichtbaar ? "text" : "password"}
            name="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
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
            className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-[var(--radius-sm)] text-muted transition-colors hover:text-[var(--text-secondary)]"
          >
            {wachtwoordZichtbaar ? (
              <Eye size={17} strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <EyeOff size={17} strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-[var(--status-error)]" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="auth-submit">
        {pending ? "Bezig…" : "Inloggen"}
        {!pending && <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />}
      </button>

      <p className="text-center text-sm">
        <Link
          href="/wachtwoord-vergeten"
          className="font-semibold text-[var(--intent-intelligence-text)] hover:underline"
        >
          Wachtwoord vergeten?
        </Link>
      </p>

      <div className="border-t border-[var(--border-subtle)] pt-5">
        {signupsEnabled ? (
          <p className="text-center text-sm text-secondary">
            Nog geen account?{" "}
            <Link
              href="/register"
              className="font-semibold text-[var(--intent-intelligence-text)] hover:underline"
            >
              Registreren
            </Link>
          </p>
        ) : (
          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-muted">
            <span className="inline-flex items-center gap-2">
              <Lock size={14} strokeWidth={1.75} aria-hidden="true" />
              ORBIT ENGINE is op uitnodiging.
            </span>
            <span>Vraag je contactpersoon om toegang.</span>
          </p>
        )}
      </div>
    </form>
  );
}
