import "server-only";

/**
 * DE TWEEDE ECHTE ABONNEE (G4 van `docs/tasks/van-pijplijn-naar-kennissysteem.md`).
 *
 * Houdt bij welke profielvelden een mens zette sinds de laatste volledige
 * onderzoeksronde (`profiles.velden_te_verversen`, migratie 0127). Vervangt de
 * live vergelijking die de bijwerkroute en het onboardingscherm allebei apart
 * deden tegen `profile_field_sources` en `deep_research_at`. De REGELS blijven
 * ongewijzigd in `lib/pipeline/onboarding-refresh.ts` (`planRefresh()`, puur en
 * getest); deze abonnee levert alleen de invoer daarvoor, ruim vóór de
 * consultant op de knop drukt. `profile_field_sources` blijft daarnaast
 * bestaan: die tabel beschermt ook los hiervan een door een mens gezet veld
 * tegen een volgende onderzoeksronde (`lib/pipeline/field-merge.ts`).
 *
 * Registreert zichzelf bij import, zoals `kennis-wijziging-impact.ts`.
 */
import { registreer } from "@/lib/gebeurtenissen/register";
import type { Abonnee } from "@/lib/gebeurtenissen/types";

export const NAAM = "onderzoek_refresh";

export const onderzoekRefresh: Abonnee = {
  naam: NAAM,
  soorten: ["kennis_gewijzigd"],
  verwerk: async (admin, gebeurtenis) => {
    if (gebeurtenis.objectTabel !== "profiles") return;
    const velden = (gebeurtenis.payload?.velden as string[] | undefined) ?? [];
    if (velden.length === 0) return;

    const { data } = await admin
      .from("profiles")
      .select("velden_te_verversen")
      .eq("id", gebeurtenis.objectId)
      .maybeSingle();
    const al = (data as { velden_te_verversen: string[] | null } | null)?.velden_te_verversen ?? [];
    const nieuw = [...new Set([...al, ...velden])];
    if (nieuw.length === al.length && nieuw.every((v) => al.includes(v))) return; // niets nieuws

    const { error } = await admin
      .from("profiles")
      .update({ velden_te_verversen: nieuw })
      .eq("id", gebeurtenis.objectId);
    if (error) console.warn(`Bijhouden welke velden te verversen zijn mislukt voor merk ${gebeurtenis.objectId}:`, error.message);
  },
};

registreer(onderzoekRefresh);
