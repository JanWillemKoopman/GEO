-- ═══════════════════════════════════════════════════════════════════════════
-- GEO Tracker — bewijslaag onder het rapport
-- Migratie 0027. Hoort bij implementatieplan.md R1.3.
--
-- Het rapport kon beweringen doen die de meetdata niet droeg. Bij Van der Valk
-- stond in de aanbeveling met prioriteit 1 dat "Het Oude Raadhuis Hoofddorp en
-- Dotslash Utrecht hier wel scoren" — terwijl in het antwoord op díe vraag geen
-- enkel bedrijf genoemd werd. Die twee namen kwamen uit een andere vraag (V5).
--
-- Oorzaak: de gemiste vragen gingen zónder run-ID de prompt in, de
-- concurrentiedata mét. De koppeling "welke concurrent wint wélke vraag" was
-- daarmee nergens gelegd, terwijl dat precies was wat het model moest
-- opschrijven. Het gokte.
--
-- R1.1 en R1.2 lossen dat op aan de invoerkant (bewijsdossier per vraag,
-- expliciete bewijsregel in de instructie). Deze migratie hoort bij R1.3: het
-- deterministische vangnet dáárachter. Elke concurrentnaam in een `why`- of
-- `problem`-veld wordt na afloop getoetst tegen het bewijs van de vraag waaraan
-- hij hangt; wat niet klopt, gaat eruit en wordt hier vastgelegd.
--
-- Volledig ADDITIEF: één nullable kolom, geen bestaande kolom gewijzigd.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.reports
  add column if not exists stripped_claims_json jsonb;

comment on column public.reports.stripped_claims_json is
  'Beweringen die de claimvalidator uit dit rapport verwijderd heeft omdat de '
  'genoemde concurrent niet voorkwam in het bewijs van de gekoppelde vraag '
  '(implementatieplan.md R1.3). Null of een lege lijst is de gezonde toestand. '
  'Blijft dit veld structureel gevuld, dan is dat het signaal dat de '
  'bewijsregel in de rapportinstructie (R1.2) nog niet streng genoeg is — de '
  'validator is een vangnet, geen werkende oplossing op zichzelf.';

-- Controle: hoort 't' terug te geven.
select count(*) = 1 as kolom_bestaat
  from information_schema.columns
 where table_schema = 'public'
   and table_name   = 'reports'
   and column_name  = 'stripped_claims_json';
