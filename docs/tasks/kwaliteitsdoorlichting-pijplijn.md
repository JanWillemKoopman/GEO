# Kwaliteitsdoorlichting: één merk van aanmaken tot opgeleverde pagina, stap voor stap nagemeten

> **Status (23 september 2026): in uitvoering.** Fase 0.1 is gebouwd (migratie 0112, zie
> `docs/logbook.md`), de blinde lezer is getoetst (§4, 0.5: vergelijken werkt, losse cijfers niet),
> de drie merken zijn gekozen (regio Eindhoven: een hovenier, een installateur en een rijschool). Opgesteld op verzoek van de
> eigenaar na een analyse van de code en van productie. Elk cijfer hieronder is die dag nagerekend
> op de code of op de database (Supabase-project `GEO`), tenzij er "schatting" bij staat.
>
> **Besluit van de eigenaar, 23 september 2026:** de copywriterronde van 3 september 2026 (de twaalf
> pagina's van MJB Dakservice en Fysio Centrum Utrecht, de oordelen van de copywriter en de
> AI-ronde in `content-reviews/`) is verouderd en telt niet mee. Dit plan gebruikt die ronde nergens:
> niet als nulmeting, niet om de blinde lezer te ijken en niet als vergelijkingsmateriaal.

## 0. In het kort

De eigenaar wil weten hoe goed ORBIT ENGINE is in het maken van content op het niveau van een
professionele copywriter, en waar in de keten de kwaliteit weglekt. Daarvoor lopen we één nieuw
merk helemaal door, van aanmaken tot opgeleverde pagina, via de schermen, met Claude in de rol van
consultant en van klant. Bij elke stap leggen we vast welke gegevens er ontstaan, wat er naar de AI
gaat, welke opdracht erbij hoort en wat er terugkomt. Elke stap wordt met twee meetlatten gemeten:

1. **De meetlat van de app zelf**: de twaalf dimensies, de vier beoordelaars, de controles in code
   en het eindoordeel (`docs/tasks/contentkwaliteit-framework.md`).
2. **Een blinde, losse lezer**: een ander taalmodel dat de app niet kent en alleen het doel van de
   stap en de uitkomst ziet, en de vraag krijgt of dit goed genoeg is om de volgende stap te voeden.
   Aan het eind: zou de klant dit publiceren?

Het plan voegt daar twee dingen aan toe die de uitkomst veel sterker maken: een **vooraf bevroren
waarheidsdossier**, zodat "verzonnen" meetbaar wordt, en **wisselproeven**, die per stap laten zien
hoeveel de eindtekst beter wordt als alleen die stap beter was. Dat laatste is wat de eigenaar
uiteindelijk zoekt: waar een verbetering het meeste oplevert.

Geschatte kosten aan AI-aanroepen: ongeveer $15 tot $20 (schatting, §8). Doorlooptijd: ongeveer
een dag bouwen, daarna twee tot drie dagen doorlopen en beoordelen.

---

## 1. Wat er al staat, zodat we het niet opnieuw bouwen

| Wat | Waar | Waarom het hier telt |
|---|---|---|
| Meetlat 1: twaalf dimensies, vier beoordelaars, controles in code, oordeel klaar, repareren of tegenhouden | `lib/pipeline/quality-*.ts`, `content-panel.ts` | Dit is meetlat 1, hij hoeft niet gebouwd te worden |
| Het Kwaliteitslab | `/beheer/kwaliteit`, `content_quality_reviews` | De plek waar de oordelen van de eigenaar in deze doorloop terechtkomen (§6.3) |
| De app bedienen zonder browser | `scripts/live.ts` | Inloggen en routes aanroepen werkt al |
| De goedkope herkeuring | `POST /api/analyses/[id]/recheck` | Een tekst opnieuw keuren zonder hem opnieuw te schrijven, ongeveer een cent |
| De ruwe uitvoer van elke AI-aanroep | `ai_calls.raw_json` | 1721 van de 1940 aanroepen van de laatste 30 dagen hebben hem; de ontbrekende zijn allemaal Sales en zoekvolume, geen enkele uit de contentketen |
| Het proces in 117 stappen | `docs/processtappen-nieuwe-pagina.md` | De ruggengraat van de doorloop in §5 |

---

## 2. Zes kanttekeningen die het plan sterker maken

**1. De app bewaart niet welke opdracht en welke gegevens er naar de AI gaan.** Nagekeken in
`lib/openai/structured.ts` en `lib/openai/ledger.ts`: `ai_calls` bewaart het model, de tokens, de
kosten en het antwoord, maar niet de systeemopdracht en niet de gebruikersopdracht. Drie van de vier
vragen van de eigenaar ("welke data gaat erheen", "welke prompt", "wat komt terug in verhouding tot
wat erin ging") zijn daarmee vandaag niet te beantwoorden. Dit moet eerst, anders is de doorloop
een verzameling uitkomsten zonder oorzaak. Zie §4, stap 0.1.

**2. Een losse AI als klant is geen objectieve meetlat, maar een tweede mening met eigen
afwijkingen.** Bekende afwijkingen van een taalmodel als beoordelaar: het kiest vaker de tekst die
het als eerste leest, het vindt langere teksten beter, en het waardeert tekst die lijkt op wat het
zelf zou schrijven. Gevolg voor dit plan:

- we gebruiken de blinde lezer vooral om **te vergelijken en fouten aan te wijzen**, en minder om
  een rapportcijfer te geven;
- we **toetsen hem eerst** met teksten waarvan we het goede antwoord al weten (§4, stap 0.5);
- we kiezen een **ander soort model dan de schrijver**. De app schrijft met GPT-6 Sol en keurt met
  GPT-6 Luna. Een beoordelaar uit dezelfde familie deelt de smaak van de schrijver en vindt dus de
  fouten niet die die smaak veroorzaakt. Voorstel: Claude, in een afgeschermde opdracht zonder
  toegang tot de code.

**3. Als Claude zowel consultant als klant speelt en dingen verzint, weet daarna niemand meer wat
waar is.** Een verzonnen antwoord op de vragenlijst dat keurig in de tekst belandt, ziet eruit als
een goed resultaat. Oplossing: vóór de doorloop een **waarheidsdossier** opstellen en bevriezen,
met alles wat "waar" is over dit bedrijf buiten de website om. De klantrol mag alleen daaruit
antwoorden. Dan wordt elke bewering in de eindtekst te toetsen: staat hij op de site, in het
dossier, of nergens. Dat laatste is een verzinsel, en dat is precies wat we willen tellen.

**4. "Acteer als klant" is één perspectief, en niet het belangrijkste voor het doel.** Een
ondernemer beoordeelt of het over hem klopt en of hij zich ermee kan vertonen. Hij ziet niet of de
tekst een lezer overtuigt, of hij op het niveau van een copywriter zit, en of een AI-assistent hem
zou citeren. Voorstel: vier blinde lezers, elk alleen met wat die persoon in het echt zou zien (§6).

**5. Eén doorloop zegt weinig, want een AI geeft elke keer iets anders.** Een pagina die de ene keer
goed en de andere keer slecht uitvalt, wijst op een opdracht die te veel openlaat. Daarom draaien we
de belangrijkste stappen drie keer op dezelfde invoer. De spreiding is zelf een meetwaarde.

**6. Een demo met een verzonnen bedrijf werkt niet, en via de schermen alleen ook niet.** De hele
keten begint met het lezen van een echte website; zonder site is er geen aanbod, geen feitenkaart
en niets om te meten. Het bedrijf moet dus echt zijn, alleen het gesprek en de antwoorden worden
verzonnen. En de schermen doorlopen test vooral de schermen: de kwaliteitsinformatie zit in de
database. Daarom doen we allebei: de handelingen via de schermen (met een schermafdruk per stap),
het vastleggen van wat er gebeurde via de database.

Twee praktische gevolgen van de nieuwe contentflow (`docs/tasks/contentflow-een-lijn.md`):

- het schrijven start pas als élke vraag van de pagina beantwoord of overgeslagen is, en niet eerder
  dan 10 dagen voor de geplande datum (`SCHRIJFVOORSPRONG_DAGEN` in `lib/plan-status.ts`). De
  pagina's in de doorloop krijgen dus een datum binnen die 10 dagen;
- dat schrijven wordt gestart door een nachtelijke taak om 04:00 UTC (migratie
  `0050_plan_cron.sql`). Een doorloop kost daardoor minstens één nacht, tenzij we die taak met de
  hand aftrappen.

---

## 3. Welk merk

Een nieuw, echt bestaand bedrijf, dat nog niet in de database staat. Waar het aan moet voldoen:

- **regionaal MKB met diensten**, de doelgroep uit `CLAUDE.md`, waar mensen een AI-assistent een
  koopvraag over stellen ("welke ... in [plaats] kan ...");
- **een site met genoeg om te lezen**, maar niet perfect: tussen de 30 en 150 pagina's, met diensten
  op eigen pagina's. Een site die al alles zegt, laat niets te verbeteren over;
- **een sector die de eigenaar zelf kan beoordelen**, want hij is in §6.3 de menselijke toets;
- **geen contact met het bedrijf**: we vullen geen contactpersoon in en sturen niets.

Het risico van één merk: we stemmen af op één sector. Daarom later een tweede ronde met een merk
met een dunne website. Dat is de lastige klant, en daar blijkt pas of de vragen aan de klant het gat
dichten.

---

## 4. Fase 0: meetbaar maken (ongeveer een dag bouwen)

### 0.1 Elke AI-aanroep bewaart ook wat erin ging

Een nieuwe kolom `ai_calls.input_json` (additief, conventie 4) met: de systeemopdracht, de
gebruikersopdracht, de schemanaam, het soort werk, de redeneerinspanning, websearch aan of uit.
Plus `prompt_hash`, een vingerafdruk van de systeemopdracht, zodat je tussen twee doorlopen ziet
of een opdracht veranderd is. Vullen gebeurt op één plek: `recordUsage()` in
`lib/openai/structured.ts`, dus geen aanroepplek kan het vergeten.

Kosten aan opslag: de tabel is nu 5,5 MB. Een schrijfopdracht is gemiddeld 22.853 invoertokens,
ongeveer 90 KB. Over een maand van ongeveer 2000 aanroepen is dat een paar honderd MB in het
slechtste geval, en veel minder in de praktijk omdat de meetaanroepen klein zijn. **Aanbevolen: altijd
aan**, niet alleen voor de demo. Het is dezelfde redenering als conventie 8 voor de uitvoer: je
ontdekt pas achteraf welke aanroep je had willen nalezen.

### 0.2 Een apart demo-account

Een eigen account, zodat de kosten en de gegevens van de doorloop apart te tellen en later netjes
op te ruimen zijn. De consultantrol gebruikt een staf-account, de klantrol een nieuw adres dat via
de gewone uitnodiging binnenkomt. De eigenaar levert de inloggegevens aan via de omgeving, nooit in
de repo (zie de toelichting in `scripts/live.ts`).

### 0.3 Een spoorexport per merk

Een script `scripts/spoor.ts <profiel-id>` dat alles van één merk in tijdsvolgorde uitschrijft naar
een map per doorloop: per stap de invoer, de opdracht, de uitvoer, de kosten, het model, de taak die
het startte, en de rijen die die stap schreef. Alleen lezen. Zo wordt de hele keten één map die je
van boven naar beneden kunt lezen, ook zonder technische kennis.

### 0.4 De schermen bedienen

Playwright (Chromium staat al klaar in deze omgeving) klikt door de schermen als consultant en als
klant, met een schermafdruk na elke handeling. Waar een scherm vastloopt of iets onduidelijk is,
noteren we dat als bevinding: dat is gratis UX-onderzoek.

### 0.5 De blinde lezer eerst toetsen, vóór hij iets mag zeggen

Er is geen bruikbaar menselijk oordeel om hem tegen af te zetten, dus we toetsen hem met teksten
waarvan we het goede antwoord zelf maken. Drie proeven, alle drie goedkoop:

1. **Opzettelijke fouten.** We nemen een pagina en maken er vijf slechtere versies van, elk met één
   bekende fout: een verzonnen garantie, een opening die bij het bedrijf begint in plaats van bij de
   lezer, een stuk dat overal zou kunnen staan, een verkeerde aanspreekvorm, een alinea die niets
   zegt. De lezer moet elke fout vinden en elke slechtere versie lager zetten dan het origineel.
   **Norm: minstens vier van de vijf.**
2. **Volgorde omdraaien.** Dezelfde twee teksten, één keer A dan B, één keer B dan A. Kiest hij
   beide keren dezelfde, dan beoordeelt hij de tekst en niet de volgorde. **Norm: minstens negen van
   de tien paren gelijk.**
3. **Twee keer hetzelfde vragen.** Dezelfde tekst twee keer beoordelen. Liggen de oordelen ver uit
   elkaar, dan is zijn opdracht te open.

Haalt hij een norm niet, dan passen we zijn opdracht aan tot hij hem wel haalt, en pas daarna mag
hij de doorloop beoordelen.

⚠️ Deze proeven zeggen of de lezer fouten ziet en consequent is. Ze zeggen niet of zijn smaak die van
een ondernemer of een copywriter is. Dat blijft de rol van de mens in §6.3.

---

## 5. Fase 1 en 2: het waarheidsdossier en de doorloop

### 5.1 Het waarheidsdossier (vóór de doorloop, daarna bevroren)

- de gespreksvelden die de consultant in fase 3 invult: waar het bedrijf op wil groeien, wat niet
  meer, klantgroepen, regio's, seizoen, bezwaren, verboden onderwerpen, bewijs, doel over een jaar;
- de feiten die een ondernemer kent en een website niet: prijsindicaties, doorlooptijden,
  werkwijze, garanties, typische klantsituaties, wat hij nooit doet;
- een **klantpersona**: hoe deze ondernemer antwoordt. Kort, soms met een tikfout, slaat een vraag
  over als hij het antwoord niet paraat heeft. Echte MKB-klanten schrijven geen alinea's.

Alles wat niet op de site staat is verzonnen, maar geloofwaardig voor dit soort bedrijf. Het dossier
krijgt een datum en verandert na de start niet meer. Het staat bewust **niet** in de repo: het
combineert echte bedrijfsgegevens met verzonnen claims over diezelfde bedrijven, en dat hoort niet
in een gedeelde codebase. Het staat bij de werkbestanden van de doorlichting. De eigenaar leest
het vóór de start: klinkt dit als een echte ondernemer in deze branche?

**Twee klantprofielen, dezelfde vragen.** Voor twee pagina's beantwoorden we de vragen twee keer:
één keer als ideale klant (volledig, concreet) en één keer als realistische klant (kort, deels
overgeslagen). Het verschil in de eindtekst laat zien hoeveel de kwaliteit afhangt van de klant, en
dus of je moet investeren in betere vragen of in beter schrijven.

### 5.2 De doorloop, stap voor stap

Per stap: wie er handelt, welke AI-aanroepen er gebeuren (de namen zoals ze in `ai_calls.kind`
staan), en de **poortvraag** die de blinde lezer krijgt. Die vraag gaat altijd over het doel van de
stap, niet over de techniek.

| # | Stap | Wie | AI-aanroepen | Poortvraag aan de blinde lezer |
|---|---|---|---|---|
| 1 | Merk aanmaken, drie velden | consultant | geen | |
| 2 | Vooronderzoek en website lezen | systeem | `crawl_focus` | Zijn dit de pagina's die het aanbod echt dragen? Wat mist er? |
| 3 | Merk en markt leren kennen | systeem | `profile_research`, `profile_market` | Klopt deze beschrijving met de site? Wat is fout, wat ontbreekt? |
| 4 | Aanbod als boom | systeem | `profile_offering` | Zou de ondernemer deze lijst herkennen als zijn aanbod? |
| 5 | Onderwerpen voorstellen | systeem | `propose_topics` | Zou een ervaren consultant deze onderwerpen kiezen voor groei? |
| 6 | Wat AI-assistenten al weten | systeem | `llm_baseline_*` | Is de conclusie over het merk juist, gezien de antwoorden? |
| 7 | Merkdossier | systeem | `profile_synthesis` | Kan een schrijver hier een goede pagina uit maken? Wat mist hij? |
| 8 | Het gesprek, twaalf commerciële vragen | consultant en klant | geen | (Hier telt: hoeveel van het waarheidsdossier wordt opgeslagen?) |
| 9 | Uitnodigen en overdragen | consultant | geen | |
| 10 | Cluster aanmaken en onderzoeken | klant of consultant | `topic_research` | |
| 11 | Meetvragen opstellen | systeem | `prompts`, `volume_calibration` | Zijn dit vragen die echte mensen aan een AI-assistent stellen? |
| 12 | Bevestigen en meten | klant, dan systeem | `measure_simulate`, `measure_mention` | Is de vermelding goed herkend? (Hier bestaat `eval:mention` al) |
| 13 | Rapport en aanbevolen pagina's | systeem | `gap_analysis`, `report` | Zijn dit de pagina's die het meeste opleveren? Is de lezer per pagina scherp? |
| 14 | Contentplan, maand vrijgeven | klant | geen | |
| 15 | Onderzoek per pagina | systeem | `fact_atomise`, `item_dossier` | Zijn dit de vragen die een lezer echt heeft? Klopt de uitleg? |
| 16 | Inhoudsopgave (contract) | systeem | `content_contract` | Zou een copywriter deze opbouw kiezen? Is het een verhaal of een vragenlijst? |
| 17 | Vragen aan de klant | systeem | `claim_audit` | Begrijpt een ondernemer deze vragen? Kan hij ze beantwoorden? Ontbreekt de vraag die ertoe doet? |
| 18 | Vragen beantwoorden | klant | geen | (Antwoorden uitsluitend uit het waarheidsdossier) |
| 19 | Schrijfopdracht | systeem | `source_analysis`, `writer_brief` | Als jij deze opdracht kreeg, weet je dan wat je moet schrijven en voor wie? |
| 20 | Eerste versie | systeem | `content_draft` | De vier blinde lezers uit §6 |
| 21 | Keuring door de app | systeem | `content_critique`, `content_factuality`, `content_citability`, `content_craft` | Klopt het oordeel van de app met dat van de blinde lezers? |
| 22 | Reparatierondes | systeem | `content_revise`, `content_version_compare` | Is de gerepareerde versie beter, slechter of alleen anders? |
| 23 | Goedkeuren en exporteren | klant | geen | Zou de ondernemer hem zo op zijn site zetten? |

Publiceren en de nameting na 14 en 28 dagen vallen buiten deze doorloop: het merk is echt, de site
is niet van ons, en we plaatsen niets op andermans website.

Naast de poortvraag legt elke stap zijn eigen meting vast (meetlat 1 waar die bestaat) en een
**feitentrechter**: van elk feit uit het waarheidsdossier houden we bij waar het nog aanwezig is.
Gezegd in het gesprek, opgeslagen, op de feitenkaart, in de schrijfopdracht, in de tekst. Waar
feiten afvallen, lekt de kwaliteit. Dat is een telling in code, geen AI.

---

## 6. Fase 3: de eindtekst beoordelen

### 6.1 Vier blinde lezers, elk met alleen wat hij in het echt zou zien

| Lezer | Ziet | Vraag |
|---|---|---|
| De ondernemer | zijn eigen opdracht ("ik wilde een pagina over X") en het waarheidsdossier | Klopt het over mijn bedrijf? Zou ik dit publiceren: ja, na aanpassing, nee? Wat eerst veranderen? |
| De lezer met het probleem | alleen de pagina | Helpt dit me beslissen? Zou ik bellen? Waar haak ik af? |
| De eindredacteur | de opdracht en de pagina | Is dit het niveau van een professionele copywriter? Wat zou je schrappen? |
| De AI-assistent | de doelvraag, onze pagina en de bronnen die nu in de AI-antwoorden opduiken | Welke bron citeer je om deze vraag te beantwoorden, en waarom? |

Elke opmerking komt met de zin uit de pagina waar hij over gaat. Een opmerking zonder citaat telt
niet mee; dat is dezelfde regel die de vakmanschapsbeoordelaar van de app al heeft.

De vierde lezer is een **proef vóór publicatie** op de vraag waar het product om draait: wordt deze
pagina gekozen boven wat er nu staat? Het is een benadering en geen meting van een echte
AI-assistent, en zo moet hij ook gerapporteerd worden.

### 6.2 De blinde vergelijking: de strengste maat

Scores zeggen minder dan een directe keuze. Per pagina leggen we de blinde lezers twee teksten naast
elkaar, zonder te zeggen welke van ons is:

- onze pagina tegen **de huidige pagina op de site van de klant** over hetzelfde onderwerp, als die
  er is (is het een verbetering?);
- onze pagina tegen **de beste pagina van een concurrent** uit de bronnen van de meting (winnen we?).

De uitkomst is een winstpercentage per vergelijking. "Op het niveau van een professionele
copywriter" betekent dan concreet: onze pagina wint minstens zo vaak als hij verliest van de beste
concurrent. Elke vergelijking twee keer, met de volgorde omgedraaid (zie §4, 0.5).

### 6.3 De mens heeft het laatste woord

De eigenaar leest drie pagina's en tien poortoordelen zelf, zonder eerst de oordelen van de blinde
lezers te zien. Wijkt zijn oordeel af, dan wint hij, en noteren we waarom. Zijn oordelen gaan in het
Kwaliteitslab (`content_quality_reviews`, met een eigen `benchmark_set`). Het zijn de eerste
menselijke oordelen van de nieuwe keten, en daarmee het begin van een eigen ijkset.

---

## 7. Fase 4: de oorzaak vinden, met wisselproeven

Een zwakke eindtekst heeft vele mogelijke oorzaken: een dunne feitenkaart, een verkeerde lezer in de
aanbeveling, een inhoudsopgave als vragenlijst, een schrijfopdracht die te veel openlaat, of een
reparatieronde die het verhaal uit elkaar trekt. Kijken zegt welke stap er slecht uitziet. Het zegt
niet welke stap de eindtekst slecht maakt.

**Een wisselproef doet dat wel.** We nemen de uitvoer van één stap, laten de blinde eindredacteur
er een verbeterde versie van maken, en laten alleen de stappen daarna opnieuw draaien. Het verschil
in de eindtekst is de hefboom van die stap.

Voorgestelde wisselproeven, in deze volgorde:

1. **De lezer in de aanbeveling** (stap 13): een scherpere lezer, verder alles gelijk.
2. **De inhoudsopgave** (stap 16): als verhaalboog in plaats van als vragenlijst.
3. **De antwoorden van de klant** (stap 18): ideaal tegen realistisch, zie §5.1.
4. **De schrijfopdracht** (stap 19): een opdracht zoals een ervaren eindredacteur hem zou geven.
5. **Zonder reparatierondes** (stap 22): de eerste versie tegen de gerepareerde. Nagerekend over
   de laatste 30 dagen: 37 reparatieaanroepen kostten $5,26, meer dan de 27 schrijfaanroepen
   ($5,02). Als de reparatie de tekst niet beter maakt, is dat de duurste stap die niets oplevert.

Technisch: stap 0.1 maakt dit mogelijk, want met de opgeslagen invoer kunnen we een aanroep
nabootsen met één blok aangepast. Of dat via de app op productie gaat of via een los script
met dezelfde functies, besluiten we tijdens fase 0 (§9, punt 4).

**Spreiding.** De schrijfaanroep en de inhoudsopgave draaien we voor twee pagina's drie keer op
dezelfde invoer. Liggen de uitkomsten ver uit elkaar, dan is de opdracht te open, en dat is een
bevinding op zich.

---

## 8. Fase 5: verbeteren, en de doorloop blijvend maken

Het resultaat is een verslag met:

- een **lekkagekaart**: per stap de poortoordelen, de feitentrechter en de hefboom uit de
  wisselproeven, in één overzicht, voor iemand zonder technische kennis;
- **hooguit vijf verbeteringen**, op volgorde van opbrengst, elk met een test in `test-unit.ts` en
  een deterministisch vangnet (conventie 1);
- een **herhaalbare set**: het waarheidsdossier, de opgeslagen invoer en de getoetste blinde lezer
  samen zijn een vaste proef die na elke promptwijziging opnieuw kan draaien.

⚠️ Dat laatste botst met een eerder besluit. Het herstelplan na de audit had een eigen punt voor
zo'n vaste proef (`eval:content`), en de eigenaar heeft dat op 3 september 2026 geschrapt
(`docs/logbook.md`). Deze doorlichting bouwt er de helft van. Of hij blijvend wordt, is een nieuwe
keuze voor de eigenaar, na de eerste doorloop, wanneer duidelijk is wat hij oplevert.

### Kosten (schatting, gebaseerd op `ai_calls` van de laatste 30 dagen)

| Post | Ongeveer |
|---|---|
| Merkonderzoek | $0,30 |
| Twee clusters meten, 30 vragen elk | $1,70 |
| Zes pagina's voorbereiden, schrijven, keuren, repareren | $6 tot $8 |
| Herhalingen voor de spreiding en de twee klantprofielen | $2 |
| Wisselproeven, vijf stuks op twee pagina's | $3 tot $5 |
| Blinde lezers (Claude, binnen deze werksessie) | geen extra rekening |
| **Samen** | **ongeveer $15 tot $20** |

Dat past binnen de dagplafonds (€20 per klant, €50 voor alle accounts samen), mits de meting en het
schrijven niet op dezelfde dag vallen als ander werk.

---

## 9. Beslissingen van de eigenaar

1. **Welk merk.** Een nieuw, echt bedrijf volgens de eisen in §3. De eigenaar noemt er een, of
   Claude stelt er drie voor en de eigenaar kiest.
2. **Wie is de blinde lezer.** Aanbevolen: Claude, omdat het een ander soort model is dan de
   schrijver. Alternatief: Gemini, dan is een `GEMINI_API_KEY` nodig.
3. **De opdrachten altijd bewaren of alleen voor de demo.** Aanbevolen: altijd (§4, 0.1).
4. **Wisselproeven op productie of in een los script.** Productie is echter maar laat sporen na in
   de app; een script is schoner maar vraagt een OpenAI-sleutel in deze werkomgeving. Pas te beslissen
   na fase 0.
5. **Inloggegevens.** Een staf-account voor de consultantrol en een e-mailadres voor de klantrol,
   aangeleverd via de omgeving.

## 10. Volgorde

1. Fase 0: instrumenteren en de blinde lezer toetsen. Eerst dit, anders meet de rest niets.
2. Waarheidsdossier opstellen, laten lezen door de eigenaar, en bevriezen.
3. De doorloop, stap 1 tot en met 23, met na elke stap de spoorexport en de poortvraag.
4. De eindtekst beoordelen: vier lezers, de blinde vergelijking, de eigenaar.
5. De wisselproeven.
6. Het verslag met de lekkagekaart en hooguit vijf verbeteringen.
7. Daarna, los: een tweede merk met een dunne website.
