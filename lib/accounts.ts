import "server-only";

/**
 * Het account: de laag boven het merk (migratie 0046).
 *
 * ── WAAROM DEZE LAAG BESTAAT ────────────────────────────────────────────────
 *
 * `profiles` was de klant én de website tegelijk. Dat hield op te kloppen bij
 * drie besluiten van 10 augustus 2026 (`docs/Nova.md` §0): een klant kan een
 * marketingbureau zijn met meerdere klanten (besluit 9), een klant kan meerdere
 * websites hebben (besluit 10), en er komen er ongeveer twintig in het eerste
 * jaar (besluit 11).
 *
 * Een merk blijft een `profile`. Wat erbij komt is het account eromheen, en de
 * koppeltabel `account_users` die één gebruiker bij meerdere accounts laat
 * horen. Dát is wat een bureau mogelijk maakt.
 *
 * ── DE TOEGANGSREGEL IS DRIELAAGS ───────────────────────────────────────────
 *
 *   1. je zit in het account waar het merk aan hangt   (de hoofdregel)
 *   2. of je bent de historische eigenaar               (`profiles.user_id`)
 *   3. of je bent beheerder van ORBIT ENGINE                    (`isStaff`)
 *
 * Regel 2 blijft bewust bestaan zolang niet op productie is nageteld dat élk
 * merk een account heeft. Zie de toelichting bovenaan migratie 0046.
 */
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Account, AccountRole } from "@/lib/types/database";

export interface Membership {
  accountId: string;
  role: AccountRole;
}

/**
 * Bij welke accounts hoort deze gebruiker, en met welke rol?
 *
 * Gememoïseerd per request, net als `isStaff`: de shell leest dit voor de
 * merkkiezer en elke ownership-check leest het nog een keer.
 *
 * Faalt zacht naar een lege lijst. Een storing hier mag nooit toegang géven;
 * de veilige kant is "hoort nergens bij", en dan valt de controle terug op
 * laag 2 en 3.
 */
export const membershipsOf = cache(async (userId: string): Promise<Membership[]> => {
  if (!userId) return [];
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("account_users")
      .select("account_id, role")
      .eq("user_id", userId);
    if (error) {
      console.error("Accountlidmaatschap ophalen mislukt:", error.message);
      return [];
    }
    return (data ?? []).map((r) => ({
      accountId: r.account_id as string,
      role: r.role as AccountRole,
    }));
  } catch (err) {
    console.error("Accountlidmaatschap ophalen mislukt:", err);
    return [];
  }
});

/** Alleen de id's. Het vaakst gebruikte antwoord, dus als eigen functie. */
export async function accountIdsOf(userId: string): Promise<string[]> {
  return (await membershipsOf(userId)).map((m) => m.accountId);
}

/**
 * Hoort deze gebruiker bij dit account?
 *
 * `null` als `accountId` leeg is: een merk zonder account (kan bestaan zolang
 * laag 2 nog meedoet) mag hier nooit "ja" opleveren. Onbekend is geen toegang.
 */
export async function isMember(userId: string, accountId: string | null): Promise<boolean> {
  if (!accountId) return false;
  return (await accountIdsOf(userId)).includes(accountId);
}

/** De accounts zelf, voor de kiezer in de shell. Opgezegde accounts blijven zichtbaar. */
export const accountsOf = cache(async (userId: string): Promise<Account[]> => {
  const ids = await accountIdsOf(userId);
  if (ids.length === 0) return [];
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("accounts")
    .select("*")
    .in("id", ids)
    .order("name");
  if (error) {
    console.error("Accounts ophalen mislukt:", error.message);
    return [];
  }
  return (data ?? []) as Account[];
});

/**
 * Het account waar een nieuw merk aan gehangen wordt.
 *
 * ── DE FOUT DIE DIT REPAREERT ───────────────────────────────────────────────
 *
 * ⚠️ Gevonden op 11 augustus 2026, bij het nalopen van elke schrijfroute vóór de
 * eerste echte klant. Migratie 0046 vulde `account_id` met terugwerkende kracht
 * voor élk bestaand merk, maar de route die NIEUWE merken aanmaakt zette hem
 * niet. Elk merk dat vanaf dat moment via de app werd aangemaakt kwam dus zonder
 * account binnen, en dat is geen cosmetisch gemis:
 *
 *   • het contentplan vindt geen pakket, want de quota hangt aan het account,
 *     en zegt dan eeuwig "er is nog geen pakket gekozen";
 *   • een uitgenodigde klant ziet het merk niet, want dat loopt over laag 1;
 *   • het CSM-paneel toont het merk zonder klantnaam.
 *
 * Precies het scenario van de eerste echte onboarding, want dat begint met een
 * nieuw merk aanmaken.
 *
 * ── DE REGEL, DEZELFDE ALS DIE VAN DE BACKFILL ──────────────────────────────
 *
 * Hoort de gebruiker al bij een account, dan dat account. Hoort hij bij meerdere
 * (een bureau, besluit 9), dan het oudste: dat is zijn eigen account, want de
 * backfill maakte dat als eerste en een bureau komt er later bij. Hoort hij
 * nergens bij, dan wordt er één gemaakt op zijn e-mailadres, precies zoals
 * migratie 0046 het deed.
 *
 * Faalt zacht naar `null`: een merk zonder account is onvolledig maar bruikbaar
 * (laag 2 vangt het op), en een mislukte accountaanmaak mag nooit het aanmaken
 * van het merk zelf blokkeren.
 */
export async function defaultAccountFor(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient();

    const bestaande = await accountsOf(userId);
    if (bestaande.length > 0) {
      // Oudste eerst: `accountsOf` sorteert niet, dus hier expliciet.
      const oudste = [...bestaande].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
      return oudste.id;
    }

    const { data: gebruiker } = await admin.auth.admin.getUserById(userId);
    const naam = gebruiker?.user?.email ?? "Account";

    const { data: nieuw, error } = await admin
      .from("accounts")
      .insert({ name: naam })
      .select("id")
      .single();
    if (error || !nieuw) {
      console.error("Account aanmaken mislukt:", error?.message);
      return null;
    }

    // De eerste gebruiker van een account is beheerder ervan. Dat is iets anders
    // dan `staff_users`: dat gaat over ORBIT ENGINE, dit over de klant.
    await admin
      .from("account_users")
      .upsert(
        { account_id: nieuw.id as string, user_id: userId, role: "admin" },
        { onConflict: "account_id,user_id" },
      );

    return nieuw.id as string;
  } catch (err) {
    console.error("Standaardaccount bepalen mislukt:", err);
    return null;
  }
}
