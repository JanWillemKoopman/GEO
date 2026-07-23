# Bouwplan MVP — Fase A + B + C (volautomatisch, met OpenAI)

> Gedetailleerd technisch plan voor de eerste tool: **A. Meten → B. Adviseren → C. Genereren**, volledig automatisch. Content wordt in de app afgeleverd onder het tabblad **"Content Bibliotheek"**. Publiceren naar een CMS (D), self-healing (E) en uitbreiding (F) komen later.

> ## 🔒 Vastgelegde technische keuze — niet ter discussie in deze bouwfase
> **We bouwen uitsluitend met de OpenAI API.** Bouwmodel: **`gpt-4.1-nano`** (instapmodel). Geen Gemini, geen tweede engine, geen premium modellen tijdens het bouwen. Doel van deze fase: **technisch werkend krijgen**, niet uitrollen. Zie §2 voor de onderbouwing.

*Techstack: Node.js + Next.js op Vercel · Supabase (Auth/Postgres/cron) · **OpenAI API (`gpt-4.1-nano`)** · Resend (e-mail). Opgesteld juli 2026.*

---

## 1. Scope & filosofie

**Wat de MVP doet, volautomatisch, zonder menselijke tussenkomst (behalve C, zie hieronder):**

- **A — Meten:** website-URL → OpenAI analyseert de site (eigen crawl + web-search-tool) → 30 prompts in categorieën → 10 weken monitoren → zichtbaarheidsdata.
- **B — Adviseren:** OpenAI analyseert de meetdata → rapport met zichtbaarheids-gaps en concrete content-aanbevelingen (welke pagina's ontbreken om geciteerd te worden).
- **C — Genereren:** OpenAI schrijft de aanbevolen pagina's als kant-en-klare concepten, **op klant-verzoek** → verschijnen in de **Content Bibliotheek** waar de klant ze leest, kopieert of downloadt.

**Bewust NIET in deze MVP:** publiceren naar CMS, self-healing, meertalige productie op schaal. De klant krijgt de content *aangeleverd in de app*; wat hij ermee doet is (voorlopig) aan hem.

**Waarom dit volautomatisch kán:** er is geen schrijf-toegang tot externe systemen nodig. Alles blijft binnen onze eigen app en database. Dat elimineert precies de risico's (CMS-auth, per-site-publicatie, rollback) die D/E/F complex maken.

**Ontwerpprincipe blijft:** "stupid simple, don't make me think." De klant vult één URL in en krijgt achtereenvolgens: een score, een rapport en een gevulde bibliotheek — zonder knoppen die hij niet snapt.

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

> **Prijsvoorbehoud:** online prijsopgaven voor actuele modellen lopen tussen bronnen uiteen (snel-verouderende prijspagina's). Controleer `platform.openai.com/pricing` voor de exacte, actuele tarieven vóór je een kostenbegroting op schaal maakt. De **modelkeuze zelf staat vast** — alleen de prijscijfers in §9 zijn indicatief.

### Welke OpenAI-features de flow mogelijk maken

| Feature | Wat het doet | Waar we het gebruiken |
|---------|--------------|----------------------|
| **`web_search`-tool (Responses API)** | Model mag live het web doorzoeken en citeert bronnen | Stap A: branche/concurrenten begrijpen; meten of merk genoemd wordt |
| **Eigen crawler (géén API-tool)** | Node.js haalt zelf de klant-website op en zet 'm om naar platte tekst | Stap A: de specifieke klant-URL inhoudelijk lezen |
| **Structured output (JSON Schema via Zod-helper)** | Antwoord dwingt in een vast, type-safe JSON-formaat | Overal: prompts, rapport, content als voorspelbare objecten |

**Belangrijk verschil met een Gemini-aanpak:** OpenAI heeft geen ingebouwde "lees deze ene URL"-tool zoals Gemini's URL-context. Daarom lezen we de klant-website **zelf** (een simpele `fetch` + tekst-extractie in Node.js, geen API-kosten) en géven we die tekst als context mee aan de OpenAI-call. De `web_search`-tool gebruiken we daarnaast voor de bredere marktcontext (concurrenten, hoe het merk online voorkomt).

We gebruiken de officiële **`openai`** Node-SDK, met **Zod**-schema's voor structured output.

> **Kostennoot:** de `web_search`-tool wordt apart afgerekend (vast tarief per call + een vaste hoeveelheid "search content"-tokens per call, zie §9). We zetten hem alleen aan waar echt nodig (branche-analyse + meting), niet bij pure tekstgeneratie.

---

## 3. Architectuur op hoofdlijnen

```
                    KLANT (browser / mobiel)
                            │
                            ▼
        ┌───────────────────────────────────────────┐
        │        Vercel — Next.js / Node.js          │
        │                                            │
        │  UI-tabs:  [ Overzicht ] [ Rapport ]       │
        │            [ Content Bibliotheek ]         │
        │                                            │
        │  Eigen crawler: fetch + tekst-extractie    │
        │  (geen API-kosten, alleen de klant-URL)    │
        │                                            │
        │  API-routes (server):                      │
        │   • /api/onboard   (A: analyse + prompts)  │
        │   • /api/report    (B: rapport genereren)  │
        │   • /api/generate  (C: content genereren)  │
        │                                            │
        │  Cron (Vercel Cron / Supabase pg_cron):    │
        │   • weekly-tracking-run (A: 10 weken)      │
        └───────────────┬────────────────┬───────────┘
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
- **Korte taken** (analyse, één rapport, één pagina) → Next.js API-route / serverless function op Vercel.
- **Lange/herhalende taken** (10-weken-monitoring, batch-generatie van 5–20 pagina's) → **job-queue in Supabase** die door een **cron** afgewerkt wordt in kleine batches. Zo blijven we binnen serverless time-limits en houden we de kosten controleerbaar.

---

## 4. Datamodel (Supabase / Postgres)

```
users                 (Supabase Auth)
brands                id, user_id, url, name, industry, created_at,
                      tracking_enabled(bool, default false)
brand_dna             brand_id, tone_of_voice, products[], personas[],
                      value_props[], competitors[], summary, raw_json
prompts               id, brand_id, text, category, intent, active
tracking_runs         id, prompt_id, engine, week_no, ran_at,
                      raw_response, brand_mentioned(bool),
                      position, sentiment, cited_sources[]
visibility_scores     brand_id, week_no, score, share_of_voice, per_engine_json
reports               id, brand_id, period, summary, gaps_json,
                      recommendations_json, generated_at
content_pieces        id, brand_id, report_id, type, title, target_intent,
                      cluster, body_markdown, meta_title, meta_description,
                      schema_jsonld, faq_json, status, word_count, created_at
jobs                  id, brand_id, type, payload_json, status,
                      attempts, scheduled_for, last_error
```

**Kernrelaties:** een `brand` heeft veel `prompts`; elke prompt genereert wekelijks `tracking_runs`; die rollen op naar `visibility_scores`; daaruit komt een `report` met `recommendations`; elke aanbeveling wordt een `content_piece` in de bibliotheek. `jobs` is de motor voor async werk.

**RLS:** elke tabel filtert op `user_id`/`brand_id` zodat klanten alleen hun eigen data zien.

---

## 5. FASE A — Meten (volautomatisch)

### A1. Onboarding: URL → Brand DNA
**Trigger:** klant vult URL in (of jij bij cold-outreach).
**Stap 1 (geen API-call):** eigen Node.js-crawler haalt de homepage (+ evt. 2-3 kernpagina's) op met `fetch` en zet de HTML om naar schone platte tekst.
**Stap 2 (OpenAI-call):** Responses API-call met de geëxtraheerde tekst als context, **`web_search`-tool aan** (voor bredere marktcontext) en **structured output**.

Prompt (kern): *"Analyseer dit bedrijf op basis van deze website-tekst en het web. Bepaal: branche, kernproducten/-diensten, tone-of-voice, doelgroep-persona's, waardeproposities en 3–5 belangrijkste concurrenten."*

Zod-schema (vereenvoudigd):
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
→ Opslaan in `brand_dna`.

### A2. Prompt-generatie (30 stuks in categorieën)
**OpenAI-call:** structured output, **zonder** `web_search` (input is de Brand DNA, geen live web nodig).
We laten het model **30 prompts in ~5 categorieën** genereren, elk gelabeld met de onderliggende *intent*:

| Categorie | Voorbeeld-prompt |
|-----------|------------------|
| Oriëntatie | "Wat is de beste [productcategorie] voor [persona]?" |
| Vergelijking | "[Merk] vs [concurrent]: wat is beter?" |
| Probleem→oplossing | "Hoe los ik [pijnpunt] op?" |
| Lokaal/branche | "Beste [dienst] in [regio]?" |
| Merkspecifiek | "Is [merk] betrouwbaar / wat kost [merk]?" |

→ Opslaan in `prompts` (30 rijen). Klant hoeft niets in te vullen; hij mag ze later evt. aan/uitzetten (simpel vinkje).

### A3. Monitoring — 10 weken
**Mechanisme:** een **cron** (`weekly-tracking-run`) draait wekelijks. Voor elke actieve prompt:

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
→ Opslaan in `tracking_runs`; wekelijks aggregeren naar `visibility_scores` (score 0–100 + share-of-voice).

**Batching:** 30 prompts wordt in kleine job-batches verwerkt zodat één run niet timeout't en kosten voorspelbaar blijven.

**MVP-versnelling — ✅ vastgelegd:** we tonen de klant meteen een **directe nulmeting (week 0)** zodra de 30 prompts één keer zijn doorlopen, in plaats van 10 weken te wachten. Dit gebeurt altijd, automatisch, voor elk merk.

**Wekelijkse lus — ✅ vastgelegd: per klant aan/uit-schakelbaar.** De 10-weken-trend draait **niet** automatisch door na de nulmeting. Elk merk heeft een veld `tracking_enabled` (standaard uit). De cron verwerkt bij elke wekelijkse run **alleen merken waar dit aanstaat**. In de UI (tab Overzicht) staat een simpele schakelaar "Wekelijkse tracking: aan/uit". Zo kun je gratis prospects op de eenmalige nulmeting houden en pas voor betalende klanten de wekelijkse kosten laten lopen.

---

## 6. FASE B — Adviseren (volautomatisch)

**Trigger:** na de nulmeting (of na een latere week), of on-demand knop "Genereer rapport".
**OpenAI-call:** structured output, **geen** `web_search` nodig. Input = `visibility_scores` + `tracking_runs` + `brand_dna`.

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

## 7. FASE C — Genereren → Content Bibliotheek

**Trigger — ✅ vastgelegd: pas na klik/goedkeuring door de klant.** De klant klikt bij een aanbeveling op "Genereer deze pagina" (of keurt een batch goed). **Niet** volautomatisch vooraf — dit spaart kosten en geeft de klant controle: er staan alleen aanbevelingen klaar totdat de klant er zelf voor kiest.

**Mechanisme:** elke klik wordt een **job** die één `content_piece` genereert. De cron/queue werkt ze af.

**OpenAI-call per pagina:** structured output, **geen** `web_search`. Input = de aanbeveling + Brand DNA (voor on-brand tone) + de bewijs-prompts. LLM-geoptimaliseerd: *begin met het directe antwoord, heldere koppen, concrete datapunten, FAQ, schema-markup.*

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
De centrale opleverplek. Per merk een lijst kaarten:
- **Kaart** = titel, type-badge (artikel/FAQ/landing/vergelijking), cluster, status, woordaantal.
- **Detail** = leesbare weergave (Markdown → HTML) met knoppen: **Kopiëren**, **Download (.md / .html)**, **Kopieer schema-markup**, en later (Fase D) **Publiceer naar CMS**.
- **Filters** = op cluster / type / status. Simpel, rustig, veel witruimte.
- **Lege staat** (nog niets gegenereerd): duidelijke uitleg *"Ga naar het Rapport en kies welke pagina's je wilt laten schrijven."*

Zo levert de tool op klant-verzoek een **steeds verder gevulde bibliotheek** op. Dat is ~80% van Nova's waarde, zonder het CMS-risico en zonder onnodige kosten voor content die niemand vroeg.

---

## 8. End-to-end flow (samengevat)

```
1. URL ingevuld
2. [eigen crawl, geen call]        → website-tekst
3. [OpenAI + web_search]           → Brand DNA               (A1)
4. [OpenAI structured, geen search]→ 30 prompts               (A2)
5. [cron: OpenAI + web_search]     → tracking_runs            (A3, nulmeting + wekelijks)
6. [aggregatie, geen call]         → visibility_scores
7. [OpenAI structured]             → rapport + Resend-mail    (B)
8. [klant klikt] → [queue: OpenAI] → content_pieces           (C)
9. UI: Content Bibliotheek gevuld ✅
```

Stap 2 t/m 7 draaien zonder menselijke tussenkomst. Stap 8 wacht bewust op de klant.

---

## 9. Kosten & performance

**Geen gratis tier bij OpenAI** — elke call kost vanaf de eerste request geld (in tegenstelling tot Gemini's gratis quota). Dit is een bewuste, vastgelegde keuze; zie §2.

**Tarieven `gpt-4.1-nano`:** $0,10 / $0,40 per 1M tokens (in/uit). **`web_search`-tool:** $10 per 1.000 calls + een vaste blok van 8.000 "search content"-tokens per call (afgerekend tegen het input-tarief, ongeacht hoeveel er feitelijk gevonden wordt) + normale modeltokens.

> **Let op:** dit zijn indicatieve tarieven op basis van onderzoek dat tussen bronnen uiteenliep. **Controleer `platform.openai.com/pricing`** voor de exacte, actuele tarieven vóór een kostenbegroting op klantschaal. Onderstaande tokenaannames per halte zijn eveneens indicatief (afhankelijk van de uiteindelijke prompt-lengtes).

### Kostenoverzicht stap 1 t/m 5 (nulmeting — draait altijd automatisch)

| Halte | Calls | Web-search | Indicatieve in/uit-tokens | Kosten |
|-------|-------|------------|---------------------------|--------|
| 1 · Brand DNA | 1 | Ja | ~10.800 in (incl. 8k search) / ~500 uit | $0,0113 |
| 2 · Prompts | 1 | Nee | ~800 in / ~600 uit | $0,0003 |
| 3 · Nulmeting | 60 (30×2) | 30× | per prompt: 3a ~8.200 in/~400 uit + 3b ~650 in/~100 uit | $0,333 |
| 4 · Scores | 0 | — | puur rekenwerk | $0,00 |
| 5 · Rapport | 1 | Nee | ~2.300 in / ~1.000 uit | $0,0006 |
| **Totaal stap 1–5** | **63** | **31×** | | **≈ $0,35 per merk** |

Halte 3 (de 30-prompt-meting) is verreweg de grootste kostenpost: ~96% van de nulmeting, doordat het 60 van de 63 calls omvat waarvan 30 met de dure `web_search`-tool.

### Stap 6 — content, op aanvraag (buiten de nulmeting)
Alleen bij klant-klik, geen `web_search`: ~1.100 in / ~1.600 uit per pagina → **≈ $0,0008 per pagina**. Volledig vraaggestuurd, geen vaste kost.

### Wekelijkse lus — per klant aan/uit-schakelbaar (buiten de nulmeting)
Zelfde opbouw als halte 3: **≈ $0,33/week/merk**, alleen voor merken met `tracking_enabled = true`. Over 10 weken continu aan: **≈ $3,33/merk**. Zie §5 (A3) voor de aan/uit-schakelaar.

**Kostenknoppen (belangrijk bij opschalen):**
1. **`web_search` alleen in halte 1 en 3** — nooit aanzetten bij prompts, rapport of content-generatie.
2. **Wekelijkse lus staat standaard uit** — gratis prospects blijven op de eenmalige nulmeting (~$0,35), pas bij betalende klanten zet je 'm aan.
3. **Cache** Brand DNA en hergebruik; content pas genereren op expliciete klik (al vastgelegd, spaart het meest).
4. **Batch + queue** voorkomt time-outs en maakt kosten per merk voorspelbaar.
5. **Rate limits bewaken:** instap-tiers bij OpenAI kennen lage RPM-limieten (soms slechts enkele requests/minuut) totdat je account-uitgaven/leeftijd een hogere tier ontgrendelen. Bouw de job-queue met marge, niet ervan uitgaand dat je vanaf dag 1 hoge doorvoer hebt.

---

## 10. Bouwvolgorde (sprints)

1. **Sprint 1 — Fundament:** Next.js op Vercel, Supabase-project, Auth, datamodel-migraties, officiële `openai` Node-SDK + Zod ingericht, één test-call werkend met `gpt-4.1-nano` (structured output + `web_search`-tool getest).
2. **Sprint 2 — Fase A1+A2:** eigen crawler + URL-input → Brand DNA → 30 prompts. UI: onboarding + prompt-lijst.
3. **Sprint 3 — Fase A3:** cron + job-queue + mention-detectie → nulmeting + wekelijkse trend. UI: Overzicht met score.
4. **Sprint 4 — Fase B:** rapportgeneratie + Resend-e-mail. UI: tab Rapport.
5. **Sprint 5 — Fase C:** content-generatie via queue, getriggerd door klant-klik → `content_pieces`. UI: tab **Content Bibliotheek** (lijst + detail + kopiëren/download).
6. **Sprint 6 — Polish:** filters, mobiel, kostenlimieten/rate-limit-bewaking, gratis-scan-pagina voor acquisitie.

---

## 11. Vastgelegde keuzes

1. **Engine:** ✅ **Uitsluitend OpenAI**, model **`gpt-4.1-nano`** in de bouwfase. Geen Gemini, geen premium modellen. Andere engines komen later als expliciete, aparte uitbreiding.
2. **Eerste rapportervaring:** ✅ **Directe nulmeting (week 0)** meteen tonen, altijd automatisch (stap 1 t/m 5, ≈ $0,35/merk).
3. **Content-generatie:** ✅ **Pas na klik/goedkeuring** door de klant — niet volautomatisch vooraf. Dit spaart kosten en geeft de klant controle.
4. **Wekelijkse lus (10 weken):** ✅ **Per klant aan/uit-schakelbaar** (`tracking_enabled`), draait niet automatisch door na de nulmeting. Zo blijven gratis prospects op de eenmalige, goedkope nulmeting en zet je de doorlopende kosten pas aan voor betalende klanten.

Nog te bepalen later: aantal pagina's per merk / eventuele limieten.

---

## 12. Wat later komt (D/E/F)

Bewust buiten deze MVP, maar het datamodel is er al klaar voor: `content_pieces` heeft een `status`-veld dat straks naar `published` kan, en een `schemaJsonLd` klaar om te publiceren. Fase D voegt alleen CMS-connectors toe bovenop dezelfde bibliotheek. Een tweede LLM-engine (Gemini/Perplexity/Claude) is eveneens een latere, aparte beslissing — niet iets waar deze bouwfase op wacht.
