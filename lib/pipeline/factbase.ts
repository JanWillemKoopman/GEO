import "server-only";

/**
 * De feitenindex opbouwen (contentbriefing.md §3.1, implementatieplan.md R5.1).
 *
 * Verzamelt alles wat we met bron over deze klant weten. Geen AI-aanroep. Dit
 * is puur ophalen en ordenen. Wat hier niet in staat, mag de schrijver straks
 * niet beweren; dat maakt de volledigheid van deze functie belangrijker dan hij
 * eruitziet.
 *
 * Volgorde = betrouwbaarheid, en die volgorde is niet cosmetisch: `numberFacts`
 * nummert in deze volgorde, dus de door de klant bevestigde feiten krijgen de
 * lage F-nummers en staan bovenaan de kaart. Wat bovenaan een prompt staat wordt
 * het best gebruikt.
 *
 *   1. Klant    , expliciet beantwoorde vragen. Hoogst: dit weet niemand anders.
 *   2. Site     , proof points, en de letterlijke zinnen uit de pagina's die
 *                  over dít onderwerp gaan (S1).
 *   3. Onderzoek, de samenvatting uit het onderwerp-onderzoek.
 *
 * ── WAT S1 HIER VERANDERDE, EN WAAROM ───────────────────────────────────────
 *
 * Deze functie nam de eerste 8 rijen uit `profile_pages` (geen `order by`, geen
 * filter) en zette ze als NIET-citeerbare achtergrondblokken op de kaart. Wat
 * daar in productie van overbleef, gemeten op de contentronde van 31 juli: over
 * vijf analyses 24 citeerbare feiten, allemaal merkbreed, en géén enkele over
 * het onderwerp van de analyse. Voor "wasmachine kopen" was de volledige
 * citeerbare kaart: gratis wassen 12-15u, cashback op groene stroom, een
 * AirPods-reviewscore, Beste webwinkel 2022, 22 winkels.
 *
 * Sinds S1 gebeuren er twee dingen extra, in deze volgorde:
 *
 *   • SELECTEREN op onderwerp (`page-relevance.ts`, geen AI). Coolblue had tien
 *     gecrawlde wasmachinepagina's die geen van alle meegingen, terwijl vier
 *     Engelstalige duplicaten van de homepage dat wél deden.
 *   • ATOMISEREN (`fact-atomise.ts`, één mini-aanroep per batch): de letterlijke
 *     zinnen met een hard feit erin worden losse, citeerbare items. De blokken
 *     blijven daarnaast als achtergrond staan, voor context en toon.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  numberFacts,
  factFromAnswer,
  SOURCE_ORDER,
  type FactItem,
  type FactSourceKind,
  type RawFact,
} from "@/lib/pipeline/factcard";
import { selectRelevantPages, topicTerms, type CandidatePage } from "@/lib/pipeline/page-relevance";
import { atomiseSitePages } from "@/lib/pipeline/fact-atomise";
import { syncBrandFacts } from "@/lib/pipeline/factstore";
import type { Contradiction } from "@/lib/pipeline/fact-merge";

type Admin = SupabaseClient;

/**
 * Hoeveel letterlijke sitetekst er als feit meegaat.
 *
 * Niet de hele inventaris: HEMA heeft 40 productpagina's, en die integraal in de
 * feitenkaart proppen maakt de prompt onleesbaar én duur zonder dat het de
 * dekking verbetert. De pagina's die er wél toe doen (de bestaande pagina bij
 * `verbeteren`) gaan apart mee in de schrijfstap.
 *
 * Sinds S1 gaat het om de 10 MEEST RELEVANTE pagina's in plaats van de eerste 8
 * die de database teruggeeft, zie `page-relevance.ts` voor wat die willekeur in
 * productie aanrichtte (Coolblue kreeg vier Engelstalige duplicaten van de
 * homepage; nul van de tien gecrawlde wasmachinepagina's).
 */
const MAX_SITE_PAGES = 10;
const PAGE_EXCERPT_CHARS = 400;

/**
 * Hoeveel pagina's er uit de crawl gehaald worden om uit te kiezen.
 *
 * De selectie moet iets te kiezen hébben: bij een limiet van 8 was de keuze al
 * gemaakt vóór de relevantie berekend werd. 60 dekt de volledige inventaris van
 * elk testprofiel (Coolblue/HEMA/Van der Valk: 40, Fysi-Unique: 30).
 */
const PAGE_POOL = 60;

/**
 * Bouwt de feitenindex voor één analyse.
 *
 * `analysisId` bepaalt welk onderwerp-onderzoek meegaat; de klantantwoorden komen
 * uit twee lagen (contentbriefing.md §7): merkbrede feiten gelden voor álle
 * analyses van deze klant, analyse-specifieke alleen voor deze. Dat is wat de
 * kennisbank na drie analyses waardevol maakt. Elke volgende pagina start met
 * meer bevestigde feiten dan de vorige.
 */
export async function buildFactBase(
  admin: Admin,
  profileId: string,
  analysisId: string,
  /**
   * De vragen die de te schrijven pagina's moeten winnen (S1).
   *
   * Sturen de relevantieselectie: dít zijn de vragen waarop een antwoord nodig
   * is, dus dít zijn de pagina's die we nodig hebben. Leeg meegeven werkt ook,
   * dan telt alleen het analyse-onderwerp, maar levert een bredere selectie op.
   */
  targetQuestions: string[] = [],
): Promise<FactItem[]> {
  const [{ data: analysis }, { data: profile }, { data: topic }, { data: pages }, { data: answers }] =
    await Promise.all([
      admin.from("analyses").select("topic").eq("id", analysisId).maybeSingle(),
      admin.from("profiles").select("proof_points, brand_name, url").eq("id", profileId).maybeSingle(),
      admin
        .from("topic_research")
        .select("content_summary")
        .eq("analysis_id", analysisId)
        .maybeSingle(),
      admin
        .from("profile_pages")
        .select("url, title, text_excerpt")
        .eq("profile_id", profileId)
        .limit(PAGE_POOL),
      // Merkbrede antwoorden gelden altijd; analyse-antwoorden alleen bij deze
      // analyse. Een 'pagina'-antwoord hoort bij één content_piece en gaat daar
      // apart mee, hier zou het bij de verkeerde pagina kunnen belanden.
      admin
        .from("fact_requests")
        .select("question, answer, answer_type, answered_at, scope, analysis_id")
        .eq("profile_id", profileId)
        .eq("status", "beantwoord")
        .not("answer", "is", null),
    ]);

  const rauw: RawFact[] = [];

  for (const row of answers ?? []) {
    const scope = row.scope as string;
    const hoortErbij =
      scope === "merk" || (scope === "analyse" && row.analysis_id === analysisId);
    if (!hoortErbij) continue;
    const feit = factFromAnswer(row as never);
    if (feit) rauw.push(feit);
  }

  const siteUrl = (profile?.url as string | null) ?? "de eigen site";
  // Apart bijgehouden: proof points gelden MERKBREED (ze gaan over het bedrijf,
  // niet over dit onderwerp) en moeten dus in de andere scope van de feitenbank
  // belanden dan de geatomiseerde sitezinnen. Beide hebben `kind: "site"`, dus
  // aan de bronsoort alleen is dat onderscheid niet te zien.
  const proofPoints: string[] = [];
  for (const punt of (profile?.proof_points as string[] | null) ?? []) {
    if (!punt?.trim()) continue;
    // Proof points zijn wél atomair: het zijn korte, door de klant bevestigde
    // uitspraken ("wordt met een 9,4 beoordeeld op Zorgkaart"). Citeerbaar dus.
    proofPoints.push(punt.trim());
    rauw.push({ text: punt.trim(), source: `site ${siteUrl}`, allowed: true, citable: true, kind: "site" });
  }

  // ── S1: welke pagina's gaan er mee, en wat halen we eruit? ────────────────
  //
  // Eerst SELECTEREN op onderwerp (deterministisch), dan ATOMISEREN (één
  // mini-aanroep). De volgorde doet ertoe: atomiseren over de verkeerde pagina's
  // levert keurige, letterlijke feiten op over de klantenservice.
  const kandidaten: CandidatePage[] = (pages ?? [])
    .map((page) => ({
      url: page.url as string,
      title: (page.title as string | null) ?? null,
      text: ((page.text_excerpt as string | null) ?? "").trim(),
    }))
    .filter((p) => p.text.length >= 40);

  const termen = topicTerms((analysis?.topic as string | null) ?? null, ...targetQuestions);
  const relevant = selectRelevantPages(kandidaten, termen, MAX_SITE_PAGES);

  const atomen = await atomiseSitePages({
    pages: relevant,
    brandName: (profile?.brand_name as string | null) ?? siteUrl,
    topic: (analysis?.topic as string | null) ?? "",
    targetQuestions,
    analysisId,
    profileId,
  });
  rauw.push(...atomen);

  for (const page of relevant) {
    rauw.push({
      text: `Sitetekst "${page.title ?? page.url}": ${page.text.slice(0, PAGE_EXCERPT_CHARS)}`,
      source: `site ${page.url}`,
      allowed: true,
      // NIET citeerbaar: een lap van 400 tekens is context, geen feit. Zie de
      // toelichting bij FactItem.citable. Dit was precies het alibi waarmee de
      // eerste briefingronde nul vragen opleverde. De losse, letterlijke zinnen
      // uit deze pagina's staan hierboven wél als citeerbaar feit (S1); dit blok
      // blijft eronder staan zodat de schrijver de context en de toon ziet.
      citable: false,
      kind: "site",
    });
  }

  const samenvatting = ((topic?.content_summary as string | null) ?? "").trim();
  if (samenvatting) {
    rauw.push({
      text: `Wat de site over dit onderwerp zegt: ${samenvatting}`,
      source: "onderwerp-onderzoek",
      allowed: true,
      // Idem: een samenvatting is een parafrase van het model, geen bevestigd
      // feit. 6 van de 7 beweringen wezen bij de eerste ronde hiernaar.
      citable: false,
      kind: "onderzoek",
    });
  }

  // ── De feitenbank bijwerken en teruglezen (migratie 0036) ─────────────────
  //
  // De citeerbare feiten gaan door de bank heen, zodat ze een IDENTITEIT krijgen
  // die de nummering overleeft. Klantantwoorden en proof points zijn merkbreed,
  // die gelden voor elke analyse van deze klant. De geatomiseerde sitezinnen
  // horen bij DIT onderwerp: dezelfde zin kan bij een ander onderwerp irrelevant
  // zijn, en hem merkbreed maken zou elke andere analyse vervuilen.
  //
  // De achtergrondblokken gaan er NIET doorheen: die zijn context en geen feit.
  const citeerbaar = rauw.filter((f) => f.citable);
  const achtergrond = rauw.filter((f) => !f.citable);

  const { facts: uitBank, contradictions } = await syncBrandFacts(admin, {
    profileId,
    analysisId,
    brandWide: citeerbaar.filter((f) => f.kind === "klant" || isProofPoint(f.text, proofPoints)),
    topicScoped: citeerbaar.filter((f) => f.kind !== "klant" && !isProofPoint(f.text, proofPoints)),
  });

  laatsteTegenspraken = contradictions;

  // Feiten die de bank niet haalde (schrijffout, of een dubbele sleutel) vallen
  // terug op hun oorspronkelijke vorm zonder id. Liever een kaart zonder
  // identiteit dan geen kaart: de schrijver heeft hem nodig, de identiteit is
  // een verbetering.
  const bankTeksten = new Set(uitBank.map((f) => f.text));
  const ontbrekend = citeerbaar
    .filter((f) => !bankTeksten.has(f.text))
    .map(({ text, source, allowed, citable }) => ({ id: null, text, source, allowed, citable }));

  const alles = [
    ...uitBank.map((f) => ({ ...f, kind: kindVan(f.source) })),
    ...ontbrekend.map((f) => ({ ...f, kind: kindVan(f.source) })),
    ...achtergrond.map(({ text, source, allowed, citable, kind }) => ({
      id: null,
      text,
      source,
      allowed,
      citable,
      kind,
    })),
  ];

  // Verboden achteraan nummeren maakt niets uit voor hun werking (die staan in
  // een eigen blok op de kaart), maar de bruikbare feiten houden zo de lage
  // nummers, en dat zijn de nummers waar de content naar verwijst.
  const gesorteerd = [...alles].sort(
    (a, b) =>
      // Citeerbaar eerst, zodat de F-nummers aaneengesloten lopen en de
      // achtergrond er zichtbaar buiten valt.
      Number(b.citable) - Number(a.citable) ||
      SOURCE_ORDER[a.kind] - SOURCE_ORDER[b.kind] ||
      Number(a.allowed) - Number(b.allowed),
  );

  return numberFacts(
    gesorteerd.map(({ id, text, source, allowed, citable }) => ({ id, text, source, allowed, citable })),
  );
}

/**
 * De bronsoort terugleiden uit de bronvermelding.
 *
 * De bank bewaart `kind` wel, maar de teruglezing hierboven haalt alleen op wat
 * de kaart nodig heeft. De sortering heeft `kind` nodig, en "klant, bevestigd
 * 29-07" is eenduidig genoeg om hem uit af te leiden. Dat scheelt een kolom in
 * elke query.
 */
function kindVan(source: string): FactSourceKind {
  if (source.startsWith("klant")) return "klant";
  if (source.startsWith("site")) return "site";
  return "onderzoek";
}

/** Is deze tekst een proof point van het profiel? Dan geldt hij merkbreed. */
function isProofPoint(text: string, proofPoints: string[]): boolean {
  return proofPoints.includes(text);
}

/**
 * De tegenspraken van de laatste opbouw.
 *
 * Bewust een modulevariabele en geen extra retourwaarde: `buildFactBase()` wordt
 * op vier plekken aangeroepen en die hebben op één na niets met tegenspraak te
 * maken. Wie ze wél wil (de briefing, om ze aan de klant te tonen) haalt ze hier
 * op, direct ná de aanroep.
 */
let laatsteTegenspraken: Contradiction[] = [];

export function lastContradictions(): Contradiction[] {
  return laatsteTegenspraken;
}
