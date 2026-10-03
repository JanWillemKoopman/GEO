# De herhaalbaarheid van Google AI Overview

**Een meetonderzoek naar de consistentie van genoemde aanbieders, volgorde, aantal en sentiment
bij lokale commerciële zoekvragen, op desktop en mobiel**

Onderzoeksplan voor een wetenschappelijk paper. Versie 3, 3 oktober 2026. Status: plan, nog geen
data verzameld. Doorlooptijd: 7 dagen.

---

## 0. Uitvoering: Claude Code en DataForSEO, verder niets

Dit onderzoek wordt **volledig uitgevoerd door Claude Code**, met de **DataForSEO SERP API** als
enige externe bron. Er doen geen mensen mee als codeur of als proefpersoon, er wordt geen ander
taalmodel of andere dienst aangeroepen, en er is geen koppeling met andere software van de auteur.

| Taak | Wie of wat |
|---|---|
| Onderzoeksvragen, hypothesen, zoekvragen, codeerregels | Claude Code |
| Verzamelscript schrijven en elke twee uur draaien | Claude Code, via een geplande routine |
| Data ophalen | DataForSEO SERP API |
| Aanbieders herkennen, volgorde en aantal bepalen | code geschreven door Claude Code (vaste naamlijst) |
| Sentiment coderen | Claude Code zelf, volgens een vaste codeerinstructie |
| Betrouwbaarheid van de codering | Claude Code, twee onafhankelijke codeerrondes (§5.4) |
| Statistiek, figuren, concept methode- en resultatensectie | Claude Code (Python) |
| Vooraf vastleggen | versie met tijdstempel in git, vóór de hoofdmeting |

**Wat dat betekent voor het paper.** Twee dingen die in een klassiek ontwerp door mensen worden
gedaan, worden hier anders opgelost, en dat wordt in het paper benoemd:

1. **Geen menselijke codeurs.** Aanbieders worden niet door een taalmodel maar door een
   deterministische naamlijst herkend, die elke keer dezelfde uitkomst geeft en volledig te
   controleren is. Alleen het sentiment is een oordeel, en de betrouwbaarheid daarvan wordt
   gemeten als overeenstemming tussen twee onafhankelijke codeerrondes van Claude Code
   (test-hertestbetrouwbaarheid). Dat zegt iets over de **consistentie** van het oordeel, niet
   over de vraag of een mens hetzelfde zou oordelen. Dat staat als beperking in het paper.
2. **Geen controle met echte zoekers.** De conclusies gaan daarom uitsluitend over **wat een
   meetinstrument via een SERP-API te zien krijgt**. Dat is ook precies de bron die commerciële
   meettools voor AI-zichtbaarheid gebruiken, dus voor de onderzoeksvraag is dat de juiste
   afbakening. Of een echte zoeker in Amsterdam hetzelfde ziet, valt buiten dit onderzoek.

---

## 1. Probleemstelling

Een groeiend aantal bedrijven biedt "AI-zichtbaarheid" aan als meetbare grootheid: hoe vaak een
merk genoemd wordt in antwoorden van generatieve zoeksystemen. Google AI Overview is voor
Nederlandse ondernemers het meest zichtbare voorbeeld, omdat het boven de gewone zoekresultaten
staat.

Zo'n score veronderstelt dat het gemeten verschijnsel herhaalbaar is. Een AI Overview wordt door
een taalmodel samengesteld en kan per aanroep verschillen, ook als zoekvraag, plaats en apparaat
gelijk zijn. Hoe groot die variatie is, en welk deel toeval is en welk deel systematisch, is voor
een concrete Nederlandse lokale zoekmarkt niet openbaar en reproduceerbaar onderzocht.

**Doel.** Vaststellen hoe herhaalbaar Google AI Overview is in (a) welke aanbieders het noemt,
(b) in welke volgorde, (c) hoeveel, en (d) op welke toon, voor zoekvragen naar een Google
Ads-bureau in Amsterdam, en die variatie toeschrijven aan vier bronnen: toeval, tijdstip, apparaat
en formulering van de vraag.

**Praktische vertaling.** Hoeveel metingen zijn nodig voor een betrouwbare zichtbaarheidsscore, en
hoe groot moet een verandering zijn voordat die van toeval te onderscheiden is?

**Afbakening.** Eén branche (Google Ads-dienstverlening), één stad (Amsterdam), Nederlands, vijf
meetdagen, gemeten via een SERP-API.

## 2. Onderzoeksvragen en hypothesen

Deze vragen zijn definitief en worden vóór de hoofdmeting vastgelegd (§4.7).

### 2.1 Onderzoeksvragen

**Hoofdvraag.** In hoeverre levert Google AI Overview bij herhaalde, identieke zoekopdrachten naar
een Google Ads-bureau in Amsterdam hetzelfde antwoord op, en welke factoren verklaren de variatie?

| # | Deelvraag | Soort |
|---|---|---|
| OV1 | Hoe vaak verschijnt er een AI Overview, en verschilt dat per zoekvraag en apparaat? | beschrijvend |
| OV2 | Hoe sterk overlappen de genoemde aanbieders bij exacte herhaling binnen hetzelfde tijdvak? | toetsend (H1) |
| OV3 | Neemt die overlap af naarmate er meer tijd tussen twee metingen zit? | toetsend (H2) |
| OV4 | Verschillen desktop en mobiel in welke aanbieders genoemd worden? | toetsend (H3) |
| OV5 | Bepaalt de formulering van de vraag het antwoord sterker dan het apparaat? | toetsend (H4) |
| OV6 | Hoe stabiel is de volgorde, en in het bijzonder de eerste plek? | beschrijvend |
| OV7 | Hoeveel aanbieders worden genoemd, en hoe sterk schommelt dat? | beschrijvend |
| OV8 | In welk sentiment worden aanbieders genoemd, en is dat per aanbieder stabiel? | beschrijvend |
| OV9 | Hoe groot is de meetfout van een zichtbaarheidsscore bij een gegeven aantal metingen? | afgeleid (simulatie) |
| OV10 | Komen de genoemde aanbieders overeen met de organische resultaten en het kaartblok? | verkennend |

**Waarom maar vier toetsende hypothesen.** Elke extra toets vergroot de kans op een toevallig
"significant" resultaat. Vier vooraf vastgelegde hypothesen met een duidelijk gemarkeerd
beschrijvend en verkennend deel zijn beter verdedigbaar dan twintig toetsen achteraf.

### 2.2 Hypothesen

De hypothesen gebruiken de **Jaccard-overlap** J tussen de verzamelingen genoemde aanbieders van
twee AI Overviews: het aantal gedeelde aanbieders gedeeld door het aantal verschillende aanbieders
samen (0 is niets gemeen, 1 is identiek). Definitie en randgevallen in §6.

| # | Hypothese | Toets en beslisregel |
|---|---|---|
| **H1** | Bij exacte herhaling (zelfde vraag, apparaat en tijdvak) is het antwoord niet praktisch stabiel: de gemiddelde J ligt onder 0,80. | Eenzijdig. Bovengrens van het 95%-bootstrapinterval van de gemiddelde J ligt onder 0,80. |
| **H2** | De overlap neemt af met de tijd tussen twee metingen. | Helling van J op log(tijdsverschil in uren) is negatief; 95%-interval van de helling ligt onder 0. |
| **H3** | Desktop en mobiel geven systematisch andere antwoorden: J tussen apparaten in hetzelfde tijdvak is lager dan J binnen een apparaat in hetzelfde tijdvak. | Permutatietoets (10.000 permutaties van het apparaatlabel binnen tijdvak en vraag), alfa 0,05. |
| **H4** | Formulering weegt zwaarder dan apparaat: J tussen twee formuleringen van dezelfde soort is lager dan J tussen apparaten bij dezelfde formulering. | Verschil in gemiddelde J met hiërarchisch bootstrapinterval; interval ligt geheel boven 0. |

**Waarom 0,80 als grens in H1.** Bij een typische lijst van vijf aanbieders betekent J = 0,80 dat
gemiddeld ongeveer één aanbieder wisselt. Daaronder is een enkele meting niet meer als "het
antwoord" te beschouwen. In de discussie wordt ook gerapporteerd bij welke grens de conclusie zou
omslaan.

**Correctie voor meervoudig toetsen.** De vier hypothesen met Holm (1979). Toetsen per aanbieder
zijn verkennend en worden gecorrigeerd met Benjamini en Hochberg (1995).

## 3. Onderzoeksontwerp

### 3.1 Type onderzoek

Een **herhaald-metingenonderzoek met een volledig gekruist factorieel ontwerp**: elke zoekvraag
wordt op elk apparaat in elk tijdvak meerdere keren gemeten. Het is een observationeel meetonderzoek
naar een systeem, geen experiment met mensen.

### 3.2 Factoren

| Factor | Niveaus | Toelichting |
|---|---|---|
| Zoekvraag | 12, genest in 4 soorten van 3 | §3.3 |
| Apparaat | 2: desktop (Windows), mobiel | mobiel besturingssysteem gekozen in de pilot, §4.5 |
| Tijdvak | 60: elke 2 uur, 5 dagen | dekt dag, nacht, werkdag en weekend |
| Herhaling | 3 per tijdvak | zuivere herhaling, binnen enkele minuten |

Totaal: 12 × 2 × 60 × 3 = **4.320 metingen**, plus een pilot van ongeveer 150.

**Waarom deze verdeling.** Het ontwerp moet vier bronnen van variatie scheiden. Dat lukt alleen als
elke bron afzonderlijk varieert terwijl de rest gelijk blijft:

- **toeval**: drie herhalingen in hetzelfde tijdvak, al het andere gelijk;
- **tijd**: hetzelfde, maar in een ander tijdvak (2 uur tot 5 dagen later);
- **apparaat**: dezelfde vraag in hetzelfde tijdvak op het andere apparaat;
- **formulering**: een andere vraag van dezelfde soort, zelfde tijdvak en apparaat.

Dat levert de **gelijkenisladder** op, de ruggengraat van de analyse (§7.2).

**Waarom elke 2 uur en 3 herhalingen.** Binnen 7 dagen blijven 5 meetdagen over (§12). Elke 2 uur
geeft 12 tijdvakken per etmaal, genoeg voor een dagritme. Drie herhalingen is het minimum om binnen
een tijdvak een spreiding te schatten (twee geeft één paar, drie geeft er drie). Meer herhalingen
zou ten koste gaan van het aantal tijdvakken.

### 3.3 Zoekvragen

Vier soorten zoekgedrag, elk drie formuleringen. Na de pilot stelt Claude Code ze definitief vast
volgens de regel in §4.5.

| Soort | Formuleringen |
|---|---|
| S1 Kort zoekwoord | "google ads bureau amsterdam" · "sea bureau amsterdam" · "google ads specialist amsterdam" |
| S2 Vergelijkend | "beste google ads bureau amsterdam" · "top google ads bureaus amsterdam" · "goed sea bureau amsterdam voor mkb" |
| S3 Vraag | "welk bureau in amsterdam kan mijn google ads beheren?" · "wie kan in amsterdam mijn google ads campagne verbeteren?" · "welk marketingbureau in amsterdam is goed in google ads?" |
| S4 Opdracht met context | "google ads uitbesteden amsterdam kosten" · "google ads beheer laten doen klein bedrijf amsterdam" · "google ads bureau amsterdam ervaringen" |

Reservevragen per soort (alleen gebruikt als een vraag in de pilot afvalt): S1 "google ads bureau
in amsterdam", S2 "google ads bureau amsterdam vergelijken", S3 "waar vind ik een goed google ads
bureau in amsterdam?", S4 "google ads uitbesteden mkb amsterdam".

**Waarom een plaatsnaam in elke vraag.** Een locatie-instelling alleen is een zwakke manipulatie van
"zoeken vanuit Amsterdam". Met plaatsnaam én locatie is de lokale intentie ondubbelzinnig.

**Waarom vier soorten.** Meetinstrumenten verantwoorden zelden welke formulering ze kiezen. Blijkt
formulering de grootste bron van variatie (H4), dan is die keuze belangrijker dan het aantal
metingen.

## 4. Dataverzameling

### 4.1 Instrument

DataForSEO SERP API, endpoint `serp/google/organic/live/advanced`, één taak per aanroep.

| Parameter | Waarde | Reden |
|---|---|---|
| `keyword` | de zoekvraag, letterlijk | schrijfwijze ligt vast |
| `language_code` | `nl` | Nederlandstalige interface |
| `location_coordinate` | centrum Amsterdam (Dam), formaat en straal volgens actuele documentatie | preciezer dan een stadsnaam; exacte waarde vastgelegd vóór de hoofdmeting |
| `device` / `os` | `desktop`/`windows` en `mobile`/(pilot) | §4.5 |
| `depth` | 10 | organische top 10 voor OV10 |
| `load_async_ai_overview` | `true` | zonder deze vlag kan het AI-overzicht zonder inhoud terugkomen |

**Waarom de live-variant en niet de goedkopere wachtrij.** Bij de wachtrij bepaalt de leverancier
wanneer de zoekopdracht werkelijk wordt uitgevoerd. Voor onderzoek naar variatie in de tijd moet
het tijdstip in onze hand liggen en bekend zijn.

### 4.2 Volgorde binnen een tijdvak

Per tijdvak 72 aanroepen (12 vragen × 2 apparaten × 3 herhalingen), in drie rondes: eerst
herhaling 1 van alle 24 combinaties in willekeurige volgorde, dan herhaling 2 in een nieuwe
willekeurige volgorde, dan herhaling 3. Hooguit vijf aanroepen tegelijk. De willekeurige volgorde
komt uit een vastgelegde startwaarde (seed) per tijdvak, zodat hij te reproduceren is.

**Waarom.** Zo liggen de drie herhalingen van één combinatie enkele minuten uit elkaar, en heeft
geen vraag systematisch de eerste of laatste plek. Een vaste volgorde zou tijd en vraag vermengen.

### 4.3 Wat per aanroep wordt bewaard

- de **volledige ruwe JSON-respons**, onbewerkt, als bron van waarheid;
- tijdstempel van verzenden en ontvangen (UTC) en het tijdstip dat DataForSEO zelf rapporteert;
- vraag, soort, apparaat, besturingssysteem, tijdvak, herhaling, positie in de volgorde;
- statuscode, aantal pogingen, kosten;
- afgeleid: AI Overview aanwezig, volledige tekst, bronnen (adres, domein, titel), organische top
  10, bedrijven in het kaartblok.

Eén tabel met één rij per aanroep, plus een map met ruwe bestanden. Na elk tijdvak wordt alles in
git vastgelegd, zodat er achteraf niets ongemerkt kan veranderen.

### 4.4 Mislukte aanroepen

Een aanroep met een foutcode wordt binnen hetzelfde tijdvak hooguit drie keer opnieuw geprobeerd.
Lukt het dan nog niet, dan is de meting **ontbrekend**, nooit "geen AI Overview". Het aantal
ontbrekende metingen wordt per vraag, apparaat en tijdvak gerapporteerd. Ligt het boven 5%, dan
volgt een gevoeligheidsanalyse (§9.3).

**Waarom.** Een mislukte aanroep als "geen overzicht" tellen verlaagt kunstmatig de aanwezigheid
én de overlap, en bootst daarmee precies het effect na dat dit onderzoek wil meten.

### 4.5 Pilot (dag 1)

Ongeveer 150 aanroepen, met vaste beslisregels zodat de keuzes niet op gevoel gaan:

1. **Werkt het instrument?** Geen lege AI-overzichten bij een aanwezig blok; ruwe JSON compleet.
2. **Zoekvragen.** Elke vraag vijf keer per apparaat. Een vraag met in minder dan 2 van de 10
   pogingen een AI Overview wordt vervangen door de reservevraag van dezelfde soort. Het
   percentage zelf is een uitkomst (OV1) en wordt gerapporteerd.
3. **Mobiel besturingssysteem.** iOS en Android elk tien keer op drie vragen. Is de gemiddelde J
   tussen beide niet lager dan binnen één systeem, dan wordt Android gebruikt (grootste
   marktaandeel in Nederland, op dag 1 nagezocht). Is hij wel lager, dan ook Android, en het
   verschil wordt als beperking gemeld.
4. **Locatie-instelling.** Drie vragen met Amsterdam, Rotterdam en heel Nederland. Beschrijvend,
   voor de discussie.

Pilotdata telt **niet** mee in de hoofdanalyse.

### 4.6 Hoe de meting vijf dagen blijft draaien

Een Claude Code-sessie in de cloud blijft niet vijf dagen open. Daarom wordt een **geplande
routine van Claude Code** ingesteld die elke twee uur een nieuwe sessie start. Die sessie draait het
verzamelscript voor één tijdvak, controleert de uitkomst (aantal geslaagde aanroepen, lege
overzichten, kosten) en legt de data vast in git. De routine stopt zichzelf na tijdvak 60.

Het werkelijke tijdstip van elke aanroep wordt bewaard, want een geplande routine kan enkele
minuten uitlopen. De DataForSEO-sleutel staat in de omgeving van Claude Code (nagekeken op
3 oktober 2026: aanwezig).

### 4.7 Vooraf vastleggen

Aan het eind van dag 1, vóór de hoofdmeting, legt Claude Code vast in één git-versie met een
herkenbaar label: definitieve zoekvragen, parameters, hypothesen met beslisregels, uitkomstmaten,
codeerinstructie, aanbiederslijst versie 1, en de analysecode, getest op de pilotdata. De
tijdstempel van GitHub bewijst dat dit vóór de data bestond. Elke latere afwijking wordt in het
paper benoemd met reden.

## 5. Van tekst naar variabelen (codering)

### 5.1 Aanbiederslijst

Na de pilot stelt Claude Code een lijst op van alle genoemde aanbieders: canonieke naam,
schrijfvarianten en domein. Twee namen worden alleen samengevoegd op grond van een vaste regel
(zelfde domein). Twijfelgevallen blijven gescheiden en worden gemeld.

**Wat telt als "genoemd".** Een aanbieder die met naam in de tekst van het AI-overzicht staat. Een
aanbieder die alleen als bronlink verschijnt telt apart ("geciteerd"), omdat een lezer die naam niet
leest. Platforms en gidsen (vergelijkingssites, overzichtslijsten) worden als aparte categorie
gecodeerd en niet als aanbieder meegeteld.

### 5.2 Herkenning door een naamlijst, niet door een taalmodel

Een script zoekt per AI-overzicht de schrijfvarianten uit de lijst op (hoofdletterongevoelig, op
woordgrenzen) en bepaalt per aanbieder of hij genoemd wordt en op welke positie hij voor het eerst
voorkomt. Daaruit volgen verzameling, volgorde en aantal.

**Waarom zo.** Dezelfde tekst geeft altijd dezelfde uitkomst, en elke telling is na te rekenen. Een
taalmodel als herkenner zou zelf variatie toevoegen aan een onderzoek dat juist variatie meet.

**Nieuwe namen opvangen.** Elk tijdvak haalt het script kandidaten uit de tekst die niet in de lijst
staan (woordgroepen met hoofdletters, namen bij een domein uit de bronnen). Claude Code beoordeelt
die kandidaten dagelijks en vult de lijst aan; elke aanvulling krijgt een datum. Na de meting
draait de herkenning **opnieuw over alle data** met de definitieve lijst, zodat vroege en late
metingen gelijk behandeld worden.

**Controle op de herkenning.** Claude Code leest een willekeurige steekproef van 200 overzichten
volledig, zonder de uitkomst van het script te zien, en noteert alle genoemde aanbieders. Vergeleken
met het script levert dat precisie en recall op. Grens: F1 ≥ 0,95. Haalt het script dat niet, dan
wordt de lijst verbeterd en de controle herhaald op een nieuwe steekproef.

### 5.3 Sentiment

Claude Code codeert per vermelding (de zin waarin de aanbieder voorkomt) in vier categorieën:

| Code | Betekenis | Herkenbaar aan |
|---|---|---|
| A | aanbevolen | expliciet aanraden, "bekend om", "sterk in", "een goede keuze" |
| N | neutraal genoemd | in een opsomming zonder oordeel |
| V | met voorbehoud | positief met een kanttekening ("al is het duurder") |
| NEG | negatief | afgeraden of overwegend negatief |

Letterlijk identieke zinnen worden één keer gecodeerd en die code geldt voor elke keer dat de zin
voorkomt. Dat maakt de codering consistent en beperkt het werk.

**Waarom vier categorieën en geen schaal van 1 tot 5.** Een AI-overzicht oordeelt zelden expliciet.
Een fijne schaal geeft schijnprecisie en verlaagt de overeenstemming tussen codeerrondes.

### 5.4 Betrouwbaarheid van de sentimentcodering

Zonder menselijke codeurs wordt betrouwbaarheid gemeten als **test-hertestbetrouwbaarheid**: een
gestratificeerde steekproef van 300 unieke vermeldingszinnen wordt een tweede keer gecodeerd, in een
aparte sessie, zonder toegang tot de eerste codering en in een andere volgorde.

| Wat | Maat | Grens |
|---|---|---|
| Ronde 1 tegen ronde 2 | Krippendorffs alfa | ≥ 0,80 voor stevige conclusies; 0,667 tot 0,80 alleen voorlopig (Krippendorff, 2004) |

Onder 0,667 wordt het sentiment in het paper alleen beschrijvend genoemd, zonder conclusies. Dit
besluit ligt vooraf vast. Wat deze maat **niet** zegt: of een mens hetzelfde oordeel zou geven. Dat
wordt als beperking benoemd.

## 6. Uitkomstmaten

Notatie: voor een AI-overzicht is A de verzameling genoemde aanbieders en L de geordende lijst.

| Maat | Definitie | Waarom deze maat |
|---|---|---|
| **Aanwezigheid** | 1 als er een AI Overview met inhoud is, anders 0 | los geanalyseerd, zodat "geen overzicht" de overlap niet vervuilt |
| **Jaccard J** | \|A₁ ∩ A₂\| / \|A₁ ∪ A₂\| | eenvoudig, begrensd tussen 0 en 1, goed uit te leggen |
| **Rank-biased overlap (RBO)** | gewogen overlap van twee ranglijsten met meer gewicht bovenaan (Webber, Moffat en Zobel, 2010), p = 0,8, extrapolatieversie | werkt bij lijsten van ongelijke lengte met deels andere namen, waar Kendalls tau dat niet kan; p = 0,8 legt het zwaartepunt op de eerste vijf plekken. Gevoeligheid: p = 0,7 en 0,9 |
| **Behoud eerste plek** | 1 als de eerst genoemde aanbieder in beide overzichten gelijk is | "sta ik bovenaan?" |
| **Aantal** | \|A\| | OV7 |
| **Vermeldingskans** van aanbieder b | aandeel geslaagde metingen waarin b genoemd wordt | wat meettools rapporteren |
| **Sentimentstabiliteit** van b | aandeel vermeldingen van b met het meest voorkomende sentiment | is de toon per aanbieder vast? |

**Randgevallen, vooraf vastgelegd.**

- Overlap alleen tussen twee overzichten die allebei aanwezig zijn.
- Zijn A₁ en A₂ beide leeg, dan is J niet gedefinieerd. Die paren worden geteld en uitgesloten.
- **Vermeldingskans heeft twee noemers**: alle geslaagde metingen (hoofdmaat: wat een zoeker
  gemiddeld ziet) en alleen metingen met een overzicht. Beide worden gerapporteerd, omdat een
  meettool die ontbrekende overzichten negeert de zichtbaarheid overschat.

## 7. Statistische analyse

Alle analyses in **Python** (pandas, NumPy, SciPy, statsmodels, matplotlib), door Claude Code
geschreven en gedraaid. Elk getal in het paper komt uit een script dat met één commando opnieuw
te draaien is.

### 7.1 Beschrijvend

Per vraag en apparaat: aanwezigheid met **Wilson-interval** (Wilson, 1927; beter dan het gewone
interval bij kansen dicht bij 0 of 1), mediaan en interkwartielafstand van het aantal aanbieders,
vermeldingskans per aanbieder met interval.

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

Per trede de gemiddelde J, RBO en het behoud van de eerste plek, met 95%-interval. Trede 0 is de
basislijn van puur toeval; elke verdere daling is systematische variatie door die ene factor.

**Afhankelijkheid tussen paren.** Hetzelfde overzicht zit in veel paren, dus gewone toetsen zouden
de onzekerheid onderschatten. Daarom:

- **Hiërarchische bootstrap** voor intervallen: trek met teruglegging eerst vragen, dan binnen elke
  vraag tijdvakken, en bereken de maat opnieuw. 5.000 herhalingen, percentielinterval.
- **Permutatietoets** voor H3: binnen elk tijdvak en elke vraag wordt het apparaatlabel willekeurig
  verwisseld. Maakt het apparaat niets uit, dan verandert het verschil tussen trede 0 en 1 daar niet
  door. 10.000 permutaties.

**Waarom deze aanpak en geen variantieanalyse.** De uitkomst is een verzameling namen, geen getal.
De ladder vertaalt elke bron van variatie direct naar een daling in overlap, statistisch
verdedigbaar en in één figuur te laten zien.

### 7.3 Verloop in de tijd (H2)

Voor alle paren met dezelfde vraag en hetzelfde apparaat: J als functie van log(Δt in uren), met
de helling geschat via kleinste kwadraten en het interval via de hiërarchische bootstrap. Daarnaast
aanwezigheid en aantal per uur van de dag, en werkdag tegen weekend.

**Beperking.** Vijf dagen kan een langzame trend niet onderscheiden van een eenmalige wijziging bij
Google. Een plotselinge sprong in de tijdreeks wordt apart gemeld, niet als trend.

### 7.4 Vermeldingskans en variantieverdeling (aanvullend op H3 en H4)

Per aanbieder die minstens 50 keer genoemd wordt (zeldzame namen maken een model onstabiel):

1. **Logistische regressie met GEE** (generalized estimating equations, statsmodels):
   `genoemd ~ apparaat + soort_vraag + aanbieder + apparaat:aanbieder`, met clustering op vraag ×
   tijdvak en een uitwisselbare correlatiestructuur. **Waarom GEE:** het geeft betrouwbare
   standaardfouten bij metingen die binnen een tijdvak op elkaar lijken, zonder de rekenkundige
   instabiliteit van een volledig gemengd model met veel gekruiste toevalseffecten.
2. **Variantieverdeling** met een Bayesiaans logistisch gemengd model (statsmodels
   `BinomialBayesMixedGLM`) met toevalseffecten voor aanbieder × vraag, tijdvak en apparaat ×
   aanbieder. Uit de variantiecomponenten volgt welk deel van de variatie waar ligt.

Komen ladder en model tot dezelfde rangorde van bronnen, dan versterkt dat de conclusie; wijken ze
af, dan wordt dat besproken. Convergeert het gemengde model niet, dan vallen toevalseffecten weg in
een vooraf vastgelegde volgorde (eerst apparaat × aanbieder, dan tijdvak), en dat wordt gemeld.

### 7.5 Aantal en sentiment (OV7, OV8)

Aantal aanbieders: Poisson-GEE (of negatief binomiaal bij overdispersie) met apparaat en soort vraag,
clustering op vraag × tijdvak. Sentiment beschrijvend: verdeling per aanbieder en
sentimentstabiliteit; een toets alleen bij voldoende variatie en alfa ≥ 0,80 (§5.4).

### 7.6 Simulatie: wat een meettool ziet (OV9)

De 4.320 metingen dienen als beste benadering van de werkelijke verdeling. Daaruit worden 10.000
keer steekproeven getrokken zoals een meettool die neemt: k metingen per vraag, met k = 1, 3, 5,
10, 20, 30, 60, op willekeurige tijdvakken.

Per k:

1. de breedte van het interval waarbinnen 95% van de gemeten vermeldingskansen valt, per aanbieder;
2. de **schijnveranderingskans**: hoe vaak twee onafhankelijke steekproeven van k metingen uit
   dezelfde week een verschil van 10 procentpunt of meer geven, terwijl er niets veranderd is;
3. het kleinste k waarbij die kans onder 5% zakt.

Theoretische ondergrens bij een vermeldingskans van 30% en onafhankelijke metingen (halve breedte
van het 95%-interval ≈ 1,96 × √(0,21 / k)):

| k | halve breedte |
|---|---|
| 5 | ± 40 procentpunt |
| 10 | ± 28 procentpunt |
| 30 | ± 16 procentpunt |
| 60 | ± 12 procentpunt |

De simulatie laat zien hoeveel slechter het in werkelijkheid is, omdat metingen kort na elkaar op
elkaar lijken en dus minder informatie geven.

### 7.7 Organische resultaten en kaartblok (OV10, verkennend)

Per meting de overlap tussen aanbieders in het AI-overzicht en (a) de domeinen in de organische
top 10, (b) de bedrijven in het kaartblok. Beschrijvend.

## 8. Steekproefomvang en onderscheidend vermogen

- **Per vraag en apparaat** 180 metingen. Bij een vermeldingskans van 50% is de halve breedte van
  het interval 7,3 procentpunt bij onafhankelijke metingen, tot ongeveer 12,7 procentpunt als de drie
  herhalingen sterk op elkaar lijken (ontwerpeffect 3).
- **Desktop tegen mobiel**, alle vragen samen: 2.160 metingen per apparaat. Bij 30%, 80%
  onderscheidend vermogen en alfa 0,05 is het kleinste aantoonbare verschil ongeveer 4 procentpunt,
  en ongeveer 5,5 procentpunt bij ontwerpeffect 2. Kleinere verschillen kan dit onderzoek niet
  aantonen.
- **Gelijkenisladder.** Trede 0 levert 4.320 paren, maar het aantal effectief onafhankelijke
  eenheden is lager: 12 vragen en 60 tijdvakken. De hiërarchische bootstrap houdt daar rekening mee.
  **Twaalf vragen is de zwakste schakel**: de uitkomsten over formulering gelden voor deze twaalf
  vragen, niet voor zoekvragen in het algemeen.

## 9. Validiteit en betrouwbaarheid

### 9.1 Constructvaliditeit

Een API-aanroep heeft geen zoekgeschiedenis, geen ingelogd account en een gesimuleerde locatie. Dit
onderzoek meet daarom **wat een meetinstrument via een SERP-API ziet**, en zegt niets over wat een
individuele zoeker ziet. Omdat commerciële meettools dezelfde soort bron gebruiken, is dat voor de
onderzoeksvraag de juiste meting.

### 9.2 Caching bij de leverancier

Geeft DataForSEO een eerder opgehaald resultaat terug, dan lijkt Google stabieler dan hij is.
Controles: het tijdstip dat DataForSEO per resultaat rapporteert, en het aantal letterlijk
identieke overzichten binnen een tijdvak. Een opvallend hoog aandeel wordt in het paper gemeld.

### 9.3 Ontbrekende metingen

Mislukte aanroepen apart geteld (§4.4). Bij meer dan 5% ontbrekend wordt gekeken of dat samenhangt
met tijdvak, vraag of apparaat, en worden de hoofdmaten opnieuw berekend op alleen de complete
tijdvakken.

### 9.4 Veranderingen bij Google tijdens de meting

Een update midden in de week verschijnt als "tijdseffect". De tijdreeks wordt gecontroleerd op een
plotselinge sprong (§7.3), en Claude Code zoekt na afloop of Google in die week een wijziging
aankondigde.

### 9.5 De codeur is ook de analist

Claude Code stelt de hypothesen op, codeert en analyseert. Drie maatregelen beperken het risico dat
dat de uitkomst kleurt: alles ligt vóór de meting vast (§4.7); de herkenning van aanbieders is een
deterministisch script; en het sentiment wordt gecodeerd per zin, zonder te weten bij welke vraag,
welk apparaat of welk tijdvak die zin hoort.

### 9.6 Externe validiteit

Eén branche, één stad, één week. Het ontwerp en de code zijn direct herbruikbaar voor herhaling
in andere branches of steden; dat wordt als vervolgonderzoek voorgesteld.

## 10. Visualisaties in het paper

Elke figuur beantwoordt precies één onderzoeksvraag.

| Fig. | Wat | Vorm | Vraag |
|---|---|---|---|
| 1 | Het meetontwerp: factoren, tijdvakken, herhalingen | schema | methode |
| 2 | **Het vermeldingsraster**: aanbieders (rijen) tegen alle 180 metingen van één vraag en apparaat (kolommen, op tijd), vakje gekleurd als genoemd | heatmap | in één oogopslag hoe grillig het is |
| 3 | Aanwezigheid van een AI Overview per vraag en apparaat | punten met foutbalken | OV1 |
| 4 | **De gelijkenisladder**: J, RBO en behoud eerste plek per trede | punten met foutbalken | H1, H3, H4 |
| 5 | Overlap tegen tijd tussen twee metingen | lijn met betrouwbaarheidsband | H2 |
| 6 | Vermeldingskans per aanbieder op desktop en mobiel | dumbbell: twee punten per aanbieder met een lijn ertussen | H3 |
| 7 | Op welke plek elke aanbieder genoemd wordt | gestapelde staven (plek 1, 2, 3, …) | OV6 |
| 8 | Aantal genoemde aanbieders per overzicht, per soort vraag | histogram | OV7 |
| 9 | Sentiment per aanbieder | gestapelde staven, vier categorieën | OV8 |
| 10 | **Meetfout tegen aantal metingen**: intervalbreedte en schijnveranderingskans tegen k | twee lijnen, horizontale lijn bij 5% | OV9 |

Tabellen: 1. zoekvragen met aanwezigheid; 2. betrouwbaarheid van herkenning en codering;
3. GEE- en modelresultaten; 4. uitkomst per hypothese met beslissing.

Vormgeving: vaste kleur voor desktop en voor mobiel door het hele paper, kleuren die ook voor
kleurenblinden te onderscheiden zijn, altijd een interval bij een schatting, aanbieders
geanonimiseerd (§14) en in vaste volgorde (op totale vermeldingskans) in alle figuren. Figuren als
vectorbestand (PDF of SVG) en als PNG.

## 11. Opbouw van het paper

IMRaD-opbouw:

1. **Samenvatting** (250 woorden).
2. **Inleiding**: opkomst van AI-zichtbaarheidsmeting, waarom herhaalbaarheid een voorwaarde is,
   wat er bekend is. Claude Code doet op dag 1 een literatuurverkenning met de zoekfunctie van
   Claude Code, met zoektermen als *reproducibility of LLM outputs*, *non-determinism large
   language models*, *search engine result volatility*, *generative engine optimization*, *AI
   Overviews*. Alleen bronnen die daadwerkelijk gevonden en gelezen zijn worden opgenomen.
3. **Methode**: §0 en §3 tot en met §7, verkort, met verwijzing naar de vastgelegde versie.
4. **Resultaten**: per hypothese met effectgrootte en interval, daarna beschrijvend en verkennend.
5. **Discussie**: betekenis voor meettools en ondernemers, beperkingen (§0 en §9), vervolg.
6. **Conclusie**.
7. **Data en code**, **belangenverklaring**, **literatuur**, **bijlagen** (codeerinstructie,
   aanbiederslijst geanonimiseerd, volledige parameters, afwijkingen van het plan).

## 12. Planning in 7 dagen

| Dag | Meting | Werk van Claude Code ernaast |
|---|---|---|
| **1** | pilot (±150 aanroepen) | verzamelscript schrijven, pilot draaien, beslisregels uit §4.5 toepassen, aanbiederslijst v1, codeerinstructie, analysecode op pilotdata, literatuurverkenning, **vastleggen in git**, routine instellen; hoofdmeting start om middernacht |
| **2** | tijdvak 1 t/m 12 | elke 2 uur een controle per tijdvak; nieuwe namen beoordelen |
| **3** | tijdvak 13 t/m 24 | sentiment coderen op de data tot nu toe; herkenningscontrole (200 overzichten) |
| **4** | tijdvak 25 t/m 36 | sentiment bijwerken; tweede codeerronde voor de betrouwbaarheid (300 zinnen) |
| **5** | tijdvak 37 t/m 48 | betrouwbaarheid berekenen; methodesectie schrijven |
| **6** | tijdvak 49 t/m 60 | alle analyses en figuren als generale repetitie op de data tot nu toe; meting stopt om middernacht |
| **7** | klaar | herkenning opnieuw over alle data, laatste zinnen coderen, alle analyses en figuren definitief, resultatensectie schrijven |

Na dag 7 liggen er: de volledige dataset, alle figuren en tabellen, een methode- en
resultatensectie, en de uitkomst per hypothese.

**Startdag.** Bij voorkeur een woensdag of donderdag, zodat er minstens één weekenddag in de
meting valt.

## 13. Kosten

| Post | Schatting |
|---|---|
| DataForSEO, pilot en hoofdmeting (±4.500 aanroepen, inclusief herkansingen) | $15 tot $25; prijs per aanroep op dag 1 vastgesteld uit het kostenveld van de pilotrespons |
| Claude Code (dagelijks werk en 60 geplande sessies) | binnen het Claude-abonnement van de auteur |
| Python-pakketten, git | gratis |

Een bestedingsplafond bij DataForSEO voorkomt verrassingen. Het script stopt zelf als de werkelijke
kosten 50% boven de schatting uitkomen.

## 14. Ethiek, transparantie en belangen

- **Geen persoonsgegevens**: alleen openbare zoekresultaten, geen proefpersonen.
- **Aanbieders geanonimiseerd** in het paper (Aanbieder A, B, …): het onderzoek gaat over de meting,
  niet over de kwaliteit van bureaus. De koppeling met echte namen wordt bewaard, niet gepubliceerd.
- **Openbaar** (als de auteur dat wil): vastgelegd plan, verzamelscript, analysecode en de
  gecodeerde data met geanonimiseerde namen.
- **Rol van AI.** Het paper vermeldt dat ontwerp, dataverzameling, codering en analyse door Claude
  Code zijn uitgevoerd en dat de auteur verantwoordelijk is voor de inhoud.
- **Belangenverklaring.** De auteur werkt in de markt voor AI-zichtbaarheid; dat wordt vermeld.

## 15. Wat de auteur nog beslist

1. **Startdag** (bij voorkeur woensdag of donderdag).
2. **Bestedingsplafond** bij DataForSEO (voorstel: $40).
3. **Openbaar maken** van data en code: ja of nee.
4. **Publicatieplek** (voorpublicatie, vakblad, eigen site): bepaalt format en lengte.

---

## Literatuur bij de methode

- Benjamini, Y. en Hochberg, Y. (1995). Controlling the false discovery rate. *Journal of the Royal
  Statistical Society, Series B*, 57(1), 289-300.
- Holm, S. (1979). A simple sequentially rejective multiple test procedure. *Scandinavian Journal
  of Statistics*, 6(2), 65-70.
- Krippendorff, K. (2004). *Content Analysis: An Introduction to Its Methodology* (2e druk). Sage.
- Webber, W., Moffat, A. en Zobel, J. (2010). A similarity measure for indefinite rankings. *ACM
  Transactions on Information Systems*, 28(4), 20.
- Wilson, E. B. (1927). Probable inference, the law of succession, and statistical inference.
  *Journal of the American Statistical Association*, 22(158), 209-212.

Bibliografische details worden tegen de bron gecontroleerd voordat ze in het paper gaan.
