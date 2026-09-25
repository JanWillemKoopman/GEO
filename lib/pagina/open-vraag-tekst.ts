/**
 * DE TEKST VAN DE OPEN VRAAG (besluit B3, `docs/tasks/contentketen-opnieuw.md` §6.2).
 *
 * Vast in code en nooit door een model gemaakt (§3 regel 8): dit is de vraag
 * die het meeste oplevert, en hij moet er bij elke pagina hetzelfde uitzien.
 * De voorbeelden staan hier en niet in de database: ze zijn een hulp bij het
 * invullen, geen concept-antwoord dat de klant alleen hoeft te bevestigen.
 *
 * Puur en zonder `server-only`: het scherm leest dezelfde tekst.
 */

/** Hoeveel tekens het antwoord mag hebben. */
export const OPEN_VRAAG_MAX = 3000;

/**
 * De vraag zelf. De titel van de pagina staat erin: in "Openstaande vragen"
 * staan de open vragen van een hele maand onder elkaar, en `fact_requests` heeft
 * een unieke index op (merk, vraagtekst) uit migratie 0019. Zonder titel zou de
 * tweede pagina van een maand geen open vraag kunnen krijgen.
 */
export function openVraagTekst(paginaTitel: string): string {
  return `Wat wil je zelf vertellen op de pagina "${paginaTitel.trim()}"?`;
}

/**
 * De uitleg eronder. Zonder het onderwerp erin: de titel van een plan-pagina is
 * een opdracht ("Breid de pagina over rijles in Best uit met..."), en die
 * midden in een zin gezet leverde op de eerste proef van 25 september 2026
 * "over breid de pagina over rijles in best uit met faalangstbegeleiding weet".
 * De titel staat al in de vraag erboven.
 */
export function openVraagUitleg(): string {
  return (
    "Vertel wat jij belangrijk vindt dat een potentiële klant hierover weet. Denk aan een typische " +
    "situatie van een klant, een aanpak waar jullie trots op zijn, vragen die je vaak krijgt, " +
    "voorbeelden uit de praktijk, dingen die klanten vaak verkeerd begrijpen, of wat jullie anders " +
    "doen dan anderen."
  );
}

/** Drie voorbeelden van hoe een antwoord eruit kan zien, zonder feiten over een echt bedrijf. */
export const OPEN_VRAAG_VOORBEELDEN = [
  "Veel klanten komen binnen met dezelfde twijfel: moet de oude vloer eruit? Meestal niet, en dat scheelt ze een dag werk.",
  "We beginnen altijd met een kort gesprek aan de keukentafel, want dan horen we wat iemand echt wil.",
  "Wat mensen vaak niet weten: in het voorjaar is het hier druk, dus wie in de winter belt, is eerder aan de beurt.",
];
