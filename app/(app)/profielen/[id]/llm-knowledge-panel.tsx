import { CollapsibleSection } from "@/components/collapsible-section";
import {
  summariseKnows,
  type BaselineVerdict,
  type CategoryVerdict,
} from "@/lib/pipeline/baseline-verdict";
import type { ProfileLlmBaseline } from "@/lib/types/database";

/**
 * Wat AI-assistenten al over dit merk weten (blok B fase 3).
 *
 * ── WAAROM DIT BOVENAAN HET PROFIEL HOORT ───────────────────────────────────
 *
 * Dit is de uitkomst waar een ondernemer van rechtop gaat zitten. Niet "je
 * zichtbaarheidsscore is 34" — dat is een getal waar hij geen gevoel bij heeft
 * — maar "ChatGPT denkt dat je telefoonnummer 020 999 8877 is". Dat is concreet,
 * verifieerbaar en meteen zorgwekkend.
 *
 * Vandaar dat een tegenspraak hier de eerste regel is en niet een detail
 * onderaan een uitklapper.
 */

const BLOCK_LABELS: Record<ProfileLlmBaseline["block"], string> = {
  kent: "Kent de assistent je merk?",
  klopt: "Klopt wat hij zegt?",
  citeert: "Welke bronnen haalt hij aan?",
  verwarring: "Wordt je naam verward?",
  categorie: "Word je genoemd bij koopvragen?",
};

const ENGINE_LABELS: Record<string, string> = {
  openai: "ChatGPT",
  gemini: "Gemini",
};

function engineLabel(id: string): string {
  return ENGINE_LABELS[id] ?? id;
}

export function LlmKnowledgePanel({ rows }: { rows: ProfileLlmBaseline[] }) {
  // ⚠️ NIET `return null`. Zie `ux-design.md` §4: een lege staat wijst altijd
  // naar de volgende stap. Stil verdwijnen is een stap erger dan een dood
  // einde — de klant weet dan niet eens dát deze test bestaat, en de consultant
  // kan het gat niet uitleggen omdat er geen gat te zien is.
  if (rows.length === 0) {
    return (
      <div className="card flex flex-col gap-2">
        <span className="mono-label">Wat AI-assistenten over je weten</span>
        <p className="text-secondary">
          De kennistest is nog niet gedraaid. Hij vraagt een AI-assistent op zes
          manieren wat hij over je merk weet, en legt de antwoorden naast de
          feiten van je eigen site.
        </p>
        <p className="text-sm text-muted">
          Loopt het onderzoek nog, dan verschijnt de uitslag hier vanzelf. Staat
          het er over een paar minuten nog niet, gebruik dan &quot;Onderzoek
          opnieuw&quot; bij je aanbod.
        </p>
      </div>
    );
  }

  const engines = [...new Set(rows.map((r) => r.engine))];

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="mono-label">Wat AI-assistenten over je weten</span>
        <span className="mono-label text-muted">
          {engines.map(engineLabel).join(" · ")}
        </span>
      </div>

      {engines.map((engine) => {
        const perEngine = rows.filter((r) => r.engine === engine);
        const kentRijen = perEngine.filter((r) => r.block === "kent");

        // ⚠️ EEN VERHOUDING, GEEN JA/NEE (4 aug 2026)
        //
        // Hier stond "één herkennend antwoord is genoeg". Twee meetronden op
        // dezelfde site lieten zien waarom dat niet houdbaar is: twee woorden
        // verschil in de vraag ("uit Amersfoort") draaide de uitkomst om. Met
        // zes formuleringen is de eerlijke uitkomst hoe vaak hij raak is —
        // `summariseKnows()` maakt daar drie standen van, zonder verzonnen
        // drempel.
        const verdicts = kentRijen
          .map((r) => r.verdict_json as BaselineVerdict | null)
          .filter((v): v is BaselineVerdict => v !== null);
        const knows = summariseKnows(verdicts);
        const kent = knows.level !== "kent_niet";
        const tegenspraken = verdicts.flatMap((v) =>
          v.checks.filter((c) => c.verdict === "tegengesproken"),
        );
        const bevestigd = Math.max(0, ...verdicts.map((v) => v.confirmed));

        // De koopvragen: de kop die hierboven wél gesteld werd en nergens
        // beantwoord. Zie `describeCategory()` in baseline-verdict.ts.
        const categorieOordelen = perEngine
          .filter((r) => r.block === "categorie")
          .map((r) => r.verdict_json as CategoryVerdict | null)
          .filter((v): v is CategoryVerdict => v !== null);
        const genoemdBij = categorieOordelen.filter((v) => v.mentioned).length;
        const concurrentenGenoemd = [
          ...new Set(categorieOordelen.flatMap((v) => v.competitorsFound)),
        ].slice(0, 5);

        return (
          <div key={engine} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{engineLabel(engine)}</span>
              <span
                className={
                  knows.level === "kent"
                    ? "chip chip-green"
                    : knows.level === "wisselend"
                      ? "chip chip-warning"
                      : "chip chip-neutral"
                }
                title={`Gemeten met ${knows.asked} verschillende vraagstellingen.`}
              >
                {knows.level === "kent"
                  ? `kent je merk (${knows.recognised} van de ${knows.asked})`
                  : knows.level === "wisselend"
                    ? `herkent je merk wisselend (${knows.recognised} van de ${knows.asked})`
                    : "kent je merk niet"}
              </span>
              {categorieOordelen.length > 0 && (
                <span
                  className={
                    genoemdBij > 0 ? "chip chip-green" : "chip chip-neutral"
                  }
                >
                  genoemd bij {genoemdBij} van de {categorieOordelen.length}{" "}
                  koopvragen
                </span>
              )}
              {tegenspraken.length > 0 && (
                <span className="chip chip-danger">
                  {tegenspraken.length} gegeven
                  {tegenspraken.length === 1 ? "" : "s"} onjuist
                </span>
              )}
              {kent && tegenspraken.length === 0 && bevestigd > 0 && (
                <span className="chip chip-success">
                  {bevestigd} gegevens kloppen
                </span>
              )}
            </div>

            {/* De tegenspraak is de kop, niet een voetnoot. */}
            {tegenspraken.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {tegenspraken.map((c, i) => (
                  <li
                    key={`${c.key}-${i}`}
                    className="rounded-[var(--radius-sm)] border border-[var(--status-error)] px-3 py-2 text-sm"
                  >
                    <span className="mono-label">{c.key}</span>{" "}
                    <span className="text-secondary">
                      {engineLabel(engine)} zegt <strong>{c.found}</strong>, op
                      je site staat <strong>{c.expected}</strong>.
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Wie er wél genoemd wordt is de scherpste regel van het hele
                blok: "deze drie kwamen boven, jij niet" zegt meer dan een nul. */}
            {genoemdBij < categorieOordelen.length &&
              concurrentenGenoemd.length > 0 && (
                <p className="text-sm text-secondary">
                  Bij de koopvragen waar jij niet genoemd wordt, komen deze
                  partijen wél boven:{" "}
                  <strong>{concurrentenGenoemd.join(", ")}</strong>.
                </p>
              )}

            {knows.level === "wisselend" && (
              <p className="text-sm text-secondary">
                De assistent herkent je alleen bij bepaalde vraagstellingen. Dat
                betekent meestal dat je naam wel ergens is opgepikt, maar nog
                niet als één herkenbaar bedrijf vastligt.
              </p>
            )}

            {!kent && (
              <p className="text-sm text-secondary">
                Dat is geen fout van jou — voor de meeste MKB-bedrijven is dit
                de uitgangssituatie. Het betekent wel dat een assistent je
                alleen kan noemen als hij je op dat moment vindt, en niet omdat
                hij je kent.
              </p>
            )}

            <CollapsibleSection
              title={`Alle antwoorden van ${engineLabel(engine)}`}
            >
              <ul className="flex flex-col gap-3">
                {perEngine.map((r) => (
                  <li key={r.id} className="flex flex-col gap-1">
                    <span className="mono-label">
                      {BLOCK_LABELS[r.block] ?? r.block}
                    </span>
                    <p className="text-sm font-medium">{r.question}</p>
                    <p className="text-sm text-secondary whitespace-pre-wrap">
                      {(r.raw_response ?? "").slice(0, 900)}
                      {(r.raw_response ?? "").length > 900 ? "…" : ""}
                    </p>
                    {!r.web_search && (
                      <span className="mono-label text-muted">
                        zonder zoekfunctie gemeten
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          </div>
        );
      })}
    </div>
  );
}
