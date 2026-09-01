import { z } from "zod";

/**
 * Het ITEMDOSSIER: wat heeft juist DIT contentitem nodig?
 * (docs/tasks/contentpijplijn-herontwerp.md A1, migratie 0082)
 *
 * ── WAAROM PER ITEM EN NIET PER CLUSTER ─────────────────────────────────────
 *
 * Een cluster (één analyse) is de eenheid waarin ORBIT ENGINE KANSEN vindt:
 * daar horen de meting, de gemiste vragen en de aanbevelingen. Het is niet de
 * eenheid waarin je schrijft. De aanbevelingen binnen één cluster lopen sterk
 * uiteen (levertijd, certificeringen, duurzaamheid), en S9 en S10 lieten zien
 * wat er gebeurt als clusterbrede input een specifieke pagina stuurt: een
 * pagina over certificeringen kreeg "levertijd 24 uur" als lat mee.
 *
 * Dit dossier draait daarom één keer per aanbeveling, mét web_search, en
 * beantwoordt drie vragen die nergens anders beantwoord worden: welke
 * deelvragen stelt een lezer bij deze doelvraag, welke vervolgvragen komen
 * daarna, en welke algemene begrippen moeten worden uitgelegd.
 *
 * ── WAAROM ELKE UITLEG EEN BRON MET CITAAT KRIJGT ───────────────────────────
 *
 * De feitenkaart bewaakt alles wat de pagina over de KLANT beweert (R5.3). De
 * tweede laag van een goede pagina, de algemene uitleg over het onderwerp, had
 * die bewaking niet: die mocht zonder F-nummer geschreven worden en werd door
 * niets nagerekend. Een completere pagina betekent meer van die laag, dus
 * groeit dat gat mee. Vandaar `sourceUrl` plus `quote`: code controleert of het
 * citaat echt op die pagina staat (`lib/pipeline/explainer-verify.ts`), en
 * alleen geverifieerde uitleg gaat de schrijfprompt in.
 */

/** Eén begrip dat uitleg nodig heeft, met de bron waar die uitleg vandaan komt. */
export const DossierExplainer = z.object({
  term: z.string(),
  /** De algemeen geldende uitleg. Nooit een bewering over dit specifieke bedrijf. */
  explanation: z.string(),
  /** De pagina waar de uitleg vandaan komt. Volledige URL, https. */
  sourceUrl: z.string(),
  /** Een letterlijk fragment van die pagina dat de uitleg dekt. Code rekent dit na. */
  quote: z.string(),
});

export type DossierExplainer = z.infer<typeof DossierExplainer>;

export const ItemDossier = z.object({
  /**
   * De deelvragen die iemand met deze doelvraag óók beantwoord wil zien,
   * in de volgorde waarin hij ze stelt.
   */
  subQuestions: z.array(
    z.object({
      question: z.string(),
      /** Waarom een lezer dit wil weten. Stuurt de volgorde van de secties. */
      why: z.string(),
    }),
  ),
  /** Wat de lezer daarna vraagt, als de pagina zijn werk goed doet. */
  followUps: z.array(z.string()),
  /** Twijfels en bezwaren die een pagina hierover moet wegnemen. */
  concerns: z.array(z.string()),
  explainers: z.array(DossierExplainer),
});

export type ItemDossier = z.infer<typeof ItemDossier>;
