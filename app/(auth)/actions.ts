"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signupsEnabled } from "@/lib/config";

export interface AuthState {
  error: string | null;
}

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Vul je e-mailadres en wachtwoord in." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Inloggen mislukt: controleer je e-mail en wachtwoord." };

  redirect("/analyses");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  // App-laag: registratie is dicht tijdens de bouwfase.
  if (!signupsEnabled) {
    return { error: "Aanmelden kan nu niet: Aura is op uitnodiging. Vraag je contactpersoon om toegang." };
  }

  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Vul je e-mailadres en wachtwoord in." };
  if (password.length < 8) return { error: "Kies een wachtwoord van minstens 8 tekens." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: `Registreren mislukt: ${error.message}` };

  // Als e-mailbevestiging aanstaat, is er nog geen sessie — stuur terug naar login met uitleg.
  if (!data.session) {
    redirect("/login?check_email=1");
  }

  redirect("/analyses");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Wachtwoord vergeten (docs/tasks/onboarding-2.0.md, blok A).
 *
 * ── WAAROM DIT ER PAS NU IS ─────────────────────────────────────────────────
 *
 * Zolang registratie openstond, kon iemand die zijn wachtwoord kwijt was zich
 * opnieuw aanmelden. Nu accounts alleen nog door de eigenaar in het
 * Supabase-dashboard worden aangemaakt, is dat geen uitweg meer: zonder
 * herstelfunctie is een klant die zijn wachtwoord vergeet buitengesloten tot
 * iemand hem handmatig helpt.
 *
 * ── DIT STAAT LOS VAN EMAILS_ENABLED ────────────────────────────────────────
 *
 * `EMAILS_ENABLED` schakelt de Resend-mail uit (rapporten, herinneringen). Deze
 * mail loopt via Supabase Auth zelf en valt daar dus buiten. Bewust: een
 * uitgezette rapportmail is een gemiste haak, een uitgezette herstelmail is een
 * klant die niet meer binnenkomt.
 *
 * ⚠️ De standaard-mailer van Supabase heeft een lage limiet en is niet bedoeld
 * voor productie. Staat er nog geen eigen SMTP ingesteld, dan werkt dit in de
 * test wél en op een drukke dag niet.
 */
export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Vul je e-mailadres in." };

  // De terugkomlink moet naar deze installatie wijzen, niet naar een vaste URL:
  // preview-deploys op Vercel draaien op een ander domein dan productie, en een
  // hardgecodeerde link stuurt de klant dan naar de verkeerde omgeving.
  const host = (await headers()).get("host");
  const proto = host?.startsWith("localhost") || host?.startsWith("127.") ? "http" : "https";
  const redirectTo = host ? `${proto}://${host}/auth/wachtwoord` : undefined;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  // Altijd hetzelfde antwoord, ook bij een onbekend adres. Zou dit verschillen,
  // dan is dit formulier een manier om te achterhalen wie er een account heeft.
  redirect("/login?reset_sent=1");
}

/** Nieuw wachtwoord zetten. Draait op de sessie uit de herstel-link. */
export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("password_repeat") ?? "");

  if (password.length < 8) return { error: "Kies een wachtwoord van minstens 8 tekens." };
  if (password !== repeat) return { error: "De twee wachtwoorden zijn niet gelijk." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error:
        "Deze herstel-link is verlopen of al gebruikt. Vraag een nieuwe aan via 'Wachtwoord vergeten'.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: `Wachtwoord wijzigen mislukt: ${error.message}` };

  redirect("/analyses");
}
