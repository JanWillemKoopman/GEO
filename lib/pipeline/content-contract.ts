import "server-only";

/**
 * Het CONTENTCONTRACT opstellen: de inhoudsopgave van één pagina
 * (docs/tasks/contentpijplijn-herontwerp.md A2, migratie 0082).
 *
 * ── WAT HIER SAMENKOMT ──────────────────────────────────────────────────────
 *
 *   • het ITEMDOSSIER (A1): welke deelvragen, vervolgvragen en twijfels horen
 *     bij dit onderwerp, plus de geverifieerde algemene uitleg;
 *   • het PAGINAPLAN uit de claim-audit (S2): welke beweringen moet de pagina
 *     doen, en welke daarvan zijn gedekt;
 *   • de FEITENKAART (R5.3): welke F-nummers er beschikbaar zijn.
 *
 * Daaruit komt één lijst secties. Die lijst gaat naar de schrijver ÉN naar de
 * dekkingspoort (`content-coverage.ts`). Dat is de kern van het ontwerp:
 * dezelfde lijst die de opdracht geeft, rekent hem na. Een promptinstructie is
 * een intentie, code is een garantie (conventie 1).
 *
 * ── WAAROM DE DOELLENGTE HIER LANDT EN NIET IN DE PROMPT ────────────────────
 *
 * Er ging al een bandbreedte per paginatype mee ("400 tot 700 woorden"). Een
 * bandbreedte voor een hele pagina stuurt niets: het model verdeelt hem zoals
 * het uitkomt, en de gemeten uitkomst was 548 woorden gemiddeld, onder de
 * ondergrens van drie van de vier paginatypes. Per sectie een richtlengte
 * afspreken doet dat wel, en maakt tegelijk meetbaar welke sectie te dun bleef.
 */
import { callStructured } from "@/lib/openai/structured";
import { MODELS } from "@/lib/openai/models";
import { ContentContract } from "@/lib/schemas/content-contract";
import { formatFactCard, type FactItem } from "@/lib/pipeline/factcard";
import { normaliseerContract } from "@/lib/pipeline/contract-format";
import { formatExplainerBlock, type VerifiedExplainer } from "@/lib/pipeline/explainer-verify";
import type { ItemDossier } from "@/lib/schemas/item-dossier";
import type { AuditedClaim } from "@/lib/schemas/claim-audit";
import type { RecommendationTarget } from "@/lib/pipeline/recommendation";
import type { ContentType } from "@/lib/types/database";

const SYSTEM =
  "Je maakt de INHOUDSOPGAVE van één webpagina voor de eigen site van een ondernemer. Je schrijft " +
  "de pagina niet; je legt vast wat erop moet staan en in welke volgorde. " +
  "OPDRACHT: " +
  "(1) OPENING. Formuleer het directe antwoord op de doelvraag in maximaal twee zinnen, zoals het " +
  "bovenaan de pagina komt te staan. Dit is het antwoord dat een AI-assistent moet kunnen " +
  "overnemen: volledig, concreet, en te begrijpen zonder de rest van de pagina. Is de doelvraag " +
  "een ja-of-nee-vraag, dan begint dit antwoord met ja of nee. " +
  "(2) SECTIES. Maak per deelvraag één sectie: een kop zoals hij op de pagina komt, de ENE vraag " +
  "die de sectie beantwoordt, wat er inhoudelijk in moet, welke F-nummers erin thuishoren, welke " +
  "vaktermen erin uitgelegd worden, en een richtlengte in woorden. " +
  "(3) FAQ. De vragen die als veelgestelde vragen op de pagina horen, in de woorden van de lezer. " +
  "HARDE REGELS: " +
  "(a) De pagina moet COMPLEET aanvoelen: een lezer mag na afloop geen voor de hand liggende vraag " +
  "meer overhouden. Neem daarom ook de vervolgvragen en de twijfels uit het dossier op, en niet " +
  "alleen de hoofdvraag. " +
  "(b) Elke sectie beantwoordt precies ÉÉN vraag. Twee vragen in één sectie betekent twee secties. " +
  "(c) Zet een F-nummer alleen bij een sectie als dat feit er echt thuishoort. Een sectie zonder " +
  "F-nummer is normaal: algemene uitleg over het onderwerp heeft er geen. " +
  "(d) Plan NOOIT een sectie die alleen waar te maken is met een feit dat we niet hebben. Onder " +
  "'NIET ONDERBOUWD' staat wat er ontbreekt; daar mag je omheen plannen, niet doorheen. " +
  "(e) Blijf binnen de totale doellengte die je krijgt. De som van de secties hoort daar ongeveer " +
  "op uit te komen, niet erboven. " +
  "(f) Gebruik GEEN gedachtestreepjes en GEEN schuine streep tussen twee woorden. " +
  "(g) Nederlands, gewone taal, geen jargon in de koppen.";

export interface ContractInput {
  title: string;
  type: ContentType;
  targetIntent: string;
  targets: RecommendationTarget[];
  facts: FactItem[];
  plan: AuditedClaim[];
  dossier: ItemDossier | null;
  explainers: VerifiedExplainer[];
  targetWords: { min: number; max: number };
  typeGuidance: string;
  analysisId: string;
  profileId: string;
}

/** Het plan uit de claim-audit als twee lijsten: wat we kunnen dragen en wat niet. */
function planBlok(plan: AuditedClaim[]): string {
  if (plan.length === 0) return "";
  const gedekt = plan.filter((c) => c.supported);
  const ongedekt = plan.filter((c) => !c.supported);
  return [
    gedekt.length
      ? `ONDERBOUWD (dit mag de pagina beweren, met het genoemde F-nummer):\n` +
        gedekt.map((c) => `- ${c.claim}${c.sourceRef ? ` [${c.sourceRef}]` : ""}`).join("\n")
      : "",
    ongedekt.length
      ? `NIET ONDERBOUWD (hier hebben we GEEN feit voor; plan er geen sectie omheen):\n` +
        ongedekt.map((c) => `- ${c.claim}`).join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function dossierBlok(dossier: ItemDossier | null): string {
  if (!dossier) return "";
  return [
    dossier.subQuestions.length
      ? `DEELVRAGEN VAN DE LEZER (hier maak je secties van):\n` +
        dossier.subQuestions.map((v) => `- ${v.question} (${v.why})`).join("\n")
      : "",
    dossier.followUps.length
      ? `VERVOLGVRAGEN (deze horen er ook op, anders voelt de pagina onaf):\n- ${dossier.followUps.join("\n- ")}`
      : "",
    dossier.concerns.length
      ? `TWIJFELS DIE DE PAGINA MOET WEGNEMEN:\n- ${dossier.concerns.join("\n- ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Stelt het contract op. Eén goedkope aanroep, geen web-zoekactie. */
export async function buildContentContract(input: ContractInput): Promise<{
  contract: ContentContract;
  raw: unknown;
}> {
  const user = [
    `Te maken pagina: "${input.title}" (type: ${input.type})`,
    `Doel: ${input.targetIntent}`,
    input.typeGuidance,
    input.targets.length
      ? `DE VRAAG DIE DEZE PAGINA MOET WINNEN:\n- ${input.targets.map((t) => t.text).join("\n- ")}`
      : "",
    `Totale doellengte van de pagina: ${input.targetWords.min} tot ${input.targetWords.max} woorden.`,
    dossierBlok(input.dossier),
    formatExplainerBlock(input.explainers),
    formatFactCard(input.facts),
    planBlok(input.plan),
  ]
    .filter(Boolean)
    .join("\n\n");

  const result = await callStructured({
    model: MODELS.quality,
    system: SYSTEM,
    user,
    schema: ContentContract,
    schemaName: "content_contract",
    webSearch: false,
    work: "analytical",
    meta: { kind: "content_contract", analysisId: input.analysisId, profileId: input.profileId },
  });

  return { contract: normaliseerContract(result.parsed), raw: result.raw };
}
