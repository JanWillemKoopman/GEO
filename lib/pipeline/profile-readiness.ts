/**
 * Is dit merkdossier af genoeg om mee het gesprek in te gaan?
 *
 * ── WAAROM DIT ER MOEST KOMEN ───────────────────────────────────────────────
 *
 * Het profiel gaat op status `klaar` na taak 2 van 8 (`prepare-profile.ts`).
 * Dat is bewust: de klant hoeft niet op de aanbodboom te wachten om zijn merk te
 * zien. Maar het maakte "klaar" een leugen voor de consultant, die juist wil
 * weten of hij het scherm kán delen. Er was nergens een antwoord op de vraag
 * "is dit af?" behalve zelf acht kaarten langslopen en kijken of ze gevuld zijn.
 *
 * ── HET MODEL KOMT VAN NOVA ─────────────────────────────────────────────────
 *
 * Nova's onboarding eindigt op "Review & launch": een lijst regels met per regel
 * een stand (`completed`, `badgeAttention`, `badgeSkipped`), één primaire knop,
 * en als er iets openstaat de zin `launchBlocked: "Finish these first: {items}"`.
 * Je ziet in één blik wat er nog moet en de knop zegt zelf waarom hij niet mag.
 *
 * Dat is precies wat hier ontbrak, dus hetzelfde model: regels met een stand,
 * en een uitkomst die zegt of het geheel af is.
 *
 * Het onderscheid tussen `nodig` en `optioneel` is het verschil tussen "dit
 * dossier is niet af" en "dit dossier is af maar kan scherper". Alleen de
 * eerste soort blokkeert; de tweede is de gespreksagenda. Zonder dat onderscheid
 * staat een profiel eeuwig op 90% omdat de klant drie feitvragen niet invulde,
 * en dan betekent het balkje niets meer.
 *
 * Puur, dus testbaar vanuit `scripts/test-unit.ts` (conventie 2).
 */
import type { ResearchStep } from "@/lib/pipeline/research-steps";

export type ReadinessState = "klaar" | "leeg" | "loopt";

export interface ReadinessRow {
  /** Kort, in de taal van de consultant. */
  label: string;
  state: ReadinessState;
  /** Wat er staat als het klaar is, bv. "31 pagina's". Null als er niets te melden is. */
  detail: string | null;
  /** Ontbreekt dit, dan is het dossier niet af. */
  nodig: boolean;
  /** Waar dit op het scherm staat, voor de springlink. */
  anchor: string;
}

export interface ReadinessInput {
  /**
   * Voor de springlinks. Sinds de herstructurering van augustus 2026 staan
   * "Aanbod", "Profielgegevens" en "Vragen" niet meer op het merkdossier zelf
   * maar op eigen subpagina's; zonder het profiel-id kan een rij daar niet
   * meer naar wijzen.
   */
  profileId: string;
  steps: ResearchStep[];
  pages: number;
  offerings: number;
  topics: number;
  auditChecks: number;
  baselineRows: number;
  dossier: boolean;
  /**
   * Feitvragen die de klant nog niet beantwoordde of oversloeg.
   *
   * ⚠️ Hier zitten sinds 24 augustus 2026 ook de open punten uit de synthese in.
   * Die stonden tot dan als losse telling naast deze rij, terwijl ze nu gewone
   * `fact_requests` zijn (`lib/pipeline/gap-questions.ts`). Twee rijen die
   * hetzelfde tellen zouden elke agenda dubbel opschrijven.
   */
  openFactRequests: number;
  /**
   * Staat het werkgebied vast? `service_scope` gevuld, en bij 'lokaal' ook
   * minstens één regio. Zie de regel "Werkgebied vastgesteld" hieronder.
   */
  scopeKnown: boolean;
  /** Wat er staat, voor het detailregeltje. Null als het leeg is. */
  scopeDetail?: string | null;
  /**
   * De twee overige startvoorwaarden uit hoofdstuk 14.1: het pakket op het
   * account (voorwaarde voor een contentplan) en of het merk al aan het
   * klantaccount is toegewezen (voorwaarde om te kunnen inloggen).
   *
   * ⚠️ Blokkeren `compleet` NIET (`nodig: false` verderop). Het product is
   * sales-led: tijdens dit gesprek is het merk meestal nog niet toegewezen en
   * staat er nog geen pakket, dat gebeurt pas ná de verkoop (`CLAUDE.md`,
   * `docs/logbook.md` §15). Dit zijn twee informatieve regels voor de agenda
   * ná het gesprek, geen reden om het dossier "niet compleet" te noemen.
   */
  packagePages: number | null;
  assigned: boolean;
}

export interface Readiness {
  rows: ReadinessRow[];
  /** Alles wat `nodig` is, is `klaar`. */
  compleet: boolean;
  /** Draait er nog werk? Dan is "niet compleet" geen bevinding maar een tussenstand. */
  loopt: boolean;
  klaarAantal: number;
  nodigAantal: number;
  /** De regels die het blokkeren, in leesvolgorde. Leeg zodra `compleet`. */
  ontbreekt: ReadinessRow[];
  /** Wat het dossier scherper zou maken, maar niets blokkeert. */
  optioneelOpen: ReadinessRow[];
}

/**
 * Staat er nog werk open voor de taak die deze regel vult? Dan is de regel niet
 * "leeg" maar "loopt", en dat scheelt de consultant een vals alarm in de eerste
 * zeven minuten.
 */
function stepRunning(steps: ResearchStep[], job: string): boolean {
  const s = steps.find((x) => x.job === job);
  return s ? s.state === "bezig" || s.state === "wacht" : false;
}

function row(
  label: string,
  gevuld: boolean,
  detail: string | null,
  nodig: boolean,
  anchor: string,
  loopt: boolean,
): ReadinessRow {
  return {
    label,
    state: gevuld ? "klaar" : loopt ? "loopt" : "leeg",
    detail: gevuld ? detail : null,
    nodig,
    anchor,
  };
}

export function assessReadiness(input: ReadinessInput): Readiness {
  const s = input.steps;
  const p = input.profileId;

  const rows: ReadinessRow[] = [
    row(
      "Website uitgelezen",
      input.pages > 0,
      `${input.pages} pagina's`,
      true,
      `/merk/${p}/merkprofiel/bewerken`,
      stepRunning(s, "profile_discover"),
    ),
    row(
      "Merkdossier",
      input.dossier,
      "Samengevat in gewone taal",
      true,
      `/merk/${p}/admin/0-meting#dossier`,
      stepRunning(s, "profile_synthesis"),
    ),
    row(
      "Aanbod in kaart",
      input.offerings > 0,
      `${input.offerings} onderdelen`,
      true,
      `/merk/${p}/admin/aanbodboom`,
      stepRunning(s, "profile_offering"),
    ),
    row(
      "Wat AI-assistenten weten",
      input.baselineRows > 0,
      "Nulmeting gedaan",
      true,
      `/merk/${p}/admin/0-meting#ai-kennis`,
      stepRunning(s, "profile_llm_baseline"),
    ),
    row(
      "Onderwerpen voorgesteld",
      input.topics > 0,
      `${input.topics} onderwerpen`,
      true,
      `/analyses/aanbevolen?merk=${p}`,
      stepRunning(s, "propose_topics"),
    ),
    row(
      "Technische controle",
      input.auditChecks > 0,
      `${input.auditChecks} controlepunten`,
      true,
      `/merk/${p}/analytics`,
      stepRunning(s, "technical_audit"),
    ),
    // ── Het werkgebied, en waarom het blokkeert (spoor R6) ──────────────────
    //
    // ⚠️ Toegevoegd op 11 augustus 2026. Sinds spoor R krijgt een lokaal merk
    // uitsluitend regionale vragen, en dat hangt volledig aan één veld:
    // `service_scope`. Staat het op `null`, dan vuurt de hele garantie niet en
    // krijgt een Brabantse dealer vragen over heel Nederland.
    //
    // Dat is geen theoretisch risico. Op productie stond dat veld bij vier van
    // de negen profielen op `null`, waaronder Fysi-Unique: een fysiopraktijk in
    // Amersfoort waarvan élke vermelding die het ooit verdiende uit een
    // regionale vraag kwam, en die er 57 betaalde metingen op landelijke vragen
    // naast had liggen met nul resultaat.
    //
    // Het staat hier en niet als harde stop in de pijplijn, om twee redenen.
    // Het product is sales-led: de consultant zet het profiel klaar vóór het
    // gesprek, dus dit is precies het moment waarop hij het ziet en het
    // eenvoudig kan zetten. En een harde stop zou de bestaande profielen met
    // een leeg bereik alsnog laten vastlopen, terwijl die gewoon te repareren
    // zijn. Blokkeren doet het wel: zonder werkgebied is het dossier niet af.
    row(
      "Werkgebied vastgesteld",
      input.scopeKnown,
      input.scopeDetail ?? null,
      true,
      `/merk/${p}/merkprofiel/bewerken`,
      stepRunning(s, "profile_research"),
    ),
    // Vanaf hier: scherper, niet noodzakelijk. Deze rij blokkeert nooit.
    row(
      "Vragen aan de klant beantwoord",
      input.openFactRequests === 0,
      "Alle vragen gehad",
      false,
      `/merk/${p}/strategie/vragen`,
      false,
    ),
    // ── De twee overige startvoorwaarden uit hoofdstuk 14.1 ─────────────────
    // Informatief, niet blokkerend: zie de uitleg bij `packagePages`/`assigned`
    // hierboven.
    row(
      "Pakket gekozen",
      input.packagePages !== null,
      input.packagePages !== null ? `${input.packagePages} pagina's per maand` : null,
      false,
      `/merk/${p}/admin/toewijzen`,
      false,
    ),
    row(
      "Merk toegewezen aan de klant",
      input.assigned,
      "De klant kan inloggen",
      false,
      `/merk/${p}/admin/toewijzen`,
      false,
    ),
  ];

  const nodig = rows.filter((r) => r.nodig);
  const ontbreekt = nodig.filter((r) => r.state !== "klaar");

  return {
    rows,
    compleet: ontbreekt.length === 0,
    loopt: rows.some((r) => r.state === "loopt"),
    klaarAantal: nodig.filter((r) => r.state === "klaar").length,
    nodigAantal: nodig.length,
    ontbreekt,
    optioneelOpen: rows.filter((r) => !r.nodig && r.state !== "klaar"),
  };
}

/**
 * De zin onder de kop van het afrondingsblok.
 *
 * Drie gevallen, en de volgorde is wat de consultant op dat moment moet weten.
 * Bij "compleet maar met open punten" wordt bewust niet gezegd dat er iets mis
 * is: het dossier is af, de punten zijn de agenda van het gesprek.
 */
export function readinessHeadline(r: Readiness, merk: string): string {
  if (r.loopt) {
    return `ORBIT ENGINE is nog bezig met ${merk}. ${r.klaarAantal} van de ${r.nodigAantal} onderdelen staan er al.`;
  }
  if (!r.compleet) {
    const namen = r.ontbreekt.map((x) => x.label.toLowerCase()).join(", ");
    return `Het dossier van ${merk} mist nog: ${namen}. Draai het onderzoek opnieuw als dit zo blijft.`;
  }
  if (r.optioneelOpen.length > 0) {
    return `Het dossier van ${merk} is compleet. Er staan nog ${r.optioneelOpen.length} punten open die de meting scherper maken, dat is de agenda voor het gesprek.`;
  }
  return `Het dossier van ${merk} is compleet. Je kunt het scherm delen en het gesprek in.`;
}
