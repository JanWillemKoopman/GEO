# Van klant tot pagina: alle stappen op een rij

> **Voor wie dit is.** Iedereen die wil zien wat er precies gebeurt tussen het aanmaken van een
> klant en het moment dat er een nieuwe, publiceerbare pagina klaarstaat, zonder dat je code hoeft
> te lezen. Elke stap staat er, hoe klein ook, ook de stappen die geen mens ooit aanklikt omdat de
> app ze zelf doet.
>
> **Waarom dit een apart document is.** [`APP_FLOW_DOCUMENTATION.md`](../APP_FLOW_DOCUMENTATION.md)
> legt dezelfde keten uit in vijf fases en beantwoordt vooral de vraag "waarom werkt het zo". Dit
> document beantwoordt "wat gebeurt er precies, in welke volgorde". Klopt er iets niet meer, dan is
> de code leidend: `lib/pipeline/` en `lib/jobs/` zijn de bron waar dit overzicht uit is opgebouwd.
>
> **Peildatum: 2 september 2026.**

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
6. Het systeem maakt het merkprofiel aan in de database.
7. Het systeem zet automatisch een reeks van acht onderzoekstaken klaar om te gaan draaien.

## Fase 2. Het automatische onderzoek (ongeveer 7,5 minuten, ongeveer 25 dollarcent)

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
15. **Taak 8, alles samenbrengen.** Een synthesestap bundelt de zeven vorige taken tot één
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
    wil groeien, de klantgroepen waar de groei zit, plaatsen waar hij nog niet zit, wat een klant
    ongeveer waard is, zijn seizoenspatroon, veelgehoorde bezwaren, verboden onderwerpen, extra
    bewijs zoals certificeringen of cijfers, gelijknamige bedrijven die hij niet is, of er nieuwe
    pagina's bij mogen komen, en waar hij over een jaar wil staan.
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
    Registreren zonder uitnodiging kan niet.
32. De adviseur wijst het merk toe aan het account van de klant.
33. Het merk krijgt de status Overgedragen. De klant kan nu inloggen en zijn eigen werkruimte
    gebruiken; de adviseur houdt daarnaast volledige toegang.

## Fase 4. Een analyse opzetten (bepalen wat er gemeten gaat worden)

34. De klant of de adviseur kiest een merk en typt een onderwerp in, bijvoorbeeld "wasmachine
    repareren".
35. Optioneel vult diegene een korte content-brief in met extra context of wensen.
36. Het systeem onderzoekt wat de eigen website al over dit onderwerp zegt.
37. Het systeem zoekt uit wie hier de concurrenten zijn.
38. Het systeem stelt 30 realistische koopvragen op, verdeeld over drie fases van de klantreis:
    oriëntatie, overweging en beslissing, elk met een eigen aantal vragen.
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
48. Het systeem schrijft een jargonvrij rapport, met bij elke uitspraak het bewijs waar je op kunt
    doorklikken.

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
56. Het systeem zet voor elke gekozen pagina een taak in de achtergrondwachtrij. De klant hoeft niet
    te wachten en mag het scherm sluiten.
57. Voor elke pagina onderzoekt het systeem het onderwerp nog verder: welke deelvragen en
    vervolgvragen hoort een lezer te hebben, welke twijfels leven er, en welke uitleg met bron hoort
    daarbij. Dit gebeurt met een eigen zoekactie op het web.
58. Het systeem verifieert die gevonden uitleg: alleen wat aantoonbaar klopt, gaat door naar de
    volgende stap.
59. Het systeem stelt het contentcontract op: de inhoudsopgave die deze pagina echt nodig heeft, met
    per sectie de vraag of daar een uitspraak over dit specifieke bedrijf bij hoort.
60. Het systeem checkt of er al een vergelijkbare pagina op de site van de klant staat en haalt die
    op, zodat de nieuwe tekst zich daartegen kan afzetten in plaats van hem te herhalen.
61. Het systeem bouwt de feitenkaart: alles wat met een bron bekend is over dit bedrijf, uit het
    onderzoek, uit het gesprek en uit eerder beantwoorde vragen.
62. Het systeem berekent welk deel van de secties uit het contract met een feit onderbouwd kan
    worden.
63. Dat percentage bepaalt of er al geschreven mag worden: bij 70 procent of hoger gaat het schrijven
    gewoon door, tussen de 40 en 70 procent mag het schrijven door met een zichtbare waarschuwing
    welke secties eruit vallen, en onder de 40 procent schrijft het systeem nog niet, tenzij de klant
    zelf kiest om de pagina bewust algemeen te laten schrijven of te laten vallen.

## Fase 8. De vragen aan de klant (de briefing)

64. Zodra de laatste pagina uit de gekozen groep zijn contract heeft, start het systeem de
    briefingstap voor de hele groep in één keer.
65. Het systeem voert een claim-audit uit: welke beweringen heeft elke pagina nodig, en welke
    daarvan kunnen nog niet onderbouwd worden met de feitenkaart.
66. Van elk zo'n gat maakt het systeem een korte, begrijpelijke vraag.
67. Overlappende vragen over meerdere gekozen pagina's worden samengevoegd tot één vraag, tot een
    maximum van acht vragen in totaal. Zo hoeft de klant niet drie keer los "wat is er inbegrepen"
    te beantwoorden.
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
    AI-assistent deze pagina zou citeren. Deze drie draaien los van elkaar, zodat één gunstig
    zelfoordeel de andere twee niet kan overstemmen.
77. Het systeem checkt daarnaast de dekking van het contentcontract: hoeveel van de vereiste secties
    staan er echt in.
78. Het systeem checkt op verboden onderwerpen, verboden woorden, en of de tekst niet "over de
    bronnen praat" in plaats van gewoon antwoord te geven.
79. Het systeem checkt op te veel gelijkenis met bestaande content.
80. Het systeem checkt de leesbaarheid van de tekst.
81. Het systeem valideert de technische metadata programmatisch en repareert hem zo nodig zelf,
    zonder daarvoor het AI-model in te schakelen.

## Fase 11. De kwaliteitspoort en eventueel herstellen

82. Scoort de tekst onder de redactionele drempel, of overtreedt hij een harde regel, dan gaat de
    pagina naar "moet nog nagekeken worden" in plaats van meteen door.
83. Scoort de tekst onder de citeerbaarheidsdrempel, dan stuurt het systeem de gevonden bevindingen
    terug voor een herstelronde.
84. Het systeem geeft bij zo'n herstelronde alleen de secties met een concrete bevinding terug aan
    het model, niet de hele pagina.
85. Het model herschrijft alleen die secties.
86. De drie beoordelaars beoordelen de nieuwe versie opnieuw.
87. Het systeem vergelijkt de nieuwe score met de beste score tot nu toe. Alleen bij een echte
    verbetering blijft de nieuwe versie staan en volgt er nog een ronde; blijft de score gelijk of
    zakt hij, dan blijft de vorige, betere versie staan en stopt de lus.
88. Dit herhaalt zich tot maximaal drie herstelrondes.

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
104. Het systeem checkt of je via de opgegeven URL op een andere pagina bent uitgekomen, bijvoorbeeld
     door een doorverwijzing.
105. Het systeem toont het resultaat aan de klant in gewone taal: welke problemen er zijn gevonden,
     of de bevestiging dat alles klopt.

**Hiermee is de nieuwe pagina opgeleverd.** Wat er hierna gebeurt, het opnieuw meten na 14 en 28
dagen met een controlegroep om het effect van de pagina te bewijzen, valt buiten deze lijst en
staat beschreven in fase 5 van [`APP_FLOW_DOCUMENTATION.md`](../APP_FLOW_DOCUMENTATION.md).
