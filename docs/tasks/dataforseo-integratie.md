# Echte zoekvolumes via DataForSEO: mogelijkheden, prijs en waar het in de app landt

**Status:** onderzoek en plan, nog niet gebouwd. **Opgesteld:** 25 augustus 2026 · **Aanleiding:**
vraag van de product owner om uit te zoeken hoe DataForSEO in ORBIT ENGINE past, wat het kost, en
waar het naast de potentiescore nog meer waarde toevoegt.

Antwoord in één alinea: **DataForSEO is geen vervanging van één functie, het is een derde
databron naast wat er al is.** Search Console (al gebouwd) zegt waarop de klant nú al gevonden
wordt. De AI-meting (al gebouwd) zegt hoe zichtbaar het merk is in AI-antwoorden. DataForSEO zegt
hoe vaak er in totaal gezocht wordt, ook naar dingen waar de klant nu nergens op scoort, en wie daar
wél op scoort. Van de drie is dat de enige die vandaag nog een LLM-gok is (`lib/pipeline/
search-demand.ts`, `lib/pipeline/volume.ts`). Dit plan zet uiteen wat DataForSEO daadwerkelijk
levert, wat het kost bij de omvang van vandaag en bij twintig merken, en op welke vier plekken in de
app een gemeten getal een geschat getal vervangt of aanvult.

Dit plan werkt Sprint 8 uit `docs/tasks/ontwikkelplan-visie.md` verder uit. §6 van dat document
had de prijsvergelijking tussen leveranciers al gedaan (18 augustus) en koos DataForSEO. Dit
document herhaalt die keuze niet, het gaat één laag dieper: welke endpoints precies, wat ze exact
kosten, en de volledige technische en UI-vertaling naar de vier plekken waar zoekvolume in de app
al een rol speelt.

---

## 1. Wat er vandaag al staat, en waarom dit geen nieuw fundament is

Drie stukken bestaan al, dit plan vervangt of voedt ze, het bouwt niets opnieuw.

**De potentiescore (`docs/tasks/potentiescore.md`, af sinds 13 augustus).** Elk onderwerp van een
merk krijgt een `search_volume_index` (0-100), herberekend door één AI-aanroep die alle
onderwerpen van een merk relatief tegen elkaar afzet, met vaste ankerpunten
(`SEARCH_VOLUME_ANCHORS` in `lib/pipeline/prompts.ts`). Het document zegt dat zelf met zoveel
woorden (§0): *"Het model heeft geen zoekvolumedata, het heeft een gevoel."* De potentiescore is
vandaag dus een eerlijk vergelijkbare, maar volledig geschatte 0-100-schaal.

**De volumebanden (`lib/pipeline/volume.ts`, sinds 2 augustus).** Per losse vraag schat het model
een grove band (hoog/midden/laag), die meeweegt in `promptWeight()` en dus in de gewogen
zichtbaarheidsscore die al maanden op elk scherm staat. Ook hier: een gok, bewust grof gehouden
zodat hij niet meer precisie claimt dan hij heeft.

**De GEO Prospect Engine (`docs/tasks/geo-prospect-engine.md` §10.3, nog niet gebouwd).** Het
marktrapport dat naar een sales-prospect gaat, weegt intenties mee op geschatte frequentie. Het
document waarschuwt zichzelf al: *"Een verzonnen precies getal in een verkoopmail is niet te
herstellen als de prospect het narekent."* Dit is de plek waar een gemeten getal het hardst telt,
want hier controleert een buitenstaander het cijfer.

Wat er nog nergens is: een manier om te ontdekken naar wélke zoektermen een merk zou moeten
verlangen (nieuwe onderwerpen buiten wat het model al bedacht) en wat een concurrent wél weet te
scoren waar dit merk niet scoort. Dat zijn geen vervangingen van een bestaand getal, dat is nieuwe
functionaliteit die vandaag helemaal ontbreekt.

---

## 2. Wat DataForSEO precies levert

DataForSEO is geen los product maar een verzameling losstaande API's, per aanroep afgerekend. Voor
ORBIT ENGINE zijn vier endpoints relevant, elk met een ander doel in de app.

| Endpoint | Wat het doet | Relevant voor |
|---|---|---|
| **Google Ads Search Volume** | Exact zoekvolume, CPC en concurrentie voor een lijst zoektermen, rechtstreeks uit Google Keyword Planner-data | De potentiescore verankeren met een gemeten getal in plaats van een gok |
| **Keyword Ideas** (DataForSEO Labs) | Van één of meer zaadwoorden (tot 200 per aanroep) naar tot 1.000 verwante zoektermen, elk met volume, trend, concurrentie, CPC, zoekintentie en keyword difficulty | Nieuwe onderwerpen en long-tail vragen ontdekken die het model zelf niet bedacht, voer voor het contentplan |
| **Ranked Keywords** (DataForSEO Labs) | Voor een concurrent-domein: alle zoektermen waar dat domein op scoort, met positie en geschat verkeer | Concurrentieanalyse (`app/(app)/merk/[id]/analytics/concurrenten/`) en marktomvang in de GEO Prospect Engine |
| **Search Intent** (DataForSEO Labs) | Classificeert een zoekterm als informatief, navigatief, commercieel of transactioneel | Optioneel: een tweede, gemeten blik naast de LLM-classificatie van `intentType`, niet als vervanging (conventie 1: een garantie erbij, geen garantie eraf) |

**Wat het niet is: geen abonnement.** Elke aanroep wordt los afgerekend van een vooraf opgewaardeerd
tegoed. Er is een gratis proefperiode: bij registratie krijgt een account $1 tegoed en toegang tot
een gratis sandbox (nepdata, echte respons-vorm) om de integratie te bouwen en te testen zonder te
betalen. Een eerste echte opwaardering is minimaal $50.

**Twee snelheidsniveaus, alleen relevant voor Search Volume.** Standard Queue levert binnen 1 tot 3
uur en kost $0,06 per aanroep van maximaal 1.000 zoektermen. Live levert binnen enkele seconden en
kost $0,09 per aanroep, met een limiet van 12 aanroepen per minuut. Niets in ORBIT ENGINE staat op
het kritieke pad van een klantscherm (conventie: geen zware aanroep vertraagt wat de klant al ziet),
dus Standard is hier steeds de juiste keuze, niet Live.

Bronnen: [DataForSEO Google Ads API-pricing](https://dataforseo.com/pricing/keywords-data/google-ads) ·
[Search Volume live-endpoint](https://docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live/) ·
[DataForSEO Labs-pricing](https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api) ·
[Keyword Ideas-endpoint](https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_ideas/live/) ·
[Ranked Keywords-endpoint](https://docs.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live/) ·
[gratis proeftegoed](https://dataforseo.com/help-center/how-does-your-free-unlimited-trial-work).

⚠️ **Een vraag is geen zoekterm, en dat bepaalt wat er wél en niet naar de API mag.** Google Ads
geeft alleen een getal terug voor iets dat mensen daadwerkelijk in Google typen: een kort begrip als
"cv-ketel onderhoud", geen volzin. Wat ORBIT ENGINE vandaag als `prompts.text` opslaat is expliciet
het tegenovergestelde: een volledige vraag, geschreven "zoals iemand die dit bedrijf nog niet kent
'm zou stellen" (`lib/pipeline/prompts.ts`), voor een AI-assistent, niet voor een zoekmachine. Wie
die 378 vragen rechtstreeks naar Search Volume stuurt, betaalt voor een aanroep die voor vrijwel elke
regel niets teruggeeft. **De juiste invoer is `profile_topics.title`**, die is al kort en
zoekwoordachtig ("Cv-ketel onderhoud", zie `propose-topics.ts` regel 41: "kort, geen zin"), aangevuld
met de verwante zoektermen die Keyword Ideas er zelf bij levert (§4b). De losse vraag krijgt in dit
plan dus nooit rechtstreeks een gemeten volume, alleen het onderwerp erboven, precies zoals
`potentiescore.md` §5 keuze 4 al vastlegde: één kalibratieniveau, per onderwerp.

---

## 3. Wat het kost, uitgerekend voor vandaag en voor twintig merken

Rekenbasis zoals in `ontwikkelplan-visie.md` §6: 5-8 clusters per merk, 2.500 zoektermen per merk na
uitbreiding naar long-tail. Drie gebruiksvormen, elk met een eigen ritme.

| Gebruik | Aanroep | Ritme | Kosten bij 1 merk | Kosten bij 20 merken |
|---|---|---|---|---|
| **Potentiescore verankeren** | Search Volume, Standard, $0,06 per 1.000 termen | maandelijks | ~$0,15/maand (2.500 termen ≈ 3 aanroepen) | **~$3/maand** |
| **Nieuwe onderwerpen ontdekken** | Keyword Ideas, $0,012 + $0,00012 per resultaat | eenmalig per nieuw onderwerp, niet maandelijks | ~$0,10 per ontdekkingsronde (5-8 zaadwoorden, 700 resultaten) | ~$2 bij een eerste ronde voor alle twintig, daarna alleen bij nieuwe onderwerpen |
| **Concurrentiegat in kaart** | Ranked Keywords, $0,012 + $0,00012 per resultaat | per kwartaal, 2-3 concurrenten per merk | ~$0,21/kwartaal (3 concurrenten × 500 termen) | ~$4,20/kwartaal, **~$1,40/maand omgerekend** |
| **Totaal, alle drie samen** | | | | **~$6,50 tot $8 per maand bij twintig merken** |

Dat is nog altijd verwaarloosbaar tegen het bestaande kostenplafond van €50 per account per maand
(`lib/spend-rules.ts`), en tegen de ~$0,82 die één meetronde nu al kost. **De conclusie uit
`ontwikkelplan-visie.md` §6 blijft overeind, ook met de bredere functionaliteit uit dit plan
meegerekend: de rem zit niet op geld.** Het startsaldo van $50 dekt bij twintig merken meer dan een
jaar gebruik, ook met alle drie de toepassingen actief.

⚠️ **Lees de voorwaarden na vóór er wordt opgewaardeerd.** Dit stond al in §6 en blijft de enige
niet-technische horde: sommige leveranciers verbieden het doorgeven van hun cijfers aan derden, en
dit product toont ze letterlijk aan de klant, op het scherm en straks mogelijk in een verkoopmail
van de GEO Prospect Engine. Dat is een juridische controle, geen technische.

---

## 4. Waar het landt: vier plekken, in volgorde van waarde

### 4a. De potentiescore verankeren (grootste hefboom, kleinste bouwstap)

**Wat verandert.** `recalibrateSearchVolume()` in `lib/pipeline/search-demand.ts` krijgt een eerste
stap vóór de bestaande AI-aanroep: voor elk onderwerp wordt geprobeerd het echte zoekvolume van zijn
zwaarste zoektermen op te halen (cache-first, zie §5). Zijn die er voor een onderwerp, dan wordt
`search_volume_index` afgeleid van het gemeten getal (genormaliseerd 0-100 binnen de onderwerpen van
dit merk, dezelfde eerlijke, per-merk schaal als vandaag) en krijgt `profile_topics.volume_source`
de waarde `meting`. Ontbreken ze (nieuw onderwerp, nog geen zoektermen bekend, of de API is niet
beschikbaar), dan blijft de bestaande AI-kalibratie het vangnet en blijft `volume_source` op
`model` staan.

**Waarom dit conventie 1 omgekeerd toepast.** Normaal is een promptinstructie de intentie en code de
garantie. Hier is het net andersom en dat is bewust: een gemeten getal is het primaire pad, het
model is het vangnet voor wat nog niet gemeten is. Dezelfde onderliggende regel blijft gelden:
onbekend is een betere waarde dan een verkeerde (conventie 3), dus een onderwerp zonder gemeten data
valt terug op een gelabelde schatting, nooit op een verzonnen gemeten getal.

**Wat er NIET verandert, en dat is de winst.** `lib/potential.ts`, de Kansen-lijst
(`lib/opportunities.ts`), de contentplanvolgorde (`lib/pipeline/plan-build.ts`) en alle drie de
schermen uit `components/potential-metrics.tsx` lezen nu al `search_volume_index` als invoer. Geen
van die plekken hoeft aangepast te worden: zodra de kolom een gemeten getal bevat in plaats van een
geschat getal, wordt de hele keten er zonder verdere wijziging nauwkeuriger van. Dat is precies het
voordeel van de bestaande architectuur uit `potentiescore.md`: één plek levert het getal, de rest
consumeert het.

**Wat wél een kleine UI-wijziging is.** De tooltip die nu de `search_volume_reasoning`-zin toont
(hoofdstuk 01 van het analysedossier, `why-this-page.tsx`, `loop-blocks.tsx`) krijgt een label erbij
op basis van `volume_source`: "gemeten via Google Ads" tegenover "geschat door ORBIT ENGINE". Dat is
geen nieuwe garantie, het is de bestaande eerlijkheid over onzekerheid (conventie 3) zichtbaar maken
op het scherm, precies zoals de klant nu al ziet welke vraag hoog of laag scoort.

### 4b. Nieuwe onderwerpen ontdekken

**Wat er nu ontbreekt.** De onderwerpen van een merk komen vandaag volledig uit het model
(`propose-topics.ts`, op basis van de aanbodboom en de markt). Dat model kan alleen bedenken wat het
al weet over de branche, het ziet nooit wat mensen daadwerkelijk typen in Google.

**Nieuw jobtype `keyword_discovery`** (conventie 7: een nieuwe zware aanroep is een eigen jobtype).
Voert de bestaande onderwerptitels en een paar knopen uit de aanbodboom als zaadwoorden in bij
Keyword Ideas, en levert een lijst zoektermen terug met volume en zoekintentie. Die lijst voedt twee
bestaande plekken zonder dat ze zelf hoeven te veranderen: `lib/plan-backlog.ts` (contentideeën die
nog geen pagina hebben) en de onderwerpenlijst op de profielpagina, als suggestie die de consultant
kan overnemen of afwijzen. Draait niet automatisch mee met elke meting, alleen op verzoek of bij een
nieuw profiel, want dit is ontdekkend werk, geen herhaald meetwerk.

### 4b'. Wat er verder gratis meekomt in dezelfde aanroep

Search Volume en Keyword Ideas geven meer terug dan alleen een getal, zonder dat dit extra kost
(dezelfde aanroep, geen apart endpoint). Twee dingen zijn direct bruikbaar:

- **Tot 48 maanden maandelijkse geschiedenis per zoekterm.** Daarmee is de piekmaand van een
  onderwerp zichtbaar ("cv-ketel onderhoud" pikt in het najaar), en kan het contentplan
  (`lib/pipeline/plan-build.ts`) een onderwerp vóór het seizoen inplannen in plaats van na afloop.
  Vandaag bestaat die informatie niet, de volgorde van het contentplan kijkt niet naar seizoen.
- **CPC, als indicatie van commerciële waarde.** Vervangt geen bestaande tabel, maar is een gemeten
  getal op een plek waar er vandaag geen enkel getal staat.

Beide zijn een uitbreiding, geen vervanging van iets bestaands, en horen dus pas ná fase 1-2 (§6), als
bewuste toevoeging, niet als automatisch bijvangst die meteen een scherm vult.

### 4c. Het concurrentiegat

**Wat er nu ontbreekt.** `app/(app)/merk/[id]/analytics/concurrenten/` en `lib/offsite/` laten zien
wíe de concurrenten zijn en hoe zichtbaar ze zijn in AI-antwoorden. Ze laten niet zien waarop een
concurrent in gewone zoekresultaten wél scoort en dit merk niet, en dat is precies het soort kans
waar een consultant een uur strategiegesprek mee vult.

**Ranked Keywords per concurrent**, per kwartaal (geen dagelijkse ranktracker, dat staat expliciet
niet in de scope van `ontwikkelplan-visie.md` §7), gecacht net als de andere twee toepassingen. De
uitkomst is een lijst zoektermen waar de concurrent op scoort en dit merk niet, gesorteerd op
zoekvolume. Voedt hetzelfde soort kaart als de bestaande Kansen-lijst, maar dan gevuld met wat een
concurrent al bewijst dat er vraag naar is.

### 4d. De GEO Prospect Engine (nog niet gebouwd, maar dit is waar het het hardst telt)

`geo-prospect-engine.md` §10.3 waarschuwt nu al dat elke frequentieschatking in het marktrapport een
gok is, en dat een prospect die schatting kan narekenen. Zodra de GEO Prospect Engine gebouwd wordt
(zie dat document voor de volledige planning), hoort de zoekvolumelaag uit dit plan er meteen in:
niet als aparte stap, maar als dezelfde bron die §4a al gebruikt. Het marktrapport dat naar een
prospect gaat, krijgt daarmee een gemeten cijfer op de plek waar het verhaal vandaag nog leunt op
"we schatten dat dit vaak gezocht wordt".

---

## 5. De technische laag: één leverancierslaag, drie kolommen, cache verplicht

**`lib/search-demand/`**, naar het patroon van `lib/engines/`: `types.ts` (het contract, een
`SearchDemandProvider`-interface met `lookupVolume()` en `discoverKeywords()`), `dataforseo.ts` (de
daadwerkelijke HTTP-aanroepen), `registry.ts` (is de leverancier beschikbaar, op basis van
`DATAFORSEO_LOGIN`/`DATAFORSEO_PASSWORD`). Precies zoals `enginesForProfile()` vandaag al doet voor
Gemini: **zonder sleutel gedraagt de app zich exact zoals nu**, met de bestaande AI-schatting als
enige bron. Eén ketentestscenario bewijst dat, net als bij Gemini.

**Migratie `0066`, additief:**

| Tabel/kolom | Type | Betekenis |
|---|---|---|
| `keyword_demand` (nieuwe tabel) | keyword (tekst), locatie, taal, volume, cpc, competition, trend (jsonb), bron, opgehaald_op | Cache per zoekterm, locatie en taal. Verplicht, geen optionele laag: dezelfde term twee keer ophalen is twee keer betalen voor hetzelfde getal, en volumes veranderen maandelijks, niet dagelijks |
| `profile_keywords` (nieuwe tabel) | profiel, onderwerp (optioneel), zoekterm, verwijzing naar `keyword_demand` | De koppeling tussen een merk/onderwerp en de zoektermen die ervoor gemeten zijn |
| `profile_topics.volume_source` (nieuwe kolom) | `model` \| `meting`, default `model` | De belangrijkste kolom van de drie: zonder hem laat het scherm ooit een gok voor een meting doorgaan (conventie 3) |

**Rekenkunde blijft in een pure module** (conventie 2): de normalisatie van een ruw
DataForSEO-volume naar de bestaande 0-100-schaal (log-schaal, genormaliseerd tegen het hoogste
volume binnen hetzelfde profiel) hoort in `lib/potential.ts` of een nieuw, klein, `server-only`-vrij
bestand ernaast, niet verweven met de HTTP-aanroep. Alleen zo is hij vanuit `scripts/test-unit.ts`
te testen zonder een echte API-sleutel.

**Alles bewaren (conventie 8).** Elke opgehaalde rij in `keyword_demand` bewaart het ruwe
API-antwoord naast de uitgesplitste kolommen, dezelfde audit-trail-eis als elke AI-call al heeft.

---

## 6. Bouwvolgorde

| Fase | Wat | Raakt |
|---|---|---|
| 0. Valideren, vóór er gebouwd wordt | Een account aanmaken, het gratis tegoed van $1 gebruiken (geen storting nodig) om de bestaande `profile_topics.title` van een handvol echte profielen door Search Volume te halen, en te tellen hoeveel er een getal terugkrijgen. Conventie 10 (gebouwd is niet geverifieerd) toegepast vóórdat er iets gebouwd is, niet erna | geen code, alleen een testaanroep buiten de app om |
| 1. Fundament | Migratie `0066`, `lib/search-demand/` (types, dataforseo-adapter, registry), env-variabelen, test dat de app zonder sleutel identiek blijft draaien | nieuwe bestanden, `.env.example` |
| 2. Potentiescore verankeren | `recalibrateSearchVolume()` probeert eerst een meting, valt terug op de AI-kalibratie, `volume_source` zichtbaar in de tooltip | `lib/pipeline/search-demand.ts`, `components/potential-metrics.tsx`, `why-this-page.tsx`, `loop-blocks.tsx` |
| 3. Onderwerpen ontdekken | Nieuw jobtype `keyword_discovery`, voedt `lib/plan-backlog.ts` en de onderwerpenlijst als suggestie | `lib/jobs/types.ts`, `lib/jobs/handlers.ts`, `topics-panel.tsx` |
| 4. Concurrentiegat | Ranked Keywords per concurrent, per kwartaal, nieuwe kaart op de concurrentenpagina | `app/(app)/merk/[id]/analytics/concurrenten/`, `lib/offsite/` |
| 5. GEO Prospect Engine | Zodra dat document gebouwd wordt: dezelfde bron uit fase 1 en 2 hergebruiken voor het marktrapport, geen nieuwe integratie | `docs/tasks/geo-prospect-engine.md` §10.3 |

Fase 0 kost hooguit een paar aanroepen uit het gratis tegoed, dus geen storting: mislukt de toets
(weinig onderwerpen krijgen een getal), dan is er $1 uitgegeven in plaats van drie bouwdagen. Fase 1
en 2 zijn daarna de kern van dit plan en leveren de grootste hefboom voor de kleinste bouwstap: één
bestaande, al overal doorverbonden kolom (`search_volume_index`) gaat van geschat naar gemeten,
zonder dat de rest van de app hoeft te veranderen. Fase 3 en 4 zijn nieuwe functionaliteit en kunnen
onafhankelijk van elkaar en later volgen. Fase 5 heeft geen eigen bouwwerk, het is een hergebruik
zodra het andere document aan de beurt is.

---

## 7. Wat dit plan bewust niet doet

- **Geen eigen ranktracker.** Search Console geeft posities al gratis voor wat de klant nu al
  scoort (`ontwikkelplan-visie.md` §7). Ranked Keywords wordt hier alleen ingezet op
  concurrent-domeinen, per kwartaal, niet als dagelijkse trackingdienst op het eigen domein.
- **Geen vervanging van Search Console.** Dat blijft de bron voor wat er al gebeurt op de site van de
  klant. DataForSEO is de bron voor vraag die er is, ongeacht of de klant daar al op scoort.
- **Geen automatische onderwerpsaanmaak.** Fase 3 levert suggesties, geen onderwerpen die zonder
  goedkeuring het contentplan in gaan. Dat past bij de huidige autonomiegraad (`CLAUDE.md`:
  goedkeuring per stap).
- **Geen Search Intent-classificatie als vervanging van de bestaande LLM-classificatie.** Als dit
  ooit wordt toegevoegd, is het een tweede, gemeten signaal ernaast, nooit een vervanging van
  `intentType` (conventie 1: een garantie erbij, geen garantie eraf).

---

## 8. Wat de eigenaar moet beslissen of doen, buiten Claude Code om

| # | Wat | Kosten | Waarom dit niet vanzelf gaat |
|---|---|---|---|
| 1 | Account aanmaken bij DataForSEO (het gratis tegoed van $1 is genoeg voor fase 0) en de voorwaarden nalezen op het doorgeven van cijfers aan klanten | gratis om te beginnen | Een inkoop- en juridische beslissing |
| 2 | Fase 0 laten draaien en de uitkomst beoordelen: genoeg onderwerpen met een gemeten getal? | geen, valt binnen het gratis tegoed | Een go/no-go die de eigenaar neemt, niet de code |
| 3 | Eerste echte opwaardering, pas na een positieve fase 0 | minimaal $50 | Een betaling |
| 4 | `DATAFORSEO_LOGIN` en `DATAFORSEO_PASSWORD` in Vercel zetten zodra de sleutel er is | geen | Vraagt het account uit stap 1 |
| 5 | Besluiten of fase 3 en 4 (ontdekken en concurrentiegat) meteen mee bouwen of pas na fase 1-2 op productie bewezen zijn | geen | Prioriteitskeuze, geen technische |

**Klaar als (fase 1-2):** op vijf bestaande profielen ligt de AI-schatting naast het gemeten volume,
met de afwijking opgeschreven in het logboek, precies zoals Sprint 8 in `ontwikkelplan-visie.md` als
verificatiecriterium had staan. Dat cijfer is meteen het antwoord op de vraag hoe fout de gok tot nu
toe was.
