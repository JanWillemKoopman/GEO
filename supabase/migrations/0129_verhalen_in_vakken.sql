-- 0129: "Verhalen" in vier vakken, en bezwaren met het antwoord van de ondernemer
-- (besluit B28 in docs/tasks/contentketen-opnieuw.md §2, V5 van
-- docs/tasks/pijplijnanalyse-contentketen.md).
--
-- Waarom: in ronde 1 ging het hele verhalenveld (3.169 tekens) als één item naar
-- elke pagina, en stond dezelfde boodschap daardoor vijf keer in de invoer van de
-- schrijver. Bezwaren kwamen zonder antwoord ("Is het niet duur?"). Vier losse
-- vakken maken van elke klus een eigen item en laten de werkwijze één keer
-- merkbreed meegaan; een bezwaar krijgt het antwoord van de ondernemer erbij.
--
-- Het oude veld `verhalen` blijft staan en blijft werken (conventie 4).
-- Additief en idempotent.
alter table public.profiles add column if not exists verhaal_klussen text;
alter table public.profiles add column if not exists verhaal_werkwijze text;
alter table public.profiles add column if not exists verhaal_niet text;
alter table public.profiles add column if not exists verhaal_begin text;
alter table public.profiles add column if not exists bezwaren_met_antwoord text;

comment on column public.profiles.verhaal_klussen is 'Typische klussen, één per alinea. Elke alinea wordt een eigen verhaal-item in de kennislaag (0129).';
comment on column public.profiles.verhaal_werkwijze is 'Hoe het bedrijf werkt, in de woorden van de ondernemer (0129).';
comment on column public.profiles.verhaal_niet is 'Wat het bedrijf bewust niet doet (0129).';
comment on column public.profiles.verhaal_begin is 'Waarom de ondernemer ooit begon (0129).';
comment on column public.profiles.bezwaren_met_antwoord is 'Bezwaren van klanten met wat de ondernemer dan zegt, één per alinea (0129).';
