# De potentiescore: zichtbaarheidsgat × zoekvolume, eerlijk over analyses heen

**Status:** ontwerp, nog niets gebouwd · **Opgesteld:** 13 augustus 2026 · **Aanleiding:** vraag van
de product owner: hoeveel is er te winnen op een onderwerp of een pagina, en is dat overal in de app
op dezelfde manier te vergelijken.

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
(niet bij elke herhaalde maandmeting van een onderwerp dat al meetelde, dat onderwerp zit al in de
vergelijking). Eén nieuw jobtype, `recalculate_potential`, met `analysisId` leeg en `profileId` erin
(net als `gsc_sync` een profiel-brede taak is, geen analyse-taak), en een dedupe-sleutel die het
aantal afgeronde onderwerpen van dit profiel op het moment van inplannen meeneemt: twee analyses die
toevallig binnen dezelfde minuut hun eerste rapport krijgen, plannen zo niet twee identieke
herberekeningen na elkaar.

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

## 4. Waar de klant het ziet

**Analyse-niveau.** Naast de bestaande score op de analysepagina (`app/(app)/analyses/[id]/score-
panel.tsx`) en op het onderwerpenoverzicht (`app/(app)/profielen/[id]/topics-panel.tsx`) komt een
compact label: "Potentie: hoog (78/100)" met een tooltip die de twee helften uitlegt in gewone taal,
"38% van de vragen mist dit merk nog, en dit onderwerp wordt relatief vaak gezocht binnen jouw
onderwerpen." Zolang `search_volume_index` nog `null` is (vóór de eerste herberekening) staat er
"Potentie: nog niet te bepalen", nooit een gegokt getal, conventie 3.

**Content-niveau.** `components/why-this-page.tsx` krijgt hetzelfde compacte label per pagina, direct
onder "Deze pagina moet deze vragen winnen". Dit is ook de plek waar het scherm nu al bewust GEEN
percentage toont (zie het commentaar in dat bestand van 3 augustus); dat commentaar klopte toen, er
was toen geen eerlijke manier om zo'n getal te tonen. Dit plan is precies de "nieuwe join" die het
commentaar toen miste.

**Wat dit plan bewust NIET doet.** De Kansen-lijst (`lib/opportunities.ts`) laten hersorteren op de
nieuwe potentiescore, en de volgorde van het contentplan (`plan-build.ts`, dat nu op de bevroren
dag-1-gok van `profile_topics.priority` sorteert) laten meebewegen met een score die na de lancering
van een onderwerp blijft veranderen. Allebei een logisch vervolg, allebei een aparte, grotere
wijziging (de eerste raakt de sortering die de klant als "wat moet ik eerst doen" leest, de tweede
raakt een lopend, al aan de klant getoond jaarplan). Genoemd in §6 als fase 2 en fase 3, niet in de
eerste bouwronde.

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

| Fase | Wat | Effort | Raakt |
|---|---|---|---|
| 1 | Migratie (2 kolommen), `lib/potential.ts`, aangepaste `calibrateVolumes()` (ankers + effort medium), nieuw jobtype `recalculate_potential` + trigger vanuit `generate_report`, weergave op analyse- en content-niveau | ~2-3 d | `lib/pipeline/prompts.ts`, `lib/jobs/handlers.ts`, `lib/jobs/types.ts`, `score-panel.tsx`, `topics-panel.tsx`, `why-this-page.tsx` |
| 2 | De Kansen-lijst (`opportunities.ts`) laten sorteren op potentiescore in plaats van (of naast) het huidige gewicht uit de aanbevelingen | ~1 d | `lib/opportunities.ts`, `lib/insights-data.ts` |
| 3 (apart besluit) | Contentplan-volgorde en/of de gewogen zichtbaarheidsscore laten overstappen van de 3-bandenschatting naar de nieuwe index | ~2 d | `lib/pipeline/plan-build.ts`, `lib/pipeline/prompt-weight.ts` |

## 7. Verificatiecriteria

| # | Criterium |
|---|---|
| 1 | Twee analyses van hetzelfde profiel, met aantoonbaar verschillend zoekvolume qua onderwerp, krijgen na de herberekening een index die dat verschil weerspiegelt, nagerekend tegen de vaste ankers |
| 2 | Een derde analyse die klaar komt met een duidelijk hoger zoekvolume, verlaagt aantoonbaar de index van de twee bestaande onderwerpen (niet hun ruwe `volume_estimate`, wel hun `search_volume_index`) |
| 3 | De potentiescore van een onderwerp is nooit hoger dan wanneer het zichtbaarheidsgat 0 is (score dan exact 0, geen afronding die iets anders dan 0 toont) |
| 4 | Een profiel zonder herberekening (nog maar 1 analyse, eerste rapport nog niet klaar) toont "nog niet te bepalen", nooit een getal |
| 5 | Twee pagina's binnen hetzelfde onderwerp met verschillende doelvragen tonen een verschillende potentiescore, gelijk zoekvolume, ander zichtbaarheidsgat |
| 6 | De herberekening kost één AI-aanroep per keer, niet één per onderwerp, en draait nooit op het kritieke pad van een meting |
