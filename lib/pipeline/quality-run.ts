import "server-only";

/**
 * DE KEURING van één versie van één pagina, op één plek
 * (docs/tasks/contentkwaliteit-framework.md §4)
 *
 * ── WAAROM DIT EEN EIGEN MODULE IS ──────────────────────────────────────────
 *
 * `draftContentPiece()` en `reviseContentPiece()` voerden allebei dezelfde acht
 * controles uit, in dezelfde volgorde, met eigen kopieën van dezelfde
 * console-regels en dezelfde `geo_json`-opbouw. Ruim honderdvijftig regels
 * dubbel, en dat is precies waar de twee paden uit elkaar gaan lopen zonder dat
 * iemand het merkt: de reparatieronde controleerde bijvoorbeeld wél de
 * onherleidbare beweringen en de eerste ronde niet.
 *
 * Nu keurt één functie een pagina, en de twee stappen roepen hem aan met hun
 * eigen tekst. Wat de keuring oplevert, is voor allebei hetzelfde.
 *
 * ── WAT ER GEBEURT, IN VOLGORDE ─────────────────────────────────────────────
 *
 *   1. het beoordelaarspanel (vier AI-aanroepen, parallel)
 *   2. de deterministische controles (tien, gratis)
 *   3. de gewogen bewijsdekking
 *   4. alles omzetten naar getypeerde bevindingen (`quality-collect.ts`)
 *   5. wegen tot score, zekerheid en oordeel (`quality-score.ts`)
 *   6. de root cause afleiden (`root-cause.ts`)
 *
 * Stap 4 tot en met 6 zijn puur en staan in hun eigen modules; hier staat alleen
 * het uitvoeren en het wegschrijven.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { runPanel, type PanelResult } from "@/lib/pipeline/content-panel";
import {
  checkContentGate,
  checkForbiddenTopics,
  checkQuality,
  checkSourceTalk,
  checkTabooWords,
} from "@/lib/pipeline/content-gate";
import { checkContractCoverage } from "@/lib/pipeline/content-coverage";
import { splitSections } from "@/lib/pipeline/content-sections";
import { containsCompetitor } from "@/lib/pipeline/redact";
import { splitByTerms } from "@/lib/highlight";
import { mostSimilar as vindGelijkende, type SimilarPage } from "@/lib/pipeline/similarity";
import { sourceCoverage, type FactItem, type WrittenClaim } from "@/lib/pipeline/factcard";
import { detectClaimSentences, detectedCoverage } from "@/lib/pipeline/claim-extract";
import { berekenGewogenDekking, type GewogenDekking } from "@/lib/pipeline/evidence-weight";
import { checkTypeRegels, profielVoorType, type ContentQualityProfile } from "@/lib/pipeline/quality-profile";
import { verzamelKwaliteit } from "@/lib/pipeline/quality-collect";
import { beoordeelKwaliteit, type QualityEvaluation } from "@/lib/pipeline/quality-score";
import { analyseerRootCause, beschrijfRootCause, type RootCause } from "@/lib/pipeline/root-cause";
import { issueTeksten, type QualityIssue } from "@/lib/pipeline/quality-issue";
import { geoScore as geoScoreVanModel } from "@/lib/schemas/critique";
import type { ContentContract } from "@/lib/schemas/content-contract";
import type { ContentPiece } from "@/lib/schemas/content-piece";
import type { ContentType, Profile } from "@/lib/types/database";

export interface KeuringInput {
  /** De tekst zoals hij nu is. */
  piece: Pick<ContentPiece, "bodyMarkdown" | "faq" | "claims">;
  title: string;
  type: ContentType;
  brandName: string;
  targetQuestions: string[];
  contract: ContentContract | null;
  facts: FactItem[];
  profile: Profile | null;
  competitors: string[];
  distinctiveAnswers: string[];
  /** De pagina van hetzelfde merk waar deze tekst het meest op lijkt. */
  siblingPages: { title: string; body: string }[];
  analysisId: string;
  profileId: string | null;
  /** Lag er bewijs voor deze pagina? Bepaalt de root-cause-toewijzing. */
  bewijsAanwezig: boolean;
}

export interface Keuring {
  panel: PanelResult;
  evaluatie: QualityEvaluation;
  issues: QualityIssue[];
  /** Dezelfde bevindingen als tekstregels, voor `review_notes`. */
  teksten: string[];
  dekking: GewogenDekking;
  bronherleidbaarheid: number | null;
  onbewezen: WrittenClaim[];
  ongetagd: { sentence: string }[];
  rootCause: RootCause[];
  /** De GEO-score, ongewijzigd berekend zodat die reeks vergelijkbaar blijft. */
  geoScore: number | null;
  profiel: ContentQualityProfile;
  /** Wat er in `content_pieces` bijgewerkt moet worden. */
  kolommen: Record<string, unknown>;
  gelijkenis: SimilarPage | null;
}

function telWoorden(tekst: string): number {
  return tekst.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Staat er een manier om contact op te nemen in de tekst?
 *
 * Deterministisch en grof: een telefoonnummer, een e-mailadres, of een van de
 * gangbare woorden. Grof mag hier, want dit is een ondergrens en geen oordeel
 * over de kwaliteit van de oproep; het gaat erom dat een landingspagina niet
 * eindigt zonder één woord over wat de lezer nu moet doen.
 */
const VERVOLGSTAP =
  /\b(bel|bellen|belt|contact|afspraak|offerte|aanvragen|aanvraag|mail|e-mail|whatsapp|langskomen|inplannen|plan\s|reserveer|boek)\b/i;

export function heeftVervolgstap(bodyMarkdown: string, faq: { q: string; a: string }[]): boolean {
  const tekst = [bodyMarkdown, ...faq.map((f) => `${f.q} ${f.a}`)].join(" ");
  if (VERVOLGSTAP.test(tekst)) return true;
  // Een telefoonnummer of e-mailadres telt ook: dat is een vervolgstap zonder
  // dat er een werkwoord bij staat.
  return /\b0\d{1,3}[\s-]?\d{6,8}\b|\+31\s?\d/.test(tekst) || /[\w.-]+@[\w.-]+\.\w{2,}/.test(tekst);
}

/**
 * Keurt één versie van één pagina.
 *
 * Doet géén databaseschrijfwerk: hij levert de kolommen op en de aanroeper
 * schrijft ze weg. Zo blijft de volgorde van het wegschrijven bij de stap die
 * hem bepaalt (eerst de tekst, dan het oordeel), en dat is wat een afgebroken
 * werker-aanroep overleefbaar maakt.
 */
export async function keurPagina(input: KeuringInput): Promise<Keuring> {
  const profiel = profielVoorType(input.type);
  const body = input.piece.bodyMarkdown;
  const faq = input.piece.faq ?? [];
  const claims = input.piece.claims ?? [];

  // ── 1. Het beoordelaarspanel ──────────────────────────────────────────────
  const panel = await runPanel({
    bodyMarkdown: body,
    faq,
    title: input.title,
    brandName: input.brandName,
    targetQuestions: input.targetQuestions,
    contract: input.contract,
    facts: input.facts,
    analysisId: input.analysisId,
    profileId: input.profileId,
    profiel,
    styleSamples: input.profile?.style_samples ?? [],
  });

  // ── 2. De deterministische controles ──────────────────────────────────────
  const gate = checkContentGate({
    bodyMarkdown: body,
    faq,
    brandName: input.brandName,
    targetQuestions: input.targetQuestions,
    distinctiveAnswers: input.distinctiveAnswers,
  });

  const coverage = checkContractCoverage({
    contract: input.contract,
    bodyMarkdown: body,
    faq,
    claims,
  });

  const gelijkenis = vindGelijkende(body, input.siblingPages);
  const quality = checkQuality({ bodyMarkdown: body, mostSimilar: gelijkenis });

  const bronpraat = checkSourceTalk(body);
  const taboo = checkTabooWords(body, faq, input.profile?.taboo_phrases ?? []);
  const verbodenOnderwerpen = checkForbiddenTopics(
    body,
    faq,
    input.profile?.forbidden_topics ?? [],
  );

  // De concurrentnaam deterministisch aanwijzen in plaats van alleen "ja of
  // nee": de bevinding moet de naam noemen, anders kan de reparatie hem niet
  // vinden en weet de klant niet wat er weg moet.
  const heleTekst = [body, ...faq.map((f) => `${f.q} ${f.a}`)].join(" ");
  const genoemd = containsCompetitor(heleTekst, input.competitors)
    ? (splitByTerms(heleTekst, input.competitors).find((p) => p.term !== null)?.term ?? null)
    : null;

  // ── 3. De bewijskant ──────────────────────────────────────────────────────
  const dekking = berekenGewogenDekking(input.contract, input.facts);
  const { coverage: bronherleidbaarheid, unsupported } = sourceCoverage(claims, input.facts);
  const { untagged } = detectedCoverage({
    detected: detectClaimSentences({ bodyMarkdown: body, faq }, input.brandName),
    claims,
    facts: input.facts,
  });

  const secties = splitSections(body);
  const typeOvertredingen = checkTypeRegels(profiel, {
    secties: secties.length,
    faqParen: faq.length,
    langsteFaqAntwoord: faq.reduce((max, f) => Math.max(max, telWoorden(f.a)), 0),
    heeftVervolgstap: heeftVervolgstap(body, faq),
    gebruikteFeiten: claims.filter((c) => c.factRef?.trim()).length,
    woorden: telWoorden(body),
  });

  // ── 4. Alles naar getypeerde bevindingen ──────────────────────────────────
  const { issues, dimensies, beoordelaars } = verzamelKwaliteit({
    profiel,
    critique: panel.critique,
    factuality: panel.factuality,
    citability: panel.citability,
    craft: panel.craft,
    gate,
    coverage,
    quality,
    bronpraat,
    taboo,
    verbodenOnderwerpen,
    typeOvertredingen,
    dekking,
    bronherleidbaarheid,
    onbewezenBeweringen: unsupported,
    ongetagdeZinnen: untagged,
    concurrentGenoemd: genoemd,
    contractAanwezig: input.contract !== null,
    bewijsAanwezig: input.bewijsAanwezig,
  });

  // ── 5. Wegen ──────────────────────────────────────────────────────────────
  const evaluatie = beoordeelKwaliteit({ profiel, dimensies, issues, beoordelaars });

  // ── 6. Root cause ─────────────────────────────────────────────────────────
  const rootCause = analyseerRootCause(issues);

  const teksten = issueTeksten(issues);

  // De GEO-score blijft precies zoals hij was: `content_pieces.geo_score` is een
  // reeks waarvan de app trends toont, en een pagina van vorige maand moet
  // vergelijkbaar blijven met een van vandaag.
  const geoScore = gate.score ?? (panel.critique ? geoScoreVanModel(panel.critique.geo) : null);

  const kolommen: Record<string, unknown> = {
    critique_raw_json: panel.raw,
    // `quality_score` blijft het redactionele cijfer, om dezelfde reden als de
    // GEO-score hierboven. Het nieuwe, gewogen cijfer staat in `quality_json`
    // en in `content_quality_runs`.
    quality_score: panel.critique?.qualityScore ?? null,
    geo_score: geoScore,
    coverage_score: coverage.score,
    input_coverage: dekking.graad,
    weighted_evidence_coverage: dekking.gewogen,
    critical_evidence_coverage: dekking.kritiek,
    quality_profile: profiel.type,
    quality_verdict: evaluatie.verdict,
    quality_confidence: evaluatie.confidence,
    quality_json: {
      score: evaluatie.score,
      dimensies: evaluatie.dimensies,
      confidence: evaluatie.confidence,
      verdict: evaluatie.verdict,
      redenen: evaluatie.redenen,
      onderDeMaat: evaluatie.onderDeMaat,
      issues,
      rootCause,
      rootCauseTekst: beschrijfRootCause(rootCause),
      beoordelaars,
      dekking: {
        graad: dekking.graad,
        gewogen: dekking.gewogen,
        kritiek: dekking.kritiek,
        aantallen: dekking.aantallen,
      },
      bronherleidbaarheid,
    },
    geo_json: {
      zelfrapportage: panel.critique?.geo ?? null,
      deterministisch: gate.checks,
      kwaliteit: quality.checks,
      gemeten: quality.gemeten,
      dekking: { score: coverage.score, secties: coverage.secties },
    },
    review_notes: teksten,
    source_coverage: bronherleidbaarheid,
  };

  return {
    panel,
    evaluatie,
    issues,
    teksten,
    dekking,
    bronherleidbaarheid,
    onbewezen: unsupported,
    ongetagd: untagged,
    rootCause,
    geoScore,
    profiel,
    kolommen,
    gelijkenis,
  };
}

/**
 * De uitkomst van een keuring als rij in `content_quality_runs` (migratie 0091).
 *
 * Best effort, net als `bewaakPaginaBudget`: de boekhouding mag de pijplijn
 * nooit laten falen. Wat er misgaat komt in de logs, niet in een uitzondering.
 */
export async function bewaarKwaliteitsronde(
  admin: SupabaseClient,
  args: {
    contentPieceId: string;
    analysisId: string;
    ronde: number;
    keuring: Keuring;
    retained: boolean;
    wordCount: number;
  },
): Promise<void> {
  const { keuring } = args;
  const { error } = await admin.from("content_quality_runs").upsert(
    {
      content_piece_id: args.contentPieceId,
      analysis_id: args.analysisId,
      repair_round: args.ronde,
      quality_profile: keuring.profiel.type,
      score: keuring.evaluatie.score,
      confidence: keuring.evaluatie.confidence,
      verdict: keuring.evaluatie.verdict,
      dimensions_json: keuring.evaluatie.dimensies as never,
      issues_json: keuring.issues as never,
      root_cause_json: keuring.rootCause as never,
      blocking_count: keuring.evaluatie.blokkades.length,
      issue_count: keuring.issues.length,
      retained: args.retained,
      word_count: args.wordCount,
    },
    { onConflict: "content_piece_id,repair_round" },
  );
  if (error) {
    console.warn(`Kwaliteitsronde ${args.ronde} niet bewaard: ${error.message}`);
  }
}

/**
 * De vorige rondes van deze pagina, voor de versiekeuze.
 *
 * Leeg is normaal: het eerste concept heeft geen voorgeschiedenis, en een pagina
 * van vóór migratie 0091 evenmin. De aanroeper valt dan terug op de vergelijking
 * tussen twee opeenvolgende rondes, precies zoals `beslisReparatieRonde()` hem
 * altijd al maakte.
 */
export async function leesKwaliteitsrondes(
  admin: SupabaseClient,
  contentPieceId: string,
): Promise<{ ronde: number; score: number | null; verdict: string | null; blokkades: number; confidence: number }[]> {
  const { data, error } = await admin
    .from("content_quality_runs")
    .select("repair_round, score, verdict, blocking_count, confidence")
    .eq("content_piece_id", contentPieceId)
    .order("repair_round", { ascending: true });
  if (error || !data) return [];
  return data.map((rij) => ({
    ronde: Number(rij.repair_round) || 0,
    score: rij.score === null ? null : Number(rij.score),
    verdict: (rij.verdict as string | null) ?? null,
    blokkades: Number(rij.blocking_count) || 0,
    confidence: Number(rij.confidence) || 0,
  }));
}
