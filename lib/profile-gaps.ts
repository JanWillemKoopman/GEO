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
 * kopieën van dezelfde vier regels lopen gegarandeerd uit elkaar. Sinds
 * onboarding 3.0 is de onboardingsessie de derde lezer.
 *
 * Bewust ZONDER `server-only`: anders is het niet importeerbaar vanuit de
 * unittests.
 *
 * ⚠️ Elk punt noemt het **gevolg**, niet het gemis. "Andere schrijfwijzen
 * ontbreken" zegt een MKB'er niets; "dan telt die vermelding niet mee en valt
 * je score te laag uit" wel. Dat is `docs/schrijfstijl.md` richtlijn 7 toegepast
 * op een lege waarde.
 *
 * ── OP GEVOLG GESORTEERD EN NIET OP VELDVOLGORDE ────────────────────────────
 *
 * De onboardingsessie opent met deze lijst, en dat is de belangrijkste keuze van
 * dat scherm: zonder die volgorde kost het gesprek een uur aan het bevestigen
 * van dingen die al klopten, en dat is precies het uur waar de klant voor
 * betaalt. De rangorde is niet willekeurig maar volgt wat een ontbrekend veld
 * kost, van duur naar goedkoop.
 */

import { BRAND_FIELDS, CLIENT_STEPS } from "@/lib/pipeline/brand-fields";

/** Eén open punt: wat er ontbreekt, en wat invullen oplevert. */
export interface ProfileGap {
  /** De kolom waar dit punt over gaat. Sleutel voor de springlink en voor n.v.t. */
  field: string;
  label: string;
  effect: string;
  /**
   * Hoe zwaar dit weegt, hoger is eerder. Geen vrij cijfer maar een rangorde met
   * een reden, zie het commentaar per punt.
   */
  weight: number;
}

/** Alleen de velden die dit oordeel dragen. Bewust smal, zodat de unittest niet een heel profiel hoeft na te bouwen. */
export interface GapInput {
  aliases: string[];
  proof_points: string[];
  service_scope: string | null;
  service_regions: string[];
  business_model: string | null;
}

export function findGaps(
  profile: GapInput,
  /**
   * Velden die bewust op "niet van toepassing" staan (migratie 0060). Die zijn
   * behandeld en horen niet meer als gat te verschijnen, anders haalt de lijst
   * nooit nul en wordt hij genegeerd.
   */
  notApplicable: string[] = [],
): ProfileGap[] {
  const gaps: ProfileGap[] = [];

  // ── 100: het bereik ───────────────────────────────────────────────────────
  // Het duurst van allemaal, want dit is het enige punt waarvan de fout pas ná
  // een betaalde meetronde zichtbaar wordt: zonder plaatsnaam gaan alle vragen
  // landelijk, en dan meet je een lokale praktijk af tegen de landelijke markt.
  // Ontdekken kost dan een nieuwe ronde, geen correctie.
  if (profile.service_scope === "lokaal" && profile.service_regions.length === 0) {
    gaps.push({
      field: "service_regions",
      label: "In welke plaats of streek je werkt",
      effect:
        "ORBIT ENGINE ziet dat je lokaal werkt, maar niet waar. Zonder plaatsnaam gaan de vragen landelijk, en meet je jezelf af tegen partijen waar je nooit tegenaan loopt.",
      weight: 100,
    });
  }

  // ── 80: de schrijfwijzen ──────────────────────────────────────────────────
  // Ook meetkritisch: de vermeldingsclassificatie eist de letterlijke naam in de
  // tekst. Eén ronde later te repareren dan het bereik, want de meting zelf is
  // wél bruikbaar, alleen de score valt te laag uit.
  if (profile.aliases.length === 0) {
    gaps.push({
      field: "aliases",
      label: "Andere schrijfwijzen van je naam",
      effect:
        'Noemt een AI je als "Jansen BV" terwijl je dossier "Bakkerij Jansen" zegt, dan telt die vermelding niet mee. Je score valt dan te laag uit.',
      weight: 80,
    });
  }

  // ── 60: het bedrijfsmodel ─────────────────────────────────────────────────
  // Stuurt welke vragen de klant krijgt vóór er geschreven wordt. Fout is
  // hinderlijk maar zichtbaar, en te corrigeren zonder iets opnieuw te betalen.
  if (!profile.business_model) {
    gaps.push({
      field: "business_model",
      label: "Wat voor bedrijf je bent",
      effect:
        "Dienstverlener, retailer, fabrikant of platform: dat bepaalt waar ORBIT ENGINE in je aanbod naar zoekt en welke vragen het straks stelt. Met zekerheid afleiden lukte niet.",
      weight: 60,
    });
  }

  // ── 40: de feiten ─────────────────────────────────────────────────────────
  // Raakt de kwaliteit van elke pagina, maar pas op het moment dat er
  // geschreven wordt, en dat is de stap die je sowieso nog nakijkt.
  if (profile.proof_points.length < 3) {
    gaps.push({
      field: "proof_points",
      label: "Concrete feiten over je bedrijf",
      effect:
        "Cijfers, jaartallen en termijnen zijn wat een AI-assistent aanhaalt. Zonder die feiten wordt elke tekst die ORBIT ENGINE schrijft noodgedwongen algemeen, en algemeen wordt niet geciteerd.",
      weight: 40,
    });
  }

  const nvt = new Set(notApplicable);
  return gaps
    .filter((g) => !nvt.has(g.field))
    .sort((a, b) => b.weight - a.weight);
}

/**
 * Waar de knop "Invullen" bij een open punt heen wijst.
 *
 * ⚠️ De wizard toont maar één stap tegelijk, dus een anker alléén is niet
 * genoeg: `proof_points` staat in stap 7 en het anker zou landen op een veld dat
 * niet in beeld staat. Vandaar de stap in de querystring én het anker erachter.
 *
 * Staat het veld niet in de klantstappen, dan is er niets om heen te wijzen en
 * geeft deze functie `null` terug. Een knop naar een scherm waar het veld niet
 * staat is een dood einde, en dat is zichtbaarder dan geen knop
 * (`docs/ux-design.md` §5). Een unittest bewaakt dat elk gat een bestemming
 * heeft.
 */
export function gapLink(profileId: string, field: string): string | null {
  const definitie = BRAND_FIELDS.find((f) => (f.key as string) === field);
  if (!definitie || !CLIENT_STEPS.includes(definitie.step)) return null;
  return `/merk/${profileId}/merkprofiel/bewerken?stap=${definitie.step}#veld-anker-${field}`;
}
