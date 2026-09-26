/**
 * WAT HET ONDERZOEK VINDT, ALS KENNISITEMS (K4 van
 * `docs/tasks/van-pijplijn-naar-kennissysteem.md`).
 *
 * Vijf onderzoeksstappen schrijven hun uitkomst in de oude tabellen en, via
 * deze omzetting en `legVast()`, ook in de kennislaag. Het dubbele schrijven
 * duurt tot K8; daarna schrijft alleen de kennislaag nog.
 *
 * Code, geen AI (§4 regel 1). Dezelfde indeling als het terugvullen van K3
 * (`terugvullen.ts`), zodat een item uit het onderzoek van vandaag dezelfde
 * sleutel krijgt als het item dat K3 uit dezelfde oude rij maakte: een tweede
 * ronde legt dan niets dubbel vast.
 *
 * ── DE STATUS ───────────────────────────────────────────────────────────────
 *
 * Waargenomen alleen als de CODE het citaat letterlijk op de pagina terugvond:
 *   - een sitefeit van de samenvatting: `quoteOnPage()` in `synthesis.ts`, feiten
 *     zonder gevonden citaat komen daar al niet door;
 *   - een aanbodknoop: `confidence = 1` (`quoteConfidence()` in `offering.ts`).
 *     Strenger dan K3, dat elk citaat liet tellen: 0,5 betekent dat het model een
 *     citaat gaf dat niet op de pagina staat, en dat is een vermoeden.
 * Al het andere is afgeleid, met het gebruik "intern" (§6.1): de branche, de
 * waardeproposities, de positie in de markt, de concurrenten, de gelijknamige
 * bedrijven uit de kennistest. Wie het vastlegt volgt daaruit (`doorVoor()`):
 * de code bij waargenomen, het model bij afgeleid.
 *
 * Puur en zonder `server-only` (conventie 2). Het wegschrijven staat in
 * `uit-onderzoek.ts`.
 */
import type { Actor } from "@/lib/kennis/regels";
import {
  LIJSTVELDEN,
  TEKSTVELDEN,
  domeinVanFeit,
  planAanbod,
  voegToe,
  type BronAanbod,
  type PlanItem,
  type VeldRegel,
} from "@/lib/kennis/terugvullen";

/** De taaksoorten die in de kennislaag schrijven, als `vastgelegd_door_taak`. */
export const ONDERZOEK_TAKEN = [
  "profile_research",
  "profile_offering",
  "profile_market",
  "profile_llm_baseline",
  "profile_synthesis",
] as const;
export type OnderzoekTaak = (typeof ONDERZOEK_TAKEN)[number];

/** Wie een item uit het onderzoek vastlegt: de code als hij het citaat controleerde, anders het model. */
export function doorVoor(item: Pick<PlanItem, "status">, taak: OnderzoekTaak): { actor: Extract<Actor, "code" | "model">; taak: string } {
  return { actor: item.status === "waargenomen" ? "code" : "model", taak };
}

function schoon(tekst: unknown): string {
  return typeof tekst === "string" ? tekst.trim() : "";
}

function regel(veld: string): VeldRegel {
  const gevonden = [...TEKSTVELDEN, ...LIJSTVELDEN].find((r) => r.veld === veld);
  if (!gevonden) throw new Error(`Geen veldregel voor ${veld}.`);
  return gevonden;
}

// ── 1. Het merkonderzoek (`prepare-profile.ts`) ──────────────────────────────

/** Wat het model voorstelde, al in de vorm van de kolommen van `profiles`. */
export interface MerkonderzoekVoorstel {
  brand_name?: string | null;
  industry?: string | null;
  business_model?: string | null;
  summary?: string | null;
  market_language?: string | null;
  service_scope?: string | null;
  service_regions?: string[];
  products?: string[];
  value_props?: string[];
  competitors?: string[];
  proof_points?: string[];
  personas?: { name: string; needs: string[] }[];
}

const MERK_SCALARS = ["brand_name", "industry", "business_model", "summary", "market_language", "service_scope"] as const;
const MERK_LIJSTEN = ["service_regions", "products", "value_props", "competitors"] as const;

/**
 * Alleen wat het model zei ÉN wat er echt op het profiel kwam. `geschreven` is
 * wat `filterProtectedFields()` doorliet: een veld dat een mens zette, blijft
 * staan en komt hier dus niet als vermoeden van het model binnen. Een lijst is
 * een unie van mens en model; alleen de waarden van het model tellen, anders
 * zou wat de consultant typte hier als "AI denkt" worden vastgelegd.
 *
 * Niet mee: `tone_of_voice` en `style_samples`, die volgens de inventaris
 * (F0.2) niet meer gebruikt worden.
 */
export function kennisUitMerkonderzoek(args: {
  profileId: string;
  model: MerkonderzoekVoorstel;
  geschreven: Record<string, unknown>;
}): PlanItem[] {
  const { profileId, model, geschreven } = args;
  const m = { items: [] as PlanItem[] };
  const herkomst = { tabel: "profiles" as const, id: profileId };
  const afgeleid = { status: "afgeleid" as const, bron: "ai" as const, herkomst };

  for (const veld of MERK_SCALARS) {
    const waarde = schoon(model[veld]);
    if (!waarde || !(veld in geschreven) || schoon(geschreven[veld]) !== waarde) continue;
    const r = regel(veld);
    voegToe(m, { ref: `profiles:${profileId}:${veld}`, domein: r.domein, soort: r.soort, bewering: waarde, gebruik: r.gebruik, ...afgeleid });
  }

  for (const veld of MERK_LIJSTEN) {
    const opProfiel = new Set((Array.isArray(geschreven[veld]) ? (geschreven[veld] as unknown[]) : []).map(schoon));
    const r = veld === "products" ? { domein: "aanbod" as const, soort: "product", gebruik: "intern" as const } : regel(veld);
    (model[veld] ?? []).map(schoon).forEach((w, i) => {
      if (!w || !opProfiel.has(w)) return;
      voegToe(m, { ref: `profiles:${profileId}:${veld}:${i}`, domein: r.domein, soort: r.soort, bewering: w, gebruik: r.gebruik, ...afgeleid });
    });
  }

  // Bewijspunten: het onderzoek vervangt de lijst, dus alles wat het model gaf staat erop.
  if ("proof_points" in geschreven) {
    (model.proof_points ?? []).map(schoon).forEach((w, i) => {
      if (!w) return;
      voegToe(m, { ref: `profiles:${profileId}:proof_points:${i}`, domein: "bewijs", soort: "bewijspunt", bewering: w, ...afgeleid });
    });
  }

  // Klantgroepen komen alleen van het model als er nog geen stonden.
  if ("personas" in geschreven && geschreven.personas === model.personas) {
    (model.personas ?? []).forEach((p, i) => {
      const naam = schoon(p?.name);
      const behoeften = (p?.needs ?? []).map(schoon).filter(Boolean).join(", ");
      const tekst = naam && behoeften ? `${naam}: ${behoeften}` : naam || behoeften;
      if (!tekst) return;
      voegToe(m, { ref: `profiles:${profileId}:personas:${i}`, domein: "doelgroep", soort: "klantgroep", bewering: tekst, ruw: p, ...afgeleid });
    });
  }
  return m.items;
}

// ── 2. De aanbodboom (`offering.ts`) ─────────────────────────────────────────

/**
 * De knopen die het model net vond. Waargenomen alleen met `confidence = 1`;
 * een prijs of doelgroep telt daarnaast alleen als hij letterlijk in dat citaat
 * staat (de regels van `planAanbod()`). Ouders eerst, zodat `geldt_voor` van
 * een kind naar een al vastgelegde ouder wijst.
 */
export function kennisUitAanbod(knopen: readonly BronAanbod[]): PlanItem[] {
  const m = { items: [] as PlanItem[], uitsluitingen: [], voorConsultant: [] };
  // `Number()`: een numeric-kolom komt uit Postgres als tekst ("1.00") terug,
  // en dan zou geen enkele knoop ooit waargenomen zijn (gevonden in scenario 21).
  planAanbod(m, { aanbod: knopen.filter((k) => k.source === "ai") }, (o) => o.confidence != null && Number(o.confidence) === 1);
  return m.items;
}

// ── 3. De samenvatting (`synthesis.ts`) ──────────────────────────────────────

/**
 * De sitefeiten die de samenvatting net opsloeg in `brand_facts`, met het
 * citaat dat de code op de pagina terugvond. De soort en de waarde bestaan nog
 * niet: die zet de indeling van het feitenregister later, alleen op de oude
 * tabel (besluit V18). Zonder soort is het domein "aanbod", dezelfde terugval
 * als bij K3 (`domeinVanFeit(null)`).
 */
export function kennisUitSynthese(feiten: readonly { id: string; text: string; sourceUrl: string; quote: string }[]): PlanItem[] {
  const m = { items: [] as PlanItem[] };
  for (const f of feiten) {
    if (!schoon(f.text) || !schoon(f.quote) || !schoon(f.sourceUrl)) continue;
    voegToe(m, {
      ref: `brand_facts:${f.id}`,
      domein: domeinVanFeit(null),
      bewering: schoon(f.text),
      status: "waargenomen",
      bron: "website",
      bronUrl: schoon(f.sourceUrl),
      citaat: schoon(f.quote),
      gebruik: "content",
      herkomst: { tabel: "brand_facts", id: f.id },
    });
  }
  return m.items;
}

// ── 4. Het marktonderzoek (`market.ts`) ──────────────────────────────────────

/**
 * De positie in de markt, waarom elke concurrent wint, en de namen die er op
 * het profiel bij kwamen. Allemaal een oordeel van het model, ook met web
 * search: een bronadres zonder gecontroleerd citaat is geen waarneming.
 */
export function kennisUitMarkt(args: {
  facetId: string;
  positioning: string;
  concurrenten: readonly { name: string; why: string; evidenceUrl?: string }[];
  nieuweNamen: readonly string[];
}): PlanItem[] {
  const m = { items: [] as PlanItem[] };
  const herkomst = { tabel: "profile_facets" as const, id: args.facetId };
  const afgeleid = { status: "afgeleid" as const, bron: "ai" as const, herkomst };
  if (schoon(args.positioning)) {
    voegToe(m, { ref: `profile_facets:${args.facetId}:positioning`, domein: "positionering", soort: "positie in de markt", bewering: schoon(args.positioning), ...afgeleid });
  }
  args.concurrenten.forEach((c, i) => {
    const naam = schoon(c?.name);
    const waarom = schoon(c?.why);
    if (!naam || !waarom) return;
    voegToe(m, { ref: `profile_facets:${args.facetId}:competitors:${i}`, domein: "positionering", soort: "waarom een concurrent wint", bewering: `${naam}: ${waarom}`, ruw: c, ...afgeleid });
  });
  const r = regel("competitors");
  args.nieuweNamen.map(schoon).forEach((naam, i) => {
    if (!naam) return;
    voegToe(m, { ref: `profile_facets:${args.facetId}:namen:${i}`, domein: r.domein, soort: r.soort, bewering: naam, gebruik: r.gebruik, ...afgeleid });
  });
  return m.items;
}

// ── 5. De kennistest (`llm-baseline.ts`) ─────────────────────────────────────

/**
 * De gelijknamige bedrijven die de kennistest voorstelde. De rest van de
 * kennistest is een meting en geen klantkennis (inventaris §4.4).
 */
export function kennisUitKennistest(args: { profileId: string; voorstellen: readonly string[] }): PlanItem[] {
  const m = { items: [] as PlanItem[] };
  const r = regel("name_exclusions");
  args.voorstellen.map(schoon).forEach((naam, i) => {
    if (!naam) return;
    voegToe(m, {
      ref: `profiles:${args.profileId}:name_exclusions:${i}`, domein: r.domein, soort: r.soort, bewering: naam,
      status: "afgeleid", bron: "ai", gebruik: r.gebruik, herkomst: { tabel: "profiles", id: args.profileId },
    });
  });
  return m.items;
}
