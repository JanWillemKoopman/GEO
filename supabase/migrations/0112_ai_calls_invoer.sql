-- 0112: elke AI-aanroep bewaart ook wat erin ging
--
-- ── WAT DIT OPLOST ──────────────────────────────────────────────────────────
--
-- `ai_calls` bewaarde het model, de tokens, de kosten en (sinds 1 september
-- 2026) het antwoord, maar niet de opdracht. Achteraf was dus te lezen WAT een
-- stap opleverde, niet WAAROM: welke systeemopdracht gold en welke gegevens er
-- in de gebruikersopdracht zaten. Besluit van de eigenaar (23 september 2026):
-- altijd bewaren. Zie `lib/openai/input-capture.ts` en
-- `docs/tasks/kwaliteitsdoorlichting-pijplijn.md` §4, stap 0.1.
--
-- Opslag, gemeten 23 september 2026: de tabel was 5,5 MB; een schrijfopdracht
-- is ongeveer 90 KB, een meetvraag een paar honderd bytes.
--
-- `prompt_hash` is een korte SHA-256 van alleen de systeemopdracht. Verschilt
-- hij tussen twee rondes bij dezelfde `kind`, dan is de prompt in de code
-- gewijzigd.
--
-- Additief en idempotent (conventie 4). Rijen van vóór deze migratie houden
-- beide velden leeg: onbekend is beter dan geraden (conventie 3). Geen nieuwe
-- rechten: `ai_calls` blijft deny-all voor de client (migratie 0012).

alter table public.ai_calls
  add column if not exists input_json jsonb,
  add column if not exists prompt_hash text;

create index if not exists ai_calls_prompt_hash_idx on public.ai_calls (kind, prompt_hash);

comment on column public.ai_calls.input_json is
  '(0112) Wat er naar het model ging: system, user, schemaName, work, reasoningEffort, temperature, webSearch, request. NULL = aanroep van vóór 0112.';
comment on column public.ai_calls.prompt_hash is
  '(0112) Eerste 16 hextekens van de SHA-256 van de systeemopdracht. Zelfde kind met andere hash = andere promptversie.';
