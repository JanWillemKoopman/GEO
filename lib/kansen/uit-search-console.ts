import "server-only";

/**
 * N3: SEARCH CONSOLE ALS KANSBRON, DE SCHRIJFKANT
 * (`docs/tasks/van-pijplijn-naar-kennissysteem.md`).
 *
 * De regels staan puur in `zoekverkeer.ts`; hier alleen het ophalen en
 * wegschrijven. Draait na elke `gsc_sync`-taak (`lib/jobs/handlers.ts`), voor
 * het merk waarvan de cijfers net ververst zijn. Idempotent op
 * `kans_bewijs (kans_id, bron)` (conventie 9): elke aanroep overschrijft het
 * search_console-bewijs van een kans met de nieuwste telling, nooit een
 * tweede rij.
 *
 * Schrijft binnen `lib/kansen/`, zoals `uit-rapport.ts` en `handmatig.ts` al
 * deden: de bewakingstest "kansen: één schrijfingang" (N2, `test-unit.ts`)
 * geldt voor de hele map, niet voor één bestand.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { alleRijen } from "@/lib/supabase/pagineer";
import {
  vergelijkingsvenster,
  inVenster,
  VERGELIJKINGSVENSTER_DAGEN,
  type GscDag,
} from "@/lib/search-console/metrics";
import { matchendeZoekopdrachten, zoekverkeerBewijsVan, type ZoekopdrachtRij } from "@/lib/kansen/zoekverkeer";
import { uitlegVan, type KansBewijs, type KansBron, type KansHandeling } from "@/lib/kansen/prioriteit";

export interface ZoekverkeerTelling {
  bijgewerkt: number;
  mislukt: number;
}

/**
 * Voegt Search Console-bewijs toe aan de bestaande kansen van dit merk.
 *
 * **Alleen bestaande kansen**, geen nieuwe uit kale zoektermen (zie de
 * toelichting bovenaan `zoekverkeer.ts` voor waarom). Een kans zonder dienst
 * of werkgebied in `geldt_voor` (bijvoorbeeld een handmatige kans zonder
 * koppeling) krijgt geen bewijs: er is dan niets om een zoekopdracht aan te
 * herkennen.
 *
 * Gooit nooit: dit draait na de echte synchronisatie, en een mislukte
 * bijwerking van het bewijs mag die niet met terugwerkende kracht laten
 * mislukken (dezelfde regel als `legKansenVast()`).
 */
export async function legZoekverkeerBewijsVast(
  admin: SupabaseClient,
  profileId: string,
): Promise<ZoekverkeerTelling> {
  const telling: ZoekverkeerTelling = { bijgewerkt: 0, mislukt: 0 };
  try {
    const { data: profielRij } = await admin
      .from("profiles")
      .select("gsc_verified_at")
      .eq("id", profileId)
      .maybeSingle();
    if (!(profielRij as { gsc_verified_at: string | null } | null)?.gsc_verified_at) return telling;

    const { data: kansenRows } = await admin
      .from("kansen")
      .select("id, handeling, geldt_voor")
      .eq("profile_id", profileId)
      .neq("status", "vervallen");
    const kansen = (kansenRows ?? []) as { id: string; handeling: string; geldt_voor: string[] | null }[];
    if (kansen.length === 0) return telling;

    const kennisIds = [...new Set(kansen.flatMap((k) => k.geldt_voor ?? []))];
    if (kennisIds.length === 0) return telling;
    const { data: kennisRows } = await admin.from("klantkennis").select("id, bewering").in("id", kennisIds);
    const beweringVan = new Map(
      ((kennisRows ?? []) as { id: string; bewering: string }[]).map((k) => [k.id, k.bewering]),
    );

    const queryRows = await alleRijen<ZoekopdrachtRij & { day: string; page: string }>((van, tot) =>
      admin
        .from("search_console_queries")
        .select("day, page, query, clicks, impressions, position")
        .eq("profile_id", profileId)
        .order("day")
        .range(van, tot),
    );
    if (queryRows.length === 0) return telling;

    // `vergelijkingsvenster()` verwacht `GscDag[]`; een zoekopdrachtrij heeft
    // dezelfde velden (day, page, clicks, impressions, position) plus `query`,
    // en voldoet dus aan dezelfde vorm.
    const venster = vergelijkingsvenster(queryRows as unknown as GscDag[]);
    if (!venster) return telling;
    const inVensterRijen = queryRows.filter((r) => inVenster(r.day, venster));
    if (inVensterRijen.length === 0) return telling;

    for (const kans of kansen) {
      const kennistermen = (kans.geldt_voor ?? [])
        .map((id) => beweringVan.get(id))
        .filter((x): x is string => !!x);
      if (kennistermen.length === 0) continue;

      const matches = matchendeZoekopdrachten(inVensterRijen, kennistermen);
      const bewijs = zoekverkeerBewijsVan(matches, VERGELIJKINGSVENSTER_DAGEN);
      if (!bewijs) continue;

      const { error: bewijsFout } = await admin.from("kans_bewijs").upsert(
        {
          kans_id: kans.id,
          profile_id: profileId,
          bron: "search_console",
          vertoningen: bewijs.vertoningen,
          klikken: bewijs.klikken,
          positie: bewijs.positie,
          periode_dagen: bewijs.periodeDagen,
          zoekopdrachten: bewijs.zoekopdrachten,
          gemeten_op: new Date().toISOString(),
          ruw: { venster } as never,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "kans_id,bron" },
      );
      if (bewijsFout) {
        telling.mislukt++;
        console.error(`Search Console-bewijs van kans ${kans.id} vastleggen mislukt: ${bewijsFout.message}`);
        continue;
      }

      // De uitleg rekent over AL het bewijs van de kans, niet alleen dit
      // nieuwe: `uitlegVan()` moet ook weten wat ChatGPT, AI Overview of de
      // consultant al zeiden (dezelfde reden als bij `teVerversen` in
      // `uit-rapport.ts`).
      const { data: alleBewijsRows } = await admin
        .from("kans_bewijs")
        .select(
          "bron, vragen_gemeten, vragen_genoemd, concurrenten, eigen_site_geciteerd, vertoningen, klikken, positie, periode_dagen, toelichting",
        )
        .eq("kans_id", kans.id);
      const alleBewijs: KansBewijs[] = ((alleBewijsRows ?? []) as Record<string, unknown>[]).map((b) => ({
        bron: b.bron as KansBron,
        vragenGemeten: b.vragen_gemeten as number | null,
        vragenGenoemd: b.vragen_genoemd as number | null,
        concurrenten: b.concurrenten as string[] | null,
        eigenSiteGeciteerd: b.eigen_site_geciteerd as boolean | null,
        vertoningen: b.vertoningen as number | null,
        klikken: b.klikken as number | null,
        positie: b.positie as number | null,
        periodeDagen: b.periode_dagen as number | null,
        toelichting: b.toelichting as string | null,
      }));

      const { error: kansFout } = await admin
        .from("kansen")
        .update({
          uitleg: uitlegVan({ handeling: kans.handeling as KansHandeling, bewijs: alleBewijs }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", kans.id);
      if (kansFout) {
        telling.mislukt++;
        console.error(`Uitleg van kans ${kans.id} bijwerken mislukt na Search Console-bewijs: ${kansFout.message}`);
        continue;
      }
      telling.bijgewerkt++;
    }

    if (telling.bijgewerkt > 0 || telling.mislukt > 0) {
      console.log(
        `Search Console-bewijs voor merk ${profileId}: ${telling.bijgewerkt} kansen bijgewerkt, ${telling.mislukt} mislukt.`,
      );
    }
  } catch (err) {
    telling.mislukt++;
    console.error(`Search Console-bewijs vastleggen mislukt voor merk ${profileId}:`, err);
  }
  return telling;
}
