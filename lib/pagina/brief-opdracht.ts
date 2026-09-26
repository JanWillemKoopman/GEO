/**
 * DE OPDRACHT VOOR DE CONTENT BRIEF (`docs/tasks/contentketen-opnieuw.md` §6.1).
 *
 * Twee delen: de vaste opdracht (`BRIEF_SYSTEEM`) en de invoer per pagina
 * (`briefInvoer`). De voorbeelden van een slechte, goede en betere vraag staan
 * letterlijk zoals §6.1 ze voorschrijft.
 *
 * Wat hier NIET in staat, en ook niet in mag (§3): een opbouw voor de pagina,
 * een lengte, een lijst verplichte onderwerpen. De brief is onderzoek, de
 * keuzes maakt de schrijver.
 *
 * Puur en zonder `server-only` (conventie 2).
 */
import { MAX_BRIEFVRAGEN } from "@/lib/pagina/brief-regels";

export const BRIEF_SYSTEEM = `Je bereidt één webpagina voor van een Nederlands mkb-bedrijf. Een schrijver maakt de pagina straks; jij zorgt dat hij weet wat hij moet weten. Je schrijft zelf geen tekst voor de pagina en je bepaalt niet hoe de pagina eruitziet.

Je doet twee dingen.

1. ONDERZOEK (zoek op het web waar dat helpt)
- zoekintentie: wat de bezoeker probeert te bereiken, in zijn eigen woorden, in één of twee zinnen.
- deelvragen: wat hij daarnaast wil weten.
- concurrentie.goed: wat goede pagina's over dit onderwerp goed doen. concurrentie.gaten: wat ze laten liggen. Noem nooit een bedrijfsnaam.
- vakkennis: inhoudelijke uitleg die een goede pagina over dit onderwerp nodig heeft (hoe iets werkt, regels, stappen, aandachtspunten), elk punt met het webadres waar je het vond. Zonder adres laat je het punt weg.
- valkuilen: wat klanten over dit onderwerp vaak verkeerd begrijpen.

2. VRAGEN AAN DE ONDERNEMER (hooguit ${MAX_BRIEFVRAGEN})
Stel de vragen waarvan het antwoord deze pagina duidelijk beter en eigener maakt dan wat een concurrent of een AI zonder deze ondernemer kan schrijven. Denk in vijf soorten:
- feit: prijs, termijn, wat is inbegrepen, voor wie wel en niet;
- praktijk: een typische klant of situatie, een voorbeeld dat je mag noemen;
- werkwijze: hoe verloopt het, wat doe je eerst;
- twijfel: wat vragen klanten hierover, wat zeg je dan;
- onderscheid: wat doe je anders dan anderen.

Een vraag is alleen gerechtvaardigd als hij aan beide voorwaarden voldoet:
1. de schrijver kan het antwoord gebruiken in deze pagina; en
2. het antwoord is niet betrouwbaar te halen uit wat we al over het bedrijf weten, uit algemene vakkennis of uit webonderzoek.

Voorbeelden:
- Slecht: "Wat is faalangst?" (algemene kennis, dat weet het model zelf).
- Goed: "Welke situatie komt bij jullie het vaakst voor bij leerlingen met faalangst?"
- Beter: "Kun je een typisch voorbeeld geven van een leerling met faalangst, en hoe jullie daarmee omgingen?"

Stel zo weinig vragen als nodig is om de kennis op te halen die alleen deze ondernemer heeft. Twee vragen die twee sterke praktijkvoorbeelden opleveren, maken een pagina beter dan acht vragen met losse feiten. Nul vragen is een goed antwoord als alles al bekend is.

Vraag niet naar wat al onder "Wat we al weten over het bedrijf" staat, niet naar algemene vakkennis, en niet opnieuw naar een vraag uit "Eerder gestelde vragen", ook niet in andere woorden. Geldt een vraag uit die lijst met stand "open" ook voor deze pagina, zet dan zijn id in ook_voor_deze_pagina in plaats van hem opnieuw te stellen. Een vraag om een voorbeeld uit de praktijk koppel je niet aan een andere pagina: elke pagina hoort zijn eigen voorbeeld te krijgen, dus stel dan een eigen voorbeeldvraag over het onderwerp van deze pagina.

Zegt je vakkennis iets wat per bedrijf kan verschillen en wat voor deze pagina belangrijk is (een werkwijze, een termijn, een vuistregel, wat er wel en niet bij zit), en staat het niet onder "Wat we al weten over het bedrijf"? Vraag dan hoe dit bedrijf het doet. Anders moet de schrijver raden, of schrijft hij de algemene regel op alsof het bedrijf hem zo hanteert.

Formuleer elke vraag zo dat de ondernemer hem zonder uitleg kan beantwoorden. Spreek hem aan met je. Per vraag:
- waarom: één zin voor de ondernemer over wat zijn antwoord aan de pagina toevoegt;
- antwoord_type: ja_nee, bedrag, getal, tekst_kort, tekst_lang of keuze (alleen met minstens twee opties);
- merkbreed: true als het antwoord voor het hele bedrijf geldt en niet alleen voor deze pagina.

Schrijf in gewoon Nederlands, in korte zinnen.`;

export interface Doelvraag {
  vraag: string;
  /** Wat een AI-assistent nu antwoordt, zonder concurrentnamen. Null als het er niet is. */
  antwoord: string | null;
}

export interface BriefContext {
  titel: string;
  paginasoort: string;
  /** Nieuwe pagina of een bestaande verbeteren. */
  handeling: "nieuw" | "verbeteren";
  zoekintentie: string | null;
  waarom: string | null;
  doelvragen: Doelvraag[];
  merknaam: string;
  werkgebied: string[];
  /** Blok A als tekst (`blokA()`). */
  bedrijf: string;
  /** De huidige tekst van de pagina bij "verbeteren", anders null. */
  huidigeTekst: string | null;
  eerdereVragen: { id: string; vraag: string; stand: string }[];
}

/** Hoeveel tekens van een winnend antwoord mee gaan. */
export const ANTWOORD_MAX = 1500;
/** Hoeveel tekens van de huidige pagina mee gaan. */
export const HUIDIGE_TEKST_MAX = 8000;

export function briefInvoer(c: BriefContext): string {
  const delen: string[] = [];
  delen.push(
    [
      `Pagina: ${c.titel}`,
      `Soort pagina: ${c.paginasoort}`,
      c.handeling === "verbeteren" ? "Dit is een bestaande pagina die beter moet." : "Dit wordt een nieuwe pagina.",
      c.zoekintentie ? `Waar de bezoeker naar zoekt (uit de meting): ${c.zoekintentie}` : null,
      c.waarom ? `Waarom deze pagina: ${c.waarom}` : null,
      `Bedrijf: ${c.merknaam}`,
      c.werkgebied.length > 0 ? `Werkgebied: ${c.werkgebied.join(", ")}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  if (c.doelvragen.length > 0) {
    delen.push(
      "Vragen die mensen aan AI-assistenten stellen en waar deze pagina een antwoord op moet zijn:\n" +
        c.doelvragen
          .map(
            (d) =>
              `- "${d.vraag}"` +
              (d.antwoord ? `\n  Wat een assistent nu antwoordt (andere bedrijven weggehaald):\n  """${d.antwoord.slice(0, ANTWOORD_MAX)}"""` : ""),
          )
          .join("\n"),
    );
  }

  delen.push(`Wat we al weten over het bedrijf:\n${c.bedrijf}`);

  if (c.huidigeTekst?.trim()) {
    delen.push(`De huidige tekst van de pagina:\n"""${c.huidigeTekst.trim().slice(0, HUIDIGE_TEKST_MAX)}"""`);
  }

  delen.push(
    c.eerdereVragen.length > 0
      ? "Eerder gestelde vragen aan dit bedrijf (id, stand, vraag):\n" +
          c.eerdereVragen.map((v) => `- [${v.id}] (${v.stand}) ${v.vraag}`).join("\n")
      : "Eerder gestelde vragen aan dit bedrijf: nog geen.",
  );

  return delen.join("\n\n");
}
