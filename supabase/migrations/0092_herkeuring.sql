-- Een HERKEURING: dezelfde tekst opnieuw beoordeeld, zonder herschrijven.
--
-- Waarom dit een eigen kolom is en geen extra rondenummer: een reparatieronde
-- betekent dat de tekst veranderd is, en de versiekeuze rekent daarop. Een
-- herkeuring verandert niets aan de tekst; hij zegt alleen dat het OORDEEL is
-- bijgesteld, bijvoorbeeld omdat een controle gerepareerd is (R0 en R0b,
-- 3 september 2026) of omdat de klant zijn eigen tekst heeft aangepast.
--
-- De unieke sleutel (content_piece_id, repair_round) blijft ongemoeid: een
-- herkeuring krijgt een eigen, opvolgend rondenummer en overschrijft dus nooit
-- de geschiedenis van een echte reparatieronde. Zonder die regel zou de eerste
-- herkeuring het bewijs uitwissen dat de pagina ooit tegengehouden werd.
alter table content_quality_runs
  add column if not exists herkeuring boolean not null default false;

comment on column content_quality_runs.herkeuring is
  'true = dezelfde tekst opnieuw beoordeeld, geen reparatieronde. De versiekeuze slaat deze rijen over.';

create index if not exists content_quality_runs_herkeuring_idx
  on content_quality_runs (content_piece_id, herkeuring);
