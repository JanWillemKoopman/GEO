"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Het briefingscherm (contentbriefing.md §8, implementatieplan.md R5.2).
 *
 * ── WAAROM DIT GEEN WIZARD IS ───────────────────────────────────────────────
 *
 * Eén scherm, alles zichtbaar. Een wizard van acht stappen voelt als acht keer
 * werk; acht vragen onder elkaar met een voortgangsbalk voelt als één taak die
 * je ziet slinken. De klant moet bovendien kunnen zien wat hij nog te gaan heeft
 * vóórdat hij begint. Dat is het verschil tussen "even doen" en "later".
 *
 * ── DE KNOP STAAT NOOIT UIT ─────────────────────────────────────────────────
 *
 * Geen rode foutmeldingen, geen geblokkeerde knop bij een lege verplichte vraag.
 * De klant kan altijd door (README.md §2); wat hij overslaat kost hem geen
 * pagina maar een passage, en dat staat er eerlijk onder de knop. Een gate die
 * je niet kunt passeren is geen gate maar een muur, en muren leveren
 * afgehaakte klanten op in plaats van betere content.
 */

export interface BriefingQuestionView {
  id: string;
  question: string;
  reason: string;
  kind: string;
  answerType: string;
  options: string[];
  suggestedAnswer: string | null;
  required: boolean;
  answer: string | null;
  status: string;
  /** Titels van de pagina's die beter worden van dit antwoord. */
  affects: string[];
}

/**
 * Menselijke kopjes per vraagsoort. Niet "verificatie" maar "even bevestigen",
 * de klant leest geen categorieënmodel, hij leest een vraag van zijn leverancier.
 */
const KIND_HEADING: Record<string, { title: string; hint: string }> = {
  verificatie: {
    title: "Even bevestigen",
    hint: "Dit vond Aura op je site. Klopt het nog?",
  },
  aanvulling: {
    title: "Wat Aura niet kan weten",
    hint: "Dit staat nergens online. Zonder jouw antwoord blijft het uit de tekst.",
  },
  onderscheid: {
    title: "Waarom jij",
    hint: "Dit is het antwoord dat geen enkele concurrent kan geven, en het meest waardevolle wat je hier invult.",
  },
  bewijs: {
    title: "Cijfers en voorbeelden",
    hint: "Eén eigen getal maakt een pagina geloofwaardiger dan tien mooie zinnen.",
  },
  praktisch: {
    title: "Praktisch",
    hint: "Adres, telefoon, links. Zonder deze gegevens blijven er gaten in de pagina.",
  },
  grenzen: {
    title: "Wat Aura juist niet mag beweren",
    hint: "Zeg je hier nee, dan schrijft Aura het niet. Ook niet voorzichtig.",
  },
};

const KIND_ORDER = ["verificatie", "onderscheid", "aanvulling", "bewijs", "praktisch", "grenzen"];

type Draft = Record<string, { value: string; skipped: boolean }>;

export function BriefingForm({
  analysisId,
  questions,
  pageCount,
}: {
  analysisId: string;
  questions: BriefingQuestionView[];
  pageCount: number;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() =>
    Object.fromEntries(
      questions.map((q) => [
        q.id,
        // Een al beantwoorde vraag begint gevuld; een nog open vraag met een
        // voorstel begint LEEG. Het voorstel staat ernaast als knop. Zou het
        // voorstel voorgevuld zijn, dan is "ja" de standaard en bevestigt de
        // klant iets wat hij niet gelezen heeft. Dan is de hele ronde theater.
        { value: q.answer ?? "", skipped: q.status === "overgeslagen" },
      ]),
    ),
  );
  const [busy, setBusy] = useState<null | "save" | "write">(null);
  const [error, setError] = useState<string | null>(null);

  const beantwoord = useMemo(
    () => questions.filter((q) => draft[q.id]?.value.trim() && !draft[q.id]?.skipped).length,
    [draft, questions],
  );
  const open = questions.filter((q) => !draft[q.id]?.value.trim() && !draft[q.id]?.skipped);
  const openVerplicht = open.filter((q) => q.required);

  const gegroepeerd = KIND_ORDER.map((kind) => ({
    kind,
    meta: KIND_HEADING[kind] ?? { title: "Overig", hint: "" },
    items: questions.filter((q) => q.kind === kind),
  })).filter((g) => g.items.length > 0);

  async function submit(action: "save" | "write") {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/analyses/${analysisId}/briefing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          answers: questions.map((q) => ({
            id: q.id,
            answer: draft[q.id]?.value ?? "",
            skip: draft[q.id]?.skipped ?? false,
          })),
        }),
      });
      if (!res.ok) {
        // A.5: server- en netwerkfouten apart afhandelen, anders komt een
        // weggevallen verbinding op het scherm als "Failed to fetch".
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Opslaan is niet gelukt. Probeer het opnieuw.");
        return;
      }
      if (action === "write") router.push(`/analyses/${analysisId}/bibliotheek`);
      else router.refresh();
    } catch {
      setError("We konden Aura niet bereiken. Controleer je verbinding en probeer het opnieuw.");
    } finally {
      setBusy(null);
    }
  }

  function set(id: string, value: string) {
    setDraft((d) => ({ ...d, [id]: { value, skipped: false } }));
  }

  function toggleSkip(id: string) {
    setDraft((d) => ({ ...d, [id]: { value: "", skipped: !d[id]?.skipped } }));
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold">Nog even dit, dan schrijft Aura je pagina&apos;s</h1>
        <p style={{ color: "var(--text-secondary)" }}>
          Je koos {pageCount} {pageCount === 1 ? "pagina" : "pagina's"}. Deze{" "}
          {questions.length} {questions.length === 1 ? "vraag zorgt" : "vragen zorgen"} dat er
          alleen kloppende informatie in komt te staan. Wat je niet beantwoordt, laat Aura weg. Het
          verzint niets.
        </p>

        <div className="flex items-center gap-3">
          <div
            className="h-2 flex-1 overflow-hidden rounded-[var(--radius-pill)]"
            style={{ background: "var(--bg-elevated)" }}
            role="progressbar"
            aria-valuenow={beantwoord}
            aria-valuemin={0}
            aria-valuemax={questions.length}
            aria-label="Voortgang van de briefing"
          >
            <div
              className="h-full transition-all"
              style={{
                width: `${questions.length ? (beantwoord / questions.length) * 100 : 0}%`,
                background: "var(--intent-intelligence-solid)",
              }}
            />
          </div>
          <span className="mono-label whitespace-nowrap">
            {beantwoord} van de {questions.length}
          </span>
        </div>
      </header>

      {gegroepeerd.map((groep) => (
        <section key={groep.kind} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1 border-b border-[var(--border-subtle)] pb-2">
            <h2 className="text-lg font-medium">{groep.meta.title}</h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {groep.meta.hint}
            </p>
          </div>

          {groep.items.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              value={draft[q.id]?.value ?? ""}
              skipped={draft[q.id]?.skipped ?? false}
              onChange={(v) => set(q.id, v)}
              onToggleSkip={() => toggleSkip(q.id)}
            />
          ))}
        </section>
      ))}

      {error && (
        <p className="card card-danger" role="alert">
          {error}
        </p>
      )}

      <footer className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-4">
        {open.length > 0 && (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {openVerplicht.length > 0 ? (
              <>
                Je pagina&apos;s worden geschreven zónder informatie over{" "}
                <strong>
                  {openVerplicht
                    .slice(0, 3)
                    .map((q) => q.question.replace(/\?$/, "").toLowerCase())
                    .join(", ")}
                </strong>
                {openVerplicht.length > 3 ? ` en nog ${openVerplicht.length - 3} punt(en)` : ""}. Dat
                mag, er komt dan gewoon niets over te staan.
              </>
            ) : (
              <>
                Er staan nog {open.length} optionele {open.length === 1 ? "vraag" : "vragen"} open.
                Die overslaan kost je alleen die passage.
              </>
            )}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-primary disabled:opacity-60"
            onClick={() => submit("write")}
            disabled={busy !== null}
          >
            {busy === "write" ? "Schrijven starten…" : `Schrijf mijn ${pageCount === 1 ? "pagina" : "pagina's"}`}
          </button>
          <button
            type="button"
            className="btn-outline disabled:opacity-60"
            onClick={() => submit("save")}
            disabled={busy !== null}
          >
            {busy === "save" ? "Opslaan…" : "Later verder"}
          </button>
        </div>
      </footer>
    </div>
  );
}

function QuestionCard({
  question,
  value,
  skipped,
  onChange,
  onToggleSkip,
}: {
  question: BriefingQuestionView;
  value: string;
  skipped: boolean;
  onChange: (value: string) => void;
  onToggleSkip: () => void;
}) {
  const inputId = `vraag-${question.id}`;

  return (
    <div className="card flex flex-col gap-3" style={skipped ? { opacity: 0.55 } : undefined}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <label htmlFor={inputId} className="font-medium">
          {question.question}
        </label>
        {question.required && <span className="chip chip-warning shrink-0">nodig</span>}
      </div>

      {/* Ons voorstel als knop, niet als voorgevulde waarde: bevestigen moet een
          handeling zijn. Eén klik, maar wel een klik.

          En het is een GOK, geen voorstel (R8.6). In de contentronde van 31 juli
          stond het voorstel twee keer op het tegenovergestelde van de waarheid:
          "nee" op de vraag of Bol een studentengids heeft (die bestaat), en
          "nee" op de vraag of Fysi-Unique een persoonlijk behandelplan vermeldt
          (de site zegt letterlijk "we stellen altijd een behandelplan op maat
          samen"). Wie dat als "ons voorstel" leest, klikt het door, en dan
          staat er een fout feit in de tekst mét de bevestiging van de klant
          eronder. Vandaar dat er nu bij staat waar het vandaan komt en dat het
          nagekeken moet worden. */}
      {question.suggestedAnswer && !value && !skipped && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className="btn-outline btn-sm w-fit"
            onClick={() => onChange(question.suggestedAnswer!)}
          >
            Gok van Aura: {question.suggestedAnswer}. Dit klopt
          </button>
          <span className="text-sm text-muted">
            Een inschatting, geen gecontroleerd feit. Lees hem na voordat je hem bevestigt, want een
            fout antwoord komt zo in je tekst terecht.
          </span>
        </div>
      )}

      {!skipped && <AnswerField id={inputId} question={question} value={value} onChange={onChange} />}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {question.reason}
          {question.affects.length > 0 && (
            <>
              {" "}
              <span className="mono-label">
                verbetert:{" "}
                {question.affects.length > 2
                  ? `alle ${question.affects.length} pagina's`
                  : question.affects.join(", ")}
              </span>
            </>
          )}
        </p>
        <button type="button" className="btn-outline btn-sm shrink-0" onClick={onToggleSkip}>
          {skipped ? "Toch beantwoorden" : "Sla over"}
        </button>
      </div>
    </div>
  );
}

/**
 * Het invoerveld volgt het antwoordtype (contentbriefing.md §8).
 *
 * Ja/nee wordt een radiogroep, een bedrag een veld met €, een keuze een
 * radiogroep met de opties. Vrije tekst alleen als het echt niet anders kan,
 * een open veld is de duurste vraag die je een klant kunt stellen.
 */
function AnswerField({
  id,
  question,
  value,
  onChange,
}: {
  id: string;
  question: BriefingQuestionView;
  value: string;
  onChange: (value: string) => void;
}) {
  if (question.answerType === "ja_nee") {
    return <Choices id={id} options={["Ja", "Nee"]} value={value} onChange={onChange} />;
  }

  if (question.answerType === "keuze" && question.options.length > 0) {
    return <Choices id={id} options={question.options} value={value} onChange={onChange} />;
  }

  if (question.answerType === "tekst_lang" || question.answerType === "lijst") {
    return (
      <textarea
        id={id}
        className="field"
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.answerType === "lijst" ? "Eén per regel" : ""}
      />
    );
  }

  const type = question.answerType === "getal" ? "number" : question.answerType === "url" ? "url" : "text";
  return (
    <div className="flex items-center gap-2">
      {question.answerType === "bedrag" && <span aria-hidden>€</span>}
      <input
        id={id}
        type={type}
        inputMode={question.answerType === "bedrag" ? "decimal" : undefined}
        className="field flex-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={question.answerType === "url" ? "https://…" : ""}
      />
    </div>
  );
}

function Choices({
  id,
  options,
  value,
  onChange,
}: {
  id: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={id}>
      {options.map((optie) => {
        const gekozen = value === optie;
        return (
          <button
            key={optie}
            type="button"
            role="radio"
            aria-checked={gekozen}
            className={gekozen ? "btn-primary btn-sm" : "btn-outline btn-sm"}
            onClick={() => onChange(optie)}
          >
            {optie}
          </button>
        );
      })}
    </div>
  );
}
