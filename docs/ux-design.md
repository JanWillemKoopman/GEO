# UX & Design

Leidend voor elk scherm. Tokens en primitieven staan in `app/globals.css`; dit document legt uit
wat ze zijn en wanneer je welke gebruikt. **Peildatum: 24 augustus 2026.** De vormgeving zelf ging
op 6 augustus over op het systeem van de NOVA-workspace (volledige verantwoording in
`designsystem.md`); deze datum volgt de gedragspatronen die daarna zijn bijgekomen (statustaal,
foutafhandeling, de content-editie, op 21 augustus de iconen in de zijbalk, en op 24 augustus de
indeling van het merkoverzicht, de regels voor een lange lijst en de uitvraag op "Vraagt jouw
input", alle drie hieronder in §5).

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
| `ToastProvider` / `useToast` (`components/toast.tsx`) | Broodroostermeldingen, vier soorten: succes, fout, info en (sinds 17 augustus 2026) waarschuwing, voor een bulkactie die gedeeltelijk lukte. **Voor gebeurtenissen, niet voor uitslagen**: een uitslag hoort in de pagina, een gebeurtenis (het onderzoek is klaar, je wijziging is opgeslagen) hoort in een melding. Altijd `title` én `description`, net als bij Nova. Vorm en timing zijn letterlijk die van Nova: 0,15s in vanaf `translateX(1rem)`, 0,12s uit, en een streepje onderaan dat leegloopt over de levensduur. Standaard 6s; een fout blijft staan tot je hem wegklikt. Op mobiel komt hij van onderen, daar is de duim. |

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
- **Mislukte clusters en merken bovenaan, niet verstopt.** De clusterlijst en de merkenlijst sorteren
  op `whoseTurn === "jij"` (dus zowel "wacht op je goedkeuring" als "niet gelukt") en tonen bij een
  mislukking een rode kaart bovenaan de lijst. Zonder dat moest een klant met meerdere clusters ze
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
**merk-werkruimte**: je kiest bovenin een merk en daarna gaat alles over dát merk. Dat onderscheid
past horizontaal niet zonder scheidingstekens die niets betekenen, en verticaal is het één
tussenkopje. Vandaar een **zijbalk** (`components/sidebar.tsx`).

**Vijf hoofdstukken, elk met hooguit drie kinderen** (besluit 1 tot en met 8 van 17 augustus 2026).
⚠️ **Admin mag er sinds 19 augustus 2026 vier**, bij het toevoegen van de onboardingsessie: drie
ervan gaan over dít merk (Onboarding, Diagnose, Toewijzen) en de vierde, "Alle merken", is de uitgang
naar de app als geheel. Dat is geen vergaarbak van vier gelijksoortige regels maar drie plus een
uitgang.
⚠️ **En Analytics mag er sinds 22 augustus 2026 óók vier**, bij het toevoegen van "Mijn reputatie".
De reden is van dezelfde soort en het is opnieuw geen vergaarbak: **de andere drie bestemmingen
tonen data die de app sowieso al verzamelt, deze is een los product dat de klant apart koopt.**
Zichtbaarheid, Zoekverkeer en Concurrenten komen alle drie uit werk dat toch al draait, de
maandelijkse meting, de Search Console-koppeling en de aggregatie. Een reputatieanalyse draait niet
mee in die cyclus: hij wordt per keer gestart, per keer betaald en per keer gedateerd. Drie plus een
product, zoals Admin drie plus een uitgang is.
Voor beide hoofdstukken geldt vanaf nu: een **vijfde** bestaat niet zonder eerst iets samen te
voegen, en dat is geen stijlregel meer maar een grens. De overige klanthoofdstukken blijven op drie.
`scripts/test-unit.ts` bewaakt alle drie de grenzen, inclusief dat er niet stilletjes een derde
hoofdstuk bij komt dat er vier mag.
Daarvoor waren het 7 regels die uitklapten naar 15 bestemmingen, waarvan er negen onder één kop
hingen die het commentaar in `lib/nav.ts` zelf al "de vergaarbak die dit oplost alleen verticaal"
noemde. Elk hoofdstuk beantwoordt nu één vraag:

| Hoofdstuk | De vraag | Bestemmingen |
|---|---|---|
| Overzicht | Hoe sta ik ervoor en wat moet ik nu doen? | `/merk/[id]` |
| Strategie | Wat gaan we doen, en wat is er al gemaakt? | Contentplan, Clusters, Bibliotheek |
| Analytics | Wat zeggen de cijfers, en waarom? | Zichtbaarheid in AI, Zoekverkeer, Concurrenten, Mijn reputatie |
| Merkprofiel | Wie ben ik volgens ORBIT ENGINE, en klopt dat? | Merkdossier, Bewerken, Vraagt jouw input |
| Instellingen | Hoe is het ingericht? | Account en team, Koppelingen |
| Admin | (alleen beheerders, onder een scheidingslijn) | Onboarding, Diagnose, Toewijzen, Alle merken |

⚠️ **Strategie staat vóór Analytics, en dat is geen smaak.** Wie inlogt wil weten wat hij moet doen,
niet browsen in data. Overzicht draagt het hoofdcijfer al, Analytics is verdieping en Strategie is
handelen. De wachtrij op Overzicht wijst naar Strategie, dus die hoort ernaast te staan. Nova ordent
zijn vier bestemmingen om dezelfde reden zo.

**De zijbalk groeit mee.** Een hoofdstuk verschijnt pas zodra zijn bestemmingen bestaan
(`hoofdstukken()` in `lib/nav.ts` laat een lege kop weg). Een kop die naar een leeg scherm wijst is
erger dan een kop die er nog niet is: de eerste kost vertrouwen in de hele balk.

**Er valt niets uit te klappen.** Het uitklappen was er voor die ene kop met negen kinderen. Met
hooguit drie per hoofdstuk passen alle bestemmingen tegelijk in beeld, en dan is een klapknop een
klik die niets oplevert. Ingeklapt (64px) blijft alleen het icoon van het hoofdstuk over, en dat
linkt naar zijn eerste bestemming.

**Alleen de kop draagt een icoon** (21 augustus 2026). De zes hoofdstukken hebben er een, op 18
pixels; de bestemmingen eronder niet. Zo blijft het icoon zeggen "dit is een van de zes vaste
plekken in de app" in plaats van alleen "hier staat een regel". De koppen droegen hiervoor de tekens
◉ ▣ ▲ ◆ ⚙ ◈, die op elk apparaat een andere vorm hadden; welke tekening bij welk hoofdstuk hoort
staat nu in `lib/icons.ts`, de vormregels in `designsystem.md` §6b.

⚠️ **De bestemmingen hebben een halve dag wél een icoon gehad, en dat is teruggedraaid.** Het zag er
verzorgd uit en het werkte averechts: zestien tekeningen in een balk van zestien regels markeren
niets meer, want als alles opvalt valt niets op. `NavItem` heeft daarom geen icoonveld, zodat het
niet ongemerkt terugkomt.

### De vormgeving van de zijbalk (24 augustus 2026)

De indeling klopte, de opmaak droeg hem niet. Vijf koppen en zestien bestemmingen stonden in
vrijwel dezelfde vorm: allebei `text-sm`, allebei grijs, allebei gewicht 400 tot 500, en het enige
verschil was een verticale lijn van 1 pixel links van de kinderen. Wie snel keek zag zestien regels
op een rij en geen indeling in zessen. Vijf wijzigingen zetten die hiërarchie neer, en elke
wijziging doet één ding:

| Wat | Was | Is | Waarom |
|---|---|---|---|
| De kop | 14px, gewicht 500, grijs | **15px, gewicht 600, `--text-primary`** | Zes ankers die je in één oogopslag terugvindt |
| Het icoon van de kop | De kleur van de tekst ernaast | **`--accent-purple`** | Eén merkkleur bindt de zes vaste plekken; de uitzondering op de `currentColor`-regel staat in `designsystem.md` §6b.2 |
| Het kindschap | Een verticale lijn links van de kinderen | **28px inspringen, geen lijn** | De tekst van een bestemming staat exact onder de tekst van zijn kop; de lijn liep dwars door de actieve regel |
| De actieve regel | `--bg-elevated` (#e7edf2) met donkere tekst | **`--accent-purple-surface` (#f3e6ff) met paarse tekst** | Grijs op wit haalde 1,1:1 met zijn eigen achtergrond: je zag hem pas als je ernaar zocht |
| De ruimte | 4px tussen hoofdstukken, 30px per regel | **20px tussen hoofdstukken, 36px per regel** | Zes groepjes met lucht ertussen lezen als een indeling, zestien regels op elkaar als een lijst |

⚠️ **De kop kleurt niet meer mee met de pagina waar je staat.** Hij was donker zodra een bestemming
eronder actief was. Dat markeerde één van de zes koppen én de regel eronder, twee markeringen voor
één plek, en de kop bewoog dus mee terwijl hij juist het vaste punt hoort te zijn.

⚠️ **"Alleen jij" is een pil geworden** in dezelfde paarse tint als de actieve regel. Los grijs
hoofdlettertekst achter de bestemming las als een tweede label van die bestemming, terwijl het een
stempel erop is: dit ziet de klant niet.

**Ingeklapt (64px) blijft het icoon paars**, ook als het hoofdstuk niet actief is. Het is daar het
enige wat er van de zes ankers over is; de actieve staat zit in het vlak eronder.

### Het overzicht: de eerste schermhoogte draagt het antwoord (24 augustus 2026)

`/merk/[id]` telde tien blokken, allemaal open, allemaal even zwaar, in één kolom van 1024px.
"Waar begin je" stond als tiende. Dat botst met twee regels tegelijk: §5 zegt dat dit scherm
"hoe sta ik ervoor en wat moet ik nu doen" beantwoordt, en §1 vraagt rust boven volledigheid.

**De volgorde is nu: stand, wat op je wacht, waar je begint. Daarna pas de verdieping.**

| Blok | Wat het beantwoordt |
|---|---|
| Kop | Welk merk, hoeveelste maand |
| De stand | Eén cijfer, de marge eronder, en de drie zinnen van `insights()` als duiding erbij |
| Wat er op jou wacht | Hooguit vijf regels, alleen de staat `nu`, doorklik naar de rest |
| Waar begin je | De zes bovenste kansen, gesorteerd op wat ze opleveren |
| Wat dit tot nu toe opleverde | De drie mijlpalen (besluit 7) |
| Je contentplan · Wat ORBIT ENGINE deze week deed | Op `lg` naast elkaar, want allebei smal van inhoud |

⚠️ **Eén hoofdgetal, en dat was het niet.** De zichtbaarheid stond vier keer op dit scherm: in de
subkop, in de stand-kaart, in de mijlpalen en in de maandinzichten, in drie verschillende schalen
(`0%`, `0`, `0 van de 100`). De subkop noemt het cijfer niet meer, de maandinzichten hebben geen
eigen blok meer maar staan ín de stand-kaart, en `lib/insights.ts` laat het getal weg bij een eerste
meting: daar staat het immers vlak boven. Bij twee metingen blijven de cijfers wél staan, want dan
gaat de zin over het verschil en dat is nieuwe informatie.

⚠️ **De chip achter een werkregel volgt de soort werk** (`workChipTone()` in `lib/work.ts`). Alle
vijf de soorten stonden op `chip-warning`, waardoor "Bekijk wat er mis is" er precies zo uitzag als
"Nakijken". §2: `attention` vraagt een keuze en is niet fout, `danger` is een blokkade of iets dat
niet gelukt is. Een storing die eruitziet als een routineklus blijft liggen.

⚠️ **Het activiteitenblok staat ingeklapt** (`CollapsibleSection`, `defaultOpen={false}`). Het was
het langste blok van de pagina en het enige waar geen handeling uit volgt.

⚠️ **De mijlpalen zakten, ze verdwenen niet.** Besluit 7 zette ze bewust op het overzicht en dat
blijft zo. Ze stonden alleen pal onder het hoofdcijfer, en in maand 1 zijn alle drie de getallen
nul: drie nullen onder een zichtbaarheid van 0% is geen argument om te blijven, het is het
tegendeel.

⚠️ **Elk blok staat in zijn eigen `SectionErrorBoundary`.** Acht databronnen op de startpagina van
de klant, en zonder die opvang haalt één onverwachte datavorm het hele scherm weg, inclusief de
knoppen waarmee hij net iets wilde doen (§4).

**Het getal bij een kans is een telling en geen percentage.** Er stond "240% van de gemeten vragen",
want de chip rekende met de som van de bevroren promptgewichten, en dat gewicht is volumeband ×
koopwaarde per vraag (0,02 tot 1,0), geen aandeel. Nu: "raakt 4 van de 30 gemeten vragen", twee
tellingen. §1, geen schijnprecisie. De som blijft bestaan als sorteersleutel en komt nooit meer in
beeld.

**En de toelichting bij een kans is ontdaan van onze notatie** (`lib/recommendation-text.ts`). Het
rapportmodel schreef "V1 en V2 hebben gewicht 0,60" in de zin die de klant leest; bij Van den
Udenhout begon vijf van de zes aanbevelingen zo. De promptregel in `lib/pipeline/report.ts` verbiedt
het, en dit is het vangnet in code ernaast (conventie 1). Blijft er niets over, dan staat er niets:
een half afgebroken zin is erger dan geen zin.

### De fase van een merk (19 augustus 2026)

Het beheerscherm sorteerde op achterstand: hoeveel pagina's staan er te lang op goedkeuring te
wachten. Dat is de vraag van ná de verkoop. De vraag ervóór, "welk merk kan ik nu demonstreren en
welk merk wacht op een gesprek", was nergens te zien, terwijl het product sales-led is.

Elk merk heeft daarom een **fase**, afgeleid uit gegevens die er al liggen (`lib/profile-stage.ts`,
nul migraties): Voorbereiden, Klaar voor het gesprek, Gesprek gehad, Overgedragen. Een status die je
met de hand bijhoudt loopt achter op de werkelijkheid; deze kan dat niet.

⚠️ **Een tweede as, geen vervanging.** De segmenten op `/beheer` beantwoorden "waar loop ik achter",
de fase beantwoordt "wat kan ik vandaag verkopen". Ze wijzen niet naar hetzelfde merk, dus ze staan
naast elkaar: de fase is een chip per merk plus een filter, en de bestaande sortering blijft leidend.

Op het merkoverzicht staat voor staf één regel bovenaan met de fase en de eerstvolgende handeling,
met een link naar de onboardingsessie. Voor de klant verandert er niets: hij ziet zijn eigen merk,
niet zijn plek in onze verkoopcyclus.

### Voorbeelden per branche (19 augustus 2026)

Van de 56 velden hebben er 35 een voorbeeld, en die waren allemaal geschreven vanuit één fictieve
autodealer. Voor een fysiotherapiepraktijk of een advocatenkantoor leest dat als een formulier dat
voor iemand anders is gemaakt.

`lib/pipeline/brand-examples.ts` kent daarom **dertien branches plus een algemene terugval**, elk met
eigen voorbeelden voor de 19 velden waar het antwoord wezenlijk per branche verschilt. De branche
wordt afgeleid uit de branchetekst van het onderzoek en uit de bedrijfsnaam; past een merk nergens
in, dan kijkt hij naar het bedrijfsmodel, en anders komen de algemene voorbeelden terug die er altijd
al stonden.

De indeling komt van de brancheoverzichten van InSpace, met drie aanpassingen: samengevoegd wat
hetzelfde formulier vraagt (Mode en Sieraden vullen dezelfde velden in als elke webshop),
leadgeneratie eruit want dat is een kanaal en geen branche, en zeven branches erbij die het
Nederlandse MKB draagt en die bij hen ontbreken, waaronder bouw en installatie.

⚠️ **Geen voorbeelden per klant laten schrijven door de AI.** Dat kost bijna niets en botst op de
belangrijkste belofte van dit product: niets in beeld dat nergens op gebaseerd is. Een verzonnen
voorbeeld dat te echt oogt laat de klant corrigeren wat wij bedacht hebben.

**Wanneer een veld een voorbeeld krijgt.** Alleen als de vraag zonder dat voorbeeld twee kanten op
kan: hoe lang mag het antwoord zijn, hoe specifiek, in welke vorm. Bepaalt het label het antwoord al
volledig (je eigen bedrijfsnaam, een e-mailadres, een plaatsnaam, de naam van een concurrent), dan
staat er niets, want een grijze regel die niets toevoegt kost wel leesbaarheid. Tien velden hebben
op die grond geen voorbeeld, en er staat geen verzonnen bedrijfsnaam meer in de voorbeelden.

⚠️ Bij een lijstveld verschijnt het voorbeeld in het vakje waar je één regel toevoegt, niet boven de
lijst. Daar hoort dus precies één ding te staan: een opsomming leest daar als "typ ze allemaal
achter elkaar". Een unittest bewaakt het.

### De onboardingsessie: het enige stafscherm dat gedeeld wordt

`/merk/[id]/admin/onboarding`, nieuw op 19 augustus 2026. Elk ander scherm onder `admin/` is intern.
Dit scherm zit de klant náást je en kijkt mee, en daar volgen drie bindende regels uit:

1. Geen taaknamen, geen jobtypes, geen foutmeldingen uit de wachtrij.
2. Geen bedragen. De kostenraming van een herdraai hoort in het bevestigvenster, niet in beeld.
3. Geen interne begrippen. De tekst volgt `schrijfstijl.md` alsof de klant de lezer is, want dat is hij.

`scripts/test-unit.ts` leest de drie bronbestanden van dit scherm en faalt als er alsnog een
bedrag, een taaknaam of een foutcode in komt te staan. Een doorloop met de hand gebeurt één keer;
het risico ontstaat bij de vólgende wijziging.

**De volgorde van het scherm is de belangrijkste ontwerpkeuze.** Het opent met wat ORBIT ENGINE
níét weet (`lib/profile-gaps.ts`, gesorteerd op gevolg en niet op veldvolgorde), daarna de
commerciële laag die het gesprek moet vullen, en pas daarna wat er al gevonden is, ingeklapt per
blok. Zonder die volgorde kost het gesprek een uur aan het bevestigen van dingen die al klopten.

**Opslaan gaat per veld**, zodra het de focus verlaat, met drie standen (opslaan, opgeslagen, niet
gelukt). Anders dan in de klantwizard, waar één knop juist beter past: een gesprek springt en wordt
onderbroken, en een half ingevuld formulier dat bij het weglopen verdwijnt is de duurste fout die
dit scherm kan maken. Mislukt een opslag, dan blijft de getypte waarde staan met een knop om het
opnieuw te proberen; stil terugdraaien laat de consultant het opnieuw typen zonder te weten dat het
de eerste keer ook al niet lukte.

**Elk veld kan op "niet van toepassing"** (migratie `0060`). Een merk zonder auteur heeft geen
auteursbio, en dat is geen gat. Zo'n veld telt als behandeld en verdwijnt uit de gatenlijst.

**De meter toont drie getallen en geen percentage** (`lib/profile-meter.ts`): samen bevestigd, door
ORBIT ENGINE gevonden, nog open. Eén percentage verbergt precies het verschil dat in een gesprek
telt. De contactvelden tellen niet mee, want ze zeggen niets over hoe goed ORBIT ENGINE het merk
kent.

**De actieve regel is exact, niet met prefix** (`isExact`, naast `isActive`). De bestemmingen binnen
een hoofdstuk zijn elkaars prefix: `/merk/x/merkprofiel` is het begin van
`/merk/x/merkprofiel/bewerken`, en met een prefixmatch zou "Merkdossier" oplichten terwijl je in
"Bewerken" zit.

**De kiezer verschijnt niet altijd.** Bij precies één merk staat de naam er als tekst en niet als
knop: een kiezer met één optie belooft een keuze die er niet is. Het zoekveld erin verschijnt pas
vanaf acht merken. Nova doet allebei ook zo. "Alle merken" is sinds besluit 2 geen menu-item meer en
zit uitsluitend in deze kiezer: een klant met één merk betaalde er anders bij elke sessie een klik
voor.

**De keuze staat in een cookie** (`orbit_engine_merk`) en niet in de URL: hij moet blijven staan op schermen
die zelf geen merk kennen (`/instellingen`), en een querystring zou aan élke link geplakt moeten
worden. ⚠️ Die cookie is een **voorkeur, nooit een recht**: `listBrands()` controleert altijd opnieuw
of je bij dat merk mag, en de toegangscontrole zelf zit in `getOwnedProfile()`.

**De routes zijn wél verhuisd, en de oude blijven werken.** Elk merkscherm staat sinds 17 augustus
2026 onder `/merk/[id]/` in plaats van onder `/profielen/[id]/` (besluit 8). Zonder die verhuizing
zou "profielen" in de adresbalk staan op een scherm dat over zoekverkeer gaat. De dertien oude
adressen geven een **308, permanent**, naar hun eindadres; de lijst staat in `lib/redirects.ts` en
wordt door `scripts/test-unit.ts` nagelopen, want de eigenaar deelt die links in demogesprekken en
een dood adres kost hier een gesprek en niet alleen een klik.

⚠️ **Het clusterdossier verhuist níet** en blijft op `/analyses/[id]`. Dat is de ene bewuste
uitzondering: een cluster heeft tien diepe routes eronder (bibliotheek, concept, briefing,
antwoorden, rapport, instellingen, contentdetail), en die allemaal verplaatsen raakt de meest
gelinkte routes van de app voor alleen cosmetiek.

**Eén toegangscontrole voor het hele segment.** `app/(app)/merk/[id]/layout.tsx` stelt de
rechtenvraag één keer met `getOwnedProfile()`, in plaats van elf keer per scherm. Een gebruiker die
niet bij het merk hoort krijgt een **404 en geen 403**: een 403 bevestigt dat het merk bestaat.

**Vaste breedtes in de zijbalk** (240px, ingeklapt 64px). Een zijbalk die meegroeit met de langste
merknaam laat de hele pagina verspringen zodra je wisselt.

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

**Twee bibliotheken, en dat is met opzet.** Sinds 17 augustus 2026 staat er naast de bibliotheek per
cluster een **merkbrede** bibliotheek (`/merk/[id]/strategie/bibliotheek`, besluit 5). Een klant met
vier clusters had anders vier bibliotheken en nergens een overzicht van wat hij gekocht heeft,
terwijl dat het eindproduct is waar hij voor betaalt. De cluster-bibliotheek blijft de doorklik
vanuit het dossier; de merkbrede is de verzamelplek. De twee horen hetzelfde aantal te tonen.

De merkbrede lijst heeft zoeken (op titel én adres, want een klant heeft vaker de URL bij de hand
dan de exacte titel), filters op type, status en cluster, en paginering vanaf 25 rijen. De
rekenkant staat in `lib/library.ts` en niet in het scherm: een fout in het filteren laat een pagina
verdwijnen waarvoor de klant betaald heeft, zonder dat er iets misgaat op het scherm.

⚠️ **De terugknop volgt waar je vandaan kwam** (`lib/origin.ts`, `?van=bibliotheek|cluster|plan`,
naar Nova's `origin`-parameter). Een contentpagina is vanaf drie plekken te bereiken, en zonder
herkomst komt de klant uit op een scherm waar hij niet vandaan kwam. Geen `Referer`: die valt weg
bij een bladwijzer en bij strengere browserinstellingen, en juist dán is de terugknop het enige wat
hij heeft. Valt de parameter weg, dan is het clusterdossier de veilige terugval.

### Wat de klant ziet en wat alleen jij ziet

Vastgelegd op 10 augustus 2026, aangescherpt tot besluit 4 op 17 augustus, en **gegrond in wat Nova
daadwerkelijk toont**, niet in een aanname.

Een Nova-klant ziet precies vier bestemmingen (`nav`: Overview, Strategy, Analytics, Account). Alles
wat de CSM ÓVER een klant vastlegt zit in de aparte `admin`-namespace, inclusief
`admin.onboardingProfile` ("View onboarding profile for {domain}"). Er is in hun hele
berichtenbestand geen enkele sleutel waarmee een klant de notities van zijn CSM zou kunnen lezen.

**Het principe in één zin:** de klant ziet wat ORBIT ENGINE weet, hoe zeker dat is en wat ermee moet
gebeuren, niet hoe ORBIT ENGINE aan die kennis kwam.

| Wat | Klant | Beheerder | Waarom |
|---|---|---|---|
| Merk, aanbod, doelgroep, positionering, tone of voice, concurrenten | ✅ | ✅ | Dit is wat de klant komt halen |
| Datakwaliteit als zekerheidsniveau (`ConfidenceChip`) | ✅ | ✅ | Hij mag weten hoe hard iets is |
| Vragen die áán hem gericht zijn | ✅ | ✅ | Ze vragen iets van hem |
| De technische blokkades op zijn eigen site | ✅ | ✅ | Zijn site, zijn probleem |
| Het letterlijke antwoord dat een AI gaf | ✅ | ✅ | Het sterkste bewijsstuk dat het product heeft (§1, "bewijs verslaat cijfer") |
| Ruwe modeloutput per stap (`raw_json`) | ❌ | ✅ | Hoe we eraan kwamen, niet wat we weten |
| Kosten en modelnamen (`ai_calls`) | ❌ | ✅ | Exploitatie-informatie |
| Herkomst mét bewijscitaat (`profile_field_sources`) | ❌ | ✅ | Onderzoeksdetail. De chip "uit je website gehaald" mág wél |
| Onderwerp-onderzoek en bronnenlandschap-ruwdata (`topic_research`) | ❌ | ✅ | Idem |
| Compleetheidspercentage (`ProfileReadinessPanel`) | ❌ | ✅ | Een percentage over werk dat de klant niet doet, en voor de consultant een verkoopinstrument |
| Gespreksnotities en contextfactoren | ❌ | ✅ | Aantekeningen óver hem, niet vóór hem |
| De takenwachtrij en mislukte taken (`jobs`) | ❌ | ✅ | Onze machinerie |
| Toewijzen aan een account | ❌ | ✅ | Handeling van ná het gesprek |

De grens loopt langs `isStaff()`, **niet** langs de accountrol: het gaat om ORBIT ENGINE's eigen team
tegenover iedereen daarbuiten. Een accountbeheerder bij een bureau is nog steeds een klant.

⚠️ **Wegvouwen is niet afschermen.** Alles in de rechterkolom stond eerder op klantschermen,
ingeklapt of onderaan. De klant kon het dan nog steeds tegenkomen, en dan sta je in een demo één
misklik van een ongemakkelijk gesprek af. Sinds 17 augustus 2026 staat het op `/merk/[id]/admin`,
één scherm met Nova's negen secties als inhoudsopgave en de ruwe laag eronder.

⚠️ **Een afgeschermd blok haalt ook zijn springlink weg.** Een link naar een blok dat er niet is, is
een dode link, en dat is zichtbaarder dan het blok zelf.

⚠️ **Een 404 en geen 403**, overal. Een 403 bevestigt dat het scherm bestaat.

**Drie lagen bewaken dit, en dat is geen dubbelop:**

1. **De database.** `jobs` en `ai_calls` geven een klantsessie nul rijen terug, ongeacht wat een
   scherm vraagt. `scripts/test-chain.ts` toetst dat tegen echte RLS.
2. **De routes.** Elke afgeschermde route roept `isStaff()` aan en antwoordt met 404.
3. **De broncode.** `scripts/test-unit.ts` leest alle klantschermen en faalt op een modelnaam, een
   bedrag, een bewijscitaat of een `select("*")` op een tabel met ruwe modeloutput. Zo'n `*` toont
   niets, maar stuurt de ruwe uitvoer wél mee in de paginabron.

Laag 3 bestaat omdat de handmatige doorloop die het uitvoerplan voorschreef één keer gebeurt en
daarna nooit meer, terwijl het risico juist bij de vólgende wijziging ontstaat.

### Het hoofdstuk Merkprofiel: drie schermen waar er vijf waren

Sinds 17 augustus 2026 heeft dit hoofdstuk drie bestemmingen, en elk beantwoordt
één vraag. Daarvoor waren het er vijf (dossier, merkprofiel, profielgegevens,
aanvullen, toevoegingen), met twee formulieren die naar dezelfde kolommen
schreven.

| Scherm | De vraag | Wat erop staat |
|---|---|---|
| Merkdossier `/merk/[id]/merkprofiel` | Wat weet ORBIT ENGINE van mij? | Kop, het dossier, wat AI over je weet, aanbod, concurrenten |
| Bewerken `/merk/[id]/merkprofiel/bewerken` | Klopt dat? | 41 velden in zeven stappen, plus gereedschap |
| Vraagt jouw input `/merk/[id]/merkprofiel/input` | Moet ik nog iets aanvullen? | Feitenvragen en open punten, teller in de kop |

**Het merkdossier is een leesscherm.** Geen sectie-rail: de blokken hebben geen
vaste chronologie zoals de vier hoofdstukken van een cluster, en een rail belooft
een volgorde die er niet is. Wel een kop met de merknaam, de website en één
duidingszin (`profile-hero.tsx`).

Elk blok is een `ProfileSection` met een **titel én een omschrijving** (Nova geeft
élk blok allebei). Twee soorten: `verhaal` staat op desktop open en is wat de
consultant laat zien; `naslag` staat overal dicht, want dat is gereedschap.

⚠️ **`ProfileReadinessPanel` staat niet meer op het dossier** maar bij Admin. Het
is een percentage over werk dat de klant niet doet, en voor de consultant een
verkoopinstrument ("kan ik dit scherm delen"). Dat is besluit 4: de klant ziet
wat ORBIT ENGINE weet en hoe zeker dat is, niet hoe ORBIT ENGINE eraan kwam.
Hetzelfde geldt voor de mijlpalen en de maandinzichten, die naar Overzicht gaan.

**Het bewerkscherm opent op de stap uit de link.** `?stap=` (alleen de
klantstappen; een onbekende waarde valt terug op stap 1). Dat is de enige plek
waar de stap in de URL staat, en het is geen breuk met de regel hieronder dat de
stap in de state hoort: hij zet alleen het beginpunt, wisselen blijft state.

**Bewerken is één formulier waar er twee waren.** De wizard had 27 velden, de
platte editor 41, allebei met een eigen opslagroute naar dezelfde kolommen. Het
ene scherm was een deelverzameling van het andere en de klant kon niet zien welk
van de twee won. De wizardvorm wint omdat hij per veld de herkomstchip toont
("uit je website gehaald", Nova's `draftedBadge`): de klant kijkt na in plaats
van in te vullen, en dat is een wezenlijk andere handeling.

⚠️ **41 in, 41 uit.** De zeven stappen dekken exact `EDITABLE_PROFILE_FIELDS`, en
`scripts/test-unit.ts` faalt in béide richtingen. Eén veld dat nergens landt is
een veld dat de klant niet meer kan corrigeren, en dat merkt niemand tot de
volgende contentronde, want er verschijnt geen foutmelding. De verdeling is
8-3-6-6-5-7-6 over Je bedrijf, Je merk, Je klant, Hoe je klinkt, Je woorden, Wie
het schrijft en Waar je om bekend wilt staan. Die laatste stap heeft Nova niet,
en het is juist de stap die bepaalt wat een AI-assistent over je kán zeggen.

Wat géén merkveld is, staat buiten de wizard: hoe grondig ORBIT ENGINE de site
uitleest (`InventoryBox`) en de brontekst die de klant zelf aanlevert
(`DossierBox`). Die grens houdt de teller eerlijk.

**Vraagt jouw input** is één blok waar er twee waren: de feitenvragen mét
invoerveld en de open punten uit het onderzoek. Voor de gebruiker is dat één
ding, "moet ik iets aanvullen", dus staat het op één plek met de teller in de
kop. ⚠️ Feitenvragen die uit één cluster komen (`fact_requests.analysis_id`
gezet) horen daar níet bij maar bij hoofdstuk 03 van dat cluster; die scheiding
is op 14 augustus 2026 bewust aangebracht.

⚠️ **Elke regel op dit scherm is te beantwoorden, en dat was hij niet** (24
augustus 2026). De open punten uit de synthese stonden er als platte tekst: bij
Van den Udenhout tien vragen onder de kop "10 open", zonder één invoerveld
eronder. Ze kwamen uit `profile_facets.raw_json.gaps`, waar de pijplijn ze
schrijft als agenda voor het gesprek met de consultant, niet als vraag aan de
klant. De teller vroeg dus iets waarop het scherm geen antwoord aannam, en dat is
het dode einde uit §4 met een teller ervoor. Ze zijn nu gewone feitenvragen
(`lib/pipeline/gap-questions.ts`), dus er staan nog twee soorten regels:

| Wat | Wat je ermee kunt |
|---|---|
| Feitenvragen (`fact_requests`) | Beantwoorden of overslaan, ter plekke |
| Open punten in het profiel (`findGaps`) | Knop "Invullen" naar dat veld op het bewerkscherm |

Drie regels die daaruit volgen en die je bij een volgende wijziging moet
aanhouden:

1. **De teller telt alleen wat je hier kunt doen.** Anders belooft de kop werk
   dat het scherm niet aanneemt.
2. **De knop bij een open punt draagt de stap én het anker**
   (`?stap=bedrijf#veld-anker-aliases`, `gapLink()` in `lib/profile-gaps.ts`).
   De wizard toont één stap tegelijk, dus een anker alleen landt op een veld dat
   niet in beeld staat. Wijst een gat naar een veld dat de klantwizard niet
   toont, dan verschijnt er geen knop; een unittest bewaakt dat elk gat een
   bestemming heeft.
3. **Een mislukte query is geen goed nieuws.** De groene "niets open"-kaart
   verschijnt alleen als de vragen ook echt opgehaald zijn. Anders stond er
   "niets open" op het moment dat de app niets kon lezen.

**Een paneel dat niets te tonen heeft, verdwijnt niet.** Het toont waaróm het
leeg is en wat de volgende stap is. Stil verdwijnen is erger dan het dode einde
uit §4: de klant weet dan niet dat de functie bestaat, en de consultant kan het
gat niet uitleggen omdat er geen gat te zien is.

### Een lijst die niet meer op één scherm past (24 augustus 2026)

Het contentplan was het eerste scherm met 120 items: tien pagina's per maand, twaalf maanden
vooruit. Een groepering per maand was niet genoeg, want twaalf koppen die "Maand 1" tot "Maand 12"
heten met tien gelijkvormige kaarten eronder is nog steeds twaalf schermlengtes zonder houvast. Vier
regels, en ze gelden voor elke lijst die deze omvang haalt.

**Een groep die geen datum draagt, draagt geen betekenis.** "Maand 4" zegt niets zolang er niet
"december 2026" naast staat. Het plan slaat alleen `month_number` op (besluit 7: geteld vanaf de
start, nooit "van 12"), dus de kalendermaand wordt afgeleid uit de vroegste publicatiedatum in die
maand. ⚠️ Met UTC-getters: een kale datum komt binnen als middernacht UTC, en met lokale getters
wordt 1 december in een negatieve tijdzone 30 november, waarna de kop een maand verschuift.

**Groepen staan dicht, behalve waar iets te doen is.** Open beginnen de lopende maand en elke maand
die om een handeling vraagt; de rest is een dichtgeklapte regel met naam, aantal en status. Dat
regeltje is het overzicht dat de openstaande lijst juist niet gaf. ⚠️ Met terugval: klapt de regel
alles dicht, dan kijkt de gebruiker naar een stapel gesloten regels zonder inhoud, en dat is even
onbruikbaar als de muur die het moest oplossen. Staat er niets open, dan gaat de eerste groep alsnog
open (`openMonthIds()` in `lib/plan-overview.ts`).

**Een teller in een groepskop telt de groep, nooit het filter.** Er stond "Maand 1 · 2 pagina's" bij
een plan van tien per maand, omdat de kop het filterresultaat telde. Wie dat leest concludeert iets
onwaars over zijn plan. Het groepstotaal staat voorop, het filterresultaat ernaast ("10 pagina's · 2
in deze selectie").

**Elk filter draagt zijn eigen aantal.** Zonder getal is een leeg tabblad pas leeg ná de klik, en
dat is een dood einde dat je zelf hebt aangelegd. De teller en de lijst gebruiken dezelfde functie
(`matchesFilter()`), want een teller die anders telt dan de lijst toont is erger dan geen teller.

### Twee handelingen mogen nooit één woord delen (24 augustus 2026)

In het contentplan gebeurden twee verschillende dingen onder de naam "goedkeuren": een maand
vrijgeven, waarmee je betaald schrijfwerk in gang zet, en een geschreven tekst goedkeuren, waarmee
je zegt dat hij gepubliceerd mag worden. Het gevolg stond letterlijk op het scherm: een groene chip
"Goedgekeurd" op de maand met amberkleurige rijen "Wacht op jouw akkoord" eronder, wat als een
tegenspraak leest. Een maand wordt sindsdien **vrijgegeven**, een tekst wordt **goedgekeurd**, en de
statuslabels in `lib/plan-status.ts` houden die twee woordenschatten uit elkaar.

**En je keurt nooit iets goed dat je niet kunt openen.** Staat er een goedkeurknop bij een tekst, dan
staat de tekst zelf één klik verderop, mét de herkomstparameter uit `lib/origin.ts` zodat de
terugknop terugwijst naar waar je vandaan kwam. Bestaat die link bij uitzondering niet, dan zegt de
regel waar de tekst wél te vinden is; een knop zonder uitweg is erger dan een omweg.

**De rem hoort op wat weggooit, niet op wat vastlegt.** "Verwijderen" liep zonder één vraag door
terwijl "markeer als geplaatst" een volledige bevestiging kreeg. Een handeling die iets uit een plan
haalt krijgt dezelfde `ConfirmDialog` met `danger`, inclusief wat er daarna gebeurt (hier: een
reservepagina schuift in, of het maandtotaal wordt één lager).

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
