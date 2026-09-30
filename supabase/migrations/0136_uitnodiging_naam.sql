-- 0136: voor- en achternaam bij een uitnodiging (30 september 2026)
--
-- Wie een account toevoegt (klant of consultant) geeft nu ook een voornaam en
-- achternaam op, zodat elk account een naam heeft. De naam reist mee met de
-- uitnodiging en komt bij het activeren in `auth.users.raw_user_meta_data`
-- (`voornaam`, `achternaam`), waar de zijbalk hem leest (`lib/weergavenaam.ts`).
-- Nullable: bestaande uitnodigingen hebben geen naam en blijven werken.
-- Additief en idempotent.

alter table public.account_invites add column if not exists first_name text;
alter table public.account_invites add column if not exists last_name text;
alter table public.staff_invites add column if not exists first_name text;
alter table public.staff_invites add column if not exists last_name text;
