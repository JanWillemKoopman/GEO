/**
 * De tekstbeslissingen van de startpagina.
 *
 * ── WAAROM DIT EEN EIGEN MODULE IS ──────────────────────────────────────────
 *
 * `/merk/[id]` is sinds 17 augustus 2026 de bestemming na inloggen
 * (`app/page.tsx`). Het is dus niet een scherm dat je opzoekt, maar het scherm
 * dat je élke sessie als eerste ziet. Dat maakt van een paar zinnen die eruitzien
 * als opmaak juist de kern: of dit bezoek iets nieuws oplevert, en of het scherm
 * in maand 1 iets te vertellen heeft of alleen nullen toont.
 *
 * Die beslissingen zijn tellingen en datumvergelijkingen, en een fout erin is op
 * het scherm onzichtbaar: "de volgende meting draait op 1 september" ziet er
 * precies zo uit als "op 1 oktober". Conventie 2: puur, dus testbaar.
 */

/**
 * De meetronde draait maandelijks op de eerste, om 06:00 UTC
 * (`vercel.json`, `0 6 1 * *`). Dat cijfer staat op twee plekken en dit is de
 * plek waar het scherm hem vandaan haalt; verandert de cron, dan verandert
 * deze functie mee.
 */
export function volgendeMeting(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 6, 0, 0));
}

/** "1 september", zonder jaar: de volgende ronde is altijd binnen een maand. */
function dagEnMaand(d: Date): string {
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", timeZone: "UTC" });
}

export interface VersheidInput {
  /** Hoeveel meetrondes er tot nu toe zijn. */
  metingen: number;
  /** Wanneer de nieuwste ronde doorgerekend werd. */
  gemetenOp: string | null;
  now: Date;
}

/**
 * De regel onder de merknaam: is dit bezoek nieuws, en wanneer wordt het dat.
 *
 * ── ⚠️ DIT VERVANGT EEN INHOUDSOPGAVE ───────────────────────────────────────
 *
 * Er stond "Hoe zichtbaar je bent in AI-antwoorden, wat er op je wacht en waar
 * je begint": een opsomming van de blokken eronder, die op elk bezoek hetzelfde
 * zei. Wie hier wekelijks binnenkomt terwijl er maandelijks gemeten wordt, zag
 * vier keer achter elkaar dezelfde 57% zonder te kunnen zien dát het dezelfde
 * meting was. Deze regel zegt dat wel, en kost geen extra query: de meetdatum
 * staat al in `visibility_scores.computed_at`.
 */
export function versheidsregel({ metingen, gemetenOp, now }: VersheidInput): string {
  const volgende = dagEnMaand(volgendeMeting(now));
  if (metingen === 0 || !gemetenOp) {
    return `ORBIT ENGINE heeft je merk in kaart. De eerste meting draait op ${volgende}.`;
  }
  const gemeten = dagEnMaand(new Date(gemetenOp));
  if (metingen === 1) {
    return `Je nulmeting is van ${gemeten}. Op ${volgende} draait de tweede, en dan staat hier je eerste vergelijking.`;
  }
  return `Je nieuwste meting is van ${gemeten}. De volgende draait op ${volgende}.`;
}

/**
 * Staat dit merk nog in zijn eerste maand?
 *
 * ── ⚠️ WAAROM DIT EEN EIGEN STAAT IS EN GEEN LEEG DASHBOARD ─────────────────
 *
 * Bij één meting valt er niets te vergelijken, en zonder contentplan staat er
 * niets in de planning. Het scherm toonde dan nog steeds alle blokken: drie
 * mijlpalen op nul, vier voortgangsbalken op nul en een ingeklapt blok zonder
 * inhoud. Dat is het allereerste beeld dat een betalende klant van het product
 * krijgt, en het meldt vooral wat er nog niet is.
 *
 * De verdiepingslaag komt terug zodra hij iets te zeggen heeft: bij een tweede
 * meting, of zodra er een plan staat.
 */
export function isEersteMaand({
  metingen,
  geplandePaginas,
}: {
  metingen: number;
  geplandePaginas: number;
}): boolean {
  return metingen <= 1 && geplandePaginas === 0;
}

/**
 * Wat het contentplan over zichzelf zegt.
 *
 * ── ⚠️ DE TEGENSPRAAK DIE DIT OPLOST ────────────────────────────────────────
 *
 * Op één scherm stond "1 · Pagina gepubliceerd" (uit `content_pieces`) en zeven
 * centimeter lager "Nog geen van je 120 geplande pagina's staat live" (uit
 * `planned_pages`). Allebei waar, want het zijn twee verschillende verzamelingen:
 * de eerste pagina van Gasservice Brabant is geschreven vóórdat het contentplan
 * bestond en hangt dus aan geen enkele planregel. Voor de klant zijn het twee
 * tellingen van hetzelfde ding die elkaar tegenspreken, en dan gelooft hij
 * geen van beide.
 *
 * Deze functie zegt daarom expliciet waar de tellingen over gaan, en benoemt
 * het verschil in plaats van het te laten raden.
 */
export function planRegels({
  gepland,
  geplaatst,
  gepubliceerdTotaal,
}: {
  gepland: number;
  geplaatst: number;
  /** Alle live pagina's van dit merk, ook die buiten het plan om geschreven zijn. */
  gepubliceerdTotaal: number;
}): string[] {
  const regels: string[] = [];

  regels.push(
    geplaatst === 0
      ? `Van je ${gepland} geplande pagina's staat er nog geen live.`
      : `${geplaatst} van je ${gepland} geplande pagina's staan live.`,
  );

  const buiten = gepubliceerdTotaal - geplaatst;
  if (buiten > 0) {
    regels.push(
      buiten === 1
        ? "Daarnaast staat er één pagina live die van vóór dit plan is. Die telt wel mee in het cijfer bovenaan."
        : `Daarnaast staan er ${buiten} pagina's live die van vóór dit plan zijn. Die tellen wel mee in het cijfer bovenaan.`,
    );
  }

  return regels;
}

/**
 * De vier cijfers boven aan de startpagina.
 *
 * ── ⚠️ WAAROM HET ZICHTBAARHEIDSPERCENTAGE HIER NIET MEER STAAT ─────────────
 *
 * Tot 25 augustus 2026 droeg deze kaart het hoofdgetal van het merk: "57%", met
 * de marge, het verschil en het verloop eromheen. Besloten op 26 augustus 2026:
 * dat cijfer verhuist naar Analytics en de startpagina toont in plaats daarvan
 * de omvang van het programma. De reden is de vraag die een klant bij het
 * inloggen stelt: niet "wat is mijn score" maar "wat loopt er voor mij, en wat
 * staat er klaar". De score zelf blijft één klik weg (de knop ernaast) en staat
 * nog steeds in woorden in de duiding eronder (`lib/insights.ts`).
 *
 * ── ⚠️ VIER TELLINGEN, GEEN VERGELIJKING ────────────────────────────────────
 *
 * Bewust geen verschil met een vorige periode. Deze vier zijn standen en geen
 * metingen: het aantal clusters verandert als de eigenaar er een aanzet, niet
 * doordat er iets gemeten is. Een groeipercentage erop plakken zou beweging
 * suggereren waar een besluit zit. De duiding over de tijd hoort bij de score,
 * en die staat in de drie zinnen eronder.
 *
 * ── DE TWEE VOORSTELTELLINGEN KOMEN UIT DE KANSENLIJST ──────────────────────
 *
 * `nieuwe_pagina` en `pagina_bijwerken` zijn precies de twee handelingen die uit
 * een rapport van een cluster komen (`lib/opportunities.ts`). Ze tellen ALLE
 * kansen en niet alleen de zes die het scherm toont, want de vraag is hoeveel
 * werk er klaarligt en niet hoeveel er in beeld past.
 *
 * Puur, dus testbaar (conventie 2).
 */
export interface OverzichtCijfer {
  /** Het getal, groot. Altijd een telling. */
  waarde: string;
  /** Waar het over gaat. */
  label: string;
  /**
   * Eén korte regel eronder. Nooit een claim over groei.
   *
   * ⚠️ Hooguit 23 tekens, bewaakt door `scripts/test-unit.ts`. Vier kolommen op
   * een kaart van 940 pixels, waarvan er drie ook nog een scheidingslijn met
   * inspringing dragen, houden er per kolom zo'n 190 over. Een toelichting die
   * over twee regels valt maakt de rij rafelig en de kolommen ongelijk hoog, en
   * dat gebeurt alleen in de smalste drie: dan lijkt het een fout.
   */
  detail: string;
}

export function overzichtCijfers({
  gepubliceerd,
  clusters,
  nieuwePaginas,
  optimalisaties,
}: {
  /** Pagina's die live staan, uit `content_pieces.published_at`. */
  gepubliceerd: number;
  /** Actieve clusters van dit merk. Gearchiveerde tellen niet mee (migratie 0044). */
  clusters: number;
  /** Voorgestelde nieuwe pagina's, over alle clusters. */
  nieuwePaginas: number;
  /** Voorgestelde verbeteringen aan bestaande pagina's, over alle clusters. */
  optimalisaties: number;
}): OverzichtCijfer[] {
  return [
    {
      waarde: String(gepubliceerd),
      label: gepubliceerd === 1 ? "Pagina gepubliceerd" : "Pagina's gepubliceerd",
      detail: gepubliceerd === 0 ? "Nog geen pagina live" : "Live op je site",
    },
    {
      waarde: String(clusters),
      label: clusters === 1 ? "Cluster actief" : "Clusters actief",
      detail: clusters === 0 ? "Nog niets gemeten" : "Actief in de meting",
    },
    {
      waarde: String(nieuwePaginas),
      label: nieuwePaginas === 1 ? "Nieuwe pagina" : "Nieuwe pagina's",
      detail: nieuwePaginas === 0 ? "Geen open voorstellen" : "Nog te schrijven",
    },
    {
      waarde: String(optimalisaties),
      label: optimalisaties === 1 ? "Paginaoptimalisatie" : "Paginaoptimalisaties",
      detail: optimalisaties === 0 ? "Geen open voorstellen" : "Voor bestaande pagina's",
    },
  ];
}
