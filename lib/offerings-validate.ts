/**
 * De pure regels achter de aanbodroute (onboarding Ronde C, §16.3): wat een
 * geldige knoop is, of een verplaatsing een lus zou opleveren, en waar een
 * nieuwe knoop in de volgorde komt.
 *
 * Zonder `server-only` (conventie 2): dit bepaalt of een schrijfactie wordt
 * geweigerd, en dat hoort getest te zijn vanuit `scripts/test-unit.ts` zonder
 * database. De route (`app/api/profiles/[id]/offerings/route.ts`) is de enige
 * aanroeper; conventie 1 wil de garantie hier, niet alleen in het scherm.
 */
import type { ProfileOffering } from "@/lib/types/database";

/** De vijf soorten die de databaseconstraint toestaat (migratie 0039). */
export const OFFERING_KINDS = ["dienst", "product", "categorie", "merk", "vestiging"] as const;
export type OfferingKind = (typeof OFFERING_KINDS)[number];

export function isOfferingKind(value: unknown): value is OfferingKind {
  return typeof value === "string" && (OFFERING_KINDS as readonly string[]).includes(value);
}

/**
 * Een geldige naam: getrimd, niet leeg. `null` betekent "ongeldig", nooit een
 * gok naar een lege string (conventie 3).
 */
export function normaliseOfferingName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Zou `parentId` als ouder van `nodeId` een lus opleveren?
 *
 * ── WAAROM DIT MOET ──────────────────────────────────────────────────────────
 *
 * Zonder controle levert "hang dienst A onder zichzelf" of "hang categorie B
 * onder zijn eigen kleinkind C" een boom op die zichzelf niet meer kan
 * opbouwen: `byParent.get(o.id)` in `offerings-panel.tsx` loopt dan voor altijd
 * door. `parentId === nodeId` is de directe vorm; de rest is elke voorouder
 * van `parentId` naar boven volgen en kijken of `nodeId` daarin voorkomt, want
 * dan zou `nodeId` zijn eigen voorouder worden.
 *
 * `nodeId` is `null` bij het toevoegen van een nieuwe knoop: die kan nooit een
 * lus veroorzaken, hij bestaat nog niet.
 */
export function wouldCreateCycle(
  nodes: Pick<ProfileOffering, "id" | "parent_id">[],
  nodeId: string | null,
  parentId: string | null,
): boolean {
  if (!nodeId || !parentId) return false;
  if (parentId === nodeId) return true;

  const byId = new Map(nodes.map((n) => [n.id, n.parent_id]));
  let current: string | null = parentId;
  const gezien = new Set<string>();
  while (current) {
    if (current === nodeId) return true;
    // Al gezien: de boom zoals hij ligt bevat zelf al een lus. Stoppen in
    // plaats van oneindig doorlopen; dat is een bestaand datafout, geen reden
    // om deze wijziging op zichzelf te weigeren.
    if (gezien.has(current)) return false;
    gezien.add(current);
    current = byId.get(current) ?? null;
  }
  return false;
}

/**
 * Waar een nieuwe knoop in de volgorde komt: de hoogste bestaande plus tien
 * (§16.3, punt 4), zodat handmatige knopen onderaan komen en de bestaande
 * volgorde niet verschuift.
 */
export function nextSortOrder(existing: Pick<ProfileOffering, "sort_order">[]): number {
  if (existing.length === 0) return 10;
  return Math.max(...existing.map((o) => o.sort_order)) + 10;
}

/**
 * Trimt vrije-tekstvelden en zet een lege of ontbrekende waarde om naar `null`
 * (conventie 3): geen onderscheid tussen "leeg getypt" en "niet meegestuurd",
 * de kolom is nullable en het scherm toont beide hetzelfde.
 */
export function normaliseOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
