"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { AuthState } from "./actions";

interface AuthFormProps {
  mode: "login" | "register";
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>;
  notice?: string | null;
  /** Toont de registratielink alleen als registratie openstaat (bouwfase = dicht). */
  signupsEnabled?: boolean;
}

export function AuthForm({ mode, action, notice, signupsEnabled = false }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const isLogin = mode === "login";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {notice && (
        <p className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--intent-growth-surface)] px-4 py-3 text-sm text-[var(--intent-growth-text)]">
          {notice}
        </p>
      )}

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

      <label className="flex flex-col gap-1.5">
        <span className="mono-label">Wachtwoord</span>
        <input
          type="password"
          name="password"
          required
          autoComplete={isLogin ? "current-password" : "new-password"}
          placeholder={isLogin ? "••••••••" : "minimaal 8 tekens"}
          className="field"
        />
      </label>

      {state.error && (
        <p className="text-sm text-[var(--status-error)]" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary mt-1 w-full disabled:opacity-60">
        {pending ? "Bezig…" : isLogin ? "Inloggen" : "Account aanmaken"}
      </button>

      {isLogin && (
        <p className="text-center text-sm">
          <Link
            href="/wachtwoord-vergeten"
            className="text-[var(--text-primary)] underline underline-offset-2 hover:text-[var(--text-secondary)]"
          >
            Wachtwoord vergeten?
          </Link>
        </p>
      )}

      {isLogin && signupsEnabled && (
        <p className="mt-2 text-center text-sm text-secondary">
          Nog geen account?{" "}
          <Link href="/register" className="text-[var(--text-primary)] underline underline-offset-2 hover:text-[var(--text-secondary)]">
            Registreren
          </Link>
        </p>
      )}
      {isLogin && !signupsEnabled && (
        <p className="mt-2 text-center text-sm text-muted">ORBIT ENGINE is op uitnodiging. Vraag je contactpersoon om toegang.</p>
      )}
      {!isLogin && (
        <p className="mt-2 text-center text-sm text-secondary">
          Al een account?{" "}
          <Link href="/login" className="text-[var(--text-primary)] underline underline-offset-2 hover:text-[var(--text-secondary)]">
            Inloggen
          </Link>
        </p>
      )}
    </form>
  );
}
