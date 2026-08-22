---
name: innovation-session
description: Voer een Innovatiesessie uit over een onderwerp, een stap of een probleem in ORBIT ENGINE. Eerst een nulmeting van de huidige situatie, dan een brede brainstorm waarin vier tot zes denkers (innovator, AI-innovator, strateeg, investeerder, klantstem en waar nodig een vakexpert) los van elkaar veel ideeën bedenken, elk vanuit een andere prikkel. De eigenaar kiest daarna één tot twee keer de richting. Het resultaat is een implementatieplan voor Claude Code in docs/tasks/. Wijzigt nooit code.
when_to_use: Gebruik bij "start een innovatiesessie voor X", "innovatiesessie over X", "brainstorm breed over X", "denk out of the box over X", "welke innovatieve mogelijkheden zijn er voor X", waarbij X een onderdeel, een stap, een probleem of een open vraag is. Gebruik de skill team-session als de vraag is wat er beter kan aan iets dat er al staat; gebruik deze skill als de vraag is wat er zou kunnen bestaan dat er nog niet is.
argument-hint: [onderwerp, stap of probleem]
disallowed-tools: Edit, NotebookEdit, Bash, mcp__Supabase__apply_migration, mcp__Supabase__execute_sql
---

# Innovatiesessie

Een groep denkers kijkt naar één onderwerp in ORBIT ENGINE en bedenkt wat er zou kunnen bestaan dat
er nu niet is. Verzinnen is het doel, kiezen doet de eigenaar, en het eindpunt is een plan dat
Claude Code kan bouwen.

**Onderwerp van deze sessie: $ARGUMENTS**

## Waarin dit verschilt van een Teamsessie

Verwar de twee niet, want ze belonen tegenovergesteld gedrag.

| | Teamsessie | Innovatiesessie |
|---|---|---|
| De vraag | Wat is er mis, en wat verbeteren we | Wat zou hier kunnen bestaan dat er nu niet is |
| Beweging | Meteen convergent, naar vijf prioriteiten | Eerst breed uiteen, pas daarna smal |
| Kritiek | Hoort erbij, de tegenspraak zit in het midden | Verboden tijdens het bedenken, verplicht na de keuze |
| Verloop | Eén beurt, dan af | Meerdere beurten, met één tot twee keer sturen door de eigenaar |
| Uitkomst | Een advies in het gesprek | Een implementatieplan als bestand in `docs/tasks/` |

Vraagt iemand om een innovatiesessie terwijl de vraag eigenlijk "wat kan hier beter" is, zeg dat dan
in één zin en stel de Teamsessie voor. Andersom net zo.

## De harde regels

1. **Deze sessie wijzigt geen code.** Geen bestanden in `app/`, `lib/`, `components/`, `scripts/` of
   `supabase/`, geen migraties, geen commits. De bewerktools zijn tijdens deze beurt weggehaald, en
   dat blijft zo zolang de sessie loopt, ook over meerdere beurten heen.
2. **Er wordt precies één bestand geschreven**, in fase 6, in `docs/tasks/`. Geen tweede bestand,
   geen tussentijdse notitie. Vóór fase 6 schrijf je niets.
3. **Committen hoort niet bij deze sessie.** Wil de eigenaar het plan vastleggen, dan is dat een
   volgende opdracht.
4. **Kritiek is verboden in fase 3 en 4.** Niet uitgesteld, verboden. Een idee neerhalen voordat het
   is uitgesproken is de goedkoopste manier om een innovatiesessie te laten mislukken, en het is de
   standaardneiging van elk model dat op nuttig zijn is getraind. De tegenspraak komt in fase 5, en
   dan hard.

## Fase 0, bepaal het onderwerp

Een onderwerp mag drie vormen hebben, en alle drie zijn geldig:

- **Een onderdeel of scherm.** "De effectmeting", "het merkprofiel".
- **Een stap in het proces.** "Het moment waarop de klant content goedkeurt".
- **Een probleem of open vraag.** "Klanten doen niets met het rapport", "hoe weten we of we winnen".

Is de vorm onduidelijk, kies dan de meest waarschijnlijke lezing, benoem hem in één zin en ga door.
Vraag alleen na als twee lezingen compleet ander werk opleveren.

Is het onderwerp te groot om in één sessie te doen, bijvoorbeeld "de hele app", knip het dan op,
zeg welk stuk je nu doet en waarom dat stuk eerst.

## Fase 1, de nulmeting

**Deze fase is verplicht en wordt altijd als eerste aan de eigenaar getoond, vóór er één idee op
tafel komt.** Zonder gedeeld beeld van vandaag is elke brainstorm een gok, en de eigenaar kan een
idee pas beoordelen als hij weet waartegen het afsteekt.

Zoek de bestanden **één keer** op en geef die lijst straks aan alle denkers mee. Zonder die stap
gaat elke denker zelf zoeken en betaal je dat vijf keer.

1. Raadpleeg `../team-session/references/onderdeelkaart.md` voor de vindplaats. Staat het onderwerp
   er niet, of is het een probleem in plaats van een onderdeel, zoek dan zelf met Glob en Grep en
   noem in de sessie welke rij ontbreekt.
2. Lees hooguit twaalf bestanden: het scherm, de datalaag eronder, de pijplijnstap, en de
   documentatiesectie die de kaart noemt. `docs/logbook.md` zegt waaróm iets zo is.
3. Lees `references/bouwbaar.md` helemaal.

Schrijf de nulmeting daarna uit in de sessie, in deze zeven blokken, elk hooguit vijf regels:

1. **Wat het vandaag doet.** Feitelijk, zonder oordeel.
2. **Hoe het technisch werkt.** De keten van scherm tot data, met de bestandsnamen erbij.
3. **Wie het gebruikt, en wanneer.** De consultant vóór de verkoop, de klant erna, of allebei.
4. **Wat het kost.** Aan geld per klant, aan AI-aanroepen, en aan tijd van een mens.
5. **Wat er al over besloten is.** Uit `docs/logbook.md`, met datum en cijfer. Dit is het blok dat
   voorkomt dat de sessie iets herontdekt dat ooit met argumenten is afgeschoten.
6. **Waar het vastloopt.** De waargenomen klacht, en apart daarvan het afgeleide faalpad. Zeg welke
   van de twee het is.
7. **Wat er niet is.** De lege plek: wat had hier kunnen staan en staat er niet. **Dit blok is het
   belangrijkste van de zeven**, want daar zitten de ideeën in, en het is het blok dat je overslaat
   als je niet oplet.

Bedenk in deze fase nog geen oplossingen. Klopt de nulmeting volgens de eigenaar niet, dan draai je
fase 3 opnieuw met de gecorrigeerde versie; dat is goedkoper dan doorbouwen op een verkeerd beeld.

## Fase 2, stel de groep samen en verdeel de prikkels

**Vier denkers is de norm, zes het maximum.**

De kern zijn de vijf innovatiedenkers. Neem er minstens drie van, en `innovator` doet altijd mee:

| Agent | Brengt in |
|---|---|
| `innovator` | Radicale herkadering, omkeren, weglaten, analogieën uit andere sectoren |
| `ai-innovator` | Wat de huidige generatie modellen kan dat de app niet benut. Mag als enige buiten de codebase kijken |
| `strateeg` | Drie jaar vooruit, verdedigbaarheid, wat dit onderwerp overbodig maakt |
| `investeerder` | Waarvoor betaalt een klant meer, wat kost het per klant, hoe snel is het bewezen |
| `klantstem` | De MKB-ondernemer die betaalt en het moet snappen, in de eerste persoon |

Vul aan met hooguit twee vakexperts uit `../team-session/references/onderdeelkaart.md`, en alleen
als het onderwerp er echt om vraagt: `geo-specialist` bij zichtbaarheid in AI-antwoorden,
`data-analyst` bij meten, `ux-designer` bij een flow, `software-architect` bij dataflows.

**Wie er nooit bij mag in deze fase:** `devil-advocate`. Die draait in fase 5.

**Model.** Hooguit twee denkers krijgen `model: "opus"` mee via de Agent-tool, de rest draait op de
sonnet uit zijn definitie. Geef opus aan de twee die het meeste van het onderwerp afhangen, meestal
`innovator` en `ai-innovator`.

**Prikkels.** Geef elke denker een andere prikkel uit `references/prikkels.md`. Nooit twee keer
dezelfde in één sessie, en kies de prikkel bij de denker. Dit is het mechanisme dat voorkomt dat
vijf experts vijf varianten van hetzelfde idee opleveren.

Meld de samenstelling in twee zinnen: wie, met welke prikkel, en waarom die combinatie.

## Fase 3, divergentie

Start alle denkers **in één blok Agent-aanroepen**, met `run_in_background: false`, zodat ze
parallel draaien en je hun uitkomsten in dezelfde beurt hebt. **Noteer de `agentId` die elke aanroep
teruggeeft**, want in fase 5 spreek je er twee opnieuw aan zonder dat ze alles moeten herlezen.

Gebruik per denker deze taakprompt:

```
Innovatiesessie: <onderwerp>.
Jouw prikkel: <prikkel uit prikkels.md, voluit>.
Begin bij die prikkel. Je mag hem loslaten als je onderweg iets beters vindt.

DE HUIDIGE SITUATIE
<de zeven blokken van de nulmeting, ingekort tot ongeveer 200 woorden>

WAAR HET STAAT
<bestandenlijst uit fase 1, met per regel wat het bestand doet>
Relevante documentatie: <secties>
De realiseerbaarheidskaart staat in
.claude/skills/innovation-session/references/bouwbaar.md. Lees hem, vooral de
kolom "wat er nauwelijks mee gedaan wordt".

Lees hooguit acht bestanden.

Lever vijf ideeën, in dit format, en houd je aan de verdeling:
- twee ideeën KLEIN (bouwbaar in een dag, geen nieuwe tabel, geen nieuw taaktype)
- twee ideeën MIDDEL (een sprint, mag een migratie en een nieuw taaktype kosten)
- een idee GROOT (verandert wat het product is)
Plus, apart, JOUW WILDSTE IDEE: het idee waarvan je zelf denkt dat het
misschien te ver gaat. Dat is geen bonus maar een verplicht onderdeel.

Per idee, vier regels:
NAAM: <hooguit vier woorden>
WAT: <wat het is, in één zin, concreet genoeg om je het voor te stellen>
WAAROM NU: <wat het verandert voor de klant of voor het bedrijf>
WAAROP HET LEUNT: <welk bestaand gereedschap uit de kaart, of welke nieuwe tabel,
taak of aanroep het nodig heeft>

Regels:
- Geen kritiek, niet op jezelf en niet op iets dat er staat. Alleen bedenken.
- Geen algemene wijsheid. Elk idee raakt dit onderwerp en niets anders.
- Elk idee is bouwbaar met de gereedschappen uit de kaart plus een ontwikkelaar
  die meehelpt.
- Noem geen risico's. Die vraagt iemand anders straks.
- Maximaal 500 woorden totaal.
```

## Fase 4, oogsten en het eerste stuurmoment

Dit gebeurt uitsluitend hier in de hoofdcontext, niet in een agent.

1. **Leg alle ideeën naast elkaar** en gooi niets weg. Ook niet het rare, ook niet het dure.
2. **Voeg samen wat hetzelfde is**, en noteer als twee denkers los van elkaar op hetzelfde uitkwamen:
   dat is een signaal, geen bewijs.
3. **Kruisbestuiving, en dit is het stuk waar de meeste waarde ontstaat.** Zoek twee ideeën die
   samen sterker zijn dan apart, en schrijf dat derde idee op als een eigen idee met een eigen naam.
   Minstens één samengesteld idee, en zeg erbij uit welke twee het komt.
4. **Sorteer op horizon**, niet op kwaliteit: klein, middel, groot.

Toon de eigenaar daarna, in het Nederlands:

1. **De nulmeting**, de zeven blokken uit fase 1, voluit. Dit staat bovenaan, altijd.
2. **De groep en de prikkels**, in twee zinnen.
3. **Acht tot twaalf ideeën**, gegroepeerd per horizon, elk in vier regels: naam, wat het is, wat de
   klant merkt, en waarop het leunt. Genummerd, want de eigenaar kiest er straks op nummer.
4. **Drie die eruit springen**, met per stuk één zin waarom juist die.
5. **Het spannendste idee**, dat wil zeggen het idee met de grootste uitkomst en de grootste
   onzekerheid, met in één zin wat er waar zou moeten zijn.

Eindig met deze vraag, letterlijk zo van vorm:

> **Stuurmoment 1 van 2.** Welke richting werken we uit. Noem één tot drie nummers, of zeg waar je
> ze in wilt zien buigen. Wil je eerst een andere hoek zien, zeg dat dan, dan draaien we een tweede
> ronde met andere prikkels.

**Dan stop je en wacht je.** Je werkt geen idee alvast uit, je begint niet aan het plan, je schrijft
geen bestand. De eigenaar kiest.

Vraagt hij om een tweede ideeronde, draai dan fase 3 opnieuw met **andere prikkels en hooguit drie
denkers**, gericht op de hoek die hij noemt. Nooit meer dan twee ideerondes in één sessie: daarna
levert het niets nieuws meer op, alleen meer varianten.

## Fase 5, uitwerken en het tweede stuurmoment

Nu pas mag er kritiek komen, en nu moet het ook.

Werk de gekozen ideeën uit, hooguit drie. Zet daarvoor twee tot drie beoordelaars in, en dat mogen
bestaande agents zijn: `software-architect` voor de bouwvorm, `investeerder` voor wat het waard is,
en `devil-advocate` voor de tegenspraak. Heb je de investeerder al in fase 3 gedraaid, spreek hem
dan opnieuw aan met `SendMessage` in plaats van hem opnieuw te starten: zijn context staat er nog.

De tegenspraak krijgt de uitgewerkte concepten mee plus de bestandenlijst, en één extra vraag boven
op zijn eigen acht: **welk vastgelegd besluit uit `docs/logbook.md` draait dit idee terug, en is dat
met opzet.**

Presenteer per gekozen idee:

1. **Hoe het werkt.** De keten van begin tot eind, in gewone taal.
2. **De kleinste versie die het bewijst.** Wat is het minste dat gebouwd moet worden om te weten of
   dit klopt, en bij hoeveel klanten.
3. **Wat het van ons vraagt.** Klein, middel of groot volgens de maten in `bouwbaar.md`, plus wat de
   eigenaar zelf buiten Claude Code om moet regelen.
4. **Wat het kost.** Per klant en eenmalig, met de aanname erbij.
5. **Wat de tegenspraak ervan vindt.** Het scherpste bezwaar, en of het idee erdoor zakt, verandert
   of overeind blijft.
6. **Wat er stuk kan.** Voor bestaande klanten, voor de demo, voor de kosten.

Eindig met:

> **Stuurmoment 2 van 2.** Welk idee schrijf ik uit tot implementatieplan. Zeg "plan voor nummer X",
> of noem wat er nog aan moet veranderen.

**Dan stop je en wacht je.** Zegt de eigenaar meteen na stuurmoment 1 "schrijf het plan", sla dit
stuurmoment dan over maar draai de tegenspraakronde wél: een plan zonder tegenspraak is een wens.

## Fase 6, het implementatieplan

Nu, en alleen nu, schrijf je één bestand: `docs/tasks/innovatie-<onderwerp>.md`, precies volgens
`references/planvorm.md`.

Voordat je schrijft, controleer je de drie dingen die een plan onbruikbaar maken:

1. **Elke stap heeft een verificatiecriterium dat buiten de code ligt.** Gebouwd is niet
   geverifieerd, dat is conventie 10.
2. **Geen enkele stap leunt alleen op een promptinstructie.** Bepaalt een model iets, dan staat
   erbij welke code het afdwingt, dat is conventie 1.
3. **Het migratienummer klopt.** Kijk in `supabase/migrations/` wat het hoogste nummer is en tel
   door. Gok niet.

Vat daarna in de sessie in vijf regels samen wat er in het bestand staat, en noem drie dingen:
welke ideeën het niet geworden zijn, wat de eigenaar zelf moet regelen, en dat committen een
volgende opdracht is.

**Daarna stop je.** Geen implementatie, geen eerste stap alvast, geen "zal ik meteen".

## Tokenbudget

Een sessie hoort te blijven onder ongeveer vijf denkers in fase 3, plus twee tot drie beoordelaars
in fase 5. Wat de kosten drukt: de bestanden één keer opzoeken in plaats van per denker, sonnet voor
iedereen behalve twee, een tweede ideeronde alleen op verzoek en dan met drie denkers, en een denker
uit fase 3 opnieuw aanspreken met `SendMessage` in plaats van opnieuw starten.

Is het onderwerp halverwege te groot gebleken, knip het dan op en zeg welk stuk je nu doet, in
plaats van meer denkers te starten.

## Uitbreiden

Een denker erbij: nieuw bestand in `.claude/agents/`, read-only tools, en een rij in de tabel in
fase 2. Een prikkel erbij: een rij in `references/prikkels.md`. Verandert er iets aan wat we kunnen
bouwen, bijvoorbeeld een tweede engine die wakker wordt of een CMS-koppeling die er komt, dan gaat
dat in `references/bouwbaar.md` en dat is de rij die het meest verouderd raakt.

⚠️ **Een nieuwe denker is pas bruikbaar in een volgende sessie.** Claude Code leest `.claude/agents/`
bij het opstarten. Krijg je "Agent type not found", start Claude Code dan opnieuw op.
