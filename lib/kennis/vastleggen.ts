import "server-only";

/**
 * DE ENIGE SCHRIJFINGANG VAN DE KENNISLAAG (K2 van
 * `docs/tasks/van-pijplijn-naar-kennissysteem.md`, §4 regel 3).
 *
 * Vier handelingen, en verder niets:
 *   - `legVast()`   een nieuw item, met herkomst, ontdubbeld op een sleutel;
 *   - `bevestig()`  een mens staat ervoor in;
 *   - `wijsAf()`    een mens zegt "dit klopt niet";
 *   - `vervang()`   een nieuwere versie, de oude blijft bewaard.
 *
 * ── WAAROM ÉÉN INGANG ───────────────────────────────────────────────────────
 *
 * De kennis staat nu op zes plekken omdat elke nieuwe functie zijn eigen versie
 * bouwde (`kennismodel-inventaris.md`). `proof_points` kreeg zo twee schrijvers
 * met een andere betekenis: 15 van de 27 regels zijn een kopie van een antwoord,
 * 12 een oordeel van het onderzoek, en niemand kan ze nog uit elkaar houden. Eén
 * ingang is de enige manier om dat niet opnieuw te laten gebeuren. Twee tests in
 * `scripts/test-unit.ts` bewaken hem: geen schrijfactie op `klantkennis` buiten
 * `lib/kennis/`, en verklaard of bevestigd alleen vanuit de routes voor
 * klantantwoorden, het gesprek, het kennisoverzicht en het terugvullen (K3).
 *
 * ── WAT HIER NIET GEBEURT ───────────────────────────────────────────────────
 *
 * Geen AI-aanroep (§4 regel 1). Een botsing wordt herkend en op de conflictlijst
 * gezet; wie gelijk heeft, beslist de consultant (besluit V14). Niets draait
 * vanzelf opnieuw (§4 regel 5): dat is fase 3.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Klantkennis } from "@/lib/types/database";
import {
  controleerItem,
  magNieuwMetStatus,
  magOvergaan,
  isAfgewezen,
  type Actor,
  type KennisStatus,
  type KennisBron,
} from "@/lib/kennis/regels";
import { kennisSleutel, botsingenMet, type SamenvoegItem } from "@/lib/kennis/samenvoegen";

type Admin = SupabaseClient;

/** Wie de handeling doet. Een mens heeft een gebruiker, code en modellen een taaksoort. */
export type Door =
  | { actor: "mens"; gebruikerId: string }
  | { actor: "code" | "model"; taak: string };

export interface Herkomst {
  tabel: NonNullable<Klantkennis["herkomst_tabel"]>;
  id: string;
}

export interface NieuwKennisItem {
  profileId: string;
  domein: Klantkennis["domein"];
  soort?: string | null;
  bewering: string;
  waarde?: unknown | null;
  status: KennisStatus;
  bewijskracht?: Klantkennis["bewijskracht"];
  bron: KennisBron;
  bronUrl?: string | null;
  citaat?: string | null;
  gebruik: Klantkennis["gebruik"];
  geldtVoor?: string[];
  analysisId?: string | null;
  contentPieceId?: string | null;
  verlooptOp?: string | null;
  laatstGecontroleerdOp?: string | null;
  /**
   * Waar het vandaan kwam. Verplicht, behalve als een mens het zelf invoert: dan
   * is die mens de herkomst (`vastgelegd_door`).
   */
  herkomst?: Herkomst | null;
  ruw?: unknown | null;
}

export type LegVastUitkomst =
  | { soort: "vastgelegd"; item: Klantkennis; botsingen: number }
  | { soort: "bestond"; item: Klantkennis }
  | { soort: "eerder_afgewezen"; item: Klantkennis }
  | { soort: "geweigerd"; fouten: string[] };

export type HandelingUitkomst = { ok: true; item: Klantkennis } | { ok: false; fout: string };

function vastgelegdDoor(door: Door): { vastgelegd_door: string | null; vastgelegd_door_taak: string | null } {
  return door.actor === "mens"
    ? { vastgelegd_door: door.gebruikerId, vastgelegd_door_taak: null }
    : { vastgelegd_door: null, vastgelegd_door_taak: door.taak };
}

function alsSamenvoegItem(r: Klantkennis): SamenvoegItem {
  return {
    id: r.id,
    domein: r.domein,
    soort: r.soort,
    bewering: r.bewering,
    waarde: r.waarde,
    geldt_voor: r.geldt_voor,
    analysis_id: r.analysis_id,
    content_piece_id: r.content_piece_id,
    sleutel: r.sleutel,
    vervangen_door: r.vervangen_door,
    afgewezen_op: r.afgewezen_op,
  };
}

/** Het actuele item met deze sleutel (niet vervangen), of null. */
async function metSleutel(admin: Admin, profileId: string, sleutel: string): Promise<Klantkennis | null> {
  const { data } = await admin
    .from("klantkennis")
    .select("*")
    .eq("profile_id", profileId)
    .eq("sleutel", sleutel)
    .is("vervangen_door", null)
    .maybeSingle();
  return (data as Klantkennis | null) ?? null;
}

async function laad(admin: Admin, profileId: string, id: string): Promise<Klantkennis | null> {
  const { data } = await admin.from("klantkennis").select("*").eq("id", id).eq("profile_id", profileId).maybeSingle();
  return (data as Klantkennis | null) ?? null;
}

/**
 * De controles die voor elke nieuwe rij gelden, ook bij `vervang()`. Geeft de
 * rij terug, of de redenen waarom hij niet mag.
 */
async function bouwRij(
  admin: Admin,
  item: NieuwKennisItem,
  door: Door,
): Promise<{ rij: Record<string, unknown>; sleutel: string | null } | { fouten: string[] }> {
  const wie = vastgelegdDoor(door);
  const fouten = controleerItem({
    domein: item.domein,
    bewering: item.bewering,
    status: item.status,
    bron: item.bron,
    gebruik: item.gebruik,
    bron_url: item.bronUrl ?? null,
    citaat: item.citaat ?? null,
    bewijskracht: item.bewijskracht ?? null,
    ...wie,
  });
  if (!magNieuwMetStatus(item.status, door.actor as Actor, item.bron)) {
    fouten.push(
      door.actor === "model"
        ? "Een model legt alleen afgeleide kennis vast."
        : `Een nieuw item met status "${item.status}" en bron "${item.bron}" mag zo niet worden vastgelegd.`,
    );
  }
  if (!item.herkomst && door.actor !== "mens") {
    fouten.push("Zeg waar het vandaan kwam: de tabel en de rij.");
  }

  // `geldt_voor` kan geen foreign key dragen (een array). Dus hier: elke
  // verwijzing is een bestaand item van hetzelfde merk.
  const geldtVoor = [...new Set(item.geldtVoor ?? [])];
  if (geldtVoor.length > 0) {
    const { data } = await admin.from("klantkennis").select("id").eq("profile_id", item.profileId).in("id", geldtVoor);
    const gevonden = new Set(((data ?? []) as { id: string }[]).map((r) => r.id));
    const vreemd = geldtVoor.filter((id) => !gevonden.has(id));
    if (vreemd.length > 0) fouten.push(`"Geldt voor" wijst naar kennis die niet bij dit merk hoort: ${vreemd.join(", ")}.`);
  }
  if (fouten.length > 0) return { fouten };

  const sleutel = kennisSleutel({
    domein: item.domein,
    bewering: item.bewering,
    analysis_id: item.analysisId ?? null,
    content_piece_id: item.contentPieceId ?? null,
  });
  return {
    sleutel,
    rij: {
      profile_id: item.profileId,
      domein: item.domein,
      soort: item.soort ?? null,
      bewering: item.bewering.trim(),
      waarde: item.waarde ?? null,
      status: item.status,
      bewijskracht: item.bewijskracht ?? null,
      bron: item.bron,
      bron_url: item.bronUrl ?? null,
      citaat: item.citaat ?? null,
      ...wie,
      laatst_gecontroleerd_op: item.laatstGecontroleerdOp ?? null,
      verloopt_op: item.verlooptOp ?? null,
      gebruik: item.gebruik,
      geldt_voor: geldtVoor,
      analysis_id: item.analysisId ?? null,
      content_piece_id: item.contentPieceId ?? null,
      herkomst_tabel: item.herkomst?.tabel ?? null,
      herkomst_id: item.herkomst?.id ?? null,
      sleutel,
      ruw: item.ruw ?? null,
    },
  };
}

/**
 * Botsingen van dit item met de actuele kennis van het merk op de conflictlijst
 * zetten (besluit V14). Een paar dat er al staat, blijft staan: de unieke index
 * op (merk, paarsleutel) houdt het bij één rij, ook als twee aanroepen tegelijk
 * komen.
 */
async function zetBotsingen(admin: Admin, nieuw: Klantkennis): Promise<number> {
  if (!nieuw.soort || nieuw.waarde == null) return 0;
  const { data } = await admin
    .from("klantkennis")
    .select("*")
    .eq("profile_id", nieuw.profile_id)
    .eq("soort", nieuw.soort)
    .is("vervangen_door", null)
    .is("afgewezen_op", null);
  const botsingen = botsingenMet(alsSamenvoegItem(nieuw), ((data ?? []) as Klantkennis[]).map(alsSamenvoegItem));
  let gezet = 0;
  for (const b of botsingen) {
    const { error } = await admin.from("fact_conflicts").insert({
      profile_id: nieuw.profile_id,
      feit_ids: [],
      kennis_ids: [b.nieuwId, b.bestaandId],
      paar_sleutel: b.paarSleutel,
      soort: b.soort,
      // De code zag twee verschillende waarden voor hetzelfde; tot de
      // consultant anders beslist, geldt het als botsing. Er is geen model dat
      // "varianten" kan zeggen (V14).
      echt_conflict: true,
      ernst: b.ernst,
      status: "open",
      uitleg: "Twee versies van hetzelfde gegeven in de kennis over dit bedrijf. Kies welke klopt.",
    });
    if (!error) gezet++;
    else if ((error as { code?: string }).code !== "23505") {
      console.warn(`Botsing vastleggen mislukt voor merk ${nieuw.profile_id}: ${error.message}`);
    }
  }
  return gezet;
}

/**
 * Een nieuw kennisitem vastleggen.
 *
 * Idempotent (conventie 9): bestaat er al een actueel item met dezelfde sleutel,
 * dan komt dat terug en wordt er niets geschreven. Was het eerder afgewezen, dan
 * ook niet: een bewering die een mens afwees, komt niet via een volgende
 * onderzoeksronde stil terug.
 */
export async function legVast(admin: Admin, item: NieuwKennisItem, door: Door): Promise<LegVastUitkomst> {
  const gebouwd = await bouwRij(admin, item, door);
  if ("fouten" in gebouwd) return { soort: "geweigerd", fouten: gebouwd.fouten };

  if (gebouwd.sleutel) {
    const bestaand = await metSleutel(admin, item.profileId, gebouwd.sleutel);
    if (bestaand) return isAfgewezen(bestaand) ? { soort: "eerder_afgewezen", item: bestaand } : { soort: "bestond", item: bestaand };
  }

  const { data, error } = await admin.from("klantkennis").insert(gebouwd.rij).select("*").single();
  if (error || !data) {
    // Twee aanroepen tegelijk met dezelfde sleutel: de unieke index liet er één
    // door. Die is dan het antwoord.
    if ((error as { code?: string } | null)?.code === "23505" && gebouwd.sleutel) {
      const bestaand = await metSleutel(admin, item.profileId, gebouwd.sleutel);
      if (bestaand) return { soort: "bestond", item: bestaand };
    }
    return { soort: "geweigerd", fouten: [`Opslaan mislukte: ${error?.message ?? "onbekende fout"}`] };
  }
  const nieuw = data as Klantkennis;
  const botsingen = await zetBotsingen(admin, nieuw);
  return { soort: "vastgelegd", item: nieuw, botsingen };
}

/**
 * Een mens bevestigt een item. Alleen een mens (§4 regel 2, besluit V6: de
 * consultant legt vast wat de klant in het gesprek bevestigde). Wie en wanneer
 * gaan mee; de database weigert een bevestiging zonder.
 */
export async function bevestig(
  admin: Admin,
  args: { profileId: string; itemId: string },
  door: Extract<Door, { actor: "mens" }>,
): Promise<HandelingUitkomst> {
  if (door.actor !== "mens") return { ok: false, fout: "Alleen een mens kan bevestigen." };
  const item = await laad(admin, args.profileId, args.itemId);
  if (!item) return { ok: false, fout: "Dit kennisitem bestaat niet bij dit merk." };
  if (item.vervangen_door) return { ok: false, fout: "Dit item is vervangen; bevestig de nieuwe versie." };
  if (isAfgewezen(item)) return { ok: false, fout: "Dit item is afgewezen." };
  if (!magOvergaan(item.status, "bevestigd", "mens", item)) {
    return { ok: false, fout: `Van "${item.status}" naar bevestigd kan niet.` };
  }
  const nu = new Date().toISOString();
  const { data, error } = await admin
    .from("klantkennis")
    .update({ status: "bevestigd", bevestigd_door: door.gebruikerId, bevestigd_op: nu, laatst_gecontroleerd_op: nu, updated_at: nu })
    .eq("id", item.id)
    .select("*")
    .single();
  if (error || !data) return { ok: false, fout: `Bevestigen mislukte: ${error?.message ?? "onbekende fout"}` };
  return { ok: true, item: data as Klantkennis };
}

/**
 * Een mens wijst een item af: "dit klopt niet". Het item blijft bewaard, met wie
 * en wanneer, maar telt nergens meer mee (`isActueel()`).
 */
export async function wijsAf(
  admin: Admin,
  args: { profileId: string; itemId: string },
  door: Extract<Door, { actor: "mens" }>,
): Promise<HandelingUitkomst> {
  if (door.actor !== "mens") return { ok: false, fout: "Alleen een mens kan afwijzen." };
  const item = await laad(admin, args.profileId, args.itemId);
  if (!item) return { ok: false, fout: "Dit kennisitem bestaat niet bij dit merk." };
  if (isAfgewezen(item)) return { ok: true, item };
  const nu = new Date().toISOString();
  const { data, error } = await admin
    .from("klantkennis")
    .update({ afgewezen_door: door.gebruikerId, afgewezen_op: nu, updated_at: nu })
    .eq("id", item.id)
    .select("*")
    .single();
  if (error || !data) return { ok: false, fout: `Afwijzen mislukte: ${error?.message ?? "onbekende fout"}` };
  return { ok: true, item: data as Klantkennis };
}

/**
 * Een nieuwere versie van een item. De oude blijft staan met een verwijzing naar
 * de nieuwe (`vervangen_door`), zodat altijd na te gaan is wat er eerder gold en
 * welke pagina daarop leunde.
 *
 * Volgorde, omdat de database geen transactie over drie aanroepen geeft: eerst
 * de nieuwe rij zonder sleutel, dan de oude laten verwijzen, dan de sleutel op de
 * nieuwe. Zo kan de unieke sleutelindex nooit twee actuele rijen zien. Mislukt de
 * tweede stap, dan meldt de uitkomst dat, met het id van de nieuwe rij: die
 * staat dan zonder sleutel naast de oude, en de consultant ziet ze allebei.
 */
export async function vervang(
  admin: Admin,
  args: { profileId: string; oudId: string; nieuw: NieuwKennisItem },
  door: Door,
): Promise<HandelingUitkomst> {
  const oud = await laad(admin, args.profileId, args.oudId);
  if (!oud) return { ok: false, fout: "Het item dat vervangen wordt, bestaat niet bij dit merk." };
  if (oud.vervangen_door) return { ok: false, fout: "Dit item is al vervangen; vervang de nieuwste versie." };
  if (args.nieuw.profileId !== args.profileId) return { ok: false, fout: "De nieuwe versie hoort bij een ander merk." };
  // Een model vervangt nooit wat een mens zei of bevestigde.
  if (door.actor === "model" && (oud.status === "verklaard" || oud.status === "bevestigd")) {
    return { ok: false, fout: "Een model kan geen verklaarde of bevestigde kennis vervangen." };
  }

  const gebouwd = await bouwRij(admin, args.nieuw, door);
  if ("fouten" in gebouwd) return { ok: false, fout: gebouwd.fouten.join(" ") };

  const { data: rij, error } = await admin
    .from("klantkennis")
    .insert({ ...gebouwd.rij, sleutel: null })
    .select("*")
    .single();
  if (error || !rij) return { ok: false, fout: `De nieuwe versie opslaan mislukte: ${error?.message ?? "onbekende fout"}` };
  const nieuw = rij as Klantkennis;
  const nu = new Date().toISOString();

  const { error: oudFout } = await admin
    .from("klantkennis")
    .update({ vervangen_door: nieuw.id, updated_at: nu })
    .eq("id", oud.id);
  if (oudFout) {
    return { ok: false, fout: `De oude versie laten verwijzen mislukte: ${oudFout.message}. De nieuwe rij ${nieuw.id} staat zonder sleutel.` };
  }

  if (gebouwd.sleutel) {
    const { data: metSl, error: slFout } = await admin
      .from("klantkennis")
      .update({ sleutel: gebouwd.sleutel, updated_at: nu })
      .eq("id", nieuw.id)
      .select("*")
      .single();
    // Een andere actuele rij heeft deze sleutel al (dezelfde bewering bestond
    // nog een keer). Dan blijft de nieuwe versie zonder sleutel: hij is geldig,
    // alleen niet de ontdubbelingsrij.
    if (!slFout && metSl) {
      await zetBotsingen(admin, metSl as Klantkennis);
      return { ok: true, item: metSl as Klantkennis };
    }
  }
  await zetBotsingen(admin, nieuw);
  return { ok: true, item: nieuw };
}
