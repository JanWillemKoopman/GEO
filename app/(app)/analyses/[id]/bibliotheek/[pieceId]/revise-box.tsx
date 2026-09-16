"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ErrorNotice, problemFromResponse, networkProblem } from "@/components/error-notice";
import type { UserFacingError } from "@/lib/errors";
import type { PoortOordeel } from "@/lib/content-final-gate";
import { MAX_STRATEGY_NOTE_LENGTH } from "@/lib/plan-constants";

/**
 * "Wat moet er anders?" (optimalisatie.md 4.8).
 *
 * De belangrijkste ontbrekende knop in de hele app. Een pagina die er bijna was
 * kon alleen geaccepteerd of genegeerd worden, "maak hem korter", "de toon is
 * te formeel", "noem onze levertijd erbij" was nergens te zeggen, en dan is het
 * hele redactieproces eenrichtingsverkeer.
 *
 * Het resultaat is een NIEUWE VERSIE, geen overschrijving: gaat het slechter,
 * dan kan de klant terug.
 */
const SUGGESTIONS = [
  "Maak hem korter en concreter",
  "De toon is te formeel",
  "Meer nadruk op wat wij anders doen",
  "Voeg onze prijzen en levertijden toe",
];

/**
 * De originele "opnieuw schrijven"-knop en -dialoog, ongewijzigd op de
 * schrijfopdracht en de eindpoort na. De merkbrede notitie hieronder in
 * `ReviseBox` staat er los naast: eigen opslagactie, eigen slot, niet
 * gegate door `poort` of `open`, want een merkbrede instructie aanpassen is
 * geen "nieuwe versie van deze pagina" en hoort dus niet aan diezelfde knop te
 * hangen.
 */
function RewriteFlow({
  analysisId,
  pieceId,
  poort,
  vragenHref,
}: {
  analysisId: string;
  pieceId: string;
  /**
   * Houden openstaande vragen een nieuwe versie tegen? (28 augustus 2026)
   *
   * Een nieuwe versie is de versie die definitief wordt, en die schrijft ORBIT
   * ENGINE pas als de vragen behandeld zijn (`lib/content-final-gate.ts`). Het
   * eerste concept mag wél met open vragen: de scherpste vragen ontstaan pas
   * tijdens dat schrijven.
   */
  poort: PoortOordeel;
  /** Waar die vragen staan. */
  vragenHref: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "queued" | "error">("idle");
  const [problem, setProblem] = useState<UserFacingError | null>(null);

  async function submit() {
    const value = note.trim();
    if (!value) return;

    setState("busy");
    setProblem(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/content/${pieceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: value }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setProblem(problemFromResponse(json));
        return;
      }
      setState("queued");
      // De nieuwe versie verschijnt vanzelf; de pagina verversen zodat de klant
      // de versiegeschiedenis ziet groeien zodra hij terugkomt.
      router.refresh();
    } catch (err) {
      setState("error");
      setProblem(networkProblem(err));
    }
  }

  if (state === "error" && problem) {
    return <ErrorNotice error={problem} onRetry={() => void submit()} />;
  }

  if (state === "queued") {
    return (
      <div className="card card-accent flex flex-col gap-2">
        <span className="flex items-center gap-2 font-medium">
          <span className="live-dot" />
          ORBIT ENGINE schrijft een nieuwe versie
        </span>
        <p className="text-sm text-secondary">
          Dit duurt een paar minuten. Je kunt dit scherm sluiten. De nieuwe versie komt er vanzelf
          te staan, en deze blijft bewaard voor het geval je terug wilt.
        </p>
      </div>
    );
  }

  // ⚠️ De poort staat vóór de knop en niet erachter: een knop die openklapt naar
  // een formulier dat je niet kunt versturen, laat de klant eerst typen en dan
  // pas ontdekken dat het niet kan. Dat is de omgekeerde volgorde van uitleggen.
  if (!poort.mag) {
    return (
      <div className="card flex flex-col gap-2">
        <span className="mono-label">Nog geen nieuwe versie</span>
        <p className="text-sm text-secondary">{poort.melding}</p>
        <Link href={vragenHref} className="btn-outline btn-sm w-fit">
          Naar je openstaande vragen
        </Link>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline w-fit">
        Iets aanpassen aan deze tekst
      </button>
    );
  }

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="mono-label">Wat moet er anders?</span>
        <p className="text-sm text-secondary">
          Schrijf het in je eigen woorden. ORBIT ENGINE maakt een nieuwe versie; deze blijft bewaard.
        </p>
      </div>

      <textarea
        className="field"
        rows={4}
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Bijvoorbeeld: de eerste alinea mag directer, en noem er onze openingstijden bij."
        aria-label="Wat moet er anders aan deze tekst?"
      />

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            // Aanvullen in plaats van vervangen: de klant kan meerdere punten
            // stapelen, en wat hij al getypt had gaat niet verloren.
            onClick={() => setNote((n) => (n.trim() ? `${n.trim()}\n${s}` : s))}
            className="chip"
            style={{
              fontSize: "0.7rem",
              background: "transparent",
              color: "var(--text-muted)",
              borderColor: "var(--border-subtle)",
            }}
          >
            + {s}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={state === "busy" || !note.trim()}
          className="btn-primary w-fit"
        >
          {state === "busy" ? "Doorgeven aan ORBIT ENGINE…" : "Schrijf een nieuwe versie"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-secondary hover:underline">
          Annuleren
        </button>
      </div>
    </div>
  );
}

export function ReviseBox({
  analysisId,
  pieceId,
  poort,
  vragenHref,
  profileId,
  strategyNote,
}: {
  analysisId: string;
  pieceId: string;
  poort: PoortOordeel;
  vragenHref: string;
  profileId: string;
  /**
   * De merkbrede notitie voor de schrijver (blok D punt 22). `null` als er nog
   * geen plan is: dan is er niets om de notitie aan te hangen, en verschijnt
   * de editor niet (Nova's `noteUnavailable`, hier met een duidelijker reden
   * in plaats van "kon niet geladen worden").
   */
  strategyNote: { note: string | null; updatedAt: string } | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      {strategyNote && <StrategyNoteBox profileId={profileId} initial={strategyNote} />}
      <RewriteFlow analysisId={analysisId} pieceId={pieceId} poort={poort} vragenHref={vragenHref} />
    </div>
  );
}

/**
 * De notitie voor de schrijver, merkbreed (blok D punt 22, Nova's
 * `contentActions.rewrite.noteLabel`/`noteScopeTitle`).
 *
 * ── WAAROM DIT EEN EIGEN OPSLAGKNOP HEEFT, GEEN COMBINATIE MET "SCHRIJF EEN
 * NIEUWE VERSIE" ────────────────────────────────────────────────────────────
 *
 * Nova bewaart deze notitie samen met het inplannen van een herschrijving, in
 * één klik. Hier bewust losgeknipt: een merkbrede instructie aanpassen mag
 * nooit als bijverschijnsel een betaalde AI-herschrijfronde van déze ene
 * pagina meetrekken. Twee aparte knoppen, twee aparte gevolgen.
 */
function StrategyNoteBox({
  profileId,
  initial,
}: {
  profileId: string;
  initial: { note: string | null; updatedAt: string };
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(initial.note ?? "");
  // De laatst OPGESLAGEN tekst, apart van `note` (wat er nu in het veld staat).
  // Zonder dit onderscheid zou de knop na een geslaagde opslag weer aanklikbaar
  // worden zodra je de dialoog opnieuw opent: `initial` is een prop en
  // verandert niet mee met een lokale save.
  const [opgeslagenNote, setOpgeslagenNote] = useState(initial.note ?? "");
  const [updatedAt, setUpdatedAt] = useState(initial.updatedAt);
  const [state, setState] = useState<"idle" | "busy" | "saved" | "error">("idle");
  const [problem, setProblem] = useState<UserFacingError | null>(null);

  async function save() {
    setState("busy");
    setProblem(null);
    try {
      const res = await fetch(`/api/profiles/${profileId}/plan/note`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note, updatedAt }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setState("error");
        setProblem({
          kind: "unknown",
          title: res.status === 409 ? "Iemand anders was je voor" : "Opslaan is niet gelukt",
          message: (json as { error?: string } | null)?.error ?? "Probeer het opnieuw.",
          canRetry: res.status !== 409,
          detail: "",
        });
        return;
      }
      setUpdatedAt((json as { updatedAt: string }).updatedAt);
      setOpgeslagenNote(note);
      setState("saved");
      setOpen(false);
    } catch (err) {
      setState("error");
      setProblem(networkProblem(err));
    }
  }

  if (state === "error" && problem) {
    return <ErrorNotice error={problem} onRetry={() => void save()} />;
  }

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOpen(true)} className="btn-outline w-fit">
          {opgeslagenNote ? "Notitie voor de schrijver aanpassen" : "Notitie voor de schrijver toevoegen"}
        </button>
        {state === "saved" && (
          <span className="text-sm text-secondary">Opgeslagen</span>
        )}
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <span className="mono-label">Notitie voor de schrijver</span>
        {/* Nova's noteScopeTitle/-Description, vertaald: dit is geen aantekening
            bij deze ene pagina. */}
        <p className="text-sm text-secondary">
          Geldt voor het hele merk, niet voor deze ene pagina: elke nog niet geschreven pagina neemt
          dit mee, ook wat al klaarstaat om geschreven te worden.
        </p>
      </div>

      <textarea
        className="field"
        rows={2}
        autoFocus
        value={note}
        maxLength={MAX_STRATEGY_NOTE_LENGTH}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Vanaf november openen we in Breda"
        aria-label="Notitie voor de schrijver, voor het hele merk"
      />
      <span className="mono-label text-muted" style={{ fontSize: "0.65rem" }}>
        {note.length}/{MAX_STRATEGY_NOTE_LENGTH}
      </span>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={state === "busy" || note.trim() === opgeslagenNote.trim()}
          className="btn-primary btn-sm w-fit"
        >
          {state === "busy" ? "Opslaan…" : "Opslaan"}
        </button>
        <button
          type="button"
          onClick={() => {
            setNote(opgeslagenNote);
            setOpen(false);
          }}
          className="text-sm text-secondary hover:underline"
        >
          Annuleren
        </button>
      </div>
    </div>
  );
}
