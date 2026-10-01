/**
 * Voorbeeldaccounts: merken met ingeladen data die nooit geld mogen kosten.
 *
 * ── WAAROM DIT BESTAAT ──────────────────────────────────────────────────────
 *
 * Het demo-account RunX (`docs/tasks/demo-account-runx.md`) toont een klant van
 * twaalf maanden: acht clusters, 13 meetperiodes, 150 pagina's, waarvan 30
 * ingepland. Die data is ingeladen, niet gemeten. Zonder slot gaat het daarna
 * vanzelf mis, op twee plekken die geen gebruiker starten:
 *
 *   1. De maandcron meet op de 1e elke analyse die 21 dagen niet gemeten is:
 *      acht clusters × ~$0,82 = ~$6,50 per maand, en een trendlijn met een echt
 *      punt naast verzonnen punten.
 *   2. De ochtendronde laat elke dag de ingeplande pagina's van de komende tien
 *      dagen schrijven: ~3 pagina's per week.
 *
 * Het dagbudget op nul (`accounts.daily_budget_eur`) remt alleen wat een
 * gebruiker start, niet de crons. Daarom één vlag (`profiles.is_demo`, migratie
 * 0138) en één functie die elke inplanner vraagt.
 *
 * ── WIE HEM VRAAGT ──────────────────────────────────────────────────────────
 *
 * `/api/cron/tracking`, `/api/cron/plan` (de ochtendronde krijgt de
 * voorbeeldmerken mee, en de Search Console-ophaling slaat ze over), `checkBudgetForProfile()` in
 * `lib/spend-limit.ts` (dekt alle routes die betaald werk starten) en de werker
 * (vangnet voor een pad dat hierboven vergeten is). Een broncodecontrole in
 * `scripts/test-unit.ts` houdt dat zo.
 *
 * Bewust ZONDER `server-only`: de pure delen worden in de unittests gelezen, en
 * de databasevraag krijgt de client als argument mee.
 */

/** Wat een gebruiker leest als hij in een voorbeeldaccount op een betaalde knop drukt. */
export const DEMO_GEWEIGERD =
  "Dit is een voorbeeldaccount. Hier wordt niets gemeten, geschreven of opgehaald.";

/** Minimaal wat we van een Supabase-client nodig hebben, zodat dit los te testen is. */
type DemoQueryClient = {
  from(table: "profiles"): {
    select(columns: "id"): {
      eq(column: "is_demo", value: true): PromiseLike<{ data: { id: string }[] | null; error: unknown }>;
    };
  };
};

/**
 * De id's van alle voorbeeldmerken.
 *
 * ⚠️ Faalt naar "geen demo-merken" bij een databasefout. Dat is de andere kant
 * op dan je zou denken, en met reden: deze vraag staat vóór de maandmeting van
 * élke klant. Zou een haperende query alles als demo behandelen, dan meet de
 * app die maand niemand. Het dagbudget op nul van het demo-account en de
 * werkercontrole blijven dan nog als rem staan. Wel luid gelogd.
 */
export async function demoProfielIds(admin: unknown): Promise<Set<string>> {
  try {
    const { data, error } = await (admin as DemoQueryClient)
      .from("profiles")
      .select("id")
      .eq("is_demo", true);
    if (error) throw error;
    return new Set((data ?? []).map((r) => r.id));
  } catch (err) {
    console.error("Kon de voorbeeldaccounts niet opvragen, er wordt niets overgeslagen:", err);
    return new Set();
  }
}
