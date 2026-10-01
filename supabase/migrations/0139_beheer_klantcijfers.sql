-- 0139: de tellers onder het klantenoverzicht voor de beheerder
--
-- WAT HET PROBLEEM WAS
-- De beheerder wil één tabel met per klant (account) hoeveel clusters, vragen,
-- metingen, kansen, pagina's, zoekverkeer, kosten en mislukte taken er zijn.
-- Op 1 oktober 2026 telde productie 9.572 regels in `ai_calls`, 32.209 in
-- `search_console_days` en 4.075 in `jobs`. Dat allemaal naar de server halen
-- om in JavaScript op te tellen loopt bovendien tegen de standaardgrens van
-- 1.000 regels per Supabase-query aan: de som zou dan stil te laag uitvallen.
--
-- DE OPLOSSING
-- Eén functie die per account optelt in de database en één regel per klant
-- teruggeeft. De afgeleide getallen (verschillen, achterstand op het pakket,
-- de zichtbaarheidsscore) rekent `lib/klantenoverzicht.ts` uit, want die horen
-- onder test (conventie 2). Deze functie telt alleen.
--
-- De datums komen als parameters binnen en worden hier niet zelf bepaald, zodat
-- het venster op één plek staat (`klantcijferVensters()` in de module).
--
-- RECHTEN
-- `security invoker`, en alleen `service_role` mag hem aanroepen. Het scherm
-- dat hem gebruikt controleert zelf `isStaff()`; een ingelogde klant kan deze
-- functie via de API niet bereiken, want hij telt over álle klanten heen.
--
-- Additief en idempotent: `create or replace`, er verdwijnt niets.

create or replace function public.beheer_klantcijfers(
  p_maand_start   date,
  p_fouten_sinds  timestamptz,
  p_gsc_van       date,
  p_gsc_tot       date,
  p_gsc_vorige_van date,
  p_gsc_vorige_tot date
)
returns table (
  account_id              uuid,
  clusters_goedgekeurd    integer,
  clusters_voorgesteld    integer,
  vragen_actief           integer,
  concurrenten            integer,
  meetplannen             integer,
  laatste_meting          timestamptz,
  kansen_open             integer,
  kansen_opgepakt         integer,
  kansen_vervallen        integer,
  paginas_in_plan         integer,
  paginas_geschreven      integer,
  paginas_gepubliceerd    integer,
  geschreven_deze_maand   integer,
  laatst_geschreven       timestamptz,
  gsc_klikken             bigint,
  gsc_vertoningen         bigint,
  gsc_klikken_vorige      bigint,
  gsc_vertoningen_vorige  bigint,
  kosten_maand_usd        numeric,
  kosten_totaal_usd       numeric,
  mislukte_taken          integer
)
language sql
stable
security invoker
set search_path = public
as $$
  with merk as (
    -- Gearchiveerde merken tellen nergens mee, net als in het CSM-paneel.
    select p.id, p.account_id
    from profiles p
    where p.account_id is not null and p.archived_at is null
  ),
  ana as (
    select a.id, a.profile_id, a.archived_at, m.account_id
    from analyses a
    join merk m on m.id = a.profile_id
  ),
  stuk as (
    select c.id, c.status::text as status, c.is_current, c.supersedes_id,
           c.created_at, c.published_at, an.account_id
    from content_pieces c
    join ana an on an.id = c.analysis_id
  )
  select
    acc.id,
    (select count(*) from profile_topics t join merk m on m.id = t.profile_id
      where m.account_id = acc.id and t.status = 'goedgekeurd')::int,
    (select count(*) from profile_topics t join merk m on m.id = t.profile_id
      where m.account_id = acc.id and t.status = 'voorgesteld')::int,
    (select count(*) from prompts pr join ana an on an.id = pr.analysis_id
      where an.account_id = acc.id and an.archived_at is null and pr.active)::int,
    (select count(*) from entities e join merk m on m.id = e.profile_id
      where m.account_id = acc.id and e.entity_role = 'concurrent'
        and not coalesce(e.dismissed, false))::int,
    (select count(*) from meetplannen mp join ana an on an.id = mp.analysis_id
      where an.account_id = acc.id)::int,
    (select max(tr.ran_at) from tracking_runs tr join ana an on an.id = tr.analysis_id
      where an.account_id = acc.id),
    (select count(*) from kansen k join merk m on m.id = k.profile_id
      where m.account_id = acc.id and k.status in ('open', 'te_herzien'))::int,
    (select count(*) from kansen k join merk m on m.id = k.profile_id
      where m.account_id = acc.id
        and k.status in ('ingepland', 'in_voorbereiding', 'geschreven', 'gepubliceerd'))::int,
    (select count(*) from kansen k join merk m on m.id = k.profile_id
      where m.account_id = acc.id and k.status = 'vervallen')::int,
    -- Een reserve is geen belofte en een uitgenomen pagina staat niet meer in
    -- het plan (zelfde regel als `lib/csm-data.ts`).
    (select count(*) from planned_pages pp join merk m on m.id = pp.profile_id
      where m.account_id = acc.id and not pp.is_buffer and not coalesce(pp.taken_out, false))::int,
    -- Geschreven = de huidige versie bestaat en wacht niet meer op antwoorden.
    (select count(*) from stuk s
      where s.account_id = acc.id and s.is_current and s.status not in ('briefing', 'archived'))::int,
    -- Gepubliceerd: een pagina telt één keer, ook als hij zowel in het plan als
    -- in de bibliotheek als geplaatst staat.
    (select count(distinct coalesce(x.stuk_id, x.plan_id)) from (
        select pp.content_piece_id as stuk_id, pp.id as plan_id
        from planned_pages pp join merk m on m.id = pp.profile_id
        where m.account_id = acc.id and pp.posted_at is not null
        union all
        select s.id, null from stuk s
        where s.account_id = acc.id and s.is_current and s.published_at is not null
      ) x)::int,
    -- Alleen eerste versies: een herschreven pagina is geen nieuwe pagina.
    (select count(*) from stuk s
      where s.account_id = acc.id and s.supersedes_id is null
        and s.status not in ('briefing', 'archived') and s.created_at >= p_maand_start)::int,
    (select max(s.created_at) from stuk s
      where s.account_id = acc.id and s.status not in ('briefing', 'archived')),
    (select coalesce(sum(d.clicks), 0) from search_console_days d join merk m on m.id = d.profile_id
      where m.account_id = acc.id and d.day between p_gsc_van and p_gsc_tot),
    (select coalesce(sum(d.impressions), 0) from search_console_days d join merk m on m.id = d.profile_id
      where m.account_id = acc.id and d.day between p_gsc_van and p_gsc_tot),
    (select coalesce(sum(d.clicks), 0) from search_console_days d join merk m on m.id = d.profile_id
      where m.account_id = acc.id and d.day between p_gsc_vorige_van and p_gsc_vorige_tot),
    (select coalesce(sum(d.impressions), 0) from search_console_days d join merk m on m.id = d.profile_id
      where m.account_id = acc.id and d.day between p_gsc_vorige_van and p_gsc_vorige_tot),
    -- Kosten horen bij de klant die het merk NU heeft. Eerst via het merk of de
    -- analyse, pas daarna via `ai_calls.account_id`: dat is het account op het
    -- moment van de aanroep. Van den Udenhout verhuisde op 28 september 2026
    -- naar een eigen account, en met `account_id` voorop kwam die klant op
    -- $0,09 uit terwijl zijn onderzoek op het oude account was geboekt.
    -- Regels zonder merk (295 van de 9.572 op 1 oktober 2026) vallen terug op
    -- `account_id`.
    (select coalesce(sum(c.cost_usd), 0) from ai_calls c
      left join profiles cp on cp.id = c.profile_id
      left join analyses ca on ca.id = c.analysis_id
      left join profiles cap on cap.id = ca.profile_id
      where coalesce(cp.account_id, cap.account_id, c.account_id) = acc.id
        and c.created_at >= p_maand_start),
    (select coalesce(sum(c.cost_usd), 0) from ai_calls c
      left join profiles cp on cp.id = c.profile_id
      left join analyses ca on ca.id = c.analysis_id
      left join profiles cap on cap.id = ca.profile_id
      where coalesce(cp.account_id, cap.account_id, c.account_id) = acc.id),
    (select count(*) from jobs j
      left join profiles jp on jp.id = j.profile_id
      left join analyses ja on ja.id = j.analysis_id
      left join profiles jap on jap.id = ja.profile_id
      where coalesce(jp.account_id, jap.account_id) = acc.id
        and j.status = 'failed'
        and coalesce(j.finished_at, j.updated_at) >= p_fouten_sinds)::int
  from accounts acc;
$$;

revoke execute on function public.beheer_klantcijfers(date, timestamptz, date, date, date, date)
  from public, anon, authenticated;
grant execute on function public.beheer_klantcijfers(date, timestamptz, date, date, date, date)
  to service_role;

-- Controle: één regel per account.
select (select count(*) from public.accounts) as accounts,
       (select count(*) from public.beheer_klantcijfers(
          date_trunc('month', now())::date, now() - interval '7 days',
          current_date - 29, current_date - 2, current_date - 57, current_date - 30)) as regels;
