# UX & Design

Leidend voor elk scherm. Tokens en primitieven staan in `app/globals.css`; dit document legt uit
wat ze zijn en wanneer je welke gebruikt.

## 1. Productregels

Het uitgangspunt: **snapt een niet-technische klant dit binnen 5 seconden zonder na te denken?**

- **Eén hoofdgetal.** De klant ziet één zichtbaarheidsscore. Alles daaronder is verdieping, geen
  verplichting.
- **Geen jargon.** Niet "share of voice" maar "hoe vaak jij genoemd wordt vs. je concurrenten".
  Niet "klantprofiel" maar "merk" — dat eerste is bureau-jargon.
- **Slimme defaults.** 30 prompts staan automatisch klaar; de klant start nooit met een leeg
  scherm, maar kan altijd bijsturen.
- **Transparant vóór er iets gemeten wordt.** De klant ziet en bewerkt eerst wat het systeem heeft
  afgeleid, en geeft pas dan akkoord. Geen black box, en niets betaalds zonder klik.
- **Bewijs verslaat cijfer.** Wat ChatGPT letterlijk antwoordt overtuigt meer dan welke score dan
  ook. Bij elke feature: kunnen we het onderliggende bewijs tonen in plaats van de conclusie?
- **Geen schijnprecisie.** Een schatting wordt nooit gepresenteerd als meting. Staat er een
  onzekerheidsmarge onder, dan is die zichtbaar in de UI, niet alleen in een comment.
- **De klant wacht nooit op ons.** Geen actie hangt af van een openstaande browsertab. Werk draait
  op de achtergrond; de UI toont voortgang en is verversbaar.
- **Rust boven volledigheid.** Een handvol widgets per scherm, witruimte.

## 2. Kleur en typografie

Gebaseerd op een analyse van de live CSS van inspace.io (juli 2026). **Licht systeem, bewust geen
dark mode** — `globals.css` kent alleen `:root`/`[data-theme="light"]` en zet
`html { color-scheme: light; }`.

```css
/* Achtergronden: pagina → kaart → veld */
--bg-base: #f7f8f6;  --bg-surface: #ffffff;  --bg-elevated: #f1f2ee;  --bg-surface-2: #e9ebe5;

/* Merk */
--accent-purple: #8511d9;       --accent-purple-soft: #a24dec;
--accent-purple-glow: rgba(133,17,217,.14);
--accent-green: #b9efa3;        --accent-green-text: #2e9e50;  --accent-green-dark: #54b86a;
--brand-gradient: linear-gradient(96deg, #54b86a 0%, #8511d9 96%);   /* de signatuur */

/* Tekst en randen */
--text-primary: #0b0b0c;  --text-secondary: rgba(11,11,12,.62);  --text-muted: rgba(11,11,12,.45);
--border-subtle: rgba(11,11,12,.1);  --border-strong: rgba(11,11,12,.22);

/* Status */
--status-success: #2e9e50;  --status-error: #d33a3f;
--status-warning: #b9a27a;  --status-info: #8511d9;

/* Radii, motion */
--radius-pill: 999px;  --radius-lg: 18px;  --radius-md: 14px;  --radius-sm: 9px;
--ease-standard: cubic-bezier(.2,.7,.2,1);
--duration-fast: .2s;  --duration-base: .3s;  --duration-slow: .45s;
```

**Fonts:** Geist Sans + JetBrains Mono via `next/font`. Dit zijn bewust de open-source vervangers
van InSpace's Aeonik en TT Commons — die zijn commercieel gelicenseerd en mogen we niet overnemen.

**Zes principes voor consistente toepassing:**

1. **Gloed in plaats van harde randen.** Elevatie en focus communiceren via een gekleurde
   `box-shadow` in de accentkleur bij lage opaciteit, niet via felle borders.
2. **Interactieve elementen zijn pilvormig.** Knoppen, badges en chips op `--radius-pill`; alleen
   containers en kaarten gebruiken de kleinere radii.
3. **Mono is gereserveerd voor technische UI-tekst.** Labels, statuscaptions, badges en
   stat-waarden in `--font-mono`, uppercase, breed getrackt (`.08em`–`.2em`). Body en koppen in
   `--font-sans`. Dit mono-in-kapitaal-trucje is de herkenbaarste typografische keuze van het
   systeem — het geeft de "technische read-out"-uitstraling die bij een meetproduct past.
4. **Eén easing overal:** `--ease-standard`.
5. **Status is kleur + vorm, nooit kleur alleen.** Een pulserende dot, een pijl (`↑`/`↓`) of een
   chip — toegankelijkheid.
6. **Gloed-orbs spaarzaam:** groot en zeer vervaagd (`blur(40–90px)`) achter hero-secties, nooit
   als decoratie in kleine componenten.

## 3. Componenten

Gebruik de primitieven uit `globals.css`. Ze bestaan omdat er anders drift ontstaat — er stonden
ooit 30 handgebouwde inline-`style`-objecten met hardgecodeerde `rgba()`-waarden over 17 bestanden,
waaronder twee kleuren die niet in het token-set stonden (een tweede paars en een tweede rood, op
schermen die de gebruiker na elkaar ziet).

| Primitief | Regel |
|---|---|
| `.card` | Statisch. **Geen hover** — een kaart die bij hover omhoog schaduwt belooft interactie. |
| `.card-interactive` | Alleen op daadwerkelijk klikbare kaarten (de lijstitems). Hier hoort de hover. |
| `.card-accent` / `.card-danger` / `.card-success` | Getinte kaartranden. |
| `.btn-primary` / `.btn-outline` | Beide 48px. `.btn-sm` = 40px. Eén hoogte-schaal, geen uitzonderingen. |
| `.btn-green` | De positieve afronding: publiceren, bevestigen. |
| `.chip` + `.chip-success` / `-danger` / `-warning` / `-neutral` / `-green` | Nooit met de hand een tint nabouwen. |
| `.mono-label` | Kleine uppercase labels in mono. |
| `.field` | Formuliervelden, inclusief focus-state. |
| `.live-dot` | Pulserende indicator voor "loopt nu". |
| `.skeleton` | Laadvlak, respecteert `prefers-reduced-motion`. |
| `.prose` | Lange tekst (rapport, contentpagina). |
| `PageHeader`, `EmptyState`, `Narrow` | Eén variant per patroon, geen lokale kopieën. |
| `ConfidenceChip` (`components/confidence-chip.tsx`) | Zekerheid is een **niveau**, nooit een getal: zeker (geen markering) · onzeker (amber) · niet vastgesteld (mono-label "niet gevonden"). "0.62" zegt een MKB'er niets. |

## 4. Loading, error en lege staten

Elke route krijgt systeem-feedback. Zonder `loading.tsx` geeft een RSC-pagina met 4–7
database-queries een dood interval zonder enige terugkoppeling.

- **`loading.tsx` per sectie**, met een **skeleton, geen spinner**. Een skeleton communiceert
  *waar* de inhoud komt; een spinner alleen *dat* er gewacht wordt. De vorm van de skeleton is de
  vorm van de kaarten die eronder komen.
- **`app/error.tsx`** en **`app/not-found.tsx`** renderen binnen de AppShell, via `ErrorNotice`:
  mensentaal boven, techniek weggevouwen. Nooit een kale Next.js-foutpagina.
- **Lege staat** = `EmptyState`, en die wijst altijd naar de juiste volgende stap. Een lege
  `/analyses` die alleen "geen analyses" zegt is een dood einde bij de instap.
- **Voortgang is server-state.** Elke live indicator wordt afgeleid van `analyses.status` + de
  `jobs`-tabel, nooit uit een client-side animatie — een refresh of latere terugkeer moet de
  werkelijke stand tonen.

## 5. Navigatie en schermstructuur

**Twee bestemmingen:** `/analyses` en `/profielen` (label: "Merken"). Eén bron: `lib/nav.ts`.
Account zit achter het profielmenu. Navigatie is een belofte over de omvang van een product; twee
links die naar dezelfde route wijzen kosten vertrouwen in de hele balk. De routes heten nog
`/profielen` zodat bestaande bladwijzers blijven werken — wat de klant leest is wat telt.

**Een analyse is één dossier in vier hoofdstukken**, geen tabbalk:

```
01  STAND       Hoe sta ik ervoor?     score · verandering · wat het betekent
02  BEWIJS      Waar win en mis ik?    per vraag, met het letterlijke antwoord
03  WERK        Wat moet ik doen?      één lijst, elke regel een taak met status
04  RESULTAAT   Heeft het gewerkt?     effect van wat gepubliceerd is
```

De volgorde ís de logica: hoofdstuk 4 voedt volgende periode hoofdstuk 1. Tabs zijn juist als
secties onafhankelijk zijn en de gebruiker weet welke hij nodig heeft — geen van beide geldt hier.
Een verticale as kan volgorde uitdrukken, een horizontale tabrij niet. Bijkomend: het bewijs staat
direct onder de bewering, in plaats van een tabblad verderop.

Oriëntatie via de **sectie-rail** (`components/section-rail.tsx`): genummerde mono-labels, paarse
actieve markering, scroll-spy. Desktop verticaal en sticky links; tablet/mobiel een sticky
horizontale chiprij. De rail toont stand per hoofdstuk ("4 open", een `live-dot` bij een lopende
meting) — iets wat een tabbalk niet doet.

De bibliotheek blijft een eigen plek: het is een eindproduct, geen takenlijst die zich als archief
voordoet. Het conceptscherm is een eigen route.

### Het profielscherm

Geen sectie-rail: de blokken hebben geen vaste chronologie zoals de vier
hoofdstukken van een analyse, en een rail belooft een volgorde die er niet is.
Wel een kop met **de merknaam, één duidingszin en drie cijfers** — herkenning,
koopvragen, structurele dekking (`profile-hero.tsx`, gerekend in
`lib/pipeline/onboarding-summary.ts`).

De volgorde ís het demogesprek: kop → voortgang → dossier → wat AI over je weet →
aanbod → onderwerpen → gesprek → techniek → profielgegevens → beheer. Eerst wat we
vonden, dan wat er mist, dan wat we gaan doen. De gespreksagenda (`ProfileGaps`)
staat bewust ná de opbrengst en niet ervoor: waarde vóór inspanning, en die
agenda ís de inspanning. Toewijzen staat onderaan en alleen voor beheerders — het
is een handeling van ná het gesprek, op een scherm dat de klant meekijkt.

Elk blok is een `ProfileSection`: op desktop open, op mobiel ingeklapt, met een
`id` zodat de springlinks in de kop er rechtstreeks naartoe gaan.

**Een paneel dat niets te tonen heeft, verdwijnt niet.** Het toont waaróm het
leeg is en wat de volgende stap is. Stil verdwijnen is erger dan het dode einde
uit §4: de klant weet dan niet dat de functie bestaat, en de consultant kan het
gat niet uitleggen omdat er geen gat te zien is.

## 6. Eén werkmodel

`lib/work.ts` is de enige statusmachine voor "werk". Daarvoor bestond werk in vijf vormen die
niets van elkaar wisten — dashboard-acties, rapport-aanbevelingen, off-site taken, het oordeel per
pagina in de bibliotheek en de feitenvragen — elk met eigen woorden, kleuren en volgorde.

- `WorkKind` (`blokkade` · `goedkeuring` · `herstel` · `feit` · `pagina` · `offsite`) is alleen
  een etiket.
- `WorkState` bepaalt de volgorde op het scherm: **`nu`** (klant moet iets) → **`loopt`** (wij zijn
  bezig) → **`wacht`** (gedaan, resultaat duurt weken) → **`klaar`**.

De klant groepeert niet naar "on-site of off-site" — dat is onze indeling. Hij groepeert naar
"moet ik hier iets?". Vandaar de staat als hoofdas.

**De opgerolde `nu`-lijst hoort bij de analyse, niet bij het overzicht ervoor.** `/analyses`
(`lib/dashboard.ts`) toonde die lijst eerder ook, over alle analyses heen — bedoeld als "waar moet
ik als eerste zijn", maar bij meerdere lopende analyses liep dat op tientallen punten in één kaart
en werd het overzicht zélf de rommel die het werkmodel per analyse juist moest voorkomen. `/analyses`
toont nu alleen nog de drie statusblokken (`DashboardStats`, `components/dashboard-stats.tsx`) en
de analysenlijst; de werklijst blijft uitsluitend in hoofdstuk 03 van het dossier, per analyse.

Elke rij in de analysenlijst toont in plaats daarvan vier vaste kaartcijfers plus het aantal
metingen (`AnalysisCardMetrics`, `components/analysis-card-metrics.tsx`): zichtbaarheidsscore,
aantal openstaande vragen, aantal voorgestelde en aantal geschreven pagina's, en "N metingen". Die
cijfers komen uit dezelfde bronnen als het werkmodel (`visibility_scores`, `content_pieces`,
`reports`) — het kaartje kan dus nooit iets anders beweren dan de analyse zelf verderop laat zien.

## 7. Responsive

**Desktop is het ontwerpuitgangspunt** (daar zit de meerderheid), maar mobiel is nadrukkelijk
**geen verkleinde desktop**: lagere informatiedichtheid vraagt een andere indeling, niet kleinere
componenten. Steek in elk schermformaat evenveel ontwerp-effort.

Breakpoints volgen de Tailwind-schaal: basis (< 640) · `sm` 640 · `md` 768 (tablet) · `lg` 1024
(**uitgangspunt**) · `xl` 1280. Dat Tailwind-utilities technisch mobile-first zijn is een
implementatiedetail; het ontwerpproces blijft desktop-first.

| Component | Desktop | Mobiel |
|---|---|---|
| Sectie-rail | Verticaal, sticky links | Sticky horizontale chiprij onder de kop |
| Lijsten met meerdere datapunten | Tabelachtige rijen | Gestapelde kaarten |
| Formulieren | Mogen meerdere kolommen | Altijd één kolom, volle breedte |
| Dichte detailschermen | Twee kolommen, secties open | Accordion, standaard dicht |
| Primaire CTA op lang scherm | Aan het eind van de sectie | Sticky onderbalk |
| Grafieken | Volledige multi-serie grafiek | Kernwaarde + sparkline |
| Modals | Gecentreerd | Full-screen sheet |

Vaste mobiele regels: tikdoelen ≥ 44×44px · formuliervelden ≥ 16px (anders zoomt iOS Safari in) ·
geen interactie mag van hover afhangen.

**Het conceptscherm is de toetssteen** — het informatiedichtste scherm én het enige dat iedere
analyse verplicht doorloopt. Desktop: ruim, secties open. Mobiel: elke veldgroep en promptcategorie
inklapbaar en standaard dicht, met "Bevestig en start meting" sticky onderaan.

**Werkwijze:** ontwerp eerst de volle desktopindeling, bepaal daarna expliciet hoe diezelfde
informatie op mobiel anders wordt ingedeeld. "Werkt met kleinere Tailwind-classes" is onvoldoende;
de layoutstructuur zelf mag verschillen.
