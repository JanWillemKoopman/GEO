-- ═══════════════════════════════════════════════════════════════════════════
-- 0041 — Multi-engine (docs/tasks/onboarding-2.0.md, blok E)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT ER AL LAG
--
-- `tracking_runs.engine` staat sinds migratie 0001 in de database met default
-- 'openai', en `visibility_scores.per_engine_json` staat er sinds dezelfde
-- migratie ongebruikt bij. De hele meetlaag draait op één aanbieder; de eigen
-- procesanalyse noemt dat "zowel het grootste productgat als het grootste
-- concurrentierisico". Deze migratie maakt de database er daadwerkelijk klaar
-- voor.
--
-- ⚠️ DE INDEX HIERONDER IS HET HELE PUNT VAN DEZE MIGRATIE
--
-- De meting is idempotent op (analyse, prompt, periode, herhaling) — zie
-- `measureOnePrompt()` in lib/pipeline/measure.ts, dat vóór elke dure aanroep
-- controleert of er al een rij staat. Die controle kent de engine niet.
--
-- Zonder de engine in die sleutel ziet een Gemini-meting de OpenAI-meting van
-- dezelfde vraag als "al gedaan" en slaat hij zichzelf over. Er komt dan geen
-- foutmelding: de tweede engine meet gewoon nooit, en de score per engine blijft
-- leeg terwijl alles groen lijkt. Precies het soort stille degradatie dat dit
-- project drie keer eerder heeft gekost.
--
-- ── WAT NIET VERANDERT ─────────────────────────────────────────────────────
--
-- Halte 3b (het beoordelen van het antwoord) blijft op één vast model, ongeacht
-- welke engine het antwoord produceerde. Zouden we ook de beoordelaar laten
-- meewisselen, dan meten we het verschil tussen twee BEOORDELAARS in plaats van
-- tussen twee ENGINES — en is geen enkele vergelijking tussen ChatGPT en Gemini
-- nog iets waard. `lib/openai/mention-prompt.ts` en scripts/eval-mention.ts
-- blijven daarom waar ze zijn.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Engine op het kostenlogboek ─────────────────────────────────────────
-- Zonder dit is niet uit te rekenen wat de tweede engine kost, en dat is de
-- enige beslissing in dit traject die de maandlasten per klant structureel
-- verhoogt (~$0,40 → ~$0,80 per meetronde, nog niet nagerekend).
alter table public.ai_calls
  add column if not exists engine text not null default 'openai';
create index if not exists ai_calls_engine_idx on public.ai_calls (engine, kind);

-- ── 2. Welke engines draaien er voor dit merk? ─────────────────────────────
-- Per profiel en niet globaal: een klant kan op één engine gemeten worden en
-- een ander op twee, bijvoorbeeld omdat het pakket verschilt. Default is de
-- huidige situatie, dus bestaande profielen veranderen niet.
alter table public.profiles
  add column if not exists engines_enabled text[] not null default '{openai}';

comment on column public.profiles.engines_enabled is
  'Welke engines meedoen in meting en kennistest. De code snijdt dit altijd met '
  'de engines waarvoor daadwerkelijk een API-sleutel bestaat (lib/engines/'
  'registry.ts): staat hier gemini zonder sleutel, dan wordt hij overgeslagen '
  'en gelogd in plaats van dat de meting faalt.';

-- ── 3. De idempotentiesleutel van een meting ───────────────────────────────
--
-- Eerst kijken of de bestaande rijen hem niet schenden. Deze migratie mag
-- NIET stilzwijgend slagen op een database met dubbele metingen: dan zou de
-- index ontbreken en de bescherming die hij moet bieden er niet zijn.
do $$
declare
  duplicates integer;
begin
  select count(*) into duplicates from (
    select 1
    from public.tracking_runs
    group by analysis_id, prompt_id, week_no, engine, repeat_index, purpose
    having count(*) > 1
  ) d;

  if duplicates > 0 then
    raise exception
      'Kan de idempotentie-index niet aanmaken: % combinatie(s) van '
      '(analyse, prompt, week, engine, herhaling, doel) komen meer dan één keer '
      'voor in tracking_runs. Ruim die eerst op — een index afdwingen zou '
      'meetdata weggooien.', duplicates;
  end if;
end
$$;

-- `prompt_id` mag null zijn (on delete set null in 0001). Postgres beschouwt
-- twee nulls als verschillend, dus rijen zonder prompt vallen buiten de
-- beperking. Dat is precies goed: een meting waarvan de vraag verwijderd is,
-- hoort niet meer tegen nieuwe metingen aan te botsen.
create unique index if not exists tracking_runs_idem_idx
  on public.tracking_runs (analysis_id, prompt_id, week_no, engine, repeat_index, purpose);

-- ── 4. De LLM-kennisbasislijn ──────────────────────────────────────────────
--
-- Hoort bij het profiel en niet bij een analyse: dit gaat over het MERK ("kent
-- ChatGPT je?"), niet over één onderwerp. Per engine één set.
create table if not exists public.profile_llm_baseline (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles (id) on delete cascade,
  engine        text not null,
  -- kent | klopt | citeert | verwarring | categorie — zie blok B fase 3
  block         text not null,
  question      text not null,
  raw_response  text,
  -- Het DETERMINISTISCHE oordeel, in code geveld tegen de gecrawlde feiten.
  -- Bewust niet wat het model over zichzelf zei: dat bleek in dit project drie
  -- keer onbetrouwbaar (content-gate, validate-claims, isSupported).
  verdict_json  jsonb,
  web_search    boolean not null default false,
  model_used    text,
  cost_usd      numeric(10, 6),
  measured_at   timestamptz not null default now()
);
create index if not exists profile_llm_baseline_profile_idx
  on public.profile_llm_baseline (profile_id, engine, block);

-- Idempotent per (profiel, engine, blok, vraag): een retry na een mislukte
-- taak mag geen tweede betaalde meting opleveren (conventie 9).
create unique index if not exists profile_llm_baseline_idem_idx
  on public.profile_llm_baseline (profile_id, engine, block, md5(question));

alter table public.profile_llm_baseline enable row level security;

drop policy if exists "profile_llm_baseline_select_own" on public.profile_llm_baseline;
create policy "profile_llm_baseline_select_own"
  on public.profile_llm_baseline for select
  using (exists (
    select 1 from public.profiles p
    where p.id = profile_llm_baseline.profile_id and p.user_id = (select auth.uid())
  ));

drop policy if exists "profile_llm_baseline_select_staff" on public.profile_llm_baseline;
create policy "profile_llm_baseline_select_staff"
  on public.profile_llm_baseline for select
  using (public.is_staff());
