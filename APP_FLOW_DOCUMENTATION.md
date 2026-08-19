# ORBIT ENGINE, de keten uitgelegd zonder techniek

> **Voor wie dit is.** Sales, management en iedereen die moet kunnen uitleggen wat ORBIT ENGINE
> doet zonder de code te kennen. Dit is het enige document in de repo dat die lezer bedient.
>
> **Wat hier NIET meer staat.** Dit document had ooit ook een technisch hoofdstuk en een
> AI-hoofdstuk. Die zijn op 17 augustus 2026 verwijderd: ze beschreven hetzelfde als
> `docs/architecture.md` en waren negen dagen achterop geraakt, waardoor er twee technische
> waarheden naast elkaar stonden die uit elkaar liepen. Voor techniek is
> [`docs/architecture.md`](./docs/architecture.md) vanaf nu de enige bron. De tabel "Bewust géén
> AI" die hier stond is meeverhuisd naar §6 daarvan.
>
> **Bijgewerkt op 19 augustus 2026** met hoofdstuk 6, de onboarding van begin tot eind. De rest van
> dit document beschrijft de hele keten in vijf fases; hoofdstuk 6 zoomt in op de eerste daarvan,
> omdat dat de fase is waar jij als consultant zelf in staat.
>
> **Peildatum: 17 augustus 2026.** De kostentabel in §5 is nagerekend tegen de echte
> kostenlogboeken op productie. De rest van dit hoofdstuk beschrijft de vijf fases, en die zijn
> sinds 8 augustus niet veranderd. Wijkt het af van de app, dan is de app leidend.
>
> **Waar het naartoe gaat** staat níet hier maar in [`docs/visie.md`](./docs/visie.md) en
> [`docs/merkstrategie.md`](./docs/merkstrategie.md). Dit document beschrijft wat de app vandaag
> doet, en niets anders.

---

# De keten, en wat elke stap oplevert

## 1. Wat het product doet

Een MKB-ondernemer wil weten of ChatGPT hem noemt wanneer een potentiële klant vraagt
*"welke fysiotherapeut in Tilburg is goed bij rugklachten?"*. GEO Tracker meet dat, laat zien wie
er wél genoemd wordt en waarom, schrijft de pagina's die dat gat moeten dichten, en meet weken
later of het gewerkt heeft.

Het onderscheidende punt is niet het meten maar de **gesloten lus**: meten → verklaren → maken →
publiceren → hermeten met controlegroep. De app doet geen uitspraak over effect zonder die laatste
stap.

## 2. De vijf fases

| # | Fase | Wat de klant doet | Wat de app doet | Wat het oplevert |
|---|---|---|---|---|
| **1** | **Merk klaarzetten** | Vult **drie velden** in: webadres, bedrijfsnaam, andere schrijfwijzen. In het sales-led model doet de consultant dit vóór het demogesprek. | Draait acht taken in ~7,5 minuut (~$0,25): tot 150 pagina's crawlen en harde feiten oogsten, technische audit mét entiteitsconsistentie, merkonderzoek, aanbodboom, 5 tot 8 core topics, marktonderzoek, LLM-kennistest, synthese | Een merkdossier met aanbodboom, kennistest en gespreksagenda, **hergebruikt door alle latere analyses**. Eenmalig werk, blijvend profijt. |
| **2** | **Analyse opstellen** | Kiest een merk + vult een onderwerp in ("wasmachines", "herenkapsel"), optioneel een content-brief | Onderzoekt wat de site over dít onderwerp zegt, wie de concurrenten hier zijn, en genereert 30 realistische koopvragen (10 per funnelfase) + een volume-inschatting | Een concreet, leesbaar meetplan. **Geen black box:** de klant ziet en bewerkt élke vraag vóór er één euro aan meetkosten gemaakt wordt. |
| **3** | **Analyse runnen** | Klikt één keer op *"Bevestig en start meting"* | Stelt alle 30 vragen aan een AI-assistent mét live web search, beoordeelt elk antwoord per merk, aggregeert tot een score met foutmarge, profileert de concurrenten en schrijft een jargonvrij rapport | Het cijfer met betrouwbaarheidsband, de trendlijn, wie er wint en **waarop**, plus concrete gemiste vragen. |
| **4** | **Content genereren** | Kiest welke aanbevolen pagina's geschreven worden, beantwoordt max. 8 korte feitenvragen, geeft de tekst vrij en publiceert hem | Bouwt een feitenkaart, controleert welke beweringen de pagina nodig heeft en niet onderbouwd kunnen worden, schrijft de pagina op het duurste model, laat hem redigeren, herschrijft en keurt hem deterministisch | Publicatieklare pagina's (Markdown, meta-tags, FAQ, JSON-LD) waarin **elke bewering over het bedrijf herleidbaar is tot een bevestigd feit**. |
| **5** | **Resultaten monitoren** | Vult de live-URL in en kijkt terug | Verifieert dat de pagina echt staat, hermeet na 14 en 28 dagen precies de doelvragen **plus een controlegroep**, en velt een statistisch verdict. Maandelijks draait de hele meting opnieuw | Een verdedigbare uitspraak: *"op de vragen waarvoor je publiceerde +18, op de rest +3"*. Geen losse "je score steeg". |

## 3. Waarde per fase, in verkooptaal

- **Fase 1**, *"Eén keer je merk vastleggen, altijd profijt."* Het profiel is accountbreed;
  analyse nummer drie voor dezelfde klant is aanzienlijk goedkoper en sneller dan nummer één.
- **Fase 2**, *"Je ziet precies wat we gaan meten, vóórdat we meten."* De goedkeuringspoort is
  een verkoopargument: geen black box, geen kosten zonder akkoord.
- **Fase 3**, *"Een cijfer met een eerlijke marge."* De app toont de onzekerheid en telt vragen
  waarbij de AI géén enkele aanbieder noemt apart (niet als verlies). Dat maakt het cijfer
  verdedigbaar in plaats van indrukwekkend.
- **Fase 4**, *"Content die niets verzint."* De feitenkaart is een gesloten lijst: staat een feit
  er niet op, dan komt het niet in de tekst. Dat is de belangrijkste bron van vertrouwen bij een
  ondernemer die zijn naam onder de pagina zet.
- **Fase 5**, *"We tonen of het gewerkt heeft, ook als het niet zo is."* De controlegroep maakt
  het verschil tussen marketing en meten.

## 4. Procesflow, klantreis

```mermaid
flowchart TD
    A([Consultant logt in]) --> B[FASE 1 · Merk klaarzetten<br/>drie velden: url, naam, schrijfwijzen]
    B --> B1{{App: 8 taken, ~7,5 min<br/>crawl + audit + onderzoek + aanbodboom<br/>+ topics + markt + kennistest + synthese}}
    B1 --> B2[Merkdossier klaar]
    B2 --> B3[/DEMOGESPREK + uur consultancy<br/>daarna: toewijzen aan klantaccount/]
    B3 --> C

    C[FASE 2 · Analyse opstellen<br/>merk + onderwerp + content-brief]
    C --> C1{{App: onderwerp-onderzoek<br/>+ 30 vragen + volumekalibratie}}
    C1 --> D[/GOEDKEURINGSPOORT<br/>klant beoordeelt en bewerkt/]

    D -->|Bevestig en start meting| E[FASE 3 · Analyse runnen]
    E --> E1{{App: 30x vraag stellen met web search<br/>+ per antwoord merken beoordelen}}
    E1 --> E2{{App: aggregatie, score + marge,<br/>concurrentprofilering, rapport}}
    E2 --> F[Dossier: score, bewijs, gaten, aanbevelingen]

    F --> G[FASE 4 · Content genereren<br/>klant kiest pagina's]
    G --> G1{{App: feitenkaart + claim-audit}}
    G1 --> H[/BRIEFINGPOORT<br/>max 8 feitenvragen aan de klant/]
    H --> H1{{App: schrijven, redigeren,<br/>herschrijven, deterministische poort}}
    H1 --> I[/VRIJGAVE<br/>klant leest en geeft vrij/]
    I --> J[Klant publiceert op eigen site<br/>+ vult live-URL in]

    J --> K[FASE 5 · Resultaten monitoren]
    K --> K1{{App: publicatie verifieren}}
    K1 --> K2{{App: hermeting golf 1 na 14 dagen<br/>golf 2 na 28 dagen + controlegroep}}
    K2 --> L[Verdict: gestegen / gelijk / gedaald]
    L -.maandelijkse meetronde.-> E1
    F -.volgende periode.-> F
```

**Twee bewuste stops.** De pijplijn draait volledig op de server en stopt maar op twee plekken op
de klant: de **goedkeuringspoort** (fase 2 → 3) en de **briefingpoort** (fase 4). Alles daarbuiten
loopt door als de klant zijn browser sluit.

## 5. Wat dit kost per klant

**Nagerekend op productie, 17 augustus 2026**, tegen de 13 meetrondes die in het kostenlogboek
staan. De eerdere schatting in dit document was $0,40 en dat bleek ruim twee keer te laag.

| Post | Werkelijke kosten | Opmerking |
|---|---|---|
| Profielonderzoek | eenmalig ~$0,25 | Gemeten over drie onboardings. Hergebruikt door alle analyses van dat merk |
| **Meetronde (30 vragen)** | **gemiddeld $0,855** | Laagste gemeten $0,50, hoogste $1,56. De spreiding komt doordat web_search per vraag verschilt in hoeveel pagina's het ophaalt |
| Meetronde mét herhalingen | $0,855 plus 8 zwaarste vragen × 3 | Verhoogt de betrouwbaarheid waar het gewicht zit |
| Contentpagina | enkele dubbeltjes | Enige post op het duurste model (`gpt-5.6-sol`), ~5× duurder dan op de vorige modelgeneratie |

**Er is precies één kostenknop die telt.** Van een meetronde zit **98,8%** in het stellen van de
vraag mét web_search (`measure_simulate`); het beoordelen van het antwoord is 1,2%. Zet
`MEASURE_WEB_SEARCH` uit en je betaalt centen in plaats van dollars, maar dan meet je niet meer wat
een echte gebruiker te zien krijgt.

De volledige verdeling en de onderbouwing staan in `docs/architecture.md` §6.


---

# 6. De onboarding van begin tot eind

Hoofdstuk 2 vat fase 1 samen in één regel. Dit hoofdstuk loopt dezelfde fase helemaal door, van het
eerste merk tot een klant die zelfstandig in zijn eigen profiel werkt. Bedoeld om te lezen zonder
enige technische kennis.

## 6.1 Voordat er contact is: het merk klaarzetten

Je maakt zelf een merk aan, vóór je de klant ooit gesproken hebt. Dat is een bewuste keuze: het uur
dat je straks met de klant hebt, wil je aan strategie besteden en niet aan het invullen van velden.

Aanmaken kost drie velden: **de naam van het bedrijf**, **het webadres**, en **andere schrijfwijzen
van de naam** (optioneel). Dat laatste veld lijkt onbelangrijk en is het niet. ORBIT ENGINE meet
straks of AI-assistenten het merk noemen, en die telling werkt op de letterlijke naam. Noemt ChatGPT
het bedrijf "Jansen BV" terwijl in het dossier "Bakkerij Jansen" staat, dan telt die vermelding niet
mee en valt de score te laag uit.

Alleen jij kunt een merk aanmaken. Een klant kan dat niet, en dat is geen beperking maar een rem:
aanmaken zet betaald onderzoek in gang.

**Wat er gebeurt met wat je typt.** Alles wat je hier invult wordt vastgelegd als "door de adviseur
ingevuld". Dat is een eigen soort herkomst, met opzet anders dan "door de klant gezegd". Jouw invoer
is een onderbouwde aanname, en dat verschil werkt twee kanten op: het onderzoek mag jouw aanname
tegenspreken als het iets anders vindt, maar het mag hem niet stilletjes overschrijven. Wat je typt
staat er dus nog steeds als het onderzoek klaar is.

## 6.2 Het onderzoek: ongeveer zeven en een halve minuut

Zodra het merk er staat gaat ORBIT ENGINE zelf aan het werk. Je hoeft niets te doen en je mag het
scherm sluiten. Op het scherm zie je de stappen binnenkomen met wat er gevonden is:

1. **Je website uitlezen.** Tot 150 pagina's doorlopen en de tekst uitlezen. Kost niets, want er
   komt geen AI aan te pas.
2. **Je merk en je markt leren kennen.** Wie is dit bedrijf, in welke branche, wat voor soort
   bedrijf, waar werkt het, hoe klinkt het, wie zijn de concurrenten.
3. **Je diensten en producten in kaart brengen**, als boom: onder "massage" hangt "sportmassage".
4. **Je concurrenten en marktbronnen uitzoeken.** Waarom winnen die concurrenten, en welke websites
   bepalen deze markt?
5. **Technische controle.** Mogen de crawlers van AI-bedrijven de site bezoeken? Is de tekst
   leesbaar zonder JavaScript? Geen AI, dus gratis.
6. **Onderwerpen voorstellen**, vijf tot acht, afgeleid uit het aanbod.
7. **Testen wat AI-assistenten al weten.** De duurste stap en de meest verrassende voor een
   ondernemer: kent ChatGPT dit bedrijf, klopt wat hij zegt, welke bronnen haalt hij aan, zijn er
   andere bedrijven die bijna zo heten, en wordt het merk genoemd bij merkloze koopvragen?
8. **Alles samenbrengen tot één dossier.**

Een volledige ronde kost ongeveer 25 dollarcent, met een plafond van ruim twee euro per merk en een
dagplafond over alles heen. Loopt het budget op, dan valt een stap weg en wordt dát vastgelegd; een
stap doet nooit alsof hij geslaagd is.

**Als een stap niets vindt, zegt het scherm dat ook**: geen groen vinkje maar een waarschuwing met
"niets gevonden". Dat is het verschil tussen weten dat je iets moet aanvullen en denken dat alles
klopt. En mislukt een stap, dan loopt de rest van de keten gewoon door.

## 6.3 Wat er dan klaar staat

Een merkdossier: wie is dit bedrijf, wat verkoopt het, wie zijn de concurrenten, wat weet ChatGPT er
al van, en waar zitten de gaten. Bij elk veld staat waar de waarde vandaan komt.

Op je beheerscherm zie je per merk in welke fase het staat: **Voorbereiden** (het onderzoek loopt
nog), **Klaar voor het gesprek** (dit kun je nu demonstreren), **Gesprek gehad** (klaar om over te
dragen) of **Overgedragen** (de klant werkt er zelf in). Die fase houdt zichzelf bij, je hoeft niets
aan te vinken. Er is een filter "alleen merken die op een gesprek wachten".

## 6.4 Het gesprek met de klant

Hier zit het uur consultancy, en daar is één scherm voor: de **onboardingsessie**. Dat is het enige
interne scherm dat bedoeld is om te delen. De klant zit ernaast en kijkt mee, dus er staat geen
enkel bedrag op, geen technische taaknaam en geen foutmelding.

Zes blokken, van boven naar beneden.

**1. Wat we nog niet weten.** Bovenaan, en dat is de belangrijkste keuze van het scherm: zonder die
volgorde gaat het uur op aan het bevestigen van dingen die al klopten. Elk punt zegt wat het kost,
niet wat er ontbreekt. De zwaarste staan bovenaan, en zwaar betekent hier: hoe duur is het om deze
fout pas later te ontdekken. Het werkgebied staat daarom eerst, want dat bepaalt of alle meetvragen
regionaal of landelijk gesteld worden, en dat merk je pas ná een betaalde meting. Bij elk punt staat
een knop die naar het veld springt.

**2. Wat we van je willen weten.** Twaalf velden die een website nooit kan vertellen, en het enige
blok dat helemaal leeg begint:

- waar je op wilt groeien, en waar juist niet;
- de klantgroepen waar de groei zit;
- waar je heen wilt: plaatsen waar je nog niet zit;
- wat een klant ongeveer waard is, in vier grove standen;
- je pieken en dalen in het jaar;
- de bezwaren die je steeds hoort. Het meest onderschatte veld van de lijst: een AI-antwoord heeft
  vaak precies de vorm van een bezwaar, en de pagina die het bezwaar weerlegt wordt geciteerd;
- waar niet over geschreven mag worden, juridisch of concurrentiegevoelig;
- bewijs dat niet op je site staat: certificeringen, cijfers, cases;
- gelijknamige bedrijven die jij niet bent. Zonder die lijst telt de meting hun vermeldingen als de
  jouwe en valt je score te hoog uit. ORBIT ENGINE doet hier zelf een voorstel, want de kennistest
  heeft precies dat gemeten;
- mogen er nieuwe pagina's bij, of moet alles binnen de bestaande structuur blijven;
- waar je over een jaar wilt staan.

Daaronder een klein blok met de contactpersoon: naam, e-mailadres, telefoonnummer.

**3. Wat we al gevonden hebben.** De zeven blokken die de pijplijn zelf vulde, ingeklapt met een
teller ernaast, zodat wat af is niet in de weg zit.

**4. Wat je al hebt liggen.** Een plakvak voor de tarievenpagina, brochure of offertetekst die de
klant tijdens dit gesprek bij zich heeft. ORBIT ENGINE haalt er feiten uit die later in teksten
gebruikt mogen worden.

**5. Wat er speelt buiten je website om.** Een nieuwe naam, een nieuwe vestiging, een dienst die
stopt. Elk soort heeft een gevolg in het systeem; een naamswijziging gaat bijvoorbeeld automatisch
mee als extra schrijfwijze in de meting.

**6. Afronden.** Een teller met drie getallen (samen bevestigd, zelf gevonden, nog open), een korte
lijst met wat er open staat, en de knop om het onderzoek bij te werken. Er zijn geen verplichte
velden en geen afronding die je tegenhoudt: een verplicht veld aan tafel levert een ingevuld vakje op
in plaats van kennis.

**Twee dingen die het hele gesprek gelden.** Alles slaat zichzelf op per veld, zodra je eruit klikt;
er is geen opslaanknop, want een gesprek springt en wordt onderbroken. Lukt een opslag niet, dan
blijft staan wat je typte, met een knop om het opnieuw te proberen. En elk veld kan op "niet van
toepassing": een merk zonder auteur heeft geen auteursbio, en dat is geen gat maar een antwoord.

## 6.5 Wat er ná het gesprek gebeurt

De knop **onderzoek bijwerken** laat precies dat opnieuw uitzoeken wat door het gesprek anders
geworden is. Veranderde het werkgebied, dan worden de meetvragen opnieuw opgesteld en draait de
kennistest opnieuw. Noemde de klant een onbekende concurrent, dan gaat alleen het marktonderzoek
opnieuw. Tien van de vijftien velden leveren bewust niets op: het telefoonnummer verandert niets aan
wat er te onderzoeken valt.

Voordat er iets start zie je een bevestiging met een kostenschatting. Dat venster is de enige plek
waar een bedrag staat, want op het scherm kijkt de klant mee. Is er niets veranderd waar het
onderzoek anders van wordt, dan staat de knop uit met de reden erbij.

Wat je in het gesprek hebt vastgelegd blijft staan: een herdraai vult aan en overschrijft nooit wat
een mens heeft gezegd. Dat is de reden dat je die knop durft te gebruiken.

## 6.6 Het gesprek vastleggen en overdragen

Je legt het gesprek vast met je aantekeningen; er komt een datum bij te staan en het merk springt
naar **Gesprek gehad**. Wordt het een klant, dan draag je over in twee handelingen: een uitnodiging
sturen (de klant krijgt een link en kiest een wachtwoord; registreren zonder uitnodiging kan niet) en
het merk toewijzen aan zijn account. Jij houdt volledige toegang als beheerder, want je begeleidt hem
juist dán.

## 6.7 Wat de klant zelf ziet en kan

De klant ziet zijn eigen werkruimte en niets van de interne laag: geen kosten, geen modelnamen, geen
ruwe onderzoeksuitvoer. Die schermen bestaan wel, maar hij krijgt "pagina bestaat niet" als hij het
adres zou raden.

Hij heeft een **overzicht** (hoe sta ik ervoor, wat wacht op mij), zijn **merkdossier**, een scherm
**bewerken** met 41 velden in zeven stappen, en een scherm met de open punten en feitenvragen. Elk
veld heeft een label, een uitleg in gewone taal en een echt voorbeeld, en toont of de waarde uit zijn
website is gehaald, door ons is ingevuld of door hemzelf is vastgelegd. Hij vult dus niet in, hij
kijkt na. Hier slaat hij op met één knop, en dat is met opzet anders dan in het gesprek.

**Wat hij niet ziet is de commerciële laag en de contactgegevens.** Die twaalf velden zijn een
gesprek, geen invulformulier, en het antwoord stuurt wat ORBIT ENGINE gaat voorstellen en schrijven.
Dat is de enige plek waar zijn scherm en jouw scherm met opzet verschillen. Wat hij zelf aanpast
blijft van hem: elke volgende onderzoeksronde laat het staan.

## 6.8 Twee dingen die er nog niet in zitten

- **Publiceren gaat niet vanuit ORBIT ENGINE.** Er is geen koppeling met het CMS van de klant.
  Teksten worden geschreven en goedgekeurd in de app, daarna handmatig geplaatst en de URL ingevuld.
- **De waardeklasse van een klant wordt vastgelegd en getoond, maar stuurt nog niets.** De andere elf
  commerciële velden worden wel gelezen door de pijplijn.
