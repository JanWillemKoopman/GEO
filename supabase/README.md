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
| `0045_klantprofiel_verrijking.sql` | `profiles.taboo_phrases`/`compliance_notes`/`author_*`/`tone_*` (formality, energy, complexity, humor), naar het voorbeeld van InSpace Nova's onboardingstappen |
| `0046_accounts.sql` | `accounts` + `account_users` + `profiles.account_id`. De laag boven het merk: een klant kan een bureau zijn met meerdere merken (besluit 9) en meerdere websites hebben (besluit 10). Zie `docs/Nova.md` §0. Backfill maakt per bestaande eigenaar één account. RLS verruimd met een derde SELECT-laag; de bestaande twee blijven staan |
| `0047_uitnodigingen.sql` | `account_invites`. De enige deur naar binnen: registreren staat dicht (`signupsEnabled`), dus toegang loopt via een uitnodigingslink. Bewaart alleen de SHA-256 van het token, nooit het token zelf. **Nul RLS-policies**, net als `jobs`: alleen de service-role komt erbij |
| `0048_merkprofiel_compleet.sql` | De laatste dertien velden van het merkprofiel uit de inventaris in `docs/Nova.md` §13: missie, positionering, USP, kernboodschappen, identiteitswoorden, onderscheid, tweede doelgroep, kennisniveau, de vijfde tone-schuif, vaste uitdrukkingen, aanspreekvorm en drie auteursvelden. Alles wat al een eigenaar had staat er bewust niet nóg een keer bij; de vertaaltabel staat bovenaan de migratie |
| `0049_contentplan.sql` | `profile_funnel_stages` + `content_plans` + `plan_months` + `planned_pages`. Het kernobject van besluit 3: twaalf maanden vooruit, goedkeuring per maand, buffers per maand. Géén looptijd, want doorlopend opzegbaar (besluit 7). Nieuwe hulpfunctie `readable_profile_ids()` deelt de drielaagse toegangsregel over de vier tabellen |
| `0050_plan_cron.sql` | `trigger_plan_writer()` + een dagelijkse pg_cron-taak (`aura-plan-writer`, 04:00 UTC, sinds `0059` hernoemd naar `orbit-engine-plan-writer`) die `/api/cron/plan` aanroept. Zelfde patroon en dezelfde twee vault-geheimen als `0015`: dit is alleen de aanroeper, de beslissing staat in `lib/plan-writing.ts`. Draait NIET in de ketentest (pg_cron ontbreekt daar), zie de overslaglijst in `scripts/chain/postgres.ts` |
| `0051_opbrengst.sql` | `accounts.value_per_mention_eur`. Besluit 16: de waarde per vermelding is een OPTIONELE parameter van het opbrengstblok. Leeg toont aantallen, een bedrag toont geld, dus er hoeft geen scherm om zodra de prijzen er zijn. Per account en niet per merk, want wat een vermelding waard is hangt aan het bedrijf en zijn marge. Bewust geen standaardwaarde (conventie 3) |
| `0052_search_console.sql` | `profiles.gsc_*` (property, verificatie, laatste fout, eerste dag) en `search_console_days` (klikken, vertoningen, positie per pagina per dag). Service account in plaats van OAuth, want de `webmasters`-scopes zijn bij Google "sensitive" en dat betekent weken verificatie voor nul extra waarde. De unieke sleutel `(profile_id, day, page)` maakt van Google's naijlende correcties een correctie in plaats van een dubbele rij |
| `0061_crawl_dekking.sql` | `profiles.sitemap_total_urls` (hoe groot de site écht is, vóór het afkappen), `profiles.crawl_priority_paths` (welke secties voorrang krijgen) en `profile_pages.source` (`crawl` of `handmatig`). Zonder de eerste kolom was "de site heeft precies 150 pagina's" niet te onderscheiden van "de site heeft er 449 en we lazen er 150", en dat tweede was op productie het geval bij gasservice-brabant.nl. Zonder de derde wiste elke nieuwe crawl de pagina's die een mens er met de hand bij zette |
| `0062_reputatie.sql` | Vijf tabellen voor Mijn reputatie (`reputation_runs`, `reputation_answers`, `reputation_ranks`, `reputation_offering_scores`, `reputation_sources`) plus `ai_calls.reputation_run_id`. Meet hoe AI over een merk praat per dienst en tegenover de concurrenten, als los betaald product. ⚠️ `tone_index` en `rank_score` zijn nullable met opzet: nul is neutraal en eerste van één is geen uitslag. `reputation_answers` draagt het ruwe antwoord én het oordeel, zodat een mislukte beoordeling opnieuw mag zonder de dure vraag opnieuw te stellen. `reputation_ranks.of_parties` staat per rij en niet per run, want een tweede plaats van drie is iets anders waard dan een tweede plaats van vier. Zonder de kolom op `ai_calls` is het plafond van €3 per run niet af te dwingen. Zie `docs/tasks/mijn-reputatie.md` §6 |
| `0063_reputatie_v2.sql` | Wat de eerste echte run leerde. Op `reputation_runs`: `tone_distribution`, `tone_spread` en `tone_stderr` (tien keer "gemengd" en tien keer "neutraal" gaven allebei nul, en dat zijn compleet verschillende merken), `market_*` (de open koperssvraag die concurrenten ONTDEKT in plaats van ze op te leggen) en `instrument_version` (model plus promptversie, want een stille modelwijziging bij OpenAI zou als vooruitgang op het scherm komen). Plus `reputation_market` met één rij per bedrijf dat AI zélf noemde, en `reputation_evidence` met het gedeelde bewijscorpus waar de dienstvragen zich uit beantwoorden in plaats van elk hun eigen zoekactie te doen. Zie `docs/logbook.md`, 23 augustus 2026 |
| `0064_reputatie_marktnoemer.sql` | `market_answers` op `reputation_runs`: de noemer onder `market_hit_rate`. Zonder noemer is 0,36 tegenover 0,17 niet te wegen, want twee op zes is iets anders dan zes op achttien. Daarmee krijgt de trefkans de binomiale marge van `binomialStderr()` in plaats van een vuistregel. Zie `docs/logbook.md`, 23 augustus 2026 |
| `0065_contentvoorraad.sql` | `planned_pages.plan_month_id` mag NULL zijn: dat is de voorraad, een pagina die wel beschikbaar is maar nog geen maand heeft. Plus negen kolommen die een gemeten kans meedragen (`source`, `source_analysis_id`, `source_ref`, `recommendation_action`, `existing_url`, `why`, `target_intent`, `target_count`, `target_weight`) en `potential`, de opgeslagen potentiescore. ⚠️ De unieke index op `(profile_id, source_ref)` is bewust NIET partieel: een partiële index kan niet dienen als conflictdoel van `insert ... on conflict`, en daar leunt de idempotente synchronisatie op. Zie `docs/logbook.md`, 25 augustus 2026 |
| `0066_impact_idem_fix.sql` | Vervangt `tracking_runs_idem_idx` (0041) door `tracking_runs_idem_periodic_idx`, dezelfde sleutel maar partieel op `content_piece_id is null`. De twee indexen op `tracking_runs` spraken elkaar tegen: 0041 kende `impact_wave` en `content_piece_id` niet, dus golf 2 van een impactmeting botste met golf 1, en twee pagina's met dezelfde doelvraag botsten met elkaar, ná de betaalde `web_search`. Bij testklant Huyberts Keukens kostte dat 56 van de 112 betaalde zoekacties. Impact- en controlemetingen worden nu uitsluitend door `tracking_runs_impact_unique_idx` (0020) beheerst. Zie `docs/logbook.md`, doorloop-huyberts punt 1 |
| `0067_handmatige_publicatiedatum.sql` | `planned_pages.scheduled_manual` (boolean, default `false`): de gebruiker koos deze publicatiedatum zelf. ⚠️ Zonder deze vlag is zo'n keuze één sleepbeweging later weer weg. `resequenceMonth()` herberekent na élke wijziging in een maand alle data, en kan uit `scheduled_for` alleen niet zien of 18 augustus een keuze was of het toevallige resultaat van de vorige spreiding. Dezelfde uitzondering die een geplaatste pagina al had. De vlag vervalt zodra de pagina naar een andere maand of terug naar de voorraad gaat, want een dag in oktober is geen dag in november. Zie `docs/logbook.md`, 26 augustus 2026 |
| `0068_sales_fundament.sql` | Het fundament van de Sales-module, de GEO Prospect Engine. `sales_users` (RLS aan, nul policies, net als `staff_users`) plus de functies `is_sales()` en `is_sales_admin()`, allebei `security definer` met een vaste `search_path`; een beheerder is automatisch ook sales admin, andersom niet. Daarnaast `sales_markets`, `sales_companies` en de koppeltabel `sales_market_companies`, alle drie met RLS en één selectpolicy die `is_sales()` vraagt. ⚠️ `sales_companies.domain` is nullable met een GEDEELTELIJKE unieke index: een bedrijf zonder website is juist de prospect die deze module zoekt, en een verplichte kolom zou precies die weggooien. ⚠️ `sales_market_companies.included` is nullable met drie standen, want "nog niet beoordeeld" is iets anders dan "eruit gehaald"; zonder dat onderscheid kan goedkeuringspoort 1 niet bestaan. ⚠️ `last_activity_at` en `anonymised_at` dragen de bewaartermijn van twaalf maanden vanaf de eerste rij, want een termijn die je later toevoegt kan niet terugrekenen over de periode dat hij ontbrak. Zie `docs/tasks/geo-prospect-engine.md` §4 en §7.1 |
| `0069_sales_ontdekken.sql` | Sprint 2 van de Sales-module: de markt ontdekken en uitsluiten wie er niet in hoort. `sales_suppressions` (vier soorten uit plan 9.5, met een check-constraint die eist dat een uitsluiting ergens op slaat) plus `ai_calls.sales_market_id` (zonder die kolom is het plafond van 10 euro per markt niet af te dwingen; dezelfde onderbouwing als `reputation_run_id` in `0062`). Verder acht kolommen op de tabellen uit `0068`: `discovered_at`, `approved_at`, `approved_by`, `failure_reason`, `conflict_note`, `discovery_json` en `discovery_note` op de markt, `crawl_status`, `crawl_error` en `name_source` op het bedrijf, en `evidence_urls` plus `discovery_note` op het lidmaatschap. ⚠️ `discovery_json` is niet alleen audit maar ook de overdracht tussen twee taken: de dure zoekactie en het uitlezen van de bronpagina's passen samen niet in één werker-aanroep, en zonder deze kolom zou een mislukte tweede stap de eerste opnieuw laten betalen. ⚠️ `sales_suppressions` stond in het plan in de migratie van sprint 5; dat is drie sprints te laat, want 9.5 zegt dat de controle gebeurt vóórdat een opportunity zichtbaar wordt. Zie `docs/tasks/geo-prospect-engine.md` hoofdstuk 9 |
| `0070_sales_taakeigenaar.sql` | `jobs.sales_market_id` plus een ruimere `jobs_has_owner`. Migratie `0013` eiste dat elke taak aan een analyse of een profiel hangt; een Sales-taak hangt aan een markt, en een markt is geen merk. ⚠️ Bewust een derde kolom en geen uitzondering op de regel: met "of het type begint met sales" zou de taak nog steeds aan niets hangen en zou niemand achteraf kunnen vragen wat er voor markt X gedraaid heeft. Gevonden door de ketentest bij de eerste keer draaien van de keten, precies waar die test voor is: de fout zat in de samenhang tussen twee onderdelen en niet in één ervan |
| `0071_sales_meten.sql` | Sprint 3 van de Sales-module: de meting. Vijf tabellen (`sales_runs`, `sales_questions`, `sales_answers`, `sales_mentions`, `sales_company_scores`), een zevende stand `vragen_klaar` op de markt, en `sales_run_id` op `ai_calls` en `jobs`. ⚠️ De MEETRONDE is een eigen entiteit en geen kolommen op de markt: een markt wordt herhaald gemeten, en zou de meting op de markt landen dan overschrijft ronde twee ronde één. Dan bestaat opportunitytype 8 (verlies) niet, en dat type is volgens het plan het sterkste verkoopmoment dat er is. ⚠️ `sales_questions` draagt `intent_stage` én `intent_label`: zonder die twee kolommen is de uitkomst "je scoort 18 van 40" in plaats van "bij de negen vragen over aankoopbegeleiding word je nul keer genoemd", en dat verschil is de hele module. ⚠️ De unieke index op `sales_answers` bevat de ENGINE, net als in `0041`: zonder dat slaat de tweede engine zichzelf over, zonder foutmelding en met een lege score terwijl alles groen lijkt. ⚠️ De check op `sales_mentions.mention_role` is het vangnet uit conventie 1: bij de klantmeting vulde het model bij 10 van de 27 niet-genoemde merken toch een rol in. Zie `docs/tasks/geo-prospect-engine.md` §7.2 en hoofdstuk 10 t/m 13 |
| `0072_sales_kansen.sql` | Sprint 4 van de Sales-module: de kansen. `sales_opportunities` (de gekwalificeerde kans: type, score, opbouw, haak, bewijs) en `sales_evidence` (de vragen en antwoorden die haar dragen). ⚠️ `sales_evidence` is een TABEL en geen jsonb-veld, zodat doorklikken een join is: een verkoper die op de haak klikt komt uit bij de vraag, het volledige antwoord, de aangehaalde bronnen, de engine en de meetdatum. Dat is wat hij nodig heeft op het moment dat een prospect zegt "dat kan niet kloppen". ⚠️ `score_breakdown` bewaart elke component apart en niet alleen het eindcijfer: zonder die componenten is achteraf niet te achterhalen welk signaal voorspelde, en dan bestaat de leerlus uit plan hoofdstuk 19 later niet. ⚠️ De unieke index op `(run_id, company_id)` maakt hergedetecteerde kansen een upsert in plaats van een nieuwe rij, zodat een kans zijn id houdt: de toewijzing en de outreach van sprint 5 hangen eraan. Zie `docs/tasks/geo-prospect-engine.md` hoofdstuk 12 t/m 15 |
| `0073_sales_outreach.sql` | Sprint 5 van de Sales-module: de outreach. `sales_contacts` (wie mailen we), `sales_outreach` (wat staat er uit en wat kwam eruit), `sales_send_stats` (het plafond per persoon per dag) en `sales_events` (het logboek), plus `sales_companies.last_rejected_at`. ⚠️ Er is GEEN verzendstatus, geen wachtrij en geen bezorgingsvlag, en die komen er ook niet: de openingsmail wordt altijd door de medewerker zelf verstuurd vanuit zijn eigen mailbox (plan 16.3). `sent_at` betekent "de medewerker heeft gemeld dat hij hem verstuurd heeft", en er is geen kolom die iets anders kán betekenen. ⚠️ Een afwijzing zonder reden bestaat niet: een check-constraint eist een categorie uit een vaste lijst, want zonder categorie is niet te leren welk soort prospect afhaakt. ⚠️ De gedeeltelijke unieke index op `company_id` laat maar één ACTIEVE outreach per bedrijf toe: twee verkopers die hetzelfde bedrijf tegelijk benaderen is de pijnlijkste fout die deze module kan maken na het benaderen van een bestaande klant. Zie `docs/tasks/geo-prospect-engine.md` hoofdstuk 16 t/m 19 |
| `0074_concept_definitief_topics.sql` | `profile_topics.stage` (`concept` \| `definitief`, default `definitief`). Een onderwerp voorgesteld vóórdat het strategisch gesprek is vastgelegd (`profile_strategy.recorded_at` leeg) krijgt `concept`: zichtbaar, niet te goedkeuren of te starten. Zodra het gesprek wordt opgeslagen, vervangt een definitieve ronde de onbesliste concepten. Default `definitief` zodat bestaande onderwerpen niet met terugwerkende kracht op slot gaan. Zie `docs/optimalisatielab-orbit-engine.md`, werkpakket A §3.2 |
| `0075_clusterlaag_velden.sql` | `profile_topics.client_questions`, `client_friction`, `client_edge`: de clusterlaag uit werkpakket A §3.1, drie gerichte velden naast het bestaande vrije `client_note`. `lib/pipeline/topic-brief.ts` smelt ze samen voor `content_brief`, met terugval op `client_note` |
| `0076_topic_herkomst.sql` | `profile_topics.origin` (`aanbod` \| `aanbod_en_gesprek`, null voor oudere rijen): welke informatie er meeging toen dit onderwerp werd voorgesteld, zichtbaar op de clusterpagina (§3.5) |
| `0077_clusters_aanvullen.sql` | De knop "Stel nieuwe clusters voor" (§3.5, punt 10). Nieuwe tabel `profile_topic_rounds` (wanneer, door wie, tegen welke stand van zaken, tegen welke kosten) waarmee `lib/pipeline/topic-round-diff.ts` bepaalt of een volgende klik nog iets oplevert. Plus `profile_topics.rejection_reason` (instructie voor een volgende ronde) en `origin_uses_measurement` (de tweede as van de herkomstregel, naast `origin` uit 0076) |
| `0078_afgevallen_kansen.sql` | `reports.declined_json`: gemeten gemissen die het rapportmodel overwoog maar niet als aanbeveling opnam, met de reden. Voedt het "afgevallen"-niveau van de contentvoorraad (werkpakket C §5.1). Null voor rapporten van vóór deze migratie |
| `0079_aanbod_bewerkbaar.sql` | De aanbodboom bewerkbaar (onboarding Ronde C, `documentatie/onboarding_optimalisatie.md` §16). Vier kolommen op `profile_offerings`: `note` (vrije context per dienst), `removed_at`/`removed_by` (verwijderen is uitzetten, niet wissen), `updated_by`. Plus een partiële index op `profile_id where removed_at is null` voor elke lezer die alleen de actieve knopen wil |
| `0080_crawlbeheer.sql` | Crawlbeheer (onboarding Ronde D, `documentatie/onboarding_optimalisatie.md` §17). Vijf kolommen op `profiles`: `crawl_speed` (snel/normaal/langzaam, zie `lib/crawl-speed.ts`), `crawl_as_browser` (standaard uit, alleen met toestemming van de klant voor zijn eigen domein), `crawl_last_run_at`/`crawl_last_mode` (status van de laatste ronde), `crawl_last_blocked_at` (wanneer de site voor het laatst met 403 antwoordde) |
| `0081_sales_publiceren.sql` | Sprint 6 en 7 van de Sales-module: publiceren en hermeten. `sales_market_reports` (de publieke tekst per meetronde), vier kolommen op de markt (`published_at`, `unpublished_at`, `published_by`, `published_run_id`) en twee op het bedrijf (`hidden_from_report`, `hidden_reason`). ⚠️ Het rapport hangt aan de RONDE en niet aan de markt: een rapport dat bij een hermeting overschreven wordt, laat een prospect andere cijfers zien dan er in zijn mail stonden. ⚠️ `published_run_id` verschuift alleen als iemand de nieuwe ronde bewust publiceert, zodat een lopende mailcampagne blijft kloppen. ⚠️ `hidden_from_report` verwijdert een bedrijf van elke publieke pagina maar laat de rij staan: weggooien betekent dat de marktontdekking hem volgende ronde gewoon opnieuw vindt. ⚠️ Er is bewust GEEN anonieme selectpolicy: de publieke pagina leest via de service-role key met een expliciete controle op `is_public` en `published_run_id`, anders is elk rapport leesbaar zodra iemand het adres raadt. ⚠️ Dit bestand heette `0074` tot 31 augustus 2026: dat nummer bleek intussen door de onboardingronde gebruikt te zijn, en die stond al op productie. Zie `docs/tasks/geo-prospect-engine.md` hoofdstuk 20 en 22 |
| `0082_contentcontract.sql` | Het contentcontract, het itemdossier en de gecachte bronanalyse (`docs/tasks/contentpijplijn-herontwerp.md`). Vier kolommen op `content_pieces` (`dossier_json`, `contract_json`, `coverage_score`, `repair_round`) plus de tabel `source_analysis_cache`. ⚠️ `coverage_score` staat bewust LOS van `geo_score`: die reeks bestaat sinds R8.2 en de app toont er trends van, dus een nieuwe component erin zou de pagina's van vorige maand onvergelijkbaar maken met die van vandaag. Zelfde reden waarom `checkQuality` er destijds buiten bleef. ⚠️ De cachesleutel bevat de DOELVRAGEN en niet alleen de URL's: de bronanalyse is gericht op wat één pagina moet winnen, en alleen op URL cachen zou precies de itemspecifieke scherpte weggooien die S9 en S10 kwamen brengen, voor een besparing van een tiende cent. ⚠️ `source_analysis_cache` heeft nul RLS-policies, net als `jobs`: afgeleide data die alleen de service-role leest en schrijft |
| `0083_verbeterplan_bestaande_pagina.sql` | De bestaande pagina als bron, en het verbeterplan dat eruit volgt (`docs/tasks/paginakeuze-nieuw-of-verbeteren.md`). Drie kolommen op `content_pieces` (`existing_page_text`, `existing_page_fetched_at`, `related_url`) en één op `planned_pages` (`related_url`). ⚠️ `existing_page_text` is de VERSE tekst van de te verbeteren pagina, tot 6000 tekens, opgehaald op het moment van plannen. Hij vervangt `profile_pages.text_excerpt` als bron voor een verbetering: dat excerpt is afgekapt op 1500 tekens (667 van de 738 gecrawlde pagina's op productie staan op die grens, en 9 van de 10 daadwerkelijk verbeterde pagina's ook) en kan tot 20 dagen oud zijn, terwijl het scherm de klant vertelt zijn pagina ermee te vervangen. ⚠️ Hij wordt BEWAARD en niet alleen gebruikt: het verschilscherm heeft hem nodig, en een herschrijfronde een week later mag niet stilletjes een andere bron krijgen (conventie 8). ⚠️ `related_url` is nadrukkelijk geen tweede `existing_url`: die zegt "deze pagina wordt vervangen", `related_url` zegt "hier staat al iets over dit onderwerp, doe het niet nog eens over". Het rapportmodel wees zo'n pagina 13 keer aan (32 van de 70 nieuw-aanbevelingen droegen een adres, waarvan er 13 echt bestonden) en niets in de keten las hem. ⚠️ Hij staat ook op `planned_pages`, want het normale pad loopt sinds `0065` via de contentvoorraad, en anders verdwijnt het signaal precies op de route die de meeste pagina's afleggen |

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
netwerkronde mag doen. Zie `lib/spend-rules.ts`; de conventie P3 staat in `docs/logbook.md`.

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

## 0060 · onboarding 3.0, fase 1: de commerciële laag, de contactpersoon en de vierde herkomst

Vijftien kolommen op `profiles`, één op `profile_field_sources`, en een uitgebreide
herkomstconstraint op twee tabellen. Volledig ontwerp en de afwegingen: `docs/logbook.md`, de zes alinea's van 19 augustus 2026.

**Twaalf commerciële velden** (`priority_offerings`, `deprioritised_offerings`, `growth_regions`,
`target_segments`, `deal_value_band`, `seasonality`, `sales_objections`, `forbidden_topics`,
`offline_proof`, `name_exclusions`, `respect_site_structure`, `goal_12m`). Elk veld voldoet aan twee
eisen: een website kan het niet zeggen, en er is precies één pijplijnstap die er aantoonbaar beter
van wordt. Die lezer staat per kolom in het commentaar van de migratie. Een veld zonder lezer hoort
er niet in, dat is administratie.

⚠️ `offline_proof` staat **naast** `proof_points` en vervangt hem niet: die tweede is per definitie
letterlijk uit de site geëxtraheerd, en dat is de grondslag onder contentkwaliteit A2. `name_exclusions`
is de tegenhanger van `aliases`: gelijknamige bedrijven die dit merk juist níet zijn.

**Drie contactvelden** (`contact_name`, `contact_email`, `contact_phone`). Met wie we aan tafel
zaten, tot nu nergens vastgelegd. Facturatie komt hier bewust niet bij: het product is sales-led en
er is geen self-serve betaalstroom.

**`profile_field_sources.not_applicable`** maakt het verschil tussen "weten we nog niet" en "niet van
toepassing". Een merk zonder auteur heeft geen auteursbio, en dat is geen gat; zonder dat onderscheid
haalt de volledigheidsmeter nooit 100% en wordt hij genegeerd.

**De vierde herkomst `consultant`**, op `profile_field_sources` én `profile_offerings`, want een
constraint op één van de twee laat de tabellen uit elkaar lopen. Wat de consultant vóór het gesprek
klaarzet is een onderbouwde aanname, geen bevestigd feit: voor het overschrijven telt hij als mens
(`field-merge.ts` laat alleen `ai` overschrijven), voor de onderzoeksprompt is hij een startpunt dat
tegengesproken mag worden.

Additief en idempotent, geen enkele bestaande waarde verandert. De array-velden krijgen
`default '{}'`, de rest is nullable zonder default (conventie 3, zelfde regel als `0048`).
