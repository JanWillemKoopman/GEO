/**
 * LIJKT EEN NIEUW CLUSTER OP EEN BESTAAND CLUSTER VAN HETZELFDE MERK?
 * (V18 punt 2 van `docs/tasks/pijplijnanalyse-contentketen.md`, besluit B-i).
 *
 * In ronde 1 van de contentkwaliteit (29 september 2026) had één merk drie
 * clusters die om dezelfde online boekhouder draaiden. Ze maten deels dezelfde
 * vragen en wezen naar dezelfde pagina's. Het formulier waarschuwt nu vóór het
 * aanmaken; het houdt niets tegen, want twee clusters die op elkaar lijken
 * kunnen een bewuste keuze zijn (§7 van het plan: geen automatisch samenvoegen).
 *
 * Geen AI en geen synoniemen: de gedeelde betekenisdragende woorden tellen.
 * Puur, zonder `server-only` (conventie 2).
 */

/** Woorden die in bijna elk onderwerp staan en niets over het onderwerp zeggen. */
const LEEG = new Set([
  "de", "het", "een", "en", "of", "in", "op", "voor", "met", "van", "bij", "aan", "tot", "om", "uit",
  "je", "jouw", "uw", "wat", "hoe", "welke", "beste", "goede", "goed", "nieuwe", "nieuw",
]);

function woorden(tekst: string): Set<string> {
  return new Set(
    tekst
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^\p{L}\p{N}]+/u)
      .filter((w) => w.length >= 3 && !LEEG.has(w))
      // Een eenvoudige stam: "boekhouders" en "boekhouder" zijn hetzelfde woord.
      .map((w) => w.replace(/(en|s)$/, "")),
  );
}

/**
 * Deel van de woorden van het kleinste onderwerp dat ook in het andere staat.
 * Vanaf dit deel heet het "lijkt op".
 */
export const LIJKT_OP_DREMPEL = 0.6;

/** De bestaande onderwerpen waar het nieuwe op lijkt, sterkste eerst. */
export function lijktOp(nieuw: string, bestaande: readonly string[]): string[] {
  const a = woorden(nieuw);
  if (a.size === 0) return [];
  const uit: { onderwerp: string; score: number }[] = [];
  for (const onderwerp of new Set(bestaande)) {
    const b = woorden(onderwerp);
    if (b.size === 0) continue;
    let gedeeld = 0;
    for (const w of a) if (b.has(w)) gedeeld++;
    const score = gedeeld / Math.min(a.size, b.size);
    if (score >= LIJKT_OP_DREMPEL) uit.push({ onderwerp, score });
  }
  return uit.sort((x, y) => y.score - x.score).map((x) => x.onderwerp);
}
