-- 0089: het budgetplafond per klant wordt een dagplafond, niet een maandplafond
--
-- ── WAT DIT OPLOST ──────────────────────────────────────────────────────────
--
-- docs/tasks/herstelplan-na-audit.md T5, kader 4 (2 september 2026): de eigenaar
-- wil "maximaal €20 per dag per klant en €50 per dag over alle accounts samen",
-- niet het maandplafond van €50 per account uit migratie 0053. Dat verandert de
-- BETEKENIS van `accounts.monthly_budget_eur`, niet alleen het bedrag: een
-- ingevulde waarde van vroeger ("€50 deze maand") zou als dagplafond ineens
-- 2,5 tot 3 keer zo streng zijn per dag als bedoeld. Vandaar een NIEUWE kolom
-- in plaats van het hergebruiken van de oude (conventie 4: nooit `drop`, en een
-- kolom die van betekenis wisselt zonder van naam te wisselen is net zo
-- gevaarlijk als weggooien).
--
-- Geen enkel account had op 2 september 2026 `monthly_budget_eur` ingevuld
-- (nagekeken op productie), dus er valt niets te migreren. De oude kolom blijft
-- staan, ongebruikt, zoals `fact_requests.section_id` in migratie 0087.
--
-- Additief en idempotent (conventie 4).

alter table public.accounts
  add column if not exists daily_budget_eur numeric(10,2);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'accounts_daily_budget_eur_check'
  ) then
    alter table public.accounts
      add constraint accounts_daily_budget_eur_check
      check (daily_budget_eur is null or (daily_budget_eur >= 0 and daily_budget_eur <= 100000));
  end if;
end $$;

comment on column public.accounts.daily_budget_eur is
  '(0089) Dagplafond in euro''s voor betaald AI-werk van dit account. Null = de standaard uit lib/spend-rules.ts (€20). Vervangt monthly_budget_eur (herstelplan T5).';

comment on column public.accounts.monthly_budget_eur is
  '(0089) NIET MEER IN GEBRUIK. Vervangen door daily_budget_eur: het plafond per account is een dagplafond geworden, geen maandplafond. Blijft staan omdat migraties niets weggooien (conventie 4); geen enkel account had hem ingevuld.';
