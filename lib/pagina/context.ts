import "server-only";

/**
 * WAT DE KETEN OVER ÉÉN PAGINA WEET, uit de database gelezen
 * (`docs/tasks/contentketen-opnieuw.md` §5 en §6).
 *
 * Eén plek voor het lezen, zodat de brief en de schrijver precies dezelfde
 * pagina, hetzelfde merk en hetzelfde blok A zien. Geen AI, geen oordeel: wat
 * er wel en niet mee gaat, beslissen de pure modules (`bedrijfskennis.ts`).
 *
 * Bewust platte uitvragen zonder joins: de ketentest draait deze code tegen een
 * echte Postgres via een shim die geen geneste selecties nabootst, en per
 * pagina kosten een paar kleine uitvragen niets.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { redactCompetitors } from "@/lib/pipeline/redact";
import { schoneWaardeproposities } from "@/lib/pipeline/waardeproposities";
import { antwoordenVoorBlokA, kiesFeiten, type AntwoordRij, type BedrijfsInvoer, type FeitRij } from "@/lib/pagina/bedrijfskennis";
import type { Doelvraag } from "@/lib/pagina/brief-opdracht";
import type { ContentAction, ContentType, StemVoorbeeld } from "@/lib/types/database";

type Admin = SupabaseClient;

export interface PaginaBasis {
  pieceId: string;
  analysisId: string;
  profileId: string;
  titel: string;
  type: ContentType;
  handeling: ContentAction;
  zoekintentie: string | null;
  waarom: string | null;
  bestaandAdres: string | null;
  bestaandeTekst: string | null;
  briefJson: unknown | null;
  status: string;
  versie: number;
  /** De plan-pagina die naar deze rij wijst, als die er is. */
  planPaginaId: string | null;
  publicatiedatum: string | null;
  sourceRef: string | null;
}

export interface MerkBasis {
  naam: string;
  werkgebied: string[];
  concurrenten: string[];
  aanspreekvorm: "je" | "u" | "wij" | null;
  verbodenWoorden: string[];
  verbodenOnderwerpen: string[];
  stemVoorbeelden: StemVoorbeeld[];
  /** De hoofd-URL van het merk. */
  url: string;
}

export async function laadPagina(admin: Admin, pieceId: string): Promise<PaginaBasis | null> {
  const { data: stuk } = await admin
    .from("content_pieces")
    .select(
      "id, analysis_id, title, type, target_intent, action, existing_url, existing_page_text, brief_json, status, version",
    )
    .eq("id", pieceId)
    .maybeSingle();
  if (!stuk) return null;
  const s = stuk as Record<string, unknown>;

  const [{ data: analyse }, { data: plan }] = await Promise.all([
    admin.from("analyses").select("profile_id").eq("id", s.analysis_id as string).maybeSingle(),
    admin
      .from("planned_pages")
      .select("id, why, target_intent, source_ref, scheduled_for")
      .eq("content_piece_id", pieceId)
      .limit(1)
      .maybeSingle(),
  ]);
  const profileId = (analyse as { profile_id?: string | null } | null)?.profile_id;
  if (!profileId) return null;
  const p = (plan ?? null) as Record<string, unknown> | null;

  return {
    pieceId,
    analysisId: s.analysis_id as string,
    profileId,
    titel: s.title as string,
    type: s.type as ContentType,
    handeling: (s.action as ContentAction | null) === "verbeteren" ? "verbeteren" : "nieuw",
    zoekintentie: ((s.target_intent as string | null) ?? (p?.target_intent as string | null) ?? null) || null,
    waarom: ((p?.why as string | null) ?? null) || null,
    bestaandAdres: (s.existing_url as string | null) ?? null,
    bestaandeTekst: (s.existing_page_text as string | null) ?? null,
    briefJson: s.brief_json ?? null,
    status: s.status as string,
    versie: (s.version as number | null) ?? 1,
    planPaginaId: (p?.id as string | null) ?? null,
    publicatiedatum: (p?.scheduled_for as string | null) ?? null,
    sourceRef: (p?.source_ref as string | null) ?? null,
  };
}

interface ProfielRij {
  brand_name: string | null;
  name: string;
  service_regions: string[] | null;
  competitors: string[] | null;
  value_props: string[] | null;
  differentiator: string | null;
  offline_proof: string[] | null;
  sales_objections: string[] | null;
  verhalen: string | null;
  pronoun_preference: "je" | "u" | "wij" | null;
  taboo_phrases: string[] | null;
  forbidden_topics: string[] | null;
  stem_voorbeelden: StemVoorbeeld[] | null;
  url: string;
}

async function laadProfiel(admin: Admin, profileId: string): Promise<ProfielRij> {
  const { data, error } = await admin
    .from("profiles")
    .select(
      "brand_name, name, service_regions, competitors, value_props, differentiator, offline_proof, " +
        "sales_objections, verhalen, pronoun_preference, taboo_phrases, forbidden_topics, stem_voorbeelden, url",
    )
    .eq("id", profileId)
    .maybeSingle();
  if (error || !data) throw new Error(`Merk ${profileId} lezen mislukte: ${error?.message ?? "niet gevonden"}`);
  return data as unknown as ProfielRij;
}

export async function laadMerk(admin: Admin, pagina: PaginaBasis): Promise<MerkBasis> {
  const profiel = await laadProfiel(admin, pagina.profileId);
  const { data: onderzoek } = await admin
    .from("topic_research")
    .select("competitors")
    .eq("analysis_id", pagina.analysisId)
    .maybeSingle();
  const concurrenten = Array.from(
    new Set([...(profiel.competitors ?? []), ...(((onderzoek as { competitors?: string[] | null } | null)?.competitors) ?? [])]),
  ).filter((n) => typeof n === "string" && n.trim());
  return {
    naam: profiel.brand_name?.trim() || profiel.name,
    werkgebied: profiel.service_regions ?? [],
    concurrenten,
    aanspreekvorm: profiel.pronoun_preference,
    verbodenWoorden: profiel.taboo_phrases ?? [],
    verbodenOnderwerpen: profiel.forbidden_topics ?? [],
    url: profiel.url,
    stemVoorbeelden: (profiel.stem_voorbeelden ?? []).filter((v) => v?.tekst?.trim()),
  };
}

/**
 * Blok A voor deze pagina: de feiten die erbij horen, plus wat de ondernemer
 * over het hele merk en in antwoord op het rapport van dit cluster vertelde
 * (`antwoordenVoorBlokA`, besluit B17). Betwiste en vervangen feiten gaan niet
 * mee (`kiesFeiten`), een feit van een ander cluster ook niet.
 */
export async function laadBedrijf(admin: Admin, pagina: PaginaBasis): Promise<BedrijfsInvoer> {
  const profiel = await laadProfiel(admin, pagina.profileId);
  const [{ data: feitRijen }, { data: antwoorden }] = await Promise.all([
    admin
      .from("brand_facts")
      .select("id, text, stand, superseded_by, allowed, geldt_voor, bewijskracht, analysis_id")
      .eq("profile_id", pagina.profileId),
    admin
      .from("fact_requests")
      .select("question, answer, scope, analysis_id, content_piece_ids, open_vraag")
      .eq("profile_id", pagina.profileId)
      .in("scope", ["merk", "analyse"])
      .eq("status", "beantwoord"),
  ]);
  const feiten = ((feitRijen ?? []) as (FeitRij & { analysis_id: string | null })[]).filter(
    (f) => !f.analysis_id || f.analysis_id === pagina.analysisId,
  );
  return {
    bedrijfsnaam: profiel.brand_name?.trim() || profiel.name,
    feiten: kiesFeiten(feiten, { titel: pagina.titel, onderwerp: null, zoekintentie: pagina.zoekintentie }),
    waardeproposities: schoneWaardeproposities(profiel.value_props),
    verhalen: profiel.verhalen ?? null,
    bezwaren: (profiel.sales_objections ?? []).filter((b) => b?.trim()),
    merkAntwoorden: antwoordenVoorBlokA((antwoorden ?? []) as AntwoordRij[], {
      analysisId: pagina.analysisId,
      pieceId: pagina.pieceId,
    }),
    onderscheid: profiel.differentiator,
    offlineBewijs: (profiel.offline_proof ?? []).filter((b) => b?.trim()),
  };
}

/**
 * De doelvragen uit de meting met wat een AI-assistent nu antwoordt, zonder de
 * namen van concurrenten. `sourceRef` is `<rapport-id>#<volgnummer>` van de
 * aanbeveling (migratie 0065).
 */
export async function laadDoelvragen(admin: Admin, sourceRef: string | null, concurrenten: string[]): Promise<Doelvraag[]> {
  if (!sourceRef) return [];
  const [reportId, nr] = sourceRef.split("#");
  const volgnummer = Number(nr);
  if (!reportId || !Number.isInteger(volgnummer) || volgnummer < 0) return [];
  const { data } = await admin.from("reports").select("recommendations_json").eq("id", reportId).maybeSingle();
  const lijst = (data as { recommendations_json?: unknown } | null)?.recommendations_json;
  const aanbeveling = Array.isArray(lijst) ? (lijst[volgnummer] as { targets?: unknown } | undefined) : undefined;
  const doelen = (Array.isArray(aanbeveling?.targets) ? aanbeveling.targets : []) as { text?: unknown; runId?: unknown }[];
  const runIds = doelen.map((d) => d.runId).filter((id): id is string => typeof id === "string" && id.length > 0);
  const antwoordPerRun = new Map<string, string>();
  if (runIds.length > 0) {
    const { data: runs } = await admin.from("tracking_runs").select("id, raw_response").in("id", Array.from(new Set(runIds)));
    for (const r of (runs ?? []) as { id: string; raw_response: string | null }[]) {
      if (r.raw_response?.trim()) antwoordPerRun.set(r.id, r.raw_response);
    }
  }
  return doelen
    .filter((d) => typeof d.text === "string" && d.text.trim())
    .map((d) => {
      const ruw = typeof d.runId === "string" ? antwoordPerRun.get(d.runId) : undefined;
      return { vraag: (d.text as string).trim(), antwoord: ruw ? redactCompetitors(ruw, concurrenten) : null };
    });
}
