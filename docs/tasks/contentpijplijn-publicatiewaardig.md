# Van vindbare tekst naar publicatiewaardige tekst: analyse en plan voor de contentpijplijn

**Opgesteld:** 25 september 2026, op verzoek van de eigenaar, naar aanleiding van externe feedback op
de teksten voor Hans Verstraaten Hoveniers, Wesley Keeris Installatietechniek en Autorijschool
Pompert. **Status: voorstel, niets hiervan is gebouwd.** Dit document beschrijft wat er vandaag
gebeurt, waarom dat tot de gemelde problemen leidt, en hoe de pijplijn eruit zou moeten zien als
contentkwaliteit net zo zwaar weegt als vindbaarheid. Er is geen code gewijzigd.

**Waar het op rust.** De code van de hele keten (`lib/pipeline/content.ts`, `content-contract.ts`,
`item-dossier.ts`, `writer-brief.ts`, `content-panel.ts`, `factcard.ts`, `fact-merge.ts`,
`adviestoon.ts`, `similarity.ts`, `contract-format.ts`, `brand-fields.ts`, `lib/openai/models.ts` en
`sampling.ts`), de productiedatabase van 25 september 2026 (de 10 huidige teksten van de hovenier en
de 11 van de installateur, hun schrijfopdrachten, contracten, feitenkaarten en `ai_calls`), en de
proefset van de kwaliteitsdoorlichting (`docs/tasks/kwaliteitsdoorlichting/`). De teksten die als
bijlage bij de opdracht hoorden, zijn niet bij mij aangekomen; ik heb de huidige versies uit
`content_pieces` gebruikt. Van de genoemde plaatspagina's staan daar Best en Nuenen (hovenier) en
Geldrop (installateur); Helmond en Veldhoven komen voor in de hoofdpagina en de zwemvijverpagina.
Elk citaat hieronder staat letterlijk in een opgeslagen tekst.

---

## 0. De conclusie op één pagina

**De problemen ontstaan niet in de schrijfstap en zijn dus niet met betere schrijfinstructies op te
lossen.** Ze ontstaan eerder in de keten, en de schrijver voert ze trouw uit:

1. **Het contract is een verplichte checklist.** Een onderzoeksstap die bewust niets van het bedrijf
   weet, bedenkt alle vragen die een lezer kan hebben. Het contract maakt van elke vraag een sectie,
   de schrijfprompt zegt "alles wat hier staat MOET erop", en de keuring rekent na of dat gelukt is.
   Niets in de keten beloont weglaten. Gevolg: gemiddeld tien secties en 880 tot 980 woorden per
   pagina; ook de landingspagina's zitten met ongeveer 700 woorden tegen de bovengrens van hun doel.
2. **De keten geeft de schrijver tegenstrijdige opdrachten over ontbrekende feiten.** Het contract
   eist een sectie, de feitenkaart verbiedt er iets over te beweren, het paginaplan zegt "laat weg",
   en de keuring meldt elke zin die als belofte gelezen kan worden. De enige uitweg die aan alle vier
   voldoet: de sectie schrijven en het gat benoemen. Dat is waar "is niet vastgelegd" en "valt niet
   af te leiden" vandaan komen. Bij de kostenpagina van de installateur schrijft de redactionele
   stap zelfs letterlijk voor: "Maak expliciet dat de beschikbare informatie niet benoemt wat precies
   standaard in de installatieprijs zit."
3. **Onzekerheid heeft maar één uitgang: de tekst.** De keten kent drie standen voor een feit
   (bruikbaar, verboden, achtergrond), maar geen stand voor "dit moeten wij intern uitzoeken" of
   "dit is niet belangrijk genoeg". Wat de klant niet weet, wordt daarom verwoord.
4. **Bronconflicten zijn onzichtbaar.** Tegenspraak wordt alleen herkend als twee feiten dezelfde
   sleutel hebben en de klant van antwoord veranderde. Twee intakeprijzen van de rijschool (op
   kantoor en in de auto, maar dat onderscheid viel bij het uitlezen weg) kwamen allebei op de
   kaart, en de schrijver schreef: "De beschikbare informatie over de intakeprijs spreekt elkaar
   tegen."
5. **De belangrijkste beslissingen worden door het goedkoopste model genomen.** Welke secties er
   komen en wat de pagina moet zeggen, beslist `gpt-6-luna` met weinig denktijd, voor $0,001 tot
   $0,003 per pagina. De dure schrijver krijgt daarna ongeveer 14.000 tokens aan achttien
   gelijkwaardige opdrachtblokken en voert het contract uit.
6. **De merkstem is één zin plus drie zinnen van de site.** Voor de hovenier is een van die drie
   "Wij staan graag voor je klaar!", precies het cliché dat de blinde lezers afkeurden. Negen velden
   die de adviseur in het gesprek vastlegt (positionering, onderscheid, kernboodschappen, eigen
   uitdrukkingen, kennisniveau van de doelgroep) gaan nergens de schrijfopdracht in.
7. **Elke pagina wordt los geschreven.** De schrijver van Nuenen weet niet wat er op Best staat. De
   duplicaatcontrole achteraf telt letterlijke woordreeksen en ziet niet dat twee pagina's dezelfde
   opbouw en dezelfde vijf feiten hebben.

**De rode draad:** de pijplijn is ontworpen om geen fouten te maken, en dat lukt goed. Er is geen
enkele stap die als opdracht heeft een goede pagina te maken: kiezen, weglaten, stellig zijn waar het
kan, en klinken als dit bedrijf. Na tientallen gerichte reparaties sinds 3 september steeg het oordeel van
de blinde lezers van 4,1 naar 4,9 op 10, en de ondernemer zou 4 van de 21 teksten zonder
aanpassing publiceren. De lijsten met verboden formuleringen worden langer, en het model vindt
nieuwe formuleringen voor hetzelfde gat. Dat is het teken dat het probleem structureel is.

**Het voorstel in vijf wijzigingen**, de rest van dit document werkt ze uit:

1. **Een contentstrateeg vóór het schrijven**, op een sterk model met veel denktijd, die kiest wat
   er op de pagina komt en vooral wat niet, met per onderwerp een reden en per onzekerheid een
   bestemming (intern oplossen, uitleggen, of weglaten). Deze stap vervangt het contract en de
   schrijfopdracht als twee losse stappen.
2. **Een feitenregister met conflictdetectie en een poort**: tegenstrijdige prijzen, termijnen,
   plaatsen, certificeringen en garanties houden de pagina tegen en gaan als vraag naar de adviseur,
   nooit als zin naar de lezer.
3. **Een merkstemprofiel per klant**, opgesteld uit alles wat we weten en één keer goedgekeurd door
   de adviseur, dat meegaat naar de schrijver, de redacteur en een eigen beoordelaar.
4. **Een eindredacteur na het schrijven**, die schrapt, relativeringen weghaalt die niet nodig zijn,
   herhaling eruit haalt en de tekst op de merkstem zet, met een logboek van wat hij veranderde.
5. **Een portfoliostap per plan** die pagina's over hetzelfde onderwerp in verschillende plaatsen
   elk een eigen hoek geeft, of zegt dat een aparte pagina hier geen zin heeft.

De kosten per pagina gaan naar schatting van ongeveer $0,18 nu naar $0,70 tot $1,00, en naar
ongeveer $2,50 als het duurste model de strategie en de eindredactie doet. Ter vergelijking: één
meetronde kost $0,82.

---

## 1. Diagnose van de huidige pipeline

### 1.1 De keten zoals hij nu loopt

Wat er per pagina gebeurt, in volgorde, met wat elke stap krijgt en oplevert. Kosten gemeten op
`ai_calls` voor de hovenier en de installateur vanaf 24 september 2026.

| Stap | Code | Model en denktijd | Krijgt | Levert | Kosten per keer |
|---|---|---|---|---|---|
| Aanbeveling | `report.ts` | luna | meting, gemiste vragen | titel (een opdracht als "Maak een pagina voor complete tuinaanleg in Best"), type, lezer, doelvragen | gedeeld per analyse |
| Feiten uit de site | `fact-atomise.ts` | luna, geen | 1.500 tekens per sitepagina | letterlijke feitzinnen | $0,0004 |
| Onderzoek per pagina | `item-dossier.ts` | luna, low, met web | titel, doelvraag, branche, winnend AI-antwoord. **Bewust niets over het bedrijf** | deelvragen, vervolgvragen, twijfels, uitleg met bron | $0,012 |
| Contract | `content-contract.ts` | luna, low | dossier, hele feitenkaart (44 feiten bij de hovenier, 84 bij de installateur), bestaande pagina | secties met vraag, feiten, lengte, belang, FAQ-vragen | $0,003 |
| Claim-audit en vragen | `briefing.ts` | luna, geen | contract, feitenkaart | welke beweringen gedekt zijn, vragen aan de klant | $0,004 per batch |
| Schrijfopdracht | `writer-brief.ts` | luna, low | kaart, contract, doelvragen, waardeproposities, bezwaren | lezer, hoofdvraag, kernantwoord, kernfeiten, keuzeredenen, moet erin, niet doen | $0,001 |
| Schrijven | `content.ts` | **sol, medium** | systeemprompt van elf regels plus achttien blokken, ongeveer 14.000 tokens | tekst, FAQ, meta, JSON-LD, claims, bewijspunten | $0,071 |
| Vier beoordelaars | `content-panel.ts` | luna, medium | tekst plus kaart of contract | scores, ongedekte zinnen, onbeantwoorde vragen | samen $0,006 |
| Controles in code | `content-gate.ts` en twaalf modules | geen AI | tekst | ongeveer 25 tellingen, 6 soorten blokkade | gratis |
| Reparatie, tot 3 keer | `content.ts`, `quality-repair.ts` | sol, medium | bevindingen per sectie, kaart, contract | vervangen secties | $0,057 per ronde |

Per geschreven versie kostte dat samen gemiddeld ongeveer $0,18 ($4,96 voor 28 schrijfaanroepen).

Wat dit schema laat zien, is waar het gewicht ligt. **De beslissingen die de pagina bepalen**
(welke secties, welke feiten, wat de hoofdboodschap is) vallen in twee stappen van samen een halve
cent, op het goedkoopste model. **De dure stap voert uit.** Een copywriter werkt andersom: het
meeste denkwerk zit in wat hij weglaat.

### 1.2 Tien oorzaken, gekoppeld aan de negen gemelde problemen

#### O1. Het contract is een verplichte checklist, opgebouwd uit onderzoek zonder bedrijf
*Veroorzaakt probleem 1 (te veel informatie), 4 (consumentenadviseur) en 9 (lengte).*

Vijf schakels versterken elkaar, en geen enkele schakel remt:

- **Het onderzoek weet niets van het bedrijf.** `item-dossier.ts` regel (a): "Alles wat je oplevert
  gaat over het ONDERWERP in het algemeen, nooit over een specifiek bedrijf." De deelvragen die
  eruit komen zijn dus de vragen van iemand die aanbieders vergelijkt: hoe lees ik een offerte, wat
  is meerwerk, hoe vergelijk ik prijzen.
- **Het contract moet alles opnemen.** `content-contract.ts` harde regel (a): "De pagina moet
  COMPLEET aanvoelen: een lezer mag na afloop geen voor de hand liggende vraag meer overhouden.
  Neem daarom ook de vervolgvragen en de twijfels uit het dossier op." Regel (d): "Laat een sectie
  dus NIET weg omdat het bewijs ontbreekt."
- **De schrijver mag niets weglaten.** `formatContract()`: "Alles wat hier staat MOET erop komen, in
  deze volgorde." Systeemregel 10: "Je mag er niets uit weglaten."
- **De keuring telt het na.** De dekkingspoort eist 85 procent van de secties, elke sectie moet de
  helft van zijn richtlengte halen, en de citeerbaarheidsbeoordelaar krijgt als "belangrijkste deel
  van je werk" de vragen die een lezer na de pagina nog overhoudt.
- **Niets meet te veel.** Er is een ondergrens per sectie en geen bovengrens die werkt. De doellengte
  per type (landing 400 tot 700) staat in de prompt, maar het contract telt tien secties op.

Gemeten op de huidige teksten: de installateur gemiddeld 980 woorden over 10,3 secties, de hovenier
881 woorden over 9,5 secties. De kostenpagina van de installateur heeft twaalf secties, waarvan het
contract er acht markeerde als "geen uitspraak over dit bedrijf nodig": "Vergelijk offertes op
dezelfde onderdelen", "Extra werk kan de afgesproken prijs verhogen", "Bij een gedeelde afvoer moet
ook het gebouwbeheer betrokken zijn". Dat is een consumentengids, en hij staat er omdat het contract
het zo voorschreef.

Bij de hovenier (pagina Best) is het patroon hetzelfde: "Een bruikbare offerte benoemt werk,
hoeveelheden en kosten", "Vergelijk dezelfde werkzaamheden en afwerking", met zinnen als "Een lager
bedrag voor ander werk vertelt je weinig over de kosten van jouw tuin."

De externe copywriter schreef op 3 september al "schrap 25 tot 40 procent van de informatie en maak
de rest sterker" (V10 in `contentkwaliteit-copywriterronde.md`). Wat er toen gebouwd is (een
verhaalboog en stellende koppen) veranderde de vorm, niet de hoeveelheid, omdat de vijf schakels
hierboven bleven staan.

#### O2. Tegenstrijdige opdrachten over een ontbrekend feit
*Veroorzaakt probleem 2 (indekken) en 5 (zichzelf klein maken).*

Neem een sectie waarvoor geen feit bestaat, bijvoorbeeld wat er in de installatieprijs zit. De
schrijver krijgt dan tegelijk:

| Van | De opdracht |
|---|---|
| het contract | deze sectie MOET erop, ongeveer 80 woorden, "geslaagd als" er iets over de inhoud van de prijs staat |
| de feitenkaart | "Staat iets niet op de kaart, dan schrijf je er niet over" |
| het paginaplan | "GEEN BRON: laat deze passage weg" |
| de schrijfopdracht | "Maak expliciet dat de beschikbare informatie niet benoemt wat precies standaard in de installatieprijs zit" (letterlijk, installateur, kostenpagina) |
| de feitelijkheidsbeoordelaar | noem "elke ALGEMENE uitleg die als belofte van dit bedrijf gelezen kan worden", en "bij twijfel noem je de zin" |
| de reparatie | "kun je hem niet oplossen met wat er op de kaart staat, laat de passage dan weg of schrijf hem algemener"; bij ontbrekend bewijs "nuanceer hem of laat hem weg" |

Weglaten kan niet (contract en dekkingspoort), een bewering doen kan niet (kaart en keuring). Wat
overblijft: over het onderwerp schrijven en erbij zeggen dat het niet vaststaat. Daarom staat er:

- "De beschikbare prijsinformatie benoemt niet welke werkzaamheden standaard in de installatieprijs
  zitten of wanneer extra kosten gelden." (installateur, kosten)
- "Welke controles standaard tijdens een ketelbezoek plaatsvinden en hoe het benodigde vermogen
  precies wordt berekend, is niet vastgelegd." (installateur, woningbezoek)
- "Welke van deze punten tijdens een ketelbezoek worden bekeken, staat niet als vaste werkwijze
  vast." (idem)
- "Dit is een lijst met nuttige gegevens, geen toezegging over documenten die wij standaard
  verstrekken." (idem)
- "Deze pagina geeft geen bevestigde lokale eis voor Best." (hovenier, FAQ bij Best)

Het tweede mechanisme is de keuring op beloftes. Elke algemene zin die een belofte zou kunnen zijn,
wordt gemeld; de goedkoopste reparatie is er een voorbehoud achter zetten. Zo ontstaat de
relativering van sterke bewijsstukken:

- "Wij hebben meer dan 35 jaar ervaring, maar dat zegt op zichzelf niets over het aantal zwemvijvers
  dat we hebben aangelegd." (hovenier, zwemvijverspecialist of hovenier)
- "Onze CO-certificering volgens de Gasketelwet is hierboven genoemd; die zegt op zichzelf niets over
  welke afzonderlijke werkzaamheden in een installatieprijs zijn opgenomen." (installateur, kosten)
- "Wesley Keeris Installatietechniek geeft een levertijd van 2 tot 4 weken en een installatieduur van
  1 dag op; dat is een eerste beeld van de planning, geen garantie voor iedere woning." (Geldrop)

Het derde mechanisme zit al in het merkprofiel. De waardeproposities die het onderzoek opstelde,
dragen hun eigen voorbehoud: "Meer dan 35 jaar ervaring, volgens de website", "De klant wordt naar
eigen zeggen van A tot Z ontzorgd", "de website zegt te streven naar verzending binnen 4 uur". Die
gaan letterlijk de schrijfprompt in als "waarom klanten kiezen". Een schrijver die "volgens de
website" leest, neemt die afstand over.

Een ruwe telling op de huidige teksten (een vaste lijst indekformuleringen zoals "niet automatisch",
"geen garantie", "zegt op zichzelf niets", "beschikbare informatie", "hangt af van"): 63 bij de
installateur en 61 bij de hovenier, ongeveer zes per pagina. Daarnaast 71 en 50 adviesformuleringen
("vergelijk", "controleer", "laat vooraf bevestigen", "bespreek").

De lijsten in `adviestoon.ts` (`SLAP`, `VOORBEHOUD`) en de families in `checkSourceTalk()` vangen de
formuleringen die eerder zijn gezien. "Valt niet af te leiden", "zegt op zichzelf niets" en "staat
niet als vaste werkwijze vast" staan er niet in. Een nieuwe lijst vangt de volgende ronde weer niet,
zolang de opdracht die het gat afdwingt blijft staan.

#### O3. Er is geen plek voor "dit lossen wij intern op" of "dit is niet belangrijk"
*Veroorzaakt probleem 2 (type A belandt in type B).*

Een feit heeft op de kaart drie standen: bruikbaar, verboden, achtergrond. Een onderwerp in het
contract heeft twee: merkgebonden of algemeen. Er bestaat geen stand die zegt:

- **A. Onbekend, intern oplossen.** Wij weten het niet, de klant wel. Dit hoort een vraag aan de
  ondernemer te worden, en tot die beantwoord is zwijgt de tekst erover.
- **B. Uitleggen aan de lezer.** De lezer beslist verkeerd als hij het niet weet, en het bedrijf wil
  dat zeggen. Voorbeeld: een prijs is een bandbreedte.
- **C. Niet relevant genoeg.** Weglaten, zonder vraag en zonder zin.

De vragenronde (`briefing.ts`) doet A al gedeeltelijk: onbewezen beweringen worden vragen aan de
klant. Maar een overgeslagen of niet gestelde vraag komt daarna als "GEEN BRON" terug in de
schrijfprompt, en het contract eist de sectie nog steeds. Bij de hovenier kende de ondernemer de
garantie (één jaar op aanplant, vijf jaar op bestrating volgens het waarheidsdossier), maar de vraag
werd niet gesteld; de tekst werd "Bespreek garantieafspraken voordat de aanleg begint" (punt 49 van
de doorlichting).

#### O4. Bronconflicten worden niet herkend en niet tegengehouden
*Veroorzaakt probleem 3.*

`planFactMerge()` in `fact-merge.ts` herkent tegenspraak alleen als twee feiten dezelfde `factKey`
hebben. Die sleutel wordt uit de tekst afgeleid, dus twee zinnen over dezelfde prijs in een andere
formulering krijgen verschillende sleutels en staan allebei op de kaart. `describeContradictions()`
filtert daarnaast bewust de sitewijzigingen eruit en toont alleen wat de klant zelf anders
beantwoordde, op het briefingscherm, zonder iets tegen te houden.

Gevolg bij de rijschool (herhaling van de doorlichting): "De beschikbare informatie over de
intakeprijs spreekt elkaar tegen, dus hier noemen we geen actueel bedrag" en "in de aangeleverde
prijsinformatie staan twee verschillende bedragen voor de intake". Nagerekend in de opgeslagen
sitetekst (`kwaliteitsdoorlichting/sites/pompert.txt`) is dit geen echte tegenspraak: de prijslijst
noemt een intake op kantoor van € 50 en een intake in de auto van € 80. Bij het uitlezen van de site
viel dat onderscheid weg, en op de kaart stonden twee intakeprijzen zonder uitleg. Een andere tekst
van dezelfde ronde koos er zelf één ("De intake kost € 80"). Dat maakt het punt scherper: de keten
kan een echt conflict niet onderscheiden van verloren context, en heeft voor geen van beide een
route buiten de tekst om. De schrijver deed wat hij kon met twee F-nummers die elkaar leken tegen te
spreken; de fout zit in dat hij ze allebei kreeg, zonder dat iemand ernaar keek.

Bij de hovenier is een zachtere variant te zien: de site belooft "binnen 4 uur te voorzien van een
scherpe offerte", het onderzoek maakte daar "streeft naar verzending binnen 4 uur" van, en een
tekst draaide het om tot "Dat is geen termijn voor het ontwerp of de offerte" (punt 46).

#### O5. De redactionele beslissing is goedkoop, vrijblijvend en komt na het contract
*Veroorzaakt probleem 1 en 5.*

De schrijfopdracht (`writer-brief.ts`, sinds 4 september) was het juiste idee: een stap die kiest.
Drie dingen houden hem klein:

- **Hij komt ná het contract** en krijgt het als "de structuur, jij levert de richting". Hij kan
  geen sectie schrappen. Op de kostenpagina van de installateur koos hij vier kernfeiten, en het
  contract hield twaalf secties.
- **Hij draait op het goedkoopste model** met weinig denktijd ($0,0011 per pagina). Op dat model
  neemt hij de toon van de feitenkaart over, inclusief de afstand: zie het kernantwoord van de
  kostenpagina, "De beschikbare informatie specificeert niet welke onderdelen van het werk standaard
  in die prijs zitten".
- **Hij is één blok van achttien** in de schrijfprompt. Wat de schrijver ook krijgt: "DIT IS HET
  CONTRACT VOOR DEZE PAGINA. Alles wat hier staat MOET erop komen." Bij een botsing wint de
  opdracht met de controle erachter, en dat is het contract.

#### O6. De merkstem is te dun om iets te sturen
*Veroorzaakt probleem 6.*

Wat de schrijver over de stem krijgt: het vrije veld `tone_of_voice` ("Nuchter en vakkundig,
Brabants hartelijk, geen verkooppraat"), vier schuiven die bij alle drie de klanten leeg zijn, de
aanspreekvorm, verboden woorden, en drie `style_samples` die van de site komen. Voor de hovenier:

- "Wij staan graag voor je klaar!"
- "Tijdens een kennismakingsgesprek bespreken we graag de mogelijkheden voor jouw tuin."
- "Ben jij benieuwd wat we voor jou kunnen betekenen? Vraag een gratis offerte aan ..."

Dat zijn de generieke zinnen van een sitebouwer, geen stem, en de schrijver doet ze trouw na: "Wij
staan graag voor je klaar" staat onder de pagina voor Best, en de blinde lezer noemde het "Cliché,
botst met 'geen verkooppraat'". Voor de installateur staat "Een goed werkende verwarmingsinstallatie
is onmisbaar voor een comfortabel en energiezuinig huis" in een tekst die "zakelijk" moest zijn.

Wat er wel verzameld wordt en nergens de schrijfopdracht in gaat (`brand-fields.ts`, "wordt op dit
moment niet in de teksten gebruikt"): `brand_positioning`, `differentiator`, `usp`, `key_messages`,
`signature_phrases`, `identity_keywords`, `personas`, `audience_knowledge_level`, `tone_emotional`.
En de meest authentieke bron van de stem, de letterlijke antwoorden van de ondernemer in het gesprek
en in de vragenronde, wordt alleen gebruikt als bewijs (`klantcitaten.ts`), niet als maatstaf voor
hoe het bedrijf praat.

De enige controles op stem zijn de aanspreekvorm, verboden woorden, merknaam aan het begin van een
alinea, en één cijfer "toon" van de vakmanschapsbeoordelaar, die geen stemprofiel heeft om tegen te
meten.

#### O7. Elke pagina wordt los geschreven
*Veroorzaakt probleem 7.*

De schrijver krijgt `relatedPageWarning()` (een adres) en verder niets van de andere pagina's.
Best en Nuenen kregen dezelfde kaart van 44 feiten, een vergelijkbare schrijfopdracht, en schreven:

| Best | Nuenen |
|---|---|
| "Hans Verstraaten Hoveniers werkt in Best en verzorgt een complete tuin van ontwerp tot oplevering zelf" | "Hans Verstraaten Hoveniers werkt in Nuenen en verzorgt bij een complete tuin zelf het ontwerp, grondwerk, de bestrating, beplanting en afvoer" |
| "We werken met een vaste ploeg van vijf man en huren geen zzp'ers in." | "We werken met een vaste ploeg van vijf man, zonder inhuur van zzp'ers." |
| "## Reken meestal op €12.000 tot €35.000 voor aanleg met bestrating" | "## Reken meestal op €12.000 tot €35.000 voor aanleg met bestrating" |
| "## Vergelijk dezelfde werkzaamheden en afwerking" | "## Vergelijk offertes op dezelfde werkzaamheden en hoeveelheden" |

Wat er over Best of Nuenen zelf in staat: de plaatsnaam. Geen project, geen wijk, geen afstand, geen
reden waarom deze pagina bestaat naast de andere. Dat kan ook niet, want er staat geen enkel lokaal
feit op de kaart en niemand heeft de ondernemer ernaar gevraagd.

`similarity.ts` vergelijkt achteraf op letterlijke reeksen van vijf woorden (drempel 0,35). Twee
pagina's met dezelfde opbouw en andere zinnen komen daar ruim onder. De controle meet hergebruik van
zinnen, niet hergebruik van de pagina.

De bron van deze plaatspagina's ligt nog eerder: de meetvragen bevatten vrijwel altijd een plaatsnaam
(punt 8 van de doorlichting), dus elke gemiste vraag in een andere plaats wordt een aanbeveling
voor een plaatspagina.

#### O8. De FAQ is per ontwerp een restcategorie
*Veroorzaakt probleem 8.*

Het contract vraagt om FAQ-vragen met de regel "Vraag NIET na wat er in de secties hierboven al
beantwoord wordt." Wat in de FAQ komt is dus per definitie wat niet in de tekst paste. Omdat die
vragen uit het algemene onderzoek komen, is er meestal geen feit bij, en dan wordt het antwoord een
voorbehoud:

- "Welke regels gelden in Best voor het afvoeren van regenwater bij een grotendeels betegelde tuin?"
  Antwoord: "Dat hangt af van de actuele regels en het concrete plan. Deze pagina geeft geen
  bevestigde lokale eis voor Best. Controleer de geldende regels voordat je de indeling definitief
  maakt." (hovenier, Best)
- "Hoeveel moet ik aanbetalen voor tuinaanleg?" Antwoord: "Een vast aanbetalingsbedrag voor een
  tuinproject wordt hier niet genoemd." (idem)
- "Wat is op de lange termijn voordeliger: een cv-ketel kopen of huren?" op een pagina van een
  bedrijf dat geen huur aanbiedt (installateur, kosten).

Daarnaast herhaalt de FAQ de tekst waar het wel een feit heeft: bij Nuenen staat de prijsband in de
opening, in een eigen sectie, in de laatste sectie en in de FAQ.

#### O9. Lengte is een uitkomst van de checklist, niet van een besluit
*Veroorzaakt probleem 9.*

`TARGET_WORDS` zet per type een bandbreedte, het contract verdeelt die over secties, de keuring
bewaakt de ondergrens per sectie. Niemand beslist "deze pagina heeft vijf feiten en drie echte
vragen, dus 450 woorden is genoeg". Omdat het contract geen ondergrens kent voor het aantal secties
en de schrijver er niets uit mag halen, is de uitkomst altijd de bovenkant.

#### O10. De keuring beschermt, maar trekt niet
*Versterkt alle bovenstaande.*

De zes blokkades gaan allemaal over veiligheid (verboden woord, verboden onderwerp, concurrent,
kernbewering zonder bewijs, bewering zonder bron, duplicaat). Kwaliteit van de copy verlaagt alleen
een score. De reparatie werkt de blokkades het eerst af, en die los je op door af te zwakken.
Tegelijk weten we uit de doorlichting dat een losse beoordelaar geen betrouwbaar absoluut cijfer
geeft maar wel betrouwbaar vergelijkt (`kwaliteitsdoorlichting/blinde-lezer-toets/README.md`), en
dat de vakmanschapsbeoordelaar een rangcorrelatie van +0,29 had met een echte copywriter. De score
waarop de reparatielus stuurt, is dus het minst betrouwbare getal in de keten.

### 1.3 Wat goed is en moet blijven

Dit plan gooit het fundament niet weg. Deze onderdelen werken en zijn precies wat een gewone
AI-schrijftool mist:

- **De gesloten feitenkaart met citaatplicht** (`claims` met F-nummer en letterlijk fragment, door
  code nagerekend). De twee zwaarste meldingen van verzonnen feiten in de herhaling (punt 60 en 61)
  bleken bij narekenen op de site of in de antwoorden van de klant te staan.
- **Uitleg met nagerekende bron** (`explainer-verify.ts`).
- **Reparatie per sectie** in plaats van de hele pagina, met behoud van wat goed was.
- **Bevroren momentopnames** van kaart, plan en opdracht per versie (conventie 8).
- **De vragenronde aan de ondernemer** als route voor wat alleen hij weet.
- **Klantcitaten, bewijspunten en kernbewijs** als bouwstenen.
- **De proefset met blinde lezers** (`docs/tasks/kwaliteitsdoorlichting/`): de enige meetlat die
  meet wat een lezer merkt. Die wordt in dit plan de acceptatietest.

---

## 2. De gewenste pipeline

Het uitgangspunt: **eerst beslissen, dan schrijven, dan redigeren, dan pas keuren.** Elke beslissing
wordt een gestructureerd object dat de volgende stap krijgt en dat code kan narekenen. De
deterministische vangnetten verschuiven van "komt deze formulering voor" naar "is de beslissing
uitgevoerd": staat er een onderwerp dat was uitgesloten, wordt een feit genoemd dat intern open
staat.

De keten heeft drie lagen, omdat niet alles per pagina opnieuw hoeft.

### Laag 1. Per merk: wat we weten en hoe het bedrijf klinkt (eenmalig, bijgewerkt bij wijzigingen)

**1a. Feitenregister.** De feitenbank bestaat al (`factstore.ts`). Elk feit krijgt er vier dingen
bij: een soort (prijs, termijn, plaats, dienst, certificering, garantie, werkwijze, cijfer,
openingstijd, contact, product), een genormaliseerde waarde waar dat kan (bedrag, bandbreedte, duur,
plaatsnaam), een geldigheid (merkbreed, per dienst, per plaats), en een publicatiestand
(bevestigd door de klant, van de site, uit onderzoek, betwist). Een licht model classificeert, code
normaliseert de waarden.

**1b. Conflictdetectie.** Code vergelijkt feiten van dezelfde soort en hetzelfde onderwerp op hun
genormaliseerde waarde (twee intakeprijzen, twee levertijden, twee werkgebieden). Kandidaat-paren
gaan naar een licht model met één vraag: spreken deze twee elkaar echt tegen, of gaan ze over iets
anders (een intake op kantoor tegenover een intake in de auto)? Een echt conflict komt in een conflictregister
en gaat als vraag naar de adviseur. Zie §6.3 voor welke soorten tegenhouden.

**1c. Bewijsbank.** Uit het register: de feiten die als bewijs kunnen dienen (35 jaar, eigen ploeg
van vijf, 60 tot 70 tuinen per jaar, twaalf monteurs, 1.800 onderhoudscontracten, CO-certificering),
elk met een sterkte en een regel voor hoe stellig hij gebracht mag worden. Standaard: stellig en
zonder voorbehoud, want de klant heeft hem bevestigd of hij staat op zijn eigen site.

**1d. Merkstemprofiel.** Zie §7. Een sterk model stelt het op uit de hele sitetekst, het gesprek, de
letterlijke antwoorden van de ondernemer en de velden die nu ongebruikt blijven. De adviseur keurt
het één keer goed, vóór de eerste pagina.

### Laag 2. Per plan of cluster: welke pagina welke taak heeft

**2a. Portfolio en hoeken.** Eén aanroep die alle geplande pagina's van een plan naast elkaar legt,
samen met de bestaande sitepagina's, en per pagina vastlegt: de zoekintentie die hij bedient, het
doel, de unieke hoek, welk bewijs hier voorop gaat (en welk op een andere pagina), wat deze pagina
bewust niet behandelt omdat een andere pagina dat doet, en welke interne links logisch zijn. Deze
stap mag ook zeggen: voor deze plaats is geen eigen pagina te verdedigen, voeg hem samen met de
werkgebiedpagina, of stel de ondernemer eerst een vraag over projecten daar. Zie §9.

### Laag 3. Per pagina

| # | Stap | Soort | Wat hij doet |
|---|---|---|---|
| 3a | Zoekintentie en lezersvragen | licht model met web (het huidige itemdossier, bijgesteld) | welke vragen iemand met deze intentie heeft, nu ook: wat verwacht deze lezer van een aanbieder te horen |
| 3b | **Paginastrategie** | **sterk model, veel denktijd** | de redactionele keuze: doel, lezer, kernboodschap, gekozen feiten en onderwerpen, uitgesloten onderwerpen met reden, bestemming per onzekerheid, lengtebudget, oproep tot actie, FAQ-kandidaten |
| 3c | Poort vóór het schrijven | code | open conflict op een gekozen feit, of een kernonderwerp zonder feit: niet schrijven, vraag naar adviseur of ondernemer |
| 3d | Opbouw | code, uit 3b | secties met doel, feiten en woordbudget; alleen onderwerpen die 3b opnam |
| 3e | FAQ-selectie | licht model plus code | kandidaten toetsen: niet al in de tekst, commercieel relevant, te beantwoorden met een feit of vaste vakkennis; nul vragen is een geldige uitkomst |
| 3f | **Schrijven** | **sterk model, veel denktijd** | de pagina, met een korte opdracht: strategie, opbouw, alleen de gekozen feiten, merkstem met voorbeelden |
| 3g | Feitcontrole | code plus licht model | zoals nu (beweringen tegen het register), plus: staat er een onderwerp uit de uitsluitlijst, staat er een intern open punt als zin |
| 3h | **Eindredactie** | **sterk model** | schrappen, relativeringen weg waar ze niet nodig zijn, herhaling eruit, stem erop, lengte naar het budget; met een logboek per wijziging |
| 3i | Keuring door specialisten | mix | merkstem, eigenaarstoets, SEO en GEO, feitelijkheid; vergelijkend in plaats van alleen een los cijfer |
| 3j | Publicatiepoort | code | harde blokkades, waarschuwingen, en welke menselijke controle nodig is |

Reparatie blijft bestaan, maar wordt gestuurd door de redacteur en de eigenaarstoets en niet meer
alleen door de veiligheidsblokkades. Hoogstens twee rondes; wat daarna nog openstaat is bijna
altijd een ontbrekend feit en gaat als vraag naar de ondernemer, zoals nu.

**Waarom deze volgorde beter is dan de huidige.** De huidige keten beslist wat er op de pagina komt
in het contract (goedkoop, volledigheid als doel) en probeert daarna in drie lagen (schrijfopdracht,
schrijfprompt, reparatie) de gevolgen te beperken. De nieuwe keten beslist het één keer, op het
sterkste model, met weglaten als volwaardige uitkomst, en laat alles daarna die beslissing uitvoeren.
De architectuur uit de opdracht (onderzoek, feiten, zoekintentie, lezersintentie, paginadoel,
prioritering, opbouw, copy, redactie, publicatietoets) komt daarmee overeen, met twee verschillen:
zoekintentie, lezersintentie, doel en prioritering zijn één aanroep (ze hangen zo sterk samen dat
losse aanroepen elkaar zouden tegenspreken, precies het probleem van nu), en er komt een laag per
merk en per plan boven, omdat stem, conflicten en uniciteit niet per pagina op te lossen zijn.

---

## 3. Concrete wijzigingen in de applicatie

### Aanpassen

| Onderdeel | Nu | Wordt |
|---|---|---|
| `item-dossier.ts` | "nooit over een specifiek bedrijf", levert een volledige vragenlijst | blijft algemeen (geen bedrijfsfeiten, dat is terecht), maar levert vragen met een gewicht en een label: beslisvraag, oriëntatievraag, randvraag. Randvragen gaan niet automatisch mee |
| `content-contract.ts` | aparte stap, "compleet", "laat niets weg" | vervalt als losse stap; de opbouw wordt afgeleid uit de paginastrategie. Harde regels (a) en (d) verdwijnen |
| `writer-brief.ts` | goedkope keuze ná het contract | wordt de paginastrategie, op het sterke model, vóór de opbouw |
| `formatContract()` | "Alles wat hier staat MOET erop komen" | "dit is de opbouw; een sectie waarvoor je geen feit of vaste vakkennis hebt, laat je weg en je zet hem in `weggelaten`" |
| `content.ts`, `CONTENT_SYSTEM` en `buildContentInput()` | elf regels plus achttien blokken, ongeveer 14.000 tokens | kortere opdracht: strategie, opbouw, gekozen feiten (niet de hele kaart van 84), merkstem met voorbeelden, de harde regels die blijven (feiten, concurrenten, leestekens). De hele kaart gaat alleen mee naar de feitcontrole |
| `content-coverage.ts` | 85 procent van de contractsecties | meet of de gekozen onderwerpen en kernfeiten erin staan, en of de uitgesloten onderwerpen er niet in staan |
| `content-panel.ts` | vier beoordelaars op luna, los cijfer | zie §6: specialisten met een stemprofiel, eigenaarstoets en een vergelijkend oordeel |
| `quality-repair.ts` en de reparatielus | stuurt op blokkades, repareert met "nuanceer of laat weg" | stuurt op de bevindingen van redacteur en eigenaarstoets; "laat weg" wordt de enige route bij ontbrekend bewijs, "nuanceer" verdwijnt |
| `fact-merge.ts`, `factstore.ts` | tegenspraak alleen op dezelfde sleutel | soort, waarde en geldigheid per feit; conflictdetectie op soort en waarde (§2, 1b) |
| waardeproposities in het profiel | "volgens de website", dubbel | opgeschoond naar stellige uitspraken met herkomst in een apart veld; dubbelingen eruit. Herkomst is administratie, geen tekst |
| `similarity.ts` | vijfwoordreeksen, achteraf | aangevuld met vergelijking op hoek, feitenset en opbouw, vóór het schrijven (portfolio) en erna (§9) |
| `lib/openai/models.ts` en `sampling.ts` | alleen het schrijven op sol, denktijd medium | strategie, schrijven en eindredactie op sol met denktijd hoog, met een proef op astra; zie §11 |

### Toevoegen

- Feitsoort, waarde, geldigheid en publicatiestand op de feitenbank (migratie, additief).
- Conflictregister met een scherm voor de adviseur (bij het merk, niet bij de klant).
- Merkstemprofiel als eigen object bij het merk, met goedkeuring door de adviseur.
- Paginastrategie als eigen kolom op `content_pieces`, net als `writer_brief_json` nu.
- Taaksoorten voor paginastrategie en eindredactie (conventie 7: één zware aanroep per taak).
- Portfoliostap per plan, met per pagina een toegewezen hoek.
- Een acceptatietest die de proefset van de doorlichting opnieuw draait (§14).

### Verwijderen of afschalen

- Systeemregel 10 ("je mag er niets uit weglaten") en contractregels (a) en (d).
- De instructie aan de reparatie om te "nuanceren".
- De opdracht aan de feitelijkheidsbeoordelaar om algemene uitleg te melden "die als belofte gelezen
  kan worden", als losstaande jacht. Die vraag verhuist naar de feitcontrole met een gesloten
  definitie van wat een belofte is (een zin met "wij" of de merknaam plus een toezegging).
- De groeiende formuleringlijsten (`SLAP`, `VOORBEHOUD`, de families van `checkSourceTalk`) blijven
  als vangnet, maar zijn niet meer de hoofdroute. Geen nieuwe families toevoegen.
- `style_samples` als enige stembron.

---

## 4. Nieuwe LLM-stappen

Per stap: wat hij doet, wat hij krijgt, wat hij oplevert, en waarom hij nodig is. Modellen zijn de
tiers uit `lib/openai/pricing.ts`: luna ($0,10 in, $0,50 uit per miljoen tokens), sol ($2 en $10),
astra ($10 en $50). Astra staat in de prijstabel maar wordt nu nergens gebruikt.

### L1. Feiten classificeren (per merk, per batch nieuwe feiten)
- **Doet:** geeft elk feit een soort, een genormaliseerde waarde en een geldigheid.
- **Krijgt:** de feiten zoals ze nu in de bank staan, plus de sitepagina waar ze vandaan komen.
- **Levert:** per feit `soort`, `waarde`, `eenheid`, `geldtVoor` (merk, dienst, plaats), en of het
  een bewijsstuk kan zijn.
- **Model:** luna, geen denktijd. Code rekent de waarde na (een bedrag in de waarde moet in de
  feittekst staan).
- **Waarom:** zonder soort en waarde is geen conflict te vinden en geen feit te kiezen.

### L2. Conflict beoordelen (per kandidaat-paar)
- **Doet:** beslist of twee feiten van dezelfde soort elkaar echt tegenspreken.
- **Krijgt:** de twee feiten met bron, datum en de zin eromheen.
- **Levert:** `echtConflict` ja of nee, `soort`, een uitleg in één zin voor de adviseur, en een
  voorstel welke bron waarschijnlijk klopt (nooit automatisch toegepast).
- **Model:** luna met denktijd laag.
- **Waarom:** code vindt kandidaten (twee intakeprijzen bij de rijschool), maar ziet niet dat het
  ene bedrag over een intake op kantoor gaat en het andere over een intake in de auto. Zonder deze
  stap wordt de poort vals alarm; met deze stap wordt het een feit met twee varianten, en alleen als
  het model het niet kan uitmaken een vraag aan de adviseur.
- **Lost op:** "De beschikbare informatie over de intakeprijs spreekt elkaar tegen" (rijschool).

### L3. Merkstemprofiel opstellen (per merk, eenmalig)
- **Doet:** vertaalt alles wat we van het bedrijf weten naar een bruikbaar stemprofiel (§7).
- **Krijgt:** de hele sitetekst die de crawl las, de gespreksnotities, alle letterlijke antwoorden van
  de ondernemer, de toonvelden en de nu ongebruikte merkvelden, de verboden woorden.
- **Levert:** het object `BrandVoice` uit §5, inclusief goede en foute voorbeeldzinnen die het zelf
  schrijft uit bestaande feiten.
- **Model:** astra of sol, denktijd hoog. Draait één keer per merk.
- **Waarom:** "nuchter en vakkundig" is geen instructie waar een schrijver iets mee kan; tien
  concrete regels en twintig voorbeeldzinnen wel.

### L4. Portfolio en hoeken (per plan of per batch pagina's)
- **Doet:** geeft elke pagina een eigen taak binnen het geheel.
- **Krijgt:** alle geplande pagina's met doelvragen en lezer, de bestaande sitepagina's (titel, adres,
  korte inhoud), de bewijsbank, het werkgebied en de groeiplaatsen.
- **Levert:** per pagina `PageAssignment` (§5): primaire intentie, hoek, voorrangsbewijs, wat hij
  niet behandelt en waar dat wel staat, interne links, en een advies: schrijven, samenvoegen met
  pagina X, of eerst een vraag aan de ondernemer.
- **Model:** sol, denktijd hoog.
- **Waarom:** uniciteit is een eigenschap van de verzameling, niet van één pagina. Een schrijver die
  alleen Nuenen ziet, kan niet weten dat Best al over offertes vergelijken gaat.

### L5. Paginastrategie (per pagina), de belangrijkste nieuwe stap
- **Doet:** de redactionele keuze die nu over contract en schrijfopdracht verdeeld is.
- **Krijgt:** de toewijzing uit L4, het dossier met gewogen vragen, het feitenregister (alle feiten
  met soort en stand), de bewijsbank, het stemprofiel (samenvatting), de bestaande pagina als die
  er is, de doelvragen uit de meting, het winnende AI-antwoord zonder namen, de bezwaren uit het
  verkoopgesprek, en de korte inhoud van de zusterpagina's.
- **Levert:** `PageStrategy` (§5). De kern: welke onderwerpen en feiten erop komen, welke niet en
  waarom, per onzekerheid de bestemming A, B of C, het lengtebudget met onderbouwing, en de
  oproep tot actie.
- **Model:** sol, denktijd hoog; proef met astra.
- **Waarom:** dit is de stap die een copywriter het zwaarst vindt en die nu het minst kost. Hij moet
  kunnen zeggen: "deze pagina heeft vijf feiten en twee echte beslisvragen, dus vier secties en
  500 woorden."
- **Vangnet:** code rekent na dat elk gekozen feit in het register staat en niet betwist is, dat
  elke bestemming B een reden uit de gesloten lijst heeft (§8.3), en dat het lengtebudget binnen
  de grenzen van het paginadoel valt.

### L6. FAQ-selectie (per pagina)
- **Doet:** kiest nul tot vijf vragen die echt iets toevoegen.
- **Krijgt:** de opbouw uit L5, de kandidaatvragen (uit het dossier, de meting, de bezwaren, en de
  vervolgvragen die de beoordelaars nu al melden), het register.
- **Levert:** per kandidaat: houden of afwijzen, met de reden (al beantwoord in sectie X, geen feit,
  niet commercieel relevant, dubbel), en voor een gehouden vraag het feit of de vakkennis waarop het
  antwoord rust.
- **Model:** luna, denktijd laag. Code gooit elke vraag weg zonder onderbouwing en elke vraag die
  woordelijk overlapt met een sectie.
- **Waarom:** zie §10.

### L7. Schrijven (per pagina)
- **Doet:** zoals nu, met een andere opdracht.
- **Krijgt:** strategie, opbouw, alleen de gekozen feiten (met F-nummer), de goedgekeurde FAQ met
  onderbouwing, het stemprofiel met voorbeelden, de harde regels.
- **Levert:** zoals nu (tekst, FAQ, meta, JSON-LD, claims, bewijspunten), plus `weggelaten`: welke
  opbouwpunten hij niet heeft kunnen schrijven en waarom.
- **Model:** sol, denktijd hoog.

### L8. Eindredactie (per pagina, één of twee rondes)
- **Doet:** wat een eindredacteur doet: de tekst beter maken zonder feiten toe te voegen.
- **Krijgt:** de tekst, de strategie, het stemprofiel, de lijst gekozen feiten, en de bevindingen uit
  de feitcontrole.
- **Levert:** de geredigeerde tekst plus een logboek per wijziging: wat, waarom (overbodige
  relativering, herhaling, adviestoon, stem, lengte, onduidelijke zin), en of het een feit raakte.
- **Model:** sol, denktijd hoog; proef met astra.
- **Vangnet:** code controleert dat er geen nieuw feit bij kwam (dezelfde claimcontrole als nu), dat
  geen gekozen kernfeit verdween, en dat de lengte naar het budget ging en niet erboven.
- **Waarom:** de reparatielus van nu is een monteur die bevindingen afwerkt. Wat ontbreekt is iemand
  die de hele tekst leest en zegt: deze drie alinea's zeggen hetzelfde, en deze zin maakt ons sterkste
  punt kapot.

### L9. Merkstemtoets (per pagina)
- **Doet:** legt de tekst naast het stemprofiel.
- **Levert:** per regel uit het profiel of hij gehaald is, met de zin uit de tekst; de drie zinnen die
  het verst van de stem af staan, met een voorstel.
- **Model:** sol, denktijd medium (luna blijkt te mild op stem; te toetsen).

### L10. Eigenaarstoets (per pagina)
- **Doet:** leest de pagina als de ondernemer. Zou hij dit zonder aanpassing publiceren, en wat zou
  hij als eerste veranderen?
- **Krijgt:** de tekst, het stemprofiel, het bewijs, en de huidige sitepagina of de vorige versie.
- **Levert:** een vergelijkend oordeel (nieuw beter, gelijk, slechter), publiceerbaar ja of nee, en
  de eerste wijziging die de ondernemer zou maken.
- **Model:** sol. Een beoordelaar van een andere leverancier verkleint het risico dat een model zijn
  eigen soort tekst goed vindt; Gemini staat klaar maar is uit, dit is een optie om te toetsen.
- **Waarom:** de blinde-lezertoets liet zien dat een lezer betrouwbaar vergelijkt en geen
  betrouwbaar los cijfer geeft. Deze toets vergelijkt.

### Wat vervalt of samengaat
- Contract (luna) en schrijfopdracht (luna) gaan op in L5.
- De redactiebeoordelaar en de vakmanschapsbeoordelaar gaan op in L9 en L10.
- De feitelijkheidsbeoordelaar blijft, gericht op de feitcontrole van 3g.
- De citeerbaarheidsbeoordelaar blijft, maar zijn vraag "wat houdt de lezer nog over" wordt input voor
  de volgende strategie en de FAQ-kandidaten, en geen reparatieopdracht om secties toe te voegen.

---

## 5. Gestructureerde tussenobjecten

De velden hieronder zijn het voorstel. Elk object wordt als JSON bewaard naast de pagina (conventie
8), zodat achteraf bij elke zin te zien is welke beslissing hem veroorzaakte.

### FactRecord (per merk)
| Veld | Betekenis |
|---|---|
| `id`, `tekst`, `bron`, `bronUrl`, `datum` | zoals nu |
| `soort` | prijs, termijn, plaats, werkgebied, dienst, product, certificering, garantie, werkwijze, cijfer, openingstijd, contact |
| `waarde`, `eenheid` | genormaliseerd: `{min: 2200, max: 3200, eenheid: "EUR"}`, `{min: 2, max: 4, eenheid: "week"}` |
| `geldtVoor` | merk, een dienst, een plaats |
| `stand` | bevestigd door klant, van de site, uit onderzoek, betwist |
| `bewijskracht` | geen, gewoon, sterk (35 jaar, eigen ploeg, 1.800 contracten) |

### SourceConflict (per merk)
| Veld | Betekenis |
|---|---|
| `feiten` | de twee of meer feit-id's |
| `soort` | zoals bij FactRecord |
| `ernst` | blokkerend of waarschuwing, volgens de tabel in §6.3 |
| `uitleg` | één zin voor de adviseur |
| `voorstel` | welke bron waarschijnlijk klopt, met reden |
| `oplossing` | door wie, wanneer, welk feit geldt; tot die tijd staat het feit op "betwist" |

### BrandVoice (per merk), zie §7

### PageAssignment (per pagina, uit het portfolio)
| Veld | Betekenis |
|---|---|
| `primaireIntentie` | de ene zoekintentie die deze URL bedient |
| `paginadoel` | informeren, overtuigen, kiezen helpen, contact opleveren |
| `hoek` | waarom deze pagina naast de andere bestaat, in één zin |
| `voorrangsbewijs` | welke bewijsstukken hier voorop gaan |
| `nietHier` | onderwerpen die op een andere pagina staan, met die pagina |
| `interneLinks` | naar welke pagina's, met welke aanleiding |
| `advies` | schrijven, samenvoegen met X, eerst vraag Y aan de ondernemer |

### PageStrategy (per pagina, uit L5)
| Veld | Betekenis |
|---|---|
| `zoekintentie` | wat iemand zoekt als hij hier landt (informeren, vergelijken, kopen, lokaal vinden) |
| `lezer` | één persoon in één situatie (zoals nu) |
| `fase` | oriëntatie, overweging, beslissing |
| `paginadoel` | wat de lezer na afloop doet |
| `kernboodschap` | wat blijft hangen, in één zin |
| `openingsantwoord` | het antwoord op de hoofdvraag in hoogstens twee zinnen |
| `hoek` | overgenomen uit de toewijzing, eventueel aangescherpt |
| `prioriteitsfeiten` | drie tot zes feit-id's die de pagina dragen, elk met de betekenis voor deze lezer |
| `optioneleFeiten` | mag, hoeft niet |
| `uitgeslotenFeiten` | met reden: elders gedekt, niet relevant voor deze lezer, betwist |
| `onderwerpen` | per onderwerp: opnemen, weglaten, of eerst vragen; bij opnemen de bron (feit of vaste vakkennis) |
| `onzekerheden` | per open punt de bestemming A (intern: wordt vraag), B (uitleggen: met reden en formulering) of C (weglaten) |
| `bezwaar` | het ene bezwaar uit het verkoopgesprek dat deze pagina wegneemt, als dat er is |
| `lengtebudget` | woorden, met de onderbouwing (zie §8.4) |
| `oproep` | wat de lezer moet doen, in de woorden van het merk |
| `risico` | gevoelige onderwerpen (veiligheid, wet, zorg) met de nuance die daar wel moet |

### FaqPlan (per pagina, uit L6)
Per vraag: `vraag`, `gehouden`, `reden`, `onderbouwing` (feit-id of vakkennis met bron).

### EditorialLog (per pagina, uit L8)
Per wijziging: `was`, `wordt`, `soort` (relativering, herhaling, adviestoon, stem, lengte, helderheid),
`raaktFeit`.

### ReadinessReport (per pagina, uit 3i en 3j)
Zie §6.4.

**Maakt dit de kwaliteit voorspelbaarder?** Ja, om twee redenen die niets met het model te maken
hebben. Ten eerste wordt elke fout aanwijsbaar: staat er een consumentenadviessectie, dan is in de
strategie te zien of die daar gekozen is of dat de schrijver hem bedacht. Nu is dat niet te
onderscheiden. Ten tweede kunnen de vangnetten op beslissingen controleren in plaats van op
formuleringen, en een beslissing heeft maar één vorm. Het risico is een tekst die als ingevuld
formulier leest; daarom krijgt de schrijver de beslissingen en de voorbeelden, niet de velden als
invullijst, en komt er een redacteur na.

---

## 6. Quality gates

### 6.1 Harde blokkades (de pagina gaat niet naar "klaar")

| Blokkade | Waarom hard | Nu |
|---|---|---|
| Een bewering over het bedrijf zonder feit in het register | onjuist onder de naam van de klant | bestaat |
| Een open bronconflict op een feit dat op de pagina staat (§6.3) | de tekst kiest dan een kant of beschrijft de tegenspraak | nieuw |
| Een intern open punt (bestemming A) staat als zin in de tekst | dit is "is niet vastgelegd" | nieuw |
| Een zin die over de bronnen of het werkproces praat ("de beschikbare informatie", "niet vastgelegd", "wordt hier niet genoemd") | de lezer weet niet dat er een proces is | bestaat als waarschuwing, wordt blokkade |
| Een uitgesloten onderwerp staat erin | de beslissing is niet uitgevoerd | nieuw |
| Verboden woord, verboden onderwerp, concurrent bij naam, adres tegen de instructie in | zoals nu | bestaat |
| De lezer wordt aangezet om aanbieders te vergelijken of het bedrijf na te trekken | zoals nu | bestaat |
| Gemengde aanspreekvorm | zoals nu | bestaat |
| Kernfeit uit de strategie ontbreekt | de pagina doet zijn werk niet | bestaat als bevinding |
| De eigenaarstoets zegt "nee, niet publiceren" twee keer op rij | dan is er iets fundamenteels mis, geen detail | nieuw |

### 6.2 Waarschuwingen (de pagina mag door, met een zichtbare melding)
- Lengte meer dan 15 procent boven het budget.
- Meer dan één relativering bij hetzelfde feit, of een relativering direct na een bewijsstuk.
- Hetzelfde feit vaker dan twee keer (bestaat).
- Meer dan één gebiedende zin per 200 woorden die de lezer iets laat regelen.
- Een bewijsstuk uit de voorrangslijst ontbreekt.
- De merkstemtoets meldt een regel als niet gehaald.
- De hoek lijkt op die van een zusterpagina (§9).
- Een FAQ-antwoord korter dan 25 woorden of zonder feit.

### 6.3 Welke bronconflicten tegenhouden

Een conflict houdt tegen als het feit op deze pagina gebruikt zou worden. Staat het betwiste feit
niet in de strategie, dan valt het weg en schrijft de pagina door, met een waarschuwing bij het merk.
Zo blokkeert één oude prijs op een vergeten sitepagina niet alle pagina's.

| Soort | Blokkerend | Reden |
|---|---|---|
| Prijzen en tarieven | ja | de lezer begroot erop; een verkeerde prijs kost de ondernemer een discussie of een klant |
| Openingstijden | ja | een lezer komt voor een dichte deur |
| Adres, vestigingen, contactgegevens | ja | ook een GEO-probleem: een assistent die twee adressen ziet, vertrouwt geen van beide |
| Werkgebied (komen jullie in plaats X) | ja, op pagina's over die plaats | het hele doel van een plaatspagina |
| Diensten (wel of niet aangeboden) | ja, op pagina's over die dienst | een pagina voor een dienst die niet bestaat |
| Certificeringen en keurmerken | ja | juridisch risico |
| Garanties | ja | juridisch risico, en een belofte die de ondernemer moet nakomen |
| Termijnen (levertijd, reactietijd, doorlooptijd) | ja als het een prioriteitsfeit is, anders waarschuwing | de 4-urenbelofte van de hovenier |
| Cijfers als bewijs (jaren ervaring, aantallen) | ja als het een bewijsstuk op de pagina is, anders waarschuwing | "35 jaar" tegenover "30 jaar" op twee pagina's ondermijnt het bewijs |
| Productinformatie (merken, typen) | waarschuwing, blokkerend op een productpagina | minder kritisch, wel storend |
| Werkwijze | waarschuwing, blokkerend als kernfeit | vaak twee beschrijvingen van hetzelfde |

**Wat de adviseur ziet:** per conflict de twee zinnen met bron en datum, het voorstel van L2, en drie
knoppen: dit geldt, dat geldt, vraag het de ondernemer. De keuze wordt een bevestigd feit en het
andere feit krijgt de stand "vervangen". De klant ziet dit scherm niet (sales-led, de adviseur
beheert het profiel).

**Automatisch oplossen** alleen bij een eenduidige rangorde: een antwoord van de klant gaat vóór de
site, en een recentere sitepagina gaat vóór een oudere als ze allebei van de eigen site komen. Ook
dan ziet de adviseur het, als melding.

### 6.4 De publicatiegereedheid

Het doel uit de opdracht: een interne poort, geen rapportcijfer voor de klant.

| Dimensie | Gemeten door | Soort meting |
|---|---|---|
| Feitelijke zekerheid | feitcontrole (code) | aandeel beweringen met een bevestigd feit; hard |
| Volledigheid van de bronnen | strategie tegen register | zijn alle kernonderwerpen onderbouwd of bewust weggelaten |
| Merkfit | L9 | per stemregel gehaald of niet, met zin |
| Natuurlijkheid | L10 plus code | eigenaarsoordeel; code telt relativeringen, adviestoon, bronpraat |
| Redundantie | code | herhaalde feiten, overlap tussen secties en met de FAQ |
| Specificiteit | L10 | zou deze pagina op de site van een concurrent kunnen staan |
| Nut | citeerbaarheidsbeoordelaar | worden de beslisvragen beantwoord |
| Commerciële relevantie | L10 | weet de lezer waarom hij dit bedrijf kiest |
| Leesbaarheid | code | zinslengte, alinealengte, tegen het stemprofiel en niet tegen een vaste norm |
| SEO | code | titel, meta, kop, intentie, interne links |
| GEO | code plus beoordelaar | openingsantwoord, losstaande zinnen, concrete cijfers, organisatie in de gestructureerde data |
| Publicatiegereedheid | poort | geen blokkade, en de eigenaarstoets zegt ja |

**Eén beoordeling of meerdere?** Meerdere, om drie redenen. Eén aanroep die alles doet, gaf in deze
app al eens 100 van de 100 op een pagina waarvan dezelfde aanroep schreef dat de hoofdvraag niet
beantwoord werd (§7.1 van `contentpijplijn-overdracht.md`). Specialisten met één vraag en een eigen
maatstaf (het stemprofiel, het register, de strategie) geven oordelen die je kunt narekenen. En het
belangrijkste oordeel, publiceerbaar of niet, moet vergelijkend zijn: nieuw tegenover de huidige
sitepagina of de vorige versie, en periodiek tegenover een set referentiepagina's die mensen als
goed hebben aangemerkt. Losse cijfers blijven bestaan voor de administratie, maar de poort beslist
op blokkades plus het vergelijkende oordeel.

**Ijking:** elke fase wordt gemeten met dezelfde blinde lezers op dezelfde drie merken (§14). De
eigenaarstoets moet op die set dezelfde volgorde geven als de blinde lezers; de norm uit
`contentpijplijn-overdracht.md` §12.1 (rangcorrelatie 0,6) blijft staan.

---

## 7. De merkstem

### 7.1 Wat er in het profiel staat

| Veld | Wat het vastlegt |
|---|---|
| `aanspreekvorm` | je of u (bestaat) |
| `zelfbenoeming` | hoe het bedrijf zichzelf noemt in de lopende tekst: "we", "wij", "ons team", "onze ploeg", de voornaam |
| `zinslengte` | doelgemiddelde en maximum, gemeten op wat de ondernemer zelf zei en schreef |
| `directheid` | antwoord eerst of aanloop; hoeveel voorbehoud past |
| `uitleg` | hoeveel vakkennis de lezer heeft en hoe vaktermen worden uitgelegd |
| `persoonlijkheid` | hoe warm, hoeveel ik of wij, mag er een knipoog in |
| `commercieel` | hoe hard mag worden aangeprezen; welke woorden te veel verkoop zijn |
| `stelligheid` | hoe bewijs wordt gebracht (feitelijk, trots, bescheiden) en hoeveel relativering past |
| `woorden` | wel: woorden die het bedrijf zelf gebruikt; niet: verboden woorden plus clichés die bij deze stem niet passen |
| `oproep` | hoe een oproep tot actie klinkt, met twee of drie voorbeelden |
| `goedeZinnen` | tien tot twintig zinnen in deze stem, gebouwd op echte feiten van dit bedrijf |
| `fouteZinnen` | tien zinnen die nu in de teksten staan en niet passen, met de verbeterde versie |
| `bronnen` | waar elke regel op rust (gesprek, antwoord van de ondernemer, site) |

**De rangorde van bronnen** is de belangrijkste ontwerpkeuze. Wat de ondernemer zelf zegt (gesprek,
antwoorden) weegt het zwaarst, dan de toon die hij opgaf, dan de sitetekst. Sitetekst is vaak door een
webbureau geschreven en is bewijs, geen wet: bij de installateur is "zakelijk" de opgegeven toon en
"zodat u weer jarenlang zorgeloos kunt genieten van een warm en behaaglijk thuis" de sitezin. Het
profiel moet die spanning zien en kiezen.

### 7.2 Hoe het tot stand komt
1. L3 stelt het op uit alles wat er is (§4).
2. De adviseur ziet het profiel met de voorbeeldzinnen en keurt het goed, past het aan, of zet
   regels uit. Dit hoort bij de voorbereiding van het gesprek of vlak erna; het kost een kwartier.
3. Elke handmatige aanpassing die de klant of adviseur later in een tekst doet, wordt als paar (was,
   werd) bewaard. Na vijf of meer paren stelt L3 een bijgewerkt profiel voor (fase 3).

### 7.3 Waar het gebruikt wordt
- **De strategie** krijgt de samenvatting (commercieel, stelligheid, oproep).
- **De schrijver** krijgt het hele profiel met de goede en foute zinnen. Voorbeelden sturen een model
  sterker dan bijvoeglijke naamwoorden.
- **De redacteur** krijgt het als maatstaf.
- **De merkstemtoets** toetst er regel voor regel tegen.
- **Code** meet wat meetbaar is: zinslengte tegen het doel, aanspreekvorm, verboden woorden en
  clichés, hoe vaak de naam valt.

### 7.4 Hoe dat er voor deze twee klanten uit zou kunnen zien

Ter illustratie, alleen op feiten uit het register; een echt profiel komt uit L3 en de adviseur.

**Hans Verstraaten Hoveniers.** Je-vorm; "we" en "onze ploeg"; korte zinnen, gemiddeld 12 tot 14
woorden; antwoord eerst; vakkennis in gewone woorden; warm door directheid en gastvrijheid, niet door
uitroeptekens of dialect; bewijs feitelijk en zonder voorbehoud ("we doen dit al ruim 35 jaar");
prijs één keer als bandbreedte met de reden van de spreiding, en daarna niet meer herhalen; geen
"ontzorgen", geen "van A tot Z", geen "wij staan graag voor je klaar"; oproep als uitnodiging ("het
eerste gesprek is gratis en bij je thuis").

Een zin uit de pagina voor Best, en dezelfde inhoud in dat profiel:

> Nu: "Tuinaanleg met bestrating kost bij ons meestal €12.000 tot €35.000; het gekozen materiaal
> heeft invloed op de prijs. Dat bedrag is een eerste houvast, geen offerte voor jouw tuin."
>
> In het profiel: "Een complete tuin met bestrating kost bij ons meestal tussen de € 12.000 en
> € 35.000. Vooral de stenen die je kiest maken het verschil."

**Wesley Keeris Installatietechniek.** U-vorm; "wij"; middellange zinnen; elke vakterm direct in
dezelfde zin uitgelegd; zakelijk, geen gevoelswoorden ("zorgeloos", "behaaglijk"); bewijs met cijfers
en stellig (twaalf monteurs in dienst, meer dan 1.800 onderhoudscontracten, CO-gecertificeerd
volgens de Gasketelwet); oproep concreet (telefoonnummer en contactpagina).

> Nu: "U wilt uw cv-ketel in Geldrop vervangen en zoekt vóór een offerte een bruikbare
> prijsindicatie: Wesley Keeris Installatietechniek noemt € 2.200 tot € 3.200 inclusief
> installatie. Dat is een eerste houvast, geen prijs voor uw specifieke woning. De beschikbare
> prijsinformatie benoemt niet welke werkzaamheden standaard in de installatieprijs zitten ..."
>
> In het profiel: "Een nieuwe cv-ketel kost bij Wesley Keeris Installatietechniek tussen de € 2.200
> en € 3.200, inclusief installatie. Welke ketel bij uw woning past, bepalen we samen op basis van uw
> woning, uw energieverbruik en uw wensen. De levertijd is 2 tot 4 weken; de installatie zelf duurt
> één dag."

Wat in die tweede versie ontbreekt (wat er precies in de installatieprijs zit) is geen zin meer maar
een vraag aan de ondernemer (bestemming A). Zodra hij antwoordt, kan het erbij.

---

## 8. Welke feiten wel en niet op de pagina komen

### 8.1 Het principe
Niet "alles wat klopt en relevant is", maar "wat deze lezer nodig heeft om zijn volgende stap te
zetten, en wat dit bedrijf onderscheidt". Een feit komt op de pagina als het aan minstens één van
deze drie doet:

1. **Het beantwoordt een beslisvraag** van deze lezer (prijs, termijn, werkgebied, of dit bedrijf het
   doet).
2. **Het is bewijs** dat voor deze lezer telt (eigen ploeg voor wie bang is voor onderaannemers,
   storingsdienst voor wie een oude ketel heeft).
3. **Het neemt een bezwaar weg** uit het verkoopgesprek ("Hoe lang lig ik met een kale tuin?":
   uitvoering in twee tot drie weken).

En het staat niet op een zusterpagina als hoofdpunt, tenzij het voor deze lezer net zo zwaar weegt.

### 8.2 Hoe de strategie kiest
L5 krijgt het register met per feit soort, bewijskracht en de pagina's waar het al voorop staat, en
de vragen met hun gewicht. Hij kiest drie tot zes prioriteitsfeiten, zet de rest op optioneel of
uitgesloten met een reden, en code rekent na dat elk uitgesloten feit ook echt niet in de tekst
staat. Algemene uitleg (wat is een rookgasafvoer) mag, maar telt als onderwerp en moet een reden
hebben: de lezer heeft hem nodig om een feit te begrijpen.

### 8.3 Noodzakelijke nuance tegenover overbodige relativering
Een voorbehoud mag alleen bij één van deze vijf redenen, en dan één keer per feit:

1. **Geld:** de lezer begroot anders verkeerd. Een bandbreedte is al een voorbehoud; één korte
   reden van de spreiding is genoeg ("vooral de stenen maken het verschil").
2. **Veiligheid:** gas, elektra, bouwkundig.
3. **Wet en regels:** vergunning, subsidievoorwaarden. Eén verwijzing naar de officiële bron, geen
   "controleer zelf of".
4. **Zorg en gezondheid:** bij klanten in de zorg.
5. **De klant wil het:** een voorbehoud dat de ondernemer zelf opgaf.

Nooit: een voorbehoud direct na een bewijsstuk ("35 jaar ervaring, maar dat zegt op zichzelf
niets"), een voorbehoud over wat wij niet weten ("is niet vastgelegd"), een voorbehoud dat een
belofte van de site omdraait, en een voorbehoud op algemene uitleg die niemand als belofte leest. De
strategie legt per onzekerheid vast of hij B is en met welke reden; de feitcontrole en de redacteur
toetsen daartegen.

### 8.4 Lengte, dynamisch
De strategie zet een budget met onderbouwing:

- **Vertrekpunt per paginadoel:** een lokale landingspagina 350 tot 550 woorden, een dienstpagina 450
  tot 750, een uitlegartikel 600 tot 1.100, een vergelijking 500 tot 900.
- **Plus** per extra beslisvraag met een feit ongeveer 80 woorden, per uitleg die nodig is om een
  feit te begrijpen ongeveer 50.
- **Min** wat de bestaande site al goed zegt en waar alleen naar gelinkt hoeft te worden, en wat een
  zusterpagina behandelt.
- **Plafond:** het vertrekpunt plus 30 procent. Daarboven moet de strategie zeggen waarom.

Die getallen zijn een startwaarde en worden geijkt op de blinde lezers. Wat vaststaat: de meeste
pagina's van de hovenier en de installateur zouden met dit budget 450 tot 700 woorden worden in plaats
van 880 tot 980. De eindredactie krijgt de opdracht de tekst naar het budget te brengen door te
schrappen, niet door in te korten. Voor GEO is dat geen verlies: een assistent citeert een korte,
stellige, concrete zin, en de beste citeerbare zin die de blinde lezer bij Best aanwees was precies
zo'n zin ("... doet gemiddeld 2 tot 3 weken over de uitvoering van een complete tuin en plant in het
voorjaar meestal 4 tot 8 weken vooruit").

---

## 9. Elke pagina een eigen reden om te bestaan

### 9.1 Wat een plaatspagina uniek maakt
Niet de plaatsnaam, maar iets wat alleen over die plaats waar is:

- **Echte lokale feiten**, van de ondernemer: projecten in die plaats, hoe vaak hij er werkt, hoe
  snel hij er is, wat hij er vaak tegenkomt. Die zijn er nu niet, omdat niemand erom vraagt. De
  portfoliostap maakt er een vraag van: "Welke tuinen heb je in Best aangelegd die we mogen noemen?"
  of "Hoe lang duurt het voor een monteur in Nuenen is?"
- **Verifieerbare lokale context**, alleen met bron: woningtype of bouwjaar van een wijk als dat voor
  de dienst uitmaakt, een gemeentelijke regel met link. Nooit gegokt.
- **Een andere lezer of vraag** per plaats, als de meting die laat zien.

### 9.2 Wat de portfoliostap beslist
Voor elke groep plaatspagina's rond één dienst:

1. **Is er per plaats iets unieks te zeggen?** Ja: elke pagina krijgt een hoek en een eigen
   voorrangsbewijs. Nee, en de ondernemer kan het ook niet leveren: één werkgebiedpagina
   ("Tuinaanleg in Eindhoven en omgeving: Best, Nuenen, Son en Breugel ...") met per plaats een korte
   alinea, in plaats van vijf dunne pagina's. Dat is voor een menselijke bezoeker beter, en het
   voorkomt dat vijf pagina's met elkaar concurreren om dezelfde vraag.
2. **Verdeling van onderwerpen:** de prijsuitleg staat uitgebreid op één pagina en wordt op de andere
   in één zin genoemd met een link. Hetzelfde voor de werkwijze.
3. **Verdeling van bewijs:** niet elke pagina opent met de ploeg van vijf man. Bij Best misschien de
   terugkomafspraak na zes weken, bij Nuenen de doorlooptijd, als dat bij de lezers daar past.

Dit wijkt af van hoe de opdracht het probleem formuleert, en dat is bewust: het beste antwoord op
"steeds dezelfde pagina met een andere plaatsnaam" is soms minder pagina's. De visie (`docs/visie.md`)
zegt het ook: geen systeem dat zoveel mogelijk content produceert zonder strategie.

### 9.3 Kannibalisatie en overlap bewaken
- **Vóór het schrijven:** elke URL krijgt één primaire intentie in een register per merk. Een nieuwe
  pagina met dezelfde primaire intentie als een bestaande is geen nieuwe pagina maar een
  verbetering of een samenvoeging (het bestaande `existing-page-match.ts` doet dit al gedeeltelijk
  per adres, nog niet per intentie).
- **Na het schrijven:** naast de vijfwoordreeksen een vergelijking op drie dingen: dezelfde
  prioriteitsfeiten (code, uit de strategie), dezelfde opbouw (code, koppen en secties naast elkaar),
  en inhoudelijke gelijkenis per sectie (tekstrepresentaties, een goedkope aanroep per sectie). Hoge
  overlap op alle drie is een waarschuwing met de zusterpagina erbij.
- **Zoekintenties niet verliezen:** de werkgebiedpagina noemt elke plaats in een eigen alinea met een
  eigen kop, en de meetvragen voor die plaatsen blijven gekoppeld aan die ene pagina. Of een
  assistent daarmee net zo vaak het merk noemt als met losse pagina's, is een open vraag die de
  nameting (fase 15 van de keten) moet beantwoorden.

---

## 10. De FAQ

### 10.1 Waar vragen vandaan komen
In volgorde van waarde: de bezwaren uit het verkoopgesprek (die zijn echt), de gemeten vragen waarop
het merk ontbrak, de vervolgvragen die de beoordelaars nu melden, en pas daarna het algemene dossier.

### 10.2 Wanneer een vraag blijft
Alle vier:
1. Een echte lezer van deze pagina stelt hem, in de fase waarin hij is.
2. De tekst beantwoordt hem niet al (code meet overlap met de secties).
3. Het antwoord rust op een feit uit het register of op vaste vakkennis met bron.
4. Het antwoord helpt de lezer richting dit bedrijf, of neemt een drempel weg.

Een vraag zonder onderbouwing wordt geen voorbehoud maar een vraag aan de ondernemer. Een pagina
zonder vragen die aan alle vier voldoen, krijgt geen FAQ. Hoogstens vijf.

### 10.3 Hoe het antwoord eruitziet
Eerste zin het antwoord, dan hoogstens twee zinnen toelichting, 30 tot 80 woorden. Geen herhaling
van een zin uit de tekst.

### 10.4 Wat dit oplost
- "Welke regels gelden in Best voor het afvoeren van regenwater" valt af op 3 (geen feit) en wordt,
  als hij belangrijk is, een vraag aan de ondernemer.
- "Hoeveel moet ik aanbetalen" valt af op 3; de ondernemer weet het vast.
- "Kopen of huren" valt af op 4 bij een bedrijf dat niet verhuurt.
- "Hoe lang lig ik met een kale tuin?" (bezwaar uit het gesprek) komt erin, met twee tot drie weken
  uitvoering en de planning van vier tot acht weken in het voorjaar.

---

## 11. Kosten en doorlooptijd

### 11.1 Nu (gemeten)
Ongeveer $0,18 per geschreven versie over de hovenier en de installateur sinds 24 september 2026:
schrijven $0,071, reparatie $0,057 per ronde, dossier $0,012, al het andere samen minder dan $0,02.

### 11.2 De voorgestelde keten (geschat, te meten)

| Stap | Hoe vaak | Model | Schatting per keer |
|---|---|---|---|
| Feiten classificeren, conflicten | per merk, per batch | luna | $0,01 tot $0,05 per merk |
| Merkstemprofiel | per merk, eenmalig | astra, hoog | $0,20 tot $0,40 |
| Portfolio en hoeken | per plan, per 10 pagina's | sol, hoog | $0,15 tot $0,25, dus ongeveer $0,02 per pagina |
| Onderzoek per pagina | per pagina | luna, web | $0,012 (zoals nu) |
| Paginastrategie | per pagina | sol, hoog | $0,10 tot $0,15 |
| FAQ-selectie | per pagina | luna | minder dan $0,005 |
| Schrijven | per pagina | sol, hoog | $0,12 tot $0,15 |
| Feitcontrole | per versie | luna plus code | $0,005 |
| Eindredactie | 1 tot 2 per pagina | sol, hoog | $0,10 tot $0,13 per ronde |
| Merkstemtoets en eigenaarstoets | per versie | sol, medium | $0,08 tot $0,10 samen |
| Overige beoordelaars | per versie | luna | $0,005 |
| Reparatie | 0 tot 2 per pagina | sol | $0,06 per ronde |

**Per pagina ongeveer $0,70 tot $1,00 op sol.** Met astra voor strategie en eindredactie (vijf keer
de prijs van sol) ongeveer $2 tot $2,50. De per-merkstappen komen daar eenmalig bij, ongeveer $0,50.
Voor een plan van twaalf pagina's betekent dat $9 tot $13 op sol, of $25 tot $30 met astra, tegen
ongeveer $2,20 nu. Het aantal aanroepen per pagina blijft in dezelfde orde (nu ongeveer vijftien,
inclusief de herkeuring na elke reparatieronde), maar het gewicht verschuift van goedkope keuringen
naar drie zware aanroepen die de tekst maken.

Deze schattingen rekenen denktijd als uitvoertokens en zijn gebaseerd op de huidige invoergroottes
(de schrijver krijgt minder invoer dan nu, de strategie meer). Ze zijn niet gemeten, en conventie 10
vraagt dat ze na de eerste ronde op `ai_calls` worden nagerekend.

### 11.3 Doorlooptijd
Per pagina komen er twee tot drie opeenvolgende zware aanroepen bij; met denktijd hoog elk
waarschijnlijk 60 tot 150 seconden. Een pagina duurt dan enkele minuten langer dan nu. Dat voelt niemand, want het draait op de achtergrond. **Het echte risico
is de tijdslimiet per aanroep** (150 seconden, `lib/openai/client.ts`): de reden dat het schrijven nu
op medium staat. Denktijd hoog moet eerst gemeten worden; past het niet, dan zijn er twee
uitwegen: de aanroep in de achtergrondmodus van de API laten draaien en in een volgende taak
ophalen, of de strategie in twee delen knippen.

---

## 12. Haalbaarheid

### Eenvoudig (dagen, weinig risico)
- De verplichting uit het contract halen (systeemregel 10, contractregels a en d, `formatContract`)
  en weglaten toestaan met een `weggelaten`-lijst.
- De "nuanceer"-route uit de reparatie halen.
- Waardeproposities opschonen (herkomst eruit, dubbelingen eruit).
- De FAQ-regel omdraaien (niet de restcategorie, maar de vier criteria) en de code die vragen zonder
  onderbouwing weggooit.
- Bronpraat van waarschuwing naar blokkade.
- Schrijven, strategie en eindredactie op denktijd hoog zetten, na een tijdmeting.

### Middel (een tot twee weken per onderdeel)
- De paginastrategie als nieuwe taaksoort met object en vangnetten, ter vervanging van contract en
  schrijfopdracht.
- De eindredactie als nieuwe taaksoort met logboek en vangnetten.
- Feitsoort, waarde en geldigheid, conflictdetectie en het conflictscherm voor de adviseur.
- Het merkstemprofiel met goedkeuring en de merkstemtoets.
- De eigenaarstoets als vergelijkend oordeel.

### Complex
- De portfoliostap, omdat hij over pagina's heen werkt, de planning raakt (wanneer is de verzameling
  compleet genoeg om te verdelen) en een nieuwe soort advies aan de klant oplevert (samenvoegen).
- De reparatielus omzetten van blokkades naar redactie, zonder de veiligheid te verliezen die nu
  werkt.
- Het leren van handmatige aanpassingen.

### Onzeker
- **Of een sterker model voor de strategie het verschil maakt**, of dat een goede opdracht op sol
  genoeg is. Te toetsen met dezelfde strategie op sol en astra.
- **Of weglaten de citeerbaarheid kost.** Minder secties betekent minder zinnen die een assistent kan
  oppakken. De verwachting is dat stelliger zinnen dat ruim goedmaken; de nameting moet het zeggen.
- **Of een werkgebiedpagina in AI-antwoorden net zo goed werkt als losse plaatspagina's.**
- **Of de redacteur feiten laat staan.** De reparatieknop haalde twee keer een juist klantfeit weg
  (punt 50 en 62); de redacteur heeft dezelfde vangnetten nodig, en die bestaan al (`feitbehoud.ts`).
- **Of de adviseur tijd heeft** voor stemprofiel en conflicten. Een kwartier per merk is het doel.

### Eerst testen
1. **Een handmatige proef zonder bouwen.** Voor vier pagina's (Best en de kostenpagina van de
   installateur, plus twee andere) de strategie, het schrijven en de eindredactie met de hand als
   drie aanroepen draaien, met de prompts uit dit plan, en de blinde lezers laten vergelijken met de
   huidige versie. Kosten: enkele dollars. Dit toetst de kern van het plan voordat er een week in gaat.
2. De tijdmeting van denktijd hoog op het schrijven.
3. De conflictdetectie los draaien op de feitenbanken van de drie merken en tellen hoeveel echte en
   hoeveel valse conflicten eruit komen.

---

## 13. Gefaseerde implementatie

Elke fase eindigt met dezelfde meting: de drie merken van de doorlichting, dezelfde pagina's, dezelfde
blinde lezers (§14). Een fase is pas af als die meting gedaan is (conventie 10).

### Fase 0. De proef (één tot twee dagen)
De handmatige proef uit §12. Uitkomst: gaat het oordeel van de blinde lezers omhoog met alleen
strategie, schrijven en redactie? Zo niet, dan klopt de diagnose niet en moet dit plan eerst herzien.

### Fase 1. De grootste problemen weg (twee tot drie weken)
Doel: geen indekken, geen consumentengids, geen tegenspraak, kortere pagina's.

1. **Weglaten wordt toegestaan en verplicht bij gebrek aan bron.** Contractverplichting eruit,
   `weggelaten`-lijst erin, dekkingspoort meet de gekozen onderwerpen. *Lost op:* "is niet
   vastgelegd", "staat niet als vaste werkwijze vast" (installateur, woningbezoek), en de acht
   algemene secties van de kostenpagina.
2. **Onzekerheid krijgt een bestemming.** A wordt een vraag en de tekst zwijgt, B alleen met een reden
   uit §8.3, C weglaten. Een intern open punt als zin is een blokkade. *Lost op:* "De beschikbare
   prijsinformatie benoemt niet ..." (installateur, kosten), "Deze pagina geeft geen bevestigde
   lokale eis voor Best".
3. **De paginastrategie op sol met denktijd hoog**, in plaats van contract plus schrijfopdracht op
   luna, met lengtebudget. *Lost op:* tien secties en 980 woorden; de consumentenadviessecties
   ("Vergelijk offertes op dezelfde onderdelen").
4. **Conflictdetectie met een blokkade** voor prijzen, termijnen, plaatsen, contactgegevens,
   certificeringen en garanties, en het scherm voor de adviseur. *Lost op:* "De beschikbare
   informatie over de intakeprijs spreekt elkaar tegen" (rijschool), de omgedraaide 4-urenbelofte.
5. **Eén ronde eindredactie** met logboek, gericht op relativering, herhaling en adviestoon. *Lost
   op:* "maar dat zegt op zichzelf niets over het aantal zwemvijvers", de prijsband vier keer op
   Nuenen.
6. **Opschoning van de invoer:** waardeproposities zonder "volgens de website", FAQ volgens de vier
   criteria. *Lost op:* de regenwater- en aanbetalingsvraag bij Best, kopen of huren bij de
   installateur.

**Meetdoel na fase 1:** gemiddeld cijfer van de blinde lezers minstens 6,5 (nu 4,9), minstens de
helft "publiceert zo" (nu 4 van 21), nul teksten met een zin over de bronnen.

### Fase 2. De stem en de keuring (twee tot drie weken)
1. **Merkstemprofiel** met goedkeuring door de adviseur, gebruikt door schrijver en redacteur.
   *Lost op:* "Wij staan graag voor je klaar", "zorgeloos genieten van een warm en behaaglijk thuis"
   in een zakelijke stem, de naam aan het begin van elke alinea.
2. **Merkstemtoets en eigenaarstoets** als vergelijkend oordeel; de reparatie stuurt daarop.
3. **Feitenregister met soort, waarde en bewijskracht**, en de bewijsbank met de regel "stellig tenzij".
   *Lost op:* twaalf monteurs en 1.800 contracten die niet in de Geldrop-pagina staan.
4. **FAQ-selectie als eigen stap** (L6).
5. **Een lichte versie van uniciteit:** de strategie krijgt de korte inhoud en de gekozen feiten van
   de zusterpagina's mee, en een waarschuwing bij overlap in feiten en opbouw. *Lost op:* de
   gelijke opbouw van Best en Nuenen, gedeeltelijk.

**Meetdoel na fase 2:** gemiddeld minstens 7,0, minstens 70 procent "publiceert zo", nul "nee";
de eigenaarstoets geeft dezelfde volgorde als de blinde lezers (rangcorrelatie 0,6 of hoger).

### Fase 3. De architectuur (vier weken of meer)
1. **Portfoliostap per plan**, met het advies samenvoegen of eerst vragen, en het register van
   primaire intenties per merk. *Lost op:* plaatspagina's die templates zijn.
2. **Lokale vragen aan de ondernemer** vanuit het portfolio.
3. **Leren van handmatige aanpassingen** in het stemprofiel.
4. **Modelroutering op basis van metingen:** astra waar het aantoonbaar helpt, een beoordelaar van een
   andere leverancier als dat de volgorde verbetert.
5. **De reparatielus volledig vanuit de redactie**, en de oude formuleringlijsten terugbrengen tot
   een klein vangnet.
6. **Ijking van de getallen** (lengtebudget, drempels) op de gemeten rondes.

**Meetdoel na fase 3:** gemiddeld minstens 7,5, minstens 80 procent "publiceert zo", en de
nameting laat zien dat de pagina's in AI-antwoorden niet slechter scoren dan de huidige.

---

## 14. Wanneer een pagina publicatiewaardig is

### 14.1 De toets
**Zou de ondernemer deze pagina zonder aanvullende copywriting op zijn eigen website publiceren?**
Gemeten door dezelfde blinde lezers als in de doorlichting, met de vraag uit
`kwaliteitsdoorlichting/poort19/` ("ondernemer publiceert: zo, met aanpassingen, nee"), en per
versie door de eigenaarstoets. Een pagina is publicatiewaardig als het antwoord "zo" is, en de
eigenaarstoets en de poort het met elkaar eens zijn.

### 14.2 De criteria per pagina

**Juist**
1. Elke bewering over het bedrijf rust op een feit uit het register (bestaat, blijft hard).
2. Geen feit met een open conflict.
3. Geen zin over bronnen, informatie of het werkproces ("beschikbare informatie", "niet vastgelegd",
   "wordt hier niet genoemd", "valt niet af te leiden").

**Gekozen**
4. De opening beantwoordt de hoofdvraag in hoogstens twee zinnen, met een concreet feit.
5. De lezer weet binnen de eerste vijfde van de tekst waarom hij dit bedrijf zou kiezen.
6. Elke sectie hoort bij een onderwerp dat de strategie koos; geen uitgesloten onderwerp.
7. Lengte binnen het budget, hoogstens 15 procent erboven.
8. Geen feit vaker dan twee keer, en de prijs hoogstens één keer met toelichting.

**Stellig waar het kan**
9. De bewijsstukken uit de voorrangslijst staan erin, zonder voorbehoud erachter.
10. Hoogstens één voorbehoud per pagina buiten de gevallen van §8.3, en geen enkel voorbehoud direct
    na een bewijsstuk.
11. Geen zin die de lezer aanzet om aanbieders te vergelijken, offertes na te lopen of het bedrijf
    na te trekken.

**Van dit bedrijf**
12. Aanspreekvorm consistent (bestaat).
13. De merkstemtoets meldt geen regel als duidelijk niet gehaald.
14. Geen cliché uit de foutlijst van het stemprofiel.
15. De naam in de eerste alinea en de afsluiting, niet aan het begin van andere alinea's (bestaat).
16. De eigenaarstoets vindt hem beter dan de huidige sitepagina of de vorige versie.

**Uniek en nuttig**
17. Een plaatspagina heeft minstens één feit dat alleen over die plaats waar is, of is onderdeel van
    een werkgebiedpagina.
18. Geen hoge overlap met een zusterpagina op feiten, opbouw en inhoud tegelijk.
19. Elke FAQ-vraag voldoet aan de vier criteria van §10.2; nul vragen is toegestaan.

**Vindbaar**
20. Metatitel en -beschrijving binnen de grenzen, met plaats en dienst waar dat de intentie is.
21. Minstens één losstaand citeerbare zin per sectie, met een concreet feit.
22. De organisatie in de gestructureerde gegevens (bestaat).

### 14.3 De acceptatietest voor dit plan
De proefset uit `docs/tasks/kwaliteitsdoorlichting/`: dezelfde drie merken, dezelfde clusters en
pagina's, hetzelfde waarheidsdossier, dezelfde antwoorden van de klant, dezelfde blinde lezers en
dezelfde vragenlijst. Per fase:

| Maat | Nulmeting | Herhaling (nu) | Na fase 1 | Na fase 2 | Na fase 3 |
|---|---|---|---|---|---|
| Gemiddeld copywritercijfer | 4,1 | 4,9 | 6,5 of hoger | 7,0 of hoger | 7,5 of hoger |
| Publiceert zo | 0 van 16 | 4 van 21 | de helft | 70 procent | 80 procent |
| Publiceert niet | 5 van 16 | 6 van 21 | hoogstens 2 | 0 | 0 |
| Zinnen over bronnen of werkproces | niet geteld | 63 en 61 indekformuleringen bij installateur en hovenier (ruwe telling) | 0 | 0 | 0 |
| Gemiddelde lengte, landingspagina | niet geteld | ongeveer 700 | binnen budget | binnen budget | binnen budget |
| Rangcorrelatie eigenaarstoets met blinde lezers | n.v.t. | +0,29 (vakmanschap, 3 september) | gemeten | 0,6 of hoger | 0,6 of hoger |

Daarnaast per tekst uit de opdracht de concrete controle dat de genoemde zin weg is en niet door een
nieuwe formulering van hetzelfde gat is vervangen:

| Tekst | Zin die weg moet | Door welke wijziging |
|---|---|---|
| Installateur, kosten | "De beschikbare prijsinformatie benoemt niet welke werkzaamheden standaard in de installatieprijs zitten" | onzekerheid A, strategie |
| Installateur, kosten | "die zegt op zichzelf niets over welke afzonderlijke werkzaamheden in een installatieprijs zijn opgenomen" | stelligheidsregel, redactie |
| Installateur, woningbezoek | "Welke van deze punten tijdens een ketelbezoek worden bekeken, staat niet als vaste werkwijze vast." | weglaten toegestaan, blokkade op intern open punt |
| Installateur, Geldrop | "dat is een eerste beeld van de planning, geen garantie voor iedere woning" | stelligheidsregel, redactie |
| Installateur, Geldrop | twaalf monteurs en 1.800 contracten ontbreken | bewijsbank, strategie |
| Hovenier, Best | "Vergelijk dezelfde werkzaamheden en afwerking" als sectie | strategie, geen consumentengids |
| Hovenier, Best | FAQ over regenwater en aanbetaling | FAQ-criteria |
| Hovenier, Best | "Wij staan graag voor je klaar." | merkstemprofiel |
| Hovenier, Nuenen | de prijsband vier keer | redactie, herhalingscontrole |
| Hovenier, Best en Nuenen | dezelfde opbouw en dezelfde feiten | portfolio, zusterpagina's in de strategie |
| Hovenier, zwemvijver | "Wij hebben meer dan 35 jaar ervaring, maar dat zegt op zichzelf niets ..." | stelligheidsregel, redactie |
| Rijschool, intake | "De beschikbare informatie over de intakeprijs spreekt elkaar tegen" | conflictdetectie en blokkade |

---

## 15. Wat ik aan de eigenaar voorleg

Drie beslissingen die de uitkomst wezenlijk veranderen, en die ik niet zelf wil nemen:

1. **Mag ORBIT ENGINE adviseren om minder pagina's te maken?** Voor plaatsen zonder eigen feiten stelt
   dit plan een werkgebiedpagina voor in plaats van losse pagina's. Dat kan ingaan tegen wat er in
   het verkoopgesprek beloofd is.
2. **Wie beheert conflicten en het stemprofiel?** Dit plan legt ze bij de adviseur (sales-led). Dat
   kost per merk een kwartier tot een half uur extra, vóór de eerste pagina.
3. **Welk kostenniveau als standaard?** Sol voor alles (ongeveer $0,70 tot $1,00 per pagina) of
   astra voor strategie en redactie (ongeveer $2 tot $2,50). Mijn advies: sol als standaard, astra
   in fase 0 en fase 1 naast sol proberen op dezelfde pagina's, en alleen overstappen als de blinde
   lezers het verschil zien.

En één punt waar dit plan afwijkt van de opdracht: die stelt voor een bronconflict de hele pagina te
blokkeren. Dit plan blokkeert alleen als het betwiste feit op de pagina nodig is, en laat het anders
weg met een melding bij het merk. Anders houdt één oude prijs op een vergeten sitepagina alle
pagina's van een klant tegen.
