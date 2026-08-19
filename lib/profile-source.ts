/**
 * Welke herkomst mag deze gebruiker wegschrijven? (onboarding 3.0, deel C)
 *
 * ── WAAROM DIT IN DE ROUTE HOORT EN NIET IN HET SCHERM ──────────────────────
 *
 * Er zijn drie oppervlakken die hetzelfde veld opslaan via dezelfde route: de
 * klantwizard, de pre-boarding, en de onboardingsessie. Ze verschillen alleen in
 * de herkomst die ze meesturen. Zou het scherm dat bepalen, dan kan iedereen die
 * de route rechtstreeks aanroept zijn eigen invoer als `gesprek` wegschrijven,
 * en daarmee onaantastbaar maken voor élke volgende onderzoeksronde
 * (`filterProtectedFields()` laat alleen `ai` overschrijven).
 *
 * Dat is geen theoretisch lek: het is precies het scenario waarvoor de herkomst
 * bestaat, omgekeerd toegepast. Vandaar één functie, puur en getest
 * (conventie 2), en de route die hem als enige poort gebruikt.
 *
 * ── DE REGEL ────────────────────────────────────────────────────────────────
 *
 * `gesprek` en `consultant` zijn stafwaarden. `klant` mag iedereen met
 * schrijfrecht op het merk, en dat is meteen de veilige terugval: wie geen staf
 * is schrijft altijd `klant`, wat hij ook meestuurt.
 */
import type { FieldSource } from "@/lib/types/database";

/** De drie herkomsten die een mens via de API kan wegschrijven. `ai` niet. */
export type WriteSource = Exclude<FieldSource, "ai">;

const WRITE_SOURCES: readonly WriteSource[] = ["klant", "gesprek", "consultant"];

/** Alleen staf mag hiermee schrijven. Zie de toelichting hierboven. */
const STAFF_ONLY: readonly WriteSource[] = ["gesprek", "consultant"];

export function isWriteSource(value: unknown): value is WriteSource {
  return typeof value === "string" && (WRITE_SOURCES as readonly string[]).includes(value);
}

export type SourceDecision =
  | { ok: true; source: WriteSource }
  | { ok: false; status: 400 | 403; error: string };

/**
 * Bepaalt de herkomst van deze opslag.
 *
 * Zonder `bron` in de body blijft het gedrag van vóór onboarding 3.0 staan:
 * bewerkt de eigenaar zelf, dan is het `klant`; doet de consultant het voor hem,
 * dan is het `gesprek`. Wat er wél bij komt is dat die tweede lezing voortaan
 * staf vereist. Een accountgenoot met schrijfrecht schreef tot nu `gesprek` weg
 * zonder ooit aan tafel gezeten te hebben.
 */
export function resolveWriteSource(input: {
  /** `bron` uit de body. Ontbreekt hij, dan geldt de terugval hierboven. */
  requested: unknown;
  isStaff: boolean;
  /** Is deze gebruiker de eigenaar van het merk (`profiles.user_id`)? */
  isOwner: boolean;
}): SourceDecision {
  const { requested, isStaff, isOwner } = input;

  if (requested === undefined || requested === null) {
    if (!isStaff) return { ok: true, source: "klant" };
    return { ok: true, source: isOwner ? "klant" : "gesprek" };
  }

  if (!isWriteSource(requested)) {
    return {
      ok: false,
      status: 400,
      error: "Ongeldige aanvraag.",
    };
  }

  if ((STAFF_ONLY as readonly string[]).includes(requested) && !isStaff) {
    return {
      ok: false,
      status: 403,
      error: "Je mag deze wijziging niet als gespreksuitkomst vastleggen.",
    };
  }

  return { ok: true, source: requested };
}
