# Supabase — schema & migraties

Dit mapje bevat het volledige datamodel van GEO Tracker als SQL-migraties, conform
[`abcplan.md`](../abcplan.md) §5 (datamodel) en §12.20 (RLS/schrijfstrategie).

## Migraties (in volgorde)

| Bestand | Wat het toevoegt |
|---------|-------------------|
| `0001_init.sql` | Alle basistabellen, enums, indexes en `updated_at`-triggers |
| `0002_rls.sql` | Row Level Security: **SELECT-only** policies, `jobs` = deny-all |
| `0003_content_quality.sql` | Concrete feiten + stijlvoorbeelden op `brand_dna` (fundament voor content-kwaliteit) |
| `0004_profiles.sql` | Account-brede `profiles`-tabel; `analyses.profile_id` (merkonderzoek verhuist van per-analyse naar per-profiel) |
| `0005_profile_pages.sql` | Content-inventaris (`profile_pages`) uit een beperkte crawl (sitemap/homepage-links) |
| `0006_profile_crawl_settings.sql` | Crawl-instellingen per profiel (`sitemap_url`, `max_inventory_pages`) |
| `0007_profile_intake.sql` | Intake-velden voor onboarding op het profiel |
| `0008_profile_onboarding_fields.sql` | Uitgebreide onboarding-velden (aliassen e.d.), gevoed in de pijplijn |
| `0009_prompt_taxonomy.sql` | Rijkere prompt-categorisering (intentie/funnel/tags/geschat volume) |
| `0010_weighted_visibility.sql` | Volume-gewogen zichtbaarheidsscore naast de ongewogen score |
| `0011_analysis_content_brief.sql` | Vrije-tekst content-brief per analyse (stuurt hoek/doelgroep van content) |
| `0012_ai_calls_ledger.sql` | `ai_calls`-kostenlogboek: één rij per OpenAI-call, tokens + geschatte kosten |
| `0013_jobs_queue.sql` | Activeert de `jobs`-wachtrij (status/pogingen/planning/dedupe-unique-index) |
| `0014_analysis_notifications.sql` | Ondersteuning voor "klaar"-notificaties nu werk op de achtergrond draait |
| `0015_worker_cron_via_pg_cron.sql` | Alternatieve aansturing van de werker via `pg_cron` (i.p.v. Vercel Cron, i.v.m. de cron-limiet op het Hobby-plan) |
| `0016_measurement_quality.sql` | Opslag van onzekerheidsmarge/betrouwbaarheid per meting |
| `0017_volume_bands.sql` | Vervangt het verzonnen 0–100 volumegetal door 3 banden (laag/midden/hoog) |
| `0018_technical_audit.sql` | `technical_audit`-tabel: kunnen AI-crawlers de site überhaupt bereiken? |
| `0019_content_targets.sql` | Koppelt meting aan content: doelvragen, versies, GEO-score, feitenvragen |
| `0020_content_impact.sql` | Publicatie-tracking + effectmeting (hermeet-golven en verdicts) |
| `0021_periodic_reports.sql` | Trend + terugkerende rapportage (meerdere periodes) |
| `0022_offsite.sql` | Off-site aanwezigheid: bronnenlandschap, presence-checks, off-site taken |
| `0023_content_piece_uniqueness.sql` | Afdwingen op DB-niveau: precies één `is_current` content-stuk per pagina/titel |

### `RUN_*.sql` — handmatig toe te passen bundels

Voor wie geen Supabase-CLI gebruikt, staan de migraties vanaf 0012 ook als samengevoegde
bundels klaar om direct in de SQL Editor te plakken. Ze bouwen strikt op elkaar voort —
volgorde is niet vrij:

`RUN_0012_TOT_0017.sql` → `RUN_0018_EN_0019.sql` → `RUN_0020.sql` → `RUN_0021.sql` →
`RUN_0022.sql` → `RUN_0023.sql`

Elke bundel gebruikt `if not exists`/`or replace`, dus opnieuw uitvoeren is veilig. Zie
[`../SETUP.md`](../SETUP.md) §4 voor de bijzonderheden (o.a. één stap die apart moet
vanwege een Postgres-transactiebeperking op `alter type ... add value`).

## Toepassen

### Optie A — Supabase CLI (aanbevolen)

```bash
# eenmalig: koppel je lokale repo aan je Supabase-project
supabase link --project-ref <jouw-project-ref>

# migraties naar de remote database pushen
supabase db push
```

### Optie B — SQL Editor

Open **Supabase Dashboard → SQL Editor** en voer de bestanden in volgorde uit, `0001` t/m
`0023` (of gebruik de `RUN_*.sql`-bundels vanaf 0012, zie hierboven).

## Belangrijk over de schrijfstrategie

RLS staat **alleen lezen** toe. Alle schrijfacties (ook klant-CRUD zoals prompt-beheer)
lopen via de Next.js API-routes met de **service-role key** + een expliciete
ownership-check — nooit rechtstreeks vanuit de browser. Zie `abcplan.md` §5/§12.20 voor de
onderbouwing (RLS werkt op rij-, niet op kolomniveau).

De `jobs`-tabel heeft **geen enkele** client-toegang: RLS aan, nul policies. Alle mutaties
op `jobs` lopen via de achtergrond-werker (`lib/jobs/`, service-role key).
