import { CollapsibleSection } from "@/components/collapsible-section";
import { ExternalLink } from "@/components/external-link";
import { ToneChip, EvidenceChip, RankChip } from "./tone-chip";
import { CRITERION_LABEL } from "@/lib/types/database";
import type {
  ReputationAnswer,
  ReputationOfferingScore,
  ReputationRank,
} from "@/lib/types/database";

/**
 * Blok 4: de uitkomst per product en dienst, de kern van het scherm.
 *
 * ── ⚠️ GESORTEERD OP TOON VAN LAAG NAAR HOOG ────────────────────────────────
 *
 * Het PROBLEEM hoort bovenaan, niet het succes. Een scherm dat op de beste
 * dienst begint leest als een felicitatie, en dan scrolt niemand door naar de
 * dienst waar het misgaat. Dat is precies de dienst waarvoor dit product
 * gekocht is.
 *
 * Diensten zonder beeld (`tone_index` null) staan onderaan en niet bovenaan:
 * "AI kent je hier niet" is een echte bevinding, maar het is een ander soort
 * probleem dan "AI is negatief over je", en het hoort de negatieve uitslagen
 * niet te verdringen.
 *
 * ── INGEKLAPT, WANT ACHT BLOKKEN OP ÉÉN PAGINA IS VEEL ──────────────────────
 *
 * Elke regel klapt open naar de gestelde vraag, het letterlijke antwoord, de
 * plus- en minpunten, de bronnen en de volgorde waarin AI de partijen zette.
 * Dat is wat het verschil maakt tussen een cijfer dat je gelooft en een cijfer
 * waar je iets mee doet, maar het hoeft niet allemaal tegelijk zichtbaar te
 * zijn.
 */
export function OfferingRows({
  scores,
  answers,
  ranks,
}: {
  scores: ReputationOfferingScore[];
  answers: ReputationAnswer[];
  ranks: ReputationRank[];
}) {
  if (scores.length === 0) {
    return (
      <div className="card flex flex-col gap-1">
        <span className="mono-label">Niets per dienst gemeten</span>
        <p className="text-secondary">
          Deze analyse leverde geen uitkomst per dienst op. Dat gebeurt als het merkprofiel nog
          geen diensten of producten bevat.
        </p>
      </div>
    );
  }

  // Op toon oplopend, met "geen beeld" achteraan. Bij gelijke toon beslist de
  // naam, zodat twee keer hetzelfde scherm dezelfde volgorde toont.
  const gesorteerd = [...scores].sort((a, b) => {
    if (a.tone_index === null && b.tone_index === null)
      return a.offering_name.localeCompare(b.offering_name);
    if (a.tone_index === null) return 1;
    if (b.tone_index === null) return -1;
    return a.tone_index - b.tone_index || a.offering_name.localeCompare(b.offering_name);
  });

  return (
    <div className="flex flex-col gap-2">
      {gesorteerd.map((s) => {
        const eigenAntwoorden = answers.filter((a) => a.offering_id === s.offering_id);
        const eigenRanks = ranks.filter(
          (r) => r.offering_id === s.offering_id && r.is_own_brand,
        );

        return (
          <CollapsibleSection
            key={s.id}
            title={s.offering_name}
            badge={s.answers === 1 ? "1 vraag" : `${s.answers} vragen`}
            defaultOpen={false}
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <ToneChip index={s.tone_index} />
                <EvidenceChip score={s.evidence_score} />
                <RankChip
                  position={s.rank_position}
                  of={s.rank_of}
                  indicative={s.rank_indicative}
                />
                {/* Gratis meegenomen uit de bestaande meting (§4.3). Nul extra
                    kosten, en het is de zin die de klant het langst onthoudt. */}
                {s.visibility_score !== null && (
                  <span className="chip chip-neutral">
                    zichtbaarheid {Math.round(s.visibility_score)}%
                  </span>
                )}
              </div>

              {s.summary && <p className="text-secondary">{s.summary}</p>}

              {(s.top_pros.length > 0 || s.top_cons.length > 0) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {s.top_pros.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="mono-label">Wat AI positief noemt</span>
                      <ul className="flex flex-col gap-1 text-sm text-secondary">
                        {s.top_pros.map((p) => (
                          <li key={p}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {s.top_cons.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="mono-label">Wat AI als bezwaar noemt</span>
                      <ul className="flex flex-col gap-1 text-sm text-secondary">
                        {s.top_cons.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* De volgorde waarin AI de partijen op deze dienst zette. */}
              {eigenRanks.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="mono-label">Tegenover je concurrenten</span>
                  <ul className="flex flex-col gap-1 text-sm text-secondary">
                    {eigenRanks.map((r) => (
                      <li key={r.id}>
                        <span className="font-medium">{CRITERION_LABEL[r.criterion]}</span>:{" "}
                        {r.position === null
                          ? "ChatGPT gaf je hier geen plaats"
                          : `${r.position}e van ${r.of_parties}`}
                        {r.reason && <span className="text-muted"> · {r.reason}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ── Het letterlijke antwoord ─────────────────────────────────
                  Conventie 8 is hier geen boekhouding maar functionaliteit: dit
                  is het verschil tussen een cijfer dat je gelooft en een cijfer
                  waar je iets mee doet. */}
              {eigenAntwoorden.map((a) => (
                <details key={a.id} className="text-sm">
                  <summary className="cursor-pointer text-muted">
                    Lees wat ChatGPT letterlijk antwoordde
                  </summary>
                  <div className="mt-2 flex flex-col gap-2">
                    <p className="text-muted italic">{a.question}</p>
                    <p className="whitespace-pre-wrap text-secondary">{a.answer_text}</p>
                    {a.cited_urls.length > 0 && (
                      <ul className="flex flex-col gap-1">
                        {a.cited_urls.slice(0, 6).map((u) => (
                          <li key={u} className="break-url">
                            <ExternalLink href={u}>{u}</ExternalLink>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
              ))}

              {s.answers === 0 && (
                <p className="text-sm text-muted">
                  Deze dienst is wel ingepland maar niet gemeten. Kijk bij de kanttekeningen
                  bovenaan waarom.
                </p>
              )}
            </div>
          </CollapsibleSection>
        );
      })}
    </div>
  );
}
