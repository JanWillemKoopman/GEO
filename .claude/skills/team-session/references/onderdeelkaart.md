# Onderdeelkaart

Waar een onderdeel van ORBIT ENGINE in de code staat, en welke disciplines er standaard naar
kijken. Gebruikt door de skill `team-session`, fase 1 en 2.

De kaart is een startpunt, geen begrenzing. Klopt een rij niet meer, meld dat in de sessie. Nieuw
onderdeel: rij erbij, verder verandert er niets.

## Disciplines

| Code | Agent | Kijkt naar |
|---|---|---|
| Product | `product-strategist` | Waarde, scope, prioriteit, samenhang met de rest van het product |
| UX | `ux-designer` | Flow, begrijpelijkheid, cognitieve belasting, mentale modellen |
| UI | `ui-designer` | Hiërarchie, dichtheid, states, consistentie met het designsysteem |
| Engineering | `software-engineer` | Codekwaliteit, haalbaarheid, regressierisico, technische schuld |
| Architectuur | `software-architect` | Verantwoordelijkheden, dataflows, schaalbaarheid, houdbaarheid |
| AI | `ai-llm-specialist` | Modelinzet, prompts, betrouwbaarheid, waar AI juist niet hoort |
| Growth | `growth-specialist` | Activatie, frictie, waardecommunicatie, doorstroom |
| Data | `data-analyst` | Meetbaarheid, bewijs tegenover aanname, hoe je weet of het beter werd |
| SEO | `seo-specialist` | Zoekverkeer, zoekintentie, technische SEO |
| GEO | `geo-specialist` | Zichtbaarheid in AI-antwoorden, citaties, entiteitsbegrip |
| Security | `security-specialist` | Toegang, rechten, gegevensblootstelling, aanvalsoppervlak |
| Tegenspraak | `devil-advocate` | Draait apart in fase 5, nooit als gewone expert |

## Onderdelen

| Onderdeel | Waar het staat | Documentatie | Standaarddisciplines |
|---|---|---|---|
| Onboarding (merk aanmaken en onderzoekspijplijn) | `app/(app)/merk/nieuw/onboarding-wizard.tsx` (het scherm zelf) · `app/api/profiles/route.ts` · `lib/pipeline/prepare-profile.ts`, `profile-readiness.ts`, `research-steps.ts`, `onboarding-summary.ts`, `onboarding-budget.ts` · `lib/onboarding-insight.ts` · `lib/jobs/progress.ts`, `handlers.ts` · **wat de klant tijdens het wachten ziet:** `app/(app)/merk/[id]/_components/profile-progress.tsx` en `app/(app)/merk/[id]/merkprofiel/page.tsx` · de zes onderzoeksstappen: `lib/pipeline/discover.ts`, `offering.ts`, `propose-topics.ts`, `market.ts`, `llm-baseline.ts`, `synthesis.ts` | `architecture.md` §5 rij 1 t/m 4e · `logbook.md` §14 · `ux-design.md` §4 | UX, Product, Growth, AI, Engineering |
| Merkprofiel (dossier, bewerken, input) | `app/(app)/merk/[id]/merkprofiel/**` · `app/api/profiles/[id]/dossier`, `facts`, `entities` · `lib/profiles.ts`, `profile-gaps.ts`, `profile-editable.ts`, `profile-status.ts` · `lib/pipeline/dossier.ts`, `field-merge.ts`, `factbase.ts`, `factcard.ts` | `architecture.md` §5 rij 4 en 4e · `logbook.md` §15 | Product, UX, AI, Data |
| Login, registratie, uitnodiging | `app/(auth)/**` · `middleware.ts` · `lib/auth.ts`, `access.ts`, `invites.ts`, `invite-rules.ts`, `account-security.ts` · `lib/supabase/middleware.ts` · `app/api/invites/accept/route.ts` | `architecture.md` §2 en §11 | Security, Engineering, UX, Product |
| Overzicht (het merkdashboard) | `app/(app)/merk/[id]/page.tsx` · `lib/dashboard.ts`, `work.ts`, `opportunities.ts`, `milestones.ts`, `milestones-data.ts`, `insights.ts` · `components/dashboard-stats.tsx`, `work-list.tsx`, `geo-scorecard.tsx` | `ux-design.md` §5 en §6 | UX, Product, Data, UI |
| Navigatie en werkruimte | `lib/nav.ts`, `redirects.ts`, `workspace.ts` · `components/sidebar.tsx`, `brand-switcher.tsx`, `app-shell.tsx`, `workspace-chrome.tsx`, `section-rail.tsx` | `ux-design.md` §5 | UX, UI, Product, Engineering |
| Zichtbaarheid in AI (GEO-monitoring) | `app/(app)/merk/[id]/analytics/page.tsx` · `app/(app)/analyses/[id]/page.tsx` en `antwoorden/page.tsx` · `lib/pipeline/measure.ts`, `answers.ts`, `results.ts`, `question-share.ts`, `position.ts`, `geo-share.ts`, `evidence.ts`, `evidence-format.ts` · `lib/stats/uncertainty.ts` · `lib/engines/**` | `architecture.md` §5 rij 10 t/m 12 | GEO, AI, Product, UX, Data |
| Concurrenten | `app/(app)/merk/[id]/analytics/concurrenten/page.tsx` · `lib/pipeline/competitor-intel.ts`, `brand-rankings.ts` · `lib/entities/normalize.ts`, `resolve.ts` | `architecture.md` §5, de rangordetabel | GEO, Data, Product, UX |
| Zoekverkeer en Search Console | `app/(app)/merk/[id]/analytics/zoekverkeer/page.tsx` · `lib/search-console/**` · `lib/pipeline/search-demand.ts`, `volume.ts`, `trend.ts` · `app/api/profiles/[id]/search-console/route.ts` | `architecture.md` §1 en §5 · `tasks/ontwikkelplan-visie.md` sprint 2 | SEO, Data, Product, Engineering |
| Strategie (contentplan en clusters) | `app/(app)/merk/[id]/strategie/**` · `lib/plans.ts`, `plan-order.ts`, `plan-progress.ts`, `plan-status.ts`, `plan-writing.ts`, `plan-bulk.ts` · `lib/pipeline/plan-build.ts`, `topic-link.ts`, `structure-gap.ts` | `architecture.md` §5 rij 13 en 14 | Product, UX, SEO, Data |
| Contentworkflow (briefing, concept, bibliotheek, publiceren) | `app/(app)/analyses/[id]/briefing`, `concept`, `bibliotheek/**` · `lib/pipeline/content.ts`, `briefing.ts`, `briefing-select.ts`, `content-gate.ts`, `readability.ts`, `similarity.ts`, `validate-claims.ts`, `publish.ts`, `publish-check.ts`, `content-diff.ts` · `lib/library.ts` · `lib/jobs/content-jobs.ts` | `architecture.md` §5 rij 15 t/m 17 · `logbook.md` §32 · `schrijfstijl.md` | AI, Product, UX, Engineering |
| Vragenset en goedkeuringspoort | `app/api/analyses/[id]/prompts/**`, `confirm/route.ts` · `lib/pipeline/prompts.ts`, `prompt-weight.ts` · `lib/prompt-mix.ts` | `architecture.md` §5 rij 7 t/m 9 en de promptverdeling | AI, GEO, Product, UX |
| Rapport en advies | `app/(app)/analyses/[id]/rapport/page.tsx` · `lib/pipeline/report.ts`, `recommendation.ts`, `source-analysis.ts`, `gap-analysis` in `lib/schemas/` | `architecture.md` §5 rij 13 en 14 | AI, Product, GEO, UX |
| Effectmeting | `lib/pipeline/impact.ts`, `impact-math.ts`, `period-change.ts`, `period-change-format.ts`, `periods.ts` · hoofdstuk 04 van `app/(app)/analyses/[id]/page.tsx` | `architecture.md` §5 rij 18 | Data, Product, GEO, AI |
| Achtergrondwachtrij en pijplijnstatus | `lib/jobs/**` · `app/api/cron/worker/route.ts` · `lib/analysis-status.ts`, `activity.ts` · `components/work-in-progress.tsx` | `architecture.md` §4 en §9 | Engineering, Architectuur, Product, UX |
| Kosten en limieten | `lib/cost-guard.ts`, `cost-rules.ts`, `spend-limit.ts`, `spend-rules.ts` · `lib/openai/ledger.ts`, `pricing.ts`, `models.ts`, `sampling.ts` | `architecture.md` §6 | AI, Product, Engineering, Data |
| Instellingen, account en team | `app/(app)/instellingen/**` · `lib/accounts.ts`, `account-editable.ts`, `account-status.ts` · `app/api/accounts/[id]/**` | `architecture.md` §11 | Product, UX, Security, Engineering |
| Beheer en toewijzen (staff) | `app/(app)/beheer/page.tsx` · `app/(app)/merk/[id]/admin/**` · `lib/csm.ts`, `csm-data.ts`, `staff.ts`, `archive.ts`, `deletion.ts`, `deletion-rules.ts` | `architecture.md` §11 · `logbook.md` §15 | Product, Security, UX, Engineering |
| Technische GEO-audit | `lib/audit/**` · `components/audit-panel.tsx`, `audit-gate.tsx` · `lib/crawler.ts` | `architecture.md` §5 rij 3 | GEO, Engineering, Product, SEO |
| Off-site aanwezigheid | `lib/offsite/**` · `app/api/analyses/[id]/offsite/[taskId]/route.ts` | `architecture.md` §5 rij 19 | GEO, Product, Data, UX |
| De AI-laag zelf | `lib/openai/**` · `lib/engines/**` · `lib/schemas/**` | `architecture.md` §6 · `logbook.md` §11 | AI, Architectuur, Engineering, Data |
| Vormgeving van een scherm | het scherm zelf · `components/**` · `app/globals.css` | `designsystem.md` · `ux-design.md` §2 t/m §4 | UI, UX, Product |

## Als het onderdeel er niet bij staat

Zoek met Glob op de route (`app/**/<naam>/**`) en met Grep op de Nederlandse schermnaam in
`lib/nav.ts`. Kies daarna de dichtstbijzijnde rij hierboven voor de disciplines, en meld in de
sessie welke rij ontbreekt.
