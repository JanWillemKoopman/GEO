-- 0111: een ontdekkingsronde gaat over één thema
--
-- Besluit van de eigenaar (23 september 2026): wie een ronde start, geeft eerst
-- een productcategorie of thema op ("private lease", "onderhoud"). De ronde
-- zoekt dan gericht binnen dat thema in plaats van over het hele aanbod. De
-- eerste ronde op Van den Udenhout liep over 36 diensten tegelijk; de 181
-- passende zoektermen gingen over alles van trekhaken tot laadpalen.
--
-- `null` voor rondes van vóór deze migratie: die hadden geen thema. De route
-- (`app/api/profiles/[id]/discovery/route.ts`) eist er voortaan een.
--
-- Additief en idempotent.

alter table public.cluster_discovery_runs
  add column if not exists theme text;

comment on column public.cluster_discovery_runs.theme is
  'Productcategorie of thema van de ronde, opgegeven door de consultant. NULL = ronde van vóór 0111. Zie migratie 0111.';
