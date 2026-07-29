-- ============================================================================
-- 20260729_01 — Schema voor de contentbriefing
-- ============================================================================
-- Hoort bij contentbriefing.md §10.
-- Volledig ADDITIEF: geen bestaande kolom wordt gewijzigd of verwijderd, dus
-- veilig toe te passen terwijl de huidige app-code ongewijzigd blijft draaien.
-- ============================================================================

begin;

-- ── 1. fact_requests: van losse open vraag naar gestructureerde briefingvraag ──
-- Bestaande kolommen (question, reason, answer, status, ...) blijven ongemoeid.

alter table public.fact_requests
  add column if not exists scope             text not null default 'analyse',
  add column if not exists content_piece_ids uuid[] not null default '{}',
  add column if not exists kind              text not null default 'aanvulling',
  add column if not exists answer_type       text not null default 'tekst_kort',
  add column if not exists options           text[] not null default '{}',
  add column if not exists suggested_answer  text,
  add column if not exists required          boolean not null default false,
  add column if not exists claim_key         text,
  add column if not exists fact_ref          text,
  add column if not exists verify_after      date,
  add column if not exists raw_json          jsonb;

alter table public.fact_requests
  drop constraint if exists fact_requests_scope_check,
  add  constraint fact_requests_scope_check
       check (scope in ('merk','analyse','pagina'));

alter table public.fact_requests
  drop constraint if exists fact_requests_kind_check,
  add  constraint fact_requests_kind_check
       check (kind in ('verificatie','aanvulling','onderscheid',
                       'bewijs','praktisch','grenzen'));

alter table public.fact_requests
  drop constraint if exists fact_requests_answer_type_check,
  add  constraint fact_requests_answer_type_check
       check (answer_type in ('ja_nee','bedrag','getal','tekst_kort',
                              'tekst_lang','keuze','url','lijst'));

-- 'verlopen' toevoegen aan de bestaande status-check (veroudering, §7).
alter table public.fact_requests
  drop constraint if exists fact_requests_status_check,
  add  constraint fact_requests_status_check
       check (status in ('open','beantwoord','overgeslagen','verlopen'));

comment on column public.fact_requests.scope is
  'merk = herbruikbaar over alle analyses; analyse = dit onderwerp; pagina = dit ene content_piece.';
comment on column public.fact_requests.claim_key is
  'Genormaliseerde claim-tekst; ontdubbelt dezelfde vraag over meerdere pagina''s (contentbriefing.md §3.4).';
comment on column public.fact_requests.fact_ref is
  'F-nummer op de feitenkaart waarmee het antwoord de content in gaat (contentbriefing.md §9).';
comment on column public.fact_requests.verify_after is
  'Datum waarna dit feit opnieuw bevestigd moet worden. Standaard 6 maanden voor bedragen/voorwaarden.';

-- Eén open vraag per claim per analyse — voorkomt dat een tweede batch
-- dezelfde vraag opnieuw stelt.
create unique index if not exists fact_requests_open_claim_uniq
  on public.fact_requests (coalesce(analysis_id, profile_id), claim_key)
  where status = 'open' and claim_key is not null;

create index if not exists fact_requests_open_idx
  on public.fact_requests (profile_id, status) where status = 'open';


-- ── 2. content_pieces: traceerbaarheid + briefing-status ──────────────────────

alter table public.content_pieces
  add column if not exists claims_json             jsonb,
  add column if not exists briefing_snapshot_json  jsonb,
  add column if not exists brief_instruction       text,
  add column if not exists source_coverage         numeric;

comment on column public.content_pieces.claims_json is
  'Per bewering in de tekst het F-nummer van de feitenkaart dat hem dekt (contentbriefing.md §9).';
comment on column public.content_pieces.briefing_snapshot_json is
  'De feitenkaart zoals gebruikt tijdens het schrijven. Bevroren, net als prompt_text_snapshot (abcplan.md §5).';
comment on column public.content_pieces.brief_instruction is
  'De oorspronkelijke opdracht uit het rapport ("Maak een pagina over..."). Gescheiden van title, die de daadwerkelijke paginakop is.';
comment on column public.content_pieces.source_coverage is
  'Percentage beweringen dat herleidbaar is tot een bron. Vervangt de niet-discriminerende geo_score als kwaliteitsmaat.';

-- ── 3. entities: expliciet onderscheid tussen concurrent en eigen merk/product ─
-- Voorkomt dat het merk dat de klant zelf voert (Škoda) als concurrent telt.

alter table public.entities
  add column if not exists entity_role text not null default 'concurrent',
  add column if not exists exclude_reason text;

alter table public.entities
  drop constraint if exists entities_entity_role_check,
  add  constraint entities_entity_role_check
       check (entity_role in ('concurrent','eigen_merk','eigen_product',
                              'brancheorganisatie','vergelijker','niet_relevant'));

comment on column public.entities.entity_role is
  'Alleen entity_role = ''concurrent'' telt mee in share_of_voice en competitor_breakdown.';

commit;


-- ── 4. Nieuwe content-status, buiten de transactie ───────────────────────────
-- ALTER TYPE ... ADD VALUE mag sinds PG12 binnen een transactie, maar de nieuwe
-- waarde is daarbinnen nog niet bruikbaar. Daarom apart, ná de commit hierboven.
-- 'briefing' = door de klant gekozen, wacht op antwoorden uit de contentbriefing.

alter type public.content_status add value if not exists 'briefing' before 'draft';
