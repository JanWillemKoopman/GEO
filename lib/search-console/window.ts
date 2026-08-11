/**
 * Welke dagen haalt Aura op, en welke laat hij met rust?
 *
 * ── DE TWEE REGELS DIE ALLES BEPALEN ────────────────────────────────────────
 *
 * Uitgezocht in `docs/tasks/zoekdata-koppeling.md` §2:
 *
 * 1. **Definitieve cijfers lopen ongeveer twee dagen achter.** Google corrigeert
 *    de dagen daarvóór nog na. Wie gisteren als bewijs gebruikt, meet ruis.
 * 2. **De herziening gaat door.** Een dag die je vorige week ophaalde, kan deze
 *    week een ander getal hebben.
 *
 * Gevolg: elke ronde haalt een NAWERKVENSTER opnieuw op, niet alleen de nieuwe
 * dagen. De unieke sleutel in migratie 0052 zorgt dat dat een correctie wordt en
 * geen dubbele rij.
 *
 * Puur, dus testbaar (conventie 2). Dit bepaalt welke cijfers de klant als
 * bewijs te zien krijgt, en dat hoort onder test.
 */

/** Google's vertraging tot definitieve cijfers. */
export const VERTRAGING_DAGEN = 2;

/**
 * Hoeveel dagen terug elke ronde opnieuw opgehaald wordt.
 *
 * Tien: dat dekt Google's naijlende correcties ruim, en het kost niets extra
 * omdat één aanroep tot 25.000 rijen teruggeeft. Zou dit één dag zijn, dan
 * bevriest een half gecorrigeerde dag voor altijd in de database.
 */
export const NAWERK_DAGEN = 10;

/** Hoe ver terug een eerste synchronisatie gaat. Google bewaart 16 maanden. */
export const EERSTE_RONDE_DAGEN = 90;

export interface SyncWindow {
  /** ISO-datum, inclusief. */
  start: string;
  /** ISO-datum, inclusief. */
  eind: string;
  /** Aantal dagen in het venster. */
  dagen: number;
}

/**
 * Het venster voor de volgende ronde.
 *
 * `laatsteDag` is de laatste dag die al in de database staat, of `null` bij een
 * eerste ronde.
 */
export function syncWindow(laatsteDag: string | null, now: Date = new Date()): SyncWindow {
  const eindDatum = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  eindDatum.setUTCDate(eindDatum.getUTCDate() - VERTRAGING_DAGEN);
  const eind = iso(eindDatum);

  const startDatum = new Date(eindDatum);
  if (!laatsteDag) {
    startDatum.setUTCDate(startDatum.getUTCDate() - (EERSTE_RONDE_DAGEN - 1));
  } else {
    // Terug tot het nawerkvenster vóór de laatste dag die we hebben.
    const laatste = new Date(`${laatsteDag}T00:00:00Z`);
    laatste.setUTCDate(laatste.getUTCDate() - NAWERK_DAGEN);
    if (laatste.getTime() < startDatum.getTime()) {
      startDatum.setTime(laatste.getTime());
    }
  }

  const start = iso(startDatum);
  const dagen =
    Math.round(
      (new Date(`${eind}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) /
        86400000,
    ) + 1;

  return { start, eind, dagen: Math.max(0, dagen) };
}

/** Is er iets op te halen? Bij een venster dat achterstevoren loopt: nee. */
export function heeftWerk(venster: SyncWindow): boolean {
  return venster.dagen > 0 && venster.start <= venster.eind;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
