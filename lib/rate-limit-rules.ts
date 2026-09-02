/**
 * De rekenkant van de snelheidsbegrenzing (herstelplan na audit T8.11), puur
 * en zonder `server-only` (conventie 2): welk tijdvenster hoort bij dit
 * moment, en is een teller over de grens?
 */

/** Het begin van het vaste venster waar `now` in valt, afgerond naar beneden. */
export function rateLimitWindowStart(now: Date, windowMs: number): Date {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

export interface RateLimitVerdict {
  ok: boolean;
  /** Hoeveel pogingen er dit venster al waren, deze meegerekend. */
  count: number;
  max: number;
  /** Wanneer de teller weer op nul staat. */
  resetAt: Date;
}

export function rateLimitVerdict(
  count: number,
  max: number,
  windowStart: Date,
  windowMs: number,
): RateLimitVerdict {
  return {
    ok: count <= max,
    count,
    max,
    resetAt: new Date(windowStart.getTime() + windowMs),
  };
}
