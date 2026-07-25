# Design System — gebaseerd op InSpace (inspace.io / InSpace Nova)

> Bronanalyse van de daadwerkelijke, live CSS van inspace.io (juli 2026). Geen aannames of gegokte kleuren — elke waarde in dit document is geëxtraheerd uit de geminificeerde productie-stylesheets (`main-*.css`, `inspace-navbar.css`) en de inline `<style>`-blokken van de homepage. Waar iets een interpretatie/aanbeveling is (niet 1-op-1 overgenomen), staat dat expliciet vermeld.

---

## ⚠️ Belangrijke eerlijke bevinding vóór je verder leest

**De marketingsite van InSpace is overwegend lícht getint, niet donker.** De basis is wit/off-white (`#FFFFFF`, `#F5F6F3`) met zwarte tekst (`#0B0B0C`) en een **paars-naar-groen merk-gradient** als signatuur-accent. Een echt donker, "futuristisch tech"-paneel — dichtbij navy/zwart met neon-paarse glow — bestaat op dit moment alleen in één specifiek onderdeel: de **"Aura"-teaser** (hun aangekondigde, nog niet gelanceerde uitbreiding, zichtbaar in een wisselpaneel in de navigatie-megamenu).

Dit document documenteert **beide systemen eerlijk**:
- **§A — Het lichte kernsysteem**, wat InSpace daadwerkelijk overal gebruikt (kleuren, type, cards, knoppen, micro-interacties).
- **§B — Het donkere "Aura"-paneel**, de enige plek waar InSpace zelf een dark-mode-esthetiek toont.

> **🔆 VASTGELEGDE KEUZE (herzien juli 2026): de app draait op het LICHTE kernsysteem (§A).**
> De app is bewust omgezet van dark mode naar het lichte systeem dat InSpace zelf overal gebruikt — witte/off-white vlakken, zwarte tekst, subtiele grijze randen, neutrale schaduwen, met de paars/groen-gradient, pil-vormen en mono-labels als merk-DNA. Dit is bevestigd met screenshots van de live site (juli 2026): de groene pil-CTA ("Schedule free demo"), paarse getallen/accenten, groene tekst voor positieve indicatoren. **§A is dus leidend voor de implementatie** (`app/globals.css`). §B/§C hieronder beschrijven het donkere Aura-alternatief en blijven bewaard als referentie, maar worden **niet** toegepast in de app.

**Historische aanbeveling (niet meer van toepassing — de app was aanvankelijk dark):** eerder is een dark-mode op basis van het Aura-palet (§B/§C) aangeraden omdat er om een donker futuristisch dashboard werd gevraagd. Die keuze is teruggedraaid ten gunste van het authentieke lichte InSpace-systeem (§A). De onderstaande §B/§C blijven staan voor het geval dark mode ooit als optie terugkomt.

---

## §A — Het lichte kernsysteem (wat InSpace overal gebruikt)

### A1. Kleurpalet

**Neutrale basis:**
| Token | Waarde | Gebruik |
|-------|--------|---------|
| `--paper` | `#FFFFFF` | Primaire achtergrond |
| `--paper-2` | `#F5F6F3` | Secundaire/off-white achtergrond (sectiewisseling) |
| `--ink` / `--black` | `#0B0B0C` | Primaire tekst, primaire "zwarte" knoppen |
| `--muted` | `rgba(11,11,12,.62)` | Secundaire tekst |
| `--muted-2` | `rgba(11,11,12,.56)` | Tertiaire/label-tekst |
| `--line` | `rgba(11,11,12,.10)` | Standaard 1px-randen op cards/dividers |

**Merkkleuren (het paars/groen-duo, dé signatuur van InSpace):**
| Token | Waarde | Gebruik |
|-------|--------|---------|
| `--purple` | `#8511D9` | Primaire accentkleur — CTA's, links, actieve states, gloed |
| `--purple-soft` | `#A24DEC` | Lichtere paars-variant (hover/secundair) |
| `--green` | `#B9EFA3` | Secundaire accent — success/"on"-states, groene knoppen |
| `--green-text` | `#2E9E50` | Tekstversie van groen (labels, "+12%"-indicators) |
| `--green-dark` | `#54B86A` | Donkerdere groene tint (gradient-eindpunt) |
| `--gold` | `#B9A27A` | Tertiaire, spaarzaam gebruikte warme accent |

**Signatuur-gradient:** `linear-gradient(96deg, #54B86A 0%, #8511D9 96%)` — groen-naar-paars, gebruikt als merk-statement (bv. op logo's/hero-accenten). Dit is dé InSpace-vingerafdruk.

**Statuskleuren:**
| Status | Waarde | Bron |
|--------|--------|------|
| Success/positief | `#2E9E50` (tekst), `#B9EFA3` (achtergrond) | groen-token hierboven |
| Error/destructive | `oklch(57.7% .245 27.325)` ≈ `#E5484D`-achtig rood | Tailwind-root `--destructive` |
| Warning | niet apart gedefinieerd — InSpace gebruikt het gouden accent (`#B9A27A`) informeel hiervoor | interpretatie |
| Info/neutraal | het paars-token (`#8511D9`) wordt ook informatief gebruikt (bv. badges) | geëxtraheerd |

### A2. Typografie

**Font-families (twee custom, gelicenseerde fonts):**
- **`Aeonik`** — primaire sans-serif voor headings én body. Gewichten: 400 (Regular), 700 (Bold). Fallback-stack: `'Aeonik','Aeonik Fallback',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif`.
- **`TTCommons`** (specifiek: TT Commons Pro Mono Trial) — een **mono-stijl technisch font**, uitsluitend gebruikt voor labels, badges, stat-captions en kleine uppercase UI-tekst met brede tracking. Gewichten: 400, 700. Fallback: `'TTCommons','TT Commons','SFMono-Regular','Space Mono',ui-monospace,monospace`.

> **⚠️ Licentie-caveat:** Aeonik en TT Commons zijn **commerciële, gelicenseerde fonts** — InSpace's productie-CSS bevat zelfs zelf-gehoste base64-embedded font-bestanden. We mogen die niet 1-op-1 overnemen/hergebruiken zonder licentie. Twee opties: (a) zelf een licentie aanschaffen voor Aeonik + TT Commons, of (b) een visueel zeer vergelijkbaar open-source alternatief gebruiken — bv. **Geist** of **General Sans** als Aeonik-vervanger (geometrische grotesk, vergelijkbare x-hoogte/karakter), en **Space Mono** of **JetBrains Mono** als TT Commons-vervanger (dat laatste wordt zelfs letterlijk als fallback gebruikt in hun eigen `--mono`-stack hierboven). Zie §C voor de aanbevolen combinatie.

**Het karakteristieke gebruik van het mono-font:** InSpace's meest herkenbare typografische trucje is **kleine, uppercase, breed getrackte labels in het mono-font** (bv. stat-captions, badges, statusindicators) — dit geeft de "technische read-out"-uitstraling die bij een AI/SEO-tool past. Letter-spacing op deze labels loopt van `.08em` tot `.3em`.

**Schaal (fluid, via `clamp()`):**
| Niveau | `clamp()`-waarde | Toepassing |
|--------|-------------------|------------|
| Display/hero (extreem groot) | `clamp(6rem, 14vw, 11.5rem)` | Enkel merk-statement, zeer spaarzaam |
| H1 | `clamp(3.2rem, 5.6vw, 5.2rem)` | Hero-headline |
| H2 | `clamp(2.6rem, 6vw, 5.9rem)` / `clamp(2.4rem, 5.1vw, 4.5rem)` | Sectie-titels |
| H3 | `clamp(2rem, 5vw, 3.6rem)` | Subsectie-titels |
| H4 | `clamp(1.7rem, 3.1vw, 2.7rem)` | Kaart-titels |
| H5/lead | `clamp(1.4rem, 2.6vw, 2.15rem)` | Intro-alinea's |
| Body-groot | `clamp(1.02rem, 1.5vw, 1.22rem)` | Standaard leestekst |
| UI/labels (mono) | `.5rem – .95rem` (vast, niet fluid) | Badges, stat-captions, knoplabels |

**Letter-spacing-schaal:** negatief voor grote koppen (`-.005em` tot `-.04em`, hoe groter de tekst, hoe negatiever — standaard optische correctie), positief en breed voor mono-labels (`.01em` tot `.3em`, uppercase).

### A3. Layout, Spacing & Radii

**Border-radius-schaal:**
| Categorie | Waarden |
|-----------|---------|
| Pillen/knoppen/badges | `99px` / `999px` / `9999px` / `100px` (functioneel identiek: "volledig rond") |
| Grote kaarten/containers | `18px`, `20px`, `22px` |
| Standaard kaarten | `12px`, `14px`, `16px` |
| Kleine elementen (iconen, mini-badges) | `8px`, `9px`, `10px` |
| Avatars/dots | `50%` |

**Grid-achtergrondpatroon:** een subtiel lijnenraster via herhaalde lineaire gradients (`linear-gradient(#eef2ef 1px, transparent 1px)` verticaal + horizontaal), met `background-size: 28px 28px` — dus een raster van **28×28px cellen**, in een zeer lichte, bijna-onzichtbare grijstint.

**Elevatie/schaduw (glow-techniek):** schaduwen zijn vrijwel altijd **gekleurd naar de accentkleur van het element**, niet neutraal grijs:
- Paarse gloed: `0 20px 50px rgba(133,17,217,.14)` tot `.18`, of scherper `0 6px 16px -8px rgba(133,17,217,.45)` voor knop-hover.
- Groene gloed: `0 18px 44px rgba(185,239,163,.13)`, `0 22px 52px rgba(185,239,163,.18)`.
- Neutrale kaart-elevatie (subtiel): `0 1px 2px rgba(11,11,12,.04-.08)` voor rust-status, oplopend bij hover.
- **Achtergrond-gloed-orbs** (ambient sfeerverlichting): grote, sterk vervaagde cirkels — `filter: blur(40px)` tot zelfs `blur(90px)` — in paars of groen, achter secties geplaatst voor de "gloeiende tech"-sfeer.

**Glassmorphism:** `backdrop-filter: blur(6px–12px) saturate(1.08–1.7)` — gebruikt op overlay-panelen, sticky nav en modals. Altijd gecombineerd met een halfdoorzichtige witte/zwarte achtergrond (`rgba(255,255,255,.x)` of `rgba(11,11,12,.44)` voor een dark overlay).

**Motion/easing:** één consistente custom easing-curve door de hele site: `--ease: cubic-bezier(.2,.7,.2,1)`. Duur: `.2s–.45s` voor hover/interactie-states, `.8s–.9s` voor data/chart-reveal-animaties (bv. een lijn die "intekent").

### A4. Componenten

**Knoppen:**
```css
/* Primair (paars) */
.btn-purple {
  height: 56px; padding: 0 30px; border-radius: 99px;
  background: #8511D9; color: #fff; font-weight: 600; font-size: 1.02rem;
  box-shadow: 0 0 0 6px rgba(133,17,217,.12);
  transition: transform .25s cubic-bezier(.2,.7,.2,1), box-shadow .25s cubic-bezier(.2,.7,.2,1);
}
/* Secundair (groen) */
.btn-green {
  height: 44px; padding: 0 20px; border-radius: 99px;
  background: #B9EFA3; color: #0B0B0C; font-weight: 600;
}
/* Ghost/donker (op lichte achtergrond) */
.nv-btn.dark {
  background: #0B0B0C; color: #fff; border-radius: 9px; padding: 7px 10px; font-size: .6rem;
}
```
Kenmerk: primaire knoppen zijn **altijd volledig rond** (pil), met een zachte "ring"-gloed (`box-shadow: 0 0 0 Npx rgba(accent,.1-.14)`) in plaats van een harde rand.

**Cards:**
```css
.q-card {
  background: #fff; border: 1px solid rgba(11,11,12,.10); border-radius: 18px;
  padding: 26px 24px 22px; box-shadow: 0 1px 2px rgba(11,11,12,.04);
  transition: transform .3s ease, box-shadow .3s ease, border-color .3s ease;
}
```
Kaarten zijn subtiel elevated in rust, en krijgen bij hover een **sterkere, gekleurde** schaduw + lichte transform (geen felle borders, de gloed doet het werk).

**Badges/chips:** pil-vormig, mono-font, uppercase, breed getrackt, met een gedempte accentkleur-achtergrond:
```css
.imd-tab-chip { background: rgba(46,158,80,.16); color: #2E9E50; border-radius: 99px; padding: 2px 6px; font-size: 8px; letter-spacing: .1em; text-transform: uppercase; }
```

**Status-indicator (pulserende live-dot):** een klein rond puntje met een `box-shadow`-animatie die naar buiten "pulseert" (`0 0 0 0 rgba(accent,.5)` → `0 0 0 7px rgba(accent,0)`), gebruikt om "live/autonoom actief" te communiceren — precies het soort micro-interactie dat bij een automatische trackingtool past.

---

## §B — Het donkere "Aura"-paneel (enige echte dark-mode-referentie bij InSpace)

Dit paneel verschijnt in een wisselpaneel binnen de mega-menu-navigatie ("Nova" vs. "Aura" tabs) en is InSpace's enige zelf-gebouwde donkere UI-oppervlak. Dit is de basis voor onze eigen dark mode (zie §C).

**Achtergrond:**
```css
background:
  radial-gradient(120% 92% at 88% 6%, rgba(133,17,217,.42), transparent 52%),
  linear-gradient(180deg, #0B0B0C, #171128);
border: 1px solid rgba(255,255,255,.1);
```
Dus: een bijna-zwarte basis (`#0B0B0C`) die naar een donker paars-getint navy verloopt (`#171128`), met een **paarse radiale gloed rechtsboven** — exact de "deep space, glow in the corner"-esthetiek.

**Tekst op donker:**
| Token | Waarde |
|-------|--------|
| Primaire tekst | `#fff` |
| Secundaire/muted tekst | `rgba(255,255,255,.62)` |
| Border (subtiel, op donker) | `rgba(255,255,255,.1)` tot `.28` |

**Badge op donker:**
```css
.imd-aura-chip {
  color: #D9C6F5; background: rgba(133,17,217,.24);
  border: 1px solid rgba(165,120,240,.5); border-radius: 99px;
  font-family: mono; font-size: 9px; letter-spacing: .14em; text-transform: uppercase;
}
```
Lila-lichte tekst (`#D9C6F5`) op een gedempte paarse achtergrond — het "donkere equivalent" van de lichte badge-stijl uit §A4.

**CTA op donker:**
```css
.imd-aura-cta {
  height: 40px; border-radius: 99px; border: 1px solid rgba(255,255,255,.28); color: #fff;
}
.imd-aura-cta:hover { background: #fff; color: #0B0B0C; border-color: #fff; }
```
Op donker is de knop-hover-logica **omgekeerd**: een outline-knop die bij hover naar een solide wit blok inverteert (in plaats van een gekleurde gloed zoals op licht).

**Accent-orb:** een los, zwevend "glow orb"-icoontje met `filter: drop-shadow(0 12px 22px rgba(133,17,217,.4))` — decoratief paars gloed-element, typisch voor de "AI/tech" sfeer.

---

## §C — Samengevoegd, praktisch tokensysteem voor onze app

Dit is de **aanbevolen synthese**: InSpace's merk-DNA (kleuren, typografie, radii, gloed-techniek uit §A) volledig toegepast op een dark-mode-fundament (uit §B), zodat het resultaat authentiek "InSpace" aanvoelt terwijl de hele app consistent donker is — in plaats van maar één geïsoleerd donker paneel.

```css
:root[data-theme="dark"] {
  /* Achtergrondlagen — van diepste naar hoogste laag */
  --bg-base:        #0B0B0C;
  --bg-elevated:     #14141A;   /* interpretatie: iets lichter dan base, voor top-level containers */
  --bg-surface:      #171128;   /* uit Aura-gradient: kaarten/panelen met paarse ondertoon */
  --bg-surface-2:    #1C1730;   /* interpretatie: nog een laag hoger, voor gestapelde cards/modals */

  /* Merkkleuren (rechtstreeks uit InSpace) */
  --accent-purple:       #8511D9;
  --accent-purple-soft:  #A24DEC;
  --accent-purple-glow:  rgba(133,17,217,.42);
  --accent-green:        #B9EFA3;
  --accent-green-text:   #2E9E50;
  --accent-green-dark:   #54B86A;
  --brand-gradient: linear-gradient(96deg, #54B86A 0%, #8511D9 96%);

  /* Tekst op donker */
  --text-primary:    #FFFFFF;
  --text-secondary:  rgba(255,255,255,.62);
  --text-muted:      rgba(255,255,255,.42);   /* interpretatie: placeholder/disabled */

  /* Randen op donker */
  --border-subtle:   rgba(255,255,255,.10);
  --border-strong:   rgba(255,255,255,.28);

  /* Status (aangepast aan dark, zie A1) */
  --status-success:  #2E9E50;
  --status-error:    #E5484D;   /* afgeleid van Tailwind-root oklch(57.7% .245 27.325) */
  --status-warning:  #B9A27A;  /* InSpace's gouden accent, informeel als warning gebruikt */
  --status-info:     #8511D9;

  /* Typografie */
  --font-sans: 'Geist', 'Aeonik', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Space Mono', 'TTCommons', ui-monospace, monospace;

  /* Radii (rechtstreeks uit InSpace) */
  --radius-pill: 999px;
  --radius-lg:   18px;
  --radius-md:   14px;
  --radius-sm:   9px;

  /* Motion */
  --ease-standard: cubic-bezier(.2,.7,.2,1);
  --duration-fast: .2s;
  --duration-base: .3s;
  --duration-slow: .45s;
}
```

**Kernprincipes voor consistente toepassing:**
1. **Gloed in plaats van harde randen.** Elevatie en focus-states communiceren via een gekleurde `box-shadow`-gloed (accentkleur, lage opaciteit), niet via felle borders. Zie §A3.
2. **Pil-vormige interactieve elementen.** Alle knoppen, badges en chips zijn volledig rond (`--radius-pill`); alleen containers/cards gebruiken de kleinere radii.
3. **Mono-font is gereserveerd voor "technische" UI-tekst.** Labels, statuscaptions, badges en stat-waarden in `--font-mono`, uppercase, breed getrackt (`.08em`–`.2em`) — precies zoals InSpace's `.imd-*`- en `.q-card`-labels. Body-tekst en koppen blijven in `--font-sans`.
4. **Eén consistente easing overal:** `--ease-standard` voor elke hover/transitie — dit is een klein detail dat opvalt als het ontbreekt.
5. **Statusindicatie is kleur + vorm, nooit kleur alleen:** een pulserende dot, een pijltje (`↑`/`↓`), of een chip — nooit alleen een kleurverschil (toegankelijkheid).
6. **Achtergrond-gloed-orbs spaarzaam, groot en zeer vervaagd** (`blur(40–90px)`) achter hero/belangrijke secties — nooit als decoratie in kleine componenten.

---

## §D — Responsive-strategie: desktop-first uitgangspunt, mobiel bewust heruitgevonden

> **Vastgelegd door de opdrachtgever:** de meeste gebruikers openen de app vanaf desktop — dat is het uitgangspunt en waar de volle, dichte ervaring wordt ontworpen. Mobiel is nadrukkelijk **geen verkleinde desktop**: lagere informatiedichtheid vraagt om een andere indeling, niet alleen kleinere componenten. Voor elk schermformaat (mobiel, tablet, desktop) wordt bewust bepaald wat de optimale weergave is — steek daar net zoveel ontwerp-effort in als in desktop. Deze sectie is **leidend voor elk scherm dat vanaf nu gebouwd wordt**, net zoals §A–C leidend zijn voor kleur/type/componenten.

### D1. Breakpoints
Sluit aan bij de standaard Tailwind-schaal (het project gebruikt Tailwind v4), zodat er geen aparte breakpoint-taal ontstaat:

| Naam | Breedte | Rol |
|---|---|---|
| Mobiel (basis, geen prefix) | < 640px | Bewust herontworpen — eigen indeling, niet slechts verkleind |
| `sm` | ≥ 640px | Overgang; grotere telefoons/kleine tablets in portret |
| `md` (tablet) | ≥ 768px | Hybride: meestal dichter bij desktop-gedrag, met meer lucht |
| `lg` (desktop) | ≥ 1024px | **Uitgangspunt** — hier wordt de volle, dichte ervaring ontworpen |
| `xl` | ≥ 1280px | Extra ademruimte, geen nieuw gedrag |

Tailwind's utility-klassen zijn technisch mobile-first (een kale class is de basis, `lg:class` overschrijft vanaf 1024px). Dat is puur een implementatiedetail. Het **ontwerpproces** blijft desktop-first: bedenk eerst de volle desktop-indeling, ontwerp daarna bewust de mobiele variant — niet andersom, en niet "voeg er wat lg:-classes aan toe".

### D2. Kernprincipe per schermtype
- **Desktop (uitgangspunt):** hoge informatiedichtheid mag. Meerdere kolommen, data naast elkaar, hover-states, bredere lijsten/tabellen. Hier leeft de volledige ervaring.
- **Tablet:** meestal een compactere desktop-indeling (niet de mobiele indeling opgerekt). Apart testen — vaak volstaat het bijstellen van marges/kolombreedtes, soms is een eigen tussenstand nodig.
- **Mobiel:** verticaal, één taak per sectie, progressive disclosure (inklapbare secties in plaats van alles tonen), belangrijkste actie altijd binnen duimbereik. Geen interactie mag afhankelijk zijn van hover — alles moet ook via tap werken.

Praktische mobiele regels:
- Tikdoelen ≥ 44×44px.
- Formuliervelden ≥ 16px lettergrootte (voorkomt ongewenste auto-zoom op iOS Safari).
- Primaire actie op een lang scherm: sticky/vast onderaan, niet pas bereikbaar na scrollen.
- Dichte content (meerdere datapunten per rij) wordt op mobiel een gestapelde kaart, niet een uitgeknepen tabel.

### D3. Patronen per component-type

| Component | Desktop | Mobiel |
|---|---|---|
| Navigatie/tabs | Horizontale tabbalk, alles zichtbaar | Horizontaal scrollbare tabs (al zo gebouwd); bij veel acties overwegen: vaste onderbalk |
| Lijsten met meerdere datapunten | Tabel-achtige rijen, kolommen naast elkaar | Gestapelde kaarten (al zo gebouwd bij "Mijn analyses") |
| Formulieren | Mag meerdere kolommen | Altijd één kolom, volledige breedte |
| Dichte review-/detailschermen | Twee kolommen naast elkaar, secties standaard open | Inklapbare secties (accordion), gegroepeerd, standaard dicht |
| Belangrijkste call-to-action op een lang scherm | Prominent aan het eind van de sectie | Sticky onderbalk, altijd zichtbaar tijdens scrollen |
| Grafieken/data-visualisatie | Volledige grafiek, meerdere reeksen | Vereenvoudigd: kernwaarde + eenvoudige sparkline i.p.v. volledige multi-serie grafiek |
| Modals/detailweergave | Gecentreerde modal | Full-screen sheet (voelt nativer aan dan een kleine modal) |

### D4. Toepassing op het meest kritieke scherm: het concept-/review-scherm
Dit scherm (abcplan.md §3.6/§3.7 stap 5 — Brand DNA + alle prompts, bewerkbaar, verplicht voor elke analyse) is het informatiedichtste scherm in de app én het enige dat iedere analyse verplicht doorloopt. Dat maakt het de belangrijkste toetssteen van deze strategie:

- **Desktop:** Brand DNA en de promptlijst mogen ruim en met meerdere kolommen worden getoond; secties staan standaard open.
- **Mobiel:** elk Brand DNA-veldgroep en elke promptcategorie is een **inklapbare sectie, standaard dicht**, zodat de klant niet meteen een muur van tekst en tientallen prompts ziet. De knop **"Bevestig en start meting"** staat **sticky onderaan het scherm**, zodat 'ie na elke wijziging direct bereikbaar is zonder terug te scrollen.

### D5. Werkwijze bij het bouwen
Voor elk nieuw scherm: ontwerp eerst hoe het er op **desktop (`lg:`)** dicht en compleet uitziet, bepaal daarna expliciet — niet automatisch — hoe diezelfde informatie op **mobiel (basis-klassen)** anders wordt ingedeeld. "Werkt met kleinere Tailwind-classes" is onvoldoende: de layout-structuur zelf mag verschillen (bijvoorbeeld een grid dat op desktop twee kolommen is en op mobiel een chronologische, inklapbare lijst wordt — niet dezelfde grid met `grid-cols-1`).

---

## Bronnen (rechtstreeks geanalyseerd, juli 2026)
- `https://inspace.io/` — homepage HTML + 10 inline `<style>`-blokken
- `https://inspace.io/wp-content/themes/inspace/front/build/assets/main-*.css` — hoofd-Tailwind-bundel (root-tokens, utility-classes)
- `https://inspace.io/wp-content/themes/inspace/assets/navbar/inspace-navbar.css` — navigatie- en Aura/Nova-mockup-styling
