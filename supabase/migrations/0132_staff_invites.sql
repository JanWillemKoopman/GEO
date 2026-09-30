-- 0132: uitnodigingen voor consultants (30 september 2026)
--
-- Zelfde vorm als `account_invites` (0047), maar zonder account: wie de link
-- accepteert wordt een rij in `staff_users` met rol 'consultant'. Alleen de
-- superuser nodigt uit (`lib/roles.ts`). Het token zelf wordt nergens bewaard,
-- alleen de SHA-256 ervan, dus de link is maar één keer te tonen.
-- Additief en idempotent.

create table if not exists public.staff_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_user_id uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists staff_invites_email_idx
  on public.staff_invites(lower(email));

-- RLS aan en geen policies: alleen de service-role key komt erbij.
alter table public.staff_invites enable row level security;
