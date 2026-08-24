# Design System

> **Bron: de NOVA-workspace van InSpace** (`nova.inspace.io`), hun ingelogde productomgeving,
> geanalyseerd op 6 augustus 2026 uit de CSS-bundel en de i18n-bundel van de app.
> **Peildatum van dit document: 6 augustus 2026**, met §6b (iconen) toegevoegd op 21 augustus
> 2026 en de kleuruitzondering voor de zijbalkkoppen op 24 augustus 2026. De code is leidend; wijkt `app/globals.css` af, dan is dit document fout en moet het
> bijgewerkt worden.

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

| Token | Waarde | Waarvoor |
|---|---|---|
| `--bg-base` | `#f8fafc` | De pagina |
| `--bg-surface` | `#ffffff` | Kaarten |
| `--bg-elevated` | `#e7edf2` | Geneste vlakken, tabelkoppen, neutrale chips |
| `--bg-surface-2` | `#dce3ea` | Een tint dieper, hover op een genest vlak |
| `--text-primary` | `#17212b` | Blauwzwart, niet zwart |
| `--text-secondary` | `#43505d` | Lopende tekst die niet de kop is. 7,5:1 |
| `--text-muted` | `#788795` | **Alleen bijzaak.** 3,7:1, dus nooit bodytekst |
| `--border-subtle` | `#e7edf2` | De standaardrand |
| `--border-strong` | `#c2ccd6` | Invoervelden, hover op een kaart |
| `--border-contrast` | `#9daab6` | Alleen waar een rand echt moet spreken |

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

**Twee dingen zijn hier bijgetrokken.** Het groen was `#2e9e50`, dat van hun marketingsite; het is nu
`#37941c`, dat van hun product. Die twee verschillen zichtbaar zodra ze naast elkaar staan. En de
gradient stond op accentwoorden in koppen; in de Nova-werkomgeving komt hij nul keer voor, dus hij is
teruggebracht tot het woordmerk. Eén plek is genoeg om herkenbaar te zijn, overal is een
landingspagina.

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
| `intelligence` | Het merk, AI, de primaire actie | `#8511d9` | `#8511d9` | `#faf4ff` | `#e9d1ff` |
| `growth` | Gelukt, gestegen, gepubliceerd | `#37941c` | `#2c711a` | `#effce9` | `#b9efa3` |
| `information` | Een mededeling, een toelichting | `#0084d1` | `#0069a8` | `#f0f9ff` | `#b8e6fe` |
| `warning` | Kijk hier even naar | `#e17100` | `#bb4d00` | `#fffbeb` | `#fee685` |
| `attention` | Vraagt een keuze, is niet fout | `#e60076` | `#c6005c` | `#fdf2f8` | `#fccee8` |
| `danger` | Blokkade, mislukt, onomkeerbaar | `#e7000b` | `#c10007` | `#fef2f2` | `#ffc9c9` |
| `premium` | Betaald, hoogste plan | `#9f7d57` | `#84664a` | `#f9f7f3` | `#e2dac6` |
| `neutral` | Uit, niet van toepassing | , | `--text-muted` | `--bg-elevated` | `--border-subtle` |

**Elke `-text` haalt op wit minstens 5,0:1**, ruim boven de drempel van 4,5. Dat was voor de overstap
op twee plekken niet zo.

**Waarom `-text` los van `-solid` bestaat:** `#37941c` als tekst op wit haalt de drempel niet, en dat
was de kleur waarin "gelukt" stond. De donkere variant wel.
**Waarom `-on-solid` bestaat:** op `--accent-green` (lichtmint) moet donkere tekst en op het merkpaars
witte. Dat was hiervoor per component een beoordeling.

**Eén bewuste afwijking van Nova.** Zij kennen twee paarse standen, `#9e21fc` en `#8511d9`, en
gebruiken de lichte als solide vlak. Wij nemen de donkere: wit op `#9e21fc` haalt 4,0:1 en zakt
daarmee onder de drempel voor knoptekst, wit op `#8511d9` haalt 5,4:1. Bij hen is de lichte stand te
verdedigen omdat dezelfde token ook in donkere modus dienstdoet; wij hebben alleen licht.

---

## 3. Typografie

**Geist Sans en Geist Mono**, het paar dat Nova zelf gebruikt. Mono was JetBrains Mono: twee families
van twee makers naast elkaar is precies het soort verschil dat je niet ziet maar wel voelt.

| Waar | Wat |
|---|---|
| Alles | `--font-sans` |
| Cijfers die je vergelijkt | `--font-mono` via `.stat-value`, met `tabular-nums` |
| Kickers boven een titel | `.mono-label`: sans, 11px, uppercase, `.08em`, gewicht 600 |
| Code en URL's | `--font-mono` |

**De grootste typografische wijziging is dat mono niet langer de standaard is voor labels.** De oude
stijl zette elk paneelkopje in mono, uppercase, met `.14em` tracking. Dat is de "technische
read-out"-esthetiek van de marketingsite. Nova gebruikt dat patroon alleen als kicker boven een titel
("YOUR BRAND"), en verder gewoon sans. `.mono-label` heet nog zo omdat hij op tientallen plekken
gebruikt wordt, maar hij ís nu sans. **Hernoem hem niet in een losse commit;** dat raakt te veel
bestanden tegelijk voor een naamswijziging.

Koppen zijn een stap kleiner geworden. Een `text-4xl` in een menu en een `text-3xl` boven een
hoofdstuk zijn marketingformaten; het product zit op `text-2xl` en lager.

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
| `--radius-xl` | 16px | Grote panelen, dialogen |
| `--radius-pill` | 9999px | **Alleen chips, badges en voortgangsbalken** |

**De pil is niet langer de standaard.** Dat is de meest zichtbare enkele wijziging van deze omzetting.
De oude regel luidde "interactieve elementen zijn pilvormig"; dat is de marketingsite. In de
Nova-werkomgeving is de pil voorbehouden aan chips en badges, en krijgen knoppen `--radius-md`.

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

**De enige uitzondering is focus, en die is functioneel.** `:focus-visible` krijgt een 2px omlijning
in de merkkleur en een veld krijgt bij focus een ring van 3px. Zonder zichtbare focus is de app niet
met een toetsenbord te bedienen. Dat is toegankelijkheid, geen sier.

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

---

## 6. Motion

Eén easing overal: `--ease-standard: cubic-bezier(.2,.7,.2,1)`.

De duur ging omlaag naar 0,12s (`fast`), 0,18s (`base`) en 0,3s (`slow`). Nova's product beweegt
korter dan hun marketingsite, en 0,3s voelt in een dashboard traag.

`prefers-reduced-motion` zet alle transities op 0,01ms en haalt de pulsering en de laadsweep weg.

---

## 6b. Iconen

**Toegevoegd 21 augustus 2026.** De set is [Lucide](https://lucide.dev) (ISC-licentie, gratis),
via `lucide-react`. De keuze per betekenis staat in `lib/icons.ts` (27 betekenissen), het omhulsel
dat maat en lijndikte vastzet in `components/icon.tsx`.

⚠️ **Waar een icoon wél en niet komt.** De zes hoofdstukken van de zijbalk hebben er een, de
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
| Kleur | `currentColor`, met één uitzondering | Het icoon kleurt mee met de tekst ernaast. Nooit een eigen tint, want dan omzeilt het de betekenislaag van §2.3. **De uitzondering, 24 augustus 2026: de zes koppen van de zijbalk staan in `--accent-purple`.** Zes tekeningen in de hele balk, precies de zes vaste plekken van de app, en één merkkleur die ze aan elkaar bindt. De kleur staat op de ouder, dus `Icon` zelf erft nog steeds `currentColor` en de regel blijft afdwingbaar |

### 6b.3 De vier regels

1. **Een icoon staat nooit alleen.** Overal staat het label ernaast, dus het icoon versnelt het
   terugvinden en draagt de betekenis niet. Vandaar `aria-hidden`. Staat een icoon écht alleen (het
   hamburgermenu, het sluitkruis), dan hoort het label als `aria-label` op de knop.
2. **Eén betekenis, één icoon.** `lib/icons.ts` is de enige plek waar een betekenis aan een
   tekening gekoppeld wordt. Rechtstreeks `import { Check } from "lucide-react"` in een component
   zet de tweede kopie van een keuze neer, en twee kopieën lopen uit elkaar.
3. **De naam is de betekenis, niet de tekening.** `strategie`, niet `waypoints`. Verandert de
   tekening, dan is dat één regel in `lib/icons.ts`.
4. **In de zijbalk draagt alleen de kop een icoon.** De bestemmingen eronder niet. Het icoon van de
   kop moet het verschil dragen tussen "dit is een van de zes vaste plekken in de app" en "dit is
   een pagina daarbinnen", en dat verschil verdwijnt zodra beide er een hebben: als alles opvalt,
   valt niets op. De bestemming springt al in tot ónder de tekst van zijn kop, en dat zegt genoeg.
   (Tot 24 augustus 2026 stond daar ook een verticale lijn; die is weg omdat de uitlijning het
   kindschap al draagt, zie `ux-design.md` §5.) `NavItem` in `lib/nav.ts` heeft daarom geen
   icoonveld, en `scripts/test-unit.ts` bewaakt dat.

### 6b.4 Wat de set níet doet

Geen glittertje bij alles wat AI aanraakt, geen brein, geen robot, geen tandwiel voor instellingen.
Dat zijn de clichés die §15.4 van `merkstrategie.md` bij naam verbiedt. Instellingen krijgt daarom
schuifjes, want dat is wat je er doet: afstellen. En de set is klein gehouden: 27 betekenissen, niet
1.600. Een icoon dat niets aanwijst is versiering, en dat is precies wat §15.3 niet vraagt.

---

## 7. De primitieven

Gebruik deze, nooit een eigen tint of een eigen maat.

| Primitief | Regel |
|---|---|
| `.card` | Wit, één rand, **plat**. Geen schaduw, geen hover |
| `.card-interactive` | Alleen op wat écht klikbaar is. Krijgt de rand-plus-schaduw bij hover |
| `.card-accent` / `-success` / `-warning` / `-danger` | Getinte kaartrand, uit de betekenislaag |
| `.btn-primary` / `.btn-outline` | Beide 40px, `--radius-md`. `.btn-sm` is 32px |
| `.chip` + `-success` / `-danger` / `-warning` / `-info` / `-attention` / `-neutral` | Pilvormig, sans, schrijftaal. Nooit met de hand een tint nabouwen |
| `.mono-label` | De kicker boven een titel. Sans, uppercase, klein |
| `.stat-value` | Cijfers die je vergelijkt, in mono met `tabular-nums` |
| `.field` | Wit met een rand, 40px, focusring |
| `.live-dot` | Pulserend, in `growth`. "Loopt nu" |
| `.skeleton` | Laadvlak. De vorm van wat er komt |
| `.prose` | Lange tekst: rapport, contentpagina |
| `.brand-gradient-text` | **Alleen het woordmerk ORBIT ENGINE** |
| `Icon` | Het enige icoon-component. `<Icon naam="klaar" />`, nooit een los teken en nooit een eigen SVG. Zie §6b |
| `PageHeader`, `EmptyState`, `Narrow`, `ConfidenceChip` | Eén variant per patroon |

---

## 8. De negen regels

1. **Een kleur heeft een betekenis, geen naam.** `--intent-growth-text`, nooit `--accent-green`, en
   nooit een hexwaarde of rauwe `rgba()` in een component. Zie §11 voor de controle.
2. **Plat, niet gloeiend.** Rand en vlak dragen de hiërarchie. De ene schaduw is voor wat zweeft.
3. **De pil is voor chips.** Knoppen, velden en navigatie krijgen `--radius-md`.
4. **Status is kleur plus vorm, nooit kleur alleen.** Een dot, een pijl, een chip met tekst.
5. **Mono is voor cijfers**, niet voor labels. De kicker is sans.
6. **Contrast is een tokenkeuze.** Gebruik `-text` op licht en `-on-solid` op gevuld, en vertrouw
   `--text-muted` nooit voor iets wat gelezen moet worden.
7. **Eén easing, korte duur.**
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
| Hun lichte paars als solide vlak | **Nee** | Haalt de contrastdrempel niet, zie §2.3 |
| Licht- en donkerparen | **Nee, nog niet** | Zie §10 |
| Hun negen radii | **Nee** | Zes volstaan |
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

**Twee van die drie zijn geen probleem.** De app ís al neutral-first (`#f8fafc` grond, `#17212b`
tekst), en kleur draagt hier al betekenis in plaats van een naam (§2). De gloed en de gradient zijn
allebei al teruggebracht tot één plek elk: de grafiekband en het woordmerk.

**Wat wél botst is de herkomst.** Zolang de tokens, de radiusschaal, de randdiktes en de ene
schaduw letterlijk uit het product van de concurrent komen, werkt de vormgeving tegen het verhaal
dat de verkoop vertelt. Dat is nooit als besluit genomen. Het is geslopen: van een praktische keuze
op 6 augustus naar het fundament van het hele uiterlijk.

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

---

## 10. Donkere modus: geschrapt

**Besluit 17, 11 augustus 2026.** Niet uitgesteld maar geschrapt; hij staat nergens meer op een lijst.
`globals.css` kent alleen `:root` en `[data-theme="light"]`, en `html { color-scheme: light; }` staat
vast. Dat blijft zo.

De redenering: het `:root`-blok heeft 107 kleur-tokens, en die hebben elk een doordachte tegenhanger
nodig. Mechanisch omkeren geeft grijze modder, en het resultaat is pas te beoordelen door elk scherm
in beide standen naast elkaar te leggen. Dat is een dag werk plus een designronde, voor de enige fase
in het plan met impact "laag", bij een product dat sales-led in een demogesprek verkocht wordt en dus
altijd op één scherm in één stand getoond wordt.

De tokennamen blijven wél ingericht op twee standen: elke betekenis heeft een `-solid`, `-text`,
`-surface` en `-border`. Dat is geen voorbereiding op een donkere modus maar gewoon een betere
naamgeving; hij houdt de betekenis los van de kleur. Zou het besluit ooit terugkomen, dan is het
een tweede blok met dezelfde namen, en Nova's donkere neutralen staan hieronder genoteerd zodat
niemand ze opnieuw hoeft af te leiden. Dat is geen belofte, alleen archief.

```
achtergrond   #121a22  →  #17212b  →  #27323d  →  #43505d
tekst         #ffffff  ·  #c2ccd6  ·  #788795
randen        #27323d  ·  #43505d  ·  #788795
accenten      paars #ad45ff · groen #4cb929 · blauw #00a6f4 · oranje #fe9a00 · rood #fb2c36
```

---

## 11. Controle vóór een commit

Beide moeten **nul regels** geven, en **op `.ts` én `.tsx`**, niet alleen op componenten:

```bash
grep -rnE "#[0-9a-fA-F]{6}\b" app components lib --include="*.tsx" --include="*.ts" \
  | grep -v themeColor | grep -v "lib/email/"
grep -rnE "rgba?\([0-9]" app components lib --include="*.tsx" --include="*.ts" \
  | grep -v "lib/email/"
```

Twee uitzonderingen: `themeColor` in `app/layout.tsx` (de browserbalk van het besturingssysteem
kan geen CSS-variabele zijn) en `lib/email/*.ts` (HTML voor e-mailclients, die begrijpen geen
`var(--...)`).

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
