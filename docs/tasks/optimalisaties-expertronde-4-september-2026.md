# Optimalisaties uit de expertronde van 4 september 2026

**Status op 4 september 2026, eind van de dag: de product owner heeft alles gekozen, en alles is
gebouwd behalve nummer 17.** Wat er van elk nummer geworden is, staat in de statusregel eronder en
uitgebreider in `docs/logbook.md`. Nummer 17 is afgevallen op een meting, en die staat hieronder bij
het nummer zelf.

| Blok | Nummers | Status |
|---|---|---|
| A, de tegenstrijdigheden | 1, 2, 3, 4, 18 | gebouwd |
| B, de redactionele beslislaag | 5, 6, 7, 12 | gebouwd, migratie 0094 staat op productie |
| C, de keuring | 11, 13 | gebouwd |
| D, vorm en volledigheid | 8, 9, 10, 15, 16, 19 | gebouwd |
| Afgevallen | 17 | niet gedaan, zie de meting bij dat nummer |
| Bewust ongemoeid | 14 | geen werk, en dat is de keuze |

⚠️ **Gebouwd is niet geverifieerd (conventie 10).** Geen van deze wijzigingen is tegen een nieuwe
echte ronde gelegd. Wat vaststaat is dat de instructies elkaar niet meer tegenspreken en dat de
controles doen wat ze zeggen; of de teksten beter worden, zegt alleen de nameting.

De ruwe feedback van de externe copywriter en de externe AI-expert staat letterlijk in
[`content-reviews/feedback/expertronde-copywriter-en-ai-4-september-2026.md`](../../content-reviews/feedback/expertronde-copywriter-en-ai-4-september-2026.md).
Dit document is de interpretatie ernaast: elk punt gesorteerd in een instructie die anders moet, een
stap die ontbreekt, een aanname die niet klopt, of iets dat al gebouwd is en dat de expert niet kon
zien. Die werkwijze stond in `docs/tasks/overdracht-expertfeedback.md`, het overdrachtsdocument dat
deze ronde inleidde; dat bestand is verwijderd toen de feedback verwerkt was, zoals het zelf
voorschreef. Wat eruit bewaard moest blijven, staat in `docs/logbook.md` en in `CLAUDE.md`.

## 0. Wat de experts samen zeggen, in één alinea

De pijplijn is goed in het voorkomen van slechte tekst en nog niet goed in het veroorzaken van
uitstekende tekst. Alle negentien controles bewaken wat er niet mag; niets in de keten beslist wat
er per se wél gezegd moet worden. De schrijver krijgt achttien blokken informatie die allemaal
dezelfde status hebben, terwijl een copywriter er eerst zes uitkiest en de rest laat liggen. De
twee dingen die de experts daarom als eerste willen: een compacte redactionele tussenstap vlak vóór
het schrijven, en de vraag "waarom zou juist deze lezer dit bedrijf kiezen" als expliciete stap in
plaats van als hoop.

## 0.1 Vier dingen die de experts niet konden zien, en die de lijst veranderen

Zij kennen de codebase niet. Vier van hun punten kloppen niet helemaal, en dat verschuift de
prioriteiten.

**1. De beoordelaar kiest niet welke pagina eerst gerepareerd wordt.** Beide experts bouwen hun
belangrijkste argument voor pairwise beoordelen op die aanname ("welke pagina verdient mijn dure
reparatie"). Er bestaat geen wachtrij die pagina's tegen elkaar afweegt. `beslisReparatieRonde()`
in `content-repair-decision.ts` werkt per pagina, en de reparatie start zodra de score onder de
drempel van het paginatype ligt of er een openstaande bevinding is. De rangorde is dus wél een
probleem, maar op een andere plek dan zij denken: hij bepaalt of een pagina boven of onder de
drempel van 70 tot 78 uitkomt, en dus of hij "klaar" heet of gerepareerd wordt. Waar een
vergelijkend oordeel rechtstreeks past, is de keuze tussen twee VERSIES van dezelfde pagina, en die
wordt nu gemaakt door twee absolute cijfers van elkaar af te trekken. Zie optimalisatie 11.

**2. Het onderscheid blokkade, correctie en verbeterkans bestaat al.** Ronde 1 punt 16 vraagt erom.
`quality-issue.ts` kent `blokkerend`, `hoog`, `midden` en `laag`, precies zes bevindingen blokkeren,
en de reparatie kiest op ernst maal zekerheid. Dat is een gat in het overdrachtsdocument en geen gat
in de app. Zie optimalisatie 19.

**3. De regel over de merknaam is al begrensd.** Ronde 2 punt 13 waarschuwt voor "MJB Dakservice
doet, MJB Dakservice werkt, MJB Dakservice controleert", sectie na sectie. Die begrenzing is er op
3 september gekomen: de wij-vorm mag overal behalve in de citeerbare zinnen, en `checkMerkstem()`
meet het na. Wat er wél nog mis is, is erger dan wat hij aanwijst: de redactionele beoordelaar
straft de wij-vorm nog steeds af. Zie optimalisatie 1.

**4. Er staat een tweede, ongebruikte kopie van de redactieprompt in de code.** `CRITIQUE_SYSTEM` in
`content.ts` regel 304 is een oudere kopie van `REDACTIE_SYSTEM` in `content-panel.ts` en wordt
nergens aangeroepen. Wie de prompts bijwerkt, werkt de helft van de tijd de verkeerde bij. Zie
optimalisatie 18.

---

## A. Tegenstrijdigheden in wat er nu staat

Deze vier kosten weinig en zijn zeker, want ze repareren een instructie die een andere instructie
tegenwerkt. Ze horen als eerste, ongeacht wat er verder gekozen wordt.

### 1. De beoordelaar mag de merkstem niet meer afstraffen

**Soort:** een instructie die anders moet.
**Wat er nu gebeurt.** De schrijfprompt zegt sinds 3 september: noem het merk in de eerste alinea en
in de eerste zin van elke sectie, en schrijf daarbuiten in de wij-vorm. De redactionele beoordelaar
in `content-panel.ts` beoordeelt in diezelfde ronde of "het bedrijf EXPLICIET bij naam genoemd wordt
in plaats van 'wij'/'ons'". De pagina die de nieuwe regel netjes volgt, verliest dus punten bij de
keuring, en de reparatieronde die daarop volgt draait de merkstem terug. Dit is de duurste soort
fout die er is: hij kost een reparatieronde van $0,083 om iets ongedaan te maken dat goed was.
**Wat er verandert.** Het GEO-criterium wordt wat de expert voorstelt: is de koppeling tussen het
bedrijf en het antwoord in de citeerbare passages ondubbelzinnig? Niet: staat de naam er in plaats
van "wij".
**Vangnet.** Bestaat al (`checkMerkstem`, `checkOpening`). Er komt een test bij die vastlegt dat een
pagina met de merknaam in de opening en de wij-vorm daarbuiten geen bevinding meer oplevert.
**Effort:** klein, ongeveer een uur. **Verwachte impact: hoog.** Dit is vermoedelijk de reden dat de
merkstem in een reparatieronde alsnog verdwijnt.

### 2. De opening mag niet tegelijk twee dingen moeten zijn

**Soort:** een instructie die anders moet.
**Wat er nu gebeurt.** De schrijver moet de eerste zin over de lezer laten gaan. De beoordelaar
controleert of "de doelvraag letterlijk beantwoord wordt in de eerste twee zinnen". Bij een pagina
die met de situatie van de lezer opent, is er nog maar één zin over voor het antwoord.
**Wat er verandert.** De beoordelaar kijkt naar de eerste ALINEA, net als de code al doet
(`eersteAlinea()` leest 600 tekens).
**Vangnet.** `checkOpening` meet dit al; er komt een test bij op een opening die eerst de lezer
benoemt en daarna antwoordt.
**Effort:** klein, een uur. **Verwachte impact: middel.** Minder bevindingen die geen fout zijn, dus
minder reparatierondes die niets oplossen.

### 3. De menselijke ijkpunten worden principes in plaats van cijfers

**Soort:** een instructie die anders moet.
**Wat er nu gebeurt.** In de vakmanschapsprompt staat letterlijk "dat was met 2,6 van 5 zijn laagste
cijfer" plus voorbeeldzinnen uit twaalf beoordeelde pagina's. Beide experts waarschuwen hiervoor:
een beoordelaar die één copywriter leert nadoen, beoordeelt die copywriter en niet de tekst. Het
cijfer 2,6 is bovendien een anker dat elke pagina naar hetzelfde midden trekt, en dat is precies de
fout die de rangorde nu al heeft.
**Wat er verandert.** De ijkpunten worden regels zonder cijfers en zonder herkomst: "een gratis
aanbod dat als een risico klinkt is slecht geschreven", "een pagina die de lezer huiswerk geeft in
plaats van antwoord scoort laag op specificiteit". De concrete voorbeeldzinnen blijven als
illustratie, het cijfer en de verwijzing naar één persoon verdwijnen.
**Vangnet.** Geen nieuw vangnet mogelijk, wel een test die vastlegt dat er geen cijfer meer in de
prompt staat.
**Effort:** klein, een uur. **Verwachte impact: middel**, en het is vooral een risico dat wordt
weggenomen.

### 4. De reparatieprompt volgt dezelfde begrenzing als de schrijfprompt

**Soort:** een aanname die nagerekend moet worden.
**Wat er nu gebeurt.** `REPAIR_SYSTEM` is op 3 september meegegaan met de begrenzing van regel 3,
maar het is nooit nagerekend of de reparatie ook de bewijspunten, de klantcitaten en de lezersopdracht
meekrijgt. Krijgt hij die niet, dan haalt elke reparatieronde eruit wat de schrijfronde er net in
heeft gezet.
**Wat er verandert.** Eerst narekenen in de code, daarna hooguit drie blokken toevoegen aan de
reparatieopdracht: de lezer, de gekozen bewijspunten en het citaat dat behouden moet blijven.
**Vangnet.** Een ketentest die een pagina door een reparatieronde haalt en nameet dat de bewijspunten
en het citaat er daarna nog staan.
**Effort:** klein voor het narekenen, middel als er iets moet. **Verwachte impact: hoog als het
misgaat, nul als het goed staat.** Dit is het soort punt waar de vorige sessie in is gelopen: eerst
meten.

---

## B. De redactionele beslislaag

Dit is waar beide experts het meeste van verwachten. Vier onderdelen, oplopend in omvang.

### 5. De schrijfopdracht (de Writer Brief)

**Soort:** een stap die ontbreekt.
**Wat er nu gebeurt.** De schrijver krijgt achttien blokken die allemaal even zwaar wegen. Niets
zegt welke drie feiten van de twintig er vandaag toe doen.
**Wat het wordt.** Eén goedkope AI-stap tussen de voorbereiding en het schrijven, op de goedkope
tier met denkvermogen "low", geschat op $0,01 per pagina. Hij doet geen onderzoek en voegt geen
informatie toe: hij kiest. Negen korte velden, precies zoals de expert ze opsomt: de lezer in één
zin, de hoofdvraag, het kernantwoord, waarom deze pagina voor deze lezer bestaat, de drie tot vijf
eigenschappen van dit bedrijf die voor déze lezer tellen, wat de ondernemer kan zeggen wat een
concurrent niet kan kopiëren, wat er absoluut in moet, wat er op deze pagina juist niet mag, en de
ene gedachte die na het lezen moet blijven hangen.
**Waar hij komt.** Als eigen stap in de schrijfketen, ná de vragen aan de ondernemer en vóór
`content_draft`, zodat hij de antwoorden van de klant meeneemt. Conventie 7 (één zware aanroep per
taak) blijft staan: dit is een lichte aanroep.
**Wat de schrijver dan krijgt.** Niet minder informatie, maar een hiërarchie erboven: de feitenkaart
blijft compleet, en de opdracht zegt welke F-nummers deze pagina dragen.
**Vangnet, en dit is het belangrijkste onderdeel.** Een opdracht die het model negeert is een dure
lege huls. Vier controles in code: de gekozen F-nummers moeten terugkomen in `claims` of
`proofPoints`, het kernantwoord moet met dezelfde woordoverlap van 0,6 als bij de bewijspunten in de
eerste alinea staan, de pagina-specifieke verboden worden per stuk nagerekend waar dat kan, en een
opdracht met een leeg veld vervalt in zijn geheel (conventie 3: onbekend is beter dan verkeerd).
**Migratie.** Additief: `content_pieces.writer_brief_json`, default `'{}'`.
**Effort:** groot, twee tot drie dagen inclusief tests en het scherm waarop de opdracht te zien is.
**Verwachte impact: hoog, en het is de enige optimalisatie die zichzelf kan terugverdienen.** Eén
vermeden reparatieronde kost $0,083 en deze stap kost $0,01. Op de ronde van 3 september hadden vier
van de twaalf pagina's een tweede of derde ronde nodig.
**Risico.** Middel. Een negende blok dat niets stuurt maakt de prompt langer en de pagina niet beter.
Daarom staan de vier controles hierboven er niet als bijzaak bij.

### 6. "Waarom zou juist deze lezer dit bedrijf kiezen" wordt een verplicht veld

**Soort:** een stap die ontbreekt, en het is de vraag waarmee de menselijke copywriter zijn hele
beoordeling samenvatte.
**Wat er nu gebeurt.** Nergens in de keten staat die vraag. `value_props` uit het merkprofiel is het
dichtstbijzijnde, en dat is een lijst die voor elke pagina hetzelfde is.
**Wat het wordt.** Eén tot drie eigenschappen van dit bedrijf, gekozen vanuit de lezer en niet
vanuit het bedrijf, met per stuk het F-nummer en de reden waarom het voor DEZE lezer telt. Het
verschil dat de expert benoemt: "de lezer heeft haast, dus de spoedservice binnen 24 uur telt", niet
"het bedrijf heeft vier dakdekkers".
**Vangnet.** De keuzereden moet in de eerste twintig procent van de pagina staan, precies regel 4
van de menselijke copywriter, en het F-nummer moet bestaan.
**Effort:** klein tot middel als 5 doorgaat, want dan is het één veld van de opdracht. Middel als
het los gebouwd wordt.
**Verwachte impact: hoog op overtuigingskracht**, de dimensie die met 2,6 van 5 het laagst stond.

### 7. Bewijspunten krijgen een derde stap: relevantie voor deze lezer

**Soort:** een instructie die anders moet.
**Wat er nu gebeurt.** `bewijspunten.ts` kent feit en betekenis. De expert wijst erop dat dat één
stap te kort is: "u weet wie er op uw dak komt" is betekenis, maar waarom dat voor déze lezer telt
staat nergens.
**Wat er verandert.** Een derde veld per bewijspunt, en de keuze van de drie tot vijf feiten wordt
expliciet vanuit de lezersopdracht gemaakt in plaats van vanuit de volgorde op de kaart.
**Vangnet.** Bestaat al voor de eerste twee stappen. Nieuw: de drie tot vijf gekozen feiten mogen
niet op meer dan de helft van de pagina's van dezelfde ronde dezelfde zijn, wat `checkHerhaling()`
al meet maar nu op de bewijspunten in plaats van op de hele tekst.
**Effort:** klein, een halve dag. **Verwachte impact: middel.** Het is een verfijning van iets dat er
al staat.

### 8. Het contract wordt een verhaal in plaats van een vragenlijst

**Soort:** een stap die half ontbreekt, en het stond al als openstaand punt in
`contentkwaliteit-copywriterronde.md` §7.6.
**Wat er nu gebeurt.** De inhoudsopgave wordt per deelvraag opgebouwd, één sectie per vraag. De
promptregel "maak van de meeste koppen een mededeling" staat alleen bij de schrijver, dus die moet
een vragenlijst als verhaal opschrijven. Gemeten op 3 september: 169 van de 228 koppen was een vraag
en één pagina had 26 secties.
**Wat er verandert.** Het contract krijgt per paginatype een boog: probleem, herkenning, gevolg,
oplossing, bewijs, bezwaar, zekerheid, actie. De deelvragen blijven de inhoud, de boog bepaalt de
volgorde.
**Vangnet.** Een bovengrens op het aantal secties per paginatype, en de bestaande controle op
vraagkoppen. De grens wordt gekozen op de gemeten spreiding van de twaalf pagina's en het getal komt
in het commentaar te staan.
**Effort:** middel, een dag. **Verwachte impact: middel tot hoog.** Dit is de tweede oorzaak van "het
leest als een FAQ-dump", naast de koppen.
**Risico.** Middel: de dekkingspoort rekent het contract sectie voor sectie na, dus een andere
sectie-indeling raakt een controle die vandaag werkt.

### 9. De FAQ-blokken worden voor het eerst bekeken

**Soort:** een stap die ontbreekt, en niemand heeft er ooit naar gekeken.
**Wat er nu gebeurt.** Tien van de twaalf pagina's hebben acht vraag-en-antwoordblokken onderaan,
soms een woordelijke kopie van een sectie twintig regels hoger. Er is geen enkele controle op
overlap tussen de FAQ en de tekst erboven. De menselijke copywriter, regel 16: een FAQ is geen
vervanging voor een goed verhaal.
**Wat er verandert.** Een bovengrens op het aantal blokken per paginatype, en een controle op
woordoverlap tussen elk FAQ-antwoord en de tekst erboven, met dezelfde vergelijking die
`checkHerhaling()` gebruikt.
**Vangnet.** Dit ís het vangnet. Meetbaar op de twaalf bestaande pagina's voordat de grens gekozen
wordt.
**Effort:** middel, een dag. **Verwachte impact: middel.** Het haalt zichtbaar dubbele tekst weg
onder elke pagina die de klant publiceert.

### 10. De lezersopdracht wordt op kwaliteit gecontroleerd, niet alleen op aanwezigheid

**Soort:** een aanname die niet klopt.
**Wat er nu gebeurt.** V7 blokkeert een pagina zonder lezer. Maar `bepaalLezersopdracht()` accepteert
elke gevulde zin, ook "mensen die dakisolatie zoeken". Dat is precies het voorbeeld dat de expert
als slecht aanwijst, en het haalt de poort.
**Wat er verandert.** De opdracht moet drie delen hebben: type persoon, probleem, beslissing. Een
zin zonder werkwoord of zonder situatie telt niet als lezer.
**Vangnet.** Een deterministische vormcontrole vóór de dure aanroep, dezelfde plek als de bestaande
poort.
**Effort:** klein, een halve dag. **Verwachte impact: middel.** Zonder dit is de nulmeting "0 van 12
pagina's zonder lezer" te makkelijk groen.

---

## C. De keuring

### 11. Twee versies van dezelfde pagina worden vergelijkend beoordeeld

**Soort:** een stap die ontbreekt, en de enige plek waar pairwise beoordelen vandaag echt past.
**Wat er nu gebeurt.** Na elke reparatieronde beslist `beslisReparatieRonde()` op het verschil tussen
twee absolute cijfers of de nieuwe versie de oude vervangt en of er nog een ronde volgt. Die twee
cijfers komen van een beoordelaar waarvan we gemeten hebben dat zijn ordening niet klopt
(rangcorrelatie 0,29). Een verschil van twee punten is bij die betrouwbaarheid ruis, en toch beslist
het over $0,083 aan reparatie en over welke tekst de klant krijgt.
**Wat er verandert.** Eén extra goedkope aanroep na een reparatieronde: hier zijn versie A en versie
B, welke zou een goede copywriter eerder naar de klant sturen, en waarom. Dat oordeel telt mee naast
de score, met de blokkades altijd zwaarder, zoals nu al.
**Vangnet.** Het oordeel mag nooit een versie met méér blokkades laten winnen; dat is code en geen
model. Valt de aanroep uit, dan blijft de bestaande regel gelden.
**Effort:** middel, een dag. **Verwachte impact: hoog op de eindtekst die de klant krijgt**, en het
kost ongeveer $0,003 per reparatieronde.

### 12. De vakmanschapsbeoordelaar krijgt de schrijfopdracht mee

**Soort:** een stap die ontbreekt, en hij hangt aan 5.
**Wat er nu gebeurt.** De beoordelaar oordeelt of dit "de pagina is die een goede copywriter
geschreven zou hebben", zonder te weten wat de pagina moest bereiken. Hij vergelijkt de tekst dus
met een ideaal dat hij zelf verzint.
**Wat er verandert.** Hij krijgt de opdracht uit 5 en beoordeelt tegen dat mandaat: is de lezer
bediend, staat de kernboodschap er, is de keuzereden gemaakt.
**Vangnet.** Geen nieuw vangnet, wel een scherper oordeel op iets dat al gemeten wordt.
**Effort:** klein als 5 er is. **Verwachte impact: middel tot hoog op de rangorde**, want een
beoordelaar met een maatstaf ordent beter dan een beoordelaar met een gevoel.

### 13. `herkenning` gaat meetellen zodra er een controle naast staat

**Soort:** openstaand punt (V11), en het schendt vandaag conventie 1.
**Wat er nu gebeurt.** De zevende dimensie wordt gescoord en telt nergens in mee.
**Wat er verandert.** Een deterministische tegenhanger: opent de pagina met een concrete situatie of
met het bedrijf en het onderwerp. Dat is deels te tellen (`checkOpening` doet de helft al). Pas
daarna mag het cijfer meewegen.
**Effort:** middel. **Verwachte impact: laag tot middel**, en het maakt een half afgebouwd onderdeel
af.

### 14. De vier beoordelaars blijven met rust gelaten

Beide experts noemen de scheiding tussen redactie, feitelijkheid, citeerbaarheid en vakmanschap
uitdrukkelijk goed. Er verandert niets aan het aantal, aan het parallel draaien of aan het zacht
falen. Dit staat in de lijst zodat de keuze zichtbaar is en niet stilzwijgend.

---

## D. Kleiner werk dat de rest ondersteunt

### 15. De doellengte per sectie wordt afgedwongen in plaats van gevraagd

Het contract spreekt een richtlengte per sectie af en niets rekent na of de sectie die haalt. De
dekkingspoort kijkt alleen of de deelvraag beantwoord is. Een sectie van twee zinnen kan dus dekken
en toch dun zijn. **Effort:** klein. **Impact:** laag tot middel.

### 16. Slappe formuleringen en gebiedende zinnen worden per sectie geteld

Nu is het een telling per honderd woorden over de hele pagina, en op 3 september zat 23 van de 72
gebiedende zinnen op één pagina en waarschijnlijk in een handvol secties. Een telling per sectie
wijst de reparatie naar de plek waar het misgaat in plaats van naar de pagina als geheel.
**Effort:** klein. **Impact:** middel voor de gerichtheid van de reparatie.

### 17. De reparatieopdracht krijgt hoogstens drie bevindingen in plaats van tien

**GAAT NIET DOOR, en dat is gemeten.** Het voorstel rustte op de aanname dat tien bevindingen over
vijf secties de halve pagina opnieuw laten schrijven. Nagerekend op productie over de twaalf
pagina's met een keuring, met dezelfde prioritering die de reparatie gebruikt (ernst maal zekerheid):

| Wat | Gemeten |
|---|---|
| bevindingen per pagina | 46 tot 78 |
| secties die de top tien raakt | 0 tot 3, mediaan 1 |
| secties die de top vijf raakt | 0 of 1 |

De zwaarste bevindingen hebben meestal helemaal geen sectie (ze gelden voor de hele pagina) en de
rest zit in één tot drie secties. Verlagen naar drie zou bevindingen weggooien zonder de reparatie
gerichter te maken. De grens blijft op tien.

### 18. De dode kopie van de redactieprompt verdwijnt

`CRITIQUE_SYSTEM` in `content.ts` wordt nergens aangeroepen en is een oudere versie van de prompt die
wél draait. Weghalen. **Effort:** tien minuten. **Impact:** laag nu, hoog op de dag dat iemand de
verkeerde bijwerkt.

### 19. Het overdrachtsdocument wordt bijgewerkt

`docs/contentpijplijn-overdracht.md` beschrijft de ernstgraden niet, waardoor een expert een
verbetering voorstelde die er al is, en hij beschrijft de pijplijn zoals hij vóór deze ronde was.
Bijwerken hoort bij elke gekozen optimalisatie in dezelfde commit. **Effort:** klein per wijziging.
**Impact:** hoog voor de volgende doorlichting.

---

## E. Wat wij NIET gaan doen, en waarom

Stap 3 van de werkwijze: liever opgeschreven dan verzwegen.

1. **Geen A/B-test van de schrijfopdracht.** De expert vraagt er in ronde 2 punt 21 om. De product
   owner heeft besloten dat er niet getest wordt of de wijzigingen werken voordat ze doorgevoerd
   worden. De opdracht gaat er dus in één keer in.
2. **Geen 2x2-test van Sol tegenover Terra.** Beide rondes noemen dit hun waardevolste experiment.
   De overstap naar Terra is definitief, dus de vergelijking heeft geen beslissing meer om te
   ondersteunen. Gevolg dat wel benoemd moet worden: de zin "Terra is net zo goed als Sol" blijft
   een aanname en mag nergens als vaststelling opgeschreven worden.
3. **Geen kalibratieronde met twintig menselijke beoordelingen.** Buiten de opdracht gezet. Gevolg:
   de rangcorrelatie blijft op 0,29 staan als laatst gemeten waarde, en de verbeteringen 11, 12 en
   13 verbeteren de ordening zonder dat er iets meet hoeveel.
4. **De nameting van dezelfde twaalf pagina's wordt niet nu gedaan.** Later stadium, aldus de
   opdracht. Daarmee blijft conventie 10 open: alles hieronder is gebouwd en niet geverifieerd.
5. **De feitenkaart wordt niet ingekort.** Beide experts raden dit expliciet af. De oplossing is
   prioriteit erboven, niet minder informatie eronder.
6. **Het aantal beoordelaars verandert niet.** Zie 14.
