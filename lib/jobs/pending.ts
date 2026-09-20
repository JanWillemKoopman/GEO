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

/**
 * Alleen wat we nodig hebben van een taakrij.
 *
 * `type` kwam erbij op 20 september 2026, toen de ronde uit twee soorten
 * meettaken ging bestaan. Ontbreekt hij, dan is het een `measure_prompt`: dat
 * was tot die datum de enige soort.
 */
export interface PendingJobRow {
  payload_json: unknown;
  type?: string;
}

/** De velden die we uit een meet-payload lezen. */
interface MeasurePayloadShape {
  weekNo?: number;
  impact?: unknown;
  engine?: string;
}

/** Het taaktype van de tweede meetbron. Zie `lib/ai-overview/types.ts`. */
const AI_OVERVIEW_JOB = "measure_ai_overview";

/**
 * Hoeveel van deze openstaande taken horen bij de PERIODIEKE meting van deze
 * periode? Impactmetingen tellen niet mee: die horen bij een pagina, niet bij
 * een ronde.
 *
 * ── ⚠️ WAAROM DE TWEEDE BRON HIER WÉL MEETELT (20 september 2026, herzien) ──
 *
 * Bij het engine-bewust maken van de aggregatie telde deze functie eerst alleen
 * de primaire engine, met als redenering: laat een trage tweede bron de analyse
 * niet laten hangen. Die redenering is teruggedraaid, en het is goed om te weten
 * waarom, want het ziet eruit als een stap terug.
 *
 * De kansen die een klant te zien krijgt komen uit `computeMissedPrompts()` in
 * `lib/pipeline/report.ts`, en die telt per VRAAG met een meerderheidsregel over
 * alle metingen van die vraag. Een vraag die bij ChatGPT gemist wordt en bij
 * Google drie keer raak is, is dus géén gemiste kans. Dat is precies de
 * bedoeling, maar het werkt alleen als álle metingen binnen zijn vóórdat het
 * rapport draait. Wacht de aggregatie niet, dan landen de Google-metingen ná het
 * rapport en tellen ze die ronde nergens in mee.
 *
 * ⚠️ Het oude bezwaar is geen loos bezwaar, maar het lost zichzelf op: een taak
 * die blijft mislukken gaat na `MAX_ATTEMPTS` naar 'failed' en valt daarmee uit
 * `queued`/`running`, de enige twee statussen die de aanroeper opvraagt. Een
 * kapotte tweede bron vertraagt een ronde dus, maar kan hem niet laten hangen.
 *
 * Een payload zonder `engine` is een taak van vóór de enginelaag en hoort bij de
 * primaire engine, want er was toen niets anders. Een andere engine dan de
 * primaire (bijvoorbeeld Gemini) telt NIET mee: die vult alleen
 * `per_engine_json` en voedt geen kansen.
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
    if (payload.weekNo !== weekNo) return false;

    // De tweede meetbron heeft geen engine in zijn payload; zijn taaktype zegt
    // het al.
    if (j.type === AI_OVERVIEW_JOB) return true;

    return (payload.engine ?? primaryEngine) === primaryEngine;
  }).length;
}
