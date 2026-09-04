# De contentpijplijn van ORBIT ENGINE

**Overdrachtsdocument voor een externe copywriter en een externe AI-expert**
Stand van zaken op 4 september 2026, bijgewerkt aan het eind van diezelfde dag met wat er uit hun
feedback gebouwd is. Alle cijfers in dit document zijn nagemeten op de productiedatabase, niet
overgenomen uit oudere documentatie.

> **Wat er sinds de doorlichting veranderd is.** De feedback van beide experts staat letterlijk in
> `content-reviews/feedback/expertronde-copywriter-en-ai-4-september-2026.md`, de negentien
> optimalisaties die eruit volgden in `docs/tasks/optimalisaties-expertronde-4-september-2026.md`,
> en de beslissingen in `docs/logbook.md`. De belangrijkste wijziging in de pijplijn hieronder is
> **de schrijfopdracht** (paragraaf 5b): een goedkope stap vlak vóór het schrijven die kiest wat er
> gezegd moet worden, met als kernvraag waarom juist deze lezer dit bedrijf zou kiezen.

---

## 0. Waarom u dit leest

ORBIT ENGINE meet of een merk genoemd wordt als iemand een vraag stelt aan een AI-assistent, en
schrijft daarna de pagina's die dat gat moeten dichten. Dit document beschrijft alleen dat tweede
deel: het schrijven. Van het moment dat de app besluit dat er een pagina moet komen tot het moment
dat er een publicabele tekst ligt.

Wij vragen twee verschillende oordelen.

**Aan de copywriter.** De pijplijn hieronder is een redactieproces dat wij in software hebben
gegoten. Klopt dat proces? Ontbreekt er een stap die u zelf altijd zet? Vraagt een van de
instructies iets dat een goede tekst juist in de weg zit? En als u de teksten leest die er
uitkomen: welke instructie is daar de oorzaak van?

**Aan de AI-expert.** Wij hebben elf AI-aanroepen per pagina, verdeeld over voorbereiding,
schrijven, beoordelen en repareren. Is dat de juiste verdeling? Zit het geld op de goede plek?
Zijn de prompts te lang, te streng, tegenstrijdig? En het belangrijkste: onze beoordelaars mogen
straks zelf beslissen welke pagina's herschreven worden, en we weten dat hun rangorde nog niet
klopt. Hoe repareert u dat?

Wat u nergens hoeft te sparen: dit document beschrijft wat er staat, niet wat wij ervan vinden.
Paragraaf 9 zegt eerlijk wat er nog niet goed genoeg is.

---

## 1. Twee principes die alles verklaren

Vrijwel elke keuze hieronder valt terug op deze twee.

**Principe 1. Elke promptinstructie krijgt een vangnet in code.**
Een instructie aan een taalmodel is een intentie. Code is een garantie. Overal waar de prompt iets
verbiedt of eist, staat er een deterministische controle naast die achteraf natelt of het gebeurd
is. Als u in dit document een prompt-regel leest, kunt u ervan uitgaan dat er verderop een controle
staat die hem nameet. Waar dat niet zo is, staat het er expliciet bij.

**Principe 2. Onbekend is beter dan verkeerd.**
Onbruikbare modeluitvoer wordt leeg, nooit nul en nooit een gok. Een pagina die iets niet noemt is
beter dan een pagina die het verzint. Dat klinkt vanzelfsprekend, maar het is de reden achter de
strengste constructie in de hele pijplijn: de feitenkaart.

---

## 2. De feitenkaart: de gesloten lijst

Dit is het belangrijkste bouwwerk van de pijplijn en het komt in bijna elke aanroep terug, dus het
staat hier vooraan.

Een AI die over een lokale ondernemer schrijft, vult gaten. In een echte test schreef het model
vijf feiten die nergens vandaan kwamen: pechhulp, vervangend vervoer, schadeherstel, looptijden,
kilometerbundels. Stuk voor stuk precies op de plek waar de pagina een concreet detail nodig had.
Dat is niet op te lossen met "verzin niets", want dat is een vraag om terughoudendheid en het model
denkt dat het behulpzaam is.

De oplossing is een **gesloten lijst**. De feitenkaart is een genummerde lijst (F1, F2, F3, ...) van
alles wat wij met bron over dit bedrijf weten. Hij heeft drie delen:

```
FEITENKAART: de ENIGE toegestane bron van beweringen over deze klant
──────────────────────────────────────────────────────────────────────
F1  Wij werken met vier eigen dakdekkers in vaste dienst.    bron: gesprek
F2  Bij spoed zijn we binnen 24 uur ter plaatse.             bron: mjbdakservice.nl
F3  Een inspectie is gratis en u krijgt een fotorapport.     bron: klantantwoord

⛔ MAG JE NIET BEWEREN: de klant heeft dit expliciet ontkend of verboden:
    • Wij geven geen garantie op werk van derden.   (bron: klantantwoord)
    Schrijf hier niet over. Ook niet impliciet, ook niet als vraag in een FAQ,
    ook niet met een slag om de arm.

ACHTERGROND: GEEN BRON. Dit is losse sitetekst en onderzoek, bedoeld om de
context en de toon te begrijpen. Het heeft met opzet GEEN F-nummer: je mag er
geen enkele bewering op baseren.
    ~ De site noemt PIR, Resol, glaswol en EPS als isolatiematerialen.
──────────────────────────────────────────────────────────────────────
REGELS BIJ DEZE KAART:
1. Elke feitelijke bewering over deze klant moet herleidbaar zijn tot een F-nummer.
2. Staat iets niet op de kaart, dan schrijf je er niet over. Niet gladstrijken,
   niet aannemen, niet 'logisch invullen'.
```

De drie delen doen elk iets anders. **Bruikbaar** mag geciteerd worden. **Verboden** is een actief
verbod, want de ondernemer heeft "nee" geantwoord, en zonder dat onderscheid gaat het model
redeneren dat het waarschijnlijk toch wel zo zal zijn. **Achtergrond** is er om de toon te snappen
en heeft met opzet geen nummer, zodat er niets op gebaseerd kan worden.

Het vangnet: het model moet in het veld `claims` per concrete bewering het F-nummer opgeven **plus
het letterlijke fragment uit dat feit** dat de bewering dekt. Code controleert daarna of dat
fragment er echt in staat. Een nummer noemen zonder de dekkende zin te kunnen aanwijzen telt niet
als onderbouwing.

---

## 3. De pijplijn in één overzicht

Elf soorten AI-aanroepen, plus twee poorten en een reeks controles die gratis zijn omdat ze in code
staan. Zeven daarvan draaien altijd per pagina: het onderzoek, het contract, het schrijven en de vier
beoordelaars. De reparatie draait ook per pagina, maar alleen als het nodig is, en dan tot drie keer.
De overige drie draaien per batch of per analyse en worden dus over meerdere pagina's gedeeld.

| # | Stap | Soort | Model | Denkvermogen | Web | Kosten |
|---|------|-------|-------|--------------|-----|--------|
|  | Aanbeveling uit het rapport | AI (per analyse) | Luna | low | nee | $0,0067 |
| 1 | `fact_atomise`, feiten uit de site halen | AI (per batch) | Luna | none | nee | $0,0016 |
| 2 | `item_dossier`, onderzoek per pagina | AI | Luna | low | **ja** | $0,0161 |
| 3 | `content_contract`, de inhoudsopgave | AI | Luna | low | nee | $0,0064 |
| 4 | `claim_audit`, wat moet bewezen worden | AI (per batch) | Luna | none | nee | $0,0043 |
|  | **Vragenlijst aan de ondernemer** | mens |  |  |  |  |
|  | **Inputpoort**: mag deze pagina geschreven worden? | code |  |  |  | gratis |
| 5 | `source_analysis`, waarom won de concurrent | AI (per analyse) | Luna | low | nee | $0,0020 |
| 5b | **`writer_brief`, de schrijfopdracht** | AI | Luna | low | nee | ongeveer $0,01 |
| 6 | **`content_draft`, de pagina schrijven** | AI | **Terra** | medium | soms | **$0,113** |
| 7 | `content_critique`, redactie | AI | Luna | medium | nee | $0,0019 |
| 8 | `content_factuality`, feitelijkheid | AI | Luna | medium | nee | $0,0046 |
| 9 | `content_citability`, volledigheid | AI | Luna | medium | nee | $0,0036 |
| 10 | `content_craft`, vakmanschap | AI | Luna | medium | nee | $0,0019 |
|  | **De deterministische controles** | code |  |  |  | gratis |
|  | **Weging**: score, zekerheid, oordeel | code |  |  |  | gratis |
| 11 | `content_revise`, gerichte reparatie (max 3x) | AI | **Terra** | medium | nee | **$0,083** |
| 12 | `version_compare`, welke versie is beter (alleen bij een gelijkspel) | AI | Luna | medium | nee | ongeveer $0,004 |

Stap 7 tot en met 10 draaien **parallel**, dus ze kosten samen evenveel tijd als de traagste.

De verhouding is het punt: één pagina schrijven kost meer dan alle andere stappen bij elkaar. Alle
vier de beoordelaars samen kosten $0,0119 per keuring. Eén vermeden reparatieronde betaalt zeven
volledige keuringen.

---

## 4. Waar de opdracht vandaan komt

Voordat er iets geschreven wordt, ligt er een aanbeveling. Die komt uit de meting: dertig vragen
per ronde worden aan een AI-assistent gesteld, en waar het merk niet genoemd wordt ligt een gat.
Het rapportmodel maakt daar aanbevelingen van, en elke aanbeveling draagt vier dingen:

- een **titel** ("Maak een volledige spoedpagina voor daklekkage in Zutphen")
- een **type**: `article`, `landing`, `faq` of `comparison`
- de **doelvragen**: de letterlijke vragen waarop de assistent het merk nu niet noemt
- de **`targetIntent`**: wie de lezer is

Dat laatste veld is recent aangescherpt, en de instructie eraan luidt:

> In `targetIntent` beschrijf je de LEZER van die pagina in één zin, in deze vorm: welk type persoon
> het is, welk probleem die persoon heeft, en welke beslissing hij daarna moet nemen. Dus niet
> "Daklekkage Apeldoorn" of "informatie over dakisolatie", maar "iemand met water door zijn plafond
> die vandaag hulp zoekt en wil weten wat een reparatie kost". Een onderwerp is geen lezer. Laat dit
> veld nooit leeg en schrijf er nooit "onbekend" in: kun je de lezer niet benoemen, doe dan geen
> aanbeveling.

⚠️ **Dit was het grootste gebrek van de vorige ronde.** Bij acht van de twaalf pagina's van
3 september was dit veld leeg. De externe copywriter die die twaalf teksten beoordeelde noemde
precies dat zijn belangrijkste punt van drie.

---

## 5. De vier voorbereidende aanroepen

### Aanroep 1: `fact_atomise`, feiten uit de eigen site halen

**Wat het doet.** De crawl heeft 1.500 tekens per pagina bewaard. Deze stap selecteert daaruit de
zinnen die een concreet, natrekbaar feit over het bedrijf bevatten. Hij schrijft niets en vat niets
samen: hij **selecteert zinnen**.

**Kern van de prompt:**

> Je haalt CONTROLEERBARE FEITEN uit de eigen website van een bedrijf. Je schrijft niets, je vat
> niets samen, je legt niets uit: je selecteert zinnen.
> (1) Neem elke zin LETTERLIJK over uit de aangeleverde tekst, teken voor teken, zonder inkorten,
> samenvatten, corrigeren of aanvullen. Een zin die je hebt bijgeschaafd wordt weggegooid door de
> controle die hierachter zit, dus dat kost alleen maar een feit.
> (2) Kies alleen zinnen met iets HARDS erin: een aantal, een bedrag, een plaats, een naam, een
> termijn, een openingstijd, een merk, een dienst die het bedrijf aanbiedt, of een expliciete
> voorwaarde. Sfeerzinnen ("wij staan voor je klaar") zijn geen feit.

**Het vangnet.** `verifyAtoms()` controleert of elke teruggegeven zin **letterlijk** in de
brontekst voorkomt. Een bijgeschaafde zin vervalt. Dat is met opzet hard: zou het model hier mogen
samenvatten, dan is de citaatplicht verderop uitgehold op precies de plek waar hij het hardst nodig
is.

### Aanroep 2: `item_dossier`, onderzoek voor deze ene pagina

**Wat het doet.** Uitzoeken wat er inhoudelijk op deze pagina moet staan. Dit is de enige
voorbereidende stap met een echte web-zoekactie.

**Waarom per pagina en niet per onderwerp.** Eerder werd er onderzoek gedaan per cluster, en de
aanbevelingen binnen één cluster lopen sterk uiteen. Clusterbrede input stuurde specifieke pagina's
vier keer aantoonbaar de verkeerde kant op.

**Kern van de prompt:**

> Je bereidt ÉÉN webpagina voor. Je schrijft die pagina NIET; je brengt in kaart wat erop moet staan
> om compleet te zijn.
> (1) DEELVRAGEN. Welke vragen wil iemand die dit zoekt beantwoord zien, in de volgorde waarin hij
> ze stelt? Denk aan wat een lezer echt bezighoudt: wat het kost, hoe lang het duurt, wat er wel en
> niet bij zit, waar hij op moet letten, wat er misgaat als hij het verkeerd aanpakt. **Niet de
> onderwerpen die een marketeer zou noemen, maar de vragen die een mens stelt.**
> (2) VERVOLGVRAGEN. Wat vraagt diezelfde lezer daarna, als de pagina zijn werk goed doet?
> (3) TWIJFELS. Welke bezwaren of zorgen moet een pagina hierover wegnemen?
> (4) UITLEG. Welke vaktermen, keurmerken, normen of wettelijke begrippen komen in dit onderwerp
> voor die een lezer zonder vakkennis niet kent? ZOEK die op en geef per term de algemeen geldende
> uitleg, de URL waar je hem vond, en een LETTERLIJK fragment van die pagina dat de uitleg dekt.
>
> HARDE REGELS: (a) alles gaat over het ONDERWERP in het algemeen, nooit over een specifiek bedrijf.
> (b) Noem GEEN bedrijfsnamen. (c) Een uitleg zonder werkende bron-URL en zonder letterlijk citaat is
> waardeloos. (d) **Een lege lijst is een geldig antwoord. Vijf verzonnen deelvragen zijn slechter
> dan drie echte.**

**Het vangnet.** `verifyExplainers()` haalt elke opgegeven bron-URL op en controleert of het citaat
er echt op staat. Uitleg die die controle niet haalt, vervalt.

### Aanroep 3: `content_contract`, de inhoudsopgave

**Wat het doet.** Van het dossier één concreet plan maken: welke secties, in welke volgorde, welke
vraag beantwoordt elke sectie, hoe lang wordt hij, en welk F-nummer hoort erbij.

Dit is de spil van het hele ontwerp: **dezelfde lijst die de opdracht geeft, rekent hem achteraf na.**
De schrijver krijgt het contract als opdracht, en `content-coverage.ts` loopt daarna sectie voor
sectie na of elke deelvraag beantwoord is.

**Kern van de prompt:**

> Je maakt de INHOUDSOPGAVE van één webpagina voor de eigen site van een ondernemer. Je schrijft de
> pagina niet.
> (1) OPENING. Formuleer het directe antwoord op de doelvraag in maximaal twee zinnen. Dit is het
> antwoord dat een AI-assistent moet kunnen overnemen: volledig, concreet, en te begrijpen zonder de
> rest van de pagina. Is de doelvraag een ja-of-nee-vraag, dan begint dit antwoord met ja of nee.
> (2) SECTIES. Maak per deelvraag één sectie: een kop, de ENE vraag die de sectie beantwoordt, wat
> erin moet, welke F-nummers erin thuishoren, en een richtlengte in woorden. Zet
> `needsBrandFact: true` als de sectie pas klopt met een uitspraak over DIT bedrijf.
> (6) BELANG PER SECTIE. Zet `importance` op "kern" als de pagina zijn doel niet bereikt zonder deze
> sectie. **Wees streng: hoogstens een derde van de secties is "kern".**
> (7) SUCCESCRITERIUM. Waaraan zie je dat de sectie geslaagd is, zo concreet mogelijk: "er staat een
> bedrag of een bandbreedte" is bruikbaar, "de sectie is goed" niet.
>
> (d) Plan de pagina die de doelvraag ECHT beantwoordt, niet de pagina die je toevallig kunt
> onderbouwen. Ontbreekt er een feit, plan de sectie dan toch en markeer hem als merkgebonden.

⚠️ Die laatste regel is bewust omgedraaid. Hij zei eerder "plan geen sectie die je niet kunt
waarmaken", en daarmee verlaagde de app haar ambitie tot wat ze toevallig al wist. Het gat werd
stilzwijgend een dunnere pagina in plaats van een vraag aan de ondernemer. In een gemeten ronde
rustten 18 van de 25 secties van één pagina op geen enkel feit over het bedrijf, en de app schreef
ze alle 25 toch.

**Waarom de richtlengte per sectie staat en niet per pagina.** Er ging al een bandbreedte per
paginatype mee ("400 tot 700 woorden"). Die stuurt niets: het model verdeelt hem zoals het uitkomt,
en de gemeten uitkomst was 548 woorden gemiddeld, onder de ondergrens van drie van de vier
paginatypes. Per sectie afspreken doet dat wel, en maakt meetbaar welke sectie te dun bleef.

### Aanroep 4: `claim_audit`, wat moet er bewezen worden

**Wat het doet.** Het contract naast de feitenkaart leggen en per bewering vaststellen: kunnen we
dit hard maken, ja of nee? Wat niet gedekt is, wordt een **vraag aan de ondernemer**.

**Kern van de prompt:**

> Je bent een kritische redacteur die vóór het schrijven controleert of een pagina waargemaakt kan
> worden. Je schrijft GEEN tekst.
> (1) Verzin GEEN beweringen die je aannemelijk vindt. Noem alleen wat de pagina echt nodig heeft.
> (2) Markeer een bewering ALLEEN als gedekt wanneer je een concreet F-nummer kunt noemen EN in
> `supportQuote` het letterlijke fragment overneemt. Bij twijfel: niet gedekt. **Een vraag te veel
> stellen kost de klant dertig seconden; een verzonnen feit kost hem zijn geloofwaardigheid.**
> (4) Voor elke ONGEDEKTE bewering formuleer je de vraag die het gat dicht. Die vraag moet in
> maximaal 30 seconden te beantwoorden zijn zonder iets op te zoeken, en gaat over ÉÉN feit. Niet
> "welke voorwaarden en opties biedt u?" maar "zit pechhulp in het maandbedrag?".
> (7b) `claimClass` zegt WIE deze bewering kan bevestigen. "bedrijfsspecifiek" = alleen deze
> ondernemer weet dit: hier stellen wij een vraag over. "controleerbaar" = feitelijk na te gaan maar
> niet bij hem: hier hoort een bron bij. "algemeen" = vakkennis die voor elke aanbieder geldt.
> **Stel NOOIT een vraag over een "algemene" bewering.**

**Het vangnet.** Het model mag zichzelf niet vrijpleiten. Zegt het `supported: true` maar wijst het
F-nummer nergens naar op de kaart, dan rekent code de bewering alsnog als onbewezen.

### Tussenstap: de vragenlijst en de inputpoort

De onbeantwoorde beweringen worden een korte vragenlijst voor de ondernemer. Daarna staat er een
poort, en die kost niets:

| Onderbouwingsgraad | Wat er gebeurt |
|---|---|
| 70% of hoger | schrijven, openstaande vragen zijn winst voor later |
| 40% tot 70% | schrijven mag, met een waarschuwing die de secties noemt die eruit vallen |
| onder 40% | niet schrijven, tenzij de klant er bewust voor kiest |
| **geen lezer** | niet schrijven |

Die laatste regel is nieuw en staat vóór alle andere: is er geen `targetIntent` en geen enkele
gemeten vraag, dan is er niemand om voor te schrijven. De melding noemt in dezelfde zin de drie
uitwegen, want een poort die je niet kunt passeren is een muur.

De grenzen 40 en 70 zijn **gekozen, niet geijkt**. Ze worden per pagina bewaard naast de
uiteindelijke kwaliteitsscore, zodat ze na genoeg echte pagina's op data bijgesteld kunnen worden.

---

## 5b. De schrijfopdracht: de redactionele keuze vóór het schrijven

**Nieuw op 4 september 2026, en het directe antwoord op de belangrijkste kritiek van beide experts.**
Hun samenvatting: de pijplijn is goed in het voorkomen van slechte tekst en nog niet goed in het
veroorzaken van uitstekende tekst. De schrijver kreeg achttien blokken die allemaal dezelfde status
hadden, en niets in de keten koos welke zes daarvan er voor DEZE pagina toe deden.

Deze stap doet geen onderzoek en voegt niets toe. Hij vat ook niet samen, want een samenvatting is
een negentiende blok en dus precies het probleem. Hij KIEST, uit materiaal dat er al ligt, en levert
negen velden:

| Veld | Wat erin staat |
|---|---|
| de lezer | één concrete persoon in één concrete situatie |
| de hoofdvraag | de ENE vraag die deze pagina beantwoordt |
| het kernantwoord | wat de lezer moet begrijpen als hij alleen de eerste alinea leest |
| waarom deze pagina bestaat | bij welke vraag een assistent dit bedrijf nu niet noemt |
| de kernfeiten | drie tot vijf F-nummers waar deze pagina op staat of valt |
| **de keuzeredenen** | **waarom juist deze lezer dit bedrijf zou kiezen, met het F-nummer erbij** |
| de eigen woorden | wat alleen deze ondernemer kan zeggen |
| wat er in moet, wat niet | de prioriteiten en de valkuilen van deze pagina |
| wat blijft hangen | de ene gedachte na het lezen |

Het vetgedrukte veld is de vraag waarmee de externe copywriter op 3 september zijn hele beoordeling
samenvatte, en er was tot vandaag geen enkele stap in de pijplijn die hem stelde.

**De feitenkaart blijft compleet.** Beide experts raadden af om de schrijver minder informatie te
geven; wat eroverheen komt is een hiërarchie. De opdracht staat bovenaan de prompt en zegt welke
F-nummers deze pagina dragen.

**Het vangnet.** Een opdracht die het model negeert is een duur promptblok dat niets stuurt, dus code
rekent na of hij is uitgevoerd: komen de gekozen kernfeiten terug in de beweringen of de
bewijspunten, staat het kernantwoord in de eerste alinea, en staat de keuzereden in de eerste twintig
procent van de tekst (regel 4 van de copywriter). Een opdracht met één leeg veld vervalt in zijn
geheel, en dan schrijft de pijplijn precies zoals hij het vóór deze stap deed.

---

## 6. Aanroep 6: de pagina schrijven

Dit is de dure aanroep, en de enige waarvan de klant de uitkomst letterlijk publiceert.

### 6.1 De systeemprompt: elf harde regels

De systeemprompt is één blok van ongeveer 700 woorden. Hier staat hij, ingekort waar hij zichzelf
herhaalt, maar met alle elf regels erin.

> Je bent een ervaren contentschrijver die pagina's schrijft voor de EIGEN website van een lokale
> ondernemer, klaar om te publiceren. On-brand, Nederlands.
>
> **(1)** Noem NOOIT concurrenten of andere bedrijven bij naam: dit is de site van de klant zelf.
>
> **(2)** De FEITENKAART is de ENIGE toegestane bron van concrete beweringen over dit bedrijf. Elke
> feitelijke bewering (prijzen, cijfers, voorwaarden, wat er wel of niet bij zit, openingstijden,
> keurmerken, aantallen, namen van vestigingen) moet herleidbaar zijn tot een F-nummer. Staat het er
> niet op, dan schrijf je er NIET over. Niet gladstrijken, niet aannemen, niet "logisch invullen",
> ook niet voorzichtig geformuleerd of als vraag in een FAQ. Lever in `claims` per bewering het
> F-nummer PLUS het letterlijke fragment dat hem dekt. Kun je die zin niet letterlijk aanwijzen, dan
> mag je de bewering niet doen.
>
> **(3)** Schrijf in dezelfde stijl als de meegegeven voorbeeldzinnen van de site.
>
> **(4)** De EERSTE ZIN gaat over de lezer: wat hij meemaakt, waar hij mee zit, wat hij wil weten.
> NOOIT beginnen met de bedrijfsnaam en nooit met "Ja" als er geen vraag boven staat. Beantwoord de
> DOELVRAAG daarna volledig, nog in diezelfde eerste alinea: een AI die een antwoord zoekt, leest de
> opwarmer niet uit.
>
> **(5)** In die eerste alinea en in de eerste zin van elke sectie noem je het BEDRIJF EXPLICIET bij
> naam, want dat zijn de zinnen die een AI-assistent oppakt. In de RÉST van de tekst schrijf je
> gewoon in de wij-vorm, zoals een ondernemer op zijn eigen site praat: "wij komen binnen 24 uur" in
> plaats van "[Bedrijfsnaam] kan binnen 24 uur ter plaatse zijn". Schrijf ook nooit over "de klant"
> in de derde persoon: de lezer IS de klant.
>
> **(6)** Zorg dat elke sectie minstens één zin bevat die LOSSTAAND te begrijpen is, zonder de rest
> van de pagina. Dat is de eenheid waarin een AI-assistent knipt.
>
> **(7)** Beantwoord naast de hoofdvraag ook de logische vervolgvragen.
>
> **(8)** Voeg geldige schema.org JSON-LD toe. Vermijd generieke AI-slop en clichés.
>
> **(9)** INTERPUNCTIE. Gebruik GEEN gedachtestreepjes en GEEN schuine streep tussen twee woorden.
> Dat zijn de twee leestekens waaraan een lezer AI-tekst herkent, en deze pagina verschijnt onder de
> naam van de klant zelf.
>
> **(10)** HET CONTRACT. Krijg je een CONTRACT met secties, dan is dat geen suggestie maar de
> inhoudsopgave van deze pagina. Elke sectie komt erop, in die volgorde. **Wij rekenen dat na,
> sectie voor sectie.** Je mag beter schrijven dan het contract vraagt; je mag er niets uit weglaten.
>
> **(11)** ALGEMENE UITLEG. Onder "GECONTROLEERDE ALGEMENE UITLEG" staat uitleg waarvan wij de bron
> hebben nagerekend. Die mag je gebruiken en hoort vaak juist op de pagina. Hij gaat over het
> ONDERWERP en nooit over dit bedrijf, dus er hoort geen F-nummer bij.

⚠️ **Regel 4 en 5 zijn recent begrensd, en dat is leerzaam.** Ze stonden er absoluut: noem het merk
bij naam, want een assistent die "wij" leest weet niet wie hij moet noemen. Dat is waar, en het
kostte de complete merkstem. Over twaalf pagina's stond de merknaam 164 keer in de derde persoon
tegenover twee keer "wij", allebei in een kop en nul keer in een zin. Elf van de twaalf openingen
begon bij het bedrijf. Het resultaat las als een productbeschrijving die iemand anders over dit
bedrijf had geschreven. De regel geldt nu voor de **citeerbare** zinnen, niet voor elke zin.

### 6.2 De gebruikersprompt: achttien blokken

De opdracht zelf is een stapel blokken. Lege blokken vallen weg. In volgorde:

| # | Blok | Wat erin staat |
|---|---|---|
| 1 | Bedrijf, website, cluster | naam, url, het bredere onderwerp, uitdrukkelijk als achtergrond |
| 2 | Branche en tone of voice | vrij tekstveld plus vier schuiven (formaliteit, energie, complexiteit, humor) |
| 3 | **Aanspreekvorm** | "je" of "u", altijd expliciet gekozen |
| 4 | Diensten en producten | uit het merkprofiel |
| 5 | **Verboden woorden** | gesloten lijst, zelfde toon als de feitenkaart |
| 6 | Regels en wetten | compliance-aantekeningen van de klant |
| 7 | Waardeproposities | waarom klanten kiezen |
| 8 | **Bezwaren uit het verkoopgesprek** | wat klanten tegenwerpen, plus het weerwoord |
| 9 | **Klantinstructies** | wat de ondernemer heeft gevráágd, apart van wat hij vertelde |
| 10 | **De feitenkaart** | zie paragraaf 2 |
| 11 | **Citeerbare klantantwoorden** | zijn eigen woorden, mét de reden erachter |
| 12 | **Bewijspunten** | de opdracht om feiten om te zetten naar betekenis |
| 13 | **Adviestoon** | dit is een ondernemerssite, geen consumentengids |
| 14 | **Het contract** | de inhoudsopgave |
| 15 | Geverifieerde algemene uitleg | vaktermen met nagerekende bron |
| 16 | **Het paginaplan** | per bewering: gedekt, weerlegd of geen bron |
| 17 | Onbeantwoord gebleven | waar naar gevraagd is zonder antwoord |
| 18 | Stijlvoorbeelden, doelvragen, het winnende antwoord, de bestaande pagina | context |

De vetgedrukte blokken zijn recent toegevoegd of aangescherpt naar aanleiding van de
copywriterbeoordeling. Vier ervan verdienen toelichting.

**Blok 9, klantinstructies.** Een antwoord als "zet er geen adres bij, verwijs naar de
contactpagina" kwam binnen als gewoon feit op de kaart, tussen de andere feiten. Het model leest
daar een mededeling waar een opdracht staat, en twee van de vier pagina's die dit antwoord kregen
zetten er tóch een adres op. Nu staat het bij de verboden:

> WAT DE KLANT ZELF HEEFT GEVRAAGD. Dit zijn geen feiten maar opdrachten, en de ondernemer heeft ze
> woordelijk zo opgeschreven. Volg ze precies, ook als je denkt dat de pagina er beter van wordt
> zonder.

**Blok 11, citeerbare klantantwoorden.** Op vier van de twaalf pagina's werd een letterlijk
klantantwoord omgezet in een procedurezin, waarbij telkens **de reden** wegviel. De reden was het
overtuigende deel:

```
Klant:  "Doorwerken over houtrot heen doen we niet, ook niet als de klant erom
         vraagt, want dan kunnen we onze garantie op het werk niet waarmaken."

Pagina: "Wordt tijdens isolatiewerk schade gevonden, dan legt MJB Dakservice het
         werk stil, maakt foto's en meldt eerst de herstelkosten."
```

Het feit blijft, de motivering verdwijnt, en de zin gaat naar de derde persoon. Precies het deel dat
geen concurrent kan kopiëren, is eruit gehaald. De code zoekt nu zelf naar klantantwoorden die
minstens vijftien woorden tellen én een motivering bevatten ("want", "omdat", "daarom", "zodat"), en
biedt ze apart aan:

> IN DE WOORDEN VAN DE ONDERNEMER. Dit heeft hij zelf gezegd, inclusief de reden erachter. Neem er
> minstens één vrijwel letterlijk over, mét die reden: dat is het deel dat geen concurrent kan
> kopiëren. Maak er geen procedurezin van, want dan blijft het feit staan en verdwijnt precies
> datgene wat overtuigt.

**Blok 12, bewijspunten.** Dit is de tweede aanbeveling van de copywriter, letterlijk vertaald naar
een promptblok en een verplicht uitvoerveld:

> BEWIJSPUNTEN. Kies 3 tot 5 feiten van de kaart die voor DEZE lezer het meeste betekenen, en schrijf
> per feit één zin die zegt wat hij eraan heeft. Niet het feit zelf herhalen, maar het gevolg ervan:
> - "vaste ploeg van vier eigen dakdekkers" wordt "u weet wie er op uw dak komt"
> - "extra werk alleen na toestemming" wordt "geen onverwachte werkzaamheden zonder dat u eerst
>   akkoord geeft"
> - "gratis inspectie met fotorapport" wordt "u ziet zelf wat we aantreffen en wat er eerst moet
>   gebeuren"
>
> Die zinnen zet je ook echt IN de tekst, op de plek waar de lezer dat argument nodig heeft, en je
> vult ze daarnaast in `proofPoints` met het F-nummer erbij. **Kies er niet meer dan vijf: van twintig
> feiten er twintig noemen is geen keuze maken.**

**Blok 13, adviestoon.** Op drie pagina's sloeg de voorzichtigheid door tot tekst die tegen de klant
werkte: een checklist om dakdekkers te vergelijken, en twee keer de oproep om de registratie van de
eigen therapeut na te trekken bij de beroepsvereniging. Uitstekende consumentenvoorlichting, en de
verkeerde pagina ervoor.

> DE TOON. Dit is de site van de ondernemer zelf, geen consumentengids.
> - Schrijf niet wat de lezer moet navragen, controleren of laten vastleggen, maar wat dit bedrijf
>   doet. "Vraag vooraf naar de prijs" wordt "u hoort de prijs voordat wij beginnen".
> - Zet de lezer NOOIT aan om aanbieders te vergelijken of om de papieren van dit bedrijf na te
>   trekken. Geen checklists om een vakman mee te beoordelen, geen links naar een beroepsregister.
>
> Voorzichtig blijven mag waar het moet, zeker in de zorg, maar laat een voorbehoud nooit de
> dominante stem van de pagina worden.

**De lezersopdracht** staat op de plek waar vroeger een kaal veld "Doel:" stond:

> DE LEZER VAN DEZE PAGINA. Schrijf voor deze ene persoon en voor niemand anders: [de zin]
>
> Begin de pagina bij de situatie van die persoon, niet bij het bedrijf en niet bij het onderwerp.
> Alles wat hij op dit moment niet nodig heeft om zijn volgende stap te zetten, laat je weg, ook als
> het klopt en ook als het op de feitenkaart staat.

Is de opdracht een onderwerp in plaats van een persoon, dan komt er een regel bij die het model
vraagt om zelf eerst een lezer te bedenken voordat het schrijft.

### 6.3 Wat de aanroep teruggeeft

Een strak schema, geen vrije tekst: titel, metatitel (max 60 tekens), metabeschrijving (max 160),
`bodyMarkdown`, een FAQ-lijst, schema.org JSON-LD, plus twee administratieve velden die het
verzinnen duur maken:

- **`claims`**: per bewering het F-nummer én het letterlijke dekkende fragment
- **`proofPoints`**: per gekozen feit het F-nummer én de betekeniszin voor de lezer

### 6.4 Doellengte per type

| Type | Woorden | Waarom |
|---|---|---|
| `faq` | 250 tot 500 | korte inleiding, het werk zit in de vraag-antwoordparen |
| `landing` | 400 tot 700 | overtuigen kost ruimte, uitweiden niet |
| `article` | 700 tot 1200 | het enige type waar diepte echt telt |
| `comparison` | 500 tot 900 | vergelijkbaar met een landingspagina, met meer ruimte voor de afweging |

---

## 7. Het beoordelaarspanel: vier onafhankelijke oordelen

### 7.1 Waarom vier en niet één

Er was één beoordelaar die alles tegelijk deed: redactie, harde regels en de GEO-criteria. Op het
goedkoopste model in zijn goedkoopste stand, voor het oordeel over het enige dat de klant letterlijk
publiceert. In één ronde gaven die zelfbeoordeelde criteria **100 van de 100 op alle tien de
pagina's**, ook op de pagina waarvan diezelfde aanroep in zijn eigen verbeterpunten schreef dat de
hoofdvraag niet beantwoord werd. Eén aanroep, twee tegenstrijdige oordelen, en het cijfer koos de
gunstige.

Nu zijn het er vier, parallel, elk met één opdracht en elk met een eigen uitvoerschema.

### 7.2 Beoordelaar 1: redactie

> Je bent een strenge eindredacteur én GEO-specialist.
> REDACTIONEEL: scoor 0-100 op begint-met-het-directe-antwoord, on-brand, concreet-waar-mogelijk
> (zonder verzinsels), scanbaar, en waardevol (geen AI-slop).
> HARDE REGELS: zet `followsRules` op false als de tekst een concurrent bij naam noemt, feiten lijkt
> te verzinnen, of niet met het directe antwoord begint.
> GEO: zou een AI-assistent deze pagina CITEREN? Beoordeel elk criterium streng en apart. **Bij
> twijfel: false. Een te milde beoordeling levert een pagina op die niemand citeert.**
> Noem in elk verbeterpunt ALTIJD de kop van de sectie waar het op slaat, zodat er gericht
> gerepareerd kan worden.

### 7.3 Beoordelaar 2: feitelijkheid

Krijgt de feitenkaart mee en beoordeelt de schrijfstijl uitdrukkelijk niet.

> OPDRACHT: noem elke zin die een feitelijke uitspraak doet over DIT BEDRIJF zonder dat een feit op
> de kaart hem dekt. Noem per zin de kop van de sectie waarin hij staat.
> Noem daarnaast elke ALGEMENE uitleg die als belofte van dit bedrijf gelezen kan worden. "Een APK
> duurt meestal een uur" is algemene uitleg; "bij ons duurt een APK een uur" is een belofte.
> HARDE REGELS: **bij twijfel noem je de zin. Een terechte melding kost de ondernemer dertig seconden
> nakijken; een gemiste verzonnen zin kost hem zijn geloofwaardigheid.**

### 7.4 Beoordelaar 3: citeerbaarheid en volledigheid

Krijgt het contract mee, inclusief het doel, de doelgroep en het succescriterium per sectie.

> (1) Loop elke deelvraag langs en zeg of de pagina hem echt beantwoordt. Zo ja: geef de zin die het
> antwoord geeft. **Een sectie die het onderwerp aanstipt zonder de vraag te beantwoorden telt als
> NIET beantwoord.**
> (2) Noem de vragen die een lezer na deze pagina nog overhoudt. **Dit is het belangrijkste deel van
> je werk: hier komt uit of de pagina onaf aanvoelt.**
> HARDE REGEL: beoordeel alleen wat er staat. Verzin geen ontbrekende feiten; als een antwoord
> ontbreekt omdat het feit ontbreekt, is dat precies wat je moet melden.

### 7.5 Beoordelaar 4: vakmanschap

Dit is de beoordelaar die het dichtst bij uw werk staat, en de enige die meet wat de opdracht echt
vraagt. Hij scoort zeven punten, **elk met de letterlijke zin uit de pagina waarop het cijfer rust**.

> Je bent een ervaren copywriter die het werk van een collega beoordeelt. Je herschrijft niets en je
> controleert geen feiten: dat doen anderen. Je beoordeelt of dit de pagina is die een goede
> copywriter voor DEZE ondernemer geschreven zou hebben.
>
> **(1) SPECIFICITEIT**: gaat deze pagina over dit bedrijf, of zou hij op de site van elke concurrent
> kunnen staan? Dit is het zwaarste punt. Een pagina vol algemene uitleg scoort hier laag, ook als
> alles klopt.
> **(2) EXPERTISE**: laat de tekst zien dat de schrijver het vak kent, of somt hij op wat iedereen weet?
> **(3) DIEPGANG**: gaat de pagina verder dan de oppervlakte?
> **(4) ORIGINALITEIT**: zegt de pagina iets eigens, of is het het bekende verhaal in andere woorden?
> **(5) TOON**: klinkt de tekst zoals dit bedrijf klinkt, gemeten aan de meegegeven stijlvoorbeelden?
> **(6) OVERTUIGING**: zet de pagina een lezer aan tot de volgende stap?
> **(7) HERKENNING**: begint de pagina bij een situatie die de lezer herkent, of bij het bedrijf en het
> onderwerp?
>
> BEOORDEEL STRENG. Een pagina die nergens de mist in gaat maar ook nergens iets toevoegt, scoort
> rond de 50 en niet rond de 80. Zinnen die de lezer opdragen iets na te vragen ("neem contact op
> voor de actuele prijs") zijn een teken van een LAGE score op specificiteit: een copywriter met
> genoeg informatie schrijft die zin niet.
>
> ZEG DAARNA of je deze tekst zonder aanpassing naar een klant zou sturen, en wat je als EERSTE zou
> veranderen, met de kop van de sectie waar dat op slaat. Eén punt, niet vijf: het punt dat het
> meeste oplevert.

**En dan staan er menselijke ijkpunten in.** Dit is nieuw en het is een direct antwoord op wat de
externe copywriter opleverde. De prompt bevat nu zijn oordelen, samengevat, om de cijfers op te
richten:

> IJKPUNTEN VAN EEN ECHTE COPYWRITER (over twaalf pagina's van 3 september 2026). Gebruik deze om je
> cijfers te richten, niet om ze te kopiëren:
>
> **LAAG** scoorden pagina's die juridisch dichtgetimmerd zijn ("een eerste beoordeling is een globale
> inschatting", "dit is geen persoonlijke voorspelling"), pagina's die de lezer huiswerk geven in
> plaats van antwoord ("vraag vooraf om een schriftelijke prijsopgave waarin ... zijn opgenomen"), en
> pagina's die administratief zijn waar ze eenvoudig moeten zijn ("een afspraakaanvraag is een
> verzoek om een moment in te plannen"). Een gratis aanbod dat als een risico klinkt, is het
> duidelijkste voorbeeld van een lage score: dat is de sterkste propositie die er is, en de tekst
> haalt hem onderuit.
>
> **HOOG** scoorden pagina's die de lezer een echte keuze helpen maken ("kan ik mijn oude dak isoleren
> zonder de pannen te vervangen") en pagina's die de schaamte of de twijfel van de lezer benoemen
> ("schaamte komt voor, maar maakt de klacht niet minder belangrijk").
>
> Zijn oordeel over de hele stapel: "de teksten weten wat het bedrijf doet en wat de lezer wil weten,
> maar nog onvoldoende waarom deze lezer dit bedrijf zou moeten kiezen." Dat is precies wat
> OVERTUIGING meet, en dat was met 2,6 van 5 zijn laagste cijfer.

### 7.6 Alle vier falen zacht

Valt een beoordelaar uit, dan mislukt de pagina niet. De **zekerheid** daalt. Dat is geen
versoepeling maar het tegendeel: eerder verdween een gevallen beoordelaar stilzwijgend en kon de
pagina daarna als gekeurd eindigen. Nu staat er een getal onder dat zegt hoeveel van de keuring echt
gedaan is.

---

## 8. Wat de code zelf natelt

Deze controles kosten geen AI-aanroep. Ze staan naast de beoordelaars, niet in plaats ervan, en ze
bestaan omdat een promptinstructie een intentie is. De lijst hieronder is de kern en niet
uitputtend.

**Over de opening en de vraag**
1. Komen de kernwoorden van de doelvraag terug in de eerste 400 tekens?
2. Is een ja-of-nee-vraag ook echt met ja of nee beantwoord?
3. Wordt er doorverwezen in plaats van geantwoord? ("kijk voor de actuele mogelijkheden op onze site")
4. Begint de eerste zin bij het bedrijf in plaats van bij de lezer?
5. Begint de pagina met "Ja" terwijl er geen vraag boven staat?
6. Staat de merknaam ergens in de eerste alinea? (dit is de tegenhanger van 4)

**Over de stem**
7. Spreekt het bedrijf ergens zelf, of praat de pagina alleen óver het bedrijf? Grens: boven
   1,5 merkvermelding per honderd woorden zonder één "wij" is het een productbeschrijving.
8. Is de aanspreekvorm consistent? Gemengd "je" en "u" **blokkeert**.
9. Schrijft de pagina over zijn eigen totstandkoming? ("de bestaande pagina noemt wel systemen, maar
   geen prijzen") Er staan ongeveer 42 verdachte formuleringen in vijf families.

**Over de inhoud**
10. Wordt elke sectie uit het contract gedekt? Drempel 85 procent.
11. Zijn er drie tot vijf bewijspunten, en staat de betekeniszin ook echt in de tekst?
12. Is er iets van de eigen woorden van de ondernemer blijven staan?
13. Staat er een verboden woord in? **Blokkeert.**
14. Gaat de pagina over een verboden onderwerp? **Blokkeert.**
15. Staat er een concurrent bij naam in? **Blokkeert.**
16. Staat er een adres op terwijl de klant erom vroeg dat niet te doen? **Blokkeert.**
17. Stuurt de pagina de bezoeker weg om de aanbieder zelf te controleren of te vergelijken?
    **Blokkeert.** Hier geldt geen drempel: één zin is er één te veel.

**Over de vorm**
18. Is meer dan de helft van de koppen een vraag? Dan is dit een vragenlijst en geen verhaal.
    (Geldt niet voor een FAQ, daar zijn vragen het punt.)
19. Adviseert de pagina in plaats van te helpen kiezen? Twee tellingen per honderd woorden:
    gebiedende zinnen ("Vraag ...", "Controleer ...") boven 0,6 en slappe formuleringen ("hangt af
    van", "doorgaans", "kan passend zijn") boven 0,8. De bevinding noemt sinds 4 september de sectie
    waar het huiswerk zich ophoopt, zodat de reparatie daar begint.

**Nieuw op 4 september 2026**
20. Is de SCHRIJFOPDRACHT uitgevoerd? Komen de gekozen kernfeiten terug in de beweringen of de
    bewijspunten, staat het kernantwoord in de eerste alinea, en staat de reden om juist dit bedrijf
    te kiezen in de eerste twintig procent van de tekst?
21. Herhaalt de FAQ onderaan de tekst erboven? Boven 0,7 woordoverlap telt een blok als herhaling,
    en herhaalt meer dan de helft van de blokken, dan is er een bevinding. Niet bij een FAQ-pagina.
22. Haalt elke sectie de helft van de richtlengte die het contract voor hém afsprak? De ondergrens
    stond op 25 woorden voor elke sectie, wat het contract ook plande.

Plus: leesbaarheid (gemiddelde zinslengte), gelijkenis met bestaande pagina's van hetzelfde merk, en
herhaling van hetzelfde rijtje feiten over meerdere pagina's van dezelfde ronde.

⚠️ **De drempels bij 7, 18 en 19 zijn geijkt op één ronde van twaalf pagina's.** De eerste poging bij
controle 19 stond op 0,35 en 0,5 en sloeg aan op elf van de twaalf. Een controle die overal afgaat is geen
signaal maar ruis. Ze staan nu waar de uitschieters beginnen, en ze zijn een startwaarde.

---

## 9. Hoe het cijfer tot stand komt

### 9.1 Drie getallen, niet één

Tot voor kort zat alles in één boolean. Die stond aan bij een te lage score, bij een verboden woord,
bij een onbewezen bewering én bij "er is nog een verbeterpunt open". Vier situaties met vier
gevolgen, samengeperst tot ja of nee.

Nu zijn het er drie:

```
Kwaliteit 91 · zekerheid 72 · één kritieke claim zonder bewijs → niet publiceren.
Kwaliteit 74 · zekerheid 95 · geen blokkade                     → publiceren mag.
```

De eerste pagina is beter geschreven en toch de gevaarlijkere.

### 9.2 Twaalf dimensies

Elke dimensie heeft minstens één bron die hem kan vullen, en een test rekent na dat dat zo blijft.
Een dimensie zonder bron is een cijfer dat iemand verzint.

| Dimensie | In de taal van de klant | Bron |
|---|---|---|
| feitelijkheid | klopt wat er staat | gemengd |
| bewijs | onderbouwd met jouw gegevens | deterministisch |
| relevantie | beantwoordt de vraag waarvoor de pagina bedoeld is | gemengd |
| specificiteit | gaat over jouw bedrijf en niet over de branche | gemengd |
| expertise | laat vakkennis zien | beoordeeld |
| volledigheid | behandelt alles wat erop hoort | gemengd |
| diepgang | gaat verder dan de oppervlakte | gemengd |
| originaliteit | zegt iets eigens in plaats van het bekende verhaal | gemengd |
| structuur | is overzichtelijk opgebouwd | deterministisch |
| leesbaarheid | leest prettig | deterministisch |
| toon | klinkt zoals jouw bedrijf klinkt | beoordeeld |
| overtuiging | zet een lezer aan tot contact | beoordeeld |

### 9.3 Vier profielen

Niet elke dimensie telt voor elk paginatype even zwaar. De reden staat in gemeten data: een FAQ die
0,7 procent van zijn beweringen kan herleiden is geen slechte FAQ, want er staan nauwelijks
beweringen over het bedrijf in. Diezelfde 0,7 op een dienstenpagina is een pagina die niets
waarmaakt.

| Type | Minimumtotaal | Minimale bewijsdekking | Waar de pagina op valt |
|---|---|---|---|
| `article` | 75 | 50% | volledigheid, diepgang, expertise |
| `faq` | 70 | niet van toepassing | relevantie, feitelijkheid, leesbaarheid |
| `landing` | 78 | 70% | specificiteit, feitelijkheid, overtuiging |
| `comparison` | 75 | 60% | volledigheid, eerlijkheid |

Vier dimensies tellen altijd mee, wat voor pagina het ook is: feitelijkheid, relevantie, structuur en
leesbaarheid. Geen enkele pagina mag onwaar zijn, langs de vraag heen praten, rommelig zijn of
onleesbaar.

### 9.4 Blokkeren is kort gehouden

Precies zes soorten bevindingen houden publicatie tegen: een verboden woord, een verboden onderwerp,
een concurrent bij naam, een kernbewering zonder bewijs, een bewering zonder bron, en een duplicaat.
Elke blokkade erbij is een pagina die niet uitgeleverd wordt. Alles wat "kan beter" is, is een
reparatiepunt.

En blokkeren is geen muur: het betekent dat ORBIT ENGINE de pagina niet klaar noemt. De klant kan hem
lezen, bewerken, kopiëren en zelf publiceren, en de melding noemt in dezelfde zin wat hij eraan kan
doen.

### 9.5 Zekerheid

Het gewogen deel van de dimensies dat een cijfer kreeg. Onder de 60 procent noemt de app een pagina
nooit zonder voorbehoud klaar: dan is het cijfer geen oordeel meer maar een steekproef.

---

## 10. Aanroep 11: de gerichte reparatie

**Wat er veranderde.** Het dure model schreef eerst de héle pagina opnieuw, één keer, met alle
bevindingen op één hoop. Dat mocht dus ook de passages aanraken die in ronde 1 juist goed waren, en
niets controleerde of de bevindingen daarna weg waren.

Nu krijgt het model **alleen de secties waarop een bevinding zit**, levert het alleen die secties
terug, en zet **code** ze op hun plek. De rest van de tekst kan het niet stukmaken, want het krijgt
hem niet in handen.

**De systeemprompt is een andere dan die van het schrijven**, want de opdracht is wezenlijk anders:

> Je REPAREERT gericht: je levert alleen de secties terug die je aanpast. Per sectie de bestaande KOP
> (letterlijk overnemen, zodat wij hem terug kunnen zetten op zijn plek) en de volledige nieuwe tekst.
> (2) De FEITENKAART is de ENIGE toegestane bron. Los een bevinding NOOIT op door een feit te
> verzinnen: kun je hem niet oplossen met wat er op de kaart staat, laat de passage dan weg of schrijf
> hem algemener.
> **(5) Raak niets aan wat niet in een bevinding genoemd wordt. Een sectie die je niet teruggeeft,
> blijft letterlijk staan, en dat is de bedoeling.**

**De opdracht is per sectie opgebouwd**, en dat is het verschil met een lijst losse zinnen:

```
▸ SECTIE "Wat kost een spoedreparatie?"
  PROBLEEM:
   - Deze vraag wordt op de pagina niet beantwoord.
  WAT ER MOET STAAN: er staat een bedrag of een bandbreedte
  TOEGESTAAN BEWIJS (gebruik ALLEEN dit, met het F-nummer erbij):
   F7: Voorrijkosten bij spoed bedragen 85 euro.
  DOE DIT: noem het voorrijtarief in de eerste zin van deze sectie.
```

Staat er voor een sectie geen bewijs, dan zegt de opdracht dat expliciet:

> ONTBREKEND BEWIJS: verzin hier niets bij. Kan de bewering niet verantwoord onderbouwd worden,
> nuanceer hem of laat hem weg. Schrijf ook NIET dat iets niet bekend is en vraag de lezer niet om
> contact op te nemen om het na te vragen: dat is geen antwoord.

**Hoogstens tien bevindingen per ronde.** Met 119 opdrachten over 25 secties raakt het model vrijwel
de hele pagina aan, en dan is er niets gerichts meer aan een sectiereparatie. De klant ziet wel de
volledige lijst; het model krijgt er per ronde een handvol.

**Hoogstens drie rondes.** Wat er na drie rondes nog staat is meestal een ontbrekend **feit**, en dat
lost geen herschrijving op maar een vraag aan de ondernemer.

**Na elke ronde draait exact dezelfde keuring opnieuw**, uit letterlijk dezelfde functie. Dat is
belangrijk: eerder hadden de eerste ronde en de reparatieronde elk hun eigen kopie van de controles,
en ze liepen uit elkaar. Een pagina die in één keer door de poort kwam werd op minder gecontroleerd
dan een die gerepareerd moest worden.

**Wordt de pagina er beter van?** Twee vergelijkingen moeten het allebei goedvinden voordat de
nieuwe versie de oude vervangt, en blokkades wegen zwaarder dan de score: een versie met één punt
minder en één blokkade minder is de betere.

**En sinds 4 september beslist bij een gelijkspel niet langer de ruis.** Liggen de twee scores binnen
drie punten van elkaar en zijn de blokkades gelijk, dan wordt er één goedkope vraag gesteld: welke
van deze twee zou een goede copywriter eerder naar de klant sturen? Drie punten is herleid uit de
enige meting die er is: 0,14 punt op een schaal van 1 tot 5 is 2,8 punt op de schaal van 0 tot 100.
Daarbuiten telt de score, en bij ongelijke blokkades beslist code. Gevolg: een reparatie die twee
punten lager scoort maar een concreet punt oplost, mag blijven staan.

---

## 11. Modellen, instellingen en kosten

### 11.1 De modellen

| Tier | Model | Prijs per 1M tokens | Waarvoor |
|---|---|---|---|
| `volume` | gpt-5.6-luna | $0,20 in / $1,20 uit | meten, classificeren |
| `quality` | gpt-5.6-luna | $0,20 in / $1,20 uit | onderzoeken, beoordelen |
| `content` | **gpt-5.6-terra** | $2 in / $12 uit | de content zelf schrijven |

De contenttier stond tot 4 september 2026 op `gpt-5.6-sol` ($5/$30). De reden voor de wissel: de
externe copywriter wees op de twaalf beoordeelde pagina's **geen enkele keer** iets aan wat een
groter model had opgelost. Geen redeneerfout, geen kromme opbouw, geen gemiste samenhang. Wat hij elf
keer aanwees was een ontbrekende lezer, een merk dat nergens zelf sprak, en een tekst zonder één
eigen woord van de ondernemer. Dat zijn gebreken in de **opdracht**, en daar zijn de blokken uit
paragraaf 6.2 voor gebouwd.

⚠️ **Dit is een beredeneerde aanname en geen meting.** Zie paragraaf 12.

### 11.2 Denkvermogen per soort werk

Temperatuur en denkvermogen sluiten elkaar uit: vanaf stand "low" weigert de API de temperatuur.

| Soort werk | Temperatuur | Denkvermogen | Waarom |
|---|---|---|---|
| classificeren | 0 | none | een oordeel dat 30x per ronde draait moet elke keer hetzelfde zijn |
| analyseren | 0,2 | low | denken loont, maar de aanroep moet binnen 145 seconden klaar zijn |
| vragen bedenken | 0,8 | none | variatie is het product; denken maakt de vragen juist op elkaar lijkend |
| **content schrijven** | vervalt | **medium** | "high" past niet binnen het tijdsbudget van 150 seconden |
| **beoordelen** | vervalt | **medium** | draait één keer per pagina, kost bijna niets |

De keuze voor `medium` bij het schrijven is een **tijdsbeperking en geen kwaliteitsoordeel**. Een
schrijfaanroep moet binnen 150 seconden klaar zijn, en een time-out kost het dubbele: de taak draait
opnieuw en de duurste tokens van de app worden twee keer betaald. Dit is een van de dingen waarover
wij graag uw mening horen.

### 11.3 Wat twaalf pagina's kostten

Gemeten over de ronde van 3 september 2026, twee klanten, twaalf pagina's, 328 aanroepen.

| Stap | Aanroepen | Toen (Sol) | Nu (Terra) |
|---|---|---|---|
| Schrijven | 12 | $3,09 | $1,35 |
| Reparatierondes | 16 | $3,33 | $1,33 |
| Itemdossier | 12 | $0,19 | $0,19 |
| Contract | 12 | $0,08 | $0,08 |
| De vier beoordelaars | 208 | $0,62 | $0,62 |
| Feiten, claim-audit, bronanalyse | 68 | $0,12 | $0,12 |
| **Totaal** | **328** | **$7,43** | **$3,69** |

Vier van de twaalf pagina's hadden een tweede of derde reparatieronde nodig. Op Sol kostten de
reparaties **meer dan het schrijven zelf**.

---

## 12. Wat wij zelf al weten dat er niet klopt

Dit hoofdstuk staat er omdat u anders tijd kwijt bent aan dingen die wij al gevonden hebben.

### 12.1 De beoordelaar heeft het juiste niveau en de verkeerde volgorde

Dit is de belangrijkste bevinding van de hele exercitie. Wij hebben de vakmanschapsbeoordelaar naast
het oordeel van een echte copywriter gelegd over dezelfde twaalf pagina's:

- Zijn **niveau** klopt: gemiddeld 0,14 punt van het menselijke oordeel af.
- Zijn **rangorde** klopt niet: de rangcorrelatie was **+0,29**, en van de vier pagina's die hij als
  zwakste aanwees waren er twee de verkeerde. De pagina die de copywriter gedeeld slechtste noemde
  ("absoluut niet versturen") stond bij onze beoordelaar op de derde plaats van boven.

Dat is precies het verkeerde soort fout, want de reparatiestap kiest op rangorde. De app repareert
dus de verkeerde pagina's. De app houdt dit getal nu zelf bij, en er staat een norm op van 0,6.

### 12.2 De negen mechanische patronen van de vorige ronde

Geteld over dezelfde twaalf pagina's, vóór de verbeteringen van 3 september:

| Wat | Gemeten |
|---|---|
| Pagina's zonder aangewezen lezer | 8 van de 12 |
| Openingen die bij het bedrijf beginnen | 11 van de 12 |
| Merknaam in de derde persoon | 164 keer, tegenover 2 keer "wij" |
| Koppen die een vraag zijn | 169 van de 228 (74%) |
| Zinnen die de lezer huiswerk geven | 72, waarvan 23 op één pagina |
| Slappe formuleringen | 120 op 13.605 woorden |
| Aanspreekvorm door elkaar | 95 keer "je" naast 81 keer "u" |
| Klantantwoorden waarvan de reden wegviel | 4 pagina's |
| Pagina's die de bezoeker wegsturen om te vergelijken | 3 |

Voor elk van deze negen staat er nu een promptblok én een controle in code. **Geen van beide is
geverifieerd tegen een nieuwe ronde.**

### 12.3 Wat er open staat

- **De nameting is niet gedaan.** Twaalf tellingen kunnen groen worden zonder dat de tekst beter
  wordt. De enige meting die telt is: dezelfde twaalf onderwerpen opnieuw laten schrijven en opnieuw
  blanco voorleggen aan dezelfde copywriter. Kosten: ongeveer $3,70 aan modelaanroepen plus een
  dagdeel van hem.
- **Zeven drempels rusten op één ronde van twaalf pagina's.** Ze zijn gekozen, niet geijkt.
- **De modelwissel is niet los te toetsen.** De nameting toetst nu twee dingen tegelijk: de twaalf
  verbeteringen én een goedkoper model. Valt het cijfer tegen, dan is niet meteen duidelijk welke van
  de twee de oorzaak is.
- **Het kalibratielab is leeg.** De app heeft een scherm waar echte mensen pagina's beoordelen, zodat
  onze beoordelaars daaraan geijkt kunnen worden. Er zijn twintig menselijke beoordelingen nodig en
  die zijn er nog niet.
- ~~De FAQ-blokken zijn niet aangeraakt.~~ **Opgelost op 4 september 2026** (optimalisatie 9): de
  overlap met de tekst erboven wordt nu gemeten. Wat nog niet gemeten is, is of er acht blokken
  onder een pagina moeten hangen.
- ~~De vraag van de copywriter is nog niet beantwoord.~~ **Gebouwd op 4 september 2026**
  (optimalisatie 6): de schrijfopdracht uit paragraaf 5b stelt de vraag expliciet, met het F-nummer
  erbij en met een controle die nameet of het antwoord in de eerste twintig procent van de tekst
  staat. ⚠️ Gebouwd is niet geverifieerd: of de teksten er beter van worden, weet niemand tot de
  nameting gedaan is.

---

## 13. Wat wij van u willen weten

**Aan de copywriter**

1. Klopt de volgorde? Wij onderzoeken, maken een inhoudsopgave, halen ontbrekende feiten op bij de
   ondernemer, en schrijven pas daarna. Is dat hoe u werkt, of ontbreekt er een stap?
2. De schrijfopdracht is achttien blokken lang. Is dat een goede briefing of een verstikkende?
3. Welke van onze instructies zou u schrappen omdat hij een goede tekst in de weg zit?
4. Wat vraagt u een ondernemer wat wij hem niet vragen?
5. De vraag die wij nog niet stellen: hoe zou u "waarom zou deze lezer dít bedrijf kiezen" tot een
   stap in dit proces maken?

**Aan de AI-expert**

1. Zeven aanroepen per pagina, waarvan er twee 73 procent van de kosten dragen. Klopt die verdeling?
2. Onze vier beoordelaars hebben het juiste niveau en de verkeerde rangorde. Hoe repareert u dat?
   Wij hebben nu menselijke ijkpunten in de prompt gezet; is dat de goede aanpak?
3. Het schrijven staat op denkvermogen "medium" wegens een tijdslimiet van 150 seconden. Is dat een
   verstandige afweging, of laten wij daar kwaliteit liggen?
4. Wij hebben net het schrijfmodel 2,5 keer goedkoper gemaakt op de aanname dat de zwakte in de
   opdracht zat en niet in het model. Deelt u die aanname?
5. Wij hebben overal een deterministisch vangnet naast een promptinstructie. Is dat overdreven, of
   juist nog niet ver genoeg doorgevoerd?

---

## Bijlage: waar het in de code staat

| Onderwerp | Bestand |
|---|---|
| De schrijfstap, alle prompts en blokken | `lib/pipeline/content.ts` |
| De vier beoordelaars | `lib/pipeline/content-panel.ts` |
| De keuring als geheel | `lib/pipeline/quality-run.ts` |
| De deterministische controles | `lib/pipeline/content-gate.ts` |
| Weging tot score, zekerheid en oordeel | `lib/pipeline/quality-score.ts` |
| De twaalf dimensies | `lib/pipeline/quality-dimensions.ts` |
| De vier profielen | `lib/pipeline/quality-profile.ts` |
| Onderzoek per pagina | `lib/pipeline/item-dossier.ts` |
| De inhoudsopgave | `lib/pipeline/content-contract.ts` |
| Feiten en de kaart | `lib/pipeline/factcard.ts`, `lib/pipeline/fact-atomise.ts` |
| De claim-audit en de vragenlijst | `lib/pipeline/briefing.ts` |
| De poort vóór het schrijven | `lib/content-input-gate.ts` |
| De reparatieopdracht | `lib/pipeline/quality-repair.ts` |
| Modellen en instellingen | `lib/openai/models.ts`, `lib/openai/sampling.ts` |
| De negen nieuwe controles | `lib/lezersopdracht.ts`, `lib/klantinstructies.ts`, `lib/pipeline/bewijspunten.ts`, `lib/pipeline/klantcitaten.ts`, `lib/pipeline/paginavorm.ts`, `lib/pipeline/adviestoon.ts` |

De volledige beoordeling van de externe copywriter staat in
`content-reviews/feedback/copywriter-extern-3-september-2026.md`. Het verbeterplan dat eruit
voortkwam staat in `docs/tasks/contentkwaliteit-copywriterronde.md`.
