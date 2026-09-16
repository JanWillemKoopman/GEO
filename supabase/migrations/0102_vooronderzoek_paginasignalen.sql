-- 0102: de titel/meta-signalen van het vooronderzoek bewaren, over meerdere taakrondes heen
--
-- ── WAAROM DIT ER MOEST KOMEN ────────────────────────────────────────────────
--
-- Migratie 0101 gaf `crawlInventory()` een lichte titel+meta-doorgang, maar die
-- draaide alleen bij een latere "Vernieuw inventaris"-ronde, tot 600 pagina's,
-- binnen één taakaanroep. De vraag die daarna kwam: doe dit VOORDAT de eerste
-- diepe crawl (fase 0, `profile_discover`) kiest welke 150 pagina's hij echt
-- volledig leest, en doe het over tot 1000 pagina's. Dat past niet meer in één
-- taakaanroep (platformlimiet 300s, `app/api/cron/worker/route.ts`), dus de
-- nieuwe taaksoort `profile_light_scan` plant zichzelf een paar keer opnieuw in
-- totdat hij klaar is (`lib/pipeline/light-scan.ts`).
--
-- Die zelf-herplanning heeft een plek nodig om tussen de rondes door te
-- bewaren wat al gescand is: zonder een bewaarplek zou elke ronde met een lege
-- lei beginnen en zou de taak nooit klaar zijn zolang er ook maar één pagina
-- steeds faalt te bereiken (zie het commentaar bij `crawlHeads()` in
-- lib/crawler.ts over waarom een mislukte pagina ook als "geprobeerd" telt).
--
-- ── DE TABEL ─────────────────────────────────────────────────────────────────
--
-- Eén rij per (profiel, URL): titel en meta-description zoals de lichte
-- doorgang ze aantrof, of allebei `null` als de pagina niets opleverde (dat is
-- een echt gegeven: "geprobeerd, niets gevonden", geen "nog niet geprobeerd").
-- `lib/pipeline/discover.ts` leest deze tabel bij de eerste diepe crawl om
-- `scoreUrl()`/`selectUrls()` van signalen te voorzien.
--
-- Additief, geen backfill nodig: een profiel van vóór deze migratie heeft
-- gewoon geen rijen, en `discoverSite()` valt dan terug op het bestaande
-- pad-alleen-gedrag.

create table if not exists public.profile_page_signals (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  url          text not null,
  title        text,
  description  text,
  scanned_at   timestamptz not null default now(),
  unique (profile_id, url)
);

create index if not exists profile_page_signals_profile_id_idx
  on public.profile_page_signals (profile_id);

comment on table public.profile_page_signals is
  '(0102) Titel/meta-description per URL uit de lichte vooronderzoek-scan (profile_light_scan), vóór de eerste diepe crawl. Beide kolommen null = pagina geprobeerd, niets gevonden.';

-- ── RLS: zelfde patroon als profile_pages (migratie 0004/0005) ──────────────
alter table public.profile_page_signals enable row level security;

create policy "profile_page_signals_select_own"
  on public.profile_page_signals for select
  using (exists (
    select 1 from public.profiles p
    where p.id = profile_page_signals.profile_id and p.user_id = (select auth.uid())
  ));

-- Controle: de tabel en de RLS-policy bestaan.
select
  count(*) filter (where table_name = 'profile_page_signals') as heeft_tabel
from information_schema.tables
where table_schema = 'public';
