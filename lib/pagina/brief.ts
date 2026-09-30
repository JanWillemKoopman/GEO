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
import { laadBedrijf, laadDoelvragen, laadMerk, laadPagina, laadPaginaDefinitie, siteTeksten, type PaginaBasis } from "@/lib/pagina/context";
import { zonderSiteHerhaling } from "@/lib/pipeline/site-herhaling";
import { schrijfpoort, type SchrijfpoortOordeel as Poortuitslag } from "@/lib/pagina/schrijfpoort";
import { soortVan } from "@/lib/pagina/soorten";
import { haalZoekresultatenVoorBrief } from "@/lib/pagina/zoekresultaten";
import { zoekresultatenBlok, type BriefZoekresultaten } from "@/lib/pagina/zoekresultaten-regels";

type Admin = SupabaseClient;

/** Hoeveel eerder gestelde vragen het model meekrijgt. De nieuwste eerst. */
const MAX_EERDERE_VRAGEN = 200;

/** Wat er in `content_pieces.brief_json` staat. */
export interface BriefJson {
  onderzoek: Onderzoek | null;
  /** De feiten die blok A vormden, voor de audit: wat wist de brief. */
  bedrijf: { feiten: { id: string; text: string }[] };
  versie: number;
  /**
   * V8 (besluit B-c): de vraag in `fact_requests` die de kernvraag van deze
   * pagina beantwoordt, of `null` als de brief er geen stelde of aanwees. Per
   * pagina en niet op de vraag zelf: een eerdere vraag kan de kern van deze
   * pagina zijn en niet van een andere.
   */
  kernvraagId?: string | null;
  /**
   * B34: de zoekresultaten van Google die de brief kreeg, geschoond, of null
   * (een dienstpagina, de schakelaar uit, of niets gelukt). Ontbreekt bij een
   * brief van vóór versie 7.
   */
  zoekresultaten?: BriefZoekresultaten | null;
}

export type BriefUitkomst =
  | { uitkomst: "gemaakt" | "bestond_al"; profileId: string; poort: Poortuitslag }
  | { uitkomst: "geen_pagina" };

function vandaag(): string {
  return new Date().toISOString().slice(0, 10);
}

function compactBedrijf(b: BedrijfsInvoer): BriefJson["bedrijf"] {
  // Sinds B20 zijn het kennisitems; de vorm in `brief_json` blijft dezelfde.
  return { feiten: b.kennis.map((k) => ({ id: k.id, text: k.bewering })) };
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

/** De naam van het merk en zijn andere schrijfwijzen, om vakkennis over het bedrijf zelf te herkennen (V4). */
async function merkNamen(admin: Admin, profileId: string, naam: string): Promise<string[]> {
  const { data } = await admin.from("profiles").select("name, brand_name, aliases").eq("id", profileId).maybeSingle();
  const r = (data ?? {}) as { name?: string | null; brand_name?: string | null; aliases?: string[] | null };
  return [...new Set([naam, r.name ?? "", r.brand_name ?? "", ...(r.aliases ?? [])].map((n) => n.trim()).filter(Boolean))];
}

async function eerdereVragen(admin: Admin, profileId: string): Promise<EerdereVraag[]> {
  const { data } = await admin
    .from("fact_requests")
    .select("id, question, status, answer, open_vraag, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(MAX_EERDERE_VRAGEN);
  // De open vraag per pagina is voor elke pagina dezelfde vraag met een andere
  // titel; die hoort niet in de lijst waarmee het model herhaling vermijdt.
  return ((data ?? []) as (EerdereVraag & { open_vraag?: boolean })[])
    .filter((v) => !v.open_vraag)
    .map(({ id, question, status, answer }) => ({ id, question, status, answer: status === "beantwoord" ? (answer ?? null) : null }));
}

async function bewaarVragen(admin: Admin, pagina: PaginaBasis, vragen: NieuweVraag[]): Promise<{ bewaard: number; kernId: string | null }> {
  let bewaard = 0;
  let kernId: string | null = null;
  for (const v of vragen) {
    const { data: rij, error } = await admin.from("fact_requests").insert({
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
      // V8: de kernvraag staat bovenaan, met "zonder dit antwoord wordt deze
      // pagina zwak" (`VERPLICHT_UITLEG`). Een nieuwe vraag hangt aan één
      // pagina, dus hier mag het op de vraag zelf.
      required: v.kern,
      content_piece_ids: [pagina.pieceId],
      raw_json: { bron: "pagina_brief", soort: v.soort, kern: v.kern },
    }).select("id").single();
    // 23505: de unieke index op (merk, vraagtekst) uit migratie 0019. Dezelfde
    // vraag stond er al; dat is precies wat hier niet dubbel mag.
    if (error && (error as { code?: string }).code !== "23505") {
      throw new Error(`Vraag bewaren voor pagina ${pagina.pieceId} mislukte: ${error.message}`);
    }
    if (!error) {
      bewaard++;
      if (v.kern) kernId = (rij as { id: string } | null)?.id ?? null;
    }
  }
  return { bewaard, kernId };
}

/** Een open of al beantwoorde vraag van dit merk ook aan deze pagina hangen (V17). */
async function koppelVragen(admin: Admin, pagina: PaginaBasis, ids: string[]): Promise<void> {
  for (const id of ids) {
    const { data } = await admin
      .from("fact_requests")
      .select("id, content_piece_ids")
      .eq("id", id)
      .eq("profile_id", pagina.profileId)
      .in("status", ["open", "beantwoord"])
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
  const site = await siteTeksten(admin, pagina.profileId);
  // V2: menu, telefoonbalk en voettekst die op de hele site staan, zijn geen
  // tekst van deze pagina. Ook bij een al bewaarde tekst, want die kan van vóór
  // deze regel zijn.
  if (pagina.bestaandeTekst?.trim()) return zonderSiteHerhaling(pagina.bestaandeTekst, site);
  if (!pagina.bestaandAdres) return null;
  const opgehaald = await fetchExistingPage(pagina.bestaandAdres);
  if (!opgehaald.text) return null;
  const tekst = zonderSiteHerhaling(opgehaald.text, site);
  await admin
    .from("content_pieces")
    .update({ existing_page_text: tekst, existing_page_fetched_at: opgehaald.fetchedAt })
    .eq("id", pagina.pieceId);
  return tekst;
}

export async function maakBrief(admin: Admin, pieceId: string): Promise<BriefUitkomst> {
  const pagina = await laadPagina(admin, pieceId);
  if (!pagina) return { uitkomst: "geen_pagina" };
  if (pagina.briefJson) {
    return { uitkomst: "bestond_al", profileId: pagina.profileId, poort: await poortVoor(admin, pagina) };
  }

  const merk = await laadMerk(admin, pagina);
  // V19 (besluit B31): het kennisgat gaat niet meer mee. De brief ziet blok A
  // en alle eerdere antwoorden, en ziet zo zelf wat er ontbreekt.
  const [bedrijf, doelvragen, eerdere, tekst, namen, definitie] = await Promise.all([
    laadBedrijf(admin, pagina),
    laadDoelvragen(admin, pagina.sourceRef, merk.concurrenten, pagina.eigenIdeeAnalyse),
    eerdereVragen(admin, pagina.profileId),
    huidigeTekst(admin, pagina),
    merkNamen(admin, pagina.profileId, merk.naam),
    laadPaginaDefinitie(admin, pagina.sourceRef),
  ]);

  // B34: de zoekresultaten van Google, alleen voor een soort die ze krijgt.
  // Na het laden hierboven, want de zoekopdrachten zijn de titel, de kernvraag
  // en de doelvragen. Gooit nooit.
  const soort = soortVan(pagina.type);
  const zoekresultaten = await haalZoekresultatenVoorBrief(
    {
      type: pagina.type,
      profileId: pagina.profileId,
      analysisId: pagina.analysisId,
      pieceId,
      titel: pagina.titel,
      kernvraag: definitie.kernvraag,
      doelvragen: doelvragen.map((d) => d.vraag),
    },
    { url: merk.url, namen, concurrenten: merk.concurrenten },
  ).catch((err) => {
    console.error(`Zoekresultaten voor pagina ${pieceId} ophalen mislukt:`, err);
    return null;
  });

  const { parsed } = await callStructured({
    model: MODELS.content,
    system: BRIEF_SYSTEEM,
    user: briefInvoer({
      titel: pagina.titel,
      paginasoort: soort.label,
      soortBeschrijving: soort.beschrijving,
      zoekresultaten: zoekresultatenBlok(zoekresultaten),
      handeling: pagina.handeling,
      zoekintentie: pagina.zoekintentie,
      waarom: pagina.waarom,
      kernvraag: definitie.kernvraag,
      doelvragen,
      merknaam: merk.naam,
      werkgebied: merk.werkgebied,
      bedrijf: blokA(bedrijf),
      huidigeTekst: tekst,
      eerdereVragen: eerdere.map((v) => ({ id: v.id, vraag: v.question, stand: v.status, antwoord: v.answer ?? null })),
    }),
    schema: ContentBriefSchema,
    schemaName: "content_brief",
    webSearch: true,
    work: "analytical",
    meta: { kind: "pagina_brief", profileId: pagina.profileId, analysisId: pagina.analysisId, contentPieceId: pieceId },
  });

  const verwerkt = verwerkBrief(parsed, eerdere, { url: merk.url, namen });

  // Eerst de vragen, dan de brief: de schrijfpoort kijkt of de brief er is en
  // of er nul open vragen zijn. Andersom zou een gelijktijdige poortvraag in
  // het gat daartussen een pagina zonder vragen zien en te vroeg schrijven.
  const { kernId } = await bewaarVragen(admin, pagina, verwerkt.vragen);
  await koppelVragen(admin, pagina, verwerkt.koppel);
  const brief: BriefJson = {
    onderzoek: verwerkt.onderzoek,
    bedrijf: compactBedrijf(bedrijf),
    versie: BRIEF_VERSIE,
    kernvraagId: kernId ?? verwerkt.kernEerder,
    zoekresultaten,
  };
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
