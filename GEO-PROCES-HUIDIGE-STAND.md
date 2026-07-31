# GEO Tracker — Eind-tot-eind procesdocument (huidige stand, augustus 2026)

> **Doel van dit document.** Eén volledig, gedetailleerd overzicht van het proces zoals het
> **nu daadwerkelijk in de code op de `main`-branch staat** — vanaf het aanmaken van een
> account tot en met het genereren, publiceren en effect-meten van content.
>
> **Verhouding tot `GEO-EINDE-TOT-EINDE-PROCES.md`.** Dat document is bewust bevroren op de
> stand van vóór R1–R6.1: het dient als nulmeting waartegen latere rondes zijn afgezet, en
> wordt daarom niet bijgewerkt. Dit document is de opvolger: dezelfde reikwijdte en dezelfde
> regel (geen aanbevelingen, geen meningen, uitsluitend wat de code doet), maar geverifieerd
> tegen de code ná R1 t/m R6.1 (meetkant) en R5.1–R5.3 (contentkant, inclusief de bugfix van
> 31 juli in `lib/pipeline/content.ts`, commit `671722d`). Waar iets ONGEWIJZIGD is gebleven
> ten opzichte van het vorige document, staat dat expliciet vermeld in plaats van herhaald te
> worden zonder bronvermelding.
>
> **Peildatum:** 31 juli / 1 augustus 2026, branch `main`. Elke bewering hieronder is
> geverifieerd tegen de broncode; waar een bestand/regel relevant is, wordt die genoemd.

---

## Inhoudsopgave

1. [Actoren en rollen](#1-actoren-en-rollen) — ongewijzigd
2. [Architectuur — hosting en dataflow](#2-architectuur--hosting-en-dataflow) — ongewijzigd, met één nieuwe taaksoort
3. [Kernbegrippen en datamodel](#3-kernbegrippen-en-datamodel) — sterk uitgebreid
4. [AI-modellen, temperaturen en feature-flags](#4-ai-modellen-temperaturen-en-feature-flags) — ongewijzigd
5. [Statusmachines](#5-statusmachines) — nieuwe machine toegevoegd (`content_pieces.status`)
6. [Het eind-tot-eind proces, stap voor stap](#6-het-eind-tot-eind-proces-stap-voor-stap)
   - 6.0–6.8 — ongewijzigd (verwijzing naar het basisdocument)
   - 6.9 Bevestigen & meten — **herzien** (R2, R3, R6.1)
   - 6.10 Aggregatie — **herzien** (R2.2, R3.2, R4.2, R6.1)
   - 6.11 Rapport genereren — **herzien** (R1, R2.3, R4.3)
   - 6.12 Content genereren — **volledig herschreven** (R5.1–R5.3)
   - 6.13–6.17 — ongewijzigd
   - 6.18 Feitenvragen aan de klant — **volledig herschreven** (was profielbreed en simpel; is nu de contentbriefing)
7. [De achtergrond-jobwachtrij](#7-de-achtergrond-jobwachtrij) — bijgewerkt met nieuwe taaksoorten
8. [Volledig overzicht van alle AI-aanroepen](#8-volledig-overzicht-van-alle-ai-aanroepen) — bijgewerkt
9. [Rechten, schrijfstrategie en beveiliging](#9-rechten-schrijfstrategie-en-beveiliging) — ongewijzigd
10. [E-mail en notificaties](#10-e-mail-en-notificaties) — ongewijzigd
11. [Bijlage — bestandenoverzicht](#11-bijlage--bestandenoverzicht) — bijgewerkt

---

## 1. Actoren en rollen

Ongewijzigd ten opzichte van `GEO-EINDE-TOT-EINDE-PROCES.md` §1.

---

## 2. Architectuur — hosting en dataflow

Ongewijzigd qua hosting/dataflow-diagram. Eén toevoeging: de `jobs`-tabel kent sinds R5.1 een
extra taaksoort (`content_brief`, zie §7) tussen "klant kiest aanbevelingen" en "pagina wordt
geschreven", en `content_pieces` heeft nieuwe kolommen (§3).

---

## 3. Kernbegrippen en datamodel

De tabel uit het basisdocument (§3) blijft grotendeels geldig. Onderstaande kolommen/velden
zijn sindsdien toegevoegd of van betekenis veranderd; alleen wat gewijzigd is, staat hier.

### `prompts`
| Kolom | Toegevoegd door | Betekenis |
|---|---|---|
| `brand_eliciting` | R2.1 | `'ja'` / `'nee'` / `'onbekend'`. Afgeleid tijdens aggregatie: `'nee'` zodra een vraag in twee opeenvolgende periodes 0 aanbieders opleverde (welke aanbieder dan ook, inclusief het eigen merk); bij minder dan twee metingen `'onbekend'`. |

### `tracking_runs`
| Kolom | Toegevoegd door | Betekenis |
|---|---|---|
| `brands_in_answer` | R2.1 | Aantal genoemde aanbieders (`is_own_brand` ongeacht waarde, `mentioned = true`) in dít antwoord. Geen extra AI-aanroep — afgeleid uit de al opgeslagen `tracking_run_mentions`. |
| `repeat_index` | R6.1 | 0 voor de eerste meting van een vraag binnen een periode; loopt op bij herhaalde metingen van dezelfde vraag/periode. Bij een impactmeting (§6.15) altijd 0 — die heeft een eigen sleutel (pagina + golf). |

### `tracking_run_mentions`
| Kolom | Status | Betekenis |
|---|---|---|
| `sentiment` | Blijft bestaan (additief principe), **wordt niet meer gevuld of getoond** sinds R3.1 — leverde in 650 rijen geen enkele `negative` op en werd nergens in de UI gebruikt. |
| `mention_role` | Toegevoegd door R3.1, vervangt `sentiment` functioneel | `'eerste_aanbeveling'` / `'een_van_meerdere'` / `'zijdelings'`, of `null` als het merk niet genoemd wordt (in code afgedwongen: `mention_role: m.mentioned ? m.role : null`, ongeacht wat het model teruggeeft). |
| `position` | Ongewijzigde kolom, **gewijzigde betekenis/vulling** | Sinds R3.1 telt de prompt expliciet vanaf 1; `normalizePosition()` (`lib/pipeline/position.ts`) zet onbruikbare waarden (0, negatief, absurd groot) om naar `null` in plaats van ze te laten staan of te gokken. |

### `visibility_scores`
| Kolom | Toegevoegd door | Betekenis |
|---|---|---|
| `brandless_runs` | R2.2 | Aantal (gewogen per vraag sinds R6.1, zie hieronder) metingen zonder één genoemde aanbieder. |
| `winnable_runs` | R2.2 | Aantal metingen waarin überhaupt een aanbieder genoemd werd — de noemer van `score`/`weighted_score`/`share_of_voice`. |
| `avg_position` | R3.2 | Gemiddelde positie over de runs waarin het eigen merk genoemd wordt (na normalisatie). |
| `citation_count` | R3.2 | Aantal runs waarin het eigen domein voorkomt in `cited_sources` van een willekeurige mention (domeinvergelijking via `lib/offsite/domain.ts`). |
| `first_mention_count` | R3.2 | Aantal runs met `mention_role = 'eerste_aanbeveling'`. |
| `score_stderr` | Ongewijzigde kolom, herrekend | Sinds R6.1 gerekend over **vragen**, niet over metingen (zie R6.1 hieronder). |

**R6.1 — tellen per vraag, niet per meting.** Sinds migratie `0031` worden de zwaarste
`repeatedPromptCount` (standaard 8, env `REPEATED_PROMPT_COUNT`) vragen van een periode
`measureRepeats` keer (standaard 3, env `MEASURE_REPEATS`) gemeten in plaats van 1 keer. Elke
losse `visibility_scores`-teller (`score`, `weighted_score`, `winnable_runs`, `brandless_runs`,
`judged_runs`, `share_of_voice`, `avg_position`, `citation_count`, `first_mention_count`) en de
hele `competitor_breakdown` worden berekend met een gewicht van `1 / (aantal beoordeelde
metingen van díe vraag)` per meting (`lib/pipeline/question-share.ts`), zodat een drie keer
gemeten vraag niet drie keer zo zwaar meetelt. Zonder herhalingen (`measureRepeats = 1` of
`repeatedPromptCount = 0`) is elk aandeel 1 en is de uitkomst identiek aan vóór R6.1.

### `competitor_breakdown`
| Kolom | Toegevoegd door | Betekenis |
|---|---|---|
| `attributes_json` | R4.2 | Array van `{attribute, evidence}` — op welke vaste eigenschap (`COMPETITOR_ATTRIBUTES`: prijs, locatie, specialisme, assortiment, snelheid, beschikbaarheid, service, reputatie, ervaring, duurzaamheid) deze concurrent genoemd wordt, met een letterlijk citaat als bewijs. |
| `why_summary` | R4.2 | Leesbare samenvatting van dezelfde informatie. |

Alleen entiteiten met ≥2 vermeldingen óf in de top 8 krijgen een rij hier (R4.1); overige
concurrenten staan ingeklapt in de UI.

### `reports`
| Kolom | Toegevoegd door | Betekenis |
|---|---|---|
| `stripped_claims_json` | R1.3 | Audit-trail: welke zinnen de claimvalidator uit het rapport verwijderd heeft omdat ze een concurrentnaam noemden die niet in het bewijsdossier van díe vraag stond. Leeg bij een gezond rapport. |

### `entities`
Ongewijzigd (R0.5 — bedrijfsmodelclassificatie/productlijn-deduplicatie — staat nog open, niet
opgeleverd).

### `content_pieces`
Sterk uitgebreid sinds R5.1–R5.3. Volledige kolomlijst van de contentspecifieke velden:

| Kolom | Sinds | Betekenis |
|---|---|---|
| `status` | R5.1 (nieuwe waarde) | Krijgt de waarde `'briefing'` naast de bestaande `draft`/`ready`/`published` (zie §5.3 hieronder voor de volledige machine). |
| `brief_instruction` | R5.1 | De oorspronkelijke `why`/opdracht uit de aanbeveling, los van de titel (titels zijn soms een instructie i.p.v. een kop, bv. "Maak een overzichtspagina met…"). |
| `briefing_snapshot_json` | R5.1 | Bevat `{facts, recommendation, generatedAt}`: de feitenkaart en de volledige aanbeveling (incl. doelvragen) zoals die waren op het moment dat de claim-audit draaide. Bevroren vóórdat de klant de briefingvragen beantwoordt (zie §6.12 voor de precieze implicatie hiervan). |
| `claims_json` | R5.3 | Array van `{claim, factRef, quote}` — per concrete bewering over de klant in de geschreven tekst het F-nummer dat hem dekt, plus het letterlijke citaat. Alleen beweringen die het model zelf als zodanig heeft getagd staan hierin. |
| `source_coverage` | R5.3 | Percentage van `claims_json` waarvan `factRef`/`quote` daadwerkelijk klopt met een citeerbaar feit op de bevroren kaart (`sourceCoverage()`, `lib/pipeline/factcard.ts`). `null` als er geen enkele getagde claim is. |
| `quality_score` | vóór R5, hergebruikt | 0–100, uit de redactieronde (`CRITIQUE_SYSTEM`). |
| `geo_score` | vóór R5, hergebruikt | Percentage van 5 zelfbeoordeelde `geo_json`-booleans dat waar is. |
| `geo_json` | vóór R5, hergebruikt | `{usesConcreteFacts, answersFollowUpQuestions, namesTheBusinessExplicitly, answersTargetQuestionUpFront, hasStandaloneCitableSentences}` — vijf booleans, ingevuld door dezelfde AI-aanroep die ook `review_notes`/`issues` produceert. |
| `needs_review` | vóór R5, hergebruikt | `true` zodra `!followsRules`, `qualityScore < REVIEW_THRESHOLD`, `geo_score < GEO_THRESHOLD`, er `issues` zijn, of er een niet-herleidbare claim overblijft na de herschrijfronde. |
| `version` / `is_current` / `supersedes_id` | vóór R5, hergebruikt | Versiebeheer per (analyse, titel). Een verse briefing-rij (versie 1, status `briefing`) die voor het eerst geschreven wordt, krijgt in de huidige code een NIEUWE rij (versie 2) met de oorspronkelijke rij op `is_current = false` — zie §6.12 voor de precieze mechaniek. |

### `fact_requests`
Was in het basisdocument een simpele, profielbrede vragenlijst (§6.18 daar). Sinds R5.1 is dit
uitgebreid tot het datamodel van de contentbriefing:

| Kolom | Betekenis |
|---|---|
| `scope` | `'merk'` (geldt voor alle analyses van dit profiel, voor altijd), `'analyse'` (alleen deze analyse/dit onderwerp), of `'pagina'` (alleen dit ene `content_piece`). |
| `content_piece_ids` | Welke content_pieces beter worden van dit antwoord (array). |
| `kind` | Eén van `verificatie`, `aanvulling`, `onderscheid`, `bewijs`, `praktisch`, `grenzen`. |
| `answer_type` | Eén van `ja_nee`, `bedrag`, `getal`, `tekst_kort`, `tekst_lang`, `keuze`, `url`, `lijst` — bepaalt het invoerveld in het scherm. |
| `options` | Bij `answer_type = 'keuze'`. |
| `suggested_answer` | Voorstel van de claim-audit, gebaseerd op wat er in de feitenindex staat — een modelinschatting, geen geverifieerd feit. |
| `required` | `true` als de onderliggende claim `importance = 'kern'` had (zonder dit feit kan de pagina zijn doelvraag niet eerlijk beantwoorden). |
| `claim_key` | Ontdubbelsleutel (`claimKey()`, genormaliseerde claimtekst, korte functiewoorden en meervoud eruit). Unieke index op (analyse, claim_key) voor status `open`. |
| `fact_ref` | Niet actief gevuld in de huidige code (het F-nummer wordt toegekend bij het samenstellen van de feitenkaart, niet op de vraag zelf). |
| `verify_after` | Kolom bestaat; veroudering van feiten (contentbriefing.md §7) is in de huidige code niet actief geïmplementeerd. |
| `raw_json` | De volledige ruwe claim-audit-output waar deze vraag uit voortkwam. |
| `status` | `open` / `beantwoord` / `overgeslagen`. Precies deze drie — er is geen vierde "verlopen"-status actief in de schrijfroute, ondanks dat `loadKnownClaimKeys()` er wel naar verwijst in commentaar. |
| `answer` / `answered_at` | Alleen gezet bij `status = 'beantwoord'`; bij `overgeslagen` blijft `answer` `null`. |

---

## 4. AI-modellen, temperaturen en feature-flags

Ongewijzigd ten opzichte van het basisdocument §4. Twee toevoegingen aan de tabel met
temperatuurconstantes: de claim-audit (R5.1) en de content-critique (ongewijzigd, al bestond
vóór R5) draaien beide op `TEMPERATURES.deterministic` (0).

---

## 5. Statusmachines

### 5.1 `profiles.status` en 5.2 `analyses.status`
Ongewijzigd ten opzichte van het basisdocument.

### 5.3 `content_pieces.status` (nieuw sinds R5.1)

| Status | Hoe bereikt | Betekenis |
|---|---|---|
| `briefing` | `runBriefing()` maakt de rij aan zodra de klant een aanbeveling kiest (of `generate-all` gebruikt). | Feitenkaart en claim-audit zijn klaar; de pijplijn wacht op de klant (of op een `content_draft`-taak die alsnog zonder wachten wordt ingepland — beide paden bestaan, zie §6.12). |
| `draft` | `draftContentPiece()` na het schrijven, als de redactieronde `needsRevise = true` oplevert. | Tekst staat er, maar moet nog herschreven worden. |
| `ready` | `draftContentPiece()` (als de eerste versie meteen door de redactiepoort komt) of `reviseContentPiece()` na de herschrijfronde. | Klaar zoals de pijplijn hem oplevert. Er is geen aparte klant-goedkeuringsstap tussen `ready` en publiceren. |
| `published` | `markPublished()` nadat de klant een live-URL invult. | Zie §6.14 van het basisdocument (ongewijzigd). |

**Een niet vanzelfsprekend gedrag van deze machine:** een rij met status `briefing` die voor
het eerst geschreven wordt wisselt niet van status op dezelfde rij, maar krijgt een **nieuwe
rij** (versie + 1) met de oorspronkelijke rij op `is_current = false`. Dit volgt uit hoe
`draftContentPiece()` (`lib/pipeline/content.ts`) de "is dit een hervatting?"-vraag stelt: dat
geldt alleen voor een rij met status `draft`, niet voor `briefing`. Zie §6.12 voor de volledige
mechaniek.

---

## 6. Het eind-tot-eind proces, stap voor stap

### 6.0 t/m 6.8
Ongewijzigd ten opzichte van `GEO-EINDE-TOT-EINDE-PROCES.md` §6.0–6.8. Geen van de rondes
R1–R6.1 of R5.1–R5.3 raakt onboarding, profielonderzoek, de crawl, de technische audit, het
aanmaken van een analyse, het onderwerp-onderzoek, de promptgeneratie/volumekalibratie, of het
conceptscherm.

---

### 6.9 Bevestigen & meten (herzien: R2, R3, R6.1)

**Gebruiker.** Ongewijzigd: klik op "Bevestig en start meting", voortgangsindicator.

**Techniek — inplannen (`enqueueMeasurement`, `lib/jobs/queue.ts`).** Bij de nulmeting
(`week_no = 0`) worden alle actieve prompts gemeten. Bij een vervolgperiode (`week_no > 0`,
§6.17): prompts met `brand_eliciting = 'nee'` worden overgeslagen, **behalve** elke vierde
periode (`week_no % 4 === 0`), waarin toch alles gemeten wordt — zodat een markt die verandert
(er ontstaat alsnog een standaardpartij) niet permanent buiten beeld blijft. Vóór het plannen
van de meettaken zelf worden — voor de zwaarste `repeatedPromptCount` vragen (gesorteerd op
gewicht, bij gelijk gewicht op id, zodat elke periode dezelfde vragen herhaalt) —
`measureRepeats` taken gepland in plaats van 1, elk met een oplopende `repeatIndex` in de
taakpayload.

**Stap 3a — het AI-antwoord simuleren.** Ongewijzigd ten opzichte van het basisdocument (model,
`web_search`, temperatuur, input, kwaliteitscontrole ≥40 tekens). Elke opgeslagen
`tracking_runs`-rij bevat nu ook `repeat_index` (0 bij de eerste meting van deze vraag/periode).

**Stap 3b — het antwoord beoordelen.** Zelfde model/temperatuur/`web_search`-instelling als het
basisdocument, maar het `Mention`-schema is gewijzigd (§3 hierboven: `role` in plaats van
`sentiment`, met het deterministische vangnet `mention_role: m.mentioned ? m.role : null` —
zonder dit vangnet vulde het model bij twijfel de eerste enum-waarde in, ook voor niet-genoemde
merken). Na ontvangst wordt `position` genormaliseerd (`normalizePosition()`): onbruikbare
waarden worden `null`, nooit verschoven of gegokt. Direct na het wegschrijven van
`tracking_run_mentions` wordt `tracking_runs.brands_in_answer` gevuld (R2.1) — het aantal rijen
met `mentioned = true`, ongeacht welke entiteit.

**Idempotentie en herhalingen.** De `.maybeSingle()`-lookup die bepaalt of een meting al bestaat
filtert sinds R6.1 ook op `repeat_index`, zodat drie herhalingen van dezelfde vraag drie losse
rijen worden in plaats van elkaar te overschrijven.

**Ketening en drempel.** Ongewijzigd qua mechaniek (na de laatste openstaande meting van een
periode volgt `aggregate_week`; `measurementIsUsable()` telt — sinds R6.1 — alleen
`repeat_index = 0`-metingen mee in de 70%-drempel, zodat herhalingen niet meetellen als extra
dekking).

---

### 6.10 Aggregatie, entiteiten en concurrentclassificatie (herzien: R2.2, R3.2, R4.2, R6.1)

**Techniek.** Taak `aggregate_week` → `computeAggregates()` (`lib/pipeline/measure.ts`).
Entiteiten koppelen en classificeren: ongewijzigd ten opzichte van het basisdocument.

**Zichtbaarheidsscore, gewijzigd sinds R2.2.** `score`/`weighted_score`/`share_of_voice` worden
berekend over uitsluitend de metingen met `brands_in_answer > 0` (`winnable_runs`), niet over
alle beoordeelde metingen. `brandless_runs` (metingen zonder één genoemde aanbieder) wordt apart
opgeslagen. Sinds R6.1 tellen deze aandelen per **vraag** (zie R6.1 in §3): een vraag met 3
metingen weegt in de teller en de noemer even zwaar als een vraag met 1 meting.

**Zichtbaarheidsprofiel, toegevoegd door R3.2.** `avg_position`, `citation_count`,
`first_mention_count` worden berekend zoals in §3 beschreven, eveneens per-vraag gewogen sinds
R6.1.

**Concurrentprofilering, nieuwe stap sinds R4.2.** Ná de gewone aggregatie en vóór het rapport
loopt een aparte taak `profile_competitors` (zie §7): één AI-aanroep die, over de
antwoordfragmenten waarin de top-concurrenten (≥2 vermeldingen of top 8) genoemd worden, per
concurrent bepaalt op welke vaste eigenschap (`COMPETITOR_ATTRIBUTES`) hij genoemd wordt, met een
letterlijk citaat. Mislukt deze stap, dan blokkeert dat het rapport niet — de klant houdt zijn
rapport zonder deze verrijking.

**Score-onzekerheid, gewijzigd sinds R6.1.** `score_stderr` wordt berekend over het aantal
**vragen**, niet het aantal metingen: drie metingen van dezelfde vraag maken die ene vraag
betrouwbaarder, maar leveren geen extra vraag op voor de noemer van de onzekerheidsmarge.

---

### 6.11 Rapport genereren (herzien: R1, R2.3, R4.3)

**Gebruiker.** Ongewijzigd.

**Techniek — vóór de AI-aanroepen.** `computeMissedPrompts()` (ongewijzigd qua bestaan) sluit
sinds R2.3 vragen met `brands_in_answer = 0` uit van de "gemiste vragen"-lijst: waar niemand
genoemd wordt valt niets te winnen, dus dit wordt geen contentdoelvraag op prioriteit 1. Deze
vragen verschijnen wel apart als "open terrein" in de rapportinvoer.

**Nieuw sinds R1.1 — het bewijsdossier.** `buildEvidenceDossier()` (`lib/pipeline/evidence.ts`)
bouwt vóór de B1-aanroep, deterministisch (geen AI), per gemiste vraag een dossier: de
letterlijke aanbieders die in **dát specifieke antwoord** genoemd werden (naam, rol, positie,
geciteerde bronnen), of expliciet de zin dat er geen enkel bedrijf genoemd werd. Alleen
entiteiten met een relevante rol (`concurrent`, `vergelijker`, `brancheorganisatie`,
`eigen_product`) tellen mee als "genoemd bedrijf"; nog niet geclassificeerde namen blijven wel
staan (`RELEVANTE_ROLLEN`, `looksLikeBrandName()` als extra filter tegen generieke termen die
per ongeluk als entiteit geregistreerd staan). Dit dossier vervangt de oude, ongekoppelde
"gemiste vragen"-lijst als invoer voor B1/B2.

**B1 — concurrentie-gap-analyse.** Systeeminstructie uitgebreid met een **bewijsregel**: een
concurrent mag alleen bij naam genoemd worden in verband met een specifieke vraag als die naam
in het bewijsdossier van díe vraag staat; staat er "geen enkel bedrijf genoemd", dan is dat de
conclusie. De geaggregeerde `competitor_breakdown` (incl. `attributes_json`/`why_summary` sinds
R4.2/R4.3) gaat mee als apart gelabeld "marktbeeld over de hele meting", met de instructie dat
dit nooit gebruikt mag worden om te zeggen wie een specifieke vraag wint.

**B2 — rapport + aanbevelingen.** Zelfde uitbreiding met de bewijsregel. De zin "Noem in elk
probleem expliciet welke concurrent het betreft" (die het model dwong een naam te noemen, ook
als het dossier er geen gaf) is verwijderd uit de systeeminstructie.

**Nieuw sinds R1.3 — de claimvalidator.** Ná het ontvangen van de B2-output, vóór het opslaan:
`validateReportClaims()` (`lib/pipeline/validate-claims.ts`) doorzoekt elk `why`/`problem`-veld
op entiteitsnamen uit het profiel. Komt een naam voor die niet in de `brandsInAnswer` van de
gekoppelde doelvraag staat, dan wordt de **hele zin** waarin die naam staat verwijderd (zinsgrens
alleen bij een punt gevolgd door witruimte/tekst-einde, zodat domeinnamen als `Bol.com` en
getallen als `3.5` heel blijven) en gelogd in `reports.stripped_claims_json`. `looksLikeBrandName()`
(een naam heeft een hoofdletter of is een domein) voorkomt dat generieke termen die toevallig als
entiteit geregistreerd staan (bv. behandelvormen als "fysiotherapie") ten onrechte een correcte
zin laten verdwijnen.

**Na opslag.** Ongewijzigd: vraagcodes → echte ID's (`resolveTargets()`), `offsite_scan`
inplannen, status → `gereed`, evt. rapport-mail.

---

### 6.12 Content genereren — volledig herschreven (R5.1–R5.3)

Dit is de stap die het meest veranderd is sinds het basisdocument. Vóór R5 ging een klik op
"Genereer deze pagina" direct naar één schrijftaak met de destijds beschikbare context
(`proof_points`, `style_samples`, doelvragen, winnend concurrent-antwoord, bronanalyse). Sinds
R5.1 zit daar een verplichte tussenstap in: de **contentbriefing**.

**Stap A — de briefing inplannen.** De klant kiest één of meerdere aanbevelingen ("Genereer deze
pagina" per stuk, of "Genereer alles"). Dit gaat **altijd** eerst naar `planContentBriefing()`
(`lib/jobs/content-jobs.ts`), die één taak `content_brief` inplant voor de **hele gekozen batch**
tegelijk (niet per pagina — overlappende vragen tussen meerdere gekozen pagina's worden zo één
vraag in plaats van meerdere). Uitzondering: `regenerate: true` (een al afgeronde pagina opnieuw
laten schrijven) of `skipBriefing: true` (expliciet voor herschrijven van een bestaande pagina)
slaan de briefing over en gaan direct naar stap C.

**Stap B — `runBriefing()` (`lib/pipeline/briefing.ts`), de `content_brief`-taak:**

1. **Placeholder-rijen aanmaken** (`ensureBriefingPieces`): voor elke gekozen aanbeveling een
   `content_pieces`-rij met `status: 'briefing'`. Bestaat er al zo'n rij (of een `draft`) met
   deze titel, dan wordt die hergebruikt.
2. **De feitenindex opbouwen** (`buildFactBase()`, `lib/pipeline/factbase.ts`, geen AI-aanroep):
   in volgorde van betrouwbaarheid — (1) al eerder door de klant beantwoorde `fact_requests`
   (merkbreed of van deze analyse), (2) `profiles.proof_points` en tot 8 pagina's letterlijke
   sitetekst (400 tekens per pagina), (3) de samenvatting uit het onderwerp-onderzoek. Elk
   item krijgt een vlag `citable`: alleen atomaire, controleerbare uitspraken (proof points,
   klantantwoorden) zijn citeerbaar; losse sitetekst-blokken en de onderzoekssamenvatting
   krijgen geen F-nummer en staan onder "ACHTERGROND — GEEN BRON" (R5-verificatie van 31 juli,
   zie `contentbriefing.md`).
3. **De claim-audit** (één mini-aanroep voor de hele batch, `model: gpt-4.1-mini`, `web_search`
   uit, temperatuur 0): input is per gekozen pagina de doelvraag/doelvragen, het winnende
   AI-antwoord op die vraag (concurrentnamen verwijderd, tot 700 tekens, max. 2 doelvragen), en
   de volledige feitenkaart. Output: per bewering die de pagina nodig heeft, of hij gedekt is
   (met F-nummer + letterlijk citaat) of niet, plus — bij een gat — de vraag die dat gat dicht
   (`ClaimAudit`-schema, zie §3-achtige detail hierboven bij de schema-beschrijving).
4. **Dekking wordt in code herbeoordeeld, niet aangenomen van het model:**
   `isSupported(sourceRef, facts, supportQuote)` controleert of `sourceRef` een bestaand,
   citeerbaar feit is **en** of `supportQuote` daadwerkelijk in de tekst van dat feit voorkomt.
   Zegt het model zelf `supported: true` zonder dat dit standhoudt, dan telt de bewering
   alsnog als onbewezen (gelogd, niet zichtbaar voor de klant).
5. **Vaste slots per contenttype** (`slotQuestions()`, geen AI-aanroep): voor `landing` twee
   verplichte vragen (telefoonnummer/adres, contactknop-URL); voor `comparison` één verplichte
   vraag (een eerlijk nadeel); voor elk type een vraag naar een gekoppelde bestaande pagina.
   Deze slots gelden voor elk gekozen contenttype, ongeacht wat er in de feitenindex staat.
6. **Bundelen, ontdubbelen, prioriteren, afkappen** (`selectBriefingQuestions()`,
   `lib/pipeline/briefing-select.ts`, geen AI-aanroep): ontdubbelen op `claimKey()` (genormaliseerde
   claimtekst — spelling/meervoud genormaliseerd, zinsopbouw niet), filteren tegen al bekende
   `claim_key`'s (open, beantwoord of overgeslagen — verlopen feiten worden in commentaar wel
   genoemd als uitzondering, maar er is geen actieve "verlopen"-status in de huidige code),
   sorteren op impact (aantal geraakte pagina's × `kern`(2)/`ondersteunend`(1)), afkappen op
   **maximaal 8 vragen** (`MAX_QUESTIONS`). Wat niet past blijft ongesteld en kan bij een
   volgende batch terugkomen.
7. **Wegschrijven:** elke gekozen vraag als een `fact_requests`-rij (status `open`). Voor elke
   `content_pieces`-rij in deze batch wordt `briefing_snapshot_json` gevuld met `{facts,
   recommendation, generatedAt}` — de feitenkaart en de volledige aanbeveling (incl.
   doelvragen) **zoals ze op dit moment zijn**, vóór de klant iets beantwoord heeft.

Na deze taak stopt de pijplijn bewust (geen vervolgtaak wordt automatisch ingepland) totdat de
klant iets doet.

**Stap C — de klant beantwoordt (of niet).**
`POST /api/analyses/[id]/briefing` (`app/api/analyses/[id]/briefing/route.ts`) mag uitsluitend
`answer`, `status` en `answered_at` van een `fact_request` bijwerken, na een eigenaarschap-check
tegen het profiel. Drie uitkomsten per vraag: tekst ingevuld → `status: 'beantwoord'`, expliciet
overgeslagen → `status: 'overgeslagen'` (met `answer: null`), niets gedaan → blijft `open`. Bij
`action: 'write'` in dezelfde aanvraag: voor elke `content_pieces`-rij van deze analyse met
`status = 'briefing'` wordt `planContentDraft()` aangeroepen (zie stap D). Dit werkt ook als er
nog open (of overgeslagen) verplichte vragen zijn — er is geen blokkade, alleen een consequentie
verderop bij het schrijven.

**Stap D — `content_draft` inplannen** (`planContentDraft()`, `lib/jobs/content-jobs.ts`):
dedupe-sleutel bevat de titel, de te schrijven versie, én het aantal op dit moment
`beantwoord`e `fact_requests` van de hele analyse — zodat "schrijf met wat je hebt" en "schrijf
nadat ik nog twee vragen beantwoord heb" twee verschillende taken zijn.

**Stap E — `draftContentPiece()` (`lib/pipeline/content.ts`), de `content_draft`-taak:**

1. **Bestaat er al een versie?** `currentPiece()` haalt de huidige rij op. Is die er, heeft hij
   een status anders dan `'draft'` (en anders dan `regenerate`), dan levert de functie die rij
   terug **zonder te schrijven** — met één uitzondering die in de code expliciet is opgenomen:
   dit geldt óók voor status `'briefing'` sinds de reparatie van 31 juli (vóór die reparatie werd
   een `'briefing'`-rij hier als "al af" behandeld en nooit geschreven).
2. **Versienummer en rij-strategie.** Is de bestaande rij een `'draft'` (een eerder gestrande
   poging), dan wordt **in diezelfde rij** verder geschreven (`resumeId`, versie ongewijzigd). Is
   de bestaande rij een verse `'briefing'`-rij (geen eerdere schrijfpoging), dan berekent de code
   het volgende versienummer als "huidige versie + 1" en gebruikt geen `resumeId` — met als
   gevolg dat er een **nieuwe rij** (versie 2) wordt aangemaakt, en de oorspronkelijke
   briefing-rij (versie 1) op `is_current = false` gezet wordt, óók als er nooit eerder een
   geschreven versie heeft bestaan. `fact_requests.content_piece_ids` van vóór dit moment blijft
   naar de oorspronkelijke (nu niet-actuele) rij-id verwijzen.
3. **Context verzamelen** (`loadContentContext()`): profiel, onderwerp-onderzoek, concurrenten
   (te weren), de bestaande paginatekst bij `action = 'verbeteren'`, doelvragen + winnend
   concurrent-antwoord + bronanalyse (ongewijzigd t.o.v. het basisdocument), en:
   - **`unansweredRequired`**: de tekst van elke `fact_request` met `required = true` en status
     `open` of `overgeslagen` (over het hele profiel, niet alleen deze batch) — gaat als
     expliciete "hier NIETS over beweren"-lijst mee de schrijfprompt in.
   - **`answeredFacts`**: een lijst van elke `fact_request` met status `beantwoord`, opgebouwd uit
     de op dit moment actuele `fact_requests`-tabel. Deze variabele wordt berekend maar **niet
     doorgegeven** aan `buildContentInput()` of enige andere plek in de functie.
   - **De feitenkaart voor het schrijven** komt uit `factsFromSnapshot(pieceRow.briefing_snapshot_json)`
     — dus uit de kaart zoals die bij stap B is bevroren. Alleen als die kaart leeg is (geen
     `briefing_snapshot_json`, bijvoorbeeld bij een pagina van vóór R5.1 of `skipBriefing`), wordt
     in plaats daarvan `buildFactBase()` opnieuw aangeroepen — met de op dat moment actuele
     `fact_requests`, dus inclusief eventuele antwoorden. Bij een bestaande, gevulde snapshot (de
     normale route ná een briefing) gebeurt dit niet: de kaart van vóór de antwoorden blijft
     leidend, ongeacht wat de klant daarna beantwoord heeft.
4. **De draft-aanroep** (`model: gpt-4.1`, temperatuur 0,7, `web_search` alleen als vangnet bij
   minder dan `minProofPointsForConcreteContent` citeerbare feiten): systeeminstructie zoals in
   het basisdocument (8 regels: geen concurrentnamen, geen feiten buiten de kaart, stijl volgen,
   doelvraag in de eerste twee zinnen, bedrijf expliciet noemen, losstaand-citeerbare zinnen,
   vervolgvragen beantwoorden, geldige JSON-LD), aangevuld met de feitenkaart (met F-nummers) en
   de lijst `unansweredRequired` als expliciet verbod. Output: `ContentPiece`-schema, inclusief
   `claims[]` (per bewering het `factRef` + het letterlijke `quote`).
5. **Wegschrijven vóór de redactie:** `buildDraftRow()` berekent `source_coverage` via
   `sourceCoverage(draft.parsed.claims, facts)` — het percentage claims waarvan `isSupported()`
   met het opgegeven `quote` standhoudt tegen de gebruikte feitenkaart. `isSupported()` matcht
   `factRef` als exacte string tegen `fact.ref`; een claim met een samengesteld `factRef` (bv.
   `"F1, F2"`) matcht geen enkel feit met die exacte string en telt dus als onbewezen, ongeacht of
   de losse feiten F1 en F2 zelf wel citeerbaar zijn. De rij wordt weggeschreven vóórdat de
   redactieronde start (zodat een afgekapte taak het schrijfwerk niet verliest).
6. **De redactie/kritiek-aanroep** (`model: gpt-4.1-mini`, temperatuur 0): ongewijzigd
   systeem/schema ten opzichte van het basisdocument (`Critique`: `qualityScore`, `followsRules`,
   `geo` — 5 booleans, `issues[]`). `needsRevise` (→ status `draft`, anders `ready`) als
   `!followsRules`, of `qualityScore < REVIEW_THRESHOLD`, of `geo_score < GEO_THRESHOLD`, of er
   `issues` zijn.

**Stap F — herschrijven** (`content_revise`, alleen als `needsRevise`): ongewijzigd t.o.v. het
basisdocument qua mechaniek (zelfde systeem, vorige versie + verbeterpunten + evt.
`revisionNote`, model `gpt-4.1`, gevolgd door een herbeoordeling met `gpt-4.1-mini` die de
definitieve status bepaalt). De feitenkaart die hier gebruikt wordt is dezelfde
`briefing_snapshot_json`-gebaseerde kaart als in stap E — er vindt geen tussentijdse
herberekening van de feitenkaart plaats tussen schrijven en herschrijven.

**Doelvragen-koppeling** (`content_piece_targets`): ongewijzigd t.o.v. het basisdocument.

---

### 6.13 t/m 6.17
Ongewijzigd ten opzichte van `GEO-EINDE-TOT-EINDE-PROCES.md` §6.13–6.17.

---

### 6.18 Feitenvragen aan de klant — volledig herschreven

In het basisdocument was dit een simpele, profielbrede lijst (max. 6 vragen uit het rapport,
`factRequests`, direct als extra `proof_points` gebruikt bij het schrijven). Sinds R5.1–R5.2 is
dit de volledige contentbriefing, beschreven in detail in §6.12 hierboven. De belangrijkste
structurele verschillen ten opzichte van het basisdocument:

- Vragen ontstaan niet meer bij het rapport (B2), maar bij de claim-audit, ná de keuze van
  specifieke pagina's — dus gericht op wat die pagina's concreet nodig hebben.
- Vragen hebben een `scope` (merk/analyse/pagina), een `kind` (6 soorten), een `answer_type`
  (8 soorten, bepaalt het invoerveld), en een `required`-vlag.
- Antwoorden worden apart opgeslagen (`fact_requests.answer`/`status`) van de feitenkaart die het
  model daadwerkelijk gebruikt (`content_pieces.briefing_snapshot_json`) — zie §6.12 stap E voor
  de precieze relatie tussen die twee op het moment van schrijven.
- Er is een expliciet briefingscherm (`app/(app)/analyses/[id]/briefing/*`) in plaats van de
  vragen ergens los te tonen.

---

## 7. De achtergrond-jobwachtrij

Bron: `lib/jobs/types.ts`, `lib/jobs/queue.ts`, `lib/jobs/worker.ts`, `lib/jobs/handlers.ts`.

**Taaksoorten** (`JOB_TYPES`), bijgewerkt t.o.v. het basisdocument — nieuw sinds R4.2/R5.1
gemarkeerd:

`profile_research`, `prepare_analysis`, `generate_prompts`, `calibrate_volumes`,
`measure_prompt`, `aggregate_week`, **`profile_competitors`** (nieuw, R4.2), `generate_report`,
**`content_brief`** (nieuw, R5.1), `content_draft`, `content_revise`, `technical_audit`,
`verify_publication`, `measure_impact`, `compute_impact`, `offsite_scan`.

**Zware taken** (`HEAVY_JOB_TYPES`), bijgewerkt: `profile_research`, `prepare_analysis`,
`generate_prompts`, **`profile_competitors`**, **`content_brief`**, `content_draft`,
`content_revise`, `offsite_scan`.

**`measure_prompt`-taakpayload, uitgebreid sinds R6.1:** naast `promptId`/`weekNo` nu ook
`repeatIndex` (optioneel, standaard 0) en het bestaande `impact`-veld voor golfmetingen.

Overige mechaniek (ontwerpprincipe, ketening, dedupe, retries/backoff, tijdbudget, motor via
Supabase pg_cron elke minuut) is ongewijzigd ten opzichte van het basisdocument §7.

---

## 8. Volledig overzicht van alle AI-aanroepen

Bijgewerkte versie van de tabel uit het basisdocument §8. Rijen 1–6 (profielonderzoek t/m
mention-beoordeling) zijn ongewijzigd qua model/temperatuur/schema; de **inhoud** van rij 6
(`Mention`) is gewijzigd (`role` i.p.v. `sentiment`, zie §3).

| # | Halte | Trigger | Model | `web_search` | Temp. | Output-schema |
|---|---|---|---|---|---|---|
| 1 | Profielonderzoek | Profiel aangemaakt | `gpt-4.1-mini` | aan | 0,2 | `ProfileResearch` |
| 2 | Onderwerp-onderzoek | Analyse aangemaakt | `gpt-4.1-mini` | aan | 0,2 | `TopicResearch` |
| 3 | Promptgeneratie, ×3 parallel | Na onderwerp-onderzoek | `gpt-4.1-mini` | uit | 0,8 | `PromptSet` |
| 4 | Volumekalibratie | Na promptgeneratie | `gpt-4.1-mini` | uit | 0,2 | `VolumeCalibration` |
| 5 | Simulatie (3a) | Per prompt, elke meting | `gpt-4.1-mini` | aan | (geen) | vrije tekst |
| 6 | Mention-beoordeling (3b) | Direct na 5 | `gpt-4.1-nano` | uit | 0 | `Mention` (`role` i.p.v. `sentiment`) |
| 7 | Entiteitclassificatie | Tijdens aggregatie, nieuwe merken | `gpt-4.1-mini` | uit | 0 | `EntityClassification` |
| 8 | **Concurrentprofilering** *(nieuw, R4.2)* | Na aggregatie, vóór rapport | `gpt-4.1-mini` | uit | 0,2 | `CompetitorProfile`-array |
| 9 | Gap-analyse (B1) | Na concurrentprofilering | `gpt-4.1-mini` | uit | 0,2 | `GapAnalysis` (+ bewijsdossier, R1.1) |
| 10 | Rapport (B2) | Direct na B1 | `gpt-4.1-mini` | uit | 0,2 | `Report` |
| — | *(code, geen AI)* Claimvalidator | Direct na B2 | — | — | — | `stripped_claims_json` |
| 11 | **Claim-audit** *(nieuw, R5.1)* | Klant kiest aanbeveling(en) | `gpt-4.1-mini` | uit | 0 | `ClaimAudit` |
| 12 | Content-draft | Klant beantwoordt briefing / slaat over en klikt "Schrijf" | `gpt-4.1` | uit (tenzij vangnet) | 0,7 | `ContentPiece` (+ `claims[]`, R5.3) |
| 13 | Content-kritiek | Direct na 12 | `gpt-4.1-mini` | uit | 0 | `Critique` |
| 14 | Content-herschrijven | Alleen als `needsRevise` | `gpt-4.1` | uit (tenzij vangnet) | 0,7 | `ContentPiece` |
| 15 | Content-herbeoordeling | Direct na 14 | `gpt-4.1-mini` | uit | 0 | `Critique` |
| 16 | Bronanalyse | Vóór elke content-draft (indien aan) | `gpt-4.1-mini` (aangenomen) | n.v.t. | — | — |
| 17 | Off-site aanwezigheidscheck | Na elk rapport | `gpt-4.1-mini` (aangenomen) | aan | — | — |

Elke aanroep wordt gelogd in `ai_calls`, ongewijzigd t.o.v. het basisdocument.

---

## 9. Rechten, schrijfstrategie en beveiliging

Ongewijzigd ten opzichte van het basisdocument §9. De briefing-route
(`POST /api/analyses/[id]/briefing`) volgt exact hetzelfde patroon (service-role + expliciete
eigenaarschapscontrole tegen `analysis.profile_id`), met als extra beperking dat hij uitsluitend
`answer`/`status`/`answered_at` van een `fact_request` mag zetten — nooit `question`, `required`,
`claim_key` of `fact_ref`.

---

## 10. E-mail en notificaties

Ongewijzigd ten opzichte van het basisdocument §10.

---

## 11. Bijlage — bestandenoverzicht

Aanvulling op het basisdocument §11 met de bestanden die sinds R1–R6.1 en R5.1–R5.3 zijn
toegevoegd:

```
lib/pipeline/
  evidence.ts, evidence-format.ts     R1.1 — het bewijsdossier (query + pure opmaak)
  validate-claims.ts                  R1.3 — de claimvalidator
  position.ts                         R3.1 — positienormalisatie
  question-share.ts                   R6.1 — per-vraag-gewicht i.p.v. per-meting
  competitor-intel.ts                 R4.2 — concurrentprofilering
  briefing.ts, briefing-select.ts     R5.1 — de contentbriefing (claim-audit, vragenselectie)
  factbase.ts, factcard.ts            R5.1/R5.3 — feitenindex opbouwen, feitenkaart-opmaak,
                                       claimKey(), isSupported(), sourceCoverage()
lib/schemas/
  claim-audit.ts                      R5.1 — ClaimAudit/AuditedClaim
  competitor-profile.ts               R4.2 — CompetitorProfile
lib/jobs/
  content-jobs.ts                     R5.1 — planContentBriefing/planContentDraft, één plek voor
                                       alle vier ingangen die contentwerk starten
app/api/analyses/[id]/
  briefing/route.ts                   R5.2 — antwoorden opslaan + schrijven starten
scripts/
  eval-mention.ts                     R3.1 — accuratesse mention-classificatie (nano vs. mini),
                                       gebruikt dezelfde buildMentionUser() als productie
```

Overige bestanden ongewijzigd ten opzichte van het basisdocument.
