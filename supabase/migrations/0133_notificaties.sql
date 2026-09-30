-- 0133: notificaties, één lijst met wat er in de app gebeurd is.
--
-- Tot 29 september 2026 kende de app twee soorten meldingen: een zwevend blok
-- rechtsboven dat verscheen na een klik van de gebruiker zelf, en één melding
-- die uit de achtergrond kwam (een clustermeting die klaar was, via
-- `resultaat_gezien_at` op `analyses`). Al het andere werk op de achtergrond
-- ging ongemerkt voorbij: een pagina die klaar stond om te beoordelen, een
-- pagina die na publicatie niet op de site teruggevonden werd, nieuwe vragen
-- voor de klant. Op productie draaiden er in de 30 dagen daarvoor 84
-- schrijftaken, 16 metingen en 10 technische controles, en van geen van die
-- uitkomsten kreeg iemand bericht in de app.
--
-- ── WAAROM TRIGGERS EN NIET IN DE CODE ─────────────────────────────────────
--
-- Elke gebeurtenis heeft precies één plek in de database waar hij zichtbaar
-- wordt (een status die omslaat, een rij die erbij komt), maar vaak meerdere
-- plekken in de code die dat veroorzaken: `content_pieces.status` wordt op vier
-- plekken op `ready` gezet. Een trigger mist er geen enkele, ook niet een
-- route die later gebouwd wordt.
--
-- De trigger legt alleen het feit vast (soort, object, een paar namen in
-- `gegevens`). De zin, de kleur en de link staan in `lib/notificaties.ts`, puur
-- en testbaar (conventie 2), zodat een tekstwijziging geen migratie is.
--
-- ⚠️ Elke triggerfunctie vangt zijn eigen fouten af. Een melding die niet
-- aangemaakt kan worden mag nooit de schrijfactie tegenhouden waar hij aan
-- hangt: een meting die niet op `gereed` kan omdat de melding faalt, is erger
-- dan een melding die ontbreekt.
--
-- ── SAMENVOEGEN ────────────────────────────────────────────────────────────
--
-- Sommige gebeurtenissen komen in bosjes: een briefing zet in één keer 5 tot
-- 12 vragen klaar, en een kenniswijziging raakte op 29 september 2026 in één
-- ochtend tientallen pagina's (1.466 verwerkte gebeurtenissen in 30 dagen).
-- Die soorten tellen op in één rij (`aantal`) zolang de vorige minder dan een
-- uur oud is, in plaats van tien losse meldingen.
--
-- Additief en idempotent (conventie 4).

create table if not exists public.notificaties (
  id uuid primary key default gen_random_uuid(),
  -- Minstens één van de twee. Leeg allebei mag alleen bij `alleen_beheer`:
  -- dan gaat hij over de hele app (het totale dagbudget).
  profile_id uuid references public.profiles(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete cascade,
  soort text not null,
  object_id uuid,
  gegevens jsonb not null default '{}'::jsonb,
  aantal integer not null default 1,
  alleen_beheer boolean not null default false,
  aangemaakt_op timestamptz not null default now()
);

create index if not exists notificaties_profiel_idx
  on public.notificaties (profile_id, aangemaakt_op desc);
create index if not exists notificaties_account_idx
  on public.notificaties (account_id, aangemaakt_op desc);
create index if not exists notificaties_soort_idx
  on public.notificaties (soort, aangemaakt_op desc);

comment on table public.notificaties is
  'Eén rij per gebeurtenis waar de gebruiker van hoort te weten. Aangemaakt door triggers (en notificatie_meld vanuit de code); tekst, kleur en link in lib/notificaties.ts. Migratie 0133.';

-- Tot wanneer iemand alles gezien heeft. Eén tijdstip per gebruiker in plaats
-- van een vinkje per rij: openen van de lijst zet alles tegelijk op gelezen,
-- en dat is de enige handeling die het scherm aanbiedt.
create table if not exists public.notificaties_gezien (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gezien_tot timestamptz not null default now()
);

alter table public.notificaties enable row level security;
alter table public.notificaties_gezien enable row level security;

drop policy if exists "notificaties_select" on public.notificaties;
create policy "notificaties_select"
  on public.notificaties for select
  using (
    (not alleen_beheer or public.is_staff())
    and (
      profile_id in (select public.readable_profile_ids())
      or account_id in (select public.user_account_ids())
      or (profile_id is null and account_id is null and public.is_staff())
    )
  );

drop policy if exists "notificaties_gezien_select" on public.notificaties_gezien;
create policy "notificaties_gezien_select"
  on public.notificaties_gezien for select
  using (user_id = (select auth.uid()));

-- ── De ene schrijfroute ────────────────────────────────────────────────────

create or replace function public.notificatie_meld(
  p_profile uuid,
  p_account uuid,
  p_soort text,
  p_object uuid,
  p_gegevens jsonb default '{}'::jsonb,
  p_alleen_beheer boolean default false,
  p_samenvoegen_minuten integer default 0
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_samenvoegen_minuten > 0 then
    select id into v_id
      from public.notificaties
     where soort = p_soort
       and profile_id is not distinct from p_profile
       and account_id is not distinct from p_account
       and aangemaakt_op > now() - make_interval(mins => p_samenvoegen_minuten)
     order by aangemaakt_op desc
     limit 1;
    if v_id is not null then
      update public.notificaties
         set aantal = aantal + 1,
             aangemaakt_op = now(),
             gegevens = coalesce(p_gegevens, '{}'::jsonb),
             object_id = p_object
       where id = v_id;
      return;
    end if;
  end if;

  insert into public.notificaties (profile_id, account_id, soort, object_id, gegevens, alleen_beheer)
  values (p_profile, p_account, p_soort, p_object, coalesce(p_gegevens, '{}'::jsonb), p_alleen_beheer);
end;
$$;

-- ── profiles: merkonderzoek en Search Console ──────────────────────────────

create or replace function public.notificatie_profiles() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_naam text := coalesce(nullif(new.brand_name, ''), new.name);
begin
  begin
    if new.status is distinct from old.status and old.status = 'bezig' then
      if new.status = 'klaar' then
        perform public.notificatie_meld(new.id, new.account_id, 'onderzoek_klaar', new.id, jsonb_build_object('naam', v_naam));
      elsif new.status = 'mislukt' then
        perform public.notificatie_meld(new.id, new.account_id, 'onderzoek_mislukt', new.id, jsonb_build_object('naam', v_naam));
      end if;
    end if;

    if new.gsc_last_error is not null and new.gsc_last_error is distinct from old.gsc_last_error then
      perform public.notificatie_meld(new.id, new.account_id, 'gsc_fout', new.id, '{}'::jsonb, false, 1440);
    elsif new.gsc_last_error is null
          and old.gsc_last_sync_at is not null
          and new.gsc_last_sync_at is distinct from old.gsc_last_sync_at then
      -- De synchronisatie draait één keer per dag; samenvoegen over 20 uur
      -- voorkomt twee meldingen als hij een keer met de hand opnieuw draait.
      perform public.notificatie_meld(new.id, new.account_id, 'gsc_cijfers', new.id, '{}'::jsonb, false, 1200);
    end if;
  exception when others then
    raise warning 'notificatie_profiles: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists notificatie_profiles on public.profiles;
create trigger notificatie_profiles
  after update of status, gsc_last_error, gsc_last_sync_at on public.profiles
  for each row execute function public.notificatie_profiles();

-- ── analyses: meting klaar of mislukt, en de twee herinneringen ────────────

create or replace function public.notificatie_analyses() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_gegevens jsonb := jsonb_build_object('naam', new.name);
begin
  begin
    if new.profile_id is null then
      return new;
    end if;
    if new.status is distinct from old.status then
      if new.status = 'gereed' then
        perform public.notificatie_meld(new.profile_id, null, 'meting_klaar', new.id, v_gegevens);
      elsif new.status = 'mislukt' then
        perform public.notificatie_meld(new.profile_id, null, 'meting_mislukt', new.id, v_gegevens);
      end if;
    end if;
    if old.publish_reminder_sent_at is null and new.publish_reminder_sent_at is not null then
      perform public.notificatie_meld(new.profile_id, null, 'publicatie_herinnering', new.id, v_gegevens);
    end if;
    if old.question_reminder_sent_at is null and new.question_reminder_sent_at is not null then
      perform public.notificatie_meld(new.profile_id, null, 'vragen_herinnering', new.id, v_gegevens);
    end if;
  exception when others then
    raise warning 'notificatie_analyses: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists notificatie_analyses on public.analyses;
create trigger notificatie_analyses
  after update of status, publish_reminder_sent_at, question_reminder_sent_at on public.analyses
  for each row execute function public.notificatie_analyses();

-- ── visibility_scores: flink gestegen of gedaald ───────────────────────────
--
-- Vijftien procentpunten als drempel. De standaardfout van één clusterscore
-- lag op 29 september 2026 op productie op een mediaan van 7,6 punten
-- (`weighted_stderr`, 14 scores, middelste helft 6,7 tot 8,0). Het verschil
-- tussen twee rondes heeft dan een standaardfout van ongeveer 10,7 (wortel 2
-- keer 7,6): een drempel van 10 zou bij toeval ruim een op de drie weken een
-- melding geven. Bij 15 is dat ongeveer een op de zes, en dat is het minste dat
-- de meting zelf toelaat.

create or replace function public.notificatie_zichtbaarheid() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_profiel uuid;
  v_naam text;
  v_vorige numeric;
  v_nu numeric := coalesce(new.weighted_score, new.score);
  v_soort text;
begin
  begin
    if v_nu is null then
      return new;
    end if;
    select coalesce(weighted_score, score) into v_vorige
      from public.visibility_scores
     where analysis_id = new.analysis_id and week_no < new.week_no
     order by week_no desc
     limit 1;
    if v_vorige is null or abs(v_nu - v_vorige) < 15 then
      return new;
    end if;
    v_soort := case when v_nu > v_vorige then 'zichtbaarheid_omhoog' else 'zichtbaarheid_omlaag' end;
    select profile_id, name into v_profiel, v_naam from public.analyses where id = new.analysis_id;
    if v_profiel is null then
      return new;
    end if;
    -- Eén keer per week per cluster, ook als de score later die week opnieuw
    -- berekend wordt.
    if exists (
      select 1 from public.notificaties
       where object_id = new.analysis_id
         and soort in ('zichtbaarheid_omhoog', 'zichtbaarheid_omlaag')
         and gegevens->>'week' = new.week_no::text
    ) then
      return new;
    end if;
    perform public.notificatie_meld(
      v_profiel, null, v_soort, new.analysis_id,
      jsonb_build_object('naam', v_naam, 'week', new.week_no, 'van', round(v_vorige), 'naar', round(v_nu))
    );
  exception when others then
    raise warning 'notificatie_zichtbaarheid: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists notificatie_zichtbaarheid on public.visibility_scores;
create trigger notificatie_zichtbaarheid
  after insert or update of score, weighted_score on public.visibility_scores
  for each row execute function public.notificatie_zichtbaarheid();

-- ── reputation_runs, technical_audits, cluster_discovery_runs ──────────────

create or replace function public.notificatie_reputatie() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    if new.status is distinct from old.status then
      if new.status in ('klaar', 'budget_op') then
        perform public.notificatie_meld(new.profile_id, null, 'reputatie_klaar', new.id);
      elsif new.status = 'mislukt' then
        perform public.notificatie_meld(new.profile_id, null, 'reputatie_mislukt', new.id);
      end if;
    end if;
  exception when others then
    raise warning 'notificatie_reputatie: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists notificatie_reputatie on public.reputation_runs;
create trigger notificatie_reputatie
  after update of status on public.reputation_runs
  for each row execute function public.notificatie_reputatie();

create or replace function public.notificatie_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    if coalesce(new.blockers, 0) > 0 then
      perform public.notificatie_meld(new.profile_id, null, 'audit_blokkade', new.id,
        jsonb_build_object('blokkades', new.blockers));
    else
      perform public.notificatie_meld(new.profile_id, null, 'audit_klaar', new.id,
        jsonb_build_object('waarschuwingen', coalesce(new.warnings, 0)));
    end if;
  exception when others then
    raise warning 'notificatie_audit: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists notificatie_audit on public.technical_audits;
create trigger notificatie_audit
  after insert on public.technical_audits
  for each row execute function public.notificatie_audit();

create or replace function public.notificatie_ontdekken() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    if new.status is distinct from old.status then
      if new.status = 'klaar' then
        perform public.notificatie_meld(new.profile_id, null, 'ontdekken_klaar', new.id,
          jsonb_build_object('thema', new.theme));
      elsif new.status = 'mislukt' then
        perform public.notificatie_meld(new.profile_id, null, 'ontdekken_mislukt', new.id,
          jsonb_build_object('thema', new.theme));
      end if;
    end if;
  exception when others then
    raise warning 'notificatie_ontdekken: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists notificatie_ontdekken on public.cluster_discovery_runs;
create trigger notificatie_ontdekken
  after update of status on public.cluster_discovery_runs
  for each row execute function public.notificatie_ontdekken();

-- ── content_pieces: geschreven, nieuwe versie, live, niet gevonden ────────

create or replace function public.notificatie_pagina() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_profiel uuid;
  v_gegevens jsonb := jsonb_build_object('titel', new.title);
begin
  begin
    select profile_id into v_profiel from public.analyses where id = new.analysis_id;
    if v_profiel is null then
      return new;
    end if;

    if tg_op = 'INSERT' then
      -- Een nieuwe versie na een gevraagde aanpassing. De proefherschrijving
      -- van de beheerder ("Opnieuw geschreven met dezelfde invoer", een toets
      -- van de keten) is geen gebeurtenis voor de klant.
      if coalesce(new.version, 1) > 1 and new.status = 'ready'
         and coalesce(new.revision_note, '') not like 'Opnieuw geschreven met dezelfde invoer%' then
        perform public.notificatie_meld(v_profiel, null, 'nieuwe_versie', new.id, v_gegevens);
      end if;
      return new;
    end if;

    if new.status is distinct from old.status and new.status = 'ready' and new.is_current is not false then
      if old.status = 'published' then
        -- De controle na publicatie vond hem niet terug (lib/pipeline/publish.ts).
        perform public.notificatie_meld(v_profiel, null, 'publicatie_niet_gevonden', new.id, v_gegevens);
      elsif old.status in ('briefing', 'draft') then
        perform public.notificatie_meld(v_profiel, null, 'pagina_klaar', new.id, v_gegevens);
      end if;
    end if;

    if new.status = 'published' and new.publish_checked_at is not null
       and new.publish_checked_at is distinct from old.publish_checked_at then
      perform public.notificatie_meld(v_profiel, null, 'pagina_live', new.id, v_gegevens);
    end if;

    if old.kennis_gewijzigd_op is null and new.kennis_gewijzigd_op is not null then
      perform public.notificatie_meld(v_profiel, null, 'kennis_raakt_paginas', new.id, v_gegevens, false, 60);
    end if;
  exception when others then
    raise warning 'notificatie_pagina: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists notificatie_pagina_update on public.content_pieces;
create trigger notificatie_pagina_update
  after update of status, publish_checked_at, kennis_gewijzigd_op on public.content_pieces
  for each row execute function public.notificatie_pagina();

drop trigger if exists notificatie_pagina_insert on public.content_pieces;
create trigger notificatie_pagina_insert
  after insert on public.content_pieces
  for each row execute function public.notificatie_pagina();

-- ── content_impact: de eerste effectmeting van een gepubliceerde pagina ───

create or replace function public.notificatie_effect() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_profiel uuid;
  v_titel text;
begin
  begin
    if coalesce(new.wave, 0) <> 1 then
      return new;
    end if;
    select a.profile_id, c.title into v_profiel, v_titel
      from public.content_pieces c
      join public.analyses a on a.id = c.analysis_id
     where c.id = new.content_piece_id;
    if v_profiel is not null then
      perform public.notificatie_meld(v_profiel, null, 'effect_gemeten', new.content_piece_id,
        jsonb_build_object('titel', v_titel, 'oordeel', new.verdict));
    end if;
  exception when others then
    raise warning 'notificatie_effect: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists notificatie_effect on public.content_impact;
create trigger notificatie_effect
  after insert on public.content_impact
  for each row execute function public.notificatie_effect();

-- ── jobs: een schrijftaak die definitief mislukt ───────────────────────────

create or replace function public.notificatie_taak() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_profiel uuid;
  v_stuk uuid;
  v_titel text;
begin
  begin
    if new.status is distinct from old.status and new.status = 'failed'
       and new.type in ('pagina_brief', 'pagina_schrijven', 'pagina_herschrijven', 'pagina_controle') then
      v_stuk := nullif(new.payload_json->>'pieceId', '')::uuid;
      select a.profile_id into v_profiel from public.analyses a where a.id = new.analysis_id;
      if v_stuk is not null then
        select title into v_titel from public.content_pieces where id = v_stuk;
      end if;
      if v_profiel is not null then
        perform public.notificatie_meld(v_profiel, null, 'schrijven_mislukt', v_stuk,
          jsonb_build_object('titel', v_titel));
      end if;
    end if;
  exception when others then
    raise warning 'notificatie_taak: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists notificatie_taak on public.jobs;
create trigger notificatie_taak
  after update of status on public.jobs
  for each row execute function public.notificatie_taak();

-- ── fact_requests: nieuwe vragen en beantwoorde vragen ─────────────────────

create or replace function public.notificatie_vragen() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    if new.profile_id is null then
      return new;
    end if;
    if tg_op = 'INSERT' then
      if new.status = 'open' then
        perform public.notificatie_meld(new.profile_id, null, 'nieuwe_vragen', new.id, '{}'::jsonb, false, 60);
      end if;
    elsif new.status is distinct from old.status and new.status = 'beantwoord' then
      perform public.notificatie_meld(new.profile_id, null, 'vragen_beantwoord', new.id, '{}'::jsonb, false, 60);
    end if;
  exception when others then
    raise warning 'notificatie_vragen: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists notificatie_vragen_insert on public.fact_requests;
create trigger notificatie_vragen_insert
  after insert on public.fact_requests
  for each row execute function public.notificatie_vragen();

drop trigger if exists notificatie_vragen_update on public.fact_requests;
create trigger notificatie_vragen_update
  after update of status on public.fact_requests
  for each row execute function public.notificatie_vragen();

-- ── account_invites: een collega heeft zich aangemeld ──────────────────────

create or replace function public.notificatie_uitnodiging() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    if old.accepted_at is null and new.accepted_at is not null then
      perform public.notificatie_meld(null, new.account_id, 'collega_aangemeld', new.id,
        jsonb_build_object('email', new.email));
    end if;
  exception when others then
    raise warning 'notificatie_uitnodiging: %', sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists notificatie_uitnodiging on public.account_invites;
create trigger notificatie_uitnodiging
  after update of accepted_at on public.account_invites
  for each row execute function public.notificatie_uitnodiging();

-- ── Rechten ────────────────────────────────────────────────────────────────
--
-- Geen van deze functies hoort in de API (zie 0055). De triggers draaien
-- namens de eigenaar; `notificatie_meld` wordt vanuit de code alleen met de
-- service-role key aangeroepen (het dagbudget, lib/spend-limit.ts).

revoke all on function public.notificatie_meld(uuid, uuid, text, uuid, jsonb, boolean, integer) from public, anon, authenticated;
grant execute on function public.notificatie_meld(uuid, uuid, text, uuid, jsonb, boolean, integer) to service_role;
revoke all on function public.notificatie_profiles() from public, anon, authenticated;
revoke all on function public.notificatie_analyses() from public, anon, authenticated;
revoke all on function public.notificatie_zichtbaarheid() from public, anon, authenticated;
revoke all on function public.notificatie_reputatie() from public, anon, authenticated;
revoke all on function public.notificatie_audit() from public, anon, authenticated;
revoke all on function public.notificatie_ontdekken() from public, anon, authenticated;
revoke all on function public.notificatie_pagina() from public, anon, authenticated;
revoke all on function public.notificatie_effect() from public, anon, authenticated;
revoke all on function public.notificatie_taak() from public, anon, authenticated;
revoke all on function public.notificatie_vragen() from public, anon, authenticated;
revoke all on function public.notificatie_uitnodiging() from public, anon, authenticated;

-- Controle: twee tabellen en dertien triggers.
select
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name in ('notificaties', 'notificaties_gezien')) as tabellen,
  (select count(*) from pg_trigger where tgname like 'notificatie_%' and not tgisinternal) as triggers;
