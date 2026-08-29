/**
 * Wie er nooit in een prospectlijst mag staan (plan 9.5).
 *
 * ── WAAROM DIT HET GEVOELIGSTE STUK VAN DE HELE MODULE IS ───────────────────
 *
 * De andere risico's in dit plan kosten tijd of geld. Dit risico kost een klant.
 * Als wij Van X Makelaars in Eindhoven helpen zichtbaar te worden in
 * AI-antwoorden, kunnen we niet tegelijk zijn buurman verkopen dat hij Van X moet
 * inhalen. In een kleine markt hoort die klant dat, en het gaat lijnrecht in
 * tegen wat wij hem beloofd hebben.
 *
 * ── DE CONTROLE GEBEURT VÓÓR DE OPPORTUNITY, NIET VÓÓR DE MAIL ──────────────
 *
 * Plan 9.5, eerste zin: "de controle daarop gebeurt voordat er een opportunity
 * zichtbaar wordt, niet pas bij het versturen." Dat is geen voorkeur. Een
 * verkoper die een dossier heeft opengeslagen en zich heeft ingelezen, gaat
 * bellen; een waarschuwing op het laatste scherm komt dan te laat.
 *
 * ── UITGESLOTEN IS NIET WEGGEGOOID ──────────────────────────────────────────
 *
 * Een uitgesloten bedrijf blijft in de markt staan met de reden erbij. Zou het
 * verdwijnen, dan komt het bij de volgende meetronde gewoon weer boven als
 * nieuwe kans, en dan hebben we het werk voor niets gedaan en het risico terug.
 *
 * ⚠️ **Wat hier nog NIET in zit: `concurrent_van_klant`.** Dat vraagt meetdata,
 * want "de bedrijven die structureel tegenover onze klant staan" is pas te
 * bepalen als er gemeten is (sprint 3 en 4). Wat deze module vandaag wél doet is
 * de markt markeren zodra er een klant in zit, zodat de waarschuwing er staat
 * vóór er iemand belt. De keuze hoe streng we daarna zijn, hele markt op slot of
 * alleen de directe concurrenten, staat nog open en hoort vóór sprint 5 gemaakt
 * te zijn (plan 24.4, punt 3).
 *
 * Puur en zonder `server-only`, want dit oordeel bepaalt wie er benaderd wordt
 * (conventie 2).
 */

/** De vier soorten uitsluiting uit plan 9.5. */
export const UITSLUIT_SOORTEN = [
  "klant",
  "lopend_traject",
  "concurrent_van_klant",
  "do_not_contact",
] as const;

export type UitsluitSoort = (typeof UITSLUIT_SOORTEN)[number];

/** Wat de gebruiker leest, per soort. */
export const UITSLUIT_TEKST: Record<UitsluitSoort, string> = {
  klant: "Dit bedrijf is al klant van Outer Orbit.",
  lopend_traject: "Voor dit bedrijf staat al een traject klaar.",
  concurrent_van_klant: "Dit bedrijf is een directe concurrent van een klant van ons.",
  do_not_contact: "Dit bedrijf heeft aangegeven niet benaderd te willen worden.",
};

/** Een merk uit de klantomgeving, teruggebracht tot wat deze module ervan nodig heeft. */
export interface BekendMerk {
  profileId: string;
  /** Het genormaliseerde webadres. */
  domein: string | null;
  naam: string;
  /**
   * Is dit merk aan een klantaccount toegewezen?
   *
   * Dit is het verschil tussen een klant en een voorbereid traject. Het product
   * is sales-led: de consultant zet een merkprofiel klaar vóór het demogesprek en
   * wijst het pas ná de verkoop toe. Een merk zonder toewijzing is dus een
   * bedrijf waar al iemand mee bezig is, en dat is een even goede reden om er
   * niet ook vanuit Sales achteraan te gaan.
   */
  toegewezen: boolean;
}

/** Een bedrijf uit de Sales-module, teruggebracht tot wat deze module nodig heeft. */
export interface TeToetsenBedrijf {
  companyId: string;
  domein: string | null;
  doNotContact: boolean;
}

export interface Uitsluiting {
  companyId: string;
  kind: UitsluitSoort;
  reason: string;
  relatedProfileId: string | null;
}

/**
 * Welke bedrijven in deze markt moeten worden uitgesloten.
 *
 * ⚠️ **Matchen gebeurt op domein en niet op naam.** Twee bedrijven kunnen
 * dezelfde naam hebben en één bedrijf kan meerdere namen voeren; het webadres is
 * het enige dat uniek genoeg is om een klantrelatie aan op te hangen. Een
 * naamgelijkenis die per ongeluk raak is, zou een prospect wegstrepen die geen
 * klant is, en dat kost een gesprek zonder dat iemand het merkt.
 *
 * Een bedrijf zonder domein levert dus geen match op. Dat is de veilige kant:
 * zo'n bedrijf blijft in de lijst staan en de admin ziet het bij poort 1.
 */
export function bepaalUitsluitingen(
  bedrijven: readonly TeToetsenBedrijf[],
  merken: readonly BekendMerk[],
): Uitsluiting[] {
  const perDomein = new Map<string, BekendMerk>();
  for (const m of merken) {
    if (!m.domein) continue;
    // Een toegewezen merk wint van een niet-toegewezen merk op hetzelfde domein:
    // "is klant" is de zwaarste uitspraak van de twee.
    const bestaand = perDomein.get(m.domein);
    if (!bestaand || (!bestaand.toegewezen && m.toegewezen)) perDomein.set(m.domein, m);
  }

  const uit: Uitsluiting[] = [];
  for (const b of bedrijven) {
    // `do_not_contact` gaat vóór alles, want die is absoluut en permanent en
    // heeft geen tegenpartij nodig om te gelden.
    if (b.doNotContact) {
      uit.push({
        companyId: b.companyId,
        kind: "do_not_contact",
        reason: UITSLUIT_TEKST.do_not_contact,
        relatedProfileId: null,
      });
      continue;
    }

    const merk = b.domein ? perDomein.get(b.domein) : undefined;
    if (!merk) continue;

    const kind: UitsluitSoort = merk.toegewezen ? "klant" : "lopend_traject";
    uit.push({
      companyId: b.companyId,
      kind,
      reason: `${UITSLUIT_TEKST[kind]} Het gaat om ${merk.naam}.`,
      relatedProfileId: merk.profileId,
    });
  }
  return uit;
}

/**
 * De waarschuwing bij de markt zelf, of `null` als er niets aan de hand is.
 *
 * Plan 9.5: "een zichtbare waarschuwing bij elke opportunity in een markt waar
 * een klant zit, zodat de verkoper weet dat hij in gevoelig gebied werkt." Dit is
 * de tekst die daar komt te staan.
 *
 * ⚠️ Hij noemt het aantal en niet de namen. De namen staan bij de bedrijven zelf,
 * en een waarschuwing die uitgroeit tot een opsomming wordt niet meer gelezen.
 */
export function marktWaarschuwing(uitsluitingen: readonly Uitsluiting[]): string | null {
  const klanten = uitsluitingen.filter((u) => u.kind === "klant").length;
  const trajecten = uitsluitingen.filter((u) => u.kind === "lopend_traject").length;
  if (klanten === 0 && trajecten === 0) return null;

  const delen: string[] = [];
  if (klanten > 0) {
    delen.push(klanten === 1 ? "een klant van ons" : `${klanten} klanten van ons`);
  }
  if (trajecten > 0) {
    delen.push(trajecten === 1 ? "een lopend traject" : `${trajecten} lopende trajecten`);
  }

  return (
    `Let op: in deze markt zit ${delen.join(" en ")}. ` +
    "Werk hier voorzichtig. Wat je aan een prospect vertelt over zijn concurrenten, " +
    "gaat in een kleine markt rond."
  );
}
