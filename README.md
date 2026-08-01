# GEO Tracker

> Simpele GEO-tracking voor iedereen. Vul een website in (en optioneel een product of onderwerp),
> en zie hoe zichtbaar dat merk is in ChatGPT en andere AI-assistenten.

Waar SEO gaat over ranken in Google, gaat **GEO** over genoemd en aanbevolen worden door
AI-assistenten. Steeds meer mensen stellen hun oriëntatie- en aankoopvragen aan een chatbot. Wordt
jouw merk daar niet genoemd, dan besta je voor die gebruiker niet.

De app beantwoordt drie vragen: **word ik genoemd**, **hoe vaak vergeleken met mijn concurrenten**,
en **waar haalt de AI die informatie vandaan**. Daarna schrijft hij de content die het gat dicht,
en meet of dat gewerkt heeft.

## De keten

**Merk aanmaken → meten → adviseren → content genereren → publiceren → effect bewijzen** —
grotendeels automatisch via een achtergrondwachtrij. De klant hoeft geen browsertab open te houden.

Kernfuncties: klantprofiel met eenmalig merkonderzoek · analyses per onderwerp · 30 automatisch
gegenereerde en volledig beheerbare prompts · een goedkeuringspoort vóór er iets gemeten wordt ·
maandelijkse tracking · één zichtbaarheidsscore met onzekerheidsmarge · doorklikbaar bewijs per
vraag · concurrentievergelijking met merknaam-deduplicatie · technische GEO-audit (staat de site
open voor AI-crawlers?) · contentbibliotheek met redactielus en publicatiepoort · effectmeting na
publicatie · off-site zichtbaarheid.

## Positionering

Voor het MKB en marketeers die geen SEO-expert zijn. We winnen op **eenvoud, snelheid en
doeltreffendheid**, niet op features of enterprise-diepgang.

Bewust **niet** gebouwd: white-label rapportages, 10+ LLM-engines tegelijk, keyword-research
suites, een tweede LLM-provider naast OpenAI. Dat is waar de concurrentie complex en duur wordt.

## Stack

Next.js 15 (App Router) · Supabase (Postgres, Auth, RLS, pg_cron) · Vercel · OpenAI (drie
modeltiers, vast in code) · Tailwind v4 · TypeScript.

## Aan de slag

```bash
npm install
cp .env.example .env.local   # Supabase + OpenAI keys
npm run dev                  # → http://localhost:3000
```

## Documentatie

| | |
|---|---|
| [`CLAUDE.md`](./CLAUDE.md) | Werkinstructie: commando's, conventies, structuur |
| [`docs/architecture.md`](./docs/architecture.md) | Datamodel, pijplijn, jobwachtrij, env, deploy |
| [`docs/ux-design.md`](./docs/ux-design.md) | Design system, componentregels, responsive |
| [`docs/logbook.md`](./docs/logbook.md) | Waarom het is zoals het is |
| [`docs/tasks/`](./docs/tasks/) | Wat er nog open staat |
