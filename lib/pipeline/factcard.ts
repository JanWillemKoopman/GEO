/**
 * De feitenkaart, de gesloten lijst beweringen die de schrijver mag doen
 * (contentbriefing.md §3.1 en §9, implementatieplan.md R5.1/R5.3).
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * De eerste echte end-to-end run (Van den Udenhout, "Private Lease Skoda",
 * 28 juli) leverde drie goed geschreven pagina's op. Bij het narekenen van elke
 * bewering tegen de brondata bleken er van de 16 beweringen 5 verzonnen en 1
 * ongeverifieerd:
 *
 *   ❌ "Pechhulp inbegrepen"
 *   ❌ "Vervangend vervoer bij onderhoud of schade"
 *   ❌ "Schadeherstel inbegrepen in je maandbedrag"
 *   ❌ "Leasecontracten mogelijk vanaf 24 maanden"
 *   ❌ "Keuze uit diverse kilometerbundels"
 *
 * Het model verzint niet willekeurig. Het verzint precies daar waar een pagina
 * een concreet feit NODIG heeft en de brondata het niet levert: voorwaarden,
 * looptijden, wat er wel en niet in het pakket zit. Dat zijn exact de dingen die
 * de klant zonder nadenken kan beantwoorden.
 *
 * De oude aanpak gaf de schrijver een open context met "gebruik deze feiten waar
 * ze passen". Dat is een uitnodiging, geen grens. De feitenkaart draait het om:
 * een genummerde, gesloten lijst, en alles wat er niet op staat mag niet beweerd
 * worden.
 *
 * ── VERBODEN ZIJN OOK FEITEN ────────────────────────────────────────────────
 *
 * Antwoordt de klant "nee, pechhulp zit er niet in", dan is dat geen ontbrekend
 * feit maar een VERBOD. Zonder dat onderscheid zou het model bij een ontkennend
 * antwoord alsnog kunnen redeneren dat het er waarschijnlijk wel in zit. Vandaar
 * `allowed: false`. Die regels gaan als expliciet verbod de prompt in.
 *
 * Bewust ZONDER `server-only`: pure opmaak en pure validatie, testbaar in een
 * kaal script, zelfde patroon als evidence-format.ts en question-share.ts.
 */

/** Eén feit op de kaart. `ref` is het F-nummer waarnaar de content verwijst. */
export interface FactItem {
  /** "F1", "F2", …, het nummer waarmee de schrijver dit feit aanhaalt. */
  ref: string;
  /**
   * Het id in de feitenbank (`brand_facts`, migratie 0036).
   *
   * Het F-nummer is een POSITIE: "F3" betekent "het derde citeerbare feit in
   * deze lijst", en voeg je er één toe dan schuift alles. Dit id is de
   * IDENTITEIT: hetzelfde feit houdt hetzelfde id, ook als de nummering
   * verschuift. Daarmee is achteraf aanwijsbaar naar wélk feit een bewering
   * verwees, en niet alleen naar welke plek in een lijst.
   *
   * Optioneel: feiten die niet in de bank staan (achtergrondblokken, en kaarten
   * van vóór 0036) hebben er geen.
   */
  id?: string | null;
  /** De bewering zelf, in gewone taal. */
  text: string;
  /** Waar het vandaan komt: "site /acties/lease", "klant, bevestigd 29-07". */
  source: string;
  /**
   * false = dit is een VERBOD, geen bruikbaar feit. De klant heeft expliciet
   * gezegd dat dit niet zo is (of niet beweerd mag worden).
   */
  allowed: boolean;
  /**
   * Mag dit item als BRON voor een bewering dienen? (verificatie 31 juli)
   *
   * Niet alles wat we weten is een feit. Een lap sitetekst van 400 tekens of een
   * samenvatting van het onderwerp-onderzoek is CONTEXT: bruikbaar om over te
   * schrijven, onbruikbaar om iets mee te bewijzen. Bij de eerste echte
   * briefingronde verwezen 6 van de 7 beweringen naar hetzelfde blok
   * ("Wat de site over dit onderwerp zegt: …"), één alibi dat alles dekte, dus
   * nul vragen aan de klant. Precies het tegenovergestelde van de bedoeling.
   *
   * Alleen ATOMAIRE, controleerbare uitspraken zijn citeerbaar: één bewering per
   * regel, kort genoeg om na te lopen. Die krijgen een F-nummer; de rest komt
   * onder ACHTERGROND te staan, zonder nummer, expliciet niet als bron.
   */
  citable: boolean;
}

/** Bron-categorie, alleen om de kaart te kunnen sorteren op betrouwbaarheid. */
export type FactSourceKind = "klant" | "site" | "onderzoek";

/**
 * De volgorde waarin feiten op de kaart komen. Door de klant bevestigde feiten
 * bovenaan: die zijn het betrouwbaarst én het meest onderscheidend, en wat
 * bovenaan een prompt staat wordt het best gebruikt.
 */
export const SOURCE_ORDER: Record<FactSourceKind, number> = {
  klant: 0,
  site: 1,
  onderzoek: 2,
};

/**
 * Nummert een reeks feiten tot F1, F2, … in de meegegeven volgorde.
 *
 * Losgetrokken van het opbouwen zelf zodat het nummeren één plek heeft: het
 * F-nummer is de sleutel waarmee de content later naar z'n bron verwijst, en
 * twee feiten met hetzelfde nummer maken die hele traceerbaarheid waardeloos.
 */
export function numberFacts(items: Omit<FactItem, "ref">[]): FactItem[] {
  // Alleen citeerbare items krijgen een nummer. Achtergrond hoort geen F-nummer
  // te hebben, een nummer is precies de uitnodiging om ernaar te verwijzen.
  let n = 0;
  return items.map((item) => ({ ...item, ref: item.citable ? `F${++n}` : "" }));
}

/** Een feit vóór het nummeren; `kind` bepaalt alleen de volgorde op de kaart. */
export interface RawFact {
  text: string;
  source: string;
  allowed: boolean;
  citable: boolean;
  kind: FactSourceKind;
}

/**
 * Een antwoord van de klant omzetten naar een feit, of naar een VERBOD.
 *
 * Dit is het subtielste stukje van de hele briefing. Antwoordt de klant "nee" op
 * "zit pechhulp in het maandbedrag?", dan is dat geen ontbrekend feit maar het
 * antwoord dat de bewering verbiedt. Zonder dit onderscheid zou het model bij een
 * ontkennend antwoord alsnog kunnen redeneren dat het er waarschijnlijk wel in
 * zit. Precies de fout uit de Udenhout-run, maar dan mét een antwoord in de hand.
 */
export function factFromAnswer(row: {
  question: string;
  answer: string | null;
  answer_type: string;
  answered_at: string | null;
}): RawFact | null {
  const antwoord = (row.answer ?? "").trim();
  if (!antwoord) return null;

  const datum = row.answered_at ? new Date(row.answered_at).toLocaleDateString("nl-NL") : "onbekend";
  const bron = `klant, bevestigd ${datum}`;
  const vraag = row.question.replace(/\?$/, "").trim();

  // Een ja of nee-antwoord is pas een bruikbaar feit als je de vraag erbij zet;
  // los is "nee" nietszeggend.
  if (row.answer_type === "ja_nee") {
    const ontkennend = /^(nee|nej|nope|niet|geen|onjuist|klopt niet)\b/i.test(antwoord);
    return {
      text: ontkennend ? `${vraag}: NEE` : `${vraag}: ja`,
      source: bron,
      allowed: !ontkennend,
      // Antwoorden van de klant zijn per definitie atomair: één vraag, één feit.
      citable: true,
      kind: "klant",
    };
  }

  return { text: `${vraag}: ${antwoord}`, source: bron, allowed: true, citable: true, kind: "klant" };
}

/** Een antwoord van de klant, klaar om in een bestaande kaart te worden gevoegd. */
export interface AnsweredFactInput {
  /** De vraag zelf, de sleutel waarop een ouder antwoord wordt vervangen. */
  question: string;
  fact: RawFact;
  /**
   * Het id uit de feitenbank (migratie 0036), als het antwoord daar staat.
   *
   * Zonder dit zou elk antwoord dat ná de briefing binnenkwam alsnog zonder
   * identiteit op de kaart belanden, en juist die antwoorden zijn de reden dat
   * deze functie bestaat. Een bewering die naar zo'n feit verwijst zou dan geen
   * `factId` in `claims_json` krijgen en achteraf niet na te trekken zijn.
   */
  id?: string | null;
}

/**
 * De antwoorden van de klant alsnog in de feitenkaart voegen (R8.1).
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * De contentronde van 31 juli legde het zwaarste gat van het hele traject bloot:
 * wat een klant in het briefingscherm invult, kwam niet in de geschreven pagina
 * terecht. De keten is namelijk: de claim-audit BEVRIEST de feitenkaart → de
 * klant beantwoordt de vragen (die alleen `fact_requests` bijwerken) → de
 * schrijver leest de BEVROREN kaart. Alles wat de klant daartussen invulde,
 * bestond voor de schrijver niet.
 *
 * Concreet gemeten: op de vraag "biedt Fysi-Unique een preventief
 * nazorgprogramma?" stond met bron bevestigd "nee, niet als apart benoemd
 * programma". De gepubliceerde pagina opende met "Fysi-Unique biedt preventieve
 * begeleiding na herstel van een hardloopblessure". Geen gok bij gebrek aan
 * informatie, maar een directe tegenspraak van een bevestigd antwoord.
 *
 * ── EEN NIEUWER ANTWOORD VERSLAAT EEN OUDER ─────────────────────────────────
 *
 * De bevroren kaart bevat vaak al een antwoord op dezelfde vraag (van vóór de
 * briefing). Corrigeert de klant dat antwoord, dan moeten die twee elkaar niet
 * tegenspreken op één kaart. Daarom vervangt een nieuw antwoord het oude op
 * basis van de VRAAG, niet van de antwoordtekst. Anders zou "…: ja" naast
 * "…: NEE" belanden en mag het model kiezen.
 *
 * Alleen feiten met bron 'klant' worden zo vervangen. Een proof point uit de
 * site die toevallig met dezelfde woorden begint, blijft staan.
 */
export function mergeAnsweredFacts(
  frozen: FactItem[],
  answered: AnsweredFactInput[],
): FactItem[] {
  if (answered.length === 0) return frozen;

  const vervangen = answered.map((a) => normalizeForQuote(a.question)).filter(Boolean);

  const behouden = frozen.filter((f) => {
    // Alleen antwoorden van de klant kunnen achterhaald raken door een nieuwer
    // antwoord; sitetekst en onderzoek niet.
    if (!f.source.toLowerCase().startsWith("klant")) return true;
    const tekst = normalizeForQuote(f.text);
    return !vervangen.some((vraag) => vraag.length > 0 && tekst.startsWith(vraag));
  });

  // Antwoorden van de klant vooraan: dat is de volgorde die buildFactBase ook
  // aanhoudt (SOURCE_ORDER), en wat bovenaan een prompt staat wordt het best
  // gebruikt. Opnieuw nummeren omdat er items bij komen én weggaan, een
  // F-nummer dat naar twee verschillende feiten wijst maakt de hele
  // traceerbaarheid waardeloos.
  //
  // Het bank-id gaat MEE. Alleen `ref` wordt opnieuw bepaald, want dat is de
  // positie; de identiteit van een feit verandert niet doordat er iets vóór komt
  // te staan (migratie 0036).
  const samen: Omit<FactItem, "ref">[] = [
    ...answered.map((a) => ({
      id: a.id ?? null,
      text: a.fact.text,
      source: a.fact.source,
      allowed: a.fact.allowed,
      citable: a.fact.citable,
    })),
    ...behouden.map((f) => ({
      id: f.id ?? null,
      text: f.text,
      source: f.source,
      allowed: f.allowed,
      citable: f.citable,
    })),
  ];

  return numberFacts(samen);
}

/**
 * De feitenkaart zoals hij in de schrijfprompt komt (contentbriefing.md §9).
 *
 * Verboden staan in een apart blok en niet tussen de feiten. Een regel
 * "F5 Pechhulp: NIET inbegrepen" tussen de bruikbare feiten leest een model als
 * materiaal om mee te werken; onder een kop "MAG JE NIET BEWEREN" leest het als
 * een grens. Dat verschil is precies waar het in de Udenhout-run misging.
 */
export function formatFactCard(facts: FactItem[]): string {
  const bruikbaar = facts.filter((f) => f.allowed && f.citable);
  const verboden = facts.filter((f) => !f.allowed);
  const achtergrond = facts.filter((f) => f.allowed && !f.citable);

  const regels: string[] = [];

  regels.push("FEITENKAART: de ENIGE toegestane bron van beweringen over deze klant");
  regels.push("─".repeat(70));

  if (bruikbaar.length === 0) {
    regels.push(
      "(leeg: er zijn geen bevestigde feiten over deze klant)\n" +
        "Schrijf uitsluitend algemene uitleg over het onderwerp. Doe GEEN ENKELE concrete " +
        "bewering over dit bedrijf: geen prijzen, geen aantallen, geen voorwaarden, geen " +
        "openingstijden, geen beloftes over wat er wel of niet bij zit.",
    );
  } else {
    for (const f of bruikbaar) {
      regels.push(`${f.ref}  ${f.text}`.padEnd(60) + `bron: ${f.source}`);
    }
  }

  if (verboden.length > 0) {
    regels.push("");
    regels.push("⛔ MAG JE NIET BEWEREN: de klant heeft dit expliciet ontkend of verboden:");
    for (const f of verboden) {
      regels.push(`    • ${f.text}   (bron: ${f.source})`);
    }
    regels.push(
      "    Schrijf hier niet over. Ook niet impliciet, ook niet als vraag in een FAQ, " +
        "ook niet met een slag om de arm.",
    );
  }

  if (achtergrond.length > 0) {
    regels.push("");
    regels.push(
      "ACHTERGROND: GEEN BRON. Dit is losse sitetekst en onderzoek, bedoeld om de context " +
        "en de toon te begrijpen. Het heeft met opzet GEEN F-nummer: je mag er geen enkele " +
        "bewering op baseren. Staat een feit hier wél in maar niet op de kaart hierboven, dan " +
        "is het niet bevestigd en schrijf je het niet op:",
    );
    for (const f of achtergrond) {
      regels.push(`    ~ ${f.text}   (${f.source})`);
    }
  }

  regels.push("─".repeat(70));
  regels.push(
    "REGELS BIJ DEZE KAART:\n" +
      "1. Elke feitelijke bewering over deze klant moet herleidbaar zijn tot een F-nummer.\n" +
      "2. Staat iets niet op de kaart, dan schrijf je er niet over. Niet gladstrijken, niet " +
      "aannemen, niet 'logisch invullen'. Een pagina die iets NIET noemt is beter dan een " +
      "pagina die het verzint.\n" +
      "3. Generieke uitleg over het onderwerp (hoe dit in het algemeen werkt) mag zonder " +
      "F-nummer, zolang er geen belofte van deze klant in zit.\n" +
      "4. Lever bij elke concrete bewering over de klant het F-nummer dat hem dekt.",
  );

  return regels.join("\n");
}

/**
 * Controleert of een `sourceRef` uit de claim-audit écht naar een feit op de
 * kaart wijst.
 *
 * **Het model mag zichzelf niet vrijpleiten** (contentbriefing.md §3.2). Een
 * optimistisch model markeert een claim als `supported: true` met een vage of
 * verzonnen verwijzing, en dan zou de vraag die dat gat moest dichten nooit
 * gesteld worden. Precies het gat waar het in de Udenhout-run doorheen glipte.
 * Vandaar dat de dekking in CODE bepaald wordt en niet door het model: geen
 * geldig F-nummer op de kaart betekent onbewezen, wat het model er ook van vindt.
 *
 * Een verwijzing naar een VERBOD telt óók niet als dekking: "pechhulp zit er niet
 * in" onderbouwt de bewering "pechhulp is inbegrepen" niet, het weerlegt hem.
 */
export function isSupported(
  sourceRef: string | null | undefined,
  facts: FactItem[],
  /**
   * Het letterlijke fragment uit dat feit dat de bewering dekt. Meegeven maakt
   * de controle veel strenger, zie de toelichting hieronder.
   */
  supportQuote?: string | null,
): boolean {
  if (!sourceRef) return false;

  // ── ÉÉN BEWERING KAN OP MEERDERE FEITEN STEUNEN (R8.3) ───────────────────
  //
  // De contentronde van 31 juli legde het spiegelbeeld van de citaatplicht
  // bloot: een claim die WÉL correct onderbouwd was telde als NIET onderbouwd,
  // puur omdat het model twee feiten tegelijk aanwees. Concreet bij Van der
  // Valk: factRef "F1, F2" voor "combineert 150 jaar gastvrijheid met meer dan
  // 100 hotels". Er bestaat geen feit met ref "F1, F2", alleen F1 en F2 los,
  // dus vond de lookup niets en gold de claim als onbewezen. Dat vertekende 2
  // van de 10 gemeten pagina's (source_coverage 80 en 50 in plaats van 100).
  //
  // Het model doet hier niets fouts: het combineren van twee bevestigde feiten
  // in één zin is precies wat een goede tekst doet. De controle moet daarop
  // ingericht zijn, niet de tekst op de controle.
  const refs = splitRefs(sourceRef);
  if (refs.length === 0) return false;

  // ELK genoemd nummer moet bestaan én citeerbaar zijn. Bewust streng: zou één
  // geldig nummer volstaan, dan kan een model zijn dekking optillen door een
  // echt nummer aan te vullen met verzonnen nummers, en dan meet de dekking
  // opnieuw niets (zelfde redenering als bij de claim-audit hierboven).
  const gevonden = refs.map((ref) =>
    facts.find((f) => f.allowed && f.citable && f.ref.toUpperCase() === ref),
  );
  if (gevonden.some((f) => !f)) return false;
  const feiten = gevonden as FactItem[];

  if (supportQuote === undefined) return true;

  // ── DE CITAATPLICHT (verificatie 31 juli) ────────────────────────────────
  //
  // Bestaan van het F-nummer bleek niet genoeg. Bij de eerste echte briefing
  // verwezen 6 van de 7 beweringen naar hetzelfde blok sitetekst: het nummer
  // bestond, dus alles gold als onderbouwd en er werd geen enkele vraag
  // gesteld. De code controleerde bestáán, niet dekking.
  //
  // Nu moet het model het letterlijke fragment noemen dat de bewering dekt, en
  // dat fragment moet écht in dat feit staan. Zelfde principe als het
  // bewijsdossier (R1.1) en de concurrentprofielen (R4.2): wat niet na te
  // trekken is, mag niet gezegd worden. Een blok tekst aanwijzen kan nog steeds,
  // maar dan moet de aangewezen zin er ook echt in staan.
  //
  // Bij meerdere feiten levert het model ook een samengesteld citaat op ("citaat
  // uit F1; citaat uit F2"). Elk deel moet in minstens één van de aangewezen
  // feiten staan, zo blijft de eis "wijs de dekkende zin aan" overeind, ook als
  // de bewering op twee bronnen rust.
  const delen = splitQuote(supportQuote ?? "");
  if (delen.length === 0) return false;
  return delen.every(
    (deel) =>
      deel.length >= MIN_QUOTE_CHARS &&
      feiten.some((f) => normalizeForQuote(f.text).includes(normalizeForQuote(deel))),
  );
}

/** Een citaat korter dan dit wijst niets aan en telt niet als onderbouwing. */
const MIN_QUOTE_CHARS = 4;

/**
 * Praat deze zin OVER de site in plaats van namens het bedrijf?
 * (contentronde-gasservice-brabant-1-september-2026.md, verbetering 8)
 *
 * ── WAT ER MIS GAAT ─────────────────────────────────────────────────────────
 *
 * De feitenkaart bevat zinnen als "De website presenteert de onderneming als
 * Gasservice Brabant B.V." en "Gasservice Brabant vermeldt dat het 24/7
 * bereikbaar is". Regel 2 van `CONTENT_SYSTEM` eist dat de schrijver het
 * dekkende fragment letterlijk kan aanwijzen, dus neemt hij die vorm over. Op de
 * pagina van de klant kwam daardoor te staan: "De website van Gasservice Brabant
 * noemt ervaren vakmannen, meer dan 90 jaar ervaring, erkenning als installateur
 * en een BRL6000-25-certificaat." Een site die in de derde persoon over zichzelf
 * praat.
 *
 * ── WAAROM DIT EEN CONTROLE IS EN GEEN HERSCHRIJVING ────────────────────────
 *
 * De eerste opzet knipte de aanloop eraf. Dat werkt niet in het Nederlands: na
 * "vermeldt dat" volgt een bijzin met het werkwoord achteraan, dus "Gasservice
 * Brabant vermeldt dat het 24/7 bereikbaar is" wordt "Het 24/7 bereikbaar is".
 * Een half feit is erger dan een omslachtig feit (conventie 3).
 *
 * De verdeling is daarmee zoals hij hoort: het MODEL levert de bewering in de
 * goede vorm aan (de instructie staat in `synthesis.ts`), en de CODE garandeert
 * dat de rapportagevorm nooit op de PAGINA belandt (`content-gate.ts`). Een
 * promptinstructie is een intentie, code is een garantie, en de garantie zit
 * waar de schade zou ontstaan.
 */
const RAPPORTAGE_OVER_ZICHZELF =
  /\b(de|onze|zijn|haar)\s+(website|site|homepage|webpagina)\b[^.]{0,60}\b(vermeldt|vermeldt dat|noemt|zegt|meldt|geeft aan|presenteert|toont|schrijft)\b/i;

/** Staat er in deze tekst een zin die over de eigen site praat in plaats van namens het bedrijf? */
export function isRapportageVorm(tekst: string): boolean {
  return RAPPORTAGE_OVER_ZICHZELF.test(tekst ?? "");
}

/**
 * "F1, F2" / "F4; F5" / "F1 en F2" → ["F1", "F2"].
 *
 * Het model krijgt geen strak formaat opgelegd voor `factRef` (dat is een vrij
 * tekstveld in het schema), dus de scheidingstekens die het in de praktijk
 * gebruikt worden hier alle drie afgevangen. Alleen echte F-nummers blijven
 * over: losse woorden als "en" mogen de "elk nummer moet bestaan"-eis niet
 * laten klappen.
 */
export function splitRefs(raw: string): string[] {
  return Array.from(new Set(raw.toUpperCase().match(/F\s*\d+/g) ?? [])).map((r) =>
    r.replace(/\s+/g, ""),
  );
}

/** Een samengesteld citaat opsplitsen in de delen die apart aanwijsbaar moeten zijn. */
function splitQuote(raw: string): string[] {
  return raw
    .split(/\s*[;|]\s*|\s+\/\s+/)
    .map((deel) => deel.trim())
    .filter(Boolean);
}

/**
 * Losjes vergelijken: hoofdletters, accenten en witruimte mogen afwijken.
 *
 * Geëxporteerd sinds S1, omdat twee controles buiten dit bestand exact dezelfde
 * maatstaf moeten gebruiken: `atom-verify.ts` (staat deze zin écht in de
 * brontekst?) en `claim-extract.ts` (hoort deze getagde bewering bij deze zin?).
 * Twee net verschillende normalisaties zouden betekenen dat een feit de ene
 * controle haalt en de andere niet.
 */
export function normalizeForQuote(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Eén bewering uit de geschreven pagina, met het F-nummer dat hem dekt. */
export interface WrittenClaim {
  claim: string;
  factRef: string;
  /**
   * Het feit-id achter `factRef`, ingevuld door de CODE bij het opslaan (0036).
   *
   * Het model levert alleen het F-nummer. Dat is de handle die het kent. De
   * code zoekt daar het feit bij op en legt het id vast, zodat een bewering ook
   * over een jaar nog naar hetzelfde feit wijst als de kaart intussen is
   * gegroeid.
   */
  factId?: string | null;
  /** Het letterlijke fragment uit dat feit dat de bewering dekt (citaatplicht). */
  quote?: string | null;
}

/**
 * Hoeveel van de concrete beweringen in de tekst zijn écht herleidbaar?
 * (contentbriefing.md §9, implementatieplan.md R5.3)
 *
 * ── WAAROM DIT DE `geo_score` VERVANGT ──────────────────────────────────────
 *
 * De bestaande `geo_score` gaf in de praktijktest voor alle drie de pagina's
 * 100, inclusief de pagina met vijf verzonnen feiten. Een cijfer dat nooit
 * differentieert meet niets. Bronnendekking differentieert wél: het is het
 * percentage beweringen waarvan de herkomst aanwijsbaar is.
 *
 * Net als bij de claim-audit wordt de dekking in CODE bepaald en niet door het
 * model. Een verwijzing naar een F-nummer dat niet bestaat, of naar een verbod,
 * telt niet mee. Anders zou een model de eigen score kunnen optillen door
 * plausibele nummers te noemen, en dan meet het cijfer opnieuw niets.
 *
 * Geen enkele bewering opleveren geeft `null`, niet 100. "Ik heb niets beweerd"
 * is geen perfecte dekking maar een ontbrekend oordeel, en `null` is de enige
 * eerlijke weergave daarvan.
 */
export function sourceCoverage(
  claims: WrittenClaim[],
  facts: FactItem[],
): { coverage: number | null; unsupported: WrittenClaim[] } {
  const echt = claims.filter((c) => c.claim?.trim());
  if (echt.length === 0) return { coverage: null, unsupported: [] };

  const unsupported = echt.filter((c) => !isSupported(c.factRef, facts, c.quote ?? null));
  const gedekt = echt.length - unsupported.length;
  return { coverage: Math.round((gedekt / echt.length) * 100), unsupported };
}

/**
 * De ontdubbelsleutel van een claim (contentbriefing.md §3.4).
 *
 * Vragen drie gekozen pagina's alle drie naar "wat zit er in het maandbedrag",
 * dan moet dat één vraag worden. Drie keer hetzelfde beantwoorden is precies het
 * soort wrijving dat README.md §2 verbiedt.
 *
 * Bewust grofkorrelig: leestekens en meervouds-s eruit, alles kleine letters.
 * Liever twee net-verschillende vragen samenvoegen dan de klant twee keer
 * hetzelfde vragen, de kosten van die twee fouten zijn niet gelijk.
 */
export function claimKey(claim: string): string {
  return claim
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    // Korte functiewoorden eruit ("is", "de", "een"): of de klant nu "pechhulp
    // is inbegrepen" of "inbegrepen: pechhulp" leest, het is dezelfde vraag.
    .filter((woord) => woord.length > 2)
    // Ruwe meervoudsafkapping. Nederlands kent 'en' en 's'; de lengtegrenzen
    // houden korte woorden ("even", "les") heel.
    .map((woord) => {
      if (woord.length > 5 && woord.endsWith("en")) return woord.slice(0, -2);
      if (woord.length > 3 && woord.endsWith("s")) return woord.slice(0, -1);
      return woord;
    })
    .sort()
    .join(" ");
}

/** Hoeveel kernwoorden het onderwerp van een vraag bepalen. */
const TOPIC_WOORDEN = 3;

/**
 * De ONDERWERP-sleutel van een vraag (R8.4).
 *
 * `claimKey` ontdubbelt op woordniveau en is daar goed in, maar hij struikelt
 * over zinsbouw. In de contentronde van 31 juli leverde dat bij Fysi-Unique
 * **17 openstaande vragen voor 2 pagina's** op, terwijl het er in werkelijkheid
 * 5 à 6 waren. Drie voorbeelden die alle drie een andere `claimKey` kregen:
 *
 *   "Biedt Fysi-Unique preventieve begeleiding na herstel van hardloopblessures?
 *    Zo ja, welke specifieke diensten?"
 *   "Welke preventieve begeleiding biedt Fysi-Unique na herstel van een
 *    hardloopblessure?"
 *   "Biedt Fysi-Unique preventieve begeleiding aan na herstel van een
 *    hardloopblessure? Zo ja, welke specifieke diensten of programma's?"
 *
 * Eén vraag, drie formuleringen. Dat is precies wat contentbriefing.md §4 regel 6
 * verbiedt ("nooit vragen wat we al weten") en wat de grens van acht vragen
 * uitholt: vier van de acht plekken gaan op aan hetzelfde onderwerp.
 *
 * Deze sleutel kijkt daarom alleen naar de LANGSTE woorden. In het Nederlands
 * dragen samenstellingen de betekenis ("hardloopblessure", "behandelplan",
 * "begeleiding"), terwijl de variatie juist in de korte woorden en de zinsbouw
 * zit ("zo ja", "welke", "aan", "specifieke"). Drie woorden is de uitkomst van
 * naregelen op de echte vragen: bij twee vielen te verschillende onderwerpen
 * samen, bij vier bleven de drie voorbeelden hierboven nog uit elkaar.
 *
 * Bewust grover dan `claimKey` en bewust NIET als vervanging ervan: `claim_key`
 * is de kolom waar de unieke index in de database op staat. Deze sleutel groepeert
 * alleen binnen één briefingronde.
 */
export function topicKey(question: string): string {
  const woorden = question
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4)
    .map((w) => {
      // Zelfde ruwe afkapping als claimKey, plus de Nederlandse buigings-e
      // ("persoonlijke" → "persoonlijk"), want juist die wisselt per formulering.
      //
      // Achter elkaar toepassen en niet als eerste-treffer-wint: anders lopen
      // enkelvoud en meervoud uit elkaar. "hardloopblessures" verliest z'n s en
      // stopt dan op "hardloopblessure", terwijl "hardloopblessure" wél z'n e
      // verliest. Twee sleutels voor hetzelfde woord, precies de fout die deze
      // functie moest oplossen.
      let stam = w;
      if (stam.length > 5 && stam.endsWith("en")) stam = stam.slice(0, -2);
      if (stam.length > 3 && stam.endsWith("s")) stam = stam.slice(0, -1);
      if (stam.length > 6 && stam.endsWith("e")) stam = stam.slice(0, -1);
      return stam;
    });

  return Array.from(new Set(woorden))
    // Langste eerst; bij gelijke lengte alfabetisch, zodat de uitkomst niet van
    // de woordvolgorde in de vraag afhangt.
    .sort((a, b) => b.length - a.length || a.localeCompare(b))
    .slice(0, TOPIC_WOORDEN)
    .sort()
    .join(" ");
}

/**
 * De generieke vuistregel bij een dunne feitenkaart (optimalisatie.md 4.6):
 * geen gerichte term bekend, dus algemeen op zoek naar marktkennis. Blijft
 * bestaan als terugvalroute, want `buildFactFindingAddendum()` hieronder krijgt
 * lang niet altijd gaten aangereikt (S9), en "weinig feiten" is dan nog steeds
 * een reden om iets concreets te gaan zoeken.
 */
const GENERIEKE_FACT_FINDING_ADDENDUM =
  " AANVULLENDE OPDRACHT: er zijn weinig geverifieerde feiten over dit bedrijf beschikbaar. Zoek daarom " +
  "op internet naar ALGEMEEN GELDENDE, verifieerbare feiten over het ONDERWERP (normen, termijnen, " +
  "richtprijzen in de markt, wettelijke eisen, technische standaarden) en verwerk die met bronvermelding. " +
  "Doe dit NOOIT voor claims over dit specifieke bedrijf. Die mag je alleen uit de aangeleverde feitenlijst " +
  "halen. Een marktfeit met bron is waardevol; een verzonnen bedrijfsfeit is schadelijk.";

/** Eén term die deze pagina sterker maakt met een korte, algemene toelichting (S9). */
export interface ContextGap {
  term: string;
  reason: string;
}

/**
 * Bouwt de instructie waarmee de schrijfaanroep mag zoeken naar ALGEMENE,
 * niet-bedrijfsspecifieke achtergrond (S9, herziening van optimalisatie.md 4.6).
 *
 * ── WAAROM DIT NIET LANGER ALLEEN OP "WEINIG FEITEN" LEUNT ──────────────────
 *
 * De oude aanleiding (`proofCount < 3`) is een eigenschap van de KLANT: heeft
 * hij weinig bevestigde feiten. Een pagina over een keurmerk dat wél op de
 * kaart staat, maar waarvan de betekenis nergens wordt uitgelegd, heeft niets
 * met dat aantal te maken: de klant kan tien feiten hebben en toch een pagina
 * voorstellen die deze uitleg nodig heeft.
 *
 * Krijgt deze functie concrete gaten (S9, per pagina bepaald in de claim-audit),
 * dan zoekt de schrijver GERICHT op precies die termen, in plaats van "zoek iets
 * algemeens over dit onderwerp" en hopen dat het de goede kant op valt. Dat is
 * ook meteen specifieker per contentitem: twee aanbevelingen in hetzelfde
 * cluster met een ander onderwerp krijgen elk hun eigen lijst, niet dezelfde.
 *
 * Zonder gaten (S9 leverde niets op, of de pagina heeft geen briefing-snapshot)
 * valt hij terug op de generieke vuistregel hierboven: die blijft de vangnet
 * voor een dunne kaart zonder dat er al een concrete term bekend is.
 */
export function buildFactFindingAddendum(gaps: ContextGap[]): string {
  if (gaps.length === 0) return GENERIEKE_FACT_FINDING_ADDENDUM;

  const lijst = gaps.map((g) => `- ${g.term}: ${g.reason}`).join("\n");
  return (
    " AANVULLENDE OPDRACHT: deze pagina noemt de volgende termen zonder dat hun betekenis wordt " +
    "uitgelegd. Zoek per term op internet naar ALGEMEEN GELDENDE, verifieerbare uitleg (nooit een " +
    "bewering over dit specifieke bedrijf) en verwerk die met bronvermelding:\n" +
    lijst +
    "\nBlijf hier bij het ALGEMENE begrip: wat het inhoudt, waar het voor staat, wat het in de " +
    "praktijk betekent. Een bewering dat DIT bedrijf eraan voldoet mag alleen uit de feitenkaart " +
    "komen, precies zoals de rest van deze pagina."
  );
}
