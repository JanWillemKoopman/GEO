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
  | "reputatie_starten";

/**
 * De twee handelingen die alleen de beheerder start, en waarom juist deze twee.
 *
 * ── DE VERSCHUIVING VAN 27 AUGUSTUS 2026 ────────────────────────────────────
 *
 * Tot vandaag stonden alle zes op slot (besluit 18, 11 augustus 2026). De
 * rekensom eronder klopte, een klant met acht onderwerpen kon op één middag
 * $6,56 uitgeven, maar het gevolg in het scherm was erger dan de rekening: de
 * klant zag vier volle knoppen die pas ná de klik weigerden, en de taak "Bekijk
 * en bevestig het concept" stond zelfs als tweede regel in zijn eigen werklijst
 * op de startpagina. Zijn eerste zelfstandige sessie liep dus vast op werk dat
 * hij betaald had.
 *
 * Wat blijft: de twee handelingen die géén werk binnen zijn pakket zijn.
 * Een nieuw merk onderzoeken is een nieuwe verkoop, en een reputatieanalyse is
 * een los product dat apart gekocht wordt. Bij die twee is "je consultant zet
 * dit voor je in gang" geen dichte deur maar een uitnodiging.
 *
 * Wat weg is: het slot op zijn eigen groeiwerk. Een cluster starten, de meting
 * bevestigen, content laten schrijven en een maand vrijgeven zijn precies
 * waarvoor hij betaalt, en dat is werk binnen het pakket dat hij al heeft.
 *
 * De rem op de rekening blijft bestaan, alleen niet meer deze: het budgetplafond
 * (`lib/spend-limit.ts`) telt per account door en geldt voor iedereen, ook voor
 * de beheerder.
 */
export const STAFF_ONLY_ACTIONS: readonly CostlyAction[] = [
  "merk_onderzoeken",
  "reputatie_starten",
] as const;

/** Mag alleen de beheerder deze handeling starten? Puur, dus testbaar. */
export function actionNeedsStaff(action: CostlyAction): boolean {
  return STAFF_ONLY_ACTIONS.includes(action);
}

/**
 * De melding die de klant leest als hij een handeling niet zelf mag starten.
 *
 * Per handeling een eigen zin (K2 uit `docs/logbook.md`: elke foutmelding is
 * specifiek). "Geen toegang" zou hier het verkeerde beeld geven: hij mág het
 * zien, het is geen fout van hem, en het is simpelweg werk dat de consultant in
 * gang zet. Elke zin zegt daarom wát er gebeurt en bij wie hij moet zijn, en
 * geen enkele klinkt als een deur die dichtslaat.
 *
 * ⚠️ Sinds 27 augustus 2026 zijn alleen de eerste en de laatste in gebruik; de
 * vier ertussen horen bij handelingen die de klant nu zelf doet. Ze blijven
 * staan omdat het slot per handeling gezet wordt (`STAFF_ONLY_ACTIONS`) en niet
 * per zin: verandert dat besluit ooit terug, dan hoort de zin er meteen te zijn
 * in plaats van dat er "geen toegang" op het scherm verschijnt.
 */
export const COST_DENIED: Record<CostlyAction, string> = {
  merk_onderzoeken:
    "Een nieuw merk onderzoeken doet je consultant voor je. Neem contact op, dan zetten we het klaar.",
  analyse_starten:
    "Een nieuw onderwerp meten doet je consultant voor je. Laat weten welk onderwerp je erbij wilt, dan starten we het.",
  meting_starten:
    "De meting wordt door je consultant gestart. Zo weet je zeker dat hij op het juiste moment draait.",
  content_schrijven:
    "Het schrijven wordt door je consultant in gang gezet. Jij bepaalt wél wat er geschreven wordt: keur de maand goed en de rest gaat vanzelf.",
  plan_goedkeuren:
    "Deze maand goedkeuren doet je consultant samen met jou. Laat weten dat je akkoord bent.",
  // ⚠️ Dit is de belangrijkste van de zes, want het is de enige handeling die
  // een LOS PRODUCT in gang zet dat de klant apart koopt. De toon is dus geen
  // afwijzing maar een uitnodiging: hij mag het zien, hij weet nu dat het
  // bestaat, en hij weet bij wie hij moet zijn. Zou de knop verborgen zijn, dan
  // wist hij niet dat dit product er is, en dan verkoop je het nooit.
  reputatie_starten:
    "Een reputatieanalyse zet je consultant voor je in gang. Laat weten dat je hem wilt, dan plannen we hem in.",
};
