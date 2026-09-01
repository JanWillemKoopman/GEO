/**
 * De openingsmail en de gespreksvoorbereiding
 * (`docs/tasks/geo-prospect-engine.md` hoofdstuk 16).
 *
 * ── DE MAIL IS EEN OUTPUT VAN HET DOSSIER, NIET HET PRODUCT ─────────────────
 *
 * "Hij mag geen enkele bewering bevatten die niet uit het dossier komt." Dat is
 * geen stijlregel maar de kern: het verschil tussen de twee zinnen uit plan 16.1
 * is het verschil tussen weggegooide moeite en een gesprek.
 *
 *   waardeloos:  "Ik zag dat jullie actief zijn in Eindhoven en wilde jullie
 *                 graag helpen met AI."
 *   interessant: "We hebben 40 vragen gesteld aan ChatGPT en Gemini over
 *                 makelaars in Eindhoven. Jullie worden bij 3 daarvan genoemd,
 *                 terwijl Y Makelaars bij 24 vragen wordt aanbevolen."
 *
 * De tweede kan alleen bestaan als elk getal erin uit de meting komt. Vandaar
 * dat dezelfde getallencontrole als bij de haak ook over de mail heen gaat.
 *
 * ── EN WAT HIER NIET STAAT ──────────────────────────────────────────────────
 *
 * Er is in dit bestand geen functie die iets verstuurt, en die komt er ook niet
 * (plan 16.3 en 16.4). ORBIT ENGINE zet een concept klaar; de medewerker leest
 * het, past het aan en verstuurt het zelf vanuit zijn eigen mailbox. Er bestaat
 * geen knop, geen instelling en geen cron die een openingsmail de deur uit doet.
 *
 * Bewust ZONDER `server-only` (conventie 2).
 */
import type { Kans, KansType } from "@/lib/sales/opportunity";
import { controleerHook, getallenInZin, toegestaneGetallen } from "@/lib/sales/hook";

/**
 * De toon per hooktype (plan 16.2, laatste alinea).
 *
 * "Een onzichtbaar bedrijf krijgt een contrast. Een marktleider krijgt een
 * kwetsbaarheid. Een information gap krijgt urgentie. Dezelfde mail voor alle
 * acht types is een sjabloon met variabelen, en dat ruikt een ondernemer."
 *
 * Deze regels gaan mee in de prompt en sturen de toon; ze staan hier zodat er
 * één plek is waar te zien is welke toon bij welk type hoort, en zodat een test
 * kan controleren dat er voor elk type een eigen toon bestaat.
 */
export const TOON_PER_TYPE: Record<KansType, string> = {
  onzichtbaar:
    "Zet het contrast neer tussen bestaan en gezien worden. Geen verwijt: dit is iets waar de " +
    "ondernemer waarschijnlijk nooit naar gekeken heeft.",
  concurrent_gap:
    "Noem de concurrent bij naam en houd het feitelijk. Geen dreiging, geen 'jullie lopen achter'.",
  intent_gap:
    "Wijs op de dienst die ze zelf aanbieden en waar ze niet bij genoemd worden. Dit is een gat " +
    "dat zij zelf kunnen bevestigen, en dat maakt het gesprek concreet.",
  engine_gap:
    "Beschrijf het verschil tussen twee assistenten als iets technisch en oplosbaars, niet als " +
    "een fout van het bedrijf.",
  information_gap:
    "Dit is het enige type met urgentie: er staat nu iets onjuists over hen in een antwoord dat " +
    "klanten lezen. Zeg dat rustig, en laat de urgentie uit het feit komen.",
  source_gap:
    "Verleg het gesprek naar het speelveld buiten hun eigen website. Dit is vaak nieuwe " +
    "informatie voor de ondernemer.",
  sterk_met_zwakke_plek:
    "Begin bij hun sterke positie en houd die staande. Een marktleider die aangesproken wordt " +
    "op wat hij mist, haakt af; een marktleider die hoort waar hij kwetsbaar is, luistert.",
  verlies:
    "Dit is een gebeurtenis en geen toestand. Noem de verandering en de periode, en laat de vraag " +
    "'wat is er veranderd' vanzelf ontstaan.",
};

/** Wat er nooit in een openingsmail hoort (plan 16.2). */
export const VERBODEN_IN_MAIL = [
  "GEO uitleggen",
  "Outer Orbit presenteren",
  "features opsommen",
  "een lange pitch",
  "superlatieven",
  "ik zag dat jullie",
  "een vaag compliment over de website",
];

export interface MailConcept {
  onderwerp: string;
  tekst: string;
}

export interface MailOordeel {
  ok: boolean;
  /** Wat er mis is, in gewone taal. Leeg als het concept deugt. */
  bezwaren: string[];
}

/**
 * Klopt dit concept met het dossier?
 *
 * Drie controles, en de eerste is dezelfde als bij de haak: elk getal in de mail
 * moet uit de meetdata komen. De andere twee zijn vormcontroles die te toetsen
 * zijn zonder over smaak te gaan.
 *
 * ⚠️ Wat hier NIET gecontroleerd wordt is of de mail goed geschreven is. Dat kan
 * een machine niet, en het hoeft ook niet: er ligt altijd een mens tussen (plan
 * 16.3, derde reden). Wat een machine wél kan, is voorkomen dat er een verzonnen
 * getal in staat, en dat is precies het soort fout dat een gesprek beëindigt
 * voordat het begonnen is.
 */
export function controleerConcept(concept: MailConcept, kans: Kans): MailOordeel {
  const bezwaren: string[] = [];

  const getallen = controleerHook(`${concept.onderwerp} ${concept.tekst}`, kans);
  if (!getallen.ok) {
    bezwaren.push(
      `Deze cijfers staan niet in de meting: ${getallen.onbekend.join(", ")}. ` +
        "Elk getal in de mail moet uit het dossier komen.",
    );
  }

  if (concept.onderwerp.trim().length < 5) {
    bezwaren.push("De onderwerpregel is leeg of te kort.");
  }
  // Een onderwerpregel die over ons gaat in plaats van over hen (plan 16.2,
  // punt 1). Dit is de enige naam die we hard kunnen toetsen.
  if (/orbit engine|outer orbit/i.test(concept.onderwerp)) {
    bezwaren.push(
      "De onderwerpregel gaat over ons in plaats van over hen. Dat is de regel uit plan 16.2.",
    );
  }

  if (concept.tekst.trim().length < 60) {
    bezwaren.push("De mail is te kort om iets te zeggen.");
  }
  // Plan 16.2: geen lange pitch. Een openingsmail die niet in één scherm past,
  // wordt niet gelezen.
  if (concept.tekst.split(/\s+/).length > 220) {
    bezwaren.push("De mail is te lang voor een eerste bericht.");
  }

  return { ok: bezwaren.length === 0, bezwaren };
}

/**
 * Het sjabloonconcept: wat er klaarstaat als het model niets bruikbaars levert.
 *
 * Net als bij de haak: saai, kort en waar. Een verkoper die dit leest weet
 * meteen wat hij moet aanpassen, en er staat geen enkele bewering in die niet
 * uit de meting komt.
 */
export function sjabloonConcept(
  kans: Kans,
  bedrijf: string,
  markt: string,
  haak: string,
  afzender: string,
  /** De naam van de ontvanger, als er iemand gevonden is die gemaild mag worden. */
  ontvanger: string | null = null,
): MailConcept {
  return {
    onderwerp: `${bedrijf} in AI-antwoorden over ${markt}`,
    tekst: [
      // ⚠️ "Beste," zonder naam was tot 1 september 2026 de vaste aanhef, ook
      // als er een contactpersoon gevonden was. Een module die om een
      // persoonlijk eerste contact draait, hoort de naam te gebruiken zodra hij
      // hem heeft (plan 9.4). Staat er niemand, dan blijft het "Beste,": een
      // verzonnen naam is erger dan geen naam.
      ontvanger ? `Beste ${ontvanger},` : "Beste,",
      "",
      `Wij hebben gemeten wat AI-assistenten antwoorden op vragen over ${markt}. ${haak}`,
      "",
      "Dat zegt niets over de kwaliteit van jullie werk. Het zegt iets over wat een AI-assistent " +
        "over jullie weet, en dat is iets anders.",
      "",
      "Heb je tien minuten deze week om er even naar te kijken?",
      "",
      afzender,
    ].join("\n"),
  };
}

/**
 * De opdracht aan het model voor het concept.
 *
 * De regels uit plan 16.2 staan er letterlijk in, inclusief wat er níét in mag.
 * Dat laatste is geen overdaad: elk van die zeven dingen is precies wat een
 * model uit zichzelf doet zodra je het een verkoopmail laat schrijven.
 */
export function bouwMailVraag(
  kans: Kans,
  bedrijf: string,
  markt: string,
  haak: string,
  afzender: string,
  publiekeLink: string | null,
  /** De naam van de ontvanger, als er iemand gevonden is die gemaild mag worden. */
  ontvanger: string | null = null,
): string {
  const cijfers = Object.entries(kans.cijfers)
    .map(([sleutel, waarde]) => `- ${sleutel}: ${waarde <= 1 && waarde > 0 ? `${Math.round(waarde * 100)}%` : waarde}`)
    .join("\n");

  return [
    `Bedrijf: ${bedrijf}`,
    `Markt: ${markt}`,
    `Afzender: ${afzender}`,
    ontvanger
      ? `Ontvanger: ${ontvanger}. Begin de mail met "Beste ${ontvanger},".`
      : 'Ontvanger: onbekend. Begin de mail met "Beste," en verzin geen naam.',
    "",
    "De observatie waar de mail op staat of valt:",
    haak,
    "",
    "De gemeten cijfers die je mag gebruiken:",
    cijfers || "- geen",
    "",
    `Toon voor dit soort kans: ${TOON_PER_TYPE[kans.type]}`,
    "",
    "Schrijf een openingsmail met deze opbouw:",
    "1. Een onderwerpregel die over hen gaat, niet over ons en niet over AI in het algemeen.",
    "2. De observatie hierboven, met het cijfer erin. Dit is de zin waarop de mail staat of valt.",
    publiekeLink ? `3. Een verwijzing naar ${publiekeLink}, waar ze het zelf kunnen nakijken.` : "",
    "4. Eén zin over wat dit betekent. Zakelijk, zonder dreiging.",
    "5. Een vraag met een tijdsduur erin. Niet 'plan een demo', maar 'tien minuten deze week'.",
    `6. Onderteken met: ${afzender}`,
    "",
    `Wat er niet in hoort: ${VERBODEN_IN_MAIL.join(", ")}.`,
    "Gebruik geen enkel getal dat hierboven niet staat, ook geen afronding.",
    "Hooguit 150 woorden.",
    "",
    // ⚠️ DIT BLOK ONTBRAK TOT 1 SEPTEMBER 2026, EN DAT KOSTTE DE HELE
    // BELVOORBEREIDING. De aanvraag vroeg alleen om een mail, terwijl de
    // verwachte uitvoer ook de vier blokken uit plan 16.5 bevat. Het model
    // leverde die dus leeg of half, de controle verwierp ze terecht, en op het
    // dossier stond geen enkele voorbereiding. Twee keer op twee markten.
    //
    // Het is dezelfde aanroep en dus geen extra geld: de mail en het gesprek
    // rusten op hetzelfde dossier (plan 16.5, "één goedkope aanroep op een
    // dossier dat al bestaat").
    "Schrijf daarna de gespreksvoorbereiding die de verkoper openhoudt terwijl hij belt.",
    "Vier blokken, en houd je precies aan de aantallen:",
    "- cijfers: precies twee. Niet meer, want een verkoper onthoudt er twee. Neem ze " +
      "letterlijk uit de lijst hierboven, met de naam van het bedrijf of de concurrent erbij.",
    "- openingen: precies drie zinnen, in deze volgorde. Eén voor 'hij heeft niet gereageerd', " +
      "één voor 'hij reageerde geïnteresseerd', één voor 'hij reageerde sceptisch'. Dat zijn drie " +
      "verschillende gesprekken en één openingszin dekt ze niet.",
    "- bezwaren: drie bezwaren die bij dit soort kans horen, elk met het antwoord erop. Het " +
      "antwoord verwijst naar de meting, nooit naar een verkoopargument.",
    "- niet_zeggen: minstens één zin over wat je bij dit bedrijf niet moet beweren. Dat is de " +
      "grens van wat de meting draagt. Weten we niet hoeveel omzet dit misloopt, dan zeg je dat " +
      "niet, ook niet als het gesprek erom vraagt.",
    "In de voorbereiding gelden dezelfde cijfers als in de mail: geen enkel getal dat hierboven " +
      "niet staat.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * De gespreksvoorbereiding (plan 16.5).
 *
 * Vier blokken, samen niet langer dan één scherm, want een verkoper houdt dit
 * open terwijl hij belt. De vorm staat hier zodat de controle op de getallen er
 * net zo hard overheen kan als over de mail.
 */
export interface Gespreksvoorbereiding {
  /** De twee cijfers die je paraat moet hebben. Niet zeven. */
  cijfers: string[];
  /** Drie openingen: geen reactie, interesse, scepsis. Drie gesprekken. */
  openingen: string[];
  /** De drie bezwaren bij dit hooktype, met het antwoord erop. */
  bezwaren: { bezwaar: string; antwoord: string }[];
  /** Wat je bij dit bedrijf nooit moet zeggen: de grens van wat de meting draagt. */
  nietZeggen: string[];
}

/**
 * Controleert de voorbereiding op dezelfde regel als de mail.
 *
 * "De hele voorbereiding valt onder dezelfde bewijsregel als de mail: elk getal
 * erin wordt tegen de meetdata gecontroleerd voordat het opgeslagen wordt"
 * (plan 16.5). Een verkoper die een verkeerd cijfer uit zijn voorbereiding
 * voorleest, staat er net zo hard naast als wanneer het in de mail stond.
 */
export function controleerVoorbereiding(
  prep: Gespreksvoorbereiding,
  kans: Kans,
): MailOordeel {
  const bezwaren: string[] = [];
  const toegestaan = toegestaneGetallen(kans);

  const alleTekst = [
    ...prep.cijfers,
    ...prep.openingen,
    ...prep.bezwaren.flatMap((b) => [b.bezwaar, b.antwoord]),
    ...prep.nietZeggen,
  ].join(" ");

  const onbekend = getallenInZin(alleTekst).filter(
    (g) => !toegestaan.has(Number(g.toFixed(2))) && !toegestaan.has(Math.round(g)),
  );
  if (onbekend.length > 0) {
    bezwaren.push(
      `Deze cijfers staan niet in de meting: ${onbekend.join(", ")}. ` +
        "Een verkoper die dat voorleest, staat ernaast.",
    );
  }

  if (prep.cijfers.length === 0 || prep.cijfers.length > 3) {
    bezwaren.push("De voorbereiding hoort twee cijfers te noemen, niet nul en niet zeven.");
  }
  if (prep.openingen.length < 3) {
    bezwaren.push(
      "Er horen drie openingen bij: geen reactie, interesse en scepsis. Dat zijn drie gesprekken.",
    );
  }
  if (prep.nietZeggen.length === 0) {
    bezwaren.push(
      "De grens van wat de meting draagt ontbreekt. Juist die zin voorkomt dat een verkoper iets " +
        "belooft wat we niet gemeten hebben.",
    );
  }

  return { ok: bezwaren.length === 0, bezwaren };
}
