import "server-only";

/**
 * Staat de pagina er echt? (optimalisatie.md 5.2)
 *
 * De klant zegt "gepubliceerd" en geeft een URL op. Dat is precies het moment
 * waarop het mis kan gaan zonder dat iemand het merkt: een verkeerd geplakte
 * URL, een pagina die op concept staat, een CMS dat de tekst afkapte. Zonder
 * controle wacht de klant daarna wekenlang op een effect dat nooit kan komen —
 * en concludeert hij dat het product niet werkt.
 *
 * Dus kijken we even. Geen AI-aanroep: dit is één HTTP-verzoek en wat
 * tekstvergelijking.
 */
import { fetchText, htmlToText } from "@/lib/crawler";

export interface PublishCheck {
  /** Kon de pagina überhaupt opgehaald worden? */
  reachable: boolean;
  /** Staat de tekst er (grotendeels) op? */
  textFound: boolean;
  /** Welk deel van de gecontroleerde zinnen is teruggevonden, 0-1. */
  textMatchRatio: number;
  /** Staat de gestructureerde data erop? */
  schemaFound: boolean;
  /** Zijn we op een andere pagina uitgekomen dan opgegeven? */
  finalUrl: string | null;
  checkedAt: string;
  /** Wat de klant moet weten, in gewone taal. Leeg = alles in orde. */
  problems: string[];
}

/**
 * Hoeveel van de gecontroleerde zinnen teruggevonden moeten worden.
 *
 * Bewust niet 100%: een CMS voegt van alles toe, breekt regels anders af en
 * vervangt aanhalingstekens door typografische varianten. Op 60% weet je zeker
 * dat het déze tekst is en niet een andere pagina, zonder vals alarm bij elke
 * kleine opmaakverandering.
 */
const MIN_MATCH_RATIO = 0.6;

/** Hoeveel zinnen we steekproefsgewijs zoeken. Meer is trager en niet zekerder. */
const SENTENCES_TO_CHECK = 8;

/** Normaliseert tekst zodat opmaakverschillen niet meetellen bij het vergelijken. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Kiest de zinnen waarop we controleren: de langste, want die zijn het meest
 * onderscheidend. "Neem contact op" staat op elke pagina; een zin van twintig
 * woorden staat alleen op déze.
 */
function pickSentences(markdown: string): string[] {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_>`[\]()]/g, " ")
    .replace(/\s+/g, " ");

  return plain
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 8)
    .sort((a, b) => b.length - a.length)
    .slice(0, SENTENCES_TO_CHECK);
}

export async function checkPublication(args: {
  url: string;
  bodyMarkdown: string;
  schemaJsonLd: string | null;
}): Promise<PublishCheck> {
  const checkedAt = new Date().toISOString();
  const html = await fetchText(args.url);

  if (!html) {
    return {
      reachable: false,
      textFound: false,
      textMatchRatio: 0,
      schemaFound: false,
      finalUrl: null,
      checkedAt,
      problems: [
        "We konden deze pagina niet openen. Controleer of de link klopt en of de pagina echt " +
          "gepubliceerd is (en niet nog op concept staat).",
      ],
    };
  }

  const pageText = normalize(htmlToText(html));
  const sentences = pickSentences(args.bodyMarkdown);
  const found = sentences.filter((s) => pageText.includes(normalize(s))).length;
  const ratio = sentences.length > 0 ? found / sentences.length : 0;
  const textFound = sentences.length === 0 || ratio >= MIN_MATCH_RATIO;

  // De gestructureerde data: we zoeken niet naar de exacte string (een CMS
  // herformatteert JSON) maar naar een JSON-LD-blok met hetzelfde @type.
  const schemaType = args.schemaJsonLd?.match(/"@type"\s*:\s*"([^"]+)"/)?.[1] ?? null;
  const schemaBlocks = html.match(/type=["']application\/ld\+json["']/gi)?.length ?? 0;
  const schemaFound =
    schemaBlocks > 0 && (!schemaType || new RegExp(`"@type"\\s*:\\s*"${schemaType}"`, "i").test(html));

  const problems: string[] = [];
  if (!textFound) {
    problems.push(
      ratio === 0
        ? "De pagina bestaat, maar we vinden er geen enkele zin uit onze tekst op. Staat de tekst er wel op, en kijken we naar de juiste pagina?"
        : `We vinden maar ${Math.round(ratio * 100)}% van onze tekst terug op deze pagina. Mogelijk is er maar een deel geplakt.`,
    );
  }
  if (args.schemaJsonLd?.trim() && !schemaFound) {
    problems.push(
      "De gestructureerde data (het JSON-LD-blok) staat er nog niet op. Dat is geen verplichting, " +
        "maar het helpt AI-assistenten begrijpen waar de pagina over gaat.",
    );
  }

  return {
    reachable: true,
    textFound,
    textMatchRatio: Math.round(ratio * 100) / 100,
    schemaFound,
    finalUrl: args.url,
    checkedAt,
    problems,
  };
}
