/**
 * Een klant volledig verwijderen: de regels, de tekst en de bevestiging.
 *
 * ── WAAROM DIT BESTAAT NAAST HET ARCHIEF ────────────────────────────────────
 *
 * Conventie 8 van deze codebase is "alles bewaren", en besluit 14 zegt dat
 * opzeggen een datum zet en niets verwijdert. Dat zijn goede regels en ze
 * blijven staan: archiveren is het normale pad, en negen van de tien keer is
 * "weg uit beeld" precies wat iemand bedoelt met "verwijder dit".
 *
 * Maar de AVG kent een recht op verwijdering, en dat recht kun je niet
 * afkopen met een archief. Zodra er echte bedrijfsgegevens van een klant in
 * staan (een merkdossier is dat: contactgegevens, prijzen, interne feiten),
 * moet er een knop zijn die het écht weghaalt. Dit is die knop, en hij is
 * bewust de uitzondering en niet de regel.
 *
 * ── DE DRIE DINGEN DIE DEZE MODULE AFDWINGT ─────────────────────────────────
 *
 * 1. Je moet de naam van het account overtypen. Niet "weet je het zeker", maar
 *    een handeling die je niet per ongeluk doet. Dit is K4 uit
 *    `docs/tasks/lanceerplan.md`: onomkeerbaar wordt vooraf benoemd, in een
 *    eigen blok, en Nova doet het net zo (`cannotBeUndoneDescription`).
 * 2. Je krijgt van tevoren te zien wát er verdwijnt, met aantallen. "Dit
 *    verwijdert 3 merken, 5 analyses en 412 metingen" is een ander besluit dan
 *    "dit verwijdert een account".
 * 3. Een beheerder van Aura kan zichzelf er niet uit verwijderen, en het laatste
 *    beheerdersaccount blijft bestaan. Anders sluit je jezelf buiten.
 *
 * Puur, dus testbaar vanuit `scripts/test-unit.ts` (conventie 2).
 */

/** Wat er verdwijnt, per soort. Alles wat groter dan nul is, komt op het scherm. */
export interface DeletionCounts {
  merken: number;
  analyses: number;
  metingen: number;
  paginas: number;
  gebruikers: number;
}

export interface DeletionPlan {
  accountName: string;
  counts: DeletionCounts;
  /** Regels voor op het scherm, alleen wat er echt is. */
  regels: string[];
  /** Blokkeert iets deze verwijdering? Null als hij mag. */
  blokkade: string | null;
}

function meervoud(n: number, enkel: string, meer: string): string {
  return `${n} ${n === 1 ? enkel : meer}`;
}

/**
 * De regels die de klant te zien krijgt vóór hij bevestigt.
 *
 * Alleen wat er is: een account zonder content krijgt geen regel "0 pagina's",
 * want een lijst met nullen leest als ruis en verbergt de aantallen die er wél
 * toe doen. Is er helemaal niets, dan zegt één regel dat.
 */
export function deletionLines(counts: DeletionCounts): string[] {
  const regels: string[] = [];
  if (counts.merken > 0) regels.push(meervoud(counts.merken, "merk", "merken"));
  if (counts.analyses > 0) regels.push(meervoud(counts.analyses, "analyse", "analyses"));
  if (counts.metingen > 0) regels.push(meervoud(counts.metingen, "meting", "metingen"));
  if (counts.paginas > 0) regels.push(meervoud(counts.paginas, "geschreven pagina", "geschreven pagina's"));
  if (counts.gebruikers > 0) {
    regels.push(meervoud(counts.gebruikers, "inlogaccount", "inlogaccounts"));
  }
  if (regels.length === 0) regels.push("Dit account is leeg, er is niets aan gekoppeld.");
  return regels;
}

/**
 * Klopt wat er is overgetypt?
 *
 * Spaties eromheen tellen niet mee, hoofdletters wél. Een naam overtypen is een
 * bewuste handeling, en hoofdletterongevoelig maken haalt daar precies genoeg
 * vanaf om hem per ongeluk te kunnen doen. Een lege naam kan nooit kloppen,
 * anders zou een account zonder naam met een lege invoer te verwijderen zijn.
 */
export function confirmationMatches(typed: string, accountName: string): boolean {
  const naam = accountName.trim();
  if (naam === "") return false;
  return typed.trim() === naam;
}

/**
 * De zin bovenaan het bevestigingsblok.
 *
 * Zegt drie dingen in deze volgorde: dat het niet terug kan, wát er weggaat, en
 * wat je moet doen. Die volgorde is niet vrij: begin je met de instructie, dan
 * leest iemand de waarschuwing niet meer.
 */
export function deletionWarning(accountName: string, counts: DeletionCounts): string {
  const wat = deletionLines(counts).join(", ");
  return (
    `Dit verwijdert ${accountName} definitief, inclusief ${wat}. Dit kan niet ongedaan gemaakt ` +
    `worden en er is geen prullenbak. Typ de naam van het account over om te bevestigen.`
  );
}

/** Waarom een verwijdering geweigerd kan worden, met de tekst erbij. */
export const DELETION_BLOCKED = {
  eigen_account:
    "Je kunt het account waar je zelf in zit niet verwijderen. Vraag een andere beheerder, " +
    "of haal jezelf er eerst uit.",
  naam_klopt_niet:
    "De naam die je hebt ingetypt komt niet overeen. Typ de naam van het account precies over.",
  niet_gevonden: "Niet gevonden.",
} as const;

/**
 * Mag deze verwijdering doorgaan?
 *
 * ⚠️ De eigen-account-regel is geen beleefdheid maar een slot. Een beheerder
 * die zijn eigen account weggooit, verwijdert daarmee zijn eigen inlog en kan
 * daarna niet meer bij de app. Dat is geen fout die je terugdraait met een
 * backup, want de sessie is dan al weg.
 */
export function deletionBlockade(args: {
  accountId: string;
  eigenAccountIds: string[];
}): string | null {
  if (args.eigenAccountIds.includes(args.accountId)) return DELETION_BLOCKED.eigen_account;
  return null;
}
