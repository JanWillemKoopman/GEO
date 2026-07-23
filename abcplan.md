# Bouwplan MVP — Fase A + B + C (volautomatisch, met Gemini API)

> Gedetailleerd technisch plan voor de eerste tool: **A. Meten → B. Adviseren → C. Genereren**, volledig automatisch. Content wordt in de app afgeleverd onder het tabblad **"Content Bibliotheek"**. Publiceren naar een CMS (D), self-healing (E) en uitbreiding (F) komen later.

*Techstack: Node.js + Next.js op Vercel · Supabase (Auth/Postgres/cron) · **Gemini API** · Resend (e-mail). Opgesteld juli 2026.*

---

## 1. Scope & filosofie

**Wat de MVP doet, volautomatisch, zonder menselijke tussenkomst:**

- **A — Meten:** website-URL → Gemini analyseert de site (grounding) → 30 prompts in categorieën → 10 weken monitoren over AI-engines → zichtbaarheidsdata.
- **B — Adviseren:** Gemini analyseert de meetdata → rapport met zichtbaarheids-gaps en concrete content-aanbevelingen (welke pagina's ontbreken om geciteerd te worden).
- **C — Genereren:** Gemini schrijft de aanbevolen pagina's als kant-en-klare concepten → verschijnen in de **Content Bibliotheek** waar de klant ze leest, kopieert of downloadt.

**Bewust NIET in deze MVP:** publiceren naar CMS, self-healing, meertalige productie op schaal. De klant krijgt de content *aangeleverd in de app*; wat hij ermee doet is (voorlopig) aan hem.

**Waarom dit volautomatisch kán:** er is geen schrijf-toegang tot externe systemen nodig. Alles blijft binnen onze eigen app en database. Dat elimineert precies de risico's (CMS-auth, per-site-publicatie, rollback) die D/E/F complex maken.

**Ontwerpprincipe blijft:** "stupid simple, don't make me think." De klant vult één URL in en krijgt achtereenvolgens: een score, een rapport en een gevulde bibliotheek — zonder knoppen die hij niet snapt.

---

## 2. Waarom Gemini de juiste keuze is voor A/B/C

Drie Gemini-features maken deze hele flow mogelijk zonder losse tooling:

| Feature | Wat het doet | Waar we het gebruiken |
|---------|--------------|----------------------|
| **Grounding with Google Search** | Model haalt live web-info op en citeert bronnen | Stap A: site + branche begrijpen; meten of merk genoemd wordt |
| **URL context** | Model leest een specifieke URL als input | Stap A: de klant-website crawlen/analyseren |
| **Structured output (JSON Schema / Zod)** | Antwoord dwingt in een vast, type-safe JSON-formaat | Overal: prompts, rapport, content als voorspelbare objecten |

Grounding + URL-context + structured output zijn **combineerbaar** in één call — precies wat een agent-achtige flow nodig heeft. We gebruiken de officiële **`@google/genai`** SDK (Node.js) met **Zod**-schema's.

> **Kostennoot:** grounding-queries worden apart afgerekend (Gemini 3: ~$14/1.000 zoekopdrachten; 2.5: per prompt). Zie §9. We gebruiken grounding alleen waar nodig (analyse + meten), niet bij pure tekstgeneratie.

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
              │  Gemini API  │   │    Supabase      │
              │  • grounding │   │  Postgres + Auth │
              │  • URL ctx   │   │  + RLS + cron    │
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
brands                id, user_id, url, name, industry, created_at
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
**Gemini-call:** `generateContent` met **URL-context tool** (de klant-URL) + **grounding** + **structured output**.

Prompt (kern): *"Analyseer dit bedrijf op basis van de website en het web. Bepaal: branche, kernproducten/-diensten, tone-of-voice, doelgroep-persona's, waardeproposities en 3–5 belangrijkste concurrenten."*

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
**Gemini-call:** structured output (geen grounding nodig — input is de Brand DNA).
We laten Gemini **30 prompts in ~5 categorieën** genereren, elk gelabeld met de onderliggende *intent* (volgens InSpace's intent-methodiek):

| Categorie | Voorbeeld-prompt |
|-----------|------------------|
| Oriëntatie | "Wat is de beste [productcategorie] voor [persona]?" |
| Vergelijking | "[Merk] vs [concurrent]: wat is beter?" |
| Probleem→oplossing | "Hoe los ik [pijnpunt] op?" |
| Lokaal/branche | "Beste [dienst] in [regio]?" |
| Merkspecifiek | "Is [merk] betrouwbaar / wat kost [merk]?" |

→ Opslaan in `prompts` (30 rijen). Klant hoeft niets in te vullen; hij mag ze later evt. aan/uitzetten (simpel vinkje).

### A3. Monitoring — 10 weken
**Mechanisme:** een **cron** (`weekly-tracking-run`) draait wekelijks. Voor elke actieve prompt × engine:
- **Engine "Gemini":** directe `generateContent`-call **met grounding** (simuleert een AI-antwoord met live web).
- **Engine "ChatGPT" (optioneel):** OpenAI-call, óf in de MVP puur Gemini-grounding om kosten te sparen (zie §9 — start met Gemini-only).

Per antwoord laat een tweede, goedkope Gemini-call (structured output) bepalen:
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

**MVP-versnelling:** je kunt de "10 weken" comprimeren tot een **directe nulmeting (week 0)** zodat een prospect meteen een rapport ziet, en de trend daarna wekelijks aanvult. Zo werkt je acquisitieflow zonder 10 weken te wachten.

---

## 6. FASE B — Adviseren (volautomatisch)

**Trigger:** na de nulmeting (of na week 10), of on-demand knop "Genereer rapport".
**Gemini-call:** structured output. Input = `visibility_scores` + `tracking_runs` + `brand_dna`.

Gemini produceert:
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
→ Opslaan in `reports`. Toon in tab **Rapport**: één headline-score, korte samenvatting, top-gaps, en een lijst aanbevelingen met **"Genereer deze pagina"**-knop (of volautomatisch, zie C).
→ Mail het rapport via **Resend** (jouw acquisitie-stap 5). Eindig altijd met **1–3 priority actions**.

---

## 7. FASE C — Genereren (volautomatisch) → Content Bibliotheek

**Trigger:** volautomatisch direct na het rapport (voor elke aanbeveling met priority ≤ 2), óf per stuk op klant-verzoek.
**Mechanisme:** elke aanbeveling wordt een **job** die één `content_piece` genereert. De cron/queue werkt ze af.

**Gemini-call per pagina:** structured output, input = de aanbeveling + Brand DNA (voor on-brand tone) + de bewijs-prompts. LLM-geoptimaliseerd volgens InSpace's regels: *begin met het directe antwoord, heldere koppen, concrete datapunten, FAQ, schema-markup.*

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

Zo levert de tool **volautomatisch een gevulde bibliotheek** op: de klant hoeft alleen te lezen en te gebruiken. Dat is ~80% van Nova's waarde, zonder het CMS-risico.

---

## 8. Volautomatische end-to-end flow (samengevat)

```
1. URL ingevuld
2. [Gemini+grounding+URL] → Brand DNA            (A1)
3. [Gemini structured]    → 30 prompts           (A2)
4. [cron: Gemini+grounding]→ tracking_runs        (A3, nulmeting + wekelijks)
5. [aggregatie]           → visibility_scores
6. [Gemini structured]    → rapport + Resend-mail (B)
7. [queue: Gemini]        → content_pieces        (C)
8. UI: Content Bibliotheek gevuld ✅
```

Stap 2–8 draaien zonder menselijke tussenkomst. De enige "input" is de URL.

---

## 9. Kosten & performance

**Variabele kostendrijvers:** (1) grounding-zoekopdrachten, (2) tokens voor generatie.

- **Grounding** alleen in A1 (1×) en A3 (30 prompts × weken). 30 × 10 weken = 300 grounded calls/merk → bij Gemini 3 ~$14/1.000 = **~$4,20 grounding/merk over 10 weken** (+ tokenkosten). Nulmeting alleen = 30 calls ≈ $0,42.
- **Generatie (B+C):** rapport + ~5–20 pagina's tekst = tokenkosten, geen grounding. Relatief laag met een efficiënt Gemini-model.

**Kostenknoppen (belangrijk voor cold-outreach op schaal):**
1. **Start Gemini-only** (geen aparte OpenAI-calls) — halveert direct de meetkosten.
2. **Gratis prospects = alleen nulmeting** (30 calls), volle 10-weken-tracking pas voor betalende klanten.
3. **Cache** Brand DNA en herbruik; genereer content pas na expliciete trigger als je wil besparen.
4. **Batch + queue** voorkomt time-outs en maakt kosten per merk voorspelbaar.
5. Kies per stap het **goedkoopste passende Gemini-model** (analyse/mention-detectie mag een lichter model zijn dan content-generatie).

---

## 10. Bouwvolgorde (sprints)

1. **Sprint 1 — Fundament:** Next.js op Vercel, Supabase-project, Auth, datamodel-migraties, `@google/genai` + Zod ingericht, één test-call werkend.
2. **Sprint 2 — Fase A1+A2:** URL-input → Brand DNA → 30 prompts. UI: onboarding + prompt-lijst.
3. **Sprint 3 — Fase A3:** cron + job-queue + mention-detectie → nulmeting + wekelijkse trend. UI: Overzicht met score.
4. **Sprint 4 — Fase B:** rapportgeneratie + Resend-e-mail. UI: tab Rapport.
5. **Sprint 5 — Fase C:** content-generatie via queue → `content_pieces`. UI: tab **Content Bibliotheek** (lijst + detail + kopiëren/download).
6. **Sprint 6 — Polish:** filters, mobiel, kostenlimieten, gratis-scan-pagina voor acquisitie.

---

## 11. Openstaande keuzes (voor jou)

1. **Engines in de MVP:** alleen Gemini (goedkoop, snel) of ook echte ChatGPT-calls? *Advies: start Gemini-only, ChatGPT later als betaalde upgrade.*
2. **10 weken vs. directe nulmeting** als default voor de eerste rapportervaring. *Advies: nulmeting nu tonen, trend wekelijks aanvullen.*
3. **Content volautomatisch genereren** (alle priority ≤2) of pas na klik? *Advies: volautomatisch voor de "wow", met een limiet per merk voor de kosten.*
4. **Aantal pagina's per merk** in de bibliotheek (kost-versus-waarde).

---

## 12. Wat later komt (D/E/F)

Bewust buiten deze MVP, maar het datamodel is er al klaar voor: `content_pieces` heeft een `status`-veld dat straks naar `published` kan, en een `schemaJsonLd` klaar om te publiceren. Fase D voegt alleen CMS-connectors toe bovenop dezelfde bibliotheek.
