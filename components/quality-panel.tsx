import { InfoHint } from "@/components/info-hint";
import { Icon } from "@/components/icon";
import { DIMENSION_LABELS, type QualityDimension } from "@/lib/pipeline/quality-dimensions";
import { PHASE_LABELS, type PipelinePhase, type QualityIssue } from "@/lib/pipeline/quality-issue";
import { issuesUitJson } from "@/lib/pipeline/quality-issue";

/**
 * WAT DE KLANT LEEST EN WAT DE ADVISEUR LEEST
 * (docs/tasks/contentkwaliteit-framework.md §4, punt 24 van de opdracht)
 *
 * ── WAAROM TWEE WEERGAVEN EN NIET ÉÉN ───────────────────────────────────────
 *
 * De klant wil weten of hij kan publiceren, en zo niet, waarom en wat hij eraan
 * doet. Twaalf dimensiescores helpen hem daar niet bij; die zijn voor de
 * adviseur die de contentmotor moet bijstellen. Één scherm voor allebei wordt
 * óf te technisch óf te vaag, en `docs/ux-design.md` §4 zegt welke van die twee
 * erger is: een melding die alleen zegt wat er niet kan, is een dood einde.
 *
 * ── WAT DE KLANT HIER NIET ZIET ─────────────────────────────────────────────
 *
 * Geen dimensiescores, geen zekerheidspercentage, geen ketenfase, geen
 * modelnamen. Wat hij wél ziet: kan deze pagina naar mijn site, welk deel van
 * wat hij over mijn bedrijf zegt we kunnen onderbouwen, en welke punten hem
 * tegenhouden.
 */

/** De vorm waarin `content_pieces.quality_json` op de pagina staat. */
export interface QualityJson {
  score?: number | null;
  dimensies?: Partial<Record<QualityDimension, number | null>>;
  confidence?: number;
  verdict?: "pass" | "repair" | "block";
  redenen?: string[];
  issues?: unknown;
  rootCause?: { fase: PipelinePhase; aantal: number; blokkerend: number; voorbeeld: string | null }[];
  rootCauseTekst?: string;
  beoordelaars?: { geslaagd: number; gevraagd: number };
  dekking?: { graad?: number | null; gewogen?: number | null; kritiek?: number | null };
  bronherleidbaarheid?: number | null;
}

export function leesQualityJson(ruw: unknown): QualityJson | null {
  if (!ruw || typeof ruw !== "object") return null;
  return ruw as QualityJson;
}

/** Eén regel met een cijfer, in de stijl van de andere kaarten. */
function Cijfer({ label, waarde, eenheid = "" }: { label: string; waarde: string; eenheid?: string }) {
  return (
    <span className="text-sm">
      <span className="text-muted">{label}: </span>
      <span className="font-medium">
        {waarde}
        {eenheid}
      </span>
    </span>
  );
}

/**
 * De KLANTWEERGAVE: één alinea, de blokkades, en de dekking.
 *
 * Staat er niets in `quality_json` (een pagina van vóór migratie 0091), dan
 * rendert dit blok niets in plaats van lege cijfers: onbekend is een betere
 * waarde dan een verkeerde (conventie 3), en de bestaande kaarten eronder
 * blijven gewoon staan.
 */
export function QualityPanel({
  quality,
  klantzin,
}: {
  quality: QualityJson | null;
  /** De zin uit `klantOordeel()`, zodat de knop en de kaart hetzelfde zeggen. */
  klantzin: string;
}) {
  if (!quality?.verdict) return null;

  const issues = issuesUitJson(quality.issues);
  const blokkades = issues.filter((i) => i.blocking);
  const dekking = quality.dekking?.gewogen ?? quality.dekking?.graad ?? null;

  const stand =
    quality.verdict === "pass"
      ? { kaart: "card", icoon: "klaar" as const, kop: "Klaar voor publicatie" }
      : quality.verdict === "repair"
        ? { kaart: "card card-warning", icoon: "letop" as const, kop: "Bijna klaar" }
        : { kaart: "card card-warning", icoon: "letop" as const, kop: "Nog niet naar je site" };

  return (
    <div className={`${stand.kaart} flex flex-col gap-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono-label flex items-center gap-1">
          <Icon naam={stand.icoon} size={16} />
          {stand.kop}
          <InfoHint label="Hoe ORBIT ENGINE dit bepaalt">
            Vier onafhankelijke beoordelaars kijken naar deze pagina, en daarnaast rekent de app tien
            controles na die geen mening nodig hebben: staan de verboden woorden erin, klopt de
            onderbouwing, is de tekst niet te veel als een andere pagina van jou. Wat hier staat is de
            uitkomst daarvan.
          </InfoHint>
        </span>
      </div>

      <p className="text-sm text-secondary">{klantzin}</p>

      {blokkades.length > 0 && (
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-secondary">
          {blokkades.slice(0, 5).map((b, i) => (
            <li key={i}>
              {b.section ? <span className="font-medium">{b.section}: </span> : null}
              {b.finding}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {dekking !== null && (
          <Cijfer label="Informatie compleet" waarde={String(Math.round(dekking))} eenheid="%" />
        )}
        {quality.dekking?.kritiek !== null && quality.dekking?.kritiek !== undefined && (
          <Cijfer
            label="Belangrijkste punten gecontroleerd"
            waarde={String(Math.round(quality.dekking.kritiek))}
            eenheid="%"
          />
        )}
        <Cijfer
          label="Kritieke problemen"
          waarde={blokkades.length === 0 ? "geen" : String(blokkades.length)}
        />
      </div>
    </div>
  );
}

/**
 * De ADVISEURSWEERGAVE: alles wat de klant niet hoeft te zien.
 *
 * Alleen zichtbaar voor een beheerder. Hier staat wat nodig is om de
 * contentmotor bij te stellen: de dimensiescores, de zekerheid, welke stap van
 * de keten de problemen veroorzaakte, en welke versie behouden is.
 */
export function QualityInternalPanel({
  quality,
  rondes,
  bronherleidbaarheid,
}: {
  quality: QualityJson | null;
  /** De rondes uit `content_quality_runs`, oplopend. */
  rondes: { ronde: number; score: number | null; verdict: string | null; blokkades: number; retained: boolean }[];
  bronherleidbaarheid: number | null;
}) {
  if (!quality?.verdict) return null;

  const issues = issuesUitJson(quality.issues);
  const dimensies = Object.entries(quality.dimensies ?? {}).filter(
    ([, waarde]) => waarde !== null && waarde !== undefined,
  ) as [QualityDimension, number][];
  const beste = rondes.filter((r) => r.retained).at(-1) ?? null;

  return (
    <div className="card flex flex-col gap-4">
      <span className="mono-label">Kwaliteitsanalyse (alleen voor Outer Orbit)</span>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Cijfer label="Kwaliteit" waarde={quality.score === null || quality.score === undefined ? "onbekend" : String(Math.round(quality.score))} />
        <Cijfer label="Zekerheid" waarde={String(quality.confidence ?? 0)} eenheid="%" />
        <Cijfer label="Oordeel" waarde={quality.verdict} />
        {quality.beoordelaars && (
          <Cijfer
            label="Beoordelaars geslaagd"
            waarde={`${quality.beoordelaars.geslaagd} van ${quality.beoordelaars.gevraagd}`}
          />
        )}
        {bronherleidbaarheid !== null && (
          <Cijfer label="Bronherleidbaarheid" waarde={String(Math.round(bronherleidbaarheid))} eenheid="%" />
        )}
        {quality.dekking?.kritiek !== null && quality.dekking?.kritiek !== undefined && (
          <Cijfer label="Kritieke dekking" waarde={String(Math.round(quality.dekking.kritiek))} eenheid="%" />
        )}
        <Cijfer label="Blokkerend" waarde={String(issues.filter((i) => i.blocking).length)} />
        <Cijfer label="Bevindingen" waarde={String(issues.length)} />
      </div>

      {dimensies.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="mono-label">Per dimensie</span>
          <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {dimensies.map(([dimensie, waarde]) => (
              <span key={dimensie} className="text-sm">
                <span className="text-muted">{DIMENSION_LABELS[dimensie] ?? dimensie}: </span>
                <span className="font-medium">{Math.round(waarde)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ⚠️ De belangrijkste regel van dit paneel: niet WAT er mis is maar WAAR
          het ontstond. Een generieke pagina door een dunne feitenkaart lost geen
          betere schrijfprompt op. */}
      {quality.rootCauseTekst && (
        <div className="flex flex-col gap-1">
          <span className="mono-label">Waar het ontstond</span>
          <p className="text-sm text-secondary">{quality.rootCauseTekst}</p>
          {(quality.rootCause ?? []).length > 1 && (
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted">
              {(quality.rootCause ?? []).slice(1).map((r) => (
                <li key={r.fase}>
                  {PHASE_LABELS[r.fase] ?? r.fase}: {r.aantal}
                  {r.blokkerend > 0 ? `, waarvan ${r.blokkerend} blokkerend` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {rondes.length > 1 && (
        <div className="flex flex-col gap-1">
          <span className="mono-label">Versies</span>
          <ul className="flex flex-col gap-1 text-sm text-secondary">
            {rondes.map((r) => (
              <li key={r.ronde}>
                {r.ronde === 0 ? "Eerste concept" : `Herstelronde ${r.ronde}`}:{" "}
                {r.score === null ? "geen cijfer" : Math.round(r.score)}
                {r.blokkades > 0 ? `, ${r.blokkades} blokkerend` : ""}
                {r.retained ? " (behouden)" : " (niet bewaard)"}
              </li>
            ))}
          </ul>
          {beste && (
            <p className="text-sm text-muted">
              {beste.ronde === 0
                ? "Het eerste concept is de beste versie gebleken."
                : `De versie uit herstelronde ${beste.ronde} is behouden.`}
            </p>
          )}
        </div>
      )}

      {issues.length > 0 && <IssueLijst issues={issues} />}
    </div>
  );
}

/** De bevindingen, blokkades eerst, met dimensie en ketenfase erbij. */
function IssueLijst({ issues }: { issues: QualityIssue[] }) {
  const geordend = [...issues].sort((a, b) => Number(b.blocking) - Number(a.blocking));
  return (
    <div className="flex flex-col gap-2">
      <span className="mono-label">Bevindingen</span>
      <ul className="flex flex-col gap-2 text-sm">
        {geordend.slice(0, 25).map((issue, i) => (
          <li key={i} className="border-b border-[var(--border-subtle)] pb-2 last:border-0 last:pb-0">
            <p className="text-secondary">
              {issue.blocking && <span className="font-medium">Blokkeert. </span>}
              {issue.section ? <span className="font-medium">{issue.section}: </span> : null}
              {issue.finding}
            </p>
            <p className="text-xs text-muted">
              {DIMENSION_LABELS[issue.dimension] ?? issue.dimension} · ontstaan in{" "}
              {PHASE_LABELS[issue.phase] ?? issue.phase} · {issue.bron}
              {issue.confidence < 1 ? ` · zekerheid ${Math.round(issue.confidence * 100)}%` : ""}
            </p>
            {issue.expected && <p className="text-xs text-muted">Verwacht: {issue.expected}</p>}
          </li>
        ))}
      </ul>
      {geordend.length > 25 && (
        <p className="text-sm text-muted">En nog {geordend.length - 25} bevindingen.</p>
      )}
    </div>
  );
}
