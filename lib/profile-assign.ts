import "server-only";

/**
 * Een profiel toewijzen aan een klant: aan een bestaande gebruiker, of aan een
 * gloednieuw account op een e-mailadres dat nog geen gebruiker heeft.
 *
 * ── WAAROM DIT EEN EIGEN MODULE IS ──────────────────────────────────────────
 *
 * `app/api/profiles/[id]/assign/route.ts` deed dit al voor een BESTAANDE
 * gebruiker, gekozen uit een lijst. Tot 28 september 2026 was er geen weg
 * naar een NIEUW klantaccount vanuit de app zelf: de comment bij die route
 * zei het met zoveel woorden, "Accounts aanmaken hoort hier NIET. Dat doet de
 * eigenaar in het Supabase-dashboard." Dat was een bewuste keuze (één minder
 * route, geen half aangemaakte gebruikers, geen mailbezorging die de verkoop
 * kan ophouden), maar de eigenaar wil dit nu gewoon in het scherm
 * `/merk/[id]/admin/toewijzen` kunnen doen: één e-mailadres intypen, klaar.
 *
 * De oplossing hergebruikt wat er al staat in plaats van een tweede
 * uitnodigingsmechanisme te bouwen: `createInvite()` en de acceptatieroute
 * (migratie 0047, `lib/invites.ts`) bestonden al voor `/instellingen`
 * (`TeamBox`). Nieuw is alleen: een account aanmaken voor een e-mailadres dat
 * nog geen gebruiker heeft, en het profiel daar meteen aan toewijzen. Zodra
 * de klant de link opent en een wachtwoord zet (`acceptInvite()`), krijgt hij
 * toegang via de gewone accountlaag (laag 1, `lib/accounts.ts`); er is dus
 * geen aparte "reserveer dit account voor deze gebruiker"-stap nodig.
 *
 * `wijsToeAanGebruiker()` is de logica die eerst inline in de route stond,
 * ongewijzigd verplaatst zodat beide routes hem delen in plaats van een
 * tweede kopie te laten ontstaan.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { defaultAccountFor } from "@/lib/accounts";
import { startdatumBijToewijzing } from "@/lib/verkoopafspraak";
import { createInvite } from "@/lib/invites";
import { publicEnv } from "@/lib/env";

type Admin = ReturnType<typeof createAdminClient>;

export interface ToewijsResultaat {
  ok: boolean;
  error?: string;
  email?: string | null;
  assignedAt?: string;
  /** Alleen gevuld als dit een gloednieuw account was: de link om aan de klant te geven. */
  inviteLink?: string | null;
  /** Geen wijziging nodig: dit profiel stond al op deze gebruiker/dit account. */
  unchanged?: boolean;
}

/**
 * Wijst het profiel toe aan het account van een BESTAANDE gebruiker. Dezelfde
 * regel als een nieuw profiel gebruikt (`defaultAccountFor`): hoort de
 * gebruiker al bij een account, dat account; anders wordt er één op zijn
 * e-mailadres aangemaakt.
 */
export async function wijsToeAanGebruiker(
  admin: Admin | SupabaseClient,
  profileId: string,
  targetUserId: string,
): Promise<ToewijsResultaat> {
  const { data: profile } = await admin
    .from("profiles")
    .select("id, user_id, account_id")
    .eq("id", profileId)
    .maybeSingle();
  if (!profile) return { ok: false, error: "Niet gevonden." };

  const { data: target, error: targetError } = await admin.auth.admin.getUserById(targetUserId);
  if (targetError || !target?.user) {
    return { ok: false, error: "Deze gebruiker bestaat niet." };
  }

  const targetAccountId = await defaultAccountFor(targetUserId);

  if (profile.user_id === targetUserId && profile.account_id === targetAccountId) {
    return { ok: true, unchanged: true };
  }

  const assignedAt = new Date().toISOString();

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      user_id: targetUserId,
      assigned_at: assignedAt,
      ...(targetAccountId ? { account_id: targetAccountId } : {}),
    })
    .eq("id", profileId);
  if (profileError) return { ok: false, error: "Toewijzen is niet gelukt." };

  // Postgres kent hier geen transactie over twee losse PostgREST-verzoeken.
  // Zou deze tweede update falen, dan staat het profiel op de klant en de
  // analyses nog op de beheerder, een half overgedragen account. Daarom
  // draaien we het profiel dan terug, zodat de toestand consistent blijft.
  const { error: analysesError } = await admin
    .from("analyses")
    .update({ user_id: targetUserId })
    .eq("profile_id", profileId);
  if (analysesError) {
    await admin
      .from("profiles")
      .update({ user_id: profile.user_id, account_id: profile.account_id, assigned_at: null })
      .eq("id", profileId);
    return { ok: false, error: "Toewijzen is bij de analyses misgegaan; het merk is teruggezet." };
  }

  if (targetAccountId) await zetStartdatum(admin, targetAccountId);

  return { ok: true, email: target.user.email ?? null, assignedAt };
}

/**
 * Maakt een NIEUW klantaccount voor een e-mailadres dat nog geen gebruiker
 * heeft, wijst het profiel er meteen aan toe, en nodigt het adres uit
 * (`createInvite()`, dezelfde route als `/instellingen`). De consultant
 * krijgt de link terug om aan de klant te geven; ORBIT ENGINE bewaart alleen
 * de hash (migratie 0047), dus die link is maar één keer te zien.
 *
 * `profiles.user_id` (laag 2, de historische terugval) blijft bewust
 * ongemoeid: er is nog geen echte gebruiker om daar te zetten. Zodra de
 * klant de uitnodiging accepteert, krijgt hij toegang via de accountlaag
 * (laag 1), precies zoals een extra teamlid via `TeamBox` dat ook al deed
 * zonder ooit `profiles.user_id` aan te raken.
 */
export async function wijsToeAanNieuwAccount(
  admin: Admin | SupabaseClient,
  args: {
    profileId: string;
    profileName: string;
    email: string;
    firstName: string;
    lastName: string;
    invitedBy: string;
  },
): Promise<ToewijsResultaat> {
  const { data: account, error: accountError } = await admin
    .from("accounts")
    .insert({ name: args.profileName })
    .select("id")
    .single();
  if (accountError || !account) {
    return { ok: false, error: "Het klantaccount kon niet worden aangemaakt." };
  }
  const accountId = account.id as string;

  const assignedAt = new Date().toISOString();
  const { error: profileError } = await admin
    .from("profiles")
    .update({ account_id: accountId, assigned_at: assignedAt })
    .eq("id", args.profileId);
  if (profileError) return { ok: false, error: "Toewijzen is niet gelukt." };

  await zetStartdatum(admin, accountId);

  const invite = await createInvite({
    accountId,
    email: args.email,
    firstName: args.firstName,
    lastName: args.lastName,
    role: "admin",
    invitedBy: args.invitedBy,
  });
  // Geen 500: het profiel staat op het nieuwe account, en dát is de
  // onomkeerbare stap. Lukt de uitnodiging niet, dan nodigt de consultant
  // hetzelfde adres alsnog uit via TeamBox op dit scherm, zodra het account
  // zichtbaar wordt.
  if (!invite) return { ok: true, email: args.email, assignedAt, inviteLink: null };

  return {
    ok: true,
    email: args.email,
    assignedAt,
    inviteLink: `${publicEnv.siteUrl}/uitnodiging/${invite.token}`,
  };
}

/**
 * Zie `app/api/profiles/[id]/assign/route.ts`: "Hier begint het programma".
 * Een bestaande datum blijft staan, zodat een tweede merk de teller van de
 * klant niet terugzet. Faalt dit, dan is de toewijzing zelf wél gelukt.
 */
async function zetStartdatum(admin: Admin | SupabaseClient, accountId: string): Promise<void> {
  const { data: accountRij } = await admin
    .from("accounts")
    .select("started_at")
    .eq("id", accountId)
    .maybeSingle();
  const start = startdatumBijToewijzing((accountRij?.started_at as string | null) ?? null);
  if (start) {
    await admin.from("accounts").update({ started_at: start }).eq("id", accountId);
  }
}
