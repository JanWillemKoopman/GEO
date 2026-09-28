-- 0120: is de eigen pagina geciteerd? (docs/tasks/van-pijplijn-naar-kennissysteem.md, M3, §6.4)
--
-- Waarom. De effectmeting wist tot nu toe alleen of het merk GENOEMD werd,
-- niet of de pagina zelf als BRON gebruikt werd. Dat is een ander signaal: een
-- assistent kan het merk noemen zonder ooit naar deze pagina te verwijzen, en
-- andersom. `computeImpact()` (`lib/pipeline/impact.ts`) rekent het nu uit met
-- `citeertEigenPagina()` (`lib/pipeline/impact-math.ts`, dezelfde regels als
-- `isRedirectedElsewhere()` in `lib/url.ts`): staat het gepubliceerde adres,
-- genormaliseerd, tussen de `cited_sources` van een eigen-merk-vermelding in
-- deze golf, dan is de pagina geciteerd.
--
-- NULL en niet false zonder gepubliceerd adres of zonder gemeten doelvragen
-- (conventie 3): onbekend is geen "nee".
--
-- Additief en idempotent (conventie 4).

alter table public.content_impact
  add column if not exists target_cited_own_page boolean;

comment on column public.content_impact.target_cited_own_page is
  'Is het gepubliceerde adres van de pagina geciteerd in minstens één antwoord op de doelvragen van deze golf (M3)? NULL = nog niet gemeten of geen adres bekend, niet "nee".';
