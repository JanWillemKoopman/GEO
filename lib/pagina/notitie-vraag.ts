/**
 * DE NOTITIE VAN DE SCHRIJVER WORDT EEN VRAAG
 * (V16 van `docs/tasks/pijplijnanalyse-contentketen.md`).
 *
 * De schrijver zet in `notitie_voor_ondernemer` wat hij nog had willen weten
 * ("hoe lang duurt een montage?"). Tot 29 september 2026 stond dat alleen als
 * kaartje op het goedkeuringsscherm, en ging het antwoord nergens heen. Nu wordt
 * het een open vraag bij de pagina: het antwoord gaat de kennislaag in en helpt
 * de andere pagina's van het cluster (V17), en met dat antwoord kan de klant om
 * een aanpassing vragen. Geen nieuwe AI-aanroep.
 *
 * Puur, zonder `server-only` (conventie 2).
 */

/** Langer dan dit is geen vraag maar een betoog; dan blijft het alleen een notitie. */
export const NOTITIE_VRAAG_MAX = 500;

/** De vraagtekst uit de notitie, of `null` als er geen bruikbare vraag in staat. */
export function vraagUitNotitie(notitie: string | null | undefined): string | null {
  const tekst = (notitie ?? "").replace(/\s+/g, " ").trim();
  if (!tekst || /^(null|geen|n\.?v\.?t\.?|-)$/i.test(tekst)) return null;
  if (tekst.length > NOTITIE_VRAAG_MAX) return null;
  return tekst;
}
