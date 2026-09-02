# Logboek, beslissingen en bouwrondes

Waarom het is zoals het is. Chronologisch, met de cijfers die de beslissing droegen.
Voor hoe het werkt: `architecture.md`. Voor wat er nog moet: `tasks/roadmap.md`.

## Verwijzingen uit code naar oude documenten

Code-commentaar en migraties verwijzen op **556 plekken** (geteld op 17 augustus 2026) naar
documenten die niet meer bestaan. Die verwijzingen blijven bewust staan: ze dragen het waarom van
een keuze, en dat waarom verdwijnt niet met het bestand. Deze tabel vertelt waar je in plaats
daarvan moet kijken. **Voeg hier een regel toe zodra je een document verwijdert**, anders wijst een
verwijzing in de code straks nergens meer heen.

| Verwijzing in code | Wat het was | Nu |
|---|---|---|
| `optimalisatie.md` fase 0–7 | Het optimalisatietraject ná de MVP | §3 hieronder |
| `implementatieplan.md` R0–R8, S1–S8 | Het werkdocument met de stappen | §5–§8 hieronder |
| `abcplan.md` §2/§5/§10/§12 | Het oorspronkelijke MVP-bouwplan + 32 vastgelegde keuzes | §2 hieronder + `architecture.md` |
| `contentbriefing.md` | De specificatie waarop R5 gebouwd is | §6 hieronder |
| `kwaliteitsanalyse-5-testcases.md`, `praktijktest-udenhout.md`, `strategie-contentkwaliteit-vervolgstappen.md` | De doorlichtingen | §4, §6, §8 hieronder |
| `designsystem.md`, `ux-*.md` | Design system en UX-analyses | `ux-design.md` |
| `SETUP.md` | Installatie en deploy | `architecture.md` §8–§9 |
| `onboarding-2.0.md` blok A t/m E | De bouwspec van de nieuwe onboarding: klantkoppeling (A), de onderzoeksfases (B), gespreksuitkomst (C), core topics (D) | §14 hieronder. Gebouwd en verwijderd; de fases zelf staan als taaksoorten in `lib/jobs/types.ts` |
| `inspace-optimalisaties-1-4.md` 1 t/m 4 | Vier losse verbeteringen uit de InSpace-analyse | Alle vier gebouwd, elk met een eigen module: 1 = structuurgat (`lib/pipeline/structure-gap.ts`), 2 = JSON-LD per pagina (`lib/schema-jsonld.ts`), 3 = duplicatiecontrole (`lib/pipeline/similarity.ts`), 4 = leesbaarheid (`lib/pipeline/readability.ts`) |
| `status-doorontwikkeling.md` §2.1/§2.3/§2.4 | De doorlichting die de kernconventies opleverde | Code-conventies 1 en 3 in `CLAUDE.md`: een promptinstructie is een intentie en code is een garantie, en onbekend is een betere waarde dan een verkeerde |
| `contentkwaliteit-analyse.md` C3/C4/E1 | De analyse onder de redactielus van de contentronde | §6 en §7 hieronder |
| `tasks/nova-analyse.md` §3.2/§3.3 | InSpace Nova ontleed uit 2.447 interfaceteksten: hun statusmachines (§3.2) en de velden van hun merkprofiel (§3.3) | §29 en §30 hieronder. Wat we ervan overnamen zit in migratie `0045` (tone-schuiven, verboden woorden, auteursvelden), `lib/analysis-status.ts` (de tweelaagse statustaal) en `lib/pipeline/version-reason.ts`. Verwijderd 17 augustus 2026 |
| `tasks/zoekdata-koppeling.md` §0/§2 | Het onderzoek vóór de Search Console-koppeling: service account in plaats van OAuth, en het meetvenster van twee dagen | Gebouwd in fase 5 (migratie `0052`, `lib/search-console/`). De twee regels over naijlende cijfers staan nu in `lib/search-console/window.ts` zelf. Verwijderd 17 augustus 2026 |
| `tasks/r0-fundament.md` R0.1 t/m R0.6 | Zes hygiënestappen die in de praktijk niets blokkeerden | Nooit gebouwd, bewust. Het enige punt dat telt staat in `tasks/roadmap.md`: R0.5 is de reden dat de fabrikanten die Bol verkoopt nog als concurrent meetellen. Verwijderd 17 augustus 2026 |
| `tasks/r6-inventaris-en-bronnen.md` R6.2/R6.3 | De inventariskwaliteitspoort en het brontype als signaal | R6.2 is gebouwd als fase 0 van de onboarding (`lib/pipeline/inventory-quality.ts`, migratie `0039`). R6.3 staat nog open en de spec is verhuisd naar `tasks/roadmap.md` §4. Verwijderd 17 augustus 2026 |
| `tasks/lanceerplan.md` K1-K5, P1-P7, F1-F5, D4/D7/D10, R6 | Het pad van "gebouwd" naar de eerste betalende klant: zes testsporen, twee kwaliteitslatten, een tweeweekse planning | **De twee latten staan hieronder als eigen sectie**, want twaalf codebestanden noemen ze bij naam. De sporen en de planning zijn ingehaald: F1 (budgetplafond) is migratie `0053`, F4/P5 (klant verwijderen) is `lib/deletion.ts`, D4/D7/D10 (wedstrijdcondities) zijn af. Verwijderd 17 augustus 2026 |
| `tasks/appstructuur.md` | Het uitvoerplan voor de herindeling van de zijbalk en de schermen: zeven fases, de acht besluiten en de tien Nova-aanscherpingen | **De zeven fases staan hieronder als eigen alinea's** (17 augustus 2026). De doelstructuur zelf staat in `ux-design.md` §5. Verwijderd 17 augustus 2026, toen fase 7 af was |
| `tasks/onboarding-3.0.md` deel A t/m K | Het bouwplan van onboarding 3.0: de vergelijking met Nova (A), de route van de beheerder (B), drie momenten met één veldenlijst (C), de vijftien nieuwe velden (D), het oordeel per Nova-veld (E), de zes fases (F), de schermspec van de sessie (G) | De zes alinea's van 19 augustus 2026 hieronder. Gebouwd en verwijderd op 19 augustus 2026. De velden zelf staan in migratie `0060` en in `lib/pipeline/brand-fields.ts`, het schermontwerp in `ux-design.md` §5, en de uitleg zonder techniek in `APP_FLOW_DOCUMENTATION.md` §6 |
| `Nova.md` | InSpace Nova gereconstrueerd, de gap-analyse en het achtfasenbouwplan dat daaruit volgde | Bouwplan afgebouwd, zie de secties hieronder per fase. Zelf verwijderd op 17 augustus 2026, de citaten die er verderop in dit logboek nog naar verwijzen zijn historisch en blijven staan zoals ze geschreven zijn. De richting daarna staat in `visie.md` |
| `tasks/mijn-reputatie.md` (en de leesbare versie ernaast, `tasks/mijn-reputatie.html`) | Het product- en implementatieplan voor de reputatieanalyse: waarom een los product, de vier vragen aan ChatGPT, de oordeelslaag, het datamodel en de rekensom over de kosten | Alle vijf sprints (R1 t/m R5) gebouwd en op drie echte runs geverifieerd, zie de zeven secties hieronder van 22 en 23 augustus 2026. Het datamodel zelf staat in de migraties `0062` t/m `0064`, de pijplijnstap in `architecture.md` §6 rij 21, de code in `lib/reputation/` en `lib/pipeline/reputation-*.ts`. Verwijderd 23 augustus 2026, toen R5 geverifieerd was |
| `tasks/doorloop-huyberts.md` | De zes punten uit de eerste volledige klantdoorloop van 26 augustus 2026, met per punt de bestanden, de aanpak en het verificatiecriterium, testklant Huyberts Keukens als bewijsmateriaal | Alle zes punten en de twee kleinere punten afgehandeld, zie "26 augustus 2026: de zes punten uit de doorloop afgewerkt" hieronder. Migratie `0066`, `docs/architecture.md` §9 (opnieuw doorgerekend), `docs/tasks/roadmap.md` (het opengebleven structurele vervolg op punt 6). Verwijderd 26 augustus 2026 |

De volledige originelen staan in de git-historie (laatste versie: de commit vóór de
documentatie-herstructurering).

## De twee kwaliteitslatten: K1 t/m K5 en P1 t/m P7

**Geen geschiedenis maar woordenschat.** Twaalf codebestanden en `scripts/test-unit.ts` verwijzen
naar deze codes bij naam ("K2 uit het lanceerplan", "P2: geen tweelingen"). Ze komen uit
`tasks/lanceerplan.md`, dat op 17 augustus 2026 is verwijderd toen de lancering was ingehaald door
de gebeurtenissen. De latten zelf gelden nog steeds, dus staan ze hier.

**Lat 1, K1 t/m K5: het moment waarop software vertrouwen wint of verliest.** Afgeleid uit het
berichtenbestand van InSpace Nova, alle vijf te controleren zonder hun product te zien.

| # | Eigenschap | Hoe je hem toetst |
|---|---|---|
| **K1** | Elke toestand heeft een eigen scherm. Leeg is geen afwezigheid maar een boodschap | Zet het scherm in elke toestand die kan bestaan. Staat er iets, en klopt het? |
| **K2** | Elke foutmelding is specifiek. Nooit "er ging iets mis" | Forceer elke fout. Zegt de melding wát er mis is en wie het kan oplossen? |
| **K3** | De taal zegt wie aan zet is, naast de technische status | Staat er bij elke wachtende toestand wie er iets moet doen? |
| **K4** | Onomkeerbaar wordt vooraf benoemd, in een eigen blok en niet als zin in een alinea | Elke handeling die niet terug kan: staat de waarschuwing er, en apart? |
| **K5** | Bulk is eerlijk over gedeeltelijk succes | Laat een bulkactie half mislukken. Wordt dat eerlijk gemeld? |

**Lat 2, P1 t/m P7: kan dit een maand draaien met echte klanten en echt geld.** Niet afgeleid van
Nova maar uit eigen oordeel.

| # | Eigenschap |
|---|---|
| **P1** | Geen stille fout. Elke `catch` die slikt en elke `?? null` die een storing als "leeg" toont, is een fout die je maanden later pas ontdekt |
| **P2** | Eén waarheid, geen tweeling. Twee functies die hetzelfde zouden moeten doen, drijven uit elkaar. `getOwnedProfile` en `getOwnedAnalysis` deden dat precies zo |
| **P3** | Kosten hebben een plafond. Geen enkel pad waarlangs iemand ongelimiteerd geld kan uitgeven. Gebouwd als besluit 18, migratie `0053` |
| **P4** | Waarneembaar bij storing. Als het om drie uur 's nachts breekt, zie je dat dan |
| **P5** | Herstelbaar. Backups, en een klant volledig kunnen verwijderen. Gebouwd, zie `lib/deletion.ts` |
| **P6** | Grenzen getest. Nul onderwerpen, 150 pagina's, een merknaam van 200 tekens |
| **P7** | ~~Geen wedstrijdcondities.~~ Afgerond |

Waar deze codes in de code staan: `lib/access.ts` en `lib/spend-limit.ts` (P2), `lib/cost-guard.ts`
(P2), `lib/spend-rules.ts` en `lib/spend-limit.ts` (P3, K2), `lib/search-console/key-state.ts` (P1),
`lib/deletion.ts` en `lib/deletion-rules.ts` (P5, K4), `lib/cost-rules.ts` (K2).

## 1. Het product

GEO-tracking voor het MKB en marketeers die geen SEO-expert zijn. We concurreren niet op features
of enterprise-diepgang, maar op eenvoud en snelheid. Bewust **niet** gebouwd: white-label
rapportages, 10+ LLM-engines tegelijk, keyword-research suites, een CMS-koppeling, echte
zoekvolumes. Dat is waar de concurrentie complex en duur wordt.

Sinds 3 augustus 2026 is het product **sales-led** en staat er een tweede engine (Gemini) klaar
maar slapend. Die twee wijzigen de zin hierboven; het waarom staat in §15.

⚠️ **Twee dingen die in oudere secties anders staan.** "Een tweede LLM-provider bouwen we niet"
gold t/m §11 en is met §15 vervallen, de enginelaag staat er, alleen de sleutel niet. En
"self-serve" is nergens meer waar: elke schermbeslissing vanaf §14 gaat uit van een consultant die
zijn scherm deelt.

## 2. De MVP en de vastgelegde keuzes

De keuzes die sindsdien niet meer ter discussie hebben gestaan:

1. **OpenAI-only, drie tiers, vast in code.** Geen env-variabele, geen tweede provider. Op de
   GPT-4.1-familie draaide de meting op mini en niet op nano: met `web_search` faalde nano 10 van
   de 10 keer. Sinds augustus 2026 zijn het GPT-5.6-modellen, zie §10.
2. **Alles bewaren.** Elke AI-call slaat zijn volledige ruwe JSON op náást de uitgesplitste
   kolommen. Volledige audit-trail, geen dataverlies bij toekomstige schemawijzigingen.
3. **Verplichte goedkeuringspoort.** Na onderzoek + prompts stopt de pijplijn tot de klant
   bevestigt. Niets betaalds start zonder klik.
4. **Nooit rechtstreekse client-writes.** Alles via API-routes met service-role + ownership-check.
   RLS werkt op rij-, niet op kolomniveau en kan dus nooit afdwingen wélke velden een klant mag
   wijzigen. Dat hoort in de route.
5. **Bewijs is een ID-verwijzing, geen losse tekst.** `evidenceRunIds`/`winning_run_ids` wijzen
   naar `tracking_runs.id`, zodat de klant kan doorklikken naar de echte AI-conversatie.
6. **Mention-schema per entiteit, niet plat.** Elke meting slaat per entiteit een eigen rij op,
   inclusief de bronnen die specifiek díe entiteit onderbouwen. Een plat schema met losse
   `competitorsMentioned[]`-lijsten kan geen "bronnen per concurrent" leveren. Gecorrigeerd na een
   pipeline-review vóórdat er gebouwd was.
7. **Retry-regel als kostenbescherming.** 3a en 3b zijn los herhaalbaar; een mislukte 3b draait
   nooit opnieuw de dure web_search-call.
8. **Status gesplitst in `gemeten` en `gereed`.** Eén status betekende zowel "score klaar" als
   "rapport klaar", waardoor tab-beschikbaarheid niet af te leiden was.
9. **Promptgeneratie per funnelfase, niet één call voor alle 30.** Eén grote call levert
   herhaling en gebrek aan diversiteit. Meerkosten ~$0,002.
10. **Klantprofiel op accountniveau.** Het merkonderzoek verhuisde van per-analyse naar per-profiel
    (`0004`): een bureau met meerdere merken, en meerdere analyses per merk, doet niet telkens
    hetzelfde bedrijfsonderzoek over. Onderwerp werd verplicht. Zonder onderwerp voegt een analyse
    niets toe aan wat het profiel al dekt.
11. **Klant-input is leidend boven AI.** Deterministisch afgedwongen in `prepare-profile.ts`:
    ingevulde scalars blijven staan, lijsten worden een unie, alleen lege velden vult de AI.
12. **Onderwerp niet wijzigbaar na start.** Voor een andere scope start de klant een nieuwe
    analyse; anders raken onderzoek en prompts inconsistent met de metingen.
13. **Volume-gewogen score naast de ongewogen.** Gewicht = volume × commerciële waarde
    (transactional 1,0 · commercial 0,6 · informational 0,3, ondergrens 0,1). Bevroren op het
    meetmoment in `tracking_runs.prompt_weight`. Het verzonnen 0–100 volumegetal is later vervangen
    door drie banden (`0017`).
14. **Webshop-productpagina's uit de crawl.** Het kunnen er duizenden zijn en ze zijn geen zinvol
    GEO-contentdoel; categoriepagina's blijven wel.

## 3. Optimalisatietraject, fase 0 t/m 7 (afgerond)

De diagnose: de app **mat** en **schreef**, maar die twee helften raakten elkaar nergens. De meetdata
bereikte de schrijver niet en de geschreven content kwam nooit terug in de meting. Doel van het
traject: die cirkel sluiten.

| Fase | Wat het opleverde |
|---|---|
| 0 · Fundament | Fouten en ruis eruit, zodat de rest meetbaar werd. |
| 1 · Achtergrondmotor | De jobwachtrij. Het 60-secondenplafond van serverless weg; werk loopt door met een gesloten browser. Hier bleek ook de Vercel Hobby-cronlimiet: een minuutlijkse cron in `vercel.json` laat niet de cron maar de héle build falen. Vandaar pg_cron. |
| 2 · Betrouwbare meting | Cijfers die een klant mag geloven: onzekerheidsmarges, meetkwaliteit. |
| 3 · Bewijs zichtbaar | Doorklikbaar bewijs, blokkades (technische audit) zichtbaar. |
| 4 · Schrijver voeden | Content op basis van de meting in plaats van blind. |
| 5 · Cirkel rond | Publiceren, verifiëren, effect meten. |
| 6 · Trend en herhaling | Periodieke rapportage, maandelijks in plaats van wekelijks. |
| 7 · Off-site | Externe domeinen als tweede hefboom naast eigen content. |

**Geparkeerd:** meerdere LLM-engines tegelijk.

**Contentkwaliteit-doorlichting (juli).** De meet-/adviespijplijn was degelijk; het dunste onderdeel
was juist het betaalde product. Fase C schreef blind: één call, één klein model, geen redactie, geen
kwaliteitspoort, en door de terechte regel "verzin geen feiten" gedwongen generiek. Drie inzichten die
het ontwerp sindsdien sturen:

1. **Grounding lost de generiek-val op.** "Verzin geen feiten" maakt content generiek zolang de
   schrijver *geen* feiten heeft. Geef hem geverifieerde feiten uit de eigen site en hij kan concreet
   én veilig schrijven.
2. **Kwaliteit is bijna gratis.** Content is vraaggestuurd; een redactielus + premium model kost
   centen per pagina, terwijl content het product is waarvoor concurrenten €1.000+/mnd rekenen.
3. **Symmetrie.** De meting had een review-gate; de content hoort er ook een te hebben.

Resultaat: de driestapsredactie (schrijven → kritiek → herschrijven), de premium tier voor schrijven,
`proofPoints`/`styleSamples` als schrijfgrondslag, en programmatische validatie van `schema_jsonld` in
plaats van de LLM-string blind vertrouwen.

## 4. Praktijktest en doorlichting (28–30 juli)

**Van den Udenhout, "Private Lease Skoda".** De eerste volledige doorloop met een echte klant,
nagerekend tegen de opgeslagen data. Uitkomst: **vijf verzinsels** in de content, precies op de
plekken waar de pagina een concreet feit nodig had. Dat werd de aanleiding voor heel R5.

**Vijf testanalyses** (Bol, Coolblue, HEMA, Van der Valk, Fysi-Unique, 30 juli) tegen de drie
klantdoelen leverden 20 verbeterpunten op. De vier zwaarste werden R1–R4. Deze vijf analyses zijn
sindsdien de **regressieset**: ze hebben opgeslagen `raw_response`-teksten, dus vrijwel elke stap
is zonder nieuwe OpenAI-kosten te verifiëren door de bestaande data opnieuw te verwerken.

## 5. R1–R4, R6.1, de meetkant repareren

| Ronde | Het probleem, gemeten | De ingreep |
|---|---|---|
| **R1** Bewijslaag | Het rapport verzon welke concurrent een vraag won. | Een deterministisch bewijsdossier uit de database gaat de prompt in; het model verwoordt alleen. Een claimvalidator verwijdert achteraf elke merknaam die niet in het dossier van díe vraag staat, en logt dat in `stripped_claims_json`. |
| **R2** Meetbaarheid | De score telde "de AI noemde niemand" mee als "jij werd niet genoemd". | Per antwoord wordt geteld hoeveel aanbieders er genoemd worden. Alleen winbare vragen tellen mee; structureel merkloze vragen worden bij vervolgperiodes overgeslagen. |
| **R3** Zichtbaarheidsprofiel | `position` stond vol onzin (215 van 521 vermeldingen op 0) en `sentiment` gaf in 650 metingen nooit iets anders dan neutraal. | Positie genormaliseerd (`normalizePosition()`), `sentiment` vervangen door `mention_role`, citaties worden geteld. |
| **R4** Concurrent-intelligence | Concurrenten werden geteld maar niet begrepen. | Nieuwe pijplijnstap destilleert per concurrent waaróm die genoemd wordt, met een letterlijk citaat per eigenschap. |
| **R6.1** Gelaagd hermeten | Eén meting per vraag was te wisselvallig voor een trendlijn. | De zwaarste 8 vragen gaan 3× door de meting; alle aggregatie telt per **vraag** in plaats van per meting. |

**De les uit de verificatieronde, die sindsdien een huisregel is:** het model vulde ondanks een
expliciete instructie bij 10 van 27 niet-genoemde merken tóch een rol in, structured output kiest
bij twijfel de eerste enum-waarde. Een promptinstructie is een intentie; alleen code is een
garantie.

## 6. R5, de contentbriefing

Het model verzon feiten precies waar de pagina er een nodig had (zie §4). De oplossing is geen
strengere instructie maar een andere volgorde: de app bouwt eerst een **feitenkaart**, laat een
**claim-audit** bepalen welke beweringen daarop niet onderbouwd zijn, stelt de klant maximaal 8
gerichte vragen, en schrijft daarna uitsluitend binnen die kaart, met per bewering het F-nummer
dat hem dekt.

## 7. De contentronde (31 juli), tien pagina's, vier bugs

Tien pagina's (5 testcases × 2) door de volledige keten geschreven en pagina voor pagina beoordeeld.

- **Direct gerepareerd:** `draftContentPiece()` behandelde een `content_piece` met status `'briefing'`
  als "al af" en sloeg het schrijven stilzwijgend over. Trof potentieel elke "Schrijf mijn
  pagina's"-klik sinds R5.2.
- **De zwaarste vondst van het hele traject:** de antwoorden die de klant in het briefingscherm geeft,
  bereikten de schrijver niet. `loadContentContext()` bouwde wel een lijst `answeredFacts`, maar
  gebruikte hem nergens, de schrijver kreeg uitsluitend de kaart zoals die vóór de antwoorden bevroren
  was. Bewijs: een door de tester met bron bevestigd "nee" op de doelvraag van een Fysi-Unique-pagina
  werd alsnog als "ja" gepubliceerd. Geen losse bug maar het gat waardoor R5's kernbelofte niet werkt
  zodra de klant iets *corrigeert*.
- Drie kleinere bevindingen: multi-ref-claims die de citaatplicht ten onrechte lieten falen, een
  versiesprong die een lege spookrij achterliet, en vaste praktisch-slots die niet passen bij een
  platform of keten.

**R8 loste negen van de tien op.** De belangrijkste:

- **R8.1**, `mergeAnsweredFacts`: de klantantwoorden komen alsnog op de feitenkaart, en een nieuwer
  antwoord verslaat een ouder op basis van de vraag.
- **R8.2 / R8.7 / R8.8**, `content-gate.ts`: deterministische controles vervangen de zelfrapportage
  van het model, die 100/100 gaf op alle tien pagina's, óók op de pagina waarvan dezelfde aanroep in
  zijn eigen verbeterpunten schreef dat de hoofdvraag niet beantwoord werd.
- **R8.3**, een bewering die op twee bevestigde feiten steunt telt niet langer als onbewezen.
- **R8.4**, bijna-identieke vragen vallen samen (`topicKey`); al gestelde vragen gaan mee de
  claim-audit in.
- **R8.5**, `profiles.business_model` (`0032`) en een vragenset die zich daarop aanpast.
- **R8.6**. Het briefingscherm noemt `suggested_answer` een gok, geen voorstel.
- **R8.10**, een verse briefingrij wordt in dezelfde rij geschreven; geen spookversie meer.

**R8.9** (productfeed voor retailers) is bewust een onderzoeksvraag gebleven, geen bouwstap.

## 8. S1–S8 en R7.1, de laag erboven (31 juli / 1 augustus)

De contentronde vond het gat tussen klant en schrijver; deze doorlichting vond het **plafond
erboven**. De feitenkaart was merkbreed en onderwerp-blind: over vijf analyses stonden er 24
citeerbare feiten op, en géén ervan ging over het onderwerp van de analyse. Voor "wasmachine kopen"
waren dat gratis wassen tussen 12 en 15 uur, cashback op groene stroom en een AirPods-reviewscore.
Het materiaal lág er wel, Coolblue had 10 gecrawlde wasmachine-adviespagina's in `profile_pages`,
waarvan er nul op de kaart kwam terwijl vier Engelstalige duplicaten van de homepage dat wél deden.
Oorzaak: `buildFactBase()` nam de eerste 8 crawlrijen, zonder `order by` en zonder relevantiefilter.

| Stap | Wat het oploste |
|---|---|
| **S1** Onderwerpgerichte, atomaire feitenkaart | Relevantieselectie in code (`page-relevance.ts`) plus één mini-aanroep die letterlijke zinnen met een hard feit eruit haalt (`fact-atomise.ts`, ~$0,004 per batch). Vangnet los in `atom-verify.ts`. |
| **S2** Het paginaplan overleeft de briefing | De claim-audit rekende uit wat elke pagina moet beweren (31 beweringen over vijf batches, 19 onderbouwd) en dat werd weggegooid zodra de vragen gesteld waren. Nu blijft het plan per pagina staan en gaat het als opdracht de schrijfprompt in, met per punt GEDEKT / WEERLEGD / GEEN BRON. |
| **S3** De code bepaalt de noemer | `source_coverage` mat 49 door het model getagde beweringen op ~250 zinnen, één op de vijf, en juist in die andere vier vijfde zaten beide fabricages van de contentronde. `claim-extract.ts` bepaalt nu welke zinnen een bewering zijn; een zin zonder onderbouwde claim telt als ongedekt en komt met naam en toenaam in `review_notes`. |
| **S4** De positioneringsvraag bestaat | `onderscheid` was 0 van de 62 gestelde vragen, waardoor de R8.8-controle op een lege verzameling draaide. Nu een deterministisch slot uit `competitor_breakdown.attributes_json`, met één gereserveerde plek in de acht. Die bewijszinnen gaan nu ook naar de schrijver. Die kreeg alleen de woorden "prijs" en "service". |
| **S5** Het merkdossier (`0035`) | Max 8 vragen per batch leverde over vijf testklanten 21 beantwoorde vragen op. Nu kan de klant plakken wat hij al heeft liggen; één mini-aanroep maakt er vraag/antwoordparen van. Het vangnet (`dossier-verify.ts`) gooit elk paar weg waarvan het antwoord niet letterlijk in de aangeleverde tekst staat, "€ 45,00" afronden naar "45 euro" is een andere belofte. De brontekst blijft bewaard met sha256-hash: dezelfde brochure twee keer plakken levert een melding, geen tweede set feiten. |
| **S6** De publicatiepoort (`0034`) | `status: 'ready'` betekende "de pijplijn is klaar" maar werd getoond als "klaar om te publiceren". Nu betekent `needs_review = true` "nog niet vrijgegeven". Bewust géén nieuwe enum-waarde: `content_status` is een Postgres-enum, dus een extra waarde raakt elke plek die op status filtert. `reviewed_at`/`reviewed_by` scheiden "de poort vond niets" van "een mens heeft gekeken". Het paneel toont die derde stand expliciet. |
| **S7** De ketentest | Zeven van de zeven fouten van dit traject zaten in de samenhang tussen taken, en `test-unit.ts` kon ze geen van alle vangen. `npm run test:chain` draait de échte jobhandlers tegen een échte Postgres met dezelfde migraties. Geen Docker, geen Supabase CLI, `initdb` + `pg_ctl` volstaan. Alleen de Supabase-wire-vertaling en OpenAI zijn nagebootst. **Aangetoond dat de test kán falen:** met de reparatie van bug 6 teruggedraaid wordt hij rood op precies die assertie. |
| **S8** De feitenbank (`0036`) | Een F-nummer is een POSITIE, geen identiteit: "F3" betekent "het derde feit in déze lijst". In de ketentest verwees de stub naar F1 en F2, en zodra er vier klantantwoorden bijkwamen werden dat F5 en F6. Daardoor stond hetzelfde feit in élke snapshot opnieuw, was van `claims_json` niet te zeggen naar wélk feit een bewering verwees, en belandden twee tegenstrijdige antwoorden allebei op de kaart. Nu heeft elk feit een `fact_key`, een scope en `superseded_by` in plaats van overschrijven. Tegenspraken komen boven in plaats van dat het model kiest. Fouttolerant: gaat het schrijven stuk, dan werkt de kaart als vóór `0036`. |
| **R7.1** Winbaarheid als kans (`0037`) | `brand_eliciting` was een tekstvlag en `queue.ts` sloeg elke vraag met `'nee'` over, terwijl de onderliggende meting een verhouding is. Op productie: alle **9** prompts op `'nee'` stonden daar op **precies 2 metingen**, bij n=2 en nul successen loopt de bovengrens van het Wilson-interval tot ~0,66. Nu tellen `elicit_successes`/`elicit_samples` mee, vervalt een vraag pas bij ≥8 metingen én een bovengrens onder 0,25, en verschijnt de vlag pas vanaf 3 metingen. Met de huidige stand wordt er dus geen enkele overgeslagen. Precies de bedoeling. |

**Volgorde-notitie:** S1 t/m S7 zijn eerst gebouwd zónder migratie, omdat er destijds alleen
leestoegang tot productie was. Dat leverde bruikbare stappen op met drie erkende beperkingen; die
zijn met `0034`–`0036` alsnog opgeheven zodra de schrijfrechten er waren.

## 9. UX-herstructurering

De diagnose was drieledig: de informatiestructuur vertelde niet welk product dit is (van vier
navigatielinks wezen er twee naar dezelfde route), de levenscyclus van een analyse was vier keer
los geïmplementeerd, en er was geen enkele systeem-feedback op routeniveau. Geen `loading.tsx`,
`error.tsx` of `not-found.tsx` in de hele app, terwijl elke RSC-pagina 4–7 queries doet.

Doorgevoerd: navigatie ontdubbeld tot twee bestemmingen met "Merken" in plaats van
"klantprofielen"; de vijf tabs vervangen door één dossier in vier hoofdstukken met een sectie-rail;
`lib/work.ts` als enige statusmachine voor werk (was er vijf); route-feedback met skeletons; en de
componentdrift opgeruimd (`.card` zonder hover, één knophoogte-schaal, chip-tinten als classes in
plaats van 30 handgebouwde inline-styles).

Het uitgangspunt bij dat alles: de datalaag was al netjes gescheiden (`lib/pipeline/*`,
`lib/dashboard.ts`), dus vrijwel alles was schermwerk. Zie `ux-design.md` voor het resultaat.

## 10. Eind-tot-eind door de productie-app (1 augustus)

Eén echte klantcase van nul tot artikel, via de browser tegen de live app, met echte kosten:
**Swapfiets** (swapfiets.nl), onderwerp *fietsabonnement*: profiel aanmaken, 22 vragen, bevestigen, 38
metingen met `web_search`, rapport, briefing beantwoorden, één pagina laten schrijven. Kosten: **$1,03**,
waarvan $0,988 (96%) in de 38 metingen, precies de verhouding die §3 voorspelde.

> Deze run draaide op de **GPT-4.1-familie**; de migratie naar GPT-5.6 (§11) volgde direct. Bedragen
> en modelnamen gelden voor vóór die migratie, de bevindingen zelf niet.

De keten werkt: score 95 ±13, 68% van de metingen noemt Swapfiets, gemiddelde positie 1,3, 14× als
eerste aanbevolen, artikel van 502 woorden waarvan elke bewering een F-nummer naar een echte bron
draagt. Nul verzinsels.

Vijf dingen gingen onderweg stuk, op volgorde van erg:

**De content-inventaris verdween zonder een woord.** Twee van de 22 gecrawlde pagina's bevatten een
NUL-byte (U+0000); Postgres accepteert dat niet in `text`, PostgREST weigert dan de HÉLE batch-insert,
dus twee rotte pagina's kostten alle 22. `refreshInventory()` gaf 22 terug, `profile_pages` bleef
leeg, het profiel ging op 'klaar'. Duurste soort fout: onzichtbaar, vreet aan het fundament (lege
feitenkaart, content op niets gebouwd). Na reparatie: **29 citeerbare feiten, 18 uitsluitend uit de
crawl**, inclusief prijzen (€19,90/€23,90) en de servicebelofte. Geschoond bij de bron
(`lib/pg-text.ts`, `htmlToText()`), beide inserts controleren nu hun fout.

**De werker werd door het platform afgekapt.** Twee 504's ("Task timed out after 300 seconds"): de
SDK-timeout van 100s per POGING met `maxRetries = 3` gaf een echte bovengrens van 400s, terwijl
`HEAVY_JOB_RESERVE_MS` (220s) uitging van geen herhaling. Nu een totaalbudget van 105s via een
`AbortSignal` over alle pogingen. Alles wat geclaimd was bleef vijf minuten op 'running' tot de reaper
het terugzette, en zo lang staat een klant naar een leeg voortgangsscherm te kijken.

**Wat je vóór de hydratie typte, was weg.** Het naamveld heeft `autoFocus`; wie vóór React het
formulier overnam typte, zag naam én webadres leeglopen bij de eerste re-render (controlled input
overschreef de DOM-waarde). Eén effect bij het aankoppelen neemt nu over wat er al stond.

**Oriëntatie leverde 2 van de 10 vragen op.** De merkneutraliteitsregel werkte terecht (een brede
vraag over fietsabonnementen noemt de marktleider, hier de klant zelf), maar de aanvulronde wist niet
dát de vorige ronde op een BEDRIJFSNAAM sneuvelde. Reden staat nu expliciet met de verboden namen; een
fase mag drie rondes. ⚠️ Enige reparatie nog **niet live nagerekend**.

**En een e-mail die nooit kwam.** "Wacht op de e-mail" stond overal terwijl `EMAILS_ENABLED` uitstond.
Nu alleen wat altijd waar is. Verder `app/icon.svg` toegevoegd (`/favicon.ico` gaf 404).

Wat déze ronde leert: de bugklasse schoof op. De zeven fouten van juli zaten in de samenhang tussen
taken; deze vijf zitten in de **randen van het systeem** (open web in de database, platform-timeouts,
de browser vóór React). Geen enkele te vinden met een test die de app tegen zichzelf draait; alle vijf
lagen binnen tien minuten open bij één echte klant.
## 11. Over naar GPT-5.6 (1 augustus 2026)

De hele app draaide op de GPT-4.1-familie. Nu: **`gpt-5.6-luna`** voor alles wat meet, onderzoekt en
beoordeelt, en **`gpt-5.6-sol`**. Het duurste model dat OpenAI levert, uitsluitend voor het schrijven
en herschrijven van content. Dat laatste is de enige stap waarvan de uitkomst letterlijk gepubliceerd
wordt; daar is de tier het geld waard, overal elders niet.

**Wat er inhoudelijk moest veranderen, en waarom het meer was dan drie strings.**

De GPT-5-familie is een redeneerfamilie. Dat raakt twee dingen die deze app expliciet gebruikte:

- **`temperature` is geen vrije knop meer.** Een GPT-5.6-model accepteert hem alleen bij
  `reasoning.effort: "none"`; bij elke hogere stand is het een unsupported parameter en faalt de call.
  De app zette op 21 plekken een temperatuur, één op één overzetten had dus niet "iets slechtere
  output" opgeleverd maar een 400 op elke onderzoeks-, rapport- en schrijfstap.
- **De tier-splitsing verviel.** `volume` (nano) en `quality` (mini) waren twee modellen; nu wijzen ze
  allebei naar Luna. Het onderscheid dat we ermee maakten, hoeveel mag deze stap kosten en hoe
  zorgvuldig moet hij zijn, zit nu in de redeneerinspanning.

Daarom geven aanroepplekken geen temperatuur meer op maar een **soort werk** (`work: "deterministic" |
"analytical" | "creative" | "content" | "simulation"`), en vertaalt `resolveTuning()` in
`lib/openai/sampling.ts` dat naar de parameters die daadwerkelijk de deur uit gaan. Eén tabel, met per
regel de reden: classificeren krijgt effort `none` + temperatuur 0 (reproduceerbaarheid gaat vóór, één
verschoven oordeel verschuift de score), promptgeneratie effort `none` + temperatuur 0,8 (variatie ís
daar het product), onderzoek effort `low`, content effort `medium`. De effort-standen staan laag omdat
één call binnen de 100 s van `TIMEOUT_MS` moet passen en de meet- en onderzoeksstappen daar
`web_search` bij doen.

**Vangnet (conventie 1).** De regel "temperatuur mag bij effort `none`" is een regel van OpenAI, niet
van ons. Weigert de API hem alsnog, dan herhaalt `structured.ts` die ene call zonder temperatuur en
stuurt hem de rest van het proces niet meer mee. Liever iets meer ruis in de classificatie dan een
meetronde die omvalt nadat hij per vraag al betaald zoekwerk heeft gedaan.

**Kosten.** Twee kanten op. Zoeken werd goedkoper: op een redeneermodel kost `web_search` $10 per 1000
calls in plaats van $25, en dat was ~90% van een meetronde, 30 vragen gaan van $0,75 naar $0,30. Daar
staat tegenover dat de opgehaalde pagina's nu wél als input worden afgerekend (~$0,05 per ronde op
Luna). Netto ruwweg $0,40 in plaats van $0,82. Content werd juist ~5× duurder per pagina. Beide
getallen zijn afgeleid van de gepubliceerde tarieven en **nog niet nagerekend tegen `ai_calls` op
productie**, conventie 10 geldt ook hier.

**Wat dit niet oplost.** De eerste echte call op het nieuwe model is nog niet gemaakt: `npm run
test:openai` maakt betaalde calls en is in deze ronde niet gedraaid. Die rooktest verifieert nu wel
precies de combinaties die de pijplijn verstuurt (effort `none` + temperatuur 0, effort `low`, effort
`medium` op Sol), zodat een geweigerde parameter daar zichtbaar wordt en niet pas in een meetronde.
## 12. Bekende, bewust geaccepteerde beperkingen

- **R0.5 is niet gebouwd**, en dat is de reden dat de fabrikanten die Bol verkoopt nog steeds als
  concurrent meetellen.
- **`sentiment`** bestaat nog als kolom maar wordt niet meer gevuld of getoond (additief principe:
  we droppen niets).
- **`npm run eval:mention` is nooit gedraaid tegen de gewijzigde mention-prompt.** Dat bestand
  omschrijft zichzelf als "de meest load-bearing prompt van het hele product". Daar hoort een
  evaluatie bij. Vereist een API-sleutel. Sinds de overstap naar GPT-5.6 (§10) weegt dit zwaarder:
  de classificatie draait nu op een ánder model dan waarop de prompt is afgeregeld. Het script
  meet inmiddels met exact de productie-instellingen (effort `none`, temperatuur 0) en vergelijkt
  Luna tegen Terra.
- **De regressieset is vijf analyses van 30 juli 2026.** Na een wijziging moeten de cijfers óf
  gelijk blijven, óf aantoonbaar beter worden om de reden die in de stap staat.

## 13. Analyses-overzicht ontdaan van de opgerolde werklijst (3 augustus 2026)

`/analyses` toonde bovenaan dezelfde "Wat je nu kunt doen"-lijst als het dossier, maar dan opgerold
over alle analyses heen. Bij één analyse was dat zinvol; bij meerdere liep hij op **27 losse punten**
in één kaart, precies de rommel die het werkmodel (`lib/work.ts`, §9) per analyse juist had opgelost.
De lijst is weg van dit overzicht: dat werk komt uit een analyse en staat daar ook, in hoofdstuk 03 van
het dossier. `/analyses` toont nu alleen nog de drie statusblokken en de analysenlijst zelf.

Ter compensatie kreeg elke rij in die lijst vier kaartcijfers plus het aantal metingen:
zichtbaarheidsscore, aantal openstaande vragen, aantal voorgestelde en aantal geschreven pagina's, en
"N metingen" (`AnalysisCardMetrics`, `lib/dashboard.ts`). Twee dingen die de moeite van het
uitschrijven waard zijn:

- **Openstaande vragen is afgeleid, niet apart bevraagd.** `visibility_scores.score` is exact
  `genoemd / winnable_runs × 100`; door dat om te keren (`winnable_runs − round(score/100 ×
  winnable_runs)`) volgt het aantal gemiste vragen zonder een extra join op
  `tracking_run_mentions`. Die tabel heeft geen `analysis_id` en zou per analyse een aparte query op
  de laatste week hebben gekost.
- **"Geschreven" en "voorgesteld" gebruiken dezelfde statusgrens als `_chapters/werk.tsx`**: een
  `content_pieces`-rij telt pas als geschreven zodra de status voorbij `briefing` is (die heeft nog
  geen tekst); een aanbeveling telt als "voorgesteld" zolang er geen rij met status ≠ `draft` en
  dezelfde titel bestaat. Twee losse berekeningen voor "is dit al gedaan" hadden hier gegarandeerd uit
  elkaar gelopen.

`components/action-list.tsx` (de oude `ActionList`) is vervallen; `DashboardStats` verhuisde naar
`components/dashboard-stats.tsx`.

---

## 14. Onboarding 2.0, de eerste helft (3 augustus 2026)

De bouwspec (`tasks/onboarding-2.0.md`) is verwijderd nu de bouw af is. Hieronder wat er gebouwd is en
het cijfer dat elke keuze droeg.

**Het cijfer dat de hele ronde droeg: 6.000 tegen 60.** Het profielonderzoek deed één AI-aanroep op
`crawlSite()`, de homepage, afgekapt op 6.000 tekens. De content-inventaris van 60 pagina's draaide
parallel en werd pas ná de aanroep opgeslagen, dus kwam nooit het onderzoek in: alles wat het model
over diensten, prijzen, vestigingen en team "wist" kwam uit die ene pagina plus een gok.
`profile_discover` draait nu vóór het onderzoek, 60.000 tekens context voor ~$0,003. De duurste
kennisbron bleek gratis en werd weggegooid.

**Verkoopgedreven in plaats van self-serve.** Vier wizardstappen met elf velden werden drie velden
(webadres, bedrijfsnaam, andere schrijfwijzen); de pijplijn vult de oude kolommen via onderzoek,
corrigeren gebeurt achteraf op de profielpagina.

**De stafrol als extra policy, niet als herschrijving.** 19 tabellen hebben een `*_select_own`-policy;
Postgres OR't permissieve policies, dus één extra policy per tabel doet hetzelfde als alle 19
herschrijven, additief en terug te draaien met één `drop`. `staff_users` heeft RLS aan en nul policies
(zoals `jobs`), `is_staff()` is daarom `security definer` met een vaste `search_path` (anders leest
hij die tabel mét RLS en geeft altijd `false`).

**Toewijzen raakt precies twee tabellen.** `user_id` komt alleen voor in `profiles` (0004) en
`analyses` (0001); de rest hangt via `analysis_id` mee. Faalt de tweede update, dan wordt de eerste
teruggedraaid: een profiel bij de klant en analyses bij de beheerder is erger dan een mislukte
toewijzing.

**Wachtwoordherstel is een route handler, geen pagina.** Het inwisselen van de herstelcode schrijft
een cookie, wat een Server Component in Next 15 niet mag; dat faalde stil in `lib/supabase/server.ts`.

**R6.2 opgelost op de plek waar hij thuishoort.** Bol leverde 1 pagina op, HEMA 40, en beide keren
degradeerde het rapport zonder melding. Oordeel valt nu in fase 0, gratis. Migratie `0033` vervalt.

**De renderbaarheidstest is de zwaarste bevinding en kost niets.** AI-crawlers voeren geen JavaScript
uit; boven 50% JavaScript-pagina's is dat een blocker, betere content helpt dan niets.

**Van "verzin een onderwerp" naar "kies uit wat je aanbiedt".** De aanbodboom (`profile_offerings`)
is bewust een boom en geen `text[]`: een core topic zit tússen categorie en product. `propose_topics`
kost ~$0,01 en meet bewust niet per voorstel, dat zou 8 × $0,40 zijn vóór iemand ja zegt.

**De enginelaag is bedrading zonder fan-out.** `lib/engines/` en de Gemini-adapter staan er, de
meetsleutel kent de engine (migratie `0041`). Nog níét: uitwaaieren per engine in de planning, want
`computeAggregates` c.s. tellen alle runs ongeacht engine en zouden anders elke vraag dubbel meetellen.

**`dedupe` verhuisde naar een eigen module zonder `server-only`**, twaalf migraties te laat
(conventie 2): één tekenverschil in die sleutels is het verschil tussen een genegeerde dubbele taak en
een tweede betaalde zoekactie.

**Aanvulling, later op 3 augustus.** De LLM-kennisbasislijn met een oordeel dat in code valt, niet
door het model (`baseline-verdict.ts`), de strategiekaart met contextfactoren, en `field-merge.ts` dat
"een mens wint van een model" afdwingbaar maakt (maakt "onderzoek opnieuw" bruikbaar in plaats van
gevaarlijk). Na de RLS-verbreding was `is_staff()` aanroepbaar door `anon` (onschadelijk, altijd
`false`); migratie `0042` zet dat dicht samen met `to authenticated` op 26 stafpolicies.

### 3 augustus 2026, de eerste echte onboarding, en wat hij liet zien

Onboarding 2.0 naar `main`, één keer volledig op productie: Fysi-Unique, fysiotherapiepraktijk
Amersfoort. **7,5 minuut, $0,24 van de $2,15,** acht stappen zonder mislukking.

Wat goed uitkwam: 30 pagina's gecrawld (was 6000 tekens homepage), aanbodboom van 20 knopen mét
tarieven (intake € 59,00, manuele therapie € 57,50, medische fitness € 370,00), diensten alleen op
diepe pagina's (seksuologie, loopanalyse, inloopspreekuur) die het oude onderzoek miste. Acht core
topics, acht concurrenten, zestien technische controles.

**Zes fouten die geen test had kunnen vangen, ze zaten er alle zes tússen.**

1. **De kennistest gaf een vals positief, de ernstigste.** ChatGPT zei letterlijk "zonder plaatsnaam
   kan ik niet zeggen welke organisatie je bedoelt", maar `admitsUnknown()` kende die formulering niet,
   dus `knowsBrand()` gaf `true` omdat de merknaam (uit de vráág) in het antwoord stond. De synthese
   schreef dat over als "ChatGPT kent het bedrijf al". *(Correctie 4 augustus: de fout bereikte de
   klant via de synthesetekst, niet via het profielscherm zoals eerst hier stond, dat paneel werd op
   dat moment niet gerenderd, zie verder.)*
2. **De 19 "feiten" waren 17 paginatitels en 2× de merknaam**, uit de `WebPage`-opmaak (`name`).
   `checkableFacts()` filtert nu paginaniveau-opmaak en de merknaam eruit; bij deze site blijft nul
   over, het eerlijke antwoord.
3. **`service_scope`, `service_regions`, `market_language` bleven leeg.** De oude wizard vroeg ze, de
   nieuwe drie-veldonboarding niet meer. `prompts.ts` zet "LOKAAL bedrijf" alleen bij bereik én regio,
   dus Amersfoort werd tegen de landelijke markt gemeten. Nu in het onderzoeksschema met `'onbekend'`
   als eerste enum-waarde en `resolveScope()` als vangnet ('lokaal' zonder regio wordt `null`).
4. **Alle acht topics hadden een lege `offering_ids`**: de koppeling zocht op `o.name`, het model nam
   de weergavevorm "Ouder › Kind" over.
5. **`profile_field_sources` bleef leeg, bescherming inert.** `PATCH /api/profiles/[id]` zette
   `edited_by_user = true` en niets anders, dus `filterProtectedFields()` kon niets blokkeren en
   "onderzoek opnieuw" zou elke correctie overschrijven, precies waarvoor migratie `0039` bestaat.
6. **Twintig grijze "niet vastgesteld"-chips.** `confidence` stond hard op `null`; nu deterministisch
   via `quote-check.ts` (letterlijk citaat = 1,00, anders 0,50).

**De hermeting diezelfde avond: $0,2463, alle acht groen.** Vier reparaties tekenden zich af
(`service_scope = lokaal`, `service_regions = ["Amersfoort"]`, 22 aanbodknopen op `confidence 1.00`,
acht topics met 2-4 koppelingen, categorievragen nu "in Amersfoort" met FitForum en SMC Amersfoort als
antwoord).

**En de kennistest liet zien dat reparatie 1 te ver ging.** Met werkgebied in de vraag antwoordde het
model raak maar met een hedge ("kan zonder actuele info niet zeggen welke specialisaties..."), en dat
werd als "kent het merk niet" gemeld, vals negatief waar het eerst vals positief was: de reparatie nam
ook losse hedges mee die net zo vaak op een detail slaan als op het merk. De grens ligt bij
**identiteit** ("welk bedrijf" is het tegendeel van kennen; "openingstijden" is een detail voor
`checkFacts()`). Vier antwoorden uit beide rondes staan als testgevallen.

Kostenverdeling: `profile_synthesis` $0,127 (52%), niet de zoekacties, door Sol achter
`SYNTHESIS_PREMIUM`. Budget van $2,15 is geen knellende grens.

### 4 augustus 2026, vijf verbeteringen uit de meetronden

Vrijwel gratis, samen $0,2463 naar ~$0,247.

**1. De nulmeting stelde een vraag en gaf geen antwoord.** "Word je genoemd bij koopvragen?" had geen
antwoord: `askOne()` bouwde alleen een oordeel voor `kent`. Dit blok kost **18% van de $0,2463**, de
op één na duurste post. `scoreCategoryAnswer()` beantwoordt hem nu met `textContainsName()` (nul
kosten), plus welke bekende concurrenten wél genoemd worden. Vroeg om `cleanCompetitorName()`:
`profiles.competitors` mengt kale namen met hele onderbouwingen inclusief markdown-link.

**2. "Kent hij je merk" hing aan één formulering.** "Wat weet je over Fysi-Unique?" faalde, "...úít
Amersfoort?" lukte. Blok kostte $0,0003 voor twee vragen; nu zes formuleringen (~$0,001) met een
verhouding (0/6 t/m 6/6, "wisselend" ertussen) in plaats van ja/nee.

**3. De koopvragen gingen over de generiekste diensten** (`slice(0, 3)` op site-volgorde), terwijl het
marktonderzoek juist bekkenfysiotherapie, zwangerschapsbegeleiding en seksuologie als onderscheidend
noemde. `categoryLeaves()` kiest nu via de topics.

**4. Feiten kwamen alleen uit JSON-LD**, en dat gaf **nul** voor Fysi-Unique, terwijl het
`citeert`-antwoord adres en telefoonnummer letterlijk noemde uit de gecrawlde contactpagina.
`text-facts.ts` oogst nu telefoon/adres/e-mail/KvK met regex, beperkt tot canonieke pagina's en de
meest voorkomende waarde bij gelijkspel niets, anders zou een verkeerd feit ChatGPT's juiste antwoord
als `tegengesproken` markeren.

**5. Topics verloren hun aanbod bij "onderzoek opnieuw"**: `offering_ids` (een `uuid[]` zonder
foreign key) wees na een herhaalronde naar verwijderde rijen. Migratie `0043` bewaart de namen
ernaast, `relinkOfferingIds()` legt de koppeling terug.

Tests: 608 unittests, 42 ketentests, met een ketentest die verwijderen+herbouwen achter elkaar zet.

### 4 augustus 2026, drie panelen die nooit op het scherm stonden

**`OfferingsPanel`, `LlmKnowledgePanel` en `StrategyBox` stonden in de imports en hun data werd
opgehaald, maar geen van de drie werd gerenderd.** De hele opbrengst van blok B, C en D (aanbodboom,
kennistest, strategiekaart) was onzichtbaar; alleen de synthesetekst stond er. `tsc` en `build` bleven
schoon, een ongebruikte import is geen fout. Dit is de **tweede keer** (op 3 augustus stonden
`staleAdviceNotice`, `confidenceLevel`, `describeMerge` in dezelfde toestand): een patroon, dus nu een
regel bij: een paneel telt pas als af als het op de gedeployde pagina teruggezien is.

### 4 augustus 2026, de vier InSpace-optimalisaties

Uit `docs/tasks/inspace-optimalisaties-1-4.md`, nul extra kosten, geen migratie.

**1. Structurele gap-analyse.** Aanbevelingen kwamen alleen uit gemiste meetvragen (30 gesteld, 17
gemist); een klant met twaalf diensten waarvan de meting er vier raakt, hoorde over de andere acht
niets. `structure-gap.ts` vergelijkt `profile_offerings` met `profile_pages`: `eigen_pagina`,
`zwak_gedekt`, `ontbreekt`, met `page-relevance.ts` als matching. Vangnet: een categorie met eigen
kinderen telt niet mee, `kind: "merk"` valt buiten beeld. Geen opslag, landt in de rapportinvoer en
als chip per knoop.

**2. Rijkere schema.org en een zichtbare datum.** `schema-jsonld.ts` kende alleen `FAQPage`/`WebPage`/
`Article`, terwijl de app zelf schemadekking van klanten beoordeelt. `@type` volgt nu het
bedrijfsmodel (`Service`/`CollectionPage`), met `@graph`+organisatie (`sameAs`) en
`datePublished`/`dateModified`. Validatie eist nu een passend type (geen `Recipe` op een
dienstenpagina). Onze datums gaan altijd overheen, ook bij een geldig modelresultaat, en
`withFreshnessLine()` toont de datum ook zichtbaar in de tekst (een assistent citeert de lopende tekst,
niet de JSON-LD).

**3 en 4. Duplicatie en leesbaarheid, in een tweede poort.** `checkQuality()` naast `checkContentGate()`
(voedt `review_notes`/`needs_review`, raakt `geo_score` niet aan, anders wordt de score onvergelijkbaar
tussen maanden). `similarity.ts`: Jaccard op woord-vijf-grammen over alle pagina's van het **profiel**,
drempel 0,35. Leesbaarheid zonder verzonnen Flesch-score (zelfde reden als het verzonnen volumegetal
uit migratie `0017`): vier gemeten grootheden en een concreet verbeterpunt ("5 zinnen langer dan 30
woorden, knip ze").

Tests: 658 unittests, 42 ketentests; de ketentest ving `loadSiblingPages`'s ingebedde join
(`analyses!inner`), die de shim met opzet weigert.

**Verificatie, derde meetronde: $0,2495, zestien aanroepen, acht groen.**

| Wat | Uitkomst |
|---|---|
| Kennistest, zes formuleringen | 6 van de 6 herkend, geen muntworp meer |
| Nulmeting | "genoemd bij 1 van de 3 koopvragen" |
| Wie wél genoemd wordt | SMC Amersfoort, FysioAmersfoort, FyZie, Fysio Atelier, FitForum |
| Koopvragen uit de topics | knie-, nek- en schouderklachten in plaats van generieke diensten |
| `offering_names` | gevuld naast `offering_ids`, overleeft een herbouw |

Tekstfeiten hadden een tweede ronde nodig: `crawlPages` bewaarde 1500 tekens per pagina en het
telefoonnummer viel achter een lang navigatiemenu (oogsten verhuisde naar de crawler); het
telefoonpatroon kende geen haakjes; het adrespatroon eiste de komma vóór de postcode terwijl deze site
"...3822 XE, Amersfoort" schrijft. Na reparatie komt telefoon en adres er correct uit, nagerekend op
productie; twee tekens verschil was het verschil tussen drie feiten en één.

### 4 augustus 2026, UX-ronde op de onboarding

Tien bevindingen tegen `ux-design.md` en Nova's strategie, alle tien uitgevoerd, geen migratie, geen
kosten.

**Geen kop.** Twaalf kaarten, geen `PageHeader`, merknaam pas op plek 9. Nu een gedeelde kop, zoals
`/profielen` al deed.

**Geen hoofdgetal**, terwijl regel 1 van `ux-design.md` dat eist. Drie cijfers (herkenning 6/6, koopvragen
1/3, diensten zonder pagina 2/12) stonden verspreid als chips; nu een statrij met duidingszin
(`onboarding-summary.ts`): "0/3" is voor bijna elk MKB-merk de normale start, en een tegenspraak wint
altijd.

**Volgorde was niet die van het gesprek.** `ProfileGaps` (huiswerk voor de klant) stond op plek 3 vóór
kennistest en aanbod; `AssignBox` (beheerdersactie) op plek 4 tussen bevindingen. Nu vijf blokken in
demovolgorde, beheer onderaan.

**Zeven panelen verdwenen stil bij lege data.** Drie kregen een lege staat met reden en oplosknop, vier
bleven terecht weg.

**Mobiel niet apart ontworpen**, terwijl §7 accordion-dicht voorschrijft. `ProfileSection` klapt nu in
op mobiel, start open.

**Aanbodboom stond volledig uitgeklapt** (22 knopen × vier regels); nu één regel per knoop met
`<details>`.

**Het wachten was twee losse ervaringen**: generiek scherm, dan een stappenlijst die al in de payload
stond; het afrondingsmoment ging ongemarkeerd voorbij. Nu één doorlopende lijst met expliciete
afronding.

**Twee van de vier `ProfileGaps` waren achterhaald** (werkgebied/concurrenten worden nu automatisch
gevuld), vervangen door 'lokaal zonder plaatsnaam' en een ontbrekend bedrijfsmodel.

**Geen volgende stap.** Nu één primaire actie met het hoogst geprioriteerde onderwerp erin ("Meet
'Knieklachten behandelen'").

**Strategiekaart bewust nauwelijks aangeraakt**: bereikbaar via een springlink, herontwerp wacht op
een echt gesprek.

Tests: 675 unittests, 42 ketentests.

### 4 augustus 2026, archiveren in plaats van verwijderen

Zeven testmerken en elf analyses uit beeld maar bewaard. Migratie `0044` zet `archived_at` op
`profiles`/`analyses`.

**Waarom geen `delete`.** Cascades via `prompts`→`tracking_runs`→`tracking_run_mentions` plus
rapporten en content: één `delete from profiles` had **352 metingen en 32 contentpagina's**
weggegooid, niet terug te krijgen zonder opnieuw te betalen.

**Het filter staat op zes plekken, één kost geld**: zonder filter op `/api/cron/tracking` plant de app
elke maand een volledige meetronde (~$0,40) voor een merk dat niemand meer ziet. `lib/archive.ts` is
de ene bron van waarheid, de zes query's gebruiken hem.

**Bewust niet in RLS**: een gearchiveerd merk blijft voor de eigenaar bereikbaar via zijn directe URL,
het is een back-up.

De ketentest zet archiveren, controleren dat data blijft en geen lijst meer telt, en dearchiveren
achter elkaar.
## 15. De strategie, sales-led, naar het model van InSpace Nova (3 augustus 2026)

De bouwrondes hierboven volgen allemaal uit één beslissing die zelf nergens stond opgeschreven. Hier
staat hij, met wat er wél en niet uit overgenomen is.

### Wat er veranderde

Het product was **self-serve**: wie een account maakte, vulde een wizard van vier stappen en elf
velden in en kreeg daarna een analyse. Dat is losgelaten. Het nieuwe model is **sales-led**:

1. De consultant (voorlopig de eigenaar, het enige beheeraccount) zet het merkprofiel klaar vóór het
   demogesprek. Drie velden, ~7,5 minuut pijplijn, ~$0,25.
2. Het **demogesprek** is een schermdeling waarin hij laat zien wat er gevonden is.
3. Erbij hoort **een uur consultancy**, apart gefactureerd, over wat een model niet kan weten: welke
   onderwerpen commercieel tellen, en wat er speelt buiten de website om (een nieuwe site, een
   naamswijziging, een gestopte dienst).
4. Pas ná de verkoop wordt het profiel aan het klantaccount toegewezen.

Geen cosmetische wijziging maar de reden achter vrijwel elke ontwerpkeuze sinds §14: dat de onboarding
van elf velden naar drie ging, dat de pijplijn ~$2 mág kosten, dat het profielscherm een demo-scherm
is en geen formulier, en dat er een superuser bestaat.

### Wat we van InSpace overnemen

| Wat | Hoe het bij ons landt |
|---|---|
| Sales-led met demo en een success manager | De consultant zet klaar, verkoopt en begeleidt (§14, migratie `0038`) |
| Denken in **entiteiten** in plaats van vermeldingen | De kennistest, de naamconsistentiecheck en de `sameAs`-controle vragen "kent een AI-systeem dit als één herkenbaar bedrijf?" |
| **Structuur boven schrijven**, "everyone is building AI that writes blogs" | `structure-gap.ts`: welke diensten missen een eigen pagina, los van wat de meting toevallig vroeg |
| 5–8 **core topics** door een strateeg bepaald | `propose_topics` leidt ze af uit de aanbodboom; de consultant keurt ze goed |
| Volledige schema.org-dekking en een zichtbare `dateModified` | Het `@type` volgt het bedrijfsmodel, met organisatieknoop en datums |

Drie dingen die zij als onderscheidend presenteren hadden wij al: het RAG-anker tegen hallucinatie
(`brand_facts` + de feitenkaart), guardrails vóór generatie (`content-gate.ts`, `validate-claims.ts`)
en answer-first opmaak.

### Wat we bewust NIET overnemen

- **De CMS-koppeling.** Hun moeilijke deel, blijft uitgesteld. Wij leveren publicatieklare content, de
  klant plaatst hem.
- **Echte zoekvolumes.** Hun SEO-verleden. Onze winbaarheidsmeting (`elicit_rate`) is voor dit product
  een beter signaal en bestaat al.
- **Hun prijs.** De onze gaat omhoog, maar blijft er ruim onder.

### Gemini: gebouwd, slapend

Besloten om een tweede engine voor te bereiden zonder dat er een sleutel is: de enginelaag
(`lib/engines/`), de adapter en de idempotentiesleutel mét engine (migratie `0041`) staan er. Zonder
`GEMINI_API_KEY` snijdt `enginesForProfile()` de wens van het profiel met de beschikbare sleutels en
blijft het gedrag ongewijzigd.

Wat er bewust **niet** is: uitwaaieren per engine in de meetplanning. `computeAggregates`,
`measurementIsUsable` en `countOpenPeriodicMeasurements` tellen alle runs van een periode ongeacht
engine; nu per engine inplannen zou elke vraag dubbel laten meetellen in de score. Het stappenplan
staat in `lib/jobs/queue.ts`, bij de plek waar het moet gebeuren.

### Accounts: handmatig, en dat is de bedoeling

Geen uitnodigings-API, geen self-service registratie. De eigenaar maakt een account aan in het
Supabase-dashboard, de app heeft alleen inloggen en wachtwoordherstel nodig. Dat scheelt
half-aangemaakte gebruikers en een e-mailbezorging die de verkoop kan ophouden. De werkwijze staat in
`architecture.md` §11.

Een klant mag alles op zijn eigen profiel, inclusief zelf analyses draaien, behalve profielen van
andere klanten zien. Dat is RLS op `user_id`; de beheerder ziet alles via `staff_users`.
## 16. Documentatie weer op één lijn met de code (4 augustus 2026)

Op 1 augustus is de documentatie geherstructureerd naar progressive disclosure (`b50bdc9`). In de drie
dagen daarna gingen **21 merges** naar `main`, Onboarding 2.0, de vijf verbeterpunten uit de eerste
productieronden, de vier InSpace-optimalisaties, de UX-ronde en het archief. Geen daarvan raakte de
documentatie. Dat is precies hoe een herstructurering ongedaan wordt gemaakt: niet in één klap, maar in
twintig kleine stappen die elk voor zich te klein leken om een MD-bestand voor te openen.

Deze ronde trekt dat recht. Wat er is bijgewerkt en waarom het bij dat bestand hoort:

| Bestand | Wat er niet meer klopte |
|---|---|
| `CLAUDE.md` | 416/25 tests en migraties t/m `0037`; geen woord over sales-led; `lib/engines/` en `lib/archive.ts` ontbraken in de structuur |
| `README.md` | "De keten" beschreef nog de oude wizard; "een tweede LLM-provider" stond bij *niet gebouwd* terwijl de enginelaag er is |
| `docs/architecture.md` | Geen enkele beschrijving van hoe je een klant aanmaakt en koppelt, de vraag die deze week gesteld werd. Nu §11, met de vier stappen en het archief |
| `docs/ux-design.md` | Het profielscherm was herbouwd (kop met drie cijfers, springlinks, `ProfileSection`); zekerheid-als-niveau stond nergens |
| `docs/logbook.md` | Twee secties heetten allebei `## 11`; §1 beweerde nog self-serve |
| `docs/tasks/roadmap.md` | Vijf punten waren af, punt 0 begon met "er is nog geen enkele echte call op GPT-5.6" terwijl er veertig waren |
| `APP_FLOW_DOCUMENTATION.md` | Fase 1 was volledig vervangen; 16 taaksoorten waren er 23 geworden |
| `supabase/README.md` | Was wél bij (`0043`, `0044`), de migratie-index is de enige die het traject heeft overleefd |

`docs/tasks/inspace-optimalisaties-1-4.md` is verwijderd: gebouwd, dus hij hoort in het logboek en niet
in de takenmap. `onboarding-2.0.md` blijft op dit moment nog staan, met bovenaan de reden, de
verificatietabel heeft nog drie open punten die iets vragen wat er niet is (vier profielen voor een
p95, een `GEMINI_API_KEY`, een contentronde). *(Inmiddels, na §14 hierboven, wél verwijderd: de
verificatietabel is afgerond en de bouwspec staat niet meer in de takenmap.)*

**De les, en hij is dezelfde als bij de code.** Conventie: *verandert het gedrag, werk `docs/` bij in
dezelfde commit.* Die stond er al en werd twintig keer overgeslagen omdat een merge naar `main` geen
poort heeft die ernaar vraagt. De migratie-index bleef als enige bij, en dat is geen toeval: die heeft
er wél een, `supabase/README.md` bijwerken staat in de toepasinstructie van elke migratie. Wat de
andere documenten missen is niet discipline maar zo'n haakje.

---

## 27. De app heet ORBIT ENGINE, en schrijft als Nova (5 augustus 2026)

Tot deze ronde heette het product intern én in de UI "GEO Tracker", een omschrijving, geen naam. De
schrijfstijl was op zichzelf goed (informeel, jargonvrij, eerlijk over onzekerheid) maar had geen
vastgelegde bron: elke tekst was los beoordeeld op "is dit duidelijk", nooit op "klinkt dit als ons".

**Wat er is gebeurd.** De marketingsite en het productverhaal van InSpace Nova (inspace.io) zijn
letterlijk uitgelezen en tot een stijlgids teruggebracht: `docs/schrijfstijl.md`, tien richtlijnen met
de brontekst erbij. Daarna is alle UI-copy daarlangs gelegd, schermen, knoppen, foutmeldingen,
tooltips, lege staten, statuslabels, voortgangsteksten, de twee e-mailsjablonen en de foutteksten die
de API-routes teruggeven.

**De vier veranderingen die het meeste doen:**

1. **ORBIT ENGINE is een handelend onderwerp.** Nova schrijft over zichzelf in de derde persoon, *"Nova
   learns your business first"*. Wij dus ook: "ORBIT ENGINE leest je website uit", niet "de website
   wordt uitgelezen". Dat verving tegelijk de institutionele wij-vorm ("wij meten", "wij schrijven"),
   die in een sales-led product ongemakkelijk dubbelzinnig was: bedoelden we de software of de
   consultant? Nu is dat altijd te zien.
2. **Bewijstaal boven beloftetaal.** Nova's kernclaim is *"Measured, not promised"*. Op de drie
   plekken waar de app een uitspraak doet over effect staat nu de meetlat erbij in plaats van een
   bijvoeglijk naamwoord.
3. **"mislukt" is overal "is niet gelukt" geworden**, inclusief de statuschip (`Mislukt` → `Niet
   gelukt`) en 37 API-routes. "Mislukt" is een oordeel over de gebruiker; "niet gelukt" is een
   mededeling over het systeem, en in vrijwel alle gevallen is het ook feitelijk het systeem.
4. **Het thema is begrensd.** Ruimtemetaforen mogen in de naam, in sfeer-eyebrows en in één afsluitende
   regel van een lege staat. Nooit in een knop, een validatietekst of een foutmelding. Nova doet dat
   zelf ook precies zo: de namen zijn kosmisch (Nova, ORBIT ENGINE, Stratosphere, Milky Way), de
   instructies klinisch (*"Benchmark your rivals"*, *"Crawl, speed & structure"*).

**Wat we bewust NIET overnamen.** Nova's `04 Automated publishing` en de CMS-logo's: die koppeling
hebben wij niet, dus belooft de copy hem nergens. En "volledig autonoom", ORBIT ENGINE vraagt bewust om
goedkeuring vóór de meting en vóór publicatie, dus daar staat "ORBIT ENGINE doet het werk, jij zet de
knopen door".

**De code is niet aangeraakt.** Alleen tekstuele content: geen props, geen routes, geen
variabelenamen, geen JSX-structuur. `lib/crawler.ts` houdt zijn `USER_AGENT` (`GEO-Tracker-Bot/1.0`).
Dat is een functionele identificatie waarop site-eigenaren hun robots.txt kunnen hebben afgestemd, en
hernoemen is daar een gedragswijziging, geen copywijziging.

Vier controles groen: `tsc --noEmit`, 675 unittests, 47 ketentests, productiebuild.

---

## 28. Twee leestekens eruit, want ze verraden de schrijver (5 augustus 2026)

Direct na de ORBIT ENGINE-ronde hierboven kwam de scherpste correctie van dit traject, en hij ging niet
over inhoud maar over interpunctie: **het gedachtestreepje en de schuine streep zijn eruit.**

**De reden is commercieel, niet esthetisch.** Een lezer herkent AI-tekst tegenwoordig aan twee tekens:
het kastlijntje (`—`) waar een komma of een punt hoort, en de schuine streep in "en/of" of
"product/dienst". Voor een product dat content schrijft die de klant onder zijn eigen naam publiceert,
is dat geen stijlkwestie maar een productfout. De pagina die ORBIT ENGINE oplevert moet overkomen als
geschreven door het bedrijf zelf.

**Waar het overal zat.** 2.055 plekken, verdeeld over vier lagen die elk een ander gewicht hebben:

| Laag | Aantal | Waarom het telt |
|---|---|---|
| Zichtbare UI-copy | 267 | De klant leest dit |
| AI-promptteksten in `lib/pipeline/` | 130 | **Het model neemt de stijl over in wat het schrijft** |
| Code-commentaar | 1.278 | Het is de schrijfstijl van het project |
| Documentatie (`.md`) | 526 | Idem, en dit wordt gedeeld |

**De belangrijkste laag is de tweede,** en die was bij het opstellen van de opdracht niet in beeld. Een
schrijfprompt met kastlijntjes erin levert content mét kastlijntjes op: de stijl lekt via het model het
product uit, naar precies de pagina's waar het het meest zichtbaar is. Vandaar dat
`lib/pipeline/content.ts` er een negende schrijfregel bij kreeg, naast de acht bestaande regels over
citeerbaarheid: geen gedachtestreepjes, geen schuine streep tussen woorden, splits de zin of gebruik
een komma of dubbele punt. Conventie 1 van dit project blijft gelden (een promptinstructie is een
intentie), maar hier is het vangnet de menselijke eindredactie in de bibliotheek, niet een
codecontrole: een kastlijntje is geen fout die je automatisch mag wegpoetsen zonder de zin te lezen.

**Drie dingen blijven staan, alle drie functioneel:**

1. `publish-check.ts` en `baseline-verdict.ts` bevatten regexes die kastlijntjes juist herkennen en
   normaliseren in binnenkomende tekst. Die weghalen zou gedrag veranderen.
2. Regel 9 van de schrijfprompt moet het teken bij naam noemen om het te kunnen verbieden.
3. Vier testfixtures simuleren externe invoer, waaronder `sanitizeForPostgres("België — €19,90")`, die
   expliciet toetst dát een kastlijntje uit klantdata bewaard blijft.

**Wat de omzetting leerde.** Een blinde vervanging van `—` door `,` levert slecht Nederlands op. In
ongeveer een derde van de gevallen hoorde er een punt te staan, in een zesde een dubbele punt, en op de
definitielijsten (`` `nu` — er wordt iets van de klant verwacht``) altijd een dubbele punt. De aanpak
werd daarom: een regel die de vorm herkent, daarna met de hand langs elke zin die daarna nog krom liep.
Ongeveer zestig zinnen zijn opnieuw geformuleerd in plaats van omgezet.

Richtlijn 10 in `docs/schrijfstijl.md` legt de regel vast, met de drie uitzonderingen en twee
`grep`-commando's om vóór een commit te controleren.

Vier controles groen: `tsc --noEmit`, 675 unittests, 47 ketentests, productiebuild.

## 29. Een kleur heeft een betekenis, geen naam (6 augustus 2026)

**Aanleiding.** De ontleding van de Nova-app (`tasks/nova-analyse.md`) leverde één vondst op die niets
met functies te maken had: hun designtokens heten naar **betekenis**, niet naar kleur.
`--ds-background-intelligence`, `growth`, `information`, `warning`, `danger`. Elk met een eigen
randkleur, een eigen tekstkleur, en een `foreground-on-{betekenis}` die vastlegt welke tekstkleur op
dat vlak mag. De grafiekkleuren wijzen naar diezelfde tokens, inclusief de as en het raster.

**Wat de opruiming blootlegde.** De drift die §3 van `ux-design.md` beschrijft als opgeruimd, was
volledig teruggegroeid: **13 hardgecodeerde hexwaarden en 22 losse `rgba()`-waarden** over de
componenten. Vier van die kleuren kwamen in geen enkel token voor, drie concurrentkleuren in
`trend-chart.tsx` (`#eb6834`, `#1baf7a`, `#2a78d6`) en een vierde paars in `offsite-panel.tsx`. Vijf
componenten bouwden `.chip-danger`, `.chip-warning`, `.chip-success` en `.chip-neutral` met de hand na,
terwijl die klassen al bestonden. De vorige opruiming telde 30 inline-stijlen over 17 bestanden; deze
telde er 35. Het groeit dus terug op precies dezelfde snelheid, en dat is de eigenlijke les: een regel
zonder controle is een voornemen.

**Twee kleuren bleken fout, niet alleen inconsistent.**

1. `--status-info` was `#8511d9`, exact de merkkleur. Een mededeling was daarmee niet te onderscheiden
   van een merkactie. Nu blauw (`#0069a8`), zoals Nova het splitst in `intelligence` en `information`.
2. `--status-warning` was `#b9a27a`, een gedempt brons. Bij Nova is dat de kleur voor *premium*, en als
   tekst op wit haalt het **2,1:1**, ruim onder de drempel van 4,5. Het stond op drie plekken als
   tekstkleur van een waarschuwing. De chips gebruikten allang hun eigen amber (`#8a6100`, ruim boven
   de drempel); die amber is nu de waarheid.

**Wat er staat.** Vijf velden per betekenis (`-solid`, `-on-solid`, `-text`, `-surface`, `-border`),
grafiektokens inclusief `--chart-axis`, `--chart-grid` en `--chart-reference`, randdiktes als schaal,
één schaduwstand, en één doorschijnende paginakleur voor de sticky balken. Die laatste stond op drie
plekken los, met 0,8 en 0,85 door elkaar, op mobiel pal boven elkaar.

**Wat we bewust niet overnamen:** `attention` (roze) en `premium` (brons), want niets in ORBIT ENGINE
betekent dat; de licht- en donkerparen, want er is bewust geen donkere modus; hun negen radii, want vier
volstaan; en hun hexwaarden, want dan wordt ORBIT ENGINE visueel een InSpace-product. De systematiek is
van hen, de kleuren blijven van ons.

**Het vangnet.** Regel 7 in `ux-design.md` met twee `grep`-commando's die vóór een commit nul regels
moeten geven. Zelfde patroon als richtlijn 10 over de gedachtestreepjes (§28): de regel staat in het
document, de controle dwingt hem af. Zonder die tweede helft was dit de derde keer geweest.

Beide controles geven nul. Vier controles groen: `tsc --noEmit`, 675 unittests, 47 ketentests,
productiebuild.

## 30. De vormgeving over op het product van InSpace, niet op hun website (6 augustus 2026)

**De bevinding waar alles op rust.** `designsystem.md` was gebaseerd op de marketingsite `inspace.io`.
Maar InSpace draait een tweede, ingelogde omgeving, `nova.inspace.io`, en die ziet er fundamenteel
anders uit. De website is warm, rond en gloeiend; het product is koel, strak en plat. Wij bouwden de
website na. Wie Nova echt gebruikt, zou ORBIT ENGINE niet als familie herkennen.

Acht verschillen, allemaal nagemeten in hun eigen CSS-bundel:

| | marketingsite | product | ORBIT ENGINE nu |
|---|---|---|---|
| Grondtoon | `#f5f6f3` warm | `#f8fafc` koel | koel |
| Tekst | `#0b0b0c` | `#17212b` | `#17212b` |
| Randen | doorschijnend zwart | echte tint | echte tint |
| Radii | pillen, 18px | 8px en 12px | 8px en 12px |
| Diepte | gekleurde gloed | één platte schaduw | één schaduw |
| Gradient | overal | nul keer | woordmerk |
| Mono | TT Commons | Geist Mono | Geist Mono |
| Achtergrond | lijnenraster | vlak | vlak |

**Wat er is gebeurd.** De volledige tokenset is vervangen: koele neutralen, zeven betekenissen met elk
vijf velden, zes grafiekkleuren gebonden aan die betekenissen, zes radii, drie randdiktes, één
schaduw. Knoppen van 48 naar 40 pixels, velden van grijs verzonken naar wit met een rand, kaartpadding
van 26 naar 20. Vier ambient gloed-cirkels weg, de ringgloed om de primaire knop weg, de hover-lift
weg, het lijnenraster op de body weg. De merk-gradient stond op vier accentwoorden in koppen en staat
nu alleen nog op het woordmerk.

**Eén bewuste afwijking van Nova.** Zij kennen twee paarse standen en gebruiken de lichte (`#9e21fc`)
als solide vlak. Wit daarop haalt **4,0:1** en zakt daarmee onder de drempel van 4,5 voor knoptekst; op
`#8511d9` is het 5,4:1. Bij hen is de lichte stand te verdedigen omdat dezelfde token ook in donkere
modus dienstdoet, wij hebben alleen licht. Dit kwam pas boven water door het scherm echt te bekijken in
plaats van de waarden over te nemen: de knop stond er neon bij.

**Eén bug onderweg gevonden en gerepareerd.** `--accent-purple-soft` was een lichter paars en werd op
vijf plekken als linkkleur gebruikt. In het nieuwe systeem betekent `soft` een vlaktint (`#f3e6ff`),
dus die vijf links waren wit-op-wit geworden. De token heet nu `--accent-purple-surface` en de links
wijzen naar `--intent-intelligence-text`.

**Wat bewust NIET is overgenomen:** de donkere modus (die blijft uit, maar de tokennamen zijn er nu op
ingericht, dus het is een dag werk in plaats van een week), Nova's negen radii, en hun indeling.
Zijbalknavigatie, klantkiezer en toasts zijn IA-wijzigingen, geen vormgeving; ze staan beschreven in
`tasks/nova-analyse.md` en zijn hier niet aangeraakt.

**Wat open blijft.** De zes grafiekkleuren zijn niet opnieuw gevalideerd op kleurenblindheid; de vorige
set haalde ΔE 9,2 en paars naast roze is nu het zwakste paar. Zolang dat niet is nagemeten draagt elke
lijn een naam aan het uiteinde en staat er een tabel onder. En een knop van 40px haalt de mobiele
tikdoel-eis van 44px niet, dus daar is een `.btn-lg` nodig.

**De naronde vond twee bugs die er al stonden.** Een controle op "verwijst elke `var(--...)` naar een
token dat bestaat" leverde er twee op die **nooit** hebben gewerkt: `var(--danger)` op een foutmelding,
die daardoor in gewone tekstkleur stond, en `var(--accent)` op de gevulde balk van de
briefingvoortgang, die daardoor volledig doorzichtig was. Die balk stond dus altijd op leeg, hoeveel
vragen de klant ook had beantwoord. Geen van beide viel op, want een ontbrekende CSS-variabele geeft
geen fout: hij valt stil terug op niets. Die controle staat nu als derde in `designsystem.md` §11,
naast de twee greps op hexwaarden en `rgba()`.

Diezelfde ronde bracht de paginakoppen van 30 naar 24 pixels (de KPI-cijfers blijven groot, dat is het
hoofdgetal uit `ux-design.md` regel 1), zette de uitleg-popover op de ene schaduw in plaats van
Tailwinds `shadow-lg`, en voegde `--radius-2xs` toe zodat de laatste twee losse pixelwaarden ook een
token hebben.

**Geverifieerd.** Vier controles groen: `tsc --noEmit`, 675 unittests, 47 ketentests, productiebuild.
Beide kleurcontroles geven nul. De inlogpagina is met een echte browser bekeken op 1280 bij 900; de
schermen achter de login vragen een database en zijn dus niet lokaal te renderen. Conventie 10 blijft
dus half openstaan tot iemand ingelogd door de app loopt.

## 31. De grote duidelijkheidsronde: statustaal, foutmeldingen, print, en zes andere blokken (7 augustus 2026)

Een lijst van bijna vijftig kleine en middelgrote punten, in blokken A tot en met H, uit een
vergelijking met InSpace Nova. Blok F (verkoop en klantgesprek) is bewust overgeslagen, dat hoort niet
bij de consultant-gedreven verkoopstrategie van dit product (`logbook.md` §15). De rest is in zes
commits doorgevoerd, elk met alle vier controles groen.

**A, duidelijkheid voor de klant.** De belangrijkste toevoeging is `WhoseTurn`
(`lib/analysis-status.ts`/`lib/profile-status.ts`, uitgewerkt in `ux-design.md` §4): een leesbare laag
naast de technische status, "Wacht op jou" of "ORBIT ENGINE is bezig", naar Nova's tweelaags-statustaal.
Verder: elke pagina een eigen tabbladtitel (`generateMetadata` met een titelsjabloon dat vanaf
`analyses/[id]/layout.tsx` naar alle subroutes cascadeert), server- en netwerkfouten apart afgehandeld
op drie plekken waar ze nog door elkaar liepen (`dossier-box.tsx`, `briefing-form.tsx`,
`profile-editor.tsx` toonden bij een weggevallen verbinding de rauwe "Failed to fetch" in plaats van
iets leesbaars), een "0/100" in het rapportprompt vervangen door "onbekend" wanneer er nog geen score
is (conventie 3), de goedkeuringsbalk kondigt nu aan hoeveel vragen de meting gaat stellen vóór je
bevestigt, publiceren vraagt een bevestiging omdat het twee hermetingen in de rij zet, en
optimistische updates (de tracking-schakelaar, prompt-beheer) draaien terug bij een mislukte
server-call in plaats van een staat te tonen die niet is opgeslagen.

**B, vormgeving.** Vijf ontbrekende `loading.tsx`-skeletons. `SectionErrorBoundary` om elk van de vier
hoofdstukken van het dossier: `app/error.tsx` ving al de hele pagina, maar één hoofdstuk dat crasht op
een onverwachte datavorm hoefde de andere drie niet mee te trekken. Een WCAG-contrastberekening over
alle tekst- en intent-tokens (alles haalt AA, `--text-muted` is bewust gereserveerd voor bijzaak en al
zo gedocumenteerd). Een printstijlblad (`.no-print` in `globals.css`): het dossier IS het rapport, er
is geen aparte printpagina, dus verdwijnt de chrome (bovenbalk, hoofdstuk-rail, tabbladen, vaste
actiebalken) en elke knop op papier. Een deelvoorbeeld (`app/opengraph-image.tsx`, `next/og`): een link
naar ORBIT ENGINE in Slack of e-mail toonde tot dan een kale URL. En `.btn-lg` (44px, WCAG 2.5.5) naast
de bestaande 40px-knoppen, toegepast op de vijf knoppen die de ÉNE hoofdactie van hun scherm zijn.

**C, schermen en werkwijzen.** Migratie `0045` bracht `taboo_phrases`, `compliance_notes`, de
auteursvelden en de vier tone-of-voice-schuiven op `profiles`; deze ronde bouwde het formulier ervoor
(twee nieuwe secties in `profile-editor.tsx`, met `FORMALITY`/`ENERGY`/`COMPLEXITY`/`HUMOR`-labels
geëxporteerd uit `tone-sliders.ts` zodat de knoptekst en de promptinstructie nooit uit elkaar kunnen
lopen). De reden achter elke contentversie (`versionReasonOf()`, bestond al, was nog nergens
gekoppeld) staat nu bij de versiegeschiedenis. Een overgeslagen profielvraag verdween voorheen
stilletjes uit de lijst; `fact-requests.tsx` toont die groep nu met een "Overgeslagen"-badge en de
kans om hem alsnog te beantwoorden.

**D, vertrouwen en bewijs.** De zichtbaarheidsscore toonde een getal zonder herkomst. `StandChapter`
haalt nu op welke engines voor deze periode bevraagd zijn (uit `tracking_runs`, dat het al jaren
bijhield) en `ScoreCard` toont "Gemeten op 6 augustus via ChatGPT" naast het cijfer. `engineLabel()`
verhuisde van een lokale kopie in `llm-knowledge-panel.tsx` naar `lib/engines/label.ts`, één bron voor
beide plekken.

**E, techniek en betrouwbaarheid.** "Mijn analyses" en "Merken" sorteerden een mislukte analyse of een
mislukt merkonderzoek ergens middenin de lijst; ze staan nu bovenaan met een rode kaart, en de
sortering kijkt naar `whoseTurn === "jij"` in plaats van alleen `actionRequired`. `JobProgress` kreeg
een `attempts`-veld, zodat het wachtscherm "poging 2 van 4" kan zeggen in plaats van een blanco
belofte. En `runWorker()` logt nu wanneer `reclaim_stuck_jobs` iets terugvordert van een kennelijk
vastgelopen vorige aanroep, dat werd al geteld maar kwam nergens in de logs terecht.

**H, kleine dingen.** Drie eerder gebouwde, nog ongebruikte primitieven (`CopyButton`, `ExternalLink`,
`LastUpdated`) daadwerkelijk ingezet op vijf plekken die zelf `navigator.clipboard` of
`target="_blank"` opnieuw uittypten. En een inhoudsopgave voor lange contentpagina's: `lib/markdown.ts`
kreeg `extractHeadings()`, en `renderMarkdown()` zet sindsdien een `id` op elke kop met hetzelfde
ontdubbelalgoritme, zodat de ankers van de inhoudsopgave en de gerenderde HTML nooit uit de pas kunnen
lopen.

**Geverifieerd.** Van 706 naar 713 unittests over de zes commits heen (H voegde de kop-anker-tests
toe), 47 ketentests, `tsc --noEmit` en de productiebuild groen bij elke commit. De content-editie
hieronder volgde de dag erna, met zijn eigen 22 tests erbovenop.

## 32. De content-editie, en waarom hij niet op Nova's oude editor lijkt (8 augustus 2026)

Nova's HUIDIGE generatie heeft geen rijke contenteditor. De contentpagina daar is een
read/review-oppervlak binnen "Strategy": versiegeschiedenis, een contentvoorbeeld met diff (rood is
oud, groen is nieuw), een kopieerknop, FAQ-blokken, schema, afbeeldingsvergroting, en een gemockte
search preview (`docs/tasks/nova-analyse.md` §1.1). Een écht rijke editor, eigen werkbalk,
chatassistent per pagina, sleepbare kalender, clustervisualisatie, bestond in Nova's vóórganger-product
en is bewust geschrapt bij de herbouw. Letterlijk citaat uit de analyse: "Content Assistant, chat per
pagina | Weg | Duur, moeilijk te sturen, en het maakt de kwaliteitscontrole onbetrouwbaar" en
"Handmatige editor | Weg | Elke handmatige bewerking ondermijnt de garanties van het systeem" (§8).
Conclusie van de analyse: "Alles wat weg is, gaf de klant meer knoppen. Wat is gebleven, geeft hem meer
duidelijkheid."

Die conclusie is precies conventie 1 van dit project. Dus bewust wél gebouwd: een versiediff, een
search preview, FAQ-editing (bestond nergens, ook niet via de API), een "waarom deze
pagina"-contextpaneel, en een Bewerken/Voorbeeld-toggle in `ContentEditor`. Bewust NIET gebouwd: een
chatgebaseerde AI-editing-assistent (zou `checkContentGate()`/`checkTabooWords()` omzeilen), een
sleepbare kalender, een clustervisualisatie, een WYSIWYG-rich-text-library (zou de bestaande, goed
onderbouwde keuze voor markdown-als-brontekst omkeren), multi-user samenwerking, en een verzonnen
"wint deze vraag al"-percentage per doelvraag (conventie 3: onbekend is een betere waarde dan een
verkeerde).

**Twee randgevallen die het scherpst waren.** Ten eerste: `faq_json` bewerken op een FAQ-pagina moet
`schema_jsonld` meebewegen, anders blijft de gestructureerde data die AI-crawlers lezen de oude vraag
tonen. `validateOrRebuildJsonLd()` zet FAQ-items alleen in `mainEntity` als `type === "faq"` (niet
stringmatchen op de opgeslagen JSON-LD-tekst, dat is fragieler dan het typeveld dat er al staat). Ten
tweede: een naïeve rebuild zou de organisatieknoop (`sameAs`) laten verdwijnen als je `organization:
null` meegeeft. De opbouwlogica daarvoor stond alleen inline in `loadContentContext()`; die is nu
`buildSchemaOrg()` plus `loadSchemaOrg()` in `lib/pipeline/content.ts`, gebruikt door zowel de
generatiepijplijn als de PATCH-route, zodat de regel op precies één plek staat.

**Waarom de diff een eigen, lazy route kreeg** in plaats van `body_markdown` aan de bestaande
versiegeschiedenis-query toe te voegen: die query is al bewust smal (`select("id, version, created_at,
is_current, revision_note, edited_by_user")`) zodat één paginaweergave niet de volle tekst van alle
versies meestuurt. "Bekijk verschil" is een opt-in handeling, de kosten (de LCS-diff over twee teksten
van 800 tot 1500 woorden) vallen nu pas op het moment dat erom gevraagd wordt.

**Geen tabbladen.** De contentdetailpagina blijft één doorlopende scroll, zoals het dossier
(`docs/ux-design.md` §5). Wat veranderde is de volgorde: context (`WhyThisPage`) → wat er nu staat
(`SearchPreview`, artikel, FAQ) → kwaliteitscontrole → bewerken → geschiedenis/vergelijken →
publiceren.

**Geverifieerd.** Vier controles groen: `tsc --noEmit`, 735 unittests (22 nieuwe: `slugFrom`/
`suggestedPath`/`resolvedContentUrl`, `diffContent` inclusief de terugval naar alineaniveau, en
`FaqEdit`), 47 ketentests, productiebuild.

---

## Vijf bevindingen uit het eerste echte doorloop op een telefoon (10 augustus 2026)

De eigenaar liep de app voor het eerst helemaal door op een iPhone, met een echte klant erin (Van den
Udenhout). Vijf bevindingen, en ze hangen samen: vier van de vijf gaan over hetzelfde scherm, het
merkdossier.

**1. De pagina was breder dan het toestel.** Niet één kapotte kaart maar één soort inhoud: strings
zonder spatie die niet mogen afbreken. ORBIT ENGINE rendert die op ~15 plekken (URL's, slugs, domeinen).
Een occasion-URL van 100 tekens is bij 14px ongeveer 840px breed en staat in een kaart die op een
telefoon 302px krijgt: 538px hangt buiten beeld. Opgelost met vier regels, van vangnet tot slot op de
deur, uitgeschreven in `docs/ux-design.md` §7. Nagemeten met Playwright op 320/390/430px:
`documentElement.scrollWidth` is nu gelijk aan de viewport, en de sticky balken blijven plakken (dat
laatste is de reden dat `overflow-x: hidden` op `html` staat en niet op `body`).

**2. De drie kerncijfers "sloegen nergens op".** Letterlijk de reactie, en terecht. Er stond `6/6`,
`2/3` en `1`. De 6 was het aantal formuleringen waarin we naar het merk vroegen, de 3 het aantal
koopvragen, en de 1 was geen verhouding maar een aantal diensten. Drie eenheden in dezelfde vorm, geen
enkele benoemd. Nu is het label een hele vraag, staat de noemer ín de waarde (`1/15`) en legt een
`explain`-veld achter een vraagteken uit wat er geteld is. Dat "koopvraag" betekent: een vraag waar je
merknaam níet in voorkomt, stond nergens, terwijl dat de hele clou is.

**3. De uitvraag zat verstopt.** Op twee plekken, allebei onder de vouw: de vragen mét invoerveld op
plek 7 binnen "Profielgegevens", de open punten op plek 5 binnen "Het gesprek". Voor de gebruiker is
dat één ding. Samengevoegd tot `OpenQuestions` op plek 3, met de teller in de kop.

**4. Niemand kon zien wanneer het onderzoek klaar was.** Dit was de scherpste van de vijf, want het is
een ontwerpfout die uit een bewuste keuze volgde: het profiel gaat op status `klaar` na taak 2 van 8,
zodat de klant niet op de aanbodboom hoeft te wachten. Daardoor betekende "klaar" voor de consultant
niets, en was er geen enkel moment waarop de app zei: dit dossier is af, je kunt het delen. Twee dingen
gebouwd:

- **Broodroostermeldingen** (`components/toast.tsx`). De app kende alleen kaarten in de pagina, en die
  werken voor een uitslag maar niet voor een gebeurtenis. Vorm en timing komen uit de gecompileerde
  CSS van nova.inspace.io: 0,15s in, 0,12s uit, en een streepje dat leegloopt over de levensduur. Dat
  streepje is het detail dat het af maakt, het zegt "deze melding gaat vanzelf weg" zonder één woord
  uitleg.
- **`assessReadiness()`** (`lib/pipeline/profile-readiness.ts`), Nova's "Review & launch" toegepast:
  zes verplichte onderdelen met een stand per regel, en één zin die zegt of je het scherm kunt delen.
  De belangrijkste ontwerpkeuze zit in wat *niet* blokkeert: openstaande feitvragen tellen wel mee als
  open punt maar niet als tekortkoming. Zonder dat onderscheid staat elk profiel eeuwig op 90% omdat
  de klant drie vragen niet invulde, en dan betekent het balkje niets meer.

**5. Het merkdossier was overweldigend.** Acht blokken, alle acht altijd open, samen meters scroll.
Twee ingrepen: elk blok heeft nu een omschrijving onder de titel (Nova geeft élk blok een `title` én
een `description`, het goedkoopste middel tegen "overweldigend"), en blokken zijn gesplitst in
`verhaal` (open, wat de consultant laat zien) en `naslag` (overal dicht: techniek, profielgegevens,
beheer). Dat haalt ruim de helft van de paginahoogte weg zonder één functie te kosten.

**De bron voor de Nova-patronen.** Nova's berichtenbestand blijkt volledig in de HTML van de
inlogpagina te zitten: `next-intl` zet de messages in de RSC-payload, en dat is de complete catalogus
van tien namespaces, inclusief schermen waar je alleen ná inloggen komt. Uitgepakt naar
`docs/nova-i18n.json`. Dat bestand is de feitelijke basis onder `docs/Nova.md`.

**Geverifieerd.** Vier controles groen: `tsc --noEmit`, 755 unittests (20 nieuwe: de aangepaste
kerncijfers inclusief hun `explain`, en `assessReadiness`/`readinessHeadline` met de vier gevallen
compleet/open-punten/loopt/kapot), 47 ketentests, productiebuild.

## De richting vastgelegd: Nova gereconstrueerd, vier besluiten, acht fases (10 augustus 2026)

Aansluitend op de vijf bevindingen hierboven: `docs/Nova.md`. De aanleiding was de vraag om Nova niet
alleen te vergelijken maar te **reconstrueren**, en er een bouwplan uit te trekken.

**Wat er nieuw bij kwam ten opzichte van de analyse van 6 augustus.** Die analyse
(`docs/tasks/nova-analyse.md`) had de functiematrix van bèide InSpace-apps al in kaart en blijft de
diepe inventaris. Wat ontbrak was een besluit. Dat is er nu, en het zijn er vier:

| Besluit | Keuze | Gevolg |
|---|---|---|
| Navigatie | Merk-werkruimte | Alle routes gaan onder een merk hangen |
| Gebruiker | Klantportaal plus admin | Rollen, uitnodigingen, RLS per account |
| Contentplan | Twaalfmaandsplan als kernobject | Vier nieuwe tabellen, een nieuw jobtype |
| Meten | AI-zichtbaarheid plus Search Console | De koppeling uit `zoekdata-koppeling.md` |

Buiten scope op verzoek: een directe CMS-koppeling. Publiceren blijft handmatig met "markeer als
geplaatst", wat overigens ook Nova's eigen terugvalpad is (`runningStatus.waitingInYourCms`).

**De spanning die dit document moest oplossen.** De analyse van 6 augustus eindigde met een
waarschuwing: "de verleiding is een lijst van veertig functies, de les uit hun eigen herbouw is dat er
hooguit tien overleven". Het plan dat er nu ligt beslaat 51 dagen, en dat lijkt daar recht tegenin te
gaan. De verzoening staat bovenaan §7: de acht fases voegen bijna geen functies toe maar
**structuur**. Een merk-werkruimte is geen knop, het is de plek waar de bestaande knoppen eindelijk bij
elkaar staan. Van de zes dingen die InSpace in hun herbouw liet vallen staat er geen enkele in het
plan; ze staan in §9.1 met de reden erbij, zodat ze er ook niet via een omweg alsnog in komen.

**Twee correcties op mijn eerste versie van dat document**, allebei gevonden door de eigen map tegen
te lezen in plaats van alleen de bron:

- Ik schreef dat ORBIT ENGINE Nova's tweelaags-statustaal miste. Onjuist: `lib/analysis-status.ts`
  heeft `WhoseTurn` al sinds 7 augustus, en ontleende die toen aan dezelfde bron. Wat wél mist is de
  derde laag (`runningDate`, "Publishes once approved"), en die telt pas als er een plan met toekomstige
  publicatiedata is. Verplaatst naar fase 4.
- Ik zette "quota per maand" als openstaande vraag. Die was al beantwoord: de prijspagina van
  inspace.io noemt 10, 20 en 40 pagina's per maand. `pages_per_month` is dus een eigenschap van het
  abonnement, geen vrij veld.

**De vondst die het document draagt.** Nova gebruikt `next-intl`, en dat zet de volledige
berichtencatalogus in de RSC-payload van de inlogpagina, dus vóór authenticatie. Tien namespaces, ~900
sleutels, uitgepakt naar `docs/nova-i18n.json`. Daarmee is elk scherm, elk invoerveld, elke status,
elke foutmelding en elke bevestigingsdialoog letterlijk bekend, inclusief schermen waar je alleen ná
inloggen komt. Wat er níet in zit staat als openstaande analyse in §10, met per vraag welke fase erdoor
geblokkeerd wordt. De belangrijkste twee gaan over fase 4: hoe er uit de admin-invoer twaalf maanden
pagina's rollen, en hoe de bufferlogica werkt.

**Volgorde.** Fundament, merk-werkruimte, rollen, onboarding-wizard, contentplan, Search Console, de
lus sluiten, i18n en donkere modus, CSM-paneel. Moet je kiezen, doe dan fase 1, 4 en 6: dat zijn
precies de drie die van een meetinstrument een programma maken.

## De strategie uitgepakt, en twee vondsten die het plan raken (10 augustus 2026, tweede ronde)

`docs/Nova.md` §11 en §12. Doel was de vier vragen die het bouwplan blokkeerden. Drie nieuwe bronnen:
de i18n van de oudere `app.inspace.io` (1.469 sleutels, 21 namespaces, dezelfde truc als bij Nova), de
marketingsite en de prijspagina.

**Vier van de zes openstaande vragen zijn beantwoord.** De belangrijkste: hoe er een jaarplan ontstaat.
De oudere app is expliciet waar Nova zwijgt. `creation.subscriptionPlan` ("Subscription plan 0{plan} ·
{count} items per month") bewijst dat de quota uit het **abonnement** komt; `strategy.monthOfTotal`
("You are in contract month {current} of {total}") dat de twaalf maanden de **contractduur** zijn; en
`strategy.annualPlan` plus de vier paginatypen dat het jaarplan een **verdeling van paginatypen met
aantallen** is, geen lijst URL's. Een agent stelt het op, de strategie is geversioneerd, en purgen laat
geplaatste en goedgekeurde content staan.

Gevolg voor ORBIT ENGINE: `propose_topics` kan hierop worden uitgebouwd, er hoeft geen nieuwe zware
pijplijnstap te komen. Wat erbij moet is de verdeling over maanden, paginatypen en funnelfasen met de
quota als randvoorwaarde, en dat is rekenwerk, dus een pure module (conventie 2).

Ook opgelost: "Nova insights" bestaat echt, maar het is **één zin** met een vervolgstap ("Finishing
the Bankencollectie funnel unlocks your first fully-ranked topic cluster"). Fase 6 gaat daardoor van 6
naar 4 dagen. En "domein" is inderdaad een niveau ónder "klant", dus `profiles` moet in tweeën: account
en merk.

**Twee vondsten die verder reiken dan het plan.**

**1. InSpace brengt zelf een product uit dat ORBIT ENGINE heet.** In hun productmenu staat "Nova"
(live) en "ORBIT ENGINE, Binnenkort beschikbaar", met als omschrijving "Een nieuwe manier om te groeien
voorbij zoekmachines" en een pre-registratieknop. Dezelfde naam, dezelfde categorie. §12.1 zet de drie
opties op een rij met een advies (wijzigen, en snel, niet omdat je ongelijk hebt maar omdat je dat
gevecht niet wint van een partij met 400 klanten en negen openstaande vacatures). Besluit ligt bij de
eigenaar; zolang het niet genomen is verandert er niets aan de code.

**2. Nova meet geen AI-zichtbaarheid.** Nul treffers op `citation`, `chatgpt`, `perplexity`, `llm` en
`mention` over 2.447 interfaceteksten van beide apps. De enige "geo"-treffers gaan over geografische
identiteit, niet over Generative Engine Optimization. De "AI-citaties 312" op hun website hoort bij het
product dat nog moet komen.

Dat tweede is de strategisch belangrijkste zin van dit hele onderzoek: **ORBIT ENGINE levert vandaag
wat InSpace pas belooft.** Het gat zit niet in de meetkant, daar loopt ORBIT ENGINE vóór, maar in het
programma, het plan en het portaal eromheen. Dat maakt het advies uit §7 sterker, niet zwakker: doe
fase 1, 4 en 6, want dat is de structuur rond een motor die al draait.

Als bijvangst is jouw eigen structuurschets thuisgebracht: Brand Intelligence, buyer persona's,
klantreis, zoekwoordclusters en "SEO + GEO gaps" staan niet in de i18n maar in één visueel blok op de
marketingsite. Het is dus hun belofte, niet aantoonbaar hun app. Wat ervan overgenomen hoort te worden
is de gedachte dat het merkbrein **telbaar** is ("238 zoekopdrachten in kaart, 91 gaten"), en die
getallen heeft ORBIT ENGINE al.

## Dertien besluiten, en het plan opnieuw doorgerekend (10 augustus 2026, derde ronde)

De eigenaar beantwoordde de dertien openstaande vragen. `docs/Nova.md` §0 heeft ze nu allemaal als
besluitentabel, §13 is nieuw (de complete veldenlijst van de onboarding) en §8 is opnieuw
doorgerekend. Totaal ging van 51 naar **47 dagen**, en de volgorde is veranderd.

**Twee antwoorden hadden een groter gevolg dan ze op het oog lijken.**

*Doorlopend opzegbaar* (in plaats van een contract van twaalf maanden) sloopt Nova's belangrijkste
retentiemiddel. Bij hen staat overal "contract month {current} of {total}": de klant zit vast en het
scherm herinnert hem daaraan. Hier kan hij morgen weg. Het plan blijft twaalf maanden vooruitkijken,
want een programma zonder horizon is geen programma, maar de teller heet nu "maand 4 sinds de start"
en nergens staat hoeveel er nog te gaan is. In ruil daarvoor wordt het opbrengstblok ("actief sinds",
"zoveel vaker genoemd sinds de start") van een extraatje het middel dat opzeggen tegenhoudt. Het
verhuisde daarom naar fase 5, en fase 5 kreeg een streepje in het keuze-advies.

*Meerdere websites per klant, plus bureaus, plus twintig klanten in jaar één* maakt de opsplitsing van
`profiles` verplicht in plaats van netjes. Eén platte tabel is nu tegelijk het account en de website.
Dat wordt `accounts` en `brands`, elke `profile_id` wordt een `brand_id`, en dat raakt vrijwel elke
query in `lib/`. Fase 1 ging daardoor van 5 naar 7 dagen en is nu de fase met het hoogste risico. Het
CSM-paneel schoof van plek negen naar plek zes: twintig klanten met meerdere websites houd je niet meer
met SQL bij.

**De veldenlijst (§13) is de winst van deze ronde.** Beide i18n-bestanden uitgekamd op wat InSpace in
de onboarding uitvraagt: ongeveer veertig velden. Naast ORBIT ENGINE's `profiles`-kolommen gelegd
blijkt: veertien heeft ORBIT ENGINE al (de ronde van 7 augustus met migratie `0045` leverde de
tone-of-voice-schuiven, verboden woorden en auteursvelden), elf kan de pijplijn zelf afleiden, elf moet
de klant typen, en vier vervallen (taalkeuze, CMS, auteurspagina, Google Analytics).

Dat laatste getal is het punt: **de klant hoeft er elf in te typen en dat zijn precies de elf die
niemand kan raden**, bedrijfsgegevens en facturatie. De rest staat vooringevuld met het label "uit je
website gehaald" en is corrigeerbaar. InSpace laat de klant twintig minuten uittrekken
(`landingTimeNote`); ORBIT ENGINE kan het in vier stappen omdat het onderzoek vóór de onboarding draait
in plaats van erna. Fase 3 ging daardoor van 8 naar 7 dagen.

Kleinere uitkomsten: één tone-of-voice-schuif ontbreekt nog (`tone_emotional`, vier standen), de
aanspreekvorm van de klant moet een eigen veld worden (ORBIT ENGINE's eigen "je en jij" uit
`schrijfstijl.md` geldt voor de interface, niet voor wat ORBIT ENGINE vóór een advocatenkantoor
schrijft), en alleen Nederlands (besluit 13) laat `next-intl` vervallen, waardoor fase 7 van 5 naar 2
dagen krimpt.

**De naam blijft ORBIT ENGINE.** Het advies was wijzigen omdat InSpace een gelijknamig product
aankondigt; de eigenaar weegt dat anders en kiest houden. Vastgelegd in §12.1 als genomen besluit, niet
als open punt. Wat wel blijft staan als schrijfregel: de eerste vermelding van ORBIT ENGINE zegt altijd
wát het meet, niet alleen hoe het heet.

**Drie laatste besluiten (10 augustus 2026), waarmee het plan compleet is.** Bij opzeggen blijft de
toegang staan tot het einde van de betaalde maand en wordt de opbrengst nog één keer getoond: een
account krijgt een `opgezegd_per`-datum in plaats van dat er iets verwijderd wordt, een uitbreiding van
het patroon dat `lib/archive.ts` al voor merken hanteert. Bij een bureau keurt het bureau goed, want
dat is de contractpartij; doorzetten naar de eindklant is later een uitbreiding.

En er zijn nog geen prijzen per pakket. Dat heeft één concreet gevolg voor de bouw: het opbrengstblok
rekent in aantallen ("340 extra bezoekers, 3 keer vaker genoemd") en niet in geld. Minder overtuigend,
maar eerlijk, en het is conventie 3. Om te voorkomen dat dit later een verbouwing wordt, krijgt de
rekenkant nu al de waarde per bezoeker als **optionele** parameter: `null` toont aantallen, een bedrag
toont geld, en er hoeft geen scherm om zodra de prijzen bekend zijn. Tien minuten nu tegen een dag
later.

## Fase 1 begonnen: de accountlaag staat (10 augustus 2026)

Migratie `0046_accounts`, toegepast op productie en nageteld. `accounts` (de klant of het bureau, met
facturatie, pakket en opzegdatum), `account_users` (koppeltabel met rol) en `profiles.account_id`.
Backfill: elke bestaande eigenaar werd één account met al zijn merken erin, want wie nu onder dezelfde
`user_id` staat hoorde ook bij elkaar. Uitkomst: 1 account, 9 merken gekoppeld, 0 wezen.

**Afgeweken van het eigen plan, en dat is de belangrijkste beslissing van deze ronde.** `docs/Nova.md`
schreef voor dat `profiles` hernoemd zou worden naar `brands`. Bij het natellen bleek dat vijftien
tabellen een `profile_id` dragen, dat alle RLS-regels eraan hangen en dat de code er op ~500 plekken
naar verwijst. Die hernoeming levert nul functionaliteit op: `profiles` ís het merk al (één website,
één dossier, één set metingen) en `lib/nav.ts` zegt in de interface allang "Merken". Wat écht ontbrak
was de laag eróven. Die is er nu, `profiles` bleef staan, en daarmee ging fase 1 van de risicovolste
fase naar een additieve.

**De toegangsregel is drielaags geworden** (`getOwnedProfile`): eerst het account, dan de historische
eigenaar (`profiles.user_id`), dan de beheerder (`isStaff`). Elke laag is een aparte vraag met een eigen
`return`, nooit één samengestelde voorwaarde, want dit is samen met `getOwnedAnalysis` de enige poort
tussen een verzoek en andermans data. Laag 2 blijft bewust bestaan zolang niet is nageteld dat élk merk
een account heeft; hem meteen weghalen zou betekenen dat de backfill foutloos moest zijn vóórdat er
iemand inlogt, precies het soort aanname waar dit project vangnetten tegen bouwt. Op RLS-niveau
hetzelfde: de twee bestaande policies bleven staan en er kwam er één bij (policies zijn een OR van
elkaar, de verruiming kon niets breken).

`isActiveAccount()` en `monthsSinceStart()` staan in `lib/account-status.ts` en niet in
`lib/accounts.ts`: die laatste heeft `server-only` en dan is de rekenkunde niet te testen vanuit
`scripts/test-unit.ts` (conventie 2). Dat bleek meteen, want de eerste versie stond op de verkeerde
plek en de testrunner viel erover.

`monthsSinceStart` draagt besluit 7: doorlopend opzegbaar, dus geen "contractmaand 4 van 12" zoals
Nova, maar "maand 4 sinds de start". Een teller die zegt hoeveel je nog tegoed hebt suggereert een
contract dat er niet is.

Vier controles groen: `tsc`, 766 unittests (11 nieuwe), 47 ketentests, productiebuild.

**De werkruimte zelf, aansluitend op de accountlaag (10 augustus 2026).** De bovenbalk is een zijbalk
geworden. Aanleiding is besluit 1: zodra de app over één merk tegelijk gaat, komen er twee soorten
navigatie naast elkaar te staan, wat over dít merk gaat en wat over de app gaat. Horizontaal is dat
onderscheid niet te maken zonder scheidingstekens die niets betekenen; verticaal is het één
tussenkopje.

Drie keuzes die het vermelden waard zijn. **De kiezer verdwijnt bij één merk**: dan staat de naam er
als tekst, want een kiezer met één optie belooft een keuze die er niet is, dezelfde redenering waarmee
`lib/nav.ts` eerder al twee dubbele menu-items opruimde, en Nova doet het ook zo. **Het zoekveld
verschijnt pas vanaf acht merken**, daaronder is het ruis. **De routes zijn niet verhuisd**:
`/profielen/[id]` blijft waar het staat, want er zijn bladwijzers en gedeelde demolinks, en een
werkruimte is context en geen ander adres. `/analyses?merk=` filtert de lijst met een zichtbare chip en
een uitweg terug, want een lijst die stilletjes korter is dan je verwacht leest als data die weg is.

De cookie `orbit_engine_merk` is een voorkeur, nooit een recht: `listBrands()` controleert bij elke
aanroep opnieuw of de gebruiker bij dat merk mag, en de echte poort blijft `getOwnedProfile()`. Een
geplakte cookie levert dus niets op, hij zet hooguit de kiezer in een vreemde staat, en daarom valt
`selectBrand()` stil terug op de merkenlijst als het merk niet klopt.

Nagemeten met Playwright op 390 en 1280: geen horizontale overflow, nul uitstekende elementen, en de
sticky balken blijven plakken. De zijbalk heeft vaste breedtes (240px, ingeklapt 64px) omdat een balk
die meegroeit met de langste merknaam de pagina laat verspringen bij elke wissel.

## Fase 2: uitnodigingen, de enige deur naar binnen (10 augustus 2026)

Migratie `0047_uitnodigingen`, toegepast en geverifieerd op productie. Registreren stond al dicht
(`signupsEnabled` in `lib/config.ts`), maar daarmee was er ook geen wég naar binnen behalve met de
hand een gebruiker aanmaken in Supabase. Besluit 2 maakt dat een blokkade: de klant logt zelf in en
keurt goed.

**Vier eindtoestanden, vier schermen.** Nova heeft er precies deze vier (`onboarding.activation`):
"deze link is verlopen, vraag een nieuwe" is een heel ander bericht dan "je account is al actief, log
gewoon in", en met één generieke foutmelding belt de klant. De volgorde in `inviteState()` is bewust:
**ingetrokken wint van verlopen, en verlopen wint van gebruikt**. Een ingetrokken link mag nooit als
"al gebruikt" lezen, anders denkt de ontvanger dat hij een account heeft en gaat hij een wachtwoord
resetten dat niet bestaat.

**Het token staat niet in de database, alleen zijn SHA-256.** Wie de database kan lezen mag geen
geldige uitnodigingslinks kunnen maken; opzoeken gaat op de hash, het ruwe token bestaat precies één
keer, op het moment van aanmaken. Gevolg: de link verschijnt één keer met de waarschuwing dat hij niet
opnieuw te tonen is, geen beperking maar het ontwerp.

**`account_invites` heeft nul RLS-policies**, net als `jobs`: een tabel die alleen de server leest
geeft de client ook geen leesrecht. Nageteld op productie: RLS aan, nul policies, terwijl `accounts`
en `account_users` er elk twee hebben.

**Twee veiligheidskeuzes die uitleg verdienen.** Een uitnodiging voor een adres dat al een gebruiker
heeft, maakt géén nieuw wachtwoord: dat lijkt onvriendelijk maar is de enige veilige variant, anders
is een uitnodiging een overnameroute (wie een adres kent, nodigt uit en zet er een nieuw wachtwoord
op). Bij een bureau (besluit 9) is dat geval normaal, dezelfde persoon bij een tweede klant, dan komt
er alleen een lidmaatschap bij. En de uitnodiging wordt pas afgevinkt nádat het lidmaatschap er staat:
andersom zou een storing halverwege een verbruikte link zonder toegang opleveren, niet te herstellen
zonder nieuwe uitnodiging.

**Uitnodigen mag alleen een `admin` van het account of een beheerder van ORBIT ENGINE** (`mayInvite`).
Een `member` kan meekijken en goedkeuren maar de kring niet uitbreiden; bij een bureau het verschil
tussen een collega en de contractpartij.

De wachtwoordregels zijn die van Nova (`rule8`, `ruleNumber`, `ruleUppercase`), vinken live af tijdens
het typen, in `lib/invite-rules.ts` zónder `server-only` zodat browser en server dezelfde functie
draaien: een client die iets goedkeurt wat de server weigert is de ergste variant van dat scherm.

Geen uitnodigingsmail: `EMAILS_ENABLED` staat uit, de eerste klanten komen via een demogesprek. De
link komt op het scherm met een kopieerknop, niet de armoedige variant maar de betrouwbare, werkt ook
als de mail in een spamfilter blijft hangen.

Vier controles groen: `tsc`, 788 unittests (22 nieuwe), 47 ketentests, productiebuild. Op productie
geverifieerd dat de opzoekquery de rij op hash vindt inclusief accountnaam, en dat de vier
eindtoestanden zich gedragen zoals de unittests beschrijven; de testrijen zijn na afloop verwijderd.

**Uitnodigingen beheren, en de grens tussen klant en consultant (10 augustus 2026).** Twee afrondingen
op fase 2.

Openstaande uitnodigingen staan nu op het instellingenscherm met een knop om ze in te trekken.
Intrekken en niet verwijderen (conventie 8): "deze link werkte ooit en is toen ingetrokken" is
navraagbaar, een verwijderde rij niet. Verlopen uitnodigingen blijven om dezelfde reden staan. De
route heet `/revoke` en geen DELETE, want die methode belooft iets anders. `eq("account_id")` naast
`eq("id")` in de update is de echte controle: zonder die regel zou een beheerder van account A een
uitnodiging van account B kunnen intrekken door het id te raden.

**De klantweergave is gegrond in Nova's eigen berichtenbestand, niet in een aanname.** Een Nova-klant
ziet vier bestemmingen (Overview, Strategy, Analytics, Account). Alles wat de CSM óver een klant
vastlegt zit in de aparte `admin`-namespace, inclusief `admin.onboardingProfile`; geen sleutel geeft
een klant toegang tot de notities van zijn CSM.

Toegepast: **"Het gesprek" is nu afgeschermd op `isStaff()`.** Dat blok bevat aantekeningen óver de
klant, niet vóór hem: wat er speelt, wat gevoelig ligt, welke contextfactoren het advies kleuren. De
rest van het dossier (nulmeting, aanbod, onderwerpen) blijft voor allebei zichtbaar, dat is wat de
klant komt halen.

De grens loopt langs `isStaff()`, niet langs de accountrol: ORBIT ENGINE's eigen team tegenover
iedereen daarbuiten, want een accountbeheerder bij een bureau is nog steeds een klant. Het afgeschermde
blok haalt ook zijn springlink weg, een link naar een blok dat er niet is is zichtbaarder dan het blok
zelf.
## Fase 3: het merkprofiel, dertig velden die de klant nakijkt in plaats van invult (10 augustus 2026)

Migratie `0048_merkprofiel_compleet`, toegepast en geverifieerd op productie, plus een wizard van vijf
stappen op `/profielen/[id]/merkprofiel`.

**Dertien nieuwe velden, en dat is minder dan Nova er uitvraagt.** De inventaris in `docs/Nova.md` §13
legde hun ~40 onboardingvelden naast ORBIT ENGINE's kolommen. Veertien had ORBIT ENGINE al, elf kan de
pijplijn afleiden, vier vervielen (taalkeuze, CMS, auteurspagina, Google Analytics). Wat overbleef
zijn deze dertien. Alles wat al een eigenaar had is er bewust níet nóg een keer bijgezet: `value_props`
ís Nova's "value pillars", `intake_audience` ís de primaire doelgroep, `industry` ís de kerncategorie.
Eén feit heeft één eigenaar, en een tweede kolom met dezelfde betekenis is een kolom die gaat afwijken.
De volledige vertaaltabel staat bovenaan de migratie.

**Het scherm vraagt niets, het laat nakijken.** Dat is het verschil met Nova, en het volgt uit iets dat
ORBIT ENGINE al had: het onderzoek draait hier vóór de kennismaking in plaats van erna. Nova laat hun
klant twintig minuten uittrekken (`landingTimeNote`) voor dertig lege velden. Hier staat het merendeel
al ingevuld, met het label **"uit je website gehaald"** erbij, Nova's `draftedBadge`. De gegevens
daarvoor lagen er al in `profile_field_sources` (migratie 0039); dit is de eerste plek waar ze
zichtbaar worden voor de klant. Een leeg veld dat de pijplijn niet kán vinden krijgt "vul jij in" in
plaats van "niets gevonden": dat verschil is het verschil tussen een tekortkoming van de app en een
vraag aan de klant.

**De schuiven zijn knoppen geworden, geen schuifbalken.** Nova benoemt elke stand (`formality1` tot
`formality3`), en dan is een rij knoppen eerlijker dan een balk: je kiest een woord, geen positie. De
vijfde schuif, de emotionele lading, is de enige met vier standen, net als bij hen.

**Eén veld dat Nova niet heeft en wij wel nodig hadden: de aanspreekvorm.** `docs/schrijfstijl.md`
legt "je en jij" vast, maar dat is een keuze over ORBIT ENGINE's eigen interface. Wat ORBIT ENGINE vóór
een advocatenkantoor schrijft hoort "u" te zeggen. Die twee vielen samen zolang er één regel was; nu
staan ze los.

**⚠️ De verificatie ving een echte bug.** Na het bouwen zijn de 27 wizardsleutels tweemaal nagelopen:
tegen de kolommen op productie (alle 27 bestaan) en tegen de lijst van bewerkbare velden in de
PATCH-route. Daar zat er één niet in: `proof_points`. De route negeerde dat veld dan zonder fout, dus
de klant vulde zijn bewijspunten in, kreeg "opgeslagen" te zien, en de waarde was weg. Twee lijsten die
hetzelfde moeten zeggen is een intentie; de lijst is nu één gedeelde module
(`lib/profile-editable.ts`) met een unittest die controleert dat élk wizardveld erin staat. Conventie
1, en dit is precies waarom die conventie bestaat.

Vier controles groen: `tsc`, 810 unittests (24 nieuwe), 47 ketentests, productiebuild. Nagemeten met
Playwright op 390 en 1280: geen horizontale overflow.

## Fase 4 begonnen: het contentplan als kernobject (10 augustus 2026)

Migratie `0049_contentplan`, toegepast en geverifieerd op productie, plus twee pure modules met 35
nieuwe tests. Fundament onder besluit 3: twaalf maanden vooruit, pagina's per maand, goedkeuring per
maand.

**Geen contract.** Nova zet overal "contract month {current} of {total}", maar de klant kan morgen
opzeggen (besluit 7). Geen looptijd of einddatum in `content_plans`, wel een startdatum: het plan
kijkt twaalf maanden vooruit, want een programma zonder horizon is geen programma.

**Derde statuslaag: `runningDate`.** `lib/analysis-status.ts` had Nova's technische status en "wie is
aan zet" al; `runningDate` telt pas als er pagina's binnen zes weken verschijnen, het verschil tussen
lijst en agenda. Een pagina die op akkoord wacht krijgt geen datum maar "publiceert zodra je akkoord
geeft": die datum hangt van de klant af.

**`buildPlan()` verdeelt, het bedenkt niet.** Nova laat een agent het hele plan opstellen (`Nova.md`
§11.1); ORBIT ENGINE heeft de bedenkkant al (`propose_topics`) en miste alleen de verdeling, dus puur
rekenwerk, geen zware AI-stap. Eerste regel volgt uit besluit 7: hoogste prioriteit in de eerste
maanden, want wie na drie maanden opzegt moet de béste drie maanden gehad hebben.

**⚠️ De praktijkcheck tegen Van den Udenhout ving een echt probleem.** Acht onderwerpen, tien pagina's
per maand: 132 pagina's netjes verdeeld, maar "Auto financieren" stond twee keer in maand één met
dezelfde titel. De werktitel draagt nu de funnelfase als invalshoek ("Auto financieren · Oriëntatie"),
met een test tegen dubbele titels per maand. Precies waarom conventie 10 bestaat.

Nog te bouwen: maandsegmenten, vier dialogen (goedkeuren, alles goedkeuren, maand goedkeuren met
afwijzen-en-hergenereren, markeren als geplaatst), herordenen, bufferlogica bij verwijderen, de cron
die tien dagen vooruit schrijft.

Vier controles groen: `tsc`, 845 unittests (35 nieuwe), 47 ketentests, productiebuild.

**Fase 4 vervolgd: het plan is bedienbaar (10 augustus 2026).** Serverkant (`lib/plans.ts`), drie
API-routes, een bevestigingsdialoog, het strategiescherm.

**De bufferlogica volgt Nova** (`deleteUrl.body`: "A buffer URL for its month will backfill the slot
if one is available"). Een verwijderde pagina gaat op `afgewezen` en verdwijnt niet (conventie 8), de
eerste reserve neemt plek én datum over, alleen voor een pagina die nog niet geschreven wás. De
melding zegt expliciet óf een reserve gebruikt is.

**Twee dingen bewust niet automatisch.** Een maand afwijzen genereert géén nieuw plan in dezelfde
route (zou het hele jaarplan vervangen). De quota komt uit het pakket op het account, nooit uit het
verzoek.

**De bevestigingsdialoog heeft Nova's `cannotBeUndone`-blok**, als eigen omkaderd blok: een
waarschuwing in een alinea leest als toon, in een kader als feit. Bewegingen komen uit Nova's
gecompileerde CSS.

**Geverifieerd op productie:** een volledig plan ingevoegd (12 maanden, 132 pagina's, 12 buffers),
alle check-constraints hielden, verwijderen nam maanden en pagina's mee via de cascade. Opgeruimd.

Nog open: herordenen met slepen, de cron tien dagen vooruit (`shouldStartWriting()` bestaat en is
getest, de taak eromheen nog niet).

**Het eerste echte plan legde een verdeelfout bloot (11 augustus 2026).** Pakket 10: 12 maanden, 132
pagina's, 12 buffers. In maand 1 stond "Auto financieren · Oriëntatie" twee keer, op plek 1 en 9.
Dieper dan de fout van 10 augustus: acht onderwerpen, vier fasen, beide tellers liepen één omhoog per
pagina, en 8 is deelbaar door 4, dus na acht pagina's weer op de beginstand.

**Oplossing: een schuif, geen uitzondering.** Elke ronde schuift de fase een extra stap op, met een
stapgrootte die het paar pas laat terugkomen na álle combinaties (32 in plaats van 8). Waar het
rekenkundig niet uitkan krijgt de onvermijdelijke herhaling "(deel 2)" achter de titel.

**Waarom de test dit niet zag.** De unittest hield zeven onderwerpen aan; zeven en vier delen geen
gemene deler, toevallig goed. De test loopt nu langs 1 tot en met 16 onderwerpen maal alle drie de
pakketten. 881 unittests, 36 nieuw.

**Het plan schrijft zichzelf (11 augustus 2026).** Dagelijkse cron (`/api/cron/plan`, pg_cron-taak
`aura-plan-writer`, migratie 0050, sinds 0059 `orbit-engine-plan-writer`) zet schrijftaken klaar voor
pagina's die binnen tien dagen gepubliceerd moeten worden. Route plant, werker schrijft, zoals
`/api/cron/tracking`.

**De echte blokkade bleek niet de tien dagen maar de meting.** Schrijven leunt op een gemeten analyse
als briefing; bij Van den Udenhout hebben twee van acht onderwerpen een analyse. Zes van de tien
pagina's in maand 1 kunnen dus vandaag niet geschreven worden.

**Dat is de normale toestand, dus krijgt het een plek in het scherm.** `lib/plan-writing.ts` geeft een
beslissing mét reden: "Start eerst de meting" (bal bij de klant) of "De meting loopt nog" (bal bij
ORBIT ENGINE). Blokkades zonder probleem krijgen bewust geen melding.

**De brug tussen plan en contentpijplijn is één veld.** `plannedPageId` verbindt merk-plan en
analyse-pijplijn: de handler schrijft `content_piece_id` terug en zet de pagina op `ter_goedkeuring`,
de werker zet hem op `mislukt` bij definitief falen. Zonder die regel blijft een pagina op "ORBIT
ENGINE is bezig" hangen.

**Getest waar de fout zou zitten.** Vijf ketentests om de brug (cron, handler, werker); één wees aan
dat de eigenaar uit `analyses.user_id` moet komen en niet uit het profiel. 899 unittests, 52
ketentests.

**Fase 8, het CSM-paneel (11 augustus 2026).** Stond achteraan met "bij minder dan tien klanten kun je
dit met SQL"; besluit 11 haalde dat onderuit (twintig klanten in jaar één, meerdere websites, deels
bureaus). `/beheer` toont alle merken, gesorteerd op wat het eerst aandacht vraagt, alleen voor
beheerders (404, geen 403).

**Zeven segmenten, niet die van Nova.** Nova's zeven gaan over funnels, talen, doellanden; die vult
ORBIT ENGINE zelf in. De zeven die er wél toe doen: vastgelopen, onderzoek loopt, wacht op jouw
nakijkwerk, nog niet gemeten, wacht op de klant, geen contentplan, loopt. Elk met Nova's banner en een
eigen lege staat.

**De volgorde van de controles ís de prioriteit.** Een merk valt in het eerste segment dat past; een
pijplijnfout wint van een openstaand akkoord, anders dubbeltelling. Een test eist dat de segmenten
optellen tot het aantal merken.

**Zes query's, geen zes per merk.** Per-merk tellers zouden bij twintig klanten honderden
Supabase-ronden zijn. Zelfde afweging als bij `enqueueMeasurement()`.

**De drempel voor "nagekeken" staat op 80%, niet 100%.** Van de 27 merkvelden leidt ORBIT ENGINE er 25
zelf af; op 100 zou élk merk eeuwig in "wacht op jouw nakijkwerk" blijven. 919 unittests.

**Herordenen zonder slepen (11 augustus 2026).** Nova laat slepen, onbetrouwbaar op een telefoon
(HTML5-drag). Twee pijltjes doen hetzelfde werk overal, ook met toetsenbord.

**Wat verwisselt is plek én datum.** Alleen de plek zou de bovenste pagina later laten verschijnen dan
de onderste; alleen de datum zou verspringen bij verversen. Buffers doen niet mee, een geplaatste
pagina houdt haar datum.

**Eén fout gevangen vóór hij bestond.** De pijlen rekenden eerst op de zichtbare (gefilterde) lijst,
nu op de volledige maand. 928 unittests.

**Het CSM-paneel telde mislukkingen die geen mislukkingen meer waren (11 augustus 2026).** Het
merkonderzoek van Van den Udenhout faalde op 5 en 6 augustus drie keer op "You have no credits
remaining", en liep op 9 augustus gewoon door. Het merk was dus af, maar stond bovenaan onder
"Vastgelopen" met een rode teller die nooit op nul zou komen.

**De regel is een feit uit de wachtrij, geen tijdvenster.** Een mislukte taak telt alleen als er
daarná geen geslaagde taak van hetzélfde soort voor dezelfde eigenaar is (`unresolvedFailures()`).
Eigenaar is de analyse óf het merk, niet allebei. Vier tests, waaronder één op echte rijen. 932
unittests.

**De contentketen van het plan is met echt geld nagerekend (11 augustus 2026).** Maand 1 van Van den
Udenhout goedgekeurd, cron afgetrapt: 10 pagina's bekeken, 2 ingepland, 2 geblokkeerd op een lopende
meting, 6 op een ontbrekende analyse, precies de voorspelling.

**De brug houdt.** `plannedPageId` mee in de schrijftaak, tekst teruggekoppeld, eerste versie haalde
de poort niet en ketende naar een herschrijfronde, daarna `ter_goedkeuring` met 878 woorden. Een
tweede zware taak werd netjes teruggezet toen het tijdbudget op was, ontworpen gedrag.

**Kosten: $0,42 voor anderhalve pagina**, ~$0,25-0,30 per pagina incl. herschrijfronde op
`gpt-5.6-sol`. Bij pakket 10 ruwweg $3 per maand schrijfkosten per merk.

**Fase 5 begint met het opbrengstblok, niet met Google.** Drie getallen bovenaan het merkdossier:
actief sinds, groei in AI-zichtbaarheid, pagina's gepubliceerd (het middel dat opzeggen tegenhoudt,
besluit 7). Waarde per vermelding optioneel (besluit 16, migratie 0051): leeg toont aantallen, een
bedrag toont geld.

**Twee regels uit de tests.** Bij één meting staat een startpunt en geen groei ("0%" zou niets
suggereren dat wel gebeurde, conventie 3). Bij een daling verschijnt géén bedrag. 945 unittests.

**Fase 5, deel 2: de Search Console-koppeling (11 augustus 2026).** Volgens `zoekdata-koppeling.md`:
een service account in plaats van OAuth (de `webmasters`-scopes zijn "sensitive" en vragen weken
verificatie voor nul extra waarde bij MKB), alleen leesrecht, `dataState: "final"`.

**Geen `googleapis`-pakket.** Twee HTTP-verzoeken volstaan (JWT tekenen, inruilen voor toegangstoken);
Node kan RS256 zelf.

**Twee regels uit de vertraging.** Definitieve cijfers lopen twee dagen achter en Google corrigeert
de dagen daarvóór na. Elke ronde haalt opnieuw een nawerkvenster van tien dagen op; de unieke sleutel
`(profile_id, day, page)` maakt daar een correctie van, geen dubbele rij.

**De property-naam is een eigen functie met eigen test.** `sc-domain:voorbeeld.nl` versus
`https://voorbeeld.nl/`, het kale domein geeft een 404 zonder uitleg. `normalizeProperty()` noemt
beide vormen mét het ingetypte domein.

**In het scherm staat expliciet dat Google klikken uit AI-antwoorden niet uitsplitst**, ongesplitst in
`web`, precies het cijfer waarvan een klant aanneemt dat het erin zit.

**Wat nog niet geverifieerd is: de sleutel zelf.** `GOOGLE_SERVICE_ACCOUNT_JSON` moet in een Google
Cloud-project aangemaakt, alleen door de eigenaar. Tot dan toont het scherm dat de koppeling niet is
ingericht. 960 unittests.

**Fase 6, de lus sluiten: twee van de vier onderdelen (11 augustus 2026).** `content_impact` heeft
**nul rijen**, er is **nooit een pagina gepubliceerd**. Twee onderdelen die daaraan hangen ("impact
terug in het plan", automatische controles) zijn niet gebouwd: onbeproefde laag op onbeproefde laag,
verbiedt conventie 10.

**Wél gebouwd en nagerekend: de kansenlijst (`lib/opportunities.ts`) en het inzichtenblok
(`lib/insights.ts`).** Eén merk met genoeg geschiedenis: Fysi-Unique, drie meetronden, 18 naar 36 naar
38.

**Die 18 naar 36 is waarom dit blok geen AI-aanroep is.** Lijkt een verdubbeling maar valt binnen de
meetonzekerheid van 23 punten bij dertig vragen; een model zou "verdubbeld" zeggen, een leugen met een
grafiekje. Nagerekend op productiecijfers: beide overgangen lezen als "gelijk gebleven".

**De sortering ging eerst mis, de test ving het.** Sorteren op omvang zette een aanbeveling van 30%
boven "twee geschreven pagina's die nog niet online zijn", terwijl die al betaald zijn. Werk dat af is
gaat vóór werk dat nog moet beginnen; een geblokkeerde AI-crawler gaat vóór allebei.

**De blokkade-teller komt uit de audit zelf.** `technical_audits.blockers`: bij Van den Udenhout staan
zoek-crawlers toe, alleen trainings-crawlers geweigerd, terecht waarschuwing en geen blokkade.

**Eén fout gevangen vóór hij live ging.** De onzekerheid per periode werd met `Math.random()`
benaderd; komt nu uit het werkelijke aantal metingen. 983 unittests.

**Fase 7, het accountscherm (11 augustus 2026).** Bedrijfsgegevens, factuuradres, contactpersoon bij
het ACCOUNT, niet het merk (besluit 9). Btw-nummer heeft Nova's vinkje "niet van toepassing": een
stichting hééft geen btw-nummer.

**Opzeggen is een datum, geen knop die iets weggooit** (besluit 14).

**Wat een klant NIET zelf mag zetten, met een test eromheen.** `started_at`, `cancelled_at`, waarde
per vermelding. `lib/account-editable.ts` net als `lib/profile-editable.ts`, ontstaan nadat een veld
wél in de wizard stond en niet in de opslagroute. 986 unittests.

**Besluit 17: de donkere modus vervalt (11 augustus 2026).** Geschrapt, niet uitgesteld: 107
kleur-tokens die elk een tegenhanger nodig hebben, mechanisch omkeren geeft grijze modder, kost een
dag plus een designronde voor de enige fase met impact "laag" op een sales-led product dat op één
scherm getoond wordt. Fase 7 van 2 naar 1 dag, totaal 47 naar 46.

**Het uitnodigingspad nagespeeld, en het legde een echte fout bloot (11 augustus 2026).** Registreren
staat dicht, dit is de énige deur naar binnen.

**De vondst: `getOwnedAnalysis()` miste de accountlaag.** `getOwnedProfile()` kreeg bij migratie 0046
een derde laag (account); deze functie niet. RLS op `analyses` kreeg hem wél, bijna onzichtbaar: lezen
loopt over RLS, een uitgenodigde klant zág zijn analyses. Maar élke schrijfactie (vragen bevestigen,
content laten schrijven, goedkeuren, archiveren) gaf 404 voor precies de persoon voor wie het product
bedoeld is. Had de eerste dag van de eerste echte klant geraakt.

**De ketentest kon dit pas zien nadat het testharnas gerepareerd was.** Twee gaten: geen auth-laag
(`acceptInvite()` gebruikt `admin.auth.admin.createUser`, nu tegen echte `auth.users`); geneste
selects werden STIL weggegooid (`"*, accounts(name)"` werd `*`), nu echt uitgevoerd via de
**werkelijke** foreign keys. Zeventien nieuwe ketentests. 77 ketentests, 986 unittests.

**Elke schrijfroute nagelopen vóór de eerste echte klant (11 augustus 2026).** Alle 44 API-routes in
kaart: 22 op `getOwnedAnalysis`, 15 op `getOwnedProfile`. Drie zonder bewaker, twee terecht (`health`,
`invites/accept`).

**De derde legde een tweede echte fout bloot: een nieuw merk kreeg geen account.** Migratie 0046 vulde
`account_id` terugwerkend, maar `POST /api/profiles` zette hem niet: elk nieuw merk kwam zonder
account (geen pakket, onzichtbaar voor de klant, geen klantnaam bij CSM). `defaultAccountFor()` volgt
de backfillregel, faalt zacht naar `null`. Nul merken zonder account op productie.

**Fase 7 is af: e-mail en wachtwoord wijzigen**, van Nova over. Bevestigingsmail voorkomt permanente
uitsluiting bij een tikfout; controle op het huidige wachtwoord voorkomt overname via een openstaande
laptop, bewust met de publieke sleutel. Twee knoppen, geen gezamenlijk formulier (andere uitkomst).
998 unittests, 82 ketentests.

**Het lanceerplan (11 augustus 2026).** `docs/tasks/lanceerplan.md`: het pad naar "Van den Udenhout is
klant", vijf testsporen over twee weken; negen bouwrondes bouwden het Nova-plan af zonder het ooit als
klant door te lopen.

**"InSpace-kwaliteit" is toetsbaar gemaakt**: elke toestand een eigen scherm, elke foutmelding
specifiek, taal die zegt wie aan zet is, onomkeerbaar vooraf in een eigen kader, bulk eerlijk over
gedeeltelijk succes (de kolom "Nova-kwaliteit"), met de grens van dat oordeel erbij: het beeld komt uit
900 berichtsleutels, hun CSS en marketingtekst, niet uit echte schermafdrukken.

**De drie fouten van vandaag zijn als voorspelling verwerkt**: één patroon, een laag toegevoegd en één
aanroeper vergeten. Spoor B (rolmatrix) en D (wedstrijdcondities) jagen op naden.

**Eén som staat nu vast.** Twintig klanten, 4.800 taken tegelijk, ~16 uur bij vijf per worker-ronde.
Past binnen een etmaal, grens komt rond dertig klanten in zicht.

**Het lanceerplan kreeg een tweede lat: productiewaardig, los van Nova.** §0b heeft zeven
eigenschappen uit eigen oordeel, vier op "nee".

**De scherpste vondst: er is geen rem op de uitgaven.** Precies één plafond, $2,15 voor de onboarding.
Een klant met acht onderwerpen kan $6,56 per middag uitgeven zonder rem, twintig klanten die
goedkeuren is $56 per nacht. Maandplafond en dagplafond zijn lanceervoorwaarden geworden.

**Eén verbetering op Nova**: bij elke knop die geld kost staat wat het kost, Nova doet dat niet.

**Het proefmerk voor de generale repetitie: `gasservice-brabant.nl`**, CV- en warmtepompinstallateur
uit Den Bosch, WordPress met 214 links, `robots.txt` open. Bewust niet HEMA of Bol, die meet niets.

**Besluit 18: alleen de beheerder start betaald werk (11 augustus 2026).** Diezelfde dag teruggedraaid
toen de rekensom ($6,56/$56) zichtbaar werd. Sluit aan op `Nova.md` §1.2: de klant goedkeurt, maakt
niet.

**De scheidslijn loopt langs geld, niet langs rol** (`lib/cost-guard.ts`, elf routes). Gratis:
goedkeuren, als geplaatst markeren, feitvraag beantwoorden, profiel corrigeren. Test is een
broncodecontrole: de fout die je vangt is "er komt een route bij en iemand vergeet hem".

**Spoor R: de meting mat de verkeerde vragen, met cijfers aangetoond.** Van den Udenhout werkt alleen
in Brabant:

| | vragen | metingen | genoemd | score |
|---|---|---|---|---|
| Fysi-Unique, niet-regionaal | 20 | 57 | **0** | **0** |
| Fysi-Unique, regionaal | 10 | 40 | 11 | **28** |

Élke vermelding kwam uit een regionale vraag: twee derde van het meetbudget kocht niets, de getoonde
score van 18/36/38 was systematisch lager dan de 28 die ertoe doen, en de gap-analyse stelde pagina's
voor over een markt waar de klant niet in zit.

**De oorzaak was conventie 1 in het klein.** De regel in `prompts.ts` zei "verwerk een plaatsnaam", een
intentie, uitkomst 38%. Nu een aantal in de instructie (minstens 70%) én een deterministisch vangnet
erachter.

**Twee details tussen werkt en werkt-bijna.** Provincies in de lijst naast plaatsen; woordgrenzen
nodig ("Oss" staat in de regio's van een Brabantse dealer, zou zonder grens aanslaan op "grossier").
1032 unittests.

**De drempel ging van 70% naar 100%.** Een regionale klant wil alleen op regionaal niveau beoordeeld
worden: een score is een aandeel, vragen erdoorheen mengen die het bedrijf niet kan winnen maakt de
uitkomst onwaar, niet "iets te laag".

**De 55 vragen zijn uitgezet op productie, de cijfers verrasten.** Alle 150 bewaard (`active = false`).
Drie van vijf analyses stonden er al goed voor, twee nieuwste niet (Auto financieren 9, Auto leasen
13). **Hetzelfde merk, dezelfde prompt: 83% de ene keer, 30% de andere.** Met negen vragen is de band
±15,0 in plaats van ±9; dertig regionale vragen kost ~$0,57 extra per ronde.

**Het gat boven het vangnet is nog het grootste open punt.** Hangt aan `service_scope === "lokaal"`;
op productie `null` bij vier van negen profielen, waaronder Fysi-Unique zelf. Staat als R6 in
`lanceerplan.md`.

**En de poort geldt nu ook voor handwerk.** `POST`/`PATCH` op `/api/analyses/[id]/prompts` weigert nu
via `regionGateMessage()`. 1039 unittests.

**R6 dicht: het werkgebied blokkeert nu het dossier**, in het afrondingsblok (niet vóór
promptgeneratie, dat zou bestaande profielen laten vastlopen). `scopeSummary()` in `field-merge.ts`:
'lokaal' zonder regio telt als onbekend. De vier profielen met leeg bereik blijven bewust onaangeraakt.
1049 unittests.

**F1: het budgetplafond, de tweede rem.** Nu twee plafonds: €50 per account per maand, €150 per dag
over alle accounts. Bedragen uit echte cijfers (vier onderwerpen kost ~€6/maand, €50 laat factor acht
ruimte). Elf routes stellen beide vragen, broncodecontrole bewaakt een missende twaalfde.

**Drie keuzes die de andere kant op vallen.** De rem faalt naar doorlaten, niet blokkeren. Geen exacte
boekhouding, gecontroleerd vóór een taak, niet tijdens. Een maand afwijzen gaat om de rem heen.

**Migratie 0053 geeft `ai_calls` een `account_id`**, gevuld door een databasetrigger, niet in
`ledger.ts` (best-effort, geen extra netwerkronde). 1.140 rijen bijgewerkt, nul onverdeeld. Totaal
sinds start: $13,38.

**De ketentest bewees meteen twee dingen.** Viel om op een `.gte` die de shim niet kende, maar de
melding toonde dat de zachte terugval werkt: doorgegaan, luid gelogd. Shim kent nu `gte`, `gt`, `lte`,
`lt`, `range`. 1088 unittests, 92 ketentests.

**F3: de tweeling is opgeheven.** `getOwnedProfile`/`getOwnedAnalysis` hadden dezelfde drie lagen op
twee plekken; migratie 0046 gaf de eerste een accountlaag, de tweede niet, bijna onzichtbaar (lezen
loopt over RLS). `lib/access.ts` repareert de oorzaak: de lagen staan één keer, broncodecontrole
verbiedt een eigen `isStaff(`/`isMember(` in de twee functies. 1095 unittests.

**Stap A9 van het lanceerplan is herschreven**: toetst nu of de klant een uitleg ziet in plaats van
een knop die faalt.

**F4: verwijderen bestaat nu echt.** Conventie 8 en besluit 14 blijven (archiveren dekt negen van de
tien gevallen), maar de AVG kent een recht op verwijdering. Drie sloten: alleen een beheerder van ORBIT
ENGINE, niet je eigen account, naam overtypen serverkant gecontroleerd. Je ziet eerst wat verdwijnt
("3 merken, 5 analyses, 412 metingen").

`profiles.account_id` staat op `no action` (in plaats van cascade): de database weigert een account
weg te gooien zolang er merken aan hangen, wat de volgorde bepaalt. Inlogaccounts gaan mee, tenzij lid
van een ander account.

⚠️ **Twee dingen die eerlijk in de code staan.** Geen transactie omheen (Supabase praat over HTTP);
faalt het halverwege, zijn de merken weg en het account nog niet, herstelbaar. Het kostenlogboek van
die klant gaat mee, verwaarloosbaar. 1116 unittests, 109 ketentests.

**De generale repetitie op `gasservice-brabant.nl` (12 augustus 2026).** Onboarding: **8,0 minuten,
$0,235, acht van de acht stappen klaar, nul mislukkingen.** 148 pagina's, 7 onderwerpen, 17 onderdelen
aanbod, 10 concurrenten, 17 technische controlepunten zonder blokkades.

**De R6-zorg bleek kleiner dan gedacht.** Het onderzoek vulde zélf in dat dit lokaal is (zeven
plaatsen in Brabant); de vier lege werkgebieden op productie zijn oude data.

**De regionale regel deed wat hij belooft: 30 van de 30 vragen regionaal**, tegenover 9 en 13 van 30
bij Van den Udenhout vóór reparatie.

⚠️ **En de repetitie vond meteen waar hij voor bedoeld was.** Vier van dertig vragen geforceerd, alle
oriëntatie. Scherpst: "Heeft regelmatig onderhoud invloed op de levensduur van een cv-ketel in Den
Bosch?", een vraag die niemand zo stelt en niets meet. Het model plakte de plaats achter een
informatieve vraag in plaats van naar een aanbieder-zoekende vraag toe te bouwen. Instructie kreeg een
fout- en goed voorbeeld; blijft een intentie (het vangnet telt alleen of er een plaats in staat).
Beslissings- en overwegingsvragen waren wél goed.

**De meting van de repetitie: score 30, de keten hield stand.** Dertig vragen, dertig metingen, nul
mislukkingen, 2,2 minuten, negen vermeldingen. Hele repetitie kostte **$0,77** ($0,61 aan
`web_search`), onder de geschatte $1,10.

**Drie dingen bleken goed zonder reparatie.** Concurrentenlijst filtert Rijksoverheid en
Consumentenbond correct naar `zijdelings`. Toelichting per concurrent bruikbaar. Rapport noemt zijn
eigen onzekerheid ("marge ongeveer ±17 punten"), en dat klopt (bij score 30 op dertig vragen is de band
±16,4). Gasservice Brabant gemiddelde positie 2,9, alleen Kemkens hoger van de echte concurrenten.

**Wat de repetitie niet kon toetsen.** A1 zonder knop gedaan (geen inloggen mogelijk), dus de nieuwe
403/402 nog niet in het echt gezien, evenmin A6-A10 (contentplan, uitnodiging, klantpad).

**F5, de stille-fout-ronde: vier vondsten, de eerste raakt de hele pijplijn.** 118 queries en 97
schrijfacties zonder foutcontrole in `lib/`; de vraag was waar een storing tot geld, een verkeerd
getal, of stil verlies leidt.

**Elke idempotentiecontrole faalde de verkeerde kant op.** `if ((count ?? 0) > 0) return`: gaat de
telling stuk, dan is `count` `null`, `null ?? 0` is 0, dus de dure aanroep gaat alsnog, precies op het
moment waarop een taak opnieuw geprobeerd wordt. `lib/require-count.ts` gooit nu, op zeven plekken.

**De duurste zat in de werker.** Afvinken van een gelukte taak was een kale `await`; mislukt die
update, dan pakt `reclaim_stuck_jobs` de taak terug en herhaalt betaald werk. Nu drie pogingen op de
boekhouding, niet op het werk.

**Een storing die zich voordeed als een afwezigheid.** Google-sleutel gaf `null` in drie gevallen met
één melding ("nog niet ingesteld"); nu drie toestanden met drie meldingen.

**En een stille nul die werk liet verdwijnen.** Beantwoorde feitvragen in de dedupe-sleutel van een
contenttaak; faalt de telling naar 0, botst de sleutel met een eerdere lege poging, taak niet
ingepland. 1131 unittests, 109 ketentests.

**F4 heette af en was dat niet.** Supabase's veiligheidscontrole vond binnen een minuut: migratie 0025
maakte bij een dataopschoning een kopie in `_backup_20260729`, 51 momentopnamen, zonder verwijzing
naar `profiles` dus buiten de cascade. Een "volledig verwijderde" klant liet zijn teksten achter in een
tabel die niemand bekijkt, precies het AVG-restant. Opruiming gebeurt nu vóór de merken.

**Wat de controle verder liet zien.** Geen tabel zonder rijbeveiliging; `jobs`, `account_invites`,
`ai_calls`, `staff_users` hebben nul policies maar zijn juist dichtgetimmerd. Wel open: bescherming
tegen gelekte wachtwoorden staat uit, drie functies met verhoogde rechten aanroepbaar via de REST-API.
Openstaand in het lanceerplan. 110 ketentests.

**De promptverdeling is per analyse instelbaar (12 augustus 2026, migratie 0054).** Standaard
10/10/10, per ANALYSE: de verdeling hangt aan het onderwerp, niet het bedrijf. Nul is een keuze
(`resolveMix` zonder `??`, een fase met nul krijgt géén taak).

**Het scherm zegt wat het kost vóórdat je op start drukt**: "60 vragen, ongeveer $1.44/maand, marge
±11,6 punten", uit echte data ($0,024/vraag over 428 metingen, marge uit dezelfde binomiale rekensom
als `lib/stats/uncertainty.ts`).

**De generatie is gesplitst in één taak per funnelfase.** Gezamenlijke taak liep ooit 228 van 300
seconden; drie taken van ~76 seconden houden ruimte, ook conventie 7.

**Twee vallen die de splitsing introduceerde, afgevangen.** De goedkeurpoort mag pas open als álle
fasen klaar zijn. De mislukt/gelukt-controle vraagt nu of élke fase zijn vragen heeft, niet alleen "zijn
er al vragen".

⚠️ **De ronde van vanochtend had er één gemist.** `prepare.ts` stond nog op `if (!count)`; nu ook
`requireCount`. 1154 unittests, 119 ketentests.

**De maandmeting heeft een tijdslot gekregen (12 augustus 2026).** De taak keek alleen of er al een
volgende periode bestond, niet of de vorige lang genoeg geleden was: onboard op 28 augustus, dan meet
de taak op 1 september alweer. Grens op 21 dagen (niet 28, want een maand duurt 28-31 dagen). De taak
meldt nu wát hij oversloeg.

**Gearchiveerd werk wordt overgeslagen.**

⚠️ **En er is vandaag iets echt kapotgegaan, kort maar volledig.** Migratie 0055 trok uitvoerrecht in
op vier functies die Supabase's veiligheidscontrole aanwees; drie zitten in RLS-regels, zonder recht
faalt niet de regel maar de héle query: een ingelogde gebruiker kon niets lezen, op 28 tabellen. Een
paar minuten op productie, teruggedraaid. Geen test bewaakte "een ingelogde gebruiker kan lezen"; die
is er nu, algemeen geformuleerd, eerst rood gemaakt. De andere drie melding blijft (nette oplossing
kost 36 RLS-regels herbouwen, geen echt gevolg). 1166 unittests, 125 ketentests.

**De rolmatrix, leeskant: elk tweede teamlid zag een leeg dossier, geen enkele test kon dat zien.**
`analyses`/`profiles` kennen drie leeslagen, maar de 23 tabellen eronder (vragen, metingen, rapport,
pagina's) hadden er twee: eigenaar en beheerder, geen account. Elke collega die via `account_users`
binnenkwam kreeg elk hoofdstuk leeg terug, zonder foutmelding. De ketentest draait bewust met de
service-role (omzeilt RLS); een dossierpagina leest mét RLS, nooit getoetst.

**Migratie 0056 voegt op 23 tabellen een accountregel toe** (Postgres OR't). Getest: vóór reparatie 0
vragen voor een teamlid, erna 30, 30 metingen, rapport, 52 concurrentregels, 148 pagina's; een vreemde
bleef op 0. `auth.uid()` leest nu echt `request.jwt.claim.sub`; nieuwe ketentest zet vier rollen
tegenover elkaar. 1166 unittests, 132 ketentests.

**Wedstrijdcondities: drie situaties nagerekend, één bleek echt kapot.** Een maand twee keer tegelijk
goedkeuren bleek al veilig (`UPDATE ... WHERE status <> 'goedgekeurd'`). Een pagina verwijderen niet:
las eerst of hij nog `gepland` was en besliste dáárna op verouderde lezing of de buffer moest
inschuiven, race met de content-taak. Gerepareerd met dezelfde voorwaardelijke `UPDATE`
(`WHERE status = 'gepland'`), plus een tweede race (`is_buffer = true` in de claim-update) bij het
nabouwen ontdekt. De derde vraag (twee achtergrondtaken dezelfde klus) was al gesloten via
`claim_jobs()`. 1166 unittests, 145 ketentests.

**De potentiescore: hoeveel is er te winnen, met dezelfde meetlat overal.** Een pagina is pas een
grote kans bij onzichtbaarheid ÉN hoog zoekvolume, niet één van beide. Zoekvolume bestond als losse
gok per analyse ("gebruik 0-100" op eigen dertig vragen), niet vergelijkbaar tussen een nichemarktje
en een grote markt.

Nieuwe stap zet ALLE onderwerpen van een merk in één aanroep tegen elkaar af met vier vaste ijkpunten,
herschrijft bij elk nieuw rapport. Bewezen: kalibreer twee onderwerpen (zwaarste op 100), zet een
derde groter onderwerp bij, het EERSTE zakt naar 84.

Drie getallen 0-100: zichtbaarheid, zoekvolume, potentie (product van de twee, niet som: overal
genoemd = potentie 0). Zichtbaar op dossier, per voorgestelde pagina, in de bibliotheek. Nieuwe
"zichtbaarheid" is een verse, ongewogen telling (de bestaande `weighted_score` was al vermenigvuldigd
met een grove volumeschatting).

Bewust nog niet gedaan, staat in `docs/tasks/potentiescore.md`: Kansen-lijst sorteert er nog niet op,
contentplan houdt de dag-1-gok aan, `generate_report`-trigger heeft geen ketentest. 1191 unittests, 157
ketentests.

**De potentiescore, fase 2 en 3: het getal moest ook iets DOEN.** Kansen-lijst en contentplan kregen
de potentiescore als eerste sorteersleutel, oude gedrag als vangnet als de score nog ontbreekt; raakt
alleen nieuw gebouwde plannen. Bewezen tegen echte `createPlan()`: een onderwerp met hoogste
dag-1-prioriteit maar weinig oplevering verliest van een onderwerp met laagste prioriteit maar de
echte kans. Bewust laten liggen: de zichtbaarheidsscore op elk scherm laten overstappen naar de nieuwe
index. 1201 unittests, 160 ketentests.

**Sjabloondetectie: content die technisch past op de site van de klant (13 augustus 2026).** ORBIT
ENGINE leverde altijd platte Markdown/HTML, ongeacht CMS. De crawl haalt de ruwe HTML toch al op;
`lib/pipeline/template-detect.ts` herkent CMS, FAQ-accordions, koppenstructuur vóór de HTML verdwijnt,
nul AI-kosten. `lib/pipeline/content-export.ts` vertaalt content naar die vorm (WordPress:
Gutenberg-blokken; elders FAQ als `<details>`), geen van beide een AI-aanroep. Zonder signaal de
bestaande generieke exportknoppen.

Terzijde gevonden: `renderMarkdown()` escapet eerst, citaatregex zocht nog het kale `>` in plaats van
`&gt;`, dus elk `> `-citaat stond als kale tekst op een gepubliceerde pagina sinds de bouw van deze
functie. Gerepareerd. 1233 unittests, 160 ketentests.

**Het merkdossier gesplitst in subpagina's, klant-feedback op het scherm zelf (14 augustus 2026).**
`/profielen/[id]/page.tsx` was 525 regels, negen ongelijksoortige blokken onder elkaar; de klant bij
Gasservice Brabant noemde het een vergaarbak. Elk werkblok kreeg een eigen subpagina onder
"Merkdossier" (`lib/nav.ts`, negen kinderen), zijbalk klapt automatisch open op eigen pagina's.

Twee blokken bleken output van analyses en verhuisden mee: "Onderwerpen om op te meten" naar
`/analyses/aanbevolen` onder "Clusters"; "Waar begin je" (output van `loadLoop()` over ALLE analyses)
naar de merk-gefilterde `/analyses`-lijst. Feitenvragen uit een specifieke analyse naar hoofdstuk 03
van díe analyse; vragen uit de nulmeting bleven "Aanvullen".

`/profielen/[id]` houdt nu alleen: is het dossier compleet, wat weet ORBIT ENGINE uit de nulmeting.
1233 unittests, 160 ketentests.

**De rangordetabel: "Jij" hoort niet altijd bovenaan te staan (13 augustus 2026).** `competitor_breakdown`
had `avg_position`/`first_mention_count` al (migratie 0029), `CompetitorCard` las alleen
`mentions_count`. Scheve aanname: "Jij" toonde genoemd ÷ **winbare** vragen, concurrenten ÷ **alle
gemeten**. `brand-rankings.ts` rekent nu iedereen over dezelfde noemer; testcase: concurrent met 18
vermeldingen boven eigen merk met 8, precies andersom dan voorheen. 1250 unittests, 160 ketentests.

**Diezelfde dag: de citatiekolom werkt nu ook voor concurrenten.** `citesOwnSite()` hergebruikt
`isSameEntity()`, zonder ooit een concurrent-domein opgeslagen te hebben. Migratie `0058` voegt
`competitor_breakdown.citation_count` toe. Geen backfill van bestaande periodes (streepje tot de
eerstvolgende meting), geen ketentest tegen een echte aggregatie (bestaand gat). 1257 unittests, 160
ketentests.

## De visie van Outer Orbit vastgelegd, en waar ze nog niet overeenkomt met vandaag (17 augustus 2026)

Outer Orbit legde de langetermijnrichting van ORBIT ENGINE vast: een autonome groeimotor die kansen
ontdekt, ze vertaalt naar strategie, het SEO- en GEO-werk uitvoert, het resultaat meet en opnieuw
optimaliseert, voor organisaties met meer zoekkansen dan een team handmatig kan benutten. Dat
document staat in `docs/visie.md`.

De keuze was om dit **niet** te verwerken als een update van wat er vandaag al staat, maar als een
apart, expliciet gemarkeerd richtingdocument. Reden: de nieuwe tekst spreekt op dit moment drie
dingen tegen die hierboven met datum en argument zijn vastgelegd. Punt 1 hierboven ("Het product")
kiest bewust voor het MKB en expliciet niet voor enterprise-diepgang. De sales-led beslissing van
3 augustus 2026 (§15, samengevat in `CLAUDE.md`) laat de klant per stap goedkeuren, in plaats van
het systeem zelf laten publiceren. En de hele pijplijn is vandaag uitsluitend GEO, er is
geen zoekwoordonderzoek of Google-positietracking gebouwd, "keyword research suites" en "echte
zoekvolumes" staan zelfs met naam genoemd als bewust niet gebouwd.

Geen van die eerdere beslissingen is hiermee ingetrokken. Ze blijven de accurate beschrijving van
wat er werkt. `docs/visie.md` is een bestemming waar toekomstige besluiten aan getoetst kunnen
worden, geen document dat claimt dat ORBIT ENGINE dat vandaag al is. Wordt een stap uit die richting
daadwerkelijk gebouwd (SEO-functionaliteit, een grotere doelgroep, meer autonome uitvoering), dan
hoort dat besluit hier als eigen, gedateerde alinea, met de code die het waarmaakt.

## De merkstrategie vastgelegd, en de vijf gaten tussen belofte en bouw (17 augustus 2026)

Dezelfde dag kwam het tweede document van Outer Orbit: de volledige merkstrategie voor de Nederlandse
markt, bedoeld om aan een reclamebureau te overhandigen. Positionering, vier personas, de tien meest
gehoorde bezwaren met hun antwoord, tone of voice, visuele richting, campagnepijlers. Vastgelegd als
`docs/merkstrategie.md`, naast en niet in `visie.md`: het ene document gaat over wat het product
wordt, het andere over hoe het merk daarover praat.

**De aangeleverde tekst had vier fouten die hersteld moesten worden vóór vastlegging**, en de eerste
twee zeggen iets over hoe zo'n document ontstaat. Op twee plekken stond "inORBIT ENGINEtie": een
zoek-en-vervang van "Nova" naar "ORBIT ENGINE" was middenin het woord "innovatie" terechtgekomen, want
daar zitten diezelfde vier letters in. Precies dezelfde valkuil die bij de rebrand van de code is
vermeden door op woordgrenzen te matchen in plaats van op losse letterreeksen.

Ernstiger: op vier plekken (§22.2, §24, §25, §28) heette het eigen merk **InSpace**, terwijl §1 en §2
consequent Outer Orbit aanhouden. InSpace is in dit project de concurrent, degene wiens twee live
applicaties in `tasks/nova-analyse.md` uit hun eigen berichtenbestand zijn gereconstrueerd. Een
merkdocument dat zijn eigen merk verwart met dat van de concurrent is meer dan een typefout, dus de
correctie is uitgeschreven in §29 van dat document in plaats van stil doorgevoerd.

**Wat het oplevert, is de lijst in §30: vijf plekken waar de merkbelofte iets zegt dat de app niet
waarmaakt.** Twee daarvan waren al bekend uit `visie.md` (doelgroep en autonomiegraad). Twee zijn
groter dan gedacht: het merkverhaal verkoopt SEO én GEO als één geheel terwijl er alleen GEO gebouwd
is, en het belooft op drie plekken publicatie via het CMS. Die koppeling is op 10 augustus 2026
expliciet buiten scope gezet, publiceren gaat met de hand via "markeer als geplaatst". De app herkent
wél welk CMS een site draait, maar schrijft er niet naartoe. Dat is het verschil tussen een campagne
die werkt en een demo die vastloopt op de vraag "laat maar zien dan".

Het vijfde punt is klein maar legt iets bloot dat niemand ooit hardop besloten heeft. De merkstrategie
wil minimalistisch en neutral-first, expliciet zonder "neonpaarse AI-gloed". De app ís al
neutral-first, dus dat botst nauwelijks. Maar het hele designsysteem is afgeleid van de werkomgeving
van InSpace Nova (peildatum 6 augustus 2026), en dit document positioneert Outer Orbit juist als iets
eigens. Zolang de app eruitziet als een afgeleide van de concurrent, werkt de vormgeving tegen de
positionering in. Dat is een besluit voor de eigenaar en het staat opgeschreven zodat het gesteld
wordt, niet opgelost omdat een AI dat wel handig vond.

## 17 augustus 2026: de appstructuur, fase 1 (adressen en hoofdstukken)

**Wat het probleem was, in cijfers.** De zijbalk toonde een klant 7 regels die uitklapten naar 15
bestemmingen. Eén van die regels, "Mijn merk", had er in zijn eentje negen, en het commentaar in
`lib/nav.ts` noemde die groep zelf al "de vergaarbak die dit oplost alleen verticaal". Alle 27 velden
van de merkprofiel-wizard stonden bovendien óók in het profielgegevens-scherm (41 velden): twee
menu-items, twee schermen en twee opslagroutes voor dezelfde kolommen, waarvan het ene scherm een
deelverzameling van het andere was. Er waren 26 schermen en geen enkele startpagina.

**Wat fase 1 doet.** Elk merkscherm staat nu onder `/merk/[id]/` in plaats van onder
`/profielen/[id]/`. Zonder die verhuizing zou "profielen" in de adresbalk staan op een scherm dat over
zoekverkeer gaat. De zijbalk groepeert sinds deze ronde een platte lijst bestemmingen op hun hoofdstuk
(`hoofdstukken()` in `lib/nav.ts`), in de vaste volgorde Overzicht, Strategie, Analytics, Merkprofiel,
Instellingen, met Admin onder een scheidingslijn. Hooguit drie kinderen per kop, en een kop zonder
bestemmingen wordt niet getoond.

**Strategie staat vóór Analytics, en dat is geen cosmetiek.** Wie inlogt wil weten wat hij moet doen,
niet browsen in data. Overzicht draagt het hoofdcijfer al, Analytics is verdieping en Strategie is
handelen. Nova ordent zijn vier bestemmingen om dezelfde reden zo.

**Dertien oude adressen geven een 308.** De eigenaar deelt demolinks naar die adressen, dus een dood
adres kost hier een gesprek en niet alleen een klik. De lijst staat in `lib/redirects.ts` en niet in de
configuratie: hij bepaalt een uitkomst, dus loopt `scripts/test-unit.ts` hem na (conventie 2). Alle
dertien zijn nagelopen tegen een draaiende productiebuild en gaven een echte 308 naar hun eindadres.

**Elke verwijzing wijst naar het EINDadres, niet naar een tussenstation.** Een 308 blijft in de
browsercache staan en is niet terug te nemen, dus `/profielgegevens` wijst nu al naar
`/merkprofiel/bewerken` (waar fase 2 de twee formulieren samenvoegt) en `/producten` naar `/merkprofiel`
(waar het aanbod als blok staat). Dat betekende dat fase 1 de schermen zelf mee moest verhuizen in
plaats van alleen het spoor te leggen: een permanente verwijzing naar een adres dat nog niet bestaat is
geen fundament maar een dood einde. `/merkprofiel/bewerken` toont daarom tijdelijk twee formulieren,
met de reden erbij op het scherm.

**Eén toegangscontrole in plaats van elf.** `app/(app)/merk/[id]/layout.tsx` stelt de rechtenvraag één
keer met `getOwnedProfile()`, dezelfde drie lagen die de schrijfroutes gebruiken. Een gebruiker die
niet bij het merk hoort krijgt een 404 en geen 403: een 403 bevestigt dat het merk bestaat.

**Twee functies uit een servercomponent getrokken naar een pure module**, omdat ze anders niet te
testen waren: `findGaps()` (`lib/profile-gaps.ts`, de open punten op het merkprofiel) en de
doorverwijzingenlijst. Unittests van 1257 naar 1332.

## 17 augustus 2026: de appstructuur, fase 2 (het merkprofiel)

**Twee formulieren voor dezelfde kolommen.** De merkprofiel-wizard had 27 velden en toonde per veld
waar de waarde vandaan kwam. De platte editor ernaast had er 41, zonder herkomst, met een eigen
opslagroute naar precies dezelfde kolommen in `profiles`. Het ene scherm was dus een deelverzameling
van het andere, ze stonden als twee menu-items naast elkaar, en de klant kon niet zien welk van de
twee won.

**De wizard heeft gewonnen, en heeft er veertien velden bij gekregen.** Zeven stappen in plaats van
vijf: Je bedrijf (8), Je merk (3), Je klant (6), Hoe je klinkt (6), Je woorden (5), Wie het schrijft
(7), Waar je om bekend wilt staan (6). Die laatste stap heeft Nova niet, en het is juist de stap die
bepaalt wat een AI-assistent over je kán zeggen: zonder harde cijfers wordt elke tekst algemeen, en
algemeen wordt niet geciteerd.

**41 in, 41 uit, en de test faalt nu in beide richtingen.** Er stond al een test die controleerde dat
elk wizardveld opgeslagen mag worden; die ving op 10 augustus een echte bug (`proof_points` stond in
de wizard en niet in de opslaglijst, de klant kreeg "opgeslagen" te zien en de waarde was weg). De
andere kant ontbrak, en die is sinds deze ronde het gevaarlijkst: nu de platte editor weg is, is een
opslaanbaar veld zonder stap een veld dat de klant nergens meer kan corrigeren. Zonder foutmelding,
want het veld is er gewoon niet meer.

**Twee nieuwe soorten invoer.** Een `keuze` slaat een wóórd op dat in een database-constraint staat
(`lokaal`, `dienstverlener`) in plaats van een nummer, met een test die de waardenlijst tegen de labels
legt: loopt die scheef, dan kiest de klant "Lokaal" en komt er "landelijk" in de database. En
`personas` is het enige veld dat geen tekst of tekstlijst is.

**Wat géén merkveld is, staat buiten de wizard.** Hoe grondig ORBIT ENGINE de site uitleest en de
brontekst die de klant aanlevert zijn gereedschap, geen eigenschap van het merk. Ze staan ingeklapt
onder de wizard. Die grens is wat de teller eerlijk houdt.

**Het merkdossier is nu echt een leesscherm**: dossier, wat AI over je weet, aanbod en concurrenten. De
mijlpalen en de maandinzichten gaan in fase 5 naar Overzicht, en het compleetheidspercentage gaat in
fase 6 naar Admin. Dat laatste is besluit 4: het is een percentage over werk dat de klant niet doet, en
voor de consultant een verkoopinstrument.

**Eén ketentest erbij, en die dekt wat de unittest niet kan.** Een veld kan keurig in een stap staan,
netjes opgeslagen worden, en alsnog nooit bij het model aankomen. De ketentest wijzigt nu twee
merkvelden uit twee verschillende stappen vlak vóór er geschreven wordt, en controleert dat ze allebei
in de schrijfprompt staan. Unittests 1332 naar 1342, ketentests 160 naar 162.

## 17 augustus 2026: de appstructuur, fase 3 (Strategie)

**Eén clusterlijst waar er twee waren.** "Clusters" en "Voorgestelde clusters" stonden als twee
menu-items naast elkaar, voor twee toestanden van hetzelfde ding: een voorstel wordt een cluster zodra
je op "meet dit" klikt. Nu één lijst, lopend bovenaan en voorstellen daaronder op potentiescore
(besluit 6).

**Eén bibliotheek per merk.** Content stond per cluster in een eigen bibliotheek, dus een klant met
vier clusters had vier bibliotheken en nergens een overzicht van wat hij gekocht heeft. Precies het
verkeerde om te versnipperen: het is het eindproduct waar hij voor betaalt (besluit 5). Met zoeken op
titel én adres, filters op type, status en cluster, en paginering vanaf 25 rijen. Op productie stonden
op deze datum 35 contentpagina's, dus die paginering is nu al relevant.

**De terugknop onthoudt waar je vandaan kwam.** Een contentpagina is nu vanaf drie plekken te bereiken.
Zonder herkomst wijst de terugknop altijd naar dezelfde plek, en dan komt de klant uit op een scherm
waar hij niet vandaan kwam. Bewust een parameter (`?van=`) en geen `Referer`-header: die valt weg bij
een bladwijzer en bij strengere browserinstellingen, en juist dán is de terugknop het enige wat hij
heeft.

**De bulkactie, en waarom hij een vierde meldingskleur nodig had.** "Markeer alles als geplaatst" per
maand valt of staat met kwaliteitslat **K5**: eerlijk zijn over gedeeltelijk succes. Lukken er 7 van de
9, dan zegt de melding dat, met welke twee niet en waarom. Zo'n uitkomst in het groen tonen is
oneerlijk want er bleef iets staan, in het rood ook want het meeste ging goed. De broodroostermelding
kende alleen groen, rood en blauw; er is een vierde bijgekomen op `--intent-warning`, dat letterlijk
"kijk hier even naar" betekent.

Drie dingen die de bulkactie bewust níet doet. Hij verzint geen adres voor een pagina die er geen heeft
(conventie 3: dat levert een meting op die nergens over gaat), hij markeert niets wat nog niet is
goedgekeurd, en hij rekent reservepagina's niet mee. Wat al live stond telt als noch succes noch
mislukking, anders leest "3 van de 9" alsof er zes fout gingen terwijl er zes al klaar waren.

**De rem verhuisde binnen de route.** Een maand goedkeuren is de duurste knop van de app (~$2,80) en
mag alleen de beheerder. Markeren als geplaatst kost niets en mag de klant ook (besluit 8). De
rechtencontrole stond bovenaan de route en gold dus voor alles; hij staat nu bij de twee handelingen
die hem nodig hebben. Unittests 1342 naar 1393.

## 17 augustus 2026: de appstructuur, fase 4 (Analytics)

**Drie schermen die er nog niet waren, bijna geheel uit tabellen die al gevuld zijn.** Zichtbaarheid in
AI, Zoekverkeer en Concurrenten. De cijfers stonden er al (14 zichtbaarheidsscores, 343 concurrentrijen,
91 dagen zoekdata), maar er was geen scherm dat ze over de clusters heen bij elkaar bracht.

**Optellen mag alleen op tellingen, nooit op percentages.** Twee clusters met 40% over 10 vragen en 20%
over 90 vragen geven samen geen 30%. Het merkcijfer op Zichtbaarheid weegt daarom op het aantal gemeten
vragen per cluster, en de ranglijst op Concurrenten telt eerst de vermeldingen en de vragen op en zet
er pas dáárna één keer een percentage overheen. Zonder die regel verspringt het merkcijfer zodra iemand
een klein cluster start.

**De noemer van de ranglijst blijft van `brand-rankings.ts`.** Die module bestaat omdat de balk van
"Jij" ooit het percentage van de hoofdscore toonde en de concurrenten dat van alle gemeten vragen, en
dan sta je kunstmatig boven je markt. Er is hier geen tweede telling bijgekomen.

**Een blokkade staat bóven het cijfer dat hij verklaart.** Een dichte robots.txt is de meest
voorkomende reden voor een lage score. Onderaan zetten betekent dat de klant eerst zijn score leest en
pas daarna waarom hij niet kan kloppen. Dat is ook besluit 7: de technische diagnose hoort bij
Analytics en niet bij Instellingen, want daar kijkt niemand als hij zich over zijn cijfer verbaast.

**Eén markering bleek dode code, en dat kwam pas boven water door de test.** De laatste twee dagen van
Google zijn niet definitief, dus de eerste versie markeerde alles ná vandaag min twee. Die regel sloeg
nooit aan: de synchronisatie haalt bewust niets op ná die grens, dus zo'n dag staat nooit in de
database. Het is nu de laatste twee dagen die er wél zijn, en dat werkt ook als de synchronisatie een
week heeft stilgelegen.

**Twee woordenlijsten voor "soort pagina", en de keuze is vastgelegd.** `planned_pages.page_type` heeft
informatief (131), categorie (67) en dienst (66); `content_pieces.type` heeft landing (18), article
(15) en faq (2). Klikken per paginatype gebruikt de eerste, en de contentmix op Overzicht straks
dezelfde. Reden: het contentplan verdeelt op die as, dus een conclusie levert daar meteen een
bijstelling op. Bij "landing tegenover article" stuurt niets.

**De vier kerncijfers zijn nagerekend: 600 klikken en 5.253 vertoningen over 15 juli tot 13 augustus.**
⚠️ Dat is testdata en geen klantdata. Het toetst de rekensom en de vorm, niet de koppeling. Die is pas
geverifieerd als de Google-sleutel er is en er één echte synchronisatie is gedraaid (conventie 10).

**Nieuw scherm dat niet in de fasering stond: Koppelingen** (`/instellingen/koppelingen`). Het volgt
uit besluit 3b, want zodra Zoekverkeer uitlegt dat er nog geen koppeling is, moet er een knop naast
staan die ergens heen gaat. Alle merken op één pagina: een bureau met vier merken wil in één oogopslag
zien welke er gekoppeld zijn.

Unittests 1393 naar 1437.

## 17 augustus 2026: de appstructuur, fase 5 (Overzicht)

**De startpagina die er nooit was.** Er waren 26 schermen en geen enkele startpagina: `/analyses` deed
half dienst als dashboard, het merkdossier de andere helft, en wie inlogde wist niet waar hij moest
beginnen. `/merk/[id]` beantwoordt nu vier vragen op volgorde: hoe sta ik ervoor, wat wacht op mij,
ligt het plan op schema, waar begin ik. De wortel, de inlogactie en het woordmerk in de bovenbalk
wijzen er sinds deze ronde allemaal heen.

**De review-wachtrij komt terug, en dat draait een besluit terug.** Hij is op 3 augustus 2026 juist
weggehaald omdat hij bij meerdere clusters opliep tot tientallen regels in één kaart, waarmee het
overzicht zélf de rommel werd die het moest oplossen. Wat het deze keer wel kan laten werken is één
harde grens: maximaal vijf regels, alleen de staat `nu`, met een doorklik naar de rest. Loopt hij in de
praktijk tóch vol, dan is de volgende stap hem per cluster te tonen in plaats van opgeteld, niet hem
groter te maken.

**Twee nieuwe blokken, en allebei op dezelfde as als een bestaand scherm.** Funnel-voortgang toont per
fase van de klantreis hoeveel van de geplande pagina's live staan; de contentmix toont hoe het plan
verdeeld is over de paginatypes. Die mix telt op `planned_pages.page_type`, dezelfde as als "klikken
per paginatype" op Zoekverkeer. Twee schermen die "contentmix" zeggen en iets anders tellen is precies
de fout die deze bouwronde opruimt.

**Reservepagina's tellen nergens mee.** Op productie staan 264 geplande pagina's over 2 plannen,
waarvan een deel reserve is om in te schuiven als er iets afvalt. Die horen niet bij het maandtotaal
dat de klant afneemt (migratie 0049), dus ook niet bij de noemer van zijn voortgang. Zonder dat filter
staat een plan van 24 bestelde pagina's op "3 van de 30". Het scherm noemt de reserves apart, zodat
het verschil zichtbaar blijft.

**Een funnel houdt zijn eigen volgorde, ook als een fase leeg is.** Sorteren op aantal maakt van een
reis een ranglijst. En een fase zonder geplande pagina's blijft staan met 0 van 0 in plaats van weg te
vallen: stil verdwijnen is erger dan een leeg vakje, want dan ziet de klant niet dát die fase bestaat.
Een lege fase krijgt geen 0%, want dat suggereert achterstand waar niets gepland is.

**⚠️ Eén afwijking van het uitvoerplan, en met reden.** Dat plan schrijft in §4.1 de
periode-aanduiding "Maand {n} van 12" voor. Besluit 7 maakte het abonnement doorlopend opzegbaar, en
`plan-view.tsx` noemt sindsdien "maand 4 sinds de start", nooit "van 12": een noemer van twaalf is een
belofte over een looptijd die niet is afgesproken. Het overzicht volgt die eerdere beslissing.

**"Wat ORBIT ENGINE deze week deed" heet niet Engine Pulse en belooft geen autonomie.** Het is een
lijst afgeronde taken uit de wachtrij, geen animatie. Gegroepeerd per soort, want één meetronde is
dertig taken en dertig identieke regels duwen alles wat er verder gebeurd is uit beeld. Alle 24
taaksoorten hebben een zin in gewone taal, met een test die faalt zodra er eentje bijkomt zonder
vertaling: anders verschijnt `profile_llm_baseline` op het scherm van de klant.

**De middleware beschermde alleen `/analyses`.** Sinds de herindeling zit het merendeel van de app
onder `/merk`, en dat viel buiten die controle. Er lekte niets, want elke pagina roept zelf
`requireUser()` aan, maar een bezoeker zonder sessie kreeg een omweg via een server-render in plaats
van meteen het inlogscherm. Unittests 1437 naar 1465.

## 17 augustus 2026: de appstructuur, fase 6 (Admin en de afscherming)

**Wegvouwen is niet afschermen.** Interne stof stond op klantschermen, ingeklapt of onderaan: de
gespreksnotities onder "Vraagt jouw input", het compleetheidspercentage op het merkdossier, de
kostenroute op een adres dat te raden was. Allemaal netjes verstopt, en allemaal bereikbaar. Dan sta je
in een demo één misklik van een ongemakkelijk gesprek af. Alles staat nu op `/merk/[id]/admin`, met
Nova's negen secties als inhoudsopgave zodat je tijdens een demo weet welk scherm de klant voor zich
heeft terwijl jij naar de ruwe laag kijkt.

**Eén echte afscherming erbij die niemand miste.** `/api/analyses/[id]/costs` gaf de eigenaar van een
analyse zijn eigen kostenoverzicht, uitgesplitst per pijplijnstap, met de modelnamen erbij. Geen enkel
scherm linkte ernaartoe, dus het viel niet op, maar het adres was te raden en het antwoord was
volledig. Nu `isStaff`, met een 404 en geen 403.

**Drie lagen bewaken de grens, en dat is geen dubbelop.** De database geeft een klantsessie nul rijen
uit `jobs` en `ai_calls`, ongeacht wat een scherm vraagt. Elke afgeschermde route vraagt `isStaff()`.
En een broncodecontrole leest alle klantschermen na op modelnamen, bedragen, bewijscitaten en
promptinstructies.

**Die derde laag bestaat omdat het uitvoerplan een handmatige doorloop voorschreef.** "Log in als
klantaccount en loop alle dertien bestemmingen af" gebeurt één keer en daarna nooit meer, terwijl het
risico juist bij de vólgende wijziging ontstaat. De controle draait nu bij elke commit, naar het model
van de bestaande broncodecontrole op de twee remmen bij betaald werk.

**Die controle vond meteen twee dingen, en één ervan was een echt lek.** Drie schermen deden
`select("*")` op een tabel met een `raw_json`-kolom. Ze toonden die kolom nergens, maar met een `*`
reist de ruwe modeloutput wél mee in de paginabron. De kolommen staan er nu bij naam.

**De andere vondst was een fout in de controle zelf, en die is leerzaam.** De eerste versie verbood
`profile_field_sources` en `evidence_url` op klantschermen. Allebei te grof: de herkomstchip "uit je
website gehaald" leest die tabel en is juist een klantfunctie (Nova's `draftedBadge`), en `evidence_url`
bestaat op twee tabellen, waarvan er één naar de site van de klant zelf wijst. Een controle die een
goede functie sloopt is erger dan geen controle, dus de regel is aangescherpt tot wat écht intern is:
het bewijscitaat. Unittests 1465 naar 1505, ketentests 162 naar 167.

## 17 augustus 2026: de appstructuur, fase 7 (opruimen) en wat de ronde opleverde

**Het laatste dode hout weg.** `MainNav` had geen enkele importeur meer sinds de zijbalk er kwam, en
`NAV`, de platte bestemmingenlijst van vóór die zijbalk, werd alleen nog gelezen door dat component en
door het profielmenu. Dat menu toonde daarmee een tweede hoofdnavigatie naast de zijbalk, met andere
bestemmingen. Twee menu's met dezelfde belofte lopen gegarandeerd uit elkaar, en dat was hier al eerder
gebeurd. Het profielmenu gaat nu alleen nog over het account.

### Wat de zeven fases samen hebben veranderd

| | Vóór | Na |
|---|---|---|
| Zijbalk | 7 regels, uitklappend naar 15 bestemmingen, één kop met negen kinderen | 6 koppen, hooguit 3 kinderen per kop, alles tegelijk in beeld |
| Startpagina | geen | `/merk/[id]`, ook de bestemming van de wortel en van het inloggen |
| Merkprofiel | 5 schermen, 2 formulieren, 2 opslagroutes voor dezelfde 41 kolommen | 3 schermen, 1 formulier van 41 velden in 7 stappen |
| Bibliotheken | één per cluster, geen overzicht | één per merk met filters en paginering, plus de clusterlijst als doorklik |
| Clusterlijsten | "Clusters" en "Voorgestelde clusters" als twee menu-items | één lijst, lopend boven voorstellen |
| Analytics | bestond niet; cijfers zaten in het clusterdossier | 3 schermen over de clusters heen |
| Interne stof | verspreid over klantschermen, ingeklapt maar bereikbaar | één Admin-scherm, met drie lagen die de grens bewaken |
| Merkadressen | `/profielen/[id]/...` | `/merk/[id]/...`, met 14 permanente doorverwijzingen |
| Tests | 1257 unit, 160 keten | 1505 unit, 167 keten |

**Negen pure modules erbij**, allemaal omdat er iets te rekenen viel dat op het scherm niet te
controleren is: `redirects`, `profile-gaps`, `library`, `plan-bulk`, `origin`, `search-console/metrics`,
`plan-progress`, `activity` en `onboarding-insight`. Nul migraties, precies zoals het plan voorspelde:
alles leest uit tabellen die er al stonden.

### Wat deze ronde níet oplost, en dat hoort hier te staan

**De diagnose was "onoverzichtelijk", en die is hier vertaald naar de menustructuur en de
schermindeling.** Als de klacht in werkelijkheid over de hoeveelheid informatie ín een scherm gaat, dan
verplaatst deze ronde dat probleem opnieuw, net zoals de ronde van augustus dat deed. De toets die
daarbij hoort staat nog open: leg de nieuwe indeling voor aan de klant die het merkdossier een
vergaarbak noemde.

**De Google-sleutel ontbreekt nog.** Het zoekverkeer-scherm is volledig gebouwd (besluit 3b) en de
rekensom is nagerekend op de 91 rijen testdata, maar dat is testdata en geen klantdata. Drie
handelingen staan open: een service account aanmaken met de Search Console API aan,
`GOOGLE_SERVICE_ACCOUNT_JSON` in Vercel zetten, en het adres van dat account bij de klant aan zijn
property toevoegen. Pas daarna is de koppeling geverifieerd (conventie 10).

**Het contentplan linkt nog niet naar een geschreven pagina.** De terugknop kent drie herkomsten en
`?van=plan` is gebouwd en getest, maar het plan is nog geen derde ingang.

**De vormgeving botst nog steeds met de positionering.** Deze ronde veranderde de indeling, niet de
vormgeving. Zolang het open ontwerpbesluit in `designsystem.md` §9b staat, werkt het designsysteem
tegen de merkstrategie in.

## Het ontwikkelplan naar de visie, en de vier uitgangspunten die de volgorde bepalen (18 augustus 2026)

`visie.md` en `merkstrategie.md` legden op 17 augustus de bestemming vast, met de afstand tot de bouw
er eerlijk bij (drie punten in `visie.md`, vijf in `merkstrategie.md` §30). Hoe je die afstand
overbrugt stond er niet, dat staat nu in
[`tasks/ontwikkelplan-visie.md`](./tasks/ontwikkelplan-visie.md): zeven werkstromen, tien sprints in
vier fases, met per sprint de bestanden, het migratienummer, het verificatiecriterium en de
handelingen die buiten Claude Code om moeten gebeuren.

**De eerste versie zette de CMS-koppeling en de echte zoekvolumes vooraan, omdat de visie ze allebei
vraagt. De eigenaar heeft ze dezelfde dag naar achteren geschoven, vanuit vier uitgangspunten die nu
bovenaan het plan staan:**

1. **Publiceren blijft voorlopig handwerk.** Kopiëren, plakken, de URL invullen, als geplaatst
   markeren. Van den Udenhout is het eerste geval. Pas als die route zich bewezen heeft komt er een
   koppeling, sprint 9 in plaats van sprint 1. Het proces eromheen verandert niet: geschreven, door de
   poorten, goedgekeurd, dan geplaatst.
2. **Echte zoekvolumes schuiven mee naar achteren**, sprint 8, niet vanwege de prijs (zie hieronder).
3. **De app blijft draaien op alleen de OpenAI-sleutel.** Harde regel: elke externe koppeling is
   optioneel en stil afwezig, elke sprint krijgt een test die bewijst dat de app zich zonder die
   sleutel identiek gedraagt. Voor Gemini is dat al zo (`enginesForProfile()`), sprint 6 zorgt dat het
   bij die ene handeling blijft.
4. **De goedkeuringspoort vóór content live gaat verdwijnt nergens**, ook niet in de autonomiesprint,
   die gaat over meten, onderzoeken, schrijven en voorstellen. De publicatieknop blijft van een mens.

**Wat het herschikken aan het licht bracht, en corrigeerde een fout in de eerste versie.** Daar stond
dat de CMS-koppeling de effectmeting deblokkeert. Klopt niet: `markPublished()` plant de hermeetgolven
al in zodra iemand een URL invult, `checkPublication()` controleert de pagina daarna, de hele lus kan
met de hand op gang komen. Wat ontbrak was nooit de koppeling maar **één echte gepubliceerde pagina**
(`content_impact` heeft nul rijen). Sprint 1 is daarom geen bouwsprint maar een doe-sprint: de route
echt aflopen en repareren wat schuurt.

**Drie cijfers die de volgorde dragen**, alle nagerekend, niet uit documentatie overgenomen:

1. **$0,855 per meetronde.** Bij 50 clusters (de doelgroepomvang uit `visie.md`) is dat ~€43 per maand
   aan meting alleen, tegen een plafond van €50 per account per maand (`lib/spend-rules.ts`). De
   prijskaart is een hardere grens dan de techniek, de enige conclusie in het plan die geen code
   oplevert.
2. **`dimensions: ["date", "page"]`.** De Search Console-koppeling haalt geen zoekopdrachten op,
   terwijl migratie `0052` al schreef dat die "een tweede tabel waard zijn zodra ze echt gebruikt
   worden". De halve SEO-belofte, inclusief posities, ligt daarmee gratis binnen bereik: goedkoopste
   grote stap van het plan.
3. **$0,06 per 1.000 zoektermen.** Prijzen van vier zoekvolumeleveranciers zijn opgezocht (§6 van het
   plan). Bij 20 merken en 2.500 zoektermen per merk kost een maandelijkse verversing ~$3 bij
   DataForSEO, tegen ~$6.000 per jaar bij Semrush en gratis maar onbruikbaar bij Google zelf (zeven
   brede bakken zonder actieve advertentie-uitgaven). **Het uitstellen van sprint 8 is geen
   bezuiniging**, de rem zit op focus en een leverancier erbij, niet op geld.

**Wat de kalender bepaalt is wachttijd, geen bouwtijd.** Effect meten gebeurt in golven van 30 en 60
dagen na publicatie. De bouwschattingen zijn dagen (de appstructuur was zeven fases op één dag), de
verificatie is maanden. Vandaar sprint 1 vooraan: de klok gaat pas lopen als er één pagina live staat,
en handmatig publiceren houdt het aantal pagina's laag. Reken op maanden voor de eerste harde uitspraak
over "werkt dit", de prijs van eerst testen.

**Eén gevolg dat de verkoop raakt.** Door de koppeling naar achteren te schuiven blijft punt 1 van
`merkstrategie.md` §30, publiceren via het CMS, het langst onwaar van alle vijf. Tot sprint 9 mag die
belofte nergens in een campagne, op de website of in een demo staan.

Achttien handelingen in het plan wachten op iets dat Claude Code niet kan doen: een account bij een
externe partij, een betaling, of een afspraak met een klant. Ze staan in §4 op één plek bij elkaar,
met per regel waarom het niet automatisch kan.

**Diezelfde dag naar `main` gemerged**, met de leesbare pagina erbij als
`docs/tasks/ontwikkelplan_naar_eindproduct.html`, zelfstandig te openen zonder de Artifact-omgeving.
`CLAUDE.md` verwijst er sindsdien naar, direct onder de twee bestemmingsdocumenten, als de verdere
geplande doorontwikkeling naar het eindproduct.
## De Teamsessie: één onderdeel, vier tot zes experts, geen regel code (18 augustus 2026)

Er is een herbruikbare werkwijze om één onderdeel van de app door meerdere vakgebieden tegelijk te
laten doorlichten. Je zegt "start een Teamsessie voor de onboarding" en de rest gaat vanzelf:
`.claude/skills/team-session/SKILL.md` bepaalt het onderdeel, zoekt de bestanden op, kiest de experts,
laat ze onafhankelijk analyseren, vat samen, laat alleen bij een echt conflict twee experts op elkaar
reageren, en eindigt met hooguit vijf geprioriteerde verbeteringen. De elf vakgebieden plus de
tegenspraak staan als aparte experts in `.claude/agents/`.

**Drie keuzes, en waarom ze zo uitvielen.**

1. **Geen Agent Teams.** Dat mechanisme geeft elke expert een eigen Claude-sessie die met de andere
   praat, precies wat een brainstorm nodig lijkt te hebben. Het valt af op drie dingen: het staat
   standaard uit en is experimenteel, het werkt niet in een niet-interactieve sessie (Claude Code op
   het web dus niet), en de melding dat een expert klaar is draagt zijn uitkomst níet mee, waardoor de
   orkestratie stilvalt en gaat pollen. Het enige dat het echt biedt, experts die elkaar spreken, kan
   goedkoper: een expert die al gedraaid heeft kun je opnieuw aanspreken met zijn context intact, dus
   hij hoeft de code geen tweede keer te lezen.
2. **Geen `TEAM.md`.** Dat bestand bestaat niet als mechanisme. Claude Code schrijft zijn teamconfig
   zelf weg buiten het project en de documentatie zegt uitdrukkelijk dat je die niet moet
   voorschrijven.
3. **De bestanden één keer opzoeken in plaats van vijf keer.** De grootste kostenpost was niet het
   denken maar het zoeken: zonder maatregel gaat elke expert zelfstandig de onboarding zoeken. Nu
   staat per onderdeel in `references/onderdeelkaart.md` waar het staat, en krijgt iedereen dezelfde
   lijst mee. De sessie hieronder kostte daarmee ongeveer 483.000 tokens voor vijf experts plus een
   tegenspreker, plus twee korte debatantwoorden. Vier van de zes draaiden op het goedkopere model;
   alleen de zwaarst wegende expert en de tegenspreker kregen het dure.

**De eerste sessie draaide meteen, over de onboarding, en leverde één inzicht dat de werkwijze zelf
veranderde.** Vier van de vijf experts kwamen langs verschillende wegen bij hetzelfde uit: het profiel
gaat op `klaar` na taak 2 van de 8 (`prepare-profile.ts`), waarna het voortgangsscherm stopt en de
gebruiker vijf tot zes minuten op een dossier zit dat er af uitziet maar leeg is. Vier van de vijf
voelt als bewijs. De tegenspreker haalde dat onderuit met het logboek in de hand: twee volledige
onboardings op productie, acht van acht stappen klaar, nul mislukkingen. Elk faalpad in het rapport was
uit de code afgeleid en nooit waargenomen. **Zonder frequentie is prioriteit niet te onderbouwen**, en
die regel staat sindsdien in de skill: een P0 vereist een waargenomen probleem, een afgeleid faalpad is
hooguit P1.

Diezelfde tegenspreker vond wel iets dat wél hard is, en scherper dan het team het bracht: het
commentaar bij `NON_BLOCKING_TYPES` in `lib/jobs/progress.ts` zegt dat bij een mislukte aanbodstap
alleen het dienstenoverzicht en de topics wegvallen, maar `handlers.ts` hangt de marktstap aan de
aanbodstap, en markt draagt de kennistest en de synthese. Het besluit sneuvelt op zijn eigen argument.
Dat is één verplaatste regel, geen nieuw statusmodel, en het staat als openstaand werk in
`docs/tasks/roadmap.md`.

Een Teamsessie wijzigt nooit code. De schrijftools zijn tijdens de sessie weggehaald in plaats van
verboden, want een instructie is een intentie en code is een garantie (conventie 1), en elke expert
draait read-only. Wat je erna laat bouwen is een nieuwe opdracht.

## Twee stille degradaties in het voortgangsscherm (19 augustus 2026)

Twee losse reparaties, geen migratie, uitgevoerd vóór de fases van onboarding 3.0 omdat ze vandaag al
iets verkeerds tonen. Allebei komen ze uit de Teamsessie over de onboarding, en allebei hebben ze
dezelfde vorm: het scherm zegt "gelukt" waar de code "niets gevonden" bedoelde.

**De vier standen waren er wel, het scherm gebruikte er twee.** `research-steps.ts` kent per
onderzoeksstap vier standen (`klaar`, `bezig`, `wacht`, `overgeslagen`) en waarschuwt in zijn eigen
toelichting dat een stap die niets vond er anders uit moet zien dan een stap die iets vond.
`profile-progress.tsx` sloeg `klaar` en `overgeslagen` allebei plat tot `done: true`, dus een stap die
nul diensten of nul onderwerpen opleverde kreeg hetzelfde groene vinkje als een geslaagde stap. De
vertaling zit nu in `displaySteps()`, puur en getest (conventie 2), en `WorkInProgress` toont een derde
vorm: geen vinkje, een uitroepteken in de waarschuwingskleur, en de chip "niets gevonden". Het
afrondingsblok van het merkdossier deed dit al goed, dus het waren twee schermen die hetzelfde gegeven
verschillend lazen.

**De duurste stap toonde als klaar terwijl er nul vragen gesteld waren.** `llm-baseline.ts` schreef het
facet `llm_kennis` onvoorwaardelijk weg, ook als de budgetpoort alle engines oversloeg. De samenvatting
werd dan "Nog niet vastgesteld wat AI-assistenten over dit merk weten", een gevulde tekst;
`research-steps.ts` leest precies dat veld en zette de kennistest daarmee op `klaar`. De regel is nu:
geen enkel gemeten antwoord betekent geen samenvatting (`baselineFacetState()` in `baseline-verdict.ts`,
puur en getest). Het facet blijft wél staan, met `alles_overgeslagen` en het aantal overgeslagen vragen
erin, want alles bewaren is conventie 8. Wat er al stond uit een eerdere ronde telt mee, anders wist
een tweede, idempotente ronde de samenvatting van de eerste.

Na deze ronde: 1518 unittests en 167 ketentests groen.

## Onboarding 3.0, fase 1: het fundament onder de commerciële laag (19 augustus 2026)

Migratie `0060`, toegepast op productie en daar nagerekend: vijftien kolommen op `profiles`, één op
`profile_field_sources`, en een vierde herkomst. Nog geen nieuw scherm; dit is de laag waar fase 3 op
gaat staan.

**Twaalf commerciële velden en drie contactvelden.** Elk commercieel veld voldoet aan twee eisen: een
website kan het niet zeggen, en er is precies één pijplijnstap die er aantoonbaar beter van wordt. Die
lezer staat per kolom in het commentaar van de migratie, zodat een veld zonder lezer bij de volgende
ronde opvalt. De veldencatalogus gaat daarmee van 41 naar 56, in negen stappen in plaats van zeven, en
de test die in beide richtingen faalt bewaakt dat: elk veld in de catalogus is opslaanbaar, en elk
opslaanbaar veld staat in een stap.

**Eén veldenlijst, twee oppervlakken.** `CLIENT_STEPS` (zeven) is wat de klant zelf bewerkt,
`SESSION_STEPS` (negen) is wat de consultant mét de klant doorloopt. De commerciële laag en de
contactpersoon staan bewust níet in de klantwizard, de enige plek waar de twee oppervlakken met opzet
verschillen: "waar wil je op groeien" is een gesprek, geen invulveld dat iemand in zijn eentje
beantwoordt. Er komt geen tweede formulierdefinitie en geen tweede opslagroute; het besluit uit
`strategy-box.tsx` blijft staan.

**De volledigheidsmeter blijft de 41 klantvelden meten.** Een afwijking van het plan, met reden:
`csm-data.ts` gebruikt 80% van die meter om te bepalen of een dossier deelbaar is in een demo. Zouden
de vijftien nieuwe velden standaard meetellen, dan zakt élk bestaand merk in één klap onder die grens
en staat alles eeuwig in "wacht op jouw nakijkwerk". De meter accepteert nu een stappenlijst, zodat de
sessiepagina van fase 3 zijn eigen telling kan doen.

**De herkomstpoort zat er nog niet.** De opslagroute leidde de herkomst af uit het eigenaarschap:
bewerkte iemand anders dan de eigenaar, dan werd het `gesprek`. Een accountgenoot met schrijfrecht kon
zijn eigen invoer daarmee als gespreksuitkomst wegschrijven, onaantastbaar voor élke volgende
onderzoeksronde (`field-merge.ts` laat alleen `ai` overschrijven). `resolveWriteSource()` in
`lib/profile-source.ts` is nu de enige poort: `gesprek` en `consultant` vereisen staf, iedereen anders
schrijft `klant`, en een onbekende waarde wordt geweigerd in plaats van stil teruggezet.

Na deze ronde: 1544 unittests en 176 ketentests groen, migraties t/m `0060`.

## Onboarding 3.0, fase 2: wat de consultant klaarzet is nu beschermd (19 augustus 2026)

**Eerst het cijfer, want dat bepaalde de omvang.** Fase 2 begon met een telling op productie: hoeveel
merken die ná 3 augustus 2026 zijn aangemaakt eindigen nog steeds zonder bereik. Het antwoord is
**nul van de drie**. De vijf merken zonder bereik dateren allemaal van 30 juli, van vóór de reparatie
in `resolveScope()`, en zijn alle vijf gearchiveerde testmerken. Het bereikveld in het aanmaakscherm
vervalt daarmee: de pijplijn vindt het zelf, en een extra invoerveld zou een handmatige stap toevoegen
aan iets dat werkt.

**De aanmaakroute liet geen spoor na.** `POST /api/profiles` schreef nul rijen in
`profile_field_sources`, terwijl de bijwerkroute dat wél deed. Wat een consultant vóór het gesprek
typte was daarmee niet te onderscheiden van wat het model later vindt, dus `filterProtectedFields()`
blokkeerde niets en het eerste onderzoek mocht het gewoon overschrijven. Precies het scenario waarvoor
migratie `0039` gemaakt is, en precies het scenario dat hij niet dekte. De route legt nu per gevuld
veld een rij vast met bron `consultant`. Alleen gevulde velden: een lege waarde vastleggen als "door de
consultant gezet" zou het onderzoek blokkeren op iets wat er niet is, en dan blijft dat veld voorgoed
leeg.

**Mensinvoer ging langs de normalisatie heen.** Modeluitvoer ging door `resolveScope()` en een getypte
waarde niet, terwijl `service_regions[0]` letterlijk in zes kennistestvragen wordt geplakt. "
Amersfoort  " kwam er dus zo in te staan, en 'lokaal' zonder één plaatsnaam leverde een bereik op waar
`prompts.ts` niets mee kan. Beide routes normaliseren nu hetzelfde: bij het aanmaken en bij het
onderzoek.

**Een aanname is geen feit, ook niet in de prompt.** Het intakeblok droeg het model op om álles wat er
al stond te RESPECTEREN. Voor wat de klant zelf zei is dat juist; voor een aanname van vóór het eerste
contact legt het het marktonderzoek stil, want een klantwaarde mag niet tegengesproken worden. Het
blok is nu gesplitst in `lib/pipeline/intake-block.ts`, puur en getest: bevestigde waarden blijven
leidend, consultantwaarden gaan mee als startpunt dat het onderzoek expliciet mag tegenspreken.
Ontbreekt de herkomst, dan telt een waarde als bevestigd; een aanname per ongeluk als feit behandelen
kost een verrijking, andersom laat het model de klant tegenspreken en dat is de duurdere fout.

De ketentest draait dit nu van begin tot eind: een merk aanmaken zoals de route dat doet, het echte
onderzoek erop met een gestubd model dat de consultant met opzet tegenspreekt, en daarna narekenen wat
er in de database staat. De branche, het bereik en de concurrenten van de consultant staan er nog; de
samenvatting en de bewijspunten die hij leeg liet komen wél van het onderzoek.

Na deze ronde: 1566 unittests en 187 ketentests groen.

## Onboarding 3.0, fase 3: de onboardingsessie (19 augustus 2026)

Het scherm waar consultant en klant samen aan tafel zitten: `/merk/[id]/admin/onboarding`, staf-only,
en het enige stafscherm dat bedoeld is om te delen. Nul migraties.

**De veldweergave is gedeelde code geworden**, en dat is de kern van deze fase. `brand-field-input.tsx`
rendert één veld met zijn label, uitleg, voorbeeld en herkomstchip, en zowel de klantwizard als de
sessie gebruiken hem. Zonder die stap was er een tweede formulier ontstaan met dezelfde velden, precies
wat `strategy-box.tsx` in 2026 al afwees: een tweede plek waar iets kan verouderen. De sessie definieert
geen enkel veld zelf, en een test faalt als dat verandert.

**Het scherm opent met wat we níet weten.** `profile-gaps.ts` sorteert de open punten nu op gevolg in
plaats van op veldvolgorde: het bereik bovenaan, want dat is het enige punt waarvan de fout pas ná een
betaalde meetronde zichtbaar wordt, en de bewijspunten onderaan, want die raken pas de tekst. Zonder
die volgorde kost het gesprek een uur aan het bevestigen van dingen die al klopten, en dat is het uur
waar de klant voor betaalt.

**Opslaan gaat per veld, niet met een knop onderaan.** Drie standen per veld, en een mislukte opslag
laat de getypte waarde staan met een knop om het opnieuw te proberen. Stil terugdraaien naar de oude
waarde is de duurste fout die dit scherm kan maken: dan typt de consultant het opnieuw zonder te weten
dat het de eerste keer ook al niet lukte. De klantwizard houdt zijn knop, want daar past hij.

**Elk veld kan op niet van toepassing**, via dezelfde route en dezelfde tabel als de herkomst. Geen
tweede opslagroute. Zo'n veld telt als behandeld, valt uit de gatenlijst, en wordt door een
onderzoeksronde niet alsnog gevuld.

**De meter toont drie getallen**: samen bevestigd, door ORBIT ENGINE gevonden, nog open. Een
consultantwaarde telt daarin als gevonden en niet als bevestigd; anders ziet een merk waar nog nooit
iemand mee gesproken is eruit als een merk dat je al hebt doorgenomen.

**`/merk/[id]/admin` heet nu Diagnose** en draagt alleen nog techniek: welke taken draaiden, hoe lang,
wat er faalde, wat het kostte. De volledigheidsmeter en het gespreksblok zijn naar de sessie verhuisd,
want dat is werk en geen diagnose.

⚠️ **Het Admin-hoofdstuk mag voortaan vier bestemmingen hebben in plaats van drie.** Het plan telde er
drie en vergat "Alle merken", dat er al stond. Besloten op 19 augustus 2026 door de eigenaar, na een
keuze tussen samenvoegen en oprekken: drie van de vier gaan over dít merk en de vierde is de uitgang
naar de app als geheel, dus geen vergaarbak van vier gelijksoortige regels. Een vijfde bestaat niet
zonder eerst iets samen te voegen, en voor de klanthoofdstukken blijft drie de grens. Beide grenzen
staan in `scripts/test-unit.ts`.

**Wat er nog niet in zit:** de knop "het onderzoek bijwerken" uit het afrondblok. Die hangt aan
`onboarding-refresh.ts`, en dat is fase 4. Het afrondblok toont nu wat er open staat en of het gesprek
is vastgelegd.

Na deze ronde: 1634 unittests en 191 ketentests groen.

## Onboarding 3.0, fase 4: het gesprek verandert de uitkomst (19 augustus 2026)

Zonder deze fase is de onboardingsessie een archief. De consultant legt vast dat het merk landelijk
werkt in plaats van lokaal, en de vragen die de meting straks stelt zijn nog steeds gegenereerd op de
gok van het model. Nul migraties.

**Niet alles opnieuw, maar precies wat er anders van wordt.** `lib/pipeline/onboarding-refresh.ts`
rekent per gewijzigd veld uit welke stappen opnieuw moeten draaien. Van de vijftien velden uit migratie
`0060` veranderen er tien niets aan wat er te ónderzoeken valt; die worden pas bij de volgende meting
of contentronde gelezen. Ze staan expliciet op nul in de tabel in plaats van te ontbreken, zodat de
test kan vaststellen dat dat een keuze was. Een gewijzigd bereik laat de vragen en de kennistest
opnieuw draaien, een gewijzigde concurrent alleen de marktstap.

**De knop staat achter dezelfde kostenpoort als al het andere betaalde werk**, en de raming staat in
het bevestigvenster en niet op het scherm: de klant kijkt mee. Die zin wordt gebouwd in de pure module,
zodat er in het sessiescherm zelf geen bedrag voorkomt en de broncodetest dat kan bewaken.

**Een stap kan nu los draaien.** De onboardingketen zat in de geslaagde tak van elke handler: de
aanbodstap plande de markt in, de markt de kennistest, de kennistest de synthese. Eén gewijzigde
concurrent zou daarmee de twee duurste stappen meeslepen. Een taak krijgt daarom `chain: false` mee
als hij vanuit het gesprek is ingepland.

**En daarmee is het punt uit de Teamsessie ook opgelost.** `profile_offering` telde als
niet-blokkerend omdat de klant bij een mislukking alleen zijn dienstenoverzicht mist, maar diezelfde
stap plande de markt in, en de markt draagt de kennistest en de synthese. Mislukte hij definitief, dan
verdween de halve onderzoeksketen zonder één foutmelding: het besluit sneuvelde op zijn eigen argument.
De opvolger staat nu in `lib/jobs/chain.ts` en die tabel geldt in beide takken, ook als een stap
opgeeft. Een ketenscenario laat een aanbodstap definitief mislukken en kijkt of de markt daarna alsnog
ingepland staat.

**De vragen worden vervangen, niet verwijderd.** Bij een herdraai gaan de oude vragen op inactief. Een
`delete` zou via de foreign key de metingen meenemen, en dan is de trendlijn weg om een correctie op de
vraagstelling, dezelfde aanpak als spoor R. En alleen voor analyses waar nog niets gemeten is: bij een
lopende meting zou een nieuwe vragenset de trendlijn breken, geen beslissing die iemand onbedoeld hoort
te nemen vanaf een gespreksscherm. Een regel die het plan niet noemt.

**Het verwarringblok van de kennistest vult nu de uitsluitingslijst voor.** Dat blok meet al sinds de
eerste onboarding of de merknaam ambigu is, en bewaarde de uitkomst nergens. De namen worden er
deterministisch uit gelezen (een opsomming is te lezen zonder model, conventie 1) en voorgesteld als
`name_exclusions`, alleen als die lijst nog leeg is: op die lijst staan betekent dat de meting
vermeldingen van dat bedrijf niet meetelt, en een voorstel dat een eerdere correctie overschrijft zou
de score stil verlagen.

**Elf van de twaalf commerciële velden hebben nu een lezer.** De vier sturingsvelden gaan naar de
onderwerpvoorstellen, de groeiregio's naar de vragengeneratie, de bezwaren naar de schrijfopdracht, het
offline bewijs naar de feitenbank met "opgegeven in het gesprek" als bron, de verboden onderwerpen naar
een deterministische controle náást de verboden woorden, de uitsluitingen naar de
vermeldingsclassificatie, en het jaardoel, de seizoenen en de structuurkeuze naar het rapport dat het
contentplan vult.

⚠️ **`deal_value_band` heeft géén lezer gekregen, en dat is een afwijking van het plan.** De migratie
noemt de potentiescore, en dat blijkt bij het bouwen niet te kloppen: die score is per onderwerp en de
waardeklasse is per merk, dus een factor zou élk onderwerp van een merk even hard verschuiven. De
onderlinge volgorde, het enige waar die score voor gebruikt wordt, verandert daar niet van, terwijl de
schaal van 0 tot 100 en de drie banden eronder wél kapotgaan. Het veld wordt vastgelegd en getoond; een
lezer krijgt het pas als er een beslissing is die merken onderling vergelijkt.

Na deze ronde: 1693 unittests en 202 ketentests groen.

## Onboarding 3.0, fase 5: zien waar elk merk staat (19 augustus 2026)

Nul migraties. `/beheer` sorteerde op achterstand, de vraag van ná de verkoop. De vraag ervóór, "welk
merk kan ik nu demonstreren en welk merk wacht op een gesprek", was nergens te zien, terwijl het
product sales-led is en die vraag het werk van de dag bepaalt.

**Vier fases, afgeleid en niet opgeslagen** (`lib/profile-stage.ts`): Voorbereiden, Klaar voor het
gesprek, Gesprek gehad, Overgedragen. Een kolom die je met de hand bijhoudt loopt achter op de
werkelijkheid, en dan kijk je in een beheerscherm naar een status die niet meer klopt.

**De volgorde waarin de fases beoordeeld worden is de hele logica**, en twee gevallen dwongen hem af.
Een merk kan overgedragen zijn zonder dat er ooit een gesprek is vastgelegd, en dan is "wacht op een
gesprek" onzin: de klant werkt er al zelf in. En ná het gesprek plant het afrondblok van fase 4 nieuw
onderzoek in, dus er staat werk open terwijl het gesprek al geweest is; "voorbereiden" zou dan precies
het verkeerde signaal zijn. Overdracht wint dus van gesprek, en gesprek van onderzoek.

⚠️ **Afwijking van het plan.** Deel B4 leidt "overgedragen" af uit `account_id` én `assigned_at`.
`account_id` is sinds migratie `0046` al bij het AANMAKEN gevuld, anders vindt het contentplan geen
pakket, dus dat veld staat altijd, ook bij een merk waar nog nooit iemand mee gesproken is. De
overdracht zit in `assigned_at`, en dat is hier leidend.

**Op `/beheer`** staat de fase als chip bij elk merk, met een filter "alleen merken die op een gesprek
wachten" en een directe link naar de onboarding voor de merken waar dat de volgende stap is. De
bestaande sortering op achterstand blijft leidend: de fase is een tweede as en geen vervanging. **Op
het merkoverzicht** staat voor staf één regel bovenaan met de fase en de eerstvolgende handeling. Voor
de klant verandert er niets.

Na deze ronde: 1703 unittests en 202 ketentests groen.

## Onboarding 3.0, fase 6: opruimen en op één lijn (19 augustus 2026)

De afsluiting van het traject. Geen nieuw gedrag, wel drie dingen die anders binnen een maand
uiteenlopen.

**Vastgelegd waarom de klant 41 van de 56 velden ziet.** Dat is de enige plek waar het
klantoppervlak en het consultantoppervlak met opzet verschillen, en zonder die reden in het commentaar
herstelt iemand het over drie maanden als een vergeten stap. "Waar wil je op groeien en waar juist
niet" is een gesprek, geen invulveld dat een ondernemer in zijn eentje beantwoordt, en het antwoord
stuurt wat ORBIT ENGINE gaat voorstellen en schrijven.

**`APP_FLOW_DOCUMENTATION.md` heeft een zesde hoofdstuk gekregen**: de onboarding van begin tot eind,
zonder techniek. Van het merk klaarzetten tot een klant die zelfstandig in zijn profiel werkt,
inclusief de zes blokken van het gespreksscherm en de twee dingen die er nog niet in zitten. Dat
laatste met opzet: het document mag nergens beloven wat er niet is.

**Het planbestand is weg.** `docs/tasks/onboarding-3.0.md` is verwijderd nu alle zes de fases gebouwd
zijn, met een regel in de vertaaltabel bovenaan dit logboek zodat de verwijzingen in de code en in de
migratie nergens meer heen wijzen. Dat is de afspraak voor alles in `docs/tasks/`: af is weg,
samengevat hier. `architecture.md` §5 en §11 dragen de sessie en de bijwerkstap nu in de pijplijntabel
en in de klantreis, `ux-design.md` §5 het schermontwerp en de fase van een merk, `supabase/README.md`
de migratie, en `CLAUDE.md` de bijgewerkte tellers.

**Wat het hele traject heeft opgeleverd**, in één alinea: de veldencatalogus ging van 41 naar 56
velden in negen stappen, waarvan er vijftien alleen uit een gesprek kunnen komen. Er is één nieuw
scherm, de onboardingsessie, het enige stafscherm dat bedoeld is om gedeeld te worden. Wat daar wordt
vastgelegd verandert daadwerkelijk wat de pijplijn daarna doet, en wat er niets aan verandert draait
ook niet opnieuw. De veldweergave is gedeelde code, dus er is geen tweede formulier ontstaan. En twee
stille degradaties die er los van stonden zijn onderweg gerepareerd: een stap die niets vond toonde
als geslaagd, en de duurste stap toonde als klaar terwijl het budget op was.

Eindstand: 1703 unittests en 202 ketentests groen, migraties t/m `0060`, alle vier de vaste controles
groen.

## Het formulier praat de taal van de branche (19 augustus 2026)

Van de 56 velden hebben er 45 een voorbeeld, en die waren stuk voor stuk geschreven vanuit één
fictieve autodealer: "Van Mossel Automotive", "Wij zorgen dat iedereen in de regio zorgeloos kan
rijden", "Sinds 1934, 9 vestigingen, 400 medewerkers". Voor een fysiotherapiepraktijk of een
advocatenkantoor leest dat als een formulier dat voor iemand anders is gemaakt, precies het gevoel dat
je in een demogesprek niet wilt.

**Dertien branches plus een algemene terugval**, elk met eigen voorbeelden voor 19 velden. 247 teksten
in totaal, in `lib/pipeline/brand-examples.ts`. De 19 velden zijn gekozen op één vraag: verandert het
antwoord wezenlijk per branche? Een sitemapadres en een plaatsnaam zien er bij een tandarts hetzelfde
uit als bij een garage, en daar een tweede voorbeeld voor schrijven levert onderhoud op zonder
opbrengst.

**De indeling komt van de concurrent, met drie correcties.** InSpace toont op hun site elf branches
(E-commerce, Leadgeneratie, Maakindustrie, Financieel, Advocaten, Tandartsen, Zorg, Vastgoed,
Automotive, Mode, Sieraden). Die lijst is gemaakt voor landingspagina's op zoekwoorden, niet om een
formulier te vullen: Mode en Sieraden vullen dezelfde velden in als elke andere webshop, Tandartsen
dezelfde als elke andere zorgverlener, en Leadgeneratie is een kanaal en geen branche. Samengevoegd tot
zes, en er zijn er zeven bij gekomen die het Nederlandse MKB dragen en bij hen ontbreken: bouw en
installatie, horeca en recreatie, opleiding, persoonlijke verzorging, transport, software en zakelijke
dienstverlening. Een installatiebedrijf is hier een waarschijnlijker klant dan een juwelier.

**Het langste trefwoord wint, niet het eerste.** Zonder die regel belandt een bouwmarkt bij bouw in
plaats van bij retail en autoschadeherstel bij schade in plaats van bij automotive. Eén regel in plaats
van een zorgvuldig gerangschikte lijst die bij de eerste toevoeging weer omvalt. De bedrijfsnaam telt
mee naast de branchetekst: "Installatiebedrijf Van Dijk" zegt het al in zijn naam, ook als het
onderzoek er "technische dienstverlening" van maakte.

**Past een merk nergens in, dan is er een terugval in twee stappen**: eerst het bedrijfsmodel (een
fabrikant lijkt meer op een fabrikant dan op niets), en anders de algemene voorbeelden die er altijd al
stonden. Nooit een lege plek, en nooit een voorbeeld uit een andere wereld.

⚠️ **Bewust geen voorbeelden per klant laten schrijven door de AI.** Dat kost ongeveer een cent per
merk en klinkt aantrekkelijk, maar botst op de belangrijkste belofte van dit product: niets in beeld
dat nergens op gebaseerd is. Een verzonnen voorbeeld dat te echt oogt ("Sinds 1998, drie vestigingen,
twaalf therapeuten") laat de klant corrigeren wat wíj bedacht hebben, precies het vertrouwen waar
alles op drijft. Een vaste lijst kan dat niet: geschreven, nagelezen, getest, en kost niets in gebruik.

Na deze ronde: 1739 unittests en 202 ketentests groen.

## Een voorbeeld alleen waar het iets toevoegt (19 augustus 2026)

Direct na de vorige ronde nagelopen welke velden een voorbeeld verdienen, want een voorbeeld overal is
geen service maar ruis. **Tien van de 45 zijn weggehaald.** De maatstaf: kan de vraag zonder dat
voorbeeld twee kanten op, in lengte, specificiteit of vorm? Zo ja, blijft het staan. Zo nee, vertelt het
grijze regeltje niets en kost het wel leesbaarheid.

Weg zijn: je eigen bedrijfsnaam, de naam van je auteur, de naam van je contactpersoon, een e-mailadres,
een telefoonnummer, twee plaatsnaamvelden, de naam van een concurrent, de vrije slotvraag (daar stond
een vraag als voorbeeld, geen voorbeeld) en de lijst met schrijfwijzen van je naam, waar het voorbeeld
letterlijk een woord uit de uitleg erboven herhaalde. Bij een lijstveld verschijnt in plaats daarvan
het bestaande "Toevoegen…".

**Twee verzonnen bedrijfsnamen per branche zijn eruit**, 26 teksten in totaal: het merk zelf
("Autobedrijf De Vries") en een concurrent ("Autopalace Zuid"). De tweede was het bezwaarlijkst: een
verzonnen concurrent in een grijs vakje leest als een suggestie van ons over de markt van de klant, in
het scherm waar hij naast je zit.

**En een fout die pas in gebruik zichtbaar wordt.** Bij een lijstveld staat het voorbeeld in het vakje
waar je één regel toevoegt, niet boven de lijst. Daar stonden opsommingen van vier ("Verlichting,
meubels, woontextiel, decoratie"), die lezen als "typ ze allemaal achter elkaar", waarna het hele
aanbod in één regel belandt en de meting één onderwerp ziet in plaats van vier. 28 voorbeelden
teruggebracht tot één ding per regel. Een test bewaakt het nu: een voorbeeld bij een lijstveld heeft
minder dan drie komma-onderdelen.

Na deze ronde: 1744 unittests en 202 ketentests groen, 35 velden met een voorbeeld, 247
branchevoorbeelden.

---

## Eén iconenset in plaats van 63 losse lettertekens (21 augustus 2026)

**De aanleiding was een oordeel, geen bug:** de tekens in de app pasten niet bij ORBIT ENGINE. Dat
klopte, en de oorzaak lag dieper dan de vorm. Er wás geen iconenset, en dat was ooit met argumenten
zo besloten: `lib/nav.ts` schreef dat een set "een bibliotheek, een kleurregel en een tweede manier
om betekenis over te brengen" vraagt, voor zes koppen in de zijbalk.

**Dat argument gold niet meer, want het bleef niet bij zes koppen.** Geteld op de dag zelf:
✓ ✕ ○ · ☰ ▾ ▲ ▼ ↗ ← → ↑ ↓ ⚙ – ! stonden op **40 regels JSX**, plus 23 regels in `lib/nav.ts`, plus
twee met de hand getekende SVG's in het profielmenu met elk hun eigen lijndikte (1,6 en 1,8). Bij
die aantallen is "geen set" ook een set, alleen dan zonder regels.

**Het zwaarste bezwaar is er een dat je op je eigen scherm niet ziet.** Een letterteken heeft geen
vaste vorm. Heeft het paginalettertype de glyph niet, dan haalt het besturingssysteem er een uit een
ander font, en dat font verschilt per platform. De vier tekens waarmee de zijbalk zijn hoofdstukken
aanduidde (◉ ▣ ◆ ◈) zagen er dus bij elke klant anders uit, in een product dat volgens
`merkstrategie.md` §15.1 "precies, rustig, premium" hoort te zijn en dat sales-led op één gedeeld
scherm verkocht wordt.

**Gekozen: Lucide** (ISC-licentie, gratis, ruim 1.600 iconen, waarvan er 27 in gebruik zijn), via
`lucide-react`. Lijn, geen
vulling, één raster, en het icoon erft `currentColor`, zodat de betekenislaag van
`designsystem.md` §2.3 de enige plek blijft waar kleur betekenis krijgt. De keuze per betekenis
staat in `lib/icons.ts`, de maat en de lijndikte (1,75, tussen de 1,6 en 1,8 van de handgetekende
SVG's in) in `components/icon.tsx`. `docs/designsystem.md` §6b legt de regels vast en §8 heeft er
een negende regel bij gekregen.

**De keuzes volgen de merkstrategie, niet de gewoonte.** §15.5 vraagt om netwerken, lagen en
verbindingen: vandaar oplopende punten met verbindingen ertussen bij Strategie. §15.4 verbiedt de
AI-clichés: vandaar géén glittertje en géén brein. En Instellingen kreeg schuifjes in plaats van een
tandwiel.

⚠️ **Nog dezelfde dag bijgesteld: alleen de hoofdstukken krijgen een icoon, de bestemmingen niet.**
De eerste versie gaf elke regel in de zijbalk er een, zestien in totaal, waarbij de kop op 18 pixels
stond en de bestemming op 16 in gedempt grijs. Op papier een nette hiërarchie, in gebruik het
tegenovergestelde van wat een icoon moet doen: zestien tekeningen in een balk van zestien regels
markeren niets meer, want als alles opvalt valt niets op. Het icoon van de kop hoort het verschil te
dragen tussen "een van de zes vaste plekken in de app" en "een pagina daarbinnen", en dat verschil
verdwijnt zodra beide er een hebben. De bestemming staat al ingesprongen achter een lijn.

Daarmee vervielen zestien van de 43 betekenissen in `lib/icons.ts`. Die zijn weggehaald in plaats
van ongebruikt te blijven staan; er blijven 27 over. `NavItem` heeft geen icoonveld meer, zodat het
niet ongemerkt kan terugkomen, en een test bewaakt dat.

**Eén keuze is tijdens de bouw teruggedraaid.** Strategie begon als een route-icoon, semantisch het
beste, maar op 18 pixels leek dat te veel op de schuifjes van Instellingen, en juist met een
ingeklapte zijbalk staan die twee vlak bij elkaar in dezelfde kolom. Het werd oplopende punten met
verbindingen ertussen: even goed te verdedigen en wél te onderscheiden.

**En een les die het opschrijven waard is: handmatig zoeken vond twee derde.** Na de eerste ronde
van 26 regels leek het werk af. Een `grep` op de betreffende Unicode-blokken, nu vastgelegd als
vierde controle in `designsystem.md` §11, vond er nog **veertien**: vier terug-links, vier `→`
achter een tekstlink, vier verplaatspijlen en twee stijg- en daalpijlen bij een cijfer. Ruim een
derde van het totaal, in één commando. Precies hetzelfde patroon als bij de inline-kleuren van
6 augustus: een regel zonder controle is een voornemen.

Na deze ronde: 27 betekenissen, 46 icoongebruiken over 38 bestanden, 1752 unittests en 202
ketentests groen.

---

## 22 augustus 2026 · Het crawlplafond: niet 150 pagina's meer, maar de juiste 150

**Het cijfer dat deze ronde droeg: 26 tegen 0.** Bij gasservice-brabant.nl, een echt profiel op
productie, telt de sitemap **449 pagina's**. We lazen er 150 en noemden dat "voldoende": die 150 waren
de eerste in sitemapvolgorde, en daarin staat de sectie `/kennis` met 222 artikelen vooraan. Resultaat:
van de **26 dienstenpagina's** zat er **geen enkele** bij, het aanbod van een cv- en
warmtepompbedrijf werd afgeleid uit kennisartikelen. Na de wijziging komen alle 26 binnen, met de
homepage vooraan.

Ter vergelijking het andere profiel op productie, udenhout.nl: 130 pagina's, past ruim, selectie exact
zoals hij was. Deze wijziging doet niets bij een klant die past, en dat is de bedoeling.

**Wat de aanleiding was, en waarom het antwoord niet "meer pagina's" is.** De vraag kwam binnen als
"wat als de klant veel meer pagina's heeft". Een Teamsessie met vijf experts kwam op iets anders uit:
het plafond van 150 was niet eens de nauwste doorgang. De aanbod-aanroep mag 55.000 tekens mee en elke
pagina is afgekapt op 1.500, dus passen er ~35, en welke 35 besliste één regel: sorteren op
tekstlengte. Omdat élke pagina op 1.500 is afgekapt staan alle langere pagina's precies gelijk en
besliste de volgorde waarin Postgres ze teruggaf; de pagina's die die 1.500 halen zijn juist
blogartikelen, een dienstenpagina van 900 tekens verloor. Meer pagina's ophalen had daar niets aan
veranderd.

**Zes wijzigingen, in volgorde van hoeveel ze opleveren.**

1. **De sitemaps worden volledig uitgelezen**, parallel in rondes van acht (7,7 seconden voor 449
   URL's bij gasservice-brabant.nl). De enige manier om te weten hoe groot een site is, en dus de
   voorwaarde voor al het andere.
2. **De plekken worden over de secties verdeeld** (`url-priority.ts`). Elke sectie krijgt eerst een
   quotum, pas daarna gaan de vrije plekken naar de hoogste score, anders wint de grootste sectie
   altijd: een blog van 2.000 artikelen bevat gegarandeerd 150 artikelen die net hoger scoren dan de
   onderste dienstenpagina.
3. **Hetzelfde geldt voor de aanbod-aanroep** (`page-select.ts`), om beurten uit elke sectie binnen het
   tekenbudget in plaats van de langste eerst.
4. **`profiles.sitemap_total_urls` en het oordeel `afgekapt`** (migratie `0061`). Het cijfer dat
   nergens bestond en zonder hetwelk "knelt het plafond?" niet te beantwoorden was: 1 van de 3
   beoordeelde profielen zat op precies 150.
5. **`profile_pages.source`**, zodat een mens pagina's kan toevoegen die een crawlronde overleven.
6. **De inventaris wordt in blokken van 25 weggeschreven** in plaats van in één alles-of-niets insert.
   Bij swapfiets.nl kostten twee rotte pagina's ooit alle 22; de oorzaak van díé keer is verholpen, het
   patroon niet, en het werd erger naarmate de crawl groeide.

**Eén AI-aanroep erbij, en alleen waar hij iets verandert.** Overwogen: een model met web search naar
alle dienstenpagina's van de klant vragen, de dure en onbetrouwbare kant van een goed idee. Een model
dat naar URL's gevraagd wordt vult patronen aan (`/diensten/sportmassage` komt terug ook als de pagina
`/behandelingen/massage` heet), en web search kost per aanroep het twintigvoudige. De sitemap heeft die
URL's al, gratis en zonder gokken. Wat een model wél toevoegt is het oordeel: van de 60 secties op deze
site draagt `/behandelingen` het aanbod en `/blog` niet. `crawl-focus.ts` stelt precies die vraag, over
40 regels tekst in plaats van 8.000 URL's, voor ~$0,01, alleen als de site niet past. Alles wat het
model teruggeeft dat niet in de aangeboden lijst stond, verdwijnt in code (conventie 1).

**Wat er stil afkapte, meldt zich nu.** Drie plekken gooiden zonder een woord dingen weg: de
tekenlimiet van de prompt, de bewijscontrole en `MAX_NODES`. Alle drie zetten nu een regel in de
gespreksagenda, uit code en niet uit zelfrapportage van het model: een model dat niet weet dat er iets
is weggegooid kan dat ook niet melden.

**En de URL-laag heeft eindelijk tests.** Die stond in `lib/crawler.ts`, dat begint met `import
"server-only"`, dus `test-unit.ts` kon er niet bij en geen enkele regel was gedekt, zelfs de valkuil
die het commentaar zélf benoemde (`product-category-sitemap.xml` mag niet als productsitemap tellen)
was onbewaakt. De pure functies staan nu in `lib/crawl-urls.ts`. De ketentest kreeg een scenario dat
een te grote site nabootst en aantoont dat een handmatig toegevoegde pagina de crawl overleeft, de
achtste fout in de samenhang die geen unittest kon vangen.

**Nog niet gedaan, bewust.** `MAX_NODES` van 60 staat er nog. Of dat plafond knelt is nu meetbaar (het
aantal afgekapte knopen wordt geteld en gemeld) maar nog niet gemeten, en een plafond verhogen zonder
cijfer is een mening. Zie sprint 7 in `tasks/ontwikkelplan-visie.md`.

Na deze ronde: migraties t/m `0061`, 1819 unittests en 211 ketentests groen.

---

## 22 augustus 2026 · Mijn reputatie, sprint R1 tot en met R3

Een **nieuw, apart betaald onderdeel** onder Analytics: hoe praat AI over je, waarom, en kiest AI jou
of je concurrent naast elkaar? De meting zegt of je genoemd wordt, de kennistest of AI je kent, het
bronnenlandschap wat je markt bepaalt, allemaal over aanwezigheid, niet over toon.

Volledig plan in `docs/tasks/mijn-reputatie.md`; hier waaróm de bouw is zoals hij is.

**Dit is de tweede keer dat sentiment gemeten wordt, en de eerste keer leverde het niets op.** Tot
migratie `0029` mat elke meting `sentiment` per vermelding: over **650 rijen** kwam `negative` nooit
voor, `positive` bij precies één analyse (antwoorden op koopvragen sommen bedrijven neutraal op). Dit
onderdeel vraagt rechtstreeks naar toon en bewust ook naar klachten. **Of dat variatie oplevert is een
aanname tot sprint R4 het op een echt merk nagerekend heeft.**

**Het gevaarlijkste dat dit product kan doen: een onzichtbaar bedrijf geruststellen.** Een taalmodel is
standaard vriendelijk over wat het niet kent. De toon staat daarom nooit alleen: bewijskracht ernaast,
een antwoord zonder bron telt niet mee (`lib/reputation/score.ts`). Verwachte uitslag bij een
MKB-bedrijf: "toon +65, bewijskracht 10", een advies (verzamel reviews) en geen compliment.

**Het volgorde-effect wordt gemeten, niet aangenomen.** Een taalmodel bevoordeelt wie het eerst genoemd
wordt. Vier maatregelen: deterministische rotatie, de klant precies drie keer op elke plek over twaalf
knopen, chip `indicatief` op drie van de vier vergelijkingen, en `order-bias.ts` telt achteraf de
afwijking (bij vier partijen is 25% de verwachting, >20 punten erboven zet álles op indicatief).

**Analytics kreeg een vierde bestemming**, zoals Admin op 19 augustus: de andere drie tonen bestaande
data, dit is een los, apart betaald product. Geen vijfde zonder samenvoegen, getest.

**Twee afwijkingen van het plan**, beide omdat het plan de verkeerde uitkomst gaf: de rotatie hangt aan
de plek in de vastgelegde scope, niet aan een hash (die verdeelt maar *ongeveer* gelijk, even scheef
als het probleem); de eenduidigheid trekt één standaardfout af in plaats van 1,96, anders kwam
driemaal hetzelfde antwoord uit op 49 in plaats van 74, even misleidend als 100.

**De ketentests zijn hier het zwaartepunt.** Zes taaksoorten die op elkaar wachten, meer samenhang dan
elders in de app, en zeven van zeven eerdere fouten zaten in precies die samenhang. **46 ketentests**
erbij: synthese draait laatste en precies één keer, dubbel starten stelt geen vraag opnieuw, mislukte
beoordeling herhaalt niet de dure vraag, merk zonder concurrenten levert `rank_score: null`, merk
zonder aanbod krijgt een nette weigering, budget dat halverwege volloopt offert de vergelijking en
behoudt de basisanalyse. `callPlain()` kreeg hetzelfde teststopcontact als `callStructured()`, anders
slaat de test precies het te testen stuk over.

**Kosten:** ketentest €0,00. Geschat ~$0,54 per standaardanalyse, plafond €3 hard in code. ⚠️ Berekend
uit tarieven, **niet nagerekend tegen `ai_calls`**, nog geen echte run.

**Wat nadrukkelijk nog niet gebeurd is:** migratie `0062` nog niet op productie, vlakheidstoets en
volgorde-toets uit R4 open, diepe modus uit R5 doet nog hetzelfde als standaard. R5 begint pas als R4
goed uitvalt.

Na deze ronde: migraties t/m `0062` (repository, nog niet productie), 1954 unittests, 257 ketentests
groen.


---

## 23 augustus 2026 · Mijn reputatie, sprint R4: de eerste echte run

Eén run op **Van den Udenhout ('s-Hertogenbosch)**, standaardmodus, 34 vragen, nul mislukte taken.
Conventie 10 in de praktijk: gebouwd, 263 ketentests groen, en de eerste echte run legde **zeven
fouten** bloot die geen test ving. Zes zaten in code die precies deed wat beschreven stond; de regel
zelf had een gat.

### Wat er gemeten is

| | Geschat | Gemeten |
|---|---|---|
| Aanroepen | 68 | **66** |
| Kosten | $0,54 (uitschieter $0,68) | **$0,75** |
| Doorlooptijd | 6 tot 9 minuten | **31,6 minuten** |

Het AANTAL aanroepen klopte. De prijs per gegronde vraag niet ($0,021-0,023 in plaats van $0,015,
precies het risico dat §5 al benoemde: web-zoeken telt opgehaalde pagina's als invoer mee). Ruim
binnen het plafond van €3.

⚠️ **De doorlooptijd was drie keer zo lang, architectonisch verklaard.** De wachtrij doet exact één
zware taak per minuut (`HEAVY_JOB_RESERVE_MS` houdt 220 van 240 seconden vrij), dus "met de knopen
parallel" uit §5 gaat niet op; de reservering staat er terecht (voorkomt 504's bij contentgeneratie).
Schermteksten noemen nu een halfuur.

### De vlakheidstoets is GESLAAGD

Tot migratie 0029 leverde sentiment in **650 rijen geen enkele keer** `negative` op. Nu, over 17
beoordeelde antwoorden:

| toon | aantal |
|---|---|
| gemengd | 10 |
| overwegend positief | 3 |
| negatief | 1 |
| positief | 0 |
| onbekend | 0 |

Merkcijfer **+4, neutraal**, niet vriendelijk. Bezwaren zijn concreet (bereikbaarheid, wachttijden,
kosten, diagnoses): een vraag die naar nadelen vraagt, levert nadelen op.

### De volgorde-toets: het vangnet mat zichzelf blind

ChatGPT kende twee van de vier vergeleken partijen niet, en een partij zonder plaats kan nooit eerste
worden:

| | eerste geworden |
|---|---|
| eerstgevraagde was gekend | 7 van 11 = **63,6%** |
| eerstgevraagde was onbekend | 0 van 33 = 0,0% |
| samen (wat de code mat) | 7 van 44 = **21,9%** |

Op 21,9% lijkt vooraan staan schadelijk; het echte cijfer is 63,6%. De meting mat hoe vaak het model
lokale concurrenten kent, niet of vooraan staan loont, en dit getal bepaalt of een plaats als uitslag
of indicatie op het scherm komt.

### De zeven fouten

1. **De concurrentkeuze las een kolom die niet bestaat**: nul vermeldingen overal, terugval op
   alfabet.
2. **Eén vermelding beslechtte de derde plek** ("Alfa Romeo" won op de letter A). Nu een ondergrens
   van twee, zoals Concurrenten al hanteert.
3. **Een verzonnen bron verhoogde de bewijskracht**: `vandenudenhout.nl` (klant zit op `udenhout.nl`)
   telde mee als externe bron, die het zwaarst wegen.
4. **Een uitspraak over reviews gold als pluspunt**: "niet uitsluitend negatief" is circulair.
5. **Een strategische knoop woog lichter dan opvulling** (prioriteit 5-7 tegen een vaste 10), dezelfde
   fout als de kennistest op 4 augustus.
6. **Het volgorde-effect werd gemaskeerd**, zie hierboven.
7. **Een duel werd als marktpositie gepresenteerd**: "eerste van twee" als HARDE uitslag terwijl drie
   rotaties binnen de marge lagen. Nu pas uitslag bij minstens drie bekende partijen.

Vijf van de zeven zijn **stille degradaties**: geen foutmelding, gewoon een verkeerd getal dat goed
oogt, precies waar dit onderdeel vangnetten tegen heeft, en ze zaten ín die vangnetten.

### De bevinding die geen fout is, en het meest voor het product betekent

⚠️ **ChatGPT kent de echte lokale concurrenten van een MKB-bedrijf niet.** Autobedrijf De Twee en SDL
Automotive kwamen in **nul van de acht** oordelen als bekend terug.

Onvoorziene bias: onbekende concurrenten laten de vergelijking automatisch winnen door wie wél bekend
is, meestal een grote naam. Zonder ondergrens kiest het systeem stelselmatig fabrikanten en ketens, en
meet blok V dan de bekendheid van het model, niet de markt van de klant.

De reparatie maakt de uitkomst eerlijker, niet rijker: dit merk krijgt voortaan "niet vergeleken
kon worden", een bruikbare bevinding op zich. Maar **blok V zal bij een regionaal MKB-bedrijf vaak
leeg blijven**.

### Wat er nog niet gecontroleerd is

De zeven reparaties zijn getest (1996 unittests, 263 ketentests) maar **niet opnieuw op een echte run
nagerekend**: geen tweede meting bevestigt dat de bewijskracht daalt en het volgorde-effect 63,6%
meldt in plaats van 21,9%. R4 is geslaagd op zijn twee toetsen, de nasleep staat open.

Na deze ronde: migraties t/m `0062` (op productie), 1996 unittests en 263 ketentests groen.


---

## 23 augustus 2026 · Mijn reputatie v2: zeven verbouwingen, en één ervan teruggedraaid

Na sprint R4 lag de vraag voor welke technische optimalisaties de meting beter maken. Zeven gebouwd,
getest op **Gasservice Brabant** dezelfde dag. Zes hielden stand, één werd binnen tien minuten door de
werkelijkheid onderuitgehaald.

### Wat de run liet zien

| | v1 (Van den Udenhout) | v2 (Gasservice Brabant) |
|---|---|---|
| Doorlooptijd | 31,6 minuten | **9 minuten** |
| Kosten | $0,75 | **$0,48** |
| Mislukte taken | 0 | 0 |

Drie keer sneller en een derde goedkoper bij meer gemeten. Tijdwinst komt volledig uit de wachtrij:
netwerkgebonden zwaar werk mag nu met drie tegelijk in plaats van één per minuut.

### De marktvraag is de grootste winst

De benoemde vergelijking is niet meer het hoofdmechanisme; nu de vraag die een koper stelt: *"Ik zoek
dit in die regio, welke bedrijven raad je aan?"*

Uitkomst: genoemd bij **38% van de koopvragen, gemiddeld op plek 2,6 van 6**. ChatGPT noemde **tien
lokale installatiebedrijven** buiten onze opgelegde set; van de drie zelf gekozen concurrenten kwam er
maar één ook echt voor. Precies waarvoor dit blok bestaat: wie AI noemt, ís de concurrent, en die set
corrigeert zichzelf.

### ⚠️ Het gedeelde bewijscorpus voor dienstvragen was een denkfout

De redenering leek sterk: één onderzoeksronde tegen hetzelfde materiaal voorkomt dat een verschil
tussen diensten aan de zoekmachine ligt in plaats van aan reputatie. **Alle twaalf dienstvragen
antwoordden "geen betrouwbaar beeld"**, een meetartefact: dezelfde vragen mét eigen zoekactie leverden
bij Van den Udenhout wél zes- tot tienduizend tekens met zeven tot elf bronnen.

De fout: **verschillende zoekresultaten per dienst zijn niet de ruis maar het signaal** (weinig over
warmtepompen, veel over cv-ketels is een echt verschil in reputatie). Een gedeeld corpus kan dat niet
beantwoorden; per dienst vullen betekent alsnog twaalf keer zoeken. Teruggedraaid; het corpus blijft
als achtergrond (de reviewcitaten zijn goed materiaal en er toch al).

### Vijf reparaties, waarvan vier veroorzaakt door de nieuwe blokken zelf

1. **De bronnenlijst ging over de markt, niet de klant**: 113 van 191 URL's kwamen uit markt- en
   vergelijkingsvragen, gaf een bewijskracht van 100/100 die eigenlijk over de KLANT moet gaan.
2. **Het merkblok stuurde vijftien aanroepen tegelijk weg**: zeven kwamen terug, acht sneuvelden stil
   in `allSettled`, wat de basis halveerde die de herhalingen juist betrouwbaarder moesten maken.
3. **De onderzoeksstap bewaarde zijn ruwe antwoorden niet**, dus bij een te dun corpus viel niet vast
   te stellen of dat aan het materiaal lag of aan de knipstap (conventie 8).
4. **Dezelfde partij onder drie schrijfwijzen telde als drie.**
5. **Een citaat gold als eigenschap** ("afspraken niet nagekomen" naast "Komen afspraken niet na!");
   nu een apart veld `citaten`.

### Wat er meteen goed werkte

De ondergrens van twee vermeldingen leverde drie echte installatiebedrijven op in plaats van de
fabrikant uit de alfabetische tiebreak. De verdeeldheid werkt: *"Bij 7 van de 10 vragen noemt ChatGPT
zowel lof als kritiek"* in plaats van kaal "neutraal". En er staat voor het eerst een
betrouwbaarheidsmarge onder het hoofdcijfer.

### De les die twee runs achter elkaar bevestigen

Beide runs legden stille degradaties bloot die geen test had gevangen (zeven bij v1, vijf bij v2, één
in de redenering zelf). Wat werkt: bouwen, één echte run, resultaat regel voor regel nakijken tegen de
antwoorden. Geen enkele fout kwam uit de 2052 unittests of 282 ketentests, die bewaken dat een
reparatie blijft zitten, ze vinden hem niet.

Na deze ronde: migraties t/m `0063` (op productie), 2052 unittests en 282 ketentests groen.

## 23 augustus 2026: sprint R5, de tweede meting naast de eerste

Het onderdeel Mijn reputatie wordt verkocht op herhaling: over een kwartaal nog een keer, en dan het
verschil. Dat maakt de vergelijking het commercieel belangrijkste stuk van de module én het
gevaarlijkste, want een pijltje omhoog bij een verschil dat ruis is, is een leugen met een grafiekje
eromheen.

De rekenkunde is daarom niet nagebouwd maar hergebruikt: `changeIsMeaningful()` uit
`lib/stats/uncertainty.ts`, dezelfde functie die het dashboard en het periodeverslag gebruiken. Nieuw
is `lib/reputation/compare.ts` met drie sloten, alle drie in code en niet in een prompt:

1. **Een andere meetlat levert nooit het woord "veranderd" op.** Werkt OpenAI het model bij, dan
   verschuift de lat en niet de reputatie. `instrument_version` moet aan beide kanten gelijk zijn.
2. **Geen marge, geen uitspraak.** Zonder standaardfout aan beide kanten valt niet te zeggen of een
   verschil buiten de ruis valt, en dan blijft het leeg (conventie 3).
3. **Een gewijzigde scope levert een kanttekening op.** Andere diensten gemeten betekent een deels
   andere vraag. Daarvoor wordt `scope_json` bij de start vastgelegd.

Het getal waar het om draait: de run op Gasservice Brabant had een toon van 47 met een standaardfout
van 2,6. Twee van zulke metingen naast elkaar hebben een drempel van ongeveer 7 punten, dus zeven
punten verschil is nog steeds "gelijk gebleven", de zin die het scherm dan toont. Voor de twee cijfers
zonder standaardfout gelden vaste drempels: tien punten bewijskracht (ruwweg één hele bron erbij of
eraf), en twee van de drie marktantwoorden (één omgeslagen antwoord is 33 procentpunt en dus ruis).

Daarnaast is de diepe modus aangesloten op de startknop: twaalf aanbodknopen tegenover vijfentwintig,
met per optie wat het kost. Bij een merk met vier diensten levert diep niets extra's op en dat staat er
ook, want een duurdere knop die hetzelfde doet is het snelste wat vertrouwen kost.

Bij het aansluiten bleek de schermtekst nog "ongeveer 34 vragen" te beloven terwijl de herziening van
v2 er ongeveer 50 van maakte. Gecorrigeerd op het scherm, op de knop en in `architecture.md`.

Na deze ronde: 2077 unittests en 287 ketentests groen, migraties t/m `0063`. **Nog te verifiëren op
productie:** twee runs op hetzelfde merk naast elkaar. Er is er één, de tweede moet nog draaien.

## 23 augustus 2026, laat: de tweede run op Gasservice Brabant, en drie fouten in de meting zelf

De run draaide compleet door: 51 van de 51 vragen, geen kanttekeningen, $0,97. Daarmee is bewezen dat
de uitval van de ochtend (3 van de 15 merkbrede vragen, en de samenvatting die niet geschreven kon
worden) aan de bestedingslimiet lag en niet aan de koppeling.

De uitkomst zelf was slecht, en op een manier die alleen zichtbaar wordt door hem naast de vorige te
leggen:

| | ochtend | avond |
|---|---|---|
| toon | 47 | 0 |
| verdeeldheid | 5 | 50 |
| marge op de toon | 2,6 | **0** |
| verdeling | 18× overwegend positief, 1× gemengd | **24× gemengd, verder niets** |

### Fout 1: het vangnet sloeg door, en vlak is vlak

De reparatie van de ochtend zei: lof met twee of meer echte bezwaren erin is geen lof maar een gemengd
beeld. Bij dit merk somt het model in vrijwel elk antwoord meer dan twee bezwaren op, dus het vangnet
vuurt bij élk antwoord. Resultaat: 24 van de 24 antwoorden hetzelfde etiket, dezelfde ziekte als 's
ochtends, alleen op een ander etiket. Een label dat bij 24 antwoorden nooit verandert draagt nul
informatie, en de toonindex van precies 0 die eruit rolt is geen meting maar een rekenkundig gevolg.

De diepere oorzaak is niet de drempel maar de bron: het aantal minpunten dat het model opsomt is deels
een gevolg van onze eigen vraagstelling, want wij vrágen om nadelen. Nog niet gerepareerd; daarvoor
moeten eerst de 24 oordelen zelf naast hun antwoorden gelegd worden.

### Fout 2: een marge van nul leest als zekerheid en betekent blindheid

Alle 24 labels gelijk betekent spreiding nul betekent standaardfout nul. Op het scherm staat dan een
cijfer zonder marge, alsof het exact is. Erger: de vergelijking met een volgende meting deelt door die
marge, dus élk verschil zou "echt veranderd" heten.

De ondergrens komt nu uit de schaal zelf. Het model kiest een van de labels en die liggen 50 punten uit
elkaar, dus de echte toon wordt afgerond op de dichtstbijzijnde 50. De spreiding van zo'n afronding is
de stapgrootte gedeeld door de wortel uit 12; bij 24 antwoorden levert dat 2,9 punten op in plaats van
0.

### Fout 3: de trefkans stond op de verkeerde noemer

`HIT_RATE_MIN_DELTA` was 0,66, gebaseerd op de aanname dat de marktvraag drie keer gesteld wordt. Hij
wordt ook per dienst gesteld, dus het zijn er ongeveer vijftien en de kleinste stap is 7 procentpunt. De
sprong van 0,17 naar 0,36 die deze twee runs lieten zien was daarmee onzichtbaar gebleven, en dat is
juist het commercieel scherpste getal van het hele product. De vaste drempel is vervangen door
`binomialStderr()`, dezelfde functie die de zichtbaarheidsscore zijn bandbreedte geeft. Daarvoor moet
de noemer bewaard worden: migratie `0064`.

### Fout 4, en dit is de pijnlijkste: het ophogen van de promptversie was vergeten

`instrument_version` bestaat om precies één ding te voorkomen: dat een wijziging in de meetlat als een
wijziging in de reputatie op het scherm komt. Beide runs staan op `v2`, terwijl de oordeelsregel er
tussenin veranderd is. Zonder ingrijpen zou de app netjes melden dat de reputatie van Gasservice
Brabant met 47 punten is gekelderd. Het merk is niet veranderd, de regel wel.

Opgehoogd naar `v3`, en de eerste ketentest die eraan hangt controleert nu de hele sleutel in plaats
van alleen of er "v2" in staat, zodat vergeten opnieuw rood wordt.

De les van de dag, voor de derde keer op rij: elke fout hierboven is gevonden door de uitkomst van een
echte run regel voor regel na te lopen, en geen enkele door de 2081 unittests of de 287 ketentests.

## 23 augustus 2026, avond: wat de vierentwintig oordelen letterlijk zeiden

De vierentwintig oordelen van de tweede run naast hun bezwarenlijstjes gelegd. Dat weerlegde mijn
eigen eerste conclusie. Ik noemde het vangnet "doorgeslagen", alsof het te streng was afgesteld. Dat
was het niet: het telde de verkeerde dingen mee.

In vrijwel elk bezwarenlijstje stonden twee wezenlijk verschillende soorten door elkaar:

1. **Echte ervaringen**, en die zijn scherp: "scheef aangesloten rookgasafvoer", "geen controle van de
   gasdichtheid volgens de klant", "afspraak bij een gemeld gaslek niet nagekomen", "onverwacht hoge
   reparatierekening zonder voorafgaande prijsindicatie".
2. **Uitspraken over ons eigen bewijs**: "weinig onafhankelijke, dienstspecifieke klantfeedback over
   elektrische warmtepompen", "nauwelijks of geen specifieke ventilatiereviews", "de actuele steekproef
   op Klantenvertellen is klein", "specifieke zonneboilercertificering niet gevonden", "de meest
   inhoudelijke ketelreviews zijn inmiddels zes à zeven jaar oud".

Soort 2 is geen kritiek op het bedrijf. Het is ChatGPT die zegt dat hij niets kon vinden. Zo'n regel
als bezwaar meetellen doet drie dingen fout: hij duwt de toon omlaag zonder aanleiding, hij zet op het
scherm een "zwak punt" waar de ondernemer niets mee kan, en hij verspilt de waardevolste bevinding die
dit product kan opleveren. Want "over vier van je twaalf diensten zegt ChatGPT letterlijk dat er geen
onafhankelijk bewijs te vinden is" is een verkoopgesprek, terwijl "zwak punt: nauwelijks
ventilatiereviews" een raadsel is.

`pointKind()` scheidt ze nu, in code en niet in de prompt (conventie 1), op zinsdelen die letterlijk
uit deze run komen en niet zijn bedacht. Bij twijfel geldt een punt als ervaring, want een echt bezwaar
dat als bewijsopmerking wordt weggezet verdwijnt uit het cijfer en dat is de duurdere fout.

Drie gevolgen:

- **Het vangnet telt alleen nog echte bezwaren.**
- **Er is een spiegel bij gekomen.** Een etiket moet de inhoud volgen in beide richtingen: lof met vijf
  bezwaren is geen lof, en kritiek zonder één concreet bezwaar is geen kritiek. Zonder die tweede helft
  is het vangnet een eenrichtingsklep die het cijfer stelselmatig omlaag duwt, en dan is de vleierij
  vervangen door zwartkijken. Het antwoord dat de doorslag gaf had acht lofpunten en als enige bezwaar
  "de actuele status van de certificering kan niet worden bevestigd".
- **De bewijsopmerkingen worden een eigen bevinding**: staat er bij twee of meer antwoorden zo'n regel,
  dan komt er een kanttekening bij de run die zegt bij hoeveel antwoorden ChatGPT zelf aangeeft niets
  te kunnen vinden, met erbij dat dat over vindbaarheid gaat en niet over kwaliteit.

### Wat dit over de meetopzet zelf zegt

Er zit een aanname onder het hoofdcijfer die deze run onderuit haalt. De standaardfout wordt berekend
uit de spreiding tússen antwoorden, alsof dat vierentwintig onafhankelijke waarnemingen zijn. Dat zijn
het niet: alle vierentwintig antwoorden citeren dezelfde handvol reviews. Dezelfde scheve
rookgasafvoer komt in vijftien antwoorden terug. Vlakheid tussen antwoorden over hetzelfde merk op
hetzelfde moment is dus geen fout in het instrument, het is te verwachten, en een spreiding van nul
betekent niet "zeker" maar "één bron, vierentwintig keer herhaald".

De ondergrens onder de standaardfout vangt de ergste gevolgen daarvan af. De structurele oplossing is
de bewijskracht als maat voor zekerheid gebruiken in plaats van de spreiding tussen antwoorden. Dat
staat nog open.

Promptversie naar `v4`. 2100 unittests en 290 ketentests groen.

## 23 augustus 2026, nacht: de derde run bevestigt de reparaties, en legt een grens bloot

Derde run op Gasservice Brabant, met de reparaties van de vorige twee rondes erin (promptversie `v4`).
Uitkomst: `tone_stderr 3,1`, `market_hit_rate 0,33` op 12 vragen, `evidence_score 99` op 18
onafhankelijke domeinen.

De echte antwoorden nagelezen om zeker te zijn. Twee dingen bevestigd:

- **Geen bewijsopmerking meer tussen de zwakke punten.** Alle bezwaren in deze run zijn echte
  ervaringen: een scheve rookgasafvoer, een niet nagekomen afspraak bij een gaslek, een onverwacht
  hoge rekening zonder prijsindicatie, klachten over facturering en incasso. `pointKind()` doet zijn
  werk.
- **De marge is niet meer nul.** 3,1 punten bij 22 bruikbare antwoorden, precies wat de ondergrens uit
  de vorige ronde voorspelt.

Alle 22 oordelen kregen opnieuw het etiket `gemengd`. Dit keer is dat GEEN fout: elk antwoord noemt
zowel zes tot acht échte sterke punten (deskundige monteurs, netjes werken, snelle service) als
meerdere terugkerende klachten (dezelfde rookgasafvoer, dezelfde gasdruk- en gasdichtheidscontrole die
ontbreekt, dezelfde afspraak bij een gaslek, dezelfde facturerings- en incassoklacht, in bijna elk
antwoord opnieuw). Dat is geen instrument dat blind is voor verschil, dat is een merk waarbij AI
structureel dezelfde combinatie van lof en kritiek naar boven haalt.

Wat het wel blootlegt: `toneScore("gemengd")` is altijd exact 0, of het bezwaar nu één milde
prijsopmerking is of vijf klachten waaronder een veiligheidsgerelateerd punt. Die twee wegen niet even
zwaar, en de schaal ziet het verschil niet. Geen fout van deze ronde maar een grens die al in `tone.ts`
zit sinds het begin (`"Er is geen -1"`). Voor een volgende ronde: het aantal en de soort bezwaren laten
meewegen in het cijfer, niet alleen in het etiket.

Klein openstaand punt: twee van de vijftien merkbrede vragen en één van de drie vergelijkingen
leverden niets op, terwijl de kosten met $0,86 ruim onder het budget van €3 bleven. Dus geen
budgetkwestie meer maar iets aan de kant van OpenAI zelf. Niet dringend, wel iets om te blijven volgen.

Sprint R5 hiermee afgerond en geverifieerd.

## 23 augustus 2026: Mijn reputatie compleet, het bouwplan verwijderd

Alle vijf sprints gebouwd en op drie echte runs op Gasservice Brabant geverifieerd. `docs/tasks/mijn-reputatie.md`
en zijn leesbare versie `mijn-reputatie.html` zijn verwijderd, hun plek staat in de vertaaltabel bovenaan dit
document. Wat nog openstaat, is geen bug maar een productkeuze voor een volgende ronde en niet ingepland: het
etiket `gemengd` scoort in `lib/reputation/tone.ts` altijd exact 0, ongeacht hoeveel of hoe zwaar de bezwaren in
een antwoord zijn. Bij Gasservice Brabant maakte dat geen verschil tussen een antwoord met één milde
prijsopmerking en een antwoord met vijf klachten waaronder een veiligheidsgerelateerd punt. Een volgende ronde
zou het aantal en de soort bezwaren laten meewegen in het cijfer zelf, niet alleen in het etiket.

Migraties t/m `0064` op productie, 2100 unittests en 290 ketentests groen.

## 24 augustus 2026: het merkoverzicht ingekort, en twee cijfers die niet konden kloppen

**De ronde begon als een UX-doorloop van `/merk/[id]` en legde onderweg twee echte fouten bloot.**

**"240% van de gemeten vragen".** De chip rekende met `som(prompt_weight)`: dat gewicht (volumeband ×
koopwaarde, 0,02-1,0) is geen aandeel, vier koopklare vragen tellen op tot 2,4. Bij Van den Udenhout
stonden zes kansen op 240%, 150%, 120%, 80%, 50%, 50% boven een zichtbaarheid van 0%, precies het getal
dat een klant terugvraagt. Nu een telling: "raakt 4 van de 30 gemeten vragen" (noemer uit de gewone
meting van de laatste periode). De gewichtssom blijft als sorteersleutel, komt nooit meer in beeld.

**"V1 en V2 hebben gewicht 0,60."** Vijf van de zes aanbevelingen begonnen zo: het rapportmodel kreeg
gemiste vragen aangeleverd als V1/V2/V3 met gewicht en nam die notatie over in klantteksten. De
schrijfopdracht verbiedt het nu, `lib/recommendation-text.ts` is het vangnet (conventie 1): schrapt
hele zinnen, niet losse woorden (een vraagcode is meestal het onderwerp), met een uitzondering voor een
staartclausule achter een puntkomma. Op alle zes productieteksten blijft een bruikbare zin over; blijft
er niets over, dan staat er niets.

**Het scherm zelf: van tien blokken naar zes, volgorde om.** "Waar begin je" stond als tiende onder vijf
blokken toelichting; nu stand → wat op je wacht → waar je begint → verdieping. Maandinzichten zijn
duiding ín de stand-kaart, funnel en contentmix in één kaart in plaats van vijf, activiteitenblok
ingeklapt (langste blok, geen handeling).

**Het hoofdgetal stond er vier keer, in drie schalen** (subkop, stand-kaart, mijlpalen,
maandinzichten). Subkop noemt het niet meer, `lib/insights.ts` laat het weg bij een eerste meting; bij
twee metingen blijft het (gaat dan over het verschil, nieuwe informatie).

**De mijlpalen zijn gezakt, niet verdwenen** (besluit 7 blijft): stonden pal onder het hoofdcijfer met
in maand 1 alle drie op nul, wat het tegenovergestelde deed van wat het blok moet.

**Vier kleinere dingen.** De werkregel-chip volgt nu de soort werk (alles stond op amber, "Bekijk wat
er mis is" leek op "Nakijken"). Elk blok in een eigen `SectionErrorBoundary`. Laadstaat volgt nu de
vorm van de pagina eronder. "En nog 7 kansen" wijst nu naar de clusters.

**Nagerekend tegen opgeslagen data** (conventie 10): de gewichtssommen van `udenhout.nl · Auto
financieren` (2,40 · 1,50 · 1,20 · 0,80 · 0,50 · 0,50 · 0,30) matchen exact de oude schermpercentages,
worden nu "raakt 6 van de 46 gemeten vragen" zonder vraagcode of gewicht.

Migraties ongewijzigd (t/m `0064`), 2132 unittests en 290 ketentests groen.

## 24 augustus 2026: het contentplan doorgelicht als scherm, zes ingrepen

Een UX-review van Strategie > Contentplan bij Van den Udenhout, het eerste merk met een vol plan: 120
pagina's, tien per maand, twaalf maanden vooruit. Zes bevindingen, en de eerste twee waren geen
vormkwestie.

**Je kon niet lezen wat je goedkeurde.** Een pagina met de status "wacht op jouw akkoord" toonde een
paarse goedkeurknop en nergens de geschreven tekst. De verwijzing lag er wél
(`planned_pages.content_piece_id`, gevuld door `linkPlannedPage()`), het leesscherm bestond al, en
`lib/origin.ts` had sinds 17 augustus zelfs de herkomstwaarde `plan` klaarstaan voor precies deze link,
met een terugknop die naar het contentplan wijst. Alleen legde niemand hem. De titel is nu een link en
er staat een knop "Lezen" naast "Tekst goedkeuren". Eén pad levert een pagina op die om akkoord vraagt
zonder gekoppelde tekst (`alreadyDone` in `app/api/cron/plan/route.ts` zet alleen de status om); die
regel zegt nu waar de tekst wél staat in plaats van te zwijgen.

**Twee verschillende handelingen heetten allebei "goedkeuren".** Een maand vrijgeven zet betaald
schrijfwerk in gang, een tekst goedkeuren zegt dat hij gepubliceerd mag worden. Op het scherm stond
daardoor een groene chip "Goedgekeurd" op maand 1 met twee amberkleurige rijen "Wacht op jouw akkoord"
eronder. Een maand wordt nu **vrijgegeven**, een tekst **goedgekeurd**.

De andere vier: de maandkop telde het filterresultaat en niet de maand, zodat er "Maand 1 · 2 pagina's"
stond bij een plan van tien per maand. Twaalf koppen droegen geen kalendermaand, terwijl elke pagina
een publicatiedatum heeft. De weergave "Alles" was 120 kaarten van gelijk gewicht, ongeveer twaalf
schermlengtes; maanden staan nu dicht behalve de lopende en alles wat om een handeling vraagt. En
"Verwijderen" liep zonder één vraag door, terwijl "markeer als geplaatst" een volledige bevestiging
kreeg, dus de rem zat op de verkeerde knop.

De rekenkunde staat in `lib/plan-overview.ts` (conventie 2: puur, zonder `server-only`), met 26 nieuwe
unittests. Geen migratie, geen wijziging aan de pijplijn. De regels die hieruit volgen voor elke lijst
van deze omvang staan in `docs/ux-design.md` §5.

Samen met het merkoverzicht hierboven op main: 2158 unittests en 290 ketentests groen.

## 24 augustus 2026: op "Vraagt jouw input" stonden tien vragen die je niet kon beantwoorden

De aanleiding was één zin bij een schermafdruk: "er zijn 10 open vragen maar ik kan helemaal geen
antwoord geven". Klopte. Het scherm telde in de kop "10 open", toonde tien vragen, en had er nul
invoervelden onder.

**De oorzaak zat niet in het scherm maar in de herkomst van die tien regels.** De synthese schrijft in
`raw_json.gaps` wat het onderzoek niet kon vaststellen, en de prompt zegt er letterlijk bij wat dat is:
"de agenda van het gesprek met de klant", gesprekspunten voor de consultant. Ze kwamen op het
klantscherm terecht als platte tekst naast de feitenvragen, die er wél uitzien als vragen en er wél een
invoerveld bij hebben. Twee soorten regels die er hetzelfde uitzien en zich tegengesteld gedragen, met
een teller erboven die ze bij elkaar optelde.

**De oplossing: een open punt is geen aparte soort, het is een feitenvraag zonder rij.** De synthese
schrijft ze nu weg in `fact_requests` (merkbreed, `analysis_id is null`, `scope: 'merk'`), en dan pakt
het bestaande scherm ze op via de route die er al lag. `lib/pipeline/gap-questions.ts` doet de
normalisatie ervoor: opsomtekens eraf, witruimte samen, hoofdletterongevoelig ontdubbeld, niets langer
dan 200 tekens en hoogstens twaalf. Op productie ging het om drie merken met 12, 10 en 10 open punten;
die van Van den Udenhout is de lijst uit de schermafdruk.

**Eén ding gaat er níet mee mee, en dat is de belangrijkste keuze van deze ronde.** Een beantwoorde
feitenvraag wordt óók een regel in `profiles.proof_points`, en zo'n regel krijgt in de feitenbank de
bron "site <url>". Voor een open punt is dat onwaar: de klant vertelde het net, het stond nergens op
zijn site. Erger nog, de synthese vraagt ook naar dingen als "welke drie klantgroepen krijgen komend
jaar de hoogste commerciële prioriteit", en dat hoort geen citeerbare bewering in een gepubliceerde
pagina te worden. Antwoorden op deze vragen slaan die tweede kopie daarom over. Er raakt niets
verloren: `buildFactBase()` leest de beantwoorde vraag zelf al, mét de juiste bron ("klant, bevestigd
<datum>"). Het merkje waaraan de route dat ziet is `raw_json.bron = 'synthese-gap'`.

**Vier kleinere dingen in dezelfde ronde, alle vier fouten en geen smaak.**

- **Een mislukte database-vraag toonde een groene kaart.** Beide queries werden niet op fouten
  gecontroleerd, dus een storing leverde lege data op en lege data betekende "niets open". De klant
  kreeg goed nieuws te zien op het moment dat de app zijn vragen niet kon ophalen.
- **Velden op "niet van toepassing" kwamen terug als open punt.** `findGaps()` werd hier zonder de
  n.v.t.-lijst aangeroepen, terwijl de onboardingsessie hem wel meegaf. Precies waar migratie `0060`
  voor waarschuwde: anders haalt de lijst nooit nul en wordt hij genegeerd.
- **Overgeslagen vragen waren onzichtbaar.** Het scherm heeft een blok "toon wat je oversloeg", bedoeld
  om een vraag alsnog te kunnen beantwoorden, maar de query haalde die rijen niet op. Het blok kon dus
  nooit verschijnen.
- **De open punten werden dubbel geteld.** `assessReadiness()` had er een eigen rij voor naast de
  feitenvragen, gevoed uit `raw_json`, en die telling werd nooit nul, ook niet nadat de klant de vraag
  beantwoord had. De rij is weg; de vragen tellen nu één keer mee, op de plek waar ze staan.

**En twee dingen aan de vorm, allebei voor desktop.** De vraag staat op `lg` naast het invoerveld in
plaats van erboven, wat bij tien vragen ruim twee schermhoogtes scheelt. En een open punt heeft een
knop "Invullen" gekregen die de stap én het anker draagt (`?stap=bedrijf#veld-anker-aliases`), want de
wizard toont één stap tegelijk: zonder die stap landde de knop bij `proof_points` op een veld dat niet
in beeld stond. Een unittest bewaakt dat elk open punt een bestemming heeft, anders staat de regel er
weer voor niets.

Geen migratie: `fact_requests` had alles al, en de unieke index op (`profile_id`, `question`) maakt de
omzetting vanzelf idempotent. Samen met de twee rondes hierboven op main: 2180 unittests en 303
ketentests groen.

---

## De zijbalk kreeg hiërarchie (24 augustus 2026)

De indeling van de zijbalk klopte al sinds 17 augustus: vijf hoofdstukken met hooguit vier bestemmingen
eronder. De opmaak droeg die indeling alleen niet. Kop en bestemming stonden allebei op `text-sm`,
allebei in grijs, allebei op gewicht 400 tot 500, en het enige verschil tussen "een van de zes vaste
plekken" en "een pagina daarbinnen" was een verticale lijn van 1 pixel. Wie snel keek zag zestien
regels op een rij.

Vijf wijzigingen, elk met één taak. **De kop** gaat naar 15 pixels, gewicht 600 en `--text-primary`.
**Het icoon van de kop** wordt paars in plaats van de kleur van de tekst ernaast: zes tekeningen in de
hele balk, precies de zes vaste plekken, één merkkleur die ze bindt. Dat is de eerste en enige
uitzondering op de regel dat een icoon `currentColor` erft, verantwoord in `designsystem.md` §6b.2; de
kleur zit op de ouder, dus `components/icon.tsx` blijft ongewijzigd en de regel blijft afdwingbaar.
**De verticale lijn** verdwijnt: een bestemming springt nu 28 pixels in, precies de breedte van het
icoon plus de tussenruimte, waardoor zijn tekst exact onder de tekst van zijn kop staat, dezelfde
boodschap als de lijn zonder dwars door de actieve regel te lopen. **De actieve regel** wordt paars:
`--bg-elevated` (#e7edf2) haalde 1,1:1 met het wit eronder en werd pas zichtbaar als je ernaar zocht,
`--accent-purple-surface` (#f3e6ff) met paarse tekst niet. En **de ruimte** groeit van 4 naar 20 pixels
tussen twee hoofdstukken en van 30 naar 36 pixels per regel.

Twee dingen die er meteen uit volgden. De kop **kleurt niet meer mee** met de pagina waar je staat: dat
markeerde de kop én de regel eronder, twee markeringen voor één plek, terwijl de kop het vaste punt
hoort te zijn. En het stempel "alleen jij" is een **klein gevuld vlakje** geworden in dezelfde paarse
tint, want los grijs hoofdlettertekst las als een tweede label van de bestemming in plaats van als een
stempel erop. (Het was een pil; bij het samenvoegen met de vormgevingsronde hieronder is dat
`--radius-sm` geworden, want in diezelfde ronde hielden de chips van de app op pilvormig te zijn en de
zijbalk staat naast élk scherm.)

De navigatie zelf is niet aangeraakt: `lib/nav.ts` en `lib/icons.ts` zijn ongewijzigd, dus dezelfde zes
hoofdstukken, dezelfde volgorde en dezelfde tekeningen. Dit ging alleen over hoe ze eruitzien.
Nagemeten in de browser op de echte component, met een tijdelijke previewroute die in dezelfde ronde
weer verwijderd is.

---

## De vormgevingsronde op het overzicht (24 augustus 2026)

Het overzicht was diezelfde dag al opnieuw ingedeeld: stand, wat op je wacht, waar je begint, en pas
daarna de verdieping (`ux-design.md` §5). De volgorde klopte toen, de vorm nog niet. Op het scherm van
Gasservice Brabant stonden **twaalf witte kaarten met een dunne rand onder elkaar**, waarvan de
bovenste toevallig het hoofdgetal van het merk droeg. Wie het scherm scande zag geen hiërarchie: de
zichtbaarheid van 57% had exact dezelfde omlijning als de derde kans van onderen.

**Zes ingrepen, en vier ervan gelden voor de hele app.** Dat is bewust: een vormgevingsregel die maar
op één scherm geldt is geen regel maar een uitzondering, die vanzelf weer teruggroeit (dezelfde reden
als bij de 30 handgebouwde inline-stijlen over 17 bestanden).

1. **Een gekleurde stang van 4px links op de kaart met het hoofdgetal** (`.card-rail*`,
   `designsystem.md` §5.5). De tint volgt de eerste zin van `insights()`, dus groen betekent "dit
   cijfer steeg écht, boven de meetruis" en niet "dit is een kaart". Zonder oordeel, bij een eerste
   meting of een verschil binnen de ruis, blijft hij grijs: hij markeert dan wél waar je moet kijken en
   belooft niets over de richting. Ook toegepast op `/merk/[id]/analytics`, waar hetzelfde getal staat.
2. **De drie inzichtregels kregen een gekleurde stip en hun zin terug in zwart.** De hele zin stond in
   groen of oranje; drie regels waarvan er twee gekleurd zijn, leest als een foutmelding. Het
   opsomteken zelf was bovendien het letterteken •, dezelfde fout die `lib/icons.ts` ooit heeft
   opgeruimd: het kwam uit de tekstlaag, erfde de regelhoogte en zag er per platform anders uit. De
   stip is nu een getekend vlakje met een vaste maat.
3. **Elke regel in "wacht op jou" en "waar begin je" kreeg een icoon.** Twaalf kansen die alleen in hun
   tekst verschilden lieten je drie keer hetzelfde begin lezen ("Maak een nieuwe pagina over…",
   "Verbeter de pagina over…") voordat je het verschil vond. Acht nieuwe betekenissen in `lib/icons.ts`
   (35 in totaal), gekoppeld via `OPPORTUNITY_ICON` (`lib/opportunities.ts`) en `workKindIcon`
   (`lib/work-kind.ts`). Beide koppelingen zijn getest: een handeling zonder tekening rendert een gat
   op precies de plek waar de klant kijkt.
4. **Iconen en de handeling onderaan een kaart staan in de leeskleur, niet in paars.** Paars is in dit
   product de kleur van de primaire knop. Twaalf paarse regels onder elkaar maken van een lijst een
   muur van gelijkwaardige hoofdacties, en trekken de blik naar de linkerrand terwijl de titel het
   antwoord draagt.
5. **De gewichten kregen een schaal** (`designsystem.md` §3.1): 700 voor de paginakop en het
   hoofdgetal, 600 voor kaarttitels, 400 voor lopende tekst. Kaarttitels stonden op 500, precies één
   halve stap boven de zin eronder, en `.stat-value` had helemaal geen gewicht en erfde dus dat van de
   alinea ernaast.
6. **Chips zijn geen pillen meer** maar staan op `--radius-sm` (`designsystem.md` §5.1), en de
   potentiechip is rechts uitgelijnd op de titelregel. Pilvormig was hij het enige ronde element in een
   scherm vol vlakken van 6, 8 en 12 pixels; rechts uitgelijnd staat het getal waarop de lijst
   gesorteerd is in één kolom in plaats van achter elke titel op een andere plek. Eén regel in
   `app/globals.css`, en daarmee in één keer voor alle chips in de app.

**Eén ding verhuisde onderweg.** `WorkKind`, het etiket, `workChipTone()` en de nieuwe `workKindIcon()`
stonden in `lib/work.ts`, dat begint met `import "server-only"` omdat het uit vijf tabellen leest. Ze
zijn nu `lib/work-kind.ts`, puur en importeerbaar (conventie 2). Gevolg: `workChipTone()` heeft na drie
weken zijn eerste test, die een zichtbaarheidsregel bewaakt die er echt toe doet: "bekijk wat er mis
is" mag er niet uitzien als "beantwoorden". `lib/work.ts` geeft alles onveranderd door, dus voor de
rest van de app veranderde er geen import.

Geen migratie, geen AI-aanroep, geen kosten. 2195 unittests (15 erbij) en 303 ketentests groen.


---

## De terug-link boven een pagina is weg (24 augustus 2026)

`PageHeader` toonde op vrijwel elke pagina een link terug naar de bovenliggende
bestemming, met een pijltje en een sectienaam. Die weg bestond al: de zijbalk
wijst naar dezelfde plek. `backHref` en `backLabel` zijn uit `PageHeader`
gehaald en bij alle veertien aanroepen weg.

---

## Het inlogscherm gaat als enige naar het merkregister (24 augustus 2026)

De eigenaar liet buiten Claude Code een ontwerp maken voor de inlogpagina en vroeg om precies dat
scherm: een verlopende hemel met baanringen en planeten, een merkteken boven het woordmerk, en een
brede kaart die in tweeën valt met een merkpaneel links en het formulier rechts. Gebouwd zoals
gevraagd.

**Waarom dit een uitzondering is en geen koerswijziging.** §9b van `designsystem.md` beschrijft het
open ontwerpbesluit: het hele uiterlijk is afgeleid van de werkomgeving van de concurrent, en dat botst
met de merkstrategie. Dat besluit staat nog open, want het vraagt om merkassets die er niet zijn. Wat
hier gebeurd is, is smaller: één scherm draait in het merkregister in plaats van het dashboardregister.
De redenering: het argument voor de vlakke stijl (iemand zit een uur per week in een dashboard en dan
vecht sier met inhoud) gaat hier niet op, want op het inlogscherm zit niemand een uur, en in de
sales-led opzet is dit vaak het eerste beeld dat een prospect in een demogesprek ziet.

**Hoe die uitzondering ingeperkt is**, want anders lekt hij. Alle vorm staat in één blok in
`app/globals.css` onder de kop "HET INLOGTONEEL", elke klasse begint met `.auth-`, en elke kleur komt
uit de bestaande tokens: geen enkele nieuwe tint erbij. Wat wél afwijkt van het dashboardsysteem is
opgesomd en beargumenteerd: radius 24 tegenover 12, drie schaduwlagen tegenover de ene platte, een
veld van 44 en een knop van 48 tegenover 40, en het woordmerkverloop op een tweede plek (de linkerrand
van het merkpaneel).

**Wat er meeveranderde en waarom.** De inloglay-out droeg tot nu toe zelf de kop en de kaart. Dat kon
niet blijven: inloggen heeft nu een brede kaart en de andere vier schermen (registreren, wachtwoord
instellen, wachtwoord vergeten, uitnodiging) een smalle, en een lay-out die niet weet welke route hij
dient kan die breedte niet kiezen. De kop is daarom naar `auth-brand.tsx` verhuisd en de smalle vorm
naar `auth-panel.tsx`, zodat de kop nog steeds op één plek staat. De vier andere schermen kregen zo
hetzelfde decor en dezelfde kop, maar hielden hun eigen breedte.

Het formulier is een eigen component geworden (`login-form.tsx`) en niet een derde stand van
`auth-form.tsx`, om dezelfde reden die boven `password-forms.tsx` staat: dit formulier heeft iconen in
het veld, een oogknop, een andere veldhoogte en een eigen afsluiter, en dat met vlaggen in
`auth-form.tsx` wringen levert een component op dat drie vormen kent en geen ervan goed. Registreren
blijft op `auth-form.tsx`.

**De oogknop is de enige toevoeging die niet over vorm gaat.** Een wachtwoordveld dat je niet kunt
teruglezen kost een typefout, en een typefout kost een inlogpoging. Het label zegt wat er gebeurt als
je klikt ("Wachtwoord tonen") en niet wat de stand nu is, want dat laatste leest een schermlezer voor
als een raadsel.

**Nagerekend in de browser** en niet alleen gebouwd: op 390, 768, 1024 en 1440 pixels loopt de pagina
nergens horizontaal over, de oogknop schakelt het veldtype beide kanten op, de twee verlooptekens
hebben elk een eigen id, er is één `h1`, en de console blijft leeg. Op een telefoon vallen de drie
planeten weg: daar staat de kaart over de volle breedte en belandden ze achter het woordmerk en achter
de inlogknop.

---

## Het inlogscherm wordt één kaart, zonder decor (24 augustus 2026, tweede ronde)

De eigenaar leverde een screenshot van een ander inlogscherm aan en vroeg om precies die opmaak, tot op
de pixel, maar dan in de kleuren van ORBIT ENGINE: licht in plaats van donker. Gebouwd en in de browser
nagemeten op 962 pixels breed. De kaart staat op dezelfde hoogtes als het voorbeeld, met hooguit twee
pixels verschil: logo op 152, kopje op 224, titel op 278, eerste veld van 409 tot 457, knop van 594 tot
644, streep op 747, afsluitregel op 783.

**Wat eruit is en waarom.** Het decor van de eerste ronde van vandaag (een verlopende hemel met twee
baanringen, drie planeten en vier stofpunten) is weg, net als de brede kaart met het verkooppaneel
links. Het voorbeeldscherm heeft één kolom op een rustige ondergrond, en alles wat daarnaast gloeit
trekt het oog weg van de twee velden die het werk doen. `auth-background.tsx` en `orbit-visual.tsx`
zijn verwijderd; de git-historie is het archief.

**Wat ervoor in de plaats komt.** Eén component, `auth-card.tsx`, draagt nu alle vijf de inlogschermen:
logo, mono-kopje, titel, ondertitel, formulier, uitweg, afsluitregel. Daarmee vervallen `auth-panel.tsx`
en `auth-brand.tsx`, die alleen bestonden omdat inloggen een brede kaart had en de rest een smalle. Dat
verschil is er niet meer: wie zijn wachtwoord opnieuw aanvraagt heeft precies hetzelfde nodig als wie
inlogt, één kolom met één handeling erin. Het wachtwoordherstel-formulier draagt daarom dezelfde maten
als het inlogformulier; twee formaten formulier achter elkaar leest als twee verschillende producten.

**Wat er inhoudelijk veranderde aan de teksten.** Het e-mailveld heet "Werk-e-mailadres" en het
wachtwoordveld heeft een leesbare aanwijzing in plaats van bolletjes. Verplichte velden krijgen een
rood sterretje, wat ze eerder niet hadden. De afsluitregel onder de streep zegt dat de gegevens
versleuteld zijn: geen nieuwe belofte, wel de bevestiging die het voorbeeldscherm op die plek geeft. De
oogknop staat er nog, met dezelfde redenering als vanmorgen, maar toont nu een open oog als het
wachtwoord verborgen is: het pictogram zegt wat de klik doet, net als het label.

---

## Het ontwerpsysteem nagerekend tegen Nova's eigen CSS, en twee standen erbij (24 augustus 2026, derde ronde)

De eigenaar leverde de gecompileerde stylesheet van de NOVA-workspace aan, 93 kB met 381 tokens erin,
en vroeg of de app daar zo veel mogelijk op kon gaan lijken. Het ontwerpsysteem is al sinds 6 augustus
2026 van Nova afgeleid, alleen toen uit **schermafbeeldingen**, nu lag hun eigen bestand ernaast.

**Het cijfer dat de ronde droeg: 45 van de 46 kleurwaarden in `app/globals.css` bleken letterlijk de
hunne.** Radiusschaal, randdiktes, de ene schaduw en de breedte van de zijbalk klopten ook al. De ene
afwijking was `#fef3c7` waar zij `#fef3c6` hebben, één cijfer, onzichtbaar met het blote oog. De
afleiding uit screenshots was dus verrassend accuraat, wat de vier échte afwijkingen des te
bruikbaarder maakte.

**Vier dingen klopten niet.**

1. **De pagina was leiblauw met witte kaarten erop. Bij Nova is de pagina wit.** Hun `body` krijgt
   `--ds-background-neutral` (`#fff`); het leiblauw is bij hen niet de grond maar de eerste stap
   eróp, voor wat ín een kaart genest zit. De grootste zichtbare wijziging van deze ronde: één nieuw
   token (`--bg-muted`) plus drie plekken die op de oude paginakleur leunden voor een hover of
   veldvulling en anders wit op wit waren geworden.
2. **Kleine labels waren op 6 augustus van mono naar sans gebracht**, met het argument dat mono de
   "technische read-out"-stijl van de marketingsite was. Dat argument kwam uit screenshots en klopte
   niet: Nova heeft `type-label` en `type-lead`, allebei mono. Teruggedraaid, met twee bewuste
   afwijkingen in `designsystem.md` §3.2.
3. **De focusring was paars.** Bij Nova is hij inktkleur, ook de betere keuze: paars is in deze app
   óók de kleur van de hoofdknop, en een paarse ring om een paarse knop is geen ring.
4. **Donkere modus was op 11 augustus geschrapt** (besluit 17) omdat 107 tokens elk een doordachte
   tegenhanger nodig hebben en mechanisch omkeren grijze modder geeft. Dat argument was juist, de
   aanname eronder achterhaald: Nova's palet draagt die tegenhangers compleet, tot en met de
   randtinten en alle zeven betekenissen, dus viel er niets meer af te leiden.

**Wat er verder bijkwam**, op verzoek van de eigenaar om "alles" gelijk te trekken: de elf benoemde
tekststijlen (Tailwind's maten en regelhoogtes blijken één op één die van Nova, dus 399 plekken met
`text-sm` stonden al goed), Nova's animatieduren van 0,12/0,15/0,20 seconde in plaats van onze
geschatte 0,12/0,18/0,30, hun radius van 24 pixels, hun tokens voor de schakelaar, hun paginamarge van
14 mm bij afdrukken, en het uitzetten van de veerbeweging aan de rand van het scherm.

**De donkere modus en de schakelaar.** De startstand volgt het besturingssysteem, bewust géén knop voor
een derde stand. Klikt iemand op de schakelaar rechtsboven, dan wint zijn keuze, opgeslagen in
`localStorage` en niet in de database: licht of donker is een eigenschap van het scherm, niet van het
account (dezelfde consultant kan op zijn laptop donker willen en op de beamer in een demogesprek
licht).

Op twee plekken is donker niet de spiegel van licht, omdat het oog in donker anders werkt. De kaart
staat er één stap boven de pagina, want een rand van `#27323d` op `#121a22` is bijna niet te zien. De
zes grafiekkleuren wijzen naar de `-text`-waarden in plaats van `-solid`, want `-solid` wordt in
donker juist dónkerder (groei van `#37941c` naar `#2c711a`) en de lijn zou in de achtergrond
verdwijnen.

**Wat de meting opleverde dat niemand had bedacht.** Bij het narekenen met Playwright stond een knop
die halverwege de omslag gefotografeerd werd nog volledig op de oude kleur: veertig elementen met een
kleurovergang animeren allemaal tegelijk 120 milliseconden mee, het scherm veegt over in plaats van om
te klappen. Klasse `.thema-wisselt` zet nu elke overgang tijdens de omslag uit.

**Nagerekend**: tokenlaag, alle primitieven en de inlogroute zijn in beide standen in de browser
bekeken, de pagina loopt op 390 pixels nergens horizontaal over. De ingelogde schermen zijn dat **nog
niet** (conventie 10); `designsystem.md` §10.3 noemt de vier schermen die na de eerstvolgende deploy
in donker langsgelopen moeten worden.

**Wat deze ronde níet oplost, en scherper maakt.** Het open ontwerpbesluit van `designsystem.md` §9b:
dit uiterlijk komt van de concurrent, de merkstrategie vraagt om een eigen gezicht. Deze ronde bracht
de app verder náár Nova toe, niet ervandaan, met open ogen en op verzoek. Het tegenwicht: het fundament
zit op één plek, wie het uiterlijk eigen wil maken vervangt tokens in `app/globals.css`, niet
honderdzestig componenten, en dat geldt nu ook consequent in de donkere stand. Wat er nog steeds niet
is: waar het door vervangen zou moeten worden, geen logo, geen vastgesteld palet, geen
typografiekeuze van Outer Orbit zelf.
---

## De hoofdknop wordt inkt (24 augustus 2026, vierde ronde)

De eigenaar legde het echte inlogscherm van `nova.inspace.io` in donkere modus naast het onze en zag
twee dingen: **hun knop is bijna wit waar de onze paars is**, en **"Wachtwoord vergeten?" krijgt bij
hen een vlak zodra je hem aanwijst.** Allebei terecht, en het tweede legde het eerste pas echt bloot.

**Nagerekend op hun eigen pagina**, niet op een screenshot. Hun knop draagt
`bg-background-neutral-inverse text-foreground-on-neutral hover:bg-background-neutral-inverse-hover`
op `h-10 rounded-md px-4`, exact onze maatvoering met een andere kleur. Op dat hele scherm komt hun
merkkleur nul keer voor: het woord "intelligence" staat er geen enkele keer in de opmaak.

**Wat dat betekende voor ons.** Regel 1 van `designsystem.md` §8 zegt dat een kleur een betekenis heeft
en geen naam. Zolang élke hoofdknop paars is, betekent paars "knop" en niet meer "hier doet de AI
iets". De betekenislaag was precies op de plek waar hij het meest opvalt niets waard, en dat was
niemand opgevallen omdat het er in de lichte stand goed uitzag.

**Het cijfer dat het beslechtte: de oude paarse knop haalde in donkere modus 2,39:1 tegen zijn eigen
kaart.** Het vlak liep bijna in de achtergrond over. De nieuwe inktknop haalt 13,0:1 in licht en 13,8:1
in donker voor zijn tekst, waar de oude op 6,8:1 zat. De eigenaar zag met het blote oog wat de
rekensom bevestigde.

**Wat er verder uit voortkwam**, allemaal hetzelfde patroon (inkt voor nadruk, kleur voor betekenis):

- **Een derde knop, `.btn-ghost`.** Die bestond niet, en daardoor stonden uitwegen als kale link onder
  een knop van 50 pixels te zweven. Nu hebben ze dezelfde maat en bij hover 5% van de inktkleur,
  precies zoals Nova.
- **De focusrand van een veld** was paars met een gloed van 3 pixels; nu inkt zonder gloed. Eén
  verschil met Nova: zij verdubbelen de randdikte en wij leggen er een `inset`-schaduw overheen, want
  een dikkere rand duwt de inhoud van het veld één pixel opzij.
- **Velden hebben een hover gekregen.** Die ontbrak volledig.
- **Drie plekken beloofden een kleurovergang die nergens heen ging**: de tabbladen van het
  clusterdossier en de filterknoppen van het contentplan en het CSM-scherm stonden op
  `transition-colors` zonder enige hover-regel. Je wees ze aan en er gebeurde niets.
- **De links in de inlogroute** waren paars; nu inkt met een onderstreping. Paars als "klikbaar" is
  hetzelfde misverstand als paars als "knop".
- **Uitgeschakeld gaat van 50% naar 40%.** Op een inktknop leest 50% nog als een tweede, grijze knop.

**Wat we bewust niet overnamen: hun logo.** Dat is bij hen wit in donkere modus, wat de eigenaar
opmerkte. Hun woordmerk is één vorm op `currentColor`, dus wit is daar de enige mogelijkheid. Het onze
is twee merkkleuren die al meedraaien met de stand, en nu de knop inkt is, is het woordmerk de laatste
plek waar het merk nog kleur heeft. In donker haalt het 6,4:1 (groen) en 3,9:1 (paars) op een woordmerk
van deze maat: toegestaan, maar niet ruim. Wit zou 16,3:1 geven, één regel als het alsnog moet.

> ⚠️ **Teruggedraaid nog dezelfde dag**, op verzoek van de eigenaar. Zie het volgende blok, punt 3: het
> argument hierboven keek naar de kleur en niet naar de maat.

**Nagerekend** in beide standen: de primitieven, het inlogscherm inclusief de hover op de uitweg, en
`scrollWidth` 390 op 390 pixels. De ingelogde schermen wachten nog steeds op de eerstvolgende deploy,
zoals `designsystem.md` §10.3 zegt.

---

## Donker nagekeken met de ogen van Nova (24 augustus 2026)

De donkere stand was er sinds diezelfde ochtend, gebouwd maar niet bekéken. De eigenaar legde
schermafbeeldingen naast de app: kloppen de kleuren zoals wij ze toepassen?

**Het palet klopte, de toepassing niet.** Van de 59 donkere kleurwaarden die van Nova zijn overgenomen
wijkt er geen enkele af, nagerekend tegen hun gecompileerde CSS. Alle vier problemen zaten in wáár een
kleur stond, niet wélke.

**1. De inlogkaart had geen rand meer.** Grond `--bg-muted` (donker `#27323d`) en kaartrand `#27323d`
vielen samen. Nieuw token `--bg-stage` gaat per stand de andere kant op (`#f8fafc` onder een witte
kaart, `#121a22` onder een donkere).

**2. Dezelfde kaart was een maat te groot.** Nova's eigen CSS: 520 breed (wij 560), 12 rond (wij 16),
32/40 marge (wij 52), velden van 44 (wij 48), kop 24px op 600 (wij 28px op 700). Beslissend: Nova's
CSS bevat geen `rounded-xl`/`rounded-2xl`, twaalf pixels is hun grootste ronding, ook op het
inlogscherm.

**3. Het woordmerk is wit geworden in donker**, een terugdraai van hetzelfde ochtendbesluit. Toen: hun
logo op `currentColor` moet wit zijn, het onze draagt twee merkkleuren en is de laatste plek met kleur
na het inkten van de hoofdknop. Wat dat oversloeg is de maat: op letters van 17px hoog leest een
groen-naar-paars verloop als kleurvlekje, niet als merk. Wit haalt 16,3:1 tegenover 6,4:1 en 3,9:1, en
is het eerste wat het oog raakt.

**4. De zijbalk was de felste kleur van het scherm.** De actieve regel had een paars vlak (`#42006d`)
met paarse letters (`#ad45ff`): 2,6:1, onder de vereiste 4,5. Erger: paars betekent in dit systeem
"hier doet de AI iets", en de zijbalk gebruikte het voor "je bent hier" naast élk scherm, dezelfde
overgeslagen redenering als bij de hoofdknop diezelfde ochtend. Nu een neutraal vlak met gewone
tekstkleur en 5% inkt bij hover.

**Wat er ongevraagd bij kwam.** Nova's typografieschaal kent geen gewicht boven 600 en zet
letterspatiëring op 0; onze 24 koppen op `text-2xl font-bold tracking-tight` gebruiken nu de benoemde
klassen. Grote cijfers blijven op 700 (een antwoordgetal is geen tekst).

**Nagerekend.** Inlogroute gefotografeerd, licht én donker, kaart 520 breed in beide standen. De vier
controles uit `designsystem.md` §11 geven nul regels. `tsc`, 2195 unittests, ketentests en build
groen. Ingelogde schermen wachten nog op de eerstvolgende deploy (§10.3).

**Wat we van Nova's berichtencatalogus meenamen, en wat nog openstaat.** `docs/nova-i18n.json`
doorgelopen op vormgeving: drie dingen die wij nog niet doen. Licht/donker/systeem als drieweg-keuze
onder "Weergave" in plaats van een knop in de balk; elke lege staat een titel plus uitleg, nooit één
zin; elke onomkeerbare handeling een apart "dit kan niet ongedaan gemaakt worden"-blokje. Geen van
drieën gebouwd in deze ronde.

---

## De twee andere punten uit Nova's berichtencatalogus doorgevoerd (24 augustus 2026)

Van de drie dingen die de vorige alinea openliet, zijn er nu twee gebouwd. Het drieweg-keuzemenu voor
licht/donker/systeem staat nog open; dat raakt de accountinstellingen en is een eigen stuk werk.

**1. De laatste kale `window.confirm()` is weg.** Het onderzoek bijwerken in de onboardingsessie
(`app/(app)/merk/[id]/_components/onboarding-session.tsx`) was de enige plek in de app die nog een
browsereigen bevestigvenster gebruikte, met alles op één regel: welke stappen opnieuw draaien, wat dat
kost, en "Doorgaan?" achter elkaar. Alle andere onomkeerbare handelingen gebruikten al `ConfirmDialog`
met zijn `irreversible`-blok (`plan-view.tsx`, `account-box.tsx`, `delete-account-box.tsx`), dus het
patroon bestond al en hoefde niet gebouwd te worden. Wat ontbrak was de laatste plek waar het niet
werd toegepast.

`describeRefresh()` in `lib/pipeline/onboarding-refresh.ts` bouwde die ene samengestelde zin. Hij heet
nu `refreshConfirmation()` en levert twee velden: `body` (wat er opnieuw draait) gaat naar de lopende
tekst van het venster, `cost` (het bedrag) gaat naar het aparte blokje. Een consultant die op "Onderzoek
bijwerken" klikt ziet nu hetzelfde soort venster als bij het vrijgeven van een maand content: een
gewone zin, en daaronder in een eigen kader wat hij niet kan terugdraaien.

**2. Vijf kale lege zinnen kregen een tweede zin erbij.** De meeste lege staten in de app bleken al
title+uitleg te zijn, alleen niet altijd met een zichtbare kop erboven: het `mono-label` + `<p>`-patroon
(bijvoorbeeld `zoekverkeer/page.tsx`, `merkprofiel/page.tsx`, `csm-view.tsx` bij "Nog geen merken") komt
op hetzelfde neer als Nova's title/description-paar, en een losse `<p>` met twee zinnen (bijvoorbeeld
`library-list.tsx`, `offerings-panel.tsx`, `loop-blocks.tsx`) ook. Vijf plekken waren dat niet: één
kale zin zonder enige uitleg, echt de "geen analyses"-doodlopende weg uit `docs/ux-design.md` §4.

- Twee regels in `admin/page.tsx` ("Nog geen herkomst vastgelegd", "Nog geen onderwerp-onderzoek") en
  één in het kostenlogboek eronder kregen een tweede zin die zegt wanneer het blok zich vult.
- `prompts-manager.tsx` zei "Nog geen vragen in deze categorie" terwijl er direct daaronder een
  formulier staat om er een toe te voegen; de zin verwijst er nu naar, hetzelfde patroon als
  `faq-editor.tsx` al gebruikte.
- `answers-view.tsx` zei bij een leeg filter alleen "Geen vragen binnen dit filter" zodra "alleen
  gemist" uitstond; de zin legt nu uit wat je kunt doen om weer iets te zien.

**Wat bewust niet is aangepast.** De lege-segmentteksten in `lib/csm.ts` ("Niets vastgelopen.", "Elk
merk heeft minstens één meting.") zijn overal kale zinnen, en dat staat er met opzet: het commentaar
erboven zegt "een leeg segment is goed nieuws", en een leeg CSM-segment vraagt geen volgende stap, in
tegenstelling tot een lege `/analyses`. De zoekresultaten in `brand-switcher.tsx` ("Geen merk gevonden
voor…") zijn ook met opzet kaal: Nova doet dit bij hun eigen zoeklijstjes (`noClientsMatch`,
`noDomainsMatch`) net zo, één zin zonder uitleg. Title plus uitleg is voor het scherm dat leeg blijft,
niet voor een zoekveld dat nul treffers geeft.

Nagerekend: `npx tsc --noEmit`, 2197 unittests (twee nieuwe voor de gesplitste `refreshConfirmation`),
303 ketentests en de productiebuild zijn groen. De vier controles uit `designsystem.md` §11 geven nul
regels.

---

## 25 augustus 2026: ontwerpronde op het merkoverzicht, de landingspagina

Het merkoverzicht kreeg een ontwerpronde. Aanleiding: dit is sinds 17 augustus de bestemming na
inloggen (`app/page.tsx`), en bij een klant met één merk is er geen tussenstap. Het is dus niet een
scherm dat je opzoekt maar het eerste scherm van elke sessie, en dat verandert waar het antwoord op
moet geven. De volledige vormregels staan in `docs/ux-design.md` §5; de ronde zelf, met wat is
afgewezen, in `docs/tasks/ontwerprondes.md`.

**Wat het scherm mankeerde, in drie zinnen.** Acht blokken van gelijk gewicht, waardoor het antwoord op
zijn eigen titelvraag één getal zonder richting was en de enige echte handeling er kleiner uitzag dan
zes adviezen. De enige kleur die er lag, zes identieke groene potentiechips, beloofde een rangorde die
er niet was, terwijl de gegevens die wél onderscheiden allemaal opgehaald werden en niet in beeld
kwamen. En er stonden drie versies van hetzelfde getal plus één regelrechte tegenspraak op één scherm.

**Het cijfer dat drie keer anders was.** De standkaart toonde 57%, de duiding eronder "je zichtbaarheid
steeg van 30 naar 60" en het opbrengstblok "+30 punten". Nagerekend op Gasservice Brabant: de
standkaart nam `weighted_score` en woog de clusters op `winnable_runs`, `lib/insights-data.ts` en
`lib/milestones-data.ts` namen allebei de ongewogen `score` en middelden de clusters ongewogen. Bij
één cluster scheelt dat 3 punten, bij meerdere clusters meer. `lib/brand-score.ts` doet die som nu één
keer; alle drie de blokken lezen die uitkomst en de startpagina heeft haar eigen tweede query op
`visibility_scores` niet meer nodig.

**De chip die zes keer 68 zei.** De potentiescore is zichtbaarheidsgat maal zoekvolume, het zoekvolume
hoort bij het onderwerp, en Gasservice Brabant heeft er één. Alle zeven aanbevelingen kwamen daardoor
uit op precies 68 van de 100. Op het scherm stonden zes identieke groene chips op de meest opvallende
plek van elke kaart, terwijl de regel eronder beweerde dat de lijst gesorteerd was op wat de kansen
opleveren. De chip verschijnt nu alleen nog als hij binnen de lijst varieert (`potentieVarieert`), en
op zijn plek staat wat wél verschilt: hoeveel gemeten vragen een kans raakt. Dat scheelt bovendien het
duurste deel van de laadtijd, want die score kostte vier leesqueries per aanbeveling.

**De tegenspraak.** "1 · Pagina gepubliceerd" stond op hetzelfde scherm als "Nog geen van je 120
geplande pagina's staat live". Allebei waar: de eerste pagina van dit merk is geschreven vóórdat het
contentplan bestond en hangt aan geen enkele planregel. Twee tellingen van hetzelfde ding die elkaar
tegenspreken, en dan gelooft de klant geen van beide. `planRegels()` in `lib/overview.ts` benoemt het
verschil nu.

**Wat de landingspagina-status oplevert aan regels.** Drie, geldig voor elke toekomstige
landingspagina: zeg hoe vers de data is (er wordt maandelijks gemeten en de klant kijkt vaker, dus
zonder meetdatum ziet hij vier keer hetzelfde cijfer zonder te weten dát het hetzelfde is); geef het
scherm precies één primaire knop en zet die bij wat er op de klant wacht; en behandel de half gevulde
staat als de eerste indruk, niet als randgeval. Dat laatste betekent dat de verdiepingslaag in de
eerste maand wegvalt in plaats van drie nullen en vier lege balken te tonen.

Nagerekend: `npx tsc --noEmit`, 2241 unittests (39 nieuwe, voor `brand-score.ts`, `overview.ts` en de
kansenlijst), 303 ketentests en de productiebuild zijn groen. Het resultaat is in beide standen bekeken
op de echte productiedata, in drie staten: het gevulde scherm, een merk met vijf metingen en de eerste
maand.

---

## 26 augustus 2026: het overzicht toont de omvang van het programma

Vervolg op de ontwerpronde van de dag ervoor, en op één punt een correctie daarop door de eigenaar.

**Het zichtbaarheidspercentage is van de startpagina af.** Het stond er als hoofdgetal, met de marge,
het verschil en het verloop eromheen. Het staat nu op Analytics, één klik weg via de knop die er nog
steeds naast staat, en in woorden in de drie duidingszinnen eronder. De reden: de vraag die een klant
bij het inloggen stelt is niet "wat is mijn score" maar "wat loopt er voor mij, en wat staat er klaar".
Vier tellingen in de plaats, over de volle breedte: pagina's gepubliceerd, clusters actief, nieuwe
pagina's voorgesteld, paginaoptimalisaties voorgesteld. Geen van de vier draagt een vergelijking met
een vorige periode, want het zijn standen en geen metingen: het aantal clusters verandert doordat de
eigenaar er een aanzet, niet doordat er gemeten is.

**Het opbrengstblok is verwijderd, en daarmee een deel van besluit 7.** "Actief sinds", "+30 punten" en
"1 pagina gepubliceerd" stonden onderaan het overzicht als het middel dat opzeggen tegenhoudt bij een
doorlopend opzegbaar abonnement. Van die drie is er één overgebleven, bovenaan tussen de vier
programmacijfers. `lib/milestones.ts`, `lib/milestones-data.ts` en `components/milestones-block.tsx`
zijn verwijderd en vervangen door `lib/overview-data.ts`, dat nog één telling doet. Wat dat betekent,
expliciet: het argument "waar betaal ik voor" staat niet meer in die vorm op de startpagina, en
`accounts.value_per_mention_eur` uit besluit 16 wordt daardoor op geen enkel scherm meer getoond. De
kolom blijft bestaan en bewerkbaar; komt er een scherm dat over rendement gaat, dan hoort hij daar.

**Het contentplan en het activiteitenblok staan nu onder elkaar over de volle breedte.** Ze stonden op
desktop naast elkaar omdat ze allebei smal van inhoud waren, maar het plan is het enige blok met vier
soorten inhoud en werd in een halve kolom geknepen. Over de volle breedte staan de fases en de
contentmix náást elkaar, waardoor die kaart half zo hoog is. Het activiteitenblok toont vijf regels
open en hooguit vijftien in totaal, dezelfde harde grens als op de wachtrij, want `activiteit()`
groepeert per taaksoort en er zijn er 32. Het is het enige blok waar geen handeling uit volgt, dus het
hoort nooit het langste te zijn.

Nagerekend: `npx tsc --noEmit`, 2241 unittests, 303 ketentests en de productiebuild zijn groen. De
mijlpalentests zijn vervangen door tests op de vier nieuwe cijfers, inclusief een grens op de lengte van
de toelichting: drie van de vier kolommen zijn 24 pixels smaller dan de eerste, en een regel die alleen
dáár afbreekt leest als een fout.

---

## 25 augustus 2026: het contentplan wordt een voorraad met twaalf lege maanden

**De aanleiding was één zin van de eigenaar: "ik vind het plannen van content nog heel
onoverzichtelijk".** Wat het narekenen opleverde was erger dan onoverzichtelijk.

Het plan van Gasservice Brabant telde 120 pagina's over twaalf maanden, samengesteld uit **28 unieke
titels**: zeven clusters maal vier funnelfasen, uitgesmeerd over 120 plekken, dus "Cv-ketel huren ·
Kiezen" stond er vijf keer in. Van die 120 waren er **17 daadwerkelijk te schrijven**: schrijven leunt
op de gemiste vragen uit een meting als briefing (`lib/plan-writing.ts`), en van de zeven clusters is
er precies één gemeten. Nog eens 17 pagina's hingen aan "Cv-ketel kopen", een cluster dat de eigenaar
zelf had afgewezen nadat het plan gemaakt was.

Het scherm loog dus twee keer tegelijk: het beloofde variatie die er niet was, en werk dat niet kon
beginnen. De rekenkunde van `buildPlan()` klopte tot achter de komma, inclusief de `funnelShift()` die
eerder een dubbele titel per maand oploste. De aanname eronder klopte niet: dat er genoeg te schrijven
vált zodra er onderwerpen zijn.

**De omkering.** `planned_pages.plan_month_id` mag nu leeg zijn (migratie `0065`), en dát is de
voorraad: een pagina die beschikbaar is maar nog geen maand heeft. Eén tabel voor twee toestanden, want
inplannen mag geen rij verplaatsen: dan verliest een kaart bij elke sleepactie zijn status, geschreven
tekst en geschiedenis. Nu verandert er bij inplannen precies twee dingen, de maand en de datum.

De voorraad wordt gevuld met **alleen gemeten kansen**: de aanbevelingen uit het laatste rapport van
een gemeten cluster, elk met de reden erbij, de doelvragen die hij raakt, en de potentiescore die over
precies die doelvragen is uitgerekend. Een bewuste versmalling die op dag één pijn doet: Gasservice
Brabant gaat van 120 rijen naar **7 kansen uit één cluster**. Dat is de eerlijke stand, en het scherm
maakt er een handeling van in plaats van een leegte: de zes niet-gemeten clusters staan apart in de
zijkolom, met de meting als volgende stap.

`createPlan()` maakt twaalf lege maanden en vult alleen maand 1, met de sterkste kansen tot aan de
quota. Twaalf lege maanden zijn eerlijk maar doen niets; het systeem hoort de eerste zet te doen en de
mens hoort hem te kunnen overrulen (`docs/visie.md`). De rest van het jaar sleept de gebruiker zelf
bij elkaar.

**Vier keuzes van de eigenaar bepaalden de vorm**, en twee ervan gingen tegen mijn advies in: alleen
gemeten kansen in de voorraad (ik stelde voor er ook cluster × fase-combinaties in te zetten, zodat de
lijst altijd gevuld is), alles terug naar nul inclusief de lopende maand augustus, een voorzet voor
maand 1, en **geen enkele grens** aan het aantal pagina's per maand: het scherm toont wel hoeveel je
boven je pakket zit, maar houdt niemand tegen.

**Slepen, en waarom `lib/plan-order.ts` toch overeind blijft.** Dat bestand legt uit waarom volgorde
met knoppen gaat en niet met slepen: HTML5-drag doet niets op een telefoon, en de eerste klacht van dit
hele traject ging over mobiel. Die redenering staat nog steeds. Daarom is slepen hier niet de enige
weg: elke kaart draagt ook een keuzelijst "Plan in", die werkt met een vinger, met een toetsenbord en
met een schermlezer. Slepen is de snelle weg voor wie een muis heeft, geen voorwaarde.

**Twee fouten die onderweg boven kwamen en niets met het ontwerp te maken hadden.** De cron gaf elke
planpagina onvoorwaardelijk `action: "nieuw"` mee aan de schrijfstap; bij Gasservice Brabant hadden
vier van de zeven kansen `verbeteren` moeten zijn, en die zouden dus een tweede pagina hebben opgeleverd
naast de pagina die ze hadden moeten aanvullen. En `loadPlan()` las alle pagina's van het merk in plaats
van die van de lopende planversie, dus na een tweede planversie telde de kop de rijen van de eerste mee.

Verder: `buildPlan()` is verwijderd (wat overblijft zijn twee constanten in `lib/plan-constants.ts`), en
er is een knop "Opnieuw opzetten" bijgekomen. Die ontbrak: zodra er één plan stond was er geen weg
terug, en het scherm beloofde bij het afwijzen van een maand een nieuw voorstel dat nooit kwam.

Nagerekend: `npx tsc --noEmit`, 2231 unittests, 322 ketentests en de productiebuild zijn groen. De
ketentest zet de volledige keten onder een potentiescore neer (aanbeveling → doelvraag → meting →
vermelding → zoekvolume) en controleert dat de voorzet de hoogste kiest, dat de andere kans in de
voorraad blijft staan, dat drie keer synchroniseren geen enkele dubbele kaart oplevert, en dat een
pagina die al geschreven wordt niet terug de voorraad in kan.

---

## 25 augustus 2026: Instellingen leeg, het profielmenu een uitklapmenu (opdracht van de eigenaar)

**"Koppelingen" verhuisde van Instellingen naar Admin, en alleen de beheerder mag er nog komen.** Een
koppeling met Search Console zet de consultant vóór het demogesprek klaar, de klant maakt hem nooit
zelf (het product is sales-led, besloten 3 augustus 2026). De zijbalk liet de knop tot nu toe gewoon
aan de klant zien, zonder dat hij er iets aan had. `app/(app)/instellingen/koppelingen/page.tsx` roept
nu zelf `isStaff` aan en antwoordt met een 404, net als de andere afgeschermde routes: een verborgen
menu-item is nog steeds een adres dat te raden is. In `lib/nav.ts` is Admin daarmee van vier naar
**vijf** bestemmingen gegaan, drie over dít merk en twee uitgangen naar de app als geheel ("Alle
merken", "Koppelingen").

**"Account en team" is uit de zijbalk weg en staat nu als "Mijn account" achter het profiel-icoon.**
Met "Koppelingen" weg had "Instellingen" geen bestemming meer over, en een kop die voorgoed leeg is is
geen kop: "Instellingen" is uit `HOOFDSTUKKEN` verwijderd. De pagina `/instellingen` bestaat gewoon
nog, alleen de ingang ernaartoe is verhuisd.

**Het profielmenu is geen full-screen sheet meer, maar een klein uitklapmenu** (opdracht van de
eigenaar, met een referentiescreenshot van een taalkiezer als voorbeeld). De sheet naar het "Pick your
orbit"-patroon van InSpace droeg intussen nog maar één link, en een schermvullend paneel voor één link
is zwaarder dan wat het opent. `components/profile-menu.tsx` is herschreven naar hetzelfde
uitklapmenu-patroon als `components/brand-switcher.tsx`: een kaart onder het icoon met
`--shadow-overlay`, gesloten door een klik erbuiten of Escape. Hij toont twee rijen, "Mijn account"
(naar `/instellingen`) en "Uitloggen", plus het e-mailadres. `ACCOUNT_NAV` in `lib/nav.ts` is daarmee
overbodig geworden en verwijderd: een lijst van één regel hoeft geen apart bestand meer te delen
tussen twee componenten.

Nagerekend: `npx tsc --noEmit`, 2235 unittests, 322 ketentests en de productiebuild zijn groen.

---

## 26 augustus 2026: het contentplan werd leesbaar

De indeling van de dag ervoor was compleet en onleesbaar. Eén regel van maand 1 besloeg vijf regels
tekst en droeg zeven bedieningen, waaronder een keuzelijst van veertig pixels over de volle breedte.
Tien van die blokken, elk in een eigen kaart binnen de kaart van de maand, vulden anderhalf scherm met
tien titels en tien datums.

Wat eraf ging staat per onderdeel in `docs/tasks/ontwerprondes.md`. De kern: de keuzelijst werd een
menu achter drie puntjes, de zin die tien keer stond staat nu één keer boven de maand
(`sharedNotice()`), de statuschip verschijnt alleen nog als een regel afwijkt van de normale gang van
zaken, en de regels zijn platte rijen in plaats van kaarten. Een geplande regel is nu één regel.

**Twee fouten die alleen zichtbaar werden door het scherm echt te renderen.**

De eerste is een valstrik in het ontwerpsysteem zelf. `--color-base` in het `@theme inline`-blok maakt
van `text-base` een KLEURklasse, niet de tekstgrootte die je in elk ander Tailwind-project krijgt. De
kop "Beschikbaar" stond daardoor in de donkere stand in de kleur van de paginagrond, dus onzichtbaar,
terwijl de code prima compileerde en alle 2241 tests groen bleven. De waarschuwing staat nu bij het
token in `app/globals.css` en in `docs/designsystem.md` §3.2. Dezelfde botsing loert bij `surface`,
`elevated`, `ink`, `muted`, `purple`, `green`, `success`, `error`, `warning` en `info`.

De tweede: `spreadDates()` verdeelde de pagina's van maand 1 over de héle maand, ook als die maand al
half voorbij was. Het plan van Gasservice Brabant werd op 25 augustus opgezet met augustus als maand
1, dus negen van de tien pagina's kregen een datum die al geweest was en het scherm meldde negen keer
"Stond gepland voor 1 augustus". In de lopende maand begint de spreiding nu morgen. Twee unittests die
op de echte klok leunden zijn tegelijk deterministisch gemaakt: ze waren een halfjaar lang groen en
zouden in augustus 2026 rood zijn geworden zonder dat er iets veranderd was.

Nagerekend: `npx tsc --noEmit`, 2241 unittests, 322 ketentests en de productiebuild zijn groen, en het
scherm is in beide standen bekeken met een gerenderde schermafbeelding van het echte component.

---

## 26 augustus 2026: Mijn reputatie grondig herbouwd als scherm

**De opdracht van de eigenaar: "de klant wil gewoon zien wat zijn reputatie is in AI, verdeeld per
product", met de melding dat het scherm overweldigend en onoverzichtelijk was.** De meetkant is niet
aangeraakt: geen migratie, geen prompt, geen nieuwe AI-aanroep en geen enkel cijfer opnieuw berekend.
Wat veranderd is, is wat er getoond wordt, in welke volgorde en hoe zwaar. De volledige indeling staat
in `ux-design.md`; hier staat waarom.

**Het scherm ontkende zijn eigen bevinding.** Bovenaan stond de chip "neutraal 0", twee regels lager
de zin "bij 22 van de 22 vragen noemt ChatGPT zowel lof als kritiek". Beide waar: alle 22 bruikbare
oordelen van Gasservice Brabant kregen het etiket `gemengd`, dat scoort altijd exact 0, en 0 heet op
de schaal neutraal. Maar de zwaarste mededeling ontkende zo de op één na zwaarste, en "neutraal" is
precies het woord waarbij een ondernemer zijn schouders ophaalt. De kop zegt nu "verdeeld" zodra de
helft of meer van de oordelen gemengd is (`reputationHeadline()`), de enige weergaveregel die deze
ronde toevoegt; het cijfer eronder verandert niet.

**De beste tabel van de module werd nooit uitgelezen.** `reputation_market` bevat per product wie
ChatGPT aanraadt als een koper vraagt welk bedrijf hij moet hebben, en op welke plek de klant zelf
staat. Het scherm raakte die tabel geen enkele keer aan, terwijl daar het enige cijfer in zit waar
rechtstreeks geld aan hangt. Op de run van 23 augustus stond erin: genoemd bij 4 van de 9 gemeten
producten, niet genoemd bij 5, en bij cv-ketel storing raadt ChatGPT Kemkens, Warmte Centrum Brabant,
VSB, MVS en Van Beek aan. Dat is nu de indeling van het hoofdstuk per product, in drie groepen, met de
groep waar het misgaat bovenaan.

**Twaalf producten, twaalf identieke regels.** Elke regel droeg de badge "1 vraag" en de chip
"neutraal 0", en opengeklapt stond er "ChatGPT geeft een neutrale toon van 0" en verder niets. Oorzaak:
`top_pros` en `top_cons` van een aanbodrij houden alleen punten over die in twee of meer antwoorden
terugkwamen, en er is één vraag per product. In `reputation_answers` lagen ondertussen 89 pluspunten
en 60 bezwaren klaar, per product, met bron. Het scherm leest ze nu daar, met dezelfde opschoning als
de synthese (`cleanPoints`) en dezelfde scheiding tussen een echt bezwaar en een opmerking over ons
eigen bewijs (`experiencePoints` tegenover `evidenceRemarks`).

**Eén getal is van het scherm af omdat het niet kon kloppen met de lijst eronder.** De steunkaart zei
"gemiddeld op plek 2,3 van 6". Dat gemiddelde loopt over alle marktvragen, ook de merkbrede met zes
partijen, terwijl de vier producten eronder op plek 2 van 3, 2 van 5, 3 van 5 en 2 van 4 staan, nergens
een noemer van 6. `market_position` blijft opgeslagen voor de vergelijking over de tijd.

**Vijf chips werden één meter.** "neutraal 0", "marge ±6", "bewijs 99", "1.7e van 4 · indicatief" en
"eenduidigheid 71" stonden op één rij, in dezelfde vorm en hetzelfde gewicht, terwijl er precies één
hoofdgetal is. De meter toont de schaal zelf, zet de marge als band eromheen en noemt het oordeel in
woorden; de bewijskracht staat als woord ernaast ("stevig onderbouwd") in plaats van als 99 op een
schaal die alleen wij kennen.

**Wat nog steeds openstaat, geen bug maar een productkeuze:** het etiket `gemengd` scoort altijd exact
0, ongeacht hoeveel of hoe zwaar de bezwaren zijn. Deze ronde maakt dat zichtbaar in plaats van
misleidend, maar lost het niet op. Een volgende ronde zou het aantal en de soort bezwaren in het cijfer
zelf laten meewegen.

**Nagerekend tegen de opgeslagen run en niet alleen tegen tests** (conventie 10). De 12 producten, 46
antwoorden en 61 marktrijen van run `2df64a13` zijn door de nieuwe weergavelaag gehaald: de drie
groepen komen uit op 5, 4 en 3, elke regel levert een eigen zin op met de bedrijven die ChatGPT in
plaats van de klant noemt, en de bezwarentelling onderscheidt "onverwacht hoge kosten" bij 6 producten
van "conflict over een afspraak voor een gaslek" bij 4.

Migraties ongewijzigd (t/m `0065`), 2290 unittests en 322 ketentests groen, en de productiebuild is
schoon.

---

## 26 augustus 2026: een hele klant nagebootst, en wat daaruit viel

Er stond nog nooit één klant volledig door de keten heen, alleen losse verificaties per fase. Daarom
is **Huyberts Keukens** (huyberts.nl, keukenspeciaalzaak in Sint-Oedenrode) er als testklant doorheen
gehaald: aanmaken, onderzoek, demogesprek, cluster, meting, rapport, contentplan, twee geschreven
pagina's, een gefingeerde publicatie met 543 dagen Search Console-cijfers, en de effectmeting. Kosten
van de hele reis: **$2,85 over 216 AI-aanroepen**.

De keten werkt. De commerciële laag uit het gesprek komt terug in het rapport (het noemt het
omzetdoel van de klant), de meting ontdekte concurrenten die het vooronderzoek niet kende (Berkers
Keukens staat vier keer als eerste aanbeveling op positie 1,2 terwijl Huyberts nergens genoemd wordt),
en de geschreven pagina's gebruiken de antwoorden uit het gesprek als feiten. Maar de reis legde ook
zes dingen bloot die geen enkele test kon vangen, want ze zitten in de samenhang tussen stappen.

**1. De effectmeting gooide 56 van haar 112 betaalde zoekacties weg.** Twee unieke indexen op
`tracking_runs` spreken elkaar tegen. `tracking_runs_impact_unique_idx` (migratie `0020`): één meting
per pagina, golf, vraag en doel. `tracking_runs_idem_idx` (migratie `0041`): één meting per analyse,
vraag, week, engine, herhaling en doel, die `impact_wave` en `content_piece_id` niet kent. Een
impactmeting draagt week 0 en herhaling 0, dus golf 2 van dezelfde vraag botst met golf 1, en twee
pagina's met dezelfde doelvraag botsen met elkaar; het opslaan mislukt dan **nadat** de web-zoekactie
betaald is, en de taak probeert het vier keer. Veertien taken maal vier pogingen is 56 weggegooide
zoekacties, zo'n $0,86 van de $1,73 die de metingen kostten, precies de helft.

**2. Een pagina uit het contentplan kan nooit gemeten worden.** `/api/cron/plan` bouwt zijn
schrijfopdracht uit `planBriefing()` met `why`, `targetIntent`, `action` en `existingUrl`, maar géén
`targets`. `saveTargets()` in `content.ts` schrijft daardoor nul rijen in `content_piece_targets`, en
`planImpactWaves()` slaat de effectmeting over met "geen doelvragen". Fase 5 bestaat dus niet voor
pagina's via het plan geschreven, sinds migratie `0065` de normale route. De doelvragen liggen wel
klaar, in `reports.recommendations_json`, en `planned_pages.source_ref` wijst er met rapport-id plus
volgnummer rechtstreeks naar.

**3. De titel van een geschreven pagina is een opdracht aan de klant.** `content.ts` neemt
`recommendation.title` letterlijk over, de aanbeveling uit het rapport: de pagina heet nu "Publiceer
een regionale pagina voor keukenrenovatie in Eindhoven", terwijl de `meta_title` die het model zelf
schrijft wel klopt ("Keukenrenovatie Eindhoven | Huyberts Keukens").

**4. De potentiescore onderscheidt niets bij een nieuwe klant.** Alle zeven kansen van Huyberts kregen
exact 58: de score is `(1 − zichtbaarheid/100) × zoekvolume`, het zoekvolume is per onderwerp, dus bij
zichtbaarheid nul valt hij voor elke kans van hetzelfde onderwerp gelijk uit. Juist bij de klant die
nog nergens genoemd wordt, elke nieuwe klant, is er niets te sorteren.

**5. Een artikel schrijven past niet in het tijdbudget van 105 seconden.** Het tweede artikel (1034
woorden) had vier pogingen nodig voor de schrijfstap en nog eens vier voor de herschrijfstap, elke
keer afgebroken met "Request was aborted", uiteindelijk gelukt maar met een halfuur en zes verspilde
aanroepen op het duurste model. De pagina van 574 woorden ging in één keer goed.

**6. Het effectoordeel kan bij een handvol doelvragen nooit iets anders zeggen dan "gelijk".**
`thresholdOf()` rekent een 95%-band over twee binomiale schattingen: bij twee doelvragen is die band
92 procentpunt breed, bij één doelvraag 136. De Eindhoven-pagina ging van nul naar één van de twee
doelvragen, een stijging van 50 punten, en kreeg "gelijk". Statistisch correct en tegelijk onbruikbaar:
de test kan bij deze aantallen alleen maar "geen verschil" zeggen.

Kleiner, genoteerd: de claimvalidator markeert feiten die de klant in het gesprek zelf bevestigd heeft
als "zonder bron" (vier zinnen op de Eindhoven-pagina, waaronder het eigen montageteam), en `POST
/api/profiles/[id]/assign` verplaatst wel `profiles.user_id` en `analyses.user_id` maar voegt de klant
niet toe aan `account_users`, zodat hij binnenkomt via de oudere eigenaarsregel in plaats van via de
accountlaag.

**Wat aan deze testklant niet echt is**, zodat niemand er later conclusies uit trekt die hij niet
draagt: de twee pagina's staan niet op huyberts.nl, de publicatiecontrole is met de hand op geslaagd
gezet, en de Search Console-cijfers zijn berekend, niet opgehaald. De hele doorloop is op
databaseniveau gedaan, per stap de code van de route gelezen en nagedaan, de schermen zelf niet
bediend. Het plan van aanpak voor de zes punten stond in `docs/tasks/doorloop-huyberts.md`; wat eruit
is gebouwd staat in de alinea hieronder.

---

## 26 augustus 2026: de zes punten uit de doorloop afgewerkt

Alle zes punten uit `docs/tasks/doorloop-huyberts.md` afgehandeld, elk in een eigen commit, elk
nagerekend tegen de echte data van Huyberts Keukens (conventie 10). `tsc`, unittests, ketentests en
build op groen na elk punt.

**1. De effectmeting gooide de helft van haar betaalde metingen weg.** Twee tegensprekende unieke
indexen op `tracking_runs` (migratie `0066`): `tracking_runs_idem_idx` kende `impact_wave` en
`content_piece_id` niet, dus golf 2 botste met golf 1 ná de betaalde `web_search`. Vervangen door een
partiële index alleen over periodieke metingen; `measure.ts` vangt een resterende race af zonder
herhaling. Op productie: 14 vastgelopen taken opnieuw ingepland, allemaal geslaagd, `tracking_runs`
telt nu 24 rijen voor Huyberts in plaats van 10.

**2. Een pagina uit het contentplan kon nooit gemeten worden.** `/api/cron/plan` gaf geen `targets`
mee. `targetsFromSourceRef()` leest de doelvragen nu terug uit het rapport via `source_ref`,
geverifieerd tegen bestaande `content_piece_targets`. Vijf nog niet geschreven Huyberts-pagina's
krijgen hun doelvragen nu wél.

**3. De titel van een geschreven pagina was een opdracht aan de klant.** `displayTitle()`
(`lib/pipeline/slug.ts`) toont nu overal de `meta_title` die het model zelf schrijft in plaats van de
aanbevelingstitel: "Keukenrenovatie Eindhoven | Huyberts Keukens" in plaats van "Publiceer een
regionale pagina voor keukenrenovatie in Eindhoven".

**4. De potentiescore onderscheidde niets bij een nieuwe klant.** Zoekvolume is per onderwerp, dus
alle kansen van hetzelfde onderwerp deelden het getal bij zichtbaarheid nul.
`distributePotentialByWeight()` herverdeelt binnen een groep gelijke kansen naar gewicht van de
doelvragen. Nagerekend: zeven keer 58 werd 58, 33, 29, 25, 25, 21, 6.

**5. Een artikel schrijven paste niet altijd in het tijdbudget van 105 seconden.** Redeneertijd
domineert de uitschieters, niet het aantal woorden. `CALL_BUDGET_MS` naar 150s. `HEAVY_JOB_RESERVE_MS`
reserveerde 2× het volle budget ook voor de korte kritiekaanroep; herzien naar wat schrijven +
kritiek echt nodig hebben, wat de reservering zelfs verlaagde (200s). Routelimiet en werkerbudget
ongewijzigd. Nog niet met een echte schrijfronde geverifieerd.

**6. Het effectoordeel kon bij weinig doelvragen alleen "gelijk" zeggen.**
`minQuestionsForSignal()` maakt concreet hoeveel doelvragen nodig zijn. Na de fix van punt 1 meet de
Eindhoven-pagina 5 doelvragen (was 2): het scherm zegt nu "met 5 vragen niet te onderscheiden van
toeval, minstens 25 nodig" in plaats van "binnen de meetruis". Drempel zelf niet verlaagd; structurele
oplossing (meer doelvragen per pagina) staat in `roadmap.md`.

**Kleiner punt A, de claimvalidator, bleek geen probleem zoals omschreven.** Niet `isGapQuestion()`
maar een dubbel geformuleerd feit was de oorzaak: de eerste formulering haalde de overlapdrempel van
60% niet. Die drempel verlagen zou vangnetten verzwakken die eerder twee echte verzinsels vingen (Van
der Valk, Fysi-Unique). Overgeslagen.

**Kleiner punt B, toewijzen, liet de accountlaag liggen.** `POST /api/profiles/[id]/assign`
verplaatste `user_id` maar niet `account_id`. Nu via `defaultAccountFor()`. Op productie geverifieerd
én rechtgezet: Huyberts Keukens kreeg een eigen account.

`docs/tasks/doorloop-huyberts.md` is verwijderd, alle zes punten hierboven samengevat.

## 26 augustus 2026: het dossier terug naar tabbladen, en meteen weer teruggedraaid

Op verzoek is het analysedossier (`app/(app)/analyses/[id]/page.tsx`) omgezet van één doorlopende
scrollpagina met een hoofdstuk-rail naar vier losse tabbladen, sticky en horizontaal boven de
inhoud (`components/chapter-tabs.tsx`). Diezelfde dag is dat verzoek weer volledig ingetrokken: de
wijziging is teruggedraaid met `git revert` op de mergecommit, `components/chapter-tabs.tsx` is
weer weg en het dossier is weer de doorlopende pagina met `SectionRail` van vóór dit verzoek. De
reden voor de oorspronkelijke, niet teruggedraaide keuze (§9: werk kruiste de oude vijf tabbladen,
een tabbalk kan de vaste volgorde stand → bewijs → werk → resultaat niet uitdrukken) staat nog
onverkort in `components/chapter.tsx`.

## 26 augustus 2026: het dossier opnieuw naar tabbladen, nu met de lagen erbij

Dezelfde dag, na de terugdraai hierboven, is de omzetting opnieuw gevraagd, nu met twee eisen die de
eerste ronde niet had: de balk moet bij het scrollen aan de bovenkant blijven hangen, en altijd
zichtbaar zijn en overal bovenop liggen. De code van de eerste ronde is teruggehaald uit de
git-historie (commit `06f66ea`) en op die twee punten uitgebreid.

**Vier losse tabbladen.** Het analysedossier (`app/(app)/analyses/[id]/page.tsx`) toont nog één
hoofdstuk tegelijk (Stand, Waar je mist, Wat je moet doen, Opgeleverd), gestuurd via
`?hoofdstuk=stand|bewijs|werk|resultaat` in de URL. Geen client-side tabstate: elk tabblad blijft een
deelbare link en houdt zijn eigen `Suspense`-grens, want er staat nooit meer dan één hoofdstuk in de
DOM. Acht plekken linkten met een `#hoofdstuk`-anker naar het dossier; die zijn omgezet naar
`?hoofdstuk=...`, een anker naar een hoofdstuk dat niet gerenderd wordt scrolt nergens heen. Nieuw
component `components/chapter-tabs.tsx`, los van `components/section-rail.tsx`: die laatste draait ook
op het onboardingscherm, dat wél één doorlopende pagina met scroll-spy blijft.

**De kier van vier pixels.** Beide sticky chiprijen stonden op een los getal, `top-[57px]`, terwijl de
bovenbalk 61 pixels hoog is: 36 voor de knoppen, 2 × 12 padding en 1 voor de onderrand. Daar schoof de
pagina-inhoud doorheen, tussen de bovenbalk en de balk eronder. De hoogte staat nu in één token,
`--header-h` in `app/globals.css`, en `workspace-chrome.tsx` zet hem óók op de bovenbalk zelf, zodat de
twee getallen niet meer uit elkaar kunnen lopen. Dezelfde variabele bepaalt nu ook waar een anker
binnen een hoofdstuk (`#antwoorden`, `#offsite`) stopt met scrollen; dat stond op `scroll-mt-24` (96
pixels) terwijl de twee balken samen ongeveer 106 pixels beslaan, dus de kop van zo'n blok verdween
onder de balk.

**De z-index-ladder.** De tabbalk stond op `z-10`, en elk hoofdstuk zet zijn kop en inhoud óók op
`relative z-10` (`components/chapter.tsx`). Bij een gelijke z-index wint wat later in de DOM staat, dus
de hoofdstukinhoud schoof bij het scrollen dwars over de balk heen. De ladder ligt nu vast en staat in
`docs/ux-design.md`: hoofdstukinhoud `z-10`, popovers `z-20`, navigatiebalken `z-30`, uitklapmenu's
`z-40`, dialogen en meldingen `z-50`. De tabbalk zit dus op dezelfde laag als de bovenbalk, en blijft
onder de menu's en dialogen die wél over navigatie heen horen te vallen.

Wat hiermee niet is opgelost, en dat is bekend: de vaste leesvolgorde stand → bewijs → werk →
resultaat, waarbij hoofdstuk 04 het hoofdstuk 01 van de volgende periode voedt, kan een tabbalk niet
uitdrukken. Dat was §9 de reden om er destijds vanaf te stappen. De nummering 01 t/m 04 blijft de
volgorde tonen en hoofdstuk 04 benoemt de terugkoppeling in zijn eigen tekst, maar met één scroll van
meting naar bewijs naar werk lopen kan niet meer, dat zijn nu drie klikken.

## 26 augustus 2026 · Het planscherm: minder blokken, een datum die je zelf zet, en een menu dat niet meer afgeknipt wordt

Vijf ingrepen op `/merk/[id]/strategie/plan`, na een ronde meekijken met de eigenaar.

**Het blok "Nog niet gemeten" is eruit.** Onder de voorraad stond een lijst met de clusters die nog
geen kans konden leveren, met een meetknop erbij; bij Gasservice Brabant waren dat er zes van de zeven.
Het beantwoordde een echte vraag, maar niet de vraag van dít scherm: hier plan je in, welke clusters
nog gemeten moeten worden hoort op het clusterscherm. Bovendien stond het ónder een lijst die zelf al
scrollt, dus je zag het pas na de hele voorraad. Weg, inclusief de pure functie `ongemetenClusters()`
en de vier unittests eromheen.

**Drie teksten die het scherm in zijn eigen woorden lieten praten.** "10 in de voorraad" is "10 content
beschikbaar" geworden, de kop "Beschikbaar" is "In te plannen content", en de lege staat zegt nu wat er
komt te staan in plaats van uit te leggen waarom er niets staat. De paginakop noemt niet meer links en
rechts (klopt op een telefoon niet) maar de handeling: plan content op basis van je clusteranalyses,
sleep items naar de maand waarin ze geschreven moeten worden.

**De publicatiedatum is zelf te zetten** (migratie `0067`). De spreiding uit `spreadDates()` verdeelt
tien pagina's netjes over de maand, wat meestal klopt maar niet altijd: wie zijn pagina over de
showroomdagen vóór die dagen live wil hebben, kon tot nu toe alleen de hele maand verschuiven. Klik nu
op de datum in de regel, of kies "Datum aanpassen" in het menu. `datumProbleem()` bewaakt twee grenzen,
in de browser en op de server met dezelfde functie (conventie 1): binnen de kalendermaand van die
planmaand, en niet in het verleden.

De valkuil zat niet in het zetten maar in het bewaren. `resequenceMonth()` herberekent na élke
wijziging in een maand alle data, dus zonder de kolom `scheduled_manual` was 18 augustus één
sleepbeweging later weer 15 augustus, precies zoals de spreiding hem uitrekende. De vlag geeft zo'n dag
dezelfde uitzondering die een geplaatste pagina al had. `swapWithNeighbour()` volgt dezelfde regel,
anders verhuist "deze pagina moet op de 18e, want dan is de beurs" naar de buurman, en hij vervalt
zodra de kaart naar een andere maand of terug naar de voorraad gaat: een dag in oktober is geen dag in
november. Alle drie de regels staan als ketentest in `test-chain.ts`, geen enkele unittest ziet of de
vlag het hele pad van database tot herberekening haalt.

**Het uitklapmenu werd afgeknipt.** De drie puntjes op een planregel openden een menu met `position:
absolute` binnen de maandkaart, die `overflow-hidden` heeft (anders steken de rijen door de afgeronde
hoek). Op de onderste regels liep het menu dus dood tegen de kaartrand: van "Verplaats naar" zag je
alleen de kop en de helft van de eerste maand. Hetzelfde gold in de voorraadlijst, die met
`overflow-y-auto` scrolt. Het menu hangt nu in een portal op `document.body` met `position: fixed`,
klapt naar boven open bij te weinig ruimte onderin, en sluit bij scrollen buiten zichzelf. Laag `z-40`,
de laag van uitklapmenu's uit de ladder in `ux-design.md`.

## 27 augustus 2026: vier ingrepen uit een structuurreview met verse ogen

Een product- en structuurreview van het klantoppervlak, uitgevoerd zonder de documentatie te lezen.
Tien bevindingen, vier gebouwd, allemaal over volgorde en zichtbaarheid, niet ontbrekende
functionaliteit.

**1. De klant zag vier knoppen die hij niet mocht indrukken.** Besluit 18 zette alle zes betaalde
handelingen op slot bij de beheerder, terecht qua rekensom, maar knoppen als "Bevestig en start de
meting" en "+ Nieuw cluster" weigerden pas ná de klik, en "Bekijk en bevestig het concept" stond zelfs
actief in de werklijst van de startpagina.

Het slot zit nu per handeling (`STAFF_ONLY_ACTIONS` in `lib/cost-rules.ts`,
`mayTriggerCost(userId, action)`). Bij de beheerder blijven twee verkoopmomenten (nieuw merk
onderzoeken, reputatieanalyse); vier zijn van de klant (cluster starten, meting bevestigen, content
laten schrijven, maand vrijgeven). Het budgetplafond (€50/maand) is daarmee de rem die telt, en gold
altijd al voor iedereen. De handeling is een verplicht argument zonder standaardwaarde, zodat de
compiler een keuze afdwingt bij een nieuwe route. De reputatiepagina liet al zien hoe het hoort ("dit
zet je consultant voor je in gang"), nu ook bij het aanmaken van een merk.

**2. Het product is een kringloop, het menu is een kast.** Meten, kansen, plannen, schrijven,
publiceren, hermeten stond in statussen maar op geen scherm getekend. `lib/ronde.ts` rekent de zes
stappen uit, `RondeBalk` tekent ze bovenaan met de stand per stap en wie aan zet is. Geen vullende balk
(belooft een einde dat er niet is), geen "3 van de 10" (een doel dat de klant niet zelf stelde is een
verwijt). Twee stappen (plannen, publiceren) dragen de chip "jij".

**Het zichtbaarheidspercentage staat weer op de startpagina**, met marge en verschil: draait de
beslissing van 26 augustus (één dag oud) terug, een meetproduct opent niet met vier productietellingen
terwijl de klant komt kijken of het wérkt. De twee vangrails in `test-unit.ts` bewaken nu het
omgekeerde: het cijfer komt met marge, een verschil binnen die marge heet "gelijk gebleven".

**3. Twee adressenstelsels naast elkaar.** `/analyses` (alle merken) en de clusterlijst onder het merk
zelf; de terugknop boven elk clusterdossier heette "Mijn clusters" en wees naar de eerste, dus wie aan
merk A werkte zag ook merk B's clusters. `/analyses` is nu een doorverwijzing naar het actieve merk, de
terugknop heet "Clusters", `navActief()` licht het menu-item op. Routes zelf niet verhuisd.

**4. Publiceren stond onder acht andere blokken**, terwijl het de enige handeling is die het cijfer
beweegt (een geschreven pagina die niet online staat levert nul op). Staat nu bovenaan, handleiding
ingeklapt eronder.

**Wat niet gebouwd is, bewust wachtend:** het contentplan als sleepbord getoond aan de klant, "je
consultant" zonder te zeggen wie dat is, Zoekverkeer dat naar een 404 verwijst, "Merkprofiel" als lade
met dubbele deuren, niets dat de klant tussen twee metingen terughaalt.

**Nagekomen op 27 augustus 2026: de leesweergave van het contentplan**, de vijfde bevinding. Het
planscherm bediende de consultant (sleepbord) en de klant (wil weten wat er deze maand geschreven
wordt) vanaf één scherm; de enige knop die voor de klant telde was niet van hem. Hij ziet nu deze
maand, volgende maand, en de rest ingeklapt, met bovenaan de volgorde: publiceren vóór nakijken (een
goedgekeurde tekst offline is al betaald en levert nul), nakijken vóór vrijgeven. De kalender bepaalt
"deze maand", niet de status. Eén handeling, dezelfde als op het bord: maand vrijgeven, dezelfde
dialoog en route (conventie P2); een broncodecontrole bewaakt dat de leesweergave geen
sleepmachinerie krijgt.

**Bijgesteld op 27 augustus 2026, later diezelfde dag: de klant mag alles behalve twee dingen.** Op
verzoek ging het slot verder open dan de review voorstelde. Enige blijvende handeling: de
reputatieanalyse (los product, knop met uitnodiging ernaast). Een nieuw merk onderzoeken kan de klant
nu wel.

Het contentplan is nu twee weergaven voor iedereen met een schakelaar: "welke pagina komt in welke
maand" (bord) en "wat gebeurt er deze maand" (wat de klant het vaakst wil). Een weergave in de URL
wint van de rol, zodat een gedeelde link bij beiden hetzelfde opent.

De grens ligt nu bij **de beheerschermen**: onboarding, diagnose, toewijzen, alle merken, koppelingen,
achter `isStaff` met een `notFound()`. Zoekverkeer verwees als enige knop naar een scherm dat voor de
klant niet bestaat, daar staat nu dat de consultant de koppeling legt.

**Nagekomen op 27 augustus 2026: één merk tegelijk, nu een grens in de query.** De tenancy klopte al
(RLS, migratie `0046`), maar `loadWorkAcross()` haalde élke analyse van de gebruiker op over al zijn
merken, en twee schermen filterden pas daarna zelf. Filteren is een intentie, de query is de garantie
(conventie 1): bij een bureau met drie merken zijn verkeerd getoonde cijfers geen theorie maar een
klantrelatie. Functie heet nu `loadBrandWork()`/`loadDashboard()`, merk als verplicht argument.

Twee merkoverstijgende aggregaten (`stats`, `biggestChange`) verhuisden mee naar de losse
clusterlijst, die nu een doorverwijzing is. `/merk` is het enige klantscherm met meer dan één merk in
beeld (namen en status, geen cijfers); een klant met één merk wordt daar vandaan doorgestuurd.

**27 augustus 2026, verder op de dag: de klantweergave.** Een beheerder ziet nu met één knop wat een
klant ziet, zonder uit te loggen. `lib/staff.ts` splitst het echte recht (`isStaffAccount()`) van het
effectieve recht (`isStaff()`, dat de klantweergave meeweegt); overal waar al `isStaff()` gevraagd
werd, geldt de klantweergave vanzelf mee.

De garantie zit in de volgorde: `isStaff()` controleert eerst het echte recht, dan de cookie. Een
klant die de cookie zelf zet verandert niets, de cookie kan nooit rechten geven, alleen wegnemen.

Eén randgeval: RLS kent de klantweergave niet, dus leesroutes blijven voor een beheerder altijd werken
(elk merk previewen kan). Schrijfroutes lopen via `hasAccess()` en vallen wél op `isStaff()` terug,
dus een schrijfpoging op een vreemd merk wordt tijdens klantweergave geweigerd zoals bij een echte
klant.

Overwogen en afgewezen: een écht tweede klantaccount (Supabase staat geen dubbel e-mailadres toe). De
knop lost de behoefte beter op.

**28 augustus 2026: de werkruimte krijgt haar lichtgrijs terug.** De narekening tegen Nova van 24
augustus maakte de hele pagina wit, ook de ingelogde werkruimte: Nova's `body` is wit, maar dat is een
pagina zónder zijbalk, en kaarten op wit náást een zijbalk verliezen hun rand. `<main>` in
`components/workspace-chrome.tsx` kreeg zijn achtergrond terug op `--bg-muted` (`#f8fafc`); `--bg-base`
blijft wit. Zie `docs/designsystem.md` §2.1.
## 28 augustus 2026: de startpagina telt opbrengst, de vragen krijgen een eigen plek, en een pagina wordt pas af als de vragen behandeld zijn

Vier wensen van de eigenaar in één ronde: wat het product oplevert, en wat de klant moet leveren om dat
op te leveren.

**1. Drie van de vier cijfers op "Hoe sta je ervoor" zijn totalen geworden.** Twee kwamen uit de
kansenlijst (voorstellen): bij Van den Udenhout stond de rij op `0 · 0 · 7 · 5` zonder één geschreven
letter, opbrengst en voornemens door elkaar. Nu: clusters actief, pagina's geschreven, geoptimaliseerd,
gepubliceerd, met "Sinds maart 2026" erboven. Voorstellen staan in het kansenblok eronder.

Twee tellingen rechtgezet: status `briefing` telt niet meer als geschreven (wacht nog op antwoorden),
en `gepubliceerd` telt nu alleen de huidige versie (herpublicatie telde eerder dubbel).

**2. "Vraagt jouw input" heet "Openstaande vragen" en staat onder Strategie.** Merkbrede en
clustervragen stonden apart, dezelfde splitsing die op 17 augustus al eens is opgeheven. Nu samen op
`/merk/[id]/strategie/vragen` met filter per cluster; het oude adres verwijst permanent door. Het
invoerveld ging van één regel naast de vraag naar drie regels eronder (in 26rem schrijft niemand een
garantie op). Strategie krijgt zo een vierde bestemming: de enige plek waar de klant zelf iets moet
dóén, de andere drie tónen.

**3. Een groene teller in de bovenbalk.** "3 openstaande vragen" met een ademend bolletje; het
menu-item krijgt hetzelfde bolletje zonder getal (twee keer hetzelfde cijfer laat de lezer zoeken welke
echt is). Bij nul verdwijnt de melding (een balk die altijd "0" meldt went binnen een dag weg). Eén
loader/optelling (`lib/open-questions.ts`/`-count.ts`) voor bovenbalk, zijbalk én paginakop, kost twee
queries per weergave.

**4. De eindpoort: geen definitieve versie zolang er vragen open staan.** Spreekt een eerder besluit
tegen ("Geen muur"), maar geldt alleen de eindstap: tekst blijft leesbaar/bewerkbaar, publiceren doet
de klant zelf, op slot gaat alleen dat ORBIT ENGINE de pagina afrondt. Staat **niet** vóór het eerste
concept (de scherpste vragen ontstaan tijdens het schrijven via de claim-audit), maar bij nieuwe versie
laten schrijven en vrijgeven. Tegenhouden doen alleen de vragen van dít cluster plus déze pagina, een
losse merkvraag blokkeert niets. Overslaan telt als antwoord. Twee lagen (conventie 1): knop toont de
melding, route weigert met 409.

De ketentest legde een shim/database-verschil bloot: `.contains()` castte naar `jsonb` terwijl
`fact_requests.content_piece_ids` een `uuid[]` is, Postgres gaf nul rijen in plaats van een fout. Shim
doet nu een array-vergelijking.

**Eén wens bleek al gebouwd**: content laten schrijven is sinds 27 augustus al vrij, alleen de
reputatieanalyse staat op slot.

**Ingetrokken tijdens deze ronde:** hernoeming "clusters" → "metingen" (botste met de meetronde),
weghalen van de rondebalk, en de statuscijfers in de bovenbalk.

**28 augustus 2026, verder op de dag: een stippenpatroon op de werkruimte.** Aangeleverde CSS op
`<main>` (lichte stand) had één maskerregel uitgecommentarieerd die het effect droeg ("in het midden
niet zichtbaar"). Verwerkt als `.workspace-canvas` op een eigen `::before`-laag, los van `--bg-muted`.
In donker valt het patroon weg. Zie `designsystem.md` §2.1.

**Nog verder op de dag: hetzelfde patroon in donker.** Nieuw token `--workspace-canvas-dot` (licht
`#e4e9ee`, donker `--bg-surface-2` `#43505d`, líchter want `--bg-elevated` valt in donker samen met
`--bg-muted`). Masker ongewijzigd.

**Nog verder: het patroon in donker weer teruggedraaid.** Beviel niet; alleen licht houdt het
stippenpatroon.

**Aan het eind van de dag: de app is traag omdat hij te ver van zijn database staat.** Database zelf
uitgesloten (geen app-query bovenaan `pg_stat_statements`, client-bundel klein genoeg). Vier oorzaken.

**De grootste: Vercel-functies in `iad1` (Washington), Supabase in `eu-west-1` (Ierland).** Geen
`regions` in `vercel.json`; elke databasevraag stak de oceaan over, ~80ms tegen ~1ms in de database,
dertien keer op het merkoverzicht. Nu `"regions": ["dub1"]`. ⚠️ Verhuist Supabase ooit, dan hoort deze
regel mee. Zie `architecture.md` §1.

**De tweede: dertien netwerkrondes waar acht nodig waren.** `supabase.auth.getUser()` drie keer per
scherm gesteld, nu één keer via React `cache()`. Drie onafhankelijke vragen in de shell wachtten
achter elkaar, nu tegelijk. De middleware sloeg `/api/` niet over, een extra Auth-ronde vóór élke
knopklik.

**De derde: achttien schermen zonder wachtvorm**, juist die in de zijbalk (Next.js laat de oude
pagina staan tot de nieuwe klaar is, wat als hangen voelt). Veertien kregen er nu één via
`PageSkeleton`.

**De vierde: dertien knoppen zeiden "klaar" voordat ze het waren.** `router.refresh()` geeft niets
terug om op te wachten, dus liep de `finally` direct af: knop sprong terug vóórdat de cijfers klopten.
`useRefresh()` (`components/use-refresh.ts`) zet de verversing in een `useTransition`. Zie
`ux-design.md` §4.

**Nagerekend op productie, dezelfde dag.** Gemeten aan de werker (twee vaste aanroepen per minuut):

| | Vóór (`iad1`) | Na (`dub1`) |
|---|---|---|
| Metingen | 20 minuten | 12 minuten |
| Mediaan | 451 ms | 125 ms |
| Zonder koude start | | 104 ms |
| Slechtste geval | 866 ms | 293 ms |

Mediaan -72%, zonder koude starts -77%, slechtste geval bijna drie keer beter (dát is het bezoek
waarop een klant denkt dat de app hangt).

⚠️ **Wat hiermee níét gemeten is:** alleen de afstand tot de database. De drie andere maatregelen zijn
gecontroleerd met 2495 unittests, 358 ketentests, typecheck en build, maar niet op een echt
paginabezoek (geen verkeer in de zeven dagen ervoor).

Na de deploy: `/merk` stuurt een bezoeker zonder sessie nog naar het inlogscherm, `/api/health`
antwoordt zonder de middleware.
## 24 augustus 2026: de Sales-module, sprint 1 van zeven

⚠️ **Deze twee stukken zijn op 24 augustus geschreven en pas op 29 augustus samengevoegd met de
hoofdlijn.** Ze staan daarom niet op hun chronologische plek, en de migratienummers erin zijn
gewijzigd: 0065 tot en met 0067 waren intussen door ander werk bezet, dus de Sales-migraties heten
nu `0068` tot en met `0070`. Zie de aantekening van 29 augustus onderaan.

Het fundament van de GEO Prospect Engine staat: de rol, de markt en het bedrijf. Het plan zelf staat
in `docs/tasks/geo-prospect-engine.md`; hier alleen wat er bij het bouwen is besloten en waarom.

**Drie rollen in plaats van twee, en de beheerder blijft de breedste.** `sales_users` komt naast
`staff_users`, met dezelfde opzet: RLS aan, nul policies, rijen komen er alleen via het
Supabase-dashboard in. Een beheerder is automatisch ook sales admin, andersom niet. Dat scheelt een
openstaande beslissing: de vraag "wie krijgt de rol sales admin" (24.4 punt 4 van het plan) blokkeerde
sprint 1 op papier, maar de eigenaar kan de module nu openen zonder dat er ook maar één rij in
`sales_users` staat. De vraag knelt pas bij de eerste salesmedewerker die geen beheerder is.

**De scheiding met de klantomgeving staat op drie plekken, niet op één.** Dat is bewust
overgedimensioneerd voor één sectie, en de reden is dat dit de enige plek in de app is met gegevens
over bedrijven die geen klant zijn en er niet om gevraagd hebben. De database geeft een klant nul
rijen (RLS met `is_sales()`), de route geeft hem "pagina bestaat niet" en geen "geen toegang", en
een broncodecontrole in `scripts/test-unit.ts` houdt vast dat geen enkel klantscherm een
Sales-tabel leest. Alleen de gedeelde app-layout importeert uit de Sales-laag, en precies om de kop
te kunnen verbergen. Die uitzondering staat met naam in de test, zodat er geen tweede bij kan komen
zonder dat iemand het merkt.

**Drie keuzes waar het plan iets anders voorschreef, alle drie omdat de letterlijke lezing iets
kapot zou maken.**

1. **`sales_companies.domain` is nullable geworden.** Het plan noemt hem uniek en verplicht. Maar een
   bedrijf zonder website is juist de prospect waar deze module naar zoekt: aantoonbaar bestaand en
   volledig onzichtbaar. Een verplichte kolom zou precies die groep bij de marktontdekking
   weggooien, en dat is hetzelfde AI-vooroordeel dat hoofdstuk 9 van het plan nou juist wegneemt.
   De uniciteit zit nu in een gedeeltelijke index.
2. **`sales_market_companies.included` heeft drie standen.** `null` is "de admin heeft er nog niet
   naar gekeken" en `false` is "eruit gehaald". Met twee standen is een niet-beoordeelde lijst niet
   te onderscheiden van een lijst waar alles is afgekeurd, en dan kan goedkeuringspoort 1 niet
   bestaan. Conventie 3, en hier met een gevolg: de poort is de duurste fout die deze module kan
   voorkomen.
3. **`standaardLabel()` maakt geen meervoud.** Het plan schrijft "Makelaars Eindhoven" en dat leest
   prettiger, maar automatisch vermeervoudigen is in het Nederlands een gok: makelaar wordt makelaars
   en architect wordt architecten. Het voorstel luidt nu "Makelaar Eindhoven" en is aan te passen.

**De zijbalk kreeg een zevende kop, en daarmee een grens die in data staat.** De regel van 17
augustus was drie bestemmingen per hoofdstuk, met sindsdien twee onderbouwde uitzonderingen op vier
(Admin, Analytics). Sales heeft er vijf. In plaats van de derde uitzondering in een `if` te verwerken
staat de grens nu per hoofdstuk in `GRENS_PER_HOOFDSTUK`, en leest de test diezelfde tabel. Het
verschil is niet gemak: een uitzondering staat nu op één plek met een naam en een reden erbij, en de
klanthoofdstukken staan er expliciet op drie in plaats van dat "hooguit vier" langzaam de norm wordt.
De onderbouwing voor Sales is van een andere soort dan bij de andere twee, en dat is het punt: het
bezwaar van 17 augustus ging over wat een klant te zien krijgt, en de klant ziet deze groep nooit.

**Twee fouten in het plan zelf gecorrigeerd.** Sprint 1 en sprint 2 hadden allebei hetzelfde
migratienummer, wat niet kan zodra de eerste op productie draait; sprint 2 kreeg het volgende nummer
en de rest schuift mee. En de uitsluitingen uit 9.5 stonden in de migratie van sprint 5 terwijl sprint 2 ze gebruikt,
drie sprints te laat. Daarnaast spraken drie plekken nog van zeven opportunitytypes terwijl er acht
zijn; dat is een restant van voordat type 8 (verlies) werd toegevoegd.

**Wat er nog niet is, en dat hoort zo.** Er wordt niets ontdekt, niets gemeten en niets geschreven.
Een markt aanmaken kost dus ook niets, en er zit daarom geen budgetcontrole op die route: een rem op
een handeling die niets kost, wekt de indruk dat er iets in gang wordt gezet.

Migratie `0068` op productie, 2206 unittests en 310 ketentests groen.

## 24 augustus 2026: de Sales-module, sprint 2 van zeven

De marktontdekking staat: uit een branche en een plaats komt een bedrijvenlijst, ontdubbeld, met een
zekerheid per bedrijf en zonder de klanten van Outer Orbit erin. Vier taken in de wachtrij, waarvan
er één een model aanroept.

**Besloten: eerst de gratis bronnen.** Van de vier bronnen uit hoofdstuk 9 van het plan zijn er twee
gebouwd. Een onderzoeksmodel dat het web doorzoekt, en de overzichtspagina's die dat model aanwijst,
daarna door onze eigen crawler uitgelezen. Het kaartenregister en het handelsregister kosten geld per
opvraging en staan uit tot de eerste echte markt uitwijst dat ze nodig zijn.

**Die tweede bron is het hele punt van deze sprint.** Het plan waarschuwt ervoor dat een systeem dat
alleen verzamelt wat AI noemt, per definitie blind is voor zijn beste prospects. Een model vragen om
bedrijven op te sommen lost dat maar half op, want het blijft hetzelfde kanaal. Wat het wél oplost:
het model de overzichtspagina's laten aanwijzen en die daarna zelf uitlezen. Een ledenlijst van een
branchevereniging linkt naar zijn leden, ook naar de leden die geen model ooit noemt. De ketentest
heeft daar een bedrijf in zitten dat uitsluitend via die weg binnenkomt, en dat is de assertie die de
belofte van hoofdstuk 9 bewaakt.

**Bedrijven worden op links geoogst en niet op lijststructuur.** Elke ledenlijst heeft zijn eigen
opmaak, en een parser per site gaat stuk bij de eerste ontwerpwijziging van die site. Uitgaande links
zijn overal hetzelfde. Grover, en bestand tegen verandering. De linktekst is op zo'n pagina meestal
de bedrijfsnaam, en dat scheelt een netwerkverzoek per bedrijf; is de tekst nietszeggend ("lees
meer"), dan valt de naam terug op het domein en is dat zichtbaar als herkomst `domein`.

**Poort 1 is een echte stop en geen pauze.** De uitsluitingsstap plant niets in. Alleen een mens die
op goedkeuren drukt zet de crawltaken in gang. Dat is met opzet: het duurste dat deze module kan doen
is een verkeerd afgebakende markt doormeten, en dat is precies het moment waarop dat nog gratis te
herstellen is. Wat er ná goedkeuring gebeurt is de crawl per bedrijf, en die kost niets.

**Twee fouten die de tests hebben gevonden, en beide zaten in de samenhang.**

1. **`jobs_has_owner` weigerde elke Sales-taak.** Migratie `0013` eiste dat een taak aan een analyse
   of een merk hangt. Een Sales-taak hangt aan een markt, en een markt is geen merk. De ketentest zag
   het bij de eerste keer dat de keten draaide. Gerepareerd met een derde soort eigenaar
   (`jobs.sales_market_id`, migratie `0070`) en niet met een uitzondering op de regel: met "of het
   type begint met sales" zou de taak nog steeds aan niets hangen en zou niemand achteraf kunnen
   vragen wat er voor een markt gedraaid heeft.
2. **Het plafond blokkeerde ook de gratis stappen.** `beoordeelBudget` keek of de kosten na de stap
   nog onder het plafond bleven, en bij nul kosten is dat nog steeds onwaar zodra het budget vol is.
   Gevolg: een markt met een vol budget zou ook zijn crawlgegevens verliezen, zonder dat het één cent
   bespaart. Een rem hoort te remmen waar geld wegloopt en nergens anders, dus een stap die niets
   kost wordt nooit meer geblokkeerd.

**Wat er nog niet is.** Er wordt niets gemeten. De keten stopt na de crawl, en dat is waar sprint 3
begint. De kostencijfers van deze module zijn schattingen, geen metingen: er heeft nog geen enkele
echte marktanalyse gedraaid. Zodra dat gebeurt horen ze tegen `ai_calls` nagerekend te worden,
precies zoals bij de reputatieanalyse is gedaan.

**En één correctie op het plan zelf, voor de tweede keer.** Het plan legde per sprint een
migratienummer vast. Dat liep twee keer vast: eerst omdat sprint 1 en 2 hetzelfde nummer kregen, toen
omdat sprint 2 er een tweede nodig bleek te hebben. Je weet vooraf niet hoeveel migraties een sprint
kost, dus die nummers staan er nu niet meer in. `supabase/README.md` is de eigenaar van dat feit, en
het plan zegt alleen nog wát er nodig is.

**Nog niet geverifieerd.** Het verificatiecriterium van sprint 2 is dat New business naar de lijst
van één echte markt kijkt en zegt of hij klopt, met minstens 80% van de bedrijven die zij zelf
kennen erin. Dat is niet gebeurd. Alles werkt, en dat is iets anders dan af (conventie 10).

Migraties `0069` en `0070` op productie, 2308 unittests en 338 ketentests groen.

## 29 augustus 2026: de Sales-module weer op de hoofdlijn, en drie migratienummers verschoven

De GEO Prospect Engine stond sinds 24 augustus op een eigen werklijn en is nooit samengevoegd. De
database liep intussen vóór op de code: de drie Sales-migraties draaiden wél op productie, de
schermen stonden niet in de live app. Dat is nu rechtgezet, en er zaten drie dingen in de weg.

**De nummers botsten.** De Sales-migraties heetten `0065`, `0066` en `0067`. Op 25 en 26 augustus
gaf ander werk diezelfde drie nummers aan de contentvoorraad, de correctie op de effectmeting en de
handmatige publicatiedatum. Beide reeksen staan op productie, dus de nummers zeggen niets meer over
de volgorde waarin ze gedraaid zijn. De Sales-reeks heet nu `0068` tot en met `0070`. De inhoud is
geen letter veranderd en alle drie zijn ze idempotent (`create table if not exists`,
`add column if not exists`), dus opnieuw toepassen onder de nieuwe naam verandert niets aan de data.

**De zijbalk was in tien weken verbouwd.** De Sales-sectie haakte in vier bestanden die intussen
allemaal veranderd waren. De grens per hoofdstuk staat sinds deze samenvoeging voor álle hoofdstukken
in `GRENS_PER_HOOFDSTUK` (`lib/nav.ts`): Strategie en Analytics op vier, Sales en Admin op vijf, de
rest op drie. Dat was op de twee werklijnen apart uitgevonden, één keer als tabel en één keer als
reeks `if`-takken in de test; de tabel wint, want dan staat elke uitzondering op één plek met een
reden erbij.

**Een marktdossier liet de zijbalk doven.** `navActief()` lichtte alleen de exacte route op, dus wie
`/sales/markten/<id>` opende zag nergens meer waar hij was. Dezelfde regel die het clusterdossier al
had, geldt nu voor de Sales-sectie: een dossier laat zijn lijst oplichten.

Verder zes wachtvormen erbij, want de regel van 28 augustus dat elk scherm met data een `loading.tsx`
heeft, bestond nog niet toen de Sales-schermen gebouwd werden.

**Wat er nog niet is.** Sprint 3 tot en met 7: meten, opportunities, outreach, publiceren en
hermeten. En het verificatiecriterium van sprint 2 is nog steeds niet gehaald: er is geen echte markt
gedraaid en New business heeft de lijst niet beoordeeld. Er staat ook nog niemand in `sales_users`,
dus de sectie is voor niemand zichtbaar totdat daar een rij in gezet wordt.

Migraties `0068` tot en met `0070` op productie, 2708 unittests en 406 ketentests groen, typecheck
schoon en de productiebuild draait.

## 29 augustus 2026: de Sales-module meet, sprint 3 van zeven

Uit een goedgekeurde bedrijvenlijst komt nu een gemeten markt. Wat erbij kwam: de commerciële
intenties van de markt, de vragen die daaruit volgen, de tweede goedkeuringspoort, de meting zelf op
elke beschikbare AI-assistent, het oordeel per antwoord en de rekensom erover. Vier taaksoorten,
vijf tabellen, migratie `0071`.

**De tweede as is het hele punt.** Een meting zonder intentielabel levert "je scoort 18 van 40" op,
en daar kan een ondernemer niets mee. Met dat label wordt het "bij de negen vragen over
aankoopbegeleiding word je nul keer genoemd", en dat is een gesprek. Elke vraag draagt daarom twee
etiketten: waar in de klantreis hij staat en welke soort opdracht hij meet. Het gewicht dat eruit
volgt is een rekensom van drie factoren, en die staat in een pure module zodat hij te controleren is
tegenover een prospect die hem naloopt.

**De verdeling wordt geteld en niet gevraagd.** Vraag een model om veertig vragen over zes intenties
en vier fases te verdelen, en je krijgt er zesendertig, of veertig waarvan er elf over dezelfde
intentie gaan. Dat is geen slordigheid maar de aard van de opdracht: tellen is geen taalwerk. De code
bepaalt daarom welke plekken er te vullen zijn, het model vult alleen de tekst in, en een geleverde
vraag die op geen enkele plek past valt af. Het stubantwoord in de ketentest levert met opzet elf
intenties terwijl er acht in passen, zodat die laag echt getoetst wordt.

**Het beoordelen is pure ontdekking.** De namen van de dertig bedrijven gaan niet mee in de prompt,
om dezelfde reden als bij de klantmeting: een meegegeven lijst richt het model op die namen in plaats
van op wat er staat. Het model somt op wie het ziet, en het koppelen aan een bedrijf uit de markt
gebeurt daarna deterministisch, op domein, op naam en op schrijfwijze, in die volgorde. Een naam die
bij geen enkel bedrijf hoort wordt bewaard: dat is ofwel een gat in onze marktinventarisatie, ofwel
een verzonnen naam, en allebei hoort de admin te zien.

**Twee vangnetten uit eerdere fouten, opnieuw.** De tekst beslist of een bedrijf genoemd is en niet
het model; bij de klantmeting gaf het model `mentioned` op merken die nergens in het antwoord
stonden. En een rol mag alleen gevuld zijn als het bedrijf genoemd is; daar vulde het model er bij
de klantmeting 10 van de 27 verkeerd in. Beide staan nu in code én als check-constraint in de
database.

**De noemer telt antwoorden en geen vragen.** Viel de meting van vier van de veertig vragen om, dan
is de noemer zesendertig. Zou hij veertig blijven, dan zakt elk bedrijf in de markt even hard en
lijkt de markt onzichtbaarder dan hij is, zonder dat iemand het kan zien. Datzelfde geldt per
intentie en per fase.

**Een fout die de ketentest vond, en die precies in de samenhang zat.** De meetstap schrijft de
bronnen (jsonb) en de onbekende namen (`text[]`) in één update. De testshim maakte van allebei een
Postgres-array, de jsonb-kolom weigerde dat, en omdat de aanroepende code de fout niet las bleef de
kolom leeg. Twee dingen zijn daarop veranderd: de code leest de fout nu wél, en de shim haalt de
echte kolomtypes uit de database in plaats van te raden. Zonder die eerste wijziging zou een markt
op productie een meting kunnen opleveren die compleet lijkt terwijl twee van de acht
opportunitytypes er niets uit kunnen halen.

**Wat het gaat kosten, en waar de knop zit.** Veertig vragen maal twee assistenten is ongeveer 95%
van wat een marktronde kost. Het aantal bedrijven verandert daar niets aan: die komen uit hetzelfde
antwoord. Vandaar dat het aantal vragen begrensd is en het aantal bedrijven niet, en dat de hele
ronde vooraf tegen het plafond wordt gehouden in plaats van per vraag. Per vraag beoordelen levert
een ronde op die halverwege stopt, met een score op een willekeurige deelverzameling en een rekening
die toch betaald is.

**Nog niet geverifieerd.** Het criterium van sprint 3 is dat de zichtbaarheidscijfers met de hand na
te rekenen zijn uit de opgeslagen antwoorden van een echte markt, en dat een tweede meting geen wild
ander beeld geeft. Er is nog geen echte markt gedraaid. Alles werkt, en dat is iets anders dan af.

Migratie `0071` op productie, 2804 unittests en 438 ketentests groen.

## 29 augustus 2026: de Sales-module maakt er kansen van, sprint 4 van zeven

Uit een gemeten markt komt nu een lijst gekwalificeerde saleskansen: per bedrijf welk soort kans er
is, hoe interessant die is, waarom, met welke openingszin en met het bewijs eronder. Twee
taaksoorten, twee tabellen, migratie `0072`.

**De detectie is deterministisch, en dat is het hele punt.** De acht types uit het plan zijn acht
regels in code, niet acht vragen aan een model. Wat hier uitkomt gaat naar een ondernemer die zijn
eigen markt kent, en een conclusie die uit een model komt is niet na te rekenen. Het model schrijft
alleen de zin, en daarna controleert code elk getal in die zin tegen de meetdata. Klopt er een niet,
dan valt de zin af en wint de volgende kandidaat; halen ze het geen van drieën, dan wint een
sjabloonzin die alleen gecontroleerde waarden bevat. Bij welke van de twee het uitkwam wordt
opgeslagen, want anders is niet te tellen hoe vaak het model getallen verzint.

**De score sorteert bewust niet op laagste zichtbaarheid.** Dat is de fout die het hele systeem
onbruikbaar zou maken: een bedrijf dat nul keer genoemd wordt kan een eenmanszaak zijn zonder
website, zonder budget en zonder ambitie, terwijl de professionele partij die één dure dienst mist
commercieel veel interessanter is. Van de honderd punten gaan er dertig naar de vraag of dit bedrijf
klant kán worden en of wij het plausibel kunnen oplossen. Er is een unittest die precies dat geval
tegenover elkaar zet, en die valt om zodra iemand de weging terugdraait.

**Twee dingen die de detectie bewust NIET doet.** Een verschil dat binnen de onzekerheidsmarge valt
is geen verschil: dat oordeel komt uit `lib/stats/` en niet uit een eigen vergelijking, want twee
plekken die "significant" net anders rekenen geven twee antwoorden op dezelfde vraag. En een intent
gap bestaat alleen als de eigen website die dienst beschrijft. Zonder die voorwaarde is het geen
kans maar een verwijt, en dan begint het gesprek verkeerd.

**Van de acht types is er één smaller gebouwd dan het plan beschrijft.** Het information gap
detecteert alleen het geval dat hard te bewijzen is: een antwoord dat het bedrijf in een andere
plaats zet dan waar het zit. Een verouderde dienst of een niet meer bestaand aanbod vraagt een
feitenlaag per bedrijf zoals de klantkant die heeft, en die bestaat aan de saleskant niet. Liever één
type dat klopt dan een tweede dat op een vermoeden rust.

**Wat de ketentest vond.** De detectie gooide bij een herberekening alle kansen weg en maakte ze
opnieuw aan. Dat leverde dezelfde uitkomst op met nieuwe id's, en daar hangt sprint 5 de toewijzing,
de conceptmail en de uitkomst aan: de outreach van een verkoper zou wijzen naar een kans die niet
meer bestaat. Het is nu een upsert op markt plus bedrijf, en er is een ketentest die de id's na een
tweede detectie naast elkaar legt.

**De kosten blijven waar ze horen.** Alleen de kansen die een verkoper ook echt oppakt krijgen een
geschreven zin; een lage kans houdt zijn sjabloonzin, en die is waar. Voor dertig bedrijven een mail
laten schrijven die niemand verstuurt is weggegooid geld, en dat is de tweede rem uit hoofdstuk 21
van het plan.

**Nog niet geverifieerd.** Het criterium van sprint 4 is dat New business de top tien en de bodem
tien beoordeelt en het met minstens acht van de tien eens is. Elke afwijking is een kalibratiepunt en
verandert een getal in de gewichtentabel. Dat gesprek heeft nog niet plaatsgevonden.

Migratie `0072` op productie, 2875 unittests en 451 ketentests groen.

## 29 augustus 2026: de Sales-module bereidt het gesprek voor, sprint 5 van zeven

Een opgepakte kans levert nu een contactpersoon op, een conceptmail en een gespreksvoorbereiding, en
de hele werkstroom eromheen: statussen, een trechter, een afwijzing met een reden en een logboek.
Twee taaksoorten, vier tabellen, migratie `0073`.

**De app verstuurt niets, en dat is in de structuur vastgelegd.** De openingsmail gaat altijd door
de handen van de medewerker: hij leest het concept, past het aan en verstuurt het uit zijn eigen
mailbox. Dat staat niet als afspraak in een document maar als afwezigheid in de code. Er is geen
kolom met een verzendstatus, geen wachtrij, geen bezorgingsvlag, en geen enkel bestand in deze
module raakt de maillaag. Een unittest leest de broncode en valt om zodra dat verandert, want een
afspraak verdwijnt zodra iemand het handig vindt.

De reden is niet principieel maar praktisch, en er zijn er vier. De ontvanger krijgt een bericht van
een mens en niet van een systeem. De antwoorden landen in de mailbox van de verkoper in plaats van
in een systeempostbus. Er ligt altijd een menselijke lezing tussen het concept en de ontvanger, en
dat is de sterkste garantie tegen een verkeerde bewering in een eerste contact. En het beschermt het
maildomein: bulkverzending vanaf één systeem is precies het patroon waar spamfilters op letten.

**Wat de app wél remt is de aanvoer.** Twintig concepten per persoon per dag, en dat plafond
halveert zodra meer dan vijf procent van de verstuurde mails stuitert of een klacht oplevert. Dat is
geen kostenrem: gaan er honderd berichten per week uit vanaf hetzelfde domein waarop ook de
facturatie loopt, dan kan één golf klachten dat domein afknijpen. Dan komen ook de offertes niet
meer aan, en dat merk je pas als het weken misgaat.

**Drie regels over wie er een mail krijgt, en ze staan alle drie in code.** Een afgeleid adres is
geen adres: een gok op het naampatroon van het bedrijf mag opgeslagen worden, maar er gaat niets
naartoe voordat een mens hem bevestigt. Een mail die stuitert kost niets, een mail bij de verkeerde
persoon kost het bedrijf. Liever geen contact dan de verkeerde: vindt de stap niemand, dan blijft het
leeg en zoekt de verkoper zelf iemand op. En de functie moet passen: de eigenaar of de commercieel
verantwoordelijke, niet de administratief medewerker die toevallig op de teampagina staat. Een adres
op een ander domein dan het bedrijf wordt geweigerd, want dat is meestal de webbouwer.

**De mail en de belvoorbereiding gaan door dezelfde getallencontrole als de haak.** Elk cijfer erin
moet uit de meting komen; klopt er een niet, dan valt de tekst terug op een alternatief en anders op
een sjabloon dat saai en waar is. Dat geldt nadrukkelijk ook voor de voorbereiding: een verkoper die
een verzonnen cijfer voorleest aan de telefoon, staat er net zo hard naast als wanneer het in de mail
had gestaan. De voorbereiding heeft bovendien een verplicht blok "wat je niet moet zeggen", precies
om te voorkomen dat iemand iets belooft wat we niet gemeten hebben.

**Twee dingen die de database afdwingt en niet alleen het scherm.** Een afwijzing zonder categorie
bestaat niet, want zonder categorie is niet te leren welk soort prospect afhaakt. En er kan maar één
actieve outreach per bedrijf zijn: twee verkopers die hetzelfde bedrijf tegelijk benaderen is na het
benaderen van een bestaande klant de pijnlijkste fout die deze module kan maken. Beide zijn met een
ketentest tegen echte Postgres getoetst, en beide weigeren.

**De trechter telt cumulatief.** Wie een gesprek had is ook gemaild geweest, en een afgewezen kans
telt mee tot waar hij gekomen is. Zou de trechter op de huidige stand tellen, dan zakt "gemaild"
zodra iemand doorschuift naar "gebeld", en dan daalt het aantal verstuurde mails terwijl er méér
verstuurd is. Dat is de klassieke fout in een trechtergrafiek.

**Nog niet geverifieerd.** Het criterium van sprint 5 is dat een verkoper tien conceptmails leest en
van minstens acht zegt: deze zou ik versturen. Daarna gaan de eerste echte mails eruit. Dat is niet
gebeurd.

Migratie `0073` op productie, 2951 unittests en 465 ketentests groen.

## 29 augustus 2026: de Sales-module is compleet gebouwd, sprint 6 en 7 van zeven

De laatste twee sprints: de publieke marktpagina en het hermeten. Eén taaksoort, één tabel, vijf
routes, migratie `0074`. Daarmee loopt de keten van een branche plus een plaats tot een conceptmail
met bewijs eronder, en van een gemeten markt naar een openbare pagina waar een prospect het kan
nakijken.

**Het rapport hangt aan de meetronde en niet aan de markt.** Dat lijkt een detail en het is precies
waar het misgaat: een markt wordt herhaald gemeten, en een rapport dat bij ronde twee overschreven
wordt, laat een prospect andere cijfers zien dan er in zijn mail stonden. Om dezelfde reden
verschuift de publieke pagina niet vanzelf mee met de laatste meting. Wie hem wil bijwerken,
publiceert de nieuwe ronde bewust; anders blijft staan wat er stond, ook als er intussen opnieuw
gemeten is.

**Schrijven en publiceren zijn twee besluiten.** De meetketen schrijft geen rapport, want dan komt er
voor elke markt een tekst die misschien nooit online gaat. En een knop die schrijft én publiceert,
zet een tekst online die niemand gelezen heeft, met daarin de namen van bedrijven die er niet om
gevraagd hebben. Eerst lees je wat er staat, dan pas gaat het naar buiten.

**Drie dingen mogen nooit op die pagina.** Geen personen, want contactgegevens zijn
persoonsgegevens, ook als ze publiek op een website staan. Geen bedrijf dat om verwijdering vroeg,
zonder discussie en direct. En geen oordeel over een bedrijf: wat er staat is wat de AI-assistenten
antwoordden, en de ondernemer over wie het gaat leest die pagina zelf. Het stubantwoord in de
ketentest bevat met opzet zo'n oordeel, en de controle weigert hem en valt terug op een sjabloon.

**Een te dunne markt gaat niet online.** Onder de vijf zichtbare bedrijven is elk bedrijf herkenbaar
aan zijn plek in de lijst, en dan is "verwijderd op verzoek" een loze belofte tegenover de rest van
de markt. Die drempel wordt twee keer getoetst: bij het schrijven en opnieuw bij het publiceren,
want tussen die twee momenten kan er iemand om verwijdering hebben gevraagd.

**Een hermeting stelt letterlijk dezelfde vragen.** Dat is de voorwaarde onder opportunitytype 8:
alleen dan ligt een verschil aan de markt en niet aan de vragenlijst. De hermeting kopieert daarom de
vragen van de vorige ronde inclusief hun gewicht en hun intentielabel, en slaat de intentie- en
vragenstap over. Poort 2 blijft wel staan, want meten kost ook de tweede keer geld.

**En dat type werkt, aantoonbaar.** De ketentest meet een markt twee keer. De bedrijven die
hetzelfde gemeten worden krijgen géén verlies, want een daling die er niet is, is de fout die een
verkoper voor schut zet. De bedrijven die in ronde twee wegvallen krijgen het wél. Dat is de reden om
markten structureel te hermeten: elke ronde levert nieuwe belaanleidingen op uit een markt die je al
kent, tegen alleen de meetkosten.

**Van prospect naar klant is er nu ook**, de enige plek waar deze module de klantomgeving raakt. Er
wordt een merkprofiel aangemaakt met het webadres, de bedrijfsnaam en de naamvarianten die tijdens de
marktontdekking al geverifieerd zijn, en de gewone onboarding start. Dat laatste veld is geen detail:
daar levert een verkeerde invulling later een te lage meting op.

**De stand van de hele module: alles gebouwd, niets geverifieerd.** Zeven sprints staan er, en er is
geen enkele echte markt doorheen gegaan. Wat er nog moet gebeuren is geen code: één markt draaien,
New business naar de bedrijvenlijst laten kijken, de cijfers met de hand narekenen, de top tien en de
bodem tien laten beoordelen, tien conceptmails laten lezen, en dan de eerste mails de deur uit doen.
Pas daarna is deze module af.

Migratie `0081` op productie (aangemaakt als `0074`, hernummerd op 31 augustus toen bleek dat de onboardingronde dat nummer al gebruikt had), 3021 unittests en 478 ketentests groen.
## 31 augustus 2026, de eerste live doorloop van de hele klantreis

Werkpakket A, B en C uit `docs/optimalisatielab-orbit-engine.md` stonden op productie maar waren
alleen met tests gecontroleerd, nooit met een echte klant, een echte crawl en een echte meting. Deze
ronde heeft dat gedaan: één echt bestaand installatiebedrijf, van merk aanmaken tot en met de
contentbriefing, met echte betaalde aanroepen. Totale kosten $1,36, waarvan $0,77 de meting zelf. Alle
73 achtergrondtaken slaagden in één poging, zonder handmatig ingrijpen.

**Wat de doorloop bevestigde.** De onderwerpen kwamen na de crawl binnen als `concept`, zichtbaar als
gespreksvoorbereiding maar niet goed te keuren of te starten: beide routes weigerden met een 409 en
een uitleg, geen stille no-op. Het aantal was 7 bij dit merk en 5 bij een tweede, dus geen vast getal
meer. Het vastleggen van het gesprek verving die concepten meteen door zes definitieve onderwerpen die
herkenbaar voortbouwden op wat alleen in het gesprek stond, zoals onderhoud voor VvE's en het
herstellen van een warmtepomp die een ander slecht installeerde. De drie clustervelden kwamen
samengevoegd in `analyses.content_brief` terecht. `suggestPromptMix()` stelde 16/17/38 voor in plaats
van 10/10/10, de waarschuwing verscheen bij 90 vragen, en de grens van 100 was niet te doorbreken, ook
niet door de route rechtstreeks aan te roepen. De gewone startknop bleef de goedkope standaard
gebruiken. Geen twee aanbevelingen deelden dezelfde gemiste vraag. De afgevallen kansen stonden met
reden op het planscherm, en de voorraadduur ging van 1 maand bij tien pagina's per maand naar 3
maanden bij twee. De knop "Stel nieuwe clusters voor" stond niet op het klantscherm, de klantaanroep
kreeg 403, en een tweede ronde direct na de eerste weigerde te draaien met de reden erbij en kostte
niets. De briefing leverde zeven onmisbare vragen naast zes optionele, samen dertien, dus de grens van
acht snijdt inderdaad geen kernvraag meer weg.

**Wat de doorloop aan het licht bracht.** Tien punten, waarvan twee die een klant raken: een pagina
die nog in de briefingfase staat wordt in de werklijst aangeboden als "de tekst is klaar om te
publiceren" met een knop Publiceren, omdat `lib/work.ts` de status `briefing` niet kent. En een
plaatsnaam uit het gesprek belandt als hele zin in `service_regions`, het veld waaruit de meetvragen
hun plaatsnamen halen. De volledige lijst met bestand, regelnummer en waarneming staat in
`docs/tasks/bevindingen-live-test-31-augustus-2026.md`, samen met wat er van deze test op productie is
achtergebleven en opgeruimd moet worden.

⚠️ **Het testmerk hoort bij een echt bedrijf dat geen klant is.** De antwoorden op de klantvragen en het
strategisch gesprek zijn verzonnen om de keten te kunnen testen en staan als zodanig op productie. Ze
zijn geen feiten over dat bedrijf.

## 31 augustus 2026, de eerste vier bevindingen uit de live doorloop verwerkt

De doorloop hierboven leverde tien punten op. De eigenaar koos de vier die een echte klant in zijn
eerste week tegenkomt. Geen migratie nodig: alle vier zaten in code, niet in het datamodel.

**De werklijst kende de briefingfase niet.** `lib/work.ts` had een tak voor `draft` en een voor
gepubliceerd, en liet al het andere doorvallen naar "klaar of gearchiveerd". Sinds de briefingfase
(R5.1) begint een pagina bij `briefing`, en die viel in de verkeerde tak: de klant kreeg een pagina
zonder één woord tekst aangeboden als "de tekst is klaar om te publiceren", met een knop Publiceren,
precies in het scherm dat hoort te vertellen wat er zonder hem stilligt. De nieuwe tak wijst naar het
briefingscherm. De bijbehorende test leest de broncode en eist dat élke waarde uit `ContentStatus` een
eigen tak heeft, zodat de volgende status die erbij komt niet stilzwijgend hetzelfde pad neemt.

**Een hele zin werd een plaatsnaam.** In het gesprek stond bij een nieuw werkgebied "Uitbreiding
richting Oosterhout en Geertruidenberg." Die zin kwam als dertiende waarde in
`profiles.service_regions`, het veld waaruit de promptgeneratie de plaatsnamen voor lokale meetvragen
haalt en waarvan het AANTAL `suggestPromptMix()` aanstuurt. Eén zin daar kost dus onbruikbare
meetvragen én een duurdere meting. `regionsFromDescription()` accepteert nu alleen wat er als
plaatsnaam uitziet: hooguit vier woorden, elk met een hoofdletter behalve de dertien tussenvoegsels,
gesplitst op komma's. Bewust NIET op "en": dan zou "Gilze en Rijen" twee plaatsen worden die geen van
beide bestaan, erger dan niets (conventie 3).

**Het contentpakket was nergens te kiezen.** Het planscherm blokkeerde op "kies eerst 10, 20 of 40
pagina's per maand" terwijl er in de hele app geen scherm was dat `accounts.package_pages_per_month`
zette; de doorloop kwam alleen verder doordat de waarde met de hand in de database is gezet. Op verzoek
van de eigenaar staat het pakket nu als verplicht veld naast naam en webadres in de pre-boardingwizard,
zodat het er altijd al is op het moment dat de klant zijn contentplan opent, en daarna aan te passen op
het scherm Toewijzen. Alleen de beheerder ziet en mag het zetten: `PATCH /api/accounts/[id]` weigert de
waarde van een klant met een 403, dus de grens zit niet alleen in de weergave (conventie 1). Het
pakket blijft bewust buiten `EDITABLE_ACCOUNT_FIELDS`, een verkoopafspraak, geen instelling.

**Het rapport noemde 15 onderzochte vragen bij een meting van 30.** Drie zinnen verder stond "de
meting bestaat uit 30 antwoorden", dus de klant las twee getallen die elkaar tegenspreken. Het aantal
is te tellen, dus hoort er code onder te staan: de schrijfinstructie krijgt het nu expliciet mee (de
intentie) en `correctQuestionCount()` zet achteraf recht wat er alsnog uitkomt (de garantie). Het
vangnet is met opzet smal en raakt alleen zinsdelen die het TOTAAL beweren; "17 van de 30 vragen" is
een verhouding en blijft ongemoeid, een te gretige vervanging zou daar een onwaarheid van maken.

Vier controles groen: typecheck, 2606 unittests, 382 ketentests en de productiebuild. Daarna, want
gebouwd is niet geverifieerd (conventie 10), alle vier op productie nagelopen met de twee
testaccounts: de briefingkaart wijst nu naar de briefing in plaats van naar publiceren, de zin uit het
gesprek voegt niets meer toe aan het werkgebied terwijl "Made, Etten-Leur" er wel twee plaatsen bij
zet, het pakket is als beheerder te zetten en levert een klant een 403 op, en het herdraaide rapport
schrijft "Er zijn 30 vragen onderzocht, samen 46 keer gemeten".

Dat herdraaien leverde en passant het antwoord op een openstaande vraag: op exact dezelfde 30 metingen
kwamen er nu 8 aanbevelingen en 4 afgevallen kansen uit, tegen 7 en 6 bij de eerste ronde. Het aantal
aanbevelingen ligt dus niet vast, precies wat werkpakket B punt 1 beoogde. De zes overgebleven
bevindingen staan in `docs/tasks/bevindingen-live-test-31-augustus-2026.md`.

## 31 augustus 2026, punt 5 tot en met 9 uit de live doorloop verwerkt

De resterende vijf bevindingen uit `docs/tasks/opdracht-bevindingen-5-tot-9.md`, alle vijf in code en
test opgelost, zonder migratie.

**Het contentplan begon in het verleden bij elk plan dat op de 28e of later wordt opgesteld (punt 5).**
`spreadDates()` klemde de vroegste bruikbare dag terug naar dag 28 zodra `now.getDate() + 1` daarboven
uitkwam: op 31 augustus werd dat 32→28, drie dagen terug, dus alle zeven pagina's van maand 1 kregen
bij Wouter Warmtepomp een publicatiedatum die al voorbij was. De functie geeft nu een lege lijst,
`createPlan()` zet de voorzet dan in maand 2. Maand 1 blijft leeg met een eigen zin; de belofte "ORBIT
ENGINE begint tien dagen voor elke publicatiedatum" past zich aan (`schrijfBelofte()`). `createPlan()`
kreeg een los `now`-argument naast `startedOn` om dit deterministisch te testen, anders hangt "is maand
1 vol" af van de dag waarop de test toevallig draait.

**De uitleg bij een marktclaim bereikte de klant nooit als de vraag uit de synthese kwam (punt 6).**
`beoordeelClaim()` stond ná de vertakking op `isGapQuestion()`, die meteen terugkeerde; alle tien
onboardingvragen uit de doorloop droegen `raw_json.bron = "synthese-gap"`. Uitkomst toevallig veilig
(zo'n vraag promoveert nooit naar `proof_points`), de klant zag alleen niets. `answerFact()` in het
nieuwe `lib/facts.ts` trekt beide besluiten los uit de route, naar hetzelfde patroon als `createPlan()`.
De uitleg zelf is specifieker: `ontbrekendeOnderbouwing()` zegt of een cijfer, bron of voorbeeld
ontbreekt, in plaats van een algemene waarschuwing.

**De verhoudingszin was dubbel fout Nederlands zodra een kant precies 1 was (punt 7).** "1 van de 6
aanbevelingen zijn nieuwe pagina's" hoort "is" te zijn. `enkelOfMeervoud()` (`lib/format.ts`) vervangt
vier losse takken; getallen tot en met twaalf staan nu voluit ("Eén van de zes"), zoals
`schrijfstijl.md` voorschrijft.

**De vooruitblik bij "Stel nieuwe clusters voor" was niet afgeschermd voor een klant (punt 8).** De
`GET` controleerde alleen eigendom, niet de beheerdersrol: onschadelijk (kost niets, geen knop op het
klantscherm) maar regie-informatie. Dezelfde `mayTriggerCost`-controle staat nu op beide routehelften,
een unittest eist dat élke exportfunctie in het bestand die aanroept.

**Twee schrijffouten in klanttekst (punt 9).** "punt(en)" op het briefingscherm en dezelfde fout als
"gegeven(s)"/"bewering(en)" elders; `enkelOfMeervoud()` vervangt ze allemaal. En `euro()` toonde
dollarbedragen met een punt ("$1.70") naast een onzekerheidsmarge met komma ("±10,7 punten") in
dezelfde zin: verplaatst naar `formatUsd()` in `lib/format.ts` met Nederlandse schrijfwijze, gebruikt
op elke bedragplek. Logregels houden hun punt, die zijn niet voor de klant.

Vier controles groen: typecheck, 2689 unittests, 397 ketentests, build. Naar `main` en op productie
nagelopen (conventie 10): op Wouter Warmtepomp, opnieuw een contentplan op 31 augustus zelf (precies de
bugsituatie), ging maand 1 op `concept` met de nieuwe zin en kwamen de dertien beschikbare kansen in
maand 2 met data van 1-28 september, geen enkele in het verleden. Een openstaande vraag met een
superlatief beantwoord gaf "Noem er een cijfer bij, dan mag deze zin in je teksten." De `GET` gaf het
klantaccount een 403 en het beheerdersaccount "Geschatte kosten: ~$0,02"; "Verdeling aanpassen" toonde
"ongeveer $1,68 per maand" naast "±10,7 punten", nu allebei met een komma.

## 31 augustus 2026: Ronde A van de onboardingoptimalisatie, zes losse ingrepen zonder migratie

`documentatie/onboarding_optimalisatie.md` §18 zet de verbouwing van de onboardingsessie in vier
ronden; Ronde A is de eerste, met zes ingrepen die stuk voor stuk los terug te draaien zijn en geen
migratie nodig hebben. Alle zes zijn deze ronde gebouwd.

**A1. Het blok "Wat we al gevonden hebben" stond op een laptop van de CSM standaard helemaal open.**
`CollapsibleSection` staat op desktop standaard open, en de sessie gaf nooit `defaultOpen` mee. Alle
41 klantvelden stonden dus tegelijk uitgeklapt, en dat verklaarde waarom het scherm ongeveer tien
schermhoogtes lang was. Nu krijgt elke stap `defaultOpen={!p.compleet}` mee: een stap die al
compleet is opent dicht, een stap met nog een leeg veld opent open. Het scherm opent daardoor op
ongeveer een kwart van zijn vorige lengte plus precies het werk dat er nog ligt.

**A2. Negen velden (vijf schuiven, drie keuzemenu's, het ja-nee-veld) hadden geen werkend label voor
schermlezers.** `Standen` gebruikte `aria-labelledby={id}`, terwijl `id` het veld-id is en niet het
id van een bestaand element: het label zette alleen `htmlFor`, nooit een eigen `id`. Het label krijgt
nu ook `id={labelId(id)}` (`${id}-label`), en de drie aanroepen van `Standen` geven dat label-id mee
in plaats van het veld-id. Toetsenbordnavigatie werkte al; nu kondigt de knoppenrij ook de vraag aan
die hij beantwoordt.

**A3. Zes lijstvelden werden alleen door de invoercomponent getrimd, niet door de opslagroute
zelf.** `products`, `value_props`, `competitors`, `aliases`, `service_regions` en `proof_points`
stonden niet in `LIST_FIELDS` in `app/api/profiles/[id]/route.ts`, terwijl twaalf andere lijstvelden
er al in stonden. In de praktijk ging het goed omdat `TagListEditor` altijd nette waarden aanlevert,
maar dat is precies de garantie die conventie 1 in de route wil en niet alleen in de client: een
ander scherm of een aanroep buiten de app om kon een lege string in `aliases` zetten, waar de meting
letterlijk op vergelijkt. De zes velden staan er nu bij.

**A4. Een getypte waarde in een openstaand veld ging verloren bij het sluiten van het tabblad.**
Opslaan gebeurt bij `onBlur`, bewust, omdat een gesprek springt en onderbroken wordt. Maar wie het
tabblad sluit terwijl de cursor nog in een tekstvak staat, verliest wat er getypt is: er komt dan
geen blur meer. De sessie houdt nu per veld bij of het gewijzigd maar nog niet opgeslagen is, en
stuurt die velden alsnog weg bij `pagehide` en bij `visibilitychange` naar verborgen, met
`keepalive: true` zodat de aanvraag doorloopt nadat de pagina al is losgelaten.

**A5. Het contentpakket bij het aanmaken van een merk landde op het account van de consultant, niet
van de klant.** `POST /api/profiles` schreef het gekozen pakket naar `defaultAccountFor(user.id)`,
en dat is bij een consultant zijn eigen standaardaccount: het merk wordt pas bij Toewijzen aan het
klantaccount gekoppeld. Het pakketveld in de aanmaakwizard deed voor de klant dus niets, en
overschreef ondertussen wel het pakket op het account van de consultant zelf. Het veld is uit de
aanmaakwizard gehaald; het pakket wordt voortaan uitsluitend gezet op het toewijzingsscherm
(`PackageBox`, die daar al stond sinds de eerste live doorloop van 31 augustus), met een regel erbij
dat dit vóór het eerste contentplan moet gebeuren.

**A6. De opslagknop van "Wat er speelt buiten je website om" zei niet wat hij deed.** Opslaan van dit
blok zet meteen de definitieve onderwerpronde in gang: de conceptonderwerpen worden vervangen door
een definitieve lijst, nu met wat er in het gesprek is verteld. Dat stond nergens op het scherm. De
knop heet nu "Gesprek vastleggen en onderwerpen definitief maken", met een regel eronder die zegt wat
er gebeurt.

Elke ingreep kreeg een broncodecontrole in `scripts/test-unit.ts` (groep "Ronde A: losse ingrepen aan
de onboardingsessie"), naar hetzelfde patroon als de bestaande controle die verboden taaknamen en
bedragen op dit scherm opspoort: dit scherm heeft geen pure rekenkern, dus de garantie zit in de
broncode zelf nalezen. Vier controles groen: typecheck, 2713 unittests (24 nieuwe, twee ervan na een
eerste poging aangescherpt omdat de regex de code niet raakte), 397 ketentests, en de productiebuild.

Verificatie op productie (§18.1, onder A): het scherm openen op een testmerk toont nu de
openstaande stappen uitgeklapt en de complete stappen dicht, in plaats van 41 velden in één keer. Een
veld getypt, tabblad gesloten en teruggekomen: de waarde staat er.

**31 augustus 2026, onboarding ronde B (deel één, stap B1 tot en met B4).** De schermverbouwing van
`documentatie/onboarding_optimalisatie.md` §18, uitgevoerd op `feature/onboarding-ronde-b` vanaf
`main`. Vier stappen, in de volgorde van §18.0 (pure module vóór scherm), zonder migratie: alle
kolommen bestonden al.

**B1. `brand_name` is nu bewerkbaar.** De naam waarop de vermeldingsclassificatie telt of een
AI-antwoord over dit merk gaat, werd tot deze ronde uitsluitend door het AI-onderzoek gezet
(`discover.ts`) en stond nergens in een formulier. Een verkeerd afgeleide naam bleef daardoor elke
volgende meetronde meelopen, terwijl ongeveer twintig modules hem lezen. Toegevoegd aan
`EDITABLE_PROFILE_FIELDS` en aan `BRAND_FIELDS` (stap "bedrijf", direct na `name`, `derivable: true`),
zodat hij automatisch meeloopt in zowel de onboardingsessie als de klantwizard, en `field-merge.ts`
hem met rust laat zodra een mens hem heeft gezet. De catalogus telt sindsdien 57 velden in plaats van
56, en de klantwizard 42 in plaats van 41.

**B2. Elk veld toont nu waar het antwoord landt.** Nieuw verplicht veld `usage` op `BrandField`
(`lib/pipeline/brand-fields.ts`), gevuld voor alle 57 velden met de tekst uit hoofdstuk 6 van het
plan, gerenderd onder het invoerveld door `BrandFieldInput` in kleine grijze letters. Werkt
automatisch door in de klantwizard, wat gewenst is: dezelfde vraag ("waarom willen jullie dit
weten?") speelt daar net zo goed. Een unittest eist dat élk veld een `usage`-tekst van minstens tien
tekens heeft, zodat een nieuw veld niet zonder uitleg kan landen.

**B3. Verplicht, aanbevolen en optioneel bestaan nu.** Nieuw veld `priority` op `BrandField`, gezet
volgens de statuskolom van hoofdstuk 6: twaalf velden verplicht (waaronder `brand_name`, `aliases`,
`competitors`, `products`, `proof_points`), de rest aanbevolen of optioneel. Nieuwe pure functie
`missingRequired(profile, notApplicable)` telt welke verplichte velden nog leeg zijn, met één
uitzondering die in de functie zit en niet in de catalogus: `service_regions` staat op "aanbevolen",
maar wordt pas verplicht zodra `service_scope` op "lokaal" staat (hoofdstuk 14.2). Het afrondblok van
de sessie noemt de openstaande verplichte velden met springlinks naar het veld. Geen validatie
tijdens het typen: de klant kijkt mee.

**B4. Het scherm volgt nu de gespreksvolgorde, niet de catalogusvolgorde.** Nieuwe export
`SESSION_BLOCKS` groepeert de 57 velden opnieuw in de negen blokken van hoofdstuk 3: openstaande
punten, je bedrijf en je namen, je aanbod, je markt, je bewijs, je klant en je toon, documenten en
teksten met de veranderingen die eraan komen, techniek en koppelingen, en afspraken en afronden. Dit
is bewust géén nieuwe `BrandStep`-waarde: de klantwizard blijft de catalogusvolgorde
(`CLIENT_STEPS`/`STEP_ORDER`) gebruiken, en `SESSION_BLOCKS` hergroepeert alleen hoe de sessie ze
toont. De zeven auteursvelden staan voortaan in een eigen, ingeklapt blok "Auteur, voor later" binnen
"Afspraken en afronden" (`SESSION_AUTHOR_FIELDS`), met één gezamenlijke uitleg in plaats van zeven
losse kaarten in de hoofdstroom. De teksten volgen hoofdstuk 7: "Openstaande punten" in plaats van
"Wat we nog niet weten", de springlink heet "Ga naar dit veld" in plaats van "Invullen" (die knop
sloeg nooit iets op), en het scherm en het menu-item heten voortaan "Onboardinggesprek" in plaats van
kaal "Onboarding". De A1-fix (een compleet blok opent ingeklapt) is meeverhuisd van per catalogusstap
naar per gespreksblok, zodat het scherm ook in de nieuwe indeling kort blijft.

Een aanname uit het plan bleek niet te kloppen bij het natellen: hoofdstuk 11 noemt "17 velden,
waarvan 1 nieuw" voor blok 6 ("Je klant en je toon"), maar de rijentelling in hoofdstuk 6 komt uit op
16 (15 bestaande plus `style_samples`, dat in deel twee van deze ronde volgt). De rijentelling in
hoofdstuk 6 is de brontabel; de samenvatting in hoofdstuk 11 was niet bijgewerkt na een latere
wijziging aan die tabel.

Vier controles groen: typecheck, 2734 unittests (21 nieuwe), 397 ketentests, de productiebuild.
Ronde B deel twee (B5 tot en met B9: de voorbereidingskaart, de open vragen erbij, de vier
onderwerp-triggerende velden markeren, de resterende vijf nieuwe velden, en de vormgeving) volgt in
een volgende sessie op dezelfde branch, en wordt pas gezamenlijk als één pull request opgeleverd
(§15.2: een half verbouwd scherm in productie is erger dan niet verbouwd).

**31 augustus 2026, onboarding ronde B (deel twee, stap B5 tot en met B9).** Zelfde branch,
`documentatie/onboarding_optimalisatie.md` §18, vervolg op deel één. Vijf stappen, geen migratie: de
kolommen die B5 tot en met B9 nodig hebben bestonden allemaal al.

**B5. Blok 0, de voorbereiding, via de bestaande readiness-module.** `computeReadiness()` (destijds
`assessReadiness()`) en `ProfileReadinessPanel` stonden al sinds 17 augustus 2026 klaar in de
codebase, met nul aanroepers: het paneel werd door geen enkel scherm gerenderd. Blok 0 van de
onboardingsessie roept hem nu aan. Twee rijen toegevoegd aan `ReadinessInput`/`assessReadiness()`
voor de vijfde en zesde startvoorwaarde uit hoofdstuk 14.1 ("pakket op het account", "merk
toegewezen"), beide `nodig: false`: het product is sales-led, dus tijdens dit gesprek is een merk
meestal nog niet toegewezen en staat er nog geen pakket, en dat mag "compleet" niet blokkeren. De
status-route (`/api/profiles/[id]/status`) haalt daarvoor het pakket van het account erbij.

**B6. Blok 1 toont nu ook de feitenvragen, niet meer alleen de open punten.** De sessiepagina
gebruikt `loadOpenQuestions()`, dezelfde loader als `/strategie/vragen`, en rendert `FactRequests`
eronder: dezelfde vragen, met dezelfde antwoord- en overslaanknoppen, zonder tweede telling. De
knop "Ga naar dit veld" voor de profielgaten blijft client-side reactief op `findGaps()`, dat kan niet
uit de server-loader komen zonder de live-typende consultant een paar seconden achter te laten lopen.

**B7. De vier velden die een nieuwe onderwerpronde veroorzaken dragen nu een chip.** Geen nieuwe
lijst: `BrandFieldInput` krijgt een `triggersTopics`-vlag die rechtstreeks uit `FIELD_TASKS`
(`onboarding-refresh.ts`) wordt afgeleid, dus een latere wijziging aan die vertaaltabel verandert de
markering automatisch mee. De waarschuwing "beslis onderwerpen pas ná het gesprek" bleek al te
bestaan op het clusterscherm: elk conceptonderwerp toont daar al "Zodra het gesprek is vastgelegd,
maakt ORBIT ENGINE de definitieve onderwerpen die je kunt starten" (`profile_topics.stage`,
migratie 0074). Geen tweede waarschuwing op een tweede scherm.

**B8. De vijf resterende velden.** `style_samples` (stap "stem"), `max_inventory_pages` en
`crawl_priority_paths` (stap "bedrijf", nieuw `FieldKind: "getal"` voor het eerste) toegevoegd aan
`BRAND_FIELDS` en `EDITABLE_PROFILE_FIELDS`; de laatste twee stonden al vast in de PATCH-route
(validatie en klemming) maar niet in de catalogus, dus geen dubbele afhandeling. De catalogus telt
sindsdien 60 velden, de klantwizard 45. `url` is bewust géén catalogusveld: alleen tonen met een
aparte actie "Website wijzigen", die waarschuwt dat de crawl en de inventaris opnieuw moeten. Search
Console staat als statusregel met een link naar `/instellingen/koppelingen`, geen invoerveld.

**B9. Vormgeving.** Tweekolomsindeling op groot scherm (rechts een blijvende kolom met de meter en
de openstaande punten), voortgang per blok in de zijrail ("6 van de 9"), één vaste regel bovenaan in
plaats van een chip per veld bij elke opslag (de chip blijft alleen staan bij een mislukte opslag),
het scherm ververst zichzelf na een geslaagde bijwerkronde, en een knop "Samenvatting van dit
gesprek" die de verplichte velden en de gespreksnotitie samenvat om terug te sturen.

**Verificatie op productie (§18.1, onder B).** Doorgerekend tegen de echte, opgeslagen data van
"Van Loon Klimaattechniek" (uitdrukkelijk een testmerk, dat staat letterlijk in het eigen
merkdossier): de readiness-module meldt op basis van de negen echte tellingen (9 pagina's, 38
aanbodonderdelen, 5 onderwerpen, 11 kennistestrijen, 16 technische controles) terecht "compleet",
met de twee nieuwe rijen als open punt in plaats van blokkade, en de kop noemt de drie resterende
punten als agenda voor het gesprek. `missingRequired()`, `FIELD_TASKS` en `planRefresh()` gaven op
ditzelfde profiel de verwachte uitkomst. Een volledige klik-doorloop in de browser is niet gedaan:
deze sessie had geen lokale Supabase-inloggegevens beschikbaar. De vier controles (typecheck,
2734 unittests, 397 ketentests, productiebuild) zijn wel alle vier groen.

Ronde B is hiermee als geheel af.

**31 augustus 2026, onboarding ronde C: de aanbodboom bewerkbaar.** Nieuwe branch
`feature/onboarding-ronde-c` vanaf `main`, `documentatie/onboarding_optimalisatie.md` §16 en §18
(stap C1 tot en met C6). Dit was het enige gat dat geen enkel profielveld kon dichten (§15.1): een
dienst die niet op de site staat, of alleen telefonisch verkocht wordt, kwam nooit in het contentplan
terecht, want `OfferingsPanel` was een leesscherm zonder route.

**C1. Migratie 0079**, toegepast via `apply_migration`: vier kolommen op `profile_offerings` (`note`,
`removed_at`, `removed_by`, `updated_by`) plus een partiële index op `profile_id where removed_at is
null`. Verwijderen is uitzetten, niet wissen (conventie 8): een gewiste rij zou bij de volgende crawl
gewoon terugkomen, want de pagina staat er nog.

**C2. `lib/offerings.ts`**, de ene plek die het filter kent (`activeOfferings()`,
`activeOfferingCount()`, `removedOfferings()`). Zes lezers gingen erdoorheen:
`propose-topics.ts`, `propose-more-topics.ts`, `llm-baseline.ts`, `reputation-start.ts` (voedt
`selectNodes()`), het merkdossier, en de idempotentiecontrole in `offering.ts` zelf (die telt bewust
niet via de helper, maar rechtstreeks op `source = 'ai'`, zie C4). Een broncodecontrole in
`scripts/test-unit.ts` bewaakt dat geen van die zes bestanden `profile_offerings` nog rechtstreeks
selecteert. De validatie (naam, soort, de lus-controle op `parentId`, de `sort_order`-berekening)
staat puur in `lib/offerings-validate.ts`, zonder `server-only`, dus getest zonder database.

**C3. De route** `app/api/profiles/[id]/offerings` (POST, PATCH, DELETE), service-role client met
`getOwnedProfile()` en `resolveWriteSource()`, precies zoals de profielroute: `gesprek` bij een
consultant, `klant` bij de eigenaar. Verwijderen zet de knoop en al zijn onderliggende knopen op
`removed_at`, en het antwoord zegt hoeveel dat er waren. `DELETE` met `restore: true` zet een knoop
terug. Het scherm: `OfferingsEditor` (`_components/offerings-editor.tsx`), een client-kind van de tot
dan alleen-lezende `OfferingsPanel`. Potlood per knoop, "Dienst of product toevoegen" onderaan, en
verwijderde knopen achter "X verwijderd, tonen" met een terugzetknop.

**C4. Hercrawlbescherming, en één bevinding die al bleek te kloppen.** Het plan verwachtte dat
`app/api/profiles/[id]/deep-research/route.ts` de hele boom weggooide; bij het nalopen bleek die
route al `.eq("source", "ai")` te gebruiken (opgelost in een eerdere ronde, "Vier ingrepen uit de
structuurreview van het klantoppervlak"). Dat deel van §16.5 was dus al opgelost en is ongewijzigd
gelaten. Wat nog wél stuk was: de idempotentiecontrole in `offering.ts` telde ALLE knopen, dus zodra
een consultant met de hand één dienst toevoegde, dacht de aanbodstap dat de boom al klaar was en
draaide hij nooit meer, ook niet als een latere crawl veel meer vond. Die telling gaat nu ook via
`source = 'ai'`.

**C5. `buildSnapshot()` in `propose-more-topics.ts` telt nu ook de actieve aanbodknopen.**
`TopicRoundSnapshot` kreeg er een vijfde teller bij, `actieveAanbodknopen`, en `topic-round-diff.ts`
meldt "N nieuwe aanbodknopen" zodra die stijgt. Zonder deze teller kreeg de consultant na het
toevoegen van drie diensten de melding "er is niets veranderd" op de knop "meer onderwerpen": de
vergelijking keek naar het gesprek, de klantvragen en de metingen, maar niet naar de boom die de
onderwerpen zelf voedt.

**Verificatie op productie (§18.1, onder C), op Fysi-Unique.** Een dienst toegevoegd die niet op de
site staat ("Sportmassage voor topsporters, telefonisch geboekt", herkomst `gesprek`, met een
notitie), plus een tweede, AI-gemarkeerde testknoop. Daarna de exacte query van de deep-research-route
gedraaid (`delete ... where source = 'ai'`): de AI-knoop verdween, de handmatige knoop bleef staan met
zijn notitie intact en `removed_at` op `null`, dus actief voor `activeOfferings()` en meetellend voor
`activeOfferingCount()`. De testrijen zijn na de verificatie weer verwijderd.

Vier controles groen: typecheck, 2766 unittests (34 nieuwe), 410 ketentests (13 nieuwe), de
productiebuild.

Ronde C is hiermee af. Van de tien aanvullingen uit hoofdstuk 15 resteert alleen Ronde D
(crawlbeheer, hoofdstuk 17): zelf het aantal pagina's per ronde kiezen, aanvullen zonder alles weg te
gooien, en drie crawltempo's.

**31 augustus 2026, onboarding ronde D: crawlbeheer.** Nieuwe branch `feature/onboarding-ronde-d`
vanaf `main`, `documentatie/onboarding_optimalisatie.md` §17 en §18 (stap D1 tot en met D6). Laatste
van de tien aanvullingen uit hoofdstuk 15.

**D1. Migratie 0080**, toegepast via `apply_migration`: vijf kolommen op `profiles` (`crawl_speed`,
`crawl_as_browser`, `crawl_last_run_at`, `crawl_last_mode`, `crawl_last_blocked_at`), met een
constraint op de drie standen en op de twee modi.

**D2. `lib/crawl-speed.ts`**, puur en getest: `speedProfile()` (batchgrootte en pauzebandbreedte per
stand), `nextDelayMs()` (met een injecteerbare toevalsgenerator, dus reproduceerbaar), `slowerThan()`
voor de terugval bij een 429/503.

**D3. `lib/crawler.ts`.** `crawlInventory()` kreeg er `speed`, `exclude` en `asBrowser` bij, en
respecteert nu `Retry-After` bij een 429/503 (met een stand omlaag voor de rest van de ronde) en stopt
bij een 403 in plaats van door te gaan met lege pagina's. Eén gedeelde `requestHeaders()`, met een
volledige, kloppende set (`Accept-Language`, `Accept-Encoding`) zodat de crawler zich als een nette
bezoeker gedraagt. `selectUrls()` (`url-priority.ts`) kreeg er een `exclude`-parameter bij die vóór
het kiezen filtert, niet erna: anders levert "meer" bij een site waarvan de topplekken al gecrawld
zijn een lege aanvulling op, ook met honderden ongelezen pagina's.

**D4. Jobtype `crawl_inventory`**, met een dedupe-sleutel per profiel. `POST
/api/profiles/[id]/refresh-inventory` plant voortaan alleen de taak in en geeft meteen antwoord, in
plaats van zelf te crawlen: op "langzaam" duurt 150 pagina's ruim tien minuten, en de route mocht
maar 60 seconden. De taak geeft zichzelf een vast, behoudend tijdbudget (180 seconden) binnen het
tijdbudget dat de werker al reserveert voor een zware taak, zodat een grote crawl zichzelf op tijd
afbreekt in plaats van de platformlimiet van 300 seconden te raken; wat er dan al gevonden is blijft
staan, en de consultant kan de knop gewoon nog een keer gebruiken.

**D5. `refresh-inventory.ts`: twee modi.** "Opnieuw" vervangt de gecrawlde pagina's zoals voorheen.
"Meer" is nieuw: `appendCrawledPages()` (`discover.ts`) voegt alleen toe wat nog niet bekend is.
Handmatig toegevoegde pagina's overleven allebei. **Eén bevinding tijdens het bouwen die het plan zelf
niet noemde:** een 403 vóór de eerste pagina levert nul bruikbare pagina's op, en zonder ingreep zou
"opnieuw" de bestaande, goede inventaris dan gewoon vervangen door niets. Bij nul nieuwe pagina's
raakt de route de tabel nu niet aan; de ketentest hieronder bewaakt dat met een eigen scenario.

**D6. Het scherm.** `InventoryBox` (op `/merk/[id]/merkprofiel/bewerken`, waar het crawlblok al
stond) kreeg de tempokeuze, twee knoppen ("Meer pagina's lezen", "Opnieuw crawlen" met bevestiging),
de laatste-ronde-regel en de blokkademelding. Geen voortgangsbalk: de knop laat los zodra de taak in
de wachtrij staat, met "Ingepland, ververs zo dadelijk" in plaats van een live meelopende crawl, want
dat zou een tweede voortgangsmechanisme naast de bestaande onboardingstatus zijn geweest.

**Verificatie op productie (§18.1, onder D).** Zonder lokale inloggegevens kon deze sessie geen
achtergrondtaak via de draaiende app zelf inplannen (zelfde beperking als bij Ronde B). In plaats
daarvan: de sitemap van hema.nl rechtstreeks opgehaald (met de eigen bot-identiteit) om de
startvoorwaarde van punt D uit hoofdstuk 18.1 te bevestigen, een site van ruim duizend pagina's
(zes deelsitemaps met productcategorieën). Het daadwerkelijke "meer op langzaam tempo"-gedrag is
doorgerekend in de ketentest tegen een gesimuleerde grote site: drie rondes na elkaar
("opnieuw", "meer", "opnieuw") op dezelfde acht kandidaat-URL's, met een expliciete controle dat
"meer" nooit een al bekende URL dubbel ophaalt en dat een 403 de bestaande, net opgeslagen pagina's
niet wist.

Vier controles groen: typecheck, 2783 unittests (17 nieuwe), 429 ketentests (19 nieuwe), de
productiebuild.

Ronde D is hiermee af. Alle tien aanvullingen uit hoofdstuk 15 zijn nu gebouwd.

## 31 augustus 2026: de Sales-module samengevoegd met de hoofdlijn

De zeven sprints van de GEO Prospect Engine stonden op een eigen werklijn terwijl de hoofdlijn
39 commits verder liep: vier onboardingrondes, de eerste live doorloop met zijn negen bevindingen,
en een flinke opschoning van de documentatie. Die twee zijn nu samengevoegd. Tien bestanden botsten,
en op vier daarvan viel iets te kiezen.

**De migratie botste opnieuw, en dit keer andersom.** De hoofdlijn had `0068` tot en met `0073` netjes
vrijgehouden voor deze module, maar ondertussen `0074` gebruikt voor de concept-definitieve
onderwerpen. Mijn `0074_sales_publiceren` heet daarom nu `0081`, en de naam in de migratiehistorie op
productie is meeveranderd. De inhoud is geen letter anders: de tabellen stonden er al.

**De ingekorte CLAUDE.md wint van de lange.** De hoofdlijn bracht dat bestand van 292 naar 99 regels,
met als redenering dat een mapstructuur sneller met grep te vinden is dan uit een boomweergave te
lezen. Die keuze is overgenomen, inclusief het verlies van mijn eigen toevoegingen daarin. Wat er wél
bij is gekomen is één alinea: dat de Sales-module bestaat, waar hij begint, en de twee regels die
overal in die module terugkomen. Zonder die alinea is de enige interne module van de app nergens
genoemd, en dan is dit bestand geen wegwijzer meer.

**Het logboek is chronologisch hersteld.** Beide kanten hadden onderaan geschreven, en een naïeve
samenvoeging zette 24 augustus achter 31 augustus. De stukken staan nu weer op datum.

**Eén naam botste in de code.** Zowel de marktmeting als de onderwerpronde noemt zijn
budgetbeoordeling `beoordeelRonde`. In de test heet die van de marktmeting nu `beoordeelMeetronde`;
in de modules zelf blijft de naam staan, want daar staat hij naast `beoordeelBudget` en is hij
eenduidig.

Vier controles groen na de samenvoeging: typecheck, 3309 unittests, 549 ketentests en de
productiebuild. Dat zijn 288 unittests en 71 ketentests meer dan mijn eigen tak had: al het werk van
de hoofdlijn draait dus mee.

## 1 september 2026: het merkdossier gesplitst, "0-meting" en "Aanbodboom" naar Admin

Het hoofdstuk Merkprofiel had twee bestemmingen: het leesscherm "Merkdossier" (`/merkprofiel`, wat
ORBIT ENGINE over het merk te weten kwam, met het aanbod erin) en "Bewerken" (`/merkprofiel/bewerken`,
de 42 velden die de klant zelf nakijkt). In de praktijk bladert een klant nooit zelfstandig door het
leesscherm: het is de nulmeting die de consultant gebruikt om het profiel vóór het demogesprek klaar
te zetten (sales-led, §15). Dat maakte het geen klantscherm maar stafgereedschap dat toevallig onder
een klanthoofdstuk stond.

Het leesscherm is daarom opgesplitst in twee stafbestemmingen onder Admin, tussen Onboardinggesprek en
Diagnose (de volgorde van de sessie zelf: eerst het gesprek, dan wat eruit is opgehaald, dan de
techniek erachter): **"0-meting"** (`/admin/0-meting`, de kop, het dossier, wat AI-assistenten weten en
de concurrenten) en **"Aanbodboom"** (`/admin/aanbodboom`, het aanbodblok, dat al sinds Ronde C
bewerkbaar is). "Bewerken" is omgedoopt tot **"Merkdossier"** en is nu de enige bestemming die
Merkprofiel nog heeft: het enige scherm waar de klant zelf nog iets aan zijn profiel doet.

`GRENS_PER_HOOFDSTUK.Admin` gaat van vijf naar zeven, met dezelfde onderbouwing als de eerdere
uitzonderingen: het is geen vergaarbak maar vijf bestemmingen over dít merk plus twee uitgangen naar de
app als geheel. Alle links die naar het oude leesscherm wezen zijn meeverhuisd: de knop na het
aanmaken van een nieuw merk (die ook het onderzoek in gang zet via `ProfileProgress`), de CSM-lijst,
de readiness-rijen in `profile-readiness.ts`, en de "terug"-knoppen in de wizard zelf (die nu naar het
merkoverzicht wijzen, niet naar een dossier dat voor een klant niet meer bestaat). Het oude adres
`/merk/:id/merkprofiel` en de bijbehorende `/profielen/:id`-doorverwijzingen wijzen permanent door naar
hun nieuwe plek (`lib/redirects.ts`).

Vier controles groen: typecheck, 3311 unittests, 549 ketentests, de productiebuild.

## 1 september 2026: het openstaande-puntenblok uit het onboardinggesprek, de contextkolom weg

Het onboardingscherm (`/admin/onboarding`) had een eigen blok "Openstaande punten en vragen" bovenaan,
met dezelfde profielgaten en feitenvragen als `/strategie/vragen`. Dat was letterlijk hetzelfde
antwoord op twee plekken: beide lazen `loadOpenQuestions()`, en de vragenpagina bestaat al sinds 28
augustus precies om die splitsing tegen te gaan (zie de toelichting bovenaan
`app/(app)/merk/[id]/strategie/vragen/page.tsx`). Het blok is uit het onboardinggesprek verwijderd; de
consultant vindt de openstaande punten voortaan op één plek. De rail-ingang, de rechterkolom met de
"nog open"-kaart die naar het blok linkte, en het ophalen van `factRequests`/`factGroepen` in
`admin/onboarding/page.tsx` zijn meeverwijderd, want die dienden alleen dit blok.

Diezelfde rechterkolom (`<aside>` met de volledigheidsmeter en de link naar de open punten) is
helemaal weg: de meter staat al onderaan bij "Afspraken en afronden", en zonder de linkkaart had de
kolom geen functie meer die niet al ergens anders op het scherm stond. Het middenblok met het gesprek
zelf vult nu de volle breedte.

Vier controles groen: typecheck, 3310 unittests, 549 ketentests, de productiebuild.

## 1 september 2026: gerichte fact-finding per contentitem in plaats van clusterbreed (S9)

Aanleiding: een pagina over "kwaliteit op basis van certificeringen" moet uitleggen wat zo'n
certificering inhoudt, en dat staat niet op de website van de klant, dus ook niet op de feitenkaart.
De schrijfaanroep mocht dat soort algemene, niet-bedrijfsspecifieke uitleg al zonder F-nummer
schrijven (R5.3, "algemene uitleg over het onderwerp"), en had zelfs al een haakje om er actief op te
zoeken (`FACT_FINDING_ADDENDUM`, optimalisatie.md 4.6). Alleen ging dat haakje aan bij `proofCount < 3`,
een eigenschap van de HELE klant, niet van de pagina die geschreven wordt. Een klant met tien feiten
(vijf certificeringen erbij) kreeg dus nooit die zoekopdracht, ook al miste precies dít artikel de
uitleg die het sterk zou maken.

Tweede probleem, ontdekt in hetzelfde gesprek: de aanbevelingen in één analyse (= één cluster) lopen
soms sterk uiteen van onderwerp. Zou de oplossing bij `topic_research` komen te hangen (die draait één
keer per analyse), dan zou diezelfde clusterbrede achtergrond voor de helft van de pagina's ruis zijn
in plaats van versterking, exact het manco dat dit stuk werk moest oplossen.

Oplossing, op het niveau waar de pijplijn al wél per pagina rekent (de claim-audit, die het paginaplan
per `content_piece_id` bevriest in `briefing_snapshot_json`, S2): de audit levert nu naast de
BEWERINGEN over het bedrijf ook `generalContextGaps` (`lib/schemas/claim-audit.ts`), termen die uitleg
nodig hebben zonder dat het een bedrijfsclaim is, per doelvraag toegewezen met dezelfde koppeling als
`neededFor`. `buildFactFindingAddendum()` (`lib/pipeline/factcard.ts`, puur en getest) zet die gaten om
in een gerichte zoekopdracht voor de schrijfaanroep: "zoek uit wat ISO 9001 inhoudt", niet "zoek iets
algemeens over dit onderwerp". `needsFactFinding` in `content.ts` gaat nu aan bij twee onafhankelijke
redenen: een dunne feitenlijst (ongewijzigd, de generieke vuistregel blijft de terugvalroute) OF
concrete gaten voor DEZE pagina. De muur die verzinsels over het bedrijf tegenhoudt (R5.3) verandert
niet: alleen wát er gezocht mag worden, en voor wie, wordt scherper.

Zes nieuwe unittests op `buildFactFindingAddendum()` in `scripts/test-unit.ts`. Vier controles groen:
typecheck, 3316 unittests, 549 ketentests, de productiebuild. Nog niet geverifieerd tegen een echte
klant met een cluster van uiteenlopende aanbevelingen (conventie 10); dat is de eerstvolgende
praktijktoets.

## 1 september 2026: nog drie clusterbrede plekken in de schrijfpijplijn itemspecifiek gemaakt (S10)

Vervolg op S9: een doorlichting van de hele schrijftheorie (feitenverzameling, briefing, schrijfprompt,
kwaliteitspoort) op hetzelfde patroon, clusterbrede input die een itemspecifieke pagina stuurt. Drie
vondsten, plus één eerlijke correctie op S9 zelf.

**De concurrentielat was clusterbreed, en stuurde de tekst het hardst verkeerd van de vier.**
`content.ts` haalde de acht meest genoemde concurrent-eigenschappen van de HELE analyse op en zette ze
letterlijk als opdracht in de prompt: "dit is de lat, jouw pagina moet hierop minstens zo concreet
zijn." Bij een cluster met uiteenlopende aanbevelingen kreeg een pagina over certificeringen zo
bijvoorbeeld "levertijd 24 uur" als lat. Nu worden de kandidaten (ruimer opgehaald, 20 in plaats van 8)
herrangschikt op woordoverlap met de doelvragen van DEZE aanbeveling (`scoreTermOverlap()`, nieuw en
puur in `page-relevance.ts`, dezelfde aanpak als de sitepagina-selectie van S1), niet meer op algemene
populariteit. Geen doelvragen: onveranderd gedrag, de oorspronkelijke volgorde blijft staan.

**Twee plekken lieten clusterbrede achtergrond ongelabeld de schrijfprompt in gaan**, alsof het over de
specifieke pagina ging: `analysis.topic` en `topicResearch.content_summary` in `content.ts`, en het
"onderwerp"-veld van de sitetekst-atomisering in `fact-atomise.ts` (die draait één keer per
briefingronde, over alle gekozen pagina's samen). Beide zijn nu expliciet gelabeld als clusterbrede
context, met de doelvragen van de pagina zelf als leidend erboven.

**Eerlijke correctie op S9 zelf.** De terugvalroute van `paginaVanClaim()` in `briefing.ts` (geen match
op een doelvraag → hoort bij alle pagina's van de batch) is voor gewone claims prima: een gemiste match
wordt een VRAAG aan de klant, en die aan de verkeerde pagina('s) koppelen kost hooguit een dubbele
vraag. Voor de nieuwe `generalContextGaps` (S9) is diezelfde terugval fout: een context-gat wordt
rechtstreeks een zoekopdracht aan de schrijver, en zonder match zou dat een pagina over levertijd de
opdracht geven een certificering uit te leggen die bij een heel andere aanbeveling hoort, exact het lek
dat S9 moest dichten. Context-gaten krijgen nu een eigen, strikte koppeling (`paginaVanGat()`): geen
match betekent geen pagina's, het gat vervalt in plaats van te verspreiden.

Drie nieuwe unittests op `scoreTermOverlap()`. Vier controles groen: typecheck, 3319 unittests, 549
ketentests, de productiebuild.
## 1 september 2026: de vier blokkerende fouten uit de eerste echte marktmeting

De Sales-module is voor het eerst live op één echte markt gedraaid: Warmtepomp Eindhoven, 43
bedrijven, 40 vragen aan ChatGPT, kosten $0,60 voor de hele markt. Dat is 6% van het plafond van tien
euro. De bevindingen staan in `docs/tasks/bevindingen-live-test-sales-1-september-2026.md`; hieronder
staat wat er daarna gerepareerd is en waarom.

**1. Twee verwijzingen naar dezelfde tabel, en een uitvraag die niet zei welke.**
`sales_opportunities` wijst naar `sales_companies` via `company_id` én via `rival_company_id`.
PostgREST weigert zo'n geneste select met PGRST201. Gevolg op productie: het Opportunities-scherm
toonde "Nog geen kansen gevonden" terwijl er 43 kansen stonden, de knop "Kans oppakken" gaf 404 met
"Deze kans bestaat niet", en alle 16 taken die de haak moesten schrijven mislukten definitief. Op alle
drie de plekken werd alleen `data` uitgelezen en niet `error`, dus een storing werd gerapporteerd als
"bestaat niet". De verwijzing staat nu bij naam in `lib/sales/relaties.ts`, de fout wordt overal
uitgelezen, en het scherm zegt "de kansen konden niet geladen worden" in plaats van te doen alsof de
lijst leeg is.

**Waarom geen enkele test dit ving:** `scripts/chain/supabase-shim.ts` zocht de foreign key op met
`limit 1` en pakte stilletjes de eerste van de twee. De shim was dus makkelijker dan het echte ding,
en keurde code goed die productie weigert. Hij is nu net zo streng: twee verwijzingen zonder
constraintnaam is een fout, met dezelfde tekst die PostgREST geeft. Teruggezet in de oude vorm valt de
ketentest nu om op precies de melding die op productie stond.

**2. De meting mat Nederland en niet Eindhoven.** Van de 40 vragen noemden er 3 de plaats, want de
prompt zei "de plaats mag erin, niet in elke vraag" en het model volgde dat netjes. Op "Welke
installateur kan bij mij in de buurt een warmtepomp goed installeren?" antwoordt een AI-assistent
letterlijk dat hij eerst een postcode nodig heeft. Uitkomst: 2 van de 40 antwoorden noemden een
bedrijf uit de markt, 42 van de 43 bedrijven kwamen op nul, en alle 43 kansen werden type
"Onzichtbaar" met dezelfde zin eronder. Zeven bedrijven stonden bovenaan met exact score 76.
`plaatsInKoopvragen()` garandeert nu dat elke vraag in de fases Selecteren en Contact opnemen de
plaats noemt, met "bij mij in de buurt" vervangen door de plaatsnaam in plaats van eraan geplakt. De
prompt vraagt hetzelfde, maar de code garandeert het: conventie 1.

**3. De optelling stopte na duizend rijen.** 43 bedrijven maal 40 antwoorden is 1720 vermeldingen, en
een `select` zonder bereik geeft er duizend. De vermelding van DBS Installatietechniek stond op rij
1652: het fragment was opgeslagen, en op het scherm, in de kans en in het rapport stond dat bedrijf op
"0 van de 40". Dat is het ergste soort fout in dit product: geen storing, gewoon een cijfer dat te
laag is, waarmee een verkoper een ondernemer iets vertelt dat ons eigen systeem tegenspreekt.
`lib/supabase/pagineer.ts` haalt nu alle rijen op, in `sales-aggregate.ts` en in `sales-detect.ts`.
Het patroon stond al in `lib/spend-limit.ts`, waar dezelfde grens de kostenrem liet lekken.

**4. De publicatiedrempel telde bedrijven en geen zichtbaarheid.** De grens van vijf ging over
herkenbaarheid bij verwijdering, niet over de vraag of de meting iets gevonden heeft. Deze markt, met
43 bedrijven waarvan er één één keer genoemd werd, was publiceerbaar. Er komt nu een tweede grens bij:
minstens 3 genoemde bedrijven én minstens een vijfde van de lijst. Vier op negen is een markt met
winnaars en verliezers, vier op zeventig is een mislukte meting, en die hoort niet met naam en
toenaam online te staan.

**Wat de kostenraming werkelijk werd.** `STAP_KOSTEN_USD` is nog niet bijgesteld, maar de cijfers
liggen er nu: marktonderzoek $0,02 tegen een raming van $0,85, intenties $0,0009 tegen $0,06, vragen
$0,0017 tegen $0,10, meten $0,014 per vraag tegen $0,03. De raming is dus structureel te hoog, het
sterkst bij het marktonderzoek (42 keer). Bijstellen kan pas na een tweede markt: één meting is één
waarneming.

Vier controles groen: typecheck, 3349 unittests, 549 ketentests, de productiebuild.

## 1 september 2026: de eerste vier P1's uit de live test, en de verificatiemeting

**De verificatiemeting.** Na de vier P0-reparaties is er een verse markt doorheen gegaan:
Warmtepomp Tilburg, 26 bedrijven, 40 vragen, $0,60. Het verschil met de meting van diezelfde ochtend
is het hele punt van die reparaties:

| | Warmtepomp Eindhoven (voor) | Warmtepomp Tilburg (na) |
|---|---|---|
| Vragen die de plaats noemen | 3 van de 40 | 22 van de 40, en alle 21 in de fases selecteren en contact |
| Antwoorden met een bedrijf uit de markt erin | 2 van de 40 | 16 van de 40 |
| Bedrijven die genoemd worden | 1 van de 43 | 12 van de 26 |
| Soorten kansen | 43 keer "Onzichtbaar" | 17 concurrent gap, 1 source gap, 1 information gap |
| Hoogste scores | zeven bedrijven op exact 76 | 93, 93, 90, 90, 86, 82, 77 |
| Haak geschreven door | 43 keer het sjabloon | het model, met de concurrent bij naam |
| Zekerheid | middel | hoog |
| Schrijftaken | 16 van de 16 mislukt | 18 van de 18 gelukt |

De haak die eruit komt is nu een verkoopargument in plaats van een constatering: "In een meting van
40 vragen over warmtepompen in Tilburg werd Struycken Installaties 7 keer genoemd en Van Oers
Installaties B.V. 0 keer." En de cijfers zijn met de hand na te rekenen: voor alle twaalf genoemde
bedrijven komt het aantal in `sales_company_scores` exact overeen met het aantal rijen in
`sales_mentions`. Deze markt had 1040 vermeldingsrijen, dus zonder de paginering van vanochtend
waren er opnieuw 40 stilletjes weggevallen.

**Wat er daarna gerepareerd is.** Vier punten uit dezelfde test, allemaal rond de mail.

1. **De contactpersoon kwam niet in de mail terecht.** Er wérd iemand gevonden, maar `contact_id`
   bleef leeg en elk concept begon met "Beste,". `zoekContact()` hangt de gevonden persoon nu aan de
   outreach, maar alleen als hij door `magOntvangerZijn()` komt, en de conceptstap gebruikt die naam
   in de aanhef en in de opdracht aan het model.
2. **Een algemene postbus telde als persoonlijk adres.** `info@coolvent.nl` stond op de pagina met
   leveringsvoorwaarden, kreeg daarom het label "gevonden", en glipte zo door elke controle. Twintig
   postbusnamen (`info`, `contact`, `verkoop`, `administratie` en zo verder) zijn nu geen ontvanger
   meer. Het adres blijft staan, want om te bellen is het prima.
3. **Een functie die over een ander bedrijf gaat.** Het onderzoek leverde bij Coolvent "eigenaar van
   JS Montage Eindhoven" op. `rolPast()` keurde die goed, want er staat "eigenaar" in.
   `rolHoortBijBedrijf()` kijkt nu of de bedrijfsnaam ín de functie iets deelt met de naam van dit
   bedrijf, en anders gaat er geen mail naartoe.
4. **De belvoorbereiding werd nooit opgeslagen.** Twee markten, twee keer afgekeurd, en de reden
   was steeds dezelfde: de opdracht aan het model vroeg alleen om een mail, terwijl de verwachte
   uitvoer ook de vier blokken uit plan 16.5 bevat. Het model leverde ze dus leeg en de controle
   verwierp ze terecht. De opdracht vraagt er nu om, met de aantallen erbij, in dezelfde aanroep en
   dus zonder extra kosten. En als de voorbereiding alsnog afvalt, staat op het dossier waarom: die
   reden zat in een notitieveld dat geen enkel scherm toonde.

**Twee dingen erbij die uit dezelfde markt kwamen.** De afzender van een concept was
"[jouw naam] (e2e-consultant@orbit-test.nl)": een intern mailadres in een bericht aan een prospect.
Dat is nu de naam van de medewerker als die bekend is, en anders alleen de plaatshouder. En de
ontdekking nam de tekst van een link over als bedrijfsnaam, waardoor twee echte installateurs "Open
website" heetten in de kans, de score en de conceptmail. Een naam die aantoonbaar een linktekst is
("Open website", "Lees meer", een telefoonnummer) telt niet meer als naam; het bedrijf blijft staan
en heet dan naar zijn domein. De uitsluitingslijst kreeg er de bronnen bij die beide markten
opleverden: `rvo.nl`, `mkb.nl`, `knmi.nl`, `cookiedatabase.org`, `fraudehelpdesk.nl`,
`openstreetmap.org`, `wa.me` en een handvol andere.

**Het Overzicht-scherm bestaat nu echt.** `/sales` was een vaste lege staat die "Er is nog geen
markt gemeten" zei, ook nadat er twee markten gemeten waren. Er staan nu vier blokken: jouw werk
vandaag met de volgende stap per regel, de hoogste kansen die niemand heeft opgepakt (getoetst tegen
de actieve outreach van iedereen, niet alleen die van jezelf), waar een reactie op kwam, en je eigen
cijfers deze maand. Geen vergelijking met collega's, conform plan §5.1.

Vier controles groen: typecheck, 3396 unittests, 549 ketentests, de productiebuild.

## 1 september 2026: de schrijfknop bij "Wat je moet doen" beloofde schrijven, maar startte alleen het onderzoek

**Gemeld door de eigenaar.** Op de clusterpagina, hoofdstuk "Wat je moet doen", staat bij een te
schrijven pagina de knop "Laat ORBIT ENGINE deze pagina schrijven". De klik start geen schrijfwerk:
hij plant de briefing in (`contentbriefing.md` §8, sinds R5.1), en pas na "Schrijf mijn pagina's" op
het briefingscherm gaat het echte schrijven van start.

**Twee losse fouten, dezelfde oorzaak.** De knoptekst in `_work/generate-button.tsx` beloofde
"schrijven" terwijl de route erachter altijd eerst de briefing inplant. Erger: de pollroute
(`GET /api/analyses/[id]/content`) rekende `ready` als "elke status behalve `draft`", en een pagina
in de briefingfase heeft status `briefing`, niet `draft`. De knop viel dus binnen vier seconden om
naar "ORBIT ENGINE schrijft…" en meteen daarna naar "Klaar, lees hem in je bibliotheek", terwijl er
nog geen letter tekst bestond en de klant eerst zelf de briefingvragen moest beantwoorden.

**Wat er nu staat.** De knop heet "Start het onderzoek voor deze pagina". Komt de briefing terug uit
de aanvraag (`json.briefing`), dan pollt de knop niet langer alsof er geschreven wordt, maar wijst
hij naar het briefingscherm met dezelfde tekst als de werklijst ("De briefing staat klaar. Vul aan
wat ORBIT ENGINE niet van je website kan halen, dan schrijft het de pagina."). De pollroute telt een
pagina nu pas als `ready` als de status noch `draft`, noch `briefing` is. Dezelfde tekst in
`lib/opportunities.ts` (het kansenblok van de Sales-module) is meeveranderd, anders zou hetzelfde
verkeerde beeld daar terugkomen.

Vier controles groen: typecheck, 3398 unittests (met een nieuwe test op de `ready`-berekening), 549
ketentests, de productiebuild.

## 1 september 2026: de contentpijplijn krijgt een contract, een panel en gerichte reparatie

Aanleiding: de opdracht om de contentpijplijn kritisch door te lichten en te herontwerpen, met als
tweede eis dat een pagina als een VOLLEDIGE pagina moet lezen. De analyse staat in
`docs/tasks/contentpijplijn-herontwerp.md`; dit is wat er gebouwd is.

**Wat de cijfers zeiden.** Nagerekend op productie in plaats van geschat. Uit `ai_calls`: een pagina
kostte $0,32, waarvan $0,316 in de twee aanroepen op het dure model (schrijven $0,154, volledig
herschrijven $0,162, gemiddeld 4214 uitvoertokens à $30 per miljoen). Een beoordeling op de goedkope
tier kostte $0,0008. Uit `content_pieces`: van de 29 afgeronde pagina's stonden er 15 op "check
nodig", de gemiddelde pagina telde 548 woorden waar een artikel op 700 tot 1200 mikt, en de
bronherleidbaarheid was 78,6% (bij de drie gepubliceerde pagina's 52,2%). Onderzoeken, plannen en
beoordelen zijn dus vrijwel gratis; alleen schrijven is duur. Daarop is de hele keuze gebaseerd: het
sectiegewijs schrijven op de dure tier (het enige voorstel dat de rekening echt verhoogt, naar
ongeveer $0,90 per pagina) is NIET gebouwd, op verzoek van de eigenaar, en wacht tot de app bij
meerdere klanten draait.

**Het contentcontract, en waarom dit de kern is.** De claim-audit leverde BEWERINGEN, geen
inhoudsopgave. Niemand bepaalde vooraf welke secties een pagina nodig had. Volledigheid hing daarmee
aan promptregel 7 en aan één boolean die het model over zichzelf invulde, precies wat conventie 1
verbiedt. Nu stelt een nieuwe taak (`content_plan`) per contentitem een contract op: secties, per
sectie de deelvraag, de verplichte F-nummers, de uit te leggen termen en een richtlengte
(`lib/pipeline/content-contract.ts`, `lib/schemas/content-contract.ts`). Datzelfde contract gaat naar
de schrijver én naar de poort die de tekst narekent (`content-coverage.ts`, puur en getest). Dezelfde
lijst die de opdracht geeft, rekent hem na.

**Het itemdossier: het cluster vindt de kans, het item bepaalt de pagina.** Uitdrukkelijke wens van
de eigenaar, en de logische voortzetting van S9 en S10. Eén onderzoekstap per aanbeveling, mét
web_search, levert de deelvragen van de lezer, de vervolgvragen, de twijfels en de vaktermen die
uitleg nodig hebben (`item-dossier.ts`). Kosten ongeveer anderhalve cent per pagina.

**Elke algemene uitleg krijgt een bron die wij narekenen.** De feitenkaart bewaakt alles over de
KLANT (R5.3); de algemene laag had geen enkele bewaking. Een completere pagina laat die laag juist
groeien, dus dat gat groeit mee. `explainer-verify.ts` haalt de bron op en zoekt het letterlijke
citaat terug; wat de controle niet haalt, vervalt en haalt de schrijfprompt niet. Onbekend is een
betere waarde dan een verkeerde (conventie 3).

**Drie beoordelaars in plaats van één.** De kritiek draaide op de goedkoopste stand (`effort: none`)
van het goedkoopste model, voor het enige dat de klant letterlijk publiceert. Nu redactie,
feitelijkheid en citeerbaarheid parallel, op dezelfde goedkope tier maar mét redeneertijd (nieuwe
werk-soort `judging` in `sampling.ts`). Samen ongeveer $0,008 per pagina. De derde beoordelaar is
nieuw en is de reden dat dit panel bestaat: die zegt welke vraag een lezer overhoudt.

**De volledige herschrijving is weg.** In plaats daarvan repareert het model alleen de secties met
een bevinding en zet CODE ze terug op hun plek (`content-sections.ts`, `ContentPatch`). Twee winsten:
het model kan de goede passages niet meer stukmaken, want het krijgt ze niet in handen, en de
uitvoertokens dalen fors. Maximaal drie rondes (`REPAIR_MAX`), geteld op de pagina zelf zodat de
grens een taakherhaling overleeft. Verwachte kosten per pagina daarmee ongeveer $0,24, dus LAGER dan
de $0,32 van vandaag.

**Twee dingen die alleen over doorlooptijd gaan.** Contenttaken stonden niet in
`IO_BOUND_HEAVY_TYPES` en draaiden dus strikt één voor één, met 200 van de 240 seconden vrijgehouden
per stuk: een batch van tien pagina's is twintig taken en die vielen vrijwel allemaal in hun eigen
werker-aanroep van een minuut. Ze hebben nu een eigen groep (`PARALLEL_CONTENT_TYPES`, drie tegelijk)
mét de volle reservering, anders dan de reputatietaken: één afgebroken schrijfaanroep kost het
duurste model twee keer. En de bronanalyse, die bij het schrijven én het herschrijven per pagina
draaide, wordt gecacht op profiel plus een hash van (URL's, doelvragen).

**Eén vraag per pagina gegarandeerd.** De briefing koos acht vragen, gesorteerd op hoeveel pagina's
ze dienen. Een vraag die vier pagina's dient won dus altijd van een vraag die er één scherp maakt, en
bij een batch van tien kon een pagina nul vragen krijgen terwijl juist die de dunste dekking had.
Elke pagina zonder gekozen vraag krijgt er nu alsnog één, erbovenop en niet in ruil.

Migratie `0082` (vier kolommen op `content_pieces`, tabel `source_analysis_cache`), toegepast op
productie. Vier controles groen: typecheck, 3455 unittests, 557 ketentests, de productiebuild.
**Nog niet geverifieerd tegen een echte klant** (conventie 10): het contract, de dekkingspoort en de
reparatielus zijn getoetst tegen de stub en tegen opgeslagen data, niet tegen een verse pagina op
productie. Dat is de eerstvolgende praktijktoets, en pas daarna mag hier staan dat het werkt.

## 1 september 2026: een label voor een kans die op te weinig metingen steunt (potentiescore fase 4)

Aanleiding: bij Gasservice Brabant sprong de score van cluster "Cv-ketel onderhoud" van 30 naar 60
tussen twee metingen, verklaard in een eerder gesprek als wisselende web_search-antwoorden, geen
bug. Een Teamsessie (skill `team-session`, vijf experts plus Devil's Advocate) boog zich over de
vraag hoe de app hiermee om moet gaan. Bevinding, bevestigd door de Devil's Advocate na eigen
naleeswerk: `visibility_scores.score_stderr` wordt al berekend en opgeslagen (`lib/stats/
uncertainty.ts`), en gebruikt om de trendtekst in het rapport te temperen
(`lib/pipeline/period-change.ts`), maar `lib/potential-data.ts` gebruikte hem nergens. Een kans of
pagina-aanbeveling op 1 of 2 doelvragen kon zo als hard cijfer (0 of 100) getoond worden zonder dat
er een marge bij stond.

**Wat er gebouwd is.** `PotentialTriple` (`lib/potential.ts`) kreeg een vierde veld, `confident:
boolean`. `isConfident(stderr)` zet de 95%-marge (`Z95 × stderr`) af tegen een vaste grens van 25
punten: een volledig gemeten onderwerp (~30 vragen) heeft van zichzelf al een marge van ±16,4 punten
(docs/architecture.md §6) en haalt die grens dus niet, een kans op een handvol doelvragen wel. Geen
nieuwe AI-aanroep, geen tweede meetronde nodig, de standaardfout ligt al in de database
(`score_stderr` op analyse-niveau, een verse `binomialStderr()` over de doelvragen op kansniveau).
Op het scherm (`components/potential-metrics.tsx`): het label "Nog een meetronde nodig".

**Expliciet géén filter.** De product owner was hier duidelijk over: het label mag een kans nooit
onbruikbaar maken. Een net gestarte klant met weinig metingen zou anders precies op het moment dat
hij moet zien wat de app oplevert, een leger contentplan krijgen, het risico dat de Devil's Advocate
in de Teamsessie benoemde. `lib/opportunities.ts`, `lib/plan-backlog.ts` en het schrijven van een
pagina zijn dan ook ongewijzigd: een kans met een laag `confident` blijft even bruikbaar als
daarvoor.

Bewust NIET meegenomen uit dezelfde Teamsessie: de bredere vraag of kansen over meerdere
meetperiodes gemiddeld zouden moeten worden. Dat wachtte op een telling van hoeveel analyses
daadwerkelijk twee of meer periodieke metingen hebben, die telling is niet gedaan, dus dat blijft
openstaand (`docs/tasks/potentiescore.md` §4b).

Vier controles groen: typecheck, 3462 unittests (7 nieuw, `isConfident`), 557 ketentests, de
productiebuild. **Nog niet geverifieerd tegen een echte klant** (conventie 10): geen productieprofiel
is nagelopen op of een kans met bekend weinig doelvragen het label ook echt krijgt.

## 1 september 2026: labels en een prullenbak op het clusteroverzicht (migratie 0083)

**De aanleiding.** Het clusteroverzicht van een merk is één platte lijst. Bij vier clusters werkt
dat, bij dertig niet: de vraag is dan niet "welk cluster staat hier" maar "waar staan mijn clusters
over onderhoud". De product owner vroeg om een label per cluster, een filter erop, en de
mogelijkheid een cluster weg te halen. Bij dat laatste stond de eis er meteen bij: dan moeten de
metingen van dat cluster in de toekomst per definitie stoppen.

**Wat er gebouwd is.** Migratie `0083` voegt de tabel `cluster_labels` toe (één rij per label per
merk, unieke index op `lower(name)`) en `analyses.label_id` met `on delete set null`. Een tabel en
geen tekstkolom op `analyses`, want "Onderhoud", "onderhoud" en "Onderhoud " zouden dan drie groepen
in het uitklapmenu zijn waar de gebruiker er één bedoelde. `on delete set null` en geen cascade,
want een label weggooien mag nooit een cluster meenemen: het cluster draagt maanden meetdata, het
label draagt een woord. De rekenkunde eromheen staat in `lib/cluster-labels.ts`, zonder
`server-only`, want zowel het serverscherm als het uitklapmenu in de browser leest hem (conventie 2).

Een label is in te vullen op drie plekken: bij het aanmaken van een cluster (`/analyses/new`, kies
een bestaand label of typ er een nieuwe), op de kaart in het overzicht, en er weer af te halen. De
route is bewust "vind of maak": wie "Onderhoud" typt terwijl dat label al bestaat, komt bij het
bestaande label uit en niet bij een tweede groep met dezelfde naam. De unieke index van 0083 is het
vangnet daaronder voor twee tabbladen tegelijk (conventie 1).

**De prullenbak voegde geen kolom toe, en dat is de conclusie.** `analyses.archived_at` bestaat
sinds migratie `0044`, `lib/archive.ts` houdt gearchiveerde clusters uit elke lijst, en
`/api/cron/tracking` trekt zijn maandlijst via `activeOnly()`. Het meten stopt dus per definitie
zodra een cluster in de prullenbak gaat, en `lib/jobs/worker.ts` slaat bovendien de taken over die
al klaarstonden. Wat ontbrak was niet de kolom maar de knop. Er komt daarom ook geen tweede
schakelaar naast `tracking_enabled`: twee schakelaars voor één gevolg lopen uit elkaar. Verwijderen
is bewust archiveren gebleven, niet wissen: onder een cluster hangen de vragen, elke meetronde, elke
vermelding, de rapporten en de geschreven pagina's, en dat komt alleen terug door er opnieuw voor te
betalen (~$0,82 per ronde).

De twee knoppen staan boven de lijst, "Alle clusters" links en "Prullenbak" rechts daarvan, met het
filter rechts op dezelfde regel. De stand zit in het adres (`?weergave=prullenbak&label=<id>`), dus
het filteren gebeurt op de server en de lijst die terugkomt is de lijst die klopt. Een `?label=` dat
niet bij dit merk hoort valt terug op "alle labels" in plaats van een leeg scherm te tonen, want een
lege lijst zonder uitleg leest als "mijn clusters zijn weg".

Het kaartje in het overzicht is daarmee geen `<Link>` meer om zijn geheel: een keuzelijst binnen een
link is niet met het toetsenbord te bedienen. De kop is nu de link, de bediening staat eronder.

**Labels beheren.** Achter het filter staat "Labels beheren", dat een lijstje openklapt waarin een
label te hernoemen en weg te gooien is. Achter het filter en niet ervoor: filteren doe je elke keer
dat je hier komt, hernoemen een enkele keer. Hernoemen is één update op één rij, en de clusters
verhuizen vanzelf mee omdat ze naar het id wijzen; met een tekstkolom op `analyses` was dit een
update over alle clusters heen geweest die halverwege kon stranden. Weggooien haalt alleen het label
eraf, want `on delete set null`, en dat staat ook letterlijk in de bevestiging: zonder die zin durft
niemand de knop te gebruiken. Het aantal naast een label telt over de actieve clusters én de
prullenbak heen, anders zegt het paneel "0 clusters" bij een label waar er tien onder hangen.

Vier controles groen: typecheck, 3501 unittests (38 nieuw), 563 ketentests (6 nieuw, waaronder de
controle dat een gearchiveerd cluster echt uit de maandronde valt, dat een verwijderd label zijn
clusters laat staan en dat hernoemen het cluster meeneemt zonder het aan te raken), de
productiebuild. De migratie is toegepast op productie. **Nog niet geverifieerd met een echte klant**
(conventie 10): er is nog geen productieprofiel waar iemand labels op heeft gezet.
