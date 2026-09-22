# Herontwerp van de contentpagina (definitief plan, 22 september 2026)

**Het scherm**: `app/(app)/analyses/[id]/bibliotheek/[pieceId]/page.tsx`, de pagina waar iemand een
geschreven tekst beoordeelt, bijschaaft en live zet. Nu 587 regels en twintig blokken onder elkaar.

**De maatstaf voor dit plan**: de kwaliteit van de tekst die uiteindelijk gepubliceerd wordt, en de
ervaring van degene die hem beoordeelt. Bouwtijd is geen beperking. Waar dit plan iets tóch niet
bouwt, is dat omdat het de tekst aantoonbaar slechter maakt of omdat het bewijs ontbreekt, nooit
omdat het veel werk is.

**Voorgeschiedenis**: dit bestand ving op 22 september 2026 aan als "Het originele plan". Daar is een
Teamsessie overheen gegaan (UX, Product, AI, Engineering, UI, plus tegenspraak). Vijf van hun
bevindingen zijn nagerekend en verwerkt, twee zijn verworpen. Bijlage A houdt bij wat er veranderde
en waarom. De oorspronkelijke tekst staat in de git-geschiedenis, commit `b6774e3`.

> **Stand van zaken: stap 0 tot en met 6 zijn gebouwd en de vier controles zijn groen.** Wat er
> gebouwd is staat samengevat onderaan `docs/logbook.md`. Dit bestand blijft staan voor de twee
> besluiten die nog openstaan, allebei in §8:
>
> - **§8.1, de selectie-assistent.** Niet gebouwd, met cijfers erbij. Blijft open tot iemand de vier
>   stappen doorloopt of besluit dat het niet hoeft.
> - **§8.2, de rijke editor.** Blijft achter de proef. Markdown blijft de brontekst tot die proef
>   aantoont dat een editor hem teken voor teken teruggeeft.
>
> Twee dingen zijn tijdens de bouw anders gelopen dan hieronder staat. Die staan in bijlage B.

---

## 1. Waar dit plan op rust

Elk cijfer hieronder is in de code of in het logboek nagekeken, met de vindplaats erbij. Eén cijfer
kon niet opnieuw gecontroleerd worden en staat daarom apart.

| Waarneming | Vindplaats |
|---|---|
| Twintig blokken onder elkaar; de tekst begint bij blok 12, het bewerken bij blok 18 | `page.tsx` |
| De tekst staat twee keer op het scherm: als leesversie en nog eens in de editor | `page.tsx` r.463 en r.519 |
| Tot zeven export- en kopieerknoppen bóven de tekst | `content-actions.tsx` |
| De bevindingenlijst telt 45 tot 96 regels per pagina, gemeten op zeven pagina's | `lib/pipeline/quality-issue.ts` r.7-12 |
| Eerste concepten hadden 68 en 119 bevindingen; ná drie reparatierondes nog 63 en 96 | `lib/pipeline/content-issues.ts` r.7-9 |
| De reparatie krijgt hooguit tien bevindingen mee, gesorteerd in zeven gewichten | `lib/pipeline/content-issues.ts`, `prioriteerBevindingen()` |
| Meer reparatierondes maakten de tekst slechter: de score liep 67, 74, 68, 48 | `logbook.md` r.6277-6285 |
| Eén reparatieronde kost $0,2525 tot $0,26 en levert meer uitvoer op dan het schrijven zelf (6.245 tegen 6.042 tokens) | `content-issues.ts` r.11-12, `lib/schemas/content-patch.ts` r.10-15 |
| Het conflictslot zit op de server: voorwaardelijk schrijven op `updated_at`, anders een 409 | `app/api/analyses/[id]/content/[pieceId]/route.ts` |
| `dirty` vergelijkt met de verse serverwaarde, terwijl de tekst in het veld uit de eerste lading komt | `content-editor.tsx` r.57-71 |
| `.stand` is 1440px met 24px marge, en staat binnen `<main>` naast een zijbalk van 240px (ingeklapt 56px) | `globals.css` r.1728-1743 en r.329, `workspace-chrome.tsx` r.201-203 |
| De bovenbalk is 48px, en wat eronder moet blijven plakken gebruikt `top: var(--header-h)`; lopen die uit elkaar, dan ontstaat er een kier | `globals.css` r.316-322 |
| Vier controles zijn al puur en werken op losse tekst; alleen de dekkingspoort in `checkContentGate()` is paginabreed | `content-gate.ts` r.140, 689, 724, 860 tegenover r.275 |
| De bevinding draagt al ernst, dimensie, sectie, bewijs, verwachting en aanbeveling | `lib/pipeline/quality-issue.ts` |
| De reparatierondes staan in `content_quality_runs` en worden al opgehaald, maar alleen aan medewerkers getoond | `page.tsx` r.144-147, `quality-panel.tsx` |

**Het cijfer dat apart staat.** Het logboek noteert op r.6184 "drie gepubliceerde contentpagina's in
de hele database". Dat is niet opnieuw gecontroleerd, want de databasetools waren tijdens het
opstellen niet beschikbaar. Klopt het nog, dan is er geen enkel gebruikscijfer dat zegt dat de
huidige indeling iemand in de weg zat. **Stap 0 van de bouw is daarom dat getal ophalen** (zie §10),
want het bepaalt of §6 een reparatie is of een verbetering vooraf.

---

## 2. Het inzicht waar dit plan op draait

Het scherm verzwijgt dat de app het werk al gedaan heeft.

De pijplijn schrijft een pagina, keurt hem, en repareert hem in rondes. Van de 68 tot 119
bevindingen op een eerste concept gaan er hooguit tien mee naar de reparatie, gekozen door een vaste
sortering van zwaar naar licht. De rest is nooit geprobeerd. Wat de klant daarna te zien krijgt, is
één ongesorteerde bak van 45 tot 96 regels waarin drie soorten punten door elkaar staan:

1. Punten die publicatie tegenhouden.
2. Punten die de reparatie geprobeerd heeft en niet opgelost kreeg.
3. Punten die nooit aan de beurt kwamen, omdat ze onder plek tien stonden.

Dat onderscheid is nergens zichtbaar, terwijl het precies het onderscheid is dat bepaalt wat iemand
ermee moet. Een punt uit groep 3 is vaak in dertig seconden zelf opgelost. Een punt uit groep 2 is
er een waar het model al op stukliep, en dat is meestal een punt waar informatie ontbreekt die
alleen de klant heeft.

**Dit is de grootste kwaliteitswinst die dit scherm te bieden heeft, en hij kost geen enkele nieuwe
meting.** De sortering is een pure functie (`prioriteerBevindingen()`), de bevindingen staan met hun
ernst in `quality_json`, en de rondes staan in `content_quality_runs`. Alle drie worden ze al
opgehaald. Er wordt alleen niets mee gedaan.

Het tweede inzicht volgt eruit: **het scherm kent drie routes en het plan ordende er twee.**
Beoordelen en live zetten zijn geordend, maar "laat ORBIT ENGINE er een nieuwe versie van maken, en
kom over een paar minuten terug" heeft geen plek, geen status en geen terugkeerpunt. Juist die route
botst met een canvas dat altijd bewerkbaar is: die schrijft namelijk een nieuwe rij met een nieuw
adres, terwijl jij in de oude zit te typen.

---

## 3. De indeling

### 3.1 Drie zones

```
┌──────────────────────────────────────────────────────────────────────────┐
│  A. ACTIEBALK (sticky, onder de bovenbalk van 48px)                      │
│  ‹ terug   Titel   [Concept]                 [⋯]   [URL…]  [Zet live ▸]  │
├───────────────────────────────────────────┬──────────────────────────────┤
│  B. HET CANVAS                            │  C. DE CONTEXTRAIL (320px)   │
│     tekst op 720px                        │                              │
│                                           │  Inhoud                      │
│  De tekst, direct bewerkbaar.             │  ▾ Kwaliteit            (3)  │
│  Eén oppervlak, geen tweede kopie.        │  ▸ Waarop dit rust    12/14  │
│  [Opslaan] verschijnt hier bij wijziging. │  ▸ Waarom deze pagina        │
│                                           │  ▸ Versies               v3  │
└───────────────────────────────────────────┴──────────────────────────────┘
```

### 3.2 De breedte, nagerekend

De vorige versie van dit plan rekende met de viewport en kwam 12 pixels tekort. De juiste som gaat
over `<main>`, want `.stand` staat dáárin, naast de zijbalk:

```
bruikbare breedte = viewport - zijbalk - 2 × 24px marge

viewport 1440, zijbalk 240  →  1152 bruikbaar
viewport 1440, zijbalk 56   →  1336 bruikbaar
viewport 1280, zijbalk 240  →   992 bruikbaar
```

De gesplitste weergave vraagt `720 (tekst) + 24 (tussenruimte) + 320 (rail) = 1064`. Dat past bij
1152 en niet bij 992.

**Daarom hangt de splitsing aan een containerquery en niet aan de vensterbreedte.** Of de rail past,
hangt namelijk net zo goed af van de zijbalk, die de gebruiker zelf in- en uitklapt. Bij `1064px`
beschikbare breedte binnen `main` verschijnt de rail als kolom; daaronder wordt hij een lade. Een
`@media`-regel zou bij een ingeklapte zijbalk onnodig de lade tonen, en bij een uitgeklapte zijbalk
op 1280 een kolom tonen die niet past. Tailwind v4 kan dit met `@container`, en dat is de eerste
plek in deze app die er een nodig heeft: dat hoort in `designsystem.md` §8 bij de standen te komen
staan, zodat de volgende die het gebruikt niet opnieuw begint.

**De lade is 420px breed** (`drawer.tsx` r.25) en de rail 320px. Dat is geen conflict, wel een
ontwerpeis: de inhoud van de rail wordt op breedte losgelaten en niet op 320px vastgezet.

### 3.3 De actiebalk plakt onder de bovenbalk

`ConfirmBar` was het verkeerde voorbeeld: die zit vastgeplakt ónderaan het scherm. Het juiste
patroon staat bij de hoofdstuktabs en gebruikt `top: var(--header-h)`, met in `globals.css` r.316-322
de uitdrukkelijke waarschuwing dat een eigen getal hier een kier oplevert waar de pagina doorheen
schuift. De actiebalk gebruikt die variabele dus, en nergens een 48.

---

## 4. Zone A, de actiebalk

Van links naar rechts: terug, de titel op één regel, de status als chip, dan het `⋯`-menu en de
publicatieactie.

**De statuschip kent zes standen**, en dat is de reparatie van de derde route:

| Stand | Wanneer | Wat de gebruiker eraan heeft |
|---|---|---|
| `Concept` | niets veranderd | dit is de huidige versie |
| `Niet opgeslagen` | er staan wijzigingen in het canvas | je bent iets aan het doen |
| `Opgeslagen` | net bewaard, verdwijnt na een paar seconden | het is binnen |
| `ORBIT ENGINE schrijft` | er loopt een herschrijfjob voor dit stuk | niet doortypen, er komt een nieuwe versie |
| `Oudere versie` | `is_current` staat uit | je kijkt naar iets wat vervangen is |
| `Live sinds <datum>` | gepubliceerd | de hermeting loopt |

**Opslaan blijft in het canvas, niet in de balk.** Dit is een correctie op de vorige versie van dit
plan. De knop hangt aan de bewerkstand in `content-editor.tsx` r.63-71; hem naar de balk verplaatsen
vraagt gedeelde toestand tussen twee zones en is dus geen verplaatsing maar een structuurwijziging.
De balk draagt wel de stand `Niet opgeslagen`, zodat je nooit kwijt bent dát er iets open staat. Wie
op de chip klikt, springt naar de knop.

**Het `⋯`-menu** draagt alles wat nu boven de tekst staat: de drie kopieervormen met hun uitleg per
regel, de twee downloads, de schema-markup, de sjabloonexport en "Hoe zet je dit op je site?". De
uitleg blijft in het menu zichtbaar staan en gaat niet achter een vraagteken: dat besluit van
16 september 2026 gold de zichtbaarheid van de reden, niet de zichtbaarheid van het menu.

**De publicatieactie** is de enige `btn-accent` op het scherm. Nog niet gepubliceerd: een URL-veld
dat uitklapt, daarna de bevestiging in twee stappen die er nu ook is. Al gepubliceerd: de link, de
uitslag van de controle, en "Toch niet gepubliceerd" in het menu.

**De bevestigingsstap noemt wat er nog openstaat.** Nu herhaalt hij alleen de link en zegt hij dat
er twee hermetingen ingepland worden. Hij zegt er voortaan bij wat er tegenhoudt:

> Er staan nog 3 punten open die publicatie tegenhouden. Weet je zeker dat deze pagina live staat?

Dit is de rem die hoort bij een knop die van een kaart naar een altijd zichtbare balk verhuist. De
knop wordt niet geblokkeerd: de klant weet zelf of de pagina op zijn site staat, en de app hoort dat
niet te overrulen. Hij mag het alleen niet verzwijgen.

---

## 5. Zone B, het canvas

Eén oppervlak voor de tekst, waar er nu twee zijn. Vier dingen die de vorige versie van dit plan
niet had opgelost en die bij een altijd-open canvas wél opgelost moeten zijn.

### 5.1 De drempel blijft, maar verplaatst

De waarschuwing dat handmatig werk buiten de schrijfpijplijn omgaat, verschijnt bij de eerste
toetsaanslag in plaats van vóór het openen, met één knop om door te gaan. Daarna is hij weg voor deze
pagina. Wat hij moest voorkomen blijft voorkomen: niemand typt erin zonder het gelezen te hebben.

### 5.2 Het canvas mag niet stil uit de pas lopen

`ContentEditor` vult zijn velden één keer bij het monteren en vergelijkt daarna met de verse
serverwaarde. Zolang de editor na elk opslaan dichtklapt, valt dat niet op. Bij een canvas dat altijd
open staat wel, en op een vervelende manier: als een verversing van elders nieuwe tekst binnenhaalt,
zegt het scherm "je hebt wijzigingen" over tekst die de gebruiker nooit getypt heeft.

**De oplossing is een expliciete vergelijking op drie standen**, en niet een `key` op de component,
want dat gooit onopgeslagen werk weg:

```
serverversie veranderd?   lokaal onopgeslagen werk?   wat er gebeurt
nee                       ja of nee                   niets
ja                        nee                         het canvas neemt de nieuwe tekst over
ja                        ja                          een balk boven het canvas: "Er is een nieuwe
                                                      versie. [Toon het verschil] [Neem over]
                                                      [Houd mijn tekst]"
```

Dat derde geval is precies de situatie die de herschrijfroute zelf aanmaakt, en het is de reden dat
`VersionDiff` al bestaat. De keuze blijft bij de gebruiker en de app gooit nooit ongevraagd werk weg.

### 5.3 Ankers komen uit de tekst die op het scherm staat

"Ga naar deze sectie" in de rail leunt op de `id`'s die `renderMarkdown()` op koppen zet, en die
worden op de server uit de opgeslagen tekst berekend. Zodra iemand een kop wijzigt zonder op te
slaan, wijst de rail naar een anker dat niet meer bestaat.

Het canvas berekent zijn koppen daarom zelf uit de tekst die er op dat moment staat, met dezelfde
functie die de server gebruikt (`extractHeadings()`, al geëxporteerd, met hetzelfde
ontdubbelalgoritme). Vindt een bevinding zijn sectie niet meer terug, dan verdwijnt de knop en komt
er "deze kop bestaat niet meer" te staan. Dat is eerlijker dan een knop die niets doet, en het is de
toepassing van conventie 3 op een anker.

### 5.4 Het canvas weet wanneer ORBIT ENGINE zelf aan het schrijven is

Een herschrijfjob levert een nieuwe rij met een nieuw `pieceId` op. Wie in de oude zit te typen,
verliest zijn werk zodra hij doorklikt. De rij `jobs` staat op deny-all in RLS, dus dit volgt het
bestaande patroon: een route met de service-role sleutel en een expliciete eigenaarscontrole, zoals
`app/api/analyses/[id]/status/route.ts` dat al doet.

Loopt er een job voor dit stuk, dan zegt de statuschip dat, staat er een regel boven het canvas, en
is de knop "nog een versie laten schrijven" uit. Het canvas blijft bewerkbaar: iemand die nu een
typefout ziet, mag hem herstellen. Is de nieuwe versie klaar, dan komt de balk uit §5.2 in beeld
met de keuze en het verschil.

### 5.5 De metavelden

Titel, meta-title, meta-description en FAQ komen onder de tekst in een ingeklapte sectie "Titel en
zoekresultaat", met het zoekresultaat-voorbeeld erin. Dat voorbeeld staat nu twee keer op de pagina.

---

## 6. Zone C, de contextrail

Vier secties. "Kwaliteit" staat open bij binnenkomst, de andere drie dicht. Dat wordt expliciet
meegegeven met `defaultOpen`, want `CollapsibleSection` klapt vanaf 1024px uit zichzelf alles open
en dat zou de rail terugveranderen in de lange lijst waar dit plan vanaf wil.

### 6.1 Kwaliteit, met de reparatie erbij

De kop draagt de klantzin die er al is, plus het cijfer. Daaronder drie groepen, en de derde is
nieuw en is het punt van §2:

```
Kwaliteit                                          68/100
──────────────────────────────────────────────────────────
ORBIT ENGINE heeft deze pagina zelf twee keer bijgewerkt.
Dit bleef staan.

▾ Houdt publicatie tegen                                3
    In "Wat kost een dakkapel"
    Er staat een prijs die nergens uit het onderzoek komt.
    → Haal het bedrag weg, of onderbouw het.
    ORBIT ENGINE heeft dit geprobeerd en kreeg het niet opgelost.
    [Ga naar deze sectie]   [Laat het nog eens proberen]

▸ ORBIT ENGINE probeerde dit, zonder resultaat                7
▸ Hier is ORBIT ENGINE niet aan toegekomen                   54
```

**Hoe de derde groep tot stand komt zonder nieuwe data.** `prioriteerBevindingen()` is puur en
deterministisch: dezelfde bevindingen in dezelfde volgorde leveren dezelfde tien op. Het scherm
draait die functie opnieuw over de bevindingen van de laatste ronde en weet daarmee welke tien de
reparatie meekreeg. Wat erbuiten viel, is "niet aan toegekomen".

⚠️ **Dit moet als eerste tegen echte data nagerekend worden** (conventie 10), want het rust op de
aanname dat de bewaarde bevindingen dezelfde lijst zijn als de lijst die destijds de reparatie in
ging. Klopt dat niet, dan is het alternatief een additieve kolom die per ronde bewaart welke
bevindingen meegingen, en dan is de groepering alsnog exact in plaats van afgeleid. Liever die
migratie dan een groep die er bijna klopt: een gebruiker die leest "hier is ORBIT ENGINE niet aan
toegekomen" terwijl het wel geprobeerd is, wordt op het verkeerde been gezet over de betrouwbaarheid
van zijn eigen tekst.

**Per bevinding** staat er wat er gevonden is, waar het over gaat en wat eraan te doen is. Het
bewijs (een citaat, een F-nummer) staat er ingeklapt onder. De knop "Laat het nog eens proberen"
zet de aanbeveling in het bestaande herschrijfvak, langs dezelfde route en dezelfde poort. Er komt
geen nieuw jobtype bij, zie §8.

**De blokkades zijn nooit ingeklapt.** Een punt dat publicatie tegenhoudt, hoort niet achter een
trede te staan, ongeacht hoeveel het er zijn.

### 6.2 Waarop dit rust

Het vrijgavepaneel, ongewijzigd van inhoud, met de samenvatting in de kop: "12 van de 14 beweringen
zijn onderbouwd". De twee zonder bron zijn wat iemand zoekt, niet de twaalf die goed zijn. De
openstaande verplichte vragen blijven erin staan, want dat is de enige plek waar de klant ziet dat
zíjn antwoord de tekst beter maakt.

### 6.3 Waarom deze pagina

"Waarom deze pagina" en "Wat er verandert aan de bestaande pagina" samen in één ingeklapte sectie:
de doelvragen, het cluster, de potentie en de schrijfopdracht.

### 6.4 Versies

De versiegeschiedenis met de diff, ongewijzigd, ingeklapt, met het versienummer in de kop. De diff
blijft een eigen lazy route, want de versiequery is bewust smal.

**De waarschuwing "dit is een oudere versie" gaat niet mee de rail in.** Die blijft staan waar hij
nu staat, pal onder de titel, en wordt bovendien een stand van de statuschip. Bij een canvas dat
altijd bewerkbaar is, is het bewerken van een vervangen versie de duurste vergissing die dit scherm
kan uitlokken, en de herschrijfroute produceert die situatie voortdurend.

### 6.5 De interne analyse

`QualityInternalPanel` blijft onderin de rail, achter dezelfde `isStaff()`-controle. Die cookie kan
rechten wegnemen en nooit geven, en dat blijft zo.

---

## 7. De flow

1. **Binnenkomst.** Titel, status, tekst. Rechts één zin die zegt of deze pagina de deur uit kan,
   met daaronder wat dat tegenhoudt en wat de app zelf al geprobeerd heeft.
2. **Beoordelen.** Je leest de tekst. Wil je weten waar een bewering vandaan komt, dan klap je
   "Waarop dit rust" open.
3. **Klein bijschaven.** Je typt in de tekst. Bij de eerste aanslag verschijnt de waarschuwing. De
   chip springt op `Niet opgeslagen`.
4. **Groot laten aanpassen.** Bij een bevinding klik je "Laat het nog eens proberen". De chip
   springt op `ORBIT ENGINE schrijft`. Je kunt het scherm sluiten.
5. **De nieuwe versie komt binnen.** Je krijgt de keuze: het verschil bekijken, overnemen, of je
   eigen tekst houden.
6. **Publiceren.** Je zet de pagina op je site, plakt de link in de balk, en krijgt te zien wat er
   eventueel nog openstaat voordat je bevestigt. Daarna controleert ORBIT ENGINE of de tekst er echt
   op staat.
7. **Daarna.** Hermeten over twee en over vier weken, want AI-assistenten pikken nieuwe content niet
   dezelfde dag op.

---

## 8. Wat dit plan niet bouwt, en waarom

### 8.1 Geen selectie-assistent met een eigen jobtype

De oorspronkelijke opdracht vroeg om een zwevend menu bij een tekstselectie waarmee de AI dat stukje
herschrijft. Dat is uit dit plan gehaald, en niet om de kosten.

De reden is de gemeten kwaliteit. Fijner knippen is in dit systeem twee keer eerder geprobeerd en
werd twee keer slechter. De reparatielus liep 67, 74, 68, 48: elke ronde die alles tegelijk
probeerde op te lossen maakte de tekst slechter, en de lus stopt daarom nu zodra hij niet meer
verbetert. Met 119 opdrachten over 25 secties was er niets gerichts meer aan een "gerichte
sectiereparatie", en de uitvoer werd groter dan die van het schrijven zelf. Een fragment is nóg
kleiner, en de vaste context (systeemprompt, feitenkaart, briefing) krimpt niet mee.

Daar komt bij dat de belofte "dezelfde controles als de pijplijn" niet waar te maken was zoals hij
er stond. Vier controles zijn puur en werken op losse tekst, maar de dekkingspoort in
`checkContentGate()` rekent over de hele pagina en gebruikt de opening als norm. Een fragment uit
sectie drie zou daar op de verkeerde grond slagen of zakken.

**Wat er in de plaats komt** is de knop per bevinding uit §6.1: dezelfde route, dezelfde poort,
dezelfde nieuwe versie, met de aanbeveling die het reparatiemodel toch al als opdracht kreeg. De
mens zegt wat er moet gebeuren, de bestaande keten doet het, en het resultaat is een versie waar je
vanaf kunt.

**Wat de deur openhoudt.** Wil je die selectie-assistent later alsnog, dan is dit de volgorde die
hem verdedigbaar maakt, en geen enkele stap daarvan is duur: (1) splits `checkContentGate()` in een
paginabrede helft en een positie-onafhankelijke helft, zodat "het deel dat op een fragment werkt"
een echte functie is; (2) laat een fragmentresultaat nooit stil landen maar altijd als voorstel dat
de gebruiker aanvaardt; (3) draai na het invoegen de paginabrede controles opnieuw over de hele
tekst, wat deterministisch is en niets kost; (4) meet op tien echte pagina's of de tekst er beter
van wordt, met dezelfde meetlat als de reparatielus. Slaagt (4) niet, dan is het antwoord nee, en
dan is dat een antwoord met cijfers in plaats van een gevoel.

### 8.2 Geen rijke editor, tot de proef slaagt

Markdown blijft de brontekst. `lib/markdown.ts` is een eigen renderer die eerst escapet en daarna
pas opmaakt, en `content-export.ts` hergebruikt diezelfde `inline()` voor de CMS-export. Er is dus
precies één plek die bepaalt hoe `**vet**` eruitkomt. Een tweede maakt het mogelijk dat wat de klant
op zijn site plakt afwijkt van wat hij op het scherm zag, en dat is bij tekst die onder zijn naam
gepubliceerd wordt het duurste soort verrassing.

**De proef die dat besluit mag omkeren**, en die met alle tijd van de wereld gewoon te bouwen is:
een script in `scripts/` dat alle opgeslagen `body_markdown` uit `content_pieces` haalt, ze door de
kandidaat-editor laat inlezen en weer wegschrijven, en teken voor teken vergelijkt. Daarnaast legt
hetzelfde script de HTML van de editor naast die van `renderMarkdown()` en naast de CMS-export.
Komt daar geen enkel verschil uit, dan is het bezwaar weg en is Tiptap met een markdown-serializer
de beste kandidaat, juist omdat je markdown kunt blijven opslaan. Komt er wel verschil uit, dan is
de vraag welke pagina's stukgaan en waarom, en dat is het moment om te beslissen.

**Wat het canvas nu al aan gevoel wint zonder die proef**: een tekstvak dat meegroeit met zijn
inhoud, de tekst in de leesletter in plaats van in mono, de koppen op hun eigen grootte, en de
volledige breedte van de leeskolom. Dat is het verschil tussen een formulierveld en een document,
en het raakt het opslagformaat niet.

---

## 9. Wat samengaat, wat weggaat, wat dichtgaat

| Nu | Wordt |
|---|---|
| Artikel (blok 12) en `ContentEditor` (blok 18) | Eén canvas |
| `SearchPreview` twee keer | Eén keer, in "Titel en zoekresultaat" |
| Zeven export- en kopieerknoppen bovenaan | Eén `⋯`-menu, met de uitleg per regel erin |
| `PublishBox` als kaart | De rechterkant van de actiebalk |
| Kaart "Hoe zet je dit op je site?" | Regel in het `⋯`-menu |
| "Kijk hier even naar", 45 tot 96 regels | Drie groepen in de rail, blokkades altijd open |
| De losse regel met kwaliteit, dekking en woorden | De koppen van "Kwaliteit" en "Waarop dit rust" |
| `WhyThisPage` plus `ImprovementList` | Eén ingeklapte sectie |
| `TableOfContents` boven het artikel | Bovenaan de rail |
| Versiegeschiedenis onderaan | Ingeklapte sectie in de rail |
| Knop "Tekst bewerken" plus drempelscherm | Weg als knop, de waarschuwing blijft bij de eerste aanslag |
| "Dit is een oudere versie" | Blijft bij de titel, én wordt een stand van de statuschip |

**Niets van de inhoud verdwijnt.** Elk cijfer, elke bevinding en elk feit dat er nu staat, staat er
na de verbouwing nog. Wat verandert is hoeveel je er tegelijk van ziet, en wat erbij staat.

---

## 10. De bouwvolgorde

### Stap 0, tellen voordat we bouwen

Haal uit productie: hoeveel contentpagina's er zijn, hoeveel er gepubliceerd zijn, hoeveel er door
een gebruiker bewerkt zijn (`edited_by_user`), en hoeveel er `quality_json` hebben (alles van vóór
migratie 0091 heeft dat niet). Vier getallen, één query.

Ze bepalen twee dingen. Is `edited_by_user` vrijwel nul, dan is dit scherm nog nooit echt gebruikt
en is dit plan een verbetering vooraf in plaats van een reparatie achteraf; dat verandert niets aan
wat we bouwen, wel aan wat we erover beweren. En is het aandeel zonder `quality_json` groot, dan is
de terugval uit §10.2 geen randgeval maar de hoofdweg.

### Stap 1, de indeling

`ContentLayout` (de drie zones, de containerquery, de lade), `ContentTopbar` (terug, titel,
statuschip, `⋯`-menu, publiceren, met `PublishBox` als kind), `ContextRail` (vier
`CollapsibleSection`s om de bestaande panelen). `page.tsx` valt terug van twintig blokken naar drie
zones, de queries blijven gelijk.

Dit is verplaatsen, nu ook echt: opslaan blijft waar het hoort en er komt geen gedeelde toestand
tussen zones bij.

### Stap 2, de kwaliteitsgroepen

`QualityFindings`: bevindingen uit `quality_json`, drie groepen, blokkades open, bewijs ingeklapt,
"Ga naar deze sectie" en "Laat het nog eens proberen". Eerst de controle uit §6.1 of de derde groep
uit de bestaande data af te leiden is; zo niet, dan de additieve kolom.

Terugval voor pagina's zonder `quality_json`: de huidige lijst uit `review_notes` blijft staan.

Tests in `test-unit.ts`: de groepering, de aftopping, de ontdubbeling over dezelfde sectie, een lege
`quality_json`, en vooral de derde groep tegen een vastgelegde echte bevindingenlijst.

### Stap 3, het canvas

`ContentCanvas`: altijd open, de drempel bij de eerste aanslag, de driestandenvergelijking uit §5.2,
de ankers uit §5.3, de metavelden ingeklapt eronder. Het conflictslot op de server blijft ongewijzigd
en krijgt er een ketentest bij, want het komt vaker in beeld zodra bewerken de standaard is.

### Stap 4, de derde route

De jobstand voor dit stuk, de zesde stand van de statuschip, de balk "er is een nieuwe versie" met
het verschil en de keuze, en het uitzetten van de herschrijfknop zolang er een job loopt. Scenario
in `test-chain.ts`: herschrijven, nieuwe versie, en de keuze allebei op.

### Stap 5, de rem op publiceren

De blokkades in de bevestigingsstap, uit dezelfde bron als de rail zodat er nooit twee tellingen
naast elkaar staan.

### Stap 6, het gevoel

Het meegroeiende tekstvak, de leesletter, de koppen op grootte. Pas hier, want dit is de enige stap
die niets kapot kan maken en dus het minst gebaat is bij vroege aandacht.

### Daarna, de open besluiten

De proef uit §8.2, en pas bij een geslaagde uitkomst de vraag over een rijke editor. De vier stappen
uit §8.1 als de selectie-assistent alsnog gewenst is.

---

## 11. Verificatie

- Vóór elke commit: `tsc --noEmit`, `test:unit`, `test:chain`, `build`, alle vier groen.
- Na stap 1: één echte pagina openen bij een uitgeklapte zijbalk, bij een ingeklapte zijbalk, op
  1280 en op een telefoon. De rail hoort te verschijnen en te verdwijnen op het moment dat de
  beschikbare breedte 1064px passeert, niet op een vast vensterformaat.
- Na stap 2: tegen een echte pagina met blokkades nakijken dat de drie groepen kloppen, en dat "Ga
  naar deze sectie" op de juiste kop uitkomt. Vergelijk de derde groep met de bewaarde rondes in
  `content_quality_runs`.
- Na stap 3: een kop hernoemen zonder op te slaan, en controleren dat de rail dat eerlijk meldt in
  plaats van een dode knop te tonen.
- Na stap 4: een herschrijving starten, doortypen, en controleren dat er niets verloren gaat.
- Verandert het gedrag, dan gaat er een alinea met datum en cijfer onderaan `docs/logbook.md`, komt
  de containerquery in `designsystem.md` §8 te staan, en verdwijnt dit bestand zodra stap 1 tot en
  met 6 staan en de open besluiten een antwoord hebben.

---

## Bijlage A, wat er veranderde ten opzichte van Het originele plan

De Teamsessie van 22 september 2026 leverde vijf bevindingen op die dit plan hebben veranderd, en
twee die zijn verworpen.

**Overgenomen.**

1. **De derde route kreeg een plek** (§4, §5.4, §6.4). Het originele plan ordende beoordelen en
   publiceren, maar niet het herschrijven, terwijl juist dat een nieuw adres aanmaakt onder een
   canvas waarin iemand zit te typen.
2. **Opslaan gaat niet naar de balk** (§4). "Fase 1 is alleen verplaatsen" klopte niet: de
   dirty-stand woont in de editor, en hem naar de balk tillen is een structuurwijziging.
3. **De breedtesom is herrekend** (§3.2). Het originele plan vroeg 1404px waar er 1392px was, en
   vergat bovendien de zijbalk van 240px. Daarom nu een containerquery op 1064px beschikbare breedte
   in plaats van een vensterbreedte.
4. **De actiebalk leende het verkeerde voorbeeld** (§3.3). `ConfirmBar` plakt onderaan; wat onder de
   bovenbalk moet blijven staan gebruikt `top: var(--header-h)`.
5. **De selectie-assistent is geschrapt** (§8.1). Niet om de kosten maar om de gemeten kwaliteit:
   fijner knippen maakte de tekst in dit systeem twee keer slechter, en de belofte "dezelfde
   controles als de pijplijn" was voor een fragment niet waar te maken.

**Verworpen.**

6. **"Het bevindingvolume is een ketenprobleem"** is waar en stond al in het originele plan. Als
   bevinding voegde het niets toe. Wat er wél uit voortkwam, staat nu in §2 en §6.1: niet het
   volume aanpakken, maar zichtbaar maken wat de app al geprobeerd heeft.
7. **"Dit scherm heeft misschien twee publieken"** (klant en prospect tijdens een demo) bleef een
   open vraag die niet in de code te beantwoorden is. Hij verandert het ontwerp pas als het antwoord
   ja is, en dan alleen de drempel uit §5.1.

**Nieuw in dit plan, uit de tegenspraak.**

8. **Stap 0, tellen voordat we bouwen** (§10). Niemand in het team had gekeken hoe vaak dit scherm
   gebruikt wordt. Het logboek noteert drie gepubliceerde pagina's in de hele database. Dat maakt
   het plan niet verkeerd, maar wel iets anders dan een reparatie van geobserveerde pijn.
9. **De rem op publiceren** (§4). De knop gaat van een kaart naar een balk die nooit uit beeld is.
   Het bewijs dat mensen hem niet konden vinden is zwak, dus de bevestiging zegt voortaan wat er nog
   openstaat.


---

## Bijlage B, wat de bouw anders uitwees dan het plan (22 september 2026)

Twee dingen bleken tijdens het bouwen anders te liggen. Ze staan hier en niet hierboven, zodat het
plan leesbaar blijft als plan en deze bijlage als correctie.

**1. Stap 0 leverde nul gepubliceerde pagina's op, niet drie.** Het logboek noteerde er drie; de
telling van vandaag geeft 25 contentpagina's waarvan nul gepubliceerd, één met de hand bewerkt en 23
met `quality_json`. Het oude getal was dus achterhaald. Dat verandert niets aan wat er gebouwd is,
wel aan wat we erover mogen zeggen: dit scherm is nog nauwelijks gebruikt, dus dit is een verbetering
vooraf en geen reparatie van pijn die iemand echt gevoeld heeft. Voor §6 is het goed nieuws:
pagina's zonder `quality_json` zijn er twee van de 25, dus de terugval is een randgeval.

**2. De derde groep hoefde niet geschat te worden.** §6.1 hield er rekening mee dat "hier is ORBIT
ENGINE niet aan toegekomen" misschien alleen af te leiden zou zijn uit de laatste ronde, en stelde
een additieve kolom voor als dat niet exact bleek. Dat is niet nodig gebleken:
`content_quality_runs.issues_json` bewaart per ronde de volledige getypeerde bevindingenlijst. Met
`prioriteerIssues(issues, 10)`, dezelfde pure functie die de pijplijn gebruikt, is exact te
reconstrueren welke tien het model destijds meekreeg. Geen migratie, twee kolommen extra in een query
die er al was.

Nagerekend op de langste pagina in productie (f3a175b5, drie rondes, 78 bevindingen in de laatste
ronde): 32 daarvan kwamen ook in een eerdere ronde voor, 46 niet. Die 46 zijn later ontstaan of pas
later gezien, en horen dus bij "niet aan toegekomen" en niet bij "geprobeerd". Precies dat
onderscheid was het punt van de hele groep.

---

## Bijlage C, feedback op de bouw zelf (22 september 2026)

Vier dingen die pas opvielen toen het scherm er stond, niet toen het op papier stond.

**1. Twee terugknoppen en twee statuschips.** `analyses/[id]/layout.tsx` zet boven élke route van
dit cluster een "Terug naar Clusters", de clusternaam en zijn status (bijvoorbeeld "Gereed"). Voor
`bibliotheek/[pieceId]` botst dat met de eigen paginabalk van dit scherm (§4), die zijn eigen
terugknop en zijn eigen statuschip ("Concept") al toont. Twee terugknoppen naar twee verschillende
plekken, en twee statuschips die over iets anders gaan (het cluster tegenover dit ene stuk) maar
naast elkaar hetzelfde leken te zeggen. Deze pagina is af, ontkoppeld van het dossier eromheen, en
hoort alleen zijn eigen chrome te tonen.

Opgelost door de layout de dieper geneste route te laten herkennen en zijn eigen chrome dan over te
slaan. Een layout kent alleen de `params` van zijn eigen segment, niet welk kind er precies getoond
wordt, dus `middleware.ts` zet er `x-pad` (het pad van het verzoek) naast, gelezen via `lib/pad.ts`.
Zelfde patroon als `x-apparaat` in `lib/apparaat.ts`. Dat maakt in één keer ook de andere twee
punten van de feedback goed: zonder de layout-chrome verdwijnt de "Instellingen"-link naar het
cluster, en de terugknop die overblijft is de paginabalk zijn eigen `terugLink` (`lib/origin.ts`),
die standaard al naar de Bibliotheek wijst.

**2. De rail was een accordion, geen tabbladen.** `context-rail.tsx` toonde alle vijf secties onder
elkaar, met "Kwaliteit" standaard open. Op een pagina met veel bevindingen is die ene sectie zelf al
lang, en de sticky kolom (met een eigen `max-height` en `overflow-y: auto`, dus technisch al begrensd
tot het scherm) oogde daardoor als één groot, doorlopend blok. Vervangen door tabbladen: één sectie
zichtbaar tegelijk, de rest een klik verderop. Hergebruikt de bestaande `.tab`-vorm uit
`globals.css` met een eigen `role="tablist"`-rij eromheen, want de zes labels in een rail van 400px
passen niet op de vaste 24px-rij die `.tabs` voor navigatie gebruikt.

**3. De rail was smaller dan hij hoorde te zijn.** De leeskolom houdt bewust 720px aan (`§3.2`,
"een regel van 1000 pixels leest niet"), maar de rail ernaast stond vast op 320px terwijl de kolom
eromheen flex:1 is: op een breed scherm bleef er een lege strook over tussen de tekst en de rail,
zonder functie. De rail is verbreed naar 400px, wat die lege strook grotendeels opvult in plaats van
de rail zelf breder te maken dan zijn inhoud nodig heeft.

**4. Het canvas had de kleur van de app, niet van een pagina.** De tekst die bewerkt wordt is de
pagina die straks gepubliceerd wordt; `.canvas-veld` stond op `background: transparent` en nam dus
de grijze app-achtergrond (`--bg-base`) over. Het bewerkbare vlak (titel plus tekst) staat nu op een
`.card`: wit, met dezelfde rand en ronding als elke andere kaart in de app, zodat het zich zichtbaar
onderscheidt van de app eromheen in plaats van als een grijs formulierveld te ogen.
