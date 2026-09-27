import "server-only";

/**
 * SITEFEITEN INDELEN IN DE KENNISLAAG (K8 deel 2, besluit V18).
 *
 * Draait als de taak `fact_register` (de naam bleef, de wachtrij kent hem): voor
 * de briefs van een maand (`lib/pagina/start.ts`) en als de consultant op het
 * conflictscherm "opnieuw nalopen" kiest. Per merk:
 *
 *   1. De sitefeiten zonder soort laten indelen door het goedkope model
 *      (`deelFeitenIn()`, dezelfde opdracht als het feitenregister gebruikte).
 *   2. Het resultaat vastleggen met `deelIn()`, dat daarna zelf in code zoekt of
 *      het nieuwe gegeven botst met wat er al stond (V14).
 *
 * Wat verviel ten opzichte van het feitenregister: het oordeel van een tweede
 * model over elk paar (`conflict-judge.ts`) en de automatische winnaar. Een
 * botsing in de kennislaag beslist de consultant (V14); zolang hij open staat,
 * gaat geen van beide naar de schrijver (`betwist.ts`).
 *
 * Idempotent (conventie 9): een ingedeeld item heeft een soort en komt niet
 * terug. Een mislukte batch blijft zonder soort staan en komt de volgende keer.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { alleRijen } from "@/lib/supabase/pagineer";
import { deelFeitenIn, INDEEL_BATCH } from "@/lib/pipeline/fact-classify";
import { deelIn } from "@/lib/kennis/vastleggen";
import { indelingVoorKennis, moetIngedeeld, SITEFEIT_HERKOMST, type AanbodNaam } from "@/lib/kennis/indeling";
import type { Klantkennis } from "@/lib/types/database";

/** Twaalf batches van 40 per run, zoals het feitenregister; de rest pakt de volgende run op. */
const MAX_BATCHES = 12;
const BATCHES_TEGELIJK = 4;

export const INDEEL_TAAK = "fact_register";

export interface IndeelUitkomst {
  ingedeeld: number;
  mislukt: number;
}

type Rij = Pick<Klantkennis, "id" | "bewering" | "soort" | "bron" | "status" | "herkomst_tabel" | "vervangen_door" | "afgewezen_op">;

/** Hoeveel sitefeiten van dit merk nog op een indeling wachten (voor het conflictscherm). */
export async function nogInTeDelen(admin: SupabaseClient, profileId: string): Promise<number> {
  const { count } = await admin
    .from("klantkennis")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("bron", "website")
    .eq("status", "waargenomen")
    .in("herkomst_tabel", [...SITEFEIT_HERKOMST])
    .is("soort", null)
    .is("vervangen_door", null)
    .is("afgewezen_op", null);
  return count ?? 0;
}

/** De aanbodknopen als kennisitems, met de naam van de knoop (voor "geldt voor"). */
async function aanbodNamen(admin: SupabaseClient, profileId: string): Promise<AanbodNaam[]> {
  const [{ data: knopen }, { data: items }] = await Promise.all([
    admin.from("profile_offerings").select("id, name").eq("profile_id", profileId).is("removed_at", null),
    admin
      .from("klantkennis")
      .select("id, herkomst_id")
      .eq("profile_id", profileId)
      .eq("herkomst_tabel", "profile_offerings")
      .is("vervangen_door", null)
      .is("afgewezen_op", null),
  ]);
  const naamVan = new Map(((knopen ?? []) as { id: string; name: string }[]).map((k) => [k.id, k.name]));
  const uit: AanbodNaam[] = [];
  for (const i of (items ?? []) as { id: string; herkomst_id: string | null }[]) {
    const naam = i.herkomst_id ? naamVan.get(i.herkomst_id) : undefined;
    if (naam) uit.push({ kennisId: i.id, naam });
  }
  return uit;
}

export async function deelKennisIn(admin: SupabaseClient, profileId: string): Promise<IndeelUitkomst> {
  const uitkomst: IndeelUitkomst = { ingedeeld: 0, mislukt: 0 };
  const rijen = await alleRijen<Rij>((van, tot) =>
    admin
      .from("klantkennis")
      .select("id, bewering, soort, bron, status, herkomst_tabel, vervangen_door, afgewezen_op")
      .eq("profile_id", profileId)
      .is("soort", null)
      .is("vervangen_door", null)
      .order("vastgelegd_op")
      .order("id")
      .range(van, tot),
  );
  const teDoen = rijen.filter(moetIngedeeld).slice(0, MAX_BATCHES * INDEEL_BATCH);
  if (teDoen.length === 0) return uitkomst;
  const aanbod = await aanbodNamen(admin, profileId);

  const batches: Rij[][] = [];
  for (let b = 0; b * INDEEL_BATCH < teDoen.length; b++) batches.push(teDoen.slice(b * INDEEL_BATCH, (b + 1) * INDEEL_BATCH));
  for (let i = 0; i < batches.length; i += BATCHES_TEGELIJK) {
    const uitslagen = await Promise.all(
      batches.slice(i, i + BATCHES_TEGELIJK).map(async (batch) => {
        try {
          return await deelFeitenIn({ feiten: batch.map((r) => ({ id: r.id, text: r.bewering })), profileId });
        } catch (err) {
          console.warn(`Kennis indelen mislukt voor merk ${profileId}: ${String(err)}`);
          uitkomst.mislukt += batch.length;
          return [];
        }
      }),
    );
    for (const ind of uitslagen.flat()) {
      const r = await deelIn(
        admin,
        { profileId, itemId: ind.id, indeling: indelingVoorKennis(ind, aanbod) },
        { actor: "model", taak: INDEEL_TAAK },
      );
      if (r.ok) uitkomst.ingedeeld++;
      else {
        uitkomst.mislukt++;
        console.warn(`Kennisitem ${ind.id} indelen mislukt: ${r.fout}`);
      }
    }
  }
  console.info(`Kennislaag indeling voor merk ${profileId}: ${uitkomst.ingedeeld} ingedeeld, ${uitkomst.mislukt} mislukt.`);
  return uitkomst;
}
