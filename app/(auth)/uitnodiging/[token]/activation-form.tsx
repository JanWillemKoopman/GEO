"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { passwordRules, passwordOk } from "@/lib/invite-rules";
import { Icon } from "@/components/icon";

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
  /**
   * Heeft dit adres al een account? Dan is inloggen de volgende stap en geen
   * nieuwe poging met een ander wachtwoord. Zonder deze vlag zou de klant de
   * melding lezen en het formulier opnieuw invullen, want dat is wat er op het
   * scherm staat.
   */
  const [inloggenVereist, setInloggenVereist] = useState(false);

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
        const json = (await res.json().catch(() => null)) as
          | { error?: string; inloggenVereist?: boolean }
          | null;
        setFout(json?.error ?? "Activeren is niet gelukt. Probeer het opnieuw.");
        setInloggenVereist(Boolean(json?.inloggenVereist));
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
    <form onSubmit={verstuur} className="flex flex-col gap-5" noValidate>
      {/* Het adres staat vast: de link is daar aangekomen, dus dat adres is
          bewezen. Wijzigen zou van een uitnodiging een manier maken om op een
          willekeurig adres een account te openen. */}
      <div className="flex flex-col gap-1.5">
        <span className="mono-label">Je e-mailadres</span>
        <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2">
          <span className="break-url text-sm font-medium">{email}</span>
          <span className="chip chip-success shrink-0">bevestigd</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="wachtwoord" className="mono-label">
          Kies een wachtwoord
        </label>
        <div className="flex gap-2">
          <input
            id="wachtwoord"
            className="field flex-1"
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
            className="btn-outline shrink-0"
            aria-label={toon ? "Wachtwoord verbergen" : "Wachtwoord tonen"}
          >
            {toon ? "Verberg" : "Toon"}
          </button>
        </div>

        <ul className="mt-1 flex flex-col gap-1">
          {regels.map((r) => (
            <li key={r.id} className="flex items-center gap-2 text-sm">
              <span
                style={{
                  color: r.ok ? "var(--intent-growth-text)" : "var(--text-muted)",
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
        <div className="card card-danger flex flex-col gap-3 text-sm" role="alert">
          <p>{fout}</p>
          {/* Een melding zonder uitweg is een doodlopende weg. Heeft dit adres al
              een account, dan is inloggen de volgende stap, en die zetten we
              hier neer in plaats van de klant te laten zoeken. */}
          {/* ⚠️ Bewust GEEN `?volgende=`-parameter: het inlogscherm doet daar niets
              mee, `signIn` stuurt altijd naar de wortel. Een link die belooft
              dat je terugkomt en dat niet doet, is erger dan geen link. De
              melding zegt daarom expliciet dat je deze link opnieuw opent. */}
          {inloggenVereist && (
            <a className="btn-outline self-start" href="/login">
              Naar het inlogscherm
            </a>
          )}
        </div>
      )}

      <button type="submit" className="btn-primary btn-lg" disabled={!mag}>
        {busy ? "Bezig met activeren…" : "Activeer mijn account"}
      </button>

      <p className="text-sm text-muted">
        Je gegevens zijn versleuteld en beveiligd opgeslagen.
      </p>
    </form>
  );
}
