import { headers } from "next/headers";

/**
 * Is de bezoeker op een telefoon? Bepaald in `middleware.ts`, gelezen hier.
 *
 * ── WAAROM DIT NIET IN DE BROWSER GEBEURT ────────────────────────────────────
 *
 * Deze app is RSC-first: een servercomponent haalt zijn data op en rendert
 * meteen de goede structuur, zonder een sprong nadat de client zijn scherm
 * heeft gemeten. Een `useIsMobile()`-hook levert eerst de verkeerde versie en
 * dan een herschildering, en voor de zware verschillen (de tabel met twee
 * kolommen tegen zeven, de stappenflow tegen een lang formulier) is dat een
 * zichtbare sprong.
 *
 * ── WAAROM DIT GEEN EXTRA NETWERKRONDE KOST ─────────────────────────────────
 *
 * De middleware draait al op elke pagina voor de sessie
 * (`lib/supabase/middleware.ts`), en de useragent staat al in dat verzoek.
 * `x-apparaat` rijdt mee op dezelfde ronde.
 *
 * ── DE GOK KAN FOUT ZIJN, EN DAT MAG ─────────────────────────────────────────
 *
 * Een tablet met een desktop-useragent krijgt de desktopstructuur, en bij
 * 768px breed is dat een krappe pas. De CSS-breekpunten in `app/globals.css`
 * gelden ALTIJD, ook als deze functie zich vergist: de server kiest alleen
 * welke van de twee structuren er komt, de CSS zorgt dat allebei op elke
 * breedte leesbaar blijven. Een verkeerde gok is dus lelijk en nooit kapot.
 * Zie `redesign2026.md` §8.12.6.
 */
export async function isTelefoon() {
  return (await headers()).get("x-apparaat") === "telefoon";
}
