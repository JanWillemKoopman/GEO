-- ═══════════════════════════════════════════════════════════════════════════
-- 0073 · De Sales-module, sprint 5: outreach, contactpersonen en de werkstroom
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT DIT TOEVOEGT
--
-- Vier tabellen: `sales_contacts` (wie mailen we), `sales_outreach` (wat er
-- uitstaat en wat eruit kwam), `sales_send_stats` (het plafond per persoon per
-- dag) en `sales_events` (het logboek). Het ontwerp staat in
-- `docs/tasks/geo-prospect-engine.md` §7.4 en hoofdstuk 16 tot en met 19.
--
-- ⚠️ WAT DIT NADRUKKELIJK NIET TOEVOEGT: EEN VERZENDROUTE
--
-- Plan §16.3, en het is een vaste regel en geen ontwerpoptie: "De openingsmail
-- wordt altijd door de salesmedewerker zelf verzonden, vanuit zijn eigen
-- mailbox, onder zijn eigen naam. ORBIT ENGINE verstuurt hem nooit, ook niet
-- namens hem, ook niet met zijn adres als afzender, ook niet als het technisch
-- beter uitkomt."
--
-- Vandaar dat `sales_outreach` twee tekstvelden heeft (`body_draft` en
-- `body_sent`) en géén verzendstatus, geen wachtrij en geen bezorgingsvlag. Het
-- veld `sent_at` betekent "de medewerker heeft gemeld dat hij hem verstuurd
-- heeft", en niets anders. Er is geen kolom die iets anders kán betekenen.
--
-- ⚠️ EN WAAROM `sales_events` ER VANAF HET BEGIN IS
--
-- Plan §7.4, laatste alinea: "Zonder deze tabel is achteraf niet te
-- reconstrueren wat er gebeurd is, en dan is de hele meetbaarheidsbelofte leeg."
-- ORBIT ENGINE is een product dat om meten draait; een eigen acquisitiemodule
-- die op gevoel werkt is een productfout en niet alleen een gemis (plan 18).
--
-- Additief en idempotent (conventie 4), geen enkele `drop table` of
-- `drop column`.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. De contactpersoon ───────────────────────────────────────────────────
--
-- ⚠️ DRIE REGELS UIT PLAN 9.4 STAAN HIER IN DE STRUCTUUR EN NIET ALLEEN IN DE UI.
--
-- 1. Een AFGELEID adres is geen adres. Een gok op `voornaam@domein.nl` mag
--    opgeslagen worden met het etiket `afgeleid`, maar er gaat geen mail naartoe
--    zonder dat een mens hem bevestigd heeft. Vandaar `email_kind` plus
--    `verified_at`, en een controle in code die op allebei kijkt.
-- 2. Liever geen contact dan de verkeerde. Vindt de stap niemand met voldoende
--    zekerheid, dan blijft deze tabel leeg en krijgt de opportunity de stand
--    "contact ontbreekt". Hij verdwijnt niet stil en gaat ook niet stiekem naar
--    het algemene adres.
-- 3. De juiste ROL, niet zomaar een naam. Bij een makelaarskantoor is dat de
--    eigenaar of de commercieel verantwoordelijke, niet de administratief
--    medewerker die toevallig op de teampagina staat.
--
-- PRIVACY (plan 9.4 en 24.2): namen en functies van medewerkers zijn
-- persoonsgegevens, ook als ze publiek op een website staan. `source_url` legt
-- per rij vast waar het vandaan komt, zodat bij een vraag van betrokkene te
-- zeggen is waar wij het gehaald hebben. Ze verschijnen nooit op een publieke
-- pagina en verdwijnen mee met de opruimtermijn.
create table if not exists public.sales_contacts (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.sales_companies (id) on delete cascade,
  name              text not null,
  role              text,
  email             text,
  -- `gevonden` = het adres stond er echt. `afgeleid` = wij hebben het geraden.
  email_kind        text not null default 'gevonden',
  phone             text,
  source_url        text,
  confidence        text not null default 'middel',
  -- Gevuld = een mens heeft dit adres bevestigd. Een afgeleid adres zonder deze
  -- stempel mag nooit een ontvanger zijn.
  verified_by_user_id uuid references auth.users (id),
  verified_at       timestamptz,
  created_at        timestamptz not null default now()
);

alter table public.sales_contacts
  drop constraint if exists sales_contacts_email_kind_check;
alter table public.sales_contacts
  add constraint sales_contacts_email_kind_check check (
    email_kind in ('gevonden', 'afgeleid')
  );

alter table public.sales_contacts
  drop constraint if exists sales_contacts_confidence_check;
alter table public.sales_contacts
  add constraint sales_contacts_confidence_check check (
    confidence in ('hoog', 'middel', 'laag')
  );

create index if not exists sales_contacts_company_idx
  on public.sales_contacts (company_id);

comment on table public.sales_contacts is
  'De gevonden contactpersonen (plan 9.4). Een afgeleid adres zonder verified_at '
  'mag nooit een ontvanger zijn; dat is een controle in code, niet alleen in de UI.';

-- ── 2. De outreach ─────────────────────────────────────────────────────────
create table if not exists public.sales_outreach (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.sales_companies (id) on delete cascade,
  opportunity_id uuid references public.sales_opportunities (id) on delete set null,
  market_id      uuid references public.sales_markets (id) on delete set null,
  owner_user_id  uuid references auth.users (id),
  contact_id     uuid references public.sales_contacts (id) on delete set null,
  status         text not null default 'nieuw',
  subject        text,
  -- Wat ORBIT ENGINE klaarzette. De medewerker mag hem aanpassen.
  body_draft     text,
  -- Wat er volgens de medewerker daadwerkelijk uitging. Apart bewaard, want bij
  -- een acquisitiemail wil je maanden later kunnen zien wat er precies verstuurd
  -- is en waarop dat gebaseerd was (plan 15.3).
  body_sent      text,
  -- ⚠️ "De medewerker heeft gemeld dat hij hem verstuurd heeft." Niet: het
  -- systeem heeft hem verstuurd. Die route bestaat niet (plan 16.3).
  sent_at        timestamptz,
  sent_via       text,
  reply_at       timestamptz,
  reply_sentiment text,
  call_at        timestamptz,
  meeting_at     timestamptz,
  -- De gespreksvoorbereiding: twee cijfers, drie openingen, drie bezwaren, en
  -- wat je niet moet zeggen (plan 16.5).
  call_prep      jsonb,
  outcome        text,
  outcome_at     timestamptz,
  -- ⚠️ Verplicht bij een afwijzing, en uit een vaste lijst (plan 17.1). Vrije
  -- tekst mag erbij maar vervangt de categorie niet: zonder categorie is de
  -- leerlus uit hoofdstuk 19 onmogelijk.
  lost_reason    text,
  follow_up_at   timestamptz,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.sales_outreach
  drop constraint if exists sales_outreach_status_check;
alter table public.sales_outreach
  add constraint sales_outreach_status_check check (
    status in (
      'nieuw', 'toegewezen', 'gemaild', 'gereageerd', 'gebeld', 'gesprek',
      'gekwalificeerd', 'klant', 'afgewezen', 'niet_nu'
    )
  );

alter table public.sales_outreach
  drop constraint if exists sales_outreach_lost_reason_check;
alter table public.sales_outreach
  add constraint sales_outreach_lost_reason_check check (
    lost_reason is null or lost_reason in (
      'geen_budget', 'geen_interesse', 'werkt_met_bureau', 'te_klein',
      'verkeerde_persoon', 'geen_reactie'
    )
  );

-- ⚠️ Een afwijzing ZONDER reden mag niet bestaan. Zonder categorie is niet te
-- leren welk soort prospect afhaakt, en dat is de goedkoopste leerbron die deze
-- module heeft (plan hoofdstuk 19).
alter table public.sales_outreach
  drop constraint if exists sales_outreach_afgewezen_check;
alter table public.sales_outreach
  add constraint sales_outreach_afgewezen_check check (
    status <> 'afgewezen' or lost_reason is not null
  );

-- Eén ACTIEVE outreach per bedrijf (plan 7.4). Twee verkopers die hetzelfde
-- bedrijf tegelijk benaderen, is de pijnlijkste fout die deze module kan maken
-- na het benaderen van een bestaande klant.
create unique index if not exists sales_outreach_actief_key
  on public.sales_outreach (company_id)
  where status not in ('afgewezen', 'klant', 'niet_nu');

create index if not exists sales_outreach_owner_idx
  on public.sales_outreach (owner_user_id, status);

create index if not exists sales_outreach_followup_idx
  on public.sales_outreach (follow_up_at)
  where follow_up_at is not null;

comment on table public.sales_outreach is
  'Wat er uitstaat en wat eruit kwam (plan 7.4). sent_at betekent: de medewerker '
  'heeft gemeld dat hij hem zelf verstuurd heeft. De app verstuurt nooit (16.3).';
comment on column public.sales_outreach.lost_reason is
  'Verplicht bij een afwijzing, uit een vaste lijst (plan 17.1). Zonder categorie '
  'is de leerlus uit hoofdstuk 19 onmogelijk.';

-- ── 3. Het verzendplafond per persoon per dag ──────────────────────────────
--
-- Plan 16.6, eerste maatregel. Omdat de medewerker zelf verstuurt kan de app het
-- versturen niet tegenhouden, maar wel DE AANVOER: boven het plafond maakt ORBIT
-- ENGINE geen nieuwe concepten meer klaar en zegt erbij waarom.
--
-- ⚠️ Dit gaat niet over kosten maar over het maildomein van Outer Orbit. Gaan er
-- honderd berichten per week uit vanaf hetzelfde domein waarop ook de facturatie
-- loopt, dan kan één golf spamklachten dat domein afknijpen, en dan bereiken ook
-- de offertes hun bestemming niet meer. Dat merk je pas als het weken misgaat.
create table if not exists public.sales_send_stats (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  dag          date not null,
  verstuurd    integer not null default 0,
  bounces      integer not null default 0,
  klachten     integer not null default 0,
  afmeldingen  integer not null default 0,
  updated_at   timestamptz not null default now()
);

create unique index if not exists sales_send_stats_key
  on public.sales_send_stats (user_id, dag);

comment on table public.sales_send_stats is
  'Per medewerker per dag: verstuurd, gestuiterd, geklaagd, afgemeld (plan 16.6). '
  'Draagt het plafond op de AANVOER van concepten, want versturen doet de mens zelf.';

-- ── 4. Het logboek ─────────────────────────────────────────────────────────
create table if not exists public.sales_events (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid references public.sales_companies (id) on delete cascade,
  opportunity_id uuid references public.sales_opportunities (id) on delete set null,
  outreach_id    uuid references public.sales_outreach (id) on delete cascade,
  market_id      uuid references public.sales_markets (id) on delete set null,
  kind           text not null,
  van_status     text,
  naar_status    text,
  actor_user_id  uuid references auth.users (id),
  detail         jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists sales_events_outreach_idx
  on public.sales_events (outreach_id, created_at);

create index if not exists sales_events_tijd_idx
  on public.sales_events (created_at desc);

comment on table public.sales_events is
  'Elke statuswijziging, toewijzing en notitie als eigen rij (plan 7.4). De bron '
  'voor de trechter uit hoofdstuk 18 en de leerlus uit hoofdstuk 19.';

-- ── 5. Het bedrijf onthoudt zijn afwijzing ─────────────────────────────────
--
-- De score zet een opportunity op NUL bij een afwijzing binnen twaalf maanden
-- (plan 13.1). Dat vraagt één datum op het bedrijf: zoeken door de outreach van
-- alle markten heen zou bij elke score-berekening een join kosten, en die
-- berekening draait per bedrijf per ronde.
alter table public.sales_companies
  add column if not exists last_rejected_at timestamptz;

comment on column public.sales_companies.last_rejected_at is
  'Wanneer dit bedrijf voor het laatst nee zei (plan 13.1). Binnen twaalf maanden '
  'zet dat de opportunityscore op nul in plaats van hem te verlagen.';

-- ── 6. RLS: select-only, alleen voor sales ─────────────────────────────────
alter table public.sales_contacts enable row level security;
drop policy if exists sales_contacts_select_sales on public.sales_contacts;
create policy sales_contacts_select_sales on public.sales_contacts
  for select to authenticated using (public.is_sales());

alter table public.sales_outreach enable row level security;
drop policy if exists sales_outreach_select_sales on public.sales_outreach;
create policy sales_outreach_select_sales on public.sales_outreach
  for select to authenticated using (public.is_sales());

alter table public.sales_send_stats enable row level security;
drop policy if exists sales_send_stats_select_sales on public.sales_send_stats;
create policy sales_send_stats_select_sales on public.sales_send_stats
  for select to authenticated using (public.is_sales());

alter table public.sales_events enable row level security;
drop policy if exists sales_events_select_sales on public.sales_events;
create policy sales_events_select_sales on public.sales_events
  for select to authenticated using (public.is_sales());
