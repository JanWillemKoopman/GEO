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
import { laadBedrijf, laadDoelvragen, laadMerk, laadPagina, laadPaginaDefinitie, siteTeksten, type MerkBasis, type PaginaBasis } from "@/lib/pagina/context";
import { zonderSiteHerhaling } from "@/lib/pipeline/site-herhaling";
import { functieblok } from "@/lib/pipeline/paginafunctie";
import { repareerMechanisch, type PaginaTekst } from "@/lib/pagina/mechanisch";
import { laadOrganisatie } from "@/lib/pagina/organisatie";
import { soortVan } from "@/lib/pagina/soorten";
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

/** Hoeveel andere pagina's uit het cluster de schrijver meekrijgt. */
const MAX_BUREN = 20;

export interface Schrijfbasis {
  pagina: PaginaBasis;
  merk: MerkBasis;
  bedrijf: BedrijfsInvoer;
  blokken: SchrijfBlokken;
  /**
   * De bedrijfskennis waar een harde bewering in teruggevonden mag worden
   * (§6.5): blok A, blok B en de stemvoorbeelden.
   */
  bronnen: string[];
  /** De vakkennis van blok C: alleen een bron voor een zin die niet over het bedrijf gaat (V4). */
  algemeneBronnen: string[];
}

/**
 * Zonder stemvoorbeelden de tekst van de homepage (§6.10): dat is ook de eigen
 * tekst van het bedrijf, en beter dan geen stem.
 */
async function stemVan(admin: Admin, merk: MerkBasis, profileId: string, site: readonly string[]): Promise<Stemvoorbeeld[]> {
  // V2: menu en telefoonbalk zijn geen stem. Ook bij opgegeven stemvoorbeelden,
  // want die zijn met dezelfde ophaalfunctie van de site gehaald.
  if (merk.stemVoorbeelden.length > 0) {
    return merk.stemVoorbeelden
      .map((v) => ({ bron: v.url, tekst: zonderSiteHerhaling(v.tekst ?? "", site).slice(0, STEMTEKST_MAX) }))
      .filter((v) => v.tekst.trim());
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
  const tekst = home?.text_excerpt ? vanafEersteAlinea(zonderSiteHerhaling(home.text_excerpt, site)).slice(0, STEMTEKST_MAX) : "";
  return tekst ? [{ bron: home!.url, tekst }] : [];
}

/**
 * Blok B: wat de ondernemer over déze pagina vertelde, en welke vragen hij
 * oversloeg (V8 punt 3). Een overgeslagen vraag telt niet als antwoord.
 */
async function klantinput(
  admin: Admin,
  pieceId: string,
): Promise<{ eigenVerhaal: string | null; antwoorden: { vraag: string; antwoord: string }[]; overgeslagen: string[] }> {
  const { data } = await admin
    .from("fact_requests")
    .select("question, answer, status, scope, open_vraag, created_at")
    .contains("content_piece_ids", [pieceId])
    .in("status", ["beantwoord", "overgeslagen"])
    .order("created_at", { ascending: true });
  const alle = (data ?? []) as { question: string; answer: string | null; status: string; scope: string | null; open_vraag: boolean | null }[];
  const rijen = alle.filter((r) => r.status === "beantwoord");
  const open = rijen.find((r) => r.open_vraag && r.answer?.trim());
  return {
    eigenVerhaal: open?.answer?.trim() ?? null,
    // Een merkbrede vraag staat al in blok A ("eerder beantwoorde vragen").
    antwoorden: rijen
      .filter((r) => !r.open_vraag && r.scope !== "merk" && r.answer?.trim())
      .map((r) => ({ vraag: r.question, antwoord: (r.answer as string).trim() })),
    // De open vraag overslaan is geen gat: daar is altijd niets gevraagd wat de
    // pagina nodig heeft (B3).
    overgeslagen: alle.filter((r) => r.status === "overgeslagen" && !r.open_vraag).map((r) => r.question),
  };
}

/**
 * V7 punt 3: de andere pagina's uit hetzelfde cluster, met hun rol. Uit de
 * kansen van het cluster: die dragen zowel wat al geschreven is als wat nog op
 * het plan staat, en de rol uit het rapport (V6).
 */
async function burenInCluster(admin: Admin, pagina: PaginaBasis): Promise<string[]> {
  const { data } = await admin
    .from("kansen")
    .select("titel, sleutel, status, ruw")
    .eq("analysis_id", pagina.analysisId)
    .neq("status", "vervallen")
    .limit(MAX_BUREN * 2);
  const gezien = new Set<string>([pagina.titel.trim().toLowerCase()]);
  const uit: string[] = [];
  for (const k of (data ?? []) as { titel: string; sleutel: string | null; ruw: { rol?: unknown } | null }[]) {
    if (k.sleutel && k.sleutel === pagina.sourceRef) continue;
    const titel = k.titel?.trim();
    if (!titel || gezien.has(titel.toLowerCase())) continue;
    gezien.add(titel.toLowerCase());
    const rol = typeof k.ruw?.rol === "string" ? k.ruw.rol.trim() : "";
    uit.push(rol ? `${titel}: ${rol}` : titel);
  }
  return uit.slice(0, MAX_BUREN);
}

export async function laadSchrijfbasis(admin: Admin, pieceId: string): Promise<Schrijfbasis | null> {
  const pagina = await laadPagina(admin, pieceId);
  if (!pagina) return null;
  const merkProfiel = await laadMerk(admin, pagina);
  const bedrijf = await laadBedrijf(admin, pagina);
  // B20: een verbod uit de kennislaag telt mee, naast wat het merkprofiel nog
  // als kopie draagt (tot K8 schrijven beide), voor de schrijver én de controle
  // op verboden woorden (B16).
  const merk: MerkBasis = {
    ...merkProfiel,
    verbodenWoorden: [...new Set([...merkProfiel.verbodenWoorden, ...bedrijf.verbodenWoorden])],
    verbodenOnderwerpen: [...new Set([...merkProfiel.verbodenOnderwerpen, ...bedrijf.verbodenOnderwerpen])],
  };
  const site = await siteTeksten(admin, pagina.profileId);
  const [stem, klant, buren, doelvragen, definitie] = await Promise.all([
    stemVan(admin, merk, pagina.profileId, site),
    klantinput(admin, pieceId),
    burenInCluster(admin, pagina),
    laadDoelvragen(admin, pagina.sourceRef, merk.concurrenten),
    laadPaginaDefinitie(admin, pagina.sourceRef),
  ]);
  const onderzoek = (pagina.briefJson as BriefJson | null)?.onderzoek ?? null;
  const bedrijfTekst = blokA(bedrijf);
  const blokken: SchrijfBlokken = {
    titel: pagina.titel,
    paginasoort: soortVan(pagina.type).label,
    soortBeschrijving: soortVan(pagina.type).beschrijving,
    handeling: pagina.handeling,
    bedrijf: bedrijfTekst,
    stem,
    eigenVerhaal: klant.eigenVerhaal,
    antwoorden: klant.antwoorden,
    overgeslagen: klant.overgeslagen,
    onderzoek,
    zoekintentie: onderzoek?.zoekintentie || pagina.zoekintentie,
    doelvragen: doelvragen.map((d) => d.vraag),
    rol: definitie.rol,
    kernvraag: definitie.kernvraag,
    buren,
    huidigeTekst: pagina.handeling === "verbeteren" && pagina.bestaandeTekst ? zonderSiteHerhaling(pagina.bestaandeTekst, site) : null,
    functie: pagina.handeling === "verbeteren" ? functieblok(pagina.bestaandAdres, null) || null : null,
  };
  const bronnen = [
    bedrijfTekst,
    klant.eigenVerhaal ?? "",
    ...klant.antwoorden.map((a) => `${a.vraag} ${a.antwoord}`),
    ...stem.map((s) => s.tekst),
  ].filter((t) => t.trim());
  const algemeneBronnen = (onderzoek?.vakkennis ?? []).map((v) => v.uitleg).filter((t) => t.trim());
  return { pagina, merk, bedrijf, blokken, bronnen, algemeneBronnen };
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
      // V23: de publicatiedatum komt pas bij "deze pagina staat live"
      // (`markPublished()`), niet op het moment van schrijven.
      datePublished: null,
      dateModified: nu,
    }),
    word_count: tekst.tekst_markdown.split(/\s+/).filter(Boolean).length,
    // C3: welke kennis in DEZE versie ging, uit wat kiesVoorBlokA() koos. De
    // code legt dit vast, de schrijver wijst niets aan (B9 blijft staan).
    gebruikte_kennis: basis.bedrijf.kennis.map((k) => k.id),
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
