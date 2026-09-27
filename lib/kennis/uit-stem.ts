import "server-only";

/**
 * DE TEKST VAN DE STEMVOORBEELDEN IN DE KENNISLAAG (K8 van
 * `docs/tasks/van-pijplijn-naar-kennissysteem.md`).
 *
 * Apart van `uit-gesprek.ts`, omdat hier de code vastlegt en niet een mens: de
 * mens geeft alleen het adres, de code haalt de tekst op, en die tekst is een
 * waarneming van de site. Alleen afwijzen (een adres dat de mens weghaalde) en
 * een eerder afgewezen adres terugzetten doet de mens. Gooit nooit een fout,
 * net als `uit-gesprek.ts`: het opslaan is dan al gelukt.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { legVast, vervang, wijsAf, type Door } from "@/lib/kennis/vastleggen";
import { kennisUitStemvoorbeelden, stemPlan } from "@/lib/kennis/gesprek";
import { alsNieuw, log, nieuweTelling, type GesprekTelling, type Mens } from "@/lib/kennis/uit-gesprek";
import { schrijfProfiel } from "@/lib/kennis/profielkopie";
import type { StemVoorbeeld } from "@/lib/types/database";

/** De taak die de tekst van een stemvoorbeeld ophaalt; de code, geen model. */
export const STEM_TAAK = "stemvoorbeelden";

/**
 * De opgehaalde tekst van de stemvoorbeelden in de kennislaag. Tot K8 kwam die
 * tekst alleen op `profiles.stem_voorbeelden`; het terugvullen (K3) nam hem één
 * keer mee, en daarna bleef een nieuw of gewijzigd voorbeeld buiten de
 * kennislaag.
 *
 * De tekst is letterlijk van het adres (waargenomen), vastgelegd door de code
 * die hem ophaalde. Een adres dat de mens weghaalde, wijst diezelfde mens af;
 * zet hij het later terug, dan komt het met hem als wie terug.
 */
export async function legStemVast(
  admin: SupabaseClient,
  args: {
    profileId: string;
    url: string;
    /** Wat het ophalen opleverde. */
    voorbeelden: readonly StemVoorbeeld[];
    /** De adressen zoals de mens ze opsloeg. */
    gekozen: readonly string[];
  },
  door: Mens,
): Promise<GesprekTelling & { bewaard: boolean }> {
  const telling = nieuweTelling();
  const redenen: string[] = [];
  const code: Door = { actor: "code", taak: STEM_TAAK };

  // Alleen bewaren als de adressen nog dezelfde zijn. Twee keer kort na elkaar
  // opslaan (elk adresveld bewaart bij het verlaten) start twee ophaalrondes;
  // zonder deze controle overschrijft de trage eerste ronde met één adres het
  // resultaat van de tweede met twee. De latere opslag doet dan dit werk.
  const { data: profiel } = await admin.from("profiles").select("stem_voorbeelden").eq("id", args.profileId).maybeSingle();
  const huidig = (((profiel as { stem_voorbeelden?: { url: string }[] | null } | null)?.stem_voorbeelden ?? []) as { url: string }[])
    .map((v) => v.url)
    .join("|");
  if (huidig !== args.gekozen.join("|")) return { ...telling, bewaard: false };
  // De kopie op het profiel (K8 deel 3): de tekst die de schrijver als stem krijgt.
  if (args.voorbeelden.length > 0) {
    const { error } = await schrijfProfiel(admin, args.profileId, { stem_voorbeelden: args.voorbeelden });
    if (error) {
      log(args.profileId, "stemvoorbeelden", { ...telling, geweigerd: 1 }, [error]);
      return { ...telling, geweigerd: 1, bewaard: false };
    }
  }
  try {
    const { data } = await admin
      .from("klantkennis")
      .select("id, bron_url, bewering")
      .eq("profile_id", args.profileId)
      .eq("domein", "stem")
      .eq("soort", "stemvoorbeeld")
      .is("vervangen_door", null)
      .is("afgewezen_op", null);
    const bestaand = (data ?? []) as { id: string; bron_url: string | null; bewering: string }[];
    const opgehaald = kennisUitStemvoorbeelden({ id: args.profileId, url: args.url }, args.voorbeelden);
    const plan = stemPlan(bestaand, opgehaald, args.gekozen);

    for (const item of plan.nieuw) {
      const uitkomst = await legVast(admin, alsNieuw(args.profileId, item), code);
      if (uitkomst.soort === "vastgelegd") telling.vastgelegd++;
      else if (uitkomst.soort === "bestond") telling.ongewijzigd++;
      else if (uitkomst.soort === "geweigerd") {
        telling.geweigerd++;
        redenen.push(`${item.ref}: ${uitkomst.fouten.join(" ")}`);
      } else {
        const terug = await vervang(admin, { profileId: args.profileId, oudId: uitkomst.item.id, nieuw: alsNieuw(args.profileId, item) }, door);
        if (terug.ok) telling.vervangen++;
        else {
          telling.geweigerd++;
          redenen.push(`${item.ref}: ${terug.fout}`);
        }
      }
    }
    for (const { oudId, item } of plan.vervangen) {
      const uitkomst = await vervang(admin, { profileId: args.profileId, oudId, nieuw: alsNieuw(args.profileId, item) }, code);
      if (uitkomst.ok) telling.vervangen++;
      else {
        telling.geweigerd++;
        redenen.push(`${item.ref}: ${uitkomst.fout}`);
      }
    }
    for (const itemId of plan.afwijzen) {
      const uitkomst = await wijsAf(admin, { profileId: args.profileId, itemId }, door);
      if (uitkomst.ok) telling.afgewezen++;
      else {
        telling.geweigerd++;
        redenen.push(`${itemId}: ${uitkomst.fout}`);
      }
    }
  } catch (err) {
    telling.geweigerd++;
    redenen.push(err instanceof Error ? err.message : String(err));
  }
  log(args.profileId, "stemvoorbeelden", telling, redenen);
  return { ...telling, bewaard: true };
}
