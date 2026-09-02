import "server-only";

/**
 * Hoeveel er nog uitgegeven mag worden (P3, zie `docs/logbook.md`).
 *
 * De regels, de bedragen en de meldingen staan in `lib/spend-rules.ts`, want dat
 * bepaalt de uitkomst en hoort dus puur en testbaar te zijn (conventie 2). Hier
 * staat alleen het opzoekwerk: wat is er vandaag op dit account gezet, en wat
 * is er vandaag over alle accounts samen gezet.
 *
 * ── DE TWEEDE REM, NAAST DIE VAN BESLUIT 18 ─────────────────────────────────
 *
 * `lib/cost-guard.ts` zegt WIE er betaald werk mag starten. Deze zegt HOEVEEL er
 * nog over is. Allebei nodig: besluit 18 haalde de klant weg als risicobron,
 * maar een beheerder die zich vergist in een lus blaast een rekening net zo hard
 * op, en een cron die twintig keer vuurt vraagt niemand om toestemming.
 *
 * ── WAT ER GEBEURT ALS DE CONTROLE ZELF STUKGAAT ────────────────────────────
 *
 * ⚠️ Dan gaat de handeling DOOR, en dat is een bewuste keuze die de andere kant
 * op valt dan bij `mayTriggerCost` (die faalt naar `false`). Het verschil zit in
 * wat je kapotmaakt als je het mis hebt. Bij de vraag "wie" is het ergste geval
 * dat iemand even niets kan; bij de vraag "hoeveel" zou zacht falen naar
 * "geblokkeerd" betekenen dat één trage query de hele pijplijn stilzet voor
 * alle klanten, inclusief het werk dat allang betaald is. Een storing in de
 * boekhouding mag het product niet platleggen, precies zoals `ledger.ts` een
 * mislukte logregel ook nooit een meting laat afbreken.
 *
 * Het wordt wel gelogd, want een rem die stil niet werkt is erger dan geen rem.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import {
  spendVerdict,
  combinedVerdict,
  limitFromEnv,
  DEFAULT_ACCOUNT_DAILY_LIMIT_EUR,
  DEFAULT_TOTAL_DAILY_LIMIT_EUR,
  type SpendVerdict,
} from "@/lib/spend-rules";

type Admin = ReturnType<typeof createAdminClient>;

/** Het begin van vandaag in UTC, als ISO-string. */
export function startOfDayUtc(now: Date = new Date()): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();
}

/**
 * Telt de dollars op sinds een moment, eventueel voor één account.
 *
 * Paginering is hier geen luxe: `select` geeft standaard maximaal duizend rijen
 * terug en `ai_calls` stond na zes weken al op 1.140. Zonder dit zou de teller
 * stilletjes te laag uitvallen zodra een account druk wordt, en dan lekt de rem
 * precies op het moment dat hij nodig is.
 */
async function sumCostUsd(
  admin: Admin,
  sinds: string,
  accountId: string | null,
): Promise<number> {
  const PAGINA = 1000;
  let totaal = 0;
  let van = 0;

  for (;;) {
    let query = admin
      .from("ai_calls")
      .select("cost_usd")
      .gte("created_at", sinds)
      .range(van, van + PAGINA - 1);
    if (accountId) query = query.eq("account_id", accountId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const rijen = (data ?? []) as { cost_usd: number | null }[];
    for (const r of rijen) totaal += Number(r.cost_usd ?? 0);
    if (rijen.length < PAGINA) break;
    van += PAGINA;
  }

  return totaal;
}

/**
 * Het dagplafond van dit account: eigen instelling, anders de standaard.
 *
 * Leest `accounts.daily_budget_eur` (migratie 0089, herstelplan T5). Niet meer
 * `monthly_budget_eur`: dat was een MAANDplafond en is een andere grootheid,
 * geen synoniem met een ander getal.
 */
async function accountDailyLimitEur(admin: Admin, accountId: string): Promise<number> {
  const standaard = limitFromEnv(process.env.DAILY_BUDGET_PER_ACCOUNT_EUR, DEFAULT_ACCOUNT_DAILY_LIMIT_EUR);
  const { data } = await admin
    .from("accounts")
    .select("daily_budget_eur")
    .eq("id", accountId)
    .maybeSingle();
  const eigen = data?.daily_budget_eur as number | null | undefined;
  // Alleen `null`/`undefined` valt terug op de standaard. Nul is een echte
  // waarde en betekent "dit account op slot", en die mag niet weggerekend
  // worden door een `||`.
  return eigen === null || eigen === undefined ? standaard : Number(eigen);
}

/**
 * Mag er nog geld uit voor dit account?
 *
 * `accountId` mag `null` zijn: dan geldt alleen het totaalplafond. Dat is geen
 * uitzonderingsgeval maar de normale toestand voor werk dat nog geen account
 * heeft, zoals het onderzoek naar een merk dat net is aangemaakt.
 *
 * Beide plafonds tellen sinds T5 over DEZELFDE periode (vandaag, UTC), alleen
 * over een andere groep: dit ene account, of alle accounts samen.
 */
export async function checkBudget(accountId: string | null): Promise<SpendVerdict> {
  const admin = createAdminClient();
  const totaalLimiet = limitFromEnv(process.env.DAILY_BUDGET_EUR, DEFAULT_TOTAL_DAILY_LIMIT_EUR);

  try {
    const sindsVandaag = startOfDayUtc();
    const totaalUsd = await sumCostUsd(admin, sindsVandaag, null);
    const totaal = spendVerdict("totaal", totaalUsd, totaalLimiet);

    if (!accountId) return totaal;

    const [accountUsd, accountLimiet] = await Promise.all([
      sumCostUsd(admin, sindsVandaag, accountId),
      accountDailyLimitEur(admin, accountId),
    ]);
    return combinedVerdict(totaal, spendVerdict("account", accountUsd, accountLimiet));
  } catch (err) {
    // Zie de kop van dit bestand: doorlaten, maar hoorbaar. Zonder deze regel
    // zou een kapotte rem niet van een werkende te onderscheiden zijn.
    console.error("Budgetcontrole mislukt, handeling gaat door zonder rem:", err);
    return { ok: true, scope: null, message: null, spentEur: 0, limitEur: totaalLimiet };
  }
}

/**
 * Hetzelfde, maar met het account opgezocht bij een profiel.
 *
 * De routes hebben een profiel of een analyse in handen, nooit een account. Dit
 * staat hier en niet in elke route, zodat er één plek is die weet hoe je van een
 * profiel bij een account komt (P2: geen tweelingen).
 */
export async function checkBudgetForProfile(profileId: string): Promise<SpendVerdict> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("account_id")
    .eq("id", profileId)
    .maybeSingle();
  return checkBudget((data?.account_id as string | null) ?? null);
}
