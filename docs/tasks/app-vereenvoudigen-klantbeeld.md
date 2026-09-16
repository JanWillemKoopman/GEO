# De app kleiner maken voor de klant

**Opgesteld:** 16 september 2026. **Status: voorstellenlijst, nog niets van gebouwd.**

Aanleiding: de eigenaar wil dat een klant de app binnen één sessie snapt, zonder uitleg vooraf.
Dit document somt op waar de app vandaag meer toont dan de klant nodig heeft, wat elk voorstel
kost, en wat het oplevert voor die begrijpelijkheid. Het gaat uitsluitend over het klantbeeld:
Admin en Sales blijven buiten beschouwing, want een klant ziet die nooit.

**Wat de klant vandaag ziet**, geteld in de code en niet uit documentatie overgenomen:
tien bestemmingen in de zijbalk onder vier koppen (`lib/nav.ts`), plus drie schermen die niet in
het menu staan maar waar hij wel terechtkomt: het cluster (`/analyses/[id]`), een geschreven
pagina (`/analyses/[id]/bibliotheek/[pieceId]`) en de briefing (`/analyses/[id]/briefing`).
Het overzicht draagt acht blokken, het paginascherm vijftien, het merkdossier een formulier van
zeven stappen over 45 velden.

Effort en impact zijn schattingen op drie standen: laag, midden, hoog. Impact is gemeten op het
doel van deze opdracht: minder leercurve, minder schermvulling, sneller snappen.

---

## Groep 1: kleine ingrepen, meteen merkbaar

### 1. Haal de vier tellingen van het overzicht weg
**Effort: laag · Impact: hoog**

Het overzicht opent met de rondebalk (`_components/ronde-balk.tsx`), zes stappen met een stand
eronder: "3 metingen", "5 kansen", "12 ingepland", "7 teksten", "4 live", "2 nagemeten". Direct
daaronder staat een rij van vier cijfers (`overzichtCijfers()` in `lib/overview.ts`) die voor de
helft hetzelfde zegt: "Pagina's geschreven" en "Gepubliceerd" staan dan twee keer op één
schermhoogte, in een andere vorm en met een ander bijschrift. Wie twee tellingen van hetzelfde
ziet, gaat zoeken welke de echte is. De rondebalk is de sterkste van de twee, want die legt ook
uit hoe de stappen op elkaar volgen. Laat de cijferrij vervallen, of laat er alleen "Clusters
actief" en "Pagina's geoptimaliseerd" van over, de twee die de rondebalk niet noemt.

### 2. Repareer drie teksten die naar schermen verwijzen die niet meer bestaan
**Effort: laag · Impact: midden**

Sinds 16 september 2026 heeft een cluster één tabblad in plaats van vier hoofdstukken, maar drie
teksten die de klant leest praten nog over die hoofdstukken: de lege bibliotheek verwijst naar
"hoofdstuk 03 van een cluster" (`strategie/bibliotheek/page.tsx`), het publicatieblok belooft dat
iets "vanzelf in hoofdstuk 04 van je cluster" komt te staan (`bibliotheek/[pieceId]/publish-box.tsx`),
en de handleiding op Support beschrijft het dossier nog als "vier hoofdstukken"
(`support/page.tsx`). Een klant die dat hoofdstuk gaat zoeken, vindt het niet, en twijfelt daarna
aan de rest van wat er staat.

### 3. Kort de onzekerheidsmarge in tot één zin op één plek
**Effort: laag · Impact: midden**

Het zichtbaarheidspercentage staat op het overzicht en op Analytics, en op allebei staat eronder
een uitleg van twee regels over de steekproefmarge, in twee net verschillende bewoordingen. Voor
een MKB-ondernemer is "onzekerheidsmarge 41% tot 63%" de eerste zin die hem doet afhaken bij zijn
belangrijkste cijfer. Zet de marge als korte toevoeging achter het getal ("41 tot 63") en de
uitleg achter het vraagteken dat er toch al is, op beide schermen identiek.

### 4. Zet de kaartcijfers per cluster terug van vijf naar twee
**Effort: laag · Impact: midden**

Elke clusterkaart draagt vijf cijfers naast elkaar: zichtbaarheid, openstaande vragen,
voorgesteld, geschreven, en het aantal metingen (`components/analysis-card-metrics.tsx`). Bij tien
clusters zijn dat vijftig getallen in één lijst waar de klant alleen kiest waar hij naartoe wil.
Twee volstaan: zijn zichtbaarheid en of er iets van hem gevraagd wordt.

### 5. Klap "Wat ORBIT ENGINE deed" dicht
**Effort: laag · Impact: laag**

Het laatste blok van het overzicht toont tot vijftien regels afgerond machinewerk van de afgelopen
week. Er volgt geen handeling uit, en de regels zijn vertaalde taaknamen. Laat één samenvattende
regel staan ("ORBIT ENGINE draaide deze week 9 taken") met de lijst eronder ingeklapt.

### 6. Haal de crawlinstellingen uit het merkdossier
**Effort: laag · Impact: midden**

Onderaan het merkdossier staat onder "Gereedschap" het blok "Wat er al op je site staat", met
daarin crawlsnelheid, maximaal aantal pagina's en voorrangspaden (`_components/inventory-box.tsx`).
Dat is techniek van de consultant in een scherm dat de klant moet nakijken. Verhuis het naar
Admin; wat de klant er wel aan heeft, het aantal gevonden pagina's, kan als zin blijven staan.

### 7. Toon de technische diagnose alleen als er iets mis is
**Effort: laag · Impact: midden**

Onder Zichtbaarheid staat altijd de volledige technische checklijst (`components/audit-panel.tsx`),
ook als alles in orde is. Een blokkade hoort bovenaan te staan, dat gebeurt al. Een lijst met
uitsluitend vinkjes hoort ingeklapt, achter één regel: "Techniek in orde, laatst gecontroleerd op
12 september".

---

## Groep 2: middelgrote ingrepen

### 8. Eén plek voor de vragen van ORBIT ENGINE, niet drie
**Effort: midden · Impact: hoog**

Dezelfde feitenvragen komen op drie schermen langs: "Openstaande vragen" onder Strategie, het
clusterscherm (`_chapters/inhoud.tsx` toont `FactRequests`), en de briefing vóór het schrijven
(`analyses/[id]/briefing`). De klant weet daardoor nooit of hij ze al beantwoord heeft, en de
teller in de bovenbalk telt niet hetzelfde als wat hij op de briefing ziet. Houd "Openstaande
vragen" als de enige plek waar geantwoord wordt, en laat de andere twee er alleen naartoe wijzen
met de stand erbij.

### 9. Geef de klant één weergave van het contentplan
**Effort: midden · Impact: hoog**

Het contentplan heeft drie weergaven achter een schakelaar: Overzicht, Plannen en Kalender
(`strategie/plan/page.tsx`). Plannen is een sleepbord met voorraad, zoekveld, clusterfilter en een
menu per regel, en dat is het werk van de consultant, niet van de klant. Toon de klant alleen
Overzicht, met de kalender als ingeklapte naslag eronder, en laat het bord alleen voor staf staan.
Dat scheelt de moeilijkste bediening van de hele app voor de gebruiker die er het minst vaak komt.

### 10. Laat het merkdossier alleen zien wat nog niet klopt
**Effort: midden · Impact: hoog**

Het merkdossier is een formulier van zeven stappen over ruim 45 velden
(`lib/pipeline/brand-fields.ts`), en de meeste velden zijn al door de pijplijn gevuld. Het product
is sales-led: de consultant zet het profiel klaar vóór het gesprek. Draai het scherm dus om: open
met de velden die leeg zijn of die ORBIT ENGINE zelf onzeker noemt, met erboven wat er beter van
wordt, en zet "alles nakijken" als tweede stap eronder. Het formulier blijft compleet, alleen de
volgorde verandert.

### 11. Voeg Concurrenten samen met Zichtbaarheid
**Effort: midden · Impact: midden**

Analytics heeft vier bestemmingen, en Zichtbaarheid en Concurrenten lezen dezelfde meting met
dezelfde filterbalk. Ze beantwoorden ook bijna dezelfde vraag: hoe vaak noemt AI jou, en wie wordt
er nog meer genoemd. Zet de ranglijst als tweede blok onder Zichtbaarheid. Analytics gaat daarmee
van vier naar drie bestemmingen, en de klant van tien naar negen.

### 12. Eén oordeel per geschreven pagina, niet vier cijfers
**Effort: midden · Impact: hoog**

Op het scherm van een geschreven pagina staan vier kwaliteitsmaten door elkaar: de GEO-score,
"redactionele kwaliteit" met een getal op 100, "onderbouwd met jouw feiten" in procenten, en de
potentiescore van de aanbeveling. Ze meten alle vier iets anders, en dat staat er ook bij, maar de
klant stelt één vraag: kan dit live. Laat dat antwoord in gewone taal bovenaan staan, met de vier
cijfers eronder in een ingeklapt blok voor wie het wil narekenen.

### 13. Halveer het aantal blokken op het paginascherm
**Effort: midden · Impact: hoog**

Datzelfde scherm stapelt vijftien blokken onder elkaar: publiceren, de handleiding, waarom deze
pagina, wat er verbetert, de kwaliteitspoort, de aandachtspunten, het zoekresultaat, de
inhoudsopgave, de tekst, de FAQ, de GEO-score, het vrijgavepaneel, de kwaliteitsregel, de editor,
het herschrijfvak en de versiegeschiedenis. Drie groepen zijn genoeg: "zet het live", "lees het na"
en "pas het aan", waarbij de derde groep dicht staat tot de klant hem opent. Dit is het scherm waar
de klant het langst zit, dus hier levert opruimen het meeste op.

### 14. Maak de tabbalk van het cluster eerlijk
**Effort: laag · Impact: laag**

Het cluster heeft drie ingangen: Cluster, Bibliotheek en een instellingen-icoon. Bibliotheek
brengt je naar de merkbrede bibliotheek met een filter, dus naar een ander scherm met een andere
kop en een andere zijbalkregel die oplicht. Noem hem dan ook zo ("Alle teksten van dit merk"), of
haal hem weg en laat de doorklik vanuit de tekstenlijst op het cluster zelf komen.

---

## Groep 3: structureel, alleen met een besluit vooraf

### 15. Breng "Mijn reputatie" terug tot één schermhoogte plus verdieping
**Effort: hoog · Impact: midden**

Het reputatiescherm telt vijf hoofdstukken met daarin negen uitklapbare blokken, meerdere tabellen
en een bronnenlijst. Het is het duurste losse product van de app en het meest gelezen scherm in een
demo, maar het vraagt nu aandacht van boven tot onder. Een variant met de kop, de toon, waar dat
beeld op rust en daarna alles ingeklapt, haalt hetzelfde verhaal in een kwart van de hoogte.

### 16. Kies één startscherm voor het cijfer, niet twee
**Effort: midden · Impact: midden**

Het zichtbaarheidspercentage is het cijfer waarvoor de klant betaalt, en het staat groot op het
overzicht én groot op Analytics, uit dezelfde rekensom (`lib/brand-score.ts`). Dat is met opzet zo
gegroeid, maar het maakt Analytics als eerste scherm een herhaling van wat de klant net zag.
Overweeg: het overzicht houdt het getal, Analytics opent met het verloop en de clusters eronder.

### 17. Weeg of het cluster nog een eigen scherm moet zijn
**Effort: hoog · Impact: midden**

Sinds de cijfers naar Analytics verhuisd zijn, doet het clusterscherm nog één ding: van een meting
naar content. Dat is precies wat de kansenlijst op het overzicht en het contentplan ook doen. Als
die twee de aanbevelingen kunnen dragen, verdwijnt er een heel scherm plus zijn tabbalk uit het
klantbeeld. Dit vraagt eerst een besluit over waar aanbevelingen wonen, dus niet beginnen zonder
dat gesprek.

### 18. Snoei de handleiding op Support terug
**Effort: midden · Impact: laag**

Support is een documentatiepagina van ruim 760 regels die uitlegt hoe de app in elkaar zit. Elke
regel die daar nodig is, is een regel die een scherm zelf niet duidelijk maakt. Gebruik hem dus als
foutenlijst: wat je hier moet uitleggen, hoort in het scherm zelf thuis. Wat overblijft is een
korte startgids.

---

## Waar ik zou beginnen

Eerst 1, 2, 4 en 7: samen een halve dag werk, en ze halen de meeste dubbele en overbodige
weergaven van het eerste scherm van elke sessie weg. Daarna 9 en 10, want die twee halen de
zwaarste bediening en het langste formulier weg bij de gebruiker die ze het minst nodig heeft.
Daarna 12 en 13 als één ronde, want ze raken hetzelfde scherm. Punt 17 pas na een gesprek.
