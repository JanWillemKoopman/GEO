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
- **Mobiel-vriendelijk.** Een klant moet de score ook even op zijn telefoon kunnen checken. Uitgangspunt is desktop (waar de meeste gebruikers zitten), maar mobiel wordt bewust heroverwogen per scherm, niet simpelweg verkleind — zie [designsystem.md §C](./designsystem.md#c—responsive-strategie-desktop-first-uitgangspunt-mobiel-bewust-heruitgevonden).

> We concurreren níet op "de meeste features" of "de diepste enterprise-analyse". We winnen op **eenvoud, snelheid en doeltreffendheid** voor het MKB en marketeers die geen SEO-experts zijn.

> **🎨 Vastgelegde visuele stijl:** de volledige styling van de app (kleuren, typografie, spacing, componenten, dark mode) is vastgelegd in **[designsystem.md](./designsystem.md)**, gebaseerd op een grondige analyse van InSpace (inspace.io/InSpace Nova). Raadpleeg dit document bij elke UI-beslissing tijdens het bouwen — het is leidend voor de vormgeving, net zoals `abcplan.md` leidend is voor de techniek.

---

## 3. Kernfunctionaliteit (huidige stand)

De app is voorbij de MVP: naast meten en adviseren genereert en publiceert hij ook
zelf content, en bewaakt hij of AI-assistenten de site technisch wel kunnen bereiken.
De volledige keten: **Profiel aanmaken → meten → adviseren → content genereren →
publiceren → effect bewijzen**, grotendeels automatisch via een achtergrond-wachtrij
(zie [abcplan.md](./abcplan.md) voor de technische uitwerking).

| # | Feature | Beschrijving |
|---|---------|--------------|
| 1 | **Klantprofiel** | Eén keer per klant: website crawlen, merk/branche/concurrenten/persona's/tone-of-voice afleiden, contentinventaris opbouwen. Alle analyses van die klant hergebruiken dit — geen herhaald onderzoek. |
| 2 | **Analyse aanmaken** | Onder een profiel: optioneel een specifiek product/onderwerp/thema (bijv. MediaMarkt + "iPhone"). Zonder onderwerp wordt het hele merk gevolgd; mét onderwerp wordt alles gescoped op dat segment. Eén profiel kan meerdere analyses hebben. |
| 3 | **Prompts — automatisch én beheerbaar** | 30 prompts per analyse (10 per funnelfase: oriëntatie/vergelijking/aankoop), automatisch gegenereerd en merk-/concurrent-neutraal geformuleerd. De klant kan ze op elk moment inzien, wijzigen, aanvullen of verwijderen. |
| 4 | **Transparantie & goedkeuring vóór meten** | Na het genereren van onderwerp-research + prompts stopt de app bewust: de klant ziet en kan alles bewerken, en klikt pas daarna expliciet "Bevestig en start meting". |
| 5 | **Automatische tracking** | Na goedkeuring: een directe nulmeting, daarna maandelijks een nieuwe meetronde zolang tracking voor die analyse aan staat. Draait volledig op de achtergrond (job-wachtrij, geen open browsertab nodig). |
| 6 | **Zichtbaarheidsscore** | Eén hoofdgetal (ongewogen én volume-gewogen) dat aangeeft hoe zichtbaar het merk is over alle actieve prompts heen, met onzekerheidsmarge. |
| 7 | **Vragen & antwoorden** | Per prompt het volledige AI-antwoord inzien, met gemarkeerde vermeldingen en aanklikbare bronvermeldingen (evidence-trail terug naar de ruwe meting). |
| 8 | **Concurrentievergelijking** | Hoe vaak word ik genoemd t.o.v. concurrenten, met merknaam-deduplicatie zodat "Coolblue", "coolblue.nl" en "Coolblue B.V." niet als drie aparte partijen tellen. |
| 9 | **Sentiment & bronnen** | Positief/neutraal/negatief per vermelding, en welke bronnen de AI citeert. |
| 10 | **Trend & periodieke rapportage** | Verandering t.o.v. de vorige periode, met een leesbare samenvatting ("wat is er veranderd en waarom"). |
| 11 | **Technische GEO-audit** | Checkt `robots.txt` tegen bekende AI-crawlers (GPTBot, CCBot, ...) — als de site dicht staat voor AI, heeft meer content geen zin. Blokkeert dan bewust content-generatie totdat dit is opgelost. |
| 12 | **Content Bibliotheek** | Op basis van de meetresultaten en gaps: content laten schrijven (3-staps redactieproces — schrijven → kritiek → herschrijven), reviewen, publiceren, en de publicatie laten verifiëren op de live pagina. |
| 13 | **Effect bewijzen** | Na publicatie plant de app een hermeet-golf en berekent statistisch of de zichtbaarheid meetbaar veranderd is. |
| 14 | **Off-site zichtbaarheid** | Signaleert op welke externe domeinen (branches, vergelijkingssites, Wikipedia/Wikidata) het merk wél of niet aanwezig is — een tweede hefboom naast eigen content. |

**Bewust (nog) niet gebouwd**: white-label rapportages, 10+ LLM-engines tegelijk, keyword-research suites, een tweede LLM-provider naast OpenAI. Dat is waar de concurrentie complex en duur wordt — zie [marktonderzoek.md](./marktonderzoek.md).

---

## 4. Techstack

| Laag | Keuze | Waarom |
|------|-------|--------|
| **Ontwikkeling** | Claude Code | AI-assisted development. |
| **Versiebeheer** | GitHub | Broncode + CI/CD trigger. |
| **Hosting / deploy** | Vercel | Zero-config deploys van de Node.js/Next.js app, previews per branch. |
| **Runtime** | Node.js | Backend logica + API-routes + scheduled jobs. |
| **Database & auth** | Supabase | Postgres, ingebouwde authenticatie, row-level security, cron/edge functions. |
| **LLM-API** | **OpenAI — vastgelegd** | Enige engine. Drie modellen (vast in de code, `lib/openai/models.ts`): **`gpt-4.1-nano`** voor hoogvolume/classificatie, **`gpt-4.1-mini`** voor kwaliteitsgevoelige taken (research, prompts, rapport, redactie-kritiek), en **`gpt-4.1` (vol)** uitsluitend voor het schrijven/herschrijven van content — het betaalde product (zie [abcplan.md](./abcplan.md) §2). Uitbreidbaar naar Gemini/Perplexity/Claude als tweede engine, later. |

### Architectuur op hoofdlijnen

```
Klant (browser/mobiel)
        │
        ▼
   Vercel (Next.js / Node.js)
   ├─ Frontend: profielen, analyses, dashboard, content-bibliotheek
   ├─ API-routes: CRUD + schrijfacties (service-role + ownership-check)
   └─ Achtergrond-jobqueue (lib/jobs/): research → meten → rapport → content → publiceren → effect meten
        │           ▲
        │           └─ aangedreven door /api/cron/worker, elke minuut via Supabase pg_cron
        │
        ├──────────────► OpenAI API (nano / mini / gpt-4.1, + web_search)
        │
        ▼
   Supabase (Postgres + Auth)
   ├─ auth.users
   ├─ profiles (klant/merk) → analyses (getrackt onderwerp) → prompts → measurements → mentions
   ├─ content_pieces, technical_audit, offsite_*
   └─ jobs (achtergrond-wachtrij), ai_calls (kostenlogboek)
```

### Datamodel (kern)

- **profiles** – het klant-/merkniveau: website, branche, concurrenten, persona's, tone-of-voice, contentinventaris. Eén keer onderzocht, hergebruikt door alle analyses van die klant.
- **analyses** – een getrackt onderwerp/product onder een profiel: status, eigenaar, tracking aan/uit, content-brief. Eén profiel kan er meerdere hebben.
- **prompts** – de te tracken vragen per analyse; automatisch gegenereerd (30, gescoped per funnelfase) én volledig door de klant beheerbaar.
- **measurements / measurement_results** – elke meetronde en de ruwe AI-respons per prompt (inclusief of er web_search gebruikt is).
- **mentions** – gedetecteerde vermeldingen per resultaat (merk/concurrent, positie, sentiment, geciteerde bron), met merknaam-deduplicatie via `lib/entities/`.
- **entities** – het gededuplideerde merk/concurrent-register waar mentions op matchen.
- **reports** – het gegenereerde adviesrapport per periode, inclusief trend t.o.v. de vorige periode.
- **content_pieces** – gegenereerde/herschreven content, met versie, publicatiestatus en gemeten effect.
- **technical_audit** – of AI-crawlers de site kunnen bereiken (robots.txt-check).
- **offsite_landscape / offsite_presence / offsite_tasks** – welke externe domeinen relevant zijn en of het merk daar aanwezig is.
- **jobs** – de achtergrond-wachtrij die alle bovenstaande stappen orkestreert; geen client-toegang (RLS deny-all).
- **ai_calls** – kostenlogboek: één rij per OpenAI-call, tokens + geschatte kosten.

**Vastgelegd principe: we bewaren alles.** Elke AI-call slaat zijn volledige ruwe JSON-resultaat op in Supabase (niet alleen de uitgesplitste velden) — volledige audit-trail, geen dataverlies. Zie [abcplan.md](./abcplan.md) §5.

> Zie [abcplan.md](./abcplan.md) voor de volledige technische uitwerking (datamodel, pijplijn-staat-voor-staat, Zod-contracten) en [`supabase/README.md`](./supabase/README.md) voor het complete overzicht van alle 23 migraties.

---

## 5. Status

De MVP (meten → adviseren) staat, en is sindsdien uitgebreid met content-generatie,
een achtergrond-jobqueue, technische audit en off-site-scanning. [`optimalisatie.md`](./optimalisatie.md)
is het levende logboek van wat er ná de MVP is bijgebouwd, in welke volgorde, en wat
daarvan nog open staat — raadpleeg dat document voor de actuele stand in plaats van een
vast faseschema hier te herhalen.

---

## 6. Aan de slag

```bash
npm install
cp .env.example .env.local   # vul in: Supabase + OpenAI keys (zie SETUP.md §3)
npm run dev                  # → http://localhost:3000
```

> Volledige installatie-, database- en deploy-instructies: zie [SETUP.md](./SETUP.md) en `.env.example`.

> **Vastgelegde keuze:** deze app bouwt **uitsluitend met OpenAI**, met drie modeltiers
> (`gpt-4.1-nano` / `gpt-4.1-mini` / `gpt-4.1`, zie [abcplan.md](./abcplan.md) §2 voor de
> exacte verdeling per pijplijnstap). Deze modelkeuze staat **vast in de code**
> (`lib/openai/models.ts`), niet als env-variabele. Geen tweede LLM-provider in deze fase.

---

*Dit document beschrijft de productvisie. De marktanalyse die dit plan onderbouwt staat in [marktonderzoek.md](./marktonderzoek.md).*
