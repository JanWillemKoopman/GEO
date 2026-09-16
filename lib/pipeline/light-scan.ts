import "server-only";

/**
 * Het vooronderzoek: een lichte titel+meta-doorgang over tot 1000 pagina's,
 * vóórdat de eerste diepe crawl (`profile_discover`) kiest welke 150 pagina's
 * hij echt volledig leest (migratie 0102).
 *
 * ── WAAROM DIT ZICHZELF OPNIEUW INPLANT ──────────────────────────────────────
 *
 * Eén taakaanroep mag van het platform hooguit 300 seconden duren
 * (`app/api/cron/worker/route.ts`). 1000 pagina's op "normaal" tempo (3
 * tegelijk, ~1,1s pauze) is ruim over die grens. De taaksoort
 * `profile_light_scan` (`lib/jobs/handlers.ts`) draait daarom in rondes: één
 * aanroep doet zoveel als binnen `TICK_BUDGET_MS` past, en plant zichzelf met
 * een hogere ronde opnieuw in als er nog kandidaten open staan. De klant zit
 * er op dit moment nog niet bij (het merk is net aangemaakt, vóór overdracht),
 * dus een paar rondes verspreid over enkele minuten is geen wachttijd die
 * iemand voelt.
 *
 * ── WAAROM DE VOORTGANG IN DE DATABASE STAAT EN NIET IN DE TAAK ZELF ────────
 *
 * Een taakrij die zichzelf herplant kan de kandidatenlijst niet in zijn eigen
 * `payload_json` meedragen: bij 1000 URL's is dat een grote rij, en een
 * afgebroken taakaanroep (de platformlimiet, een herstart) zou dat werk
 * kwijtraken. In plaats daarvan bewaart elke ronde zijn resultaat in
 * `profile_page_signals` (migratie 0102) en berekent de volgende ronde simpelweg
 * opnieuw welke kandidaten daar nog niet in staan. Sluit aan bij conventie 9:
 * elke stap controleert eerst of zijn resultaat al bestaat.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { collectPageUrls, crawlHeads, MAX_PREONBOARDING_LIGHT_PAGES } from "@/lib/crawler";
import { selectUrls, type UrlSignal } from "@/lib/pipeline/url-priority";
import { openCandidates } from "@/lib/pipeline/light-scan-select";
import type { Profile } from "@/lib/types/database";

export { openCandidates } from "@/lib/pipeline/light-scan-select";

/**
 * Tijdbudget per ronde. Ruim onder de reservering voor een zware taak
 * (`HEAVY_JOB_RESERVE_MS`, 200s, `lib/jobs/worker.ts`) en de platformlimiet van
 * 300s, met marge voor het ophalen van het profiel, de sitemap en het
 * wegschrijven van de resultaten.
 */
const TICK_BUDGET_MS = 150_000;

/**
 * Na hoeveel rondes het vooronderzoek er sowieso mee stopt, ook als er nog
 * kandidaten open staan (`lib/jobs/handlers.ts`). 5 rondes van hooguit
 * `TICK_BUDGET_MS` is een worst-case van ruim 12 minuten, wat de "mag ~10
 * minuten duren"-afspraak met de eigenaar met wat marge dekt zonder dat een
 * hardnekkig trage of blokkerende site het vooronderzoek voorgoed laat duren.
 * Bereikt de taak deze grens, dan gaat hij gewoon door naar `profile_discover`
 * met wat er tot dan toe gevonden is: onvolledige signalen zijn beter dan
 * wachten op perfecte (conventie 3).
 */
export const MAX_LIGHT_SCAN_ROUNDS = 5;

/** Hoeveel signalen er per keer worden weggeschreven. Zelfde soort reden als `INSERT_CHUNK` in discover.ts: één rotte rij mag niet de hele ronde kosten. */
const UPSERT_CHUNK = 100;

export interface LightScanTickResult {
  /** Hoeveel kandidaten er in totaal zijn (het plafond, of de hele site als die kleiner is). */
  totalCandidates: number;
  /** Hoeveel kandidaten nu een signaal hebben, deze ronde meegeteld. */
  scanned: number;
  /** Is elke kandidaat nu gescand? Dan is het vooronderzoek klaar. */
  done: boolean;
}

/**
 * Eén ronde van het vooronderzoek: bepaalt de kandidaten, kijkt wat er al
 * gescand is, scant het restant tot het tijdbudget van deze ronde op is, en
 * schrijft de nieuwe signalen weg.
 */
export async function runLightScanTick(profileId: string): Promise<LightScanTickResult> {
  const admin = createAdminClient();

  const { data: row } = await admin.from("profiles").select("*").eq("id", profileId).single();
  if (!row) throw new Error(`Profiel ${profileId} niet gevonden.`);
  const profile = row as Profile;

  const { urls: alleUrls } = await collectPageUrls(profile.url, profile.sitemap_url);
  const kandidaten = selectUrls(
    alleUrls,
    Math.min(MAX_PREONBOARDING_LIGHT_PAGES, alleUrls.length),
    profile.crawl_priority_paths ?? [],
  ).urls;

  const { data: bekend } = await admin
    .from("profile_page_signals")
    .select("url")
    .eq("profile_id", profileId);
  const gezien = new Set((bekend ?? []).map((r) => r.url as string));

  const openstaand = openCandidates(kandidaten, gezien);
  if (openstaand.length === 0) {
    return { totalCandidates: kandidaten.length, scanned: gezien.size, done: true };
  }

  const signalen = await crawlHeads(openstaand, {
    speed: profile.crawl_speed,
    asBrowser: profile.crawl_as_browser,
    budgetMs: TICK_BUDGET_MS,
  });

  await upsertSignals(admin, profileId, signalen);

  const nuGezien = gezien.size + signalen.size;
  return {
    totalCandidates: kandidaten.length,
    scanned: nuGezien,
    done: nuGezien >= kandidaten.length,
  };
}

async function upsertSignals(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
  signalen: ReadonlyMap<string, UrlSignal>,
): Promise<void> {
  const rijen = [...signalen.entries()].map(([url, s]) => ({
    profile_id: profileId,
    url,
    title: s.title ?? null,
    description: s.description ?? null,
  }));

  for (let i = 0; i < rijen.length; i += UPSERT_CHUNK) {
    const blok = rijen.slice(i, i + UPSERT_CHUNK);
    const { error } = await admin
      .from("profile_page_signals")
      .upsert(blok, { onConflict: "profile_id,url" });
    if (error) {
      // Eén rot blok mag de rest van de ronde niet kosten: de volgende ronde
      // ziet deze URL's gewoon weer als openstaand en probeert opnieuw.
      console.error(
        `Vooronderzoek profiel ${profileId}: blok ${i / UPSERT_CHUNK + 1} (${blok.length} signalen) ` +
          `niet opgeslagen: ${error.message}`,
      );
    }
  }
}

/**
 * De signalen zoals ze nu bekend zijn, voor de eerste diepe crawl
 * (`discoverSite()` in `lib/pipeline/discover.ts`). Leeg als het vooronderzoek
 * nooit gedraaid heeft (profielen van vóór migratie 0102) of nog niets
 * opleverde: `selectUrls()` valt dan terug op het bestaande pad-alleen-gedrag.
 */
export async function loadPageSignals(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
): Promise<Map<string, UrlSignal>> {
  const { data } = await admin
    .from("profile_page_signals")
    .select("url, title, description")
    .eq("profile_id", profileId);

  return new Map(
    (data ?? []).map((r) => [
      r.url as string,
      { title: r.title as string | null, description: r.description as string | null },
    ]),
  );
}
