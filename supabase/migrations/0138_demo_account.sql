-- 0138: een merk kan een voorbeeldaccount zijn (1 oktober 2026)
--
-- Het demo-account RunX (`docs/tasks/demo-account-runx.md`) wordt ingeladen in
-- plaats van door de pijplijn gemaakt, en mag daarna nooit meer geld kosten.
-- Zonder deze vlag plant de maandcron op de 1e acht clusters in (ongeveer
-- 8 × $0,82 = $6,50 per maand) en schrijft de ochtendronde de ingeplande
-- pagina's van de komende tien dagen echt.
--
-- Wie de vlag leest staat in `lib/demo.ts`: de maandcron, de ochtendronde, de
-- Search Console-ophaling, de budgetcontrole per merk en de werker.
--
-- Additief en idempotent (conventie 4).

alter table public.profiles
  add column if not exists is_demo boolean not null default false;

comment on column public.profiles.is_demo is
  'Voorbeeldaccount: ingeladen data, nooit meten, schrijven of ophalen. Zie lib/demo.ts.';

-- Gedeeltelijke index: er is hooguit een handvol demo-merken, en elke cron
-- vraagt "welke merken zijn demo" vóór hij werk inplant.
create index if not exists profiles_is_demo_idx on public.profiles (id) where is_demo;
