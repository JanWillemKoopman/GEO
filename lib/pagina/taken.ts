import "server-only";

/**
 * DE TAKEN VAN DE CONTENTKETEN (`docs/tasks/contentketen-opnieuw.md` §7.4).
 *
 * Eén bestand met wat elke taaksoort doet; `lib/jobs/handlers.ts` roept alleen
 * deze functies aan. De volgorde van de keten staat hier op één plek:
 *
 *   pagina_brief (na elkaar per maand) → schrijfpoort (`start.ts`)
 *   pagina_schrijven → pagina_controle → hooguit één pagina_herschrijven → klaar
 *
 * Elke taak doet hooguit één zware aanroep (conventie 7). Schrijven en
 * herschrijven lopen in de achtergrondmodus: de eerste ronde start de aanroep,
 * een ophaalronde haalt hem op (zie `schrijven.ts`).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueue, dedupe } from "@/lib/jobs/queue";
import { callStructured, haalStructuredOp, startStructuredAchtergrond } from "@/lib/openai/structured";
import { MAX_OPHAALPOGINGEN, ophaalVertragingSeconden } from "@/lib/openai/achtergrond";
import { MODELS } from "@/lib/openai/models";
import type { Job } from "@/lib/types/database";
import { maakBrief, markeerBriefMislukt, type BriefUitkomst } from "@/lib/pagina/brief";
import { controleerHardeBeweringen, geleZinnen } from "@/lib/pagina/harde-beweringen";
import {
  CONTROLE_SYSTEEM,
  ControleSchema,
  controleInvoer,
  geleZinnenNa,
  kiesVersie,
  moetHerschrijven,
  zinnenMetVerbodenWoord,
  type ControleJson,
} from "@/lib/pagina/controle-regels";
import { herschrijfInvoer, schrijfInvoer, type PaginaUitvoer } from "@/lib/pagina/schrijfopdracht";
import { gerepareerd, laadSchrijfbasis, schrijfOpties, tekstKolommen, type Schrijfbasis } from "@/lib/pagina/schrijven";
import { planBriefs, probeerTeSchrijven } from "@/lib/pagina/start";

type Admin = SupabaseClient;

// ── De brief ────────────────────────────────────────────────────────────────

/** Na de brief, gelukt of definitief mislukt: de rij gaat door, dan de schrijfpoort. */
async function naBrief(admin: Admin, pieceId: string, uitkomst: BriefUitkomst, rij: string[]): Promise<void> {
  if (rij.length > 0) await planBriefs(admin, rij);
  if (uitkomst.uitkomst === "geen_pagina") return;
  if (uitkomst.poort.mag) await probeerTeSchrijven(admin, pieceId);
}

export async function voerBriefUit(admin: Admin, payload: { pieceId: string; rij?: string[] }): Promise<void> {
  const uitkomst = await maakBrief(admin, payload.pieceId);
  await naBrief(admin, payload.pieceId, uitkomst, payload.rij ?? []);
}

/**
 * De brief gaf na vier pogingen op. De pagina gaat door met alleen de open
 * vraag, en de rij gaat door met de volgende pagina (§6.1).
 */
export async function briefGafOp(admin: Admin, job: Job): Promise<void> {
  const payload = (job.payload_json ?? {}) as { pieceId?: string; rij?: string[] };
  if (!payload.pieceId) return;
  const uitkomst = await markeerBriefMislukt(admin, payload.pieceId);
  await naBrief(admin, payload.pieceId, uitkomst, payload.rij ?? []);
}

// ── De achtergrondmodus ─────────────────────────────────────────────────────

export interface AchtergrondPayload {
  pieceId: string;
  responseId?: string;
  gestartOp?: string;
  poging?: number;
  /** Hoe vaak een door OpenAI afgebroken aanroep opnieuw gestart is. */
  herstart?: number;
  /** Alleen bij herschrijven op verzoek van de klant. */
  klantNotitie?: string | null;
}

type Soort = "pagina_schrijven" | "pagina_herschrijven";

/** Een door OpenAI afgebroken aanroep mag één keer opnieuw; daarna geeft de taak op. */
const MAX_HERSTARTS = 1;

/**
 * Eén ronde: starten, of ophalen. Geeft de uitvoer terug als die er is, anders
 * null (de volgende ronde staat dan in de rij).
 */
async function achtergrondRonde(
  admin: Admin,
  job: Job,
  soort: Soort,
  payload: AchtergrondPayload,
  basis: Schrijfbasis,
  user: string,
): Promise<PaginaUitvoer | null> {
  const opts = schrijfOpties(basis, user, soort);
  const analysisId = basis.pagina.analysisId;

  if (!payload.responseId) {
    const { responseId } = await startStructuredAchtergrond(opts);
    const gestartOp = new Date().toISOString();
    const verder: AchtergrondPayload = { ...payload, responseId, gestartOp, poging: 0 };
    // Het id eerst in de eigen payload: breekt deze taak hierna af, dan haalt
    // de nieuwe poging op in plaats van een tweede aanroep te betalen.
    await admin.from("jobs").update({ payload_json: verder }).eq("id", job.id);
    await enqueue(admin, {
      type: soort,
      payload: verder,
      analysisId,
      dedupeKey: dedupe.paginaOphalen(soort, payload.pieceId, responseId, 0),
      scheduledFor: new Date(Date.now() + ophaalVertragingSeconden(0) * 1000),
    });
    return null;
  }

  const uitkomst = await haalStructuredOp(payload.responseId, opts, payload.gestartOp ?? new Date().toISOString());
  if (uitkomst.stand === "klaar") return uitkomst.result.parsed;

  if (uitkomst.stand === "bezig") {
    const poging = (payload.poging ?? 0) + 1;
    if (poging >= MAX_OPHAALPOGINGEN) {
      throw new Error(`${soort}: na ${poging} ophaalrondes nog niet klaar (${payload.responseId}).`);
    }
    await enqueue(admin, {
      type: soort,
      payload: { ...payload, poging },
      analysisId,
      dedupeKey: dedupe.paginaOphalen(soort, payload.pieceId, payload.responseId, poging),
      scheduledFor: new Date(Date.now() + ophaalVertragingSeconden(poging) * 1000),
    });
    return null;
  }

  // OpenAI brak de aanroep af. Eén keer opnieuw starten; nog eens ophalen
  // levert dezelfde afgebroken aanroep op.
  const herstart = (payload.herstart ?? 0) + 1;
  if (herstart > MAX_HERSTARTS) throw new Error(`${soort}: ${uitkomst.fout}`);
  await enqueue(admin, {
    type: soort,
    payload: { pieceId: payload.pieceId, klantNotitie: payload.klantNotitie ?? null, herstart },
    analysisId,
    dedupeKey: dedupe.paginaOphalen(soort, payload.pieceId, `herstart-${payload.responseId}`, herstart),
  });
  return null;
}

async function lopendeTekst(
  admin: Admin,
  pieceId: string,
): Promise<{ body: string | null; controle: ControleJson | null; actueel: boolean }> {
  const { data } = await admin
    .from("content_pieces")
    .select("body_markdown, controle_json, is_current")
    .eq("id", pieceId)
    .maybeSingle();
  const r = data as { body_markdown: string | null; controle_json: ControleJson | null; is_current: boolean | null } | null;
  return { body: r?.body_markdown ?? null, controle: r?.controle_json ?? null, actueel: r?.is_current !== false };
}

/** Klaar voor de ondernemer: "Lees en keur goed". */
async function zetKlaar(admin: Admin, pieceId: string, controle: ControleJson): Promise<void> {
  await admin
    .from("content_pieces")
    .update({ controle_json: controle, status: "ready", needs_review: true, updated_at: new Date().toISOString() })
    .eq("id", pieceId);
  await admin
    .from("planned_pages")
    .update({ status: "ter_goedkeuring" })
    .eq("content_piece_id", pieceId)
    .in("status", ["gepland", "schrijven", "mislukt"]);
}

async function planControle(admin: Admin, basis: Schrijfbasis): Promise<void> {
  await enqueue(admin, {
    type: "pagina_controle",
    payload: { pieceId: basis.pagina.pieceId },
    analysisId: basis.pagina.analysisId,
    dedupeKey: dedupe.paginaControle(basis.pagina.pieceId),
  });
}

function ongedektIn(basis: Schrijfbasis, tekst: string): string[] {
  return geleZinnen(controleerHardeBeweringen(tekst, basis.bronnen, [basis.merk.naam]));
}

/** Zinnen met een woord dat het merk niet wil gebruiken (besluit B16). */
function verbodenIn(basis: Schrijfbasis, tekst: string): string[] {
  return zinnenMetVerbodenWoord(tekst, basis.merk.verbodenWoorden);
}

// ── Schrijven (§6.4) ────────────────────────────────────────────────────────

export async function voerSchrijvenUit(admin: Admin, job: Job, payload: AchtergrondPayload): Promise<void> {
  const basis = await laadSchrijfbasis(admin, payload.pieceId);
  if (!basis) return;
  const { body } = await lopendeTekst(admin, payload.pieceId);
  // Conventie 9: staat de tekst er al, dan geen tweede aanroep. Wel de
  // controle, voor het geval die na het bewaren niet meer ingepland raakte.
  if (body?.trim()) {
    await planControle(admin, basis);
    return;
  }

  const uitvoer = await achtergrondRonde(admin, job, "pagina_schrijven", payload, basis, schrijfInvoer(basis.blokken));
  if (!uitvoer) return;

  const tekst = gerepareerd(uitvoer, basis.merk.naam);
  const kolommen = await tekstKolommen(admin, basis, tekst, { uitvoer, soort: "schrijven" });
  const { error } = await admin
    .from("content_pieces")
    .update({ ...kolommen, status: "draft" })
    .eq("id", payload.pieceId);
  if (error) throw new Error(`Tekst van ${payload.pieceId} bewaren mislukte: ${error.message}`);
  await planControle(admin, basis);
}

/**
 * Het schrijven gaf op. De pagina gaat terug naar de voorbereiding, zodat de
 * beheerder hem opnieuw kan laten schrijven; het plan toont "mislukt".
 */
export async function schrijvenGafOp(admin: Admin, job: Job): Promise<void> {
  const pieceId = (job.payload_json as { pieceId?: string } | null)?.pieceId;
  if (!pieceId) return;
  await admin.from("content_pieces").update({ status: "briefing" }).eq("id", pieceId).eq("status", "draft").is("body_markdown", null);
  await admin.from("planned_pages").update({ status: "mislukt" }).eq("content_piece_id", pieceId).in("status", ["gepland", "schrijven"]);
}

// ── De kwaliteitscontrole (§6.6) ────────────────────────────────────────────

export async function voerControleUit(admin: Admin, payload: { pieceId: string }): Promise<void> {
  const basis = await laadSchrijfbasis(admin, payload.pieceId);
  if (!basis) return;
  const { body, controle } = await lopendeTekst(admin, payload.pieceId);
  if (!body?.trim() || controle) return;

  const ongedekt = ongedektIn(basis, body);
  const verboden = verbodenIn(basis, body);
  const { parsed: beoordeling } = await callStructured({
    model: MODELS.content,
    system: CONTROLE_SYSTEEM,
    user: controleInvoer({ informatie: schrijfInvoer(basis.blokken), tekst: body, ongedekt }),
    schema: ControleSchema,
    schemaName: "pagina_controle",
    work: "judging",
    meta: {
      kind: "pagina_controle",
      profileId: basis.pagina.profileId,
      analysisId: basis.pagina.analysisId,
      contentPieceId: payload.pieceId,
    },
  });

  if (moetHerschrijven(beoordeling, [...ongedekt, ...verboden])) {
    const nieuw: ControleJson = { ongedekt, verboden, beoordeling, herschreven: false, gele_zinnen: [], bevestigd: [] };
    await admin.from("content_pieces").update({ controle_json: nieuw }).eq("id", payload.pieceId);
    await enqueue(admin, {
      type: "pagina_herschrijven",
      payload: { pieceId: payload.pieceId },
      analysisId: basis.pagina.analysisId,
      dedupeKey: dedupe.paginaHerschrijven(payload.pieceId),
    });
    return;
  }
  await zetKlaar(admin, payload.pieceId, {
    ongedekt,
    verboden,
    beoordeling,
    herschreven: false,
    gele_zinnen: geleZinnenNa(body, [...ongedekt, ...verboden], []),
    bevestigd: [],
  });
}

/** De beoordeling gaf op: geen herschrijving, de ongedekte zinnen worden geel (§6.6). */
export async function controleGafOp(admin: Admin, job: Job): Promise<void> {
  const pieceId = (job.payload_json as { pieceId?: string } | null)?.pieceId;
  if (!pieceId) return;
  const basis = await laadSchrijfbasis(admin, pieceId);
  const { body, controle } = await lopendeTekst(admin, pieceId);
  if (!basis || !body?.trim() || controle) return;
  const ongedekt = ongedektIn(basis, body);
  const verboden = verbodenIn(basis, body);
  await zetKlaar(admin, pieceId, {
    ongedekt,
    verboden,
    beoordeling: null,
    herschreven: false,
    gele_zinnen: geleZinnenNa(body, [...ongedekt, ...verboden], []),
    bevestigd: [],
  });
}

// ── Herschrijven (§6.7) ─────────────────────────────────────────────────────

export async function voerHerschrijvenUit(admin: Admin, job: Job, payload: AchtergrondPayload): Promise<void> {
  const basis = await laadSchrijfbasis(admin, payload.pieceId);
  if (!basis) return;
  const { body, controle, actueel } = await lopendeTekst(admin, payload.pieceId);
  // Een oudere versie herschrijven we niet: dan is er al een nieuwere.
  if (!body?.trim() || !actueel) return;
  const opVerzoek = Boolean(payload.klantNotitie?.trim());
  // Conventie 9: de herschrijving na de controle gebeurt precies één keer.
  if (!opVerzoek && (!controle || controle.herschreven)) return;

  const user = herschrijfInvoer(basis.blokken, {
    vorige: body,
    punten: opVerzoek ? [] : (controle?.beoordeling?.punten ?? []),
    verzonnen: opVerzoek ? [] : (controle?.beoordeling?.verzonnen ?? []),
    ongedekt: opVerzoek ? [] : (controle?.ongedekt ?? []),
    verboden: opVerzoek ? [] : (controle?.verboden ?? []),
    notitieKlant: opVerzoek ? (payload.klantNotitie ?? null) : null,
  });
  const uitvoer = await achtergrondRonde(admin, job, "pagina_herschrijven", payload, basis, user);
  if (!uitvoer) return;

  const tekst = gerepareerd(uitvoer, basis.merk.naam);
  const kolommen = await tekstKolommen(admin, basis, tekst, { uitvoer, soort: "herschrijven" });
  const ongedektNieuw = ongedektIn(basis, tekst.tekst_markdown);
  const verbodenNieuw = verbodenIn(basis, tekst.tekst_markdown);

  if (opVerzoek) {
    await nieuweVersie(admin, basis, kolommen, ongedektNieuw, verbodenNieuw);
    return;
  }

  const vorige = controle as ControleJson;
  const verbodenVorige = vorige.verboden ?? [];
  // De verboden woorden tellen mee als nalopen: een herschrijving die er een
  // bij zet, is net zo goed slechter als een met een extra ongedekte zin.
  const behouden = kiesVersie(
    vorige.ongedekt.length + verbodenVorige.length,
    ongedektNieuw.length + verbodenNieuw.length,
  );
  if (behouden === "nieuw") {
    const { error } = await admin.from("content_pieces").update(kolommen).eq("id", payload.pieceId);
    if (error) throw new Error(`Herschreven tekst van ${payload.pieceId} bewaren mislukte: ${error.message}`);
  }
  const blijft = behouden === "nieuw" ? tekst.tekst_markdown : body;
  const ongedekt = behouden === "nieuw" ? ongedektNieuw : vorige.ongedekt;
  const verboden = behouden === "nieuw" ? verbodenNieuw : verbodenVorige;
  await zetKlaar(admin, payload.pieceId, {
    ...vorige,
    ongedekt,
    verboden,
    herschreven: true,
    herschrijving: {
      ongedekt_vorige: vorige.ongedekt.length + verbodenVorige.length,
      ongedekt_nieuw: ongedektNieuw.length + verbodenNieuw.length,
      behouden,
    },
    gele_zinnen: geleZinnenNa(blijft, [...ongedekt, ...verboden], (vorige.beoordeling?.verzonnen ?? []).map((v) => v.zin)),
    bevestigd: [],
  });
}

/**
 * Een aanpassing op verzoek van de klant: een nieuwe versie (`version + 1`,
 * `supersedes_id`), zonder nieuwe beoordeling (§6.7). De vorige versie blijft
 * bestaan maar is niet meer de actuele; de vragen en de plan-pagina wijzen
 * daarna ook naar de nieuwe.
 */
async function nieuweVersie(
  admin: Admin,
  basis: Schrijfbasis,
  kolommen: Record<string, unknown>,
  ongedekt: string[],
  verboden: string[],
): Promise<void> {
  const oudId = basis.pagina.pieceId;
  const { data: oud } = await admin
    .from("content_pieces")
    .select("analysis_id, report_id, title, type, target_intent, action, existing_url, existing_page_text, related_url, brief_json, version, cluster")
    .eq("id", oudId)
    .maybeSingle();
  if (!oud) return;
  const o = oud as Record<string, unknown>;
  // Eerst de oude van `is_current` af: de unieke index uit migratie 0023 laat
  // twee actuele pagina's met dezelfde titel onder één cluster niet toe.
  await admin.from("content_pieces").update({ is_current: false }).eq("id", oudId);
  const controle: ControleJson = {
    ongedekt,
    verboden,
    beoordeling: null,
    herschreven: true,
    gele_zinnen: [...ongedekt, ...verboden],
    bevestigd: [],
  };
  // Velden bij naam en niet `...o`: dan kan er nooit een id, een datum of een
  // kolom van de oude keten meeliften naar de nieuwe versie.
  const { data: nieuw, error } = await admin
    .from("content_pieces")
    .insert({
      analysis_id: o.analysis_id,
      report_id: o.report_id ?? null,
      title: o.title,
      type: o.type,
      target_intent: o.target_intent ?? null,
      action: o.action ?? "nieuw",
      existing_url: o.existing_url ?? null,
      existing_page_text: o.existing_page_text ?? null,
      related_url: o.related_url ?? null,
      brief_json: o.brief_json ?? null,
      cluster: o.cluster ?? null,
      ...kolommen,
      version: ((o.version as number | null) ?? 1) + 1,
      supersedes_id: oudId,
      is_current: true,
      status: "ready",
      needs_review: true,
      controle_json: controle,
    })
    .select("id")
    .single();
  if (error || !nieuw) {
    await admin.from("content_pieces").update({ is_current: true }).eq("id", oudId);
    throw new Error(`Nieuwe versie van ${oudId} bewaren mislukte: ${error?.message}`);
  }
  const nieuwId = (nieuw as { id: string }).id;
  await admin.from("planned_pages").update({ content_piece_id: nieuwId, status: "ter_goedkeuring" }).eq("content_piece_id", oudId);
  const { data: vragen } = await admin.from("fact_requests").select("id, content_piece_ids").contains("content_piece_ids", [oudId]);
  for (const v of (vragen ?? []) as { id: string; content_piece_ids: string[] }[]) {
    await admin.from("fact_requests").update({ content_piece_ids: [...v.content_piece_ids, nieuwId] }).eq("id", v.id);
  }
}

/**
 * Het herschrijven gaf op. Na de controle: de tekst van de eerste ronde blijft,
 * met de ongedekte en verzonnen zinnen geel. Op verzoek van de klant: de
 * huidige versie blijft zoals hij was.
 */
export async function herschrijvenGafOp(admin: Admin, job: Job): Promise<void> {
  const payload = (job.payload_json ?? {}) as AchtergrondPayload;
  if (!payload.pieceId || payload.klantNotitie?.trim()) return;
  const { body, controle } = await lopendeTekst(admin, payload.pieceId);
  if (!body?.trim() || !controle || controle.herschreven) return;
  await zetKlaar(admin, payload.pieceId, {
    ...controle,
    gele_zinnen: geleZinnenNa(
      body,
      [...controle.ongedekt, ...(controle.verboden ?? [])],
      (controle.beoordeling?.verzonnen ?? []).map((v) => v.zin),
    ),
    bevestigd: [],
  });
}
