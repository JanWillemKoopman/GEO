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
