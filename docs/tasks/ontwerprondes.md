# Ontwerprondes per scherm

Eén blok per afgeronde ronde: welk scherm, wanneer, wat er is aangenomen, wat is afgewezen, en welke
ontwerpregels eruit volgden die **ook op andere schermen gelden**.

**Waarvoor dit bestand er is.** Een ontwerpronde kijkt naar één scherm en negeert bewust de rest van
`docs/`, zodat het oordeel over wat er staat niet gekleurd wordt door het verhaal over hoe het zo
geworden is. Zonder dit bestand gaan de schermen daardoor uit elkaar lopen: elke ronde bedenkt zijn
eigen sectiekop, zijn eigen lege staat, zijn eigen chip. Lees het aan het begin van elke volgende
ronde, en alleen dit bestand.

**Verhouding tot de rest.** De regels hieronder zijn de neerslag van een ronde. Zodra een regel voor
de hele app geldt, hoort hij ook in `docs/ux-design.md` of `docs/designsystem.md`, en die twee zijn
dan de eigenaar van dat feit; hier staat waar hij vandaan kwam. Het besluit met zijn cijfers staat in
`docs/logbook.md`.

---

## Contentplan, `/merk/[id]/strategie/plan` · 26 augustus 2026 (dichtheidsronde)

De indeling van de dag ervoor klopte, de dichtheid niet. Eén regel van maand 1 besloeg vijf regels
tekst en droeg zeven bedieningen; tien van die blokken vulden anderhalf scherm zonder dat er meer
in stond dan tien titels met een datum.

### Wat er per regel af ging

| Weg | Waarom |
|---|---|
| De keuzelijst "Verplaats naar…" | `.field` is 40 pixels hoog en volle breedte: op elke regel stond de bediening zwaarder in beeld dan de titel. Nu een menu achter drie puntjes |
| De zin "ORBIT ENGINE schrijft pas als deze maand is vrijgegeven" | Stond tien keer. Het is een eigenschap van de MAAND en staat er nu één keer, boven de maand |
| De chip "ORBIT ENGINE schrijft dit later" | Zei niets wat de datum ernaast niet al zei. Een chip verschijnt alleen nog als de regel iets anders doet dan wachten |
| De kaartrand per regel | Een kaart in een kaart. De maand is de kaart, de regels zijn platte rijen met een scheidingslijn |
| De twee pijlknoppen en twee tekstlinks | Naar hetzelfde menu. Ze stonden op elke regel en werden bijna nooit gebruikt |
| De "Concept"-chip op een lege maand | Het zwaarste element van die regel, terwijl "leeg" er al stond |

Resultaat: een geplande regel is in de normale gang van zaken **één regel** (greep, titel,
funnelfase, datum, menu), en tien lege maanden zijn tien stille regels in plaats van tien kaarten.

### Wat er níet is overgenomen uit de aangeleverde review

Vier van de zeven voorstellen gingen over dingen die dit scherm niet heeft: velden "Vraagsoort" en
"Thema", een blok "Basisinstellingen" met lange helptekst, een knop "Bewaar akkoord" zonder
contrast, en een globale actiebalk "Updaten instellingen" die sticky zou moeten worden. Twee andere
vroegen om iets dat er al stond: de statuschip naast de maandtitel en een primaire knop rechts in
de maandkop. Alleen de eerste drie punten (kaartinflatie, herhalende zin, dichtgeklapte
keuzelijsten) raakten het echte scherm, en die zijn alle drie doorgevoerd.

### Ontwerpregels die hieruit volgen, ook elders

16. **Een mededeling die voor alle regels geldt, hoort boven de lijst en niet in de lijst.** Tien
    keer dezelfde zin leest een mens één keer, en daarna leest hij de zinnen die wél verschillen
    ook niet meer. `sharedNotice()` in `lib/plan-overview.ts` doet de bepaling.
17. **Bediening die je zelden gebruikt, weegt niet zwaarder dan inhoud die je altijd leest.** Een
    `.field` per rij is 40 pixels bediening tegen 20 pixels titel. Zelden gebruikt gaat achter een
    menu, mits dat menu met het toetsenbord bereikbaar blijft.
18. **Een statuschip die op elke regel hetzelfde zegt, is geen status maar behang.** Toon hem
    alleen als de regel afwijkt van de normale gang van zaken.
19. **Gebruik de `type-`-klassen, nooit Tailwinds `text-*`-maten.** `text-base` is in dit project
    een KLEUR (`--color-base`), geen tekstgrootte. Zie `docs/designsystem.md` §3.2.

### Hoe het resultaat bekeken is

Opnieuw met een wegwerpharnas, zoals de ronde ervoor: `renderToStaticMarkup` op het échte
component met stubs voor `next/navigation`, `next/link` en de toast, de CSS gebouwd met
`npx @tailwindcss/cli -i app/globals.css`, en een schermafbeelding met Playwright in beide standen.
Dat harnas vond de kleurenvalstrik van regel 19 in vijf minuten; hij was in code niet te zien, want
`text-base` compileert prima. **Bewust niet gecommit**, zelfde reden als vorige keer.

---

## Contentplan, `/merk/[id]/strategie/plan` · 25 augustus 2026

Aanleiding: "ik vind het plannen van content nog heel onoverzichtelijk, ik wil zelf bepalen welke
content er in welke maand geschreven wordt." De diagnose viel zwaarder uit dan de vraag: het scherm
toonde 120 rijen uit 28 unieke titels, waarvan er 17 te schrijven waren.

### Aangenomen

| Wat | Kern |
|---|---|
| Twee panelen: voorraad links, twaalf maanden rechts | Links wat beschikbaar is, rechts waar het heen kan. De vraag van dit scherm is een verdeling, en een verdeling heeft twee kanten nodig |
| Slepen, met een keuzelijst ernaast | Slepen is de snelle weg, de keuzelijst "Plan in" is de gelijkwaardige weg die op een telefoon en met een toetsenbord werkt |
| Maanden beginnen leeg, behalve maand 1 | Het systeem doet de eerste zet met de sterkste kansen, de mens overruled hem |
| Alleen gemeten kansen in de voorraad | Elke kaart draagt cluster, potentie, doelvragen en de reden. Een kaart zonder meting kan niet geschreven worden en hoort er dus niet in |
| Niet-gemeten clusters apart, onder de voorraad | Geen content, maar wél de verklaring waarom de lijst kort is, met de meting als handeling |

### Afgewezen

**Een bovengrens per maand.** Overwogen als harde rem (het pakket is 10 per maand), gekozen voor
niets: het scherm zegt hoeveel je erboven zit en houdt niemand tegen. De rem op geld staat al ergens
anders, namelijk op het vrijgeven van een maand.

**Het filter over de maanden ("wacht op jou", "staat live").** Dat filter verborg pagina's binnen een
maand, en dat botst met een scherm waarin je maanden samenstelt: je kunt niet slepen in een lijst
waarvan je de helft niet ziet. Het filteren is verhuisd naar de voorraad, waar het wél over kiezen
gaat.

### Ontwerpregels die hieruit volgen, ook elders

12. **Een lijst die iets belooft, moet dat kunnen waarmaken.** 120 geplande pagina's waarvan er 103
    op een meting wachten is geen planning maar decor. Toon liever zeven regels die kloppen dan
    honderdtwintig die wachten.
13. **Een lege staat die de gebruiker iets verwijt, is een lege staat die niets oplost.** Naast de
    lege voorraad staat wélke clusters gemeten moeten worden, met de knop erbij.
14. **Slepen mag nooit de enige weg zijn.** Elke sleepactie heeft een tweelingbediening die met een
    vinger en met een toetsenbord werkt. Zie `lib/plan-order.ts` voor waarom dat hier zwaar weegt.
15. **Twee handelingen die verschillend uitpakken, delen geen woord.** "Terug naar de voorraad" en
    "definitief verwijderen" stonden op het punt allebei "verwijderen" te heten; alleen de tweede is
    onomkeerbaar, en alleen die krijgt een bevestiging met een waarschuwing.

---

## Overzicht, `/merk/[id]` · 26 augustus 2026 (vervolg)

Correcties van de eigenaar op de ronde van de dag ervoor. Geen nieuwe diagnose: een keuze over wat
de startpagina moet dragen.

### Aangenomen

| Wat | Kern |
|---|---|
| Het zichtbaarheidspercentage weg van de startpagina | Vier tellingen in de plaats, over de volle breedte: gepubliceerd, clusters, nieuwe pagina's, optimalisaties. De score staat op Analytics |
| Het opbrengstblok helemaal weg | Van de drie mijlpalen blijft er één over, bovenaan. Drie modules verwijderd |
| Contentplan en activiteit onder elkaar, volle breedte | Het plan kreeg intern twee kolommen; het activiteitenblok toont vijf regels open, hooguit vijftien totaal |

### Wat dit terugdraait

**Besluit 7 verliest zijn plek op deze pagina.** Het opbrengstblok stond hier bewust als het antwoord
op "waar betaal ik voor" bij een doorlopend opzegbaar abonnement. Dat argument staat er niet meer in
die vorm. Gevolg dat pas bij het opruimen zichtbaar werd: `accounts.value_per_mention_eur` uit
besluit 16 wordt nu op geen enkel scherm getoond. De kolom is niet verwijderd.

**Het hoofdgetal van de vorige ronde is geen hoofdgetal meer.** De regel "één hoofdgetal per scherm"
blijft staan; de startpagina heeft er nu simpelweg geen, maar vier gelijkwaardige tellingen. Dat mag,
omdat het standen zijn en geen metingen: er valt niets te vergelijken en dus niets te verwarren. De
regel geldt onverkort voor een scherm dat wél een meting toont.

### Regels die ook op andere schermen gelden

12. **Een rij tellingen draagt geen groeipercentage.** Een stand verandert door een besluit, een
    meting door een meting. Een verschil op een stand plakken suggereert beweging waar er geen is.
13. **Kolommen in één rij moeten even breed lezen.** Draagt een deel van de kolommen een
    scheidingslijn met inspringing, dan zijn ze smaller dan de eerste, en breekt tekst alleen daar
    af. Zet een tekenlimiet op de inhoud en bewaak hem met een test.
14. **Elk lijstblok heeft een harde bovengrens**, ook een blok waar niets uit volgt. Wat er buiten
    valt, wordt geteld in één regel en niet stil weggelaten.
15. **Een blok met vier soorten inhoud hoort niet in een halve kolom.** Twee blokken naast elkaar
    zetten omdat ze allebei smal zijn, is alleen goed zolang ze allebei smal blijven.

---

## Overzicht, `/merk/[id]` · 25 augustus 2026

Het merkoverzicht, tevens de bestemming na inloggen (`app/page.tsx`). Beoordeeld op de echte data van
Gasservice Brabant: één cluster, 30 gemeten vragen, twee meetrondes, zeven aanbevelingen, vijf
ongemeten onderwerpen, 22 open feitenvragen, 132 geplande pagina's.

### Diagnose

Acht blokken van gelijk gewicht, waardoor het antwoord op de eigen titelvraag één getal zonder
richting was en de enige echte handeling er kleiner uitzag dan zes adviezen. De enige kleur op het
scherm beloofde een rangorde die er niet was, terwijl de gegevens die wél onderscheiden opgehaald
werden en niet in beeld kwamen. Plus drie versies van hetzelfde getal en één tegenspraak.

### Aangenomen (acht van de negen voorstellen)

| Nr | Wat | Kern |
|---|---|---|
| 4 | Sectiekoppen en ritme | `SectionHeading` (`type-section`, echte `h2`), 32px tussen secties en 12 binnen |
| 2 | Kansenlijst op onderscheidende kenmerken | Potentiechip alleen als hij varieert, "3 van 30 vragen" in de kolom, soort werk als woord, eerste kans gemarkeerd |
| 3 | Wachtrij wordt de handeling | `WorkItem.why` in plaats van het adres, de chip werd de enige primaire knop |
| 8 | Versheid van de meting | Meetdatum en volgende meetdatum onder de merknaam |
| 1 | Eén schaal plus verloop | `lib/brand-score.ts`: één som voor drie blokken, plus verschilchip en noemer |
| 9 | Eerste maand zonder nullen | Verdiepingslaag valt weg tot hij iets te zeggen heeft |
| 6 | Tegenspraak gepubliceerde pagina's | `planRegels()` benoemt het verschil tussen plan en totaal |
| 5 | Onderste helft opnieuw ingedeeld | Mijlpalen als band, vier balken werden één, activiteit toont zijn eerste drie regels |

### Afgewezen of niet voorgesteld

- **Voorstel 7, de volledige herbouw in drie lagen.** Vervangen door 2, 3, 5 en 9 samen, die
  dezelfde diagnose adresseren zonder de indeling om te gooien.
- **De stafregel bovenaan verplaatsen.** Hij staat visueel op de verkeerde plek (eerste knop van de
  pagina) maar is voor de klant onzichtbaar, en verplaatsen raakt de demoflow van de eigenaar. Dat is
  een productbeslissing, geen ontwerpbeslissing.
- **Het kaartcontrast in donker verhogen.** De randen zijn daar bijna onzichtbaar. Systeemwaarde die
  op elk scherm doorwerkt; één scherm afwijkend maken is erger dan het probleem.
- **`PageHeader` of `mono-label` globaal veranderen.** 15 respectievelijk 297 gebruiksplekken. Eigen
  ronde waard, geen bijvangst.
- **De potentiescore zelf herzien.** Dat hij bij één onderwerp constant is, is een rekenkundige
  eigenschap en geen ontwerpfout. Hij wordt alleen verborgen als hij niets onderscheidt.

### Afwijkingen van het goedgekeurde voorstel

Twee, allebei tijdens het bouwen ontstaan omdat het beeld iets anders zei dan de tekening:

1. **Geen accentstang op de wachtrijkaart** (was onderdeel van voorstel 3). Er zijn nu twee stangen
   op dit scherm: de standkaart en de eerste kans. Een derde en de stang markeert niets meer.
2. **Geen gestapelde balk voor het contentplan** (was onderdeel van voorstel 5). Er staat al een
   gestapelde balk voor de contentmix, en twee naast elkaar leest als één versiering. Het werd één
   voortgangsbalk voor het hele plan plus de fases als tellingen.

### Regels die ook op andere schermen gelden

1. **Een landingspagina zegt hoe vers zijn data is.** Meet je maandelijks en kijkt de klant
   wekelijks, dan ziet hij vier keer hetzelfde cijfer zonder te weten dát het hetzelfde is.
2. **Precies één primaire knop per scherm**, en die hoort bij wat de gebruiker vandaag kan doen.
   Nul is net zo fout als twee: dan vraagt het scherm nergens om een klik.
3. **De half gevulde staat is de eerste indruk**, geen randgeval. Een blok dat alleen nullen kan
   tonen, verdwijnt tot het iets te zeggen heeft, met één regel in de plaats die zegt wanneer het
   zich vult.
4. **Een sectiekop is een `h2` met eigen typografie**, nooit hetzelfde als metadata binnen een kaart.
   Anders heeft het scherm geen zichtbaar skelet en geen koppenstructuur voor een schermlezer.
5. **Het ritme drukt de groepering uit**: meer ruimte tussen secties dan binnen een sectie. Overal
   dezelfde afstand betekent nergens een groep.
6. **Toon alleen wat onderscheidt.** Een kolom met zes keer hetzelfde getal is geen rangorde maar
   ruis, en kost de plek waar iets kon staan dat wél verschilt. Verberg zo'n kolom in plaats van hem
   te laten staan "voor de volledigheid".
7. **Eén kengetal, één rekensom.** Twee blokken die hetzelfde begrip tonen en het zelf uitrekenen,
   lopen uit elkaar zodra iemand er één aanpast.
8. **Een cijfer zonder richting en zonder noemer is geen informatie.** Naast het getal hoort het
   verschil met de vorige keer, en eronder waaruit het is opgebouwd.
9. **Hooguit twee accentstangen per scherm.** De derde maakt van een markering een versiering.
10. **Toon het bruikbaarste veld, niet het beschikbaarste.** De wachtrij toonde een rauw adres en
    verzweeg de zin die zei waarom het ertoe deed.
11. **Het laadskelet volgt de indeling en de afstanden van het echte scherm**, anders springt de
    pagina op het moment dat de data binnenkomt.

### Hoe het resultaat bekeken is

De pagina zit achter een inlog en drie databases, dus er is een wegwerpharnas gebruikt: een script
dat de echte componenten met `renderToStaticMarkup` rendert met de productiewaarden erin, de CSS
bouwt met `npx @tailwindcss/cli -i app/globals.css`, en er met Playwright een schermafbeelding van
maakt in beide standen. **Bewust niet in de repo gecommit:** het bevat een kopie van de
paginaopmaak en zou stil uit de pas gaan lopen met het scherm dat het moet controleren. Bouw hem in
een volgende ronde opnieuw op in een tijdelijke map.
