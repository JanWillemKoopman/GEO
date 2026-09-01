"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { InfoHint } from "@/components/info-hint";
import { ErrorNotice, problemFromResponse, networkProblem } from "@/components/error-notice";
import type { UserFacingError } from "@/lib/errors";
import type { FactRequest } from "@/lib/types/database";

/**
 * De klant om feiten vragen (optimalisatie.md 4.6).
 *
 * De schrijfinstructie zegt "verzin geen feiten, blijf algemeen bij twijfel".
 * Bij een klant met een dunne website levert dat gegarandeerd algemene tekst op
 *, en algemeen is precies wat een AI-assistent niet citeert. Die spanning los
 * je niet op met een betere prompt; je lost hem op door het te vragen.
 *
 * Dat is meteen het sterkste UX-moment van de app: de klant vult drie getallen
 * in en ziet dat élke volgende pagina er concreter van wordt. Vandaar dat er bij
 * elke vraag staat waaróm we het vragen, en dat overslaan net zo makkelijk is
 * als antwoorden, een formulier dat je moet invullen is een drempel, een vraag
 * die je mág beantwoorden is een uitnodiging.
 *
 * ── ⚠️ TWEE DINGEN VERANDERD OP 28 AUGUSTUS 2026 ────────────────────────────
 *
 * 1. **Het invoerveld staat onder de vraag, over de volle breedte, drie regels
 *    hoog.** Het was één regel van 26rem naast de vraag, en dat is precies genoeg
 *    voor een getal. De vragen zijn zelden een getal: "welke garantie geef je op
 *    een onderhoudsbeurt" vraagt om drie zinnen, en in een regel van één regel
 *    schrijft niemand die op. De lijst wordt daar langer van, en dat is de prijs:
 *    een kort lijstje waarin je geen antwoord kwijt kunt levert geen antwoorden op.
 * 2. **De vragen kunnen gegroepeerd en gefilterd worden.** Ze komen uit twee
 *    bronnen: uit het merkonderzoek (zonder cluster) en uit het rapport van een
 *    cluster. Zolang ze op twee schermen stonden was dat vanzelf gescheiden;
 *    sinds ze op één pagina staan draagt het filter dat onderscheid.
 */
export function FactRequests({
  profileId,
  initial,
  groepen,
  kop = "Help ORBIT ENGINE concreter te schrijven",
}: {
  profileId: string;
  initial: FactRequest[];
  /**
   * De groepen waarop gefilterd kan worden: `id` is een `analysis_id`, of de
   * sleutel `merk` voor de vragen die niet bij één cluster horen. Weglaten (of
   * één groep meegeven) laat het filter weg: een filter met één knop is een knop
   * die niets doet.
   */
  groepen?: { id: string; naam: string }[];
  /** De regel boven de lijst. Op de vragenpagina zegt de paginakop dit al. */
  kop?: string;
}) {
  const router = useRouter();
  const [facts, setFacts] = useState(initial);
  const [problem, setProblem] = useState<UserFacingError | null>(null);
  // Niet alle klantinput is gelijk (werkpakket A §3.4): een superlatief of
  // marktclaim zonder cijfer of voorbeeld wordt wel bewaard, maar (nog) niet
  // gebruikt in teksten. Dit is die melding, geen foutmelding.
  const [hint, setHint] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showAnswered, setShowAnswered] = useState(false);
  const [showSkipped, setShowSkipped] = useState(false);
  /** `null` = alles. Anders een `analysis_id` of de sleutel `merk`. */
  const [groep, setGroep] = useState<string | null>(null);

  /** Bij welke groep hoort deze vraag? Zonder cluster is het een merkvraag. */
  function groepVan(f: FactRequest): string {
    return f.analysis_id ?? "merk";
  }

  const zichtbaar = useMemo(
    () => (groep === null ? facts : facts.filter((f) => groepVan(f) === groep)),
    [facts, groep],
  );

  const open = zichtbaar.filter((f) => f.status === "open");
  const answered = zichtbaar.filter((f) => f.status === "beantwoord");
  // C: "overslaan" veranderde tot nu toe niets zichtbaars, de vraag verdween
  // gewoon uit de lijst zonder enige bevestiging van wat er gebeurd was. Een
  // klant die per ongeluk klikte kon dat nergens terugzien of terugdraaien.
  const skipped = zichtbaar.filter((f) => f.status === "overgeslagen");

  // Alleen groepen waar ook echt een vraag in zit. Een filterknop die naar een
  // lege lijst leidt is een dood einde (`docs/ux-design.md` §4).
  const knoppen = (groepen ?? []).filter((g) => facts.some((f) => groepVan(f) === g.id));

  async function send(factId: string, payload: { answer?: string; skip?: boolean }) {
    setBusy(factId);
    setProblem(null);
    setHint(null);
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
      const updated = (await res.json()) as FactRequest & {
        needsEvidence?: boolean;
        evidenceHint?: string;
      };
      if (updated.needsEvidence && updated.evidenceHint) setHint(updated.evidenceHint);
      setFacts((fs) => fs.map((f) => (f.id === factId ? updated : f)));
      // De teller staat in de paginakop en in de bovenbalk, en die zijn allebei
      // server-gerenderd. Zonder deze verversing zegt de kop "10 open" terwijl je
      // de tiende net beantwoord hebt, en dan is de teller precies zo betrouwbaar
      // als een teller die nooit klopt.
      router.refresh();
    } catch (err) {
      setProblem(networkProblem(err));
    } finally {
      setBusy(null);
    }
  }

  if (facts.length === 0) return null;

  /** De naam van de groep waar deze vraag bij hoort, voor het etiket erboven. */
  function naamVan(f: FactRequest): string | null {
    if (knoppen.length < 2) return null;
    return knoppen.find((g) => g.id === groepVan(f))?.naam ?? null;
  }

  return (
    <div id="feiten" className="card flex scroll-mt-4 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono-label flex items-center gap-1">
          {kop}
          <InfoHint label="Waarom deze vragen?">
            AI-assistenten citeren harde feiten: cijfers, jaartallen, termijnen. Algemene beloftes
            slaan ze over. Wat je hier invult gebruikt ORBIT ENGINE in élke pagina die het schrijft, niet
            alleen in de eerstvolgende.
          </InfoHint>
        </span>
        <span className="mono-label">
          {answered.length} van de {zichtbaar.length} beantwoord
        </span>
      </div>

      {/* Het filter. Verschijnt pas bij twee groepen, en toont per groep hoeveel
          er nog open staat: een filter zonder telling laat je blind klikken. */}
      {knoppen.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <FilterKnop label="Alles" aantal={facts.filter((f) => f.status === "open").length} actief={groep === null} onClick={() => setGroep(null)} />
          {knoppen.map((g) => (
            <FilterKnop
              key={g.id}
              label={g.naam}
              aantal={facts.filter((f) => groepVan(f) === g.id && f.status === "open").length}
              actief={groep === g.id}
              onClick={() => setGroep(g.id)}
            />
          ))}
        </div>
      )}

      {problem && <ErrorNotice error={problem} />}
      {hint && (
        <p className="text-sm text-secondary" role="status">
          {hint}
        </p>
      )}

      {open.length === 0 ? (
        <p className="text-sm text-secondary">
          Alle vragen gehad. Komen er bij een volgend rapport nieuwe bij, dan staan ze hier.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {open.map((fact) => (
            <FactCard
              key={fact.id}
              fact={fact}
              groep={naamVan(fact)}
              busy={busy === fact.id}
              onSend={send}
            />
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

      {skipped.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3">
          <button
            type="button"
            onClick={() => setShowSkipped((s) => !s)}
            className="w-fit text-sm text-secondary hover:underline"
            aria-expanded={showSkipped}
          >
            {showSkipped ? "Verberg" : "Toon"} wat je oversloeg ({skipped.length})
          </button>
          {showSkipped && (
            <ul className="flex flex-col gap-3">
              {skipped.map((fact) => (
                <FactCard
                  key={fact.id}
                  fact={fact}
                  groep={naamVan(fact)}
                  busy={busy === fact.id}
                  onSend={send}
                  skipped
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Eén filterknop met zijn telling.
 *
 * Geen `select`: bij vier clusters is een rij knoppen één klik en een keuzelijst
 * er twee, en de tellingen staan er meteen naast in plaats van pas na het
 * openklappen.
 */
function FilterKnop({
  label,
  aantal,
  actief,
  onClick,
}: {
  label: string;
  aantal: number;
  actief: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actief}
      className={`flex items-center gap-1.5 rounded-[var(--radius-md)] border px-2.5 py-1 text-sm transition-colors ${
        actief
          ? "border-[var(--border-strong)] bg-[var(--bg-elevated)] font-medium text-[var(--text-primary)]"
          : "border-[var(--border-subtle)] text-secondary hover:bg-[var(--wash-hover)] hover:text-[var(--text-primary)]"
      }`}
    >
      <span className="max-w-[14rem] truncate">{label}</span>
      <span className="text-muted">{aantal}</span>
    </button>
  );
}

function FactCard({
  fact,
  busy,
  onSend,
  groep = null,
  skipped = false,
}: {
  fact: FactRequest;
  busy: boolean;
  onSend: (factId: string, payload: { answer?: string; skip?: boolean }) => void;
  /** Uit welk cluster deze vraag komt. `null` als er niet gefilterd wordt. */
  groep?: string | null;
  /** Deze kaart staat in de "overgeslagen"-lijst: nog steeds te beantwoorden, geen skip-knop nodig. */
  skipped?: boolean;
}) {
  const [answer, setAnswer] = useState("");

  return (
    // ⚠️ Het invoerveld stond tot 28 augustus 2026 naast de vraag, één regel
    // hoog. Dat was een keuze voor een korte lijst, en hij kostte de antwoorden:
    // in een regel van 26rem schrijft niemand op welke garantie hij geeft. Nu
    // staat de vraag boven het veld en het veld over de volle breedte.
    <li className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{fact.question}</p>
          {groep && <span className="mono-label shrink-0">{groep}</span>}
          {skipped && <span className="chip chip-neutral shrink-0">Overgeslagen</span>}
        </div>
        {fact.reason && <p className="text-sm text-muted">{fact.reason}</p>}
      </div>

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const value = answer.trim();
          if (value) onSend(fact.id, { answer: value });
        }}
      >
        <textarea
          className="field w-full"
          rows={3}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Jouw antwoord…"
          aria-label={fact.question}
          disabled={busy}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn-outline" disabled={busy || !answer.trim()}>
            Opslaan
          </button>
          {!skipped && (
            <button
              type="button"
              onClick={() => onSend(fact.id, { skip: true })}
              disabled={busy}
              className="text-sm text-secondary hover:underline"
              // Overslaan blijft bewaard, zodat een volgend rapport dezelfde vraag
              // niet opnieuw stelt. Niets is vervelender dan een app die blijft zeuren.
              // ⚠️ Sinds 28 augustus 2026 telt overslaan ook als antwoord voor de
              // poort op de definitieve versie (`lib/content-final-gate.ts`): zonder
              // die uitweg loopt een klant die een cijfer niet heeft voorgoed vast.
              title="ORBIT ENGINE vraagt het niet nog een keer."
            >
              Weet ik niet
            </button>
          )}
        </div>
      </form>
    </li>
  );
}
