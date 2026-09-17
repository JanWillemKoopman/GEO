-- ═══════════════════════════════════════════════════════════════════════════
-- ORBIT ENGINE: het verschil tussen een gok en een meting, zichtbaar in het
-- datamodel
-- Migratie 0106 (docs/tasks/zoekdata-in-de-keten.md, blok B).
--
-- Zonder deze kolom laat het scherm ooit een gok voor een meting doorgaan.
-- Dat is de belangrijkste van de drie migraties in blok B: de andere twee
-- (0104, 0105) leveren alleen data, deze zegt waar de klant op mag
-- vertrouwen.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── profile_topics: het absolute maandvolume naast de herkalibreerde index ──
alter table public.profile_topics
  add column if not exists search_volume_absolute integer,
  add column if not exists search_volume_source text not null default 'geschat';

comment on column public.profile_topics.search_volume_absolute is
  'Het echte maandelijkse zoekvolume van de zwaarste zoekterm achter dit onderwerp (lib/search-demand/), uit keyword_demand. Null = nog geen match gevonden of geen leverancier gekoppeld.';
comment on column public.profile_topics.search_volume_source is
  '"geschat" (het model) of "gemeten" (een echte leverancier). search_volume_index blijft de 0-100 schaal die het scherm toont, deze kolom zegt of dat getal op search_volume_absolute verankerd is.';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profile_topics_volume_source_check'
  ) then
    alter table public.profile_topics
      add constraint profile_topics_volume_source_check
      check (search_volume_source in ('geschat', 'gemeten'));
  end if;
end $$;

-- ── prompts: 'gemeten' als derde waarde naast 'geschat' en 'klant' ──────────
--
-- Een constraint vervangen is geen `drop` van data (conventie 4): geen rij en
-- geen kolom verdwijnt, alleen de lijst toegestane waarden groeit.
alter table public.prompts drop constraint if exists prompts_volume_source_check;
alter table public.prompts
  add constraint prompts_volume_source_check
  check (volume_source in ('geschat', 'klant', 'gemeten'));
