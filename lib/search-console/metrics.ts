/**
 * De rekenkant van het zoekverkeer-scherm.
 *
 * ── WAAROM DIT EEN PURE MODULE IS ───────────────────────────────────────────
 *
 * Alles hier bepaalt een getal dat de klant als bewijs voorgeschoteld krijgt: de
 * CTR, de verandering ten opzichte van vorige periode, welke pagina de zwakste
 * is. Een fout in die rekensom is niet zichtbaar op het scherm, alleen in het
 * gesprek waarin iemand hem gelooft. Conventie 2: rekenkunde hoort in een pure,
 * importeerbare module.
 *
 * ── WAT DE TABEL WÉL EN NIET HEEFT ──────────────────────────────────────────
 *
 * `search_console_days` bevat per rij: `profile_id`, `day`, `page`, `clicks`,
 * `impressions`, `position`. Wat er **niet** in zit: zoekopdrachten, apparaten,
 * landen. Elk voorstel voor een zoekwoordgrafiek loopt daarom op niets uit tot
 * de koppeling uitgebreid wordt; dat is een eigen bouwronde met een nieuwe
 * tabel, geen schermwerk.
 *
 * ── DRIE REGELS DIE DE CIJFERS EERLIJK HOUDEN ───────────────────────────────
 *
 * 1. **De gemiddelde positie is gewogen op vertoningen**, niet op dagen. Een dag
 *    met 3 vertoningen op positie 1 en een dag met 300 op positie 40 is geen
 *    gemiddelde van 20,5. Google rekent zelf ook zo.
 * 2. **Delen door nul geeft `null`, nooit 0.** Nul vertoningen betekent dat de
 *    CTR onbekend is en niet dat hij nul is (conventie 3). Een pagina met 0 van
 *    0 naast een pagina met 0 van 800 zetten en allebei "0%" noemen, is de
 *    verkeerde conclusie bij de eerste.
 * 3. **De laatste twee dagen zijn niet definitief.** Google corrigeert die nog
 *    na (`window.ts`, `VERTRAGING_DAGEN`). Ze tellen mee, maar het scherm
 *    markeert ze, anders leest een dip van gisteren als een probleem.
 */
import { VERTRAGING_DAGEN } from "./window";

/** Eén rij uit `search_console_days`. */
export interface GscDag {
  day: string;
  page: string;
  clicks: number;
  impressions: number;
  position: number | null;
}

export interface Kerncijfers {
  clicks: number;
  impressions: number;
  /** Klikken gedeeld door vertoningen, 0 tot 1. `null` bij nul vertoningen. */
  ctr: number | null;
  /** Gewogen op vertoningen. `null` als er niets te wegen valt. */
  position: number | null;
}

export const LEGE_KERNCIJFERS: Kerncijfers = {
  clicks: 0,
  impressions: 0,
  ctr: null,
  position: null,
};

/** Klikken gedeeld door vertoningen. Nul vertoningen is onbekend, geen 0%. */
export function ctr(clicks: number, impressions: number): number | null {
  return impressions > 0 ? clicks / impressions : null;
}

/**
 * De gemiddelde positie, gewogen op vertoningen.
 *
 * Rijen zonder positie tellen niet mee in teller én noemer. Ze wegstrepen als 0
 * zou de positie kunstmatig naar voren trekken, en een positie 0 bestaat niet.
 */
export function gewogenPositie(rijen: GscDag[]): number | null {
  let som = 0;
  let gewicht = 0;
  for (const r of rijen) {
    if (r.position === null || r.impressions <= 0) continue;
    som += r.position * r.impressions;
    gewicht += r.impressions;
  }
  return gewicht > 0 ? som / gewicht : null;
}

export function totalen(rijen: GscDag[]): Kerncijfers {
  const clicks = rijen.reduce((s, r) => s + r.clicks, 0);
  const impressions = rijen.reduce((s, r) => s + r.impressions, 0);
  return { clicks, impressions, ctr: ctr(clicks, impressions), position: gewogenPositie(rijen) };
}

// ── Vensters ────────────────────────────────────────────────────────────────

export interface Venster {
  /** ISO-datum, inclusief. */
  start: string;
  /** ISO-datum, inclusief. */
  eind: string;
}

/** Ligt deze dag binnen het venster? Beide grenzen tellen mee. */
export function inVenster(day: string, venster: Venster): boolean {
  return day >= venster.start && day <= venster.eind;
}

/** Het even lange venster dat direct vóór dit venster ligt. */
export function vorigVenster(venster: Venster): Venster {
  const dagen = dagenTussen(venster.start, venster.eind);
  const eind = verschuif(venster.start, -1);
  return { start: verschuif(eind, -(dagen - 1)), eind };
}

export interface Vergelijking {
  nu: Kerncijfers;
  vorige: Kerncijfers;
  /**
   * Is het vorige venster volledig gedekt door data? `false` zolang de
   * vroegste dag die we hebben ná het begin van het vorige venster ligt: dan
   * is "0 klikken toen" geen meting maar een gat, en zou elk verschil een
   * schijnstijging zijn ter grootte van `nu` zelf (plan analytics-herontwerp.md,
   * V5). Het scherm toont dan "eerste volledige periode" in plaats van een
   * pijl.
   */
  vergelijkbaar: boolean;
  /**
   * Het verschil per grootheid. `null` als een van beide onbekend is, óf als
   * het vorige venster niet volledig gedekt is (`vergelijkbaar === false`):
   * een verandering ten opzichte van niets, of ten opzichte van een gat, is
   * geen verandering maar een start (conventie 3).
   *
   * ⚠️ Bij de positie is **lager beter**. Het scherm moet dat weten, want een
   * daling van 14,6 naar 9,2 is een verbetering en hoort een pijl omhoog te
   * krijgen. Vandaar `positieVerbetert` erbij, in plaats van elke aanroepplek
   * dat teken zelf te laten omdraaien.
   */
  verschil: {
    clicks: number | null;
    impressions: number | null;
    ctr: number | null;
    position: number | null;
    positieVerbetert: boolean | null;
  };
}

/**
 * Dit venster naast het vorige, even lange venster.
 *
 * Bewust het vórige venster en niet dezelfde periode vorig jaar: daarvoor is
 * twaalf maanden Google-data nodig en die is er niet. Zodra die er wel is, is
 * dat een eigen keuze en geen automatische uitbreiding.
 */
export function vergelijk(rijen: GscDag[], venster: Venster): Vergelijking {
  const vorige = vorigVenster(venster);
  const nu = totalen(rijen.filter((r) => inVenster(r.day, venster)));
  const toen = totalen(rijen.filter((r) => inVenster(r.day, vorige)));

  // De vroegste dag die we ooit ontvingen: ligt die ná het begin van het
  // vorige venster, dan is dat venster gedeeltelijk een gat en geen meting.
  const volledig = volledigVenster(rijen);
  const vergelijkbaar = volledig !== null && volledig.start <= vorige.start;

  const ctrVerschil = nu.ctr !== null && toen.ctr !== null ? nu.ctr - toen.ctr : null;
  const posVerschil =
    nu.position !== null && toen.position !== null ? nu.position - toen.position : null;

  return {
    nu,
    vorige: toen,
    vergelijkbaar,
    verschil: {
      clicks: vergelijkbaar ? nu.clicks - toen.clicks : null,
      impressions: vergelijkbaar ? nu.impressions - toen.impressions : null,
      ctr: vergelijkbaar ? ctrVerschil : null,
      position: vergelijkbaar ? posVerschil : null,
      positieVerbetert: vergelijkbaar && posVerschil !== null ? posVerschil < 0 : null,
    },
  };
}

// ── Series en tabellen ──────────────────────────────────────────────────────

export interface DagPunt {
  day: string;
  clicks: number;
  impressions: number;
  /** Google corrigeert de laatste dagen nog na. Het scherm markeert die. */
  voorlopig: boolean;
}

/**
 * Klikken en vertoningen per dag, opgeteld over alle pagina's.
 *
 * ── WELKE DAGEN "NOG NIET DEFINITIEF" ZIJN, EN WAAROM NIET T.O.V. VANDAAG ───
 *
 * De eerste versie markeerde alles ná `vandaag - VERTRAGING_DAGEN`. Dat leverde
 * altijd nul gemarkeerde dagen op, en terecht: `syncWindow()` haalt bewust niets
 * op ná die grens, dus zo'n dag staat nooit in de database. Een markering die
 * per definitie nooit aangaat is geen waarschuwing maar dode code.
 *
 * Wat wél waar is: Google blijft de recentste dagen bijstellen (`NAWERK_DAGEN`
 * is niet voor niets 10). De **laatste twee dagen die we hebben** zijn dus de
 * minst gezette, ongeacht wanneer je kijkt. Dat is de markering, en die werkt
 * ook als de synchronisatie een week stil heeft gelegen.
 */
export function perDag(rijen: GscDag[]): DagPunt[] {
  const perDatum = new Map<string, { clicks: number; impressions: number }>();
  for (const r of rijen) {
    const bestaand = perDatum.get(r.day) ?? { clicks: 0, impressions: 0 };
    bestaand.clicks += r.clicks;
    bestaand.impressions += r.impressions;
    perDatum.set(r.day, bestaand);
  }
  const oplopend = [...perDatum.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const grensIndex = oplopend.length - VERTRAGING_DAGEN;
  return oplopend.map(([day, v], i) => ({ day, ...v, voorlopig: i >= grensIndex }));
}

export interface PaginaRij {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number | null;
  position: number | null;
  /** Heeft ORBIT ENGINE deze pagina geschreven? */
  vanOns: boolean;
}

/** Per pagina opgeteld over de dagen, aflopend op klikken. */
export function perPagina(rijen: GscDag[], onzeUrls: Set<string> = new Set()): PaginaRij[] {
  const perUrl = new Map<string, GscDag[]>();
  for (const r of rijen) {
    const lijst = perUrl.get(r.page) ?? [];
    lijst.push(r);
    perUrl.set(r.page, lijst);
  }
  return [...perUrl.entries()]
    .map(([page, groep]) => {
      const t = totalen(groep);
      return { page, ...t, vanOns: onzeUrls.has(normaliseerUrl(page)) };
    })
    .sort((a, b) => b.clicks - a.clicks);
}

/**
 * Onder hoeveel vertoningen zeggen de cijfers van een pagina niets?
 *
 * Vijftig. Een pagina met 3 vertoningen en 0 klikken heeft een CTR van 0%, en
 * die als "zwakste pagina" aanwijzen stuurt de klant een herschrijving in op
 * grond van drie waarnemingen. Dat is precies de schijnprecisie die
 * `docs/ux-design.md` verbiedt.
 */
export const MINIMUM_VERTONINGEN = 50;

export interface BesteEnZwakste {
  beste: PaginaRij | null;
  /**
   * Veel gezien, weinig geklikt: de pagina die een herschrijving verdient. Niet
   * "de pagina met de minste klikken", want dat is meestal gewoon een pagina
   * waar niemand naar zoekt, en daar helpt herschrijven niet aan.
   */
  zwakste: PaginaRij | null;
}

export function besteEnZwakste(paginas: PaginaRij[]): BesteEnZwakste {
  const beste = paginas.length > 0 ? paginas[0] : null;

  const kandidaten = paginas.filter(
    (p) => p.impressions >= MINIMUM_VERTONINGEN && p.ctr !== null && p.page !== beste?.page,
  );
  if (kandidaten.length === 0) return { beste, zwakste: null };

  const zwakste = kandidaten.reduce((laagste, p) =>
    (p.ctr ?? 1) < (laagste.ctr ?? 1) ? p : laagste,
  );
  return { beste, zwakste };
}

// ── Klikken per paginatype ──────────────────────────────────────────────────

/**
 * ⚠️ ER ZIJN TWEE WOORDENLIJSTEN VOOR "SOORT PAGINA", EN DIT BLOK GEBRUIKT ER ÉÉN.
 *
 * Nagerekend op productie op 17 augustus 2026:
 *
 *   `planned_pages.page_type`  informatief (131), categorie (67), dienst (66)
 *   `content_pieces.type`      landing (18), article (15), faq (2)
 *
 * Twee onafhankelijke vocabulaires voor hetzelfde begrip. Dit blok gebruikt
 * **`planned_pages.page_type`**, en het blok Contentmix op Overzicht gebruikt
 * dezelfde as. Reden: dat is de as waarop het contentplan zelf verdeelt, en dus
 * de as waarop een conclusie ook een handeling oplevert. Zie je dat "dienst"
 * driemaal zoveel klikken oplevert als "informatief", dan kun je het plan van
 * volgend jaar daarop bijsturen. Bij `landing` tegenover `article` kun je dat
 * niet, want daar stuurt niets op.
 *
 * Twee schermen die "per paginatype" zeggen en iets anders tellen is precies de
 * fout die deze bouwronde opruimt.
 */
export interface TypeKlikken {
  type: string;
  clicks: number;
  impressions: number;
  paginas: number;
}

/**
 * Klikken per paginatype.
 *
 * `typePerUrl` komt uit `planned_pages` (`url_path`/`posted_url` naar
 * `page_type`). Pagina's die niet in het plan staan, tellen niet mee: die heeft
 * ORBIT ENGINE niet geschreven, en er hangt dus geen paginatype aan.
 */
export function klikkenPerType(
  paginas: PaginaRij[],
  typePerUrl: Map<string, string>,
): TypeKlikken[] {
  const per = new Map<string, TypeKlikken>();
  for (const p of paginas) {
    const type = typePerUrl.get(normaliseerUrl(p.page));
    if (!type) continue;
    const bestaand = per.get(type) ?? { type, clicks: 0, impressions: 0, paginas: 0 };
    bestaand.clicks += p.clicks;
    bestaand.impressions += p.impressions;
    bestaand.paginas += 1;
    per.set(type, bestaand);
  }
  return [...per.values()].sort((a, b) => b.clicks - a.clicks);
}

/**
 * Adressen vergelijkbaar maken.
 *
 * Google levert volledige URL's ("https://voorbeeld.nl/dienst/x/"), het plan
 * bewaart paden ("/dienst/x"). Zonder deze normalisatie matcht er niets en
 * lijkt élke pagina er een van buiten het plan.
 */
export function normaliseerUrl(url: string): string {
  let pad = url.trim();
  pad = pad.replace(/^https?:\/\/[^/]+/i, "");
  pad = pad.split("?")[0].split("#")[0];
  if (!pad.startsWith("/")) pad = `/${pad}`;
  if (pad.length > 1 && pad.endsWith("/")) pad = pad.slice(0, -1);
  return pad.toLowerCase();
}

// ── Datumhulp ───────────────────────────────────────────────────────────────

/** Een ISO-datum een aantal dagen op of terug. */
export function verschuif(iso: string, dagen: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dagen);
  return d.toISOString().slice(0, 10);
}

/** Aantal dagen in een venster, beide grenzen meegeteld. */
export function dagenTussen(start: string, eind: string): number {
  const ms = new Date(`${eind}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime();
  return Math.round(ms / 86400000) + 1;
}

/** Het venster dat de dagen in de database beslaan. `null` als er niets is. */
export function volledigVenster(rijen: GscDag[]): Venster | null {
  if (rijen.length === 0) return null;
  const dagen = rijen.map((r) => r.day).sort();
  return { start: dagen[0], eind: dagen[dagen.length - 1] };
}
