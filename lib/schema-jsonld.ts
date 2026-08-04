/**
 * Programmatische validatie/reparatie van schema.org JSON-LD
 * (contentkwaliteit-analyse.md E1, abcplan.md §8, 6f).
 *
 * Het schrijfmodel levert `schemaJsonLd` als string; die is regelmatig ongeldig
 * of gehallucineerd. In plaats van dat blind op te slaan valideren we het in
 * code: parst het en is het een plausibel schema.org-object, dan behouden we het;
 * anders bouwen we een minimaal-geldig object op uit de bekende velden. Zo staat
 * er altijd plak-klare, geldige structured data in de bibliotheek — geen API-kosten.
 *
 * ── UITGEBREID OP 4 AUGUSTUS 2026 (InSpace-optimalisatie 2) ─────────────────
 *
 * Er waren drie uitkomsten: `FAQPage`, `WebPage`, `Article`. Dat is mager, en
 * het is een gat in ons eigen verhaal: sinds de entiteitscontrole BEOORDELEN WIJ
 * DE KLANT op schemadekking ("100% van de pagina's heeft schema.org-opmaak,
 * Article, Organization, Person…"), terwijl onze eigen gegenereerde pagina's het
 * bij een kaal `WebPage` lieten.
 *
 * Vier dingen erbij:
 *
 *   1. **Het type volgt het bedrijfsmodel.** Een landingspagina van een
 *      dienstverlener is een `Service`, van een retailer een `CollectionPage`.
 *      `business_model` staat sinds migratie 0032 op `profiles` en werd hier
 *      nergens voor gebruikt.
 *   2. **Een `@graph` met de organisatie erachter**, mét de `sameAs` die fase 0
 *      al uit de opmaak van de klant heeft geoogst. Dat is precies wat een
 *      AI-systeem gebruikt om te bevestigen dat het over hetzelfde bedrijf gaat.
 *   3. **`datePublished` en `dateModified`.** Versheid is een signaal en wij
 *      zetten het nergens.
 *   4. **Strengere validatie.** Tot nu accepteerden we alles met een `@context`
 *      en een `@type` — dus ook een `Recipe` op een dienstenpagina. Voortaan
 *      moet het type in de tabel passen, en onze eigen velden (datums, de
 *      organisatieknoop) gaan er áltijd overheen: die weten wij zeker en het
 *      model gokt ze.
 */
import type { BusinessModel, ContentType } from "@/lib/types/database";

export interface OrganizationInfo {
  name: string;
  /** De hoofd-URL van het merk, niet die van de pagina. */
  url: string;
  /** Externe profielen uit fase 0 (`techniek`-facet). Leeg is prima. */
  sameAs?: string[];
}

interface RebuildInput {
  type: ContentType;
  title: string;
  description: string;
  url: string;
  faq: { q: string; a: string }[];
  /** Bepaalt het `@type` van een landingspagina. Null = we weten het niet. */
  businessModel?: BusinessModel | null;
  organization?: OrganizationInfo | null;
  /** ISO-datums uit `content_pieces.created_at` / `updated_at`. */
  datePublished?: string | null;
  dateModified?: string | null;
}

/**
 * `@type` per contenttype en bedrijfsmodel.
 *
 * Alleen de landingspagina verschilt: dáár gaat het over wat het bedrijf
 * aanbiedt, en dat is bij een dienstverlener een dienst en bij een retailer een
 * verzameling producten. Een FAQ is een FAQ en een artikel een artikel, wat voor
 * bedrijf je ook bent.
 */
export function schemaTypeFor(
  type: ContentType,
  businessModel?: BusinessModel | null,
): string {
  if (type === "faq") return "FAQPage";
  if (type === "article") return "Article";
  if (type === "comparison") return "WebPage";

  // landing
  switch (businessModel) {
    case "dienstverlener":
      return "Service";
    case "retailer":
    case "fabrikant":
      return "CollectionPage";
    default:
      return "WebPage";
  }
}

/**
 * Welke `@type`-waarden we van het model accepteren voor dit contenttype.
 *
 * Ruimer dan wat `schemaTypeFor()` zelf zou kiezen: schrijft het model een
 * `Product` op een landingspagina van een fabrikant, dan is dat een prima keuze
 * die wij niet hoeven te overrulen. Maar een `Recipe` op een dienstenpagina —
 * en dat soort dingen komt eruit — vervangen we.
 */
function acceptableTypes(
  type: ContentType,
  businessModel?: BusinessModel | null,
): Set<string> {
  if (type === "faq") return new Set(["FAQPage", "QAPage"]);
  if (type === "article")
    return new Set(["Article", "BlogPosting", "NewsArticle", "TechArticle"]);
  if (type === "comparison")
    return new Set(["WebPage", "Article", "ItemList", "CollectionPage"]);

  const landing = new Set(["WebPage", "CollectionPage", "ItemList"]);
  if (businessModel === "dienstverlener") {
    landing.add("Service");
    landing.add("ProfessionalService");
    landing.add("LocalBusiness");
  }
  if (businessModel === "retailer" || businessModel === "fabrikant") {
    landing.add("Product");
    landing.add("ProductGroup");
    landing.add("OfferCatalog");
  }
  return landing;
}

/** De `@type` van een geparst object, ook als het een array is. */
function typeOf(obj: Record<string, unknown>): string[] {
  const t = obj["@type"];
  if (typeof t === "string") return [t];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === "string");
  return [];
}

/** De organisatieknoop die onder élke pagina hangt. */
function organizationNode(
  org: OrganizationInfo,
): Record<string, unknown> {
  const node: Record<string, unknown> = {
    "@type": "Organization",
    "@id": `${org.url.replace(/\/+$/, "")}/#organization`,
    name: org.name,
    url: org.url,
  };
  if (org.sameAs && org.sameAs.length > 0) node.sameAs = org.sameAs.slice(0, 10);
  return node;
}

/** Bouwt een minimaal-geldig schema.org-object op uit de bekende velden. */
function buildPageNode(input: RebuildInput): Record<string, unknown> {
  const base: Record<string, unknown> = {
    "@type": schemaTypeFor(input.type, input.businessModel),
    name: input.title,
    headline: input.title,
    description: input.description,
    url: input.url,
  };
  if (input.type === "faq" && input.faq.length > 0) {
    base.mainEntity = input.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    }));
  }
  return base;
}

/**
 * Onze eigen velden over het paginaobject heen zetten.
 *
 * Áltijd, ook bij een geldig modelresultaat. Datums en de organisatie-URL weten
 * wij zeker uit de database; het model kan ze hooguit goed gokken, en gokt ze in
 * de praktijk verkeerd — een `datePublished` van een jaar geleden op een pagina
 * die vanmorgen geschreven is, is een versheidssignaal dat tegen de klant werkt.
 */
function applyOwnFields(
  node: Record<string, unknown>,
  input: RebuildInput,
): Record<string, unknown> {
  const out = { ...node };
  if (input.datePublished) out.datePublished = input.datePublished;
  if (input.dateModified) out.dateModified = input.dateModified;
  if (input.organization) {
    out.publisher = {
      "@id": `${input.organization.url.replace(/\/+$/, "")}/#organization`,
    };
  }
  // De pagina-URL komt uit onze database en niet uit het model.
  out.url = input.url;
  return out;
}

/** Het geheel: één `@graph` met de pagina en de organisatie erachter. */
function wrap(
  pageNode: Record<string, unknown>,
  input: RebuildInput,
): Record<string, unknown> {
  const graph: Record<string, unknown>[] = [applyOwnFields(pageNode, input)];
  if (input.organization) graph.push(organizationNode(input.organization));

  return graph.length === 1
    ? { "@context": "https://schema.org", ...graph[0] }
    : { "@context": "https://schema.org", "@graph": graph };
}

/**
 * Geeft een gegarandeerd geldige JSON-LD-string terug: het model-resultaat als
 * dat parst en een PASSEND type heeft, anders een opgebouwde fallback. In beide
 * gevallen met onze eigen datums en organisatieknoop eroverheen.
 */
export function validateOrRebuildJsonLd(
  modelJsonLd: string | null | undefined,
  input: RebuildInput,
): string {
  const toegestaan = acceptableTypes(input.type, input.businessModel);

  if (modelJsonLd) {
    try {
      const parsed = JSON.parse(modelJsonLd) as unknown;
      if (typeof parsed === "object" && parsed !== null) {
        const obj = parsed as Record<string, unknown>;
        // Levert het model zelf al een @graph, dan pakken we de eerste knoop die
        // een bruikbaar type heeft — de rest gooien we weg en bouwen we zelf.
        const kandidaat = Array.isArray(obj["@graph"])
          ? ((obj["@graph"] as unknown[]).find(
              (n) =>
                typeof n === "object" &&
                n !== null &&
                typeOf(n as Record<string, unknown>).some((t) =>
                  toegestaan.has(t),
                ),
            ) as Record<string, unknown> | undefined)
          : typeOf(obj).some((t) => toegestaan.has(t))
            ? obj
            : undefined;

        if (kandidaat) {
          // `@context` hoort op het geheel en niet op de knoop.
          const schoon = { ...kandidaat };
          delete schoon["@context"];
          return JSON.stringify(wrap(schoon, input), null, 2);
        }
      }
    } catch {
      // val door naar de fallback
    }
  }
  return JSON.stringify(wrap(buildPageNode(input), input), null, 2);
}

/**
 * De zichtbare versheidsregel onderaan de tekst.
 *
 * InSpace noemt een zichtbare `dateModified` expliciet als versheidssignaal, en
 * daar zit een punt in dat verder gaat dan opmaak: een datum die alleen in de
 * JSON-LD staat, ziet de bezoeker niet en kan een assistent niet citeren uit de
 * lopende tekst. Beide dus.
 *
 * Puur, dus testbaar — en bewust idempotent: `content_revise` draait over
 * bestaande tekst heen, en zonder deze controle zou elke herziening een tweede
 * regel toevoegen.
 */
const FRESHNESS_MARKER = "_Laatst bijgewerkt:";

export function withFreshnessLine(
  markdown: string,
  isoDate: string | null | undefined,
): string {
  if (!isoDate) return markdown;

  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return markdown;

  const datum = d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const regel = `${FRESHNESS_MARKER} ${datum}._`;

  // Bestaat er al een regel, dan vervangen we hem in plaats van er een tweede
  // onder te zetten.
  const bestaand = new RegExp(
    `\\n*${FRESHNESS_MARKER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^\\n]*`,
    "g",
  );
  const schoon = markdown.replace(bestaand, "").trimEnd();

  return `${schoon}\n\n${regel}\n`;
}

/**
 * De `datePublished` uit een eerder opgeslagen JSON-LD-string terughalen.
 *
 * De herschrijfronde mag die niet opschuiven: dan presenteert elke herziening de
 * pagina als nieuw en gooit hij de opgebouwde ouderdom weg. Geeft `null` terug
 * bij alles wat niet parst — dan valt de aanroeper terug op `created_at`, en dat
 * is een betere bron dan een gok.
 */
export function bestaandeDatePublished(
  jsonLd: string | null | undefined,
): string | null {
  if (!jsonLd) return null;
  try {
    const parsed = JSON.parse(jsonLd) as Record<string, unknown>;
    const knopen = Array.isArray(parsed["@graph"])
      ? (parsed["@graph"] as Record<string, unknown>[])
      : [parsed];
    for (const n of knopen) {
      const d = n?.datePublished;
      if (typeof d === "string" && d.trim()) return d;
    }
  } catch {
    // Geen geldige JSON: dan weten we het niet.
  }
  return null;
}
