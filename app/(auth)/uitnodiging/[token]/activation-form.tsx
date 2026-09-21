"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { passwordRules, passwordOk } from "@/lib/invite-rules";
import { Icon } from "@/components/icon";
import { Alert } from "@/components/alert";
import { AuthLabel } from "../../auth-card";

/**
 * Het activatieformulier: kies een wachtwoord, kom binnen.
 *
 * ── DE REGELS VINKEN LIVE AF ────────────────────────────────────────────────
 *
 * Nova doet dit (`rule8`, `ruleNumber`, `ruleUppercase`) en het is meer waard
 * dan het lijkt: een wachtwoordveld dat pas ná het versturen zegt wat er mis is,
 * kost twee tot drie pogingen. Drie regeltjes die groen worden terwijl je typt
 * kosten er nul.
 *
 * Dezelfde functie als op de server (`lib/invite-rules.ts`, zonder
 * `server-only`), want een client die iets goedkeurt wat de server weigert is de
 * ergste variant van dit scherm.
 */
export function ActivationForm({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [toon, setToon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const regels = passwordRules(password);
  const mag = passwordOk(password) && !busy;

  async function verstuur(e: React.FormEvent) {
    e.preventDefault();
    if (!mag) return;
    setBusy(true);
    setFout(null);
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        setFout(json?.error ?? "Activeren is niet gelukt. Probeer het opnieuw.");
        return;
      }
      // Volledig herladen en niet `router.push`: de sessiecookie is net gezet en
      // de server moet hem zien. Een client-side navigatie zou de oude,
      // uitgelogde staat kunnen hergebruiken.
      window.location.href = "/merk";
    } catch {
      setFout("Geen verbinding. Controleer je internet en probeer het opnieuw.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={verstuur} className="flex flex-col gap-4" noValidate>
      {/* Het adres staat vast: de link is daar aangekomen, dus dat adres is
          bewezen. Wijzigen zou van een uitnodiging een manier maken om op een
          willekeurig adres een account te openen. Geen `AuthLabel`: dit is geen
          `<label>` bij een invoerbaar veld maar een vaste weergave, alleen de
          stijl (`type-caption-emphasis`, `--text-tertiary`) is dezelfde. */}
      <div className="flex flex-col gap-1.5">
        <span className="type-caption-emphasis text-[var(--text-tertiary)]">Je e-mailadres</span>
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2">
          <span className="break-url text-sm font-medium">{email}</span>
          <span className="chip chip-success shrink-0">bevestigd</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <AuthLabel htmlFor="wachtwoord">Kies een wachtwoord</AuthLabel>
        <div className="relative">
          <input
            id="wachtwoord"
            className="field field-lg field-toggle-inset w-full"
            type={toon ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            autoFocus
            disabled={busy}
          />
          <button
            type="button"
            onClick={() => setToon((t) => !t)}
            className="icon-btn absolute right-2 top-1/2 -translate-y-1/2"
            aria-label={toon ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
          >
            <Icon naam={toon ? "wachtwoordverbergen" : "wachtwoordtonen"} size={17} />
          </button>
        </div>

        <ul className="mt-1 flex flex-col gap-1">
          {regels.map((r) => (
            <li key={r.id} className="flex items-center gap-2 text-sm">
              <span
                style={{
                  color: r.ok ? "var(--trend-up-text)" : "var(--text-muted)",
                }}
              >
                <Icon naam={r.ok ? "klaar" : "open"} size={14} />
              </span>
              <span style={{ color: r.ok ? "var(--text-secondary)" : "var(--text-muted)" }}>
                {r.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {fout && (
        <Alert intent="danger" role="alert">
          {fout}
        </Alert>
      )}

      <button type="submit" className="btn-primary btn-lg mt-2 w-full" disabled={!mag}>
        {busy ? "Bezig met activeren…" : "Activeer mijn account"}
      </button>
    </form>
  );
}
