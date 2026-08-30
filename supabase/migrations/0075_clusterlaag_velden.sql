-- 0075: de clusterlaag krijgt drie gerichte velden in plaats van één notitie
--
-- ── WAT DIT OPLOST ─────────────────────────────────────────────────────────
--
-- docs/optimalisatielab-orbit-engine.md, werkpakket A, §3.1 vraagt een
-- "invulomgeving met drie lagen": merk, cluster, pagina. De merklaag bestaat
-- al volledig (`profiles` + `BRAND_FIELDS` + het stafscherm). De clusterlaag
-- had tot nu precies één vrij tekstveld, `profile_topics.client_note`, met de
-- generieke placeholder "Wat zei de klant hierover?". Dat werkt voor niets in
-- het bijzonder: bij Van der Valk stond er "hier komt 40% van de omzet
-- vandaan" in, en bij het volgende cluster "klanten vragen hier vaak naar
-- parkeren" in precies hetzelfde vak. Twee heel verschillende soorten
-- informatie, niet van elkaar te onderscheiden zodra ze zijn opgeslagen.
--
-- §3.1 noemt drie concrete vragen voor de clusterlaag: wat klanten hierover
-- het vaakst vragen, wat er misgaat, en waarin dit bedrijf zich onderscheidt
-- van de concurrent op dit onderwerp. Drie losse kolommen in plaats van drie
-- alinea's in één tekstvak, want zonder die scheiding leest niemand een
-- half jaar later terug welk stukje welke vraag beantwoordde.
--
-- ── `client_note` BLIJFT STAAN (conventie 4, additief) ──────────────────────
--
-- Geen `drop`, geen hernoeming. Bestaande profielen hebben deze notitie al
-- ingevuld (2 van de 4 gemeten profielen), en die tekst gaat niet verloren:
-- `lib/pipeline/topic-brief.ts` valt op `client_note` terug zolang geen van
-- de drie nieuwe velden is ingevuld, en de UI toont hem als "eerdere
-- aantekening" totdat iemand de nieuwe velden invult.
alter table public.profile_topics
  add column if not exists client_questions text,
  add column if not exists client_friction  text,
  add column if not exists client_edge      text;

comment on column public.profile_topics.client_questions is
  'Clusterlaag (0075): wat klanten over dit onderwerp het vaakst vragen, '
  'zoals de klant het tijdens het strategisch gesprek vertelt.';
comment on column public.profile_topics.client_friction is
  'Clusterlaag (0075): wat er op dit onderwerp vaak misgaat, of waar klanten '
  'op afhaken.';
comment on column public.profile_topics.client_edge is
  'Clusterlaag (0075): waarin dit bedrijf zich op dit onderwerp onderscheidt '
  'van de concurrent.';

-- Controle: de drie kolommen bestaan en zijn los van `client_note` te vullen.
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profile_topics'
  and column_name in ('client_note', 'client_questions', 'client_friction', 'client_edge')
order by column_name;
