-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — van één getal naar een zichtbaarheidsprofiel
-- Migratie 0029. Hoort bij implementatieplan.md R3.
--
-- ── WAT HIER MIS WAS ────────────────────────────────────────────────────────
--
-- "Genoemd ja/nee" is een grove maat. Als vijfde genoemd worden ná drie
-- concurrenten is iets heel anders dan als eerste aanbevolen worden, en dat
-- verschil bepaalt of een klant daadwerkelijk klanten binnenkrijgt.
--
-- Drie dingen lagen al in de database en werden nergens gebruikt:
--
--   • `position` is bij ALLE 650 mention-rijen gevuld en komt in geen enkele
--     score, geen rapport en geen aanbeveling terug.
--   • Geciteerd worden telt niet mee. Fysi-Unique wordt vaker als BRON
--     aangehaald (4×) dan als merk genoemd (3×) — en juist die bron is de link
--     waarop een gebruiker doorklikt.
--   • `sentiment` levert niets op: in 650 rijen komt 'negative' geen enkele keer
--     voor en 'positive' bij één analyse. Het staat in de README als feature,
--     wordt bij elke meting door het model bepaald, wordt opgeslagen — en wordt
--     in de hele applicatie nergens getoond. Meetkosten zonder opbrengst.
--
-- Zie kwaliteitsanalyse-5-testcases.md §2.3, §2.4 en §2.5.
--
-- ── WAT ERVOOR IN DE PLAATS KOMT ────────────────────────────────────────────
--
-- `mention_role` vervangt sentiment als het derde kenmerk van een vermelding.
-- Niet "hoe wordt erover gesproken" (waar geen variatie in zit) maar "hoe
-- prominent word je genoemd" — dat varieert wél en stuurt het advies:
--
--   eerste_aanbeveling — de AI noemt dit merk als eerste of beste keuze
--   een_van_meerdere   — één van een rijtje gelijkwaardige opties
--   zijdelings         — terloops genoemd, niet als aanbeveling
--
-- `sentiment` blijft als kolom BESTAAN (additief principe) maar wordt niet meer
-- gevuld. Weggooien zou de historie van de bestaande metingen vernietigen, en
-- die is met terugwerkende kracht niet opnieuw te maken.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. De rol van een vermelding ───────────────────────────────────────────
alter table public.tracking_run_mentions
  add column if not exists mention_role text;

alter table public.tracking_run_mentions
  drop constraint if exists tracking_run_mentions_role_check,
  add  constraint tracking_run_mentions_role_check
       check (mention_role is null
              or mention_role in ('eerste_aanbeveling', 'een_van_meerdere', 'zijdelings'));

comment on column public.tracking_run_mentions.mention_role is
  'Hoe prominent dit merk in het antwoord staat (implementatieplan.md R3). '
  'Vervangt sentiment, dat in 650 rijen geen enkele keer varieerde. Null als '
  'het merk niet genoemd werd, of bij metingen van vóór R3.';

comment on column public.tracking_run_mentions.sentiment is
  'VERVALLEN sinds R3 (migratie 0029): wordt niet meer gevuld. In 650 metingen '
  'kwam negative geen enkele keer voor en positive bij één analyse, en de waarde '
  'werd nergens in de applicatie getoond. Kolom blijft bestaan voor de historie '
  'van bestaande metingen; gebruik mention_role.';

-- ── 2. Het profiel per periode ─────────────────────────────────────────────
alter table public.visibility_scores
  add column if not exists avg_position        numeric,
  add column if not exists citation_count      integer,
  add column if not exists first_mention_count integer;

comment on column public.visibility_scores.avg_position is
  'Gemiddelde positie waarop het eigen merk in het antwoord staat, over de '
  'metingen waarin het genoemd wordt. Lager is beter. Null als het merk nergens '
  'genoemd werd.';

comment on column public.visibility_scores.citation_count is
  'Aantal metingen waarin het eigen DOMEIN als bron geciteerd wordt. Een tweede '
  'vorm van zichtbaarheid naast genoemd worden — en vaak de waardevolste, want '
  'een geciteerde bron is de link waarop de gebruiker doorklikt.';

comment on column public.visibility_scores.first_mention_count is
  'Aantal metingen waarin het eigen merk als EERSTE AANBEVELING genoemd wordt '
  '(mention_role). Het verschil tussen "je staat erbij" en "je wordt aangeraden".';

-- ── 3. Hetzelfde per concurrent, anders valt er niets te vergelijken ───────
alter table public.competitor_breakdown
  add column if not exists avg_position        numeric,
  add column if not exists first_mention_count integer;

comment on column public.competitor_breakdown.avg_position is
  'Gemiddelde positie van deze concurrent in de antwoorden waarin hij voorkomt. '
  'Naast het eigen avg_position te leggen: even vaak genoemd maar structureel '
  'later is een heel ander verhaal dan even vaak én even prominent.';

-- ── 4. Opzoeken op rol moet goedkoop zijn ──────────────────────────────────
create index if not exists mentions_role_idx
  on public.tracking_run_mentions (tracking_run_id, mention_role)
  where mention_role is not null;

-- Controle: hoort 4 kolommen terug te geven.
select count(*) as nieuwe_kolommen
  from information_schema.columns
 where table_schema = 'public'
   and (
     (table_name = 'tracking_run_mentions' and column_name = 'mention_role')
     or (table_name = 'visibility_scores'
         and column_name in ('avg_position', 'citation_count', 'first_mention_count'))
   );
