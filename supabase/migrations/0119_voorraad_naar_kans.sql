-- 0119: een kaart in de voorraad verwijst naar zijn kans
-- (docs/tasks/van-pijplijn-naar-kennissysteem.md, N2, §6.2)
--
-- Waarom. Sinds N2 schrijft het rapport per aanbeveling een kans (`kansen`,
-- migratie 0118), en maakt `syncBacklog()` de voorraad uit die kansen. Een kaart
-- wees tot nu toe met `source_ref` ("<rapport-id>#<volgnummer>") naar een plek in
-- de JSON van een rapport; nu wijst hij naar het object zelf. `source_ref` blijft
-- staan en blijft gevuld: hij is gelijk aan `kansen.sleutel`, en daarmee vindt
-- een kaart die er al stond zijn kans terug.
--
-- SET NULL en niet CASCADE: een kaart met werk eraan (een maand, een tekst) mag
-- nooit verdwijnen omdat er iets met zijn kans gebeurde (conventie 8, en de
-- regel bovenaan `lib/plan-backlog-data.ts`: er wordt nooit iets verwijderd).
--
-- Additief en idempotent (conventie 4).

alter table public.planned_pages
  add column if not exists kans_id uuid references public.kansen (id) on delete set null;

create index if not exists planned_pages_kans_idx
  on public.planned_pages (kans_id)
  where kans_id is not null;

comment on column public.planned_pages.kans_id is
  'De kans waar deze kaart uit komt (N2). source_ref blijft gelijk aan kansen.sleutel.';
