# Het kwaliteitsraamwerk voor content (analyse en plan, 2 september 2026)

Opdracht van de eigenaar: richt ORBIT ENGINE zo in dat een gegenereerde pagina kwalitatief
vergelijkbaar is met wat een goede copywriter voor déze klant zou schrijven, en dat de app kan
uitleggen **waarom** een pagina goed of onvoldoende is en **waar in de keten** het misging.

Dit document is eerst de analyse, dan het plan. Elk cijfer hieronder komt uit de code of uit
`content_pieces`, `ai_calls` en `fact_requests` op productie, gemeten op 2 september 2026. Niets
hieronder is geschat.

---

> ## Stand op 3 september 2026: fase A tot en met E zijn gebouwd
>
> Vier controles groen: typecheck, 4060 unittests (160 nieuwe), 625 ketentests (20 nieuwe), de
> productiebuild. Migratie `0091` staat op productie, additief.
>
> **Wat er staat**: de twaalf dimensies met per dimensie een bron die hem kan vullen
> (`quality-dimensions.ts`), vier kwaliteitsprofielen per contenttype (`quality-profile.ts`), één
> type voor elke bevinding met sectie, bewijs, verwachting, blokkade, zekerheid en ketenfase
> (`quality-issue.ts`), de weging tot score, zekerheid en oordeel als drie losse getallen
> (`quality-score.ts`), de gewogen bewijsdekking met de kernsecties driemaal zo zwaar
> (`evidence-weight.ts`), de root-cause-analyse (`root-cause.ts`), één keuring voor de eerste versie
> én de reparatierondes (`quality-run.ts`), een vierde beoordelaar voor vakmanschap
> (`content-craft.ts`), de reparatieopdracht per sectie met toegestaan bewijs en verboden aannames
> (`quality-repair.ts`), de klant- en adviseursweergave (`components/quality-panel.tsx`) en het
> Kwaliteitslab met de menselijke beoordeling en de gouden referentie (`/beheer/kwaliteit`).
>
> **Wat er nog niet staat**: fase F. De drempels rusten op zeven pagina's en zijn gedifferentieerd
> langs gemeten verschillen, niet geijkt; daarvoor zijn twintig menselijk beoordeelde pagina's nodig
> (`IJKING_MINIMUM`). Incrementele evaluatie per gewijzigde sectie en caching van beoordelingen zijn
> bewust uitgesteld: de vier beoordelaars kosten samen ongeveer $0,013 per pagina tegenover $0,071
> voor de schrijfaanroep, dus daar valt weinig te besparen zolang de reparatierondes ($0,139 per
> ronde) de echte kostenpost zijn.
>
> **Twee dingen zijn anders uitgepakt dan hieronder beschreven staat**, allebei gevonden doordat een
> test omviel. Ze staan in `docs/logbook.md` bij 3 september 2026: de inputpoort werd bijna een muur
> (een ongedekte kernsectie zette de graad op nul in plaats van onder een plafond), en de root cause
> koos bij een gelijk aantal blokkades de fase met de meeste bevindingen in plaats van de fase die
> een herschrijving niet kan oplossen.
>
> **Nog niet geverifieerd tegen een echte klantronde** (conventie 10). De ketentest bewijst de
> samenhang op de stub; wat er in een echte ronde uit de dimensiescores komt is nog niet gemeten.

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
| 10 Keuringen | `content-panel.ts` plus de deterministische controles in `content-gate.ts`, `content-coverage.ts`, `similarity.ts`, `readability.ts`, `schema-jsonld.ts`. Sinds `0091` staan ze samen in `quality-run.ts` en is er een vierde beoordelaar (vakmanschap) | vier goedkope aanroepen |
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
het schrijven, het duurste onderdeel, bestaat niets. Het herstelplan na de audit had hier een eigen
punt voor (T2, `eval:content`), maar de eigenaar heeft dat geschrapt (`docs/logbook.md`, 3 september
2026); dit gat blijft dus open. Elke promptwijziging is een gok met een verhaal eromheen.

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

---

## 10. Wat er ná de eerste oplevering nog openstaat (3 september 2026)

De opdracht van de eigenaar bestaat uit 32 punten. Na de merge van #48 is het grootste deel gebouwd
en staat het op productie. Deze lijst is de eerlijke rest: vijf punten die niet, half of alleen als
losse functie geïmplementeerd zijn. Ze staan op volgorde van wat ze de kwaliteit opleveren, niet op
volgorde van hoeveel werk ze zijn.

### ~~R1. De claimdekking is gebouwd maar nergens aangesloten~~ (gebouwd 3 september 2026)

> **Af.** De claim-audit bereikt de kwaliteitspoort nu wel: elke kernbewering die niet onderbouwd
> kan worden, is een blokkade met de bewering letterlijk erin en met de bijbehorende vraag als
> aanbeveling. De claimdekking weegt daarnaast mee in de bewijsdimensie, zodat een pagina waarvan
> alle secties een feit hebben maar de dragende bewering niet, ook in het CIJFER zakt.
>
> **Er kwam één bug uit die er al zat.** Zie hieronder bij "de valkuil": `buildPlanBlock()`
> vertelde de schrijver "GEEN BRON: laat deze passage weg" over beweringen die wél onderbouwd
> waren, en juist bij de klant die net een vraag had beantwoord. Ook gerepareerd.
>
> 11 nieuwe unittests en 4 nieuwe ketenasserties. Vier controles groen: typecheck, 4071 unittests,
> 630 ketentests, build.

### R1. De claimdekking is gebouwd maar nergens aangesloten (punt 5 en 7)

`berekenClaimDekking()` in `evidence-weight.ts` telt hoeveel van de bedrijfsspecifieke beweringen uit
de claim-audit onderbouwd zijn, en zet de kritieke onbewezen beweringen apart. Nagekeken met grep:
de functie wordt alleen door `scripts/test-unit.ts` aangeroepen. Hij beïnvloedt dus geen enkele
beslissing.

Dat is precies de "Claim Support Coverage" uit punt 5 van de opdracht, en hij mist op de plek waar
hij het meeste zou doen: de claim-audit weet wél welke beweringen kern zijn en welke onbewezen, maar
dat gegeven bereikt de kwaliteitspoort niet. Nu komt een kritieke onbewezen bewering alleen als
blokkade binnen via de SECTIE die hem draagt; een kernbewering die aan geen enkele sectie hangt,
glipt erdoor.

**Wat er moet gebeuren.** De claim-audit bewaart al een momentopname in
`content_pieces.briefing_snapshot_json` (`planFromSnapshot()`). `keurPagina()` leest die snapshot al
niet; dat moet hij wel gaan doen, en `berekenClaimDekking()` erop draaien met dezelfde
`isSupported()` die de rest van de app gebruikt. Elke kritieke onbewezen bewering wordt dan een
blokkerende bevinding met de bewering letterlijk erin, naast de bestaande sectieblokkade. Eén extra
databaselezing, geen AI-aanroep.

**Waarom dit als eerste moet.** Dit is het enige openstaande punt dat een onwaarheid kan tegenhouden.
De andere vier maken de app slimmer of goedkoper; deze maakt hem veiliger.

**⚠️ De valkuil, gevonden tijdens het bouwen.** Een F-nummer is een POSITIE en geen identiteit:
"F3" betekent "het derde citeerbare feit op deze kaart" (`numberFacts`). De kaart is gesorteerd op
betrouwbaarheid met de klantantwoorden vooraan (`SOURCE_ORDER`), dus zodra de klant één vraag
beantwoordt schuift élk volgend nummer één op. De claim-audit is bevroren op het moment van de
briefing, dus vóór die antwoorden.

Het bevroren nummer blind opnieuw opzoeken zou dus een bewering als onbewezen aanmerken terwijl het
bewijs er gewoon is, en precies bij de klant die net iets had aangeleverd. Voor een BLOKKADE is dat
onacceptabel. `claimIsOnderbouwd()` doet daarom twee stappen: eerst de strenge positiegebonden
controle, en als die niets vindt, de vraag of het letterlijke citaat in ÉÉN van de bruikbare feiten
op de huidige kaart staat, ongeacht het nummer. Blokkeren mag alleen als er nergens bewijs is, niet
als het bewijs verhuisd is.

Diezelfde valkuil zat al in `buildPlanBlock()`, de tekst die de schrijver meekrijgt: die zei "GEEN
BRON: laat deze passage weg" over een bewering die wél gedekt was. Gevolg: de klant beantwoordt een
vraag, en juist daardoor verdwijnt informatie uit zijn pagina. Ook omgezet naar
`claimIsOnderbouwd()`.

### R2. Betrouwbaarheid per bron ontbreekt (punt 6 en 7)

De opdracht vraagt bij elke bewering: "hoe betrouwbaar is die evidence?" Vandaag kent de feitenkaart
wel een HERKOMST (`brand_facts.kind`: klant, site, onderzoek) en gebruikt hij die om te sorteren
(`SOURCE_ORDER`), maar de kwaliteitsweging behandelt alle drie gelijk. Een bewering die op een door
de klant bevestigd feit rust, telt dus even zwaar als een bewering die op een zin uit een gecrawlde
pagina rust.

Dat is niet hetzelfde risico. Een klantantwoord is bevestigd; een gecrawlde zin kan verouderd zijn,
uit een ander verband komen, of uit een menu geplukt zijn.

**Wat er moet gebeuren.** Een gewicht per bronsoort in `evidence-weight.ts` (klant zwaarder dan site
zwaarder dan onderzoek), meegewogen in de bewijsdimensie. Puur, geen migratie: `kind` staat al op
elk feit. Daarnaast `brand_facts.verify_after` benutten, dat al bestaat maar nergens gelezen wordt:
een feit waarvan de houdbaarheidsdatum verstreken is, hoort minder zwaar te tellen dan een vers feit.

### R3. Herbruikbaarheid weegt niet mee in de vraagselectie (punt 8)

De opdracht noemt zes prioriteiten voor de briefing. Vijf ervan zitten erin (impact op de
belangrijkste sectie, commerciële relevantie, bedrijfsspecificiteit, bewijs, en sinds #48 het belang
van de sectie). De zesde niet: "een vraag die voor vijf toekomstige pagina's relevant is, kan
belangrijker zijn dan een vraag die alleen voor één zin nodig is".

De sortering in `briefing-select.ts` is nu `winst voor de zwakste pagina × aantal pagina's × kern ×
prioriteit`. Het aantal pagina's telt alleen de pagina's in DEZE batch, niet de toekomstige.

**Wat er moet gebeuren.** `BriefingQuestion.scope` bestaat al met drie standen (merk, analyse,
pagina) en zegt precies dit: een merkbreed antwoord geldt voor élke toekomstige pagina van deze
klant. Dat als factor in de sortering opnemen is één regel plus een unittest. ⚠️ Voorzichtig wegen:
te zwaar en de briefing wordt een merkinterview in plaats van een paginavoorbereiding, en dan
verdwijnt juist de vraag die déze pagina scherp maakt.

### R4. Vijf van de twaalf testscenario's zijn expliciet eind tot eind gedekt (punt 29)

Nagekeken met grep op de scenarionummers: 3, 5, 10, 11 en 12 staan als zodanig in `test-chain.ts`.
De andere zeven zijn wel gedekt, maar verspreid en zonder dat iemand kan opzoeken wélk scenario
waar getoetst wordt:

| Scenario | Stand |
|---|---|
| 1 veel informatie → goede pagina | via het hoofdscenario, niet als zodanig benoemd |
| 2 weinig informatie → relevante vragen | via "De juiste vragen vóór het schrijven" |
| 4 FAQ → juiste rubric | unittest op de profielen, niet eind tot eind |
| 6 reparatie verbetert → nieuwe versie | unittest op `nietSlechterDan`, niet eind tot eind |
| 7 reparatie verslechtert → vorige versie | idem |
| 8 één sectie fout → alleen die herschreven | bestaande ketentest, niet als zodanig benoemd |
| 9 vergelijkbare content → duplicatie voorkomen | unittest op de drempel, blokkade niet eind tot eind |

**Wat er moet gebeuren.** De zeven aanvullen in dezelfde vorm als 3, 5, 10, 11 en 12, met het
scenarionummer in de assertie. Dat is geen cosmetiek: een scenario dat niemand kan terugvinden, is
een scenario waarvan niemand merkt dat het wegvalt. Scenario 6 en 7 zijn het belangrijkst, want die
raken de versiekeuze en die beslist welke tekst de klant leest.

### R0. De zinnenknipper maakt van koppen en lijsten valse blokkades (gevonden 3 september 2026)

**Dit staat vooraan omdat het de poort onbruikbaar maakt en de ijking van R5 blokkeert.** Gevonden
door de benchmarkronde van twaalf pagina's echt te draaien
(`docs/tasks/benchmarkronde-twee-klanten.md`), niet door erover na te denken.

**Wat er gebeurde.** Alle twaalf pagina's kregen `verdict: block`. Alle twaalf. Een poort die
honderd procent tegenhoudt zegt niets meer, en hij liet ondertussen zestien reparatierondes draaien
tegen bevindingen die geen enkele herschrijving kan oplossen.

**De oorzaak, nagerekend en niet vermoed.** Van de 144 blokkerende bevindingen komen er 123 uit
`bronherleidbaarheid`, en daarvan zijn er aantoonbaar 30 geen zin. `splitSentences()` en
`stripMarkdown()` in `lib/pipeline/sentences.ts` hebben twee gaten:

1. **Een kop wordt aan de volgende alinea geplakt.** `stripMarkdown` haalt de `#` weg maar laat geen
   zinseinde achter, en een kop eindigt niet op een punt. Gevolg: kop plus eerste zin is één "zin".
   27 van de 123.
2. **Een opsomming binnen één regel wordt op de cijfers geknipt.** `stripMarkdown` haalt alleen aan
   het BEGIN van een regel `1. ` weg (`^\s{0,3}\d+\.\s+` met `gm`). Staat de opsomming achter een
   dubbele punt op dezelfde regel, dan blijft "1." staan, en `splitSentences` ziet in "1. " een
   punt met witruimte erachter, dus een zinseinde. Elk lijstitem wordt een fragment dat eindigt op
   het cijfer van het VOLGENDE item. 3 van de 123.

Reproductie met de echte functies, op tekst uit de ronde:

```
splitSentences(stripMarkdown("## Snel hulp bij daklekkage in Zutphen\n\nBel MJB ..."))
  → "Snel hulp bij daklekkage in Zutphen\n\nBel MJB Dakservice op 0578 234 502 ..."   ← één "zin"
  → "Zo verloopt een spoedreparatie\n\nSpreek bij spoed deze volgorde af: 1. "
  → "meld de lekkage, 2. "
  → "laat de situatie inspecteren en de mogelijke oorzaak vastleggen, 4. "
```

Die fragmenten gaan naar `detectClaimSentences()`, die een cijfer of de merknaam als signaal neemt
en ze dus als bewering aanmerkt. Een fragment kan nooit naar een feit op de kaart wijzen, dus het
wordt een blokkerende `feitelijkheid`-bevinding met `confidence: ZEKER`. Zeker over een zin die
niet bestaat.

⚠️ **De ondergrens is 30, niet het echte aantal.** `quality-collect.ts` neemt per ronde maar de
eerste vijf ongetagde zinnen mee (`.slice(0, 5)`), en de meeste rondes zitten met vier of vijf tegen
die grens aan. Er zijn er dus meer dan we zien.

**Wat het niet is.** De ontwerpkeuze "vals-positieven zijn goedkoper dan vals-negatieven"
(`claim-extract.ts`) staat niet ter discussie en is juist. Dit is iets anders: de invoer van die
regel is stuk, niet de regel zelf. Een kop is geen bewering en een half lijstitem is geen zin.

**De reparatie (gedaan 3 september 2026).** In `sentences.ts`, niet in de claimregels:

- `stripMarkdown` laat achter een kopregel een witregel staan, en `splitSentences` telt een witregel
  als zinsgrens. Een kop versmelt daardoor nooit meer met de alinea eronder.
- `splitSentences` telt een punt achter een hooguit tweecijferig getal niet als zinseinde wanneer
  dat getal op een regelbegin of op `:`, `;` of `,` volgt én er een kleine letter achter komt. Dat
  is een opsommingsnummer. Dezelfde soort uitzondering als die er al was voor "Bol.com" en "3.5".
- Acht tests in `scripts/test-unit.ts`, met de zinnen uit de ronde zelf. Twee daarvan zijn
  tegenproef: "Wij bestaan sinds 1995. Daarom…" moet nog steeds splitsen, en "Stap 1. Bel ons." ook.
  Zonder die twee zou de reparatie een echte zinsgrens wegnemen, en dat is erger dan de fout die hij
  oplost.

**Wat er bij het repareren nog boven water kwam.** De toelichting van `sentences.ts` beloofde dat
drie controles op dezelfde manier knippen. Dat was niet zo: `geo-check.ts` bestaat niet, en
`content-gate.ts` en `validate-claims.ts` hebben elk hun eigen kopie. De fout zat dus in twee van de
drie kopieën tegelijk, en niets dwong af dat ze gelijk bleven.

De kopie in `content-gate.ts` is bewust niet meeveranderd: daar voedt het knippen alleen een noemer
(het aandeel ontwijkende zinnen) en de vraag of er een citeerbare zin met de merknaam is. Geen van
beide blokkeert, en ze meeveranderen verschuift de poortuitkomst van élke bestaande pagina. Dat is
een aparte ingreep met een eigen meetronde.

**⚠️ Wat de reparatie NIET oplost, nagerekend op de 123 bevindingen zelf.**

| Soort | Aantal | Weg door R0? |
|---|---|---|
| Kop aan de alinea geplakt (bevat een regelovergang) | 27 | ja |
| Fragment van een opsomming (begint klein of eindigt niet op een leesteken) | 4 | ja |
| Ziet eruit als een hele, normale zin | 92 | **nee** |

R0 haalt er dus 31 van de 123 weg, een kwart. **De twaalf pagina's worden hierdoor niet groen.** Met
92 overgebleven blokkades over 28 keuringsrondes houdt vrijwel elke ronde er minstens één over, en
`quality-collect.ts` maakt van elke ongetagde zin een blokkade met `confidence: ZEKER`.

### R0b. Een oproep tot actie is geen bewering (gerepareerd 3 september 2026)

Van die 92 zijn er 32 een instructie aan de lezer of een verwijzing naar het contact, geen uitspraak
over het bedrijf. Letterlijk uit de ronde:

- "Bel 030-2270437 of stel eerst een vraag."
- "Neem contact op om de actuele beschikbaarheid te bespreken."
- "Vraag via de contactpagina welke tijden vandaag, deze week of op zaterdag beschikbaar zijn."
- "De adressen en contactmogelijkheden van beide vestigingen staan op de contactpagina."

Waarom ze blokkeren: `GETAL` in `claim-extract.ts` is `/(\d|€|%)/`, dus een telefoonnummer maakt van
elke zin een bewering. En `TOEZEGGINGEN` bevat "kun je", "beschikbaar", "binnen" en "altijd", die
allemaal net zo goed in een gewone instructie staan.

Een oproep tot actie belooft niets over het bedrijf en valt dus niet te onderbouwen met een feit.
Hem blokkerend maken betekent dat elke pagina met een telefoonnummer eronder tegengehouden wordt.

**De reparatie.** Twee regels in `claim-extract.ts`:

1. **Contactgegevens tellen niet als getal.** Een telefoonnummer, een e-mailadres en een postcode
   gaan uit de zin voordat `GETAL` erop losgelaten wordt. Alleen die drie; "wij staan binnen 24 uur
   op het dak" houdt zijn 24 en blijft dus een bewering, want dát is wel een belofte. Een webadres
   blijft ook staan, want "Op valk.com reserveert u direct online" was een van de twee fabricages.
2. **Toezeggingswoorden matchen aan het woordbegin**, met hooguit drie letters speling aan het eind.

⚠️ Punt 2 is bij de eerste poging fout gegaan, en de bestaande test ving het. Een woordgrens aan
BEIDE kanten eisen lijkt netter, maar de lijst bevat stammen: "reserveer" matcht dan niet meer op
"reserveert", en precies die zin was de Van der Valk-fabricage. Nederlandse vervoeging plakt er
hooguit een paar letters achter ("reserveert", "biedt", "leveren"), terwijl een afleiding die de
betekenis verandert langer is ("beschikbaarheid" is +4, "mogelijkheden" +5). Vandaar drie.

**Nagemeten op de teksten van deze ronde**, niet op oudere pagina's: van de 62 blokkerende
bevindingen van MJB blijven er 37 over. De verdwenen 25 zijn oproepen tot actie, telefoonnummers en
woorden als "beschikbaarheid" en "contactmogelijkheden". Wat blijft staan is wat er moet blijven
staan: "MJB Dakservice reageert binnen 24 uur op de aanvraag", "Niet elke vochtplek vereist
24-uursservice".

De resterende zinnen zijn wél echte, ongetagde uitspraken over het bedrijf. Dat is een derde vraag:
het schrijvende model tagt maar een deel van wat het beweert.

### R0c. Een ongetagde zin die de kaart wél draagt, blokkeerde toch (gerepareerd 3 september 2026)

**De derde vraag hierboven, nagemeten in plaats van vermoed.** Na R0 en R0b zijn de twaalf
benchmarkpagina's opnieuw gekeurd (`POST /api/analyses/[id]/recheck`, dus zonder herschrijven).
Uitkomst: 144 blokkerende bevindingen werden er 56, maar alle twaalf pagina's stonden nog steeds op
`block`. 54 van die 56 kwamen uit `bronherleidbaarheid`. Een steekproef liet twee dingen zien:

- **Zinnen die kloppen en waarvan het bewijs er is, blokkeerden alsnog.** "MJB Dakservice kan bij
  een daklekkage in Zutphen binnen 24 uur ter plaatse zijn" staat vrijwel letterlijk in
  `offline_proof` ("binnen 24 uur ter plaatse bij een lekkage"), maar het schrijvende model had die
  zin niet op zijn eigen lijstje met beweringen gezet. `detectedCoverage()` in `claim-extract.ts`
  keek alleen naar dat lijstje, dus gold de zin als onbewezen terwijl het feit gewoon op de kaart
  staat. Dezelfde denkfout die R1 (3 september) al één keer eerder repareerde voor de claim-audit,
  hier in een tweede, onafhankelijke controle.
- **Instructiezinnen aan de lezer werden voor een belofte aangezien.** "Maak foto's en video's van
  de mogelijke waterschade" en "Controleer of de hoofdkraan beschikbaar is" bevatten
  toezeggingswoorden ("mogelijke", "beschikbaar") maar zeggen niets over het bedrijf.

**De reparatie, allebei in `lib/pipeline/claim-extract.ts`:**

1. `zinIsOnderbouwdDoorKaart()`: een ongetagde zin telt nu ook als gedekt wanneer minstens 60% van de
   betekenisvolle woorden van een toegestaan, citeerbaar feit letterlijk in de zin terugkomen
   (dezelfde `claimMatchesSentence()` en dezelfde drempel als bij een getagde bewering, nu blind over
   de hele kaart). Een feit van minder dan drie betekenisvolle woorden telt niet mee, anders bewijst
   bijna elk kort feit bijna elke zin. Dit verzwakt de fabricageherkenning niet: een verzonnen
   bewering heeft per definitie geen feit dat hem draagt, dus blind zoeken vindt daar niets. Zie de
   uitgebreide toelichting in de code voor de volledige redenering.
2. `isInstructieAanLezer()`: een zin die begint met een kort, bewust behoudend lijstje
   veiligheids-/stappenwerkwoorden (maken, controleren, sluiten, …) telt niet meer als toezegging,
   tenzij hij ook de merknaam of een getal bevat. Woorden die een oproep tot actie met een
   onbewezen claim kunnen inleiden ("bel", "vraag", "boek") staan er bewust NIET op: "Bel voor een
   gratis inspectie" moet blijven blokkeren.

⚠️ **Dit lost niet elke instructiezin op.** "Dit kun je zelf doen terwijl je wacht" begint niet met
een werkwoord uit de lijst en glipt er nog doorheen. Dat onderscheid (advies aan de lezer versus een
belofte, ergens middenin de zin) vraagt begrip van de zin en niet van het eerste woord.

**Getest, nog niet herverifieerd tegen de echte benchmarkronde** (conventie 10). Vier nieuwe
testgroepen in `scripts/test-unit.ts`, inclusief de tegenproef dat een fabricage zonder
onderliggend feit blijft blokkeren en dat een verboden feit (`allowed: false`) nooit meetelt. Het
werkelijke effect op de twaalf benchmarkpagina's is pas bekend na een volgende herkeuring op
productie.

### De goedkope herkeuring (gebouwd 3 september 2026, migratie 0092)

`keurPagina()` draaide alleen binnen `content_draft` en `content_revise`. Een oordeel bijstellen
betekende dus de pagina opnieuw laten schrijven: ongeveer $1,00 per pagina tegen ongeveer $0,013
voor de vier beoordelaars. Bijna honderd keer zoveel voor iets wat de tekst niet eens verandert, en
de vergelijking gaat er ook nog door verloren, want de tekst is dan een andere.

`POST /api/analyses/[id]/recheck` zet nu per afgeronde pagina een `content_recheck`-taak klaar.
`herkeurContentPiece()` draait dezelfde `keurPagina()` over de opgeslagen tekst en schrijft alleen
de kwaliteitskolommen en `needs_review`. Niets aan de tekst, de versie of het rondenummer.

Drie regels die eromheen bewaakt worden:

- **Een herkeuring kan geen reparatieronde aftrappen.** Anders kan één goedkope knop een dure lus
  starten, en dat is precies het patroon waar de kostenremmen voor bestaan.
- **Hij overschrijft de geschiedenis niet.** Migratie 0092 geeft `content_quality_runs` een kolom
  `herkeuring`; de rij krijgt een eigen, opvolgend rondenummer. Zonder die regel zou de eerste
  herkeuring het bewijs uitwissen dat de pagina ooit tegengehouden werd, en dat bewijs is waar de
  ijking op rust.
- **De versiekeuze slaat herkeuringen over** (`leesKwaliteitsrondes`), want er is niets herschreven
  om tussen te kiezen.

Dit was ook los van R0 nodig: de klant kan zijn eigen tekst aanpassen, en dan bleef het oordeel
staan op de tekst van vóór die bewerking. Er stond "klaar voor publicatie" onder een tekst die
niemand beoordeeld had. Dat was de uitzondering die in R5 al genoteerd stond.

**Nog te doen.**

- De drie splitsers samenvoegen tot één, mét een test die bewijst dat de andere twee call sites
  dezelfde uitkomst houden.
- De herkeuring automatisch aftrappen zodra de klant zijn tekst bewerkt (`PATCH .../content/[pieceId]`).
  De stap bestaat nu, hij wordt alleen nog met de hand gestart.

### R5. Fase F: ijking, caching en incrementele evaluatie (punt 19 en 28)

Bewust uitgesteld en nog steeds terecht uitgesteld, met één uitzondering.

- **IJking.** De drempels rusten op zeven pagina's. Pas bij twintig menselijk beoordeelde pagina's
  (`IJKING_MINIMUM`) kan er iets bijgesteld worden. Dit is geen bouwwerk maar een meetronde, en het
  is de volgende stap voor de eigenaar, en er liggen er nu twaalf in `content_quality_reviews`
  onder `benchmark_set = 'benchmark-3-september-2026'`. ⚠️ Bijgesteld op 3 september,
  ná de beoordeling door een echte copywriter: de vakmanschapsbeoordelaar zit qua NIVEAU goed
  (0,05 tot 0,32 punt van het menselijke oordeel op specificiteit, toon en overtuiging), maar zijn
  RANGSCHIKKING van de twaalf pagina's correleert nauwelijks met de menselijke (+0,19). De ijking
  is dus niet meer nodig om de hoogte van de cijfers bij te stellen maar om hem te leren
  onderscheiden, en dat is wat de app nodig heeft: de score bepaalt per pagina klaar, repareren of
  geblokkeerd. Cijfers en gevolgen in `contentkwaliteit-copywriterronde.md`.
- **Incrementele evaluatie.** De opdracht vraagt: is alleen sectie 4 gewijzigd, evalueer dan niet de
  hele pagina opnieuw. Nagerekend loont dat weinig: de vier beoordelaars kosten samen ongeveer
  $0,013 per pagina tegenover $0,071 voor de schrijfaanroep en $0,139 per reparatieronde. Een
  beoordeling overslaan bespaart dus hooguit een cent en kost het overzicht over de hele pagina, en
  juist die samenhang is wat de citeerbaarheidsbeoordelaar meet.
- **Caching.** Zelfde rekensom, zelfde conclusie.
- **De uitzondering: automatische herbeoordeling na een bewerking door de klant.** Past de klant de
  tekst zelf aan (`PATCH .../content/[pieceId]`), dan blijft het kwaliteitsoordeel staan op de tekst
  van vóór die bewerking. Dat is misleidend: er staat "klaar voor publicatie" onder een tekst die
  daarna veranderd is. De tien deterministische controles kosten niets en kunnen daar gewoon
  opnieuw draaien; de vier beoordelaars niet, want die kosten geld bij elke toetsaanslag. Voorstel:
  na een bewerking alleen de gratis controles opnieuw, en het oordeel zichtbaar markeren als
  "opnieuw beoordeeld op je eigen tekst, zonder de inhoudelijke keuring".

### Wat er NIET op deze lijst staat, en waarom

- **Nieuwe contenttypes** (SERVICE_PAGE, LOCAL_LANDING_PAGE, CASE_STUDY, ABOUT_PAGE uit punt 2). De
  app kent er vier (`article`, `faq`, `landing`, `comparison`) en die komen uit de aanbeveling in
  fase 6. Een vijfde type toevoegen raakt de rapportstap, de aanbevelingslogica, het contentplan en
  de exportsjablonen, en levert pas iets op als het rapport dat type ook echt voorstelt. ⚠️ Eén
  ervan verdient wel aandacht: de pagina's van Gasservice Brabant (Tilburg, Oss, Eindhoven) zijn
  feitelijk LOKALE landingspagina's en worden nu als gewone `landing` beoordeeld. Een lokale pagina
  heeft een eigen eis die de andere niet hebben, namelijk dat de plaats en het werkgebied
  onderbouwd zijn. Dat is een profiel erbij zodra het rapport het type kan afgeven, niet eerder.
- **Kwaliteitsprofielen in de database in plaats van in code.** De opdracht verbiedt hardgecodeerde
  logica die VERSPREID staat; die is nu op één plek verzameld (`quality-profile.ts`) met de reden
  per getal erbij. Ze in de database zetten maakt ze aanpasbaar zonder deploy, en dat is precies wat
  je niet wilt zolang ze niet geijkt zijn: dan verandert iemand een drempel en is achteraf niet meer
  na te rekenen welk cijfer waarop rustte. Dit hoort ná de ijking, niet ervoor.
