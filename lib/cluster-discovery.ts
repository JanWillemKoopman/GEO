/**
 * De rekenkunde van "Clusters ontdekken" (docs/tasks/clusters-ontdekken.md).
 *
 * Alles wat een ontdekkingsronde beslist ZONDER een AI-model staat hier: welke
 * domeinen echte concurrenten zijn, welke zoektermen varianten van elkaar zijn,
 * welke termen het schiften überhaupt halen, wat voor soort kans een kandidaat
 * is, hoe zwaar hij weegt en welke zinnen er op de kaart staan.
 *
 * ── WAAROM DIT ALLEMAAL IN CODE STAAT EN NIET IN DE PROMPT ─────────────────
 *
 * De proefronde van 23 september 2026 liet drie fouten zien die een model
 * graag maakt en een regel niet:
 *
 *   1. Google noemt eerst portalen als concurrent (viabovag.nl, 59.165
 *      zoektermen tegen 2.423 van udenhout.nl). Hun zoektermen zijn "kenteken
 *      checken" en "bmw": 24% raakt het aanbod, tegen ruim 80% bij echte
 *      dealergroepen. Een omvangsregel scheidt die twee zonder aanroep.
 *   2. Google Ads telt varianten als één term: "private lease occasion" en
 *      "occasion private lease" hebben allebei 22.200. Wie ze apart optelt,
 *      telt dezelfde vraag zes keer.
 *   3. Een model dat zoektermen bundelt, verzint er af en toe één bij. Die
 *      krijgt dan een volume van nul en ziet eruit als bewijs.
 *
 * Conventie 1: elke promptinstructie heeft hier zijn vangnet. Conventie 3:
 * een onbekend volume is `null`, nooit 0.
 *
 * Puur en zonder `server-only` (conventie 2), getest in `scripts/test-unit.ts`.
 */

// ── Concurrenten ────────────────────────────────────────────────────────────

/**
 * Hoeveel keer groter dan het eigen domein een concurrent mag zijn.
 *
 * Nagemeten op 23 september 2026: dealergroepen rond udenhout.nl zitten op
 * 2 tot 12 keer (pouw.nl 6.319, broekhuis.nl 28.910 tegen 2.423), de eerste
 * portalen op 24 keer en hoger (viabovag.nl 59.165, autotrack.nl 69.814). 15
 * ligt ertussen met ruimte aan beide kanten.
 */
export const MAX_OMVANG_FACTOR = 15;

/**
 * En hoeveel keer kleiner. Een domein met een tiende van de eigen omvang dat
 * toch overlapt is meestal een losse vestigingssite of een blog, geen
 * concurrent waar iets van te leren valt.
 */
export const MIN_OMVANG_FACTOR = 0.1;

/**
 * Domeinen die in bijna elke markt bovenaan staan zonder concurrent te zijn.
 * De omvangsregel vangt de meeste al; deze lijst vangt wat daartussendoor glipt
 * (een kleine vergelijker, een regionale nieuwssite).
 */
export const GEEN_CONCURRENT = [
  "marktplaats.nl",
  "autoscout24.nl",
  "gaspedaal.nl",
  "autotrack.nl",
  "anwb.nl",
  "rdw.nl",
  "independer.nl",
  "wikipedia.org",
  "youtube.com",
  "google.com",
  "google.nl",
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "tiktok.com",
  "reddit.com",
  "werkspot.nl",
  "thuisbezorgd.nl",
  "bol.com",
  "amazon.nl",
  "trustpilot.com",
  "kieskeurig.nl",
  "tweakers.net",
];

export interface ConcurrentDomein {
  domein: string;
  /** Aantal zoektermen waarop dit domein in Google staat. `null` = onbekend. */
  omvang: number | null;
  /** Aantal zoektermen dat het deelt met het eigen domein. */
  overlap: number | null;
}

function kaalDomein(d: string): string {
  return d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
}

/**
 * De echte concurrenten uit de lijst die Google teruggeeft, in de volgorde van
 * de meeste overlap.
 *
 * Een domein zonder bekende omvang valt af: dan valt de omvangsregel niet toe
 * te passen, en een portaal doorlaten kost meer dan een dealer missen.
 */
export function kiesConcurrenten(
  kandidaten: ConcurrentDomein[],
  eigenDomein: string,
  eigenOmvang: number | null,
  max = 3,
): ConcurrentDomein[] {
  const eigen = kaalDomein(eigenDomein);
  return kandidaten
    .map((k) => ({ ...k, domein: kaalDomein(k.domein) }))
    .filter((k) => k.domein && k.domein !== eigen && !k.domein.endsWith(`.${eigen}`))
    .filter((k) => !GEEN_CONCURRENT.some((g) => k.domein === g || k.domein.endsWith(`.${g}`)))
    .filter((k) => {
      if (k.omvang === null || eigenOmvang === null || eigenOmvang <= 0) return false;
      const factor = k.omvang / eigenOmvang;
      return factor <= MAX_OMVANG_FACTOR && factor >= MIN_OMVANG_FACTOR;
    })
    .sort((a, b) => (b.overlap ?? 0) - (a.overlap ?? 0))
    .slice(0, max);
}

// ── Zoektermen ──────────────────────────────────────────────────────────────

export type TermBron = "eigen" | "gsc" | "concurrent" | "suggestie";

export interface OntdekTerm {
  keyword: string;
  /** Maandvolume in Google (DataForSEO). `null` = onbekend, niet nul. */
  volume: number | null;
  bronnen: TermBron[];
  /** Beste eigen positie, uit Search Console of DataForSEO. */
  eigenPositie: number | null;
  eigenUrl: string | null;
  /** Uit Search Console, laatste 90 dagen. `null` = niet in Search Console. */
  vertoningen: number | null;
  klikken: number | null;
  /** De beste concurrentpositie in de top 20, als die er is. */
  concurrent: { domein: string; positie: number } | null;
}

/**
 * Wanneer zijn twee zoektermen voor Google Ads dezelfde? Zelfde woorden, andere
 * volgorde, andere leestekens. "private lease occasion" en "occasion private
 * lease" worden allebei "lease occasion private".
 */
export function variantSleutel(keyword: string): string {
  return keyword
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

function beterePositie(a: number | null, b: number | null): number | null {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}

function som(a: number | null, b: number | null): number | null {
  if (a === null && b === null) return null;
  return (a ?? 0) + (b ?? 0);
}

/**
 * Varianten samenvoegen tot één term. De schrijfwijze met het hoogste volume
 * blijft staan. Het volume wordt NIET opgeteld maar het hoogste genomen: het is
 * dezelfde zoekvraag, en optellen zou hem dubbel tellen. Vertoningen en klikken
 * uit Search Console zijn wél echt verschillende gebeurtenissen en worden
 * opgeteld.
 */
export function voegVariantenSamen(termen: OntdekTerm[]): OntdekTerm[] {
  const groepen = new Map<string, OntdekTerm>();
  for (const t of termen) {
    const sleutel = variantSleutel(t.keyword);
    if (!sleutel) continue;
    const bestaand = groepen.get(sleutel);
    if (!bestaand) {
      groepen.set(sleutel, { ...t, bronnen: [...new Set(t.bronnen)] });
      continue;
    }
    const nieuwWint = (t.volume ?? -1) > (bestaand.volume ?? -1);
    const eigenPositie = beterePositie(bestaand.eigenPositie, t.eigenPositie);
    const concurrent =
      !bestaand.concurrent ? t.concurrent
      : !t.concurrent ? bestaand.concurrent
      : t.concurrent.positie < bestaand.concurrent.positie ? t.concurrent : bestaand.concurrent;
    groepen.set(sleutel, {
      keyword: nieuwWint ? t.keyword : bestaand.keyword,
      volume:
        bestaand.volume === null && t.volume === null
          ? null
          : Math.max(bestaand.volume ?? 0, t.volume ?? 0),
      bronnen: [...new Set([...bestaand.bronnen, ...t.bronnen])],
      eigenPositie,
      eigenUrl:
        eigenPositie !== null && eigenPositie === t.eigenPositie && t.eigenUrl
          ? t.eigenUrl
          : bestaand.eigenUrl ?? t.eigenUrl,
      vertoningen: som(bestaand.vertoningen, t.vertoningen),
      klikken: som(bestaand.klikken, t.klikken),
      concurrent,
    });
  }
  return [...groepen.values()];
}

/** Langer dan dit is geen zoekterm maar een zin; DataForSEO weigert ze ook (logboek 19 september 2026). */
export const MAX_WOORDEN = 10;

/**
 * Onder dit volume is een term ruis, tenzij Search Console hem kent: dan heeft
 * de eigen site hem echt vertoond, en dat is sterker bewijs dan een volume.
 */
export const MIN_VOLUME = 20;

/**
 * Hoeveel termen er hoogstens het schiften in gaan. Eén aanroep op het lichte
 * model (conventie 7); daarboven wordt de lijst te lang om per term zorgvuldig
 * te beoordelen.
 */
export const MAX_TERMEN_SCHIFTEN = 400;

/**
 * Welk deel van de plekken in het schiften elke bron minstens krijgt.
 *
 * ⚠️ Nagerekend op 23 september 2026 op de echte data van udenhout.nl: puur op
 * volume sorteren gaf de zoektermen van concurrenten 220 van de 400 plekken,
 * want daar zitten brede termen als "volkswagen" (110.000 per maand) tussen.
 * De termen waar de eigen site al op plek 4 tot 20 staat, de snelste winst,
 * kregen er 60. Met een vast deel per bron kan één bron de rest niet meer
 * verdringen; wat een bron niet gebruikt, gaat naar de rest op volume.
 */
export const AANDEEL_PER_BRON: Record<TermBron, number> = {
  gsc: 0.4,
  eigen: 0.25,
  concurrent: 0.2,
  suggestie: 0.15,
};

/** De bron die een samengevoegde term vertegenwoordigt: het sterkste bewijs eerst. */
function hoofdbron(t: OntdekTerm): TermBron {
  for (const b of ["gsc", "eigen", "concurrent", "suggestie"] as const) if (t.bronnen.includes(b)) return b;
  return "suggestie";
}

function bewijsWaarde(t: OntdekTerm): number {
  return hoofdbron(t) === "gsc" ? (t.vertoningen ?? 0) : (t.volume ?? 0);
}

// ── Het thema van een ronde ─────────────────────────────────────────────────

/** Een thema is een productcategorie of onderwerp, geen zin. */
export const THEMA_MIN = 3;
export const THEMA_MAX = 80;

/** Het thema zoals de route het opslaat, of `null` als het niet bruikbaar is. */
export function schoonThema(invoer: unknown): string | null {
  if (typeof invoer !== "string") return null;
  const t = invoer.replace(/\s+/g, " ").trim();
  if (t.length < THEMA_MIN || t.length > THEMA_MAX) return null;
  return t;
}

/** Woorden die in een thema staan zonder iets over het onderwerp te zeggen. */
const THEMA_VULWOORDEN = new Set([
  "de", "het", "een", "en", "voor", "van", "in", "op", "bij", "met", "aan", "over", "naar",
  "alles", "rond", "rondom", "thema",
]);

/**
 * Kleine letters, zonder accenten, en dubbele klinkers enkel: "laadpaal" en
 * "laadpalen" worden "ladpal" en "ladpalen", zodat de ene de andere vindt.
 */
function themaVorm(tekst: string): string {
  return tekst
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/([aeiou])\1/g, "$1");
}

/**
 * De stammen van de woorden in het thema, om zoektermen binnen het thema te
 * herkennen zonder model. De laatste twee letters gaan eraf (vier blijven er
 * minstens), zodat "occasions" ook "occasion" vindt en "laadpalen" ook
 * "laadpaal thuis".
 */
export function themaStammen(thema: string | null): string[] {
  if (!thema) return [];
  return [
    ...new Set(
      themaVorm(thema)
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !THEMA_VULWOORDEN.has(w))
        .map((w) => (w.length <= 4 ? w : w.slice(0, Math.max(4, w.length - 2)))),
    ),
  ];
}

/** Het deel van een aanbodknoop dat nodig is om thema's voor te stellen. */
export interface AanbodKnoop {
  id: string;
  parent_id: string | null;
  kind: string;
  name: string;
}

/**
 * De thema's die het scherm als keuze aanbiedt: de categorieën uit de
 * aanbodboom waar echt diensten of producten onder hangen ("Lease",
 * "Service en onderhoud"). Een categorie met alleen vestigingen eronder, of de
 * wortel met het hele bedrijf, is geen thema. Zonder zulke categorieën: de
 * diensten zelf. Hooguit `max`, in de volgorde van de boom.
 */
export function themaSuggesties(knopen: AanbodKnoop[], max = 10): string[] {
  const verkoopbaar = (k: AanbodKnoop) => k.kind === "dienst" || k.kind === "product";
  const metAanbod = new Set(knopen.filter(verkoopbaar).map((k) => k.parent_id).filter(Boolean));
  const categorieen = knopen.filter((k) => k.kind === "categorie" && metAanbod.has(k.id)).map((k) => k.name.trim());
  const lijst = categorieen.length > 0 ? categorieen : knopen.filter(verkoopbaar).map((k) => k.name.trim());
  return [...new Set(lijst.filter((n) => n.length >= THEMA_MIN && n.length <= THEMA_MAX))].slice(0, max);
}

/** Raakt deze zoekterm het thema? Zonder thema raakt alles het. */
export function binnenThema(keyword: string, stammen: string[]): boolean {
  if (stammen.length === 0) return true;
  const kl = themaVorm(keyword);
  return stammen.some((s) => kl.includes(s));
}

/**
 * De vaste regels vóór het model: te lang, te weinig gezocht, of een
 * eigen-merkterm (daar is geen cluster voor nodig, die win je al).
 *
 * Wat overblijft wordt per bron gerangschikt (Search Console op vertoningen,
 * de rest op volume) en krijgt per bron zijn deel van de plekken
 * (`AANDEEL_PER_BRON`). Search Console gaat voorop: dat is wat de eigen site
 * echt heeft laten zien.
 *
 * Met een thema gaan binnen elke bron de termen die het thema raken voor.
 * ⚠️ Waarom voorrang en niet weggooien: Search Console, de eigen site en de
 * concurrenten worden per domein opgehaald, over het hele aanbod. Nagerekend
 * op de 1.773 termen van de ronde van 23 september 2026: van de 200 termen
 * over private lease haalden er zonder thema 41 de 400 plekken, met het thema
 * "private lease" 147 (de rest valt af op volume of merknaam). Een thema in
 * andere woorden dan
 * de zoektermen ("tweedehands" tegen "occasion") zou met weggooien alles
 * verliezen; het schiftmodel krijgt het thema en beslist per term.
 */
export function voorfilter(
  termen: OntdekTerm[],
  eigenMerkwoorden: string[],
  max = MAX_TERMEN_SCHIFTEN,
  stammen: string[] = [],
): OntdekTerm[] {
  const merk = eigenMerkwoorden.map((w) => w.toLowerCase().trim()).filter((w) => w.length >= 3);
  const bruikbaar = termen.filter((t) => {
    const woorden = t.keyword.trim().split(/\s+/);
    if (woorden.length === 0 || woorden.length > MAX_WOORDEN) return false;
    const kl = t.keyword.toLowerCase();
    if (merk.some((m) => kl.includes(m))) return false;
    const inGsc = (t.vertoningen ?? 0) > 0;
    return inGsc || (t.volume ?? 0) >= MIN_VOLUME;
  });

  const raakt = (t: OntdekTerm) => (binnenThema(t.keyword, stammen) ? 1 : 0);
  const volgorde = ["gsc", "eigen", "concurrent", "suggestie"] as const;
  const perBron = new Map<TermBron, OntdekTerm[]>(
    volgorde.map((b) => [
      b,
      bruikbaar
        .filter((t) => hoofdbron(t) === b)
        .sort((a, c) => raakt(c) - raakt(a) || bewijsWaarde(c) - bewijsWaarde(a)),
    ]),
  );

  const gekozen: OntdekTerm[] = [];
  const gezien = new Set<OntdekTerm>();
  for (const b of volgorde) {
    for (const t of (perBron.get(b) ?? []).slice(0, Math.floor(max * AANDEEL_PER_BRON[b]))) {
      gekozen.push(t);
      gezien.add(t);
    }
  }
  const rest = bruikbaar
    .filter((t) => !gezien.has(t))
    .sort((a, c) => raakt(c) - raakt(a) || (c.volume ?? 0) - (a.volume ?? 0));
  return [...gekozen, ...rest].slice(0, max);
}

/**
 * Houd alleen termen over die echt in de invoer stonden (conventie 1). Het
 * model mag bundelen, niet verzinnen. Vergelijkt op variantsleutel, zodat een
 * andere woordvolgorde van het model de term niet onterecht laat vallen.
 */
export function alleenBestaandeTermen(
  gekozen: string[],
  invoer: OntdekTerm[],
): OntdekTerm[] {
  const perSleutel = new Map(invoer.map((t) => [variantSleutel(t.keyword), t]));
  const uit: OntdekTerm[] = [];
  const gezien = new Set<string>();
  for (const g of gekozen) {
    const s = variantSleutel(g);
    const t = perSleutel.get(s);
    if (!t || gezien.has(s)) continue;
    gezien.add(s);
    uit.push(t);
  }
  return uit;
}

// ── Kandidaten ──────────────────────────────────────────────────────────────

export type KandidaatSoort = "snelle_winst" | "nieuw_terrein" | "concurrent_voor";

/** Plek 4 tot en met 20: op of net onder de eerste pagina. Dezelfde grens als in het plan. */
export const SNELLE_WINST_VAN = 4;
export const SNELLE_WINST_TOT = 20;

export interface KandidaatFeiten {
  totaalVolume: number | null;
  beste: OntdekTerm | null;
  eigenPositie: number | null;
  eigenUrl: string | null;
  vertoningen: number | null;
  concurrent: { domein: string; positie: number } | null;
}

/**
 * De feiten van een kandidaat, opgeteld door de code en niet door het model.
 *
 * Het totaalvolume is de som over de (al samengevoegde) termen: verschillende
 * zoekvragen over hetzelfde onderwerp tellen wél bij elkaar op.
 */
export function kandidaatFeiten(termen: OntdekTerm[]): KandidaatFeiten {
  let totaal: number | null = null;
  let eigenPositie: number | null = null;
  let eigenUrl: string | null = null;
  let vertoningen: number | null = null;
  let concurrent: KandidaatFeiten["concurrent"] = null;
  for (const t of termen) {
    if (t.volume !== null) totaal = (totaal ?? 0) + t.volume;
    if (t.eigenPositie !== null && (eigenPositie === null || t.eigenPositie < eigenPositie)) {
      eigenPositie = t.eigenPositie;
      eigenUrl = t.eigenUrl;
    }
    if (t.vertoningen !== null) vertoningen = (vertoningen ?? 0) + t.vertoningen;
    if (t.concurrent && (!concurrent || t.concurrent.positie < concurrent.positie)) {
      concurrent = t.concurrent;
    }
  }
  const beste = [...termen].sort((a, b) => (b.volume ?? -1) - (a.volume ?? -1))[0] ?? null;
  return { totaalVolume: totaal, beste, eigenPositie, eigenUrl, vertoningen, concurrent };
}

/**
 * Wat voor kans is dit?
 *
 *   - Snelle winst: je staat al op plek 4 tot 20. Een pagina erbij of een
 *     betere pagina is het kleinste zetje.
 *   - Concurrent is je voor: een echte concurrent staat in de top 20 en jij
 *     niet (of lager dan 20).
 *   - Nieuw terrein: er wordt naar gezocht, maar niemand uit jouw kring staat
 *     er, jij ook niet.
 *
 * Staat de eigen site al in de top 3, dan is er in Google weinig te winnen en
 * valt de kandidaat onder nieuw terrein: de kans zit dan in AI-antwoorden, en
 * de zin op de kaart zegt dat ook (`kaartFeiten`).
 */
export function kandidaatSoort(f: KandidaatFeiten): KandidaatSoort {
  const p = f.eigenPositie;
  if (p !== null && p >= SNELLE_WINST_VAN && p <= SNELLE_WINST_TOT) return "snelle_winst";
  if (f.concurrent && (p === null || p > SNELLE_WINST_TOT)) return "concurrent_voor";
  return "nieuw_terrein";
}

export type Pasvorm = "sterk" | "redelijk";

export interface ScoreOnderdelen {
  vraag: number;
  positie: number;
  concurrent: number;
  pasvorm: number;
  overlap: number;
}

/**
 * Score 0..100 en de onderdelen, voor de volgorde en de uitleg.
 *
 *   vraag       0..40  log10 van het totaalvolume: 100 per maand is 16,
 *                      1.000 is 24, 10.000 is 32, 100.000 is 40. Logaritmisch
 *                      omdat "occasion kopen" (1.900) anders volledig wegvalt
 *                      naast "volkswagen" (110.000), terwijl het eerste een
 *                      koopvraag is en het tweede een merknaam.
 *                      Zonder volume telt Search Console mee: 1 punt per 100
 *                      vertoningen, tot 20.
 *   positie     0..25  plek 4 levert 25, plek 20 levert 5.
 *   concurrent  0..15  een concurrent in de top 3 levert 15, in de top 20 5.
 *   pasvorm     10|20  het oordeel van het schiftmodel.
 *   overlap     0|-30  lijkt op een bestaand cluster: omlaag, niet weg.
 */
export function kandidaatScore(
  f: KandidaatFeiten,
  pasvorm: Pasvorm,
  overlapt: boolean,
): { score: number; onderdelen: ScoreOnderdelen } {
  let vraag = 0;
  if (f.totaalVolume !== null && f.totaalVolume > 0) {
    vraag = Math.min(40, Math.max(0, Math.log10(f.totaalVolume) * 8));
  } else if (f.vertoningen !== null && f.vertoningen > 0) {
    vraag = Math.min(20, f.vertoningen / 100);
  }
  let positie = 0;
  const p = f.eigenPositie;
  if (p !== null && p >= SNELLE_WINST_VAN && p <= SNELLE_WINST_TOT) {
    positie = 25 - ((p - SNELLE_WINST_VAN) / (SNELLE_WINST_TOT - SNELLE_WINST_VAN)) * 20;
  }
  let concurrent = 0;
  if (f.concurrent) concurrent = f.concurrent.positie <= 3 ? 15 : f.concurrent.positie <= 10 ? 10 : 5;
  const pv = pasvorm === "sterk" ? 20 : 10;
  const ov = overlapt ? -30 : 0;
  const onderdelen = {
    vraag: Math.round(vraag),
    positie: Math.round(positie),
    concurrent,
    pasvorm: pv,
    overlap: ov,
  };
  const score = Math.max(
    0,
    Math.min(100, onderdelen.vraag + onderdelen.positie + concurrent + pv + ov),
  );
  return { score, onderdelen };
}

// ── Overlap met wat er al staat ─────────────────────────────────────────────

/** Woorden die in bijna elke titel staan en dus niets zeggen over overlap. */
const VULWOORDEN = new Set([
  "de", "het", "een", "en", "of", "voor", "van", "in", "op", "bij", "met", "je", "jouw",
  "mkb", "bedrijven", "kopen", "regio",
]);

function titelWoorden(titel: string, regio: string[]): Set<string> {
  const plaatsen = new Set(regio.flatMap((r) => r.toLowerCase().split(/[\s-]+/)));
  return new Set(
    titel
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !VULWOORDEN.has(w) && !plaatsen.has(w)),
  );
}

/** Vanaf dit aandeel gedeelde woorden heet het "lijkt op". */
export const OVERLAP_DREMPEL = 0.5;

/**
 * Lijkt deze titel op een bestaand cluster of voorstel? Dan de titel daarvan.
 *
 * Gedeelde woorden gedeeld door de kortste titel, zonder vulwoorden en
 * plaatsnamen: "APK Den Bosch" en "APK in Eindhoven" delen dan "apk", 1 van 1,
 * en dat is terecht dezelfde vraag in een andere stad.
 */
export function lijktOp(titel: string, bestaand: string[], regio: string[] = []): string | null {
  const a = titelWoorden(titel, regio);
  if (a.size === 0) return null;
  let beste: { titel: string; waarde: number } | null = null;
  for (const b of bestaand) {
    const w = titelWoorden(b, regio);
    if (w.size === 0) continue;
    let gedeeld = 0;
    for (const x of a) if (w.has(x)) gedeeld++;
    const waarde = gedeeld / Math.min(a.size, w.size);
    if (waarde >= OVERLAP_DREMPEL && (!beste || waarde > beste.waarde)) beste = { titel: b, waarde };
  }
  return beste?.titel ?? null;
}

/** Vanaf dit aandeel gedeelde zoektermen zijn twee kandidaten uit één ronde hetzelfde onderwerp. */
export const DUBBEL_DREMPEL = 0.5;

/**
 * Welke eerdere kandidaat uit DEZELFDE ronde is dit eigenlijk? Vergelijkt op
 * zoektermen, niet op titel: het aandeel gedeelde termen (op variantsleutel)
 * van de kleinste van de twee.
 *
 * ⚠️ Waarom niet `lijktOp` op de titels, zoals tot 23 september 2026: in de
 * eerste echte ronde (Van den Udenhout) gaf het model 9 kandidaten en bleven
 * er 3 over. "Audi onderhoud en service in de regio" viel weg als dubbel van
 * "Volkswagen onderhoud en service in de regio" (2 van 3 woorden gedeeld),
 * "Zakelijk een auto huren" als dubbel van "Een auto huren voor particulier
 * gebruik". Woorden als "auto", "onderhoud" en "huren" staan in bijna elke
 * titel van een autobedrijf. De zoektermen van die paren deelden 0 of 1 van 3.
 * Twee kandidaten die echt hetzelfde zijn, delen hun bewijs.
 *
 * Voor de vergelijking met clusters die er al staan blijft `lijktOp` op de
 * titel: van een bestaand cluster zijn geen zoektermen bekend, en daar
 * markeert het alleen, het gooit niets weg.
 */
export function dubbelInRonde(termen: OntdekTerm[], eerder: { titel: string; termen: OntdekTerm[] }[]): string | null {
  const eigen = new Set(termen.map((t) => variantSleutel(t.keyword)));
  if (eigen.size === 0) return null;
  for (const e of eerder) {
    const ander = new Set(e.termen.map((t) => variantSleutel(t.keyword)));
    if (ander.size === 0) continue;
    let gedeeld = 0;
    for (const s of eigen) if (ander.has(s)) gedeeld++;
    if (gedeeld / Math.min(eigen.size, ander.size) >= DUBBEL_DREMPEL) return e.titel;
  }
  return null;
}

// ── De zinnen op de kaart ───────────────────────────────────────────────────

function getal(n: number): string {
  return Math.round(n).toLocaleString("nl-NL");
}

/**
 * Hooguit drie feiten, elk met het gevolg erbij (CLAUDE.md: zeg het gevolg van
 * een cijfer, niet alleen het cijfer). Alleen feiten die er zijn: een onbekend
 * volume levert geen zin op, en zeker geen "0 keer gezocht".
 */
export function kaartFeiten(f: KandidaatFeiten, soort: KandidaatSoort): string[] {
  const zinnen: string[] = [];

  if (f.totaalVolume !== null && f.totaalVolume > 0) {
    zinnen.push(
      `Samen ongeveer ${getal(f.totaalVolume)} keer per maand in Google gezocht. ` +
        `Dat is een aanwijzing voor hoe vaak mensen dit ook aan een AI-assistent vragen, geen meting daarvan.`,
    );
  } else if (f.vertoningen !== null && f.vertoningen > 0) {
    zinnen.push(
      `Je site is hierop de afgelopen 90 dagen ${getal(f.vertoningen)} keer in Google getoond. ` +
        `Er is dus vraag naar, ook al is het volume onbekend.`,
    );
  }

  const p = f.eigenPositie;
  if (soort === "snelle_winst" && p !== null) {
    const plek = Math.round(p);
    zinnen.push(
      plek <= 10
        ? `Je staat gemiddeld op plek ${plek}: op de eerste pagina, maar onder de bovenste drie, waar de meeste klikken naartoe gaan. Hier ligt de kortste weg naar meer bezoekers.`
        : `Je staat gemiddeld op plek ${plek}: net buiten de eerste pagina. Een pagina die precies op deze vraag antwoordt, kan je erop brengen.`,
    );
  } else if (p !== null && p < SNELLE_WINST_VAN) {
    zinnen.push(
      `In Google sta je al bovenaan (plek ${Math.round(p)}). De kans zit hier in AI-antwoorden, niet in Google.`,
    );
  } else if (p === null) {
    zinnen.push("Je site wordt hier nog niet op gevonden. Er is dus nog geen pagina die dit onderwerp draagt.");
  }

  if (f.concurrent) {
    zinnen.push(
      `${f.concurrent.domein} staat hier op plek ${f.concurrent.positie}` +
        (p === null || p > SNELLE_WINST_TOT
          ? ". Die bezoekers gaan nu naar hen."
          : `, jij op plek ${Math.round(p)}.`),
    );
  }

  return zinnen.slice(0, 3);
}

export const SOORT_LABEL: Record<KandidaatSoort, string> = {
  snelle_winst: "Snelle winst",
  nieuw_terrein: "Nieuw terrein",
  concurrent_voor: "Concurrent is je voor",
};

export const SOORT_UITLEG: Record<KandidaatSoort, string> = {
  snelle_winst: "Je staat in Google al op plek 4 tot 20. Hier is het kleinste zetje nodig.",
  nieuw_terrein: "Er wordt naar gezocht, maar je hebt er nog geen pagina die het draagt.",
  concurrent_voor: "Een echte concurrent staat hier in de top 20 en jij niet.",
};

/** De redenen voor "Niet relevant", één klik. Gaan mee naar volgende rondes. */
export const AFWIJSREDENEN = [
  "Doen we niet",
  "Te breed",
  "Te smal",
  "Zit al in een cluster",
] as const;
