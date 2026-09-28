import "server-only";

/**
 * DE HANDMATIGE KANS (N5 van `docs/tasks/van-pijplijn-naar-kennissysteem.md`,
 * besluit V2). De consultant zet een kans klaar die de meting niet vond: geen
 * gemeten cluster (`kansen.analysis_id` blijft NULL, migratie 0118), bron
 * `consultant`.
 *
 * ── DE SCHADUWANALYSE ────────────────────────────────────────────────────────
 *
 * `content_pieces.analysis_id` staat overal `not null` (migratie 0001): zonder
 * een analyse erachter kan deze kans nooit een pagina worden. Deze module maakt
 * daarom een minimale analyse aan, precies zoals `/api/profiles/[id]/topics`
 * dat voor een gewoon onderwerp doet (dezelfde `user_id`, dezelfde
 * `buildAnalysisName()`), en archiveert hem meteen: `activeOnly()` sluit een
 * gearchiveerde analyse uit, dus hij verschijnt niet tussen de echte clusters
 * op het clusterscherm. `clusterVan()` in `lib/pagina/start.ts` hoeft niet te
 * weten dat dit een schaduwanalyse is: hij leest toch al eerst
 * `planned_pages.source_analysis_id`, en die wijst hier gewoon naar toe.
 *
 * ── WAT HIER BEWUST NIET GEBEURT ─────────────────────────────────────────────
 *
 * Besluit V2 noemt "een eigen nulmeting op de opgegeven doelvragen": de
 * doelvragen worden hier wel als `prompts` vastgelegd, maar NIET gemeten. De
 * bestaande wachtrij (`enqueueMeasurement()`) eindigt namelijk in
 * `generateReport()` zodra de laatste vraag binnen is, en dat zou voor één
 * handmatige kans een tweede, overbodige aanbeveling en een dubbele kans
 * proberen aan te maken. Een eigen aftakking van die aggregatie is met opzet
 * buiten dit werkpakket gelaten (zie §13, N5, van het ontwikkelplan); de
 * vragen liggen wel al klaar voor de dag dat dat gebouwd wordt.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAnalysisName } from "@/lib/url";
import { naarActueleVersies } from "@/lib/kennis/versies";
import { commercieleWaardeVan } from "@/lib/kansen/rapport";
import { uitlegVan, type KansHandeling } from "@/lib/kansen/prioriteit";
import { legAfhankelijkhedenVast } from "@/lib/afhankelijkheden/vastleggen";

type Admin = SupabaseClient;

export interface HandmatigeKansInvoer {
  profileId: string;
  titel: string;
  lezer: string | null;
  handeling: KansHandeling;
  bestaandeUrl: string | null;
  /** Kennisitem-ids (dienst en/of werkgebied) waar deze kans voor geldt. Mag leeg zijn. */
  geldtVoor: readonly string[];
  /** Vragen die de consultant later wil laten meten. Leeg mag: dan is er nog geen nulmeting. */
  doelvragen: readonly string[];
  gebruikerId: string;
}

export type HandmatigeKansUitkomst = { ok: true; kansId: string } | { ok: false; probleem: string };

/**
 * Legt een handmatige kans vast: de kans zelf, het bewijs "je consultant zette
 * hem erbij", een schaduwanalyse met de opgegeven doelvragen als prompts, en de
 * voorraadkaart die er via de normale ketting (`lib/pagina/start.ts`) een
 * pagina van maakt.
 *
 * Geen ontdubbelsleutel (`kansen.sleutel` blijft leeg): elke inzending is een
 * bewuste, nieuwe kans, geen herhaalde verwerking van hetzelfde rapport zoals
 * bij N2.
 */
export async function voegHandmatigeKansToe(
  admin: Admin,
  invoer: HandmatigeKansInvoer,
): Promise<HandmatigeKansUitkomst> {
  const titel = invoer.titel.trim();
  if (!titel) return { ok: false, probleem: "Een titel is verplicht." };
  const bestaandeUrl = invoer.bestaandeUrl?.trim() || null;
  if (invoer.handeling === "pagina_verbeteren" && !bestaandeUrl) {
    return { ok: false, probleem: "Voor 'pagina verbeteren' is het bestaande adres verplicht." };
  }

  const { data: profielRow } = await admin
    .from("profiles")
    .select("user_id, url, priority_offerings, deprioritised_offerings")
    .eq("id", invoer.profileId)
    .maybeSingle();
  const profiel = profielRow as
    | { user_id: string; url: string; priority_offerings: string[] | null; deprioritised_offerings: string[] | null }
    | null;
  if (!profiel) return { ok: false, probleem: "Dit merk bestaat niet." };

  // Alleen ids die echt bij dit merk horen, en hun actuele versie (K2).
  const geldtVoor = await naarActueleVersies(admin, invoer.profileId, invoer.geldtVoor);
  const { data: kennisRows } = geldtVoor.length
    ? await admin.from("klantkennis").select("id, herkomst_tabel, herkomst_id").in("id", geldtVoor)
    : { data: [] as { herkomst_tabel: string | null; herkomst_id: string | null }[] };
  const dienstIds = ((kennisRows ?? []) as { herkomst_tabel: string | null; herkomst_id: string | null }[])
    .filter((k) => k.herkomst_tabel === "profile_offerings" && k.herkomst_id)
    .map((k) => k.herkomst_id as string);
  const commercieleWaarde = commercieleWaardeVan({
    diensten: dienstIds,
    voorrang: profiel.priority_offerings ?? [],
    minder: profiel.deprioritised_offerings ?? [],
  });

  const { data: analyseRow, error: analyseError } = await admin
    .from("analyses")
    .insert({
      // De eigenaar van het profiel, niet de ingelogde consultant (zelfde regel
      // als /api/profiles/[id]/topics): anders ziet de klant deze analyse nooit.
      user_id: profiel.user_id,
      profile_id: invoer.profileId,
      url: profiel.url,
      topic: titel,
      name: buildAnalysisName(profiel.url, titel),
      status: "gereed",
      archived_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (analyseError || !analyseRow) {
    return { ok: false, probleem: "Aanmaken is niet gelukt (analyse)." };
  }
  const analysisId = (analyseRow as { id: string }).id;

  const doelvragen = invoer.doelvragen.map((v) => v.trim()).filter(Boolean);
  if (doelvragen.length > 0) {
    const { error: promptError } = await admin.from("prompts").insert(
      doelvragen.map((text) => ({
        analysis_id: analysisId,
        text,
        category: "Koopvraag",
        created_by: "user" as const,
      })),
    );
    if (promptError) {
      console.error(`Doelvragen opslaan mislukt voor handmatige kans "${titel}":`, promptError.message);
    }
  }

  const uitleg = uitlegVan({ handeling: invoer.handeling, bewijs: [{ bron: "consultant" }] });

  const { data: kansRow, error: kansError } = await admin
    .from("kansen")
    .insert({
      profile_id: invoer.profileId,
      analysis_id: null, // besluit V2: een handmatige kans heeft geen gemeten cluster
      titel,
      lezer: invoer.lezer?.trim() || null,
      handeling: invoer.handeling,
      bestaande_url: invoer.handeling === "pagina_verbeteren" ? bestaandeUrl : null,
      geldt_voor: geldtVoor,
      commerciele_waarde: commercieleWaarde,
      status: "open",
      uitleg,
      vastgelegd_door: invoer.gebruikerId,
    })
    .select("id")
    .single();
  if (kansError || !kansRow) {
    return { ok: false, probleem: "Aanmaken is niet gelukt (kans)." };
  }
  const kansId = (kansRow as { id: string }).id;
  // G2: waar deze kans op leunt, voor "wat hangt er aan deze dienst".
  await legAfhankelijkhedenVast(admin, { profileId: invoer.profileId, vanTabel: "kansen", vanId: kansId, kennisIds: geldtVoor });

  const { error: bewijsError } = await admin
    .from("kans_bewijs")
    .insert({ kans_id: kansId, profile_id: invoer.profileId, bron: "consultant" });
  if (bewijsError) {
    console.error(`Bewijs opslaan mislukt voor handmatige kans "${titel}":`, bewijsError.message);
  }

  const { error: kaartError } = await admin.from("planned_pages").insert({
    profile_id: invoer.profileId,
    title: titel,
    source_analysis_id: analysisId,
    kans_id: kansId,
    target_intent: invoer.lezer?.trim() || null,
    recommendation_action: invoer.handeling === "pagina_verbeteren" ? "verbeteren" : "nieuw",
    existing_url: invoer.handeling === "pagina_verbeteren" ? bestaandeUrl : null,
    status: "gepland",
  });
  if (kaartError) {
    return { ok: false, probleem: "Aanmaken is niet gelukt (voorraadkaart)." };
  }

  return { ok: true, kansId };
}
