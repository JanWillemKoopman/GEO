/**
 * Presentatie van taakvoortgang. Bewust ZONDER `server-only`: dit is pure
 * opmaak zonder databasetoegang, bruikbaar aan beide kanten en testbaar in een
 * kaal script.
 */

/**
 * Zet seconden om naar een bereik in gewone taal (optimalisatie.md 1.9).
 *
 * Een bereik en niet één getal, omdat één getal een precisie suggereert die we
 * niet hebben, en omdat "nog ongeveer 2 minuten" dat er vijf worden erger is
 * dan meteen "2 tot 4 minuten" zeggen.
 */
export function formatEta(seconds: number | null): string | null {
  if (seconds == null) return null;
  if (seconds < 90) return "nog minder dan een minuut";
  const minutes = Math.round(seconds / 60);
  const upper = Math.max(minutes + 1, Math.ceil(minutes * 1.5));
  return `nog ongeveer ${minutes} tot ${upper} minuten`;
}
