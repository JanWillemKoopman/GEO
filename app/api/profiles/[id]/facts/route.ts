import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOwnedProfile } from "@/lib/profiles";
import { answerFact } from "@/lib/facts";
import { publicFactRequest } from "@/lib/fact-request-public";

/**
 * PATCH /api/profiles/[id]/facts, de klant beantwoordt (of slaat over) een
 * feitenvraag (optimalisatie.md 4.6).
 *
 * Waarom dit bestaat: de schrijfinstructie zegt "verzin geen feiten, blijf
 * algemeen bij twijfel". Bij een klant met een dunne website levert dat
 * gegarandeerd algemene tekst op, en algemeen is precies wat niet geciteerd
 * wordt. In plaats van die spanning te laten bestaan, vragen we het gewoon.
 *
 * Een antwoord gaat naar `profiles.proof_points` en verbetert daarmee ÉLKE
 * volgende pagina, niet alleen degene waarvoor de vraag ontstond. Dat is ook wat
 * het voor de klant de moeite waard maakt: één keer invullen, altijd profijt.
 *
 * ⚠️ Deze route doet alleen nog auth, validatie en de "overslaan"-tak. Wat er
 * met een echt antwoord gebeurt (opslaan, het oordeel over een marktclaim, de
 * promotie naar `proof_points`) staat in `answerFact()` (`lib/facts.ts`),
 * losgetrokken op 31 augustus 2026 zodat die samenhang in
 * `scripts/test-chain.ts` te toetsen is tegen een echte Postgres, zonder een
 * Next.js request te moeten nabootsen (punt 6 van
 * docs/tasks/opdracht-bevindingen-5-tot-9.md).
 */
const MAX_ANSWER_LENGTH = 500;
/** De open vraag van een pagina krijgt ruimte voor een verhaal (besluit B3). */
const MAX_OPEN_ANTWOORD = 3000;

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
    // Overslaan telt als antwoord: misschien was dit de laatste vraag van een
    // pagina, en dan begint het schrijven nu (contentflow-een-lijn.md §3).
    // Na het laatste antwoord start hier het schrijven (WP6 van
    // `docs/tasks/contentketen-opnieuw.md`).
    return NextResponse.json(data ? publicFactRequest(data) : data);
  }

  const grens = (factRow as { open_vraag?: boolean | null }).open_vraag ? MAX_OPEN_ANTWOORD : MAX_ANSWER_LENGTH;
  const answer = typeof body.answer === "string" ? body.answer.trim().slice(0, grens) : "";
  if (!answer) return NextResponse.json({ error: "Vul een antwoord in." }, { status: 400 });

  const resultaat = await answerFact(admin, {
    profileId: id,
    factId,
    answer,
    existingProofPoints: profile.proof_points ?? [],
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


  const { fact, needsEvidence, evidenceHint } = resultaat.outcome;
  const veilig = publicFactRequest(fact as unknown as Record<string, unknown>);
  return NextResponse.json(needsEvidence ? { ...veilig, needsEvidence, evidenceHint } : veilig);
}
