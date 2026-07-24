"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProfileStatus } from "@/lib/types/database";

/**
 * Start het profielonderzoek en toont live, server-state-gedreven voortgang —
 * zelfde patroon als app/analyses/[id]/prepare-progress.tsx.
 */
export function ProfileProgress({
  profileId,
  initialStatus,
}: {
  profileId: string;
  initialStatus: ProfileStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ProfileStatus>(initialStatus);
  const [failed, setFailed] = useState(initialStatus === "mislukt");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const started = useRef(false);

  async function runResearch() {
    setFailed(false);
    setErrorDetail(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/research`, { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}) as { detail?: string });
        setFailed(true);
        setErrorDetail(json.detail ?? null);
      }
    } catch {
      // Netwerkfout — server werkt door, polling hieronder leest de echte status.
    }
  }

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/profiles/${profileId}/status`, { cache: "no-store" });
        if (!res.ok) return;
        const json: { status: ProfileStatus } = await res.json();
        if (!active) return;
        setStatus(json.status);
        if (json.status === "klaar") {
          router.refresh();
        } else if (json.status === "mislukt") {
          setFailed(true);
        }
      } catch {
        /* stil — volgende tick probeert opnieuw */
      }
    };
    const interval = setInterval(poll, 2000);
    poll();
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [profileId, router]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void runResearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) {
    return (
      <div className="card flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="chip" style={{ background: "rgba(211,58,63,0.1)", color: "#c2282d", borderColor: "rgba(211,58,63,0.3)" }}>
            Mislukt
          </span>
        </div>
        <p className="text-secondary">
          Het onderzoeken van dit klantprofiel is mislukt. Dit kan aan een tijdelijke fout liggen.
          Probeer het opnieuw.
        </p>
        {errorDetail && (
          <p className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 font-mono text-xs text-[var(--status-error)]">
            {errorDetail}
          </p>
        )}
        <button onClick={() => void runResearch()} className="btn-primary w-fit">
          Opnieuw proberen
        </button>
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="live-dot" />
        <span className="mono-label">
          {status === "klaar" ? "Klaar" : "Profiel wordt onderzocht… dit duurt doorgaans een halve minuut"}
        </span>
      </div>
      <p className="text-sm text-muted">
        Je kunt dit scherm sluiten en later terugkomen — de voortgang loopt gewoon door.
      </p>
    </div>
  );
}
