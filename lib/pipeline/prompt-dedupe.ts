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

/**
 * Een vraag als vergelijksleutel over clusters heen: hoofdletters, accenten,
 * leestekens en dubbele spaties tellen niet. Geen synoniemen: een vraag in
 * andere woorden voorkomt de opdracht, dit vangt de letterlijke herhaling.
 */
export function vraagSleutel(tekst: string): string {
  return tekst
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * V18 van `docs/tasks/pijplijnanalyse-contentketen.md` (besluit B-i): welke
 * vragen van een NIEUW cluster staan al in een ander cluster van hetzelfde merk?
 * In ronde 1 stond dezelfde vraag in drie clusters: drie keer gemeten, drie keer
 * meegeteld in de merkscore, en drie rapporten die naar dezelfde pagina wezen.
 *
 * Alleen de vragen van het nieuwe cluster gaan weg: bestaande clusters blijven
 * zoals ze zijn, want daar hangen metingen aan. En er blijft altijd minstens één
 * vraag staan: een cluster zonder vragen kan niet gemeten worden, en dan is een
 * dubbele vraag het kleinere kwaad.
 */
export function dubbelMetAndereClusters(eigen: readonly PromptRow[], andere: readonly string[]): string[] {
  const bekend = new Set(andere.map(vraagSleutel).filter(Boolean));
  const dubbel = eigen.filter((r) => bekend.has(vraagSleutel(r.text))).map((r) => r.id);
  return dubbel.length >= eigen.length ? dubbel.slice(0, Math.max(0, eigen.length - 1)) : dubbel;
}

/** Woorden die in bijna elke vraag staan en niets over een bezwaar zeggen. */
const LEGE_WOORDEN = new Set([
  "de", "het", "een", "en", "of", "in", "op", "voor", "met", "van", "bij", "aan", "tot", "om", "uit", "dat", "die",
  "is", "zijn", "ik", "je", "jij", "mijn", "niet", "wel", "wat", "hoe", "welke", "waarom", "kan", "moet", "wil",
  "te", "als", "er", "dan", "ook", "nog", "maar", "wordt", "worden", "heb", "heeft", "hebben",
]);

function inhoudswoorden(tekst: string): Set<string> {
  return new Set(
    vraagSleutel(tekst)
      .split(" ")
      .filter((w) => w.length >= 3 && !LEGE_WOORDEN.has(w))
      .map((w) => w.replace(/(en|s)$/, "")),
  );
}

/**
 * Gaat deze vraag over dit bezwaar? Minstens twee inhoudswoorden gedeeld, of
 * alle inhoudswoorden van een kort bezwaar ("te duur").
 */
export function raaktBezwaar(vraag: string, bezwaar: string): boolean {
  const b = inhoudswoorden(bezwaar);
  if (b.size === 0) return false;
  const v = inhoudswoorden(vraag);
  let gedeeld = 0;
  for (const w of b) if (v.has(w)) gedeeld++;
  return gedeeld >= Math.min(2, b.size);
}

/**
 * V11 van `docs/tasks/pijplijnanalyse-contentketen.md`: hooguit één vraag per
 * cluster over een bezwaar uit het verkoopgesprek. Bij één merk kwam "te laat
 * aanleveren" vijf keer terug in 90 meetvragen, ook in een cluster waar het
 * niet over ging: dan meet de meetlat het eigen verkoopverhaal in plaats van de
 * markt. Geeft `true` als deze vraag een tweede bezwaarvraag zou zijn.
 */
export function tweedeBezwaarvraag(vraag: string, bezwaren: readonly string[], eerdere: readonly string[]): boolean {
  if (!bezwaren.some((b) => raaktBezwaar(vraag, b))) return false;
  return eerdere.some((e) => bezwaren.some((b) => raaktBezwaar(e, b)));
}
