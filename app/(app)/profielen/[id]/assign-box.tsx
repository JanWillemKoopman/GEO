"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Profiel toewijzen aan een klantaccount (blok A). Alleen zichtbaar voor de
 * beheerder, de pagina rendert dit component niet voor een gewone klant.
 *
 * Een KEUZELIJST en geen e-mailveld. Accounts worden in het Supabase-dashboard
 * aangemaakt, dus op het moment dat je toewijst bestaat het account al. Een
 * tekstveld zou een typefout accepteren en het profiel toewijzen aan niemand,
 * onzichtbaar, want de RLS-join levert dan gewoon een leeg scherm op.
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
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountOption[] | null>(null);
  const [choice, setChoice] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

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
      router.refresh();
    } catch {
      setError("Toewijzen is niet gelukt. Controleer je verbinding.");
      setPending(false);
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
          : "Dit merk staat nog op jouw eigen account. Wijs het toe zodra de klant een account heeft. De analyses gaan mee."}
      </p>

      {done && (
        <p className="text-sm text-[var(--intent-growth-text)]" role="status">
          Toegewezen aan {done}. De analyses zijn meeverhuisd.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex min-w-56 flex-1 flex-col gap-1.5">
          <span className="mono-label">Account</span>
          <select
            className="field"
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
            disabled={accounts === null || pending}
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
          disabled={pending || !choice || choice === currentUserId}
          className="btn-outline disabled:opacity-40"
        >
          {pending ? "Toewijzen…" : "Toewijzen"}
        </button>
      </div>

      {accounts !== null && accounts.length <= 1 && (
        <p className="text-sm text-muted">
          Er is nog maar één account. Maak het klantaccount aan in Supabase; daarna verschijnt het
          hier.
        </p>
      )}

      {error && (
        <p className="text-sm text-[var(--status-error)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
