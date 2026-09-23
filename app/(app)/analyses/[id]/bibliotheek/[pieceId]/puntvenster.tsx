"use client";

import { useEffect, useRef, useState } from "react";
import { ErrorNotice } from "@/components/error-notice";
import { Icon } from "@/components/icon";
import type { IcoonNaam } from "@/lib/icons";
import type { UserFacingError } from "@/lib/errors";
import { leesbareBevinding, type GegroepeerdeBevinding } from "@/lib/pipeline/quality-groups";
import type { Keuze, Telling } from "@/lib/puntenronde";

/**
 * Het venster dat bij één verbeterpunt vraagt: hoe wil je dit oplossen?
 *
 * ── WAAROM EEN VENSTER (23 september 2026) ──────────────────────────────────
 *
 * Een oranje zin in de tekst of in de rail was een dood eind: je zag dat er
 * iets mis was, en daarna niets. Dit venster opent op precies dat punt, zegt
 * wat er mis is en hoe je het oplost, en geeft vier antwoorden. Na elk antwoord
 * komt het volgende punt, tot de lijst op is. Het laatste scherm zegt wat er
 * met je keuzes gebeurt, met één knop.
 *
 * De rekenlogica (volgorde, telling, wat er naar ORBIT ENGINE gaat) staat in
 * `lib/puntenronde.ts`. Dit bestand tekent alleen.
 */

export type Soort = Keuze["soort"];

export interface PuntvensterStap {
  item: GegroepeerdeBevinding;
  sleutel: string;
  /** 1 tot en met `totaal`. */
  positie: number;
  keuze: Keuze | undefined;
  /** De zin zoals hij letterlijk in de brontekst staat. `null`: niet gevonden. */
  zinInTekst: string | null;
  /** Gemarkeerd in de leesweergave: dan kan "Toon in de tekst". */
  gemarkeerd: boolean;
  /** Een zin zonder bron: alleen die mag de klant zelf laten staan. */
  accepteerbaar: boolean;
}

export function Puntvenster({
  stap,
  totaal,
  voortgang,
  telling,
  orbit,
  eigenWerk,
  bezig,
  fout,
  probleem,
  onKies,
  onZelfInTekst,
  onZelfInBewerken,
  onVorige,
  onVolgende,
  onNaarEinde,
  onToonInTekst,
  onVerstuur,
  onOpslaan,
  onSluit,
}: {
  /** Het punt in beeld, of `null` voor het slotscherm. */
  stap: PuntvensterStap | null;
  totaal: number;
  /** Per punt in volgorde: zijn keuze, en of hij nu in beeld is. */
  voortgang: { soort: Soort | null; huidig: boolean }[];
  telling: Telling;
  /** Mag ORBIT ENGINE nu een nieuwe versie schrijven, en zo niet, waarom niet. */
  orbit: { mag: true } | { mag: false; reden: string };
  /** Er staan wijzigingen in de tekst die nog niet opgeslagen zijn. */
  eigenWerk: boolean;
  bezig: boolean;
  fout: string | null;
  probleem: UserFacingError | null;
  onKies: (soort: "orbit" | "staan" | "overslaan") => void;
  /** De zin vervangen door wat de klant in het venster schreef. */
  onZelfInTekst: (nieuw: string) => void;
  /** De zin staat niet letterlijk in de brontekst: naar de bewerkweergave. */
  onZelfInBewerken: () => void;
  onVorige: () => void;
  onVolgende: () => void;
  onNaarEinde: () => void;
  onToonInTekst: () => void;
  onVerstuur: (extra: string) => void;
  onOpslaan: () => void;
  onSluit: () => void;
}) {
  const paneel = useRef<HTMLDivElement>(null);

  // De focus gaat naar het paneel zodat een toetsenbordgebruiker niet achter
  // het venster blijft hangen. Zelfde gedrag als `ConfirmDialog`.
  useEffect(() => {
    paneel.current?.focus();
  }, []);
  // Escape sluit, en de pijltjes bladeren zolang er niet getypt wordt.
  useEffect(() => {
    function toets(e: KeyboardEvent) {
      if (bezig) return;
      if (e.key === "Escape") onSluit();
      else if (typtIn(e)) return;
      else if (e.key === "ArrowLeft" && stap && stap.positie > 1) onVorige();
      else if (e.key === "ArrowRight" && stap) (stap.positie < totaal ? onVolgende : onNaarEinde)();
    }
    document.addEventListener("keydown", toets);
    return () => document.removeEventListener("keydown", toets);
  });

  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="modal-overlay absolute inset-0"
        aria-label="Sluiten"
        onClick={() => !bezig && onSluit()}
      />
      <div
        ref={paneel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={stap ? `Verbeterpunt ${stap.positie} van ${totaal}` : "Je keuzes"}
        className="modal-panel puntvenster relative flex w-full flex-col gap-4 outline-none"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="type-caption-emphasis text-secondary">
            {stap ? `Punt ${stap.positie} van ${totaal}` : "Klaar met de punten"}
          </span>
          <button
            type="button"
            onClick={onSluit}
            disabled={bezig}
            className="text-secondary hover:text-[var(--text-primary)]"
            aria-label="Sluiten"
          >
            <Icon naam="sluiten" size={18} />
          </button>
        </div>

        <ol className="puntvenster-voortgang" aria-hidden="true">
          {voortgang.map((v, i) => (
            <li key={i} data-soort={v.soort ?? "open"} data-huidig={v.huidig || undefined} />
          ))}
        </ol>

        {stap ? (
          <Stap
            key={stap.sleutel}
            stap={stap}
            orbit={orbit}
            bezig={bezig}
            onKies={onKies}
            onZelfInTekst={onZelfInTekst}
            onZelfInBewerken={onZelfInBewerken}
            onToonInTekst={onToonInTekst}
          />
        ) : (
          <Slot
            telling={telling}
            orbit={orbit}
            eigenWerk={eigenWerk}
            bezig={bezig}
            onVerstuur={onVerstuur}
            onOpslaan={onOpslaan}
            onSluit={onSluit}
            onTerug={onVorige}
          />
        )}

        {fout && <p className="text-sm text-[var(--intent-danger-content)]">{fout}</p>}
        {probleem && <ErrorNotice error={probleem} />}

        {stap && (
          <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
            <button
              type="button"
              onClick={onVorige}
              disabled={bezig || stap.positie === 1}
              className="flex items-center gap-1 text-sm text-secondary hover:underline disabled:opacity-40"
            >
              <Icon naam="terug" size={14} />
              Vorige
            </button>
            {stap.positie < totaal ? (
              <button
                type="button"
                onClick={onVolgende}
                disabled={bezig}
                className="flex items-center gap-1 text-sm text-secondary hover:underline"
              >
                Volgende
                <Icon naam="verder" size={14} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onNaarEinde}
                disabled={bezig}
                className="flex items-center gap-1 text-sm text-secondary hover:underline"
              >
                Naar het overzicht
                <Icon naam="verder" size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Typt de gebruiker in een veld? Dan zijn letters en pijltjes van het veld. */
function typtIn(e: KeyboardEvent): boolean {
  const doel = e.target as HTMLElement | null;
  return Boolean(doel?.closest("textarea, input")) || e.metaKey || e.ctrlKey || e.altKey;
}

/** Wat er van een bevinding als kop overblijft als het citaat er al onder staat. */
function kopVan(item: GegroepeerdeBevinding): string {
  const zin = leesbareBevinding(item.issue.finding);
  const i = zin.indexOf(":");
  if (item.issue.evidence?.trim() && i >= 8 && i <= 90) return zin.slice(0, i).trim();
  return zin;
}

function Stap({
  stap,
  orbit,
  bezig,
  onKies,
  onZelfInTekst,
  onZelfInBewerken,
  onToonInTekst,
}: {
  stap: PuntvensterStap;
  orbit: { mag: true } | { mag: false; reden: string };
  bezig: boolean;
  onKies: (soort: "orbit" | "staan" | "overslaan") => void;
  onZelfInTekst: (nieuw: string) => void;
  onZelfInBewerken: () => void;
  onToonInTekst: () => void;
}) {
  const { item } = stap;
  const [bewerk, setBewerk] = useState(false);
  const [concept, setConcept] = useState(stap.zinInTekst ?? "");
  const citaat = item.issue.evidence?.trim()
    ? leesbareBevinding(item.issue.evidence).replace(/^["“„']+|["”']+\.?$/g, "").trim()
    : null;
  const hoe = item.issue.recommendation?.trim() ? leesbareBevinding(item.issue.recommendation) : null;
  const sectie = item.issue.section?.trim();

  function kiesZelf() {
    if (stap.zinInTekst) setBewerk(true);
    else onZelfInBewerken();
  }

  const opties: { soort: Soort; titel: string; uitleg: string; icoon: IcoonNaam; uit?: boolean; doe: () => void }[] = [
    {
      soort: "orbit",
      titel: "Laat ORBIT ENGINE het oplossen",
      uitleg: orbit.mag
        ? "Het punt komt op je lijst. Aan het eind schrijft ORBIT ENGINE één nieuwe versie met al je punten erin."
        : orbit.reden,
      icoon: "herstel",
      uit: !orbit.mag,
      doe: () => onKies("orbit"),
    },
    {
      soort: "zelf",
      titel: "Zelf aanpassen",
      uitleg: stap.zinInTekst
        ? "Herschrijf de zin hier. Hij wordt meteen in de tekst vervangen."
        : "Je gaat naar de bewerkweergave om het daar aan te passen.",
      icoon: "paginabijwerken",
      doe: kiesZelf,
    },
    ...(stap.accepteerbaar
      ? [
          {
            soort: "staan" as const,
            titel: "Klopt, laat staan",
            uitleg: "De zin blijft zoals hij is. Jij staat er dan voor in dat hij waar is.",
            icoon: "klaar" as const,
            doe: () => onKies("staan"),
          },
        ]
      : []),
    {
      soort: "overslaan",
      titel: "Sla over",
      uitleg: "Het punt blijft open. Je kunt de tekst later toch goedkeuren.",
      icoon: "verder",
      doe: () => onKies("overslaan"),
    },
  ];

  // Sneltoetsen 1 tot en met 4, zolang er niet in het tekstvak getypt wordt.
  // Zonder afhankelijkheden: de opties veranderen met elke weergave, en een
  // luisteraar opnieuw aanmelden kost niets.
  useEffect(() => {
    if (bewerk || bezig) return;
    function toets(e: KeyboardEvent) {
      if (typtIn(e)) return;
      const n = Number(e.key);
      const optie = Number.isInteger(n) && n >= 1 ? opties[n - 1] : undefined;
      if (!optie || optie.uit) return;
      e.preventDefault();
      optie.doe();
    }
    document.addEventListener("keydown", toets);
    return () => document.removeEventListener("keydown", toets);
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">{kopVan(item)}</h2>
        {sectie && <span className="type-caption text-muted">In: {sectie}</span>}
        {citaat && !bewerk && (
          <div className="flex flex-col gap-1">
            <p className="tekst-punt-link text-sm">{citaat}</p>
            {stap.gemarkeerd && (
              <button type="button" onClick={onToonInTekst} className="w-fit text-xs text-secondary hover:underline">
                Toon in de tekst
              </button>
            )}
          </div>
        )}
        {hoe && (
          <p className="text-sm text-secondary">
            <span className="text-muted">Zo los je het op: </span>
            {hoe}
          </p>
        )}
      </div>

      {bewerk ? (
        <div className="flex flex-col gap-2">
          <label className="type-caption-emphasis text-secondary" htmlFor="puntvenster-zin">
            Jouw versie van de zin
          </label>
          <textarea
            id="puntvenster-zin"
            className="field"
            rows={3}
            autoFocus
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            onKeyDown={(e) => {
              // Enter vervangt: een zin hoort geen harde regelafbreking te hebben.
              if (e.key === "Enter" && !e.shiftKey && concept.trim()) {
                e.preventDefault();
                onZelfInTekst(concept.trim());
              }
            }}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={!concept.trim() || concept.trim() === stap.zinInTekst}
              onClick={() => onZelfInTekst(concept.trim())}
            >
              Vervang in de tekst
            </button>
            <button type="button" className="text-sm text-secondary hover:underline" onClick={() => setBewerk(false)}>
              Terug naar de keuzes
            </button>
          </div>
          <p className="type-caption text-muted">
            De wijziging staat daarna in de tekst, maar is pas bewaard als je opslaat. Dat kan aan het eind in één keer.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2" role="group" aria-label="Hoe wil je dit oplossen?">
          <span className="type-caption-emphasis text-secondary">Hoe wil je dit oplossen?</span>
          {opties.map((o, i) => (
            <button
              key={o.soort}
              type="button"
              onClick={o.doe}
              disabled={bezig || o.uit}
              aria-pressed={stap.keuze?.soort === o.soort}
              className="puntvenster-optie"
            >
              <Icon naam={o.icoon} size={18} />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                <span className="text-sm font-medium">{o.titel}</span>
                <span className="text-xs text-secondary">{o.uitleg}</span>
              </span>
              <kbd className="puntvenster-toets" aria-hidden="true">
                {i + 1}
              </kbd>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Slot({
  telling,
  orbit,
  eigenWerk,
  bezig,
  onVerstuur,
  onOpslaan,
  onSluit,
  onTerug,
}: {
  telling: Telling;
  orbit: { mag: true } | { mag: false; reden: string };
  eigenWerk: boolean;
  bezig: boolean;
  onVerstuur: (extra: string) => void;
  onOpslaan: () => void;
  onSluit: () => void;
  onTerug: () => void;
}) {
  const [extra, setExtra] = useState("");
  const regels = [
    telling.orbit > 0 &&
      (telling.orbit === 1 ? "1 punt laat je ORBIT ENGINE oplossen" : `${telling.orbit} punten laat je ORBIT ENGINE oplossen`),
    telling.zelf > 0 && (telling.zelf === 1 ? "1 punt pas je zelf aan" : `${telling.zelf} punten pas je zelf aan`),
    telling.staan > 0 && (telling.staan === 1 ? "1 zin laat je staan" : `${telling.staan} zinnen laat je staan`),
    telling.overslaan > 0 &&
      (telling.overslaan === 1 ? "1 punt sla je over" : `${telling.overslaan} punten sla je over`),
    telling.open > 0 &&
      (telling.open === 1 ? "1 punt heeft nog geen keuze" : `${telling.open} punten hebben nog geen keuze`),
  ].filter((r): r is string => Boolean(r));

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">
        {telling.open > 0 ? "Bijna klaar" : "Je hebt alle punten doorlopen"}
      </h2>
      {regels.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {regels.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      {telling.orbit > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-secondary">
            ORBIT ENGINE schrijft één nieuwe versie van de hele tekst met{" "}
            {telling.orbit === 1 ? "dit punt" : `deze ${telling.orbit} punten`} erin. Dat duurt een paar minuten.
            De versie die er nu staat blijft bewaard.
            {eigenWerk && " Je eigen aanpassingen worden eerst opgeslagen, zodat de nieuwe versie daarop verder bouwt."}
          </p>
          <textarea
            className="field"
            rows={2}
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="Nog iets anders dat ORBIT ENGINE moet meenemen? Dit mag leeg blijven."
            aria-label="Nog iets anders voor ORBIT ENGINE"
          />
          {!orbit.mag && <p className="text-sm text-secondary">{orbit.reden}</p>}
          <button
            type="button"
            className="btn-primary w-fit"
            disabled={bezig || !orbit.mag}
            onClick={() => onVerstuur(extra)}
          >
            {bezig
              ? "Doorgeven aan ORBIT ENGINE…"
              : eigenWerk
                ? "Opslaan en de nieuwe versie laten schrijven"
                : "Laat ORBIT ENGINE de nieuwe versie schrijven"}
          </button>
        </div>
      ) : eigenWerk ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-secondary">Je aanpassingen staan in de tekst, maar zijn nog niet bewaard.</p>
          <button type="button" className="btn-primary w-fit" disabled={bezig} onClick={onOpslaan}>
            {bezig ? "Opslaan…" : "Sla je aanpassingen op"}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-secondary">
            Er gaat niets naar ORBIT ENGINE. Ben je tevreden, keur de tekst dan goed met de knop bovenaan.
          </p>
          <button type="button" className="btn-primary w-fit" onClick={onSluit}>
            Sluiten
          </button>
        </div>
      )}

      <button type="button" onClick={onTerug} disabled={bezig} className="w-fit text-sm text-secondary hover:underline">
        {telling.open > 0 ? "Naar de punten zonder keuze" : "Terug naar de punten"}
      </button>
    </div>
  );
}
