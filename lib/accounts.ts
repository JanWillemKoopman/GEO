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
 *   3. of je bent beheerder van Aura                    (`isStaff`)
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
