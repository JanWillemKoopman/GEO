/**
 * De marktdefinitie: het adres, de naam, de invoercontrole en de zes standen.
 *
 * ── WAAROM DIT EEN PURE MODULE IS ───────────────────────────────────────────
 *
 * Conventie 2: alles wat de uitkomst bepaalt staat in een apart, importeerbaar
 * bestand zonder `server-only`, anders is het niet te testen vanuit
 * `scripts/test-unit.ts`. Hier gaat dat over drie dingen die stuk voor stuk
 * blijvende gevolgen hebben:
 *
 *   1. Het adres van een markt is ook het PUBLIEKE adres (sprint 6). Een adres
 *      dat na publicatie verandert, is een gebroken link in elke mail die er al
 *      uit is. Dus de regel die hem maakt moet vastliggen en getest zijn.
 *   2. De invoercontrole bepaalt wat er de marktontdekking in gaat, en dat is
 *      de duurste fout die deze module kan maken (plan 24.3, eerste rij).
 *   3. De statusmachine bepaalt of een markt de twee goedkeuringspoorten kan
 *      overslaan. Dat mag nooit, en "mag nooit" hoort in code en niet in een UI.
 *
 * Zie `docs/tasks/geo-prospect-engine.md` §7.1 voor het datamodel eronder.
 */

/** De zes standen uit plan 7.1, in de volgorde waarin ze doorlopen worden. */
export const MARKT_STANDEN = [
  "concept",
  "bedrijven_gevonden",
  "wacht_op_goedkeuring",
  "meet",
  "klaar",
  "mislukt",
] as const;

export type MarktStand = (typeof MARKT_STANDEN)[number];

/** De standaardstraal rond de plaats, in kilometers (plan 7.1). */
export const STRAAL_STANDAARD = 15;
/** Onder de 1 is het geen markt, boven de 250 is het geen straal meer maar het land. */
export const STRAAL_MIN = 1;
export const STRAAL_MAX = 250;

/** Wat een branche of plaats minimaal en maximaal mag zijn. */
const TEKST_MIN = 2;
const TEKST_MAX = 80;

/**
 * Wat sales leest bij elke stand, en wat er dan te doen valt.
 *
 * Twee velden en geen drie: het label staat in de lijst, de zin eronder zegt
 * wie er aan zet is. Richtlijn 4 uit `docs/schrijfstijl.md`: een korte titel met
 * precies één regel die zegt wat je eraan hebt.
 */
export const MARKT_STAND_TEKST: Record<MarktStand, { label: string; uitleg: string }> = {
  concept: {
    label: "Concept",
    uitleg: "De markt staat klaar. Het onderzoek is nog niet gestart.",
  },
  bedrijven_gevonden: {
    label: "Bedrijven gevonden",
    uitleg: "ORBIT ENGINE heeft de markt in kaart gebracht. De lijst wacht op controle.",
  },
  wacht_op_goedkeuring: {
    label: "Wacht op jou",
    uitleg: "Kijk de vragen en de kostenraming na, dan start de meting.",
  },
  meet: {
    label: "Meet",
    uitleg: "ORBIT ENGINE stelt de vragen aan de AI-assistenten. Je kunt dit scherm sluiten.",
  },
  klaar: {
    label: "Klaar",
    uitleg: "De meting is rond. De kansen staan bij Opportunities.",
  },
  mislukt: {
    label: "Niet gelukt",
    uitleg: "Er ging iets mis. Wat er ontbreekt staat bij de markt zelf.",
  },
};

/**
 * Welke stand mag op welke volgen.
 *
 * ⚠️ **Dit is de code-garantie onder de twee goedkeuringspoorten** (plan 8.1).
 * `bedrijven_gevonden` kan niet rechtstreeks naar `meet`: daar zit poort 1
 * tussen, waar de admin de bedrijvenlijst nakijkt. Zonder deze tabel is dat een
 * knop die iemand kan overslaan, en dan wordt er gemeten op een markt waar vier
 * bedrijven in de verkeerde plaats zitten. Dat kost geld en het levert een
 * gesprek op dat begint met een correctie.
 *
 * `klaar` mag terug naar `meet`: dat is hermeten (sprint 7), en dat is geen
 * uitzondering maar de kern van de economie van deze module.
 *
 * `mislukt` mag terug naar `concept`: opnieuw proberen moet kunnen, en dan
 * begint de markt weer aan het begin in plaats van halverwege.
 */
const OVERGANGEN: Record<MarktStand, readonly MarktStand[]> = {
  concept: ["bedrijven_gevonden", "mislukt"],
  bedrijven_gevonden: ["wacht_op_goedkeuring", "mislukt"],
  wacht_op_goedkeuring: ["meet", "bedrijven_gevonden", "mislukt"],
  meet: ["klaar", "mislukt"],
  klaar: ["meet"],
  mislukt: ["concept"],
};

/**
 * Wat de admin op het scherm leest, gegeven de stand én of poort 1 al door is.
 *
 * ── WAAROM DIT NAAST DE STAND STAAT EN NIET IN DE STAND ZIT ─────────────────
 *
 * De zes standen uit plan 7.1 lopen van concept tot klaar, maar er zitten TWEE
 * goedkeuringspoorten in de keten en maar één stand die daarover gaat. Tussen
 * poort 1 (de bedrijvenlijst) en poort 2 (de vragen en de kostenraming) zit werk
 * dat niet meet en niet wacht: de sites van de goedgekeurde bedrijven worden
 * uitgelezen.
 *
 * Dat had een zevende stand kunnen worden. Dat is niet gedaan, want een stand
 * toevoegen betekent een constraint wijzigen, een statusmachine uitbreiden en
 * elke lezer aanpassen, voor iets wat uit twee bestaande velden af te leiden is:
 * de stand plus `approved_at`. Een afgeleid gegeven hoort niet als kolom opnieuw
 * opgeslagen te worden, want dan lopen de twee uit elkaar.
 *
 * ⚠️ Wat er vandaag NIET is: alles ná de crawlverrijking. Intenties, vragen en
 * poort 2 komen in sprint 3. Deze functie zegt dat ook, in plaats van te
 * suggereren dat er vanzelf gemeten gaat worden.
 */
export function marktFase(markt: {
  status: string;
  approved_at?: string | null;
}): { label: string; uitleg: string } {
  if (!isMarktStand(markt.status)) {
    return {
      label: "Onbekende stand",
      uitleg: "Deze stand kent ORBIT ENGINE niet.",
    };
  }
  if (markt.status === "wacht_op_goedkeuring" && markt.approved_at) {
    return {
      label: "Goedgekeurd",
      uitleg:
        "Je hebt de bedrijvenlijst goedgekeurd. ORBIT ENGINE leest nu de site van elk bedrijf uit. " +
        "Het meten zelf wordt gebouwd.",
    };
  }
  return MARKT_STAND_TEKST[markt.status];
}

/** Mag een markt van deze stand naar die stand? Zichzelf is geen overgang. */
export function magOvergaan(van: MarktStand, naar: MarktStand): boolean {
  return OVERGANGEN[van]?.includes(naar) ?? false;
}

/** Alle standen die vanaf hier bereikbaar zijn, voor een scherm dat knoppen toont. */
export function volgendeStanden(van: MarktStand): readonly MarktStand[] {
  return OVERGANGEN[van] ?? [];
}

/** Is dit een geldige stand? Beschermt tegen een waarde uit de database die niet meer bestaat. */
export function isMarktStand(waarde: unknown): waarde is MarktStand {
  return typeof waarde === "string" && (MARKT_STANDEN as readonly string[]).includes(waarde);
}

/**
 * Diakritische tekens weghalen, zodat "Café" en "Cafe" hetzelfde adres krijgen.
 *
 * `normalize("NFD")` splitst é in e plus een los accent; de vervanging haalt dat
 * losse accent weg. Dat werkt voor het hele Latijnse bereik en niet alleen voor
 * de vijf tekens die je toevallig bedenkt.
 */
function zonderAccenten(tekst: string): string {
  return tekst.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Het adres van een markt: `makelaar-eindhoven`.
 *
 * ⚠️ Dit adres wordt straks publiek (plan hoofdstuk 20 en les A uit hoofdstuk
 * 23). Publieke adressen die achteraf veranderen zijn duur: elke verstuurde mail
 * wijst dan naar een pagina die er niet meer is. Vandaar dat de regel hier staat
 * en niet in de route die de markt aanmaakt.
 *
 * Alles buiten a-z en 0-9 wordt een koppelteken, en opeenvolgende koppeltekens
 * worden er één. Zo levert "'s-Hertogenbosch" `s-hertogenbosch` op en niet
 * `-s-hertogenbosch` met een streepje ervoor.
 *
 * Geeft een lege string terug als er niets bruikbaars overblijft. Dat is
 * conventie 3: liever niets dan een verzonnen adres. De aanroeper hoort daarop
 * te controleren, en `controleerMarktInvoer()` doet dat.
 */
export function maakSlug(...delen: string[]): string {
  return zonderAccenten(delen.join(" "))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Een uniek adres, door een volgnummer toe te voegen zolang het al bestaat.
 *
 * Twee markten "makelaar Eindhoven" naast elkaar mag: de tweede kan een andere
 * straal of een ander moment hebben. Ze mogen alleen niet hetzelfde adres
 * krijgen, want dan overschrijft de publieke pagina van de één die van de ander.
 */
export function uniekeSlug(basis: string, bezet: readonly string[]): string {
  const genomen = new Set(bezet);
  if (!genomen.has(basis)) return basis;
  let n = 2;
  while (genomen.has(`${basis}-${n}`)) n++;
  return `${basis}-${n}`;
}

/**
 * De naam die sales leest, afgeleid uit de invoer: "Makelaar Eindhoven".
 *
 * ⚠️ **Bewust geen meervoud.** Het plan schrijft "Makelaars Eindhoven", en dat
 * leest prettiger, maar een meervoud automatisch maken is in het Nederlands een
 * gok: makelaar wordt makelaars, monteur wordt monteurs, en glazenwasser wordt
 * glazenwassers, maar architect wordt architecten en fysiotherapeut wordt
 * fysiotherapeuten. Dat is conventie 3: onbekend is een betere waarde dan een
 * verkeerde. Wie "Makelaars Eindhoven" wil, typt het label zelf; dit is alleen
 * het voorstel dat in het veld staat.
 */
export function standaardLabel(branche: string, plaats: string): string {
  const woorden = `${branche.trim()} ${plaats.trim()}`.trim().split(/\s+/).filter(Boolean);
  return woorden.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

/** Wat de gebruiker invulde bij "nieuwe markt". */
export interface MarktInvoer {
  branche: string;
  plaats: string;
  straalKm: number;
  /** Leeg = het voorstel uit `standaardLabel()` wordt gebruikt. */
  label?: string;
}

/** Wat er van de invoer overblijft, of waarom niet. */
export type MarktInvoerUitkomst =
  | {
      ok: true;
      branche: string;
      plaats: string;
      straalKm: number;
      label: string;
      slug: string;
    }
  | { ok: false; melding: string; veld: "branche" | "plaats" | "straalKm" };

/**
 * De invoercontrole, met een melding per veld.
 *
 * K2 uit `docs/logbook.md`: elke foutmelding is specifiek en zegt wat je moet
 * doen. "Ongeldige invoer" is hier geen optie, want de fout die dit voorkomt is
 * niet "iemand typt onzin" maar "iemand typt iets wat er redelijk uitziet en er
 * volgt een marktonderzoek van tien euro op".
 */
export function controleerMarktInvoer(invoer: MarktInvoer): MarktInvoerUitkomst {
  const branche = invoer.branche.trim().replace(/\s+/g, " ");
  const plaats = invoer.plaats.trim().replace(/\s+/g, " ");

  if (branche.length < TEKST_MIN) {
    return {
      ok: false,
      veld: "branche",
      melding: "Vul de branche in, bijvoorbeeld makelaar of tandarts.",
    };
  }
  if (branche.length > TEKST_MAX) {
    return {
      ok: false,
      veld: "branche",
      melding: `Houd de branche onder de ${TEKST_MAX} tekens. Eén beroep, geen omschrijving.`,
    };
  }
  if (plaats.length < TEKST_MIN) {
    return {
      ok: false,
      veld: "plaats",
      melding: "Vul de plaats in, bijvoorbeeld Eindhoven.",
    };
  }
  if (plaats.length > TEKST_MAX) {
    return {
      ok: false,
      veld: "plaats",
      melding: `Houd de plaats onder de ${TEKST_MAX} tekens.`,
    };
  }

  if (!Number.isInteger(invoer.straalKm)) {
    return {
      ok: false,
      veld: "straalKm",
      melding: "De straal is een heel aantal kilometers.",
    };
  }
  if (invoer.straalKm < STRAAL_MIN || invoer.straalKm > STRAAL_MAX) {
    return {
      ok: false,
      veld: "straalKm",
      melding: `Kies een straal tussen ${STRAAL_MIN} en ${STRAAL_MAX} kilometer. Standaard is ${STRAAL_STANDAARD}.`,
    };
  }

  const slug = maakSlug(branche, plaats);
  if (!slug) {
    // Alles wegvallen kan echt: iemand typt "///" in beide velden. Dan is er
    // geen adres te maken en dus ook geen markt, en dat zeggen we hardop.
    return {
      ok: false,
      veld: "branche",
      melding: "Gebruik letters of cijfers in de branche en de plaats.",
    };
  }

  const label = invoer.label?.trim() || standaardLabel(branche, plaats);
  return { ok: true, branche, plaats, straalKm: invoer.straalKm, label, slug };
}
