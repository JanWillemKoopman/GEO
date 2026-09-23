/**
 * De uitkomst van een meetronde: wie is hoe zichtbaar in deze markt?
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 11 en 13)
 *
 * ── ⚠️ DIT IS EEN TUSSENSCHERM EN GEEN RANGLIJST ────────────────────────────
 *
 * Plan hoofdstuk 2, de zin die alles stuurt: "de laagste zichtbaarheid is niet
 * automatisch de hoogste saleskans". Een scherm dat de markt op zichtbaarheid
 * sorteert en daar een knop naast zet, nodigt precies uit tot de fout die deze
 * module moet vermijden: onderaan beginnen met bellen.
 *
 * Vandaar dat dit scherm in de MOTORKAMER staat (plan §5.4) en niet op het
 * Opportunities-scherm. Het beantwoordt één vraag: heeft de meting gedaan wat
 * hij moest doen. Welke bedrijven interessant zijn, is een andere vraag met een
 * andere rekensom (sprint 4), en die staat op een ander scherm.
 *
 * Twee dingen staan er daarom expliciet bij, en ze horen bij elkaar: de noemer
 * (hoeveel vragen zijn er echt gemeten) en de marge. Een aandeel van 20% uit
 * vijf vragen is geen aandeel, en zonder die twee getallen ziet niemand dat.
 */
import { ENGINE_ALLE } from "@/lib/sales/measure-math";
import { engineLabel } from "@/lib/engines/label";

export interface ScoreRegel {
  companyId: string;
  naam: string;
  engine: string;
  vragen: number;
  vermeldingen: number;
  share: number;
  weightedShare: number;
  stderr: number;
}

/** Een breuk als percentage, zonder schijnprecisie achter de komma. */
function pct(deel: number): string {
  return `${Math.round(deel * 100)}%`;
}

export function Meetuitkomst({
  scores,
  engines,
  notitie,
  onbekendeNamen,
}: {
  scores: ScoreRegel[];
  /** De engines die daadwerkelijk gemeten hebben. */
  engines: string[];
  /** Wat er ontbreekt aan deze ronde, in gewone taal. */
  notitie: string | null;
  /** Bedrijven die de AI noemde en die niet in onze lijst stonden. */
  onbekendeNamen: string[];
}) {
  const gecombineerd = scores
    .filter((s) => s.engine === ENGINE_ALLE)
    .sort((a, b) => b.weightedShare - a.weightedShare || a.naam.localeCompare(b.naam, "nl"));

  const perEngine = new Map<string, Map<string, ScoreRegel>>();
  for (const s of scores) {
    if (s.engine === ENGINE_ALLE) continue;
    const kaart = perEngine.get(s.companyId) ?? new Map<string, ScoreRegel>();
    kaart.set(s.engine, s);
    perEngine.set(s.companyId, kaart);
  }

  return (
    <div className="flex flex-col gap-4">
      {notitie && (
        <div className="card card-warning">
          <p>{notitie}</p>
        </div>
      )}

      <div className="card flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-medium">Wat de meting opleverde</h2>
          <p className="mt-1 text-secondary">
            Het gewogen aandeel telt een vraag zwaarder naarmate er commercieel meer aan hangt. Het
            percentage tussen haakjes is de marge: valt een verschil daarbinnen, dan is het geen
            verschil.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="tabel min-w-[36rem]">
            <thead>
              <tr>
                <th>Bedrijf</th>
                <th>Genoemd</th>
                <th>Gewogen</th>
                {engines.map((e) => (
                  <th key={e}>
                    {engineLabel(e)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gecombineerd.map((rij) => (
                <tr key={rij.companyId}>
                  <td>{rij.naam}</td>
                  <td className="text-secondary">
                    {rij.vermeldingen} van de {rij.vragen}
                  </td>
                  <td>
                    {pct(rij.weightedShare)}{" "}
                    <span className="text-muted">(± {pct(rij.stderr * 1.96)})</span>
                  </td>
                  {engines.map((e) => {
                    const s = perEngine.get(rij.companyId)?.get(e);
                    return (
                      <td key={e} className="text-secondary">
                        {s ? pct(s.share) : "niet gemeten"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ⚠️ Het blok "genoemd, maar niet in onze lijst" stond hier en is op
          1 september 2026 verhuisd naar `onbekende-namen.tsx`. Reden: daar valt
          iets te DOEN. Hier was het een rijtje chips waarin Feenstra, drie keer
          genoemd en de best zichtbare partij van die markt, tussen Daikin en
          Werkspot stond zonder knop om hem alsnog mee te nemen. */}
    </div>
  );
}
