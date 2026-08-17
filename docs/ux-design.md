# UX & Design

Leidend voor elk scherm. Tokens en primitieven staan in `app/globals.css`; dit document legt uit
wat ze zijn en wanneer je welke gebruikt. **Peildatum: 13 augustus 2026.** De vormgeving zelf ging
op 6 augustus over op het systeem van de NOVA-workspace (volledige verantwoording in
`designsystem.md`); deze datum volgt de gedragspatronen die daarna zijn bijgekomen (statustaal,
foutafhandeling, de content-editie).

> **Voor de tékst in die schermen geldt `docs/schrijfstijl.md`**: de tone-of-voice van ORBIT ENGINE,
> afgeleid van InSpace Nova. Dit document gaat over hoe iets eruitziet, dat over hoe het klinkt.
> De productregels hieronder gaan vóór allebei: is een formulering kosmisch maar onduidelijk, dan
> wint de duidelijkheid.

## 1. Productregels

Het uitgangspunt: **snapt een niet-technische klant dit binnen 5 seconden zonder na te denken?**

- **Eén hoofdgetal.** De klant ziet één zichtbaarheidsscore. Alles daaronder is verdieping, geen
  verplichting.
- **Geen jargon.** Niet "share of voice" maar "hoe vaak jij genoemd wordt vs. je concurrenten".
  Niet "klantprofiel" maar "merk". Dat eerste is bureau-jargon.
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

**Bron: de NOVA-workspace van InSpace** (`nova.inspace.io`), hun ingelogde productomgeving, niet hun
marketingsite. Dat onderscheid is het hele punt; `designsystem.md` §1 legt uit waarom.
**Licht systeem, geen donkere modus**: `globals.css` kent alleen `:root` en `[data-theme="light"]` en
zet `html { color-scheme: light; }`. Dat is definitief, niet voorlopig: besluit 17 van 11 augustus
2026 schrapte de donkere modus uit het plan, zie `designsystem.md` §10.

De volledige tokenlijst staat in `designsystem.md` §2 en hoeft hier niet herhaald te worden. Wat je
moet weten om een scherm te bouwen:

```css
/* Neutralen: koel leiblauw, geen warm groengrijs */
--bg-base: #f8fafc;  --bg-surface: #ffffff;  --bg-elevated: #e7edf2;  --bg-surface-2: #dce3ea;
--text-primary: #17212b;  --text-secondary: #43505d;  --text-muted: #788795;
--border-subtle: #e7edf2;  --border-strong: #c2ccd6;  --border-contrast: #9daab6;

/* Betekenissen, elk met -solid, -on-solid, -text, -surface en -border */
--intent-intelligence-*   het merk, AI, de primaire actie
--intent-growth-*         gelukt, gestegen, gepubliceerd
--intent-information-*    een mededeling
--intent-warning-*        kijk hier even naar
--intent-attention-*      vraagt een keuze, is niet fout
--intent-danger-*         blokkade, mislukt, onomkeerbaar
--intent-premium-*        betaald, hoogste plan
--intent-neutral-*        uit, niet van toepassing

/* Vorm: de pil is NIET meer de standaard */
--radius-md: 8px;    knoppen, velden, navigatie
--radius-lg: 12px;   kaarten
--radius-pill;       alleen chips, badges en voortgangsbalken

/* Diepte: één schaduw, voor wat zweeft. Verder plat. */
--shadow-overlay: 0 4px 6px -4px rgba(0,0,0,.1), 0 10px 15px -3px rgba(0,0,0,.1);
```

**Fonts:** Geist Sans en Geist Mono via `next/font`, het paar dat Nova zelf gebruikt. Mono was
JetBrains Mono. Aeonik en TT Commons van InSpace zijn commercieel gelicenseerd en mogen we niet
overnemen; Geist is daar de open-source tegenhanger van.

**Acht principes voor consistente toepassing:**

1. **Een kleur heeft een betekenis, geen naam.** Gebruik `--intent-growth-text`, nooit
   `--accent-green`, en nooit een hexwaarde of een rauwe `rgba()` in een component of een
   hulpfunctie. Elke kleur buiten `globals.css` is een fout die zich verspreidt: die kleur mist
   de volgende paletwijziging, en niemand ziet dat totdat twee schermen die elkaar opvolgen twee
   tinten groen tonen. Dat gebeurde letterlijk: `lib/analysis-status.ts` had `info` en `success`
   allebei op hetzelfde oude marketingsite-groen staan, ontdekt op 6 augustus 2026, ná de eerste
   opruimronde, omdat die controle destijds alleen `.tsx` bestreek en dit een `.ts`-bestand is.
   **Controle vóór een commit, beide moeten nul regels geven (nu ook op `.ts`):**

   ```bash
   grep -rnE "#[0-9a-fA-F]{6}\b" app components lib --include="*.tsx" --include="*.ts" \
     | grep -v themeColor | grep -v "lib/email/"
   grep -rnE "rgba?\([0-9]" app components lib --include="*.tsx" --include="*.ts" \
     | grep -v "lib/email/"
   ```

   Twee uitzonderingen, allebei functioneel en geen van beide een gemiste opruiming:
   `themeColor` in `app/layout.tsx` gaat naar de browserbalk van het besturingssysteem en kan geen
   CSS-variabele zijn, en `lib/email/*.ts` is HTML voor e-mailclients, die begrijpen geen
   `var(--...)`.
2. **Plat, niet gloeiend.** Rand en vlak dragen de hiërarchie. De ene schaduw is voor wat boven de
   pagina zweeft: menu's, dialogen, de hover van een klikbare kaart. Een gewone kaart is plat.
   De enige gloed die overblijft is de focusring, en die is toegankelijkheid.
3. **De pil is voor chips.** Knoppen, velden en navigatie-items krijgen `--radius-md`. De oude regel
   "interactieve elementen zijn pilvormig" was de marketingsite.
4. **Status is kleur plus vorm, nooit kleur alleen.** Een pulserende dot, een pijl (`↑` of `↓`) of
   een chip met tekst. Dat is toegankelijkheid.
5. **Mono is voor cijfers, niet voor labels.** `.stat-value` voor waarden die je vergelijkt,
   `.mono-label` als kicker boven een titel, en die is sinds de overstap sans.
6. **Contrast is een tokenkeuze.** `-text` op een licht vlak, `-on-solid` op een gevuld vlak, en
   `--text-muted` (3,7:1) nooit voor iets wat gelezen moet worden.
7. **Eén easing overal** (`--ease-standard`), en korte duur: 0,12s tot 0,3s.
8. **De merk-gradient is het woordmerk.** Nergens anders. In de Nova-werkomgeving komt hij nul keer
   voor.

## 3. Componenten

Gebruik de primitieven uit `globals.css`. Ze bestaan omdat er anders drift ontstaat: er stonden
ooit 30 handgebouwde inline-`style`-objecten met hardgecodeerde `rgba()`-waarden over 17 bestanden,
waaronder twee kleuren die niet in het token-set stonden (een tweede paars en een tweede rood, op
schermen die de gebruiker na elkaar ziet).

| Primitief | Regel |
|---|---|
| `.card` | Wit, één rand, **plat**. Geen schaduw, geen hover; een kaart die bij hover omhoog komt belooft interactie. |
| `.card-interactive` | Alleen op daadwerkelijk klikbare kaarten (de lijstitems). Hier hoort de hover. |
| `.card-accent` / `.card-danger` / `.card-success` / `.card-warning` | Getinte kaartranden. |
| `.btn-primary` / `.btn-outline` | Beide 40px, `--radius-md`, geen pil meer. `.btn-sm` = 32px, `.btn-lg` = 44px. |
| `.btn-lg` | 44px, de aanbevolen minimale tikdoelgrootte (WCAG 2.5.5). Combineren met `.btn-primary`/`.btn-outline`, alleen op de ÉNE hoofdactie van een scherm dat vaak op een telefoon bediend wordt (bevestigen, publiceren, "schrijf alles"). Niet de standaard, anders verdwijnt de dichtheid die 40px juist opleverde. |
| `.no-print` | Verbergt chrome (bovenbalk, hoofdstuk-rail, tabbladen, vaste actiebalken) in het printstijlblad onderaan `globals.css` (B.13). Het dossier IS het rapport, er is geen aparte printpagina. |
| `.chip` + `-success` / `-danger` / `-warning` / `-info` / `-attention` / `-neutral` / `-green` | Pilvormig, sans, schrijftaal. Nooit met de hand een tint nabouwen. Dat gebeurde toch, in vijf componenten tegelijk; zie regel 1 hierboven en de `grep` die het nu tegenhoudt. |
| `.mono-label` | De kicker bóven een titel: klein, uppercase, **sans**. Heet nog "mono" omdat hij op tientallen plekken staat; hernoemen raakt te veel bestanden voor alleen een naam. |
| `.stat-value` | Cijfers die je vergelijkt, in mono met `tabular-nums`. |
| `.field` | Formuliervelden, 40px, wit met een rand, inclusief focusring. |
| `.live-dot` | Pulserende indicator voor "loopt nu". |
| `.skeleton` | Laadvlak, respecteert `prefers-reduced-motion`. |
| `.prose` | Lange tekst (rapport, contentpagina). |
| `.brand-gradient-text` | **Alleen het woordmerk ORBIT ENGINE.** Nergens anders. |
| `PageHeader`, `EmptyState`, `Narrow` | Eén variant per patroon, geen lokale kopieën. |
| `ConfidenceChip` (`components/confidence-chip.tsx`) | Zekerheid is een **niveau**, nooit een getal: zeker (geen markering) · onzeker (amber) · niet vastgesteld (mono-label "niet gevonden"). "0.62" zegt een MKB'er niets. |
| `CopyButton`, `ExternalLink`, `LastUpdated` (`components/`) | H.63-65: drie kleine primitieven tegen herhaling, klembord, "verlaat de app"-pijltje, relatieve datum met volledige datum als tooltip. Elke plek die zelf `navigator.clipboard` of `target="_blank"` opnieuw uittypte, hoort hierheen te verhuizen. |
| `TableOfContents` (`components/table-of-contents.tsx`) | H.68: inhoudsopgave bij een contentpagina met 3+ koppen, gevoed door `extractHeadings()` in `lib/markdown.ts`. De ankers komen uit dezelfde functie die `renderMarkdown()` zijn `id`'s geeft, dus ze kunnen nooit uit de pas lopen. |
| `SearchPreview` (`components/search-preview.tsx`) | Content-editie: een gemockt zoekresultaat, naar Nova's "Search preview". Puur presentationeel, tweemaal ingezet op dezelfde contentpagina: statisch met de opgeslagen tekst, en live binnen `ContentEditor` met de lokale invoerstate. `isReal` voorkomt dat een voorgestelde URL (`lib/pipeline/slug.ts`) als feit oogt. |
| `VersionDiff` (`components/version-diff.tsx`) | Content-editie: het verschil met de vorige versie, lazy opgehaald bij uitklappen. `<del>`/`<ins>` met `--intent-danger`/`--intent-growth`-tokens, nooit hardgecodeerd. |
| `FaqEditor` (`components/faq-editor.tsx`) | Content-editie: zelfde vorm als `TagListEditor` (`items`/`onChange`), nu voor vraag-antwoordparen. Herordenen met ↑/↓-knoppen, geen sleep-library. |
| `WhyThisPage` (`components/why-this-page.tsx`) | Content-editie: het "waarom deze pagina"-contextpaneel, naar Nova's "Why This Page Exists?". Toont ORBIT ENGINE's eigen metriek (echt gemeten AI-vragen), en sinds 13 augustus bovenaan de potentiescore van die pagina via `PotentialMetrics` (zie hieronder). |
| `PotentialMetrics` / `PotentialInline` (`components/potential-metrics.tsx`) | De potentiescore (`docs/tasks/potentiescore.md`), altijd als drietal: Zichtbaarheid, Zoekvolume, Potentie, elk 0-100 met een `InfoHint`. `PotentialMetrics` is drie tegels (analysedossier, contentpagina); `PotentialInline` is één compacte tekstregel voor een lijst met veel items (voorgestelde pagina's, de onderwerpenlijst, de Kansen-chip). Onbekend is altijd "-" (gewoon koppelteken, zie richtlijn 10), nooit een gegokt getal. |
| `ToastProvider` / `useToast` (`components/toast.tsx`) | Broodroostermeldingen. **Voor gebeurtenissen, niet voor uitslagen**: een uitslag hoort in de pagina, een gebeurtenis (het onderzoek is klaar, je wijziging is opgeslagen) hoort in een melding. Altijd `title` én `description`, net als bij Nova. Vorm en timing zijn letterlijk die van Nova: 0,15s in vanaf `translateX(1rem)`, 0,12s uit, en een streepje onderaan dat leegloopt over de levensduur. Standaard 6s; een fout blijft staan tot je hem wegklikt. Op mobiel komt hij van onderen, daar is de duim. |

## 4. Loading, error en lege staten

Elke route krijgt systeem-feedback. Zonder `loading.tsx` geeft een RSC-pagina met 4–7
database-queries een dood interval zonder enige terugkoppeling.

- **`loading.tsx` per sectie**, met een **skeleton, geen spinner**. Een skeleton communiceert
  *waar* de inhoud komt; een spinner alleen *dat* er gewacht wordt. De vorm van de skeleton is de
  vorm van de kaarten die eronder komen.
- **`app/error.tsx`** en **`app/not-found.tsx`** renderen binnen de AppShell, via `ErrorNotice`:
  mensentaal boven, techniek weggevouwen. Nooit een kale Next.js-foutpagina.
- **`SectionErrorBoundary`** (`components/section-error-boundary.tsx`) isoleert een crash tot één
  sectie. `app/error.tsx` vangt de HELE pagina; het dossier (`analyses/[id]/page.tsx`) heeft vier
  onafhankelijke hoofdstukken achter elk hun eigen `<Suspense>`, en die staan nu ook elk achter een
  eigen boundary. Crasht hoofdstuk 02 op een onverwachte datavorm, dan blijven 01, 03 en 04 gewoon
  werken.
- **Lege staat** = `EmptyState`, en die wijst altijd naar de juiste volgende stap. Een lege
  `/analyses` die alleen "geen analyses" zegt is een dood einde bij de instap.
- **Voortgang is server-state.** Elke live indicator wordt afgeleid van `analyses.status` + de
  `jobs`-tabel, nooit uit een client-side animatie. Een refresh of latere terugkeer moet de
  werkelijke stand tonen.
- **Server- en netwerkfouten apart afvangen.** Een `catch` die zowel een `!res.ok`-server-antwoord
  als een mislukte `fetch()` zelf opvangt, toont bij een weggevallen verbinding al snel de rauwe
  JS-foutmelding ("Failed to fetch") in plaats van iets leesbaars. Het patroon staat in
  `lib/errors.ts`/`components/error-notice.tsx` (`classifyError`/`problemFromResponse`/
  `networkProblem`): elke schrijfactie splitst "de server zei nee" (boodschap van de server) van
  "de server was niet te bereiken" (vaste, geruststellende tekst), nooit één generieke vangst voor
  allebei.
- **Optimistische updates draaien terug bij een mislukking.** Een schakelaar of chip die meteen
  van staat verandert (`tracking-toggle.tsx`, `prompts-manager.tsx`) moet bij een mislukte
  server-call de oude waarde herstellen én dat zeggen. Een staat die verandert maar niet is
  opgeslagen, is erger dan geen directe terugkoppeling.
- **Bij wie ligt de bal? (`WhoseTurn`, `lib/analysis-status.ts`/`lib/profile-status.ts`)** Naast de
  technische status (`AnalysisStatus`/`ProfileStatus`, de bron van waarheid) een leesbare laag
  ernaast: "Wacht op jou" · "ORBIT ENGINE is bezig" · niets als de staat af of informatief is (`null`).
  Naar Nova's tweelaags-statustaal ("Waiting in your CMS" naast de technische status).
  `showWhoseTurn` staat aan op `StatusBadge`/
  `ProfileStatusBadge` waar de klant maar één status per keer ziet (de kop van een analyse of een
  profiel); in een lijst met tien analyses zou een tweede regel per rij meer ruis dan hulp zijn,
  daar telt de chip zelf al.
- **Bevestiging vóór een onomkeerbare handeling.** Geen modaal venster: één klik wordt twee
  (`RerunResearchButton` was het eerste voorbeeld, `PublishBox` volgt hetzelfde patroon voordat
  het twee hermetingen in de rij zet). Eerst de knop, dan pas bij een tweede klik de handeling
  zelf, met een korte zin erbij wat er gaat gebeuren.
- **Mislukte analyses en profielen bovenaan, niet verstopt.** "Mijn analyses" en "Merken" sorteren
  op `whoseTurn === "jij"` (dus zowel "wacht op je goedkeuring" als "niet gelukt") en tonen bij een
  mislukking een rode kaart bovenaan de lijst. Zonder dat moest een klant met meerdere analyses ze
  stuk voor stuk openen om een storing te vinden, er was geen centrale plek waar een fout
  zichtbaar werd.
- **Elke pagina een eigen tabbladtitel.** `generateMetadata`/`export const metadata`, met een
  titelsjabloon op `analyses/[id]/layout.tsx` (`%s · {analysenaam} · ORBIT ENGINE`) dat naar alle
  subroutes cascadeert. `getAnalysis()`/`getProfile()` zijn gememoïseerd (React `cache()`, zelfde
  patroon als `isStaff()` in `lib/staff.ts`) zodat `generateMetadata` geen tweede query naast de
  pagina zelf doet.

## 5. Navigatie en schermstructuur

### De merk-werkruimte

Sinds besluit 1 (`docs/logbook.md`, het inmiddels verwijderde `Nova.md` §0) is de app een
**merk-werkruimte**: je kiest bovenin een merk en
daarna gaat alles over dát merk. De navigatie valt daarmee in twee soorten uiteen, en dat onderscheid
past horizontaal niet zonder scheidingstekens die niets betekenen. Vandaar een **zijbalk**
(`components/sidebar.tsx`), met twee groepen:

| Groep | Wat erin staat |
|---|---|
| De merknaam | Merkdossier, Analyses van dit merk |
| Algemeen | Alle merken, Alle analyses, Instellingen |

**De kiezer verschijnt niet altijd.** Bij precies één merk staat de naam er als tekst en niet als
knop: een kiezer met één optie belooft een keuze die er niet is. Het zoekveld erin verschijnt pas
vanaf acht merken. Nova doet allebei ook zo.

**De keuze staat in een cookie** (`orbit_engine_merk`) en niet in de URL: hij moet blijven staan op schermen
die zelf geen merk kennen (`/instellingen`), en een querystring zou aan élke link geplakt moeten
worden. ⚠️ Die cookie is een **voorkeur, nooit een recht**: `listBrands()` controleert altijd opnieuw
of je bij dat merk mag, en de toegangscontrole zelf zit in `getOwnedProfile()`.

**De routes zijn niet verhuisd.** `/profielen/[id]` blijft `/profielen/[id]`: er staan bladwijzers en
gedeelde demolinks naar die adressen, en een werkruimte is een kwestie van context, niet van andere
URL's. `/analyses?merk=` filtert de lijst, met een zichtbare chip en een uitweg terug, want een lijst
die stilletjes korter is dan je verwacht leest als data die weg is.

**Vaste breedtes in de zijbalk** (240px, ingeklapt 64px). Een zijbalk die meegroeit met de langste
merknaam laat de hele pagina verspringen zodra je wisselt.

**Twee bestemmingen:** `/analyses` en `/profielen` (label: "Merken"). Eén bron: `lib/nav.ts`.
Account zit achter het profielmenu. Navigatie is een belofte over de omvang van een product; twee
links die naar dezelfde route wijzen kosten vertrouwen in de hele balk. De routes heten nog
`/profielen` zodat bestaande bladwijzers blijven werken. Wat de klant leest, is wat telt.

**Een analyse is één dossier in vier hoofdstukken**, geen tabbalk:

```
01  STAND       Hoe sta ik ervoor?     score · verandering · wat het betekent
02  BEWIJS      Waar win en mis ik?    per vraag, met het letterlijke antwoord
03  WERK        Wat moet ik doen?      één lijst, elke regel een taak met status
04  RESULTAAT   Heeft het gewerkt?     effect van wat gepubliceerd is
```

De volgorde ís de logica: hoofdstuk 4 voedt volgende periode hoofdstuk 1. Tabs zijn juist als
secties onafhankelijk zijn en de gebruiker weet welke hij nodig heeft. Geen van beide geldt hier.
Een verticale as kan volgorde uitdrukken, een horizontale tabrij niet. Bijkomend: het bewijs staat
direct onder de bewering, in plaats van een tabblad verderop.

Oriëntatie via de **sectie-rail** (`components/section-rail.tsx`): genummerde mono-labels, paarse
actieve markering, scroll-spy. Desktop verticaal en sticky links; tablet/mobiel een sticky
horizontale chiprij. De rail toont stand per hoofdstuk ("4 open", een `live-dot` bij een lopende
meting), iets wat een tabbalk niet doet.

**Dezelfde regel geldt op de contentdetailpagina** (`analyses/[id]/bibliotheek/[pieceId]/page.tsx`,
content-editie): geen tabbladen, wél een leesvolgorde die van context naar handeling loopt.
Context (`WhyThisPage`, waarom deze pagina) → wat er nu staat (`SearchPreview`, inhoudsopgave,
artikel, FAQ) → kwaliteitscontrole (GEO-score, vrijgavepaneel) → bewerken (`ContentEditor`, met
een Bewerken/Voorbeeld-toggle in plaats van een aparte route) → geschiedenis en vergelijken
(`VersionDiff`) → publiceren. Elke stap bouwt op de vorige: je leest eerst waarom de pagina
bestaat en wat erop staat, vóór je hem aanpast, en de kwaliteitscontrole staat vóór de
bewerkknop, niet erna.

De bibliotheek blijft een eigen plek: het is een eindproduct, geen takenlijst die zich als archief
voordoet. Het conceptscherm is een eigen route.

### Wat de klant ziet en wat alleen jij ziet

Vastgelegd op 10 augustus 2026, en **gegrond in wat Nova daadwerkelijk toont**, niet in een aanname.

Een Nova-klant ziet precies vier bestemmingen (`nav`: Overview, Strategy, Analytics, Account). Alles
wat de CSM ÓVER een klant vastlegt zit in de aparte `admin`-namespace, inclusief
`admin.onboardingProfile` ("View onboarding profile for {domain}"). Er is in hun hele
berichtenbestand geen enkele sleutel waarmee een klant de notities van zijn CSM zou kunnen lezen.

Toegepast op ORBIT ENGINE's merkdossier:

| Blok | Klant | Consultant | Waarom |
|---|---|---|---|
| Dossier, nulmeting, aanbod, onderwerpen | ✅ | ✅ | Dit is wat de klant komt halen |
| Wat ORBIT ENGINE nog wil weten | ✅ | ✅ | De vragen zijn áán hem gericht |
| Technische controle, profielgegevens | ✅ | ✅ | Zijn site, zijn gegevens |
| **Het gesprek** (notities, contextfactoren) | ❌ | ✅ | Aantekeningen óver hem, niet vóór hem |
| **Beheer** (toewijzen) | ❌ | ✅ | Handeling van ná het gesprek |

De grens loopt langs `isStaff()`, niet langs de accountrol: het gaat om ORBIT ENGINE's eigen team tegenover
iedereen daarbuiten. Een accountbeheerder bij een bureau is nog steeds een klant.

⚠️ **Een afgeschermd blok haalt ook zijn springlink weg** (`showNotes` in `ProfileHero`). Een link
naar een blok dat er niet is, is een dode link, en dat is zichtbaarder dan het blok zelf.

### Het profielscherm

Geen sectie-rail: de blokken hebben geen vaste chronologie zoals de vier
hoofdstukken van een analyse, en een rail belooft een volgorde die er niet is.
Wel een kop met **de merknaam, één duidingszin en drie cijfers**, herkenning,
koopvragen, structurele dekking (`profile-hero.tsx`, gerekend in
`lib/pipeline/onboarding-summary.ts`).

**Elk cijfer draagt zijn eigen eenheid.** De drie tegels stonden er als "6/6",
"2/3" en "1" en de eerste reactie van de eigenaar was "die slaan nergens op".
Terecht: de noemers waren onzichtbaar, en de derde was geen verhouding maar een
aantal. Nu is het label een hele vraag ("Kent ChatGPT je bedrijf?"), staat de
noemer ín de waarde (`1/15`), en legt een `explain`-veld achter een vraagteken
uit wát er precies geteld is. Dat is Nova's regel: daar staat de eenheid altijd
in het label zelf ("Total clicks this plan month", "Month {number} of 12").

De volgorde ís het demogesprek: kop → **is het af** → **wat ORBIT ENGINE nog wil weten** →
dossier → wat AI over je weet → aanbod → onderwerpen → gesprek → techniek →
profielgegevens → beheer.

**Is het af** (`ProfileReadinessPanel`, gerekend in
`lib/pipeline/profile-readiness.ts`) is Nova's "Review & launch" toegepast: zes
verplichte onderdelen met een stand per regel, een balk, en één zin die zegt of
je het scherm kunt delen. Nodig omdat het profiel op status `klaar` gaat na taak
2 van 8, waardoor "klaar" voor de consultant niets betekende. Openstaande
feitvragen blokkeren `compleet` bewust **niet**: anders staat elk profiel eeuwig
op 90% en betekent de melding niets meer.

**Wat ORBIT ENGINE nog wil weten** (`OpenQuestions`) is één blok waar er twee waren: de
vragen mét invoerveld zaten op plek 7 binnen "Profielgegevens", de open punten op
plek 5 binnen "Het gesprek". Voor de gebruiker is dat één ding, dus staat het op
één plek, hoog, met de teller in de kop.

Elk blok is een `ProfileSection` met een **titel én een omschrijving** (Nova geeft
élk blok allebei). Twee soorten: `verhaal` staat op desktop open en is wat de
consultant laat zien; `naslag` (techniek, profielgegevens, beheer) staat overal
dicht, want dat is gereedschap. Dat haalt ruim de helft van de paginahoogte weg
zonder één functie te kosten.

**Een paneel dat niets te tonen heeft, verdwijnt niet.** Het toont waaróm het
leeg is en wat de volgende stap is. Stil verdwijnen is erger dan het dode einde
uit §4: de klant weet dan niet dat de functie bestaat, en de consultant kan het
gat niet uitleggen omdat er geen gat te zien is.

## 6. Eén werkmodel

`lib/work.ts` is de enige statusmachine voor "werk". Daarvoor bestond werk in vijf vormen die
niets van elkaar wisten, dashboard-acties, rapport-aanbevelingen, off-site taken, het oordeel per
pagina in de bibliotheek en de feitenvragen, elk met eigen woorden, kleuren en volgorde.

- `WorkKind` (`blokkade` · `goedkeuring` · `herstel` · `feit` · `pagina` · `offsite`) is alleen
  een etiket.
- `WorkState` bepaalt de volgorde op het scherm: **`nu`** (klant moet iets) → **`loopt`** (wij zijn
  bezig) → **`wacht`** (gedaan, resultaat duurt weken) → **`klaar`**.

De klant groepeert niet naar "on-site of off-site". Dat is onze indeling. Hij groepeert naar
"moet ik hier iets?". Vandaar de staat als hoofdas.

**De opgerolde `nu`-lijst hoort bij de analyse, niet bij het overzicht ervoor.** `/analyses`
(`lib/dashboard.ts`) toonde die lijst eerder ook, over alle analyses heen, bedoeld als "waar moet
ik als eerste zijn", maar bij meerdere lopende analyses liep dat op tientallen punten in één kaart
en werd het overzicht zélf de rommel die het werkmodel per analyse juist moest voorkomen. `/analyses`
toont nu alleen nog de drie statusblokken (`DashboardStats`, `components/dashboard-stats.tsx`) en
de analysenlijst; de werklijst blijft uitsluitend in hoofdstuk 03 van het dossier, per analyse.

Elke rij in de analysenlijst toont in plaats daarvan vier vaste kaartcijfers plus het aantal
metingen (`AnalysisCardMetrics`, `components/analysis-card-metrics.tsx`): zichtbaarheidsscore,
aantal openstaande vragen, aantal voorgestelde en aantal geschreven pagina's, en "N metingen". Die
cijfers komen uit dezelfde bronnen als het werkmodel (`visibility_scores`, `content_pieces`,
`reports`). Het kaartje kan dus nooit iets anders beweren dan de analyse zelf verderop laat zien.

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

⚠️ **Open punt sinds de overstap:** een `.btn-primary` is 40px hoog en haalt de 44px hieronder dus
niet. Op mobiel moet een primaire actie extra verticale padding of een eigen `.btn-lg` krijgen. Dat
is nog niet gebouwd.

Vaste mobiele regels: tikdoelen ≥ 44×44px · formuliervelden ≥ 16px (anders zoomt iOS Safari in) ·
geen interactie mag van hover afhangen.

### Niets is breder dan het scherm

Op een iPhone was de pagina breder dan het toestel: je kon zijwaarts scrollen en de rechterkant
viel weg. De oorzaak was niet één kapotte kaart maar één soort inhoud: **strings zonder spatie die
niet mogen afbreken**. ORBIT ENGINE rendert die op zo'n vijftien plekken (URL's, slugs, domeinen,
entiteitsnamen). Een occasion-URL van 100 tekens is bij 14px ongeveer 840px breed en staat in een
kaart die op een telefoon 302px krijgt.

Vier regels, in `app/globals.css`:

1. `html { overflow-x: hidden }`, het slot op de deur. Op `html` en niet op `body`, dan blijft
   `html` de scroll-container en blijven de `position: sticky`-balken plakken. `clip` kan hier
   niet: op het wortelelement trekt die de verticale as mee.
2. `body { overflow-wrap: break-word }`, het vangnet. Breekt een woord alleen als het anders niet
   past.
3. `.break-url` op alles wat écht een URL, slug of domein is. `overflow-wrap: anywhere`, want
   alleen `anywhere` verkleint óók de **min-content-breedte**. Zonder dat weigert een flex- of
   grid-kind te krimpen en duwt het zijn container alsnog open, hoe netjes de tekst ook afbreekt.
4. `min-width: 0` op `.card` en op de contentkolom in `AppShell`. De standaard `min-width: auto`
   van een flex-kind is de tweede helft van dezelfde fout.

**Controle na een wijziging.** Zet een pagina op 390px breed en meet in de console:

```js
document.documentElement.scrollWidth === document.documentElement.clientWidth
```

Moet `true` zijn. Wil je weten wélk element het doet, loop dan alle elementen langs en vergelijk
`el.scrollWidth` met `el.clientWidth`; alleen elementen met een eigen `overflow-x: auto` (de
grafiek, de brede tabellen, de sectie-rail) mogen daar afwijken.

**Het conceptscherm is de toetssteen**. Het informatiedichtste scherm én het enige dat iedere
analyse verplicht doorloopt. Desktop: ruim, secties open. Mobiel: elke veldgroep en promptcategorie
inklapbaar en standaard dicht, met "Bevestig en start meting" sticky onderaan.

**Werkwijze:** ontwerp eerst de volle desktopindeling, bepaal daarna expliciet hoe diezelfde
informatie op mobiel anders wordt ingedeeld. "Werkt met kleinere Tailwind-classes" is onvoldoende;
de layoutstructuur zelf mag verschillen.
