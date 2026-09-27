-- 0127: de verversingslogica wordt een abonnee (G4 van
-- docs/tasks/van-pijplijn-naar-kennissysteem.md, §9)
--
-- Waarom. `app/api/profiles/[id]/refresh/route.ts` en het onboardingscherm
-- (`app/(app)/merk/[id]/admin/onboarding/page.tsx`) berekenden allebei apart,
-- op het moment zelf, welke profielvelden een mens zette ná de laatste
-- onderzoeksronde (een live vergelijking tegen `profile_field_sources` en
-- `deep_research_at`). Deze kolom laat een abonnee op "kennis gewijzigd" dat
-- bijhouden zodra een veld verandert, zodat beide plekken hem alleen nog
-- hoeven te LEZEN. `profile_field_sources` blijft bestaan en gevuld: hij
-- beschermt ook los hiervan een door een mens gezet veld tegen een volgende
-- onderzoeksronde (`lib/pipeline/field-merge.ts`), en die rol verandert niet.
--
-- Geen foreign key nodig: dit zijn kolomnamen van `profiles` zelf, geen
-- verwijzingen naar een andere tabel.
--
-- Additief en idempotent (conventie 4).

alter table public.profiles
  add column if not exists velden_te_verversen text[] not null default '{}';

comment on column public.profiles.velden_te_verversen is
  'Profielvelden die een mens zette sinds de laatste volledige onderzoeksronde '
  '(G4). Gevuld door de abonnee onderzoek_refresh, gewist zodra een nieuwe '
  'ronde start (lib/pipeline/prepare-profile.ts). lib/pipeline/onboarding-'
  'refresh.ts (planRefresh()) blijft de plek die uitrekent welke stappen dat '
  'oplevert.';
