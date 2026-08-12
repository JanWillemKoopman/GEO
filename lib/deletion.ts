import "server-only";

/**
 * Een klant volledig verwijderen (F4 / P5 uit `docs/tasks/lanceerplan.md`).
 *
 * De regels, de teksten en de bevestiging staan in `lib/deletion-rules.ts`,
 * want dat bepaalt de uitkomst en hoort puur en testbaar te zijn (conventie 2).
 * Hier staat het tellen en het daadwerkelijke weghalen.
 *
 * ── DE VOLGORDE, EN WAAROM HIJ NIET VRIJ IS ─────────────────────────────────
 *
 * Bijna alles hangt met `on delete cascade` aan `profiles`, dus één merk
 * verwijderen neemt zijn analyses, vragen, metingen, content, plannen en taken
 * vanzelf mee. Eén verband is bewust GEEN cascade: `profiles.account_id` staat
 * op `no action`. Daardoor weigert de database een account te verwijderen zolang
 * er nog merken aan hangen, en dat is precies goed: het maakt "per ongeluk een
 * account weggooien" onmogelijk in plaats van stil.
 *
 * De volgorde is dus: eerst de merken, dan het account, dan de inlogaccounts van
 * de mensen die daarna nergens meer bij horen.
 *
 * ── WAT ER OOK WEGGAAT, EN WAAROM DAT MAG ───────────────────────────────────
 *
 * Het kostenlogboek van deze klant (`ai_calls`) verdwijnt mee, want het hangt aan
 * het merk. Dat is een bewuste keuze: de financiële waarheid is de factuur van
 * OpenAI en die staat bij OpenAI, niet hier. Per-klant-kosten van een klant die
 * niet meer bestaat, zijn geen boekhouding maar een restant.
 *
 * ⚠️ Eén klein neveneffect: het dagplafond (`lib/spend-limit.ts`) telt de
 * uitgaven van vandaag over alle accounts. Verwijder je vandaag een klant, dan
 * daalt die teller en staat de dagrem iets ruimer. Verwaarloosbaar in bedrag, en
 * het alternatief (het logboek anonimiseren in plaats van verwijderen) maakt een
 * onomkeerbare handeling ingewikkelder. Ingewikkeld en onomkeerbaar is een
 * slechte combinatie.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { deletionLines, type DeletionCounts, type DeletionPlan } from "@/lib/deletion-rules";

type Admin = ReturnType<typeof createAdminClient>;

async function telling(admin: Admin, tabel: string, kolom: string, waarden: string[]): Promise<number> {
  if (waarden.length === 0) return 0;
  const { count } = await admin
    .from(tabel)
    .select("id", { count: "exact", head: true })
    .in(kolom, waarden);
  return count ?? 0;
}

/**
 * Wat verdwijnt er als je dit account verwijdert?
 *
 * Draait vóór de bevestiging en verandert niets. De aantallen zijn het verschil
 * tussen "verwijder een account" en "verwijder 3 merken, 5 analyses en 412
 * metingen", en dat is een ander besluit.
 */
export async function deletionPlan(accountId: string): Promise<DeletionPlan | null> {
  const admin = createAdminClient();

  const { data: account } = await admin
    .from("accounts")
    .select("id, name")
    .eq("id", accountId)
    .maybeSingle();
  if (!account) return null;

  const { data: profielen } = await admin
    .from("profiles")
    .select("id")
    .eq("account_id", accountId);
  const profileIds = (profielen ?? []).map((p) => p.id as string);

  const { data: analyseRijen } = profileIds.length
    ? await admin.from("analyses").select("id").in("profile_id", profileIds)
    : { data: [] };
  const analysisIds = (analyseRijen ?? []).map((a) => a.id as string);

  const [metingen, paginas, gebruikers] = await Promise.all([
    telling(admin, "tracking_runs", "analysis_id", analysisIds),
    telling(admin, "content_pieces", "analysis_id", analysisIds),
    telling(admin, "account_users", "account_id", [accountId]),
  ]);

  const counts: DeletionCounts = {
    merken: profileIds.length,
    analyses: analysisIds.length,
    metingen,
    paginas,
    gebruikers,
  };

  return {
    accountName: (account.name as string) ?? "",
    counts,
    regels: deletionLines(counts),
    blokkade: null,
  };
}

/**
 * De momentopnamen die migratie 0025 achterliet, voor dít account.
 *
 * `_backup_20260729` bewaart per gewijzigde rij een kopie met alleen
 * `source_table` en `source_id`, zonder verwijzing naar het merk. Er is dus geen
 * cascade en geen join: we moeten eerst opzoeken welke id's van deze klant zijn
 * en die daarna wegstrepen.
 *
 * Best-effort, met opzet. Bestaat de tabel niet (een verse database, of de tabel
 * is ooit opgeruimd), dan mag dat de verwijdering niet tegenhouden: het echte
 * werk, de merken en het account, is belangrijker dan een restant van een
 * opschoning uit juli. Wel luid loggen, want stil overslaan is precies de fout
 * die deze functie hoort te repareren.
 */
async function verwijderMomentopnamen(admin: Admin, accountId: string): Promise<void> {
  try {
    const { data: profielen } = await admin
      .from("profiles")
      .select("id")
      .eq("account_id", accountId);
    const profileIds = (profielen ?? []).map((p) => p.id as string);
    if (profileIds.length === 0) return;

    const { data: analyses } = await admin
      .from("analyses")
      .select("id")
      .in("profile_id", profileIds);
    const analysisIds = (analyses ?? []).map((a) => a.id as string);

    // Elke tabel die in 0025 een kopie kreeg, met de weg waarlangs hij aan dit
    // account hangt. `entities` hangt aan het merk, de rest aan de analyse.
    const bronnen: { tabel: string; kolom: string; ids: string[] }[] = [
      { tabel: "entities", kolom: "profile_id", ids: profileIds },
      { tabel: "prompts", kolom: "analysis_id", ids: analysisIds },
      { tabel: "content_pieces", kolom: "analysis_id", ids: analysisIds },
      { tabel: "reports", kolom: "analysis_id", ids: analysisIds },
      { tabel: "visibility_scores", kolom: "analysis_id", ids: analysisIds },
    ];

    for (const bron of bronnen) {
      if (bron.ids.length === 0) continue;
      const { data: rijen } = await admin
        .from(bron.tabel)
        .select("id")
        .in(bron.kolom, bron.ids);
      const rijIds = (rijen ?? []).map((r) => r.id as string);
      if (rijIds.length === 0) continue;

      await admin
        .from("_backup_20260729")
        .delete()
        .eq("source_table", bron.tabel)
        .in("source_id", rijIds);
    }
  } catch (err) {
    console.error(
      `Momentopnamen van account ${accountId} opruimen mislukt: ${String(err)}. ` +
        `De verwijdering gaat door, maar er kunnen kopieën in _backup_20260729 achterblijven.`,
    );
  }
}

export interface DeletionResult {
  merken: number;
  gebruikersVerwijderd: number;
}

/**
 * Verwijdert het account en alles wat eraan hangt.
 *
 * ⚠️ Onomkeerbaar. De aanroeper heeft de bevestiging al gecontroleerd; deze
 * functie vraagt niets meer.
 *
 * Er is geen transactie omheen, en dat kan niet anders: de Supabase-client
 * praat over HTTP en kent er geen. Faalt hij halverwege, dan zijn de merken weg
 * en het account nog niet. Dat is een vervelende maar herstelbare toestand (het
 * account is dan leeg en opnieuw te verwijderen), en het omgekeerde zou erger
 * zijn: een verwijderd account met merken die nergens meer bij horen. Vandaar
 * deze volgorde, die ook de database zelf afdwingt.
 */
export async function deleteAccount(accountId: string): Promise<DeletionResult> {
  const admin = createAdminClient();

  // 1. Wie zitten erin, en bij welke andere accounts horen ze nog meer? Dit
  //    moet vóór het verwijderen, want daarna is de koppeling weg.
  const { data: leden } = await admin
    .from("account_users")
    .select("user_id")
    .eq("account_id", accountId);
  const userIds = Array.from(new Set((leden ?? []).map((l) => l.user_id as string)));

  const { data: elders } = userIds.length
    ? await admin
        .from("account_users")
        .select("user_id, account_id")
        .in("user_id", userIds)
    : { data: [] };
  const nogElders = new Set(
    (elders ?? [])
      .filter((r) => (r.account_id as string) !== accountId)
      .map((r) => r.user_id as string),
  );

  // Een beheerder van Aura raakt zijn inlog nooit kwijt, ook niet als hij
  // toevallig lid was van dit account. Zonder deze regel kan het opruimen van
  // een testklant de eigenaar buitensluiten.
  const { data: staf } = await admin.from("staff_users").select("user_id");
  const stafIds = new Set((staf ?? []).map((s) => s.user_id as string));

  // 2. De momentopnamen uit `_backup_20260729`, VÓÓR de merken.
  //
  // ⚠️ Gevonden op 12 augustus 2026, nadat deze functie al "af" heette. Migratie
  // 0025 maakte bij een dataopschoning van elke aangeraakte rij een kopie in een
  // aparte tabel: 51 momentopnamen van vragen, entiteiten, geschreven pagina's,
  // rapporten en scores. Die tabel heeft géén verwijzing naar `profiles`, dus de
  // cascade raakt hem niet en "volledig verwijderd" was niet volledig. Precies
  // het soort restant waar de AVG over gaat: de klant is weg uit elk scherm en
  // zijn teksten staan er nog.
  //
  // Het moet vóór stap 3, want daarna zijn de id's waarop we moeten matchen zelf
  // verdwenen en is er niets meer om op te zoeken.
  await verwijderMomentopnamen(admin, accountId);

  // 3. De merken. Neemt via cascade analyses, vragen, metingen, content,
  //    plannen, taken en het kostenlogboek mee.
  const { data: profielen } = await admin
    .from("profiles")
    .select("id")
    .eq("account_id", accountId);
  const profileIds = (profielen ?? []).map((p) => p.id as string);
  if (profileIds.length > 0) {
    const { error } = await admin.from("profiles").delete().in("id", profileIds);
    if (error) throw new Error(`Merken verwijderen mislukt: ${error.message}`);
  }

  // 4. Het account. Neemt de leden en de uitnodigingen mee (cascade).
  const { error: accountError } = await admin.from("accounts").delete().eq("id", accountId);
  if (accountError) throw new Error(`Account verwijderen mislukt: ${accountError.message}`);

  // 5. De inlogaccounts van wie hierna nergens meer bij hoort. Dat is de kern
  //    van de AVG-plicht: het merkdossier weghalen maar de inlog laten staan is
  //    geen verwijdering.
  let verwijderd = 0;
  for (const userId of userIds) {
    if (nogElders.has(userId) || stafIds.has(userId)) continue;
    const { error } = await admin.auth.admin.deleteUser(userId);
    // Faalt er één, dan gaat de rest gewoon door: het account en de dossiers
    // zijn al weg, en een blijvende inlog zonder toegang is minder erg dan een
    // half afgemaakte verwijdering die niemand meer kan afronden.
    if (error) {
      console.error(`Inlogaccount ${userId} verwijderen mislukt:`, error.message);
      continue;
    }
    verwijderd++;
  }

  return { merken: profileIds.length, gebruikersVerwijderd: verwijderd };
}
