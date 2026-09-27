import "server-only";

/**
 * DE ENIGE SCHRIJFINGANG VAN `afhankelijkheden` (G2 van
 * `docs/tasks/van-pijplijn-naar-kennissysteem.md`, §6.5).
 *
 * Gevuld door wie het object maakt: `lib/kansen/uit-rapport.ts` en
 * `lib/kansen/handmatig.ts` bij het vastleggen van een kans (`geldt_voor`),
 * `lib/pagina/taken.ts` bij het schrijven en herschrijven van een pagina
 * (`gebruikte_kennis`, C3). Nooit achteraf geraden.
 *
 * Best effort, zoals `zetBotsingen()` in `lib/kennis/vastleggen.ts`: een
 * afhankelijkheid is een gevolg van de schrijfactie, niet een voorwaarde
 * ervoor. Mislukt het wegschrijven, dan is de kans of de pagina wél vastgelegd.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type Admin = SupabaseClient;

export type VanTabel = "kansen" | "content_pieces";

export async function legAfhankelijkhedenVast(
  admin: Admin,
  args: { profileId: string; vanTabel: VanTabel; vanId: string; kennisIds: readonly string[] },
): Promise<void> {
  const ids = [...new Set(args.kennisIds)];
  if (ids.length === 0) return;
  const { error } = await admin.from("afhankelijkheden").upsert(
    ids.map((kennisId) => ({
      profile_id: args.profileId,
      van_tabel: args.vanTabel,
      van_id: args.vanId,
      kennis_id: kennisId,
    })),
    { onConflict: "van_tabel,van_id,kennis_id", ignoreDuplicates: true },
  );
  if (error) {
    console.warn(`Afhankelijkheden vastleggen mislukt voor ${args.vanTabel} ${args.vanId}:`, error.message);
  }
}

/**
 * Wat hangt er aan dit kennisitem (G2 klaar-als): de objecten die ervan
 * afhangen, per tabel.
 */
export async function afhankelijkVan(
  admin: Admin,
  kennisId: string,
): Promise<{ vanTabel: VanTabel; vanId: string }[]> {
  const { data } = await admin
    .from("afhankelijkheden")
    .select("van_tabel, van_id")
    .eq("kennis_id", kennisId);
  return ((data ?? []) as { van_tabel: VanTabel; van_id: string }[]).map((r) => ({
    vanTabel: r.van_tabel,
    vanId: r.van_id,
  }));
}
