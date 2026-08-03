/**
 * Een mens wint van een model (docs/tasks/onboarding-2.0.md, blok C).
 *
 * ── WAAROM DIT EEN EIGEN MODULE IS ──────────────────────────────────────────
 *
 * Tot deze ronde gold "klant leidend, AI vult aan", en dat werkte omdat de klant
 * een wizard van elf velden invulde: wat er stond, had een mens getypt, en
 * `prepare-profile.ts` kon met een simpele `filled()`-controle beslissen wie
 * won.
 *
 * Nu vult de klant drie velden in en doet de pijplijn de rest. Daarmee verdwijnt
 * dat onderscheid uit de waarde zelf — "Tilburg" ziet er hetzelfde uit of het nu
 * getypt of geraden is. De herkomst staat daarom apart, in
 * `profile_field_sources` (migratie 0039).
 *
 * En dan is de regel afdwingbaar in plaats van hoopvol: een veld met bron
 * `klant` of `gesprek` mag door een volgende onderzoeksronde NOOIT overschreven
 * worden. Dat is conventie 1 — een promptinstructie is een intentie, code is een
 * garantie.
 *
 * ── WAAROM DIT ERTOE DOET ───────────────────────────────────────────────────
 *
 * Zonder deze module is "onderzoek opnieuw" een knop die je niet durft te
 * gebruiken. De klant meldt in het gesprek dat de site vernieuwd is, je draait
 * opnieuw, en alle correcties van dat gesprek zijn weg. Met deze module is
 * herhalen veilig, en dus bruikbaar.
 *
 * Puur, dus testbaar (conventie 2).
 */
import type { FieldSource } from "@/lib/types/database";

/** Wat er over één veld bekend is. */
export interface FieldOwnership {
  field: string;
  source: FieldSource;
}

/**
 * Welke bronnen onaantastbaar zijn voor een AI-ronde.
 *
 * `klant` = de klant zette het zelf in de app. `gesprek` = de consultant legde
 * het vast tijdens de demo. Allebei een mens, allebei beter geïnformeerd dan
 * een model dat naar een website keek.
 */
const HUMAN_SOURCES: ReadonlySet<FieldSource> = new Set<FieldSource>([
  "klant",
  "gesprek",
]);

export function isHumanSet(source: FieldSource | undefined | null): boolean {
  return source !== null && source !== undefined && HUMAN_SOURCES.has(source);
}

/**
 * Filtert een voorgenomen update tot wat er daadwerkelijk geschreven mag worden.
 *
 * Geeft naast de toegestane velden ook terug wát er tegengehouden is. Dat is
 * geen debuginformatie maar een uitkomst: "we hebben je correcties laten staan"
 * is precies wat een klant wil horen na een herhaalronde, en zonder die lijst
 * kun je dat niet zeggen.
 */
export function filterProtectedFields<T extends Record<string, unknown>>(
  patch: T,
  ownership: FieldOwnership[],
): { allowed: Partial<T>; blocked: string[] } {
  const humanFields = new Set(
    ownership.filter((o) => isHumanSet(o.source)).map((o) => o.field),
  );

  const allowed: Partial<T> = {};
  const blocked: string[] = [];

  for (const [key, value] of Object.entries(patch)) {
    if (humanFields.has(key)) {
      blocked.push(key);
      continue;
    }
    (allowed as Record<string, unknown>)[key] = value;
  }

  return { allowed, blocked };
}

/**
 * Zekerheid als drie niveaus in plaats van een kommagetal (§8, punt 2).
 *
 * "0.62" zegt niemand iets. Drie standen die je met een kleur kunt tonen wél —
 * en `null` is er één van, want "niet vastgesteld" is een echt antwoord en geen
 * nul (conventie 3).
 *
 * De drempel op 0,7: daaronder is het een aanwijzing die een mens moet
 * bevestigen, daarboven mag het zonder vraagteken op het scherm. Bewust ruim,
 * want een profiel waarin de helft van de velden oranje is, leest als kapot.
 */
export type ConfidenceLevel = "zeker" | "onzeker" | "onbekend";

export const CONFIDENCE_THRESHOLD = 0.7;

export function confidenceLevel(
  confidence: number | null | undefined,
): ConfidenceLevel {
  if (confidence === null || confidence === undefined) return "onbekend";
  return confidence >= CONFIDENCE_THRESHOLD ? "zeker" : "onzeker";
}

/**
 * Wat de klant hierover leest na een herhaalronde.
 *
 * Stil overschrijven én stil overslaan zijn allebei fout: het eerste kost hem
 * zijn correcties, het tweede laat hem denken dat de nieuwe ronde niets deed.
 */
export function describeMerge(
  blocked: string[],
  fieldLabels: Record<string, string> = {},
): string {
  if (blocked.length === 0) return "Het profiel is bijgewerkt.";
  const namen = blocked.map((f) => fieldLabels[f] ?? f);
  return (
    `Het profiel is bijgewerkt. Wat jij zelf hebt ingevuld is blijven staan: ` +
    `${namen.join(", ")}.`
  );
}
