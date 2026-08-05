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

/** Alleen wat we nodig hebben van een taakrij. Geen databasetype nodig. */
export interface PendingJobRow {
  payload_json: unknown;
}

/** De velden die we uit een `measure_prompt`-payload lezen. */
interface MeasurePayloadShape {
  weekNo?: number;
  impact?: unknown;
}

/**
 * Hoeveel van deze openstaande taken horen bij de PERIODIEKE meting van deze
 * periode? Impactmetingen tellen niet mee: die horen bij een pagina, niet bij
 * een ronde.
 *
 * De aanroeper is verantwoordelijk voor het uitfilteren van de taak die de vraag
 * stelt (die staat zelf nog op 'running' of net op 'failed').
 */
export function countOpenPeriodicMeasurements(jobs: PendingJobRow[], weekNo: number): number {
  return jobs.filter((j) => {
    const payload = (j.payload_json ?? {}) as MeasurePayloadShape;
    if (payload.impact) return false;
    return payload.weekNo === weekNo;
  }).length;
}
