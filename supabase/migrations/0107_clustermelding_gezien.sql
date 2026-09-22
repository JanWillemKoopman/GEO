-- ═══════════════════════════════════════════════════════════════════════════
-- ORBIT ENGINE: onthouden of de uitslag van een cluster al gemeld is
-- Migratie 0107 (docs/tasks/clusterresultaat-zonder-eigen-scherm.md).
--
-- WAAROM DEZE KOLOM ER MOET ZIJN
--
-- De resultatenpagina van een cluster (`/analyses/[id]`) verdwijnt. Wat die
-- pagina deed en wat niemand anders doet: elke paar seconden de status
-- opvragen, zodat het moment waarop de meting klaar is niet ongemarkeerd
-- voorbijgaat. Een meting duurt minuten, en de klant staat dan ergens anders
-- in de app of is weg van zijn scherm.
--
-- In plaats daarvan meldt de app het zelf, met een melding rechtsonder. Die
-- melding mag precies één keer komen: zonder een vastgelegd moment zou hij bij
-- elke schermopening opnieuw verschijnen, en dat is binnen een dag de melding
-- die iedereen wegklikt zonder te lezen.
--
-- `resultaat_gezien_at` is dat moment. Leeg betekent "deze uitslag is nog
-- nooit gemeld". Dat is ook meteen het antwoord op het tweede geval: wie pas
-- de volgende ochtend inlogt, krijgt de melding alsnog, in plaats van dat de
-- uitslag ongezien voorbij is gegaan.
--
-- WAAROM GEEN EIGEN TABEL MET MELDINGEN
--
-- Er is precies één gebeurtenis per cluster per meetronde, en het cluster
-- draagt die gebeurtenis zelf al (`status` plus `updated_at`). Een eigen tabel
-- zou dezelfde waarheid een tweede keer opslaan, met het risico dat de twee
-- uit elkaar lopen. Eén kolom naast de status houdt het bij één eigenaar.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.analyses
  add column if not exists resultaat_gezien_at timestamptz;

comment on column public.analyses.resultaat_gezien_at is
  'Wanneer de uitslag van de laatste meetronde aan de gebruiker gemeld is. Leeg = nog niet gemeld. Wordt op null gezet zodra er een nieuwe ronde start (lib/jobs/queue.ts), zodat elke ronde zijn eigen melding krijgt.';

-- Bestaande clusters zijn al lang en breed bekeken: die hoeven bij de eerste
-- schermopening na deze migratie geen melding meer te krijgen. Zonder deze
-- regel krijgt een klant met twaalf gemeten clusters twaalf meldingen tegelijk
-- over uitslagen van weken geleden.
update public.analyses
  set resultaat_gezien_at = coalesce(updated_at, now())
  where resultaat_gezien_at is null
    and status in ('gereed', 'gemeten', 'mislukt');

-- Controle: geen enkel afgerond cluster staat nog op "nog te melden".
select
  count(*) filter (where resultaat_gezien_at is null and status in ('gereed', 'gemeten', 'mislukt')) as nog_te_melden,
  count(*) as clusters
from public.analyses;
