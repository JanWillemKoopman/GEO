-- 0123: de gebeurtenissenlaag (docs/tasks/van-pijplijn-naar-kennissysteem.md, G1, §6.5)
--
-- Waarom. Fase 3 van het plan: het domein zegt wat er moet gebeuren, de wachtrij
-- voert het uit (P5). Vandaag staat "als dit verandert, doe dat" verspreid in
-- code (`lib/pipeline/onboarding-refresh.ts`). Deze migratie maakt de eerste,
-- lichte bouwsteen (besluit V7: licht, in Postgres, op de bestaande wachtrij),
-- met precies één gebeurtenis om mee te beginnen: kennis gewijzigd.
--
-- `gebeurtenissen` is het logboek: wat er gebeurde, bij welk merk, op welk
-- object. `gebeurtenis_verwerkingen` zorgt dat een abonnee een gebeurtenis maar
-- één keer verwerkt, ook als de werker dezelfde taak twee keer probeert
-- (`lib/jobs/worker.ts` kent dat scenario al bij `markDone()`): `lib/gebeurtenissen/
-- verwerken.ts` kijkt hier eerst, vóór het (mogelijk niet-idempotente) werk van de
-- abonnee, en zet de rij pas na afloop. Dat is een deterministisch vangnet
-- (conventie 1) in plaats van te vertrouwen dat elke toekomstige abonnee zelf aan
-- idempotentie denkt.
--
-- Beide tabellen zijn interne infrastructuur, net als `jobs`: RLS aan, geen
-- policies, dus geen enkele clientrol kan erbij (zie migratie 0002). Lezen en
-- schrijven loopt alleen via de werker en `lib/gebeurtenissen/` met de
-- service-role key.
--
-- Additief en idempotent (conventie 4).

create table if not exists public.gebeurtenissen (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.profiles (id) on delete cascade,
  -- Groeit met G5: "maand vrijgegeven", "pagina gepubliceerd" komen er mogelijk
  -- bij. Eén vaste waarde vandaag; de check-constraint hieronder is te verruimen
  -- door hem te vervangen (zoals 0116 dat al eens deed).
  soort          text not null,
  -- Wat er precies veranderde: de tabel en de rij (hier altijd 'klantkennis').
  object_tabel   text not null,
  object_id      uuid not null,
  -- Vrije inhoud voor de abonnee, bijvoorbeeld het domein en de sleutel van het
  -- gewijzigde kennisitem. Geen ruwe modeloutput (dat hoort al bij de bron zelf).
  payload        jsonb,
  aangemaakt_op  timestamptz not null default now()
);

do $$ begin
  alter table public.gebeurtenissen add constraint gebeurtenissen_soort_check check (
    soort in ('kennis_gewijzigd'));
exception when duplicate_object then null; end $$;

create index if not exists gebeurtenissen_profiel_soort_idx
  on public.gebeurtenissen (profile_id, soort, aangemaakt_op desc);

create index if not exists gebeurtenissen_object_idx
  on public.gebeurtenissen (object_tabel, object_id);

alter table public.gebeurtenissen enable row level security;

comment on table public.gebeurtenissen is
  'Het gebeurtenissenlogboek (G1 van van-pijplijn-naar-kennissysteem.md). Geen '
  'client-toegang; alleen lib/gebeurtenissen/ en de werker schrijven en lezen.';

-- ── Eén verwerking per abonnee per gebeurtenis ──────────────────────────────
create table if not exists public.gebeurtenis_verwerkingen (
  id             uuid primary key default gen_random_uuid(),
  gebeurtenis_id uuid not null references public.gebeurtenissen (id) on delete cascade,
  -- De naam van de abonnee uit het register (`lib/gebeurtenissen/register.ts`).
  abonnee        text not null,
  verwerkt_op    timestamptz not null default now()
);

do $$ begin
  alter table public.gebeurtenis_verwerkingen
    add constraint gebeurtenis_verwerkingen_uniek unique (gebeurtenis_id, abonnee);
exception when duplicate_object then null; end $$;

alter table public.gebeurtenis_verwerkingen enable row level security;

comment on table public.gebeurtenis_verwerkingen is
  'Bewaakt dat een abonnee een gebeurtenis precies één keer verwerkt (G1). Geen '
  'client-toegang.';
