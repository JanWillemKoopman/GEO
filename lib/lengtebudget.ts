/**
 * Het lengtebudget van een pagina (docs/tasks/contentpijplijn-publicatiewaardig.md §7.4, WP3).
 *
 * Tot nu toe was lengte een uitkomst van de checklist: `TARGET_WORDS` gaf per
 * type een bandbreedte, het contract verdeelde die over tien secties, en de
 * keuring bewaakte alleen de ondergrens per sectie. Gemeten op 25 september
 * 2026: de installateur gemiddeld 980 woorden over 10,3 secties, de hovenier 881
 * over 9,5. Niemand besliste "deze pagina heeft vijf feiten en drie echte
 * vragen, dus 450 woorden is genoeg".
 *
 * Nu zet de paginastrategie een budget met onderbouwing, en deze module bepaalt
 * de grenzen waarbinnen dat mag: een vertrekpunt per paginadoel, plus ongeveer
 * 80 woorden per extra beslisvraag met een feit en 50 per uitleg die nodig is om
 * een feit te begrijpen, met een plafond van het vertrekpunt plus 30 procent.
 * Daarboven moet de strategie zeggen waarom, en ook dan niet boven de
 * bovengrens van het type plus de helft.
 *
 * ⚠️ Het zijn startwaarden (gekozen, niet geijkt). WP15 stelt ze bij op de
 * nameting na fase 1.
 *
 * Puur (conventie 2).
 */
import type { ContentType } from "@/lib/types/database";

export type Paginadoel = "lokaal" | "dienst" | "uitleg" | "vergelijking" | "faq";

/** Het vertrekpunt per paginadoel, in woorden in de lopende tekst. */
export const VERTREKPUNT: Record<Paginadoel, { min: number; max: number }> = {
  lokaal: { min: 350, max: 550 },
  dienst: { min: 450, max: 750 },
  uitleg: { min: 600, max: 1100 },
  vergelijking: { min: 500, max: 900 },
  // Een FAQ-pagina heeft zijn werk in de vraag-antwoordparen; de tekst eromheen
  // is kort. Dezelfde grenzen als `TARGET_WORDS.faq` in content.ts.
  faq: { min: 250, max: 500 },
};

/** Extra woorden per beslisvraag met een feit, en per uitleg die een feit begrijpelijk maakt. */
export const PER_BESLISVRAAG = 80;
export const PER_UITLEG = 50;
/** Het plafond: vertrekpunt plus dertig procent, tenzij de strategie zegt waarom meer. */
export const PLAFOND_FACTOR = 1.3;
/** Ook met een reden niet boven het vertrekpunt plus de helft. */
export const HARDE_BOVENGRENS_FACTOR = 1.5;

/**
 * Het paginadoel uit het type en de titel. Een landingspagina over een plaats
 * ("Tuinaanleg in Best") is lokaal; een andere landingspagina een dienstpagina.
 */
export function paginadoelVan(type: ContentType, overPlaats: boolean): Paginadoel {
  switch (type) {
    case "landing":
      return overPlaats ? "lokaal" : "dienst";
    case "article":
      return "uitleg";
    case "comparison":
      return "vergelijking";
    case "faq":
      return "faq";
    default:
      return "uitleg";
  }
}

/** Gaat de titel over een plaats uit het werkgebied? Hoofdletterongevoelig, op hele woorden. */
export function titelOverPlaats(titel: string, plaatsen: readonly string[]): boolean {
  const t = ` ${titel.toLowerCase().replace(/[^a-z0-9à-ÿ'-]+/g, " ")} `;
  return plaatsen.some((p) => {
    const n = p.trim().toLowerCase().replace(/[^a-z0-9à-ÿ'-]+/g, " ");
    return n.length > 1 && t.includes(` ${n} `);
  });
}

export interface Budgetgrenzen {
  doel: Paginadoel;
  /** Het vertrekpunt. Geen ondergrens meer: daaronder volgt een waarschuwing, geen ophoging. */
  min: number;
  /** Plafond zonder reden. */
  plafond: number;
  /** Plafond met reden. */
  hard: number;
}

export function budgetgrenzen(doel: Paginadoel): Budgetgrenzen {
  const v = VERTREKPUNT[doel];
  return {
    doel,
    min: v.min,
    plafond: Math.round(v.max * PLAFOND_FACTOR),
    hard: Math.round(v.max * HARDE_BOVENGRENS_FACTOR),
  };
}

/**
 * Het verwachte budget uit de inhoud: het midden van het vertrekpunt plus de
 * extra's. Dient als rekenvoorbeeld in de opdracht aan de strategie en als
 * vervanging als de strategie geen bruikbaar getal gaf.
 */
export function verwachtBudget(doel: Paginadoel, beslisvragenMetFeit: number, uitleggen: number): number {
  const v = VERTREKPUNT[doel];
  const basis = Math.round((v.min + v.max) / 2);
  return basis + PER_BESLISVRAAG * Math.max(0, beslisvragenMetFeit - 1) + PER_UITLEG * Math.max(0, uitleggen);
}

/**
 * Het budget van de strategie onder het plafond houden. Geeft het geklemde
 * getal en, als er geklemd is, de reden in gewone taal voor de correctielijst.
 */
export function klemBudget(
  woorden: number | null | undefined,
  grenzen: Budgetgrenzen,
  metReden: boolean,
): { woorden: number; correctie: string | null } {
  if (typeof woorden !== "number" || !Number.isFinite(woorden) || woorden <= 0) {
    const w = Math.round((grenzen.min + grenzen.plafond / PLAFOND_FACTOR) / 2);
    return { woorden: w, correctie: `Geen bruikbaar lengtebudget; ${w} woorden gezet (midden van het vertrekpunt).` };
  }
  const boven = metReden ? grenzen.hard : grenzen.plafond;
  if (woorden > boven) {
    return {
      woorden: boven,
      correctie: `Lengtebudget ${woorden} boven het plafond van ${boven}${metReden ? " (ook met reden)" : " zonder reden"}; teruggezet.`,
    };
  }
  // Onder het vertrekpunt wordt NIET meer opgehoogd. Nameting fase 1 (25
  // september 2026): de strategie van de kostenpagina plande 395 woorden, de
  // code maakte er 600 van, en de schrijver schreef er 227, want hij volgde de
  // woorden per onderwerp (samen 210). Bij Best vulde de schrijver een budget
  // dat groter was dan de inhoud met herhaling. Een te kort budget is een
  // signaal over de inhoud (`budgetUitOnderwerpen` meldt het), geen getal om op
  // te hogen.
  return { woorden: Math.round(woorden), correctie: null };
}

/** Zoveel mag het budget van de strategie afwijken van de som van de onderwerpen. */
export const BUDGET_MARGE = 0.15;

/**
 * Het budget volgt de som van de onderwerpen die erop komen (werkstand §4,
 * punt 3). De schrijver schrijft per onderwerp; een totaal dat daar meer dan
 * 15 procent van afwijkt, wordt de som. Zonder woorden per onderwerp blijft het
 * getal van de strategie staan.
 */
export function budgetUitOnderwerpen(
  budget: number,
  woordenPerOnderwerp: readonly (number | null)[],
): { woorden: number; correctie: string | null } {
  const som = woordenPerOnderwerp.reduce<number>((t, w) => t + (typeof w === "number" && w > 0 ? w : 0), 0);
  if (som <= 0) return { woorden: budget, correctie: null };
  if (Math.abs(budget - som) <= som * BUDGET_MARGE) return { woorden: budget, correctie: null };
  return {
    woorden: som,
    correctie: `Lengtebudget ${budget} wijkt meer dan ${Math.round(BUDGET_MARGE * 100)} procent af van de som van de onderwerpen (${som}); die som geldt.`,
  };
}
