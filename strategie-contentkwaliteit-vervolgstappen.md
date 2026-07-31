# Strategie — structurele ingrepen voor contentkwaliteit

> **Wat dit document is.** De 10 punten van R8 (`implementatieplan.md` §R8) gaan allemaal door;
> ze worden hier niet herhaald en niet opnieuw geprioriteerd. Dit document gaat over de laag
> daarboven: **welke schakels van de contentketen fundamenteel anders moeten** om de kwaliteit
> significant te verhogen. Zeven voorstellen, elk met bewijs uit de code en uit productie.
>
> **Beoordeeld vanuit vier invalshoeken**, expliciet en apart: AI/GEO-expert, ervaren
> copywriter, senior softwareontwikkelaar, betalende klant. Waar die botsen staat dat erbij —
> in §3 staan de drie botsingen die er echt toe doen.
>
> **Harde randvoorwaarde.** Geen enkel voorstel verhoogt het aantal getrackte prompts per
> analyse boven de 30 (`lib/config.ts`, `promptsPerFunnelStage = 10` × 3 funnelfasen). Waar een
> voorstel meetdata gebruikt, hergebruikt het metingen die er al zijn.
>
> **Verificatie.** Elke bewering hieronder is nagetrokken tegen de code op `main`
> (`lib/pipeline/content.ts`, `briefing.ts`, `factbase.ts`, `factcard.ts`, `briefing-select.ts`,
> `lib/jobs/*`, `lib/schemas/*`) én tegen de productiedatabase (`kosauqzjbpweluiqgmwv`, alleen
> gelezen). Waar documentatie en code uit elkaar liepen, is de code leidend — dat verschil heeft
> in dit traject al vijf bugs opgeleverd, en hieronder komen er nog twee bij.
>
> **Peildatum:** 31 juli 2026. Baseline bij het schrijven: `npx tsc --noEmit` schoon, 250/250 tests
> groen.
>
> ---
>
> **STAND VAN ZAKEN — S1, S2, S3 en S4 zijn later op 31 juli gebouwd**, bovenop het R8-werk uit
> commit `f85ff5f` en daarmee geïntegreerd. Geen migratie nodig; tests van 298 naar 342. Waar R8 en
> een S-stap elkaar raakten is de R8-implementatie leidend gebleven — die stond al op productie —
> en is de S-stap erbovenop gelegd: R8.1 repareert de bedrading klant → schrijver, S2 bepaalt wat
> er dan doorheen gaat; R8.7 haalt de zelfrapportage uit de GEO-score, S3 haalt hem uit de
> dekkingsnoemer.
>
> Per voorstel staat hieronder wat er af is. De uitwerking per bestand staat in
> `status-doorontwikkeling.md` §5, de vinkjes in `implementatieplan.md` §2.
>
> **Nog open:** S5 (merkdossier bij onboarding), S7 (ketentest — vraagt een lokale Postgres) en het
> resterende deel van S6: de migratie voor een status `te_beoordelen` plus het scherm waarop de
> klant ziet wat hij vrijgeeft. De deterministische poort zelf bestaat sinds R8
> (`lib/pipeline/content-gate.ts`).

---

## 0. De vorige versie van dit document: wat standhoudt, wat niet

De eerste versie (commit `a2efa46`, zes voorstellen) had de goede reflex — kijken naar de
schakel in plaats van naar de bug — maar bleef op drie punten bij het vermoeden steken en had op
twee punten de code niet nagetrokken.

| Voorstel oude versie | Oordeel | Waarom |
|---|---|---|
| **1. Feitenkaart als levende bron** | **Grotendeels juist, diagnose incompleet** | De richting klopt, maar de bewering "`briefing_snapshot_json` is de invoer, laat het een auditspoor worden" mist wat de code werkelijk doet: `buildDraftRow()` (`content.ts:725`) **overschrijft** de snapshot bij elke schrijfronde met `{facts, writtenAt}`. Het is dus al géén zuiver auditspoor — het is een kaart die zichzelf van versie naar versie doorgeeft. Zie S2. |
| **2. Contentarchetypes per intentie + stijl afdwingen** | **Deels verworpen** | De diagnose ("één `CONTENT_SYSTEM` legt elk type dezelfde structuur op") is feitelijk onjuist: `TYPE_GUIDANCE` en `TARGET_WORDS` zijn al per type gedifferentieerd (`content.ts:75-184`). De échte oorzaak van de eenvormigheid is aantoonbaar iets anders — zie §1: elke pagina wordt gebouwd op dezelfde 4 à 5 merkbrede feiten. Stijl afdwingen op lexicale overlap met `style_samples` is bovendien een slecht vangnet: het beloont het letterlijk overnemen van zinnen van de eigen site. |
| **3. Productfeed voor retailers** | **Verworpen als premisse, opgenomen als gevolg** | De aanname "er is geen productdata" klopt niet. Coolblue heeft **10 gecrawlde wasmachine-adviespagina's** in `profile_pages` (15.000 tekens, inclusief *"wasmachine kopen waar op letten"*), en er is er **geen enkele** van in de feitenkaart terechtgekomen. Dit is geen ontbrekende databron maar een selectiefout. Zie S1. |
| **4. Publicatiepoort** | **Overgenomen en aangescherpt** | Klopt, en het bewijs is harder dan de oude versie wist: `reviseContentPiece()` zet de status **onvoorwaardelijk** op `ready` (`content.ts:1066`), ook bij `needs_review = true`. Zie S6. |
| **5. Ketentest op echte handlers** | **Overgenomen, vorm gecorrigeerd** | Terecht, maar de oude versie ging voorbij aan het bezwaar dat in `scripts/test-unit.ts` zelf staat: *"een test met een nagebootste database toetst vooral of je nabootsing klopt"*. Zie S7 voor de vorm die dat bezwaar overleeft. |
| **6. Meting hergebruiken als contentfeedback** | **Overgenomen, gedegradeerd** | Inhoudelijk in orde en goedkoop, maar er is nog geen enkele gepubliceerde pagina. Het is een voorstel zonder proefkonijn. Staat als S7b in §4 onder "later". |

Wat de oude versie **helemaal miste** — en wat in de data het zwaarst weegt — zijn de drie
plafonds uit §1: een topic-blinde feitenkaart, een weggegooid paginaplan, en een dekkingscijfer
met een noemer die het model zelf kiest.

---

## 1. De diagnose in cijfers — waar het plafond werkelijk ligt

De contentronde concludeerde dat de begrenzende schakel de overdracht klant → schrijver is
(`kwaliteitsanalyse-contentronde.md` §3). Dat klopt voor de *correcties* van de klant, en R8.1
repareert het. Maar het verklaart niet waarom pagina's die géén correctie nodig hadden — Bol,
HEMA, Coolblue — óók nietszeggend werden. Daarvoor is er een tweede, hoger plafond.

### 1.1 De feitenkaart is merkbreed en onderwerp-blind

`buildFactBase()` (`factbase.ts:52`) bouwt de kaart uit drie bronnen. Wat daarvan **citeerbaar**
is — het enige waar een bewering op mag staan — is in de praktijk uitsluitend
`profiles.proof_points`. Alle vijf de testprofielen hebben er precies 5 (Van der Valk 4).

Wat de schrijver daadwerkelijk aan citeerbare feiten kreeg, letterlijk uit
`briefing_snapshot_json`:

| Analyse | Citeerbare feiten (F1…F5) |
|---|---|
| **Bol** — "de beste laptop voor studenten" | 63 miljoen artikelen · 43.300 verkooppartners · 26 mln gebruikers/mnd · 16.709 afhaalpunten · 14 mln klanten |
| **Coolblue** — "wasmachine kopen" | gratis wassen 12–15u · €250 cashback groene stroom · AirPods Pro 3 scoort 9,0 · Beste webwinkel 2022 · 22 winkels |
| **Van der Valk** — "vergaderlocatie boeken" | 150 jaar sinds 1862 · 100+ hotels · familiebedrijf · beste prijsgarantie |
| **HEMA** — "verjaardagscadeau <€20" | klantenpas · sales tot 70% · breed assortiment · winkels met voorraadcontrole · voorbeeldproducten |
| **Fysi-Unique** — "hardloopblessure behandelen" | 9,4 op Zorgkaart · 4 × een therapeutenbio |

**Van de 24 citeerbare feiten over vijf analyses gaat er geen enkele over het onderwerp van de
analyse.** Geen laptop, geen wasmachine, geen vergaderzaal, geen hardloopblessure. Dat is geen
toeval en geen modelfout: `proof_points` wordt één keer bij het profielonderzoek gevuld en is per
definitie merkbreed. De feitenkaart die R5 als *gesloten grens* invoerde, is dus tegelijk een
**gesloten plafond**: een pagina van 500 woorden over hardloopblessures moet gebouwd worden uit
vier therapeutenbio's en een Zorgkaart-cijfer.

Zo ontstaat de zin die de contentronde als het duidelijkste voorbeeld noemde: *"Bol heeft met 63
miljoen artikelen een zeer groot assortiment laptops."* Dat is F1, correct geciteerd, en volstrekt
kansloos tegen het antwoord dat de AI nú geeft (*"Surface Pro met Type Cover en Surface Pen is
ideaal voor handgeschreven aantekeningen"*, run `6605dfcd-…`).

### 1.2 Het materiaal om dat plafond te doorbreken ligt er al — ongebruikt

`profile_pages` bevat per klant 30 tot 40 gecrawlde pagina's van **1.500 tekens elk**. De
feitenkaart gebruikt daar `MAX_SITE_PAGES = 8` × `PAGE_EXCERPT_CHARS = 400` van, dus **3.200 van
de 60.000 tekens (5%)** — en markeert die 5% vervolgens als `citable: false`, dus als
ACHTERGROND zonder F-nummer.

Erger is *welke* 8. De query in `factbase.ts:60-64` heeft **geen `order by` en geen
relevantiefilter**; het zijn de eerste acht rijen die Postgres teruggeeft. In productie:

| Analyse | De 8 pagina's die de kaart haalden | Wat er gecrawld is maar níét meeging |
|---|---|---|
| Coolblue / "wasmachine kopen" | homepage, `/ons-assortiment`, `/klantenservice`, `/winkels` — **plus dezelfde vier in het Engels** (`/en/…`) | **10 wasmachine-adviespagina's**, o.a. `wasmachine-kopen-waar-op-letten`, `wasmachine-voor-jouw-gezinssamenstelling`, `wat-is-een-goedkope-wasmachine`, `wasmachine-bekijken-in-de-coolblue-winkel` |
| Fysi-Unique / "hardloopblessure" | homepage, heupklachten, knieklachten, hoofdpijn, medische fitness, zwangerschapsbegeleiding, revalidatie, tarieven | `fysiotherapie-bij-hardloopklachten-in-amersfoort` — **exact de pagina die bij het onderzoek als bron voor de antwoorden diende** |
| Van der Valk / "vergaderlocatie" | (idem patroon) | `valk.com/corporate` (864 tekens) + de Duitse en Engelse variant |

De consequentie is scherp aan te wijzen. De Coolblue-pagina die zijn eigen doelvraag ontweek
(*"kan ik online bestellen en afhalen?"*) had het antwoord in onze eigen database staan, op
`wasmachine-bekijken-in-de-coolblue-winkel.html`:

> *"Je vindt onze wasmachines in de winkels in Almere, Amsterdam, Arnhem, Den Bosch, Den Haag,
> Groningen, Leiden, Nijmegen, Rotterdam Alexandrium en Tilburg. … Bestel samen met een
> medewerker en kies een gunstig bezorgmoment."*

Tien steden met naam, en het feitelijke antwoord op de doelvraag (je bestelt mét een medewerker
en kiest een bezorgmoment — je haalt niet af). Wat de pagina in plaats daarvan schreef:
*"controleer de actuele mogelijkheden op coolblue.nl"*, met een `needs_review` van de eigen
redactie erbij. **Dit is geen productfeed-probleem. Het is een selectie- en
verwerkingsprobleem in `buildFactBase()`.**

### 1.3 Het paginaplan wordt gemaakt en weggegooid

De claim-audit produceert per batch een skelet van beweringen die de pagina's nodig hebben
(`ClaimAudit`, `briefing.ts:289`). Uit de opgeslagen ruwe responses:

| Analyse | Beweringen in de audit | Waarvan door het model onderbouwd geacht | Wat er met die onderbouwde beweringen gebeurt |
|---|---|---|---|
| Bol | 8 | 3 | — |
| Coolblue | 4 | 2 | — |
| Fysi-Unique | 8 | 6 | — |
| HEMA | 6 | 5 | — |
| Van der Valk | 5 | 3 | — |
| **totaal** | **31** | **19** | **weggegooid** |

`runBriefing()` gebruikt uitsluitend de **ongedekte** claims (om er vragen van te maken). De 19
gedekte claims — met hun F-nummer, hun `neededFor` (welke doelvraag ze beantwoorden) en hun
`importance` — worden nergens bewaard behalve als bijvangst in `raw_json` van een `fact_request`.
De schrijver krijgt ze nooit te zien.

Dat is de duurste weggegooide structuur in de keten: we laten een model eerst uitrekenen *wat de
pagina moet beweren en waarom*, en geven het resultaat vervolgens niet door aan het model dat de
pagina schrijft. De schrijver begint elke keer opnieuw bij nul, met alleen de feitenkaart en de
doelvragen.

### 1.4 Twee van de zes vraagsoorten zijn nooit één keer gesteld

Over zes profielen staan er 62 `fact_requests` in productie:

| `kind` | Aantal | Beantwoord | Verplicht |
|---|---|---|---|
| `aanvulling` | 35 | 7 (20%) | 0 |
| `praktisch` | 13 | 8 | 9 |
| `verificatie` | 12 | 5 | 12 |
| `bewijs` | 2 | 1 | 0 |
| **`onderscheid`** | **0** | — | — |
| **`grenzen`** | **0** | — | — |

`contentbriefing.md` §5 noemt `onderscheid` *"de meest waardevolle en de meest verwaarloosde …
de enige informatie die principieel niet uit een crawl of web_search te halen is"* en `grenzen`
*"de rem"*. Beide bestaan uitsluitend als enumwaarde. Er is geen mechanisme dat ze produceert:

- `onderscheid` kan structureel niet uit de claim-audit komen. Die audit vraagt *"welke bewering
  heeft deze pagina nodig, en dekt de kaart hem?"*. "Wat kun jij wat de concurrent niet kan" is
  geen dekkingsgat maar een positioneringsvraag — een andere vraagvorm, die het schema niet kent.
- `grenzen` bestaat alleen als vast slot voor `comparison` en `faq` (`briefing-select.ts:77-102`).
  In geen van de vijf testcases koos het rapport zo'n type, dus het slot vuurde nooit.

En het weinige positioneringsmateriaal dat we wél hebben, gooien we onderweg weg.
`competitor_breakdown.attributes_json` bevat per concurrent letterlijke bewijszinnen —
*"Zitting manuele therapie: €60,00 per sessie"*, *"Gevestigd in Movement Gym Amersfoort"*,
*"biedt fysiotherapie aan zonder dat een verwijsbrief nodig is"*. In `loadContentContext()`
(`content.ts:517-531`) wordt daar een `Map` van gebouwd mét de bewijszinnen als waarde, waarna
alleen `.keys()` de prompt in gaat. De schrijver krijgt dus letterlijk dit als "de lat":

```
- locatie
- service
- specialisme
- prijs
- snelheid
```

Vijf abstracte zelfstandige naamwoorden, terwijl de concrete zinnen eronder in de database staan.

### 1.5 De dekkingsmeting meet een noemer die het model zelf kiest

`source_coverage` is het percentage van `claims_json` dat standhoudt tegen de kaart. Maar
`claims_json` wordt door het schrijvende model zelf samengesteld: het bepaalt welke zinnen als
"bewering" tellen.

| | 10 pagina's, opgeteld |
|---|---|
| Woorden | 4.470 |
| Zinnen (ruwe telling op `.!?`) | ~250 |
| Getagde beweringen (`claims_json`) | **49** |
| Woorden per getagde bewering | 56 tot **283** (Fysi-Unique preventieve begeleiding: 2 claims op 566 woorden) |

**Ongeveer één op de vijf zinnen wordt gemeten.** De andere vier vijfde zijn onzichtbaar voor
elke controle die dit systeem heeft. Dat is precies waar de twee ergste vondsten van de
contentronde in verdwenen: de Van der Valk-zin *"Op valk.com zoekt en vergelijkt u snel alle
opties… reserveer direct online"* (aantoonbaar onjuist, niet getagd, dus `source_coverage` = 100
op die versie) en de Fysi-Unique-openingszin die het bevestigde "nee" tegensprak (niet getagd).

Een cijfer waarvan de gemeten partij de noemer kiest, is geen meting. Dit is dezelfde fout als
`geo_score` — die staat op **100 voor alle 20 pagina's in de database**, inclusief de
Coolblue-pagina waarvan `geo_json.answersTargetQuestionUpFront = true` staat naast een
`review_note` **uit dezelfde AI-aanroep** die zegt: *"Het directe antwoord op de hoofdvraag is
niet expliciet en concreet genoeg in de eerste twee zinnen."*

### 1.6 De redactiepoort is geen poort maar een tweede schrijfronde

Uit `ai_calls` van 31 juli: `content_draft` 10×, `content_revise` **10×**. Alle tien pagina's
faalden de eerste poort — logisch, want `needsRevise` is waar zodra `issues.length > 0`, en de
`CRITIQUE_SYSTEM` levert bijna altijd iets op. En `reviseContentPiece()` zet daarna
onvoorwaardelijk `status: "ready"`, ook als de tweede beoordeling `needs_review = true`
oplevert (Coolblue: `quality_score` 75, drempel 80, status `ready`).

De feitelijke architectuur is dus: schrijven → beoordelen → herschrijven → beoordelen → **oordeel
opslaan en negeren**. Kosten van die ronde, gemeten: $0,480 voor 10 pagina's = **$0,048 per
pagina**, waarvan $0,0235 de verplichte herschrijfronde.

### 1.7 Twee nieuwe codebevindingen, gevonden bij het narekenen

Beide zijn klein in regels en groot in gevolg; ze horen in R8 thuis maar staan hier omdat ze de
onderbouwing van S2 en S6 zijn.

1. **De dedupe-sleutel telt merkbrede antwoorden niet mee.** `planContentDraft()`
   (`content-jobs.ts:104-108`) telt beantwoorde vragen met `.eq("analysis_id", analysisId)`. Maar
   vragen met `scope = 'merk'` worden bewust met `analysis_id = null` opgeslagen
   (`briefing.ts:374`). In productie is **9 van de 21 beantwoorde vragen (43%) merkbreed** —
   inclusief beide verplichte `landing`-slots (telefoon/adres en contact-URL). Een klant die
   alleen merkbrede vragen beantwoordt en nogmaals op "Schrijf mijn pagina's" klikt, krijgt een
   taak die stil op de dedupe-sleutel sneuvelt. Precies het scenario dat de sleutel moest
   voorkomen.
2. **De bevroren kaart plant zichzelf voort over versies.** `buildDraftRow()` schrijft
   `briefing_snapshot_json = {facts, writtenAt}` weg op de nieuwe rij. Bij een volgende
   `regenerate` leest `loadContentContext()` diezelfde rij, vindt een niet-lege snapshot, en
   gebruikt hem opnieuw — `buildFactBase()` wordt nooit meer aangeroepen. De verouderde kaart is
   dus niet één keer verkeerd, hij is **permanent**. R8.1 zoals beschreven (antwoorden erbovenop
   mergen) dempt dit maar heft het niet op.

---

## 2. De zeven voorstellen

Volgorde hieronder is thematisch (van bron naar poort), niet naar prioriteit. De aanbevolen
werkvolgorde staat in §4.

---

### S1 — De feitenkaart wordt onderwerpgericht en atomair  ✅ gebouwd

**Wat het is.** `buildFactBase()` verandert van "verzamel wat we over het merk weten" naar
"verzamel wat we over **dit onderwerp bij dit merk** weten". Drie ingrepen, waarvan twee
deterministisch:

1. **Relevantieselectie in code (geen AI).** Nieuwe pure module `lib/pipeline/page-relevance.ts`:
   scoor elke `profile_pages`-rij op overlap met de onderwerptermen (de analyse-`topic`, de teksten
   van de doelvragen uit `content_piece_targets`/`recommendation.targets`, en de
   `topic_research.competitors`-vrije kernwoorden). Simpele termfrequentie met stopwoordfilter is
   genoeg; embeddings zijn hier overbodig. Neem de best scorende 10 pagina's in plaats van de
   eerste 8. **Vangnet in code:** taalvarianten ontdubbelen op pad (`/en/…`, `/de/…` naast het
   Nederlandse pad → één rij), want de helft van de Coolblue-selectie ging daaraan op.
2. **Atomiseren met één mini-aanroep per briefingbatch.** De geselecteerde pagina's gaan naar een
   nieuwe aanroep (`gpt-4.1-mini`, temperatuur 0, geen `web_search`) die er **letterlijke,
   atomaire uitspraken** uit haalt: één bewering per regel, elk met de **exacte zin uit de
   brontekst** en de URL. Die letterlijke zin ís de `text` van het `FactItem` — waardoor de
   bestaande citaatplicht (`isSupported()`, `factcard.ts:257-259`) er zonder wijziging op werkt:
   de schrijver moet een fragment aanwijzen dat écht in dat feit staat.
3. **Zulke feiten worden `citable: true`.** Niet omdat we soepeler worden, maar omdat de reden
   waarom sitetekst niet citeerbaar was (een blok van 400 tekens dekt alles en dus niets,
   R5-verificatie 31 juli) vervalt zodra het blok is opgeknipt tot losse, natrekbare zinnen. De
   blokken zelf blijven ACHTERGROND.

**Vangnet in code, conform §2 van de werkafspraken.** De atomiseerstap is een promptinstructie —
dus komt er een deterministische controle achteraan: elk teruggegeven feit moet zijn eigen
brontekst als substring hebben (na normalisatie zoals `normalizeForQuote()`). Voldoet het niet,
dan valt het feit weg. **Onbekend is beter dan verkeerd:** liever een kortere kaart dan een feit
dat niet letterlijk op de site staat.

**Het bewijs.** §1.1 en §1.2. Coolblue: 10 relevante pagina's gecrawld, 0 in de kaart, 4 Engelse
duplicaten wél. Fysi-Unique: de hardloopklachtenpagina is gecrawld en niet geselecteerd.

**Waarom dit groter is dan een R8-punt.** R8.1 t/m R8.10 verbeteren allemaal wat er met de
feitenkaart *gebeurt*. Geen van tien verandert wat er **op** staat. Dit voorstel is de enige
ingreep die het plafond van 4 à 5 merkbrede feiten opheft, en het is de reden dat R8.9
(productfeed, 3-5 dagen onderzoek) grotendeels overbodig wordt: voor Coolblue, Van der Valk en
Fysi-Unique staat het benodigde materiaal al in `profile_pages`. Alleen voor Bol (1 gecrawlde
pagina, 0 bruikbare tekst) blijft de vraag van R8.9 open — en dat is dan een gerichte vraag over
één klanttype in plaats van een open onderzoek.

**Invalshoeken.**
- *GEO-expert:* overtuigend. De AI citeert in onze eigen meetdata overweldigend de **eigen sites
  van concurrenten** (fysioatelieramersfoort.nl 14×, hetcentrumvondelplein.nl 12× tegen
  fysi-unique.nl 5×). Wat geciteerd wordt zijn concrete, onderwerpspecifieke pagina's — precies
  het materiaal dat wij van de klant weggooien.
- *Copywriter:* dit is het verschil tussen briefen met een merkfolder en briefen met het
  dossier. Een schrijver die tien steden bij naam mag noemen schrijft een andere pagina.
- *Ontwikkelaar:* de duurste helft (crawlen) bestaat al; dit is selectie + één mini-aanroep. Wel
  oppassen met promptgrootte: 10 × 1.500 tekens is ~4.000 tokens invoer, ruim binnen budget.
- *Klant:* hij betaalt voor content die zichtbaarheid oplevert. Twee feitelijk vlekkeloze,
  productloze pagina's leveren dat aantoonbaar niet.

**Effort:** 4 dagen (relevantiemodule + tests 1,5 d; atomiseerstap + schema + vangnet 1,5 d;
integratie in `buildFactBase` en de briefing 1 d).
**Extra AI-kosten:** ~$0,004 per briefingbatch (mini, ~4.000 in / ~1.500 uit). Bij twee pagina's
per batch is dat +4% op de $0,048 per pagina. **Verhoogt het aantal getrackte prompts niet.**

---

### S2 — De claim-audit wordt de architect: het paginaplan overleeft de briefing  ✅ gebouwd

**Wat het is.** De rolverdeling tussen twee bestaande stappen omdraaien. Nu is de claim-audit een
*vragengenerator* en de schrijver een *auteur die zelf zijn structuur bedenkt*. Voorstel: de
audit levert het **paginaplan** en de schrijver voert het uit.

Concreet:

1. **Bewaar de volledige auditopbrengst per pagina**, niet alleen de gaten. Nieuw veld in
   `briefing_snapshot_json`: `plan: AuditedClaim[]` per `content_piece`, gefilterd op de claims
   die aan díe pagina toegewezen zijn (de koppeling die `paginaVanClaim()` in `briefing.ts:325`
   al maakt en daarna weggooit).
2. **Hersamenstellen op het moment van schrijven, niet bevriezen.** Vlak vóór de schrijfaanroep
   wordt het plan opnieuw doorgerekend tegen de dan-actuele feiten: elke claim krijgt opnieuw
   `isSupported()`, met de antwoorden van de klant erbij. Uitkomsten: **gedekt** (schrijf hem, met
   dit F-nummer), **weerlegd** (de klant zei nee → verbod), **onbeantwoord** (laat weg). Dit is
   R8.1, maar dan op de plek waar het structureel klopt in plaats van als merge-pleister — en het
   heft §1.7-bevinding 2 op, omdat het plan altijd tegen verse feiten herrekend wordt.
3. **Het plan gaat als paginastructuur de schrijfprompt in**, gegroepeerd per doelvraag: welke
   vraag deze sectie beantwoordt, welke bewering daar hoort, en welk F-nummer hem dekt. De
   schrijver bepaalt de formulering, niet meer wat de pagina beweert.
4. **`briefing_snapshot_json` splitsen.** De kaart-bij-de-briefing (auditspoor, onveranderlijk) en
   de kaart-bij-het-schrijven (wat het model echt kreeg) worden twee sleutels in hetzelfde veld
   in plaats van dat de tweede de eerste overschrijft. Additief, geen migratie nodig.

**Waarom dit groter is dan R8.1.** R8.1 voegt beantwoorde vragen toe aan een lijst. Dit maakt de
audit tot een echte pijplijnstap met een blijvend product, en geeft de schrijver voor het eerst
een *plan* in plaats van een *verzameling*. Het maakt ook R8.2 (doelvraag-echo) sterker: als de
eerste sectie per constructie aan de doelvraag hangt, controleer je een structuur in plaats van
te hopen op een openingszin.

**Waarom géén extra agent.** De opdracht noemt "een extra AI-agent die de kwaliteit gericht
bijstuurt" als richting. Mijn antwoord: die agent bestaat al en heet de claim-audit — we gooien
alleen zijn uitvoer weg. Een agent toevoegen die achteraf bijstuurt voegt een aanroep en een
faalpunt toe aan een keten die al vier aanroepen per pagina doet. Eerst de bestaande stap zijn
werk laten houden.

**Invalshoeken.**
- *Copywriter:* dit is het verschil tussen een briefing en een berg research. Sterkste argument.
- *GEO-expert:* een pagina met één sectie per deelvraag is precies de vorm waarin een
  AI-assistent knipt — het maakt regel (6) van `CONTENT_SYSTEM` structureel in plaats van
  hoopvol.
- *Ontwikkelaar:* geen nieuwe AI-aanroep, geen migratie, en het verwijdert een klasse bugs
  (§1.7.2) in plaats van hem te dempen.
- *Klant:* neutraal tot licht negatief — hij merkt er niets van, behalve dat pagina's minder op
  elkaar gaan lijken. Zie de botsing in §3.2.

**Effort:** 3 dagen. **Extra AI-kosten:** $0 (hergebruikt de bestaande audit-aanroep). Mogelijk
een kleine besparing: een schrijfaanroep met een plan heeft minder herschrijfrondes nodig.

---

### S3 — De dekkingsmeting krijgt een noemer die de code bepaalt  ✅ gebouwd

**Wat het is.** `source_coverage` stopt met vertrouwen op wat het model als bewering aanmerkt.
Nieuwe pure module `lib/pipeline/claim-extract.ts` (zonder `server-only`, testbaar in
`scripts/test-unit.ts`) haalt uit `bodyMarkdown` + `faq_json` de **kandidaat-beweringen** met
deterministische regels:

- elke zin die de merknaam bevat (of een merkbepaald voornaamwoord aan het begin van een zin in
  een alinea die met de merknaam opent);
- elke zin met een getal, bedrag, percentage, jaartal, tijdsduur of openingstijd;
- elke zin met een toezeggingswerkwoord uit een vaste lijst (*biedt, garandeert, levert,
  inbegrepen, mogelijk, kunt u, reserveer, altijd, binnen*).

Elke kandidaat moet gedekt zijn door een `claims_json`-regel die `isSupported()` overleeft. De
uitkomst wordt drie getallen in plaats van één: `claims_tagged`, `claims_detected`,
`source_coverage` = gedekt / **gedetecteerd**.

**Het bewijs.** §1.5: 49 getagde beweringen op ~250 zinnen. De Van der Valk-fabricage
(*"reserveer direct online"*) bevat "reserveer" en de merknaam en zou als kandidaat opgepikt zijn;
de Fysi-Unique-tegenspraak opent met de merknaam. Beide zijn met deze regels detecteerbaar en
zijn nu onzichtbaar.

**Waarom dit groter is dan R8.7.** R8.7 maakt `geo_score` deterministisch — een terechte,
begrensde ingreep op één metriek. Dit raakt het principe eronder: **een kwaliteitsmaat mag niet
afhangen van wat de gemeten partij aanwijst.** Dat is de werkafspraak "een promptinstructie is een
intentie, code is een garantie", toegepast op de meetlat zelf in plaats van op de uitvoer.

**Bewuste ontwerpkeuze — vals-positieven zijn goedkoper dan vals-negatieven.** Een regelgebaseerde
detector zal zinnen aanmerken die geen echte bewering zijn. Dat kost de klant een regel in
`review_notes`; een gemiste fabricage kost hem zijn geloofwaardigheid. Bij twijfel dus:
kandidaat. **Onbekend is beter dan verkeerd:** een pagina met nul gedetecteerde kandidaten krijgt
`source_coverage: null`, niet 100.

**Invalshoeken.**
- *Ontwikkelaar:* overtuigend en goedkoop; puur, testbaar, geen netwerk, past exact in het
  bestaande patroon (`position.ts`, `question-share.ts`, `validate-claims.ts`).
- *GEO-expert:* neutraal — dit maakt de pagina niet beter, het maakt zichtbaar hoe goed hij is.
- *Copywriter:* **hier zit wrijving.** Een detector die elke zin met een getal als claim ziet,
  straft juist de concrete schrijfstijl die we willen. Zie §3.1.
- *Klant:* sterk positief. Dit is het verschil tussen "100% onderbouwd" en "100% van de 2 zinnen
  die we zelf uitkozen".

**Effort:** 3 dagen (module + regelset + tests op de 10 echte pagina's als regressieset 2 d;
inhaken in `buildDraftRow`/`reviseContentPiece` 1 d).
**Extra AI-kosten:** $0.

---

### S4 — Een positioneringsslot, met een gereserveerde plek in de acht  ✅ gebouwd

**Wat het is.** De vraagsoort `onderscheid` krijgt een eigen productiemechanisme in plaats van
alleen een enumwaarde, en een **gegarandeerde plek** in de vragenlijst.

1. **Deterministisch slot, geen AI.** Bij elke briefing wordt uit
   `competitor_breakdown.attributes_json` (die er al is, en die letterlijke bewijszinnen bevat)
   één merkbrede vraag samengesteld in code: *"Een AI-assistent noemt bij deze vraag nu andere
   praktijken, met argumenten als 'zitting manuele therapie: €60,00 per sessie' en 'fysiotherapie
   zonder verwijsbrief'. Wat is jouw antwoord daarop?"* — concurrentnamen eruit via
   `redactCompetitors()`, zoals overal elders. `scope: 'merk'`, `kind: 'onderscheid'`.
2. **Reservering in `selectBriefingQuestions()`.** Vandaag sorteert die functie op
   `aantal pagina's × kern(2)/ondersteunend(1)`, waardoor verificatie- en praktisch-vragen de acht
   plekken altijd winnen — precies wat we in productie zien (0 van 62). Voorstel: van de acht
   plekken is er **minstens één gereserveerd** voor `kind = 'onderscheid'` zolang die er is. Puur
   selectielogica, in een module die al zonder `server-only` draait en al getest wordt.
3. **De bewijszinnen gaan óók naar de schrijver.** `competitorEdge` in `content.ts:524` geeft nu
   alleen `edgeCounts.keys()` door; dat wordt `keys + evidence` (zonder namen). De `Map` die de
   bewijszinnen al bevat hoeft niet eens veranderd te worden.

**Het bewijs.** §1.4: 0 van 62 vragen was `onderscheid`; geen van de 10 pagina's bevat iets dat
een concurrent niet had kunnen schrijven (op de Fysi-Unique-therapeutennamen na); en de
concrete concurrentargumenten staan ongebruikt in de database.

**Waarom dit groter is dan R8.8.** R8.8 controleert achteraf of een gegeven onderscheid-antwoord
in de tekst terechtkwam. Dat is een controle op een antwoord dat in de praktijk nooit gevraagd
wordt. Dit voorstel maakt de vraag überhaupt bestaanbaar — en zonder dat is R8.8 een controle op
een lege verzameling.

**Invalshoeken.**
- *Copywriter:* het sterkst. Dit is de vraag die een goede tekstschrijver als eerste stelt en die
  onze app nog nooit heeft gesteld.
- *GEO-expert:* eens, met een nuance: onderscheid werkt alleen als het **feitelijk en citeerbaar**
  is ("open op zaterdag", "eigen werkplaats op vier locaties"), niet als het adjectieven zijn
  ("persoonlijk", "betrokken"). De vraagformulering moet daarop sturen, en het antwoord loopt door
  dezelfde citaatplicht als elk ander klantantwoord.
- *Ontwikkelaar:* goedkoop en goed te testen; de reservering is drie regels in
  `selectBriefingQuestions()` plus een test.
- *Klant:* dit is de enige vraag in de hele briefing die hij als *zijn* onderwerp herkent in
  plaats van als administratie.

**Effort:** 2 dagen. **Extra AI-kosten:** $0 (deterministisch slot, hergebruikt R4.2-data).

---

### S5 — Merkdossier bij onboarding: bulk-intake in plaats van acht vragen per batch  ☐ open

**Wat het is.** Het kanaal waarlangs klantkennis binnenkomt verbreden. Vandaag is dat kanaal:
maximaal 8 vragen per contentbatch, waarvan er 3 à 4 vaste slots zijn. Over vijf testklanten
leverde dat **21 beantwoorde vragen** op, waarvan 8 praktisch (telefoon, URL). De kennisbank die
`contentbriefing.md` §7 belooft ("na drie analyses een gevulde feitenbank") vult zich met deze
trechter niet.

Voorstel — het "bulk-alternatief" uit `contentbriefing.md` §8 promoveren van *fase 2, niet MVP*
naar eerste rangs, en verplaatsen naar onboarding:

1. **Eén veld bij het bedrijfsprofiel:** *"Plak of upload wat je al hebt liggen — tarieven,
   voorwaarden, een brochure, je veelgestelde vragen."* Vrije tekst; geen bestandsparser nodig in
   de eerste versie (plakken volstaat en houdt de scope klein).
2. **Eén mini-aanroep atomiseert het** naar citeerbare feiten, met dezelfde vorm en hetzelfde
   vangnet als S1: letterlijke zin uit het aangeleverde materiaal, bron = documentnaam + datum,
   substringcontrole in code. Feiten met een bedrag of looptijd krijgen `verify_after` — de kolom
   bestaat al en wordt nu niet gebruikt (`GEO-PROCES-HUIDIGE-STAND.md` §3).
3. **De klant ziet de lijst en kan doorstrepen**, niet formuleren. Bevestigen is goedkoper dan
   bedenken (`contentbriefing.md` §4, regel 3) — dat principe geldt hier op schaal.
4. **Gevolg voor de briefing:** die wordt korter, niet langer. Vragen waarvan het antwoord al in
   het dossier staat vallen weg via de bestaande `alreadyKnown`-filter.

**Waarom dit groter is dan een R8-punt.** Dit is de enige ingreep die de hoeveelheid *unieke,
niet-publieke* klantkennis in het systeem structureel vergroot. S1 haalt meer uit wat er publiek
staat; S5 haalt binnen wat er nergens staat — en dat is per `contentbriefing.md` §1 de
belangrijkste bron van onderscheidend vermogen die het product heeft. Het is ook de directe
uitwerking van de opdrachtrichting "de klantinput bij onboarding fundamenteel uitbreiden".

**Invalshoeken.**
- *Klant:* het sterkst, maar met een voorwaarde. Eén keer een tarievenpagina plakken is minder
  werk dan drie keer acht vragen beantwoorden. Wél moet het optioneel blijven — `README.md` §2
  verbiedt een doodlopende weg bij onboarding.
- *Copywriter:* eens; dit is hoe een echte briefing begint.
- *GEO-expert:* eens, met de kanttekening dat verouderde tarieven schadelijker zijn dan
  ontbrekende. Vandaar `verify_after` als onderdeel van dit voorstel en niet als losse wens.
- *Ontwikkelaar:* **hier zit de grootste zorg.** Dit is de enige van de zeven die de
  onboardingsflow raakt, en dat is de plek waar een klant afhaakt. Zie §3.3.

**Effort:** 4 dagen (UI-veld + route 1,5 d; atomiseerstap + vangnet 1,5 d; `verify_after`
activeren en de verificatievraag terugvoeren 1 d).
**Extra AI-kosten:** ~$0,01 per aangeleverd document (mini, eenmalig per klant per document).
Geen effect op de kosten per analyse of per pagina.

---

### S6 — Van `ready` naar vrijgegeven: één deterministische poort, en de klant ziet wat hij vrijgeeft  ◐ poort af

**Wat het is.** De statuswaarde `ready` betekent vandaag "de pijplijn is klaar", niet "dit kan
live". Dat verschil kost de klant zijn geloofwaardigheid op het moment dat het misgaat.

1. **Eén poortfunctie in code**, puur en testbaar (`lib/pipeline/publish-gate.ts`), die alle
   deterministische signalen samenneemt: doelvraag-echo (R8.2), GEO-checks (R8.7),
   onderscheid-check (R8.8), en de nieuwe dekkingsmeting uit S3. Zij bepaalt de eindstatus — niet
   `qualityScore` van een model dat zichzelf beoordeelt.
2. **Nieuwe statuswaarde `te_beoordelen`** tussen `draft` en `ready`. Additief, past in de
   bestaande statusmachine (`GEO-PROCES-HUIDIGE-STAND.md` §5.3). `ready` betekent vanaf dan: de
   klant heeft gekeken. Dat is dezelfde filosofie als de review-gate vóór de meting (halte 6.8) —
   het enige bewezen patroon dat de app hiervoor heeft.
3. **De klant ziet drie dingen** die nu alleen in de database staan: de feitenkaart waarop déze
   pagina geschreven is, elke gedetecteerde bewering met haar F-nummer (of het ontbreken ervan),
   en elke verplichte vraag die hij liet liggen. Geen harde blokkade — hij kan altijd door
   (`README.md` §2) — maar hij ziet wat hij vrijgeeft.
4. **De tweede beoordeling gaat iets doen.** Vandaag rekent `reviseContentPiece()` hem uit en
   negeert hem; die uitkomst wordt voortaan invoer voor de poort.

**Het bewijs.** §1.6: 10/10 pagina's door de "poort" gevallen en toch alle tien op `ready`; de
Coolblue-pagina op `ready` met `quality_score` 75 onder een drempel van 80 en vijf concrete
`review_notes`.

**Waarom dit groter is dan R8.2/R8.7/R8.8.** Die drie leveren elk een signaal. Zonder één plek
die ze samenneemt en één statuswaarde die "nog niet vrijgegeven" betekent, zijn het drie extra
regels in een `review_notes`-veld dat de klant misschien nooit opent. Dit is de schakel die van
signalen een consequentie maakt.

**Invalshoeken.**
- *Klant:* het sterkst — en tegelijk het meest ambivalent. Zie §3.3.
- *Ontwikkelaar:* hergebruikt een bestaand, gevalideerd patroon; één plek in plaats van vier
  verspreide drempels.
- *GEO-expert:* neutraal; verandert de tekst niet.
- *Copywriter:* positief, om een reden die makkelijk over het hoofd wordt gezien: een schrijver
  die weet dat er een eindredacteur meekijkt, mag scherper schrijven. De poort maakt ruimte voor
  meer lef in `CONTENT_SYSTEM`, niet minder.

**Effort:** 3 dagen (poortmodule + tests 1 d; migratie `0034` + statusmachine 0,5 d; UI in de
Content Bibliotheek 1,5 d). Bouwt op R8.2/R8.7/R8.8 en moet daarna.
**Extra AI-kosten:** $0.

---

### S7 — Een ketentest op de echte handlers, met een gestubde OpenAI-client  ☐ open

**Wat het is.** `scripts/test-unit.ts` (250 tests) dekt pure functies uitstekend. Precies daarom
zat geen van de zeven fouten van dit traject erin: ze zitten allemaal in de **samenhang** tussen
taken — wat de ene stap opslaat en wat de volgende ervan leest.

| Fout | Waar hij zat |
|---|---|
| `briefing` gold als "al af" | `draftContentPiece()` vs. `planContentDraft()` |
| Versiesprong / spookrij | `draftContentPiece()` vs. `ensureBriefingPieces()` |
| `answeredFacts` dood | `loadContentContext()` vs. `buildContentInput()` |
| Multi-ref-citaatplicht | `isSupported()` vs. wat het schrijfmodel teruggeeft |
| Bevroren kaart plant zich voort (§1.7.2) | `buildDraftRow()` vs. `loadContentContext()` |
| Merkbrede antwoorden buiten de dedupe-sleutel (§1.7.1) | `planContentDraft()` vs. `briefing.ts` |
| Auditplan weggegooid (§1.3) | `runBriefing()` vs. `draftContentPiece()` |

**Wat ik zou bouwen, en waarom in deze vorm.** De kop van `test-unit.ts` zegt terecht: *"een test
met een nagebootste database toetst vooral of je nabootsing klopt"*. Dat bezwaar is dodelijk voor
een mock-database en niet voor deze opzet:

- **Echte Postgres**, lokaal via de Supabase CLI, met de **echte migraties** `0001`…`0034`. Geen
  nabootsing van het schema — het schema zelf.
- **Echte jobhandlers** (`lib/jobs/handlers.ts`), echte `enqueue`/dedupe-logica, echte routes.
- **Gestubde OpenAI-client** op één plek (`lib/openai/structured.ts`): vaste, realistische
  structured-output-antwoorden per `schemaName`, ontleend aan de ruwe responses die al in
  `ai_calls` staan. Nul kosten, nul netwerk, deterministisch.
- **Eén scenario om te beginnen:** profiel → analyse → meting → aggregatie → rapport →
  `content_brief` → antwoord opslaan (één merkbreed, één analyse-breed) → `content_draft` →
  `content_revise`, met asserties op elke tussenstatus, op de versienummers, op de dedupe-sleutel
  en op de inhoud van de gebruikte feitenkaart.

Dat scenario had **alle zeven** fouten hierboven gevangen, inclusief de twee die deze doorlichting
pas vond.

**Waarom dit groter is dan een R8-punt.** Het is de enige structurele ingreep tegen een bugklasse
die zich in dit traject vijf keer heeft herhaald en die telkens pas op productie zichtbaar werd,
na een handmatige ronde van uren en dollars. Dit is geen kwaliteitswinst voor de klant van
vandaag; het is de reden dat S1 t/m S6 zonder nieuwe verrassingen te bouwen zijn.

**Invalshoeken.**
- *Ontwikkelaar:* het sterkst, en zonder tegenspraak.
- *Klant:* indirect maar reëel — elke fout uit deze klasse stond weken ongemerkt op productie.
- *GEO-expert / copywriter:* geen mening; dit maakt geen enkele pagina beter.

**Effort:** 4 dagen (lokale stack + migraties draaiend 1 d; OpenAI-stub met vaste antwoorden 1 d;
het scenario + asserties 1,5 d; in de vaste controle vóór commit hangen 0,5 d).
**Extra AI-kosten:** $0.

---

## 3. Waar de vier invalshoeken botsen

Drie botsingen zijn echt, en ze zijn interessanter dan de voorstellen zelf.

### 3.1 De copywriter tegen de dekkingsmeting (S3)

De copywriter wil concrete zinnen: getallen, termijnen, plaatsnamen. S3 maakt precies die zinnen
tot kandidaat-bewering, en dus tot iets wat gedekt moet zijn. Het risico is een schrijver die
leert dat vaag schrijven veiliger is — en dat is exact de valkuil die R5 al één keer opleverde
("een pagina zonder verzinsels die verder nietszeggend is haalt de lat niet").

**Beslissing.** De spanning verdwijnt niet door de meting zachter te maken, maar door de kaart
rijker te maken. Daarom hoort S1 vóór S3: bij 25 onderwerpspecifieke feiten in plaats van 5
merkbrede is een concrete zin gewoon dekbaar. Wie S3 zonder S1 bouwt, bouwt een strengere rem op
een lege tank. **Dat is de belangrijkste volgorde-conclusie van dit document.**

### 3.2 De klant tegen de architect (S2)

De klant koopt "1-click contentgeneratie" (`abcplan.md`). Elke stap die de pijplijn strakker
maakt — een plan volgen, een poort passeren — is vanuit zijn stoel meer proces voor iets wat
"gewoon een pagina" moet opleveren. S2 lost dat niet op; het maakt de pagina beter zonder dat de
klant ziet waaróm.

**Beslissing.** Doorvoeren, maar onzichtbaar houden. S2 mag geen enkel nieuw scherm en geen
enkele nieuwe klantactie opleveren. Het is een interne herverdeling; de klant merkt alleen dat
zijn twee pagina's niet meer op elkaar lijken.

### 3.3 De klant tegen de klant (S5 en S6)

Dit is de scherpste, en hij loopt binnen één invalshoek.

- Dezelfde klant die zegt *"ik wil hier zo min mogelijk tijd in steken"* (S5 = werk erbij, S6 =
  een extra kijkmoment) is de klant die zijn abonnement opzegt zodra er één onjuiste zin over zijn
  bedrijf gepubliceerd blijkt.
- De ontwikkelaar ziet bovendien dat S5 de onboarding raakt — statistisch de plek waar mensen
  afhaken — en dat een extra veld daar duur is.

**Beslissing.** Beide doorvoeren, maar met een strikte vorm: S5 is **overslaanbaar zonder enige
consequentie** en staat ná het profielonderzoek in plaats van ervóór (dan is het profiel er al en
kan de app tonen wat hij zelf gevonden heeft — bevestigen in plaats van invullen, conform
`contentbriefing.md` §4). S6 blokkeert nooit; hij maakt zichtbaar in plaats van tegen te houden.

**En één niet-botsing die het vermelden waard is:** alle vier de invalshoeken zijn het eens over
S1. De GEO-expert wil concrete citeerbare feiten, de copywriter wil een dossier, de ontwikkelaar
ziet dat de data er al is, en de klant betaalt voor pagina's die iets zeggen. Dat maakt S1 de
enige van de zeven waar geen afweging aan te pas komt.

---

## 4. Aanbevolen volgorde

De R8-punten gaan door zoals gepland. Deze zeven komen daar op deze plekken tussen:

| # | Voorstel | Effort | AI-kosten | Positie |
|---|---|---|---|---|
| 1 | **S7** — ketentest | 4 d | $0 | **Vóór alles.** Elke volgende stap raakt dezelfde vier bestanden waar de laatste vijf bugs vandaan kwamen; zonder net wordt dat de zesde. |
| 2 | **S1** — onderwerpgerichte, atomaire feitenkaart | 4 d | ~$0,004/batch | Direct erna. Heft het plafond op waar al het andere tegenaan loopt, en maakt R8.9 (3-5 d onderzoek) grotendeels overbodig. |
| 3 | **S2** — de audit als architect | 3 d | $0 | Vervangt R8.1 in plaats van erop te volgen: dezelfde bestanden, dezelfde week, structureel in plaats van als merge. |
| 4 | **S4** — positioneringsslot | 2 d | $0 | Kleinste ingreep met het grootste effect op onderscheidend vermogen; maakt R8.8 pas zinvol. |
| 5 | **S3** — dekkingsmeting met een eigen noemer | 3 d | $0 | Ná S1 (zie §3.1). Neemt R8.7 in zich op. |
| 6 | **S6** — publicatiepoort | 3 d | $0 | Ná R8.2/R8.7/R8.8, want die leveren de signalen die de poort samenneemt. |
| 7 | **S5** — merkdossier bij onboarding | 4 d | ~$0,01/document | Laatste. Raakt als enige de onboarding; verdient de rust van een keten die verder staat. |
| — | *S7b* — periodieke meting als contentveroudering | 2 d | $0 | Uitgesteld tot er gepubliceerde pagina's zijn. Voorstel 6 van de vorige versie, inhoudelijk in orde. |

**Totaal: 23 dagen**, plus de 15,5–17,5 dagen van R8 (waarvan R8.9 vervalt of tot een gerichte
vraag over één klanttype krimpt, en R8.1/R8.7/R8.8 in S2/S3/S4 opgaan — netto R8 ≈ 9 dagen).

**Als er maar twee dingen mogen: S1 en S2.** Samen 7 dagen, geen migratie, ~$0,004 per batch
extra, en ze raken de enige twee schakels waar de kwaliteit werkelijk begrensd wordt — wat de
schrijver aan feiten heeft, en of iemand hem heeft verteld wat de pagina moet doen.

---

## 5. Wat ik bewust níét voorstel

- **Meer getrackte prompts.** Randvoorwaarde, en terecht: de meting is 95% van de kosten. Geen
  van de zeven raakt de 30.
- **Een tweede beoordelende AI-agent.** De keten doet al vier AI-aanroepen per pagina en de
  laatste twee (herschrijven + herbeoordelen) leveren een oordeel op dat niets doet. Een agent
  toevoegen aan een keten waar het bestaande oordeel genegeerd wordt, is symptoombestrijding. S2
  en S6 lossen dat op met de aanroepen die er al zijn.
- **Een live productfeed of API-koppeling per klant (R8.9 in zijn volle vorm).** §1.2 laat zien
  dat de premisse voor drie van de vier gevallen niet klopt. Na S1 is de open vraag alleen nog:
  wat doen we met een klant als Bol, waarvan de crawl één pagina zonder bruikbare tekst opleverde?
  Dat is een gerichte vraag, geen onderzoekstraject.
- **Stijl afdwingen op lexicale overlap met `style_samples`.** Beloont het overnemen van zinnen
  van de eigen site; meet imitatie in plaats van stem.
- **Contentarchetypes per funnelfase.** Niet omdat het onzinnig is, maar omdat de eenvormigheid
  van de 10 pagina's aantoonbaar uit de feitenschaarste komt (§1.1) en niet uit de
  structuurinstructie. Opnieuw beoordelen ná S1 en S2 — als pagina's dan nog steeds op elkaar
  lijken, is dit het volgende voorstel.
- **CMS-publicatie, een tweede LLM-engine, de leerlus.** Ongewijzigd buiten scope
  (`implementatieplan.md` §8).

---

## 6. Verantwoording van de cijfers

Alles hierboven komt uit één van deze bronnen; niets is geschat waar gemeten kon worden.

| Bewering | Bron |
|---|---|
| 4–5 citeerbare feiten per pagina, geen ervan onderwerpspecifiek | `content_pieces.briefing_snapshot_json`, 10 pagina's van 31 juli |
| 40 gecrawlde pagina's × 1.500 tekens; 8 × 400 in de kaart | `profile_pages`, `factbase.ts:40-41,60-64` |
| Coolblue: 10 wasmachine-adviespagina's gecrawld, 0 in de kaart | `profile_pages` waar `url ilike '%wasmachine%'` |
| 49 getagde beweringen, ~250 zinnen over 10 pagina's | `claims_json` en `body_markdown` |
| 62 `fact_requests`, 0 × `onderscheid`, 0 × `grenzen` | `fact_requests` gegroepeerd op `kind` |
| 31 auditclaims, 19 door het model onderbouwd geacht | `fact_requests.raw_json`, geparste `claim_audit`-uitvoer |
| 9 van 21 beantwoorde vragen merkbreed met `analysis_id = null` | `fact_requests` waar `status = 'beantwoord'` |
| `geo_score` = 100 op alle 20 pagina's in de database | `content_pieces.geo_score` |
| 10× draft, 10× revise, $0,480 totaal = $0,048 per pagina | `ai_calls` van 31 juli |
| De AI citeert vooral de eigen sites van concurrenten | `tracking_run_mentions.cited_sources`, gegroepeerd op domein |

---

*Dit document hoort bij [`implementatieplan.md`](./implementatieplan.md) §R8 en
[`kwaliteitsanalyse-contentronde.md`](./kwaliteitsanalyse-contentronde.md), en volgt de
werkafspraken uit [`status-doorontwikkeling.md`](./status-doorontwikkeling.md) §2.*
