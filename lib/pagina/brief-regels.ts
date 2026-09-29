/**
 * DE CONTENT BRIEF: het schema en wat code er daarna mee doet
 * (`docs/tasks/contentketen-opnieuw.md` §6.1).
 *
 * De brief is onderzoek voor de schrijver (blok C en D) plus de gerichte vragen
 * aan de ondernemer (blok B). Hij maakt geen keuzes voor de schrijver: geen
 * opbouw, geen lengte, geen volgorde. Elk veld hieronder bestaat alleen omdat
 * het de vraag beantwoordt "wat moet de schrijver weten om een betere pagina te
 * schrijven?". Er komt nooit een veld bij zonder besluit in §2.
 *
 * Wat hier in code staat, is het vangnet onder de opdracht aan het model
 * (conventie 1): vakkennis zonder adres valt weg, hooguit acht vragen, geen
 * vraag die het merk al eens kreeg, en alleen koppelingen aan vragen die echt
 * open zijn en van dit merk.
 *
 * Puur en zonder `server-only` (conventie 2).
 */
import { z } from "zod";
import { pasSchrijfregelsToe } from "@/lib/schrijfregel-vangnet";

/** Verhoog bij een wijziging in schema of opdracht, zodat oude briefs herkenbaar blijven. */
/**
 * Versie 2 (26 september 2026): een voorbeeldvraag wordt niet meer aan andere
 * pagina's gekoppeld. Op de proef van WP8 hing één voorbeeldvraag van de
 * rijschool aan alle drie de pagina's, en stond hetzelfde voorbeeld drie keer
 * op de site.
 */
/**
 * Versie 3 (26 september 2026, na het oordeel van de copywriter): vraag hoe dit
 * bedrijf iets doet als de vakkennis een werkwijze, termijn of vuistregel noemt
 * die per bedrijf verschilt. Op de negen proefteksten stond zo'n algemene regel
 * een paar keer als werkwijze van het bedrijf, omdat niemand het had gevraagd.
 */
/**
 * Versie 4 (27 september 2026, A1 van `van-pijplijn-naar-kennissysteem.md`,
 * besluit B21): de invoer krijgt het kennisgat van de kans ("wat we voor deze
 * pagina nog niet weten"), en de opdracht één zin: vraag eerst daarnaar, en
 * liever om een voorbeeld uit de praktijk dan om een los feit. Nog steeds
 * hooguit acht vragen.
 */
/**
 * Versie 5 (29 september 2026, `pijplijnanalyse-contentketen.md`, besluiten
 * B22, B31 en B32): het veld `concurrentie` is weg (het werkte als verborgen
 * schrijfopdracht); vakkennis gaat over het vak en nooit over het bedrijf, en
 * vakkennis van de eigen site of met de naam van het bedrijf valt in code weg
 * (V4); het kennisgat gaat niet meer mee (V19); de brief ziet eerdere vragen met
 * hun antwoord en mag ook een beantwoorde vraag aan zijn pagina koppelen (V17);
 * een vraag vraagt één ding, en de uitleg erbij is in de taal van de klant (V22).
 */
/*
 * Versie 6 (29 september 2026, besluit B-c, V8): de brief krijgt de kernvraag
 * van de pagina uit het rapport en markeert welke vraag hem beantwoordt (`kern`,
 * of `kern_eerder` voor een vraag die er al was).
 */
/*
 * Versie 7 (29 september 2026, besluiten B33 en B34): de invoer krijgt bij een
 * artikel, gids, FAQ of vergelijking een zin over wat de lezer van die soort
 * pagina wil, en de zoekresultaten van Google als apart blok. De vaste opdracht
 * en het schema zijn gelijk; de invoer van een dienstpagina ook.
 */
export const BRIEF_VERSIE = 7;

/** Technische bovengrens, geen doel (§6.1). */
export const MAX_BRIEFVRAGEN = 8;

export const VRAAGSOORTEN = ["feit", "praktijk", "werkwijze", "twijfel", "onderscheid"] as const;
export const ANTWOORDTYPEN = ["ja_nee", "bedrag", "getal", "tekst_kort", "tekst_lang", "keuze"] as const;

export const ContentBriefSchema = z.object({
  zoekintentie: z.string(),
  deelvragen: z.array(z.string()),
  vakkennis: z.array(z.object({ uitleg: z.string(), bron_url: z.string() })),
  valkuilen: z.array(z.string()),
  vragen: z.array(
    z.object({
      vraag: z.string(),
      waarom: z.string(),
      soort: z.enum(VRAAGSOORTEN),
      antwoord_type: z.enum(ANTWOORDTYPEN),
      opties: z.array(z.string()).nullable(),
      merkbreed: z.boolean(),
      /** V8 (besluit B-c): deze vraag beantwoordt de kernvraag van de pagina. */
      kern: z.boolean(),
    }),
  ),
  ook_voor_deze_pagina: z.array(z.string()),
  /** V8: het id van een eerdere vraag die de kernvraag al beantwoordt of zal beantwoorden, of null. */
  kern_eerder: z.string().nullable(),
});

export type ContentBrief = z.infer<typeof ContentBriefSchema>;
export type BriefVraag = ContentBrief["vragen"][number];

/** Het onderzoek zoals het in `brief_json.onderzoek` komt: zonder de vragen, die worden rijen. */
export type Onderzoek = Omit<ContentBrief, "vragen" | "ook_voor_deze_pagina" | "kern_eerder">;

/** Een vraag die het merk al kreeg, in welke stand ook. */
export interface EerdereVraag {
  id: string;
  question: string;
  status: string;
  /** Het antwoord, als hij beantwoord is (V17). */
  answer?: string | null;
}

/** Een vraag zoals hij in `fact_requests` komt. */
export interface NieuweVraag {
  vraag: string;
  waarom: string;
  soort: BriefVraag["soort"];
  antwoord_type: BriefVraag["antwoord_type"];
  opties: string[] | null;
  merkbreed: boolean;
  /** V8: de vraag die de kernvraag van de pagina beantwoordt. Hooguit één per brief. */
  kern: boolean;
}

/**
 * Twee vragen zijn gelijk als ze na normaliseren gelijk zijn: hoofdletters,
 * accenten, leestekens en dubbele spaties tellen niet. Bewust niet slimmer
 * (geen synoniemen): een vraag in andere woorden is het werk van de opdracht,
 * dit is alleen het vangnet voor de letterlijke herhaling.
 */
export function normaliseerVraag(tekst: string): string {
  return tekst
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isWebadres(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.includes(".");
  } catch {
    return false;
  }
}

function schoon(t: string): string {
  return pasSchrijfregelsToe(t).trim();
}

function schoneLijst(lijst: string[]): string[] {
  return lijst.map(schoon).filter(Boolean);
}

export interface VerwerkteBrief {
  onderzoek: Onderzoek;
  vragen: NieuweVraag[];
  /** Id's van al open vragen van dit merk die ook voor deze pagina gelden. */
  koppel: string[];
  /** V8: een eerdere vraag die de kernvraag beantwoordt; staat dan ook in `koppel`. */
  kernEerder: string | null;
}

/**
 * Wat code met de uitvoer van het model doet, vóór er iets bewaard wordt.
 *
 * `eerdere` zijn alle vragen die het merk ooit kreeg (open, beantwoord,
 * overgeslagen). De open en beantwoorde daarvan mogen gekoppeld worden (V17);
 * een id dat er niet tussen staat (een ander merk, of verzonnen) valt weg.
 */
export interface MerkVoorBrief {
  /** De hoofd-URL of hostnaam van het merk. */
  url: string;
  /** De naam en andere schrijfwijzen. */
  namen: readonly string[];
}

function hostVan(url: string): string | null {
  try {
    const u = new URL(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Vakkennis over het bedrijf zelf: van de eigen site, of met de naam van het
 * bedrijf erin (V4 van `pijplijnanalyse-contentketen.md`). In ronde 1 kwam zo
 * een bedrag van Myfinance binnen ("samen € 79,95") buiten de kennislaag om,
 * waar een tegenspraak met het klantantwoord was opgevallen. Wat het bedrijf
 * zelf zegt, hoort in de kennislaag.
 */
export function overHetBedrijfZelf(v: { uitleg: string; bron_url: string }, merk: MerkVoorBrief | null): boolean {
  if (!merk) return false;
  const eigen = hostVan(merk.url);
  const bron = hostVan(v.bron_url);
  if (eigen && bron && (bron === eigen || bron.endsWith(`.${eigen}`))) return true;
  const tekst = v.uitleg.toLowerCase();
  return merk.namen
    .map((n) => n.trim().toLowerCase())
    .filter((n) => n.length >= 4)
    .some((n) => tekst.includes(n));
}

export function verwerkBrief(ruw: ContentBrief, eerdere: EerdereVraag[], merk: MerkVoorBrief | null = null): VerwerkteBrief {
  const onderzoek: Onderzoek = {
    zoekintentie: schoon(ruw.zoekintentie),
    deelvragen: schoneLijst(ruw.deelvragen),
    vakkennis: ruw.vakkennis
      .filter((v) => isWebadres(v.bron_url) && v.uitleg.trim())
      .filter((v) => !overHetBedrijfZelf(v, merk))
      .map((v) => ({ uitleg: schoon(v.uitleg), bron_url: v.bron_url.trim() })),
    valkuilen: schoneLijst(ruw.valkuilen),
  };

  const gezien = new Set(eerdere.map((e) => normaliseerVraag(e.question)));
  const vragen: NieuweVraag[] = [];
  for (const v of ruw.vragen) {
    const vraag = schoon(v.vraag);
    const sleutel = normaliseerVraag(vraag);
    if (!sleutel || gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    const opties = (v.opties ?? []).map(schoon).filter(Boolean);
    // Een keuzevraag zonder opties is niet te beantwoorden; dan wordt het een
    // gewone korte tekstvraag in plaats van een lege lijst knoppen.
    const keuze = v.antwoord_type === "keuze" && opties.length >= 2;
    vragen.push({
      vraag,
      waarom: schoon(v.waarom),
      soort: v.soort,
      antwoord_type: v.antwoord_type === "keuze" && !keuze ? "tekst_kort" : v.antwoord_type,
      opties: keuze ? opties : null,
      merkbreed: v.merkbreed,
      // V8: hooguit één kernvraag. Een merkbrede vraag is nooit de kern van
      // één pagina: die geldt voor het hele bedrijf.
      kern: Boolean(v.kern) && !v.merkbreed && !vragen.some((x) => x.kern),
    });
    if (vragen.length >= MAX_BRIEFVRAGEN) break;
  }

  // V17: ook een beantwoorde vraag mag aan deze pagina, dan komt het antwoord
  // bij de schrijver. Een overgeslagen vraag niet: daar is niets te halen.
  const koppelbaar = new Set(eerdere.filter((e) => e.status === "open" || e.status === "beantwoord").map((e) => e.id));
  const koppel = Array.from(new Set(ruw.ook_voor_deze_pagina.map((id) => id.trim()))).filter((id) => koppelbaar.has(id));

  // V8: een eerdere vraag als kern, alleen als er geen nieuwe kernvraag is en
  // hij koppelbaar is. Dan hangt hij ook aan deze pagina.
  const eerder = (ruw.kern_eerder ?? "").trim();
  const kernEerder = !vragen.some((v) => v.kern) && eerder && koppelbaar.has(eerder) ? eerder : null;
  if (kernEerder && !koppel.includes(kernEerder)) koppel.push(kernEerder);

  return { onderzoek, vragen, koppel, kernEerder };
}

/**
 * Welke `kind` een vraag in `fact_requests` krijgt. De kolom heeft een
 * check-constraint uit migratie 0024 die niet te verruimen is zonder hem eerst
 * te verwijderen (conventie 4), dus de vijf soorten van de brief worden op de
 * bestaande waarden gelegd. De soort zelf staat ook in `raw_json`.
 */
export function kindVoorSoort(soort: BriefVraag["soort"]): "aanvulling" | "praktisch" | "grenzen" | "onderscheid" {
  switch (soort) {
    case "praktijk":
    case "werkwijze":
      return "praktisch";
    case "twijfel":
      return "grenzen";
    case "onderscheid":
      return "onderscheid";
    default:
      return "aanvulling";
  }
}
