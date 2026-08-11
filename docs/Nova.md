# Nova, gereconstrueerd en toegepast op Aura

**Peildatum: 10 augustus 2026.** Dit document doet drie dingen. Het reconstrueert de applicatie
NOVA van InSpace uit haar eigen berichtenbestand, het legt Aura daarnaast en benoemt feitelijk wat
er ontbreekt, en het geeft een bouwplan in fases om dat gat te dichten.

> **Waar dit document staat.** De werkinstructie zegt dat werk dat nog gebouwd moet worden in
> `docs/tasks/` hoort. Dit bestand staat bewust een niveau hoger: het is geen taak maar de
> architectuurbeslissing waar de taken uit volgen, vergelijkbaar met `architecture.md`. Elke fase
> hieronder krijgt bij aanvang een eigen bestand in `docs/tasks/`; dit blijft de bron.

---

> ## ⚠️ Twee vondsten van 10 augustus die alles kleuren, lees deze eerst
>
> **1. InSpace brengt zelf een product uit dat "Aura" heet.** Op `inspace.io` staat in het
> productmenu: *"Nova"* (live) en *"Aura, Binnenkort beschikbaar"*, met als omschrijving
> **"Een nieuwe manier om te groeien voorbij zoekmachines"** en een knop "Pre-registreer". Dat is
> dezelfde naam en dezelfde categorie als deze app. Zie §12.1, daar staat wat de opties zijn. Dit is
> een besluit dat jij moet nemen, en liever nu dan na de eerste betalende klant.
>
> **2. Nova meet helemaal geen AI-zichtbaarheid.** In geen van beide InSpace-apps komt één sleutel
> voor over citaties, ChatGPT, LLM's of vermeldingen: nul treffers op `citation`, `chatgpt`,
> `perplexity`, `llm` en `mention` over 2.447 interfaceteksten. De enige treffers op "geo" gaan over
> *geografische identiteit*, niet over Generative Engine Optimization. De "AI-citaties 312" en
> "Organische + AI-zichtbaarheid" op hun website horen bij het product dat nog moet komen.
>
> **Wat dat samen betekent**: Aura levert vandaag wat InSpace pas belooft. Het gat zit niet in de
> meetkant, daar loopt Aura vóór, maar in alles eromheen: het programma, het plan, het portaal. Dat
> is precies wat het bouwplan hieronder doet. De klok tikt wel.

---

> **Dit document staat niet alleen.** Op 6 augustus 2026 is er al een analyse gedaan van bèide
> InSpace-apps: [`docs/tasks/nova-analyse.md`](./tasks/nova-analyse.md), 2.447 interfaceteksten uit
> `nova.inspace.io` én uit de oudere `app.inspace.io`. Dat blijft **de diepe inventaris**: de
> volledige functiematrix, de statusmachines, de gebruikersflows en de kleine vondsten staan daar en
> worden hier niet herhaald. Wat hier nieuw is: de vier besluiten, de gap-analyse tegen de app zoals
> die er nu staat, en een bouwplan in fases. Voor de Search Console-koppeling geldt hetzelfde:
> [`docs/tasks/zoekdata-koppeling.md`](./tasks/zoekdata-koppeling.md) heeft die al uitgezocht tot op
> het niveau van de implementatiekeuze, en fase 5 hieronder verwijst ernaar in plaats van hem over
> te doen.

---

## 0. De bron, en hoe hard hij is

Nova gebruikt `next-intl`. Dat zet de volledige berichtencatalogus in de RSC-payload van de
inlogpagina, ook de teksten van schermen waar je alleen ná inloggen komt. Uitgepakt naar
**`docs/nova-i18n.json`**: tien namespaces, ongeveer 900 sleutels, 45 kB.

Wat daaruit **hard** is: elk scherm, elke knop, elk invoerveld, elke status, elke foutmelding, elke
lege staat en elke bevestigingsdialoog, inclusief de exacte formulering. Een sleutel als
`strategy.dialogs.markAsPosted.cannotBeUndoneDescription` bewijst dat er een dialoog is, wat hij
doet, en dat hij een waarschuwing draagt.

Wat daaruit **afgeleid** is: de indeling van een scherm, de volgorde van blokken, de exacte
grafiekvorm. Waar ik afleid, staat dat erbij.

Wat er **niet** in staat: de database, de AI-pijplijn, de prijzen, en alles wat server-side gebeurt
zonder tekst. Daarvoor staan per fase de openstaande analyses in §7.

Aanvullend geanalyseerd: de gecompileerde CSS (`nova.inspace.io`, 86 kB), goed voor 381 design
tokens, negen radii, de volledige animatieset en het bewijs dat er een donkere modus is.

### De dertien besluiten die dit plan sturen

Op 10 augustus 2026 vastgelegd, in overleg. De eerste vier bepalen de vorm, de rest de invulling.

| # | Besluit | Keuze | Raakt |
|---|---|---|---|
| 1 | Navigatie | **Merk-werkruimte**. Je kiest bovenin een merk, daarna gaat de hele app over dat merk. | Fase 1 |
| 2 | Gebruiker | **Klantportaal plus admin**. De klant logt in en keurt goed, jij krijgt een CSM-overzicht. | Fase 2, 8 |
| 3 | Contentplan | **Twaalfmaandsplan als kernobject**, met maanden, statussen en goedkeuring per maand. | Fase 4 |
| 4 | Meten | **Beide**: AI-zichtbaarheid is het hoofdgerecht, Search Console is het bewijsstuk. | Fase 5 |
| 5 | **De naam** | **Aura blijft Aura.** Zie §12.1: het advies was wijzigen, de eigenaar kiest houden. Besluit genomen, discussie gesloten. | Niets |
| 6 | Pakketten | **10, 20 of 40 pagina's per maand**, drie pakketten, net als InSpace. | Fase 4 |
| 7 | Looptijd | **Doorlopend opzegbaar**, géén contract van twaalf maanden. | Fase 4, en het verandert de taal, zie hieronder |
| 8 | Publiceren | **Zowel de eigenaar als de klant** kan een pagina als geplaatst markeren. | Fase 4 |
| 9 | Klantsoort | **Ondernemers én marketingbureaus.** Eén inlog kan meerdere merken beheren. | Fase 2 |
| 10 | Websites | **Een klant kan meerdere websites hebben.** | Fase 1, 2 |
| 11 | Volume | **Ongeveer 20 klanten in het eerste jaar.** | Fase 8 schuift naar voren |
| 12 | Bewerken | **De klant mag teksten zelf aanpassen**, niet alleen goedkeuren. Aura's editor blijft. | Niets, blijft zoals het is |
| 13 | Taal | **Uitsluitend Nederlands.** Geen meertaligheid. | Fase 7 krimpt fors |
| 14 | Opzeggen | **Toegang blijft tot het einde van de betaalde maand**, en de opbrengst wordt nog één keer getoond. Niet meteen dichtgooien. | Fase 2, 5 |
| 15 | Goedkeuren bij bureaus | **Het bureau keurt goed**, want dat is de contractpartij. Doorzetten naar de eindklant is later een uitbreiding, geen voorwaarde. | Fase 2, 4 |
| 16 | Prijs per pakket | **Nog niet bepaald.** Het opbrengstblok rekent daarom in aantallen, niet in geld. | Fase 5 |
| 17 | Donkere modus | **Vervalt.** Niet uitgesteld maar geschrapt: 107 kleur-tokens die elk een doordachte tegenhanger nodig hebben, voor de enige fase met impact "laag". Aura wordt in een demogesprek getoond, op één scherm, in één stand. | Fase 7, 11 augustus 2026 |
| 18 | Wie betaald werk start | **Alleen de beheerder.** De klant keurt goed, hij start niets dat geld kost. Teruggedraaid besluit van diezelfde dag, toen bleek dat een klant op één middag $6,56 kon uitgeven zonder rem. Sluit aan op §1.2: bij Nova keurt de klant goed, hij maakt niet. | Alle dure routes, 11 augustus 2026 |

#### Wat besluit 14 en 16 betekenen voor de bouw

**Besluit 14** is geen instelling maar een toestand: een account krijgt een `opgezegd_per`-datum in
plaats van dat er iets verwijderd wordt. Tot die datum verandert er niets aan wat de klant ziet,
daarna valt hij terug op een leesweergave met zijn cijfers erin. Niets weggooien is sowieso de regel
hier (conventie 8, en `lib/archive.ts` doet dit al voor merken), dus dit is een uitbreiding van een
patroon dat er staat, geen nieuw mechanisme.

**Besluit 16 bepaalt hoe het opbrengstblok gebouwd wordt.** Zonder prijs kan het niet zeggen "dit
leverde € 340 op", alleen "340 extra bezoekers en 3 keer vaker genoemd". Dat is minder overtuigend,
maar het is wél eerlijk, en het is precies conventie 3: onbekend is beter dan een gok.

⚠️ Wat er nu al moet gebeuren, zodat het later geen verbouwing is: **de rekenkant van dat blok komt
in een pure module met de waarde per bezoeker als optionele parameter.** Staat hij op `null`, dan
toont het blok aantallen. Vul je hem later, dan verschijnt het bedrag zonder dat er een scherm
verandert. Dat kost nu tien minuten en later een dag.

#### Twee besluiten met een groter gevolg dan ze lijken

**Besluit 7, doorlopend opzegbaar, sloopt Nova's belangrijkste retentiemiddel.** Bij InSpace staat
overal "contract month {current} of {total}" en "Growing with NOVA since": de klant zit vast, en het
scherm herinnert hem eraan dat er nog maanden te gaan zijn. Dat kan hier niet, want hij kan morgen
opzeggen.

Het plan blijft twaalf maanden vooruitkijken, want een programma zonder horizon is geen programma.
Maar de taal verandert: geen "contractmaand 4 van 12" maar **"maand 4 sinds de start"**, en de
nadruk verschuift van *wat je nog tegoed hebt* naar *wat het tot nu toe opleverde*. Daarmee wordt
het opbrengstblok (`analytics.milestones` bij Nova, §3.6) geen leuk extraatje maar het middel dat
opzeggen tegenhoudt. Het staat daarom in fase 5, niet achteraan.

**Besluit 10 en 11 samen maken de opsplitsing verplicht.** Twintig klanten die allemaal meerdere
websites kunnen hebben, deels via bureaus, is precies de situatie waarin één platte `profiles`-tabel
vastloopt. `profiles` moet in tweeën: een **account** (de klant of het bureau, met facturatie en
gebruikers) en een **merk** (één website, met zijn eigen dossier, plan en metingen). Dat is de
zwaarste technische ingreep van het plan en hij zit in fase 1.

### De grens van dit plan: alles zit achter de inlog

**Dit plan gaat uitsluitend over de applicatie, niet over een marketingsite.** Vastgesteld op
10 augustus 2026, en het is ook de feitelijke stand: `app/page.tsx` stuurt door naar `/analyses`, de
middleware stuurt van daar naar `/login`, en de enige publieke pagina's zijn inloggen, registreren en
wachtwoord vergeten. Er ís geen publieke site in dit project, en geen enkele fase hieronder bouwt er
een. Geen prijzenpagina, geen demo-aanvraag, geen landingspagina.

Drie plekken waar het plan de voordeur wél raakt, zodat dat geen verrassing wordt:

1. **Fase 2** verandert `/register` in een activatiepagina en sluit zelfregistratie. Dat zijn schermen
   zonder inlog, maar het is app-chrome, geen marketing.
2. **De naamkwestie** (§12.1) raakt het woordmerk in de balk, de paginatitels en deze documentatie.
   Dat staat los van het bestaan van een marketingsite.
3. **Betaling** is bewust weggelaten (§9.2). Facturatiegegevens vastleggen kan achter de inlog;
   automatische incasso hoort bij een verkoopproces dat hier niet gebouwd wordt.

Buiten scope, op jouw verzoek: **een directe koppeling met het CMS**. Publiceren blijft handmatig,
met "markeer als geplaatst" als sluitstuk. Dat is overigens ook Nova's terugvalpad
(`runningStatus.waitingInYourCms`, `status.manualPosting`), dus we verliezen er geen structuur mee.

---

## 1. De strategische filosofie van Nova

Vijf principes, allemaal terug te lezen in de teksten zelf.

### 1.1 Het product is een programma, geen gereedschap

Nova verkoopt geen dashboard. Het verkoopt **twaalf maanden waarin er iets gebeurt**. De sleutel
`overview.monthOfTwelve` ("Month {number} of 12") staat prominent op het eerste scherm, en
`analytics.milestones.growingSince` ("Growing with NOVA since") maakt van de looptijd zelf een
prestatie.

Dat is de belangrijkste les. Een gereedschap wordt opgezegd zodra de gebruiker even geen tijd
heeft. Een programma dat loopt, met een maand 4 van 12 en pagina's die volgende week verschijnen,
zegt niemand halverwege op. Aura meet nu momentopnames; het mist het gevoel van een traject.

### 1.2 De klant keurt goed, hij maakt niet

Er is nergens een sleutel waarmee de klant zelf content schrijft. Wat hij doet is **beoordelen**:
`approve`, `approveAll`, `approveMonthly`, `decline`, `markAsPosted`. Zijn hele rol past in drie
werkwoorden: goedkeuren, afwijzen, bevestigen dat het live staat.

Dat is een bewuste machtsverdeling. Het bureau doet het werk en draagt de expertise; de klant houdt
de zeggenschap over wat er onder zijn naam verschijnt. Het is ook waarom het schaalt: een CSM kan
tientallen klanten bedienen zolang die klanten alleen ja of nee zeggen.

`approveMonthly.declineNote` is het scherpst: "Declining discards this strategy and generates a new
one." Afwijzen is geen discussie maar een nieuwe ronde van de machine.

### 1.3 Elk getal draagt zijn eenheid en zijn periode

Niet één losse metriek in het hele bestand. Altijd de eenheid en het bereik erbij:
`totalClicksThisMonth`, `totalClicksAllTime`, `partialMonth` ("(partial month)"),
`descriptionMonth` tegenover `descriptionAll`, `funnel.postedOfTotal` ("{posted} of {total}").

Dit is exact de fout die Aura maakte met "6/6" en "2/3", en die in de ronde van 10 augustus is
rechtgezet. Nova maakt hem structureel niet, omdat de eenheid in het label zelf zit.

### 1.4 Nooit een lege bak

Elke lijst, elk paneel en elke grafiek heeft een lege staat met een **titel én een omschrijving**,
en die omschrijving zegt wat er moet gebeuren om hem te vullen. Nova heeft er meer dan dertig:

- `noContentTitle` plus `noContentDescription`: "Performance data will show up here once your first
  pages are planned and published."
- `performanceTable.collectingDataTitle`: "Collecting performance data", met "Search data for newly
  posted pages usually appears within a few days." Dat is een lege staat die uitlegt dat leeg hier
  normaal is.
- Het admin-paneel heeft **zeven** lege staten, één per filter, elk met eigen tekst.

Dat laatste is het teken van een volwassen product: niemand bouwt zeven verschillende lege staten
per ongeluk.

### 1.5 Onomkeerbaar werk krijgt een eigen blok, geen zinnetje

Drie dialogen dragen een apart kopje `cannotBeUndoneTitle` met een `cannotBeUndoneDescription`
eronder. Niet als waarschuwing in de lopende tekst maar als eigen, visueel afgezet blok. En de
gevolgen staan er letterlijk: "Once approved, these pages are scheduled for posting."

---

## 2. De ontwerpfilosofie

`docs/designsystem.md` beschrijft al waar Aura's kleuren en radii vandaan komen. Wat daar nog niet
staat, en wat uit deze analyse volgt, is Nova's **systematiek**.

### 2.1 Een kleur heeft een betekenis, geen naam

381 tokens, waarvan 288 een kleurenladder (elf stappen per kleur) en **93 een betekenislaag**. Die
betekenislaag is het hele punt. Nova kent zeven betekenissen:

`intelligence` (paars, het merk zelf) · `growth` (groen, vooruitgang) · `information` (blauw) ·
`warning` (oranje) · `danger` (rood) · `attention` (roze) · `premium` (zand)

Elke betekenis heeft dezelfde vier vormen: een gevuld vlak, de tekstkleur daarop, dezelfde
betekenis als leesbare tekst op wit, en een subtiele achtergrond. Plus overal een `-hover`.

Aura heeft deze laag al overgenomen, en dat blijkt uit de vergelijking: `--intent-growth-solid`
`#37941c` is letterlijk `--ds-background-growth`. **Dit deel is klaar.** Wat nog mist:

| Nova heeft | Aura | Actie |
|---|---|---|
| `--ds-background-*-hover` op elke betekenis | Alleen op `intelligence` en `growth` | Aanvullen |
| `--ds-switch-*`, vijf tokens voor de schakelaar | Geen schakelaarcomponent | Bij fase 3 |
| Negen radii, `2xs` tot `full` | Zeven | Aanvullen met `2xl` |
| Donkere modus via `prefers-color-scheme` | Bewust niet | **Vervalt** (besluit 17) |

### 2.2 Beweging is functioneel en kort

Achttien keyframes, en geen enkele langer dan 0,2 seconde behalve de oneindige. Dat is de reden dat
Nova's product snel aanvoelt terwijl hun marketingsite zwierig is.

| Beweging | Duur | Waarvoor |
|---|---|---|
| `toast-in` | 0,15s ease-out | Vanaf `translateX(1rem)`, dus van rechts |
| `toast-out` | 0,12s ease-in | Alleen opacity, geen beweging |
| `toast-progress` | levensduur, lineair | `scaleX(1)` naar `scaleX(0)` |
| `modal-content-in` | 0,15s | Vanaf `scale(.96)`, niet vanaf onder |
| `dropdown-in` | 0,12s | |
| `accordion-down` | 0,2s | |
| `progress-indeterminate` | 1,5s oneindig | `translateX(-100%)` naar `250%` |

Uit in 0,12s en in in 0,15s: **weggaan is altijd sneller dan komen**. Dat is een detail dat je niet
ziet maar wel voelt, en het is consequent doorgevoerd over toast, modal, dropdown en tooltip.

De toast-set is in de ronde van 10 augustus al overgenomen in `components/toast.tsx`. De rest volgt
per fase, wanneer het bijbehorende component gebouwd wordt.

### 2.3 Elk blok heeft een titel én een omschrijving

Twintig keer een `*Description`-sleutel naast een `*Title`. Dit is het goedkoopste middel tegen een
overweldigend scherm: een lezer die acht koppen ziet zonder uitleg moet elk blok openmaken om te
weten of het voor hem bedoeld is.

Ook al overgenomen, in `ProfileSection`.

### 2.4 Twee statustalen naast elkaar

Nova's slimste vondst. **Aura heeft hem al**, voor analyses: `lib/analysis-status.ts` kent naast de
technische `AnalysisStatus` een `WhoseTurn` ("Wacht op jou", "Aura is bezig"), ingevoerd in de ronde
van 7 augustus en toen ook al aan deze bron ontleend. Wat hier telt is dat het model **meeschaalt**
naar het contentplan van fase 4, want daar heeft Nova de rijkste variant.

Er zijn **twee** verzamelingen statussen voor hetzelfde ding:

| `status` (wat het systeem weet) | `runningStatus` (wat jij moet weten) |
|---|---|
| `posted`, `approved`, `pendingReview`, `declined`, `draft`, `needsReview`, `canceled`, `failed`, `inProgress`, `scheduled`, `planned`, `manualPosting` | `planned`, `written`, `needsYourReview`, `scheduledToPublish`, `approved`, `waitingInYourCms`, `readyToPublish`, `published`, `writingFailed`, `publishingFailed`, `contactCsm` |

De linkerkolom is de toestandsmachine. De rechterkolom is dezelfde toestand vertaald naar **wie er
nu aan zet is**: "Needs your review" (jij), "Waiting in your CMS" (jij, elders), "Contact your CSM"
(wij). En er is nog een derde laag, `runningDate`, die er een tijd aan hangt: "Writing {date}",
"Publishes once approved", "Waiting for you".

Waarom dit ertoe doet: een klant die `pendingReview` ziet weet niet of hij moet wachten of iets
moet doen. Bij "Needs your review" weet hij het wel.

Wat Aura nog mist is de **derde** laag, `runningDate`, die er een tijd aan hangt: "Writing {date}",
"Publishes once approved", "Waiting for you". Bij een plan met pagina's die over zes weken
verschijnen is dat het verschil tussen een lijst en een agenda. Die laag komt in fase 4.

### 2.5 De vormtaal

- **Sidebar, inklapbaar** (`expandSidebar`, `collapseSidebar`), met een aparte mobiele variant
  (`openNavigationMenu`). Aura heeft een bovenbalk. Een sidebar schaalt beter zodra er meer dan vier
  bestemmingen zijn, en dat gaat hier gebeuren.
- **Twee kiezers bovenin**: klant en domein, allebei doorzoekbaar
  (`searchClientsPlaceholder`, `noClientsMatch`). Dit is de kern van de merk-werkruimte.
- **Segmenten als tabbladen**, niet als dropdown: `strategy.segments` en `admin.segments` zijn
  filters die als tabrij staan, elk met een eigen lege staat én een eigen banner.
- **Ruimtethema alleen in sfeer, nooit in instructies.** `notFound` is "Signal lost / Houston, we
  have a", en de wachtteksten tijdens het scannen zijn negen ruimtegrappen
  ("Locking onto your coordinates…", "Almost through the wormhole…"). Maar geen enkele knop, geen
  enkele foutmelding en geen enkel label doet eraan mee. Dit is exact wat
  `docs/schrijfstijl.md` al voorschrijft; het is fijn om te zien dat de bron het zelf ook zo doet.

---

## 3. De architectuur van Nova, module voor module

### 3.1 Shell en navigatie

```
┌─ Sidebar (inklapbaar) ─┬─ Topbar: klantkiezer · domeinkiezer ─────────┐
│  Overview              │                                              │
│  Strategy              │   inhoud                                     │
│  Analytics             │                                              │
│  Account               │                                              │
│  ── Admin panel ──     │                                              │
└────────────────────────┴──────────────────────────────────────────────┘
```

Vier bestemmingen, plus een aparte ingang naar het admin-paneel voor wie de rol `roleAdmin` heeft.
Het admin-paneel is een **eigen sectie** met eigen navigatie (`admin.nav`: Overview, Clients) en een
"Back to app"-link terug.

Rollen: `roleAdmin`, `roleMember`. Twee, niet meer.

### 3.2 Auth

Eén scherm, sober. Velden: werk-e-mail, wachtwoord met een toon-en-verberg-knop. Foutmeldingen per
geval (`invalidCredentials`, `invalidEmail`, `passwordRequired`). Twee vertrouwenssignalen die het
vermelden waard zijn: `secureSignIn` als kicker en `dataProtected` ("Your data is encrypted and
protected.") onderaan.

Geen registratie. **Je komt alleen binnen via een uitnodiging**, en dat is de hele
verkoopstrategie in één ontbrekend scherm.

### 3.3 Onboarding

Het grootste en best uitgewerkte deel: 12 subnamespaces, ruim 250 sleutels. Het valt in drie
stukken.

#### a. Activatie (`onboarding.activation`)

Je komt binnen via een uitnodigingslink. Kicker "SECURED INVITATION", titel "Welcome to NOVA". Je
zet een wachtwoord met **live afgevinkte regels**: `rule8` (minstens 8 tekens), `ruleNumber` (bevat
een cijfer), `ruleUppercase` (één hoofdletter). Het e-mailadres staat er met een `VERIFIED`-badge
naast, niet bewerkbaar.

Vier eindtoestanden van de link, elk met een eigen scherm: ongeldig, verlopen, al geactiveerd, en
gelukt. Plus een link naar de overeenkomst ("Need to check the details? View agreement").

#### b. Accountopzet (`nav.accountKicker` = "ACCOUNT SETUP")

Drie stappen, elk met titel en subtitel in de linkerrail:

| Stap | Subtitel | Inhoud |
|---|---|---|
| Company | "Check the details we have on file." | Bedrijfs-, facturatie- en contactgegevens, vooringevuld uit het contract |
| Website | "Confirm the site NOVA will learn from." | Domein bevestigen, dan scannen |
| Payment | "Set up how you'll be billed." | SEPA-incasso via Stripe |

**Company** is een formulier van vijftien velden dat begint in de leesstand, met een Edit-knop per
blok. `finishEditing`: "Save or cancel your changes to continue." Velden: `legalName`,
`invoiceEmail`, `address`, `city`, `postcode`, `country` (keuzelijst), `vatNumber` met een
"ik heb er geen"-vinkje, `communicationLanguage`, `contactPerson`, `contactEmail`, `phone`.

**Website** is het mooiste scherm van de hele onboarding. Je bevestigt het domein, en dan scant Nova
de site terwijl je kijkt. Er is een voorvertoning van de site, een lijst van wat er geleerd wordt
(`learnHomepage`, `learnProducts`, `learnAudience`, `learnVoice`, `learnTopics`), en negen
roulerende wachtteksten. Drie uitkomsten: geslaagd, mislukt met een opnieuw-knop, of
`proceedWarning` ("some brand fields may be empty, you can still fill them in on the next steps").
Plus `newSiteNote` voor een site die nog niet bestaat. Bij meerdere domeinen:
`domainProgress` ("Website {current} of {total}").

**Payment**: SEPA-machtiging via Stripe, met de volledige juridische machtigingstekst, "Secured by
Stripe", en `skipNote` dat een collega het later mag doen. `notConfigured` vangt af dat online
betalen uit kan staan, dan stuurt de CSM een factuur.

#### c. Merkopzet (`nav.brandKicker` = "BRAND SETUP")

Zes inhoudelijke stappen plus twee koppelingen plus de eindcontrole. Elke stap heeft een kicker
("YOUR BRAND"), een titel, een omschrijving, en per veld een eigen beschrijving én een placeholder
met een echt voorbeeld. Dat is drie lagen uitleg per veld.

| Stap | Velden |
|---|---|
| **Positioning** | Brand Core Category, Brand Mission, Brand Value Pillars, Brand Positioning |
| **Audience** | Primary Audience, Secondary Audience, "Us vs. Them", Geographic Identity |
| **Voice** | Vijf schuiven plus Brand Personality |
| **Words & language** | Signature phrases, taboo phrases, pronoun preference, identity keywords, laws and regulations |
| **Author** | Naam, rol, korte biografie, foto, LinkedIn, Facebook, overig, en de vraag of er een auteurspagina moet komen |
| **Topics** | USP, key messages, proof points, competitors, industry (met "anders, namelijk") |

De **Voice**-stap verdient aandacht, want Aura heeft hier al iets van. Vijf schuiven, elk met
benoemde standen in plaats van cijfers:

- Formality: Informal · Semi-formal · Formal
- Energy Level: Calm · Balanced · High Energy
- Complexity: Simple · Accessible Expert · Deep Expert
- Humor: None · Subtle · Playful
- Emotional Range: Neutral · Reassuring · Enthusiastic · Urgent (vier standen, de enige die er vier heeft)

En: `brand.draftedBadge` = "Drafted from your website". Elk veld dat de scan zelf heeft ingevuld
draagt dat label. Dat is precies Aura's `profile_field_sources`-idee, maar dan zichtbaar gemaakt
voor de klant.

**Search Console** en **CMS** zijn de twee koppelingen. De CMS-stap laat ik conform afspraak
buiten beschouwing; de Search Console-stap nemen we wél over. Die werkt zo: Nova toont twee
adressen die je in je Search Console-property moet zetten, elk met de vereiste rechten
(`permissionFull`, `permissionRestricted`), plus een verifieerknop en `notFoundHint` voor als het
nog niet gelukt is.

**Review & launch** sluit af. Regels met een stand per stap (`completed`, `badgeSkipped`,
`badgeAttention`), en één knop "Launch NOVA" die zichzelf uitlegt als hij niet mag:
`launchBlocked` = "Finish these first: {items}". `descriptionReady` legt de gevolgen uit:
"Launching starts your subscription and generates your first content plan."

Dit model is in de ronde van 10 augustus al overgenomen als `assessReadiness()`.

Verder: een **rail** die meegroeit (`rail.title` = "Your strategy taking shape", met "Up next" en
`topicsCount`), een **tussenscherm** na de accountopzet (`accountActive`) dat uitlegt wat er nu
komt, en een **websitekiezer** als een klant meerdere sites heeft ("You'll do this once per site,
launched sites are locked").

### 3.4 Overview

Het eerste scherm na inloggen. Vier blokken:

1. **Performance trend**: clicks deze planmaand en over de hele periode, plus de best presterende
   pagina.
2. **Funnel progress**: per funnelfase geplaatst tegenover gepland (`postedOfTotal`). De funnelfasen
   zijn per klant instelbaar, drie tot vijf stuks, ingesteld door de CSM.
3. **Strategy mix**: welke paginatypen er in de strategie zitten.
4. **Performance table**: per URL clicks, impressies, trend (`trendUp`, `trendDown`, `trendStable`,
   `trendNew`) en status (`live`, `issues`).

Met vier verschillende lege staten voor de tabel alleen: geen koppeling, geen geplaatste pagina's,
nog aan het verzamelen, of geen toegang.

### 3.5 Strategy

Het hart. Het contentplan per maand.

**De lijst.** Kolommen: URL, page type, locale, date, status, actions. Gegroepeerd per maand
(`monthGroup` = "Month {number}", met `monthPageCount`). Filters als segmenten: `noMonth`,
`awaitingApproval`, `beingUpdated` ("Being updated by your team"), `approved`.

Meertaligheid zit in de rij zelf: pagina's met dezelfde URL in meerdere talen klappen samen tot één
rij met `moreLocales` ("+2 locales") en een uitklapknop.

**Herordenen**: een bewerkmodus met sleepgrepen (`editOrder`, `saveOrder`, `reorderHint` = "Drag
rows to change the order in which pages are planned"). Toegankelijk gelabeld per rij.

**Bulkacties**: "Approve all" en "Mark all as posted".

**Vier dialogen**, elk met een eigen mislukt-titel:

| Dialoog | Kern |
|---|---|
| `approve` | Eén pagina goedkeuren. "Once approved it enters the posting pipeline." |
| `approveAll` | Meerdere tegelijk, met telling in de knop |
| `approveMonthly` | Hele maanden. Toont statistieken, gevolgen, én de afwijsknop met "Decline & regenerate" |
| `markAsPosted` | Vraagt per pagina het gepubliceerde pad. Met `cannotBeUndone`-blok |
| `deleteUrl` | Verwijdert een URL uit het plan. "A buffer URL for its month will backfill the slot" |

Dat laatste onthult een mechanisme: **bufferpagina's**. `common.buffer` ("+{count} buffer") en
`bufferUrlsAvailable` laten zien dat elke maand reserve-URL's heeft die automatisch inschuiven als
er een sneuvelt. Zo blijft het aantal pagina's per maand kloppen met het abonnement.

**De detailpagina** van één pagina: details (meta description, page type, locale, keywords),
schedule (status, planmaand, gepland voor, geplaatst op, URL), versiegeschiedenis, voorvertoning
met een verschil-weergave (`showChanges`), kopieerknoppen voor HTML en platte tekst, een
FAQ-blok, een versiekiezer en een lichtbak voor afbeeldingen.

De voorvertoning heeft drie lege staten, en de mooiste is `comingSoonDescription`: "This page's
content will be generated around {date}, about 10 days before its scheduled post date." **Tien
dagen voor publicatie schrijft de machine.** Dat is een ontwerpbeslissing die je nergens anders uit
af kunt leiden.

### 3.6 Analytics

Dieper dan Overview, alleen over prestatie. Trend, totale clicks, best én slechtst presterende
pagina (`underPerformingPage`, en dat is opvallend: Nova durft ook te laten zien wat niet werkt),
content mix, clicks per paginatype, een leaderboard, en een volledige tabel met zoeken, filters op
type en taal, en paginering.

Plus **milestones**: "Growing with NOVA since {datum}", "Search click growth since you started",
"Pages published with NOVA". Dat is geen analyse maar retentie: het maakt de looptijd van het
abonnement zichtbaar als opbrengst.

### 3.7 Account

Profiel (weergavenaam, communicatietaal), voorkeuren (**thema**: system, light, dark;
**weergavetaal**: en, nl, de; Aura neemt geen van beide over, zie besluit 13 en 17), en beveiliging (e-mail wijzigen met bevestigingsmail, wachtwoord
wijzigen met huidige-wachtwoordcontrole). Zestien specifieke foutmeldingen.

### 3.8 Admin, het CSM-paneel

Twee schermen.

**Clients**: een tabel van klant, domein, onboardingstatus, funnels, talen, klantgoedkeuring,
strategiestatus, acties. Zeven segmenten met elk een **banner** die zegt wat jij moet doen
("Needs your input: Fill in the funnels, languages, and strategy details below so these domains are
ready to generate") en een eigen lege staat.

De generatiedialoog vraagt: funnels (drie tot vijf, verplicht), talen, doelland, of het een
gloednieuwe site is, of het domein meertalig is, en of de bestaande sitestructuur gerespecteerd moet
worden. Pas als dat compleet is mag "Generate strategy".

**CSM Overview**: "Where we are falling behind on generating and posting client content." Vier
KPI's: achter op plaatsen, achter op genereren, wacht op goedkeuring, pijplijnfouten. Een tabel met
quota per maand, gegenereerd, geplaatst, laatste publicatie, en vlaggen. Filter "Alerts only".

Dit is een **operationeel** scherm, geen analytisch. Het bestaat om te zien waar het vastloopt.

### 3.9 Wat de foutmeldingen verraden

`strategy.errors` bevat `partialApproval`: "Approved {ok} of {total} items, {failedCount} failed
({reason})". Bulkacties zijn dus **niet transactioneel**: ze doen wat ze kunnen en rapporteren
eerlijk wat er misging. Dat is een volwassen keuze en het is precies het patroon dat Aura's
jobwachtrij ook aanhoudt.

---

## 4. Gap-analyse: Aura tegenover Nova

Feitelijk, per module. "Deels" betekent dat het idee er is maar de vorm afwijkt.

### 4.1 Fundament

| Onderdeel | Nova | Aura | Gat |
|---|---|---|---|
| Betekenislaag in kleur | 93 tokens | Overgenomen | Geen, op `-hover` na |
| Bewegingsset | 18 keyframes | Toast overgenomen | Modal, dropdown, tooltip, accordion |
| Titel plus omschrijving per blok | Overal | `ProfileSection` heeft het | Rest van de app nog niet |
| Statustaal in twee lagen | Ja | `analysis-status.ts`, `WhoseTurn` | Geen, wel de derde laag (`runningDate`) |
| Donkere modus | Ja | Bewust niet | **Vervalt** (besluit 17) |
| Meertaligheid | en, nl, de | Alleen nl, hardgecodeerd | **Vervalt** (besluit 13) |
| Toasts | Radix | Eigen, zelfde vorm | Geen |
| Sidebar | Inklapbaar | Bovenbalk | Fase 1 |
| Klant- en domeinkiezer | Ja, doorzoekbaar | Geen | Fase 1 |
| Rollen | admin, member | `staff_users` | Deels, uitbreiden |

### 4.2 Toegang en onboarding

| Onderdeel | Nova | Aura | Gat |
|---|---|---|---|
| Uitnodigingslink met activatie | Ja, vier eindtoestanden | Open registratie | **Groot** |
| Wachtwoordregels live afgevinkt | Ja | Geen | Klein |
| Bedrijfs- en facturatiegegevens | 15 velden | Geen | **Groot** |
| Betaling, SEPA via Stripe | Ja | Geen | **Groot** |
| Website bevestigen plus live scan | Ja, met voorvertoning | `onboarding-wizard.tsx`, alleen naam en URL | Deels |
| Merkopzet in stappen | 6 stappen, 30 velden | Alles wordt afgeleid, niets gevraagd | **Groot** |
| Tone of voice als schuiven | 5 schuiven | `tone-sliders.ts` bestaat | Deels, geen UI in onboarding |
| Auteur en auteurspagina | Ja | Geen | Middel |
| "Drafted from your website"-label | Ja | `profile_field_sources` bestaat | Deels, niet zichtbaar |
| Review en launch | Ja | `assessReadiness()` | Geen |
| Search Console koppelen | Ja | Geen | **Groot** |

### 4.3 Het programma

| Onderdeel | Nova | Aura | Gat |
|---|---|---|---|
| Twaalfmaandsplan | Kernobject | Geen | **Groot** |
| Pagina's per maand met status | Ja | `content_pieces` per analyse | Deels |
| Goedkeuren per pagina en per maand | Ja | `confirm`-route op analyseniveau | Deels |
| Afwijzen met hergeneratie | Ja | Geen | Middel |
| Markeren als geplaatst met pad | Ja | `publish-box.tsx` | Deels |
| Bufferpagina's | Ja | Geen | Middel |
| Herordenen van het plan | Ja, slepen | Geen | Klein |
| Funnelfasen per klant | 3 tot 5, instelbaar | Geen | Middel |
| Paginatypen | Ja | Deels in de briefing | Deels |
| Meertalige pagina's | Ja, gegroepeerd | Geen | Laag, alleen nl |
| Tien dagen vooruit schrijven | Ja | Op verzoek | **Groot** |

### 4.4 Meten

| Onderdeel | Nova | Aura | Gat |
|---|---|---|---|
| Search Console, clicks en impressies | Ja | Geen | **Groot** |
| Trend per pagina | Ja | `trend-chart.tsx` voor AI-zichtbaarheid | Deels |
| Best en slechtst presterende pagina | Ja | Geen | Klein |
| Leaderboard | Ja | Geen | Klein |
| Milestones, "sinds" | Ja | Geen | Middel |
| **AI-zichtbaarheid** | **Nee** | **Ja, volledig** | Aura is hier verder |
| Onzekerheidsmarges | Nee | `lib/stats/uncertainty.ts` | Aura is hier verder |
| Bronanalyse van AI-antwoorden | Nee | `source-analysis.ts` | Aura is hier verder |

### 4.5 Beheer

| Onderdeel | Nova | Aura | Gat |
|---|---|---|---|
| Klantentabel met segmenten | 7 segmenten met banners | Geen | **Groot** |
| CSM-overzicht "waar lopen we achter" | Ja, 4 KPI's | Geen | **Groot** |
| Strategie genereren met invoercontrole | Ja | Deels, `research`-route | Deels |
| Account: thema, taal, beveiliging | Ja | `/instellingen` minimaal | Middel |

---

## 5. Wat Aura heeft dat Nova níet heeft

Dit hoort in het plan, want het bepaalt wat we **niet** moeten weggooien tijdens de verbouwing.

1. **AI-zichtbaarheid als gemeten grootheid.** Nova meet Google. Aura meet of ChatGPT je noemt, met
   een nulmeting, per vraag, met bewijs en met bronvermelding. Dat is het hele bestaansrecht en het
   is precies waar de markt heen beweegt.
2. **Onzekerheid als eersteklas begrip.** `ConfidenceChip`, `lib/stats/uncertainty.ts`, en de regel
   "onbekend is een betere waarde dan een verkeerde". Nova toont nergens een betrouwbaarheid.
3. **Volledige audit-trail van elke AI-aanroep.** `ai_calls` bewaart de ruwe JSON naast de
   uitgesplitste kolommen. Nova laat hier niets van zien.
4. **Technische controle op AI-crawlers.** `lib/audit/` controleert of OpenAI, Anthropic en
   Perplexity de site überhaupt mogen lezen. Dat is een GEO-specifiek probleem dat in Nova niet
   bestaat.
5. **Claimvalidatie en feitextractie.** `validate-claims.ts`, `claim-extract.ts`,
   `quote-check.ts`: Aura controleert of wat het schrijft ook waar is volgens het dossier.
6. **Kostenlogboek per aanroep.** `lib/openai/ledger.ts` en `pricing.ts`.

**De strategische conclusie**: Nova's structuur overnemen, Aura's meetkant behouden als het
onderscheid. Het doel is niet een Nova-kloon met een ander logo, maar Nova's programma-model met
AI-zichtbaarheid als motor.

---

## 6. Het doelmodel: de gesloten lus

```
                    ┌──────────────────────────────────────┐
                    │                                      │
                    ▼                                      │
   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌──────────┐
   │ BEGRIJP │→ │ BESLIS  │→ │  MAAK   │→ │ PUBLICEER│→ │  LEER    │
   └─────────┘  └─────────┘  └─────────┘  └──────────┘  └──────────┘
    merkdossier   contentplan   pagina's     handmatig     AI-meting
    aanbodboom    per maand     schrijven    plus "als     plus GSC
    concurrenten  onderwerpen   goedkeuren   geplaatst"    impact
    nulmeting     funnelfasen                              nieuwe kansen
```

De lus sluit op twee plekken, en dat is precies wat Aura al half heeft:

- **`content_impact`** meet nu al of een gepubliceerde pagina de AI-zichtbaarheid veranderde.
- Wat mist is dat die uitkomst **terugvoedt in het plan**: een pagina die niets deed hoort tot een
  nieuw voorstel te leiden, en een onderwerp dat wél werkte hoort meer pagina's te krijgen.

Dat is de kern van fase 6.

---

## 7. Het bouwplan

### Eerst een tegenwerping, en waarom hij hier niet opgaat

De analyse van 6 augustus eindigt met een waarschuwing die recht tegen dit plan in lijkt te gaan:

> "De verleiding bij een document als dit is een lijst van veertig functies. De les uit hun eigen
> herbouw is dat er hooguit tien van overleven, en dat het altijd de tien zijn die iets uitleggen
> in plaats van iets toevoegen."

Dat is terecht, en het is de duurste les in de map, want InSpace heeft ervoor betaald. In hun
herbouw sneuvelden de kalender met slepen, de chatassistent per pagina, de clusterkaart, de
handmatige editor, het notificatiecentrum en het hele gamificationsysteem. **Alles wat wegging gaf
de klant meer knoppen. Alles wat bleef gaf hem meer duidelijkheid.**

Waarom dit plan toch 51 dagen beslaat, en waarom dat geen tegenspraak is: de acht fases hieronder
voegen bijna geen functies toe. Ze voegen **structuur** toe. Een merk-werkruimte is geen knop, het
is de plek waar de knoppen die er al zijn eindelijk bij elkaar staan. Een twaalfmaandsplan is geen
functie, het is het ontbrekende zelfstandig naamwoord waar het bestaande schrijven en meten aan
hangt. En van de zes dingen die InSpace liet vallen staat er geen enkele in dit plan; ze staan in
§9 met de reden erbij.

De toets per fase is dus niet "voegt dit iets toe" maar: **legt dit iets uit dat de gebruiker nu
zelf moet uitzoeken?** Waar het antwoord nee is, hoort het er niet in.

### De fases

Acht fases. Elke fase is op zichzelf bruikbaar en breekt niets van wat er staat. Effort in
mensdagen, uitgaande van jou plus Claude in dit tempo.

Bij elke fase staat welke **aanvullende Nova-analyse** nodig is. Sommige dingen zijn niet uit het
berichtenbestand te halen en vragen een tweede blik.

---

### Fase 0. Fundament op orde brengen

**Effort: 2 dagen · Impact: middel · Risico: laag**

Geen zichtbare functie, maar alles daarna leunt erop.

- Tokens aanvullen: `-hover` op alle zeven betekenissen, `--radius-2xl`, de vijf switch-tokens.
- De bewegingsset afmaken: `modal-*`, `dropdown-*`, `tooltip-*`, `accordion-*`,
  `progress-indeterminate`. Exact Nova's duren.
- Vier ontbrekende primitieven bouwen: `Dialog` (met het `cannotBeUndone`-blok als eigen variant),
  `Dropdown`, `Tooltip`, `Switch`.
- `EmptyState` verplicht stellen: **titel plus omschrijving**, nooit alleen een zin.
- `ProfileSection`'s titel-plus-omschrijving-patroon uitrollen naar de analysehoofdstukken.

**Verificatie**: `tsc`, unittests, build. Visueel: een dialoogscherm naast Nova's dialoog leggen.

**Nova-analyse nodig**: geen. Alles zit in de CSS die al binnen is.

---

### Fase 1. De merk-werkruimte

**Effort: 7 dagen · Impact: zeer hoog · Risico: hoog**

Dit is de structurele ingreep waar besluit 1 om vroeg, en sinds besluit 10 is hij zwaarder dan
eerst geraamd.

⚠️ **Er komt een accountlaag boven het merk.** Een klant kan meerdere websites hebben (besluit 10)
en kan een bureau zijn met meerdere klanten (besluit 9). De huidige platte `profiles`-tabel is
allebei tegelijk: het account én de website.

**✅ GEBOUWD op 10 augustus 2026, migratie `0046_accounts`, toegepast en nageteld op productie.**

```
accounts       de klant of het bureau: bedrijfsgegevens, facturatie, pakket, opzegdatum
account_users  koppeltabel gebruiker ↔ account met rol. Dít maakt een bureau mogelijk
profiles       + account_id. Blijft het merk: één website, één dossier, één set metingen
```

⚠️ **Afwijking van wat hier eerst stond.** Het plan schreef voor dat `profiles` `brands` zou worden
en elke `profile_id` een `brand_id`. Dat is afgevallen na het natellen: vijftien tabellen dragen een
`profile_id`, alle RLS-regels hangen eraan, en de code verwijst er op ~500 plekken naar. Die
hernoeming levert nul functionaliteit op, want `profiles` ís het merk al, en de navigatie zegt
bovendien al "Merken". Wat écht ontbrak was de laag eróven, en die is er nu.

Daarmee is dit ook niet meer de fase met het hoogste risico: er is niets hernoemd en niets
verplaatst. De toegangsregel is drielaags geworden (account, historische eigenaar, beheerder) en de
twee bestaande RLS-policies zijn blijven staan, dus de verruiming kon niets breken.

**Nageteld op productie**: 1 account, 9 merken gekoppeld, 0 wezen, Van den Udenhout op zijn plek.

- **Sidebar** in plaats van bovenbalk, inklapbaar, met mobiele variant.
- **Merkkiezer** bovenin, doorzoekbaar, met de lege staat `noClientsMatch`.
- Nieuwe routes onder een merk:
  `/merk/[id]` (Overzicht) · `/merk/[id]/strategie` · `/merk/[id]/analytics` · `/merk/[id]/dossier`
- `/analyses/[id]` blijft bestaan maar wordt bereikbaar **binnen** een merk. Oude URL's blijven
  werken via een redirect: er staan bladwijzers en gedeelde demolinks.
- Het merkdossier van vandaag wordt het tabblad "Dossier".
- Cookie of voorkeur die onthoudt welk merk je het laatst bekeek.

**Verificatie**: elke bestaande route blijft bereikbaar, geen dode link. Ketentest die een oude
`/analyses/[id]`-URL volgt tot het nieuwe scherm.

**Nova-analyse nodig**: **ja, en die is belangrijk.** Ik weet dat de sidebar en de kiezers bestaan,
maar niet hoe ze zich gedragen bij precies één klant, of hoe de domeinkiezer zich verhoudt tot de
klantkiezer. Concreet uit te zoeken:
1. Verdwijnt de klantkiezer als je maar één klant hebt?
2. Is "domein" een niveau ónder klant, en heeft elk domein een eigen strategie? De sleutel
   `admin.table.domain` naast `admin.table.client` suggereert van wel, en dat zou betekenen dat
   Aura's `profiles` eigenlijk in tweeën moet: klant en domein.
3. Hoe ziet de sidebar eruit als de onboarding nog loopt?

Voorstel: een tweede sessie waarin ik de admin- en accountschermen van Nova probeer te bereiken via
de publieke bundel, plus de marketingsite en documentatie op inspace.io.

---

### Fase 2. Rollen, uitnodigingen en het klantportaal

**Effort: 6 dagen · Impact: hoog · Risico: hoog (raakt auth en RLS)**

Besluit 2. Zonder dit is er geen abonnementsproduct.

- Rollenmodel: `admin` en `member`, op accountniveau. `staff_users` gaat hierin op.
- ⚠️ **Bureaus** (besluit 9). Eén gebruiker kan bij meerdere accounts horen, en een bureau ziet in de
  merkkiezer de merken van al zijn klanten. Dat is geen extra rol maar een koppeltabel tussen
  gebruiker en account. Nu meenemen is een halve dag; later toevoegen raakt opnieuw elke query.
- **Uitnodigingsstroom**: jij nodigt uit vanuit het admin-paneel, de klant krijgt een link, activeert
  met een wachtwoord (live afgevinkte regels), en landt in zijn merk.
  Vier eindtoestanden van de link, elk met een eigen scherm.
- Registratie sluiten. `/register` wordt de activatiepagina.
- RLS uitbreiden: een member ziet alleen de merken van zijn account.
- Het merkdossier krijgt twee gezichten: de consultantweergave (alles) en de klantweergave (het
  verhaal, zonder beheer en zonder ruwe onderbouwing).

**Verificatie**: ketentests met twee accounts die elkaars data niet mogen zien. Dit is de fase waar
een fout het duurst is; hier hoort een expliciete beveiligingsronde bij.

**Nova-analyse nodig**: nee voor de techniek, **ja voor de grens**. Uit te zoeken: wat ziet een
`member` precies niet? De i18n geeft geen rolafhankelijke teksten prijs, dus dit is een
ontwerpbeslissing die we zelf nemen. Ik stel voor dat we die grens vastleggen vóór de bouw.

---

### Fase 3. De onboarding als wizard

**Effort: 7 dagen · Impact: hoog · Risico: middel**

Nova's best uitgewerkte deel, en Aura's magerste (twee velden).

📋 **De complete veldenlijst staat in §13.** Daar staat per veld of Aura het al heeft, of het vanzelf
gevuld kan worden, en wat de klant zelf moet invullen. Kort: van de veertig velden die InSpace
uitvraagt hoeft de klant er bij Aura **elf** te typen, want de rest leidt de pijplijn af en zet hij
er vooringevuld neer met het label "uit je website gehaald". Daarom vier stappen in plaats van zes,
en daarom een dag minder dan eerst geraamd.

- Stappenrail met kicker, titel en subtitel per stap, en een voortgangsrail die meegroeit
  ("Your strategy taking shape", "Up next").
- **Accountopzet**: bedrijfs- en facturatiegegevens (15 velden, leesstand met Edit per blok),
  website bevestigen met live scan en voorvertoning, en de negen wachtteksten in Aura's eigen
  ruimtetaal.
- **Merkopzet**: zes stappen. Positionering, doelgroep, tone of voice (vijf schuiven met benoemde
  standen), woorden en taalgebruik, auteur, onderwerpen.
- Elk veld dat de scan zelf invulde krijgt het label **"Uit je website gehaald"**
  (Nova's `draftedBadge`). Aura heeft de data hiervoor al in `profile_field_sources`.
- **Review en launch**: hergebruikt `assessReadiness()` uit de ronde van 10 augustus.
- Overslaan mag overal, en wat overgeslagen is krijgt een `Overgeslagen`-badge op het eindscherm.

**Datamodel**: nieuwe tabellen `accounts` (bedrijfsgegevens), `brand_voice` (de schuiven en de
woorden), `brand_author`. Migraties additief.

**Verificatie**: een nieuwe klant volledig doorlopen, van uitnodiging tot launch, en controleren dat
de pijplijn de ingevulde velden ook echt gebruikt in de schrijfprompt.

**Nova-analyse nodig**: **ja.** Twee dingen:
1. De volgorde en de precieze indeling per stap (één kolom of twee, waar staat de rail). Uit de
   i18n niet af te leiden.
2. Hoe de scan zich verhoudt tot de velden: overschrijft hij wat de klant al invulde, of vult hij
   alleen leegte? Dat bepaalt of Aura's `field-merge.ts` hier hergebruikt kan worden.

---

### Fase 4. Het contentplan van twaalf maanden

**Effort: 10 dagen · Impact: zeer hoog · Risico: hoog**

Besluit 3, en de grootste fase. Dit is wat van Aura een programma maakt.

⚠️ **Twee besluiten veranderen dit ontwerp:**

- **Besluit 7, doorlopend opzegbaar.** Geen contractduur, dus geen "contractmaand 4 van 12". Het
  plan kijkt wél twaalf maanden vooruit, maar de teller heet **"maand 4 sinds de start"** en er
  staat nergens hoeveel er nog te gaan is. Wat er in de plaats komt is het opbrengstblok uit fase 5.
- **Besluit 8, beiden publiceren.** "Markeer als geplaatst" moet zowel door de eigenaar als door de
  klant gedaan kunnen worden, en er wordt vastgelegd wie het deed. Dat is één kolom en één regel in
  de weergave, maar zonder die kolom is later niet meer na te gaan wie wat live zette.
- **Besluit 6, drie pakketten.** 10, 20 of 40 pagina's per maand. De quota is een eigenschap van het
  pakket op het account, niet een vrij veld per merk.

**Datamodel** (nieuw, additief):

```
content_plans        merk, startdatum, pagina's per maand (uit het pakket)
plan_months          plan, maandnummer 1..12, status, goedgekeurd_op
planned_pages        plan_month, url_pad, paginatype, funnelfase, onderwerp,
                     status, volgorde, is_buffer, content_piece_id
funnel_stages        merk, label, volgorde (3 tot 5)
page_types           merk of globaal
```

**Schermen**:
- Strategie-lijst per maand, met segmenten (wacht op jouw goedkeuring, wordt bijgewerkt,
  goedgekeurd), en per maand een telling.
- Vier dialogen: goedkeuren, alles goedkeuren, maand goedkeuren met afwijzen-en-hergenereren,
  markeren als geplaatst met padinvoer. Allemaal met het `cannotBeUndone`-blok waar het telt.
- Herordenen met slepen.
- Bufferpagina's die inschuiven als er een verwijderd wordt.
- Detailpagina per geplande pagina: hergebruikt grotendeels de bestaande
  `bibliotheek/[pieceId]`-pagina, die is al sterk.

**Het dubbele statusmodel** (§2.4) wordt hier ingevoerd: `lib/plan-status.ts` met een technische
status en een `wie is er aan zet`-vertaling.

**De tien-dagen-regel**: een cron die pagina's schrijft die over tien dagen gepland staan. Sluit aan
op de bestaande jobwachtrij, wordt een nieuw jobtype (conventie 7).

**Verificatie**: een plan van 12 maanden aanmaken, een maand goedkeuren, een pagina afwijzen, een
buffer laten inschuiven, en nameten in de database dat de tellingen kloppen. Ketentest per stap.

**Nova-analyse nodig**: **ja, dit is de belangrijkste openstaande vraag van het hele plan.** Deels
al beantwoord door de analyse van 6 augustus:

- **Quota per maand: opgelost.** De prijspagina van `inspace.io/nl` noemt 10, 20 en 40 pagina's per
  maand, drie abonnementen. Dat is de quota, en hij hangt dus aan het pakket. Voor Aura betekent dat
  `content_plans.pages_per_month` een eigenschap van het abonnement is, geen vrij veld.
- **Nog open:** hóé uit de admin-invoer (funnels, talen, doelland, nieuwe site, structuur
  respecteren) twaalf maanden pagina's rollen. Dit bepaalt of Aura's `propose_topics` hierop kan
  worden uitgebouwd of dat er een nieuwe pijplijnstap moet komen. Mijn verwachting: uitbouwen, want
  `propose_topics` levert al onderwerpen met prioriteit, en wat mist is de verdeling over maanden
  en funnelfasen.
- **Nog open:** de bufferlogica. Hoeveel buffers per maand, en wanneer schuift er een in.

Voorstel: één gerichte ronde waarin ik de bundels van Nova's strategy-route uitpak, zoals nu met de
inlogpagina is gedaan. Die bevat de tabelopbouw en de formuliervalidatie, en dat is waar de
bufferregels zichtbaar worden. Als dat niet volstaat is een demo-account bij InSpace de volgende
stap.

---

### Fase 5. Google Search Console

**Effort: 5 dagen · Impact: hoog · Risico: middel**

Besluit 4. Dit maakt het effect hard aantoonbaar.

> **Deze fase is al uitgezocht.** [`docs/tasks/zoekdata-koppeling.md`](./tasks/zoekdata-koppeling.md)
> (6 augustus) heeft de koppeling tot op de implementatiekeuze uitgewerkt en komt op dezelfde
> ~5 dagen uit. Drie conclusies daaruit die dit plan overneemt: **Search Console wel, Google
> Analytics niet** (en InSpace maakt datzelfde onderscheid), de koppeling loopt **via een service
> account** dat de klant aan zijn property toevoegt en niet via OAuth (dat halveert de bouw en haalt
> de verificatieplicht bij Google weg), en het echte werk zit niet in de code maar in de onboarding,
> want dit wordt het eerste dat Aura ooit écht van de klant vraagt. Begin die fase met dat document,
> niet met dit hoofdstuk.

- Service account met Nova's twee-adressen-model en een verifieerknop, blokkerend in de onboarding.
- Dagelijkse haal-taak, opslag per URL per dag: clicks, impressies, positie.
- Nieuwe schermen: Analytics met trend, beste en slechtste pagina, leaderboard, tabel met filters en
  paginering.
- Overzicht krijgt de prestatieblokken.
- **De eigen draai**: Nova toont clicks. Aura toont clicks **naast** AI-zichtbaarheid, in één
  grafiek. Dat is een beeld dat niemand anders heeft, en het maakt besluit 4 waar: AI-zichtbaarheid
  is het verhaal, Google is het bewijsstuk.
- ⚠️ **Het opbrengstblok is hier geen extraatje.** Door besluit 7 (doorlopend opzegbaar) is dit het
  middel dat opzeggen tegenhoudt. Nova's `analytics.milestones` in Aura's vorm: "actief sinds
  {datum}", "zoveel vaker genoemd sinds de start", "zoveel pagina's gepubliceerd". Eén blok, drie
  getallen, en het staat op het overzicht en niet weggestopt in Analytics.
  Rekenkant in een pure module met de waarde per bezoeker als **optionele** parameter (besluit 16):
  `null` toont aantallen, een bedrag toont geld. Zo hoeft er geen scherm om zodra de prijzen er zijn.
- **Bij opzegging** (besluit 14) wordt dit blok het laatste wat de klant ziet, tot het einde van de
  betaalde maand. Dat is de enige plek in de app waar "wat het opleverde" belangrijker is dan "wat
  er nu staat".
- Alle vier de lege staten van Nova overnemen, inclusief "we zijn nog aan het verzamelen".

**Verificatie**: tegen een echte property, en de cijfers naleggen naast de Search Console-interface
zelf. Conventie 10: gebouwd is niet geverifieerd.

**Nova-analyse nodig**: nee. De i18n is hier volledig genoeg en de Search Console API is
gedocumenteerd.

---

### Fase 6. De lus sluiten

**Effort: 4 dagen · Impact: zeer hoog · Risico: middel**

Dit is waar Aura Nova voorbijgaat, en het is de reden dat de rest gebouwd wordt. Gekrompen van 6
naar 4 dagen omdat "Nova insights" één zin bleek te zijn (§11.4), geen module.

- **Impact terug in het plan.** `content_impact` meet al of een pagina de AI-zichtbaarheid
  veranderde. Nieuw: een pagina die na 60 dagen niets deed leidt tot een voorstel (herschrijven,
  ander onderwerp, of een aanvullende pagina). Een onderwerp dat wél werkte krijgt meer ruimte in de
  volgende maanden.
- **Kansen als eigen object.** Nu zitten adviezen verspreid over rapport, gaps en topics. Eén lijst:
  wat is er te winnen, hoeveel, en met welke actie.
- **Automatische controles op gepubliceerde pagina's**: staat hij er nog, is hij gewijzigd, is hij
  nog vindbaar voor AI-crawlers. Sluit aan op `lib/audit/`.
- **Nova insights** als eigen blok op het overzicht: drie zinnen die zeggen wat er deze maand
  gebeurde en wat de volgende stap is.

**Verificatie**: tegen echte opgeslagen data van een klant met minstens twee meetronden.

**Nova-analyse nodig**: **ja, maar anders.** Nova heeft deze lus niet in de i18n zichtbaar. Wat wél
de moeite waard is: uitzoeken hoe zij "Nova insights" formuleren, want die term komt uit jouw eigen
structuurschets en niet uit het berichtenbestand. Vraag: waar heb je die vandaan? Als dat een
publieke bron is, wil ik die lezen.

---

### Fase 7. Het accountscherm

**Effort: 1 dag · Impact: laag · Risico: laag**

⚠️ **Deze fase is twee keer gekrompen.** Eerst van 5 naar 2 dagen door besluit 13 (de app blijft
uitsluitend Nederlands, dus `next-intl` en de hele vertaalslag vervallen). Daarna van 2 naar 1 dag
door **besluit 17, 11 augustus 2026: de donkere modus vervalt volledig.** Niet uitgesteld maar
geschrapt; hij staat nergens meer op een lijst. De reden staat in `logbook.md`: 107 kleur-tokens die
elk een doordachte tegenhanger nodig hebben, voor de enige fase in het plan met impact "laag", bij een
product dat sales-led in een demogesprek verkocht wordt en dus altijd op één scherm in één stand
getoond wordt.

- **Accountscherm**: bedrijfsgegevens, e-mail wijzigen met bevestigingsmail, wachtwoord wijzigen met
  controle op het huidige. De bedrijfsgegevens staan er sinds 11 augustus 2026.

**Nova-analyse nodig**: nee.

---

### Fase 8. Het CSM-paneel

**Effort: 4 dagen · Impact: hoog voor jou, nul voor de klant · Risico: laag**

⚠️ **Schuift naar voren door besluit 11.** Twintig klanten in het eerste jaar, die allemaal meerdere
websites kunnen hebben en deels via bureaus binnenkomen, is geen situatie meer die je met de
database bijhoudt. De oorspronkelijke redenering ("bij minder dan tien klanten kun je dit met SQL")
gaat niet meer op. **Bouw dit direct na fase 4**, zodra er plannen zijn om te overzien.

- **Klantentabel** met de zeven segmenten, elk met banner en lege staat.
- **CSM-overzicht**: "waar lopen we achter". Vier KPI's, tabel met quota tegenover werkelijkheid,
  vlaggen, filter "alleen waarschuwingen".
- Uitnodigingen versturen, merken koppelen, plannen genereren.

**Waarom dit achteraan mag**: bij minder dan tien klanten kun je dit met de database. Zodra het er
meer worden is het onmisbaar, en dan is het ook precies duidelijk wat erin moet.

**Nova-analyse nodig**: nee, de admin-namespace is met 28 sleutels plus subobjecten de best
gedocumenteerde van allemaal.

---

## 8. Samengevat: effort tegenover impact

Bijgewerkt na de dertien besluiten van 10 augustus. De volgorde is gewijzigd: het CSM-paneel schuift
naar voren, meertaligheid vervalt.

| Volg­orde | Fase | Wat | Dagen | Impact | Risico |
|---|---|---|---|---|---|
| 1 | 0 | Fundament, primitieven | 2 | Middel | Laag |
| 2 | 1 | Merk-werkruimte, plus account en merk splitsen | 7 | Zeer hoog | **Hoog** |
| 3 | 2 | Rollen, uitnodigingen, bureaus | 6 | Hoog | **Hoog** |
| 4 | 3 | Onboarding-wizard, vier stappen | 7 | Hoog | Middel |
| 5 | 4 | Contentplan, 12 maanden doorlopend | 10 | Zeer hoog | **Hoog** |
| 6 | 8 | CSM-paneel | 4 | Hoog voor jou | Laag |
| 7 | 5 | Search Console plus het opbrengstblok | 5 | Hoog | Middel |
| 8 | 6 | De lus sluiten | 4 | Zeer hoog | Middel |
| 9 | 7 | Accountscherm | 1 | Laag | Laag |

**Totaal: ongeveer 46 dagen**, vijf minder dan de eerste raming.

**Wat er veranderde en waarom:**

| Verandering | Oorzaak |
|---|---|
| Fase 1 van 5 naar **7** dagen | Besluit 10: `profiles` moet in account en merk gesplitst worden. Dat is een migratie plus een herschrijving van elke query die nu op `profile_id` staat. |
| Fase 3 van 8 naar **7** dagen | §13: de merkstappen zijn nakijkwerk geworden in plaats van invulwerk, want Aura leidt 25 van de 40 velden zelf af. |
| Fase 8 van plek 9 naar **plek 6** | Besluit 11: twintig klanten met meerdere websites redt je niet met SQL. |
| Fase 7 van 5 naar **1** dag | Besluit 13: alleen Nederlands, dus geen `next-intl`. Besluit 17: de donkere modus vervalt. |
| Fase 6 van 6 naar **4** dagen | §11.4: "Nova insights" bleek één zin, geen module. |

### Als je moet kiezen

Zou je maar drie fases kunnen doen, doe dan **1, 4 en 6**: de merk-werkruimte, het contentplan en de
gesloten lus. Dat zijn precies de drie die van een meetinstrument een programma maken.

Maar met besluit 7 erbij (doorlopend opzegbaar) verdient **fase 5 een streepje**: bij een klant die
elke maand kan opzeggen is "kijk wat het opleverde" geen luxe maar het middel dat hem vasthoudt. Als
je vier fases doet, is dat de vierde.

---

## 9. Wat ik bewust níet overneem van Nova

### 9.1 Wat InSpace zelf al heeft weggegooid

Deze zes zaten in de oudere `app.inspace.io` en zijn in de herbouw naar Nova gesneuveld. Ze staan
hier zodat ze niet alsnog via een omweg in Aura belanden. De onderbouwing per stuk staat in
[`nova-analyse.md`](./tasks/nova-analyse.md) §8.

| Weggegooid | Waarom het aantrekkelijk lijkt | Waarom het niet moet |
|---|---|---|
| Kalender met slepen | Demonstreert goed | Een tabel met maandsegmenten doet hetzelfde met minder |
| Chatassistent per pagina | Voelt modern | Duur, moeilijk te sturen, en het ondermijnt de claimvalidatie |
| Clusterkaart, "Positioning Map" | Indrukwekkend | Zelden de basis voor een beslissing |
| Handmatige editor zonder vangnet | Vrijheid | Elke handmatige bewerking ondermijnt de garanties van het systeem |
| Notificatiecentrum | Compleet | Een banner bovenaan doet hetzelfde |
| Gamification, "Orbits" | Betrokkenheid | Onderhoud tegenover een onbewezen effect |

⚠️ Twee kanttekeningen, want Aura is geen kopie:

- **De handmatige editor** ligt hier anders. Aura heeft er één (`content-editor.tsx`), mét
  claimvalidatie en versiegeschiedenis eromheen. Dat is precies het vangnet dat InSpace miste, dus
  die blijft.
- **De contentassistent** wees InSpace af omdat hij hun kwaliteitscontrole ondermijnde. Aura's
  `validate-claims.ts` en `quote-check.ts` zijn juist gebouwd om dat op te vangen. Blijft
  desondanks buiten dit plan: eerst de structuur, dan pas een gesprek erbovenop.

### 9.2 Wat Nova wél heeft maar Aura niet nodig heeft

1. **Betaling in de onboarding.** Nova int per SEPA-machtiging in stap 3. Bij een sales-led product
   met een consultancy-uur ervoor is een factuur van jou passender, en het scheelt een Stripe-
   integratie. Wel de gegevens vastleggen, niet de incasso.
2. **De directe CMS-koppeling.** Op jouw verzoek, en Nova heeft er zelf een terugvalpad voor.
3. **Meertalige pagina's per URL.** Nova groepeert vertalingen van dezelfde pagina. Aura is
   Nederlands en dat blijft voorlopig zo; dit zou complexiteit toevoegen zonder klant.
4. **`premium` als betekeniskleur.** Zeven betekenissen is er één te veel voor Aura's schermen. Zes
   volstaat, de zandkleur heeft hier geen betekenis.
5. **Losse Analytics naast Overview.** Bij Nova zijn dat twee schermen met flinke overlap. Voor Aura
   is één overzicht met een periodekiezer helderder, zeker in het begin.

---

## 10. Openstaande Nova-analyses, gebundeld

Wat er nog uitgezocht moet worden, op volgorde van urgentie:

**Bijgewerkt na de tweede ronde van 10 augustus (§11). Vier van de zes zijn beantwoord.**

| # | Vraag | Stand |
|---|---|---|
| 1 | Hoe rolt er uit de admin-invoer een plan van 12 maanden? | ✅ **Beantwoord**, §11.1. Abonnement geeft de quota, een agent verdeelt over vier paginatypen en 12 contractmaanden. |
| 2 | Bufferlogica | ⚠️ **Deels**, §11.2. Niet publiek op te halen. Voorstel: zelf ontwerpen, quota plus marge. |
| 3 | Is "domein" een niveau ónder "klant"? | ✅ **Ja**, §11.1 en de admin-tabel (`client` naast `domain`, `strategySubtitle` per klant, meerdere websites per klant in de onboarding). `profiles` moet in tweeën: **account** en **merk**. Raakt fase 1 en 4. |
| 4 | Indeling per onboardingstap, en of de scan bestaande invoer overschrijft | ⚠️ **Open**, alleen relevant voor fase 3. |
| 5 | Wat ziet een `member` niet ten opzichte van een `admin`? | Eigen ontwerpbesluit, samen vast te leggen bij fase 2. |
| 6 | Waar komt "Nova insights" vandaan? | ✅ **Beantwoord**, §11.4. Marketingsite, één zin plus een vervolgstap. |

**Ook al beantwoord:** de quota per maand (uit het abonnement, `creation.subscriptionPlan`), en de
vorm van de Search Console-koppeling (service account, niet OAuth, zie `zoekdata-koppeling.md`).

**Wat er niet meer uit te halen valt.** Alleen de inlogpagina geeft zijn bundels prijs; elke route
erachter geeft een redirect. Verder komen vraagt een demo-account bij InSpace. Mijn advies: niet
doen. Vraag 2 en 4 zijn ontwerpvrijheden geworden, en die zijn goedkoper zelf te beantwoorden dan
na te bouwen.

---

## 11. De strategie uitgepakt (aanvulling 10 augustus, tweede ronde)

Deze ronde ging over de vragen die §10 blokkeerden. Drie nieuwe bronnen: de i18n van de oudere
`app.inspace.io` (**`docs/inspace-app-i18n.json`**, 1.469 sleutels, 21 namespaces), de
marketingsite (**`docs/inspace-marketing.txt`**) en de prijspagina.

### 11.1 Hoe een jaarplan tot stand komt, beantwoord

De oudere app is hier expliciet waar Nova zwijgt.

| Sleutel | Wat het bewijst |
|---|---|
| `creation.subscriptionPlan` = "Subscription plan 0{plan} · {count} items per month" | **De quota komt uit het abonnement.** Niet uit een instelling per klant. |
| `strategy.monthOfTotal` = "You are in contract month {current} of {total}" | De twaalf maanden zijn de **contractduur**, geen kalenderjaar. |
| `strategy.annualPlan`, `annualPlanDescription` = "The following type of items will be created" | Het jaarplan is een **samenstelling van paginatypen met aantallen**, niet een lijst URL's. |
| `strategy.itemType`, `totalCount`, `totalPlanned`, `remaining`, `progress` | Per type een totaal, en een teller die afloopt. |
| `pageTypeCategory`, `pageTypeService`, `pageTypeInformative`, `pageTypeOther` | **Vier paginatypen.** Plus `servicePage`, `categoryPage`, `blogKnowledge` als labels. |
| `creation.proposedStrategy` = "Our system has identified and scheduled the following items" | Een **agent** stelt het plan op, de CSM keurt het goed. |
| `creation.createStrategyDescription` = "The agent will build a fresh strategy. The note below is shared with the agent as context." | Er is een **vrij tekstveld** dat als context aan de agent meegaat. |
| `creation.strategyLabel` = "Strategy 0{version}" | Strategieën zijn **geversioneerd**. |
| `creation.purgeStrategyDescription` | Purgen verwijdert het conceptjaarplan, alle maandplannen en alle voorgestelde URL's. **Geplaatste en goedgekeurde content blijft.** |

**De ketting is dus**: abonnement geeft N items per maand → agent stelt een jaarplan op als een
verdeling over vier paginatypen → dat wordt uitgerold over 12 contractmaanden → CSM keurt goed →
klant keurt per maand goed → tien dagen voor publicatie wordt er geschreven.

**Gevolg voor Aura**: `propose_topics` kan hierop worden uitgebouwd en er hoeft geen nieuwe zware
pijplijnstap te komen. Wat erbij moet is de **verdeling**: van een lijst onderwerpen met prioriteit
naar een verdeling over maanden, paginatypen en funnelfasen, met een quota als randvoorwaarde. Dat
is rekenwerk, dus een pure module (conventie 2), geen AI-aanroep.

### 11.2 Wat er nog van de bufferlogica onbekend blijft

`common.buffer` ("+{count} buffer") en `bufferUrlsAvailable` bestaan alleen in Nova, niet in de
oudere app, en de strategy-route is niet publiek op te halen omdat alleen de inlogpagina zijn
bundels prijsgeeft. Wat vaststaat uit `deleteUrl.body`: bij het verwijderen van een URL schuift er
een buffer-URL van diezelfde maand in, als die er is.

**Voorstel**: niet verder zoeken. Dit is een detail dat we zelf mogen ontwerpen, en de regel ligt
voor de hand: genereer per maand de quota plus een marge, markeer de marge als buffer, en laat er
één inschuiven zodra er een sneuvelt. Wordt vastgelegd in de taak van fase 4.

### 11.3 Het merkbrein, en waar jouw schets vandaan komt

Jouw structuurschets (Brand Intelligence, buying personas, customer journey, keyword clusters,
markets & regions, SEO plus GEO gaps) staat **niet in de i18n**. Hij komt van de marketingsite, uit
één visueel blok dat laat zien wat Nova over een merk weet:

```
Tone of voice · Producten & diensten · Concurrenten · Buyer persona's · Klantreis
238  zoekopdrachten & AI-vragen   (mapped automatically)
 14  Markten & regio's
238  Zoekwoordclusters
 91  SEO + GEO gaps
 62d Contentkalender
```

Dat is dus **de belofte**, niet aantoonbaar de gebouwde app. In de i18n bestaan wel `cluster` en
`subCluster` (op de contentdetailpagina), `searchIntent`, `targetPersona`, `funnelLevel`,
`primaryKeyword` en `recommendedKeywords`. Er is geen scherm dat "keyword clusters" of
"buying personas" als eigen object beheert.

**Wat Aura hiervan zou moeten overnemen**: de gedachte dat het merkbrein een **telbaar** ding is.
"238 zoekopdrachten in kaart, 91 gaten" is overtuigender dan een lap tekst, en Aura heeft die
getallen al (aanbodknopen, onderwerpen, prompts, dekkingsgaten). Dat is een presentatiekwestie van
een halve dag, niet een module. Hoort bij fase 1, op het overzicht.

### 11.4 "NOVA-inzicht" bestaat, en het is één zin

Openstaande vraag 6 uit §10 is beantwoord. Op het overzichtsscherm van de marketingsite staat een
blok **"NOVA-inzicht"** met precies één zin:

> "Finishing the Bankencollectie funnel unlocks your first fully-ranked topic cluster. Open the
> assistant for the next moves."

De vorm: één waarneming die aan de funnelvoortgang hangt, plus één vervolgstap. Geen lijst, geen
score. Dat is goed nieuws voor fase 6, want het is veel kleiner dan ik had begroot.

### 11.5 De doorlopende optimalisatie, bevestigd

Ook van de marketingsite: **"Continue optimalisatie · live, 188 pagina's gemonitord, Auto-fixes
today · 3"**. Er is dus een laag die gepubliceerde pagina's blijft volgen en er zelf kleine dingen
aan repareert. In de i18n van beide apps staat daar niets over, dus of het draait weet ik niet.

Voor Aura is de bewaakte variant hiervan wél verstandig, en `lib/audit/` is er al: staat de pagina
er nog, is hij gewijzigd, mogen AI-crawlers er nog bij. **Voorstellen in plaats van zelf repareren**,
want automatisch je klant zijn site aanpassen zonder CMS-koppeling kan toch niet, en met koppeling
zou je het niet willen.

### 11.6 Het overzichtsscherm, exact

Uit de marketingmock, en het klopt met de i18n:

```
Hoofdmenu: Overzicht · Analytics · Strategie          [HV Home Venture ▾]  Beheer

  "NOVA schrijft je content"
  69 pagina's live · Bankenfunnel 88% · Gem. positie 14,6
  [Bekijk analytics] [Beoordeel pagina's]

  Pagina's live 69/188 (+12 deze maand) | Totaal kliks 1.840 | Gem. positie 14,6

  Zoekprestaties            [Kliks | Vertoningen]
  "De groei is hervat na de piek in april, de indexering is bijgewerkt."

  Best scorende pagina's                    Funnel-voortgang · 5 funnels
   /sustainable-living-guide   ↑4  #3        Duurzaam wonen      88%
   /eco-materials/bamboo…      ↑2  #5        Eco-materialen      73%
   /room-guides/small-living…   –  #7        Kamergidsen         55%
                                             Bankencollectie     38%
                                             Eetkamercollectie   21%
                                             69/188 gepubliceerd
  NOVA-inzicht: één zin plus een vervolgstap
```

Twee dingen die het vermelden waard zijn: onder de grafiek staat **een zin die de grafiek uitlegt**
("de groei is hervat na de piek in april"), en de kop van het scherm is geen titel maar een
**mededeling** ("NOVA schrijft je content") met twee knoppen eronder. Allebei goedkoop over te
nemen en allebei precies het verschil tussen een dashboard en een product.

### 11.7 Wat de oudere app extra had, en wat daarvan meetelt

Naast §9.1 (wat ze weggooiden) staan hier twee dingen die ze hielden en die Aura mist:

- **Strategy Efficiency**: `clicksPerPage` ("clicks on average per page") en `trafficTop3`. Eén
  getal dat zegt of het programma rendeert. Aura's equivalent zou zijn: gemiddelde verandering in
  AI-zichtbaarheid per gepubliceerde pagina.
- **Actions Needed** met `approvalsNeeded` en een `Go`-knop. Eén teller die zegt hoeveel er op de
  klant wacht. Hoort in fase 2, bij het klantportaal.

En de kalender (`calendarView`, `dayFull` = "Day is full (max 5 items)", `dragToSchedule`,
`backlog`) is in Nova gesneuveld. Blijft gesneuveld, zie §9.1.

---

## 12. Twee besluiten die dit onderzoek oplevert

### 12.1 De naam

InSpace brengt een product uit dat **Aura** heet, in dezelfde categorie, met de omschrijving
"een nieuwe manier om te groeien voorbij zoekmachines". Wat dat betekent:

| Optie | Voor | Tegen |
|---|---|---|
| **Naam wijzigen, nu** | Eén keer pijn, en het is nu goedkoop: de app is nog niet verkocht, de domeinnaam is nog niet gedrukt. Voorkomt dat je straks als kopie oogt, terwijl je er eerder was. | Alle UI-copy, documentatie en het woordmerk moeten om. Ongeveer een dag werk, plus het bedenken. |
| **Naam houden** | Nul werk. En je was er eerder. | Zodra InSpace lanceert ben jij in de perceptie de kopie, niet zij. Zij hebben 400 klanten, negen vacatures en een marketingmachine. Bij verwarring verliest de kleinste partij. |
| **Naam houden, merk vastleggen** | Behoudt de naam en bouwt een verdediging. | Kost geld en tijd, en een Benelux-merkregistratie op een generiek woord in dezelfde klasse is geen zekerheid. |

**Mijn advies: wijzigen, en snel.** Niet omdat je ongelijk hebt, maar omdat je het gevecht om een
naam niet gaat winnen van een partij met dit budget, en de tijd die je erin steekt beter naar het
product gaat. De kosten zijn nu het laagst die ze ooit zullen zijn.

**BESLUIT, 10 augustus 2026: de app blijft Aura heten.** De eigenaar heeft het advies gewogen en
kiest voor houden. Daarmee is dit gesloten; het staat hier alleen nog als vastgelegde afweging, niet
als open punt. Er verandert niets aan de code, de documentatie of het woordmerk.

Wat wél verstandig is, en geen naamswijziging vraagt: zorg dat de eerste vermelding van Aura altijd
zegt wát het meet ("Aura meet je zichtbaarheid in AI-antwoorden"), niet alleen hoe het heet. Bij
verwarring wint de partij die het duidelijkst uitlegt wat hij doet, en dat is een schrijfregel, geen
merkregistratie.

### 12.2 De volgorde, herzien

Het onderzoek verandert één ding aan het plan uit §7: **fase 6 wordt kleiner en fase 1 iets groter.**

- "Nova insights" bleek één zin te zijn (§11.4), niet een module. Fase 6 gaat van 6 naar **4 dagen**.
- Het merkbrein als telbaar ding (§11.3) en de uitleg-zin onder de grafiek (§11.6) horen op het
  overzicht van fase 1. Die gaat van 5 naar **6 dagen**.

Totaal blijft daarmee ongeveer 51 dagen.

Wat níet verandert: de vier besluiten uit §0, en de aanbeveling om fase 1, 4 en 6 te doen als je
moet kiezen. Dat advies wordt door dit onderzoek juist sterker, want de meetkant waar Aura op
voorloopt is precies de kant die InSpace nog niet heeft.

---

## 13. De velden van de onboarding, compleet

Besluit: **overnemen wat InSpace uitvraagt, automatisch invullen wat Aura kan afleiden, en alles
corrigeerbaar maken.** Dit hoofdstuk is de complete inventaris, uit beide i18n-bestanden, met per
veld of Aura het al heeft en of het vanzelf gevuld kan worden.

**Drie kolommen om te lezen:**

- **Aura nu**: staat het al in de database? (`profiles`-kolom, of nieuw)
- **Vanzelf**: kan de pijplijn dit invullen zonder de klant iets te vragen?
- **Vragen**: moet de klant het alsnog zien en kunnen corrigeren?

De regel die overal geldt: **wat Aura zelf invult krijgt het label "Uit je website gehaald"** (Nova's
`brand.draftedBadge`), staat in een gewoon invoerveld, en is dus altijd te overschrijven. De klant
ziet nooit een leeg formulier van dertig velden, maar wel dertig velden die hij mág nakijken.

### 13.1 Bedrijfs- en facturatiegegevens

Allemaal nieuw voor Aura, en geen ervan is af te leiden. Dit hoort bij het account, niet bij het
merk (besluit 10: één account, meerdere websites).

| Veld | Bij InSpace | Aura nu | Vanzelf | Opmerking |
|---|---|---|---|---|
| Bedrijfsnaam (juridisch) | `companyName` | Nieuw | Nee | |
| Adres, postcode, plaats, land | `address`, `postalCode`, `city`, `country` | Nieuw | Nee | Land als keuzelijst |
| Btw-nummer | `vatNumber` | Nieuw | Nee | InSpace valideert live tegen VIES en heeft een "ik heb er geen"-vinkje |
| Factuur-e-mail | `invoiceEmail` | Nieuw | Nee | |
| Contactpersoon, e-mail, telefoon | `contactPerson`, `contactEmail`, `contactPhone` | Nieuw | Nee | ⚠️ InSpace waarschuwt expliciet dat dit e-mailadres óók het inlogadres is |
| Communicatietaal | `languageLabel` | Nieuw | Nee | Bij Aura altijd Nederlands (besluit 13), dus **weglaten** |

**Overnemen, met twee afwijkingen**: de VIES-validatie slaan we over (leuk, maar het is een externe
koppeling voor een veld dat je één keer invult), en de taalkeuze vervalt.

### 13.2 De website

| Veld | Bij InSpace | Aura nu | Vanzelf | Opmerking |
|---|---|---|---|---|
| Domein | `domainLabel`, hint "geen https:// of www." | `profiles.url` | Deels | Aura vraagt dit al in `onboarding-wizard.tsx` |
| Bevestiging met voorvertoning | `websiteCheckTitle` "Is this your website?" | Nieuw | n.v.t. | Schermafbeelding van de site naast het domein |
| Meerdere websites | `domainProgress` "Website {current} of {total}" | Nieuw | Nee | Volgt uit besluit 10 |
| Sitemap, maximum pagina's | geen | `sitemap_url`, `max_inventory_pages` | Ja | **Aura heeft dit en InSpace niet.** Blijft achter "geavanceerd" |

### 13.3 Merkfundament

Hier zit de meeste winst, want Aura leidt dit al af maar laat het niet zien.

| Veld | Bij InSpace | Aura nu | Vanzelf | Opmerking |
|---|---|---|---|---|
| Kerncategorie | `brandCoreCategory` "B2B SaaS, E-commerce fashion" | `industry`, `business_model` | **Ja** | `profile_research` levert dit |
| Branche (keuzelijst) | `industry`, 16 opties plus "anders" | `industry` als vrije tekst | **Ja** | Overnemen als keuzelijst met dezelfde 16 |
| Missie | `brandMission` | Nieuw | **Ja** | Af te leiden uit de synthese |
| Kernwaarden | `brandValuePillars` | `value_props` | **Ja** | |
| Positionering | `brandPositioning` | Nieuw | **Ja** | Af te leiden uit `profile_market` |
| Bewijspunten | `brandProofPoints` "500+ klanten, 10 jaar ervaring" | `proof_points` | **Ja** | Aura heeft dit al en gebruikt het in de schrijfprompt |
| USP | `uspLabel` | Nieuw | Deels | Overlapt met `value_props`, samenvoegen |
| Kernboodschappen | `keyMessagesLabel` | Nieuw | **Ja** | |
| Identiteitswoorden | `identityKeywords` "innovatief, betrouwbaar" | Nieuw | **Ja** | |
| Concurrenten (max 3) | `competitors` | `competitors`, plus `entities` | **Ja** | **Aura is hier verder**: acht namen mét onderbouwing, en een eigen tabel. Geen maximum van drie. |
| Onderscheid | `usVsThem` | Nieuw | **Ja** | |

### 13.4 Doelgroep

| Veld | Bij InSpace | Aura nu | Vanzelf | Opmerking |
|---|---|---|---|---|
| Primaire doelgroep | `primaryAudience` | `personas`, `intake_audience` | **Ja** | |
| Secundaire doelgroep | `secondaryAudience` | `personas` | **Ja** | |
| Kennisniveau | `audienceKnowledgeLevel`: basis, professional, expert | Nieuw | Deels | Drie standen, hoort bij de schuiven |
| Geografische identiteit | `geoIdentity` "Nederland, DACH, wereldwijd" | `service_scope`, `service_regions` | **Ja** | Aura heeft dit al fijnmaziger |

### 13.5 Tone of voice

Aura heeft vier van de vijf schuiven al (migratie `0045`).

| Schuif | Standen bij InSpace | Aura nu |
|---|---|---|
| Formaliteit | Informeel, semi-formeel, formeel | `tone_formality` ✅ |
| Energie | Rustig, gebalanceerd, energiek | `tone_energy` ✅ |
| Complexiteit | Eenvoudig, toegankelijk expert, diep expert | `tone_complexity` ✅ |
| Humor | Geen, subtiel, speels | `tone_humor` ✅ |
| **Emotionele lading** | Neutraal, geruststellend, enthousiast, urgent | **Ontbreekt** |
| Merkpersoonlijkheid (vrije tekst) | `tovPersonality` | `tone_of_voice` ✅ |
| Schrijfstijl (vrije tekst) | `writingStyleLabel` | `tone_of_voice` ✅, samenvoegen |

**Te doen**: één schuif toevoegen (`tone_emotional`, vier standen), en die net als de andere door
`tone-sliders.ts` naar prompttaal vertalen, nooit het cijfer zelf naar het model.

### 13.6 Woorden en taalgebruik

| Veld | Bij InSpace | Aura nu | Vanzelf |
|---|---|---|---|
| Vaste uitdrukkingen | `signaturePhrases` | Nieuw | **Ja**, uit `style_samples` |
| Verboden woorden | `tabooPhrases` | `taboo_phrases` ✅ | Nee |
| Aanspreekvorm | `pronounLabel`: informeel, formeel, wij | Nieuw | Deels | 
| Wet- en regelgeving | `lawsAndRegulations` | `compliance_notes` ✅ | Nee |
| Extra nalevingsnotities | `additionalComplianceNotes` | `compliance_notes` ✅ | Nee |

De aanspreekvorm is de moeite waard: `docs/schrijfstijl.md` legt "je en jij" vast voor Aura's eigen
interface, maar de content die Aura vóór een klant schrijft moet de aanspreekvorm van díe klant
volgen. Een advocatenkantoor wil "u".

### 13.7 Auteur

Aura heeft de kern al (migratie `0045`).

| Veld | Bij InSpace | Aura nu |
|---|---|---|
| Naam, functie, korte biografie | `authorName`, `authorRole`, `shortDescription` | ✅ |
| LinkedIn | `linkedIn` | ✅ |
| Foto | `authorPhoto`, max 2 MB | Ontbreekt |
| Facebook, overige socials | `facebook`, `otherSocials` | Ontbreekt |
| Auteurspagina laten maken | `createAuthorPage` | Ontbreekt, en **niet overnemen** |

InSpace publiceert desgewenst zelf een auteurspagina op de site van de klant. Dat kan niet zonder
CMS-koppeling, dus dat vervalt. De foto en de extra socials wel overnemen: die gaan mee in de
`schema.org`-opbouw die Aura al heeft (`lib/schema-jsonld.ts`), en dat is precies een signaal waar
AI-assistenten entiteiten mee herkennen.

Let op de eis die InSpace erbij zet, en die is inhoudelijk goed: *"de auteur moet een echt persoon
zijn die bij het bedrijf werkt en online vindbaar is"*. Die zin hoort erbij te staan.

### 13.8 Koppelingen

| Veld | Bij InSpace | Aura |
|---|---|---|
| Google Search Console | Verplicht, blokkerend, met verifieerknop | **Overnemen**, fase 5 |
| Google Analytics | Optioneel | **Niet overnemen**, zie `zoekdata-koppeling.md` |
| Microsoft Clarity | Optioneel | Niet overnemen |
| CMS | Verplicht | **Buiten scope** |

### 13.9 Wat dit bij elkaar betekent

Van de ongeveer **veertig velden** die InSpace uitvraagt:

| | Aantal | Wat we ermee doen |
|---|---|---|
| Aura heeft ze al | 14 | Zichtbaar maken in de wizard, met het "uit je website gehaald"-label |
| Aura kan ze afleiden | 11 | Nieuw veld, gevuld door de pijplijn, corrigeerbaar |
| Moet de klant invullen | 11 | Bedrijfs- en facturatiegegevens, verboden woorden, auteur |
| Vervalt | 4 | Taalkeuze, CMS, auteurspagina, Google Analytics |

**De belangrijkste uitkomst**: de klant hoeft er maar elf zelf in te typen, en dat zijn precies de
elf die niemand kan raden. De rest staat er al ingevuld als hij het scherm opent. Dat is een
wezenlijk betere onboarding dan die van InSpace, waar de klant twintig minuten uittrekt
(`landingTimeNote`), en het kan omdat Aura's onderzoek vooraf draait in plaats van erna.

**Gevolg voor fase 3**: de wizard krijgt vier stappen in plaats van zes, want de merkstappen zijn
grotendeels nakijkwerk geworden:

1. **Bedrijfsgegevens** (elf velden, leeg, verplicht)
2. **Je website** (bevestigen, plus de scan)
3. **Je merk** (alles vooringevuld, in vier blokken: fundament, doelgroep, stem, woorden)
4. **Nakijken en starten** (`assessReadiness()`, bestaat al)

---

## 14. Hoe dit document zich verhoudt tot de rest

| Bestand | Wat er in blijft staan |
|---|---|
| `docs/nova-i18n.json` | De ruwe bron. Niet bewerken, dit is een kopie van wat Nova uitzendt. Tien namespaces, ~900 sleutels. |
| `docs/inspace-app-i18n.json` | Dezelfde truc op de oudere `app.inspace.io`: 21 namespaces, 1.469 sleutels. Bevat de strategie- en creation-schermen die Nova niet prijsgeeft. De bron onder §11.1. |
| `docs/inspace-marketing.txt` | De zichtbare tekst van `inspace.io/nl-nl`. De bron onder §11.3 tot §11.6, en onder de naamvondst in §12.1. |
| `docs/tasks/nova-analyse.md` | **De diepe inventaris** van bèide InSpace-apps: functiematrix, statusmachines, flows, en §8 met wat ze in de herbouw lieten vallen. Dit document verwijst ernaar, herhaalt het niet. |
| `docs/tasks/zoekdata-koppeling.md` | De Search Console-koppeling, al uitgezocht tot op de implementatiekeuze. De bron voor fase 5. |
| `docs/architecture.md` | Het datamodel zoals het nú is. Per fase bijwerken. |
| `docs/ux-design.md` | De componentregels. Fase 0 vult hem aan. |
| `docs/designsystem.md` | Waar de kleuren vandaan komen. Blijft de bron voor tokens. |
| `docs/logbook.md` | Per afgeronde fase een alinea, met het cijfer eronder. |
| `docs/tasks/` | Per fase één bestand bij aanvang, weg bij afronding. |
| **Dit bestand** | De richting. Wijzigt alleen als een besluit uit §0 wijzigt. |
