-- 0074: onderwerpen krijgen een fase: concept vóór het gesprek, definitief erna
--
-- ── WAT DIT OPLOST ─────────────────────────────────────────────────────────
--
-- Onderwerpen (`profile_topics`) ontstaan nu meteen nadat de aanbodboom er is,
-- ruim vóórdat het strategisch gesprek is gevoerd. Ze zijn op dat moment
-- meteen startbaar als meetronde. Dat betekent dat de duurste beslissing van
-- de hele pijplijn, welke onderwerpen het waard zijn om op te meten, valt
-- vóórdat de meest waardevolle informatie (het gesprek) er is.
-- Zie docs/optimalisatielab-orbit-engine.md, werkpakket A, §3.2.
--
-- ── WAAROM 'definitief' DE STANDAARD IS EN NIET 'concept' ───────────────────
--
-- Additief en niet-verstorend (conventie 4): elk onderwerp dat al bestaat is
-- door een klant of consultant al gezien, misschien al gestart. Een nieuwe
-- kolom die zulke rijen met terugwerkende kracht zou blokkeren, laat een
-- lopende klant vastlopen op een regel die pas vandaag is bedacht. Vanaf nu
-- geldt de nieuwe regel alleen voor onderwerpen die `lib/pipeline/propose-topics.ts`
-- vanaf vandaag voor het eerst aanmaakt: die zet expliciet 'concept' als er nog
-- geen gesprek vastligt.

alter table public.profile_topics
  add column if not exists stage text not null default 'definitief';

alter table public.profile_topics
  drop constraint if exists profile_topics_stage_check,
  add  constraint profile_topics_stage_check
       check (stage in ('concept', 'definitief'));

comment on column public.profile_topics.stage is
  'concept: voorgesteld vóór het strategisch gesprek, ter voorbereiding, niet '
  'te starten. definitief: te goedkeuren en te starten. Standaard definitief, '
  'zodat bestaand werk niet met terugwerkende kracht op slot gaat (0074).';
