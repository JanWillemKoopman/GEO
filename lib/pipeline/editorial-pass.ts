import "server-only";

/**
 * L8: de EINDREDACTIE (docs/tasks/contentpijplijn-publicatiewaardig.md §5 L8, WP5).
 *
 * Wat een eindredacteur doet: de tekst beter maken zonder feiten toe te voegen.
 * Schrappen, overbodige relativering weghalen, herhaling eruit, de adviestoon
 * omzetten naar wat het bedrijf doet, de tekst op de merkstem zetten en naar
 * het lengtebudget brengen. Eén ronde, op Sol met denktijd hoog (werksoort
 * `redactioneel`), vóór de keuring: een oordeel over een tekst die de redacteur
 * daarna toch verandert, is weggegooid geld (§3.2).
 *
 * De twee voorbeelden die dit werk moet wegkrijgen, uit de teksten van
 * 25 september 2026: "Wij hebben meer dan 35 jaar ervaring, maar dat zegt op
 * zichzelf niets over het aantal zwemvijvers dat we hebben aangelegd"
 * (hovenier, zwemvijver) en de prijsband die vier keer op de pagina voor Nuenen
 * staat.
 *
 * De code rekent de redactie na (`redactie-check.ts`): een nieuw getal of een
 * verzonnen F-nummer draait hem terug naar het concept.
 */
import { MODELS } from "@/lib/openai/models";
import type { StructuredCallOptions } from "@/lib/openai/structured";
import { EditorialPass } from "@/lib/schemas/editorial-pass";
import type { PageStrategy } from "@/lib/schemas/page-strategy";
import type { ContentPiece } from "@/lib/schemas/content-piece";
import { formatFactCard, type FactItem } from "@/lib/pipeline/factcard";
import { gekozenRefs, strategieblok } from "@/lib/pipeline/strategie-opdracht";
import type { FaqSelectie } from "@/lib/pipeline/faq-criteria";
import { checkSourceTalk } from "@/lib/pipeline/content-gate";
import { checkVoorbehoud, checkAdviestoon } from "@/lib/pipeline/adviestoon";

/** De soort aanroep in `ai_calls`, en de sleutel voor het achtergrondbesluit. */
export const REDACTIE_KIND = "content_edit";

const SYSTEM =
  "Je bent de eindredacteur van de website van een lokale ondernemer. Je krijgt een concept dat op " +
  "een vastgelegde paginastrategie is geschreven. Maak het publicatiewaardig: zo dat de ondernemer het " +
  "zonder aanpassing op zijn eigen site zet. Je schrijft NIETS nieuws over het bedrijf. " +
  "WAT JE DOET. " +
  "(1) Schrappen: alles wat de lezer niet helpt beslissen, elke zin die iets herhaalt wat al gezegd is, " +
  "en elk feit dat vaker dan één keer genoemd wordt (een prijs hoogstens één keer met toelichting). " +
  "(2) Relativering weghalen: een voorbehoud direct na een bewijsstuk ('35 jaar ervaring, maar dat zegt " +
  "op zichzelf niets'), een zin over wat wij niet weten of wat 'niet vastgelegd' is, een voorbehoud dat " +
  "een belofte van het bedrijf afzwakt. Alleen het voorbehoud dat de strategie letterlijk toestaat, " +
  "blijft staan, één keer. " +
  "(3) Adviestoon omzetten: geen huiswerk voor de lezer ('vraag vooraf na', 'vergelijk offertes', " +
  "'controleer'), maar wat dit bedrijf doet ('u hoort de prijs voordat wij beginnen'). " +
  "(4) De stem: zet de tekst in de toon, de aanspreekvorm en de zinslengte van het bedrijf; volg de " +
  "voorbeeldzinnen. Geen uitroeptekens, geen verkooppraat, geen clichés. " +
  "(5) Lengte: breng de tekst naar het budget van de strategie en nooit erboven. " +
  "(6) Helderheid: de opening beantwoordt de hoofdvraag in hoogstens twee zinnen met een concreet feit; " +
  "koppen zijn mededelingen. " +
  "WAT JE NIET DOET. Geen nieuw feit, geen nieuw getal, geen nieuwe belofte: alles over het bedrijf komt " +
  "van de FEITENKAART. Geen prioriteitsfeit weghalen. Geen onderwerp toevoegen dat niet in de opbouw " +
  "staat. De naam van het bedrijf blijft in de eerste alinea en in de afsluiting, en begint geen alinea. " +
  "Geen gedachtestreepjes en geen schuine streep tussen twee woorden. " +
  "WAT JE TERUGGEEFT. De hele geredigeerde pagina (tekst, FAQ, metatitel, metabeschrijving), de " +
  "VOLLEDIGE lijst beweringen over het bedrijf met F-nummer en letterlijk citaat uit dat feit, de " +
  "bewijspunten zoals ze na je redactie in de tekst staan, en per wijziging een regel in `wijzigingen`: " +
  "wat er stond, wat het werd, waarom (relativering, herhaling, adviestoon, stem, lengte, helderheid), en " +
  "of er een feit door geraakt werd. Antwoord in het Nederlands.";

export interface RedactieInvoer {
  brandName: string;
  strategie: PageStrategy;
  /** De FAQ-selectie (WP7); zie `StrategieRecord.faq`. */
  faq?: FaqSelectie | null;
  concept: ContentPiece;
  facts: FactItem[];
  /** De stem: tone, aanspreekvorm, stemvelden, verboden woorden, voorbeeldzinnen. Al als tekst opgebouwd. */
  stemblok: string;
}

/** De bevindingen van de feitcontrole in code, als opdracht voor de redacteur. */
function codeBevindingen(concept: ContentPiece): string[] {
  const tekst = [concept.bodyMarkdown, ...concept.faq.map((f) => `${f.q} ${f.a}`)].join("\n");
  const uit: string[] = [];
  for (const z of checkSourceTalk(concept.bodyMarkdown).sentences.slice(0, 8)) {
    uit.push(`Zin over bronnen of werkproces, moet weg of anders: "${z}"`);
  }
  for (const z of checkVoorbehoud(tekst).zinnen) {
    uit.push(`Voorbehoud dat een belofte afzwakt of huiswerk geeft: "${z}"`);
  }
  const advies = checkAdviestoon(tekst);
  for (const v of advies.voorbeelden.slice(0, 5)) uit.push(`Adviestoon: "${v}"`);
  return uit;
}

export function bouwRedactieOpdracht(v: RedactieInvoer): string {
  const gekozen = gekozenRefs(v.strategie, v.faq);
  const kaart = v.facts.filter((f) => !f.allowed || (f.citable && gekozen.has(f.ref.toUpperCase())));
  const bevindingen = codeBevindingen(v.concept);
  return [
    `BEDRIJF: ${v.brandName}`,
    strategieblok(v.strategie, v.faq),
    "",
    v.stemblok,
    "",
    formatFactCard(kaart),
    bevindingen.length ? `\nWAT DE CONTROLE IN HET CONCEPT VOND:\n- ${bevindingen.join("\n- ")}` : "",
    "",
    "── HET CONCEPT ──",
    `Metatitel: ${v.concept.metaTitle}`,
    `Metabeschrijving: ${v.concept.metaDescription}`,
    "",
    v.concept.bodyMarkdown,
    v.concept.faq.length ? `\n[FAQ]\n${v.concept.faq.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n")}` : "",
    "",
    "Beweringen in het concept (F-nummer en citaat):",
    ...v.concept.claims.map((c) => `- ${c.factRef}: ${c.claim} (citaat: "${c.quote}")`),
  ]
    .filter((r) => r !== "")
    .join("\n");
}

export function redactieOpties(args: {
  system?: string;
  user: string;
  analysisId: string;
  profileId: string;
  contentPieceId: string;
}): StructuredCallOptions<EditorialPass> {
  return {
    model: MODELS.content,
    system: args.system ?? SYSTEM,
    user: args.user,
    schema: EditorialPass,
    schemaName: "editorial_pass",
    webSearch: false,
    work: "redactioneel",
    meta: {
      kind: REDACTIE_KIND,
      analysisId: args.analysisId,
      profileId: args.profileId,
      contentPieceId: args.contentPieceId,
    },
  };
}

export const REDACTIE_SYSTEM = SYSTEM;
