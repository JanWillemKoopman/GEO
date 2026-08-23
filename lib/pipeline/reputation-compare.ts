import "server-only";

/**
 * Blok V: de vergelijking met de concurrenten (§4.4).
 *
 * ── DE VRAAG DIE EEN KOPER WERKELIJK STELT ──────────────────────────────────
 *
 * Niet "is dit bedrijf goed", maar "welke van deze vier moet ik hebben". Het
 * verschil met de bestaande concurrentie-uitsplitsing is scherp en mag niet
 * vervagen: die telt hoe VAAK een concurrent uit de metingen komt, een
 * frequentie. Dit legt de partijen expliciet naast elkaar en vraagt om een
 * OORDEEL per criterium. Vaker genoemd worden en tóch verliezen zodra iemand
 * kiest, is een ander probleem dan onzichtbaar zijn.
 *
 * ── ⚠️ HET VOLGORDE-EFFECT IS DE KERN VAN DIT BLOK ──────────────────────────
 *
 * Een taalmodel bevoordeelt de partij die het eerst genoemd wordt. Zet je de
 * klant altijd vooraan, dan bouw je een product dat élke klant een mooie plaats
 * geeft, en dat is erger dan geen vergelijking. Vier maatregelen, alle vier in
 * code en niet in de prompt:
 *
 *   1. De volgorde rouleert deterministisch (`lib/reputation/rotate.ts`).
 *   2. De klant staat nooit standaard vooraan: over de aanbodknopen heen neemt
 *      hij elke positie even vaak in.
 *   3. Eén vergelijking per knoop is INDICATIEF, drie is een uitslag. Merkbreed
 *      krijgt altijd drie rotaties, want dat is het getal dat bovenaan het
 *      scherm komt.
 *   4. Het effect wordt GEMETEN (`lib/reputation/order-bias.ts`), niet
 *      aangenomen. Daarvoor wordt de gebruikte volgorde opgeslagen in
 *      `reputation_answers.party_order`; zonder die kolom is achteraf niet na te
 *      gaan of een uitslag een volgorde-effect was.
 *
 * ── WAAROM DIT EEN EIGEN TAAKSOORT IS ───────────────────────────────────────
 *
 * Twee redenen (conventie 7), en de tweede weegt het zwaarst. Met drie rotaties
 * zou één taak drie zware aanroepen doen náást de reputatievraag, en dat past
 * niet in één werker-aanroep. En de vergelijking moet als geheel kunnen wegvallen
 * als het budget vol loopt, zonder de basisanalyse mee te nemen (§2.3). Dat kan
 * alleen als het een eigen taak is.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  askAndStore,
  budgetAllows,
  loadContext,
  type PlannedAsk,
  type ReputationContext,
} from "@/lib/pipeline/reputation-context";
import { bumpDone } from "@/lib/pipeline/reputation-brand";
import { judgeComparison, detailKey } from "@/lib/pipeline/reputation-verdict";
import { rotateParties } from "@/lib/reputation/rotate";
import { loadEntityIndex } from "@/lib/entities/resolve";
import { normalizeEntityName } from "@/lib/entities/normalize";
import type { ProfileOffering, ReputationAnswer } from "@/lib/types/database";

type Admin = SupabaseClient;

/** Merkbreed krijgt ALTIJD drie rotaties: dat is het getal dat bovenaan komt. */
export const BRAND_ROTATIONS = 3;

/**
 * De vergelijkingsvraag.
 *
 * De vier criteria staan er letterlijk in en in dezelfde volgorde als de enum,
 * zodat het oordeel ze terug kan koppelen. De laatste twee zinnen zijn het
 * belangrijkste deel van de prompt: ze maken "ik ken dit bedrijf niet" tot een
 * geldig antwoord in plaats van tot een gat dat het model met een gok vult.
 */
export function buildComparisonQuestion(
  ctx: ReputationContext,
  order: string[],
  offeringName: string | null,
): string {
  const gebied = offeringName ? `op het gebied van ${offeringName}` : "als bedrijf";
  const regio = ctx.region ? ` in ${ctx.region}` : "";

  return (
    `Vergelijk ${order.join(", ")} ${gebied}${regio}. ` +
    `Zet ze per onderwerp op volgorde van beste naar minste: dienstverlening, kwaliteit, ` +
    `prijs-kwaliteitverhouding, betrouwbaarheid. Geef per onderwerp aan waarom je die volgorde ` +
    `kiest en op welke bronnen je dat baseert. ` +
    `Ken je een bedrijf niet of te weinig om er iets over te zeggen, zeg dat dan expliciet en ` +
    `laat het buiten de volgorde. Een eerlijk 'ik weet het niet' is beter dan een gok.` +
    (ctx.disambiguation ? ` ${ctx.disambiguation}` : "")
  );
}

export interface CompareResult {
  asked: number;
  rotations: number;
  ranks: number;
  skipped: boolean;
}

/**
 * Draait de vergelijking voor één aanbodknoop, of merkbreed als `offeringId`
 * leeg is.
 *
 * `slot` is de plek van deze knoop in de vastgelegde scope. Die bepaalt de
 * rotatie, en hij komt uit `reputation_runs.scope_json` zodat twee runs op
 * dezelfde scope dezelfde volgordes opleveren.
 */
export async function runCompareBlock(
  admin: Admin,
  runId: string,
  offeringId: string | null,
  slot: number,
  rotations: number,
): Promise<CompareResult> {
  const ctx = await loadContext(admin, runId);
  if (!ctx) throw new Error(`Reputatierun ${runId} niet gevonden.`);

  const rivals = ctx.run.rivals ?? [];
  if (rivals.length === 0) {
    // ⚠️ Geen concurrenten, geen vergelijking. Geen namen verzinnen. De run gaat
    // door zonder blok V, `rank_score` blijft null, en het scherm zegt waarom
    // (conventie 3). De notitie staat al in de run, gezet bij het inplannen.
    return { asked: 0, rotations: 0, ranks: 0, skipped: true };
  }

  // ⚠️ De budgetpoort telt ALLE rotaties tegelijk mee. Halverwege stoppen zou een
  // merkbrede uitslag opleveren die op één rotatie rust terwijl hij als drie
  // gepresenteerd wordt, en dan is de chip `indicatief` onjuist.
  if (!(await budgetAllows(admin, ctx.run, "compare", rotations))) {
    return { asked: 0, rotations: 0, ranks: 0, skipped: true };
  }

  let offering: ProfileOffering | null = null;
  if (offeringId) {
    const { data } = await admin
      .from("profile_offerings")
      .select("*")
      .eq("id", offeringId)
      .maybeSingle();
    offering = (data as ProfileOffering | null) ?? null;
    if (!offering) {
      console.warn(`Aanbodknoop ${offeringId} bestaat niet meer; vergelijking overgeslagen.`);
      await bumpDone(admin, runId);
      return { asked: 0, rotations: 0, ranks: 0, skipped: true };
    }
  }

  // De klant vooraan in de NATUURLIJKE volgorde; de rotatie schuift hem
  // vervolgens naar zijn plek. Zonder die natuurlijke volgorde als startpunt zou
  // het patroon per knoop van de toevallige rijvolgorde uit Postgres afhangen.
  const partijen = [ctx.brandName, ...rivals];

  const index = await loadEntityIndex(admin, ctx.profile.id);
  let gesteld = 0;
  let gedaan = 0;
  let rijen = 0;

  for (let r = 0; r < rotations; r++) {
    const volgorde = rotateParties({
      runId,
      parties: partijen,
      slot,
      offeringId,
      repeat: r,
    });

    const ask: PlannedAsk = {
      block: "vergelijking",
      offeringId,
      question: buildComparisonQuestion(ctx, volgorde, offering?.name ?? null),
      webSearch: true,
      repeatIndex: r,
      // ⚠️ Geen administratie: zonder deze kolom is `order_bias` niet te
      // berekenen en de hele vergelijking niet te controleren.
      partyOrder: volgorde,
    };

    let antwoord: ReputationAnswer;
    try {
      const uitkomst = await askAndStore(admin, ctx, ask);
      antwoord = uitkomst.answer;
      if (uitkomst.asked) gesteld++;
    } catch (err) {
      // Eén mislukte rotatie mag de andere twee niet meenemen. Twee rotaties
      // leveren nog steeds een uitslag op, en de chip `indicatief` blijft dan
      // staan omdat `rankIsIndicative()` op het werkelijke aantal telt.
      console.error(`Rotatie ${r} mislukt in run ${runId}:`, err);
      continue;
    }
    gedaan++;

    if (antwoord.verdict_json !== null) continue; // al beoordeeld (idempotent)

    try {
      rijen += await storeRanks(admin, ctx, antwoord, volgorde, offeringId, index);
    } catch (err) {
      // Zelfde regel als bij de gewone beoordeling: `verdict_json` blijft null,
      // dus de volgende poging pakt hem op zonder de dure vraag te herhalen.
      console.error(`Beoordeling van de vergelijking mislukt in run ${runId}:`, err);
    }
  }

  await bumpDone(admin, runId);
  return { asked: gesteld, rotations: gedaan, ranks: rijen, skipped: false };
}

/**
 * Zet één beoordeeld vergelijkingsantwoord om in rijen in `reputation_ranks`.
 *
 * De namen die het model teruggeeft worden via `normalizeEntityName()`
 * teruggematcht op de bekende entiteiten, zodat "Van der Valk Hotels" en "Van
 * der Valk" één partij zijn en niet twee.
 *
 * ⚠️ Bewust `loadEntityIndex` en niet `resolveEntity`: die laatste MAAKT een
 * entiteit aan als hij hem niet kent, en dat mag hier niet. De partijen komen uit
 * de vaste set van de run, dus ze bestaan al; een naam die het model erbij
 * verzon zou anders als nieuwe concurrent in het entiteitenscherm van de klant
 * verschijnen. Dat is precies het soort stille vervuiling waar §4.4 vangnet 1
 * tegen is.
 */
async function storeRanks(
  admin: Admin,
  ctx: ReputationContext,
  answer: ReputationAnswer,
  order: string[],
  offeringId: string | null,
  index: Awaited<ReturnType<typeof loadEntityIndex>>,
): Promise<number> {
  const oordeel = await judgeComparison({
    runId: ctx.run.id,
    profileId: ctx.profile.id,
    askedParties: order,
    ownParty: ctx.brandName,
    question: answer.question,
    answerText: answer.answer_text ?? "",
  });

  const eigen = normalizeEntityName(ctx.brandName);

  const rijen = oordeel.outcomes.flatMap((uitkomst) =>
    uitkomst.placements.map((p) => {
      const genormaliseerd = normalizeEntityName(p.party);
      const detail = oordeel.details.get(detailKey(uitkomst.criterion, p.party));
      return {
        run_id: ctx.run.id,
        answer_id: answer.id,
        offering_id: offeringId,
        criterion: uitkomst.criterion,
        // De naam zoals hij de vraag in ging, náást het entiteit-id: een
        // entiteit kan later hernoemd of samengevoegd worden, en dan moet nog
        // steeds na te lezen zijn wat er gevraagd is.
        party_name: p.party,
        entity_id: index.byNormalized.get(genormaliseerd)?.id ?? null,
        is_own_brand: genormaliseerd === eigen,
        position: p.adjusted,
        of_parties: p.ofParties,
        known: p.known,
        reason: detail?.reason ?? null,
        sources: detail?.sources ?? [],
      };
    }),
  );

  // Eerst weg, dan erin: een tweede poging mag geen dubbele rijen opleveren, en
  // een unieke index over vijf kolommen zou hier niet helpen omdat een partij
  // die het model niet noemde geen stabiele sleutel heeft.
  await admin.from("reputation_ranks").delete().eq("answer_id", answer.id);
  if (rijen.length > 0) {
    const { error } = await admin.from("reputation_ranks").insert(rijen);
    if (error) throw new Error(`Vergelijkingsrijen opslaan mislukt: ${error.message}`);
  }

  // ⚠️ `verdict_json` is het SLUITSTUK en niet het startpunt. Daaraan ziet de
  // rest van de app dat dit antwoord beoordeeld is; zou hij vóór de rijen gezet
  // worden, dan zou een mislukte insert een antwoord opleveren dat als
  // beoordeeld telt maar nul plaatsen heeft. Exact dezelfde volgorde als bij
  // halte 3b van de meting, waar die fout een keer gemaakt is.
  await admin
    .from("reputation_answers")
    .update({
      verdict_json: { criteria: oordeel.outcomes.length, ranks: rijen.length } as never,
      cost_usd: Number(answer.cost_usd ?? 0) + oordeel.costUsd,
    })
    .eq("id", answer.id);

  return rijen.length;
}
