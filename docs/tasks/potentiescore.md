# De potentiescore: zichtbaarheidsgat × zoekvolume, eerlijk over analyses heen

**Status:** fase 1 gebouwd en op productie, 13 augustus 2026. Fase 2 en 3 (§6) staan nog open.
**Opgesteld:** 13 augustus 2026 · **Aanleiding:** vraag van de product owner: hoeveel is er te winnen
op een onderwerp of een pagina, en is dat overal in de app op dezelfde manier te vergelijken.

**Uitgebreid tijdens de bouw (13 augustus):** de opdracht om dit door te voeren voegde een eis toe die
in het oorspronkelijke ontwerp niet stond: alle DRIE de getallen (zichtbaarheid, zoekvolume, potentie)
moeten zichtbaar zijn, niet alleen de potentiescore. Dat is gebouwd, zie §4a hieronder voor waar precies.

Antwoord in één alinea: **potentie is het product van twee onafhankelijke getallen**, hoeveel van de
vragen dit merk nu mist (het zichtbaarheidsgat, al goed gebouwd) en hoe vaak dat onderwerp gezocht
wordt (het zoekvolume, tot nu toe een grove gok die niet over analyses heen te vergelijken is). De
kern van dit plan is niet de eerste helft, die staat er al, maar de tweede: één herkalibratiestap die
draait zodra een nieuwe analyse klaar is en dan **alle** onderwerpen van het merk opnieuw op dezelfde
schaal zet, zodat een sterk onderwerp uit analyse 2 de zwakkere onderwerpen van analyse 1 zichtbaar
naar beneden trekt in plaats van dat elke analyse zijn eigen 0-100 blijft claimen.

---

## 0. Wat er al staat, en waarom dit geen nieuw fundament is

Drie stukken bestaan al en dit plan hergebruikt ze in plaats van ze te vervangen.

**Het zichtbaarheidsgat (helft 1) is al gebouwd.** `elicit_successes`/`elicit_samples` (migratie 0037)
en de aggregatie in `question-share.ts` weten al, per vraag en per herhaling correct gewogen, of dit
merk wordt genoemd. De "Kansen"-lijst (`lib/opportunities.ts`) telt dit nu al op tot een percentage
gemiste vragen. Dit plan voegt hier niets aan toe, het hergebruikt het.

**Het zoekvolume (helft 2) bestaat, maar expliciet niet als vergelijkbaar getal.** `lib/pipeline/
volume.ts` documenteert zelf waarom: tot 2 augustus toonde het scherm een geschat getal 0-100 en dat
werd door de klant gelezen als een meting. Het model heeft geen zoekvolumedata, het heeft een gevoel,
en het verschil tussen 62 en 68 bestaat niet. De oplossing toen: drie banden (hoog/midden/laag) in
plaats van honderd waarden.

**Dit plan draait die beslissing niet terug, het lost het achterliggende probleem anders op.** Het
probleem was nooit de precisie van het getal, het was dat de klant een LLM-gok voor een meting
aanzag. Drie banden verbergen dat probleem door minder te beweren; dit plan lost het op door het
getal nooit los te tonen. Wat de klant ziet is nooit de ruwe schatting van één AI-aanroep, het is een
getal dat pas ontstaat NADAT de code het tegen alle andere onderwerpen van dit merk heeft afgezet.
Dat is een ander soort garantie dan drie banden, maar wel een garantie (conventie 1): consistent
over analyses heen is een eis die de code afdwingt, niet het model.

**De bestaande kalibratie (`calibrateVolumes()` in `lib/pipeline/prompts.ts`) is het startpunt, niet
het eindpunt.** Hij schat nu al relatief, 0-100, in één aanroep per analyse, met redeneerinspanning
`analytical` (dus al `low`, niet `none`). Het gat is dat "relatief" alleen binnen die ene analyse van
30 tot 90 vragen geldt. Onderwerp A uit analyse 1 en onderwerp B uit analyse 2 hebben allebei hun
eigen top-vraag die dicht bij 100 uitkomt, ook als B in werkelijkheid twee keer zo veel zoekvolume
heeft als A. Twee keer "de volle schaal gebruiken" op twee losse invoerlijsten levert per definitie
twee losse schalen op. Daar kan geen rekensom ná afloop iets aan repareren: de ruwe cijfers zijn niet
oneerlijk afgerond, ze zijn niet-vergelijkbaar aan de bron.

---

## 1. Het ontwerp in één plaatje

```
Zichtbaarheidsgat (0-1)         Zoekvolume-index (0-100)
  hoeveel vragen mist              hoe vaak wordt dit
  dit merk nu nog?                 gezocht, eerlijk over
  (bestaat al, ongewogen           alle analyses van dit
  door volume)                     merk heen?
        │                                  │
        └──────────────  ×  ───────────────┘
                          │
                 Potentiescore (0-100)
        "wat is hier te winnen, en hoe groot is dat
         in vergelijking met elk ander onderwerp van
         dit merk"
```

⚠️ **Vermenigvuldigen, niet optellen, want dat is precies de eis uit de vraag.** Een onderwerp waar
het merk al overal genoemd wordt (gat ≈ 0) heeft potentie 0, hoe hoog het zoekvolume ook is: er is
niets meer te winnen. Een onderwerp met een enorm gat maar vrijwel geen zoekvolume (index ≈ 5) blijft
laag: winnen wat bijna niemand vraagt is geen prioriteit. Alleen de combinatie van beide, veel gemist
én veel gezocht, geeft een hoge score. Dat is letterlijk de eigen omschrijving uit de vraag: "is de
klant niet zichtbaar EN is het zoekvolume hoog, dan is dit een grote kans."

⚠️ **Waarom het zichtbaarheidsgat hier NIET de bestaande, gewogen zichtbaarheidsscore mag zijn.** Het
scherm dat nu op de analysepagina staat (`visibility_scores.score`) is al gewogen met
`promptWeight()`, en die functie vermenigvuldigt op zijn beurt alweer met de band uit `volume.ts`
(hoog/midden/laag). Zou de potentiescore dát getal als invoer nemen, dan zit zoekvolume er twee keer
in: één keer grof via de band, één keer fijn via de nieuwe index. Het zichtbaarheidsgat voor deze
formule moet dus een **kale, ongewogen** telling zijn: van de gemeten vragen (met `shareByRun`, zodat
een drie keer gemeten vraag niet driemaal telt), welk aandeel toonde in de laatste meting geen
vermelding van dit merk. Nieuwe, kleine functie, geen hergebruik van het scherm dat er al staat.

---

## 2. Hoe het zoekvolume eerlijk blijft over analyses heen

Twee stappen, met een verschillend doel.

### Stap A: de ruwe schatting per analyse (bestaat al, klein aangepast)

`calibrateVolumes()` blijft draaien zoals nu, meteen na het genereren van de vragen van een analyse.
Twee wijzigingen:

1. **Meer moeite, letterlijk.** `work: "analytical"` (effort `low`) wordt `work: "content"` (effort
   `medium`, `lib/openai/sampling.ts`). Dit is de zwaarste aanroep die deze stap al kent qua
   redeneerinspanning zonder een nieuwe tier te verzinnen: dezelfde die het schrijven zelf gebruikt.
2. **Ankers in de instructie.** Het model krijgt drie tot vijf vaste, met de hand gekozen
   voorbeeldonderwerpen met een grove aanduiding van hun zoekvolume ("wasmachine kopen: zeer hoog,
   dit wordt door vrijwel elk huishouden ooit gezocht" / "dry needling bij een frozen shoulder: zeer
   laag, een nichevraag binnen één behandeling"). Zonder ankers is "de volle schaal 0-100" een schaal
   die bij elke aanroep opnieuw uitgevonden wordt; met ankers ligt het nulpunt en het maximum vast,
   ook al blijft de plaatsing ertussen een schatting.

De uitkomst blijft staan in `prompts.volume_estimate`, ongewijzigd qua rol: ruw, audit-trail,
conventie 8. Dit getal wordt nooit rechtstreeks getoond.

### Stap B: de herkalibratie over het hele merk (nieuw)

Dit is de kern van de vraag. Zodra een analyse voor het eerst een rapport krijgt, dus zodra er een
onderwerp bij komt waarover iets bekend is, wordt er één nieuwe, lichte AI-aanroep gepland: niet per
analyse, maar **per profiel**, over **alle** niet-gearchiveerde onderwerpen van dat merk tegelijk.

Invoer per onderwerp: de titel, de onderbouwing uit `propose_topics` (`profile_topics.rationale`), en
de twee of drie zwaarst wegende vragen (hoogste ruwe `volume_estimate` uit stap A) als concreet
voorbeeld. Bij vijf tot tien onderwerpen per merk (het gangbare aantal, zie `propose-topics.ts`,
5-8 topics) is dat een kleine, goedkope aanroep: geen 90 losse vragen, maar een handvol
onderwerpsamenvattingen.

Dezelfde vaste ankers als in stap A gaan mee, met dezelfde reden: een schaal die bij elke
herberekening hetzelfde nulpunt en maximum gebruikt, is een schaal waarop een score van vorige maand
en een score van deze maand naast elkaar mogen staan.

**De uitkomst vervangt, hij vult niet aan.** Elke keer dat deze stap draait, wordt voor ALLE
onderwerpen van dit merk een nieuwe `search_volume_index` (0-100) weggeschreven, ook voor onderwerpen
die deze keer niet inhoudelijk veranderd zijn. Dat is precies "alles wordt opnieuw herberekend" uit de
vraag: een onderwerp dat vorige maand op 80 stond kan deze maand op 55 uitkomen, niet omdat het zelf
veranderd is, maar omdat er nu een onderwerp bijkwam dat er met recht boven hoort te staan. De ruwe
schatting uit stap A blijft intussen ongemoeid staan als audit-trail; deze kolom is de afgeleide,
vergelijkbare versie ernaast, nooit een overschrijving (conventie 4-stijl, additief).

### Wanneer stap B draait

Getriggerd vanuit `generate_report`, op het moment dat een analyse zijn **eerste** rapport krijgt
(`weekNo === 0`, niet bij elke herhaalde maandmeting van een onderwerp dat al meetelde, dat onderwerp
zit al in de vergelijking). Eén nieuw jobtype, `recalculate_potential`, met `analysisId` leeg en
`profileId` erin (net als `gsc_sync` een profiel-brede taak is, geen analyse-taak).

⚠️ **Gebouwd met een eenvoudiger dedupe-sleutel dan hier oorspronkelijk stond.** Niet "het aantal
afgeronde onderwerpen op het moment van inplannen" maar gewoon per profiel per DAG
(`dedupe.recalculatePotential`, hetzelfde patroon als `gscSync`/`technicalAudit`/`offsiteScan`). Twee
analyses die op dezelfde dag hun eerste rapport krijgen, plannen zo één herberekening in plaats van
twee, en dat is geen verlies: de taak leest bij het UITVOEREN de actuele stand van de database, dus
beide nieuwe onderwerpen tellen sowieso mee, ook als de tweede trigger genegeerd wordt.

Geen AI-call op de kritieke pad van de meting zelf: dit loopt ná `generate_report`, dus vertraagt niets
wat de klant al ziet.

---

## 3. Wat er per laag wordt opgeslagen

**Migratie, additief, twee kolommen op `profile_topics`** (het onderwerp is hier de natuurlijke
eenheid: één analyse hoort al bij precies één onderwerp via `profile_topics.analysis_id`, dus
"analyse-niveau" uit de vraag en "onderwerp-niveau" zijn hetzelfde ding):

| Kolom | Type | Betekenis |
|---|---|---|
| `search_volume_index` | smallint, null | De laatst herberekende, eerlijke 0-100-waarde. Null tot de eerste herberekening. |
| `search_volume_reasoning` | text, null | Eén zin van het model over waarom, per onderwerp. Audit-trail én de tekst die op het scherm de tooltip vult, zodat het geen kaal getal blijft. |

Geen nieuwe kolom op `prompts` nodig: `volume_estimate` bestaat al en blijft de ruwe invoer van stap A.

**Content-niveau leunt op wat er al is.** Een pagina (`content_pieces`) hangt via `content_piece_
targets` al aan specifieke vragen, en die vragen hangen via `prompt_id` aan één analyse, dus aan één
`profile_topics`-rij. De potentiescore van een pagina hergebruikt de `search_volume_index` van zijn
onderwerp en berekent alleen het zichtbaarheidsgat opnieuw, ditmaal alleen over de vragen die déze
pagina target. Geen aparte kalibratie per pagina nodig: dat zou de kalibratieaanroep van stap B enorm
opblazen (tientallen pagina's in plaats van een handvol onderwerpen) voor een verschil dat er
inhoudelijk niet is, twee pagina's over hetzelfde onderwerp zoeken mensen even vaak.

**Nieuwe, pure module `lib/potential.ts`** (zonder `server-only`, testbaar, conventie 2):

```ts
export function visibilityGap(args: { runs: RunRef[]; mentioned: Map<string, boolean> }): number // 0-1
export function potentialScore(gap: number, volumeIndex: number | null): number | null // null zolang er nog geen index is
export function potentialLabel(score: number | null): string // "hoge potentie", "beperkte potentie", "nog niet te bepalen"
```

---

## 4. Waar de klant het ziet (gebouwd)

De opdracht om dit door te voeren voegde een eis toe: niet alleen de potentiescore, maar alle DRIE de
getallen zichtbaar, apart en herkenbaar, "op analyse-niveau en op content-niveau". Gebouwd als één
herbruikbare component (`components/potential-metrics.tsx`, `PotentialMetrics` voor drie tegels naast
elkaar en `PotentialInline` voor een compacte regel in een lijst), gevoed door `lib/potential-data.ts`.

**Analyse-niveau.** Hoofdstuk 01 van het analysedossier (`app/(app)/analyses/[id]/_chapters/stand.tsx`),
direct onder de bestaande scorekaart: drie tegels, Zichtbaarheid, Zoekvolume, Potentie, elk 0-100 met
een eigen uitlegknopje, plus één zin eronder ("38% van de vragen mist dit merk nog, bij een zoekvolume
van 84/100 binnen dit merk"). Bewust een EIGEN blok en geen extra kolom op de bestaande scorekaart:
dat cijfer daar (`weighted_score`) is al vermenigvuldigd met de grove volumeband uit `volume.ts`, en
zou zoekvolume dubbel laten meetellen als de potentiescore erop verder rekende. De nieuwe zichtbaarheid
komt daarom uit de ONGEWOGEN `visibility_scores.score`.

**Content-niveau, voorstel.** Hoofdstuk 03, "Pagina's die Aura voor je schrijft"
(`app/(app)/analyses/[id]/_chapters/werk.tsx`): één compacte regel per voorgestelde pagina, vóórdat er
een `content_pieces`-rij bestaat. Rekent op dat moment nog met de doelvragen uit
`RecommendationTarget[]` (het rapport), niet met `content_piece_targets`.

**Content-niveau, geschreven.** `components/why-this-page.tsx`, boven aan het "Waarom deze pagina"-blok
in de bibliotheek. Dit is ook de plek waar het scherm tot 13 augustus bewust GEEN percentage toonde
(het commentaar van 3 augustus zei "dat zou een nieuwe join vergen die nu niet bestaat"); die join is
er nu (`loadContentPotential()`), dus het label staat er nu, als onderdeel van de potentiescore, nooit
als los, ongefundeerd percentage.

**Zolang er geen index is** (vóór de eerste profielbrede herberekening) staat er een streepje, nooit
een gegokt getal (conventie 3): `MetricTile` toont `—` in plaats van `0` of een placeholder-cijfer.

**Wat nog niet gebouwd is.** De Kansen-lijst (`lib/opportunities.ts`) laten hersorteren op de nieuwe
potentiescore, en de volgorde van het contentplan (`plan-build.ts`, dat nu op de bevroren
dag-1-gok van `profile_topics.priority` sorteert) laten meebewegen met een score die na de lancering
van een onderwerp blijft veranderen. Allebei een logisch vervolg, allebei een aparte, grotere
wijziging (de eerste raakt de sortering die de klant als "wat moet ik eerst doen" leest, de tweede
raakt een lopend, al aan de klant getoond jaarplan). Genoemd in §6 als fase 2 en fase 3, nog niet
gebouwd.

---

## 5. Keuzes die ik al gemaakt heb, en waarom

Vier plekken waar een andere keuze ook verdedigbaar was. Ik leg ze hier neer met de reden, zeg het als
je een van de vier anders wilt, dan pas ik het ontwerp aan vóór de bouw begint.

1. **Vergelijkingsbereik is één merk, niet de hele Aura-portefeuille.** "Zoekvolume" van "wasmachine
   kopen" bij een witgoedretailer en van een fysiotherapiepraktijk zijn geen vergelijkbare markten, en
   niets in de app vergelijkt vandaag klanten met elkaar. Eerlijk "over analyses heen" lees ik daarom
   als over de analyses van hetzelfde merk.
2. **Gearchiveerde analyses tellen niet mee in de herkalibratie.** Een onderwerp waar de klant mee
   gestopt is, mag de schaal van de actieve onderwerpen niet meer beïnvloeden. Consistent met hoe de
   rest van de app `archived_at` al behandelt.
3. **Herberekenen gebeurt bij het EERSTE rapport van een analyse, niet bij elke maandelijkse
   hermeting.** Een onderwerp dat al meetelt, verandert niet van zoekvolume omdat het voor de derde
   keer gemeten wordt. Mocht in de praktijk blijken dat de schatting drift vertoont over een langere
   periode, is een periodieke herberekening (bijvoorbeeld elk kwartaal) een kleine toevoeging op
   hetzelfde mechanisme, geen nieuw ontwerp.
4. **Eén kalibratieniveau: per onderwerp, niet per vraag of per pagina.** Fijner kalibreren
   (honderden losse vragen tegen elkaar afzetten) is duurder, minder betrouwbaar als LLM-taak, en
   levert voor content-niveau geen ander zoekvolume op, alleen een ander zichtbaarheidsgat. Dat laatste
   wordt al wel per pagina berekend.

---

## 6. Bouwvolgorde

| Fase | Wat | Status | Raakt |
|---|---|---|---|
| 1 | Migratie 0057 (2 kolommen), `lib/potential.ts`, `lib/potential-data.ts`, aangepaste `calibrateVolumes()` (ankers + effort medium), nieuw jobtype `recalculate_potential` + trigger vanuit `generate_report`, drie getallen zichtbaar op analyse- en content-niveau (voorstel én geschreven) | **Af, 13 augustus** | `lib/pipeline/prompts.ts`, `lib/pipeline/search-demand.ts`, `lib/jobs/*`, `lib/pipeline/report.ts`, `components/potential-metrics.tsx`, `stand.tsx`, `werk.tsx`, `why-this-page.tsx` |
| 2 | De Kansen-lijst (`opportunities.ts`) laten sorteren op potentiescore in plaats van (of naast) het huidige gewicht uit de aanbevelingen | Nog niet gebouwd | `lib/opportunities.ts`, `lib/insights-data.ts` |
| 3 (apart besluit) | Contentplan-volgorde en/of de gewogen zichtbaarheidsscore laten overstappen van de 3-bandenschatting naar de nieuwe index | Nog niet gebouwd | `lib/pipeline/plan-build.ts`, `lib/pipeline/prompt-weight.ts` |

## 7. Verificatiecriteria

| # | Criterium | Status |
|---|---|---|
| 1 | Twee onderwerpen van hetzelfde profiel, met aantoonbaar verschillend zoekvolume, krijgen na de herberekening een index die dat verschil weerspiegelt | **Bewezen**, ketentest "De potentiescore" |
| 2 | Een derde onderwerp dat klaar komt met een duidelijk hoger zoekvolume, verlaagt aantoonbaar de index van een bestaand onderwerp dat zelf niet veranderd is | **Bewezen**: "Grote markt" daalt van 100 naar 84 zodra "Enorme markt" meedoet, met de hand nagerekend |
| 3 | Gearchiveerde onderwerpen tellen niet mee in de herkalibratie | **Bewezen** |
| 4 | De potentiescore van een onderwerp is nooit hoger dan wanneer het zichtbaarheidsgat 0 is (score dan exact 0) | **Bewezen**, unittest `potentialScore` |
| 5 | Een profiel zonder herberekening toont "—", nooit een gegokt getal | **Bewezen**, `MetricTile` |
| 6 | Twee pagina's binnen hetzelfde onderwerp met verschillende doelvragen tonen een verschillende zichtbaarheid, gelijk zoekvolume | Nog niet met een echte klant bevestigd (conventie 10): de rekenkant is bewezen, maar er is nog geen productieprofiel met twee geschreven pagina's op hetzelfde onderwerp om dit op te toetsen |
| 7 | De herberekening kost één AI-aanroep per keer, niet één per onderwerp, en draait nooit op het kritieke pad van een meting | **Bewezen**: `recalibrateSearchVolume()` doet één `callStructured`-aanroep over alle onderwerpen samen, getriggerd ná `generate_report`, niet ervoor |
| 8 | De trigger in `generate_report` (alleen bij `weekNo === 0`) is nagerekend tegen een echte, volledige rapportgeneratie | **Nog niet.** `generateReport()` heeft in deze codebase nog geen enkele ketentest (geen stub voor `gap_analysis`/`report`); dat is een bestaand gat, niet nieuw door dit werk, maar dit ene `if`-regeltje deelt dat gat. De onderliggende mechaniek (de taak zelf, de dedupe-sleutel) is wél bewezen |
