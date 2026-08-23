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
/**
 * Aanhalingstekens in alle vormen die een model gebruikt.
 *
 * ⚠️ Niet alleen het rechte teken: modellen leveren vrijwel altijd de typografische
 * variant, en een controle op alleen `"` mist dan alles.
 */
const AANHALINGSTEKENS = /^["'“”„«»‘’]+|["'“”„«»‘’]+$/g;

/**
 * Is dit een letterlijk citaat in plaats van een eigenschap?
 *
 * ── ⚠️ GEVONDEN IN DE RUN OP GASSERVICE BRABANT (23 augustus 2026) ──────────
 *
 * De sterke punten bevatten zowel "afspraken nakomen" als "Werken netjes. Komen
 * op tijd.", en de zwakke punten zowel "afspraken niet nagekomen" als "Komen
 * afspraken niet na!". Dat is twee keer hetzelfde punt, één keer als eigenschap
 * en één keer als citaat.
 *
 * Op het scherm staat dan onder "wat AI structureel aan je koppelt" een lijstje
 * waarin de helft dubbel is. En het citaat hoort er sowieso niet: daar is het
 * veld `citaten` voor, dat de klant onder het antwoord kan nalezen. Een lijst
 * met eigenschappen is een agenda om aan te werken; een lijst met citaten is
 * een bloemlezing.
 *
 * De ontdubbeling ving dit niet, en kon dat ook niet: "komen afspraken niet"
 * en "afspraken niet nagekomen" beginnen met verschillende woorden.
 */
function isCitaat(v: string): boolean {
  // Begint én eindigt met een aanhalingsteken: onmiskenbaar een citaat.
  const heeftOpening = /^["'“„«‘]/.test(v);
  const heeftSluiting = /["'”»’]$/.test(v.replace(/[.!?]+$/, ""));
  if (heeftOpening && heeftSluiting) return true;

  // Of het leest als een volzin uit de mond van een klant: eindigt op een
  // uitroepteken of vraagteken. Een eigenschap doet dat nooit.
  return /[!?]$/.test(v);
}

export function isUsablePoint(raw: string): boolean {
  const v = raw.trim();
  if (v.length < 3) return false;
  if (v.length > MAX_LENGTE) return false;
  if (isCitaat(v)) return false;

  const laag = v.toLowerCase();
  return !OVER_DE_REVIEWS.some((m) => laag.includes(m));
}

/**
 * Schoont een lijst punten op: leeg eruit, meta eruit, ontdubbeld, en hooguit
 * acht. Meer dan acht leest niemand, en de synthese vat ze toch samen.
 *
 * ⚠️ De ontdubbeling kijkt naar de eerste twee woorden ná het wegstrepen van
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

/**
 * De sleutel waarop twee punten als hetzelfde gelden.
 *
 * Geëxporteerd omdat de synthese hem óók nodig heeft: die groepeert punten over
 * ANTWOORDEN heen om te bepalen wat er vaker dan één keer terugkwam. Zou hij een
 * eigen sleutel gebruiken, dan tellen "persoonlijke begeleiding" en
 * "persoonlijke begeleiding bij aankoop" als twee patronen en staan ze allebei
 * op het scherm. Dat gebeurde in de eerste echte run.
 */
export function dedupeSleutel(punt: string): string {
  return punt
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((w) => w && !BIJWOORDEN.has(w))
    // ⚠️ TWEE woorden en niet drie. Met drie viel "persoonlijke begeleiding"
    // (twee woorden) niet samen met "persoonlijke begeleiding bij aankoop"
    // (vier), want de eerste levert dan een sleutel van twee woorden op en de
    // tweede een van drie. Precies dat paar stond allebei in de sterke punten
    // van de eerste echte run.
    //
    // Twee is krap genoeg om echte verschillen te behouden ("persoonlijke
    // begeleiding" tegenover "persoonlijke aandacht", "hoge kosten" tegenover
    // "hoge kwaliteit") en ruim genoeg om een uitbreiding van hetzelfde punt te
    // herkennen.
    .slice(0, 2)
    .join(" ");
}

export function cleanPoints(list: string[]): string[] {
  const gezien = new Set<string>();
  const uit: string[] = [];

  for (const raw of list) {
    // Losse aanhalingstekens eromheen weg: "deskundigheid" en deskundigheid zijn
    // hetzelfde punt, en met het teken erbij ontdubbelen ze niet.
    const v = raw.trim().replace(AANHALINGSTEKENS, "").trim();
    if (!isUsablePoint(v)) continue;

    const sleutel = dedupeSleutel(v);
    if (!sleutel || gezien.has(sleutel)) continue;
    gezien.add(sleutel);

    uit.push(v);
    if (uit.length >= 8) break;
  }

  return uit;
}

/**
 * ── ⚠️ DE DERDE SOORT, GEVONDEN IN DE TWEEDE RUN OP GASSERVICE BRABANT ──────
 *
 * De vierentwintig oordelen van die run kregen allemaal hetzelfde etiket:
 * gemengd, zonder één uitzondering. Bij het nalezen van de bezwarenlijstjes
 * bleek waarom. Er stonden twee wezenlijk verschillende dingen in, en ze telden
 * even zwaar:
 *
 *   1. ECHTE ERVARINGEN: "scheef aangesloten rookgasafvoer", "afspraak bij een
 *      gemeld gaslek niet nagekomen", "onverwacht hoge rekening zonder
 *      voorafgaande prijsindicatie". Dat is reputatie.
 *   2. UITSPRAKEN OVER ONS EIGEN BEWIJS: "weinig onafhankelijke,
 *      dienstspecifieke klantfeedback over elektrische warmtepompen",
 *      "nauwelijks of geen specifieke ventilatiereviews", "de actuele
 *      steekproef op Klantenvertellen is klein", "specifieke
 *      zonneboilercertificering niet gevonden".
 *
 * Soort 2 is geen kritiek op het bedrijf. Het is ChatGPT die zegt dat hij
 * niets kon vinden, en dat is een uitspraak over de vindbaarheid en niet over
 * de kwaliteit. Zo'n regel als bezwaar meetellen doet twee dingen fout
 * tegelijk: hij duwt de toon omlaag zonder aanleiding, en op het scherm leest
 * de ondernemer een "zwak punt" waar hij niets aan kan doen dat hij begrijpt.
 *
 * Erger nog: het is juist een van de waardevolste bevindingen die dit product
 * kan opleveren, alleen op de verkeerde plek. "Over vier van je twaalf diensten
 * zegt ChatGPT letterlijk dat er geen onafhankelijk bewijs te vinden is" is een
 * verkoopgesprek. "Zwak punt: nauwelijks ventilatiereviews" is een raadsel.
 *
 * Vandaar deze indeling, in code en niet in de prompt (conventie 1).
 */
export type PointKind = "ervaring" | "bewijs";

/**
 * Zinsdelen waaraan een uitspraak over het BEWIJS te herkennen is.
 *
 * Letterlijk overgenomen uit de bezwarenlijstjes van de tweede run, niet
 * bedacht. Ruimer opgezet dan `OVER_DE_REVIEWS` hierboven, want de kosten
 * liggen hier andersom: dit soort punt verkeerd meetellen verschuift een
 * cijfer, terwijl het verkeerd wegzetten alleen een regel verplaatst naar een
 * ander blok waar hij ook thuishoort.
 */
const OVER_HET_BEWIJS = [
  "niet gevonden",
  "niet onafhankelijk",
  "onafhankelijk onderbouwd",
  "niet onderbouwd",
  "niet overtuigend",
  "niet controleerbaar",
  "niet volledig zichtbaar",
  "niet worden bevestigd",
  "niet bevestigd",
  "niet te verifiëren",
  "niet verifieerbaar",
  "steekproef",
  "openbaar",
  "publiek beschikbaar",
  "weinig onafhankelijke",
  "weinig reviews",
  "weinig recensies",
  "nauwelijks",
  "geen review",
  "geen klantreview",
  "geen recensie",
  "geen specifieke",
  "dienstspecifieke klantfeedback",
  "jaar oud",
  "verouderd",
  "beperkt aantal beoordelingen",
];

/**
 * Waar gaat dit punt over: over het bedrijf, of over wat wij erover konden
 * vinden?
 *
 * ⚠️ Bij twijfel `ervaring`. Een echt bezwaar dat als bewijsopmerking wordt
 * weggezet verdwijnt uit het cijfer, en dat is de duurdere fout van de twee.
 */
export function pointKind(punt: string): PointKind {
  const laag = punt.toLowerCase();
  return OVER_HET_BEWIJS.some((m) => laag.includes(m)) ? "bewijs" : "ervaring";
}

/** De punten die echt over het bedrijf gaan. */
export function experiencePoints(list: string[]): string[] {
  return list.filter((p) => pointKind(p) === "ervaring");
}

/** De punten waarin AI zegt dat hij weinig of niets kon vinden. */
export function evidenceRemarks(list: string[]): string[] {
  return list.filter((p) => pointKind(p) === "bewijs");
}
