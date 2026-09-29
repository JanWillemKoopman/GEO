import { NextResponse, after } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { answerFact } from "@/lib/facts";
import { probeerNaAntwoord } from "@/lib/pagina/start";
import { publicFactRequest } from "@/lib/fact-request-public";
import { antwoordGrens, antwoordTeLang } from "@/lib/feitenvraag";
import { OPEN_VRAAG_MAX } from "@/lib/pagina/open-vraag-tekst";

/**
 * PATCH /api/profiles/[id]/facts, de klant beantwoordt (of slaat over) een
 * feitenvraag (optimalisatie.md 4.6).
 *
 * Waarom dit bestaat: de schrijfinstructie zegt "verzin geen feiten, blijf
 * algemeen bij twijfel". Bij een klant met een dunne website levert dat
 * gegarandeerd algemene tekst op, en algemeen is precies wat niet geciteerd
 * wordt. In plaats van die spanning te laten bestaan, vragen we het gewoon.
 *
 * Een antwoord wordt verklaarde klantkennis (K5) en bereikt zo, met de
 * reikwijdte van de vraag, ook de volgende pagina's. Dat is ook wat
 * het voor de klant de moeite waard maakt: één keer invullen, altijd profijt.
 *
 * ⚠️ Deze route doet alleen nog auth, validatie en de "overslaan"-tak. Wat er
 * met een echt antwoord gebeurt (opslaan, de kennislaag, het oordeel over een
 * marktclaim) staat in `answerFact()` (`lib/facts.ts`),
 * losgetrokken op 31 augustus 2026 zodat die samenhang in
 * `scripts/test-chain.ts` te toetsen is tegen een echte Postgres, zonder een
 * Next.js request te moeten nabootsen (punt 6 van
 * docs/tasks/opdracht-bevindingen-5-tot-9.md).
 */
// De grenzen staan in `lib/feitenvraag.ts` en `lib/pagina/open-vraag-tekst.ts`,
// zodat het invulveld en deze route hetzelfde getal gebruiken.

/**
 * Ruimte voor het werk ná het antwoord (`after()` hieronder): het beoordelen
 * van de onderbouwing en het klaarzetten van het schrijven, per gekoppelde
 * pagina. Gemeten in de kwaliteitsdoorlichting: 9 tot 30 seconden.
 */
export const maxDuration = 60;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Je bent niet ingelogd." }, { status: 401 });

  const admin = createAdminClient();
  const profile = await getOwnedProfile(admin, id, user.id);
  if (!profile) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });

  let body: { factId?: unknown; answer?: unknown; skip?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const factId = typeof body.factId === "string" ? body.factId : "";
  if (!factId) return NextResponse.json({ error: "Welke vraag?" }, { status: 400 });

  // ⚠️ De eigendomscontrole staat hier apart, en niet alleen als voorwaarde
  // van de update hieronder: zonder deze losse `select` zou een niet-bestaand
  // of niet-eigen factId in de "overslaan"-tak stil een 200 met een lege
  // body opleveren in plaats van de 404 die er hoort te staan.
  const { data: factRow } = await admin
    .from("fact_requests")
    .select("id, open_vraag")
    .eq("id", factId)
    .eq("profile_id", id)
    .maybeSingle();
  if (!factRow) return NextResponse.json({ error: "Vraag niet gevonden." }, { status: 404 });

  // ── Overslaan ─────────────────────────────────────────────────────────────
  // Blijft als rij bestaan zodat we dezelfde vraag niet elk rapport opnieuw
  // stellen. Niets is vervelender dan een app die blijft zeuren.
  if (body.skip === true) {
    const { data } = await admin
      .from("fact_requests")
      .update({ status: "overgeslagen" })
      .eq("id", factId)
      .select("*")
      .single();
    // Overslaan telt als antwoord (B5): misschien was dit de laatste vraag van
    // een pagina, en dan begint het schrijven nu (§6.8 van
    // `docs/tasks/contentketen-opnieuw.md`).
    after(() => probeerNaAntwoord(admin, factId));
    return NextResponse.json(data ? publicFactRequest(data) : data);
  }

  const grens = antwoordGrens(Boolean((factRow as { open_vraag?: boolean | null }).open_vraag), OPEN_VRAAG_MAX);
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";
  if (!answer) return NextResponse.json({ error: "Vul een antwoord in." }, { status: 400 });
  // Nooit stil inkorten (V1 van `pijplijnanalyse-contentketen.md`): een
  // afgekapt antwoord bereikt de schrijver midden in een zin.
  if (antwoordTeLang(answer, grens)) {
    return NextResponse.json(
      { error: `Je antwoord is ${answer.length} tekens; er passen er ${grens}. Kort het iets in.` },
      { status: 400 },
    );
  }

  const resultaat = await answerFact(admin, {
    profileId: id,
    factId,
    answer,
    gebruikerId: user.id,
  });
  if (!resultaat.ok) {
    return NextResponse.json({ error: resultaat.error }, { status: resultaat.status });
  }

  // Was dit de laatste open vraag van een pagina, dan begint het schrijven nu.
  // Geen knop "schrijf nu": het laatste antwoord ís de handeling.
  //
  // ⚠️ Ná het antwoord aan de klant (punt 38 van de kwaliteitsdoorlichting).
  // Gemeten over 70 antwoorden: een gewoon antwoord 0,3 tot 1,3 seconden, het
  // laatste van een pagina 9 tot 30, omdat dit binnen dezelfde klik voor elke
  // gekoppelde pagina de onderbouwing beoordeelde en het schrijven startte. Het
  // opslaan is dan al gebeurd; wat hierna komt, hoeft de klant niet af te wachten.
  after(() => probeerNaAntwoord(admin, factId));

  const { fact, needsEvidence, evidenceHint } = resultaat.outcome;
  const veilig = publicFactRequest(fact as unknown as Record<string, unknown>);
  return NextResponse.json(needsEvidence ? { ...veilig, needsEvidence, evidenceHint } : veilig);
}
