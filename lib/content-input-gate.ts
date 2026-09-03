/**
 * De INPUTPOORT: kan deze pagina goed worden met wat we nu hebben?
 * (docs/tasks/vragen-voor-het-schrijven.md §4 en §6)
 *
 * ── TWEE POORTEN, TWEE VRAGEN ───────────────────────────────────────────────
 *
 * `content-final-gate.ts` vraagt "is dit af?" en staat NA het schrijven. Deze
 * poort vraagt "kan dit goed worden?" en staat ERVOOR, dus vóór het geld. Ze
 * blijven allebei bestaan en ze vervangen elkaar niet: de eindpoort bewaakt de
 * definitieve versie, deze poort bewaakt de dure schrijfaanroep.
 *
 * ── WAT HIJ AFWEEGT ─────────────────────────────────────────────────────────
 *
 * Eén getal: de onderbouwingsgraad uit `lib/pipeline/input-coverage.ts`, het
 * deel van de secties dat iets over dit bedrijf moet zeggen en dat ook kan.
 * Drie standen:
 *
 *   • 70% of hoger  → schrijven, openstaande vragen zijn winst voor later
 *   • 40% tot 70%   → schrijven mag, met een waarschuwing die de secties noemt
 *                     die eruit vallen
 *   • onder 40%     → niet schrijven, tenzij de klant kiest
 *
 * ⚠️ `null` (geen enkele merkgebonden sectie) is GEEN nul. Een pagina die
 * volledig uit algemene uitleg bestaat is een goede pagina waarvoor de klant
 * niets hoeft aan te leveren, en die hoort gewoon geschreven te worden
 * (conventie 3).
 *
 * ── WAAROM DIT GEEN MUUR IS ─────────────────────────────────────────────────
 *
 * `release-panel.tsx` legde vast: "een gate die je niet kunt passeren is een
 * muur, en muren leveren afgehaakte klanten op in plaats van betere content."
 * Deze poort houdt daarom niet de KLANT tegen maar het SCHRIJVEN, en er zijn
 * altijd drie uitwegen: de vragen beantwoorden, de pagina bewust algemeen laten
 * schrijven (`write_mode = 'algemeen'`, migratie 0087), of hem laten vallen. De
 * melding noemt ze in dezelfde zin als de blokkade, want een scherm dat alleen
 * zegt wat er niet kan is een dood einde (`docs/ux-design.md` §4).
 *
 * ── DE GRENZEN ZIJN EEN STARTWAARDE ─────────────────────────────────────────
 *
 * 40 en 70 zijn gekozen, niet gemeten: de onderbouwingsgraad bestond niet toen
 * de ronde van 1 september draaide, dus er is geen reeks om ze op te ijken. Ze
 * worden per pagina bewaard (`content_pieces.input_coverage`) naast de
 * uiteindelijke kwaliteitsscore, zodat ze na tien echte pagina's op data
 * bijgesteld kunnen worden. Zelfde afspraak als bij `DUPLICATE_THRESHOLD` in
 * `similarity.ts`.
 *
 * Puur en zonder `server-only` (conventie 2): de route gebruikt hem als
 * garantie, het scherm als melding, en `scripts/test-unit.ts` kan erbij.
 */

/** Boven deze graad schrijft de app zonder voorbehoud. */
export const GOED_GENOEG = 70;

/** Onder deze graad schrijft de app niet uit zichzelf. */
export const TE_WEINIG = 40;

/** Wat de klant koos toen de poort deze pagina tegenhield (migratie 0087). */
export type WriteMode = "algemeen" | null;

export type InputStand = "schrijven" | "waarschuwing" | "tegenhouden";

export interface InputOordeel {
  stand: InputStand;
  /** Mag de schrijfaanroep starten? Onwaar bij precies één stand. */
  mag: boolean;
  /** De onderbouwingsgraad die tot dit oordeel leidde, of null. */
  graad: number | null;
  /** Wat de klant leest. Altijd gevuld, ook als het mag. */
  melding: string;
}

export interface InputPoortInput {
  /** Uit `berekenInputCoverage`. `null` = geen merkgebonden sectie. */
  graad: number | null;
  /** Hoeveel merkgebonden secties nog geen feit hebben. */
  ongedekteSecties: number;
  /** De koppen van die secties, voor de melding. Hooguit de eerste drie tellen. */
  ongedekteKoppen?: readonly string[];
  /**
   * Hoeveel KERNsecties er nog geen bewijs hebben (migratie 0091).
   *
   * Een kernsectie is een sectie waarzonder de pagina zijn doel niet bereikt.
   * Ontbreekt daar het bewijs, dan is het niet meer de vraag of de pagina wat
   * dunner wordt: hij kan dan niet gepubliceerd worden. De melding zegt dat, ook
   * als de graad zelf ruim boven de drempel ligt.
   *
   * Weglaten werkt en verandert niets, en dat is bewust: een aanroeper die geen
   * gewogen dekking heeft (een pagina van vóór deze migratie) krijgt precies het
   * oordeel van voorheen (conventie 3).
   */
  kritiekeSectiesZonderBewijs?: number;
  /** Heeft de klant gekozen voor een algemene pagina zonder eigen cijfers? */
  writeMode?: WriteMode;
  /**
   * Is er een LEZER voor deze pagina? (V7, `lib/lezersopdracht.ts`)
   *
   * Onwaar betekent: geen doelomschrijving en geen enkele gemeten vraag, dus
   * niemand om voor te schrijven. Gemeten op de twaalf benchmarkpagina's van
   * 3 september 2026 was dat acht van de twaalf, en de externe copywriter wees
   * precies dat aan als het grootste probleem: teksten die alle mogelijke
   * lezers tegelijk bedienen en daardoor niemand.
   *
   * Weglaten werkt en verandert niets (conventie 3): een aanroeper die dit nog
   * niet meegeeft, krijgt exact het oordeel van voorheen.
   */
  heeftLezer?: boolean;
}

/** "de prijs, het werkgebied en de garantie" */
function somOp(koppen: readonly string[]): string {
  const namen = koppen.filter((k) => k?.trim()).slice(0, 3);
  if (namen.length === 0) return "";
  if (namen.length === 1) return namen[0];
  return `${namen.slice(0, -1).join(", ")} en ${namen[namen.length - 1]}`;
}

/**
 * Mag deze pagina geschreven worden?
 *
 * De aanroeper rekent de graad uit (die kent de feitenkaart en het contract);
 * deze functie weegt hem en schrijft de zin. Dezelfde verdeling als bij
 * `eindpoort()`.
 */
export function inputpoort(input: InputPoortInput): InputOordeel {
  const {
    graad,
    ongedekteSecties,
    ongedekteKoppen = [],
    kritiekeSectiesZonderBewijs = 0,
    writeMode = null,
    heeftLezer = true,
  } = input;

  // ── Geen lezer: dan valt er niets te schrijven (V7) ───────────────────────
  //
  // Deze staat bewust VÓÓR de keuze voor een algemene pagina. Die keuze
  // beantwoordt een andere vraag ("mag het zonder eigen cijfers"), niet deze
  // ("voor wie is het"), en een algemene uitleg heeft net zo goed een lezer
  // nodig. Ook vóór de graad, want een pagina kan 100 procent onderbouwd zijn
  // en nog steeds voor niemand geschreven worden. Dat is geen theorie: van de
  // twaalf pagina's van 3 september haalden er elf de graad en misten er acht
  // een lezer.
  //
  // Dit is geen muur (`release-panel.tsx`): de melding noemt drie uitwegen,
  // net als de ondergrens hieronder.
  if (!heeftLezer) {
    return {
      stand: "tegenhouden",
      mag: false,
      graad,
      melding:
        "Ik weet nog niet voor wie deze pagina is. Er staat geen omschrijving van de lezer bij, " +
        "en er hangt ook geen gemeten vraag aan. Dan wordt het een pagina die alles een beetje " +
        "behandelt en niemand verder helpt. Je kunt in één zin beschrijven wie hier komt en wat " +
        "die persoon wil weten, er een gemeten vraag aan koppelen, of deze pagina laten vallen.",
    };
  }

  // ── De klant heeft al gekozen ─────────────────────────────────────────────
  //
  // Kiest hij voor een algemene pagina, dan is er niets meer af te wegen: hij
  // weet dat er geen eigen cijfers in komen en wil hem toch. De poort een tweede
  // keer laten afgaan zou hetzelfde besluit twee keer vragen.
  if (writeMode === "algemeen") {
    return {
      stand: "schrijven",
      mag: true,
      graad,
      melding:
        "Deze pagina wordt geschreven als algemene uitleg over het onderwerp, zonder cijfers of " +
        "claims over jouw bedrijf. Beantwoord je later alsnog een vraag, dan kan hij scherper.",
    };
  }

  // ── Geen merkgebonden sectie: niets om op te wachten ──────────────────────
  if (graad === null) {
    return {
      stand: "schrijven",
      mag: true,
      graad: null,
      melding:
        "Deze pagina legt het onderwerp uit en vraagt niets van jou. Hij kan meteen geschreven " +
        "worden.",
    };
  }

  const koppen = somOp(ongedekteKoppen);
  const watMist = koppen ? ` Het gaat om: ${koppen}.` : "";

  // ── Een KERNsectie zonder bewijs weegt zwaarder dan het percentage ────────
  //
  // Punt 5 van de opdracht: 90 procent dekking kan alsnog slecht zijn wanneer
  // juist de belangrijkste claim niet onderbouwd is. `poortGraad()` levert in
  // dat geval al de kritieke dekking in plaats van de gewogen, dus de stand
  // klopt vanzelf; deze regel zorgt ervoor dat de MELDING het ook zegt, in
  // plaats van "er staat nog een vraag open die hem sterker maakt".
  if (kritiekeSectiesZonderBewijs > 0 && graad >= TE_WEINIG) {
    const aantal =
      kritiekeSectiesZonderBewijs === 1
        ? "Eén onderdeel dat deze pagina draagt"
        : `${kritiekeSectiesZonderBewijs} onderdelen die deze pagina dragen`;
    return {
      stand: "waarschuwing",
      mag: true,
      graad,
      melding:
        `${aantal} kan ik nog niet onderbouwen.${watMist} De pagina kan wel geschreven worden, ` +
        `maar hij is pas klaar voor publicatie als je hier antwoord op geeft.`,
    };
  }

  if (graad >= GOED_GENOEG) {
    return {
      stand: "schrijven",
      mag: true,
      graad,
      melding:
        ongedekteSecties > 0
          ? `Deze pagina kan geschreven worden. Er staat nog een vraag open die hem sterker ` +
            `maakt, maar hij is niet nodig om te beginnen.${watMist}`
          : "Deze pagina kan geschreven worden. Alles wat hij over jouw bedrijf beweert, kunnen " +
            "we onderbouwen.",
    };
  }

  if (graad >= TE_WEINIG) {
    const aantal =
      ongedekteSecties === 1
        ? "Eén stuk van deze pagina"
        : `${ongedekteSecties} stukken van deze pagina`;
    return {
      stand: "waarschuwing",
      mag: true,
      graad,
      melding:
        `${aantal} kan ik nu niet met jouw gegevens vullen, dus die laat ik weg. De pagina wordt ` +
        `daardoor korter.${watMist} Beantwoord je de vragen eerst, dan komen ze er wel op.`,
    };
  }

  // ── Onder de ondergrens: niet schrijven ───────────────────────────────────
  //
  // De melding noemt alle drie de uitwegen. Zonder die zin is dit een muur.
  return {
    stand: "tegenhouden",
    mag: false,
    graad,
    melding:
      `Deze pagina gaat bijna helemaal over jouw bedrijf, en daar heb ik nu te weinig van.${watMist} ` +
      "Met wat ik nu heb wordt het een algemeen artikel zonder één cijfer, en dat citeert geen " +
      "AI-assistent. Je kunt de vragen beantwoorden, hem bewust als algemene uitleg laten " +
      "schrijven, of hem laten vallen.",
  };
}

/** Wat de route terugstuurt als de poort dichtzit. Zelfde code als de eindpoort. */
export const INPUTPOORT_STATUS = 409;
