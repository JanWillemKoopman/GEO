# Optimalisatieplan onboardingsessie

**Scherm:** `/merk/[id]/admin/onboarding` (staff, gedeeld met de klant tijdens het gesprek)
**Datum analyse:** 31 augustus 2026
**Status:** analyse en plan. Er is in deze ronde bewust nog geen enkele UI-wijziging doorgevoerd.
**Bronbestanden:** `lib/pipeline/brand-fields.ts` (veldencatalogus), `app/(app)/merk/[id]/_components/onboarding-session.tsx` (het scherm),
`app/(app)/merk/[id]/admin/onboarding/page.tsx` (de serverlaag), `lib/profile-editable.ts` (de opslagroute),
`lib/profile-gaps.ts`, `lib/profile-meter.ts`, `lib/pipeline/onboarding-refresh.ts`, `lib/pipeline/context-factors.ts`.
**Feitencontrole:** de kolommen zijn opgevraagd uit de productiedatabase (tabel `profiles`, 86 kolommen) en elk veld is
opgezocht in `lib/pipeline`, `lib/reputation`, `lib/offsite`, `lib/audit`, `lib/search-console` en `app/api`.
Het volledige veldenoverzicht met dezelfde uitkomsten staat naast dit document in `documentatie/onboarding_velden.html`.

---

## 1. Doel van de optimalisatie

De onboardingsessie is het enige stafscherm dat samen met de klant wordt bekeken. Het is tegelijk drie dingen:
het werkblad van de Client Success Manager tijdens het gesprek van een uur, het dossier waar de hele pijplijn
daarna op draait, en het eerste inhoudelijke beeld dat de klant van ORBIT ENGINE krijgt.

Wat het scherm na deze optimalisatie moet doen:

1. De CSM door een gesprek leiden dat loopt zoals een echt gesprek loopt, van bedrijf naar aanbod naar markt naar toon.
2. Per veld zichtbaar maken **waarom** het gevraagd wordt en **waar het antwoord terechtkomt**, in kleine tekst onder het veld.
3. Eerlijk zijn over de velden die op dit moment nergens worden gelezen, zodat het gesprek geen tijd verliest aan
   administratie die niets oplevert.
4. Geen enkel bestaand veld verliezen: alle 56 velden uit de huidige catalogus blijven, plus het materiaalblok,
   het gespreksblok en het afrondblok.
5. De velden toevoegen die de applicatie wél gebruikt maar die de CSM nu nergens kan invullen of corrigeren.
   Dat zijn er negen, en één daarvan (`brand_name`) bepaalt de uitkomst van elke meting.
6. De CSM ook ná het gesprek genoeg context geven: wat is er al onderzocht, wat staat er open, wat kost het om iets
   opnieuw te laten draaien.

De harde randvoorwaarde uit de opdracht is verwerkt: **er verdwijnt geen veld.** Waar dit plan een veld verplaatst,
hernoemt of degradeert tot "optioneel", staat de onderbouwing erbij.

---

## 2. Analyse van de huidige situatie

### 2.1 Wat er goed staat en behouden moet blijven

Dit zijn bewuste keuzes met een vastgelegde onderbouwing. Ze blijven in het nieuwe ontwerp staan.

| Wat | Waarom het blijft |
|---|---|
| Het scherm opent met "Wat we nog niet weten" | De rangorde in `profile-gaps.ts` is op kosten gesorteerd: een ontbrekend werkgebied kost een hele meetronde, een ontbrekend bewijspunt alleen een vagere tekst. Beginnen bij veld 1 kost het uur waar de klant voor betaalt. |
| Opslaan per veld, zonder opslaanknop | Een gesprek springt en wordt onderbroken. Een half ingevuld formulier dat bij weglopen verdwijnt is de duurste fout die dit scherm kan maken. |
| De herkomstchip per veld ("uit je website gehaald", "door jou vastgelegd", "door ons ingevuld", "vul jij in") | Dit maakt van een formulier van 56 velden een nakijklijst. Het is het verschil tussen invullen en bevestigen. |
| "Niet van toepassing" per veld | Zonder deze knop haalt de lijst met open punten nooit nul, en dan wordt hij genegeerd. |
| De meter met drie getallen in plaats van een percentage | "78% compleet" verbergt precies het verschil dat telt: bevestigd door een mens tegenover aangenomen door het model. |
| Het afrondblok dat alleen de stappen inplant die van de gewijzigde velden afhangen | Alles opnieuw draaien kost geld voor werk dat niets nieuws oplevert. De raming staat in het bevestigvenster en niet op het scherm, omdat de klant meekijkt. |
| Geen taaknamen, geen bedragen, geen foutcodes op het scherm | Bewaakt door een test in `scripts/test-unit.ts`. |

### 2.2 De problemen

**P1. Het scherm is één kolom van bijna vijftig invoervelden.** In de screenshot loopt het scherm door over een lengte
die op een laptopscherm ongeveer tien schermhoogtes beslaat. De CSM heeft geen overzicht van waar hij is, hoe ver hij
nog moet, en wat er in het volgende blok komt. De zijrail heeft zes ankers, maar geen voortgang per blok en geen
markering van waar het gesprek nu is.

**P2. Nergens staat waar een antwoord terechtkomt.** Elk veld heeft een uitleg van één zin over wat je moet invullen
(`description`), maar bij geen enkel veld staat waar het antwoord daarna wordt gebruikt. De CSM kan de vraag van de
klant ("waarom willen jullie dit weten?") dus alleen uit zijn hoofd beantwoorden, en bij 56 velden lukt dat niet.

**P3. 23 van de 56 velden worden nergens gelezen.** Ze worden opgeslagen en getoond, maar geen onderzoeks-, meet-,
plan- of schrijfstap raakt ze aan. Het gaat om alle zeven auteursvelden, alle drie contactvelden, de merkmissie, de
positionering, de USP, de kernboodschappen, de klanttypes, het onderscheid, de tweede doelgroep, het kennisniveau,
de vijfde toonschuif, de eigen uitdrukkingen, de aanspreekvorm, de eigen trefwoorden en de klantwaardeband.
Ze tellen wel allemaal mee in de meter (op de drie contactvelden na), dus het scherm vraagt de CSM om ze in te vullen
en beloont hem daarvoor met een hoger getal, terwijl het antwoord nergens landt.

**P4. Negen velden die de applicatie wél gebruikt, kan de CSM hier niet invullen.** Uitgewerkt in hoofdstuk 5.
De zwaarste is `brand_name`: dat is de naam waarop de meting telt of een AI-antwoord het merk noemt, hij wordt door
ongeveer twintig modules gelezen, hij wordt alleen door het AI-onderzoek gezet, en hij is in de hele applicatie
nergens met de hand te corrigeren. Staat er iets fout, dan meet elke volgende ronde op de verkeerde naam.

**P5. De volgorde is de catalogusvolgorde, niet de gespreksvolgorde.** Blok 02 (de commerciële laag) staat vóór
blok 03 (wat er al gevonden is), maar vraagt de klant naar groeiprioriteiten voordat er is vastgesteld wat hij
eigenlijk verkoopt. `products` staat in het ingeklapte blok "Waar je om bekend wilt staan", helemaal onderaan,
terwijl `priority_offerings` daar bovenop bouwt. Het gesprek moet dus heen en weer.

**P6. Zeven van de negen stapnamen zijn niet zelfverklarend.** "Wat je hebt" (zijrail) tegenover "Wat je al hebt
liggen" (kop) is bovendien twee verschillende namen voor hetzelfde blok. Uitgewerkt in hoofdstuk 7.

**P7. Verplicht en optioneel bestaan niet.** Alle 56 velden zien er identiek uit. Het meetkritische werkgebied
staat visueel gelijk aan het Facebookprofiel van de auteur. De enige rangorde die het scherm kent zit in het
openingsblok, en dat toont maar vier soorten gaten.

**P8. De CSM mist context die niet in een veld zit.** Het scherm noemt de merknaam in de kop, en verder niets:
niet de website, niet het pakket, niet sinds wanneer de klant loopt, niet of het onderzoek al gedraaid heeft,
niet wanneer, en niet of er een Search Console-koppeling ligt. Die informatie staat verspreid over het
diagnosescherm, het merkoverzicht en de koppelingenpagina.

**P9. Drie schermen vullen dezelfde velden.** De onboardingsessie, de klantwizard (`/merkprofiel/bewerken`) en het
vragenscherm (`/strategie/vragen`) schrijven naar dezelfde kolommen, met verschillende namen in het menu
("Onboarding", "Bewerken", "Openstaande vragen") en een verschillend deel van de velden. Dat is verdedigbaar, maar
het scherm zegt nergens welke van de drie leidend is.

**P10. Het onderscheid tussen bedrijfsgegevens en accountgegevens is onzichtbaar.** De contactpersoon staat twee keer
in het datamodel: op `profiles` (`contact_name`, `contact_email`, `contact_phone`, wordt nergens gelezen) en op
`accounts` (`contact_person`, `contact_email`, `contact_phone`, waarvan het e-mailadres tevens het inlogadres is).
De CSM vult tijdens de onboarding de eerste in en denkt dat de klant daarmee kan inloggen.

---

## 3. Nieuwe voorgestelde structuur

Negen blokken, in de volgorde waarin het gesprek daadwerkelijk loopt. De nummering is functioneel: elk blok bouwt
op de antwoorden uit het vorige.

| # | Blok | Waarom hier | Duur (richtlijn) |
|---|---|---|---|
| 0 | **Voorbereiding** (geen invoer) | De CSM ziet vóór het gesprek wie hij spreekt, wat er al onderzocht is en wat er openstaat. | 2 min, vóór de klant aanschuift |
| 1 | **Openstaande punten** | Wat het meest kost als het ontbreekt. Ongewijzigd bovenaan. | 1 min |
| 2 | **Je bedrijf en je namen** | Alles waar de meting op rekent. Fout hier maakt elke volgende stap onbruikbaar. | 8 min |
| 3 | **Je aanbod en waar je op wilt groeien** | Eerst vaststellen wat er verkocht wordt, dan pas waar de groei zit. | 10 min |
| 4 | **Je markt en je concurrenten** | Bouwt op het aanbod: waarmee word je vergeleken, en waarop verlies je. | 8 min |
| 5 | **Je bewijs en je boodschap** | De feiten die een AI-assistent kan aanhalen. Volgt logisch op "waarom kiezen ze jou". | 8 min |
| 6 | **Je klant en je toon** | Voor wie schrijven we, en hoe klinkt het. | 8 min |
| 7 | **Materiaal en veranderingen** | Documenten plakken, en wat er buiten de site om speelt. | 6 min |
| 8 | **Techniek en koppelingen** | Sitemap, crawldekking, Search Console. Kan met een technische contactpersoon. | 5 min |
| 9 | **Afspraken en afronden** | Contactpersoon, meter, wat er opnieuw gaat draaien. | 4 min |

Drie structuurregels die in het hele scherm gelden:

- **Bovenaan elk blok staat één zin die zegt wat dit blok bepaalt.** Bijvoorbeeld: "Dit blok bepaalt op welke naam
  en in welk gebied ORBIT ENGINE meet." Nu staat er een sfeerzin.
- **Onder elk invoerveld staat één regel kleine tekst die zegt waar het antwoord landt.** De exacte teksten staan in
  hoofdstuk 6. Dit is de kern van de opdracht.
- **Elk blok heeft zijn eigen teller** (bijvoorbeeld "6 van de 9 ingevuld"), zodat de CSM ziet waar hij staat zonder
  naar de meter onderaan te scrollen.

---

## 4. Alle huidige velden, volledig overzicht

56 velden in de catalogus, verdeeld over negen stappen. Geen enkel veld verdwijnt uit de onboarding.
De kolom "Gelezen door" is de uitkomst van het opzoeken in de codebase; "niemand" betekent dat de waarde
alleen wordt opgeslagen en teruggetoond.

### Stap "bedrijf" (8)
`name`, `aliases`, `industry`, `business_model`, `service_scope`, `service_regions`, `market_language`, `sitemap_url`
Alle acht worden gelezen. Zie hoofdstuk 6, blok 2.

### Stap "merk" (3)
`brand_mission` (niemand), `brand_positioning` (niemand), `value_props` (schrijfopdracht en onderzoek)

### Stap "klant" (6)
`intake_audience` (onderzoek), `audience_secondary` (niemand), `audience_knowledge_level` (niemand),
`personas` (niemand, alleen samenvoeglogica), `differentiator` (niemand), `competitors` (ruim twintig modules)

### Stap "stem" (6)
`tone_formality`, `tone_energy`, `tone_complexity`, `tone_humor` (alle vier de schrijfopdracht),
`tone_emotional` (niemand), `tone_of_voice` (onderzoek en schrijfopdracht)

### Stap "woorden" (5)
`signature_phrases` (niemand), `taboo_phrases` (schrijfopdracht plus deterministische nacontrole),
`pronoun_preference` (niemand), `identity_keywords` (niemand), `compliance_notes` (schrijfopdracht)

### Stap "auteur" (7)
`author_name`, `author_role`, `author_bio`, `author_photo_url`, `author_linkedin_url`, `author_facebook_url`,
`author_other_url`. Alle zeven: niemand.

### Stap "bekend" (6)
`usp` (niemand), `key_messages` (niemand), `proof_points` (feitenbank en openstaande vragen),
`products` (aanbod, meting, schrijfopdracht), `summary` (onderzoek, rapport, klantmail),
`intake_description` (onderzoeksopdracht)

### Stap "strategie" (12)
`priority_offerings` en `deprioritised_offerings` (onderwerpkeuze, reputatiestart), `target_segments` (onderwerpkeuze),
`growth_regions` (extra zoekvragen), `deal_value_band` (niemand, zie hieronder), `seasonality` (rapport),
`sales_objections` (schrijfopdracht), `forbidden_topics` (onderwerpkeuze plus nacontrole), `offline_proof` (feitenbank),
`name_exclusions` (meting en vermeldingsclassificatie), `respect_site_structure` (structuuradvies),
`goal_12m` (onderwerpkeuze en rapport)

> **Let op bij `deal_value_band`:** het commentaar in `lib/pipeline/onboarding-refresh.ts` zegt "weegt mee in de
> potentiescore, bij het plannen". Die potentiescore is nog niet gebouwd (`docs/tasks/potentiescore.md`). Op dit moment
> leest niets deze kolom. Het veld blijft staan, maar de microcopy moet zeggen wat waar is.

### Stap "contact" (3)
`contact_name`, `contact_email`, `contact_phone`. Alle drie: niemand. Tellen bewust niet mee in de meter.

### Niet-veldonderdelen die ook op het scherm staan en blijven

| Onderdeel | Wat het doet | Waar het landt |
|---|---|---|
| Materiaalblok (`DossierBox`) | Plakken van een tarievenpagina of brochure, waar ORBIT ENGINE feiten uit haalt | `brand_documents` en `brand_facts`, gelezen door de feitenbank en de schrijfopdracht |
| Gespreksnotitie (`StrategyBox`, vrije tekst) | Wat er is afgesproken | `profile_strategy.strategy_notes` |
| Veranderingen (`StrategyBox`, gestructureerd) | Zeven soorten: nieuwe website, rebranding, naamswijziging, nieuwe dienst, gestopte dienst, nieuw werkgebied, overig | `profile_strategy.context_factors`. Een naamswijziging voegt automatisch een alias toe, een nieuw werkgebied een regio |
| Meter | Bevestigd, gevonden, open, over 53 velden (contact telt niet mee) | Alleen scherm |
| Afrondblok | Plant precies de stappen in die van de gewijzigde velden afhangen, met raming in het bevestigvenster | `jobs` |

---

## 5. Nieuwe en ontbrekende velden

Negen velden bestaan in de database, worden door de applicatie gebruikt, en zijn tijdens de onboardingsessie niet
in te vullen. Plus twee accountgegevens die het gesprek raken maar op een ander scherm staan.

### 5.1 `brand_name` (kritiek)

- **Waarom nodig:** dit is de naam waarop de meting telt of een AI-antwoord over dit merk gaat. De
  vermeldingsclassificatie eist de letterlijke naam in de tekst.
- **Waar het bestaat:** `profiles.brand_name` (text, nullable). Gezet door het AI-onderzoek (`discover.ts`).
- **Waar het wordt gebruikt:** ongeveer twintig modules, waaronder `measure.ts`, `answers.ts`, `llm-baseline.ts`,
  `market.ts`, `report.ts`, `content.ts`, `offering.ts`, plus de schermtitel van vrijwel elk merkscherm
  (`profile.brand_name ?? profile.name`).
- **Het probleem:** de kolom staat niet in `EDITABLE_PROFILE_FIELDS` en in geen enkel formulier. Er is dus geen enkele
  manier om een verkeerd afgeleide merknaam te corrigeren, en de fout blijft elke volgende meetronde meelopen.
- **Wanneer uitvragen:** blok 2, direct onder de bedrijfsnaam, met de uitleg dat dit de naam is waarop wordt gemeten.
- **Implementatie:** toevoegen aan `EDITABLE_PROFILE_FIELDS`, aan `BRAND_FIELDS` (stap "bedrijf", `derivable: true`)
  en daarmee automatisch aan de opslagroute en de meter. Let op de test die eist dat catalogus en editable lijst gelijk lopen.

### 5.2 `url` (kritiek, als correctiepad)

- **Waarom nodig:** de website is de bron van de hele crawl, de inventaris, de structuuranalyse en de schrijfopdracht.
- **Waar het bestaat:** `profiles.url` (text, not null). Gezet bij het aanmaken van het merk (`/merk/nieuw`).
- **Waar het wordt gebruikt:** in tientallen modules, van `discover.ts` tot `publish.ts`.
- **Het probleem:** de URL is na het aanmaken nergens meer te wijzigen. Verhuist een klant van domein, dan moet er een
  nieuw merk worden aangemaakt en gaat de historie verloren.
- **Wanneer uitvragen:** blok 2, als eerste, in eerste instantie **alleen tonen**, met een aparte actie "website
  wijzigen" die waarschuwt dat de crawl opnieuw moet.

### 5.3 `style_samples`

- **Waarom nodig:** letterlijke stijlvoorbeelden uit de eigen teksten van de klant. De schrijfopdracht geeft ze
  ongewijzigd aan het model mee, en dat is het verschil tussen "in de juiste toon" en "in de eigen stem".
- **Waar het bestaat:** `profiles.style_samples` (text[]). Gevuld door het AI-onderzoek.
- **Waar het wordt gebruikt:** `lib/pipeline/content.ts`, de schrijfopdracht.
- **Het probleem:** de klant kan geen voorbeeld toevoegen of een slecht voorbeeld weghalen.
- **Wanneer uitvragen:** blok 6, direct onder "Je merk als persoon".

### 5.4 `max_inventory_pages` en 5.5 `crawl_priority_paths`

- **Waarom nodig:** bepalen hoeveel pagina's er worden gelezen en welke secties voorrang krijgen. Bij een grote site
  is dit het verschil tussen een inventaris die het aanbod dekt en een die alleen nieuwsberichten bevat.
- **Waar ze bestaan:** `profiles.max_inventory_pages` (integer, standaard 40) en `profiles.crawl_priority_paths` (text[]).
- **Waar ze worden gebruikt:** `discover.ts`, `refresh-inventory.ts`, `offering.ts`.
- **Het probleem:** ze staan alleen op het klantscherm `/merkprofiel/bewerken`, terwijl dit typisch een keuze van de
  consultant is, gemaakt op het moment dat je samen naar de site kijkt.
- **Wanneer uitvragen:** blok 8, samen met de sitemap en met `sitemap_total_urls` als context ("de sitemap gaf 8.200
  pagina's, we lezen er 40").

### 5.6 `gsc_property` (Search Console-koppeling)

- **Waarom nodig:** zonder koppeling blijft het scherm Zoekverkeer leeg en mist elk rapport de helft van zijn bewijs.
- **Waar het bestaat:** `profiles.gsc_property`, plus `gsc_verified_at`, `gsc_last_error`, `gsc_last_sync_at`, `gsc_first_day`.
- **Waar het wordt gebruikt:** `lib/search-console/sync.ts`, het scherm Zoekverkeer, de plancron.
- **Het probleem:** het staat op `/instellingen/koppelingen` en komt in het gesprek niet ter sprake, terwijl het
  onboardinggesprek precies het moment is waarop de klant iemand met toegang kan bellen.
- **Wanneer uitvragen:** blok 8, als statusregel met een knop naar het koppelscherm, niet als invoerveld.

### 5.7 `profile_topics.client_note` (de commerciële notitie per onderwerp)

- **Waarom nodig:** dit is de plek waar staat waarom een onderwerp commercieel telt. Gelezen door `topic-brief.ts`,
  dus het stuurt de briefing van elke pagina.
- **Waar het bestaat:** kolom `client_note` op `profile_topics`.
- **Het probleem:** alleen te vullen op het onderwerpenpaneel, dat de CSM tijdens dit gesprek niet open heeft.
- **Wanneer uitvragen:** blok 3, als doorverwijzing ("Bespreek de onderwerpen straks op het clusterscherm"), niet als
  extra veld hier. Anders staat dezelfde notitie op twee plekken.

### 5.8 en 5.9 Accountgegevens: `package_pages_per_month` en `started_at`

- **Waarom nodig:** het pakket bepaalt hoeveel pagina's het contentplan per maand inplant, `started_at` bepaalt waar
  "maand 4 sinds de start" op rekent. Beide worden gelezen door `lib/plans.ts` en de plancron.
- **Waar ze bestaan:** `accounts.package_pages_per_month`, `accounts.started_at`.
- **Het probleem:** het pakket wordt bij het aanmaken gekozen en daarna alleen op het pakketblok van het merkoverzicht
  getoond. In het gesprek waarin je de verwachting van de klant zet ("je krijgt 20 pagina's per maand") is het onzichtbaar.
- **Wanneer tonen:** blok 0 als context, en blok 9 als bevestiging.

### 5.10 Dode kolom die géén onboardingveld moet worden

`profiles.customer_questions` (text[], migratie 0008) bestaat in de database maar wordt door geen enkele regel code
gelezen of geschreven, en staat zelfs niet in de TypeScript-definitie van het merk. Ook de tabel `brand_dna`
(13 kolommen) wordt nergens gebruikt. Niet toevoegen aan de onboarding; opruimen hoort in een eigen opdracht.

---

## 6. Veld voor veld

Legenda voor de kolom **Status**:
**Verplicht** = het gesprek is niet af zonder dit veld, een fout kost een hele meetronde.
**Aanbevolen** = merkbaar betere uitkomst, maar het product werkt zonder.
**Optioneel** = mag leeg blijven.
**Nu ongebruikt** = wordt opgeslagen, maar geen enkele stap in de applicatie leest het op dit moment.

De kolom **Microcopy** is de letterlijke tekst die onder het invoerveld komt te staan, in kleine grijze letters.

### Blok 0. Voorbereiding (geen invoervelden, alleen context)

| Toon | Inhoud | Bron |
|---|---|---|
| Merkkaart | Merknaam, website (klikbaar), branche, account, pakket, startdatum | `profiles`, `accounts` |
| Onderzoeksstatus | Wanneer het onderzoek draaide, hoeveel pagina's gelezen, hoeveel de sitemap er had | `deep_research_at`, `profile_pages`, `sitemap_total_urls` |
| Koppelingen | Search Console gekoppeld ja of nee, laatste synchronisatie | `gsc_property`, `gsc_last_sync_at` |
| Meter | Bevestigd, gevonden, open (nu alleen onderaan) | `sessionMeter()` |

### Blok 1. Openstaande punten

Ongewijzigd in werking. Twee tekstwijzigingen: de kop wordt "Openstaande punten" in plaats van "Wat we nog niet weten",
en de knop "Invullen" wordt "Ga naar dit veld", omdat de knop springt en niet opslaat.

### Blok 2. Je bedrijf en je namen

| Huidig label | Nieuw label | Wat de CSM invult | Status | Microcopy | Gelezen door |
|---|---|---|---|---|---|
| (nieuw) | Website | Het domein waar ORBIT ENGINE leest. Alleen tonen, wijzigen via aparte actie | Verplicht | Alles wat ORBIT ENGINE over je weet begint hier: de crawl, de inventaris en het advies over je pagina's. | crawl, inventaris, structuuradvies, schrijfopdracht |
| Naam van je bedrijf | Bedrijfsnaam | De statutaire of dagelijkse bedrijfsnaam | Verplicht | Het label van dit merk in ORBIT ENGINE. Zie je overal terug in schermen, rapporten en e-mails. | schermen, rapport, klantmail |
| (nieuw) | Naam waarop we meten | De naam zoals een klant het merk noemt, precies zoals hij in een AI-antwoord zou staan | Verplicht | Hierop telt ORBIT ENGINE of een AI-assistent jou noemt. Staat hier iets anders dan wat mensen zeggen, dan valt je score te laag uit. | meting, vermeldingsclassificatie, rapport, alle merkschermen |
| Andere schrijfwijzen van je naam | Andere schrijfwijzen en afkortingen | Elke variant die een AI kan gebruiken: met en zonder BV, afkortingen, oude naam | Verplicht | Telt mee bij het meten van je vermeldingen. Zonder varianten telt een vermelding onder een andere schrijfwijze niet mee. | meting, entiteitsherkenning, naamconsistentiecontrole |
| Gelijknamige bedrijven die jij niet bent | Bedrijven met een gelijkende naam die jij niet bent | Naam plus plaats van de naamgenoot | Aanbevolen | Voorkomt dat vermeldingen van een naamgenoot als die van jou worden geteld. | meting, vermeldingsclassificatie |
| In welke categorie zit je | Branche | De markt waarin het merk concurreert, in een paar woorden | Verplicht | Stuurt bijna de hele analyse: het onderzoek, de zoekvragen, de concurrenten en de teksten. | onderzoek, aanbod, markt, schrijfopdracht, crawlkeuze |
| Wat voor bedrijf je bent | Type bedrijf | Dienstverlener, retailer, platform, fabrikant of overig | Verplicht | Bepaalt waar ORBIT ENGINE in je aanbod naar zoekt en welke vragen je krijgt voordat er een pagina geschreven wordt. | aanbodherkenning, briefing, schrijfopdracht |
| Hoe ver je bereik gaat | Werkgebied: hoe ver reikt het | Lokaal, landelijk of internationaal | Verplicht | Bepaalt of ORBIT ENGINE regionale zoekvragen stelt. Fout hier kost een hele meetronde. | zoekvraaggeneratie, kennistest |
| In welke plaatsen of streken je werkt | Plaatsen en streken waar je nu werkt | Plaatsnamen, gescheiden door komma's | Verplicht bij lokaal | Komt letterlijk in de zoekvragen van de meting terecht. | meting, zoekvragen, onderwerpkeuze |
| Markt en taal | Land en taal | Waar de klanten zitten en in welke taal | Aanbevolen | Bepaalt in welke taal en voor welk land de zoekvragen worden gesteld. | zoekvraaggeneratie, onderzoek |

### Blok 3. Je aanbod en waar je op wilt groeien

Belangrijkste volgordewijziging: `products` verhuist van het ingeklapte blok "Waar je om bekend wilt staan" naar
bovenaan dit blok. De commerciële vragen bouwen erop voort.

| Huidig label | Nieuw label | Wat de CSM invult | Status | Microcopy | Gelezen door |
|---|---|---|---|---|---|
| Je producten en diensten | Wat je verkoopt | Diensten en producten in de woorden van de klant | Verplicht | Bepaalt welk aanbod ORBIT ENGINE meet en waar de teksten over gaan. | aanbod, meting, schrijfopdracht, onderzoek |
| Waar je op wilt groeien | Waar de groei vandaan moet komen | De diensten die commercieel voorop staan | Verplicht | Deze onderwerpen stelt ORBIT ENGINE als eerste voor in je contentplan. | onderwerpkeuze, reputatieanalyse |
| Waar juist niet | Waar geen content voor mag komen | Wat wordt uitgefaseerd of te weinig oplevert | Aanbevolen | Hier maakt ORBIT ENGINE geen content voor, ook niet als het zoekvolume hoog is. | onderwerpkeuze, reputatieanalyse |
| De klantgroepen waar de groei zit | Klantgroepen waar je op mikt | Het type klant dat er dit jaar bij moet | Aanbevolen | Scherpt de onderwerpkeuze aan, specifieker dan je algemene doelgroep. | onderwerpkeuze |
| Waar je heen wilt | Gebieden waar je nog niet zit | Plaatsen of streken waar het merk heen wil | Optioneel | Levert extra zoekvragen op voor gebieden waar je nog geen klanten hebt. | zoekvragen, kennistest |
| Je pieken en dalen in het jaar | Seizoen: wanneer klanten zoeken | Drukke en stille periodes | Aanbevolen | Bepaalt wanneer een pagina klaar moet zijn, niet of hij geschreven wordt. Komt terug in de duiding van je rapport. | contentplan, rapport |
| Wat een klant ongeveer waard is | Wat een nieuwe klant ongeveer oplevert | Een van de vier banden | Optioneel, nu ongebruikt | Alleen vastgelegd voor het gesprek. Wordt op dit moment nog niet meegewogen in de app. | niemand |
| Waar niet over geschreven mag worden | Onderwerpen die niet mogen | Juridisch of concurrentiegevoelig | Aanbevolen | ORBIT ENGINE stelt deze onderwerpen niet voor en controleert na het schrijven of ze er echt niet in staan. | onderwerpkeuze, nacontrole schrijfopdracht |
| Mogen er nieuwe pagina's bij | Mogen er nieuwe pagina's bij? | Ja of nee | Aanbevolen | Bij 'nee' stelt ORBIT ENGINE alleen verbeteringen aan bestaande pagina's voor. | structuuradvies, rapport |
| Waar je over een jaar wilt staan | Doel over twaalf maanden | Eén zin, het doel waar het plan naartoe werkt | Aanbevolen | Stuurt welke onderwerpen worden voorgesteld en komt terug in elk rapport. | onderwerpkeuze, rapport |

### Blok 4. Je markt en je concurrenten

| Huidig label | Nieuw label | Wat de CSM invult | Status | Microcopy | Gelezen door |
|---|---|---|---|---|---|
| Met wie je vergeleken wordt | Concurrenten | De partijen waar de klant ook naar kijkt | Verplicht | Wordt gebruikt in de meting, het concurrentieonderzoek en de vergelijking in je rapport. | meting, marktonderzoek, off-site scan, rapport, schrijfopdracht |
| Waarom ze voor jou kiezen en niet voor hen | Waarom klanten voor jou kiezen | Het verschil dat de doorslag geeft | Aanbevolen, nu ongebruikt | Alleen vastgelegd voor het gesprek. Wordt op dit moment nog niet in de teksten gebruikt. | niemand |
| Wat je beter doet dan wie dan ook | Waarop je als enige wint | Eén ding, niet drie | Aanbevolen, nu ongebruikt | Alleen vastgelegd voor het gesprek. Wordt op dit moment nog niet in de teksten gebruikt. | niemand |
| De bezwaren die je steeds hoort | Bezwaren die klanten noemen | Wat een klant tegenwerpt vlak voor hij ja zegt | Aanbevolen | Gaat mee in elke schrijfopdracht: een AI-antwoord heeft vaak precies de vorm van zo'n bezwaar. | schrijfopdracht |

### Blok 5. Je bewijs en je boodschap

| Huidig label | Nieuw label | Wat de CSM invult | Status | Microcopy | Gelezen door |
|---|---|---|---|---|---|
| Cijfers die je claims waarmaken | Feiten en cijfers over je bedrijf | Aantallen, jaartallen, keurmerken | Verplicht | Vormt de feitenbank: hiermee onderbouwt ORBIT ENGINE claims in je teksten. Zonder feiten wordt elke tekst algemeen. | feitenbank, claimcontrole, openstaande vragen |
| Bewijs dat niet op je site staat | Bewijs dat nergens gepubliceerd is | Certificeringen en cases die niet online staan | Aanbevolen | Komt in dezelfde feitenbank terecht, zodat ORBIT ENGINE claims kan onderbouwen die het anders niet mag maken. | feitenbank |
| Je bedrijf in een alinea | Samenvatting van je bedrijf | Vier tot zes zinnen | Verplicht | Opent elk onderzoek en komt terug in je rapport en in de e-mail aan je klant. | onderzoek, rapport, klantmail |
| Waar je voor staat | Waarom klanten voor je kiezen (kort) | De uitgangspunten, als korte punten | Aanbevolen | Gaat mee in de schrijfopdracht als reden waarom klanten kiezen. | schrijfopdracht, onderzoek |
| Wat in elke tekst terug moet komen | Kernboodschappen | Wat overal moet terugkomen | Aanbevolen, nu ongebruikt | Alleen vastgelegd voor het gesprek. Wordt op dit moment nog niet in de teksten gebruikt. | niemand |
| Wat je merk wil bereiken | Missie | De verandering waar het bedrijf voor bestaat | Optioneel, nu ongebruikt | Alleen vastgelegd voor het gesprek. Wordt op dit moment niet verder gebruikt in de applicatie. | niemand |
| Hoe je je verhoudt tot de rest | Positionering | Hoe het merk gezien wil worden naast de alternatieven | Optioneel, nu ongebruikt | Alleen vastgelegd voor het gesprek. Wordt op dit moment niet verder gebruikt in de applicatie. | niemand |
| Wat je er zelf over kwijt wilt | Aanvullingen van de klant zelf | Alles wat nergens anders paste | Optioneel | Gaat mee in het onderzoek en blijft staan, ook als het onderzoek opnieuw draait. | onderzoeksopdracht |

### Blok 6. Je klant en je toon

| Huidig label | Nieuw label | Wat de CSM invult | Status | Microcopy | Gelezen door |
|---|---|---|---|---|---|
| Voor wie je het vooral doet | Belangrijkste doelgroep | De groep waar elke tekst op geschreven wordt | Verplicht | Bepaalt op wie het onderzoek en de teksten worden afgestemd. | onderzoek, schrijfopdracht |
| En wie je er nog meer mee wilt bereiken | Tweede doelgroep | Een tweede groep, als die er is | Optioneel, nu ongebruikt | Alleen vastgelegd voor het gesprek. Wordt op dit moment niet verder gebruikt. | niemand |
| Hoeveel weet je lezer al | Kennisniveau van je lezer | Weinig, redelijk wat, of vakgenoot | Optioneel, nu ongebruikt | Alleen vastgelegd voor het gesprek. Wordt op dit moment niet verder gebruikt. | niemand |
| Je klanttypes | Klanttypes | Per type een naam en waar die persoon mee zit | Optioneel, nu ongebruikt | Alleen vastgelegd voor het gesprek. Wordt op dit moment niet gebruikt bij het schrijven. | niemand |
| Hoe formeel | Hoe formeel | Een van drie standen | Aanbevolen | Bepaalt de toon van elke tekst die ORBIT ENGINE schrijft. | schrijfopdracht |
| Hoeveel energie | Hoeveel energie | Een van drie standen | Aanbevolen | Bepaalt de toon van elke tekst die ORBIT ENGINE schrijft. | schrijfopdracht |
| Hoe technisch | Hoe technisch | Een van drie standen | Aanbevolen | Bepaalt hoe diep de teksten de materie in gaan. | schrijfopdracht |
| Hoeveel humor | Hoeveel humor | Een van drie standen | Aanbevolen | Bepaalt de toon van elke tekst die ORBIT ENGINE schrijft. | schrijfopdracht |
| Welke lading | Welk gevoel | Een van vier standen | Optioneel, nu ongebruikt | Alleen vastgelegd voor het gesprek. De vier andere schuiven sturen de teksten wel. | niemand |
| Je merk als persoon | Je merk als persoon | Een paar zinnen in eigen woorden | Aanbevolen | Gaat mee in het onderzoek en in elke schrijfopdracht. | onderzoek, schrijfopdracht |
| (nieuw) | Stukjes eigen tekst als voorbeeld | Twee of drie alinea's die de klant goed vindt | Aanbevolen | Gaan letterlijk mee in de schrijfopdracht, zodat teksten in je eigen stem klinken. | schrijfopdracht |
| Woorden die je nooit wilt zien | Woorden die nooit gebruikt mogen worden | Verboden woorden | Aanbevolen | ORBIT ENGINE gebruikt ze niet en controleert na het schrijven of ze er echt niet in staan. | schrijfopdracht, nacontrole |
| Regels waar je aan moet voldoen | Wettelijke en brancheregels | AFM, medisch, KOA en dergelijke | Aanbevolen bij gereguleerde branches | Gaat letterlijk mee in elke schrijfopdracht. | schrijfopdracht |
| Uitdrukkingen die van jou zijn | Eigen uitdrukkingen | Zinnen die vaker terugkomen | Optioneel, nu ongebruikt | Alleen vastgelegd voor het gesprek. Wordt op dit moment niet in de teksten gebruikt. | niemand |
| Woorden die bij je horen | Kenmerkende woorden | Termen die het merk kenmerken | Optioneel, nu ongebruikt | Alleen vastgelegd voor het gesprek. Wordt op dit moment niet in de teksten gebruikt. | niemand |
| Hoe je je lezer aanspreekt | Aanspreekvorm in je teksten | Je, u of wij | Optioneel, nu ongebruikt | Alleen vastgelegd voor het gesprek. Wordt op dit moment niet in de teksten toegepast. | niemand |

### Blok 7. Materiaal en veranderingen

| Onderdeel | Nieuw label | Status | Microcopy |
|---|---|---|---|
| Wat je al hebt liggen | Documenten en teksten die je al hebt | Aanbevolen | ORBIT ENGINE haalt hier feiten uit en bewaart ze in je feitenbank. Eén tarievenpagina levert meestal meer op dan tien losse vragen. |
| Wat er speelt buiten je website om | Veranderingen die eraan komen | Aanbevolen | Per soort verandering doet ORBIT ENGINE iets anders: een naamswijziging gaat automatisch mee in de meting, een nieuw werkgebied in de zoekvragen. |
| Gespreksnotitie | Wat je hebt afgesproken | Aanbevolen | Wordt bewaard bij dit merk, met de datum erbij. Alleen zichtbaar voor je collega's, niet voor het model. |

### Blok 8. Techniek en koppelingen

| Huidig label | Nieuw label | Status | Microcopy | Gelezen door |
|---|---|---|---|---|
| Adres van je sitemap | Sitemap | Optioneel | Hiermee vindt ORBIT ENGINE je pagina's. Laat leeg en ORBIT ENGINE zoekt hem zelf. | crawl, inventaris |
| (nieuw) | Hoeveel pagina's we lezen | Aanbevolen bij grote sites | Bepaalt hoeveel pagina's ORBIT ENGINE van je site leest. Je sitemap heeft er nu {aantal}. | crawl, inventaris, aanbod |
| (nieuw) | Welke delen van de site voorrang krijgen | Optioneel | Bij een grote site leest ORBIT ENGINE deze mappen eerst, bijvoorbeeld /diensten. | crawl, inventaris, aanbod |
| (nieuw) | Search Console | Aanbevolen | Zonder koppeling blijft het scherm Zoekverkeer leeg en mist je rapport de cijfers over klikken en vertoningen. | zoekverkeer, rapport, contentplan |

### Blok 9. Afspraken en afronden

| Huidig label | Nieuw label | Status | Microcopy | Gelezen door |
|---|---|---|---|---|
| Naam (contact) | Contactpersoon bij de klant | Aanbevolen | Alleen vastgelegd bij dit merk. Het inlogaccount en de facturatiegegevens staan bij het account, niet hier. | niemand |
| E-mailadres | E-mailadres contactpersoon | Aanbevolen | Alleen vastgelegd bij dit merk. Uitnodigingen en rapporten gaan naar het adres dat bij het account staat. | niemand |
| Telefoonnummer | Telefoonnummer contactpersoon | Optioneel | Alleen vastgelegd bij dit merk. Wordt niet verder gebruikt in de applicatie. | niemand |
| Naam (auteur) | Auteur: naam | Optioneel, nu ongebruikt | Bedoeld voor de naam onder je artikelen. Wordt op dit moment nog niet automatisch onder content gezet. | niemand |
| Functie | Auteur: functie | Optioneel, nu ongebruikt | Zelfde: vastgelegd, nog niet gebruikt bij het publiceren. | niemand |
| Korte introductie | Auteur: introductie | Optioneel, nu ongebruikt | Zelfde: vastgelegd, nog niet gebruikt bij het publiceren. | niemand |
| Foto | Auteur: foto | Optioneel, nu ongebruikt | Zelfde: vastgelegd, nog niet gebruikt bij het publiceren. | niemand |
| LinkedIn | Auteur: LinkedIn | Optioneel, nu ongebruikt | Zelfde: vastgelegd, nog niet gebruikt bij het publiceren. | niemand |
| Facebook | Auteur: Facebook | Optioneel, nu ongebruikt | Zelfde: vastgelegd, nog niet gebruikt bij het publiceren. | niemand |
| Nog een profiel | Auteur: ander profiel | Optioneel, nu ongebruikt | Zelfde: vastgelegd, nog niet gebruikt bij het publiceren. | niemand |

> **Ontwerpkeuze bij de auteursvelden.** Zeven velden die nergens landen zijn zeven vragen die het gesprek vertragen.
> Ze blijven staan (eis uit de opdracht), maar komen in een ingeklapt blok "Auteur, voor later" met één gezamenlijke
> uitleg erboven, in plaats van zeven losse kaarten in de hoofdstroom. Zodra de auteursregel onder gepubliceerde
> content wordt gebouwd, verhuist het blok terug naar de hoofdstroom en verandert de microcopy mee.

---

## 7. Teksten en terminologie

### 7.1 "Wat je hebt": het gevraagde voorbeeld

Er staan op dit moment twee namen voor hetzelfde blok: de zijrail zegt **"Wat je hebt"**, de kop erboven zegt
**"Wat je al hebt liggen"**. Beide zeggen niet wat je moet doen, en "Wat je hebt" leest bovendien als een vraag naar
bezittingen (vestigingen, personeel, certificaten) terwijl er een tekstvak staat waar je een document in plakt.

**Voorstel:** rail en kop krijgen dezelfde naam: **"Documenten en teksten"**, met als ondertitel
*"Plak een tarievenpagina, een brochure of een stuk tekst. ORBIT ENGINE haalt er de feiten uit."*
Alternatief als het korter moet: **"Materiaal aanleveren"**.

### 7.2 Alle andere labels op het scherm

| Nu (rail) | Nu (kop) | Voorstel | Waarom |
|---|---|---|---|
| Nog niet bekend | Wat we nog niet weten | **Openstaande punten** | "Nog niet bekend" klinkt als een fout van de app. "Openstaande punten" is neutraal en zegt dat er werk ligt. |
| Wat je wilt | Wat we van je willen weten | **Groei en prioriteiten** | "Wat je wilt" is te open; de klant denkt aan wensen over de software. De kop zegt bovendien iets anders dan de rail. |
| Wat we vonden | Wat we al gevonden hebben | **Gevonden op je website** | Concreet over de bron, en het zegt meteen waarom de CSM het nakijkt. |
| Wat je hebt | Wat je al hebt liggen | **Documenten en teksten** | Zie 7.1. |
| Wat er speelt | Wat er speelt buiten je website om | **Veranderingen die eraan komen** | "Wat er speelt" is spreektaal. De nieuwe naam zegt wat voor input er wordt verwacht. |
| Afronden | Afronden | **Afronden en bijwerken** | Er gebeurt hier meer dan afronden: hier wordt het onderzoek opnieuw ingepland. |

### 7.3 Losse teksten en microcopy

| Plek | Nu | Voorstel |
|---|---|---|
| Knop in het openstaande-puntenblok | "Invullen" | "Ga naar dit veld" (de knop springt, hij slaat niets op) |
| Kop van de pagina | "Onboarding" | "Onboardinggesprek" (het is een gesprek, niet een fase) |
| Ondertitel | "Samen nalopen wat ORBIT ENGINE over {merk} heeft gevonden..." | Behouden, plus één zin: "Alles wat je hier invult wordt meteen bewaard." |
| Herkomstchip | "uit je website gehaald" | Behouden. Wel de tegenhanger aanscherpen: "niets gevonden" wordt "hier vonden we niets" |
| Chip bij niet-afleidbare lege velden | "vul jij in" | "alleen jij weet dit" |
| Meterlabels | "samen bevestigd", "door ORBIT ENGINE gevonden", "nog open" | Behouden, met een tooltip: over 53 velden, de contactgegevens tellen niet mee |
| Afrondblok | "Het onderzoek bijwerken" | "Onderzoek opnieuw laten draaien" |
| Menu-item (`lib/nav.ts`) | "Onboarding" | "Onboardinggesprek", zodat het verschilt van "Bewerken" en "Openstaande vragen" |
| Blokkop 02b | "Met wie we praten" | "Contactpersoon" |

### 7.4 Consistentie met de rest van de applicatie

Drie schermen schrijven naar dezelfde kolommen. Voorstel voor één woordenlijst:

- **Onboardinggesprek** (staf, dit scherm): het gesprek waarin het dossier wordt vastgesteld.
- **Merkdossier** (klant, `/merkprofiel`): het resultaat, alleen lezen.
- **Dossier bewerken** (klant, `/merkprofiel/bewerken`): nu "Bewerken", wat niet zegt wat je bewerkt.
- **Openstaande vragen** (`/strategie/vragen`): blijft.

Voeg boven aan dit scherm één regel toe die het verband legt: "Dit is hetzelfde dossier dat je klant ziet onder
Merkdossier. Wat je hier vastlegt, blijft staan als het onderzoek opnieuw draait."

---

## 8. Verbeteringen aan de vormgeving en de bediening

**8.1 Twee kolommen op groot scherm.** Links de invoervelden, rechts een blijvende contextkolom met de merkkaart uit
blok 0, de meter en de openstaande punten. Nu moet de CSM voor de meter naar de bodem van een zeer lange pagina.

**8.2 Voortgang per blok in de zijrail.** Per blok "6 van de 9", en het blok waar de CSM is gemarkeerd. Nu toont de
rail alleen bij het eerste blok een telling.

**8.3 Verplicht zichtbaar maken.** Een klein label "verplicht" bij de velden uit de kolom Status in hoofdstuk 6, en
een blokkade in het afrondblok: "Er staan nog 2 verplichte velden open" met springlinks. Nergens een rode rand tijdens
het typen; de klant kijkt mee.

**8.4 Velden zonder lezer visueel rustiger.** De 23 velden die nergens landen krijgen een lichtere kaart en staan in
ingeklapte blokken, met de microcopy die dat ook zegt. Ze blijven volledig invulbaar.

**8.5 De meter eerlijk maken.** Nu tellen alle 53 velden even zwaar, inclusief de 23 zonder lezer. Voorstel: twee
getallen naast elkaar, "12 van de 15 velden die de meting sturen" en "8 van de 38 aanvullende velden", zodat de CSM
ziet dat het belangrijkste deel af is.

**8.6 Opslagfeedback rustiger.** Nu verschijnt per veld een statuschip. Bij snel doorlopen springt het scherm.
Voorstel: één vaste regel bovenin ("Alles bewaard, laatste wijziging 14:32") plus een chip alleen bij een fout.

**8.7 Toetsenbordpad.** Tab loopt nu door 56 kaarten heen. Voorstel: per blok een "volgende blok"-knop, en de
lijstvelden laten Enter een item toevoegen zonder de focus te verliezen.

**8.8 Afdrukbare of deelbare samenvatting.** Na afloop een knop "Samenvatting van dit gesprek", die de vastgelegde
antwoorden plus de afspraken toont. De CSM heeft nu geen manier om terug te sturen wat er is besproken.

**8.9 Blok 0 als gespreksopener.** Zie hoofdstuk 3. Dit lost punt P8 op.

---

## 9. Wat dit voor de Client Success Manager verandert

| Moment | Nu | Straks |
|---|---|---|
| Vlak voor het gesprek | Geen voorbereidingsbeeld; de CSM opent drie schermen | Blok 0 toont merk, website, pakket, onderzoeksstatus en koppelingen op één plek |
| Openingsvraag van de klant "waarom vragen jullie dit?" | Uit het hoofd | Onder elk veld staat het antwoord in één regel |
| Halverwege | Geen idee hoe ver het gesprek is | Voortgang per blok in de rail |
| Bij twijfel over prioriteit | Alle velden zien er gelijk uit | Verplicht, aanbevolen en optioneel zijn zichtbaar; het gesprek kan bij tijdgebrek stoppen na blok 5 |
| Bij velden die nergens landen | Kost evenveel tijd als de rest | Ingeklapt, met eerlijke microcopy, over te slaan zonder verlies |
| Aan het eind | Meter met drie getallen en een knop | Zelfde, plus een blokkade op openstaande verplichte velden en een samenvatting om te delen |
| Weken later | Terugzoeken in het diagnosescherm | Gespreksnotitie, veranderingen en datum staan bij het dossier |

---

## 10. Van onboarding naar database naar functionaliteit

De keten is overal hetzelfde en heeft geen tweede route:

```
Onboardingsessie (scherm)
  → PATCH /api/profiles/[id]        (service-role, ownership-check, EDITABLE_PROFILE_FIELDS)
     → profiles.<kolom>             (de waarde)
     → profile_field_sources        (herkomst: klant, gesprek, consultant, ai, plus niet-van-toepassing)
  → PUT /api/profiles/[id]/strategy → profile_strategy (notitie, veranderingen; werkt aliassen en regio's door)
  → POST /api/profiles/[id]/dossier → brand_documents en brand_facts (feiten uit geplakte tekst)
  → POST /api/profiles/[id]/refresh → jobs (alleen de stappen die van de gewijzigde velden afhangen)
```

Waarom de herkomst per veld telt: `lib/pipeline/field-merge.ts` laat elk veld met een mensbron met rust als het
onderzoek opnieuw draait. Wat in het gesprek is vastgelegd, wordt dus nooit door een volgende AI-ronde overschreven.
Dat is precies de reden dat de onboardingsessie meer is dan een formulier.

Wat de velden daarna aandrijven, per functionaliteit:

| Functionaliteit | Leest onder meer |
|---|---|
| Zoekvragen en meting | `brand_name`, `name`, `aliases`, `name_exclusions`, `service_scope`, `service_regions`, `growth_regions`, `market_language`, `products`, `competitors` |
| Kennistest (wat AI's al weten) | `brand_name`, `aliases`, `service_regions`, `competitors`, `industry` |
| Aanbod en onderwerpen | `industry`, `business_model`, `products`, `priority_offerings`, `deprioritised_offerings`, `target_segments`, `forbidden_topics`, `goal_12m` |
| Marktonderzoek en concurrenten | `competitors`, `industry`, `service_regions` |
| Feitenbank en claimcontrole | `proof_points`, `offline_proof`, materiaalblok |
| Schrijfopdracht | `tone_of_voice`, vier toonschuiven, `taboo_phrases`, `compliance_notes`, `value_props`, `products`, `sales_objections`, `forbidden_topics`, `style_samples` |
| Contentplan | pakket op accountniveau, `seasonality`, `goal_12m`, funnelfases |
| Rapport en duiding | `summary`, `goal_12m`, `seasonality`, `respect_site_structure`, `competitors` |
| Zoekverkeer | `gsc_property` en de vier andere Search Console-kolommen |
| Crawl en inventaris | `url`, `sitemap_url`, `max_inventory_pages`, `crawl_priority_paths` |

---

## 11. Aanbevolen eindstructuur

```
Onboardinggesprek: {merknaam}
Alles wat je hier invult wordt meteen bewaard.

[contextkolom, blijft in beeld]
  Merk, website, branche, account, pakket, startdatum
  Onderzoek gedraaid op {datum}, {n} pagina's gelezen van {m} in de sitemap
  Search Console: gekoppeld of niet
  Meter: {x} van de 15 sturende velden, {y} van de 38 aanvullende
  Openstaande punten: {n}

1  Openstaande punten                      (nu: "Nog niet bekend")
2  Je bedrijf en je namen                  (10 velden, waarvan 2 nieuw)
3  Je aanbod en waar je op wilt groeien    (10 velden)
4  Je markt en je concurrenten             (4 velden)
5  Je bewijs en je boodschap               (8 velden)
6  Je klant en je toon                     (17 velden, waarvan 1 nieuw; 8 ingeklapt)
7  Documenten en teksten                   (materiaal plakken)
   Veranderingen die eraan komen           (gestructureerd, plus notitie)
8  Techniek en koppelingen                 (4 velden, waarvan 3 nieuw)
9  Afspraken en afronden
     Contactpersoon (3 velden)
     Auteur, voor later (7 velden, ingeklapt)
     Meter, openstaande verplichte velden, samenvatting delen
     Onderzoek opnieuw laten draaien (met raming in het bevestigvenster)
```

Totaal: 56 bestaande velden, allemaal behouden, plus 6 nieuwe invoervelden
(`brand_name`, `url` als correctiepad, `style_samples`, `max_inventory_pages`, `crawl_priority_paths`, Search Console-status).

---

## 12. Implementatieplan

Zes stappen, elk apart te bouwen en te testen. Elke stap eindigt met `npx tsc --noEmit`, `npm run test:unit`,
`npm run test:chain` en `npm run build`.

**Stap 1. `brand_name` bewerkbaar maken (kleinste stap, grootste effect).**
Toevoegen aan `EDITABLE_PROFILE_FIELDS` en aan `BRAND_FIELDS` (stap "bedrijf", direct na `name`, `derivable: true`).
Unittest die vastlegt dat catalogus en editable lijst nog steeds gelijk lopen. Geen migratie nodig, de kolom bestaat.
Controleren dat `field-merge.ts` het veld daarna met rust laat als een mens het heeft gezet.

**Stap 2. Microcopy per veld.**
Nieuw veld `usage` op `BrandField` in `lib/pipeline/brand-fields.ts`, met per veld de tekst uit hoofdstuk 6.
`BrandFieldInput` rendert hem onder het invoerveld in de kleine grijze stijl. Unittest die eist dat élk veld in de
catalogus een `usage` heeft, zodat een nieuw veld niet zonder uitleg kan landen. Dit werkt automatisch door in de
klantwizard, wat gewenst is.

**Stap 3. Verplicht, aanbevolen, optioneel.**
Nieuw veld `priority: "verplicht" | "aanbevolen" | "optioneel"` op `BrandField`, plus een pure functie
`missingRequired(profile, states)` naast `findGaps()`. Het afrondblok toont de blokkade. Geen validatie tijdens het
typen: de klant kijkt mee.

**Stap 4. Herindeling in negen blokken.**
Nieuwe `BrandStep`-waarden of, minder ingrijpend, een aparte `SESSION_BLOCKS`-indeling die de bestaande stappen
hergroepeert. De catalogusvolgorde blijft bestaan voor de klantwizard. Rail- en koplabels uit hoofdstuk 7.
Let op de bestaande test die eist dat de stappen exact de editable velden dekken.

**Stap 5. De vijf overige nieuwe velden.**
`style_samples`, `max_inventory_pages`, `crawl_priority_paths` toevoegen aan de catalogus en aan
`EDITABLE_PROFILE_FIELDS` (de laatste twee staan al in de PATCH-route, controleren op dubbele afhandeling).
`url` als toonveld met aparte wijzigactie plus waarschuwing. Search Console als statusregel met knop naar
`/instellingen/koppelingen`, geen invoerveld.

**Stap 6. Vormgeving en contextkolom.**
Blok 0, tweekolomsindeling, voortgang per blok, rustiger opslagfeedback, samenvatting om te delen.
Hierbij `docs/ux-design.md` en `docs/designsystem.md` volgen, en de bestaande test die controleert dat er geen
taaknamen, bedragen of foutcodes op dit scherm verschijnen.

**Bij te werken documentatie in dezelfde ronde:** `docs/architecture.md` (velden en routes),
`docs/ux-design.md` (het scherm), `docs/logbook.md` (het besluit, met de cijfers uit dit document),
`supabase/README.md` alleen als er alsnog een migratie bij komt.

**Wat bewust buiten dit plan valt:** het opruimen van de dode kolom `customer_questions` en de ongebruikte tabel
`brand_dna`, en het bouwen van de auteursregel onder gepubliceerde content. Beide zijn eigen opdrachten.
