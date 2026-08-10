-- ═══════════════════════════════════════════════════════════════════════════
-- 0047 — Uitnodigingen: de enige deur naar binnen
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAT HET PROBLEEM WAS
--
-- Er was geen manier om een klant toegang te geven. `signupsEnabled` staat uit
-- (lib/config.ts), dus registreren kan niet, en dat is juist: het product is
-- sales-led. Maar daarmee was er ook geen weg náár binnen, behalve met de hand
-- een gebruiker aanmaken in Supabase.
--
-- Besluit 2 (docs/Nova.md §0) maakt dat een blokkade: de klant logt zelf in en
-- keurt goed. Dan moet er een uitnodigingsstroom zijn.
--
-- WAAROM DIT MODEL
--
-- Nova heeft precies dit, inclusief vier eindtoestanden van de link die elk een
-- eigen scherm krijgen (`onboarding.activation`: `invalidTitle`, `expiredTitle`,
-- `alreadyTitle`, plus geslaagd). Die vier zijn hier de kolommen:
--
--   ongeldig      geen rij met deze tokenhash, of `revoked_at` gevuld
--   verlopen      `expires_at` in het verleden
--   al gebruikt   `accepted_at` gevuld
--   geldig        de rest
--
-- ⚠️ HET TOKEN STAAT ER NIET IN, ALLEEN ZIJN HASH
--
-- Wie de database kan lezen mag geen geldige uitnodigingslinks kunnen maken.
-- De ontvanger krijgt het ruwe token in zijn link, wij bewaren alleen de
-- SHA-256 ervan. Dat is dezelfde afweging als bij een wachtwoord, en het kost
-- hier niets: opzoeken gaat op de hash, dus er is geen enkele plek waar het
-- ruwe token nodig is nadat de mail verstuurd is.
--
-- ⚠️ NUL RLS-POLICIES, NET ALS `jobs`
--
-- Conventie 6: RLS is SELECT-only, en `jobs` heeft nul policies omdat er niets
-- in staat wat een browser hoeft te zien. Hier geldt hetzelfde. Alles wat met
-- uitnodigingen gebeurt loopt via API-routes met de service-role key en een
-- expliciete rolcontrole. Een tabel die alleen de server leest, geeft de client
-- ook geen leesrecht.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.account_invites (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,

  -- Waar de uitnodiging heen ging. Niet uniek: een tweede uitnodiging naar
  -- hetzelfde adres is een geldige handeling (de eerste is zoekgeraakt), en de
  -- oude blijft staan omdat we niets weggooien (conventie 8).
  email text not null,

  -- Met welke rol hij binnenkomt. Dezelfde twee als `account_users`.
  role text not null default 'member' check (role in ('admin', 'member')),

  -- SHA-256 van het token, hex. Zie de waarschuwing hierboven.
  token_hash text not null unique,

  -- Nova laat links verlopen "for your security" (`expiredBody`). Veertien dagen
  -- is lang genoeg voor een vakantie en kort genoeg om te betekenen.
  expires_at timestamptz not null,

  accepted_at timestamptz,
  accepted_user_id uuid references auth.users(id) on delete set null,

  -- Ingetrokken door de uitnodiger. Aparte kolom en geen verwijdering, zodat
  -- "deze link werkte ooit" navraagbaar blijft.
  revoked_at timestamptz,

  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists account_invites_account_id_idx
  on public.account_invites(account_id);

-- Zoeken op adres gebeurt hoofdletterongevoelig: iemand die "Jan@bedrijf.nl"
-- typt en later "jan@bedrijf.nl" hoort dezelfde uitnodiging te vinden.
create index if not exists account_invites_email_idx
  on public.account_invites(lower(email));

-- RLS aan, nul policies: alleen de service-role komt erbij. Zonder deze regel
-- zou de tabel bij een toekomstige `anon`-grant onbedoeld leesbaar worden.
alter table public.account_invites enable row level security;
