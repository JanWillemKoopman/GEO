"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ProfileTopic } from "@/lib/types/database";

/**
 * De core topics (docs/tasks/onboarding-2.0.md, blok D).
 *
 * ── DE UX-VERANDERING DIE HIER ZIT ──────────────────────────────────────────
 *
 * Van "verzin een onderwerp" naar "kies uit wat je aanbiedt". Het lege
 * tekstveld op /analyses/new blijft bestaan. Dit is een snelpad, geen
 * vervanging, maar voor een ondernemer die niet weet welk onderwerp hij moet
 * kiezen, is dit het verschil tussen wel en niet beginnen.
 *
 * ── WAAROM AFGEWEZEN TOPICS BLIJVEN STAAN ───────────────────────────────────
 *
 * Ingeklapt, maar niet weg. Een topic dat vandaag niet relevant is, is dat over
 * een half jaar misschien wel, en opnieuw laten voorstellen kan niet, want de
 * generatie is idempotent (anders zou hij de keuzes van de klant overschrijven).
 */
export function TopicsPanel({
  profileId,
  initial,
}: {
  profileId: string;
  initial: ProfileTopic[];
}) {
  const router = useRouter();
  const [topics, setTopics] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  // Geen voorstellen betekent bijna altijd: geen aanbodboom, want die is de
  // invoer. Dat is een uitlegbare situatie en geen reden om het blok te laten
  // verdwijnen (`ux-design.md` §4), de klant kan altijd zelf een onderwerp
  // kiezen, en dat is precies de volgende stap waar een lege staat naar hoort
  // te wijzen.
  if (topics.length === 0) {
    return (
      <div className="card flex flex-col gap-3">
        <span className="mono-label">Onderwerpen om op te meten</span>
        <p className="text-secondary">
          Aura kon uit je aanbod geen onderwerpen afleiden. Dat gebeurt als de
          website te weinig prijsgaf om diensten uit te herkennen, bijvoorbeeld
          bij een site die zijn tekst pas via JavaScript laadt.
        </p>
        <Link href="/analyses/nieuw" className="btn-primary w-fit">
          Kies zelf een onderwerp
        </Link>
      </div>
    );
  }

  // Wat de klant in het gesprek zei, wint van wat het model dacht: een topic
  // met een notitie staat bovenaan, ongeacht de AI-prioriteit.
  const sorted = [...topics].sort((a, b) => {
    const rang = (t: ProfileTopic) => (t.status === "afgewezen" ? 2 : t.client_note ? 0 : 1);
    return rang(a) - rang(b) || b.priority - a.priority;
  });

  const open = sorted.filter((t) => t.status !== "afgewezen");
  const afgewezen = sorted.filter((t) => t.status === "afgewezen");

  async function patch(topicId: string, patchBody: Record<string, unknown>) {
    setBusy(topicId);
    setError(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/topics`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, ...patchBody }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Opslaan is niet gelukt.");
        return;
      }
      setTopics((list) => list.map((t) => (t.id === topicId ? (json.topic as ProfileTopic) : t)));
    } catch {
      setError("Opslaan is niet gelukt. Controleer je verbinding.");
    } finally {
      setBusy(null);
    }
  }

  async function start(topicId: string) {
    setBusy(topicId);
    setError(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "De analyse kon niet starten.");
        setBusy(null);
        return;
      }
      router.push(`/analyses/${json.id}`);
    } catch {
      setError("De analyse kon niet starten. Controleer je verbinding.");
      setBusy(null);
    }
  }

  function renderTopic(t: ProfileTopic) {
    const bezig = busy === t.id;
    return (
      <li
        key={t.id}
        className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <span className="font-semibold">{t.title}</span>
          {t.analysis_id ? (
            <Link href={`/analyses/${t.analysis_id}`} className="chip chip-success">
              Analyse loopt →
            </Link>
          ) : t.status === "goedgekeurd" ? (
            <span className="chip chip-green">Goedgekeurd</span>
          ) : t.status === "afgewezen" ? (
            <span className="chip chip-neutral">Afgewezen</span>
          ) : null}
        </div>

        {t.rationale && <p className="text-sm text-secondary">{t.rationale}</p>}

        {t.client_note && (
          <p className="text-sm">
            <span className="mono-label">Uit het gesprek</span>{" "}
            <span className="text-secondary">{t.client_note}</span>
          </p>
        )}

        {noteFor === t.id ? (
          <div className="flex flex-col gap-2">
            <textarea
              className="field"
              rows={2}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Wat zei de klant hierover? Bijv. 'hier komt 40% van de omzet vandaan'."
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={bezig}
                onClick={() => {
                  void patch(t.id, { clientNote: noteText }).then(() => setNoteFor(null));
                }}
              >
                Bewaren
              </button>
              <button type="button" className="btn-outline btn-sm" onClick={() => setNoteFor(null)}>
                Annuleren
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {!t.analysis_id && (
              <button
                type="button"
                className="btn-primary btn-sm disabled:opacity-50"
                disabled={bezig}
                onClick={() => void start(t.id)}
              >
                {bezig ? "Starten…" : "Analyse starten"}
              </button>
            )}
            <button
              type="button"
              className="btn-outline btn-sm disabled:opacity-50"
              disabled={bezig}
              onClick={() => {
                setNoteText(t.client_note ?? "");
                setNoteFor(t.id);
              }}
            >
              {t.client_note ? "Notitie aanpassen" : "Notitie uit gesprek"}
            </button>
            {t.status !== "afgewezen" && !t.analysis_id && (
              <button
                type="button"
                className="btn-outline btn-sm disabled:opacity-50"
                disabled={bezig}
                onClick={() => void patch(t.id, { status: "afgewezen" })}
              >
                Niet relevant
              </button>
            )}
            {t.status === "afgewezen" && (
              <button
                type="button"
                className="btn-outline btn-sm disabled:opacity-50"
                disabled={bezig}
                onClick={() => void patch(t.id, { status: "voorgesteld" })}
              >
                Toch relevant
              </button>
            )}
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono-label">Onderwerpen om op te meten</span>
        <span className="mono-label text-muted">{open.length} voorgesteld</span>
      </div>
      <p className="text-sm text-secondary">
        Afgeleid uit de diensten en producten die Aura op je website vond. Kies waarop je wilt
        meten, of start een analyse met een eigen onderwerp.
      </p>

      <ul className="flex flex-col gap-3">{open.map(renderTopic)}</ul>

      {afgewezen.length > 0 && (
        <details className="flex flex-col gap-3">
          <summary className="mono-label cursor-pointer">
            {afgewezen.length} afgewezen onderwerp{afgewezen.length === 1 ? "" : "en"}
          </summary>
          <ul className="mt-3 flex flex-col gap-3">{afgewezen.map(renderTopic)}</ul>
        </details>
      )}

      {error && (
        <p className="text-sm text-[var(--status-error)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
