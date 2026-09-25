import "server-only";

/**
 * DE CONTENT BRIEF MAKEN, voor één pagina (`docs/tasks/contentketen-opnieuw.md` §6.1).
 *
 * Eén zware aanroep (conventie 7): het sterke model met zoeken op het web, want
 * hier zit de intelligentie vóór het schrijven. Daarna alleen code: het
 * onderzoek bewaren in `brief_json`, de vragen als rijen in `fact_requests`, en
 * de schrijfpoort vragen of de pagina al geschreven mag worden.
 *
 * Staat er al een `brief_json`, dan geen nieuwe aanroep (conventie 9). Mislukt
 * de brief definitief, dan krijgt de pagina een brief zonder onderzoek
 * (`markeerBriefMislukt`) en gaat hij door met alleen de open vraag: schrijven
 * zonder onderzoek is minder goed, niet kapot.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { fetchExistingPage } from "@/lib/pipeline/existing-page-fetch";
import { openVragenVanPagina } from "@/lib/open-questions";
import { blokA, type BedrijfsInvoer } from "@/lib/pagina/bedrijfskennis";
import { briefInvoer, BRIEF_SYSTEEM } from "@/lib/pagina/brief-opdracht";
import {
  BRIEF_VERSIE,
  ContentBriefSchema,
  kindVoorSoort,
  verwerkBrief,
  type EerdereVraag,
  type NieuweVraag,
  type Onderzoek,
} from "@/lib/pagina/brief-regels";
import { laadBedrijf, laadDoelvragen, laadMerk, laadPagina, type PaginaBasis } from "@/lib/pagina/context";
import { schrijfpoort, type SchrijfpoortOordeel as Poortuitslag } from "@/lib/pagina/schrijfpoort";
import { SOORT_LABEL } from "@/lib/pagina/paginasoort";

type Admin = SupabaseClient;

/** Hoeveel eerder gestelde vragen het model meekrijgt. De nieuwste eerst. */
const MAX_EERDERE_VRAGEN = 200;

/** Wat er in `content_pieces.brief_json` staat. */
export interface BriefJson {
  onderzoek: Onderzoek | null;
  /** De feiten die blok A vormden, voor de audit: wat wist de brief. */
  bedrijf: { feiten: { id: string; text: string }[] };
  versie: number;
}

export type BriefUitkomst =
  | { uitkomst: "gemaakt" | "bestond_al"; profileId: string; poort: Poortuitslag }
  | { uitkomst: "geen_pagina" };

function vandaag(): string {
  return new Date().toISOString().slice(0, 10);
}

function compactBedrijf(b: BedrijfsInvoer): BriefJson["bedrijf"] {
  return { feiten: b.feiten.map((f) => ({ id: f.id, text: f.text })) };
}

/** De schrijfpoort voor deze pagina, met de stand zoals die nu in de database staat. */
export async function poortVoor(admin: Admin, pagina: Pick<PaginaBasis, "pieceId" | "publicatiedatum">): Promise<Poortuitslag> {
  const [{ data }, openVragen] = await Promise.all([
    admin.from("content_pieces").select("brief_json").eq("id", pagina.pieceId).maybeSingle(),
    openVragenVanPagina(admin, pagina.pieceId).catch(() => Number.NaN),
  ]);
  return schrijfpoort({
    briefKlaar: Boolean((data as { brief_json?: unknown } | null)?.brief_json),
    openVragen,
    publicatiedatum: pagina.publicatiedatum,
    vandaag: vandaag(),
  });
}

async function eerdereVragen(admin: Admin, profileId: string): Promise<EerdereVraag[]> {
  const { data } = await admin
    .from("fact_requests")
    .select("id, question, status, open_vraag, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(MAX_EERDERE_VRAGEN);
  // De open vraag per pagina is voor elke pagina dezelfde vraag met een andere
  // titel; die hoort niet in de lijst waarmee het model herhaling vermijdt.
  return ((data ?? []) as (EerdereVraag & { open_vraag?: boolean })[])
    .filter((v) => !v.open_vraag)
    .map(({ id, question, status }) => ({ id, question, status }));
}

async function bewaarVragen(admin: Admin, pagina: PaginaBasis, vragen: NieuweVraag[]): Promise<number> {
  let bewaard = 0;
  for (const v of vragen) {
    const { error } = await admin.from("fact_requests").insert({
      profile_id: pagina.profileId,
      // Een merkbrede vraag hangt aan geen cluster: het antwoord geldt straks
      // voor elke pagina van dit merk (blok A, "eerder beantwoorde vragen").
      analysis_id: v.merkbreed ? null : pagina.analysisId,
      question: v.vraag,
      reason: v.waarom || null,
      status: "open",
      scope: v.merkbreed ? "merk" : "pagina",
      kind: kindVoorSoort(v.soort),
      answer_type: v.antwoord_type,
      options: v.opties ?? [],
      required: false,
      content_piece_ids: [pagina.pieceId],
      raw_json: { bron: "pagina_brief", soort: v.soort },
    });
    // 23505: de unieke index op (merk, vraagtekst) uit migratie 0019. Dezelfde
    // vraag stond er al; dat is precies wat hier niet dubbel mag.
    if (error && (error as { code?: string }).code !== "23505") {
      throw new Error(`Vraag bewaren voor pagina ${pagina.pieceId} mislukte: ${error.message}`);
    }
    if (!error) bewaard++;
  }
  return bewaard;
}

/** Een al open vraag van dit merk ook aan deze pagina hangen. */
async function koppelVragen(admin: Admin, pagina: PaginaBasis, ids: string[]): Promise<void> {
  for (const id of ids) {
    const { data } = await admin
      .from("fact_requests")
      .select("id, content_piece_ids")
      .eq("id", id)
      .eq("profile_id", pagina.profileId)
      .eq("status", "open")
      .maybeSingle();
    if (!data) continue;
    const huidig = ((data as { content_piece_ids?: string[] | null }).content_piece_ids ?? []) as string[];
    if (huidig.includes(pagina.pieceId)) continue;
    await admin
      .from("fact_requests")
      .update({ content_piece_ids: [...huidig, pagina.pieceId] })
      .eq("id", id);
  }
}

/** Bij "verbeteren": de huidige tekst van de pagina, één keer opgehaald en bewaard. */
async function huidigeTekst(admin: Admin, pagina: PaginaBasis): Promise<string | null> {
  if (pagina.handeling !== "verbeteren") return null;
  if (pagina.bestaandeTekst?.trim()) return pagina.bestaandeTekst;
  if (!pagina.bestaandAdres) return null;
  const opgehaald = await fetchExistingPage(pagina.bestaandAdres);
  if (!opgehaald.text) return null;
  await admin
    .from("content_pieces")
    .update({ existing_page_text: opgehaald.text, existing_page_fetched_at: opgehaald.fetchedAt })
    .eq("id", pagina.pieceId);
  return opgehaald.text;
}

export async function maakBrief(admin: Admin, pieceId: string): Promise<BriefUitkomst> {
  const pagina = await laadPagina(admin, pieceId);
  if (!pagina) return { uitkomst: "geen_pagina" };
  if (pagina.briefJson) {
    return { uitkomst: "bestond_al", profileId: pagina.profileId, poort: await poortVoor(admin, pagina) };
  }

  const merk = await laadMerk(admin, pagina);
  const [bedrijf, doelvragen, eerdere, tekst] = await Promise.all([
    laadBedrijf(admin, pagina),
    laadDoelvragen(admin, pagina.sourceRef, merk.concurrenten),
    eerdereVragen(admin, pagina.profileId),
    huidigeTekst(admin, pagina),
  ]);

  const { parsed } = await callStructured({
    model: MODELS.content,
    system: BRIEF_SYSTEEM,
    user: briefInvoer({
      titel: pagina.titel,
      paginasoort: SOORT_LABEL[pagina.type] ?? pagina.type,
      handeling: pagina.handeling,
      zoekintentie: pagina.zoekintentie,
      waarom: pagina.waarom,
      doelvragen,
      merknaam: merk.naam,
      werkgebied: merk.werkgebied,
      bedrijf: blokA(bedrijf),
      huidigeTekst: tekst,
      eerdereVragen: eerdere.map((v) => ({ id: v.id, vraag: v.question, stand: v.status })),
    }),
    schema: ContentBriefSchema,
    schemaName: "content_brief",
    webSearch: true,
    work: "analytical",
    meta: { kind: "pagina_brief", profileId: pagina.profileId, analysisId: pagina.analysisId, contentPieceId: pieceId },
  });

  const verwerkt = verwerkBrief(parsed, eerdere);
  const brief: BriefJson = { onderzoek: verwerkt.onderzoek, bedrijf: compactBedrijf(bedrijf), versie: BRIEF_VERSIE };

  // Eerst de vragen, dan de brief: de schrijfpoort kijkt of de brief er is en
  // of er nul open vragen zijn. Andersom zou een gelijktijdige poortvraag in
  // het gat daartussen een pagina zonder vragen zien en te vroeg schrijven.
  await bewaarVragen(admin, pagina, verwerkt.vragen);
  await koppelVragen(admin, pagina, verwerkt.koppel);
  await admin.from("content_pieces").update({ brief_json: brief }).eq("id", pieceId).is("brief_json", null);

  return { uitkomst: "gemaakt", profileId: pagina.profileId, poort: await poortVoor(admin, pagina) };
}

/**
 * De brief is definitief mislukt: de pagina krijgt een brief zonder onderzoek,
 * zodat de schrijfpoort niet eeuwig op de voorbereiding wacht (§6.1).
 */
export async function markeerBriefMislukt(admin: Admin, pieceId: string): Promise<BriefUitkomst> {
  const pagina = await laadPagina(admin, pieceId);
  if (!pagina) return { uitkomst: "geen_pagina" };
  if (!pagina.briefJson) {
    const bedrijf = await laadBedrijf(admin, pagina);
    const brief: BriefJson = { onderzoek: null, bedrijf: compactBedrijf(bedrijf), versie: BRIEF_VERSIE };
    await admin.from("content_pieces").update({ brief_json: brief }).eq("id", pieceId).is("brief_json", null);
  }
  return { uitkomst: "bestond_al", profileId: pagina.profileId, poort: await poortVoor(admin, pagina) };
}
