/**
 * Mag deze analyse nu opnieuw gemeten worden?
 *
 * ── DE FOUT DIE DIT AFVANGT ─────────────────────────────────────────────────
 *
 * ⚠️ Gevonden op 12 augustus 2026. De maandelijkse meettaak keek alleen of er al
 * een volgende periode bestond, niet of de vorige meting een maand geleden was.
 * Het bewijs staat in de database:
 *
 *   Fysi-Unique   periode 0   30 juli
 *                 periode 1   30 juli   ← dezelfde dag
 *                 periode 2   31 juli   ← één dag later
 *
 * Drie "maandelijkse" metingen in twee dagen. Bij die analyse waren dat
 * handmatige testrondes, maar dezelfde weg staat open voor een echte klant, en
 * daar gebeurt het vanzelf: onboard je iemand op 28 augustus en meet je hem,
 * dan vuurt de maandtaak op 1 september. Vier dagen later.
 *
 * Twee gevolgen, en ze zijn allebei erg genoeg:
 *
 *   1. **Geld.** Een volle meetronde is ~$0,72 per onderwerp. Een klant met vier
 *      onderwerpen betaalt dan bijna $3 voor een maand die vier dagen duurde.
 *   2. **Een grafiek die liegt.** Het punt komt op de trendlijn te staan als een
 *      maandelijkse stap, terwijl er vier dagen tussen zit. De klant leest daar
 *      groei of verval in die er niet is.
 *
 * ── WAAROM 21 DAGEN EN NIET 28 ──────────────────────────────────────────────
 *
 * De taak draait op de eerste van de maand, en een maand is 28 tot 31 dagen.
 * Zou de grens op 28 liggen, dan valt een klant die op de 3e gemeten is (29
 * dagen eerder) er nét binnen en een klant die op de 5e gemeten is er nét
 * buiten, waarna hij een maand overslaat. Dat is een grens die per klant
 * anders uitpakt zonder dat er iets aan hem anders is.
 *
 * Met 21 dagen slaat de taak alleen over wat écht te vers is: alles wat in de
 * laatste drie weken gemeten is. Zo'n klant krijgt zijn eerste maandmeting
 * gewoon de maand daarna. Overslaan kost niets en is stil terug te draaien;
 * te vroeg meten kost geld en zet een punt in een grafiek dat er nooit meer
 * uitgaat.
 *
 * Puur, dus testbaar vanuit `scripts/test-unit.ts` (conventie 2).
 */

/** Hoeveel dagen er minstens tussen twee meetperiodes moeten zitten. */
export const MIN_DAGEN_TUSSEN_PERIODES = 21;

const DAG_MS = 24 * 60 * 60 * 1000;

export type CadenceVerdict =
  | { ok: true }
  | { ok: false; dagenGeleden: number; reason: string };

/**
 * `lastMeasuredAt` is `null` bij een analyse die nog nooit een periode afsloot.
 * Dan is er niets om te vroeg aan te zijn en mag het altijd.
 */
export function mayMeasureAgain(
  lastMeasuredAt: string | Date | null | undefined,
  now: Date = new Date(),
  minDagen: number = MIN_DAGEN_TUSSEN_PERIODES,
): CadenceVerdict {
  if (!lastMeasuredAt) return { ok: true };

  const vorige = lastMeasuredAt instanceof Date ? lastMeasuredAt : new Date(lastMeasuredAt);
  // Een onleesbare datum is geen reden om te blokkeren: dan weten we het niet,
  // en de bestaande gang van zaken (meten) is dan de minst verrassende uitkomst.
  // Wel loggen doet de aanroeper, zodat het niet stil blijft.
  if (Number.isNaN(vorige.getTime())) return { ok: true };

  const dagen = Math.floor((now.getTime() - vorige.getTime()) / DAG_MS);
  if (dagen >= minDagen) return { ok: true };

  return {
    ok: false,
    dagenGeleden: dagen,
    reason:
      `de vorige meting was ${dagen} ${dagen === 1 ? "dag" : "dagen"} geleden, ` +
      `en er moeten er minstens ${minDagen} tussen zitten`,
  };
}
