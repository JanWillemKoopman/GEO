# Menukaart: twintig onderwerpen voor een Innovatiesessie

**Opgesteld:** 22 augustus 2026 · **Door:** verkennende ronde met zes denkers (innovator,
AI-innovator, strateeg, investeerder, klantstem, data-analist), elk met een andere prikkel ·
**Status:** keuzelijst, geen plan

Dit is de kaart waaruit je kiest welk onderwerp een volle Innovatiesessie krijgt
(`.claude/skills/innovation-session/`). Elk onderwerp raakt iets dat er vandaag echt staat, en elk
onderwerp is breed genoeg dat een brainstorm er meer uithaalt dan een gerichte verbeterronde.

**Hoe je hem leest.** Per onderwerp staat er wat er nu staat, de spanning die de brainstorm voedt,
en de maat: **klein** is een dag werk, **middel** is een sprint met een migratie erbij, **groot**
verandert wat het product is. De maat zegt iets over de bouw, niet over de waarde.

**Wat dit niet is.** Geen prioritering en geen advies om alles te doen. Twintig onderwerpen is een
kaart, geen achterstand. Onderwerpen die niet gekozen worden verdwijnen niet: ze staan hier tot ze
niet meer kloppen.

---

## Cluster 1. De data die alleen jij hebt

Vier onderwerpen die allemaal op hetzelfde materiaal rusten: metingen die zich opstapelen en per
klant worden gebruikt en per klant worden weggelegd.

### 1. Het antwoordenarchief als eigen dataset · groot

**Wat er nu staat.** Elke AI-aanroep bewaart zijn volledige ruwe JSON náást de uitgesplitste
kolommen (conventie 8, `lib/openai/structured.ts` plus 19 pijplijnbestanden). Er wordt vrijwel niets
uit teruggelezen.
**De spanning.** Het archief wordt met elke meting waardevoller, en niemand heeft gevraagd wat erin
zit als je het in zijn geheel leest in plaats van per klant.
**Wat een sessie oplevert.** Toepassingen die nul nieuwe web_search kosten en toch nieuwe uitspraken
doen, plus de vraag of dit een bijproduct blijft of een eigen product wordt.

### 2. Leren tussen klanten · groot

**Wat er nu staat.** `content_impact` bewaart per contentstuk een hermeetgolf en een statistisch
verdict (`impact-math.ts`). Wat bij klant A werkte verandert niets aan wat het systeem bij klant B
voorstelt.
**De spanning.** Elke rij is een klein experiment met een uitkomst, en die uitkomst wordt weggelegd
zodra de klant het rapport sluit.
**Wat een sessie oplevert.** Vormen waarin eerdere uitkomsten de volgende keuze sturen, van
vraagselectie tot contentvorm, zonder te overfitten op de zes merken die er nu zijn.

### 3. Branchebenchmark: sta ik voor of achter · middel

**Wat er nu staat.** Vergelijking bestaat alleen binnen één analyse, als rangordetabel. Tussen
merken en tussen branches bestaat hij nergens. `competitor-intel.ts` weet per merk wáárom een
concurrent wint, met letterlijk citaat, maar dat blijft in die ene analyse staan.
**De spanning.** Hoe opener de vergelijking hoe waardevoller voor de klant, en hoe herkenbaarder
voor de concurrenten van die klant.
**Wat een sessie oplevert.** Een vorm van branchevergelijking die het gesprek verschuift van "ben ik
zichtbaar" naar "sta ik voor of achter", plus wat dat van het datamodel vraagt.

### 4. Toets de kernbewering: zichtbaarheid naast echte klikken · middel

**Wat er nu staat.** Voor merken met een Search Console-koppeling komen twee reeksen binnen over
dezelfde tijdvakken: mention-share per periode, en echte klikken, vertoningen en posities
(`lib/search-console/`). Er bestaat geen berekening die ze naast elkaar zet.
**De spanning.** De aanname dat vaker genoemd worden in AI-antwoorden samenvalt met iets echts in de
wereld van de klant draagt het hele product, en is nog nooit getoetst terwijl de data om hem te
toetsen al binnenkomt.
**Wat een sessie oplevert.** Een manier om die samenhang te meten, en een eerlijk antwoord op wat we
doen als hij zwakker blijkt dan gehoopt.

---

## Cluster 2. Kosten als ontwerpvariabele

Het spendplafond is €50 per account per maand en een klant met 50 clusters kost ~€43 aan meting
alleen (`docs/tasks/ontwikkelplan-visie.md` §8). Dit cluster gaat over de enige rem die groei per
klant echt tegenhoudt.

### 5. Web_search, de knop die 98,8% bepaalt · middel

**Wat er nu staat.** Elk van de 30 vragen per meetronde krijgt een eigen web_search-aanroep
(`measure.ts`). `measure_simulate` is 98,8% van de kosten binnen een ronde, `measure_mention` 1,2%
(`architecture.md` §6).
**De spanning.** Minder vaak zoeken maakt een ronde goedkoper, en de belofte van het product is
juist dat het meet wat een AI-assistent nú teruggeeft.
**Wat een sessie oplevert.** Varianten naast elkaar: welk deel van de 30 aanroepen echt vers moet
zijn, per vraag, per cluster, per klantwens. Schatting: drie tot tien keer minder web_search brengt
€43 per klant richting €14 of lager, en dat is rechtstreeks meer clusters per klant.

### 6. Spreiding als product in plaats van ruis · middel

**Wat er nu staat.** De 8 zwaarste vragen worden 3 keer gemeten (`MEASURE_REPEATS`,
`REPEATED_PROMPT_COUNT`), en de onzekerheidsband is ±16,4 punten bij 30 vragen
(`architecture.md` §6). Winbaarheid bleek geen eigenschap van een vraag maar een kans:
van 8 herhaald gemeten vragen veranderde bij 4 de winbaarheid tussen metingen van dezelfde week
(`elicit-rate.ts`).
**De spanning.** Een goedkoop model duizend keer draaien is een ander gereedschap dan een duur model
één keer, en dat gereedschap wordt nergens gebruikt.
**Wat een sessie oplevert.** Plekken waar spreiding zelf de uitkomst is in plaats van ruis eromheen.
Let op: de asynchrone batchroute van OpenAI zou dit betaalbaar maken (50% korting, 24 uur
doorlooptijd), maar of web_search daarin meedoet is **te verifiëren**.

### 7. De vijftiende stap van AI naar rekenkunde · klein

**Wat er nu staat.** Veertien onderdelen draaien bewust zonder AI, van de contentinventaris tot het
kennistestoordeel (`architecture.md` §6, tabel "Bewust géén AI").
**De spanning.** Elke stap die overgaat wordt bijna gratis en verliest tegelijk het vermogen iets
onverwachts op te merken.
**Wat een sessie oplevert.** De hele lijst resterende AI-stappen langs, met per stap de vraag of hij
de vijftiende wordt. Dit is het goedkoopste onderwerp op de kaart en het snelst af.

### 8. Waar het dure model echt nodig is · klein

**Wat er nu staat.** Stap 16 schrijft en herschrijft uitsluitend met `gpt-5.6-sol`, $5 in en $30 uit
per 1M tokens, ongeveer vijf keer duurder per pagina dan het vorige model (`lib/openai/models.ts`).
**De spanning.** Content is het enige dat de klant letterlijk publiceert, dus hier voelt goedkoper
het snelst als slechter.
**Wat een sessie oplevert.** Een verdeling waarin het goedkope model het voorwerk doet en het dure
alleen de polijstslag, met de kwaliteitspoorten als bewijs dat er niets verloren gaat.

---

## Cluster 3. Wie beslist, en wanneer

### 9. De autonomieladder per beslispunt · middel

**Wat er nu staat.** Op minstens vijf plekken zegt een mens ja tegen iets dat het systeem al weet:
de goedkeuringspoort vóór meten (stap 9), de maandgoedkeuring (`plan-writing.ts`,
`plan-status.ts`), de contentgoedkeuring, de publicatiestap en het toewijzen van een profiel.
**De spanning.** De visie wil dat het systeem zelfstandig doorloopt, en de plek waar het het langst
stilstaat is de plek waar het het meest zeker van zichzelf is.
**Wat een sessie oplevert.** Een ladder van autonomiegraden per beslispunt, met per trede het
meetbare foutpercentage dat hem opent. Nadrukkelijk niet: de goedkeuringspoort vóór publicatie
weghalen, want die staat vast.

### 10. Taken die zichzelf plannen · middel

**Wat er nu staat.** 24 taaktypen (`lib/jobs/types.ts`), geketend in een vaste volgorde, werker elke
minuut, planschrijver om 04:00. Geen enkele taak plant zichzelf op grond van wat hij ziet, en elke
vraag wordt even vaak gemeten ongeacht hoe snel hij verandert.
**De spanning.** Nachtelijke rekentijd is gratis, en elke speculatieve taak is een echte rekening
onder een plafond van €50.
**Wat een sessie oplevert.** Een klasse waarnemende taken met het budgetvangnet eronder. Schatting:
als de helft van de vragen minder vaak vers gemeten hoeft, scheelt dat 30 tot 50% meetkosten.

### 11. Twee motoren die elkaar tegenspreken · middel

**Wat er nu staat.** `lib/engines/` heeft OpenAI actief en Gemini slapend achter dezelfde interface.
Eén model doet nu zowel het meten als het beoordelen van dat meten.
**De spanning.** Een tweede motor verdubbelt het duurste onderdeel van de app en verdubbelt
tegelijk de geloofwaardigheid van de score. En: een AI-aanbieder zet zichzelf nooit eerlijk naast
een concurrent, dus onafhankelijk meten over meerdere motoren is een positie die niemand anders kan
innemen.
**Wat een sessie oplevert.** Waar onenigheid tussen modellen een signaal wordt en waar hij
verspilling is, en of modelverschil een eigen inzicht verdient in plaats van een tweede kolom.

---

## Cluster 4. De klant buiten het scherm

De klantstem was hier het duidelijkst: "ik open dit dashboard bijna nooit uit mezelf, maar een
appje of mailtje op mijn telefoon lees ik altijd." Mail via Resend staat standaard uit en er bestaan
precies twee mails.

### 12. Bereikt worden zonder in te loggen · middel

**Wat er nu staat.** Blok 6 op het dashboard, "Wat ORBIT ENGINE deze week deed", toont afgeronde
taken van de laatste zeven dagen, maar alleen als de klant zelf inlogt en naar beneden scrolt. Het
hoofdcijfer staat in blok 2, met de marge verstopt in een infotip.
**De spanning.** De klant wil bereikt worden zonder het gevoel dat er iets zonder hem gebeurt, en
datzelfde blok bestaat juist om géén autonomie te suggereren.
**Wat een sessie oplevert.** Welke momenten een bericht verdienen, via welk kanaal, en hoe je één
cijfer overal toont zonder de onzekerheidsmarge kwijt te raken.

### 13. Goedkeuren zonder in te loggen · middel

**Wat er nu staat.** De goedkeuringsbalk vraagt na inloggen en doorscrollen één klik op "Bevestig en
start de meting" (`confirm-bar.tsx`).
**De spanning.** Dit is volgens de klantstem het moment dat hij zou navertellen, het gevoel dat het
werk al gedaan is en hij alleen nog ja hoeft te zeggen. En het zit vast aan een login.
**Wat een sessie oplevert.** Hoeveel goedkeuringsmomenten buiten de ingelogde app kunnen zonder de
garantie te verliezen dat de klant echt heeft gekeken.

### 14. De briefing omgekeerd: voorleggen in plaats van vragen · klein

**Wat er nu staat.** De contentbriefing kiest maximaal acht vragen voor de klant
(`briefing-select.ts`), met één plek gereserveerd voor onderscheid. Zonder die reservering werd de
vraagsoort `onderscheid` **0 van de 62 keer** gesteld.
**De spanning.** De vraagsoort die het meest waard is, onderscheid, is precies de enige die niet uit
data te halen valt.
**Wat een sessie oplevert.** Vormen waarin de klant bevestigt, corrigeert of kiest in plaats van
invult, en waarin stilte ook een bruikbaar antwoord is.

### 15. Wie voert het intakegesprek · middel

**Wat er nu staat.** Stap 4f is de onboardingsessie: de consultant loopt het dossier mét de klant na
en vult de commerciële laag in (`intake-block.ts`, `onboarding-refresh.ts`). Nul AI-aanroepen, het
scherm leest wat er ligt.
**De spanning.** Het gesprek is de verkoop, en tegelijk het traagste onderdeel van een pijplijn die
in 7,5 minuut klaar is. Hoe beter het systeem het gesprek voorbereidt, hoe minder er in dat uur nog
te ontdekken valt.
**Wat een sessie oplevert.** Een vorm waarin de klant asynchroon antwoordt en het uur alleen nog
over strategie gaat, plus wat de gespreksagenda moet bevatten om waardevol te blijven.

---

## Cluster 5. Buiten de eigen site

### 16. Het bronnenlandschap volgen · middel

**Wat er nu staat.** `source-analysis.ts` haalt maximaal vier geciteerde bronnen op, en alleen
tijdens het schrijven van één stuk content. De crawler zelf is deterministisch en gratis.
**De spanning.** Het systeem weet precies welke pagina's de AI vertrouwt, en leest ze eenmalig voor
één artikel in plaats van doorlopend.
**Wat een sessie oplevert.** Een levend beeld van de bronnen waaruit AI-antwoorden in een branche
worden opgebouwd, met dezelfde crawler die er al is.

### 17. Winnen op andermans pagina · groot

**Wat er nu staat.** `lib/offsite/` kijkt naar off-site aanwezigheid, maar alle content die het
product schrijft is bedoeld voor de eigen site van de klant.
**De spanning.** Het product schrijft voor de site van de klant, en meet zichtbaarheid op plekken
die de klant niet bezit.
**Wat een sessie oplevert.** Uitvoervormen gericht op de bronnen die AI wél citeert, met de
bestaande contentmotor en poorten eronder. Dit was het wildste onderwerp van de innovator.

### 18. Van publicatie naar bewezen citatie · middel

**Wat er nu staat.** Stap 17 publiceert met de hand, stap 18 meet het effect, maar wat er precies op
de pagina veranderde wordt nooit gekoppeld aan wat een AI-antwoord daarna anders zegt.
**De spanning.** Hoe strakker je dit vastlegt hoe meer het een experiment wordt, hoe losser hoe
minder hard het bewijs.
**Wat een sessie oplevert.** De eerste dataset die laat zien welk sóórt contentwijziging waarde
toevoegt. Dat is bewijs dat geen los zichtbaarheidsrapport ooit levert.

### 19. De laatste meter naar het CMS · middel tot groot

**Wat er nu staat.** De klant kopieert de tekst naar zijn eigen CMS, plakt hem, en vult daarna de
live-URL terug in de app in. Er bestaat een aparte herinneringsmail speciaal voor pagina's die hier
blijven hangen, en `publish-check.ts` controleert achteraf deterministisch of de pagina er echt
staat.
**De spanning.** Een CMS-koppeling is bewust naar sprint 9 geschoven, en dit is precies het handwerk
dat de klant het langst laat liggen.
**Wat een sessie oplevert.** Varianten die dat tussenstuk verkleinen zonder het besluit terug te
draaien. De AI-innovator noemde hier computergebruik-agents die zonder API in een beheerscherm
klikken, met de bestaande publicatiecontrole als harde terugval; hun betrouwbaarheid is **te
verifiëren** en browserautomatisering is de meest faalgevoelige categorie die er is.

---

## Cluster 6. De verkoop omgekeerd

### 20. Meting eerst, profiel daarna · groot

**Wat er nu staat.** Een merk begint met drie velden van de consultant (`/merk/nieuw`), waarna de
pijplijn 7,5 minuut onderzoek doet en `llm-baseline.ts` test wat het model al weet.
**De spanning.** Het duurste bewijs voor de verkoop, wat ChatGPT vandaag over dit merk zegt,
ontstaat pas nádat iemand besloten heeft dit merk aan te maken.
**Wat een sessie oplevert.** Manieren waarop de eerste waarde bij de prospect ligt vóór het gesprek,
gevoed door de wachtrij en de mail die er al zijn. Raakt rechtstreeks hoeveel klanten er in een
sales-led model passen.

---

## Wat de verkenning zelf liet zien

**Drie denkers kwamen los van elkaar bij het antwoordenarchief uit** (onderwerpen 1, 2 en 3). Dat is
een signaal, geen bewijs, en er is een reden om voorzichtig te zijn: de realiseerbaarheidskaart die
ze alle drie meekregen noemt dat archief bij naam als iets dat nauwelijks gebruikt wordt. Ze zijn er
deels naartoe gestuurd. Wat het signaal wél sterk maakt, is dat ze er langs verschillende wegen
uitkwamen: als verdedigbaarheid, als leereffect en als vergelijkingsmateriaal.

**Wat niemand voorgezegd is en toch boven kwam:** de briefing die vragen stelt in plaats van
antwoorden voor te leggen (0 van de 62), de klant die het dashboard niet opent, het intakegesprek
als traagste stap in een pijplijn van 7,5 minuut, en de omkering waarin de meting vóór het profiel
komt.

**Waar het geld zit en waar de waarde zit is niet hetzelfde onderwerp.** De investeerder wijst op
onderwerp 5, want daar zit 98,8% van de kosten en dus de rem op groei per klant. De strateeg wijst
op onderwerp 1, want data die zich opstapelt is het enige dat een concurrent niet in een weekend
inhaalt. Allebei kloppen ze, en ze vragen om een andere volgorde.
