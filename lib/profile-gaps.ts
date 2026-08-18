/**
 * Wat het onderzoek niet met zekerheid kon vaststellen, en wat het oplevert als
 * de klant het alsnog invult.
 *
 * ── WAAROM DIT EEN EIGEN MODULE IS ──────────────────────────────────────────
 *
 * Dit stond als lokale functie in `toevoegingen/page.tsx`, een servercomponent,
 * en was daardoor niet te testen vanuit `scripts/test-unit.ts` (conventie 2).
 * Bij de herindeling van 17 augustus 2026 gingen feitenvragen en open punten
 * naar één scherm, en toen zou dezelfde functie op twee plekken nodig zijn: op
 * `/merk/[id]/merkprofiel/input` en straks in de teller op Overzicht. Twee
 * kopieën van dezelfde vier regels lopen gegarandeerd uit elkaar.
 *
 * Bewust ZONDER `server-only`: anders is het niet importeerbaar vanuit de
 * unittests.
 *
 * ⚠️ Elk punt noemt het **gevolg**, niet het gemis. "Andere schrijfwijzen
 * ontbreken" zegt een MKB'er niets; "dan telt die vermelding niet mee en valt
 * je score te laag uit" wel. Dat is `docs/schrijfstijl.md` richtlijn 7 toegepast
 * op een lege waarde.
 */

/** Eén open punt: wat er ontbreekt, en wat invullen oplevert. */
export interface ProfileGap {
  label: string;
  effect: string;
}

/** Alleen de velden die dit oordeel dragen. Bewust smal, zodat de unittest niet een heel profiel hoeft na te bouwen. */
export interface GapInput {
  aliases: string[];
  proof_points: string[];
  service_scope: string | null;
  service_regions: string[];
  business_model: string | null;
}

export function findGaps(profile: GapInput): ProfileGap[] {
  const gaps: ProfileGap[] = [];

  if (profile.aliases.length === 0) {
    gaps.push({
      label: "Andere schrijfwijzen van je naam",
      effect:
        'Noemt een AI je als "Jansen BV" terwijl je dossier "Bakkerij Jansen" zegt, dan telt die vermelding niet mee. Je score valt dan te laag uit.',
    });
  }

  if (profile.proof_points.length < 3) {
    gaps.push({
      label: "Concrete feiten over je bedrijf",
      effect:
        "Cijfers, jaartallen en termijnen zijn wat een AI-assistent aanhaalt. Zonder die feiten wordt elke tekst die ORBIT ENGINE schrijft noodgedwongen algemeen, en algemeen wordt niet geciteerd.",
    });
  }

  if (profile.service_scope === "lokaal" && profile.service_regions.length === 0) {
    gaps.push({
      label: "In welke plaats of streek je werkt",
      effect:
        "ORBIT ENGINE ziet dat je lokaal werkt, maar niet waar. Zonder plaatsnaam gaan de vragen landelijk, en meet je jezelf af tegen partijen waar je nooit tegenaan loopt.",
    });
  }

  if (!profile.business_model) {
    gaps.push({
      label: "Wat voor bedrijf je bent",
      effect:
        "Dienstverlener, retailer, fabrikant of platform: dat bepaalt waar ORBIT ENGINE in je aanbod naar zoekt en welke vragen het straks stelt. Met zekerheid afleiden lukte niet.",
    });
  }

  return gaps;
}
