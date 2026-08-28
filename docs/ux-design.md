# UX & Design

Leidend voor elk scherm. Tokens en primitieven staan in `app/globals.css`; dit document legt uit
wat ze zijn en wanneer je welke gebruikt. **Peildatum: 27 augustus 2026.** De vormgeving zelf ging
op 6 augustus over op het systeem van de NOVA-workspace (volledige verantwoording in
`designsystem.md`); deze datum volgt de gedragspatronen die daarna zijn bijgekomen (statustaal,
foutafhandeling, de content-editie, op 21 augustus de iconen in de zijbalk, en op 24 augustus de
indeling van het merkoverzicht plus de vormgevingsronde erna, de regels voor een lange lijst en de
uitvraag op "Vraagt jouw input", alle drie hieronder in §5). Later op 24 augustus kwam de
narekening tegen Nova's eigen CSS erbij, met als grootste gevolgen een witte paginagrond en een
donkere modus met een schakelaar (§2 hieronder, `designsystem.md` §2.1 en §10). Op 25 en 26 augustus
kwamen daar twee ontwerprondes op het merkoverzicht bij: dat scherm is de bestemming na inloggen, en
daaruit volgen regels die voor elke landingspagina gelden (§5 hieronder).

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

**Twee standen, licht en donker, sinds 24 augustus 2026.** De startstand volgt het
besturingssysteem; klikt iemand op de schakelaar rechtsboven in de balk, dan wint zijn keuze en
staat die in `localStorage`. Besluit 17 van 11 augustus 2026, dat de donkere modus schrapte, is die
dag teruggedraaid omdat het palet ervoor blijkt te bestaan; `designsystem.md` §10 heeft het waarom
en de twee plekken waar donker niet de spiegel van licht is.

> ⚠️ **Wat dit betekent voor wie een scherm bouwt: een hexwaarde in een component is geen
> nettigheidskwestie meer.** Hij draait niet mee met de stand en levert daar gegarandeerd wit op wit
> of zwart op zwart op. Gebruik altijd een token, en loop na een nieuw scherm de vijf controles uit
> `designsystem.md` §11 langs.

De volledige tokenlijst staat in `designsystem.md` §2 en hoeft hier niet herhaald te worden. Wat je
moet weten om een scherm te bouwen (de donkere tegenhangers staan in dezelfde tabel daar):

```css
/* Neutralen: wit als grond, koel leiblauw als eerste stap eróp */
--bg-base: #ffffff;  --bg-surface: #ffffff;  --bg-muted: #f8fafc;
--bg-elevated: #e7edf2;  --bg-surface-2: #dce3ea;
--text-primary: #17212b;  --text-secondary: #43505d;  --text-muted: #788795;
--border-subtle: #e7edf2;  --border-strong: #c2ccd6;  --border-contrast: #788795;

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
--radius-sm: 6px;    chips en badges (sinds 24 augustus 2026 geen pil meer)
--radius-pill;       alleen voortgangsbalken, stippen en de live-dot

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
3. **De pil is voor wat rond moet zijn**: voortgangsbalken, stippen, de `live-dot`. Chips en badges
   staan op `--radius-sm`, knoppen en velden en navigatie-items op `--radius-md`. De oude regel
   "interactieve elementen zijn pilvormig" was de marketingsite.
4. **Status is kleur plus vorm, nooit kleur alleen.** Een pulserende dot, een pijl (`↑` of `↓`) of
   een chip met tekst. Dat is toegankelijkheid.
5. **Mono is voor cijfers en voor het kleinste label.** `.stat-value` voor waarden die je
   vergelijkt, `.mono-label` als kicker boven een titel. Die kicker was sinds 6 augustus sans; op
   24 augustus 2026 is dat teruggedraaid naar mono, omdat Nova's eigen CSS laat zien dat mono in een
   klein label juist wél hun productstijl is. Zie `designsystem.md` §3.2.
6. **Contrast is een tokenkeuze.** `-text` op een licht vlak, `-on-solid` op een gevuld vlak, en
   `--text-muted` (3,7:1) nooit voor iets wat gelezen moet worden.
7. **Eén easing overal** (`--ease-standard`), en korte duur: 0,12s tot 0,20s. Bij het wisselen van
   licht naar donker staat elke overgang uit, anders veegt het hele scherm over in plaats van om te
   klappen.
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
| `.card-rail` / `.card-rail-success` / `.card-rail-warning` | De 4px-stang links op de kaart met het hoofdgetal van een scherm. **Eén per scherm**, anders markeert hij niets meer. De tint volgt de trend van dat getal: groen bij een echte stijging, oranje bij een echte daling, grijs zolang er geen oordeel is (nooit gemeten, eerste meting, of een verschil binnen de meetruis). Zie `designsystem.md` §5.5. |
| `.btn-primary` / `.btn-outline` | Beide 40px, `--radius-md`, geen pil meer. `.btn-sm` = 32px, `.btn-lg` = 44px. |
| `.btn-lg` | 44px, de aanbevolen minimale tikdoelgrootte (WCAG 2.5.5). Combineren met `.btn-primary`/`.btn-outline`, alleen op de ÉNE hoofdactie van een scherm dat vaak op een telefoon bediend wordt (bevestigen, publiceren, "schrijf alles"). Niet de standaard, anders verdwijnt de dichtheid die 40px juist opleverde. |
| `.no-print` | Verbergt chrome (bovenbalk, hoofdstuk-rail, tabbladen, vaste actiebalken) in het printstijlblad onderaan `globals.css` (B.13). Het dossier IS het rapport, er is geen aparte printpagina. |
| `.chip` + `-success` / `-danger` / `-warning` / `-info` / `-attention` / `-neutral` / `-green` | `--radius-sm` (sinds 24 augustus 2026 geen pil meer), sans, gewicht 600, schrijftaal. Nooit met de hand een tint of een vorm nabouwen. Dat gebeurde toch, in vijf componenten tegelijk; zie regel 1 hierboven en de `grep` die het nu tegenhoudt. |
| `.mono-label` | De kicker bóven een titel: 11px, uppercase, **mono** met 1px letterspatiëring. Sinds 24 augustus 2026 klopt de naam weer; hernoemen raakt nog steeds te veel bestanden voor alleen een naam. |
| `.type-hero` … `.type-label` | De elf tekststijlen van Nova, met maat, gewicht en regelhoogte vast aan elkaar. Gebruik ze in nieuw werk; `designsystem.md` §3.2 heeft de tabel. |
| `.btn-ghost` | **De uitweg naast een handeling**: "Wachtwoord vergeten?", "Terug naar inloggen", "Annuleren". Zelfde maat als `.btn-primary`, geen vlak, bij hover een waas. Gebruik hem in plaats van een kale link zodra hij onder of naast een knop staat, anders zweeft er een regel tekst onder een vlak van 40 pixels. |
| `.stat-value` | Cijfers die je vergelijkt, in mono met `tabular-nums`, gewicht 700. |
| `.field` | Formuliervelden, 40px, wit met een rand, inclusief focusring. |
| `.live-dot` | Pulserende indicator voor "loopt nu". |
| `.skeleton` | Laadvlak, respecteert `prefers-reduced-motion`. |
| `.prose` | Lange tekst (rapport, contentpagina). |
| `.brand-gradient-text` | **Alleen het woordmerk ORBIT ENGINE.** Nergens anders. |
| `PageHeader`, `EmptyState`, `Narrow` | Eén variant per patroon, geen lokale kopieën. |
| `Icon` (`components/icon.tsx`) | Het enige icoon-component, nooit een los teken en nooit een eigen SVG. In een lijstregel: 18px, links van de titel, in de leeskleur (`text-secondary`) en nooit in de merkkleur. In een knop: 18px, vóór het label als de knop naar een plek gaat (het icoon van dat hoofdstuk), erna als hij vooruit gaat (`naar`). Zie `designsystem.md` §6b.3, regels 5 en 6. |
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

**Vier klanthoofdstukken, elk met hooguit drie kinderen** (besluit 1 tot en met 8 van 17 augustus
2026). ⚠️ **Admin mag er sinds 19 augustus 2026 vier**, bij het toevoegen van de onboardingsessie:
drie ervan gaan over dít merk (Onboarding, Diagnose, Toewijzen) en de vierde, "Alle merken", is de
uitgang naar de app als geheel. Dat is geen vergaarbak van vier gelijksoortige regels maar drie plus
een uitgang. ⚠️ **En sinds 25 augustus 2026 vijf**, toen "Koppelingen" van Instellingen naar Admin
verhuisde: een koppeling zet de consultant klaar, niet de klant (het product is sales-led, besloten
3 augustus 2026), dus is dat een vijfde uitgang van dezelfde soort als "Alle merken" en geen
vergaarbak.
⚠️ **En Analytics mag er sinds 22 augustus 2026 óók vier**, bij het toevoegen van "Mijn reputatie".
De reden is van dezelfde soort en het is opnieuw geen vergaarbak: **de andere drie bestemmingen
tonen data die de app sowieso al verzamelt, deze is een los product dat de klant apart koopt.**
Zichtbaarheid, Zoekverkeer en Concurrenten komen alle drie uit werk dat toch al draait, de
maandelijkse meting, de Search Console-koppeling en de aggregatie. Een reputatieanalyse draait niet
mee in die cyclus: hij wordt per keer gestart, per keer betaald en per keer gedateerd. Drie plus een
product, zoals Admin drie plus twee uitgangen is.
Voor beide hoofdstukken geldt vanaf nu: een zesde bestaat niet zonder eerst iets samen te voegen, en
dat is geen stijlregel meer maar een grens. De overige klanthoofdstukken blijven op drie.
`scripts/test-unit.ts` bewaakt alle drie de grenzen, inclusief dat er niet stilletjes een derde
hoofdstuk bij komt dat er meer mag.
Daarvoor waren het 7 regels die uitklapten naar 15 bestemmingen, waarvan er negen onder één kop
hingen die het commentaar in `lib/nav.ts` zelf al "de vergaarbak die dit oplost alleen verticaal"
noemde. Elk hoofdstuk beantwoordt nu één vraag:

| Hoofdstuk | De vraag | Bestemmingen |
|---|---|---|
| Overzicht | Is er iets nieuws, en wat moet ik nu doen? | `/merk/[id]`, tevens de bestemming na inloggen |
| Strategie | Wat gaan we doen, en wat is er al gemaakt? | Clusters, Openstaande vragen, Contentplan, Bibliotheek |
| Analytics | Wat zeggen de cijfers, en waarom? | Zichtbaarheid in AI, Zoekverkeer, Concurrenten, Mijn reputatie |
| Merkprofiel | Wie ben ik volgens ORBIT ENGINE, en klopt dat? | Merkdossier, Bewerken |
| Admin | (alleen beheerders, onder een scheidingslijn) | Onboarding, Diagnose, Toewijzen, Alle merken, Koppelingen |

⚠️ **"Instellingen" stond hier tot 25 augustus 2026, met "Account en team" en "Koppelingen"
eronder.** Geen van beide is nog een klantbestemming in de zijbalk: "Account en team" staat nu als
"Mijn account" achter het profiel-icoon rechtsboven (zie hieronder), "Koppelingen" is naar Admin
verhuisd, omdat alleen de beheerder een koppeling mag maken. Een hoofdstuk zonder bestemmingen valt
al automatisch weg (zie "de zijbalk groeit mee" hieronder), maar een kop die voorgoed leeg is, is
geen kop meer: "Instellingen" is daarom ook uit `HOOFDSTUKKEN` in `lib/nav.ts` weg. De pagina zelf
(`/instellingen`) bestaat gewoon nog, als bestemming van "Mijn account".

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
| Het icoon van de kop | De kleur van de tekst ernaast | Onveranderd, `currentColor` | Het heeft een halve dag `--accent-purple` gedragen; dat is teruggedraaid, zie de waarschuwing onder deze tabel |
| Het kindschap | Een verticale lijn links van de kinderen | **28px inspringen, geen lijn** | De tekst van een bestemming staat exact onder de tekst van zijn kop; de lijn liep dwars door de actieve regel |
| De actieve regel | `--bg-elevated` met de gewone tekstkleur | **`--bg-elevated` met `--text-primary`, en een hover van 5% inkt eronder** | Het vlak alleen haalde 1,1:1 met zijn eigen achtergrond: je zag het pas als je ernaar zocht. De tekst laten meelopen naar de primaire kleur lost dat op zonder er een merkkleur bij te halen |
| De ruimte | 4px tussen hoofdstukken, 30px per regel | **20px tussen hoofdstukken, 36px per regel** | Zes groepjes met lucht ertussen lezen als een indeling, zestien regels op elkaar als een lijst |

⚠️ **De kop kleurt niet meer mee met de pagina waar je staat.** Hij was donker zodra een bestemming
eronder actief was. Dat markeerde één van de zes koppen én de regel eronder, twee markeringen voor
één plek, en de kop bewoog dus mee terwijl hij juist het vaste punt hoort te zijn.

⚠️ **Er staat sinds 24 augustus 2026 geen paars meer in de zijbalk.** Het icoon van de kop, de
actieve regel en de vier `alleen jij`-stempels hebben het allemaal een halve dag gedragen. Twee
redenen om het terug te draaien, en de tweede is de zwaarste. In de donkere stand kwam de actieve
regel uit op paarse letters (`#ad45ff`) op een paars vlak (`#42006d`): 2,6:1, onder de 4,5 die
leesbare tekst vraagt. En paars betekent in dit systeem "hier doet de AI iets"; zolang de balk het
naast élk scherm gebruikt voor "je bent hier" betekent het dat niet meer. Dat is dezelfde redenering
die de hoofdknop van paars naar inkt bracht. Zie `designsystem.md` §10.4.

⚠️ **"Alleen jij" is een gevuld stempeltje geworden**, in dezelfde tint als de actieve regel. Los
grijs hoofdlettertekst achter de bestemming las als een tweede label van die bestemming, terwijl het
een stempel erop is: dit ziet de klant niet. Het staat op `--radius-sm`, dezelfde vorm als de chips
elders in de app.

**Ingeklapt (64px) draagt het icoon de tekstkleur**, ook als het hoofdstuk niet actief is. Het is
daar het enige wat er van de zes ankers over is en moet dus leesbaar zijn, niet opvallend; de
actieve staat zit in het vlak eronder.

### Het overzicht: de eerste schermhoogte draagt het antwoord (24 augustus 2026)

`/merk/[id]` telde tien blokken, allemaal open, allemaal even zwaar, in één kolom van 1024px.
"Waar begin je" stond als tiende. Dat botst met twee regels tegelijk: §5 zegt dat dit scherm
"hoe sta ik ervoor en wat moet ik nu doen" beantwoordt, en §1 vraagt rust boven volledigheid.

**De volgorde is nu: stand, wat op je wacht, waar je begint. Daarna pas de verdieping.**

| Blok | Wat het beantwoordt |
|---|---|
| Kop | Welk merk, en hoe vers de meting is |
| De stand | Vier tellingen over de volle breedte, en de drie zinnen van `insights()` als duiding |
| Wat er op jou wacht | Hooguit vijf regels, alleen de staat `nu`, doorklik naar de rest |
| Waar begin je | De zes bovenste kansen, de eerste gemarkeerd |
| Je contentplan | Volle breedte, weg in de eerste maand |
| Wat ORBIT ENGINE deed | Volle breedte, vijf regels open en hooguit vijftien in totaal |

⚠️ **De twee rondes hieronder scherpen de vorm van deze blokken aan.** De volgorde hierboven blijft;
wat eronder staat vervangt de vormgeving ervan, niet de indeling.

⚠️ **Eén hoofdgetal, en dat was het niet.** De zichtbaarheid stond vier keer op dit scherm: in de
subkop, in de stand-kaart, in de mijlpalen en in de maandinzichten, in drie verschillende schalen
(`0%`, `0`, `0 van de 100`). De subkop noemt het cijfer niet meer, de maandinzichten hebben geen
eigen blok meer maar staan ín de stand-kaart, en `lib/insights.ts` laat het getal weg bij een eerste
meting: daar staat het immers vlak boven. Bij twee metingen blijven de cijfers wél staan, want dan
gaat de zin over het verschil en dat is nieuwe informatie.

⚠️ **De toon van een werkregel volgt de soort werk** (`workChipTone()` in `lib/work-kind.ts`,
doorgegeven via `lib/work.ts`). Sinds 25 augustus draagt de KAART die toon (`card-danger`) in plaats
van een chip; het onderscheid zelf blijft precies zoals hier beschreven. Alle
vijf de soorten stonden op `chip-warning`, waardoor "Bekijk wat er mis is" er precies zo uitzag als
"Nakijken". §2: `attention` vraagt een keuze en is niet fout, `danger` is een blokkade of iets dat
niet gelukt is. Een storing die eruitziet als een routineklus blijft liggen.

⚠️ **Het activiteitenblok staat ingeklapt** (`CollapsibleSection`, `defaultOpen={false}`). Het was
het langste blok van de pagina en het enige waar geen handeling uit volgt.

⚠️ **De mijlpalen zakten toen, en zijn op 26 augustus 2026 helemaal weg.** Besluit 7 zette ze
bewust op het overzicht als het antwoord op "waar betaal ik voor". Ze stonden eerst pal onder het
hoofdcijfer, wat in maand 1 drie nullen onder een lage score opleverde; op 26 augustus is het blok
er in zijn geheel afgehaald en is van de drie getallen alleen "pagina's gepubliceerd" overgebleven,
bovenaan tussen de vier programmacijfers. Zie de ronde onderaan deze paragraaf.

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

#### De vormgevingsronde erna, dezelfde dag

De volgorde klopte, de vorm nog niet: twaalf witte kaarten met een dunne rand onder elkaar, waarvan
de bovenste toevallig het hoofdgetal van het merk droeg. Zes ingrepen, allemaal terug te vinden in
`designsystem.md`, geen ervan alleen op dit scherm van toepassing.

| Wat | Waarom | Waar het vastligt |
|---|---|---|
| Een groene stang links op de stand-kaart | Het hoofdgetal zag eruit als de vijf kaarten eronder. De tint volgt de eerste zin van `insights()`, dus groen betekent "dit steeg écht" en niet "dit is een kaart" | `designsystem.md` §5.5 |
| De inzichtregels kregen een gekleurde stip, en de zin werd weer zwart | De hele zin stond in groen of oranje. Drie regels waarvan er twee gekleurd zijn, leest als een foutmelding; en het teken • kwam uit de tekstlaag en zag er per platform anders uit | `designsystem.md` §6b.1 |
| Elke regel in "wacht op jou" en "waar begin je" kreeg een icoon | Twaalf kansen die alleen in hun tekst verschilden. Het icoon draagt het verschil tussen een nieuwe pagina en een bestaande die bijgewerkt wordt, vóór de eerste letter | `designsystem.md` §6b.3, regel 5 |
| Iconen en de handeling onderaan een kaart in de leeskleur, niet in paars | Twaalf paarse regels onder elkaar maken van een lijst een muur van gelijkwaardige hoofdacties | `designsystem.md` §6b.3, regel 6 |
| Kaarttitels van 500 naar 600, het hoofdgetal naar 700 | Titel en toelichting leken even zwaar; het cijfer dat het antwoord van het scherm is, was niet het zwaarste element van zijn kaart | `designsystem.md` §3.1 |
| De potentiechip rechts uitgelijnd, en minder rond | Hij draagt het getal waarop de lijst gesorteerd is, dus hij hoort in één kolom te staan en niet achter elke titel op een andere plek | `designsystem.md` §5.1 |

⚠️ **De laatste regel is op 25 augustus ingehaald.** De kolom rechts klopte, de inhoud niet: bij een
merk met één onderwerp kan de potentiescore niet variëren en stond er zes keer hetzelfde getal. De
kolom is gebleven, de chip is vervangen door wat wél verschilt. Zie de ronde hieronder.

⚠️ **Vier van de zes gelden voor de hele app en niet voor dit scherm.** De chipvorm, de gewichten
en de twee icoonregels staan in `globals.css` en in gedeelde componenten, en zijn in dezelfde ronde
doorgevoerd op `/merk/[id]/analytics` (hetzelfde hoofdgetal, dezelfde stang) en op `WorkRow`
(dezelfde werkregels, dezelfde iconen). Een vormgevingsregel die maar op één scherm geldt, is geen
regel maar een uitzondering, en die groeien vanzelf terug uit elkaar.

### Het overzicht is de landingspagina, en dat verandert de regels (25 augustus 2026)

`app/page.tsx` stuurt na inloggen door naar `/merk/[id]`, bij één merk zonder tussenstap. Dit is dus
niet een scherm dat je opzoekt maar het scherm dat je élke sessie als eerste ziet. Drie regels
volgen daaruit, en ze gelden voor elke toekomstige landingspagina.

**1. Zeg hoe vers het is.** Er wordt maandelijks gemeten (`vercel.json`, `0 6 1 * *`) en de klant
kijkt vaker. Zonder meetdatum ziet hij vier weken achter elkaar dezelfde 57% zonder te weten dát het
dezelfde meting is, en dan wordt inloggen zinloos. De beschrijving onder de merknaam was een
opsomming van de blokken eronder ("hoe zichtbaar je bent, wat er op je wacht en waar je begint") en
zei op elk bezoek hetzelfde. Nu: "Je nieuwste meting is van 15 augustus. De volgende draait op 1
september" (`lib/overview.ts`, `versheidsregel`). Kost geen query: `visibility_scores.computed_at`
stond er al.

**2. Eén primaire knop, en die hoort bij de klant.** Er stond er geen enkele. De enige verzadigde
kleur op het scherm was een chip, en een chip is een etiket: het scherm vroeg nergens om een klik.
De primaire knop staat nu op de wachtrijregel, want dat is het enige waar de klant vandaag iets aan
kan doen. De eerste kans krijgt bewust `btn-outline`. Een tweede primaire knop laat de klant kiezen
welke van de twee de hoofdactie is, en dan is er geen. `scripts/test-unit.ts` telt ze.

**3. De half gevulde staat is de eerste indruk, geen randgeval.** Bij één meting en zonder
contentplan stonden er drie mijlpalen op nul, vier voortgangsbalken op nul en een ingeklapt blok
zonder inhoud. Dat is precies het beeld waarop een nieuwe klant besluit of dit serieus is, en het
meldde vooral wat er nog niet was. De verdiepingslaag valt nu weg tot hij iets te zeggen heeft, met
één regel in de plaats: "ORBIT ENGINE meet opnieuw op 1 september. Dan staat hier wat je
zichtbaarheid gedaan heeft" (`lib/overview.ts`, `isEersteMaand`).

#### Eén hoofdgetal betekent ook: één rekensom

De ronde van 24 augustus haalde het hoofdgetal terug naar één plek op het scherm. Het bleef in drie
GETALLEN staan: de standkaart zei 57% (gewogen score, gewogen gemiddeld over de clusters), de duiding
eronder zei "van 30 naar 60" en het opbrengstblok zei "+30 punten", allebei uit de ongewogen score,
ongewogen gemiddeld. Drie rekensommen voor één begrip, nagerekend op Gasservice Brabant.

`lib/brand-score.ts` doet die som nu één keer, gewogen op het aantal vragen per cluster, en de
standkaart, `lib/insights-data.ts` en `lib/milestones-data.ts` lezen alle drie die uitkomst. De
startpagina haalde `visibility_scores` ook nog een tweede keer zelf op; die query is weg.

⚠️ **Dezelfde regel geldt voor elk scherm met een gedeeld kengetal.** Twee blokken die hetzelfde
begrip tonen en het zelf uitrekenen, lopen uit elkaar zodra iemand er één aanpast.

#### Een cijfer zonder richting is geen informatie

Naast het getal staat een chip met het verschil, met de toon uit dezelfde toets als de zin eronder
(`changeIsMeaningful`), zodat de chip nooit iets anders beweert dan de duiding. Blijft het verschil
binnen de meetruis, dan zegt de chip "gelijk gebleven" met een streepje in plaats van "+5" met een
pijl omhoog. Op de regel eronder: de marge én de noemer ("marge 42% tot 72% · gemeten over 30
vragen"). De noemer stond nergens.

⚠️ **Het verloopslijntje pas vanaf drie metingen.** Een lijn van twee punten toont geen vorm maar
een richting, en die staat al in de chip. Twee elementen voor één mededeling, en het lijntje van 96
pixels was de zwakste van de twee.

#### Sectiekoppen zijn koppen, geen opgemaakte spans

`mono-label` deed op dit scherm zeven taken tegelijk: paginakop, sectiekop, kaartlabel, metadata
onder een titel, teller, legenda en doorkliklink. Een sectiekop en een regel metadata ín een kaart
waren typografisch niet te onderscheiden, dus er was nergens zichtbaar waar een hoofdstuk begon. Dat
is de goedkoopste oorzaak van "het voelt rommelig" die er is.

`components/section-heading.tsx`: `type-section`, leeskleur, gewone zinsvorm, en een echte `h2`. Het
scherm had één kop (`h1`) en daaronder acht naamloze blokken, dus wie met een schermlezer door de
koppen springt sprong van de merknaam meteen naar het einde. `mono-label` houdt één taak over:
metadata en labels bínnen een kaart.

⚠️ **Het ritme drukt de groepering uit:** 32 pixels tussen secties, 12 binnen een sectie. Het was
overal 24, dus nergens stond in witruimte dat zes kansen bij elkaar horen en het opbrengstblok een
nieuw hoofdstuk is. Het laadskelet volgt diezelfde maten, anders springt het scherm op het moment
dat de data binnenkomt.

#### Toon alleen wat onderscheidt

De kansenlijst was zes kaarten van gelijke maat en gelijk gewicht, elk met rechtsboven een groene
chip die bij Gasservice Brabant zes keer exact "Potentie 68/100 (hoge)" zei. De potentiescore is
zichtbaarheidsgat × zoekvolume, het zoekvolume hoort bij het ONDERWERP, en dit merk heeft er één:
die chip kón daar niet variëren. Hij beloofde een rangorde die er niet was, stond in groen terwijl
hij een gát markeert, en kostte de meest opvallende plek van elke kaart.

| Wat | Nu |
|---|---|
| De potentiechip | Alleen als er binnen de lijst meer dan één waarde voorkomt, en dan `chip-neutral` (`potentieVarieert`) |
| Rechts in de kolom | Wat wél verschilt: "3 van 30 vragen" (`reachShort`), volle zin in de tooltip |
| Onder de titel | De soort werk als woord ("Pagina bijwerken") plus het pad van de pagina |
| De linktekst | "Werk deze pagina bij" in plaats van "Werk https://... bij" |
| De vorm | De eerste kans is een kaart met stang, de rest is één lijst met scheidingslijnen |

⚠️ **Er zijn precies twee stangen op dit scherm:** de standkaart en de eerste kans. Een derde en de
stang markeert niets meer.

#### Twee tellingen die elkaar tegenspreken, gelden als een fout

"1 · Pagina gepubliceerd" stond op hetzelfde scherm als "Nog geen van je 120 geplande pagina's staat
live". Allebei waar: de eerste pagina van Gasservice Brabant is geschreven vóórdat het contentplan
bestond en hangt aan geen enkele planregel. Voor de klant zijn het twee tellingen van hetzelfde ding
die elkaar tegenspreken, en dan gelooft hij geen van beide. `lib/overview.ts` (`planRegels`) benoemt
het verschil in plaats van het te laten raden.

#### De verdieping, opnieuw ingedeeld

| Wat | Waarom |
|---|---|
| De drie mijlpalen werden één kaart met scheidingslijnen | Drie kaders naast elkaar die één ding zeggen, op een scherm met nog vijf kaders |
| De startdatum is niet meer de hoofdwaarde | "11 augustus 2026" in de cijfermono was het breedste element van een rij met drie getallen, terwijl het als enige geen prestatie is. Nu de looptijd, met de datum eronder |
| Vier voortgangsbalken werden één | Ze stonden alle vier op 0%: vier lege banen en vijf keer het woord nul. De fases staan er nu als tellingen; één balk draagt de voortgang van het hele plan |
| Het activiteitenblok toont zijn eerste drie regels | Het was één dichte accordeon met 400 pixels leegte eronder, naast een kaart van 500 pixels. Dat oogt als een fout in de indeling, niet als een keuze |
| De wachtrijregel toont `WorkItem.why` | Er stond `analysisName`, in de praktijk een rauw adres in hoofdletters. Het scherm toonde het minst bruikbare veld en gooide het bruikbaarste weg |
| De toon van de soort werk zit op de kaart | `card-danger` bij een blokkade, in plaats van een chip van 60 pixels. Het onderscheid uit §2 blijft, maar draagt verder |

### Het contentplan heeft twee gedaanten (27 augustus 2026)

Het planscherm was één scherm voor twee gebruikers met tegengestelde behoeften. De consultant plant:
voorraadkolom met zoekveld en filters, twaalf maanden, slepen, een publicatiedatum per regel,
volgordeknoppen en een menu per pagina. De klant plant niet. Hij wil weten wat er deze maand voor
hem geschreven wordt en wat hij zelf moet doen. Toch kreeg hij hetzelfde bord, met bovenaan de
uitleg "sleep beschikbare content items naar de maand waarin ze geschreven moeten worden".

**Er zijn sinds vandaag twee weergaven, allebei voor iedereen.** Een schakelaar bovenaan het scherm
zet ze om, en de rol bepaalt alleen waar je landt: de klant op Overzicht, de consultant op Plannen.
Een weergave in de URL (`?weergave=`) wint van de rol, zodat een gedeelde link bij beiden hetzelfde
opent. Het bord is ongewijzigd; de klant mag daar alles wat de consultant er mag.

**Overzicht** (`plan-read-view.tsx`, met de rekenlaag in `lib/plan-read.ts`). Vier blokken, in deze
volgorde:

1. **Wat er van jou gevraagd wordt**, één zin. De volgorde erin is de volgorde waarin het werk
   vastloopt: publiceren gaat voor nakijken (een goedgekeurde tekst die niet live staat, is al
   betaald en levert nul op), nakijken gaat voor vrijgeven (daar is nog niets voor betaald).
2. **Deze maand**, met de status van de maand, de pagina's op datum, een chip per pagina die iets
   toevoegt, en de knop "Geef deze maand vrij" als hij nog niet vrijgegeven is.
3. **Volgende maand**, dezelfde opmaak, zonder knop.
4. **De rest van je jaar**, ingeklapt, alleen maandnummer en aantal. Naslag, dus dicht (§5).

⚠️ **De kalender bepaalt welke maand "deze maand" is, niet de status.** Wie op 3 september inlogt
hoort september te zien, ook als hij augustus nooit heeft vrijgegeven. Zou de status leidend zijn,
dan blijft hij naar een voorbije maand kijken en ziet hij zijn eigen achterstand aan voor de stand
van nu.

⚠️ **Eén handeling op Overzicht, en alleen die.** Vrijgeven staat op beide weergaven, met dezelfde
dialoog en dezelfde route (conventie P2). Alles wat de indeling verandert, slepen, verplaatsen, data
zetten, afwijzen, staat op het bord, één klik verderop. Twee schermen die allebei half kunnen
plannen is erger dan één dat het helemaal kan en één dat leest. Een broncodecontrole in
`scripts/test-unit.ts` bewaakt dat de leesweergave geen sleepmachinerie krijgt en dat de schakelaar
er staat.

### De ronde staat bovenaan, en de score staat er weer onder (27 augustus 2026)

Twee wijzigingen aan de startpagina, uit de structuurreview van 27 augustus 2026, en de tweede
draait de beslissing van de dag ervoor terug.

**Nieuw bovenaan: de ronde** (`lib/ronde.ts`, `RondeBalk`). Zes stappen naast elkaar, meten, kansen,
plannen, schrijven, publiceren, hermeten, met per stap de stand van nu en één zin eronder die zegt
wie er aan zet is. Het product ís een kringloop, maar het menu is een kast met laden, en een kast
vertelt niet dat de laden samen één ronde zijn. Wat de klant miste was niet zijn takenlijst, die is
er en die werkt, maar het antwoord op "waar leidt dit toe".

Drie regels die deze balk anders maken dan een voortgangsbalk:

- **Geen balk die vult.** Een vullende balk belooft een einde; na hermeten begint de volgende
  meting. Zes losse stappen zeggen waar je staat zonder te zeggen dat je er bijna bent.
- **Een stap is klaar als er iets gebeurd is, niet als er iets klaarstaat.** Een plan zonder
  ingeplande pagina's is geen plan, een tekst die niet live staat is geen publicatie.
- **De stand is nooit "3 van de 10".** Een doel dat de klant niet zelf gesteld heeft, is een verwijt
  zodra hij het niet haalt. Er staat dus "3 teksten".

Twee van de zes stappen dragen een chip "jij": plannen en publiceren. Dat is de enige plek in de app
waar de arbeidsverdeling in één oogopslag staat, en het is de kern ervan: ORBIT ENGINE komt niet op
de website van de klant.

**Het zichtbaarheidspercentage staat weer op de startpagina**, bovenin de standkaart, met de
onzekerheidsmarge en het verschil sinds de vorige meting. Een meetproduct dat opent met vier
productietellingen laat eerst zien hoeveel er gemaakt is, terwijl de klant komt kijken of het wérkt.
Dezelfde terughoudendheid als op Analytics geldt hier: een verschil binnen de marge heet "gelijk
gebleven" en telt niet als winst (`changeIsMeaningful`). De vier tellingen blijven staan, eronder.

### Het overzicht toonde alleen de omvang van het programma (26 augustus 2026)

⚠️ Deze afspraak is één dag later herzien, zie de sectie hierboven. Wat hier staat over de vier
tellingen geldt nog steeds; wat er staat over het weghalen van het percentage niet meer.

Aansluitend op de ronde hierboven, en op één punt tegen de uitkomst daarvan in. De standkaart droeg
het zichtbaarheidspercentage als hoofdgetal. Dat ging toen **weg van de startpagina**: het stond op
Analytics, één klik weg via de knop die er nog steeds naast staat.

**De vier cijfers die ervoor in de plaats komen** (`overzichtCijfers()` in `lib/overview.ts`), over
de volle breedte van de kaart, met een scheidingslijn ertussen en geen eigen kaders:

| Cijfer | Waar het vandaan komt |
|---|---|
| Pagina's gepubliceerd | `content_pieces.published_at`, via `lib/overview-data.ts` |
| Clusters actief | De actieve analyses van dit merk (gearchiveerde tellen niet mee, migratie 0044) |
| Nieuwe pagina's | Kansen met handeling `nieuwe_pagina`, over alle clusters |
| Paginaoptimalisaties | Kansen met handeling `pagina_bijwerken`, over alle clusters |

⚠️ **Geen enkele van de vier draagt een vergelijking met een vorige periode.** Dit zijn standen en
geen metingen: het aantal clusters verandert doordat iemand er een aanzet, niet doordat er gemeten
is. Een groeipercentage erop plakken suggereert beweging waar een besluit zit. De duiding over de
tijd hoort bij de score, en die staat in de drie zinnen eronder.

⚠️ **De toelichting onder een cijfer is hooguit 23 tekens**, bewaakt door `scripts/test-unit.ts`.
Drie van de vier kolommen dragen een scheidingslijn met inspringing en zijn daardoor 24 pixels
smaller dan de eerste. Een regel die alleen dáár afbreekt, maakt de rij ongelijk hoog en leest als
een fout in plaats van als tekst.

**Het opbrengstblok is helemaal weg.** "Actief sinds", "+30 punten" en "1 pagina gepubliceerd"
stonden onderaan als het antwoord op "waar betaal ik voor" (besluit 7). Van die drie is er één
overgebleven, bovenaan. `lib/milestones.ts`, `lib/milestones-data.ts` en
`components/milestones-block.tsx` zijn verwijderd; de git-historie is het archief.

⚠️ **`accounts.value_per_mention_eur` wordt nu op geen enkel scherm getoond.** Besluit 16 zette dat
bedrag in het opbrengstblok, en dat blok bestaat niet meer. De kolom blijft staan en blijft te
bewerken; komt er een scherm dat over rendement gaat, dan hoort hij daar.

**Het contentplan en het activiteitenblok staan nu allebei over de volle breedte, onder elkaar.**
Ze stonden op `lg` naast elkaar omdat ze allebei smal van inhoud waren. Dat klopte niet meer: het
plan is het enige blok met vier soorten inhoud (voortgang, fases, mix, reservepagina's) en werd in
een halve kolom geknepen. Over de volle breedte staan de fases en de mix náást elkaar in plaats van
onder elkaar, waardoor de kaart half zo hoog is. Het activiteitenblok eronder wint er ook bij: een
lijst korte regels met een tijdstip rechts leest breed beter dan smal, want dan valt het tijdstip
niet op een eigen regel.

⚠️ **Het activiteitenblok toont vijf regels open en hooguit vijftien in totaal.** Dezelfde soort
harde grens als `MAX_WACHTRIJ`, en om dezelfde reden: `activiteit()` groepeert per taaksoort en er
zijn er 32, dus in een drukke week zou dit blok zonder grens langer worden dan al het andere samen.
Het is het enige blok waar geen handeling uit volgt; het hoort nooit het langste te zijn. Wat er
buiten de vijftien valt, wordt geteld in één regel en niet stil weggelaten (§4).

### Mijn reputatie: van acht blokken naar vijf hoofdstukken (25 augustus 2026)

`/merk/[id]/analytics/reputatie` telde acht blokken op hoofdniveau en veertien uitklapkoppen, alle
met hetzelfde grijze mono-label en hetzelfde gewicht. Nergens was zichtbaar wat het antwoord van het
scherm was en wat de voetnoot. Dat botst met §1 op drie punten tegelijk: rust boven volledigheid,
één hoofdgetal, en geen jargon.

**De volgorde is nu: de uitspraak, per product, wat terugkomt, waar het vandaan komt, en pas dan de
vergelijking met de vorige meting.**

| Hoofdstuk | Wat het beantwoordt |
|---|---|
| De uitspraak | Eén kop in gewone taal, de toonmeter met zijn marge, en twee steunfeiten: noemt AI je als een koper kiest, en waar rust dit beeld op |
| Per product en dienst | Drie groepen: waar ChatGPT anderen noemt en jou niet, waar hij je wel noemt, en waar die vraag niet gesteld is |
| Wat er over je terugkomt | De patronen uit de synthese, met de telling erbij uit hoeveel producten ze komen |
| Waar dit beeld vandaan komt | De reviewcijfers die AI leest, de bronnen, het verschil tussen wat hij uit zichzelf weet en wat hij opzoekt, en de vergelijkingstabel |
| Sinds de vorige meting | Alleen als er een tweede afgeronde meting is |

⚠️ **Het hoofdgetal sprak zichzelf tegen, en dat is de zwaarste fout die hier zat.** Bovenaan stond
de chip "neutraal 0", twee regels lager de zin "bij 22 van de 22 vragen noemt ChatGPT zowel lof als
kritiek". Het etiket `gemengd` scoort in `lib/reputation/tone.ts` altijd exact 0 en 0 heet op de
schaal neutraal, dus de zwaarste mededeling van het scherm ontkende de op één na zwaarste. De kop
komt nu uit `reputationHeadline()` in `lib/reputation/screen.ts` en zegt "verdeeld" zodra de helft
of meer van de oordelen `gemengd` is. **Het cijfer verandert niet, alleen het woord erboven.**

⚠️ **Vijf chips op één rij zijn vijf schalen die de klant niet deelt.** Er stond "neutraal 0",
"marge ±6", "bewijs 99", "1.7e van 4 · indicatief" en "eenduidigheid 71". Daarvoor in de plaats komt
één meter (`_components/tone-meter.tsx`) die de schaal zelf toont, de marge als band eromheen zet en
het oordeel in woorden noemt. De bewijskracht staat als woord in de steunkaart ernaast
(`evidenceWord()`), want een cijfer op een schaal die alleen wij kennen is geen mededeling.

⚠️ **Per product stond er twaalf keer hetzelfde.** Twaalf dichtgeklapte regels, alle twaalf met de
badge "1 vraag" en de chip "neutraal 0", die opengeklapt "ChatGPT geeft een neutrale toon van 0"
toonden en verder niets: `top_pros` en `top_cons` van een aanbodrij vullen pas bij twee of meer
vragen per product, en er is er één. De regels lezen nu hun plus- en minpunten uit de ANTWOORDEN,
waar er op de run van Gasservice Brabant 89 en 60 klaarlagen.

⚠️ **De beste tabel werd niet uitgelezen.** `reputation_market` bevat per product wie ChatGPT
aanraadt en op welke plek de klant staat. Het scherm raakte die tabel niet aan, terwijl daar het
enige cijfer in staat waar rechtstreeks geld aan hangt. Op de echte run: bij 4 van de 9 gemeten
producten wordt Gasservice Brabant genoemd, bij 5 niet, en bij cv-ketel storing raadt ChatGPT
Kemkens, Warmte Centrum Brabant, VSB, MVS en Van Beek aan. Dat is nu de indeling van hoofdstuk 02.

⚠️ **"Niet gevraagd" is een eigen groep en geen lege regel.** Bij drie producten was het budget op
voordat de marktvraag gesteld werd. Die op één hoop gooien met "AI noemt je niet" zou de klant laten
schrikken van een gat dat wij zelf maakten (conventie 3).

⚠️ **"Gemiddeld op plek 2,3 van 6" is van het scherm af.** Dat gemiddelde loopt over alle
marktvragen, ook de merkbrede met zes partijen, terwijl de vier producten eronder op plek 2 van 3,
2 van 5, 3 van 5 en 2 van 4 staan: nergens een noemer van 6. Twee tellingen van hetzelfde die elkaar
tegenspreken gelden als een fout, en van de twee is de lijst de concrete. `market_position` blijft
opgeslagen voor de vergelijking over de tijd.

⚠️ **De voorbehouden zakken, maar verdwijnen niet.** "Wat dit niet is" blijft altijd zichtbaar en
nooit ingeklapt (richtlijn 8 uit `schrijfstijl.md`), maar staat onderaan in gedempte tekst in plaats
van in dezelfde opmaak als de bevindingen. De kanttekeningen bij de meting zijn een uitklapregel in
de uitspraakkaart geworden: het is een voetnoot bij onze meting en geen bevinding over het merk.

**De volledige samenvatting die het model schreef staat niet meer op het scherm.** Zeven regels
proza die de toon, de verdeeldheid, de bronnenmix, de trefkans en de vergelijking herhaalden, boven
precies dezelfde feiten in gestructureerde vorm. De kop en de steunkaarten zijn nu deterministisch
opgebouwd uit de opgeslagen waarden. De tekst zelf blijft in `reputation_runs.summary` staan
(conventie 8).

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

**Een analyse is één dossier in vier hoofdstukken**, als tabbladen:

```
01  STAND       Hoe sta ik ervoor?     score · verandering · wat het betekent
02  BEWIJS      Waar win en mis ik?    per vraag, met het letterlijke antwoord
03  WERK        Wat moet ik doen?      één lijst, elke regel een taak met status
04  RESULTAAT   Heeft het gewerkt?     effect van wat gepubliceerd is
```

De volgorde ís de logica: hoofdstuk 4 voedt volgende periode hoofdstuk 1. Dat gaf lang de doorslag
tegen een tabbalk (§9, `docs/logbook.md` 17 juli 2026): een tabbalk kan een vaste volgorde niet
uitdrukken, en werk kruiste de oude, gelijkwaardige tabbladen. Op expliciet verzoek is dat op 26
augustus 2026 alsnog omgedraaid: vier losse tabbladen, gestuurd via `?hoofdstuk=` in de URL, met
maar één hoofdstuk tegelijk gerenderd. De volgorde blijft zichtbaar via de nummering 01 t/m 04, en
hoofdstuk 04 benoemt in zijn eigen tekst nog steeds dat hij hoofdstuk 01 voedt, alleen niet meer met
schermruimte. Zie `docs/logbook.md` 26 augustus 2026 voor de volledige afweging.

Oriëntatie via de **hoofdstuktabs** (`components/chapter-tabs.tsx`): genummerde mono-labels, een
horizontale, sticky chiprij boven de inhoud, op zowel desktop als mobiel. De balk toont stand per
hoofdstuk ("4 open", een `live-dot` bij een lopende meting). Serverside navigatie (`Link` met een
querystring), geen client-side tabstate: elk hoofdstuk houdt zo zijn eigen `Suspense`-grens en elk
tabblad is een deelbare URL. Dit is een los component van de **sectie-rail**
(`components/section-rail.tsx`, verticaal, met scroll-spy): die draait nog op het onboardingscherm,
dat wél één doorlopende pagina blijft.

**De lagen onder en boven een sticky balk.** Er plakken er twee onder elkaar, en dat gaat op twee
manieren mis. De hoogte van de bovenbalk staat daarom in één token, `--header-h` in
`app/globals.css`, dat `workspace-chrome.tsx` óók op de balk zelf zet: een sticky balk eronder
begint op `top-[var(--header-h)]` en kan er niet meer naast zitten. En de z-index-ladder is vast:
inhoud van een hoofdstuk `z-10` → popovers en losse sticky blokken `z-20` → navigatiebalken
(bovenbalk, hoofdstuktabs) `z-30` → uitklapmenu's `z-40` → dialogen en meldingen `z-50`. Een
navigatiebalk op `z-10` verliest van hoofdstukinhoud die later in de DOM staat, en schuift daar dan
onderdoor bij het scrollen.

⚠️ **Een z-index redt een menu niet uit een `overflow: hidden`.** Elke kaart in dit project knipt af
wat buiten zijn rand valt (anders steken de rijen door de afgeronde hoek), en elke scrollende lijst
doet hetzelfde. Een uitklapmenu met `position: absolute` binnen zo'n kaart werkt daardoor alleen
zolang het toevallig past: op de onderste regels van het contentplan liep het menu dood tegen de
kaartrand, met de halve maandenlijst onzichtbaar. Zo'n menu hoort in een **portal op
`document.body`** met `position: fixed`, de plek uitgerekend uit de knop (`getBoundingClientRect()`),
omhoog openend als er onderin het scherm geen ruimte is, en sluitend bij scrollen buiten zichzelf.
Het voorbeeld staat in `RijMenu` in
`app/(app)/merk/[id]/strategie/plan/plan-view.tsx`.

**Dezelfde regel geldt op de contentdetailpagina** (`analyses/[id]/bibliotheek/[pieceId]/page.tsx`,
content-editie): geen tabbladen, wél een leesvolgorde die van handeling naar verdieping loopt.
Publiceren (`PublishBox`, met de handleiding ingeklapt eronder) → context (`WhyThisPage`, waarom
deze pagina) → wat er nu staat (`SearchPreview`, inhoudsopgave, artikel, FAQ) → kwaliteitscontrole
(GEO-score, vrijgavepaneel) → bewerken (`ContentEditor`, met een Bewerken/Voorbeeld-toggle in
plaats van een aparte route) → geschiedenis en vergelijken (`VersionDiff`).

⚠️ **Publiceren stond hier tot 27 augustus 2026 helemaal onderaan**, onder acht andere blokken, en
dat is verhuisd naar boven. De reden is geen smaak maar rekenkunde: het invullen van de link is de
enige handeling op dit scherm die het cijfer van de klant beweegt, want een geschreven pagina die
niet online staat levert per definitie nul op. Dat teksten bleven liggen was al bekend, er is een
herinneringsmail voor gebouwd (`app/api/cron/reminders`). De volgorde is nu: wat is dit, zet het
live, en pas daarna alles wat je kunt controleren en bijschaven. De kwaliteitscontrole staat nog
steeds vóór de bewerkknop, niet erna.

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

⚠️ **Het zijn er sinds 28 augustus 2026 twee.** "Vraagt jouw input" heet nu
"Openstaande vragen" en staat onder Strategie, op
`/merk/[id]/strategie/vragen`, met de vragen uit élk cluster erbij. Dit
hoofdstuk gaat over wie je bent; die vragen bepalen wat er geschreven wordt, en
sinds de eindpoort zelfs of een pagina afgerond kan worden. Het oude adres
verwijst permanent door (`lib/redirects.ts`).

| Scherm | De vraag | Wat erop staat |
|---|---|---|
| Merkdossier `/merk/[id]/merkprofiel` | Wat weet ORBIT ENGINE van mij? | Kop, het dossier, wat AI over je weet, aanbod, concurrenten |
| Bewerken `/merk/[id]/merkprofiel/bewerken` | Klopt dat? | 41 velden in zeven stappen, plus gereedschap |

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

**Openstaande vragen** (tot 28 augustus 2026 "Vraagt jouw input", en tot die
dag onder dit hoofdstuk) is één blok waar er twee waren: de feitenvragen mét
invoerveld en de open punten uit het onderzoek. Voor de gebruiker is dat één
ding, "moet ik iets aanvullen", dus staat het op één plek met de teller in de
kop.

⚠️ **Sinds 28 augustus 2026 staan de clustervragen er óók op**, met een filter
per cluster en een aparte knop voor de merkvragen. De scheiding van 14 augustus
2026 (clustervragen bij hoofdstuk 03 van dat cluster) is daarmee opgeheven voor
de klant: hoofdstuk 03 toont ze nog steeds bij het schrijfwerk waar ze vandaan
komen, maar wie de vraag "moet ik nog iets aanvullen" stelt, krijgt op één plek
het volledige antwoord. Het invoerveld staat sindsdien onder de vraag en is drie
regels hoog; naast de vraag, één regel hoog, paste er geen antwoord in.

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

### "Gelijk" is geen uitspraak zonder erbij te zeggen wat er nodig zou zijn (26 augustus 2026)

Het effectscherm (`ResultsPanel`, optimalisatie.md 5.6) zette bij een pagina zonder aantoonbaar
verschil "dat verschil valt binnen de meetruis (55 punten nodig)" onder de chip "Nog gelijk". Cijfer
en chip klopten allebei, en toch was de zin onbruikbaar: "55 punten nodig" zegt niet wát er 55 punten
moet worden, en bij een pagina met een handvol doelvragen (de Eindhoven-pagina van de testklant
Huyberts Keukens: 5 vragen, 0 naar 1 genoemd) kan de toets sowieso nooit iets anders zeggen dan
"gelijk". Dat is een eigenschap van de steekproefgrootte, geen conclusie over de pagina, en het
scherm zei dat nergens.

De zin noemt nu het aantal VRAGEN in plaats van PUNTEN, en het concrete aantal dat nodig zou zijn:
"met 5 vragen is dit verschil niet te onderscheiden van toeval, daar zijn er minstens 25 voor nodig"
(`minQuestionsForSignal()`, `lib/pipeline/impact-math.ts`). Dat is een zin waar een klant iets mee
kan: hij weet nu dat het probleem bij het aantal doelvragen zit, niet bij de pagina. Meer doelvragen
per pagina toekennen (de structurele oplossing) raakt hoe het rapport aanbevelingen opstelt en is een
aparte, grotere opdracht, zie `docs/tasks/roadmap.md`.

⚠️ **Geen nieuw cijfer.** `delta_threshold` en `verdict` in `content_impact` zijn ongewijzigd; alleen
de UITLEG eronder is anders. Een pagina met een écht gemeten stijging of daling toont deze zin
sowieso niet, want die verschijnt alleen bij `verdict === "gelijk"`.

## 6. Eén werkmodel

`lib/work.ts` is de enige statusmachine voor "werk". Daarvoor bestond werk in vijf vormen die
niets van elkaar wisten, dashboard-acties, rapport-aanbevelingen, off-site taken, het oordeel per
pagina in de bibliotheek en de feitenvragen, elk met eigen woorden, kleuren en volgorde.

- `WorkKind` (`blokkade` · `goedkeuring` · `herstel` · `feit` · `pagina` · `offsite`) is alleen
  een etiket. Het etiket, de tint van de chip (`workChipTone`) en de tekening ervoor
  (`workKindIcon`) staan sinds 24 augustus 2026 in `lib/work-kind.ts`, een pure module zonder
  `server-only`, zodat `scripts/test-unit.ts` erbij kan; `lib/work.ts` geeft ze onveranderd door.
- `WorkState` bepaalt de volgorde op het scherm: **`nu`** (klant moet iets) → **`loopt`** (wij zijn
  bezig) → **`wacht`** (gedaan, resultaat duurt weken) → **`klaar`**.

De klant groepeert niet naar "on-site of off-site". Dat is onze indeling. Hij groepeert naar
"moet ik hier iets?". Vandaar de staat als hoofdas.

**De opgerolde `nu`-lijst hoort bij de analyse, niet bij het overzicht ervoor.** `/analyses`
(`lib/dashboard.ts`) toonde die lijst eerder ook, over alle analyses heen, bedoeld als "waar moet
ik als eerste zijn", maar bij meerdere lopende analyses liep dat op tientallen punten in één kaart
en werd het overzicht zélf de rommel die het werkmodel per analyse juist moest voorkomen. De
werklijst blijft uitsluitend in hoofdstuk 03 van het dossier, per analyse.

⚠️ **`/analyses` bestaat sinds 27 augustus 2026 niet meer als scherm** en verwijst door naar de
clusters van het actieve merk. Er waren twee clusterlijsten, deze over alle merken heen en die onder
het merk zelf, en alleen de tweede stond in het menu. Toch kwam de klant er voortdurend: de terugknop
boven elk clusterdossier heette "Mijn clusters" en wees hierheen. Wie aan een tekst van merk A
werkte en terugklikte, stond ineens in een lijst waar de clusters van merk B ook in stonden. Die
knop heet nu "Clusters" en wijst naar het merk waar hij vandaan kwam, en zolang hij ergens in een
cluster zit licht dat menu-item op (`navActief()` in `lib/nav.ts`).

Elke rij in de clusterlijst toont in plaats daarvan vier vaste kaartcijfers plus het aantal
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
