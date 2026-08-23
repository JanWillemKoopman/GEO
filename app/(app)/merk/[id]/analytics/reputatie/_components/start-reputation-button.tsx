"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * De startknop van de reputatieanalyse (§3.3, staten 2 en 3).
 *
 * ── ⚠️ DE KNOP WORDT NIET VERBORGEN VOOR DE KLANT ───────────────────────────
 *
 * Dat is het belangrijkste ontwerpbesluit van dit onderdeel. Verbergen betekent
 * dat de klant niet weet dat dit product bestaat, en dit is nu juist een product
 * dat je wilt verkopen. Hij ziet dus wát het is, wát het oplevert, en bij wie
 * hij moet zijn.
 *
 * Vandaar dat `mayStart: false` niet leidt tot een uitgeschakelde knop maar tot
 * een uitnodiging. Een grijze knop leest als een deur die dichtzit; deze tekst
 * leest als werk dat iemand voor je in gang zet. Die toon staat in
 * `lib/cost-rules.ts` naast de vijf andere, zodat hij nooit per scherm opnieuw
 * bedacht wordt.
 */
export function StartReputationButton({
  profileId,
  mayStart,
  deniedMessage,
  repeat,
}: {
  profileId: string;
  /** Mag deze gebruiker betaald werk starten (`mayTriggerCost`, besluit 18)? */
  mayStart: boolean;
  /** Wat de klant leest als hij het niet mag. Komt uit `lib/cost-rules.ts`. */
  deniedMessage: string;
  /** Is er al eerder een analyse gedraaid? Dan heet de knop anders. */
  repeat: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!mayStart) {
    return (
      <div className="card flex flex-col gap-2">
        <span className="mono-label">Zo zet je hem in gang</span>
        <p className="text-secondary">{deniedMessage}</p>
      </div>
    );
  }

  async function start() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/reputation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ depth: "standaard" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "De reputatieanalyse kon niet gestart worden.");
        setPending(false);
        return;
      }
      router.refresh();
    } catch {
      setError("De reputatieanalyse kon niet gestart worden. Controleer je verbinding.");
      setPending(false);
    }
  }

  if (!confirming) {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          className="btn-primary w-fit"
          onClick={() => setConfirming(true)}
        >
          {repeat ? "Nieuwe reputatieanalyse" : "Start de reputatieanalyse"}
        </button>
        {error && (
          <p className="text-sm text-[var(--status-error)]" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  // Een bevestiging ervoor, want dit kost geld en het duurt een kwartier. Geen
  // modaal venster: één klik die verandert in twee is genoeg (zelfde keuze als
  // bij `rerun-research-button.tsx`).
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
      <p className="text-sm text-secondary">
        ORBIT ENGINE stelt ongeveer 34 vragen aan ChatGPT over dit merk: hoe er over het merk
        gepraat wordt, per dienst, en hoe het zich verhoudt tot de concurrenten die uit de
        metingen zijn gekomen.
        <strong> Dat duurt ongeveer een halfuur en kost ongeveer 75 cent.</strong> Je hoeft er
        niet bij te wachten: je kunt dit scherm sluiten en later terugkomen.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary btn-sm disabled:opacity-60"
          disabled={pending}
          onClick={() => void start()}
        >
          {pending ? "Starten…" : "Ja, start de analyse"}
        </button>
        <button
          type="button"
          className="btn-outline btn-sm"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Annuleren
        </button>
      </div>
      {error && (
        <p className="text-sm text-[var(--status-error)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
