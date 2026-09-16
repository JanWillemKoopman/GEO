# Zoekdata in de keten: Search Console en DataForSEO van meetlaag naar stuurlaag

**Opgesteld:** 16 september 2026. **Status: bouwplan, nog niets gebouwd.**

**Waar dit op voortbouwt.** `docs/tasks/ontwikkelplan-visie.md` heeft twee sprints die hier over
gaan: sprint 2 (de zoekopdrachten uit Search Console erbij halen, gratis) en sprint 8 (echte
zoekvolumes via DataForSEO, een paar dollar per maand). Die twee sprints zeggen **wat** er
gekoppeld wordt. Dit document zegt **waar in de keten het landt en wat het daar verandert**, en dat
is het stuk dat ontbrak: een koppeling die alleen een scherm vult, verandert geen enkele beslissing
die de app voor een klant neemt.

**De prijsvergelijking uit §6 van dat plan is op 16 september 2026 opnieuw nagezocht en klopt nog
steeds.** DataForSEO blijft de aanbeveling: betalen per aanroep, geen abonnement, ongeveer 6
dollarcent per duizend zoektermen.

---

## 1. Wat elke bron wél en niet kan, en waarom dat het hele ontwerp bepaalt

Dit hoofdstuk staat vooraan omdat elke keuze verderop eruit volgt. Alle drie de regels zijn
nagekeken bij de documentatie van Google zelf, niet uit het geheugen opgeschreven.

### 1.1 Search Console: een telling van waar je al staat

Een vertoning is geen schatting maar een telling: hoe vaak een pagina van dit merk in de
zoekresultaten verscheen. Daar komen drie grenzen bij die het ontwerp sturen:

1. **Alleen zoekopdrachten waarbij de site al verscheen.** Staat een merk nergens voor "dakinspectie
   kosten", dan telt die zoekopdracht nul, hoe vaak hij ook gezocht wordt. Search Console kan dus
   per definitie niet vertellen waar de onaangeboorde vraag zit, en dat is precies de kant waar de
   kansen van dit product zitten.
2. **Ongeveer de helft van de losse zoekopdrachten is verborgen.** Google toont een zoekterm niet
   apart als te weinig verschillende mensen hem gebruikten. Een onderzoek van Ahrefs over 22 miljard
   klikken kwam op 46,8 procent. ⚠️ Belangrijk gevolg voor dit plan: die verborgen zoekopdrachten
   tellen **wel** mee in het totaal per pagina. De cijfers die `search_console_days` vandaag al
   bewaart zijn dus compleet; wat we erbij bouwen is per definitie een deellijst. Dat hoort op het
   scherm te staan, anders leest een lijst van twintig zoektermen als het hele verhaal.
3. **De gemiddelde positie is een gemiddelde over apparaten, plaatsen en dagen**, en per
   zoekopdracht de hoogste plek waarop het merk verscheen. Het is geen ranktracker, en dat moet er
   bij staan (dezelfde eerlijkheidsregel die sprint 2 al noemt).

### 1.2 DataForSEO: een schatting van waar de vraag zit

Dit vult precies het gat van punt 1: het zegt hoe vaak een zoekterm gezocht wordt, ook als dit merk
daar nergens verschijnt. Ook hier een eerlijke grens: Google telt bij een zoekterm de
spellingsvarianten en sterk verwante zoekopdrachten mee, dus het is een optelsom en geen exacte
telling van precies die ene zin. Voor een brede zakelijke term maakt dat weinig uit, voor een lange
specifieke vraag kan het cijfer ruimer zijn dan de werkelijkheid.

### 1.3 De regel die hieruit volgt en die overal in dit plan terugkomt

> **Twee bronnen, twee vragen, nooit één getal.** Search Console beantwoordt "waar sta je al".
> DataForSEO beantwoordt "waar zit de vraag". Ze worden nooit opgeteld, gemiddeld of tot één score
> versmolten. Ze staan naast elkaar, elk met zijn eigen label.

Dat is geen voorzichtigheid maar een geleerde les: `lib/opportunities.ts` draagt bovenaan de
waarschuwing over het percentage dat tot 240 procent opliep omdat twee onvergelijkbare grootheden
werden samengeteld. Deze koppeling voegt twee nieuwe eenheden toe aan een scherm dat er al één
heeft. Zonder deze regel is dat de volgende fout van dezelfde soort.

---

## 2. Wat er vandaag misgaat, in één tabel

Vijf plekken in de keten nemen een beslissing op grond van een gok, terwijl er een meting
beschikbaar is. Nagerekend tegen de code op `main`.

| # | Beslissing | Wie beslist nu | Waarop | Wat er beschikbaar is |
|---|---|---|---|---|
| 1 | Welke 5 tot 8 clusters zijn de moeite waard | `lib/pipeline/propose-topics.ts` | Het model leest de aanbodboom. Geen enkel cijfer | Echte volumes per onderwerp, plus de zoekopdrachten waar het merk al vertoningen op krijgt |
| 2 | Welke 30 vragen we per cluster meten, en hoe zwaar ze wegen | `lib/pipeline/prompts.ts`, `calibrateVolumes()` | Het model schat 0 tot 100 tegen vier vaste ijkpunten | De echte formulering van zoekers, plus een echt volume per zoekterm |
| 3 | Welke pagina als eerste geschreven wordt | `lib/potential.ts`, `potentialScore()` | Gemeten zichtbaarheidsgat maal **gegokt** zoekvolume | De helft van die som kan een meting worden |
| 4 | Wat er op de pagina moet staan | `lib/schemas/content-contract.ts` en `lib/pipeline/writer-brief.ts` | De gemiste AI-vragen en de feitenkaart. Nul informatie over hoe echte mensen dit vragen | De echte woorden van echte zoekers |
| 5 | Of het gewerkt heeft | `compute_impact` plus `/analytics/zoekverkeer` | AI-hermeting, plus klikken per pagina | Positie en zoekopdracht erbij, dus twee assen in plaats van één |

⚠️ **Plek 3 is de scherpste.** De potentiescore heet een score en wordt als getal getoond, maar de
helft van de vermenigvuldiging (`search_volume_index` uit `lib/pipeline/search-demand.ts`) komt uit
een taalmodel dat een schaal van 0 tot 100 invult tegen vier voorbeelden. Dat is een nette
constructie voor een gok, en het is nog steeds een gok. De klant ziet er een cijfer.

---

## 3. De vijf ingrepen

Per ingreep: wat er verandert, waar precies, en waar het misgaat als je het verkeerd doet.

### 3.1 Clusters ontdekken met een cijfer eronder

**Nu.** `proposeTopics()` geeft het model de aanbodboom en vraagt om 5 tot 8 onderwerpen met een
onderbouwing in gewone taal. Er komt geen cijfer uit. Een onderwerp waar in Nederland niemand naar
zoekt, ziet er in de lijst precies zo uit als een onderwerp waar duizenden mensen per maand op
zoeken.

**Straks.** Vóór de aanroep draait een zoektermenronde: uit de aanbodboom plus het werkgebied worden
deterministisch kandidaat-zoektermen samengesteld ("dakinspectie", "dakinspectie Zutphen",
"dakinspectie kosten"), aangevuld met de zoekopdrachten waar de site vandaag al vertoningen op
krijgt. Daar worden volumes bij opgehaald. Die lijst gaat als context mee de aanroep in, en ná
afloop wordt aan elk voorgesteld onderwerp deterministisch een gemeten volume gekoppeld.

**⚠️ Het vangnet (conventie 1).** Het model krijgt de volumes te zien maar schrijft ze nooit zelf
op. De koppeling tussen een voorgesteld onderwerp en zijn volume gebeurt in code, op de
zoektermenlijst. Zou het model het getal mogen teruggeven, dan staat er binnen een maand een
verzonnen zoekvolume op het scherm van een klant, en dat is precies het soort cijfer dat iemand
onthoudt en later terugvraagt.

**Wat er misgaat zonder.** De consultant kiest in het gesprek een onderwerp waar het bedrijf trots
op is en waar bijna niemand naar zoekt. Dat kost een volledige meetronde plus een contentronde
voordat iemand het merkt, en dan is het al betaald.

### 3.2 De 30 vragen: echte formuleringen in, echte volumes uit

Dit is de ingreep met het meeste effect op de kwaliteit, en hij bestaat uit twee losse delen.

**Deel A: de vragen zelf.** `generatePromptsForStage()` laat het model 30 koopvragen verzinnen over
drie funnelfases. Dat levert nette vragen op in modelnederlands. Wat eronder ligt is hoe echte
mensen het vragen, en dat weten we straks: de zoekopdrachten waar deze site vertoningen op krijgt,
gaan als voorbeelden mee de aanroep in, met de instructie "zo stellen mensen deze vraag echt".

⚠️ **Als voorbeeld, nooit als verplichte lijst.** Een zoekopdracht is geen vraag aan ChatGPT.
"dakinspectie kosten" is wat iemand bij Google typt; "wat kost een dakinspectie en waar hangt dat
van af" is wat diezelfde persoon aan een AI-assistent vraagt. Het eerste is bewijs van de tweede,
geen vervanging ervan. Zouden we de zoekopdrachten rechtstreeks als meetvragen gebruiken, dan meet
de app geen AI-zichtbaarheid meer maar iets ertussenin.

**Deel B: het gewicht.** `calibrateVolumes()` is een tweede AI-aanroep die alle vragen van één
analyse relatief tegen elkaar afzet. Daar komt `volume_band` uit (hoog, midden, laag), en die band
maal de koopklaarheid is `promptWeight()`, het gewicht waarmee elke vraag in de zichtbaarheidsscore
meetelt.

Wat verandert: waar een vraag te koppelen is aan een zoekterm met een gemeten volume, komt de band
uit dat getal in plaats van uit de gok. `prompts.volume_source` krijgt daarvoor een derde waarde
naast `geschat` en `klant`: **`gemeten`**.

**⚠️ De formule zelf blijft ongemoeid.** `promptWeight()` en de verhouding 1 staat tot 0,5 staat tot
0,2 blijven exact zoals ze zijn. Alleen de invoer verandert van een gok in een meting. Dat is
bewust: de weging is uitvoerig doordacht en getest, en dit plan heeft geen enkel argument om hem aan
te raken. Wie de invoer én de formule tegelijk verandert, kan achteraf niet zien wat het verschil
veroorzaakte.

**⚠️ Een vraag is geen zoekterm, en dat is de moeilijkste stap van dit hele plan.** "Wat kost een
dakinspectie in Zutphen en wanneer is het nodig" heeft als zin nul zoekvolume. De zoekterm
"dakinspectie kosten" heeft dat wel. Er komt dus een pure, testbare module die uit een meetvraag een
opzoekbare zoekterm afleidt (`lib/search-demand/keywords.ts`). Lukt dat niet, of kent DataForSEO de
term niet, dan blijft `volume_source` op `geschat` staan en verandert er niets. **Nooit een 0**: een
zoekterm zonder gegevens is niet een zoekterm die niemand zoekt (conventie 3).

### 3.3 Kansen: twee nieuwe bronnen en een halve meting in de potentiescore

`lib/opportunities.ts` kent vier bronnen: `meting`, `onderwerp`, `techniek` en `plan`. Er komen er
twee bij, en allebei vullen ze een gat dat de AI-meting structureel niet ziet.

**Bron 5: `zoekverkeer`, de pagina's op het randje.** Een zoekopdracht waarop een pagina van deze
klant op positie 8 tot 20 staat, met echte vertoningen. Dat is de goedkoopste kans die er is: de
pagina bestaat, Google toont hem al, en één goede zet levert echte klikken op. Dit is puur
rekenwerk op Search Console-gegevens, zonder één AI-aanroep.

**Bron 6: `onbenutte_vraag`, waar de klant nergens staat.** Een zoekterm met een gemeten volume uit
DataForSEO waar deze klant geen pagina voor heeft en geen enkele vertoning op krijgt. Dat is
letterlijk de vraag die Search Console niet kan zien en die de AI-meting alleen indirect raakt.

**De potentiescore.** `potentialScore()` blijft precies wat hij is, een vermenigvuldiging van gat
maal volume, maar `search_volume_index` op `profile_topics` wordt verankerd aan de echte volumes
waar die er zijn. `profile_topics` krijgt daarvoor twee kolommen: het absolute maandvolume en een
herkomstkolom.

**⚠️ De herkomstkolom is het belangrijkste onderdeel van deze hele bouwronde**, en dat staat ook zo
in sprint 8 van het ontwikkelplan: zonder hem laat het scherm ooit een gok voor een meting
doorgaan. Concreet betekent dat drie verschillende zinnen op een kanskaart, en nooit één samengevoegd
getal:

| Herkomst | Wat er staat | Wat het betekent |
|---|---|---|
| `gemeten` | "1.300 zoekopdrachten per maand" | Google Ads, ook als deze klant er nergens staat |
| `waargenomen` | "480 vertoningen in 28 dagen" | Search Console, alleen waar deze klant al verschijnt |
| `geschat` | "geschat, nog geen zoekdata" | Het model, precies zoals vandaag |

### 3.4 De tekst: de woorden van de zoeker, niet de zoekwoorden

Dit is waar "betere SEO en GEO teksten" landt, en ook waar dit plan het meeste kwaad kan doen. Eerst
wat er verandert, dan de rem.

**Wat er verandert.** Het contentcontract (`lib/schemas/content-contract.ts`) legt per sectie vast
welke deelvraag hij beantwoordt (`subQuestion`), en de poort rekent na of er een zin staat die die
vraag losstaand beantwoordt. Dat is een uitstekende constructie waar één ding aan ontbreekt: de
deelvragen komen uit een model dat niet weet wat mensen werkelijk vragen.

Straks krijgt de contractstap de echte zoekopdrachten mee die bij dit onderwerp horen, met hun
volume. Bij een pagina die verbeterd wordt zijn dat de zoekopdrachten waar die pagina vandaag al
vertoningen op krijgt; bij een nieuwe pagina de zoektermen uit DataForSEO voor dit cluster. De
schrijfopdracht (`lib/pipeline/writer-brief.ts`) krijgt hetzelfde materiaal als achtergrond bij de
keuze van de hoofdvraag.

**⚠️ De rem, en die is niet onderhandelbaar.** Zoekwoordmateriaal dat een taalmodel in gaat, komt er
als zoekwoordproza weer uit: dezelfde term vier keer in een alinea, koppen die als zoekopdracht
gelezen willen worden. Dat is precies wat `docs/schrijfstijl.md` en de vier keuringen van de
contentpijplijn moeten voorkomen. De regel is daarom:

> De zoekopdrachten sturen **welke vraag een sectie beantwoordt**, nooit **hoe die zin geformuleerd
> wordt**. Ze gaan het contract in als deelvraag, niet de schrijfprompt in als term.

En het deterministische vangnet erbij (conventie 1): de bestaande poort controleert per sectie of
de deelvraag beantwoord wordt. Er komt geen zoekwoorddichtheid bij, geen telling van hoe vaak een
term voorkomt, geen enkele controle die een schrijver richting herhaling duwt. Wie later een
zoekwoorddichtheidscontrole voorstelt, leest dit stuk eerst terug.

### 3.5 Nameten op twee assen

`compute_impact` meet vandaag of een gepubliceerde pagina het verschil maakte in AI-antwoorden, met
een controlegroep. Search Console levert daarnaast klikken per pagina. Wat ontbreekt is de
verbinding: verschijnt deze pagina nu ook in Google voor de zoekopdrachten waarvoor hij geschreven
is, en op welke plek.

Straks kan het scherm de zin zeggen die dit product verkoopt: *"Deze pagina wordt nu genoemd in 4
van de 9 AI-antwoorden waarvoor hij geschreven is, en hij staat in Google op plek 12 voor
'dakinspectie kosten', goed voor 340 vertoningen per maand."* Eén pagina, twee bewijzen, allebei
gemeten.

---

## 4. Het datamodel

Vier migraties, allemaal additief en idempotent (conventie 4). De nummers sluiten aan op `0102`, de
laatste die er staat. ⚠️ Sprint 2 en 8 van het ontwikkelplan noemen nog `0060` en `0066`; die
nummers zijn sinds augustus vergeven en de plannen zijn op dat punt achterhaald.

**`0103_zoekopdrachten.sql`.** `search_console_queries`: merk, dag, zoekopdracht, pagina, klikken,
vertoningen, positie. Dezelfde unieke sleutel-aanpak als `search_console_days`, want Google herziet
de cijfers van de afgelopen dagen na en dat moet een correctie worden en geen tweede rij.

> ⚠️ **Eén omvangsrisico om na te rekenen vóór de bouw.** Per merk per dag is dit zoekopdracht maal
> pagina in plaats van alleen pagina. Bij een kleine site zijn dat honderden rijen per dag, bij een
> grote duizenden. Over 90 dagen kan dat oplopen. Dit is precies het soort aanname dat conventie 10
> verbiedt over te nemen zonder meting: tel het op één echte property voordat je de tabel
> vastlegt, in plaats van nu al een opschoonmechanisme te bouwen voor een probleem dat misschien
> niet bestaat.

**`0104_zoektermen_cache.sql`.** `keyword_demand` als cache: zoekterm, land, taal, maandvolume,
concurrentie, kosten per klik, de ruwe JSON van de leverancier (conventie 8), en wanneer hij
opgehaald is. Uniek op zoekterm plus land plus taal.

**De cache is niet optioneel**, zoals sprint 8 al zegt. Dezelfde zoekterm twee keer ophalen is twee
keer betalen voor hetzelfde getal. Volumes veranderen maandelijks, niet dagelijks, dus een rij van
minder dan 30 dagen oud wordt nooit opnieuw opgehaald.

**`0105_merk_zoektermen.sql`.** `profile_keywords`: welke zoektermen horen bij welk merk en welk
cluster, met een herkomstkolom (`aanbod`, `zoekverkeer`, `vraag`, `handmatig`). Dit is de tabel die
"waar komt deze zoekterm vandaan" beantwoordt, en dus ook waarom hij in een kanslijst opduikt.

**`0106_zoekvolume_herkomst.sql`.** Op `profile_topics` het absolute maandvolume plus een
herkomstkolom naast de bestaande `search_volume_index`. Op `prompts` wordt de check-constraint van
`volume_source` uitgebreid met `gemeten`.

> ⚠️ Die laatste is de enige plek waar deze ronde iets moet weghalen: een check-constraint
> vervangen is technisch een `drop constraint` plus een `add constraint`. Dat raakt geen enkele rij
> en geen enkele kolom, en het is de standaardmanier om een toegestane waarde toe te voegen.
> Conventie 4 gaat over data, niet over een regel die zegt welke waarden mogen. Wel met
> `if exists`, zodat de migratie twee keer draaien geen fout geeft.

---

## 5. De leverancierslaag

`lib/search-demand/`, naar het patroon van `lib/engines/`, precies zoals sprint 8 voorschrijft:

| Bestand | Wat het doet |
|---|---|
| `types.ts` | Wat een zoekvolumeleverancier moet kunnen. Eén functie: geef me voor deze zoektermen in dit land en deze taal het maandvolume |
| `registry.ts` | Is er een leverancier? Zonder sleutel: nee, en dan gedraagt de app zich exact zoals vandaag |
| `dataforseo.ts` | De koppeling zelf |
| `cache.ts` | Eerst in `keyword_demand` kijken, alleen ophalen wat ontbreekt of ouder is dan 30 dagen |
| `keywords.ts` | Puur en testbaar: van een meetvraag naar een opzoekbare zoekterm, normaliseren, ontdubbelen |

**Uitgangspunt 3 van het ontwikkelplan geldt onverkort: zonder sleutel gedraagt de app zich
identiek.** Geen waarschuwing op het scherm, geen half werkende functie, geen lege grafiek. Dat is
de normale toestand tot de sleutel er is, net zoals `enginesForProfile()` dat voor Gemini doet. Er
hoort een test bij die dat bewijst, en die test is geen extraatje: hij is de garantie dat een
leverancier die morgen zijn voorwaarden verandert, dit product niet stillegt.

### De kostenboekhouding, en waarom niet in `ai_calls`

`ai_calls` wordt geschreven door precies één plek (`lib/openai/ledger.ts`) en gelezen door het
dagplafond (`lib/spend-limit.ts`). Zet je DataForSEO-aanroepen daarin, dan kan een zoektermenronde
van zes dollarcent meetellen in het plafond dat bedoeld is om een op hol geslagen meetronde te
stoppen. Dat plafond hoort een meting nooit te blokkeren vanwege een zoekterm.

**Aanbeveling: een eigen klein logboek** (`vendor_calls`: leverancier, soort, aantal eenheden,
kosten, merk, moment). Eén ledger per soort uitgave, en de vraag "wat kostte dit merk" blijft
beantwoordbaar door beide bij elkaar op te tellen wanneer je dat wilt, in plaats van door twee
ongelijksoortige uitgaven op één hoop te gooien.

---

## 6. De taaksoorten

Twee nieuwe, één bestaande die uitbreidt. Alle drie zonder AI-aanroep, dus conventie 7 (één zware
AI-aanroep per taak) is hier niet in het geding; wat ze wel doen is netwerk.

| Taak | Wat het doet | Wanneer |
|---|---|---|
| `gsc_sync` (bestaat) | Krijgt een tweede aanroep met de zoekopdracht erbij. **Geen tweede cron**, dezelfde dagelijkse taak | Dagelijks per gekoppeld merk |
| `keyword_discovery` (nieuw) | Zoektermenlijst afleiden uit de aanbodboom, de bestaande onderwerpen en de zoekopdrachten uit Search Console, volumes ophalen, wegschrijven | Na `profile_offering`, en opnieuw als er een cluster bijkomt |
| `keyword_refresh` (nieuw) | Volumes ouder dan 30 dagen opnieuw ophalen | Maandelijks per merk |

⚠️ **`keyword_discovery` is een eigen taaksoort en geen staart aan `profile_offering`.** Die stap
doet al een zware AI-aanroep; hier komen tot een paar duizend zoektermen in batches van duizend bij,
en dat past niet betrouwbaar in dezelfde werker-aanroep. Zelfde redenering als bij
`sales_market_verify`.

---

## 7. De bouwvolgorde

Vijf blokken. De volgorde is niet willekeurig: blok A kost niets en heeft geen leverancier nodig,
dus daar hoort de helft van de waarde vandaan te komen voordat er één dollar naar buiten gaat.

### Blok A. De zoekopdrachten uit Search Console (gratis, geen leverancier)

Migratie `0103`, de tweede aanroep in `lib/search-console/sync.ts`, en een pure rekenmodule
`lib/search-console/rankings.ts` voor de positieverdeling en de pagina's op het randje. Plus de
nieuwe kansenbron `zoekverkeer` en de vier lege staten die het zoekverkeerscherm al heeft, aangevuld
met de nieuwe.

**Af als:** de cijfers van één property over hetzelfde venster overeenkomen met wat de klant zelf in
Search Console ziet, met de afwijking opgeschreven. Een koppeling die er bijna mee overeenkomt, is
niet af.

### Blok B. De leverancierslaag (de eerste externe rekening)

Migraties `0104` tot en met `0106`, `lib/search-demand/`, en de test die bewijst dat de app zonder
sleutel identiek werkt.

**Af als:** op vijf bestaande analyses de modelgok naast het echte volume ligt, met de afwijking in
`docs/logbook.md`. Dat cijfer is meteen het antwoord op de vraag hoe fout de gok al die tijd was, en
dat is een cijfer dat niemand nu heeft.

### Blok C. De keten: clusters, vragen, kansen

Ingrepen 3.1, 3.2 en 3.3. Dit is het blok dat de beslissingen verandert in plaats van de schermen.

**Af als:** op één merk de kansenlijst met en zonder echte volumes naast elkaar staat en het verschil
in volgorde is opgeschreven. Verandert er niets aan de volgorde, dan is dat ook een uitkomst, en een
belangrijke: dan was de gok goed genoeg en is de rest van dit blok minder waard dan gedacht.

### Blok D. De tekst

Ingreep 3.4, met de rem uit dat hoofdstuk.

**Af als:** tien pagina's met en tien zonder de zoekwoordlaag door het kwaliteitslab
(`/beheer/kwaliteit`) zijn gegaan, met het oordeel van een mens erbij. ⚠️ Dit is het enige blok dat
de tekst slechter kan maken, dus hier is een menselijk oordeel geen luxe maar de poort.

### Blok E. Het bewijs

Ingreep 3.5.

**Af als:** één echt gepubliceerde pagina beide assen laat zien, nagerekend tegen zowel de
AI-hermeting als Search Console.

---

## 8. Wat dit plan bewust niet doet

- **Geen zoekwoorddichtheid, geen SEO-score per pagina, geen groen bolletje.** Zie 3.4. Die
  gereedschappen sturen een schrijver richting herhaling, en dit product heeft negentien controles
  die precies dat tegenhouden.
- **Geen eigen ranktracker.** Search Console geeft posities, met de eerlijkheidsregel erbij dat het
  een gemiddelde is.
- **Geen tweede leverancier ernaast.** Eén bron erbij is een afhankelijkheid; twee is een
  vergelijkingsprobleem dat niemand heeft gevraagd op te lossen.
- **Geen zoekopdrachten als meetvragen.** Zie 3.2 deel A. De app meet AI-zichtbaarheid, en dat blijft
  zo.
- **Geen automatische herschrijving van dalende pagina's.** Een pagina die zakt wordt een kans in de
  lijst, met een mens die erop klikt. Automatisch herschrijven op grond van een positieverandering
  is een groter besluit dan dit plan draagt.

---

## 9. Open vragen voor de eigenaar

1. **De voorwaarden van DataForSEO.** Sommige leveranciers verbieden het doorgeven van hun
   zoekvolumes aan derden, en dit product toont ze aan de klant. Dat is een juridische controle en
   geen technische, en hij kan de leverancierskeuze omgooien. ⚠️ Deze vraag hoort vóór blok B
   beantwoord te zijn, niet erna.
2. **Land en taal.** Nederland en Nederlands vast, of per merk instelbaar met het oog op België? Dat
   bepaalt of `keyword_demand` één rij per zoekterm heeft of meerdere.
3. **Het startsaldo van 50 dollar bij DataForSEO.** Vooruitbetaald tegoed, geen abonnement, en bij
   twintig merken gaat het ruim een jaar mee. Akkoord om dat te storten voordat blok B begint?
4. **De bandgrenzen.** De huidige banden (hoog, midden, laag) komen uit een relatieve schaal binnen
   één analyse. Met echte volumes kun je kiezen: absolute grenzen die voor elke markt gelijk zijn, of
   relatief binnen het merk blijven. Absoluut is eerlijker tussen merken, relatief houdt de
   bestaande weging precies zoals hij nu werkt. Mijn voorstel is relatief beginnen, omdat dat
   `promptWeight()` onaangeraakt laat, en pas naar absoluut gaan als blok B laat zien hoe ver de twee
   uit elkaar lopen.
