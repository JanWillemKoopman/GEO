import type { QualityIssue } from "@/lib/pipeline/quality-issue";

/**
 * Zinnen zonder bron die de klant bewust laat staan (migratie 0110).
 *
 * ── WAAROM (23 september 2026) ──────────────────────────────────────────────
 *
 * De keuring blokkeert elke zin die iets over het bedrijf zegt zonder
 * bevestigd feit (`quality-collect.ts`, bron `bronherleidbaarheid`). Op de
 * pagina "Bedrijfswagen leasen vanaf € 359 p/m" waren dat er vijf, onder andere
 * "Vervangend vervoer kun je aanvullend kiezen". De klant weet zelf of zoiets
 * klopt. Besluit van de eigenaar: dan kan hij zeggen "akkoord, laat staan", het
 * punt verdwijnt en de zin blijft ongewijzigd in de tekst.
 *
 * ⚠️ Alleen dit soort punt. Een punt van een beoordelaar over toon of opbouw is
 * geen feitelijke uitspraak waarvoor de klant kan instaan, en zo'n punt negeer
 * je met "Keur goed", niet door hem weg te klikken.
 *
 * Puur en zonder `server-only` (conventie 2): de route gebruikt het om te
 * controleren, het scherm om te filteren, en `scripts/test-unit.ts` kan erbij.
 */
export interface GeaccepteerdeZin {
  zin: string;
  door: string;
  op: string;
}

/** Witruimte, aanhalingstekens en het slotteken tellen niet mee bij het vergelijken. */
export function zinSleutel(zin: string): string {
  return zin
    .trim()
    .replace(/^["“„']+|["”']+\.?$/g, "")
    // Een slotpunt ook niet: de keuring citeert de zin soms met en soms zonder.
    .replace(/[.!?]+$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Mag de klant dit punt accepteren? Alleen een blokkerende zin zonder bron, met de zin erbij. */
export function isAccepteerbaar(issue: Pick<QualityIssue, "bron" | "blocking" | "evidence">): boolean {
  return issue.bron === "bronherleidbaarheid" && issue.blocking === true && Boolean(issue.evidence?.trim());
}

/** De opgeslagen lijst lezen. Alles wat niet de verwachte vorm heeft valt weg (conventie 3). */
export function leesGeaccepteerd(json: unknown): GeaccepteerdeZin[] {
  if (!Array.isArray(json)) return [];
  return json.filter(
    (r): r is GeaccepteerdeZin =>
      Boolean(r) && typeof r === "object" && typeof (r as GeaccepteerdeZin).zin === "string" && (r as GeaccepteerdeZin).zin.trim() !== "",
  );
}

/** De huidige lijst plus de nieuwe zinnen, zonder dubbelen. */
export function voegToe(
  bestaand: readonly GeaccepteerdeZin[],
  zinnen: readonly string[],
  door: string,
  op: string,
): GeaccepteerdeZin[] {
  const gezien = new Set(bestaand.map((z) => zinSleutel(z.zin)));
  const uit = [...bestaand];
  for (const zin of zinnen) {
    const sleutel = zinSleutel(zin);
    if (!sleutel || gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    uit.push({ zin: zin.trim(), door, op });
  }
  return uit;
}

/** De lijst zonder deze zinnen (ongedaan maken). */
export function haalWeg(bestaand: readonly GeaccepteerdeZin[], zinnen: readonly string[]): GeaccepteerdeZin[] {
  const weg = new Set(zinnen.map(zinSleutel));
  return bestaand.filter((z) => !weg.has(zinSleutel(z.zin)));
}

/**
 * De bevindingen zonder de punten die de klant heeft geaccepteerd, plus de
 * zinnen die daardoor wegvielen (voor "ongedaan maken" op het scherm).
 */
export function zonderGeaccepteerd<T extends Pick<QualityIssue, "bron" | "blocking" | "evidence">>(
  issues: readonly T[],
  geaccepteerd: readonly GeaccepteerdeZin[],
): { issues: T[]; weggelaten: string[] } {
  const sleutels = new Set(geaccepteerd.map((z) => zinSleutel(z.zin)));
  const weggelaten: string[] = [];
  const over = issues.filter((i) => {
    if (!isAccepteerbaar(i) || !sleutels.has(zinSleutel(i.evidence ?? ""))) return true;
    weggelaten.push((i.evidence ?? "").trim());
    return false;
  });
  return { issues: over, weggelaten };
}
