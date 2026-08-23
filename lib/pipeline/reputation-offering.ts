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
import { corpusFor } from "@/lib/pipeline/reputation-evidence";
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
  /**
   * Het gedeelde bewijscorpus. Leeg = terugvallen op zelf zoeken.
   *
   * ⚠️ Sinds 23 augustus 2026 zoekt deze vraag NIET meer zelf, en dat is een
   * meetverbetering en geen bezuiniging. Elke dienstvraag kreeg voorheen andere
   * zoekresultaten, en dan weet je bij een verschil tussen twee diensten niet of
   * dat aan de reputatie ligt of aan wat de zoekmachine die seconde opleverde.
   * Zie `reputation-evidence.ts` voor de volledige onderbouwing.
   */
  corpus = "",
): PlannedAsk {
  const merk = ctx.brandName;
  const plaats = ctx.region ? ` in ${ctx.region}` : "";

  const context: string[] = [];
  if (parentName) context.push(`Dit valt onder ${parentName}.`);
  if (offering.description) context.push(offering.description);
  if (offering.audience) context.push(`Bedoeld voor: ${offering.audience}.`);
  if (ctx.disambiguation) context.push(ctx.disambiguation);

  const kern =
    `Wat is de reputatie van ${merk}${plaats} op het gebied van ${offering.name}? ` +
    `Wat zeggen klanten daarover, en waar staat dat?` +
    (context.length > 0 ? ` ${context.join(" ")}` : "");

  // Zonder corpus valt de vraag terug op zelf zoeken. Dat gebeurt als de
  // onderzoeksronde niets opleverde of door het budget is overgeslagen: dan is
  // een duurder antwoord beter dan geen antwoord.
  if (!corpus) {
    return { block: "aanbod", offeringId: offering.id, question: kern, webSearch: true, repeatIndex: 0 };
  }

  return {
    block: "aanbod",
    offeringId: offering.id,
    // ⚠️ De VRAAG blijft kort en leesbaar, want het scherm toont hem letterlijk
    // aan de klant zodat hij kan nalezen waar het cijfer op rust. Het corpus
    // gaat apart mee.
    question: kern,
    context: [
      "Beantwoord dit UITSLUITEND op basis van de onderzoeksresultaten hieronder. Zoek niets op",
      "en vul niets aan uit eigen kennis. Staat er over deze dienst niets bruikbaars tussen, zeg",
      "dan dat je er geen beeld van hebt. Dat is een geldig antwoord en beter dan een aanname.",
      "Noem de bronnen die je gebruikt.",
      "",
      "── Onderzoeksresultaten ──",
      corpus,
    ].join("\n"),
    // ⚠️ Geen zoekactie meer. Het bewijs zit al in de context.
    webSearch: false,
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

  const corpus = await corpusFor(admin, runId, offering.name);
  const { answer } = await askAndStore(
    admin,
    ctx,
    planOfferingQuestion(ctx, offering, parentName, corpus),
  );
  const judged = await judgeAll(admin, ctx, [answer]);
  await bumpDone(admin, runId);

  return { asked: 1, judged, skipped: false };
}
