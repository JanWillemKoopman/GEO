/**
 * "Bestaat dit al?" mag nooit stilzwijgend "nee" worden.
 *
 * ── DE FOUT DIE DIT AFVANGT ─────────────────────────────────────────────────
 *
 * ⚠️ Gevonden op 12 augustus 2026 tijdens de stille-fout-ronde (F5). Conventie 9
 * zegt dat elke pijplijnstap controleert of zijn resultaat al bestaat vóór een
 * dure aanroep. Die controle zag er overal zo uit:
 *
 *     const { count } = await admin.from("profile_offerings")
 *       .select("id", { count: "exact", head: true }).eq("profile_id", id);
 *     if ((count ?? 0) > 0) return;   // al gedaan, niets doen
 *
 * Gaat die telling stuk, dan is `count` niet een getal maar `null`. En `null ?? 0`
 * is 0, dus "nee, er staat nog niets", dus de dure aanroep gaat alsnog. De
 * bescherming tegen dubbel betalen faalt precies op het moment dat de database
 * hapert, en dat is nou juist het moment waarop een taak opnieuw geprobeerd
 * wordt. Het commentaar bij `offering.ts` zei letterlijk "een retry na een
 * mislukte vervolgtaak mag geen tweede keer betaald worden", terwijl de code dat
 * niet waarmaakte.
 *
 * Er is niets stils aan de gevolgen: een tweede aanbodboom is ~$0,05, een tweede
 * promptronde ~$0,003, en bij een storing die even aanhoudt gebeurt dat bij elke
 * herkansing opnieuw.
 *
 * ── DE REGEL ────────────────────────────────────────────────────────────────
 *
 * Conventie 3 zegt: onbekend is een betere waarde dan een verkeerde. Dat geldt
 * ook voor besluiten, niet alleen voor getallen. Weten we niet of het werk al
 * gedaan is, dan is "nee" een gok en geen antwoord. Dan hoort de taak te falen,
 * zodat de wachtrij hem later opnieuw probeert wanneer de database wél antwoordt.
 *
 * Puur, dus testbaar vanuit `scripts/test-unit.ts` (conventie 2).
 */

/** Wat een telling van Supabase teruggeeft, alleen wat we nodig hebben. */
export interface CountResult {
  count: number | null;
  error: { message: string } | null;
}

/**
 * Het aantal, of een fout. Nooit een gok.
 *
 * `wat` beschrijft in gewone taal waar de telling over ging, want deze melding
 * komt in de taakgeschiedenis terecht en wordt door een mens gelezen die niet
 * weet welke query er faalde.
 */
export function requireCount(res: CountResult, wat: string): number {
  if (res.error) {
    throw new Error(
      `Kon niet vaststellen of ${wat} al bestaat: ${res.error.message}. ` +
        `De taak stopt hier in plaats van het werk nog een keer te doen, want dat zou dubbel betaald worden.`,
    );
  }
  // Geen fout maar toch geen getal: dat hoort niet te kunnen, en als het toch
  // gebeurt is het weer dezelfde gok. Ook dat is een fout en geen nul.
  if (res.count === null || res.count === undefined) {
    throw new Error(
      `De telling van ${wat} gaf geen getal terug. De taak stopt hier in plaats van te gokken dat er niets is.`,
    );
  }
  return res.count;
}
