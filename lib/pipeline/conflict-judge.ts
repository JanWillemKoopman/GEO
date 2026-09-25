import "server-only";

/**
 * L2: spreken twee feiten elkaar echt tegen? (docs/tasks/contentpijplijn-publicatiewaardig.md,
 * §5 L2, WP2)
 *
 * De code vindt kandidaten op soort, geldigheid en waarde (`conflict-detect.ts`),
 * maar ziet niet dat de intake van € 50 op kantoor en die van € 80 in de auto
 * bij de rijschool twee producten zijn. Zonder deze stap wordt de conflictpoort
 * vals alarm. Het voorstel welk feit klopt, past de code nooit zelf toe.
 *
 * Luna met redeneertijd (`judging`): één kort oordeel per paar, fijnmaziger dan
 * een classificatie. Nagerekend ongeveer 600 tokens in en 150 uit, minder dan
 * een tiende cent per paar.
 */
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { ConflictJudgeVerdict } from "@/lib/schemas/conflict-judge";
import type { Kandidaat, RegisterFeit } from "@/lib/pipeline/conflict-detect";

const SYSTEM =
  "Je krijgt twee feiten over hetzelfde bedrijf van dezelfde soort, met hun bron en de datum waarop wij " +
  "ze vastlegden. Beslis of ze elkaar ECHT tegenspreken: kunnen ze niet allebei tegelijk waar zijn? " +
  "Gaan ze over twee verschillende dingen (een intake op kantoor en een intake in de auto, een " +
  "vanafprijs en een gemiddelde, een ketel en een warmtepomp), of is het ene een deel van het andere " +
  "(een werkgebied dat één plaats extra noemt), dan is het GEEN echt conflict. Zeg in één zin voor de " +
  "adviseur wat er botst, of waarom het twee varianten zijn. Stel voor welk feit waarschijnlijk klopt: " +
  "een antwoord van de ondernemer zelf weegt zwaarder dan de site, en de site zwaarder dan onderzoek. " +
  "Weet je het niet, zeg 'onbekend'. Antwoord in het Nederlands.";

function beschrijf(label: string, f: RegisterFeit, bron: string): string {
  return `${label}: "${f.text}"\n   bron: ${bron}${f.createdAt ? `, vastgelegd ${f.createdAt.slice(0, 10)}` : ""}` +
    `${f.geldtVoor ? `\n   geldt voor: ${f.geldtVoor}` : ""}`;
}

export async function beoordeelConflict(args: {
  kandidaat: Kandidaat;
  bronA: string;
  bronB: string;
  profileId: string;
}): Promise<{ oordeel: ConflictJudgeVerdict; raw: unknown }> {
  const { kandidaat } = args;
  const res = await callStructured({
    model: MODELS.quality,
    system: SYSTEM,
    user: [
      `SOORT: ${kandidaat.soort}`,
      beschrijf("FEIT A", kandidaat.a, args.bronA),
      beschrijf("FEIT B", kandidaat.b, args.bronB),
    ].join("\n"),
    schema: ConflictJudgeVerdict,
    schemaName: "conflict_judge",
    webSearch: false,
    work: "judging",
    meta: { kind: "fact_conflict_judge", profileId: args.profileId },
  });
  return { oordeel: res.parsed, raw: res.raw };
}
