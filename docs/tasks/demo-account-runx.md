# Demo-account RunX: een klant die al twaalf maanden actief is

> Opgesteld op 1 oktober 2026 op verzoek van de eigenaar. Status: **plan, nog niets gebouwd.**
> Doel: één merk in ORBIT ENGINE dat opent alsof het een trouwe, succesvolle klant is van twaalf
> maanden, met een pakket van 10 pagina's per maand, acht clusters, een jaar meetgeschiedenis,
> 120 geplaatste pagina's en de komende drie maanden (30 pagina's) ingepland. Bouwen kost **geen
> cent** aan AI-aanroepen, zoekdata of meetrondes.

## 0. In het kort

Het demo-account wordt niet door de pijplijn gemaakt maar **ingeladen**: alle gegevens (merkprofiel,
kennis, clusters, vragen, metingen, rapporten, pagina's, plan, effectmeting, zoekverkeer) worden als
vaste databestanden in de repository gezet en door een eigen, gratis laadroute in de database gezet.
Die route maakt geen enkele AI-aanroep en kan maandelijks opnieuw draaien, zodat het account nooit
veroudert: de laatste meting is altijd "deze maand" en het plan loopt altijd drie maanden vooruit.

Drie dingen moeten **vóór** het inladen gebeuren, anders kost de demo alsnog geld of klopt hij niet:

1. **Een besluit over de naam** (§2). RunX is een echt bedrijf dat geen klant is. Een demo die aan
   prospects laat zien "zo gaat het bij RunX" terwijl RunX daar nooit van gehoord heeft, is een
   risico. Mijn advies staat in §2.
2. **Een slot op het account** (§9.1). Zonder slot plant de maandelijkse meetronde op de 1e van elke
   maand acht clusters in (ongeveer 8 × $0,82 = $6,50 per maand), en schrijft de ochtendronde de
   ingeplande pagina's van de komende tien dagen echt (ongeveer 3 pagina's per week). Dat is precies
   het geld dat deze opdracht niet mag kosten.
3. **Een proefrit van de schermen met een jaar data** (§9.4). Het rijpste merk in productie (Van den
   Udenhout, testdoorloop) heeft vandaag 2 meetperiodes, 1 rapport, 5 pagina's en 1 planmaand. Geen
   enkel scherm is ooit getoond met 13 meetpunten, 8 clusters en 150 pagina's. Reken erop dat er
   daar dingen scheef staan die eerst opgelost moeten worden.

## 1. Wat er nagezocht is, en waar dit plan op rust

Nagelopen op 1 oktober 2026 in de code en in de productiedatabase:

| Wat | Gevonden | Gevolg voor de demo |
|---|---|---|
| Rijpste merk in productie | Van den Udenhout (testdoorloop): 5 clusters, 120 vragen, 153 metingen, 2 meetperiodes, 1 rapport, 5 pagina's, 1 planmaand, 332 AI-aanroepen ($2,52) | Twaalf maanden geschiedenis is nooit door de pijplijn gegaan. Inladen is de enige manier, en de schermen zijn er nog niet op getest |
| Pakketten | 10, 20 of 40 pagina's per maand (`lib/package-sizes.ts`) | 10 is een geldig pakket, staat op `accounts.package_pages_per_month` |
| Planmaanden | `month_number` 1 tot en met 12, één lopend plan per merk (`content_plans`, `plan_months`) | Vijftien maanden past niet in één plan. Oplossing in §6.1 |
| Paginastatussen | `gepland`, `schrijven`, `ter_goedkeuring`, `goedgekeurd`, `geplaatst`, `afgewezen`, `mislukt` | Alle zeven komen in de demo voor, zodat elk label een keer te zien is |
| Effectmeting | `gestegen`, `gelijk`, `gedaald`, `te_weinig_data` (`content_impact.verdict`) | Ook `gelijk` en een enkele `gedaald` tonen, anders gelooft niemand het |
| Maandmeting | Cron op de 1e om 06:00, meet elke analyse met `tracking_enabled` en status `gemeten` of `gereed` die 21 dagen niet gemeten is | Zonder slot wordt de demo elke maand echt gemeten |
| Ochtendronde | Dagelijks 04:00, start schrijven voor pagina's op `gepland` in een goedgekeurde maand binnen tien dagen | Zonder slot worden de ingeplande pagina's echt geschreven |
| Dagbudget per account | `accounts.daily_budget_eur = 0` zet een account op slot voor alles wat een gebruiker start | Bruikbaar als tweede rem, maar remt de cronroutes niet: die starten werk zonder die vraag |
| Kennislaag | Alleen `lib/kennis/` mag in `klantkennis` schrijven, ook niet via SQL; een broncodecontrole in `scripts/test-unit.ts` bewaakt dat | Het inladen loopt via `legVast()` en de andere functies in `lib/kennis/`, niet via een SQL-bestand |
| Meetbron | Alleen ChatGPT meet live. Gemini staat klaar maar slaapt zonder sleutel | De demo toont alleen ChatGPT-metingen. Geen verzonnen Gemini- of Perplexity-cijfers |
| Publiceren | Er is geen CMS-koppeling (`merkstrategie.md` §30 punt 1). Live zetten gaat met de hand via "Meld dat hij live staat" | In de demo zijn pagina's "geplaatst" door de klant gemeld, met een adres. Nergens suggereren dat ORBIT ENGINE zelf publiceert |
| RunX openbaar | 6 winkels (Apeldoorn, Groningen, Haarlem, Tilburg, Twente, Zaandam), gratis loopanalyse bij aanschaf nieuwe schoenen, RunX Club, trainingen, events, webshop, 20+ merken (onder meer Asics, Brooks, Hoka, On, Saucony, Garmin, Coros, Maurten), blog met schoenreviews, hydratatie, compressie, HYROX, sporthorloges | Basis voor het merkprofiel. Adressen en openingstijden stonden niet op de opgehaalde pagina's: in fase 0 van de site overnemen |

## 2. Eerst beslissen: echte naam of niet

RunX bestaat, heeft zes echte winkels en weet niet dat het in ORBIT ENGINE staat. Alles wat het
account over omzet, klantvragen, interne afspraken en resultaten zegt, is verzonnen. Drie routes:

| Route | Wat het betekent | Voor | Tegen |
|---|---|---|---|
| **A. RunX als voorbeeldaccount** (advies) | Echte naam en echte openbare gegevens, met in de app een duidelijke balk "Voorbeeldaccount, opgebouwd uit openbare informatie. RunX is geen klant van Outer Orbit" en in het gesprek nooit de claim dat RunX klant is | Herkenbaar, echt aanbod, echte steden en events. En: RunX zelf is een sterke prospect, deze demo is meteen het verkoopgesprek met RunX | Verzonnen cijfers naast een echte merknaam blijven gevoelig. Niet buiten een één-op-één-gesprek tonen, niet in een campagne, niet op de website |
| B. RunX als referentieklant | Tonen alsof RunX echt klant is | Overtuigt het meest | Misleidend tegenover de prospect en schadelijk voor RunX. Doen we niet |
| C. Verzonnen keten | Zelfde opzet met een fictieve naam ("Loopwerk", zes winkels in dezelfde steden) | Geen enkel risico, ook breed te tonen | Minder herkenbaar, de echte site en de echte blog vallen weg als bewijs |

**Advies: route A**, met twee afspraken. De balk "Voorbeeldaccount" staat op elk scherm van dit merk
(één regel in de merklayout, getoond als `profiles.is_demo` aan staat). En de inhoud blijft aan de
veilige kant: geen verzonnen prijzen, retourtermijnen, garanties of keurmerken van RunX in de
pagina's (conventie 1 gaat over precies die harde feiten), geen verzonnen klantbeoordelingen, en
concurrenten alleen als grote ketens en webwinkels, nooit kleine lokale zaken met verzonnen cijfers.
Wordt het later route C, dan is dat een zoek-en-vervang in de databestanden; de opbouw verandert niet.

## 3. Het verhaal van het account

Een demo overtuigt als hij een verhaal vertelt dat de prospect in vijf minuten snapt. Het verhaal:

> **RunX begon in oktober 2025 vrijwel onzichtbaar.** Vroeg je ChatGPT "waar laat ik een
> loopanalyse doen in Apeldoorn", dan kreeg je Run2Day, een sportarts en een webwinkel. RunX werd in
> 6% van de antwoorden genoemd. Twaalf maanden en 120 pagina's later staat RunX in 36% van de
> antwoorden, en bij de vragen over een loopanalyse in de eigen zes steden zelfs in 58%. Run2Day is
> gezakt van 38% naar 27%. Van de 96 pagina's die lang genoeg live staan om te meten, zijn er 52
> aantoonbaar gestegen. De komende drie maanden staan klaar: de 4 Mijl van Groningen, de
> winterkleding, de goede voornemens van januari.

Elk cijfer daarin moet in de app terug te vinden zijn, met dezelfde waarde. Dat is de eis aan de
databestanden (§9.3): het verhaal wordt eerst vastgezet, de data volgt het verhaal, en een test
controleert dat de twee kloppen.

### 3.1 De tijdlijn van twaalf maanden

Maanden relatief aan de dag van inladen (M0 is de lopende maand, op 1 oktober 2026 dus oktober 2026).

| Maand | Wat er gebeurde | Zichtbaar in de app als |
|---|---|---|
| M-13 (sep 2025) | Merk klaargezet, onderzoekspijplijn, demogesprek, verkocht. Nulmeting op 24 september | Pre-boarding, onboardinggesprek vastgelegd, nulmeting (periode 0) |
| M-12 (okt 2025) | Start met 4 clusters, eerste 10 pagina's | Plan versie 1 actief, eerste rapport per cluster |
| M-11 (nov 2025) | Eerste effect zichtbaar op de loopanalysepagina's | Eerste `gestegen` op de stadspagina's loopanalyse |
| M-10 (dec 2025) | Jaarplan 2026 vastgesteld: plan versie 2 vanaf januari. Cluster 5 erbij (beginnen met hardlopen), op tijd voor de goede voornemens | Plan versie 1 op `gestopt`, versie 2 actief |
| M-9 (jan 2026) | Piek beginners, 10 pagina's beginnen met hardlopen | Hoogste aantal klikken in Search Console van het jaar tot dan |
| M-8 (feb 2026) | Midwinter Marathon Apeldoorn, wedstrijdschoenen | Cluster 6 erbij (wedstrijdschoenen en racen) |
| M-6 (apr 2026) | Marathonseizoen, Enschede Marathon | Score wedstrijdcluster springt omhoog |
| M-5 (mei 2026) | Trail, de Veluwe en de Twentse heuvels | Cluster 7 erbij (trailrunning) |
| M-3 (jul 2026) | Zomer, hitte, drinken | Een pagina met `gelijk` en één met `gedaald`: niet alles werkt |
| M-2 (aug 2026) | Clusters ontdekken stelt HYROX voor | Cluster 8 erbij uit `ontdekking`, met echte herkomst in de app |
| M-1 (sep 2026) | Dam tot Damloop (finish Zaandam), Tilburg Ten Miles. Jaargesprek | Gesprek vastgelegd, 3 nieuwe vragen, beste maand tot nu toe |
| M0 (okt 2026) | Lopende maand: 4 Mijl van Groningen, herfst, winterkleding | Maand goedgekeurd, pagina's in alle stadia van de keten |
| M+1, M+2 | November en december | Goedgekeurd en ter goedkeuring |

## 4. Het merkprofiel: wie RunX is volgens ORBIT ENGINE

Opbouw volgt de 60 velden van de catalogus, zoals bij Van den Udenhout op 7 september 2026. Elk veld
krijgt een herkomst: `website` waar het van runx.nl komt (met adres en letterlijk citaat), `gesprek`
waar het uit het nagespeelde onboardinggesprek komt. **Verzonnen** staat hieronder telkens met
*(fictief)* erbij, zodat bij route A duidelijk is wat niet van RunX zelf komt.

### 4.1 Identiteit en bereik

- **Naam**: RunX. **Schrijfwijzen**: RunX Hardloopwinkel, RunX Apeldoorn, RunX Groningen, RunX
  Haarlem, RunX Tilburg, RunX Twente, RunX Zaandam, Run X. **Webadres**: runx.nl.
- **Businessmodel**: `retailer`. **Bereik**: `lokaal`, met zes vestigingssteden plus de omliggende
  plaatsen als werkgebied (Apeldoorn, Deventer, Zutphen; Groningen, Haren, Assen; Haarlem,
  Heemstede, Bloemendaal, Zandvoort; Tilburg, Breda, Waalwijk; Enschede, Hengelo, Almelo; Zaandam,
  Purmerend, Amsterdam-Noord). Precies het geval waarvoor `geo-share.ts` bestaat: zonder plaatsnaam
  meet je een keten van zes winkels af tegen heel Nederland.
- **Uitsluitingen** (`name_exclusions`): "RunX" als losse hardloopapp of evenementnaam die AI met
  het merk kan verwarren. In fase 0 echt nazoeken welke namen botsen; niets verzinnen.
- **Vestiging Twente**: in fase 0 de plaats en het adres van de site halen (Enschede of Hengelo).

### 4.2 Aanbod (aanbodboom, `profile_offerings`)

Ongeveer 60 knopen in vier lagen, afgeleid van de navigatie van runx.nl (Advies, Assortiment,
Merken, Winkels):

- **Advies en service**: loopanalyse (gratis bij aanschaf nieuwe schoenen), schoenadvies,
  sokken- en zooladvies, RunX Club, trainingen en trainingsgroepen, events.
- **Schoenen**: hardloopschoenen (neutraal, stabiel), wedstrijdschoenen (carbon), trailschoenen,
  wandelschoenen.
- **Kleding en uitrusting**: hardloopkleding (zomer, winter, regen), compressie, sokken, rugzakken
  en heuptassen, verlichting.
- **Techniek**: GPS-horloges (Garmin, Coros, Polar), hartslagbanden, koptelefoons (Shokz).
- **Voeding**: gels en drank (Maurten, SiS, Torq).
- **Vestigingen**: zes knopen, één per stad, elk met de lokale events als kind.

### 4.3 Doelgroep en positionering (gesprek, deels fictief)

Vijf lezers, die terugkomen in de clusters en in de pagina's:

| Lezer | Wie | Vraag aan AI |
|---|---|---|
| De starter | Sanne, 34, Haarlem, begint in januari met hardlopen | "Welke hardloopschoenen voor beginners, en moet ik een loopanalyse laten doen?" |
| De marathonloper | Mark, 46, Apeldoorn, loopt de Midwinter Marathon | "Is een carbonschoen het waard voor een marathon van 3u30?" |
| De trailloper | Lotte, 29, Enschede | "Welke trailschoenen voor de Twentse heuvels en de Veluwe?" |
| De terugkerende loper met klachten | Henk, 57, Tilburg, scheenbeenklachten | "Kan een andere schoen helpen tegen shin splints?" |
| De HYROX-sporter | Yusuf, 31, Zaandam | "Welke schoen voor HYROX, hardloopschoen of trainingsschoen?" |

**Onderscheid** (gesprek): persoonlijk advies door lopers zelf, loopanalyse in de winkel,
breed assortiment onder één dak, zes winkels dus altijd in de buurt, eigen community met
trainingsgroepen en events. **Positionering** *(fictief geformuleerd)*: "De hardloopwinkel van
lopers, voor lopers. Of je nu je eerste 5 kilometer loopt of je tiende marathon."

### 4.4 Stem, bewijs en grenzen

- **Stem**: je en jij, enthousiast maar deskundig, ervaring van de eigen medewerkers als lopers
  ("ik liep de Endorphin Elite in Zwolle"; dat staat letterlijk op de echte blog). Stemvoorbeelden
  uit twee echte blogtitels: "Saucony Endorphin Elite 3: de schoen was klaar voor Zwolle, ik niet" en
  "Van zeurkous naar compressiekous".
- **Bewijs** *(fictief, en daarom niet als harde claim in de pagina's)*: aantal loopanalyses per
  jaar, aantal leden RunX Club, aantal trainingsgroepen per winkel. Deze staan in de kennislaag met
  status `verklaard` en gebruik `intern`, zodat de demo laat zien dat de schrijver ze kent maar niet
  zomaar in een tekst zet. Dat is een mooi demomoment op zich (§10, stap 6).
- **Grenzen** (gesprek): geen medisch advies, bij blessures altijd doorverwijzen naar een
  fysiotherapeut of sportarts; geen prijzen noemen in content (die wisselen per seizoen); geen
  merken afkraken; geen beloftes over sneller lopen.

### 4.5 Concurrenten

Alleen partijen die een AI-assistent echt noemt bij deze vragen, en alleen ketens en webwinkels:
Run2Day, Runnersworld, Decathlon, Intersport, Zalando, Bol, Sportsdirect, Brooks en Asics (als
merkwinkel of webshop). In fase 0 controleren welke ketens in de zes steden een winkel hebben; dat
bepaalt per cluster wie de lokale tegenstander is. Geen kleine zelfstandige loopwinkels: die met
verzonnen cijfers in een ranglijst zetten, raakt een echt bedrijf zonder dat het daar iets van weet.

### 4.6 Kennislaag (`klantkennis`)

Ongeveer 220 kennisitems, verdeeld zoals bij de echte merken (Van den Udenhout 261, Slotenspecialist
van Kessel 182):

| Status | Aantal | Waarvoor |
|---|---|---|
| waargenomen | ~110 | Van runx.nl, met adres en citaat (aanbod, merken, diensten, winkels) |
| verklaard | ~70 | Uit het gesprek en uit 60 beantwoorde vragen over het jaar |
| bevestigd | ~30 | Door de consultant nagelopen in het jaargesprek van september 2026 |
| afgeleid | ~10 | Intern, nooit content |

Plus 2 opgeloste conflicten (bijvoorbeeld de openingstijden van één winkel die op twee pagina's van
de site anders stonden), zodat het conflictscherm een geschiedenis heeft.

## 5. De acht clusters

Vier vanaf de start, vier in de loop van het jaar erbij, waarvan één via "Clusters ontdekken". Elk
cluster 30 vragen, verdeeld over oriëntatie, overweging en beslissing, met waar het past een
plaatsnaam (de regionale regel bij een lokaal merk, `architecture.md` §5).

| # | Cluster | Start | Herkomst | Score nulmeting → nu | Grootste tegenstander |
|---|---|---|---|---|---|
| 1 | Loopanalyse en de juiste hardloopschoen | M-12 | aanbod en gesprek | 4% → 58% | Run2Day |
| 2 | Hardloopschoenen kiezen per loper | M-12 | aanbod en gesprek | 7% → 41% | Zalando, Run2Day |
| 3 | Blessures voorkomen en herstel | M-12 | aanbod en gesprek | 2% → 29% | Fysiotherapeuten (generiek), Decathlon |
| 4 | Hardlopen in je eigen stad: winkels, routes en groepen | M-12 | aanbod en gesprek | 9% → 52% | Run2Day, Runnersworld |
| 5 | Beginnen met hardlopen | M-10 | aanbod en gesprek | 3% → 33% | Decathlon, hardloopapps |
| 6 | Wedstrijdschoenen en racen (marathon, halve, 10 Engelse mijl) | M-8 | aanbod en gesprek | 5% → 36% | Run2Day, merkwebshops |
| 7 | Trailrunning op de Veluwe en in Twente | M-5 | aanbod en gesprek | 1% → 24% | Bever, Decathlon |
| 8 | HYROX: training, schoenen en uitrusting | M-2 | ontdekking | 3% → 14% | Merkwebshops, sportscholen |

**Gewogen totaal per meetperiode** (het hoofdcijfer op Overzicht): 6, 7, 9, 12, 15, 18, 21, 24, 26,
29, 32, 34, 36%. Elke periode met een onzekerheidsmarge (`score_stderr`) die bij meer clusters
smaller wordt, en twee dipjes (M-6 bij cluster 3, M-3 bij cluster 2) zodat de lijn niet
geconstrueerd oogt. **Share of voice** per cluster tegen de concurrenten, met Run2Day van 38% naar
27% in clusters 1 en 4.

**Voorbeeldvragen** (de vragen zijn wat een prospect het eerst herkent, dus deze moeten raak zijn):

- Cluster 1: "Waar kan ik een loopanalyse laten doen in Apeldoorn?", "Is een loopanalyse in een
  hardloopwinkel zinvol of verkooppraat?", "Wat is het verschil tussen een loopanalyse bij de
  fysio en in de winkel?"
- Cluster 4: "Beste hardloopwinkel in Groningen", "Hardlooptrainingsgroep in Haarlem voor
  beginners", "Mooie hardlooprondes rond Tilburg".
- Cluster 6: "Welke carbon schoen voor een marathon onder de 3u30?", "Wanneer ga je over op een
  wedstrijdschoen?", "Hoe loop je een wedstrijdschoen in vóór de Midwinter Marathon?"
- Cluster 7: "Trailschoenen voor de Veluwe, wat heb ik nodig?", "Trailrun beginnen in Twente".
- Cluster 8: "Welke schoenen voor HYROX?", "Hoe train je voor HYROX naast hardlopen?"

## 6. Het contentplan: 150 pagina's

### 6.1 Twee planversies

Een plan heeft twaalf maanden. Daarom twee versies, en dat vertelt meteen een verhaal over trouw:

- **Versie 1**, gestart M-12 (oktober 2025), drie maanden gebruikt, op `gestopt` gezet in december
  2025 toen het jaarplan 2026 werd gemaakt. 30 pagina's, alle `geplaatst`. Zichtbaar onder
  Plan > Versies.
- **Versie 2**, gestart M-9 (januari 2026), `actief`. Maanden 1 tot en met 9 (januari tot en met
  september 2026) zijn voorbij met 90 geplaatste pagina's, maand 10 (oktober, M0) loopt, maanden 11
  en 12 (november en december) staan klaar.

⚠️ Bij het verjongen (§9.5) schuift dit mee: de maanden zijn relatief aan de dag van inladen, dus
in januari 2027 begint versie 2 in april 2026. Dat klopt alleen als de jaargrens niet hard in de
verhaallijn zit; de datums van de events (Midwinter Marathon in februari) staan daarom als
eigenschap van de pagina, niet afgeleid van het maandnummer. Wie de demo na een paar maanden
verjongt, kiest voor de verhaalmaanden een nieuw seizoensblok uit de pool van §6.4.

### 6.2 Wat er per maand staat

Tien pagina's per maand, een mix van paginasoorten (`content_type`: article, gids, faq, landing,
comparison) en paginatypes (`informatief`, `dienst`, `categorie`), afgestemd op het seizoen:

| Maand | Thema | Voorbeeldtitels |
|---|---|---|
| M-12 okt 2025 | Fundament: loopanalyse in zes steden | Loopanalyse in Apeldoorn: wat er gebeurt en wat je eraan hebt · Loopanalyse bij de fysio of in de winkel? · Neutrale of stabiele hardloopschoen: zo weet je het |
| M-11 nov 2025 | Hardlopen in het donker en de kou | Hardlopen in de winter: zo kleed je je in lagen · Verlichting voor hardlopen: gezien worden in het donker |
| M-10 dec 2025 | Cadeaus en techniek | Een sporthorloge kiezen voor hardlopen · Garmin of Coros: welk horloge past bij jouw training? |
| M-9 jan 2026 | Beginnen | Beginnen met hardlopen: je eerste acht weken · Hardloopschoenen voor beginners: waar let je op? · Trainingsgroep voor beginners in Haarlem |
| M-8 feb 2026 | Midwinter Marathon | De Midwinter Marathon lopen: voorbereiding, schoenen en kleding · Wanneer kies je een carbon wedstrijdschoen? |
| M-7 mrt 2026 | Blessurevrij het voorjaar in | Scheenbeenklachten bij hardlopen: oorzaken en wat een schoen kan doen · Compressiekousen: werking en wanneer ze helpen |
| M-6 apr 2026 | Marathonseizoen | Je marathon in Enschede: de laatste vier weken · Energiegels tijdens een marathon: hoeveel en wanneer |
| M-5 mei 2026 | Trail | Trailrunning op de Veluwe: routes en uitrusting · Trailschoenen kiezen: grip, demping en drop |
| M-4 jun 2026 | Snelheid en techniek | Intervaltraining voor recreatieve lopers · Je hardlooptechniek verbeteren zonder blessures |
| M-3 jul 2026 | Zomer | Hardlopen in de hitte: drinken, tempo en tijdstip · Hardlopen en drinken: hoeveel, wanneer en wat |
| M-2 aug 2026 | HYROX en najaarsdoelen | HYROX-schoenen: hardloopschoen of trainingsschoen? · Trainen voor de Dam tot Damloop |
| M-1 sep 2026 | Tilburg Ten Miles en Dam tot Dam | Tien Engelse mijl lopen: schema en wedstrijdtempo · Na de Dam tot Damloop: herstel in de eerste week |

De volledige lijst van 120 titels is een werkpakket (§11, WP4), met per titel het cluster, de
doelvragen, het paginatype en de lezer uit §4.3. Geen titel twee keer: de oude jaarverdeling liet
dat juist mislopen (`architecture.md` §3, het contentplan).

### 6.3 De komende drie maanden, volledig uitgeschreven

**M0 oktober 2026** (maand `goedgekeurd`, pagina's in alle stadia, want dit is de maand die je in
een demo openklapt):

| # | Titel | Cluster | Status |
|---|---|---|---|
| 1 | De 4 Mijl van Groningen: zo loop je hem snel en blessurevrij | 6 | geplaatst |
| 2 | Hardloopkleding voor de herfst: wat heb je echt nodig? | 2 | geplaatst |
| 3 | Loopanalyse in Groningen: zo werkt het bij RunX | 1 | goedgekeurd |
| 4 | Hardlopen in de regen: schoenen, jas en grip | 2 | ter_goedkeuring |
| 5 | Herstel na een najaarsmarathon: de eerste twee weken | 3 | ter_goedkeuring, met 1 open vraag |
| 6 | Trailrunnen in de herfst op de Veluwe | 7 | schrijven |
| 7 | HYROX-training combineren met hardlopen | 8 | schrijven |
| 8 | Hardlopen na je veertigste: wat verandert er? | 3 | gepland |
| 9 | Hoe vaak vervang je je hardloopschoenen? | 2 | gepland |
| 10 | Een hardlooprugzak of heuptas kiezen | 2 | gepland |

**M+1 november 2026** (`goedgekeurd`, alles op `gepland`, met publicatiedata):
Winterhardlopen: de lagen die je warm en droog houden · Reflecterende kleding en verlichting voor
de donkere maanden · Hardlopen op de loopband of buiten in de winter? · Trailschoenen voor modder
en natte bladeren · Loopanalyse in Tilburg · Je basis opbouwen voor een voorjaarsmarathon · Het
verschil tussen een gewone en een wedstrijdsok · Sporthorloge kopen: waar let je op voor de
feestdagen? · Kracht en mobiliteit voor hardlopers, thuis te doen · HYROX-schoenen vergeleken.

**M+2 december 2026** (`ter_goedkeuring`: de klant moet de maand nog vrijgeven, zodat de knop
"Maand vrijgeven" in de demo te zien is):
Beginnen met hardlopen in januari: je plan voor de eerste maand · De beste hardloopschoen voor
beginners in 2027 · Hardloopcadeaus voor lopers die al alles hebben · Trainingsgroepen voor
beginners in Apeldoorn, Groningen, Haarlem, Tilburg, Twente en Zaandam · Je voorbereiding op de
Midwinter Marathon begint nu · Hardlopen tijdens de feestdagen: zo blijf je in ritme · Een
hartslagband of polsmeting: wat is nauwkeuriger? · Hardlopen met kou en wind: je ademhaling ·
Loopanalyse in Zaandam · Je jaar in kilometers: doelen stellen voor 2027.

Plus een **voorraad** van 12 kaarten (kansen uit de laatste rapporten die nog niet ingepland zijn,
met potentiescore), zodat het voorraadscherm vol staat en zichtbaar is dat er meer te doen is dan
het pakket toelaat. Dat is ook het natuurlijke opstapje naar een groter pakket.

### 6.4 De teksten zelf

Een prospect klikt in een demo op een willekeurige pagina, dus **elke geplaatste pagina heeft een
volledige tekst.** Geen stompjes. Kosten nul: de teksten worden in Claude Code-sessies geschreven,
niet via de OpenAI-API van de app.

- **120 geplaatste pagina's**, 700 tot 1.400 woorden, met FAQ, volgens `docs/schrijfstijl.md` en de
  stem uit §4.4. Elke pagina met `posted_url` op runx.nl (`/advies/...`, `/nieuws/blog/...`) en
  `posted_at`.
- **12 pronkpagina's** krijgen extra zorg en worden in de demo gebruikt (§10): de zes stadspagina's
  loopanalyse, de Midwinter Marathon, carbon wedstrijdschoenen, scheenbeenklachten, trail op de
  Veluwe, beginnen met hardlopen, HYROX-schoenen.
- **Oktober**: teksten voor de pagina's op `geplaatst`, `goedgekeurd` en `ter_goedkeuring`; op
  `schrijven` en `gepland` staat terecht nog geen tekst.
- **Versiegeschiedenis** bij 15 pagina's: versie 1 met feedback van de klant, versie 2 goedgekeurd.
  Laat de redactielus zien.
- **Geen** verzonnen prijzen, retourtermijnen of percentages van RunX in de tekst (§2). Wel echte
  productnamen uit de blog en de merkenlijst.

Haalbaarheid: ongeveer 140.000 woorden. In sessies van 15 pagina's per keer zijn dat 9 tot 10
schrijfsessies. Volgorde: eerst de 12 pronkpagina's en oktober, dan de rest per cluster, zodat de
demo na de eerste twee sessies al bruikbaar is (§11).

## 7. Vragen aan de klant

De vragenlijst moet laten zien dat het systeem doorvraagt en dat de klant daar makkelijk in meegaat.

- **Beantwoord over het jaar**: ~60, verspreid over alle soorten (`verificatie`, `aanvulling`,
  `onderscheid`, `bewijs`, `praktisch`, `grenzen`) en antwoordtypes. Voorbeelden: "Is de loopanalyse
  ook gratis als je geen schoenen koopt?", "Lopen er trainingsgroepen vanuit alle zes de winkels?",
  "Welke merken voeren jullie in alle vestigingen en welke alleen in een paar?", "Mogen we noemen
  dat medewerkers zelf wedstrijdlopers zijn?"
- **Overgeslagen**: 5, met reden. Laat zien dat de poort leefbaar is.
- **Open nu**: 4, waarvan 1 die pagina 5 van oktober tegenhoudt (de eindpoort, §2 van
  `architecture.md`): "Begeleiden jullie lopers na een marathon met een herstelloop vanuit de
  winkel?" De andere drie komen uit het jaargesprek: een vraag over het najaarsprogramma van de
  RunX Club, een over de Twentse vestiging, een over de HYROX-trainingen in Zaandam.

## 8. De rest van het account

| Onderdeel | Inhoud |
|---|---|
| Rapporten | Eén per cluster per meetperiode: 8 clusters, ingangsmaand verschilt, samen ~70 rapporten. Het laatste per cluster volledig (samenvatting, gaten, aanbevelingen, verandering), de oudere korter |
| Metingen en bewijs | 240 vragen. De laatste meetperiode volledig met antwoordtekst per vraag, zodat "doorklikbaar bewijs" werkt. Oudere periodes alleen de uitgesplitste cijfers en een korte antwoordtekst. ⚠️ Alleen engine ChatGPT |
| Concurrentievergelijking | `competitor_breakdown` per cluster per periode, met de attributen en een letterlijk citaat waarom AI de ander noemt |
| Kansen | ~140: 120 `gepubliceerd`, 10 `ingepland`, 10 `open` of `in_voorbereiding`, een paar `vervallen`. Elk met bewijs |
| Effectmeting | 96 pagina's oud genoeg: 52 `gestegen`, 33 `gelijk`, 3 `gedaald`, 8 `te_weinig_data`. Een meetplan per pagina, en bij `gestegen` vaak "eigen pagina geciteerd" |
| Zoekverkeer (Search Console) | 13 maanden dagcijfers per pagina, fictief maar plausibel: van ~1.800 naar ~9.500 klikken per maand, met een piek in januari en rond de events. Alleen de pagina's die ORBIT ENGINE schreef, zodat de opbrengst per pagina te tonen is |
| Technische audit | Recente audit: AI-crawlers toegelaten, 1 waarschuwing die in het voorjaar opgelost is |
| Kennistest | Nulmeting en jaarmeting: "kent ChatGPT RunX?" van 3 van de 12 vragen naar 10 van de 18 goed |
| Reputatie | Weglaten, tenzij het in de demo verkocht wordt: het is een los product (`architecture.md` §2), en verzonnen cijfers over hoe AI een echt bedrijf beoordeelt, gaan verder dan nodig |
| Gebeurtenissen en meldingen | Logboek van het jaar (~600 regels) en 5 ongelezen meldingen: nieuwe meting, 2 pagina's ter goedkeuring, 1 open vraag, december wacht op vrijgave |
| Team | Account "RunX" met pakket 10, gestart M-12, contactpersoon *(fictief)* "Marketing RunX". Een demologin als klant (§9.2) |

## 9. Hoe het gebouwd wordt, zonder kosten

### 9.1 Het slot: `profiles.is_demo`

Eén migratie (`0138_demo_account.sql`, additief en idempotent): `profiles.is_demo boolean not null
default false`. Daarna één pure functie `isDemo()` en vijf plekken die hem vragen, elk met een test:

1. `/api/cron/tracking` slaat een demo-merk over en zet de reden in `overgeslagen`.
2. `ochtendronde()` in `lib/pagina/start.ts` slaat de pagina's van een demo-merk over.
3. De Search Console-ophaling in `/api/cron/plan` slaat een demo-merk over.
4. `lib/cost-guard.ts` weigert elke betaalde handeling op een demo-merk, met een eigen zin in
   `lib/cost-rules.ts`: "Dit is een voorbeeldaccount. Hier wordt niets gemeten of geschreven."
5. De werker weigert een taak met een `profile_id` van een demo-merk en zet hem op mislukt, als
   vangnet voor een pad dat hierboven vergeten is.

Daarnaast, als tweede rem met bestaande middelen: `accounts.daily_budget_eur = 0` op het
demo-account. Een broncodecontrole in `scripts/test-unit.ts` dwingt af dat elke cronroute die werk
inplant `isDemo` vraagt, net zoals de bestaande controle op betaald werk.

**Klaar als**: een ketenscenario in `scripts/test-chain.ts` een demo-merk door de maandcron, de
ochtendronde en een klik op "Schrijven" haalt en er nul taken en nul AI-aanroepen ontstaan.

### 9.2 Wie er inlogt

- **De consultant** toont het via de klantweergave (bestaat al, `architecture.md` §2).
- **Een eigen demologin** als klantlid van het account RunX, zodat het scherm ook zonder
  beheermenu's te tonen is op een tweede laptop. Wachtwoord bij de eigenaar.
- **Een login voor de prospect zelf** (laten rondklikken na het gesprek) is een latere stap: dat
  vraagt dat alle schrijfroutes een demo-merk alleen-lezen maken, niet alleen de betaalde. Niet in
  de eerste versie.

### 9.3 De gegevens als bestanden in de repository

`scripts/demo/runx/` met:

- `verhaal.ts`: de vaste cijfers uit §3 en §5 (scores per cluster per periode, aantallen per
  status). **Eén eigenaar voor elk cijfer**: de andere bestanden rekenen hiervan af, en een test
  controleert dat het verhaal in §3 en de geladen data hetzelfde zeggen.
- `profiel.json`, `aanbod.json`, `kennis.json`, `clusters.json` (met de 240 vragen),
  `vragen.json`, `plan.json` (150 titels met maand, status en cluster), `concurrenten.json`.
- `paginas/*.md`: één bestand per pagina, met kopregels (titel, cluster, type, doelvragen, FAQ) en
  de tekst.
- `antwoorden/*.md`: de antwoordteksten van de laatste meting, per vraag.
- `rekenen.ts`: puur, zonder `server-only`, maakt van het verhaal de rijen voor metingen,
  scores, effectmeting en zoekverkeer, met een vaste zaadwaarde zodat elke run dezelfde ruis geeft.
  Getest in `test-unit.ts` (conventie 2).

Vaste id's per rij (afgeleid van een sleutel, bijvoorbeeld `runx:pagina:m-3:4`), zodat opnieuw
inladen nooit dubbele rijen geeft (conventie 9).

### 9.4 De laadroute

`POST /api/beheer/demo/runx` (alleen beheerder, `isStaffAccount()`), met een knop onder Beheer.
Waarom een route en geen SQL-bestand: de kennislaag en de merkprofielkopie mogen alleen via
`lib/kennis/` geschreven worden, en de broncodecontrole houdt een SQL-insert in `klantkennis` tegen.
Via de route lopen ze door dezelfde functies als echt werk, inclusief de regels over status en
gebruik. De overige tabellen (metingen, scores, rapporten, plan) zet de route in delen, binnen de
tijdslimiet van één verzoek; past het niet in één keer, dan in stappen met een voortgangsregel.

⚠️ De route schrijft nooit in `ai_calls`: er is geen AI-aanroep gedaan, en een verzonnen regel in het
kostenlogboek maakt de echte kostencijfers van de app onbetrouwbaar. Het onderdeel "kosten" van dit
merk toont dus €0, en dat is eerlijk.

⚠️ Conventie 8 (de ruwe JSON van elke AI-aanroep bewaren) geldt hier niet letterlijk, want er is geen
aanroep. De kolommen die het scherm leest worden gevuld; de ruwe kolommen krijgen
`{"bron":"demo"}`, zodat altijd te zien is dat een rij ingeladen is.

### 9.5 Verjongen

Dezelfde route met `?verjong=1`, eens per maand te draaien (of met de hand vóór een belangrijk
gesprek). Alle datums zijn relatief aan vandaag: de laatste meting op de 1e van de lopende maand,
het plan van M-12 tot en met M+2. De route schuift de datums op en voegt een nieuwe meetperiode en
tien nieuwe geplaatste pagina's uit de pool toe, zodat het account echt "doorgroeit". De pool in
§6.4 krijgt daarom 20 reservepagina's per seizoen.

## 10. De demo in vijftien minuten

Het scenario dat de data moet dragen, in deze volgorde. Elk scherm moet hier vóór oplevering op
nagelopen worden.

1. **Overzicht**: 36%, gestegen van 6%, met de trendlijn en de marge. "Dit is RunX na een jaar."
2. **Resultaten**: de acht clusters, de loopanalyse op 58%, Run2Day eronder. Doorklikken naar één
   vraag: "Waar kan ik een loopanalyse laten doen in Apeldoorn?" en het letterlijke antwoord van
   ChatGPT waarin RunX als eerste genoemd wordt, met de eigen pagina als bron.
3. **Effect per pagina**: de stadspagina loopanalyse Apeldoorn, `gestegen`, plus eerlijk één
   `gelijk`. "Niet alles werkt, en dat zie je ook."
4. **Contentplan**: oktober open, tien pagina's in vijf stadia, november klaar, december wacht op
   vrijgave. "Zo ziet je maand eruit: jij keurt goed, wij schrijven."
5. **Een pagina**: de Midwinter Marathon, met versie 1, de feedback, en versie 2.
6. **Vragen**: de ene open vraag die een pagina tegenhoudt, en een bewijsfeit dat de schrijver
   kent maar niet gebruikt omdat het niet bevestigd is.
7. **Clusters ontdekken**: hoe HYROX er in augustus bij kwam.
8. **Zoekverkeer**: klikken van 1.800 naar 9.500 per maand op de geschreven pagina's.
9. Terug naar het begin: "Zo ziet jouw nulmeting eruit", en door naar het merk van de prospect.

## 11. Werkpakketten

| WP | Wat | Klaar als | Sessies |
|---|---|---|---|
| 0 | Besluit naam (§2) en fase 0-onderzoek: adressen, Twentse vestiging, ketens per stad, eventdata, botsende namen | Besluit in het logboek, feiten in `profiel.json` met bron | 1 |
| 1 | Slot: migratie `0138`, `isDemo()` op vijf plekken, tests | Ketenscenario uit §9.1 groen, vier controles groen | 1 |
| 2 | Verhaal en rekenmodule (`verhaal.ts`, `rekenen.ts`) | Unittests: scores, aantallen en het verhaal in §3 kloppen met elkaar | 1 |
| 3 | Profiel, aanbod, kennis, clusters, 240 vragen, 60 vragen aan de klant | Bestanden compleet, validatie tegen de check-constraints uit §1 | 1 tot 2 |
| 4 | De 150 titels plus 60 reserve, en de 12 pronkpagina's plus oktober geschreven | Plan compleet, demo bruikbaar voor stap 1 tot 6 van §10 | 2 |
| 5 | Laadroute en knop, inladen op productie | Merk staat, schermen nagelopen, nul rijen in `ai_calls` en `jobs` voor dit merk | 1 |
| 6 | Proefrit van alle schermen met een jaar data, scheefstand oplossen | Elk scherm uit §10 getoond zonder fout; gevonden punten opgelost of als taak vastgelegd | 1 tot 2 |
| 7 | De overige ~95 pagina's en de antwoordteksten | Elke geplaatste pagina heeft een volledige tekst | 6 tot 7 |
| 8 | Verjongen | `?verjong=1` op een kopie getest, maand later nog steeds "drie maanden vooruit" | 1 |

Na WP 0 tot en met 6 is de demo te gebruiken: alle schermen gevuld, 12 pronkpagina's en oktober
volledig. WP 7 maakt hem bestand tegen een prospect die zelf gaat klikken. Elk pakket werkt de
documentatie bij in dezelfde commit (logboek, `supabase/README.md` voor de migratie).

## 12. Wat bewust niet

- Geen echte meetronde, ook niet één "om de vorm te krijgen": de opdracht is nul kosten, en de vorm
  is af te lezen uit de bestaande merken in productie.
- Geen Gemini, Perplexity of AI-overview in de cijfers: die meten vandaag niet live, en een demo die
  meer toont dan de app kan, is precies wat `CLAUDE.md` verbiedt.
- Geen claim dat ORBIT ENGINE publiceert. De pagina's staan als door de klant gemeld live.
- Geen verzonnen reviews, prijzen, garanties of keurmerken van RunX.
- Geen reputatieanalyse met verzonnen oordelen over RunX of zijn concurrenten.
- De demo wordt niet getoond buiten een één-op-één-gesprek zolang route A geldt.

## 13. Open voor de eigenaar

1. Route A, B of C uit §2. Mijn advies is A, en geen B.
2. Wil je RunX zelf deze demo laten zien als opening? Dan is het meteen hun nulmeting plus een
   toekomstbeeld, en is het verstandig om de fictieve interne cijfers (§4.4) vóór dat gesprek leeg
   te laten in plaats van verzonnen.
3. Moet de prospect later zelf kunnen inloggen (§9.2)? Dat bepaalt of WP 1 ook alle gewone
   schrijfroutes op alleen-lezen zet.
