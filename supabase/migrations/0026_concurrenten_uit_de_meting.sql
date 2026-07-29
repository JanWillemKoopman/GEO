-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — concurrenten komen UIT de meting, niet uit een lijst vooraf
-- Migratie 0026.
--
-- Tot nu toe werd de mention-classificatie geseed met een vooraf gegenereerde
-- concurrentenlijst (profiles.competitors ∪ topic_research.competitors), met de
-- opdracht die namen expliciet te beoordelen "ook als het antwoord ze niet
-- noemt". Gevolg: elke vooraf bedachte naam kreeg een rij in élke meting, en
-- verscheen dus in 'Jij vs. concurrenten' — desnoods met een balk op 0%, ook
-- als geen enkel van de 30 antwoorden hem noemde. Wie de klant volgens ChatGPT
-- écht als alternatief krijgt voorgeschoteld, verdronk daartussen.
--
-- De meting ontdekt nu puur: elk merk dat in een antwoord voorkomt wordt een
-- entiteit. Dat maakt wél een vangnet nodig, want een autobedrijf krijgt naast
-- echte concurrenten ook AutoScout24, Marktplaats en de ANWB terug. Migratie
-- 0024 zette daar al `entity_role` voor klaar — die kolom werd alleen nergens
-- gebruikt. Deze migratie maakt hem bruikbaar.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Onderscheid tussen "nog niet geclassificeerd" en een echt oordeel ───────
-- entity_role uit 0024 staat op `not null default 'concurrent'`. Daardoor is
-- niet te zien of 'concurrent' een oordeel is of alleen de default die nooit
-- door iets is aangeraakt. Zonder dat onderscheid kan de classificatie niet
-- weten wat hij nog moet beoordelen, en zou hij een handmatige correctie van de
-- klant elke meting weer overschrijven.
alter table public.entities
  add column if not exists role_source text not null default 'onbepaald';

alter table public.entities
  drop constraint if exists entities_role_source_check,
  add  constraint entities_role_source_check
       check (role_source in ('onbepaald', 'ai', 'handmatig'));

comment on column public.entities.role_source is
  'Waar entity_role vandaan komt. onbepaald = nog te classificeren; ai = automatisch '
  'bepaald tijdens de aggregatie; handmatig = door de klant gezet, wordt nooit '
  'automatisch overschreven.';

-- Bestaande rijen dragen de default 'concurrent' zonder dat daar ooit een
-- oordeel aan te pas kwam. Ze staan al op 'onbepaald' door de default hierboven,
-- dus de eerstvolgende aggregatie classificeert ze alsnog.
--
-- `confirmed = true` blijft BEWUST 'onbepaald'. Die vlag lijkt een oordeel van de
-- klant, maar de oude ensureKnownEntities() zette hem óók voor elke naam uit de
-- vooraf gegenereerde lijst (autoConfirm = true). Die twee zijn in de bestaande
-- data niet van elkaar te onderscheiden, en juist die vooraf bedachte namen zijn
-- wat hier weg moet. Ze als 'handmatig' vastzetten zou het probleem vereeuwigen;
-- een concurrent die het écht is, komt er na classificatie gewoon weer in.
--
-- `dismissed = true` is wél eenduidig: niets zet dat automatisch, dus dat is een
-- echte beslissing van de klant en die blijft staan.
update public.entities
   set role_source    = 'handmatig',
       entity_role    = 'niet_relevant',
       exclude_reason = coalesce(exclude_reason, 'Door de klant weggezet als geen concurrent.')
 where dismissed = true;

-- Alleen nog te classificeren entiteiten opzoeken moet goedkoop zijn: dat
-- gebeurt bij elke aggregatie.
create index if not exists entities_role_source_idx
  on public.entities (profile_id, role_source);

-- ── Bestaande uitsplitsingen opschonen ──────────────────────────────────────
-- Wat er nu in competitor_breakdown staat is met de oude logica opgebouwd en
-- bevat dus rijen voor vooraf bedachte concurrenten die in geen enkel antwoord
-- voorkwamen — precies de lege balken in 'Jij vs. concurrenten'. De aggregatie
-- bouwt deze tabel per periode volledig opnieuw op (delete-then-insert), dus
-- deze opschoning wordt bij de volgende meting bevestigd en niet ongedaan
-- gemaakt.
--
-- LET OP: dit haalt de lege balken meteen weg, maar de rollen zijn pas bekend ná
-- de eerstvolgende aggregatie. Tot dat moment kan er dus nog een vergelijker
-- tussen de concurrenten staan die daar straks uit verdwijnt.
delete from public.competitor_breakdown
 where mentions_count = 0;
