/**
 * De onderbouwing onder het eindoordeel van de nameting, in gewone taal.
 *
 * Tot 22 september 2026 zag de klant per pagina alleen één woord ("gestegen",
 * "gelijk gebleven", "gedaald", "te weinig data"), terwijl `content_impact` de
 * aantallen achter dat woord al bewaarde, voor de doelvragen én voor de
 * controlegroep. Precies de losse uitspraak zonder bewijs die `impact.ts`
 * bovenaan wil vermijden ("je score steeg"), stond zo op het scherm
 * (`docs/tasks/bevindingen-verificatie-processtappen-22-september-2026.md`).
 *
 * Dit bestand rekent niets nieuws uit. Het zet de opgeslagen cijfers om in
 * zinnen, en het oordeel blijft dat van `verdictOf()`: het woord en de zinnen
 * kunnen elkaar zo nooit tegenspreken.
 *
 * Bewust ZONDER `server-only`, testbaar vanuit `scripts/test-unit.ts`.
 */
import {
  deltaOf,
  IMPACT_WAVES,
  MIN_COMPARABLE,
  minQuestionsForSignal,
  thresholdOf,
  type Comparison,
} from "@/lib/pipeline/impact-math";
import type { ContentImpact } from "@/lib/types/database";

export type ImpactCijfers = Pick<
  ContentImpact,
  | "wave"
  | "target_total"
  | "target_before_mentioned"
  | "target_after_mentioned"
  | "control_total"
  | "control_before_mentioned"
  | "control_after_mentioned"
  | "target_delta"
  | "control_delta"
  | "delta_threshold"
  | "verdict"
>;

export interface ImpactUitleg {
  /** "Gemeten 28 dagen na publicatie." */
  moment: string;
  /** De doelvragen: vóór en na, in aantallen. */
  doel: string;
  /** De controlegroep, of `null` als er geen was. */
  controle: string | null;
  /** Wat de vergelijking betekent, passend bij het oordeel. */
  conclusie: string;
  /** Kort genoeg voor een tabelcel: "0 → 1 van 5 vragen". */
  kort: string;
}

function vragen(n: number): string {
  return n === 1 ? "vraag" : "vragen";
}

/** Procentpunten, afgerond op hele getallen, met een teken. */
function punten(waarde: number): string {
  const afgerond = Math.round(waarde);
  if (afgerond === 0) return "0 procentpunt";
  return `${afgerond > 0 ? "+" : ""}${afgerond} procentpunt`;
}

export function impactUitleg(i: ImpactCijfers): ImpactUitleg {
  const dagen = IMPACT_WAVES.find((w) => w.wave === i.wave)?.days ?? null;
  const moment = dagen ? `Gemeten ${dagen} dagen na publicatie.` : "Gemeten na publicatie.";

  const doelVergelijking: Comparison = {
    total: i.target_total,
    beforeMentioned: i.target_before_mentioned,
    afterMentioned: i.target_after_mentioned,
  };
  const n = i.target_total;

  const doel =
    n === 0
      ? "Geen van de vragen waarvoor deze pagina geschreven is, kon vóór en na publicatie allebei beoordeeld worden."
      : `Van de ${n} ${vragen(n)} waarvoor deze pagina geschreven is, noemde AI je er vóór publicatie ` +
        `${i.target_before_mentioned}, nu ${i.target_after_mentioned}.`;

  const controle =
    i.control_total > 0
      ? `Bij ${i.control_total} vergelijkbare ${vragen(i.control_total)} zonder nieuwe pagina was dat vóór ` +
        `${i.control_before_mentioned}, nu ${i.control_after_mentioned}.`
      : null;

  const kort = n === 0 ? "geen vergelijkbare vragen" : `${i.target_before_mentioned} → ${i.target_after_mentioned} van ${n} ${vragen(n)}`;

  // De opgeslagen waarden zijn leidend (een cijfer dat de klant vandaag ziet
  // moet morgen hetzelfde zijn); alleen als ze ontbreken rekenen we ze na
  // uit dezelfde aantallen, met dezelfde functies als `impact.ts`.
  const doelDelta = i.target_delta ?? (n > 0 ? deltaOf(doelVergelijking) : 0);
  const marge = i.delta_threshold ?? thresholdOf(doelVergelijking);
  const controleDelta =
    i.control_delta ??
    (i.control_total > 0
      ? deltaOf({
          total: i.control_total,
          beforeMentioned: i.control_before_mentioned,
          afterMentioned: i.control_after_mentioned,
        })
      : null);

  let conclusie: string;
  switch (i.verdict) {
    case "te_weinig_data":
      conclusie =
        `Voor een uitspraak zijn minstens ${MIN_COMPARABLE} vragen nodig die vóór en na publicatie allebei ` +
        `beoordeeld zijn. Het waren er ${n}, dus hier valt nog niets over te zeggen.`;
      break;
    case "gelijk": {
      if (Math.round(doelDelta) === 0) {
        conclusie = "Er is geen verschil gemeten tussen vóór en na publicatie.";
        break;
      }
      const nodig = minQuestionsForSignal(doelVergelijking);
      conclusie =
        `Het verschil (${punten(doelDelta)}) valt binnen wat bij ${n} ${vragen(n)} ook door toeval kan ` +
        `ontstaan (tot ${Math.round(marge)} procentpunt), dus het telt nog niet als effect.` +
        (nodig ? ` Pas vanaf ongeveer ${nodig} vragen is een verschil van deze grootte van toeval te onderscheiden.` : "");
      break;
    }
    case "gestegen":
    case "gedaald": {
      const richting = i.verdict === "gestegen" ? "stijging" : "daling";
      const basis =
        `Dat is een ${richting} van ${Math.abs(Math.round(doelDelta))} procentpunt, meer dan de ${Math.round(marge)} procentpunt ` +
        `die bij ${n} ${vragen(n)} door toeval kan ontstaan.`;
      if (controleDelta === null) {
        conclusie =
          `${basis} Er was geen controlegroep, dus een algemene verschuiving in AI-antwoorden is niet uit te sluiten.`;
      } else if ((i.verdict === "gestegen" ? doelDelta - controleDelta : controleDelta - doelDelta) <= marge) {
        // De controlegroep bewoog in dezelfde richting bijna evenveel mee, of
        // zelfs meer: dan lag het vermoedelijk niet aan de pagina. Dezelfde
        // marge als het oordeel zelf, zodat "valt weg tegen de controlegroep"
        // en "binnen de meetruis" één maatstaf zijn. Eenzijdig, want een
        // controlegroep die harder steeg dan de doelvragen is geen bewijs vóór
        // de pagina.
        conclusie =
          `${basis} Maar de vragen zonder nieuwe pagina veranderden net zo veel of meer (${punten(controleDelta)}), ` +
          `dus dit komt waarschijnlijk niet door de pagina zelf.`;
      } else {
        conclusie =
          `${basis} De vragen zonder nieuwe pagina veranderden ${punten(controleDelta)}, dus het verschil zit ` +
          `bij de vragen waarvoor deze pagina geschreven is.`;
      }
      break;
    }
  }

  return { moment, doel, controle, conclusie, kort };
}
