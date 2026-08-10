"use client";

import { useState } from "react";
import { useToast } from "@/components/toast";
import { CopyButton } from "@/components/copy-button";
import type { AccountRole } from "@/lib/types/database";

/**
 * Iemand uitnodigen voor dit account.
 *
 * ── WAAROM DE LINK OP HET SCHERM KOMT EN NIET IN EEN MAIL ───────────────────
 *
 * `EMAILS_ENABLED` staat standaard uit, en de eerste klanten komen via een
 * demogesprek binnen. Dan is "hier is de link, stuur hem zelf" niet de armoedige
 * variant maar de betrouwbare: hij werkt ook als de mail in een spamfilter
 * blijft hangen, en de consultant ziet meteen dát het gelukt is.
 *
 * De link verschijnt één keer en wordt nergens bewaard. Dat is geen beperking
 * maar het ontwerp: wij bewaren alleen de hash van het token (migratie 0047), en
 * daarmee kunnen we hem principieel niet nog eens tonen. Vandaar de waarschuwing
 * erbij, en een kopieerknop die groot genoeg is om niet te missen.
 */
export function TeamBox({
  accountId,
  accountName,
  members,
  mayInvite,
}: {
  accountId: string;
  accountName: string;
  members: { email: string; role: AccountRole; isYou: boolean }[];
  mayInvite: boolean;
}) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AccountRole>("member");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  async function nodigUit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || busy) return;
    setBusy(true);
    setLink(null);
    try {
      const res = await fetch(`/api/accounts/${accountId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const json = (await res.json().catch(() => null)) as
        | { link?: string; error?: string }
        | null;

      if (!res.ok || !json?.link) {
        toast({
          intent: "fout",
          title: "Uitnodigen is niet gelukt",
          description: json?.error ?? "Probeer het zo nog eens.",
        });
        return;
      }

      setLink(json.link);
      setEmail("");
      toast({
        intent: "succes",
        title: `Uitnodiging klaar voor ${email.trim()}`,
        description: "Kopieer de link hieronder en stuur hem naar je klant.",
      });
    } catch {
      toast({
        intent: "fout",
        title: "Geen verbinding",
        description: "Controleer je internet en probeer het opnieuw.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="mono-label">Wie er bij {accountName} kan</span>
        <p className="text-sm text-muted">
          Een beheerder kan anderen uitnodigen. Een lid kan meekijken en
          goedkeuren, maar niemand toevoegen.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {members.map((m) => (
          <li
            key={m.email}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2 last:border-0 last:pb-0"
          >
            <span className="break-url text-sm">
              {m.email}
              {m.isYou && <span className="text-muted"> (jij)</span>}
            </span>
            <span className={m.role === "admin" ? "chip" : "chip chip-neutral"}>
              {m.role === "admin" ? "Beheerder" : "Lid"}
            </span>
          </li>
        ))}
      </ul>

      {mayInvite ? (
        <form onSubmit={nodigUit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="field flex-1"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="naam@bedrijf.nl"
              aria-label="E-mailadres om uit te nodigen"
              disabled={busy}
            />
            <select
              className="field sm:w-40"
              value={role}
              onChange={(e) => setRole(e.target.value as AccountRole)}
              aria-label="Rol"
              disabled={busy}
            >
              <option value="member">Lid</option>
              <option value="admin">Beheerder</option>
            </select>
            <button
              type="submit"
              className="btn-primary shrink-0"
              disabled={busy || !email.trim()}
            >
              {busy ? "Bezig…" : "Uitnodigen"}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted">
          Alleen een beheerder van dit account kan iemand uitnodigen.
        </p>
      )}

      {link && (
        <div className="card card-accent flex flex-col gap-2">
          <span className="mono-label">De uitnodigingslink</span>
          <p className="text-sm text-secondary">
            Stuur deze link naar je klant. Hij is twee weken geldig en werkt één
            keer. <strong>Je ziet hem nu voor het laatst</strong>: Aura bewaart
            alleen een versleutelde versie, dus opnieuw tonen kan niet.
          </p>
          <p className="break-url rounded-[var(--radius-md)] bg-[var(--bg-elevated)] p-3 font-mono text-xs">
            {link}
          </p>
          <CopyButton
            value={link}
            label="Kopieer de link"
            className="btn-outline btn-sm w-fit"
          />
        </div>
      )}
    </div>
  );
}
