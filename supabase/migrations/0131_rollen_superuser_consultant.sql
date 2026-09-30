-- 0131: staff_users.role wordt 'superuser' of 'consultant' (30 september 2026)
--
-- De kolom stond standaard op 'superuser', dus elke consultant heette in de
-- database superuser. De app leidt de rol nu af in `lib/roles.ts` (de superuser is
-- een vast, bevestigd e-mailadres in code), maar de tabel hoort hetzelfde te
-- zeggen. Additief en idempotent: alleen waarden, geen `drop`, en een tweede
-- keer draaien verandert niets.

alter table public.staff_users alter column role set default 'consultant';

update public.staff_users s
   set role = case
     when lower(u.email) = 'koopman.janwillem@gmail.com' then 'superuser'
     else 'consultant'
   end
  from auth.users u
 where u.id = s.user_id
   and s.role is distinct from case
     when lower(u.email) = 'koopman.janwillem@gmail.com' then 'superuser'
     else 'consultant'
   end;
