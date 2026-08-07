"use client";

import { useState } from "react";
import { InfoHint } from "@/components/info-hint";
import { ErrorNotice, problemFromResponse, networkProblem } from "@/components/error-notice";
import { ExternalLink } from "@/components/external-link";
import type { UserFacingError } from "@/lib/errors";
import type { OffsiteTask, OffsiteTaskStatus, SourceLandscapeRow } from "@/lib/types/database";

/**
 * "Daarbuiten", het off-site deel van het rapport (optimalisatie.md 7.3/7.5/7.6).
 *
 * Bewust een eigen blok naast "op je eigen site". Dat is een ander soort werk,
 * met een andere doorlooptijd en vaak een andere verantwoordelijke: een pagina
 * schrijven doe je zelf vanmiddag, op een platform komen te staan kan weken
 * duren en gaat soms via een ander.
 *
 * Elke actie is een TAAK met een status, geen zin in een rapport. Off-site
 * advies zonder status blijft hangen als goede bedoeling, en dat is precies
 * wat er in deze markt standaard mee gebeurt.
 */
const STATUS_LABEL: Record<OffsiteTaskStatus, string> = {
  open: "Open",
  bezig: "Mee bezig",
  gedaan: "Gedaan",
  niet_relevant: "Niet relevant",
};

/* Vier inline-stijlen die de bestaande chip-varianten nabouwden, met een paars
   dat in geen enkel token voorkwam. `.chip` zelf is al de paarse
   variant, dus "open" heeft geen extra klasse nodig. */
const STATUS_CHIP: Record<OffsiteTaskStatus, string> = {
  open: "",
  bezig: "chip-warning",
  gedaan: "chip-success",
  niet_relevant: "chip-neutral",
};

const NEXT_STATUS: OffsiteTaskStatus[] = ["open", "bezig", "gedaan", "niet_relevant"];

export function OffsitePanel({
  analysisId,
  initialTasks,
  landscape,
}: {
  analysisId: string;
  initialTasks: OffsiteTask[];
  landscape: SourceLandscapeRow[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [problem, setProblem] = useState<UserFacingError | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  const open = tasks.filter((t) => t.status === "open" || t.status === "bezig");
  const closed = tasks.filter((t) => t.status === "gedaan" || t.status === "niet_relevant");

  async function setStatus(taskId: string, status: OffsiteTaskStatus) {
    setBusy(taskId);
    setProblem(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/offsite/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setProblem(problemFromResponse(await res.json().catch(() => null)));
        return;
      }
      const updated = (await res.json()) as OffsiteTask;
      setTasks((ts) => ts.map((t) => (t.id === taskId ? updated : t)));
    } catch (err) {
      setProblem(networkProblem(err));
    } finally {
      setBusy(null);
    }
  }

  if (tasks.length === 0 && landscape.length === 0) return null;

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono-label flex items-center gap-1">
          Daarbuiten: wat er buiten je eigen site moet gebeuren
          <InfoHint label="Waarom kijkt Aura hiernaar?">
            Bij koopvragen leunen AI-assistenten zwaar op ándere sites: reviewplatforms,
            vergelijkers en lijstjes. Sta je daar niet op, dan maakt geen enkele tekst op je eigen
            site dat goed.
          </InfoHint>
        </span>
        {open.length > 0 && <span className="mono-label">{open.length} open</span>}
      </div>

      {problem && <ErrorNotice error={problem} />}

      {open.length === 0 && closed.length > 0 && (
        <p className="text-sm text-secondary">
          Alle off-site punten afgehandeld. Vindt Aura bij een volgende meting nieuwe bronnen, dan
          staan ze hier.
        </p>
      )}

      {open.length > 0 && (
        <ul className="flex flex-col gap-2">
          {open.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              busy={busy === task.id}
              onStatus={setStatus}
            />
          ))}
        </ul>
      )}

      {closed.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3">
          <button
            type="button"
            onClick={() => setShowDone((s) => !s)}
            className="w-fit text-sm text-secondary hover:underline"
            aria-expanded={showDone}
          >
            {showDone ? "Verberg" : "Toon"} afgehandeld ({closed.length})
          </button>
          {showDone && (
            <ul className="flex flex-col gap-2">
              {closed.map((task) => (
                <TaskCard key={task.id} task={task} busy={busy === task.id} onStatus={setStatus} />
              ))}
            </ul>
          )}
        </div>
      )}

      {landscape.length > 0 && <LandscapeTable landscape={landscape} />}
    </div>
  );
}

function TaskCard({
  task,
  busy,
  onStatus,
}: {
  task: OffsiteTask;
  busy: boolean;
  onStatus: (id: string, status: OffsiteTaskStatus) => void;
}) {
  const dimmed = task.status === "gedaan" || task.status === "niet_relevant";

  return (
    <li
      className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3"
      style={dimmed ? { opacity: 0.65 } : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="flex-1 font-medium">{task.title}</span>
        <span className={`chip shrink-0 ${STATUS_CHIP[task.status]}`}>
          {STATUS_LABEL[task.status]}
        </span>
      </div>

      <p className="text-sm text-secondary">{task.why}</p>
      {task.action && (
        <p className="text-sm text-secondary">
          <span className="font-medium text-[var(--text-primary)]">Wat je kunt doen: </span>
          {task.action}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {NEXT_STATUS.filter((s) => s !== task.status).map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => onStatus(task.id, s)}
            className="chip"
            style={{
              fontSize: "0.7rem",
              cursor: "pointer",
              background: "transparent",
              color: "var(--text-muted)",
              borderColor: "var(--border-subtle)",
            }}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>
    </li>
  );
}

/**
 * Het bronnenlandschap als tabel (7.1).
 *
 * Ook de bronnen waar de klant wél op staat, en die waarvan we het niet konden
 * vaststellen. Dat laatste staat er expliciet als "niet gecontroleerd" en niet
 * als een leeg vakje, een leeg vakje leest als "nee", en dan sturen we iemand
 * op pad voor iets wat misschien al geregeld is.
 */
function LandscapeTable({ landscape }: { landscape: SourceLandscapeRow[] }) {
  return (
    <details className="text-sm">
      <summary className="mono-label cursor-pointer transition-colors hover:text-[var(--text-primary)]">
        Welke bronnen bepalen jouw markt ({landscape.length})
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted">
              <th className="py-1 pr-4 font-normal">Bron</th>
              <th className="py-1 pr-4 font-normal">Bij hoeveel vragen</th>
              <th className="py-1 pr-4 font-normal">Sta jij erop?</th>
              <th className="py-1 pr-4 font-normal">Wie wel</th>
            </tr>
          </thead>
          <tbody>
            {landscape.map((row) => (
              <tr key={row.id} className="border-t border-[var(--border-subtle)]">
                <td className="py-1 pr-4 font-medium">{row.domain}</td>
                <td className="py-1 pr-4 text-secondary">{row.prompt_count}</td>
                <td className="py-1 pr-4">
                  {row.own_present === true ? (
                    <span style={{ color: "var(--status-success)" }}>
                      ✓ ja
                      {row.own_url && (
                        <>
                          {" "}
                          <ExternalLink href={row.own_url}>bekijk</ExternalLink>
                        </>
                      )}
                    </span>
                  ) : row.own_present === false ? (
                    <span style={{ color: "var(--status-error)" }}>✕ nee</span>
                  ) : (
                    <span className="text-muted">niet gecontroleerd</span>
                  )}
                </td>
                <td className="py-1 pr-4 text-secondary">
                  {row.competitors.length > 0 ? row.competitors.slice(0, 2).join(", ") : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
