import "server-only";

/**
 * De PLANSTAP: eerst uitzoeken wat deze pagina nodig heeft, dan pas schrijven
 * (docs/tasks/contentpijplijn-herontwerp.md A1 + A2, migratie 0082).
 *
 * ── WAAROM DIT EEN EIGEN TAAK IS ────────────────────────────────────────────
 *
 * Conventie 7: één taak is hooguit één zware AI-aanroep, en een nieuwe zware
 * stap wordt een eigen jobtype. Het onderzoek doet een web-zoekactie (20 tot 40
 * seconden) plus het opstellen van het contract; daarachter komt de
 * schrijfaanroep die zelf al tot 150 seconden mag duren. Samen in één taak zou
 * dat tegen de routelimiet van 300 seconden aanlopen, en dan is het dure
 * schrijfwerk kwijt door een stap die er niets mee te maken had.
 *
 * ── WAT HIJ AFLEVERT ────────────────────────────────────────────────────────
 *
 *   1. het ITEMDOSSIER: deelvragen, vervolgvragen, twijfels, uitleg met bron;
 *   2. de bronverificatie op die uitleg (alleen wat klopt gaat door);
 *   3. het CONTENTCONTRACT: de secties die de pagina moet hebben.
 *
 * Alle drie worden op de contentpagina bewaard én meegegeven in de payload van
 * de schrijftaak. Dubbelop met opzet: lukt het wegschrijven niet, dan schrijft
 * de volgende stap alsnog mét contract in plaats van zonder.
 *
 * ── KOSTEN ──────────────────────────────────────────────────────────────────
 *
 * Twee aanroepen op de goedkope tier, waarvan één met een web-zoekactie
 * ($0,01 op een redeneermodel). Samen ongeveer twee cent per pagina, tegenover
 * $0,15 voor de schrijfaanroep erna. Nagerekend tegen de tarieven in
 * lib/openai/pricing.ts en de gemeten tokenaantallen in `ai_calls`.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { currentPiece } from "@/lib/jobs/content-jobs";
import { researchItem } from "@/lib/pipeline/item-dossier";
import { buildContentContract } from "@/lib/pipeline/content-contract";
import { fetchExistingPage } from "@/lib/pipeline/existing-page-fetch";
import { matchExistingPage } from "@/lib/pipeline/existing-page-match";
import { factsFromSnapshot, planFromSnapshot } from "@/lib/pipeline/briefing";
import { factFromAnswer, mergeAnsweredFacts, type AnsweredFactInput } from "@/lib/pipeline/factcard";
import { answerBelongsHere } from "@/lib/pipeline/answer-scope";
import { buildFactBase } from "@/lib/pipeline/factbase";
import {
  berekenInputCoverage,
  sectiesVanPagina,
  zetContractVast,
} from "@/lib/pipeline/input-coverage";
import { TARGET_WORDS, TYPE_GUIDANCE, type RecommendationInput } from "@/lib/pipeline/content";
import type { ContentContract } from "@/lib/schemas/content-contract";
import type { ItemDossier } from "@/lib/schemas/item-dossier";
import type { VerifiedExplainer } from "@/lib/pipeline/explainer-verify";
import type { Analysis, Profile } from "@/lib/types/database";

export interface PlanResult {
  contract: ContentContract | null;
  dossier: ItemDossier | null;
  explainers: VerifiedExplainer[];
  /** Kwam dit uit de database in plaats van uit twee verse aanroepen? */
  hergebruikt: boolean;
  /**
   * De verse tekst van de te verbeteren pagina (O3, migratie 0083). `null` bij
   * een nieuwe pagina of als de site niet te lezen was. Gaat mee in de payload
   * van de schrijftaak, net als het contract: lukt het wegschrijven niet, dan
   * schrijft de volgende stap alsnog mét de bestaande tekst in plaats van zonder.
   *
   * ⚠️ En hij MOET mee in die payload, want bij een nieuwe pagina bestaat de rij
   * in `content_pieces` op dit moment nog niet: die wordt pas door de schrijfstap
   * aangemaakt. Bewaren bij de pagina lukt hier alleen als er al een versie stond
   * (opnieuw genereren, of een pagina die de briefing doorlopen heeft); in alle
   * andere gevallen is de payload de enige weg, en schrijft de schrijfstap beide
   * kolommen weg.
   */
  existingText: string | null;
  /** Wanneer die tekst is opgehaald. Zonder dat is niet te zeggen of hij nog klopt. */
  existingFetchedAt: string | null;
}

/**
 * Hoeveel tekens van het winnende antwoord meegaan naar het onderzoek. Zelfde
 * maat als in `briefing.ts`: genoeg om de lat te zien, niet genoeg om de prompt
 * te vullen.
 */
const ANSWER_EXCERPT_CHARS = 700;

/**
 * Bereidt één contentitem voor.
 *
 * Idempotent (conventie 9): staat er al een contract op de huidige versie van
 * deze pagina, dan doen we geen enkele aanroep en geven we dat terug. Anders
 * zou een taak die opnieuw geprobeerd wordt de web-zoekactie nog eens betalen.
 */
export async function planContentPiece(args: {
  analysisId: string;
  userId: string;
  recommendation: RecommendationInput;
  /** Opnieuw onderzoeken, ook als er al een contract ligt (bij opnieuw genereren). */
  force?: boolean;
}): Promise<PlanResult> {
  const { analysisId, userId, recommendation, force = false } = args;
  const admin = createAdminClient();

  const { data: analysisRow } = await admin
    .from("analyses")
    .select("*")
    .eq("id", analysisId)
    .single();
  if (!analysisRow || analysisRow.user_id !== userId) throw new Error("Analyse niet gevonden.");
  const analysis = analysisRow as Analysis;

  const piece = await currentPiece(admin, analysisId, recommendation.title);
  const targets = recommendation.targets ?? [];

  // ── Ligt het er al? ───────────────────────────────────────────────────────
  //
  // Sinds de planstap ook VÓÓR de briefing draait, is dit de normale route bij
  // de tweede aanroep: de klant drukt op "Schrijf mijn pagina's" en het contract
  // van de briefing ligt er dan al. Geen enkele nieuwe AI-aanroep, maar wél het
  // vastzetten hieronder, want de klant heeft er intussen vragen bij
  // beantwoord en overgeslagen.
  if (piece && !force) {
    const { data: row } = await admin
      .from("content_pieces")
      .select(
        "contract_json, dossier_json, write_mode, existing_page_text, existing_page_fetched_at",
      )
      .eq("id", piece.id)
      .maybeSingle();
    const bestaand = (row?.contract_json ?? null) as ContentContract | null;
    if (bestaand && bestaand.sections?.length > 0) {
      const opgeslagen = (row?.dossier_json ?? null) as
        | { dossier?: ItemDossier; explainers?: VerifiedExplainer[] }
        | null;
      const vast = await zetVastEnMeet(admin, analysisId, analysis.profile_id, piece.id, bestaand, targets, {
        alleenAlgemeen: row?.write_mode === "algemeen",
      });
      return {
        contract: vast,
        dossier: opgeslagen?.dossier ?? null,
        explainers: opgeslagen?.explainers ?? [],
        hergebruikt: true,
        // Niet opnieuw ophalen: het contract dat we teruggeven is tegen DEZE
        // tekst opgesteld. Een verse ophaling zou een verbeterplan opleveren dat
        // over een andere pagina gaat dan het contract eronder.
        existingText: (row?.existing_page_text as string | null) ?? null,
        existingFetchedAt: (row?.existing_page_fetched_at as string | null) ?? null,
      };
    }
  }

  const { data: profileRow } = await admin
    .from("profiles")
    .select("*")
    .eq("id", analysis.profile_id)
    .maybeSingle();
  const profile = profileRow as Profile | null;

  // Het winnende antwoord uit de meting: dat is wat de lat laat zien. Dezelfde
  // bron als `loadContentContext` gebruikt, hier alleen om het onderzoek te
  // richten.
  const runIds = targets.map((t) => t.runId).filter((id): id is string => Boolean(id));
  let winningAnswers: string[] = [];
  if (runIds.length > 0) {
    const { data: runRows } = await admin
      .from("tracking_runs")
      .select("id, raw_response")
      .in("id", runIds);
    winningAnswers = ((runRows ?? []) as { raw_response: string | null }[])
      .map((r) => (r.raw_response ?? "").slice(0, ANSWER_EXCERPT_CHARS))
      .filter(Boolean);
  }

  const competitors = Array.from(new Set(profile?.competitors ?? []));

  // ── 1. Het itemdossier (A1) ───────────────────────────────────────────────
  const { dossier, explainers } = await researchItem({
    title: recommendation.title,
    type: recommendation.type,
    targetIntent: recommendation.targetIntent,
    why: recommendation.why,
    industry: profile?.industry ?? null,
    cluster: analysis.topic ?? null,
    targets,
    winningAnswers,
    competitors,
    analysisId,
    profileId: analysis.profile_id,
  });

  // ── 2. De feitenkaart en het paginaplan ───────────────────────────────────
  //
  // Bij voorkeur de bevroren kaart uit de briefing, precies zoals de
  // schrijfstap hem straks pakt: het contract moet naar dezelfde F-nummers
  // verwijzen als de schrijver ziet. Is er geen snapshot (een pagina buiten de
  // briefing om), dan bouwen we de kaart op met de doelvragen als sturing (S1).
  const { data: pieceRow } = piece
    ? await admin
        .from("content_pieces")
        .select("briefing_snapshot_json, write_mode")
        .eq("id", piece.id)
        .maybeSingle()
    : { data: null };

  const dezePagina = piece ? [piece.id] : [];

  const bevroren = factsFromSnapshot(pieceRow?.briefing_snapshot_json);
  const basis =
    bevroren.length > 0
      ? bevroren
      : await buildFactBase(
          admin,
          analysis.profile_id,
          analysisId,
          targets.map((t) => t.text),
          dezePagina,
        );

  // ── De bevroren kaart is een MOMENTOPNAME, ook hier (verbetering 2) ───────
  //
  // De snapshot is gemaakt tijdens de BRIEFING, dus per definitie voordat de
  // klant ook maar één vraag beantwoord had. `loadContentContext` voegt de
  // antwoorden er daarom alsnog bij (R8.1); deze planstap deed dat niet, en dat
  // is precies dezelfde fout op een nieuwe plek.
  //
  // Wat dat kostte, gemeten op 1 september 2026: de antwoorden stonden om
  // 16:52:35 in de database, deze stap begon om 16:53:00, en het contract dat
  // eruit kwam schreef als openingszin van de pagina "De beschikbare informatie
  // onderbouwt nog niet dat het bedrijf specifiek in Tilburg hybride
  // warmtepompen plaatst" terwijl de klant net "ja" had geantwoord.
  //
  // Bij de terugvalroute hierboven zitten de antwoorden al in `buildFactBase`;
  // `mergeAnsweredFacts` ontdubbelt daarop, dus die route verandert niet van
  // uitkomst.
  const { data: antwoordRijen } = await admin
    .from("fact_requests")
    .select("question, answer, answer_type, answered_at, status, scope, analysis_id, content_piece_ids")
    .eq("profile_id", analysis.profile_id)
    .eq("status", "beantwoord")
    .not("answer", "is", null);

  const antwoorden: AnsweredFactInput[] = (antwoordRijen ?? [])
    .filter((rij) => answerBelongsHere(rij as never, analysisId, dezePagina))
    .flatMap((rij) => {
      const fact = factFromAnswer(rij as never);
      return fact ? [{ question: rij.question as string, fact }] : [];
    });

  const facts = mergeAnsweredFacts(basis, antwoorden);
  const plan = planFromSnapshot(pieceRow?.briefing_snapshot_json);

  // ── 3. De bestaande pagina, vers (O3, migratie 0083) ──────────────────────
  //
  // Alleen bij `verbeteren`, en alleen als het adres echt in de inventaris
  // staat. Die tweede voorwaarde is geen dubbelop met `existing-page-match.ts` in de
  // rapportstap maar de tweede sluis: een aanbeveling kan ook via het
  // contentplan of een handmatige aanroep binnenkomen, en dan is hij nooit langs
  // die controle geweest. Zonder deze regel zou een verzonnen adres alsnog
  // opgehaald worden, en een 404 op een pad dat nooit bestond ziet er in de log
  // uit als een tijdelijke storing.
  //
  // Mislukt de ophaling, dan blijft `existingText` leeg en valt de schrijfstap
  // terug op het crawl-excerpt (`chooseExistingText`). De pagina wordt dan
  // geschreven zoals vóór deze wijziging, en niet slechter.
  let existingText: string | null = null;
  let existingFetchedAt: string | null = null;
  if (recommendation.action === "verbeteren" && recommendation.existingUrl) {
    const { data: pageRows } = await admin
      .from("profile_pages")
      .select("url")
      .eq("profile_id", analysis.profile_id);
    const bekend = matchExistingPage(
      recommendation.existingUrl,
      ((pageRows ?? []) as { url: string }[]),
    );

    if (!bekend) {
      console.warn(
        `Contentplan voor "${recommendation.title}": ${recommendation.existingUrl} staat niet in ` +
          `de inventaris van dit merk. Bestaande tekst niet opgehaald.`,
      );
    } else {
      const opgehaald = await fetchExistingPage(bekend.url);
      existingText = opgehaald.text;
      existingFetchedAt = opgehaald.text ? opgehaald.fetchedAt : null;
      if (opgehaald.probleem) {
        console.warn(
          `Contentplan voor "${recommendation.title}": ${bekend.url} niet gelezen ` +
            `(${opgehaald.probleem}). Terugval op de crawltekst.`,
        );
      } else {
        console.info(
          `Contentplan voor "${recommendation.title}": ${bekend.url} vers opgehaald, ` +
            `${opgehaald.text?.length ?? 0} tekens.`,
        );
      }
      if (piece) {
        const { error } = await admin
          .from("content_pieces")
          .update({
            existing_page_text: existingText,
            existing_page_fetched_at: opgehaald.fetchedAt,
          })
          .eq("id", piece.id);
        if (error) {
          console.warn(
            `Bestaande tekst niet kunnen bewaren bij pagina ${piece.id}: ${error.message}`,
          );
        }
      }
    }
  }

  // ── 4. Het contract (A2), nu als verbeterplan (O4) ────────────────────────
  const { contract } = await buildContentContract({
    title: recommendation.title,
    type: recommendation.type,
    targetIntent: recommendation.targetIntent,
    targets,
    facts,
    plan,
    dossier,
    explainers,
    targetWords: TARGET_WORDS[recommendation.type],
    typeGuidance: TYPE_GUIDANCE[recommendation.type],
    analysisId,
    profileId: analysis.profile_id,
    existingText,
    existingUrl: recommendation.existingUrl ?? null,
  });

  // ⚠️ Nul secties "aanwezig" bij een pagina die WEL bestaat, is een signaal.
  // Deze tekst vervangt die pagina, dus alles wat niet in het contract staat
  // raakt de klant kwijt. Bij de eerste echte verbetering (2 september 2026) was
  // dat 0 van de 20, en dat viel alleen op omdat er met de hand naar gekeken
  // werd. De instructie vraagt het model nu expliciet om die secties op te
  // nemen; deze regel maakt meetbaar of dat ook gebeurt. Geen harde correctie:
  // wij weten niet wat er op die pagina staat, het model heeft hem gelezen.
  if (existingText) {
    const aanwezig = contract.sections.filter((s) => s.presentOnExisting === "aanwezig").length;
    if (aanwezig === 0) {
      console.warn(
        `Contentplan voor "${recommendation.title}": geen enkele van de ` +
          `${contract.sections.length} secties staat volgens het model al op de bestaande pagina. ` +
          `Alles wat daar nu staat verdwijnt dus bij vervanging.`,
      );
    } else {
      console.info(
        `Contentplan voor "${recommendation.title}": ${aanwezig} van de ` +
          `${contract.sections.length} secties staat al op de bestaande pagina.`,
      );
    }
  }

  console.info(
    `Contentplan voor "${recommendation.title}": ${contract.sections.length} secties, ` +
      `${dossier.subQuestions.length} deelvragen, ` +
      `${explainers.filter((e) => e.verified).length} van ${explainers.length} uitleg met bron bevestigd.`,
  );

  // ── 5. Bewaren bij de pagina ──────────────────────────────────────────────
  //
  // Faalt dit, dan gaat het schrijven gewoon door: de schrijftaak krijgt
  // dezelfde uitkomst mee in zijn payload. Een mislukt wegschrijven mag geen
  // pagina zonder contract opleveren.
  if (piece) {
    const { error } = await admin
      .from("content_pieces")
      .update({
        contract_json: contract as never,
        dossier_json: { dossier, explainers } as never,
      })
      .eq("id", piece.id);
    if (error) {
      console.warn(`Contract niet kunnen bewaren bij pagina ${piece.id}: ${error.message}`);
    }
  }

  // Vlak vóór het schrijven vervallen de secties waarvan de klant de vraag
  // oversloeg. Bij een verse plantaak (vóór de briefing) is er nog niets
  // overgeslagen en verandert er dus niets; dit is de route die telt zodra de
  // klant op "Schrijf mijn pagina's" drukt nadat hij een contract al eerder
  // kreeg maar het onderzoek opnieuw draaide.
  const definitief = piece
    ? await zetVastEnMeet(admin, analysisId, analysis.profile_id, piece.id, contract, targets, {
        alleenAlgemeen: pieceRow?.write_mode === "algemeen",
      })
    : contract;

  return {
    contract: definitief,
    dossier,
    explainers,
    hergebruikt: false,
    existingText,
    existingFetchedAt,
  };
}

/**
 * Het contract vastzetten op wat er nu wél kan, en de graad opnieuw meten.
 * (docs/tasks/vragen-voor-het-schrijven.md §6)
 *
 * ── WAT HIER GEBEURT ────────────────────────────────────────────────────────
 *
 *   1. de feitenkaart opnieuw opbouwen, inclusief de antwoorden van de klant;
 *   2. de secties laten vervallen waarvan de vraag is OVERGESLAGEN;
 *   3. de onderbouwingsgraad van wat overblijft bewaren.
 *
 * ── WAAROM DIT DE PAGINA KORTER MAAKT IN PLAATS VAN VAGER ───────────────────
 *
 * Tot 2 september 2026 werd een overgeslagen vraag stilzwijgend niets: de
 * schrijver kreeg nog steeds de opdracht die sectie te vullen, en deed dat door
 * om het gat heen te praten of het te benoemen. Over de vier pagina's van
 * 1 september samen stonden er 80 zinnen die de lezer opdragen iets na te
 * vragen. Nu valt de sectie eruit, en dat is eerlijk: minder input is minder
 * pagina.
 *
 * ── WAAROM ALLEEN OVERGESLAGEN EN NIET OOK OPENSTAAND ───────────────────────
 *
 * Zie de toelichting bij `zetContractVast()`. Een open vraag is geen besluit van
 * de klant; een overgeslagen vraag wel.
 *
 * Faalt de meting, dan blijft het contract zoals het was. Een pagina niet
 * kunnen schrijven omdat een telling niet lukte is erger dan een pagina met een
 * sectie te veel.
 */
async function zetVastEnMeet(
  admin: ReturnType<typeof createAdminClient>,
  analysisId: string,
  profileId: string,
  pieceId: string,
  contract: ContentContract,
  targets: { text: string }[],
  opties: { alleenAlgemeen?: boolean } = {},
): Promise<ContentContract> {
  const { data: overgeslagen } = await admin
    .from("fact_requests")
    .select("section_refs")
    .eq("profile_id", profileId)
    .eq("status", "overgeslagen");

  const teSnoeien = ((overgeslagen ?? []) as { section_refs: string[] | null }[]).flatMap((r) =>
    sectiesVanPagina(r.section_refs, pieceId),
  );

  // De kaart zoals hij NU is, inclusief de antwoorden van de klant. Hij dient
  // twee doelen: het cijfer dat we straks bewaren, en hieronder de vraag welke
  // merkgebonden secties nog leeg zouden blijven.
  const kaart = await buildFactBase(
    admin,
    profileId,
    analysisId,
    targets.map((t) => t.text),
    [pieceId],
  );

  // ── "Schrijf hem algemeen, zonder onze cijfers" (migratie 0087) ───────────
  //
  // De derde uitweg bij de inputpoort. Kiest de klant die, dan mag de pagina
  // niet alsnog secties bevatten die om een uitspraak over zijn bedrijf vragen
  // en die niemand kan waarmaken: dan schrijft het model daar weer omheen, en
  // dat is precies de tekst die deze keuze moest voorkomen. Alle ongedekte
  // merksecties vervallen, niet alleen die van een overgeslagen vraag.
  const ongedekteMerksecties = opties.alleenAlgemeen
    ? berekenInputCoverage(contract, kaart).ongedekt.map((sec) => sec.id)
    : [];

  const vast = zetContractVast(contract, [...teSnoeien, ...ongedekteMerksecties]) ?? contract;
  if (teSnoeien.length > 0) {
    console.info(
      `Contract van pagina ${pieceId}: ${contract.sections.length - vast.sections.length} van de ` +
        `${contract.sections.length} secties vervallen, de klant sloeg hun vraag over.`,
    );
  }

  // De graad opnieuw meten op de kaart zoals hij NU is: de antwoorden die de
  // klant gaf zitten erin, dus het cijfer hoort gestegen te zijn. Dat is precies
  // het moment waarop de app kan laten zien dat de input verschil maakte.
  const { error } = await admin
    .from("content_pieces")
    .update({
      contract_json: vast as never,
      input_coverage: berekenInputCoverage(vast, kaart).graad,
    })
    .eq("id", pieceId);
  if (error) console.warn(`Vastgezet contract niet kunnen bewaren bij ${pieceId}: ${error.message}`);

  return vast;
}
