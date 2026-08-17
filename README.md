# ORBIT ENGINE

> Zichtbaar zijn in AI-antwoorden. Gemeten, niet gegokt.

Waar SEO gaat over ranken in Google, gaat **GEO** over genoemd en aanbevolen worden door
AI-assistenten. Steeds meer mensen stellen hun oriëntatie- en aankoopvragen aan een chatbot. Wordt
jouw merk daar niet genoemd, dan besta je voor die gebruiker niet.

ORBIT ENGINE beantwoordt drie vragen: **word ik genoemd**, **hoe vaak vergeleken met mijn concurrenten**,
en **waar haalt de AI die informatie vandaan**. Daarna schrijft het de content die het gat dicht,
en meet of dat gewerkt heeft.

## De keten

**Merk aanmaken → meten → adviseren → content genereren → publiceren → effect bewijzen.**
Dat loopt grotendeels automatisch via een achtergrondwachtrij. De klant hoeft geen browsertab open te houden.

Het begint met **drie velden**: webadres, bedrijfsnaam en eventuele andere schrijfwijzen. Daarna
draait een onderzoekspijplijn van acht taken in ongeveer 7,5 minuut (~$0,25) die de site uitkamt,
het aanbod als boom in kaart brengt, de markt onderzoekt, test wat AI-assistenten al over het merk
weten, en er een dossier van maakt.

Kernfuncties: onboarding van drie velden met een volledige onderzoekspijplijn · aanbodboom met
bron per regel · LLM-kennistest (kent een assistent je, en klopt wat hij zegt?) · 5–8 voorgestelde
core topics · analyses per onderwerp · 30 automatisch gegenereerde en volledig beheerbare prompts ·
een goedkeuringspoort vóór er iets gemeten wordt · maandelijkse tracking · één
zichtbaarheidsscore met onzekerheidsmarge · doorklikbaar bewijs per vraag ·
concurrentievergelijking met merknaam-deduplicatie · technische GEO-audit inclusief
entiteitsconsistentie · structurele gap-analyse (welke diensten missen een eigen pagina?) ·
contentbibliotheek met redactielus, duplicatie- en leesbaarheidscontrole en publicatiepoort ·
effectmeting na publicatie · off-site zichtbaarheid.

## Positionering

Voor het MKB en marketeers die geen SEO-expert zijn. We winnen op **eenvoud, snelheid en
doeltreffendheid**, niet op features of enterprise-diepgang.

**Sales-led, niet self-serve.** Een consultant zet het merkprofiel klaar vóór een demogesprek en
verkoopt op wat de pijplijn heeft gevonden; het uur consultancy dat erbij hoort gaat over
strategie: welke onderwerpen commercieel tellen, en wat er speelt buiten de website om. Dat model
is overgenomen van InSpace Nova; de prijs niet.

Bewust **niet** gebouwd: white-label rapportages, 10+ LLM-engines tegelijk, keyword-research
suites, een koppeling met het CMS van de klant, echte zoekvolumes. Dat is waar de concurrentie
complex en duur wordt.

Wél voorbereid maar nog slapend: **Gemini als tweede engine.** De enginelaag, de adapter en de
idempotentiesleutel per engine staan er; zonder `GEMINI_API_KEY` gedraagt de app zich ongewijzigd.

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
| [`docs/schrijfstijl.md`](./docs/schrijfstijl.md) | Tone-of-voice en microcopy-regels, afgeleid van InSpace Nova |
| [`docs/logbook.md`](./docs/logbook.md) | Waarom het is zoals het is |
| [`docs/tasks/`](./docs/tasks/) | Wat er nog open staat |
| [`APP_FLOW_DOCUMENTATION.md`](./APP_FLOW_DOCUMENTATION.md) | De keten uitgelegd zonder techniek, voor sales en management |
