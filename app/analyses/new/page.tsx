"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewAnalysisPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
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
        body: JSON.stringify({ url, topic }),
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
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <Link href="/analyses" className="mono-label transition-colors hover:text-[var(--text-primary)]">
          ← Terug naar Mijn analyses
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Nieuwe analyse</h1>
        <p className="mt-2 text-secondary">
          Vul een website in. Wil je inzoomen op één product of onderwerp? Vul dat er dan bij —
          anders analyseren we de hele website.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Website *</span>
          <input
            type="text"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="mediamarkt.nl"
            className="field"
            autoFocus
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="mono-label">Onderwerp / product (optioneel)</span>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="bijv. iPhone, smartphone-reparatie"
            className="field"
          />
          <span className="text-sm text-muted">
            Handig bij grote merken: zo meten we alleen dat segment in plaats van het hele bedrijf.
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
    </div>
  );
}
