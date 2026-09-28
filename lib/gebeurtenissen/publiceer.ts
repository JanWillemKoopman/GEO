import "server-only";

/**
 * `publiceer()`: de enige manier om een gebeurtenis vast te leggen (G1, §6.5).
 *
 * Legt de gebeurtenis vast en zet voor elke abonnee die op deze soort reageert
 * één taak in de bestaande wachtrij, met een dedupe-sleutel per gebeurtenis en
 * per abonnee. Geen enkele abonnee reageert nu al (het register is leeg tot G3
 * en G4), dus vandaag legt dit alleen het logboek vast.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { abonneesVoor, ALLE_ABONNEES } from "@/lib/gebeurtenissen/register";
import type { Abonnee, NieuweGebeurtenis } from "@/lib/gebeurtenissen/types";

type Admin = SupabaseClient;

export async function publiceer(
  admin: Admin,
  gebeurtenis: NieuweGebeurtenis,
  abonnees: readonly Abonnee[] = ALLE_ABONNEES,
): Promise<string> {
  const { data, error } = await admin
    .from("gebeurtenissen")
    .insert({
      profile_id: gebeurtenis.profileId,
      soort: gebeurtenis.soort,
      object_tabel: gebeurtenis.objectTabel,
      object_id: gebeurtenis.objectId,
      payload: gebeurtenis.payload ?? null,
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`Gebeurtenis publiceren mislukte: ${error?.message ?? "onbekende fout"}`);
  }
  const gebeurtenisId = data.id as string;

  for (const abonnee of abonneesVoor(gebeurtenis.soort, abonnees)) {
    await enqueue(admin, {
      type: "gebeurtenis_verwerken",
      payload: { gebeurtenisId, abonnee: abonnee.naam },
      profileId: gebeurtenis.profileId,
      dedupeKey: dedupe.gebeurtenisVerwerken(gebeurtenisId, abonnee.naam),
    });
  }

  return gebeurtenisId;
}
