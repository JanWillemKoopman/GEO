import "server-only";

/**
 * DE AANBODBOOM IN DE KENNISLAAG (K8 deel 4 van
 * `docs/tasks/van-pijplijn-naar-kennissysteem.md`, besluit V22).
 *
 * `profile_offerings` is sinds K8 deel 4 een kopie van de kennislaag, net als de
 * kennisvelden van `profiles` (deel 3): alleen deze module schrijft de tabel. De
 * onderwerpen, de clusters en de reputatiemodule lezen hem zoals voorheen.
 *
 * Twee schrijvers:
 *   - het onderzoek, via `aanbodkopie.ts` (apart, omdat daar geen mens bij is);
 *   - een mens op het bewerkscherm van de aanbodboom: toevoegen, aanpassen,
 *     weghalen en terugzetten. Tot K8 kwam dat niet in de kennislaag; nu is wat
 *     een mens toevoegt of aanpast verklaard (zoals het terugvullen van K3 een
 *     aangepaste knoop vastlegde), en wat hij weghaalt afgewezen, door hem.
 *
 * Gooit nooit een fout naar het scherm voor de kennis zelf; een mislukte
 * schrijfactie op de tabel geeft wel een fout terug.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { planAanbod, type BronAanbod, type PlanItem } from "@/lib/kennis/terugvullen";
import { wijzigingen, type Wijzigingen } from "@/lib/kennis/gesprek";
import { verwerk, type GesprekTelling, type Mens } from "@/lib/kennis/uit-gesprek";

const KNOOP_KOLOMMEN =
  "id, parent_id, kind, name, description, audience, price_indication, evidence_url, evidence_quote, source, note, removed_at, confidence";

/** De soorten van een aanbodknoop, zoals `planAanbod()` ze als `soort` vastlegt. */
const KNOOP_SOORTEN = ["dienst", "product", "categorie", "vestiging"];

// ── Een mens op het bewerkscherm ─────────────────────────────────────────────

/** De kennisitems van één knoop, zoals het terugvullen (K3) ze maakte. Een weggehaalde knoop heeft er geen. */
function itemsVan(knoop: BronAanbod | null): PlanItem[] {
  if (!knoop || knoop.removed_at) return [];
  const m = { items: [] as PlanItem[], uitsluitingen: [], voorConsultant: [] };
  planAanbod(m, { aanbod: [knoop] });
  return m.items;
}

/**
 * Waar een item van een knoop naar verwijst: de knoop zelf (voor doelgroep,
 * prijs en notitie) of zijn ouder. Het actuele item van die knoop, of niets als
 * dat er (nog) niet is; dan geldt het item voor het hele merk, zoals de knoop
 * zonder ouder.
 */
function geldtVoorVan(admin: SupabaseClient, profileId: string, ouderId: string | null) {
  const itemVanKnoop = async (knoopId: string): Promise<string | null> => {
    const { data } = await admin
      .from("klantkennis")
      .select("id")
      .eq("profile_id", profileId)
      .eq("herkomst_tabel", "profile_offerings")
      .eq("herkomst_id", knoopId)
      .in("soort", KNOOP_SOORTEN)
      .is("vervangen_door", null)
      .is("afgewezen_op", null)
      .limit(1);
    return ((data ?? []) as { id: string }[])[0]?.id ?? null;
  };
  return async (item: PlanItem): Promise<string[]> => {
    const knoopId = item.herkomst.id;
    // Het item van de knoop zelf hangt aan de ouder; de rest aan de knoop.
    const doel = item.ref === `profile_offerings:${knoopId}` ? ouderId : knoopId;
    if (!doel) return [];
    const id = await itemVanKnoop(doel);
    return id ? [id] : [];
  };
}

async function laadKnopen(admin: SupabaseClient, profileId: string, ids: readonly string[]): Promise<BronAanbod[]> {
  if (ids.length === 0) return [];
  const { data } = await admin.from("profile_offerings").select(KNOOP_KOLOMMEN).eq("profile_id", profileId).in("id", [...ids]);
  return (data ?? []) as unknown as BronAanbod[];
}

async function legKnoopwijzigingVast(
  admin: SupabaseClient,
  profileId: string,
  oud: BronAanbod | null,
  nu: BronAanbod | null,
  door: Mens,
): Promise<GesprekTelling> {
  const w: Wijzigingen = wijzigingen(itemsVan(oud), itemsVan(nu));
  return verwerk(admin, profileId, w, door, "aanbodboom", geldtVoorVan(admin, profileId, (nu ?? oud)?.parent_id ?? null));
}

/** Een knoop toevoegen. Geeft het id terug, of een fout. */
export async function voegKnoopToe(
  admin: SupabaseClient,
  args: { profileId: string; rij: Record<string, unknown> },
  door: Mens,
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await admin
    .from("profile_offerings")
    .insert({ ...args.rij, profile_id: args.profileId })
    .select(KNOOP_KOLOMMEN)
    .single();
  if (error || !data) return { id: null, error: error?.message ?? "Geen rij terug." };
  await legKnoopwijzigingVast(admin, args.profileId, null, data as unknown as BronAanbod, door);
  return { id: (data as unknown as { id: string }).id, error: null };
}

/** Een knoop aanpassen: naam, soort, omschrijving, doelgroep, prijs, notitie of ouder. */
export async function werkKnoopBij(
  admin: SupabaseClient,
  args: { profileId: string; knoopId: string; wijziging: Record<string, unknown> },
  door: Mens,
): Promise<{ error: string | null }> {
  const [oud] = await laadKnopen(admin, args.profileId, [args.knoopId]);
  if (!oud) return { error: "Deze knoop hoort niet bij dit merk." };
  const { data, error } = await admin
    .from("profile_offerings")
    .update(args.wijziging)
    .eq("id", args.knoopId)
    .eq("profile_id", args.profileId)
    .select(KNOOP_KOLOMMEN)
    .single();
  if (error || !data) return { error: error?.message ?? "Geen rij terug." };
  await legKnoopwijzigingVast(admin, args.profileId, oud, data as unknown as BronAanbod, door);
  return { error: null };
}

/** Knopen weghalen (een knoop met zijn nakomelingen). Ze blijven bewaard; de kennis ervan wordt afgewezen. */
export async function haalKnopenWeg(
  admin: SupabaseClient,
  args: { profileId: string; knoopIds: readonly string[] },
  door: Mens,
): Promise<{ error: string | null }> {
  const oud = (await laadKnopen(admin, args.profileId, args.knoopIds)).filter((k) => !k.removed_at);
  const { error } = await admin
    .from("profile_offerings")
    .update({ removed_at: new Date().toISOString(), removed_by: door.gebruikerId })
    .eq("profile_id", args.profileId)
    .in("id", [...args.knoopIds])
    .is("removed_at", null);
  if (error) return { error: error.message };
  for (const k of oud) await legKnoopwijzigingVast(admin, args.profileId, k, null, door);
  return { error: null };
}

/** Een weggehaalde knoop terugzetten: wie hem terugzet, zegt dat hij klopt. */
export async function zetKnoopTerug(
  admin: SupabaseClient,
  args: { profileId: string; knoopId: string },
  door: Mens,
): Promise<{ error: string | null }> {
  const { data, error } = await admin
    .from("profile_offerings")
    .update({ removed_at: null, removed_by: null })
    .eq("id", args.knoopId)
    .eq("profile_id", args.profileId)
    .select(KNOOP_KOLOMMEN)
    .maybeSingle();
  if (error) return { error: error.message };
  if (data) await legKnoopwijzigingVast(admin, args.profileId, null, data as unknown as BronAanbod, door);
  return { error: null };
}
