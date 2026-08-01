# Supabase — schema & migraties

Datamodel en schrijfstrategie: [`../docs/architecture.md`](../docs/architecture.md) §2–§3.

## Regels

- **Additief en idempotent.** `add column if not exists` / `create table if not exists`, nooit
  `drop`. Opnieuw uitvoeren is altijd veilig.
- Elke migratie opent met een Nederlands commentaarblok: wat het probleem was, met welke gemeten
  cijfers, en waarom deze oplossing. Onderaan een `select` die controleert dat het gelukt is.
- Het nummer volgt de **toepassingsvolgorde**, niet de plannings volgorde.
- **RLS is SELECT-only.** Alle schrijfacties lopen via de Next.js API-routes met de service-role
  key + expliciete ownership-check. `jobs` heeft RLS aan en nul policies — geen enkele
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
> STAP 7 is optioneel — alleen nodig om de werker vanuit Postgres aan te sturen (zet dan eerst de
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
| `0027_bewijslaag.sql` | `reports.stripped_claims_json` — audit-trail van de claimvalidator |
| `0028_meetbaarheid.sql` | `brands_in_answer`, `brand_eliciting`, `winnable_runs`/`brandless_runs` + backfill |
| `0029_zichtbaarheidsprofiel.sql` | `mention_role`, `avg_position`, `citation_count`, `first_mention_count` |
| `0030_concurrent_intelligence.sql` | `competitor_breakdown.attributes_json` / `why_summary` |
| `0031_gelaagd_hermeten.sql` | `tracking_runs.repeat_index` + index |
| `0032_bedrijfsmodel.sql` | `profiles.business_model` (nullable + check-constraint) |
| *`0033`* | **Gereserveerd voor R6.2** (inventariskwaliteit) — nooit gedraaid, blokkeert niets |
| `0034_vrijgave.sql` | `content_pieces.reviewed_at`/`reviewed_by` + partiële index |
| `0035_merkdocumenten.sql` | `brand_documents`: brontekst, sha256-hash, extractietellers |
| `0036_feitenbank.sql` | `brand_facts`: feit met identiteit, scope en `superseded_by` |
| `0037_winbaarheid_als_kans.sql` | `prompts.elicit_successes`/`elicit_samples` + backfill |
