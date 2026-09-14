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

**Vandaag:** voor het MKB en marketeers die geen SEO-expert zijn. We winnen op **eenvoud, snelheid
en doeltreffendheid**, niet op features of enterprise-diepgang.

**Waar het naartoe gaat is breder**, en dat staat in [`docs/visie.md`](./docs/visie.md): SEO én GEO,
voor organisaties met meer zoekkansen dan een team handmatig kan benutten. Die twee spreken elkaar
op dit moment tegen, met opzet. Wat hieronder staat beschrijft wat er werkt.

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

**Begin hier, in deze volgorde.** Alles hieronder is Nederlands en de code is altijd leidend: wijkt
een document af van wat de code doet, dan is het document fout.

### Eerst lezen, in een half uur ben je bij

| Stap | Bestand | Waarvoor |
|---|---|---|
| 1 | [`CLAUDE.md`](./CLAUDE.md) | **Het startpunt.** Wat de app is, hoe je een opdracht aanpakt, de tien code-conventies, de commando's en waar welke documentatie landt |
| 2 | [`docs/visie.md`](./docs/visie.md) | **Waar het naartoe gaat.** ORBIT ENGINE als autonome groeimotor voor SEO en GEO. Een bestemming, geen stand van zaken |
| 3 | [`APP_FLOW_DOCUMENTATION.md`](./APP_FLOW_DOCUMENTATION.md) | **De keten zonder techniek.** Wat het product doet, de vijf fases, wat een klant kost. Ook te lezen zonder ontwikkelaar te zijn |
| 4 | [`docs/architecture.md`](./docs/architecture.md) | **Hoe het werkt.** Datamodel, rechten, jobwachtrij, elke AI-aanroep, deploy en cron |

### Daarna, als je iets gaat wijzigen

| Bestand | Wanneer je het nodig hebt |
|---|---|
| [`docs/ux-design.md`](./docs/ux-design.md) | Je bouwt of verandert een scherm |
| [`docs/designsystem.md`](./docs/designsystem.md) | Je raakt kleur, vorm of typografie aan. §9b heeft het open ontwerpbesluit |
| [`docs/schrijfstijl.md`](./docs/schrijfstijl.md) | Je schrijft tekst die de klant leest, tot en met foutmeldingen |
| [`docs/merkstrategie.md`](./docs/merkstrategie.md) | Je maakt iets voor búiten de app: campagne, website, presentatie |
| [`supabase/README.md`](./supabase/README.md) | Je schrijft een migratie |

### Naslag

| Bestand | Waarvoor |
|---|---|
| [`docs/logbook.md`](./docs/logbook.md) | **Waarom het is zoals het is.** Elke beslissing met datum en het cijfer eronder. Kijk hier vóór je iets terugdraait: de kans is groot dat het met reden zo staat |
| [`docs/processtappen-nieuwe-pagina.md`](./docs/processtappen-nieuwe-pagina.md) | **Wat er precies gebeurt, stap voor stap.** Genummerde checklist van klant aanmaken tot een opgeleverde pagina, zonder technische kennis nodig |
| [`docs/contentpijplijn-overdracht.md`](./docs/contentpijplijn-overdracht.md) | **De contentpijplijn voor buitenstaanders.** Elke AI-aanroep in volgorde, met de prompts erin, geschreven om aan een externe copywriter of AI-expert te overhandigen |
| [`docs/tasks/`](./docs/tasks/) | Wat er nog open staat. Af is weg, samengevat in het logboek |

## Zijproject: Solliciteren

**Zegt de eigenaar "het Zijproject", "het solliciteren project", "solliciteren" of "de S", dan gaat
de opdracht over `app/solliciteren/` en nergens anders over.** De wijzigingen die eruit volgen horen
in die map thuis. ORBIT ENGINE blijft er ongemoeid bij, op de S in de bovenbalk na
(`components/workspace-chrome.tsx`), en een opdracht die toch aan allebei raakt wordt eerst als
zodanig benoemd.

Het is een eigen app van één pagina in dezelfde codebase, opgezet op 14 september 2026. Wat hij
deelt: de inlog van Supabase en het project bij Vercel, dus hij publiceert mee met `main`. Wat hij
niet deelt: de vormgeving. Die staat in `app/solliciteren/solliciteren.css`, met eigen tokens die
allemaal met `--sol-` beginnen, en de map gebruikt geen enkel component uit `components/`.
`scripts/test-unit.ts` bewaakt die scheiding, dus één geleende kleur of één geleend component valt
meteen op.

Alleen een account van ORBIT ENGINE zelf komt erin: de S hangt aan `isStaff`, en de pagina
controleert datzelfde recht nog een keer op de server. Een klant ziet de knop niet en de pagina
evenmin.

| Waarvoor | Waar |
|---|---|
| Wat er nog open staat | [`docs/tasks/solliciteren-zijproject.md`](./docs/tasks/solliciteren-zijproject.md) |
| Waarom het zo staat | [`docs/logbook.md`](./docs/logbook.md), 14 september 2026 |
