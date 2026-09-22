# Herontwerp van de contentpagina (ontwerpvoorstel, 22 september 2026)

**Het scherm**: `app/(app)/analyses/[id]/bibliotheek/[pieceId]/page.tsx`, de pagina waar een klant
een geschreven tekst beoordeelt, bijschaaft en live zet. 587 regels, twintig blokken onder elkaar.

**De opdracht van de eigenaar**: maak de tekst de held van het scherm, maak hem direct bewerkbaar,
zet de onderbouwing en de kwaliteit in een zijpaneel, en zet de publicatieknop in een vaste
bovenbalk.

> **Dit bestand is een voorstel, geen verslag.** Er is nog niets van gebouwd. Fase 1 en fase 2
> hieronder kunnen zonder verdere besluiten gebouwd worden. Fase 3 en fase 4 keren een besluit om
> dat in `docs/logbook.md` §32 met redenen is vastgelegd, en horen daarom eerst langs de eigenaar.

---

## 1. Waar de opdracht op een verkeerde aanname rust

Twee van de vier wensen zijn in augustus 2026 al eens gewogen en toen bewust niet gebouwd. Dat
maakt ze niet verkeerd, maar het verandert wat er nodig is om ze nu wel te bouwen.

**Een rijke editor is geen ontbrekend stuk, hij is een geschrapt stuk.** `docs/logbook.md` §32
noemt vier dingen die met opzet niet gebouwd zijn, en twee daarvan staan letterlijk in deze
opdracht: een WYSIWYG-bibliotheek ("zou de bestaande, goed onderbouwde keuze voor
markdown-als-brontekst omkeren") en een AI-assistent per pagina ("zou `checkContentGate()` en
`checkTabooWords()` omzeilen"). De reden staat ook in het bestand zelf: wat de klant straks in zijn
CMS plakt, is markdown, en een editor die stiekem andere HTML maakt dan wat er in de database staat
levert een verrassing op bij tekst die gepubliceerd wordt.

Dat risico is meetbaar en niet theoretisch. `lib/markdown.ts` is een eigen renderer van 171 regels
die eerst escapet en daarna pas opmaakt, en `lib/pipeline/content-export.ts` hergebruikt diezelfde
`inline()` voor de CMS-specifieke export. Er is dus precies één plek die bepaalt hoe `**vet**`
eruitkomt. Een externe editor maakt daar een tweede plek van, en die twee kunnen uit de pas lopen
zonder dat iemand het merkt tot een klant de tekst op zijn site zet.

**Daarom splitst dit voorstel de opdracht.** Fase 1 en 2 leveren het hele beloofde gevoel (de tekst
als held, één bewerkoppervlak, een zijpaneel, een vaste balk) zonder het opslagformaat aan te
raken. Fase 3 en 4 zijn de twee omkeringen, elk met de proef die eraan vooraf moet gaan.

---

## 2. Wat er nu mis is, geteld

| | Nu | Gevolg |
|---|---|---|
| Blokken onder elkaar | 20 kaarten op het hoogste niveau | De tekst zelf begint pas bij blok 12 |
| Knoppen boven de tekst | tot 7 (3 kopieervormen, 2 downloads, schema, sjabloon) | De eerste schermhoogte gaat op aan exporteren, niet aan lezen |
| "Kijk hier even naar" | 45 tot 96 regels per pagina, gemeten op de zeven pagina's van 1 en 2 september 2026 (`lib/pipeline/quality-issue.ts`) | Niemand leest hem uit, dus ook de drie regels die publicatie tegenhouden niet |
| Bewerken | achter een knop, achter een drempel, op blok 18 | Bewerken voelt als een uitzondering in plaats van als het werk |
| De tekst | twee keer op het scherm: als artikel (blok 12) en nog eens in de editor (blok 18) | Twee waarheden over dezelfde alinea, en scrollen tussen het probleem en de plek om het op te lossen |

Het laatste punt is het zwaarste. Wie bij bevinding 31 leest dat de derde sectie te vaag is, moet
elf blokken verder scrollen, op "Tekst bewerken" klikken, een drempelscherm wegklikken, en dan in
een tekstvak van 22 regels zoeken waar die sectie stond.

---

## 3. De nieuwe indeling

### 3.1 Drie zones in plaats van twintig blokken

```
┌─────────────────────────────────────────────────────────────────────┐
│  A. VASTE BOVENBALK (sticky, 56px)                                  │
│  ‹ terug   Titel van de pagina   [Concept]        [⋯]  [Zet live ▸] │
├──────────────────────────────────────────┬──────────────────────────┤
│                                          │                          │
│  B. HET CANVAS (max 720px tekstbreedte)  │  C. DE CONTEXTRAIL       │
│                                          │     (340px, sticky)      │
│  De tekst, direct bewerkbaar.            │                          │
│  Titel, artikel, FAQ, meta.              │  ▸ Kwaliteit             │
│  Eén oppervlak, geen tweede kopie.       │  ▸ Waarop dit rust       │
│                                          │  ▸ Waarom deze pagina    │
│                                          │  ▸ Versies               │
│                                          │                          │
└──────────────────────────────────────────┴──────────────────────────┘
```

De pagina blijft in de stand `werken` (1440px, `docs/designsystem.md` §8). Dat geeft 1040px voor
het canvas en 340px voor de rail, met 24px ertussen en de marges van de werkruimte eromheen. In het
canvas blijft de tekst zelf op 720px, dezelfde maat als de stand `lezen`, want een regel van 1000px
leest niet.

**Onder 1280px valt de rail weg als kolom en wordt hij een lade.** `components/drawer.tsx` bestaat
al, schuift op een telefoon van onderen in plaats van rechts, en vangt Escape af. De knop ervoor
staat in de bovenbalk, met het aantal blokkades erop: "Kwaliteit (3)". Zo is er geen tweede
uitklappatroon nodig naast wat de app al kent.

**Geen tabbladen.** `docs/logbook.md` §32 legde vast dat deze pagina één doorlopende scroll blijft.
Dat blijft zo binnen het canvas: de rail ernaast is geen tabblad maar een tweede kolom, en op smalle
schermen een lade. De volgorde van de leesstof verandert niet, alleen de plaats.

### 3.2 Zone A, de vaste bovenbalk

Het patroon bestaat al: `app/(app)/analyses/[id]/_editors/confirm-bar.tsx` is een vaste balk over de
volle breedte, dekkend en zonder `backdrop-filter`, gebouwd omdat de enige handeling waar de app op
wacht onderaan een tabblad stond. Dit is hetzelfde probleem, dus dezelfde oplossing.

Wat erin staat, van links naar rechts:

1. **Terug**, naar waar je vandaan kwam (`lib/origin.ts`, ongewijzigd).
2. **De paginatitel**, afgekapt op één regel.
3. **De status als chip**: `Concept`, `Concept opgeslagen`, `Live sinds 12 september`. Statuskleur
   plus vorm, nooit kleur alleen (`designsystem.md` regel 4).
4. **Opslaan**, `btn-primary`, alleen zichtbaar zodra er iets veranderd is. Verdwijnt weer na het
   opslaan.
5. **Het menu `⋯`**: kopiëren in drie vormen, de twee downloads, de schema-markup, de
   sjabloonexport, en "Hoe zet je dit op je site?". Dat zijn de zeven knoppen die nu boven de tekst
   staan.
6. **De publicatieactie**, `btn-accent`, de enige hoofdactie van het scherm. Nog niet gepubliceerd:
   een URL-veld dat uitklapt plus "Dit staat live". Al gepubliceerd: de link, de uitslag van de
   controle, en "Toch niet gepubliceerd" in het `⋯`-menu.

**De twee bevestigingsstappen blijven.** Publiceren zet twee hermetingen in de rij, over twee en
over vier weken (`publish-box.tsx`). Eén klik die vier weken werk inplant hoort twee klikken te
zijn, en dat patroon staat verder overal in de app.

**Het kopieermenu houdt zijn uitleg.** Op 16 september 2026 is besloten dat de reden naast de knop
staat en niet achter een vraagteken, omdat een klant die niet weet wat HTML is anders moet klikken
om te zien welke rij bij hem hoort. In het menu blijft die regel dus per rij zichtbaar. Wat
verandert is alleen dat het menu dicht is tot je het nodig hebt.

### 3.3 Zone B, het canvas

Eén oppervlak voor de tekst, waar nu twee staan. Het artikel en de editor worden hetzelfde blok.

- **Altijd bewerkbaar**, geen knop "Tekst bewerken" meer.
- **De drempel blijft, maar verplaatst.** De waarschuwing dat handmatig werk buiten de
  schrijfpijplijn omgaat (punt 13, 16 september 2026) verschijnt bij de eerste toetsaanslag, als
  een regel boven het canvas met één knop "Ik houd het zelf in de gaten". Daarna is hij weg voor
  deze pagina. Wat de drempel moest voorkomen, blijft voorkomen: niemand typt erin zonder het
  gelezen te hebben.
- **Het conflictslot blijft ongewijzigd.** De PATCH-route vergelijkt `updated_at` bij het schrijven
  (migratie 0100). Wel nodig bij een altijd-open canvas: het slot moet nu vaker aan bod komen, dus
  het canvas houdt de laatst bekende `updated_at` bij en toont bij een 409 dezelfde kop als nu
  ("Iemand anders was je voor").
- **Titel, meta-title, meta-description en FAQ** staan onder de tekst in een ingeklapte sectie
  "Titel en zoekresultaat", met het zoekresultaat-voorbeeld (`SearchPreview`) erin. Nu staat dat
  voorbeeld twee keer op de pagina: statisch boven het artikel en live in de editor.
- **De inhoudsopgave** (`TableOfContents`) verhuist naar de bovenkant van de rail, want daar hoort
  navigatie en niet in de leeskolom.

### 3.4 Zone C, de contextrail

Vier ingeklapte secties (`CollapsibleSection`, bestaat al), met de belangrijkste open bij binnenkomst.

**1. Kwaliteit.** Hierin zit de grootste winst van het hele voorstel, en het kost geen nieuwe data.

De pagina toont nu `piece.review_notes`, een platte lijst tekstregels. Maar `quality_json` bewaart
diezelfde bevindingen al mét structuur (`lib/pipeline/quality-issue.ts`): per bevinding een ernst
(`blokkerend`, `hoog`, `midden`, `laag`), een dimensie, de sectie waar het over gaat, het bewijs,
wat er had moeten staan, en de aanbeveling. `issuesUitJson()` leest dat, en `page.tsx` roept die
functie al aan voor de klantzin. De lijst van 45 tot 96 regels wordt dus:

```
Kwaliteit                      68/100
────────────────────────────────────
Houdt publicatie tegen     3
  ▸ In "Wat kost een dakkapel"
    Er staat een prijs die nergens
    uit het onderzoek komt.
    → Haal het bedrag weg of
      onderbouw het.
    [Ga naar deze sectie]  [Laat ORBIT ENGINE dit oplossen]

Kan beter                  11   ▸
Klein                      54   ▸
```

Drie dingen die nu niet kunnen en dan wel:

- **Wat publicatie tegenhoudt, staat bovenaan en apart.** Nu staat een blokkade tussen 90 andere
  regels, en het scherm zegt nergens welke van de regels de blokkade is.
- **"Ga naar deze sectie" springt naar de plek in het canvas.** De bevinding draagt al een veld
  `section` met de kop waar het over gaat, en `renderMarkdown()` zet al een `id` op elke kop met
  hetzelfde ontdubbelalgoritme als `extractHeadings()`. De koppeling is er dus al, hij wordt alleen
  niet gebruikt.
- **"Laat ORBIT ENGINE dit oplossen" vult het bestaande herschrijfvak.** Het veld `recommendation`
  is letterlijk de tekst die het reparatiemodel als opdracht krijgt. Die knop zet hem in het
  notitieveld van `ReviseBox` en scrollt daarheen, meer niet: dezelfde route, dezelfde poort,
  dezelfde nieuwe versie.

**2. Waarop dit rust.** `ReleasePanel` ongewijzigd van inhoud, ingeklapt: de bevestigde feiten met
hun F-nummer, de zinnen zonder bron, de verboden feiten, en de openstaande verplichte vragen. De
kop krijgt de samenvatting die er nu niet staat: "12 van de 14 beweringen zijn onderbouwd". De twee
zinnen zonder bron zijn wat iemand zoekt, niet de twaalf die goed zijn.

**3. Waarom deze pagina.** `WhyThisPage` en `ImprovementList` samen in één sectie, ingeklapt: de
doelvragen, het cluster, de potentie, de schrijfopdracht en (bij een verbetering) wat er verandert
ten opzichte van de bestaande pagina.

**4. Versies.** De versiegeschiedenis met de diff, ongewijzigd, ingeklapt. De diff blijft een eigen
lazy route, want de versiequery is bewust smal en haalt de teksten niet op.

**De interne kwaliteitsanalyse** (`QualityInternalPanel`) blijft precies waar hij hoort: alleen voor
een beheerder, onderin de rail, met dezelfde `isStaff()`-controle. Die cookie kan rechten wegnemen
en nooit geven, en dat blijft zo.

---

## 4. De flow, van binnenkomst tot publicatie

1. **Binnenkomst.** Je ziet de titel, de status, en de tekst. Rechts staat één regel die zegt of
   deze pagina de deur uit kan, met daaronder wat dat tegenhoudt. Dat is de vraag waarmee iemand dit
   scherm opent.
2. **Beoordelen.** Je leest de tekst in de leeskolom. Wil je weten waar een bewering vandaan komt,
   dan klap je "Waarop dit rust" open. Dat is een keuze, geen scrollafstand.
3. **Verbeteren, klein.** Je typt in de tekst. Bij de eerste aanslag verschijnt de waarschuwing dat
   dit buiten de pijplijn omgaat. In de balk verschijnt "Opslaan".
4. **Verbeteren, groot.** Bij een bevinding klik je "Laat ORBIT ENGINE dit oplossen", je vult
   eventueel aan wat er anders moet, en er komt een nieuwe versie. De oude blijft staan.
5. **Publiceren.** Je zet de pagina op je site, plakt de link in de balk, bevestigt, en ORBIT
   ENGINE controleert of de tekst er echt op staat. De status in de balk springt op `Live`.
6. **Daarna.** De balk zegt wat er gaat gebeuren: hermeten over twee en over vier weken, want
   AI-assistenten pikken nieuwe content niet dezelfde dag op.

Publiceren blijft dus binnen handbereik vanaf stap 1, wat op 27 augustus 2026 de reden was om het
publicatieblok van plek acht naar boven te halen. Het verschil is dat het nu niet meer meescrollt
uit beeld.

---

## 5. Wat samengaat, wat weggaat, wat dichtgaat

| Element | Wordt |
|---|---|
| Artikel (blok 12) en `ContentEditor` (blok 18) | Eén canvas |
| `SearchPreview` twee keer | Eén keer, in "Titel en zoekresultaat" |
| 7 export- en kopieerknoppen bovenaan | Eén `⋯`-menu in de balk, met de uitleg per rij erin |
| `PublishBox` als kaart | De rechterkant van de vaste balk |
| Kaart "Hoe zet je dit op je site?" | Regel in het `⋯`-menu |
| "Kijk hier even naar", 45 tot 96 regels | Kwaliteit in de rail, gegroepeerd op ernst, blokkades open |
| De losse regel met kwaliteit, dekking en woorden | De kop van de kwaliteitssectie en de kop van "Waarop dit rust" |
| `WhyThisPage` plus `ImprovementList` | Eén ingeklapte sectie in de rail |
| `TableOfContents` boven het artikel | Bovenaan de rail |
| Versiegeschiedenis onderaan | Ingeklapte sectie in de rail |
| Knop "Tekst bewerken" plus drempelscherm | Weg als knop, de waarschuwing blijft bij de eerste aanslag |
| `QualityPanel` (de klantzin) | Blijft, als kop van de kwaliteitssectie |

**Niets van de inhoud verdwijnt.** Elk cijfer, elke bevinding en elk feit dat er nu staat, staat er
na de verbouwing nog. Wat verandert is hoeveel je ervan tegelijk ziet.

---

## 6. Wat te bouwen, in vier fases

### Fase 1, de indeling (geen nieuwe data, geen migratie, geen AI)

1. `ContentLayout`: de driezone-wikkel met de rail, de lade onder 1280px, en de vaste balk.
2. `ContentTopbar`: terug, titel, statuschip, opslaan, het `⋯`-menu, de publicatieactie. `PublishBox`
   gaat er als kind in, zijn logica verandert niet.
3. `ContentActions` verhuist ongewijzigd naar het menu.
4. `ContextRail`: vier `CollapsibleSection`s om de bestaande panelen heen.
5. `page.tsx` valt terug van twintig blokken naar drie zones. De queries blijven gelijk.

Alles wat hier gebeurt is verplaatsen. Dat is het grootste deel van de winst en het kleinste deel
van het risico.

### Fase 2, het canvas en de kwaliteitslijst

6. `ContentCanvas`: `ContentEditor` altijd open, de drempel bij de eerste aanslag, het conflictslot
   ongewijzigd, de metavelden ingeklapt eronder.
7. `QualityFindings`: bevindingen uit `quality_json`, gegroepeerd op ernst, blokkades open, de rest
   dicht, met "Ga naar deze sectie" en "Laat ORBIT ENGINE dit oplossen".
8. Terugval voor pagina's zonder `quality_json` (alles van vóór migratie 0091): dan blijft de
   huidige lijst uit `review_notes` staan. Niets breekt, en de oude pagina's tonen wat ze altijd
   toonden.

Tests: het groeperen en aftoppen van bevindingen is pure rekenkunde en hoort in `scripts/test-unit.ts`
(conventie 2). Minstens: blokkades altijd zichtbaar, ontdubbeling over dezelfde sectie, en een lege
`quality_json` levert de terugval.

### Fase 3, de selectie-assistent (vraagt eerst een besluit)

Dit is de inline AI uit de opdracht. Hij kan, maar niet als de chatassistent die in §32 geschrapt
is, en het verschil moet in de bouw zitten en niet in de belofte.

- **Eigen jobtype, geen uitbreiding van het herschrijven** (conventie 7). Een fragment herschrijven
  is een andere taak dan een pagina herschrijven.
- **Vier vaste opdrachten plus een vrij veld**: inkorten, uitbreiden, concreter maken, toon
  aanpassen. Vaste opdrachten zijn te testen, een open chat niet.
- **De uitkomst gaat langs dezelfde controles als de pijplijn** voordat hij in de tekst komt:
  `checkTabooWords()` en het deel van `checkContentGate()` dat op een fragment werkt. Faalt dat, dan
  wordt er niets vervangen en staat er waarom. Dat is precies het bezwaar uit §32, en dit is de
  enige vorm waarin dat bezwaar wegvalt.
- **De ruwe JSON gaat naar `ai_calls`**, zoals elke andere aanroep (conventie 8).
- **De kosten moeten eerst gemeten worden** (conventie 10). Wat we weten: op 3 september 2026
  kostten 16 herschrijfaanroepen samen $3,3252, dus $0,2078 per stuk, en het schrijven was 86% van
  de rekening van twaalf pagina's. Een fragment is korter, maar tien selecties per pagina is tien
  aanroepen waar er nu één staat. Voor het aangaat: één pagina echt doorlopen, de werkelijke prijs
  per fragment uit `ai_calls` aflezen, en pas dan besluiten op welke tier hij draait.

**De zwevende werkbalk bij een selectie** is boven een tekstvak lastiger dan boven een rijke editor,
omdat een `textarea` geen positie per teken geeft. Twee uitwegen, in volgorde van voorkeur: de balk
verschijnt vast onder het canvas zolang er iets geselecteerd is ("3 zinnen geselecteerd"), of het
canvas wordt fase 4 en dan kan de balk wel zweven. De eerste kost niets en werkt op een telefoon
beter, want daar is een zwevende popover boven een toetsenbord sowieso een probleem.

### Fase 4, een rijke editor (alleen na een geslaagde proef)

Als de markdown-editor uiteindelijk toch moet wijken voor een Canvas-achtige ervaring, dan is dat
een omkering van een vastgelegd besluit, en die hoort te rusten op een proef en niet op een gevoel.

**De proef**: neem alle opgeslagen `body_markdown` uit `content_pieces`, laat de kandidaat-editor ze
inlezen en weer wegschrijven, en vergelijk. De eis is dat de tekst er teken voor teken hetzelfde
uitkomt. Haalt hij dat niet op alles, dan is de vraag welke pagina's stukgaan en waarom, en dat is
het moment om te besluiten, niet eerder. Diezelfde proef moet ook `renderMarkdown()` en de
CMS-export ernaast leggen: wat de klant in zijn CMS plakt, moet zijn wat hij op het scherm zag.

Tot die proef er is, blijft markdown de brontekst.

---

## 7. Advies over bibliotheken

**Kort: niets toevoegen voor fase 1 en 2.** De app heeft elf runtime-afhankelijkheden en een eigen
ontwerpsysteem met eigen primitieven. Alles wat dit herontwerp nodig heeft, bestaat al:

| Nodig | Al aanwezig |
|---|---|
| Vaste actiebalk | Het patroon van `ConfirmBar` |
| Zijpaneel op smal scherm | `components/drawer.tsx`, inclusief Escape en het blad op mobiel |
| Inklapbare secties | `components/collapsible-section.tsx` |
| Bevestiging in twee stappen | Het patroon van `PublishBox` en `RerunResearchButton` |
| Chips, kaarten, knoppen, velden | `designsystem.md` §9 |
| Iconen | `lib/icons.ts` via `components/icon.tsx` |

**Shadcn UI: niet doen.** Dat is een set componenten met een eigen vormtaal die je in je project
kopieert. Dit project heeft die laag al, met eigen tokens, eigen radii en negen vastgelegde regels.
Een tweede set ernaast levert twee soorten knop op, en dan is het ontwerpsysteem geen systeem meer.

**Radix UI: hooguit één primitief, en pas in fase 3.** Als de selectie-werkbalk echt moet zweven,
is `@radix-ui/react-popover` het stuk dat je zelf niet beter schrijft (positioneren, focus, Escape,
schermlezers). Dat is één pakket voor één probleem, en pas op het moment dat dat probleem er is.
Voor het `⋯`-menu in fase 1 is `@radix-ui/react-dropdown-menu` verdedigbaar, maar een `<details>`
met een paar regels CSS doet daar hetzelfde en voegt niets toe aan de installatie.

**Tiptap of ProseMirror: alleen als de proef van fase 4 slaagt.** Een rijke editor is niet duur in
installatie, hij is duur in wat hij met het opslagformaat doet. Slaagt de proef, dan is Tiptap met
een markdown-serializer de beste kandidaat, juist omdat je markdown kunt blijven opslaan. Slaagt hij
niet, dan is de winst van een mooiere editor kleiner dan de kans dat een klant iets anders
publiceert dan hij zag.

**Wat wel meteen helpt zonder pakket**: een `textarea` die meegroeit met zijn inhoud, en de tekst in
de leesletter in plaats van in mono. Dat is het verschil tussen "een formulierveld" en "een
document" voor de helft van het gevoel en nul afhankelijkheden.

---

## 8. Wat dit niet oplost

- **De pagina wordt niet korter voor wie alles wil lezen.** Hij wordt korter voor wie iets wil doen.
  Dat is de bedoeling, maar het betekent dat de rail bij een pagina met 96 bevindingen nog steeds
  96 bevindingen bevat, drie regels diep weggeklapt.
- **De kwaliteitslijst wordt beter leesbaar, niet korter.** Dat 45 tot 96 bevindingen per pagina
  veel is, is een uitkomst van de keten en geen schermprobleem. Zolang negen controles allemaal hun
  eigen regels in dezelfde bak gooien, blijft het aantal wat het is.
- **Fase 3 en 4 staan stil tot de eigenaar besluit.** Ze keren §32 om, en dat is geen ontwerpkeuze
  maar een productkeuze.

---

## 9. Volgorde en verificatie

1. Fase 1 bouwen, en dan één echte pagina uit de bibliotheek openen op een breed scherm, op 1280px
   en op een telefoon. De vraag die hij moet beantwoorden: staat de publicatieknop altijd in beeld,
   en is de tekst het eerste wat je ziet.
2. Fase 2 bouwen, en tegen een echte pagina met blokkades nakijken of de drie die publicatie
   tegenhouden bovenaan staan en of "Ga naar deze sectie" op de juiste kop uitkomt.
3. Vóór elke commit de vier controles: `tsc --noEmit`, `test:unit`, `test:chain`, `build`.
4. Gaat het gedrag echt mee, dan een alinea met datum en cijfer onderaan `docs/logbook.md`, en dit
   bestand weg zodra fase 1 en 2 staan en fase 3 en 4 een besluit hebben.
