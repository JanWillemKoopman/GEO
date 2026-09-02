# Herontwerp van Analytics (implementatieplan, 2 september 2026)

Opdracht van de eigenaar: de vier schermen onder Analytics zo herontwerpen dat elk scherm één
duidelijke vraag beantwoordt, zonder overlap, met inzichten die de gebruiker echt verder helpen. Er
komt geen nieuwe diepliggende techniek bij; dit gaat over wat er waar staat en waarom.

Het onderzoek eronder staat in het UX-rapport van 2 september 2026 (artefact "Analytics
doorgelicht"). Dit document is de bouwopdracht die eruit volgt. Wat hier staat is nog niet gebouwd:
**dit is een plan, geen beschrijving van de app** (`merkstrategie.md` §30).

Gelezen vóór dit plan: de vier paginabestanden onder `app/(app)/merk/[id]/analytics/`, hun
componenten, `lib/cluster-labels.ts`, `lib/search-console/metrics.ts`, `lib/pipeline/brand-rankings.ts`,
`lib/stats/uncertainty.ts`, de negen modules in `lib/reputation/`, plus de productiedatabase voor elk
cijfer in §2.

---

## 1. De drie uitgangspunten

1. **Eén vraag per pagina, en geen overlap.** De vier kernvragen staan in §3. Alles wat die vraag
   niet beantwoordt gaat ingeklapt, verhuist, of verdwijnt.
2. **Puur informatief.** Analytics is een leesomgeving. Geen knoppen naar Strategie, geen taken die
   hier ontstaan. Wat een pagina wél doet is zijn eigen conclusie trekken in één zin. Het werk
   gebeurt elders, en bij een sales-led product doet de consultant het grootste deel daarvan
   (`docs/logbook.md` §15).
3. **Uitsluitend desktop.** Ontworpen voor 1440 tot 1920 pixels, ondergrens 1280. Onder 1280 krijgt
   de pagina één horizontale schuifbalk en een regel dat dit scherm voor een groot scherm gemaakt
   is. Er komt geen tweede compositie, en dat is een besluit en geen omissie.

Uitgangspunt 3 is wat het ontwerp opent. De inhoud loopt straks door tot ongeveer 1600 pixels in
plaats van de huidige 850, en dat is bijna een verdubbeling van het werkvlak. Pas daarmee passen een
tabel van negen kolommen en een detailpaneel tegelijk in beeld.

## 2. De cijfers waarop dit plan rust

Alles hieronder is op 2 september 2026 tegen productie nagerekend, niet uit documentatie
overgenomen.

| Wat | Waarde | Waarom het het ontwerp stuurt |
|---|---|---|
| Hoogte van Concurrenten | 37.857 px | Elf keer de hoogte van zijn eigen analyse |
| Merken in de beheerlijst daaronder | 329 | Dat is het grootste deel van die 37.857 |
| Metingen per cluster | gemiddeld 1,17, maximaal 3 | Een lijngrafiek heeft nu niets te tekenen |
| Gepubliceerde contentpagina's | 3 in de hele database | Zoekverkeer is bij vrijwel elke klant leeg |
| Metingen in `content_impact` | 5 | Bestaat, wordt nergens getoond |
| Technische controles op Zichtbaarheid | 17, waarvan 12 in orde | Twaalf geruststellingen op volle grootte |
| Langste bevinding daarin | 149 paginatitels in één alinea | Het langste tekstblok van de pagina |
| Reputatie: toonoordelen | 22 van de 22 "gemengd" | De toonmeter kan bij dit merk niet bewegen |
| Reputatie: criteria met een plaats | 4 (1 van 4, 1 van 3, 2 van 4, geen oordeel) | Dít is het materiaal, en het staat ingeklapt |
| Labels op clusters | 2 labels, op 2 van de 10 clusters | "Zonder label" is een gewone keuze |
| Breedte van de inhoud op 1440 | ~850 px | Bijna 400 px blijft ongebruikt |

## 3. De vier kernvragen

| Pagina | Kernvraag | Hoofdcijfer | Hoofdbeeld |
|---|---|---|---|
| Zichtbaarheid in AI | Word ik genoemd als iemand in mijn markt een AI-assistent iets vraagt, en waar wel en waar niet? | Zichtbaarheid in procenten, met marge | Stand per cluster, wordt een lijn vanaf drie metingen |
| Zoekverkeer | Levert de content die ORBIT ENGINE publiceerde bezoekers op uit Google? | Klikken op onze pagina's | Verloop per gepubliceerde pagina sinds publicatie |
| Concurrenten | Wie wint de vragen die ik verlies, en waaraan ligt dat? | Jouw plaats in de ranglijst | Ranglijst met jouw rij vastgezet |
| Mijn reputatie | Als AI over mijn bedrijf praat, welk beeld schetst hij dan? | Plaats per criterium tegenover de concurrent | Vier criteria naast elkaar |

**Twee dubbelingen verdwijnen.** Concurrenten toont vandaag jouw zichtbaarheid over een andere
noemer dan Zichtbaarheid doet (33% naast 35%), met een uitklapje dat het verschil uitlegt. Het
hoofdcijfer daar wordt een *plaats* en geen tweede percentage. En de concurrententabel op Reputatie
gaat over vier criteria en niet over aandeel; die krijgt een eigen naam en verwijst niet meer naar
Concurrenten alsof het dezelfde ranglijst is.

---

## 4. Fundament, eerst en voor alle vier tegelijk

### F1. Het rooster van drie zones

Elke pagina krijgt dezelfde opbouw: filterbalk, antwoordzone, detailzone, verantwoording.

```
FILTERBALK      plakt bovenaan
ANTWOORD        hoofdcijfer (4 kolommen) + hoofdbeeld (8 kolommen)
DETAIL          tabel (12 kolommen, of 8 met het paneel open) + paneel (4 kolommen)
VERANTWOORDING  ingeklapt, gedempte opmaak
```

Twaalf kolommen, goot van 24 pixels, inhoud tot ongeveer 1600 pixels breed. De huidige maximale
breedte zit in de shell (`components/app-shell.tsx`); die wordt voor de Analytics-routes verruimd
en niet globaal, want de leesbreedte van de andere schermen is met opzet smaller.

### F2. `components/analytics-filters.tsx` plus `lib/analytics-filters.ts`

Eén filterbalk voor alle vier de pagina's, met vier keuzes in vaste volgorde: **Periode, Label,
Cluster, Fase**.

- **Het patroon bestaat al.** `app/(app)/merk/[id]/strategie/clusters/page.tsx` leest zijn
  labelfilter uit `searchParams` en filtert server-side met `leesLabelfilter()`, `filterOpLabel()`
  en `telPerLabel()` uit `lib/cluster-labels.ts`. Analytics doet het net zo. Geen clientstate, geen
  nieuwe opslag: de keuze staat in het adres, dus een gefilterd beeld is te delen en te bewaren.
- **Label en Cluster hangen samen.** Een label is de groep boven de clusters, dus een gekozen label
  beperkt de clusterlijst. Andersom niet: een gekozen cluster laat het labelfilter met rust.
- **"Zonder label" is een gewone keuze**, geen restcategorie. `LABELFILTER_GEEN` bestaat al.
- **Periode** hergebruikt `components/period-picker.tsx`.
- **Fase komt later** (zie F5). Toon nooit een filter dat nog niets doet.

De rekenkant (welke clusters houd je over bij deze combinatie) gaat in `lib/analytics-filters.ts`,
zonder `server-only`, met tests in `scripts/test-unit.ts` (conventie 2).

### F3. `components/analytics-table.tsx`

Nu bouwt elke pagina zijn eigen lijst, en dat is precies waarom de vier schermen anders aanvoelen.
Eén tabelcomponent met: sorteren via de kolomkop, groeperen op label met een subtotaal per groep,
vaste kolombreedtes, `tabular-nums` op elke cijferkolom, een plakkende kop, een plakkende eigen rij,
en rijen die opengaan zonder de lijst te verlaten.

### F4. `components/detail-panel.tsx`

Een paneel rechts dat opengaat bij een klik op een rij en de tabel naar acht kolommen laat krimpen.
Eén component, per pagina een andere inhoud. **Alleen lezen**, geen knoppen: dit is precies hoe
verdieping past bij pagina's die puur informatief zijn.

### F5. De fase-optelling (datawerk, geen pijplijn)

Cluster en Label zijn een selectie op rijen die er al liggen. Fase niet: in `visibility_scores` en
`competitor_breakdown` is de fase al weggerekend. Hij zit wel in `tracking_runs`
(`prompt_category_snapshot`, 770 periodieke metingen) met de genoemde merken in
`tracking_run_mentions` ernaast.

Nieuwe module `lib/analytics/per-fase.ts`: telt per cluster per periode per fase het aantal winbare
metingen en het aantal waarin het eigen merk genoemd werd, en geeft dezelfde vorm terug als
`visibility_scores` zodat het scherm er niets van merkt. Geen nieuwe AI-aanroep, geen nieuw
jobtype, geen migratie. Wel: dit is de duurste query van de vier pagina's, dus meten hoe lang hij
doet op het grootste merk voordat hij aanstaat.

---

## 5. Per pagina

### 5.1 Zichtbaarheid in AI

**Nieuwe volgorde:** filterbalk, hoofdcijfer met duidende zin naast het hoofdbeeld, clustertabel,
technische leesbaarheid ingeklapt.

- **Z1. De grafiek groeit mee met de data.** Bij één of twee metingen liggende staven per cluster
  met de marge erin, vanaf drie metingen een lijn per cluster. Zelfde plek, zelfde kop, alleen de
  vorm verandert. Erbij: de datum van de volgende meetronde, zodat één punt een belofte is in plaats
  van een gebrek.
- **Z2. Kleine grafieken naast het hoofdbeeld.** Een raster van kleine grafiekjes, één per cluster,
  allemaal op dezelfde as. Tien lijnen door elkaar is een kluwen, tien grafiekjes naast elkaar is
  een vergelijking. `components/sparkline.tsx` geeft niets terug onder drie punten, zodat die plek
  gebruikt kan worden voor een datum in plaats van een lege lijn.
- **Z3. De clusterkaarten worden één tabel.** Kolommen: label, cluster, zichtbaarheid, marge,
  verandering, gemeten vragen, laatst gemeten. Gesorteerd op zwakste eerst, groepeerbaar op label.
  Geen rij uitgelicht, want dit zijn allemaal jouw clusters.
- **Z4. Eén duidende zin boven de tabel**, uit de cijfers zelf gerekend: welk cluster achterblijft en
  hoeveel. Geen knop, geen advies.
- **Z5. De technische diagnose wordt één regel.** "12 van de 17 controles in orde", met drie tellers
  ernaast, uitklappend naar drie groepen: *Mogen AI-assistenten je site lezen* (7 crawlers),
  *Kunnen ze je tekst begrijpen* (JavaScript, gestructureerde data, sitemap, llms.txt), *Weten ze
  wie je bent* (naamconsistentie, externe profielen, Wikidata). Binnen een groep staan de
  aandachtspunten open en zijn de goedgekeurde controles één regel met een vinkje. Dezelfde
  informatie in ongeveer een tiende van de hoogte. Raakt `components/audit-panel.tsx`.
- **Z6. Naamconsistentie wordt een telling.** "Je bedrijf staat op de site onder 149 verschillende
  schrijfwijzen", met een uitklapper met de eerste tien en een knop die de volledige lijst kopieert
  voor de websitebouwer. Dat scheelt bijna vierhonderd woorden in het blok dat juist minder aandacht
  moet krijgen.
- **Z7. De clusternaam zonder het adres van het merk ervoor.** Vier regels die met
  "https://gasservice-brabant.nl · " beginnen zijn niet te scannen. Dit raakt meer dan Analytics,
  dus het gaat als losse stap.
- **Z8. Detailpaneel per cluster:** de gemeten vragen, de verdeling over de drie fasen, de laatste
  drie metingen.

### 5.2 Zoekverkeer

**De kernverandering:** de pagina meet nu de hele website, waarvan het grootste deel bestond voordat
ORBIT ENGINE begon. Hij gaat over onze pagina's.

- **V1. Onze pagina's bovenaan, de site eronder.** Vier tegels over uitsluitend de gepubliceerde
  content, met de kop "Wat ORBIT ENGINE publiceerde". De totalen van de hele property gaan naar één
  ingeklapt blok onderaan: "De rest van je site, ter vergelijking".
- **V2. De koppeling loopt via het cluster.** Een gepubliceerde pagina hangt via
  `content_pieces.analysis_id` aan zijn cluster en daarmee aan zijn label, en via
  `planned_pages.funnel_stage_id` aan zijn fase. Daarmee werkt de filterbalk uit F2 ook hier.
- **V3. `content_impact` wordt een kolom.** Die tabel bewaart per gepubliceerde pagina een meting
  vooraf, een meting achteraf, een controlegroep en een oordeel. Het is het enige cijfer in de app
  dat oorzaak en gevolg met een controlegroep verbindt, en het staat nergens. Kolom "Effect op AI"
  naast de Google-cijfers: Google zegt of de pagina bezoekers trekt, deze kolom of hij je in
  AI-antwoorden vooruit hielp.
- **V4. De grafiek gaat over de levensloop, niet over de kalender.** Klikken per pagina geteld vanaf
  de dag van publiceren, met een verticale markering per publicatiemoment. De huidige grafiek zet
  een kliklijn en losse meetpunten op twee assen in één beeld en suggereert daarmee een verband dat
  hij met één meetpunt niet kan tonen. Raakt `components/traffic-chart.tsx`.
- **V5. Geen delta bij een onvolledige eerste periode.** Nu tonen klikken en vertoningen een stijging
  van precies hun eigen waarde (600 en 5.253) omdat het venster ervoor leeg is, en staat er bij de
  andere twee tegels "geen vergelijking". Dat wordt: "eerste volledige periode, vanaf oktober
  vergelijkbaar". Raakt `lib/search-console/metrics.ts`.
- **V6. Klikken per paginatype verschijnt pas vanaf tien gepubliceerde pagina's**, en wordt dan het
  filter en geen aparte kaart.
- **V7. De lege staat is de normale staat.** Staan er nog geen pagina's live, dan geen lege grafiek
  maar één zin: hoeveel pagina's er in het plan staan en wanneer de eerste live gaat. Zonder knop.
- **V8. Rijen klappen open** naar de verloopgrafiek van die ene pagina sinds publicatie.

### 5.3 Concurrenten

- **C1. De beheerlijst gaat van de pagina af.** 329 merken met een uitklapmenu en drie keuzes zijn
  beheer en geen analyse. Op Concurrenten blijft één voetnoot die de noemer verklaart: "22 merken
  tellen mee in je aandeel, 307 zijn ingedeeld als marktplaats, vakblad of leverancier." Het indelen
  zelf verhuist naar een stafscherm onder Admin, met zoeken, filteren op ingedeeld of niet, en
  meerdere rijen tegelijk. Dat past ook bij een sales-led product: dit was nooit werk voor de klant.
  Raakt `app/(app)/merk/[id]/_components/entities-manager.tsx`.
- **C2. Het hoofdcijfer wordt een plaats.** "Plaats 1 van 22 merken", met de percentages in de tabel
  als vergelijkingsmaat tussen merken. Eén begrip, één getal per scherm.
- **C3. De ranglijst over de volle breedte**, met een staafje achter elk percentage in de kolom
  "Genoemd" en jouw rij vastgezet bij het scrollen. Nu delen vijf kolommen 850 pixels terwijl er 400
  naast leeg blijven, en krijgen "Als eerste" en "Bron" de smalste kolommen, terwijl dat juist de
  twee zijn die verklaren waarom iemand boven je staat.
- **C4. Een merk aanwijzen kleurt hem in de bronnenlijst.** Zweven over een concurrent licht de
  bronnen op waar hij wél op staat. Dat legt het verband tussen "wie wint" en "waarom" zonder een
  woord uitleg.
- **C5. Het bronnenlandschap wordt een kanslijst.** Nu vijftien kaarten waarvan er twaalf dezelfde
  oranje chip dragen, en twaalf identieke waarschuwingen zijn geen waarschuwing meer. Voortaan: de
  drie bronnen waar de meeste concurrenten wel op staan en jij niet, gesorteerd op aanhaalfrequentie
  maal aanwezigheid van concurrenten, met de rest ingeklapt. Geen knoppen.
- **C6. Detailpaneel per concurrent:** in welke clusters hij je passeert en op welke bronnen hij
  staat.
- **C7. Cluster- en labelfilter**, met het fasefilter zodra F5 er is.

### 5.4 Mijn reputatie

De meetmodule eronder is zorgvuldig gebouwd en verandert niet. Wat verandert is welk deel van de
uitkomst het scherm draagt.

- **R1. De vier criteria worden het hoofdbeeld.** `reputation_ranks` bevat per criterium
  (dienstverlening, kwaliteit, prijs tegenover kwaliteit, betrouwbaarheid) wie er wint en op welke
  plaats de klant staat. Bij de meting van 23 augustus: 1 van 4 op kwaliteit, 1 van 3 op
  betrouwbaarheid, 2 van 4 op dienstverlening, geen oordeel op prijs tegenover kwaliteit. Dat is
  letterlijk het antwoord op "hoe positioneert AI mij", en het zit vandaag weggeklapt achter "Naast
  je concurrenten gelegd". Vier assen naast elkaar, elk ongeveer 300 pixels breed, met de
  concurrenten als punten ernaast en hun namen eronder. Waar het model geen oordeel had staat "hier
  had ChatGPT geen oordeel over", en geen nul en geen laatste plaats (conventie 3). Raakt
  `_components/rival-table.tsx`.
- **R2. De toonmeter wordt een verdeling.** Alle 22 bruikbare antwoorden kregen het label "gemengd",
  dus de toonindex is 0 en de meter staat per definitie in het midden, met een marge van 3,1. Het
  grootste en kleurrijkste element van de pagina draagt de minste informatie. Voortaan een gestapelde
  balk met de zes labels, waarop 22 keer hetzelfde label meteen zichtbaar is, met één duidende zin
  ernaast. De toonindex blijft bestaan voor de vergelijking over de tijd, maar hij is niet meer het
  hoofdbeeld. Raakt `_components/tone-meter.tsx`.
- **R3. Twaalf productregels worden één tabel.** Product, noemt ChatGPT je, jouw plaats, wie wint,
  aantal bezwaren. Gesorteerd op waar je ontbreekt, met de uitgeschreven zin in de uitklap. Ongeveer
  een derde van de hoogte, en voor het eerst te scannen. Raakt `_components/offering-list.tsx`.
- **R4. De producttabel naast de bezwaren.** Links de producten, rechts de bezwaren en de lof met
  hun telling; een product aanwijzen filtert de rechterkolom naar de bezwaren van dát product. Dat
  inzicht bestaat alleen als beide lijsten tegelijk in beeld staan, en dat kan op deze breedte.
- **R5. De bewijskracht toont zijn samenstelling.** "Stevig onderbouwd" (99 van 100) rust op 19
  bronnen waarvan er 9 in de categorie "overig" vallen. Voortaan een balkje met de verdeling en de
  bewoording erbij: stevig onderbouwd, maar bijna de helft van de bronnen is niet ingedeeld. Dit
  verandert de meting niet, alleen wat het scherm erover zegt.
- **R6. Drie niveaus in plaats van één.** Niveau één is het antwoord (criteria plus toonverdeling),
  niveau twee de onderbouwing (per product, bezwaren en lof), niveau drie de verantwoording
  (bronnen, weten tegenover opzoeken, sinds de vorige meting), in een rustiger opmaak. Het blok "Wat
  dit niet is" blijft altijd zichtbaar, dat is een goede regel.
- **R7. Geen cluster- of labelfilter op deze pagina.** Een reputatiemeting hangt aan producten en
  diensten, niet aan clusters. Een filter dat niets doet zou hier drie schermen consistentie
  nabootsen en één scherm onbruikbaar maken.

⚠️ **Wat dit plan niet oplost:** dat 22 van de 22 antwoorden hetzelfde label krijgen is een
meetkwestie en geen ontwerpkwestie. Pakt dat bij meer merken zo uit, dan verdient het instrument een
fijnere schaal of een tweede vraag die tot een keuze dwingt. Dat is een eigen opdracht. Het is wel
de reden waarom de toon hier naar de tweede plaats gaat in plaats van mooier gemaakt te worden.

---

## 6. Volgorde

**Ronde 1, het fundament.** F1 (rooster en breedte), F2 (filterbalk met Periode, Label, Cluster),
F3 (tabelcomponent). Daarna Z3, Z5, C1, C3: de vier ingrepen die samen de meeste hoogte weghalen en
de meeste breedte teruggeven.

**Ronde 2, de inhoud per pagina.** V1 tot en met V5, R1 tot en met R3, Z1, Z2, C2, C5. Dit is de
ronde waarin de vier pagina's hun kernvraag echt gaan beantwoorden.

**Ronde 3, de verdieping.** F4 (detailpaneel), F5 (fase-optelling) plus het fasefilter, Z4, Z6, Z7,
V6 tot en met V8, C4, C6, R4 tot en met R6.

De volgorde is niet willekeurig: elke ronde is op zichzelf op te leveren en laat de app in een
betere staat achter dan ervoor. Ronde 1 zonder ronde 2 is al winst.

## 7. Tests

Elke wijziging die een uitkomst beïnvloedt krijgt een test in `scripts/test-unit.ts`, elke wijziging
in de samenhang tussen taken een scenario in `scripts/test-chain.ts` (conventie in `CLAUDE.md`).
Concreet minimaal:

- `lib/analytics-filters.ts`: label beperkt de clusterlijst, cluster laat het label met rust,
  "zonder label" levert de clusters zonder `label_id`, een onbekende waarde in het adres valt terug
  op "alles".
- `lib/analytics/per-fase.ts`: de optelling per fase komt over alle fasen heen uit op hetzelfde
  totaal als `visibility_scores`, en een fase zonder metingen levert `null` en geen 0 (conventie 3).
- De keuze tussen staven en lijn: één meting geeft staven, drie metingen geven een lijn.
- `lib/search-console/metrics.ts`: een onvolledig eerste venster levert geen delta.
- De koppeling van een gepubliceerde pagina aan cluster, label en fase, inclusief een pagina die aan
  geen van drieën hangt.
- De groepering van de 17 audit-controles over drie groepen, met de telling per groep.

## 8. Verificatie (conventie 10: gebouwd is niet geverifieerd)

Een stap is pas af als hij tegen productiedata is nagerekend. Voor dit plan betekent dat:

1. De vier pagina's op het merk Gasservice Brabant (4 clusters, 91 dagen Search Console, 4
   reputatiemetingen) laden onder 1,5 seconde, ook met de fase-optelling aan.
2. Concurrenten komt onder de 4.000 pixels hoogte, tegen 37.857 nu.
3. Zichtbaarheid komt onder de 1.600 pixels bij ingeklapte techniek, tegen 3.243 nu.
4. Het hoofdcijfer op Zichtbaarheid en de plaats op Concurrenten spreken elkaar niet tegen: er staat
   nergens meer een tweede percentage voor hetzelfde begrip.
5. Een gefilterd beeld is via het adres te delen en levert bij herladen hetzelfde beeld op.
6. Elke pagina toont bij een merk zonder data een zin die zegt wat er ontbreekt en wanneer het er
   is, en nergens een lege grafiek of een teller op nul.

## 9. Wat er expliciet niet gebeurt

- Geen wijziging aan de meetkunde: `lib/pipeline/brand-rankings.ts`, `lib/stats/uncertainty.ts` en
  de negen modules in `lib/reputation/` blijven zoals ze zijn. De marges, de noemers en de regel dat
  een verandering binnen de marge geen verandering is, blijven staan.
- Geen migratie. Alles in dit plan leest bestaande tabellen.
- Geen nieuwe AI-aanroep en geen nieuw jobtype.
- Geen mobiele compositie voor deze vier schermen.
- Geen knoppen naar andere hoofdstukken.

## 10. Bij te werken documentatie

`docs/ux-design.md` krijgt de drie zones, de desktopkeuze en de negen regels uit §11 van het
UX-rapport. `docs/designsystem.md` krijgt de nieuwe componenten (filterbalk, analytics-tabel,
detailpaneel, verdelingsbalk, criteriaschaal). De verhuizing van het entiteitenbeheer naar Admin
raakt `lib/nav.ts` en de tabel met de grens per hoofdstuk daarin, want Admin gaat dan van zeven naar
acht bestemmingen en dat is een uitzondering die uitgeschreven moet worden. Elke afgeronde ronde
gaat als alinea met datum en cijfer onderaan `docs/logbook.md`, en dit bestand verdwijnt zodra alle
drie de rondes af zijn.
