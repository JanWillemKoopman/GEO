# De herhaalbaarheid van Google AI Overview

**Een meetonderzoek naar de consistentie van genoemde aanbieders, volgorde, aantal en sentiment
bij lokale commerciële zoekvragen, op desktop en mobiel**

Onderzoeksplan voor een wetenschappelijk paper. Versie 2, 3 oktober 2026. Status: plan, nog geen
data verzameld. Doorlooptijd van het onderzoek: 7 dagen.

Dit onderzoek staat volledig los van andere producten of software van de auteur. Het gebruikt
alleen een eigen verzamelscript, de API van DataForSEO en standaard statistische software.

---

## Inhoud

1. Probleemstelling
2. Onderzoeksvragen en hypothesen
3. Onderzoeksontwerp
4. Dataverzameling
5. Van tekst naar variabelen (codering)
6. Uitkomstmaten
7. Statistische analyse
8. Steekproefomvang en onderscheidend vermogen
9. Validiteit en betrouwbaarheid
10. Visualisaties in het paper
11. Opbouw van het paper
12. Planning in 7 dagen
13. Kosten en middelen
14. Ethiek, transparantie en belangen
15. Beslissingen voor de auteur

---

## 1. Probleemstelling

Een groeiend aantal bedrijven biedt "AI-zichtbaarheid" aan als meetbare grootheid: hoe vaak een
merk genoemd wordt in antwoorden van generatieve zoeksystemen. Google AI Overview is daarvan voor
Nederlandse ondernemers het meest zichtbare voorbeeld, omdat het bovenaan de gewone zoekresultaten
verschijnt.

Zo'n score veronderstelt dat het gemeten verschijnsel herhaalbaar is. Een AI Overview wordt echter
door een taalmodel samengesteld en kan per aanroep verschillen, ook als zoekvraag, plaats en
apparaat gelijk zijn. Hoe groot die variatie is, en welk deel ervan toeval is en welk deel
systematisch, is voor zover bekend niet openbaar en reproduceerbaar onderzocht voor een concrete
Nederlandse lokale zoekmarkt. (Dit wordt op dag 1 met een korte literatuurverkenning getoetst, zie
§11.)

**Doel.** Vaststellen hoe herhaalbaar Google AI Overview is in (a) welke aanbieders het noemt,
(b) in welke volgorde, (c) hoeveel, en (d) op welke toon, voor zoekvragen naar een Google
Ads-bureau in Amsterdam, en die variatie toeschrijven aan vier bronnen: toeval, tijdstip, apparaat
en formulering van de vraag.

**Praktische vertaling.** Uit het antwoord volgt hoeveel metingen nodig zijn voor een betrouwbare
zichtbaarheidsscore, en hoe groot een verandering moet zijn voordat die van toeval te
onderscheiden is.

**Afbakening.** Eén branche (Google Ads-dienstverlening), één stad (Amsterdam), één taal
(Nederlands), één meetperiode van vijf dagen, gemeten via een SERP-API en niet via echte
gebruikers, behalve een kleine ijkmeting (§4.6). De conclusies gaan over wat een meetinstrument te
zien krijgt. Of een echte zoeker hetzelfde ziet, onderzoekt dit paper alleen verkennend.

## 2. Onderzoeksvragen en hypothesen

### 2.1 Onderzoeksvragen

| # | Onderzoeksvraag | Soort |
|---|---|---|
| OV1 | Hoe vaak verschijnt er een AI Overview, en verschilt dat per zoekvraag en apparaat? | beschrijvend |
| OV2 | Hoe sterk overlappen de genoemde aanbieders bij exacte herhaling op hetzelfde moment? | toetsend (H1) |
| OV3 | Neemt de overlap af naarmate er meer tijd tussen twee metingen zit? | toetsend (H2) |
| OV4 | Verschillen desktop en mobiel in welke aanbieders genoemd worden? | toetsend (H3) |
| OV5 | Bepaalt de formulering van de vraag het antwoord sterker dan apparaat en tijdstip? | toetsend (H4) |
| OV6 | Hoe stabiel is de volgorde, en in het bijzonder de eerste plek? | beschrijvend |
| OV7 | Hoeveel aanbieders worden genoemd, en hoe sterk schommelt dat? | beschrijvend |
| OV8 | In welk sentiment worden aanbieders genoemd, en is dat per aanbieder stabiel? | beschrijvend |
| OV9 | Hoe groot is de meetfout van een zichtbaarheidsscore bij een gegeven aantal metingen? | afgeleid (simulatie) |
| OV10 | Komen de genoemde aanbieders overeen met de organische resultaten en het kaartblok? | verkennend |

**Waarom maar vier toetsende hypothesen.** Elke extra toets vergroot de kans op een toevallig
"significant" resultaat. Vier hypothesen die vooraf vastliggen, plus een duidelijk gemarkeerd
beschrijvend en verkennend deel, is beter verdedigbaar dan twintig toetsen achteraf.

### 2.2 Hypothesen

De hypothesen gebruiken de **Jaccard-overlap** J tussen de verzamelingen genoemde aanbieders van
twee AI Overviews: het aantal gedeelde aanbieders gedeeld door het aantal verschillende aanbieders
samen (0 is niets gemeen, 1 is identiek). Definitie en randgevallen in §6.

| # | Hypothese | Toets en beslisregel |
|---|---|---|
| **H1** | Bij exacte herhaling (zelfde vraag, apparaat en tijdvak) is het antwoord niet praktisch stabiel: de gemiddelde J ligt onder 0,80. | Eenzijdig. Bovengrens van het 95%-bootstrapinterval van de gemiddelde J ligt onder 0,80. |
| **H2** | De overlap neemt af met de tijd tussen twee metingen. | Helling van J op het tijdsverschil (in uren, log-schaal) is negatief; 95%-interval van de helling ligt onder 0. |
| **H3** | Desktop en mobiel geven systematisch verschillende antwoorden: J tussen apparaten in hetzelfde tijdvak is lager dan J binnen een apparaat in hetzelfde tijdvak. | Permutatietoets (10.000 permutaties van het apparaatlabel binnen tijdvak en vraag), alfa 0,05. |
| **H4** | Formulering weegt zwaarder dan apparaat: J tussen twee formuleringen van dezelfde soort is lager dan J tussen apparaten bij dezelfde formulering. | Verschil in gemiddelde J met hiërarchisch bootstrapinterval; interval ligt geheel boven 0. |

**Waarom 0,80 als grens in H1.** Bij een typische lijst van vijf aanbieders betekent J = 0,80 dat
gemiddeld ongeveer één aanbieder wisselt. Daaronder is een enkele meting niet meer als "het
antwoord" te beschouwen. De grens is een inhoudelijke keuze en wordt vooraf vastgelegd; in de
discussie rapporteren we ook bij welke grens de conclusie zou omslaan.

**Correctie voor meervoudig toetsen.** De vier hypothesen worden met de methode van Holm (1979)
gecorrigeerd. Toetsen per afzonderlijke aanbieder (bijvoorbeeld desktop tegenover mobiel per
aanbieder) zijn verkennend en worden gecorrigeerd met Benjamini en Hochberg (1995).

## 3. Onderzoeksontwerp

### 3.1 Type onderzoek

Een **herhaald-metingenonderzoek met een volledig gekruist factorieel ontwerp**: elke zoekvraag
wordt op elk apparaat in elk tijdvak meerdere keren gemeten. Het is een observationeel meetonderzoek
naar een systeem (Google) en geen experiment met mensen.

### 3.2 Factoren

| Factor | Niveaus | Toelichting |
|---|---|---|
| Zoekvraag | 12, genest in 4 soorten van 3 | zie §3.3 |
| Apparaat | 2: desktop (Windows), mobiel | mobiel besturingssysteem gekozen in de pilot, §4.5 |
| Tijdvak | 60: elke 2 uur, 5 dagen | dekt dag, nacht, werkdag en waar mogelijk weekend |
| Herhaling | 3 per tijdvak | zuivere herhaling, binnen enkele minuten |

Totaal: 12 × 2 × 60 × 3 = **4.320 metingen**, plus een pilot van ongeveer 150.

**Waarom deze verdeling.** Het ontwerp moet vier bronnen van variatie van elkaar kunnen scheiden.
Dat lukt alleen als elke bron afzonderlijk varieert terwijl de rest gelijk blijft:

- **toeval**: drie herhalingen in hetzelfde tijdvak, al het andere gelijk;
- **tijd**: hetzelfde, maar in een ander tijdvak (2 uur tot 5 dagen later);
- **apparaat**: dezelfde vraag in hetzelfde tijdvak op het andere apparaat;
- **formulering**: een andere vraag van dezelfde soort, in hetzelfde tijdvak en op hetzelfde apparaat.

Dat levert de **gelijkenisladder** op, de ruggengraat van de analyse (§7.2): elke trede verandert
precies één ding ten opzichte van de vorige.

**Waarom elke 2 uur en 3 herhalingen.** Binnen 7 dagen blijven er 5 meetdagen over (§12). Elke 2
uur geeft 12 tijdvakken per etmaal, genoeg om een dagritme te zien. Drie herhalingen is het
minimum om binnen een tijdvak een spreiding te schatten (twee geeft één paar per tijdvak, drie geeft
er drie). Meer herhalingen per tijdvak zou ten koste gaan van het aantal tijdvakken, en de tijdas is
de zwakste kant van een onderzoek van vijf dagen.

### 3.3 Zoekvragen

Vier soorten zoekgedrag, elk drie formuleringen. Definitief na de pilot (§4.5).

| Soort | Formuleringen (concept) |
|---|---|
| S1 Kort zoekwoord | "google ads bureau amsterdam" · "sea bureau amsterdam" · "google ads specialist amsterdam" |
| S2 Vergelijkend | "beste google ads bureau amsterdam" · "top google ads bureaus amsterdam" · "goed sea bureau amsterdam voor mkb" |
| S3 Vraag | "welk bureau in amsterdam kan mijn google ads beheren?" · "wie kan in amsterdam mijn google ads campagne verbeteren?" · "welk marketingbureau in amsterdam is goed in google ads?" |
| S4 Opdracht met context | "google ads uitbesteden amsterdam kosten" · "google ads beheer laten doen klein bedrijf amsterdam" · "google ads bureau amsterdam ervaringen" |

**Waarom een plaatsnaam in elke vraag.** Een locatie-instelling alleen is een zwakke manipulatie van
"zoeken vanuit Amsterdam". Met de plaatsnaam in de vraag én de locatie op Amsterdam is de lokale
intentie ondubbelzinnig. Of de locatie-instelling zelf iets toevoegt, wordt in de pilot verkend.

**Waarom vier soorten.** Meetinstrumenten kiezen hun vragen vaak zonder te verantwoorden welke
formulering ze nemen. Als formulering de grootste bron van variatie blijkt (H4), dan is die keuze
belangrijker dan het aantal metingen.

## 4. Dataverzameling

### 4.1 Instrument

DataForSEO SERP API, endpoint `serp/google/organic/live/advanced`, één taak per aanroep.

| Parameter | Waarde | Reden |
|---|---|---|
| `keyword` | de zoekvraag, letterlijk | schrijfwijze ligt vast |
| `language_code` | `nl` | Nederlandstalige interface |
| `location_coordinate` | centrum Amsterdam (Dam), formaat en straal volgens actuele documentatie | preciezer dan een stadsnaam; exacte waarde in het onderzoeksplan vastgelegd |
| `device` / `os` | `desktop`/`windows` en `mobile`/(pilot) | §4.5 |
| `depth` | 10 | organische top 10 voor OV10; meer is niet nodig |
| `load_async_ai_overview` | `true` | zonder deze vlag kan het AI-overzicht zonder inhoud terugkomen |

**Waarom de live-variant en niet de goedkopere wachtrij.** Bij de wachtrij bepaalt de leverancier
wanneer de zoekopdracht werkelijk wordt uitgevoerd. Voor een onderzoek naar variatie in de tijd
moet het tijdstip van elke meting in onze hand liggen en bekend zijn.

### 4.2 Volgorde binnen een tijdvak

Per tijdvak 72 aanroepen (12 vragen × 2 apparaten × 3 herhalingen), uitgevoerd in drie rondes: eerst
herhaling 1 van alle 24 combinaties in willekeurige volgorde, dan herhaling 2 in een nieuwe
willekeurige volgorde, dan herhaling 3. Hooguit vijf aanroepen tegelijk.

**Waarom.** Zo liggen de drie herhalingen van één combinatie enkele minuten uit elkaar en niet
seconden, en heeft geen enkele vraag systematisch de eerste of laatste plek. Een vaste volgorde zou
tijd en vraag met elkaar vermengen.

### 4.3 Wat per aanroep wordt bewaard

- de **volledige ruwe JSON-respons**, onbewerkt, als bron van waarheid;
- tijdstempel van verzenden en ontvangen (UTC), en het tijdstip dat DataForSEO zelf rapporteert;
- vraag, soort, apparaat, besturingssysteem, tijdvak, herhaling, positie in de volgorde;
- statuscode, aantal pogingen, kosten;
- afgeleid: AI Overview aanwezig (ja/nee), volledige tekst, bronnen (adres, domein, titel),
  organische top 10, aanbieders in het kaartblok.

Alles gaat in één tabel met één rij per aanroep, plus een map met de ruwe bestanden. Er wordt
achteraf niets in de ruwe bestanden gewijzigd.

### 4.4 Mislukte aanroepen

Een aanroep die een foutcode geeft wordt binnen hetzelfde tijdvak hooguit drie keer opnieuw
geprobeerd. Lukt het dan nog niet, dan is de meting **ontbrekend**, nooit "geen AI Overview". Het
aantal ontbrekende metingen wordt per vraag, apparaat en tijdvak gerapporteerd. Ligt het
ontbrekende deel boven 5%, dan volgt een gevoeligheidsanalyse (§9.4).

**Waarom dit onderscheid ertoe doet.** Een mislukte aanroep als "geen overzicht" tellen verlaagt
kunstmatig zowel de aanwezigheid als de overlap, en dat zou precies het effect nabootsen dat dit
onderzoek wil meten.

### 4.5 Pilot (dag 1)

Ongeveer 150 aanroepen, met vier doelen:

1. **Werkt het instrument?** Geen lege AI-overzichten bij een aanwezig blok, ruwe JSON compleet.
2. **Zoekvragen vaststellen.** Per kandidaatvraag hoe vaak een AI Overview verschijnt. Een vraag
   die vrijwel nooit een overzicht geeft wordt vervangen door een alternatief van dezelfde soort,
   en dat wordt gerapporteerd. Het percentage zelf is een uitkomst (OV1).
3. **Mobiel besturingssysteem kiezen.** iOS en Android elk tien keer op drie vragen. Geven ze
   duidelijk andere antwoorden, dan kiezen we het meest gebruikte systeem in Nederland (op dag 1
   opgezocht) en melden we het verschil als beperking.
4. **Locatie-instelling verkennen.** Drie vragen met Amsterdam, Rotterdam en heel Nederland als
   locatie. Doet de locatie niets, dan is dat een bevinding voor de discussie.

Na de pilot gaat alles op slot (§4.7). Pilotdata telt **niet** mee in de hoofdanalyse.

### 4.6 IJkmeting met echte gebruikers (dag 4, verkennend)

Minimaal vijf personen in Amsterdam zoeken op twee afgesproken momenten drie vragen op hun eigen
telefoon, in een incognitovenster en uitgelogd, en maken een schermafbeelding van het hele
AI-overzicht. Op dezelfde minuten vraagt het script dezelfde vragen op via de API.

Analyse: J tussen mens en API, vergeleken met J tussen twee API-herhalingen en tussen twee mensen.
Ligt mens-API in de buurt van API-API, dan meet de API wat mensen zien, binnen de ruis. Met deze
omvang is dat een beschrijvende vergelijking, geen toets, en zo wordt het ook gerapporteerd.

### 4.7 Vooraf vastleggen (preregistratie)

Aan het eind van dag 1, vóór de hoofdmeting start, worden vastgelegd: definitieve zoekvragen,
parameters, hypothesen met beslisregels, uitkomstmaten, analysecode op pilotdata, en de
codeerinstructie. Dit gebeurt op **AsPredicted** of **OSF Registries** (openbaar met tijdstempel),
en het verzamelscript plus dit plan krijgen een vaste versie (git-commit). Elke afwijking van het
plan wordt in het paper benoemd met reden.

## 5. Van tekst naar variabelen (codering)

### 5.1 Aanbiederslijst

Na de pilot een lijst van alle genoemde aanbieders met canonieke naam, schrijfvarianten en domein.
Tijdens de hoofdmeting komen nieuwe namen erbij, maar twee namen worden alleen samengevoegd op
grond van een vastgelegde regel (zelfde domein, of zelfde KvK-inschrijving). Twijfelgevallen
blijven gescheiden en worden gemeld.

**Wat telt als "genoemd".** Een aanbieder die met naam in de tekst van het AI-overzicht staat. Een
aanbieder die alleen als bronlink verschijnt telt apart (variabele "geciteerd"), omdat een gebruiker
die naam niet leest. Platforms en gidsen (bijvoorbeeld een vergelijkingssite) worden als aparte
categorie gecodeerd en niet als aanbieder meegeteld.

### 5.2 Automatische extractie

Een taalmodel krijgt per AI-overzicht een vaste instructie en geeft in een vaste JSON-structuur
terug: de genoemde aanbieders in volgorde van eerste vermelding, met per aanbieder het sentiment en
de letterlijke zin waarin het voorkomt. Model en versie liggen vast, en elke ruwe modeluitvoer wordt
bewaard. Tellen, rangschikken en vergelijken doet daarna gewone code, niet het model.

**Controle op de extractor zelf.** Een steekproef van 100 overzichten gaat twee keer door het
model. Wijkt de uitkomst af, dan is de extractor zelf een bron van variatie, en die wordt
gerapporteerd en zo nodig met een meerderheid van drie runs opgelost.

### 5.3 Sentiment

Vier categorieën, met een codeerinstructie met voorbeelden:

| Code | Betekenis | Herkenbaar aan |
|---|---|---|
| A | aanbevolen | expliciete aanraden, "bekend om", "sterk in", "een goede keuze" |
| N | neutraal genoemd | in een opsomming zonder oordeel |
| V | met voorbehoud | positief met een kanttekening ("al is het duurder") |
| NEG | negatief | afgeraden of een overwegend negatief oordeel |

**Waarom geen schaal van 1 tot 5.** Een AI-overzicht oordeelt zelden expliciet. Een fijne schaal
zou schijnprecisie geven en de overeenstemming tussen codeurs verlagen. Vier herkenbare categorieën
zijn beter te verdedigen en te controleren.

### 5.4 Betrouwbaarheid van de codering

Een gestratificeerde steekproef van **200 AI-overzichten** (gelijk verdeeld over soort vraag en
apparaat) wordt door **twee mensen onafhankelijk** gecodeerd, zonder de modeluitkomst te zien.

| Wat | Maat | Grens |
|---|---|---|
| Mens tegen mens, aanbieder genoemd | Krippendorffs alfa | ≥ 0,80 |
| Mens tegen mens, sentiment | Krippendorffs alfa | ≥ 0,80 voor stevige conclusies, 0,667 tot 0,80 alleen voorlopig |
| Model tegen menselijke consensus, aanbieders | precisie, recall, F1 | F1 ≥ 0,95 |
| Model tegen menselijke consensus, sentiment | Cohens kappa | ≥ 0,80 |

De grenzen volgen Krippendorff (2004). **Haalt het model de grens niet**, dan worden alle
overzichten met de hand gecodeerd voor dat kenmerk, of wordt dat kenmerk in het paper als
voorlopig gepresenteerd. Dat besluit ligt vooraf vast.

## 6. Uitkomstmaten

Notatie: voor een AI-overzicht *a* is A de verzameling genoemde aanbieders en L de geordende lijst.

| Maat | Definitie | Waarom deze maat |
|---|---|---|
| **Aanwezigheid** | 1 als er een AI Overview met inhoud is, anders 0 | basis voor alles; los geanalyseerd zodat "geen overzicht" de overlap niet vervuilt |
| **Jaccard J** | \|A₁ ∩ A₂\| / \|A₁ ∪ A₂\| | eenvoudig, begrensd tussen 0 en 1, goed uit te leggen |
| **Rank-biased overlap (RBO)** | gewogen overlap van twee ranglijsten met meer gewicht bovenaan (Webber, Moffat en Zobel, 2010), persistentie p = 0,8, extrapolatieversie | werkt bij lijsten van ongelijke lengte met deels andere namen, waar Kendalls tau dat niet kan; p = 0,8 legt het zwaartepunt op de eerste vijf plekken, wat past bij de verwachte lijstlengte. Gevoeligheid: p = 0,7 en 0,9 |
| **Behoud eerste plek** | 1 als de eerst genoemde aanbieder in beide overzichten gelijk is | de vraag die een ondernemer stelt: "sta ik bovenaan?" |
| **Aantal** | \|A\| | OV7 |
| **Vermeldingskans** van aanbieder *b* | aandeel geslaagde metingen waarin *b* genoemd wordt | de grootheid die meettools rapporteren |
| **Sentimentstabiliteit** van *b* | aandeel vermeldingen van *b* met het meest voorkomende sentiment | is de toon per aanbieder vast? |

**Randgevallen, vooraf vastgelegd.**

- Overlap wordt alleen berekend tussen twee overzichten die allebei aanwezig zijn. Aanwezigheid
  wordt apart geanalyseerd.
- Zijn A₁ en A₂ beide leeg (overzicht zonder aanbieders), dan is J niet gedefinieerd. Die paren
  tellen we en sluiten we uit, en we rapporteren hoe vaak het voorkomt.
- **Vermeldingskans heeft twee noemers**: alle geslaagde metingen (wat een zoeker gemiddeld ziet)
  en alleen metingen met een overzicht. De eerste is de hoofdmaat, omdat een meettool die een
  ontbrekend overzicht negeert de zichtbaarheid overschat. Beide worden gerapporteerd.

## 7. Statistische analyse

Alle analyses in R (pakketten `lme4`, `glmmTMB`, `boot`, `ggplot2`). **Waarom R:** modellen met
gekruiste toevalseffecten zijn daarin de standaard, en reviewers kennen ze. Het verzamelscript
staat in Python. Code en data worden openbaar (§14).

### 7.1 Beschrijvend

Per vraag en apparaat: aanwezigheid met **Wilson-betrouwbaarheidsinterval** (Wilson, 1927; beter
dan het gewone interval bij kansen dicht bij 0 of 1), mediaan en interkwartielafstand van het
aantal aanbieders, en vermeldingskans per aanbieder met interval.

### 7.2 De gelijkenisladder (H1, H3, H4)

Alle paren van overzichten worden ingedeeld naar wat er tussen de twee verschilt:

| Trede | Verschilt in | Gelijk |
|---|---|---|
| 0 | alleen herhaling | vraag, apparaat, tijdvak |
| 1 | apparaat | vraag, tijdvak |
| 2 | tijdvak (zelfde dag) | vraag, apparaat |
| 3 | dag | vraag, apparaat |
| 4 | formulering, zelfde soort | apparaat, tijdvak |
| 5 | soort vraag | apparaat, tijdvak |

Per trede de gemiddelde J, de gemiddelde RBO en het behoud van de eerste plek, met 95%-interval.
Trede 0 is de basislijn van puur toeval: alles wat daarboven verder daalt is systematische
variatie door die ene factor.

**Afhankelijkheid tussen paren.** Paren zijn niet onafhankelijk: hetzelfde overzicht zit in veel
paren. Gewone toetsen zouden de onzekerheid onderschatten. Daarom:

- **Hiërarchische bootstrap** voor intervallen: trek eerst met teruglegging vragen, dan binnen elke
  vraag tijdvakken, en bereken de maat opnieuw. 5.000 herhalingen, percentielinterval. Dat
  respecteert dat metingen binnen een vraag en binnen een tijdvak op elkaar lijken.
- **Permutatietoets** voor H3: binnen elk tijdvak en elke vraag wordt het apparaatlabel willekeurig
  verwisseld. Als het apparaat niets uitmaakt, verandert het verschil tussen trede 0 en 1 daar niet
  door. 10.000 permutaties.

**Waarom deze aanpak en geen variantieanalyse.** De uitkomst is een verzameling namen, geen getal.
De gelijkenisladder vertaalt elke bron van variatie direct naar een daling in overlap, en dat is
zowel statistisch verdedigbaar als in één figuur te laten zien.

### 7.3 Verloop in de tijd (H2)

Voor alle paren met dezelfde vraag en hetzelfde apparaat: J als functie van het tijdsverschil Δt
(log-schaal, 0 tot 120 uur), in een lineair gemengd model met een toevalseffect per vraag. H2 is
bevestigd als de helling negatief is en het interval (hiërarchische bootstrap) onder 0 ligt.
Aanvullend: aanwezigheid en aantal per uur van de dag, om een dagritme te zien.

**Beperking die we vooraf benoemen.** Vijf dagen kan geen onderscheid maken tussen een langzame
trend en een eenmalige wijziging bij Google. Een plotselinge sprong in de tijdreeks wordt daarom
apart gemeld en niet als trend gerapporteerd.

### 7.4 Vermeldingskans en variantieverdeling (aanvullend op H3 en H4)

Logistisch gemengd model per meting en per aanbieder (alleen aanbieders die minstens 50 keer
genoemd worden, omdat zeldzame namen het model onstabiel maken):

```
genoemd ~ apparaat + soort_vraag
          + (1 | aanbieder) + (1 | vraag) + (1 | tijdvak)
          + (0 + apparaat | aanbieder) + (1 | aanbieder:vraag)
```

Uit de variantiecomponenten volgt welk deel van de variatie bij de vraag, de aanbieder-vraag
combinatie, het tijdvak en het apparaat ligt, met wat overblijft als toeval. Dit is de formele
tegenhanger van de gelijkenisladder. Komen beide tot dezelfde rangorde van bronnen, dan versterkt
dat de conclusie; wijken ze af, dan wordt dat besproken.

**Als het model niet convergeert**, dan worden toevalseffecten in een vooraf vastgelegde volgorde
weggelaten (eerst de helling per aanbieder, dan aanbieder-vraag) en wordt dat gerapporteerd.

### 7.5 Aantal en sentiment (OV7, OV8)

Aantal aanbieders: Poisson- of negatief-binomiaal gemengd model met apparaat en soort vraag als
vaste effecten en vraag en tijdvak als toevalseffecten (keuze op basis van overdispersie). Sentiment
beschrijvend: verdeling per aanbieder en sentimentstabiliteit; een toets alleen als de verdeling
genoeg variatie heeft.

### 7.6 Simulatie: wat een meettool ziet (OV9)

De 4.320 metingen dienen als de best beschikbare benadering van de werkelijke verdeling. Daaruit
trekken we herhaald (10.000 keer) een steekproef zoals een meettool die zou nemen: k metingen per
vraag, met k = 1, 3, 5, 10, 20, 30, 60.

Per k rapporteren we:

1. de breedte van het interval waarbinnen 95% van de gemeten vermeldingskansen valt, per aanbieder;
2. de **schijnveranderingskans**: hoe vaak twee onafhankelijke steekproeven van k metingen uit
   dezelfde periode een verschil van 10 procentpunt of meer laten zien, terwijl er niets veranderd
   is;
3. het kleinste k waarbij die schijnveranderingskans onder 5% zakt.

Ter oriëntatie de theoretische ondergrens bij een werkelijke vermeldingskans van 30% en
onafhankelijke metingen (halve breedte van het 95%-interval ≈ 1,96 × √(0,21 / k)):

| k | halve breedte |
|---|---|
| 5 | ± 40 procentpunt |
| 10 | ± 28 procentpunt |
| 30 | ± 16 procentpunt |
| 60 | ± 12 procentpunt |

De simulatie laat zien hoeveel slechter het in werkelijkheid is, omdat metingen kort na elkaar op
elkaar lijken en dus minder informatie geven dan onafhankelijke metingen.

### 7.7 Overeenkomst met organische resultaten en kaartblok (OV10, verkennend)

Per meting de overlap tussen aanbieders in het AI-overzicht en (a) de domeinen in de organische
top 10, (b) de bedrijven in het kaartblok. Beschrijvend, met de kanttekening dat een overlap op
domein iets anders meet dan op naam.

## 8. Steekproefomvang en onderscheidend vermogen

- **Per vraag en apparaat** 180 metingen (60 tijdvakken × 3). Bij een vermeldingskans van 50% is
  de halve breedte van het interval bij onafhankelijke metingen 7,3 procentpunt. Lijken de drie
  herhalingen sterk op elkaar (ontwerpeffect tot 3), dan stijgt dat tot ongeveer 12,7 procentpunt.
  Voldoende voor beschrijving per cel, niet voor fijne vergelijkingen tussen cellen.
- **Desktop tegen mobiel**, over alle vragen samen: 2.160 metingen per apparaat. Bij een
  vermeldingskans van 30%, 80% onderscheidend vermogen en alfa 0,05 is het kleinste aantoonbare
  verschil ongeveer 4 procentpunt bij onafhankelijke metingen, en ongeveer 5,5 procentpunt bij een
  ontwerpeffect van 2. Kleinere verschillen kan dit onderzoek niet aantonen; dat wordt vermeld.
- **Gelijkenisladder.** Trede 0 levert per vraag en apparaat 3 paren per tijdvak, dus 4.320 paren
  in totaal. Het aantal effectief onafhankelijke eenheden is lager: 12 vragen en 60 tijdvakken. De
  hiërarchische bootstrap houdt daar rekening mee. **Twaalf vragen is de zwakste schakel**: voor
  uitspraken over "zoekvragen in het algemeen" is dat weinig, en het paper presenteert de
  formulering-effecten daarom als geldig voor deze twaalf.

## 9. Validiteit en betrouwbaarheid

### 9.1 Constructvaliditeit: meet de API wat een zoeker ziet?

Nee, niet vanzelf. Een API-aanroep heeft geen zoekgeschiedenis, geen ingelogd account en een
gesimuleerde locatie. De ijkmeting (§4.6) laat zien hoe groot dat verschil is. De hoofdconclusies
gaan expliciet over **wat een meetinstrument via een SERP-API ziet**, en dat is precies wat
commerciële meettools gebruiken.

### 9.2 Caching bij de leverancier

Als DataForSEO een eerder opgehaald resultaat teruggeeft, lijkt Google stabieler dan hij is. Twee
controles: het tijdstip dat DataForSEO per resultaat rapporteert, en het aantal letterlijk
identieke overzichten binnen een tijdvak. Is dat aantal opvallend hoog, dan wordt navraag gedaan en
het in het paper gemeld.

### 9.3 Veranderingen bij Google tijdens de meting

Een update van Google midden in de meetweek zou als "tijdseffect" verschijnen. Tijdens de week
wordt bijgehouden of Google of de vakpers een wijziging aankondigt, en de tijdreeks wordt
gecontroleerd op een plotselinge sprong (§7.3).

### 9.4 Ontbrekende metingen

Mislukte aanroepen worden apart geteld (§4.4). Is meer dan 5% ontbrekend, dan wordt gekeken of dat
samenhangt met tijdvak, vraag of apparaat. Als gevoeligheidsanalyse worden de hoofdmaten opnieuw
berekend op alleen de tijdvakken zonder ontbrekende metingen.

### 9.5 Externe validiteit

Eén branche, één stad, één week. De bevindingen gelden niet zonder meer voor andere branches of voor
vragen zonder plaatsnaam. Het ontwerp en de code zijn wel direct herbruikbaar voor een herhaling,
en dat wordt in de discussie als vervolgonderzoek voorgesteld.

## 10. Visualisaties in het paper

De figuren zijn zo gekozen dat elk precies één onderzoeksvraag beantwoordt, en dat een lezer zonder
statistische kennis de kernboodschap ziet.

| Fig. | Wat | Vorm | Vraag |
|---|---|---|---|
| 1 | Het meetontwerp: factoren, tijdvakken, herhalingen | schema | methode |
| 2 | **Het vermeldingsraster**: aanbieders (rijen) tegen alle 180 metingen van één vraag en apparaat (kolommen, op tijd), vakje gekleurd als genoemd | heatmap | in één oogopslag hoe grillig het is |
| 3 | Aanwezigheid van een AI Overview per vraag en apparaat, met interval | puntgrafiek met foutbalken | OV1 |
| 4 | **De gelijkenisladder**: gemiddelde J, RBO en behoud eerste plek per trede, met interval | puntgrafiek met foutbalken, treden van boven naar beneden | H1, H3, H4 |
| 5 | Overlap als functie van de tijd tussen twee metingen | lijn met betrouwbaarheidsband | H2 |
| 6 | Vermeldingskans per aanbieder op desktop en mobiel | "dumbbell": twee punten per aanbieder verbonden met een lijn | H3 |
| 7 | Op welke plek elke aanbieder genoemd wordt | gestapelde staven per aanbieder (plek 1, 2, 3, …) | OV6 |
| 8 | Aantal genoemde aanbieders per overzicht, per soort vraag | histogram of stripgrafiek | OV7 |
| 9 | Sentiment per aanbieder | gestapelde staven, vier categorieën | OV8 |
| 10 | **Meetfout tegen aantal metingen**: intervalbreedte en schijnveranderingskans tegen k | twee lijnen, horizontale lijn bij 5% | OV9 |

Tabellen: 1. zoekvragen met aanwezigheid; 2. betrouwbaarheid van de codering; 3. resultaten van het
gemengde model; 4. uitkomsten per hypothese met beslissing.

Vormgevingsregels: één kleur voor desktop en één voor mobiel door het hele paper, kleuren die ook
voor kleurenblinden te onderscheiden zijn, altijd een interval bij een schatting, en aanbieders
geanonimiseerd (§14) maar in vaste volgorde (op totale vermeldingskans) in alle figuren.

## 11. Opbouw van het paper

Standaard IMRaD-opbouw.

1. **Samenvatting** (250 woorden): vraag, ontwerp, belangrijkste getal per hypothese, gevolg.
2. **Inleiding**: opkomst van AI-zichtbaarheidsmeting; waarom herhaalbaarheid een voorwaarde is;
   wat er bekend is. Literatuurverkenning op dag 1, zoektermen onder meer: *reproducibility of
   LLM outputs*, *non-determinism large language models*, *search engine result volatility*,
   *generative search engine optimization*, *AI Overviews*, *rank-biased overlap*. Alleen bronnen
   opnemen die zelf gelezen zijn.
3. **Methode**: §3 tot en met §7 van dit plan, verkort, met verwijzing naar de preregistratie.
4. **Resultaten**: per hypothese, in vaste volgorde, met effectgrootte en interval; daarna het
   beschrijvende en verkennende deel, als zodanig benoemd.
5. **Discussie**: wat betekent dit voor meettools en voor ondernemers; beperkingen (§9);
   vervolgonderzoek.
6. **Conclusie**: drie tot vijf zinnen.
7. **Beschikbaarheid van data en code**, **belangenverklaring**, **literatuur**, **bijlagen**
   (codeerinstructie, extractie-instructie, volledige vragenlijst, afwijkingen van het plan).

## 12. Planning in 7 dagen

De meting zelf heeft vijf volle etmalen nodig. Alles wat daar niet op hoeft te wachten, gebeurt
tijdens de meting.

| Dag | Meting | Werk ernaast |
|---|---|---|
| **1** | pilot (±150 aanroepen) | locatie en parameters vastleggen, verzamelscript afmaken, pilot draaien en beoordelen, zoekvragen definitief, aanbiederslijst v1, codeer- en extractie-instructie, analysecode op pilotdata, literatuurverkenning, **preregistratie indienen**. Hoofdmeting start om middernacht. |
| **2** | tijdvak 1 t/m 12 | dagelijkse controle (ontbrekend, lege overzichten, kosten); extractie draaien op de eerste data; extractor twee keer laten lopen op 100 overzichten |
| **3** | tijdvak 13 t/m 24 | steekproef van 200 trekken; codeur 1 en codeur 2 beginnen onafhankelijk |
| **4** | tijdvak 25 t/m 36 | **ijkmeting met echte gebruikers** op twee momenten; codering afronden |
| **5** | tijdvak 37 t/m 48 | betrouwbaarheid van de codering berekenen; besluit handmatig of automatisch (§5.4); methodesectie schrijven |
| **6** | tijdvak 49 t/m 60 | alle analyses en figuren draaien op de data tot nu toe als generale repetitie; meting stopt om middernacht |
| **7** | klaar | definitieve extractie, alle analyses en figuren op de volledige data, resultatensectie schrijven, data en code klaarzetten voor publicatie |

Na dag 7 liggen er: de volledige dataset, alle figuren en tabellen, een methode- en
resultatensectie, en de uitkomst per hypothese. Inleiding en discussie schrijft de auteur daarna.

**Startdag.** Start op een woensdag of donderdag, dan valt er minstens één weekenddag in de
meting en is een verschil tussen werkdag en weekend zichtbaar.

**Waar het verzamelscript draait.** Het moet vijf dagen onafgebroken elke twee uur draaien. Opties:
een geplande taak in een eigen GitHub-repository (gratis, kan enkele minuten uitlopen; het
werkelijke tijdstip wordt bewaard), of een kleine server. Een laptop die in slaap valt is
ongeschikt. Advies: een eigen repository alleen voor dit onderzoek, zodat data, code en plan samen
openbaar kunnen.

**Grootste risico voor de planning.** De codering door twee mensen (dag 3 en 4). Reken op drie tot
vier uur per codeur voor 200 overzichten. Is de tweede codeur niet beschikbaar, dan wordt de
betrouwbaarheid alleen tussen mens en model berekend, en dat wordt als beperking gemeld.

## 13. Kosten en middelen

| Post | Schatting |
|---|---|
| DataForSEO, pilot en hoofdmeting (±4.500 aanroepen, inclusief herkansingen) | $15 tot $25; prijs per aanroep op dag 1 vaststellen aan de hand van het kostenveld in de pilotrespons |
| Taalmodel voor extractie (±4.300 overzichten, plus dubbele controle) | enkele dollars |
| Preregistratie, R, Python, GitHub | gratis |
| Mensen | auteur, één tweede codeur (±4 uur), vijf deelnemers voor de ijkmeting (±15 minuten elk) |

Totaal ruim onder $50. Een vooraf ingesteld bestedingsplafond bij DataForSEO voorkomt verrassingen.

## 14. Ethiek, transparantie en belangen

- **Geen persoonsgegevens.** Alleen openbare zoekresultaten. Deelnemers aan de ijkmeting leveren
  schermafbeeldingen van zoekresultaten; hun naam wordt niet opgeslagen.
- **Aanbieders geanonimiseerd** in het paper (Aanbieder A, B, …), omdat het onderzoek over de
  meting gaat en niet over de kwaliteit van bureaus. De koppeling met echte namen wordt bewaard
  maar niet gepubliceerd.
- **Openbaar**: preregistratie, verzamelscript, analysecode, en de gecodeerde data met
  geanonimiseerde namen. De ruwe JSON bevat echte bedrijfsnamen en wordt alleen op verzoek gedeeld.
- **Belangenverklaring.** De auteur werkt in de markt voor AI-zichtbaarheid. Dat wordt in het paper
  vermeld. Preregistratie en open code zijn de bescherming tegen de schijn dat de uitkomst gestuurd
  is.

## 15. Beslissingen voor de auteur

1. **Zoekvragen**: kloppen de twaalf concepten met hoe een ondernemer echt zoekt?
2. **Tweede codeur**: wie, en beschikbaar op dag 3 en 4?
3. **IJkmeting**: wie zijn de vijf deelnemers in Amsterdam?
4. **Startdag**: bij voorkeur een woensdag of donderdag.
5. **Eigen repository** voor dit onderzoek, los van alle andere code.
6. **Waar het paper heen gaat** (preprint zoals arXiv of SSRN, vakblad, eigen site). Dat bepaalt
   het format, de lengte en of er een peer review volgt.

---

## Literatuur bij de methode

- Benjamini, Y. en Hochberg, Y. (1995). Controlling the false discovery rate. *Journal of the Royal
  Statistical Society, Series B*, 57(1), 289-300.
- Cohen, J. (1960). A coefficient of agreement for nominal scales. *Educational and Psychological
  Measurement*, 20(1), 37-46.
- Holm, S. (1979). A simple sequentially rejective multiple test procedure. *Scandinavian Journal
  of Statistics*, 6(2), 65-70.
- Krippendorff, K. (2004). *Content Analysis: An Introduction to Its Methodology* (2e druk). Sage.
- Webber, W., Moffat, A. en Zobel, J. (2010). A similarity measure for indefinite rankings. *ACM
  Transactions on Information Systems*, 28(4), 20.
- Wilson, E. B. (1927). Probable inference, the law of succession, and statistical inference.
  *Journal of the American Statistical Association*, 22(158), 209-212.

Bibliografische details controleren tegen de bron voordat ze in het paper gaan.
