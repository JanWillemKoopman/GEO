/**
 * De stemvelden uit het merkdossier die tot WP1 van
 * docs/tasks/contentpijplijn-publicatiewaardig.md nergens de schrijfopdracht in
 * gingen (§9.1 van dat plan).
 *
 * ── WAAROM ──────────────────────────────────────────────────────────────────
 *
 * `brand-fields.ts` zei bij zes velden letterlijk "wordt op dit moment niet in
 * de teksten gebruikt": het kennisniveau van de lezer, eigen uitdrukkingen,
 * kernwoorden, het onderscheid, de USP en de kernboodschappen. De adviseur kon
 * ze invullen en de schrijver zag er niets van. Bij de installateur, die "geen
 * vakjargon zonder uitleg" vraagt, is juist het kennisniveau van de lezer de
 * maatstaf voor hoeveel uitleg er in een zin hoort.
 *
 * Een leeg veld levert geen regel op (conventie 3): liever geen sturing dan een
 * verzonnen standaard. De emotieschuif (`tone_emotional`) gaat bewust nog niet
 * mee; die hoort bij de stemvelden van WP8.
 *
 * Puur (conventie 2), testbaar vanuit `scripts/test-unit.ts`.
 */
import { schoneWaardeproposities } from "@/lib/pipeline/waardeproposities";

export interface StemInvoer {
  audience_knowledge_level?: 1 | 2 | 3 | null;
  signature_phrases?: string[] | null;
  identity_keywords?: string[] | null;
  differentiator?: string | null;
  usp?: string | null;
  key_messages?: string[] | null;
  value_props?: string[] | null;
}

/**
 * Het kennisniveau als instructie, niet als cijfer: een model weet niet wat
 * "1" betekent, wel wat "leg elke vakterm uit" betekent. De drie standen zijn
 * die van het merkprofielscherm ("Weinig", "Redelijk wat", "Veel, is vakgenoot").
 */
export const KENNISNIVEAU: Record<1 | 2 | 3, string> = {
  1: "de lezer weet weinig van het vak: leg elke vakterm in dezelfde zin uit, in gewone woorden",
  2: "de lezer weet redelijk wat: gangbare vaktermen mogen, een minder bekende term leg je kort uit",
  3: "de lezer is vakgenoot: vaktermen zonder uitleg, geen basisuitleg",
};

function gevuld(lijst: string[] | null | undefined): string[] {
  return (lijst ?? []).map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean);
}

/**
 * Het blok voor de schrijfopdracht. Lege string als er niets te sturen valt.
 *
 * De waardeproposities staan hier ook, geschoond (`waardeproposities.ts`): ze
 * horen bij dezelfde vraag, waarom klanten dit bedrijf kiezen, en stonden als
 * losse regel zonder die schoonmaak in de prompt.
 */
export function merkstemblok(p: StemInvoer): string {
  const regels: string[] = [];

  const niveau = p.audience_knowledge_level;
  if (niveau === 1 || niveau === 2 || niveau === 3) {
    regels.push(`Kennis van de lezer: ${KENNISNIVEAU[niveau]}.`);
  }

  const proposities = schoneWaardeproposities(p.value_props);
  if (proposities.length) {
    regels.push(`Waarom klanten voor dit bedrijf kiezen: ${proposities.join("; ")}.`);
  }
  if (p.differentiator?.trim()) {
    regels.push(`Wat de doorslag geeft tegenover andere aanbieders: ${p.differentiator.trim()}`);
  }
  if (p.usp?.trim()) {
    regels.push(`Het ene punt waarop dit bedrijf wint: ${p.usp.trim()}`);
  }

  const boodschappen = gevuld(p.key_messages);
  if (boodschappen.length) {
    regels.push(
      `Kernboodschappen (laat er minstens één terugkomen waar hij past, niet als losse slogan): ` +
        boodschappen.join("; ") +
        ".",
    );
  }

  const uitdrukkingen = gevuld(p.signature_phrases);
  if (uitdrukkingen.length) {
    regels.push(
      `Uitdrukkingen die het bedrijf zelf gebruikt (mogen letterlijk terugkomen, hooguit één of twee ` +
        `per pagina): ${uitdrukkingen.map((u) => `"${u}"`).join(", ")}.`,
    );
  }

  const kernwoorden = gevuld(p.identity_keywords);
  if (kernwoorden.length) {
    regels.push(`Woorden die bij dit bedrijf horen: ${kernwoorden.join(", ")}.`);
  }

  if (regels.length === 0) return "";
  // Een stellig kopje, zonder herkomst: dit is wat het bedrijf is, en de
  // schrijver hoort het als zodanig te brengen (§7.3 van het plan).
  return `\nHET MERK, uit het merkdossier:\n- ${regels.join("\n- ")}`;
}
