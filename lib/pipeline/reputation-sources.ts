import "server-only";

/**
 * Blok C: waar AI het vandaan haalt (§4.5).
 *
 * ── ⚠️ "ZOEK OP GOOGLE REVIEWS" KAN NIET ZOALS HET KLINKT ───────────────────
 *
 * Google heeft geen open API voor reviews van willekeurige bedrijven, en de app
 * heeft geen sleutel voor de Business Profile API. Wat wél kan, in deze volgorde:
 *
 *   C1  web-zoeken via het model. Dat vindt in de praktijk de Google-vermelding,
 *       Trustpilot, Klantenvertellen, Feedback Company en de branchespecifieke
 *       platforms. Het model geeft platform, URL, cijfer en aantal terug.
 *   C2  op welke onafhankelijke sites het merk genoemd wordt.
 *   C3  alle URL's die in ELK antwoord van deze run zijn aangehaald, gegroepeerd
 *       op domein. Geen AI, puur tellen.
 *   C4  de gevonden reviewpagina's door de eigen crawler plus de JSON-LD-oogst.
 *       Geen AI, wel netwerk, en gratis.
 *   C5  één aanroep die alle overgebleven domeinen indeelt. Eén aanroep voor de
 *       hele lijst, niet één per domein, precies zoals `offsite/presence.ts`.
 *
 * ── EEN CIJFER UIT EEN MODEL IS EEN GOK TOT HET BEWEZEN IS ──────────────────
 *
 * Dat is de reden dat C4 bestaat. Levert de crawl `aggregateRating` op, dan
 * staat de bron op BEVESTIGD. Zo niet, dan staat hij er als ONBEVESTIGD, met die
 * kwalificatie zichtbaar op het scherm. Weggooien zou informatie vernietigen; als
 * feit opslaan zou liegen.
 *
 * ⚠️ Wat je hiermee NIET krijgt: de tekst van individuele reviews, en dus ook
 * geen eigen sentimentanalyse over die teksten. Google's reviewpagina's zijn
 * niet zonder JavaScript te lezen. Wat we meten is wat AI OVER die reviews zegt,
 * plus het cijfer waar dat op rust. Dat is precies de vraag die de opdracht
 * stelt, maar het is nadrukkelijk niet hetzelfde als een reviewanalyse.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  askAndStore,
  budgetAllows,
  loadContext,
  type ReputationContext,
} from "@/lib/pipeline/reputation-context";
import { bumpDone } from "@/lib/pipeline/reputation-brand";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { ReputationRatings, ReputationSourceKinds } from "@/lib/schemas/reputation";
import { fetchText } from "@/lib/crawler";
import { harvestStructuredData } from "@/lib/pipeline/structured-data";
import { domainOf } from "@/lib/offsite/domain";
import { textContainsName } from "@/lib/entities/normalize";
import {
  knownKind,
  tallySources,
  ratingIsAcceptable,
  type CitedSource,
} from "@/lib/reputation/sources";
import type {
  ReputationAnswer,
  ReputationSourceKind,
} from "@/lib/types/database";

type Admin = SupabaseClient;

/**
 * Hoeveel reviewpagina's we daadwerkelijk ophalen.
 *
 * De crawl is gratis maar niet vrij: elke pagina is een netwerkverzoek met een
 * time-out, en deze taak moet in één werker-aanroep passen. Zes dekt in de
 * praktijk elk platform dat er bij een MKB-bedrijf toe doet.
 */
const MAX_VERIFY = 6;

/** Hoeveel domeinen we ter indeling voorleggen. Meer is een lijst, geen advies. */
const MAX_CLASSIFY = 15;

export interface SourcesResult {
  domains: number;
  verified: number;
}

export async function runSourcesBlock(admin: Admin, runId: string): Promise<SourcesResult> {
  const ctx = await loadContext(admin, runId);
  if (!ctx) throw new Error(`Reputatierun ${runId} niet gevonden.`);

  if (!(await budgetAllows(admin, ctx.run, "sources"))) {
    return { domains: 0, verified: 0 };
  }

  const merk = ctx.brandName;
  const plaats = ctx.region ? ` in ${ctx.region}` : "";
  const uitsluiting = ctx.disambiguation ? ` ${ctx.disambiguation}` : "";

  // ── C1 en C2 ──────────────────────────────────────────────────────────────
  const [c1, c2] = await Promise.allSettled([
    askAndStore(admin, ctx, {
      block: "bron",
      offeringId: null,
      repeatIndex: 0,
      webSearch: true,
      question:
        `Welke beoordelingen en reviews staan er online over ${merk}${plaats}? Noem per platform ` +
        `de naam, de URL, het cijfer en het aantal beoordelingen. Weet je het niet zeker, zeg dat ` +
        `dan.` + uitsluiting,
    }),
    askAndStore(admin, ctx, {
      block: "bron",
      offeringId: null,
      repeatIndex: 1,
      webSearch: true,
      question:
        `Op welke onafhankelijke websites, vakmedia of vergelijkers wordt ${merk}${plaats} ` +
        `genoemd?` + uitsluiting,
    }),
  ]);

  if (c1.status === "rejected") console.error(`Reviewvraag mislukt in run ${runId}:`, c1.reason);
  if (c2.status === "rejected") console.error(`Bronnenvraag mislukt in run ${runId}:`, c2.reason);

  // ── C3: alle aangehaalde URL's van de HELE run, puur tellen ───────────────
  //
  // Dit blok draait als laatste vóór de synthese, dus de antwoorden van blok A,
  // B en V staan er al. Daarom telt hij over alles heen en niet alleen over zijn
  // eigen twee vragen: de bronnen die AI bij een dienstvraag aanhaalt zijn even
  // veel waard als die bij de reviewvraag.
  const { data: alleAntwoorden } = await admin
    .from("reputation_answers")
    .select("block, cited_urls")
    .eq("run_id", runId);

  const eigenDomein = domainOf(ctx.profile.url);
  const geteld = tallySources(
    ((alleAntwoorden ?? []) as { block: string; cited_urls: string[] }[]).map((a) => ({
      block: a.block,
      urls: a.cited_urls ?? [],
    })),
    eigenDomein,
  );

  // ── C4: de cijfers controleren met de eigen crawler ───────────────────────
  const kandidaten =
    c1.status === "fulfilled"
      ? await readRatings(ctx, c1.value.answer)
      : [];
  const bevestigd = await verifyRatings(kandidaten.slice(0, MAX_VERIFY), merk);

  // ── C5: wat code niet zeker weet, laat het model indelen ──────────────────
  const soorten = await classifyDomains(ctx, geteld.slice(0, MAX_CLASSIFY), eigenDomein);

  // ── Opslaan ───────────────────────────────────────────────────────────────
  const rijen = geteld.map((s) => {
    const cijfer = bevestigd.get(s.domain);
    return {
      run_id: runId,
      domain: s.domain,
      kind:
        knownKind(s.domain, eigenDomein) ??
        soorten.get(s.domain) ??
        ("overig" as ReputationSourceKind),
      citations: s.citations,
      url: cijfer?.url ?? s.url,
      rating: cijfer?.rating ?? null,
      rating_count: cijfer?.count ?? null,
      verified: cijfer?.verified ?? false,
      first_seen_block: s.firstSeenBlock,
    };
  });

  if (rijen.length > 0) {
    const { error } = await admin
      .from("reputation_sources")
      .upsert(rijen, { onConflict: "run_id,domain" });
    if (error) throw new Error(`Bronnen opslaan mislukt voor run ${runId}: ${error.message}`);
  }

  await bumpDone(admin, runId);
  return { domains: rijen.length, verified: rijen.filter((r) => r.verified).length };
}

interface RatingCandidate {
  domain: string;
  url: string;
  rating: number;
  count: number | null;
}

/**
 * Leest de reviewcijfers uit het C1-antwoord.
 *
 * ⚠️ Het vangnet op C1 (§4.5): een cijfer zonder URL wordt weggegooid, en een URL
 * op een onbekend domein moet bij het ophalen de merknaam bevatten. Het model
 * levert de kandidaat, de code besluit. Hetzelfde patroon als
 * `validate-claims.ts`.
 */
async function readRatings(
  ctx: ReputationContext,
  answer: ReputationAnswer,
): Promise<RatingCandidate[]> {
  let parsed: ReputationRatings;
  try {
    const r = await callStructured({
      model: MODELS.volume,
      system:
        "Je leest een antwoord over online beoordelingen van een bedrijf en zet dat om in een " +
        "structuur. Neem alleen over wat er letterlijk staat. Staat er geen cijfer of geen URL " +
        "bij een platform, vul dan 0 respectievelijk een lege tekst in. Verzin nooit een URL of " +
        "een cijfer. Antwoord in het Nederlands.",
      user: answer.answer_text ?? "",
      schema: ReputationRatings,
      schemaName: "reputation_ratings",
      webSearch: false,
      work: "deterministic",
      meta: {
        kind: "reputation_ratings",
        profileId: ctx.profile.id,
        reputationRunId: ctx.run.id,
      },
    });
    parsed = r.parsed;
  } catch (err) {
    // Faalt zacht: zonder cijfers staan de bronnen er gewoon zonder, en dat is
    // een correcte uitkomst. De hele bronnenstap laten mislukken zou de run
    // kosten voor een verrijking.
    console.warn(`Reviewcijfers uitlezen mislukt in run ${ctx.run.id}:`, err);
    return [];
  }

  const uit: RatingCandidate[] = [];
  for (const p of parsed.platforms) {
    const url = p.url?.trim() ?? "";
    const domein = url ? domainOf(url) : null;
    if (!domein) continue;
    if (p.cijfer <= 0) continue;
    // Ook `zeker: false` gaat mee: dat wordt straks onbevestigd, en dat is een
    // andere uitkomst dan niets. Niet meenemen zou de klant het verschil tussen
    // "er is niets" en "we konden het niet hard maken" onthouden.
    uit.push({
      domain: domein,
      url,
      rating: p.cijfer,
      count: p.aantal > 0 ? Math.trunc(p.aantal) : null,
    });
  }
  return uit;
}

/**
 * Haalt elke gevonden reviewpagina op en kijkt of er een hard cijfer op staat.
 *
 * Gratis (de eigen crawler) en zonder AI. Levert de JSON-LD-oogst een
 * `aggregateRating` op, dan staat het cijfer vast en gaat de bron op bevestigd.
 * Anders blijft hij staan als onbevestigd, met die chip op het scherm.
 */
async function verifyRatings(
  candidates: RatingCandidate[],
  brandName: string,
): Promise<Map<string, { url: string; rating: number; count: number | null; verified: boolean }>> {
  const uit = new Map<
    string,
    { url: string; rating: number; count: number | null; verified: boolean }
  >();

  const resultaten = await Promise.allSettled(
    candidates.map(async (c) => {
      const html = await fetchText(c.url);
      // Null betekent: niet opgehaald. Dat is iets anders dan "de merknaam staat
      // er niet op", en `ratingIsAcceptable` behandelt het ook zo.
      const noemtMerk = html === null ? null : textContainsName(html, brandName);

      if (!ratingIsAcceptable({ url: c.url, rating: c.rating, pageMentionsBrand: noemtMerk })) {
        return null;
      }

      const hard = html ? readAggregateRating(html) : null;
      return {
        domain: c.domain,
        // Het HARDE cijfer wint van het cijfer uit het model. Staat er JSON-LD,
        // dan is dat wat er werkelijk op de pagina stond.
        rating: hard?.rating ?? c.rating,
        count: hard?.count ?? c.count,
        url: c.url,
        verified: hard !== null,
      };
    }),
  );

  for (const r of resultaten) {
    if (r.status !== "fulfilled" || r.value === null) continue;
    const bestaand = uit.get(r.value.domain);
    // Bij twee vondsten op hetzelfde domein wint de bevestigde.
    if (!bestaand || (!bestaand.verified && r.value.verified)) {
      uit.set(r.value.domain, r.value);
    }
  }
  return uit;
}

/**
 * Leest `aggregateRating` uit de JSON-LD van een pagina.
 *
 * `harvestStructuredData()` levert die als één regel op, in de vorm
 * `"4.6 (128 beoordelingen)"`. Die vorm hier terugparsen is minder mooi dan een
 * eigen extractie, maar wél de enige manier waarop dit dezelfde JSON-LD-lezer
 * gebruikt als de rest van de app. Twee lezers van hetzelfde formaat lopen
 * gegarandeerd uit elkaar (conventie P2).
 */
export function readAggregateRating(html: string): { rating: number; count: number | null } | null {
  const oogst = harvestStructuredData(html);
  const feit = oogst.facts.find((f) => f.key === "beoordeling");
  if (!feit) return null;

  const m = /^([\d.,]+)(?:\s*\((\d+)\s)?/.exec(feit.value.trim());
  if (!m) return null;

  const rating = Number(m[1].replace(",", "."));
  if (!Number.isFinite(rating) || rating <= 0) return null;

  return { rating, count: m[2] ? Number(m[2]) : null };
}

/**
 * Deelt de domeinen in die code niet zeker weet.
 *
 * ⚠️ Eén aanroep voor de hele lijst. Tien domeinen los voorleggen kost tien keer
 * zoveel als ze samen voorleggen, en de web-zoekactie is hier niet eens nodig:
 * "is nu.nl vakpers" is kennis die in het model zit.
 *
 * De lijst in `lib/reputation/sources.ts` wint altijd van het model. Zegt het
 * model dat trustpilot.com vakpers is, dan is dat een fout die wij kunnen
 * voorkomen en dus voorkomen we hem.
 */
async function classifyDomains(
  ctx: ReputationContext,
  sources: CitedSource[],
  ownDomain: string | null,
): Promise<Map<string, ReputationSourceKind>> {
  const onbekend = sources.filter((s) => knownKind(s.domain, ownDomain) === null);
  if (onbekend.length === 0) return new Map();

  try {
    const r = await callStructured({
      model: MODELS.volume,
      system:
        "Je deelt websites in naar soort. Kies per domein: 'review' (een platform waar klanten " +
        "beoordelingen achterlaten), 'vakpers' (nieuws of vakmedia), 'sociaal' (een sociaal " +
        "netwerk), 'register' (een officieel register of overheidsbron) of 'overig'. " +
        "Weet je het niet, kies 'overig'. " +
        "De site van een bedrijf zelf, of dat nu het genoemde bedrijf is of een ander, valt onder " +
        "'overig'. Antwoord in het Nederlands.",
      user: [
        `Het bedrijf: ${ctx.brandName}${ctx.profile.url ? ` (${ctx.profile.url})` : ""}`,
        "",
        "Deel deze domeinen in:",
        ...onbekend.map((s) => `- ${s.domain}`),
      ].join("\n"),
      schema: ReputationSourceKinds,
      schemaName: "reputation_source_kinds",
      webSearch: false,
      work: "deterministic",
      meta: {
        kind: "reputation_source_kinds",
        profileId: ctx.profile.id,
        reputationRunId: ctx.run.id,
      },
    });

    const kaart = new Map<string, ReputationSourceKind>();
    for (const d of r.parsed.domeinen) {
      const domein = d.domein.trim().toLowerCase().replace(/^www\./, "");
      if (domein) kaart.set(domein, d.soort as ReputationSourceKind);
    }
    return kaart;
  } catch (err) {
    // Faalt zacht: dan staat er `overig` bij, en dat is een eerlijke uitkomst.
    console.warn(`Domeinindeling mislukt in run ${ctx.run.id}:`, err);
    return new Map();
  }
}
