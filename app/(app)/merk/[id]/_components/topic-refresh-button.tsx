"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatUsd } from "@/lib/format";

/**
 * De knop "Stel nieuwe clusters voor" (docs/optimalisatielab-orbit-engine.md,
 * werkpakket A §3.5). Alleen gerenderd voor de beheerder, zie `topics-panel.tsx`;
 * de echte grendel staat op de route (`app/api/profiles/[id]/topics/refresh`).
 *
 * Haalt bij het openklappen eerst de preview op (gratis: geen AI-aanroep) en
 * toont die vóór er geklikt kan worden. Staat er niets nieuws, dan is de knop
 * uitgeschakeld met de uitleg erbij, in plaats van gewoon te verdwijnen: een
 * beheerder die het scherm opent moet kunnen zien DAT hij is overwogen.
 */
export function TopicRefreshButton({ profileId }: { profileId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    aanraden: boolean;
    melding: string;
    geschatteKostenUsd: number;
  } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || preview) return;
    setLoading(true);
    fetch(`/api/profiles/${profileId}/topics/refresh`)
      .then((res) => res.json())
      .then((json) => setPreview(json))
      .catch(() => setError("Ophalen van de preview is niet gelukt. Controleer je verbinding."))
      .finally(() => setLoading(false));
  }, [open, preview, profileId]);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/topics/refresh`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Het genereren is niet gelukt.");
        return;
      }
      setResult(json.melding);
      router.refresh();
    } catch {
      setError("Het genereren is niet gelukt. Controleer je verbinding.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn-outline btn-sm w-fit"
        onClick={() => setOpen(true)}
      >
        Stel nieuwe clusters voor
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
      <span className="mono-label">Stel nieuwe clusters voor</span>
      {loading && <p className="text-sm text-secondary">Bekijken wat er sinds de vorige ronde is bijgekomen…</p>}
      {preview && !result && (
        <>
          <p className="text-sm text-secondary">{preview.melding}</p>
          {preview.aanraden && (
            // ⚠️ Nederlandse schrijfwijze, komma als decimaalteken, via
            // `formatUsd()` (punt 9 van docs/tasks/opdracht-bevindingen-5-tot-9.md).
            // Dit bedrag stond hier los uitgeschreven met `.toFixed(2)`, dus
            // met een punt, dezelfde fout als bij "Verdeling aanpassen".
            <p className="text-sm text-muted">Geschatte kosten: ~{formatUsd(preview.geschatteKostenUsd)}.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary btn-sm disabled:opacity-50"
              disabled={busy || !preview.aanraden}
              onClick={() => void run()}
            >
              {busy ? "Bezig…" : "Genereer nieuwe onderwerpen"}
            </button>
            <button
              type="button"
              className="btn-outline btn-sm"
              onClick={() => {
                setOpen(false);
                setPreview(null);
              }}
            >
              Annuleren
            </button>
          </div>
        </>
      )}
      {result && <p className="text-sm text-[var(--intent-growth-text)]">{result}</p>}
      {error && (
        <p className="text-sm text-[var(--status-error)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
