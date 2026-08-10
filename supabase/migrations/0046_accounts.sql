-- ═══════════════════════════════════════════════════════════════════════════
-- 0046 — Accounts: de laag boven het merk
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT HET PROBLEEM WAS
--
-- `profiles` was twee dingen tegelijk: de klant én de website. Dat werkte
-- zolang er één gebruiker was met een handvol merken. Drie besluiten van
-- 10 augustus 2026 (docs/Nova.md §0) maken het onhoudbaar:
--
--   • besluit 9  een klant kan een marketingbureau zijn, met meerdere klanten
--   • besluit 10 een klant kan meerdere websites hebben
--   • besluit 11 er komen er ongeveer twintig in het eerste jaar
--
-- Met alleen `profiles.user_id` is "alle merken van deze klant" niet uit te
-- drukken, en "deze gebruiker mag bij deze drie klanten" al helemaal niet.
--
-- WAAROM DEZE OPLOSSING, EN NIET DE HERNOEMING DIE HET PLAN EERST NOEMDE
--
-- Het plan schreef eerst voor dat `profiles` `brands` zou worden. Dat is
-- afgevallen na het natellen: vijftien tabellen dragen een `profile_id`, alle
-- RLS-regels hangen eraan, en de code verwijst er op ~500 plekken naar. Die
-- hernoeming levert nul functionaliteit op, want `profiles` ís het merk al:
-- één website, één dossier, één set metingen. De navigatie zegt bovendien al
-- "Merken" (lib/nav.ts).
--
-- Wat écht ontbrak is de laag eróven. Dus die komt erbij, en `profiles` blijft
-- staan waar hij staat. Additief en idempotent (conventie 4), en niets van wat
-- er nu draait verandert van betekenis.
--
-- DE TOEGANGSREGEL WORDT DRIELAAGS
--
--   1. je zit in het account waar het merk aan hangt   (nieuw, de hoofdregel)
--   2. of je bent de historische eigenaar               (profiles.user_id, blijft)
--   3. of je bent beheerder                             (is_staff(), blijft)
--
-- Regel 2 blijft bewust bestaan. Hem nu weghalen zou betekenen dat de backfill
-- hieronder foutloos moet zijn geweest voordat er ook maar iemand inlogt, en
-- dat is precies het soort aanname waar dit project vangnetten tegen bouwt.
-- Hij verdwijnt pas als op productie is nageteld dat elk merk een account heeft.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Het account ─────────────────────────────────────────────────────────
--
-- De velden komen uit de veldeninventaris (docs/Nova.md §13.1), die is
-- overgenomen van wat InSpace in hun onboarding uitvraagt. Allemaal nullable:
-- een account bestaat vanaf het moment dat er een merk aan hangt, en de
-- facturatiegegevens komen pas bij de verkoop (conventie 3).
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),

  -- Werknaam, wat de consultant in de kiezer ziet. Verplicht, want een naamloos
  -- account is in een lijst van twintig niet terug te vinden.
  name text not null,

  -- Facturatie (§13.1). `vat_not_applicable` is Nova's "I don't have a VAT
  -- number"-vinkje: het verschil tussen "nog niet ingevuld" en "bestaat niet"
  -- is hier echt, en null zou die twee op één hoop gooien.
  legal_name text,
  address text,
  postal_code text,
  city text,
  country text,
  vat_number text,
  vat_not_applicable boolean not null default false,
  invoice_email text,

  -- Contactpersoon. ⚠️ Dit e-mailadres is ook het inlogadres; Nova waarschuwt
  -- daar expliciet voor (`editContactWarningTitle`) en die waarschuwing hoort
  -- straks ook in het scherm te staan.
  contact_person text,
  contact_email text,
  contact_phone text,

  -- Het pakket (besluit 6): 10, 20 of 40 pagina's per maand. Bepaalt straks de
  -- quota van het contentplan. Null = nog geen pakket gekozen, en dat is de
  -- normale stand tijdens een demo.
  package_pages_per_month integer
    check (package_pages_per_month is null or package_pages_per_month in (10, 20, 40)),

  -- Doorlopend opzegbaar (besluit 7), dus geen einddatum en geen looptijd.
  -- `started_at` is waar de teller "maand 4 sinds de start" op rekent.
  started_at timestamptz,

  -- Opzeggen verwijdert niets (besluit 14, conventie 8). Tot deze datum
  -- verandert er niets aan wat de klant ziet; daarna valt hij terug op een
  -- leesweergave met zijn cijfers erin.
  cancelled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

-- ── 2. Wie mag bij welk account ────────────────────────────────────────────
--
-- Een koppeltabel en geen kolom op de gebruiker: precies dít is wat een bureau
-- mogelijk maakt (besluit 9). Eén gebruiker, meerdere accounts.
create table if not exists public.account_users (
  account_id uuid not null references public.accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Twee rollen, niet meer, net als Nova (`roleAdmin`, `roleMember`).
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (account_id, user_id)
);

create index if not exists account_users_user_id_idx on public.account_users(user_id);

-- ── 3. Het merk hangt aan een account ──────────────────────────────────────
alter table public.profiles
  add column if not exists account_id uuid references public.accounts(id);

create index if not exists profiles_account_id_idx on public.profiles(account_id);

-- ── 4. Backfill ────────────────────────────────────────────────────────────
--
-- Elke bestaande eigenaar wordt één account met al zijn merken erin. Dat is de
-- enige verdeling die klopt zonder te gokken: wie nu samen onder één `user_id`
-- staat, hoorde ook bij elkaar.
--
-- Idempotent: draait de migratie twee keer, dan vindt hij het bestaande account
-- via `account_users` en maakt er geen tweede aan.
do $$
declare
  eigenaar record;
  account uuid;
begin
  for eigenaar in
    select distinct user_id from public.profiles where user_id is not null
  loop
    select au.account_id into account
      from public.account_users au
     where au.user_id = eigenaar.user_id
     limit 1;

    if account is null then
      insert into public.accounts (name)
      values (coalesce(
        (select u.email from auth.users u where u.id = eigenaar.user_id),
        'Account'
      ))
      returning id into account;

      -- De eerste gebruiker van een account is beheerder ervan. Dat is niet
      -- hetzelfde als `staff_users`: dat gaat over Aura zelf, dit over de klant.
      insert into public.account_users (account_id, user_id, role)
      values (account, eigenaar.user_id, 'admin')
      on conflict do nothing;
    end if;

    update public.profiles
       set account_id = account
     where user_id = eigenaar.user_id
       and account_id is null;
  end loop;
end $$;

-- ── 5. RLS ─────────────────────────────────────────────────────────────────
--
-- SELECT-only, zoals overal in dit project (conventie 6). Schrijven loopt via
-- API-routes met de service-role key en een expliciete ownership-check.

alter table public.accounts enable row level security;
alter table public.account_users enable row level security;

-- Welke accounts ziet deze gebruiker? Als aparte functie, want drie policies
-- hebben hem nodig en een subquery die je drie keer uitschrijft loopt uiteen.
-- `security definer` zodat de policy op `account_users` zichzelf niet aanroept.
create or replace function public.user_account_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select account_id from public.account_users where user_id = (select auth.uid());
$$;

drop policy if exists accounts_select_member on public.accounts;
create policy accounts_select_member on public.accounts
  for select using (id in (select public.user_account_ids()));

drop policy if exists accounts_select_staff on public.accounts;
create policy accounts_select_staff on public.accounts
  for select using (public.is_staff());

drop policy if exists account_users_select_own on public.account_users;
create policy account_users_select_own on public.account_users
  for select using (user_id = (select auth.uid()));

drop policy if exists account_users_select_staff on public.account_users;
create policy account_users_select_staff on public.account_users
  for select using (public.is_staff());

-- Laag 1 van de drielaagse toegangsregel. De twee bestaande policies op
-- `profiles` (`profiles_select_own`, `profiles_select_staff`) blijven staan:
-- policies zijn een OR van elkaar, dus dit verruimt en breekt niets.
drop policy if exists profiles_select_account on public.profiles;
create policy profiles_select_account on public.profiles
  for select using (account_id in (select public.user_account_ids()));

-- Dezelfde verruiming voor analyses, via het merk waar ze aan hangen. Zonder
-- deze regel zou een collega binnen hetzelfde account het merk wél zien en de
-- analyses erop niet.
drop policy if exists analyses_select_account on public.analyses;
create policy analyses_select_account on public.analyses
  for select using (
    profile_id in (
      select p.id from public.profiles p
       where p.account_id in (select public.user_account_ids())
    )
  );
