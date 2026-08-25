/**
 * De weergavelaag van het scherm Mijn reputatie: wát er getoond wordt, in welke
 * volgorde, en hoe zwaar.
 *
 * Bewust ZONDER `server-only` (conventie 2). Dit bestand bepaalt wat de klant
 * bovenaan zijn scherm leest en hoe de producten gegroepeerd worden, dus het
 * hoort testbaar te zijn zonder database en zonder sleutel.
 *
 * ── ⚠️ HIER WORDT NIETS GEMETEN ─────────────────────────────────────────────
 *
 * Elke waarde hieronder komt uit een kolom die de pijplijn al gevuld heeft. Er
 * wordt geen cijfer opnieuw berekend, geen toon bijgesteld en geen model
 * bevraagd. Wat dit bestand toevoegt is uitsluitend groeperen, sorteren en
 * benoemen, en dat is precies waar het scherm het liet liggen.
 *
 * ── DE AANLEIDING, MET DE CIJFERS VAN DE ECHTE RUN ──────────────────────────
 *
 * Op de run van Gasservice Brabant van 23 augustus 2026 (46 vragen, 12
 * producten) toonde het scherm twaalf identieke dichtgeklapte regels die alle
 * twaalf "1 vraag" zeiden. Klapte je er een open, dan stond er "ChatGPT geeft
 * een neutrale toon van 0" en verder niets: `top_pros` en `top_cons` van een
 * aanbodrij vullen pas bij twee of meer vragen per product, en er is er één.
 *
 * Ondertussen lag in dezelfde run wél klaar, en werd nergens getoond:
 *
 *   • 89 pluspunten en 60 bezwaren, per product, uit `reputation_answers`.
 *   • De bedrijven die ChatGPT per product aanraadt, uit `reputation_market`.
 *     Dat scherm las die tabel niet één keer uit. Daar stond in dat de klant bij
 *     4 van de 12 producten genoemd wordt (cv-ketel huren op plek 2 van 3), bij
 *     5 niet (bij cv-ketel storing noemt ChatGPT Kemkens, Warmte Centrum
 *     Brabant, VSB, MVS en Van Beek in plaats van hem), en dat er bij 3 niets
 *     gevraagd is omdat het budget op was.
 *
 * Dat verschil per product ís het advies. Het merkgemiddelde erboven verbergt
 * het, en twaalf gelijke regels verbergen het een tweede keer.
 */
import { cleanPoints, dedupeSleutel, evidenceRemarks, experiencePoints } from "@/lib/reputation/points";
import { toneSentence, toneWord } from "@/lib/reputation/tone";

// ════════════════════════════════════════════════════════════════════════════
// De kop van het scherm
// ════════════════════════════════════════════════════════════════════════════

/** De opgeslagen verdeling van de toonoordelen (`reputation_runs.tone_distribution`). */
export interface ToneShape {
  counts: Record<string, number>;
  spread: number;
  n: number;
}

export interface Headline {
  /** De kop, in gewone taal. Dit is de bevinding en niet het cijfer. */
  kop: string;
  /** Het woord dat bij de meter hoort. Nooit een kaal getal. */
  woord: string;
}

/**
 * ⚠️ DE ENIGE WEERGAVEREGEL DIE DIT BESTAND TOEVOEGT, EN WAAROM HIJ ER MOET ZIJN.
 *
 * Het etiket `gemengd` scoort in `tone.ts` altijd exact 0, en 0 heet op de
 * schaal "neutraal". Bij Gasservice Brabant kregen alle 22 bruikbare antwoorden
 * dat etiket. Het scherm zette daar dus "neutraal 0" boven, terwijl twee regels
 * lager de eigen zin van `spreadSentence()` stond: "bij 22 van de 22 vragen
 * noemt ChatGPT zowel lof als kritiek".
 *
 * Twee mededelingen over hetzelfde, waarvan de bovenste, zwaarste, de onderste
 * tegensprak. Neutraal betekent: er wordt zakelijk over je gepraat, niemand
 * heeft een uitgesproken mening. Verdeeld betekent: er is lof én kritiek, en er
 * staan bezwaren die je kunt aanpakken. Voor het cijfer maakt dat niets uit,
 * voor het advies alles.
 *
 * Het cijfer verandert hier niet. Alleen het woord erboven.
 */
export function reputationHeadline(args: {
  toneIndex: number | null;
  distribution: ToneShape | null;
  brand: string;
}): Headline {
  const { toneIndex, distribution, brand } = args;

  if (toneIndex === null) {
    return { kop: toneSentence(null, brand), woord: "geen beeld" };
  }

  const gemengd = distribution?.counts["gemengd"] ?? 0;
  const n = distribution?.n ?? 0;
  if (n >= 3 && gemengd >= Math.ceil(n / 2)) {
    return {
      kop: `ChatGPT is verdeeld over ${brand}: hij noemt lof én kritiek in hetzelfde antwoord.`,
      woord: "verdeeld",
    };
  }

  return { kop: toneSentence(toneIndex, brand), woord: toneWord(toneIndex) };
}

/**
 * Waar de toon staat op de meter, als percentage van links naar rechts.
 *
 * De schaal loopt van -100 tot 100, de meter van 0% tot 100%. Meer is dit niet:
 * een omrekening voor de opmaak, zodat het scherm geen eigen rekensom doet.
 */
export function tonePercent(index: number): number {
  const begrensd = Math.max(-100, Math.min(100, index));
  return Math.round(((begrensd + 100) / 200) * 100);
}

// ════════════════════════════════════════════════════════════════════════════
// Per product en dienst
// ════════════════════════════════════════════════════════════════════════════

/**
 * De stand van één product op de vraag die commercieel telt.
 *
 * ⚠️ `niet_gevraagd` staat náást `niet_genoemd` en niet eronder. Een product
 * waarover de marktvraag niet gesteld is (budget op, of geen bruikbaar antwoord)
 * is iets anders dan een product waarbij ChatGPT anderen noemt en jou niet. Het
 * eerste is een gat in de meting, het tweede is een gat in je markt. Ze
 * samenvoegen zou de klant laten schrikken van iets wat wij niet gevraagd
 * hebben (conventie 3: onbekend is een betere waarde dan een verkeerde).
 */
export type OfferingState = "niet_genoemd" | "genoemd" | "niet_gevraagd";

/** Eén regel uit `reputation_offering_scores`, in wat het scherm ervan nodig heeft. */
export interface ScoreRow {
  offering_id: string | null;
  offering_name: string;
  tone_index: number | null;
  evidence_score: number | null;
  answers: number;
  visibility_score: number | null;
  source_domains: string[];
}

/** Eén beoordeeld antwoord uit `reputation_answers`. */
export interface AnswerRow {
  id: string;
  offering_id: string | null;
  block: string;
  question: string;
  answer_text: string | null;
  tone: string | null;
  pros: string[];
  cons: string[];
  cited_urls: string[];
}

/** Eén genoemd bedrijf uit `reputation_market`. */
export interface MarketRow {
  offering_id: string | null;
  party_name: string;
  is_own_brand: boolean;
  position: number;
  of_parties: number;
}

/** Alles wat één productregel op het scherm nodig heeft. */
export interface OfferingView {
  offeringId: string | null;
  name: string;
  state: OfferingState;
  /** Jouw plek in de aanbeveling. 1 betekent: als eerste genoemd. */
  position: number | null;
  ofParties: number | null;
  /** De bedrijven die ChatGPT vóór jou noemt. Bij `niet_genoemd` zijn dat ze allemaal. */
  ahead: string[];
  toneIndex: number | null;
  evidenceScore: number | null;
  /** De punten die echt over het bedrijf gaan. */
  pros: string[];
  cons: string[];
  /** De punten waarin ChatGPT zegt dat hij weinig of niets kon vinden. */
  gaps: string[];
  /** Hoeveel domeinen er onder dit oordeel liggen. */
  sources: number;
  answers: AnswerRow[];
  visibilityScore: number | null;
}

/**
 * Bouwt per product de regel die het scherm toont.
 *
 * ⚠️ De plus- en minpunten komen uit de ANTWOORDEN en niet uit de
 * samenvattingsrij. Die rij houdt alleen punten over die in twee of meer
 * antwoorden terugkwamen, en bij één vraag per product zijn dat er per definitie
 * nul. Op de run van Gasservice Brabant stond daardoor bij alle twaalf de
 * producten niets, terwijl er 149 punten in de antwoorden lagen.
 *
 * De opschoning is dezelfde als de synthese gebruikt (`cleanPoints`), en de
 * splitsing tussen een echte ervaring en een opmerking over ons eigen bewijs
 * ook (`experiencePoints` en `evidenceRemarks`). Twee lijsten die hetzelfde
 * bedoelen maar anders opschonen lopen gegarandeerd uit elkaar.
 */
export function buildOfferingViews(args: {
  scores: ScoreRow[];
  answers: AnswerRow[];
  market: MarketRow[];
}): OfferingView[] {
  const { scores, answers, market } = args;

  return scores.map((s) => {
    const eigenAntwoorden = answers.filter(
      (a) => a.offering_id !== null && a.offering_id === s.offering_id && a.block === "aanbod",
    );
    const marktRijen = market.filter(
      (m) => m.offering_id !== null && m.offering_id === s.offering_id,
    );

    const eigenRij = marktRijen.find((m) => m.is_own_brand) ?? null;
    const state: OfferingState =
      marktRijen.length === 0 ? "niet_gevraagd" : eigenRij ? "genoemd" : "niet_genoemd";

    // De bedrijven vóór jou, op de volgorde waarin ChatGPT ze noemde. Sta je er
    // niet tussen, dan zijn dat ze allemaal: dan verliest je hele markt van je.
    const grens = eigenRij ? eigenRij.position : Number.POSITIVE_INFINITY;
    const ahead = marktRijen
      .filter((m) => !m.is_own_brand && m.position < grens)
      .sort((a, b) => a.position - b.position)
      .map((m) => m.party_name);

    const allePros = eigenAntwoorden.flatMap((a) => a.pros);
    const alleCons = eigenAntwoorden.flatMap((a) => a.cons);

    return {
      offeringId: s.offering_id,
      name: s.offering_name,
      state,
      position: eigenRij?.position ?? null,
      ofParties: marktRijen.length > 0 ? Math.max(...marktRijen.map((m) => m.of_parties)) : null,
      ahead,
      toneIndex: s.tone_index,
      evidenceScore: s.evidence_score,
      pros: cleanPoints(experiencePoints(allePros)),
      cons: cleanPoints(experiencePoints(alleCons)),
      gaps: cleanPoints(evidenceRemarks(alleCons)),
      sources: s.source_domains.length,
      answers: eigenAntwoorden,
      visibilityScore: s.visibility_score,
    };
  });
}

export interface OfferingGroups {
  nietGenoemd: OfferingView[];
  genoemd: OfferingView[];
  nietGevraagd: OfferingView[];
}

/**
 * De drie groepen, elk op zijn eigen volgorde.
 *
 * ── ⚠️ HET PROBLEEM STAAT BOVENAAN, EN DAT IS DE GROEP EN NIET DE REGEL ─────
 *
 * De oude lijst sorteerde op toon van laag naar hoog. Dat werkt alleen als de
 * tonen verschillen, en op de echte run stonden ze alle twaalf op 0: twaalf
 * regels in willekeurige volgorde. Wat wél verschilt is of ChatGPT je noemt als
 * een koper vraagt wie hij moet hebben, en dat is bovendien het enige getal op
 * dit scherm waar direct geld aan hangt.
 *
 * Binnen "niet genoemd" staat het product bovenaan waar de meeste anderen wél
 * genoemd worden: daar is de markt het drukst en verlies je dus het meest.
 *
 * Binnen "wel genoemd" telt het aantal bedrijven dat vóór je staat, en niet je
 * plek gedeeld door het aantal partijen. Die deling zette plek 2 van 3 boven
 * plek 3 van 5 (0,67 tegen 0,60), terwijl er in het eerste geval één bedrijf
 * vóór je staat en in het tweede twee. De klant leest op de regel ernaast
 * letterlijk wie er vóór hem staat, dus daar hoort de volgorde ook op te rusten.
 *
 * Bij gelijke stand beslist de naam, zodat twee keer hetzelfde scherm dezelfde
 * volgorde toont.
 */
export function groupOfferings(views: OfferingView[]): OfferingGroups {
  const opNaam = (a: OfferingView, b: OfferingView) => a.name.localeCompare(b.name, "nl");

  return {
    nietGenoemd: views
      .filter((v) => v.state === "niet_genoemd")
      .sort((a, b) => (b.ofParties ?? 0) - (a.ofParties ?? 0) || opNaam(a, b)),
    genoemd: views
      .filter((v) => v.state === "genoemd")
      .sort((a, b) => b.ahead.length - a.ahead.length || opNaam(a, b)),
    nietGevraagd: views.filter((v) => v.state === "niet_gevraagd").sort(opNaam),
  };
}

/**
 * De zin boven de productlijst: bij hoeveel producten noemt ChatGPT je.
 *
 * ⚠️ Dit is dezelfde bevinding als de trefkans bovenaan het scherm, maar dan als
 * telling in plaats van percentage, en met de noemer erbij. "33% van de vragen"
 * is voor een ondernemer een abstractie; "bij 4 van je 12 producten" is een
 * lijstje dat hij kan nalopen. Zie ook de ronde van 24 augustus 2026 op het
 * merkoverzicht: een telling verslaat een percentage zodra de noemer klein is.
 */
export function marketSplitSentence(g: OfferingGroups, brand: string): string {
  const genoemd = g.genoemd.length;
  const niet = g.nietGenoemd.length;
  const gevraagd = genoemd + niet;

  if (gevraagd === 0) {
    return `Bij geen enkel product is gevraagd welk bedrijf een koper zou moeten nemen, dus hierover valt nog niets te zeggen.`;
  }
  if (genoemd === 0) {
    return `Vraagt een koper welk bedrijf hij moet hebben, dan noemt ChatGPT ${brand} bij geen van de ${gevraagd} gemeten producten. Hij noemt telkens anderen.`;
  }
  if (niet === 0) {
    return `Vraagt een koper welk bedrijf hij moet hebben, dan noemt ChatGPT ${brand} bij alle ${gevraagd} gemeten producten.`;
  }
  return `Vraagt een koper welk bedrijf hij moet hebben, dan noemt ChatGPT ${brand} bij ${genoemd} van de ${gevraagd} gemeten producten. Bij de andere ${niet} noemt hij anderen.`;
}

/** De regel bij één product, in gewone taal. Dit is wat de klant als eerste leest. */
export function offeringSentence(v: OfferingView, brand: string): string {
  if (v.state === "niet_gevraagd") {
    return `Hier is niet gevraagd wie een koper zou moeten nemen.`;
  }
  if (v.state === "niet_genoemd") {
    if (v.ahead.length === 0) {
      return `ChatGPT noemt hier geen enkel bedrijf, ook ${brand} niet.`;
    }
    const eerste = v.ahead.slice(0, 2).join(" en ");
    const rest = v.ahead.length - Math.min(2, v.ahead.length);
    return rest > 0
      ? `ChatGPT raadt hier ${eerste} aan, en nog ${rest} ${rest === 1 ? "ander" : "anderen"}. ${brand} noemt hij niet.`
      : `ChatGPT raadt hier ${eerste} aan. ${brand} noemt hij niet.`;
  }
  if (v.position === 1) {
    return `ChatGPT noemt ${brand} hier als eerste van ${v.ofParties}.`;
  }
  return `ChatGPT noemt ${brand} hier op plek ${v.position} van ${v.ofParties}, achter ${v.ahead.join(" en ")}.`;
}

// ════════════════════════════════════════════════════════════════════════════
// Wat over de producten heen terugkomt
// ════════════════════════════════════════════════════════════════════════════

/** Eén punt, met het aantal producten waarbij het terugkwam. */
export interface PointSpread {
  punt: string;
  producten: number;
}

/**
 * Groepeert punten over producten heen: wat komt er vaker dan één keer terug?
 *
 * ⚠️ De sleutel is `dedupeSleutel()` en niet de letterlijke tekst. "onverwacht
 * hoge kosten" en "onverwacht hoge reparatierekening" zijn hetzelfde bezwaar; als
 * losse regels tellen ze allebei als één product en verdwijnt het patroon dat er
 * wél is. Precies dezelfde sleutel gebruikt de synthese, zodat het scherm en het
 * merkoordeel nooit iets anders groeperen.
 *
 * Het GETOONDE label is de kortste variant. Die is bijna altijd de algemene
 * formulering ("onverwacht hoge kosten") en de langste bijna altijd het geval van
 * één klant ("hoge reparatierekening zonder voorafgaande prijsindicatie"). Een
 * patroon dat je met het ene geval benoemt, leest als dat ene geval.
 */
export function spreadOverOfferings(
  views: OfferingView[],
  kies: (v: OfferingView) => string[],
): PointSpread[] {
  const perSleutel = new Map<string, { labels: string[]; producten: Set<string> }>();

  for (const v of views) {
    const gezienInDitProduct = new Set<string>();
    for (const punt of kies(v)) {
      const sleutel = dedupeSleutel(punt);
      if (!sleutel || gezienInDitProduct.has(sleutel)) continue;
      gezienInDitProduct.add(sleutel);

      const bestaand = perSleutel.get(sleutel) ?? { labels: [], producten: new Set<string>() };
      bestaand.labels.push(punt);
      bestaand.producten.add(v.name);
      perSleutel.set(sleutel, bestaand);
    }
  }

  return [...perSleutel.values()]
    .map((v) => ({
      punt: [...v.labels].sort((a, b) => a.length - b.length)[0],
      producten: v.producten.size,
    }))
    .sort((a, b) => b.producten - a.producten || a.punt.localeCompare(b.punt, "nl"));
}

/**
 * De zin over de producten waar ChatGPT niets onafhankelijks over kon vinden.
 *
 * ⚠️ Dit is de bevinding die `points.ts` al isoleerde maar die nergens op het
 * scherm stond. Uit de code daar: "Over vier van je twaalf diensten zegt ChatGPT
 * letterlijk dat er geen onafhankelijk bewijs te vinden is" is een
 * verkoopgesprek, terwijl "zwak punt: nauwelijks ventilatiereviews" een raadsel
 * is. Hij stond als bezwaar tussen de echte bezwaren, of nergens.
 */
export function evidenceGapSentence(views: OfferingView[]): string | null {
  const metGat = views.filter((v) => v.gaps.length > 0);
  if (metGat.length === 0) return null;

  return metGat.length === 1
    ? `Bij 1 van je ${views.length} producten zegt ChatGPT dat hij er weinig of niets onafhankelijks over kon vinden. Dat is geen kritiek op je werk, het is een gat in wat er online over je staat.`
    : `Bij ${metGat.length} van je ${views.length} producten zegt ChatGPT dat hij er weinig of niets onafhankelijks over kon vinden. Dat is geen kritiek op je werk, het is een gat in wat er online over je staat.`;
}

// ════════════════════════════════════════════════════════════════════════════
// De bronnen
// ════════════════════════════════════════════════════════════════════════════

/** Eén bron uit `reputation_sources`, in wat het scherm ervan gebruikt. */
export interface SourceRow {
  domain: string;
  kind: string;
  citations: number;
  url: string | null;
  rating: number | null;
  rating_count: number | null;
  verified: boolean;
}

/**
 * De reviewcijfers die ChatGPT leest, met het zwaarste bewijs bovenaan.
 *
 * ⚠️ Deze stonden weggeklapt in een accordeon onderaan een lijst van negentien
 * domeinen. Bij Gasservice Brabant ging het om een 8,2 op Klantenvertellen over
 * 87 reviews (bevestigd door onze eigen crawler) en een 4,5 op Google over 451
 * reviews. Dat is het concreetste bewijs dat dit hele scherm heeft, en het is
 * bovendien het enige wat de klant zelf kan beïnvloeden.
 *
 * Bevestigd gaat vóór onbevestigd, en daarbinnen telt het aantal beoordelingen:
 * een 5,0 op één review zegt minder dan een 8,2 op 87.
 */
export function reviewRatings(sources: SourceRow[]): SourceRow[] {
  return sources
    .filter((s) => s.rating !== null)
    .sort(
      (a, b) =>
        Number(b.verified) - Number(a.verified) ||
        (b.rating_count ?? 0) - (a.rating_count ?? 0) ||
        (b.rating ?? 0) - (a.rating ?? 0),
    );
}

/**
 * De bewijskracht als woord, met dezelfde drempels als de kleur van de chip.
 *
 * ⚠️ De grenzen (60 en 25) staan gelijk met `EvidenceChip`, zodat het woord en
 * de kleur nooit iets anders zeggen. "bewijs 99" was een cijfer op een schaal
 * die alleen wij kennen; dit is wat het betekent.
 */
export function evidenceWord(score: number | null): string {
  if (score === null) return "niet vastgesteld";
  if (score >= 60) return "stevig onderbouwd";
  if (score >= 25) return "matig onderbouwd";
  return "nauwelijks onderbouwd";
}

/**
 * Zet achter elk patroon uit de synthese hoeveel producten het raakt.
 *
 * ── ⚠️ WAAROM DIT GEEN TWEEDE LIJST IS ──────────────────────────────────────
 *
 * De verleiding was om naast de sterke en zwakke punten van de run een eigen
 * lijst te tonen die uit de producten wordt opgebouwd. Dan staan er twee
 * lijstjes met bijna dezelfde regels, elk met een eigen telling, en dan gelooft
 * de klant geen van beide. Dat is de fout die op het merkoverzicht van 25
 * augustus 2026 met "1 pagina gepubliceerd" naast "nog geen van je 120 pagina's
 * staat live" is vastgelegd.
 *
 * De lijst van de synthese blijft dus de enige lijst. Hier komt er alleen een
 * telling achter, op dezelfde sleutel waarop de synthese zelf groepeert, zodat
 * "onverwacht hoge kosten" en "onverwacht hoge reparatierekening" als één
 * bezwaar tellen en niet als twee.
 *
 * ⚠️ Dat de telling dezelfde sleutel gebruikt is geen detail maar de reden dat
 * hij mag. Een regel in die lijst STAAT voor zijn cluster: hij haalde de
 * patroondrempel doordat de varianten samen geteld werden. Zou de telling
 * hieronder strenger of ruimer groeperen, dan zou hij een ander aantal noemen
 * dan het aantal waarmee de regel zelf verdiend heeft er te staan.
 *
 * Nagerekend op de run van Gasservice Brabant (23 augustus 2026, 12 producten):
 * "onverwacht hoge kosten" komt bij 6 producten terug, "conflict over een
 * afspraak voor een gaslek" bij 4. Dat is precies het onderscheid dat dit blok
 * moet maken: het eerste is werk voor morgen, het tweede een incident.
 */
export function countPerProduct(
  punten: string[],
  views: OfferingView[],
  kies: (v: OfferingView) => string[],
): PointSpread[] {
  const perSleutel = new Map<string, number>();
  for (const s of spreadOverOfferings(views, kies)) {
    perSleutel.set(dedupeSleutel(s.punt), s.producten);
  }

  return punten.map((punt) => ({
    punt,
    producten: perSleutel.get(dedupeSleutel(punt)) ?? 0,
  }));
}
