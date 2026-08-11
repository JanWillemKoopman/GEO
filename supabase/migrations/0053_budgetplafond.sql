-- 0053: het budgetplafond (F1 / P3 uit docs/tasks/lanceerplan.md)
--
-- ── WAT DIT OPLOST ─────────────────────────────────────────────────────────
--
-- Er was tot 11 augustus 2026 precies één kostenplafond in de hele app, en dat
-- gold alleen de onboarding van één merk ($2,15, lib/pipeline/onboarding-budget.ts).
-- Alles daarna, de metingen (~$0,82 per ronde), het schrijven (~$0,28 per
-- pagina) en het herschrijven, kon ongelimiteerd doorlopen. Besluit 18 haalde
-- de klant weg als risicobron, maar een beheerder die zich vergist in een lus
-- kan een rekening net zo hard opblazen.
--
-- ── WAAROM ai_calls EEN account_id KRIJGT ──────────────────────────────────
--
-- Het plafond geldt per ACCOUNT, en het kostenlogboek kende alleen analysis_id
-- en profile_id. Optellen per account zou dan bij elke controle een drieweg-join
-- kosten (ai_calls → analyses → profiles → accounts), en die controle draait
-- vóór élke dure handeling. Een logboek hoort de dimensie te dragen waarop je
-- afrekent.
--
-- De kolom wordt door een trigger gevuld en niet door de applicatie, met opzet:
-- lib/openai/ledger.ts is best-effort en mag geen extra netwerkronde doen om een
-- account op te zoeken (een mislukte logregel mag nooit een meting laten falen).
-- In de database is het één opzoeking binnen dezelfde transactie.
--
-- Additief en idempotent, conventie 4: geen enkele `drop`, alles met
-- `if not exists` / `or replace`, en bestaande rijen worden bijgewerkt en niet
-- vervangen.

-- ── 1. De kolom ─────────────────────────────────────────────────────────────

alter table public.ai_calls
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

comment on column public.ai_calls.account_id is
  'Waarop dit bedrag drukt. Gevuld door trigger ai_calls_set_account, zie migratie 0053. '
  'Null betekent: niet aan een account toe te wijzen (bv. een aanroep zonder profiel).';

-- De controle vraagt altijd "wat is er deze maand op dit account gezet", dus de
-- index staat op precies dat paar. Zonder index wordt het bij elke dure
-- handeling een volledige scan over een tabel die alleen maar groeit.
create index if not exists ai_calls_account_created_idx
  on public.ai_calls (account_id, created_at desc);

-- Het dagplafond telt over ALLE accounts samen en heeft dus alleen de datum
-- nodig. Eigen index, want de bovenstaande begint op account_id en is daar niet
-- voor te gebruiken.
create index if not exists ai_calls_created_idx
  on public.ai_calls (created_at desc);

-- ── 2. De trigger die hem vult ─────────────────────────────────────────────
--
-- Twee wegen naar het account, want een aanroep heeft het een of het ander:
-- het profiel rechtstreeks, of de analyse die naar een profiel wijst. De
-- volgorde is profile_id eerst, dat is de kortste weg.

create or replace function public.ai_calls_resolve_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.account_id is not null then
    return new;
  end if;

  if new.profile_id is not null then
    select p.account_id into new.account_id
    from public.profiles p where p.id = new.profile_id;
  end if;

  if new.account_id is null and new.analysis_id is not null then
    select p.account_id into new.account_id
    from public.analyses a
    join public.profiles p on p.id = a.profile_id
    where a.id = new.analysis_id;
  end if;

  return new;
end;
$$;

drop trigger if exists ai_calls_set_account on public.ai_calls;
create trigger ai_calls_set_account
  before insert on public.ai_calls
  for each row execute function public.ai_calls_resolve_account();

-- ── 3. De bestaande rijen ──────────────────────────────────────────────────
--
-- Zonder dit begint elk account op nul en is de eerste maand na deze migratie
-- ongeremd. Alleen rijen die nog niets hebben, zodat herhaald draaien niets
-- overschrijft (conventie 4).

update public.ai_calls c
set account_id = p.account_id
from public.profiles p
where c.account_id is null and c.profile_id = p.id and p.account_id is not null;

update public.ai_calls c
set account_id = p.account_id
from public.analyses a
join public.profiles p on p.id = a.profile_id
where c.account_id is null and c.analysis_id = a.id and p.account_id is not null;

-- ── 4. Het plafond per account ─────────────────────────────────────────────
--
-- Null betekent: gebruik de standaard uit lib/spend-rules.ts. Zo hoeft een
-- bestaand account niet aangeraakt te worden en verandert een nieuwe standaard
-- meteen voor iedereen die niets bijzonders heeft.
--
-- De bovengrens van 100000 is dezelfde vorm als bij value_per_mention_eur
-- (migratie 0051): een typefout van drie nullen te veel hoort de rem niet stil
-- uit te zetten. Nul is wél toegestaan, dat is "dit account op slot".

alter table public.accounts
  add column if not exists monthly_budget_eur numeric(10,2);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'accounts_monthly_budget_eur_check'
  ) then
    alter table public.accounts
      add constraint accounts_monthly_budget_eur_check
      check (monthly_budget_eur is null or (monthly_budget_eur >= 0 and monthly_budget_eur <= 100000));
  end if;
end $$;

comment on column public.accounts.monthly_budget_eur is
  'Maandplafond in euro''s voor betaald AI-werk. Null = de standaard uit lib/spend-rules.ts. '
  'Zie migratie 0053 en docs/tasks/lanceerplan.md F1.';
