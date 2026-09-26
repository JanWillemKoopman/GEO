/**
 * DE SCHRIJFOPDRACHT (`docs/tasks/contentketen-opnieuw.md` §6.4 en §6.7).
 *
 * Dit is het enige bestand waar je aan draait om de kwaliteit te verbeteren
 * (§0 regel 5, WP9). Verhoog `SCHRIJFOPDRACHT_VERSIE` bij elke inhoudelijke
 * wijziging: het nummer gaat mee in `raw_json`, zodat een uitslag altijd bij
 * een versie van deze opdracht hoort.
 *
 * Wat hier NIET in hoort (§3): een woordenbudget, een verplichte opbouw, een
 * lijst met punten die erin moeten, bronverwijzingen, scores. De schrijver
 * krijgt vier blokken informatie (§5) en maakt zelf de keuzes.
 *
 * Puur en zonder `server-only` (conventie 2).
 */
import { z } from "zod";

/**
 * Versie 2 (26 september 2026, na de proef van WP8): een veelgestelde vraag
 * alleen met een antwoord dat uit de informatie blijkt, en een praktijkvoorbeeld
 * dat bij déze pagina past. Op de proef stond één voorbeeld van de rijschool op
 * alle drie de pagina's, en gaf de hovenier twee keer "ja" op een vraag waar
 * niemand iets over had gezegd.
 */
export const SCHRIJFOPDRACHT_VERSIE = 2;

/** Hoogstens zoveel veelgestelde vragen, en alleen als ze iets toevoegen. */
export const MAX_FAQ = 5;

export const PaginaSchema = z.object({
  titel: z.string(),
  meta_titel: z.string(),
  meta_beschrijving: z.string(),
  tekst_markdown: z.string(),
  faq: z.array(z.object({ vraag: z.string(), antwoord: z.string() })),
  notitie_voor_ondernemer: z.string().nullable(),
});

export type PaginaUitvoer = z.infer<typeof PaginaSchema>;

const KERN = `Je bent een ervaren vakschrijver en schrijft een pagina voor de eigen website van dit bedrijf. Schrijf de beste pagina die iemand met deze vraag zou kunnen lezen.

Wees inhoudelijk volledig, natuurlijk, concreet en overtuigend. Beantwoord de vraag van de bezoeker meteen, en behandel daarna wat hij verder wil weten. Gebruik algemene vakkennis waar die helpt. Gebruik wat de ondernemer zelf vertelde: daar zit wat deze pagina anders maakt dan die van een concurrent.

Gebruik bedrijfsinformatie betrouwbaar. Verzin geen bedrijfsclaims, cijfers, garanties, prijzen, resultaten, certificeringen, termijnen of andere concrete eigenschappen die niet uit de informatie hieronder blijken. Weet je iets niet, laat het dan weg; schrijf niet over wat je niet weet.

Schrijf zo uitgebreid als nodig is om de vraag volledig en nuttig te beantwoorden. Voeg geen tekst toe alleen om langer te worden, en herhaal niets.

Schrijf in de stem van dit bedrijf. Noem nooit een ander bedrijf bij naam. Schrijf als een vakman, niet als een AI die informatie afvinkt.`;

export interface Huisregels {
  aanspreekvorm: "je" | "u" | "wij" | null;
  verbodenOnderwerpen: string[];
  verbodenWoorden: string[];
}

/**
 * De vaste opdracht plus de huisregels die niet over stijl gaan. De verboden
 * tekens moeten hier bij naam genoemd worden om ze te kunnen verbieden (de
 * uitzondering in `docs/schrijfstijl.md` §10).
 */
export function schrijfSysteem(h: Huisregels): string {
  const regels: string[] = [];
  if (h.aanspreekvorm === "u") regels.push("Spreek de lezer aan met u.");
  else if (h.aanspreekvorm === "je") regels.push("Spreek de lezer aan met je en jij.");
  else if (h.aanspreekvorm === "wij") regels.push("Schrijf vanuit het bedrijf in de wij-vorm.");
  if (h.verbodenOnderwerpen.length > 0) regels.push(`Schrijf niet over: ${h.verbodenOnderwerpen.join("; ")}.`);
  if (h.verbodenWoorden.length > 0) regels.push(`Gebruik deze woorden niet: ${h.verbodenWoorden.join(", ")}.`);
  regels.push("Gebruik geen gedachtestreepje (— of –) in lopende tekst en nooit de schuine streep in \"en/of\"; schrijf twee zinnen of gebruik een komma.");
  regels.push(
    "Een veelgestelde vraag neem je alleen op als het antwoord uit de informatie hierboven blijkt of algemene vakkennis is. Weet je het antwoord voor dit bedrijf niet, laat de vraag dan weg.",
  );
  regels.push(
    "Gebruik een voorbeeld uit de praktijk van de ondernemer alleen als het over het onderwerp van deze pagina gaat. De andere pagina's van dit bedrijf vertellen hun eigen voorbeelden.",
  );
  regels.push(
    `Lever een titel, een metatitel van hooguit 60 tekens, een metabeschrijving van hooguit 160 tekens, de tekst in markdown (tussenkoppen met ##), en 0 tot ${MAX_FAQ} veelgestelde vragen die iets toevoegen aan de tekst. Schrijf in notitie_voor_ondernemer wat je nog had willen weten, of null.`,
  );
  return `${KERN}\n\nHuisregels:\n${regels.map((r) => `- ${r}`).join("\n")}`;
}

export interface Stemvoorbeeld {
  bron: string;
  tekst: string;
}

export interface SchrijfBlokken {
  titel: string;
  paginasoort: string;
  handeling: "nieuw" | "verbeteren";
  /** Blok A als tekst (`blokA()`). */
  bedrijf: string;
  stem: Stemvoorbeeld[];
  /** Blok B: het antwoord op de open vraag, letterlijk. */
  eigenVerhaal: string | null;
  /** Blok B: de gerichte vragen met hun antwoord. */
  antwoorden: { vraag: string; antwoord: string }[];
  /** Blok C: het onderzoek uit de brief, of null als de brief mislukte. */
  onderzoek: {
    deelvragen: string[];
    concurrentie: { goed: string[]; gaten: string[] };
    vakkennis: { uitleg: string; bron_url: string }[];
    valkuilen: string[];
  } | null;
  /** Blok D. */
  zoekintentie: string | null;
  doelvragen: string[];
  andereTitels: string[];
  huidigeTekst: string | null;
}

function lijst(kop: string, items: string[]): string | null {
  return items.length > 0 ? `${kop}\n${items.map((i) => `- ${i}`).join("\n")}` : null;
}

export function schrijfInvoer(b: SchrijfBlokken): string {
  const delen: (string | null)[] = [];
  delen.push(
    `De pagina: ${b.titel} (${b.paginasoort}). ${
      b.handeling === "verbeteren" ? "Dit is een bestaande pagina; schrijf een betere versie." : "Dit wordt een nieuwe pagina."
    }`,
  );

  delen.push(
    [
      "ZOEKINTENTIE",
      b.zoekintentie ? `Wat de bezoeker wil: ${b.zoekintentie}` : null,
      lijst("Vragen die mensen hierover aan AI-assistenten stellen:", b.doelvragen.map((v) => `"${v}"`)),
    ]
      .filter(Boolean)
      .join("\n"),
  );

  delen.push(`WAT WE ZEKER WETEN OVER HET BEDRIJF\n${b.bedrijf}`);

  const klant = [
    b.eigenVerhaal?.trim() ? `Wat de ondernemer zelf over deze pagina vertelt:\n"""${b.eigenVerhaal.trim()}"""` : null,
    b.antwoorden.length > 0
      ? "Antwoorden van de ondernemer:\n" + b.antwoorden.map((a) => `- ${a.vraag}\n  ${a.antwoord}`).join("\n")
      : null,
  ].filter(Boolean);
  delen.push(klant.length > 0 ? `WAT DE ONDERNEMER VERTELDE\n${klant.join("\n\n")}` : null);

  if (b.onderzoek) {
    delen.push(
      [
        "WAT EEN GOEDE PAGINA OVER DIT ONDERWERP BEHANDELT (onderzoek)",
        lijst("Wat de bezoeker verder wil weten:", b.onderzoek.deelvragen),
        lijst("Wat goede pagina's goed doen:", b.onderzoek.concurrentie.goed),
        lijst("Wat ze laten liggen:", b.onderzoek.concurrentie.gaten),
        lijst("Vakkennis:", b.onderzoek.vakkennis.map((v) => v.uitleg)),
        lijst("Wat klanten vaak verkeerd begrijpen:", b.onderzoek.valkuilen),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (b.stem.length > 0) {
    delen.push(
      "ZO KLINKT DIT BEDRIJF\nZo klinkt dit bedrijf. Neem de toon, de zinsbouw en de woordkeus over, niet de inhoud en niet de zinnen zelf.\n\n" +
        b.stem.map((s) => `"""${s.tekst.trim()}"""`).join("\n\n"),
    );
  }

  delen.push(lijst("ANDERE PAGINA'S VAN DIT BEDRIJF (schrijf er niet overheen)", b.andereTitels));
  if (b.huidigeTekst?.trim()) delen.push(`DE HUIDIGE TEKST VAN DEZE PAGINA\n"""${b.huidigeTekst.trim()}"""`);

  return delen.filter(Boolean).join("\n\n");
}

/** Wat er bij het herschrijven bij komt (§6.7). */
export interface Feedback {
  vorige: string;
  punten: { waar: string; probleem: string; hoe: string }[];
  verzonnen: { zin: string; waarom: string }[];
  /** Zinnen die de code niet in de informatie terugvond. */
  ongedekt: string[];
  /** Zinnen met een woord dat het bedrijf niet wil gebruiken (B16). */
  verboden?: string[];
  /** Wat de klant zelf anders wil. */
  notitieKlant: string | null;
}

export function herschrijfInvoer(b: SchrijfBlokken, f: Feedback): string {
  const feedback = [
    f.notitieKlant?.trim() ? `Wat de ondernemer anders wil:\n${f.notitieKlant.trim()}` : null,
    lijst("Punten van de eindredacteur:", f.punten.map((p) => `${p.waar}: ${p.probleem} ${p.hoe}`.trim())),
    lijst(
      "Zinnen die niet uit de informatie blijken (haal ze weg of schrijf ze zonder de bewering):",
      [...f.verzonnen.map((v) => `"${v.zin}" (${v.waarom})`), ...f.ongedekt.map((z) => `"${z}"`)],
    ),
    lijst("Zinnen met een woord dat dit bedrijf niet wil gebruiken (schrijf ze zonder dat woord):", (f.verboden ?? []).map((z) => `"${z}"`)),
  ].filter(Boolean);
  return `${schrijfInvoer(b)}\n\nHIER IS JE VORIGE VERSIE EN DE FEEDBACK. SCHRIJF EEN BETERE VERSIE.\n\nVorige versie:\n"""${f.vorige.trim()}"""\n\n${feedback.join("\n\n")}`;
}
