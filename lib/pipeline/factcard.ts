/**
 * De feitenkaart — de gesloten lijst beweringen die de schrijver mag doen
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
 * `allowed: false` — die regels gaan als expliciet verbod de prompt in.
 *
 * Bewust ZONDER `server-only`: pure opmaak en pure validatie, testbaar in een
 * kaal script — zelfde patroon als evidence-format.ts en question-share.ts.
 */

/** Eén feit op de kaart. `ref` is het F-nummer waarnaar de content verwijst. */
export interface FactItem {
  /** "F1", "F2", … — het nummer waarmee de schrijver dit feit aanhaalt. */
  ref: string;
  /** De bewering zelf, in gewone taal. */
  text: string;
  /** Waar het vandaan komt: "site /acties/lease", "klant, bevestigd 29-07". */
  source: string;
  /**
   * false = dit is een VERBOD, geen bruikbaar feit. De klant heeft expliciet
   * gezegd dat dit niet zo is (of niet beweerd mag worden).
   */
  allowed: boolean;
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
  return items.map((item, i) => ({ ...item, ref: `F${i + 1}` }));
}

/** Een feit vóór het nummeren; `kind` bepaalt alleen de volgorde op de kaart. */
export interface RawFact {
  text: string;
  source: string;
  allowed: boolean;
  kind: FactSourceKind;
}

/**
 * Een antwoord van de klant omzetten naar een feit — of naar een VERBOD.
 *
 * Dit is het subtielste stukje van de hele briefing. Antwoordt de klant "nee" op
 * "zit pechhulp in het maandbedrag?", dan is dat geen ontbrekend feit maar het
 * antwoord dat de bewering verbiedt. Zonder dit onderscheid zou het model bij een
 * ontkennend antwoord alsnog kunnen redeneren dat het er waarschijnlijk wel in
 * zit — precies de fout uit de Udenhout-run, maar dan mét een antwoord in de hand.
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

  // Een ja/nee-antwoord is pas een bruikbaar feit als je de vraag erbij zet;
  // los is "nee" nietszeggend.
  if (row.answer_type === "ja_nee") {
    const ontkennend = /^(nee|nej|nope|niet|geen|onjuist|klopt niet)\b/i.test(antwoord);
    return {
      text: ontkennend ? `${vraag}: NEE` : `${vraag}: ja`,
      source: bron,
      allowed: !ontkennend,
      kind: "klant",
    };
  }

  return { text: `${vraag}: ${antwoord}`, source: bron, allowed: true, kind: "klant" };
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
  const bruikbaar = facts.filter((f) => f.allowed);
  const verboden = facts.filter((f) => !f.allowed);

  const regels: string[] = [];

  regels.push("FEITENKAART — de ENIGE toegestane bron van beweringen over deze klant");
  regels.push("─".repeat(70));

  if (bruikbaar.length === 0) {
    regels.push(
      "(leeg — er zijn geen bevestigde feiten over deze klant)\n" +
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
    regels.push("⛔ MAG JE NIET BEWEREN — de klant heeft dit expliciet ontkend of verboden:");
    for (const f of verboden) {
      regels.push(`    • ${f.text}   (bron: ${f.source})`);
    }
    regels.push(
      "    Schrijf hier niet over. Ook niet impliciet, ook niet als vraag in een FAQ, " +
        "ook niet met een slag om de arm.",
    );
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
 * gesteld worden — precies het gat waar het in de Udenhout-run doorheen glipte.
 * Vandaar dat de dekking in CODE bepaald wordt en niet door het model: geen
 * geldig F-nummer op de kaart betekent onbewezen, wat het model er ook van vindt.
 *
 * Een verwijzing naar een VERBOD telt óók niet als dekking: "pechhulp zit er niet
 * in" onderbouwt de bewering "pechhulp is inbegrepen" niet, het weerlegt hem.
 */
export function isSupported(sourceRef: string | null | undefined, facts: FactItem[]): boolean {
  if (!sourceRef) return false;
  const ref = sourceRef.trim().toUpperCase();
  return facts.some((f) => f.allowed && f.ref.toUpperCase() === ref);
}

/** Eén bewering uit de geschreven pagina, met het F-nummer dat hem dekt. */
export interface WrittenClaim {
  claim: string;
  factRef: string;
}

/**
 * Hoeveel van de concrete beweringen in de tekst zijn écht herleidbaar?
 * (contentbriefing.md §9, implementatieplan.md R5.3)
 *
 * ── WAAROM DIT DE `geo_score` VERVANGT ──────────────────────────────────────
 *
 * De bestaande `geo_score` gaf in de praktijktest voor alle drie de pagina's
 * 100 — inclusief de pagina met vijf verzonnen feiten. Een cijfer dat nooit
 * differentieert meet niets. Bronnendekking differentieert wél: het is het
 * percentage beweringen waarvan de herkomst aanwijsbaar is.
 *
 * Net als bij de claim-audit wordt de dekking in CODE bepaald en niet door het
 * model. Een verwijzing naar een F-nummer dat niet bestaat — of naar een verbod —
 * telt niet mee. Anders zou een model de eigen score kunnen optillen door
 * plausibele nummers te noemen, en dan meet het cijfer opnieuw niets.
 *
 * Geen enkele bewering opleveren geeft `null`, niet 100. "Ik heb niets beweerd"
 * is geen perfecte dekking maar een ontbrekend oordeel — en `null` is de enige
 * eerlijke weergave daarvan.
 */
export function sourceCoverage(
  claims: WrittenClaim[],
  facts: FactItem[],
): { coverage: number | null; unsupported: WrittenClaim[] } {
  const echt = claims.filter((c) => c.claim?.trim());
  if (echt.length === 0) return { coverage: null, unsupported: [] };

  const unsupported = echt.filter((c) => !isSupported(c.factRef, facts));
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
 * hetzelfde vragen — de kosten van die twee fouten zijn niet gelijk.
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
