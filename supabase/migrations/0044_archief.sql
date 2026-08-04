-- ═══════════════════════════════════════════════════════════════════════════
-- 0044 — Archiveren: onzichtbaar in de app, bewaard in de database
-- ═══════════════════════════════════════════════════════════════════════════
--
-- WAAROM DIT GEEN `DELETE` IS
--
-- De eigenaar wil met een schone lei beginnen maar de bestaande merken en
-- analyses als back-up houden. Verwijderen kan niet: `on delete cascade` hangt
-- aan vrijwel alles — `analyses` → `prompts` → `tracking_runs` →
-- `tracking_run_mentions`, plus rapporten, contentpagina's en de hele
-- meetgeschiedenis. Eén `delete from profiles` gooit maanden meetdata weg die
-- niet te reconstrueren is zonder opnieuw te betalen.
--
-- Conventie 4 zegt bovendien: migraties zijn additief, nooit `drop`. Dat geldt
-- net zo goed voor data als voor schema.
--
-- ── ÉÉN KOLOM, TWEE TABELLEN ───────────────────────────────────────────────
--
-- `archived_at` op `profiles` en op `analyses`. Twee en niet één, want ze
-- kunnen los: een merk kan actief blijven terwijl een oude analyse eronder uit
-- beeld gaat. In de praktijk archiveert de app ze samen (een merk archiveren
-- neemt zijn analyses mee), maar het model dwingt dat niet af — dat zou een
-- trigger vragen, en die is hier niet nodig.
--
-- ⚠️ NIET IN RLS VERWERKT. Dit is een weergavefilter en geen rechtenkwestie.
-- Het in de policies zetten zou betekenen dat een gearchiveerd profiel ook voor
-- de eigenaar onbereikbaar wordt — precies het tegenovergestelde van "ik wil ze
-- wel als back-up hebben". Het filter staat in de lijstquery's, waar het hoort.
--
-- ── WAT ER OOK STOPT ───────────────────────────────────────────────────────
--
-- Een gearchiveerde analyse valt uit de maandelijkse meetronde. Zonder dat
-- filter blijft `/api/cron/tracking` elke maand een meting inplannen voor een
-- merk dat niemand meer bekijkt — en die meting kost geld. Dat is de duurste
-- vorm van "onzichtbaar maar nog actief" die er is.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.profiles
  add column if not exists archived_at timestamptz;

alter table public.analyses
  add column if not exists archived_at timestamptz;

comment on column public.profiles.archived_at is
  'Gearchiveerd op. Null = zichtbaar in de app. Gevuld = verborgen uit alle '
  'lijsten en tellingen, maar volledig aanwezig in de database en bereikbaar '
  'via de directe URL. Zie lib/archive.ts.';

comment on column public.analyses.archived_at is
  'Gearchiveerd op. Zelfde regel als profiles.archived_at — en de analyse valt '
  'hiermee ook uit de maandelijkse meetronde, zodat een verborgen merk geen '
  'meetkosten meer maakt.';

-- Partiële indexen: de lijstquery's vragen altijd om de NIET-gearchiveerde
-- rijen, en dat is na deze ronde de kleine kant van de tabel.
create index if not exists profiles_active_idx
  on public.profiles (user_id, created_at desc)
  where archived_at is null;

create index if not exists analyses_active_idx
  on public.analyses (user_id, created_at desc)
  where archived_at is null;
