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
 * De totalen van het programma, als één zin onder het hoofdcijfer.
 *
 * ── WAAROM GEEN RIJ VAN VIER CIJFERS MEER (UX-AUDIT 23 SEPTEMBER 2026, P1.1) ──
 *
 * Hier stonden vier grote tellingen ("Clusters actief", "Pagina's geschreven",
 * "Pagina's geoptimaliseerd", "Gepubliceerd") met een kop "Sinds start ORBIT
 * ENGINE". De maandbalk op hetzelfde scherm telt sinds 23 september 2026 ook
 * "geschreven" en "live", maar dan over deze kalendermaand. Twee getallen voor
 * hetzelfde woord op één scherm laten de klant rekenen welke de echte is, en
 * vier grote cijfers duwden het enige waar hij iets mee kan (de wachtrij) onder
 * de vouw.
 *
 * De totalen blijven, omdat ze het antwoord zijn op "wat heeft het tot nu toe
 * opgeleverd". Maar als één zin in de leeskleur, zodat het hoofdcijfer het
 * enige grote getal op het scherm is.
 *
 * Het aantal clusters is de uitzondering: dat is een stand van NU en geen
 * opbrengst, dus staat het apart vooraan ("3 clusters actief"). Geen enkel
 * getal draagt een vergelijking met een vorige periode; dit zijn standen en
 * totalen, geen metingen.
 *
 * Puur, dus testbaar (conventie 2).
 */
export function totalenZin({
  clusters,
  geschreven,
  geoptimaliseerd,
  gepubliceerd,
}: {
  /** Actieve clusters van dit merk. Gearchiveerde tellen niet mee (migratie 0044). */
  clusters: number;
  /** Nieuwe pagina's die ORBIT ENGINE ooit voor dit merk schreef. */
  geschreven: number;
  /** Verbeteringen aan bestaande pagina's die ORBIT ENGINE ooit schreef. */
  geoptimaliseerd: number;
  /** Wat daarvan live staat, uit `content_pieces.published_at`. */
  gepubliceerd: number;
}): string {
  const actief = clusters === 1 ? "1 cluster actief" : `${clusters} clusters actief`;
  if (geschreven === 0 && geoptimaliseerd === 0) {
    return `${actief}. Er is nog geen pagina geschreven.`;
  }
  const delen = [
    geschreven === 1 ? "1 nieuwe pagina geschreven" : `${geschreven} nieuwe pagina's geschreven`,
    geoptimaliseerd === 1 ? "1 bestaande bijgewerkt" : `${geoptimaliseerd} bestaande bijgewerkt`,
  ];
  const live = gepubliceerd === 0 ? "nog niets live" : `${gepubliceerd} live op je site`;
  return `${actief}. Sinds de start: ${delen.join(", ")}, ${live}.`;
}
