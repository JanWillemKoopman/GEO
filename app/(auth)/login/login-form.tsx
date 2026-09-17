"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { AuthLabel } from "../auth-card";
import { Alert } from "@/components/alert";
import { Icon } from "@/components/icon";
import type { AuthState } from "../actions";

/**
 * Het inlogformulier: twee velden, één knop.
 *
 * ── WAAROM DIT NIET IN `auth-form.tsx` ZIT ──────────────────────────────────
 *
 * Om dezelfde reden die boven `password-forms.tsx` staat. Dat component doet
 * alleen registreren. Dit formulier heeft een oogknop in het wachtwoordveld,
 * en dat er met vlaggen in wringen levert een component op dat twee vormen
 * kent en geen ervan goed.
 *
 * ── STAP 8: GEEN ICONEN MEER IN DE VELDEN ZELF ─────────────────────────────
 *
 * Mail- en slotpictogram links in het veld stonden nergens in `redesign2026.md`
 * §8.2, en een dashboardveld (`.field` elders in de app) heeft er ook geen.
 * Dat was precies het soort route-eigen versiering die stap 8 opheft: één
 * systeem, geen anderhalf. De oogknop blijft, want die staat wél letterlijk in
 * de spec ("de wachtwoordwissel in het veld wordt een IconButton md").
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
    <form action={formAction} className="flex flex-col gap-4">
      {notice && <Alert intent="success">{notice}</Alert>}

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
        <div className="relative">
          <input
            id="wachtwoord"
            type={wachtwoordZichtbaar ? "text" : "password"}
            name="password"
            required
            autoComplete="current-password"
            placeholder="Voer je wachtwoord in"
            className="field field-lg field-toggle-inset w-full"
          />
          {/* Een oogknop is geen sier: hij haalt de meest voorkomende
              inlogfout weg, een typefout in een veld dat je niet kunt lezen.
              Het label zegt wat er gebeurt als je klikt, niet wat de stand nu
              is: dat laatste leest een schermlezer als een raadsel voor. */}
          <button
            type="button"
            onClick={() => setWachtwoordZichtbaar((zichtbaar) => !zichtbaar)}
            aria-label={wachtwoordZichtbaar ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
            className="icon-btn absolute right-2 top-1/2 -translate-y-1/2"
          >
            <Icon naam={wachtwoordZichtbaar ? "wachtwoordverbergen" : "wachtwoordtonen"} size={17} />
          </button>
        </div>
      </div>

      {state.error && (
        <Alert intent="danger" role="alert">
          {state.error}
        </Alert>
      )}

      <button type="submit" disabled={pending} className="btn-primary btn-lg mt-2 w-full">
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
            className="font-medium text-[var(--text-primary)] underline underline-offset-2 hover:text-[var(--text-secondary)]"
          >
            Registreren
          </Link>
        </p>
      )}
    </>
  );
}
