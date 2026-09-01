/**
 * "Wat ORBIT ENGINE deze week deed": de takenwachtrij in gewone taal.
 *
 * ── ⚠️ DIT BLOK HEET GEEN "ENGINE PULSE" EN BELOOFT GEEN AUTONOMIE ──────────
 *
 * Het product is sales-led (besloten 3 augustus 2026): de beheerder start
 * betaald werk, de klant keurt per stap goed. Een blok dat suggereert dat er een
 * motor zelfstandig staat te draaien, belooft iets wat er niet is, en `CLAUDE.md`
 * verbiedt te schrijven dat iets al kan wat nog niet gebouwd is.
 *
 * Wat er wél staat is een chronologische lijst van taken die klaar zijn, uit
 * `jobs`. Geen animatie, geen voortgangsbalk die uit zichzelf beweegt: als er
 * niets gedraaid heeft, staat er dat er niets gedraaid heeft.
 *
 * ── WAAROM DE VERTALING HIER STAAT EN NIET IN HET SCHERM ────────────────────
 *
 * De taaksoorten heten `profile_llm_baseline` en `aggregate_week`. Dat is de
 * taal van de wachtrij en niet die van de klant. Die vertaling is een lijst met
 * 24 regels, en een lijst hoort in een module met een test eromheen: een
 * taaksoort die er niet in staat verschijnt anders als rauwe sleutel op het
 * scherm van de klant.
 *
 * Puur, dus testbaar (conventie 2). Geen `server-only`.
 */
import { JOB_TYPES, type JobType } from "@/lib/jobs/types";

/**
 * Wat elke taaksoort deed, in de voltooide tijd en vanuit ORBIT ENGINE als
 * handelend onderwerp (`docs/schrijfstijl.md` richtlijn 3).
 *
 * ⚠️ Alle taaksoorten staan erin, en `scripts/test-unit.ts` faalt zodra er
 * eentje bijkomt zonder vertaling.
 *
 * ⚠️ **`null` betekent: dit ziet de klant nooit** (sinds de Sales-module, 24
 * augustus 2026). Dat is geen ontbrekende vertaling maar een besluit, en het
 * verschil moet zichtbaar zijn. Een Sales-taak gaat over een bedrijf dat geen
 * klant is; die mag in geen enkele klantlijst opduiken, ook niet als iemand ooit
 * de filtering op merk-id weghaalt. Vandaar dat de vertaling `null` is en niet
 * een zin die per ongeluk gebruikt kan worden.
 */
export const TAAK_TEKST: Record<JobType, string | null> = {
  profile_discover: "je website uitgelezen",
  profile_research: "je merk onderzocht",
  profile_offering: "je aanbod in kaart gebracht",
  propose_topics: "onderwerpen voorgesteld om op te meten",
  profile_market: "je markt en concurrenten onderzocht",
  profile_llm_baseline: "getest wat AI-assistenten al over je weten",
  profile_synthesis: "je dossier opgesteld",
  prepare_analysis: "een cluster klaargezet",
  generate_prompts: "de vragen opgesteld die je klanten stellen",
  calibrate_volumes: "ingeschat hoe vaak er naar die vragen gezocht wordt",
  measure_prompt: "een vraag aan een AI-assistent gesteld",
  aggregate_week: "de meetronde doorgerekend",
  profile_competitors: "uitgezocht waarom je concurrenten genoemd worden",
  generate_report: "je rapport geschreven",
  content_brief: "de briefing voor een pagina opgesteld",
  content_draft: "een pagina geschreven",
  content_revise: "een pagina herschreven",
  technical_audit: "gecontroleerd of AI-assistenten je site mogen lezen",
  verify_publication: "gecontroleerd of je pagina echt live staat",
  measure_impact: "een hermeting ingepland",
  compute_impact: "het effect van een pagina berekend",
  offsite_scan: "gekeken waar je buiten je eigen site genoemd wordt",
  gsc_sync: "je cijfers uit Google opgehaald",
  recalculate_potential: "de potentie van je onderwerpen herberekend",

  // ── Mijn reputatie ────────────────────────────────────────────────────────
  // In de taal van de klant, en zonder het woord "sentiment": wat hij wil weten
  // is hoe er over hem gepraat wordt, niet welk vakterm daarbij hoort.
  reputation_start: "je reputatieanalyse klaargezet",
  reputation_brand: "gevraagd hoe AI over je merk praat",
  reputation_offering: "gevraagd hoe AI over één van je diensten praat",
  reputation_compare: "je naast je concurrenten gelegd",
  reputation_sources: "uitgezocht waar AI zijn beeld van je vandaan haalt",
  reputation_synthesis: "je reputatieanalyse afgerond",
  reputation_evidence: "uitgezocht wat er online over je te vinden is",
  reputation_market: "gevraagd wie AI aanraadt in jouw markt",

  // ── De Sales-module: nooit zichtbaar voor een klant (plan §4.3) ───────────
  //
  // Deze taken gaan over bedrijven die geen klant zijn. Ze hangen aan geen enkel
  // merk, dus ze zouden hier sowieso niet langskomen. Dat `null` is het tweede
  // slot: ook als iemand de filtering ooit verandert, blijft er niets van te
  // zien.
  sales_market_discover: null,
  sales_market_verify: null,
  sales_market_suppress: null,
  sales_company_enrich: null,
  sales_market_intents: null,
  sales_market_questions: null,
  sales_measure_question: null,
  sales_market_aggregate: null,
  sales_detect_opportunities: null,
  sales_opportunity_explain: null,
  sales_contact_find: null,
  sales_outreach_draft: null,
  sales_market_report: null,
  crawl_inventory: "meer pagina's van je website gelezen",
};

export interface AfgerondeTaak {
  type: string;
  finished_at: string | null;
}

export interface ActiviteitRegel {
  /** De zin, zonder onderwerp: het scherm zet er "ORBIT ENGINE" voor. */
  tekst: string;
  /** Hoe vaak deze taak in het venster draaide. */
  aantal: number;
  /** Wanneer de laatste van deze soort klaar was. */
  laatst: string;
}

/**
 * De afgeronde taken samengevat, nieuwste eerst.
 *
 * ⚠️ **Gegroepeerd per soort, en dat is niet cosmetisch.** Eén meetronde is
 * dertig `measure_prompt`-taken. Die los tonen levert dertig identieke regels op
 * en duwt alles wat er verder gebeurd is uit beeld. Nu staat er één regel met
 * "30×" ernaast.
 *
 * Een onbekende taaksoort valt weg in plaats van als rauwe sleutel te
 * verschijnen: de klant heeft niets aan `profile_llm_baseline`, en een lege
 * regel is beter dan een verkeerde.
 */
export function activiteit(taken: AfgerondeTaak[]): ActiviteitRegel[] {
  const per = new Map<string, { aantal: number; laatst: string }>();

  for (const t of taken) {
    if (!t.finished_at) continue;
    const tekst = TAAK_TEKST[t.type as JobType];
    if (!tekst) continue;
    const bestaand = per.get(tekst);
    if (bestaand) {
      bestaand.aantal += 1;
      if (t.finished_at > bestaand.laatst) bestaand.laatst = t.finished_at;
    } else {
      per.set(tekst, { aantal: 1, laatst: t.finished_at });
    }
  }

  return [...per.entries()]
    .map(([tekst, v]) => ({ tekst, ...v }))
    .sort((a, b) => b.laatst.localeCompare(a.laatst));
}

/** Alle taaksoorten, zodat de test de vertaallijst ertegen kan leggen. */
export const ALLE_TAAKSOORTEN = JOB_TYPES;
