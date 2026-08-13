# Zoekdata koppelen: wat InSpace doet, en of het voor Aura kan

**Status:** onderzoek, ontwerp is inmiddels GEBOUWD (Fase 5, 11 augustus 2026, migratie `0052`,
`lib/search-console/`). Dit document is het onderzoek dat aan die bouw voorafging, bewaard voor het
"waarom zo"; de actuele stand staat in `roadmap.md` ("Fase 5, wat er wacht op de Google-sleutel") en
`docs/architecture.md` §9. · **Opgesteld:** 6 augustus 2026 · **Vertrekpunt:** `main` op
`99cfba0`, de deployment die op dat moment op Vercel op `production` stond
(`dpl_6hE579cdFAZ6vFALooiiNYKzni4k`), migraties t/m `0044`, nagerekend tegen de productiedatabase

Onderzoeksvraag: hoe koppelt InSpace de Google Analytics en Search Console van de klant aan Nova, is
dat voor Aura realistisch, wat komt erbij kijken, hoe moeilijk is het bij de klant in te richten, en
hoe gebruik je die data stabiel in het product.

Antwoord in één alinea: **Search Console is realistisch en waardevol, Google Analytics niet, en
InSpace doet precies datzelfde onderscheid.** De koppeling loopt niet via OAuth maar via een service
account dat de klant als gebruiker aan zijn property toevoegt, wat de bouw halveert en de
verificatieplicht bij Google helemaal weghaalt. Het echte werk zit niet in de code, ~5 dagen, maar
in de onboarding: dit wordt het eerste dat Aura ooit écht van de klant vraagt.

---

## 0. Wat er op dit moment op productie staat

Dit is nagerekend, niet aangenomen, en het verandert de volgorde van het advies in §6.

| | Stand op 6 augustus 2026 |
|---|---|
| Live deployment | `main` op `99cfba0`, target `production` |
| Migraties | t/m `0044` (`archief`) |
| Profielen | 8, waarvan **7 gearchiveerd** en 1 actief |
| Analyses | 0 actief (alle 11 gearchiveerd) |
| Contentpagina's | 32: 21 op `ready`, 11 op `briefing` |
| **Gepubliceerd** | **0.** Geen enkele `published_url`, geen enkele rij in `content_impact` |
| Metingen | 352 `tracking_runs` over 313 prompts, alle op gearchiveerde analyses |
| AI-kosten totaal | $11,58 over 989 aanroepen, laatste op 2 augustus |

Drie gevolgen, en ze zijn alle drie belangrijker dan de techniek in §2.

**1. De keten publiceren, controleren en effect meten heeft op productie nog nooit gedraaid.**
Eenentwintig pagina's staan op `ready` en zijn nooit live gezet. `markPublished()`,
`checkPublication()` en `planImpactWaves()` hebben dus nul echte gevallen gezien. De sterkste
toepassing van Search Console uit §3b hangt precies aan die keten. Er bovenop bouwen is conventie 10
in het kwadraat: een onbeproefde laag op een onbeproefde laag.

**2. Deze koppeling is de eerste die niet droog te oefenen is op een willekeurige klant.** Elke
bestaande pijplijnstap draait op elk webadres zonder iemand iets te vragen; daarom staan HEMA, Bol,
Coolblue, Van der Valk, Swapfiets en Van den Udenhout in de database. Op géén van die acht
properties krijgen we ooit toegang. De mechaniek is wél te verifiëren op een eigen domein, de
Vercel-domeinen zijn gewoon in Search Console te verifiëren, dus punt 1 tot en met 4 van de
verificatietabel in §7 kan vandaag. Maar de onboarding zelf, de drie scenario's uit §4 en hoe lang
ze duren, is pas te toetsen met de eerste betalende klant. Dat is een planningsfeit, geen technisch
feit, en het is de reden dat dit werk niet vooruit te trekken is.

**3. De pijplijn ligt nu stil om een andere reden.** Het enige actieve profiel (Van den Udenhout,
5 augustus, 107 pagina's gecrawld) staat op `mislukt`: `profile_discover` en `technical_audit` zijn
klaar, maar `profile_research` faalde vier keer op `[429] You have no credits remaining` bij OpenAI.
Dat verklaart ook waarom `ai_calls` op 2 augustus stopt. Los van dit onderzoek, maar het staat elke
verificatie in de weg die geld kost.

---

## 1. Wat InSpace aantoonbaar doet

### Waar dit vandaan komt

De marketingsite belooft alleen dat Nova "je rankings, AI-zichtbaarheid en paginaprestaties in de
gaten houdt" en dat goedgekeurde pagina's "daarna worden ingediend voor indexering". Dat is te vaag
om iets op te baseren.

De echte bron is de Nova-app zelf. Twee ingelogde omgevingen staan publiek: `nova.inspace.io/login`
(de klantomgeving) en `app.inspace.io/sign-in` (de bureau-omgeving). Beide zijn Next.js en zetten
hun volledige i18n-berichtenbundel in de RSC-payload van de inlogpagina, dus vóór authenticatie. Dat
zijn 45 KB en 68 KB aan letterlijke interfaceteksten, inclusief de onboardingwizard, de foutmeldingen
en de lege staten. Daaruit is af te lezen wat de app doet, niet wat de folder belooft.

Wat hieronder staat is dus wat Nova zijn eigen gebruikers vertelt. De backend is niet gezien.

### Search Console: verplicht, geverifieerd, en het draagt het hele dashboard

De onboarding van Nova heeft een eigen stap `searchConsole`, met deze tekst:

> **Connect Google Search Console.** Connecting Search Console lets NOVA track how your pages perform
> and prove the results.
> **Add both addresses below to your Search Console property with the permission shown for each, then
> verify the connection.**
> Service account · Full permission · Restricted user · Verify access · Checking… · Connected
> *We couldn't find verified access yet. Add both addresses above (it can take a minute to apply),
> then verify again.*

Vier dingen staan hier zwart op wit:

1. **Geen OAuth.** Er is geen "Sign in with Google", geen consent-scherm, geen redirect. De klant
   krijgt twee e-mailadressen te zien en plakt die zelf in Search Console. Eén ervan is
   letterlijk gelabeld `Service account`.
2. **Twee adressen met twee rechtenniveaus**, `Full permission` en `Restricted user`. Volledig recht
   heb je nodig om sitemaps in te dienen, beperkt recht is genoeg om prestatiedata te lezen.
3. **De verificatie is echt.** "Verify access" bevraagt de API en meldt "Connection not found yet"
   als het niet lukt, met de waarschuwing dat Google een paar minuten nodig heeft om de
   rechtenwijziging door te voeren.
4. **Het is blokkerend.** In de bureau-omgeving staat `"Google Search Console access is required to
   continue."` en `"GSC access verification pending. Check connection on the Connections step"`.
   Zonder GSC gaat de onboarding niet naar launch.

En het draagt vervolgens het hele klantdashboard. De Analytics-pagina van Nova heet in de code
letterlijk `"How your posted pages perform in Google Search."` en bestaat uit: klikken en vertoningen
per URL, trend per pagina (up, down, stable, new), indexstatus, weektotalen binnen een planmaand,
maandtotalen over de looptijd, dezelfde periode een jaar eerder ernaast, best presterende en
slechtst presterende pagina, klikken uitgesplitst naar paginatype, en een mijlpaal `"Search click
growth since you started"`. De lege staat is `"Connect Google Search Console to see performance
data."`, de foutstaat `"We can't load Search Console data, access may not be granted for this site
yet."`

Kortom: bij Nova is Search Console geen extraatje. Het is de bewijslaag onder de belofte "gemeten,
niet beloofd". Zonder GSC heeft de app geen enkel eigen cijfer om te tonen.

### Google Analytics: optioneel, handmatig, en niet in het product

GA komt maar op één plek voor, en dat is veelzeggend. In de onboarding staat het onder
`optionalTools`, samen met Microsoft Clarity, in een blok dat `"Analytics access"` heet:

> `gaTitle`: Google Analytics · `clarityTitle`: Microsoft Clarity · `optional`
> **Grant us access to {tool} with the email address:** … *Done. I've granted access*
> `connectionsRequestedHint`: **We'll set these up once your CSM has the access emails in hand.**

Geen verificatieknop, geen API-koppeling, geen enkel GA-cijfer terug in de klantomgeving. De klant
zet het InSpace-team als gebruiker op zijn GA-property, vinkt aan dat hij dat gedaan heeft, en de
customer success manager kijkt er zelf in. Het is een dienstverleningsafspraak, geen integratie.

**Dat is de belangrijkste bevinding van dit hele onderzoek.** InSpace bouwt hun productdata op
Search Console en houdt Analytics erbuiten. De redenen daarvoor zijn niet mysterieus, ze staan in
§2, en ze gelden voor Aura even hard.

---

## 2. Wat er technisch bij komt kijken

### Twee koppelmodellen, en waarom InSpace de tweede koos

| | OAuth (klant logt in met Google) | Service account (klant geeft toegang) |
|---|---|---|
| Wat de klant doet | Eén knop, consent-scherm | Adres kopiëren, plakken in Search Console, rol kiezen |
| Wat wij bouwen | Consent-flow, token-opslag, refresh-logica, herstelpad bij intrekking | Één credential in een secret, verder niets |
| Google-verificatie | **Ja.** De `webmasters`-scopes zijn "sensitive", dus verplichte OAuth-verificatie met privacybeleid, demovideo en wachttijd van weken | **Nee.** Geen consent-scherm, dus geen verificatietraject |
| Breekt wanneer | De medewerker die inlogde vertrekt, wachtwoord wijzigt, of het token verloopt | De klant verwijdert de gebruiker |
| Wie moet handelen | Iemand met een Google-account dat toegang heeft | Een **geverifieerde eigenaar** van de property |

De verificatieplicht is de doorslaggevende factor. Een OAuth-app die de Search Console van klanten
leest, komt niet langs Google zonder een traject van weken met een gepubliceerd privacybeleid en een
opgenomen demo. Voor een product dat sales-led verkocht wordt aan een handvol MKB-klanten is dat
weken doorlooptijd voor nul extra waarde. Het service account heeft dat niet: het is gewoon een
gebruiker die de klant zelf toevoegt.

De prijs is één handmatige stap bij de klant. Die stap is precies waar §4 over gaat.

### Wat je met Search Console wél en niet kunt

Geverifieerd tegen de documentatie van Google op 6 augustus 2026:

**Wel:**

- **Search Analytics** (`searchanalytics.query`): klikken, vertoningen, CTR en gemiddelde positie, te
  groeperen op datum, pagina, zoekopdracht, land, apparaat en zoekweergave. Tot 25.000 rijen per
  aanroep, quotum 1.200 aanroepen per minuut per site. Op onze schaal, één aanroep per klant per
  dag, is dat quotum niet in zicht.
- **URL Inspection** (`urlInspection.index.inspect`): is deze URL geïndexeerd, wanneer voor het
  laatst gecrawld, wat is de canonieke versie. **2.000 aanroepen per dag per property**, dat is de
  enige limiet waar je bij groei tegenaan kunt lopen als je hem per pagina inzet.
- **Sitemaps indienen** (`sitemaps.submit`), vereist Volledig recht. Dit is vrijwel zeker wat
  InSpace bedoelt met "ingediend voor indexering".
- **Lezen mag met de rol Beperkt.** Google's rechtentabel bevestigt dat een `Restricted user` het
  volledige Performance-rapport ziet. Aura hoeft niets in te dienen, dus **beperkt recht is voor ons
  genoeg**, en dat is één adres in plaats van twee.

**Niet:**

- **De Indexing API is geen optie.** Google beperkt hem officieel tot `JobPosting` en
  `BroadcastEvent` in een `VideoObject`. Elk SEO-product dat hem voor gewone pagina's gebruikt,
  gebruikt hem tegen de voorwaarden in. Niet doen.
- **AI Overviews en AI Mode zijn niet apart uit te splitsen.** De API kent de types `web`,
  `discover`, `googleNews`, `news`, `image` en `video`. Klikken uit een AI-antwoord van Google zitten
  in `web`, zonder eigen dimensie. Search Console vertelt je dus **niet** hoeveel verkeer uit
  AI-antwoorden komt. Dat is precies het cijfer waarvan een klant zal aannemen dat het erin zit, dus
  het moet expliciet in de UI staan.
- **Data is vertraagd en wordt herzien.** Definitieve cijfers lopen ongeveer twee dagen achter, en
  Google corrigeert de dagen daarvoor nog na. `dataState: "final"` is de juiste stand; wie de dag van
  gisteren als bewijs gebruikt, meet ruis.

### Waarom Google Analytics een ander verhaal is

Technisch kan het: de GA4 Data API werkt met hetzelfde service-accountpatroon, het adres wordt Viewer
op de property. Vier redenen om het toch niet te doen, in volgorde van zwaarte:

1. **Het zijn persoonsgegevens.** Search Console levert geaggregeerde zoekcijfers zonder personen.
   GA4 gaat over bezoekers. Zodra Aura die data ophaalt en opslaat, is Aura verwerker en is er een
   verwerkersovereenkomst nodig, met alles eromheen. Voor GSC speelt dat niet.
2. **De data is niet te vertrouwen zonder de inrichting te kennen.** Consent mode, filters,
   datastreams, drempelwaarden bij kleine aantallen, en bij het MKB regelmatig een property die al
   twee jaar dubbel telt. Een getal uit GA van een klant die je niet zelf hebt ingericht, is een
   getal waar je geen uitspraak op mag bouwen. Dat botst frontaal met conventie 3.
3. **De enige echt interessante GEO-vraag is smal**: hoeveel bezoekers komen er van `chatgpt.com`,
   `perplexity.ai`, `gemini.google.com` en `copilot.microsoft.com`. Dat is één dimensie
   (`sessionSource`) en die zit vol met vals negatieven, want een deel van dat verkeer arriveert
   zonder referrer en telt als direct.
4. **InSpace doet het ook niet.** Zij hebben er meer klanten en meer jaren op zitten en houden GA
   bewust buiten het product.

Advies: **GSC nu, GA niet.** Wil je het AI-verwijzingsverkeer later toch, dan is de eerlijke route
niet GA maar een eigen meetpunt op de gepubliceerde pagina, en dat is een apart besluit.

---

## 3. Is het realistisch voor Aura, en wat betekent het voor de app

Ja, en opvallend goed passend. Het werk raakt geen enkele bestaande aanname.

### Waarom het past

- **Geen AI-aanroep.** Conventie 7, één zware AI-call per taak, wordt niet geraakt. De kosten van
  deze hele koppeling zijn nul, in een product waar $0,40 per meetronde een ontwerpvariabele is.
- **De wachtrij ligt er al.** Een dagelijkse synchronisatie is een gewoon jobtype dat zichzelf
  opnieuw inplant met `scheduled_for`. Geen nieuwe planner, en vooral: **geen derde Vercel-cron**,
  wat op het Hobby-plan niet eens kan (max 2 taken, elk hoogstens dagelijks). pg_cron draait de
  werker al elke minuut.
- **Conventie 8, alles bewaren**, is hier geen extra werk maar de standaardvorm: de ruwe API-respons
  naast de uitgesplitste kolommen.
- **Conventie 9, idempotentie**, valt samen met wat de API sowieso eist. Zie §5.
- **Schrijven via een API-route met service-role key** en select-only RLS: exact het bestaande
  patroon, er verandert niets aan de rechtenstrategie.

### Wat erbij komt

**Migratie `0045`**, additief, drie tabellen:

| Tabel | Wat erin staat |
|---|---|
| `search_console_connections` | Per profiel: het property-adres (`sc-domain:...` of URL-prefix), welk service account, status (`niet_gekoppeld`, `wacht_op_toegang`, `gekoppeld`, `toegang_ingetrokken`), `verified_at`, laatste foutmelding |
| `search_console_daily` | Per profiel per dag per URL: klikken, vertoningen, positie, CTR, plus `raw_json`. Unieke sleutel `(profile_id, date, page)` |
| `search_console_queries` | Per profiel per dag per zoekopdracht dezelfde cijfers. Apart, want dit is de duurste query bij Google en de meest waardevolle data voor ons, zie hieronder |

**Twee jobtypes:** `gsc_verify` (probeert één lichte API-aanroep, zet de status) en `gsc_sync` (haalt
een venster op, upsert, plant zichzelf morgen opnieuw in).

**Eén nieuw secret** in Vercel: de JSON-sleutel van het service account. Plus een Google
Cloud-project, eenmalig, vijf minuten.

### Waar de data waarde toevoegt, oplopend

**a. De publicatiecontrole afmaken.** `publish-check.ts` controleert nu of de pagina bereikbaar is en
of de tekst erop staat. Dat is niet hetzelfde als gevonden worden. Eén URL Inspection-aanroep zegt of
Google de pagina überhaupt geïndexeerd heeft. Het commentaar boven dat bestand beschrijft precies dit
gat al: "zonder controle wacht de klant daarna wekenlang op een effect dat nooit kan komen". Een
pagina die na 14 dagen niet geïndexeerd is, kan ook niet in een AI-antwoord opduiken, en dan is de
effectmeting van die golf verspilde meetkosten.

**b. De effectmeting een tweede, onafhankelijke as geven.** Dit is de sterkste toepassing.
`impact.ts` vergelijkt nu AI-zichtbaarheid vóór en ná publicatie, met een controlegroep van vragen
waarvoor niets gepubliceerd is, en velt een statistisch oordeel. Dat is goed gebouwd, maar het is
één bron die met zichzelf vergelijkt. Search Console levert daar een tweede as bij die uit een heel
ander systeem komt: vertoningen en klikken op de doel-URL, in dezelfde twee golven, met dezelfde
controlelogica.

Twee onafhankelijke bronnen die hetzelfde zeggen, is een verdedigbare uitspraak. Wijken ze af, dan is
dat óók informatie: geïndexeerd en vertoond maar niet geciteerd, betekent iets anders dan helemaal
niet gevonden. De golven op 14 en 28 dagen liggen bovendien ruim boven de vertraging van twee dagen,
dus de timing klopt zonder aanpassing.

**c. Echte zoekopdrachten als invoer voor promptgeneratie en topics.** Stap 7 van de pijplijn laat
een model 30 vragen bedenken, en stap 8 kalibreert het volume relatief, in drie banden, om te
voorkomen dat het model getallen verzint. Dat is een net vangnet rond een raadsel. Search Console
levert de echte zoekopdrachten waarmee mensen op deze site terechtkomen, mét vertoningen, en dat is
geen schatting maar een telling.

Dit is conventie 1 in zuivere vorm: een promptinstructie is een intentie, gemeten data is een
garantie. De 30 vragen blijven door het model geformuleerd, want een zoekopdracht is geen vraag aan
een assistent, maar de **onderwerpkeuze en de volumeband** kunnen op een teller rusten in plaats van
op een oordeel. Voor klanten zonder GSC-koppeling verandert er niets en blijft de huidige weg staan.

**d. De goedkoopste contentwinst zichtbaar maken.** Pagina's met veel vertoningen, weinig klikken en
een gemiddelde positie tussen 8 en 20 zijn de pagina's waar een herschrijving het snelst rendeert.
Dat is precies de invoer die `structure-gap.ts` nu mist: die kijkt naar welke onderdelen van het
aanbod géén eigen pagina hebben, maar niet naar welke bestaande pagina's ondermaats presteren.

### Waar de grens ligt

**Aura wordt hier geen SEO-dashboard van.** Dat is de valkuil, en hij is groot, want zodra de data
binnen is, is elke grafiek een halve dag werk en ziet elke grafiek er goed uit. Nova mág een
SEO-dashboard zijn, dat is hun product. Aura meet zichtbaarheid in AI-antwoorden, en Search Console
is daarvoor bewijsmateriaal en invoer, geen tweede product.

Praktische regel: elke GSC-weergave in de app moet naast een AI-cijfer staan waar hij iets over zegt.
Staat hij op zichzelf, dan hoort hij er niet.

---

## 4. De onboarding, waar dit echt lastig wordt

De code is twee dagen. Dit is het echte werk.

### Het uitgangspunt is ongunstiger dan bij InSpace

Aura is sales-led: de consultant maakt het profiel, de pijplijn draait 7,5 minuut, en de klant krijgt
het merk pas ná de verkoop toegewezen (`architecture.md` §11). **De klant vult vandaag helemaal
niets in.** Dat is een sterk punt van het product en de GSC-koppeling doorbreekt het: dit wordt de
eerste keer dat je iets van de klant vraagt dat hij zelf moet regelen, in een systeem van een derde
partij, waarbij hij eigenaar moet zijn van iets waarvan hij vaak niet weet dat het bestaat.

Nova heeft dat probleem minder, want Nova publiceert in het CMS van de klant en vraagt in dezelfde
wizard toch al om CMS-inloggegevens. Als je dán ook nog om Search Console vraagt, is het de tweede
vraag in plaats van de eerste.

### Drie scenario's, en ze komen alle drie voor

| Scenario | Wat het kost | Wat je doet |
|---|---|---|
| **De klant is zelf geverifieerd eigenaar** | 2 minuten, tijdens het gesprek | Adres kopiëren, plakken, rol Beperkt, klaar. Alleen een eigenaar mag gebruikers toevoegen, dus dit is de enige soepele route |
| **Een bureau of webbouwer beheert de property** | dagen tot weken | De klant moet zijn oud-bureau mailen. Dit is de meest voorkomende situatie in het MKB en de reden dat de stap nooit blokkerend mag zijn |
| **Er is geen property** | 15 minuten plus een dag wachten | Aanmaken en verifiëren via DNS-record of HTML-tag. **En dan is er nul historie.** Search Console begint pas te verzamelen vanaf het moment van verificatie, dus er is geen nulmeting en pas na weken een trend |

Dat laatste scenario verdient een aparte waarschuwing in de verkoop. "Koppel Search Console en je
ziet wat je pagina's doen" is bij een verse property gewoon niet waar, en dat merkt de klant pas na
een maand.

### Het ontwerp van de stap

Gemodelleerd naar Nova, maar simpeler, want Aura hoeft niets in te dienen:

1. **Eén adres, niet twee.** Alleen het service account, met de rol **Beperkt**. Volledig recht heeft
   Aura nergens voor nodig, en minder rechten vragen is minder weerstand.
2. **Kopieerknop naast het adres**, en het property-adres erbij afgeleid uit het webadres van het
   profiel, met een keuze tussen domein-property en URL-prefix. Dit is de plek waar het in de praktijk
   misgaat: de verkeerde property levert een geldige koppeling met nul rijen op.
3. **Knop "Controleer toegang"** die één echte API-aanroep doet, precies zoals Nova's "Verify access".
   Niet vertrouwen op het vinkje "ik heb toegang gegeven"; dat vinkje is bij Nova alleen goed genoeg
   voor het CMS en Analytics, dus voor de dingen die ze niet automatisch controleren.
4. **De tekst over vertraging overnemen.** Nova's `"It can take a few minutes for Google to process
   the change"` is geen detail maar het verschil tussen "het werkt niet" en "wacht even". Zonder die
   zin belt de klant.
5. **Niet blokkerend.** Nova maakt GSC verplicht omdat Nova zonder GSC geen enkel cijfer heeft. Aura
   meet AI-zichtbaarheid en die staat er volledig los van. Overslaan mag dus, met een zichtbare
   staat "nog niet gekoppeld" op de profielpagina en een herinnering in het dossier. Dit verlaagt de
   drempel in het verkoopgesprek aanzienlijk, en het is eerlijk: het product werkt zonder.
6. **Vraag hem in het demogesprek, niet per mail vooraf.** De consultant zit erbij, kan meekijken en
   ziet meteen welk van de drie scenario's het is. Een mail met instructies naar een MKB-eigenaar over
   Search Console-rechten is een mail die twee weken blijft liggen.

En één instructiepagina, want die heeft Nova ook (`"How to add a user in Search Console"`), en die is
in een half uur geschreven met vier schermafbeeldingen.

---

## 5. Stabiel gebruiken, de regels

De conventies van de app geven het meeste antwoord al. Wat hier specifiek geldt:

1. **De koppeling mag nooit een pijplijnstap laten falen.** GSC is verrijking, geen voorwaarde. Elke
   afnemer moet met `null` overweg kunnen. Dat is conventie 3, onbekend is beter dan verkeerd, en het
   is hier extra belangrijk omdat de meerderheid van de klanten in het begin geen koppeling zal
   hebben.
2. **Synchroniseer een venster, geen dag.** Google herziet cijfers een paar dagen na dato. Haal elke
   dag de laatste 5 dagen opnieuw op en **upsert** op `(profile_id, date, page)`. Insert-only levert
   dubbele rijen bij de eerste herziening en een grafiek die niet klopt.
3. **`dataState: "final"`.** Verse data is verleidelijk en onbruikbaar als bewijs.
4. **Bewaar de ruwe respons** (conventie 8). De API-vorm verandert, en je wilt kunnen herrekenen
   zonder opnieuw op te halen. Bij `search_console_queries` is dat bovendien de enige manier om later
   een andere groepering te kiezen zonder een jaar historie kwijt te zijn.
5. **Detecteer ingetrokken toegang expliciet.** Een klant die zijn oude bureau eruit gooit, verwijdert
   soms alle gebruikers. De API antwoordt dan met 403, niet met lege data. Zet de status op
   `toegang_ingetrokken`, toon het in de app, en laat de sync stoppen in plaats van hem elke dag
   opnieuw te laten falen. Dit is dezelfde les als de Vault-geheimen in `architecture.md` §9: stil
   falen is de duurste foutmodus die dit systeem kent.
6. **Nooit mengen in één score.** Verleidelijk: één "zichtbaarheidsscore" die AI-vermeldingen en
   zoekprestatie combineert. Niet doen. De twee assen meten verschillende dingen in verschillende
   kanalen met verschillende ruis, en een gemengd getal is niet te herleiden. Het hele product
   verkoopt herleidbaarheid.
7. **Zeg wat het niet meet.** Bij elke GSC-grafiek hoort dat AI Overviews en AI Mode hier niet apart
   in staan. Anders leest de klant "klikken uit Google" als "klikken uit AI", en dat is de ene
   misvatting die het product duurder maakt om uit te leggen dan het waard is.
8. **Sanitize alles.** Zoekopdrachten van Google gaan de database in als vrije tekst.
   `sanitizeForPostgres()` uit `lib/pg-text.ts` bestaat precies omdat één NUL-byte een hele
   batch-insert laat weigeren. Dezelfde val, andere bron.

---

## 6. Advies en volgorde

Bouwen, maar niet nu, en in drie fasen. **De volgorde hieronder is niet die van de waarde maar die
van wat op productie te verifiëren is**, en dat is na §0 een ander lijstje.

| Fase | Wat | Effort | Verifieerbaar wanneer |
|---|---|---|---|
| 1 | Migratie `0045`, service account, koppelscherm, `gsc_verify`, `gsc_sync`, zichtbare status | ~2 d | **Vandaag**, op een eigen geverifieerd domein. Vraagt geen klant |
| 2 | Echte zoekopdrachten als invoer voor topics, promptgeneratie en de rapportinvoer | ~2 d | Zodra één klant gekoppeld is. Vraagt geen gepubliceerde pagina |
| 3 | Indexcontrole in de publicatiecontrole, tweede as in de effectmeting | ~1 d | Pas na de eerste echt gepubliceerde pagina, plus 28 dagen |

Fase 3 is inhoudelijk de sterkste en staat daarom in §3 bovenaan, maar hij is nu onverifieerbaar:
er staan nul gepubliceerde pagina's op productie en de golven duren vier weken. Hem naar voren
halen levert code op die niemand kan nakijken, en dat is precies wat conventie 10 verbiedt.

Google Analytics: niet doen. Als een klant erom vraagt, is het antwoord hetzelfde als dat van
InSpace, toegang op de property zodat de consultant meekijkt in het gesprek, geen koppeling.

**Wanneer.** Dit staat achter roadmap-punten 0 en 1: de meetronde op GPT-5.6 is nog niet nagerekend
en R8 met S1 tot S8 is nog niet op productie geverifieerd. Daar komt na §0 een derde blokkade bij die
zwaarder weegt dan allebei: **er is nog nooit een pagina gepubliceerd.** Eenentwintig stuks staan op
`ready`. Die stap zetten is goedkoper dan dit hele traject, en zonder die stap is fase 3 hierboven
niet meer dan een aanname. En eerst moet er weer krediet op de OpenAI-rekening staan, anders komt er
sowieso geen enkele nieuwe ronde doorheen.

## 7. Verificatiecriteria

Af is dit pas als deze op productie staan, niet als de code er is. De kolom rechts zegt of het
criterium een klant nodig heeft; dat onderscheid volgt uit §0 en bepaalt wat je kunt afronden
voordat er iemand getekend heeft.

| # | Criterium | Klant nodig |
|---|---|---|
| 1 | Het service account is toegevoegd aan een property, "Controleer toegang" wordt groen, en de status overleeft een herlaadbeurt | Nee, eigen domein |
| 2 | De dagelijkse sync draait zeven dagen achter elkaar zonder handmatige actie, en een tweede sync van dezelfde dag verandert geen enkele rij (idempotent) | Nee |
| 3 | Een herziening door Google wordt zichtbaar overgenomen: de cijfers van drie dagen geleden wijken af van wat er gisteren stond, en er zijn geen dubbele rijen | Nee |
| 4 | Toegang intrekken zet de status binnen 24 uur op `toegang_ingetrokken`, zichtbaar in de app, en de sync stopt | Nee |
| 5 | Een profiel **zonder** koppeling doorloopt de volledige pijplijn, meting, rapport en content, zonder één afwijking ten opzichte van vandaag | Nee |
| 6 | De topics en de 30 vragen van één analyse zijn aantoonbaar beïnvloed door echte zoekopdrachten, en de uitkomst is beter dan de vorige ronde zonder | Ja, één |
| 7 | Bij één gepubliceerde pagina staan na 28 dagen beide assen naast elkaar, AI-zichtbaarheid en zoekprestatie, elk met eigen controlegroep en eigen oordeel | Ja, plus een **eerste publicatie**, die er nog nooit geweest is |
| 8 | De onboardingstap is bij drie klanten gedaan, met genoteerd welk van de drie scenario's uit §4 het was en hoe lang het duurde | Ja, drie |

## Bronnen

- De i18n-bundels van `nova.inspace.io/login` en `app.inspace.io/sign-in`, opgehaald 6 augustus 2026.
  Alle citaten in §1 komen daaruit, letterlijk
- `inspace.io/nl`, de zes processtappen en de app-mockup met "Gem. positie 14,6"
- Google Search Console API: quota en limieten, `searchanalytics.query`-referentie, de rechtentabel
  voor Eigenaar, Volledig en Beperkt, en de Indexing API-quickstart met de beperking tot `JobPosting`
  en `BroadcastEvent`
- De cijfers in §0 komen uit de productiedatabase (Supabase `kosauqzjbpweluiqgmwv`) en de
  deploymentlijst van het Vercel-project `geo`, allebei opgevraagd op 6 augustus 2026
