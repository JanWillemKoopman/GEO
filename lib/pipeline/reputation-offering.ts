import "server-only";

/**
 * Blok B: de reputatievraag per aanbodknoop (§4.3).
 *
 * ── WAAROM DIT PER DIENST MOET EN NIET MERKBREED KAN ────────────────────────
 *
 * Een merkbreed oordeel is voor een MKB-bedrijf te grof om iets mee te doen. Een
 * fysiotherapiepraktijk kan uitstekend bekendstaan om sportmassage en tegelijk
 * nergens genoemd worden bij bekkenfysiotherapie. Een installatiebedrijf kan als
 * betrouwbaar gelden voor onderhoud en als duur voor nieuwbouw. Dat verschil ís
 * het advies; het merkgemiddelde erboven verbergt het.
 *
 * De aanbodboom (`profile_offerings`, migratie 0039) is daar precies voor
 * gebouwd, hij staat er al en hij is per merk uniek. Dit onderdeel voegt daarmee
 * NUL handmatige stappen toe aan de onboarding.
 *
 * ── ⚠️ DIT IS GEEN TWEEDE ZICHTBAARHEIDSMETING ──────────────────────────────
 *
 * De vraag NOEMT het merk, dus hij meet niet of je gevonden wordt. Dat doet de
 * meting al, en dat werk hoort niet dubbel gedaan te worden. Wat hier gemeten
 * wordt is hoe er over je gepraat wordt zodra je naam eenmaal valt.
 *
 * Wat er wél gratis bij komt: waar een aanbodknoop via een onderwerp aan
 * metingen hangt, zet het scherm de zichtbaarheidsscore ernaast. Nul extra
 * kosten, en het is de zin die de klant het langst onthoudt.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  askAndStore,
  budgetAllows,
  loadContext,
  type PlannedAsk,
  type ReputationContext,
} from "@/lib/pipeline/reputation-context";
import { judgeAll, bumpDone } from "@/lib/pipeline/reputation-brand";
import type { ProfileOffering } from "@/lib/types/database";

type Admin = SupabaseClient;

/**
 * De vraag voor één knoop.
 *
 * De naam van de knoop gaat er letterlijk in, met zijn omschrijving en doelgroep
 * als context als die gevuld zijn. Zit de knoop onder een categorie, dan gaat
 * die categorie mee: anders wordt "onderhoud" een vraag over onderhoud in het
 * algemeen, en dan meet je de branche in plaats van de klant.
 */
export function planOfferingQuestion(
  ctx: ReputationContext,
  offering: ProfileOffering,
  parentName: string | null,
): PlannedAsk {
  const merk = ctx.brandName;
  const plaats = ctx.region ? ` in ${ctx.region}` : "";

  const context: string[] = [];
  if (parentName) context.push(`Dit valt onder ${parentName}.`);
  if (offering.description) context.push(offering.description);
  if (offering.audience) context.push(`Bedoeld voor: ${offering.audience}.`);
  if (ctx.disambiguation) context.push(ctx.disambiguation);

  const vraag =
    `Wat is de reputatie van ${merk}${plaats} op het gebied van ${offering.name}? ` +
    `Wat zeggen klanten daarover, en waar staat dat?` +
    (context.length > 0 ? ` ${context.join(" ")}` : "");

  return {
    block: "aanbod",
    offeringId: offering.id,
    question: vraag,
    webSearch: true,
    repeatIndex: 0,
  };
}

export interface OfferingResult {
  asked: number;
  judged: number;
  skipped: boolean;
}

export async function runOfferingBlock(
  admin: Admin,
  runId: string,
  offeringId: string,
): Promise<OfferingResult> {
  const ctx = await loadContext(admin, runId);
  if (!ctx) throw new Error(`Reputatierun ${runId} niet gevonden.`);

  const { data: offeringRow } = await admin
    .from("profile_offerings")
    .select("*")
    .eq("id", offeringId)
    .maybeSingle();

  if (!offeringRow) {
    // De knoop is verdwenen terwijl de taak in de rij stond, bijvoorbeeld door
    // een herhaalonderzoek dat de boom herschreef. Geen fout, niets te meten.
    // Wel meetellen in de afteller, anders wacht de synthese eeuwig.
    console.warn(`Aanbodknoop ${offeringId} bestaat niet meer; vraag overgeslagen.`);
    await bumpDone(admin, runId);
    return { asked: 0, judged: 0, skipped: true };
  }
  const offering = offeringRow as ProfileOffering;

  if (!(await budgetAllows(admin, ctx.run, "offering"))) {
    return { asked: 0, judged: 0, skipped: true };
  }

  let parentName: string | null = null;
  if (offering.parent_id) {
    const { data } = await admin
      .from("profile_offerings")
      .select("name")
      .eq("id", offering.parent_id)
      .maybeSingle();
    parentName = (data?.name as string | null) ?? null;
  }

  const { answer } = await askAndStore(
    admin,
    ctx,
    planOfferingQuestion(ctx, offering, parentName),
  );
  const judged = await judgeAll(admin, ctx, [answer]);
  await bumpDone(admin, runId);

  return { asked: 1, judged, skipped: false };
}
