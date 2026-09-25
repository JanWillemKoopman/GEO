import "server-only";

/**
 * SCHRIJVEN EN HERSCHRIJVEN (`docs/tasks/contentketen-opnieuw.md` §6.4 en §6.7).
 *
 * Wat hier staat, is de bedrading rond de schrijfopdracht: de vier blokken
 * uit de database halen, de aanroep in de achtergrondmodus, en de tekst na de
 * mechanische reparatie bewaren. Wat de schrijver te horen krijgt, staat
 * uitsluitend in `schrijfopdracht.ts`.
 *
 * ── WAAROM ALTIJD DE ACHTERGRONDMODUS ──────────────────────────────────────
 *
 * Een aanroep op Sol met denktijd hoog duurde 179 tot 359 seconden; een
 * werker-aanroep mag er hooguit 300. Direct aanroepen zou een deel van de
 * pagina's laten afbreken en dan betaalt de wachtrij het duurste model twee
 * keer. De taak start de aanroep, bewaart het response-id in zijn eigen
 * payload, en een ophaalronde haalt het resultaat later op. Een nieuwe poging
 * van de starttaak ziet het id en haalt op in plaats van opnieuw te starten.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { MODELS } from "@/lib/openai/models";
import type { StructuredCallOptions } from "@/lib/openai/structured";
import { validateOrRebuildJsonLd } from "@/lib/schema-jsonld";
import { blokA, type BedrijfsInvoer } from "@/lib/pagina/bedrijfskennis";
import type { BriefJson } from "@/lib/pagina/brief";
import { laadBedrijf, laadDoelvragen, laadMerk, laadPagina, type MerkBasis, type PaginaBasis } from "@/lib/pagina/context";
import { repareerMechanisch, type PaginaTekst } from "@/lib/pagina/mechanisch";
import { laadOrganisatie } from "@/lib/pagina/organisatie";
import { SOORT_LABEL } from "@/lib/pagina/paginasoort";
import {
  PaginaSchema,
  SCHRIJFOPDRACHT_VERSIE,
  schrijfSysteem,
  type PaginaUitvoer,
  type SchrijfBlokken,
  type Stemvoorbeeld,
} from "@/lib/pagina/schrijfopdracht";
import { STEMTEKST_MAX, vanafEersteAlinea } from "@/lib/pagina/stemvoorbeelden-regels";

type Admin = SupabaseClient;

/** Hoeveel titels van andere pagina's de schrijver meekrijgt. */
const MAX_ANDERE_TITELS = 60;

export interface Schrijfbasis {
  pagina: PaginaBasis;
  merk: MerkBasis;
  bedrijf: BedrijfsInvoer;
  blokken: SchrijfBlokken;
  /**
   * Alle tekst waar een harde bewering in teruggevonden mag worden (§6.5):
   * blok A, blok B, de stemvoorbeelden en de vakkennis van blok C.
   */
  bronnen: string[];
}

/**
 * Zonder stemvoorbeelden de tekst van de homepage (§6.10): dat is ook de eigen
 * tekst van het bedrijf, en beter dan geen stem.
 */
async function stemVan(admin: Admin, merk: MerkBasis, profileId: string): Promise<Stemvoorbeeld[]> {
  if (merk.stemVoorbeelden.length > 0) {
    return merk.stemVoorbeelden.map((v) => ({ bron: v.url, tekst: (v.tekst ?? "").slice(0, STEMTEKST_MAX) }));
  }
  const { data } = await admin.from("profile_pages").select("url, text_excerpt").eq("profile_id", profileId).limit(200);
  const paginas = (data ?? []) as { url: string; text_excerpt: string | null }[];
  const home = paginas.find((p) => {
    try {
      return new URL(p.url).pathname.replace(/\/+$/, "") === "";
    } catch {
      return false;
    }
  });
  const tekst = home?.text_excerpt ? vanafEersteAlinea(home.text_excerpt).slice(0, STEMTEKST_MAX) : "";
  return tekst ? [{ bron: home!.url, tekst }] : [];
}

/** Blok B: wat de ondernemer over déze pagina vertelde. Overgeslagen vragen tellen niet. */
async function klantinput(admin: Admin, pieceId: string): Promise<{ eigenVerhaal: string | null; antwoorden: { vraag: string; antwoord: string }[] }> {
  const { data } = await admin
    .from("fact_requests")
    .select("question, answer, status, scope, open_vraag, created_at")
    .contains("content_piece_ids", [pieceId])
    .eq("status", "beantwoord")
    .order("created_at", { ascending: true });
  const rijen = (data ?? []) as { question: string; answer: string | null; scope: string | null; open_vraag: boolean | null }[];
  const open = rijen.find((r) => r.open_vraag && r.answer?.trim());
  return {
    eigenVerhaal: open?.answer?.trim() ?? null,
    // Een merkbrede vraag staat al in blok A ("eerder beantwoorde vragen").
    antwoorden: rijen
      .filter((r) => !r.open_vraag && r.scope !== "merk" && r.answer?.trim())
      .map((r) => ({ vraag: r.question, antwoord: (r.answer as string).trim() })),
  };
}

async function andereTitels(admin: Admin, pagina: PaginaBasis): Promise<string[]> {
  const { data: analyses } = await admin.from("analyses").select("id").eq("profile_id", pagina.profileId);
  const ids = ((analyses ?? []) as { id: string }[]).map((a) => a.id);
  if (ids.length === 0) return [];
  const { data } = await admin
    .from("content_pieces")
    .select("id, title, status, is_current")
    .in("analysis_id", ids)
    .limit(500);
  return Array.from(
    new Set(
      ((data ?? []) as { id: string; title: string; status: string; is_current: boolean | null }[])
        .filter((p) => p.id !== pagina.pieceId && p.is_current !== false && p.status !== "archived")
        .map((p) => p.title?.trim())
        .filter((t): t is string => Boolean(t) && t !== pagina.titel),
    ),
  ).slice(0, MAX_ANDERE_TITELS);
}

export async function laadSchrijfbasis(admin: Admin, pieceId: string): Promise<Schrijfbasis | null> {
  const pagina = await laadPagina(admin, pieceId);
  if (!pagina) return null;
  const merk = await laadMerk(admin, pagina);
  const [bedrijf, stem, klant, titels, doelvragen] = await Promise.all([
    laadBedrijf(admin, pagina),
    stemVan(admin, merk, pagina.profileId),
    klantinput(admin, pieceId),
    andereTitels(admin, pagina),
    laadDoelvragen(admin, pagina.sourceRef, merk.concurrenten),
  ]);
  const onderzoek = (pagina.briefJson as BriefJson | null)?.onderzoek ?? null;
  const bedrijfTekst = blokA(bedrijf);
  const blokken: SchrijfBlokken = {
    titel: pagina.titel,
    paginasoort: SOORT_LABEL[pagina.type] ?? pagina.type,
    handeling: pagina.handeling,
    bedrijf: bedrijfTekst,
    stem,
    eigenVerhaal: klant.eigenVerhaal,
    antwoorden: klant.antwoorden,
    onderzoek,
    zoekintentie: onderzoek?.zoekintentie || pagina.zoekintentie,
    doelvragen: doelvragen.map((d) => d.vraag),
    andereTitels: titels,
    huidigeTekst: pagina.handeling === "verbeteren" ? pagina.bestaandeTekst : null,
  };
  const bronnen = [
    bedrijfTekst,
    klant.eigenVerhaal ?? "",
    ...klant.antwoorden.map((a) => `${a.vraag} ${a.antwoord}`),
    ...stem.map((s) => s.tekst),
    ...(onderzoek?.vakkennis ?? []).map((v) => v.uitleg),
  ].filter((t) => t.trim());
  return { pagina, merk, bedrijf, blokken, bronnen };
}

/** De opties voor de aanroep. `kind` is de taaksoort, voor het kostenlogboek. */
export function schrijfOpties(
  basis: Schrijfbasis,
  user: string,
  kind: "pagina_schrijven" | "pagina_herschrijven",
): StructuredCallOptions<PaginaUitvoer> {
  return {
    model: MODELS.content,
    system: schrijfSysteem({
      aanspreekvorm: basis.merk.aanspreekvorm,
      verbodenOnderwerpen: basis.merk.verbodenOnderwerpen,
      verbodenWoorden: basis.merk.verbodenWoorden,
    }),
    user,
    schema: PaginaSchema,
    schemaName: "pagina",
    work: "redactioneel",
    meta: {
      kind,
      profileId: basis.pagina.profileId,
      analysisId: basis.pagina.analysisId,
      contentPieceId: basis.pagina.pieceId,
    },
  };
}

/** De uitvoer na de mechanische reparatie (§6.5). Repareren, nooit blokkeren. */
export function gerepareerd(uitvoer: PaginaUitvoer, bedrijfsnaam: string): PaginaTekst {
  return repareerMechanisch(
    {
      titel: uitvoer.titel,
      meta_titel: uitvoer.meta_titel,
      meta_beschrijving: uitvoer.meta_beschrijving,
      tekst_markdown: uitvoer.tekst_markdown,
      faq: uitvoer.faq,
    },
    bedrijfsnaam,
  );
}

/** De kolommen van `content_pieces` voor een geschreven tekst. */
export async function tekstKolommen(
  admin: Admin,
  basis: Schrijfbasis,
  tekst: PaginaTekst,
  ruw: { uitvoer: PaginaUitvoer; soort: "schrijven" | "herschrijven" },
): Promise<Record<string, unknown>> {
  const [organisatie, { data: profiel }] = await Promise.all([
    laadOrganisatie(admin, basis.pagina.profileId),
    admin.from("profiles").select("business_model").eq("id", basis.pagina.profileId).maybeSingle(),
  ]);
  const faq = tekst.faq.map((f) => ({ q: f.vraag, a: f.antwoord }));
  const nu = new Date().toISOString();
  // ⚠️ `title` blijft de titel uit het plan en wordt hier niet overschreven: de
  // unieke index uit migratie 0023 staat op (cluster, titel) en een schrijver
  // die toevallig de titel van een andere pagina kiest, liet de hele opslag
  // stil mislukken (gevonden in de ketentest van WP6). De titel van de
  // schrijver staat in `raw_json.uitvoer.titel` en in de metatitel.
  return {
    body_markdown: tekst.tekst_markdown,
    meta_title: tekst.meta_titel,
    meta_description: tekst.meta_beschrijving,
    faq_json: faq,
    schema_jsonld: validateOrRebuildJsonLd(null, {
      type: basis.pagina.type,
      title: tekst.titel || basis.pagina.titel,
      description: tekst.meta_beschrijving,
      url: basis.pagina.bestaandAdres ?? basis.merk.url,
      faq,
      businessModel: (profiel as { business_model?: never } | null)?.business_model ?? null,
      organization: organisatie,
      datePublished: nu,
      dateModified: nu,
    }),
    word_count: tekst.tekst_markdown.split(/\s+/).filter(Boolean).length,
    // Conventie 8: de volledige uitvoer van het model staat ook in `ai_calls`;
    // hier met het versienummer van de opdracht erbij, zodat een uitslag altijd
    // bij een versie van `schrijfopdracht.ts` hoort.
    raw_json: {
      soort: ruw.soort,
      schrijfopdracht_versie: SCHRIJFOPDRACHT_VERSIE,
      uitvoer: ruw.uitvoer,
      notitie_voor_ondernemer: ruw.uitvoer.notitie_voor_ondernemer,
    },
    updated_at: nu,
  };
}
