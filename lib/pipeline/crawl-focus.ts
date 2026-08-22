import "server-only";

/**
 * Welke delen van een grote site moet ORBIT ENGINE lezen?
 *
 * ── WANNEER DEZE STAP DRAAIT, EN WANNEER NIET ───────────────────────────────
 *
 * Alleen als de site groter is dan wat we mogen ophalen. Een MKB-site van 40
 * pagina's komt hier nooit langs: daar worden alle pagina's gelezen en valt er
 * niets te kiezen. Fase 0 blijft daardoor gratis voor precies de klanten die de
 * app vandaag bedient, en kost ongeveer een cent bij de klant waar het uitmaakt.
 *
 * ── WAAROM DIT ÉÉN GOEDKOPE AANROEP IS EN GEEN VIJF MET WEB SEARCH ──────────
 *
 * Het alternatief dat voorlag was: vraag een model met web search naar alle
 * dienstenpagina's van de klant. Dat kost per aanroep het twintigvoudige (web
 * search is ~$0,025 tegen ~$0,001 aan tokens hier) en levert URL's op die
 * gecontroleerd moeten worden, want een model dat naar URL's gevraagd wordt
 * vult patronen aan.
 *
 * De sitemap heeft die URL's al, gratis en zonder gokken. Het enige wat een
 * model toevoegt is het OORDEEL: van de 60 secties op deze site dragen
 * `/behandelingen` en `/tarieven` het aanbod en `/blog` niet. Dat oordeel gaat
 * over 60 regels tekst, niet over 8.000 URL's, dus het past ruim in één
 * goedkope aanroep zonder redeneertijd.
 *
 * ── HET VANGNET (conventie 1) ───────────────────────────────────────────────
 *
 * Alles wat het model teruggeeft dat niet letterlijk in de aangeboden lijst
 * stond, verdwijnt. Het model kan de crawl dus niet naar een pagina sturen die
 * niet bestaat. Dat is niet "onwaarschijnlijk gemaakt" maar onmogelijk gemaakt.
 */
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { CrawlFocus } from "@/lib/schemas/crawl-focus";
import type { SiteSection } from "@/lib/pipeline/inventory-quality";
import type { BusinessModel } from "@/lib/types/database";

/**
 * Hoeveel secties het model te zien krijgt. Boven de 40 is de staart een lange
 * rij van secties met één pagina, en die dragen per definitie geen aanbod.
 */
const MAX_SECTIONS = 40;

/** Hoeveel secties het model hoogstens mag aanwijzen. Alles voorrang geven is niets voorrang geven. */
const MAX_PICKS = 8;

/** Onder dit aantal secties valt er niets te kiezen en doen we geen aanroep. */
const MIN_SECTIONS = 3;

export interface FocusInput {
  brandName: string;
  url: string;
  industry: string | null;
  businessModel: BusinessModel | null;
  sections: SiteSection[];
  /** Hoeveel pagina's de site heeft, en hoeveel we er mogen lezen. */
  totalFound: number;
  maxPages: number;
}

export interface FocusResult {
  /** De gekozen sectiepaden, alleen die in de aangeboden lijst stonden. */
  prioritySegments: string[];
  reasoning: string | null;
  costUsd: number;
}

export async function chooseCrawlFocus(
  profileId: string,
  input: FocusInput,
): Promise<FocusResult> {
  const kandidaten = input.sections
    .filter((s) => s.segment !== "/")
    .slice(0, MAX_SECTIONS);

  // Te weinig om over te oordelen. Geen aanroep doen is hier het goede antwoord:
  // bij twee secties verdeelt `url-priority.ts` de plekken toch al over allebei.
  if (kandidaten.length < MIN_SECTIONS) {
    return { prioritySegments: [], reasoning: null, costUsd: 0 };
  }

  const lijst = kandidaten
    .map((s) => `${s.segment} · ${s.count} pagina's · bijvoorbeeld ${s.examples.slice(0, 3).join(", ")}`)
    .join("\n");

  const system =
    `Je helpt bepalen WELKE delen van een website uitgelezen moeten worden om het ` +
    `aanbod van een bedrijf in kaart te brengen: zijn diensten, producten, ` +
    `productgroepen en vestigingen.\n\n` +
    `Je krijgt de secties van de site zoals ze werkelijk in de sitemap staan, met ` +
    `het aantal pagina's per sectie en een paar voorbeeld-URL's.\n\n` +
    `HARDE REGELS:\n` +
    `1. Kies UITSLUITEND uit de aangeboden secties. Neem het pad exact over. ` +
    `Verzin geen sectie en geen URL: wat er niet bij staat, bestaat niet.\n` +
    `2. Kies er hoogstens ${MAX_PICKS}, belangrijkste eerst. Alles aanwijzen is niets aanwijzen.\n` +
    `3. Kies secties waar het AANBOD staat, niet secties die het meeste opleveren. ` +
    `Een blog van 2.000 artikelen zegt minder over de diensten dan een sectie ` +
    `'behandelingen' met twaalf pagina's.\n` +
    `4. Neem ook de secties mee die het bedrijf zelf beschrijven als die het aanbod ` +
    `verduidelijken: tarieven, werkwijze, vestigingen. Niet: nieuws, vacatures, ` +
    `voorwaarden, winkelwagen, inloggen.\n` +
    `5. Geef in 'reasoning' in één zin aan waarom, in het Nederlands.`;

  const user =
    `Bedrijf: ${input.brandName}\nWebsite: ${input.url}\n` +
    (input.industry ? `Branche: ${input.industry}\n` : "") +
    (input.businessModel ? `Bedrijfsmodel: ${input.businessModel}\n` : "") +
    `\nDeze site heeft ${input.totalFound} pagina's en ORBIT ENGINE mag er ${input.maxPages} lezen. ` +
    `Welke secties moeten daar zeker bij?\n\n` +
    `SECTIES VAN DE SITE (dit is feitelijk, uit de sitemap):\n${lijst}`;

  const result = await callStructured({
    model: MODELS.volume,
    system,
    user,
    schema: CrawlFocus,
    schemaName: "crawl_focus",
    // Geen web search: de vraag gaat uitsluitend over de lijst hierboven, en
    // marktcontext zou het model juist naar secties laten raden die er niet zijn.
    webSearch: false,
    work: "analytical",
    meta: { kind: "crawl_focus", profileId },
  });

  // ── Het vangnet ───────────────────────────────────────────────────────────
  // Alleen wat letterlijk in de aangeboden lijst stond. Een model dat
  // `/diensten` teruggeeft terwijl de site `/behandelingen` heeft, stuurt de
  // crawl anders naar een sectie die niet bestaat, en dan verliest die klant
  // stilletjes zijn voorrangsplekken aan niets.
  const bestaand = new Set(kandidaten.map((s) => s.segment));
  const prioritySegments = [
    ...new Set(result.parsed.prioritySegments.map((s) => s.trim()).filter((s) => bestaand.has(s))),
  ].slice(0, MAX_PICKS);

  return {
    prioritySegments,
    reasoning: result.parsed.reasoning.trim() || null,
    costUsd: result.costUsd,
  };
}
