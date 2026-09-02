/**
 * Welke handelingen geld kosten, wie ze mag starten, en wat de klant leest als
 * hij ze niet mag.
 *
 * ── WAAROM DIT LOS STAAT VAN `cost-guard.ts` ────────────────────────────────
 *
 * Conventie 2: alles wat de uitkomst bepaalt hoort in een pure, importeerbare
 * module zonder `server-only`, anders is het niet te testen vanuit
 * `scripts/test-unit.ts`. De vraag "is deze ingelogde gebruiker beheerder" is
 * serverwerk en staat in `lib/cost-guard.ts`; de lijst handelingen, wie ze mag
 * en hun meldingen is data en staat hier.
 */

/** Elke handeling die een betaalde AI-aanroep in gang zet. */
export type CostlyAction =
  | "merk_onderzoeken"
  | "analyse_starten"
  | "meting_starten"
  | "content_schrijven"
  | "plan_goedkeuren"
  | "reputatie_starten"
  | "clusters_aanvullen";

/**
 * De enige handeling die alleen de beheerder start, en waarom juist deze.
 *
 * ── HOE DIT GELOPEN IS ──────────────────────────────────────────────────────
 *
 * Tot 27 augustus 2026 stonden alle zes op slot (besluit 18, 11 augustus 2026).
 * De rekensom eronder klopte, een klant met acht onderwerpen kon op één middag
 * $6,56 uitgeven, maar het gevolg in het scherm was erger dan de rekening: de
 * klant zag vier volle knoppen die pas ná de klik weigerden, en de taak "Bekijk
 * en bevestig het concept" stond zelfs als tweede regel in zijn eigen werklijst
 * op de startpagina. Zijn eerste zelfstandige sessie liep dus vast op werk dat
 * hij betaald had.
 *
 * Diezelfde dag is dat in twee stappen rechtgezet. Eerst gingen de vier
 * handelingen binnen zijn pakket open. Daarna, op verzoek van de eigenaar, ook
 * het onderzoeken van een nieuw merk: de klant doet zijn eigen groeiwerk, en
 * daar hoort het aanmaken van een merk bij.
 *
 * ── WAT ER OVERBLIJFT, EN WAAROM ────────────────────────────────────────────
 *
 * De reputatieanalyse. Dat is geen stap in de maandelijkse ronde maar een LOS
 * PRODUCT dat een klant apart koopt, en het is de enige handeling in de app
 * waarvoor dat geldt. De knop blijft daarom zichtbaar met een uitnodiging
 * ernaast in plaats van verborgen: hij mag zien dat het bestaat, hij weet bij
 * wie hij moet zijn, en zonder die knop verkoop je het nooit.
 *
 * De rem op de rekening is daarmee niet deze functie maar het budgetplafond
 * (`lib/spend-limit.ts`). Dat telt per account door en geldt voor iedereen, ook
 * voor de beheerder.
 *
 * ⚠️ Dit gaat alleen over betaald werk. Wie bij de beheerschermen mag
 * (onboarding, diagnose, toewijzen, alle merken, koppelingen) is een andere
 * vraag, en die staat in `lib/staff.ts` en in de schermen zelf.
 *
 * ── DE TWEEDE, TOEGEVOEGD OP 30 AUGUSTUS 2026 ───────────────────────────────
 *
 * `clusters_aanvullen` (de knop "Stel nieuwe clusters voor",
 * docs/optimalisatielab-orbit-engine.md werkpakket A §3.5) is om een andere
 * reden op slot dan `reputatie_starten`: niet omdat het een apart product is,
 * maar omdat het een REGIEKNOP is. De eigenaar bepaalt wanneer het beeld van
 * een merk (gesprek, meetuitkomsten, klantantwoorden) goed genoeg is om er een
 * nieuwe ronde onderwerpen op los te laten, niet de klant. Anders dan bij
 * `reputatie_starten` mag deze knop bij de klant ook niet ZICHTBAAR zijn: hij
 * ziet wél de onderwerpen die eruit komen, maar niet de knop die ze aanmaakt
 * (het scherm verbergt hem voor niet-beheerders; deze lijst is de garantie op
 * de achterkant, conventie 1).
 *
 * ── DE TERUGDRAAI, 2 SEPTEMBER 2026 (herstelplan na audit, T4) ──────────────
 *
 * De vier hierboven zijn op verzoek van de eigenaar weer op slot gezet, en nu
 * gaat het niet meer om welke handeling een apart product of een regieknop is:
 * ALLE zeven horen van de beheerder te zijn. Op productie kon een klant met een
 * gewoon inlogaccount zelf een merk aanmaken en een cluster starten
 * (`POST /api/profiles` en `POST /api/analyses` gaven allebei een 201), en dat
 * is precies wat sales-led (`docs/logbook.md` §15) uitsluit: de klant koopt,
 * de pijplijn doet het onderzoek, niet andersom.
 *
 * Wat NIET terugdraait: de knoppen blijven zichtbaar en klikbaar (kader 2 van
 * het herstelplan). Anders dan bij `clusters_aanvullen` is dit geen regieknop
 * die de klant niet hoort te zien; hij mag weten dat de functie bestaat en
 * krijgt bij het klikken de melding dat zijn customer success manager dit voor
 * hem doet. Dat is ook waarom er geen `staff &&` terugkwam in de schermen:
 * alleen deze lijst, en dus deze ene plek, bepaalt het slot.
 */
export const STAFF_ONLY_ACTIONS: readonly CostlyAction[] = [
  "merk_onderzoeken",
  "analyse_starten",
  "meting_starten",
  "content_schrijven",
  "plan_goedkeuren",
  "reputatie_starten",
  "clusters_aanvullen",
] as const;

/** Mag alleen de beheerder deze handeling starten? Puur, dus testbaar. */
export function actionNeedsStaff(action: CostlyAction): boolean {
  return STAFF_ONLY_ACTIONS.includes(action);
}

/**
 * Herstelplan na audit T4.2: "je consultant" is de customer success manager bij
 * Outer Orbit geworden, in alle zeven zinnen. Uitnodigend, niet afwijzend: de
 * klant mag weten dat de functie bestaat, en bij wie hij moet zijn.
 */
export const COST_DENIED: Record<CostlyAction, string> = {
  merk_onderzoeken:
    "Een nieuw merk onderzoeken doet je customer success manager bij Outer Orbit voor je. Neem contact op, dan zetten we het klaar.",
  analyse_starten:
    "Een nieuw onderwerp meten doet je customer success manager bij Outer Orbit voor je. Laat weten welk onderwerp je erbij wilt, dan starten we het.",
  meting_starten:
    "De meting wordt door je customer success manager bij Outer Orbit gestart. Zo weet je zeker dat hij op het juiste moment draait.",
  content_schrijven:
    "Het schrijven wordt door je customer success manager bij Outer Orbit in gang gezet. Jij bepaalt wél wat er geschreven wordt: kies de pagina's en de rest gaat vanzelf.",
  plan_goedkeuren:
    "Deze maand goedkeuren doet je customer success manager bij Outer Orbit samen met jou. Laat weten dat je akkoord bent.",
  // ⚠️ Dit is de belangrijkste van de zeven, want het is de enige handeling die
  // een LOS PRODUCT in gang zet dat de klant apart koopt. De toon is dus geen
  // afwijzing maar een uitnodiging: hij mag het zien, hij weet nu dat het
  // bestaat, en hij weet bij wie hij moet zijn. Zou de knop verborgen zijn, dan
  // wist hij niet dat dit product er is, en dan verkoop je het nooit.
  reputatie_starten:
    "Een reputatieanalyse zet je customer success manager bij Outer Orbit voor je in gang. Laat weten dat je hem wilt, dan plannen we hem in.",
  // Deze melding komt de klant normaal nooit te zien: de knop staat niet op
  // zijn scherm. Ze is de garantie voor als iemand de route rechtstreeks
  // aanroept, niet de eerste verdedigingslinie.
  clusters_aanvullen:
    "Nieuwe onderwerpen voorstellen doet je customer success manager bij Outer Orbit voor je, op het moment dat hij kiest.",
};
