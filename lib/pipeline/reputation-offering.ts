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
   * Het gedeelde bewijscorpus, als aanvulling.
   *
   * ── ⚠️ DEZE VRAAG ZOEKT WEER ZELF, EN DAT IS EEN TERUGDRAAIING ────────────
   *
   * Op 23 augustus 2026 is deze vraag kort ongegrond geweest: hij mocht
   * uitsluitend uit een gedeeld corpus putten dat één onderzoeksronde had
   * gevuld. De redenering was dat elke dienstvraag anders zoekresultaten kreeg,
   * en dat je bij een verschil tussen twee diensten dus niet weet of dat aan de
   * reputatie ligt of aan de zoekmachine.
   *
   * **Die redenering was fout, en de run op Gasservice Brabant bewees het.** Alle
   * twaalf dienstvragen antwoordden "geen betrouwbaar beeld op basis van de
   * aangeleverde onderzoeksresultaten", terwijl dezelfde vragen mét eigen
   * zoekactie antwoorden van zes- tot tienduizend tekens met zeven tot elf
   * bronnen opleverden.
   *
   * De denkfout: verschillende zoekresultaten per dienst zijn geen verstoring
   * maar HET SIGNAAL. Vindt AI niets over je warmtepompen en veel over je
   * cv-ketels, dan is dat een echt verschil in je reputatie per dienst. Een
   * gedeeld corpus kan die vraag per definitie niet beantwoorden, want er zit
   * geen dienstspecifiek materiaal in; en zou je het wel dienstspecifiek maken,
   * dan zoek je alsnog twaalf keer.
   *
   * Het corpus blijft wél meegaan als ACHTERGROND. Het bevat letterlijke
   * reviewcitaten met bron die de eigen zoekactie kan missen, en dat kost niets
   * extra omdat het er toch al is.
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

  return {
    block: "aanbod",
    offeringId: offering.id,
    // ⚠️ De VRAAG blijft kort en leesbaar, want het scherm toont hem letterlijk
    // aan de klant zodat hij kan nalezen waar het cijfer op rust. Het corpus
    // gaat apart mee als achtergrond.
    question: kern,
    context: corpus
      ? [
          "Hieronder staat achtergrondmateriaal dat eerder over dit bedrijf is gevonden. Gebruik",
          "het als aanvulling op wat je zelf opzoekt, niet als vervanging. Staat er niets",
          "bruikbaars over deze dienst in, zoek dan gewoon zelf verder.",
          "",
          "── Eerder gevonden ──",
          corpus,
        ].join("\n")
      : undefined,
    // ⚠️ Wél zoeken. Zie de toelichting hierboven: het verschil in zoekresultaten
    // per dienst is het signaal en niet de ruis.
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
