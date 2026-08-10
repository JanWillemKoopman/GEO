import "server-only";

/**
 * Uitnodigingen: aanmaken, opzoeken, accepteren.
 *
 * De rekenkant (de vier eindtoestanden, de wachtwoordregels) staat in
 * `lib/invite-rules.ts` zonder `server-only`, zodat de activatiepagina dezelfde
 * regels in de browser kan afvinken (conventie 2). Hier staat alles wat de
 * database of de auth-API raakt.
 *
 * ⚠️ Het ruwe token bestaat maar op één moment: bij het aanmaken. Daarna is er
 * alleen nog de SHA-256. Zie migratie 0047.
 */
import { createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  inviteExpiry,
  inviteState,
  passwordOk,
  type InviteState,
} from "@/lib/invite-rules";
import type { AccountRole } from "@/lib/types/database";

export interface Invite {
  id: string;
  account_id: string;
  email: string;
  role: AccountRole;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

/**
 * 32 willekeurige bytes, base64url. Dat is 256 bits: niet te raden, en kort
 * genoeg om in een e-maillink te passen zonder af te breken.
 */
function nieuwToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Nodigt een adres uit voor een account.
 *
 * Retourneert het ruwe token, en dat is de enige keer dat het bestaat. De
 * aanroeper zet het in de link en vergeet het daarna.
 */
export async function createInvite(input: {
  accountId: string;
  email: string;
  role: AccountRole;
  invitedBy: string;
}): Promise<{ invite: Invite; token: string } | null> {
  const admin = createAdminClient();
  const token = nieuwToken();

  const { data, error } = await admin
    .from("account_invites")
    .insert({
      account_id: input.accountId,
      // Kleine letters bij het opslaan: adressen zijn hoofdletterongevoelig, en
      // anders krijgt "Jan@" een andere uitnodiging dan "jan@".
      email: input.email.trim().toLowerCase(),
      role: input.role,
      token_hash: hashToken(token),
      expires_at: inviteExpiry().toISOString(),
      created_by_user_id: input.invitedBy,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Uitnodiging aanmaken mislukt:", error?.message);
    return null;
  }
  return { invite: data as Invite, token };
}

export interface InviteLookup {
  state: InviteState;
  /** Alleen gevuld als er een rij gevonden is, ongeacht de stand. */
  invite: Invite | null;
  /** De naam van het account, voor op het scherm. */
  accountName: string | null;
}

/** Zoekt een uitnodiging op het ruwe token uit de link. */
export async function lookupInvite(token: string): Promise<InviteLookup> {
  if (!token) return { state: "ongeldig", invite: null, accountName: null };

  const admin = createAdminClient();
  const { data } = await admin
    .from("account_invites")
    .select("*, accounts(name)")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (!data) return { state: "ongeldig", invite: null, accountName: null };

  const rij = data as Invite & { accounts?: { name: string } | null };
  return {
    state: inviteState(rij),
    invite: rij,
    accountName: rij.accounts?.name ?? null,
  };
}

export type AcceptResult =
  | { ok: true }
  | { ok: false; reason: "ongeldig" | "verlopen" | "gebruikt" | "zwak" | "mislukt" };

/**
 * Accepteert een uitnodiging: maakt de gebruiker aan (of koppelt een bestaande),
 * zet hem in het account, en markeert de uitnodiging als gebruikt.
 *
 * ── DE VOLGORDE IS EEN VEILIGHEIDSKEUZE ─────────────────────────────────────
 *
 * Eerst de stand opnieuw controleren, dan pas iets aanmaken. De pagina heeft de
 * stand ook al gelezen, maar tussen het laden van het scherm en het versturen
 * van het formulier kan de link ingetrokken of gebruikt zijn. Een controle op de
 * pagina is een gebruiksvriendelijkheid, deze is de echte.
 *
 * ── EEN BESTAAND ADRES IS GEEN FOUT ─────────────────────────────────────────
 *
 * Bij een bureau (besluit 9) is het juist normaal: dezelfde persoon wordt bij
 * een tweede klant uitgenodigd. Dan komt er geen gebruiker bij, alleen een
 * lidmaatschap. Zijn bestaande wachtwoord blijft gelden; het ingevulde
 * wachtwoord wordt in dat geval genegeerd, want een uitnodiging mag nooit het
 * wachtwoord van een bestaand account overschrijven. Dat zou een overnameroute
 * zijn: wie een adres kent, nodigt uit en zet er een nieuw wachtwoord op.
 */
export async function acceptInvite(token: string, password: string): Promise<AcceptResult> {
  const admin = createAdminClient();
  const { state, invite } = await lookupInvite(token);

  if (state === "ongeldig" || !invite) return { ok: false, reason: "ongeldig" };
  if (state === "verlopen") return { ok: false, reason: "verlopen" };
  if (state === "gebruikt") return { ok: false, reason: "gebruikt" };

  const email = invite.email.toLowerCase();

  // Bestaat er al een gebruiker met dit adres?
  const bestaand = await findUserByEmail(email);

  let userId: string;
  if (bestaand) {
    userId = bestaand;
  } else {
    if (!passwordOk(password)) return { ok: false, reason: "zwak" };

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      // Het adres is bewezen door de uitnodigingslink zelf: die is alleen daar
      // aangekomen. Een tweede bevestigingsmail vraagt de klant om iets te
      // bewijzen wat hij net bewezen heeft.
      email_confirm: true,
    });
    if (error || !data.user) {
      console.error("Gebruiker aanmaken mislukt:", error?.message);
      return { ok: false, reason: "mislukt" };
    }
    userId = data.user.id;
  }

  const { error: lidError } = await admin
    .from("account_users")
    .upsert(
      { account_id: invite.account_id, user_id: userId, role: invite.role },
      { onConflict: "account_id,user_id" },
    );
  if (lidError) {
    console.error("Lidmaatschap toevoegen mislukt:", lidError.message);
    return { ok: false, reason: "mislukt" };
  }

  // Pas als het lidmaatschap er staat. Andersom zou een storing halverwege een
  // verbruikte link zonder toegang opleveren, en dat is niet te herstellen
  // zonder nieuwe uitnodiging.
  const { error: markError } = await admin
    .from("account_invites")
    .update({ accepted_at: new Date().toISOString(), accepted_user_id: userId })
    .eq("id", invite.id)
    .is("accepted_at", null);
  if (markError) {
    console.error("Uitnodiging afvinken mislukt:", markError.message);
    // Niet terugdraaien: het lidmaatschap staat er en dát is wat telt. De link
    // blijft dan technisch bruikbaar tot hij verloopt, en dat is het mildere
    // van de twee kwaden.
  }

  return { ok: true };
}

/**
 * Zoekt een gebruiker op e-mailadres.
 *
 * De admin-API heeft geen directe "zoek op e-mail", dus dit loopt over de
 * ledenlijst. Bij twintig klanten (besluit 11) is dat één pagina; wordt het
 * groter, dan hoort hier een eigen index tegenover te staan.
 */
async function findUserByEmail(email: string): Promise<string | null> {
  const admin = createAdminClient();
  try {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) {
      console.error("Gebruikers ophalen mislukt:", error.message);
      return null;
    }
    const match = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
    return match?.id ?? null;
  } catch (err) {
    console.error("Gebruikers ophalen mislukt:", err);
    return null;
  }
}

/**
 * De openstaande uitnodigingen van een account, voor het instellingenscherm.
 *
 * Alleen wat nog iets kan worden: niet geaccepteerd, niet ingetrokken. Verlopen
 * blijven er wél bij staan, want die verklaren waarom een klant niet binnenkomt
 * en zijn dus juist het antwoord op een vraag.
 */
export async function listPendingInvites(accountId: string): Promise<Invite[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("account_invites")
    .select("id, account_id, email, role, expires_at, accepted_at, revoked_at, created_at")
    .eq("account_id", accountId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Uitnodigingen ophalen mislukt:", error.message);
    return [];
  }
  return (data ?? []) as Invite[];
}
