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
  | {
      ok: false;
      reason: "ongeldig" | "verlopen" | "gebruikt" | "zwak" | "mislukt" | "inloggen_vereist";
    };

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
export async function acceptInvite(
  token: string,
  password: string,
  /**
   * Het adres van de INGELOGDE gebruiker, of null als er niemand ingelogd is.
   * Alleen van belang als het uitgenodigde adres al een account heeft, zie de
   * toelichting bij die tak hieronder.
   */
  huidigeGebruikerEmail: string | null = null,
): Promise<AcceptResult> {
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
    // ⚠️ HET TOKEN ALLEEN IS HIER NIET GENOEG (antihack.md M1).
    //
    // De uitnodiger krijgt de link mét het ruwe token terug in het antwoord van
    // POST /api/accounts/[id]/invites. Dat is bewust: zolang de uitnodigingsmail
    // uit staat (EMAILS_ENABLED is standaard false) stuurt hij hem zelf door.
    // Maar het betekent ook dat hij de uitnodiging ZELF kan verzilveren.
    //
    // Bij een NIEUWE gebruiker geeft dat niets: die bestaat nog niet, en het
    // wachtwoord wordt door de uitgenodigde gekozen. Bij een BESTAANDE gebruiker
    // maakte dit iemand lid van een account waar hij nooit ja tegen heeft gezegd.
    // Het lidmaatschap loopt de goede kant op (het slachtoffer krijgt toegang tot
    // het account van de aanvaller, niet andersom), dus er lekte geen data. Maar
    // het slachtoffer zag ineens een vreemd merk in zijn merkkiezer staan, en dat
    // is een geloofwaardige opstap naar oplichting bij een product dat aan
    // bureaus verkocht wordt.
    //
    // Wie al een account heeft, moet dus ingelogd zijn met dát adres. Bewust NIET
    // het bestaande wachtwoord opvragen op dit scherm: dat scheelt een stap, maar
    // leert klanten hun wachtwoord in te typen op een pagina waar ze via een
    // e-maillink zijn binnengekomen, en dat is precies de gewoonte waar
    // oplichting op drijft.
    if (!huidigeGebruikerEmail || huidigeGebruikerEmail.trim().toLowerCase() !== email) {
      return { ok: false, reason: "inloggen_vereist" };
    }
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
 * ledenlijst.
 *
 * ⚠️ KEEK EERDER MAAR NAAR DE EERSTE 200 GEBRUIKERS, en dat was een tijdbom
 * onder de uitnodigingsflow (antihack.md M1). Bij meer dan 200 gebruikers werd
 * een bestaande gebruiker niet gevonden, waarna de code hem opnieuw probeerde
 * aan te maken. Dat mislukte netjes met "mislukt", dus het was geen gat, maar
 * het uitgenodigde bureau kwam er niet in en niemand zou hebben begrepen waarom.
 *
 * Nu doorbladeren tot hij gevonden is. De bovengrens is er om een oneindige lus
 * uit te sluiten als de API ooit iets onverwachts teruggeeft: 50 pagina's van
 * 200 is 10.000 gebruikers, ver voorbij waar dit product op gebouwd is
 * (twintig klanten in het eerste jaar, besluit 11). Wordt dat ooit krap, dan
 * hoort hier een eigen index tegenover te staan en niet een hoger getal.
 */
const MAX_GEBRUIKERSPAGINAS = 50;
const GEBRUIKERS_PER_PAGINA = 200;

async function findUserByEmail(email: string): Promise<string | null> {
  const admin = createAdminClient();
  const gezocht = email.trim().toLowerCase();
  try {
    for (let page = 1; page <= MAX_GEBRUIKERSPAGINAS; page++) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: GEBRUIKERS_PER_PAGINA,
      });
      if (error) {
        console.error("Gebruikers ophalen mislukt:", error.message);
        return null;
      }
      const match = data.users.find((u) => (u.email ?? "").toLowerCase() === gezocht);
      if (match) return match.id;
      // Minder dan een volle pagina terug: dit was de laatste.
      if (data.users.length < GEBRUIKERS_PER_PAGINA) return null;
    }
    console.error(
      `Gebruiker zoeken afgebroken na ${MAX_GEBRUIKERSPAGINAS} pagina's. Zie findUserByEmail.`,
    );
    return null;
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
