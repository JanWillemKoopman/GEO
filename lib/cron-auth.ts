import "server-only";

/**
 * Klopt de cron-sleutel in deze header?
 *
 * ── ÉÉN PLEK, EN DAT IS BELANGRIJKER DAN DE TIMING ──────────────────────────
 *
 * Deze vergelijking stond vier keer uitgeschreven, in elk van de vier
 * cron-routes (`worker`, `tracking`, `reminders`, `plan`). Dat is precies het
 * patroon dat volgens de kop van `lib/access.ts` uit elkaar gaat lopen: bij de
 * vijfde route vergeet iemand hem, of schrijft hem net anders op. Op 11 augustus
 * 2026 is dat met `getOwnedProfile` en `getOwnedAnalysis` echt gebeurd, en het
 * kostte een fout die de eerste klant zou hebben geraakt.
 *
 * ── DE CONSTANTE-TIJDVERGELIJKING ───────────────────────────────────────────
 *
 * `!==` op een string stopt bij het eerste teken dat verschilt, dus de tijd die
 * de vergelijking kost verraadt hoeveel tekens er klopten. Over internet is dat
 * vrijwel niet te meten, dus dit is de kleinere winst van de twee. Maar hij kost
 * drie regels (antihack.md L1).
 *
 * ⚠️ `serverEnv.cronSecret` GOOIT als CRON_SECRET ontbreekt (`lib/env.ts`). Dat
 * is opzet en het moet zo blijven: een ontbrekende sleutel wordt dan een 500 en
 * nooit een open deur. Vang die fout hier dus NIET af.
 */
import { timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";

export function cronAuthOk(authHeader: string | null): boolean {
  if (!authHeader) return false;

  const verwacht = Buffer.from(`Bearer ${serverEnv.cronSecret}`, "utf8");
  const gekregen = Buffer.from(authHeader, "utf8");

  // `timingSafeEqual` eist gelijke lengte. Die lengte lekt sowieso al uit de
  // header zelf, dus hier is een gewone vergelijking geen extra prijsgave.
  if (verwacht.length !== gekregen.length) return false;

  return timingSafeEqual(verwacht, gekregen);
}
