# Design System

**Bron: OKX** (`okx.com`), hun `okd`-tokensysteem, gemeten op 17 september 2026 uit de gecompileerde
CSS van hun webapp. **Peildatum van dit document: 21 september 2026**, na afronding van de volledige
OKX-omzetting (stap 1 tot en met 10 van de herontwerpronde die op 17 september begon).

Dit document beschrijft **hoe ORBIT ENGINE eruitziet en waarom**. Voor de tekst in die schermen geldt
`schrijfstijl.md`, voor de opbouw van schermen `ux-design.md`, voor het waarom achter beslissingen
`logbook.md`.

**De regel blijft: de code is leidend.** Wijkt `app/globals.css` af van wat hier staat, dan is dit
document fout en moet het bijgewerkt worden. Elke waarde hieronder is nagerekend tegen het bestand
zelf op de peildatum hierboven.

---

## 1. Het uitgangspunt: waarom OKX en niet meer Nova

Tot 17 september 2026 was dit document gebaseerd op InSpace Nova's werkomgeving. Dat leverde een
koel, plat productgevoel op, en was zelf al een omzetting van een eerdere basis (InSpace's
marketingsite). Nova blijft in dit document staan als afgesloten geschiedenis in **bijlage A**: de
overwegingen van augustus 2026 waren juist voor dat moment en het is de moeite waard om te kunnen
navertellen waarom de app er tussentijds zo uitzag.

**Waarom een tweede omzetting nodig was**, staat uitgeschreven in `docs/logbook.md` bij de datum van
17 september 2026: Nova bleek zelf een variant van een generiek design-systeem (Radix/shadcn), en
een variant van een variant is geen sterk visueel fundament. OKX is zelf gemeten (niet uit
schermafbeeldingen, maar uit hun eigen gecompileerde CSS) en is verder van generieke component-
bibliotheken af: een neutrale, zwart-witte basis met precies één accentkleur, en een dichtheid die
past bij een dashboard waar iemand elke week in werkt.

**De open vraag van augustus, of het uiterlijk ooit eigen moet worden van Outer Orbit in plaats van
afgeleid**, staat nog steeds open. Zie §9b.

---

## 2. Kleur

De hele schaal is neutraal grijs, geen blauwzweem. `--text-primary` is `#000000` in de lichte stand
en `#ffffff` in de donkere, geen `#17212b` blauwzwart zoals bij Nova.

### 2.1 Oppervlakken

| Token | Licht | Donker | Waarvoor |
|---|---|---|---|
| `--bg-base` | `#f6f6f6` | `#000000` | De pagina |
| `--bg-layer-1` | `#ffffff` | `#121212` | De werkruimte naast de zijbalk |
| `--bg-surface` | `#ffffff` | `#171717` | Kaart, menu, dialoog |
| `--bg-surface-raised` | `#f3f3f3` | `#1d1d1d` | Tabelrij bij hover, genest vlak |
| `--bg-layer-2` | `#e9e9e9` | `#2c2c2c` | Chip, voortgangsbaan, tabelkop |
| `--bg-layer-3` | `#dcdcdc` | `#3f3f3f` | Een stap dieper, zelden nodig |
| `--bg-elevated-contrast` | `#ffffff` | `#343434` | Dialoogvenster boven het scrim |
| `--bg-disabled` | `#fafafa` | `#0e0e0e` | Uitgeschakeld oppervlak |
| `--bg-inverse` | `#000000` | `#ffffff` | Omgekeerd vlak |
| `--bg-scrim` | `rgba(0,0,0,.43)` | `rgba(0,0,0,.68)` | Achter een dialoog |

**In de lichte stand vallen pagina en kaart niet meer samen**, en dat is de belangrijkste asymmetrie
ten opzichte van hoe het bij Nova werkte. `--bg-base` (`#f6f6f6`) en `--bg-surface` (`#ffffff`) zijn
twee echte stappen: de kaart hoeft niet meer alleen van zijn rand te leven om zich van de grond te
onderscheiden. In de donkere stand is het verschil nog groter: de pagina is echt zwart (`#000000`)
en de kaart ligt daar twee stappen boven, OKX' eigen `surface-structural-web-only-base` tegenover
`-elevated-default`.

### 2.2 Tekst

| Token | Licht | Donker | Waarvoor | Contrast op de grond |
|---|---|---|---|---|
| `--text-primary` | `#000000` | `#ffffff` | Koppen, waarden | 21:1 |
| `--text-secondary` | `#383838` | `#e6e6e6` | Bodytekst | 16,8:1 donker |
| `--text-tertiary` | `#5b5b5b` | `#b3b3b3` | Labels, bijschrift | 10,0:1 donker |
| `--text-subtle` | `#5e5e5e` | `#969696` | Bijzaak | 7,1:1 donker |
| `--text-subtler` | `#858585` | `#636363` | Randgeval, **nooit bodytekst** | 3,5 à 4,0:1 |
| `--text-disabled` | `#b3b3b3` | `#5b5b5b` | Uitgeschakeld | |
| `--text-placeholder` | `rgba(0,0,0,.22)` | `hsla(0,0%,100%,.3)` | Tijdelijke tekst in een veld | |
| `--text-inverse` | `#ffffff` | `#000000` | Op een gevuld vlak | |

**Vijf niveaus, geen drie.** Nova's oude drieslag (`primary`/`secondary`/`muted`) had een gat:
`muted` haalde maar 3,7:1 en was dus eigenlijk nooit bruikbaar als bodytekst. Met vijf niveaus is er
een bruikbare trede tussen bodytekst en wat echt bijzaak is. `--text-subtler` is de enige token met
een contrastwaarschuwing in de code zelf: prima voor een rand of een tijdstempel, te weinig om een
zin te dragen die iemand moet lezen.

### 2.3 Randen

| Token | Licht | Donker | Waarvoor |
|---|---|---|---|
| `--border-subtle` | `rgba(0,0,0,.06)` | `hsla(0,0%,100%,.13)` | Scheidingslijn in een kaart |
| `--border-default` | `rgba(0,0,0,.14)` | `hsla(0,0%,100%,.22)` | De gewone rand |
| `--border-strong` | `rgba(0,0,0,.32)` | `hsla(0,0%,100%,.4)` | Interactieve rand, hover |
| `--border-primary` | `#e6e6e6` | `#383838` | De kaartrand, dekkend |
| `--border-emphasis` | `#4a4a4a` | `#b8b8b8` | De rand die moet spreken |
| `--border-selected` | `#000000` | `#ffffff` | Geselecteerd |
| `--border-focus` | `#000000` | `#ffffff` | De focusring |
| `--line-muted` | `#ebebeb` | `#2e2e2e` | Tabelrijscheiding |
| `--line-secondary` | `#dbdbdb` | `#404040` | Zwaardere scheiding |

**Twee soorten naast elkaar, en dat is opzet.** De alfa-randen (`rgba`/`hsla`) werken op elke
ondergrond zonder aparte variant, dus die zijn de standaard. De dekkende randen (`--border-primary`,
`#e6e6e6`/`#383838`) zijn er specifiek voor de kaart: die ligt nooit op iets gekleurds, dus de
dekkende variant kan daar en is rustiger dan een doorschijnende.

### 2.4 Het accent

| Token | Donker | Licht |
|---|---|---|
| `--accent` | `#bcff2f` | `#2b6d17` |
| `--accent-hover` | `#9ce207` | `#225812` |
| `--accent-pressed` | `#87c600` | `#18400c` |
| `--accent-on` | `#000000` | `#ffffff` |
| `--accent-highlight` | `#bcff2f` (beide standen) | |
| `--accent-highlight-on` | `#000000` (beide standen) | |

**Besluit van de eigenaar, 17 september 2026: het limoen van OKX is letterlijk overgenomen**, niet
vertaald naar een eigen merkkleur. In de donkere stand is het accent limoen; in de **lichte** stand
is het geen limoen maar donkergroen (`#2b6d17`), precies zoals OKX het zelf doet. Limoen op wit
haalt 1,2:1 en is onleesbaar; OKX lost dat op door in het licht een donkere variant van dezelfde
betekenis te tonen, en `--accent-highlight` te bewaren voor een vlak waar zwarte tekst op komt (bijv.
`.chip-attention`).

**Waar het accent wél komt, en nergens anders:**

- De primaire actie op een scherm (`.btn-accent`), hooguit één per scherm
- De actieve staat in de navigatie, als streep, niet als vulling
- De eigen merklijn in een grafiek (`--chart-1`)
- De linkerrand van een kaart die om een handeling vraagt (`.card-rail-accent`, §5.5)
- Het label "kans" in de concurrentenanalyse en vergelijkbare AI-uitkomsten (`.chip-attention`)

**Waar het niet komt:** niet op koppen, niet op links in lopende tekst, niet als achtergrond van een
sectie, niet op meer dan ongeveer 1% van het zichtbare oppervlak. Dat percentage komt uit de gemeten
CSS van OKX zelf en is de reden dat de kleur werkt: zodra elke knop of elk vlak limoen is, betekent
limoen niets meer.

**Wat dit besluit openlaat.** Het beantwoordt niet de vraag of het uiterlijk ooit een eigen merklaag
van Outer Orbit moet worden; het stelt hem uit. Zie §9b.

### 2.4a Actieknoppen

| Token | Waarde (beide standen) |
|---|---|
| `--action-button` | `#25a750` |
| `--action-button-hover` | `#1f8e44` |
| `--action-button-pressed` | `#187538` |
| `--action-button-on` | `#ffffff` |

**Besluit van de eigenaar, 21 september 2026.** Het accent (§2.4) is voor de ÉÉN hoofdactie van een
scherm en verschijnt daarom hooguit één keer. Een clusterlijst met tien voorgestelde onderwerpen
heeft tien gelijkwaardige "start dit"-knoppen tegelijk op het scherm, en dat past niet bij die regel.
`.btn-actie` is de eigen kleur voor precies dat geval: elke knop die een cluster of onderwerp start
("Nieuwe cluster", "Cluster starten", "Starten met deze verdeling"). Vast `#25a750` in beide standen,
geen aparte donkere variant zoals `--accent` die wel heeft: dit groen is een eigen, herkenbare kleur
en geen accentvervanging.

### 2.5 De betekenislaag: vier, niet zeven

Nova had zeven betekenissen (`intelligence`, `growth`, `information`, `warning`, `attention`,
`danger`, `premium`), elk met vijf tokens. OKX heeft er vier, en de vertaling is doorgevoerd in
stap 10 (§10.5 van de afgeronde herontwerpronde, samengevat hier):

| Nu | Was bij Nova | Toelichting |
|---|---|---|
| `accent` | `intelligence` (paars) | Wat van de AI komt, krijgt de accentkleur |
| `trend-up` / `trend-down` | `growth` (groen) | Dit is richting, geen betekenis, zie §2.6 |
| `intent-info` (grijs) | `information` (blauw) | Informatie is neutraal bij OKX, geen kleur |
| `intent-warning` | `warning` (oranje) | Blijft |
| `accent` | `attention` (roze) | Eén gebruiksplek (het label "kans"): een kans is iets om op te klikken, geen waarschuwing |
| `intent-danger` | `danger` (rood) | Blijft |
| **weg** | `premium` (bruin) | Nul gebruikers, geteld. Dode code, verwijderd |

| Token | Donker | Licht |
|---|---|---|
| `--intent-success-content` | `#49a92d` | `#2b6d17` |
| `--intent-success-surface` | `#192400` | `#e9f4d1` |
| `--intent-success-solid` | `#3c8f24` | `#3c8f24` |
| `--intent-warning-content` | `#ffc452` | `#ba5d00` |
| `--intent-warning-surface` | `#4d3200` | `#ffedcb` |
| `--intent-warning-solid` | `#f5a915` | `#fea01d` |
| `--intent-danger-content` | `#f57a8a` | `#ba2133` |
| `--intent-danger-surface` | `#420a10` | `#fee0e3` |
| `--intent-danger-solid` | `#f5384f` | `#e05a6a` |
| `--intent-info-content` | `#ebebeb` | `#212121` |
| `--intent-info-surface` | `#121212` | `#f6f6f6` |
| `--intent-info-solid` | `#4a4a4a` | `#4a4a4a` |

De oude namen (`--intent-growth-*`, `--intent-information-*`, `--intent-intelligence-*`,
`--intent-attention-*`) blijven als alias in `app/globals.css` staan zodat bestaand gebruik niet
breekt, maar wijzen nu allemaal naar de tokens hierboven of naar `--accent`/`--trend-up`. **Gebruik in
nieuw werk de nieuwe namen**, niet de aliassen.

### 2.6 Stijging en daling

De belangrijkste toevoeging voor ORBIT ENGINE, want zichtbaarheid die stijgt of daalt is de kern van
het product.

| Token | Donker | Licht |
|---|---|---|
| `--trend-up` | `#25a750` | `#31bd65` |
| `--trend-up-text` | `#1d7a3f`* | leesbaar groen op wit |
| `--trend-up-surface` | `#071c0f` | `#e0f5e8` |
| `--trend-up-tint` | `rgba(37,167,80,.2)` | `rgba(49,189,101,.2)` |
| `--trend-down` | `#ca3f64` | `#eb4b6d` |
| `--trend-down-text` | `#c22a48`* | leesbaar rood op wit |
| `--trend-down-surface` | `#230b10` | `#fce4e9` |
| `--trend-down-tint` | `rgba(202,63,100,.2)` | `rgba(235,75,109,.2)` |
| `--trend-flat` | `#b8b8b8` | `#5e5e5e` |

`*` `-text` is een eigen toevoeging naast OKX' `-solid`/`-surface`/`-tint`: nodig omdat `--trend-up`
als tekst op wit de leesbaarheidsdrempel niet altijd haalt. Zie §5.6 (de stang op een kaart) en
`components/version-diff.tsx` voor waar dat verschil zichtbaar wordt.

**Deze zijn bewust niet gelijk aan succes en fout.** Een dalende zichtbaarheid is geen foutmelding,
en OKX houdt de twee paren consequent gescheiden.

### 2.7 Grafiek

| Reeks | Donker | Licht |
|---|---|---|
| 1 (eigen merk) | `#bcff2f` | `#2b6d17` |
| 2 | `#277ae7` | `#0b5bcb` |
| 3 | `#ffb729` | `#e28400` |
| 4 | `#edc746` | `#dbb01d` |
| 5 | `#a352ef` | `#a352ef` |
| 6 | `#969696` | `#5e5e5e` |
| 7 | `#636363` | `#858585` |
| 8 | `#454545` | `#afafaf` |

Acht reeksen (was zes bij Nova). De laatste drie zijn grijs: je eigen merk krijgt de accentkleur, de
belangrijkste concurrenten krijgen kleur, de rest wordt grijs. Reeks 5 is in beide standen gelijk.
`--chart-grid` wijst naar `--line-muted`, `--chart-axis` naar `--text-subtle`.

> ⚠️ **Openstaand, ongewijzigd sinds de Nova-periode:** de reeksen zijn niet opnieuw gevalideerd op
> kleurenblindheid na deze tweede overstap. Zolang dat niet gemeten is, geldt onverkort: **elke lijn
> draagt een naam aan het uiteinde en er staat een tabel onder.** Identiteit leunt nooit alleen op
> kleur.

### 2.8 Interactie

Het patroon dat de hele interface bij elkaar houdt: vijf staten, twee standen.

| Staat | Donker | Licht |
|---|---|---|
| Rust | transparant | transparant |
| Hover | `hsla(0,0%,100%,.13)` | `rgba(0,0,0,.06)` |
| Actief | `hsla(0,0%,100%,.16)` | `rgba(0,0,0,.09)` |
| Ingedrukt | `hsla(0,0%,100%,.22)` | `rgba(0,0,0,.14)` |
| Uitgeschakeld | `hsla(0,0%,100%,.08)` | `rgba(0,0,0,.03)` |
| Geselecteerd | wit vlak, zwarte tekst | zwart vlak, witte tekst |

Op een gekleurd vlak draait het om: hover is dan `hsla(0,0%,100%,.15)` in donker en
`hsla(0,0%,100%,.7)` in licht (`--interactive-oncolor-hover`).

---

## 3. Typografie

### 3.1 Het lettertype

**Archivo**, niet OKX Sans zelf (commercieel gelicentieerd, niet overneembaar) en niet meer Geist
Sans (Nova's letter). Acht vrije kandidaten zijn met fontTools gemeten tegen OKX Sans' eigen
metingen (x-hoogte, kapitaalhoogte, cijferbreedte); Archivo kwam op 2,2% gemiddelde afwijking, het
dichtst bij zonder de geometrische `g` en brede ronde vormen van de winnaar op cijfers (Manrope), die
niet bij een neo-grotesk als OKX Sans past.

```css
--font-sans: "Archivo", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
--font-mono: "Geist Mono", ui-monospace, SFMono-Regular, monospace;
```

Geist Mono blijft voor wat écht monospace moet zijn: een URL, een stuk code. **Niet meer voor
labels** (zie 3.3): dat was Nova's stijl, OKX staat in één familie.

**Cijfers zijn expliciet tabulair.** Archivo is dat niet van huis uit (OKX Sans wel: `zero` en `one`
meten daar allebei 600 eenheden). Zonder de regel hieronder springt een kolom zodra een cijfer
verandert.

```css
.stat-value, .tabular, td, .field-number { font-variant-numeric: tabular-nums; }
```

### 3.2 De schaal

| Klasse | Maat/regelhoogte | Gewicht | Waarvoor |
|---|---|---|---|
| `.type-hero` | 36/47,5px | 600 | Paginakop van een hoofdscherm (marketing/404-achtig; zeldzaam) |
| `.type-heading-lg` | 30/40px | 500 | De kop van elke pagina (`PageHeader`, 34 schermen), en de inlogroute |
| `.type-title` | 24/30px | 500 | De kop van een dialoog of een kaart |
| `.type-section` | 18/24px | 500 | De kop boven een blok |
| `.type-lead` / `.type-label` | 12/15px | 500 | Kleinste label, kapitalen, 0,04em spatiëring |
| `.type-body` | 16/24px | 400 | Lopende tekst |
| `.type-body-emphasis` | 16/24px | 500 | Nadruk **binnen** lopende tekst |
| `.type-compact` | 14/21px | 400 | Lopende tekst in een kaart |
| `.type-compact-emphasis` | 14/21px | 500 | Nadruk daarbinnen |
| `.type-caption` | 12/18px | 400 | Bijschrift, tijdstempel |
| `.type-caption-emphasis` | 12/18px | 500 | Bijschrift dat een waarde draagt |

**Twee dingen die de hele app anders laten voelen dan bij Nova:**

1. **"Vet" is gewicht 500, niet 600 of 700.** OKX gebruikt nergens 600 of 700 binnen een regel;
   alleen `.type-hero` (zeldzaam) gaat naar 600. `.stat-value` ging in deze ronde van 700 naar 500:
   bij OKX doet de **maat** het werk van een hoofdgetal, niet het gewicht.
2. **De regelhoogte is exact anderhalf keer de maat.** 14 op 21, 12 op 18, 16 op 24. Bij Nova stond
   14 op 20 en 12 op 16; dat gaf minder lucht.

**Mono is uit de labels, en dat is een terugdraai van de terugdraai.** Nova gebruikte mono met brede
letterspatiëring voor `.type-lead`/`.type-label`, en dat klopte met hún productstijl. OKX doet het
niet: hun hele interface staat in één familie (`--font-sans`), en cijfers krijgen de tabulaire
variant van diezelfde letter. `.mono-label` heet nog naar zijn Nova-herkomst maar rendert sinds deze
omzetting in Archivo, niet in mono; hernoemen raakt te veel bestanden voor een naamswijziging alleen.

⚠️ **Gebruik de `.type-*`-klassen en niet Tailwinds kale `text-*`-maten voor nieuw werk.** Het
tokenblok `@theme inline` in `app/globals.css` koppelt Tailwinds `text-*`-utilities aan dezelfde
schaal (`--text-xs` tot `--text-5xl`), dus een kale `text-sm` levert wel hetzelfde beeld op, maar een
`.type-*`-klasse koppelt daarnaast ook het juiste gewicht en de juiste regelhoogte in één stap.

---

## 4. Ruimte

GEMETEN uit OKX' paddings: 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 48, op een basis van 4 pixels.

```
--space-1:   4px      pictogram tot tekst in een dichte regel
--space-2:   8px      pictogram tot tekst, standaard
--space-3:  12px      binnen een chip, tussen label en waarde
--space-4:  16px      kaartpadding compact, tussen velden
--space-5:  20px      kaartpadding vanaf 768px
--space-6:  24px      kaartpadding vanaf 1024px, dialoogpadding
--space-8:  32px      tussen secties
--space-12: 48px      tussen hoofdblokken
--space-16: 64px      boven een paginakop
```

**De kaartpadding schaalt zelf mee met het scherm** (`.card` in `app/globals.css`): 16px op mobiel,
20px vanaf 768px, 24px vanaf 1024px. Dat is het enige wat aan een kaart responsief is.

---

## 5. Vorm en diepte

### 5.1 Radii

```
--radius-sm:    2px     tekstmarkeringen
--radius-md:    4px     knop rechthoekig, chip, badge, invoerveld, navigatie-item
--radius-lg:    6px
--radius-xl:    8px     kaart, menu, selectiechip
--radius-xxl:  10px
--radius-xxxl: 12px     dialoog, grote datakaart
--radius-pill: 60px     knop standaard
```

Dit is OKX' hele schaal: niets ronder dan 12px behalve de pil. De kaart ging van Nova's 12px naar
8px. **De knop is weer een pil** (`--radius-pill`, 60px en geen `9999px`): bij Nova was de knop
rechthoekig gemaakt met het argument dat de pil van InSpace's marketingsite kwam; bij OKX is het
omgekeerd, hun hele productomgeving gebruikt de pil voor de standaardknop en alleen hun expliciete
`rect`-variant is rechthoekig (`.btn-rect`, `--radius-md` of, in de maten lg/xl, `--radius-xl`).

### 5.2 Randdikte

```
--border-width-xs:  1px    overal
--border-width-sm:  2px    focusring, geselecteerde staat, de stang op een kaart
--border-width-md:  4px    zelden, was de oude stangdikte
```

OKX zelf kent maar twee diktes (1 en 1,5); ORBIT ENGINE hield voor de bestaande "stang op een kaart"
en de focusring een tussenmaat aan, allemaal dunner dan de 4px die er bij Nova stond.

### 5.3 Schaduw

**Drie schaduwstanden, en alleen boven het scrim.**

```css
--shadow-sm: 0 1px 2px 0 rgba(0,0,0,.05);
--shadow-lg: 0 10px 15px -3px rgba(0,0,0,.1), 0 4px 6px -2px rgba(0,0,0,.05);
--shadow-xl: 0 20px 25px -5px rgba(0,0,0,.1), 0 10px 10px -5px rgba(0,0,0,.04);
```

**Een kaart heeft geen schaduw, alleen een rand.** Dat is het grootste verschil met de Nova-periode:
`.card` droeg toen een `--glass-shadow` en een doorschijnende vulling met `backdrop-filter`. Beide
zijn weg. Bij OKX komt de diepte van de kleur van een vlak tegenover de grond eronder (mogelijk sinds
§2.1 pagina en kaart echt uit elkaar trok), niet van een effect erop. `--shadow-xl` is voorbehouden
aan wat boven het scrim zweeft: dialoog, toast, menu.

**Geen `transform` op hover.** Geen `translateY`, geen `scale`. Bij OKX beweegt er niets bij een
hover, alleen de kleur verandert (`.card-interactive`, §7).

### 5.4 Maatvoering

| Element | Was (Nova) | Nu (OKX) |
|---|---|---|
| Knop, standaard | 40px | **40px**, ongewijzigd, toevallig gelijk aan OKX' eigen `md` |
| Knop sm / lg | 32px / 44px | **36px / 48px**, BEREKEND uit OKX' eigen opgaven |
| Invoerveld | 40px | **40px**, ongewijzigd |
| Invoerveld groot (`.field-lg`) | bestond niet | **48px**, tot nu toe alleen op de inlogroute |
| Kaartpadding | 20px vast | **16/20/24px**, schaalt met het scherm (§4) |

> ⚠️ **`.field-lg` (48px) hoort volgens de oorspronkelijke herontwerpronde onder 768px de maat voor
> élk veld in de app te zijn** (Safari zoomt in bij focus op een veld onder 16px lettergrootte). Dat
> raakt zo'n vijftig schermen en is nooit doorgevoerd buiten de inlogroute. Zie
> `docs/tasks/openstaand-na-okx-omzetting.md`.

### 5.5 De stang links op een kaart

`.card-rail` · `.card-rail-success` · `.card-rail-warning` · `.card-rail-accent`. Een linkerrand van
`--border-width-sm` (2px, was 4px bij Nova) op de kaart die het hoofdgetal van een scherm draagt.

**Waarom er iets moest.** `ux-design.md` §1 kent per scherm één hoofdgetal, maar dat cijfer zat in
dezelfde kaart met dezelfde rand als de kaarten eronder. De hiërarchie zat alleen in de
lettergrootte, en die verdwijnt zodra iemand scrollt of op een telefoon kijkt.

**Waarom de kleur meebeweegt.** Een vaste groene stang boven een zichtbaarheid van 8% zou een
uitspraak doen die het cijfer niet waarmaakt. De tint volgt daarom de eerste zin van `insights()`
(`lib/insights.ts`): `goed` wordt `--trend-up`, `let_op` wordt oranje, en zonder oordeel (nooit
gemeten, eerste meting, of een verschil binnen de meetruis) blijft hij `--border-emphasis`.

**`.card-rail-accent` (toegevoegd stap 10, §8.5 van de herontwerpronde)** is de vierde variant: voor
een kaart die om een handeling vraagt en geen meetuitkomst weergeeft, zoals een openstaande vraag in
`FactRequests`. Geen richting, geen oordeel, alleen "hier is iets te doen".

**Van vier pixels naar twee.** OKX kent zelf maar twee randdiktes (1 en 1,5) en gebruikt een
gekleurde linkerrand nergens dikker dan 2. Vier pixels las als een tabblad, niet als een markering.

### 5.6 De glaslaag is weg

De doorschijnende, vervagende laag die er tot 17 september 2026 op `.card`, `.modal-panel` en
`.menu-surface` lag (`--glass-surface`, `backdrop-filter`) is volledig verwijderd. OKX kent dat
effect niet: elk oppervlak is dekkend. De reden dat het bij Nova wél kon is met de wisseling zelf
vervallen (pagina en kaart lagen daar op dezelfde kleur, en het glas liet de stippen van het
achtergrondpatroon meelezen); dat achtergrondpatroon (`.workspace-canvas`) is met dezelfde stap weg.

---

## 6. Iconen

[Lucide](https://lucide.dev) blijft (ISC-licentie, al in gebruik, een lijnset met dezelfde bouw als
OKX' eigen pictogramfont, dat zelf niet overdraagbaar is). De keuze per betekenis staat in
`lib/icons.ts`, het omhulsel dat maat en lijndikte vastzet in `components/icon.tsx`.

| Eigenschap | Was (Nova) | Nu (OKX) |
|---|---|---|
| Lijndikte | 1,75 | **1,5** |
| In een tekstregel | 16px | 16px |
| In een knop | 16px | 18px |
| Losse pictogramknop | 20px | 16px klein, 24px groot |
| Kleur | `currentColor` | `currentColor`, ongewijzigd |

Lijndikte 1,5 hoort bij tekst op gewicht 500 in plaats van 600 (§3.2): een lichtere letter naast een
even zware lijn oogt onbalans.

**De zes regels van Nova blijven onverkort gelden** (ze gaan over gebruik, niet over de tekenstijl
van een specifiek systeem): een icoon staat nooit alleen zonder label, één betekenis heeft één
icoon, de naam in `lib/icons.ts` is de betekenis en niet de tekening, in de zijbalk draagt alleen de
kop een icoon, een lijst krijgt er een zodra de soort van de regel verschilt, en een icoon in een
lijstregel staat in de leeskleur, nooit in de accentkleur.

---

## 7. Beweging

Ongewijzigd overgenomen uit de Nova-periode; OKX levert zelf geen motion-tokens in de gemeten
bundels en de bestaande waarden waren al kort en zonder opsmuk.

```
--duration-fast:  120ms    kleur, achtergrond, rand
--duration-base:  150ms    hover op een kaart of rij
--duration-slow:  200ms    lade, menu, breedte van de zijbalk
--ease-standard:  cubic-bezier(0.4, 0, 0.2, 1)
--ease-out:       cubic-bezier(0, 0, 0.2, 1)
```

`prefers-reduced-motion` zet alle transities op 0,01ms. Bij het omschakelen van licht naar donker
staat elke overgang uit (`.thema-wisselt`), anders veegt het scherm van de ene stand naar de andere
in plaats van in één keer om te klappen.

---

## 8. Opmaak en de drie standen

| | Nova | OKX |
|---|---|---|
| Bovenbalk | 61px | **48px** |
| Zijbalk uitgeklapt | 240px | 240px, ongewijzigd |
| Zijbalk ingeklapt | 64px | **56px** |
| Zijmarge desktop / tablet / mobiel | 24px overal | **24px / 20px / 16px** |

**Drie opmaakstanden, en elke route kiest er één** (`.stand` in `app/globals.css`, sinds stap 4):

```
lezen    720px    formulier, instellingen, één stuk tekst
werken  1440px    de meeste schermen, kaarten in een raster (de standaard)
data      geen    tabel, grafiek, vergelijking, alleen 24px marge
```

Een pagina kiest zijn stand niet door een prop door te geven, maar door ergens in zijn inhoud een
lege marker-`div` met de klasse `.wil-lezen` of `.wil-data` te zetten. De wikkel in
`components/workspace-chrome.tsx` gebruikt `:has()` om daarnaar te kijken en past zijn eigen
`max-width` aan. Geen marker betekent `werken` (1440px). Dat is met opzet gekozen boven een prop:
`:has()` raakt geen enkel `page.tsx`-bestand voor een keuze die puur over vormgeving gaat, en een
browser die `:has()` niet kent, valt terug op de brede stand, niet op iets kapots.

---

## 9. De primitieven

Gebruik deze, nooit een eigen tint of een eigen maat.

| Primitief | Regel |
|---|---|
| `.card` | Eén rand, plat, geen schaduw. `.card-interactive` krijgt bij hover een donkerder vlak en rand, geen schaduw en geen transform |
| `.card-accent` / `-success` / `-warning` / `-danger` | Getinte kaartrand, uit de betekenislaag |
| `.card-rail` / `-success` / `-warning` / `-accent` | De 2px-stang links op de kaart met het hoofdgetal, of op een kaart die om een handeling vraagt. Zie §5.5 |
| `.btn-primary` | **De handeling.** Omgekeerd contrast (wit op zwart in donker, zwart op wit in licht), geen accentkleur. Zie §2.4 voor waarom |
| `.btn-accent` | De hoofdactie van een scherm, hooguit één. Limoen (donker) of donkergroen (licht) |
| `.btn-actie` | **Actieknoppen**: elke knop die een cluster of onderwerp start ("Nieuwe cluster", "Cluster starten"), zoveel per scherm als er onderwerpen zijn. Vast `#25a750`, in beide standen gelijk. Zie §2.4a |
| `.btn-outline` / `.btn-ghost` | De keuze ernaast, resp. de uitweg. Zelfde maten |
| `.btn-sm` / `.btn-lg` | 36px en 48px, BEREKEND uit padding × 2 + regelhoogte + rand × 2 |
| `.chip` + `-success` / `-danger` / `-warning` / `-info` / `-attention` / `-neutral` / `-outline` | `--radius-md` (4px, niet meer een pil), gewicht 500. `-attention` draagt sinds stap 10 de accentkleur, niet roze (§2.5) |
| `.alert` + `-success` / `-warning` / `-danger` | Blok in de pagina, geen zwevende toast. Toegevoegd in stap 8 (de inlogroute), sindsdien ook elders |
| `.type-hero` … `.type-caption-emphasis` | De tekststijlen van OKX. Zie §3.2 |
| `.mono-label` | De kicker boven een titel. Rendert sinds deze omzetting in Archivo, niet meer in mono; de naam is historisch |
| `.stat-value` / `.tabular` / `.field-number` | Cijfers die je vergelijkt, `tabular-nums`, gewicht 500 |
| `.field` / `.field-lg` / `.field-error` | Oppervlakkleur met een rand, 40px (of 48px voor `.field-lg`). Hover maakt de rand donkerder, focus zet hem op `--border-focus` |
| `.stand`, `.wil-lezen`, `.wil-data` | De drie opmaakstanden van een pagina. Zie §8 |
| `.topbar-sales` | 2px `--intent-warning-solid` onder de bovenbalk, alleen op `/sales/*`: een visueel signaal dat dit een interne (niet-klant) omgeving is |
| `.skeleton` | Laadvlak, de vorm van wat er komt |
| `.prose` | Lange tekst: rapport, contentpagina |
| `Icon` | Het enige icoon-component. Zie §6 |
| `PageHeader` | De kop van een pagina, `.type-heading-lg`, gebruikt op 34 schermen. Geen terug-link: de zijbalk wijst al naar dezelfde bestemming |
| `SectionHeading` | De kop boven een blok binnen een pagina, met een scheidingslijn 8px onder de titel |
| `Tabs` | Onderlijnde navigatietabs, vervangt sinds stap 10 een aantal losse pil-navigaties |
| `Drawer` | Rechts uitschuivend paneel, vervangt sinds stap 10 `DetailPanel` overal waar dat de tabel ernaast versmalde |
| `CollapsibleSection` | Vlakke accordeon met alleen een onderrand, geen kader. `compact`-variant voor een kleinere trede |
| `EmptyState`, `ErrorState`, `ConfidenceChip` | Eén variant per patroon |
| `ThemeToggle` | De schakelaar licht/donker, in `workspace-chrome.tsx` |
| `AnalyticsFilters`, `AnalyticsTable` | De filterbalk en de sorteerbare tabel van Analytics |

---

## 10. Het themasysteem

**Er zijn twee standen**, en de opzet is bewust anders dan die van OKX zelf.

```
:root                                    de lichte stand, altijd de volledige lijst
@media (prefers-color-scheme: dark)      de systeemvoorkeur, tenzij expliciet licht gekozen
:root[data-theme="dark"]                 de eigen keuze, wint van allebei
```

OKX zet een klasse (`.theme-dark`/`.theme-light`) op het wortelelement en heeft daarom JavaScript
nodig vóór de eerste verf, anders flitst de pagina wit. De opzet van ORBIT ENGINE werkt zonder die
afhankelijkheid, want de systeemvoorkeur staat al in de CSS zelf via de media query. Dat is een
echte eigenschap van de huidige opzet en er is geen reden geweest om hem op te geven om een
implementatiedetail van OKX na te bootsen.

De keuze staat in `localStorage` onder `orbit-thema`, niet in de database: licht of donker is een
eigenschap van het scherm waar iemand op zit, niet van het account.

> ⚠️ **Definieer een kleur nooit alleen in één van de twee donkere blokken.** De lichte stand is de
> volledige lijst; de donkere blokken (de media query en de expliciete keuze) herdefiniëren alleen
> wat anders moet zijn. Een token dat alleen donker bestaat is in de lichte stand leeg, en een lege
> CSS-variabele valt stil terug op niets: doorzichtig, geen foutmelding. §11 heeft het controlescript.

**De ingelogde schermen zijn nog niet stelselmatig in de donkere stand gefotografeerd** sinds deze
tweede omzetting. Dat stond ook al open ná de Nova-ronde en is niet opnieuw dichtgelopen. Zie
`docs/tasks/openstaand-na-okx-omzetting.md`.

---

## 11. De negen regels

1. **Een kleur heeft een betekenis, geen naam.** `--intent-danger-content`, nooit `--accent-purple`
   (die alias bestaat alleen voor bestaand gebruik), en nooit een hexwaarde of rauwe `rgba()` in een
   component. Zie §12 voor de controle.
2. **Plat, niet gloeiend.** Rand en vlak dragen de hiërarchie. Geen schaduw op een kaart, geen
   `backdrop-filter`, geen gloed. De drie schaduwstanden (§5.3) zijn voorbehouden aan wat boven het
   scrim zweeft.
3. **De pil is voor de standaardknop**, en verder nergens. Chips, velden en navigatie staan op
   `--radius-md` (4px), kaarten op `--radius-xl` (8px).
4. **Status is kleur plus vorm, nooit kleur alleen.** Een dot, een pijl, een chip met tekst.
5. **Eén familie voor alles.** Archivo voor tekst en koppen, `tabular-nums` voor cijfers. Geen mono
   in labels meer, dat was Nova's stijl en niet die van OKX. Zie §3.2.
6. **Contrast is een tokenkeuze.** Gebruik `-content`/`-text` op een licht vlak en `-on`/`-inverse`
   op een gevuld vlak, en vertrouw `--text-subtler` nooit voor iets wat gelezen moet worden.
7. **Eén easing, korte duur** (§7). Bij het wisselen van licht naar donker staat elke overgang uit.
8. **Het accent is schaars.** Hooguit één hoofdactie per scherm, de actieve navigatie als streep, de
   eigen lijn in een grafiek. Nooit een kop, nooit meer dan ongeveer 1% van het oppervlak. Zie §2.4.
9. **Een icoon komt uit `lib/icons.ts`.** Nooit een letterteken in de tekst, nooit een met de hand
   getekende SVG, nooit een rechtstreekse import uit `lucide-react`. In de zijbalk draagt alleen de
   kop er een. Zie §6.

---

## 9b. Het open ontwerpbesluit: van wie is dit systeem eigenlijk

**Vastgelegd 17 augustus 2026 als vraag over Nova. Op 17 september 2026 opnieuw gesteld over OKX, en
nog steeds niet beantwoord.**

De vraag van augustus was: alles in dit document komt af van InSpace Nova, de concurrent, en dat
staat op gespannen voet met `docs/merkstrategie.md`, die Outer Orbit beschrijft als een merk dat de
status quo uitdaagt. Het antwoord was toen: de tokens, de radiusschaal en de schaduw komen letterlijk
uit het product van de concurrent, en dat is nooit als besluit genomen, het is geslopen.

**De omzetting naar OKX lost die specifieke spanning op maar beantwoordt de onderliggende vraag
niet.** OKX is geen concurrent van Outer Orbit; hun systeem overnemen draagt niet het risico dat een
potentiële klant het letterlijke uiterlijk van een concurrent op zijn eigen scherm terugziet. In die
zin is de omzetting een verbetering. Maar de vraag "moet het uiterlijk van ORBIT ENGINE ooit eigen
worden van Outer Orbit, in plaats van een gemeten kopie van een ander product" staat na deze ronde
nog precies zo open als na de vorige.

**Het besluit van 17 september 2026 (§2.4 hierboven, limoen letterlijk overgenomen) maakt die vraag
scherper, niet minder relevant.** De accentkleur van OKX draagt nu ook Outer Orbit's enige zichtbare
merkkleur in de app: waar eerst paars stond, staat nu limoen, en dat is een bewuste, met open ogen
genomen keuze om niet nu al een eigen merklaag te bouwen.

**Wat er nodig is om de vraag te beantwoorden**, ongewijzigd sinds augustus:

1. **Een uitspraak van de eigenaar** of het uiterlijk eigen moet worden. Zonder die uitspraak bakt
   elke volgende UI-wijziging de afgeleide verder in.
2. **Als het antwoord ja is: een eigen merklaag, geen herbouw.** Het fundament (de indeling, de
   maatvoering, de betekenislaag) klopt en hoeft niet overnieuw. Wat vervangen zou worden is de
   accentkleur en de vormtaal, en dat is werk in `app/globals.css` en dit document, niet in de
   honderden componenten die ernaar verwijzen. Regel 1 van §11 is precies de reden dat dat kan.
3. **Wat ontbreekt om het te kúnnen doen:** er is nog steeds geen logo, geen vastgesteld
   kleurenpalet en geen typografiekeuze van Outer Orbit zelf. `merkstrategie.md` §27 vraagt daar zelf
   om.

**Tot dat besluit valt, blijft dit document leidend voor de app.** Wat hier staat beschrijft wat er
werkelijk in `globals.css` staat, en dat is de enige bruikbare waarheid voor wie een scherm bouwt.

---

## 12. Controle vóór een commit

Beide moeten **nul regels** geven, op `.ts` én `.tsx`:

```bash
grep -rnE "#[0-9a-fA-F]{6}\b" app components lib --include="*.tsx" --include="*.ts" \
  | grep -vE "app/layout\.tsx|lib/email/|app/opengraph-image\.tsx" \
  | grep -vP ':\d+:\s*(\*|//|/\*)'
grep -rnE "rgba?\([0-9]" app components lib --include="*.tsx" --include="*.ts" \
  | grep -v "lib/email/"
```

Twee uitzonderingen, en elk heeft dezelfde soort reden: er is daar geen CSS die de variabele kan
oplossen.

| Bestand | Waarom |
|---|---|
| `app/layout.tsx` | `themeColor` kleurt de browserbalk van het besturingssysteem, buiten de pagina om |
| `lib/email/*.ts` | HTML voor e-mailclients, die begrijpen geen `var(--...)` |
| `app/opengraph-image.tsx` | Wordt op de server tot een PNG gerenderd; er is geen stylesheet en geen stand |

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

Een ontbrekende CSS-variabele geeft geen fout: hij valt stil terug op niets. Deze controle vond in de
Nova-periode twee verwijzingen die nooit hadden gewerkt (`var(--danger)`, `var(--accent)` vóór het
huidige token die naam kreeg), allebei onzichtbaar tot iemand er gericht naar zocht.

**En een vierde: staat er nog ergens een letterteken waar een icoon hoort?**

```bash
grep -rnP "(*UTF)[\x{2190}-\x{21FF}\x{25A0}-\x{25FF}\x{2713}-\x{2718}\x{2699}]" \
  app components --include="*.tsx" | grep -vP ':\d+:\s*(\*|//|/\*)'
```

Nul regels is het doel; wat eruit komt hoort in `lib/icons.ts` (§6, regel 9 van §11).

**En een vijfde: klopt de donkere stand met de lichte?**

```bash
python3 - <<'EOF'
import re, io

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

Drie keer "geen" is het doel: een token dat alleen donker bestaat is in het licht leeg en doorzichtig,
en de twee donkere blokken (de systeemvoorkeur en de eigen keuze) horen met opzet identiek te zijn
(§10). Wie er één aanpast en de ander vergeet, bouwt een app die er anders uitziet voor wie zelf
donker kiest dan voor wie zijn laptop op donker heeft staan.

**Dit is geen formaliteit.** De drift is in de Nova-periode drie keer teruggegroeid, telkens gevonden
door precies deze controles en niet door ernaar te kijken.

---

## Bijlage A, de Nova-periode (historisch, 6 augustus tot 17 september 2026)

> Dit was tot 17 september 2026 de basis van dit document. Het staat er nog als afgesloten
> geschiedenis: het legt uit waarom de app er tussentijds uitzag zoals hij eruitzag, en de merkkleuren
> van vóór deze ronde (paars, groen) komen hiervandaan. **Het is geen bron meer voor nieuw werk.**

De omzetting van 6 tot 24 augustus 2026 bracht ORBIT ENGINE van InSpace's marketingsite naar de
werkomgeving van hun product Nova: koel leiblauw in plaats van warm groengrijs, een echte
betekenislaag met zeven betekenissen, Geist Sans en Geist Mono, mono in kleine labels, een
inktkleurige hoofdknop in plaats van een paarse, en op 24 augustus een volledige donkere modus. Die
periode leverde ook de indeling op die deze ronde grotendeels ongemoeid liet: de drie opmaakstanden,
de zijbalknavigatie, `PageHeader` en de mobiele patronen (§8 en verder in `ux-design.md`).

**Wat uit die periode is overgenomen in de OKX-omzetting:** de betekenisnamen voor kleuren (vier in
plaats van zeven, §2.5), het principe van vijf velden per betekenis, één schaduwfamilie (nu drie
standen in plaats van één, alleen boven het scrim), de driedelige tokenopzet (licht als volledige
lijst, twee donkere blokken die alleen herdefiniëren), en de mobiele en desktop-indeling zelf.

**Wat niet is overgenomen:** de blauwzweem in de neutrale schaal (OKX is zuiver grijs), mono in
labels (OKX staat in één familie), de rechthoekige standaardknop (OKX gebruikt de pil), de
glaslaag en de kaartschaduw (OKX is volledig plat), en het leiblauwe paginavlak (OKX trekt pagina en
kaart uit elkaar, §2.1).

De volledige Nova-analyse, inclusief de historische marketingsite-basis van InSpace vóór 6 augustus
2026, staat in `docs/logbook.md` §29 en §30 en in de git-geschiedenis van dit document (laatste
Nova-versie: de commit vóór 21 september 2026).

---

## Bronnen

- **Primair:** de gecompileerde CSS van `okx.com`, gemeten op 17 september 2026. De tokennamen,
  de radiusschaal, de randdiktes en de drie schaduwstanden komen daar letterlijk uit
- **Historisch:** de CSS- en i18n-bundels van `nova.inspace.io` en `app.inspace.io` (6 augustus 2026)
  en de marketingsite `inspace.io` (juli 2026), samengevat in `docs/logbook.md` §29 en §30
