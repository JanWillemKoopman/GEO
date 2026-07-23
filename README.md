# GEO Tracker

> **Simpele GEO-tracking voor iedereen.** Vul een website in (en optioneel een specifiek product/onderwerp), en zie hoe zichtbaar dat merk is in ChatGPT en andere AI-assistenten. Geen handleiding nodig.

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
- **Onboarding in 2 velden.** Website-URL (+ optioneel een specifiek product/onderwerp, bv. "iPhone"). Klaar — de prompts staan automatisch klaar.
- **Geen jargon in de UI.** Geen "share of voice" maar "hoe vaak jij genoemd wordt vs. je concurrenten".
- **Slimme defaults.** We stellen automatisch 30 prompts voor op basis van de website (en het opgegeven onderwerp, indien ingevuld), zodat de klant niet met een leeg scherm start — maar wel altijd zelf kan bijsturen.
- **Transparant vóór er iets gemeten wordt.** Direct na het invullen ziet de klant precies wat het systeem heeft afgeleid (merkinfo + de 30 prompts), kan dit aanpassen, en geeft pas daarna expliciet akkoord om te starten. Geen "black box".
- **Rustige dashboards.** Maximaal een handvol widgets per scherm. Witruimte boven volledigheid.
- **Mobiel-vriendelijk.** Een klant moet de score ook even op zijn telefoon kunnen checken.

> We concurreren níet op "de meeste features" of "de diepste enterprise-analyse". We winnen op **eenvoud, snelheid en doeltreffendheid** voor het MKB en marketeers die geen SEO-experts zijn.

---

## 3. Kernfunctionaliteit (MVP)

| # | Feature | Beschrijving |
|---|---------|--------------|
| 1 | **Analyse aanmaken** | Website-URL + optioneel een specifiek product/onderwerp/thema (bijv. MediaMarkt + "iPhone"). Zonder onderwerp wordt de hele website geanalyseerd; mét onderwerp wordt alles gescoped op dat segment. |
| 2 | **Meerdere analyses per klant** | Eén account kan onbeperkt analyses aanmaken (bv. per product of segment), elk volledig zelfstandig. Overzichtelijk in het "Mijn analyses"-scherm, met een knop om altijd een nieuwe te starten. |
| 3 | **Prompts — automatisch én beheerbaar** | 30 prompts worden automatisch gegenereerd (gescoped op het onderwerp indien opgegeven). De klant kan ze op elk moment inzien, wijzigen, aanvullen of verwijderen. |
| 4 | **Transparantie & goedkeuring vóór meten** | Na het genereren van merkinfo + prompts stopt de app bewust: de klant ziet en kan alles bewerken, en klikt pas daarna expliciet "Bevestig en start meting". Pas dan begint de (betaalde) meting. |
| 5 | **Automatische tracking** | De actieve prompts worden naar de LLM-API gestuurd. Een directe nulmeting is altijd automatisch (na goedkeuring); wekelijkse tracking (10 weken) is per analyse aan/uit te zetten. |
| 6 | **Zichtbaarheidsscore** | Eén helder getal dat aangeeft hoe zichtbaar het merk (of productsegment) is over alle actieve prompts heen. |
| 7 | **Mentions & bronnen** | Per prompt: word ik genoemd, op welke positie, en welke bronnen citeert de AI? |
| 8 | **Concurrentievergelijking** | Hoe vaak word ik genoemd t.o.v. relevante concurrenten (voor dat merk of specifiek dat segment). |
| 9 | **Sentiment** | Wordt er positief, neutraal of negatief gesproken? |
| 10 | **Historie** | Simpele grafiek: gaat de zichtbaarheid omhoog of omlaag over tijd? |

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
| **LLM-API** | **OpenAI — vastgelegd** | Enige engine in de bouwfase. Bouwmodel: **`gpt-4.1-nano`** (instapmodel, betrouwbare structured output). Uitbreidbaar naar Gemini/Perplexity/Claude als tweede engine, later. |

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
        ├──────────────► OpenAI API (gpt-4.1-nano)
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
- **analyses** – het kernobject: website-URL + optioneel onderwerp/product, status, eigenaar. Eén klant kan er meerdere hebben.
- **brand_dna** – geëxtraheerde merk-/segmentkennis per analyse (gescoped op het onderwerp indien opgegeven).
- **prompts** – de te tracken vragen per analyse; automatisch gegenereerd én volledig door de klant beheerbaar (toevoegen/wijzigen/verwijderen).
- **runs** – elke keer dat een prompt naar de LLM gestuurd wordt (engine, timestamp, ruwe respons).
- **mentions** – gedetecteerde vermeldingen per run (merk/concurrent, positie, sentiment, geciteerde bron).

**Vastgelegd principe: we bewaren alles.** Elke AI-call slaat zijn volledige ruwe JSON-resultaat op in Supabase (niet alleen de uitgesplitste velden) — volledige audit-trail, geen dataverlies. Zie [abcplan.md](./abcplan.md) §5.

> Zie [abcplan.md](./abcplan.md) §3 voor de volledige uitwerking van het "Analyse"-concept (incl. de transparantie- en goedkeuringsstap, §3.6, en de volledige klantreis, §3.7), en §5 voor het complete datamodel.

---

## 5. Roadmap

- [ ] **Fase 0 – Onderzoek** ✅ Marktonderzoek concurrenten (zie [concurrenten.md](./concurrenten.md)).
- [ ] **Fase 1 – Fundament** Repo, Supabase-project, Vercel-deploy, auth werkend.
- [ ] **Fase 2 – Onboarding** Account → "Mijn analyses" → nieuwe analyse (URL + optioneel onderwerp) → transparant voortgangsscherm → prompts + merkinfo (auto-gegenereerd + beheerbaar) → expliciete goedkeuring ("Bevestig en start meting").
- [ ] **Fase 3 – Tracking-engine** Prompts uitvoeren tegen OpenAI (`gpt-4.1-nano`), resultaten volledig (incl. ruwe JSON) opslaan.
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
OPENAI_MODEL=gpt-4.1-nano
```

> **Vastgelegde keuze:** deze app bouwt **uitsluitend met OpenAI**, model **`gpt-4.1-nano`** in de bouwfase (zie [abcplan.md](./abcplan.md) §2 voor de onderbouwing). Geen Gemini in deze fase.

---

*Dit document beschrijft het plan en de visie. De concurrentieanalyse die dit plan onderbouwt staat in [concurrenten.md](./concurrenten.md).*
