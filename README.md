# GEO Tracker

> **Simpele GEO-tracking voor iedereen.** Maak een account, voeg een paar prompts toe, en zie hoe zichtbaar jouw merk is in ChatGPT, Gemini en andere AI-assistenten. Geen handleiding nodig.

---

## 1. Wat is dit?

**GEO Tracker** is een webapp waarmee bedrijven kunnen volgen hoe vaak en op welke manier hun merk genoemd wordt in de antwoorden van AI-chatbots (Generative Engine Optimization, kortweg **GEO**).

Waar SEO gaat over ranken in Google, gaat GEO over **genoemd en aanbevolen worden door AI-assistenten** zoals ChatGPT, Google Gemini, Perplexity en Claude. Steeds meer mensen stellen hun aankoop- en oriëntatievragen aan een chatbot in plaats van aan een zoekmachine. Als jouw merk daar niet genoemd wordt, besta je voor die gebruiker niet.

GEO Tracker beantwoordt voor de klant drie simpele vragen:

1. **Word ik genoemd** als iemand een relevante vraag stelt aan een AI?
2. **Hoe vaak** word ik genoemd ten opzichte van mijn concurrenten?
3. **Wordt er positief of negatief** over mij gesproken, en waar haalt de AI die info vandaan?

---

## 2. Ontwerpfilosofie: "Stupid simple & don't make me think"

Dit is het belangrijkste uitgangspunt van het hele product. Elke feature, elke knop en elk scherm wordt getoetst aan één vraag: **snapt een niet-technische klant dit binnen 5 seconden zonder na te denken?**

Concrete regels die we hanteren:

- **Eén hoofdgetal.** De klant ziet direct één zichtbaarheidsscore (0–100). Alles daaronder is verdieping, geen verplichting.
- **Onboarding in 3 stappen.** Account → merk + concurrenten invullen → prompts toevoegen. Klaar.
- **Geen jargon in de UI.** Geen "share of voice" maar "hoe vaak jij genoemd wordt vs. je concurrenten".
- **Slimme defaults.** We stellen automatisch prompts voor op basis van de bedrijfsnaam en branche, zodat de klant niet met een leeg scherm start.
- **Rustige dashboards.** Maximaal een handvol widgets per scherm. Witruimte boven volledigheid.
- **Mobiel-vriendelijk.** Een klant moet de score ook even op zijn telefoon kunnen checken.

> We concurreren níet op "de meeste features" of "de diepste enterprise-analyse". We winnen op **eenvoud, snelheid en doeltreffendheid** voor het MKB en marketeers die geen SEO-experts zijn.

---

## 3. Kernfunctionaliteit (MVP)

| # | Feature | Beschrijving |
|---|---------|--------------|
| 1 | **Account & merk aanmaken** | Registreren met e-mail, merknaam + website + branche opgeven. |
| 2 | **Prompts beheren** | Klant voegt de vragen toe die relevant zijn voor zijn markt (bijv. "wat is de beste boekhoudsoftware voor zzp'ers?"). |
| 3 | **Automatische tracking** | Op een vast interval (bijv. dagelijks/wekelijks) worden de prompts naar de LLM-API's gestuurd (ChatGPT / Gemini). |
| 4 | **Zichtbaarheidsscore** | Eén helder getal dat aangeeft hoe zichtbaar het merk is over alle prompts en engines heen. |
| 5 | **Mentions & bronnen** | Per prompt: word ik genoemd, op welke positie, en welke bronnen citeert de AI? |
| 6 | **Concurrentievergelijking** | Hoe vaak word ik genoemd t.o.v. de door de klant opgegeven concurrenten. |
| 7 | **Sentiment** | Wordt er positief, neutraal of negatief over het merk gesproken? |
| 8 | **Historie** | Simpele grafiek: gaat mijn zichtbaarheid omhoog of omlaag over tijd? |

**Bewust NIET in de MVP** (om simpel te blijven): content-generatie, AI-optimalisatie-agents, white-label rapportages, 10+ engines, keyword-research suites. Dat is waar de concurrentie complex en duur wordt — zie [concurrenten.md](./concurrenten.md).

---

## 4. Techstack

| Laag | Keuze | Waarom |
|------|-------|--------|
| **Ontwikkeling** | Claude Code | AI-assisted development. |
| **Versiebeheer** | GitHub | Broncode + CI/CD trigger. |
| **Hosting / deploy** | Vercel | Zero-config deploys van de Node.js/Next.js app, previews per branch. |
| **Runtime** | Node.js | Backend logica + API-routes + scheduled jobs. |
| **Database & auth** | Supabase | Postgres, ingebouwde authenticatie, row-level security, cron/edge functions. |
| **LLM-API's** | OpenAI (ChatGPT) + Google Gemini | De engines die we tracken. Uitbreidbaar naar Perplexity/Claude. |

### Architectuur op hoofdlijnen

```
Klant (browser/mobiel)
        │
        ▼
   Vercel (Next.js / Node.js)
   ├─ Frontend: dashboard, onboarding
   ├─ API-routes: prompts CRUD, scores ophalen
   └─ Scheduled job: prompts uitvoeren
        │
        ├──────────────► OpenAI API (ChatGPT)
        ├──────────────► Google Gemini API
        │
        ▼
   Supabase (Postgres + Auth)
   ├─ users / accounts
   ├─ brands + concurrenten
   ├─ prompts
   └─ runs / mentions / scores
```

### Datamodel (concept)

- **users** – gekoppeld aan Supabase Auth.
- **brands** – merknaam, website, branche, eigenaar.
- **competitors** – concurrentnamen gekoppeld aan een brand.
- **prompts** – de te tracken vragen per brand.
- **runs** – elke keer dat een prompt naar een engine gestuurd wordt (engine, timestamp, ruwe respons).
- **mentions** – gedetecteerde vermeldingen per run (merk/concurrent, positie, sentiment, geciteerde bron).

---

## 5. Roadmap

- [ ] **Fase 0 – Onderzoek** ✅ Marktonderzoek concurrenten (zie [concurrenten.md](./concurrenten.md)).
- [ ] **Fase 1 – Fundament** Repo, Supabase-project, Vercel-deploy, auth werkend.
- [ ] **Fase 2 – Onboarding** 3-stappen flow: account → merk → prompts.
- [ ] **Fase 3 – Tracking-engine** Prompts uitvoeren tegen ChatGPT + Gemini, resultaten opslaan.
- [ ] **Fase 4 – Dashboard** Eén zichtbaarheidsscore + mentions + concurrentie + historie.
- [ ] **Fase 5 – Polish** Sentiment, e-mailalerts, mobiele optimalisatie.

---

## 6. Aan de slag (later in te vullen)

```bash
# Installeren
npm install

# Lokaal draaien
npm run dev
```

Benodigde omgevingsvariabelen (via Vercel + Supabase):

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
```

---

*Dit document beschrijft het plan en de visie. De concurrentieanalyse die dit plan onderbouwt staat in [concurrenten.md](./concurrenten.md).*
