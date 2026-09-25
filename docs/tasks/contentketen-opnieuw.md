# De contentketen opnieuw: vier stappen in plaats van vijftien

**Opgesteld:** 25 september 2026, na een gesprek met de eigenaar over de flow van contentplan tot
geschreven pagina. **Status: besloten, nog niet gebouwd.** Dit plan vervangt de keten uit
`contentpijplijn-publicatiewaardig.md` (strategie, schrijven, eindredactie, vier beoordelaars,
reparatierondes). Dat document blijft staan tot fase 3 hieronder af is, als uitleg van wat er
verdwijnt; daarna gaat het weg, samen met de andere documenten die de oude keten beschrijven (§8).

## 1. Waarom

De keten van pagina tot tekst is gegroeid tot zeven taaksoorten voor content, ongeveer 12.700 regels
code en 12 tot 15 AI-aanroepen per pagina. Elke fout uit een doorlichting kreeg een eigen regel,
beoordelaar of stap. Het resultaat:

- **Elke stap mag alleen weghalen.** De strategie schrapt elk onderwerp zonder feit, de redactie
  schrapt, de keuring blokkeert, de reparatie mag alleen weglaten. Geen stap voegt iets toe. Wat
  overblijft is een opsomming van feiten, en dat is precies de klacht van de klanten.
- **Bij elke overdracht gaat informatie verloren.** De schrijver ziet alleen wat de strategie hem
  geeft, niet het onderzoek, niet het winnende antwoord, niet de vakkennis.
- **Het model schrijft om door de controles te komen,** niet om de lezer te overtuigen.
- **Kwaliteit is niet meer te sturen.** Een wijziging op één plek wordt op drie andere plekken
  teruggedraaid; Claude kan de opdracht "maak de teksten beter" niet meer uitvoeren.

De cijfers: de blinde lezer ging van 4,1 (nulmeting) naar 4,9 (herhaling) naar 5 en 4 (nameting
fase 1), het doel was 6,5; de kosten per pagina gingen van ongeveer $0,16 naar $0,26 tot $0,31
(`contentpijplijn-publicatiewaardig.md` §14.2).

## 2. Uitgangspunten

1. **De invoer bepaalt de kwaliteit.** Een sterk model met volledige, rijke context schrijft beter
   dan een keten die de context in stukjes knipt.
2. **Streng alleen waar het gevaarlijk is.** Bedragen, getallen, termijnen, garanties, keurmerken,
   "altijd" en "nooit", vergelijkingen met concurrenten en veiligheid moeten een bron hebben,
   gecontroleerd in code. Al het andere schrijft het model vrij.
3. **Elke stap voegt iets toe.** Een stap die alleen weghaalt of blokkeert, verdient zijn plek niet.
4. **Eén maatstaf:** zou de ondernemer deze pagina zo op zijn site zetten, en is hij beter dan wat er
   nu staat en wat de concurrent heeft?
5. **Eén plek om kwaliteit te verbeteren:** de schrijfopdracht plus een vaste testset.

## 3. De besluiten van de eigenaar (25 september 2026)

1. **Een zin zonder bron houdt de pagina niet tegen.** Na de ene herschrijving wordt hij geel
   gemarkeerd op het goedkeuringsscherm; de ondernemer bevestigt of past aan.
2. **Alle bestaande klantdata gaat weg.** Alle bestaande content was ontwikkelmateriaal. Na de
   omschakeling begint de app leeg, en de nieuwe keten wordt getoetst op merken die opnieuw door de
   hele keten gaan. Er is geen overgangsregeling voor oude pagina's of oude vragen.
3. **Het antwoord op de open vraag geldt alleen voor die pagina,** tenzij de ondernemer aangeeft dat
   het voor zijn hele bedrijf geldt.
4. **Kwaliteit gaat voor, met één grens:** onder $0,50 per pagina.

Wat blijft: er wordt pas geschreven als elke vraag van de pagina beantwoord of overgeslagen is
(`contentflow-een-lijn.md` §1), en een maand vrijgeven zet alle vragen van die maand klaar.

Wat daarmee vervalt uit eerdere besluiten: de inputpoort van 40 en 70 procent met de keuze "algemeen
schrijven of laten vallen", en de verdeling van het redactionele werk over strategie, schrijven en
eindredactie (besluit van 25 september 2026 in `contentpijplijn-publicatiewaardig.md` §2).

## 4. Het nieuwe proces

### Per merk, één keer: het bedrijfsboek

Bestaat grotendeels al: het feitenregister met de conflictcontrole en de stem in het merkdossier.
Erbij komt het materiaal dat een tekst eigen maakt: twee of drie typische klussen, de werkwijze in
de woorden van de ondernemer, de bezwaren van klanten met zijn antwoord, wat het bedrijf bewust niet
doet, en waarom het ooit begon. De adviseur haalt dit op in het gesprek (vijf open vragen, een
kwartier).

### Stap 1. De lezersbrief (één aanroep met zoeken op het web, goedkope tier)

Wat wil iemand die hierop zoekt weten (deelvragen, beslisvragen); wat zeggen de AI-antwoorden en
concurrenten nu (het winnende antwoord komt uit de meting); welke vakkennis hoort erbij, met bron.
Vervangt het itemdossier, de bronverificatie en het contentcontract. Geen verplichte inhoudsopgave.

### Stap 2. De vragen aan de ondernemer (één kleine aanroep)

- **Vast één open vraag per pagina,** bovenaan: "Wat wil je dat er op de pagina over [onderwerp]
  komt? Denk aan een typische klus, wat klanten altijd vragen, waar je trots op bent, of wat er juist
  niet op moet." Met twee of drie voorbeeldzinnen. Tot ongeveer 3.000 tekens. Het antwoord gaat
  letterlijk naar de schrijver, weegt zwaarder dan de site, telt als bron voor harde beweringen, en
  een "noem X niet" is een verbod voor deze pagina. Het wordt niet in feiten geknipt en niet
  merkbreed, tenzij de ondernemer dat aangeeft.
- **Daarnaast drie tot vijf gerichte vragen** die deze pagina duidelijk beter maken, waarvan minstens
  één om een voorbeeld of verhaal vraagt. Alle eerder gestelde vragen van het merk gaan mee in
  dezelfde aanroep, zodat hij geen varianten stelt; een aparte vragenbeoordelaar is niet nodig.
- Overslaan mag, ook bij de open vraag. De schrijfpoort weegt alleen: alles beantwoord of
  overgeslagen, en de schrijfdatum (10 dagen voor publicatie) bereikt.

### Stap 3. Schrijven (één zware aanroep, Sol met extra denktijd, achtergrondmodus vanaf dag één)

De schrijver krijgt in één keer: de feiten van het bedrijfsboek die bij deze dienst horen (filter in
code op de indeling van het feitenregister), het antwoord op de open vraag, de andere antwoorden, de
lezersbrief, de stem, het doel van de pagina, de titels van de andere pagina's van het merk, en bij
"verbeteren" de huidige tekst van de site.

De opdracht is kort: schrijf voor deze lezer, zo lang als het onderwerp vraagt; open met het
antwoord op de hoofdvraag; gebruik vakkennis en voorbeelden om te overtuigen; elke harde bewering
alleen uit een bron, met een onzichtbare verwijzing ernaar. De lessen van de doorlichtingen worden
ongeveer tien schrijfprincipes in die opdracht, geen blokkades in code.

Uit dezelfde aanroep: de FAQ (nul tot vijf vragen), metatitel en metabeschrijving, en een korte
notitie voor de ondernemer over wat de schrijver nog had willen weten.

### Stap 4. Controle en hooguit één herschrijving

- **Code, zonder AI:** de code leest zelf elk bedrag, getal, termijn, keurmerkwoord, "garantie",
  "altijd" en "nooit" uit de tekst en zoekt er een bron voor (feitenregister, open antwoord, andere
  antwoorden, bron uit de lezersbrief). De verwijzing van het model is een hulp, niet het oordeel.
  Mechanische regels (metalengtes, de verboden tekens uit `docs/schrijfstijl.md` §10) worden
  gerepareerd, niet geblokkeerd.
- **Eén beoordelaar**, die leest als de ondernemer: zou ik dit zo plaatsen, wat zijn de drie grootste
  verbeterpunten, welke zinnen kunnen op elke concurrentensite staan, wat klinkt als een belofte
  zonder feit. Geen cijfer, want een los cijfer van zo'n beoordelaar schommelt 6 punten op dezelfde
  tekst (`kwaliteitsdoorlichting/blinde-lezer-toets/`).
- **Eén herschrijving**, alleen bij een bevinding van de code of duidelijke verbeterpunten, met de hele
  tekst plus de punten. Daarna ligt de tekst bij de klant.
- Zinnen die daarna nog geen bron hebben, worden geel op het goedkeuringsscherm. Goedkeuren kan pas
  als elke gele zin bevestigd of aangepast is (één klik per zin). Een aanpassing die de klant vraagt,
  loopt door dezelfde herschrijving.

### Wat verdwijnt en wat blijft

**Verdwijnt:** contentcontract, paginastrategie, losse FAQ-selectie, eindredactie, het panel van vier
beoordelaars, de zinnenbeoordelaar, merkstemtoets en eigenaarstoets als losse aanroepen,
sectieherstel met rondes, feitbehoud, de onzekerheidsblokkades, de lengtebudgetregels, de inputpoort,
de vragenbeoordelaar, de eindpoort op secties.

**Blijft:** het feitenregister met de conflictcontrole, de stem, het contentplan met vrijgeven per
maand, publiceren, de publicatiecontrole, de nameting na 14 en 28 dagen, de gestructureerde gegevens
uit code.

## 5. Voorziene problemen en de oplossing

| # | Probleem | Oplossing |
|---|---|---|
| 1 | De oude keten zit in tientallen bestanden (onzekerheid 29, eindpoort 20, contract 17, inputpoort 13) en in 37.500 regels tests | Eerst het nieuwe volledig bouwen, dan omschakelen, dan het oude in één keer weghalen met de typecontrole als gids; tests van verwijderde onderdelen gaan mee weg |
| 2 | Oude open vragen blokkeren de nieuwe poort | Vervalt: alle klantdata gaat weg (besluit 2) |
| 3 | Minder stappen, meer schommeling tussen twee runs | Zichtbaar maken met de testset; is het te veel, dan eerst twee versies laten schrijven en de beoordelaar laten kiezen |
| 4 | Bekende fouten komen terug | Mechanisch: code repareert. Stijl: schrijfprincipes. De slechte zinnen uit `contentpijplijn-publicatiewaardig.md` §14.3 worden testgevallen |
| 5 | De beoordelaar is mild over tekst van zijn eigen soort | Vergelijken en punten noemen in plaats van een cijfer; zijn oordeel is geen poort |
| 6 | Het model vergeet verwijzingen | De code zoekt de bron zelf; de verwijzing is een hulp |
| 7 | Valse alarmen (telefoonnummer, postcode, "24 uur", subsidiebedrag, "sinds 1990" tegen "35 jaar") | Een zin zonder bron blokkeert niet maar wordt geel (besluit 1) |
| 8 | De ondernemer keurt goed zonder te lezen | Niet volledig op te lossen; goedkeuren kan pas na de gele zinnen |
| 9 | De schrijfaanroep duurt langer dan de routelimiet van 300 seconden (de eindredactie deed al 179 tot 359) | Achtergrondmodus vanaf dag één voor schrijven en herschrijven |
| 10 | De invoer groeit bij grote merken | Alleen feiten van de dienst van de pagina gaan mee; filter in code |
| 11 | De kosten zijn geschat, niet gemeten | Meten op `ai_calls` bij de eerste echte pagina's; grens $0,50; kostenschattingen in de app bijwerken |
| 12 | Of het beter scoort, blijkt pas weken na publicatie | De testset meet kwaliteit en citeerbaarheid; de nameting blijft het bewijs voor effect |
| 13 | De blinde lezer is ook een model, de proefset is klein | De eigenaar beoordeelt zelf zes paren blind |
| 14 | Documenten en conventie 1 beschrijven de oude keten | Opruimen in dezelfde commit als het weghalen (§8) |

## 6. Invoering

**Fase 1. Bouwen naast het oude.** De controle op harde beweringen als pure module met uitgebreide
tests. Vier nieuwe taaksoorten, elk hooguit één zware aanroep: lezersbrief, vragen, schrijven,
controle met herschrijving. Migratie alleen toevoegend: veld voor de lezersbrief, vraagsoort "open",
langer antwoord. Ketentests voor vrijgeven, vragen, laatste antwoord, schrijven en goedkeuren.

**Fase 2. Omschakelen en leegmaken.** Het contentplan roept de nieuwe taken aan, de schrijfpoort weegt
alleen de vragen en de datum, het goedkeuringsscherm toont tekst, punten van de beoordelaar en gele
zinnen. Daarna alle klantdata weg (besluit 2).

**Fase 3. Toetsen op een schone lei.** De drie merken van de proefset (hovenier, installateur,
rijschool) opnieuw door de hele keten, van merk aanmaken tot geschreven pagina, met de antwoorden uit
`kwaliteitsdoorlichting/antwoorden/` en het waarheidsdossier. De blinde lezer vergelijkt per paar met
de oude teksten die in `kwaliteitsdoorlichting/` bewaard zijn, in beide volgordes; de eigenaar
beoordeelt zes paren blind.

Door als: de nieuwe versie wint bij minstens 7 van de 9 paren, de eigenaar kiest minstens 5 van de 6
keer de nieuwe, er zitten niet meer fouten in harde beweringen, en de kosten blijven onder $0,50 per
pagina. Haalt hij dat niet, dan wordt de schrijfopdracht aangepast en opnieuw getoetst. Het oude
blijft in de code staan tot hij het haalt; terugdraaien kan tot dan met een deploy.

**Fase 4. Het oude weghalen.** Oude taken, modules, schermpanelen en tests in één keer weg, met
typecontrole en de vier vaste controles groen. Documentatie en CLAUDE.md bijwerken (§8).

**Fase 5. De verbeterlus.** Kwaliteit verbeteren is vanaf dan één handeling: schrijfopdracht aanpassen,
testset draaien, vergelijken.

## 7. Nog open

- Voor fase 3 en de verbeterlus moet de testset vanuit een ontwikkelsessie te draaien zijn. Deze
  werkomgeving heeft geen OpenAI-sleutel; die moet in de omgevingsinstellingen, of de testset draait
  via een beheerroute in productie.
- Welke gegevens precies onder "alle klantdata" vallen, stemt de eigenaar af vóór het verwijderen:
  merken met alles eronder, klantaccounts met hun inlog, en of de Sales-module meegaat.

## 8. Documentatie die meegaat (in fase 4)

- `docs/processtappen-nieuwe-pagina.md` fase 7 tot en met 12 herschrijven.
- `docs/architecture.md` §6: taaksoorten, aanroepen en de kostenrekensom.
- `docs/contentpijplijn-overdracht.md`, `docs/tasks/contentpijplijn-publicatiewaardig.md`,
  `docs/tasks/contentpijplijn-werkstand.md`, `docs/tasks/contentpijplijn-herontwerp.md`,
  `docs/tasks/vragen-voor-het-schrijven.md`: weg of samengevat, met de vertaaltabel bovenaan
  `docs/logbook.md`.
- CLAUDE.md conventie 1: een vangnet in code alleen voor harde beweringen en mechanische regels.
- `docs/merkstrategie.md` §30: nagaan of een belofte over teksten verandert.
