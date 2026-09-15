/**
 * Of de browser een oudere versie van de app draait dan wat er nu op de
 * server staat (docs/tasks/nova-vergelijking-verbeterpunten.md, punt 25).
 *
 * ORBIT ENGINE deployt bij elke merge naar main. Zonder deze check werkt een
 * openstaand tabblad gewoon door op een verouderde JS-bundel, en de eerste
 * keer dat dat opvalt is een knop die een fout geeft omdat de API onder zijn
 * voeten is veranderd.
 *
 * Puur en zonder `server-only` (conventie 2): geen netwerk hierin, dus
 * testbaar vanuit `scripts/test-unit.ts`. Het ophalen van de serverversie zelf
 * staat in `components/deployment-banner.tsx`.
 */
export function isNewerVersionAvailable(eigenVersie: string, serverVersie: string): boolean {
  // Een lege waarde betekent "onbekend", nooit "verschillend". Dat voorkomt
  // een valse melding zolang een van de twee kanten nog niet geladen is
  // (conventie 3: onbekend is een betere waarde dan een gok).
  if (!eigenVersie || !serverVersie) return false;
  return eigenVersie !== serverVersie;
}
