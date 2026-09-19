/**
 * Past het gekozen CONTENTTYPE bij de vragen die de pagina moet winnen?
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * `REPORT_SYSTEM` kreeg tot 19 september 2026 geen enkele instructie over het
 * veld `type`, terwijl het schema er vier toestaat en dat type de doellengte
 * (`TARGET_WORDS`), de schrijfinstructie (`TYPE_GUIDANCE`), de inhoudsopgave
 * (`content-contract.ts`) en de publicatiedrempel (`quality-profile.ts`)
 * bepaalt. Gemeten op productie over 37 aanbevelingen: 21 keer `landing`
 * (57%), 12 keer `article`, 3 keer `faq`, 1 keer `comparison`. Dat is geen
 * keuze maar een gewoonte van het model.
 *
 * De instructie is er nu. Dit is het vangnet ernaast (conventie 1): een
 * promptinstructie is een intentie, code is een garantie.
 *
 * ── WAAROM ALLEEN NAAR BENEDEN ──────────────────────────────────────────────
 *
 * Beide regels corrigeren uitsluitend van een SPECIFIEK type naar het algemene
 * type dat er het dichtst bij ligt, nooit andersom. De reden is asymmetrie in
 * de schade. Een FAQ die eigenlijk een artikel had moeten zijn, levert 250 tot
 * 500 woorden op waar er 700 tot 1200 nodig waren: een dunne pagina. Een
 * artikel dat eigenlijk een FAQ had moeten zijn, levert een te lange maar
 * verder bruikbare tekst op. Automatisch UPGRADEN naar een specifieker type zou
 * betekenen dat de code een redactionele keuze maakt op een signaal van een
 * vraagteken, en dat is precies het soort gok dat conventie 3 verbiedt.
 *
 * Wie het beter weet, zet het type met de hand recht op de kans zelf
 * (`app/api/profiles/[id]/plan/pages/[pageId]`, migratie 0107).
 *
 * Puur en zonder `server-only` (conventie 2), testbaar vanuit `test-unit.ts`.
 */
import type { ContentType } from "@/lib/types/database";

/** Eén aanbeveling, alleen de velden waar deze toets naar kijkt. */
export interface TypeKandidaat {
  title: string;
  type: ContentType;
  targets: { text: string }[];
}

/** Wat er is rechtgezet, voor de logregel en de tests. */
export interface TypeCorrectie {
  title: string;
  van: ContentType;
  naar: ContentType;
  reden: string;
}

/**
 * Woorden die een echte vergelijking aankondigen.
 *
 * Bewust klein en bewust zonder "beste": "de beste dakdekker in Apeldoorn" is
 * een koopvraag en geen vergelijking, en dat is precies de vraag waarop een
 * dienstpagina hoort te winnen.
 */
const VERGELIJKWOORDEN = [
  "vergelijk",
  "vergelijking",
  "verschil",
  "verschillen",
  "versus",
  " vs ",
  "of juist",
  "welke soort",
  "welk type",
  "voor- en nadelen",
  "voordelen en nadelen",
];

function alleTekst(k: TypeKandidaat): string {
  return [k.title, ...k.targets.map((t) => t.text)].join(" ").toLowerCase();
}

/** Hoeveel van de doelvragen echt een vraag zijn. */
export function vraagAandeel(k: TypeKandidaat): number {
  if (k.targets.length === 0) return 0;
  const vragen = k.targets.filter((t) => t.text.trim().endsWith("?")).length;
  return vragen / k.targets.length;
}

/**
 * Onder dit aandeel vraagvorm is een FAQ geen FAQ.
 *
 * De helft en niet alles: een FAQ mag best één doelvraag hebben die als
 * mededeling geformuleerd is ("kosten dakgoot reinigen"), zolang de pagina in
 * de kern vragen beantwoordt. Dezelfde grens als `VRAAGKOPPEN_MAX` in
 * `paginavorm.ts`, die vanaf de andere kant hetzelfde bewaakt: daar mag een
 * gewone pagina hoogstens de helft vraagkoppen hebben.
 */
export const FAQ_VRAAGAANDEEL_MIN = 0.5;

/**
 * Corrigeert één aanbeveling waarvan het type niet bij zijn doelvragen past.
 *
 * Geeft `null` terug als er niets mis is, zodat de aanroeper alleen hoeft te
 * loggen wat er daadwerkelijk veranderd is.
 */
export function corrigeerContentType(k: TypeKandidaat): TypeCorrectie | null {
  // Zonder doelvragen is er niets om tegen te toetsen. Dan het oordeel van het
  // model laten staan: geen bewijs is geen reden om iets recht te zetten
  // (conventie 3).
  if (k.targets.length === 0) return null;

  if (k.type === "faq" && vraagAandeel(k) < FAQ_VRAAGAANDEEL_MIN) {
    return {
      title: k.title,
      van: "faq",
      naar: "article",
      reden: `${Math.round(vraagAandeel(k) * 100)}% van de doelvragen is een vraag`,
    };
  }

  if (k.type === "comparison") {
    const tekst = ` ${alleTekst(k)} `;
    if (!VERGELIJKWOORDEN.some((w) => tekst.includes(w))) {
      return {
        title: k.title,
        van: "comparison",
        naar: "landing",
        reden: "geen van de doelvragen vraagt om een vergelijking",
      };
    }
  }

  return null;
}

/**
 * De hele lijst langs, in dezelfde vorm als `reconcileExistingPageActions()`:
 * de gecorrigeerde aanbevelingen plus wat er is rechtgezet, zodat het rapport
 * kan loggen hoe vaak de instructie tekortschoot.
 */
export function reconcileContentTypes<T extends TypeKandidaat>(
  recommendations: T[],
): { recommendations: T[]; overrides: TypeCorrectie[] } {
  const overrides: TypeCorrectie[] = [];
  const gecorrigeerd = recommendations.map((r) => {
    const correctie = corrigeerContentType(r);
    if (!correctie) return r;
    overrides.push(correctie);
    return { ...r, type: correctie.naar };
  });
  return { recommendations: gecorrigeerd, overrides };
}
