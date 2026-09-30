-- 0137: twee rollen, Admin en Klant (30 september 2026)
--
-- De eigenaar is zelf superuser, consultant en ontwikkelaar, dus de consultantrol
-- en het verschil tussen klant-`admin` en klant-`member` verdwijnen. Wat blijft:
--
--   • Admin = het vaste adres in `lib/roles.ts`, met een rij in `staff_users`
--     (role 'superuser') zodat RLS hem overal laat lezen.
--   • Klant = elk lid van een account, met alle rechten van de oude klant-`admin`.
--
-- Additief en idempotent (conventie 4): alleen waarden en een functie die
-- opnieuw wordt gedefinieerd, geen `drop`. `staff_users`, `staff_invites` en de
-- kolom `account_users.role` blijven staan; de app leest ze niet meer voor rechten.

-- 1. Elke klant wordt volwaardig. Een tweede keer draaien verandert niets.
update public.account_users set role = 'admin' where role <> 'admin';
update public.account_invites set role = 'admin' where role <> 'admin';
alter table public.account_users alter column role set default 'admin';
alter table public.account_invites alter column role set default 'admin';

-- 2. RLS: alleen de rij van de admin telt nog als staf. Een oude consultantrij
--    (testaccounts) leest daardoor niets meer buiten zijn eigen account.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_users s
     where s.user_id = (select auth.uid())
       and s.role = 'superuser'
  );
$$;
