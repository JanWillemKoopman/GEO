-- 0076: elk onderwerp draagt zichtbaar zijn herkomst
--
-- ── WAT DIT OPLOST ─────────────────────────────────────────────────────────
--
-- docs/optimalisatielab-orbit-engine.md, werkpakket A §3.5: "Elk voorstel
-- draagt zijn herkomst. Uit het aanbod, uit het gesprek, of uit een combinatie.
-- Zonder die regel weet je bij ronde drie niet meer waarom iets er staat."
--
-- Elk onderwerp komt altijd uit het aanbod (`offering_ids` is nooit leeg bij
-- een AI-voorstel), dus de vraag is niet OF het aanbod erin zit maar OF het
-- gesprek er ook bij zat toen dit onderwerp werd voorgesteld. Dat weet alleen
-- `propose-topics.ts` op het moment van aanmaken; achteraf valt het niet meer
-- af te leiden (`stage` verandert later, `client_note` kan leeg blijven ook al
-- was er een gesprek).
--
-- ── WAAROM NULL VOOR BESTAANDE RIJEN GOED GENOEG IS ─────────────────────────
--
-- Additief (conventie 4). Onderwerpen van vóór vandaag kregen geen herkomst
-- bijgehouden; met terugwerkende kracht raden zou een schijnzekerheid
-- toevoegen ("uit het aanbod" alsof dat vaststaat) in plaats van hem weg te
-- laten. Het scherm toont bij `null` geen herkomstregel, precies zoals bij een
-- ontbrekende potentiescore.
alter table public.profile_topics
  add column if not exists origin text;

alter table public.profile_topics
  drop constraint if exists profile_topics_origin_check,
  add  constraint profile_topics_origin_check
       check (origin is null or origin in ('aanbod', 'aanbod_en_gesprek'));

comment on column public.profile_topics.origin is
  'Herkomst op het moment van voorstellen (0076): aanbod = alleen de aanbodboom, '
  'aanbod_en_gesprek = de aanbodboom plus het strategisch gesprek. Null voor '
  'onderwerpen van vóór deze migratie.';
