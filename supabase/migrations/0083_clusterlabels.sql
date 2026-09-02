-- ═══════════════════════════════════════════════════════════════════════════
-- 0083 — Labels op clusters, en de prullenbak die er al lag
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ── WAAROM EEN TABEL EN GEEN TEKSTKOLOM ────────────────────────────────────
--
-- Een label is bedoeld om te groeperen: een merk met dertig clusters wil ze op
-- onderwerp bij elkaar zien staan. Een vrije tekstkolom op `analyses` doet dat
-- niet betrouwbaar. "Onderhoud", "onderhoud" en "Onderhoud " zijn dan drie
-- groepen in het uitklapmenu, terwijl de gebruiker er één bedoelde, en een
-- label hernoemen zou een update over alle clusters heen vragen.
--
-- Vandaar één rij per label, per merk. De unieke index op de kleine letters van
-- de naam is het deterministische vangnet uit conventie 1: het formulier
-- normaliseert de naam al, maar twee tabbladen die tegelijk hetzelfde label
-- aanmaken komen alleen hier tot stilstand.
--
-- ── PER MERK EN NIET PER ACCOUNT ───────────────────────────────────────────
--
-- De labels van "Van der Valk" zeggen niets over het volgende merk in hetzelfde
-- account, en een keuzelijst die labels van andere merken toont is precies het
-- soort lek dat `loadBrandWork()` overal elders juist dichthoudt.
--
-- ── DE PRULLENBAK IS `archived_at` (0044) ──────────────────────────────────
--
-- Deze migratie voegt daar niets aan toe, en dat is de conclusie en geen
-- omissie. `analyses.archived_at` bestaat sinds 0044, `lib/archive.ts` houdt
-- gearchiveerde clusters uit elke lijst, en `/api/cron/tracking` slaat ze over,
-- dus de metingen stoppen per definitie zodra een cluster in de prullenbak
-- gaat. Wat ontbrak was niet de kolom maar de knop.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.cluster_labels (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.cluster_labels is
  'Onderwerpgroep boven de clusters van één merk. Puur ordening: het label '
  'stuurt geen enkele pijplijnstap aan en gaat nooit mee de prompt in.';

-- Twee keer hetzelfde label onder één merk levert twee groepen op waar de
-- gebruiker er één bedoelde. Op kleine letters, want "Onderhoud" en "onderhoud"
-- zijn voor een mens hetzelfde label.
create unique index if not exists cluster_labels_unique_name_idx
  on public.cluster_labels (profile_id, lower(name));

create index if not exists cluster_labels_profile_idx
  on public.cluster_labels (profile_id, name);

drop trigger if exists cluster_labels_set_updated_at on public.cluster_labels;
create trigger cluster_labels_set_updated_at
  before update on public.cluster_labels
  for each row execute function public.set_updated_at();

-- `on delete set null`: een label weggooien mag nooit een cluster meenemen.
-- Het cluster draagt maanden meetdata, het label draagt een woord.
alter table public.analyses
  add column if not exists label_id uuid references public.cluster_labels (id) on delete set null;

comment on column public.analyses.label_id is
  'Het label waaronder dit cluster in het overzicht staat (0083). Null = geen '
  'label, en dat is een geldige stand: labels zijn optioneel.';

-- Het overzicht vraagt altijd om de niet-gearchiveerde clusters van één merk,
-- gefilterd op label. Dezelfde vorm als `analyses_active_idx` uit 0044.
create index if not exists analyses_label_idx
  on public.analyses (profile_id, label_id)
  where archived_at is null;

-- ── RLS ────────────────────────────────────────────────────────────────────
--
-- Eén selectpolicy op `readable_profile_ids()` (0049, verruimd in 0056), en dus
-- niet de drie losse lagen van 0040. Die functie is al de ene plek die "welke
-- merken mag jij zien" beantwoordt: eigen account, eigen historische profiel,
-- of staf. Hem hier herhalen zou een tweede antwoord op dezelfde vraag zijn.
--
-- Schrijven loopt via de service-role met een expliciete eigenaarscontrole in
-- de route (conventie 6), dus er is bewust geen insert- of updatepolicy.
alter table public.cluster_labels enable row level security;

drop policy if exists cluster_labels_select on public.cluster_labels;
create policy cluster_labels_select on public.cluster_labels
  for select using (profile_id in (select public.readable_profile_ids()));

-- Controle: de tabel staat er, de kolom staat er, en de koppeling wist geen
-- clusters als een label verdwijnt.
select
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_name = 'cluster_labels') as tabel,
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'analyses' and column_name = 'label_id') as kolom;
