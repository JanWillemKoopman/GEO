"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InfoHint } from "@/components/info-hint";
import { ErrorNotice, problemFromResponse, networkProblem } from "@/components/error-notice";
import { ExternalLink } from "@/components/external-link";
import { CopyButton } from "@/components/copy-button";
import type { UserFacingError } from "@/lib/errors";
import type { PublishCheck } from "@/lib/pipeline/publish-check";
import { formatDateLong } from "@/lib/format";

/**
 * "Deze pagina staat live" (optimalisatie.md 5.1/5.2/5.3).
 *
 * Het scharnierpunt van fase 5. Tot hier levert de app tekst; vanaf hier kan hij
 * volgen of het iets uithaalt. Vandaar dat er bij de knop staat wat er daarna
 * gebeurt, een klant die niet weet dat er over twee weken hermeten wordt, ziet
 * later een meting waar hij niet om gevraagd heeft.
 */
export function PublishBox({
  analysisId,
  pieceId,
  publishedAt,
  publishedUrl,
  check,
  checkedAt,
}: {
  analysisId: string;
  pieceId: string;
  publishedAt: string | null;
  publishedUrl: string | null;
  check: PublishCheck | null;
  checkedAt: string | null;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(publishedUrl ?? "");
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const [problem, setProblem] = useState<UserFacingError | null>(null);
  // A.9: bevestiging vóór een handeling die niet zomaar ongedaan te maken is,
  // dit zet twee hermetingen in de rij (over twee en vier weken). Zelfde
  // patroon als RerunResearchButton: geen modaal venster, één klik wordt twee.
  const [confirming, setConfirming] = useState(false);

  async function publish() {
    setState("busy");
    setProblem(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/content/${pieceId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) {
        setState("error");
        setProblem(problemFromResponse(await res.json().catch(() => null)));
        return;
      }
      setState("idle");
      router.refresh();
    } catch (err) {
      setState("error");
      setProblem(networkProblem(err));
    }
  }

  async function unpublish() {
    setState("busy");
    try {
      await fetch(`/api/analyses/${analysisId}/content/${pieceId}/publish`, { method: "DELETE" });
      setState("idle");
      router.refresh();
    } catch (err) {
      setState("error");
      setProblem(networkProblem(err));
    }
  }

  if (state === "error" && problem) {
    return <ErrorNotice error={problem} onRetry={() => void publish()} />;
  }

  // ── Al gepubliceerd ───────────────────────────────────────────────────────
  if (publishedAt) {
    return (
      <div className="card card-success flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="mono-label flex items-center gap-1">
            Live
            <InfoHint label="Wat gebeurt er nu?">
              Aura hermeet de vragen waarvoor deze pagina gemaakt is, twee en vier weken na
              publicatie. AI-assistenten pikken nieuwe content niet dezelfde dag op, dus eerder
              meten zegt niets.
            </InfoHint>
          </span>
          <span className="mono-label">
            {formatDateLong(publishedAt)}
          </span>
        </div>

        {publishedUrl && (
          <div className="flex flex-wrap items-center gap-3">
            <ExternalLink href={publishedUrl} className="w-fit break-all text-sm underline">
              {publishedUrl}
            </ExternalLink>
            <CopyButton value={publishedUrl} label="Kopieer link" className="text-sm text-secondary hover:underline" />
          </div>
        )}

        <PublishCheckNotice check={check} checkedAt={checkedAt} />

        <p className="text-sm text-secondary">
          Aura hermeet de bijbehorende vragen over twee en over vier weken. Het resultaat komt
          vanzelf in hoofdstuk 04 van je analyse te staan. Jij hoeft niets.
        </p>

        <button
          type="button"
          onClick={() => void unpublish()}
          disabled={state === "busy"}
          className="w-fit text-sm text-secondary hover:underline"
        >
          Toch niet gepubliceerd
        </button>
      </div>
    );
  }

  // ── Nog niet gepubliceerd ─────────────────────────────────────────────────
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="mono-label flex items-center gap-1">
          Staat deze pagina al live?
          <InfoHint label="Waarom vraagt Aura dit?">
            Zodra je hier de link invult, hermeet Aura de vragen waarvoor deze pagina gemaakt is,
            twee en vier weken later. Dan zie je zwart-op-wit of het gewerkt heeft.
          </InfoHint>
        </span>
        <p className="text-sm text-secondary">
          Geef de link, dan controleert Aura of de tekst er echt op staat. Daarna volgt het of je op
          de bijbehorende vragen vaker genoemd wordt.
        </p>
      </div>

      {!confirming ? (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (url.trim()) setConfirming(true);
          }}
        >
          <input
            className="field flex-1"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://jouwsite.nl/de-nieuwe-pagina"
            aria-label="Link naar de gepubliceerde pagina"
            disabled={state === "busy"}
          />
          <button type="submit" className="btn-primary btn-lg shrink-0" disabled={state === "busy" || !url.trim()}>
            Dit staat live
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3">
          <p className="text-sm text-secondary">
            Aura zet nu twee hermetingen in de rij, over twee en over vier weken, om te zien of deze
            pagina het verschil maakt. Klopt de link?
          </p>
          <p className="w-fit break-all text-sm font-medium">{url.trim()}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary btn-sm disabled:opacity-60"
              disabled={state === "busy"}
              onClick={() => void publish()}
            >
              {state === "busy" ? "Controleren…" : "Ja, dit staat live"}
            </button>
            <button
              type="button"
              className="btn-outline btn-sm"
              disabled={state === "busy"}
              onClick={() => setConfirming(false)}
            >
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * De uitslag van de controle (5.2).
 *
 * Een probleem hier is geen foutmelding maar een waarschuwing: de klant dénkt
 * dat het klaar is, en zonder dit blokje wacht hij weken op een effect dat nooit
 * kan komen. Vandaar dat er altijd bij staat wat hij ermee moet.
 */
function PublishCheckNotice({ check, checkedAt }: { check: PublishCheck | null; checkedAt: string | null }) {
  if (!check) {
    return (
      <p className="flex items-center gap-2 text-sm text-secondary">
        <span className="live-dot" />
        Aura controleert de pagina…
      </p>
    );
  }

  if (check.problems.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--status-success)" }}>
        ✓ Gecontroleerd: de tekst staat erop
        {check.schemaFound ? ", inclusief de gestructureerde data" : ""}.
        {checkedAt && (
          <span className="text-muted">
            {" "}
            ({formatDateLong(checkedAt)})
          </span>
        )}
      </p>
    );
  }

  return (
    <div
      className="card-warning flex flex-col gap-1 rounded-[var(--radius-md)] border p-3"
    >
      <span className="text-sm font-medium">Even controleren</span>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-secondary">
        {check.problems.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </div>
  );
}
