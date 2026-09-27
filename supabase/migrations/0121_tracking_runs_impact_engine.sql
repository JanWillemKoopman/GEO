-- 0121: de idempotentiesleutel van een impactmeting kent de bron
-- (docs/tasks/van-pijplijn-naar-kennissysteem.md, M3, §6.4)
--
-- Waarom. Migratie 0020 maakte `tracking_runs_impact_unique_idx` op
-- (content_piece_id, impact_wave, prompt_id, purpose), zonder `engine`. Dat was
-- genoeg zolang een impactmeting alleen via ChatGPT liep. Sinds M3 ook AI
-- Overview meemeet in een golf (`lib/pipeline/impact.ts`, `planImpactMeasurements()`),
-- botsen de twee bronnen op precies dezelfde sleutel: de tweede insert (AI
-- Overview) zou de rij van de eerste (ChatGPT) zien als "dit bestaat al" op de
-- verkeerde gronden, of erger, de insert zou stuklopen op de unieke index NA de
-- betaalde zoekactie (dezelfde fout als 0066 beschrijft voor de periodieke
-- meting, nu voor de impactmeting).
--
-- De oplossing is dezelfde lijn als 0066: de sleutel krijgt de kolom die het
-- verschil moet dragen. Dit maakt de index STRIKTER (meer kolommen moeten
-- gelijk zijn om als duplicaat te tellen), dus geen bestaande rij kan in
-- strijd zijn met de nieuwe index; een vooraf-telling zoals 0066 die deed is
-- daarom niet nodig.
--
-- Alleen een indexdefinitie vervangen, geen rijen weg (conventie 4).

drop index if exists public.tracking_runs_impact_unique_idx;

create unique index if not exists tracking_runs_impact_unique_idx
  on public.tracking_runs (content_piece_id, impact_wave, prompt_id, purpose, engine)
  where content_piece_id is not null;
