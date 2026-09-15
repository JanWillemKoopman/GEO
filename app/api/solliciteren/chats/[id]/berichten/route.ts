import { NextResponse } from "next/server";
import { brievenUit, pasDossierIn, type Dossierstuk } from "@/lib/solliciteren/dossier";
import type { Feit } from "@/lib/solliciteren/feiten";
import { streamAntwoord, type Gespreksbericht } from "@/lib/solliciteren/gesprek";
import {
  STANDAARD_MODEL,
  STANDAARD_STAND,
  bepaalParameters,
  isGeldigModel,
  isGeldigeStand,
} from "@/lib/solliciteren/modellen";
import { MAX_BERICHT_TEKENS } from "@/lib/solliciteren/prompt";
import { meetStem } from "@/lib/solliciteren/stem";
import { laadEigenGesprek } from "@/lib/solliciteren/toegang";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  DossierSnapshotRegel,
  SollicitatieBericht,
  SollicitatieDocument,
} from "@/lib/types/database";

/**
 * Een bericht sturen en het antwoord terugkrijgen terwijl het geschreven wordt.
 *
 * ── WAAROM DIT STREAMT ─────────────────────────────────────────────────────
 *
 * Een brief van 400 woorden op het vlaggenschip met redeneerstand `hoog` duurt
 * tientallen seconden. Zonder streaming staat het scherm al die tijd stil, en
 * dat leest als een app die hangt in plaats van een app die schrijft. Met
 * streaming komt het eerste woord binnen een paar seconden.
 *
 * ── HET FORMAAT: ÉÉN JSON-OBJECT PER REGEL ─────────────────────────────────
 *
 * Geen kale tekst, want er moet meer terug dan alleen de brief: welk bericht-id
 * het geworden is, wat het gekost heeft, en of het halverwege is afgebroken.
 * Geen Server-Sent Events, want dat formaat kost een extra laag aan beide
 * kanten en levert hier niets op. Dus per regel één object met een `t`:
 *
 *   {"t":"stukje","tekst":"..."}   een stukje antwoord
 *   {"t":"klaar","bericht":{...}}  het is af, met kosten en tokens
 *   {"t":"fout","melding":"..."}   het ging mis, met de reden
 *
 * ── HET DOSSIER GAAT VOLUIT MEE ────────────────────────────────────────────
 *
 * Sinds migratie 0096 hangt het materiaal aan de persoon en niet aan het
 * gesprek. Het hele dossier gaat bij elk bericht mee, ongefilterd: er wordt
 * niet vooraf uitgezocht welke drie projecten relevant zijn. Dat is een
 * uitdrukkelijke keuze van de eigenaar (15 september 2026): liever alles in één
 * keer naar het beste model dan een goedkopere voorselectie die net het stuk
 * weglaat waar de brief op had moeten staan.
 *
 * ── WAT ER WORDT OPGESLAGEN, EN WANNEER ────────────────────────────────────
 *
 * Het bericht van de gebruiker gaat de database in VÓÓRDAT de aanroep begint.
 * Valt daarna alles weg, dan staat de vraag er nog en hoeft niemand zich af te
 * vragen of hij is aangekomen. Het antwoord gaat er na afloop bij, ook als het
 * halverwege is afgebroken: een halve brief is meer waard dan een lege rij.
 */

/**
 * 300 seconden, dezelfde bovengrens als de werkerroute. Het tijdbudget van de
 * aanroep zelf ligt op 240 seconden (`lib/solliciteren/gesprek.ts`), zodat wíj
 * het afkappen melden en het platform de functie niet halverwege afknipt.
 */
export const maxDuration = 300;

interface Aanvraag {
  vraag?: unknown;
  model?: unknown;
  stand?: unknown;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const toegang = await laadEigenGesprek(id);
  if (!toegang.ok) {
    return NextResponse.json({ error: toegang.melding }, { status: toegang.status });
  }
  const chat = toegang.chat;

  let body: Aanvraag;
  try {
    body = (await request.json()) as Aanvraag;
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const vraag = typeof body.vraag === "string" ? body.vraag.trim().slice(0, MAX_BERICHT_TEKENS) : "";
  if (!vraag) {
    return NextResponse.json({ error: "Typ eerst een bericht." }, { status: 400 });
  }

  // Een onbekend model of een onbekende stand wordt geweigerd en niet stilletjes
  // rechtgezet: anders draait er iets anders dan er op het scherm staat, en dan
  // klopt de kolom `model` bij dit bericht niet meer met wat het gekost heeft.
  const model = body.model === undefined ? STANDAARD_MODEL : body.model;
  const stand = body.stand === undefined ? STANDAARD_STAND : body.stand;
  if (!isGeldigModel(model) || !isGeldigeStand(stand)) {
    return NextResponse.json({ error: "Dit model of deze stand kent de app niet." }, { status: 400 });
  }
  const parameters = bepaalParameters(model, stand);

  const admin = createAdminClient();

  // Het dossier van deze persoon, in één keer. Het hangt aan `user_id` en niet
  // aan het gesprek, dus het is bij elk gesprek hetzelfde en altijd actueel.
  const { data: documentData } = await admin
    .from("sollicitatie_documenten")
    .select("id, soort, titel, inhoud")
    .eq("user_id", toegang.userId);
  const dossier = ((documentData ?? []) as Pick<
    SollicitatieDocument,
    "id" | "soort" | "titel" | "inhoud"
  >[]) as Dossierstuk[];

  // De stem wordt gemeten aan de eerdere brieven, en aan niets anders: een CV
  // is opsommingen en jaartallen, en dat register hoort een brief niet te
  // hebben. Geen of te weinig brieven levert `null`, en dan staat er geen
  // stijlvoorschrift in de prompt in plaats van een verzonnen voorschrift
  // (conventie 3).
  const stem = meetStem(brievenUit(dossier));

  // De feitenkaart: de gesloten lijst van wat de brief mag beweren (migratie
  // 0097). Is hij leeg, dan schrijft de assistent zoals hij dat vóór 0097 deed,
  // rechtstreeks uit het dossier; de prompt past zich daarop aan in plaats van
  // te doen alsof er een kaart is (conventie 3).
  const { data: feitData } = await admin
    .from("sollicitatie_feiten")
    .select("id, nummer, categorie, tekst, periode, bronzin, handmatig")
    .eq("user_id", toegang.userId)
    .order("nummer", { ascending: true });
  const feiten = (feitData ?? []) as Feit[];

  // Eerst het gespreksverloop lezen, dan pas de nieuwe vraag wegschrijven: die
  // vraag gaat los mee de aanroep in en hoort er niet twee keer in te staan.
  const { data: eerder } = await admin
    .from("sollicitatie_berichten")
    .select("rol, inhoud")
    .eq("chat_id", id)
    .order("created_at", { ascending: true });
  const historie = ((eerder ?? []) as Gespreksbericht[]).filter((b) => b.inhoud.trim().length > 0);

  const { error: vraagFout } = await admin
    .from("sollicitatie_berichten")
    .insert({ chat_id: id, rol: "gebruiker", inhoud: vraag });
  if (vraagFout) {
    return NextResponse.json({ error: "Je bericht opslaan is niet gelukt." }, { status: 500 });
  }

  // Het gesprek heet naar de eerste vraag, zodat de lijst leesbaar is zonder dat
  // iemand iets hoeft in te typen. Alleen de eerste keer: een gesprek dat bij
  // elk bericht van naam verandert, is niet terug te vinden.
  if (historie.length === 0) {
    // Welke stukken dit gesprek gedragen hebben, op naam en omvang. Het dossier
    // verandert onderweg; zonder deze regel is bij een brief die goed viel niet
    // meer na te gaan wélke stukken erin zaten (migratie 0096).
    const { mee } = pasDossierIn(dossier);
    const snapshot: DossierSnapshotRegel[] = mee.map((stuk) => ({
      id: stuk.id,
      titel: stuk.titel,
      soort: stuk.soort,
      tekens: stuk.inhoud.length,
    }));

    const wijziging: Record<string, unknown> = { documenten_snapshot: snapshot };
    // Het gesprek heet naar de eerste vraag, zodat de lijst leesbaar is zonder
    // dat iemand iets hoeft in te typen. Alleen de eerste keer: een gesprek dat
    // bij elk bericht van naam verandert, is niet terug te vinden.
    if (chat.titel === "Nieuw gesprek") wijziging.titel = vraag.slice(0, 80);

    await admin.from("sollicitatie_chats").update(wijziging).eq("id", id);
  }

  const encoder = new TextEncoder();
  const uitvoer = new ReadableStream<Uint8Array>({
    async start(controller) {
      const stuur = (regel: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(regel)}\n`));
      };

      try {
        const antwoord = await streamAntwoord({
          dossier,
          feiten,
          vacature: chat.vacature_tekst,
          stem,
          historie,
          vraag,
          parameters,
          onDelta: (stukje) => stuur({ t: "stukje", tekst: stukje }),
        });

        const { data } = await admin
          .from("sollicitatie_berichten")
          .insert({
            chat_id: id,
            rol: "assistent",
            inhoud: antwoord.tekst,
            model: parameters.model,
            reasoning_effort: parameters.reasoningEffort ?? null,
            temperatuur: parameters.temperature ?? null,
            input_tokens: antwoord.inputTokens,
            output_tokens: antwoord.outputTokens,
            cost_usd: antwoord.costUsd,
            raw_json: antwoord.raw,
          })
          .select("*")
          .single();

        stuur({ t: "klaar", bericht: data as SollicitatieBericht | null });
      } catch (err) {
        const melding =
          err instanceof Error && err.name === "TimeoutError"
            ? "Het antwoord duurde te lang. Probeer een lagere redeneerstand."
            : "Het antwoord is niet gelukt. Probeer het opnieuw.";

        // De mislukte poging krijgt een eigen rij, met de reden erin. Anders is
        // achteraf niet te zien of een gesprek stil is gevallen of nooit is
        // begonnen, en dat is precies wat je bij een klacht wilt kunnen nazien.
        await admin.from("sollicitatie_berichten").insert({
          chat_id: id,
          rol: "assistent",
          inhoud: "",
          model: parameters.model,
          reasoning_effort: parameters.reasoningEffort ?? null,
          temperatuur: parameters.temperature ?? null,
          fout: err instanceof Error ? err.message.slice(0, 500) : "onbekende fout",
        });

        stuur({ t: "fout", melding });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(uitvoer, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      // Zonder dit buffert een tussenliggende laag het antwoord op tot het af
      // is, en dan is er van streamen niets meer over.
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
