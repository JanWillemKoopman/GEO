# Echt zoekvolume via DataForSEO: wat het kost, waar het past, en wat het niet oplost

**Status:** onderzocht en uitgewerkt, nog niets gebouwd. 25 augustus 2026.
**Aanleiding:** vraag van de product owner: kunnen we echte zoekvolumes ophalen in plaats van ze
door het model te laten schatten, en waar in de app is dat het meest waard.

**Antwoord in één alinea.** Ja, en het is spotgoedkoop: één verzoek van maximaal 1.000 zoekwoorden
kost $0,09, en alle 29 onderwerpen die er vandaag in de database staan passen in dat ene verzoek.
Een jaar lang elke maand verversen kost ongeveer een dollar, tegenover $0,82 voor één enkele
meetronde. De prijs is dus geen argument, in geen enkele richting. Het echte vraagstuk zit ergens
anders: **96% van de vragen die ORBIT ENGINE meet is een volzin van gemiddeld 96 tekens**, en daar
geeft Google Ads vrijwel zeker geen zoekvolume voor terug. Echt zoekvolume past daarom niet op de
vraag, maar op het **onderwerp** en op het **zoekwoordcluster eronder**, en dat is precies de laag
waar de potentiescore zijn volumehelft al berekent. Daar is het een rechtstreekse vervanging van een
AI-gok door een meting, en dat maakt de score voor het eerst vergelijkbaar tussen merken in plaats
van alleen binnen één merk.

---

## 1. Wat er vandaag staat, en waar de gok zit

Zoekvolume zit nu op drie plekken in de app, alle drie gevoed door hetzelfde model.

| Waar | Wat het is | Hoe het nu tot stand komt |
|---|---|---|
| `prompts.volume_estimate` | Ruw getal 0-100 per vraag | `calibrateVolumes()`, één AI-aanroep per analyse, relatief binnen die analyse |
| `prompts.volume_band` | hoog, midden, laag | Afgeleid van dat getal (`bandFromEstimate()`), voedt `promptWeight()` en dus de gewogen zichtbaarheidsscore |
| `profile_topics.search_volume_index` | Getal 0-100 per onderwerp | `recalibrateSearchVolume()`, één AI-aanroep per merk over alle onderwerpen samen, voedt de potentiescore |

`lib/pipeline/volume.ts` is eerlijk over wat dit is: "het model heeft geen zoekvolumedata, het heeft
een gevoel". De drie banden zijn er in augustus gekomen om precies die schijnprecisie weg te halen.
`docs/tasks/potentiescore.md` §0 zegt hetzelfde nog een keer: het probleem was dat de klant een
LLM-gok voor een meting aanzag.

**Er zitten twee gaten in die oplossing, en DataForSEO dicht ze allebei.**

Het eerste: de schaal is relatief binnen één merk. `potentiescore.md` §5 keuze 1 legt dat vast als
bewuste keuze ("zoekvolume van wasmachines en van fysiotherapie zijn geen vergelijkbare markten"),
maar het is een keuze die uit een beperking voortkwam, niet uit een wens. De GEO Prospect Engine
heeft die vergelijking straks wél nodig: `geo-prospect-engine.md` §10.3 en §23 punt F noteren twee
keer dat de omvang van de vraag alleen als schatting getoond mag worden, "echte zoekvolumes zijn in
ORBIT ENGINE bewust niet gebouwd".

Het tweede: het cijfer is niet controleerbaar. Een klant die vraagt "waar komt 68 vandaan" krijgt nu
een zin van het model. Met DataForSEO krijgt hij een zoekwoord met een aantal erachter.

---

## 2. Wat DataForSEO levert en wat het kost

Pay-as-you-go, geen abonnement, geen minimumafname per maand. Minimale storting $50, en $5 gratis
tegoed bij aanmelden. De vier onderdelen die voor ORBIT ENGINE relevant zijn:

| Onderdeel | Endpoint | Prijs | Per verzoek |
|---|---|---|---|
| **Google Ads zoekvolume** | `keywords_data/google_ads/search_volume/live` | **$0,09 per verzoek** (wachtrij: $0,06) | tot **1.000 zoekwoorden**, prijs is gelijk voor 1 of 1.000 |
| **Zoekwoorden bij een zoekwoord** | `keywords_data/google_ads/keywords_for_keywords/live` | per verzoek, zelfde familie | max 20 zaadwoorden, tot 20.000 suggesties terug |
| **DataForSEO Labs** (zoekintentie, moeilijkheidsgraad, ideeën) | `dataforseo_labs/google/...` | **$0,012 per taak + $0,00012 per regel** | tot 1.000 per verzoek, antwoord in ~2 seconden |
| **AI-zoekvolume** | `ai_optimization/ai_keyword_data/keywords_search_volume/live` | **$0,01 per taak + $0,0001 per zoekwoord** | tot 1.000, afgeleid uit "Mensen vragen ook"-statistiek |

Wat er bij het zoekvolume terugkomt per zoekwoord: het gemiddelde maandvolume, **48 maanden
historie per maand uitgesplitst** (gratis meegeleverd, geen apart verzoek), de concurrentiegraad
0-100, de CPC en de bodemprijs en bovenprijs voor een advertentie bovenaan.

### De rekensom op de echte aantallen van vandaag

Nagerekend op productie, 25 augustus 2026: 11 merkprofielen, 29 onderwerpen, 4 lopende analyses,
378 actieve vragen.

| Wat | Aantal verzoeken | Kosten |
|---|---|---|
| Alle 29 onderwerpen, één keer | 1 | **$0,09** |
| Alle 29 onderwerpen, elke maand een jaar lang | 12 | **$1,08** |
| Zoekwoordcluster onder alle 29 onderwerpen (20 zaadwoorden per verzoek) | 2 | **$0,18** |
| Alle 378 vragen langs het AI-zoekvolume | 1 | **$0,05** |
| Zoekintentie van alle 378 vragen via Labs | 1 | **$0,06** |

**Bij honderd merken verandert dit nauwelijks.** Honderd merken met acht onderwerpen is 800
zoekwoorden, en dat past nog steeds in één verzoek van $0,09 per maand. De prijs schaalt met het
aantal verzoeken, niet met het aantal zoekwoorden, en 1.000 zoekwoorden per verzoek is ruim boven
alles wat dit product de eerste jaren nodig heeft. Voor de clusters schaalt het wel mee: 20
zaadwoorden per verzoek betekent bij 800 onderwerpen 40 verzoeken, ongeveer $3,60, eenmalig per
onderwerp en niet per maand.

**Ter vergelijking, zodat de orde van grootte klopt:** één meetronde van één analyse kost ~$0,82,
waarvan ~94% in `web_search` gaat zitten. Het volledige DataForSEO-verbruik van een heel jaar bij de
huidige klantenportefeuille kost minder dan drie meetrondes.

### Waarom DataForSEO en niet iets anders

| Aanbieder | Toegangsdrempel | Oordeel |
|---|---|---|
| **DataForSEO** | $50 storting, geen abonnement | Gekozen. Betaal per verzoek, geen plafond, geen contract, gedocumenteerde REST-API met JSON |
| Google Ads API rechtstreeks | Gratis, maar vereist een goedgekeurd ontwikkelaarstoken en een adverterend account | Zonder advertentiebesteding geeft Google alleen brede bandbreedtes terug in plaats van getallen. De goedkeuringsprocedure kost meer tijd dan de API ooit aan geld bespaart |
| Semrush API | Minimaal $549 per maand vóór de eerste API-eenheid | Buiten proportie voor een getal dat we per maand één keer nodig hebben |
| Keywords Everywhere | $84 per jaar voor 100.000 tegoeden | Werkt, maar rekent per teruggegeven zoekwoord in plaats van per verzoek, en dat is precies de verkeerde kant op voor clusteronderzoek |

---

## 3. De harde beperking, en waarom die het ontwerp bepaalt

**ORBIT ENGINE meet vragen, Google verkoopt zoekwoorden.** Dat zijn twee verschillende dingen, en
het verschil is meetbaar in de eigen database.

Van de 378 actieve vragen begint er 364 met een vraagwoord: 96%. De gemiddelde lengte is 96 tekens.
Een willekeurige greep:

> "Wat kost het gemiddeld om een cv-ketelstoring in Eindhoven te laten oplossen, en welke aanbieder
> rekent transparante voorrijkosten?"

> "Wanneer is het financieel voordeliger om een fiets te huren via een abonnement dan om zelf een
> fiets te kopen?"

Google Ads geeft hier vrijwel zeker `null` op terug. DataForSEO documenteert dat zelf ("Google Ads
may return no data for certain groups of keywords") en Keyword Planner rapporteert sowieso niets
onder ongeveer tien zoekopdrachten per maand. Een implementatie die deze 378 zinnen naar het
zoekvolume-endpoint stuurt, krijgt 378 keer niets terug en heeft dan een dure manier gebouwd om
`null` te produceren.

**De onderwerpen zijn wél zoekwoorden.** Dat is de vondst. Zo staan ze er nu in:

> Cv-ketel onderhoud · Cv-ketel storing oplossen · Auto leasen · Bedrijfswagen kopen ·
> Occasion leasen · Auto financieren · Zakelijke mobiliteit regelen

Dit zijn precies de termen waarop Keyword Planner wél levert. En het is precies de laag waar
`profile_topics.search_volume_index` al leeft, dus waar de potentiescore zijn volumehelft vandaan
haalt. De aansluiting is er al, alleen de bron deugt niet.

**Twee valkuilen die vooraf bekend zijn en in de code moeten landen:**

1. **Geen `language_code` meesturen.** DataForSEO heeft in een eigen blogbericht vastgelegd dat
   Google sinds kort `null` teruggeeft op alle velden zodra je bij het zoekvolume-endpoint een taal
   meestuurt. Alleen `location_name: "Netherlands"` of `location_code: 2528`, verder niets. Dit is
   het soort detail dat je één keer verkeerd doet en dan een week zoekt.
2. **Volume is landelijk, de klant is dat niet.** Een installateur in Eindhoven heeft niets aan het
   Nederlandse volume voor "cv-ketel onderhoud". DataForSEO ondersteunt locatiecodes op stads- en
   provincieniveau, en `BrandContext.serviceRegions` bestaat al in `lib/pipeline/prompts.ts`. Het
   werkgebied van het merk hoort dus de locatiecode te bepalen, niet een vaste 2528.

---

## 4. Het ontwerp: waar echt volume landt, en waar niet

Drie lagen, met bij elke laag een expliciet antwoord op de vraag "is dit gemeten of geschat".

```
LAAG 1  ONDERWERP            "Cv-ketel onderhoud"
        Google Ads volume, locatie uit het werkgebied
        GEMETEN. Vervangt de AI-schatting in search_volume_index.
                │
LAAG 2  CLUSTER              "cv ketel onderhoud kosten", "onderhoudsbeurt cv ketel", ...
        keywords_for_keywords, per onderwerp eenmalig
        GEMETEN. Onderbouwt laag 1 en voedt de contentbriefing.
                │
LAAG 3  VRAAG                "Wat kost het gemiddeld om een cv-ketelstoring..."
        Geen eigen volume. Krijgt de band van het cluster-zoekwoord
        dat het beste in de vraag past, anders van het onderwerp.
        AFGELEID, en zo gelabeld.
```

### Laag 1: het onderwerp krijgt een gemeten volume

Nieuwe kolommen op `profile_topics`, additief (conventie 4):

| Kolom | Betekenis |
|---|---|
| `search_volume_monthly` | Het echte gemiddelde maandvolume, ruw. Nooit rechtstreeks getoond als het de enige bron is |
| `search_volume_source` | `dataforseo` of `ai_estimate`. **Verplicht bij elk getal op elk scherm** |
| `search_volume_location` | De locatiecode waarop gemeten is, zodat "landelijk" en "Eindhoven" niet stilzwijgend door elkaar lopen |
| `search_volume_cpc` | De CPC in euro's, de prijs die de markt zelf voor deze vraag betaalt |
| `search_volume_peak_month` | De maand met het hoogste volume uit de 48 maanden historie |

`search_volume_index` blijft bestaan en blijft 0-100, maar wordt anders gevuld.

**De omrekening: logaritmisch, met een vast anker.** Het maandvolume rechtstreeks op 0-100 leggen
werkt niet: één onderwerp van 40.000 per maand duwt elk ander onderwerp naar nul, en dan is de
potentiescore van alles behalve de koploper 0. De formule wordt:

```
index = round(100 × ln(1 + volume) / ln(1 + 50.000))
```

Waarom 50.000 als anker: dat is ruwweg de bovenkant van wat een consumentgerichte term in Nederland
haalt, en het is een vast getal, dus de index van vorige maand en die van deze maand liggen op
dezelfde schaal. Wat dat oplevert, ter controle tegen de ankers die nu in
`SEARCH_VOLUME_ANCHORS` staan:

| Maandvolume | Index | Bestaand anker in de prompt |
|---|---|---|
| 50.000 | 100 | "wasmachine kopen", 95-100 |
| 8.000 | 83 | "beste hypotheekadviseur in [regio]", 70-80 |
| 1.900 | 70 | |
| 100 | 43 | "dry needling bij een frozen shoulder", 40-50 |
| 10 | 22 | |
| 2 | 10 | "smalle B2B-vraag", 5-15 |

De handmatige ankers en de logaritmische schaal komen dus op vrijwel hetzelfde uit. Dat is geen
toeval maar wel een geruststelling: de nieuwe schaal zet de bestaande cijfers niet op hun kop, hij
maakt ze controleerbaar.

**⚠️ Dit is het punt waarop de potentiescore ook tussen merken vergelijkbaar wordt.** Keuze 1 uit
`potentiescore.md` §5 ("het vergelijkingsbereik is één merk") vervalt daarmee, en dat is een
verbetering die verder reikt dan dit plan: de GEO Prospect Engine kan dan markten met elkaar
vergelijken op een gemeten getal in plaats van op een schatting.

### Laag 2: het cluster onder het onderwerp

Eén verzoek `keywords_for_keywords` per onderwerp bij de onboarding levert tot 20.000 verwante
zoekwoorden met volume, CPC en concurrentie. Daarvan bewaren we de bovenste 50 per onderwerp in een
nieuwe tabel `topic_keywords`. Dat is waardevol op drie plekken tegelijk:

1. **Onderbouwing van het getal.** De tooltip die nu een AI-zin toont, toont dan drie zoekwoorden
   met hun volume. Dat is het verschil tussen een bewering en een bewijs.
2. **De contentbriefing wordt beter, gratis.** `content_brief` weet nu niet op welke termen mensen
   werkelijk zoeken. Vijftig gemeten zoekwoorden per onderwerp is precies de SEO-kant die
   `docs/visie.md` belooft en die vandaag ontbreekt.
3. **De vraag krijgt zijn band.** Zit "cv ketel onderhoud kosten" letterlijk in de vraag, dan erft
   de vraag de band van dat zoekwoord in plaats van een AI-gok.

### Laag 3: de vraag houdt een afgeleide waarde

Hier verandert principieel niets, en dat is opzet. `volume_band` blijft hoog, midden of laag, want
dat is precies de precisie die eerlijk is voor een volzin. Wat verandert is de herkomst: afgeleid
van een gemeten cluster in plaats van geschat door een model. Waar geen cluster past, blijft de
AI-schatting staan, met `ai_estimate` als bron.

**Het AI-zoekvolume-endpoint is een aparte overweging, geen vervanging.** DataForSEO leidt dat af
uit "Mensen vragen ook"-statistiek, niet uit de LLM's zelf. Dat is dichter bij de vraagvorm die dit
product meet, maar het is een andere meting dan Google-volume en de twee mogen nooit in hetzelfde
getal terechtkomen. Voor $0,05 over alle 378 vragen is het het proberen waard in fase 4, als apart
gelabeld cijfer naast het Google-volume.

---

## 5. Waar het door de app heen doorwerkt

Zeven plekken, gesorteerd op hoeveel het oplevert.

| # | Plek | Wat er verandert | Waarde |
|---|---|---|---|
| 1 | **Potentiescore** (`lib/potential.ts`, `search-demand.ts`) | De volumehelft wordt een meting. Het hele mechanisme blijft staan | Hoog. Dit is het getal dat de kansenlijst en het contentplan sorteert |
| 2 | **Vergelijkbaar tussen merken** | Absolute schaal maakt merken onderling vergelijkbaar | Hoog. Ontgrendelt de marktomvang in de Prospect Engine |
| 3 | **Contentplan, seizoen** (`lib/plans.ts`, `plan-schedule.ts`) | 48 maanden historie geeft de piekmaand per onderwerp. Het plan zet een onderwerp twee maanden vóór zijn piek | Hoog, en gratis: de data komt sowieso mee |
| 4 | **`promptWeight()`, besluit 3b** | `VALUE_FACTOR` is nu een handmatige tabel per intentie. CPC is de prijs die de markt zelf betaalt, dus een gemeten koopwaarde | Middel. Lost het openstaande besluit uit `potentiescore.md` §6 op, maar raakt de historische trendlijn |
| 5 | **Contentbriefing** (`content_brief`) | Vijftig gemeten zoekwoorden per onderwerp in plaats van niets | Middel, en de eerste echte SEO-component in het product |
| 6 | **GEO Prospect Engine** (§10.3, §23 punt F) | "Omvang van de vraag" wordt gemeten in plaats van geschat | Middel, wordt hoog zodra die module gebouwd wordt |
| 7 | **Search Console-koppeling** | `clicks / volume` is marktaandeel in Google, naast het aandeel in AI-antwoorden | Laag nu, hoog richting de visie: dit is de brug tussen SEO en GEO |

**Wat we niet doen:** de gewogen zichtbaarheidsscore met terugwerkende kracht herrekenen. Die
afweging staat al opgeschreven in `potentiescore.md` §4a en verandert hier niet: `weighted_score`
draagt de trendlijn die de klant al maanden ziet, en die laten meebewegen met een nieuwe rekenwijze
verandert periodes waar al naar gekeken is. Punt 4 hierboven geldt daarom alleen vooruit, vanaf de
eerste meting die met CPC gewogen is.

---

## 6. Wat er gebouwd wordt

### Migratie 0066, additief

```
keyword_volumes        gedeelde cache: (keyword, location_code) uniek, met search_volume, cpc,
                       competition_index, monthly_json (48 maanden), raw_json, fetched_at
topic_keywords         het cluster per onderwerp: topic_id, keyword, volume, cpc, is_seed
dataforseo_calls       kostenlogboek, één regel per verzoek, zelfde rol als ai_calls
profile_topics         + search_volume_monthly, _source, _location, _cpc, _peak_month
prompts                + volume_source (dataforseo, cluster, ai_estimate)
```

**De cache staat bewust los van het merk.** Twee merken in dezelfde markt delen zoekwoorden, en de
Prospect Engine kijkt straks naar vijftig bedrijven in één markt. Een cache op `(zoekwoord,
locatie)` maakt van vijftig verzoeken er één.

### Bestanden

| Bestand | Rol |
|---|---|
| `lib/dataforseo/client.ts` | Basic-auth met één env-variabele, geen bibliotheek. Zelfde redenering als `lib/search-console/auth.ts` |
| `lib/dataforseo/key-state.ts` | Sleutel afwezig, kapot of goed. Ontbreekt hij, dan is dat een toestand en geen fout |
| `lib/dataforseo/search-volume.ts` | Het zoekvolume-endpoint, met de cache ervoor |
| `lib/dataforseo/keyword-ideas.ts` | Het cluster per onderwerp |
| `lib/volume-scale.ts` | **Puur, zonder `server-only`** (conventie 2): de logaritmische omrekening, de bandafleiding, de piekmaand uit 48 maanden. Alles wat de uitkomst bepaalt, testbaar vanuit `scripts/test-unit.ts` |
| `lib/pipeline/search-demand.ts` | Aangepast: DataForSEO eerst, de bestaande AI-aanroep als vangnet |

### Taken

Eén nieuw taaksoort, `keyword_volume_sync`, per profiel per dag ontdubbeld, precies het patroon van
`gsc_sync`. **Geen zware taak**: het is een HTTP-verzoek plus een bulk-upsert, geen AI-aanroep,
dus conventie 7 wordt niet geraakt. Getriggerd op dezelfde plek als de bestaande
`recalculate_potential`, en daarnaast eenmalig na `propose_topics` voor de clusters.

### Het vangnet in code, niet in de prompt

Conventie 1 vertaald naar deze koppeling, vier regels die de code afdwingt:

1. Een zoekvolume zonder `search_volume_source` komt nooit op een scherm.
2. Geeft DataForSEO `null`, dan wordt de waarde `null` en valt de app terug op de AI-schatting met
   het label `ai_estimate`, nooit op 0 (conventie 3).
3. Een cijfer ouder dan 35 dagen wordt opnieuw opgehaald, en tot die tijd getoond met zijn
   ophaaldatum (conventie 9, idempotentie).
4. De koppeling staat nooit op het kritieke pad van een scherm. Faalt DataForSEO, dan verandert er
   niets aan wat de klant ziet behalve de herkomst van het getal.

---

## 7. Bouwvolgorde

| Fase | Wat | Beslispunt |
|---|---|---|
| **0** | **Meten vóór bouwen.** Account, $50 storting, één wegwerpscript dat 29 echte onderwerptitels en 30 echte vragen door het endpoint haalt en telt hoeveel er een volume terugkrijgen | **Dit is de belangrijkste stap.** Krijgen de onderwerpen volume terug, dan gaat fase 1 door. Krijgen ze dat niet, dan stopt dit plan hier en is er $50 uitgegeven in plaats van drie bouwdagen |
| **1** | Migratie 0066, client, cache, onderwerpvolume, logaritmische index, herkomstlabel op elk scherm dat het getal toont | De potentiescore rust dan op een meting |
| **2** | Clusters per onderwerp, `topic_keywords`, de vraagband uit het cluster, de zoekwoorden in de contentbriefing | |
| **3** | Seizoen: piekmaand uit de historie stuurt de volgorde van het contentplan | |
| **4** | CPC in `promptWeight()` (besluit 3b), AI-zoekvolume als apart gelabeld cijfer, marktomvang voor de Prospect Engine | Punt 4 raakt de trendlijn en verdient een eigen afweging |

### Verificatiecriteria

| # | Criterium |
|---|---|
| 1 | Fase 0 meet en noteert welk aandeel van de onderwerptitels en welk aandeel van de vragen daadwerkelijk een volume terugkrijgt. Geen enkel getal in dit plan blijft staan zonder die meting |
| 2 | Een onderwerp met een gemeten volume toont op elk scherm de bron en de ophaaldatum, nooit een kaal getal |
| 3 | Twee merken in verschillende markten met een aantoonbaar verschillend zoekvolume krijgen een index die dat verschil weerspiegelt, over merkgrenzen heen |
| 4 | Een onderwerp waarvoor DataForSEO niets levert, toont de AI-schatting mét dat label, en nooit een 0 |
| 5 | Een tweede merk in dezelfde markt kost geen extra verzoek: de cache wordt aantoonbaar geraakt |
| 6 | Valt de koppeling weg (sleutel eruit, dienst plat), dan blijft elk scherm werken en verandert alleen de herkomst van het getal |
| 7 | De kosten per maand staan in `dataforseo_calls` en zijn na te rekenen tegen het DataForSEO-dashboard |
| 8 | De piekmaand per onderwerp is met de hand nagerekend tegen de 48 maanden ruwe historie, op minstens één echt onderwerp |

---

## 8. Wat de eigenaar zelf moet doen, buiten Claude Code om

1. Account aanmaken op dataforseo.com en $50 storten. Er staat $5 gratis tegoed op, genoeg voor
   fase 0 zonder storting, maar de storting is nodig voordat er iets in productie draait.
2. De login en het wachtwoord uit het dashboard in Vercel zetten als één env-variabele,
   `DATAFORSEO_AUTH`, in de vorm `login:wachtwoord`. Eén variabele en niet twee, om dezelfde reden
   als bij `GOOGLE_SERVICE_ACCOUNT_JSON`: wat je in één keer kopieert, gaat vaker goed.
3. Beslissen over fase 4, de CPC-weging: dat cijfer beweegt de trendlijn die klanten al zien.

---

## 9. Twee dingen die dit plan niet oplost, en die niet weggeschreven moeten worden

**Zoekvolume is Google, geen AI.** Dit product meet zichtbaarheid in AI-antwoorden. Google-volume is
een goede benadering van hoe groot een vraag is, want mensen die het aan ChatGPT vragen zijn grofweg
dezelfde mensen die het aan Google vragen. Maar het is een benadering, en zodra de app "zoekvolume"
naast "AI-zichtbaarheid" zet, moet de tekst eromheen zeggen dat het eerste bij Google gemeten is.
Anders belooft het scherm een meting van AI-gebruik die niet bestaat.

**Een afhankelijkheid erbij.** De app hangt vandaag aan OpenAI, Supabase, Vercel, Resend en
optioneel Google Search Console. DataForSEO wordt de zesde. Dat is te dragen omdat de koppeling in
opzet niet-blokkerend is en de data in een eigen cache staat, maar het is geen gratis toevoeging:
het is een sleutel die kan verlopen, een dienst die plat kan gaan en een rekening die moet worden
bijgehouden. Verificatiecriterium 6 bestaat precies daarom.
