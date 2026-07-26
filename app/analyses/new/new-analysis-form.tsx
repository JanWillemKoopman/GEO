"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types/database";

export function NewAnalysisForm({ profiles }: { profiles: Profile[] }) {
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
      setError("Er ging iets mis. Controleer je verbinding en probeer opnieuw.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-col gap-5">
      <label className="flex flex-col gap-1.5">
        <span className="mono-label">Klantprofiel *</span>
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
        <span className="mono-label">Product / onderwerp *</span>
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
          Elke analyse meet één specifiek product of onderwerp binnen het klantprofiel.
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
            "(hoe kleed ik me, welke vragen kan ik verwachten) — niet op algemene info voor wie " +
            "niet actief naar werk zoekt.'"
          }
          className="field"
        />
        <span className="text-sm text-muted">
          Stuur de hoek en doelgroep van de content. Dit werkt door in de meet-vragen, de
          aanbevelingen én het schrijven van de content.
        </span>
      </label>

      {/* Bericht als het klaar is (optimalisatie.md 1.8). Het werk draait op de
          achtergrond en duurt minuten — dan hoort de klant te weten wanneer hij
          terug kan komen, in plaats van te moeten blijven kijken. */}
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
            De analyse draait op de achtergrond en duurt een paar minuten. Je hoeft niet te wachten —
            we laten het weten.
          </span>
        </span>
      </label>

      {error && (
        <p className="text-sm text-[var(--status-error)]" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-60">
        {pending ? "Analyse aanmaken…" : "Start analyse"}
      </button>
    </form>
  );
}
