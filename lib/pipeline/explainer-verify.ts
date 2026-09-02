import "server-only";

/**
 * De bronverificatie van de ALGEMENE laag
 * (docs/tasks/contentpijplijn-herontwerp.md A7).
 *
 * ── WAAROM DIT MOEST MEEGROEIEN MET DE VOLLEDIGHEID ─────────────────────────
 *
 * De feitenkaart (R5.3) bewaakt alles wat een pagina over de KLANT beweert:
 * elke bewering krijgt een F-nummer en een letterlijk citaat, en
 * `sourceCoverage()` rekent na of dat nummer bestaat. De tweede laag van een
 * goede pagina, de algemene uitleg over het onderwerp, viel daar bewust buiten:
 * "algemene uitleg over het onderwerp mag wel zonder F-nummer".
 *
 * Zolang die laag dun was, was dat een klein risico. Het contentcontract maakt
 * hem juist groter, want dat is precies wat een pagina compleet maakt. Een
 * grotere onbewaakte laag is geen vooruitgang. Vandaar deze module: elke uitleg
 * uit het itemdossier komt met een bron-URL en een letterlijk citaat, wij halen
 * die pagina op en kijken of het citaat er echt staat.
 *
 * ── WAT ER GEBEURT ALS HET NIET KLOPT ───────────────────────────────────────
 *
 * De uitleg vervalt. Hij gaat niet "met een waarschuwing" de schrijfprompt in,
 * want alles wat in die prompt staat, komt vroeg of laat op de pagina van de
 * klant te staan. Onbekend is een betere waarde dan een verkeerde (conventie 3),
 * en een pagina die een begrip niet uitlegt is beter dan een pagina die het
 * verkeerd uitlegt onder de naam van de klant.
 */
import { crawlPages } from "@/lib/crawler";
import { normalizeForQuote } from "@/lib/pipeline/factcard";
import type { DossierExplainer } from "@/lib/schemas/item-dossier";

/**
 * Hoeveel bronpagina's we hoogstens ophalen.
 *
 * ⚠️ Stond op zes, met als reden dat het itemdossier er zelden meer levert. Dat
 * klopte niet: op 1 september 2026 had de Eindhoven-pagina acht unieke
 * bron-URL's, en de uitleg bij bron zeven en acht kreeg de melding "bron niet op
 * te halen" terwijl er nooit een poging is gedaan. Twaalf dekt wat het dossier
 * in de praktijk oplevert. Elke pagina is een HTTP-verzoek binnen dezelfde taak,
 * de crawler haalt ze in batches op en faalt per pagina zacht, dus een trage
 * bron kost de rest niets.
 */
const MAX_BRONNEN = 12;

/**
 * Hoeveel van het citaat er letterlijk terug moet zijn te vinden.
 *
 * Niet de hele zin: een pagina zet er soms een niet-brekende spatie, een
 * afbreekstreepje of een voetnootcijfer in, en dan zou een citaat dat er wél
 * staat toch afgekeurd worden. Zestig tekens is lang genoeg dat toeval is
 * uitgesloten en kort genoeg om dat soort ruis te overleven.
 */
const CITAAT_TEKENS = 60;

export interface VerifiedExplainer extends DossierExplainer {
  verified: boolean;
  /** Waarom hij afviel. Leeg als hij klopt. */
  reason: string;
}

/** Staat dit citaat echt op deze pagina? */
export function quoteInText(quote: string, pageText: string): boolean {
  const naald = normalizeForQuote(quote).slice(0, CITAAT_TEKENS);
  if (naald.length < 20) return false; // te kort om iets te bewijzen
  return normalizeForQuote(pageText).includes(naald);
}

/**
 * Haalt de bronnen op en houdt alleen de uitleg over die er echt staat.
 *
 * Faalt zacht per uitleg: een bron die niet op te halen is, levert een
 * afgekeurde uitleg op en geen fout. De pagina moet geschreven kunnen worden,
 * ook als een externe site die dag plat ligt.
 */
export async function verifyExplainers(
  explainers: DossierExplainer[],
): Promise<VerifiedExplainer[]> {
  const bruikbaar = explainers.filter((e) => e.term?.trim() && e.explanation?.trim());
  if (bruikbaar.length === 0) return [];

  const alleUrls = Array.from(
    new Set(bruikbaar.map((e) => e.sourceUrl?.trim()).filter((u): u is string => /^https?:\/\//i.test(u ?? ""))),
  );
  const urls = alleUrls.slice(0, MAX_BRONNEN);
  // Wat er buiten de grens valt krijgt een eigen reden. "Bron niet op te halen"
  // suggereert dat de site plat lag; "te veel bronnen" zegt dat wij niet gekeken
  // hebben, en dat is een ander gesprek.
  const buitenGrens = new Set(alleUrls.slice(MAX_BRONNEN));

  // ⚠️ `fullText`: de standaardstand van `crawlPages` knipt op 4000 tekens, en
  // een citaat kan overal staan. Zonder deze vlag keurde de controle op
  // 1 september 2026 18 van de 35 uitleggen af met "citaat staat niet op de
  // bron", terwijl minstens één daarvan gewoon klopte: het citaat "De meeste
  // hybride warmtepompen halen warmte uit de buitenlucht" staat op teken 10.696
  // van een pagina van 21.141 tekens bij Milieu Centraal.
  const paginas = urls.length > 0 ? await crawlPages(urls, { fullText: true }) : [];
  const tekstPerUrl = new Map(paginas.map((p) => [p.url, p.text ?? ""]));

  return bruikbaar.map((uitleg) => {
    const url = uitleg.sourceUrl?.trim() ?? "";
    if (!/^https?:\/\//i.test(url)) {
      return { ...uitleg, verified: false, reason: "geen geldige bron-URL" };
    }
    if (buitenGrens.has(url)) {
      return { ...uitleg, verified: false, reason: `meer dan ${MAX_BRONNEN} bronnen, niet gecontroleerd` };
    }
    const tekst = tekstPerUrl.get(url);
    if (!tekst) {
      return { ...uitleg, verified: false, reason: "bron niet op te halen" };
    }
    if (!quoteInText(uitleg.quote ?? "", tekst)) {
      return { ...uitleg, verified: false, reason: "citaat staat niet op de bron" };
    }
    return { ...uitleg, verified: true, reason: "" };
  });
}

/**
 * De geverifieerde uitleg als promptblok.
 *
 * Bewust mét bronvermelding erbij: de schrijver mag de uitleg gebruiken, en de
 * klant kan achteraf zien waar hij vandaan komt. Dat is dezelfde belofte als
 * het F-nummer bij een bewering over het bedrijf, maar dan voor de laag die
 * geen F-nummer heeft.
 */
export function formatExplainerBlock(explainers: VerifiedExplainer[]): string {
  const goed = explainers.filter((e) => e.verified);
  if (goed.length === 0) return "";
  return (
    `GECONTROLEERDE ALGEMENE UITLEG (mag je gebruiken, met bron nagerekend; dit gaat over het ` +
    `ONDERWERP en nooit over dit bedrijf, dus er hoort geen F-nummer bij):\n` +
    goed.map((e) => `- ${e.term}: ${e.explanation} [bron: ${e.sourceUrl}]`).join("\n")
  );
}
