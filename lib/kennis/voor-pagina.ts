import "server-only";

/**
 * DE KENNIS VOOR ÉÉN PAGINA (K6 van `docs/tasks/van-pijplijn-naar-kennissysteem.md`,
 * besluit B20 van `docs/tasks/contentketen-opnieuw.md`).
 *
 * Leest wat `kiesVoorBlokA()` (`blok-a.ts`) nodig heeft: de kennis van het merk,
 * alle versies van de pagina, de kans erachter en de vragen die al in blok B
 * staan. Geen AI en geen oordeel; wat erin mag, beslist de pure module.
 *
 * Bewust platte uitvragen zonder joins, zoals `lib/pagina/context.ts`: de
 * ketentest draait deze code tegen Postgres via een shim die geen geneste
 * selecties nabootst.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { alleRijen } from "@/lib/supabase/pagineer";
import { kiesVoorBlokA, type KennisVoorBlokA, type KeuzeVoorBlokA } from "@/lib/kennis/blok-a";
import { blokkadesVan, type Blokkade, type BlokkadeConflict, type BlokkadeFeit, type BlokkadeKennis } from "@/lib/kennis/betwist";

/**
 * Welke kennis van dit merk nu niet naar de schrijver mag (`betwist.ts`). Ook
 * gebruikt door het kennisoverzicht, zodat de consultant ziet wat de schrijver
 * niet krijgt en waarom.
 */
export async function blokkadesVoorMerk(
  admin: SupabaseClient,
  profileId: string,
  kennis: readonly BlokkadeKennis[],
): Promise<Map<string, Blokkade>> {
  const [{ data: conflicten }, { data: feiten }] = await Promise.all([
    admin.from("fact_conflicts").select("status, echt_conflict, feit_ids, kennis_ids").eq("profile_id", profileId).in("status", ["open", "gevraagd"]),
    admin.from("brand_facts").select("id, stand").eq("profile_id", profileId).in("stand", ["betwist", "vervangen"]),
  ]);
  return blokkadesVan(kennis, (conflicten ?? []) as BlokkadeConflict[], (feiten ?? []) as BlokkadeFeit[]);
}

export interface PaginaSleutel {
  profileId: string;
  analysisId: string;
  pieceId: string;
  titel: string;
  zoekintentie: string | null;
}

/**
 * Alle versies van een pagina: hetzelfde cluster en dezelfde titel (de unieke
 * index van migratie 0023 laat per cluster en titel één actuele toe; een nieuwe
 * versie neemt titel en cluster over, `nieuweVersie()` in `lib/pagina/taken.ts`).
 */
async function versiesVan(admin: SupabaseClient, pagina: PaginaSleutel): Promise<string[]> {
  const { data } = await admin
    .from("content_pieces")
    .select("id")
    .eq("analysis_id", pagina.analysisId)
    .eq("title", pagina.titel);
  return [...new Set([pagina.pieceId, ...((data ?? []) as { id: string }[]).map((r) => r.id)])];
}

export async function kennisVoor(admin: SupabaseClient, pagina: PaginaSleutel, nu = new Date()): Promise<KeuzeVoorBlokA & { paginaIds: string[] }> {
  const paginaIds = await versiesVan(admin, pagina);

  const [{ data: kaarten }, { data: vragen }, kennis] = await Promise.all([
    admin.from("planned_pages").select("kans_id").in("content_piece_id", paginaIds).not("kans_id", "is", null),
    admin.from("fact_requests").select("id, content_piece_ids").eq("profile_id", pagina.profileId),
    alleRijen<KennisVoorBlokA>((van, tot) =>
      admin
        .from("klantkennis")
        .select("id, domein, soort, bewering, status, bron, gebruik, bron_url, citaat, bevestigd_door, bevestigd_op, vastgelegd_door, vastgelegd_door_taak, verloopt_op, vervangen_door, afgewezen_op, bewijskracht, geldt_voor, analysis_id, content_piece_id, herkomst_tabel, herkomst_id")
        .eq("profile_id", pagina.profileId)
        .is("vervangen_door", null)
        .order("vastgelegd_op")
        .order("id")
        .range(van, tot),
    ),
  ]);

  const kansIds = [...new Set(((kaarten ?? []) as { kans_id: string }[]).map((k) => k.kans_id))];
  let kansGeldtVoor: string[] | null = null;
  if (kansIds.length > 0) {
    const { data: kansen } = await admin.from("kansen").select("geldt_voor").in("id", kansIds);
    const lijst = [...new Set(((kansen ?? []) as { geldt_voor: string[] | null }[]).flatMap((k) => k.geldt_voor ?? []))];
    // Een kans zonder dienst (een onderwerp zonder aanbodknoop): dan zoals zonder kans.
    kansGeldtVoor = lijst.length > 0 ? lijst : null;
  }

  const vragenInBlokB = ((vragen ?? []) as { id: string; content_piece_ids: string[] | null }[])
    .filter((v) => (v.content_piece_ids ?? []).some((id) => paginaIds.includes(id)))
    .map((v) => v.id);

  const geblokkeerd = new Set((await blokkadesVoorMerk(admin, pagina.profileId, kennis)).keys());

  const keuze = kiesVoorBlokA(
    kennis.map((k) => ({ ...k, geldt_voor: k.geldt_voor ?? [] })),
    {
      analysisId: pagina.analysisId,
      paginaIds,
      titel: pagina.titel,
      zoekintentie: pagina.zoekintentie,
      kansGeldtVoor,
      vragenInBlokB,
      geblokkeerd,
    },
    nu,
  );
  return { ...keuze, paginaIds };
}
