# Nova naast ORBIT ENGINE: het proces van eerste contact tot gemeten pagina

> **Voor wie dit is.** De eigenaar en iedereen die wil weten waar het proces van ORBIT ENGINE
> logischer kan, met het proces van InSpace Nova ernaast. Leesbaar zonder code.
>
> **Peildatum: 15 september 2026.** Alles over ORBIT ENGINE is nagerekend tegen de code op `main`,
> niet overgenomen uit documentatie. Waar de code en een bestaand document elkaar tegenspreken,
> staat dat er expliciet bij.
>
> **Eén randvoorwaarde staat vooraf vast, en het hele hoofdstuk 9 gaat erover:** ORBIT ENGINE gaat
> niet automatisch publiceren. Dat is een opdracht van de eigenaar, geen conclusie van dit document.
> Wat er wél uit Nova's publicatiestap te halen valt zonder die koppeling, staat in §9.1.

---

## 0. Waar dit op gebaseerd is, en wat je er niet uit kunt weten

### 0.1 De bronnen

| Bron | Wat het is | Omvang |
|---|---|---|
| `docs/nova-i18n.json` (verwijderd, zie `docs/logbook.md`) | De complete tekstcatalogus van de huidige Nova-app (`nova.inspace.io`), uit de server-gerenderde HTML van de inlogpagina | 10 namespaces, 971 teksten |
| `docs/inspace-app-i18n.json` (verwijderd, zie `docs/logbook.md`) | Dezelfde truc op de oudere app (`app.inspace.io`), de vorige generatie van hetzelfde product | 21 namespaces, 1.469 teksten |
| `docs/inspace-marketing.txt` (verwijderd, zie `docs/logbook.md`) | De marketingsite van InSpace, inclusief productmenu, prijsstructuur en vacatures | 14 kB |
| `Nova_onboarding.md` | Een eerdere reconstructie van alleen de onboarding, uit augustus 2026 | 25 kB |
| De code op `main` | ORBIT ENGINE zelf: routes, jobtypes, datamodel, pijplijnmodules | 49 schermen, 48 taaksoorten |

De twee catalogi samen zijn 2.440 losse teksten. Dat is elk scherm, elk invoerveld, elke status,
elke knop, elke foutmelding en elke bevestigingsdialoog van beide apps, inclusief de schermen waar
je alleen na inloggen komt. Het bestand dat je noemde (`nova-messages.json`, 103 kB) zat niet in
deze werkomgeving, maar het is dezelfde data: de twee catalogi in de repo zijn samen 131 kB en
dekken allebei de apps volledig.

### 0.2 De grens van wat een tekstcatalogus je vertelt

Dit moet je bij elke conclusie hieronder in je achterhoofd houden.

**Wat je zeker weet.** Dat een scherm bestaat. Welke velden erop staan. Welke statussen een pagina
kan hebben. Wat er gebeurt als iets misgaat, want elke foutmelding staat erin. Wat Nova aan de klant
belooft, letterlijk, in hun eigen woorden.

**Wat je afleidt.** De volgorde van de stappen. Die volgt uit de sleutelvolgorde, uit teksten als
"Website {current} of {total}" en uit wat een scherm logischerwijs nodig heeft van het vorige. Ik
heb dat gemarkeerd als **(afgeleid)** waar het ertoe doet.

**Wat je niet weet.** Wat er op hun server gebeurt. Welk model ze gebruiken, wat het kost, hoe goed
het werkt, hoe vaak het misgaat, hoeveel klanten de stap afmaken. Een catalogus zegt wat er
aangeboden wordt, niet of het werkt.

### 0.3 De asymmetrie die alles kleurt

Over 2.440 teksten van beide Nova-apps samen: **nul treffers** op `citation`, `chatgpt`,
`perplexity`, `llm` en `generative engine`. De enige treffers op "geo" gaan over geografische
identiteit ("Geographic Identity: the regions or countries your brand serves"), niet over
Generative Engine Optimization. De twee treffers op "mention" zijn beide dezelfde placeholder over
concurrenten niet noemen.

**Nova meet Google, niet AI-antwoorden.** Hun hele meetlaag is Google Search Console: kliks,
vertoningen, gemiddelde positie, doorklikratio, indexeringsstatus. De "AI-citaties 312" op hun
marketingsite hoort bij een product dat nog moet komen, en dat product heet in hun eigen menu
**ORBIT ENGINE**, met een pre-registratieknop eronder.

Dat betekent dat dit document twee dingen tegelijk vergelijkt die niet dezelfde soort zijn:

- **Het meetinstrument.** Daar loopt ORBIT ENGINE voor. Nova heeft er niets.
- **De machinerie eromheen**, van verkoop tot factuur tot maandplan tot publicatiewachtrij. Daar
  loopt Nova voor, en dat is precies waar dit document over gaat.

Je haalt uit Nova dus geen meetideeën. Je haalt eruit hoe je een klant van "getekend contract" naar
"elke maand verschijnen er pagina's" brengt zonder dat iemand onderweg vastloopt.

---

## 1. Het proces naast elkaar, in één tabel

Dertien stappen, van eerste contact tot bewezen effect. De kolom "ORBIT ENGINE" zegt wat er vandaag
echt staat, niet wat er gepland is.

| # | Stap | Nova | ORBIT ENGINE | Wie loopt voor |
|---|---|---|---|---|
| 1 | Verkoop | Contract getekend, CSM toegewezen, werkruimte en factuurgegevens voor-ingevuld uit HubSpot | Consultant maakt merk aan met drie velden, pijplijn doet onderzoek, verkoop gebeurt op de uitkomst | ORBIT ENGINE |
| 2 | Uitnodiging | Tijdgebonden, eenmalige link. Drie foutstaten: ongeldig, verlopen, al gebruikt | Tijdgebonden uitnodigingslink, registreren zonder uitnodiging kan niet | Gelijk |
| 3 | Account activeren | Werkmail al geverifieerd, klant kiest alleen een wachtwoord | Zelfde patroon, met dezelfde drie wachtwoordregels | Gelijk |
| 4 | Bedrijfs- en factuurgegevens | Eigen onboardingstap, voor-ingevuld uit het contract, per blok te bewerken | Staat er wel (`/instellingen`), maar niet als stap in een route die iemand doorloopt | Nova |
| 5 | Website koppelen | Klant bevestigt het domein, live bereikbaarheidscheck, dan een zichtbare scan met voortgang | Consultant vult het adres in bij het aanmaken, de crawl start meteen en is zichtbaar per stap | Gelijk, andere volgorde |
| 6 | Betaling | SEPA-incasso via Stripe of factuur, met machtiging in de app. Overslaan mag, lanceren niet | **Ontbreekt volledig.** Het pakket is een kolom die iemand met de hand vult | Nova |
| 7 | Merkprofiel | Zes stappen die de klant invult, met wat de scan vond als concept eronder | Zeven stappen met 45 velden die de klant **nakijkt**, met per veld waar de waarde vandaan komt | ORBIT ENGINE |
| 8 | Koppelingen | CMS verplicht, Search Console optioneel, Analytics en Clarity optioneel, alles in de onboarding | Alleen Search Console, alleen voor de consultant, buiten elke route om | Nova |
| 9 | Lanceren | Eén knop, "Launch NOVA". Start het abonnement en genereert het eerste contentplan | **Bestaat niet.** Er is geen enkel moment waarop "merk klaar" overgaat in "programma loopt" | Nova |
| 10 | Strategie opstellen | CSM vult funnels, talen, doelland en drie vragen in, dan genereert een agent twaalf maanden | Klant of consultant maakt per onderwerp een cluster, laat 30 vragen opstellen, keurt ze goed, laat meten | Verschillend van aard |
| 11 | Maandplan en goedkeuring | Klant keurt per maand goed, of wijst af en laat de hele strategie opnieuw genereren | Voorraad die uit metingen komt, de klant verdeelt hem over maanden en geeft per maand vrij | ORBIT ENGINE |
| 12 | Schrijven en nakijken | Geschreven ongeveer tien dagen voor de publicatiedatum, versiehistorie, chatassistent in de oudere app | Geschreven tien dagen vooruit door dezelfde soort cron, met vier onafhankelijke keuringen en drie herstelrondes | ORBIT ENGINE |
| 13 | Publiceren | Drie modellen: Nova plaatst zelf, concept in het CMS, of handmatige wachtrij | Alleen handmatig. De klant plakt en vult de live-URL in, de app controleert of de pagina er echt staat | Bewust verschillend |
| 14 | Nameten | Google Search Console: kliks, vertoningen, positie, indexering, per pagina en per maand | Dezelfde Search Console-koppeling, plus hermeting van precies de doelvragen met controlegroep | ORBIT ENGINE |
| 15 | Beheerscherm | Waar lopen we achter met genereren en plaatsen, vier kengetallen en een lijst | Zeven segmenten op "bij wie ligt de bal en hoe lang al" | Gelijk, zelfde idee |

---

## 2. Nova, stap voor stap

Alles tussen aanhalingstekens is letterlijk uit hun catalogus. De duiding eromheen is van mij.

### 2.1 Voordat de klant iets ziet

Sales sluit de deal. Daaruit volgt een contract ("agreement"), een toegewezen CSM, en een
werkruimte waarin de bedrijfsgegevens al staan. De oudere app verraadt waar die vandaan komen:
*"Prefilled from our records. Click Edit if you need to change anything."* en, explicieter,
`prefilledFromHubspot`. Het CRM is dus de bron, en de onboarding is een controleformulier.

Er zit een sanity check op die nergens anders in beide apps voorkomt: *"The address country
({country}) doesn't match your sales region ({region}). Please contact your sales contact person
before continuing."* Dat is een verkoopadministratie die zichzelf bewaakt op het moment dat de klant
zijn adres invult.

### 2.2 Activeren

Badge "SECURED INVITATION", titel "Welcome to NOVA". De werkmail staat er al, met een groene
"VERIFIED" ernaast. De klant vult alleen een wachtwoord in, met drie live afvinkende regels: acht
tekens, een cijfer, een hoofdletter.

Drie foutstaten, elk met een eigen scherm: de link bestaat niet, de link is verlopen (*"For your
security, invitation links expire. Please contact your CSM to have a new one sent."*), en het
account is al actief. In alle drie de gevallen is de CSM de enige uitweg. Er is geen zelfbediening.

### 2.3 Bedrijfs- en factuurgegevens

Kicker "YOUR ACCOUNT", titel "Company & billing details". De zin eronder zegt precies wat dit scherm
is: *"These appear on your invoices. Prefilled from your contract, just check them over."*

Drie blokken, elk los te bewerken met een eigen opslaan- en annuleerknop: bedrijfsgegevens
(rechtsnaam, adres, plaats, postcode, land, btw-nummer met een vinkje "I don't have a VAT number"),
factuurgegevens (factuur-e-mail) en contactpersoon (naam, e-mail, telefoon). Er is ook een
communicatietaal, want Nova bedient Nederland, België, Duitsland, Ierland, het Verenigd Koninkrijk
en de Verenigde Staten.

Het btw-nummer wordt in de oudere app live gevalideerd tegen VIES, het Europese systeem:
`vatValidating` is *"Checking with VIES…"*. In de huidige Nova-app staat die tekst er niet meer.

Eén detail dat een fout voorkomt die je anders pas weken later merkt: *"Heads up: this also updates
your login email. The contact email you set here is the same email you use to log in to the
dashboard."* Met een tweede bevestiging erachter die de oude en de nieuwe waarde naast elkaar zet.

### 2.4 De website, en de scan

Titel "Confirm your website", met de tekst *"We found this website connected to your business.
Please check the address to make sure it is correct"*. Dus ook het domein komt uit de verkoopfase.

Bij meerdere websites loopt de klant hier per domein doorheen, met "Website {current} of {total}"
in de zijbalk.

Zodra het domein bevestigd is start een scan met een voortgangsbalk. De huidige app toont er negen
sfeerteksten bij ("Locking onto your coordinates…", "Scanning the homepage nebula…", "Almost through
the wormhole…") en daarnaast een blokje **"NOVA is learning"** met vijf regels die wél zeggen wat er
echt gebeurt: Homepage, Products & services, Target audience, Tone of voice, Content topics.

De oudere generatie van hetzelfde scherm was expliciet over wat er gecrawld werd: de homepage,
interne links, titels en meta-beschrijvingen, indexeerbaarheid, koppenstructuur, producten en
diensten, toon van stem, bestaande rankings en een vergelijking met concurrenten.

Drie uitkomsten, alle drie met een eigen tekst: gelukt, mislukt (*"We couldn't finish the scan, so
some brand fields may be empty, you can still fill them in on the next steps"*) en niet van
toepassing (*"This is a new site, so there's nothing to scan yet"*).

### 2.5 Betaling

Titel "Set up your direct debit". SEPA-incasso via Stripe, met de wettelijke machtigingstekst en de
terugboektermijn van acht weken erin. *"Your bank details are encrypted and stored by Stripe, never
on our servers."*

Drie dingen zijn slim aan dit scherm:

1. **Overslaan mag, lanceren niet.** *"Need a colleague to add the bank details? Use Skip for now,
   we'll remind you."* Een ondernemer heeft zijn IBAN niet altijd bij de hand, en een muur op dit
   punt kost je de hele onboarding.
2. **Er is een menselijke uitweg die genoemd wordt vóór je hem nodig hebt.** *"Stuck for a while?
   Your CSM can send a one-off manual invoice instead."*, met telefoonnummer en mailadres eronder.
3. **De ergste fout heeft een eigen tekst.** *"Your mandate was authorised, but we couldn't save it
   on our end."* Dat is het geval waarin de klant al getekend heeft en het systeem het kwijt is, en
   daar staat letterlijk dat de machtiging wél gelukt is.

### 2.6 Het merkprofiel

Zes stappen onder de kicker "YOUR BRAND", elk met een titel en één regel uitleg eronder:

| Stap | Titel | Wat het uitvraagt |
|---|---|---|
| Positioning | "Your brand foundation" | Kerncategorie, missie, waardepijlers, positionering |
| Audience | "Who you're speaking to" | Primaire en secundaire doelgroep, "Us vs. Them", geografische identiteit |
| Voice | "How you sound" | Vijf schuiven (formaliteit, energie, complexiteit, humor, emotionele lading) plus merkpersoonlijkheid in vrije tekst |
| Words & language | "Words & language" | Kenmerkende uitdrukkingen, verboden woorden, aanspreekvorm, identiteitswoorden, wet- en regelgeving |
| Author | "Who publishes your content" | Naam, functie, bio, foto, LinkedIn, Facebook, overig, plus "wil je een auteurspagina" |
| Topics | "What you want to be known for" | USP, kernboodschappen, bewijspunten, concurrenten, branche |

Elk veld heeft drie lagen: een label, een beschrijving en een placeholder met een écht voorbeeld
erin ("B2B SaaS, E-commerce fashion, Healthcare services"). Dat is het verschil tussen een formulier
dat je invult en een formulier dat je begrijpt.

Twee patronen zijn hier het overnemen waard, en ORBIT ENGINE heeft ze allebei al:

- **`brand.draftedBadge`: "Drafted from your website".** Per veld staat waar de waarde vandaan komt.
- **De rail "Your strategy taking shape"** rechts in beeld, die tijdens het invullen meegroeit:
  "Voice defined", "{n} topics chosen". De klant ziet tijdens het werk waar het toe leidt.

### 2.7 Koppelingen

**Het CMS is verplicht.** De klant kiest zijn platform, geeft de inlog-URL, en geeft daarnaast
gebruikersnaam en wachtwoord of API-sleutel. Daarbovenop: *"Invite the NOVA team to your CMS with
full access. This user must be assigned full permissions."* Dat is geen OAuth-koppeling, dat is een
mens die een account aanmaakt voor een ander mens.

**Search Console is optioneel maar dringend.** Nova toont twee eigen serviceadressen die de klant
moet toevoegen, één met volledige rechten en één met beperkte, met een knop "Verify access" die
controleert of het gelukt is. De reden staat erbij: *"Connecting Search Console lets NOVA track how
your pages perform and prove the results."*

Google Analytics en Microsoft Clarity staan erbij als optioneel.

### 2.8 Lanceren

Het reviewscherm, "Ready to launch?", zet elke rij op één van drie standen: **Completed**,
**Skipped** ("you can add this after launch") of **Needs attention**. Als er nog iets open staat:
*"Finish these first: {items}"*.

En dan de zin die het hele scherm draagt: *"Everything checks out. Launching starts your
subscription and generates your first content plan."*

Eén knop. Daarachter beginnen tegelijk: het abonnement, de facturatie, en het eerste contentplan.

### 2.9 De strategie, en de rol van de CSM

Hier stopt de zelfbediening. De klant ziet: *"Your content strategy hasn't been created yet. Your
CSM will contact you once it's ready, and it'll show up here for you to review and approve."*

In het adminscherm vult de CSM per domein in:

- **Funnels**, minimaal drie en maximaal vijf, met vrije namen ("e.g. Awareness").
- **Talen**, met een standaardtaal die niet weg kan en extra locales als "nl-be".
- **Doelland**: *"The country we'll primarily aim the strategy at."*
- **"Brand-new site?"**: *"Yes means nothing exists yet. If pages or templates already exist, choose
  No."*
- **"Multilingual domain?"**
- **"Respect the current site structure"**: *"Tick this to keep building within the current URL
  structure instead of starting a new one, useful for clients whose site is already well organised."*

Dan drukt de CSM op "Generate strategy". Dat gaat naar een externe dienst
(`webhookNotConfigured`, `webhookFailed`), draait een paar minuten, en levert twaalf maanden
geplande pagina's op. De statussen zijn: niet gegenereerd, in de wachtrij, bezig, gegenereerd,
mislukt, bij de klant in review, goedgekeurd.

De oudere app maakt expliciet wat die strategie is: een **verdeling van paginatypen met aantallen**
over twaalf maanden, met de quota uit het abonnement als randvoorwaarde. *"Subscription plan 0{plan}
· {count} items per month"* en *"You are in contract month {current} of {total}"*. De strategie is
geversioneerd ("Strategy 0{version}") en kan gepurged worden, waarbij geplaatste en goedgekeurde
content blijft staan.

### 2.10 De klant keurt goed, per maand

Op de strategiepagina staan segmenten: "Awaiting your approval", "Being updated by your team",
"Approved". De klant keurt per maand goed, of meerdere maanden tegelijk.

Twee teksten die het gewicht van de knop laten voelen:

> *"Once approved, these pages are scheduled for posting. This can't be undone."*
>
> *"Declining discards this strategy and generates a new one."*

Dat tweede is drastisch en logisch tegelijk: je kunt een jaarplan niet half afwijzen, want de
verdeling over maanden en paginatypen klopt dan niet meer.

Per pagina kan de klant er één verwijderen, met: *"A buffer URL for its month will backfill the slot
if one is available."* Er staat dus voorraad klaar bovenop de quota, zichtbaar als "+{count}
buffer".

### 2.11 Schrijven en nakijken

Nova schrijft vooruit: *"This page's content will be generated around {date}, about 10 days before
its scheduled post date."*

Per pagina is er versiehistorie, een preview met de wijzigingen gemarkeerd, en drie manieren om in
te grijpen:

1. **Approve.** *"Approving will lock the draft in for publication on its scheduled date."*
2. **Request changes.** In de oudere app is dit een gesprek: een Content Assistant per pagina, met
   chatgeschiedenis, sessies die je afsluit door goed te keuren of af te wijzen, en de melding
   *"This session has been finalized. Messages are read-only."*
3. **Manual edit**, met een waarschuwing ervoor: *"This bypasses the Content Assistant's guided
   optimisation flow. Manual edits may affect indexing, keyword targeting, and on-page
   optimisation."* De knoppen heten "Keep using Content Assistant" en "Continue at my own risk".

De handmatige editor waarschuwt deterministisch, zonder AI: lege H1, lege paginatitel, lege
meta-beschrijving, primair zoekwoord niet gevonden in titel, H1 of tekst, en links zonder adres.

En er is "Restore version": *"This creates a new version copied from the version you're viewing and
makes it the current one. It will need approval before it goes live. Older versions are kept."*

### 2.12 Publiceren, in drie modellen

De statustaal verraadt dat er drie publicatiemodellen naast elkaar bestaan:

| Model | Wat de klant ziet |
|---|---|
| Nova publiceert zelf | "Scheduled to publish", "Publishing {date}", "Published {date}" |
| Concept in het CMS | "Waiting in your CMS" |
| Handmatig | "Manual posting", "Ready to publish", "Mark as posted" |

Het derde model heeft een eigen scherm, en dat is het model dat voor ORBIT ENGINE relevant is:

> **Manual posting queue.** *"Copy the approved content, publish it in the CMS, then mark it as
> posted."*

Met daarbij: "Mark all as posted" voor een hele lijst tegelijk, per pagina een pad-veld met het
domein vastgezet, en een waarschuwing die de onomkeerbaarheid in een eigen kader zet: *"This is
permanent: once you mark it as posted, the URL is locked and can't be changed afterwards."* Plus een
kopieerdialoog met twee tabbladen: *"Choose the format that matches the CMS workflow"*, HTML of
platte tekst.

### 2.13 Meten

Overview en Analytics draaien volledig op Google Search Console: kliks, vertoningen, trend per
pagina, gemiddelde positie, doorklikratio, indexeringsstatus, en een vergelijking met vorig jaar.

Drie blokken die over het programma gaan in plaats van over data:

- **Funnel progress**: geplaatst tegenover gepland per funnelfase.
- **Milestones**: "Growing with NOVA since", "Search click growth since you started", "Pages
  published with NOVA".
- **Leaderboard**: de best presterende pagina's van deze periode.

En vier lege staten die elk iets anders zeggen, wat precies goed is: Search Console niet gekoppeld,
nog niets gepubliceerd, data wordt nog verzameld ("usually appears within a few days"), en geen
toegang tot Search Console voor deze site.

### 2.14 Het CSM-overzicht

Titel: "CSM Overview". Omschrijving: *"Where we are falling behind on generating and posting client
content."* Vier kengetallen: achter met plaatsen, achter met genereren, wacht op goedkeuring,
pijplijnfouten. Daaronder per klant: maand zoveel van twaalf, quota per maand, gegenereerd,
geplaatst, laatste publicatie, en vlaggen.

Het is nadrukkelijk een operationeel scherm. Het meet niet hoe goed het gaat, het meet waar het
vastloopt.

---

## 3. ORBIT ENGINE, stap voor stap

Nagerekend tegen de code, met de plek erbij.

### 3.1 Merk klaarzetten, vóór er contact is

De consultant vult drie velden in: bedrijfsnaam, webadres, andere schrijfwijzen
(`/merk/nieuw`). Alles wat hij typt krijgt de herkomst `consultant`, en dat is een eigen soort,
anders dan `klant`, `gesprek` en `ai`. Het onderzoek mag die aanname tegenspreken, niet stilletjes
overschrijven.

Een klant kan geen merk aanmaken. Dat is geen beperking maar een rem: aanmaken zet betaald onderzoek
in gang.

### 3.2 Acht onderzoekstaken, ongeveer 7,5 minuut, ongeveer 25 dollarcent

De keten start vanzelf: site uitlezen tot 150 pagina's, merk en markt leren kennen, aanbod als boom
in kaart brengen, concurrenten en marktbronnen uitzoeken, technische controle, vijf tot acht
onderwerpen voorstellen, testen wat AI-assistenten al weten, alles samenbrengen tot één dossier.

Drie eigenschappen die Nova niet heeft:

- **Een stap die niets vindt, toont een waarschuwing in plaats van een vinkje.** Weten dat er iets
  ontbreekt is iets anders dan denken dat alles klopt.
- **Er is een kostenplafond per merk en een dagplafond over alles heen.** Loopt het op, dan valt een
  stap weg en wordt dát vastgelegd.
- **Elke taak controleert eerst of zijn resultaat al bestaat**, zodat een herhaalde poging nooit
  voor niets betaalt.

De vierde stap, de kennistest, heeft geen equivalent bij Nova en is het hart van het product: kent
ChatGPT dit bedrijf, klopt wat hij zegt, welke bronnen haalt hij aan, zijn er bedrijven met een
bijna gelijke naam.

### 3.3 Het gesprek

Eén scherm (`/merk/[id]/admin/onboarding`), gemaakt om te delen. Geen bedragen, geen technische
taaknamen, geen foutmeldingen. Zes blokken.

Bovenaan staat **wat we nog niet weten**, gesorteerd op wat het kost om die fout pas later te
ontdekken. Het werkgebied staat vrijwel altijd bovenaan, want dat bepaalt of de meetvragen regionaal
of landelijk gesteld worden, en dat merk je pas na een betaalde meting.

Dan **twaalf commerciële velden** die een website nooit kan vertellen: waar je op wilt groeien en
waar juist niet, de klantgroepen waar de groei zit, plaatsen waar je nog niet zit, wat een klant
ongeveer waard is, je seizoenspatroon, de bezwaren die je steeds hoort, waar niet over geschreven
mag worden, bewijs dat niet op je site staat, gelijknamige bedrijven die jij niet bent, of er nieuwe
pagina's bij mogen, en waar je over een jaar wilt staan.

Elk veld slaat zichzelf op zodra je eruit klikt. Er is geen opslaanknop, want een gesprek springt en
wordt onderbroken. Elk veld kan op "niet van toepassing", want een merk zonder auteur heeft geen
auteursbio, en dat is geen gat maar een antwoord.

Na afloop: **onderzoek bijwerken**, met een kostenschatting vooraf, en alleen de stappen die door de
wijziging geraakt worden. Tien van de vijftien velden leveren bewust niets op.

### 3.4 Overdragen

Twee handelingen: een uitnodiging sturen en het merk toewijzen aan het klantaccount
(`/merk/[id]/admin/toewijzen`). Het merk gaat naar de stand "Overgedragen". De consultant houdt
volledige toegang.

### 3.5 Wat de klant dan heeft

Een overzicht, een merkdossier met 45 velden in zeven stappen, en een lijst openstaande vragen. Elk
veld toont waar de waarde vandaan komt. Hij vult niet in, hij kijkt na.

> **Nagerekend, en dit wijkt af van wat er gedocumenteerd staat.** `APP_FLOW_DOCUMENTATION.md` §6.7
> en het commentaar boven `lib/pipeline/brand-fields.ts` zeggen allebei "41 velden in zeven
> stappen". De code heeft er inmiddels **60**: 45 in de zeven stappen die de klant ziet, plus twaalf
> strategievelden en drie contactvelden die alleen op de sessiepagina staan. Het getal 41 is
> achterhaald, de zeven stappen kloppen nog.

### 3.6 Een cluster opzetten en meten

De klant of consultant kiest een onderwerp. ORBIT ENGINE onderzoekt wat de site erover zegt, wie
hier de concurrenten zijn, en stelt 30 koopvragen op, verdeeld over oriëntatie, overweging en
beslissing. Per vraag komt er een inschatting van hoe vaak die gesteld wordt.

**Dan stopt de app.** De klant ziet elke vraag, past aan, verwijdert wat niet past, en klikt op
"Bevestig en start meting". Pas na die klik wordt er geld uitgegeven.

De meting stelt alle 30 vragen met live websearch, beoordeelt per antwoord welke merken genoemd
worden, telt vragen waarin geen enkele aanbieder genoemd wordt apart (niet als verlies), en levert
één score met een foutmarge op.

### 3.7 Van meting naar plan

Twee bronnen van pagina-ideeën, en de tweede is de reden dat er niets stilzwijgend mist:

1. De vragen waarbij het merk gemist werd.
2. De aanbodboom naast de bestaande pagina's: welke dienst heeft nog geen eigen pagina.

Die aanbevelingen komen in de voorraad van het contentplan (`/merk/[id]/strategie/plan`). De klant
verdeelt ze over maanden. Een goedgekeurde maand krijgt schrijftaken zodra de publicatiedatum binnen
tien dagen komt, precies zoals Nova.

### 3.8 Schrijven

Per pagina: onderzoek naar wat deze pagina nodig heeft, een contentcontract met per sectie de vraag
en het vereiste bewijs, een feitenkaart, en een berekening van hoeveel van het contract met een feit
onderbouwd kan worden. Dat percentage bepaalt of er geschreven mag worden.

Dan de briefing: een claim-audit levert vragen op aan de klant, overlappende vragen worden
samengevoegd, en er geldt een plafond op de optionele vragen. Een vraag die een kernsectie dekt is
verplicht.

Dan schrijven, vier onafhankelijke keuringen, een kwaliteitspoort, en maximaal drie herstelrondes
waarin alleen de secties met een concrete bevinding teruggaan naar het model. Alleen bij een echte
verbetering blijft de nieuwe versie staan.

### 3.9 Publiceren en nameten

De klant geeft vrij, plakt de tekst zelf op zijn site, en vult de live-URL in. De app controleert
daarna echt: is de pagina bereikbaar, staat de tekst er (steekproef van acht zinnen, ondergrens 60
procent), staat de metadata erop, ben je via een doorverwijzing ergens anders uitgekomen.

Daarna: hermeting na 14 en na 28 dagen, van precies de doelvragen plus een controlegroep, met een
verdict. En maandelijks draait de hele meting opnieuw.

---

## 4. Wat Nova heeft en ORBIT ENGINE niet

Gesorteerd op hoe hard het de keten raakt. "Waar" is de plek in Nova, en de plek waar het in ORBIT
ENGINE zou landen.

| # | Functie | Waar bij Nova | Waar het bij ORBIT ENGINE zou horen | Gewicht |
|---|---|---|---|---|
| 1 | **Eén lanceermoment** dat abonnement, facturatie en eerste plan tegelijk start | `onboarding.brand.review`, knop "Launch NOVA" | Een nieuw scherm tussen overdragen en het eerste cluster | Zwaar |
| 2 | **Betaling in de app**: SEPA-machtiging via Stripe, factuurroute als alternatief, mandaatstatus | `onboarding.payment` | `/instellingen`, naast de bedrijfsgegevens die er al staan | Zwaar |
| 3 | **Een doorlopende onboardingroute voor de klant zelf**, met zijbalk, voortgang, "{percent}% complete" en overslaan-met-herinnering | `onboarding.nav`, `onboarding.footer` | Tussen het aanvaarden van de uitnodiging en het merkdossier | Zwaar |
| 4 | **Koppelingen als onboardingstap** met een verifieerknop en een reden erbij | `onboarding.brand.searchConsole`, `.cms` | `/instellingen/koppelingen`, nu alleen voor de consultant | Zwaar |
| 5 | **Handmatige publicatiewachtrij**: één scherm met alles wat klaarstaat, bulk-afvinken, kopiëren in twee formaten | `strategy.manualPostingQueue`, `content.copyContent*` | `/merk/[id]/strategie/bibliotheek` | Middel, zie §9.1 |
| 6 | **Meertaligheid**: locale per pagina, locale-groepen, talen per domein | `strategy.table.allLocales`, `admin.generateDialog.languagesTitle` | Overal in het plan en de meting | Middel, bewust niet gedaan |
| 7 | **Berichtencentrum** met gelezen en ongelezen, systeemaankondigingen en een rondleiding bij nieuwe functies | `notifications.*` (oudere app) | Naast het profielmenu | Middel |
| 8 | **Bestanden uploaden bij het merkprofiel**: stijlgidsen, logo's, merkboeken, tot 20 MB en drie stuks | `brandProfile.brandFiles` | Het plakvak in het onboardinggesprek | Middel |
| 9 | **Merkprofiel aanpassen via een gesprek**, met conceptvoorstellen per sectie die je los goedkeurt of afwijst | `brandProfile.modifyWithAi`, `.draftBadge`, `.approveSection` | `/merk/[id]/merkprofiel/bewerken` | Middel |
| 10 | **Contentwijziging als gesprek** in plaats van als notitieveld, met sessies die afsluiten bij goedkeuring | `content.contentAssistant`, `.chatHistory` (oudere app) | De bibliotheek per pagina | Licht, zie §9.2 |
| 11 | **Versie terugzetten** als nieuwe versie die opnieuw goedkeuring nodig heeft | `content.restoreVersion` | De bibliotheek per pagina | Licht |
| 12 | **Deterministische SEO-waarschuwingen in de handmatige editor**: lege H1, lege titel, lege meta, zoekwoord niet gevonden, link zonder adres | `draftEditor.warn*` | De handmatige bewerking van een pagina | Licht |
| 13 | **Kalenderweergave** met slepen en maximaal vijf items per dag | `strategy.calendarView` | Het contentplan | Licht, bewust niet gedaan |
| 14 | **Auteurspagina publiceren** op de site van de klant, met live preview tijdens het typen | `onboarding.authorPageToggle*` | Geen plek, vereist een CMS-koppeling | Niet doen |
| 15 | **Gamificatie**: Orbits sparen, streaks, 20 prestaties, dagelijkse opdrachten, een beloningswinkel met AI-tegoed en bonuspagina's | `orbits.*` (oudere app) | Nergens | Niet doen, zie §9.3 |
| 16 | **Btw-nummer live valideren tegen VIES** | `onboarding.vatValidating` (oudere app) | `/instellingen` | Licht |
| 17 | **Contract inzien vanaf het activatiescherm** | `onboarding.activation.viewAgreement` | De uitnodigingspagina | Licht |
| 18 | **Funnels en strategie-invoer per domein** door de CSM: doelland, nieuwe site, meertalig, bestaande structuur respecteren | `admin.generateDialog` | Deels aanwezig (`respect_site_structure`) | Licht |

### 4.1 En het belangrijkste dat Nova heeft en ORBIT ENGINE mist, in één alinea

Nova heeft **één zin die de klant vertelt wat er nu gebeurt, op elk punt waar hij moet wachten.**
*"Your CSM will reach out within 48-72 hours to finalize setup and get your strategy live. No action
needed from you in the meantime."* En: *"Once confirmed, your full dashboard unlocks
automatically."* En: *"You can close this page, it carries on without you."*

ORBIT ENGINE heeft de statustaal wel (`lib/plan-status.ts` zegt per pagina wie er aan zet is), maar
niet op het niveau van het hele traject. Een klant die net is overgedragen en nog geen cluster heeft,
ziet geen enkele zin die zegt wat er hierna gebeurt en wie het doet.

---

## 5. Wat ORBIT ENGINE heeft en Nova niet

| # | Functie | Waar in ORBIT ENGINE | Waarom Nova dit niet heeft |
|---|---|---|---|
| 1 | **Zichtbaarheid in AI-antwoorden meten**: 30 vragen met live websearch, per antwoord beoordeeld, één score met foutmarge | `/merk/[id]/analytics` | Hun hele meetlaag is Google Search Console. Nul treffers op AI-termen |
| 2 | **De kennistest (0-meting)**: kent ChatGPT dit bedrijf, klopt wat hij zegt, welke bronnen haalt hij aan | `/merk/[id]/admin/0-meting` | Bestaat niet |
| 3 | **Concurrentievergelijking op genoemd worden**, met merknaam-ontdubbeling | `/merk/[id]/analytics/concurrenten` | Nova vergelijkt alleen eigen pagina's met zichzelf |
| 4 | **De feitenkaart**: elke bewering over het bedrijf herleidbaar tot een bevestigd feit, met een claim-audit die de gaten omzet in vragen | `/analyses/[id]/briefing` | Nova heeft "proof points" als tekstveld, geen controle achteraf |
| 5 | **Het contentcontract**: per sectie de vraag, het vereiste bewijs en waaraan je ziet dat hij geslaagd is | De contentpijplijn | Bestaat niet |
| 6 | **Vier onafhankelijke keuringen plus een herstellus** die alleen een echte verbetering behoudt | De contentpijplijn | Nova heeft de klant als enige keuring, plus een chatassistent |
| 7 | **Publicatieverificatie**: staat de pagina er echt, met een steekproef van acht zinnen | `verify_publication` | Nova gaat ervan uit dat het goed is zodra jij het afvinkt |
| 8 | **Effectmeting met controlegroep**, na 14 en 28 dagen | `measure_impact`, `compute_impact` | Nova toont de trendlijn en laat de conclusie aan de lezer |
| 9 | **Technische GEO-audit**: mogen de crawlers van AI-bedrijven de site bezoeken, is de tekst leesbaar zonder JavaScript | `technical_audit` | Nova heeft "Technische Optimalisatie" op de marketingsite, niet in de app |
| 10 | **Entiteitscontrole**: staat dit merk in Wikidata of Wikipedia | `offsite_scan` | Bestaat niet |
| 11 | **Herkomst per veld** (`ai`, `klant`, `gesprek`, `consultant`) en de regel dat onderzoek nooit overschrijft wat een mens zei | `lib/pipeline/field-merge.ts` | Nova heeft alleen "Drafted from your website" |
| 12 | **Een goedkeuringspoort vóór er kosten gemaakt worden**, met het bedrag erbij op elke knop die geld kost | Per cluster | Nova toont nergens wat iets kost |
| 13 | **Het kwaliteitslab**: het oordeel van de app naast dat van een mens | `/beheer/kwaliteit` | Bestaat niet |
| 14 | **De Sales-module**: uit een markt de beste kansen zoeken, onderbouwen en een conceptmail klaarzetten | `/sales` | Bestaat niet |
| 15 | **Het onderzoek vóór het gesprek**, met een agenda gesorteerd op wat het kost om de fout later te ontdekken | `/merk/[id]/admin/onboarding` | Nova onderzoekt tijdens de onboarding, de CSM komt erna |
| 16 | **De stap "waar je om bekend wilt staan"** als eigen blok in het merkprofiel | Stap 7 van het merkdossier | Nova heeft "Topics" maar niet als sturend blok |
| 17 | **Geen contractduur** | `lib/account-status.ts`, "maand 4 sinds de start" | Nova zet overal "contract month {current} of {total}" |

---

## 6. De twee processen als vorm, niet als lijst

### 6.1 Nova is een trechter, ORBIT ENGINE is een lus

Nova's proces is lineair en eenmalig. Verkoop, onboarding, lanceren, strategie, en daarna twaalf
maanden dezelfde maandelijkse routine: genereren, goedkeuren, plaatsen, meten. Het interessante werk
zit vooraan, en daarna is het uitvoering. Hun CSM-scherm heet niet voor niets "where we are falling
behind".

ORBIT ENGINE's proces is circulair en herhaalt zich per onderwerp. Elk cluster doorloopt zijn eigen
lus: vragen opstellen, goedkeuren, meten, gaten vinden, schrijven, publiceren, hermeten. Een klant
met vier clusters heeft vier lussen die los van elkaar draaien.

**Dat verschil is de bron van bijna elk procesprobleem hieronder.** Nova's klant heeft één begin en
één ritme. ORBIT ENGINE's klant heeft evenveel beginnen als hij clusters heeft, en elk begin heeft
dezelfde vier poorten.

### 6.2 Waar de volgorde van Nova logischer is

**A. Er is één moment waarop het programma begint.** Bij Nova gaat de klant van "ik heb mijn
gegevens ingevuld" naar "er komen elke maand pagina's" met één klik, en die klik zegt letterlijk wat
hij doet. Bij ORBIT ENGINE bestaat dat moment niet. Een klant die net is overgedragen moet zelf: een
cluster aanmaken, 30 vragen beoordelen, op meten klikken, wachten op een rapport, de voorraad over
maanden verdelen, een maand vrijgeven, en dan nog een briefing invullen. Zeven handelingen en vier
poorten voordat er één pagina geschreven is. Dat is de grootste vindplaats van dit hele onderzoek.

**B. Het geld is geregeld voordat het werk begint.** Nova heeft het abonnement, de machtiging en de
facturatie in de app. ORBIT ENGINE heeft `package_pages_per_month`, `started_at` en `cancelled_at`
als kolommen die iemand met de hand vult. De quota stuurt wel degelijk het contentplan
(`app/api/profiles/[id]/plan/route.ts`), dus een vergeten kolom levert stilletjes een plan op dat
niet klopt met de afspraak.

**C. De koppelingen zitten in de route.** Bij Nova moet je Search Console aanraken voordat je kunt
lanceren, en als je hem overslaat staat dat als "Skipped" op je reviewscherm. Bij ORBIT ENGINE is
het een adminscherm zonder moment. Gevolg: `/merk/[id]/analytics/zoekverkeer` blijft leeg zonder dat
iemand daar een reden bij ziet.

**D. Elke wachtstand heeft een zin.** Zie §4.1.

**E. De publicatiewachtrij is één scherm, geen pagina per pagina.** Zie §9.1.

### 6.3 Waar de volgorde van ORBIT ENGINE logischer is

**A. Het onderzoek gaat vóór het gesprek.** Nova laat de klant zes stappen invullen en scant zijn
site daarna, wat betekent dat de klant dingen typt die de scan ook had gevonden. Nova ziet dat zelf
ook: hun huidige app zegt *"anything you leave blank, NOVA will write for you"*, en zet een badge
"Drafted from your website" bij velden die al gevuld zijn. Maar de vorm is een invulformulier
gebleven. ORBIT ENGINE heeft de vorm meeveranderd: de klant kijkt na in plaats van in te vullen, en
bij elk veld staat waar de waarde vandaan komt.

**B. Er wordt niets betaald voordat de klant heeft gezien wat er gemeten wordt.** Nova's klant keurt
een jaarplan goed dat een agent heeft opgesteld, met als enige alternatief "decline and regenerate".
ORBIT ENGINE's klant ziet 30 vragen, bewerkt ze, en drukt dan pas op start.

**C. De vragen aan de klant komen uit een gemeten gat.** Nova vraagt vooraf veertig velden uit, en
hoopt dat het genoeg is. ORBIT ENGINE vraagt pas iets zodra blijkt dat een specifieke pagina een
specifieke bewering nodig heeft die nergens te vinden is, en slaat vragen over waarvan het antwoord
op internet staat.

**D. Wat een mens zei blijft staan.** Nova's merkprofiel kan opnieuw gegenereerd worden, met de
waarschuwing dat de nieuwe tekst niet identiek zal zijn. Bij ORBIT ENGINE overschrijft een nieuwe
onderzoeksronde nooit een veld met herkomst `klant`, `gesprek` of `consultant`.

**E. Geen contractduur.** Nova's klant leest elke maand hoeveel hij nog vastzit. Dat is een
retentiemiddel dat als een klem voelt.

---

## 7. Het merkprofiel, veld voor veld

Wat Nova uitvraagt tegenover wat ORBIT ENGINE heeft. Dit is de vergelijking die laat zien hoe klein
het echte gat is.

| Nova-blok | Nova-velden | ORBIT ENGINE | Stand |
|---|---|---|---|
| Positioning | Core category, mission, value pillars, positioning | `industry`, `brand_mission`, `value_props`, `brand_positioning` | Compleet |
| Audience | Primary, secondary, us vs. them, geographic identity, knowledge level | `intake_audience`, `audience_secondary`, `differentiator`, `service_regions`, `audience_knowledge_level` | Compleet |
| Voice | Vijf schuiven plus persoonlijkheid | `tone_formality`, `tone_energy`, `tone_complexity`, `tone_humor`, `tone_emotional`, `tone_of_voice` | Compleet, met knoppen in plaats van schuifbalken |
| Words | Signature phrases, taboo phrases, pronoun, identity keywords, laws | `signature_phrases`, `taboo_phrases`, `pronoun_preference`, `identity_keywords`, `compliance_notes` | Compleet |
| Author | Naam, functie, bio, foto, LinkedIn, Facebook, overig, auteurspagina | Alle zeven, behalve de auteurspagina | Compleet op één na |
| Topics | USP, key messages, proof points, competitors, industry | `usp`, `key_messages`, `proof_points`, `competitors`, `industry` | Compleet |
| Brand files | Stijlgidsen en merkboeken uploaden | Niet aanwezig, wel een plakvak voor tekst | **Gat** |
| Company | Rechtsnaam, adres, btw, factuurmail, contactpersoon | Allemaal, op accountniveau in `/instellingen` | Compleet |
| CMS | Platform, inlog-URL, gebruikersnaam, sleutel | Niet aanwezig | Bewust niet |
| Taal | Communicatietaal en weergavetaal, drie talen | Alleen Nederlands | Bewust niet |

**En wat ORBIT ENGINE erbij heeft dat Nova niet uitvraagt:** de twaalf commerciële velden uit het
gesprek. Waar wil je op groeien, waar juist niet, waar wil je heen, wat is een klant waard, welke
bezwaren hoor je, waar mag niet over geschreven worden, welk bewijs staat niet op je site, welke
gelijknamige bedrijven ben jij niet, mogen er nieuwe pagina's bij, waar wil je over een jaar staan.

Dat laatste rijtje is precies het rijtje dat een website niet kan vertellen en een AI-assistent niet
kan raden. Nova komt daar met de CSM omheen: die vult de funnels en de strategie-invoer in namens de
klant, zonder dat er velden voor bestaan.

---

## 8. Zeven voorstellen, geprioriteerd

> **Stand op 16 september 2026: vijf van de zeven zijn gebouwd, en drie van die
> vijf bleken bij het bouwen geen verbetering maar een reparatie.** Wat er precies
> is gebeurd staat in `docs/logbook.md` onder de kop van die datum. Per voorstel
> hieronder staat de stand erbij, inclusief de plekken waar dit document zich
> vergiste.

Elk voorstel zegt wat het oplost, wat het kost in werk, en wat er misgaat als je het niet doet.

### Voorstel 1. Eén startscherm na de overdracht: "Zo begint je programma"

**Gebouwd, en anders dan hier bedacht.** Twee aannames in dit voorstel bleken
niet te kloppen. Een klant met precies één merk werd allang doorgestuurd naar
zijn merk in plaats van naar de merkenlijst, en het merkoverzicht had al een
balk met de zes stappen van de ronde. Wat er echt mis was, zat een laag dieper:
bij nul clusters zei die balk "ORBIT ENGINE is aan zet bij meten", terwijl er
niets in de wachtrij stond en de klant zelf niets kon starten. Een apart
startscherm zou dat niet hebben opgelost, alleen bedekt. `lib/ronde.ts` kent nu
een derde partij: bij nul clusters is de consultant aan zet.

**Het probleem.** Zie §6.2A: zeven handelingen en vier poorten voordat er één pagina geschreven is,
zonder dat iemand de klant vertelt dat dat de route is.

**Wat het wordt.** Eén scherm dat de klant ziet zodra zijn merk is toegewezen, met de vier poorten
als genummerde stappen, wie er per stap aan zet is, en wat ORBIT ENGINE ondertussen zelf doet.
Precies Nova's `reviewTile`-patroon: een rij per stap met "Klaar", "Wacht op jou" of "ORBIT ENGINE is
bezig". De eerste stap heeft een knop, de rest niet.

**Waarom dit als eerste moet.** Het is het goedkoopste voorstel van de zeven, het raakt geen enkele
pijplijnstap, en het lost het probleem op dat alle andere voorstellen alleen maar verplaatsen: de
klant weet niet waar hij is.

**Wat er misgaat zonder.** Een overgedragen klant logt in, ziet een leeg contentplan, en wacht. Er
staat nergens waarop.

### Voorstel 2. Het abonnement in de app

**Half gebouwd, want de helft bestond al.** Het contentpakket was wel degelijk
te zetten, op het toewijzingsscherm sinds 31 augustus 2026; dit document had dat
gemist. Wat er echt ontbrak was de startdatum: `accounts.started_at` werd door
geen enkele regel geschreven, alleen gelezen. Die wordt nu gezet bij de
overdracht en is daar te corrigeren. De SEPA-machtiging via Stripe is niet
gebouwd en staat nog open.

**Het probleem.** `package_pages_per_month` stuurt het contentplan, en er is geen scherm waar hij
gezet wordt. `started_at` bepaalt de teller "maand 4 sinds de start", en ook die wordt met de hand
gevuld.

**Wat het wordt.** Geen Stripe, nog niet. Wel een blok in `/instellingen` waar de consultant het
pakket, de startdatum en de betaalafspraak vastlegt, en waar de klant ziet wat hij per maand
tegoed heeft. Nova's scheiding aanhouden: het pakket is een verkoopafspraak, de klant kan hem zien
maar niet wijzigen. Dat zit al zo in `lib/account-editable.ts`, alleen ontbreekt het scherm.

**De volgende stap daarna**, als je hem wilt: de SEPA-machtiging via Stripe, met Nova's drie
vondsten erin. Overslaan mag met een herinnering, de CSM kan altijd een losse factuur sturen, en de
ergste fout (machtiging gelukt, opslaan mislukt) krijgt een eigen tekst.

**Wat er misgaat zonder.** Een vergeten kolom levert een contentplan op dat niet klopt met wat er
verkocht is, en niemand ziet dat, want het plan ziet er verder normaal uit.

### Voorstel 3. Search Console in de route in plaats van in een adminscherm

**De lege staten zijn gebouwd, de plek in de route niet.** Ook hier was de
telling in dit document niet precies: er waren er drie en niet twee, en de derde
was in de praktijk onbereikbaar omdat de controle op de koppeling vuurde vóór
die op gepubliceerde pagina's. Dat is gerepareerd en het zijn er nu vier.

**Het probleem.** De koppeling is stafgereedschap zonder moment. `/merk/[id]/analytics/zoekverkeer`
blijft leeg en de klant weet niet waarom.

**Wat het wordt.** Twee dingen. Ten eerste: de koppeling wordt een regel op het startscherm uit
voorstel 1, met Nova's drie standen ("Verbonden", "Overgeslagen, je kunt dit later doen", "Vraagt
aandacht"). Ten tweede: het lege zoekverkeerscherm krijgt Nova's vier lege staten. Het heeft er nu twee
("Nog niet gekoppeld" en "Nog geen cijfers binnen") plus een regel met de laatste
synchronisatiefout. Die tweede staat doet het werk van drie: er is nog niets gepubliceerd, de
cijfers komen nog binnen (bij Google duurt dat een paar dagen), of Google geeft geen toegang tot
deze site. Dat zijn drie verschillende problemen met drie verschillende oplossingen, en ze zien
er nu hetzelfde uit.

**Wat er misgaat zonder.** De helft van het bewijsmateriaal van het product blijft onzichtbaar,
terwijl de koppeling in twee minuten te maken is.

### Voorstel 4. De publicatiewachtrij als één scherm

**Het kopieerformaat is gebouwd, de wachtrij niet.** Zie §9.1: van de drie
onderdelen is het derde gedaan, en dat was het kleinste met het meeste effect.

Zie §9.1 voor de uitwerking. Dit is de enige plek waar Nova's publicatiestap bruikbaar is zonder
automatisch te publiceren, en het is meer winst dan het lijkt.

### Voorstel 5. Wachtstanden krijgen een zin

**Gedeeltelijk gebouwd.** De belangrijkste van de vier is gedaan (net
overgedragen, zie voorstel 1), plus de vier lege staten van het zoekverkeer en de
lege staat van het clusterscherm. De andere wachtstanden staan nog open.

**Het probleem.** ORBIT ENGINE heeft de statustaal per pagina, niet per traject.

**Wat het wordt.** Overal waar de klant moet wachten staat wie er aan zet is, wat er gebeurt, en
wanneer hij weer aan de beurt is. Nova's toon aanhouden: *"No action needed from you in the
meantime."* Concreet gaat het om vier plekken: net overgedragen, meting loopt, rapport wordt
geschreven, en pagina wacht op een schrijfronde die pas over weken start.

**Wat er misgaat zonder.** Elke stilte leest als een storing.

### Voorstel 6. Bestanden bij het merkprofiel

**Niet gebouwd.** Staat nog open.

**Het probleem.** Het onboardinggesprek heeft een plakvak voor tekst. Een ondernemer heeft geen
tekst, hij heeft een pdf: een tarievenkaart, een brochure, een productlijst.

**Wat het wordt.** Nova's grenzen overnemen (tot 20 MB, maximaal drie bestanden, afbeeldingen en
pdf), de tekst eruit halen, en de feiten eruit als bevestigde feiten met herkomst `gesprek`
opslaan. Het zijproject `app/solliciteren/` doet dit al voor cv's en sollicitatiebrieven, dus het
inleespatroon staat er.

**Wat er misgaat zonder.** De feitenkaart blijft dunner dan hij hoeft te zijn, en dat is precies de
maat die bepaalt of een pagina geschreven mag worden.

### Voorstel 7. De handmatige bewerking krijgt deterministische waarschuwingen

**Niet gebouwd.** Staat nog open.

**Het probleem.** De klant mag een tekst handmatig aanpassen voordat hij hem vrijgeeft. Daarna wordt
er niets meer gecontroleerd.

**Wat het wordt.** Nova's vijf waarschuwingen uit `draftEditor`, alle vijf zonder AI en dus gratis:
lege H1, lege paginatitel, lege meta-beschrijving, primair zoekwoord niet meer in titel of tekst, en
een link zonder adres. Dat is conventie 1 in zijn zuiverste vorm: een deterministisch vangnet onder
iets wat een mens beloofde goed te doen.

**Wat er misgaat zonder.** Een klant haalt de H1 weg omdat hij hem dubbel vindt staan, en de pagina
gaat live zonder dat iemand het ziet.

### Wat bewust níet in deze lijst staat

**Meertaligheid.** Besluit 13 zegt Nederlands, en dat besluit is niet verlopen. Het raakt het plan,
de meting, de prompts en de content tegelijk, en het levert pas iets op bij de eerste klant die het
nodig heeft.

**De kalender met slepen.** Op 11 augustus 2026 bewust afgewezen omdat slepen op een telefoon
onbetrouwbaar is. Er staat herordenen zonder slepen voor in de plaats, en dat werkt.

**Het berichtencentrum.** Het is het soort functie dat je bouwt als er iets te melden is. Met twee
e-mails in de hele app is dat er nog niet.

---

## 9. Wat er niet overgenomen wordt, en waarom

### 9.1 Automatisch publiceren: nee, en wat er wél te halen valt

**Het besluit staat vast en dit document verandert er niets aan.** ORBIT ENGINE publiceert niet zelf.

Het is ook de verdedigbare kant. Nova's eigen teksten laten zien wat automatisch publiceren kost aan
complexiteit: drie publicatiemodellen naast elkaar, een statustaal met zowel "Publishing failed" als
"Waiting in your CMS" als "Contact your CSM", een CMS-koppeling waarvoor de klant een gebruiker moet
aanmaken met volle rechten, en een instellingenscherm met vijf schakelaars over of een bericht als
concept of direct live moet ("Keep blog posts as drafts instead of publishing immediately"). Dat is
een tweede product binnen het eerste, en de storingen ervan komen bij de CSM terecht.

**Maar Nova's derde model is precies wat ORBIT ENGINE doet, en dat model is beter uitgewerkt dan het
onze.** De handmatige publicatiewachtrij. Drie dingen daaruit zijn overneembaar zonder één regel
koppeling:

1. **Eén scherm met alles wat klaarstaat**, met de instructie in één zin erboven: *"Copy the
   approved content, publish it in the CMS, then mark it as posted."* ORBIT ENGINE heeft een
   bibliotheek met filters, geen wachtrij die zegt wat je nu moet doen. Voor een klant die eens per
   maand vier pagina's plaatst is dat het verschil tussen een taak en een archief.
2. **Bulk afvinken met een pad-veld per pagina en het domein vastgezet.** De rekenkant hiervoor
   staat al in `lib/plan-bulk.ts`, inclusief het eerlijk melden van gedeeltelijk succes. Wat
   ontbreekt is dezelfde handeling in de bibliotheek, naast de plek waar de tekst staat.
3. **Kopiëren in twee formaten, met de reden erbij**: *"Choose the format that matches the CMS
   workflow."* ORBIT ENGINE kopieert nu Markdown plus de schema-markup apart. Een WordPress-blok wil
   HTML, een editor wil platte tekst, en Markdown is voor allebei het verkeerde antwoord.

Dat derde punt is de kleinste wijziging van dit hele document en waarschijnlijk de meest gevoelde:
het is de laatste handeling voordat de klant zijn eigen site aanraakt, en daar gaat het nu mis in de
opmaak.

> **Gebouwd op 16 september 2026.** Er staan nu drie kopieervormen met per vorm de
> reden om hem te kiezen, geschreven over het CMS van de klant en niet over het
> formaat (`lib/kopieervormen.ts`). De eerste twee punten, één wachtrijscherm en
> bulk afvinken vanuit de bibliotheek, staan nog open.

### 9.2 De chatassistent per pagina: nee, en wat er wél te halen valt

Nova's Content Assistant is een gesprek per pagina, met sessies, historie, en goedkeuren of afwijzen
als afsluiting. Dat is aantrekkelijk en het is de verkeerde vorm voor ORBIT ENGINE, om een reden die
in de code staat: elke schrijfronde is één zware AI-aanroep met een budget eromheen, en een
chatvenster is een open kraan zonder poort. Nova lost dat op met AI-tegoed dat je kunt opsparen met
een spelletje, en dat is precies het soort oplossing dat je krijgt als het probleem structureel is.

Wat er wél uit te halen valt: **Nova's waarschuwing vóór de handmatige bewerking.** *"This bypasses
the guided optimisation flow."* Twee knoppen, "Keep using Content Assistant" en "Continue at my own
risk". ORBIT ENGINE heeft dezelfde spanning (de herstellus kan een sectie beter maken dan een mens
die hem overtypt) en geen enkel moment waarop dat gezegd wordt.

### 9.3 Gamificatie: nee

De oudere InSpace-app heeft een compleet spel: Orbits verzamelen door een verstopt bolletje op een
pagina te vinden, dagreeksen met bonussen, twintig prestaties met eigen teksten, dagelijkse en
wekelijkse opdrachten ("Visit the Analytics page", "Maintain your streak"), en een beloningswinkel
waar je AI-tegoed, extra pagina's en accentkleuren koopt.

Dit hoort in een analyse thuis omdat het iets verraadt: **je bouwt dit als klanten niet uit zichzelf
inloggen.** Een klant die elke maand ziet dat zijn zichtbaarheid stijgt heeft geen dagreeks nodig.
De les is dus niet "bouw een spel", de les is dat Nova's dashboard blijkbaar te weinig reden geeft
om terug te komen, en dat het opbrengstblok van ORBIT ENGINE (wat leverde het op sinds de start) het
antwoord op diezelfde vraag is.

Eén onderdeel is inhoudelijk wél interessant en heeft niets met het spel te maken: **"+1 Bonus Page"
en "AI Credits" als verhandelbare eenheden.** Dat betekent dat Nova's quota niet hard is maar
verhoogbaar, en dat er een eenheid bestaat waarin extra werk uitgedrukt wordt. ORBIT ENGINE heeft
die eenheid ook nodig zodra een klant midden in de maand een pagina extra wil.

### 9.4 Contractduur: nee

Nova's "contract month {current} of {total}" is hun sterkste retentiemiddel en hun grootste risico
tegelijk. Besluit 7 heeft hier al gekozen: doorlopend opzegbaar, en de teller heet "maand 4 sinds de
start". Dat besluit blijft staan, en het maakt voorstel 1 belangrijker: zonder klem moet het
programma zelf de reden zijn om te blijven.

---

## 9b. Wat er uit ORBIT ENGINE weg moest, en waarom

Dit hoofdstuk stond niet in de eerste versie van dit document: dat keek alleen
naar wat Nova heeft en ORBIT ENGINE niet. De andere kant leverde drie vondsten op
die zwaarder wegen dan de meeste voorstellen hierboven, want het waren geen
ontbrekende functies maar besluiten die niet deden wat er stond.

**1. Een cluster starten stond open terwijl het op slot hoorde.** Elke dure route
vraagt `mayTriggerCost`, op één na: `POST /api/analyses`. Dat is geen
ontwerpkeuze geweest, want `lib/cost-rules.ts` schrijft in zijn eigen toelichting
dat precies die route op 2 september 2026 dicht is gezet. Een klant kon er
betaald onderzoek mee starten via het vrije tekstveld, terwijl hetzelfde onderwerp
via het snelpad netjes werd geweigerd. Gedicht, met een test die alle zes routes
afloopt.

**2. Een dode kolom.** `value_per_mention_eur` had nul lezers, stond op geen
enkel scherm en was bewust niet bewerkbaar. De kolom blijft staan (conventie 4)
en besluit 16 blijft gelden, maar uit het type is hij weg: een veld dat niemand
kan zetten en niemand ziet, nodigt uit om er iets mee te doen dat er niet is.

**3. Een veld dat beloofde wat het niet deed.** De waardeklasse van een klant. Het
advies in een eerdere versie van dit document was om hem aan te sluiten op de
potentiescore. Dat advies was fout, en de code wist het beter: die score is per
onderwerp en de waardeklasse per merk, dus een factor zou elk onderwerp van een
merk even hard verschuiven en aan de onderlinge volgorde niets veranderen. Wat er
wél mis was, was de omschrijving op het scherm, die pal boven zijn eigen
ontkenning stond. Er is nu een controle over alle 60 velden die dat voortaan
vangt.

**En twee schermen te veel.** De bibliotheek bestond per cluster én merkbreed, en
de briefing en "Openstaande vragen" toonden dezelfde rijen met verschillende
invoervelden. Het eerste is samengevoegd, het tweede deelt nu zijn model.

## 10. De naamkwestie

Het staat sinds 10 augustus 2026 in het logboek en het is er niet beter op geworden: **InSpace
brengt zelf een product uit dat ORBIT ENGINE heet.** In hun productmenu staat "Nova, Autonoom ·
live" en daaronder "ORBIT ENGINE, Binnenkort beschikbaar", met de omschrijving *"Een nieuwe manier
om te groeien voorbij zoekmachines"* en een pre-registratieknop.

Dezelfde naam, dezelfde categorie, en hun versie belooft precies wat ORBIT ENGINE vandaag al doet.
Dat is geen procesbevinding, maar het raakt elke zin die naar buiten gaat. Het besluit ligt bij de
eigenaar en dit document neemt het niet.

---

## 11. Wat er niet uit de bron te halen was

Eerlijk over de gaten in dit onderzoek:

1. **Hoe Nova's strategie-agent uit vijf funnels twaalf maanden pagina's maakt.** Er staat alleen
   dat het via een webhook gaat, een paar minuten duurt, en per paginatype aantallen oplevert. Wat
   er tussen zit is onbekend.
2. **Wat Nova's onboarding kost aan afhakers.** Een catalogus zegt wat er aangeboden wordt, niet
   hoeveel klanten stap vier halen.
3. **Of de chatassistent nog bestaat.** Hij staat in de oudere app volledig uitgewerkt en in de
   huidige Nova-app helemaal niet meer. Dat kan betekenen dat hij geschrapt is, of dat hij in een
   deel van de app zit dat niet in deze catalogus terechtkomt.
4. **Hoe Nova's meting van "indexed" werkt.** De oudere app heeft een indexeringsstatus per pagina,
   de huidige niet meer.
5. **Wat er in Nova's brand profile-generatie gebeurt.** De oudere app zegt "This usually takes
   about 15 minutes" en noemt vijf stappen. De huidige app heeft die stap niet meer, wat suggereert
   dat het merkprofiel nu tijdens de scan ontstaat in plaats van erna.

---

## 12. Samengevat in vijf zinnen

1. Nova en ORBIT ENGINE meten niet hetzelfde: Nova meet Google, ORBIT ENGINE meet AI-antwoorden, en
   over 2.440 interfaceteksten van Nova komt geen enkele AI-term voor.
2. Het meetinstrument van ORBIT ENGINE loopt voor, de machinerie eromheen loopt achter, en die
   machinerie is wat een klant het verschil tussen een rapport en een programma laat voelen.
3. Het grootste procesgat is dat er geen moment bestaat waarop "merk klaar" overgaat in "programma
   loopt": zeven handelingen en vier poorten voordat er één pagina geschreven is.
4. Het tweede gat is het geld: het pakket stuurt het contentplan en wordt met de hand in een kolom
   gezet.
5. Automatisch publiceren blijft eruit, en dat kost niets: Nova's eigen handmatige wachtrij is beter
   uitgewerkt dan die van ORBIT ENGINE, en die overnemen is de winst zonder de koppeling.
