# Supabase, schema & migraties

Datamodel en schrijfstrategie: [`../docs/architecture.md`](../docs/architecture.md) §2–§3.

## Regels

- **Additief en idempotent.** `add column if not exists` / `create table if not exists`, nooit
  `drop`. Opnieuw uitvoeren is altijd veilig.
- Elke migratie opent met een Nederlands commentaarblok: wat het probleem was, met welke gemeten
  cijfers, en waarom deze oplossing. Onderaan een `select` die controleert dat het gelukt is.
- Het nummer volgt de **toepassingsvolgorde**, niet de plannings volgorde.
- **RLS is SELECT-only.** Alle schrijfacties lopen via de Next.js API-routes met de service-role
  key + expliciete ownership-check. `jobs` heeft RLS aan en nul policies. Geen enkele
  client-toegang, ook geen SELECT.

## Toepassen

```bash
supabase link --project-ref <ref>
supabase db push
```

Op productie gaat dit via de Supabase MCP-tool (`apply_migration`). Zonder CLI: de bestanden in
volgorde in de SQL Editor plakken, of de `RUN_*.sql`-bundels vanaf 0012.

> **Eén valkuil in `RUN_0012_TOT_0017.sql`, STAP 3:** `alter type … add value` mag in Postgres niet
> in dezelfde transactie gebruikt worden als waarin je hem toevoegt, en de SQL Editor draait je
> selectie als één transactie. Selecteer die regel en voer hem los uit.
> STAP 7 is optioneel, alleen nodig om de werker vanuit Postgres aan te sturen (zet dan eerst de
> twee Vault-geheimen, zie `docs/architecture.md` §9).

## Index

Alle migraties zijn toegepast op productie, behalve `0033`.

| Bestand | Wat het toevoegt |
|---|---|
| `0001_init.sql` | Basistabellen, enums, indexes, `updated_at`-triggers |
| `0002_rls.sql` | Row Level Security: SELECT-only policies, `jobs` = deny-all |
| `0003_content_quality.sql` | Concrete feiten + stijlvoorbeelden op `brand_dna` |
| `0004_profiles.sql` | Account-brede `profiles`; merkonderzoek verhuist van analyse naar profiel |
| `0005_profile_pages.sql` | Contentinventaris uit een beperkte crawl |
| `0006_profile_crawl_settings.sql` | `sitemap_url`, `max_inventory_pages` per profiel |
| `0007_profile_intake.sql` | Intake-velden voor onboarding |
| `0008_profile_onboarding_fields.sql` | Uitgebreide onboardingvelden (aliassen e.d.) |
| `0009_prompt_taxonomy.sql` | Intentie/funnel/tags/geschat volume per prompt |
| `0010_weighted_visibility.sql` | Volume-gewogen score naast de ongewogen |
| `0011_analysis_content_brief.sql` | Vrije-tekst content-brief per analyse |
| `0012_ai_calls_ledger.sql` | `ai_calls`-kostenlogboek |
| `0013_jobs_queue.sql` | De `jobs`-wachtrij (status/pogingen/planning/dedupe-index) |
| `0014_analysis_notifications.sql` | "Klaar"-notificaties nu werk op de achtergrond draait |
| `0015_worker_cron_via_pg_cron.sql` | De werker via pg_cron i.p.v. Vercel Cron (Hobby-limiet) |
| `0016_measurement_quality.sql` | Onzekerheidsmarge/betrouwbaarheid per meting |
| `0017_volume_bands.sql` | Drie volumebanden i.p.v. een verzonnen 0–100 getal |
| `0018_technical_audit.sql` | Kunnen AI-crawlers de site bereiken? |
| `0019_content_targets.sql` | Doelvragen, versies, GEO-score, feitenvragen |
| `0020_content_impact.sql` | Publicatie-tracking + effectmeting |
| `0021_periodic_reports.sql` | Trend + terugkerende rapportage over meerdere periodes |
| `0022_offsite.sql` | Bronnenlandschap, presence-checks, off-site taken |
| `0023_content_piece_uniqueness.sql` | Precies één `is_current` content-stuk per pagina/titel |
| `0024_contentbriefing_schema.sql` | Schema voor de contentbriefing (feitenkaart, claim-audit, vragen) |
| `0025_dataopschoning_udenhout.sql` | Dataherstel na de eerste praktijktest (met rij-snapshot vooraf) |
| `0026_concurrenten_uit_de_meting.sql` | Concurrenten komen uit de meting, niet uit een lijst vooraf |
| `0027_bewijslaag.sql` | `reports.stripped_claims_json`, audit-trail van de claimvalidator |
| `0028_meetbaarheid.sql` | `brands_in_answer`, `brand_eliciting`, `winnable_runs`/`brandless_runs` + backfill |
| `0029_zichtbaarheidsprofiel.sql` | `mention_role`, `avg_position`, `citation_count`, `first_mention_count` |
| `0030_concurrent_intelligence.sql` | `competitor_breakdown.attributes_json` / `why_summary` |
| `0031_gelaagd_hermeten.sql` | `tracking_runs.repeat_index` + index |
| `0032_bedrijfsmodel.sql` | `profiles.business_model` (nullable + check-constraint) |
| *`0033`* | **VERVALLEN.** Stond gereserveerd voor R6.2 (inventariskwaliteit); die kolom zit sinds `0039` in de onboarding-pijplijn. Nooit gedraaid, en dat blijft zo. |
| `0034_vrijgave.sql` | `content_pieces.reviewed_at`/`reviewed_by` + partiële index |
| `0035_merkdocumenten.sql` | `brand_documents`: brontekst, sha256-hash, extractietellers |
| `0036_feitenbank.sql` | `brand_facts`: feit met identiteit, scope en `superseded_by` |
| `0037_winbaarheid_als_kans.sql` | `prompts.elicit_successes`/`elicit_samples` + backfill |
| `0038_superuser_en_toewijzing.sql` | `staff_users` + `is_staff()` + één extra selectpolicy per tabel; `profiles.created_by_user_id`/`assigned_at` |
| `0039_profielverdieping.sql` | `profile_facets`, `profile_offerings` (aanbodboom), `profile_field_sources` (herkomst per veld); `inventory_quality_json`, `onboarding_budget_usd`, `deep_research_at` |
| `0040_topics_en_strategie.sql` | `profile_topics` (5–8 core topics) en `profile_strategy` (gespreksuitkomst + contextfactoren) |
| `0041_multi_engine.sql` | `ai_calls.engine`, `profiles.engines_enabled`, de idempotentie-index van `tracking_runs` mét engine, en `profile_llm_baseline` |
| `0042_rls_aanscherping.sql` | `is_staff()` niet meer aanroepbaar door `anon`, stafpolicies expliciet op `authenticated`, vast zoekpad op `set_updated_at()` |
| `0043_topic_aanbodnamen.sql` | `profile_topics.offering_names`, de aanbodkoppeling van een onderwerp overleeft een herbouw van de boom, want een `uuid[]` kan geen foreign key hebben |
| `0044_archief.sql` | `archived_at` op `profiles` en `analyses`, verborgen uit alle lijsten, tellingen én de maandelijkse meetronde, maar volledig aanwezig in de database |
| `0045_klantprofiel_verrijking.sql` | `profiles.taboo_phrases`/`compliance_notes`/`author_*`/`tone_*` (formality, energy, complexity, humor), naar het voorbeeld van InSpace Nova's onboardingstappen (`docs/tasks/nova-analyse.md`) |
| `0046_accounts.sql` | `accounts` + `account_users` + `profiles.account_id`. De laag boven het merk: een klant kan een bureau zijn met meerdere merken (besluit 9) en meerdere websites hebben (besluit 10). Zie `docs/Nova.md` §0. Backfill maakt per bestaande eigenaar één account. RLS verruimd met een derde SELECT-laag; de bestaande twee blijven staan |
| `0047_uitnodigingen.sql` | `account_invites`. De enige deur naar binnen: registreren staat dicht (`signupsEnabled`), dus toegang loopt via een uitnodigingslink. Bewaart alleen de SHA-256 van het token, nooit het token zelf. **Nul RLS-policies**, net als `jobs`: alleen de service-role komt erbij |
| `0048_merkprofiel_compleet.sql` | De laatste dertien velden van het merkprofiel uit de inventaris in `docs/Nova.md` §13: missie, positionering, USP, kernboodschappen, identiteitswoorden, onderscheid, tweede doelgroep, kennisniveau, de vijfde tone-schuif, vaste uitdrukkingen, aanspreekvorm en drie auteursvelden. Alles wat al een eigenaar had staat er bewust niet nóg een keer bij; de vertaaltabel staat bovenaan de migratie |
| `0049_contentplan.sql` | `profile_funnel_stages` + `content_plans` + `plan_months` + `planned_pages`. Het kernobject van besluit 3: twaalf maanden vooruit, goedkeuring per maand, buffers per maand. Géén looptijd, want doorlopend opzegbaar (besluit 7). Nieuwe hulpfunctie `readable_profile_ids()` deelt de drielaagse toegangsregel over de vier tabellen |
| `0050_plan_cron.sql` | `trigger_plan_writer()` + een dagelijkse pg_cron-taak (`aura-plan-writer`, 04:00 UTC, sinds `0059` hernoemd naar `orbit-engine-plan-writer`) die `/api/cron/plan` aanroept. Zelfde patroon en dezelfde twee vault-geheimen als `0015`: dit is alleen de aanroeper, de beslissing staat in `lib/plan-writing.ts`. Draait NIET in de ketentest (pg_cron ontbreekt daar), zie de overslaglijst in `scripts/chain/postgres.ts` |
| `0051_opbrengst.sql` | `accounts.value_per_mention_eur`. Besluit 16: de waarde per vermelding is een OPTIONELE parameter van het opbrengstblok. Leeg toont aantallen, een bedrag toont geld, dus er hoeft geen scherm om zodra de prijzen er zijn. Per account en niet per merk, want wat een vermelding waard is hangt aan het bedrijf en zijn marge. Bewust geen standaardwaarde (conventie 3) |
| `0052_search_console.sql` | `profiles.gsc_*` (property, verificatie, laatste fout, eerste dag) en `search_console_days` (klikken, vertoningen, positie per pagina per dag). Service account in plaats van OAuth, want de `webmasters`-scopes zijn bij Google "sensitive" en dat betekent weken verificatie voor nul extra waarde; zie `docs/tasks/zoekdata-koppeling.md` §2. De unieke sleutel `(profile_id, day, page)` maakt van Google's naijlende correcties een correctie in plaats van een dubbele rij |

## Na `0038`, eenmalig, met de hand

De migratie maakt `staff_users` leeg aan. De eigenaar zet zichzelf erin:

```sql
insert into public.staff_users (user_id)
select id from auth.users where email = '<eigenaar>' on conflict do nothing;
```

Bewust niet in de migratie: een hardgecodeerd account-ID in versiebeheer is een achterdeur die
niemand meer terugvindt.

## 0053 · budgetplafond

`ai_calls.account_id` (gevuld door trigger `ai_calls_set_account`, plus backfill van alle bestaande
rijen), twee indexen voor de twee tellingen, en `accounts.monthly_budget_eur`. De trigger leidt het
account af uit `profile_id` of anders uit `analysis_id` via het profiel eronder; hij zit in de
database en niet in `lib/openai/ledger.ts`, omdat dat logboek best-effort is en geen extra
netwerkronde mag doen. Zie `lib/spend-rules.ts` en `docs/tasks/lanceerplan.md` F1.

Toegepast op productie op 11 augustus 2026: 1.140 bestaande rijen kregen allemaal een account, nul
bleven er over.

## 0054 · promptverdeling per analyse

`analyses.prompts_orientatie` / `prompts_overweging` / `prompts_beslissing`, alle drie nullable met
een check op 0 t/m 40. Null per fase betekent de standaard van 10 uit `lib/prompt-mix.ts`; nul is een
geldige keuze en géén "niet ingevuld". Drie kolommen en geen jsonb, omdat een typefout in een
jsonb-sleutel stilzwijgend niets doet en dat precies de fout is die de ronde van 12 augustus (F5)
moest uitroeien.

De database bewaakt alleen het bereik per kolom, niet het totaal van 90: dat laatste is een
productbesluit over kosten en staat in `lib/prompt-mix.ts`, waar de melding erbij past.

## 0055 · interne functies en de les eronder

Trekt het uitvoerrecht in op `ai_calls_resolve_account()`, de triggerfunctie uit 0053. Die hoort niet
in de publieke API en geen enkele RLS-regel gebruikt hem.

⚠️ **De eerste versie deed dit ook bij `is_staff()`, `readable_profile_ids()` en
`user_account_ids()`, en dat brak de app.** Een RLS-regel wordt geëvalueerd namens de bevragende rol,
dus die rol moet de functie in die regel mogen aanroepen. Zonder dat recht faalt niet de regel maar de
hele query, met "permission denied for function is_staff", op alle 28 tabellen tegelijk. Direct
teruggedraaid; de migratie zet die rechten nu expliciet terug als vangnet.

`scripts/test-chain.ts` controleert sindsdien dat élke functie die in een RLS-regel voorkomt
aanroepbaar is door `authenticated`. Die test is rood gemaakt om te bewijzen dat hij de fout vangt.

## 0056 · de accountlaag op alle leesregels

Voegt op 23 tabellen een `_select_account`-regel toe naast de bestaande `_select_own` en
`_select_staff` (Postgres combineert PERMISSIVE policies met OR, dus dit raakt niets bestaands, zie
0038 voor dezelfde afweging). Plus een nieuwe helperfunctie `readable_analysis_ids()`, gebouwd op
`readable_profile_ids()` (0046).

⚠️ **De vondst erachter.** `analyses` en `profiles` kenden al drie lagen: eigenaar, account, beheerder.
De 23 tabellen die eraan hangen (`prompts`, `tracking_runs`, `reports`, `content_pieces`,
`profile_topics`, en meer) hadden er maar twee: eigenaar en beheerder. Gevolg: elk tweede teamlid dat
je ooit bij een klantaccount uitnodigt (de route "Merk toewijzen" zet `user_id` op precies één
gekozen gebruiker) zag zijn hele dossier leeg, niet een foutmelding, gewoon nul vragen, geen score,
een leeg rapport. Getest op productie met een echte tijdelijke gebruiker en teruggedraaid: vóór de
migratie 0 vragen zichtbaar, erna 30; een vreemde blijft op 0.

Bewust géén lek naar een vreemde: `readable_profile_ids()` beperkt zich tot wie er echt bij hoort.
Dit repareert een deur die te veel dichtzat, niet een die openstond.

`scripts/chain/postgres.ts` geeft `auth.uid()` sindsdien zijn echte definitie (leest
`request.jwt.claim.sub`) in plaats van altijd `null`, en `anon`/`authenticated` krijgen de
tabelrechten die Supabase normaal buiten onze migraties om geeft. Zonder die twee kon geen enkele
ketentest ooit RLS echt narekenen. `scripts/test-chain.ts` bewaakt nu met een vier-rollen-proef
(eigenaar, teamlid, beheerder, vreemde) dat dit niet terugkomt; de test is rood gemaakt om te
bewijzen dat hij het gat vangt.

## 0057 · de potentiescore, zoekvolume-helft

Twee kolommen op `profile_topics`: `search_volume_index` (0-100) en `search_volume_reasoning`. Zie
`docs/tasks/potentiescore.md` voor het volledige ontwerp.

`search_volume_index` is nooit de ruwe uitkomst van één AI-aanroep over de vragen van één analyse
(die bestaat al langer als `prompts.volume_estimate`, migratie 0009/0017, en is dat nooit
vergelijkbaar tussen analyses). Deze kolom komt uit `recalibrateSearchVolume()`
(`lib/pipeline/search-demand.ts`), die alle niet-gearchiveerde onderwerpen van een merk in één
aanroep tegen elkaar afzet, getriggerd zodra een analyse haar eerste rapport krijgt, en ALTIJD alle
onderwerpen herschrijft, niet alleen het nieuwe. Zo trekt een groot onderwerp uit een latere analyse
de score van een eerder, kleiner onderwerp aantoonbaar naar beneden, in plaats van dat elke analyse
zijn eigen, niet-vergelijkbare 0-100 houdt.

## 0058 · citatiepercentage per concurrent

Eén kolom op `competitor_breakdown`: `citation_count` (nullable integer, `>= 0`). Het eigen merk
heeft dit cijfer al sinds migratie 0029 (`visibility_scores.citation_count`), berekend met een
exacte match op het bekende domein (`profiles.url`). Van een concurrent is nergens een domein
geregistreerd, alleen een naam, dus de aggregatie liet deze kolom voor concurrenten altijd leeg.

`citesOwnSite()` (`lib/entities/normalize.ts`) lost dat op zonder een domein te hoeven opslaan: hij
normaliseert het geciteerde domein op dezelfde manier als `isSameEntity()` en telt een citatie mee
zodra die overeenkomt met de merknaam ("coolblue.nl" en "Coolblue" worden allebei "coolblue").
`measure.ts` vult de kolom voortaan bij elke nieuwe aggregatie van `competitor_breakdown`.

⚠️ Bestaande periodes blijven op `null` staan, ook na deze migratie: het is een afgeleide kolom uit
al opgeslagen `tracking_run_mentions.cited_sources` (conventie 8), maar wordt pas herberekend
wanneer die analyse opnieuw gemeten wordt. `null` betekent hier "nog niet berekend", nooit "geen
citaties gevonden"; de rangordetabel in `score-panel.tsx` toont dat onderscheid als een streepje
in plaats van 0%. Een backfill van bestaande periodes is bewust niet gedaan: dat zou de matching
logica in SQL moeten naspiegelen, met het risico dat de twee implementaties uiteenlopen (één feit,
één eigenaar).

## 0059 · pg_cron-taak hernoemd na de rebrand naar ORBIT ENGINE

De app heette Aura en heet vanaf nu ORBIT ENGINE. Migraties zijn geschiedenis en worden niet
herschreven, dus `0050_plan_cron.sql` blijft letterlijk staan zoals hij gedraaid heeft, inclusief de
oude taaknaam `aura-plan-writer`. Deze migratie doet het enige wat een rebrand aan een levende
database mag doen: de bestaande pg_cron-taak `unschedule()`n en onder de nieuwe naam
`orbit-engine-plan-writer` opnieuw `schedule()`n, met exact hetzelfde schema (04:00 UTC) en dezelfde
functie (`trigger_plan_writer()`). Er verandert verder niets aan schema, rechten of gedrag.
