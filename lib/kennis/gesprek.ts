/**
 * WAT DE KLANT VERTELT, ALS KENNISITEMS (K5 van
 * `docs/tasks/van-pijplijn-naar-kennissysteem.md`).
 *
 * Drie plekken waar een mens iets over het bedrijf zegt, en die tot K8 ook nog
 * hun oude tabel schrijven:
 *   - een antwoord op een vraag (`answerFact()`, de route voor klantantwoorden);
 *   - een veld op het gespreksscherm of in de wizard (de profielroute);
 *   - de aantekeningen en veranderingen van het gesprek (de strategieroute).
 * De keuze bij een tegenstrijdigheid heeft geen omzetting nodig: die wijst een
 * bestaand item aan (`uit-gesprek.ts`).
 *
 * Code, geen AI (§4 regel 1). Dezelfde omzetting als het terugvullen van K3
 * (`planAntwoord`, `planProfielveld`, `planGesprek` in `terugvullen.ts`), zodat
 * een antwoord van vandaag dezelfde sleutel krijgt als het item dat K3 uit een
 * antwoord van gisteren maakte.
 *
 * ── ALLEEN WAT ER VERANDERDE ────────────────────────────────────────────────
 *
 * `wijzigingen()` legt de versie van vóór het opslaan naast die van erna. Wat in
 * beide staat, blijft zoals het is, ook als het een vermoeden van het model is:
 * een veld laten staan is geen uitspraak. Wie het wil bevestigen, doet dat op het
 * kennisoverzicht (K7). Het terugvullen van K3 las `profile_field_sources` en
 * noemde elk veld dat een mens ooit opsloeg verklaard; hier telt alleen wat die
 * mens er zelf aan veranderde.
 *
 * Puur en zonder `server-only` (conventie 2). Het wegschrijven staat in
 * `uit-gesprek.ts`.
 */
import { kennisSleutel } from "@/lib/kennis/samenvoegen";
import {
  PROFIEL_MEENEMEN,
  planAntwoord,
  planGesprek,
  planProfielveld,
  type BronAanbod,
  type BronProfiel,
  type BronStrategie,
  type BronVraag,
  type PlanItem,
} from "@/lib/kennis/terugvullen";
import { EDITABLE_PROFILE_FIELDS } from "@/lib/profile-editable";

/** Wie het veld opsloeg, zoals `resolveWriteSource()` het vaststelde. */
export type VeldBron = "klant" | "gesprek" | "consultant";

/**
 * De velden van het merkprofiel die een mens bewerkt en die klantkennis zijn.
 * Niet de stemvoorbeelden: daar geeft een mens alleen het adres, de tekst haalt
 * de code later op, en die tekst is een waarneming van de site.
 */
export const GESPREKSVELDEN: (keyof BronProfiel)[] = PROFIEL_MEENEMEN.filter(
  (v) => v !== "stem_voorbeelden" && (EDITABLE_PROFILE_FIELDS as readonly string[]).includes(v),
);

/** Een beantwoorde vraag als kennisitems; een open of overgeslagen vraag levert niets. */
export function kennisUitAntwoord(vraag: BronVraag): PlanItem[] {
  const m = { items: [] as PlanItem[], uitsluitingen: [], voorConsultant: [] };
  planAntwoord(m, vraag, null);
  return m.items;
}

/** Eén veld van het merkprofiel als kennisitems, verklaard door wie het opsloeg. */
export function kennisUitProfielveld(args: {
  profiel: Partial<BronProfiel> & Pick<BronProfiel, "id" | "url">;
  veld: keyof BronProfiel;
  bron: VeldBron;
  /** Voor producten: een product dat al een aanbodknoop is, komt niet dubbel. */
  aanbod?: readonly Pick<BronAanbod, "name" | "removed_at">[];
  /** Voor bewijspunten: een kopie van een antwoord komt uit het antwoord zelf. */
  vragen?: readonly Pick<BronVraag, "question">[];
}): PlanItem[] {
  if (!GESPREKSVELDEN.includes(args.veld)) return [];
  const m = { items: [] as PlanItem[], uitsluitingen: [] };
  planProfielveld(
    m,
    {
      profiel: args.profiel,
      veldHerkomst: [{ field: String(args.veld), source: args.bron, not_applicable: false }],
      aanbod: args.aanbod ?? [],
      vragen: args.vragen ?? [],
    },
    args.veld,
  );
  return m.items;
}

/** De aantekeningen en veranderingen uit het gesprek als kennisitems. */
export function kennisUitGesprek(strategie: BronStrategie | null): PlanItem[] {
  const m = { items: [] as PlanItem[], uitsluitingen: [] };
  planGesprek(m, strategie);
  return m.items;
}

/** De ontdubbelsleutel van een plan-item, dezelfde als `legVast()` berekent. */
export function sleutelVan(item: PlanItem): string | null {
  return kennisSleutel({
    domein: item.domein,
    soort: item.soort,
    bewering: item.bewering,
    analysis_id: item.analysisId,
    content_piece_id: item.contentPieceId,
  });
}

export interface Wijzigingen {
  /** Nieuw gezegd. */
  erbij: PlanItem[];
  /** Een nieuwere versie van hetzelfde: hetzelfde veld, dezelfde vraag, dezelfde plek in de lijst. */
  vervangen: { oud: PlanItem; nieuw: PlanItem }[];
  /** Weggehaald door een mens. */
  weg: PlanItem[];
}

/**
 * Wat er veranderde tussen twee versies.
 *
 * Eerst op sleutel: wat in beide versies staat, verandert niet. Daarna op de
 * verwijzing naar de bron (`ref`): een ander antwoord op dezelfde vraag, of een
 * andere tekst in hetzelfde veld, is een nieuwe versie van hetzelfde item
 * (`vervang()`), zodat na te gaan blijft wat er eerder gold. In een lijst is de
 * verwijzing de plek: "Tilburg" dat "Tilburg en omstreken" wordt, is een nieuwe
 * versie; een naam die verdwijnt terwijl de rest opschuift, is weggehaald.
 */
export function wijzigingen(oud: readonly PlanItem[], nieuw: readonly PlanItem[]): Wijzigingen {
  const sleutelsOud = new Set(oud.map(sleutelVan));
  const sleutelsNieuw = new Set(nieuw.map(sleutelVan));
  const weg = oud.filter((o) => !sleutelsNieuw.has(sleutelVan(o)));
  const erbij = nieuw.filter((n) => !sleutelsOud.has(sleutelVan(n)));
  const vervangen: Wijzigingen["vervangen"] = [];
  for (const n of [...erbij]) {
    const i = weg.findIndex((o) => o.ref === n.ref);
    if (i < 0) continue;
    vervangen.push({ oud: weg[i], nieuw: n });
    weg.splice(i, 1);
    erbij.splice(erbij.indexOf(n), 1);
  }
  return { erbij, vervangen, weg };
}

/**
 * De velden die een mens net op "niet van toepassing" zette (K7, gevonden in
 * K5), alleen die van het gesprek. Terugzetten (`false`) telt niet: pas een
 * nieuwe waarde is weer een uitspraak.
 */
export function nietVanToepassingVelden(nvt: unknown): string[] {
  if (!nvt || typeof nvt !== "object" || Array.isArray(nvt)) return [];
  return Object.entries(nvt as Record<string, unknown>)
    .filter(([veld, waarde]) => waarde === true && (GESPREKSVELDEN as readonly string[]).includes(veld))
    .map(([veld]) => veld);
}

/** Het profiel zoals de kennislaag het ziet: een veld dat niet van toepassing is, is leeg. */
export function zonderNietVanToepassing<T extends Partial<BronProfiel>>(profiel: T, velden: readonly string[]): T {
  return { ...profiel, ...Object.fromEntries(velden.map((v) => [v, null])) };
}

// ── De stemvoorbeelden (K8) ──────────────────────────────────────────────────

/**
 * De opgehaalde tekst van de stemvoorbeelden als kennisitems: waargenomen, met
 * het adres als bron en de tekst als citaat, zoals het terugvullen (K3) ze
 * vastlegde. Een adres zonder tekst (nog niet opgehaald, of niet te lezen)
 * levert niets.
 */
export function kennisUitStemvoorbeelden(
  profiel: Pick<BronProfiel, "id" | "url">,
  voorbeelden: readonly { url: string; tekst: string | null }[],
): PlanItem[] {
  const m = { items: [] as PlanItem[], uitsluitingen: [] };
  planProfielveld(m, { profiel: { ...profiel, stem_voorbeelden: [...voorbeelden] }, veldHerkomst: [], aanbod: [], vragen: [] }, "stem_voorbeelden");
  return m.items;
}

export interface StemPlan {
  /** Een adres dat nog geen actueel item had. */
  nieuw: PlanItem[];
  /** Hetzelfde adres met een andere tekst: een nieuwere versie. */
  vervangen: { oudId: string; item: PlanItem }[];
  /** Een adres dat de mens weghaalde. */
  afwijzen: string[];
}

/**
 * Wat er in de kennislaag moet veranderen na het ophalen. Per adres één actueel
 * item: dezelfde tekst laat het staan, een andere tekst wordt een nieuwe versie
 * (een site verandert, en de oude tekst blijft na te gaan). Een item van een
 * adres dat niet meer gekozen is, wijst de mens af die het weghaalde.
 *
 * `gekozen` is de lijst adressen zoals de mens hem opsloeg; een adres dat wel
 * gekozen is maar niet te lezen was, laat zijn oude item staan.
 */
export function stemPlan(
  bestaand: readonly { id: string; bron_url: string | null; bewering: string }[],
  opgehaald: readonly PlanItem[],
  gekozen: readonly string[],
): StemPlan {
  const plan: StemPlan = { nieuw: [], vervangen: [], afwijzen: [] };
  for (const item of opgehaald) {
    const oud = bestaand.find((b) => b.bron_url === item.bronUrl);
    if (!oud) plan.nieuw.push(item);
    else if (oud.bewering.trim() !== item.bewering.trim()) plan.vervangen.push({ oudId: oud.id, item });
  }
  const nog = new Set(gekozen);
  plan.afwijzen = bestaand.filter((b) => !b.bron_url || !nog.has(b.bron_url)).map((b) => b.id);
  return plan;
}

// ── Het merkdossier (K8) ─────────────────────────────────────────────────────

export interface DocumentFeit {
  /** De beantwoorde merkvraag die de route voor dit feit aanmaakte. */
  vraagId: string;
  question: string;
  answer: string;
  /** De letterlijke zin uit het document; de code controleerde dat hij erin staat (`verifyDossierFacts()`). */
  zin: string;
  /** Wanneer het feit opnieuw bevestigd moet worden (JJJJ-MM-DD), of null. */
  verlooptOp?: string | null;
}

/**
 * Een feit uit een aangeleverd document als kennisitem. Dezelfde omzetting als
 * een antwoord op een merkvraag (zelfde domein, soort en sleutel), zodat een
 * latere wijziging van dat antwoord een nieuwe versie van dit item wordt. Wat
 * verschilt: de bron is het document, en de letterlijke zin gaat mee als citaat.
 *
 * Verklaard, niet waargenomen: het document is materiaal van de klant zelf, en
 * waargenomen eist een bronadres dat een geplakte tekst niet heeft (besluit V21).
 */
export function kennisUitDocument(feit: DocumentFeit, documentId: string | null): PlanItem[] {
  return kennisUitAntwoord({
    id: feit.vraagId,
    analysis_id: null,
    question: feit.question,
    answer: feit.answer,
    status: "beantwoord",
    scope: "merk",
    content_piece_ids: [],
    open_vraag: false,
    raw_json: { bron: "merkdossier" },
  }).map((item) => ({
    ...item,
    bron: "document" as const,
    citaat: feit.zin.trim() || null,
    herkomst: documentId ? { tabel: "brand_documents" as const, id: documentId } : item.herkomst,
    verlooptOp: feit.verlooptOp ?? null,
    ruw: { vraag: feit.question, zin: feit.zin, documentId, vraagId: feit.vraagId },
  }));
}
