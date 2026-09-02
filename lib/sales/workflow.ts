/**
 * De saleswerkstroom: statussen, overgangen en het verzendplafond
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 17 en 16.6).
 *
 * ── WAAROM DE STATUSSEN EEN MACHINE ZIJN EN GEEN LIJSTJE ────────────────────
 *
 * Dezelfde reden als bij de markt (`lib/sales/market.ts`): een knop is te
 * omzeilen, een statusmachine niet. Hier weegt dat zwaarder, want twee van de
 * overgangen hebben gevolgen buiten de module. "Klant" maakt een merkprofiel aan
 * en start de onboarding (plan 17.4), en "afgewezen" zet de score van dit
 * bedrijf twaalf maanden lang op nul (plan 13.1). Een status die per ongeluk
 * gezet wordt, kost dus meer dan een verkeerd etiket.
 *
 * ── EN WAAROM ER GEEN STATUS "VERSTUREN" BESTAAT ────────────────────────────
 *
 * Plan 16.3, de vaste regel: de medewerker verstuurt de mail altijd zelf, vanuit
 * zijn eigen mailbox. `gemaild` betekent daarom "de medewerker heeft gemeld dat
 * hij hem verstuurd heeft", en er is geen stand die iets anders kán betekenen.
 * Zou er een stand "in de wachtrij" bestaan, dan bestaat er ergens ook een
 * proces dat die wachtrij leegt, en dat proces mag niet bestaan.
 *
 * Bewust ZONDER `server-only` (conventie 2).
 */

export const OUTREACH_STANDEN = [
  "nieuw",
  "toegewezen",
  "gemaild",
  "gereageerd",
  "gebeld",
  "gesprek",
  "gekwalificeerd",
  "klant",
  "afgewezen",
  "niet_nu",
] as const;

export type OutreachStand = (typeof OUTREACH_STANDEN)[number];

export function isOutreachStand(waarde: unknown): waarde is OutreachStand {
  return typeof waarde === "string" && (OUTREACH_STANDEN as readonly string[]).includes(waarde);
}

/** Wat een salesmedewerker leest, en wat er dan te doen valt. */
export const STAND_TEKST: Record<OutreachStand, { label: string; uitleg: string }> = {
  nieuw: { label: "Nieuw", uitleg: "Deze kans ligt er en niemand heeft hem opgepakt." },
  toegewezen: { label: "Van jou", uitleg: "Jij hebt deze kans. De conceptmail staat klaar." },
  gemaild: { label: "Gemaild", uitleg: "Je hebt de openingsmail zelf verstuurd. Nu wachten." },
  gereageerd: { label: "Gereageerd", uitleg: "Er kwam antwoord. Bel op basis van wat er staat." },
  gebeld: { label: "Gebeld", uitleg: "Je hebt gebeld. Leg vast wat eruit kwam." },
  gesprek: { label: "Gesprek gehad", uitleg: "Het eerste cijfer dat echt telt." },
  gekwalificeerd: { label: "Gekwalificeerd", uitleg: "Dit wordt waarschijnlijk een klant." },
  klant: { label: "Klant", uitleg: "Getekend, en gekoppeld aan een merkprofiel." },
  afgewezen: { label: "Afgewezen", uitleg: "Nee, met de reden erbij." },
  niet_nu: { label: "Niet nu", uitleg: "Later terugkomen, op de datum die je zette." },
};

/**
 * Welke stand mag op welke volgen.
 *
 * De trechter uit plan 17.1 loopt één kant op, met drie uitgangen die vanaf
 * bijna overal bereikbaar zijn: afgewezen, niet nu, en klant. Dat laatste
 * bewust ook vanuit `gesprek`: een prospect die na één gesprek ja zegt, hoeft
 * niet eerst door `gekwalificeerd` heen om administratief te kloppen.
 *
 * ⚠️ Terug kan niet, met één uitzondering: van `niet_nu` naar `toegewezen`. Dat
 * is precies waar de follow-updatum voor is. Zou de hele keten terug kunnen,
 * dan is de trechter uit hoofdstuk 18 niet meer te tellen: dan telt hetzelfde
 * bedrijf drie keer als "gesprek".
 */
const OVERGANGEN: Record<OutreachStand, readonly OutreachStand[]> = {
  nieuw: ["toegewezen", "afgewezen", "niet_nu"],
  toegewezen: ["gemaild", "gebeld", "afgewezen", "niet_nu"],
  gemaild: ["gereageerd", "gebeld", "afgewezen", "niet_nu"],
  gereageerd: ["gebeld", "gesprek", "afgewezen", "niet_nu"],
  gebeld: ["gesprek", "gereageerd", "afgewezen", "niet_nu"],
  gesprek: ["gekwalificeerd", "klant", "afgewezen", "niet_nu"],
  gekwalificeerd: ["klant", "afgewezen", "niet_nu"],
  klant: [],
  afgewezen: [],
  niet_nu: ["toegewezen"],
};

export function magOvergaanNaar(van: OutreachStand, naar: OutreachStand): boolean {
  return OVERGANGEN[van]?.includes(naar) ?? false;
}

export function volgendeStandenVoor(van: OutreachStand): readonly OutreachStand[] {
  return OVERGANGEN[van] ?? [];
}

/**
 * De redenen bij een afwijzing (plan 17.1).
 *
 * ⚠️ Een korte, vaste lijst en geen vrij veld. Vrije tekst mag erbij maar
 * vervangt de categorie niet: zonder categorie is niet te tellen welk soort
 * prospect afhaakt, en dan is de leerlus uit hoofdstuk 19 onmogelijk. Dat is
 * dezelfde regel als bij een afgewezen contentpagina in de klantomgeving.
 */
export const AFWIJS_REDENEN = [
  "geen_budget",
  "geen_interesse",
  "werkt_met_bureau",
  "te_klein",
  "verkeerde_persoon",
  "geen_reactie",
] as const;

export type AfwijsReden = (typeof AFWIJS_REDENEN)[number];

export const AFWIJS_LABEL: Record<AfwijsReden, string> = {
  geen_budget: "Geen budget",
  geen_interesse: "Geen interesse in GEO",
  werkt_met_bureau: "Werkt al met een bureau",
  te_klein: "Te klein",
  verkeerde_persoon: "Verkeerde persoon gesproken",
  geen_reactie: "Geen reactie na drie pogingen",
};

export function isAfwijsReden(waarde: unknown): waarde is AfwijsReden {
  return typeof waarde === "string" && (AFWIJS_REDENEN as readonly string[]).includes(waarde);
}

export interface StatusOordeel {
  ok: boolean;
  /** Wat er niet gebeurt en waarom. `null` als het mag. */
  melding: string | null;
}

/**
 * Mag deze statuswijziging?
 *
 * Drie controles, en de tweede is de belangrijkste: een afwijzing zonder reden
 * bestaat niet. De database dwingt dat ook af, maar een constraint-fout is een
 * 500 en dit is een zin die de verkoper kan lezen.
 */
export function beoordeelStatus(
  van: string,
  naar: string,
  reden: string | null,
): StatusOordeel {
  if (!isOutreachStand(van) || !isOutreachStand(naar)) {
    return { ok: false, melding: "Deze stand kent ORBIT ENGINE niet." };
  }
  if (van === naar) {
    return { ok: false, melding: "Deze stand staat er al." };
  }
  if (!magOvergaanNaar(van, naar)) {
    return {
      ok: false,
      melding:
        `Van "${STAND_TEKST[van].label}" naar "${STAND_TEKST[naar].label}" kan niet. ` +
        `Vanaf hier kun je naar: ${volgendeStandenVoor(van)
          .map((s) => STAND_TEKST[s].label)
          .join(", ")}.`,
    };
  }
  if (naar === "afgewezen" && !isAfwijsReden(reden)) {
    return {
      ok: false,
      melding:
        "Een afwijzing heeft een reden nodig. Kies er een uit de lijst; een toelichting mag erbij, " +
        "maar zonder categorie is later niet te zien welk soort prospect afhaakt.",
    };
  }
  return { ok: true, melding: null };
}

// ── Het verzendplafond (plan 16.6) ──────────────────────────────────────────

/**
 * Hoeveel concepten ORBIT ENGINE per persoon per dag klaarzet.
 *
 * ⚠️ **Dit is geen kostenrem maar een bescherming van het maildomein.** Gaan er
 * honderd berichten per week uit vanaf hetzelfde domein waarop ook de facturatie
 * loopt, dan kan één golf spamklachten dat domein afknijpen. Dan bereiken ook de
 * offertes hun bestemming niet, en dat merk je pas als het weken misgaat.
 *
 * Begin laag en verhoog pas als de cijfers laten zien dat er nauwelijks
 * stuiterende adressen en klachten zijn (plan 16.6, eerste maatregel).
 *
 * ⚠️ **Op 1 september 2026 door de eigenaar op 100 gezet**, tijdens de fase
 * waarin de hele app doorgetest wordt. Twintig bleek te laag om een dag werk mee
 * te doen. Wat daarbij nog openstaat, en wat belangrijker is dan dit getal: er
 * is nog geen apart subdomein voor acquisitiemail (plan 16.6, vierde
 * maatregel). Zolang dat er niet is, loopt koude mail over hetzelfde domein als
 * de facturatie, en dan is honderd per persoon per dag een bewuste gok in
 * plaats van een veilige stand.
 */
export const CONCEPTEN_PER_DAG = 100;

/**
 * Vanaf welk aandeel bounces en klachten het plafond automatisch omlaag gaat.
 *
 * Vijf procent is streng, en dat hoort: bij tien procent bounces ben je al aan
 * het bouwen aan een slechte reputatie, en die is maanden werk om te herstellen.
 */
export const SLECHT_AANDEEL = 0.05;

export interface DagCijfers {
  verstuurd: number;
  bounces: number;
  klachten: number;
  afmeldingen: number;
}

export interface PlafondOordeel {
  ok: boolean;
  /** Hoeveel concepten er vandaag nog bij mogen. */
  ruimte: number;
  melding: string | null;
}

/**
 * Mag ORBIT ENGINE vandaag nog een concept klaarzetten voor deze medewerker?
 *
 * Twee remmen. De eerste is het aantal; de tweede is wat er terugkwam. Loopt het
 * aandeel bounces en klachten op, dan halveert het plafond, want dan is het
 * domein al aan het beschadigen en is meer volume precies de verkeerde reactie.
 */
export function beoordeelPlafond(
  cijfers: DagCijfers,
  plafond: number = CONCEPTEN_PER_DAG,
): PlafondOordeel {
  const slecht = cijfers.bounces + cijfers.klachten;
  const aandeel = cijfers.verstuurd > 0 ? slecht / cijfers.verstuurd : 0;
  const effectief = aandeel > SLECHT_AANDEEL ? Math.floor(plafond / 2) : plafond;
  const ruimte = Math.max(0, effectief - cijfers.verstuurd);

  if (ruimte > 0) return { ok: true, ruimte, melding: null };

  return {
    ok: false,
    ruimte: 0,
    melding:
      aandeel > SLECHT_AANDEEL
        ? `Er zijn vandaag ${cijfers.verstuurd} mails uitgegaan en ${slecht} daarvan stuiterden of ` +
          "leverden een klacht op. Het plafond is daarom gehalveerd. Kijk eerst naar de adressen " +
          "voordat je verder gaat: een beschadigd maildomein raakt ook je offertes en facturen."
        : `Je hebt vandaag ${cijfers.verstuurd} concepten gehad en dat is het plafond. ` +
          "Morgen staan er weer nieuwe klaar. Dit beschermt het maildomein van Outer Orbit.",
  };
}

// ── De trechter (plan 18.1) ─────────────────────────────────────────────────

/**
 * De standen die meetellen als "bereikt" per trechterstap.
 *
 * ⚠️ Cumulatief en niet exclusief: wie op `gesprek` staat, is ook gemaild
 * geweest. Zou de trechter tellen op de huidige stand, dan zakt elke stap
 * zodra iemand doorschuift, en dan daalt "gemaild" terwijl er meer gemaild is.
 * Dat is de klassieke fout in een trechtergrafiek.
 */
const TRECHTER_VOLGORDE: OutreachStand[] = [
  "nieuw",
  "toegewezen",
  "gemaild",
  "gereageerd",
  "gebeld",
  "gesprek",
  "gekwalificeerd",
  "klant",
];

export interface TrechterStap {
  stand: OutreachStand;
  label: string;
  aantal: number;
  /** Aandeel van de vorige stap, als breuk. `null` bij de eerste stap. */
  conversie: number | null;
}

export function rekenTrechter(standen: string[]): TrechterStap[] {
  const bereikt = new Map<OutreachStand, number>();
  for (const stand of standen) {
    if (!isOutreachStand(stand)) continue;
    // Een afgewezen of uitgestelde kans telt mee tot waar hij gekomen is, en
    // niet verder. Zonder de bereikte stap te kennen zou hij helemaal uit de
    // trechter vallen, en dan lijkt de conversie beter dan hij is.
    const index = TRECHTER_VOLGORDE.indexOf(stand);
    const tot = index >= 0 ? index : bereiktBijUitgang(stand);
    for (let i = 0; i <= tot; i++) {
      const s = TRECHTER_VOLGORDE[i];
      bereikt.set(s, (bereikt.get(s) ?? 0) + 1);
    }
  }

  return TRECHTER_VOLGORDE.map((stand, i) => {
    const aantal = bereikt.get(stand) ?? 0;
    const vorige = i > 0 ? bereikt.get(TRECHTER_VOLGORDE[i - 1]) ?? 0 : 0;
    return {
      stand,
      label: STAND_TEKST[stand].label,
      aantal,
      conversie: i > 0 && vorige > 0 ? Number((aantal / vorige).toFixed(3)) : null,
    };
  });
}

/**
 * Tot welke trechterstap is een uitgang gekomen?
 *
 * Een afgewezen kans is minstens toegewezen geweest, anders was er niemand om af
 * te wijzen. Meer weten we uit de stand alleen niet, en meer beweren we dus ook
 * niet (conventie 3). Wie het precies wil weten, leest `sales_events`.
 */
function bereiktBijUitgang(stand: OutreachStand): number {
  if (stand === "afgewezen" || stand === "niet_nu") return 1;
  return 0;
}
