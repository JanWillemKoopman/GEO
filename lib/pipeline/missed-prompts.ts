/**
 * De meerderheidsregel achter de gemiste kansen, EERST binnen een bron, dan
 * pas tussen de bronnen (docs/tasks/vier-meetbronnen-en-ai-zoekvolume.md,
 * hoofdstuk 5).
 *
 * ── HET PROBLEEM DAT DIT OPLOST ──────────────────────────────────────────────
 *
 * Vóór deze module telde `computeMissedPrompts()` in `lib/pipeline/report.ts`
 * elke MEETVRAAG-en-BRON-combinatie even zwaar. Zolang er maar twee bronnen
 * waren en ze allebei even vaak gemeten werden, viel dat niet op. Met vier...
 * nee, met drie bronnen die verschillend vaak gemeten worden (ChatGPT 1x,
 * Google AI Overview 3x, Gemini 1x) zou Google de helft van elke stem krijgen,
 * niet omdat hij belangrijker is maar omdat hij goedkoop is en daarom vaker
 * gemeten wordt.
 *
 * ── DE REGEL ──────────────────────────────────────────────────────────────
 *
 * Stap 1: per (vraag, bron) een meerderheid bepalen over de herhalingen van
 * die bron. Bij een gelijke stand binnen een bron wint "genoemd" (zelfde regel
 * als vóór deze module, en in de praktijk komt dit alleen voor bij een even
 * aantal herhalingen, wat vandaag alleen bij de acht zwaarste ChatGPT-vragen
 * gebeurt).
 *
 * Stap 2: de bronnen tegen elkaar afwegen. Elke bron levert precies één stem,
 * ongeacht hoe vaak hij gemeten is. Bij een gelijke stand TUSSEN bronnen (twee
 * tegen twee bij vier bronnen, één tegen één bij twee) telt de vraag als
 * gemiste kans: een pagina schrijven voor een vraag waar je bij de helft van
 * de assistenten ontbreekt is te verdedigen, hem overslaan terwijl je bij de
 * helft ontbreekt niet (hoofdstuk 5 van het plan).
 *
 * Puur en zonder `server-only` (conventie 2): dit bepaalt welke pagina's
 * geschreven worden, en dat hoort onder test.
 */

export interface BeoordeeldeMeting {
  /** De rij in `tracking_runs` die deze meting is. */
  runId: string;
  /** De vraag waar deze meting bij hoort. Nooit leeg: een run zonder `prompt_id` krijgt een op zichzelf staande sleutel bij de aanroeper. */
  promptId: string;
  /** De bron die deze meting deed (`tracking_runs.engine`). */
  engine: string;
  /** Is het eigen merk in deze ene meting genoemd? */
  mentioned: boolean;
}

export interface GemisteVraagUitkomst {
  promptId: string;
  /**
   * Eén run waarin het merk WERKELIJK ontbrak, uit de bron die de doorslag
   * gaf. Daar hangt het bewijsdossier aan (R1.1): een meting waarin het merk
   * wél genoemd werd als bewijs van een gemiste kans opvoeren zou fabricage
   * zijn.
   */
  representatieveRunId: string;
}

/**
 * Bepaalt welke vragen een gemiste kans zijn, met de tweetraps-meerderheid
 * hierboven.
 */
export function bepaalGemisteVragen(metingen: BeoordeeldeMeting[]): GemisteVraagUitkomst[] {
  // ── Stap 1: per (vraag, bron) tellen ───────────────────────────────────────
  const perPromptEngine = new Map<
    string,
    Map<string, { beoordeeld: number; gemist: number; eersteGemisteRun: string }>
  >();
  for (const m of metingen) {
    let byEngine = perPromptEngine.get(m.promptId);
    if (!byEngine) {
      byEngine = new Map();
      perPromptEngine.set(m.promptId, byEngine);
    }
    const entry = byEngine.get(m.engine) ?? { beoordeeld: 0, gemist: 0, eersteGemisteRun: "" };
    entry.beoordeeld++;
    if (!m.mentioned) {
      entry.gemist++;
      if (!entry.eersteGemisteRun) entry.eersteGemisteRun = m.runId;
    }
    byEngine.set(m.engine, entry);
  }

  // ── Stap 2: per vraag de bronnen tegen elkaar afwegen ──────────────────────
  const resultaat: GemisteVraagUitkomst[] = [];
  for (const [promptId, byEngine] of perPromptEngine) {
    let bronnenGemist = 0;
    let bronnenTotaal = 0;
    let representatieveRunId = "";
    for (const entry of byEngine.values()) {
      bronnenTotaal++;
      // Binnen een bron: gelijke stand wint "genoemd" (ongewijzigd gedrag).
      const ditIsGemist = entry.gemist * 2 > entry.beoordeeld;
      if (ditIsGemist) {
        bronnenGemist++;
        if (!representatieveRunId) representatieveRunId = entry.eersteGemisteRun;
      }
    }
    if (bronnenTotaal === 0) continue;
    // Tussen bronnen: gelijke stand telt WEL als gemiste kans (hoofdstuk 5).
    const vraagGemist = bronnenGemist * 2 >= bronnenTotaal;
    if (vraagGemist) resultaat.push({ promptId, representatieveRunId });
  }
  return resultaat;
}

/**
 * Per vraag: telt hij als "genoemd"? Precies het omgekeerde van
 * `bepaalGemisteVragen()`, zodat elke plek die per vraag zichtbaarheid rekent
 * dezelfde regel volgt als het rapport.
 *
 * ── DE FOUT DIE DIT REPAREERT ───────────────────────────────────────────────
 *
 * ⚠️ Gevonden op 24 september 2026 (kwaliteitsdoorlichting, punt 30). De
 * potentie van een geplande pagina (`lib/potential-data.ts`) gebruikte "één
 * keer genoemd, in welke bron ook, wint". Bij de installateur noemde ChatGPT
 * hem bij de zwaarste vraag (Geldrop, gewicht 0,50) in een van de herhalingen
 * en Google in geen enkele. Het rapport noemde de vraag terecht gemist, het
 * plan gaf hem potentie 0 en zette de pagina achteraan.
 */
export function genoemdPerVraag(metingen: BeoordeeldeMeting[]): Map<string, boolean> {
  const gemist = new Set(bepaalGemisteVragen(metingen).map((g) => g.promptId));
  const uit = new Map<string, boolean>();
  for (const m of metingen) uit.set(m.promptId, !gemist.has(m.promptId));
  return uit;
}
