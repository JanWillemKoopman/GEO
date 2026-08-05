import "server-only";

/**
 * Gemeten merknamen koppelen aan één entiteit per bedrijf (optimalisatie.md 2.4).
 *
 * De classificatie geeft terug wat er letterlijk in het AI-antwoord staat,
 * "Coolblue" de ene keer, "coolblue.nl" de andere. Dit koppelt die schrijfwijzen
 * aan één rij in `entities`, zodat de concurrentievergelijking en de trend niet
 * uiteenvallen in varianten van hetzelfde bedrijf.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeEntityName, pickCanonicalName } from "@/lib/entities/normalize";
import type { Entity } from "@/lib/types/database";

type Admin = SupabaseClient;

/** Alle bekende entiteiten van een profiel, opzoekbaar op genormaliseerde vorm. */
export interface EntityIndex {
  byNormalized: Map<string, Entity>;
  all: Entity[];
}

export async function loadEntityIndex(admin: Admin, profileId: string): Promise<EntityIndex> {
  const { data } = await admin.from("entities").select("*").eq("profile_id", profileId);
  const all = (data ?? []) as Entity[];

  const byNormalized = new Map<string, Entity>();
  for (const e of all) {
    byNormalized.set(e.normalized, e);
    // Aliassen wijzen naar dezelfde entiteit.
    for (const alias of e.aliases ?? []) byNormalized.set(alias, e);
  }
  return { byNormalized, all };
}

/**
 * Zoekt de entiteit bij een gemeten naam, of maakt hem aan als hij nieuw is.
 *
 * Nieuwe entiteiten komen binnen als `confirmed: false`. Dat is bewust: ze
 * tellen dan nog niet mee in de noemer van het aandeel (2.5) en verschijnen in
 * het beheerscherm, waar de klant ze bevestigt of wegzet. Anders zou elk merk
 * dat een AI-antwoord toevallig noemt, een leverancier, een vergelijkingssite,
 * het aandeel van de klant verwateren.
 */
export async function resolveEntity(
  admin: Admin,
  profileId: string,
  index: EntityIndex,
  rawName: string,
  /** Bekende concurrenten uit profiel/onderzoek worden meteen bevestigd. */
  autoConfirm = false,
): Promise<Entity | null> {
  const normalized = normalizeEntityName(rawName);
  if (!normalized) return null;

  const existing = index.byNormalized.get(normalized);
  if (existing) {
    // Mooiere schrijfwijze tegengekomen? Dan die tonen.
    const better = pickCanonicalName([existing.canonical_name, rawName]);
    if (better !== existing.canonical_name) {
      await admin.from("entities").update({ canonical_name: better }).eq("id", existing.id);
      existing.canonical_name = better;
    }
    return existing;
  }

  const { data, error } = await admin
    .from("entities")
    .insert({
      profile_id: profileId,
      canonical_name: rawName.trim(),
      normalized,
      confirmed: autoConfirm,
    })
    .select("*")
    .single();

  if (error) {
    // Race met een andere meettaak die dezelfde nieuwe naam tegenkwam: de
    // unieke index (profile_id, normalized) wint. Gewoon ophalen wat er staat.
    const { data: raced } = await admin
      .from("entities")
      .select("*")
      .eq("profile_id", profileId)
      .eq("normalized", normalized)
      .maybeSingle();
    if (!raced) throw new Error(`Entiteit "${rawName}" opslaan mislukt: ${error.message}`);
    const entity = raced as Entity;
    index.byNormalized.set(normalized, entity);
    index.all.push(entity);
    return entity;
  }

  const entity = data as Entity;
  index.byNormalized.set(normalized, entity);
  index.all.push(entity);
  return entity;
}

/**
 * Zorgt dat de bekende concurrenten (uit het klantprofiel en het
 * onderwerp-onderzoek) als BEVESTIGDE entiteiten bestaan. Die vormen de vaste
 * noemer van het aandeel (2.5): een set die niet meegroeit met wat de
 * classificatie toevallig tegenkomt.
 */
export async function ensureKnownEntities(
  admin: Admin,
  profileId: string,
  names: string[],
): Promise<EntityIndex> {
  const index = await loadEntityIndex(admin, profileId);
  for (const name of names) {
    await resolveEntity(admin, profileId, index, name, true);
  }
  return index;
}
