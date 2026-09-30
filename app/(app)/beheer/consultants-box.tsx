"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { CopyButton } from "@/components/copy-button";
import { inviteState } from "@/lib/invite-rules";
import { ROL_LABEL, ROL_UITLEG } from "@/lib/roles";

/**
 * Consultants beheren, alleen voor de superuser (`app/(app)/beheer/page.tsx`).
 *
 * Dezelfde werkwijze als bij klanten (`TeamBox`): je vult een e-mailadres in en
 * krijgt een link die je zelf doorstuurt. Hij is twee weken geldig, werkt één
 * keer en wordt maar één keer getoond, want ORBIT ENGINE bewaart alleen een
 * versleutelde versie.
 */
export function ConsultantsBox({
  consultants,
  pending,
}: {
  consultants: { email: string; isYou: boolean }[];
  pending: { id: string; email: string; expires_at: string }[];
}) {
  const toast = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [voornaam, setVoornaam] = useState("");
  const [achternaam, setAchternaam] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [intrekken, setIntrekken] = useState<string | null>(null);

  async function nodigUit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !voornaam.trim() || !achternaam.trim() || busy) return;
    setBusy(true);
    setLink(null);
    try {
      const res = await fetch("/api/staff/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          firstName: voornaam.trim(),
          lastName: achternaam.trim(),
        }),
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
      toast({
        intent: "succes",
        title: `Uitnodiging klaar voor ${email.trim()}`,
        description: "Kopieer de link hieronder en stuur hem naar de consultant.",
      });
      setEmail("");
      setVoornaam("");
      setAchternaam("");
      router.refresh();
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

  async function trekIn(id: string, adres: string) {
    setIntrekken(id);
    try {
      const res = await fetch(`/api/staff/invites/${id}/revoke`, { method: "POST" });
      if (!res.ok) {
        toast({ intent: "fout", title: "Intrekken is niet gelukt", description: "Probeer het opnieuw." });
        return;
      }
      toast({
        intent: "succes",
        title: "Uitnodiging ingetrokken",
        description: `De link naar ${adres} werkt niet meer.`,
      });
      router.refresh();
    } finally {
      setIntrekken(null);
    }
  }

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="mono-label">Consultants</span>
        <p className="text-sm text-muted">
          {ROL_LABEL.consultant}: {ROL_UITLEG.consultant} Alleen jij als superuser voegt consultants toe.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {consultants.map((c) => (
          <li
            key={c.email}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2 last:border-0 last:pb-0"
          >
            <span className="break-url text-sm">
              {c.email}
              {c.isYou && <span className="text-muted"> (jij)</span>}
            </span>
            <span className="chip">{ROL_LABEL.consultant}</span>
          </li>
        ))}
        {consultants.length === 0 && (
          <li className="text-sm text-muted">Er zijn nog geen consultants.</li>
        )}
      </ul>

      {pending.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3">
          <span className="mono-label">Nog niet geaccepteerd</span>
          <ul className="flex flex-col gap-2">
            {pending.map((p) => {
              const verlopen = inviteState({ ...p, accepted_at: null, revoked_at: null }) === "verlopen";
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="break-url">{p.email}</span>
                    <span className={verlopen ? "chip chip-warning" : "chip chip-neutral"}>
                      {verlopen ? "verlopen" : "wacht"}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={intrekken === p.id}
                    onClick={() => void trekIn(p.id, p.email)}
                    className="text-sm text-secondary hover:underline"
                  >
                    {intrekken === p.id ? "Bezig…" : "Intrekken"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <form onSubmit={nodigUit} className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="field flex-1"
            value={voornaam}
            onChange={(e) => setVoornaam(e.target.value)}
            placeholder="Voornaam"
            aria-label="Voornaam van de consultant"
            autoComplete="off"
            disabled={busy}
          />
          <input
            className="field flex-1"
            value={achternaam}
            onChange={(e) => setAchternaam(e.target.value)}
            placeholder="Achternaam"
            aria-label="Achternaam van de consultant"
            autoComplete="off"
            disabled={busy}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="field flex-1"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="naam@outerorbit.nl"
            aria-label="E-mailadres van de consultant"
            disabled={busy}
          />
          <button
            type="submit"
            className="btn-primary shrink-0"
            disabled={busy || !email.trim() || !voornaam.trim() || !achternaam.trim()}
          >
            {busy ? "Bezig…" : "Consultant uitnodigen"}
          </button>
        </div>
      </form>

      {link && (
        <div className="card card-rail flex flex-col gap-2">
          <span className="mono-label">De uitnodigingslink</span>
          <p className="text-sm text-secondary">
            Stuur deze link naar de consultant. Hij is twee weken geldig en werkt één keer.{" "}
            <strong>Je ziet hem nu voor het laatst</strong>: ORBIT ENGINE bewaart alleen een
            versleutelde versie.
          </p>
          <p className="break-url rounded-[var(--radius-xl)] bg-[var(--bg-layer-2)] p-3 font-mono text-xs">
            {link}
          </p>
          <CopyButton value={link} label="Kopieer de link" className="btn-outline btn-sm w-fit" />
        </div>
      )}
    </div>
  );
}
