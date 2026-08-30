"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signupsEnabled } from "@/lib/config";
import { siteUrl } from "@/lib/origin";

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

  redirect("/");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  // App-laag: registratie is dicht tijdens de bouwfase.
  if (!signupsEnabled) {
    return { error: "Aanmelden kan nu niet: ORBIT ENGINE is op uitnodiging. Vraag je contactpersoon om toegang." };
  }

  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Vul je e-mailadres en wachtwoord in." };
  if (password.length < 8) return { error: "Kies een wachtwoord van minstens 8 tekens." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  // ⚠️ De melding van Supabase werd hier letterlijk doorgegeven, en die zegt bij
  // een bestaand adres "User already registered" (antihack.md L4). Daarmee is dit
  // formulier een manier om te achterhalen wie er een account heeft, precies wat
  // `requestPasswordReset` hieronder wél zorgvuldig vermijdt.
  if (error) {
    console.error("Registreren mislukt:", error.message);
    return {
      error:
        "Registreren is niet gelukt. Probeer het opnieuw, of vraag je contactpersoon om een uitnodiging.",
    };
  }

  // Als e-mailbevestiging aanstaat, is er nog geen sessie, stuur terug naar login met uitleg.
  if (!data.session) {
    redirect("/login?check_email=1");
  }

  redirect("/");
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

  // ⚠️ De terugkomlink kwam hier uit de `Host`-header, en die komt van de
  // AANVRAGER. Wie een herstelmail aanvroeg met een vervalste Host, kreeg de link
  // in de mail van het SLACHTOFFER naar zijn eigen domein gewezen, en daarmee de
  // eenmalige code waarmee je een wachtwoord zet (antihack.md M3).
  //
  // Besloten op 29 augustus 2026: herstelmails komen alleen uit productie, dus
  // het adres mag vast. Zie `siteUrl()` in lib/origin.ts voor het waarom.
  const redirectTo = `${siteUrl()}/auth/wachtwoord`;

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

  redirect("/");
}
