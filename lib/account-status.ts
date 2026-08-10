/**
 * De stand van een abonnement, puur uitgerekend.
 *
 * Bewust ZONDER `server-only`, net als `analysis-status.ts` en
 * `profile-status.ts`: alles wat de uitkomst bepaalt hoort in een importeerbaar
 * bestand, anders is het niet te testen vanuit `scripts/test-unit.ts`
 * (conventie 2). `lib/accounts.ts` doet de databasekant en leest dit.
 */
import type { Account } from "@/lib/types/database";

/**
 * Loopt het abonnement nog?
 *
 * Besluit 14 (`docs/Nova.md` §0): opzeggen verwijdert niets en sluit niets af op
 * de dag zelf. Tot `cancelled_at` verandert er niets aan wat de klant ziet;
 * daarna valt hij terug op een leesweergave met zijn cijfers erin. Dat is een
 * uitbreiding van het patroon dat `lib/archive.ts` al voor merken hanteert, en
 * het volgt conventie 8: alles bewaren.
 *
 * De grens zelf ligt vast: precies op het moment van `cancelled_at` is het
 * abonnement verlopen. Eén kant kiezen en die opschrijven, anders verschilt het
 * per aanroepplek.
 */
export function isActiveAccount(
  account: Pick<Account, "cancelled_at">,
  now: Date = new Date(),
): boolean {
  if (!account.cancelled_at) return true;
  return new Date(account.cancelled_at).getTime() > now.getTime();
}

/**
 * De hoeveelste maand loopt dit abonnement?
 *
 * Besluit 7: doorlopend opzegbaar, dus géén "contractmaand 4 van 12" zoals bij
 * Nova. De klant zit nergens aan vast, en een teller die zegt hoeveel hij nog
 * "tegoed" heeft zou dat suggereren. Wat er staat is "maand 4 sinds de start",
 * en de nadruk verschuift daarmee van wat hij nog krijgt naar wat het opleverde.
 *
 * Telt vanaf 1: de eerste maand is maand 1, niet maand 0. `null` als er nooit
 * een startdatum is gezet, want een gok is hier slechter dan niets tonen
 * (conventie 3).
 */
export function monthsSinceStart(
  account: Pick<Account, "started_at">,
  now: Date = new Date(),
): number | null {
  if (!account.started_at) return null;
  const start = new Date(account.started_at);
  if (Number.isNaN(start.getTime())) return null;
  if (start.getTime() > now.getTime()) return null;
  const maanden =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth()) +
    (now.getDate() >= start.getDate() ? 0 : -1);
  return Math.max(1, maanden + 1);
}
