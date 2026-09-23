"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { enkelOfMeervoud } from "@/lib/format";
import { Antwoordveld } from "@/components/antwoordveld";
import { PageHeader } from "@/components/page-header";
import { vraagsoortKop, VRAAGSOORT_VOLGORDE, VERPLICHT_UITLEG } from "@/lib/feitenvraag";

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
 * ⚠️ Hier stond `KIND_HEADING`, de kopjes per vraagsoort. Ze staan sinds
 * 16 september 2026 in `lib/feitenvraag.ts`, omdat de vragenlijst op
 * "Openstaande vragen" dezelfde rijen toont en dus dezelfde kopjes hoort te
 * gebruiken. Twee kopieën van dezelfde tekst lopen uit elkaar (conventie P2).
 */

// ⚠️ `KIND_ORDER` stond hier. Hij is `VRAAGSOORT_VOLGORDE` in
// `lib/feitenvraag.ts` geworden, ongewijzigd: de vragenlijst toont dezelfde
// rijen en hoort ze in dezelfde volgorde te zetten.

/**
 * De stand van één pagina vóór het schrijven
 * (docs/tasks/vragen-voor-het-schrijven.md §7).
 *
 * Zonder dit blok was de briefing één lijst vragen die niet zei welke pagina er
 * klaar voor was en welke niet. De klant kon dus niet zien dat drie van zijn
 * vier pagina's konden en de vierde niet, en dus ook niet wat de twee minuten
 * invullen hem opleverden.
 */
export interface PaginaStandView {
  id: string;
  title: string;
  stand: "schrijven" | "waarschuwing" | "tegenhouden";
  /** Onderbouwingsgraad van 0 tot 100, of null als de pagina niets van je vraagt. */
  graad: number | null;
  melding: string;
  /** De koppen van de secties die nog op een antwoord wachten. */
  ongedekteKoppen: string[];
  /**
   * Blokkeert deze pagina specifiek omdat er geen lezer is? (V7)
   *
   * ⚠️ Bepaalt welke knop(pen) hieronder verschijnen. "Schrijf hem algemeen"
   * lost dit NIET op (`lib/content-input-gate.ts`: die keuze wordt vóór de
   * writeMode-vertakking al tegengehouden), dus die knop mag hier niet staan.
   * De enige knoppen die wél iets doen zijn: een lezer in één zin opgeven, of
   * de pagina laten vallen.
   */
  zonderLezer: boolean;
}

type Draft = Record<string, { value: string; skipped: boolean }>;

/** De keuze die de klant maakt bij een pagina die niet zonder meer kan. */
type PaginaKeuze = "algemeen" | "laten_vallen";

export function BriefingForm({
  analysisId,
  questions,
  pageCount,
  pages = [],
}: {
  analysisId: string;
  questions: BriefingQuestionView[];
  pageCount: number;
  /** De stand per pagina. Leeg bij een batch van vóór 2 september 2026. */
  pages?: PaginaStandView[];
}) {
  const router = useRouter();
  const [keuzes, setKeuzes] = useState<Record<string, PaginaKeuze>>({});
  // De lezer die de klant intypt bij een pagina zonder lezer (V7). Los van
  // `keuzes`: dat is een knop, dit is vrije tekst, en ze gaan naar een ander
  // veld (`content_pieces.target_intent` in plaats van `write_mode`).
  const [lezers, setLezers] = useState<Record<string, string>>({});
  const [geblokkeerd, setGeblokkeerd] = useState<{ title: string; melding: string }[]>([]);
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

  const gegroepeerd = VRAAGSOORT_VOLGORDE.map((kind) => ({
    kind,
    meta: vraagsoortKop(kind) ?? { titel: "Overig", uitleg: "" },
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
          pageChoices: [
            ...Object.entries(keuzes).map(([id, mode]) => ({ id, mode })),
            // Alleen meesturen als er echt iets staat: een leeg veld is geen keuze.
            ...Object.entries(lezers)
              .filter(([, tekst]) => tekst.trim().length > 0)
              .map(([id, tekst]) => ({ id, mode: "lezer" as const, tekst: tekst.trim() })),
          ],
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        queued?: number;
        blocked?: { title: string; melding: string }[];
      };

      // ⚠️ De inputpoort hield alles tegen (409). Dat is geen fout maar een
      // uitkomst, en de klant hoort te lezen wélke pagina en waarom, met de
      // uitwegen ernaast. Een kale foutmelding zou hier een dood einde zijn
      // (`docs/ux-design.md` §4).
      if (res.status === 409 && (data.blocked ?? []).length > 0) {
        setGeblokkeerd(data.blocked ?? []);
        return;
      }
      if (!res.ok) {
        // A.5: server- en netwerkfouten apart afhandelen, anders komt een
        // weggevallen verbinding op het scherm als "Failed to fetch".
        setError(data.error ?? "Opslaan is niet gelukt. Probeer het opnieuw.");
        return;
      }

      // Deels doorgekomen: sommige pagina's worden geschreven, andere wachten
      // nog op input. Dan blijft de klant hier, want anders ziet hij die
      // achterblijvers nooit.
      setGeblokkeerd(data.blocked ?? []);
      if (action === "write" && (data.blocked ?? []).length === 0) {
        router.push(`/analyses/${analysisId}/bibliotheek`);
      } else {
        router.refresh();
      }
    } catch {
      setError("We konden ORBIT ENGINE niet bereiken. Controleer je verbinding en probeer het opnieuw.");
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

  /** Nog een keer klikken zet de keuze weer uit: niets is hier onomkeerbaar. */
  function kies(pieceId: string, keuze: PaginaKeuze) {
    setKeuzes((k) => {
      const nieuw = { ...k };
      if (nieuw[pieceId] === keuze) delete nieuw[pieceId];
      else nieuw[pieceId] = keuze;
      return nieuw;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <PageHeader
          title="Nog even dit, dan schrijft ORBIT ENGINE je pagina's"
          description={`Je koos ${pageCount} ${pageCount === 1 ? "pagina" : "pagina's"}. Deze ${questions.length} ${questions.length === 1 ? "vraag zorgt" : "vragen zorgen"} dat er alleen kloppende informatie in komt te staan. Wat je niet beantwoordt, laat ORBIT ENGINE weg. Het verzint niets.`}
        />

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

        {/* ⚠️ DEZE REGEL BESTAAT OMDAT DE BALK HIERBOVEN NIET HET HELE VERHAAL
            VERTELT (Teamsessie 7 september 2026). De balk telt alleen vragen,
            terwijl de schrijfknop op een ANDER oordeel beslist: de paginastand
            uit `lib/content-input-gate.ts` (onderbouwing, en of er een lezer
            is). Een klant kon op "12 van de 12" staan en alsnog op "Schrijf
            mijn pagina's" een blokkade tegenkomen, want die twee tellingen
            liepen nergens samen. Deze regel telt daarom apart hoeveel
            pagina's al mógen, zodat 100% vragen beantwoord en "klaar om te
            schrijven" niet langer twee onzichtbare, losse getallen zijn. */}
        {pages.length > 0 && (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {(() => {
              const klaar = pages.filter((p) => p.stand !== "tegenhouden").length;
              if (klaar === pages.length) {
                return pages.length === 1
                  ? "Deze pagina kan al geschreven worden."
                  : `Alle ${pages.length} pagina's kunnen al geschreven worden.`;
              }
              return `${klaar} van de ${pages.length} ${pages.length === 1 ? "pagina kan" : "pagina's kunnen"} al geschreven worden. De rest heeft eerst een antwoord nodig, hieronder.`;
            })()}
          </p>
        )}
      </header>

      <PaginaStanden
        pages={pages}
        keuzes={keuzes}
        onKies={kies}
        lezers={lezers}
        onLezerChange={(pieceId, tekst) => setLezers((l) => ({ ...l, [pieceId]: tekst }))}
      />

      {geblokkeerd.length > 0 && (
        <div className="card card-warning flex flex-col gap-2" role="status">
          <span className="mono-label">Nog niet geschreven</span>
          <ul className="flex flex-col gap-2 text-sm">
            {geblokkeerd.map((b) => (
              <li key={b.title}>
                <strong>{b.title}</strong>
                <br />
                <span style={{ color: "var(--text-secondary)" }}>{b.melding}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {gegroepeerd.map((groep) => (
        <section key={groep.kind} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1 border-b border-[var(--border-subtle)] pb-2">
            <h2 className="text-lg font-medium">{groep.meta.titel}</h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {groep.meta.uitleg}
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
                {openVerplicht.length > 3
                  ? // ⚠️ Geen haakjesvorm "punt(en)" meer: die hoort niet in
                    // klanttekst (punt 9 van
                    // docs/tasks/opdracht-bevindingen-5-tot-9.md). Bij
                    // precies vier open vragen is dit er één, dus enkelvoud.
                    ` en nog ${openVerplicht.length - 3} ${enkelOfMeervoud(
                        openVerplicht.length - 3,
                        "punt",
                        "punten",
                      )}`
                  : ""}
                . Dat mag, er komt dan gewoon niets over te staan.
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
            className="btn-primary"
            onClick={() => submit("write")}
            disabled={busy !== null}
          >
            {busy === "write" ? "Schrijven starten…" : `Schrijf mijn ${pageCount === 1 ? "pagina" : "pagina's"}`}
          </button>
          <button
            type="button"
            className="btn-outline"
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
            Gok van ORBIT ENGINE: {question.suggestedAnswer}. Dit klopt
          </button>
          <span className="text-sm text-muted">
            Een inschatting, geen gecontroleerd feit. Lees hem na voordat je hem bevestigt, want een
            fout antwoord komt zo in je tekst terecht.
          </span>
        </div>
      )}

      {!skipped && (
        <Antwoordveld
          id={inputId}
          vraag={{
            answer_type: question.answerType,
            options: question.options,
            suggested_answer: question.suggestedAnswer,
            required: question.required,
            kind: question.kind,
          }}
          waarde={value}
          zetWaarde={onChange}
        />
      )}

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
// ⚠️ `AnswerField` en `Choices` stonden hier. Ze zijn `components/antwoordveld.tsx`
// geworden: dezelfde rij uit `fact_requests` werd op "Openstaande vragen"
// getekend als een tekstvak van drie regels, ook als het een ja-of-nee-vraag
// was. Eén component, en de regel welke vorm bij welk `answer_type` hoort staat
// puur en getest in `lib/feitenvraag.ts`.

/**
 * Wat er per pagina nog nodig is, en welke uitwegen er zijn
 * (docs/tasks/vragen-voor-het-schrijven.md §7).
 *
 * ── DRIE DINGEN DIE DIT BLOK DOET EN DE VRAGENLIJST NIET ────────────────────
 *
 *   1. het cijfer per pagina tonen, zodat zichtbaar is dat de ene pagina
 *      klaarstaat en de andere niet;
 *   2. de consequentie in dezelfde zin als de vraag noemen, dus niet "deze vraag
 *      staat open" maar "zonder dit blijft het stuk over de prijs leeg";
 *   3. een derde uitweg bieden naast beantwoorden en overslaan: de pagina bewust
 *      algemeen laten schrijven. Dat is een legitieme keuze voor een
 *      kennisbankartikel en hij mag niet als falen voelen.
 *
 * Elke stand heeft minstens twee knoppen of geen enkele. Een scherm dat alleen
 * zegt wat er niet kan is een dood einde (`docs/ux-design.md` §4).
 */
function PaginaStanden({
  pages,
  keuzes,
  onKies,
  lezers,
  onLezerChange,
}: {
  pages: PaginaStandView[];
  keuzes: Record<string, PaginaKeuze>;
  onKies: (pieceId: string, keuze: PaginaKeuze) => void;
  /** Wat de klant per pagina intypte bij "voor wie is deze pagina" (V7). */
  lezers: Record<string, string>;
  onLezerChange: (pieceId: string, tekst: string) => void;
}) {
  if (pages.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 border-b border-[var(--border-subtle)] pb-2">
        <h2 className="text-lg font-medium">Wat er per pagina nog nodig is</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Hoe meer je hieronder invult, hoe concreter de tekst wordt. Wat leeg blijft, komt er niet
          op te staan.
        </p>
      </div>

      {pages.map((pagina) => {
        const keuze = keuzes[pagina.id];
        return (
          <div
            key={pagina.id}
            className={pagina.stand === "tegenhouden" ? "card card-warning flex flex-col gap-2" : "card flex flex-col gap-2"}
            style={keuze === "laten_vallen" ? { opacity: 0.55 } : undefined}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <strong>{pagina.title}</strong>
              <span className="mono-label whitespace-nowrap">
                {pagina.graad === null ? "vraagt niets van jou" : `${Math.round(pagina.graad)}% onderbouwd`}
              </span>
            </div>

            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {pagina.melding}
            </p>

            {/* Alleen als er echt iets te kiezen valt. Een pagina die gewoon
                geschreven kan worden hoort geen knoppen te krijgen: dan vraagt
                het scherm een besluit waar geen besluit nodig is. */}
            {/* ⚠️ "Schrijf hem algemeen" lost "geen lezer" niet op (zie het
                commentaar bij `PaginaStandView.zonderLezer`): die knop hier
                tonen is een knop die niets doet als je hem indient. In
                plaats daarvan staat hier het veld dat de melding hierboven
                letterlijk noemt: in één zin de lezer beschrijven. */}
            {pagina.stand !== "schrijven" && pagina.zonderLezer && (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  className="field w-full"
                  placeholder="bijv. een mkb-ondernemer met 10 tot 30 bedrijfswagens die op zoek is naar minder gedoe met onderhoud"
                  value={lezers[pagina.id] ?? ""}
                  onChange={(e) => onLezerChange(pagina.id, e.target.value)}
                  aria-label={`Voor wie is de pagina "${pagina.title}"?`}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={keuze === "laten_vallen" ? "btn-outline" : "btn-ghost"}
                    aria-pressed={keuze === "laten_vallen"}
                    onClick={() => onKies(pagina.id, "laten_vallen")}
                  >
                    {keuze === "laten_vallen" ? "Wordt overgeslagen" : "Laat deze pagina vallen"}
                  </button>
                </div>
              </div>
            )}

            {pagina.stand !== "schrijven" && !pagina.zonderLezer && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={keuze === "algemeen" ? "btn-outline" : "btn-ghost"}
                  aria-pressed={keuze === "algemeen"}
                  onClick={() => onKies(pagina.id, "algemeen")}
                >
                  {keuze === "algemeen"
                    ? "Wordt algemeen geschreven"
                    : "Schrijf hem algemeen, zonder onze cijfers"}
                </button>
                <button
                  type="button"
                  className={keuze === "laten_vallen" ? "btn-outline" : "btn-ghost"}
                  aria-pressed={keuze === "laten_vallen"}
                  onClick={() => onKies(pagina.id, "laten_vallen")}
                >
                  {keuze === "laten_vallen" ? "Wordt overgeslagen" : "Laat deze pagina vallen"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
