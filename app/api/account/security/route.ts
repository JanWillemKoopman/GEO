import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { checkNewEmail, checkNewPassword } from "@/lib/account-security";

/**
 * POST /api/account/security, je eigen e-mailadres of wachtwoord wijzigen.
 *
 * ── WAAROM DIT NIET VIA DE SERVICE-ROLE LOOPT ───────────────────────────────
 *
 * Overal elders in de app schrijft de server met de service-role key na een
 * expliciete ownership-check (conventie 6). Hier niet, en met opzet: dit gaat
 * over de inloggegevens van de ingelogde gebruiker zélf, en dan is de
 * ingelogde sessie precies de juiste autoriteit. De service-role gebruiken zou
 * betekenen dat de route zelf moet bepalen wiens wachtwoord er verandert, en
 * dát is de fout die je nooit wilt maken.
 *
 * ⚠️ Het huidige wachtwoord wordt gecontroleerd door ermee in te loggen. Dat is
 * de enige manier: Supabase geeft de hash niet vrij, en dat hoort ook niet.
 * Zonder die controle is een openstaande laptop genoeg om een account over te
 * nemen.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });
  }

  let body: { actie?: string; email?: string; huidig?: string; nieuw?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const supabase = await createClient();

  if (body.actie === "email") {
    const check = checkNewEmail(body.email ?? "", user.email ?? "");
    if (!check.ok) {
      return NextResponse.json({ error: check.message }, { status: 400 });
    }

    // Supabase stuurt zelf de bevestigingsmail naar het NIEUWE adres, en het
    // oude blijft werken tot die bevestigd is. Dat is precies het gedrag dat een
    // tikfout onschadelijk maakt.
    const { error } = await supabase.auth.updateUser({ email: check.email });
    if (error) {
      return NextResponse.json(
        { error: uitleg(error.message, "Het adres kon niet worden gewijzigd.") },
        { status: 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      message: `We hebben een bevestiging gestuurd naar ${check.email}. Je huidige adres blijft werken tot je die bevestigt.`,
    });
  }

  if (body.actie === "wachtwoord") {
    const huidig = String(body.huidig ?? "");
    const nieuw = String(body.nieuw ?? "");

    const check = checkNewPassword(nieuw, huidig);
    if (!check.ok) {
      return NextResponse.json({ error: check.message }, { status: 400 });
    }

    // ⚠️ De controle op het huidige wachtwoord: gewoon proberen in te loggen.
    // Dat is de enige manier, want Supabase geeft de hash niet vrij en dat hoort
    // ook niet.
    //
    // Bewust met de PUBLIEKE sleutel en niet met de service-role. Een
    // wachtwoordcontrole heeft geen enkele verhoogde bevoegdheid nodig, en een
    // mislukte inlogpoging doen met de sleutel die overal bij mag, is het
    // verkeerde gereedschap voor een alledaagse handeling. `persistSession` uit,
    // zodat deze proef de sessie van de gebruiker niet aanraakt.
    const proef = createSupabaseClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: loginFout } = await proef.auth.signInWithPassword({
      email: user.email ?? "",
      password: huidig,
    });
    if (loginFout) {
      return NextResponse.json(
        { error: "Je huidige wachtwoord klopt niet." },
        { status: 400 },
      );
    }

    const { error } = await supabase.auth.updateUser({ password: nieuw });
    if (error) {
      return NextResponse.json(
        { error: uitleg(error.message, "Het wachtwoord kon niet worden gewijzigd.") },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, message: "Je wachtwoord is gewijzigd." });
  }

  return NextResponse.json({ error: "Onbekende handeling." }, { status: 400 });
}

/**
 * De foutmelding van Supabase is Engels en technisch. De twee die in de praktijk
 * voorkomen krijgen Nederlandse tekst; de rest valt terug op een algemene zin,
 * want een half vertaalde Engelse melding is verwarrender dan een duidelijke
 * algemene.
 */
function uitleg(bericht: string, standaard: string): string {
  const laag = bericht.toLowerCase();
  if (laag.includes("already registered") || laag.includes("already been registered")) {
    return "Dat adres is al in gebruik.";
  }
  if (laag.includes("rate limit") || laag.includes("too many")) {
    return "Je hebt dit net al geprobeerd. Wacht even en probeer het opnieuw.";
  }
  return standaard;
}
