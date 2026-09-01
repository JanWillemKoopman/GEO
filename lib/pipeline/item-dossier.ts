import "server-only";

/**
 * Het ITEMDOSSIER: onderzoek per contentitem, niet per cluster
 * (docs/tasks/contentpijplijn-herontwerp.md A1, migratie 0082).
 *
 * ── DE GRENS DIE DEZE STAP TREKT ────────────────────────────────────────────
 *
 * Het CLUSTER is waar ORBIT ENGINE kansen vindt: de meting, de gemiste vragen,
 * de aanbevelingen. Daar hoort clusterbrede kennis thuis. Zodra er een concreet
 * contentitem ligt, is het cluster geen goede eenheid meer: de aanbevelingen
 * binnen één cluster lopen sterk uiteen, en S9 en S10 hebben vier plekken
 * gerepareerd waar clusterbrede input een specifieke pagina de verkeerde kant
 * op stuurde. Deze stap is de logische voortzetting daarvan: hij vraagt niet
 * "wat weten we over dit cluster" maar "wat heeft juist dit item nodig".
 *
 * ── EEN GOEDKOPE STAP MET WEB_SEARCH ────────────────────────────────────────
 *
 * Draait op de goedkope tier (`MODELS.quality`) met redeneertijd en één
 * web-zoekactie. Nagerekend op `ai_calls`: een zoekactie op een redeneermodel
 * kost $0,01, de tokens erbij enkele tienden van een cent. Ongeveer anderhalve
 * cent per pagina dus, tegenover $0,15 voor de schrijfaanroep die erna komt.
 * De duurdere aanroep beter voeden is hier veel meer waard dan hem zelf laten
 * zoeken.
 */
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { ItemDossier } from "@/lib/schemas/item-dossier";
import { verifyExplainers, type VerifiedExplainer } from "@/lib/pipeline/explainer-verify";
import { redactCompetitors } from "@/lib/pipeline/redact";
import type { RecommendationTarget } from "@/lib/pipeline/recommendation";
import type { ContentType } from "@/lib/types/database";

/** Hoeveel van het winnende antwoord meegaat, zelfde maat als in briefing.ts. */
const ANSWER_EXCERPT_CHARS = 700;

const SYSTEM =
  "Je bereidt ÉÉN webpagina voor. Je schrijft die pagina NIET; je brengt in kaart wat erop moet " +
  "staan om compleet te zijn. " +
  "Je krijgt: de vraag die de pagina moet winnen, het type pagina, de branche, en wat een " +
  "AI-assistent nu op die vraag antwoordt. " +
  "OPDRACHT: " +
  "(1) DEELVRAGEN. Welke vragen wil iemand die dit zoekt beantwoord zien, in de volgorde waarin hij " +
  "ze stelt? Denk aan wat een lezer echt bezighoudt: wat het kost, hoe lang het duurt, wat er wel " +
  "en niet bij zit, waar hij op moet letten, wat er misgaat als hij het verkeerd aanpakt. Niet de " +
  "onderwerpen die een marketeer zou noemen, maar de vragen die een mens stelt. " +
  "(2) VERVOLGVRAGEN. Wat vraagt diezelfde lezer daarna, als de pagina zijn werk goed doet? " +
  "(3) TWIJFELS. Welke bezwaren of zorgen moet een pagina hierover wegnemen? " +
  "(4) UITLEG. Welke vaktermen, keurmerken, normen of wettelijke begrippen komen in dit onderwerp " +
  "voor die een lezer zonder vakkennis niet kent? ZOEK die op en geef per term de algemeen " +
  "geldende uitleg, de URL waar je hem vond, en een LETTERLIJK fragment van die pagina dat de " +
  "uitleg dekt. " +
  "HARDE REGELS: " +
  "(a) Alles wat je oplevert gaat over het ONDERWERP in het algemeen, nooit over een specifiek " +
  "bedrijf. Je weet niets over de aanbieder en je verzint niets over hem. " +
  "(b) Noem GEEN bedrijfsnamen, ook niet in de uitleg of in een deelvraag. " +
  "(c) Een uitleg zonder werkende bron-URL en zonder letterlijk citaat is waardeloos: laat hem dan " +
  "weg. Wij controleren namelijk of dat citaat echt op die pagina staat, en een uitleg die de " +
  "controle niet haalt vervalt. " +
  "(d) Een lege lijst is een geldig antwoord. Vijf verzonnen deelvragen zijn slechter dan drie echte. " +
  "(e) Schrijf in het Nederlands, in gewone taal, zoals de lezer het zou zeggen. " +
  "(f) Gebruik GEEN gedachtestreepjes en GEEN schuine streep tussen twee woorden.";

export interface DossierResult {
  dossier: ItemDossier;
  /** De uitleg mét het oordeel van de bronverificatie (A7). */
  explainers: VerifiedExplainer[];
}

export interface DossierInput {
  title: string;
  type: ContentType;
  targetIntent: string;
  why: string;
  industry: string | null;
  /** De clusterbrede context, expliciet als achtergrond gelabeld (S10). */
  cluster: string | null;
  targets: RecommendationTarget[];
  winningAnswers: string[];
  competitors: string[];
  analysisId: string;
  profileId: string;
}

/**
 * Onderzoekt wat deze ene pagina nodig heeft.
 *
 * De concurrentnamen gaan er hier al uit, net als bij de bronanalyse: alles wat
 * deze stap oplevert belandt uiteindelijk in de schrijfprompt, en daar geldt de
 * harde regel dat er nooit een concurrent op de pagina van de klant komt.
 */
export async function researchItem(input: DossierInput): Promise<DossierResult> {
  const vragen = input.targets.map((t) => t.text).filter(Boolean);

  const user = [
    `Type pagina: ${input.type}`,
    `Titel van de pagina: "${input.title}"`,
    `Doel van de pagina: ${input.targetIntent}`,
    `Waarom deze pagina er komt: ${input.why}`,
    `Branche: ${input.industry ?? "onbekend"}`,
    input.cluster
      ? `Het bredere cluster waarin deze pagina valt (ACHTERGROND, niet het onderwerp van deze pagina): ${input.cluster}`
      : "",
    vragen.length
      ? `DE VRAAG DIE DEZE PAGINA MOET WINNEN (hier draait alles om):\n- ${vragen.join("\n- ")}`
      : "",
    input.winningAnswers.length
      ? `Wat een AI-assistent NU op die vraag antwoordt (namen weggehaald), als beeld van de lat:\n"""\n` +
        input.winningAnswers
          .map((a) => redactCompetitors(a, input.competitors).slice(0, ANSWER_EXCERPT_CHARS))
          .join("\n---\n") +
        `\n"""`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await callStructured({
    model: MODELS.quality,
    system: SYSTEM,
    user,
    schema: ItemDossier,
    schemaName: "item_dossier",
    webSearch: true,
    work: "analytical",
    meta: { kind: "item_dossier", analysisId: input.analysisId, profileId: input.profileId },
  });

  const explainers = await verifyExplainers(result.parsed.explainers ?? []);

  return { dossier: result.parsed, explainers };
}
