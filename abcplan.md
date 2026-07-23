# Bouwplan MVP — Fase A + B + C (volautomatisch, met OpenAI)

> Gedetailleerd technisch plan voor de eerste tool: **A. Meten → B. Adviseren → C. Genereren**, volledig automatisch. Content wordt in de app afgeleverd onder het tabblad **"Content Bibliotheek"**. Publiceren naar een CMS (D), self-healing (E) en uitbreiding (F) komen later.

> ## 🔒 Vastgelegde technische keuze — niet ter discussie in deze bouwfase
> **We bouwen uitsluitend met de OpenAI API.** Bouwmodel: **`gpt-4.1-nano`** (instapmodel). Geen Gemini, geen tweede engine, geen premium modellen tijdens het bouwen. Doel van deze fase: **technisch werkend krijgen**, niet uitrollen. Zie §2 voor de onderbouwing.

*Techstack: Node.js + Next.js op Vercel · Supabase (Auth/Postgres/cron) · **OpenAI API (`gpt-4.1-nano`)** · Resend (e-mail). Opgesteld juli 2026.*

---

## 1. Scope & filosofie

**Wat de MVP doet, met twee bewuste momenten waar de klant tussenkomt (de review-gate en C, zie hieronder):**

- **A — Meten:** website-URL (+ optioneel onderwerp/product) → OpenAI analyseert de site (eigen crawl + web-search-tool), gescoped op het onderwerp indien opgegeven → 30 prompts in categorieën → **klant reviewt en bevestigt (transparantie-stap, §3.6)** → nulmeting + optionele 10-weken-monitoring → zichtbaarheidsdata.
- **B — Adviseren:** OpenAI analyseert de meetdata → rapport met zichtbaarheids-gaps en concrete content-aanbevelingen (welke pagina's ontbreken om geciteerd te worden).
- **C — Genereren:** OpenAI schrijft de aanbevolen pagina's als kant-en-klare concepten, **op klant-verzoek** → verschijnen in de **Content Bibliotheek** waar de klant ze leest, kopieert of downloadt.

Dit alles draait niet meer rond één "merk", maar rond het beheerobject **"Analyse"** — zie §3. Eén klant kan meerdere analyses aanmaken, elk gescoped op een eigen website + (optioneel) onderwerp/product. De volledige klantreis (de "trechter") staat uitgewerkt in §3.7.

**Transparantie is een kernprincipe, niet een bijzaak:** de klant ziet en kan bijsturen wat er "achter de schermen" gebeurt (Brand DNA + prompts) vóórdat er ook maar één betaalde meting plaatsvindt — zie §3.6.

**Bewust NIET in deze MVP:** publiceren naar CMS, self-healing, meertalige productie op schaal. De klant krijgt de content *aangeleverd in de app*; wat hij ermee doet is (voorlopig) aan hem.

**Waarom dit volautomatisch kán:** er is geen schrijf-toegang tot externe systemen nodig. Alles blijft binnen onze eigen app en database. Dat elimineert precies de risico's (CMS-auth, per-site-publicatie, rollback) die D/E/F complex maken.

**Ontwerpprincipe blijft:** "stupid simple, don't make me think." De klant vult URL (+ evt. onderwerp) in en krijgt achtereenvolgens: een score, een rapport en een gevulde bibliotheek — zonder knoppen die hij niet snapt.

---

## 2. Modelkeuze — waarom `gpt-4.1-nano` en waarom OpenAI-only

### Waarom OpenAI (en geen Gemini) in deze fase
Puur een projectbeslissing: één engine, één SDK, één factuur, zo min mogelijk bewegende delen tijdens het bouwen. Multi-engine (Gemini/Perplexity/Claude erbij) is een latere, expliciete uitbreiding — geen onderdeel van deze bouwfase.

### Waarom `gpt-4.1-nano` en niet een ander instapmodel

| Model | Prijs (indicatief, in/1M) | Structured output betrouwbaar? | Keuze |
|-------|---------------------------|--------------------------------|-------|
| gpt-5-nano | laagst | ⚠️ Gemelde problemen: volgt het JSON-schema niet consequent (verkeerde velden/volgorde) | ❌ Vermijden |
| **gpt-4.1-nano** | $0,10 / $0,40 | ✅ Betrouwbaar, geen gemelde problemen | ✅ **Gekozen bouwmodel** |
| gpt-4o-mini | $0,15 / $0,60 | ✅ Zeer betrouwbaar (het model waarmee structured outputs oorspronkelijk geïntroduceerd is) | Reserve/fallback |

**Onze hele pipeline leunt op structured output** (Brand DNA, prompts, mentions, rapport, content komen allemaal terug als vast JSON-schema). Betrouwbaarheid van schema-naleving weegt daarom zwaarder dan de laatste cent prijsverschil. `gpt-4.1-nano` is de goedkoopste optie zónder de bekende schema-problemen van gpt-5-nano.

**Fallback-regel:** als tijdens Sprint 1 blijkt dat `gpt-4.1-nano` bij een specifiek schema toch afwijkt, val dan alleen vóór dát ene aanroeppunt terug op `gpt-4o-mini`. De rest van de pipeline blijft ongewijzigd.

> **Prijsvoorbehoud:** online prijsopgaven voor actuele modellen lopen tussen bronnen uiteen (snel-verouderende prijspagina's). Controleer `platform.openai.com/pricing` voor de exacte, actuele tarieven vóór je een kostenbegroting op schaal maakt. De **modelkeuze zelf staat vast** — alleen de prijscijfers in §10 zijn indicatief.

### Welke OpenAI-features de flow mogelijk maken

| Feature | Wat het doet | Waar we het gebruiken |
|---------|--------------|----------------------|
| **`web_search`-tool (Responses API)** | Model mag live het web doorzoeken en citeert bronnen | Stap A: branche/concurrenten begrijpen; meten of merk genoemd wordt |
| **Eigen crawler (géén API-tool)** | Node.js haalt zelf de klant-website op en zet 'm om naar platte tekst | Stap A: de specifieke klant-URL inhoudelijk lezen |
| **Structured output (JSON Schema via Zod-helper)** | Antwoord dwingt in een vast, type-safe JSON-formaat | Overal: prompts, rapport, content als voorspelbare objecten |

**Belangrijk verschil met een Gemini-aanpak:** OpenAI heeft geen ingebouwde "lees deze ene URL"-tool zoals Gemini's URL-context. Daarom lezen we de klant-website **zelf** (een simpele `fetch` + tekst-extractie in Node.js, geen API-kosten) en géven we die tekst als context mee aan de OpenAI-call. De `web_search`-tool gebruiken we daarnaast voor de bredere marktcontext (concurrenten, hoe het merk/onderwerp online voorkomt).

We gebruiken de officiële **`openai`** Node-SDK, met **Zod**-schema's voor structured output.

> **Kostennoot:** de `web_search`-tool wordt apart afgerekend (vast tarief per call + een vaste hoeveelheid "search content"-tokens per call, zie §10). We zetten hem alleen aan waar echt nodig (branche-analyse + meting), niet bij pure tekstgeneratie.

---

## 3. Analyses — het kernobject en hoe de klant dit beheert

Dit is de belangrijkste structurele wijziging in dit plan: het draaipunt van de app is niet langer "één merk = één workspace", maar **de Analyse**. Een klant kan er meerdere aanmaken, elk met een eigen scope.

### 3.1 Het onboarding-formulier: twee velden

| Veld | Verplicht? | Voorbeeld |
|------|-----------|-----------|
| **Website-URL** | Ja | `mediamarkt.nl` |
| **Onderwerp / product / thema** | Nee (optioneel) | `iPhone`, `Smartphone reparatie` |

**Waarom dit tweede veld cruciaal is:** zonder scope is een meting voor een groot bedrijf als MediaMarkt te breed en niet-stuurbaar — "hoe zichtbaar is MediaMarkt in AI" zegt weinig. Met het onderwerp-veld ingevuld op bijvoorbeeld **"iPhone"**, wordt de hele analyse — Brand DNA, de 30 prompts, de meting, het rapport — **gescoped op dat specifieke productsegment**, zodat MediaMarkt precies kan zien en sturen hoe zij scoren *binnen die categorie*, los van hun brede assortiment.

### 3.2 Gedrag afhankelijk van het onderwerp-veld — ✅ vastgelegd

- **Onderwerp leeg gelaten:** de website wordt in zijn volledigheid geanalyseerd. Brand DNA beschrijft het hele bedrijf/aanbod; de 30 prompts dekken alle diensten/producten die de site aanbiedt (zoals in de oorspronkelijke opzet van dit plan).
- **Onderwerp ingevuld:** Brand DNA (halte 1) wordt **specifiek voor dat onderwerp** opgesteld — welke rol speelt dit product/segment binnen het bedrijf, welke concurrenten zijn relevant *voor dit segment* (niet per se de concurrenten van het hele bedrijf), welke persona's zoeken hiernaar. De 30 prompts (halte 2) gaan **uitsluitend over dat onderwerp** binnen de context van het merk (bv. "Waar koop ik het beste een iPhone?", "MediaMarkt vs Coolblue voor iPhone-reparatie", "Wat kost een iPhone-schermreparatie bij MediaMarkt?") — geen prompts over wasmachines of tv's als het onderwerp "iPhone" is.

### 3.3 Eén klant, meerdere analyses
Een account kan onbeperkt analyses aanmaken. Elke analyse is **volledig zelfstandig**: eigen Brand DNA, eigen 30 prompts, eigen tracking, eigen rapport, eigen Content Bibliotheek, eigen aan/uit-schakelaar voor de wekelijkse lus. Twee analyses voor dezelfde website (bv. MediaMarkt + "iPhone" én MediaMarkt + "wasmachines") delen niets — dat is bewust simpel gehouden; brand-niveau deduplicatie is geen MVP-scope.

**Onderwerp is niet achteraf wijzigbaar.** Zodra een analyse is gestart, staat het onderwerp vast — wijzigen zou het Brand DNA en de prompts met terugwerkende kracht ongeldig maken. Wil de klant een andere scope, dan start hij een **nieuwe analyse** (kost een nieuwe nulmeting, ~$0,35, zie §10).

### 3.4 "Mijn analyses" — het landingsscherm na inloggen
Na inloggen ziet de klant een lijst van al zijn analyses, niet direct een enkele workspace:

- Per rij: naam (auto-gegenereerd als `{website} — {onderwerp}` of `{website} (hele site)` zonder onderwerp), status-badge, huidige zichtbaarheidsscore (indien beschikbaar), laatst bijgewerkt.
- **Status-badges:** `Analyseren…` (stap 1–5 lopen nog) → `Gereed` (nulmeting + rapport beschikbaar) → eventueel `Mislukt` (met retry-optie).
- **Grote, altijd zichtbare knop: "+ Nieuwe analyse starten."** Start halte 0 opnieuw (nieuw formulier: URL + onderwerp), volledig onafhankelijk van bestaande analyses. Dit kan de klant **altijd**, op elk moment.
- Klik op een rij → opent de workspace van die ene analyse.

### 3.5 De workspace van één analyse — 4 tabbladen
De workspace van een analyse bestaat uit 4 tabbladen:

- **Overzicht** — score, trendlijn, jij-vs-concurrenten (zie eerdere versie van dit plan / het pipeline-overzicht).
- **Rapport** — gaps + aanbevelingen + "Genereer deze pagina".
- **Content Bibliotheek** — kaarten met gegenereerde pagina's.
- **Instellingen** — de centrale beheerplek voor déze analyse:
  - Website + onderwerp, **read-only** (zie 3.3 — niet wijzigbaar na start).
  - **Brand DNA — inzichtelijk én bewerkbaar** (zie 3.6): alle velden (branche, producten, tone-of-voice, persona's, waardeproposities, concurrenten) worden getoond en kunnen door de klant aangepast worden.
  - **De volledige prompt-lijst (alle 30, of meer/minder na beheer), te allen tijde inzichtelijk én beheerbaar:**
    - ✏️ **Bestaande prompt wijzigen** (tekst en/of categorie aanpassen).
    - ➕ **Nieuwe prompt toevoegen** (vrij tekstveld + categorie-keuze).
    - 🗑️ **Prompt verwijderen.**
    - ⏸️ **Aan/uit per prompt** (tijdelijk pauzeren zonder verwijderen).
  - **Wekelijkse tracking: aan/uit** (`tracking_enabled`).

**Belangrijk ontwerpbesluit — vooruitkijkend beheer:** wijzigingen aan de prompt-lijst raken nooit de al verzamelde historische `tracking_runs` (data-integriteit blijft intact voor de trendlijn — zie §5, `prompt_text_snapshot`). Een nieuwe of gewijzigde prompt telt pas mee vanaf de **eerstvolgende meting**.

**Dit tabblad Instellingen speelt een dubbele rol:** de **eerste keer** dat een analyse hier terechtkomt (direct na halte 2) is het een **verplichte review-stap** vóórdat er gemeten wordt (zie 3.6). **Daarna** is het gewoon de doorlopende beheerplek, zonder verplichting.

### 3.6 Transparantie & goedkeuring — de review-stap tussen halte 2 en halte 3 (✅ vastgelegd)

Direct nadat halte 1 (Brand DNA) en halte 2 (30 prompts) automatisch zijn doorlopen, **stopt de pipeline bewust** en krijgt de klant het volledige resultaat te zien — niets gebeurt "achter de schermen" zonder dat de klant het kan inzien of bijsturen:

1. **Transparantie:** zodra halte 1+2 klaar zijn (`analyses.status = 'concept_klaar'`), landt de klant automatisch op het tabblad **Instellingen**, dat nu fungeert als een **concept-scherm**: het volledige Brand DNA (branche, producten, tone-of-voice, persona's, waardeproposities, concurrenten) én de volledige lijst van 30 prompts staan hier leesbaar, gegroepeerd per categorie.
2. **Bewerkbaar:** de klant kan, vóórdat er ook maar één meting is gedaan, zowel het **Brand DNA aanpassen** (bv. een verkeerd geïdentificeerde concurrent verwijderen) als de **prompts bewerken** (zie A2b, §6) — exact dezelfde CRUD-mechaniek die ook later blijft bestaan.
3. **Definitieve bevestiging:** onderaan staat één duidelijke knop: **"Bevestig en start meting."** Pas na deze klik:
   - `analyses.status` gaat van `'concept_klaar'` naar `'meten'`,
   - halte 3 (de nulmeting) start,
   - de prompt-lijst en het Brand DNA blijven daarna nog steeds bewerkbaar (zie 3.5), maar niet meer als verplichte stap — gewoon doorlopend beheer.

**Waarom dit zo werkt:** de klant moet nooit het gevoel hebben dat een "black box" zomaar gaat meten en geld/tijd besteedt op basis van een automatische inschatting die hij niet gezien heeft. Door dit expliciete, verplichte goedkeuringsmoment in te bouwen, is elke stap van de pipeline zichtbaar en controleerbaar vóórdat de (duurdere) meetfase start.

### 3.7 De trechter — het klantperspectief (✅ vastgelegd, leidend voor de UI/UX)

Vanuit de klant bekeken is dit de volledige, logische trechter waarin hij zich op elk moment bevindt. Elke stap heeft een duidelijke naam, een duidelijk vervolg, en de klant weet altijd waar hij is:

| # | Scherm | Wat de klant ziet/doet | Status van de analyse |
|---|--------|--------------------------|------------------------|
| 1 | **Inloggen** | E-mail + wachtwoord (Supabase Auth). | — |
| 2 | **Mijn analyses** | Lijst van bestaande analyses (of leeg bij eerste bezoek) + knop "+ Nieuwe analyse starten". | — |
| 3 | **Nieuwe analyse — formulier** | Twee velden: website-URL + optioneel onderwerp/product. Knop "Start analyse". | `bezig` aangemaakt |
| 4 | **Voortgangsscherm (transparant, live)** | Duidelijke, simpele voortgangsindicatie: *"Website lezen ✓ → Merk analyseren… → Prompts opstellen…"* — de klant ziet dat er iets gebeurt, geen kale laadspinner. Duurt doorgaans enkele tientallen seconden. | `bezig` |
| 5 | **Concept & goedkeuring** *(= tabblad Instellingen, eerste keer verplicht)* | Brand DNA + 30 prompts, volledig leesbaar en bewerkbaar. Knop **"Bevestig en start meting."** | `concept_klaar` → klik → `meten` |
| 6 | **Meten (transparant, live)** | Korte voortgangsindicatie op Overzicht: *"Bezig met meten… (x/30 prompts verwerkt)"*. | `meten` |
| 7 | **Analyse-workspace** | De 4 tabbladen: Overzicht (score), Rapport (aanbevelingen), Content Bibliotheek, Instellingen (nu doorlopend beheer, niet meer verplicht). | `gereed` |
| 8 | **Terug naar Mijn analyses, altijd** | Vanuit elke stap kan de klant terug naar het overzicht van al zijn analyses, en op elk moment een geheel nieuwe analyse starten (stap 3), onafhankelijk van waar hij in een andere analyse is. | — |

**Ontwerpregel:** de klant bevindt zich **altijd in precies één van deze 8 stappen**, en elk scherm maakt duidelijk wat de vorige stap was en wat de volgende actie is (geen dead ends, geen schermen zonder duidelijke "volgende stap"-knop). Dit is de concrete invulling van "stupid simple, don't make me think" toegepast op de klantreis als geheel, niet alleen op individuele schermen.

---

## 4. Architectuur op hoofdlijnen

```
                    KLANT (browser / mobiel)
                            │
                            ▼
        ┌────────────────────────────────────────────────┐
        │           Vercel — Next.js / Node.js            │
        │                                                 │
        │  /analyses                 → "Mijn analyses"-lijst
        │                               + "Nieuwe analyse"-knop
        │  /analyses/[id]/overzicht   │
        │  /analyses/[id]/rapport     │  UI-tabs per analyse
        │  /analyses/[id]/bibliotheek │
        │  /analyses/[id]/instellingen (= concept-scherm de eerste
        │    keer; daarna doorlopend: DNA + prompt-CRUD,
        │    tracking-toggle)                             │
        │                                                 │
        │  Eigen crawler: fetch + tekst-extractie         │
        │  (geen API-kosten, alleen de klant-URL)         │
        │                                                 │
        │  API-routes (server):                           │
        │   • /api/analyses              (CRUD analyses)  │
        │   • /api/analyses/[id]/brand-dna (bekijk/bewerk) │
        │   • /api/analyses/[id]/prompts   (CRUD prompts)  │
        │   • /api/analyses/[id]/confirm   (A2c: bevestig, │
        │       zet status 'concept_klaar' → 'meten')      │
        │   • /api/analyses/[id]/report    (B: rapport)    │
        │   • /api/analyses/[id]/generate  (C: content)    │
        │                                                 │
        │  Cron (Vercel Cron / Supabase pg_cron):         │
        │   • weekly-tracking-run                         │
        │     (verwerkt alléén analyses met                │
        │      tracking_enabled = true)                   │
        └───────────────┬────────────────┬────────────────┘
                        │                │
                        ▼                ▼
              ┌──────────────┐   ┌──────────────────┐
              │  OpenAI API  │   │    Supabase      │
              │  gpt-4.1-nano│   │  Postgres + Auth │
              │  • web_search│   │  + RLS + cron    │
              │  • structured│   └──────────────────┘
              └──────────────┘            │
                        └──────► Resend (rapport-e-mail)
```

### Uitvoeringsmodel
- **Korte taken** (analyse, één rapport, één pagina, prompt-CRUD) → Next.js API-route / serverless function op Vercel.
- **Lange/herhalende taken** (nulmeting, wekelijkse tracking, batch-generatie van pagina's) → **job-queue in Supabase** die door een **cron** afgewerkt wordt in kleine batches, per analyse. Zo blijven we binnen serverless time-limits en houden we de kosten controleerbaar, ook als een klant tientallen analyses tegelijk heeft lopen.

---

## 5. Datamodel (Supabase / Postgres)

> ### 🔒 Vastgelegd principe: we bewaren álles
> **Elke AI-call in deze pipeline slaat zijn volledige resultaat op in Supabase — nooit alleen een samenvatting of afgeleide waarde.** Dat betekent: de ruwe JSON-output van elke OpenAI-call (Brand DNA, prompt-generatie, mention-beoordeling, rapport, content) wordt **altijd** volledig bewaard, náást de uitgesplitste kolommen die de UI gebruikt. Reden: (1) niets gaat verloren als we later een kolom toevoegen of een parsing-bug vinden, (2) volledige audit-trail — je kunt precies reconstrueren wat het model op elk moment zag en antwoordde, (3) het maakt herberekening/herprocessing achteraf mogelijk zonder opnieuw te hoeven bevragen (dus zonder extra kosten). Elke tabel die AI-output bevat heeft daarom een `raw_json`-kolom (of gebruikt een bestaand JSON-veld) met het complete, ongewijzigde antwoord.

```
users                 (Supabase Auth)
analyses              id, user_id, url, topic(nullable), name,
                      status ('bezig'|'concept_klaar'|'meten'|'gereed'|'mislukt'),
                      tracking_enabled(bool, default false), created_at
brand_dna             id, analysis_id, tone_of_voice, products[], personas[],
                      value_props[], competitors[], summary,
                      raw_json,                    -- ← volledige ruwe OpenAI-output (halte 1)
                      edited_by_user(bool, default false), updated_at
                      -- gescoped op het onderwerp indien opgegeven (zie §3.2)
prompts               id, analysis_id, text, category, intent, active,
                      created_by ('system'|'user'), source_raw_json,
                      -- source_raw_json: het fragment van de halte-2-output
                      -- waaruit déze prompt ontstond (audit-trail per prompt)
                      updated_at
tracking_runs         id, prompt_id, prompt_text_snapshot, prompt_category_snapshot,
                      -- snapshot = de prompt-tekst/categorie ZOALS DIE WAS op het
                      -- moment van meten — blijft ongewijzigd ook als de prompt
                      -- later bewerkt/verwijderd wordt (zie §3.5, vooruitkijkend beheer)
                      engine, model_used, week_no, ran_at,
                      raw_response,                -- ← ruw AI-antwoord uit 3a (het "gesimuleerde" antwoord)
                      mention_json,                 -- ← volledige ruwe structured-output uit 3b
                      brand_mentioned(bool), position, sentiment,
                      competitors_mentioned[], cited_sources[],
                      openai_response_id, tokens_used, cost_usd
visibility_scores     analysis_id, week_no, score, share_of_voice, per_engine_json
reports               id, analysis_id, period, summary, gaps_json,
                      recommendations_json, raw_json,   -- ← volledige ruwe OpenAI-output (halte 5)
                      generated_at
content_pieces        id, analysis_id, report_id, type, title, target_intent,
                      cluster, body_markdown, meta_title, meta_description,
                      schema_jsonld, faq_json, raw_json,  -- ← volledige ruwe OpenAI-output (halte 6)
                      status, word_count, created_at
jobs                  id, analysis_id, type, payload_json, status,
                      attempts, scheduled_for, last_error
```

**Kernrelaties:** een `user` heeft veel `analyses`; een `analysis` heeft één `brand_dna` en veel `prompts`; elke prompt genereert (indien actief) `tracking_runs`; die rollen op naar `visibility_scores`; daaruit komt een `report` met `recommendations`; elke aanbeveling wordt een `content_piece` in de bibliotheek. `jobs` is de motor voor async werk, altijd gekoppeld aan één `analysis_id`.

**`prompts.created_by`** onderscheidt systeem-gegenereerde prompts (halte 2) van door de klant zelf toegevoegde prompts — puur informatief in de UI ("door jou toegevoegd"-label).

**`tracking_runs.prompt_text_snapshot` / `prompt_category_snapshot`** zijn bewust **gedenormaliseerd** (dubbel opgeslagen, niet alleen via `prompt_id` opgezocht): omdat prompts achteraf bewerkbaar/verwijderbaar zijn (§3.5, §6 A2b), zou een live-join naar `prompts` de geschiedenis vervalsen. Door de tekst/categorie te bevriezen op het moment van meten, blijft de trendlijn en het rapport historisch correct, ongeacht latere wijzigingen.

**`brand_dna.edited_by_user`** vlagt of de klant het automatisch gegenereerde Brand DNA heeft aangepast tijdens de review (zie §3.6 / §6 A2c) — puur informatief, geen functionele impact.

**RLS:** elke tabel filtert op `user_id` (direct op `analyses`, en via `analysis_id` op de overige tabellen) zodat klanten alleen hun eigen analyses zien.

---

## 6. FASE A — Meten (volautomatisch, per analyse)

### A0. Nieuwe analyse starten — altijd beschikbaar
**Trigger:** klant klikt "+ Nieuwe analyse starten" vanuit "Mijn analyses" (zie §3.4). Dit kan op elk moment, ongeacht hoeveel andere analyses al lopen of klaar zijn.
**Formulier:** Website-URL (verplicht) + Onderwerp/product/thema (optioneel, vrije tekst).
→ Nieuwe rij in `analyses` met `status = 'bezig'`. Halte A1 start direct. **UI:** de klant ziet vanaf hier het transparante voortgangsscherm uit §3.7 (stap 4) — geen kale laadspinner, maar zichtbare stappen ("Website lezen…", "Merk analyseren…", "Prompts opstellen…").

### A1. Brand DNA (topic-aware)
**Stap 1 (geen API-call):** eigen Node.js-crawler haalt de homepage (+ evt. 2-3 kernpagina's) op met `fetch` en zet de HTML om naar schone platte tekst.
**Stap 2 (OpenAI-call):** Responses API-call met de geëxtraheerde tekst als context, **`web_search`-tool aan** (voor bredere marktcontext) en **structured output**.

Prompt (kern) — **twee varianten, afhankelijk van of een onderwerp is opgegeven:**
- **Zonder onderwerp:** *"Analyseer dit bedrijf op basis van deze website-tekst en het web. Bepaal: branche, kernproducten/-diensten, tone-of-voice, doelgroep-persona's, waardeproposities en 3–5 belangrijkste concurrenten."*
- **Met onderwerp (bv. "iPhone"):** *"Analyseer dit bedrijf specifiek voor het onderwerp/product **'{onderwerp}'**. Bepaal: welke rol dit product/segment speelt binnen het bedrijf, tone-of-voice, doelgroep-persona's die hiernaar zoeken, waardeproposities **specifiek voor dit segment**, en 3–5 concurrenten die relevant zijn **voor dit specifieke onderwerp** (niet per se de concurrenten van het hele bedrijf)."*

Zod-schema (vereenvoudigd, ongewijzigd qua vorm):
```ts
const BrandDNA = z.object({
  industry: z.string(),
  products: z.array(z.string()),
  toneOfVoice: z.string(),
  personas: z.array(z.object({ name: z.string(), needs: z.array(z.string()) })),
  valueProps: z.array(z.string()),
  competitors: z.array(z.string()),
  summary: z.string(),
});
```
→ Opslaan in `brand_dna` (inclusief `raw_json`, zie §5), gekoppeld aan `analysis_id`. **Dit resultaat is straks volledig zichtbaar én bewerkbaar voor de klant** (zie A2c) — geen enkel veld blijft verborgen.

### A2. Prompt-generatie (30 stuks in categorieën, topic-aware) — ✅ vastgelegd
**OpenAI-call:** structured output, **zonder** `web_search` (input is de Brand DNA, geen live web nodig).

- **Zonder onderwerp:** de 30 prompts dekken **alle diensten/producten** die de website aanbiedt (brede dekking, zoals in de oorspronkelijke opzet).
- **Met onderwerp:** alle 30 prompts gaan **uitsluitend over dat onderwerp**, binnen de context van het merk. Voorbeeld voor MediaMarkt + onderwerp "iPhone":

| Categorie | Voorbeeld-prompt (onderwerp "iPhone") |
|-----------|----------------------------------------|
| Oriëntatie | "Waar koop ik het beste een iPhone?" |
| Vergelijking | "MediaMarkt vs Coolblue voor iPhone-reparatie: wat is beter?" |
| Probleem→oplossing | "Mijn iPhone-scherm is kapot, waar laat ik dit repareren?" |
| Lokaal/branche | "Beste iPhone-reparatie in [regio]?" |
| Merkspecifiek | "Is MediaMarkt betrouwbaar voor iPhone-reparaties?" |

→ Opslaan in `prompts` (30 rijen, `created_by = 'system'`, elk met `source_raw_json`). Zodra dit klaar is: `analyses.status = 'concept_klaar'`.

### A2b. Prompt-beheer (CRUD) — ✅ vastgelegd, te allen tijde beschikbaar
Via het tabblad **Instellingen** (zie §3.5) kan de klant, zowel tijdens de verplichte review (A2c) als daarna doorlopend:
- een prompt **toevoegen** (`created_by = 'user'`),
- een bestaande prompt **wijzigen** (tekst/categorie),
- een prompt **verwijderen**,
- een prompt **aan/uit zetten** (pauzeren zonder verwijderen).

Dit gebeurt via eenvoudige CRUD-API-routes (`/api/analyses/[id]/prompts`), geen AI-call nodig. Wijzigingen tellen mee vanaf de eerstvolgende meting (zie §3.5, "vooruitkijkend beheer"). Hetzelfde geldt voor het Brand DNA: bewerken via `/api/analyses/[id]/brand-dna` (PATCH), geen AI-call, zet `brand_dna.edited_by_user = true`.

### A2c. Transparantie & goedkeuring — de verplichte review-gate — ✅ vastgelegd
**Dit is een nieuwe, verplichte stap tussen A2 en A3** (uitgewerkt in §3.6): de pipeline stopt bewust zodra A1+A2 klaar zijn en wacht op de klant.

- **Trigger:** `analyses.status = 'concept_klaar'` (gezet aan het eind van A2).
- **UI:** de klant landt automatisch op het tabblad **Instellingen**, dat nu fungeert als concept-scherm: volledig Brand DNA + volledige prompt-lijst, leesbaar én bewerkbaar (via A2b).
- **Geen AI-call in deze stap** — puur weergave + CRUD op al bestaande data.
- **Afronding:** knop **"Bevestig en start meting."** Bij klik: `analyses.status` gaat van `'concept_klaar'` naar `'meten'`, en **pas dan** start A3.

**Zonder deze bevestiging start A3 nooit** — dit is de harde poort die transparantie garandeert: er wordt nooit gemeten (en dus nooit geld uitgegeven aan `web_search`-calls) op basis van een Brand DNA of prompt-lijst die de klant niet gezien en goedgekeurd heeft.

### A3. Monitoring — nulmeting + optionele 10 weken
**Trigger:** `analyses.status = 'meten'` (pas na de bevestiging in A2c).
**Mechanisme:** voor elke actieve prompt binnen een analyse:

- **3a — De vraag stellen:** OpenAI Responses API-call **met `web_search`-tool aan** — simuleert wat een AI-assistent zou antwoorden als een echte klant die vraag stelt.
- **3b — Het antwoord beoordelen:** een tweede, goedkope OpenAI-call (structured output, **geen** `web_search`) beoordeelt het antwoord:

```ts
const Mention = z.object({
  brandMentioned: z.boolean(),
  position: z.number().nullable(),      // volgorde van vermelding
  sentiment: z.enum(["positive","neutral","negative"]),
  competitorsMentioned: z.array(z.string()),
  citedSources: z.array(z.string()),
});
```
→ Opslaan in `tracking_runs` — **volledig**: het ruwe antwoord uit 3a (`raw_response`), de complete structured-output uit 3b (`mention_json`), plus een bevroren snapshot van de prompt-tekst/categorie op dat moment (`prompt_text_snapshot`/`prompt_category_snapshot`, zie §5), en waar mogelijk `openai_response_id`/`tokens_used`/`cost_usd` voor kostenbewaking. Niets wordt alleen "verwerkt en weggegooid" — zie het vastgelegde principe in §5. Vervolgens aggregeren naar `visibility_scores` (score 0–100 + share-of-voice).

**Batching:** de actieve prompts van een analyse worden in kleine job-batches verwerkt zodat één run niet timeout't en kosten voorspelbaar blijven.

**MVP-versnelling — ✅ vastgelegd:** we tonen de klant meteen een **directe nulmeting (week 0)** zodra de actieve prompts één keer zijn doorlopen, in plaats van 10 weken te wachten. Dit gebeurt altijd, automatisch, voor elke nieuwe analyse (na de bevestiging in A2c). Zodra dit klaar is: `analyses.status = 'gereed'`.

**Wekelijkse lus — ✅ vastgelegd: per analyse aan/uit-schakelbaar.** De 10-weken-trend draait **niet** automatisch door na de nulmeting. Elke analyse heeft `tracking_enabled` (standaard uit), beheerbaar in het tabblad **Instellingen**. De cron verwerkt bij elke wekelijkse run **alleen analyses waar dit aanstaat**. Zo kun je gratis prospect-analyses op de eenmalige nulmeting houden en pas voor betalende klanten (of specifieke analyses) de wekelijkse kosten laten lopen.

---

## 7. FASE B — Adviseren (volautomatisch, per analyse)

**Trigger:** na de nulmeting (of na een latere week), of on-demand knop "Genereer rapport".
**OpenAI-call:** structured output, **geen** `web_search` nodig. Input = `visibility_scores` + `tracking_runs` + `brand_dna` — allemaal gescoped op één `analysis_id`.

Het model produceert:
```ts
const Report = z.object({
  headlineScore: z.number(),
  summary: z.string(),                    // jargon-vrij, plain-language
  gaps: z.array(z.object({
    cluster: z.string(),
    problem: z.string(),                  // "AI noemt concurrent X, jou niet"
    evidencePrompts: z.array(z.string()),
  })),
  recommendations: z.array(z.object({
    title: z.string(),                    // wordt straks een content_piece
    type: z.enum(["article","faq","landing","comparison"]),
    targetIntent: z.string(),
    why: z.string(),                      // waarom dit de gap dicht
    priority: z.number(),                 // 1–3
  })),
});
```
→ Opslaan in `reports`. Toon in tab **Rapport**: één headline-score, korte samenvatting, top-gaps, en een lijst aanbevelingen met **"Genereer deze pagina"**-knop.
→ Mail het rapport via **Resend** (jouw acquisitie-stap 5). Eindig altijd met **1–3 priority actions**.

---

## 8. FASE C — Genereren → Content Bibliotheek (per analyse)

**Trigger — ✅ vastgelegd: pas na klik/goedkeuring door de klant.** De klant klikt bij een aanbeveling op "Genereer deze pagina" (of keurt een batch goed). **Niet** volautomatisch vooraf — dit spaart kosten en geeft de klant controle: er staan alleen aanbevelingen klaar totdat de klant er zelf voor kiest.

**Mechanisme:** elke klik wordt een **job** die één `content_piece` genereert. De cron/queue werkt ze af.

**OpenAI-call per pagina:** structured output, **geen** `web_search`. Input = de aanbeveling + Brand DNA (voor on-brand tone, inclusief het onderwerp indien van toepassing) + de bewijs-prompts. LLM-geoptimaliseerd: *begin met het directe antwoord, heldere koppen, concrete datapunten, FAQ, schema-markup.*

```ts
const ContentPiece = z.object({
  title: z.string(),
  metaTitle: z.string(),
  metaDescription: z.string(),
  bodyMarkdown: z.string(),               // volledige pagina in Markdown
  faq: z.array(z.object({ q: z.string(), a: z.string() })),
  schemaJsonLd: z.string(),               // klaar om te plakken
  targetIntent: z.string(),
  cluster: z.string(),
});
```
→ Opslaan in `content_pieces` met `status: "ready"`.

### Het tabblad "Content Bibliotheek"
De centrale opleverplek, per analyse. Een lijst kaarten:
- **Kaart** = titel, type-badge (artikel/FAQ/landing/vergelijking), cluster, status, woordaantal.
- **Detail** = leesbare weergave (Markdown → HTML) met knoppen: **Kopiëren**, **Download (.md / .html)**, **Kopieer schema-markup**, en later (Fase D) **Publiceer naar CMS**.
- **Filters** = op cluster / type / status. Simpel, rustig, veel witruimte.
- **Lege staat** (nog niets gegenereerd): duidelijke uitleg *"Ga naar het Rapport en kies welke pagina's je wilt laten schrijven."*

Zo levert de tool op klant-verzoek een **steeds verder gevulde bibliotheek** op, per analyse. Dat is ~80% van Nova's waarde, zonder het CMS-risico en zonder onnodige kosten voor content die niemand vroeg.

---

## 9. End-to-end flow (samengevat, per analyse)

```
0. Klant klikt "+ Nieuwe analyse" → URL + (optioneel) onderwerp ingevuld    status: bezig
1. [eigen crawl, geen call]         → website-tekst
2. [OpenAI + web_search]            → Brand DNA (topic-aware)         (A1)
3. [OpenAI structured, geen search] → 30 prompts (topic-aware)        (A2)   status: concept_klaar
   ─────────────── PIPELINE STOPT BEWUST — WACHT OP KLANT ───────────────
4. [klant ziet + bewerkt]           → Brand DNA + prompts, transparant (A2c)
   [klant, altijd beschikbaar]      → prompts toevoegen/wijzigen/verwijderen (A2b)
5. [klant klikt "Bevestig en start meting"]                                 status: meten
   ─────────────────────── PIPELINE HERVAT ───────────────────────
6. [cron: OpenAI + web_search]      → tracking_runs                   (A3, nulmeting + optioneel wekelijks)
7. [aggregatie, geen call]          → visibility_scores                     status: gereed
8. [OpenAI structured]              → rapport + Resend-mail           (B)
9. [klant klikt] → [queue: OpenAI]  → content_pieces                  (C)
10. UI: analyse staat in "Mijn analyses" met status "Gereed",
    Content Bibliotheek vult zich verder ✅
```

Stap 1–3 en 6–8 draaien zonder menselijke tussenkomst. Stap 4–5 (de verplichte review-gate, §3.6/A2c) en stap 9 wachten bewust op de klant. Meerdere analyses draaien volledig onafhankelijk van elkaar, parallel, elk met zijn eigen status.

---

## 10. Kosten & performance

**Geen gratis tier bij OpenAI** — elke call kost vanaf de eerste request geld (in tegenstelling tot Gemini's gratis quota). Dit is een bewuste, vastgelegde keuze; zie §2.

**Belangrijk bij meerdere analyses:** kosten worden nu geteld **per analyse**, niet per klant. Eén klant met 5 analyses (bv. MediaMarkt met "iPhone", "wasmachines", "laptops"...) betaalt 5× de onderstaande nulmeting-kosten, omdat elke analyse zijn eigen volledige Brand DNA + 30 prompts + meting heeft.

**Tarieven `gpt-4.1-nano`:** $0,10 / $0,40 per 1M tokens (in/uit). **`web_search`-tool:** $10 per 1.000 calls + een vaste blok van 8.000 "search content"-tokens per call (afgerekend tegen het input-tarief, ongeacht hoeveel er feitelijk gevonden wordt) + normale modeltokens.

> **Let op:** dit zijn indicatieve tarieven op basis van onderzoek dat tussen bronnen uiteenliep. **Controleer `platform.openai.com/pricing`** voor de exacte, actuele tarieven vóór een kostenbegroting op klantschaal. Onderstaande tokenaannames per halte zijn eveneens indicatief (afhankelijk van de uiteindelijke prompt-lengtes).

### Kostenoverzicht stap 1 t/m 5 (nulmeting per analyse — draait altijd automatisch)

| Halte | Calls | Web-search | Indicatieve in/uit-tokens | Kosten |
|-------|-------|------------|---------------------------|--------|
| 1 · Brand DNA | 1 | Ja | ~10.800 in (incl. 8k search) / ~500 uit | $0,0113 |
| 2 · Prompts | 1 | Nee | ~800 in / ~600 uit | $0,0003 |
| 3 · Nulmeting | 60 (30×2) | 30× | per prompt: 3a ~8.200 in/~400 uit + 3b ~650 in/~100 uit | $0,333 |
| 4 · Scores | 0 | — | puur rekenwerk | $0,00 |
| 5 · Rapport | 1 | Nee | ~2.300 in / ~1.000 uit | $0,0006 |
| **Totaal stap 1–5** | **63** | **31×** | | **≈ $0,35 per analyse** |

Halte 3 (de 30-prompt-meting) is verreweg de grootste kostenpost: ~96% van de nulmeting, doordat het 60 van de 63 calls omvat waarvan 30 met de dure `web_search`-tool.

*Noot: als de klant via A2b prompts toevoegt, stijgt het aantal calls in halte 3 evenredig (elke extra actieve prompt = +2 calls per meting).*

### Stap 6 — content, op aanvraag (buiten de nulmeting)
Alleen bij klant-klik, geen `web_search`: ~1.100 in / ~1.600 uit per pagina → **≈ $0,0008 per pagina**. Volledig vraaggestuurd, geen vaste kost.

### Wekelijkse lus — per analyse aan/uit-schakelbaar (buiten de nulmeting)
Zelfde opbouw als halte 3: **≈ $0,33/week/analyse**, alleen voor analyses met `tracking_enabled = true`. Over 10 weken continu aan: **≈ $3,33/analyse**. Zie §6 (A3) voor de aan/uit-schakelaar.

**Kostenknoppen (belangrijk bij opschalen):**
1. **`web_search` alleen in halte 1 en 3** — nooit aanzetten bij prompts, rapport of content-generatie.
2. **Wekelijkse lus staat standaard uit, per analyse** — gratis prospect-analyses blijven op de eenmalige nulmeting (~$0,35), pas bij betalende klanten (of specifieke analyses) zet je 'm aan.
3. **Cache** Brand DNA en hergebruik; content pas genereren op expliciete klik (al vastgelegd, spaart het meest).
4. **Batch + queue** voorkomt time-outs en maakt kosten per analyse voorspelbaar, ook bij veel analyses tegelijk.
5. **Rate limits bewaken:** instap-tiers bij OpenAI kennen lage RPM-limieten (soms slechts enkele requests/minuut) totdat je account-uitgaven/leeftijd een hogere tier ontgrendelen. Bouw de job-queue met marge, niet ervan uitgaand dat je vanaf dag 1 hoge doorvoer hebt — zeker relevant zodra een klant meerdere analyses tegelijk start.

---

## 11. Bouwvolgorde (sprints)

1. **Sprint 1 — Fundament:** Next.js op Vercel, Supabase-project, Auth, datamodel-migraties (incl. `analyses` met `topic`/`status`), officiële `openai` Node-SDK + Zod ingericht, één test-call werkend met `gpt-4.1-nano` (structured output + `web_search`-tool getest).
2. **Sprint 2 — "Mijn analyses" + A0/A1/A2:** lijst-scherm + "Nieuwe analyse starten"-formulier (URL + onderwerp) + **transparant voortgangsscherm** (§3.7 stap 4) → eigen crawler → Brand DNA (topic-aware, met `raw_json`) → 30 prompts (topic-aware, met `source_raw_json`).
3. **Sprint 3 — Instellingen-tab, A2b + A2c (review-gate):** concept-scherm met volledig Brand DNA + prompt-lijst, beide met volledige CRUD (`/api/analyses/[id]/brand-dna`, `/api/analyses/[id]/prompts`), plus de knop **"Bevestig en start meting"** (`/api/analyses/[id]/confirm`, status `concept_klaar → meten`). **Dit is de belangrijkste UX-sprint** — zonder deze gate mag A3 niet kunnen starten.
4. **Sprint 4 — Fase A3:** cron + job-queue + mention-detectie → nulmeting + optionele wekelijkse trend (schakelaar in Instellingen), met volledige opslag (`raw_response`, `mention_json`, prompt-snapshots, zie §5). UI: Overzicht met score + transparant "bezig met meten"-voortgang.
5. **Sprint 5 — Fase B:** rapportgeneratie (incl. `raw_json`) + Resend-e-mail. UI: tab Rapport.
6. **Sprint 6 — Fase C:** content-generatie via queue, getriggerd door klant-klik → `content_pieces` (incl. `raw_json`). UI: tab **Content Bibliotheek** (lijst + detail + kopiëren/download).
7. **Sprint 7 — Polish:** filters, mobiel, kostenlimieten/rate-limit-bewaking, gratis-scan-pagina voor acquisitie.

---

## 12. Vastgelegde keuzes

1. **Engine:** ✅ **Uitsluitend OpenAI**, model **`gpt-4.1-nano`** in de bouwfase. Geen Gemini, geen premium modellen. Andere engines komen later als expliciete, aparte uitbreiding.
2. **Eerste rapportervaring:** ✅ **Directe nulmeting (week 0)** meteen tonen, altijd automatisch (stap 1 t/m 5, ≈ $0,35/analyse).
3. **Content-generatie:** ✅ **Pas na klik/goedkeuring** door de klant — niet volautomatisch vooraf. Dit spaart kosten en geeft de klant controle.
4. **Wekelijkse lus (10 weken):** ✅ **Per analyse aan/uit-schakelbaar** (`tracking_enabled`), draait niet automatisch door na de nulmeting.
5. **Onderwerp/product-veld:** ✅ Optioneel naast de website-URL. Bepaalt de scope van zowel Brand DNA (A1) als de 30 prompts (A2). Zonder onderwerp: hele website. Met onderwerp: volledig gescoped op dat segment.
6. **Meerdere analyses per klant:** ✅ Onbeperkt, volledig zelfstandig van elkaar (eigen DNA/prompts/tracking/rapport/bibliotheek/schakelaar). Beheerd via het "Mijn analyses"-scherm.
7. **Prompt-beheer:** ✅ De volledige prompt-lijst is **te allen tijde** door de klant inzichtelijk en beheerbaar (toevoegen, wijzigen, verwijderen, aan/uit) via het tabblad Instellingen. Wijzigingen werken vooruitkijkend, historische metingen blijven ongewijzigd.
8. **Nieuwe analyse starten:** ✅ Kan altijd, op elk moment, onafhankelijk van bestaande analyses, via de knop op "Mijn analyses".
9. **Onderwerp is niet wijzigbaar na start:** ✅ Voor een andere scope start de klant een nieuwe analyse (voorkomt inconsistente Brand DNA/prompts).
10. **Alles opslaan, niets weggooien:** ✅ Elke AI-call slaat zijn volledige ruwe JSON-output op in Supabase (`raw_json`/`mention_json`/`source_raw_json` op de betreffende tabellen), náást de uitgesplitste kolommen. Volledige audit-trail, geen dataverlies bij toekomstige schema-wijzigingen. Zie §5.
11. **Verplichte transparantie- en goedkeuringsstap (review-gate):** ✅ Na A1+A2 (Brand DNA + prompts) stopt de pipeline bewust. De klant ziet en kan het volledige resultaat bewerken (zowel Brand DNA als prompts) en moet expliciet op **"Bevestig en start meting"** klikken vóórdat A3 (de betaalde meting) start. Zie §3.6/A2c.
12. **Brand DNA is bewerkbaar:** ✅ Niet alleen prompts, ook het Brand DNA zelf is door de klant aan te passen (tabblad Instellingen), zowel tijdens de review-gate als daarna doorlopend.
13. **De klantreis is een vaste, benoemde trechter van 8 stappen** (inloggen → Mijn analyses → nieuwe analyse → transparant voortgangsscherm → concept & goedkeuring → transparant meten → workspace → altijd terug/nieuw). Zie §3.7 — leidend voor de UI/UX-implementatie.

Nog te bepalen later: aantal analyses/pagina's per klant / eventuele limieten of pakketten.

---

## 13. Wat later komt (D/E/F)

Bewust buiten deze MVP, maar het datamodel is er al klaar voor: `content_pieces` heeft een `status`-veld dat straks naar `published` kan, en een `schemaJsonLd` klaar om te publiceren. Fase D voegt alleen CMS-connectors toe bovenop dezelfde bibliotheek, per analyse. Een tweede LLM-engine (Gemini/Perplexity/Claude) is eveneens een latere, aparte beslissing — niet iets waar deze bouwfase op wacht.
