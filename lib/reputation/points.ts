/**
 * Wat telt als een plus- of minpunt? (§4.7)
 *
 * Bewust ZONDER `server-only` (conventie 2). Deze filter bepaalt wat er in blok
 * 6 van het scherm komt te staan, onder de kop "Wat AI structureel aan je
 * koppelt", en dat is tekst die de klant leest.
 *
 * ── ⚠️ GEVONDEN IN DE EERSTE ECHTE RUN (23 augustus 2026) ───────────────────
 *
 * Bij Van den Udenhout leverde de oordeelslaag pluspunten op van drie soorten
 * door elkaar:
 *
 *   1. ECHTE EIGENSCHAPPEN, en dat is waar het om gaat: "persoonlijke
 *      begeleiding", "het nakomen van afspraken", "duidelijke uitleg bij
 *      aflevering".
 *   2. FEITELIJKE KENMERKEN, grensgeval maar bruikbaar: "merkdealer van de
 *      Volkswagen-groep", "aangesloten bij BOVAG". Geen reputatie, wel iets dat
 *      vertrouwen draagt.
 *   3. UITSPRAKEN OVER DE REVIEWS ZELF, en die horen er niet in: "Het beeld is
 *      niet uitsluitend negatief", "De algemene klantwaardering is op sommige
 *      platforms goed tot zeer goed", "Daar staan overigens ook meerdere
 *      positieve reviews tegenover".
 *
 * Soort 3 is circulair: je sterke punt is dan dát mensen positief over je zijn.
 * Dat zegt niets, het is niet iets om aan te werken, en op het scherm van een
 * ondernemer leest het als een dooddoener. Erger nog: het cijfer dat eronder
 * hoort staat al ergens anders, namelijk in het bronnenblok met het aantal
 * beoordelingen erbij en een chip die zegt of het bevestigd is.
 *
 * ── WAAROM DIT IN CODE STAAT EN NIET ALLEEN IN DE PROMPT ────────────────────
 *
 * Conventie 1. De prompt is aangescherpt en zegt nu wat een punt wél is, maar
 * een instructie is een intentie. Dit is de garantie.
 */

/**
 * Zinsdelen die verraden dat een punt over de REVIEWS gaat en niet over het
 * bedrijf.
 *
 * ⚠️ Een heuristiek, en dat staat er eerlijk bij. Hij is opgesteld op de
 * werkelijke uitvoer van de eerste run en niet op wat een model zou kúnnen
 * zeggen, dus hij dekt niet alles. Dat is aanvaardbaar omdat de kosten van de
 * twee fouten ongelijk zijn: een gemist meta-punt is één rare regel op het
 * scherm, terwijl een weggegooid echt punt een bevinding kost. De lijst is
 * daarom krap gehouden en bevat alleen wat onmiskenbaar over het oordeel van
 * anderen gaat in plaats van over een eigenschap.
 */
const OVER_DE_REVIEWS = [
  "het beeld is",
  "het beeld blijft",
  "algemene klantwaardering",
  "algemene reputatie",
  "reviews tegenover",
  "positieve reviews",
  "negatieve reviews",
  "positieve ervaringen",
  "negatieve ervaringen",
  "overwegend positief",
  "overwegend negatief",
  "niet uitsluitend",
  "op sommige platforms",
  "op grote reviewplatforms",
  "gemengd beeld",
];

/**
 * Boven deze lengte is een punt geen eigenschap meer maar een alinea.
 *
 * Ruim gekozen: het langste ECHTE punt uit de eerste run was 135 tekens (een
 * opsomming van mobiliteitsdiensten), en dat mag blijven staan. Wat hierboven
 * uitkomt is in de praktijk een samenvattende zin, en die hoort in de synthese
 * en niet in een lijstje.
 */
const MAX_LENGTE = 160;

/**
 * Is dit een bruikbaar plus- of minpunt?
 *
 * Geeft `false` bij een uitspraak over de reviews, bij een lege regel en bij
 * een hele alinea. Alles daartussen blijft staan: bij twijfel houden we het
 * punt, want een weggegooide bevinding kost meer dan een rare regel.
 */
export function isUsablePoint(raw: string): boolean {
  const v = raw.trim();
  if (v.length < 3) return false;
  if (v.length > MAX_LENGTE) return false;

  const laag = v.toLowerCase();
  return !OVER_DE_REVIEWS.some((m) => laag.includes(m));
}

/**
 * Schoont een lijst punten op: leeg eruit, meta eruit, ontdubbeld, en hooguit
 * acht. Meer dan acht leest niemand, en de synthese vat ze toch samen.
 *
 * ⚠️ De ontdubbeling kijkt naar de eerste drie woorden ná het wegstrepen van
 * frequentiebijwoorden. "levertijd valt tegen" en "levertijd valt soms tegen"
 * zijn hetzelfde bezwaar; als twee losse regels blijven ze allebei onder de
 * patroondrempel van de synthese, en dan verdwijnt een bezwaar dat juist wél
 * terugkomt.
 *
 * Die bijwoorden zijn precies wat de bijna-duplicaten maakt, en ze veranderen
 * het punt niet: of de levertijd altijd of soms tegenvalt, het gaat over de
 * levertijd. Zonder het wegstrepen viel dit geval erdoorheen; mét het
 * wegstrepen blijven "persoonlijke begeleiding" en "persoonlijke aandacht" wél
 * twee punten, want daar verschilt het tweede woord echt.
 */
const BIJWOORDEN = new Set([
  "soms",
  "vaak",
  "regelmatig",
  "geregeld",
  "incidenteel",
  "structureel",
  "meestal",
  "doorgaans",
  "af",
  "toe",
  "erg",
  "zeer",
  "nogal",
]);

function dedupeSleutel(punt: string): string {
  return punt
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((w) => w && !BIJWOORDEN.has(w))
    .slice(0, 3)
    .join(" ");
}

export function cleanPoints(list: string[]): string[] {
  const gezien = new Set<string>();
  const uit: string[] = [];

  for (const raw of list) {
    const v = raw.trim();
    if (!isUsablePoint(v)) continue;

    const sleutel = dedupeSleutel(v);
    if (!sleutel || gezien.has(sleutel)) continue;
    gezien.add(sleutel);

    uit.push(v);
    if (uit.length >= 8) break;
  }

  return uit;
}
