"use client";

import { useState } from "react";
import { InfoHint } from "@/components/info-hint";
import { ErrorNotice, problemFromResponse, networkProblem } from "@/components/error-notice";
import type { UserFacingError } from "@/lib/errors";
import type { FactRequest } from "@/lib/types/database";

/**
 * De klant om feiten vragen (optimalisatie.md 4.6).
 *
 * De schrijfinstructie zegt "verzin geen feiten, blijf algemeen bij twijfel".
 * Bij een klant met een dunne website levert dat gegarandeerd algemene tekst op
 * — en algemeen is precies wat een AI-assistent niet citeert. Die spanning los
 * je niet op met een betere prompt; je lost hem op door het te vragen.
 *
 * Dat is meteen het sterkste UX-moment van de app: de klant vult drie getallen
 * in en ziet dat élke volgende pagina er concreter van wordt. Vandaar dat er bij
 * elke vraag staat waaróm we het vragen, en dat overslaan net zo makkelijk is
 * als antwoorden — een formulier dat je moet invullen is een drempel, een vraag
 * die je mág beantwoorden is een uitnodiging.
 */
export function FactRequests({ profileId, initial }: { profileId: string; initial: FactRequest[] }) {
  const [facts, setFacts] = useState(initial);
  const [problem, setProblem] = useState<UserFacingError | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showAnswered, setShowAnswered] = useState(false);

  const open = facts.filter((f) => f.status === "open");
  const answered = facts.filter((f) => f.status === "beantwoord");

  async function send(factId: string, payload: { answer?: string; skip?: boolean }) {
    setBusy(factId);
    setProblem(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/facts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factId, ...payload }),
      });
      if (!res.ok) {
        setProblem(problemFromResponse(await res.json().catch(() => null)));
        return;
      }
      const updated = (await res.json()) as FactRequest;
      setFacts((fs) => fs.map((f) => (f.id === factId ? updated : f)));
    } catch (err) {
      setProblem(networkProblem(err));
    } finally {
      setBusy(null);
    }
  }

  if (facts.length === 0) return null;

  return (
    <div id="feiten" className="card flex scroll-mt-4 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono-label flex items-center gap-1">
          Help Aura concreter te schrijven
          <InfoHint label="Waarom deze vragen?">
            AI-assistenten citeren harde feiten — cijfers, jaartallen, termijnen — en slaan algemene
            beloftes over. Wat je hier invult gebruikt Aura in élke pagina die het schrijft, niet
            alleen in de eerstvolgende.
          </InfoHint>
        </span>
        <span className="mono-label">
          {answered.length} van de {facts.length} beantwoord
        </span>
      </div>

      {problem && <ErrorNotice error={problem} />}

      {open.length === 0 ? (
        <p className="text-sm text-secondary">
          Alle vragen gehad. Komen er bij een volgend rapport nieuwe bij, dan staan ze hier.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {open.map((fact) => (
            <FactCard key={fact.id} fact={fact} busy={busy === fact.id} onSend={send} />
          ))}
        </ul>
      )}

      {answered.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3">
          <button
            type="button"
            onClick={() => setShowAnswered((s) => !s)}
            className="w-fit text-sm text-secondary hover:underline"
            aria-expanded={showAnswered}
          >
            {showAnswered ? "Verberg" : "Toon"} wat je al invulde ({answered.length})
          </button>
          {showAnswered && (
            <ul className="flex flex-col gap-1.5">
              {answered.map((f) => (
                <li key={f.id} className="text-sm">
                  <span className="text-muted">{f.question} </span>
                  <span className="text-secondary">{f.answer}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function FactCard({
  fact,
  busy,
  onSend,
}: {
  fact: FactRequest;
  busy: boolean;
  onSend: (factId: string, payload: { answer?: string; skip?: boolean }) => void;
}) {
  const [answer, setAnswer] = useState("");

  return (
    <li className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
      <p className="font-medium">{fact.question}</p>
      {fact.reason && <p className="text-sm text-muted">{fact.reason}</p>}

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          const value = answer.trim();
          if (value) onSend(fact.id, { answer: value });
        }}
      >
        <input
          className="field flex-1"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Jouw antwoord…"
          aria-label={fact.question}
          disabled={busy}
        />
        <div className="flex shrink-0 items-center gap-3">
          <button type="submit" className="btn-outline" disabled={busy || !answer.trim()}>
            Opslaan
          </button>
          <button
            type="button"
            onClick={() => onSend(fact.id, { skip: true })}
            disabled={busy}
            className="text-sm text-secondary hover:underline"
            // Overslaan blijft bewaard, zodat een volgend rapport dezelfde vraag
            // niet opnieuw stelt. Niets is vervelender dan een app die blijft zeuren.
            title="Aura vraagt het niet nog een keer."
          >
            Weet ik niet
          </button>
        </div>
      </form>
    </li>
  );
}
