---
name: team-session
description: Voer een Teamsessie uit over één onderdeel van ORBIT ENGINE. Een multidisciplinaire product- en UX-review waarin geselecteerde experts (product, UX, engineering, AI, GEO, growth, data, security) het onderdeel eerst in de code onderzoeken, onafhankelijk analyseren, elkaar waar nodig tegenspreken, en eindigen met maximaal vijf geprioriteerde verbetervoorstellen. Wijzigt nooit code.
when_to_use: Gebruik bij "start een teamsessie voor X", "teamsessie over X", "laat het team naar X kijken", "multidisciplinaire review van X", "brainstorm met het team over X", waarbij X een onderdeel van de app is zoals onboarding, login, dashboard, navigatie, analytics, GEO-monitoring, contentworkflow, merkprofiel, instellingen of een specifiek scherm. Niet gebruiken als de vraag om implementatie vraagt.
argument-hint: [onderdeel]
disallowed-tools: Edit, Write, NotebookEdit, Bash, mcp__Supabase__apply_migration, mcp__Supabase__execute_sql
---

# Teamsessie

Een klein senior productteam kijkt naar één onderdeel van ORBIT ENGINE en levert een advies.
Onderzoek is het doel, uitvoering niet.

**Onderdeel van deze sessie: $ARGUMENTS**

## De harde regel

**Deze sessie wijzigt niets.** Geen bestanden, geen migraties, geen commits, geen refactors, ook
niet als een bevinding triviaal te repareren lijkt. De schrijftools zijn tijdens deze beurt
weggehaald, en die regel blijft staan zolang de sessie loopt, ook over meerdere beurten heen. Wil
de eigenaar iets laten bouwen, dan zegt hij dat na afloop en dat is een nieuwe opdracht met de
normale werkwijze.

Elke expert draait read-only (`Read`, `Grep`, `Glob`). Dat is afgedwongen in de agent-definities,
niet gevraagd.

## Fase 0, bepaal het onderdeel

Neem het onderdeel uit de opdracht. Is het onduidelijk waar de grens ligt, kies dan zelf de meest
waarschijnlijke afbakening, benoem hem in één zin en ga door. Vraag alleen na als twee lezingen
compleet ander werk opleveren, bijvoorbeeld "analytics" dat zowel het zichtbaarheidsscherm als de
Search Console-koppeling kan betekenen.

## Fase 1, context (alleen de hoofdcontext)

Zoek de bestanden **één keer** op en geef die lijst straks aan alle experts mee. Zonder die stap
gaat elke expert zelf zoeken en betaal je dat vier tot zes keer.

1. Lees de rij van dit onderdeel in `references/onderdeelkaart.md`. Staat het onderdeel er niet,
   zoek dan zelf met Glob en Grep en meld dat de kaart een rij mist.
2. Lees zelf hooguit tien bestanden: het hoofdscherm, de datalaag eronder, en de documentatiesectie
   die de kaart noemt. `docs/logbook.md` is de plek waar staat waaróm iets zo is; kijk daar vóór je
   iets als fout bestempelt.
3. Schrijf voor jezelf in vijf tot tien regels: wat doet dit onderdeel, wie gebruikt het wanneer,
   welke stappen doorloopt de gebruiker, en wat is er meetbaar aan.

Bedenk in deze fase nog geen oplossingen.

## Fase 2, stel het team samen

**Vier experts is de norm, zes het maximum.** Meer mag alleen met een reden die je opschrijft.
Onder de vier kom je alleen bij een klein, geïsoleerd onderdeel.

Kies uit de elf disciplines in `references/onderdeelkaart.md` (kolom "standaarddisciplines" geeft
het startpunt per onderdeel) plus de Devil's Advocate, die apart draait in fase 5.

| Regel | Waarde |
|---|---|
| Gewichten tellen op tot 100 | Percentage per discipline |
| Hoogste gewicht | Maximaal 35, anders kijkt het team door één bril |
| Laagste gewicht | Minimaal 10. Een expert van 5% is decor, laat hem weg |
| Model | De expert met het hoogste gewicht krijgt `model: "opus"` mee via de Agent-tool, de rest draait op de sonnet uit zijn definitie |
| Verplicht | Minstens één expert die de voor de hand liggende lezing waarschijnlijk tegenspreekt |

Software Architect doet niet mee bij een schermwijziging zonder dataflow. SEO en GEO doen alleen
mee als het onderdeel echt over zichtbaarheid gaat. Security alleen bij rechten, toegang of
persoonsgegevens.

Meld de samenstelling in twee zinnen: wie, met welk gewicht, en waarom de afvallers afvielen.

## Fase 3, onafhankelijke analyse

Start alle experts **in één blok Agent-aanroepen**, met `run_in_background: false`, zodat ze
parallel draaien en je hun uitkomsten in dezelfde beurt hebt. **Noteer de `agentId` die elke
aanroep teruggeeft**, want daarmee spreek je in fase 5 een expert opnieuw aan zonder dat hij de
code nog eens moet lezen.

Gebruik per expert deze taakprompt:

```
Teamsessie: <onderdeel>.
Jouw gewicht in dit team: <n>%. <Eén zin over waarom jouw blik hier zwaar of licht weegt.>

De implementatie staat in:
<bestandenlijst uit fase 1, met per regel wat het bestand doet>
Relevante documentatie: <secties>

Lees hooguit acht bestanden. Begin bij het scherm, niet bij de documentatie:
de code is leidend, een document kan verouderd zijn.

Rapporteer in dit format, en houd je aan de maxima:
WAT WERKT GOED (max 3, elk één regel)
WAT KAN BETER (max 3, elk twee regels: wat je ziet, en waarom het een probleem is)
KANSEN (max 3, elk één regel)
KERNPROBLEEM (precies 1, twee regels)
CONFIDENCE (low/medium/high, met in vijf woorden waarom)

Elke bewering begint met wat je in de code hebt gezien, met bestandsnaam of
regelnummer erbij. Een advies zonder waarneming eronder telt niet.
Geen algemene best practices. Geen oplossingen die je niet aan dit onderdeel
kunt koppelen. Maximaal 400 woorden totaal.
```

## Fase 4, synthese (alleen de hoofdcontext)

Leg de rapporten naast elkaar en sorteer elke bewering in precies één bak. Laat ze niet door elkaar
lopen, want de eigenaar beslist erop:

- **Observatie:** aantoonbaar in de code of in de app, met vindplaats.
- **Hypothese:** aannemelijke uitleg, nog niet bewezen. Noteer erbij hoe je hem zou toetsen.
- **Idee:** een mogelijke oplossing.

Groepeer daarna: hetzelfde probleem vanuit meerdere hoeken, vergelijkbare ideeën, botsende ideeën,
en unieke inzichten die maar één expert zag. **Een waarneming die maar één expert deed is niet
zwakker.** Weeg de onderbouwing, niet het aantal stemmen. Zeg het expliciet als iets alleen
consensus lijkt doordat drie experts hetzelfde bestand lazen.

## Fase 5, tegenspraak

Twee onderdelen, allebei alleen als ze iets opleveren.

**Debat.** Start een tweede ronde alleen bij een echt conflict: twee experts doen een uitspraak die
niet allebei tegelijk opgevolgd kan worden. Smaakverschil is geen conflict. Stuur dan met
`SendMessage` aan de twee betrokken experts (hun context staat er nog, ze hoeven niets opnieuw te
lezen):

```
<Naam andere expert> stelt: "<positie>". Jij stelt: "<positie>".
Drie vragen, maximaal 150 woorden totaal:
1. Wat in de code maakt jouw positie juist?
2. Wat klopt er aan het argument van de ander?
3. Wat is de onderliggende oorzaak waar jullie het wel over eens zijn?
```

Nooit meer dan één ronde, nooit meer dan twee conflicten, nooit experts die er niet bij betrokken
zijn.

**Devil's Advocate.** Start de `devil-advocate`-agent één keer, ná de synthese en vóór de
prioritering. Geef hem de conceptbevindingen mee plus de bestandenlijst, zodat hij zelf kan
narekenen. Zijn opdracht is niet een alternatief ontwerp bedenken maar het team onderuithalen: is
het probleem bewezen, is het belangrijk genoeg, lossen we een symptoom op, kan het eenvoudiger, wat
gaat er stuk. Verwerk zijn bezwaren in de prioritering; een aanbeveling die hij overtuigend
onderuithaalt zakt of valt af.

## Fase 6, prioriteren en rapporteren

Maximaal vijf verbeteringen. P0 is hoge impact met sterke onderbouwing, P1 een duidelijke
verbetering die kan wachten, P2 een idee dat eerst getoetst moet worden.

**Een P0 vereist dat het probleem is wáárgenomen, niet alleen uit de code afgeleid.** Een faalpad
dat logisch bestaat maar in productie nooit is voorgekomen, is hooguit P1: zonder frequentie is
prioriteit niet te onderbouwen. Zeg er dan bij welke meting dat zou aantonen. Dit is de valkuil die
in de eerste Teamsessie het hardst toesloeg: vier van de vijf experts wezen onafhankelijk hetzelfde
probleem aan, en dat voelde als bewijs terwijl geen van hen frequentie had gekeken.

Sluit af in het Nederlands, zonder gedachtestreepjes en zonder verkooppraat, in deze acht blokken:

1. **Onderdeel.** Wat is onderzocht, en waar houdt het op.
2. **Team.** Wie deed mee, met gewicht, en waarom deze en niet die.
3. **Wat werkt al goed.** Maximaal vijf regels.
4. **Belangrijkste problemen.** Maximaal vijf regels, elk met de vindplaats.
5. **Belangrijkste kansen.** Maximaal vijf regels.
6. **Discussiepunten.** Alleen als er echt onenigheid was, met wat het debat opleverde. Ook de
   minderheidsstandpunten die overeind bleven.
7. **Topverbeteringen.** Maximaal vijf, elk met: probleem, voorstel, waarom, betrokken expertise,
   impact, confidence, en de trade-off die je ervoor accepteert.
8. **Teamconclusie.** Als er maar drie dingen mogen, welke drie, en waarom die drie.

Eindig met één regel: welke aanbeveling het team zou schrappen als de eigenaar zegt dat er geen tijd
is, en waarom die de goedkoopste opoffering is.

**Daarna stop je.** Geen implementatie, geen vervolgvoorstel, geen "zal ik alvast". Bied wel aan de
uitkomst als notitie in `docs/tasks/` te zetten; dat is een volgende opdracht en gebeurt dus in een
volgende beurt.

## Tokenbudget

Een sessie hoort te blijven onder ongeveer vijf expertaanroepen plus één Devil's Advocate. Wat de
kosten drukt: de bestandenlijst één keer opzoeken in plaats van per expert, Sonnet voor iedereen
behalve de zwaarste expert, geen tweede ronde zonder conflict, en de synthese uitsluitend hier in
de hoofdcontext. Zie je halverwege dat het onderdeel te groot is, knip het dan op en zeg welk stuk
je nu doet, in plaats van meer experts te starten.

## Uitbreiden

Een discipline erbij: nieuw bestand in `.claude/agents/`, zelfde opbouw, read-only tools, en een
regel in de disciplinelijst van `references/onderdeelkaart.md`. Een onderdeel erbij: één rij in de
onderdeelkaart. Aan deze SKILL.md hoef je in beide gevallen niets te veranderen.

⚠️ **Een nieuwe expert is pas bruikbaar in een volgende sessie.** Claude Code leest `.claude/agents/`
bij het opstarten, dus een agent die je vandaag aanmaakt bestaat voor deze sessie nog niet. Krijg je
"Agent type not found", start dan Claude Code opnieuw op.
