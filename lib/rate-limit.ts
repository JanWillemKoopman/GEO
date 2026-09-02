import "server-only";

/**
 * Snelheidsbegrenzing (herstelplan na audit T8.11).
 *
 * De tabel `rate_limits` en de atomaire ophoogfunctie `rate_limit_hit()` staan
 * in migratie 0090. De regels (welk venster, wanneer is het te veel) staan
 * puur en testbaar in `lib/rate-limit-rules.ts`; dit bestand doet alleen de
 * database-aanroep.
 *
 * ⚠️ Faalt de controle zelf (netwerk, DB-storing), dan laat dit door en niet
 * op slot: zelfde afweging als `lib/spend-limit.ts` bij de vraag "wat als de
 * rem zelf stuk is". Een storing in de boekhouding mag inloggen niet
 * platleggen voor iedereen.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitWindowStart, rateLimitVerdict, type RateLimitVerdict } from "@/lib/rate-limit-rules";

export async function hitRateLimit(
  key: string,
  opts: { max: number; windowMs: number },
): Promise<RateLimitVerdict> {
  const admin = createAdminClient();
  const now = new Date();
  const windowStart = rateLimitWindowStart(now, opts.windowMs);

  try {
    const { data, error } = await admin.rpc("rate_limit_hit", {
      p_key: key,
      p_window_start: windowStart.toISOString(),
    });
    if (error) throw new Error(error.message);
    const count = typeof data === "number" ? data : Number(data);
    return rateLimitVerdict(count, opts.max, windowStart, opts.windowMs);
  } catch (err) {
    console.error(`Snelheidsbegrenzing (${key}) mislukt, verzoek gaat door zonder rem:`, err);
    return rateLimitVerdict(0, opts.max, windowStart, opts.windowMs);
  }
}
