-- ═══════════════════════════════════════════════════════════════════════════
-- 0049 — Het contentplan: van meetinstrument naar programma
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT HET PROBLEEM WAS
--
-- ORBIT ENGINE schrijft content op verzoek, per analyse. Dat werkt, maar het maakt van
-- het product een gereedschap: er loopt niets, er staat niets vooruit gepland,
-- en een klant die een maand geen tijd heeft merkt niet dat hij iets mist.
--
-- Besluit 3 (docs/Nova.md §0): het contentplan wordt het kernobject. Twaalf
-- maanden vooruit, pagina's per maand, per maand goedkeuren. Dat is wat een
-- abonnement rechtvaardigt en wat de klant het gevoel geeft dat er een traject
-- loopt.
--
-- ⚠️ WAT DIT NIET IS: EEN CONTRACT
--
-- Besluit 7: doorlopend opzegbaar. Nova zet overal "contract month {current} of
-- {total}" en dat kan hier niet, want de klant kan morgen weg. Vandaar dat er
-- GEEN looptijd in `content_plans` staat en geen einddatum: er is een
-- startdatum, en de teller heet "maand 4 sinds de start". Zie
-- `monthsSinceStart()` in lib/account-status.ts.
--
-- Het plan kijkt wél twaalf maanden vooruit, want een programma zonder horizon
-- is geen programma. Het verschil zit in de taal, niet in de data.
--
-- DE VIER TABELLEN
--
--   profile_funnel_stages  de fasen van dit merk, 3 tot 5 (Nova: `admin.funnels`)
--   content_plans          het plan zelf, met de quota uit het pakket
--   plan_months            twaalf maanden, elk met een eigen goedkeuring
--   planned_pages          de pagina's, met status, volgorde en buffer-vlag
--
-- WAAROM `plan_months` EEN EIGEN TABEL IS EN GEEN KOLOM
--
-- Omdat goedkeuring per maand gaat (Nova's `approveMonthly`), en een maand dus
-- een eigen status, een eigen goedkeurmoment en een eigen goedkeurder heeft.
-- Dat in `planned_pages` herhalen zou betekenen dat twaalf rijen dezelfde
-- waarheid dragen, en dat ze dus uit elkaar kunnen lopen.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Funnelfasen ─────────────────────────────────────────────────────────
--
-- Per merk instelbaar, drie tot vijf. Nova dwingt dat aantal af vóór ze een
-- strategie laten genereren (`admin.errors.funnelsRequired`: "Add between 3 and
-- 5 funnels"). Die grens is hier niet als constraint afdwingbaar (dat zou een
-- trigger vragen voor iets wat de applicatie beter kan uitleggen), maar staat
-- wel in `lib/pipeline/plan-build.ts`.
create table if not exists public.profile_funnel_stages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists profile_funnel_stages_profile_idx
  on public.profile_funnel_stages(profile_id, sort_order);

-- ── 2. Het plan ────────────────────────────────────────────────────────────
create table if not exists public.content_plans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,

  -- Waar "maand 4 sinds de start" op rekent. Een datum en geen timestamp: het
  -- gaat om de maand, niet om het uur.
  started_on date not null default current_date,

  -- De quota, GEKOPIEERD uit het pakket op het account (besluit 6: 10, 20 of
  -- 40). Bewust een kopie en geen verwijzing: wie halverwege upgradet, hoort
  -- niet met terugwerkende kracht een ander plan te krijgen. Het bestaande plan
  -- houdt zijn aantal, het volgende krijgt het nieuwe.
  pages_per_month integer not null check (pages_per_month between 1 and 100),

  -- concept  = de agent heeft hem opgesteld, nog niemand heeft ernaar gekeken
  -- actief   = minstens één maand goedgekeurd, het programma loopt
  -- gestopt  = vervangen door een nieuwe versie, of het abonnement is geëindigd
  status text not null default 'concept'
    check (status in ('concept', 'actief', 'gestopt')),

  -- Nova's `createStrategyNoteLabel`: vrije context die met de agent meegaat
  -- als het plan (opnieuw) opgesteld wordt. "Let op: nieuwe vestiging in Breda."
  strategy_note text,

  -- Nova nummert hun strategieën (`strategyLabel`: "Strategy 0{version}"), en
  -- dat is nodig zodra afwijzen een nieuwe ronde start (`approveMonthly`:
  -- "Declining discards this strategy and generates a new one").
  version integer not null default 1,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_plans_profile_idx
  on public.content_plans(profile_id, status);

drop trigger if exists content_plans_set_updated_at on public.content_plans;
create trigger content_plans_set_updated_at
  before update on public.content_plans
  for each row execute function public.set_updated_at();

-- ── 3. De maanden ──────────────────────────────────────────────────────────
create table if not exists public.plan_months (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.content_plans(id) on delete cascade,

  -- 1 tot en met 12. Niet een kalendermaand: maand 1 is de eerste maand ná de
  -- start, wat die maand ook heet.
  month_number integer not null check (month_number between 1 and 12),

  -- concept          = nog niet aan de klant getoond
  -- ter_goedkeuring  = wacht op de klant (Nova: "Awaiting your approval")
  -- goedgekeurd      = de klant zei ja, de pagina's mogen de pijplijn in
  -- afgewezen        = de klant zei nee; er volgt een nieuwe planversie
  status text not null default 'concept'
    check (status in ('concept', 'ter_goedkeuring', 'goedgekeurd', 'afgewezen')),

  approved_at timestamptz,
  -- Wie het deed. Bij een bureau (besluit 15) is dat het bureau, en een halfjaar
  -- later wil je kunnen nagaan wie namens wie tekende.
  approved_by_user_id uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),

  unique (plan_id, month_number)
);

-- ── 4. De geplande pagina's ────────────────────────────────────────────────
create table if not exists public.planned_pages (
  id uuid primary key default gen_random_uuid(),
  plan_month_id uuid not null references public.plan_months(id) on delete cascade,

  -- ⚠️ Bewust gedenormaliseerd. Zonder deze kolom kost "alle pagina's van dit
  -- merk" een sprong over twee tabellen, en dat is precies de query die het
  -- vaakst draait (de lijst, de tellers, de cron). Wordt gezet bij het
  -- aanmaken en verandert daarna nooit, want een pagina verhuist niet tussen
  -- merken.
  profile_id uuid not null references public.profiles(id) on delete cascade,

  title text not null,
  -- Het pad waar hij komt te staan. Leeg tot de klant hem markeert als
  -- geplaatst; dán is het de bevestigde werkelijkheid.
  url_path text,

  -- Nova's vier (`pageTypeCategory`, `pageTypeService`, `pageTypeInformative`,
  -- `pageTypeOther`). Globaal en niet per merk: het onderscheid gaat over de
  -- functie van een pagina, en die is voor een tandarts hetzelfde als voor een
  -- autodealer.
  page_type text not null default 'informatief'
    check (page_type in ('categorie', 'dienst', 'informatief', 'overig')),

  funnel_stage_id uuid references public.profile_funnel_stages(id) on delete set null,
  -- Waar dit vandaan komt: een onderwerp uit `propose_topics`. Null bij een
  -- buffer of een handmatig toegevoegde pagina.
  topic_id uuid references public.profile_topics(id) on delete set null,

  -- De technische status. De vertaling naar "wie is er nu aan zet" staat NIET
  -- in de database maar in `lib/plan-status.ts`: dat is een presentatiekeuze
  -- die mag veranderen zonder migratie.
  status text not null default 'gepland'
    check (status in (
      'gepland',          -- staat in het plan, er gebeurt nog niets
      'schrijven',        -- de pijplijn is bezig
      'ter_goedkeuring',  -- geschreven, wacht op de klant
      'goedgekeurd',      -- klant zei ja, klaar om te plaatsen
      'geplaatst',        -- staat live
      'afgewezen',        -- klant wil hem niet
      'mislukt'           -- het schrijven ging mis
    )),

  sort_order integer not null default 0,

  -- ── De buffer ────────────────────────────────────────────────────────────
  -- Nova's `common.buffer` ("+{count} buffer") en `deleteUrl.body`: verwijder je
  -- een pagina, dan schuift er een reserve van diezelfde maand in. Zo blijft het
  -- aantal pagina's per maand kloppen met wat de klant betaalt, zonder dat er
  -- iemand handmatig iets moet bijmaken.
  is_buffer boolean not null default false,

  -- Wanneer hij gepubliceerd hoort te worden. De pijplijn begint tien dagen
  -- eerder te schrijven (Nova: "about 10 days before its scheduled post date").
  scheduled_for date,

  content_piece_id uuid references public.content_pieces(id) on delete set null,

  -- ── Plaatsen ─────────────────────────────────────────────────────────────
  -- Besluit 8: zowel de eigenaar als de klant mag markeren als geplaatst, en we
  -- leggen vast wie. Zonder die kolom is achteraf niet na te gaan wie wat live
  -- zette, en dat is precies de vraag die opkomt als er iets mis is.
  posted_at timestamptz,
  posted_url text,
  posted_by_user_id uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists planned_pages_month_idx
  on public.planned_pages(plan_month_id, sort_order);
create index if not exists planned_pages_profile_idx
  on public.planned_pages(profile_id, status);
-- De cron zoekt op "wat moet er binnenkort geschreven worden".
create index if not exists planned_pages_scheduled_idx
  on public.planned_pages(scheduled_for)
  where status = 'gepland';

drop trigger if exists planned_pages_set_updated_at on public.planned_pages;
create trigger planned_pages_set_updated_at
  before update on public.planned_pages
  for each row execute function public.set_updated_at();

-- ── 5. RLS ─────────────────────────────────────────────────────────────────
--
-- SELECT-only (conventie 6). Dezelfde drielaagse toegangsregel als bij
-- `profiles` (migratie 0046): via het account, via de historische eigenaar, of
-- als beheerder. Alle vier de tabellen hangen aan een merk, dus ze delen één
-- hulpfunctie in plaats van vier keer dezelfde subquery.

create or replace function public.readable_profile_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id from public.profiles p
   where p.account_id in (select public.user_account_ids())
      or p.user_id = (select auth.uid())
      or public.is_staff();
$$;

alter table public.profile_funnel_stages enable row level security;
alter table public.content_plans enable row level security;
alter table public.plan_months enable row level security;
alter table public.planned_pages enable row level security;

drop policy if exists funnel_stages_select on public.profile_funnel_stages;
create policy funnel_stages_select on public.profile_funnel_stages
  for select using (profile_id in (select public.readable_profile_ids()));

drop policy if exists content_plans_select on public.content_plans;
create policy content_plans_select on public.content_plans
  for select using (profile_id in (select public.readable_profile_ids()));

drop policy if exists plan_months_select on public.plan_months;
create policy plan_months_select on public.plan_months
  for select using (
    plan_id in (
      select cp.id from public.content_plans cp
       where cp.profile_id in (select public.readable_profile_ids())
    )
  );

drop policy if exists planned_pages_select on public.planned_pages;
create policy planned_pages_select on public.planned_pages
  for select using (profile_id in (select public.readable_profile_ids()));
