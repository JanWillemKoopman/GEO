import "server-only";

/**
 * DE HANDELINGEN OP HET KENNISOVERZICHT (K7 van
 * `docs/tasks/van-pijplijn-naar-kennissysteem.md`).
 *
 * Bevestigen, aanpassen, afwijzen ("dit klopt niet") en "niet op de site", elk
 * via de schrijfingang (`vastleggen.ts`), altijd met een mens als actor: alleen
 * de consultant gebruikt dit scherm (besluit V6). Welke handeling bij welk item
 * kan, zegt `handelingenVoor()` in `overzicht.ts`; deze module controleert dat
 * nog eens, zodat de route geen handeling kan doen die het scherm niet aanbiedt.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Klantkennis } from "@/lib/types/database";
import { bevestig, nietOpSite, vervang, wijsAf, type HandelingUitkomst, type NieuwKennisItem } from "@/lib/kennis/vastleggen";
import { handelingenVoor, nieuwGebruikBijAanpassen, type OverzichtActie } from "@/lib/kennis/overzicht";

export const MAX_BEWERING = 2000;

/**
 * De aangepaste versie van een item. Wat de consultant noteert, zei de klant in
 * het gesprek (V6): verklaard, uit het gesprek. Het oude citaat, het bronadres
 * en de gestructureerde waarde horen bij de oude tekst en gaan niet mee. De
 * reikwijdte (dienst, onderwerp, pagina) en de herkomst blijven.
 */
function aangepast(oud: Klantkennis, tekst: string): NieuwKennisItem {
  return {
    profileId: oud.profile_id,
    domein: oud.domein,
    soort: oud.soort,
    bewering: tekst,
    waarde: null,
    status: "verklaard",
    bewijskracht: oud.bewijskracht,
    bron: "gesprek",
    bronUrl: null,
    citaat: null,
    gebruik: nieuwGebruikBijAanpassen(oud),
    geldtVoor: oud.geldt_voor ?? [],
    analysisId: oud.analysis_id,
    contentPieceId: oud.content_piece_id,
    verlooptOp: oud.verloopt_op,
    laatstGecontroleerdOp: new Date().toISOString(),
    herkomst: oud.herkomst_tabel && oud.herkomst_id ? { tabel: oud.herkomst_tabel, id: oud.herkomst_id } : null,
  };
}

export async function handelOpOverzicht(
  admin: SupabaseClient,
  args: { profileId: string; itemId: string; actie: OverzichtActie; bewering?: string | null },
  gebruikerId: string,
): Promise<HandelingUitkomst> {
  const { data } = await admin.from("klantkennis").select("*").eq("id", args.itemId).eq("profile_id", args.profileId).maybeSingle();
  const oud = data as Klantkennis | null;
  if (!oud) return { ok: false, fout: "Dit kennisitem bestaat niet bij dit merk." };
  if (!handelingenVoor(oud).includes(args.actie)) return { ok: false, fout: "Die handeling kan bij dit item niet." };
  const mens = { actor: "mens" as const, gebruikerId };
  const item = { profileId: args.profileId, itemId: oud.id };

  switch (args.actie) {
    case "bevestigen":
      return bevestig(admin, item, mens);
    case "afwijzen":
      return wijsAf(admin, item, mens);
    case "niet_op_site":
      return nietOpSite(admin, item, mens);
    case "aanpassen": {
      const tekst = (args.bewering ?? "").trim();
      if (!tekst) return { ok: false, fout: "Schrijf de nieuwe tekst." };
      if (tekst.length > MAX_BEWERING) return { ok: false, fout: `De tekst is te lang; hooguit ${MAX_BEWERING} tekens.` };
      if (tekst === oud.bewering.trim()) return { ok: false, fout: "De tekst is niet veranderd." };
      return vervang(admin, { profileId: args.profileId, oudId: oud.id, nieuw: aangepast(oud, tekst) }, mens);
    }
  }
}

/**
 * Een botsing tussen kennisitems afhandelen (K7, besluit V14): de consultant
 * kiest welk item klopt, of zegt dat geen van beide klopt. Het gekozen item wordt
 * bevestigd (V6: de klant bevestigde het in het gesprek), de andere afgewezen,
 * en de botsing staat daarna op opgelost. De keuze zelf staat in de kennislaag
 * (wie bevestigde, wie afwees); `gekozen_feit_id` wijst naar een feit en blijft
 * hier leeg.
 *
 * `winnaarId` null is "geen van beide": alle items van de botsing afgewezen.
 */
export async function losKennisconflictOp(
  admin: SupabaseClient,
  args: { profileId: string; conflictId: string; winnaarId: string | null },
  gebruikerId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("fact_conflicts")
    .select("id, status, kennis_ids")
    .eq("id", args.conflictId)
    .eq("profile_id", args.profileId)
    .maybeSingle();
  const c = data as { id: string; status: string; kennis_ids: string[] | null } | null;
  if (!c || !c.kennis_ids) return "Deze botsing bestaat niet (meer).";
  if (c.status !== "open") return "Deze botsing is al afgehandeld.";
  if (args.winnaarId && !c.kennis_ids.includes(args.winnaarId)) return "Kies een van de items uit deze botsing.";
  const mens = { actor: "mens" as const, gebruikerId };

  const { data: rijen } = await admin.from("klantkennis").select("*").eq("profile_id", args.profileId).in("id", c.kennis_ids);
  const items = (rijen ?? []) as Klantkennis[];
  const winnaar = items.find((i) => i.id === args.winnaarId);
  if (winnaar && (winnaar.vervangen_door || winnaar.afgewezen_op)) {
    return "Dit item is intussen vervangen of afgewezen; kijk het na op het kennisoverzicht.";
  }
  for (const item of items) {
    if (item.vervangen_door || item.afgewezen_op) continue;
    const uitkomst =
      item.id === args.winnaarId
        ? item.status === "bevestigd"
          ? ({ ok: true } as const)
          : await bevestig(admin, { profileId: args.profileId, itemId: item.id }, mens)
        : await wijsAf(admin, { profileId: args.profileId, itemId: item.id }, mens);
    if (!uitkomst.ok) return uitkomst.fout;
  }
  const nu = new Date().toISOString();
  const { error } = await admin
    .from("fact_conflicts")
    .update({ status: "opgelost", oplossing: "adviseur", opgelost_door: gebruikerId, opgelost_op: nu, updated_at: nu })
    .eq("id", c.id);
  return error ? `Opslaan mislukt: ${error.message}` : null;
}
