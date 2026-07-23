"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewProfilePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Er ging iets mis.");
        setPending(false);
        return;
      }
      router.push(`/profielen/${json.id}`);
    } catch {
      setError("Er ging iets mis. Controleer je verbinding en probeer opnieuw.");
      setPending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <Link href="/profielen" className="mono-label transition-colors hover:text-[var(--text-primary)]">
          ← Terug naar Klantprofielen
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Nieuw klantprofiel</h1>
        <p className="mt-2 text-secondary">
          Vul de website van het merk in. We onderzoeken eenmalig en grondig merk, branche,
          concurrenten, persona&apos;s en tone-of-voice — dit gebruik je straks voor al je analyses
          van dit merk.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Naam (optioneel)</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="bijv. MediaMarkt"
            className="field"
            autoFocus
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Website *</span>
          <input
            type="text"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="mediamarkt.nl"
            className="field"
          />
        </label>

        {error && (
          <p className="text-sm text-[var(--status-error)]" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-60">
          {pending ? "Profiel aanmaken…" : "Profiel aanmaken"}
        </button>
      </form>
    </div>
  );
}
