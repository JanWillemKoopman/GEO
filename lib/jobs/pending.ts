/**
 * Wanneer is een periodieke meetronde klaar? (optimalisatie.md 1.5)
 *
 * Bewust een eigen module ZONDER `server-only`, om dezelfde reden als de andere
 * losse rekenmodules: dit is de voorwaarde waar de hele keten aan hangt, is
 * deze meting de laatste, dan mag de aggregatie starten, en die plant op zijn
 * beurt het rapport in. Zit hier een fout in, dan blijft een analyse hangen op
 * een voortgangsscherm dat nooit verder komt, en dat is precies het soort fout
 * dat je niet in productie wilt ontdekken. Puur en testbaar dus.
 *
 * De valkuil die dit oplost: een hermeting ná publicatie (fase 5) is óók een
 * `measure_prompt`-taak en draagt `weekNo: 0` mee, omdat zijn sleutel de PAGINA
 * en de GOLF is en niet de periode. Een simpele filter op `weekNo` telt zo'n
 * taak dus mee als openstaande vraag van de nulmeting, en dan kan de aggregatie
 * blijven wachten op werk dat er niets mee te maken heeft.
 */

import { PRIMARY_ENGINE } from "@/lib/engines/types";

/** Alleen wat we nodig hebben van een taakrij. Geen databasetype nodig. */
export interface PendingJobRow {
  payload_json: unknown;
}

/** De velden die we uit een `measure_prompt`-payload lezen. */
interface MeasurePayloadShape {
  weekNo?: number;
  impact?: unknown;
  engine?: string;
}

/**
 * Hoeveel van deze openstaande taken horen bij de PERIODIEKE meting van deze
 * periode? Impactmetingen tellen niet mee: die horen bij een pagina, niet bij
 * een ronde.
 *
 * ⚠️ En alleen de PRIMAIRE engine telt mee (20 september 2026). Deze teller
 * bepaalt of de aggregatie mag starten. Zou hij op een tweede bron blijven
 * wachten, dan blijft een analyse hangen op een voortgangsscherm zodra die
 * tweede bron traag of stuk is, terwijl het cijfer dat de klant ziet allang
 * gerekend kan worden. De tweede bron vult `per_engine_json` en mag dus later
 * landen. Andersom geldt niet: zonder de primaire engine is er geen score.
 *
 * Een payload zonder `engine` is een taak van vóór deze wijziging en hoort bij
 * de primaire engine, want er was toen niets anders.
 *
 * De aanroeper is verantwoordelijk voor het uitfilteren van de taak die de vraag
 * stelt (die staat zelf nog op 'running' of net op 'failed').
 */
export function countOpenPeriodicMeasurements(
  jobs: PendingJobRow[],
  weekNo: number,
  primaryEngine: string = PRIMARY_ENGINE,
): number {
  return jobs.filter((j) => {
    const payload = (j.payload_json ?? {}) as MeasurePayloadShape;
    if (payload.impact) return false;
    if ((payload.engine ?? primaryEngine) !== primaryEngine) return false;
    return payload.weekNo === weekNo;
  }).length;
}
