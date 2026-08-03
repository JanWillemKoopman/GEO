-- ═══════════════════════════════════════════════════════════════════════════
-- 0039 — Profielverdieping (docs/tasks/onboarding-2.0.md, blok B en C)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT HIER MIS WAS
--
-- Het profielonderzoek was één AI-aanroep op `crawlSite()`, en die levert de
-- HOMEPAGE, afgekapt op 6000 tekens (`lib/crawler.ts`, MAX_CHARS). De
-- content-inventaris van 60 pagina's draaide er parallel aan en werd pas ná de
-- aanroep opgeslagen — die 60 pagina's kwamen het onderzoek dus nooit in.
--
-- Het resultaat paste in tien kolommen op `profiles`: branche, producten,
-- tone-of-voice, persona's, concurrenten. Voor de vraag die de app straks moet
-- beantwoorden ("welke diensten levert deze klant precies, aan wie, waar, en
-- tegen welke prijs") is dat niet genoeg.
--
-- WAAROM DEZE VORM EN NIET VEERTIG KOLOMMEN
--
-- Een uitgebreid profiel als kolommen op `profiles` zetten betekent een migratie
-- per nieuw onderzoeksonderwerp. Drie tabellen in plaats daarvan:
--
--   • profile_facets       — één rij per onderzoeksfase. Nieuw facet = nieuwe
--                            rij, geen migratie.
--   • profile_offerings    — het aanbod als BOOM, want een dienst heeft
--                            subdiensten en een categorie heeft subcategorieën.
--                            Dit is ook wat de core topics straks voedt.
--   • profile_field_sources— herkomst per veld. Zie hieronder.
--
-- DE HERKOMSTTABEL IS HET BELANGRIJKSTE STUK
--
-- Tot nu gold "klant leidend, AI vult aan" (`prepare-profile.ts`), en dat werkte
-- omdat de klant een wizard invulde: wat er stond, had een mens getypt. Vanaf nu
-- vult de klant drie velden in en doet de pijplijn de rest. Zonder registratie
-- van herkomst is na afloop niet meer te zien of "dienstverlener in Tilburg"
-- van de klant komt of van een model dat het goed gokte.
--
-- Dat is niet cosmetisch. Het onderzoek moet HERHAALBAAR zijn (een klant meldt
-- in het gesprek dat de site vernieuwd is), en een tweede ronde mag dan niet de
-- correcties van het gesprek overschrijven. Met deze tabel is die regel
-- afdwingbaar in code in plaats van een instructie in een prompt — conventie 1.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Onderzoeksfacetten ──────────────────────────────────────────────────
create table if not exists public.profile_facets (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  -- identiteit | aanbod | markt | llm_kennis | techniek | synthese
  facet         text not null,
  summary       text,
  -- Volledige ruwe modeloutput náást de uitgesplitste kolommen (conventie 8).
  raw_json      jsonb,
  -- 0.00–1.00. NULL betekent "niet vast te stellen" en is een echt antwoord;
  -- 0.00 zou "zeker onjuist" betekenen (conventie 3).
  confidence    numeric(3, 2),
  sources       text[] not null default '{}',
  model_used    text,
  engine        text not null default 'openai',
  cost_usd      numeric(10, 6),
  researched_at timestamptz not null default now(),
  unique (profile_id, facet)
);
create index if not exists profile_facets_profile_idx on public.profile_facets (profile_id);

comment on column public.profile_facets.researched_at is
  'Per facet, niet per profiel: een herhaalronde ververst alleen wat verlopen is.';

-- ── 2. Het aanbod als boom ─────────────────────────────────────────────────
--
-- Waarom een boom en geen text[]: bij een dienstverlener hangt "sportmassage"
-- onder "massage", en bij een retailer hangt "wasmachines" onder "witgoed". Die
-- structuur is precies wat een core topic straks nodig heeft — een topic op het
-- niveau van de hele categorie is te breed om te meten, één op productniveau te
-- smal.
create table if not exists public.profile_offerings (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references public.profiles (id) on delete cascade,
  parent_id        uuid references public.profile_offerings (id) on delete cascade,
  -- dienst | product | categorie | merk | vestiging
  kind             text not null,
  name             text not null,
  description      text,
  audience         text,
  price_indication text,
  -- Herleidbaarheid is hier geen extraatje. Zonder klant-input is een
  -- aanbodregel zonder bron niet te controleren en dus niet te corrigeren.
  evidence_url     text,
  evidence_quote   text,
  confidence       numeric(3, 2),
  -- ai | klant | gesprek
  source           text not null default 'ai',
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists profile_offerings_profile_idx on public.profile_offerings (profile_id, sort_order);
create index if not exists profile_offerings_parent_idx on public.profile_offerings (parent_id);

alter table public.profile_offerings
  drop constraint if exists profile_offerings_kind_check,
  add  constraint profile_offerings_kind_check
       check (kind in ('dienst', 'product', 'categorie', 'merk', 'vestiging'));

alter table public.profile_offerings
  drop constraint if exists profile_offerings_source_check,
  add  constraint profile_offerings_source_check
       check (source in ('ai', 'klant', 'gesprek'));

-- ── 3. Herkomst per veld ───────────────────────────────────────────────────
create table if not exists public.profile_field_sources (
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  -- Kolomnaam in `profiles` (bv. 'industry'), of 'offering:<uuid>'.
  field          text not null,
  -- ai | klant | gesprek. Alleen 'ai' mag door een volgende ronde overschreven.
  source         text not null,
  confidence     numeric(3, 2),
  evidence_url   text,
  evidence_quote text,
  set_by         uuid references auth.users (id),
  set_at         timestamptz not null default now(),
  primary key (profile_id, field)
);

alter table public.profile_field_sources
  drop constraint if exists profile_field_sources_source_check,
  add  constraint profile_field_sources_source_check
       check (source in ('ai', 'klant', 'gesprek'));

comment on table public.profile_field_sources is
  'Wie heeft dit veld het laatst gezet, met welke zekerheid en op welk bewijs. '
  'Maakt "een mens wint van een model" afdwingbaar in lib/pipeline/field-merge.ts '
  'in plaats van hoopvol in een promptinstructie.';

-- ── 4. Extra kolommen op profiles ──────────────────────────────────────────
--
-- `inventory_quality_json` is waar migratie 0033 voor gereserveerd stond (R6.2,
-- docs/tasks/r6-inventaris-en-bronnen.md). Die reservering vervalt hiermee: de
-- inventariskwaliteit wordt fase 0 van de nieuwe onboarding, niet een losse
-- ronde. Bol had 1 pagina in de inventaris en HEMA 40 productpagina's; in beide
-- gevallen degradeerde het rapport zonder één foutmelding.
alter table public.profiles
  add column if not exists inventory_quality_json jsonb,
  add column if not exists onboarding_budget_usd  numeric(10, 6) not null default 2.15,
  add column if not exists deep_research_at       timestamptz;

comment on column public.profiles.onboarding_budget_usd is
  'Kostenplafond voor het onboarding-onderzoek. $2,15 ≈ €2. De poort telt '
  'ai_calls op profile_id; loopt het budget op, dan wordt een fase overgeslagen '
  'en dat wordt vastgelegd — nooit stil gedegradeerd.';

-- ── 5. RLS: eigen profiel + staf ───────────────────────────────────────────
alter table public.profile_facets        enable row level security;
alter table public.profile_offerings     enable row level security;
alter table public.profile_field_sources enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['profile_facets', 'profile_offerings', 'profile_field_sources']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format($f$
      create policy %I on public.%I for select
      using (exists (
        select 1 from public.profiles p
        where p.id = %I.profile_id and p.user_id = (select auth.uid())
      ))
    $f$, t || '_select_own', t, t);

    execute format('drop policy if exists %I on public.%I', t || '_select_staff', t);
    execute format(
      'create policy %I on public.%I for select using (public.is_staff())',
      t || '_select_staff', t
    );
  end loop;
end
$$;

-- ── 6. updated_at-trigger op de aanbodboom ─────────────────────────────────
drop trigger if exists profile_offerings_set_updated_at on public.profile_offerings;
create trigger profile_offerings_set_updated_at
  before update on public.profile_offerings
  for each row execute function public.set_updated_at();
