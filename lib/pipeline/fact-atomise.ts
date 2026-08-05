import "server-only";

/**
 * Sitetekst opknippen tot losse, citeerbare feiten
 * (strategie-contentkwaliteit-vervolgstappen.md S1).
 *
 * ── HET PROBLEEM DAT DIT OPLOST ─────────────────────────────────────────────
 *
 * Gemeten op de contentronde van 31 juli: over vijf analyses stonden er 24
 * citeerbare feiten op de feitenkaart, en géén enkele ging over het onderwerp
 * van de analyse. Voor "wasmachine kopen" kreeg de schrijver: gratis wassen
 * tussen 12 en 15 uur, cashback op groene stroom, een AirPods-reviewscore,
 * Beste webwinkel 2022, 22 winkels. Allemaal waar, allemaal merkbreed, geen
 * ervan over wasmachines.
 *
 * De sitetekst die het wél had kunnen leveren stond er, maar als ACHTERGROND,
 * blokken van 400 tekens zonder F-nummer, expliciet niet bruikbaar als bron. Dat
 * was terecht: een blok van 400 tekens dekt alles en dus niets (de eerste echte
 * briefing leverde nul vragen op omdat 6 van de 7 beweringen naar hetzelfde blok
 * verwezen).
 *
 * De uitweg is het blok opknippen. Eén zin van twaalf woorden die LETTERLIJK op
 * de site staat, is wél na te trekken. Precies zo goed als een proof point.
 *
 * ── EEN PROMPTINSTRUCTIE IS EEN INTENTIE, CODE IS EEN GARANTIE ──────────────
 *
 * De instructie zegt "neem de zin letterlijk over". Dat is een intentie. Het
 * vangnet eronder is deze regel in `atomiseSitePages()`: een teruggegeven zin
 * moet na normalisatie in de brontekst voorkomen, anders valt hij weg. Zonder
 * die controle zou het model kunnen samenvatten of gladstrijken, en dan hebben
 * we de citaatplicht (`isSupported`) uitgehold op de plek waar hij het hardst
 * nodig is. Onbekend is beter dan verkeerd: liever een kortere kaart.
 *
 * ── KOSTEN ──────────────────────────────────────────────────────────────────
 *
 * Eén mini-aanroep per briefingbatch, geen web_search: ~4.000 tokens in,
 * ~1.500 uit, ongeveer $0,004. Ter vergelijking: één contentpagina schrijven
 * kost gemeten $0,048. Dit is dus ~8% van één pagina, en het geldt voor de hele
 * batch ongeacht hoeveel pagina's de klant koos.
 */
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { FactAtoms } from "@/lib/schemas/fact-atoms";
import { verifyAtoms } from "@/lib/pipeline/atom-verify";
import type { RawFact } from "@/lib/pipeline/factcard";
import type { CandidatePage } from "@/lib/pipeline/page-relevance";

/**
 * Hoeveel tekst per pagina meegaat naar de atomiseerstap.
 *
 * De crawl bewaart 1.500 tekens per pagina; die gaan er hier volledig in. Dat is
 * bewust ruimer dan de 400 tekens die de feitenkaart als achtergrondblok
 * gebruikte: we zoeken juist de concrete zinnen, en die staan zelden in de
 * eerste alinea. Bij Coolblue zat het antwoord op de doelvraag ("bestel samen
 * met een medewerker en kies een gunstig bezorgmoment") rond teken 1.000.
 */
const CHARS_PER_PAGE = 1500;

const ATOMISE_SYSTEM =
  "Je haalt CONTROLEERBARE FEITEN uit de eigen website van een bedrijf. Je schrijft niets, je " +
  "vat niets samen, je legt niets uit: je selecteert zinnen. " +
  "OPDRACHT: geef de zinnen terug die een concreet, natrekbaar feit over dit bedrijf bevatten en " +
  "die te maken hebben met het opgegeven onderwerp. " +
  "HARDE REGELS: " +
  "(1) Neem elke zin LETTERLIJK over uit de aangeleverde tekst, teken voor teken, zonder " +
  "inkorten, samenvatten, corrigeren of aanvullen. Een zin die je hebt bijgeschaafd wordt " +
  "weggegooid door de controle die hierachter zit, dus dat kost alleen maar een feit. " +
  "(2) Kies alleen zinnen met iets HARDS erin: een aantal, een bedrag, een plaats, een naam, een " +
  "termijn, een openingstijd, een merk, een dienst die het bedrijf aanbiedt, of een expliciete " +
  "voorwaarde. Sfeerzinnen ('wij staan voor je klaar', 'alles voor een glimlach') zijn geen " +
  "feiten en laat je staan. " +
  "(3) Kies alleen zinnen die over DIT BEDRIJF gaan. Algemene uitleg over het onderwerp ('een " +
  "wasmachine met energielabel A verbruikt minder stroom') is geen bedrijfsfeit. " +
  "(4) Geef bij elke zin het nummer van de pagina waaruit hij komt. " +
  "(5) Liever tien scherpe zinnen dan veertig vage. Bij twijfel: weglaten.";

function buildAtomiseInput(args: {
  brandName: string;
  topic: string;
  targetQuestions: string[];
  pages: CandidatePage[];
}): string {
  const { brandName, topic, targetQuestions, pages } = args;

  const paginas = pages
    .map(
      (p, i) =>
        `--- PAGINA ${i + 1}: ${p.url}${p.title ? ` ("${p.title}")` : ""} ---\n` +
        p.text.slice(0, CHARS_PER_PAGE),
    )
    .join("\n\n");

  return [
    `Bedrijf: ${brandName}`,
    `Onderwerp waar de content over gaat: ${topic}`,
    targetQuestions.length
      ? `De pagina's die we gaan schrijven moeten deze vragen beantwoorden. Feiten die daarbij ` +
        `helpen zijn het waardevolst:\n- ${targetQuestions.join("\n- ")}`
      : "",
    "",
    "Hieronder de pagina's van de eigen website. Selecteer de zinnen met een controleerbaar feit.",
    "",
    paginas,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Haalt losse, citeerbare feiten uit een set gecrawlde pagina's.
 *
 * Faalt zacht: gaat de aanroep stuk, dan komt er een lege lijst terug en valt de
 * feitenkaart terug op wat hij zonder deze stap ook had (proof points +
 * achtergrondblokken). Een mislukte verrijking mag nooit een briefing blokkeren,
 * zelfde afspraak als bij `profile_competitors` (R4.2) en de bronanalyse (4.4).
 */
export async function atomiseSitePages(args: {
  pages: CandidatePage[];
  brandName: string;
  topic: string;
  targetQuestions: string[];
  analysisId: string;
  profileId: string;
}): Promise<RawFact[]> {
  const pages = args.pages.filter((p) => (p.text ?? "").trim().length >= 40);
  if (pages.length === 0) return [];

  let atoms: { sentence: string; pageIndex: number }[];
  try {
    const result = await callStructured({
      model: MODELS.quality,
      system: ATOMISE_SYSTEM,
      user: buildAtomiseInput({ ...args, pages }),
      schema: FactAtoms,
      schemaName: "fact_atoms",
      webSearch: false,
      work: "deterministic",
      meta: { kind: "fact_atomise", analysisId: args.analysisId, profileId: args.profileId },
    });
    atoms = result.parsed.atoms;
  } catch (err) {
    console.warn(`Feiten atomiseren mislukt voor analyse ${args.analysisId}:`, err);
    return [];
  }

  return verifyAtoms(atoms, pages);
}
