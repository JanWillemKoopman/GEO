/**
 * Wat een klant leest zolang zijn eerste cluster er nog niet is.
 *
 * ── HET PROBLEEM DAT DIT OPLOST ─────────────────────────────────────────────
 *
 * Een net overgedragen klant logde in, kwam op zijn merk en zag: een leeg
 * contentplan, een leeg analyticsscherm, en één knop, "Start je eerste
 * cluster". Om daar iets mee te kunnen moet hij weten wat een cluster is, welk
 * onderwerp commercieel telt, en dat er dertig vragen uit komen die hij daarna
 * moet beoordelen. Dat is precies de kennis waarvoor hij het uur consultancy
 * heeft gekocht.
 *
 * Erger nog: die knop wérkte. `POST /api/analyses` had als enige van de dure
 * routes geen kostenrem (nagerekend 16 september 2026), terwijl
 * `lib/cost-rules.ts` in zijn eigen toelichting schrijft dat precies die route
 * op 2 september 2026 dicht is gezet. Een klant kon er dus betaald onderzoek mee
 * starten, tegen een besluit in dat al genomen was.
 *
 * ── WIE MAG WAT, EN WAAR DAT STAAT ──────────────────────────────────────────
 *
 * ⚠️ **Niet hier.** De vraag "wie mag een betaalde handeling starten" heeft al
 * een eigenaar: `lib/cost-rules.ts`, met `analyse_starten` in
 * `STAFF_ONLY_ACTIONS` en de melding in `COST_DENIED`. Dit bestand voegt daar
 * bewust geen tweede, mildere regel naast toe. Twee functies die hetzelfde
 * zouden moeten doen drijven uit elkaar (conventie P2), en een eigen regel zou
 * een besluit van de eigenaar stilletjes hebben opgerekt.
 *
 * Wat hier wél staat is de andere helft van hetzelfde probleem: een blokkade
 * zonder uitweg is geen oplossing. Als de klant niet aan zet is, hoort zijn
 * scherm te zeggen wie dat dan wel is en wat er daarna komt.
 *
 * Puur en zonder `server-only` (conventie 2).
 */

/**
 * Wat er op het lege clusterscherm van een klant staat.
 *
 * Bewust niet "er is nog niets": dat zegt wat er ontbreekt en niet wat er
 * gebeurt. Deze tekst zegt wie er aan zet is en wat er daarna komt, zoals elke
 * wachtstand in de app hoort te doen.
 */
export const KLANT_ZONDER_CLUSTERS = {
  titel: "Je consultant zet je eerste onderwerpen klaar",
  uitleg:
    "ORBIT ENGINE heeft je website en je markt al uitgekamd. Welke onderwerpen commercieel het " +
    "zwaarst wegen, bepaal je samen met je consultant; daarna meet ORBIT ENGINE per onderwerp of " +
    "AI-assistenten je noemen. Je hoeft hier zelf niets te starten.",
} as const;

/**
 * Wat de consultant ziet op het toewijzingsscherm als hij een merk zonder
 * clusters wil overdragen.
 *
 * Dit is de plek waar het misgaat, en dus de plek waar het gezegd moet worden:
 * een merk zonder cluster overdragen levert gegarandeerd een klant op die op een
 * leeg overzicht kijkt en niets kan doen, want starten is beheerderswerk.
 */
export function overdrachtZonderCluster(bestaandeClusters: number): string | null {
  if (bestaandeClusters > 0) return null;
  return (
    "Dit merk heeft nog geen enkel cluster. Draag je het nu over, dan logt de klant in op een " +
    "leeg overzicht en een leeg contentplan, en starten kan hij zelf niet. Zet eerst één " +
    "onderwerp klaar en laat het meten."
  );
}
