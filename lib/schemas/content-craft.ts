import { z } from "zod";

/**
 * De VIERDE beoordelaar: vakmanschap
 * (docs/tasks/contentkwaliteit-framework.md §4.5, punt 11 en 31 van de opdracht)
 *
 * ── WAAROM ER EEN VIERDE BIJ MOEST ──────────────────────────────────────────
 *
 * De drie bestaande beoordelaars kijken naar juistheid (feitelijkheid),
 * volledigheid (citeerbaarheid) en vorm (redactie). Wat geen van drieën meet,
 * is precies het verschil waar de opdracht over gaat: het verschil tussen een
 * pagina die klopt en een pagina die een goede copywriter geschreven zou hebben.
 *
 * Gemeten op productie is dat verschil zichtbaar en ongemeten tegelijk. De
 * pagina's van 1 september haalden 86 tot 98 procent contractdekking, dus alle
 * secties stonden er, en tegelijk stonden er over vier pagina's samen vijf
 * concrete getallen tegenover tachtig zinnen die de lezer opdroegen iets na te
 * vragen. Elke bestaande controle vond dat in orde.
 *
 * ── WAT DEZE BEOORDELAAR WEL EN NIET DOET ───────────────────────────────────
 *
 * Hij herschrijft niets en hij oordeelt niet over feiten: dat is het werk van de
 * feitelijkheidsbeoordelaar en die blijft er los van staan, zodat één gunstig
 * oordeel het andere niet kan overstemmen (`content-panel.ts`). Hij scoort zes
 * dingen die semantisch begrip vragen en dus niet te tellen zijn.
 *
 * ── WAAROM SCORES ÉN BEWIJS ─────────────────────────────────────────────────
 *
 * Elk cijfer krijgt een `evidence`-veld met de passage waarop het rust. Een
 * cijfer zonder aanwijsbare zin is een mening, en dan kan de reparatiestap er
 * niets mee en kan niemand narekenen of de beoordelaar zich vergiste. Dat is
 * dezelfde eis als bij `supportQuote` in de claim-audit, waar hij zes van de
 * zeven onterecht onderbouwde beweringen ontmaskerde.
 *
 * ── KOSTEN ──────────────────────────────────────────────────────────────────
 *
 * Goedkope tier, werk-soort `judging`, parallel met de andere drie. Gemeten op
 * `ai_calls` kost een contentbeoordeling daar $0,0013 tot $0,0040; deze is de
 * zwaarste van de vier en komt naar verwachting rond $0,004 uit, tegen $0,071
 * voor de schrijfaanroep ernaast. Ongeveer drie procent van een pagina, en nul
 * extra doorlooptijd omdat hij naast de andere drie draait.
 */

/** Eén dimensie, met het cijfer én de zin waarop dat cijfer rust. */
const Beoordeling = z.object({
  /** 0 tot 100. */
  score: z.number(),
  /**
   * De passage uit de pagina die dit cijfer rechtvaardigt. Bij een laag cijfer
   * de zin die het probleem laat zien, bij een hoog cijfer de zin die het goed
   * doet. Leeg mag niet: een cijfer zonder aanwijsbare zin is een mening.
   */
  evidence: z.string(),
  /** In één zin: waarom dit cijfer. Geen jargon. */
  why: z.string(),
});

export const CraftVerdict = z.object({
  /**
   * Gaat deze pagina over DIT bedrijf, of zou hij op de site van elke
   * concurrent kunnen staan? Dit is de dimensie waar de opdracht om draait:
   * "generiek AI-gehalte" met een andere naam.
   */
  specificiteit: Beoordeling,
  /** Laat de tekst zien dat de schrijver het vak kent, of somt hij op? */
  expertise: Beoordeling,
  /** Gaat de pagina verder dan wat iedereen al weet, of blijft hij aan de oppervlakte? */
  diepgang: Beoordeling,
  /** Zegt de pagina iets eigens, of is het het bekende verhaal in andere woorden? */
  originaliteit: Beoordeling,
  /** Klinkt de tekst zoals dit bedrijf klinkt, gemeten aan de meegegeven stijl? */
  toon: Beoordeling,
  /**
   * Begint de pagina bij een situatie die de lezer herkent? (V11)
   *
   * ⚠️ Dit cijfer telt NOG NIET mee in het profiel (`quality-profile.ts`) en
   * bepaalt dus niets. Het bestaat omdat V11 het enige voorstel uit de
   * copywriterronde is dat niet te tellen valt: "gebruik minimaal één concreet
   * herkenbaar scenario voordat je technische uitleg geeft" is een oordeel, geen
   * telling. Het cijfer wordt nu verzameld zodat de ijking hem later naast een
   * menselijk oordeel kan leggen; pas dán mag hij meewegen. Meten voordat je
   * stuurt, dezelfde volgorde als bij de drempels van de inputpoort.
   */
  herkenning: Beoordeling,
  /**
   * Zet de pagina een lezer aan tot de volgende stap?
   *
   * Alleen zinvol bij een commerciële pagina. Bij een kennisartikel of een FAQ
   * telt deze dimensie niet mee in het profiel (`quality-profile.ts`), maar het
   * cijfer wordt wel gevraagd: het kost niets extra en het is bruikbaar bij de
   * kalibratie later.
   */
  overtuiging: Beoordeling,
  /**
   * Zou jij deze tekst zonder aanpassing naar een klant sturen?
   *
   * De vraag die de eigenaar zelf stelt bij het beoordelen (herstelplan T2). Hij
   * staat hier zodat het model-oordeel later naast het menselijke oordeel gelegd
   * kan worden en de beoordelaar geijkt kan worden op wat een mens vindt.
   */
  wouldSendToClient: z.boolean(),
  /**
   * Wat een copywriter als EERSTE zou veranderen. Eén punt, niet vijf: dit is de
   * bevinding die het meeste oplevert, en de reparatiestap heeft hem nodig als
   * enkele opdracht en niet als lijst.
   */
  firstThingToChange: z.string(),
  /** De sectie waar dat eerste punt op slaat, zodat de reparatie hem kan vinden. */
  firstThingSection: z.string(),
});

export type CraftVerdict = z.infer<typeof CraftVerdict>;

/** Alle vakmanschapsdimensies op een rij, met de naam die de app ervoor gebruikt. */
export const CRAFT_DIMENSIES = [
  "specificiteit",
  "expertise",
  "diepgang",
  "originaliteit",
  "toon",
  "overtuiging",
] as const;

export type CraftDimensie = (typeof CRAFT_DIMENSIES)[number];
