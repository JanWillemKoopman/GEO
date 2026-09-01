-- 0078: zichtbaar wat een rapport overwoog maar niet voorstelde
--
-- ── WAT DIT OPLOST ─────────────────────────────────────────────────────────
--
-- docs/optimalisatielab-orbit-engine.md, werkpakket C §5.1: naast "nu aan de
-- beurt" en "voorraad" een derde niveau, afgevallen, "met de reden erbij,
-- zodat je kunt zien of de toets te streng of te soepel staat."
--
-- Tot nu toe is die afwijzing ONZICHTBAAR: het rapportmodel beslist intern of
-- een gemeten gemis de vier eisen uit werkpakket B §4.2 haalt (gemeten, de
-- klant heeft er iets over te zeggen, geen dekkende bestaande pagina, geen
-- overlap), en wat niet haalt verschijnt gewoon nergens. Dat is niet na te
-- rekenen: een lege plek in de lijst kan een terechte afwijzing zijn of een te
-- strenge instructie, en zonder de reden is dat verschil niet te zien.
--
-- `reports.declined_json` legt vast wat het model overwoog en waarom het geen
-- aanbeveling werd. Additief en idempotent (conventie 4): geen bestaande rij
-- verandert, oudere rapporten hebben simpelweg `null`.
alter table public.reports
  add column if not exists declined_json jsonb;

comment on column public.reports.declined_json is
  '[{cluster, problem, reason}] (0078): gemeten gemissen die het rapportmodel '
  'overwoog maar niet als aanbeveling opnam, met de reden. Null voor rapporten '
  'van vóór deze migratie. Voedt het "afgevallen"-niveau van de contentvoorraad, '
  'zie docs/optimalisatielab-orbit-engine.md werkpakket C §5.1.';
