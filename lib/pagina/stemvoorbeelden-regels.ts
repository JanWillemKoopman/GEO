/**
 * De pure regels onder de stemvoorbeelden (besluit B14, §6.10), testbaar
 * zonder netwerk (conventie 2).
 */

/** Hoeveel adressen de ondernemer mag opgeven. */
export const MAX_STEMVOORBEELDEN = 3;

/** Hoeveel tekst per adres naar de schrijver gaat. */
export const STEMTEKST_MAX = 2000;

/**
 * Adressen die de klant intypte: getrimd, `https://` erbij als het schema
 * ontbreekt, dubbele en ongeldige eruit, hooguit drie.
 */
export function schoneAdressen(invoer: unknown): string[] {
  const lijst = Array.isArray(invoer) ? invoer : [];
  const uit: string[] = [];
  for (const item of lijst) {
    const ruw = typeof item === "string" ? item : typeof item === "object" && item && "url" in item ? String((item as { url: unknown }).url) : "";
    const t = ruw.trim();
    if (!t) continue;
    const metSchema = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    try {
      const u = new URL(metSchema);
      if (!u.hostname.includes(".")) continue;
      const schoon = u.toString();
      if (!uit.includes(schoon)) uit.push(schoon);
    } catch {
      continue;
    }
    if (uit.length >= MAX_STEMVOORBEELDEN) break;
  }
  return uit;
}

/**
 * Vanaf de eerste echte alinea: menu's en kopjes bovenaan een pagina zijn geen
 * stem. De eerste regel van minstens 80 tekens met een punt erin is het begin.
 */
export function vanafEersteAlinea(tekst: string): string {
  const regels = tekst.split(/\n+/);
  const start = regels.findIndex((r) => r.trim().length >= 80 && /[.!?]/.test(r));
  return (start >= 0 ? regels.slice(start) : regels).join("\n").trim();
}
