import "server-only";

/**
 * De contentbriefing, de vragenronde vóór het schrijven
 * (contentbriefing.md, implementatieplan.md R5.1).
 *
 * Deze stap zit tussen "de klant kiest welke pagina's geschreven worden" en "de
 * app schrijft ze". Hij doet drie dingen:
 *
 *   1. de FEITENINDEX opbouwen, alles wat we met bron over deze klant weten
 *   2. de CLAIM-AUDIT draaien, welke beweringen heeft de pagina nodig, en welke
 *      daarvan kunnen we niet onderbouwen?
 *   3. van elk gat een VRAAG maken, ontdubbeld over de gekozen pagina's
 *
 * Daarna stopt de pijplijn bewust en wacht op de klant. Precies het patroon van
 * de review-gate tussen halte 2 en 3 (abcplan.md §3.6), toegepast op FASE C.
 *
 * ── WAAROM DIT DE BELANGRIJKSTE STAP VAN FASE C IS ──────────────────────────
 *
 * Niet vanwege de verzinsels alleen. De klant heeft interne kennis die nergens op
 * zijn site staat en die voor een AI-assistent dus onzichtbaar is: precieze
 * voorwaarden, aantallen, waarom klanten écht voor hem kiezen. Dat is exact het
 * materiaal waarmee zijn content zich onderscheidt van de generieke vergelijkers
 * die nu wél genoemd worden. De vragenronde is niet alleen een rem op
 * verzinsels; het is de belangrijkste bron van onderscheidend vermogen die we
 * hebben.
 *
 * Eén AI-aanroep per BATCH (mini, geen web_search): ongeveer $0,002, ongeacht
 * hoeveel pagina's de klant koos.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { ClaimAudit } from "@/lib/schemas/claim-audit";
import type { AuditedClaim, GeneralContextGap } from "@/lib/schemas/claim-audit";
import { buildFactBase, lastContradictions } from "@/lib/pipeline/factbase";
import {
  berekenInputCoverage,
  leesSectieVerwijzing,
  sectieVerwijzing,
} from "@/lib/pipeline/input-coverage";
import type { ContentContract } from "@/lib/schemas/content-contract";
import { describeContradictions } from "@/lib/pipeline/fact-merge";
import { formatFactCard, isSupported, claimKey, type FactItem } from "@/lib/pipeline/factcard";
import {
  selectBriefingQuestions,
  slotQuestions,
  positioningQuestion,
  MAX_QUESTIONS,
  type BriefingQuestion,
} from "@/lib/pipeline/briefing-select";
import { redactCompetitors, containsCompetitor } from "@/lib/pipeline/redact";
import type { RecommendationPayload } from "@/lib/jobs/types";
import type { BusinessModel, ContentType } from "@/lib/types/database";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Hoeveel van het winnende AI-antwoord er per doelvraag meegaat.
 *
 * Dit voedt de meest waardevolle vraagsoort, 'onderscheid' (contentbriefing.md
 * §5). We laten het model letterlijk zien wat de AI nu over de winnende partij
 * zegt, zodat het kan vragen: wat is jouw antwoord daarop? Dat is de enige
 * informatie die principieel niet uit een crawl te halen is.
 */
const ANSWER_EXCERPT_CHARS = 700;

const AUDIT_SYSTEM =
  "Je bent een kritische redacteur die vóór het schrijven controleert of een pagina waargemaakt " +
  "kan worden. Je schrijft GEEN tekst. " +
  "Je krijgt: (a) welke pagina's geschreven gaan worden en welke vraag elke pagina moet winnen, " +
  "(b) de INHOUDSOPGAVE die elke pagina nodig heeft, sectie voor sectie, met per sectie of hij " +
  "een uitspraak over dit bedrijf vraagt en of we die al hebben, (c) wat een AI-assistent nu " +
  "antwoordt op die vragen, en (d) een FEITENKAART met alles wat we met bron over dit bedrijf " +
  "weten. " +
  "OPDRACHT: noem de concrete BEWERINGEN die deze pagina's moeten doen om hun vraag geloofwaardig " +
  "te beantwoorden. Per bewering: wordt hij gedekt door een feit op de kaart (geef dan het " +
  "F-nummer), of niet? " +
  "HARDE REGELS: " +
  "(1) Verzin GEEN beweringen die je aannemelijk vindt. Noem alleen wat de pagina echt nodig heeft. " +
  "(2) Markeer een bewering ALLEEN als gedekt wanneer je een concreet F-nummer kunt noemen dat hem " +
  "echt dekt, EN in supportQuote het letterlijke fragment uit dat feit overneemt dat de bewering " +
  "dekt. Kun je die zin niet letterlijk aanwijzen, dan is de bewering NIET gedekt, hoe " +
  "aannemelijk hij ook is. Bij twijfel: niet gedekt. Een vraag te veel stellen kost de klant " +
  "dertig seconden; een verzonnen feit kost hem zijn geloofwaardigheid. " +
  "(3) Een feit onder 'MAG JE NIET BEWEREN' dekt niets: het verbiedt juist. Wat onder " +
  "'ACHTERGROND' staat dekt óók niets: dat is losse sitetekst zonder F-nummer, geen bevestigd " +
  "feit. Een bewering die je alleen op achtergrond kunt baseren is ONGEDEKT en wordt een vraag. " +
  "(4) Voor elke ONGEDEKTE bewering formuleer je de vraag die het gat dicht. Die vraag moet in " +
  "maximaal 30 seconden te beantwoorden zijn zonder iets op te zoeken, en gaat over ÉÉN feit. " +
  "Niet 'welke voorwaarden en opties biedt u?' maar 'zit pechhulp in het maandbedrag?'. " +
  "(5) Schrijf de vraag en de reden in gewone taal, gericht aan de ondernemer. Geen jargon, geen " +
  "verwijzing naar 'de analyse' of 'de doelvraag'. " +
  "(6) Heb je uit de gegeven informatie een waarschijnlijk antwoord, zet dat dan in suggestedAnswer " +
  "en maak er een verificatievraag van. Bevestigen is voor de klant veel goedkoper dan formuleren. " +
  "(7) importance 'kern' betekent: zonder dit feit kan de pagina zijn vraag niet eerlijk " +
  "beantwoorden. Wees streng: als alles kern is, is niets het. " +
  "(8) ÉÉN VRAAG PER ONDERWERP. Staat er een lijst 'AL GESTELDE VRAGEN', dan stel je die niet " +
  "opnieuw, ook niet net anders geformuleerd, ook niet als deelvraag. En stel binnen je eigen " +
  "antwoord nooit twee vragen die met hetzelfde antwoord beantwoord zouden worden: kies dan de " +
  "kortste. De klant krijgt er maar een handvol te zien; drie varianten van dezelfde vraag kosten " +
  "hem drie van die plekken en leveren één antwoord op. " +
  "(9) BEGIN BIJ DE INHOUDSOPGAVE. Elke sectie die gemarkeerd staat als 'GAAT OVER DIT BEDRIJF EN " +
  "WE HEBBEN ER NIETS VOOR' is een gat, en voor élk van die secties formuleer je precies één " +
  "bewering met de vraag die hem dicht. Zet in sectionId de code die bij die sectie staat, " +
  "letterlijk, dus bijvoorbeeld 'P2-s5'. Zeg in reason wat er met die sectie gebeurt zonder " +
  "antwoord, in gewone taal: 'zonder een bedrag blijft het stuk over de prijs leeg'. Een sectie " +
  "die als algemene uitleg staat gemarkeerd levert GEEN vraag op, en een sectie die al gedekt is " +
  "ook niet. Heb je daarnaast een bewering die niet uit een sectie komt, zet sectionId dan op " +
  "null. Verzin nooit een sectiecode die niet in de opdracht staat. " +
  "(10) NAAST de beweringen: vul ook generalContextGaps. Dat zijn GEEN beweringen over dit bedrijf, " +
  "dus geen F-nummer nodig, maar TERMEN die in een doelvraag, titel of feit van een pagina " +
  "voorkomen zonder dat hun betekenis ergens wordt uitgelegd (een keurmerk, een norm, een " +
  "technische of wettelijke term), en die de pagina aantoonbaar sterker maken als ze kort worden " +
  "toegelicht. `neededFor` verwijst naar dezelfde doelvraag als bij een bewering. Noem alleen " +
  "termen die een lezer zonder vakkennis nodig heeft om de pagina te begrijpen: een lege lijst is " +
  "de norm, geen uitzondering. En blijf hier ALGEMEEN: nooit een uitleg die eigenlijk een " +
  "bewering over dit specifieke bedrijf is, die hoort bij de beweringen hierboven.";

/**
 * De inhoudsopgave van één pagina, met per sectie of hij op een feit wacht.
 *
 * Dit is het blok dat de audit van een generieke claimlijst een gerichte
 * vragenlijst maakt (docs/tasks/vragen-voor-het-schrijven.md §5). Het model ziet
 * niet meer alleen "welke pagina moet gemaakt worden" maar "welke secties heeft
 * die pagina, welke daarvan gaan over dit bedrijf, en voor welke daarvan hebben
 * we niets". Daar hoort per ongedekte sectie precies één vraag bij.
 *
 * De secties krijgen een paginavoorvoegsel ("P2-s5"): elke pagina nummert zijn
 * eigen secties vanaf s1, dus zonder dat voorvoegsel wijst een teruggegeven
 * sectie-id nergens heen zodra er meer dan één pagina in de batch zit.
 */
function contractBlok(
  contract: ContentContract | null,
  paginaNummer: number,
  ongedekt: ReadonlySet<string>,
): string {
  const secties = contract?.sections ?? [];
  if (secties.length === 0) return "";
  return [
    "  De inhoudsopgave die deze pagina nodig heeft:",
    ...secties.map((sec) => {
      const stand = !sec.needsBrandFact
        ? "algemene uitleg, hier is geen feit over het bedrijf voor nodig"
        : ongedekt.has(sec.id)
          ? "GAAT OVER DIT BEDRIJF EN WE HEBBEN ER NIETS VOOR"
          : "gaat over dit bedrijf en is gedekt";
      return `    [P${paginaNummer}-${sec.id}] "${sec.heading}" (${stand})\n` +
        `        beantwoordt: ${sec.subQuestion}`;
    }),
  ].join("\n");
}

/** De doelvragen en het winnende antwoord per gekozen pagina. */
async function buildPageBlocks(
  admin: Admin,
  recommendations: RecommendationPayload[],
  pieceIds: string[],
  competitors: string[],
  /** Het contract per pagina, in dezelfde volgorde als `pieceIds`. */
  contracten: (ContentContract | null)[],
  /** De ongedekte sectie-id's per pagina, in dezelfde volgorde. */
  ongedekteSecties: ReadonlySet<string>[],
): Promise<string> {
  const runIds = recommendations
    .flatMap((rec) => rec.targets ?? [])
    .map((t) => t.runId)
    .filter((id): id is string => Boolean(id));

  const antwoordPerRun = new Map<string, string>();
  if (runIds.length > 0) {
    const { data } = await admin
      .from("tracking_runs")
      .select("id, raw_response")
      .in("id", Array.from(new Set(runIds)));
    for (const row of data ?? []) {
      antwoordPerRun.set(row.id as string, (row.raw_response as string | null) ?? "");
    }
  }

  return recommendations
    .map((rec, i) => {
      const targets = rec.targets ?? [];
      const doelvragen = targets.length
        ? targets.map((t) => `    - "${t.text}"`).join("\n")
        : "    (geen concrete doelvraag meegegeven)";

      // Concurrentnamen eruit: dit voedt straks een vraag aan de klant, en de
      // harde regel dat klantcontent nooit een concurrent noemt geldt ook voor
      // wat we de klant voorschotelen (optimalisatie.md 4.3).
      const winnend = targets
        .map((t) => (t.runId ? antwoordPerRun.get(t.runId) : null))
        .filter((a): a is string => Boolean(a?.trim()))
        .slice(0, 2)
        .map((a) => redactCompetitors(a, competitors).slice(0, ANSWER_EXCERPT_CHARS))
        .join("\n    ---\n");

      return [
        `PAGINA ${i + 1} [id: ${pieceIds[i]}]: "${rec.title}" (type: ${rec.type})`,
        `  Doel: ${rec.targetIntent || "onbekend"}`,
        `  Achtergrond: ${rec.why || "onbekend"}`,
        `  Moet deze vragen gaan winnen:`,
        doelvragen,
        contractBlok(contracten[i] ?? null, i + 1, ongedekteSecties[i] ?? new Set()),
        winnend ? `  Wat een AI-assistent nu antwoordt (concurrentnamen weggehaald):\n    """${winnend}"""` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

/**
 * Maakt de placeholder-rijen aan: gekozen, nog niet geschreven.
 *
 * Deze rijen zijn wat de Content Bibliotheek toont als "wacht op jouw input", en
 * hun id's zijn waar de vragen aan hangen (`fact_requests.content_piece_ids`).
 * Bestaat er al een rij met deze titel die nog niet geschreven is, dan wordt die
 * hergebruikt. Twee keer op "genereer" drukken mag geen twee pagina's opleveren.
 *
 * ── WAAROM DIT NU BUITEN `runBriefing` AANGEROEPEN WORDT ────────────────────
 *
 * Sinds de planstap vóór de briefing draait (docs/tasks/vragen-voor-het-schrijven.md
 * §3) moeten deze rijen er al zijn vóórdat de eerste plantaak begint: de
 * plantaak zoekt zijn pagina op met `currentPiece()` en hangt het contract
 * eraan. `planContentBriefing()` roept hem daarom aan, en `runBriefing` roept
 * hem daarna nóg eens aan. Dat is geen dubbel werk maar de idempotentie waar
 * deze functie voor gemaakt is: de tweede aanroep vindt dezelfde rijen terug.
 */
export async function ensureBriefingPieces(
  admin: Admin,
  analysisId: string,
  recommendations: RecommendationPayload[],
): Promise<string[]> {
  const ids: string[] = [];

  for (const rec of recommendations) {
    const { data: bestaand } = await admin
      .from("content_pieces")
      .select("id, status, version")
      .eq("analysis_id", analysisId)
      .eq("title", rec.title)
      .eq("is_current", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bestaand && (bestaand.status === "briefing" || bestaand.status === "draft")) {
      ids.push(bestaand.id as string);
      continue;
    }

    const { data: nieuw, error } = await admin
      .from("content_pieces")
      .insert({
        analysis_id: analysisId,
        report_id: rec.reportId,
        type: rec.type,
        title: rec.title,
        // De oorspronkelijke opdracht uit het rapport, apart van de titel. Bij
        // Udenhout waren titels instructies ("Maak een overzichtelijke pagina
        // met…") in plaats van koppen; door ze te scheiden kan het briefingscherm
        // de titel als bevestigingsvraag tonen zonder de opdracht kwijt te raken.
        brief_instruction: rec.why || null,
        action: rec.action,
        existing_url: rec.existingUrl,
        status: "briefing" as const,
        version: bestaand ? (bestaand.version as number) + 1 : 1,
        is_current: true,
        needs_review: false,
      })
      .select("id")
      .single();

    if (error || !nieuw) throw new Error(`Briefing-rij aanmaken mislukt: ${error?.message}`);
    if (bestaand) {
      await admin.from("content_pieces").update({ is_current: false }).eq("id", bestaand.id as string);
    }
    ids.push(nieuw.id as string);
  }

  return ids;
}

/** Claim-sleutels die we al kennen: beantwoord, of al als open vraag klaar. */
async function loadKnownClaimKeys(
  admin: Admin,
  profileId: string,
  analysisId: string,
): Promise<{ keys: Set<string>; questions: string[] }> {
  const { data } = await admin
    .from("fact_requests")
    .select("claim_key, question, status, scope, analysis_id")
    .eq("profile_id", profileId);

  const keys = new Set<string>();
  const questions: string[] = [];
  for (const row of data ?? []) {
    const status = row.status as string;
    // 'verlopen' hoort er NIET bij: een verlopen feit moet juist opnieuw
    // bevestigd worden (contentbriefing.md §7).
    if (status !== "open" && status !== "beantwoord" && status !== "overgeslagen") continue;
    const scope = row.scope as string;
    if (scope !== "merk" && row.analysis_id !== analysisId) continue;
    if (row.claim_key) keys.add(row.claim_key as string);
    // De vraagteksten gaan mee de audit in (R8.4): het model kan pas ophouden
    // met varianten verzinnen als het ziet wat er al gevraagd is.
    if (row.question) questions.push(row.question as string);
  }
  return { keys, questions };
}

/**
 * De positioneringsvraag opbouwen uit de concurrentprofielen (S4).
 *
 * `competitor_breakdown.attributes_json` (R4.2) bevat per concurrent de
 * eigenschap waaróp hij genoemd wordt, met een letterlijk citaat als bewijs:
 * "Zitting manuele therapie: €60,00 per sessie", "biedt fysiotherapie aan zonder
 * dat een verwijsbrief nodig is". Die zinnen stonden er al en werden nergens
 * gebruikt, `loadContentContext()` gooide zelfs alleen de eigenschapsnamen in de
 * schrijfprompt en liet het bewijs liggen.
 *
 * Namen gaan er dubbel uit: `redactCompetitors` haalt ze weg en
 * `containsCompetitor` controleert dat na. Een citaat dat ondanks beide nog een
 * naam bevat gaat niet mee, de harde regel dat klantcontent nooit een concurrent
 * noemt geldt ook voor wat we de klant voorschotelen.
 */
async function buildPositioningQuestion(
  admin: Admin,
  analysisId: string,
  pieceIds: string[],
  competitors: string[],
) {
  const { data: rows } = await admin
    .from("competitor_breakdown")
    .select("attributes_json")
    .eq("analysis_id", analysisId)
    .not("attributes_json", "is", null)
    .order("mentions_count", { ascending: false })
    .limit(8);

  // Eén bewijszin per eigenschap: drie keer "service" met net andere bewoording
  // maakt de vraag lang zonder hem scherper te maken.
  const perEigenschap = new Map<string, string>();
  for (const row of rows ?? []) {
    for (const attr of (row.attributes_json ?? []) as { attribute: string; evidence: string }[]) {
      if (!attr?.attribute?.trim() || !attr?.evidence?.trim()) continue;
      if (perEigenschap.has(attr.attribute)) continue;

      const schoon = redactCompetitors(attr.evidence.trim(), competitors);
      if (containsCompetitor(schoon, competitors)) continue;
      perEigenschap.set(attr.attribute, schoon);
    }
  }

  return positioningQuestion({
    evidence: Array.from(perEigenschap, ([attribute, evidence]) => ({ attribute, evidence })),
    contentPieceIds: pieceIds,
  });
}

export interface BriefingResult {
  contentPieceIds: string[];
  /** Antwoorden die elkaar tegenspreken, in gewone taal (migratie 0036). */
  contradictions?: string[];
  /** Aantal nieuw gestelde vragen. 0 = alles al bekend, er valt niets te vragen. */
  questions: number;
  facts: number;
}

/**
 * Draait de briefing voor één batch gekozen pagina's.
 *
 * Idempotent: bestaande briefing-rijen worden hergebruikt en vragen die al
 * gesteld zijn worden niet opnieuw gesteld. Een mislukte poging kan dus gewoon
 * opnieuw. Dat is wat de wachtrij doet.
 */
export async function runBriefing(args: {
  analysisId: string;
  recommendations: RecommendationPayload[];
}): Promise<BriefingResult> {
  const { analysisId, recommendations } = args;
  const admin = createAdminClient();

  const { data: analysis } = await admin
    .from("analyses")
    .select("id, profile_id, url, topic")
    .eq("id", analysisId)
    .single();
  if (!analysis) throw new Error(`Analyse ${analysisId} bestaat niet.`);
  const profileId = analysis.profile_id as string;

  const pieceIds = await ensureBriefingPieces(admin, analysisId, recommendations);

  // ── 1. De feitenindex ─────────────────────────────────────────────────────
  //
  // De doelvragen gaan mee sinds S1: zij bepalen wélke gecrawlde pagina's
  // relevant zijn, en dus welke feiten er überhaupt op de kaart kunnen komen.
  // Zonder dat argument koos `buildFactBase()` de eerste acht rijen uit de
  // database, bij Coolblue vier keer een navigatiepagina plus dezelfde vier in
  // het Engels, en geen van de tien gecrawlde wasmachinepagina's.
  const doelvragen = Array.from(
    new Set(
      recommendations
        .flatMap((rec) => rec.targets ?? [])
        .map((t) => t.text?.trim())
        .filter((t): t is string => Boolean(t)),
    ),
  );
  const facts = await buildFactBase(admin, profileId, analysisId, doelvragen);

  // Tegenspraken uit de feitenbank (migratie 0036). Twee antwoorden op dezelfde
  // vraag die elkaar uitsluiten belandden vóór 0036 allebei op de kaart, en dan
  // koos het model welk het aanhaalde. Nu wint het nieuwste, en zegt de app
  // erbij dát er iets omging, zodat de klant het kan nakijken.
  // Ze gaan hieronder mee in `briefing_snapshot_json` en komen zo op het
  // briefingscherm terecht; deze logregel is voor de ontwikkelaar, niet het
  // kanaal naar de klant.
  const tegenspraken = describeContradictions(lastContradictions());
  if (tegenspraken.length > 0) {
    console.log(`Briefing ${analysisId}: ${tegenspraken.length} tegenspraken, ${tegenspraken.join(" | ")}`);
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("brand_name, industry, business_model")
    .eq("id", profileId)
    .maybeSingle();
  const { data: topic } = await admin
    .from("topic_research")
    .select("competitors")
    .eq("analysis_id", analysisId)
    .maybeSingle();
  const competitors = ((topic?.competitors as string[] | null) ?? []).filter(Boolean);

  // ── De contracten van de plantaken (docs/tasks/vragen-voor-het-schrijven.md §3) ──
  //
  // Ze liggen er al: `planContentBriefing()` start één `content_plan` per pagina
  // en de laatste daarvan start deze briefing. Een pagina zonder contract is
  // geen fout maar een terugval: de plantaak kan bij de laatste poging bewust
  // doorgaan zonder contract. Die pagina krijgt dan geen dekkingsmeting en geen
  // sectiegerichte vragen, precies het gedrag van vóór 2 september 2026.
  const { data: contractRijen } = await admin
    .from("content_pieces")
    .select("id, contract_json")
    .in("id", pieceIds);

  const contractPerPagina = new Map<string, ContentContract | null>(
    ((contractRijen ?? []) as { id: string; contract_json: unknown }[]).map((r) => [
      r.id,
      (r.contract_json ?? null) as ContentContract | null,
    ]),
  );
  const contracten = pieceIds.map((id) => contractPerPagina.get(id) ?? null);

  // ── De onderbouwingsgraad per pagina ──────────────────────────────────────
  //
  // Welk deel van de secties dat iets over dit bedrijf moet zeggen, dat ook kan.
  // Dit getal doet vanaf hier drie dingen: het bepaalt welke secties een vraag
  // opleveren, het weegt mee in welke vragen de klant te zien krijgt, en het is
  // wat de inputpoort straks afweegt.
  const dekking = contracten.map((c) => berekenInputCoverage(c, facts));
  const ongedekteSecties = dekking.map((d) => new Set(d.ongedekt.map((sec) => sec.id)));
  const graadPerPagina = new Map<string, number | null>(
    pieceIds.map((id, i) => [id, dekking[i].graad]),
  );

  for (const [i, pieceId] of pieceIds.entries()) {
    console.log(
      `Briefing ${analysisId}: pagina "${recommendations[i].title}" heeft ` +
        `${dekking[i].merksecties} secties over dit bedrijf, waarvan ${dekking[i].gedekt} gedekt ` +
        `(onderbouwingsgraad ${dekking[i].graad === null ? "niet van toepassing" : `${dekking[i].graad}%`}).`,
    );
    await admin
      .from("content_pieces")
      .update({ input_coverage: dekking[i].graad })
      .eq("id", pieceId);
  }

  const pageBlocks = await buildPageBlocks(
    admin,
    recommendations,
    pieceIds,
    competitors,
    contracten,
    ongedekteSecties,
  );

  // Wat er al gevraagd is, moet de audit weten (R8.4). Zonder deze lijst kan het
  // model niet zien dat het bezig is een variant te formuleren van een vraag die
  // er al staat, bij Fysi-Unique leverde dat 17 vragen op voor 5 à 6 werkelijke
  // onderwerpen. De code ontdubbelt achteraf nog steeds (dat blijft het vangnet),
  // maar het is goedkoper om de dubbele vraag niet te laten ontstaan.
  const bekend = await loadKnownClaimKeys(admin, profileId, analysisId);

  // ── 2. De claim-audit (één mini-aanroep voor de hele batch) ───────────────
  const auditInput = [
    `Bedrijf: ${(profile?.brand_name as string | null) ?? analysis.url}`,
    `Branche: ${(profile?.industry as string | null) ?? "onbekend"}`,
    `Onderwerp van deze analyse: ${analysis.topic as string}`,
    "",
    pageBlocks,
    "",
    formatFactCard(facts),
    bekend.questions.length > 0
      ? [
          "",
          "AL GESTELDE VRAGEN: stel deze niet opnieuw, ook niet in andere bewoordingen:",
          ...bekend.questions.slice(0, 30).map((v) => `  • ${v}`),
        ].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const audit = await callStructured({
    model: MODELS.quality,
    system: AUDIT_SYSTEM,
    user: auditInput,
    schema: ClaimAudit,
    schemaName: "claim_audit",
    webSearch: false,
    work: "deterministic",
    meta: { kind: "claim_audit", analysisId, profileId },
  });

  // ── 3. Dekking in CODE bepalen, niet door het model ───────────────────────
  //
  // Het model mag zichzelf niet vrijpleiten (contentbriefing.md §3.2). Zegt het
  // `supported: true` maar wijst `sourceRef` nergens naar op de kaart, dan is de
  // claim onbewezen. Anders verdwijnt juist de vraag die het gat moest dichten.
  const ongedekt = audit.parsed.claims.filter(
    (c) => !isSupported(c.sourceRef, facts, c.supportQuote) && Boolean(c.questionIfMissing?.trim()),
  );
  const zelfverklaard = audit.parsed.claims.filter(
    (c) => c.supported && !isSupported(c.sourceRef, facts, c.supportQuote),
  ).length;
  if (zelfverklaard > 0) {
    console.log(
      `Briefing ${analysisId}: ${zelfverklaard} van de ${audit.parsed.claims.length} beweringen ` +
        `noemde zichzelf onderbouwd zonder geldig F-nummer; die tellen als onbewezen.`,
    );
  }

  // ── 4. Van gaten naar vragen ─────────────────────────────────────────────
  //
  // Het model geeft niet betrouwbaar terug bij wélke pagina een claim hoort,
  // dus koppelen we op de pagina waarvan de doelvraag in `neededFor` genoemd
  // wordt.
  const treffersVoor = (neededFor: string): string[] =>
    recommendations
      .map((rec, i) => ({ rec, id: pieceIds[i] }))
      .filter(({ rec }) =>
        (rec.targets ?? []).some((t) => neededFor.toLowerCase().includes(t.text.toLowerCase().slice(0, 30))),
      )
      .map(({ id }) => id);

  // Geen match: alle pagina's, want dit wordt een VRAAG aan de klant, en die
  // eenmalig aan de verkeerde pagina('s) koppelen kost hooguit een dubbele
  // vraag. Nooit weglaten: een gemiste vraag levert een verzonnen feit op.
  const paginaVanClaim = (neededFor: string): string[] => {
    const treffers = treffersVoor(neededFor);
    return treffers.length > 0 ? treffers : pieceIds;
  };

  // ── S10: dezelfde koppeling, maar STRIKT voor de context-gaten (S9) ────────
  //
  // Een context-gat wordt geen vraag aan de klant; het wordt rechtstreeks een
  // "zoek dit op"-opdracht aan de schrijver van de pagina('s) waaraan hij
  // hangt. Zou dit ook naar "alle pagina's" terugvallen bij een gemiste match,
  // dan krijgt een pagina over levertijd de opdracht om een certificering uit
  // een heel andere aanbeveling te gaan uitleggen: precies de clusterbrede lek
  // die S9 moest dichten, nu via de terugvalroute terug. Bij geen match dus
  // GEEN pagina's: een gat dat nergens aan te koppelen is, laten we vallen in
  // plaats van te verspreiden. Onbekend is hier de veilige kant, niet overal.
  const paginaVanGat = (neededFor: string): string[] => treffersVoor(neededFor);

  // ── De SECTIE achter een vraag (docs/tasks/vragen-voor-het-schrijven.md §5) ──
  //
  // Het model geeft "P2-s5" terug: pagina 2, sectie s5. Dat is een veel hardere
  // koppeling dan `neededFor`, want die matcht op de eerste dertig tekens van
  // een doelvraag en kan er dus naast zitten. Klopt de code niet (een verzonnen
  // sectie, een pagina die niet bestaat, een sectie die niet in dat contract
  // staat), dan negeren we hem en valt de koppeling terug op `neededFor`:
  // liever geen sectie dan de verkeerde, want de verkeerde sectie zou bij
  // overslaan uit een pagina verdwijnen die er niets mee te maken had
  // (conventie 3).
  const sectieVanClaim = (
    ruw: string | null,
  ): { pieceId: string; sectionId: string } | null => {
    const gelezen = leesSectieVerwijzing(ruw);
    if (!gelezen) return null;
    const pieceId = pieceIds[gelezen.paginaIndex];
    if (!pieceId) return null;
    const contract = contractPerPagina.get(pieceId) ?? null;
    const bestaat = (contract?.sections ?? []).some((sec) => sec.id === gelezen.sectionId);
    return bestaat ? { pieceId, sectionId: gelezen.sectionId } : null;
  };

  const kandidaten: BriefingQuestion[] = ongedekt.map((c) => {
    const sectie = sectieVanClaim(c.sectionId);
    return {
      claimKey: claimKey(c.claim),
      question: c.questionIfMissing!.trim(),
      reason: c.reason,
      kind: c.kind,
      answerType: c.answerType,
      options: c.options,
      suggestedAnswer: c.suggestedAnswer,
      required: c.importance === "kern",
      scope: c.scope,
      // Wijst de sectie naar één pagina, dan is dát de pagina. Dat is preciezer
      // dan de tekstvergelijking op `neededFor`, die bij geen match op ALLE
      // pagina's van de batch terugvalt.
      contentPieceIds: sectie ? [sectie.pieceId] : paginaVanClaim(c.neededFor),
      sectionRefs: sectie ? [sectieVerwijzing(sectie.pieceId, sectie.sectionId)] : [],
      priority: c.importance === "kern" ? 2 : 1,
    };
  });

  // De vaste slots per type erbij (contentbriefing.md §3.3), afgestemd op het
  // bedrijfsmodel (R8.5): een platform of keten krijgt geen adres-/telefoonvraag
  // die hij niet naar waarheid kan beantwoorden.
  const businessModel = (profile?.business_model as BusinessModel | null) ?? null;
  for (const [i, rec] of recommendations.entries()) {
    kandidaten.push(
      ...slotQuestions(rec.type as ContentType, pieceIds[i], rec.existingUrl, businessModel),
    );
  }

  // De positioneringsvraag erbij (S4). Deze kán niet uit de claim-audit komen,
  // die kent alleen dekkingsgaten, en werd daardoor 0 van de 62 keer gesteld,
  // waardoor de R8.8-controle op een lege verzameling draaide.
  const positionering = await buildPositioningQuestion(admin, analysisId, pieceIds, competitors);
  if (positionering) kandidaten.push(positionering);

  const gekozen = selectBriefingQuestions({
    candidates: kandidaten,
    alreadyKnown: bekend.keys,
    graadPerPagina,
  });

  if (kandidaten.length > gekozen.length + bekend.keys.size) {
    console.log(
      `Briefing ${analysisId}: ${kandidaten.length} kandidaatvragen teruggebracht tot ` +
        `${gekozen.length} (grens ${MAX_QUESTIONS}). De rest komt bij een volgende batch terug.`,
    );
  }

  // ── 5. Wegschrijven ──────────────────────────────────────────────────────
  //
  // Eén voor één en fouttolerant: de unieke index op (analyse, claim_key) is
  // PARTIEEL (alleen status 'open'), dus `.upsert(..., { onConflict })` kan hem
  // niet als doel gebruiken, Postgres eist daar dezelfde WHERE-clausule. Botst
  // hij toch, dan staat de vraag er al en is er niets aan de hand.
  let geschreven = 0;
  for (const vraag of gekozen) {
    const { error } = await admin.from("fact_requests").insert({
      profile_id: profileId,
      analysis_id: vraag.scope === "merk" ? null : analysisId,
      question: vraag.question,
      reason: vraag.reason,
      status: "open",
      scope: vraag.scope,
      content_piece_ids: vraag.contentPieceIds,
      kind: vraag.kind,
      answer_type: vraag.answerType,
      options: vraag.options,
      suggested_answer: vraag.suggestedAnswer,
      required: vraag.required,
      claim_key: vraag.claimKey,
      // De secties die op dit antwoord wachten (migratie 0083). Slaat de klant
      // de vraag over, dan vervallen precies deze secties en wordt de pagina
      // korter in plaats van vager.
      section_refs: vraag.sectionRefs ?? [],
      raw_json: audit.raw as never,
    });
    if (!error) geschreven++;
    else if (!error.message.includes("duplicate key")) {
      console.warn(`Briefingvraag opslaan mislukt (${vraag.claimKey}): ${error.message}`);
    }
  }

  // De feitenkaart bevriezen op de gekozen pagina's, net als prompt_text_snapshot
  // (abcplan.md §5): wijzigt de klant later een feit, dan blijft achterhaalbaar
  // op basis waarvan de bestaande pagina destijds geschreven is.
  //
  // De AANBEVELING gaat mee in dezelfde snapshot, en dat is geen bijvangst: de
  // doelvragen (welke gemiste vraag deze pagina moet winnen, R4.1) zitten niet
  // in de kolommen van content_pieces. Zonder ze hier te bewaren zou de
  // schrijftaak die de klant straks start ze kwijt zijn, en dan schrijft de app
  // weer een pagina zonder te weten welke vraag hij moet winnen. Precies het
  // gat dat fase 4 dichtte.
  for (const [i, pieceId] of pieceIds.entries()) {
    await admin
      .from("content_pieces")
      .update({
        briefing_snapshot_json: {
          facts,
          // ── HET PAGINAPLAN BEWAREN (S2) ────────────────────────────────
          //
          // De audit rekent per pagina uit WELKE beweringen hij nodig heeft en
          // waaróm. Tot nu toe gebruikten we daar alleen de GATEN van (om vragen
          // te stellen) en verdween de rest. Gemeten over de vijf testcases: 31
          // beweringen, waarvan 19 door het model onderbouwd geacht, allemaal
          // weggegooid, terwijl dat precies het skelet is waarmee de schrijver
          // zou moeten beginnen.
          //
          // `draftContentPiece()` rekent dit plan vlak vóór het schrijven
          // opnieuw door tegen de dan-geldende feiten, inclusief de antwoorden
          // die de klant ná de briefing gaf.
          plan: audit.parsed.claims.filter((c) => paginaVanClaim(c.neededFor).includes(pieceId)),
          // ── DE ALGEMENE CONTEXT-GATEN BEWAREN (S9, terugvalroute aangescherpt S10) ──
          //
          // Zelfde koppeling als het paginaplan hierboven, maar met `paginaVanGat()`
          // in plaats van `paginaVanClaim()`: bij geen match GEEN pagina's, niet
          // "alle pagina's van de batch". Per pagina, niet clusterbreed, want de
          // aanbevelingen in één analyse lopen soms sterk uiteen van onderwerp.
          // `draftContentPiece()` gebruikt dit om gericht te zoeken naar uitleg van
          // precies de termen die DEZE pagina nodig heeft, in plaats van op een
          // blinde vuistregel over het totaal aantal feiten van de klant.
          generalContextGaps: (audit.parsed.generalContextGaps ?? []).filter((g) =>
            paginaVanGat(g.neededFor).includes(pieceId),
          ),
          recommendation: recommendations[i],
          // ── DE TEGENSPRAKEN BEWAREN (S8) ───────────────────────────────
          //
          // Ze werden berekend en alleen gelogd. Precies het patroon dat dit
          // hele traject drie keer eerder opleverde (de antwoorden van de klant
          // in R8.1, het paginaplan in S2, de aanbeveling in de snapshot). Een
          // uitkomst die nergens landt bestaat voor de klant niet.
          //
          // Ze horen in de snapshot en niet in een eigen kolom, want ze zijn
          // waar op het moment van de briefing: dít zag de app toen het model
          // twee uitspraken over hetzelfde onderwerp tegenkwam. De lijst is
          // analysebreed en staat dus op elke pagina van deze batch gelijk; het
          // briefingscherm ontdubbelt hem.
          contradictions: tegenspraken,
          generatedAt: new Date().toISOString(),
        } as never,
      })
      .eq("id", pieceId);
  }

  return {
    contentPieceIds: pieceIds,
    questions: geschreven,
    facts: facts.length,
    contradictions: tegenspraken,
  };
}

/** De bevroren feitenkaart van een pagina teruglezen (voor het schrijven, R5.3). */
export function factsFromSnapshot(snapshot: unknown): FactItem[] {
  const snap = (snapshot ?? {}) as { facts?: unknown };
  if (!Array.isArray(snap.facts)) return [];
  return snap.facts.filter(
    (f): f is FactItem =>
      Boolean(f) && typeof (f as FactItem).ref === "string" && typeof (f as FactItem).text === "string",
  );
}

/**
 * De tegenspraken uit de snapshot teruglezen (S8).
 *
 * Leeg bij een briefing van vóór S8, of bij een batch waarin niets omging, en
 * dat laatste is het normale geval. Alleen de tegenspraken die de klant aangaan
 * staan erin: `describeContradictions()` filtert de sitewijzigingen er al uit,
 * want een site die verandert is meestal gewoon een update.
 */
export function contradictionsFromSnapshot(snapshot: unknown): string[] {
  const snap = (snapshot ?? {}) as { contradictions?: unknown };
  if (!Array.isArray(snap.contradictions)) return [];
  return snap.contradictions.filter((c): c is string => typeof c === "string" && c.trim().length > 0);
}

/**
 * Het paginaplan uit de snapshot teruglezen (S2).
 *
 * Leeg bij een pagina van vóór S2, of bij een briefing die strandde vóór het
 * wegschrijven. De schrijver valt dan terug op het oude gedrag: doelvragen +
 * feitenkaart, zonder skelet. Minder goed, niet stuk, zelfde afspraak als bij
 * `recommendationFromSnapshot()`.
 */
export function planFromSnapshot(snapshot: unknown): AuditedClaim[] {
  const snap = (snapshot ?? {}) as { plan?: unknown };
  if (!Array.isArray(snap.plan)) return [];
  return snap.plan.filter(
    (c): c is AuditedClaim =>
      Boolean(c) &&
      typeof (c as AuditedClaim).claim === "string" &&
      typeof (c as AuditedClaim).neededFor === "string",
  );
}

/**
 * De algemene context-gaten van deze pagina uit de snapshot teruglezen (S9).
 *
 * Leeg bij een pagina van vóór S9, of bij een briefing die strandde vóór het
 * wegschrijven. De schrijver valt dan terug op zijn oude gedrag: geen gerichte
 * zoekopdracht, wel nog steeds de generieke vuistregel bij een dunne kaart.
 * Zelfde afspraak als bij `planFromSnapshot()`.
 */
export function generalContextGapsFromSnapshot(snapshot: unknown): GeneralContextGap[] {
  const snap = (snapshot ?? {}) as { generalContextGaps?: unknown };
  if (!Array.isArray(snap.generalContextGaps)) return [];
  return snap.generalContextGaps.filter(
    (g): g is GeneralContextGap =>
      Boolean(g) &&
      typeof (g as GeneralContextGap).term === "string" &&
      typeof (g as GeneralContextGap).neededFor === "string",
  );
}

/**
 * De bevroren aanbeveling teruglezen, inclusief de doelvragen.
 *
 * Geeft null als de snapshot er niet is (een pagina van vóór R5.1, of een
 * briefing die halverwege strandde). De aanroeper valt dan terug op de kolommen
 * van de rij zelf; dat levert een pagina zonder doelvragen op, wat minder goed
 * is maar niet kapot.
 */
export function recommendationFromSnapshot(snapshot: unknown): RecommendationPayload | null {
  const snap = (snapshot ?? {}) as { recommendation?: unknown };
  const rec = snap.recommendation as RecommendationPayload | undefined;
  return rec && typeof rec.title === "string" ? rec : null;
}
