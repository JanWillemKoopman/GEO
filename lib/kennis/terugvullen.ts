/**
 * HET TERUGVULPLAN: wat ORBIT al weet, omgezet naar kennisitems (K3 van
 * `docs/tasks/van-pijplijn-naar-kennissysteem.md`, volgens
 * `docs/tasks/kennismodel-inventaris.md`).
 *
 * Code, geen AI (§4 regel 1). Elke oude rij wordt een item, of een bewuste
 * uitsluiting met reden. Wat de code niet kan beslissen, komt op een lijst voor
 * de consultant. `dekking()` bewijst dat er niets tussen wal en schip valt.
 *
 * ── DE STATUS ───────────────────────────────────────────────────────────────
 *
 * Wie het vandaag zette, bepaalt de status, niet wat de tekst beweert:
 *   - een profielveld: `profile_field_sources` (gesprek, klant of consultant
 *     wordt verklaard; ai of geen herkomst wordt afgeleid);
 *   - een feit: waargenomen als het citaat nog in de ruwe uitvoer van de
 *     samenvatting staat (bij de inventaris: 33 van 33), anders afgeleid;
 *   - een aanbodknoop: waargenomen met zijn eigen citaat, verklaard als een mens
 *     hem aanpaste (dan hoort het citaat van het model niet meer bij de tekst);
 *   - een antwoord van de ondernemer: verklaard.
 * Afgeleid krijgt altijd het gebruik "intern" (P3).
 *
 * Puur en zonder `server-only` (conventie 2). De uitvoering staat in
 * `scripts/kennis-terugvullen.ts`.
 */
import { getallenIn } from "@/lib/pipeline/conflict-detect";
import { controleerItem, magNieuwMetStatus, type KennisBron, type KennisStatus } from "@/lib/kennis/regels";
import { kennisSleutel } from "@/lib/kennis/samenvoegen";
import type { Klantkennis } from "@/lib/types/database";

export const TERUGVUL_TAAK = "kennis_terugvullen";

// ── De bron: wat het script per merk uit de oude tabellen leest ──────────────

export interface BronProfiel {
  id: string;
  url: string;
  brand_name: string | null;
  aliases: string[] | null;
  name_exclusions: string[] | null;
  industry: string | null;
  business_model: string | null;
  summary: string | null;
  intake_description: string | null;
  intake_audience: string | null;
  market_language: string | null;
  service_scope: string | null;
  service_regions: string[] | null;
  wikidata_id: string | null;
  wikipedia_url: string | null;
  products: string[] | null;
  priority_offerings: string[] | null;
  deprioritised_offerings: string[] | null;
  deal_value_band: string | null;
  seasonality: string | null;
  goal_12m: string | null;
  growth_regions: string[] | null;
  personas: unknown;
  target_segments: string[] | null;
  sales_objections: string[] | null;
  competitors: string[] | null;
  value_props: string[] | null;
  differentiator: string | null;
  offline_proof: string[] | null;
  proof_points: string[] | null;
  verhalen: string | null;
  stem_voorbeelden: { url: string; tekst: string | null }[] | null;
  pronoun_preference: string | null;
  taboo_phrases: string[] | null;
  forbidden_topics: string[] | null;
  respect_site_structure: boolean | null;
}

export interface BronVeldHerkomst {
  field: string;
  source: string;
  not_applicable: boolean | null;
}

export interface BronFeit {
  id: string;
  analysis_id: string | null;
  text: string;
  source_url: string | null;
  kind: string | null;
  allowed: boolean | null;
  superseded_by: string | null;
  soort: string | null;
  waarde: unknown;
  geldt_voor: string | null;
  stand: string | null;
  bewijskracht: string | null;
}

/** Een feit zoals de samenvatting het opleverde, met het citaat dat de code controleerde. */
export interface BronSyntheseFeit {
  text: string;
  quote: string;
  sourceUrl: string;
}

export interface BronAanbod {
  id: string;
  parent_id: string | null;
  kind: string;
  name: string;
  description: string | null;
  audience: string | null;
  price_indication: string | null;
  evidence_url: string | null;
  evidence_quote: string | null;
  source: string;
  note: string | null;
  removed_at: string | null;
  /** 1 als de code het citaat op de pagina terugvond (`quoteConfidence()`), anders 0,5 of leeg. */
  confidence?: number | null;
}

export interface BronVraag {
  id: string;
  analysis_id: string | null;
  question: string;
  answer: string | null;
  status: string;
  scope: string | null;
  content_piece_ids: string[] | null;
  open_vraag: boolean | null;
  raw_json: { bron?: string; soort?: string } | null;
}

export interface BronStrategie {
  profile_id: string;
  strategy_notes: string | null;
  context_factors: { kind?: string; description?: string; effective_from?: string | null }[] | null;
}

export interface BronFacet {
  id: string;
  facet: string;
  raw_json: unknown;
}

export interface BronMerk {
  profiel: BronProfiel;
  veldHerkomst: BronVeldHerkomst[];
  feiten: BronFeit[];
  aanbod: BronAanbod[];
  vragen: BronVraag[];
  strategie: BronStrategie | null;
  facetten: BronFacet[];
  /** De ids van de pagina's die nog bestaan. Ontbreekt de lijst, dan gelden alle pagina's als bestaand. */
  paginas?: string[];
}

// ── Het plan ──────────────────────────────────────────────────────────────────

export interface PlanItem {
  /** Unieke verwijzing naar de bron, bijvoorbeeld `brand_facts:<id>` of `profiles:<id>:aliases:1`. */
  ref: string;
  domein: Klantkennis["domein"];
  soort: string | null;
  bewering: string;
  waarde: unknown | null;
  status: KennisStatus;
  bewijskracht: Klantkennis["bewijskracht"];
  bron: KennisBron;
  bronUrl: string | null;
  citaat: string | null;
  gebruik: Klantkennis["gebruik"];
  /** Verwijzingen naar andere plan-items (hun `ref`); het script zet ze om naar ids. */
  geldtVoorRefs: string[];
  analysisId: string | null;
  contentPieceId: string | null;
  herkomst: { tabel: NonNullable<Klantkennis["herkomst_tabel"]>; id: string };
  ruw: unknown | null;
}

export interface Uitsluiting {
  ref: string;
  reden: string;
}

export interface Terugvulplan {
  profileId: string;
  items: PlanItem[];
  uitsluitingen: Uitsluiting[];
  /** Wat de code niet kan beslissen (V16 en verder). */
  voorConsultant: Uitsluiting[];
}

function schoon(tekst: string | null | undefined): string {
  return (tekst ?? "").trim();
}

function lijst(waarden: readonly (string | null | undefined)[] | null | undefined): string[] {
  return (waarden ?? []).map((w) => schoon(w)).filter(Boolean);
}

/** Klein, zonder accenten en leestekens: om namen te vergelijken. */
export function normaliseerNaam(tekst: string): string {
  return tekst
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Bij welke aanbodknopen hoort de tekst uit `brand_facts.geldt_voor`? Dezelfde
 * regel die de inventaris gebruikte: de ene naam bevat de andere. Nul, één of
 * meer knopen; meer is geen fout ("rijlessen" hoort bij drie knopen, en een
 * feit over rijlessen geldt voor alle drie).
 */
export function koppelAanAanbod(geldtVoor: string, aanbod: readonly Pick<BronAanbod, "id" | "name" | "removed_at">[]): string[] {
  const doel = normaliseerNaam(geldtVoor);
  if (!doel) return [];
  return aanbod
    .filter((o) => !o.removed_at)
    .filter((o) => {
      const naam = normaliseerNaam(o.name);
      return Boolean(naam) && (naam === doel || naam.includes(doel) || doel.includes(naam));
    })
    .map((o) => o.id);
}

/** De status van een profielveld, uit wie het zette. */
export function veldStatus(herkomst: readonly BronVeldHerkomst[], veld: string): { status: KennisStatus; bron: KennisBron; nvt: boolean } {
  const rij = herkomst.find((h) => h.field === veld);
  if (rij?.not_applicable) return { status: "afgeleid", bron: "ai", nvt: true };
  switch (rij?.source) {
    case "gesprek":
    case "consultant":
      return { status: "verklaard", bron: "gesprek", nvt: false };
    case "klant":
      return { status: "verklaard", bron: "klant", nvt: false };
    default:
      return { status: "afgeleid", bron: "ai", nvt: false };
  }
}

/** Het domein van een feit, uit zijn soort (fact-classify.ts). */
export function domeinVanFeit(soort: string | null): Klantkennis["domein"] {
  switch (soort) {
    case "contact":
    case "openingstijd":
    case "plaats":
    case "werkgebied":
      return "identiteit";
    case "certificering":
    case "cijfer":
    case "overig":
      return "bewijs";
    default:
      return "aanbod";
  }
}

/**
 * Het domein van een antwoord, uit de soort vraag van de brief. Een
 * praktijkvoorbeeld is een verhaal; de rest gaat over wat het bedrijf doet.
 */
export function domeinVanAntwoord(vraag: Pick<BronVraag, "open_vraag" | "raw_json">): Klantkennis["domein"] {
  if (vraag.open_vraag) return "verhaal";
  return vraag.raw_json?.soort === "praktijk" ? "verhaal" : "aanbod";
}

export interface Maker {
  profileId: string;
  items: PlanItem[];
  uitsluitingen: Uitsluiting[];
  voorConsultant: Uitsluiting[];
}

export function voegToe(m: Pick<Maker, "items">, item: Omit<PlanItem, "gebruik" | "geldtVoorRefs" | "analysisId" | "contentPieceId" | "waarde" | "bewijskracht" | "bronUrl" | "citaat" | "soort" | "ruw"> & Partial<PlanItem>): void {
  const volledig: PlanItem = {
    soort: null,
    waarde: null,
    bewijskracht: null,
    bronUrl: null,
    citaat: null,
    geldtVoorRefs: [],
    analysisId: null,
    contentPieceId: null,
    ruw: null,
    gebruik: "intern",
    ...item,
  };
  // P3: afgeleid is nooit content, wat de bron ook voorstelde.
  if (volledig.status === "afgeleid" && volledig.gebruik === "content") volledig.gebruik = "intern";
  m.items.push(volledig);
}

// ── Het merkprofiel ───────────────────────────────────────────────────────────

export interface VeldRegel {
  veld: keyof BronProfiel;
  domein: Klantkennis["domein"];
  soort: string;
  /** Het gebruik als het veld verklaard is; afgeleid wordt altijd intern. */
  gebruik: Klantkennis["gebruik"];
}

/** De kolommen van `profiles` met "meenemen" in de inventaris (§4.1). */
export const TEKSTVELDEN: VeldRegel[] = [
  { veld: "brand_name", domein: "identiteit", soort: "merknaam", gebruik: "content" },
  { veld: "industry", domein: "identiteit", soort: "branche", gebruik: "intern" },
  { veld: "business_model", domein: "identiteit", soort: "bedrijfsmodel", gebruik: "intern" },
  { veld: "summary", domein: "identiteit", soort: "omschrijving", gebruik: "intern" },
  { veld: "intake_description", domein: "identiteit", soort: "omschrijving", gebruik: "intern" },
  { veld: "intake_audience", domein: "doelgroep", soort: "doelgroep", gebruik: "intern" },
  { veld: "market_language", domein: "identiteit", soort: "markt en taal", gebruik: "intern" },
  { veld: "service_scope", domein: "identiteit", soort: "bereik", gebruik: "intern" },
  { veld: "deal_value_band", domein: "aanbod", soort: "klantwaarde", gebruik: "intern" },
  { veld: "seasonality", domein: "aanbod", soort: "seizoen", gebruik: "intern" },
  { veld: "goal_12m", domein: "positionering", soort: "doel over een jaar", gebruik: "intern" },
  { veld: "differentiator", domein: "positionering", soort: "onderscheid", gebruik: "content" },
  { veld: "verhalen", domein: "verhaal", soort: "verhalen van de ondernemer", gebruik: "content" },
  { veld: "pronoun_preference", domein: "stem", soort: "aanspreekvorm", gebruik: "content" },
];

export const LIJSTVELDEN: VeldRegel[] = [
  { veld: "aliases", domein: "identiteit", soort: "andere naam", gebruik: "intern" },
  { veld: "name_exclusions", domein: "identiteit", soort: "niet ons merk", gebruik: "intern" },
  { veld: "service_regions", domein: "identiteit", soort: "werkgebied", gebruik: "content" },
  { veld: "growth_regions", domein: "identiteit", soort: "groeiregio", gebruik: "intern" },
  { veld: "priority_offerings", domein: "aanbod", soort: "voorrang", gebruik: "intern" },
  { veld: "deprioritised_offerings", domein: "aanbod", soort: "minder voorrang", gebruik: "intern" },
  { veld: "target_segments", domein: "doelgroep", soort: "klantgroep", gebruik: "intern" },
  { veld: "sales_objections", domein: "doelgroep", soort: "bezwaar", gebruik: "content" },
  { veld: "competitors", domein: "positionering", soort: "concurrent", gebruik: "intern" },
  { veld: "value_props", domein: "positionering", soort: "waardepropositie", gebruik: "intern" },
  { veld: "offline_proof", domein: "bewijs", soort: "bewijs buiten de site", gebruik: "content" },
  { veld: "taboo_phrases", domein: "grens", soort: "verboden woord", gebruik: "verboden" },
  { veld: "forbidden_topics", domein: "grens", soort: "verboden onderwerp", gebruik: "verboden" },
];

/** De velden die de dekkingstoets per merk verwacht (als ze gevuld zijn), in de volgorde van het terugvullen. */
export const PROFIEL_MEENEMEN: (keyof BronProfiel)[] = [
  ...TEKSTVELDEN.map((v) => v.veld),
  ...LIJSTVELDEN.map((v) => v.veld),
  "products",
  "personas",
  "proof_points",
  "stem_voorbeelden",
  "respect_site_structure",
  "wikidata_id",
  "wikipedia_url",
];

function planProfiel(m: Maker, merk: BronMerk): void {
  for (const veld of PROFIEL_MEENEMEN) planProfielveld(m, merk, veld);
}

/**
 * Eén veld van het merkprofiel als kennisitems. Ook gebruikt als het gesprek
 * een veld opslaat (K5, `lib/kennis/gesprek.ts`), zodat een item van vandaag
 * dezelfde sleutel en dezelfde verwijzing (`ref`) krijgt als het item dat K3
 * uit hetzelfde veld maakte.
 */
export function planProfielveld(
  m: Pick<Maker, "items" | "uitsluitingen">,
  merk: {
    profiel: Partial<BronProfiel> & Pick<BronProfiel, "id" | "url">;
    veldHerkomst: readonly BronVeldHerkomst[];
    aanbod: readonly Pick<BronAanbod, "name" | "removed_at">[];
    vragen: readonly Pick<BronVraag, "question">[];
  },
  veld: keyof BronProfiel,
): void {
  const p = merk.profiel;
  const herkomst = { tabel: "profiles" as const, id: p.id };

  const tekstregel = TEKSTVELDEN.find((r) => r.veld === veld);
  if (tekstregel) {
    const regel = tekstregel;
    const waarde = schoon(p[regel.veld] as string | null);
    const ref = `profiles:${p.id}:${String(regel.veld)}`;
    if (!waarde) return;
    const st = veldStatus(merk.veldHerkomst, String(regel.veld));
    if (st.nvt) {
      m.uitsluitingen.push({ ref, reden: "De consultant koos 'niet van toepassing'." });
      return;
    }
    voegToe(m, { ref, domein: regel.domein, soort: regel.soort, bewering: waarde, status: st.status, bron: st.bron, gebruik: regel.gebruik, herkomst });
    return;
  }

  const lijstregel = LIJSTVELDEN.find((r) => r.veld === veld);
  if (lijstregel) {
    const regel = lijstregel;
    const waarden = lijst(p[regel.veld] as string[] | null);
    const st = veldStatus(merk.veldHerkomst, String(regel.veld));
    waarden.forEach((w, i) => {
      const ref = `profiles:${p.id}:${String(regel.veld)}:${i}`;
      if (st.nvt) {
        m.uitsluitingen.push({ ref, reden: "De consultant koos 'niet van toepassing'." });
        return;
      }
      voegToe(m, { ref, domein: regel.domein, soort: regel.soort, bewering: w, status: st.status, bron: st.bron, gebruik: regel.gebruik, herkomst });
    });
    return;
  }

  switch (veld) {
    case "products": {
      // Producten: alleen wat nog geen aanbodknoop is (inventaris §4.1).
      const knoopNamen = new Set(merk.aanbod.filter((o) => !o.removed_at).map((o) => normaliseerNaam(o.name)));
      const pst = veldStatus(merk.veldHerkomst, "products");
      lijst(p.products).forEach((w, i) => {
        const ref = `profiles:${p.id}:products:${i}`;
        if (knoopNamen.has(normaliseerNaam(w))) {
          m.uitsluitingen.push({ ref, reden: "Staat al als knoop in het aanbod, met citaat." });
          return;
        }
        voegToe(m, { ref, domein: "aanbod", soort: "product", bewering: w, status: pst.status, bron: pst.bron, herkomst });
      });
      return;
    }
    case "personas": {
      // Klantgroepen uit het onderzoek: een lijst van {name, description}.
      const personas = Array.isArray(p.personas) ? (p.personas as { name?: unknown; description?: unknown }[]) : [];
      const perst = veldStatus(merk.veldHerkomst, "personas");
      personas.forEach((per, i) => {
        const naam = typeof per?.name === "string" ? per.name.trim() : "";
        const oms = typeof per?.description === "string" ? per.description.trim() : "";
        const tekst = naam && oms ? `${naam}: ${oms}` : naam || oms;
        const ref = `profiles:${p.id}:personas:${i}`;
        if (!tekst) {
          m.uitsluitingen.push({ ref, reden: "Lege klantgroep." });
          return;
        }
        voegToe(m, { ref, domein: "doelgroep", soort: "klantgroep", bewering: tekst, status: perst.status, bron: perst.bron, herkomst, ruw: per });
      });
      return;
    }
    case "proof_points": {
      // Bewijspunten: de kopieën van antwoorden niet, die komen uit fact_requests
      // (inventaris §3 punt 4). Een kopie is "vraag antwoord" met de vraagtekst vooraan.
      const vragen = merk.vragen.map((v) => normaliseerNaam(v.question)).filter(Boolean);
      const ppst = veldStatus(merk.veldHerkomst, "proof_points");
      lijst(p.proof_points).forEach((w, i) => {
        const ref = `profiles:${p.id}:proof_points:${i}`;
        const genormd = normaliseerNaam(w);
        if (vragen.some((v) => genormd.startsWith(v))) {
          m.uitsluitingen.push({ ref, reden: "Kopie van een beantwoorde vraag; die komt uit fact_requests." });
          return;
        }
        voegToe(m, { ref, domein: "bewijs", soort: "bewijspunt", bewering: w, status: ppst.status, bron: ppst.bron, herkomst });
      });
      return;
    }
    case "stem_voorbeelden": {
      // Stemvoorbeelden: de opgehaalde tekst is letterlijk van dat adres.
      (p.stem_voorbeelden ?? []).forEach((s, i) => {
        const ref = `profiles:${p.id}:stem_voorbeelden:${i}`;
        const tekst = schoon(s?.tekst);
        if (!tekst || !schoon(s?.url)) {
          m.uitsluitingen.push({ ref, reden: "De tekst van dit adres is (nog) niet opgehaald." });
          return;
        }
        voegToe(m, {
          ref, domein: "stem", soort: "stemvoorbeeld", bewering: tekst, status: "waargenomen", bron: "website",
          bronUrl: s.url, citaat: tekst, gebruik: "content", herkomst,
        });
      });
      return;
    }
    case "respect_site_structure": {
      if (p.respect_site_structure === null || p.respect_site_structure === undefined) return;
      const st = veldStatus(merk.veldHerkomst, "respect_site_structure");
      voegToe(m, {
        ref: `profiles:${p.id}:respect_site_structure`,
        domein: "grens",
        soort: "opbouw van de site",
        bewering: p.respect_site_structure
          ? "De opbouw van de site blijft zoals hij is; het advies stelt geen nieuwe structuur voor."
          : "Het advies mag een andere opbouw van de site voorstellen.",
        status: st.status,
        bron: st.bron,
        herkomst,
      });
      return;
    }
    case "wikidata_id": {
      if (!schoon(p.wikidata_id)) return;
      const id = schoon(p.wikidata_id);
      voegToe(m, {
        ref: `profiles:${p.id}:wikidata_id`, domein: "identiteit", soort: "wikidata", bewering: `Het merk staat op Wikidata als ${id}.`,
        status: "waargenomen", bron: "extern", bronUrl: `https://www.wikidata.org/wiki/${id}`, citaat: id, herkomst,
      });
      return;
    }
    case "wikipedia_url": {
      if (!schoon(p.wikipedia_url)) return;
      voegToe(m, {
        ref: `profiles:${p.id}:wikipedia_url`, domein: "identiteit", soort: "wikipedia", bewering: "Het merk heeft een pagina op Wikipedia.",
        status: "waargenomen", bron: "extern", bronUrl: schoon(p.wikipedia_url), citaat: schoon(p.wikipedia_url), herkomst,
      });
      return;
    }
  }
}

// ── Het aanbod ────────────────────────────────────────────────────────────────

/** Ouders vóór kinderen, zodat `geldt_voor` altijd naar een al vastgelegd item wijst. */
export function ouderEerst<T extends { id: string; parent_id: string | null }>(rijen: readonly T[]): T[] {
  const ids = new Set(rijen.map((r) => r.id));
  const diepte = (r: T, gezien = new Set<string>()): number => {
    if (!r.parent_id || !ids.has(r.parent_id) || gezien.has(r.id)) return 0;
    gezien.add(r.id);
    const ouder = rijen.find((o) => o.id === r.parent_id)!;
    return 1 + diepte(ouder, gezien);
  };
  return [...rijen].sort((a, b) => diepte(a) - diepte(b));
}

/**
 * Het aanbod als kennisitems. Ook gebruikt door het onderzoek zelf (K4,
 * `lib/kennis/onderzoek.ts`), met een strengere `citaatTelt`: daar is een knoop
 * pas waargenomen als de code zijn citaat op de pagina terugvond.
 */
export function planAanbod(
  m: Pick<Maker, "items" | "uitsluitingen" | "voorConsultant">,
  merk: Pick<BronMerk, "aanbod">,
  citaatTelt: (o: BronAanbod) => boolean = (o) => Boolean(schoon(o.evidence_quote) && schoon(o.evidence_url)),
): void {
  const actief = new Set(merk.aanbod.filter((o) => !o.removed_at).map((o) => o.id));
  for (const o of ouderEerst(merk.aanbod)) {
    const ref = `profile_offerings:${o.id}`;
    if (o.removed_at) {
      m.uitsluitingen.push({ ref, reden: "Door een mens uit het aanbod gehaald." });
      continue;
    }
    const herkomst = { tabel: "profile_offerings" as const, id: o.id };
    const doorMens = o.source === "klant" || o.source === "consultant";
    const heeftCitaat = Boolean(schoon(o.evidence_quote) && schoon(o.evidence_url)) && citaatTelt(o);
    const status: KennisStatus = doorMens ? "verklaard" : heeftCitaat ? "waargenomen" : "afgeleid";
    const bron: KennisBron = doorMens ? (o.source === "klant" ? "klant" : "gesprek") : heeftCitaat ? "website" : "ai";
    const ouder = o.parent_id && actief.has(o.parent_id) ? [`profile_offerings:${o.parent_id}`] : [];
    voegToe(m, {
      ref,
      domein: o.kind === "vestiging" ? "identiteit" : "aanbod",
      soort: o.kind,
      bewering: schoon(o.description) ? `${o.name.trim()}: ${schoon(o.description)}` : o.name.trim(),
      status,
      bron,
      bronUrl: status === "waargenomen" ? o.evidence_url : null,
      citaat: status === "waargenomen" ? o.evidence_quote : null,
      gebruik: "content",
      geldtVoorRefs: ouder,
      herkomst,
      ruw: doorMens ? { citaat_van_het_model: o.evidence_quote, bronpagina: o.evidence_url } : null,
    });

    const citaat = normaliseerNaam(o.evidence_quote ?? "");
    if (schoon(o.audience)) {
      const letterlijk = status === "waargenomen" && citaat.includes(normaliseerNaam(o.audience!));
      voegToe(m, {
        ref: `${ref}:audience`, domein: "doelgroep", soort: "doelgroep van deze dienst", bewering: schoon(o.audience),
        status: doorMens ? "verklaard" : letterlijk ? "waargenomen" : "afgeleid",
        bron: doorMens ? bron : letterlijk ? "website" : "ai",
        bronUrl: letterlijk ? o.evidence_url : null, citaat: letterlijk ? o.evidence_quote : null,
        gebruik: "content", geldtVoorRefs: [ref], herkomst,
      });
    }
    if (schoon(o.price_indication)) {
      // Een prijs is pas gezien als zijn getallen in het citaat staan (conventie 1).
      const getallen = getallenIn(o.price_indication!);
      const inCitaat = getallenIn(o.evidence_quote ?? "");
      const letterlijk = status === "waargenomen" && getallen.length > 0 && getallen.every((g) => inCitaat.includes(g));
      const prijsStatus: KennisStatus = doorMens ? "verklaard" : letterlijk ? "waargenomen" : "afgeleid";
      voegToe(m, {
        ref: `${ref}:price_indication`, domein: "aanbod", soort: "prijs", bewering: `${o.name.trim()}: ${schoon(o.price_indication)}`,
        status: prijsStatus, bron: doorMens ? bron : letterlijk ? "website" : "ai",
        bronUrl: letterlijk ? o.evidence_url : null, citaat: letterlijk ? o.evidence_quote : null,
        gebruik: "content", geldtVoorRefs: [ref], herkomst,
      });
      if (prijsStatus === "afgeleid") {
        m.voorConsultant.push({ ref: `${ref}:price_indication`, reden: `De prijs "${schoon(o.price_indication)}" staat niet in het citaat van de site; controleer hem.` });
      }
    }
    if (schoon(o.note)) {
      voegToe(m, {
        ref: `${ref}:note`, domein: "aanbod", soort: "notitie", bewering: schoon(o.note), status: "verklaard", bron: "gesprek",
        geldtVoorRefs: [ref], herkomst,
      });
    }
  }
}

// ── De feiten ─────────────────────────────────────────────────────────────────

function planFeiten(m: Maker, merk: BronMerk, citaten: readonly BronSyntheseFeit[]): void {
  for (const f of merk.feiten) {
    const ref = `brand_facts:${f.id}`;
    if (f.superseded_by || f.stand === "vervangen") {
      m.uitsluitingen.push({ ref, reden: "Vervangen door een ander feit." });
      continue;
    }
    if (!schoon(f.text)) {
      m.uitsluitingen.push({ ref, reden: "Lege tekst." });
      continue;
    }
    const herkomst = { tabel: "brand_facts" as const, id: f.id };
    const vanKlant = f.kind === "klant" || f.stand === "bevestigd";
    const gevonden = citaten.find((c) => schoon(c.text) === schoon(f.text) && schoon(c.quote) && schoon(c.sourceUrl));
    const status: KennisStatus = vanKlant ? "verklaard" : gevonden ? "waargenomen" : "afgeleid";
    const bron: KennisBron = vanKlant ? "klant" : gevonden ? "website" : "ai";
    if (!vanKlant && !gevonden) {
      m.voorConsultant.push({ ref, reden: "Het citaat van dit sitefeit is niet meer terug te vinden; het staat nu als vermoeden." });
    }

    let geldtVoorRefs: string[] = [];
    if (schoon(f.geldt_voor)) {
      const knopen = koppelAanAanbod(f.geldt_voor!, merk.aanbod);
      geldtVoorRefs = knopen.map((id) => `profile_offerings:${id}`);
      if (knopen.length === 0) {
        // Besluit V16: voorlopig merkbreed, de consultant koppelt.
        m.voorConsultant.push({ ref, reden: `Geldt voor "${schoon(f.geldt_voor)}", maar dat is aan geen dienst te koppelen. Nu merkbreed.` });
      }
    }
    const betwist = f.stand === "betwist";
    if (betwist) m.voorConsultant.push({ ref, reden: "Dit feit is betwist en staat op de conflictlijst." });

    voegToe(m, {
      ref,
      domein: domeinVanFeit(f.soort),
      soort: f.soort,
      bewering: schoon(f.text),
      waarde: f.waarde ?? null,
      status,
      bewijskracht: (["geen", "gewoon", "sterk"].includes(f.bewijskracht ?? "") ? f.bewijskracht : null) as Klantkennis["bewijskracht"],
      bron,
      bronUrl: gevonden?.sourceUrl ?? null,
      citaat: gevonden?.quote ?? null,
      gebruik: f.allowed === false || betwist ? "intern" : "content",
      geldtVoorRefs,
      analysisId: f.analysis_id,
      herkomst,
      ruw: { geldt_voor: f.geldt_voor, stand: f.stand, kind: f.kind },
    });
  }
}

// ── De antwoorden ─────────────────────────────────────────────────────────────

function planAntwoorden(m: Maker, merk: BronMerk): void {
  for (const v of merk.vragen) planAntwoord(m, v, merk.paginas ?? null);
}

/**
 * Eén beantwoorde vraag als kennisitems. Ook gebruikt als de ondernemer nu
 * antwoordt (K5, `lib/kennis/gesprek.ts`), zodat een antwoord van vandaag
 * dezelfde sleutel krijgt als het item dat K3 uit hetzelfde antwoord maakte.
 *
 * De reikwijdte komt uit de vraag (besluit V13): een vraag voor één pagina
 * wordt één item per pagina (`content_piece_id`), een vraag voor het cluster
 * krijgt `analysis_id`, een vraag voor het merk geen van beide. `paginas` zijn
 * de pagina's die nog bestaan; `null` is "alle pagina's gelden als bestaand".
 */
export function planAntwoord(m: Pick<Maker, "items" | "uitsluitingen" | "voorConsultant">, v: BronVraag, paginaLijst: readonly string[] | null): void {
  const ref = `fact_requests:${v.id}`;
  if (v.status !== "beantwoord") return;
  if (!schoon(v.answer)) {
    m.uitsluitingen.push({ ref, reden: "Beantwoord zonder antwoord." });
    return;
  }
  const herkomst = { tabel: "fact_requests" as const, id: v.id };
  const basis = {
    domein: domeinVanAntwoord(v),
    soort: v.open_vraag ? "eigen verhaal" : (v.raw_json?.soort ?? "antwoord"),
    // Vraag en antwoord samen: "Ja" zegt zonder de vraag niets.
    bewering: v.open_vraag ? schoon(v.answer) : `${schoon(v.question)}\n${schoon(v.answer)}`,
    status: "verklaard" as const,
    bron: "klant" as const,
    gebruik: "content" as const,
    herkomst,
    ruw: { vraag: v.question, scope: v.scope, bron: v.raw_json?.bron ?? null },
  };
  const bestaat = paginaLijst ? new Set(paginaLijst) : null;
  const alle = lijst(v.content_piece_ids);
  const paginas = bestaat ? alle.filter((id) => bestaat.has(id)) : alle;
  if (v.scope === "pagina" && alle.length > paginas.length) {
    m.voorConsultant.push({
      ref,
      reden: paginas.length > 0
        ? `Hing ook aan ${alle.length - paginas.length} pagina('s) die niet meer bestaan.`
        : "Hing alleen aan pagina's die niet meer bestaan; nu voor het hele cluster.",
    });
  }
  if (v.scope === "pagina" && paginas.length > 0) {
    // Eén item per pagina (V13): het antwoord geldt voor elk van die pagina's
    // apart, en nergens anders.
    paginas.forEach((pieceId) =>
      voegToe(m, { ...basis, ref: `${ref}:${pieceId}`, analysisId: v.analysis_id, contentPieceId: pieceId }),
    );
  } else if (v.scope === "merk") {
    voegToe(m, { ...basis, ref });
  } else {
    voegToe(m, { ...basis, ref, analysisId: v.analysis_id });
  }
}

// ── Het gesprek en de onderzoeksverslagen ─────────────────────────────────────

function planStrategie(m: Maker, merk: BronMerk): void {
  planGesprek(m, merk.strategie);
}

/**
 * De aantekeningen en de veranderingen uit het gesprek. Ook gebruikt als de
 * consultant het gesprek nu vastlegt (K5, `lib/kennis/gesprek.ts`), met
 * dezelfde sleutels als het terugvullen.
 */
export function planGesprek(m: Pick<Maker, "items" | "uitsluitingen">, s: BronStrategie | null): void {
  if (!s) return;
  const herkomst = { tabel: "profile_strategy" as const, id: s.profile_id };
  if (schoon(s.strategy_notes)) {
    voegToe(m, {
      ref: `profile_strategy:${s.profile_id}:strategy_notes`, domein: "positionering", soort: "aantekeningen van het gesprek",
      bewering: schoon(s.strategy_notes), status: "verklaard", bron: "gesprek", herkomst,
    });
  }
  (s.context_factors ?? []).forEach((c, i) => {
    const tekst = schoon(c?.description);
    const ref = `profile_strategy:${s.profile_id}:context_factors:${i}`;
    if (!tekst) {
      m.uitsluitingen.push({ ref, reden: "Lege verandering." });
      return;
    }
    voegToe(m, {
      ref, domein: "identiteit", soort: `verandering: ${c.kind ?? "overig"}`, bewering: tekst, status: "verklaard", bron: "gesprek", herkomst, ruw: c,
    });
  });
}

function planFacetten(m: Maker, merk: BronMerk): void {
  for (const f of merk.facetten) {
    const herkomst = { tabel: "profile_facets" as const, id: f.id };
    const ruw = (f.raw_json ?? {}) as Record<string, unknown>;
    if (f.facet === "markt") {
      const geparsed = (ruw.output_parsed ?? ruw) as { positioning?: unknown; competitors?: unknown };
      if (typeof geparsed.positioning === "string" && geparsed.positioning.trim()) {
        voegToe(m, {
          ref: `profile_facets:${f.id}:positioning`, domein: "positionering", soort: "positie in de markt",
          bewering: geparsed.positioning.trim(), status: "afgeleid", bron: "ai", herkomst,
        });
      }
      const concurrenten = Array.isArray(geparsed.competitors) ? (geparsed.competitors as { name?: unknown; why?: unknown; evidenceUrl?: unknown }[]) : [];
      concurrenten.forEach((c, i) => {
        const naam = typeof c?.name === "string" ? c.name.trim() : "";
        const waarom = typeof c?.why === "string" ? c.why.trim() : "";
        if (!naam || !waarom) return;
        voegToe(m, {
          ref: `profile_facets:${f.id}:competitors:${i}`, domein: "positionering", soort: "waarom een concurrent wint",
          bewering: `${naam}: ${waarom}`, status: "afgeleid", bron: "ai", herkomst, ruw: c,
        });
      });
    } else if (f.facet === "techniek") {
      // Letterlijk uit de HTML van de site gelezen, zonder model.
      const feiten = Array.isArray(ruw.facts) ? (ruw.facts as { key?: unknown; value?: unknown }[]) : [];
      const soorten: Record<string, string> = { telefoon: "telefoon", email: "e-mail", adres: "adres", kvk: "KvK-nummer" };
      feiten.forEach((x, i) => {
        const sleutel = typeof x?.key === "string" ? x.key : "";
        const waarde = typeof x?.value === "string" ? x.value.trim() : "";
        if (!soorten[sleutel] || !waarde) return;
        voegToe(m, {
          ref: `profile_facets:${f.id}:facts:${i}`, domein: "identiteit", soort: soorten[sleutel], bewering: `${soorten[sleutel]}: ${waarde}`,
          status: "waargenomen", bron: "website", bronUrl: merk.profiel.url, citaat: waarde, herkomst,
        });
      });
    }
    // synthese: de citaten gaan naar de feiten hierboven; de open punten worden
    // kennisgaten (A3). aanbod: open punten, idem. llm_kennis en sjabloon zijn
    // geen klantkennis (inventaris §4.4).
  }
}

/** De citaten uit de ruwe uitvoer van de samenvatting. */
export function syntheseCitaten(facetten: readonly BronFacet[]): BronSyntheseFeit[] {
  const synthese = facetten.find((f) => f.facet === "synthese");
  const ruw = (synthese?.raw_json ?? {}) as { output_parsed?: { facts?: unknown } };
  const feiten = Array.isArray(ruw.output_parsed?.facts) ? (ruw.output_parsed!.facts as Partial<BronSyntheseFeit>[]) : [];
  return feiten
    .filter((f) => typeof f.text === "string" && typeof f.quote === "string" && typeof f.sourceUrl === "string")
    .map((f) => ({ text: f.text!, quote: f.quote!, sourceUrl: f.sourceUrl! }));
}

/** Het plan voor één merk. */
export function maakTerugvulplan(merk: BronMerk): Terugvulplan {
  const m: Maker = { profileId: merk.profiel.id, items: [], uitsluitingen: [], voorConsultant: [] };
  // Het aanbod eerst: feiten en antwoorden verwijzen ernaar.
  planAanbod(m, merk);
  planProfiel(m, merk);
  planFeiten(m, merk, syntheseCitaten(merk.facetten));
  planAntwoorden(m, merk);
  planStrategie(m, merk);
  planFacetten(m, merk);
  return m;
}

// ── De dekking: is elke oude rij een item of een bewuste uitsluiting? ────────

/** De verwijzingen die in het plan terug moeten komen (als item of uitsluiting). */
export function verwachteRefs(merk: BronMerk): string[] {
  const p = merk.profiel;
  const refs: string[] = [];
  for (const veld of PROFIEL_MEENEMEN) {
    const w = p[veld];
    const gevuld = Array.isArray(w) ? w.length > 0 : typeof w === "string" ? w.trim().length > 0 : w !== null && w !== undefined;
    if (gevuld) refs.push(`profiles:${p.id}:${String(veld)}`);
  }
  for (const f of merk.feiten) refs.push(`brand_facts:${f.id}`);
  for (const o of merk.aanbod) refs.push(`profile_offerings:${o.id}`);
  for (const v of merk.vragen) if (v.status === "beantwoord") refs.push(`fact_requests:${v.id}`);
  if (merk.strategie && schoon(merk.strategie.strategy_notes)) refs.push(`profile_strategy:${merk.strategie.profile_id}:strategy_notes`);
  return refs;
}

/**
 * Welke verwachte verwijzingen ontbreken? Een verwijzing is gedekt als een item
 * of uitsluiting precies zo heet, of ermee begint (een lijstveld wordt per
 * element vastgelegd: `...:aliases:0`, `...:aliases:1`).
 */
export function dekking(merk: BronMerk, plan: Terugvulplan): string[] {
  const gedekt = [...plan.items.map((i) => i.ref), ...plan.uitsluitingen.map((u) => u.ref)];
  return verwachteRefs(merk).filter((r) => !gedekt.some((g) => g === r || g.startsWith(`${r}:`)));
}

// ── Het plan controleren en omzetten naar rijen (V15) ────────────────────────

export interface KennisRij {
  id: string;
  profile_id: string;
  domein: string;
  soort: string | null;
  bewering: string;
  waarde: unknown | null;
  status: string;
  bewijskracht: string | null;
  bron: string;
  bron_url: string | null;
  citaat: string | null;
  vastgelegd_door_taak: string;
  gebruik: string;
  geldt_voor: string[];
  analysis_id: string | null;
  content_piece_id: string | null;
  herkomst_tabel: string;
  herkomst_id: string;
  sleutel: string | null;
  ruw: unknown | null;
}

export interface Omzetting {
  rijen: KennisRij[];
  /** Items die de regels van `legVast()` niet door zouden laten. */
  geweigerd: { ref: string; fouten: string[] }[];
  /** Items die op een eerder item in dit plan neerkomen (zelfde sleutel). */
  dubbel: { ref: string; zelfdeAls: string }[];
  /** Per plan-ref het id van de rij waarin hij terechtkwam. */
  idVan: Map<string, string>;
}

/**
 * Het plan omzetten naar rijen met exact de controles van `legVast()`
 * (`controleerItem`, `magNieuwMetStatus` voor de code als actor, de
 * ontdubbelsleutel). Voor de route van besluit V15: deze rijen gaan als bestand
 * naar productie, waar de check-constraints ze opnieuw toetsen.
 *
 * `bestaandeSleutels` zijn de sleutels die al in de kennislaag staan (van een
 * eerdere run); zo is een tweede run een lege run (conventie 9).
 */
export function zetOm(
  plan: Terugvulplan,
  nieuwId: () => string,
  bestaandeSleutels: ReadonlyMap<string, string> = new Map(),
): Omzetting {
  const uit: Omzetting = { rijen: [], geweigerd: [], dubbel: [], idVan: new Map() };
  const perSleutel = new Map<string, string>(bestaandeSleutels);
  for (const item of plan.items) {
    const fouten = controleerItem({
      domein: item.domein, bewering: item.bewering, status: item.status, bron: item.bron, gebruik: item.gebruik,
      bron_url: item.bronUrl, citaat: item.citaat, bewijskracht: item.bewijskracht, vastgelegd_door_taak: TERUGVUL_TAAK,
    });
    if (!magNieuwMetStatus(item.status, "code", item.bron)) fouten.push(`Status "${item.status}" met bron "${item.bron}" mag de code niet vastleggen.`);
    const geldtVoor: string[] = [];
    for (const r of item.geldtVoorRefs) {
      const id = uit.idVan.get(r);
      if (id) geldtVoor.push(id);
      else fouten.push(`"Geldt voor" wijst naar ${r}, en dat is (nog) geen item.`);
    }
    if (fouten.length > 0) {
      uit.geweigerd.push({ ref: item.ref, fouten });
      continue;
    }
    const sleutel = kennisSleutel({
      domein: item.domein, soort: item.soort, bewering: item.bewering, analysis_id: item.analysisId, content_piece_id: item.contentPieceId,
    });
    if (sleutel && perSleutel.has(sleutel)) {
      const bestaand = perSleutel.get(sleutel)!;
      uit.idVan.set(item.ref, bestaand);
      uit.dubbel.push({ ref: item.ref, zelfdeAls: bestaand });
      continue;
    }
    const id = nieuwId();
    if (sleutel) perSleutel.set(sleutel, id);
    uit.idVan.set(item.ref, id);
    uit.rijen.push({
      id,
      profile_id: plan.profileId,
      domein: item.domein,
      soort: item.soort,
      bewering: item.bewering.trim(),
      waarde: item.waarde,
      status: item.status,
      bewijskracht: item.bewijskracht,
      bron: item.bron,
      bron_url: item.bronUrl,
      citaat: item.citaat,
      vastgelegd_door_taak: TERUGVUL_TAAK,
      gebruik: item.gebruik,
      geldt_voor: [...new Set(geldtVoor)],
      analysis_id: item.analysisId,
      content_piece_id: item.contentPieceId,
      herkomst_tabel: item.herkomst.tabel,
      herkomst_id: item.herkomst.id,
      sleutel,
      ruw: item.ruw,
    });
  }
  return uit;
}

/** De telling per bron en domein die K3 per merk vraagt. */
export function telling(rijen: readonly Pick<KennisRij, "herkomst_tabel" | "domein" | "status">[]): Record<string, number> {
  const uit: Record<string, number> = {};
  for (const r of rijen) {
    const k = `${r.herkomst_tabel} → ${r.domein} (${r.status})`;
    uit[k] = (uit[k] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(uit).sort(([a], [b]) => a.localeCompare(b)));
}

/**
 * De schrijfquery voor de route via een bestand (besluit V15). Hij staat hier en
 * niet in het script, omdat alleen `lib/kennis/` in de kennislaag schrijft (§4
 * regel 3). De rijen komen uit `zetOm()`, dus door dezelfde controles als
 * `legVast()`. \`$1\` is de inhoud van rijen.json. Bestaat de
 * sleutel al (een tweede run), dan gebeurt er niets met die rij.
 */
export const INSERT_SQL = `
insert into public.klantkennis (id, profile_id, domein, soort, bewering, waarde, status, bewijskracht, bron, bron_url, citaat,
  vastgelegd_door_taak, gebruik, geldt_voor, analysis_id, content_piece_id, herkomst_tabel, herkomst_id, sleutel, ruw)
select r.id, r.profile_id, r.domein, r.soort, r.bewering, r.waarde, r.status, r.bewijskracht, r.bron, r.bron_url, r.citaat,
  r.vastgelegd_door_taak, r.gebruik, r.geldt_voor, r.analysis_id, r.content_piece_id, r.herkomst_tabel, r.herkomst_id, r.sleutel, r.ruw
from jsonb_to_recordset($1::jsonb) as r(id uuid, profile_id uuid, domein text, soort text, bewering text, waarde jsonb, status text,
  bewijskracht text, bron text, bron_url text, citaat text, vastgelegd_door_taak text, gebruik text, geldt_voor uuid[],
  analysis_id uuid, content_piece_id uuid, herkomst_tabel text, herkomst_id uuid, sleutel text, ruw jsonb)
on conflict (profile_id, sleutel) where vervangen_door is null and sleutel is not null do nothing;
`.trim();

/**
 * De leesquery: per merk alles wat het plan nodig heeft, plus de sleutels die
 * al in de kennislaag staan. Eén rij per merk, kolom `merk`.
 */
export const EXPORT_SQL = `
select jsonb_build_object(
  -- Alleen de kolommen die het plan leest (BronProfiel).
  'profiel', jsonb_strip_nulls(jsonb_build_object('id', p.id, 'url', p.url, 'brand_name', p.brand_name, 'aliases', p.aliases, 'name_exclusions', p.name_exclusions, 'industry', p.industry, 'business_model', p.business_model, 'summary', p.summary, 'intake_description', p.intake_description, 'intake_audience', p.intake_audience, 'market_language', p.market_language, 'service_scope', p.service_scope, 'service_regions', p.service_regions, 'wikidata_id', p.wikidata_id, 'wikipedia_url', p.wikipedia_url, 'products', p.products, 'priority_offerings', p.priority_offerings, 'deprioritised_offerings', p.deprioritised_offerings, 'deal_value_band', p.deal_value_band, 'seasonality', p.seasonality, 'goal_12m', p.goal_12m, 'growth_regions', p.growth_regions, 'personas', p.personas, 'target_segments', p.target_segments, 'sales_objections', p.sales_objections, 'competitors', p.competitors, 'value_props', p.value_props, 'differentiator', p.differentiator, 'offline_proof', p.offline_proof, 'proof_points', p.proof_points, 'verhalen', p.verhalen, 'stem_voorbeelden', p.stem_voorbeelden, 'pronoun_preference', p.pronoun_preference, 'taboo_phrases', p.taboo_phrases, 'forbidden_topics', p.forbidden_topics, 'respect_site_structure', p.respect_site_structure)),
  'veldHerkomst', coalesce((select jsonb_agg(jsonb_build_object('field', s.field, 'source', s.source, 'not_applicable', s.not_applicable)) from public.profile_field_sources s where s.profile_id = p.id), '[]'),
  'feiten', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'analysis_id', b.analysis_id, 'text', b.text, 'source_url', b.source_url, 'kind', b.kind,
    'allowed', b.allowed, 'superseded_by', b.superseded_by, 'soort', b.soort, 'waarde', b.waarde, 'geldt_voor', b.geldt_voor, 'stand', b.stand,
    'bewijskracht', b.bewijskracht)) from public.brand_facts b where b.profile_id = p.id), '[]'),
  'aanbod', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'parent_id', o.parent_id, 'kind', o.kind, 'name', o.name, 'description', o.description,
    'audience', o.audience, 'price_indication', o.price_indication, 'evidence_url', o.evidence_url, 'evidence_quote', o.evidence_quote, 'source', o.source,
    'note', o.note, 'removed_at', o.removed_at)) from public.profile_offerings o where o.profile_id = p.id), '[]'),
  'vragen', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'analysis_id', f.analysis_id, 'question', f.question, 'answer', f.answer, 'status', f.status, 'scope', f.scope, 'content_piece_ids', f.content_piece_ids, 'open_vraag', f.open_vraag, 'raw_json', f.raw_json)) from public.fact_requests f where f.profile_id = p.id), '[]'),
  'strategie', (select jsonb_build_object('profile_id', st.profile_id, 'strategy_notes', st.strategy_notes, 'context_factors', st.context_factors)
    from public.profile_strategy st where st.profile_id = p.id),
  -- Alleen de delen van de ruwe uitvoer die het plan leest: de citaten van de
  -- samenvatting, de positie en de concurrenten uit de markt, de gegevens uit
  -- de HTML. De volledige modelantwoorden zijn tientallen kilobytes per merk.
  'facetten', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'facet', x.facet, 'raw_json', jsonb_build_object(
      'output_parsed', jsonb_build_object(
        'facts', x.raw_json->'output_parsed'->'facts',
        'positioning', x.raw_json->'output_parsed'->'positioning',
        'competitors', x.raw_json->'output_parsed'->'competitors'),
      'facts', case when x.facet = 'techniek' then x.raw_json->'facts' end)))
    from public.profile_facets x where x.profile_id = p.id and x.facet in ('synthese', 'markt', 'techniek')), '[]'),
  -- De pagina's die nog bestaan: een antwoord kan naar een verwijderde pagina
  -- wijzen, en de foreign key van klantkennis zou die rij weigeren.
  'paginas', coalesce((select jsonb_agg(c.id) from public.content_pieces c join public.analyses a on a.id = c.analysis_id where a.profile_id = p.id), '[]'),
  'bestaandeSleutels', coalesce((select jsonb_object_agg(k.sleutel, k.id) from public.klantkennis k where k.profile_id = p.id and k.sleutel is not null and k.vervangen_door is null), '{}')
) as merk
from public.profiles p
where p.archived_at is null
order by p.created_at;
`.trim();
