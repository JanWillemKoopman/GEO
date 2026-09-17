# REDESIGN 2026, ORBIT ENGINE naar de vormtaal van OKX

**Status: plan. Er is nog geen regel code gewijzigd.** Dit document is het blueprint. Implementatie
begint pas na expliciete goedkeuring van de eigenaar.

Geschreven 17 september 2026. Bron voor alles wat hier "gemeten" heet: de gecompileerde CSS van
okx.com, opgehaald op 17 september 2026. Zie §3 voor de methode en §4 voor wat er niet klopte aan de
aangeleverde research.

---

## 0. Samenvatting in één pagina

De app draagt nu het tokensysteem van InSpace Nova, een direct concurrerend product. Dit plan
vervangt dat door het tokensysteem van OKX. Dat is geen kleurwissel: de hele architectuur van de
vormgeving gaat om.

**De zes wijzigingen die het meeste verschil maken**, in volgorde van zichtbaarheid:

1. **De grond wordt zwart.** `#000000` als pagina, `#121212` als eerste laag, `#171717` als kaart.
   De lichte stand draait om: `#f6f6f6` als pagina, `#ffffff` als kaart. Nu is het allebei wit met
   een rand ertussen.
2. **De vorm wordt scherp.** Kaartradius gaat van 12 pixels naar 8. Knoppen worden pillen van 60
   pixels radius (OKX' eigen waarde) of rechthoeken van 4. Het glaseffect (`backdrop-filter`) en
   het stippenpatroon op de werkruimte verdwijnen volledig.
3. **De dichtheid gaat omhoog.** De inhoud is nu 1024 pixels breed en gecentreerd. Dat wordt 1440
   met een volle-breedte-stand voor tabelschermen. Dit is de kern van het desktopverzoek.
4. **De accentkleur wordt limoen.** `#bcff2f` vervangt het paars `#8511d9`, letterlijk zoals bij
   OKX, met donkergroen `#2b6d17` als tegenhanger in de lichte stand (§13.1).
5. **Het lettertype wordt Archivo.** OKX Sans is van CoType Foundry en commercieel gelicentieerd.
   Archivo is de dichtstbijzijnde vrije vervanger, gemeten en niet geraden (§5.2).
6. **Mobiel krijgt een eigen ontwerp.** Geen geschaalde desktopversie: een eigen navigatie, eigen
   tabellen met twee kolommen in plaats van zeven, en een stappenflow in plaats van lange
   formulieren. Desktop wordt daar met geen enkele concessie voor ingeleverd (§8.12).

**Wat er niet verandert:** geen enkele regel businesslogica, geen route, geen databasekolom, geen
API. Dit is een wijziging in `app/globals.css`, een herschrijving van de klassenlaag, elf nieuwe
componenten en daarna een opruimronde door 249 tsx-bestanden.

**Waarom dat kan:** regel 1 van `docs/designsystem.md` §8 ("een kleur heeft een betekenis, geen
naam") is consequent toegepast. De app noemt nergens `paars`, hij noemt `intelligence`. Daardoor
zit het fundament op één plek. Dit is het moment waarop die discipline zich uitbetaalt.

### De drie besluiten van de eigenaar

Genomen op 17 september 2026, en dit document is erop herschreven.

| | Besluit | Gevolg |
|---|---|---|
| Accentkleur | Limoen `#bcff2f`, letterlijk overnemen | §13.1, één token, geen gevolgen elders |
| Mobiel | Niet blokkeren, maar een eigen ontwerp naast desktop | §8.12 herschreven, zes componenten erbij, ongeveer een derde meer werk |
| Oplevering | In stappen, elke stap apart naar productie | §10.2, elf stappen met een eigen tak per stap |

### Waar dit plan een kanttekening bij de opdracht houdt

De opdracht zegt: neem OKX over als kopie, niet als inspiratie, om concurrentiegedrang te
voorkomen. Dat doel haalt dit plan, en de zorg erachter is terecht: OKX is een cryptobeurs en zal
nooit met een GEO-product voor het MKB concurreren, Nova wel.

Eén nuance blijft staan, en `docs/designsystem.md` §9b heeft hem in augustus zelf al opgeschreven:
de vraag die daar open staat is niet "van wie is dit systeem" maar "is dit uiterlijk van ons". Een
kopie van OKX beantwoordt die vraag niet, hij verplaatst hem.

Met het besluit over de limoen is dat een bewuste keuze geworden in plaats van iets wat insluipt,
en dat is het verschil dat telt. Het staat opgeschreven in §13.1 en §10.6 zorgt dat
`designsystem.md` §9b het eerlijk blijft benoemen, zodat het over een half jaar geen verrassing is.
Het lettertype was sowieso geen keuze: OKX Sans is gelicentieerd en kan niet mee.

---

## 1. Wat er nu staat

Geteld op 17 september 2026, niet overgenomen uit documentatie.

### 1.1 Omvang

| | |
|---|---|
| Routes (paginabestanden) | 50, plus 7 layouts |
| Componenten in `components/` | 60 tsx, plus 2 ts-hulpbestanden |
| tsx-bestanden totaal | 249 |
| Regels tsx | 37.447 |
| `app/globals.css` | 2.141 regels |
| Tokens in de lichte stand | ongeveer 130 |
| Klassen in de componentenlaag | 59 |

### 1.2 De architectuur van de vormgeving

Drie lagen, en die opzet blijft staan. Alleen de inhoud van de lagen gaat eruit.

1. **De tokenlaag.** `:root` voor licht, `@media (prefers-color-scheme: dark)` voor de
   systeemvoorkeur, `:root[data-theme="dark"]` voor de eigen keuze. Regel 45, 456 en 612.
2. **De koppeling naar Tailwind.** `@theme inline` maakt van tokens utilities. Hier zit een
   bekende valstrik: `--color-base` maakt `text-base` tot een kléur en niet tot een tekstgrootte.
3. **De componentenlaag.** 59 klassen, en die worden echt gebruikt:

| Klasse | Bestanden |
|---|---|
| `mono-label` | 126 |
| `card` | 117 |
| `chip` | 68 |
| `btn-primary` | 53 |
| `btn-outline` | 52 |
| `field` | 48 |
| `skeleton` | 39 |
| `btn-ghost` | 17 |
| `stat-value` | 14 |

Dat is het goede nieuws van deze hele operatie. Wie `.card` herschrijft, raakt 117 bestanden aan
zonder ze te openen.

**Het slechte nieuws staat ernaast.** De typografieklassen worden nauwelijks gebruikt:
`type-label` nul keer, `type-body` drie keer, `type-caption` negen keer. Typografie gebeurt met rauwe
Tailwind-utilities, en die zijn niet aan een token gekoppeld:

| Utility | Voorkomens |
|---|---|
| `text-sm` | 562 |
| `text-lg` | 38 |
| `text-xs` | 32 |
| `text-3xl` | 8 |
| `text-2xl` | 8 |
| `rounded` (kaal) | 110 |

562 keer `text-sm` betekent: de typografie van deze app is niet ontworpen, hij is ontstaan. Dit is
de grootste handmatige post in de migratie en §10.4 heeft het plan ervoor.

### 1.3 De maatvoering van nu

Gemeten in `components/workspace-chrome.tsx` en `components/sidebar.tsx`.

| Onderdeel | Nu |
|---|---|
| Bovenbalk | 61px, sticky, `backdrop-blur-md` |
| Zijbalk | 240px uitgeklapt, 64px ingeklapt, padding 12px |
| Inhoud | `max-w-5xl` (1024px), gecentreerd, `px-6 py-10` |
| Mobiele lade | 288px, max 85vw |
| Navigatie-item | `px-3 py-2`, `text-sm`, radius 8px |
| Kaart | radius 12px, padding 20px, glasoppervlak plus schaduw |
| Invoerveld | hoogte 40px, radius 8px, padding `0 12px`, 15px tekst |
| Tabelrij | `py-1.5` (ongeveer 34px totaal), `text-sm` |
| Inlogkaart | 520px, radius 12px, padding `32px 24px` |

### 1.4 De Nova-kenmerken die eruit moeten

Dit is de sloopiijst. Elk punt is een plek waar iemand die beide producten kent de herkomst ziet.

| Kenmerk | Waar | Wat ervoor in de plaats komt |
|---|---|---|
| Glasoppervlak op elke kaart | `--glass-*`, 42 keer in css, `backdrop-filter` 15 keer | Vlak oppervlak, geen blur |
| Stippenpatroon op de werkruimte | `.workspace-canvas::before` | Niets, vlakke grond |
| Paars als merkkleur | `--accent-purple`, 15 keer | Limoen `#bcff2f`, §13.1 |
| Groen-paars verloop in het woordmerk | `--brand-gradient`, 4 bestanden | Vlakke tekstkleur |
| Kaartradius 12px | `--radius-lg` op `.card` | 8px |
| Koel leiblauw als neutraal (`#f8fafc`, `#e7edf2`, `#17212b`) | de hele neutralenschaal | Echt grijs, zonder blauwzweem |
| Zachte schaduw onder elke kaart | `--glass-shadow` | Geen schaduw, alleen een rand |
| Inhoud op 1024px | `max-w-5xl` | 1440px, en volle breedte op tabelschermen |
| Decoratieve inlogkaart | `.auth-*` blok | Zelfde structuur, OKX-maatvoering |

---

## 2. Wat OKX werkelijk is

### 2.1 De bronnen

Opgehaald op 17 september 2026, in totaal 1.135.435 bytes echte CSS:

| Bestand | Grootte | Wat erin zit |
|---|---|---|
| `okx-nav/header/index.735fa69d.css` | 630.142 b | De volledige componentbibliotheek |
| `okx-homepage/homePage/index.fd8ac009.css` | 218.541 b | Homepage-opmaak |
| `okx-nav/global/index.b914949b.css` | 99.936 b | **De themablokken, beide standen** |
| `market/assets/markets-deps-C5uRPYAb.css` | 68.487 b | Tabel- en filtercomponenten |
| `okx-nav/footer/index.4cf2f522.css` | 47.192 b | Voettekst |
| `market/assets/async-shared-Cnd28vln.css` | 32.850 b | Gedeelde componenten |
| `okx-nav/okxGlobal/index.7f595b10.css` | 26.591 b | Winst- en verliesvarianten |
| `market/assets/Markets-DS177QWB.css` | 7.298 b | Marktenpagina |
| `market/assets/CoinList-DIgNSTOZ.css` | 4.398 b | **De datatabel, echte rijhoogtes** |

Plus `OKX_Sans/Regular.woff2` (30.296 b), gemeten met fontTools.

Pagina's bekeken: de homepage, `/markets/prices` (de datatabel), `/balance/overview` (het
accountscherm).

### 2.2 Hoe hun systeem in elkaar zit

OKX draagt een tokensysteem dat `okd` heet, OKX Design. In de nav-bundel heet het
`--oxnv-okd-*`, in de app-bundels `--okd-*`. Geteld: **3.561 unieke custom properties**, waarvan
1.002 in de `okd`-naamruimte en 926 daarvan kleuren.

De standen schakelen met **een klasse op het wortelelement**, `.theme-dark` en `.theme-light`. Geen
`data-theme`, geen media query in de CSS zelf. 678 tokens hebben een andere waarde per stand.

Hun opbouw is drie lagen diep, en dat is precies de opbouw die ORBIT ENGINE al heeft:

```
--global-color-profit-default: #25a750          een ruwe waarde
  ↓
--okd-color-content-pnl-profit-default          een betekenis
  ↓
--okd-button-fill-green-hover-background        een component in een staat
```

Die derde laag is wat ORBIT ENGINE mist en wat dit plan toevoegt. OKX heeft tokens als
`--okd-button-basic-normal-hover-border-color`. Dat is geen overdaad, het is wat een knop met zes
varianten maal vijf staten nodig heeft om zonder uitzonderingen te blijven werken.

### 2.3 Wat OKX eigenlijk is, in één alinea

Geen zwarte site met groene knoppen. Het is een systeem waarin **zwart en wit het werk doen en
kleur bijna nooit**. De actieve staat is niet limoen maar `#fff` op `#000`. De focusring is
`#fff`. De geselecteerde rand is `#fff`. Limoen komt alleen voor bij het merk zelf en bij één
soort primaire actie. Alle interactie loopt via doorzichtig wit (`hsla(0,0%,100%,.13)` voor hover,
`.16` voor actief, `.22` voor ingedrukt). Daardoor werkt elke hover op elke ondergrond, zonder dat
er per oppervlak een variant nodig is. Dat is het echte patroon en het is overdraagbaar.

---

## 3. Methode, en wat geverifieerd is

`CLAUDE.md` zegt: neem een cijfer uit documentatie nooit zonder verificatie over. Dit document
houdt zich daaraan en markeert per waarde waar hij vandaan komt.

- **GEMETEN** betekent: letterlijk uit de gecompileerde CSS van okx.com van 17 september 2026, of
  uit de fontmetriek van `OKX_Sans/Regular.woff2`.
- **BEREKEND** betekent: opgeteld uit gemeten waarden, met de som erbij.
- **AFGELEID** betekent: OKX levert dit component niet in de opgehaalde bundels (het laadt per
  route bij), en de waarde is consistent uit de gemeten schaal doorgetrokken. Dit geldt voor
  invoerveld, tabblad, tooltip, badge en lade. Zie §7 per component.

Het onderscheid is niet cosmetisch. Alles wat GEMETEN heet is na te rekenen tegen de opgeslagen
CSS. Alles wat AFGELEID heet is een ontwerpkeuze van dit plan en mag ter discussie staan.

---

## 4. Correcties op de aangeleverde research

De Gemini- en ChatGPT-research is naast de echte CSS gelegd. Beide hebben de sfeer goed en de
cijfers grotendeels mis. De opdracht vroeg om dit te controleren, dus hier staat het.

### 4.1 Gemini

| Bewering | Werkelijk | Oordeel |
|---|---|---|
| Accent `#00D07B` (elektrisch groen) | `#bcff2f` (limoen) | Fout, verkeerde kleurfamilie |
| `#0052FF` als Web3-blauw | Blauw is bij OKX alleen informatief, `#0b5bcb` licht en `#277ae7` donker | Fout |
| Winst `#00C076`, verlies `#F6465D` | Winst `#25a750` donker en `#31bd65` licht, verlies `#ca3f64` donker en `#eb4b6d` licht | Fout, dit zijn de kleuren van Binance |
| Grond `#121212` | `#000000` is de grond, `#121212` is de eerste laag erop | Half goed |
| Kaart `#1C1C1E`, rand `#2C2C2E` | Kaart `#171717`, rand `#383838` | Fout, en de blauwzweem in die waarden bestaat niet bij OKX |
| Secundaire tekst `#8E8E93` | `#b3b3b3` (tertiair) en `#969696` (subtiel) | Fout, en te donker |
| Radius 16 tot 24 op kaarten | Maximaal 12, en de schaal is 2/4/6/8/10/12 | Fout, veel te rond |
| Knoppen vaak pilvormig | Klopt, `border-radius: 60px` | **Goed** |
| Tabulaire cijfers in tabellen | Klopt, gemeten: `zero` en `one` zijn allebei 600 eenheden | **Goed** |
| Hairline-randen, nauwelijks schaduw | Klopt | **Goed** |
| `backdrop-filter: blur(12px)` op de navigatie | Niet gevonden in hun CSS | Niet bevestigd |

### 4.2 ChatGPT

| Bewering | Werkelijk | Oordeel |
|---|---|---|
| Limoen als accent | Klopt qua familie | **Goed** |
| `#B8FF00` | `#bcff2f` | Bijna, maar het echte cijfer is beter |
| Grond `#000000`, oppervlakken `#0A0A0A` / `#111111` / `#181818` | Grond klopt. De oppervlakken zijn `#121212` / `#171717` / `#1d1d1d` / `#2c2c2c` | Half goed |
| Rand `#292929` | `#383838` (primair), `#2e2e2e` (gedempt), `#404040` (secundair) | Fout |
| Inter als lettertype | OKX Sans van CoType Foundry | Fout, maar Inter is een redelijke gok |
| Koppen op gewicht 600 | Bij OKX is "bold" gewicht **500**. Alleen `heading-xl` en `heading-xxl` gaan naar 600 | Fout, en dit is het meest zichtbare verschil |
| Kopschaal 72/56/40/28/20 | 56/40/36/30/24/18 | Fout |
| Knophoogte 44px, radius 6px | 48/40/36/30/28, radius 60px of 4px | Fout |
| Kaartradius 12px | 12px komt voor, maar 8 is de gewone kaart | Half goed |
| Focusring limoen met gloed | Focusring is `#fff` in donker en `#000` in licht | Fout, en dit is een belangrijk patroon |
| Veldhoogte 44px | Afgeleid 40px, passend bij knop md | Niet bevestigd |
| Bijna geen schaduwen | Klopt in de app, maar er staan er wel zeven in het systeem | Half goed |
| Gebruik geen `rounded-full` overal | Klopt als advies, maar OKX doet het bij knoppen juist wel | Half goed |
| Semantische tokens in plaats van hex in componenten | Klopt, en dit is het beste advies uit beide stukken | **Goed** |
| Verhouding 70% zwart, 1% accent | Klopt met wat de CSS laat zien | **Goed** |

**De rode draad:** beide modellen beschrijven een gemiddelde donkere crypto-interface, niet die van
OKX. Waar ze over sfeer en verhoudingen praten zitten ze goed. Waar ze cijfers noemen moeten die
cijfers vervangen worden door de gemeten waarden hieronder.

---

## 5. Het nieuwe design system

### 5.1 Kleur

De hele schaal is neutraal grijs. **Geen blauwzweem.** Dat is het grootste enkele verschil met wat
er nu staat: `#17212b` is blauwzwart, `#000000` is zwart.

#### 5.1.1 Oppervlakken, GEMETEN

| Token | Donker | Licht | Waarvoor |
|---|---|---|---|
| `--bg-base` | `#000000` | `#f6f6f6` | De pagina |
| `--bg-layer-1` | `#121212` | `#ffffff` | De werkruimte naast de zijbalk |
| `--bg-surface` | `#171717` | `#ffffff` | Kaart, menu, dialoog |
| `--bg-surface-raised` | `#1d1d1d` | `#f3f3f3` | Tabelrij bij hover, genest vlak |
| `--bg-layer-2` | `#2c2c2c` | `#e9e9e9` | Chip, voortgangsbaan, tabelkop |
| `--bg-layer-3` | `#3f3f3f` | `#dcdcdc` | Een stap dieper, zelden nodig |
| `--bg-elevated-contrast` | `#343434` | `#ffffff` | Dialoogvenster boven het scrim |
| `--bg-disabled` | `#0e0e0e` | `#fafafa` | Uitgeschakeld oppervlak |
| `--bg-scrim` | `rgba(0,0,0,.68)` | `rgba(0,0,0,.43)` | Achter een dialoog |
| `--bg-inverse` | `#ffffff` | `#000000` | Omgekeerd vlak |

Let op de asymmetrie: in donker zijn het zes echte stappen, in licht vallen pagina en kaart uit
elkaar (`#f6f6f6` tegen `#ffffff`) in plaats van samen zoals nu. Dat is OKX' eigen keuze
(`surface-structural-web-only-base` is `#f6f6f6` in licht en `#000` in donker) en hij is beter dan
wat er nu staat, want de kaart hoeft niet meer alleen van zijn rand te leven.

#### 5.1.2 Tekst, GEMETEN

| Token | Donker | Licht | Waarvoor | Contrast op de grond |
|---|---|---|---|---|
| `--text-primary` | `#ffffff` | `#000000` | Koppen, waarden | 21:1 |
| `--text-secondary` | `#e6e6e6` | `#383838` | Bodytekst | 16,8:1 donker |
| `--text-tertiary` | `#b3b3b3` | `#5b5b5b` | Labels, bijschrift | 10,0:1 donker |
| `--text-subtle` | `#969696` | `#5e5e5e` | Bijzaak | 7,1:1 donker |
| `--text-subtler` | `#636363` | `#858585` | Randgeval, nooit bodytekst | 3,5:1 donker |
| `--text-disabled` | `#5b5b5b` | `#b3b3b3` | Uitgeschakeld | 3,1:1 |
| `--text-placeholder` | `hsla(0,0%,100%,.3)` | `rgba(0,0,0,.22)` | Tijdelijke tekst in een veld | |
| `--text-inverse` | `#000000` | `#ffffff` | Op een gevuld vlak | |

**Vijf niveaus en niet drie.** Dat is een echte verbetering ten opzichte van nu: de app heeft er
drie (`primary`, `secondary`, `muted`) en `muted` haalt op wit maar 3,7:1, wat betekent dat hij
volgens het huidige commentaar "ALLEEN voor bijzaak" is. Met vijf niveaus is er een bruikbare trede
tussen bodytekst en onleesbaar.

#### 5.1.3 Randen, GEMETEN

| Token | Donker | Licht | Waarvoor |
|---|---|---|---|
| `--border-subtle` | `hsla(0,0%,100%,.13)` | `rgba(0,0,0,.06)` | Scheidingslijn in een kaart |
| `--border-default` | `hsla(0,0%,100%,.22)` | `rgba(0,0,0,.14)` | De gewone rand |
| `--border-strong` | `hsla(0,0%,100%,.4)` | `rgba(0,0,0,.32)` | Interactieve rand |
| `--border-primary` | `#383838` | `#e6e6e6` | Kaartrand, dekkend |
| `--border-emphasis` | `#b8b8b8` | `#4a4a4a` | De rand die moet spreken |
| `--border-selected` | `#ffffff` | `#000000` | Geselecteerd |
| `--border-focus` | `#ffffff` | `#000000` | De focusring |
| `--line-muted` | `#2e2e2e` | `#ebebeb` | Tabelrijscheiding |
| `--line-secondary` | `#404040` | `#dbdbdb` | Zwaardere scheiding |

**De twee soorten naast elkaar is opzet, geen slordigheid.** De alfa-randen werken op elke
ondergrond zonder variant. De dekkende randen (`#383838`) zijn er waar een rand nooit over iets
gekleurds ligt. Het huidige commentaar in `globals.css` zegt dat doorschijnend zwart een rand vuil
maakt op een gekleurd vlak, en dat klopt. OKX lost het op door beide te hebben en per plek te
kiezen, niet door er één te verbieden.

#### 5.1.4 Het accent, GEMETEN

| Token | Donker | Licht |
|---|---|---|
| `--accent` | `#bcff2f` | `#2b6d17` |
| `--accent-hover` | `#9ce207` | `#225812` |
| `--accent-pressed` | `#87c600` | `#18400c` |
| `--accent-on` | `#000000` | `#ffffff` |
| `--accent-subtle` | `#e6ffb0` (tekst op donkergroen) | `#133f06` |
| `--accent-highlight` | `#bcff2f` | `#bcff2f` |

Let op wat OKX hier doet: in de **lichte** stand is het accent geen limoen maar donkergroen
`#2b6d17`. Limoen op wit is onleesbaar (contrast 1,4:1) en ze weten dat. Limoen blijft alleen
bestaan als `highlight`, voor een vlak waar zwarte tekst op komt. Dit is precies het soort detail
dat bepaalt of iets als OKX aanvoelt, en geen van beide researchstukken had het.

#### 5.1.5 Betekenis, GEMETEN

De app heeft nu zeven betekenissen (`intelligence`, `growth`, `information`, `warning`,
`attention`, `danger`, `premium`) met elk zeven tokens. OKX heeft er vier. Dat is een versimpeling
en ze is verdedigbaar, maar het raakt bestaande schermen, dus §10.5 heeft de vertaling.

| Betekenis | Token | Donker | Licht |
|---|---|---|---|
| Succes | `--intent-success-content` | `#49a92d` | `#2b6d17` |
| | `--intent-success-surface` | `#192400` | `#e9f4d1` |
| | `--intent-success-solid` | `#3c8f24` | `#3c8f24` |
| Waarschuwing | `--intent-warning-content` | `#ffc452` | `#ba5d00` |
| | `--intent-warning-surface` | `#4d3200` | `#ffedcb` |
| | `--intent-warning-solid` | `#f5a915` | `#fea01d` |
| Fout | `--intent-danger-content` | `#f57a8a` | `#ba2133` |
| | `--intent-danger-surface` | `#420a10` | `#fee0e3` |
| | `--intent-danger-solid` | `#f5384f` | `#e05a6a` |
| Informatie | `--intent-info-content` | `#ebebeb` | `#212121` |
| | `--intent-info-surface` | `#121212` | `#f6f6f6` |
| | `--intent-info-subtle` | `#7d7d7d` | `#757575` |

**Informatie is grijs en niet blauw.** Dat is bij OKX consequent: een informatieve melding is
neutraal, want kleur is gereserveerd voor iets wat je moet weten. Alleen `content-interactive-drop`
is blauw (`#277ae7` licht, `#0b5bcb` donker) en dat is voor slepen en neerzetten.

#### 5.1.6 Stijging en daling, GEMETEN

Dit is de belangrijkste toevoeging voor ORBIT ENGINE, want zichtbaarheid die stijgt of daalt is de
kern van het product.

| Token | Donker | Licht |
|---|---|---|
| `--trend-up` | `#25a750` | `#31bd65` |
| `--trend-up-surface` | `#071c0f` | `#e0f5e8` |
| `--trend-up-tint` | `rgba(37,167,80,.2)` | `rgba(49,189,101,.2)` |
| `--trend-down` | `#ca3f64` | `#eb4b6d` |
| `--trend-down-surface` | `#230b10` | `#fce4e9` |
| `--trend-down-tint` | `rgba(202,63,100,.2)` | `rgba(235,75,109,.2)` |
| `--trend-flat` | `#b8b8b8` | `#5e5e5e` |

Deze zijn bewust **niet** gelijk aan succes en fout. Een dalende zichtbaarheid is geen foutmelding.
OKX houdt die twee paren gescheiden en dat is goed doordacht.

#### 5.1.7 Grafiek, GEMETEN

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

Acht reeksen, en de laatste drie zijn grijs. Dat is het patroon: je merk krijgt de accentkleur, de
belangrijkste concurrenten krijgen kleur, de rest wordt grijs. Reeks 5 (`#a352ef`) is in beide
standen gelijk.

#### 5.1.8 Interactie, GEMETEN

Het patroon dat de hele interface bij elkaar houdt.

| Staat | Donker | Licht |
|---|---|---|
| Rust | transparant | transparant |
| Hover | `hsla(0,0%,100%,.13)` | `rgba(0,0,0,.06)` |
| Actief | `hsla(0,0%,100%,.16)` | `rgba(0,0,0,.09)` |
| Ingedrukt | `hsla(0,0%,100%,.22)` | `rgba(0,0,0,.14)` |
| Uitgeschakeld | `hsla(0,0%,100%,.08)` | `rgba(0,0,0,.03)` |
| Geselecteerd | `#ffffff` met `#000000` tekst | `#000000` met `#ffffff` tekst |

**Op een gekleurd vlak draait het om** (`surface-interactive-oncolor`): dan is hover
`hsla(0,0%,100%,.15)` in donker en `hsla(0,0%,100%,.7)` in licht. Eén set tokens, werkt overal.

### 5.2 Typografie

#### 5.2.1 Het lettertype

OKX gebruikt **OKX Sans**. Gemeten uit het bestand:

| Eigenschap | Waarde |
|---|---|
| Foundry | CoType Foundry, copyright 2024 |
| unitsPerEm | 1000 |
| x-hoogte | 0,510 em |
| kapitaalhoogte | 0,700 em |
| Cijferbreedte | 0,600 em, **`zero` en `one` identiek** |
| Gewichten | 200, 300, 400, 500, 600 |
| Glyphs | 686 |

Het is commercieel gelicentieerd en kan dus niet mee. De opdracht zegt: zoek dan een vrij
alternatief dat er zo dicht mogelijk bij komt. Acht kandidaten zijn opgehaald en met fontTools
gemeten tegen de doelwaarden:

| Lettertype | x-hoogte | kapitaal | `0` | `H` | `n` | `o` | tnum | Gemiddelde afwijking |
|---|---|---|---|---|---|---|---|---|
| **OKX Sans (doel)** | 0,510 | 0,700 | 0,600 | 0,672 | 0,561 | 0,582 | ingebouwd | |
| Manrope | 0,540 | 0,720 | 0,610 | 0,684 | 0,594 | 0,592 | ja | **1,9%** |
| **Archivo** | 0,526 | 0,686 | 0,573 | 0,736 | 0,563 | 0,570 | ja | **2,2%** |
| Figtree | 0,500 | 0,700 | 0,641 | 0,751 | 0,558 | 0,580 | ja | 2,3% |
| Geist | 0,530 | 0,710 | 0,671 | 0,713 | 0,581 | 0,579 | ja | 2,7% |
| Public Sans | 0,517 | 0,723 | 0,612 | 0,766 | 0,577 | 0,566 | ja | 2,8% |
| Instrument Sans | 0,510 | 0,720 | 0,666 | 0,736 | 0,599 | 0,584 | ja | 3,2% |
| Inter | 0,546 | 0,728 | 0,631 | 0,743 | 0,591 | 0,600 | ja | 3,6% |
| Plus Jakarta Sans | 0,536 | 0,745 | 0,732 | 0,736 | 0,573 | 0,655 | ja | 5,9% |

**De keuze is Archivo**, niet Manrope. Manrope wint op cijfers maar verliest op karakter: het is een
geometrische letter met een opvallende `g` en brede ronde vormen, en OKX Sans is een neo-grotesk.
Archivo is wel een grotesk, zit op 2,2% en heeft een variabele versie met een breedte-as. Inter,
de gok van de ChatGPT-research, staat op de zevende plaats.

```css
--font-sans: "Archivo", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
--font-mono: "Geist Mono", ui-monospace, SFMono-Regular, monospace;
```

Geist blijft als mono in het project; `geist` is al een dependency en hoeft er niet uit.

**Cijfers moeten overal tabulair.** OKX Sans is het van huis uit, Archivo niet. Dat wordt dus een
expliciete regel op elke plek waar een getal staat:

```css
.stat-value, td, .tabular { font-variant-numeric: tabular-nums; }
```

Zonder die regel springen kolommen in tabellen, en dat is precies het probleem dat de
Gemini-research terecht benoemde.

#### 5.2.2 De schaal, GEMETEN

| Naam | Grootte | Regelhoogte | Gewicht | Letterafstand |
|---|---|---|---|---|
| `display-lg` | 56px | 1,32 (74px) | 500 | -0,02em |
| `display-md` | 40px | 52px | 500 | -0,02em |
| `heading-xxl` | 40px | 1,32 (53px) | **600** | -0,015em |
| `heading-xl` | 36px | 1,32 (48px) | **600** | -0,015em |
| `heading-lg` | 30px | 40px | 500 | -0,01em |
| `heading-md` | 24px | 30px | 500 | -0,01em |
| `heading-sm` | 18px | 24px | 500 | 0 |
| `heading-overline` | 12px | 15px | 500 | 0,04em, hoofdletters |
| `body-md` | 16px | 24px | 400 | 0 |
| `body-md-bold` | 16px | 24px | **500** | 0 |
| `body-sm` | 14px | 21px | 400 | 0 |
| `body-sm-bold` | 14px | 21px | **500** | 0 |
| `body-xs` | 12px | 18px | 400 | 0 |
| `body-xs-bold` | 12px | 18px | **500** | 0 |

**Twee dingen die de hele app anders laten voelen:**

1. **"Bold" is 500 en niet 700.** OKX gebruikt nergens 600 of 700 voor tekst binnen een regel.
   Alleen twee koppen gaan naar 600. De app doet nu `font-semibold` (600) op koppen in de zijbalk
   en op tabelkoppen. Dat wordt 500 en dat is meteen zichtbaar.
2. **De regelhoogte is 1,5 en niet 1,4.** 14/21 en 12/18 en 16/24, allemaal exact anderhalf. De
   `heading`-regels zijn strakker (24/30 is 1,25).

De letterafstand staat niet in hun tokens; die is AFGELEID uit de gebruikelijke optische correctie
voor grote koppen. Kleine tekst krijgt nul.

### 5.3 Ruimte

OKX heeft geen spacing-tokens in de opgehaalde CSS, maar de gebruikte waarden zijn consequent.
GEMETEN uit paddings in hun componenten: 4, 6, 8, 10, 12, 14, 16, 20, 24, 32, 48.

De schaal voor ORBIT ENGINE, met de 4-pixelbasis die OKX aanhoudt:

```
--space-1:   4px      pictogram tot tekst in een dichte regel
--space-2:   8px      pictogram tot tekst, standaard
--space-3:  12px      binnen een chip, tussen label en waarde
--space-4:  16px      kaartpadding compact, tussen velden
--space-5:  20px      kaartpadding standaard
--space-6:  24px      kaartpadding ruim, dialoogpadding
--space-8:  32px      tussen secties
--space-12: 48px      tussen hoofdblokken
--space-16: 64px      boven een paginakop
```

Terugkerende afstanden, GEMETEN:

| Waar | Waarde |
|---|---|
| Pictogram tot tekst in een knop lg | 8px |
| Pictogram tot tekst in een knop md, sm, xs | 6px |
| Label tot waarde in een datakaart | 4px (uit `.priceCol` gap 1px tot 4px) |
| Kaartpadding | 16px, op 768px naar 20px, op 1024px naar 24px |
| Tussen filterchips | 8px |
| Onder een sectiekop | 16px |

### 5.4 Radius, GEMETEN

```
--radius-none:  0
--radius-sm:    2px
--radius-md:    4px      knop rechthoekig, chip, badge, invoerveld
--radius-lg:    6px
--radius-xl:    8px      kaart, menu, selectiechip
--radius-xxl:  10px
--radius-xxxl: 12px      dialoog, grote datakaart
--radius-pill: 60px      knop standaard
```

Dit is de hele schaal die OKX heeft. Er is niets ronder dan 12 behalve de pil.

**Wat dit betekent voor ORBIT ENGINE:** de kaart gaat van 12 naar 8. De 110 kale `rounded`-utilities
(4px in Tailwind) blijven toevallig kloppen als `--radius-md`. De `rounded-full` op tien plekken
wordt `--radius-pill`.

### 5.5 Randdikte, GEMETEN

```
--border-width:      1px      overal
--border-width-emphasis: 1.5px    alleen op de outline-knop met accent
```

Meer is het niet. OKX gebruikt nergens 2px of dikker op een rand.

### 5.6 Schaduw, GEMETEN

```
--shadow-none: 0 0 0 0 transparent
--shadow-xs:   0 0 0 1px rgba(0,0,0,.05)
--shadow-sm:   0 1px 2px 0 rgba(0,0,0,.05)
--shadow-default: 0 1px 3px 0 rgba(0,0,0,.10), 0 1px 2px 0 rgba(0,0,0,.06)
--shadow-md:   0 4px 6px -1px rgba(0,0,0,.10), 0 2px 4px -1px rgba(0,0,0,.06)
--shadow-lg:   0 10px 15px -3px rgba(0,0,0,.10), 0 4px 6px -2px rgba(0,0,0,.05)
--shadow-xl:   0 20px 25px -5px rgba(0,0,0,.10), 0 10px 10px -5px rgba(0,0,0,.04)
--shadow-2xl:  0 25px 50px -12px rgba(0,0,0,.25)
```

**De regel die erbij hoort:** in de donkere stand krijgt niets een schaduw behalve wat boven het
scrim zweeft (dialoog `--shadow-xl`, melding `--shadow-xl`, menu `--shadow-lg`). Een kaart heeft
een rand, geen schaduw. Dat is het verschil met nu, waar elke `.card` een `--glass-shadow` draagt.

### 5.7 Pictogrammen

OKX gebruikt een eigen pictogramfont (`ok-e41a06a168`, `nav-ok-b983c4766d`). Niet overdraagbaar.
Lucide blijft, want het is al in gebruik en het is een lijnset met dezelfde bouw.

| | Nu | Nieuw |
|---|---|---|
| Lijndikte | 1,75 | **1,5** |
| In een tekstregel | 16px | 16px |
| In een knop | 16px | **18px** (GEMETEN, alle knopmaten behalve xs) |
| In een knop xs | 16px | **14px** (GEMETEN) |
| Losse pictogramknop | 20px | 16px klein, 24px groot (GEMETEN) |
| Kleur | `currentColor` | `currentColor`, blijft |

Lijndikte 1,5 in plaats van 1,75 past bij een systeem waarin tekst op gewicht 500 zit in plaats van
600. Het huidige commentaar in `components/icon.tsx` beredeneert 1,75 tegen `font-semibold`; met
lichtere tekst hoort er een lichtere lijn bij.

### 5.8 Beweging, AFGELEID

OKX levert geen motion-tokens in de opgehaalde bundels. De waarden hieronder zijn die van de app nu,
en die zijn goed: kort en zonder opsmuk, precies wat bij dit systeem hoort.

```
--duration-fast:  120ms    kleur, achtergrond, rand
--duration-base:  150ms    hover op een kaart of rij
--duration-slow:  200ms    lade, menu, breedte van de zijbalk
--ease-standard:  cubic-bezier(0.4, 0, 0.2, 1)
--ease-out:       cubic-bezier(0, 0, 0.2, 1)
```

**Wat verdwijnt:** elke `transform` op hover. Geen `translateY`, geen `scale`. Bij OKX beweegt er
niets bij een hover, alleen de kleur verandert. Dat is een expliciete breuk met de huidige
kaartinteractie.

`@media (prefers-reduced-motion: reduce)` blijft zoals hij is.

### 5.9 Opmaak

| | Nu | Nieuw | Herkomst |
|---|---|---|---|
| Bovenbalk | 61px | **48px** | GEMETEN (`--global-header-height`) |
| Zijbalk | 240px | 240px, blijft | Past bij OKX' eigen navigatiebreedte |
| Zijbalk ingeklapt | 64px | 56px | AFGELEID, 48px item plus 4px lucht |
| Inhoud gecentreerd | 1024px | **1440px** | GEMETEN (`max-width:1859px` voor de buitenste band, 1270px voor de inhoudsband; 1440 zit daartussen en past bij de meeste schermen) |
| Inhoud volle breedte | bestaat niet | **geen maximum**, alleen 24px marge | Voor tabel- en analysepagina's |
| Zijmarge desktop | 24px | 24px | GEMETEN (kaartpadding boven 1024px) |
| Zijmarge tablet | 24px | 20px | GEMETEN |
| Zijmarge mobiel | 24px | 16px | GEMETEN |
| Verticale marge boven de inhoud | 40px | 24px | AFGELEID, hogere dichtheid |

**Breekpunten**, GEMETEN uit hun media queries: 375, 768, 1024, 1270, 1460, 1860. De app gebruikt
Tailwind-standaarden (640, 768, 1024, 1280, 1536). Die blijven, met één toevoeging:

```
--bp-dense: 1270px    hierboven krijgt een tabelpagina een extra kolom
```

---

## 6. Het tokenbestand

Zo komt `app/globals.css` eruit te zien. De driedelige opzet blijft (licht als volledige lijst, twee
donkere blokken die alleen herdefiniëren), want die is goed en het commentaar erbij legt uit waarom.

```css
:root,
:root[data-theme="light"] {
  color-scheme: light;

  /* Oppervlak */
  --bg-base: #f6f6f6;
  --bg-layer-1: #ffffff;
  --bg-surface: #ffffff;
  --bg-surface-raised: #f3f3f3;
  --bg-layer-2: #e9e9e9;
  --bg-layer-3: #dcdcdc;
  --bg-elevated-contrast: #ffffff;
  --bg-disabled: #fafafa;
  --bg-inverse: #000000;
  --bg-scrim: rgba(0, 0, 0, 0.43);
  --bg-stage: #f6f6f6;

  /* Tekst */
  --text-primary: #000000;
  --text-secondary: #383838;
  --text-tertiary: #5b5b5b;
  --text-subtle: #5e5e5e;
  --text-subtler: #858585;
  --text-disabled: #b3b3b3;
  --text-placeholder: rgba(0, 0, 0, 0.22);
  --text-inverse: #ffffff;

  /* Rand */
  --border-subtle: rgba(0, 0, 0, 0.06);
  --border-default: rgba(0, 0, 0, 0.14);
  --border-strong: rgba(0, 0, 0, 0.32);
  --border-primary: #e6e6e6;
  --border-emphasis: #4a4a4a;
  --border-selected: #000000;
  --border-focus: #000000;
  --line-muted: #ebebeb;
  --line-secondary: #dbdbdb;

  /* Accent */
  --accent: #2b6d17;
  --accent-hover: #225812;
  --accent-pressed: #18400c;
  --accent-on: #ffffff;
  --accent-highlight: #bcff2f;
  --accent-highlight-on: #000000;

  /* Interactie, werkt op elke ondergrond */
  --interactive-hover: rgba(0, 0, 0, 0.06);
  --interactive-active: rgba(0, 0, 0, 0.09);
  --interactive-pressed: rgba(0, 0, 0, 0.14);
  --interactive-disabled: rgba(0, 0, 0, 0.03);
  --interactive-selected: #000000;
  --interactive-selected-on: #ffffff;
  --interactive-oncolor-hover: hsla(0, 0%, 100%, 0.7);

  /* Betekenis: vier, niet zeven */
  --intent-success-content: #2b6d17;
  --intent-success-surface: #e9f4d1;
  --intent-success-solid: #3c8f24;
  --intent-warning-content: #ba5d00;
  --intent-warning-surface: #ffedcb;
  --intent-warning-solid: #fea01d;
  --intent-danger-content: #ba2133;
  --intent-danger-surface: #fee0e3;
  --intent-danger-solid: #e05a6a;
  --intent-info-content: #212121;
  --intent-info-surface: #f6f6f6;
  --intent-info-subtle: #757575;

  /* Richting: apart van betekenis, want dalen is geen fout */
  --trend-up: #31bd65;
  --trend-up-surface: #e0f5e8;
  --trend-up-tint: rgba(49, 189, 101, 0.2);
  --trend-down: #eb4b6d;
  --trend-down-surface: #fce4e9;
  --trend-down-tint: rgba(235, 75, 109, 0.2);
  --trend-flat: #5e5e5e;

  /* Grafiek */
  --chart-1: #2b6d17;   /* eigen merk */
  --chart-2: #0b5bcb;
  --chart-3: #e28400;
  --chart-4: #dbb01d;
  --chart-5: #a352ef;
  --chart-6: #5e5e5e;
  --chart-7: #858585;
  --chart-8: #afafaf;
  --chart-grid: var(--line-muted);
  --chart-axis: var(--text-subtle);

  /* Typografie */
  --font-sans: "Archivo", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, SFMono-Regular, monospace;

  /* Vorm */
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 6px;
  --radius-xl: 8px;
  --radius-xxl: 10px;
  --radius-xxxl: 12px;
  --radius-pill: 60px;
  --border-width: 1px;
  --border-width-emphasis: 1.5px;

  /* Diepte, alleen boven het scrim */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

  /* Maat */
  --header-h: 48px;
  --sidebar-w: 240px;
  --sidebar-w-collapsed: 56px;
  --content-max: 1440px;

  /* Beweging */
  --duration-fast: 120ms;
  --duration-base: 150ms;
  --duration-slow: 200ms;
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
}
```

Het donkere blok herdefinieert alleen wat anders is. De volledige lijst staat in §5.1; hier de
kern:

```css
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { /* zelfde inhoud */ } }

:root[data-theme="dark"] {
  color-scheme: dark;

  --bg-base: #000000;
  --bg-layer-1: #121212;
  --bg-surface: #171717;
  --bg-surface-raised: #1d1d1d;
  --bg-layer-2: #2c2c2c;
  --bg-layer-3: #3f3f3f;
  --bg-elevated-contrast: #343434;
  --bg-disabled: #0e0e0e;
  --bg-inverse: #ffffff;
  --bg-scrim: rgba(0, 0, 0, 0.68);
  --bg-stage: #000000;

  --text-primary: #ffffff;
  --text-secondary: #e6e6e6;
  --text-tertiary: #b3b3b3;
  --text-subtle: #969696;
  --text-subtler: #636363;
  --text-disabled: #5b5b5b;
  --text-placeholder: hsla(0, 0%, 100%, 0.3);
  --text-inverse: #000000;

  --border-subtle: hsla(0, 0%, 100%, 0.13);
  --border-default: hsla(0, 0%, 100%, 0.22);
  --border-strong: hsla(0, 0%, 100%, 0.4);
  --border-primary: #383838;
  --border-emphasis: #b8b8b8;
  --border-selected: #ffffff;
  --border-focus: #ffffff;
  --line-muted: #2e2e2e;
  --line-secondary: #404040;

  --accent: #bcff2f;
  --accent-hover: #9ce207;
  --accent-pressed: #87c600;
  --accent-on: #000000;

  --interactive-hover: hsla(0, 0%, 100%, 0.13);
  --interactive-active: hsla(0, 0%, 100%, 0.16);
  --interactive-pressed: hsla(0, 0%, 100%, 0.22);
  --interactive-disabled: hsla(0, 0%, 100%, 0.08);
  --interactive-selected: #ffffff;
  --interactive-selected-on: #000000;
  --interactive-oncolor-hover: hsla(0, 0%, 100%, 0.15);

  --trend-up: #25a750;
  --trend-down: #ca3f64;
  --trend-flat: #b8b8b8;

  --chart-1: #bcff2f;
  --chart-2: #277ae7;
  --chart-3: #ffb729;
  --chart-4: #edc746;
  --chart-5: #a352ef;
  --chart-6: #969696;
  --chart-7: #636363;
  --chart-8: #454545;
}
```

**De valstrik in `@theme inline` wordt opgeruimd.** `--color-base` verdwijnt, want daar komt
`text-base` uit als kleur. In de plaats komen namen die niet botsen: `--color-page`,
`--color-surface`, `--color-ink`.

---

## 7. Component voor component

Per component: de anatomie, de maten, en alle staten. **GEMETEN** en **AFGELEID** staan per
component aangegeven.

### 7.1 Button, GEMETEN

Vijf maten. De hoogte is BEREKEND uit `padding-vertical × 2 + line-height + border × 2`.

| Maat | Padding v | Padding h | Tekst | Regelhoogte | Rand | Hoogte | Min. breedte | Pictogram | Pict. marge |
|---|---|---|---|---|---|---|---|---|---|
| lg | 13px | 24px | 16px | 20px | 1px | **48px** | 108px | 18px | 8px |
| md | 9px | 16px | 14px | 20px | 1px | **40px** | 90px | 18px | 6px |
| sm | 7px | 12px | 14px | 20px | 1px | **36px** | 81px | 18px | 6px |
| s | 7px | 12px | 14px | 16px | geen | **30px** | 72px | 18px | 6px |
| xs | 5px | 8px | 12px | 16px | 1px | **28px** | 63px | 14px | 6px |

Gewicht altijd **500**. Radius `--radius-pill` (60px) voor de standaardknop, `--radius-md` (4px)
voor de rechthoekige variant (`rect`), en `--radius-xl` (8px) voor `rect` in maat lg en xl.

De app gebruikt nu drie maten (`btn-sm`, standaard, `btn-lg`). Die worden md als standaard, sm en
lg. De maten `s` en `xs` komen erbij voor tabelrijen en filterbalken.

**Varianten**, met de vulling en de staten:

```
primary (gevuld, contrast)
  rust        bg #ffffff (donker) / #000000 (licht)   tekst inverse
  hover       bg rgba(inverse, .8)
  ingedrukt   bg rgba(inverse, .7)
  uitgeschakeld bg --interactive-disabled             tekst --text-disabled
  bezig       bg rust, tekst 0 opaciteit, spinner 14px in het midden

accent (gevuld, limoen)
  rust        bg --accent          tekst --accent-on
  hover       bg --accent-hover
  ingedrukt   bg --accent-pressed
  Alleen voor de belangrijkste actie op een scherm. Hooguit één per scherm.

outline (rand, geen vulling)
  rust        bg transparant   rand --border-default   tekst --text-primary
  hover       bg --interactive-hover   rand --border-strong
  ingedrukt   bg --interactive-pressed
  uitgeschakeld rand --border-subtle   tekst --text-disabled

ghost (niets)
  rust        bg transparant   tekst --text-tertiary
  hover       bg --interactive-hover   tekst --text-primary
  ingedrukt   bg --interactive-pressed

danger (gevuld)
  rust        bg --intent-danger-solid   tekst #ffffff
  hover       bg #ff5d73 (donker) / #d33a4c (licht)
  ingedrukt   bg #f57a8a (donker) / #ba2133 (licht)
```

**Focus**, overal gelijk:

```css
outline: 2px solid var(--border-focus);
outline-offset: 2px;
```

Geen gloed, geen gekleurde ring. Dit is het OKX-patroon en het is beter dan wat er nu staat.

**Mobiel (onder 768px):** de standaardmaat wordt **lg (48px)** in plaats van md, want 40px is onder
de 44px die een vinger comfortabel raakt. Een knoppenrij wordt een kolom met de **hoofdactie
bovenaan**, niet onderaan: dat is GEMETEN bij OKX, hun dialoogvoet zet `flex-direction: column-reverse`.
De hoofdactie krijgt volle breedte.

### 7.2 IconButton, GEMETEN

| Maat | Doos | Pictogram | Randdikte |
|---|---|---|---|
| sm | 12px | 8px | 0,75px |
| md | 16px | 10px | 1px |
| lg | 24px | 16px | 1px |

Dit zijn OKX' eigen waarden en ze zijn klein. Voor ORBIT ENGINE komt er een vierde bij, AFGELEID,
want een knop van 24px is onder de 44px die een aanwijzer comfortabel raakt:

| Maat | Doos | Pictogram | Waarvoor |
|---|---|---|---|
| **xl** | 32px | 18px | Bovenbalk, kaartkop, alles wat los klikbaar is |

Varianten: `basic` (transparant, hover `--interactive-hover`), `circle` (gevuld met
`--interactive-selected`, radius pil), `circleOutline` (rand `--border-default`, radius pil).

### 7.3 Input, AFGELEID

OKX levert het veldcomponent niet in de opgehaalde bundels. De maten hieronder zijn doorgetrokken
uit de knopschaal, zodat een veld en een knop naast elkaar even hoog zijn.

| Maat | Hoogte | Padding h | Tekst | Radius |
|---|---|---|---|---|
| lg | 48px | 16px | 16px | `--radius-md` |
| md (standaard) | 40px | 12px | 14px | `--radius-md` |
| sm | 36px | 12px | 14px | `--radius-md` |

```
rust          bg --bg-surface   rand --border-default   tekst --text-primary
hover         rand --border-strong
focus         rand --border-focus (1px, niet dikker)
              plus outline 2px --border-focus met offset 2px
fout          rand --intent-danger-content
uitgeschakeld bg --bg-disabled   tekst --text-disabled   cursor not-allowed
tijdelijk     --text-placeholder
```

Dit is een echte wijziging: het veld is nu 8px rond met een `--border-strong` rand in rust. Het
wordt 4px met een lichtere rand, en de focus is een zwarte of witte ring in plaats van een paarse.

**Label boven het veld**, `body-xs-bold` (12px, 500), `--text-tertiary`, 6px eronder. Fouttekst
`body-xs`, `--intent-danger-content`, 4px onder het veld.

**Mobiel (onder 768px):** maat **lg (48px)**, en de tekst gaat naar **16px**. Die 16px is geen smaak:
Safari op iOS zoomt de hele pagina in zodra een veld met minder dan 16px focus krijgt, en daar komt
de bezoeker niet vanzelf uit. Het label blijft 12px.

### 7.4 Search, AFGELEID

Een `Input md` met een pictogram van 16px links op 12px, tekstpadding dus 36px links. Rechts een
wisknop (`IconButton sm`) die alleen verschijnt als er tekst staat. Radius `--radius-md`.

In de bovenbalk krijgt hij `--bg-layer-2` als vulling in plaats van een rand, want hij ligt op een
balk die zelf al een rand heeft.

### 7.5 Select en Dropdown, deels GEMETEN

De knop is een `Input md`. Het paneel, GEMETEN uit hun menu-opmaak:

```
bg          --bg-surface
rand        --border-subtle
radius      --radius-xl (8px)
schaduw     --shadow-lg
padding     4px verticaal
max-hoogte  320px, daarna scrollen
```

Een regel in het paneel:

```
hoogte      36px
padding     0 12px
tekst       body-sm (14px, 400)
hover       bg --interactive-hover
gekozen     bg --interactive-hover, tekst --text-primary, vinkje 16px rechts
```

**Geen accentkleur op de gekozen regel.** Het vinkje doet het werk. Dit is consequent bij OKX.

### 7.6 Tabs, AFGELEID

Twee soorten, en de app heeft ze allebei nodig.

**Onderstreept** (voor navigatie binnen een scherm, zoals de analysetabs):

```
hoogte        40px
padding       0 12px, 24px tussen tabs
tekst rust    body-sm (14px, 400), --text-tertiary
tekst actief  body-sm-bold (14px, 500), --text-primary
streep        2px --text-primary onder de actieve tab
hover         tekst --text-primary
rand onder    1px --line-muted over de hele breedte
```

**Segment** (voor een keuze uit twee of drie, zoals een periodefilter):

```
baan          bg --bg-layer-2, radius --radius-md, padding 2px
segment       hoogte 32px, padding 0 12px, radius --radius-sm
rust          tekst --text-tertiary
actief        bg --bg-surface, tekst --text-primary, --shadow-sm
```

### 7.7 Badge en Chip, AFGELEID

```
hoogte        20px (xs) / 24px (sm) / 28px (md)
padding       0 6px / 0 8px / 0 10px
tekst         body-xs (12px, 400), bij nadruk 500
radius        --radius-md (4px)
```

Varianten volgen de vier betekenissen plus neutraal:

```
neutraal      bg --bg-layer-2          tekst --text-tertiary       geen rand
succes        bg --intent-success-surface   tekst --intent-success-content
waarschuwing  bg --intent-warning-surface   tekst --intent-warning-content
fout          bg --intent-danger-surface    tekst --intent-danger-content
accent        bg --accent-highlight         tekst --accent-highlight-on
omlijnd       bg transparant   rand --border-default   tekst --text-tertiary
```

**Geen pilvorm.** De huidige `.chip` is rond; dat wordt 4px. Dit is een van de zichtbaarste
wijzigingen, want `chip` staat in 68 bestanden.

### 7.8 SelectionChip (filter), GEMETEN

Dit component heeft OKX wél geleverd en het is precies wat de analytics-filters nodig hebben.

| Maat | Min. hoogte | Min. breedte | Padding | Tekst | Radius |
|---|---|---|---|---|---|
| md | 36px | 32px | 8px | 14px / 16px, gewicht 400 | 8px |
| lg | 40px | 32px | 8px | 14px / 16px, gewicht 400 | 8px |

```
rust          bg --interactive-hover (dus de doorzichtige waas, geen eigen kleur)
hover         bg --interactive-active
ingedrukt     bg --interactive-pressed
gekozen       rand --border-selected
uitgeschakeld bg --interactive-disabled, tekst --text-disabled
afstand       8px tussen chips
```

Let op: gekozen is een **rand** en geen vulling. Weer hetzelfde patroon.

### 7.9 Tooltip, AFGELEID

```
bg            --bg-inverse
tekst         --text-inverse, body-xs (12px)
padding       6px 8px
radius        --radius-md
max-breedte   280px
schaduw       --shadow-lg
vertraging    300ms openen, 100ms sluiten
pijltje       geen
```

Omgekeerd contrast, want dat is wat OKX doet en het werkt in beide standen zonder variant.

### 7.10 Card, GEMETEN

```
bg            --bg-surface
rand          1px --border-primary
radius        --radius-xl (8px)
padding       16px, vanaf 768px 20px, vanaf 1024px 24px
schaduw       geen
```

**Dat is de hele kaart.** Geen glas, geen blur, geen schaduw. Vergelijk met nu:

| | Nu | Nieuw |
|---|---|---|
| Vulling | `--glass-surface` (72% doorzichtig wit) | `--bg-surface` dekkend |
| Blur | `blur(12px) saturate(1.06)` | geen |
| Schaduw | `0 1px 2px rgba(23,33,43,.03)` | geen |
| Radius | 12px | 8px |
| Padding | 20px vast | 16 tot 24, responsief |

**Klikbare kaart** (`card-interactive`):

```
hover         bg --bg-surface-raised, rand --border-emphasis
ingedrukt     bg --bg-layer-2
focus         outline 2px --border-focus, offset 2px
```

Geen `translateY`, geen `scale`. De kaart beweegt niet.

**Datakaart** (het statistiekblokje):

```
bg            --bg-layer-1
radius        --radius-xxxl (12px)   ← GEMETEN, de datakaart is ronder dan de gewone kaart
padding       16px, 20px vanaf 768px, 24px vanaf 1024px
label         body-xs (12px, 400), --text-tertiary
waarde        heading-md (24px, 500), --text-primary, tabular-nums
verschil      body-sm (14px, 400), --trend-up of --trend-down
afstand       4px tussen label en waarde, 8px tussen waarde en verschil
```

### 7.11 Table, GEMETEN

Hier zijn echte cijfers uit hun marktentabel (`CoinList-DIgNSTOZ.css`).

```
thead th      hoogte 39px
tbody tr      hoogte 60px   (ruime stand)
tbody td      14px / 16px, gewicht 400, --text-primary, verticaal gecentreerd
rij hover     bg --bg-surface-raised
```

De primaire cel in een rij is 16px op gewicht 500, de secundaire eronder 12px op
`--text-tertiary`. Dat is het patroon: **twee regels in één cel**, niet twee kolommen.

ORBIT ENGINE krijgt drie dichtheden, want een tabel met 200 clusters is iets anders dan een tabel
met acht concurrenten:

| Dichtheid | Kop | Rij | Tekst | Waarvoor |
|---|---|---|---|---|
| ruim | 39px | **60px** | 14px | Weinig rijen, twee regels per cel (GEMETEN) |
| standaard | 36px | **44px** | 14px | De meeste tabellen (AFGELEID) |
| dicht | 32px | **36px** | 13px | Lange lijsten, clusters, antwoorden (AFGELEID) |

```
kop           body-xs (12px, 500), --text-subtle, hoofdletters uit
              bg --bg-base, sticky, rand onder 1px --line-muted
rij           rand onder 1px --line-muted
              laatste rij geen rand
getal         rechts uitgelijnd, tabular-nums
gesorteerd    kop --text-primary met pijl 14px
klikbaar      cursor pointer, hover --bg-surface-raised
gekozen       bg --interactive-hover, links 2px --border-selected
leeg          zie 7.21
laden         zie 7.20
```

De tabel is nu `py-1.5` (ongeveer 34px) met een glazen sticky kop. Dat wordt een dekkende kop op
`--bg-base` en rijen van 44px. Dichter voelt het niet, want er komt regelhoogte 1,5 in.

**Mobiel (onder 768px):** geen kaart per rij en geen horizontaal schuiven, maar het gemeten
OKX-patroon uit 8.12.1: **twee kolommen van 50%, elk met twee waarden gestapeld.**

```
links (50%)                        rechts (50%, rechts uitgelijnd)
  hoofdwaarde   14px / 500           kerncijfer    14px / 500, tabular-nums
  bijschrift    12px / --text-tertiary   verandering  12px / --trend-up of --trend-down
```

Welke vier van de zeven gegevens meegaan, is per tabel een ontwerpkeuze en geen automatisme. Die
keuze staat per scherm in stap 10. De overige kolommen worden **niet gerenderd**, niet verborgen.

Rijhoogte op mobiel: **64px**, want twee regels plus lucht, en dat is meteen een ruim aanraakvlak.
Een tik opent het detailblad (7.14) met alle gegevens.

### 7.12 Chart, GEMETEN palet, AFGELEID opmaak

```
lijn eigen merk   2px --chart-1
lijn concurrent   1,5px --chart-2 tot --chart-5
lijn overig       1px --chart-6 tot --chart-8
raster            1px --chart-grid, alleen horizontaal
as                --chart-axis, body-xs (12px)
band onder lijn   --trend-up-tint of --accent met 12% opaciteit
punt              alleen bij hover, 4px
referentielijn    1px gestippeld --border-strong
```

**Geen gloed onder de lijn.** De `--accent-purple-glow` van nu verdwijnt.

De tooltip bij een grafiekpunt volgt 7.9, met per reeks een blokje van 8px in de reekskleur, dan
de naam, dan de waarde rechts uitgelijnd op tabular-nums.

### 7.13 Modal, GEMETEN

```
scrim         --bg-scrim, geen blur
paneel        bg --bg-elevated-contrast
              radius --radius-xxxl (12px)
              schaduw --shadow-xl
              min-breedte 280px, max-breedte 520px
kop           padding 24px 24px 0
              heading-sm (18px, 500)
inhoud        padding 32px 24px, body-sm (14px / 20px)
voet          padding 0 24px 24px, knoppen rechts, 8px ertussen
sluitknop     IconButton xl rechtsboven, 16px van de rand
```

Dit zijn OKX' eigen dialoogwaarden, letterlijk. De paddings 24 en 32 kloppen met
`--okd-dialog-confirm-container-padding-top: 32px` en `--okd-dialog-confirm-title-padding-horizontal: 24px`.

**Mobiel (onder 768px), GEMETEN bij OKX:** het paneel wordt een blad van onderen (7.14). De
paddings gaan naar hun `sm`-set: **16px horizontaal** in plaats van 24. De knoppen krijgen volle
breedte en de rij wordt `column-reverse`, dus de hoofdactie komt bovenaan.

### 7.14 Drawer, AFGELEID

```
breedte       420px, max 90vw
bg            --bg-surface
rand          links 1px --border-primary
schaduw       --shadow-xl
kop           56px, rand onder --line-muted, heading-sm
inhoud        padding 24px, scrollbaar
voet          rand boven --line-muted, padding 16px 24px
beweging      200ms --ease-out, van rechts
```

**Mobiel (onder 768px): een blad van onderen, geen lade van rechts.**

```
breedte       volle breedte
hoogte        tot 90vh, inhoud scrollt
radius        --radius-xxxl, alleen linksboven en rechtsboven
greep         36px bij 4px, --border-strong, gecentreerd, 8px van de bovenkant
sluiten       naar beneden slepen, of tikken op het scrim
beweging      250ms --ease-out, van onderen
kop           56px, titel gecentreerd, sluitknop rechts
```

De sleepgreep is geen versiering: zonder zichtbare greep probeert niemand te slepen, en dan is de
enige uitweg het scrim, dat op een telefoon vaak maar een paar pixels hoog is.

### 7.15 Toast, GEMETEN

OKX noemt dit `message` en levert de waarden:

```
min-breedte   451px
max-breedte   700px
padding       16px
radius        --radius-md (4px)
schaduw       --shadow-xl
pictogram     18px, 15px tot de tekst
tekst         body-sm (14px / 20px)
tussen twee   14px
positie       rechtsboven, 24px van de rand, onder de bovenbalk
duur          4000ms, bij een fout blijft hij staan
```

De vulling volgt de betekenis: `--intent-*-surface` met een rand in `--intent-*-content` op 20%.
**Mobiel (onder 768px):** volle breedte min 32px, van bovenaf, onder de bovenbalk. Niet van
onderen, want daar zit de onderbalk (8.12.4) en een melding die daaroverheen valt verbergt de
navigatie.

### 7.16 Alert, AFGELEID

Een blok in de pagina, niet zwevend.

```
padding       12px 16px
radius        --radius-md
bg            --intent-*-surface
rand          1px --intent-*-content op 20% opaciteit
pictogram     16px, --intent-*-content, 8px tot de tekst
titel         body-sm-bold (14px, 500), --text-primary
tekst         body-sm, --text-secondary
```

De vier betekenissen plus neutraal. Informatie is grijs, zie §5.1.5.

### 7.17 Sidebar, deels GEMETEN

```
breedte       240px, ingeklapt 56px
bg            --bg-base (dus gelijk aan de pagina, niet aan de kaart)
rand rechts   1px --line-muted
padding       8px
```

**Navigatie-item:**

```
hoogte        36px          ← nu py-2 met text-sm, ongeveer 36px, dus dit klopt al
padding       0 12px
radius        --radius-md (4px)   ← nu 8px
tekst         body-sm (14px, 400), --text-tertiary
pictogram     16px, 8px tot het woord
hover         bg --interactive-hover, tekst --text-primary
actief        bg --interactive-hover, tekst --text-primary, gewicht 500
              plus links 2px --border-selected over de volle hoogte
uitgeschakeld tekst --text-disabled
```

**De actieve staat verandert wezenlijk.** Nu is het een gevuld blok in `--bg-elevated`. Dat wordt
een lichte waas plus een streep links, zoals OKX. Het gevulde blok trekt te veel aandacht in een
lijst van twintig bestemmingen.

**Hoofdstukkop:**

```
tekst         heading-overline (12px, 500, hoofdletters, 0,04em)
kleur         --text-subtle
padding       0 12px
hoogte        32px
marge boven   8px, behalve de eerste
```

Nu is de kop 15px op gewicht 600 in `--text-primary`. Dat is zwaarder dan de bestemmingen eronder
en dat is precies omgekeerd aan wat OKX doet: daar is de kop klein en gedempt, en de bestemmingen
zijn de inhoud.

**Ingeklapt (768 tot 1024px):** alleen pictogrammen, 40px hoog, gecentreerd, met een tooltip rechts.

**Mobiel (onder 768px): de zijbalk bestaat niet.** Hij wordt vervangen door de onderbalk (8.12.4),
en de bestemmingen die daar niet in passen zitten in het "Meer"-blad. Dit is geen lade met dezelfde
inhoud: twintig bestemmingen in hoofdstukken is een desktoppatroon, en op een telefoon is het een
lijst waar je doorheen moet scrollen om te navigeren.

### 7.18 Topbar, GEMETEN

```
hoogte        48px          ← nu 61px
bg            --bg-base
rand onder    1px --line-muted
padding       0 16px
schaduw       geen
blur          geen          ← nu backdrop-blur-md
positie       sticky, z-index 30
```

Links: het woordmerk (16px, gewicht 600, `--text-primary`, geen verloop), daarnaast de merkkiezer.
Rechts: de vragenteller, de weergavewissel, het accountmenu, de standwissel. Alles `IconButton xl`
(32px) met 4px ertussen.

**Het woordmerk verliest zijn verloop.** `--brand-gradient` verdwijnt. Bij OKX is het merk wit in
donker en zwart in licht, en verder niets.

### 7.19 Breadcrumb, AFGELEID

```
tekst         body-xs (12px, 400), --text-subtle
scheiding     `/` in --text-subtler, 8px ertussen
laatste       --text-primary, geen link
hover         --text-primary
hoogte        20px, 16px onder de paginakop
```

### 7.20 Loading en Skeleton, GEMETEN

Spinner, OKX' eigen maten:

| Maat | Doorsnede | Baan |
|---|---|---|
| sm | 14px | 1,5px |
| md | 22px | 1,82px |
| lg | 30px | 2px |
| xl | 38px | 2px |

```
baan          --border-subtle
streep        --text-primary
snelheid      800ms lineair
tekst eronder body-sm, --text-tertiary, 10px afstand
```

Skeleton:

```
bg            --bg-layer-2
radius        --radius-md, bij tekst --radius-sm
puls          1500ms, opaciteit 1 tot 0,4 en terug
hoogte        gelijk aan de regelhoogte van wat er komt
```

**Geen verlopende glans die overheen schuift.** Alleen een puls. Dat is rustiger en het past bij
een systeem zonder decoratie.

### 7.21 EmptyState, AFGELEID

```
padding       48px 24px, gecentreerd
pictogram     32px, --text-subtler
titel         heading-sm (18px, 500), --text-primary, 16px onder het pictogram
tekst         body-sm, --text-tertiary, max 420px, 8px onder de titel
knop          Button md, 24px onder de tekst
```

**Geen illustratie.** De lege staat is tekst plus één lijnpictogram. Dat is wat OKX doet en het
scheelt een hele categorie beeldmateriaal die anders onderhouden moet worden.

### 7.22 ErrorState, AFGELEID

Zelfde opbouw als 7.21, met:

```
pictogram     --intent-danger-content
titel         wat er misging, in gewone taal
tekst         wat de lezer nu kan doen
knop          "Opnieuw proberen", Button md outline
technisch     details in een <details> eronder, body-xs, --text-subtler
```

### 7.23 AI insight en AI recommendation, AFGELEID

Dit component bestaat niet bij OKX; het is het hart van ORBIT ENGINE. De vorm volgt de kaart, met
drie dingen die het onderscheiden.

```
bg            --bg-surface
rand          1px --border-primary, links 2px --accent
radius        --radius-xl
padding       16px, 20px vanaf 768px
```

**Opbouw van boven naar beneden:**

1. **Kopregel.** Pictogram 16px in `--accent`, dan het soort advies in `heading-overline`
   (12px, 500, hoofdletters) in `--text-subtle`. Rechts de zekerheid als badge (7.7).
2. **De bewering.** `body-md-bold` (16px, 500), `--text-primary`. Eén zin.
3. **De onderbouwing.** `body-sm` (14px), `--text-secondary`. Het cijfer waar de bewering op rust,
   in `--text-primary` met tabular-nums.
4. **De bron.** `body-xs`, `--text-subtler`, met een link naar het antwoord of de meting.
5. **De actie.** `Button sm`, links uitgelijnd, 16px erboven.

**De regel die erbij hoort en die uit `CLAUDE.md` komt:** als de zekerheid onbekend is, staat er
"onbekend" en geen percentage. Punt 3 van de code-conventies ("onbekend is een betere waarde dan
een verkeerde") krijgt hier zijn eigen visuele vorm: een badge `neutraal` met het woord onbekend,
niet een badge `waarschuwing` met een laag getal.

### 7.24 DatePicker, GEMETEN

```
paneel        bg --bg-surface, radius --radius-xl, schaduw --shadow-lg
dagcel        36px bij 36px
dag gekozen   bg --text-primary, tekst --text-inverse
dag hover     bg --interactive-hover
vandaag       rand 1px --border-focus
buiten bereik --text-disabled
weekkop       body-xs, --text-subtle
snelkeuze     knop xs, bg --interactive-hover, 12px boven het paneel
voet          rand boven --border-subtle, knoppen maat s
```

### 7.25 Filter, samengesteld

Een filterbalk is een rij `SelectionChip md` (7.8) met 8px ertussen, plus rechts een
`Button sm ghost` om alles te wissen. Op een tabelscherm staat hij tussen de paginakop en de tabel,
met 16px eronder.

---

## 8. Pagina voor pagina

Alle 50 paginaroutes, gegroepeerd. Per groep: wat er nu staat, welk OKX-scherm het patroon levert, en wat
er verandert.

### 8.1 De drie opmaakstanden

Eerst een keuze die alle pagina's raakt. De app heeft nu één stand: 1024px gecentreerd. Dat wordt
er drie, en elke route kiest er één.

| Stand | Max. breedte | Waarvoor | OKX-equivalent |
|---|---|---|---|
| `lezen` | 720px | Formulier, instellingen, één stuk tekst | Hun accountinstellingen |
| `werken` | 1440px | De meeste schermen, kaarten in een raster | Hun accountoverzicht |
| `data` | geen maximum, 24px marge | Tabel, grafiek, vergelijking | Hun `/markets/prices` |

Dit is de kern van het desktopverzoek. Een tabel met twaalf kolommen hoort niet in 1024 pixels
geperst te worden als het scherm 2560 breed is.

Technisch: `app/(app)/layout.tsx` geeft geen breedte meer mee. Elke `page.tsx` zet zijn eigen stand
met een klasse `.stand-lezen`, `.stand-werken` of `.stand-data` op de buitenste wikkel.

### 8.2 De inlogroute, `app/(auth)/`

**Nu:** één gecentreerde kaart van 520px, radius 12, padding 32/24, op `--bg-stage`. Een mono-kopje
boven de titel, velden van 44px met een pictogram, een knop van 44px, een afsluitregel onder een
streep. `docs/designsystem.md` §9b noemt dit een ingeperkte uitzondering, letterlijk overgenomen van
Nova.

**OKX-equivalent:** hun inlogscherm. Een kaart op een vlakke grond, zonder decor.

**Nieuw**, vier routes tegelijk (`login`, `register`, `wachtwoord-vergeten`, `wachtwoord`,
`uitnodiging/[token]`):

```
grond         --bg-base (dus zwart in donker, #f6f6f6 in licht), vlak
kaart         480px, radius --radius-xxxl (12px)
              bg --bg-surface, rand 1px --border-primary, geen schaduw
padding       32px, vanaf 640px 40px
woordmerk     boven de kaart, 24px eronder, --text-primary, geen verloop
bovenkopje    heading-overline, --text-subtle, 8px onder de titel
titel         heading-lg (30px, 500)
onderschrift  body-sm, --text-tertiary, 24px eronder
veld          Input lg (48px), 16px ertussen
label         body-xs-bold, --text-tertiary, 6px boven het veld
knop          Button lg volle breedte, variant primary, 24px boven
afsluitregel  body-xs, --text-subtle, boven een streep --border-subtle, 24px erboven
fout          Alert danger (7.16) boven het eerste veld
```

De wachtwoordwissel in het veld wordt een `IconButton md` rechts binnen het veld.

**Dit heft de uitzondering uit §9b op.** De inlogroute gebruikt na deze wijziging dezelfde tokens
en dezelfde componenten als de rest van de app. Er blijft geen apart `.auth-`-blok over behalve de
opmaak van het toneel zelf. Dat is winst: één systeem in plaats van anderhalf.

### 8.3 Het merkoverzicht, `/merk/[id]`

934 regels, de startpagina na inloggen. Vier secties: "Waar je begint", "Je contentplan", "Wat
ORBIT ENGINE deed", "Ouder werk van deze week".

**OKX-equivalent:** hun `/balance/overview`. Een strook kerncijfers bovenaan, daaronder blokken die
elk een deel van de portefeuille tonen, elk met een eigen kop en een doorklik rechts.

**Nieuw:**

```
stand         werken (1440px)
kop           PageHeader (8.9)
kerncijfers   raster van 4 DataCards (7.10), 16px ertussen
              onder 1280px 2 kolommen, onder 640px 1
              elk: zichtbaarheidsscore, aantal clusters, positie tegenover concurrenten,
              wat er deze week veranderde, met --trend-up of --trend-down
secties       elk een SectionHeading (8.10) plus inhoud, 32px ertussen
"Waar je begint"  maximaal 3 AI recommendations (7.23) onder elkaar, 12px ertussen
"Je contentplan"  Table standaard (7.11), maximaal 5 rijen, daaronder een ghost-knop
                  naar het volledige plan
"Wat ORBIT ENGINE deed"  tijdlijn: per regel 32px, links een 16px pictogram in
                  --text-subtle, dan de handeling in body-sm, rechts de tijd in
                  body-xs --text-subtler
```

De `collapsible-section` die hier negen keer gebruikt wordt, krijgt de accordion-maten van OKX
(7.26 hieronder): kop 18px op 500, pictogram 20px rechts, rand onder `--border-subtle`.

### 8.4 Analytics, `/merk/[id]/analytics` plus drie subroutes

De vier zwaarste dataschermen: zichtbaarheid in AI (500 regels), concurrenten (316), reputatie
(715), zoekverkeer (435).

**OKX-equivalent:** `/markets/prices`. Filterbalk boven, brede tabel eronder, grafiek ernaast.

**Nieuw:**

```
stand         data (volle breedte)
kop           PageHeader met rechts de periodekeuze als Tabs segment (7.6)
filters       rij SelectionChips (7.8), 16px onder de kop, 16px eronder
hoofdgrafiek  Chart (7.12) in een Card, hoogte 320px, volle breedte
              eronder een legenda: per reeks een blokje 8px plus body-xs
tabel         Table dicht (7.11) daaronder, sticky kop
              onder 1270px vallen de drie minst belangrijke kolommen weg
              vanaf 1270px komt er een sparkline-kolom bij
detail        klik op een rij opent de Drawer (7.14) rechts, niet een nieuwe pagina
```

Dat laatste is een echte verbetering en het is puur OKX: een rij openen mag je niet je plek in de
lijst kosten. De `detail-panel` die er al is wordt de lade.

**Reputatie** (715 regels) heeft toonverdeling en criteria. De verdeling wordt een gestapelde balk
van 8px hoog met de drie trendkleuren, niet een taartdiagram.

### 8.5 Strategie, `/merk/[id]/strategie/*`

Vijf routes: clusters, vragen, plan, plan/versies, bibliotheek.

**OKX-equivalent:** hun ordergeschiedenis. Een lijst met een staat per regel, filterbaar, met een
detaillade.

**Nieuw:**

```
stand         data voor clusters en bibliotheek, werken voor plan en vragen
clusters      Table standaard, kolom "cluster" met twee regels per cel
              (naam op 14px/500, aantal vragen op 12px --text-tertiary)
              staat als Badge (7.7)
vragen        lijst van kaarten, elk een vraag met de antwoordknoppen eronder
              open vraag krijgt links 2px --accent
plan          Table standaard met de weekindeling, versies via een Select (7.5)
versies       VersionDiff, met --trend-up-surface voor toegevoegd en
              --trend-down-surface voor verwijderd
```

### 8.6 Admin en beheer, `/merk/[id]/admin/*` plus `/beheer/*`

Zes plus drie routes, alleen zichtbaar voor de eigen organisatie.

**OKX-equivalent:** hun instellingenschermen. Formulieren in secties, links een inhoudsopgave.

**Nieuw:**

```
stand         lezen (720px) voor formulieren, werken voor de overzichten
formulier     velden onder elkaar, 16px ertussen, secties 32px
              per sectie een SectionHeading plus een streep eronder
inhoudsopgave vanaf 1280px links naast het formulier, sticky, 200px breed
              regels 32px, actieve regel --text-primary met 2px --border-selected links
opslaan       balk onderaan die vastplakt zodra er iets gewijzigd is
              bg --bg-surface, rand boven --border-primary, padding 12px 24px
```

Die opslagbalk is nieuw en hij lost een echt probleem op: een formulier van 365 regels heeft zijn
opslagknop nu ergens onderaan.

### 8.7 Sales, `/sales/*`

Zes routes. `CLAUDE.md` zegt: intern, een klant ziet er niets van, en de scheiding staat in de
database.

**OKX-equivalent:** hun handelsoverzicht. Een werklijst waarin je van boven naar beneden afwerkt.

**Nieuw:**

```
stand         werken voor het startscherm, data voor markten en prospects
startscherm   "Wat moet je vandaag doen?" blijft de kop
              daaronder een werklijst: per regel 64px, links de prospect met twee
              regels, midden de reden in body-sm, rechts een Button sm
markten       Table dicht met de saleskansen, gesorteerd op score
prospect      stand werken, twee kolommen vanaf 1024px:
              links het dossier, rechts de conceptmail in een Card
outreach      de conceptmail in een veld met vaste breedte van 680px
```

**De visuele scheiding met de klantkant blijft, en hij wordt strakker.** Nu is Sales alleen een
aparte sectie in de zijbalk. Voorstel: de bovenbalk krijgt in de Sales-routes een streep van 2px in
`--intent-warning-solid` direct onder zich. Eén regel CSS, en je ziet in één oogopslag dat je in
een intern scherm zit. Dat is precies het soort ding dat voorkomt dat er een intern cijfer in een
klantgesprek belandt.

### 8.8 De overige routes

| Route | Stand | Wat verandert |
|---|---|---|
| `/analyses` en `/analyses/[id]/*` (9 routes) | werken | Tabs onderstreept (7.6) voor de subnavigatie, kaarten naar 7.10 |
| `/merk` en `/merk/nieuw` | werken | Merkenlijst wordt Table standaard, `/nieuw` wordt stand lezen |
| `/instellingen` en `/instellingen/koppelingen` | lezen | Formulierpatroon uit 8.6 |
| `/support` (764 regels) | lezen | Wordt een accordion-lijst (7.26), nu losse blokken |
| `/markt/[slug]` | werken | Publieke pagina, zelfde tokens |
| `/` | werken | Doorverwijzing, geen vormgeving |
| `/solliciteren` | **ongemoeid** | Eigen stijlblad, eigen layout, zie `README.md` |

**Het zijproject blijft er helemaal buiten.** `app/solliciteren/solliciteren.css` (29.622 b) wordt
niet aangeraakt. `CLAUDE.md` is daar duidelijk over en er is geen reden om die grens hier te
overschrijden.

### 8.9 PageHeader

```
hoogte        auto, 24px onder de bovenkant van de inhoud
breadcrumb    7.19, 8px boven de titel, alleen als er een niveau boven zit
titel         heading-lg (30px, 500), --text-primary
onderschrift  body-sm, --text-tertiary, 4px onder de titel, max 640px
acties        rechts uitgelijnd, op dezelfde regel als de titel
              onder 768px onder de titel, 16px erboven
streep        geen         ← nu staat er een rand onder
marge onder   24px
```

### 8.10 SectionHeading

```
titel         heading-sm (18px, 500)
meta          body-xs, --text-subtle, rechts
streep        1px --line-muted over de volle breedte, 8px onder de titel
marge onder   16px
marge boven   32px
```

### 8.11 Accordion (CollapsibleSection), GEMETEN

```
kop           padding 32px 0        ← GEMETEN, OKX' eigen waarde
titel         18px / 24px, gewicht 500
titel klein   14px / 16px, gewicht 500
pictogram     20px rechts, 16px in de kleine variant, draait 180° bij openen
rand onder    1px --border-subtle
inhoud        14px, regelhoogte 1,58, --text-subtle
marge         16px tussen kop en inhoud, 8px in de kleine variant
```

De 32px verticale padding is ruim en het is echt hun waarde. Voor `/support` met tientallen vragen
is de kleine variant beter; die krijgt 16px.

### 8.12 Twee ontwerpen, niet één dat meeschaalt

**Het uitgangspunt, vastgesteld door de eigenaar op 17 september 2026:** desktop wordt ontworpen
zonder één concessie aan mobiel, en mobiel krijgt een eigen ontwerp waar het desktoppatroon niet
overzet. Geen van beide is een geschaalde versie van de ander. Dat kost meer werk en dat is
geaccepteerd.

#### 8.12.1 Wat OKX zelf doet, GEMETEN

Dit is geen aanname. Dezelfde pagina (`/markets/prices`) is met een desktop- en een
telefoon-useragent opgehaald en de HTML verschilt:

| | Desktop | Telefoon |
|---|---|---|
| Kolommen | **7** (naam, koers, verandering, grafiekje, bereik, marktwaarde, actie) | **2** (naam 50%, koers 50%) |
| Rijopbouw | één waarde per cel | **twee waarden gestapeld per cel** |
| Weggelaten | niets | bereik, grafiekje, marktwaarde, actie |
| HTML-omvang | 161.978 b | 132.122 b |

De mobiele cel links draagt het teken (16px, gewicht 500) met de volledige naam eronder (12px,
`--text-tertiary`). De cel rechts draagt de koers met de verandering eronder (12px, in de
stijgkleur of de daalkleur). Vier gegevens in een raster van 2 bij 2, in plaats van zeven naast
elkaar.

**Drie dingen die hieruit volgen:**

1. **De weggelaten kolommen worden niet verborgen, ze worden niet gerenderd.** Geen
   `display: none`, geen horizontaal schuiven. Ze zitten niet in de HTML.
2. **Componenten hebben een mobiele variant**, geen breekpunt. In hun opmaak staat letterlijk een
   klasse `is-mobile` naast de gewone klassen.
3. **Aanraakvlakken worden groter, niet kleiner.** Hun tabbladen staan op desktop in maat `md` en op
   de telefoon in `xl` en `xxl`.

**Eén ding uit hun mobiele opzet nemen we niet over.** Hun viewport staat op
`maximum-scale=1.0, user-scalable=no`. Dat zet inzoomen uit, en dat is een toegankelijkheidsfout:
wie slecht ziet kan de tekst niet vergroten. ORBIT ENGINE houdt `width=device-width, initial-scale=1`
en verder niets.

#### 8.12.2 Drie soorten schermen

Niet elk van de 50 schermen heeft hetzelfde soort mobiele ontwerp nodig. Ze vallen in drie groepen,
en per groep is de aanpak anders.

**Groep A, lezen en beslissen.** Het merkoverzicht, de rapporten, de vragenlijst, support, de
publieke marktpagina. Op de telefoon net zo compleet als op de computer, want er valt niets weg:
het is tekst, cijfers en knoppen. Eén kolom, grotere aanraakvlakken, verder gelijk.

Routes: `/merk/[id]`, `/merk/[id]/strategie/vragen`, `/analyses/[id]/rapport`, `/support`,
`/markt/[slug]`, de hele inlogroute. **13 van de 50.**

**Groep B, data.** Analytics, clusters, bibliotheek, de salesmarkten en de prospectlijsten. Hier
geldt het OKX-patroon letterlijk: op de telefoon minder gegevens, met opzet gekozen, gestapeld in
plaats van naast elkaar. De volledige diepte zit achter een tik op de rij.

Routes: alle `analytics`-routes, `strategie/clusters`, `strategie/bibliotheek`, `sales/markten`,
`sales/prospects`, `analyses`, `beheer/kwaliteit`. **19 van de 50.**

**Groep C, werkbank.** De beheerformulieren, het toewijzen van clusters, het bewerken van een
merkprofiel, het schrijven van een concept. Dit zijn taken die op een computer horen, en dat is geen
gebrek aan de telefoon maar een eigenschap van de taak: een formulier van 365 regels is op een
telefoon nooit een goed formulier.

**Dat betekent niet dat ze op de telefoon niet werken.** Het betekent dat ze er een ándere vorm
krijgen: niet één lange pagina met alles, maar een stappenflow van één sectie per scherm, met een
voortgangsbalk en een opslagknop die vastzit onderaan. Dat is voor een telefoon het betere ontwerp,
en op de computer zou het juist hinderlijk zijn. Dit is precies waar "twee ontwerpen" iets oplevert.

Routes: `merk/[id]/admin/*`, `merk/[id]/merkprofiel/bewerken`, `analyses/[id]/concept`,
`analyses/[id]/briefing`, `instellingen/*`, `merk/nieuw`. **18 van de 50.**

#### 8.12.3 De mobiele ontwerpregels

Wat er op de telefoon anders is dan op de computer, als lijst.

| | Desktop | Telefoon |
|---|---|---|
| Navigatie | Zijbalk 240px, hoofdstukken, 20 bestemmingen zichtbaar | **Balk onderaan** met 5 bestemmingen, de rest in een blad |
| Bovenbalk | 48px, woordmerk plus merkkiezer plus 4 knoppen | **52px**, terugknop plus schermtitel plus 1 knop |
| Aanraakvlak | 32px is genoeg voor een aanwijzer | **minimaal 44px**, altijd |
| Knop | md (40px) als standaard | **lg (48px)** als standaard, volle breedte bij de hoofdactie |
| Invoerveld | md (40px) | **lg (48px)**, en 16px tekst zodat iOS niet inzoomt |
| Tabblad | onderstreept, 40px | **onderstreept, 48px**, horizontaal schuifbaar met de actieve in beeld |
| Tabel | tot 7 kolommen | **2 kolommen, waarden gestapeld** (8.12.1) |
| Rijdetail | lade rechts, 420px | **blad van onderen**, tot 90vh, met een sleepgreep |
| Dialoog | gecentreerd, 520px | **blad van onderen**, volle breedte, radius alleen bovenaan |
| Knoppenrij | naast elkaar, rechts | **onder elkaar, hoofdactie bovenaan** (GEMETEN: OKX zet `column-reverse`) |
| Melding | rechtsboven, 451px | **bovenaan, volle breedte min 32px** |
| Zijmarge | 24px | **16px** |
| Kaartpadding | 24px | **16px** (GEMETEN) |
| Formulier | alle secties onder elkaar | **stappenflow**, één sectie per scherm (groep C) |
| Grafiek | 320px hoog, legenda ernaast | **220px hoog, legenda eronder**, aanraken in plaats van zweven |

**De typografie verandert niet.** 14px blijft 14px, want kleiner lezen op een telefoon is niet
prettiger. Alleen wat je aanraakt wordt groter.

#### 8.12.4 De onderbalk

Het enige echt nieuwe navigatiecomponent. Op de telefoon vervangt hij de zijbalk volledig.

```
hoogte        56px plus de veilige zone onderaan (env(safe-area-inset-bottom))
bg            --bg-surface
rand boven    1px --line-muted
posities      5, gelijk verdeeld
per positie   pictogram 22px boven een label van 10px, gewicht 500
              rust    --text-subtle
              actief  --text-primary, pictogram gevuld in plaats van lijn
aanraakvlak   volledige hoogte, minimaal 56px breed
```

De vijf posities: **Overzicht**, **Zichtbaarheid**, **Plan**, **Vragen**, **Meer**. De laatste opent
een blad met de overige bestemmingen, de merkkiezer, de standwissel en uitloggen. Voor een
salesmedewerker verschuift de set naar **Vandaag**, **Markten**, **Prospects**, **Outreach**,
**Meer**.

#### 8.12.5 De breekpunten

| Breedte | Ontwerp | Wat er gebeurt |
|---|---|---|
| vanaf 1440px | desktop | Stand `werken` stopt met groeien, stand `data` gebruikt alles |
| 1270 tot 1440px | desktop | Volledige tabellen, de sparkline-kolom verschijnt |
| 1024 tot 1270px | desktop | Zijbalk blijft, tabellen laten de drie minst belangrijke kolommen vallen |
| 768 tot 1024px | **tussenstand** | Zijbalk wordt ingeklapt (56px, alleen pictogrammen), tabellen houden 4 kolommen, dialogen blijven gecentreerd |
| onder 768px | **mobiel** | Het volledige mobiele ontwerp uit 8.12.3 |

**De grens ligt op 768px en er is er maar één.** Eén grens in plaats van vier is een bewuste keuze:
twee ontwerpen die elk goed zijn, met één duidelijke overgang, is te bouwen en te testen. Vier
tussenstanden zijn dat niet.

De tussenstand tussen 768 en 1024 is geen derde ontwerp maar de desktopversie met de zijbalk
ingeklapt. Dat dekt de tablet in staande stand.

#### 8.12.6 Hoe dit technisch werkt

Drie niveaus, van goedkoop naar duur. De regel is: pak altijd het goedkoopste niveau dat het
probleem oplost.

**Niveau 1, responsieve utilities.** Tailwind zoals nu. Dekt marges, paddings, kolomaantallen,
knopmaten, alles waar de structuur gelijk blijft. Dit dekt naar schatting 70% van het werk en kost
niets extra.

**Niveau 2, containerqueries.** Tailwind v4 heeft `@container`. Een component kijkt naar de ruimte
die hij krijgt in plaats van naar het scherm. Nodig voor een kaart die zowel in een kolom van 320px
als over de volle breedte moet werken, en die zijn er in de analytics.

**Niveau 3, een andere render.** Voor de drie gevallen waar de structuur echt verschilt: de tabel,
de navigatie en de stappenflow van groep C. Hier komen twee componenten naast elkaar, net als bij
OKX.

Voor niveau 3 is de vraag: hoe weet de server of het een telefoon is. Er zijn drie manieren en de
keuze is niet vrijblijvend.

| Manier | Hoe | Waarom wel of niet |
|---|---|---|
| Allebei renderen, één verbergen | `hidden md:block` | **Nee.** Een tabel met 200 rijen staat dan twee keer in de HTML. Dat is precies het gewicht dat een telefoon niet heeft. |
| In de browser meten | `useIsMobile()` | **Nee.** Dit is een RSC-first app. Een client-hook geeft eerst de verkeerde versie en dan een sprong, en de tabel moet dan client-side. |
| Op de server aan de useragent | middleware zet een header | **Ja.** Dit is wat OKX doet, en `middleware.ts` draait hier al op elke pagina. |

De uitvoering is klein:

```ts
// middleware.ts, bij de bestaande updateSession
const { device } = userAgent(request);
const response = await updateSession(request);
response.headers.set("x-apparaat", device.type === "mobile" ? "telefoon" : "computer");
```

```ts
// lib/apparaat.ts
export async function isTelefoon() {
  return (await headers()).get("x-apparaat") === "telefoon";
}
```

**Drie dingen om te weten voordat dit gebouwd wordt:**

1. **Dit kost geen extra netwerkronde.** De middleware draait al op elke pagina voor de sessie, en
   de useragent staat al in het verzoek.
2. **Het raakt de caching niet, op één plek na.** Elke ingelogde pagina is toch al dynamisch, want
   ze leest de sessiecookie. De uitzondering is `/markt/[slug]`, de enige publieke pagina: die moet
   `Vary: x-apparaat` krijgen of hij serveert de verkeerde versie uit de cache. Dat is een
   regel in de route en het staat als eigen stap in 10.2.
3. **De useragent is een gok en soms de verkeerde.** Een tablet met een desktop-useragent krijgt het
   desktopontwerp, en dat is bij 768px breed verkeerd. Vangnet: de CSS-breekpunten uit 8.12.5 gelden
   altijd, ook als de server zich vergist. De server kiest alleen welke van de twee structuren er
   komt, en de CSS zorgt dat allebei op elke breedte leesbaar blijven. Zo is een verkeerde gok
   lelijk en nooit kapot.

#### 8.12.7 Wat dit extra kost

Eerlijk, want dit was de vraag.

| Onderdeel | Extra werk |
|---|---|
| Onderbalk plus "Meer"-blad | 2 nieuwe componenten |
| Mobiele bovenbalk | Variant op `workspace-chrome` |
| Tabel met 2 kolommen | 1 component, dekt alle 19 schermen van groep B |
| Rijdetail als blad | Variant op `Drawer` (7.14) |
| Stappenflow formulier | 1 component, dekt de 18 schermen van groep C |
| Apparaatdetectie | `middleware.ts` plus `lib/apparaat.ts`, ongeveer 20 regels |
| Per scherm nalopen | 50 routes, ongeveer 20 met echt eigen mobiel werk |

**Zes nieuwe componenten en ongeveer 20 schermen met eigen mobiel werk.** Dat is grofweg een derde
bovenop het oorspronkelijke plan. Het goede nieuws is dat het geconcentreerd zit: de tabel en de
stappenflow dekken samen 37 van de 50 schermen met twee componenten.


---

## 9. Het themasysteem

### 9.1 Hoe OKX het doet

Een klasse op het wortelelement: `.theme-dark` of `.theme-light`. Geen media query in de CSS zelf,
geen `data-attribute`. 678 van hun tokens hebben een waarde per stand.

### 9.2 Wat ORBIT ENGINE houdt

De huidige opzet is beter dan die van OKX en blijft daarom staan:

```
:root                                    de lichte stand, altijd de volledige lijst
@media (prefers-color-scheme: dark)      de systeemvoorkeur, tenzij expliciet licht gekozen
:root[data-theme="dark"]                 de eigen keuze, wint van allebei
```

Het verschil: OKX vereist dat JavaScript de klasse zet vóór de eerste verf, anders flitst de pagina
wit. De opzet van ORBIT ENGINE werkt zonder JavaScript, want de systeemvoorkeur staat in de CSS
zelf. Dat is een echte eigenschap en er is geen reden om hem op te geven om een implementatiedetail
van OKX na te doen.

`components/theme-toggle.tsx` blijft werken zoals hij werkt.

### 9.3 De regel die blijft gelden

Uit de huidige `globals.css`, en hij wordt belangrijker met 130 tokens erbij:

> Definieer een kleur NOOIT alleen in een van de twee donkere blokken. De lichte stand is de
> volledige lijst; de donkere blokken herdefiniëren alleen wat anders moet zijn. Een token dat
> alleen in het donkere blok bestaat is in de lichte stand leeg, en een lege kleur is doorzichtig.

§11.3 heeft het controlescript dat dit afdwingt.

### 9.4 De lichte stand bestaat echt

OKX heeft een volledige lichte stand: alle 378 semantische tokens hebben een waarde in `.theme-light`.
Dat is direct overgenomen en er hoeft niets verzonnen te worden. De opdracht hield rekening met de
mogelijkheid dat die er niet zou zijn; hij is er wel.

De belangrijkste asymmetrie: **het accent is in de lichte stand geen limoen maar donkergroen**
(`#2b6d17`). Zie §5.1.4.

---

## 10. Technische uitvoering

### 10.1 Wat blijft, wat gaat

| | Besluit | Waarom |
|---|---|---|
| Tailwind v4 met `@theme inline` | **blijft** | De opzet klopt, alleen de waarden gaan eruit |
| Drielaagse tokenopzet | **blijft** | Beter dan die van OKX, zie §9.2 |
| De 59 componentklassen | **herschrijven** | Zelfde namen, andere inhoud, dus 117 bestanden bewegen mee |
| `lucide-react` | **blijft** | Lijndikte van 1,75 naar 1,5 |
| `geist` | **blijft als mono** | De schreefloze wordt Archivo |
| `next/font` | **blijft** | Archivo via `next/font/google`, zelf gehost bij het bouwen |
| `--glass-*` (6 tokens) | **weg** | Geen glas in dit systeem |
| `.workspace-canvas::before` | **weg** | Het stippenpatroon |
| `--accent-purple*`, `--accent-green*` | **weg** | Vervangen door `--accent*` |
| `--brand-gradient`, `--wordmark-*` | **weg** | Het woordmerk wordt vlak |
| De zeven betekenissen | **naar vier** | Zie 10.5 |
| `--bg-base-blur`, `--overlay-scrim` | **hernoemd** | Naar `--bg-scrim` |
| Businesslogica in `lib/` | **onaangeroerd** | Dit is geen backendwijziging |
| `app/solliciteren/` | **onaangeroerd** | Eigen stijlblad |

Geen enkele nieuwe dependency behalve het lettertype, en dat is een Google Font via `next/font`.

### 10.2 De elf stappen

`CLAUDE.md` schrijft voor: migratie eerst, dan code, dan UI. Er is hier geen migratie, dus de
volgorde is: tokens, klassen, componenten, opmaak, schermen. Elke stap is een eigen tak vanaf
`main`, gaat groen naar productie, en is op zichzelf terug te draaien (§13.3).

**De stappen staan zo op volgorde dat het zichtbare resultaat vroeg komt.** Na stap 4 is het hele
skelet om en zijn de 117 kaarten meegegaan, zonder dat er één scherm is aangeraakt.

| # | Stap | Omvang | Wat je daarna ziet |
|---|---|---|---|
| 1 | Tokenlaag | 1 bestand, ~400 regels | Alle kleuren om, oude vormen |
| 2 | Componentklassen | 1 bestand, ~900 regels | Kaarten, knoppen, chips, velden om |
| 3 | Nieuwe desktopcomponenten | 5 bestanden, plus de etalage | Tabs, Segment, FilterChip, Drawer, DataCard, en een scherm om ze te controleren |
| 4 | Desktopopmaak | 8 bestanden | Bovenbalk 48px, nieuwe zijbalk, drie standen |
| 5 | Apparaatdetectie | ~20 regels | Niets zichtbaars, het fundament voor 6 en 7 |
| 6 | Mobiele opmaak | 8 bestanden | Onderbalk, "Meer"-blad, mobiele bovenbalk, plus de aansluiting in `WorkspaceChrome`, `AppShell`, `lib/nav.ts` en `lib/icons.ts` |
| 7 | Mobiele patronen | 3 bestanden | Tabel met 2 kolommen, detailblad, stappenflow |
| 8 | Inlogroute | 6 bestanden | Beide ontwerpen, en §9b-uitzondering weg |
| 9 | Typografie-opruiming | 1 bestand plus ~200 wijzigingen | De schaal klopt overal |
| 10 | De schermen | 50 routes, ~20 met echt werk | Het lange stuk |
| 11 | Documentatie | 4 bestanden | `designsystem.md` herschreven |

**Stap 1, de tokenlaag.** `app/globals.css` regel 45 tot 900 vervangen. Na deze stap is de app
lelijk maar volledig functioneel: nieuwe kleuren, oude vormen. Dit is het eerste moment om de twee
standen naast elkaar te zetten.

**Stap 2, de componentklassen.** De 59 klassen krijgen de waarden uit §7. Grootste effect per
regel: `.card` (117 bestanden), `.mono-label` (126), `.chip` (68), `.btn-*` (53), `.field` (48).
Eén commit per klassengroep. **Dit is het belangrijkste kijkmoment van het hele traject**, want
hierna is het uiterlijk in grote lijnen beslist.

**Stap 3, de nieuwe desktopcomponenten.** `Tabs` en `Segment` (7.6), `FilterChip` (7.8), `Drawer`
(7.14), `DataCard` (7.10). Elk met alle staten, want een component zonder zijn staten is het werk
waard om twee keer te doen.

**Daar hoort sinds 17 september een achtste bestand bij: `/beheer/designsysteem`.** Dat stond niet
in de eerste opzet van dit plan en is er tijdens stap 3 aan toegevoegd, om een reden die `CLAUDE.md`
conventie 10 zelf noemt: gebouwd is niet geverifieerd. Voor rekenkunde is er `test-unit.ts`, maar
voor vormgeving bestaat die test niet. Vijf componenten bouwen die nergens gebruikt worden is
precies het soort werk dat er groen uitziet en fout kan zijn.

Het is een intern scherm (`isStaff`, en een 404 bij een gewone gebruiker) dat elk token, elke klasse
en elk component in al zijn staten naast elkaar zet. Daarmee is het ook het antwoord op de vraag die
na stap 1 en 2 open bleef staan: hoe ziet dit er eigenlijk uit.

⚠️ **Hij staat bewust NIET in de zijbalk.** `lib/nav.ts` heeft een grens van negen bestemmingen
onder Admin, met vijf gedocumenteerde uitzonderingen die elk een toets moesten doorstaan. Een
etalage voor de verbouwing is die zesde uitzondering niet waard: hij is per adres bereikbaar en dat
is genoeg. Na stap 11 kan opnieuw gewogen worden of hij een vaste plek verdient.

**Stap 4, de desktopopmaak.** `workspace-chrome.tsx` en `sidebar.tsx` waren de kern, plus zes
bestanden die met de bovenbalk meedraaien: `preview-toggle.tsx`, `profile-menu.tsx`,
`theme-toggle.tsx` en `open-questions-badge.tsx` droegen dezelfde `h-9 w-9`-knop met de hand
opgebouwd, en `analytics-filters.tsx`, `analytics-table.tsx`, `section-rail.tsx`, `brand-wizard.tsx`
en `confirm-bar.tsx` droegen elk hun eigen plakbalk met de glaslaag erin. Die laatste vijf zijn geen
losse component maar hetzelfde patroon vijf keer met de hand herhaald, en dat is precies het soort
herhaling waar `.icon-btn` en het wegvallen van de glaslaag voor bedoeld zijn.

**Stap 5, de apparaatdetectie.** `middleware.ts`, `lib/supabase/middleware.ts`, `lib/apparaat.ts`
en de `Vary`-regel op `/markt/[slug]` in `next.config.ts` (8.12.6). Los van stap 6 en 7 omdat het
apart te controleren is: een header zetten en uitlezen is te testen zonder dat er één pixel
verandert.

⚠️ **Eén correctie op de pseudocode uit §8.12.6 tijdens het bouwen.** Daar stond
`response.headers.set("x-apparaat", ...)`, en dat is een REACTIE-header: zichtbaar voor de browser,
onzichtbaar voor `headers()` in een servercomponent tijdens hetzelfde verzoek. `next/headers` leest
de headers van het inkomende verzoek zoals de middleware ze doorgeeft, niet wat er uiteindelijk naar
de browser gaat. De uitvoering zet `x-apparaat` daarom op een kopie van `request.headers` en geeft
die aan `NextResponse.next({ request: { headers } })` mee, op elke plek waar `updateSession` zo'n
reactie bouwt.

Geverifieerd met een script dat `middleware()` rechtstreeks aanriep met drie useragents (telefoon,
desktop, tablet) tegen een onbeschermde route en de resulterende `x-middleware-request-x-apparaat`
las: telefoon gaf `telefoon`, desktop en tablet gaven allebei `computer`. Dat laatste is met opzet:
een tablet krijgt de desktopstructuur, conform §8.12.5.

**Stap 6, de mobiele opmaak.** De onderbalk (8.12.4), het "Meer"-blad, de mobiele bovenbalk. Na deze
stap is de app op een telefoon te navigeren zoals bedoeld, ook al zien de schermen er nog
desktopachtig uit.

⚠️ **Eén correctie tijdens het bouwen, op `lib/nav.ts` en niet op dit plan.** De schermtitel voor de
mobiele bovenbalk moest een bestaande functie hergebruiken om geen van de vijftig
`page.tsx`-bestanden aan te raken vóór stap 10. De eerste poging hergebruikte `navActief()`, de
functie die de zijbalk gebruikt, en een test tegen een echt pad
(`/merk/x/strategie/plan/versies`) liet meteen zien dat dat de verkeerde strengheid is:
`navActief` is met opzet strikt exact, juist om te voorkomen dat twee buurbestemmingen in de zijbalk
tegelijk oplichten. Voor een titel is dat averechts: een dieper scherm zonder eigen menu-item toont
dan liever de titel van zijn ouder dan niets. De nieuwe functie, `titelVoorPad()`, gebruikt daarom
`isActive()` (voorvoegsel) met "langste match wint" als tiebreak, en is met vier paden na elkaar
getest, inclusief het geval dat de eerste versie fout had.

**Wat verder is meegenomen, buiten de kernlevering van dit blueprint:** de onderbalk verschuift met
het PAD (`pathname.startsWith("/sales")`) en niet met de rol, omdat een salesmedewerker ook een merk
kan bekijken en "waar sta ik nu" dan een betere leidraad is dan "wat ben ik meestal". En drie
functies die op de desktop los in de bovenbalk stonden (previewToggle, het zijproject, support) én
geen van drieën deel uitmaakten van het `lib/nav.ts`-datamodel, kregen een plek in het "Meer"-blad in
plaats van stilzwijgend te verdwijnen op een telefoon.

**Stap 7, de mobiele patronen.** De drie componenten die 37 van de 50 schermen dekken: de tabel met
twee kolommen (groep B), het detailblad, de stappenflow (groep C).

**Stap 8, de inlogroute.** Vijf schermen, afgesloten geheel, meteen in beide ontwerpen. Het heft de
uitzondering uit `docs/designsystem.md` §9b op, want de inlogroute gebruikt daarna dezelfde
componenten als de rest.

**Stap 9, de typografie-opruiming.** Zie 10.4. Kan parallel aan stap 10.

**Stap 10, de schermen.** 50 routes, per groep uit 8.12.2. Volgorde op gebruik: merkoverzicht,
analytics, strategie, sales, admin, de rest. Dit is de lange staart en hij is in porties te doen.

**Stap 11, documentatie.** Zie 10.6.

**Waar de stappen van elkaar afhangen:**

```
1 → 2 → 3 → 4 ──┐
                ├→ 8 → 10 → 11
    5 → 6 → 7 ──┘
                9  (kan vanaf stap 2, parallel)
```

Stap 5 kan al beginnen zodra stap 1 klaar is; hij raakt de vormgeving niet. Stap 9 kan parallel
vanaf stap 2. De rest is een ketting.

### 10.3 De componentklassen na de wijziging

Wat er met de 59 klassen gebeurt:

| Wat | Aantal | Toelichting |
|---|---|---|
| Blijft met dezelfde naam, nieuwe waarden | 41 | `.card`, `.btn-*`, `.chip`, `.field`, `.skeleton`, `.type-*` |
| Verdwijnt | 8 | `.card-rail*`, `.brand-gradient-text`, `.thema-wisselt`, `.live-dot`, `.vraag-dot`, `.card-accent` |
| Komt erbij | 14 | `.tab-*`, `.seg-*`, `.chip-select`, `.drawer-*`, `.data-card`, `.stand-*`, `.tabular` |

De verdwijners worden vervangen door bestaande patronen: `.card-rail-warning` wordt een kaart met
`border-left: 2px var(--intent-warning-content)`, en dat hoeft geen eigen klasse te zijn.

### 10.4 De typografie-opruiming

Dit is de grootste handmatige post: 562 keer `text-sm`, 38 keer `text-lg`, 32 keer `text-xs`.

**Niet doen:** alles met de hand omzetten naar `type-*`-klassen. Dat is 640 aanpassingen in 249
bestanden met een reëel risico op regressie, en de winst is beperkt.

**Wel doen:** de Tailwind-schaal zelf naar de OKX-waarden trekken in `@theme`. Dan klopt
`text-sm` overal ineens.

```css
@theme inline {
  --text-xs: 12px;        --text-xs--line-height: 18px;
  --text-sm: 14px;        --text-sm--line-height: 21px;
  --text-md: 16px;        --text-md--line-height: 24px;
  --text-lg: 18px;        --text-lg--line-height: 24px;
  --text-xl: 24px;        --text-xl--line-height: 30px;
  --text-2xl: 30px;       --text-2xl--line-height: 40px;
  --text-3xl: 36px;       --text-3xl--line-height: 1.32;
  --text-4xl: 40px;       --text-4xl--line-height: 1.32;
  --text-5xl: 56px;       --text-5xl--line-height: 1.32;
}
```

Daarmee wordt 562 keer `text-sm` in één keer 14px op regelhoogte 21 in plaats van 14px op 20. Dat
is de hele omzetting voor de grote meerderheid.

**Wat wel met de hand moet:** de 8 keer `text-3xl` en 8 keer `text-2xl` op paginakoppen worden
`PageHeader`, en de gewichten. `font-semibold` (600) moet naar `font-medium` (500) op alle tekst
binnen een regel. Dat is een zoekopdracht met ongeveer 200 treffers en het is mechanisch werk.

**De valstrik die hierbij hoort:** `--color-base` verdwijnt uit `@theme` (zie §6), waardoor
`text-base` weer gewoon een tekstgrootte wordt. Er is één plek waar dat iets verandert,
`app/(app)/merk/[id]/analytics/page.tsx:284`: daar staat `text-base text-muted`, en de schrijver
bedoelde zichtbaar "gewone tekstgrootte". Nu zet `text-base` daar een kleur die `text-muted`
er meteen weer af haalt, dus de regel doet niets. Na deze wijziging doet hij wat er staat, en dat
is 16px in plaats van de geërfde grootte. Even nakijken of dat de bedoeling is.

### 10.5 Van zeven betekenissen naar vier

De app heeft zeven (`intelligence`, `growth`, `information`, `warning`, `attention`, `danger`,
`premium`), OKX heeft er vier. De vertaling:

| Nu | Wordt | Toelichting |
|---|---|---|
| `intelligence` (paars) | `accent` | Wat van de AI komt, krijgt de accentkleur |
| `growth` (groen) | `trend-up` | Dit is richting, geen betekenis, zie §5.1.6 |
| `information` (blauw) | `intent-info` (grijs) | Informatie is neutraal bij OKX |
| `warning` (oranje) | `intent-warning` | Blijft |
| `attention` (roze) | `accent` | Eén gebruik, geteld: `chip-attention` op het woord "kans" in `components/concurrenten-analyse.tsx:227`. Een kans is geen waarschuwing, dus hij gaat naar het accent en niet naar `warning`. |
| `danger` (rood) | `intent-danger` | Blijft |
| `premium` (bruin) | **weg** | Gebruikt in 0 bestanden, geteld |

Geteld, niet geschat: `premium` wordt als token in nul bestanden gebruikt (er staat wel 25 keer een
`--intent-premium-*` in `globals.css`, dus het is dode code) en `attention` in precies één.

**Die ene plek is leerzaam en verdient een aparte blik.** `chip-attention` staat op het woord "kans"
in de concurrentenanalyse. Roze is daar gekozen omdat het niet rood mocht zijn, niet omdat kansen
roze zijn. In het nieuwe systeem is dat het accent: een kans is het soort ding waar je op wilt
klikken, en het accent is precies de kleur die dat bij OKX aangeeft. Hij wordt dus geen
`intent-warning`.

**De rest van de versimpeling kost niets**, want `information` naar grijs is een kleurwissel op een
token dat zijn betekenis houdt, en `growth` naar `trend-up` maakt expliciet wat het al was.

### 10.6 Documentatie in dezelfde commit

`CLAUDE.md` vraagt dit expliciet, en één feit heeft één eigenaar.

| Document | Wat ermee gebeurt |
|---|---|
| `docs/designsystem.md` | **Wordt herschreven.** Het blijft de eigenaar van het design system. De inhoud van §2 tot §10 wordt vervangen door wat hier in §5 tot §7 staat. |
| `docs/designsystem.md` §9b | **Wordt herschreven, niet geschrapt.** De vraag verandert van "dit is van de concurrent" naar "dit is van OKX, en dat is geen concurrent". De uitkomst van §13.1 hoort hier: limoen is overgenomen en de eigen merklaag blijft open. |
| `docs/designsystem.md` §9 ("wat we van Nova overnamen") | **Wordt bijlage.** Historisch, net als bijlage A over inspace.io. |
| `docs/logbook.md` | **Alinea onderaan** met datum en cijfer, per `CLAUDE.md`. |
| `docs/merkstrategie.md` §15, §16 | **Nakijken.** §15.4 verbiedt de neonpaarse AI-gloed; die verdwijnt, dus dat komt goed uit. §16.2 vraagt om functionele kleurhiërarchie, en dat is precies wat §5.1.5 levert. |
| `docs/ux-design.md` | **Nakijken** op maatvoering die niet meer klopt. |
| `docs/nova-i18n.json`, `docs/inspace-*` | **Weg**, samen met de verwijzingen ernaar. Grep eerst op de bestandsnaam, ruim de verwijzingen op in dezelfde commit, en zet de vertaalregel bovenaan `docs/logbook.md`. |
| `redesign2026.md` | **Weg zodra het af is.** Openstaand werk hoort in `docs/tasks/`; dit bestand verhuist daarheen bij goedkeuring en verdwijnt bij oplevering. |
| `css.css` (93 kB in de hoofdmap) | **Nakijken.** Dit lijkt de gecompileerde CSS van Nova te zijn, bewaard als bron. Na deze wijziging heeft hij geen functie meer. |

### 10.7 Wat dit kost

Een schatting, geen belofte. Het mobiele spoor (stap 5 tot 7) is de toevoeging van 17 september; het
zat niet in de eerste versie van dit plan.

| # | Stap | Omvang | Spoor |
|---|---|---|---|
| 1 | Tokenlaag | 1 bestand, ~400 regels | beide |
| 2 | Componentklassen | 1 bestand, ~900 regels | beide |
| 3 | Nieuwe desktopcomponenten | 5 bestanden | desktop |
| 4 | Desktopopmaak | 2 bestanden | desktop |
| 5 | Apparaatdetectie | 4 bestanden | mobiel |
| 6 | Mobiele opmaak | 8 bestanden | mobiel |
| 7 | Mobiele patronen | 3 bestanden | mobiel |
| 8 | Inlogroute | 6 bestanden | beide |
| 9 | Typografie | 1 bestand plus ~200 wijzigingen | beide |
| 10 | De schermen | 50 routes, ~20 met echt werk | beide |
| 11 | Documentatie | 4 bestanden | beide |

**Stap 1 tot 8 zijn samen ongeveer 23 bestanden** en leveren het grootste deel van het zichtbare
resultaat, op beide apparaten. Stap 10 is de lange staart.

Het mobiele spoor voegt zes componenten toe en ongeveer een derde aan totale omvang. Dat is minder
dan het klinkt omdat het geconcentreerd zit: **twee componenten (de tabel met twee kolommen en de
stappenflow) dekken 37 van de 50 schermen.**

---

## 11. Verificatie

`CLAUDE.md` regel 10: gebouwd is niet geverifieerd. Voor vormgeving is dat lastiger dan voor
rekenkunde, dus hier staat wat er concreet nagerekend kan worden.

### 11.1 Per commit

De vier die altijd groen moeten zijn, uit `CLAUDE.md`:

```bash
npx tsc --noEmit
npm run test:unit
npm run test:chain
npm run build
```

Een vormgevingswijziging kan die alle vier breken, want `.card` verwijderen breekt niets in
TypeScript maar wel in de build als er een `@apply` op staat.

### 11.2 De stijlcontrole

`docs/schrijfstijl.md` §10 heeft een grep-check voor gedachtestreepjes. Die geldt ook voor dit
werk, want er komt UI-copy bij in lege staten en foutmeldingen.

### 11.3 Het tokenschrift

Nieuw, en het vangt de fout die `globals.css` zelf als waarschuwing opschrijft. Een script in
`scripts/` dat de drie themablokken uit `app/globals.css` leest en controleert:

1. Elk token dat in een donker blok staat, staat ook in `:root`. Anders is het in de lichte stand
   leeg en dus doorzichtig.
2. De twee donkere blokken (`@media` en `[data-theme="dark"]`) zijn identiek. Nu zijn dat twee
   handmatig gelijkgehouden lijsten van 100 regels.
3. Geen enkele `.tsx` bevat een letterlijke hexkleur. Geteld vóór de wijziging, en dat aantal mag
   alleen dalen.
4. Geen `user-scalable=no` en geen `maximum-scale` in de viewport-meta. OKX heeft dat wel en het is
   de ene fout uit hun mobiele opzet die niet mee mag komen (8.12.1).

Punt 2 is de moeite waard: twee blokken die met de hand gelijk worden gehouden gaan een keer uit
elkaar lopen, en dat merkt niemand tot iemand zijn stand handmatig zet.

### 11.4 Contrast

Elke tekstkleur op elke grond waar hij voorkomt, tegen WCAG AA (4,5:1 voor tekst, 3,0:1 voor
niet-tekstuele elementen). De waarden in §5.1.2 zijn al doorgerekend. Twee aandachtspunten:

- `--text-subtler` haalt 3,5:1 in de donkere stand. Genoeg voor een rand, te weinig voor tekst. Het
  token moet die beperking in zijn commentaar dragen, precies zoals `--text-muted` dat nu doet.
- Limoen `#bcff2f` op zwart haalt 17,5:1, dus als tekst op de donkere grond is hij ruim in orde. Op
  wit haalt hij 1,2:1, en dat is precies waarom OKX in de lichte stand donkergroen gebruikt.

**Eén gemeten probleem dat met een letterlijke overname meekomt, en het raakt precies de cijfers
waar dit product over gaat.** De stijg- en daalkleuren van OKX halen in de lichte stand geen AA
voor gewone tekst:

| Kleur | Op | Contrast | Oordeel |
|---|---|---|---|
| `--trend-up` `#31bd65` | wit | **2,44:1** | Te laag voor tekst |
| `--trend-down` `#eb4b6d` | wit | **3,65:1** | Te laag voor tekst |
| `--trend-down` `#ca3f64` | `#171717` | **3,76:1** | Te laag voor tekst |
| `--trend-up` `#25a750` | `#000000` | 6,72:1 | In orde |

Bij OKX is dat minder erg dan het klinkt: daar staat een koers meestal groot en dik, en dan geldt de
grens van 3,0:1. Bij ORBIT ENGINE komt deze kleur op een verschilpercentage van 14px in een
tabelcel, en dan geldt 4,5:1.

**Voorstel:** neem de kleur letterlijk over voor vlakken, lijnen en grafieken, waar 3,0:1 de norm is,
en gebruik voor tekst onder 18px een donkerder tegenhanger. Doorgerekend:

```
--trend-up-text:   licht #1d7a3f (5,4:1 op wit)    donker #25a750 (6,7:1 op zwart)
--trend-down-text: licht #c22a48 (5,7:1 op wit)    donker #f57a8a (8,0:1 op zwart)
```

Dat is twee tokens erbij en het is de enige plek in dit hele plan waar afwijken van OKX beter is dan
volgen. De reden is dat hun kleur voor hun typografie is gekozen en die van ons kleiner is.

### 11.5 Wat pas in productie te zien is

Eerlijk: of dit werkt is niet uit een test af te lezen. Wat wel kan, op een Vercel-preview:

- De twee standen naast elkaar op de tien zwaarste schermen.
- Een tabel met 200 rijen, om te zien of de dichte stand leesbaar blijft.
- 1280, 1440, 1920 en 2560 pixels breed, want daar gaat deze opdracht over.
- De inlogroute, want dat is in de sales-led opzet vaak het eerste beeld in een demogesprek.

**En voor het mobiele spoor er apart bij:**

- 390 pixels breed (iPhone) en 360 (Android), in beide standen.
- Een tabel van groep B naast dezelfde tabel op de computer, om te zien of de vier gekozen gegevens
  de juiste vier zijn. Dat is een ontwerpvraag en geen testvraag, dus hij hoort bekeken te worden.
- Een formulier van groep C als stappenflow, helemaal doorlopen tot en met opslaan.
- Een tablet in staande stand (768 tot 1024px), want dat is de tussenstand en dus de smalste
  marge voor fouten.
- Eén test met een verkeerde gok van de apparaatdetectie: een telefoon met een desktop-useragent.
  Het resultaat mag lelijk zijn en moet werken (8.12.6).

---

## 12. Interne controle

De opdracht vraagt hierom vóór oplevering. Uitgevoerd, met de uitkomst erbij.

| Controle | Uitkomst |
|---|---|
| Alle routes gedekt? | Ja, 50 paginaroutes, in §8 gegroepeerd. `/solliciteren` blijft er bewust buiten. |
| Alle gevraagde componenten gedekt? | 26 van de 28 gevraagde staan in §7. De twee die ontbreken zijn "Data Card" (staat in 7.10 als onderdeel van Card) en "Search" (7.4). Beide dus wel behandeld. |
| Alle gevraagde tokencategorieën? | Kleur, typografie, ruimte, radius, rand, schaduw, pictogram, beweging, opmaak. Alle negen in §5. |
| OKX-analyse verifieerbaar? | Ja, 1.135.435 bytes CSS plus het fontbestand, en per waarde staat er GEMETEN, BEREKEND of AFGELEID bij. |
| Aangeleverde research gecontroleerd? | Ja, §4. 13 beweringen van Gemini en 15 van ChatGPT nagerekend. |
| Responsieve strategie? | §8.12, herschreven op 17 september naar twee ontwerpen naast elkaar. Het OKX-patroon erachter is gemeten (7 kolommen tegen 2), niet aangenomen. |
| Mobiel ontwerp compleet? | Navigatie (8.12.4), tabel, detailblad, stappenflow, plus mobiele varianten bij Button, Input, Table, Drawer, Modal, Toast en Sidebar in §7. |
| Technisch haalbaar op RSC? | §8.12.6. Drie manieren afgewogen, de gekozen manier gebruikt de middleware die er al draait. |
| Migratiestrategie? | §10.2, elf stappen met hun onderlinge afhankelijkheden. |
| Lichte stand? | Bestaat bij OKX volledig, dus overgenomen en niet verzonnen (§9.4). |
| Wordt de Nova-look onherkenbaar? | §1.4 heeft negen kenmerken, alle negen vervangen. Grond, vorm, kleur, dichtheid en typografie gaan alle vijf om. |

**Wat er niet in staat en waarom:**

- **Geen exacte waarden voor Input, Tabs, Tooltip, Badge, Drawer.** OKX laadt die per route bij en
  ze zaten niet in de negen opgehaalde bundels. Ze staan als AFGELEID en zijn uit de gemeten schaal
  doorgetrokken. Wie ze exact wil, moet een ingelogde OKX-sessie inspecteren; dat kan hier niet.
- **Geen tokens voor ruimte bij OKX.** Ze hebben er geen. De schaal in §5.3 is opgebouwd uit hun
  werkelijk gebruikte paddings.
- **Geen animatietokens bij OKX.** De waarden in §5.8 zijn die van de app nu, en die zijn goed.

---

## 13. De drie besluiten, genomen

Vastgelegd door de eigenaar op 17 september 2026. Ze stonden open in de eerste versie van dit
document; hier staat wat er besloten is en wat het betekent.

### 13.1 De accentkleur: limoen, letterlijk

**Besluit: `#bcff2f` wordt overgenomen zoals hij bij OKX is.**

Dat betekent concreet:

```
donker   --accent: #bcff2f    --accent-hover: #9ce207    --accent-pressed: #87c600
licht    --accent: #2b6d17    --accent-hover: #225812    --accent-pressed: #18400c
beide    --accent-highlight: #bcff2f   met #000000 als tekstkleur erop
```

De lichte stand is geen afwijking maar hun eigen oplossing: limoen op wit haalt 1,2:1 en is
onleesbaar, dus daar staat donkergroen. Limoen blijft in de lichte stand alleen bestaan als vlak
waar zwarte tekst op komt.

**Waar het accent wél komt**, en nergens anders:

- De primaire actie op een scherm, hooguit één per scherm
- De actieve staat in de navigatie (als streep, niet als vulling)
- De eigen merklijn in een grafiek (`--chart-1`)
- De linkerrand van een AI-advies (7.23)
- Het label "kans" in de concurrentenanalyse (zie 10.5)

**Waar het accent niet komt:** niet op koppen, niet op links in lopende tekst, niet als achtergrond
van een sectie, niet op meer dan ongeveer 1% van het zichtbare oppervlak. Dat percentage is geen
vuistregel uit een researchstuk maar wat de gemeten CSS van OKX laat zien, en het is de reden dat
de kleur werkt.

**Wat hiermee open blijft:** `docs/designsystem.md` §9b vroeg in augustus om een eigen merklaag van
Outer Orbit. Dit besluit beantwoordt die vraag niet, het stelt hem uit. Dat is met open ogen
gebeurd, net als in augustus, en §10.6 zorgt dat §9b dat eerlijk blijft opschrijven in plaats van
dat het opnieuw insluipt.

### 13.2 Mobiel: een eigen ontwerp, niet blokkeren

**Besluit: de app blijft volledig beschikbaar op de telefoon, en mobiel krijgt een eigen ontwerp.**

De eerste versie van dit document stelde voor om onder 768px te blokkeren. Dat voorstel is
ingetrokken. Het uitgangspunt is nu:

> Desktop wordt ontworpen zonder één concessie aan mobiel. Mobiel krijgt een eigen ontwerp waar het
> desktoppatroon niet overzet. Geen van beide is een geschaalde versie van de ander.

§8.12 is daar helemaal op herschreven en is nu het langste hoofdstuk van dit plan. De kern:

- OKX doet dit zelf al, en het is gemeten: 7 kolommen op de computer, 2 op de telefoon, met de
  weggelaten gegevens niet verborgen maar niet gerenderd (8.12.1).
- De 50 schermen vallen in drie groepen met elk een eigen aanpak: 13 schermen zijn op allebei
  gelijk, 19 krijgen minder gegevens met diepte achter een tik, 18 krijgen op de telefoon een
  stappenflow in plaats van een lang formulier (8.12.2).
- Eén breekpunt op 768px, niet vier, zodat er twee ontwerpen te bouwen en te testen zijn in plaats
  van vijf halve (8.12.5).
- De server kiest de structuur via de useragent, precies zoals OKX, met de CSS-breekpunten als
  vangnet voor als die gok fout is (8.12.6).

**Wat het kost:** zes nieuwe componenten en ongeveer 20 schermen met eigen mobiel werk, grofweg een
derde bovenop het oorspronkelijke plan (8.12.7).

**Eén ding is het waard om te blijven zeggen**, want het zit in het woord "optimaal": de
beheerformulieren van groep C worden op de telefoon een goede stappenflow, en dat is een beter
mobiel ontwerp dan hetzelfde formulier kleiner. Het is geen kopie van de desktopervaring, en dat is
precies de bedoeling.

### 13.3 Oplevering: in stappen, elk apart naar productie

**Besluit: het werk wordt in stappen uitgewerkt en elke stap gaat apart naar productie.**

"Oplevering" betekende in de eerste versie: hoe komt dit in productie, want `main` is productie op
Vercel. Er waren twee kanten, en het besluit dekt ze allebei:

- **Het werk wordt in stappen uitgewerkt**, zodat elke stap op zichzelf na te kijken is.
- **Elke stap gaat apart naar productie**, zodat een fout klein blijft en terug te draaien is.

De elf stappen staan in §10.2. Wat dat betekent voor het ritme:

| | |
|---|---|
| Takken | Eén tak per stap, vanaf `main`, samengevoegd zodra hij groen is |
| Per stap groen | `tsc --noEmit`, `test:unit`, `test:chain`, `build`, alle vier |
| Per stap zichtbaar | Een Vercel-preview vóór de samenvoeging |
| Terugdraaien | Eén samenvoeging terug, want de stappen zijn onafhankelijk |

**Waarom dit belangrijker is dan het klinkt:** na stap 2 zijn de 117 kaarten, 68 chips en 53 knoppen
al om, zonder dat er één scherm is aangeraakt. Dat is het moment om te kijken of dit is wat je
bedoelde, en dat moment komt vroeg. Zou het één samenvoeging van 250 bestanden zijn, dan kwam dat
moment pas aan het eind, en dan is "dit is toch niet wat ik bedoelde" een dure zin.

## 14. Bronnen

Opgehaald 17 september 2026.

**OKX:**

- `https://www.okx.com/` plus vijf stylesheets van `okx.com/cdn/assets/okfe/okx-nav/` en
  `okx-homepage/`
- `https://www.okx.com/markets/prices` plus vier stylesheets van `okx.com/cdn/assets/okfe/market/`
- `https://www.okx.com/balance/overview`
- `https://www.okx.com/cdn/assets/okfe/libs/fonts/OKX_Sans/Regular.woff2`, gemeten met fontTools

**Vergelijkingsletters**, alle acht opgehaald en gemeten: Archivo, Figtree, Geist, Instrument Sans,
Inter, Manrope, Plus Jakarta Sans, Public Sans.

**ORBIT ENGINE:** `app/globals.css`, `components/` (60 tsx), `app/` (50 paginaroutes),
`docs/designsystem.md`, `docs/merkstrategie.md`, `docs/schrijfstijl.md`, `CLAUDE.md`.

**Aangeleverd:** de Gemini-research en de ChatGPT-research uit de opdracht, nagerekend in §4.
