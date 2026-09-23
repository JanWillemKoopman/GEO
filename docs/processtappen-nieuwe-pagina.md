# Van adviseur tot nameting: alle stappen op een rij

> **Voor wie dit is.** Iedereen die wil zien wat er precies gebeurt tussen het aanmaken van een
> merkprofiel door de adviseur en het moment dat het effect van een gepubliceerde pagina bewezen is,
> zonder dat je code hoeft te lezen. Elke stap staat er, hoe klein ook, ook de stappen die geen mens
> ooit aanklikt omdat de app ze zelf doet.
>
> **Waarom dit een apart document is.** [`APP_FLOW_DOCUMENTATION.md`](../APP_FLOW_DOCUMENTATION.md)
> legt dezelfde keten uit in vijf fases en beantwoordt vooral de vraag "waarom werkt het zo". Dit
> document beantwoordt "wat gebeurt er precies, in welke volgorde". Klopt er iets niet meer, dan is
> de code leidend: `lib/pipeline/` en `lib/jobs/` zijn de bron waar dit overzicht uit is opgebouwd.
>
> **Peildatum: 23 september 2026.** Alle 117 stappen zijn op 22 september 2026 onafhankelijk
> nagekeken tegen de broncode, in vier losse controles die geen van alle deze documentatie hebben
> gelezen. De twee stappen die toen niet klopten met wat er gebouwd was, **stap 104** (de check op een
> doorverwijzing) en **stap 116** (de vergelijking met de controlegroep op het klantscherm), zijn op
> 23 september 2026 gebouwd en hier bijgewerkt. Kleinere nuances zijn verwerkt bij stap 22, 31, 38
> en 83.

---

## Fase 1. Een merk klaarzetten (nog voordat er contact is met de klant)

Dit doet altijd de adviseur, nooit de klant zelf. Een klant kan geen merk aanmaken, want dat zet
betaald onderzoek in gang.

1. De adviseur opent het scherm om een nieuw merk aan te maken.
2. De adviseur vult de bedrijfsnaam in.
3. De adviseur vult het webadres in.
4. De adviseur vult optioneel andere schrijfwijzen van de naam in, bijvoorbeeld een afkorting of een
   veelgemaakte spelfout. Dat lijkt onbelangrijk en is het niet: de latere meting telt straks alleen
   de letterlijke naam, en een schrijfwijze die ontbreekt kost later een te lage score.
5. Het systeem legt vast dat deze drie velden "door de adviseur ingevuld" zijn. Dat is een apart
   soort herkomst: het onderzoek hierna mag deze aanname tegenspreken als het iets anders vindt, maar
   mag hem nooit stilzwijgend overschrijven.
6. Het systeem legt het merkprofiel vast, zodat het terug te vinden is zodra de adviseur of de
   klant het weer opent.
7. Het systeem zet automatisch een reeks van negen onderzoekstaken klaar om te gaan draaien.

> **Er gaat sinds kort nog één voorbereidende stap vóór taak 1.** Het systeem werpt eerst een
> vluchtige blik op tot 1000 pagina's van de site, alleen de titel en een korte samenvatting per
> pagina, zonder ze echt te lezen. Dat helpt taak 1 hieronder een beter onderbouwde keuze te maken
> over welke 150 pagina's het daarna wél helemaal doorleest. Geen AI aan te pas, dus gratis, maar wel
> tijd nodig omdat het internet moet bevragen: in de praktijk tot ongeveer 10 minuten. De klant zit
> er op dit moment nog niet bij, dus die tijd voelt niemand. Lukt dit voorbereidende stapje een keer
> niet, dan gaat taak 1 gewoon door zoals hij altijd al deed, op het webadres alleen.

## Fase 2. Het automatische onderzoek (ongeveer 7,5 minuten, ongeveer 25 dollarcent, plus het vooronderzoek hierboven)

Niemand hoeft hier iets voor te doen. Het scherm mag dicht. Elke taak controleert eerst of zijn
resultaat al bestaat, zodat een herhaalde poging nooit voor niets betaalt.

8. **Taak 1, de website uitlezen.** De crawler bezoekt tot 150 pagina's van de site en haalt er de
   tekst uit. Geen AI, dus dit kost niets.
9. **Taak 2, het merk en de markt leren kennen.** Een AI-aanroep bepaalt wie dit bedrijf is, in welke
   branche, wat voor soort bedrijf, in welk gebied het werkt, hoe het klinkt en wie de concurrenten
   zijn.
10. **Taak 3, het aanbod in kaart brengen.** Diensten en producten worden als boom vastgelegd: onder
    een hoofddienst zoals "massage" hangt bijvoorbeeld "sportmassage". Elke regel krijgt de bron
    erbij waar hij vandaan komt.
11. **Taak 4, concurrenten en marktbronnen uitzoeken.** Waarom winnen die concurrenten, en welke
    websites bepalen deze markt.
12. **Taak 5, technische controle.** Mogen de crawlers van AI-bedrijven de site bezoeken, en is de
    tekst leesbaar zonder JavaScript. Geen AI, dus gratis.
13. **Taak 6, onderwerpen voorstellen.** Vijf tot acht onderwerpen, afgeleid uit de aanbodboom van
    taak 3. Zonder aanbod met knopen erin worden hier bewust geen generieke onderwerpen verzonnen.
14. **Taak 7, testen wat AI-assistenten al weten.** De duurste stap: kent ChatGPT dit bedrijf, klopt
    wat hij zegt, welke bronnen haalt hij aan, zijn er bedrijven met een bijna gelijke naam, en wordt
    het merk genoemd bij een koopvraag waarin geen merknaam voorkomt.
15. **Taak 8, alles samenbrengen.** Een laatste stap bundelt de zeven vorige taken tot één
    merkdossier.
16. Bij elke taak die niets vindt, toont het scherm een waarschuwing in plaats van een groen vinkje.
    Dat is een bewust verschil: weten dat er iets ontbreekt is iets anders dan denken dat alles
    klopt.
17. Mislukt een taak definitief, dan loopt de rest van de keten in de meeste gevallen gewoon door.
    Twee stappen zijn hier een uitzondering: mislukt het aanbodonderzoek, dan slaat het systeem het
    voorstellen van onderwerpen bewust over, want onderwerpen zonder aanbod erachter zijn te
    generiek. En mislukt het basisonderzoek zelf, dan stopt de keten helemaal, want alle taken
    daarna bouwen erop voort.
18. Er geldt een kostenplafond per merk en een dagplafond over alle merken heen. Loopt het op, dan
    valt een stap weg en wordt dat vastgelegd in plaats van verzwegen.
19. Het merk krijgt automatisch een zichtbare status: Voorbereiden, Klaar voor het gesprek, Gesprek
    gehad, of Overgedragen. Niemand hoeft dit handmatig aan te vinken.

## Fase 3. Het gesprek met de klant en de overdracht

20. De adviseur opent het onboardingscherm terwijl de klant meekijkt. Er staat hier bewust geen
    bedrag, geen technische taaknaam en geen foutmelding op.
21. Bovenaan staat wat er nog niet bekend is, de zwaarste punten eerst. Het werkgebied staat vrijwel
    altijd bovenaan, want dat bepaalt of de latere meetvragen regionaal of landelijk gesteld worden.
22. De klant beantwoordt twaalf commerciële vragen die een website nooit kan vertellen: waar hij op
    wil groeien, waar hij juist niet meer op wil inzetten, de klantgroepen waar de groei zit,
    plaatsen waar hij nog niet zit, wat een klant ongeveer waard is, zijn seizoenspatroon,
    veelgehoorde bezwaren, verboden onderwerpen, extra bewijs zoals certificeringen of cijfers,
    gelijknamige bedrijven die hij niet is, of er nieuwe pagina's bij mogen komen, en waar hij over
    een jaar wil staan.
23. De klant vult de contactgegevens van een contactpersoon in: naam, e-mailadres, telefoonnummer.
24. De klant checkt wat het onderzoek uit fase 2 al gevonden heeft, blok voor blok.
25. Optioneel plakt de klant een tarievenpagina, brochure of offertetekst erbij; het systeem haalt
    daar feiten uit die later in teksten gebruikt mogen worden.
26. Optioneel legt de klant iets vast dat buiten de website om speelt, zoals een nieuwe naam, een
    nieuwe vestiging of een dienst die stopt. Elk soort wijziging krijgt automatisch een passend
    gevolg: een naamswijziging telt bijvoorbeeld meteen mee als extra schrijfwijze bij de meting.
27. Elk veld wordt losstaand opgeslagen zodra je eruit klikt. Er is geen aparte opslaanknop, want een
    gesprek springt en wordt onderbroken.
28. Is er iets veranderd dat het onderzoek raakt, dan klikt de adviseur op "onderzoek bijwerken". Het
    systeem toont eerst een kostenschatting, want dit is de enige plek waar tijdens het gesprek een
    bedrag zichtbaar is.
29. Het systeem herhaalt alleen de onderzoeksstappen die door de wijziging geraakt worden.
    Verandert bijvoorbeeld het werkgebied, dan worden de meetvragen en de kennistest opnieuw
    gedraaid; noemt de klant een onbekende concurrent, dan draait alleen het marktonderzoek opnieuw.
30. De adviseur legt het gesprek vast met zijn aantekeningen. Er komt een datum bij, en het merk
    springt naar de status Gesprek gehad.
31. De adviseur stuurt een uitnodiging: de klant krijgt een link en kiest zelf een wachtwoord.
    Registreren zonder uitnodiging kan niet, zolang zelfregistratie uitstaat. Die schakelaar bestaat
    wel in de code, voor een latere fase, maar staat standaard uit.
32. De adviseur wijst het merk toe aan het account van de klant.
33. Het merk krijgt de status Overgedragen. De klant kan nu inloggen en zijn eigen werkruimte
    gebruiken; de adviseur houdt daarnaast volledige toegang.

## Fase 4. Een analyse opzetten (bepalen wat er gemeten gaat worden)

34. De klant of de adviseur kiest een merk en typt een onderwerp in, bijvoorbeeld "wasmachine
    repareren".
35. Optioneel vult diegene een korte content-brief in met extra context of wensen.
36. Het systeem onderzoekt wat de eigen website al over dit onderwerp zegt.
37. Het systeem zoekt uit wie hier de concurrenten zijn.
38. Het systeem stelt realistische koopvragen op, verdeeld over drie fases van de klantreis:
    oriëntatie, overweging en beslissing. Standaard tien per fase, dertig in totaal; dat aantal is
    per analyse aan te passen.
39. Het systeem maakt per vraag een inschatting van hoe vaak zo'n vraag ongeveer gesteld wordt.
40. Het systeem toont het conceptmeetplan aan de klant: elke vraag is zichtbaar en te bewerken, niets
    is een black box.
41. De klant leest de vragen door en past aan of verwijdert wat niet past.
42. De klant klikt op "Bevestig en start meting". Dit is de eerste bewuste stop in de hele keten: er
    wordt pas geld uitgegeven ná deze klik.

## Fase 5. De analyse laten draaien (het echte meten)

43. Het systeem stelt alle 30 vragen, één voor één, aan een AI-assistent met live websearch aan, zodat
    het antwoord is zoals een echte gebruiker het te zien zou krijgen.
44. Het systeem beoordeelt per antwoord of, en waar precies, het merk genoemd wordt, en of en welke
    concurrenten genoemd worden.
45. Vragen waarbij geen enkele aanbieder genoemd wordt, telt het systeem apart, niet als verlies voor
    het merk.
46. Het systeem telt alle uitkomsten op tot één score, met een foutmarge erbij die zegt hoe zeker die
    score is.
47. Het systeem stelt een concurrentprofiel op: wie wint, en waarop precies.
48. Het systeem schrijft een jargonvrij rapport. Het bewijs achter elke uitspraak wordt intern nog
    wel opgebouwd, maar staat sinds de schermherziening van 16 september 2026 niet meer als
    doorklikbare link op het klantscherm: dat scherm verwijst voor de cijfers nu naar het
    Analytics-onderdeel, waar dezelfde doorklikbare onderbouwing per bewering nog niet teruggebouwd
    is.

## Fase 6. Ontdekken welke pagina's er nodig zijn

49. Het systeem verzamelt de vragen uit de meting waarbij het merk gemist werd: dat is de eerste
    bron van pagina-ideeën.
50. Het systeem legt de aanbodboom uit fase 2 naast de bestaande pagina's van de klant en bepaalt per
    dienst of die al een eigen pagina heeft, zwak gedekt is, of helemaal ontbreekt. Dat is de tweede,
    aanvullende bron: een dienst die de meting toevallig niet raakte, mist zo niet stilzwijgend.
51. Het systeem combineert beide bronnen tot een lijst aanbevelingen, elk met een titel, een type
    pagina, de bedoelde zoekintentie, de reden waarom, en een prioriteit.
52. Bij een aanbeveling om een bestaande pagina te verbeteren, koppelt het systeem meteen de
    bestaande URL. Bij een aanbeveling voor een nieuwe pagina checkt het systeem of er toch al iets
    verwants bestaat, zodat de nieuwe pagina zich onderscheidt in plaats van hetzelfde over te doen.
53. Het rapport met deze aanbevelingen wordt opgeslagen en getoond aan de klant.

## Fase 7. Een pagina kiezen en uitzoeken wat hij nodig heeft

54. De klant bekijkt de aanbevolen pagina's.
55. De klant kiest welke pagina of pagina's geschreven moeten worden, los per aanbeveling of in één
    keer met "genereer alles".
56. Het systeem zet voor elke gekozen pagina zelf een taak klaar die op de achtergrond gaat draaien.
    De klant hoeft niet te wachten en mag het scherm sluiten.
57. Voor elke pagina onderzoekt het systeem het onderwerp nog verder: welke deelvragen en
    vervolgvragen hoort een lezer te hebben, welke twijfels leven er, en welke uitleg met bron hoort
    daarbij. Dit gebeurt met een eigen zoekactie op het web.
58. Het systeem verifieert die gevonden uitleg: alleen wat aantoonbaar klopt, gaat door naar de
    volgende stap.
59. Het systeem stelt het contentcontract op: de inhoudsopgave die deze pagina echt nodig heeft, met
    per sectie de vraag of daar een uitspraak over dit specifieke bedrijf bij hoort, hoe zwaar die
    sectie weegt voor het doel van de pagina (kern, ondersteunend of mooi meegenomen), en waaraan je
    ziet dat hij geslaagd is. Het contract legt ook vast wat de pagina moet bereiken, voor wie hij
    geschreven is, en wat er juist niet op mag.
60. Het systeem checkt of er al een vergelijkbare pagina op de site van de klant staat en haalt die
    op, zodat de nieuwe tekst zich daartegen kan afzetten in plaats van hem te herhalen.
61. Het systeem bouwt de feitenkaart: alles wat met een bron bekend is over dit bedrijf, uit het
    onderzoek, uit het gesprek en uit eerder beantwoorde vragen.
62. Het systeem berekent welk deel van de secties uit het contract met een feit onderbouwd kan
    worden. Dat gebeurt op drie manieren tegelijk: het kale percentage, hetzelfde percentage met de
    kernsecties drie keer zo zwaar, en het percentage over alleen de kernsecties. Die drie zeggen
    verschillende dingen, en het gemiddelde ervan zegt niets: negen randsecties onderbouwd en de ene
    sectie over de prijs niet, levert negentig procent op terwijl juist het onmisbare stuk ontbreekt.
63. Dat percentage bepaalt of er al geschreven mag worden: bij 70 procent of hoger gaat het schrijven
    gewoon door, tussen de 40 en 70 procent mag het schrijven door met een zichtbare waarschuwing
    welke secties eruit vallen, en onder de 40 procent schrijft het systeem nog niet, tenzij de klant
    zelf kiest om de pagina bewust algemeen te laten schrijven of te laten vallen. Staat er een
    kernsectie zonder onderbouwing, dan komt de pagina altijd minstens in de waarschuwingsstand, hoe
    hoog het percentage verder ook is, en de melding noemt precies die sectie.

## Fase 8. De vragen aan de klant (de briefing)

64. Zodra de laatste pagina uit de gekozen groep zijn contract heeft, start het systeem de
    briefingstap voor de hele groep in één keer.
65. Het systeem controleert alle beweringen: welke beweringen heeft elke pagina nodig, en welke
    daarvan kunnen nog niet onderbouwd worden met de feitenkaart. Per bewering legt het systeem ook
    vast wie hem kan bevestigen. Over algemene vakkennis wordt geen vraag gesteld: een vraag
    waarvan het antwoord op internet staat, kost meer vertrouwen dan hij oplevert.
66. Van elk zo'n gat maakt het systeem een korte, begrijpelijke vraag.
67. Overlappende vragen over meerdere gekozen pagina's worden samengevoegd tot één vraag. Er geldt
    een plafond voor de optionele vragen; een vraag die een kernsectie dekt is verplicht en gaat
    altijd mee, hoeveel het er ook zijn. Zo hoeft de klant niet drie keer los "wat is er inbegrepen"
    te beantwoorden, en verdwijnt de vraag die de pagina draagt nooit stilzwijgend uit de lijst.
68. De klant beantwoordt de vragen. Een vraag overslaan mag ook, en telt dan zelf als antwoord.
69. Elk antwoord wordt losstaand opgeslagen als bevestigd feit: geldt het voor het hele merk, dan
    is het meteen bruikbaar voor alle toekomstige pagina's van dat merk, geldt het alleen voor deze
    analyse, dan blijft het daaraan gekoppeld.
70. De klant klikt op "Schrijf mijn pagina's". Dit is de tweede bewuste stop in de keten.

## Fase 9. Het eerste concept schrijven

71. Het systeem plant voor elke pagina de schrijftaak in.
72. Het beste, duurste AI-model schrijft de eerste volledige versie: een titel, de tekst in
    Markdown, losse FAQ-vragen met antwoord, en technische metadata voor zoekmachines en
    AI-assistenten. De tekst wordt gegrond op de feitenkaart, de vragen die het merk in de meting
    miste, het winnende antwoord van de concurrent zonder diens naam erin, en op wat de bronnen die
    de AI aanhaalt inhoudelijk doen.
73. De schrijfopdracht verbiedt het model expliciet om gedachtestreepjes of "en/of" te gebruiken,
    zodat de tekst niet leest als AI-tekst.

## Fase 10. Drie onafhankelijke keuringen

74. Een eerste beoordelaar scoort de tekst redactioneel, op een vaste rubric en de harde regels.
75. Een tweede beoordelaar checkt welke zinnen iets over het bedrijf beweren zonder dat de
    feitenkaart die dekking biedt.
76. Een derde beoordelaar checkt of elke deelvraag uit het contract echt beantwoord wordt, en of een
    AI-assistent deze pagina zou citeren.
76a. Een vierde beoordelaar kijkt naar vakmanschap: gaat deze pagina over dit bedrijf of zou hij op
    elke concurrentensite kunnen staan, laat hij vakkennis zien, gaat hij verder dan de oppervlakte,
    zegt hij iets eigens, klinkt hij als dit bedrijf, en zet hij aan tot contact. Elk cijfer komt
    met de zin uit de pagina waarop het rust, want een cijfer zonder aanwijsbare zin is een mening.
    Deze vier draaien los van elkaar, zodat één gunstig zelfoordeel de andere drie niet kan
    overstemmen.
76b. Valt een beoordelaar uit, dan telt dat mee als onzekerheid en niet als goedkeuring. Het systeem
    zegt dan hoeveel van de keuring echt gedaan is, in plaats van de pagina stilzwijgend door te
    laten.
77. Het systeem checkt daarnaast de dekking van het contentcontract: hoeveel van de vereiste secties
    staan er echt in.
78. Het systeem checkt op verboden onderwerpen, verboden woorden, en of de tekst niet "over de
    bronnen praat" in plaats van gewoon antwoord te geven.
79. Het systeem checkt op te veel gelijkenis met bestaande content.
80. Het systeem checkt de leesbaarheid van de tekst.
81. Het systeem controleert de technische metadata met een vaste rekenregel en herstelt kleine
    fouten daar zelf in, zonder daar het AI-model bij te hoeven halen.

## Fase 11. De kwaliteitspoort en eventueel herstellen

81a. Het systeem vertaalt alle uitkomsten van fase 10 naar één soort bevinding, met per bevinding de
    sectie, waarop hij rust, wat er had moeten staan, wat eraan te doen is, of hij publicatie
    tegenhoudt, en uit welke stap van de keten hij voortkomt.
81b. Uit die bevindingen komen drie getallen die het systeem bewust niet samenvoegt: hoe goed de
    pagina is, hoe zeker het systeem van dat oordeel is, en of er een reden is om niet te
    publiceren. Een pagina van 91 punten met één onderbouwde belofte die ontbreekt, is niet
    publiceerbaar; een pagina van 74 punten zonder zo'n punt wel.
81c. Wat "goed" is, verschilt per soort pagina. Een FAQ wordt op andere dingen beoordeeld dan een
    dienstenpagina, met andere gewichten en een andere ondergrens.
82. Scoort de tekst onder de drempel die bij dit soort pagina hoort, of overtreedt hij een harde
    regel, dan gaat de pagina naar "moet nog nagekeken worden" in plaats van meteen door.
83. Blijft de score onder de drempel van stap 82, ook nadat de citeerbaarheidsbeoordeling van fase 10
    (stap 76) is meegewogen, dan stuurt het systeem de gevonden bevindingen terug voor een
    herstelronde.
84. Het systeem geeft bij zo'n herstelronde alleen de secties met een concrete bevinding terug aan
    het model, niet de hele pagina. Per sectie krijgt het model het probleem, waaraan je ziet dat de
    sectie geslaagd is, welk bewijs het mag gebruiken, en wat de klant expliciet niet beweerd wil
    hebben. Is er voor een sectie geen bewijs, dan staat dat er letterlijk bij, met het verbod om er
    iets bij te verzinnen of om de lezer op te dragen het na te vragen.
85. Het model herschrijft alleen die secties.
86. De drie beoordelaars beoordelen de nieuwe versie opnieuw.
87. Het systeem vergelijkt de nieuwe score met de beste score tot nu toe. Alleen bij een echte
    verbetering blijft de nieuwe versie staan en volgt er nog een ronde; blijft de score gelijk of
    zakt hij, dan blijft de vorige, betere versie staan en stopt de lus.
88. Dit herhaalt zich tot maximaal drie herstelrondes.
88a. Het systeem stopt eerder zodra het probleem niet met herschrijven op te lossen is. Ontbreekt er
    een feit over het bedrijf, dan levert een nieuwe ronde dezelfde pagina in andere woorden op; dan
    gaat het punt naar de klant als vraag in plaats van naar het model als opdracht.
88b. Van elke ronde blijft vastliggen wat hij scoorde, hoeveel er blokkeerde en of zijn tekst
    behouden is. Daarmee is achteraf op te zoeken welke versie de beste was en waarom.

## Fase 12. De eindcontrole

89. Wil de klant de tekst definitief maken, dan checkt het systeem eerst of er nog open vragen staan
    die bij dit onderwerp of specifiek bij deze pagina horen.
90. Staan die er nog, dan mag de pagina nog niet definitief worden, tenzij de klant zelf kiest voor
    "overslaan telt als antwoord".
91. Blokkeert het systeem hier, dan laat het scherm meteen zien welke vragen dat zijn en waarom, en
    nooit alleen een blokkade zonder uitweg.

## Fase 13. Vrijgeven en klaarmaken voor de site van de klant

92. De klant leest de definitieve tekst door in het contentscherm.
93. De klant kan de tekst nog handmatig aanpassen voordat hij hem vrijgeeft.
94. De klant geeft de pagina vrij voor publicatie.
95. Het systeem zet de inhoud, de tekst, de FAQ en de technische metadata om naar de opmaak die past
    bij het sjabloon van de site van de klant, zodat plakken op de eigen site klopt met hoe die site
    een FAQ of een blok al toont.

## Fase 14. Publiceren en controleren

96. De klant plaatst de tekst zelf op zijn eigen website of in zijn eigen CMS. ORBIT ENGINE heeft
    geen directe koppeling met het CMS van de klant en publiceert dus nooit zelf.
97. De klant vult in ORBIT ENGINE de live-URL van de gepubliceerde pagina in.
98. Het systeem markeert de pagina meteen als gepubliceerd, met de datum en de URL erbij. De klant
    hoeft niet te wachten op een controle.
99. Het systeem zet op de achtergrond een controletaak klaar.
100. Die taak haalt de opgegeven URL echt op via internet.
101. Het systeem checkt of de pagina bereikbaar is.
102. Het systeem checkt of de tekst er echt op staat, met een steekproef van acht zinnen en een
     ondergrens van 60 procent herkenning, zodat kleine opmaakverschillen niet voor onnodig alarm
     zorgen.
103. Het systeem checkt of de technische metadata op de pagina staat.
104. Het systeem kijkt of de opgegeven URL doorstuurt naar een andere pagina (`fetchPage()` in
     `lib/crawler.ts` geeft het eindadres terug, `isRedirectedElsewhere()` in `lib/url.ts`
     vergelijkt). Een verschil in alleen http of https, www, een slash aan het eind of een
     trackingcode telt niet. Stuurt de link echt door, dan krijgt de klant het adres te zien waar
     hij uitkwam, met het verzoek dat in te vullen: Zoekverkeer koppelt bezoekers op het opgegeven
     adres. Staat de tekst op die andere pagina, dan blijft de pagina gepubliceerd.
105. Het systeem toont het resultaat aan de klant in gewone taal: welke problemen er zijn gevonden,
     of de bevestiging dat alles klopt.

## Fase 15. De nameting: heeft de pagina gewerkt?

Hier zit het onderscheidende punt van de hele keten: niet alleen meten en schrijven, maar ook
bewijzen of het geschrevene iets opgeleverd heeft. Een score die na publicatie stijgt is geen bewijs
op zichzelf, want zichtbaarheid beweegt ook vanzelf en de ruis in een meting van dertig vragen is al
gauw net zo groot als een gewone stijging. Daarom meet het systeem twee dingen naast elkaar: de
vragen waar deze ene pagina voor gemaakt is, en een controlegroep van vragen waar geen pagina voor
gemaakt is. Stijgt alles even hard, dan lag het niet aan de pagina.

106. Zodra de pagina als gepubliceerd gemarkeerd is (stap 98), plant het systeem automatisch twee
     hermeetmomenten in: golf 1 op 14 dagen na de publicatiedatum, golf 2 op 28 dagen erna. De klant
     hoeft hier niets voor te doen.
107. Niet eerder dan 14 dagen, want een AI-assistent neemt een nieuwe pagina niet dezelfde dag op:
     hij moet eerst gecrawld en geïndexeerd worden, en dat duurt bij zoekgestuurde assistenten dagen
     tot weken. Twee momenten in plaats van één, omdat één meting "opgepikt" niet van "toeval" kan
     onderscheiden.
108. Op het geplande moment verzamelt het systeem de doelvragen: precies de vragen uit de
     oorspronkelijke meting waarvoor deze pagina bedoeld was.
109. Het systeem stelt daar een controlegroep naast samen: vragen uit dezelfde analyse waarvoor geen
     enkele gepubliceerde pagina bestaat, tot maximaal vijf. De keuze is niet willekeurig maar vast
     bepaald, zodat golf 1 en golf 2 dezelfde controlevragen gebruiken en eerlijk naast elkaar staan.
110. Het systeem stelt alle doelvragen en controlevragen opnieuw aan een AI-assistent, op precies
     dezelfde manier als bij de oorspronkelijke meting in fase 5.
111. Het systeem bepaalt per vraag de stand van vóór publicatie: de laatste reguliere meting die
     dateert van vóór de publicatiedatum van deze pagina. Bewust niet de allereerste meting: publiceert
     de klant pas na drie maanden, dan is die geen eerlijk vertrekpunt meer.
112. Het systeem berekent het verschil tussen voor en na, apart voor de doelvragen en apart voor de
     controlegroep.
113. Het systeem trekt daaruit een streng oordeel: gestegen, gelijk gebleven of gedaald, met een
     eigen marge die meebeweegt met het aantal vergelijkbare vragen. Valt het verschil binnen die
     marge, dan telt dat als "gelijk", niet als een toevallige stijging. Zijn er te weinig
     vergelijkbare vragen om iets zinnigs te zeggen, dan is het oordeel "nog te weinig data" in plaats
     van een gok.
114. Het resultaat van deze golf wordt per pagina opgeslagen, los van de andere golf, zodat golf 1 en
     golf 2 apart terug te zien blijven.
115. Golf 2 (28 dagen) telt zwaarder dan golf 1 (14 dagen) zodra beide er zijn: een AI-systeem heeft
     een pagina in twee weken zelden al volledig opgepikt.
116. De klant ziet op Zoekverkeer bij elke pagina het eindoordeel met de aantallen eronder: bij
     hoeveel van de doelvragen AI het merk noemde vóór en na publicatie, en hetzelfde voor de
     controlegroep, plus wat dat betekent in gewone taal (`lib/impact-uitleg.ts`). Valt een stijging
     weg tegen de controlegroep, dan staat er dat hij waarschijnlijk niet door de pagina komt.
117. Deze hermeting staat los van de gewone maandelijkse meting uit fase 5, die op alle dertig vragen
     van de analyse blijft doorlopen. Zo hangt het verdict over deze ene pagina nooit af van één
     momentopname, en blijft ook zichtbaar hoe het merk zich in bredere zin ontwikkelt.

**Hiermee is de hele keten doorlopen: van het merkprofiel dat de adviseur klaarzet, tot het
bewezen effect van een pagina die de klant zelf gepubliceerd heeft.**
