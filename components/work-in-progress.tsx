"use client";

/**
 * Wacht-scherm (optimalisatie.md 1.7/1.9/1.10).
 *
 * Vervangt het patroon dat in prepare-/measure-/report-progress drie keer los
 * herhaald werd. Drie dingen zijn wezenlijk anders dan voorheen:
 *
 * 1. Dit component START GEEN WERK. De voortgangsschermen deden dat zelf met een
 *    fetch, terwijl er onderaan stond "je kunt dit scherm sluiten" — wat dus
 *    niet klopte. Nu plant de route het werk in en doet de werker het; dit
 *    scherm kijkt alleen toe.
 * 2. De tijdsindicatie komt uit de taakstand in plaats van uit een vaste tekst
 *    ("dit duurt doorgaans een halve minuut"), en is een bereik.
 * 3. Voltooide stappen blijven voltooid — de stappenlijst kan niet terugspringen.
 */
import { useEffect, useRef, useState } from "react";

export interface WorkStep {
  label: string;
  done: boolean;
}

export function WorkInProgress({
  title,
  explanation,
  steps,
  etaText,
  retrying,
}: {
  title: string;
  explanation: string;
  steps?: WorkStep[];
  /** Bv. "nog ongeveer 2 tot 3 minuten". Null zolang er niets bekend is. */
  etaText?: string | null;
  /** Loopt er een nieuwe poging na een tegenslag? Dan zeggen we dat eerlijk. */
  retrying?: boolean;
}) {
  // Voltooide stappen blijven voltooid (1.10). De server kan bij een nieuwe
  // poging tijdelijk "nog niet klaar" terugmelden; dat mag een afgevinkte stap
  // niet ongedaan maken — dat leest als achteruitgang.
  const highWater = useRef<boolean[]>([]);
  const stable = (steps ?? []).map((s, i) => {
    highWater.current[i] = highWater.current[i] || s.done;
    return { ...s, done: highWater.current[i] };
  });
  const activeIndex = stable.findIndex((s) => !s.done);

  return (
    <div className="card flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="live-dot" />
        <span className="mono-label">{title}</span>
        {etaText && <span className="text-sm text-muted">· {etaText}</span>}
      </div>

      <p className="text-secondary">{explanation}</p>

      {retrying && (
        <p className="text-sm text-muted">
          Er ging net iets mis aan de kant van de AI-dienst. We proberen het automatisch opnieuw —
          je hoeft niets te doen.
        </p>
      )}

      {stable.length > 0 && (
        <ul className="flex flex-col gap-3">
          {stable.map((step, i) => (
            <li key={step.label} className="flex items-center gap-3">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs"
                style={{
                  background: step.done ? "rgba(46,158,80,0.2)" : "transparent",
                  border: step.done ? "none" : "1px solid var(--border-strong)",
                  color: step.done ? "var(--accent-green-text)" : "var(--text-muted)",
                }}
              >
                {step.done ? "✓" : ""}
              </span>
              <span
                style={{ color: step.done || i === activeIndex ? "var(--text-primary)" : "var(--text-muted)" }}
              >
                {step.label}
              </span>
              {i === activeIndex && <span className="live-dot" style={{ marginLeft: "auto" }} />}
            </li>
          ))}
        </ul>
      )}

      {/* Dit is nu WAAR — het werk draait op de achtergrond, niet in deze tab.
          "of wacht op de e-mail" stond hier ook, en dat was het NIET: uitgaande
          mail staat standaard uit (EMAILS_ENABLED, .env.example) en op productie
          stond hij op 1 augustus 2026 inderdaad uit. Wie het scherm sloot en op
          een mailtje wachtte, wachtte voor niets. Dit component is een client-
          component en kan de serverschakelaar niet zien, dus staat er nu alleen
          wat onder alle omstandigheden waar is. */}
      <p className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-sm text-secondary">
        <strong className="font-medium">Je kunt dit scherm sluiten.</strong> Het werk draait op de
        achtergrond door en loopt gewoon af, ook als je de browser afsluit — kom gerust later terug.
      </p>
    </div>
  );
}

/**
 * Pollt een status-endpoint tot een eindtoestand bereikt is. Gedeeld door alle
 * voortgangsschermen zodat het interval, het opruimen en het stil afvangen van
 * netwerkfouten op één plek staan.
 */
export function useStatusPoll<T extends { status: string }>(
  url: string,
  isTerminal: (data: T) => boolean,
  onTerminal: (data: T) => void,
  intervalMs = 3000,
) {
  const [data, setData] = useState<T | null>(null);
  const onTerminalRef = useRef(onTerminal);
  onTerminalRef.current = onTerminal;

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const poll = async () => {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as T;
        if (!active) return;
        setData(json);
        if (isTerminal(json)) {
          if (timer) clearInterval(timer);
          onTerminalRef.current(json);
        }
      } catch {
        /* stil — netwerkfout, volgende tick probeert opnieuw */
      }
    };

    timer = setInterval(poll, intervalMs);
    void poll();
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
    // isTerminal is bewust geen dependency: het is een inline-functie die elke
    // render een nieuwe identiteit heeft en de poll anders zou herstarten.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, intervalMs]);

  return data;
}
