# Nova ontleed: productstrategie uit 2.447 interfaceteksten

**Opgesteld:** 6 augustus 2026 · **Bron:** de i18n-bundels van de twee live InSpace-apps, opgehaald
op 6 augustus 2026 · **Status:** analyse, geen bouwopdracht

## Hoe dit onderzoek is gedaan, en wat het wel en niet bewijst

InSpace draait twee ingelogde applicaties die allebei publiek bereikbaar zijn:

| Host | Wat het is | Berichtenbundel |
|---|---|---|
| `nova.inspace.io` | De NOVA-workspace, de nieuwe klantomgeving | 979 sleutels, 45 KB |
| `app.inspace.io` | De oudere omgeving, nog volledig in gebruik | 1.469 sleutels, 68 KB |

Allebei zijn Next.js met `next-intl`, en allebei zetten hun **volledige berichtenbundel in de
RSC-payload van de inlogpagina**, dus vóór authenticatie. Elke route erachter geeft een redirect
naar `/login`, maar de teksten van elk scherm, elke foutmelding, elke lege staat en elke dialoog
staan in die ene publieke payload. Dat is genoeg om de applicatie te reconstrueren zonder ooit in
te loggen.

De JS-bundels leverden niets extra's: het zijn React, Zod en Radix, met de routes en API-vormen aan
de serverkant. De CSS leverde wél iets, zie §7.

**Wat dit bewijst:** wat de app zijn gebruikers vertelt. Elke term hieronder tussen aanhalingstekens
is letterlijk.
**Wat dit niet bewijst:** hoe het van binnen werkt, wat er in de database staat, welke modellen ze
gebruiken en wat er op hun roadmap staat. Waar ik iets afleid, staat het er als afleiding.

**Eén observatie vooraf die alles kleurt:** dit zijn geen twee producten maar twee generaties. `app`
is de eerste (contentfabriek, gamification, chatassistent, kalender), `nova` is de herbouw
(strakker, minder functies, betere statustaal, een CSM-dashboard erbij). Nova heeft ongeveer
tweederde van de functies van `app` en is duidelijk beter. Wat ze in de herbouw hebben **laten
vallen** is minstens zo leerzaam als wat ze hebben gebouwd, zie §8.

---

## 1. Information Architecture

### 1.1 NOVA, de klantomgeving (nieuwe generatie)

| Niveau 1 | Niveau 2 | Wat er staat |
|---|---|---|
| **Overview** |, | Maandkiezer ("Month {n} of 12"), funnelvoortgang, zoekprestatiegrafiek, prestatietabel per URL, strategiemix, toppagina, totaal klikken |
|, | Funnel progress | Gepost tegen gepland per funnelfase, voor de gekozen planmaand of over de hele looptijd |
|, | Search performance | Weektotalen binnen een planmaand, maandtotalen over de looptijd, metriekkiezer, vorig jaar ernaast |
|, | Performance table | URL, klikken, vertoningen, trend, status |
| **Strategy** |, | Het contentplan per maand: beoordelen, goedkeuren, volgen |
|, | Maandsegmenten | "No month", "Awaiting your approval", "Being updated by your team", "Approved" |
|, | Tabel | URL, paginatype, taal (met taalgroepering en uitklap), datum, status, acties, handmatig herordenen |
|, | Detailpagina per URL | Details, schema, versiegeschiedenis, contentvoorbeeld met diff, kopieerknop, FAQ, afbeeldingsvergroting |
| **Analytics** |, | "How your posted pages perform in Google Search" |
|, | Kerncijfers | Prestatietrend, totaal klikken, best en slechtst presterende pagina |
|, | Verdeling | Content mix (paginatypen in de strategie), clicks by page type |
|, | Milestones | "Growing with NOVA since", "Search click growth since you started", "Pages published with NOVA" |
|, | Leaderboard | Beste pagina's op klikken deze periode |
|, | Posted pages | Volledige tabel met zoeken op URL, filter op type en taal, paginering |
| **Account** |, | Profiel, voorkeuren, inloggen en beveiliging |
|, | Preferences | Thema (System, Light, Dark), **weergavetaal** en **communicatietaal** apart, elk Engels, Nederlands of Duits |
| **Admin** (staf) | Overview | "CSM Overview: where we are falling behind on generating and posting client content" |
|, | Clients | Zeven segmenten van klantstatus, met de generatiedialoog |
| **Onboarding** | 12 stappen | Zie §4.1 |
| **404** |, | "Signal lost. Houston, we have a…" |

### 1.2 De oudere omgeving, wat daar extra in zit

| Sectie | Wat het toevoegt boven Nova |
|---|---|
| **Strategy** | **Kalenderweergave** naast de tabel, met slepen om te plannen, maximaal 5 items per dag, "Day is full" |
|, | Strategy Efficiency: "clicks on average per page", "traffic (top 3 pages)" |
|, | Actions Needed met een teller van benodigde goedkeuringen |
|, | **Manual posting queue**: "Copy the approved content, publish it in the CMS, then mark it as posted" |
| **Content** | **Content Assistant**, een chat per pagina met sessiegeschiedenis, goedkeuren of afwijzen sluit de sessie |
|, | **Draft editor** met eigen werkbalk, SEO-waarschuwingen, FAQ-blokken |
|, | **Positioning Map**, klikbare clusterkaart: "Click any node to explore related pages in this content cluster" |
|, | "Why This Page Exists?", search intent, cluster, sub-cluster, funnel level, secundaire keywords met volume |
|, | Search preview, een nagebouwd Google-resultaat |
| **Drafts** | Aparte wachtrij van concepten die op review wachten, met kolom "Source" |
| **Creation** | Bureau-scherm: voorgestelde strategie, plan goedkeuren, strategie purgen, nieuwe strategie starten met een notitie voor de agent |
| **Settings** | Publicatieschakelaars per klant: concept posten voor posts, pagina's en categorieën, afbeeldingen wel of niet meesturen |
| **Brand Profile** | Vijf stappen plus "Modify with AI", een chat die het merkprofiel aanpast, en bestandsupload (max 3, max 20 MB) |
| **Orbits** | Volledig gamificationsysteem, zie §7.4 |
| **Notifications** | Notificatiecentrum met productaankondigingen en een ingebouwde rondleiding |

---

## 2. Core Feature Matrix

| Categorie | Functionaliteit | Waar |
|---|---|---|
| **Onboarding** | Activatie via uitnodigingslink met eigen geldigheidsstaten (ongeldig, verlopen, al actief) | Nova |
|, | Bedrijfs- en factuurgegevens, voorgevuld uit HubSpot | Beide |
|, | VAT-nummer live gevalideerd tegen VIES | app |
|, | Websitebevestiging met schermafbeelding van de site | Beide |
|, | Automatische sitescan die merkvelden voorvult, met zichtbare leerlijst | Nova |
|, | SEPA-incasso via Stripe, met eigen statusmachine | Beide |
|, | Merkprofiel in 5 tot 6 stappen, met faders voor de tone of voice | Beide |
|, | Search Console koppelen en **verifiëren**, blokkerend | Beide |
|, | CMS koppelen met inloggegevens plus toegangsverklaring | Beide |
|, | Review-scherm met per rij "Completed", "Skipped" of "Needs attention" | Beide |
| **Strategie** | Jaarplan van 12 maanden, per maand een set pagina's | Beide |
|, | Funnelfasen, 3 tot 5, per klant instelbaar door de staf | Nova |
|, | Meertalig per domein, met taalgroepen in de tabel | Nova |
|, | Buffer-URL's die een verwijderde pagina opvullen | Nova |
|, | Goedkeuren per pagina, per maand, of alles tegelijk | Beide |
|, | "Decline & regenerate": afwijzen gooit het plan weg en genereert een nieuw | Nova |
|, | Handmatig herordenen met slepen, of plannen in een kalender | Nova, app |
| **Content** | Generatie ongeveer 10 dagen vóór de publicatiedatum | Nova |
|, | Versiebeheer met herkomst per versie (origineel, AI, handmatig, hersteld) | app |
|, | Diff-weergave tussen versies | Beide |
|, | Chatassistent per pagina om wijzigingen te vragen | app |
|, | Handmatige editor achter een expliciete risicowaarschuwing | app |
|, | Versie herstellen als **nieuwe** versie, oude blijven staan | app |
|, | FAQ-blokken als apart gestructureerd veld | app |
|, | Kopiëren als HTML of platte tekst voor handmatig plaatsen | Beide |
| **Publiceren** | Automatisch naar het CMS, of een handmatige wachtrij | Beide |
|, | "Mark as posted" met vastgezet domein en alleen een bewerkbaar pad, onomkeerbaar | Beide |
|, | Publicatieschakelaars per contenttype, concept of direct live | app |
| **Meten** | Search Console als enige databron voor alle cijfers | Beide |
|, | Klikken, vertoningen, CTR, gemiddelde positie, indexstatus | Beide |
|, | Vergelijking met vorig jaar en met de vorige periode | Beide |
|, | Trend per pagina, uitsplitsing naar paginatype en funnelfase | Beide |
|, | CSV-export | app |
| **Beheer (staf)** | CSM-overzicht op achterstand: posten, genereren, goedkeuring, storingen | Nova |
|, | Klantsegmenten met per segment een eigen lege staat en uitleg | Nova |
|, | Strategiegeneratie starten met invoercontrole vooraf | Nova |
|, | Klant handmatig vrijgeven, "skip the CSM hand-off" | app |
|, | Strategie purgen met expliciete opsomming van wat blijft | app |
| **Account** | Thema, weergavetaal en communicatietaal apart | Nova |
|, | E-mail wijzigen met bevestigingslink, wachtwoordregels zichtbaar tijdens typen | Nova |
| **Overig** | Notificatiecentrum met productaankondigingen en rondleiding | app |
|, | Orbits: punten, reeksen, opdrachten, prestaties, beloningswinkel | app |
|, | CSM in het product: WhatsApp, e-mail, "Contact your CSM" als statusuitkomst | app |

---

## 3. Datamodel en KPI's

### 3.1 De metrieken, allemaal uit Search Console

| Metriek | Weergave |
|---|---|
| Klikken | Hoofdgetal. "Total clicks this plan month", "Total clicks across the period" |
| Vertoningen | Altijd naast klikken, nooit alleen |
| CTR | "(CTR) Click through rate" |
| Gemiddelde positie | "Average position" |
| Indexstatus | "Index Status", "{n} indexed" |
| Trend per pagina | Up · Down · Stable · **New** |
| Status per pagina | Live · Issues |
| Verkeersgroei | "Compared to previous period", "vs last year" |
| Strategie-efficiëntie | Klikken per pagina gemiddeld, verkeer van de top 3 |
| Mijlpalen | Groeiend sinds datum, klikgroei sinds start, aantal gepubliceerde pagina's |

**Vergelijkingsperioden:** laatste 7 dagen, 30 dagen, 3 maanden, en steeds "vorig jaar" als tweede
lijn in dezelfde grafiek.

### 3.2 De statusmachines

Dit is het rijkste deel van de bundel, en het meest leerzame.

**Onboarding (staf ziet dit):** `waiting_for_client_onboarding` · `ready_to_onboard` ·
`subscription_scheduled` · `onboarding_sent` · `draft` · `submitted` · `completed` · `failed` ·
`expired` · `canceled`

**Strategiegeneratie:** `notGenerated` · `queued` · `generating` · `generated` · `failed` ·
`inReview` ("In client review") · `approved`

**Een pagina in de strategie, technisch:** `planned` · `draft` · `inProgress` · `needsReview` ·
`pendingReview` · `scheduled` · `approved` · `declined` · `posted` · `manualPosting` · `canceled` ·
`failed`

**Diezelfde pagina, in mensentaal.** Dit is een **tweede, aparte vertaling** van dezelfde toestand,
en het is de slimste vondst in de hele bundel:

> Planned → Written → **Needs your review** → Scheduled to publish → Approved → **Waiting in your
> CMS** → Ready to publish → Published
> Bij problemen: Writing failed · Publishing failed · **Contact your CSM**

Met een datumzin ernaast die hetzelfde nog eens zegt in tijd: "Writing {date}", "Publishing
{date}", "Published {date}", "Publishes once approved", **"Waiting for you"**, "Waiting to be
published".

**Incasso:** `not_started` · `requires_action` · `processing` · `succeeded` · `failed` · `canceled`

**Herkomst van een contentversie:** `original` · `aiChanges` · `manualEdit` · `restored` ·
`unknown`. Met een badge erbij: "Generated by NOVA", "Content Assistant", "Manually edited",
"Client".

### 3.3 De datavelden van het merkprofiel

Wat InSpace aan de klant vraagt, in de volgorde waarin ze het vragen:

| Blok | Velden |
|---|---|
| Positionering | Core category · Mission · Value pillars · Positioning · Proof points · Identity keywords |
| Doelgroep | Primary audience · Secondary audience · Competitors (max 3) · Us vs. Them · Knowledge level (basic, professional, expert) · Geographic identity |
| Stem | Personality, plus vijf faders: Formality (3 standen) · Energy (3) · Complexity (3) · Humor (3) · Emotional range (4) |
| Woorden | **Signature phrases** · **Taboo phrases** · Pronoun preference · Identity keywords · Laws and regulations |
| Auteur | Naam · rol · foto · bio · LinkedIn · Facebook · overige socials · wel of geen auteurspagina |
| Onderwerpen | USP · Key messages · Proof points · Competitors · Industry (16 vaste opties plus "Other") |
| Compliance | Laws and regulations · Additional compliance notes |

Plus, in de oudere omgeving, een door AI opgebouwd profiel met **"Confidence Score"**, secties voor
Company snapshot, Market & geography, Brand image, Brand promise, Narrative, **Brand safety**, SEO
alignment, Public information, Competitive positioning en **Sources**.

---

## 4. Gebruikersflows

### 4.1 Onboarding, van uitnodiging tot eerste contentplan

```
Uitnodigingsmail
   ↓
Activatie   "SECURED INVITATION", e-mail al geverifieerd, wachtwoord aanmaken
   ↓        Wachtwoordregels vinken zich aan tijdens het typen
FASE 1, ACCOUNT SETUP
   ├─ Company     bedrijfs-, factuur- en contactgegevens, voorgevuld uit HubSpot
   ├─ Website     "Is this your website?" met schermafbeelding, daarna een scan
   │              die de merkvelden voorvult, met leerlijst en negen wisselende
   │              laadteksten
   └─ Payment     SEPA-incasso via Stripe, mag overgeslagen worden
   ↓
"Your account is active"  →  overzicht van wat er in fase 2 komt
   ↓
FASE 2, BRAND SETUP
   ├─ Positioning ├─ Audience ├─ Voice (faders) ├─ Words & language
   ├─ Author      └─ Topics
   │   elk veld draagt de badge "Drafted from your website" als de scan hem vulde
   ↓
CONNECTIES
   ├─ Search Console   twee adressen toevoegen, daarna "Verify access". BLOKKEREND
   └─ CMS              platform, inloglink, gebruiker met volledige rechten
   ↓
Review & launch   per rij: Completed / Skipped / Needs attention
   ↓              "Launching starts your subscription and generates your first content plan"
Launch  →  CSM neemt binnen 48 tot 72 uur contact op
```

Doorlooptijd die ze zelf noemen: **"about 20 minutes"**, met "Progress saves automatically, so you
can pause anytime" en per stap "~{minutes} min remaining".

### 4.2 Van strategie naar gepubliceerde pagina

```
Staf vult funnels (3 tot 5), talen en strategiedetails in
   ↓  ("Brand-new site?", "Multilingual domain?", "Respect the current site structure")
Staf klikt Generate  →  queued → generating → generated
   ↓
Klant ziet de maand in "Awaiting your approval"
   ↓
Klant beoordeelt en kiest:
   ├─ Approve         → pagina's worden ingepland
   └─ Decline & regenerate  → plan weg, nieuw plan
   ↓
±10 dagen vóór de publicatiedatum schrijft NOVA de content
   ↓
Status wordt "Needs your review"
   ↓
Klant beoordeelt de tekst en kiest:
   ├─ Approve                → "Waiting in your CMS" → Published
   ├─ Request changes        → Content Assistant, chat per pagina
   └─ Manual edit            → achter een risicowaarschuwing
   ↓
Automatisch publiceren, of de manual posting queue:
   "Copy the approved content, publish it in the CMS, then mark it as posted"
   ↓
Mark as posted   domein vast, alleen het pad bewerkbaar, ONOMKEERBAAR
   ↓
Search Console levert klikken en vertoningen, en de pagina verschijnt in Analytics
```

### 4.3 Hoe de klant zijn cijfers leest

De volgorde op het Overview-scherm is een verhaal, geen dashboard:

1. **Waar sta ik in het contract?** "Month {n} of 12"
2. **Loopt het plan?** Funnelvoortgang, gepost tegen gepland per fase
3. **Werkt het?** Zoekprestatiegrafiek, met vorig jaar als tweede lijn
4. **Welke pagina's precies?** Tabel per URL met trend en status
5. **Wat kan ik nu doen?** Openstaande goedkeuringen als banner bovenaan

En vier verschillende lege staten, afhankelijk van de oorzaak, elk met een andere oplossing:

| Situatie | Wat de klant leest |
|---|---|
| Geen GSC | "Connect Google Search Console to see performance data." |
| Nog niets gepubliceerd | "Publish your first page to start tracking performance." |
| Wel gepubliceerd, nog geen data | "Collecting performance data… approximately {n} days remaining." |
| GSC-fout | "Check that this site's Google Search Console access has been granted." |

### 4.4 De CSM als gebruiker

Het admin-overzicht van Nova meet **het bureau tegen zijn eigen belofte**, niet de klant:

> "CSM Overview: where we are falling behind on generating and posting client content."
> KPI's: Behind on posting · Behind on generation · Awaiting approval · Pipeline failures
> Tabel: klant, planmaand, quotum per maand, gegenereerd, gepost, laatste post, vlaggen
> Filter: "Alerts only"
> Lege staat: "All caught up. No clients are behind or blocked right now."

En de foutmelding erbij is het beste zinnetje uit de hele bundel:

> "We hit an error loading client pace data. **The numbers aren't shown rather than risk showing
> incomplete ones**, try again."

---

## 5. Wat Nova's concurrentievoordelen zijn

| # | USP | Waarom het werkt |
|---|---|---|
| 1 | **Eén meetbron, geen dashboardsalade** | Alles komt uit Search Console. Geen GA, geen rank tracker, geen derde bron die het niet eens is met de tweede. Eén waarheid is uitlegbaar |
| 2 | **De keten is compleet** | Strategie, schrijven, publiceren en meten in één product. Elk los stuk bestaat tien keer; de keten niet |
| 3 | **Twaalf maanden vooruit gepland** | Een jaarplan met maandquota maakt het abonnement concreet en de voortgang meetbaar tegen een belofte |
| 4 | **De klant keurt goed, het systeem doet de rest** | De enige handelingen die de klant heeft zijn goedkeuren en soms een URL bevestigen |
| 5 | **Statustaal in mensentaal** | "Waiting in your CMS", "Waiting for you". De klant weet altijd of de bal bij hem ligt |
| 6 | **De CSM zit in het product** | WhatsApp, e-mail, "Contact your CSM" als uitkomst van een foutstatus. Software plus dienst, en de software geeft toe wanneer de dienst het overneemt |
| 7 | **Publiceren zonder dev-ticket** | Negen CMS'en, en waar het niet automatisch kan een handmatige wachtrij met kopieerknoppen |
| 8 | **Het bureau meet zichzelf** | Het CSM-dashboard telt achterstand op de eigen belofte. Dat is waarom de belofte houdbaar is |

**De kern eronder:** Nova verkoopt geen software maar een **afgesproken output per maand**, met een
app die laat zien of die output er is en of hij werkt. De prijspagina zegt "10 pages", "20 pages",
"40 pages", en het hele product is gebouwd om dat getal waar te maken en aantoonbaar te maken.

---

## 6. Wat hiervan in Aura hoort, en wat niet

**De grens vooraf.** Aura en Nova zijn verschillende producten. Nova is een contentfabriek die zich
verantwoordt met zoekcijfers; Aura meet zichtbaarheid in AI-antwoorden en schrijft daar content bij.
Nova's IA overnemen zou Aura in een markt duwen waar tien partijen zitten die er tien jaar langer
zijn. **Overnemen wat werkt, niet wat het is.**

### 6.1 De sterke kandidaten

| # | Wat | Effort | Impact voor de klant | Oordeel |
|---|---|---|---|---|
| 1 | **Statustaal in twee lagen.** Naast `analyses.status` en `content_pieces.status` een afgeleide, leesbare staat: "Wacht op jou", "Aura schrijft", "Klaar om te publiceren", "Gepubliceerd, meting loopt" | **0,5 d**, pure functie plus een chip | **Hoog.** De app heeft vier hoofdstukken en een pijplijn van 20 stappen. De klant weet nu nergens of de bal bij hem ligt | **Doen, als eerste.** Goedkoopste punt op deze lijst met de grootste opbrengst |
| 2 | **Lege staten die de oorzaak noemen.** Nu is een leeg scherm één toestand. Nova heeft er vier, elk met de bijbehorende oplossing en een schatting hoe lang het nog duurt | **1 d** | **Hoog.** Precies de plek waar een klant nu belt | **Doen.** Past bij "onbekend is beter dan een verkeerde waarde" |
| 3 | **Herkomst per contentversie.** `content_pieces` heeft al `version`, `is_current` en `supersedes_id`. Wat mist is wáárom een versie bestaat: door Aura geschreven, door de kritiekronde herschreven, door de klant bewerkt | **1 d**, één kolom plus een badge | **Middel tot hoog.** Maakt de versiegeschiedenis leesbaar in plaats van een lijst nummers | **Doen** |
| 4 | **Bulkacties met deelrapportage.** "Goedgekeurd: 7 van 9. Open de twee mislukte los om ze opnieuw te proberen" | **0,5 d** | **Middel.** Wordt pas belangrijk bij meerdere pagina's per ronde | Doen zodra er echt volume is |
| 5 | **Publiceren is onomkeerbaar, en dat staat er twee keer.** Aura vraagt nu één URL in een formulier. Nova zet het domein vast, laat alleen het pad bewerken en waarschuwt expliciet | **0,5 d** | **Middel.** Voorkomt een fout die pas na 28 dagen zichtbaar wordt, als de impactgolven op niets uitkomen | **Doen** |
| 6 | **Voortgang met een tijdsindicatie.** De onboarding van Aura duurt 7,5 minuut en toont tussenresultaten. Nova zet er "~{n} min remaining" bij, plus "Progress saves automatically" | **0,5 d** | **Middel.** Het verschil tussen wachten en wachten met een horizon | Doen |
| 7 | **Faders voor de tone of voice.** Aura heeft één vrij tekstveld. Nova heeft vijf schuiven met benoemde standen plus een vrij veld. Een schuif levert een waarde op waar een prompt écht mee kan sturen | **1,5 d**, inclusief promptdoorwerking | **Middel.** Betere sturing van de duurste stap in het product | Doen, in dezelfde ronde als de volgende |
| 8 | **Verboden woorden als eigen veld.** Nova heeft "Taboo phrases" naast "Signature phrases". Aura heeft geen enkele plek waar een klant zegt wat hij níet wil lezen | **0,5 d** | **Hoog per geval.** Eén verkeerde claim in gepubliceerde tekst kost meer dan deze functie kost | **Doen.** En koppel hem aan de bestaande claimvalidator |
| 9 | **De auteur moet een echt vindbaar mens zijn.** Nova vraagt naam, rol, foto, bio en LinkedIn, en bouwt er een auteurspagina van | **2 d** met auteurspagina, **0,5 d** zonder | **Middel tot hoog.** Dit is E-E-A-T operationeel gemaakt, en het is precies wat een AI-assistent gebruikt om te bepalen of een bron betrouwbaar is | Doen zonder de auteurspagina; die hoort bij het CMS en dat doen we bewust niet |
| 10 | **Een compliance-stap.** "Laws and regulations" plus vrije aantekeningen, meegegeven aan elke schrijfopdracht | **0,5 d** | **Hoog in gereguleerde branches**, en dat is precies het MKB-segment: zorg, financieel, juridisch | Doen |
| 11 | **Een consultantsdashboard dat de eigen belofte meet.** Nova's CSM-overzicht telt achterstand. Aura heeft een beheerdersrol maar geen scherm dat zegt welke klant stilstaat | **2 d** | **Nul voor de klant, hoog voor de eigenaar.** Bij het huidige aantal klanten overbodig; bij tien onmisbaar | Later, en dan meteen goed |

### 6.2 Wat niet

| Wat | Waarom niet |
|---|---|
| **Automatisch publiceren naar het CMS** | Al bewust afgewezen, staat in `schrijfstijl.md`. Nova's negen CMS-koppelingen zijn hun grootste onderhoudspost |
| **Kalenderweergave met slepen** | Nova heeft hem in de oude app en **niet** in de nieuwe. Ze hebben hem laten vallen bij de herbouw. Dat is een gratis les |
| **Orbits, de gamification** | Zie §7.4: knap gemaakt, en het hoort niet bij een product dat "gemeten, niet beloofd" verkoopt. Een consultancyklant die punten spaart, is een klant die zich niet serieus genomen voelt |
| **Een chatassistent per pagina** | Aura's kwaliteitspoorten zijn deterministisch en herleidbaar. Een chat die de tekst aanpast, omzeilt ze allemaal en maakt de claimvalidator zinloos |
| **Twaalfmaandsplan met quota** | Past bij een abonnement dat pagina's per maand verkoopt. Aura verkoopt een meting en advies; een quotum van 20 pagina's is een belofte die het product niet doet |

---

## 7. De kleine slimme dingen

Dit is het deel dat het snelst rendeert. Alles hieronder is letterlijk uit hun bundel.

### 7.1 Vormgeving en design system

| # | Wat | Waarom het slim is |
|---|---|---|
| 1 | **Tokens heten naar betekenis, niet naar kleur.** `--ds-background-intelligence` (paars), `growth` (groen), `information` (blauw), `warning` (oranje), `attention` (roze), `danger` (rood), `premium` (brons), `neutral` | Je kunt de kleur later wijzigen zonder één component aan te raken. "Groen" in de code is een schuld, "growth" niet |
| 2 | **Elke intentie heeft vier varianten:** de kleur zelf, `-subtle`, `-hover` en `-subtle-hover`, in licht én donker | Elke staat is vooraf bedacht, dus niemand verzint ter plekke een tint |
| 3 | **`--ds-foreground-on-{intent}`** legt vast welke tekstkleur op elk vlak mag | Contrast is een tokenkeuze geworden in plaats van een beoordeling per component |
| 4 | **Grafiekkleuren wijzen naar dezelfde tokens.** `--chart-1: var(--ds-background-intelligence)` tot en met `--chart-6` | Een groeireeks is overal in de app dezelfde groene tint. Grafieken zwerven niet weg van de rest |
| 5 | **Ook de grafiekas, het raster en de cursor zijn tokens** (`--chart-axis`, `--chart-grid`, `--chart-cursor`) | Het deel dat iedereen vergeet, waardoor grafieken er in donkere modus altijd net verkeerd uitzien |
| 6 | **Radii als schaal:** `none` · `2xs` .125rem · `xm` .25rem · `sm` .375rem · `md` .5rem · `lg` .75rem · `xl` 1rem · `2xl` 1.5rem · `full` | Negen standen, geen losse waarden. Aura heeft dit deels al |
| 7 | **Randdiktes als token:** `none` · `xs` 1px · `sm` 2px · `md` 4px | Voorkomt de 1px-tegen-2px-inconsistentie die je pas op een groot scherm ziet |
| 8 | **Eén schaduw, niet zeven.** Er is precies één `--ds-elevation-shadow-lg` | Een bewuste beperking. Meer schaduwstanden maken een interface niet dieper, alleen rommeliger |
| 9 | **Geist Sans en Geist Mono**, precies wat Aura al gebruikt | Bevestiging dat onze typografiekeuze klopt |

### 7.2 Interactie en microcopy

| # | Wat | Letterlijk |
|---|---|---|
| 10 | Onomkeerbare acties zeggen het twee keer, in de knop en in een apart blok | "This can't be undone. Marking a page as posted is permanent" |
| 11 | Een risicovolle handeling krijgt een uitweg als eerste knop | "Keep using Content Assistant" naast "Continue at my own risk" |
| 12 | Versie herstellen maakt een **nieuwe** versie | "This creates a new version copied from the version you're viewing. Older versions are kept" |
| 13 | Diff met kleur, en de legenda erbij | "Red = old value, green = new value" |
| 14 | Een deelmislukking wordt geteld, niet verzwegen | "Approved {ok} of {total} drafts. Open the failed items individually to retry" |
| 15 | Wachten heeft een horizon | "Collecting performance data… approximately {n} days remaining" |
| 16 | Een lopende maand is gemarkeerd | "(partial month)", "Month in progress" |
| 17 | Vertraging bij een externe partij wordt uitgelegd | "It can take a few minutes for Google to process the change. You can continue with the other steps" |
| 18 | Een fout zegt wat je eraan doet, niet wat er stuk is | "Check that this site's Google Search Console access has been granted" |
| 19 | Liever geen getal dan een verkeerd getal | "The numbers aren't shown rather than risk showing incomplete ones" |
| 20 | Overslaan mag, en het blijft zichtbaar | "Skipped, you can add this after launch" naast "Needs attention" |
| 21 | Een wijziging met een verborgen gevolg wordt vooraf uitgelegd | "Heads up: this also updates your login email" |
| 22 | Een tegenstrijdigheid in de gegevens blokkeert en verwijst door | "The address country doesn't match your sales region. Please contact your sales contact person" |
| 23 | Wachtwoordregels vinken zich aan tijdens het typen | "At least 8 characters" · "Contains a number" · "One uppercase letter" |
| 24 | Voorgevulde velden zeggen waar ze vandaan komen | "Prefilled from our records", "Drafted from your website" |

### 7.3 Wachttijd als product

| # | Wat |
|---|---|
| 25 | **Negen wisselende laadteksten** tijdens de sitescan, met het ruimtethema alleen dáár: "Locking onto your coordinates…", "Scanning the homepage nebula…", "Almost through the wormhole…" |
| 26 | **"NOVA is learning"** met een lijst van wat er geleerd wordt: Homepage, Products & services, Target audience, Tone of voice, Content topics. Voortgang als inhoud, niet als balk |
| 27 | Een **schermafbeelding van de site** bij "Is this your website?", zodat de klant het juiste domein bevestigt in plaats van een tekstveld te lezen |
| 28 | **Live preview van de auteurspagina** die meeverandert tijdens het typen |
| 29 | Een expliciete **tijdsbelofte vooraf**: "Usually takes about 20 minutes. Progress saves automatically, so you can pause anytime" |
| 30 | Een **fase-afsluiting die viert en vooruitkijkt**: "PHASE 1 COMPLETE. You're officially on board", met drie cijfers en "let's make NOVA write like you. Four quick questions" |

### 7.4 Orbits, het gamificationsysteem

Compleet, en ik noem het omdat de uitvoering leerzaam is, niet omdat we het moeten bouwen. Er zitten
**verstopte bolletjes** in de interface die je aanklikt voor punten. Er is een dagreeks met
bonussen, er zijn dagelijkse opdrachten ("Visit the Analytics page", "Visit 3 different pages"), een
weekuitdaging, en twintig prestaties met eigen toastteksten ("30 days! That's not a streak, that's
a lifestyle"). De punten koop je in een winkel: AI-credits, extra pagina's voor 30 dagen,
accentkleuren voor het dashboard, en gloeiringen om je profielfoto.

**Waarom het er staat, denk ik:** het beloont *inloggen*, en bij een product waar het systeem al het
werk doet is de klant die niet inlogt de klant die opzegt.

**Waarom Aura het niet moet doen:** het is een tegenmiddel tegen een probleem dat Aura anders
oplost. Aura's klant logt in omdat er een meting klaar is en er een beslissing van hem gevraagd
wordt. Dat is een betere reden dan een bolletje. En het staat haaks op "gemeten, niet beloofd".

**Wat er wél uit te halen valt:** de gedachte dat de app een reden moet hebben om terug te komen.
Bij Aura is dat de maandelijkse meetronde. Die verdient een moment, niet een rij in een tabel.

### 7.5 Losse vondsten

| # | Wat |
|---|---|
| 31 | **Buffer-URL's.** Verwijdert de klant een geplande pagina, dan schuift er een reservepagina van die maand in. "+{count} buffer" staat in de interface |
| 32 | **Content wordt ~10 dagen vóór publicatie geschreven**, en de app zegt dat: "This page's content will be generated around {date}, about 10 days before its scheduled post date" |
| 33 | **Twee talen apart:** weergavetaal en communicatietaal. De app kan Engels zijn terwijl de mails Nederlands zijn |
| 34 | **Taalgroepering in tabellen:** één rij per URL met "+2 locales" die uitklapt |
| 35 | **Kopiëren in twee formaten**, HTML en platte tekst, met de zin "Choose the format that matches the CMS workflow" |
| 36 | **Search preview**, een nagebouwd Google-resultaat in de editor |
| 37 | **Editorwaarschuwingen die uitleggen waarom:** "Meta description is empty. Affects click-through rates" |
| 38 | **FAQ als apart veld**, met per versie "Added in this version" en "Removed in this version" |
| 39 | **Sitewide-terugval:** zolang de nieuwe pagina's nog niet ranken, toont de app het verkeer van de hele site met een uitleg erbij |
| 40 | **Notificatie als productaankondiging**, met een ingebouwde rondleiding van "Step {n} of {m}" |
| 41 | **Purge met opsomming van wat blíjft:** "Posted and approved content is kept" |
| 42 | **Een notitie aan de agent** bij het opnieuw genereren: "The note below is shared with the agent as context" |
| 43 | **Verwachtingsmanagement bij de AI:** "Our AI is analyzing your inputs. This usually takes about 15 minutes", met vijf benoemde stappen |
| 44 | **De klant kan de strategie afwijzen**, en de app zegt wat dat kost: "Declining discards this strategy and generates a new one" |

---

## 8. Wat ze in de herbouw hebben laten vallen

Dit is de goedkoopste les in dit document, want zij hebben ervoor betaald.

| Uit de oude app | Niet in Nova | Wat dat waarschijnlijk betekent |
|---|---|---|
| Kalender met slepen | Weg | Mooi in een demo, weinig gebruikt. Een tabel met maandsegmenten doet hetzelfde |
| Content Assistant, chat per pagina | Weg | Duur, moeilijk te sturen, en het maakt de kwaliteitscontrole onbetrouwbaar |
| Orbits | Weg | Onderhoud tegenover een onbewezen effect |
| Positioning Map, clustervisualisatie | Weg | Indrukwekkend, en zelden de basis voor een beslissing |
| Handmatige editor | Weg | Elke handmatige bewerking ondermijnt de garanties van het systeem |
| Notificatiecentrum | Weg | Een banner bovenaan de pagina doet hetzelfde met minder |

**Het patroon:** alles wat weg is, gaf de klant meer knoppen. Wat is gebleven, geeft hem meer
duidelijkheid. Nova heeft de tweede generatie **kleiner** gemaakt, niet groter.

Voor Aura is dat de belangrijkste conclusie van dit hele onderzoek. De verleiding bij een document
als dit is een lijst van veertig functies. De les uit hun eigen herbouw is dat er hooguit tien van
overleven, en dat het altijd de tien zijn die iets uitleggen in plaats van iets toevoegen.

---

## 9. Voorstel: wat ik zou doen

Eén ronde van **ongeveer vier dagen**, uitsluitend uit §6.1, en niets uit §6.2:

| Volgorde | Wat | Effort |
|---|---|---|
| 1 | Statustaal in twee lagen, met een chip in elk hoofdstuk | 0,5 d |
| 2 | Lege staten die de oorzaak noemen, op de vier plekken waar ze nu leeg zijn | 1 d |
| 3 | Verboden woorden plus compliance-aantekeningen, doorgegeven aan de schrijfprompt en aan de claimvalidator | 1 d |
| 4 | Faders voor de tone of voice, met doorwerking in de prompt | 1 d |
| 5 | Publiceren onomkeerbaar maken en dat zeggen, domein vast, pad bewerkbaar | 0,5 d |

De rest van §6.1, herkomst per versie, bulkrapportage, auteursvelden en het consultantsdashboard,
wordt pas waardevol bij meer klanten en meer gepubliceerde pagina's. Nu zou het functies zijn zonder
gevallen om ze op te verifiëren, en dat is conventie 10.

---

## Bronnen

- `nova.inspace.io/login` en `app.inspace.io/sign-in`, i18n-bundels uit de RSC-payload, opgehaald op
  6 augustus 2026. 979 en 1.469 sleutels, alle citaten letterlijk
- De CSS-bundels van beide apps, `--ds-*` designtokens
- `inspace.io/nl`, de zes processtappen en de prijspagina met 10, 20 en 40 pagina's
- Aanvullend op `docs/tasks/zoekdata-koppeling.md`, dat de Search Console-koppeling uit dezelfde
  bundels in detail behandelt
