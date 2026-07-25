# Verbeterplan: naar InSpace/Nova-niveau, op schaal van 100 prompts

> Dit document bouwt voort op **[abcplan.md](./abcplan.md)** en **[verbeterplan-fase-b.md](./verbeterplan-fase-b.md)**, en beantwoordt een andere vraag: niet "hoe maken we de huidige opzet iets beter", maar "wat zou een team van ~10 AI-developers bouwen, wetende dat er straks 100 prompts per analyse draaien in plaats van 30". Dat is een schaalsprong (3,3× meer metingen) én een kwaliteitssprong (concurreren met een product als Nova, zie [inspaceplan.md](./inspaceplan.md)) tegelijk — en die twee hangen samen: bij 100 datapunten kún je dingen die bij 30 statistisch geen zin hebben (betrouwbaarheidsintervallen, clustering, momentum per sub-segment).
>
> **Leeswijzer:** dit is bewust een ambitieus, duurder plan — geen "quick wins" maar architecturale keuzes. Elk onderdeel geeft aan wat het kost, wat het aan bouwtijd/complexiteit vergt, en waarom het pas op deze schaal de moeite waard wordt.

---

## De kern: wat verandert er fundamenteel bij 10 developers + 100 prompts?

| Nu (solo-bouwplan) | Op InSpace-niveau |
|---|---|
| 1 AI-engine (OpenAI) | 4 engines (ChatGPT, Perplexity, Gemini, Claude) — écht meten hoe je merk overal scoort, niet alleen in één model |
| 30 prompts, vaste categorieën, LLM verzint ze zelf | 100 prompts, datagedreven samengesteld (echte zoekvolume/intentdata) én semantisch geclusterd zodat er geen overlap/ruis in zit |
| Eén score per meting | Statistisch onderbouwde score met betrouwbaarheidsmarge, per segment |
| Per-analyse geïsoleerd leren | Cross-klant pattern library — het systeem wordt slimmer over álle klanten heen |
| Content wordt gegenereerd, klant plakt 'm | Content-QA/fact-check-laag + A/B-varianten + gedeeltelijk autonome herschrijf-lus |
| Eén vaste job-queue-aanname | Serieuze schaalinfra: partitionering, backpressure, multi-provider rate-limiting |

Elk van deze zes wordt hieronder uitgewerkt.

---

## 1. Multi-engine meting — het grootste kwaliteitsgat

**Waarom dit nummer 1 is:** een klant die alleen weet hoe hij scoort in ChatGPT, terwijl zijn kopers net zo goed Perplexity, Gemini of Claude gebruiken, krijgt een vertekend beeld. Nova meet expliciet over **ChatGPT (browsing), Perplexity, Gemini én Claude** (zie inspaceplan.md §3, stap 4). Dit is het verschil tussen "GEO-tracker" en een product dat een klant serieus neemt.

**Architectuur:** vervang de huidige "één 3a/3b-call per prompt" door een **engine-adapter-patroon**:

```ts
interface EngineAdapter {
  engine: "openai" | "perplexity" | "gemini" | "claude";
  runPrompt(promptText: string): Promise<RawEngineResponse>;   // 3a-equivalent
  supportsGrounding: boolean;                                   // heeft de engine zelf al web-toegang?
}
```

- **OpenAI:** zoals nu (`gpt-4.1-nano` + `web_search`).
- **Perplexity:** heeft **native web-grounding** in elk antwoord — geen aparte search-tool nodig, en de citaties komen al gestructureerd terug. Waarschijnlijk de goedkoopste en meest "eerlijke" bron van citatiedata, omdat het per ontwerp een antwoordmachine-met-bronnen is.
- **Gemini:** via Grounding with Google Search — vergelijkbaar mechanisme als `web_search` bij OpenAI, andere pricing.
- **Claude:** via de Anthropic API met web search tool — zelfde soort constructie als OpenAI's `web_search`.

**Beoordeling (3b) blijft engine-onafhankelijk:** één gedeelde structured-output-call (die kan best `gpt-4.1-nano` blijven, ongeacht welke engine het ruwe antwoord gaf) beoordeelt per entiteit of het merk genoemd is — dit hergebruikt exact de bestaande `tracking_run_mentions`-structuur, met een extra kolom `engine` op `tracking_runs`.

**Nieuwe rapportage-laag:** `visibility_scores` en `competitor_breakdown` krijgen een `engine`-dimensie. Het rapport (B2) kan dan uitspraken doen als *"je scoort sterk in ChatGPT (52%) maar nauwelijks in Perplexity (8%) — dat laatste is zorgwekkend omdat Perplexity zwaar leunt op citeerbare, recente bronpagina's, precies wat je nu mist."* Dat is een aanbeveling die zonder multi-engine-data simpelweg niet te doen is.

**Kosten (indicatief, per-provider pricing wisselt en moet je vóór bouw verifiëren — zie ook de bestaande waarschuwing in abcplan.md §10):** reken behoudend op een vergelijkbare orde van grootte per engine als de huidige OpenAI-kosten. Bij 4 engines × 100 prompts is de nulmeting-kostenpost dus **niet 1×$1,1 maar eerder 4×$1,1 ≈ $4-5/analyse** — een bewuste, forse meerkost die je alleen maakt omdat het product daadwerkelijk beter wordt, niet omdat het goedkoop is.

---

## 2. Datagedreven prompt-portfolio (van 30 naar 100, zonder verwatering)

**Het risico van simpelweg "meer van hetzelfde":** 100 prompts genereren door dezelfde 5 categorieën evenredig op te schalen (20 per categorie i.p.v. 6) levert al snel **bijna-duplicaten** op — een klein model dat 20 varianten op "waar koop ik het beste een iPhone" moet verzinnen, gaat herhalen. Dat verdunt het signaal in plaats van het te verrijken.

**Oplossing, twee lagen:**

**a) Echte zoekintentie-data als basis, niet alleen LLM-fantasie.** Dit is exact het gat dat al gesignaleerd staat in inspaceplan.md §5 ("Keyword-/volume-data ontbreekt"). Op deze schaal is de investering te rechtvaardigen: koppel een externe bron (DataForSEO, Semrush API, of minimaal Google Autocomplete/People-Also-Ask-signalen) die reële, veelgestelde vragen/zoektermen rond het onderwerp aanlevert. De promptgeneratie-call krijgt die lijst als **verplichte input** ("baseer je prompts op deze daadwerkelijk gestelde vragen, verzin ze niet uit het niets") in plaats van een vrije hand.

**b) Semantische clustering + funnel-spreiding (server-side, geen extra AI-kosten van betekenis).** Genereer eerst ruim (bv. 150 kandidaat-prompts via 10 categorie-calls i.p.v. 5), embed ze allemaal (`text-embedding-3-small`, zeer goedkoop), en dedupliceer via cosine-similarity vóórdat je de uiteindelijke 100 selecteert. Forceer daarbij een **vaste verdeling over de customer journey** (oriëntatie → vergelijking → probleem/oplossing → merkspecifiek → lokaal/branche → nieuw: transactie-intentie, na-verkoop/support), zodat 100 prompts een complete trechter dekken in plaats van willekeurig geclusterd rond één fase.

```ts
const PromptPortfolio = z.object({
  prompts: z.array(z.object({
    text: z.string(),
    category: z.string(),
    funnelStage: z.enum(["orientation","comparison","problem_solution","brand_specific","local","transactional","post_purchase"]),
    sourceSignal: z.enum(["keyword_data","llm_generated"]),  // audit: waar kwam deze prompt vandaan
  })),
});
```

**Kosten:** externe keyword-data-API (abonnementskosten, geen per-analyse marginale kost van betekenis), + embeddings voor dedup (~150 × $0,00002 ≈ verwaarloosbaar), + iets meer categorie-calls (10 i.p.v. 5, model mini) ≈ **+$0,004/analyse**. De grootste kostenpost is het externe data-abonnement zelf, niet de AI-calls.

---

## 3. Statistische robuustheid bij 100 datapunten

**Waarom dit nu pas kan:** bij 30 prompts, verdeeld over 5 categorieën (6 per stuk), is een enkel "gemist" antwoord al 17% van een categorie — te ruizig voor een betrouwbaarheidsinterval. Bij 100 prompts, goed verdeeld, kún je voor het eerst zinvol zeggen: *"binnen het cluster 'vergelijking' scoor je 34% ± 6% (n=22)"* in plaats van een kaal percentage dat evengoed toeval kan zijn.

**Server-side toevoeging (geen AI-call, statistiek):** bij het berekenen van `visibility_scores`/`competitor_breakdown` (halte 3c) een Wilson-betrouwbaarheidsinterval per cluster meenemen, plus een minimale-steekproef-waarschuwing ("dit cluster heeft slechts 4 metingen, resultaat indicatief") die B1 meekrijgt zodat het geen overtuigde uitspraken doet over te kleine subsets.

**Effect op B1/B2:** de `GapAnalysis`- en `Report`-schema's (zie verbeterplan-fase-b.md) krijgen een `confidence`-veld per gap, en het rapport kan expliciet onderscheid maken tussen "hard bewezen gat" en "eerste signaal, nog te weinig data" — dat voorkomt dat de klant een dure contentkeuze baseert op ruis.

**Kosten:** $0,00 — puur statistiek over data die je toch al verzamelt.

---

## 4. Cross-klant pattern library — het echte competitieve moat

**De observatie:** in het huidige (en het vorige verbeterplan-fase-b) ontwerp leert elke analyse alleen van zíchzelf. Een team van 10 developers zou dit niet laten liggen: patronen die je bij klant A ontdekt over "wat maakt content citeerbaar in Perplexity binnen de categorie duurzaamheid" zijn **grotendeels merk-onafhankelijk** en dus herbruikbaar voor elke andere klant in diezelfde sector. Dit is precies het soort samengestelde intelligentie dat een product na honderd analyses fundamenteel beter maakt dan bij analyse #1 — en het is de moat die een concurrent niet zomaar kopieert, omdat die pas ontstaat na schaal.

**Datamodel (nieuw, cross-analyse — niet meer gescoped op `analysis_id` alleen):**
```
content_pattern_library   id, sector, cluster, pattern_type,
                          pattern_description, supporting_evidence_count,
                          confidence, last_reinforced_at
                          -- geanonimiseerd/geaggregeerd: geen klantnaam of
                          -- herleidbare merkdata, puur structurele patronen
                          -- ("pagina's met vergelijkingstabel + FAQ scoren
                          -- gemiddeld 2,3× beter in Perplexity-citaties
                          -- binnen sector 'consumentenelektronica'")
```

**Vulling:** elke keer dat halte 3d (concurrent-content-analyse, zie verbeterplan-fase-b.md #1) draait, wordt het resultaat **ook** geaggregeerd bijgeschreven in deze library (los van de per-analyse opslag). Periodiek (bv. wekelijks, batch-job) een lichte samenvattings-call die nieuwe evidence samenvoegt met bestaande patronen per sector/cluster.

**Gebruik:** B1 krijgt naast de eigen concurrent-content-analyse ook de relevante patronen uit de library als extra context — zodat zelfs een gloednieuwe klant in een sector waar je al 20 andere analyses hebt gedraaid, direct profiteert van eerder geleerde patronen, niet pas na zijn eigen eerste meting.

**Kosten:** 1 extra batch-samenvattingscall per sector/week (niet per analyse) — verwaarloosbaar op klantniveau, wel een architecturale investering (een periodieke aggregatie-pipeline, geen kleine toevoeging).

---

## 5. Content-QA, fact-check en autonome optimalisatie-lus

**Twee aparte problemen die nu ontbreken:**

**a) Niemand controleert of gegenereerde content klopt.** Fase C (halte 6) produceert direct publiceerbare pagina's met concrete cijfers/claims (`keyDataPoints` uit de concurrent-analyse, cijfers uit Brand DNA). Bij 100 prompts en dus meer contentvolume neemt het risico op een verzonnen of verouderd cijfer toe — en dat is precies het soort fout dat een merk geloofwaardigheid kost bij AI-engines (die zelf ook op nauwkeurigheid selecteren wie ze citeren).
→ **Nieuwe stap tussen Fase C en publicatie:** een losse, goedkope verificatie-call die elke concrete claim/cijfer in `bodyMarkdown` aftoetst tegen de brondata (Brand DNA, `competitor_content_samples`, `raw_json` van de metingen) en markeert wat **niet** te herleiden is naar een bron — die vlag gaat naar de klant vóór publicatie, nooit stilzwijgend gepubliceerd.

**b) Nova "herschrijft/herstructureert automatisch wat onderpresteert" (inspaceplan.md §3, Fase 5) — bij ons stopt de lus nu na meten.** Met de feedbackloop uit verbeterplan-fase-b.md (#3) wéét je al of content werkte. De volgende stap: als een `content_piece` na 2-3 metingen aantoonbaar niet presteert, genereer je automatisch een **herschreven variant** (nieuwe `content_piece`-versie, gekoppeld aan de vorige) — met een goedkeuringsgate voor de klant (zelfde transparantie-principe als A2c), niet stiekem live vervangen.

**A/B-varianten bij het eerste genereren:** voor content in de hoogste-prioriteit-cluster (priorityScore uit verbeterplan-fase-b.md #2), genereer bewust **2 varianten** (andere opening, andere structuur) en laat de klant er 1 kiezen óf publiceer beide op verschillende URL's en laat de volgende meetronde bepalen welke beter scoort — daarna wordt de winnaar de basis voor toekomstige content in dat cluster.

**Kosten:** verificatie-call ≈ $0,002/pagina (klein, mini-model, alleen de claims + brondata als input). A/B-varianten verdubbelen de Fase-C-kosten voor uitsluitend de top-prioriteit-aanbevelingen (niet alles) — bij bv. 3 van de 10 aanbevelingen die dit krijgen: +3×$0,003 ≈ **+$0,009/analyse**.

---

## 6. Schaalinfra voor 100 prompts × meerdere engines × wekelijks

**Dit is geen AI-kwaliteitsvraag maar een systeemvraag — en bij 10 developers is dit waar het team zich voor een groot deel mee bezighoudt.**

- **Job-orchestratie:** bij 100 prompts × 4 engines × 2 calls (3a+3b) = **800 calls per nulmeting**, en dat wekelijks bij actieve tracking. Dit vraagt een échte queue met per-provider concurrency-limieten (elke engine heeft eigen rate-limits), retry-met-backoff per call (niet per hele analyse), en een voortgangsscherm dat werkelijk 800 deelstappen kan tonen zonder de UI te verstikken (aggregeren naar "612/800 verwerkt", niet 800 losse regels).
- **Partitionering van `tracking_runs`/`tracking_run_mentions`:** bij 100 prompts × 4 engines × wekelijks × groeiend klantenbestand groeien deze tabellen snel. Partitioneer op `analysis_id`-range of `ran_at`-maand, en bouw vanaf dag 1 een archiveringsstrategie voor `raw_response`/`mention_json` van oudere runs (bv. naar goedkope object storage) — de UI heeft de ruwe JSON zelden nodig voor iets ouder dan een paar maanden, maar het "bewaar alles"-principe (abcplan.md §5) blijft overeind, alleen niet per se in de hot-path database.
- **Pre-aggregatie voor dashboards:** met 4× meer engines en 3,3× meer prompts wordt een live `GROUP BY` over `tracking_run_mentions` voor elke paginaload te zwaar. Bouw een materialized view / nachtelijke aggregatie-job die `visibility_scores` en `competitor_breakdown` vooraf berekent i.p.v. on-the-fly bij elke tab-load.
- **Multi-provider secrets & kostenbewaking:** 4 API-keys, 4 verschillende pricing-modellen, 4 verschillende rate-limit-regimes. Bouw een centraal kosten-dashboard (per analyse, per engine, real-time) — bij deze schaal is "achteraf de OpenAI-rekening zien" niet meer voldoende risicobeheer.

**Kosten:** dit is voornamelijk **bouwtijd**, niet API-kosten — reken dit als infrastructuurinvestering, niet als kostprijs-per-analyse.

---

## Kostenimpact — eerlijk totaalbeeld

| Onderdeel | Extra kosten/analyse (nulmeting) |
|---|---|
| Basis 30→100 prompts, 1 engine (linear scaling van abcplan.md §10) | $0,356 → ≈ $1,13 |
| + verbeterplan-fase-b.md (5 verbeteringen) | + ≈ $0,01 |
| Multi-engine (×4, zeer indicatief, provider-pricing verifiëren) | ≈ $4-5 totaal i.p.v. $1,13 |
| Datagedreven prompt-portfolio (excl. keyword-API-abonnement) | + ≈ $0,004 |
| Statistische robuustheid | $0,00 |
| Cross-klant pattern library | verwaarloosbaar per analyse, wel architectuur |
| Content-QA + gedeeltelijke A/B | + ≈ $0,011 (bij content-aanvraag) |
| **Indicatieve nulmeting-kost op volle schaal** | **≈ $4-5/analyse** (t.o.v. $0,356 nu — een bewuste 10-15× stijging, gedreven door 4 engines × 3,3× meer prompts, niet door inefficiëntie) |
| **Wekelijkse lus op volle schaal (10 weken)** | **≈ $40-50/analyse** i.p.v. de huidige $3,33 |

**Eerlijke kanttekening:** de kostenstijging zit vrijwel volledig in twee keuzes — **4 engines** en **100 i.p.v. 30 prompts** — niet in de kwaliteitslagen zelf (die kosten samen slechts een paar cent extra). Als budget alsnog een rol speelt, is multi-engine het onderdeel om eventueel te faseren (bv. eerst OpenAI + Perplexity, later Gemini/Claude toevoegen) — dat halveert de meerkost zonder de kwaliteitslagen (#2 t/m #6) op te geven.

## Bouwvolgorde (wat een team van 10 parallel zou oppakken)

| Team/spoor | Onderdeel | Afhankelijk van |
|---|---|---|
| Spoor A — Meet-infra | #1 Multi-engine adapters + #6 schaalinfra | Niets, kan direct starten, grootste bouwklus |
| Spoor B — Prompt-kwaliteit | #2 Datagedreven portfolio + keyword-API-integratie | Niets |
| Spoor C — Analyse-kwaliteit | #3 Statistiek + verbeterplan-fase-b.md (#1-#5) | Spoor A (heeft multi-engine-data nodig voor volle waarde, maar los bouwbaar op huidige single-engine-data) |
| Spoor D — Content-kwaliteit | #5 QA/fact-check + A/B-lus | Spoor C (heeft priority-score en content-patronen nodig) |
| Spoor E — Lange termijn | #4 Cross-klant pattern library | Draait mee zodra Spoor C een aantal analyses heeft verwerkt, groeit vanzelf |

---

**Kort samengevat:** bij 30 prompts en één engine is de huidige opzet (mét verbeterplan-fase-b.md) prima verdedigbaar. Zodra je naar 100 prompts gaat, verandert de vraag fundamenteel — dan ga je namelijk ook automatisch concurreren op een schaal waar klanten een multi-engine-antwoord verwachten, en waar de infra (niet de AI-kwaliteit) de bottleneck wordt. De grootste stap die een 10-koppig team zou zetten die jij nu nog niet hebt: **multi-engine meting**. Dat is het verschil tussen "AI-visibility tracker" en een product dat écht op InSpace-niveau meespeelt.
