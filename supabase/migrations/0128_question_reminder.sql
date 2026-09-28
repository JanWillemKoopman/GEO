-- 0128: een herinnering bij openstaande vragen (A5 van
-- docs/tasks/van-pijplijn-naar-kennissysteem.md, §9)
--
-- Waarom. Een pagina in status 'briefing' wacht op de antwoorden van de klant
-- (zie `content_pieces.status` in lib/types/database.ts) en schrijft anders
-- niet verder. Dezelfde vorm als `analyses.publish_reminder_sent_at`
-- (migratie 0020): één keer, niet zeurend, per analyse en niet per pagina,
-- want de klant krijgt één mail over zijn onderzoek en niet één per
-- briefing die erin blijft steken.
--
-- Additief en idempotent (conventie 4).

alter table public.analyses
  add column if not exists question_reminder_sent_at timestamptz;
