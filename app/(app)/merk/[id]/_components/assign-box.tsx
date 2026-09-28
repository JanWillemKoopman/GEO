"use client";

import { useEffect, useState } from "react";
import { useRefresh } from "@/components/use-refresh";
import { CopyButton } from "@/components/copy-button";

/**
 * Profiel toewijzen aan een klantaccount (blok A). Alleen zichtbaar voor de
 * beheerder, de pagina rendert dit component niet voor een gewone klant.
 *
 * Twee manieren, onder elkaar. De KEUZELIJST hierboven blijft: hij toont een
 * gebruiker die al bestaat, en een typefout daarin geeft altijd een geldige
 * keuze terug (nooit een profiel dat aan niemand hangt). Het E-MAILVELD
 * eronder is nieuw (28 september 2026, `lib/profile-assign.ts`): voor een
 * klant die nog geen account heeft, zodat de consultant niet meer eerst zelf
 * een gebruiker in het Supabase-dashboard hoeft aan te maken. Bestaat het
 * adres al, dan doet het precies hetzelfde als de keuzelijst; bestaat het nog
 * niet, dan komt er een nieuw klantaccount met een uitnodigingslink.
 */
interface AccountOption {
  id: string;
  email: string;
}

export function AssignBox({
  profileId,
  currentUserId,
  assignedAt,
}: {
  profileId: string;
  currentUserId: string;
  assignedAt: string | null;
}) {
  const { refresh, refreshing } = useRefresh();
  const [accounts, setAccounts] = useState<AccountOption[] | null>(null);
  const [choice, setChoice] = useState("");
  const [pending, setPending] = useState(false);
  // ⚠️ De knop laat pas los als het scherm de nieuwe stand heeft, niet als de
  // aanvraag de deur uit is. Zie `components/use-refresh.ts`.
  const wacht = pending || refreshing;
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailDone, setEmailDone] = useState<{ email: string; nieuw: boolean } | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch(`/api/profiles/${profileId}/assign`)
      .then((r) => (r.ok ? r.json() : { users: [] }))
      .then((json) => {
        if (active) setAccounts(json.users ?? []);
      })
      .catch(() => {
        if (active) setAccounts([]);
      });
    return () => {
      active = false;
    };
  }, [profileId]);

  const current = accounts?.find((a) => a.id === currentUserId);

  async function assign() {
    if (!choice) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: choice }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Toewijzen is niet gelukt.");
        setPending(false);
        return;
      }
      setDone(json.email ?? "het gekozen account");
      setPending(false);
      refresh();
    } catch {
      setError("Toewijzen is niet gelukt. Controleer je verbinding.");
      setPending(false);
    }
  }

  async function wijsToeViaEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || emailBusy) return;
    setEmailBusy(true);
    setEmailError(null);
    setInviteLink(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/assign-by-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setEmailError(json.error ?? "Toewijzen is niet gelukt.");
        setEmailBusy(false);
        return;
      }
      setEmailDone({ email: json.email ?? email.trim(), nieuw: !json.bestaandeGebruiker });
      setInviteLink(json.inviteLink ?? null);
      setEmail("");
      setEmailBusy(false);
      refresh();
    } catch {
      setEmailError("Toewijzen is niet gelukt. Controleer je verbinding.");
      setEmailBusy(false);
    }
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono-label">Eigenaar van dit merk</span>
        <span className={assignedAt ? "chip chip-success" : "chip chip-neutral"}>
          {assignedAt ? "Toegewezen" : "Intern"}
        </span>
      </div>

      <p className="text-sm text-secondary">
        {assignedAt
          ? `Dit merk staat op ${current?.email ?? "een klantaccount"}. Jij houdt toegang als beheerder.`
          : "Dit merk staat nog op jouw eigen account. Wijs het toe zodra de klant een account heeft. De clusters gaan mee."}
      </p>

      {done && (
        <p className="text-sm text-[var(--trend-up-text)]" role="status">
          Toegewezen aan {done}. De clusters zijn meeverhuisd.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-56 flex-1 flex-col gap-1.5">
          <span className="mono-label">Account</span>
          <select
            className="field field-select"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            disabled={accounts === null || wacht}
          >
            <option value="">
              {accounts === null ? "Accounts laden…" : "Kies een account"}
            </option>
            {(accounts ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.email}
                {a.id === currentUserId ? " (huidige eigenaar)" : ""}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void assign()}
          disabled={wacht || !choice || choice === currentUserId}
          className="btn-outline"
        >
          {wacht ? "Toewijzen…" : "Toewijzen"}
        </button>
      </div>

      {accounts !== null && accounts.length <= 1 && (
        <p className="text-sm text-muted">
          Er is nog maar één account. Heeft de klant nog geen account, gebruik dan het
          e-mailveld hieronder.
        </p>
      )}

      <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3">
        <span className="mono-label">Of nodig een nieuwe klant uit</span>
        <p className="text-sm text-secondary">
          Heeft de klant nog geen account? Typ zijn e-mailadres. Bestaat dat adres al, dan wordt
          dit merk daaraan toegewezen; bestaat het nog niet, dan maakt ORBIT ENGINE een nieuw
          klantaccount en krijg je een uitnodigingslink om door te sturen.
        </p>
        <form onSubmit={wijsToeViaEmail} className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-56 flex-1 flex-col gap-1.5">
            <span className="mono-label">E-mailadres</span>
            <input
              type="email"
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="naam@bedrijf.nl"
              disabled={emailBusy}
            />
          </label>
          <button type="submit" className="btn-outline" disabled={emailBusy || !email.trim()}>
            {emailBusy ? "Bezig…" : "Toewijzen"}
          </button>
        </form>

        {emailDone && (
          <p className="text-sm text-[var(--trend-up-text)]" role="status">
            {emailDone.nieuw
              ? `Nieuw klantaccount aangemaakt en toegewezen aan ${emailDone.email}.`
              : `Toegewezen aan ${emailDone.email}. De clusters zijn meeverhuisd.`}
          </p>
        )}

        {inviteLink && (
          <div className="card card-rail flex flex-col gap-2">
            <span className="mono-label">De uitnodigingslink</span>
            <p className="text-sm text-secondary">
              Stuur deze link naar de klant. Hij is twee weken geldig en werkt één keer.{" "}
              <strong>Je ziet hem nu voor het laatst</strong>: ORBIT ENGINE bewaart alleen een
              versleutelde versie.
            </p>
            <p className="break-url rounded-[var(--radius-xl)] bg-[var(--bg-layer-2)] p-3 font-mono text-xs">
              {inviteLink}
            </p>
            <CopyButton value={inviteLink} label="Kopieer de link" className="btn-outline btn-sm w-fit" />
          </div>
        )}

        {emailError && (
          <p className="text-sm text-[var(--intent-danger-content)]" role="alert">
            {emailError}
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-[var(--intent-danger-content)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
