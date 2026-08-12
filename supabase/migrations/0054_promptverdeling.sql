-- 0054: de promptverdeling per analyse instelbaar
--
-- ── WAT DIT OPLOST ─────────────────────────────────────────────────────────
--
-- Tot nu toe stond het aantal vragen per funnelfase vast op 10, in code
-- (`promptsPerFunnelStage` in lib/config.ts), gelijk voor alle drie de fasen en
-- voor alle klanten. Dat is voor de meeste analyses prima, maar niet altijd
-- juist: dezelfde installateur wil bij "cv-ketel onderhoud" vooral
-- beslissingsvragen ("wie kan dit voor mij doen in Den Bosch") en bij
-- "warmtepomp subsidie" juist oriëntatievragen, want daar is de koper nog aan
-- het uitzoeken wát hij wil.
--
-- Daarom per ANALYSE en niet per merk: de verdeling hangt aan het onderwerp.
--
-- ── WAAROM DRIE KOLOMMEN EN GEEN JSONB ─────────────────────────────────────
--
-- Een jsonb-veld met de fasenamen als sleutel zou flexibeler zijn, maar een
-- typefout in zo'n sleutel doet dan stilzwijgend niets: de instelling lijkt
-- opgeslagen en de generatie gebruikt gewoon de standaard. Dat is precies het
-- soort stille fout dat de ronde van 12 augustus (F5) moest uitroeien. Drie
-- kolommen met een check kunnen die fout niet maken.
--
-- ── NULL IS "GEBRUIK DE STANDAARD", NUL IS EEN KEUZE ───────────────────────
--
-- Per fase apart. Zet iemand alleen de beslissingsfase op 20 en laat hij de rest
-- leeg, dan wordt dat 10/10/20 en niet 10/10/10 met een genegeerde instelling.
-- En nul is toegestaan: een analyse zonder oriëntatievragen is een geldige keuze
-- voor een lokale ondernemer die alleen op koopmomenten beoordeeld wil worden.
--
-- Additief en idempotent, conventie 4.

alter table public.analyses
  add column if not exists prompts_orientatie smallint,
  add column if not exists prompts_overweging smallint,
  add column if not exists prompts_beslissing smallint;

comment on column public.analyses.prompts_orientatie is
  'Aantal vragen in de funnelfase Oriëntatie. Null = de standaard uit lib/prompt-mix.ts (10). Zie migratie 0054.';
comment on column public.analyses.prompts_overweging is
  'Aantal vragen in de funnelfase Overweging. Null = de standaard uit lib/prompt-mix.ts (10).';
comment on column public.analyses.prompts_beslissing is
  'Aantal vragen in de funnelfase Beslissing. Null = de standaard uit lib/prompt-mix.ts (10).';

-- De bovengrens per fase is 40, dezelfde als MAX_PER_STAGE in lib/prompt-mix.ts.
-- Daarboven wordt één generatie-aanroep zo lang dat hij tegen de tijdslimiet van
-- de werker aan loopt, ook nu de generatie per fase een eigen taak heeft.
--
-- De database bewaakt alleen het bereik per kolom en niet het totaal van 90: dat
-- laatste is een productbesluit over kosten en hoort in de code te staan waar de
-- melding erbij past. De database bewaakt wat onmogelijk is, de code bewaakt wat
-- onverstandig is.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'analyses_prompt_mix_check') then
    alter table public.analyses
      add constraint analyses_prompt_mix_check check (
        (prompts_orientatie is null or (prompts_orientatie >= 0 and prompts_orientatie <= 40))
        and (prompts_overweging is null or (prompts_overweging >= 0 and prompts_overweging <= 40))
        and (prompts_beslissing is null or (prompts_beslissing >= 0 and prompts_beslissing <= 40))
      );
  end if;
end $$;
