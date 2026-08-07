"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types/database";

export function NewAnalysisForm({
  profiles,
  /** Uit tijdens het bouwen (EMAILS_ENABLED). Dan tonen we het mailvinkje niet. */
  emailsEnabled = false,
}: {
  profiles: Profile[];
  emailsEnabled?: boolean;
}) {
  const router = useRouter();
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const [topic, setTopic] = useState("");
  const [contentBrief, setContentBrief] = useState("");
  // Standaard aan: een analyse duurt minuten, dus je wilt bericht als het klaar is.
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          topic,
          content_brief: contentBrief,
          notify_by_email: notifyByEmail,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Er ging iets mis.");
        setPending(false);
        return;
      }
      router.push(`/analyses/${json.id}`);
    } catch {
      setError("We konden Aura niet bereiken. Controleer je verbinding en probeer het opnieuw.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="mono-label">Merk *</span>
        <select
          required
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
          className="field"
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.url})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="mono-label">Product of onderwerp *</span>
        <input
          type="text"
          required
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="bijv. iPhone, smartphone-reparatie"
          className="field"
          autoFocus
        />
        <span className="text-sm text-muted">
          Eén analyse = één product of onderwerp. Scherp afbakenen levert scherpere vragen op.
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="mono-label">Wat voor content wil je? (optioneel)</span>
        <textarea
          value={contentBrief}
          onChange={(e) => setContentBrief(e.target.value)}
          rows={4}
          placeholder={
            "bijv. 'Richt de content op sollicitanten die zich voorbereiden op een gesprek " +
            "(hoe kleed ik me, welke vragen kan ik verwachten), niet op algemene info voor wie " +
            "niet actief naar werk zoekt.'"
          }
          className="field"
        />
        <span className="text-sm text-muted">
          Bepaal de hoek en de doelgroep. Aura neemt dit mee in de vragen die het stelt, in de
          aanbevelingen én in de content die het schrijft.
        </span>
      </label>

      {/* Bericht als het klaar is (optimalisatie.md 1.8). Het werk draait op de
          achtergrond en duurt minuten. Dan hoort de klant te weten wanneer hij
          terug kan komen, in plaats van te moeten blijven kijken.

          Staat de mail uit (EMAILS_ENABLED), dan verdwijnt het vinkje: een vakje
          aanvinken waar niets van komt, is een belofte die de app niet nakomt. */}
      {emailsEnabled && (
        <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3">
          <input
            type="checkbox"
            checked={notifyByEmail}
            onChange={(e) => setNotifyByEmail(e.target.checked)}
            className="mt-0.5"
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Mail me zodra het rapport klaar is</span>
            <span className="text-sm text-muted">
              Aura werkt op de achtergrond door, ook als je dit scherm sluit. Blijven wachten hoeft
              niet, je krijgt bericht.
            </span>
          </span>
        </label>
      )}

      {error && (
        <p className="text-sm text-[var(--status-error)]" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary btn-lg w-full disabled:opacity-60">
        {pending ? "Analyse aanmaken…" : "Start analyse"}
      </button>
    </form>
  );
}
