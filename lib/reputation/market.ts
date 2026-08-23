/**
 * De open marktvraag: wie raadt AI aan als een koper het vraagt?
 *
 * Bewust ZONDER `server-only` (conventie 2).
 *
 * ── ⚠️ WAAROM DIT DE BENOEMDE VERGELIJKING VERVANGT ─────────────────────────
 *
 * De eerste echte run heeft aangetoond dat een gedwongen rangschikking van
 * partijen die WIJ aandragen structureel niet werkt bij een regionaal bedrijf.
 * Bij Van den Udenhout kende ChatGPT geen van beide echte concurrenten:
 * Autobedrijf De Twee en SDL Automotive kwamen in nul van de acht oordelen als
 * bekend terug. Wat overbleef was de klant tegenover een autofabrikant, en dat
 * kwam als "eerste van twee" op het scherm.
 *
 * Dat is geen fout die je wegpoetst. Het is het verkeerde soort vraag, om drie
 * redenen die elkaar versterken:
 *
 *   1. Een model dat een partij niet kent, kan er niets over zeggen. De vraag
 *      is dan onbeantwoordbaar en levert per definitie ruis op.
 *   2. Wie de vergelijking wél overleeft, is de partij die bekend genoeg is. Dat
 *      zijn ketens en fabrikanten, en dus meet het blok de bekendheid van het
 *      model in plaats van de markt van de klant.
 *   3. Wij leggen de concurrentieset op, en die kwam uit gemeten vermeldingen
 *      die zelf al scheef konden zijn.
 *
 * ── DE VRAAG DIE WÉL WERKT ──────────────────────────────────────────────────
 *
 * Precies de vraag die een koper stelt: *"Ik zoek {dienst} in {regio}. Welke
 * bedrijven raad je aan?"* Vier dingen tegelijk opgelost:
 *
 *   • Het is een ECHTE marktvraag in plaats van een gedwongen oordeel.
 *   • Hij ONTDEKT concurrenten in plaats van ze aan te nemen. Wie AI noemt, ís
 *     de concurrent, en dat corrigeert zichzelf.
 *   • Hij kan niet stuklopen op onbekendheid: een bedrijf dat AI niet kent,
 *     noemt hij gewoon niet, en dat is zelf de uitkomst.
 *   • Hij meet rechtstreeks wat commercieel telt, namelijk of jij genoemd wordt
 *     en op welke plek.
 *
 * ⚠️ HET VERSCHIL MET DE BESTAANDE METING MOET SCHERP BLIJVEN. Die stelt dertig
 * koopvragen per cluster en telt in hoeveel antwoorden het merk voorkomt: een
 * frequentie over een brede set vragen. Dit stelt één expliciete keuzevraag per
 * DIENST en kijkt naar de VOLGORDE waarin AI de bedrijven noemt. Het eerste
 * antwoordt op "kom je voor", het tweede op "als hij moet kiezen, hoe vroeg noem
 * je hem dan". Loopt dat verschil in de praktijk dicht, dan horen ze samengevoegd
 * te worden in plaats van naast elkaar te bestaan.
 */

/** Eén bedrijf zoals AI het noemde, op zijn plek in de aanbeveling. */
export interface NamedCompany {
  name: string;
  /** Vanaf 1, de volgorde waarin AI ze noemde. */
  position: number;
  reason: string;
}

/**
 * Hoeveel bedrijven we hooguit meetellen per antwoord.
 *
 * Een model dat om aanbevelingen gevraagd wordt, geeft er vaak vijf tot acht.
 * Daarboven wordt het een opsomming van alles wat het kent, en dan zegt de
 * plek niets meer. Acht is ruim genoeg dat een klant die op plek zeven staat nog
 * geteld wordt, en krap genoeg dat de staart geen ruis toevoegt.
 */
export const MAX_NAMED = 8;

export interface MarketOutcome {
  /** De plek van de klant, vanaf 1. Null = niet genoemd. */
  ownPosition: number | null;
  /** Hoeveel bedrijven AI in totaal noemde. */
  ofParties: number;
  /** De andere bedrijven, in de volgorde waarin AI ze noemde. */
  rivals: NamedCompany[];
  /** Alle genoemde bedrijven, inclusief de klant, opgeschoond en ontdubbeld. */
  all: NamedCompany[];
}

/** Losse namen vergelijken zonder over hoofdletters of spaties te struikelen. */
function sleutel(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,]+$/, "");
}

/**
 * Herkent de klant tussen de genoemde bedrijven.
 *
 * ⚠️ Losjes, want AI schrijft "Van den Udenhout Den Bosch" waar het profiel
 * "Van den Udenhout" zegt. Te streng matchen betekent dat een klant die WÉL
 * genoemd is als niet-genoemd geldt, en dat is de duurste fout die dit blok kan
 * maken: dan staat er "AI raadt je niet aan" terwijl hij dat wel doet.
 */
function isOwn(name: string, ownNames: string[]): boolean {
  const n = sleutel(name);
  if (!n) return false;
  return ownNames.some((raw) => {
    const o = sleutel(raw);
    return Boolean(o) && (n === o || n.includes(o) || o.includes(n));
  });
}

/**
 * Zet de genoemde bedrijven om in een uitkomst.
 *
 * ⚠️ Drie vangnetten, en ze komen alle drie uit wat er bij de benoemde
 * vergelijking misging:
 *
 *   1. Ontdubbelen op naam. Een model dat "Van den Udenhout" en "Van den
 *      Udenhout Den Bosch" allebei noemt, heeft één bedrijf genoemd. Zonder dit
 *      telt de noemer te hoog en zakt de plek van iedereen.
 *   2. De klant komt hooguit één keer voor, op zijn VROEGSTE plek. Een model dat
 *      hem twee keer noemt, bedoelt hem één keer.
 *   3. Niet genoemd is `null` en niet de laatste plek. AI heeft dan geen oordeel
 *      geveld over dit bedrijf, en dat is iets anders dan een slecht oordeel
 *      (conventie 3).
 */
export function readMarketAnswer(
  named: NamedCompany[],
  ownNames: string[],
): MarketOutcome {
  const gezien = new Set<string>();
  const schoon: NamedCompany[] = [];

  for (const c of [...named].sort((a, b) => a.position - b.position)) {
    const naam = c.name.trim();
    const k = sleutel(naam);
    if (!naam || !k || gezien.has(k)) continue;

    // Vangnet 2: de klant onder een tweede schrijfwijze telt niet nog een keer.
    if (isOwn(naam, ownNames) && schoon.some((s) => isOwn(s.name, ownNames))) continue;

    gezien.add(k);
    schoon.push({ name: naam, position: schoon.length + 1, reason: c.reason?.trim() ?? "" });
    if (schoon.length >= MAX_NAMED) break;
  }

  const eigen = schoon.find((c) => isOwn(c.name, ownNames));

  return {
    ownPosition: eigen?.position ?? null,
    ofParties: schoon.length,
    rivals: schoon.filter((c) => !isOwn(c.name, ownNames)),
    all: schoon,
  };
}

export interface MarketSummary {
  /** Gemiddelde plek over alle marktvragen. Null als de klant nergens genoemd is. */
  position: number | null;
  /** De gebruikelijke lengte van het lijstje waaruit AI kiest. */
  of: number | null;
  /** Bij welk aandeel van de vragen de klant überhaupt voorkwam, 0 tot 1. */
  hitRate: number;
  /** De vaakst genoemde andere bedrijven, op frequentie. Dit is de ontdekte markt. */
  rivals: string[];
  /** Hoeveel marktvragen er meetelden. */
  answers: number;
}

/**
 * Vat de marktvragen samen over diensten heen.
 *
 * ⚠️ De TREFKANS staat los van de PLEK, en dat is de kern van dit blok. Een merk
 * dat bij één van de tien vragen genoemd wordt en dan op plek 1 staat, is iets
 * heel anders dan een merk dat bij alle tien genoemd wordt op plek 5. Het eerste
 * is een specialist in een niche, het tweede is een brede speler. Zou je alleen
 * de gemiddelde plek tonen, dan komt de specialist er als winnaar uit terwijl
 * hij bij negen van de tien koopvragen onzichtbaar is.
 */
export function summariseMarket(outcomes: MarketOutcome[]): MarketSummary {
  const bruikbaar = outcomes.filter((o) => o.ofParties > 0);
  if (bruikbaar.length === 0) {
    return { position: null, of: null, hitRate: 0, rivals: [], answers: 0 };
  }

  const genoemd = bruikbaar.filter((o) => o.ownPosition !== null);
  const position =
    genoemd.length > 0
      ? Math.round(
          (genoemd.reduce((s, o) => s + (o.ownPosition as number), 0) / genoemd.length) * 10,
        ) / 10
      : null;

  // De gebruikelijke lengte van het lijstje: de meest voorkomende noemer, niet
  // het gemiddelde. "Vierde van 5,3 bedrijven" is geen zin die je toont.
  const noemers = new Map<number, number>();
  for (const o of bruikbaar) noemers.set(o.ofParties, (noemers.get(o.ofParties) ?? 0) + 1);
  const of = [...noemers.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];

  // De ontdekte concurrenten, op hoe vaak AI ze noemde. Dít is de betrouwbare
  // concurrentieset: niet opgelegd maar waargenomen.
  const perNaam = new Map<string, { naam: string; keer: number }>();
  for (const o of bruikbaar) {
    for (const r of o.rivals) {
      const k = sleutel(r.name);
      const bestaand = perNaam.get(k);
      if (bestaand) bestaand.keer++;
      else perNaam.set(k, { naam: r.name, keer: 1 });
    }
  }

  return {
    position,
    of,
    hitRate: Math.round((genoemd.length / bruikbaar.length) * 100) / 100,
    rivals: [...perNaam.values()]
      .sort((a, b) => b.keer - a.keer || a.naam.localeCompare(b.naam))
      .slice(0, 10)
      .map((r) => r.naam),
    answers: bruikbaar.length,
  };
}

/**
 * De zin voor op het scherm. Dit is het commercieel scherpste getal dat dit
 * hele product heeft, dus de zin eronder moet kloppen.
 */
export function marketSentence(m: MarketSummary, brand: string): string {
  if (m.answers === 0) {
    return `ORBIT ENGINE heeft nog niet gevraagd wie AI aanraadt in de markt van ${brand}.`;
  }
  if (m.position === null) {
    return (
      `Als een koper vraagt wie hij moet hebben, noemt ChatGPT ${brand} bij geen van de ` +
      `${m.answers} gestelde vragen. Dat is de scherpste uitkomst van deze analyse: je bent ` +
      `niet zichtbaar op het moment dat iemand kiest.`
    );
  }

  const kans = Math.round(m.hitRate * 100);
  const deel =
    kans === 100
      ? `bij elke vraag`
      : `bij ${kans}% van de vragen`;

  return (
    `Als een koper vraagt wie hij moet hebben, noemt ChatGPT ${brand} ${deel}, gemiddeld op ` +
    `plek ${m.position} van ${m.of}.`
  );
}
