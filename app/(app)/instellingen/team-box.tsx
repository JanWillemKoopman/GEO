"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { CopyButton } from "@/components/copy-button";
import { inviteState } from "@/lib/invite-rules";
import type { AccountRole } from "@/lib/types/database";
import { ROL_LABEL, ROL_UITLEG, type Rol } from "@/lib/roles";

export interface PendingInvite {
  id: string;
  email: string;
  role: AccountRole;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
}

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
  pending,
  mayInvite,
  profileId,
}: {
  /**
   * `null` als het merk nog aan geen klant hangt (alleen op het scherm
   * Toewijzen). Het eerste adres dat je dan uitnodigt maakt het klantaccount aan
   * en koppelt het merk eraan, via `profileId`.
   */
  accountId: string | null;
  accountName: string;
  /** `rol` ontbreekt op `/instellingen`: daar is iedereen klant. */
  members: { email: string; isYou: boolean; rol?: Rol }[];
  pending: PendingInvite[];
  mayInvite: boolean;
  profileId?: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const [intrekken, setIntrekken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [voornaam, setVoornaam] = useState("");
  const [achternaam, setAchternaam] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  async function nodigUit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !voornaam.trim() || !achternaam.trim() || busy) return;
    setBusy(true);
    setLink(null);
    try {
      // Iedereen die je hier uitnodigt is klant, met alle rechten van een klant.
      // Daarom geen keuze op het scherm.
      const res = accountId
        ? await fetch(`/api/accounts/${accountId}/invites`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: email.trim(),
              firstName: voornaam.trim(),
              lastName: achternaam.trim(),
              role: "admin",
            }),
          })
        : await fetch(`/api/profiles/${profileId}/assign-by-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: email.trim(),
              firstName: voornaam.trim(),
              lastName: achternaam.trim(),
            }),
          });
      const raw = (await res.json().catch(() => null)) as
        | { link?: string; inviteLink?: string | null; error?: string; bestaandeGebruiker?: boolean }
        | null;
      const json = raw && { ...raw, link: raw.link ?? raw.inviteLink ?? undefined };

      // Een bestaande gebruiker krijgt bij het koppelen geen link: hij logt
      // gewoon in en ziet het merk.
      if (res.ok && !accountId && json?.bestaandeGebruiker) {
        setEmail("");
        setVoornaam("");
        setAchternaam("");
        router.refresh();
        toast({
          intent: "succes",
          title: `${email.trim()} is gekoppeld`,
          description: "Dit adres heeft al een account en ziet het merk bij het inloggen.",
        });
        return;
      }

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
      setVoornaam("");
      setAchternaam("");
      router.refresh();
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
        <span className="mono-label">Wie toegang heeft tot {accountName}</span>
        <p className="text-sm text-muted">
          {ROL_UITLEG.klant}
        </p>
      </div>

      {accountId === null && (
        <p className="text-sm text-secondary">
          Nog geen klant gekoppeld. Nodig hieronder het e-mailadres van de klant uit: daarmee
          wordt het klantaccount aangemaakt en dit merk eraan gekoppeld.
        </p>
      )}

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
            <span className={m.rol && m.rol !== "klant" ? "chip" : "chip chip-neutral"}>
              {ROL_LABEL[m.rol ?? "klant"]}
            </span>
          </li>
        ))}
      </ul>

      {pending.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3">
          <span className="mono-label">Nog niet geaccepteerd</span>
          <ul className="flex flex-col gap-2">
            {pending.map((p) => {
              const stand = inviteState(p);
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="break-url">{p.email}</span>
                    {/* Een verlopen uitnodiging blijft staan: die verklaart
                        waarom een klant niet binnenkomt, en is dus juist het
                        antwoord op een vraag. */}
                    <span
                      className={
                        stand === "verlopen" ? "chip chip-warning" : "chip chip-neutral"
                      }
                    >
                      {stand === "verlopen" ? "verlopen" : "wacht"}
                    </span>
                  </span>
                  {mayInvite && (
                    <button
                      type="button"
                      disabled={intrekken === p.id}
                      onClick={async () => {
                        setIntrekken(p.id);
                        try {
                          const res = await fetch(
                            `/api/accounts/${accountId}/invites/${p.id}/revoke`,
                            { method: "POST" },
                          );
                          if (!res.ok) {
                            const j = (await res.json().catch(() => null)) as
                              | { error?: string }
                              | null;
                            toast({
                              intent: "fout",
                              title: "Intrekken is niet gelukt",
                              description: j?.error ?? "Probeer het opnieuw.",
                            });
                            return;
                          }
                          toast({
                            intent: "succes",
                            title: "Uitnodiging ingetrokken",
                            description: `De link naar ${p.email} werkt niet meer.`,
                          });
                          router.refresh();
                        } finally {
                          setIntrekken(null);
                        }
                      }}
                      className="text-sm text-secondary hover:underline"
                    >
                      {intrekken === p.id ? "Bezig…" : "Intrekken"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {mayInvite ? (
        <form onSubmit={nodigUit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="field flex-1"
              value={voornaam}
              onChange={(e) => setVoornaam(e.target.value)}
              placeholder="Voornaam"
              aria-label="Voornaam van de klant"
              autoComplete="off"
              disabled={busy}
            />
            <input
              className="field flex-1"
              value={achternaam}
              onChange={(e) => setAchternaam(e.target.value)}
              placeholder="Achternaam"
              aria-label="Achternaam van de klant"
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
              placeholder="naam@bedrijf.nl"
              aria-label="E-mailadres van de klant"
              disabled={busy}
            />
            <button
              type="submit"
              className="btn-primary shrink-0"
              disabled={busy || !email.trim() || !voornaam.trim() || !achternaam.trim()}
            >
              {busy ? "Bezig…" : "Uitnodigen"}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted">
          Je zit niet in dit account en kunt daarom niemand uitnodigen.
        </p>
      )}

      {link && (
        <div className="card card-rail flex flex-col gap-2">
          <span className="mono-label">De uitnodigingslink</span>
          <p className="text-sm text-secondary">
            Stuur deze link naar je klant. Hij is twee weken geldig en werkt één
            keer. <strong>Je ziet hem nu voor het laatst</strong>: ORBIT ENGINE bewaart
            alleen een versleutelde versie, dus opnieuw tonen kan niet.
          </p>
          <p className="break-url rounded-[var(--radius-xl)] bg-[var(--bg-layer-2)] p-3 font-mono text-xs">
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
