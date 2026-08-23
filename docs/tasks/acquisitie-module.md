# Acquisitiemodule: een GEO-marktrapport als opener voor New business

**Status: bespreekstuk, geen bouwopdracht.** Dit document legt vast wat ORBIT ENGINE vandaag doet
en schetst een nieuw idee: een module waarmee een super admin een GEO-analyse laat draaien over een
hele markt (branche plus plaats) in plaats van over één merk, met als resultaat een publieke pagina
die het New business team gebruikt om bedrijven in die markt te benaderen. Wat die pagina precies
moet laten zien en hoe de module er in de app uit komt te zien, ligt nog open. Dat bespreken we aan
de hand van dit document. Niets hierin is al gebouwd.

**Voor wie.** Het New business team, dat de gesprekken gaat voeren, en de software engineers die de
module gaan bouwen. Beide lezen eerst hetzelfde hoofdstuk 1: wat ORBIT ENGINE vandaag daadwerkelijk
doet. Wie dat wil verifiëren of verdiepen, vindt de volledige technische waarheid in
`docs/architecture.md` en de klantreis zonder techniek in `APP_FLOW_DOCUMENTATION.md`.

---

## 1. Wat ORBIT ENGINE vandaag is

ORBIT ENGINE is het GEO-platform van Outer Orbit, voor het MKB. GEO staat voor Generative Engine
Optimization: niet ranken in Google, maar genoemd en aanbevolen worden in de antwoorden van
AI-assistenten zoals ChatGPT. Steeds meer mensen stellen hun oriëntatie- en aankoopvragen aan zo'n
assistent in plaats van aan een zoekmachine. Wordt een bedrijf daar niet genoemd, dan bestaat het
voor die gebruiker niet, ook al staat het op plek één in Google.

De app beantwoordt voor één merk drie vragen: **word ik genoemd**, **hoe vaak vergeleken met mijn
concurrenten**, en **waar haalt de AI die informatie vandaan**. Daarna schrijft de app content die
het gat dicht, en meet weken later of dat gewerkt heeft. Het onderscheidende punt is de gesloten
lus: meten, verklaren, maken, publiceren, opnieuw meten met een controlegroep. Geen uitspraak over
effect zonder die laatste stap.

### De vijf fases, voor één klant

| # | Fase | Wat er gebeurt |
|---|---|---|
| 1 | **Merk klaarzetten** | Een consultant vult drie velden in (webadres, bedrijfsnaam, schrijfwijzen). De app crawlt tot 150 pagina's, brengt het aanbod in kaart, onderzoekt de markt en test wat AI-assistenten al over het merk weten. Kost ongeveer 7,5 minuut en $0,25, eenmalig per merk. |
| 2 | **Analyse opstellen** | De consultant of klant kiest een onderwerp. De app genereert 30 realistische koopvragen, verdeeld over de fases van de klantreis. |
| 3 | **Analyse runnen** | De app stelt alle 30 vragen aan een AI-assistent met live websearch, beoordeelt elk antwoord per merk en berekent een zichtbaarheidsscore met foutmarge. Kost gemiddeld $0,855 per meetronde. |
| 4 | **Content genereren** | De app schrijft pagina's die het gevonden gat dichten, uitsluitend op basis van feiten die eerder zijn vastgesteld. De klant keurt goed voor publicatie. |
| 5 | **Resultaten monitoren** | Na publicatie meet de app opnieuw, met een controlegroep, en velt een verdedigbaar oordeel: steeg de score op de vragen waarvoor gepubliceerd is, of niet. |

### Hoe het vandaag verkocht wordt

Het product is **sales-led, niet self-serve**, naar het model van InSpace Nova. Een consultant zet
het merkprofiel klaar vóórdat er een gesprek is geweest, en het onderzoek van fase 1 is precies het
verkoopargument in dat gesprek: "dit heeft ORBIT ENGINE al over jouw bedrijf gevonden, en dit is wat
we missen." Pas na de verkoop wordt het profiel aan het account van de klant gekoppeld. Dat is
vandaag **inbound**: er is al een naam en een afspraak, en de consultant bereidt één specifiek merk
voor.

### Wat er nog niet bestaat

- Er is geen concept van een analyse over een hele markt of branche, alleen over één merk.
- Er is geen publieke, gedeelde rapportpagina buiten de ingelogde omgeving.
- Er is geen rol tussen "beheerder" (`staff_users`, ziet alle merken) en "klant" in. Een nieuwe,
  beperktere rol zoals "super admin" bestaat nog niet in het rechtenmodel.
- Publiceren gebeurt nooit vanuit ORBIT ENGINE zelf; er is geen koppeling met een CMS. Een publieke
  pagina op een eigen route (`orbitengine.nl/...`) is dus ook voor de bestaande app een nieuw soort
  scherm: voor het eerst iets dat niet achter login staat.

---

## 2. Het idee: een marktrapport als deur-opener

Vandaag begint een verkoopgesprek met een naam die er al is. De acquisitiemodule keert dat om:
**outbound**. Een super admin kiest een branche en een plaats, bijvoorbeeld "hovenier" en
"Eindhoven", en laat ORBIT ENGINE er een GEO-analyse over draaien: niet voor één merk, maar voor de
hele lokale markt. Wie noemt ChatGPT als iemand vraagt naar "een goede hovenier in Eindhoven"? Welke
bedrijven winnen, welke zijn onzichtbaar terwijl ze wel bestaan?

Het resultaat wordt een publieke pagina, bijvoorbeeld `orbitengine.nl/hovenier_eindhoven`, met de
resultaten van die meting. Het New business team gebruikt die pagina niet als eindproduct maar als
opener: elk bedrijf dat in het rapport voorkomt, wordt benaderd. Het rapport moet voor dat gesprek
twee dingen doen die vandaag door het consultancy-uur bij één klant gebeuren, maar dan zonder dat er
al contact is geweest:

1. **Het probleem zichtbaar maken.** Het bedrijf moet in het rapport iets herkennen dat klopt en
   ongemakkelijk is: "een concurrent wordt drie keer zo vaak genoemd", of "AI-assistenten kennen ons
   niet, terwijl we al twintig jaar bestaan."
2. **Ons als oplossing plausibel maken.** Niet alleen het probleem, ook waarom uitgerekend ORBIT
   ENGINE de partij is die het oplost. Dat is precies wat fase 1 vandaag al doet voor één merk:
   laten zien dat er al onderzoek ligt, specifiek voor hen.

### Wat er al herbruikbaar is

Een groot deel van de bouwstenen bestaat al, alleen op merkniveau in plaats van marktniveau:

- **Marktonderzoek en concurrentidentificatie** (fase 1, stap 4): de pijplijn zoekt vandaag al uit
  wie de concurrenten van één merk zijn en waarom die winnen. Voor een marktrapport is de vraag
  omgekeerd: niet "wie zijn de concurrenten van dit merk", maar "welke bedrijven vormen deze markt".
- **De meetronde zelf** (fase 3): 30 realistische koopvragen stellen aan een AI-assistent met
  websearch en per bedrijf beoordelen of het genoemd wordt, is exact de kern-capaciteit die nodig is.
  Het verschil is dat de uitkomst niet één score voor één merk is, maar een ranglijst van alle
  genoemde bedrijven in die markt.
- **Rapportgeneratie**: de jargonvrije samenvatting die vandaag per klant geschreven wordt
  (`lib/pipeline/report`), is qua vorm dicht bij wat een marktrapport nodig heeft.
- **Kostenmodel**: een meetronde kost vandaag gemiddeld $0,855, grotendeels websearch. Een
  marktrapport met meerdere bedrijven per vraag is in kosten waarschijnlijk vergelijkbaar met of
  goedkoper dan een marktronde per merk, omdat één set vragen meerdere bedrijven tegelijk meet in
  plaats van dat elk bedrijf zijn eigen ronde nodig heeft.

### Wat nieuw is

- Een manier om een markt (branche plus plaats) te definiëren in plaats van een merk.
- Een stap die uitzoekt welke bedrijven in die markt meespelen, zonder dat er al een merkprofiel
  bestaat, dus zonder een eigen website als startpunt zoals fase 1 dat vandaag heeft.
- Een ranglijst over meerdere bedrijven in plaats van een score voor één merk.
- Een publieke pagina, zonder login, op een korte leesbare URL. Dat is voor deze app een nieuw
  soort scherm; alle bestaande schermen staan achter authenticatie.
- Een rol "super admin", beperkter dan de bestaande beheerdersrol, die deze marktanalyses mag
  starten. Reden om dit niet bij de bestaande `staff_users`-rol te leggen: die rol ziet vandaag
  alle klantmerken, en een marktanalyse start een bredere, publiek zichtbare actie die een kleinere
  groep moet kunnen doen dan "iedereen die als support met klanten meekijkt".
- Een koppeling tussen "bedrijf verscheen in dit rapport" en het New business team: een lijst, geen
  los rapport, zodat opvolging bij te houden is.

---

## 3. Wat we nog moeten bespreken

Dit zijn de keuzes die de vorm van de module bepalen. Geen ervan is hierboven al beantwoord.

1. **Wat is het "iets" precies dat het New business team meekrijgt?** Een score en een ranglijst
   zijn het ruwe materiaal, maar niet per se het gesprek. Denkbare varianten: een pagina die het
   bedrijf zelf kan bekijken (dan moet hij overtuigend zijn zonder toelichting); een pdf of
   samenvatting die de accountmanager gebruikt tijdens het telefoongesprek (dan mag hij ruwer zijn,
   want er is een mens bij); of allebei, met de publieke pagina als bewijs dat je tijdens het
   gesprek kunt laten zien: "kijk, dit staat er al, over jou."
2. **Wie komt er wél en wie niet in het rapport?** Alleen bedrijven die door AI-assistenten genoemd
   worden, of ook duidelijk aanwezige bedrijven die géén enkele keer genoemd worden? Dat laatste is
   waarschijnlijk het scherpste verkoopargument ("je bestaat, maar AI ziet je niet"), maar vraagt
   een aparte stap om te bepalen wie er "hoort" te zijn in een markt, los van wie genoemd wordt.
3. **Hoe wordt vastgesteld welke bedrijven een markt vormen?** Bij een bestaand merk begint de
   pijplijn bij de eigen website. Bij een marktrapport is er geen enkel startpunt; de markt moet uit
   niets anders dan "branche plus plaats" worden afgeleid.
4. **Hoe voorkomen we een verouderd of afgeschreven rapport?** Een publieke pagina die maanden
   blijft staan terwijl de markt allang is doorgemeten, wekt een verkeerde indruk bij een bedrijf
   dat hem later vindt. Ververst de pagina mee met een volgende meetronde, of is hij een momentopname
   met een zichtbare datum?
5. **Wat gebeurt er na de eerste meting, functioneel: wordt dit een terugkerende marktronde die de
   ranglijst bijhoudt, of een eenmalige actie per markt die het New business team aanvraagt?**
6. **Rechten:** wie krijgt de rol "super admin", hoeveel mensen zijn dat, en wat mag deze rol nog
   meer dan alleen marktanalyses starten?
7. **Kosten en schaal:** hoeveel markten wil New business per maand kunnen draaien, en past dat
   binnen het bestaande kostenplafond per taak (`docs/architecture.md` §6), of moet daar een eigen
   plafond voor komen?

---

## 4. Randvoorwaarden vanuit hoe de app vandaag werkt

Een paar dingen die niet ter discussie staan, omdat ze vastliggen in de rest van de app en de
module er niet mee mag botsen:

- **Schrijven gaat nooit rechtstreeks vanaf de client.** Ook het starten van een marktanalyse loopt
  via een API-route met service-role key en een expliciete rechtencontrole op de nieuwe
  super-admin-rol.
- **Onbekend is een betere waarde dan een verkeerde.** Een bedrijf dat niet met zekerheid genoemd
  wordt, hoort niet met een gok in de ranglijst te staan. Hetzelfde vangnet dat vandaag voorkomt dat
  een AI-model een niet-genoemd merk toch een rol toedicht, moet ook hier gelden.
- **Alles bewaren.** Elke AI-aanroep in de nieuwe module slaat, net als de rest van de pijplijn,
  zijn volledige ruwe uitvoer op naast de uitgesplitste velden.
- **Migraties zijn additief en idempotent**, nooit `drop`, en gaan via de Supabase-MCP-tool.
- **Kosten zijn een ontwerpvariabele.** Een marktanalyse zonder websearch is goedkoop maar meet niet
  wat een echte gebruiker ziet, exact dezelfde afweging als bij `MEASURE_WEB_SEARCH` vandaag.
