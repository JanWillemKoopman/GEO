-- ============================================================================
-- 20260729_02 — Dataopschoning naar aanleiding van de praktijktest Udenhout
-- ============================================================================
-- Repareert de concrete fouten die de eerste end-to-end analyse opleverde.
-- Zie praktijktest-udenhout.md voor de bevinding achter elke stap.
--
-- VEILIGHEID: stap 0 maakt eerst een volledige rij-snapshot van élke rij die
-- hierna wordt aangeraakt, in _backup_20260729. Niets wordt verwijderd.
-- Terugdraaien kan altijd vanuit die tabel.
--
-- Toepassen NA 20260729_01 (gebruikt entities.entity_role en
-- content_pieces.brief_instruction).
-- ============================================================================

begin;

-- ── 0. Back-up van alles wat we aanraken ─────────────────────────────────────

create table if not exists public._backup_20260729 (
  id           uuid primary key default gen_random_uuid(),
  source_table text        not null,
  source_id    uuid        not null,
  snapshot     jsonb       not null,
  reason       text,
  created_at   timestamptz not null default now()
);

comment on table public._backup_20260729 is
  'Rij-snapshots van vóór de kwaliteitsopschoning van 29-07-2026. Niet verwijderen zonder overleg.';

insert into public._backup_20260729 (source_table, source_id, snapshot, reason)
select 'prompts', id, to_jsonb(p), 'cluster-overflow' from public.prompts p
where length(cluster) > 70;

insert into public._backup_20260729 (source_table, source_id, snapshot, reason)
select 'reports', id, to_jsonb(r), 'cluster-overflow in gaps/recommendations' from public.reports r;

insert into public._backup_20260729 (source_table, source_id, snapshot, reason)
select 'content_pieces', id, to_jsonb(c), 'titel, existing_url, schema, review-notities' from public.content_pieces c;

insert into public._backup_20260729 (source_table, source_id, snapshot, reason)
select 'entities', id, to_jsonb(e), 'entiteit-normalisatie' from public.entities e;

insert into public._backup_20260729 (source_table, source_id, snapshot, reason)
select 'visibility_scores', id, to_jsonb(v), 'share_of_voice herberekend' from public.visibility_scores v;


-- ── 1. Cluster-overflow ──────────────────────────────────────────────────────
-- Bevinding: 23 prompts hadden een cluster van 78 tot 14.341 tekens keyword-soep,
-- waarvan één met onverwerkte JSON-resten ("volumeEstimate=35}]}"). Deze strings
-- kwamen letterlijk in het klantrapport terecht als naam van een gap.
-- Aanpak: strip JSON-resten, neem het eerste segment vóór de eerste komma,
-- kap af op 60 tekens zonder een woord doormidden te snijden.

with cleaned as (
  select id,
         btrim(split_part(
           regexp_replace(cluster, ',?\s*volumeEstimate\s*=.*$', '', 'g'),
           ',', 1)) as seg
  from public.prompts
  where length(cluster) > 70
)
update public.prompts p
set    cluster = case
         when length(c.seg) <= 60 then c.seg
         else btrim(regexp_replace(left(c.seg, 60), '\s+\S*$', ''))
       end
from   cleaned c
where  c.id = p.id;

-- Voorkomt herhaling, ongeacht wat het model in de toekomst produceert.
--
-- ⚠️ BELANGRIJK — een kále check-constraint is hier gevaarlijk. De prompt-
-- generatie hanteert zelf nog geen grens (dat is de spec-fix in abcplan.md §A2,
-- nog te bouwen). Een harde constraint zou de eerstvolgende analyse laten
-- CRASHEN op de insert, terwijl er vóór deze opschoning alleen rommel werd
-- opgeslagen. Dat is een regressie: van "lelijk" naar "kapot".
--
-- Daarom: een BEFORE-trigger die afkapt, met de constraint als onbereikbaar
-- vangnet erachter. De pipeline blijft draaien, de data blijft schoon.

create or replace function public.normaliseer_prompt_cluster()
returns trigger language plpgsql as $$
declare schoon text;
begin
  if new.cluster is null or length(new.cluster) <= 120 then
    return new;
  end if;
  schoon := btrim(split_part(
              regexp_replace(new.cluster, ',?\s*volumeEstimate\s*=.*$', '', 'g'), ',', 1));
  if length(schoon) > 60 then
    schoon := btrim(regexp_replace(left(schoon, 60), '\s+\S*$', ''));
  end if;
  if schoon is null or schoon = '' then
    schoon := btrim(left(new.cluster, 60));
  end if;
  new.cluster := schoon;
  return new;
end $$;

comment on function public.normaliseer_prompt_cluster() is
  'Kapt uitgelopen cluster-waarden af i.p.v. de insert te laten falen. Zolang de promptgeneratie zelf nog geen grens hanteert (abcplan.md A2) voorkomt dit dat een lange cluster de hele analyse laat crashen.';

drop trigger if exists prompts_cluster_normaliseren on public.prompts;
create trigger prompts_cluster_normaliseren
  before insert or update of cluster on public.prompts
  for each row execute function public.normaliseer_prompt_cluster();

alter table public.prompts
  drop constraint if exists prompts_cluster_len_check,
  add  constraint prompts_cluster_len_check
       check (cluster is null or length(cluster) <= 120);

-- Getest met een insert van 16.020 tekens inclusief JSON-resten:
-- resultaat 38 tekens, insert geslaagd.


-- ── 2. Dezelfde overflow in het klantrapport ─────────────────────────────────
-- gaps_json[].cluster

update public.reports r
set gaps_json = (
  select jsonb_agg(
    case when length(g->>'cluster') > 80
      then jsonb_set(g, '{cluster}', to_jsonb(
             btrim(regexp_replace(left(g->>'cluster', 60), '\s+\S*$', ''))))
      else g end
    order by ord)
  from jsonb_array_elements(r.gaps_json) with ordinality as t(g, ord))
where r.gaps_json is not null
  and exists (select 1 from jsonb_array_elements(r.gaps_json) g
              where length(g->>'cluster') > 80);

-- recommendations_json[].targetIntent én recommendations_json[].targets[].cluster

update public.reports r
set recommendations_json = (
  select jsonb_agg(
    (case when length(rec->>'targetIntent') > 80
       then jsonb_set(rec, '{targetIntent}', to_jsonb(
              btrim(regexp_replace(left(rec->>'targetIntent', 60), '\s+\S*$', ''))))
       else rec end)
    ||
    jsonb_build_object('targets', coalesce((
       select jsonb_agg(
         case when length(tg->>'cluster') > 80
           then jsonb_set(tg, '{cluster}', to_jsonb(
                  btrim(regexp_replace(left(tg->>'cluster', 60), '\s+\S*$', ''))))
           else tg end
         order by t_ord)
       from jsonb_array_elements(coalesce(rec->'targets', '[]'::jsonb))
            with ordinality as tt(tg, t_ord)
    ), '[]'::jsonb))
    order by r_ord)
  from jsonb_array_elements(r.recommendations_json) with ordinality as rr(rec, r_ord))
where r.recommendations_json is not null;


-- ── 3. Entiteit-normalisatie ─────────────────────────────────────────────────
-- Bevinding a: "Udenhout" en "Van den Udenhout" stonden als losse entiteiten en
--   werden allebei geteld — 3 runs leverden 5 mention-rijen op, wat de
--   share-of-voice opblies t.o.v. de score.
-- Bevinding b: "Skoda" en "Škoda" werden als concurrent geteld, terwijl dat het
--   merk is dat de klant zélf verkoopt.
--
-- Let op: mention-rijen worden NIET verwijderd (principe "we bewaren alles",
-- abcplan.md §5). De correctie zit in de rol van de entiteit; de berekening in
-- stap 4 houdt daar rekening mee.

-- a) alias samenvoegen
update public.entities e
set aliases = (select array_agg(distinct a)
               from unnest(e.aliases || array['Udenhout']) a)
where e.canonical_name = 'Van den Udenhout';

update public.entities
set    dismissed = true,
       entity_role = 'eigen_merk',
       exclude_reason = 'Alias van Van den Udenhout — samengevoegd op 29-07-2026',
       updated_at = now()
where  canonical_name = 'Udenhout';

-- b) het eigen productmerk is geen concurrent
update public.entities
set    entity_role = 'eigen_product',
       dismissed = true,
       exclude_reason = 'Merk dat de klant zelf voert; telt niet als concurrent',
       updated_at = now()
where  normalized in ('skoda', 'škoda')
   or  canonical_name in ('Skoda', 'Škoda');

-- c) brancheorganisatie is geen bedrijf om zichtbaarheid mee te delen
update public.entities
set    entity_role = 'brancheorganisatie',
       exclude_reason = 'Brancheorganisatie, geen concurrerend bedrijf',
       updated_at = now()
where  canonical_name ilike '%bovag%';

-- d) de eigen merkentiteit expliciet markeren
update public.entities
set    entity_role = 'eigen_merk', updated_at = now()
where  canonical_name = 'Van den Udenhout';


-- ── 4. Share-of-voice herberekenen ───────────────────────────────────────────
-- Eigen merk per run één keer tellen (niet per alias), en alleen entiteiten met
-- rol 'concurrent' meetellen aan de andere kant.
-- De score zelf (10/100 = 3 van de 30 runs) was al correct en verandert niet.

update public.visibility_scores v
set    share_of_voice   = round(x.own * 100.0 / nullif(x.own + x.comp, 0), 2),
       share_basis_count = x.own + x.comp
from (
  select tr.analysis_id,
         count(distinct tr.id) filter (
           where m.is_own_brand and m.mentioned)                    as own,
         count(*) filter (
           where not m.is_own_brand and m.mentioned
             and coalesce(e.entity_role, 'concurrent') = 'concurrent'
             and coalesce(e.dismissed, false) = false)              as comp
  from   public.tracking_runs tr
  join   public.tracking_run_mentions m on m.tracking_run_id = tr.id
  left join public.entities e on e.id = m.entity_id
  group by tr.analysis_id
) x
where x.analysis_id = v.analysis_id;


-- ── 5. Content: titel losknippen van de opdracht ─────────────────────────────
-- Bevinding: content_pieces.title bevatte de instructie uit het rapport
-- ("Maak een overzichtelijke pagina met informatie over...") in plaats van de
-- kop van de pagina. De opdracht gaat niet verloren: hij verhuist naar
-- brief_instruction (nieuw in migratie 01).

update public.content_pieces
set    brief_instruction = coalesce(brief_instruction, title)
where  brief_instruction is null;

update public.content_pieces
set    title = 'Škoda private lease of zelf kopen: de voordelen op een rij'
where  brief_instruction ilike 'Maak een duidelijke pagina over de voordelen%';

update public.content_pieces
set    title = 'Škoda private lease in Tilburg'
where  brief_instruction ilike 'Maak een overzichtelijke pagina met informatie over lokale dealers%';

update public.content_pieces
set    title = 'Private lease of financial lease voor je Škoda: wat is het verschil?'
where  brief_instruction ilike 'Leg het verschil uit tussen private lease en financial lease%';


-- ── 6. existing_url naar de pagina die daadwerkelijk bestaat ─────────────────
-- Bevinding: het rapport vulde '/udenhout.nl/skoda' in — geen geldig pad en geen
-- geldige URL. De echte pagina was al bekend uit topic_research, inclusief citatie.

update public.content_pieces
set    existing_url = 'https://www.udenhout.nl/acties/skoda-private-lease'
where  existing_url is not null
  and  existing_url not like 'http%';


-- ── 7. Kapotte schema-markup ─────────────────────────────────────────────────
-- Bevinding: de landingspagina bevatte "telephone": "+31 " — een halve
-- placeholder die als geldige markup zou worden gekopieerd. Een ontbrekend veld
-- is beter dan een fout veld.

update public.content_pieces
set    schema_jsonld = regexp_replace(
         schema_jsonld,
         '\s*"telephone"\s*:\s*"\+?31\s*"\s*,?\n?', '', 'g')
where  schema_jsonld ~ '"telephone"\s*:\s*"\+?31\s*"';


-- ── 8. Onbewezen beweringen zichtbaar maken ──────────────────────────────────
-- Bevinding: 6 van de ~13 feitelijke claims in de content waren niet herleidbaar
-- tot enige bron. Zolang de contentbriefing nog niet gebouwd is, worden ze in
-- elk geval niet meer stilzwijgend als "ready" gepresenteerd.

-- Per pagina alléén de notities die op díe tekst van toepassing zijn.
with notities as (
  select
    c.id,
    (case when c.body_markdown ~* 'pechhulp'
          then array['Niet-onderbouwde bewering: "pechhulp inbegrepen" — komt in geen enkele bron voor.'] else '{}' end)
 || (case when c.body_markdown ~* 'vervangend vervoer'
          then array['Niet-onderbouwde bewering: "vervangend vervoer bij onderhoud of schade".'] else '{}' end)
 || (case when c.body_markdown ~* 'schadeherstel'
          then array['Niet-onderbouwde bewering: schadeherstel als onderdeel van het maandbedrag.'] else '{}' end)
 || (case when c.body_markdown ~* '24 maanden'
          then array['Niet-onderbouwde bewering: "leasecontracten vanaf 24 maanden".'] else '{}' end)
 || (case when c.body_markdown ~* 'kilometerbundel'
          then array['Niet-onderbouwde bewering: "keuze uit diverse kilometerbundels".'] else '{}' end)
 || (case when c.body_markdown ~* 'financial lease'
          then array['Niet geverifieerd: financial lease als keuze voor particulieren. Dit is doorgaans een zakelijk product.'] else '{}' end)
 || (case when c.body_markdown like '%Nieuwste modellen%'
          then array['Vergelijkingstabel: de rij "Nieuwste modellen — kopen ✗" is feitelijk onjuist en werkt tegen de autoverkoop van de klant. Herformuleren of schrappen.'] else '{}' end)
      as nieuwe_notities
  from public.content_pieces c
)
update public.content_pieces c
set    needs_review = true,
       review_notes = c.review_notes || n.nieuwe_notities
         || array['Laat deze punten door de klant bevestigen vóór publicatie (zie contentbriefing.md).']
from   notities n
where  n.id = c.id
  and  array_length(n.nieuwe_notities, 1) > 0;


-- ── 9. De onjuiste sterkte-claim in het rapport ──────────────────────────────
-- Bevinding: de samenvatting noemde "vergelijken van kosten en aanbiedingen" een
-- sterk punt. In precies die run wordt Van den Udenhout niet genoemd en tien
-- concurrenten wél — objectief de slechtst scorende vraag van de meting.
-- De drie vragen waar de klant wél gevonden wordt, werden nergens genoemd.

update public.reports
set    summary = replace(summary,
         'Uw sterke punten liggen bij het vergelijken van kosten en aanbiedingen, maar er is veel ruimte om beter gevonden te worden op populaire en koopgerichte vragen rond private lease van Skoda in Noord-Brabant.',
         'U wordt op dit moment bij 3 van de 30 vragen genoemd: over wat er in het maandbedrag zit, over inruilen bij een private lease in Den Bosch, en over private lease versus shortlease. Op de vraag hoe je lease-aanbiedingen vergelijkt wordt u juist niet genoemd terwijl tien andere partijen dat wél worden — daar ligt de grootste winst.')
where  summary like '%Uw sterke punten liggen bij het vergelijken%';

commit;

-- ============================================================================
-- Controle na afloop:
--
--   select count(*) from prompts where length(cluster) > 120;          -- 0
--   select score, share_of_voice, share_basis_count from visibility_scores;
--   select title, brief_instruction, existing_url, needs_review from content_pieces;
--   select canonical_name, entity_role, dismissed from entities order by entity_role;
--   select schema_jsonld like '%+31 %' from content_pieces where type = 'landing'; -- false
--
-- Terugdraaien van één tabel, bijvoorbeeld content_pieces:
--   update content_pieces c set title = (b.snapshot->>'title'), ...
--   from _backup_20260729 b
--   where b.source_table = 'content_pieces' and b.source_id = c.id;
-- ============================================================================
