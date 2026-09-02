# Design System

> **Bron: de NOVA-workspace van InSpace** (`nova.inspace.io`), hun ingelogde productomgeving,
> geanalyseerd op 6 augustus 2026 uit de CSS-bundel en de i18n-bundel van de app.
> **Peildatum van dit document: 24 augustus 2026.** §6b (iconen) is toegevoegd op 21 augustus 2026.
> Op 24 augustus 2026 bijgewerkt met de kleuruitzondering voor de zijbalkkoppen, de gewichten
> (§3.1), de chipvorm (§5.1), de stang links op een kaart (§5.5), de iconen in een lijst (§6b.3,
> regels 5 en 6) en, later die dag, met de volledige narekening tegen Nova's gecompileerde CSS
> (§2.1, §3.2, §5.1, §5.3, §6, §10). De code is leidend; wijkt `app/globals.css` af, dan is dit
> document fout en moet het bijgewerkt worden.

> ### De narekening van 24 augustus 2026
>
> Tot die datum was alles hieronder afgeleid uit **schermafbeeldingen** van Nova. Sindsdien ligt
> hun eigen gecompileerde stylesheet ernaast, 93 kB met 381 tokens erin. De uitkomst van de
> vergelijking is de moeite van het onthouden waard: **45 van de 46 kleurwaarden in
> `app/globals.css` bleken letterlijk de hunne.** De radiusschaal, de randdiktes, de ene schaduw en
> de breedte van de zijbalk klopten ook al.
>
> Vier dingen klopten niet, en die zijn rechtgezet:
>
> 1. **De pagina is wit, niet leiblauw** (§2.1). Bij Nova is leiblauw niet de grond maar de eerste
>    stap eróp.
> 2. **Kleine labels zijn wél mono** (§3.2). Op 6 augustus was mono er juist uitgehaald, op een
>    argument dat de bron niet ondersteunt.
> 3. **De focusring is inktkleur, niet paars** (§5.3).
> 4. **De donkere modus was niet onmogelijk maar onbekend** (§10). Hun palet ligt er compleet in.
> 5. **De hoofdknop hoort inkt te zijn en niet paars** (§2.4). Gevonden doordat de eigenaar hun
>    donkere inlogscherm naast het onze legde en zag dat hun knop bijna wit was. Nagerekend op hun
>    echte pagina, en het bleek het sluitstuk van onze eigen regel dat een kleur een betekenis heeft.

Dit document beschrijft **hoe ORBIT ENGINE eruitziet en waarom**. Voor de tekst in die schermen geldt
`schrijfstijl.md`, voor de opbouw van schermen `ux-design.md`, voor het waarom achter beslissingen
`logbook.md` §30.

---

## 1. Het uitgangspunt: het product, niet de website

Tot 6 augustus 2026 was dit document gebaseerd op de **marketingsite** `inspace.io`. Dat leverde een
warme, ronde, gloeiende interface op. Goed voor een landingspagina; verkeerd voor een dashboard waar
iemand een uur per week in zit.

InSpace doet dat in hun eigen product namelijk ook niet. Hun werkomgeving is koel, strak en plat.
Het verschil is groot genoeg om het uit te schrijven:

| | inspace.io (marketing) | nova.inspace.io (product) | ORBIT ENGINE nu |
|---|---|---|---|
| Grondtoon | warm off-white `#f5f6f3` | koel leiblauw `#f8fafc` | **koel leiblauw** |
| Tekst | `#0b0b0c` bijna zwart | `#17212b` blauwzwart | **`#17212b`** |
| Randen | doorschijnend zwart | echte grijsblauwe tint | **echte tint** |
| Radii | pillen overal, 18px kaarten | 8px en 12px, pil alleen op chips | **8px en 12px** |
| Diepte | gekleurde gloed, hover-lift | één platte schaduw | **één schaduw** |
| Gradient | overal | komt nul keer voor | **alleen het woordmerk** |
| Mono | TT Commons | Geist Mono | **Geist Mono** |
| Achtergrond | lijnenraster | vlak | **vlak** |

De historische analyse van de marketingsite staat nog in **bijlage A**, want daar komen onze
merkkleuren vandaan en dat is het waard om te kunnen navertellen.

**De regel die hieruit volgt:** bij twijfel kijken we naar hoe de Nova-wérkomgeving iets doet, niet
naar hoe de InSpace-website het doet.

---

## 2. Kleur

### 2.1 Neutralen

Koel leiblauw, niet warm groengrijs. Dit is 70% van het verschil tussen "ziet eruit als een
landingspagina" en "ziet eruit als software".

| Token | Licht | Donker | Waarvoor |
|---|---|---|---|
| `--bg-base` | `#ffffff` | `#121a22` | De pagina |
| `--bg-surface` | `#ffffff` | `#17212b` | Kaarten, menu's, dialogen |
| `--bg-muted` | `#f8fafc` | `#27323d` | Geneste vlakken, tabelkoppen, hover op een oppervlak |
| `--bg-elevated` | `#e7edf2` | `#27323d` | Chips, voortgangsbanen |
| `--bg-surface-2` | `#dce3ea` | `#43505d` | Een tint dieper, hover op een genest vlak |
| `--text-primary` | `#17212b` | `#ffffff` | Blauwzwart, niet zwart |
| `--text-secondary` | `#43505d` | `#c2ccd6` | Lopende tekst die niet de kop is. 7,5:1 |
| `--text-muted` | `#788795` | `#788795` | **Alleen bijzaak.** 3,7:1, dus nooit bodytekst |
| `--border-subtle` | `#e7edf2` | `#27323d` | De standaardrand |
| `--border-strong` | `#c2ccd6` | `#43505d` | Invoervelden, hover op een kaart |
| `--border-contrast` | `#788795` | `#9daab6` | Alleen waar een rand echt moet spreken |
| `--focus-ring` | `#17212b` | `#e7edf2` | De omlijning bij toetsenbordfocus |

**De pagina werd wit op 24 augustus 2026.** Hij was leiblauw met witte kaarten erop, en dat was een
gok uit de screenshotronde. Nova's eigen CSS zegt het onomwonden: `body` krijgt daar
`--ds-background-neutral`, en dat is `#fff`. Het leiblauw is bij hen de eerste stap eróp, voor wat
ín een kaart genest zit. Vandaar de nieuwe token `--bg-muted` ertussen.

In de lichte stand vallen pagina en kaart dus samen op wit en is de kaart alleen zijn rand. In de
donkere stand kan dat niet: een rand van `#27323d` op `#121a22` is bijna niet te zien. Daar staat de
kaart één stap boven de pagina. **Dat is de enige asymmetrie tussen de twee standen**, en hij zit er
omdat het oog in donker anders werkt.

`--border-contrast` ging van `#9daab6` naar `#788795`, Nova's eigen `--ds-border-neutral`. Op een
witte pagina haalde `#9daab6` nog maar 2,1:1 en zakte daarmee onder de 3,0 die WCAG voor een
niet-tekstueel element vraagt; `#788795` haalt 3,2:1.

**Uitzondering: de ingelogde werkruimte blijft lichtgrijs (28 augustus 2026).** Het `<main>` in
`components/workspace-chrome.tsx`, de kolom rechts van de zijbalk waar elk scherm in landt, kreeg
op verzoek van de eigenaar zijn achtergrond terug op `--bg-muted` (`#f8fafc`) in plaats van het
paginawit hierboven. Nova's witte pagina is een kale pagina zonder zijbalk; zodra kaarten op wit
naast een zijbalk staan, valt de rand van die kaarten tegen een even witte grond weg. Dit is een
bewuste, plaatselijke afwijking van de regel hierboven en geldt alleen voor dit ene element, niet
voor `--bg-base` zelf: de inlogroute en losse pagina's zonder zijbalk blijven wit.

**Datzelfde vlak draagt sinds 28 augustus 2026 een stippenpatroon, alleen in de lichte stand.** De
klasse `.workspace-canvas` (`app/globals.css`) legt op `<main>` een fijn rooster van stippen
(`#e4e9ee`, één stap donkerder dan `--bg-muted`, tussen `--bg-muted` en `--bg-elevated` in) op een
aparte laag onder de inhoud. Twee radiale patronen 90° gedraaid geven het effect van korte streepjes
in plaats van losse stippen, en een maskergradiënt maakt ze onzichtbaar in het midden en zichtbaar
naar de randen: decor, geen ruis over de kaarten. De stippenlaag zit op een eigen `::before`, los van
de vlakke achtergrondkleur van `<main>` zelf, anders zou het masker ook die kleur wegvegen en zou er
in het midden pagina-wit doorschemeren.

Er is kort ook een donkere variant geweest, met `--bg-surface-2` als stipkleur (een stap líchter dan
`--bg-muted`, want een donkere stip op een al donkere grond is onzichtbaar). Die bleek niet gewenst
en is dezelfde dag teruggedraaid: in donker is `<main>` weer een vlak `--bg-muted`, zonder patroon.

**Waarom de randen een echte tint zijn en geen doorschijnend zwart:** doorschijnend zwart wordt vuil
zodra het op een gekleurd vlak ligt. Een chip met een amber vulling kreeg zo een grijsbruine rand.
Een echte tint heeft dat probleem niet.

**`--text-muted` is de enige token met een contrastwaarschuwing.** 3,7:1 is prima voor een label of
een tijdstempel en te weinig voor een zin die iemand moet lezen. Nova gebruikt hem net zo.

### 2.2 Merkkleuren

Paars en groen blijven van ORBIT ENGINE; de systematiek eromheen komt van Nova.

| Token | Waarde | Toelichting |
|---|---|---|
| `--accent-purple` | `#8511d9` | Het merkpaars |
| `--accent-purple-strong` | `#7414b5` | Hover |
| `--accent-purple-surface` | `#f3e6ff` | Vlaktint |
| `--accent-green` | `#b9efa3` | Lichtmint, alleen als vlak |
| `--accent-green-dark` | `#37941c` | Nova's productgroen |
| `--accent-green-text` | `#2c711a` | Leesbaar groen als tekst |
| `--brand-gradient` | groen naar paars, 96° | **Alleen het woordmerk** |
| `--wordmark-1` · `--wordmark-2` · `--wordmark-mid` | `#37941c` · `#8511d9` · `#5c63a8` | De twee woorden, het merkteken en zijn stip. In donker alle drie `#ffffff` |
| `--wordmark-gradient` · `--wordmark-fill` | het verloop · `transparent` | Wat `.brand-gradient-text` uitknipt, en wat eronder overblijft |

**Twee dingen zijn hier bijgetrokken.** Het groen was `#2e9e50`, dat van hun marketingsite; het is nu
`#37941c`, dat van hun product. Die twee verschillen zichtbaar zodra ze naast elkaar staan. En de
gradient stond op accentwoorden in koppen; in de Nova-werkomgeving komt hij nul keer voor, dus hij is
teruggebracht tot het woordmerk. Eén plek is genoeg om herkenbaar te zijn, overal is een
landingspagina.

**Het woordmerk is wit in de donkere stand** (24 augustus 2026, besluit van de eigenaar). Een verloop
van groen naar paars over letters van 17 pixels op een bijna zwarte balk leest niet als een merk maar
als een kleurvlekje, en het is het eerste wat het oog raakt bij het openen van de app. Dat geldt ook
voor het merkteken ernaast: de drie stops van zijn baan en de stip erin lezen dezelfde tokens uit, dus
in donker is het één witte baan met een witte stip.

Waarom er een aparte `--wordmark-fill` naast staat: `.brand-gradient-text` knipt de achtergrond uit de
letters, en dan is de tekstkleur in de lichte stand `transparent`. Zou daar `--wordmark-1` staan, dan
schilderde het groen het verloop dicht. In de donkere stand staat `--wordmark-gradient` op `none`,
valt er niets uit te knippen, en blijft precies die vulkleur over: wit. Eén regel voor twee standen.

### 2.3 De betekenislaag

**Een kleur heeft een betekenis, geen naam.** Zeven betekenissen, elk met vijf velden, exact zoals
Nova ze uitsplitst.

| Veld | Waarvoor |
|---|---|
| `--intent-x-solid` | Gevulde vlakken: knop, gevulde badge, grafieklijn |
| `--intent-x-on-solid` | De tekstkleur **op** dat gevulde vlak |
| `--intent-x-text` | Dezelfde betekenis als leesbare tekst op een licht vlak |
| `--intent-x-surface` | De lichtste tint als achtergrond van een chip of kaart |
| `--intent-x-border` | De randtint |

| Betekenis | Waarvoor | solid | text | surface | border |
|---|---|---|---|---|---|
| `intelligence` | Het merk, AI, wat ORBIT ENGINE zelf doet | `#8511d9` | `#8511d9` | `#faf4ff` | `#e9d1ff` |
| `growth` | Gelukt, gestegen, gepubliceerd | `#37941c` | `#2c711a` | `#effce9` | `#b9efa3` |
| `information` | Een mededeling, een toelichting | `#0084d1` | `#0069a8` | `#f0f9ff` | `#b8e6fe` |
| `warning` | Kijk hier even naar | `#e17100` | `#bb4d00` | `#fffbeb` | `#fee685` |
| `attention` | Vraagt een keuze, is niet fout | `#e60076` | `#c6005c` | `#fdf2f8` | `#fccee8` |
| `danger` | Blokkade, mislukt, onomkeerbaar | `#e7000b` | `#c10007` | `#fef2f2` | `#ffc9c9` |
| `premium` | Betaald, hoogste plan | `#9f7d57` | `#84664a` | `#f9f7f3` | `#e2dac6` |
| `neutral` | Uit, niet van toepassing | `#27323d` | `--text-muted` | `--bg-elevated` | `--border-subtle` |

**Elke `-text` haalt op wit minstens 5,0:1**, ruim boven de drempel van 4,5. Dat was voor de overstap
op twee plekken niet zo.

**Waarom `-text` los van `-solid` bestaat:** `#37941c` als tekst op wit haalt de drempel niet, en dat
was de kleur waarin "gelukt" stond. De donkere variant wel.
**Waarom `-on-solid` bestaat:** op `--accent-green` (lichtmint) moet donkere tekst en op het merkpaars
witte. Dat was hiervoor per component een beoordeling.

**Eén bewuste afwijking van Nova.** Zij kennen twee paarse standen, `#9e21fc` en `#8511d9`, en
gebruiken de lichte als solide vlak. Wij nemen de donkere: wit op `#9e21fc` haalt 4,0:1 en zakt
daarmee onder de drempel voor knoptekst, wit op `#8511d9` haalt 5,4:1. Bij hen is de lichte stand te
verdedigen omdat dezelfde token ook in donkere modus dienstdoet. Sinds 24 augustus 2026 hebben wij
die tweede stand ook, en daar is `#8511d9` inderdaad het gevulde vlak en `#ad45ff` de leesbare
tekst, precies zoals bij hen. In de lichte stand blijft de donkere.

---

### 2.4 De handeling is inkt, niet paars (24 augustus 2026)

`--intent-neutral-solid` · `--intent-neutral-hover` · `--intent-neutral-on-solid`

| | Licht | Donker |
|---|---|---|
| Vlak | `#27323d` | `#e7edf2` |
| Hover | `#121a22` | `#ffffff` |
| Tekst erop | `#ffffff` | `#17212b` |

**De hoofdknop was paars en is nu inkt.** Dat is de grootste enkele wijziging sinds de omzetting van
6 augustus, en de aanleiding was een waarneming van de eigenaar: op Nova's eigen inlogscherm in
donkere modus is de knop bijna wit, bij ons was hij paars. Nagerekend op hun echte pagina draagt die
knop `bg-background-neutral-inverse text-foreground-on-neutral hover:bg-background-neutral-inverse-hover`,
op `h-10 rounded-md px-4`. Dat is precies onze maatvoering, met een andere kleur.

**Waarom dit meer is dan naäpen.** Regel 1 van §8 zegt dat een kleur een betekenis heeft en geen
naam. Zolang élke hoofdknop paars is, betekent paars "knop" en niet meer "hier doet de AI iets", en
dan is de betekenislaag precies niets waard op de plek waar hij het meest opvalt. Dit is ook wat
`merkstrategie.md` §16 vraagt (neutral-first, kleur draagt betekenis), en het maakt de overgebleven
paarse plekken weer betekenisvol. Sinds §10.4 zijn dat er nog twee: de chips die een AI-uitkomst
dragen, en het woordmerk. De actieve zijbalkregel stond in die opsomming en is er in dezelfde
redenering uit gehaald; "je bent hier" is geen betekenis die om een merkkleur vraagt.

**En het loste een echt contrastprobleem op.** De oude paarse knop haalde in donkere modus
**2,39:1 tegen zijn eigen kaart**: het vlak liep bijna in de achtergrond over. De inktknop haalt
13,0:1 in licht en 13,8:1 in donker voor zijn tekst, tegenover 6,8:1 voor de oude.

**De naam klopt met wat hij doet: hij keert om.** Op een lichte pagina is de handeling bijna zwart,
op een donkere bijna wit. Dat is in allebei de standen dezelfde regel, maximaal contrast met de
grond, en niet twee losse keuzes.

> **Terugdraaien is één token.** Wie de paarse knop terug wil, zet `--intent-neutral-solid`,
> `-hover` en `-on-solid` op de intelligence-waarden. Er staat geen kleur in een component.

---

## 3. Typografie

**Geist Sans en Geist Mono**, het paar dat Nova zelf gebruikt. Mono was JetBrains Mono: twee families
van twee makers naast elkaar is precies het soort verschil dat je niet ziet maar wel voelt.

| Waar | Wat |
|---|---|
| Alles | `--font-sans` |
| Cijfers die je vergelijkt | `--font-mono` via `.stat-value`, met `tabular-nums`, **gewicht 700** |
| Kickers boven een titel | `.mono-label`: **mono**, 11px, uppercase, 1px spatiëring, gewicht 500. Zie §3.2 |
| Code en URL's | `--font-mono` |

### 3.1 De drie gewichten, en waar ze horen (24 augustus 2026)

| Gewicht | Waar |
|---|---|
| **700** (`.stat-value`, het woordmerk) | Het hoofdgetal van een scherm, en het woordmerk |
| **600** (`.type-hero`, `.type-title`, `.type-section`, `.mono-label`, `.chip`, knoppen) | Elke kop, de kicker erboven, de handeling eronder |
| **500** (`-emphasis`) | Nadruk **binnen** een alinea, nooit een titel |
| **400** (normaal) | Alle lopende tekst |

> ⚠️ **Koppen staan op 600, niet op 700, en hebben geen `tracking-tight`** (24 augustus 2026). Ze
> stonden op 24 plekken op `text-2xl font-bold tracking-tight`. In Nova's hele typografieschaal komt
> geen enkel gewicht boven 600 voor en staat élke letterspatiëring op 0; dat is precies het verschil
> dat een kop "van ons" of "van hen" laat lijken zonder dat je kunt aanwijzen waarom. De koppen
> gebruiken nu de benoemde klassen uit §3.2 (`.type-title`, `.type-section`). Twee dingen blijven
> bewust op 700 met krappe spatiëring: het woordmerk, want dat is een logo en geen kop, en de grote
> cijfers (`.stat-value` en de losse `text-3xl`/`text-6xl`-waarden op het overzicht en in het
> scorepaneel), want een getal dat het antwoord van het scherm is, is geen tekst.
>
> **Het woordmerk zelf gebruikt sinds 26 augustus 2026 geen gewicht van `--font-sans` meer, maar
> een eigen lettertype: Archivo Black**, altijd in hoofdletters, met een letterspatiëring van
> -0,07em (`.brand-logo` in `app/globals.css`, het lettertype geladen als `--font-logo` in
> `app/layout.tsx`). Twee plekken: de bovenbalk (`components/app-shell.tsx`) en de inlogkaart
> (`app/(auth)/auth-card.tsx`). Verder nergens: dit is het enige lettertype naast Geist Sans en
> Geist Mono, en het blijft bij het logo.

**Er is geen 500 meer in een kaarttitel.** De titels van kaarten en lijstregels stonden op
`font-medium`, precies één stap boven de zin eronder, en op het overzicht leverde dat twaalf kaarten
op waarin titel en toelichting even zwaar leken. Een titel is de regel waaraan je de kaart
herkent; die hoort een duidelijke stap zwaarder te zijn dan wat eronder staat, niet een halve.

`.stat-value` had helemaal geen gewicht en erfde dus dat van de tekst eromheen. Een cijfer dat het
antwoord van het scherm is, hoort het zwaarste element van zijn kaart te zijn en niet even zwaar als
de alinea ernaast.

Koppen zijn een stap kleiner geworden. Een `text-4xl` in een menu en een `text-3xl` boven een
hoofdstuk zijn marketingformaten; het product zit op `text-2xl` en lager.

### 3.2 De schaal, en de terugdraai op mono (24 augustus 2026)

Nova heeft elf benoemde tekststijlen. Ze staan sinds 24 augustus 2026 letterlijk in
`app/globals.css`:

| Klasse | Maat | Gewicht | Familie | Waarvoor |
|---|---|---|---|---|
| `.type-hero` | 36/40 | 600 | sans | De paginakop van een hoofdscherm |
| `.type-title` | 24/32 | 600 | sans | De kop van een scherm of dialoog |
| `.type-section` | 20/28 | 600 | sans | De kop boven een blok |
| `.type-lead` | 14/20 | 400 | **mono** | De aanhef in kapitalen boven een titel |
| `.type-body` | 16/24 | 400 | sans | Lopende tekst |
| `.type-body-emphasis` | 16/24 | 500 | sans | Nadruk **binnen** lopende tekst |
| `.type-compact` | 14/20 | 400 | sans | Lopende tekst in een kaart |
| `.type-compact-emphasis` | 14/20 | 500 | sans | Nadruk daarbinnen |
| `.type-caption` | 12/16 | 400 | sans | Bijschrift, tijdstempel |
| `.type-caption-emphasis` | 12/16 | 500 | sans | Bijschrift dat een waarde draagt |
| `.type-label` | 11/16 | 400 | **mono** | Het kleinste label |

⚠️ **Gebruik deze klassen en niet Tailwinds `text-*`-maten.** Dat is hier geen stijlvoorkeur maar
een valstrik. Het tokenblok `@theme inline` onderaan `app/globals.css` bevat `--color-base`, en
daaruit maakt Tailwind v4 de klasse `text-base`. Die zet dus een **kleur**
(`color: var(--bg-base)`) en niet de tekstgrootte van 1rem die je in elk ander Tailwind-project
krijgt. Op 26 augustus 2026 stond de kop "Beschikbaar" op het contentplan daardoor in de donkere
stand in de kleur van de paginagrond, dus onzichtbaar. Hetzelfde geldt voor elke andere naam die
in dat blok als `--color-…` staat: `surface`, `elevated`, `ink`, `muted`, `purple`, `green`,
`success`, `error`, `warning`, `info`. De volledige waarschuwing staat bij het token zelf.

**Wat er meeviel:** de maten en regelhoogtes van Tailwind blijken één op één die van Nova te zijn
(14 op 20, 16 op 24, 20 op 28, 24 op 32). De 399 plekken die `text-sm` gebruiken stonden dus al op
de goede schaal. Wat ontbrak is wat een schaal pas een schaal maakt: een vaste koppeling tussen
maat, gewicht en regelhoogte, zodat "een kaarttitel" één ding is in plaats van een keuze. Gebruik de
klassen in nieuw werk; bestaande `text-sm` blijft staan, want die levert exact hetzelfde beeld op.

> ⚠️ **De twee gewichten van 500 zijn voor nadruk binnen een alinea, niet voor een titel.** §3.1
> hierboven blijft onverkort gelden: een kaarttitel staat op 600. Nova gebruikt 500 voor het woord
> dat je in een zin wilt laten opvallen, en dat is iets anders dan de regel waaraan je een kaart
> herkent.

**Mono is terug in kleine labels, en dat is een terugdraai.** Op 6 augustus stond hier dat mono voor
labels de "technische read-out"-esthetiek van de marketingsite was en niet van het product, en dat
`.mono-label` daarom naar sans ging. Dat argument kwam uit schermafbeeldingen en het klopte niet:
Nova's eigen CSS heeft `type-label` en `type-lead`, allebei in de mono, met letterspatiëring van 1
respectievelijk 2,25 pixel. Mono in een klein label is dus juist wél hun productstijl.

`.mono-label` is dus weer mono, op Nova's maat en spatiëring, met twee bewuste afwijkingen: gewicht
500 in plaats van 400 (deze klasse zet zelf `--text-muted`, en 400 is in die kleur op 11 pixels te
dun) en `uppercase` in de klasse (bij Nova komt dat uit een losse utility; hier willen alle 101
gebruiksplekken het). **Hernoem hem niet in een losse commit;** dat raakt te veel bestanden tegelijk
voor een naamswijziging, ook nu de naam weer klopt.

---

## 4. Grafieken

Zes categorische kleuren, gebonden aan dezelfde betekenissen. Nova doet dit ook zo (`--chart-1` tot
`--chart-6`), en het is de reden dat een groeireeks daar overal exact dezelfde tint heeft.

| Token | Wijst naar |
|---|---|
| `--chart-1` tot `--chart-6` | intelligence, growth, information, warning, attention, premium |
| `--chart-own` | Het eigen merk, `--chart-1` |
| `--chart-rival-1/2/3` | De concurrenten, `--chart-4/3/5` |
| `--chart-axis` | Astekst |
| `--chart-grid` | Rasterlijnen |
| `--chart-reference` | Gestreepte referentielijnen |

**De as, het raster en de referentielijn zijn óók tokens.** Dat is het deel dat iedereen vergeet, en
de reden dat een grafiek er altijd nét naast ligt zodra de rest van het systeem verandert.

> ⚠️ **Openstaand:** de zes kleuren zijn **niet opnieuw gevalideerd op kleurenblindheid** na de
> overstap. De vorige set (paars, oranje, aqua, blauw) haalde ΔE 9,2 op het slechtste aangrenzende
> paar. Paars naast roze is het paar dat er nu als eerste doorheen zakt. Zolang dat niet nagemeten
> is, geldt onverkort: **elke lijn draagt een naam aan het uiteinde en er staat een tabel onder.**
> Identiteit leunt nooit alleen op kleur.

---

## 5. Vorm en diepte

### 5.1 Radii

| Token | Waarde | Waarvoor |
|---|---|---|
| `--radius-2xs` | 2px | Tekstmarkeringen |
| `--radius-xs` | 4px | Kleine markeringen |
| `--radius-sm` | 6px | Code-blokjes, geneste vlakjes |
| `--radius-md` | 8px | **Knoppen, velden, navigatie-items, menu's** |
| `--radius-lg` | 12px | Kaarten |
| `--radius-xl` | 16px | **Nergens in gebruik**, zie hieronder |
| `--radius-2xl` | 24px | **Nergens in gebruik**, zie hieronder |
| `--radius-pill` | 9999px | **Alleen voortgangsbalken, stippen en de live-dot** |

> ⚠️ **16 en 24 staan in de schaal maar worden nergens gebruikt, en dat is met opzet** (24 augustus
> 2026). Nova heeft ze wél als token, maar in hun gecompileerde CSS komt geen enkele `rounded-xl` of
> `rounded-2xl` voor: 12 pixels is in de praktijk hun grootste ronding, ook op het inlogscherm. De
> inlogkaart stond hier tot die datum op 16, en dat was een van de drie redenen dat hij naast het
> origineel een maat te groot oogde (§10.4). Ze blijven in de lijst zodat de schaal compleet is en een
> volgende ronde niet opnieuw hoeft uit te zoeken welke waarden erbij horen.

**De pil is niet langer de standaard.** Dat is de meest zichtbare enkele wijziging van deze omzetting.
De oude regel luidde "interactieve elementen zijn pilvormig"; dat is de marketingsite. In de
Nova-werkomgeving krijgen knoppen, velden en navigatie `--radius-md`.

> ⚠️ **En sinds 24 augustus 2026 zijn chips ook geen pillen meer.** Ze staan op `--radius-sm`.
> De aanleiding is het overzicht: daar staat een chip ("Potentie 68/100") in dezelfde regel als een
> titel, vlak boven een knop en naast een kaartrand, en pilvormig was hij het enige ronde element
> in een scherm vol vlakken van 6, 8 en 12 pixels. De pil hield alleen over wat rond MOET zijn: een
> balk die vult, een stip, de `live-dot`. Dat is één regel in `app/globals.css` en hij geldt
> daarmee voor alle 130 chips in de app tegelijk; met de hand een tint of een vorm nabouwen blijft
> verboden, want dán loopt het wél uit elkaar.

### 5.2 Randdiktes

`--border-width-xs` 1px · `--border-width-sm` 2px · `--border-width-md` 4px. Drie standen, zodat
1px-tegen-2px geen toevalstreffer meer is.

### 5.3 Diepte

**Eén schaduw in het hele systeem**, letterlijk die van Nova:

```css
--shadow-overlay: 0 4px 6px -4px rgba(0,0,0,.1), 0 10px 15px -3px rgba(0,0,0,.1);
```

Hij is voorbehouden aan wat **boven de pagina zweeft**: menu's, dialogen, en de hover-staat van een
kaart die echt klikbaar is. Een gewone kaart is plat en heeft alleen een rand.

**Alle gloed is weg.** De ring om de primaire knop, de hover-lift, de paarse focusgloed op velden en
de vier ambient `glow-orb`-cirkels achter de inlogpagina, het menu, de 404 en elk hoofdstuk. Meer
schaduwstanden maken een interface niet dieper, alleen rommeliger.

**De enige uitzondering is focus, en die is functioneel.** `:focus-visible` krijgt een omlijning van
2 pixels met 2 pixels afstand, en een veld krijgt bij focus een rand die twee pixels lijkt. Zonder
zichtbare focus is de app niet met een toetsenbord te bedienen. Dat is toegankelijkheid, geen sier.

> **De ring is sinds 24 augustus 2026 inktkleur (`--focus-ring`) in plaats van paars.** Nova doet het
> ook zo. De reden is scherper dan "zij doen het zo": paars is in deze app óók de kleur van de
> hoofdknop, en een paarse ring om een paarse knop is geen ring. Inkt werkt op elk vlak, en in de
> donkere stand keert hij vanzelf om naar licht.
>
> **Hetzelfde geldt voor een veld dat focus krijgt**, sinds later diezelfde dag. Dat had een paarse
> rand met een gloed van 3 pixels eromheen; nu is het een inktrand die twee pixels lijkt, zonder
> gloed, zoals Nova (`focus-within:border-2 focus-within:border-border-neutral-inverse`). Eén
> verschil: zij verdubbelen de randdikte en wij leggen er een `inset`-schaduw van 1 pixel bovenop.
> Dat geeft hetzelfde beeld zonder de sprong van één pixel die een dikkere rand in de inhoud van het
> veld veroorzaakt.
>
> **En een veld heeft nu een hover.** Dat ontbrak; Nova heeft het wel
> (`[&:not(:focus-within):hover]:border-border-neutral`), en in een formulier van twaalf velden
> scheelt het merkbaar in hoe levend het scherm aanvoelt.

### 5.4 Maatvoering

| Element | Was | Nu |
|---|---|---|
| Knop | 48px, `.btn-sm` 40px | **40px, `.btn-sm` 32px** |
| Invoerveld | 48px, grijs verzonken | **40px, wit met een rand** |
| Kaartpadding | 26px 24px 22px | **20px** |

Nova's product is dichter dan hun marketingsite. Een knop van 48px naast een veld van 48px vult een
dashboardscherm met knoppen, en verzonken grijze velden maken een formulier van twaalf velden
onrustig.

> ⚠️ **Mobiel:** `ux-design.md` §7 eist tikdoelen van minstens 44 bij 44 pixels. Een knop van 40px
> haalt dat niet. Op mobiel moet een primaire actie dus extra verticale padding of `.btn-lg` krijgen;
> dat is nog niet gebouwd en staat open.

> ⚠️ **Kaartpadding is het enige punt waarop we bewust van Nova blijven afwijken.** Zij gebruiken
> 16 pixels of 24, wij 20. Dat is niet uit slordigheid blijven staan: 20 is hier één maat voor twee
> rollen, want `.card` draagt in deze app zowel een groot paneel als een regel in een lijst. Naar 24
> gaan maakt elk scherm luchtiger en elke lijst langer, en dat is een dichtheidskeuze en geen
> getrouwheidskeuze. Wie hem wil maken: het is één regel in `app/globals.css`.

### 5.5 De stang links op een kaart (24 augustus 2026)

`.card-rail` · `.card-rail-success` · `.card-rail-warning`. Een linkerrand van `--border-width-md`
(4px) op de kaart die het **hoofdgetal van een scherm** draagt.

**Waarom er iets moest.** `ux-design.md` §1 kent per scherm één hoofdgetal, maar dat getal zat in
dezelfde witte kaart met dezelfde dunne rand als de vijf kaarten eronder. De hiërarchie zat alleen
in de lettergrootte, en die verdwijnt zodra iemand op zijn telefoon kijkt of de pagina scrollt.

**Waarom de kleur meebeweegt.** Een vaste groene stang boven een zichtbaarheid van 8% zou een
uitspraak doen die het cijfer niet waarmaakt, en §2.3 laat kleur alleen betekenis dragen. De tint
volgt daarom de eerste zin van `insights()` (`lib/insights.ts`), en dat is precies de duiding bij
dít getal: `goed` wordt groen, `let_op` oranje, en zonder oordeel (nooit gemeten, eerste meting, of
een verschil binnen de meetruis) blijft hij grijs. De stang markeert dan wél waar je moet kijken,
maar belooft niets over de richting.

**Alleen `border-left-width` en `border-left-color`, nooit de hele `border`.** De andere drie randen
blijven van `.card` en de radius blijft `--radius-lg`, waardoor de stang de ronding van de kaart
volgt in plaats van hem af te snijden.

**Eén stang per scherm.** Twee gemarkeerde kaarten onder elkaar markeren niets meer, en dat is
hetzelfde argument als bij de iconen in de zijbalk (§6b.3, regel 4).

---

## 6. Motion

Sinds 24 augustus 2026 komen deze waarden rechtstreeks uit Nova's gecompileerde CSS in plaats van
uit een schatting.

| Token | Waarde | Waarvoor |
|---|---|---|
| `--ease-standard` | `cubic-bezier(.4,0,.2,1)` | De standaardovergang |
| `--ease-out` | `cubic-bezier(0,0,.2,1)` | Wat verschijnt: menu, tooltip, melding |
| `--duration-fast` | 0,12s | Wat weggaat |
| `--duration-base` | 0,15s | De standaard: kleur, rand, dialoog, tooltip |
| `--duration-slow` | 0,20s | Een accordeon, want daar beweegt hoogte |

**0,3s is weg.** Dat was een marketingduur en hij voelt in een dashboard traag.

`prefers-reduced-motion` zet alle transities op 0,01ms en haalt de pulsering en de laadsweep weg.

**Bij het omschakelen van licht naar donker staat élke overgang uit** (`.thema-wisselt`). Zonder dat
animeren alle veertig elementen met een kleurovergang 120 milliseconden lang tegelijk mee, en dan
schuift het scherm als een veeg van de ene stand naar de andere in plaats van om te klappen.
Nagemeten met Playwright: een knop die halverwege die veeg gefotografeerd wordt staat nog volledig
op de kleur van de oude stand.

---

## 6b. Iconen

**Toegevoegd 21 augustus 2026, uitgebreid 24 augustus 2026.** De set is
[Lucide](https://lucide.dev) (ISC-licentie, gratis), via `lucide-react`. De keuze per betekenis
staat in `lib/icons.ts` (35 betekenissen), het omhulsel dat maat en lijndikte vastzet in
`components/icon.tsx`.

⚠️ **Waar een icoon wél en niet komt.** De zeven hoofdstukken van de zijbalk hebben er een, de
bestemmingen eronder niet. Dat is dezelfde dag nog bijgesteld: ze hebben ze een halve dag wél gehad,
en zestien tekeningen in een balk van zestien regels markeren niets meer. Zie §6b.3, regel 4.

### 6b.1 Waarom er nu wel een set is

Er was er geen, en dat was een besluit: `lib/nav.ts` schreef dat een icoonset "een bibliotheek, een
kleurregel en een tweede manier om betekenis over te brengen" vraagt, voor zes koppen. In plaats
daarvan stonden er losse lettertekens: ◉ ▣ ▲ ◆ ⚙ ◈ op de koppen, en verspreid door de app
✓ ✕ ○ · ☰ ▾ ▲ ▼ ↗ ← → ↑ ↓ ⚙ – ! op **40 regels JSX**, plus 23 regels in `lib/nav.ts` en twee met
de hand getekende SVG's in `components/profile-menu.tsx`.

Dat werkte niet meer om twee redenen. **Ten eerste zijn het geen zes koppen meer.** Bij veertig
plekken is "geen set" ook een set, alleen dan één zonder regels: elk teken had zijn eigen grootte,
uitlijning en dikte, want ze kwamen uit de tekstlaag en niet uit een tekening. De twee
handgetekende SVG's hadden lijndikte 1,6 en 1,8, en niemand had ooit besloten dat ze mochten
verschillen. **Ten tweede tekent niet elk apparaat ze hetzelfde.** Een teken dat het
paginalettertype niet heeft, wordt door het besturingssysteem uit een ander font gehaald, en dat
font verschilt per platform. ◉ ▣ ◆ ◈ hadden dus per klant een andere vorm, en dat is precies het
tegenovergestelde van §15.1 van `merkstrategie.md`: precies, rustig, premium.

### 6b.2 De vorm

| Eigenschap | Waarde | Waarom |
|---|---|---|
| Raster | 24×24, lijn, geen vulling | Past bij "subtiele borders" en "neutral-first" (§16.1 merkstrategie) |
| Lijndikte | **1,75** | De handgetekende SVG's die hier al stonden hadden 1,6 en 1,8. De 2 van Lucide zelf is te zwaar naast `text-sm` |
| Maat | 16 in tekstregels, 18 in koppen, 20 in losse knoppen | Meer maten zijn er niet; een vierde maat is een nieuw besluit |
| Kleur | `currentColor`, zonder uitzondering | Het icoon kleurt mee met de tekst ernaast. Nooit een eigen tint, want dan omzeilt het de betekenislaag van §2.3. **De uitzondering die hier stond is weg** (24 augustus 2026): de zes koppen van de zijbalk hebben een halve dag `--accent-purple` gedragen, en zes paarse tekeningen naast élk scherm maken van paars de kleur van de zijbalk in plaats van de kleur van "hier doet de AI iets". Zie §10.4 |

### 6b.3 De zes regels

1. **Een icoon staat nooit alleen.** Overal staat het label ernaast, dus het icoon versnelt het
   terugvinden en draagt de betekenis niet. Vandaar `aria-hidden`. Staat een icoon écht alleen (het
   hamburgermenu, het sluitkruis), dan hoort het label als `aria-label` op de knop.
2. **Eén betekenis, één icoon.** `lib/icons.ts` is de enige plek waar een betekenis aan een
   tekening gekoppeld wordt. Rechtstreeks `import { Check } from "lucide-react"` in een component
   zet de tweede kopie van een keuze neer, en twee kopieën lopen uit elkaar.
3. **De naam is de betekenis, niet de tekening.** `strategie`, niet `waypoints`. Verandert de
   tekening, dan is dat één regel in `lib/icons.ts`.
4. **In de zijbalk draagt alleen de kop een icoon.** De bestemmingen eronder niet. Het icoon van de
   kop moet het verschil dragen tussen "dit is een van de zeven vaste plekken in de app" en "dit is
   een pagina daarbinnen", en dat verschil verdwijnt zodra beide er een hebben: als alles opvalt,
   valt niets op. De bestemming springt al in tot ónder de tekst van zijn kop, en dat zegt genoeg.
   (Tot 24 augustus 2026 stond daar ook een verticale lijn; die is weg omdat de uitlijning het
   kindschap al draagt, zie `ux-design.md` §5.) `NavItem` in `lib/nav.ts` heeft daarom geen
   icoonveld, en `scripts/test-unit.ts` bewaakt dat.
5. **In een lijst draagt een regel een icoon zodra de SOORT verschilt** (24 augustus 2026). Niet
   omdat het mooier is: op het overzicht van Gasservice Brabant stonden twaalf kansen onder elkaar
   die alleen in hun tekst verschilden, en je las drie keer hetzelfde begin ("Maak een nieuwe
   pagina over…", "Verbeter de pagina over…") voordat je het verschil vond. Verschillen de regels
   níét van soort, dan komt er geen icoon: twaalf keer dezelfde tekening is een marge en geen
   markering. Zie `lib/opportunities.ts` (`OPPORTUNITY_ICON`) en `lib/work-kind.ts`
   (`workKindIcon`); allebei getest, want een handeling zonder tekening rendert een gat op de plek
   waar de klant kijkt.
6. **Een icoon in een lijstregel staat in de leeskleur, nooit in de merkkleur.** Twaalf paarse
   tekeningen onder elkaar trekken de blik naar de linkerrand, terwijl de titel het antwoord
   draagt. Hetzelfde geldt voor de handeling onder aan zo'n kaart: die is `font-semibold` in de
   leeskleur en niet paars. Paars is in dit product de kleur van de primaire knop, en twaalf paarse
   regels onder elkaar maken van een lijst een muur van gelijkwaardige hoofdacties.

### 6b.4 Wat de set níet doet

Geen glittertje bij alles wat AI aanraakt, geen brein, geen robot, geen tandwiel voor instellingen.
Dat zijn de clichés die §15.4 van `merkstrategie.md` bij naam verbiedt. Instellingen krijgt daarom
schuifjes, want dat is wat je er doet: afstellen. En de set is klein gehouden: 35 betekenissen, niet
1.600. Een icoon dat niets aanwijst is versiering, en dat is precies wat §15.3 niet vraagt.

De acht die er op 24 augustus 2026 bij kwamen zijn allemaal soorten werk: `nieuwepagina`,
`paginabijwerken`, `publiceren`, `meten`, `goedkeuring`, `feit`, `herstel` en `offsite`. Geen
ervan is een nieuw begrip; ze bestonden al als tekst in `lib/work-kind.ts` en `lib/opportunities.ts`
en hadden alleen nog geen tekening.

---

## 7. De primitieven

Gebruik deze, nooit een eigen tint of een eigen maat.

| Primitief | Regel |
|---|---|
| `.card` | Eén rand, **plat**. Geen schaduw, geen hover. `--bg-surface`, dus wit in licht en één stap boven de pagina in donker |
| `.card-interactive` | Alleen op wat écht klikbaar is. Krijgt de rand-plus-schaduw bij hover |
| `.card-accent` / `-success` / `-warning` / `-danger` | Getinte kaartrand, uit de betekenislaag |
| `.card-rail` / `-success` / `-warning` | De 4px-stang links op de kaart met het hoofdgetal. Eén per scherm, tint volgt de trend. Zie §5.5 |
| `.btn-primary` | **De handeling.** 40px, `--radius-md`, inkt met omgekeerde tekst. Zie §2.4 |
| `.btn-outline` | De keuze ernaast: rand, geen vlak. Zelfde maat |
| `.btn-ghost` | **De uitweg.** Zelfde maat, geen vlak en geen rand, bij hover 5% inktwaas. Voor "Wachtwoord vergeten?", "Terug naar inloggen", "Annuleren" |
| `.btn-sm` / `.btn-lg` | 32px en 44px. Combineren met een van de drie hierboven |
| `.chip` + `-success` / `-danger` / `-warning` / `-info` / `-attention` / `-neutral` | `--radius-sm`, sans, gewicht 600, schrijftaal. Nooit met de hand een tint of een vorm nabouwen |
| `.mono-label` | De kicker boven een titel. **Mono**, uppercase, 11px. Zie §3.2 |
| `.type-hero` … `.type-label` | De elf tekststijlen van Nova. Zie §3.2 |
| `.stat-value` | Cijfers die je vergelijkt, in mono met `tabular-nums`, gewicht 700 |
| `.field` | Oppervlakkleur met een rand, 40px. Hover maakt de rand donkerder, focus maakt hem inkt |
| `.live-dot` | Pulserend, in `growth`. "Loopt nu" |
| `.skeleton` | Laadvlak. De vorm van wat er komt |
| `.prose` | Lange tekst: rapport, contentpagina |
| `.brand-gradient-text` | **Alleen het woordmerk ORBIT ENGINE** |
| `Icon` | Het enige icoon-component. `<Icon naam="klaar" />`, nooit een los teken en nooit een eigen SVG. Zie §6b |
| `PageHeader`, `EmptyState`, `Narrow`, `ConfidenceChip` | Eén variant per patroon |
| `ThemeToggle` | De schakelaar licht/donker, rechtsboven in de balk. Eén exemplaar, in `workspace-chrome.tsx` |
| `AnalyticsFilters` | De filterbalk van Analytics: Periode, Label, Cluster (en straks Fase). Plakt onder de bovenbalk, alleen op `/merk/[id]/analytics/*`. Zie `docs/tasks/analytics-herontwerp.md` F2 |
| `AnalyticsTable` | De tabel van Analytics: sorteerbare kop, plakkende kop en eigen rij, groeperen op label. Vaste kolombreedtes, cijferkolommen met `tabular-nums`. Zie F3 |

---

## 8. De negen regels

1. **Een kleur heeft een betekenis, geen naam.** `--intent-growth-text`, nooit `--accent-green`, en
   nooit een hexwaarde of rauwe `rgba()` in een component. Zie §11 voor de controle. **Sinds er twee
   standen zijn is dit geen nettigheid meer maar een voorwaarde:** een hexwaarde in een component
   draait niet mee met de donkere stand en levert daar gegarandeerd wit op wit of zwart op zwart op.
2. **Plat, niet gloeiend.** Rand en vlak dragen de hiërarchie. De ene schaduw is voor wat zweeft.
3. **De pil is voor wat rond moet zijn**: voortgangsbalken, stippen, de `live-dot`. Chips staan op
   `--radius-sm`, knoppen en velden en navigatie op `--radius-md` (§5.1).
4. **Status is kleur plus vorm, nooit kleur alleen.** Een dot, een pijl, een chip met tekst.
5. **Mono is voor cijfers en voor het kleinste label.** `.stat-value` en `.mono-label` /
   `.type-label` / `.type-lead`. Lopende tekst en koppen zijn sans. Sinds 24 augustus 2026, toen
   bleek dat Nova zelf mono in labels gebruikt; zie §3.2.
6. **Contrast is een tokenkeuze.** Gebruik `-text` op licht en `-on-solid` op gevuld, en vertrouw
   `--text-muted` nooit voor iets wat gelezen moet worden.
7. **Eén easing, korte duur** (§6). En bij het wisselen van stand staat elke overgang uit.
8. **De gradient is het woordmerk.** Nergens anders.
9. **Een icoon komt uit `lib/icons.ts`.** Nooit een letterteken in de tekst (✓, ↗, ▾), nooit een
   met de hand getekende SVG, nooit een rechtstreekse import uit `lucide-react`. En in de zijbalk
   draagt alleen de kop er een. Zie §6b.

---

## 9. Wat we van Nova overnamen en wat niet

| Uit Nova | Overgenomen | Waarom |
|---|---|---|
| Betekenisnamen voor kleuren | **Ja**, alle zeven | De kleur kan wijzigen zonder één component aan te raken |
| Vijf velden per betekenis | **Ja** | In onze eigen indeling, naar hoe deze app ze gebruikt |
| Koele leiblauwe neutralen | **Ja** | Het grootste enkele verschil |
| Radiusschaal en randdiktes | **Ja**, teruggebracht tot zes standen | Negen was meer dan we gebruiken |
| Eén schaduw | **Ja** | En alle gloed eruit |
| Geist Sans plus Geist Mono | **Ja** | Eén makerspaar |
| Zes grafiekkleuren aan betekenissen | **Ja** | Nog wel te valideren, zie §4 |
| Hun elf tekststijlen | **Ja**, alle elf | Sinds 24 augustus 2026, zie §3.2 |
| Licht- en donkerparen | **Ja**, alle 107 | Sinds 24 augustus 2026, zie §10 |
| Hun witte paginagrond | **Ja** | Sinds 24 augustus 2026, zie §2.1 |
| Hun inktkleurige focusring | **Ja** | Beter dan paars, want paars is ook de knopkleur, zie §5.3 |
| Hun eigen tokens voor de schakelaar | **Ja** | Het enige vlak waarvan de kleur zonder tekst iets zegt |
| Hun inktkleurige hoofdknop | **Ja** | Geeft de merkkleur zijn betekenis terug, zie §2.4 |
| Hun spookknop met waas bij hover | **Ja** | Een uitweg is een knop, geen zwevende link |
| Hun inktkleurige veldfocus en veldhover | **Ja** | Zelfde reden als de knop, zie §5.3 |
| Hun logo in één kleur | **Nee** | Hun woordmerk is één vorm in `currentColor`, het onze is twee merkkleuren die al meedraaien |
| Hun lichte paars als solide vlak | **Nee** | Haalt de contrastdrempel niet, zie §2.3 |
| Hun negen radii | **Nee** | Zeven volstaan |
| Hun kaartpadding van 16 of 24 | **Nee** | 20 is één maat voor twee rollen, zie §5.4 |
| Zijbalknavigatie, klantkiezer, toasts | **Nee** | Dat is indeling, geen vormgeving, en het hoort dus in `ux-design.md` |

---

## 9b. Het open ontwerpbesluit: dit systeem is van de concurrent

**Vastgelegd 17 augustus 2026. Nog geen besluit genomen, en dat is precies het punt.**

Alles in dit document is afgeleid van de werkomgeving van InSpace Nova. Dat staat in §1 als de
bewuste keuze die het was, en het heeft goed werk geleverd: de app oogt als software in plaats van
als een landingspagina. Maar er is sindsdien iets veranderd wat die keuze onder spanning zet.

`docs/merkstrategie.md` beschrijft Outer Orbit als **toonaangevend**, een merk dat de status quo
uitdaagt en bouwt wat nog niet bestaat. §15.4 daarvan verbiedt met zoveel woorden de "neonpaarse
AI-gloed", en §16 vraagt om neutral-first met kleur die betekenis draagt.

**Twee van die drie zijn geen probleem.** De app ís al neutral-first (`#ffffff` grond, `#17212b`
tekst), en kleur draagt hier al betekenis in plaats van een naam (§2). De gloed en de gradient zijn
allebei al teruggebracht tot één plek elk: de grafiekband en het woordmerk.

**Wat wél botst is de herkomst.** Zolang de tokens, de radiusschaal, de randdiktes en de ene
schaduw letterlijk uit het product van de concurrent komen, werkt de vormgeving tegen het verhaal
dat de verkoop vertelt. Dat is nooit als besluit genomen. Het is geslopen: van een praktische keuze
op 6 augustus naar het fundament van het hele uiterlijk.

> ⚠️ **De ronde van 24 augustus 2026 heeft dit besluit scherper gemaakt, niet zachter.** Op verzoek
> van de eigenaar is de app die dag verder naar Nova toe gebracht: hun paginakleur, hun elf
> tekststijlen, hun focusring, hun animatieduren en hun volledige donkere palet. De afstand tot het
> merkverhaal is daarmee groter geworden en niet kleiner, en dat is met open ogen gebeurd. Het
> tegenwicht is dat het fundament nog steeds op één plek zit: **wie het uiterlijk eigen wil maken,
> vervangt tokens in `app/globals.css` en niet honderdzestig componenten.** Regel 1 van §8 is de
> reden dat dat kan, en die is nu ook in de donkere stand consequent doorgevoerd. Wat er nog niet
> is, is waar het door vervangen zou moeten worden; zie punt 3 hieronder.

**Wat er nodig is om het op te lossen**, in deze volgorde:

1. **Een uitspraak van de eigenaar** of het uiterlijk eigen moet worden. Zonder die uitspraak bakt
   elke volgende UI-wijziging de afgeleide verder in.
2. **Als het antwoord ja is: een eigen merklaag, geen herbouw.** Het fundament klopt. Wat eraan
   vastzit is de merkkleur (het paars `#8511d9`, het groen, de gradient) en de vormtaal. Dat is
   werk in `app/globals.css` en dit document, niet in de componenten, juist omdat regel 1 van §8
   ("een kleur heeft een betekenis, geen naam") consequent is toegepast.
3. **Wat ontbreekt om het te kúnnen doen:** er is geen logo, geen vastgesteld kleurenpalet en geen
   typografiekeuze van Outer Orbit zelf. `merkstrategie.md` §27 vraagt daar zelf om, met een lijst
   van veertig merkassets. Zolang die er niet zijn, is er niets om het door te vervangen.

**Tot dat besluit valt, blijft dit document leidend voor de app.** Wat hier staat beschrijft wat er
werkelijk in `globals.css` staat, en dat is de enige bruikbare waarheid voor wie een scherm bouwt.

**De inlogroute volgt sinds 24 augustus 2026 de maatvoering van Nova zelf.** Op verzoek van de
eigenaar is `app/(auth)/` naar hun inlogscherm gebracht: één gecentreerde kaart van 520 pixels met
radius 12 en 32 pixels lucht binnen de rand (40 vanaf 640 pixels breed), een mono-kopje boven de
titel, `.type-title` als kop, velden van 44 pixels met een icoon erin, een knop van 44 en een
afsluitregel onder een streep. Hij is er een halve dag ruimer geweest, en dat was zichtbaar naast het
origineel; §10.4 heeft de vijf waarden en waar ze vandaan komen. De achtergrond is één rustig vlak: het decor met baanringen en planeten dat hier tot
diezelfde dag stond is eruit. Het argument voor de vlakke dashboardstijl gaat hier niet op, want
niemand zit een uur op een inlogscherm, en in de sales-led opzet is het vaak het eerste beeld in een
demogesprek. **Dit is nadrukkelijk geen antwoord op het besluit hierboven**, dat blijft open. De
uitzondering is ingeperkt zodat hij niet lekt: alle vorm staat in één blok in `app/globals.css`
onder de kop "HET INLOGTONEEL", elke klasse begint met `.auth-`, en er is geen enkele nieuwe kleur
bijgekomen. Neem er niets van over in een dashboardscherm. `docs/logbook.md` heeft de volledige
afweging.

---

## 10. Donkere modus (24 augustus 2026)

**Er zijn twee standen.** Besluit 17 van 11 augustus 2026 schrapte donkere modus; dat besluit is op
24 augustus teruggedraaid en de reden is dat de aanname eronder niet meer klopte.

Die aanname luidde: het `:root`-blok heeft 107 kleur-tokens, en die hebben elk een doordachte
tegenhanger nodig; mechanisch omkeren geeft grijze modder. Dat is nog steeds waar. Wat veranderde is
dat **die tegenhangers er al blijken te liggen**. Nova's gecompileerde CSS draagt hun volledige
donkere palet, tot en met de randtinten en alle zeven betekenissen. Er viel dus niets meer af te
leiden en niets meer te gokken: het werk dat het besluit destijds te duur maakte, was al gedaan door
de bron waar dit systeem toch al van komt.

### 10.1 Hoe de stand gekozen wordt

De startstand volgt het besturingssysteem. Er is bewust géén knop voor die derde stand: iemand die
zijn laptop 's avonds op donker zet, verwacht dat een app dat volgt zonder dat hij het per app moet
regelen. Klikt hij op de schakelaar rechtsboven, dan kiest hij, en vanaf dat moment wint zijn keuze.

```
:root, :root[data-theme="light"]                      de lichte stand, de volledige lijst
@media (prefers-color-scheme: dark) op
  :root:not([data-theme="light"])                     de systeemvoorkeur
:root[data-theme="dark"]                              de eigen keuze, wint van allebei
```

De keuze staat in `localStorage` onder `orbit-thema`, niet in de database. Licht of donker is een
eigenschap van het scherm waar je op zit en niet van het account: dezelfde consultant kan op zijn
laptop donker willen en op de beamer in een demogesprek licht. In de database zou de keuze meereizen
en dat is precies verkeerd.

Een kaal `<script>` in de `<head>` van `app/layout.tsx` leest die sleutel vóór de eerste tekening.
Zonder dat script ziet iemand met een donkere voorkeur bij elke paginaovergang een witte flits.
`data-theme` staat daarom bewust **niet** in de JSX: wat React nooit rendert, beheert hij ook niet,
en dan is er ook geen verschil tussen server en browser om over te klagen.

> ⚠️ **Definieer een kleur nooit alleen in een van de twee donkere blokken.** De lichte stand is de
> volledige lijst; de donkere blokken herdefiniëren alleen wat anders moet zijn. Een token dat alleen
> donker bestaat is in de lichte stand leeg, en een lege kleur is doorzichtig.

### 10.2 De drie plekken waar donker niet de spiegel van licht is

1. **De kaart staat één stap boven de pagina** (§2.1). In licht vallen ze samen op wit en doet de
   rand het werk; in donker is een rand van `#27323d` op `#121a22` bijna niet te zien.
2. **De grafiekkleuren wijzen naar de `-text`-waarden in plaats van naar `-solid`.** In licht is
   `-solid` de donkere tint en dat werkt op een lichte grond. In donker wordt `-solid` juist nóg
   donkerder (groei gaat van `#37941c` naar `#2c711a`) en verdwijnt de lijn in de achtergrond.
   Zonder deze omzetting is elke grafiek in donkere modus onleesbaar, en dat is geen smaakkwestie.
3. **De grond onder de inlogkaart gaat de andere kant op** (`--bg-stage`, 24 augustus 2026). In licht
   ligt hij één stap ONDER de kaart (`#f8fafc` onder wit), in donker één stap ERBOVEN (`#121a22`
   onder `#17212b`). Dit token bestond niet en de kaart stond op `--bg-muted`; in donker is dat
   `#27323d`, dus lichter dan de kaart zelf, én exact de kleur van de kaartrand. Zie §10.4.

Verder klapt afdrukken altijd terug naar licht: in `@media print` staan de lichte neutralen opnieuw.
Niemand drukt een donkere pagina af, dat kost inkt en leest slechter.

### 10.3 Wat nog nagelopen moet worden

De tokenlaag, de primitieven en de inlogroute zijn in beide standen bekeken; de inlogroute is op 24
augustus 2026 ook echt in de browser gefotografeerd, licht én donker. **De ingelogde schermen zijn
dat nog niet**, en volgens regel 10 van `CLAUDE.md` is gebouwd niet geverifieerd. Loop na de
eerstvolgende deploy minstens deze vier langs in donker: het overzicht (kaarten en het hoofdgetal),
analytics (de grafieken, zie §10.2), het clusterdossier (lange tabellen) en de contentbibliotheek
(`.prose`, gerenderde Markdown).

### 10.4 De eerste correctieronde op donker (24 augustus 2026)

De donkere stand was gebouwd maar niet bekeken. Vier dingen bleken mis, en alle vier zaten ze in de
**toepassing** en niet in het palet: de 59 kleurwaarden die de donkere stand van Nova overneemt zijn
narekenbaar identiek aan de hunne, tot op het cijfer.

1. **De inlogkaart had geen zichtbare rand.** Zie §10.2 punt 3. De kaart lag in een lichter kader met
   een rand in precies de kleur van dat kader; van een kaart met een omtrek bleef een vlek over.
2. **De inlogkaart was een maat te groot.** 560 breed, 16 rond, 52 pixels marge, velden van 48 en een
   knop van 50. Nova's eigen CSS wijst alle vijf aan: 520 (`max-w-[520px]`), 12 (`rounded-lg`, §5.1),
   32 en 40 (`p-8` met `sm:p-10`) en 44 (`h-11`). De titel stond op 28 pixels op gewicht 700 met
   `tracking-tight`; dat is nu `.type-title`, Nova's eigen kop van 24 op 600 zonder krappe spatiëring.
3. **Het woordmerk was een groen-paars vlekje op zwart.** Nu wit, zie §2.2.
4. **De zijbalk was de felste kleur van het scherm.** De actieve regel droeg een paars vlak (`#42006d`)
   met paarse letters erop (`#ad45ff`): 2,6:1, onder de 4,5 die leesbare tekst vraagt. Erger dan het
   contrast is wat het met de betekenislaag deed: paars betekent "hier doet de AI iets" (§8, regel 1),
   en zolang de balk het naast élk scherm voor "je bent hier" gebruikt betekent het dat niet meer.
   Dezelfde redenering die de hoofdknop van paars naar inkt bracht (§2.4). De actieve regel is nu een
   neutraal vlak (`--bg-elevated`) met gewone tekstkleur, dus wit in donker; de hover eronder is een
   waas van 5% inkt, zodat "waar je bent" en "waar je overheen zweeft" niet dezelfde zwaarte krijgen.
   De vier `alleen jij`-stempels en het icoon van een ingeklapt hoofdstuk zijn in dezelfde ronde
   neutraal geworden, om dezelfde reden.

---

## 11. Controle vóór een commit

Beide moeten **nul regels** geven, en **op `.ts` én `.tsx`**, niet alleen op componenten:

```bash
grep -rnE "#[0-9a-fA-F]{6}\b" app components lib --include="*.tsx" --include="*.ts" \
  | grep -vE "app/layout\.tsx|lib/email/|app/opengraph-image\.tsx|app/\(auth\)/orbit-mark\.tsx" \
  | grep -vP ':\d+:\s*(\*|//|/\*)'
grep -rnE "rgba?\([0-9]" app components lib --include="*.tsx" --include="*.ts" \
  | grep -v "lib/email/"
```

Drie uitzonderingen, en elk heeft dezelfde soort reden: er is daar geen CSS die de variabele kan
oplossen.

| Bestand | Waarom |
|---|---|
| `app/layout.tsx` | `themeColor` kleurt de browserbalk van het besturingssysteem, buiten de pagina om. Sinds 24 augustus 2026 zijn dat twee waarden, één per stand |
| `lib/email/*.ts` | HTML voor e-mailclients, en die begrijpen geen `var(--...)` |
| `app/opengraph-image.tsx` | Wordt op de server tot een PNG gerenderd; er is geen stylesheet en geen stand |
| ~~`app/(auth)/orbit-mark.tsx`~~ | **Vervallen op 24 augustus 2026.** Het merkteken hield zijn kleuren in beide standen; nu leest het `--wordmark-1/-mid/-2` en wordt het wit in donker (§2.2), dus het heeft geen hexwaarden meer en geen uitzondering nodig |

Het tweede filter gooit commentaarregels weg: een hexwaarde in een toelichting ("`#e7edf2` op wit
haalde 1,1:1") is een cijfer in een zin en geen kleur in een component.

**Waarom nu ook `.ts`.** De eerste versie van deze controle liep alleen over `.tsx` en miste
daardoor `lib/analysis-status.ts`: vijf rauwe `rgba()`-kleuren, waarvan `info` en `success`
allebei letterlijk hetzelfde oude marketingsite-groen (`rgba(46,158,80,…)`) hadden. Gevolg: een
"score binnen, rapport volgt"-melding was in de kleur niet te onderscheiden van "gereed". Gevonden
op 6 augustus 2026, ná de eerste twee opruimrondes, bij het nalopen van een derde. Dezelfde soort
kleur, een andere bestandsextensie, en dat was genoeg om erdoorheen te glippen.

**En een derde controle: verwijst elke `var(--...)` naar een token dat bestaat?**

```bash
python3 - <<'EOF'
import re, glob, io
css = io.open("app/globals.css").read()
defined = set(re.findall(r'^\s*(--[a-z0-9-]+):', css, re.M)) | {"--font-geist-sans", "--font-geist-mono"}
used = set()
for p in glob.glob("app/**/*.tsx", recursive=True) + glob.glob("components/*.tsx") + ["app/globals.css"]:
    used |= set(re.findall(r'var\((--[a-z0-9-]+)\)', io.open(p).read()))
print(sorted(used - defined) or "geen ongedefinieerde tokens")
EOF
```

Deze derde vond op 6 augustus 2026 twee verwijzingen die **nooit** hebben gewerkt: `var(--danger)`
op een foutmelding, die daardoor in gewone tekstkleur stond, en `var(--accent)` op de gevulde balk
van de briefingvoortgang, die daardoor volledig doorzichtig was. Die balk stond dus altijd op leeg,
hoeveel vragen de klant ook had beantwoord. Geen van beide viel op, want een ontbrekende
CSS-variabele geeft geen fout: hij valt stil terug op niets.

**En een vierde: staat er nog ergens een letterteken waar een icoon hoort?**

```bash
grep -rnP "(*UTF)[\x{2190}-\x{21FF}\x{25A0}-\x{25FF}\x{2713}-\x{2718}\x{2699}]" \
  app components --include="*.tsx" | grep -vP ':\d+:\s*(\*|//|/\*)'
```

Dit vindt pijlen, geometrische vormen, vinkjes, kruisjes en het tandwiel in JSX. Nul regels is het
doel; wat er wél uit komt hoort in `lib/icons.ts` thuis (§6b, regel 9 van §8). `(*UTF)` moet erbij,
anders weigert `grep -P` codepunten boven 255, en het tweede filter gooit commentaarregels weg: die
mogen een pijl bevatten (`niet ingelogd → /login`), want daar is het leesteken en geen icoon.

Deze controle vond op 21 augustus 2026, ná een eerste ronde waarin 26 regels met de hand waren
omgezet, nog **veertien** regels die overgeslagen waren: vier terug-links, vier `→` achter een
tekstlink, vier verplaatspijlen en twee stijg- en daalpijlen bij een cijfer. Ruim een derde van het
totaal, gevonden in één commando. Vandaar dat hij hier staat en niet in een commit-bericht.

**En een vijfde, sinds er twee standen zijn: klopt de donkere stand met de lichte?**

```bash
python3 - <<'EOF'
import re, io

# Commentaar eruit: de koppen in globals.css noemen de selectors zélf, en dan
# vindt de zoekopdracht de toelichting in plaats van de regel.
css = re.sub(r"/\*.*?\*/", "", io.open("app/globals.css").read(), flags=re.S)

def blok(sel):
    i = css.index("{", css.index(sel)) + 1
    diepte, begin = 1, i
    while diepte:
        diepte += (css[i] == "{") - (css[i] == "}")
        i += 1
    return css[begin : i - 1]

def namen(sel):
    return set(re.findall(r"^\s*(--[a-z0-9-]+):", blok(sel), re.M))

def waarden(sel):
    return dict(re.findall(r"^\s*(--[a-z0-9-]+):\s*([^;]+);", blok(sel), re.M))

licht = namen(':root,\n:root[data-theme="light"]')
keuze, systeem = ':root[data-theme="dark"]', ':root:not([data-theme="light"])'

print("alleen donker :", sorted(namen(keuze) - licht) or "geen")
print("namen uiteen  :", sorted(namen(keuze) ^ namen(systeem)) or "geen")
a, b = waarden(keuze), waarden(systeem)
print("waarden uiteen:", [k for k in a if a[k].strip() != b[k].strip()] or "geen")
EOF
```

Drie keer "geen" is het doel, en elke regel vangt een andere fout:

1. **Alleen donker gedefinieerd.** Zo'n token is in de lichte stand leeg, en een lege CSS-variabele
   valt stil terug op niets: doorzichtig, of de erfkleur van de ouder. Precies dezelfde stille fout
   als bij de derde controle hierboven, alleen zichtbaar in maar één van de twee standen en dus
   twee keer zo makkelijk te missen.
2. en 3. **De twee donkere blokken lopen uiteen.** Ze staan er met opzet twee keer (§10.1) en horen
   identiek te zijn. Wie er één aanpast en de ander vergeet, bouwt een app die er anders uitziet
   voor wie zelf donker kiest dan voor wie zijn laptop op donker heeft staan. Dat is een verschil
   dat je alleen vindt als je er gericht naar zoekt.

Stand op 24 augustus 2026: 116 tokens in de lichte stand, 81 daarvan krijgen een donkere
tegenhanger, en de twee donkere blokken zijn tot op de waarde identiek.

**Dit is geen formaliteit.** De drift is nu drie keer teruggegroeid: de eerste opruiming telde 30
inline-stijlen over 17 bestanden, de tweede 35, de derde vijf in één bestand dat de eerste twee
controles allebei misten omdat hij een `.ts` was, geen `.tsx`. Een regel zonder controle is een
voornemen, en een controle die maar de helft van de bestanden bestrijkt is een gedeeltelijk
voornemen.

---

## Bijlage A, de marketingsite van inspace.io (historisch, juli 2026)

> Dit was tot 6 augustus 2026 de basis van dit document. Het staat er nog om twee redenen: onze
> merkkleuren komen hiervandaan, en het legt uit waarom de app er tot die datum uitzag zoals hij
> eruitzag. **Het is geen bron meer voor nieuw werk.**

**Neutrale basis:** `--paper` `#FFFFFF` · `--paper-2` `#F5F6F3` · `--ink` `#0B0B0C` · `--muted`
`rgba(11,11,12,.62)` · `--line` `rgba(11,11,12,.10)`.

**Merkkleuren:** `--purple` `#8511D9` · `--purple-soft` `#A24DEC` · `--green` `#B9EFA3` ·
`--green-text` `#2E9E50` · `--green-dark` `#54B86A`, met de gradient
`linear-gradient(96deg, #54B86A 0%, #8511D9 96%)`.

**Typografie:** Aeonik en TT Commons, allebei commercieel gelicenseerd en dus niet overneembaar.
Geist Sans en Geist Mono zijn de open-source substituten.

**Componenten:** knoppen van 56px, volledig rond, met een ringgloed
`box-shadow: 0 0 0 6px rgba(133,17,217,.12)`. Kaarten met `border-radius: 18px` en een
hover-transform. Badges in mono, uppercase, breed getrackt. Een pulserende live-dot.

**Het donkere "ORBIT ENGINE"-paneel** in hun mega-menu was ooit onze beoogde basis voor een donkere modus:
`#0B0B0C` naar `#171128` met een paarse ondertoon. Dat plan is vervallen. Als er ooit een donkere
modus komt, volgt hij de Nova-werkomgeving uit §10, niet dit paneel.

---

## Bronnen

- **Primair:** de CSS- en i18n-bundels van `nova.inspace.io` en `app.inspace.io`, opgehaald op
  6 augustus 2026. De `--ds-*`-tokens, de radiusschaal, de randdiktes en de ene schaduw komen daar
  letterlijk uit. De volledige ontleding van die apps is samengevat in `logbook.md` §29 en §30
- **Historisch (bijlage A):** `inspace.io` homepage plus inline stijlblokken, `main-*.css` en
  `inspace-navbar.css`, juli 2026
