# Van nieuwe klant tot opgeleverde content: de volledige doorloop

> **Waarvoor dit document is.** Twee dingen tegelijk:
>
> 1. **Een testdoorloop.** De app één keer helemaal doorlopen met een testklant, en bij elke stap
>    controleren of alles goed gaat.
> 2. **Een gespreksstuk voor het ontwikkelteam.** Per stap staat wat het doel is, wat de AI precies
>    meekrijgt en terugstuurt, wat de code daarna doet, en welke punten het bespreken waard zijn om
>    de stap te verbeteren.
>
> **Voor wie.** De eigenaar (niet technisch) en het ontwikkelteam. Elke stap heeft vaste lagen:
>
> | Laag | Voor wie | Wat erin staat |
> |---|---|---|
> | **Doel** | iedereen | Waarom deze stap bestaat, in één of twee zinnen |
> | **Wat er gebeurt** | iedereen | De stap in gewone taal. Genoeg om de test te doen |
> | **AI-aanroep** | iedereen | Welk model, wat er meegaat, wat de opdracht is, wat eruit komt, wat de code erna doet |
> | **Onder de motorkap** | engineer | Bestanden, taaksoorten, tabellen |
> | **Controleer** | testdoorloop | Afvinkpunten: wat je ziet als het goed gaat |
> | **Om te bespreken** | ontwikkelteam | Zwakke plekken en verbeterkansen die in de code te zien zijn |
>
> **Peildatum: 26 september 2026**, gecontroleerd tegen de code op `main` (na PR #162). De code is
> leidend: klopt iets hier niet meer, dan is dit document fout. De opdrachten aan de AI staan hier
> samengevat, met de belangrijkste zinnen letterlijk; de volledige tekst staat in het bestand dat
> bij elke aanroep genoemd wordt. Wat er na het opleveren gebeurt (publiceren, de controle van de
> live pagina en de nameting na 14 en 28 dagen) staat in
> [`processtappen-nieuwe-pagina.md`](./processtappen-nieuwe-pagina.md) fase 14 en 15. Het plan achter
> de contentketen staat in [`tasks/contentketen-opnieuw.md`](./tasks/contentketen-opnieuw.md).

---

## Inhoud

**Deel I. De app in het kort**
- [1. Wat ORBIT ENGINE is](#1-wat-orbit-engine-is)
- [2. De flow op één bladzijde](#2-de-flow-op-één-bladzijde)
- [3. Begrippen](#3-begrippen)
- [4. Hoe de app werkt onder de motorkap](#4-hoe-de-app-werkt-onder-de-motorkap)
- [5. De AI in de app: modellen en soorten werk](#5-de-ai-in-de-app-modellen-en-soorten-werk)

**Deel II. De doorloop, stap voor stap**
- [Fase 0. Voorbereiding van de testdoorloop](#fase-0-voorbereiding-van-de-testdoorloop)
- [Fase 1. Het merk aanmaken](#fase-1-het-merk-aanmaken)
- [Fase 2. Het automatische onderzoek](#fase-2-het-automatische-onderzoek)
- [Fase 3. Het gesprek met de klant](#fase-3-het-gesprek-met-de-klant)
- [Fase 4. De klant toegang geven](#fase-4-de-klant-toegang-geven)
- [Fase 5. Een cluster opzetten](#fase-5-een-cluster-opzetten)
- [Fase 6. De meting](#fase-6-de-meting)
- [Fase 7. Het rapport en de kansen](#fase-7-het-rapport-en-de-kansen)
- [Fase 8. Het contentplan](#fase-8-het-contentplan)
- [Fase 9. De voorbereiding van de pagina's](#fase-9-de-voorbereiding-van-de-paginas)
- [Fase 10. De vragen aan de klant](#fase-10-de-vragen-aan-de-klant)
- [Fase 11. Het schrijven](#fase-11-het-schrijven)
- [Fase 12. De controle en hooguit één herschrijving](#fase-12-de-controle-en-hooguit-één-herschrijving)
- [Fase 13. Lezen, goedkeuren en opleveren](#fase-13-lezen-goedkeuren-en-opleveren)

**Deel III. Voor het gesprek met het ontwikkelteam**
- [De tien belangrijkste punten om te bespreken](#de-tien-belangrijkste-punten-om-te-bespreken)

**Bijlagen**
- [A. Wat nog niet af is, of anders werkt dan je zou denken](#bijlage-a-wat-nog-niet-af-is-of-anders-werkt-dan-je-zou-denken)
- [B. Alle AI-aanroepen op een rij](#bijlage-b-alle-ai-aanroepen-op-een-rij)
- [C. Statussen](#bijlage-c-statussen)
- [D. Kosten en tijd](#bijlage-d-kosten-en-tijd)
- [E. Handige query's tijdens de doorloop](#bijlage-e-handige-querys-tijdens-de-doorloop)

---

# Deel I. De app in het kort

## 1. Wat ORBIT ENGINE is

**Het probleem.** Steeds meer mensen stellen hun vragen niet meer aan Google, maar aan een
AI-assistent zoals ChatGPT: "welke installateur in Eindhoven kan mijn cv-ketel vervangen?". Wordt
een bedrijf in dat antwoord niet genoemd, dan bestaat het voor die vrager niet. Dat heet GEO
(Generative Engine Optimization): zichtbaar zijn in de antwoorden van AI-assistenten.

**Wat de app doet**, voor een mkb-bedrijf, in vier bewegingen:

1. **Meten.** Word je genoemd als iemand een koopvraag stelt, hoe vaak vergeleken met je
   concurrenten, en waar haalt de AI zijn informatie vandaan?
2. **Adviseren.** Welke pagina's ontbreken of zijn te zwak, zodat een AI-assistent je niet kan
   noemen?
3. **Schrijven.** Die pagina's samen met de ondernemer maken: wij halen op wat alleen hij weet, en
   een sterke AI-schrijver maakt er een pagina van die hij zo op zijn site zet.
4. **Effect bewijzen.** Na publicatie opnieuw meten, naast een controlegroep, om te zien of de
   pagina iets opleverde.

**Het uitgangspunt van het schrijven** (`tasks/contentketen-opnieuw.md` §0): *"ORBIT ENGINE probeert
niet de beste AI-tekst te maken, maar de kennis van een ondernemer zo goed mogelijk aan een goede
AI-schrijver te geven."* Daarom zijn de vragen aan de ondernemer de kern van het product, en niet
een last die we klein houden.

**Sales-led.** Een klant maakt zelf geen account en geen merk aan. De consultant zet het merk klaar
vóór het eerste gesprek, de app doet het onderzoek, en pas na de verkoop gaat het merk naar het
account van de klant (`docs/logbook.md` §15). Alles wat geld kost, start de consultant.

**Wat de app bewust niet doet.** Zelf publiceren op de site van de klant (er is geen koppeling met
zijn websitesysteem), zoekwoordenonderzoek als los product, en tien AI-assistenten tegelijk meten.

## 2. De flow op één bladzijde

```
 CONSULTANT                    APP (automatisch)                         KLANT
 ──────────                    ─────────────────                         ─────
 1  Merk aanmaken  ─────────▶  2  Onderzoek: site lezen, aanbod,
    (3 velden)                    markt, kennistest, dossier
                                  (±7,5 min, ±$0,25)
 3  Gesprek met klant  ◀──────────────────────────────────────────────▶  meekijken, aanvullen
    (dossier nalopen,             onderzoek bijwerken als nodig
    verhalen, stem)
 4  Toewijzen + pakket ──────────────────────────────────────────────▶  kan inloggen
 5  Cluster starten ─────────▶    meetvragen opstellen (30)
    vragen goedkeuren ◀────────── (poort: pas meten na akkoord)
                               6  Meten: 30 vragen aan ChatGPT
                                  (±$0,82 per ronde)
                               7  Rapport: waar win/verlies je,
                                  welke pagina's zijn nodig
 8  Contentplan: kansen in
    maanden zetten, maand
    vrijgeven ───────────────▶  9  Per pagina: open vraag + content
                                  brief (onderzoek + tot 8 vragen)
                                                                   ──▶  10 vragen beantwoorden
                               11 Schrijven (zodra alle vragen
                                  gedaan zijn en de datum nadert)
                               12 Controle, hooguit 1x herschrijven,
                                  twijfelachtige zinnen worden geel
                                                                   ──▶  13 lezen, gele zinnen
                                                                        bevestigen, goedkeuren,
                                                                        op eigen site zetten
```

Per pagina zijn er drie tot vier AI-aanroepen (brief, schrijven, controle, soms een herschrijving),
samen 10 tot 17 dollarcent op de proef van 26 september 2026.

## 3. Begrippen

| Begrip | Betekenis | In de code |
|---|---|---|
| **Merk** of **merkprofiel** | Eén klantbedrijf met zijn website | `profiles` |
| **Aanbodboom** | Diensten en producten van het merk, als boom, elk met een bronpagina | `profile_offerings` |
| **Feiten** | Uitspraken over het bedrijf die letterlijk op de site staan of van de ondernemer komen | `brand_facts` |
| **Onderwerp** | Een voorstel voor een cluster, afgeleid uit het aanbod | `profile_topics` |
| **Cluster** | Eén onderwerp waarop het merk gemeten wordt, bijvoorbeeld "cv-ketel vervangen" | `analyses` |
| **Meetvraag** of **prompt** | Een vraag die een koper aan een AI-assistent stelt | `prompts` |
| **Meting** | Het antwoord van de AI op één meetvraag, met de beoordeling wie er genoemd wordt | `tracking_runs`, `mentions` |
| **Rapport** en **kans** | De uitslag van een cluster, met aanbevolen pagina's | `reports.recommendations_json` |
| **Contentplan** | Twaalf maanden plus een voorraad met kansen | `content_plans`, `plan_months`, `planned_pages` |
| **Pakket** | Hoeveel pagina's per maand er verkocht zijn (5, 10 of 20) | `accounts.package_pages_per_month` |
| **Vraag aan de klant** | Een vraag die de ondernemer beantwoordt of overslaat | `fact_requests` |
| **Open vraag** | De vaste vraag per pagina: "Wat wil je zelf op deze pagina vertellen?" | `fact_requests.open_vraag` |
| **Content brief** | Het onderzoek vóór het schrijven van één pagina | `content_pieces.brief_json` |
| **Blok A, B, C, D** | De vier soorten informatie voor de schrijver: bedrijfskennis, klantinput, onderzoek, zoekintentie | `lib/pagina/schrijfopdracht.ts` |
| **Stemvoorbeelden** | Eén tot drie pagina's waarop de stem van het bedrijf te horen is | `profiles.stem_voorbeelden` |
| **Gele zin** | Een zin die de ondernemer moet bevestigen of aanpassen voor hij goedkeurt | `content_pieces.controle_json.gele_zinnen` |
| **Taak** | Eén stap die de app op de achtergrond uitvoert | `jobs` |

## 4. Hoe de app werkt onder de motorkap

1. Bijna alles gebeurt op de achtergrond in een **wachtrij met taken**. Een scherm zet een taak klaar
   en geeft meteen antwoord; het scherm mag daarna dicht.
2. Een **werker** pakt elke minuut de taken op die klaarstaan. Elke taak plant zelf de volgende in, zodat
   een keten vanzelf doorloopt.
3. Een taak doet **hooguit één zware AI-aanroep**. Mislukt hij, dan probeert de werker het tot vier
   keer, met 2, 4, 8 en 16 minuten ertussen.
4. Elke taak kijkt **eerst of zijn resultaat al bestaat**. Een herhaling betaalt nooit twee keer.
5. Alles wat **geld kost**, start alleen de consultant, en er geldt een dagplafond.
6. Elke AI-aanroep wordt met zijn kosten en zijn volledige ruwe antwoord bewaard.

**Onder de motorkap.** De wachtrij is `jobs` (`lib/jobs/queue.ts`, `worker.ts`, `handlers.ts`). De
werker draait via Supabase `pg_cron` (taak `geo-worker`) en roept `/api/cron/worker` aan; zonder de
Vault-geheimen `geo_site_url` en `geo_cron_secret` gebeurt er niets, zonder foutmelding
(`docs/architecture.md` §9). Een taak die langer dan 5 minuten op `running` staat, gaat terug in de rij.
Kosten per aanroep staan in `ai_calls`. De betaalde handelingen staan in `STAFF_ONLY_ACTIONS`
(`lib/cost-rules.ts`): merk onderzoeken, cluster starten, meting starten, contentplan opstellen, maand
vrijgeven, reputatieanalyse en clusters aanvullen. Het dagplafond is €20 per account en €50 over alle
accounts samen (`lib/spend-limit.ts`). Schrijven gebeurt nooit rechtstreeks vanuit het scherm: altijd
via een route met een controle wie de eigenaar is (CLAUDE.md, conventie 6).

## 5. De AI in de app: modellen en soorten werk

De app gebruikt OpenAI, met twee modellen die vast in de code staan (`lib/openai/models.ts`):

| Naam in de code | Model | Waarvoor |
|---|---|---|
| `MODELS.volume` en `MODELS.quality` | **Luna** (`gpt-6-luna`), goedkoper | Onderzoek, meten, indelen, rapport |
| `MODELS.content` | **Sol** (`gpt-6-sol`), het sterkste | De content brief, schrijven, controle, en de samenvatting van het onderzoek |

Per aanroep kiest de code een **soort werk**, die bepaalt hoeveel het model mag nadenken en hoe vrij
het mag formuleren (`lib/openai/sampling.ts`):

| Soort werk | Denktijd | Vrijheid | Gebruikt voor |
|---|---|---|---|
| `deterministic` | geen | zo vast mogelijk | Beoordelen of een merk genoemd wordt, feiten indelen |
| `analytical` | laag | bijna vast | Onderzoek, rapport, content brief |
| `creative` | geen | veel variatie | Meetvragen bedenken |
| `judging` | middel | | De controle van een tekst, conflicten tussen feiten |
| `content` | middel | natuurlijk | Samenvatting van het onderzoek (premium), potentieschatting |
| `redactioneel` | hoog | | Schrijven en herschrijven |

**Zoeken op het web** staat per aanroep aan of uit. Met `MEASURE_WEB_SEARCH=false` gaat het zoeken
bij de meting en de kennistest uit (goedkoper ontwikkelen, maar niet representatief).

**Drie regels die bij elke AI-aanroep terugkomen** (CLAUDE.md, code-conventies):
- Harde feiten (bedragen, getallen, termijnen, garanties) krijgen altijd een controle in code. Stijl,
  toon en lengte bewust niet.
- Onbruikbare uitvoer wordt "onbekend", nooit 0 en nooit een gok.
- Elke aanroep bewaart zijn volledige ruwe uitvoer, voor de controle achteraf.

---

# Deel II. De doorloop, stap voor stap

## Fase 0. Voorbereiding van de testdoorloop

**Doel.** Zorgen dat de doorloop niet halverwege stilvalt door een instelling. Dan test je niets.

**Wat je nodig hebt**

- Een **beheerdersaccount** (staat in `staff_users`). Daarmee doe je alles wat de consultant doet.
- Een **tweede inlog voor de testklant**, om te zien wat de klant ziet. Dat kan een uitnodiging zijn
  (fase 4) of een gebruiker die je in Supabase aanmaakt (Authentication, Add user, Auto Confirm aan).
- Een **echte website** van een bedrijf met een duidelijk aanbod en een werkgebied. Een site met
  weinig tekst geeft een magere aanbodboom, en dan vallen de onderwerpvoorstellen weg (stap 2.6).
- Iemand die de rol van **ondernemer** speelt en de vragen kan beantwoorden, het liefst met echte
  kennis van het bedrijf. De kwaliteit van de tekst hangt vooral af van die antwoorden.
- Een **pakketkeuze** (5, 10 of 20 pagina's per maand). Voor een test is het kleinste pakket genoeg.

**Controleer vooraf**

- [ ] De werker draait: `select * from cron.job_run_details order by start_time desc limit 5;`
      toont runs van de afgelopen minuten.
- [ ] Er is budget: in `ai_calls` is de som van `cost_usd` van vandaag ruim onder het plafond.
- [ ] Je weet welke meetbronnen aanstaan. ChatGPT meet altijd. Google AI Overview meet alleen met
      `AI_OVERVIEW_ENABLED=true`, Gemini alleen met `DATAFORSEO_LLM_ENABLED=true` (Vercel,
      omgevingsvariabelen).
- [ ] E-mail staat standaard uit (`EMAILS_ENABLED`). Een uitnodigingslink kopieer je dus zelf.

**Een belangrijk punt over de kalender.** Het plan verdeelt de publicatiedata over dag 1 tot en met
28 van een maand, en in de lopende maand vanaf morgen. Geschreven wordt er op zijn vroegst **tien
dagen vóór** de publicatiedatum. Wie aan het eind van een maand test, heeft in de lopende maand
bijna geen ruimte meer; de pagina's komen dan in de volgende maand en een deel wacht met schrijven.
Voor een snelle doorloop heeft de consultant de knop **"nu laten schrijven"** (stap 11.3): die slaat de
datum over, maar nooit de vragen.

---

## Fase 1. Het merk aanmaken

*Wie: de consultant. Waar: Merken, "+ Nieuw merk" (`/merk/nieuw`). Kost: niets direct, start wel het
betaalde onderzoek van fase 2.*

**Doel.** Met zo min mogelijk invoer een merk vastleggen, zodat de app het onderzoek kan doen vóór er
een gesprek met de klant is.

**Wat er gebeurt**

**1.1 De consultant vult drie velden in**: het webadres, de bedrijfsnaam, en eventueel andere
schrijfwijzen van de naam (een afkorting, een veelgemaakte spelfout). Die laatste lijkt onbelangrijk,
maar de meting telt later alleen de namen die bekend zijn: een ontbrekende schrijfwijze geeft een te
lage score.

**1.2 De app controleert het adres.** Is het ongeldig, dan staat de melding bij het veld. Is de site
niet bereikbaar, dan meldt de app dat en mag de consultant toch doorgaan: sommige sites weren
automatische bezoekers.

**1.3 Het merk wordt opgeslagen**, eerst op het account van de consultant. De klant ziet het nog
niet. Wat de consultant intypte, krijgt het label "ingevuld door de consultant": het onderzoek mag
dat tegenspreken, maar nooit stilletjes overschrijven.

**1.4 De eerste onderzoekstaak wordt klaargezet.** Het scherm geeft meteen antwoord.

**AI-aanroep.** Geen.

**Onder de motorkap.** `POST /api/profiles` (`app/api/profiles/route.ts`): `mayTriggerCost` voor
`merk_onderzoeken` (alleen beheerder, anders 403), `checkBudget` (402 bij een vol plafond),
`checkUrlFormat` en `isReachable` (met `force` om door te gaan). Rij in `profiles` met
`status = 'bezig'` en `account_id` van de beheerder; herkomst in `profile_field_sources` met
`source = 'consultant'`. Daarna `enqueue` van `profile_light_scan`. Het pakket wordt hier bewust niet
gezet; dat gebeurt bij het toewijzen (stap 4.3).

**Controleer**

- [ ] Het merk staat in de merkenlijst met de fase "Voorbereiden".
- [ ] `select type, status from jobs where profile_id = '<id>'` toont `profile_light_scan`.

**Om te bespreken**

- Drie velden is weinig invoer voor een onderzoek van 25 dollarcent. Het werkgebied ontbreekt, terwijl
  het bepaalt of de meetvragen regionaal of landelijk worden. Het onderzoek raadt het werkgebied nu
  uit de site; de consultant weet het vaak al.

---

## Fase 2. Het automatische onderzoek

*Wie: niemand, het loopt vanzelf. Duur: tot ongeveer 10 minuten vooronderzoek, daarna ongeveer 7,5
minuut. Kost: ongeveer 25 dollarcent.*

**Doel.** Vóór het eerste gesprek weten wie dit bedrijf is, wat het aanbiedt, wie de concurrenten zijn
en wat AI-assistenten er al over weten. Zo verkoopt de consultant op wat de app gevonden heeft, en
weet hij welke vragen hij in het gesprek moet stellen.

De taken hieronder lopen na elkaar. Elke taak plant de volgende in.

### 2.1 Vooronderzoek

**Doel.** Kiezen welke pagina's de volgende stap helemaal leest.

**Wat er gebeurt.** De app bekijkt tot 1.000 pagina's van de site, alleen de titel en de korte
omschrijving. Geen AI, dus gratis, maar het kost tijd. Mislukt dit, dan gaat de keten gewoon door.

**AI-aanroep.** Geen.

### 2.2 De site uitlezen

**Doel.** De tekst van de site in huis halen, als grondstof voor alles daarna.

**Wat er gebeurt.** De app leest tot 150 pagina's helemaal, verdeeld over alle delen van de site. Hij
haalt er telefoon, adres, e-mail en KvK-nummer uit, herkent het soort website (welk systeem, hoe een
FAQ daar getoond wordt) en kijkt of de tekst leesbaar is zonder JavaScript.

**AI-aanroep (alleen bij een grote site): welke delen lezen we?**
- **Model:** Luna, `analytical`, zonder zoeken. Ongeveer 1 dollarcent.
- **Gaat erin:** de secties van de site zoals ze in de sitemap staan, met het aantal pagina's per sectie.
- **Opdracht:** bepaal welke delen van de site uitgelezen moeten worden om het aanbod in kaart te brengen
  (diensten, producten, productgroepen, vestigingen).
- **Komt eruit:** de secties die voorrang krijgen.
- **Bestand:** `lib/pipeline/crawl-focus.ts`.

### 2.3 Technische controle

**Doel.** Weten of AI-assistenten de site überhaupt kunnen lezen.

**Wat er gebeurt.** Loopt naast de rest mee. Mogen de crawlers van AI-bedrijven de site bezoeken
(`robots.txt`), is de naam overal hetzelfde, is er gestructureerde informatie voor zoekmachines.

**AI-aanroep.** Geen.

### 2.4 Het bedrijf leren kennen

**Doel.** De basis van het merkprofiel: wie is dit bedrijf, wat doet het, voor wie, waar, en tegen wie
concurreert het.

**Wat er gebeurt.** Eén AI-aanroep met zoeken op het web. Wat een mens eerder invulde, blijft staan.
**Dit is de enige onderzoeksstap die de keten stopt als hij mislukt**, want alles daarna bouwt erop.

**AI-aanroep**
- **Model:** Luna, `analytical`, **met** zoeken op het web.
- **Gaat erin:** het webadres, de tekst van de gelezen pagina's, hoeveel pagina's dat zijn, en wat de
  consultant al invulde (als "aanname van vóór het gesprek", die tegengesproken mag worden).
- **Opdracht (kern):** *"Je bent een merk- en marktanalist."* Bepaal branche, kernaanbod, toon,
  klantgroepen, waardeproposities en 3 tot 5 concurrenten van het hele bedrijf. Daarnaast: de merknaam
  zoals klanten die kennen (niet het domein), het bedrijfsmodel (retailer, platform, dienstverlener,
  fabrikant), het bereik (lokaal, landelijk, internationaal) met de plaatsen, harde feiten die
  letterlijk op de site staan, en 2 tot 3 letterlijke voorbeeldzinnen van de merkstem. Bij veel pagina's:
  *"wat er in dit materiaal niet voorkomt, biedt het bedrijf waarschijnlijk ook niet aan"*; bij weinig
  pagina's: trek geen conclusies uit wat ontbreekt. Weet je het werkgebied niet: *"kies 'onbekend'. Dat
  is een beter antwoord dan een gok."*
- **Komt eruit:** het profiel (branche, aanbod, concurrenten, bereik, werkgebied, bedrijfsmodel,
  waardeproposities, feiten, stijlvoorbeelden).
- **Code daarna:** wat een mens zette, wint van het model (`field-merge.ts`); plaatsnamen worden
  ontdubbeld.
- **Bestand:** `lib/pipeline/profile-research.ts`, `prepare-profile.ts`.

### 2.5 Het aanbod als boom

**Doel.** Precies weten wat het bedrijf levert. Alles daarna (onderwerpen, meetvragen, aanbevelingen)
moet uit dit aanbod volgen, anders meten en schrijven we over dingen die het bedrijf niet doet.

**AI-aanroep**
- **Model:** Luna, `analytical`, **zonder** zoeken (bewust: anders neemt het model aanbod van
  concurrenten over).
- **Gaat erin:** bedrijfsnaam, website, branche, de structuur van de site uit de sitemap, en de tekst
  van ongeveer 35 van de 150 gelezen pagina's (een budget van 55.000 tekens, eerlijk verdeeld over de
  secties van de site).
- **Opdracht (kern):** breng het aanbod in kaart als boom. Harde regels: *"Elke knoop MOET een
  evidenceUrl hebben (...) en een evidenceQuote die LETTERLIJK in de tekst van die pagina staat."*
  *"Verzin geen aanbod."* Doelgroep en prijs leeg laten als de site er niets over zegt. Een advies of tip
  op de site is geen dienst. Zet in `gaps` wat je niet kon vaststellen: dat wordt de agenda van het
  gesprek. De opdracht verschilt per bedrijfsmodel.
- **Komt eruit:** knopen (dienst, product, categorie) met ouder, omschrijving, bron en citaat, plus
  open punten.
- **Code daarna:** een knoop zonder gelezen bronpagina vervalt; het citaat wordt nagelopen
  (`quote-check.ts`). Wat afvalt, komt als open punt in beeld.
- **Bestand:** `lib/pipeline/offering.ts`.

### 2.6 Onderwerpen voorstellen

**Doel.** Vijf tot acht onderwerpen voorstellen waarop het merk gemeten kan worden. Dit zijn de
kandidaten voor de clusters van fase 5.

**AI-aanroep**
- **Model:** Luna, `analytical`, zonder zoeken.
- **Gaat erin:** bedrijfsnaam, branche, bedrijfsmodel, werkgebied, de aanbodboom, de commerciële sturing
  (waar het bedrijf op wil groeien) en, als het gesprek er al was, de notities daarvan.
- **Opdracht (kern):** bepaal 5 tot 8 onderwerpen *"waarop dit bedrijf zichtbaar moet zijn in
  AI-assistenten"*. Het niveau bepaalt alles: niet te breed ("fysiotherapie"), niet te smal ("dry
  needling bij frozen shoulder"), maar zoals iemand met een probleem zoekt ("hardloopblessure
  behandelen"). Elk onderwerp moet uit het aanbod volgen, zonder merknamen, zonder overlap, met een
  onderbouwing in gewone taal.
- **Komt eruit:** onderwerpen met onderbouwing en de aanbodknopen waar ze uit volgen.
- **Code daarna:** zonder aanbodboom wordt deze stap overgeslagen; er worden dan bewust geen algemene
  onderwerpen verzonnen.
- **Bestand:** `lib/pipeline/propose-topics.ts`.

### 2.7 De markt

**Doel.** Begrijpen waarom concurrenten winnen, en welke externe websites in deze markt gezag hebben.

**AI-aanroep**
- **Model:** Luna, `analytical`, **met** zoeken op het web.
- **Gaat erin:** bedrijfsnaam, website, branche, bedrijfsmodel, werkgebied, aanbod, en de concurrenten
  uit stap 2.4 (om te controleren en aan te vullen).
- **Opdracht (kern):** *"Je bent marktanalist voor een GEO-adviesbureau."* Lever per concurrent waarom
  die wint, concreet (bereik, prijs, specialisatie, sterke aanwezigheid op een platform), met een
  vindplaats. Lever de domeinen die in deze markt gezaghebbend zijn (vergelijkers, reviewplatforms,
  vakpers), en de positie van dit bedrijf. *"Verzin geen concurrenten die niet bestaan."*
- **Komt eruit:** concurrenten met reden en bron, gezaghebbende domeinen, positionering.
- **Bestand:** `lib/pipeline/market.ts`.

### 2.8 De kennistest

**Doel.** Weten wat AI-assistenten nu al over dit bedrijf weten, en of dat klopt. *"ChatGPT denkt dat
je in Eindhoven zit"* is voor een ondernemer de meest alarmerende uitkomst van het hele onderzoek.

**AI-aanroep (een reeks korte vragen, als een gewone gebruiker)**
- **Model:** Luna, met een neutrale opdracht, alsof een gebruiker de vraag stelt.
- **Vijf blokken:**
  - *Kent hij het merk?* Zes varianten **zonder** zoeken, bijvoorbeeld *"Wat weet je over {merk} uit
    {plaats}?"* en *"Is {merk} een bestaand bedrijf?"*. Dit meet wat in het model zelf zit.
  - *Klopt het?* Geen aparte aanroep: de code vergelijkt het antwoord met de feiten van de site.
  - *Welke bronnen?* **Met** zoeken: *"Zoek informatie over {merk} ({website}) en vertel wat je vindt.
    Noem de bronnen."*
  - *Verwarring?* **Met** zoeken: zijn er andere bedrijven met dezelfde naam?
  - *Categorie:* **met** zoeken, per aanbodknoop: *"Welke aanbieders van {dienst} in {plaats} kun je
    aanbevelen?"*. Een nulmeting zonder merknaam.
- **Code daarna:** het oordeel (bekend, klopt, genoemd) velt de code, nooit het model over zichzelf
  (`baseline-verdict.ts`). Gelijknamige bedrijven worden een voorstel voor de lijst "niet ons merk".
- **Bestand:** `lib/pipeline/llm-baseline.ts`.

### 2.9 Alles samenbrengen

**Doel.** Eén leesbaar dossier voor het gesprek, een lijst citeerbare feiten, en een agenda met wat we
nog niet weten.

**AI-aanroep**
- **Model:** Sol (als het budget het toelaat, anders Luna), `content`, zonder zoeken. De enige
  onderzoeksstap op het dure model.
- **Gaat erin:** bedrijfsnaam, website, branche, bedrijfsmodel, werkgebied, de samenvattingen van alle
  vorige stappen, het aanbod, en de tekst van de pagina's.
- **Opdracht (kern):** *"Je vat een klantprofiel samen voor een GEO-adviesbureau."* Lever een dossier
  van vier tot acht zinnen zonder vakjargon; open punten die in dertig seconden te beantwoorden zijn
  (*"niet 'meer over de doelgroep' maar 'hoeveel behandelkamers zijn er?'"*); en citeerbare feiten, elk
  met een bronpagina en een citaat dat *"LETTERLIJK, teken voor teken"* op die pagina staat. Geen
  marketingtaal. Schrijf de bewering zelf op ("Het bedrijf is 24 uur per dag bereikbaar"), niet dat de
  site hem doet. *"Liever tien scherpe dan veertig vage."*
- **Komt eruit:** dossier, open punten, feiten.
- **Code daarna:** een feit waarvan het citaat niet letterlijk op de bronpagina staat, vervalt. Feiten
  gaan naar `brand_facts`. De open punten worden vragen voor het hele merk op "Openstaande vragen".
- **Bestand:** `lib/pipeline/synthesis.ts`, `gap-questions.ts`.

**2.10 De fase springt naar "Klaar voor het gesprek".** Een stap die niets vindt, toont een
waarschuwing in plaats van een groen vinkje.

**Onder de motorkap (fase 2).** De volgorde: `profile_light_scan` → `profile_discover` (plant
`technical_audit` en `profile_research` in) → `profile_research` → `profile_offering` →
`propose_topics` en daarnaast `profile_market` → `profile_llm_baseline` → `profile_synthesis`. De
opvolgers staan in `lib/jobs/chain.ts`; faalt een stap definitief, dan plant
`scheduleFollowUpAfterFailure()` toch de opvolger in, behalve bij `profile_research`. Er is een
kostenplafond per merk voor het onderzoek (`onboarding_budget_usd`); loopt het op, dan valt een stap weg
of wijkt de samenvatting uit naar Luna. De fase wordt afgeleid in `lib/profile-stage.ts`.

**Controleer**

- [ ] Alle onderzoekstaken staan in `jobs` op `done` (of `failed` met een begrijpelijke `last_error`).
- [ ] `profiles.status = 'klaar'`, en het merk staat op "Klaar voor het gesprek".
- [ ] De aanbodboom (Admin, Aanbodboom) klopt met wat het bedrijf echt doet. Dit is de belangrijkste
      controle van deze fase: alles daarna leunt erop.
- [ ] Er staan vijf tot acht voorgestelde onderwerpen op het clusterscherm.
- [ ] De kennistest (Admin, 0-meting) zegt iets herkenbaars over wat ChatGPT van het bedrijf weet.
- [ ] De kosten in `ai_calls` voor dit merk liggen rond de 25 dollarcent.

**Om te bespreken**

- **De aanbodboom ziet maar een kwart van de site.** Van de 150 gelezen pagina's passen er ongeveer 35 in
  het tekenbudget, en elke pagina is bij het lezen al afgekapt op 1.500 tekens. Alles daarna hangt aan
  deze boom. Is een groter budget, of een tweede ronde over de rest van de site, de moeite waard?
- **Drie stappen maken elk hun eigen lijst "feiten".** Het merkonderzoek (2.4) schrijft `proof_points`
  en stijlvoorbeelden, de samenvatting (2.9) schrijft `brand_facts`. De nieuwe schrijver leest alleen
  `brand_facts` en de stemvoorbeelden uit het gesprek. De `proof_points` en stijlvoorbeelden uit 2.4
  worden voor het schrijven niet meer gebruikt: kunnen ze uit de opdracht van 2.4, of moeten ze juist
  naar de schrijver?
- **De kennistest vraagt alleen naar de eerste plaats van het werkgebied** (`service_regions[0]`). Bij
  een bedrijf met drie vestigingen meet hij er één.

---

## Fase 3. Het gesprek met de klant

*Wie: de consultant, met de klant erbij. Waar: Admin, Onboardinggesprek
(`/merk/[id]/admin/onboarding`). Kost: niets, behalve als je het onderzoek bijwerkt (stap 3.7).*

**Doel.** Aanvullen wat een website nooit vertelt: commerciële keuzes, verhalen, de stem van het
bedrijf, wat verboden is. Deze invoer gaat letterlijk mee naar de schrijver van elke pagina, dus hier
wordt de kwaliteit van alle latere teksten voor een groot deel bepaald.

**Wat er gebeurt**

**3.1 Bovenaan staat wat nog niet bekend is**, het zwaarste eerst. Het werkgebied staat vrijwel altijd
bovenaan: dat bepaalt of de meetvragen regionaal of landelijk gesteld worden.

**3.2 Het dossier wordt samen nagelopen, blok voor blok**: het bedrijf en de namen, het aanbod, de
markt, het bewijs, de klant en de toon, materiaal en veranderingen, techniek en koppelingen, en
afspraken. Elk veld slaat zichzelf op zodra je eruit klikt. Onder elk veld staat waar het antwoord
terechtkomt. Er staat geen bedrag, geen taaknaam en geen foutmelding op dit scherm.

**3.3 De commerciële vragen**: waar wil de klant op groeien, wat wil hij juist niet meer, welke
klantgroepen, welke plaatsen, wat is een klant waard, het seizoen, veelgehoorde bezwaren, **verboden
onderwerpen en verboden woorden**, extra bewijs (certificaten, cijfers), gelijknamige bedrijven, en
waar hij over een jaar wil staan.

**3.4 Het tekstvak "Verhalen".** Twee of drie typische klussen, hoe het bedrijf werkt in eigen woorden,
bezwaren en wat de ondernemer dan zegt, wat het bewust niet doet, waarom het ooit begon.

**3.5 De stemvoorbeelden.** Eén tot drie adressen van pagina's waarop de stem van het bedrijf goed te
horen is. Na het opslaan haalt de app de tekst op, tot 2.000 tekens per pagina, vanaf de eerste echte
alinea. Lukt dat niet, dan staat er "Deze pagina konden we niet lezen". Zonder stemvoorbeelden gebruikt
de schrijver de tekst van de homepage.

**3.6 Optioneel**: een tarievenpagina, brochure of offertetekst plakken, of een verandering vastleggen
die niet op de site staat (een nieuwe naam, een vestiging, een dienst die stopt).

**3.7 "Onderzoek bijwerken"**, als er iets veranderde dat het onderzoek raakt. De app toont eerst een
kostenschatting en herhaalt alleen de stappen die de wijziging raakt: een ander werkgebied geeft nieuwe
meetvragen en een nieuwe kennistest, commerciële sturing geeft nieuwe onderwerpen, een nieuwe concurrent
alleen een nieuw marktonderzoek.

**3.8 Het gesprek vastleggen**, met aantekeningen. Het merk springt naar "Gesprek gehad".

**Waar de invoer uit het gesprek terechtkomt**

| Veld | Gaat naar |
|---|---|
| Verhalen | De schrijver van elke pagina (blok A) en de content brief |
| Bezwaren met het antwoord van de ondernemer | Blok A, en de meetvragen (minstens één vraag over een twijfel) |
| Wat het bedrijf anders doet, bewijs buiten de site | Blok A, en het rapport |
| Verboden woorden | De schrijver, en een controle in code (een zin met zo'n woord wordt herschreven of geel) |
| Verboden onderwerpen | De schrijver, en het rapport |
| Aanspreekvorm (je of u) | De schrijver |
| Stemvoorbeelden | De schrijver en de controle, als voorbeeld van toon, en als bron voor harde beweringen |
| Groeiregio's, prioriteiten, doelgroepen | Onderwerpen, meetvragen, rapport |
| Gelijknamige bedrijven | De meting (tellen niet als het eigen merk) |

**AI-aanroep.** Geen, behalve als "onderzoek bijwerken" stappen van fase 2 opnieuw laat draaien.

**Onder de motorkap.** Scherm `app/(app)/merk/[id]/_components/onboarding-session.tsx`. Opslaan per veld
via `PATCH /api/profiles/[id]` (herkomst `gesprek`). `verhalen` gaat naar `profiles.verhalen`; de
stemadressen gaan naar `profiles.stem_voorbeelden`, opgehaald na het antwoord met `after()` in
`lib/pagina/stemvoorbeelden.ts`. Verboden woorden in `profiles.taboo_phrases`, verboden onderwerpen in
`forbidden_topics`. Bijwerken via `POST /api/profiles/[id]/refresh` (`onboarding-refresh.ts` bepaalt
welke stappen opnieuw draaien).

**Controleer**

- [ ] Een veld dat je invult, staat er nog na het verversen van de pagina.
- [ ] Na het opslaan van de stemadressen staat bij elk adres tekst, of een duidelijke foutmelding
      (`select stem_voorbeelden from profiles where id = '<id>'`).
- [ ] "Verhalen" is gevuld met echte, concrete voorbeelden.
- [ ] Verboden woorden zijn volledig. Bij de proef van 26 september 2026 schreef de app "gratis" omdat
      dat woord hier ontbrak: de schrijver kan alleen vermijden wat hier staat.
- [ ] Na het vastleggen staat het merk op "Gesprek gehad".

**Om te bespreken**

- **Het gesprek is de grootste hefboom op de tekstkwaliteit, maar wordt nergens gemeten.** Er is geen
  signaal als "Verhalen" leeg of dun is voordat er pagina's geschreven worden.
- **Het scherm heeft tien blokken.** Welke velden gaan echt naar de schrijver (de tabel hierboven), en
  welke alleen naar onderzoek en rapport? Dat onderscheid staat nu alleen in één zin onder elk veld.

---

## Fase 4. De klant toegang geven

*Wie: de consultant. Waar: Admin, Toewijzen (`/merk/[id]/admin/toewijzen`). Kost: niets.*

**Doel.** Na de verkoop het merk naar de klant overzetten, zodat hij kan inloggen, vragen kan
beantwoorden en teksten kan goedkeuren.

**Wat er gebeurt**

**4.1 Een inlog voor de klant.** Twee manieren: een uitnodiging vanuit het account (de app geeft een link
terug die de consultant zelf doorstuurt, want e-mail staat uit; de klant kiest zelf een wachtwoord), of
een gebruiker die de eigenaar in Supabase aanmaakt. Zelf registreren kan niet.

**4.2 Het merk toewijzen.** Het merk en alle clusters eronder verhuizen naar het account van de klant. De
consultant houdt volledige toegang.

**4.3 Het pakket kiezen**: hoeveel pagina's per maand (5, 10 of 20). Zonder pakket kan de app geen
contentplan opstellen (fase 8).

**4.4 Het merk springt naar "Overgedragen".**

Je mag deze fase ook later doen. Voor de test is het handig om het nu te doen, zodat je in de volgende
fasen ook als klant kunt meekijken.

**AI-aanroep.** Geen.

**Onder de motorkap.** Uitnodigen: `POST /api/accounts/[id]/invites`, accepteren via
`/uitnodiging/[token]`. Toewijzen: `POST /api/profiles/[id]/assign` zet `profiles.user_id`,
`account_id` en `assigned_at`, en verplaatst `analyses.user_id` mee (alleen die twee tabellen hebben
`user_id`; de rest volgt via `analysis_id` en RLS). Pakket: `accounts.package_pages_per_month`
(`lib/package-sizes.ts`, `package-box.tsx`).

**Controleer**

- [ ] De klant kan inloggen en ziet zijn merk, zonder de Admin-onderdelen.
- [ ] Het pakket staat ingevuld op het toewijzingsscherm.

---

## Fase 5. Een cluster opzetten

*Wie: de consultant. Waar: Strategie, Clusters (`/merk/[id]/strategie/clusters`). Kost: een paar
dollarcent.*

**Doel.** Een onderwerp kiezen en dertig realistische vragen opstellen die kopers over dat onderwerp aan
een AI-assistent stellen. Die vragen zijn de meetlat: alles daarna (score, rapport, pagina's) gaat over
deze vragen.

### 5.1 en 5.2 Onderwerp kiezen en het cluster starten

Uit de voorgestelde onderwerpen van stap 2.6 keurt de consultant er één goed, of hij typt zelf een
onderwerp in. Er komt een nieuwe analyse bij met de status "bezig".

### 5.3 Het onderwerp onderzoeken

**Doel.** Weten wat de eigen site al over dit onderwerp zegt, en wie hier de concurrenten zijn (dat
kunnen andere zijn dan voor het hele bedrijf).

**AI-aanroep**
- **Model:** Luna, `analytical`, **met** zoeken op het web.
- **Gaat erin:** merknaam, website, branche, de algemene concurrenten, het onderwerp, een eventuele
  wens van de klant over hoek en doelgroep, en tot 40 pagina's van de site (adres, titel, 400 tekens).
- **Opdracht (kern):** onderzoek alleen dit onderwerp: (1) wat zegt de website erover, (2) welke 3 tot 5
  concurrenten zijn relevant voor dit onderwerp. Per concurrent alleen de naam.
- **Komt eruit:** een samenvatting van wat de site zegt, en de concurrenten voor dit onderwerp.
- **Bestand:** `lib/pipeline/topic-research.ts`.

### 5.4 De meetvragen opstellen

**Doel.** Vragen die lijken op wat echte kopers aan ChatGPT vragen, zonder merknaam, zodat de meting
eerlijk laat zien of het merk vanzelf genoemd wordt.

**AI-aanroep (één per fase van de klantreis, dus drie)**
- **Model:** Luna, `creative` (veel variatie gewenst), zonder zoeken.
- **Gaat erin:** website, merknaam (om te vermijden), onderwerp, branche, aanbod, concurrenten (om te
  vermijden), werkgebied en groeiregio's, een samenvatting van het bedrijf, en de bezwaren van klanten
  uit het gesprek.
- **Opdracht (kern):** *"Je bedenkt realistische vragen die een echte koper aan een AI-assistent zoals
  ChatGPT stelt."* Natuurlijke, gesproken vragen, gevarieerd. Precies tien voor deze fase:
  - *oriëntatie*: iemand die zich net inleest en nog geen aanbieder kent;
  - *overweging*: iemand die opties vergelijkt, zonder merk;
  - *beslissing*: iemand die een aanbieder wil kiezen.

  Harde regel: *"gebruik NOOIT de eigen merknaam (...) en noem ook NOOIT een concurrerend bedrijf bij
  naam."* Bij een lokaal bedrijf moeten alle vragen een plaats uit het werkgebied bevatten, en die
  plaats moet de vraag echt lokaal maken (*"FOUT: 'Heeft regelmatig onderhoud invloed op de levensduur
  van een cv-ketel in Den Bosch?' GOED: 'Welke installateur in Den Bosch kan beoordelen of mijn
  cv-ketel aan vervanging toe is?'"*). Minstens één vraag over een twijfel uit het verkoopgesprek. Per
  vraag ook de intentie, het type, hoe specifiek hij is, of er koopintentie is, en een schatting van hoe
  vaak hij gesteld wordt (0 tot 100).
- **Code daarna:** dubbele vragen vallen weg, ook als ze alleen in de plaatsnaam verschillen. Te weinig
  vragen, te weinig lokale vragen of te weinig vragen over een groeiregio: de code vraagt het model om
  aan te vullen, met de ontbrekende soort erbij.
- **Bestand:** `lib/pipeline/prompts.ts`.

### 5.5 Hoe vaak wordt elke vraag gesteld?

**Doel.** De vragen onderling wegen, zodat de populairste vragen zwaarder tellen in de score en het
rapport.

**AI-aanroep**
- **Model:** Luna, zonder zoeken.
- **Gaat erin:** alle dertig vragen, genummerd.
- **Opdracht (kern):** *"Je bent een zoekgedrag-analist."* Schat hoe vaak elke vraag gesteld wordt,
  relatief ten opzichte van de andere, over de volle schaal van 0 tot 100, met vaste ijkpunten.
- **Komt eruit:** een getal per vraag, dat in drie banden (laag, middel, hoog) wordt gebruikt.
- **Bestand:** `lib/pipeline/prompts.ts` (`calibrateVolumes`).

### 5.6 De goedkeuringspoort

De analyse staat op "concept klaar". De consultant (samen met de klant) leest de vragen, past aan, zet
uit wat niet past, en klikt **"Bevestig en start meting"**. Dit is de eerste bewuste stop: er wordt pas
gemeten ná deze klik.

**Onder de motorkap.** Onderwerp goedkeuren: `PATCH /api/profiles/[id]/topics`; starten:
`POST /api/profiles/[id]/topics` (`analyse_starten`, alleen beheerder). Zelf intypen:
`POST /api/analyses`. Taken: `prepare_analysis` → één `generate_prompts` per fase → de laatste zet de
analyse op `concept_klaar` en plant `calibrate_volumes` in (`lib/pipeline/prepare.ts`). Vragen staan in
`prompts`. De poort is `POST /api/analyses/[id]/confirm` (`meting_starten`, alleen beheerder, weigert
bij nul actieve vragen). Het conceptscherm is `/analyses/[id]/concept`. Het aantal vragen per fase is per
analyse instelbaar (`lib/prompt-mix.ts`).

**Controleer**

- [ ] Na het starten verschijnt het cluster op het clusterscherm.
- [ ] Binnen enkele minuten staat de analyse op `concept_klaar` met dertig vragen.
- [ ] De vragen klinken als echte vragen van klanten, bevatten geen merknaam, en zijn regionaal als het
      bedrijf lokaal werkt.

**Om te bespreken**

- **Het zoekvolume is een schatting van het model, geen echte zoekdata.** De weging van de score en de
  volgorde van de aanbevelingen hangen ervan af. Echte zoekvolumes gebruikt de app op één andere plek
  ("Clusters ontdekken", `docs/tasks/clusters-ontdekken.md`), maar niet hier.
- **Het aantal van dertig vragen** bepaalt de nauwkeurigheid én de kosten van elke meetronde. Is de
  marge bij dertig vragen klein genoeg om een verschil na publicatie te zien?

---

## Fase 6. De meting

*Wie: niemand, het loopt vanzelf. Kost: ongeveer 82 dollarcent per meetronde, waarvan ongeveer 95
procent in het stellen van de vragen zelf.*

**Doel.** Vaststellen of het merk genoemd wordt als een koper een vraag stelt, hoe prominent, en wie er
in plaats van het merk genoemd wordt. Dit is de nulmeting waartegen later het effect van de pagina's
gemeten wordt.

**Wat er gebeurt**

**6.1 Na de bevestiging ga je terug naar de clusters**, met de melding "Cluster gelanceerd". De meting
loopt op de achtergrond; er is geen apart wachtscherm.

**6.2 Elke vraag wordt gesteld**, als een gewone gebruiker. De acht zwaarste vragen worden drie keer
gemeten, omdat één antwoord toeval kan zijn. Staan Google AI Overview of Gemini aan, dan meten die mee.

**6.3 Per antwoord beoordeelt de app** of het merk genoemd wordt, waar en hoe, en welke andere merken
genoemd worden.

**6.4 De merken worden ingedeeld**: echte concurrent, of iets anders (marktplaats, vergelijker,
brancheorganisatie, leverancier).

**6.5 Alles wordt opgeteld tot één score**, met een marge die zegt hoe zeker die score is. Een vraag
waarbij geen enkele aanbieder genoemd wordt, telt apart en niet als verlies.

**6.6 Het concurrentprofiel**: per concurrent waarom hij genoemd wordt, met een letterlijk citaat als
bewijs.

**AI-aanroep 6.2: het antwoord van de assistent**
- **Model:** Luna, **met** zoeken op het web (tenzij `MEASURE_WEB_SEARCH=false`).
- **Gaat erin:** alleen de meetvraag.
- **Opdracht (letterlijk):** *"Je bent een behulpzame AI-assistent (zoals ChatGPT) die vragen van
  gebruikers beantwoordt. Gebruik web search om actuele, feitelijke informatie te vinden. Noem concrete
  merken, bedrijven of bronnen waar relevant voor het antwoord. Antwoord in het Nederlands, zoals je dat
  voor een echte gebruiker zou doen die deze vraag stelt."* Gemini krijgt letterlijk dezelfde opdracht.
- **Komt eruit:** een gewoon antwoord in tekst, met de bronnen.
- **Bestand:** `lib/pipeline/measure.ts` (`SIMULATE_SYSTEM`).

**AI-aanroep 6.3: wie wordt er genoemd?**
- **Model:** Luna, `deterministic`, zonder zoeken.
- **Gaat erin:** de naam van het eigen merk met het onderwerp, de andere schrijfwijzen, de gelijknamige
  bedrijven die níet het eigen merk zijn, en het antwoord uit 6.2.
- **Opdracht (kern):** geef altijd een oordeel over het eigen merk, ook als het niet genoemd wordt. Voeg
  elk ander merk toe dat echt bij naam genoemd wordt (*"Verzin niets"*). Per merk de positie (het
  hoeveelste merk, vanaf 1) en de rol: *eerste aanbeveling*, *een van meerdere*, of *zijdelings*. Bij
  twijfel tussen de eerste twee: een van meerdere.
- **Komt eruit:** per merk genoemd ja of nee, positie, rol, en de bronnen die erbij staan.
- **Bestand:** `lib/openai/mention-prompt.ts` (bewust zonder afhankelijkheden, zodat het testscript
  `npm run eval:mention` precies dezelfde opdracht test).

**AI-aanroep 6.4: welke merken zijn echte concurrenten?**
- **Model:** Luna, `deterministic`.
- **Gaat erin:** de merknaam, branche, onderwerp, de merken die de klant zelf voert, en de lijst
  gevonden merken.
- **Opdracht (kern):** *"'concurrent' is alleen een bedrijf dat in de kern hetzelfde aanbiedt aan
  dezelfde klantgroep, en dat die klant dus in plaats van het eigen merk kan kiezen."*
- **Code daarna:** een oordeel dat de klant zelf gaf, wordt nooit overschreven.
- **Bestand:** `lib/pipeline/classify-entities.ts`.

**AI-aanroep 6.6: waarom wint een concurrent?**
- **Model:** Luna, `deterministic`.
- **Gaat erin:** per belangrijke concurrent de fragmenten uit de antwoorden waarin hij voorkomt.
- **Opdracht (kern):** *"Je DESTILLEERT alleen wat er staat"*: kies per aanbieder eigenschappen uit een
  vaste lijst, met bij elke eigenschap een letterlijk citaat als bewijs. Een lege lijst is een geldig
  antwoord.
- **Bestand:** `lib/pipeline/competitor-intel.ts`.

**Onder de motorkap.** `enqueueMeasurement` zet één `measure_prompt` per vraag in de rij (plus
`measure_ai_overview` en `measure_llm_response` als die bronnen aanstaan). Het antwoord (6.2) en de
beoordeling (6.3) zijn los herhaalbaar: een mislukte beoordeling betaalt nooit opnieuw voor het
antwoord. De laatste meettaak plant `aggregate_week` in (met de indeling uit 6.4), die plant
`profile_competitors` in, en die `generate_report`. Antwoorden in `tracking_runs.raw_response`. De
score telt per vraag, met een gewicht van 1 gedeeld door het aantal metingen van die vraag
(`question-share.ts`).

**Controleer**

- [ ] Alle `measure_prompt`-taken van de analyse zijn `done`.
- [ ] De analyse staat op `gemeten` en daarna op `gereed`.
- [ ] Op Analytics, gefilterd op dit cluster, staan de score en de concurrenten, en ze kloppen met wat je
      zelf verwacht van dit bedrijf.
- [ ] Steekproef: lees drie antwoorden in `tracking_runs` en kijk of de beoordeling (genoemd of niet)
      klopt.

**Om te bespreken**

- **De meting is een nabootsing.** De app stelt de vraag aan Luna via de API, met een eigen opdracht en
  met zoeken op het web. Dat is niet hetzelfde als wat een gebruiker in de ChatGPT-app ziet
  (ander model, geen geschiedenis, geen locatie). Hoe dicht zit de nabootsing bij de echte ervaring,
  en is dat ooit gemeten?
- **De opdracht vraagt het model om merken te noemen** (*"Noem concrete merken, bedrijven of bronnen
  waar relevant"*). Dat kan de kans op een vermelding hoger maken dan in een echt gesprek.
- **De beoordeling 6.3 is de belangrijkste aanroep van het hele product**: elk cijfer, elk rapport en
  elke aanbeveling hangt eraan. Er is een testscript (`npm run eval:mention`); hoe vaak draait het, en
  op welke set?

---

## Fase 7. Het rapport en de kansen

*Wie: niemand. Kost: een paar dollarcent.*

**Doel.** Van de meting naar een besluit: waar verliest het merk, waarom, en welke pagina's zijn nodig
om dat te veranderen. De aanbevelingen worden later letterlijk de kaarten in het contentplan.

**Wat er gebeurt**

**7.1 De analyse van de gaten**: waar concurrenten winnen, met bewijs uit de antwoorden.

**7.2 De structuur**: de code legt de aanbodboom naast de bestaande pagina's en bepaalt per dienst of er
al een eigen pagina is, een zwakke, of geen.

**7.3 Het rapport met aanbevolen pagina's.**

**7.4 Daarna, op de achtergrond**: de potentie van alle onderwerpen van het merk wordt opnieuw geschat,
en er start een onderzoek naar externe websites waarop het merk wel of niet staat.

**AI-aanroep 7.1: de gaten**
- **Model:** Luna, `analytical`, zonder zoeken.
- **Gaat erin:** merk en onderwerp, branche, wat de site al over het onderwerp zegt, de score, het
  **bewijsdossier** (per gemiste vraag: welke bedrijven in dát antwoord genoemd werden), en daarna apart
  het marktbeeld over de hele meting (per concurrent vermeldingen, positie, waarom genoemd, bronnen).
- **Opdracht (kern):** *"Je bent een GEO-analist."* Vind de categorieën waarin concurrenten vaker genoemd
  worden, met bewijs. Prioriteer op de vragen met het hoogste gewicht. Bewijsregel: noem een concurrent
  bij een vraag alleen als die naam onder die vraag in het dossier staat.
- **Bestand:** `lib/pipeline/report.ts` (`GAP_SYSTEM`).

**AI-aanroep 7.3: het rapport**
- **Model:** Luna, `analytical`, zonder zoeken.
- **Gaat erin:** alles van 7.1 plus de uitkomst daarvan, het aantal vragen en metingen, de bestaande
  pagina's van de site (tot 150 adressen), de diensten zonder eigen pagina, het doel over twaalf maanden,
  het seizoen, en de commerciële sturing uit het gesprek (prioriteiten, groeiregio's, doelgroepen,
  verboden onderwerpen, bewijs buiten de site).
- **Opdracht (kern):** een kort rapport zonder jargon voor een ondernemer, eindigend in aanbevelingen.
  Per aanbeveling: **verbeteren** (neem het adres letterlijk over uit de lijst) of **nieuw**; welke gemiste
  vragen (V1, V2) de pagina moet winnen; een rangnummer; en in `targetIntent` de lezer in één zin
  (*"niet 'Daklekkage Apeldoorn' maar 'iemand met water door zijn plafond die vandaag hulp zoekt en wil
  weten wat een reparatie kost'"*). Een aanbeveling alleen als er een gemeten gemis is, de klant er iets
  echts over te zeggen heeft, geen bestaande pagina het al dekt, en hij niet overlapt. Wat afvalt, met de
  reden. Plus vragen aan de klant om feiten die de content beter maken.
- **Komt eruit:** het rapport, de aanbevelingen, de afgewezen kansen met reden, en vragen aan de klant.
- **Code daarna:** een merknaam die niet in het bewijs van die vraag staat, gaat eruit; vraagcodes en
  gewichten worden uit de lopende tekst gehaald. De vragen aan de klant worden ontdubbeld tegen alles wat
  het merk al kreeg en opgeslagen.
- **Bestand:** `lib/pipeline/report.ts` (`REPORT_SYSTEM`, `buildReportInput`).

**AI-aanroep 7.4: potentie per onderwerp**
- **Model:** Luna, zonder zoeken.
- **Gaat erin:** alle onderwerpen van het merk.
- **Opdracht (kern):** schat hoe vaak mensen over elk onderwerp zoeken, relatief ten opzichte van elkaar,
  met een korte uitleg per onderwerp.
- **Bestand:** `lib/pipeline/search-demand.ts`.

**Onder de motorkap.** `generate_report` schrijft `reports` met `recommendations_json`; elke aanbeveling
heeft `targets` met de vraagtekst en het `runId` van de meting. Daarna `recalculate_potential` (per merk)
en `offsite_scan`. De rapportmail slaat over zolang `EMAILS_ENABLED` uit staat.

**Controleer**

- [ ] `select jsonb_array_length(recommendations_json) from reports where analysis_id = '<id>'` geeft een
      aantal groter dan nul.
- [ ] De aanbevelingen gaan over diensten die het bedrijf echt levert, en "verbeteren" wijst naar een
      pagina die echt over hetzelfde gaat.
- [ ] De zin in `targetIntent` beschrijft een lezer, geen onderwerp.

**Om te bespreken**

- **De opdracht spreekt zichzelf tegen over het aantal aanbevelingen.** De vaste opdracht zegt *"HET
  AANTAL AANBEVELINGEN LIGT NIET VAST (...) Rond nooit af naar een 'nette' lijst"*, de invoer eronder zegt
  *"Geef 5 tot 8 concrete, geprioriteerde aanbevelingen"*. Het model moet kiezen welke van de twee het
  volgt.
- **Stelt het rapport nog vragen die de brief per pagina beter kan stellen?** Sinds 26 september 2026 gaan
  de antwoorden wel naar de schrijver (besluit B17), maar de brief vraagt nu per pagina gerichter, en twee
  bronnen van vragen betekent meer werk voor de klant.
- **Het rapport leunt op het geschatte zoekvolume** van stap 5.5 voor de volgorde van de kansen.

---

## Fase 8. Het contentplan

*Wie: de consultant, samen met de klant. Waar: Strategie, Contentplan (`/merk/[id]/strategie/plan`).
Kost: niets tot het vrijgeven van een maand.*

**Doel.** Van losse kansen naar een planning: welke pagina's in welke maand, binnen het verkochte
pakket. Het vrijgeven van een maand is het moment waarop de klant akkoord geeft en het schrijfwerk
begint.

**Wat er gebeurt**

**8.1 De kansen komen vanzelf in de voorraad.** Elke aanbeveling uit het laatste rapport van een gemeten
cluster wordt een kaart in de voorraad. Er wordt nooit een kaart gewist.

**8.2 Het plan opstellen.** Eén klik maakt twaalf lege maanden en zet de kaarten met de meeste potentie
in maand 1, tot het pakket vol is. De rest van het jaar stelt de consultant met de klant samen.

**8.3 Kaarten verschuiven.** "Inplannen" zet een kaart uit de voorraad in een maand; "naar voorraad" haalt
hem terug. Dat kost niets en de klant mag het ook zelf. Elke pagina krijgt een publicatiedatum, verspreid
over de maand.

**8.4 De maand vrijgeven.** Dit is de knop die geld kost: alleen de consultant. De klant zegt akkoord, de
consultant drukt. Direct daarna begint de voorbereiding van alle pagina's van die maand (fase 9).

**8.5 Een kaart die later in een al vrijgegeven maand komt**, start meteen zijn eigen voorbereiding.

**AI-aanroep.** Geen.

**Onder de motorkap.** De voorraad is `planned_pages` met `plan_month_id = null`, gevuld door
`syncBacklog()` (`lib/plan-backlog-data.ts`) bij elke keer dat het plan geladen wordt. `source_ref` is
`<rapport-id>#<volgnummer>` en is de lijn terug naar de meetvragen. Plan opstellen:
`POST /api/profiles/[id]/plan` (`content_schrijven`, alleen beheerder; het pakket komt van het account).
Inplannen: `PATCH /api/profiles/[id]/plan/pages/[pageId]` met `actie: "inplannen"`, daarna `bereidVoor()`
(doet niets als de maand niet vrijgegeven is). Vrijgeven: `PATCH .../plan/months/[monthId]` met
`actie: "goedkeuren"` (`plan_goedkeuren`, dagplafond), zet `plan_months.status = 'goedgekeurd'` en roept
`bereidMaandVoor()` aan. Datumspreiding: `spreadDates()` in `lib/plan-schedule.ts`.

**Controleer**

- [ ] De voorraad toont de aanbevelingen van fase 7.
- [ ] Na het opstellen staan er in maand 1 zoveel pagina's als het pakket zegt (of minder als er minder
      kansen zijn), met publicatiedata in de toekomst.
- [ ] Na het vrijgeven staat de maand op "vrijgegeven" en de pagina's op "Wordt voorbereid".

**Om te bespreken**

- **Bijna gelijke plaatspagina's** ("faalangst rijles Eindhoven", "... Best", "... Helmond") komen als losse
  kansen het plan in. Een regel die bepaalt wanneer een plaats een eigen pagina krijgt, is besloten maar
  nog niet gebouwd (`tasks/contentketen-opnieuw.md` §13.1).

---

## Fase 9. De voorbereiding van de pagina's

*Wie: niemand. Duur: ongeveer een halve minuut per pagina, na elkaar. Kost: 6 tot 7,5 dollarcent per
pagina.*

**Doel.** Per pagina uitzoeken wat een goede pagina over dit onderwerp moet behandelen, en welke vragen
we de ondernemer moeten stellen om de pagina eigener te maken dan een concurrent of een AI zonder hem
kan. Vanaf hier werkt de nieuwe contentketen, opnieuw gebouwd op 25 en 26 september 2026.

**Wat er gebeurt**

**9.1 Per pagina zoekt de app het cluster waar hij bij hoort.** Hangt een pagina aan geen gemeten
cluster, dan wordt hij niet voorbereid en toont het plan "Geen cluster".

**9.2 Er komt een paginarij** met de stand "voorbereiden". Staat er onder dat cluster al een pagina met
dezelfde titel, dan wordt die gebruikt.

**9.3 De vaste open vraag komt klaar te staan**: *"Wat wil je zelf op deze pagina vertellen?"*, met uitleg
en voorbeelden. Deze vraag maakt de code, geen AI. Hij is er dus altijd, ook als de volgende stap
mislukt, en nooit dubbel.

**9.4 Het feitenregister van het merk wordt bijgewerkt**, zodat een feit waarover twee versies bestaan
niet naar de schrijver gaat (zie de AI-aanroepen hieronder).

**9.5 De pagina's komen in een rij, op volgorde van publicatiedatum.** De content brief draait per pagina,
**na elkaar**. Zo ziet elke volgende brief de vragen die de vorige al stelde, en krijgt de klant niet vijf
keer dezelfde vraag in andere woorden.

**9.6 De content brief** (zie hieronder).

**9.7 De code ruimt op**, slaat eerst de vragen op en dan de brief, en de volgende pagina van de rij is aan
de beurt. Daarna vraagt de app of deze pagina al geschreven mag worden (fase 11).

**9.8 Mislukt de brief vier keer**, dan krijgt de pagina een brief zonder onderzoek en gaat hij door met
alleen de open vraag. De tekst wordt minder goed, maar de pagina blijft niet hangen.

**Wat is "bedrijfskennis" (blok A)?** Het is het vaste pakket dat zowel de brief als de schrijver
krijgt. Code stelt het samen, geen AI (`lib/pagina/bedrijfskennis.ts`):
1. tot 150 feiten uit `brand_facts` die bij deze pagina passen: feiten zonder beperking, of met een
   beperking die een woord van vier letters of meer deelt met de titel of de zoekintentie. Nooit een
   betwist, vervangen of afgekeurd feit. Het sterkste bewijs eerst;
2. waar het bedrijf voor staat (de waardeproposities, zonder "volgens de website");
3. wat het bedrijf anders doet, en bewijs dat niet op de site staat;
4. de Verhalen;
5. de bezwaren van klanten met het antwoord van de ondernemer;
6. de beantwoorde vragen die voor het hele merk gelden, en die uit het rapport van dit cluster (besluit B17,
   26 september 2026). Een rapportvraag die al aan deze pagina hangt, staat in blok B en niet hier.

**AI-aanroep 9.4: het feitenregister** (licht werk)
- **Feiten indelen.** Luna, `deterministic`. Gaat erin: nieuwe feiten, genummerd. Opdracht: geef per feit
  een soort (prijs, termijn, plaats, werkgebied, dienst, product, certificering, garantie, werkwijze,
  cijfer, openingstijd, contact, overig) en de waarde met eenheid. *"Je herschrijft niets en je voegt niets
  toe."* Code controleert dat een getal in de waarde ook in de feittekst staat.
- **Tegenstrijdigheden beoordelen.** Code zoekt kandidaat-paren (zelfde soort, andere waarde). Luna,
  `judging`, beoordeelt alleen nieuwe paren: spreken ze elkaar echt tegen, of gaan ze over twee
  verschillende dingen? Een antwoord van de ondernemer weegt zwaarder dan de site, de site zwaarder dan
  onderzoek. Een echt conflict komt op het conflictscherm van de consultant (Admin, Feiten), die het zelf
  beslist of er een keuzevraag van maakt voor de ondernemer.
- **Bestanden:** `lib/pipeline/fact-classify.ts`, `conflict-detect.ts`, `conflict-judge.ts`,
  `feitenregister.ts`.

**AI-aanroep 9.6: de content brief**
- **Model:** Sol, `analytical`, **met** zoeken op het web. Brief versie 3.
- **Gaat erin:**
  - de titel, de soort pagina, nieuw of verbeteren, de zoekintentie en de reden uit het plan;
  - de merknaam en het werkgebied;
  - de meetvragen waarop het merk gemist werd, elk met wat ChatGPT nu antwoordt (tot 1.500 tekens,
    namen van concurrenten weggehaald);
  - blok A (hierboven);
  - bij "verbeteren": de huidige tekst van de pagina (tot 8.000 tekens, één keer van de site gehaald);
  - de 200 nieuwste vragen die het merk al kreeg, met id en stand (open, beantwoord, overgeslagen).
- **Opdracht (kern):** *"Je bereidt één webpagina voor van een Nederlands mkb-bedrijf. Een schrijver
  maakt de pagina straks; jij zorgt dat hij weet wat hij moet weten. Je schrijft zelf geen tekst voor de
  pagina en je bepaalt niet hoe de pagina eruitziet."* Twee dingen:
  1. **Onderzoek**: de zoekintentie in de woorden van de bezoeker, wat hij verder wil weten, wat goede
     pagina's goed doen en laten liggen (zonder bedrijfsnamen), vakkennis met het webadres waar het
     gevonden is, en wat klanten vaak verkeerd begrijpen.
  2. **Vragen aan de ondernemer, hooguit acht**, in vijf soorten: *feit* (prijs, termijn, voor wie wel en
     niet), *praktijk* (een typische klant of situatie), *werkwijze*, *twijfel* (wat vragen klanten, wat
     zeg je dan), *onderscheid*. Een vraag alleen als de schrijver het antwoord kan gebruiken én het niet
     uit blok A, algemene kennis of het web te halen is. Met voorbeelden: *"Slecht: 'Wat is faalangst?'
     Goed: 'Welke situatie komt bij jullie het vaakst voor bij leerlingen met faalangst?' Beter: 'Kun je
     een typisch voorbeeld geven van een leerling met faalangst, en hoe jullie daarmee omgingen?'"*
     *"Stel zo weinig vragen als nodig is (...) Nul vragen is een goed antwoord."* Vraag niets opnieuw;
     geldt een open vraag ook voor deze pagina, geef dan zijn id terug. Een voorbeeldvraag koppel je
     niet aan een andere pagina. Noemt de vakkennis iets wat per bedrijf verschilt (een werkwijze, een
     termijn, een vuistregel), vraag dan hoe dit bedrijf het doet. Per vraag: waarom (één zin voor de
     ondernemer), het soort antwoord, en of hij voor het hele bedrijf geldt.
- **Komt eruit:** het onderzoek, de vragen, en de ids van bestaande vragen die ook hier gelden.
- **Code daarna:** vakkennis zonder webadres valt weg; een vraag die het merk al kreeg (ook in iets andere
  woorden) valt weg; hooguit acht; een keuzevraag zonder keuzes wordt een korte tekstvraag. Eerst de vragen
  opslaan, dan de brief (anders ziet de app even nul vragen en schrijft te vroeg). Een vraag voor het hele
  merk hangt aan geen cluster. Een bestaande open vraag krijgt deze pagina erbij.
- **Bestanden:** `lib/pagina/brief-opdracht.ts` (opdracht en invoer), `brief-regels.ts` (schema en
  opruimen), `brief.ts` (uitvoering), `context.ts` (wat er uit de database komt).

**Onder de motorkap.** `bereidVoor()` en `bereidMaandVoor()` in `lib/pagina/start.ts`: rij in
`content_pieces` (`status = 'briefing'`), `planned_pages.content_piece_id` gezet, `maakOpenVraag()` (rij in
`fact_requests` met `open_vraag = true`), `fact_register` per merk, dan `planBriefs()` met de rest van de
rij in de payload. Taak `pagina_brief` → `maakBrief()`. Opslag: `content_pieces.brief_json = { onderzoek,
bedrijf, versie }`, vragen in `fact_requests` (`reason` is het waarom, `scope` is `pagina` of `merk`, de
soort in `raw_json`). Bestaat `brief_json` al, dan geen aanroep. Definitief mislukt: `briefGafOp()`.

**Controleer**

- [ ] Elke pagina van de maand heeft precies één open vraag
      (`select count(*) from fact_requests where open_vraag and '<piece-id>' = any(content_piece_ids)`).
- [ ] Binnen ongeveer tien minuten heeft elke pagina een `brief_json`.
- [ ] De gerichte vragen gaan over wat alleen deze ondernemer weet, niet over algemene kennis.
- [ ] Bij de tweede en volgende pagina worden geen vragen herhaald die al bij de eerste stonden.
- [ ] De kosten per brief in `ai_calls` (`kind = 'pagina_brief'`) liggen rond 6 tot 7,5 dollarcent.

**Om te bespreken**

- **Welke velden van de brief voegen iets toe aan de tekst?** Het plan zegt dat een veld dat nergens
  zichtbaar iets toevoegt, eruit gaat (bijvoorbeeld `concurrentie.gaten`). Dat is nog niet per veld
  nagekeken.
- **De feitenfilter is grof**: een feit met een beperking telt mee als één woord van vier letters of meer
  overeenkomt met de titel of de zoekintentie. Het onderwerp van het cluster telt niet mee (staat op
  `null`). Missen we feiten, of komt er juist ruis in?
- **Het aantal vragen per pagina.** Op de proef kregen pagina's vier tot acht gerichte vragen plus de open
  vraag; het is bedoeld om te dalen naarmate we het bedrijf beter kennen. Met drie pagina's per merk was
  dat niet te zien.

---

## Fase 10. De vragen aan de klant

*Wie: de klant, of de consultant samen met de klant. Waar: Strategie, Openstaande vragen
(`/merk/[id]/strategie/vragen`), of het scherm van de pagina zelf. Kost: niets.*

**Doel.** Ophalen wat alleen de ondernemer weet. **Dit is het belangrijkste moment van de hele keten**:
wat hij hier vertelt, maakt het verschil tussen een eigen pagina en een algemene AI-tekst.

**Wat er gebeurt**

**10.1 De vragen staan per pagina bij elkaar.** De open vraag staat bovenaan, met een groot tekstvak tot
3.000 tekens. Bij elke gerichte vraag staat in één zin waarom we hem stellen. Een vraag voor het hele merk
staat er één keer.

**10.2 De consultant mag de vragen samen met de ondernemer invullen**, in diens woorden. Vooral de open
vraag: het belangrijkste stuk invoer mag niet afhangen van of de klant zelf gaat typen.

**10.3 Beantwoorden of overslaan.** Een gerichte vraag heeft ruimte voor 500 tekens. Overslaan mag altijd
en telt als antwoord.

**10.4 Waar een antwoord terechtkomt**

| Soort vraag | Gaat naar |
|---|---|
| De open vraag | Letterlijk naar de schrijver van die pagina (blok B). Niet in losse feiten geknipt |
| Gerichte vraag van deze pagina | De schrijver van die pagina (blok B) |
| Vraag voor het hele merk | Blok A van elke volgende pagina |
| Vraag uit het rapport | Blok A van elke pagina van dat cluster (besluit B17) |
| Open punt uit het onderzoek | Een vraag voor het hele merk, dus blok A van elke pagina |

Een antwoord kan nog aangepast worden tot het schrijven begint.

**10.5 Na elk antwoord kijkt de app of de pagina geschreven mag worden** (fase 11). Er is geen knop "schrijf
nu": het laatste antwoord is de handeling.

**AI-aanroep.** Geen.

**Onder de motorkap.** `PATCH /api/profiles/[id]/facts` (eigenaarschap via `getOwnedProfile`): met
`skip: true` wordt `status = 'overgeslagen'`, anders `answerFact()` in `lib/facts.ts` (de open vraag wordt
alleen opgeslagen; een ander antwoord kan ook naar `profiles.proof_points`). Daarna, na het antwoord aan
de klant, `after(() => probeerNaAntwoord(...))`. Het vragenscherm is `components/pagina/vragenlijst.tsx`.

**Controleer**

- [ ] Beantwoorden en overslaan werken, en een beantwoorde vraag verdwijnt uit de open vragen.
- [ ] Een lang verhaal van meer dan 500 tekens in de open vraag wordt volledig bewaard.
- [ ] Na de laatste vraag van een pagina meldt het scherm "We beginnen nu met schrijven" of de dag waarop
      het schrijven begint.

**Om te bespreken**

- **Er is geen herinnering.** Een klant die zijn vragen laat liggen, houdt zijn eigen pagina onbeperkt
  tegen (bewust, besluit B5), maar de app laat dat niet actief weten (e-mail staat uit).
- **Drie bronnen stellen vragen aan de klant**: de samenvatting van het onderzoek (2.9), het rapport (7.3)
  en de content brief (9.6). Ze komen sinds 26 september 2026 allemaal bij de schrijver, maar is dat
  aantal nog nodig nu de brief per pagina vraagt?

---

## Fase 11. Het schrijven

*Wie: niemand. Duur: ongeveer een minuut per pagina. Kost: 3 tot 4 dollarcent per pagina.*

**Doel.** Eén sterke schrijfbeurt die de kennis van de ondernemer, het onderzoek en de stem van het bedrijf
omzet in een pagina die de ondernemer zo op zijn site zet.

**Wat er gebeurt**

**11.1 De schrijfpoort.** Een pagina mag geschreven worden als aan twee regels is voldaan, en niet meer:
- de brief is klaar en er staat precies nul vragen open (weet de app het aantal niet zeker, dan telt dat
  als "nog niet");
- de publicatiedatum ligt binnen tien dagen.

Er komt nooit een schrijftaak met een openstaande vraag, en er is geen uiterste datum.

**11.2 Elke ochtend om 04:00 UTC controleert de app hetzelfde** voor alle vrijgegeven maanden. Dat is het
vangnet: een voorbereiding die niet startte, start dan alsnog, een pagina die aan de beurt is, gaat
schrijven, en een pagina waarvan het schrijven mislukte, krijgt een nieuwe kans.

**11.3 "Nu laten schrijven"** (consultant, in het menu van een pagina in het plan). De maand en de datum
tellen dan niet, de vragen wel.

**11.4 Precies één schrijftaak per pagina.** Twee antwoorden die tegelijk binnenkomen, leveren één tekst op.

**11.5 Na het schrijven** repareert de code alleen mechanisch, en slaat alles op.

**11.6 Geeft het schrijven op**, dan gaat de pagina terug naar "voorbereiden" en toont het plan "Schrijven
mislukt". De ochtendronde probeert het de volgende dag opnieuw.

**AI-aanroep 11: schrijven**
- **Model:** Sol, `redactioneel` (veel denktijd), in de **achtergrondmodus**: de app start de aanroep,
  bewaart meteen het nummer ervan, en haalt het resultaat later op. Nodig omdat zo'n aanroep 3 tot 6
  minuten kan duren en een taak er hooguit 5 mag. Breekt OpenAI de aanroep af, dan mag hij één keer
  opnieuw. Schrijfopdracht versie 3.
- **Gaat erin, in deze volgorde:**
  1. **De pagina**: titel, soort, nieuw of verbeteren.
  2. **Zoekintentie** (blok D): wat de bezoeker wil (uit de brief, anders uit het plan), en de meetvragen.
  3. **Wat we zeker weten over het bedrijf** (blok A), gemarkeerd als *bedrijfskennis*.
  4. **Wat de ondernemer vertelde** (blok B), ook als *bedrijfskennis*: de open vraag letterlijk, en de
     antwoorden op de gerichte vragen van deze pagina. Overgeslagen vragen tellen niet.
  5. **Wat een goede pagina behandelt** (blok C), gemarkeerd als *algemene kennis*, met de zin *"Dit is
     onderzoek op het web over het onderwerp, niet over dit bedrijf. Het zegt niet wat dit bedrijf doet of
     belooft."*: deelvragen, wat goede pagina's doen en laten liggen, vakkennis, valkuilen.
  6. **Zo klinkt dit bedrijf**: de stemvoorbeelden (of de homepage), met *"Neem de toon, de zinsbouw en de
     woordkeus over, niet de inhoud en niet de zinnen zelf."*
  7. **Andere pagina's van dit bedrijf** (tot 60 titels): *"schrijf er niet overheen"*.
  8. Bij verbeteren: de huidige tekst.
- **Opdracht (kern, letterlijk):** *"Je bent een ervaren vakschrijver en schrijft een pagina voor de eigen
  website van dit bedrijf. Schrijf de beste pagina die iemand met deze vraag zou kunnen lezen. Wees
  inhoudelijk volledig, natuurlijk, concreet en overtuigend. Beantwoord de vraag van de bezoeker meteen,
  en behandel daarna wat hij verder wil weten."* Houd bedrijfskennis en algemene kennis uit elkaar:
  algemene kennis mag uitleggen, maar *"nooit als een werkwijze, belofte, advies of eigenschap van dit
  bedrijf."* *"Verzin geen bedrijfsclaims, cijfers, garanties, prijzen, resultaten, certificeringen,
  termijnen (...). Weet je iets niet, laat het dan weg."* Een gegeven overal hetzelfde, ook in de meta en
  de FAQ. *"Schrijf zo uitgebreid als nodig is (...) Voeg geen tekst toe alleen om langer te worden."*
  *"Schrijf als een vakman, niet als een AI die informatie afvinkt."*
- **Huisregels erbij:** de aanspreekvorm, de verboden onderwerpen, de verboden woorden, geen
  gedachtestreepjes, een FAQ alleen met een antwoord dat uit de informatie blijkt, een praktijkvoorbeeld
  alleen op de pagina waar het over gaat (een bedrijfsbreed verhaal hooguit kort), metatitel tot 60 en
  metabeschrijving tot 160 tekens, 0 tot 5 FAQ's.
- **Bewust niet:** geen woordenbudget, geen verplichte opbouw, geen bronverwijzingen, geen lijst met punten
  die erin moeten (`tasks/contentketen-opnieuw.md` §3).
- **Komt eruit:** titel, metatitel, metabeschrijving, tekst in markdown, 0 tot 5 FAQ's, en een notitie met
  wat de schrijver nog had willen weten.
- **Code daarna:** gedachtestreepjes eruit, metatitel en metabeschrijving op lengte (repareren, nooit
  tegenhouden); gestructureerde gegevens voor zoekmachines opbouwen; alles opslaan met de ruwe uitvoer en
  het versienummer. De titel uit het plan blijft de titel van de pagina.
- **Bestanden:** `lib/pagina/schrijfopdracht.ts` (**het enige bestand waar je aan draait om de kwaliteit te
  verbeteren**), `schrijven.ts` (invoer verzamelen, opslaan), `mechanisch.ts`.

**Onder de motorkap.** Schrijfpoort: `schrijfpoort()` in `lib/pagina/schrijfpoort.ts`
(`SCHRIJFVOORSPRONG_DAGEN = 10` in `lib/plan-status.ts`), via `probeerTeSchrijven()` in `start.ts`
(voorwaardelijke update `briefing` → `draft`, dan `pagina_schrijven`). Ochtendronde: `ochtendronde()`, via
`pg_cron` `orbit-engine-plan-writer` naar `/api/cron/plan`. "Nu laten schrijven": `actie: "schrijf_nu"` op
de plan-pagina-route. Schrijven: `voerSchrijvenUit()` in `lib/pagina/taken.ts`, invoer uit
`laadSchrijfbasis()`, achtergrondmodus via `startStructuredAchtergrond` en `haalStructuredOp`. Opslag in
`content_pieces`: `body_markdown`, `meta_title`, `meta_description`, `faq_json`, `schema_jsonld`,
`raw_json` (met `schrijfopdracht_versie` en de ruwe `uitvoer`). Mislukt: `schrijvenGafOp()`.

**Controleer**

- [ ] Een pagina met open vragen krijgt geen schrijftaak, ook niet via "nu laten schrijven".
- [ ] Na de laatste vraag staat er binnen een paar minuten een `pagina_schrijven`-taak, en even later tekst
      in `body_markdown`.
- [ ] `raw_json->>'schrijfopdracht_versie'` is 3.
- [ ] De tekst bevat geen gedachtestreepjes en de metatitel is hooguit 60 tekens.
- [ ] Zinnen uit de open vraag en de antwoorden van de ondernemer zijn terug te vinden in de tekst.

**Om te bespreken**

- **Hoe verbeteren we de kwaliteit?** De afspraak is: via de schrijfopdracht of de invoer (blok A tot en met
  D), met een hoger versienummer, en paarsgewijs vergelijken met de vorige versie. Geen nieuwe stap of
  beoordelaar (besluit B15). De beste bron is wat klanten zelf veranderen
  (`tasks/meting-eerste-klant.md`).
- **Eén schrijfbeurt geeft meer verschil tussen twee runs.** Is dat bij echte klanten te groot, dan is de
  voorgestelde eerste stap twee versies schrijven en de controle laten kiezen (risico 3 in het plan).
- **Blok A kan lang worden** (tot 150 feiten plus verhalen en antwoorden). Verdwijnen goede feiten in een
  lange lijst? Het plan noemt "één leesbaar bedrijfsboek" als mogelijk vervolg (§13.2).

---

## Fase 12. De controle en hooguit één herschrijving

*Wie: niemand. Kost: 1 tot 1,5 dollarcent voor de controle, 2,6 tot 4,3 dollarcent voor een herschrijving.*

**Doel.** Voorkomen dat er iets verzonnens over het bedrijf op de site komt, en een tekst die duidelijk niet
goed is één keer laten verbeteren. Wat daarna nog twijfelachtig is, legt de app aan de ondernemer voor
in plaats van het zelf te beslissen.

**12.1 Controle in code: harde beweringen.** Per zin zoekt de code bedragen, getallen met een eenheid,
jaartallen, en woorden als "garantie", "gecertificeerd", "erkend", "altijd", "nooit", "24/7", "de beste" en
"de enige" in een zin over het bedrijf. Voor elke bewering kijkt de code of hij terugkomt in blok A, blok B,
de stemvoorbeelden of de vakkennis van de brief (`1.800` is `1800`, `€ 359` is `359 euro`). Staat er in
een van beide zinnen een ontkenning ("geen garantie"), dan telt hij niet als gedekt. Telefoonnummers,
postcodes en huisnummers tellen niet. **Liever onterecht geel dan onterecht goed.** Deze controle krijgt
bewust nooit een model of zinsontleding: bij te veel vals alarm wordt de lijst korter, niet de code
slimmer.

**12.2 Controle in code: verboden woorden** van het merk, als los woord.

**AI-aanroep 12.3: de beoordeling**
- **Model:** Sol, `judging`, een directe aanroep.
- **Gaat erin:** alle informatie die de schrijver had (precies dezelfde tekst), de geschreven tekst, en de
  zinnen die de code niet in de informatie terugvond.
- **Opdracht (kern):** *"Je bent een ervaren eindredacteur. Je weet wat deze ondernemer wil: een pagina die
  klopt, die klinkt als zijn bedrijf, en waar een bezoeker echt iets aan heeft. (...) Je herschrijft niets;
  je beoordeelt."* Twee vragen:
  1. *Klopt het?* Claims over het bedrijf die niet uit de informatie blijken, letterlijk. Algemene kennis is
     geen verzonnen claim zolang hij als algemene uitleg staat; als iets wat dit bedrijf doet of belooft
     wel. De zinnen van de code zijn *"niet automatisch fout"*.
  2. *Is het goed?* Hoofdvraag meteen beantwoord, zoekintentie afgedekt, natuurlijk, klinkt als de
     stemvoorbeelden, genoeg diepgang, geen herhaling, geen zinnen overgenomen uit de stemvoorbeelden,
     echte content en geen AI-content, iets wat echt van dit bedrijf komt, heeft de lezer er iets aan.

  *"Oordeel 'goed' als je deze pagina zo op de site van de ondernemer zou zetten."* Anders hooguit vijf
  punten: waar, wat, en hoe het beter kan. Geen punten over smaak.
- **Komt eruit:** goed of niet goed, de verzonnen zinnen met waarom, hooguit vijf punten. **Geen cijfer.**
- **Bestand:** `lib/pagina/controle-regels.ts`.

**12.4 De beslissing is regelwerk in code.** Herschrijven als het oordeel "niet goed" is, of als er
verzonnen, onbewezen of verboden zinnen zijn. Anders gaat de pagina direct naar de klant.

**AI-aanroep 12.5: de herschrijving (niet altijd)**
- **Model:** Sol, `redactioneel`, achtergrondmodus. Dezelfde opdracht en invoer als het schrijven.
- **Gaat erbij:** *"HIER IS JE VORIGE VERSIE EN DE FEEDBACK. SCHRIJF EEN BETERE VERSIE."*, met de vorige
  versie, de punten van de eindredacteur, de verzonnen en onbewezen zinnen (*"haal ze weg of schrijf ze
  zonder de bewering"*) en de zinnen met een verboden woord.
- **Code daarna:** de controle in code opnieuw. De nieuwe versie blijft, tenzij hij meer onbewezen zinnen
  heeft dan de vorige. Die keuze wordt vastgelegd.

**12.6 Er komt geen tweede beoordeling en geen tweede herschrijving.**

**12.7 Gele zinnen.** Zinnen die daarna nog onbewezen zijn, een verboden woord bevatten, of door de
eindredacteur verzonnen genoemd werden en er nog staan, worden geel. Een gele zin houdt de pagina niet
tegen, maar de klant moet hem bevestigen of aanpassen voor hij goedkeurt.

**12.8 De pagina staat op "Lees en keur goed"**, en in het plan op "ter goedkeuring".

**12.9 Als het misgaat.** Mislukt de beoordeling helemaal, dan komt er geen herschrijving: de onbewezen
zinnen worden geel en de pagina gaat toch naar de klant. Mislukt de herschrijving, dan blijft de eerste
versie staan met de gele zinnen.

**Onder de motorkap.** `voerControleUit()` in `lib/pagina/taken.ts`: `controleerHardeBeweringen()` en
`geleZinnen()` uit `harde-beweringen.ts`, `zinnenMetVerbodenWoord()` uit `controle-regels.ts`, dan de
beoordeling. `moetHerschrijven()` beslist; bij ja komt `controle_json` alvast in de rij en volgt
`pagina_herschrijven` (`voerHerschrijvenUit()`, `herschrijfInvoer()`, `kiesVersie()`, `geleZinnenNa()`).
Klaar: `zetKlaar()` zet `status = 'ready'`, `needs_review = true`, `controle_json` en
`planned_pages.status = 'ter_goedkeuring'`. Mislukt: `controleGafOp()`, `herschrijvenGafOp()`.

**Controleer**

- [ ] `controle_json` is gevuld, met een `beoordeling` (of `null` als die mislukte).
- [ ] Er is hooguit één `pagina_herschrijven`-taak per pagina (zonder wens van de klant).
- [ ] Elke gele zin is een zin die je zelf ook zou willen nalopen. Tel de valse alarmen.
- [ ] Alle kosten van deze pagina samen
      (`select sum(cost_usd) from ai_calls where content_piece_id = '<piece-id>'`) liggen onder de 50
      dollarcent. Op de proef was het 10 tot 17.

**Om te bespreken**

- **Sol beoordeelt tekst van Sol.** Het risico is een milde beoordelaar (risico 6 in het plan). De
  verdediging is dat er geen cijfer is, alleen letterlijke zinnen en concrete punten, en dat het oordeel
  hooguit tot één herschrijving leidt. Is dat in de praktijk genoeg?
- **Kleine beweringen zonder getal** ("een ouder mag meekomen") vangt de code niet; die hangen af van de
  eindredacteur en de ondernemer.
- **Verliest een herschrijving op het aantal onbewezen zinnen**, dan blijft de eerste versie staan, ook met
  een taalfout die de herschrijving had verbeterd.
- **Op de proef werd 5 van de 9 pagina's herschreven.** Is de drempel ("niet goed" of één onbewezen zin) te
  streng, of juist goed?

---

## Fase 13. Lezen, goedkeuren en opleveren

*Wie: de klant, eventueel met de consultant. Waar: het scherm van de pagina
(`/merk/[id]/strategie/bibliotheek/[paginaId]`), te bereiken vanuit het plan, de bibliotheek of de
startpagina. Kost: een aanpassing kost ongeveer 3 dollarcent.*

**Doel.** De ondernemer laten beslissen: klopt het, klinkt het als mijn bedrijf, en zet ik dit zo op mijn
site? Dat is de enige maatstaf die telt (`tasks/contentketen-opnieuw.md` §1).

**Wat er gebeurt**

**13.1 De klant leest de tekst opgemaakt**, met koppen en lijsten. Bovenaan staat de notitie van de
schrijver als die er is ("wat ik nog had willen weten").

**13.2 De gele zinnen staan geel in de tekst**, met per zin "Klopt" en "Pas aan". De punten van de
eindredacteur staan erbij als "Wat we nog zien", maar alleen als er niet herschreven is.

**13.3 "Klopt"** bevestigt een gele zin. **Zelf aanpassen**: de klant kan de tekst bewerken; een gele zin
die daarna niet meer in de tekst staat, hoeft niet meer bevestigd te worden.

**13.4 "Vraag een aanpassing"** (tot 2.000 tekens). De schrijver maakt een nieuwe versie met die wens erin,
zonder nieuwe beoordeling (AI-aanroep hieronder). De oude versie blijft bewaard, de wens wordt bij de nieuwe
versie opgeslagen, en het plan en de vragen wijzen daarna naar de nieuwe versie. Onbewezen zinnen in de
nieuwe versie worden meteen geel.

**13.5 "Keur goed"** werkt pas als elke gele zin bevestigd of weggeschreven is. Daarna staat de pagina in
het plan op "goedgekeurd" en op het scherm op "Plaats hem op je site".

**13.6 Wat de klant ziet naast de tekst.** Onder de tekst staan de titel en omschrijving voor zoekmachines
en de veelgestelde vragen. Vóór het goedkeuren om te lezen: ze horen bij wat de ondernemer goedkeurt.

**13.7 Opleveren.** Na het goedkeuren komen er knoppen bij:
- de titel en de omschrijving kopiëren, voor de SEO-velden van zijn site;
- de tekst kopiëren als HTML, als platte tekst of als Markdown, met per vorm in één zin voor welk soort site;
- de veelgestelde vragen kopiëren in dezelfde drie vormen;
- **alles in één bestand** downloaden: een HTML-bestand met de tekst, de FAQ, de titel, de omschrijving en de
  gestructureerde gegevens in de kop. Handig om aan een webbouwer te geven. Ook als Markdown;
- de gestructureerde gegevens apart kopiëren;
- als het onderzoek de opbouw van de site herkende: een versie in de vorm van die site ("Kopieer voor
  WordPress", of de FAQ als uitklapblok);
- en een korte handleiding "Wat doe je hiermee?".

ORBIT ENGINE publiceert nooit zelf. De klant plakt de pagina op zijn eigen site.

**13.8 Daarna** vult de klant het live-adres in ("Deze pagina staat live"). De app controleert of de tekst er
echt staat en plant de nameting na 14 en 28 dagen (`processtappen-nieuwe-pagina.md` fase 14 en 15).

**AI-aanroep 13.4: een aanpassing op verzoek**
- **Model:** Sol, `redactioneel`, achtergrondmodus. Dezelfde opdracht en invoer als het schrijven.
- **Gaat erbij:** de huidige versie en *"Wat de ondernemer anders wil"* met zijn wens. Geen punten van de
  eindredacteur.
- **Code daarna:** een nieuwe versie (versie + 1), de controle in code opnieuw, onbewezen zinnen geel.

**Onder de motorkap.** Scherm: `app/(app)/merk/[id]/strategie/bibliotheek/[paginaId]/page.tsx` met
`components/pagina/goedkeuren.tsx`, `opleveren.tsx` (zoekmachinegegevens, FAQ, kopiëren en downloaden;
de samenstelling in `lib/oplevering.ts`, de kopieervormen in `lib/kopieervormen.ts`, de sjabloonexport in
`lib/pipeline/content-export.ts` met het facet `sjabloon` van het merk), `components/publish-guide.tsx` en
`publish-box.tsx`. Een zin bevestigen:
`POST /api/profiles/[id]/paginas/[pieceId]/zinnen` (`bevestigZin()`). Goedkeuren en aanpassing:
`POST /api/profiles/[id]/paginas/[pieceId]` met `actie: "goedkeuren"` (`keurGoed()` in
`lib/pagina/goedkeuren.ts`) of `actie: "aanpassing"` (dagplafond, `pagina_herschrijven` met
`klantNotitie`; `nieuweVersie()` maakt een rij met `version + 1`, `supersedes_id` en `revision_note`).
Handmatig bewerken via `PATCH /api/analyses/[id]/content/[pieceId]`; de tekst van het model blijft in
`raw_json.uitvoer.tekst_markdown`, zodat je later ziet wat de klant veranderde.

**Controleer**

- [ ] De gele zinnen zijn geel, en "Keur goed" werkt niet zolang er één onbevestigd is.
- [ ] Een aanpassing levert versie 2 op met de wens erin, en het plan wijst naar versie 2.
- [ ] Vóór goedkeuren staan de titel en omschrijving voor zoekmachines en de FAQ onder de tekst, zonder
      kopieerknoppen.
- [ ] Na goedkeuren staat de pagina op "Plaats hem op je site", en werken de kopieerknoppen.
- [ ] Open de HTML-download in een browser: de titel van het tabblad is de zoekmachinetitel, en de FAQ staat
      onder de tekst.
- [ ] Herkende het onderzoek WordPress, dan staat er "Kopieer voor WordPress".
- [ ] Vraag de ondernemer per pagina: zou je deze zo op je site zetten ("ja, zo", "met kleine wijzigingen"
      of "nee")?
- [ ] Maak daarna het rapport van wat de ondernemer veranderde, volgens
      [`tasks/meting-eerste-klant.md`](./tasks/meting-eerste-klant.md).

**Om te bespreken**

- **De FAQ en de omschrijving voor zoekmachines worden niet gecontroleerd.** De controle op harde
  beweringen en de beoordeling kijken alleen naar de tekst. Een verzonnen bedrag in een FAQ-antwoord wordt
  dus nooit geel. De klant ziet de FAQ nu wel vóór het goedkeuren, maar er is geen vangnet (deel III, punt 1).
- **De klant kan de FAQ en de zoekmachinegegevens niet zelf aanpassen**, alleen via "Vraag een
  aanpassing". De bewerkroute kent de velden al (`meta_title`, `meta_description`, `faq_json`); het scherm
  niet.
- **Wat de klant verandert, is de beste bron voor verbetering.** De tekst van het model en de goedgekeurde
  tekst worden allebei bewaard; `lib/pagina/klantmeting.ts` rekent het verschil uit. Wie leest dat, en hoe
  vaak?

---

# Deel III. Voor het gesprek met het ontwikkelteam

> Besproken met het team op 26 september 2026. De uitkomst staat als ontwikkelplan in
> [`tasks/van-pijplijn-naar-kennissysteem.md`](./tasks/van-pijplijn-naar-kennissysteem.md); §14 daar zegt
> welk punt hieronder in welk werkpakket terechtkomt.

## De tien belangrijkste punten om te bespreken

Gevonden bij het nalopen van de code, 26 september 2026. De volgorde is een voorstel: wat een echte klant
het eerst merkt, staat bovenaan.

1. **De FAQ en de omschrijving voor zoekmachines worden niet gecontroleerd.** De controle op harde
   beweringen en de beoordeling lezen alleen de tekst. Een verzonnen prijs of garantie in een FAQ-antwoord
   komt zo zonder gele markering op de site van de klant. De FAQ meenemen in de controle is contentlogica en
   vraagt een besluit in §2 van `tasks/contentketen-opnieuw.md`. (Het opleveren zelf is op 26 september 2026
   gerepareerd: de klant ziet nu ook de zoekmachinegegevens en de FAQ, en kan alles kopiëren en downloaden.)
2. **Twee bronnen van vragen voor dezelfde pagina.** Het rapport (7.3) stelt vragen per cluster, de brief
   (9.6) per pagina. Sinds 26 september 2026 gaan de antwoorden op rapportvragen mee naar de schrijver
   (besluit B17; daarvoor kwamen ze meestal nergens aan). Nu de brief gerichter vraagt: moet het rapport nog
   vragen stellen, of is dat dubbel werk voor de klant?
3. **De opdracht van het rapport spreekt zichzelf tegen** over het aantal aanbevelingen: "ligt niet vast"
   tegenover "geef 5 tot 8". Kies er één.
4. **De meting is een nabootsing** met Luna via de API, met een opdracht die vraagt om merken te noemen. Hoe
   dicht zit dat bij wat een echte gebruiker in ChatGPT ziet? Alles (score, rapport, effectmeting) hangt
   eraan.
5. **Het zoekvolume is een schatting van het model.** De weging van de score en de volgorde van de kansen
   hangen ervan af. Echte zoekdata zit al in "Clusters ontdekken"; kan die hier ook in?
6. **De aanbodboom ziet maar een kwart van de site** (ongeveer 35 van 150 pagina's, elk afgekapt op 1.500
   tekens). Alles daarna leunt op die boom.
7. **Oude feitenbronnen die niemand meer leest.** `proof_points` en de stijlvoorbeelden uit het
   merkonderzoek (2.4) gaan niet meer naar de schrijver, maar worden wel gemaakt, betaald en in het
   merkprofiel getoond. Opruimen of terug aansluiten?
8. **Het gesprek is de grootste hefboom, maar er is geen signaal als het dun is.** Een lege of korte
   "Verhalen", geen stemvoorbeelden of geen verboden woorden: de app schrijft gewoon door.
9. **Geen herinnering bij openstaande vragen.** Een pagina wacht onbeperkt op de klant, en e-mail staat uit.
10. **Sol beoordeelt Sol, en 5 van 9 pagina's werd herschreven.** Is de controle streng genoeg op de goede
    dingen, en niet te streng op de verkeerde? Meet dit bij de eerste echte klant met
    `tasks/meting-eerste-klant.md`, en verander dan de opdracht, niet het aantal stappen (besluit B15).

---

## Bijlage A. Wat nog niet af is, of anders werkt dan je zou denken

Houd hier rekening mee tijdens de doorloop.

1. **De FAQ en de omschrijving voor zoekmachines worden niet gecontroleerd** (deel III, punt 1). Lees ze bij de
   test dus zelf na op bedragen, termijnen en beloftes.
2. **Alles wat geld kost, is sinds 2 september 2026 alleen voor de consultant**: ook een cluster starten, de
   meting bevestigen en het plan opstellen. `docs/architecture.md` §2 en `processtappen-nieuwe-pagina.md`
   fase 4 zeggen op sommige plekken nog dat de klant dat zelf kan. De klant ziet de knoppen wel, maar krijgt
   bij het klikken de melding dat zijn consultant het doet.
3. **`docs/architecture.md` §5, rij 15 tot en met 16b**, beschrijft nog de oude contentketen (feitenkaart,
   vier beoordelaars, kwaliteitslab). De huidige keten staat in fase 9 tot en met 12 van dit document.
4. **Een pagina zonder gemeten cluster wordt nooit voorbereid.** Een kaart die handmatig in het plan komt
   zonder cluster, blijft op "Geen cluster" staan.
5. **Een klant die zijn vragen laat liggen, houdt zijn eigen pagina onbeperkt tegen.** Bewuste keuze
   (besluit B5): er is geen uiterste datum.

---

## Bijlage B. Alle AI-aanroepen op een rij

| Stap | Taak | Model | Soort werk | Web | Bestand |
|---|---|---|---|---|---|
| 2.2 Welke delen lezen (alleen grote site) | `profile_discover` | Luna | analytical | nee | `pipeline/crawl-focus.ts` |
| 2.4 Het bedrijf leren kennen | `profile_research` | Luna | analytical | ja | `pipeline/profile-research.ts` |
| 2.5 Aanbodboom | `profile_offering` | Luna | analytical | nee | `pipeline/offering.ts` |
| 2.6 Onderwerpen | `propose_topics` | Luna | analytical | nee | `pipeline/propose-topics.ts` |
| 2.7 Markt | `profile_market` | Luna | analytical | ja | `pipeline/market.ts` |
| 2.8 Kennistest (tot ongeveer tien korte vragen) | `profile_llm_baseline` | Luna | | deels | `pipeline/llm-baseline.ts` |
| 2.9 Samenvatting en feiten | `profile_synthesis` | Sol (of Luna) | content | nee | `pipeline/synthesis.ts` |
| 5.3 Onderwerp onderzoeken | `prepare_analysis` | Luna | analytical | ja | `pipeline/topic-research.ts` |
| 5.4 Meetvragen (3x, plus aanvullen) | `generate_prompts` | Luna | creative | nee | `pipeline/prompts.ts` |
| 5.5 Zoekvolume per vraag | `calibrate_volumes` | Luna | content | nee | `pipeline/prompts.ts` |
| 6.2 Antwoord op de meetvraag (per vraag) | `measure_prompt` | Luna | | ja | `pipeline/measure.ts` |
| 6.3 Wie wordt genoemd (per vraag) | `measure_prompt` | Luna | deterministic | nee | `openai/mention-prompt.ts` |
| 6.4 Concurrent of niet | `aggregate_week` | Luna | deterministic | nee | `pipeline/classify-entities.ts` |
| 6.6 Waarom wint een concurrent | `profile_competitors` | Luna | deterministic | nee | `pipeline/competitor-intel.ts` |
| 7.1 Gaten | `generate_report` | Luna | analytical | nee | `pipeline/report.ts` |
| 7.3 Rapport en aanbevelingen | `generate_report` | Luna | analytical | nee | `pipeline/report.ts` |
| 7.4 Potentie per onderwerp | `recalculate_potential` | Luna | content | nee | `pipeline/search-demand.ts` |
| 9.4 Feiten indelen | `fact_register` | Luna | deterministic | nee | `pipeline/fact-classify.ts` |
| 9.4 Tegenstrijdigheden | `fact_register` | Luna | judging | nee | `pipeline/conflict-judge.ts` |
| 9.6 Content brief | `pagina_brief` | Sol | analytical | ja | `pagina/brief-opdracht.ts` |
| 11 Schrijven | `pagina_schrijven` | Sol | redactioneel | nee | `pagina/schrijfopdracht.ts` |
| 12.3 Beoordeling | `pagina_controle` | Sol | judging | nee | `pagina/controle-regels.ts` |
| 12.5 en 13.4 Herschrijven | `pagina_herschrijven` | Sol | redactioneel | nee | `pagina/schrijfopdracht.ts` |

Naast deze keten draait na het rapport ook het onderzoek naar externe websites (`offsite_scan`,
`lib/offsite/presence.ts`); dat valt buiten deze doorloop.

---

## Bijlage C. Statussen

| Wat | Tabel en kolom | Waarden, in volgorde |
|---|---|---|
| Merk, onderzoek | `profiles.status` | `bezig` → `klaar` (of `mislukt`) |
| Merk, fase op het scherm | afgeleid in `lib/profile-stage.ts` | Voorbereiden → Klaar voor het gesprek → Gesprek gehad → Overgedragen |
| Voorgesteld onderwerp | `profile_topics.status` | `voorgesteld` → `goedgekeurd` (of `afgewezen`) |
| Cluster | `analyses.status` | `bezig` → `concept_klaar` → `meten` → `gemeten` → `gereed` (of `mislukt`) |
| Maand in het plan | `plan_months.status` | `concept` → `ter_goedkeuring` → `goedgekeurd` (op het scherm "vrijgegeven"), of `afgewezen` |
| Pagina in het plan | `planned_pages.status` | `gepland` → `schrijven` → `ter_goedkeuring` → `goedgekeurd` → `geplaatst` (of `mislukt`, `afgewezen`) |
| Tekst | `content_pieces.status` | `briefing` → `draft` → `ready` (met `needs_review`) → `published` |
| Vraag | `fact_requests.status` | `open` → `beantwoord` of `overgeslagen` |
| Taak | `jobs.status` | `queued` → `running` → `done` (of `failed` na vier pogingen) |

De stand van een pagina op het scherm ("Wordt voorbereid", "Jouw antwoorden nodig", "Wordt geschreven",
"Lees en keur goed", "Plaats hem op je site", "Schrijven mislukt", "Geen cluster") wordt afgeleid in
`lib/pagina-stand.ts`.

---

## Bijlage D. Kosten en tijd

| Stap | Kost | Duur | Bron |
|---|---|---|---|
| Onderzoek van een nieuw merk (fase 2) | ongeveer 25 dollarcent | tot 10 minuten vooronderzoek, dan ongeveer 7,5 minuut | `README.md` |
| Eén meetronde van een cluster (fase 6) | ongeveer 82 dollarcent | afhankelijk van de wachtrij | `CLAUDE.md` |
| Content brief per pagina | 6 tot 7,5 dollarcent | 21 tot 30 seconden | proef 26 september 2026 |
| Schrijven per pagina | 3 tot 4 dollarcent | ongeveer een minuut | proef 26 september 2026 |
| Controle per pagina | 1 tot 1,5 dollarcent | enkele seconden | proef 26 september 2026 |
| Herschrijven (5 van de 9 pagina's) | 2,6 tot 4,3 dollarcent | ongeveer een minuut | proef 26 september 2026 |
| Totaal per pagina | 10 tot 17 dollarcent | | proef 26 september 2026 |
| Een maand vrijgeven bij pakket 10 | ruwweg $1 tot $1,70 | | `plan/months/[monthId]/route.ts` |

De grens is 50 dollarcent per pagina (besluit B4). Er is dus ruimte om de keten duurder te maken als dat de
kwaliteit helpt, bijvoorbeeld met meer invoer voor de schrijver. De proefcijfers komen uit
`docs/tasks/kwaliteitsdoorlichting/contentketen-proef/` en `contentketen-opnieuw.md` §12.

---

## Bijlage E. Handige query's tijdens de doorloop

Vervang `<profiel-id>` door het id van het testmerk (staat in de adresbalk: `/merk/<id>`).

**Wat draait er, en wat ging er mis?**

```sql
select j.type, j.status, j.attempts, j.last_error, j.scheduled_for, j.finished_at
from jobs j
left join analyses a on a.id = j.analysis_id
where j.profile_id = '<profiel-id>' or a.profile_id = '<profiel-id>'
order by j.created_at desc
limit 50;
```

**Wat kostte het tot nu toe, per soort aanroep?**

```sql
select c.kind, count(*) as aanroepen, round(sum(c.cost_usd)::numeric, 3) as dollar
from ai_calls c
left join analyses a on a.id = c.analysis_id
where c.profile_id = '<profiel-id>' or a.profile_id = '<profiel-id>'
group by c.kind
order by dollar desc;
```

**Waar staan de pagina's?**

```sql
select p.title, p.status as plan, p.scheduled_for, c.status as tekst, c.needs_review,
       (c.brief_json is not null) as brief,
       (select count(*) from fact_requests f
         where f.status = 'open' and c.id = any(f.content_piece_ids)) as open_vragen,
       jsonb_array_length(coalesce(c.controle_json->'gele_zinnen', '[]'::jsonb)) as geel
from planned_pages p
left join content_pieces c on c.id = p.content_piece_id
where p.profile_id = '<profiel-id>' and p.plan_month_id is not null
order by p.scheduled_for;
```

**Welke vragen staan er per pagina?**

```sql
select c.title, f.open_vraag, f.scope, f.status, f.question, f.reason
from fact_requests f
join content_pieces c on c.id = any(f.content_piece_ids)
join analyses a on a.id = c.analysis_id
where a.profile_id = '<profiel-id>' and c.is_current
order by c.title, f.open_vraag desc, f.created_at;
```

**Welke vragen uit het rapport hangen aan geen pagina?** (Hun antwoorden gaan sinds besluit B17 via blok A
naar elke pagina van het cluster.)

```sql
select f.status, f.question, f.answer
from fact_requests f
join analyses a on a.id = f.analysis_id
where a.profile_id = '<profiel-id>' and f.scope = 'analyse'
  and coalesce(array_length(f.content_piece_ids, 1), 0) = 0;
```
