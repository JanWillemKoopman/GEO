/**
 * De marktontdekking: kandidaten samenvoegen, ontdubbelen en wegen.
 *
 * ── WAAROM DIT DE ZWAARSTE PURE MODULE VAN DE MODULE IS ─────────────────────
 *
 * Plan 24.3, eerste rij: "De marktafbakening klopt niet" staat er als het
 * grootste risico, want alles erna is dan verkeerd. Gemeten wordt er op deze
 * lijst, opportunities komen uit deze lijst, en er wordt op deze lijst gebeld.
 * Alles wat bepaalt wie erin komt, staat daarom hier: puur, zonder
 * `server-only`, en getest vanuit `scripts/test-unit.ts` (conventie 2).
 *
 * ── HET UITGANGSPUNT DAT ALLES STUURT (plan hoofdstuk 9) ────────────────────
 *
 * "Als we alleen de bedrijven verzamelen die ChatGPT en Gemini noemen, missen we
 * precies de bedrijven met het grootste GEO-probleem." Een bedrijf dat nergens
 * genoemd wordt is niet een bedrijf om over te slaan, het is de prospect. Twee
 * gevolgen die je overal in dit bestand terugziet:
 *
 *   1. Een bedrijf zonder website wordt niet weggegooid. Het krijgt geen domein
 *      en wordt op naam bijgehouden.
 *   2. De zekerheid komt uit het AANTAL ONAFHANKELIJKE VINDPLAATSEN, niet uit
 *      hoe bekend een bedrijf is.
 *
 * ── DE TWEE GRATIS BRONNEN VAN VANDAAG ──────────────────────────────────────
 *
 * Besluit 24 augustus 2026: eerst de bronnen die geen abonnement vragen. Dat
 * zijn er twee, en ze zijn echt van elkaar onafhankelijk:
 *
 *   `ai_websearch`   Een onderzoeksmodel dat het web doorzoekt en bedrijven
 *                    opsomt. Kost een AI-aanroep, geen abonnement.
 *   `bronpagina`     De ledenlijsten, vergelijkingssites en gemeentegidsen die
 *                    dat model aanwijst, daarna door onze eigen crawler
 *                    uitgelezen. Kost niets, en het is geen mening van een
 *                    model maar een link die er echt staat.
 *
 * ⚠️ **Wees eerlijk over wat dat wel en niet is.** Twee bronnen, niet vier. Het
 * kaartenregister en het handelsregister uit 9.1 kosten geld per opvraging en
 * staan daarom nog uit. Wat we vandaag hebben ondervangt het AI-vooroordeel maar
 * gedeeltelijk: een bedrijf dat op geen enkele lijst staat en geen website heeft,
 * vinden we nu niet. Dat hoort bij poort 1 gezegd te worden en niet weggemoffeld.
 */

/** Waar een kandidaat vandaan kwam. Het voorvoegsel `bronpagina:` draagt het domein erachter. */
export type OntdekBron = "ai_websearch" | `bronpagina:${string}`;

/** Waar de naam vandaan komt. Bepaalt hoeveel de admin eraan mag hechten bij poort 1. */
export type NaamHerkomst = "ai" | "bronpagina" | "crawl" | "domein";

/** Eén gevonden bedrijf, zoals een bron hem aanlevert. */
export interface Kandidaat {
  name: string;
  /** Rauw, mag een volledige URL zijn of leeg. */
  domain?: string | null;
  city?: string | null;
  bron: OntdekBron;
  naamHerkomst: NaamHerkomst;
  /** De pagina waarop dit bedrijf gevonden is. */
  evidenceUrl?: string | null;
}

/** Eén bedrijf nadat alle bronnen zijn samengevoegd. */
export interface SamengevoegdBedrijf {
  /** De sleutel waarop ontdubbeld is: het genormaliseerde domein, of `naam:...`. */
  sleutel: string;
  name: string;
  naamHerkomst: NaamHerkomst;
  domain: string | null;
  city: string | null;
  bronnen: string[];
  evidenceUrls: string[];
  confidence: Zekerheid;
}

export type Zekerheid = "hoog" | "middel" | "laag";

/**
 * Domeinen die nooit een prospect zijn.
 *
 * ⚠️ Dit is plan 9.2, derde toets, in code: "Een landelijk platform is geen
 * prospect maar een bron." Zonder deze lijst vult de eerste markt zich met
 * Facebook, de Kamer van Koophandel en de vergelijkingssite waar we de namen
 * juist vandáán hebben, en dan staat er bij poort 1 een lijst die de admin
 * eerst moet opschonen voordat hij aan het echte werk toekomt.
 *
 * Bewust een lijst met achtervoegsels en geen slimme regel: een platform
 * herkennen aan zijn gedrag vraagt data die we op dit punt niet hebben, en een
 * te slimme regel gooit een echt bedrijf weg. De lijst groeit per markt, en dat
 * is goedkoper dan een verkeerde gok.
 */
export const GEEN_PROSPECT_DOMEINEN = [
  // Sociale netwerken en kaarten
  "facebook.com", "instagram.com", "linkedin.com", "x.com", "twitter.com",
  "youtube.com", "tiktok.com", "pinterest.com", "whatsapp.com",
  "google.com", "google.nl", "goo.gl", "maps.app.goo.gl", "apple.com",
  // Naslag en overheid
  "wikipedia.org", "wikidata.org", "kvk.nl", "rijksoverheid.nl", "overheid.nl",
  "belastingdienst.nl", "cbs.nl", "ondernemersplein.nl",
  // Vergelijken, recenseren en adverteren
  "trustpilot.com", "klantenvertellen.nl", "feedbackcompany.com",
  "marktplaats.nl", "werkspot.nl", "trustoo.nl", "sortlist.nl",
  "gouden-gids.nl", "detelefoongids.nl", "openingstijden.nl",
  "indeed.com", "nationalevacaturebank.nl",
  // Portalen per branche. ⚠️ Dit is het deel dat per markt groeit, en dat is
  // met opzet: `funda.nl` is in de makelaarsmarkt een van de belangrijkste
  // BRONNEN en tegelijk geen enkele prospect. Elke nieuwe branche levert er
  // een paar op, en die erbij zetten is goedkoper dan een regel bedenken die
  // een platform aan zijn gedrag herkent en af en toe een echt bedrijf weggooit.
  "funda.nl", "jaap.nl", "huislijn.nl", "pararius.nl",
  "zorgkaartnederland.nl", "independer.nl", "autoscout24.nl", "autotrack.nl",
  "thuisbezorgd.nl", "booking.com", "tripadvisor.com", "iens.nl",
  // Nieuws en generieke uitgevers
  "nu.nl", "telegraaf.nl", "ad.nl", "volkskrant.nl", "nrc.nl", "rtlnieuws.nl",
  // ⚠️ Wat de eerste twee echte markten opleverden (1 september 2026). Elk van
  // deze stond als "bedrijf" in de lijst, met een score en al: de voorlichting
  // van de overheid, twee ondernemersorganisaties, het weerbericht, de
  // cookiedatabase van een plugin, de meldknop voor fraude, de kaartendienst
  // onderaan een gemeentegids, de webbouwer in de voettekst, en de
  // browserwaarschuwing van een verouderde site.
  "rvo.nl", "mkb.nl", "mkbservicedesk.nl", "ondernemersplein.nl",
  "knmi.nl", "buienradar.nl", "cookiedatabase.org", "cookiebot.com",
  "fraudehelpdesk.nl", "openstreetmap.org", "outdatedbrowser.com",
  "wa.me", "api.whatsapp.com", "milieucentraal.nl", "verbeterjehuis.nl",
  "eigenhuis.nl", "consumentenbond.nl", "techniekbedrijven.nl", "nvkl.nl",
  "installq.nl", "warmtepompgids.nl", "mkb-bedrijvengids.nl",
];

/**
 * Namen die geen bedrijfsnaam kunnen zijn, maar de tekst van een link.
 *
 * ⚠️ Ook uit de eerste twee markten. Onze eigen crawler leest de bronpagina's
 * uit en neemt de tekst van een link als naam over. Dat levert bedrijven op die
 * "Open website", "Lees meer over deze doeleinden" of "+31 6 13818383" heten, en
 * bij twee ECHTE installateurs stond letterlijk "Open website" als bedrijfsnaam
 * in de kans, in de score en in de conceptmail.
 *
 * Een naam die hierop lijkt, is geen naam. Het bedrijf gaat er niet uit: als er
 * een domein bij zit, wordt de naam uit het domein afgeleid (`naamUitDomein`),
 * en dat is te zien aan de herkomst.
 */
const GEEN_NAAM_PATRONEN = [
  /^open (de )?website$/i,
  /^lees meer/i,
  /^meer (informatie|lezen|weten)/i,
  /^bekijk /i,
  /^klik hier/i,
  /^(update|vernieuw) (mijn |je )?(web)?browser/i,
  /^website (door|van) /i,
  /^(bezoek|ga naar) /i,
  /^(volgende|vorige|terug|verder)$/i,
  /^\+?[\d\s()-]{7,}$/,
  /^(e-?mail|bel|telefoon|contact)$/i,
];

/** Is dit de tekst van een link in plaats van de naam van een bedrijf? */
export function isGeenBedrijfsnaam(naam: string | null | undefined): boolean {
  const tekst = (naam ?? "").trim();
  if (tekst.length === 0) return true;
  return GEEN_NAAM_PATRONEN.some((p) => p.test(tekst));
}

/**
 * Een adres terugbrengen tot een schone hostnaam, of `null`.
 *
 * Dit is de ontdubbelsleutel (plan 9.3), dus hij moet streng zijn: `www.` eraf,
 * pad eraf, kleine letters, en een subdomein blijft staan omdat
 * `praktijk.example.nl` en `example.nl` echt twee dingen kunnen zijn.
 *
 * Geeft `null` bij alles wat aantoonbaar geen webadres is. Conventie 3: liever
 * geen domein dan een verzonnen domein, want op het domein wordt ontdubbeld en
 * een fout domein voegt twee bedrijven samen die het niet zijn.
 */
export function normaliseerDomein(invoer: string | null | undefined): string | null {
  if (!invoer) return null;
  let s = invoer.trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^https?:\/\//, "").replace(/^www\./, "");
  // Pad, querystring en anker eraf: we willen de host en niets anders.
  s = s.split(/[/?#]/)[0];
  s = s.replace(/\.+$/, "");
  if (!s.includes(".") || /\s/.test(s)) return null;
  // Een host bestaat uit letters, cijfers, koppeltekens en punten. Alles daarbuiten
  // is geen host maar een stuk tekst waar toevallig een punt in staat.
  if (!/^[a-z0-9.-]+$/.test(s)) return null;
  const laatste = s.split(".").pop() ?? "";
  if (laatste.length < 2) return null;
  return s;
}

/** Is dit domein een platform of een naslagwerk in plaats van een prospect? */
export function isGeenProspect(domein: string | null): boolean {
  if (!domein) return false;
  return GEEN_PROSPECT_DOMEINEN.some((d) => domein === d || domein.endsWith(`.${d}`));
}

/**
 * Een leesbare naam uit een domein, voor als er niets beters is.
 *
 * `vanxmakelaars.nl` wordt "Vanxmakelaars". Dat is lelijk, en dat is precies de
 * bedoeling: het is zichtbaar afgeleid, het krijgt herkomst `domein`, en de
 * admin ziet bij poort 1 dat hier niemand een naam heeft opgeschreven.
 */
export function naamUitDomein(domein: string): string {
  const kern = domein.split(".")[0].replace(/[-_]+/g, " ").trim();
  if (!kern) return domein;
  return kern.charAt(0).toUpperCase() + kern.slice(1);
}

/**
 * Hoe zeker weten we dat dit bedrijf in deze markt hoort?
 *
 * Plan 9.1: "Een bedrijf uit drie onafhankelijke bronnen is zeker; een bedrijf
 * dat alleen een model noemde is dat niet, en die twijfel hoort zichtbaar te
 * zijn bij poort 1."
 *
 * ⚠️ **Eén bron is `laag`, ook als die ene bron het AI-model is.** Dat is met
 * opzet streng. Het model kan een bedrijf verzinnen dat plausibel klinkt, en een
 * verzonnen bedrijf in een verkoopmail is niet te herstellen. Een bevestiging van
 * een tweede, onafhankelijke plek tilt hem naar `middel`.
 */
export function zekerheidUitBronnen(bronnen: readonly string[]): Zekerheid {
  const uniek = new Set(bronnen).size;
  if (uniek >= 3) return "hoog";
  if (uniek === 2) return "middel";
  return "laag";
}

/** Welke naam wint als twee bronnen er een aanleveren. */
const NAAM_RANG: Record<NaamHerkomst, number> = {
  crawl: 4,
  bronpagina: 3,
  ai: 2,
  domein: 1,
};

/**
 * Alle kandidaten uit alle bronnen samenvoegen tot één lijst bedrijven.
 *
 * ── DE ONTDUBBELSLEUTEL (plan 9.3) ──────────────────────────────────────────
 *
 * Het genormaliseerde domein is de eerste sleutel. Twee vestigingen van dezelfde
 * keten op hetzelfde domein zijn één bedrijf; twee bedrijven met bijna dezelfde
 * naam op verschillende domeinen zijn er twee.
 *
 * Heeft een kandidaat geen domein, dan valt hij terug op zijn genormaliseerde
 * naam. Dat is minder betrouwbaar en dat is te zien: zo'n bedrijf houdt
 * `domain: null` en komt bij poort 1 met de vermelding dat er geen website is.
 *
 * ⚠️ **Bij twijfel voegen we NIET samen.** Het plan is daar expliciet over:
 * "Bij twijfel gaat het naar poort 1 in plaats van dat de code kiest, want een
 * verkeerd samengevoegd bedrijf levert een mail op die naar de verkeerde
 * vestiging gaat." Vandaar exacte sleutels en geen gelijkenisscore.
 *
 * @param normaliseerNaam De naamnormalisatie uit `lib/entities/`, meegegeven in
 *   plaats van geïmporteerd zodat deze module puur blijft en de test hem kan
 *   vervangen door iets eenvoudigers.
 */
export function voegKandidatenSamen(
  kandidaten: readonly Kandidaat[],
  normaliseerNaam: (naam: string) => string,
): SamengevoegdBedrijf[] {
  const perSleutel = new Map<string, SamengevoegdBedrijf>();

  for (const k of kandidaten) {
    // ⚠️ De tekst van een link is geen bedrijfsnaam (zie `isGeenBedrijfsnaam`).
    // Hij wordt weggegooid en niet het bedrijf: is er een domein, dan levert
    // `naamUitDomein()` hieronder een bruikbare naam, en dat is precies waarom
    // twee echte installateurs niet langer "Open website" heten.
    const naam = isGeenBedrijfsnaam(k.name) ? undefined : k.name?.trim();
    const domein = normaliseerDomein(k.domain);

    // Een kandidaat zonder naam én zonder domein is geen kandidaat. Dat is geen
    // strengheid maar rekenkunde: er valt niets mee te ontdubbelen en niets mee
    // te meten.
    if (!naam && !domein) continue;
    // Platforms tellen mee als bron, niet als prospect (plan 9.2, derde toets).
    if (isGeenProspect(domein)) continue;

    const sleutel = domein ?? `naam:${normaliseerNaam(naam ?? "")}`;
    if (sleutel === "naam:") continue;

    const bestaand = perSleutel.get(sleutel);
    const voorgesteldeNaam = naam || (domein ? naamUitDomein(domein) : "");
    const herkomst: NaamHerkomst = naam ? k.naamHerkomst : "domein";

    if (!bestaand) {
      perSleutel.set(sleutel, {
        sleutel,
        name: voorgesteldeNaam,
        naamHerkomst: herkomst,
        domain: domein,
        city: k.city?.trim() || null,
        bronnen: [k.bron],
        evidenceUrls: k.evidenceUrl ? [k.evidenceUrl] : [],
        confidence: "laag",
      });
      continue;
    }

    // De beste naam wint, en bij gelijke herkomst de langste: "Van X Makelaars"
    // zegt meer dan "Van X", en bij het meten tellen beide varianten toch mee.
    const beter =
      NAAM_RANG[herkomst] > NAAM_RANG[bestaand.naamHerkomst] ||
      (NAAM_RANG[herkomst] === NAAM_RANG[bestaand.naamHerkomst] &&
        voorgesteldeNaam.length > bestaand.name.length);
    if (beter && voorgesteldeNaam) {
      bestaand.name = voorgesteldeNaam;
      bestaand.naamHerkomst = herkomst;
    }
    // Een plaats die we nog niet hadden is winst; een afwijkende plaats
    // overschrijft niets, want dan weten we juist niet welke klopt.
    if (!bestaand.city && k.city?.trim()) bestaand.city = k.city.trim();
    if (!bestaand.bronnen.includes(k.bron)) bestaand.bronnen.push(k.bron);
    if (k.evidenceUrl && !bestaand.evidenceUrls.includes(k.evidenceUrl)) {
      bestaand.evidenceUrls.push(k.evidenceUrl);
    }
  }

  const uit = [...perSleutel.values()];
  for (const b of uit) b.confidence = zekerheidUitBronnen(b.bronnen);

  // Zeker bovenaan, en binnen dezelfde zekerheid op naam. Dat is de volgorde
  // waarin de admin bij poort 1 wil lezen: eerst wat vaststaat, dan wat aandacht
  // vraagt.
  const rang: Record<Zekerheid, number> = { hoog: 0, middel: 1, laag: 2 };
  uit.sort((a, b) => rang[a.confidence] - rang[b.confidence] || a.name.localeCompare(b.name, "nl"));
  return uit;
}

/**
 * De bedrijfsdomeinen uit een bronpagina halen.
 *
 * ── WAAROM LINKS EN GEEN LIJSTSTRUCTUUR ─────────────────────────────────────
 *
 * Elke ledenlijst en elke vergelijkingssite heeft zijn eigen opmaak, en een
 * parser per site is werk dat bij de eerste ontwerpwijziging van die site stuk
 * gaat. Uitgaande links zijn overal hetzelfde: een ledenlijst linkt naar zijn
 * leden. Dat is grover, en het is bestand tegen verandering.
 *
 * Wat er weggefilterd wordt: het eigen domein van de bronpagina (een menu linkt
 * vooral naar zichzelf), de platforms uit de lijst hierboven, en alles zonder
 * bruikbare host. Wat overblijft is een kandidaat, geen bedrijf: poort 1
 * beslist.
 *
 * De linktekst gaat mee als naam. Op een ledenlijst ís die tekst de bedrijfsnaam,
 * en dat scheelt een extra netwerkverzoek per bedrijf.
 */
export function bedrijvenUitBronpagina(
  html: string,
  bronUrl: string,
  max = 200,
): Kandidaat[] {
  const bronDomein = normaliseerDomein(bronUrl);
  const bron: OntdekBron = `bronpagina:${bronDomein ?? bronUrl}`;
  const gezien = new Set<string>();
  const uit: Kandidaat[] = [];

  const linkPatroon = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkPatroon.exec(html)) !== null && uit.length < max) {
    const href = m[1];
    // Alleen absolute links naar buiten. Een relatieve link wijst per definitie
    // naar de bronpagina zelf en levert dus nooit een ander bedrijf op.
    if (!/^https?:\/\//i.test(href)) continue;

    const domein = normaliseerDomein(href);
    if (!domein) continue;
    if (domein === bronDomein) continue;
    // Ook een subdomein van de bronpagina is de bronpagina.
    if (bronDomein && domein.endsWith(`.${bronDomein}`)) continue;
    if (isGeenProspect(domein)) continue;
    if (gezien.has(domein)) continue;
    gezien.add(domein);

    const tekst = m[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();

    // Linktekst die het bedrijf niet benoemt ("lees meer", "bezoek website", of
    // simpelweg de URL) is geen naam. Dan valt de naam terug op het domein en is
    // dat ook zichtbaar.
    const bruikbaar =
      tekst.length >= 2 &&
      tekst.length <= 80 &&
      !/^https?:\/\//i.test(tekst) &&
      !/^(lees meer|meer info(rmatie)?|website|bekijk|bezoek|klik hier|hier)$/i.test(tekst);

    uit.push({
      name: bruikbaar ? tekst : naamUitDomein(domein),
      domain: domein,
      bron,
      naamHerkomst: bruikbaar ? "bronpagina" : "domein",
      evidenceUrl: bronUrl,
    });
  }

  return uit;
}

/**
 * Wat er van een markt nodig is om hem te kunnen ontdekken.
 *
 * Bewust een eigen vorm en niet de databaserij: deze module hoort niets van de
 * database te weten, anders is hij niet testbaar zonder.
 */
export interface MarktRij {
  id: string;
  label: string;
  industry: string;
  location: string;
  radius_km: number;
  country: string;
  status: string;
}

/**
 * De vraag aan het onderzoeksmodel.
 *
 * ⚠️ **Drie dingen staan er bewust in, en één ding staat er bewust niet in.**
 *
 * Wél: de opdracht om ook kleine en slecht vindbare bedrijven te noemen, de
 * opdracht om per bedrijf de vindplaats te geven, en de opdracht om de
 * overzichtspagina's zélf terug te geven. Dat laatste is wat de tweede bron
 * mogelijk maakt.
 *
 * Niet: enige suggestie dat bekendheid meetelt. Vraag je om "de belangrijkste
 * spelers", dan krijg je de bedrijven die al zichtbaar zijn, en dat is precies
 * de lijst die we niet nodig hebben.
 *
 * Puur, dus testbaar. De prompt is een uitkomstbepalende tekst, en de fout die
 * dit voorkomt is dat iemand er ooit "de bekendste" van maakt.
 */
export function bouwOntdekVraag(markt: MarktRij): string {
  return (
    `Ik breng de markt voor ${markt.industry} in en rond ${markt.location} ` +
    `(${markt.country}, straal ongeveer ${markt.radius_km} kilometer) volledig in kaart. ` +
    `Zoek op het web en geef een zo COMPLEET mogelijke lijst van bedrijven die daar ` +
    `${markt.industry} aanbieden.\n\n` +
    `Belangrijk:\n` +
    `1. Volledigheid gaat boven bekendheid. Neem juist ook kleine bedrijven, eenmanszaken ` +
    `en bedrijven met een slechte of ontbrekende website mee. Die zijn voor dit onderzoek ` +
    `het belangrijkst.\n` +
    `2. Geef per bedrijf de pagina waarop je het gevonden hebt. Vind je geen bron, laat het ` +
    `veld dan leeg. Verzin geen bedrijven en verzin geen webadressen.\n` +
    `3. Geef daarnaast de overzichtspagina's zelf terug: ledenlijsten van brancheverenigingen, ` +
    `gemeentegidsen, vergelijkingssites en bedrijvengidsen die deze markt beschrijven. ` +
    `Die lijst is net zo belangrijk als de bedrijven.\n` +
    `4. Neem geen landelijke platforms, vergelijkingssites of portalen op als bedrijf. ` +
    `Dat zijn bronnen, geen aanbieders.\n` +
    `5. Zeg in de kanttekening waar je onzeker over bent, bijvoorbeeld welk deel van de markt ` +
    `je waarschijnlijk niet gezien hebt. Antwoord in het Nederlands.`
  );
}

/**
 * Waar dit bedrijf vandaan komt, in gewone taal.
 *
 * Dit staat bij poort 1 op het scherm en het is het enige wat de admin heeft om
 * een zekerheidslabel te wegen. "Zekerheid: laag" zonder uitleg is een oordeel
 * dat je moet geloven; "alleen genoemd door het onderzoeksmodel" is er een die je
 * kunt controleren.
 */
export function beschrijfHerkomst(b: SamengevoegdBedrijf): string {
  const paginas = b.bronnen.filter((x) => x.startsWith("bronpagina:")).length;
  const viaAi = b.bronnen.includes("ai_websearch");

  if (viaAi && paginas > 0) {
    return `Gevonden door het onderzoek en bevestigd op ${paginas === 1 ? "1 overzichtspagina" : `${paginas} overzichtspagina's`}.`;
  }
  if (paginas > 1) return `Gevonden op ${paginas} overzichtspagina's.`;
  if (paginas === 1) return "Gevonden op 1 overzichtspagina.";
  if (viaAi) return "Alleen genoemd door het onderzoek, nergens anders bevestigd.";
  return "Herkomst onbekend.";
}
