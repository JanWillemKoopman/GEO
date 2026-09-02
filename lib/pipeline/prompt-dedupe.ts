/**
 * Ontdubbelt de vragen van een hele analyse, over de funnelfasen heen
 * (herstelplan na audit, T8.1).
 *
 * ── WAAROM DIT EEN EIGEN, PURE STAP IS ───────────────────────────────────────
 *
 * `generateForFunnelStage()` (lib/pipeline/prompts.ts) houdt al een `seen`-set
 * bij, maar die bestaat alleen BINNEN één funnelfase-taak. Sinds 12 augustus
 * 2026 draait elke fase als eigen taak, en die drie taken lopen PARALLEL
 * (`lib/jobs/progress.ts`: "3 parallelle prompt-calls"). Een in-memory set kan
 * dus niet "opgetild worden naar het niveau van de hele analyse": er is geen
 * gedeeld geheugen tussen drie aparte werkeraanroepen.
 *
 * Gemeten op productie: één meting van dertig vragen bevatte twee letterlijk
 * identieke vragen, in twee verschillende funnelfasen. Gevolg: de klant betaalt
 * twee keer voor dezelfde vraag en die vraag weegt dubbel in zijn score.
 *
 * De robuuste plek is daarom NA alle drie de fasen, in `finishPromptGeneration`
 * (prepare.ts), die per analyse gegarandeerd precies één keer draait (de
 * wachtrij telt hoeveel fasetaken er nog open staan). Op dat moment zijn alle
 * vragen al opgeslagen en is er nog geen meting op gedraaid (de meting begint
 * pas na goedkeuring door de klant), dus een duplicaat verwijderen kan zonder
 * dat er iets aan een meting hoeft te veranderen.
 */

export interface PromptRow {
  id: string;
  text: string;
  createdAt: string;
}

/**
 * Welke rijen zijn duplicaten en mogen weg? Bewaart van elke tekst de OUDSTE
 * rij (de eerst gegenereerde fase); latere fasen die toevallig hetzelfde
 * bedachten zijn de duplicaten. Vergelijkt getrimd en ongevoelig voor
 * hoofdletters, want dat is ook hoe de bijvulronde binnen één fase al
 * dedupliceert.
 */
export function duplicatePromptIds(rows: PromptRow[]): string[] {
  const sorted = [...rows].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const row of sorted) {
    const key = row.text.trim().toLowerCase();
    if (seen.has(key)) {
      duplicates.push(row.id);
    } else {
      seen.add(key);
    }
  }

  return duplicates;
}
