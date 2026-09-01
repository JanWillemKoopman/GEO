-- 0080: hoeveel, hoe vaak en hoe rustig ORBIT ENGINE een site crawlt
--
-- ── WAT DIT OPLOST ─────────────────────────────────────────────────────────
--
-- documentatie/onboarding_optimalisatie.md, hoofdstuk 17 (Ronde D, stap D1):
-- er is één knop, "Onderzoek opnieuw", die alles vervangt. Geen snelheids-
-- instelling, geen manier om alleen aan te vullen, en geen geheugen van of de
-- laatste crawl geblokkeerd werd. Bij een grote of gevoelige site is dat het
-- verschil tussen een inventaris die het aanbod dekt en een crawl die de site
-- laat denken dat ze wordt aangevallen.
--
-- ── DE VIJF KOLOMMEN ─────────────────────────────────────────────────────────
--
-- `crawl_speed`: drie standen (lib/crawl-speed.ts). Bepaalt de batchgrootte en
-- de pauze tussen batches.
--
-- `crawl_as_browser`: standaard uit. Alleen aan als de klant zelf toestemming
-- geeft dat ORBIT ENGINE zijn EIGEN site als gewone browser leest, voor als zijn
-- firewall het bot-verkeer anders weert (§17.3). Nooit voor een domein dat niet
-- van deze klant is.
--
-- `crawl_last_run_at` / `crawl_last_mode`: wanneer de laatste crawlronde
-- draaide en of dat "meer" of "opnieuw" was, voor de statusregel op het scherm.
--
-- `crawl_last_blocked_at`: wanneer de site voor het laatst met een 403
-- antwoordde. Zolang dit gezet is, toont het scherm een melding in plaats van
-- stil door te crawlen met lege pagina's.
--
-- Additief en idempotent (conventie 4): geen bestaande rij verandert, elk
-- profiel krijgt de standaardstand 'normaal'.
alter table public.profiles
  add column if not exists crawl_speed text not null default 'normaal',
  add column if not exists crawl_as_browser boolean not null default false,
  add column if not exists crawl_last_run_at timestamptz,
  add column if not exists crawl_last_mode text,
  add column if not exists crawl_last_blocked_at timestamptz;

alter table public.profiles drop constraint if exists profiles_crawl_speed_check;
alter table public.profiles add constraint profiles_crawl_speed_check
  check (crawl_speed in ('snel', 'normaal', 'langzaam'));

alter table public.profiles drop constraint if exists profiles_crawl_last_mode_check;
alter table public.profiles add constraint profiles_crawl_last_mode_check
  check (crawl_last_mode is null or crawl_last_mode in ('meer', 'opnieuw'));

comment on column public.profiles.crawl_speed is
  '(0080) snel | normaal | langzaam, zie lib/crawl-speed.ts. Bepaalt de batchgrootte en de pauze tussen batches bij de content-inventaris.';

comment on column public.profiles.crawl_as_browser is
  '(0080) Standaard uit. Alleen aan met expliciete toestemming van de klant voor zijn EIGEN domein, als zijn firewall het bot-verkeer anders weert.';

comment on column public.profiles.crawl_last_run_at is
  '(0080) Wanneer de laatste crawlronde (achtergrondtaak crawl_inventory) draaide.';

comment on column public.profiles.crawl_last_mode is
  '(0080) "meer" (aanvullen) of "opnieuw" (vervangen), de modus van de laatste crawlronde.';

comment on column public.profiles.crawl_last_blocked_at is
  '(0080) Wanneer de site voor het laatst met 403 antwoordde. Zolang gezet, toont het scherm een melding in plaats van stil door te crawlen met lege pagina''s.';

-- Controle: de vijf kolommen en de twee constraints bestaan.
select
  count(*) filter (where column_name = 'crawl_speed') as heeft_crawl_speed,
  count(*) filter (where column_name = 'crawl_as_browser') as heeft_crawl_as_browser,
  count(*) filter (where column_name = 'crawl_last_run_at') as heeft_crawl_last_run_at,
  count(*) filter (where column_name = 'crawl_last_mode') as heeft_crawl_last_mode,
  count(*) filter (where column_name = 'crawl_last_blocked_at') as heeft_crawl_last_blocked_at
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles';
