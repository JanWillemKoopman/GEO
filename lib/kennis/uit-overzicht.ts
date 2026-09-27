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
