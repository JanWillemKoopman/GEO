import "server-only";

/**
 * `verwerkGebeurtenis()`: het vangnet dat een abonnee een gebeurtenis precies
 * één keer laat verwerken (G1).
 *
 * ── WAAROM DIT VANGNET IN CODE STAAT EN NIET BIJ ELKE ABONNEE APART ──────────
 *
 * De wachtrij dedupliceert al OP TAAK-NIVEAU (`dedupe.gebeurtenisVerwerken`),
 * maar dat voorkomt alleen dat dezelfde taak twee keer wordt INGEPLAND. Een
 * mislukte poging die opnieuw wordt geprobeerd, of een taak die vastliep en
 * teruggevorderd wordt (`reclaim_stuck_jobs`, `lib/jobs/worker.ts`), roept
 * dezelfde taak wél twee keer aan. Conventie 9 zegt dat elke stap zijn resultaat
 * controleert vóór het werk; hier staat die controle één keer, generiek, zodat
 * een toekomstige abonnee (G3, G4) er niet zelf aan hoeft te denken.
 *
 * De rij in `gebeurtenis_verwerkingen` wordt pas na een GELUKTE `verwerk()`
 * geschreven: gooit de abonnee een fout, dan blijft er geen rij staan en pakt de
 * wachtrij het gewoon opnieuw op (net als elke andere taak, `MAX_ATTEMPTS`).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { ALLE_ABONNEES } from "@/lib/gebeurtenissen/register";
import type { Abonnee, Gebeurtenis, GebeurtenisSoort } from "@/lib/gebeurtenissen/types";

type Admin = SupabaseClient;

function naarGebeurtenis(rij: Record<string, unknown>): Gebeurtenis {
  return {
    id: rij.id as string,
    profileId: rij.profile_id as string,
    soort: rij.soort as GebeurtenisSoort,
    objectTabel: rij.object_tabel as string,
    objectId: rij.object_id as string,
    payload: (rij.payload as Record<string, unknown> | null) ?? null,
    aangemaaktOp: rij.aangemaakt_op as string,
  };
}

/** Postgres-foutcode voor een schending van een unieke index. */
const UNIQUE_VIOLATION = "23505";

export async function verwerkGebeurtenis(
  admin: Admin,
  gebeurtenisId: string,
  abonneeNaam: string,
  abonnees: readonly Abonnee[] = ALLE_ABONNEES,
): Promise<void> {
  const abonnee = abonnees.find((a) => a.naam === abonneeNaam);
  if (!abonnee) throw new Error(`Onbekende abonnee: ${abonneeNaam}`);

  const { data: al } = await admin
    .from("gebeurtenis_verwerkingen")
    .select("id")
    .eq("gebeurtenis_id", gebeurtenisId)
    .eq("abonnee", abonneeNaam)
    .maybeSingle();
  if (al) return; // Al verwerkt, ook als de werker dit een tweede keer probeert.

  const { data: rij, error } = await admin
    .from("gebeurtenissen")
    .select("*")
    .eq("id", gebeurtenisId)
    .single();
  if (error || !rij) throw new Error(`Gebeurtenis ${gebeurtenisId} niet gevonden: ${error?.message ?? ""}`);

  await abonnee.verwerk(admin, naarGebeurtenis(rij as Record<string, unknown>));

  const { error: markFout } = await admin
    .from("gebeurtenis_verwerkingen")
    .insert({ gebeurtenis_id: gebeurtenisId, abonnee: abonneeNaam });
  if (markFout && (markFout as { code?: string }).code !== UNIQUE_VIOLATION) {
    throw new Error(`Verwerking van gebeurtenis ${gebeurtenisId} niet kunnen afvinken: ${markFout.message}`);
  }
}
