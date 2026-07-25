# Verbeterplan Fase B — van "correcte" naar écht scherpe aanbevelingen

> Dit document bouwt voort op **[abcplan.md](./abcplan.md) §7 (Fase B — Adviseren)** en beschrijft vijf concrete verbeteringen aan de B1/B2-pipeline, met als doel: aanbevelingen die niet alleen zeggen *dát* een concurrent wint, maar ook *waarom* — zodat de content die Fase C daarvan maakt daadwerkelijk beter presteert in AI-antwoorden. Budget is hier bewust geen hard afkappunt: elke verbetering is voorzien van een eerlijke kostenschatting, maar de keuze is steeds gemaakt op kwaliteit, niet op de goedkoopste optie.
>
> **Uitgangspunt:** de bestaande architectuur (gescheiden B1/B2-calls, per-entiteit mention-schema, verplichte transparantie-stap) is degelijk en blijft ongewijzigd. Dit plan voegt stappen tóe en verrijkt de input van B1/B2 — het vervangt niets fundamenteels.

---

## Overzicht van de vijf verbeteringen

| # | Probleem nu | Verbetering | Nieuwe kosten/analyse |
|---|-------------|-------------|------------------------|
| 1 | Je weet dát een concurrent wint, niet waaróm diens content werkt | Nieuwe halte 3d: concurrent-content-analyse | ≈ $0,006 |
| 2 | Prioriteit is een subjectief LLM-getal | Server-side priority-score als harde input voor B2 | $0,00 (rekenwerk) |
| 3 | Geen feedback of gepubliceerde content het gat echt dichtte | Effect-feedbackloop tussen content_pieces en volgende meting | ≈ $0,001/week |
| 4 | Gap-analyse ziet maar 1 meetmoment, geen momentum | Trend-gewogen input (laatste 4 weken) in B1 | $0,00 (extra tokens, geen extra calls) |
| 5 | Elke aanbeveling = nieuwe pagina, ook als "aanvullen" beter is | Dedup-check + `update_existing` als recommendation-type | ≈ $0,00002/pagina (embeddings) |

**Totale meerkosten:** ≈ **$0,007 extra per nulmeting** (t.o.v. de huidige $0,356, zie abcplan.md §10) — een meerprijs van ~2%, voor een structureel rijkere en beter onderbouwde output.

---

## 1. Nieuwe halte 3d — Concurrent-content-analyse (tussen 3c en B1)

**Het kernprobleem:** B1 krijgt nu alleen `competitor_breakdown` (feiten: wie wordt genoemd, hoe vaak, welke bron) maar nooit de *daadwerkelijke inhoud* van de bronnen die AI-modellen citeren. Fase C schrijft dus content op basis van "dit onderwerp mist", niet op basis van "zo ziet content eruit die AI-modellen wél citeren". Dat is het verschil tussen een gok en een onderbouwd sjabloon.

**Trigger:** automatisch na 3c, vóór B1. Draait alleen als er daadwerkelijk gaps zijn gevonden (geen concurrent-content-analyse nodig als je overal al wint).

**Stap 1 — Bronnen verzamelen (geen call):** dedupliceer alle `citedSourcesForCompetitor`-URL's uit `competitor_breakdown`, gesorteerd op hoe vaak ze voorkomen. Pak de **top 5-8 unieke URL's** — dit voorkomt dat je 30 keer dezelfde homepage ophaalt.

**Stap 2 — Crawlen (geen call):** dezelfde lichte Node.js-crawler als halte A1 (fetch + HTML-naar-platte-tekst) haalt deze URL's op. Geen `web_search`-tool nodig, we hebben de URL al.

**Stap 3 — Patroonanalyse (1 OpenAI-call, gebundeld):** alle opgehaalde pagina's in één structured-output-call (model `gpt-4.1-mini`, geen `web_search` — de tekst is al meegegeven), die per pagina extraheert *wat het effectief maakt*:

```ts
const CompetitorContentPatterns = z.object({
  pages: z.array(z.object({
    url: z.string(),
    competitor: z.string(),
    cluster: z.string(),
    headingStructure: z.array(z.string()),      // H1/H2's, laat de opbouw zien
    hasFaqSection: z.boolean(),
    hasComparisonTable: z.boolean(),
    hasSchemaMarkup: z.boolean(),
    keyDataPoints: z.array(z.string()),          // concrete cijfers/claims die het citeerbaar maken
    openingPattern: z.string(),                  // hoe de pagina opent (direct antwoord? definitie?)
    estimatedWordCount: z.number(),
  })),
  crossPageInsights: z.string(),                 // wat hebben de winnende pagina's gemeen, over alle competitors heen
});
```

**Opslag:** nieuwe tabel `competitor_content_samples` (id, analysis_id, competitor, url, raw_text, raw_json, extracted_patterns_json, fetched_at). Zelfde "bewaar alles"-principe als de rest van het datamodel (zie abcplan.md §5).

**Doorstroom naar B1:** `crossPageInsights` + per-cluster patronen worden als extra input aan B1 meegegeven, zodat `evidence` in de `GapAnalysis`-output niet alleen zegt *dat* een concurrent wint, maar ook *hoe* diens winnende pagina is opgebouwd — direct bruikbaar voor Fase C.

**Kosten:** 1 gebundelde call, ~6.000 in (8 pagina's platte tekst) / ~1.200 uit ≈ **$0,004**, plus de crawl zelf (geen API-kosten, wel wat extra requesttijd). Draait alleen bij daadwerkelijke gaps, dus niet bij elke analyse in volle omvang.

---

## 2. Server-side priority-score (vóór B2)

**Het probleem:** `priority: 1-3` in de huidige `Report`-schema komt puur uit het "aanvoelen" van het model tijdens de B2-call — niet reproduceerbaar, niet uit te leggen aan een klant die vraagt "waarom is dít prioriteit 1?".

**Oplossing:** bereken een objectieve score **vóór** de B2-call (puur rekenwerk, geen AI, dus gratis), en geef die als harde input mee zodat het model prioriteert op basis van feiten, niet gevoel:

```ts
// Server-side, tussen B1 en B2 — geen AI-call
priorityScore =
    (promptsAffected / totalActivePrompts) * 0.4      // hoe breed is dit gat
  + (competitorShareOfVoice - ownShareOfVoice) * 0.4  // hoe groot is de achterstand
  + (trendWeight) * 0.2                                // zie verbetering #4 — groeit het gat?
```

**Schema-wijziging in `Report`:**

```ts
recommendations: z.array(z.object({
  title: z.string(),
  type: z.enum(["article","faq","landing","comparison","update_existing"]), // zie #5
  targetIntent: z.string(),
  why: z.string(),
  priority: z.number(),          // 1-3, bucket afgeleid van priorityScore-drempels
  priorityScore: z.number(),     // ← nieuw: het onderliggende cijfer, transparant tonen in UI
})),
```

Het model krijgt de score als **vaste input** ("dit gat heeft priorityScore 0.82, dit heeft 0.31") en wordt geïnstrueerd de 1-3-bucketing daarop te baseren, niet er zelf een te verzinnen. De UI kan de score tonen als tooltip ("waarom prioriteit 1?") — dat maakt het rapport aantoonbaar onderbouwd.

**Kosten:** $0,00 — puur server-side rekenwerk, geen extra call.

---

## 3. Effect-feedbackloop — leert het systeem van eerdere content?

**Het probleem:** zodra een `content_piece` gepubliceerd is, stopt de keten. Bij de eerstvolgende wekelijkse meting weet B1 niet dat er al iets aan dit gat gedaan is — het rapport kan dus een gat blijven aanbevelen dat de klant al heeft opgelost, of erger: niet kunnen zien of de aanpak werkte.

**Datamodel-wijziging:**
```
content_pieces  + source_report_id (fk reports.id), source_cluster (text)
                -- koppelt elke gegenereerde pagina terug aan het gat waaruit hij ontstond

gap_outcomes    id, analysis_id, cluster, competitor, content_piece_id,
                visibility_before, visibility_after, measured_at
                -- nieuw, gevuld door een lichte server-side berekening bij elke
                -- volgende wekelijkse meting (geen AI-call): vergelijkt
                -- visibility_scores/competitor_breakdown vóór en ná publicatiedatum
```

**Doorstroom naar B1 (bij wekelijkse herhaling):** B1 krijgt een extra inputblok `previousActions`:
```ts
previousActions: z.array(z.object({
  cluster: z.string(),
  contentTitle: z.string(),
  publishedWeeksAgo: z.number(),
  visibilityDelta: z.number(),   // + of - t.o.v. vóór publicatie
}))
```
Zo kan de `GapAnalysis`-output expliciet onderscheid maken tussen **nieuwe gaps**, **hardnekkige gaps** (actie ondernomen, geen effect — misschien is de content niet goed genoeg, of het probleem zit dieper) en **opgeloste gaps** (niet meer aanbevelen, wél tonen als succesverhaal in het rapport — sterk voor klantretentie: "je vorige content werkt").

**Kosten:** $0,00 aan extra calls — de vergelijking is rekenwerk. Wel iets meer inputtokens in de wekelijkse B1-call (~150 tokens per previousAction), verwaarloosbaar (<$0,001/week).

---

## 4. Trend-gewogen gap-analyse (momentum over meerdere weken)

**Het probleem:** B1 ziet nu alleen de laatste meting. Een gat dat al drie weken krimpt heeft een andere urgentie dan een gat dat plotseling deze week ontstond — maar dat onderscheid gaat nu verloren.

**Oplossing:** bij elke B1-run (zodra er ≥2 metingen zijn) berekent de server (geen AI-call) per cluster/competitor de trend over de laatste tot 4 metingen, en geeft dat mee als expliciet veld:

```ts
// extra server-berekend inputveld voor B1, niet AI-gegenereerd
trendInput: z.array(z.object({
  cluster: z.string(),
  competitor: z.string(),
  weeklyShareOfVoice: z.array(z.number()),  // laatste tot 4 metingen
  momentum: z.enum(["growing","shrinking","stable","new"]),
}))
```

**Schema-wijziging in `GapAnalysis`:** elk gap-object krijgt een `trend: z.enum(["growing","shrinking","stable","new"])`-veld, direct overgenomen uit het server-berekende `momentum`. Dit voedt op zijn beurt de priority-score uit verbetering #2 (`trendWeight`).

**Kosten:** $0,00 — geen extra calls, alleen wat meer inputtokens bij analyses met wekelijkse tracking aan (die betalen toch al voor de wekelijkse lus, zie abcplan.md §10).

---

## 5. "Bestaande pagina bijwerken" i.p.v. altijd nieuw schrijven

**Het probleem:** de huidige enum (`article/faq/landing/comparison`) impliceert altijd een nieuwe pagina. In de praktijk kan het voor SEO/GEO juist beter zijn om een al goed presterende pagina aan te vullen (voorkomt keyword-kannibalisatie, en een bestaande, geïndexeerde pagina met autoriteit uitbreiden werkt vaak sneller dan iets nieuws laten opbouwen).

**Oplossing — dedup-check met embeddings (bewust niet simpele keyword-match, want dat mist semantisch vergelijkbare content):**

1. Bij elke `content_piece`-generatie (Fase C) wordt naast de bestaande velden ook een embedding opgeslagen: `text-embedding-3-small` over `title + targetIntent + cluster` (zeer goedkoop: ~$0,00002 per pagina).
2. Nieuwe kolom: `content_pieces.embedding vector(1536)` (pgvector-extensie, al standaard beschikbaar in Supabase).
3. **Vóór de B2-call:** server doet een cosine-similarity-query tussen elk gap-cluster en bestaande `content_pieces` van diezelfde analyse. Bij een hoge match (bv. > 0.85) wordt die bestaande pagina als kandidaat meegegeven aan B2.

**Schema-wijziging in `Report`:**
```ts
recommendations: z.array(z.object({
  title: z.string(),
  type: z.enum(["article","faq","landing","comparison","update_existing"]),
  existingContentPieceId: z.string().nullable(), // gezet zodra type = 'update_existing'
  targetIntent: z.string(),
  why: z.string(),
  priority: z.number(),
  priorityScore: z.number(),
})),
```

Bij `update_existing` genereert Fase C geen nieuwe pagina, maar een **diff-voorstel**: welke sectie(s) toevoegen/aanpassen aan de bestaande `body_markdown`, in plaats van een volledig nieuw document — een kleine aanpassing in de Fase-C-call (halte 6), niet in dit document verder uitgewerkt.

**Kosten:** embeddings zijn verwaarloosbaar goedkoop (~$0,00002/pagina), similarity-query is een gewone Postgres-query (pgvector-index), geen extra AI-kosten van betekenis.

---

## Herziene datamodel-delta (t.o.v. abcplan.md §5)

```
competitor_content_samples  (nieuw)
  id, analysis_id, competitor, url, raw_text, raw_json,
  extracted_patterns_json, fetched_at

content_pieces              (uitgebreid)
  + source_report_id, source_cluster, embedding vector(1536)

gap_outcomes                (nieuw)
  id, analysis_id, cluster, competitor, content_piece_id,
  visibility_before, visibility_after, measured_at

reports.gaps[].trend                  (uitgebreid veld, zie #4)
reports.recommendations[].priorityScore, existingContentPieceId  (uitgebreide velden, zie #2 en #5)
```

RLS-strategie blijft ongewijzigd t.o.v. abcplan.md §5: alle nieuwe tabellen volgen dezelfde regel — client leest read-only eigen rijen via `analysis_id`, schrijven gebeurt uitsluitend door de pipeline zelf (service-role).

## Herziene pipeline-volgorde (Fase B)

```
3c (concurrentie-breakdown, rekenwerk)
  ↓
3d (nieuw) — concurrent-content-analyse: crawl + 1 gebundelde AI-call
  ↓
[server, geen call] — priority-score + trend-momentum berekenen
  ↓
B1 — gap-analyse (input nu verrijkt met content-patronen, trend, previousActions)
  ↓
[server, geen call] — dedup-check tegen bestaande content_pieces (embeddings)
  ↓
B2 — rapport & aanbevelingen (input nu verrijkt met priorityScore, dedup-kandidaten)
```

## Kostenimpact — totaaloverzicht

| Onderdeel | Calls | Extra kosten/analyse |
|-----------|-------|------------------------|
| 3d · Concurrent-content-analyse | 1 (gebundeld) | ≈ $0,004 |
| Priority-score | 0 | $0,00 |
| Feedbackloop | 0 | ≈ $0,001 (bij wekelijkse tracking) |
| Trend-momentum | 0 | $0,00 |
| Dedup-embeddings | 1 embedding-call/pagina | ≈ $0,00002/pagina |
| **Totaal nulmeting** | +1 call | **≈ $0,356 → $0,363 (+2%)** |

Verwaarloosbaar t.o.v. de $0,333 die halte 3ab (de 30-prompt-meting) al kost — deze verbeteringen zitten in het goedkoopste deel van de pipeline, maar hebben de grootste invloed op de kwaliteit van wat de klant uiteindelijk publiceert.

## Bouwvolgorde (impact vs. moeite)

| Volgorde | Verbetering | Waarom deze volgorde |
|----------|-------------|------------------------|
| 1 | #1 — Concurrent-content-analyse | Grootste kwaliteitswinst, en de andere verbeteringen bouwen er niet op — kan los. |
| 2 | #2 — Priority-score | Puur server-side rekenwerk, klein en snel te bouwen, direct betere transparantie in de UI. |
| 3 | #5 — Dedup / update_existing | Vereist pgvector-setup (eenmalig), daarna laag onderhoud. |
| 4 | #4 — Trend-momentum | Heeft pas waarde zodra klanten meerdere weken tracking aan hebben staan — logisch later. |
| 5 | #3 — Feedbackloop | Bouwt voort op #1, #2 én #4 (heeft content_pieces-koppeling, priority-historie en trend nodig), dus als laatste. |

---

**Kort samengevat:** de huidige B1/B2-opzet is een solide fundament, maar mist het signaal dat er het meest toe doet — wat concurrent-content *inhoudelijk* effectief maakt. Verbetering #1 is het zwaarste gewicht in deze lijst; de rest (#2–#5) maakt de output vervolgens aantoonbaar onderbouwd, leert van eigen resultaten, en voorkomt onnodige contentwildgroei.
