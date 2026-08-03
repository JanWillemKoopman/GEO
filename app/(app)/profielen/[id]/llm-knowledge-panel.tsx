import { CollapsibleSection } from "@/components/collapsible-section";
import type { BaselineVerdict } from "@/lib/pipeline/baseline-verdict";
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
  if (rows.length === 0) return null;

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

        // Eén herkennend antwoord is genoeg: kent het model het merk in de ene
        // formulering wél en in de andere niet, dan kent het het merk.
        const verdicts = kentRijen
          .map((r) => r.verdict_json as BaselineVerdict | null)
          .filter((v): v is BaselineVerdict => v !== null);
        const kent = verdicts.some((v) => v.knowsBrand);
        const tegenspraken = verdicts.flatMap((v) =>
          v.checks.filter((c) => c.verdict === "tegengesproken"),
        );
        const bevestigd = Math.max(0, ...verdicts.map((v) => v.confirmed));

        return (
          <div key={engine} className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{engineLabel(engine)}</span>
              <span className={kent ? "chip chip-green" : "chip chip-neutral"}>
                {kent ? "kent je merk" : "kent je merk niet"}
              </span>
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
