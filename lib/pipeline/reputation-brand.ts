import "server-only";

/**
 * Blok A: de merkbrede vragen (§4.2).
 *
 * ── VIJF VRAGEN, EN WAAROM JUIST DEZE VIJF ──────────────────────────────────
 *
 * | # | wat het meet | zoeken |
 * |---|--------------|--------|
 * | A1 | het parametrische beeld: wat er zónder internet over je bestaat | nee |
 * | A2 | dezelfde vraag mét zoeken. Het VERSCHIL is blok 2 op het scherm | ja |
 * | A3 | wat klanten zeggen. Levert de toon en de bronnen | ja |
 * | A4 | de nadelen. ⚠️ De belangrijkste vraag van de hele analyse | ja |
 * | A5 | betrouwbaarheid. De koopdrempel, en wat een echte klant vraagt | ja |
 *
 * ⚠️ A4 IS DE VRAAG DIE DIT PRODUCT ONDERSCHEIDT VAN DE VORIGE POGING.
 *
 * Tot migratie 0029 mat elke meting `sentiment`. Uitkomst na 650 gemeten rijen:
 * `negative` kwam geen enkele keer voor. Dat kwam niet doordat niemand kritiek
 * had, maar doordat die 650 rijen antwoorden op KOOPVRAGEN waren, en daar somt
 * een assistent bedrijven neutraal in op. Er zat geen oordeel in, dus viel er
 * geen oordeel uit te lezen.
 *
 * A4 vraagt er rechtstreeks naar, en vraagt bewust naar de ANDERE kant. Een
 * model dat expliciet naar klachten gevraagd wordt en er geen vindt, zegt dat,
 * en dat is óók een meetresultaat. Of dat werkelijk variatie oplevert, is een
 * aanname tot sprint R4 hem op een echt merk heeft nagerekend.
 *
 * ── WAAROM DE VIJF VRAGEN PARALLEL DRAAIEN ──────────────────────────────────
 *
 * Eén taak = hooguit één zwaar AI-blok (conventie 7). Dit is één blok van vijf
 * korte aanroepen die niet van elkaar afhangen; serieel zou het vijf keer de
 * latency kosten en niet in één werker-aanroep passen. Dezelfde vorm als
 * `llm-baseline.ts`, dat acht vragen zo doet.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  askAndStore,
  budgetAllows,
  loadContext,
  type PlannedAsk,
  type ReputationContext,
} from "@/lib/pipeline/reputation-context";
import { judgeAnswer } from "@/lib/pipeline/reputation-verdict";
import type { ReputationAnswer } from "@/lib/types/database";

type Admin = SupabaseClient;

export interface BrandResult {
  asked: number;
  judged: number;
  skipped: number;
}

/** De vijf vragen, met de merknaam en de plaats erin. */
export function planBrandQuestions(ctx: ReputationContext): PlannedAsk[] {
  const merk = ctx.brandName;
  const plaats = ctx.region ? ` in ${ctx.region}` : "";
  const uitsluiting = ctx.disambiguation ? ` ${ctx.disambiguation}` : "";

  const vragen: { vraag: string; zoeken: boolean }[] = [
    {
      vraag: `Wat weet je over ${merk}${plaats}? Waar staan ze om bekend?${uitsluiting}`,
      zoeken: false,
    },
    {
      vraag: `Wat weet je over ${merk}${plaats}? Waar staan ze om bekend? Zoek het op.${uitsluiting}`,
      zoeken: true,
    },
    {
      vraag:
        `Wat zeggen klanten over ${merk}${plaats}? Noem concrete ervaringen en waar die staan.` +
        uitsluiting,
      zoeken: true,
    },
    {
      vraag:
        `Wat zijn de nadelen van ${merk}${plaats}? Waar zijn klanten ontevreden over?` +
        uitsluiting,
      zoeken: true,
    },
    {
      vraag:
        `Is ${merk}${plaats} betrouwbaar om zaken mee te doen? Waarom wel of niet?` + uitsluiting,
      zoeken: true,
    },
  ];

  // ⚠️ Ontdubbelen. Zonder regio vallen A1 en A2 niet samen (de tweede zegt "zoek
  // het op"), maar een merk waarvan de naam al een uitsluiting bevat kan wél
  // twee identieke vragen opleveren, en de unieke index uit migratie 0062 laat
  // er dan maar één toe. Dezelfde valkuil als in `llm-baseline.ts`, waar een
  // dubbele in dezelfde batch de hele insert liet mislukken.
  const gezien = new Set<string>();
  const uit: PlannedAsk[] = [];
  for (const v of vragen) {
    if (gezien.has(v.vraag)) continue;
    gezien.add(v.vraag);
    uit.push({
      block: "merk",
      offeringId: null,
      question: v.vraag,
      webSearch: v.zoeken,
      repeatIndex: 0,
    });
  }
  return uit;
}

export async function runBrandBlock(admin: Admin, runId: string): Promise<BrandResult> {
  const ctx = await loadContext(admin, runId);
  if (!ctx) throw new Error(`Reputatierun ${runId} niet gevonden.`);

  if (!(await budgetAllows(admin, ctx.run, "brand"))) {
    return { asked: 0, judged: 0, skipped: planBrandQuestions(ctx).length };
  }

  const vragen = planBrandQuestions(ctx);

  // Parallel, en met `allSettled`: één mislukte vraag mag de andere vier niet
  // meenemen. Vier van de vijf antwoorden leveren nog steeds een bruikbaar
  // cijfer op, en dat is beter dan een taak die opnieuw moet en dan alles
  // opnieuw betaalt.
  const uitkomsten = await Promise.allSettled(
    vragen.map((v) => askAndStore(admin, ctx, v)),
  );

  const antwoorden: ReputationAnswer[] = [];
  let skipped = 0;
  for (const u of uitkomsten) {
    if (u.status === "fulfilled") antwoorden.push(u.value.answer);
    else {
      skipped++;
      console.error(`Merkbrede vraag mislukt in run ${runId}:`, u.reason);
    }
  }

  const judged = await judgeAll(admin, ctx, antwoorden);
  await bumpDone(admin, runId);

  return { asked: antwoorden.length, judged, skipped };
}

/**
 * Beoordeelt de antwoorden die nog geen oordeel hebben.
 *
 * ⚠️ Leunt op `answer_text` uit de DATABASE en niet op wat er net uit de API
 * kwam. Dat verschil is de kostenbescherming: mislukt de beoordeling, dan mag
 * hij bij de volgende poging opnieuw zonder dat de dure gegronde vraag opnieuw
 * gesteld wordt. Bij de meting is dat de belangrijkste besparing gebleken.
 */
export async function judgeAll(
  admin: Admin,
  ctx: ReputationContext,
  answers: ReputationAnswer[],
): Promise<number> {
  const teDoen = answers.filter(
    (a) => a.verdict_json === null && (a.answer_text ?? "").trim().length > 0,
  );
  if (teDoen.length === 0) return 0;

  const uitkomsten = await Promise.allSettled(
    teDoen.map(async (a) => {
      const v = await judgeAnswer({
        runId: ctx.run.id,
        profileId: ctx.profile.id,
        brandName: ctx.brandName,
        question: a.question,
        answerText: a.answer_text as string,
      });

      await admin
        .from("reputation_answers")
        .update({
          verdict_json: { ...v, raw: undefined } as never,
          tone: v.tone,
          tone_score: v.toneScore,
          pros: v.pros,
          cons: v.cons,
          grounding: v.grounding,
          mentions_brand: v.mentionsBrand,
          // De kosten van de vraag én de beoordeling samen, zodat één rij zegt
          // wat dit antwoord gekost heeft.
          cost_usd: Number(a.cost_usd ?? 0) + v.costUsd,
        })
        .eq("id", a.id);
    }),
  );

  let gelukt = 0;
  for (const u of uitkomsten) {
    if (u.status === "fulfilled") gelukt++;
    // Een mislukte beoordeling laat `verdict_json` op null staan, en dat is
    // precies de bedoeling: de volgende poging pakt hem op, zonder de dure
    // vraag opnieuw te stellen.
    else console.error(`Beoordeling mislukt in run ${ctx.run.id}:`, u.reason);
  }
  return gelukt;
}

/**
 * Telt hoeveel vragen er nu beantwoord zijn.
 *
 * Uit de database geteld en niet opgeteld bij wat er stond: twee taken die
 * tegelijk klaar zijn zouden elkaars ophoging anders overschrijven, en dan komt
 * de afteller van de synthese nooit op nul uit.
 */
export async function bumpDone(admin: Admin, runId: string): Promise<number> {
  const { count } = await admin
    .from("reputation_answers")
    .select("id", { count: "exact", head: true })
    .eq("run_id", runId)
    .not("answer_text", "is", null);

  const done = count ?? 0;
  await admin.from("reputation_runs").update({ questions_done: done }).eq("id", runId);
  return done;
}
