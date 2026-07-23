"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/types/database";

export function NewAnalysisForm({ profiles }: { profiles: Profile[] }) {
  const router = useRouter();
  const [profileId, setProfileId] = useState(profiles[0]?.id ?? "");
  const [topic, setTopic] = useState("");
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
        body: JSON.stringify({ profileId, topic }),
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
