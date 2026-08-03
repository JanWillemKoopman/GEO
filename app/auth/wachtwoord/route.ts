import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Waar de herstel-link uit de mail op binnenkomt (blok A).
 *
 * ── WAAROM DIT EEN ROUTE HANDLER IS EN GEEN PAGINA ──────────────────────────
 *
 * De link bevat een eenmalige code die tegen een sessie ingewisseld moet worden,
 * en dat inwisselen schrijft een cookie. Een Server Component MAG geen cookies
 * zetten in Next 15 — `cookieStore.set()` faalt daar stil (zie de try/catch in
 * lib/supabase/server.ts). Het formulier zou dan gewoon verschijnen, de klant
 * zou een nieuw wachtwoord intypen, en pas bij het opslaan zou blijken dat er
 * nooit een sessie was.
 *
 * Een route handler mag het wel. Die wisselt de code in, en stuurt daarna door
 * naar het formulier — dat dan een echte sessie heeft.
 *
 * ── TWEE VORMEN, WANT SUPABASE HEEFT ER TWEE ────────────────────────────────
 *
 * `@supabase/ssr` gebruikt standaard PKCE en levert `?code=`. Oudere
 * mailsjablonen (en projecten die het sjabloon nooit bijwerkten) leveren
 * `?token_hash=&type=recovery`. Beide afhandelen kost vijf regels; alleen de
 * eerste afhandelen levert een herstelmail op die het bij sommige projecten
 * zonder enige melding niet doet.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/wachtwoord", url.origin));
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL("/wachtwoord", url.origin));
  }

  // Verlopen, al gebruikt, of een link zonder code. Terug naar het
  // aanvraagformulier met uitleg — niet naar een leeg wachtwoordscherm dat pas
  // bij het opslaan vertelt dat het niet gaat werken.
  return NextResponse.redirect(new URL("/wachtwoord-vergeten?verlopen=1", url.origin));
}
