-- 0134: de superuser is beheerder van elk klantaccount (30 september 2026)
--
-- Waarom: in de klantweergave (`lib/staff.ts`, `isStaff` uit) leest de app alleen wat
-- een klant mag lezen, en dat loopt via `account_users`. Stond de superuser
-- alleen in zijn eigen account, dan zag hij in de klantweergave 0 van de 6 accounts
-- (en RLS idem). Nu is hij lid van elk account, met rol 'admin' (eigenaar), zodat
-- hij elk klantaccount kan bekijken zoals de klant het ziet.
--
-- Twee delen, beide additief en idempotent:
--   1. backfill voor alle bestaande accounts;
--   2. een trigger die dat voor elk nieuw account doet, anders is het na de
--      volgende klant weer stuk. Het adres staat hier vast, net als in 0131 en
--      `lib/roles.ts`; een ontbrekende of onbevestigde gebruiker slaat hij over.

create or replace function public.superuser_lid_maken(p_account uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.account_users (account_id, user_id, role)
  select p_account, u.id, 'admin'
    from auth.users u
   where lower(u.email) = 'koopman.janwillem@gmail.com'
     and u.email_confirmed_at is not null
  on conflict (account_id, user_id) do nothing;
end;
$$;

do $$
declare
  a record;
begin
  for a in select id from public.accounts loop
    perform public.superuser_lid_maken(a.id);
  end loop;
end $$;

create or replace function public.accounts_superuser_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Een mislukte koppeling mag het aanmaken van het account nooit tegenhouden.
  begin
    perform public.superuser_lid_maken(new.id);
  exception when others then
    null;
  end;
  return new;
end;
$$;

drop trigger if exists accounts_superuser_lid on public.accounts;
create trigger accounts_superuser_lid
  after insert on public.accounts
  for each row execute function public.accounts_superuser_trigger();
