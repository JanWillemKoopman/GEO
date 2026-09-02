# Het kwaliteitsraamwerk voor content (analyse en plan, 2 september 2026)

Opdracht van de eigenaar: richt ORBIT ENGINE zo in dat een gegenereerde pagina kwalitatief
vergelijkbaar is met wat een goede copywriter voor déze klant zou schrijven, en dat de app kan
uitleggen **waarom** een pagina goed of onvoldoende is en **waar in de keten** het misging.

Dit document is eerst de analyse, dan het plan. Elk cijfer hieronder komt uit de code of uit
`content_pieces`, `ai_calls` en `fact_requests` op productie, gemeten op 2 september 2026. Niets
hieronder is geschat.

---

## 1. Architectuuroverzicht: waar de veertien fases in de code staan

| Fase (uit `processtappen-nieuwe-pagina.md`) | Waar het staat | AI? |
|---|---|---|
| 1-3 Merk klaarzetten en onderzoek | `lib/pipeline/discover.ts`, `profile-research.ts`, `offering.ts`, `market.ts`, `llm-baseline.ts`, `synthesis.ts` | ja, zeven taken |
| 4-5 Analyse opzetten en meten | `prepare.ts`, `prompts.ts`, `measure.ts` | ja |
| 6 Pagina's ontdekken | `recommendation.ts`, `structure-gap.ts`, `report.ts` | ja |
| 7 Pagina uitzoeken | `content-plan.ts` → `item-dossier.ts`, `explainer-verify.ts`, `content-contract.ts`, `existing-page-match.ts`, `factbase.ts`, `input-coverage.ts`, `content-input-gate.ts` | ja, twee aanroepen |
| 8 Briefing | `briefing.ts` (claim-audit) → `briefing-select.ts` (selectie, geen AI) | ja, één aanroep |
| 9 Concept schrijven | `content.ts` `draftContentPiece()`, model `sol` | ja, de duurste |
| 10 Drie keuringen | `content-panel.ts` (redactie, feitelijkheid, citeerbaarheid) plus zeven deterministische controles in `content-gate.ts`, `content-coverage.ts`, `similarity.ts`, `readability.ts`, `schema-jsonld.ts` | drie goedkope aanroepen |
| 11 Kwaliteitspoort en herstel | `content.ts` `reviseContentPiece()`, `content-repair-decision.ts`, `content-issues.ts`, `content-sections.ts` | ja, per ronde |
| 12 Eindcontrole | `content-final-gate.ts`, `open-questions.ts` | nee |
| 13-14 Vrijgeven en publiceren | `content-export.ts`, `publish.ts`, `publish-check.ts` | nee |

Taken en ketening: `lib/jobs/handlers.ts` (`content_plan` → `content_brief` → `content_draft` →
`content_revise`), payloads in `lib/jobs/types.ts`, inplannen in `lib/jobs/content-jobs.ts`.

**Contenttype wordt al vóór de generatie bepaald.** `content_pieces.type` (`article`, `faq`,
`landing`, `comparison`) komt uit de aanbeveling in fase 6 en stuurt `TARGET_WORDS`,
`TYPE_GUIDANCE` en de vaste briefingslots. Punt 22 van de opdracht is dus al gehaald; wat ontbreekt
is dat het type ook de **beoordeling** stuurt.

---

## 2. Wat er aan kwaliteitsfunctionaliteit al staat

Dit is meer dan de opdracht veronderstelt, en het meeste ervan moet blijven.

1. **De feitenkaart als gesloten lijst.** `brand_facts` → `buildFactBase()` → F-nummers →
   `claims_json` met per bewering het F-nummer én een letterlijk citaat, nagerekend door
   `isSupported()`. Dit is de sterkste hallucinatierem in de app.
2. **Herkomst per feit.** `brand_facts` draagt `source`, `source_url`, `kind`, `citable`,
   `allowed`, `origin_fact_request_id`, `origin_document_id`, `superseded_by`. De keten
   feit → bron → bewering → sectie bestaat dus al, van `origin_*` tot `contract.sections[].factRefs`.
3. **Het contentcontract** (`contract_json`, migratie 0082): secties met deelvraag, `mustCover`,
   `factRefs`, `explainerTerms`, `targetWords`, `needsBrandFact`, `presentOnExisting`.
4. **De inputpoort** (migratie 0087): `berekenInputCoverage()` en `inputpoort()` met de standen
   70 / 40 en drie uitwegen.
5. **Drie onafhankelijke beoordelaars** die parallel draaien en gestructureerde JSON leveren,
   waarvan twee zacht falen naar `null` (`content-panel.ts`).
6. **Negen deterministische controles**: zeven GEO-checks, duplicatie, leesbaarheid, verboden
   woorden, verboden onderwerpen, bronpraat, contractdekking, JSON-LD-validatie, ontwijkende zinnen.
7. **Gerichte reparatie per sectie** met `applySectionPatch()` in code, `prioriteerBevindingen()` en
   `beslisReparatieRonde()` (bewaar de betere versie, stop als het niet meer stijgt).
8. **Kostenbewaking per pagina** (`bewaakPaginaBudget`, migratie 0088) en twee uitgavenremmen.

---

## 3. De belangrijkste tekortkomingen, met de cijfers eronder

De zeven pagina's die de nieuwe pijplijn op 1 en 2 september schreef, eindstand:

| pagina | type | kwaliteit | geo | contractdekking | bronherleidbaarheid | rondes | bevindingen | nagekeken? |
|---|---|---|---|---|---|---|---|---|
| db76cb57 | article | 68 | 83 | 85 | 35 | 1 | 72 | ja |
| 3517f87e | article | 52 | 100 | 91 | 34 | 3 | 71 | ja |
| 8b67c7d1 | article | 61 | 80 | 96 | 35 | 3 | 51 | ja |
| 21281f29 | landing | 46 | 83 | 88 | 28 | 3 | 45 | ja |
| 56d4ecf4 | article | 36 | 100 | 98 | 36 | 3 | 46 | ja |
| ff87dd71 | landing | 48 | 100 | 86 | 39 | 3 | 96 | ja |
| 8688ff9a | landing | 48 | 100 | 90 | 57 | 3 | 63 | ja |

**T1. De contractdekking zegt "compleet" terwijl de pagina leeg is.** Elke pagina hierboven haalt
86 tot 98 procent contractdekking en tegelijk 28 tot 39 procent bronherleidbaarheid. De poort die
volledigheid meet, meet woordoverlap met een deelvraag; hij kan niet zien dat de sectie die er
staat, niets over dit bedrijf zegt. Dat is precies het geval uit §5 van de opdracht: negentig
procent dekking terwijl juist de commerciële claims onbewezen zijn.

**T2. De GEO-score discrimineert niet meer.** Gemiddeld 97,4 over 43 pagina's, en 100 op de drie
slechtste pagina's van de tabel. Vijf even zwaar wegende booleans, waarvan er drie vrijwel altijd
slagen. Een score die bijna altijd vol staat, is geen poort.

**T3. Er is één kwaliteitscijfer voor alle vier de contenttypes.** `REVIEW_THRESHOLD = 80`,
`GEO_THRESHOLD = 60` en `COVERAGE_THRESHOLD = 85` staan als constanten in `content.ts` en gelden
voor een FAQ net zo goed als voor een dienstenpagina. Gemeten: FAQ haalt gemiddeld 87,5 kwaliteit
en 0,7 procent bronherleidbaarheid, artikel 80,7 en 51,8, landing 80,1 en 77,1. Drie totaal
verschillende profielen tegen één lat.

**T4. Bevindingen zijn losse zinnen, geen diagnose.** `review_notes` is `text[]`: 45 tot 96 regels
per pagina, zonder dimensie, zonder ernst, zonder sectie, zonder de vraag of het blokkeert. De
reparatiestap krijgt er tien van (`MAX_BEVINDINGEN_PER_RONDE`), gekozen op een regex-gewicht. De
klant krijgt alle 96 te lezen. Niemand kan uit die lijst afleiden of de pagina publiceerbaar is.

**T5. Score, zekerheid en blokkade zitten in één boolean.** `needs_review` betekent tegelijk "de
score is te laag", "er staat een verboden woord in", "er staat een onbewezen bewering in" en "er is
nog een bevinding open". Er is geen manier om te zeggen: 91 punten, maar één kritieke claim zonder
bewijs, dus niet publiceren.

**T6. De evaluators kennen de dimensies niet die een copywriter onderscheiden.** Diepgang,
expertise, originaliteit, overtuigingskracht, tone of voice en bedrijfsspecificiteit worden nergens
gemeten. `qualityScore` is één getal dat het model zelf uit vijf criteria samenvat. Dat is precies
het verschil dat de opdracht wil dichten, en het is het enige wat vandaag ongemeten blijft.

**T7. Een mislukte evaluator is stilte.** Faalt de feitelijkheidsbeoordelaar, dan wordt hij `null`
en verdwijnt hij uit de bevindingen; de pagina kan daarna op `ready` eindigen alsof hij gekeurd is.
Zekerheid wordt nergens vastgelegd (§11 en scenario 11 van de opdracht).

**T8. De versiegeschiedenis van de rondes is weg.** `beslisReparatieRonde()` bewaart de betere
versie, maar de scores per ronde staan alleen in `critique_raw_json` als ongestructureerde blob.
"Versie 2 blijft de beste" is niet op te zoeken en niet te tonen.

**T9. Er is geen menselijke meetlat en geen benchmark.** Voor de meting bestaat `eval:mention`; voor
het schrijven, het duurste onderdeel, bestaat niets (herstelplan T2). Elke promptwijziging is een
gok met een verhaal eromheen.

**T10. Root cause is niet af te leiden.** Een generieke pagina kan komen uit een dunne crawl, een
onvolledige aanbodboom, een verkeerd contract of een zwakke schrijfronde. De app legt de uitkomst
vast maar nooit de oorzaakketen.

---

## 4. Het voorgestelde raamwerk

Uitgangspunt: **niets vervangen wat werkt.** Alle negen deterministische controles, de drie
beoordelaars, de feitenkaart, het contract en de reparatielus blijven staan. Er komt een laag
omheen die hun uitkomsten typeert, weegt per contenttype, en er een verklaring van maakt.

```
CONTENTTYPE (bestaat)
   └─ CONTENT QUALITY PROFILE  ← NIEUW, configuratie per type
         ├─ dimensies + gewichten + minimumscores
         ├─ harde regels (blokkeren)
         └─ bewijsvereisten (kritieke dekking)

CONTENTCONTRACT (bestaat, wordt uitgebreid met sectie-belang)
   └─ INFORMATION SUFFICIENCY  ← bestaat als input-coverage, wordt GEWOGEN
         ├─ evidence coverage        (bestaat: berekenInputCoverage)
         ├─ kritieke dekking          ← NIEUW
         └─ claim support coverage    (bestaat: sourceCoverage)

SCHRIJVEN (bestaat)
   └─ VIER BEOORDELAARS, parallel
         ├─ redactie      (bestaat, schema ongewijzigd)
         ├─ feitelijkheid (bestaat)
         ├─ citeerbaarheid(bestaat)
         └─ vakmanschap   ← NIEUW: diepgang, expertise, specificiteit,
                             originaliteit, overtuiging, toon
   └─ PROGRAMMATISCHE QA (bestaat, negen controles)
         ↓
   ALLE UITKOMSTEN → QualityIssue[]  ← NIEUW, één type voor alles
         ↓
   QUALITY EVALUATION  ← NIEUW: dimensiescores, gewogen totaal,
                          zekerheid, blokkades, PASS/REPAIR/BLOCK
         ↓
   REPARATIE (bestaat) met per sectie: probleem, ontbrekend bewijs,
   toegestaan bewijs, verboden aannames  ← NIEUW in de opdracht aan het model
         ↓
   VERSIEKEUZE (bestaat) nu met blokkadebesef  ← UITGEBREID
         ↓
   ROOT CAUSE  ← NIEUW, puur afgeleid, geen AI
```

### 4.1 De universele dimensies

Twaalf, en per contenttype telt een deelverzameling mee. De keuze volgt wat in de app **te meten**
is, niet wat mooi klinkt: elke dimensie heeft minstens één bron die hem vult.

| Dimensie | Bron | AI nodig? |
|---|---|---|
| `feitelijkheid` | feitelijkheidsbeoordelaar + `sourceCoverage` + ongetagde beweringen | deels |
| `bewijs` | gewogen evidence coverage, kritieke dekking | nee |
| `relevantie` | `checkContentGate` (doelvraag beantwoord), citeerbaarheidsbeoordelaar | deels |
| `specificiteit` | vakmanschapsbeoordelaar + aantal F-nummers per 100 woorden | deels |
| `expertise` | vakmanschapsbeoordelaar | ja |
| `volledigheid` | contractdekking + resterende lezersvragen | deels |
| `diepgang` | vakmanschapsbeoordelaar + woorden per sectie tegen `targetWords` | deels |
| `originaliteit` | vakmanschapsbeoordelaar + `similarity` tegen bestaande pagina's | deels |
| `structuur` | `checkContentGate`, `splitSections`, JSON-LD-validatie | nee |
| `leesbaarheid` | `checkQuality` (zinslengte), `readability.ts` | nee |
| `toon` | vakmanschapsbeoordelaar tegen de vier tone-schuiven | ja |
| `overtuiging` | vakmanschapsbeoordelaar, alleen bij commerciële types | ja |

`feitelijkheid`, `relevantie`, `structuur` en `leesbaarheid` gelden voor élk type. De rest hangt aan
het profiel.

### 4.2 De vier kwaliteitsprofielen

| | article | faq | landing | comparison |
|---|---|---|---|---|
| zwaarste dimensies | diepgang, expertise, volledigheid | relevantie, leesbaarheid | specificiteit, bewijs, overtuiging | volledigheid, feitelijkheid |
| minimum totaal | 75 | 70 | 78 | 75 |
| minimum bewijsdekking | 50 | geen | 70 | 60 |
| kritieke claimdekking | 100 | 100 | 100 | 100 |
| type-eigen harde regel | minstens vier secties | minstens vijf FAQ-paren | een contactmogelijkheid genoemd | nooit een bedrijf bij naam |
| overtuiging telt mee | nee | nee | ja | nee |

De drempels van vandaag (80 / 60 / 85) blijven het startpunt en zijn per type gedifferentieerd langs
de gemeten verschillen uit T3. Ze staan op één plek, met de reden erbij, en zijn bij te stellen
zodra er twintig beoordeelde pagina's liggen.

### 4.3 Het issue-model

Eén type voor alle bronnen: `QualityIssue { dimension, severity, section, finding, evidence,
expected, recommendation, blocking, confidence, phase }`. `phase` is de root cause: uit welke stap
van de keten dit probleem komt. Dat maakt de reparatie gericht (het model krijgt `expected` en
`evidence`, niet alleen `finding`) en het maakt de klantweergave kort (alleen `blocking` en
`severity: hoog` worden getoond).

### 4.4 Score, zekerheid en blokkade, drie getallen

- **Score**: gewogen gemiddelde van de dimensies die dit profiel meeweegt, 0-100.
- **Zekerheid**: welk deel van de dimensies gevuld kon worden. Faalt een evaluator, dan daalt de
  zekerheid en zegt de app dat, in plaats van te doen alsof het goedgekeurd is.
- **Blokkade**: verboden woord, verboden onderwerp, concurrent bij naam, kritieke claim zonder
  bewijs, duplicaat boven de drempel, of een bewerende zin zonder enige bron. Alleen deze zes.

`PASS` = geen blokkade, elke minimumscore gehaald. `REPAIR` = herstelbaar tekort.
`BLOCK` = blokkade aanwezig; de pagina komt nooit op "klaar om te publiceren" te staan.

### 4.5 Wat programmatisch blijft en wat AI vereist

Programmatisch (geen enkele nieuwe aanroep): bewijsdekking, kritieke dekking, contractdekking,
verboden woorden en onderwerpen, duplicatie, leesbaarheid, lengte per sectie, aantal FAQ-paren,
JSON-LD, metadata, sectiestructuur, gedachtestreepjes, ontwijkende zinnen, root cause, versiekeuze,
de hele weging en het eindoordeel.

AI (één nieuwe aanroep per pagina, goedkope tier, parallel): vakmanschap. Diepgang, expertise,
specificiteit, originaliteit, toon en overtuiging vragen semantisch begrip en zijn niet te tellen.

### 4.6 Kosten

Gemeten op `ai_calls`: `content_draft` $0,071 gemiddeld, `content_revise` $0,139, de drie
beoordelaars samen $0,009. De vierde beoordelaar draait op dezelfde tier met dezelfde
redeneerinspanning en kost naar verwachting ongeveer $0,004, dus circa drie procent van een pagina.
Hij draait parallel met de andere drie en kost dus geen extra doorlooptijd.

Waar we kosten **besparen**: een blokkade laat de reparatielus niet doorgaan als het probleem een
ontbrekend feit is, want dat lost geen herschrijving op. Gemeten kostten de rondes van 1 september
$0,78 van de $1,08 per pagina zonder de score te verbeteren.

---

## 5. Wijzigingen per bestaande fase

| Fase | Wijziging |
|---|---|
| 6 (aanbeveling) | geen |
| 7 (contract) | per sectie `importance` (kern/ondersteunend/optioneel), zodat de bewijsdekking gewogen kan worden |
| 7 (inputpoort) | `berekenInputCoverage` krijgt een gewogen variant naast de bestaande; de poort weegt kritieke secties zwaarder dan het percentage |
| 8 (claim-audit) | `AuditedClaim` krijgt `claimClass` (kritiek/ondersteunend/algemeen) en `verifiable`; de selectie prioriteert op kritieke dekking |
| 9 (schrijven) | geen wijziging aan de schrijfprompt zelf |
| 10 (keuring) | vierde beoordelaar erbij; alle uitkomsten worden `QualityIssue[]` |
| 11 (poort) | `beoordeelKwaliteit()` levert PASS/REPAIR/BLOCK, score, zekerheid, dimensies |
| 11 (reparatie) | de opdracht per sectie krijgt probleem, ontbrekend bewijs, toegestaan bewijs, verboden aannames |
| 11 (versies) | elke ronde krijgt een rij in `content_quality_runs`; de beste versie wint op blokkade vóór score |
| 12-14 | ongewijzigd |

---

## 6. Databasewijzigingen (migratie 0091, additief)

`content_pieces`, vijf kolommen:

- `quality_json jsonb` – de volledige evaluatie: dimensies, issues, blokkades, root causes
- `quality_verdict text` – `pass` / `repair` / `block`
- `quality_confidence numeric(5,2)` – 0-100
- `critical_evidence_coverage numeric(5,2)` – dekking van de kritieke secties
- `quality_profile text` – welk profiel gewogen heeft (audit-trail bij een latere profielwijziging)

`content_quality_runs`, nieuw: één rij per beoordeling per ronde. Draagt de score, de dimensies, het
oordeel, de zekerheid, het aantal blokkades en of deze ronde bewaard is. Dit is wat "versie 2 blijft
de beste" opzoekbaar maakt en tegelijk de benchmarkdata levert.

`content_quality_reviews`, nieuw: de menselijke beoordeling en de gouden referentie. Draagt de zes
menselijke maten uit §11 van de opdracht, de referentietekst, en een `benchmark_set`-label. Twintig
pagina's of duizend maakt geen verschil: het is een label op bestaande rijen, geen aparte structuur.

Er komt géén aparte benchmarktabel voor merken en clusters: merk is `profiles`, cluster is
`analyses`, pagina is `content_pieces`. Een derde structuur ernaast zou een tweede bron van waarheid
zijn.

---

## 7. Teststrategie

Alle nieuwe rekenkunde is puur en zonder `server-only`, dus meetbaar vanuit `scripts/test-unit.ts`:
weging, drempels, blokkadeklassen, zekerheid, versiekeuze, root cause, gewogen bewijsdekking.

De twaalf scenario's uit de opdracht landen in `scripts/test-chain.ts`, die echte Postgres en de
echte handlers gebruikt met een gestubde OpenAI. Scenario 3 (kritieke claim zonder bewijs blokkeert),
7 (slechtere reparatie wordt niet bewaard), 11 (een gevallen evaluator wordt niet als goedkeuring
gelezen) en 12 (kostenplafond) zijn de vier die vandaag niet gedekt zijn en die het meest kosten als
ze fout gaan.

---

## 8. Fasering

- **A** kwaliteitsprofielen, dimensies, issue-model, weging, migratie
- **B** gewogen bewijsdekking, claimklassen, briefingprioritering
- **C** vierde beoordelaar, evaluatie, poort met PASS/REPAIR/BLOCK en zekerheid
- **D** reparatie met bewijsopdracht, versiekeuze met blokkadebesef, `content_quality_runs`
- **E** menselijke beoordeling, gouden referentie, root cause, het Kwaliteitslab
- **F** later: ijking van de drempels op twintig beoordeelde pagina's, incrementele evaluatie per
  gewijzigde sectie, caching

---

## 9. Risico's

1. **De drempels rusten op zeven pagina's.** Ze zijn gedifferentieerd langs gemeten verschillen,
   maar niet geijkt. Daarom staan ze op één plek, met een commentaar dat zegt waarop ze rusten.
2. **Backward compatibility.** Elke nieuwe kolom mag `null` zijn; een pagina van vóór deze migratie
   houdt zijn `quality_score`, `geo_score` en `coverage_score` en krijgt geen oordeel dat op
   ontbrekende data rust (conventie 3).
3. **Meer blokkades dan verwacht.** Zeven van de zeven recente pagina's zouden vandaag op `block`
   uitkomen. Dat is de bedoeling: ze staan nu op `ready` terwijl de app zelf 45 tot 96 redenen
   opschreef waarom ze het niet zijn. Blokkeren is hier geen muur, want de klant kan de tekst zelf
   bewerken en zelf publiceren; wat op slot gaat, is dat ORBIT ENGINE hem "klaar" noemt.
