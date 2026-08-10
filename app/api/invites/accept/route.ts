import { NextResponse } from "next/server";
import { acceptInvite, lookupInvite } from "@/lib/invites";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/invites/accept, een uitnodiging verzilveren.
 *
 * ── WAAROM DIT GEEN SERVER ACTION IS ────────────────────────────────────────
 *
 * Dit is de enige route in de app die een gebruiker aanmaakt, en hij is per
 * definitie onbeschermd: wie hem aanroept is nog niemand. Een eigen route maakt
 * dat expliciet en zet de controle op één plek, in plaats van verstopt in een
 * formulieractie tussen de rest.
 *
 * De echte poort is `acceptInvite()`: die controleert de stand van de link
 * opnieuw, ook al deed de pagina dat al. Tussen het laden van het scherm en het
 * versturen van dit formulier kan de link ingetrokken of gebruikt zijn.
 */
export const dynamic = "force-dynamic";

const MELDING: Record<string, string> = {
  ongeldig: "Deze link werkt niet meer. Vraag je contactpersoon om een nieuwe.",
  verlopen: "Deze uitnodiging is verlopen. Vraag je contactpersoon om een nieuwe.",
  gebruikt: "Deze uitnodiging is al gebruikt. Log in met je e-mailadres en wachtwoord.",
  zwak: "Dit wachtwoord voldoet nog niet aan alle drie de regels.",
  mislukt: "Activeren is niet gelukt. Probeer het zo nog eens.",
};

export async function POST(request: Request) {
  let body: { token?: string; password?: string };
  try {
    body = (await request.json()) as { token?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const token = String(body.token ?? "");
  const password = String(body.password ?? "");
  if (!token) {
    return NextResponse.json({ error: MELDING.ongeldig }, { status: 400 });
  }

  const result = await acceptInvite(token, password);
  if (!result.ok) {
    // 410 bij een link die ooit geldig wás (verlopen, gebruikt), 400 bij de rest.
    // Dat scheelt bij het uitzoeken van een melding achteraf.
    const status =
      result.reason === "verlopen" || result.reason === "gebruikt" ? 410 : 400;
    return NextResponse.json({ error: MELDING[result.reason] }, { status });
  }

  // Meteen inloggen. De klant heeft net een wachtwoord gekozen; hem daarna naar
  // een inlogscherm sturen om datzelfde wachtwoord nog eens te typen is een
  // drempel zonder doel.
  //
  // Bij een bestaande gebruiker (bureau dat bij een tweede klant wordt
  // uitgenodigd) mislukt dit als hij een ander wachtwoord heeft. Dat is geen
  // fout: hij is lid geworden, en het inlogscherm is dan de juiste volgende stap.
  const supabase = await createClient();
  const { invite } = await lookupInvite(token);
  if (invite) {
    await supabase.auth.signInWithPassword({ email: invite.email, password });
  }

  return NextResponse.json({ ok: true });
}
