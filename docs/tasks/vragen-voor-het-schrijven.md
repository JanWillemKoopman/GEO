# De juiste vragen stellen vóór het schrijven (plan, 1 september 2026)

Opdracht van de eigenaar: dit is de kern van de app. ORBIT ENGINE schrijft geen content omdat het
kan, maar omdat het de kennis van de ondernemer omzet in een pagina die een AI-assistent citeert.
Ontbreekt die kennis, dan moet de app ernaar vragen. De ene pagina heeft twee vragen nodig, de
andere twaalf. Dat verschil moet de app zelf bepalen, per pagina, vóórdat er één woord geschreven
wordt.

Dit plan beschrijft hoe dat werkt, wat ervoor gebouwd moet worden en in welke volgorde. Het is nog
niets gebouwd; wat hieronder staat is ontwerp.

---

## 1. Waar het nu op vastloopt

De app stelt wél vragen. Het probleem is niet dat ze ontbreken maar dat ze op het verkeerde moment
komen, uit de verkeerde bron, en zonder gevolg.

**De vragen komen vóór de inhoudsopgave.** De volgorde is nu: de klant kiest pagina's, de
claim-audit bedenkt welke beweringen die pagina's nodig hebben, daar komen vragen uit, de klant
antwoordt, en pas dáárna onderzoekt de app wat de pagina echt moet behandelen (het itemdossier en
het contentcontract). De vragen worden dus gesteld door een stap die de pagina nog niet kent.

**Het contract wijkt uit in plaats van te vragen.** Regel (d) van de contractprompt
(`lib/pipeline/content-contract.ts`) zegt letterlijk: *"Plan NOOIT een sectie die alleen waar te
maken is met een feit dat we niet hebben. Onder 'NIET ONDERBOUWD' staat wat er ontbreekt; daar mag
je omheen plannen, niet doorheen."* Dat is precies verkeerd om. De app verlaagt haar ambitie tot wat
ze toevallig al weet, en niemand hoort er ooit van. Het gat wordt stilzwijgend een dunnere pagina in
plaats van een vraag.

**Er is geen maat voor "hebben we hier genoeg voor".** Eén getal komt in de buurt:
`minProofPointsForConcreteContent = 3` in `lib/config.ts`, met als commentaar "onder drie feiten
vervalt een pagina onvermijdelijk in algemeenheden". Dat getal zet alleen het web-zoeken aan. Het
houdt niets tegen, het waarschuwt niemand, en het kijkt naar het merk als geheel in plaats van naar
deze pagina.

**De vragen worden gekozen op bereik, niet op nood.** De sortering in `briefing-select.ts` is
`aantal pagina's × verplicht × prioriteit`, met acht plekken per batch (`MAX_QUESTIONS = 8`) plus
sinds kort minstens één per pagina. Een vraag die vier pagina's een beetje helpt wint dus van de
vraag die één pagina van dun naar goed tilt.

**En overslaan kost niets.** Voor de eindpoort (`lib/content-final-gate.ts`) zijn "ik weet het niet"
en "ik heb geen zin" hetzelfde: beide tellen als behandeld. De klant ziet wel een zin over wat hij
misloopt, maar aan de uitkomst verandert niets.

### Wat dat opleverde, gemeten

De ronde van 1 september 2026 (Gasservice Brabant, cluster Hybride warmtepomp,
`docs/tasks/contentronde-gasservice-brabant-1-september-2026.md`):

| | Waarde |
|---|---|
| Vragen gesteld voor vier pagina's | 16 |
| Beantwoord met echte gegevens van de site | 8 |
| Secties in het contract van de Tilburg-pagina | 25 |
| Daarvan met een F-nummer, dus met een feit over het bedrijf erachter | 7 |
| Concrete getallen op de vier pagina's samen | 5 |
| Zinnen die de lezer opdragen iets na te vragen | 80 |
| Pagina's die de app toch schreef | 4 van de 4 |
| Pagina's die daarna op "check nodig" stonden | 4 van de 4 |

Achttien van de vijfentwintig secties van die pagina rustten op geen enkel feit over het bedrijf.
Een deel daarvan is terecht algemene uitleg, en dat hoort ook op een goede pagina. Maar de app kan
op dit moment het verschil niet zien tussen "deze sectie is van nature algemeen" en "deze sectie zou
iets over het bedrijf moeten zeggen en kan dat niet". Dat verschil is de hele kern van dit plan.

---

## 2. Het principe, in één alinea

**Het contract is het ideaal, de feitenkaart is de werkelijkheid, en het verschil is de vragenlijst.**

Nu vallen die drie samen: het contract wordt al beperkt tot wat de feitenkaart aankan, dus er is per
definitie geen verschil meer om vragen uit af te leiden. Zodra het contract mag beschrijven wat een
échte goede pagina nodig heeft, ontstaat er een meetbaar gat, en dat gat is precies de lijst waar de
klant iets aan heeft. Niet "wat weten we nog niet over dit merk", maar "welke drie antwoorden maken
deze pagina goed".

Daaruit volgt vanzelf dat de ene pagina twee vragen krijgt en de andere twaalf. Een pagina over "hoe
werkt een hybride warmtepomp" bestaat grotendeels uit algemene uitleg en heeft aan één vraag over de
merken genoeg. Een pagina over "wat kost een hybride warmtepomp inclusief installatie in Oss"
bestaat vrijwel volledig uit uitspraken over dit bedrijf en kan zonder antwoorden helemaal niet
bestaan. Dat verschil hoort niet in een vaste bovengrens van acht te worden geperst.

---

## 3. De nieuwe volgorde

Wat er verandert is vooral wanneer dingen gebeuren. Er komt één nieuwe stap bij (de inputpoort) en
twee bestaande stappen wisselen van plaats.

**Nu:**

```
rapport → klant kiest pagina's → BRIEFING (feitenkaart + claim-audit → vragen)
        → klant antwoordt → PLAN (itemdossier + contract) → schrijven → repareren
```

**Straks:**

```
rapport → klant kiest pagina's → PLAN (itemdossier + contract, het ideaal)
        → BRIEFING (feitenkaart + dekkingsmeting op het contract → vragen per pagina)
        → INPUTPOORT (kan deze pagina goed worden?) → klant antwoordt of slaat over
        → contract vastzetten op wat er nu wél kan → schrijven → repareren
```

Drie dingen zitten in die verschuiving:

1. **Het plan gaat vóór de vragen.** De vragen komen dan uit de werkelijke inhoudsopgave van deze
   pagina, met de deelvragen die het onderzoek ophaalde, in plaats van uit een generieke claimlijst.
2. **De inputpoort is nieuw.** Die zegt vóór het schrijven of deze pagina met dit materiaal goed kan
   worden, en zo niet, wat er precies nodig is.
3. **Het contract wordt pas ná de antwoorden vastgezet.** Wat de klant beantwoordde blijft staan,
   wat hij oversloeg valt eruit, en de pagina wordt korter in plaats van vager.

### Wat dit kost aan volgorde-risico

De planstap draait nu ná de knop "Schrijf mijn pagina's" en dus alleen voor pagina's die de klant
echt wil. Straks draait hij ervoor, en betaalt de app hem ook voor pagina's die de klant alsnog laat
liggen. Gemeten in de ronde van 1 september: het itemdossier kost $0,0172 en het contract $0,0047,
samen $0,0219 per pagina. Voor vier pagina's is dat negen cent, tegen $4,52 voor het schrijven.
Verwaarloosbaar, en het is precies de investering die de dure stap goedkoper maakt.

---

## 4. De maat: onderbouwingsgraad per pagina

Om te kunnen zeggen "hier heb ik te weinig van je" is één getal nodig dat zonder AI te berekenen is.
Dat getal heet de **onderbouwingsgraad**: welk deel van de secties die iets over dit bedrijf moeten
zeggen, kan dat ook echt.

### Eén veld erbij in het contract

`ContractSection` (`lib/schemas/content-contract.ts`) krijgt er één veld bij:

```ts
/**
 * Vraagt deze sectie om een uitspraak over DIT bedrijf, of is hij algemeen?
 *
 * "Wat kost een hybride warmtepomp bij Gasservice Brabant" vraagt erom.
 * "Hoe werkt een hybride warmtepomp" niet: dat is uitleg over het onderwerp.
 */
needsBrandFact: boolean;
```

Dat oordeel komt van het model, want het is een inhoudelijk oordeel en geen telling. De CODE doet
er vervolgens de harde vraag overheen: staat er een F-nummer bij deze sectie dat echt bestaat? Dat
is dezelfde verdeling die overal in de app geldt, en die het herontwerp van 1 september al
vastlegde: het model beoordeelt, de code rekent na (conventie 1).

### De rekensom

```
merksecties      = secties met needsBrandFact = true
gedekt           = merksecties met minstens één bestaand F-nummer in factRefs
onderbouwingsgraad = gedekt / merksecties        (null als merksecties leeg is)
```

`null` bij nul merksecties, want dan is er niets te onderbouwen en is een percentage een verzonnen
oordeel (conventie 3). Een pagina die volledig uit algemene uitleg bestaat is geen slechte pagina;
hij is alleen geen pagina waarvoor de klant iets hoeft aan te leveren.

Puur, dus in een module zonder `server-only` en testbaar vanuit `scripts/test-unit.ts`, naast
`content-coverage.ts` waar dezelfde soort rekensom al staat.

### De drie standen

| Onderbouwingsgraad | Wat de app doet |
|---|---|
| 70% of hoger | Schrijven. De openstaande vragen gaan mee als optioneel; de klant kan ze later alsnog beantwoorden en de pagina opnieuw laten schrijven. |
| 40% tot 70% | Schrijven mag, maar met een expliciete waarschuwing vooraf: deze pagina wordt geschreven zonder antwoord op X, Y en Z, en die passages komen er dan niet op. |
| Onder 40% | **Niet schrijven.** De app toont wat er nodig is en waarom, en biedt drie uitwegen: beantwoorden, de pagina laten vallen, of hem als algemene uitleg laten schrijven zonder claims over het bedrijf. |

De grenzen van 40 en 70 zijn een startwaarde en geen wet. Ze worden bij elke ronde gelogd naast de
uiteindelijke kwaliteitsscore, zodat ze na tien echte pagina's op data bijgesteld kunnen worden in
plaats van op gevoel. Dat is dezelfde afspraak als bij `DUPLICATE_THRESHOLD` in `similarity.ts`.

⚠️ **Deze getallen zijn nog niet gemeten.** De onderbouwingsgraad bestaat nog niet, dus hij is niet
met terugwerkende kracht over de ronde van 1 september te berekenen: `needsBrandFact` stond er niet
in. Wat wél gemeten is: van de 25 secties van de Tilburg-pagina hadden er 7 een F-nummer. De eerste
ronde na het bouwen levert de eerste echte reeks op.

---

## 5. De vragen: hoeveel, welke, en voor wie

### Het budget gaat van de batch naar de pagina

`MAX_QUESTIONS = 8` geldt nu voor de hele batch. Dat is de rem die ervoor zorgt dat een klant niet
op een muur van veertig vragen stuit, en die rem moet blijven. Maar hij hoort niet te bepalen welke
pagina geholpen wordt.

Nieuwe verdeling:

1. **Per pagina wordt eerst het gat bepaald.** Elke merksectie zonder dekking levert één vraag op.
   Een pagina met twee gaten krijgt twee vragen, een pagina met twaalf gaten twaalf.
2. **Ontdubbelen over de batch.** Twee pagina's die allebei naar de prijs vragen, leveren één vraag
   op. Dat gebeurt al (`claimKey` en `dedupeOpOnderwerp` in `briefing-select.ts`) en blijft.
3. **Dan pas afkappen, en van onderen.** Blijft de lijst boven het batchplafond, dan vervallen de
   vragen van de pagina's die het minst winnen. Het plafond gaat van 8 naar **12**: de ronde van
   1 september leverde er 16 op voor vier pagina's, en die pasten redelijk in één scherm.
4. **De volgorde binnen de lijst verandert.** Nu: aantal pagina's dat de vraag dient. Straks: hoeveel
   de zwakste pagina die de vraag dient erop vooruitgaat. Concreet de sortering
   `(1 - onderbouwingsgraad van de zwakste pagina) × kern(2) × aantal pagina's`.

Het verschil is dat een vraag die één pagina van 30% naar 60% tilt, wint van een vraag die vier
pagina's van 85% naar 88% helpt. Dat is precies andersom dan nu.

### De vragen komen uit het contract, niet uit een losse claimlijst

De claim-audit blijft bestaan, maar hij krijgt het contract erbij en werkt per sectie. Dat maakt de
vraag concreter en de reden zichtbaar:

| Nu | Straks |
|---|---|
| "Wat is momenteel de richtprijs voor een hybride warmtepomp inclusief installatie in Oss en welke onderdelen zitten daarin?" | "Voor de sectie *Wat kost het inclusief installatie* heb ik een bedrag nodig. Zonder dat blijft die sectie leeg." |

De tweede vorm is niet alleen vriendelijker, hij is ook eerlijker: hij benoemt de sectie die vervalt.
Dat maakt overslaan een keuze met een zichtbare prijs in plaats van een vinkje.

### De vraag mag korter dan het gat

Eén regel blijft hard staan: een vraag moet in dertig seconden te beantwoorden zijn zonder iets op
te zoeken (`AUDIT_SYSTEM` regel 4). Een gat dat alleen met opzoekwerk te dichten is, wordt geen
vraag maar een vervallen sectie. Anders wordt de briefing huiswerk, en huiswerk wordt niet gemaakt.

---

## 6. Wat overslaan betekent

Dit is het scharnier van het hele plan. Overslaan moet mogen, en het moet iets kosten dat je ziet.

**Nu:** overslaan zet de status op `overgeslagen`, de bewering vervalt, en de pagina wordt geschreven
alsof de vraag nooit bestond. De klant leest achteraf een pagina die om het gat heen praat, of erger:
die het gat benoemt ("Een concrete wachttijd is niet beschikbaar").

**Straks:** overslaan haalt de sectie uit het contract. Drie gevolgen, alle drie zichtbaar:

1. De pagina wordt korter. Dat is eerlijk: minder input is minder pagina.
2. De dekkingspoort toetst niet meer op een sectie die er nooit had kunnen komen, dus de bevindingen
   gaan omlaag en de reparatielus krijgt geen opdracht die hij niet kan uitvoeren.
3. Op het scherm staat bij de pagina wat eruit is gevallen, met de vraag ernaast. Eén klik alsnog
   beantwoorden, en de sectie komt terug bij een volgende versie.

Dat laatste is de belangrijkste: het gat blijft zichtbaar in plaats van te verdampen. Vandaag verdwijnt
een overgeslagen vraag uit beeld en blijft alleen een dunne pagina over waarvan niemand meer weet
waarom hij dun is.

### En de eindpoort blijft

`lib/content-final-gate.ts` blijft precies zoals hij is: geen definitieve versie zolang er vragen
open staan, met overslaan als uitweg. De inputpoort staat ervóór en gaat over iets anders: die zegt
of het schrijven überhaupt zin heeft. Twee poorten, twee vragen. "Kan dit goed worden?" vóór het
geld, "is dit af?" erna.

---

## 7. Wat de klant ziet

Eén scherm verandert wezenlijk: de briefing (`app/(app)/analyses/[id]/briefing/`). Nu is dat een
platte lijst vragen met een voortgangsbalk. Straks is het een lijst pagina's, elk met zijn eigen
stand en zijn eigen vragen.

Per pagina, vóór het schrijven:

```
Wat kost een hybride warmtepomp in Oss                          [ 2 van 9 onderbouwd ]

  Deze pagina gaat bijna helemaal over jouw prijzen. Met wat ik nu heb wordt het
  een algemeen artikel zonder één bedrag, en dat citeert geen enkele AI-assistent.

  Beantwoord deze drie en de pagina kan geschreven worden:
   • Wat kost een hybride warmtepomp inclusief installatie, ongeveer?      [bedrag]
   • Wat zit er wel en niet bij die prijs?                                 [lijst]
   • Helpen jullie bij het aanvragen van de subsidie?                      [ja of nee]

  [ Beantwoorden ]   [ Schrijf hem algemeen, zonder onze cijfers ]   [ Laat vallen ]
```

En een pagina die wél kan:

```
Hoe werkt een hybride warmtepomp                                [ 4 van 5 onderbouwd ]

  Deze pagina kan geschreven worden. Eén optionele vraag maakt hem sterker:
   • Welke merken hybride warmtepompen plaatsen jullie?                    [lijst]

  [ Beantwoorden ]   [ Schrijf hem nu ]
```

Drie dingen die dit scherm moet doen en het huidige niet doet:

- **Het cijfer per pagina tonen**, zodat de klant ziet dat de ene pagina klaarstaat en de andere niet.
- **De consequentie in dezelfde zin als de vraag noemen.** Niet "deze vraag staat open" maar "zonder
  dit blijft de sectie over de prijs leeg".
- **Een derde uitweg bieden naast beantwoorden en overslaan:** de pagina bewust algemeen laten
  schrijven. Dat is een legitieme keuze voor een kennisbankartikel en hij moet niet als falen voelen.

De regel uit `docs/ux-design.md` §4 blijft gelden: een lege of blokkerende stand "wijst altijd naar
de juiste volgende stap", want een scherm dat alleen zegt wat er niet kan is een dood einde. Elke
stand hierboven heeft daarom minstens twee knoppen.

---

## 8. Waarom het tweede cluster minder vragen stelt

Dit is het deel dat de app op termijn onderscheidt, en het bestaat al half.

Elk antwoord gaat de feitenbank in (`brand_facts`, migratie 0036) met een reikwijdte: merkbreed,
per analyse, of per pagina. Merkbrede antwoorden gelden voor élke volgende pagina van deze klant.
Dat betekent dat de vragenlijst van cluster twee korter is dan die van cluster één, en die van
cluster vijf korter dan beide.

Wat daarvoor nog moet gebeuren:

- **De onderbouwingsgraad moet de bank meenemen**, niet alleen de bevroren kaart van deze batch. Dat
  gebeurt nu al via `buildFactBase`, maar het is nergens zichtbaar gemaakt.
- **Het scherm moet het benoemen.** "Van de negen dingen die deze pagina nodig heeft, wist ik er al
  zes uit eerdere clusters." Dat is het moment waarop de klant merkt dat de app leert, en dat is een
  reden om door te gaan.
- **Een antwoord moet kunnen verlopen.** `brand_facts.verify_after` bestaat al. Een prijs van vorig
  jaar is geen bevestigd feit meer. Dat is werk voor later, maar het veld hoeft niet opnieuw bedacht
  te worden.

---

## 9. Wat het kost

Nagerekend tegen `lib/openai/pricing.ts` en de gemeten tokens uit de ronde van 1 september.

| Wat | Nu | Straks | Verschil |
|---|---|---|---|
| Itemdossier per pagina | $0,0172 | $0,0172 | gelijk, alleen eerder |
| Contract per pagina | $0,0047 | $0,0094 | +$0,0047, want het contract wordt na de antwoorden opnieuw vastgezet |
| Claim-audit per pagina | $0,0027 | $0,0027 | gelijk |
| Onderbouwingsgraad | bestaat niet | $0 | code, geen model |
| **Per pagina extra** | | | **ongeveer een halve cent** |

Daar staat tegenover wat er niet meer gebeurt. In de ronde van 1 september is $1,13 per pagina
uitgegeven aan vier pagina's die alle vier op "check nodig" eindigden, waarvan er twee in hun
openingsalinea schreven dat het bedrijf niet kon worden aanbevolen. Eén pagina die de inputpoort
tegenhoudt, bespaart $1,13 en levert bovendien een klant op die weet waarom.

Het echte rendement zit niet in de besparing maar in de opbrengst: een pagina met de cijfers van de
klant erin is het product waarvoor betaald wordt. Een pagina zonder is een kostenpost die ook nog
eens vertrouwen kost.

---

## 10. Wat er gebouwd moet worden, in volgorde

| # | Stap | Waar | Effort | Waarom hier |
|---|---|---|---|---|
| 1 | **`needsBrandFact` in het contract.** Eén veld op `ContractSection`, plus de instructie in de contractprompt die uitlegt wanneer een sectie erom vraagt. Zonder dit veld is er niets te meten. | `lib/schemas/content-contract.ts`, `lib/pipeline/content-contract.ts` | Klein | Alles hieronder rust erop. |
| 2 | **Regel (d) omdraaien.** De contractprompt mag niet meer om gaten heen plannen. Nieuwe formulering: plan de pagina die de doelvraag echt beantwoordt, markeer per sectie of hij een feit over het bedrijf nodig heeft, en laat het aan ons om te bepalen wat daarvan haalbaar is. | `lib/pipeline/content-contract.ts` | Klein | Zonder dit blijft het gat onzichtbaar, want het contract vraagt er nooit om. |
| 3 | **De onderbouwingsgraad.** Pure functie: contract plus feitenkaart in, percentage plus de lijst ongedekte secties uit. Met unittests op de contracten van 1 september. | nieuw `lib/pipeline/input-coverage.ts` | Klein | De maat waar de poort en het scherm op leunen. |
| 4 | **De planstap vóór de briefing.** `planContentBriefing` start eerst `content_plan` per pagina, en `content_brief` draait pas als die klaar zijn. Ketentest op de volgorde. | `lib/jobs/content-jobs.ts`, `lib/jobs/handlers.ts` | Middelmatig | Dit is de verschuiving waar alles op hangt; het is ook het enige stuk met echt volgorde-risico. |
| 5 | **De claim-audit werkt per sectie.** Hij krijgt het contract mee en levert per ongedekte merksectie één vraag, met de sectiekop erbij. | `lib/pipeline/briefing.ts` | Middelmatig | Maakt de vraag concreet en de reden zichtbaar. |
| 6 | **De verdeling van het budget.** Per pagina tellen, ontdubbelen over de batch, dan afkappen van onderen. Plafond van 8 naar 12. Sorteren op winst voor de zwakste pagina. | `lib/pipeline/briefing-select.ts` | Middelmatig | De vraag die het meest oplevert komt bovenaan. |
| 7 | **De inputpoort.** Pure beslissing met drie standen plus de melding, in dezelfde vorm als `eindpoort()`. De route gebruikt hem als garantie, het scherm als melding. | nieuw `lib/content-input-gate.ts`, plus `app/api/analyses/[id]/briefing/route.ts` | Middelmatig | Hier wordt "niet schrijven" een echte uitkomst. |
| 8 | **Overslaan haalt de sectie eruit.** Bij het vastzetten van het contract vóór het schrijven vervallen de secties waarvan de vraag is overgeslagen. | `lib/pipeline/content-plan.ts` of een nieuwe vastzetstap | Middelmatig | Dit is wat overslaan een zichtbare prijs geeft. |
| 9 | **Het briefingscherm per pagina.** Pagina's met hun stand, hun vragen en hun drie uitwegen. | `app/(app)/analyses/[id]/briefing/` | Groot | Het meeste werk, en pas zinvol als 1 tot en met 8 er staan. |
| 10 | **Het cijfer bewaren en tonen.** `content_pieces.input_coverage` erbij (additieve migratie), zichtbaar op het contentscherm, gelogd naast de kwaliteitsscore zodat de grenzen van 40 en 70 op data bijgesteld kunnen worden. | migratie, `app/(app)/...` | Klein | Zonder de reeks blijven de drempels een gok. |
| 11 | **Hergebruik zichtbaar maken.** "Zes van de negen wist ik al uit eerdere clusters." | briefingscherm | Klein | Het moment waarop de klant merkt dat de app leert. |

Stap 1 tot en met 3 zijn samen ongeveer een dag en leveren al iets op: dan is er een cijfer per
pagina, ook zonder dat er iets verandert aan de volgorde. Stap 4 tot en met 8 zijn de kern, ongeveer
drie dagen. Stap 9 is het meeste werk maar het minste risico.

---

## 11. Wat we NIET doen

- **Geen muur.** De inputpoort houdt het SCHRIJVEN tegen, niet de klant. Er zijn altijd minstens twee
  uitwegen, en "schrijf hem algemeen" is er daar één van. Het besluit uit `release-panel.tsx` staat
  nog steeds: een gate die je niet kunt passeren levert afgehaakte klanten op in plaats van betere
  content.
- **Geen vragen die opzoekwerk vereisen.** De dertig-secondenregel blijft. Een gat dat alleen met
  een offerte-archief te dichten is, wordt een vervallen sectie en geen huiswerk.
- **Geen tweede AI-aanroep om het gat te beoordelen.** De onderbouwingsgraad is een telling. Er is al
  een model dat per sectie oordeelt (`needsBrandFact`), en dat is genoeg.
- **Geen poort op het merkniveau.** De vraag is nooit "weten we genoeg over dit bedrijf" maar altijd
  "kan deze pagina goed worden". Een klant met een dun profiel moet gewoon kunnen beginnen met de
  pagina's die wél kunnen.
- **Geen automatische herschrijving zodra een antwoord binnenkomt.** Verleidelijk, maar dan betaalt
  de klant voor een nieuwe versie die hij niet vroeg. Het antwoord maakt de pagina herschrijfbaar en
  zet dat als suggestie op het scherm.

---

## 12. Hoe we weten of het werkt

Conventie 10: gebouwd is niet geverifieerd. De toets is een volgende echte ronde, en deze cijfers
zijn de meetlat. Links de gemeten stand van 1 september 2026, rechts wat er moet gebeuren.

| Wat we meten | 1 september | Doel |
|---|---|---|
| Pagina's die op "check nodig" eindigen | 4 van 4 | hooguit 1 van 4 |
| Concrete getallen op vier pagina's samen | 5 | meer dan 20 |
| Zinnen die de lezer iets laten navragen | 80 | onder de 20 |
| Bronherleidbaarheid, gemiddeld | 40% | boven de 70% |
| Vragen gesteld | 16 voor 4 pagina's | ongelijk verdeeld, en dat is de bedoeling |
| Pagina's die de inputpoort tegenhield | bestond niet | minstens één, anders staat de drempel te laag |

Dat laatste is de belangrijkste en de meest contra-intuïtieve: als de poort in de eerste ronde nooit
afgaat, is hij niet streng maar decoratief.

---

## 13. Waar dit mis kan gaan

- **Het model markeert alles als `needsBrandFact`.** Dan zakt elke pagina door de poort en wordt de
  app een vragenmachine. Vangnet: de verhouding wordt per ronde gelogd, en als meer dan 80% van de
  secties als merkgebonden wordt gemarkeerd, is dat een signaal over de prompt en niet over de klant.
- **De klant slaat alles over.** Dan schrijft de app kortere, algemene pagina's, en dat is de
  eerlijke uitkomst. Het gevaar is dat hij niet doorheeft wat hij weggeeft, en daar is de zichtbare
  consequentie per sectie voor.
- **De volgorde-omkering breekt de wachtrij.** De planstap draait nu na de briefing en gebruikt het
  bevroren snapshot van die briefing. Draait hij ervoor, dan bestaat dat snapshot nog niet. Dit is de
  enige stap met echt regressierisico en hij hoort dus een eigen ketentestscenario te krijgen, met de
  volgorde en het hervatten na een mislukte plantaak erin.
- **Twaalf vragen voelt als veel.** Bij vier pagina's tegelijk kan de lijst alsnog lang worden. De
  groepering per pagina moet dat dragen; blijkt dat niet zo, dan gaat het plafond terug naar acht en
  krijgt de klant de rest bij de volgende versie.

---

## 14. Wat dit uiteindelijk verandert

Vandaag is de vraag aan de klant een formaliteit die tussen twee stappen in staat. Na dit plan is hij
de stap waar het product op draait: de app zoekt uit wat een goede pagina nodig heeft, kijkt wat ze
zelf al weet, en vraagt precies het verschil. Niet meer, niet minder, en per pagina anders.

Dat is ook het eerlijke antwoord op de vraag waarom een ondernemer hiervoor betaalt. Niet omdat een
model tekst kan produceren, want dat kan hij zelf ook. Wel omdat de app weet wélke vijf dingen uit
zijn hoofd op papier moeten om die tekst iets waard te maken, en het hem in dertig seconden per
vraag vraagt.
