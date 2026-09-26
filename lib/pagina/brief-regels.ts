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
export const BRIEF_VERSIE = 3;

/** Technische bovengrens, geen doel (§6.1). */
export const MAX_BRIEFVRAGEN = 8;

export const VRAAGSOORTEN = ["feit", "praktijk", "werkwijze", "twijfel", "onderscheid"] as const;
export const ANTWOORDTYPEN = ["ja_nee", "bedrag", "getal", "tekst_kort", "tekst_lang", "keuze"] as const;

export const ContentBriefSchema = z.object({
  zoekintentie: z.string(),
  deelvragen: z.array(z.string()),
  concurrentie: z.object({ goed: z.array(z.string()), gaten: z.array(z.string()) }),
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
    }),
  ),
  ook_voor_deze_pagina: z.array(z.string()),
});

export type ContentBrief = z.infer<typeof ContentBriefSchema>;
export type BriefVraag = ContentBrief["vragen"][number];

/** Het onderzoek zoals het in `brief_json.onderzoek` komt: zonder de vragen, die worden rijen. */
export type Onderzoek = Omit<ContentBrief, "vragen" | "ook_voor_deze_pagina">;

/** Een vraag die het merk al kreeg, in welke stand ook. */
export interface EerdereVraag {
  id: string;
  question: string;
  status: string;
}

/** Een vraag zoals hij in `fact_requests` komt. */
export interface NieuweVraag {
  vraag: string;
  waarom: string;
  soort: BriefVraag["soort"];
  antwoord_type: BriefVraag["antwoord_type"];
  opties: string[] | null;
  merkbreed: boolean;
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
}

/**
 * Wat code met de uitvoer van het model doet, vóór er iets bewaard wordt.
 *
 * `eerdere` zijn alle vragen die het merk ooit kreeg (open, beantwoord,
 * overgeslagen). Alleen de open vragen daarvan mogen gekoppeld worden; een id
 * dat er niet tussen staat (een ander merk, of verzonnen) valt weg.
 */
export function verwerkBrief(ruw: ContentBrief, eerdere: EerdereVraag[]): VerwerkteBrief {
  const onderzoek: Onderzoek = {
    zoekintentie: schoon(ruw.zoekintentie),
    deelvragen: schoneLijst(ruw.deelvragen),
    concurrentie: { goed: schoneLijst(ruw.concurrentie.goed), gaten: schoneLijst(ruw.concurrentie.gaten) },
    vakkennis: ruw.vakkennis
      .filter((v) => isWebadres(v.bron_url) && v.uitleg.trim())
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
    });
    if (vragen.length >= MAX_BRIEFVRAGEN) break;
  }

  const open = new Set(eerdere.filter((e) => e.status === "open").map((e) => e.id));
  const koppel = Array.from(new Set(ruw.ook_voor_deze_pagina.map((id) => id.trim()))).filter((id) => open.has(id));

  return { onderzoek, vragen, koppel };
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
