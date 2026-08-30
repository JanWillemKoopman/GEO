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

De diagnose: de app **mat** en **schreef**, maar die twee helften raakten elkaar nergens. De
meetdata bereikte de schrijver niet en de geschreven content kwam nooit terug in de meting. Doel
van het traject: die cirkel sluiten.

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

**Contentkwaliteit-doorlichting (juli).** De meet-/adviespijplijn was degelijk; het dunste
onderdeel was juist het betaalde product. Fase C schreef blind: één call, één klein model, geen
redactie, geen kwaliteitspoort, en door de terechte regel "verzin geen feiten" gedwongen generiek.
Drie inzichten die het ontwerp sindsdien sturen:

1. **Grounding lost de generiek-val op.** "Verzin geen feiten" maakt content generiek zolang de
   schrijver *geen* feiten heeft. Geef hem geverifieerde feiten uit de eigen site en hij kan
   concreet én veilig schrijven.
2. **Kwaliteit is bijna gratis.** Content is vraaggestuurd; een redactielus + premium model kost
   centen per pagina, terwijl content het product is waarvoor concurrenten €1.000+/mnd rekenen.
3. **Symmetrie.** De meting had een review-gate; de content. Het echte product, hoort er ook een
   te hebben.

Resultaat: de driestapsredactie (schrijven → kritiek → herschrijven), de premium tier voor
schrijven, `proofPoints`/`styleSamples` als schrijfgrondslag, en programmatische validatie van
`schema_jsonld` in plaats van de LLM-string blind vertrouwen.

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

- **Direct gerepareerd:** `draftContentPiece()` behandelde een `content_piece` met status
  `'briefing'` als "al af" en sloeg het schrijven stilzwijgend over. Trof potentieel elke "Schrijf
  mijn pagina's"-klik sinds R5.2.
- **De zwaarste vondst van het hele traject:** de antwoorden die de klant in het briefingscherm
  geeft, bereikten de schrijver niet. `loadContentContext()` bouwde wel een lijst `answeredFacts`,
  maar gebruikte hem nergens, de schrijver kreeg uitsluitend de kaart zoals die vóór de antwoorden
  bevroren was. Bewijs: een door de tester met bron bevestigd "nee" op de doelvraag van een
  Fysi-Unique-pagina werd alsnog als "ja" gepubliceerd. Dat is geen losse bug maar het gat waardoor
  R5's kernbelofte niet werkt zodra de klant iets *corrigeert*.
- Drie kleinere bevindingen: multi-ref-claims die de citaatplicht ten onrechte lieten falen, een
  versiesprong die een lege spookrij achterliet, en vaste praktisch-slots die niet passen bij een
  platform of keten.

**R8 loste negen van de tien op.** De belangrijkste:

- **R8.1**, `mergeAnsweredFacts`: de klantantwoorden komen alsnog op de feitenkaart, en een nieuwer
  antwoord verslaat een ouder op basis van de vraag.
- **R8.2 / R8.7 / R8.8**, `content-gate.ts`: deterministische controles vervangen de
  zelfrapportage van het model. Die gaf 100/100 op alle tien pagina's, óók op de pagina waarvan
  dezelfde aanroep in zijn eigen verbeterpunten schreef dat de hoofdvraag niet beantwoord werd.
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
**Swapfiets** (swapfiets.nl), onderwerp *fietsabonnement*. Niet tegen testdata en niet tegen
stubs, profiel aanmaken, 22 vragen laten opstellen, bevestigen, 38 metingen met `web_search`,
rapport, briefing beantwoorden en één pagina laten schrijven. Kosten van de hele run: **$1,03**,
waarvan $0,988 (96%) in de 38 metingen. Dat is precies de verhouding die §3 voorspelde.

> Deze run draaide op de **GPT-4.1-familie**; de migratie naar GPT-5.6 (§11) is er direct
> achteraan gegaan. De bedragen en de modelnamen hieronder gelden dus voor de stand van
> vóór die migratie, de bevindingen zelf staan er los van, want geen ervan gaat over het
> model.

De keten werkt. Wat eruit kwam: score 95 ±13, 68% van de metingen noemt Swapfiets, gemiddelde
positie 1,3, 14× als eerste aanbevolen, en een artikel van 502 woorden waarvan elke concrete
bewering een F-nummer draagt dat naar een echte bron wijst. Nul verzinsels.

Er gingen onderweg vijf dingen stuk. Op volgorde van hoe erg:

**De content-inventaris verdween zonder een woord.** Twee van de 22 gecrawlde pagina's van
swapfiets.nl bevatten een NUL-byte (U+0000). Postgres accepteert dat niet in een `text`-kolom en
PostgREST weigert dan de HÉLE batch-insert. Dus twee rotte pagina's kostten alle 22. De fout van
de insert werd nergens gecontroleerd: `refreshInventory()` gaf 22 terug, de route antwoordde
`{"count":22}`, en in `profile_pages` stond nul. Het profiel ging op 'klaar'.

Dit is de duurste soort fout die dit product kan maken, want hij is onzichtbaar en hij vreet aan
het fundament: zonder inventaris is de feitenkaart leeg en wordt content op niets gebouwd. Het
verschil is te meten. Na de reparatie telde de kaart van dezelfde pagina **29 citeerbare feiten,
waarvan er 18 uitsluitend uit de gecrawlde pagina's komen**, inclusief alle prijzen (€19,90 voor
de Original, €23,90 voor de Deluxe 7) en de servicebelofte "binnen 10 minuten gerepareerd of
omgeruild". Zonder de fix had het artikel het over "een vast bedrag per maand" moeten hebben.

Geschoond bij de bron (`lib/pg-text.ts`, puur en getest): `htmlToText()` is het enige punt waar
externe HTML platte tekst wordt, dus daar gaan de NUL-byte en de losse surrogate eruit. En beide
inserts controleren nu hun fout, `prepare-profile` logt hem, `refresh-inventory` gooit hem, want
die route toont de klant een getal en dat mag geen leugen zijn.

**De werker werd door het platform afgekapt.** Twee 504's op `/api/cron/worker` in 24 uur ("Task
timed out after 300 seconds"). Twee rekensommen die niet klopten. De SDK-timeout van 100s geldt
per POGING en de SDK herhaalt ook timeouts, dus met `maxRetries = 3` was de echte bovengrens van
één aanroep 400 seconden, terwijl `HEAVY_JOB_RESERVE_MS` (220s voor twee aanroepen) er
stilzwijgend van uitging dat er niet herhaald werd. En de claimlus keek alleen of het budget nog
niet óp was, niet of het volgende werk er nog ín past: zware taken hadden een reservering, lichte
niet. Nu een totaalbudget van 105s per aanroep via een `AbortSignal` die over alle pogingen heen
geldt, plus een reservering voor allebei de soorten. Afgekapt worden is niet onschuldig: alles wat
op dat moment geclaimd was bleef op 'running' staan tot de reaper het vijf minuten later
terugzette, en zo lang kijkt de klant naar een voortgangsscherm waarachter niets gebeurt.

**Wat je vóór de hydratie typte, was weg.** Het naamveld van de onboarding heeft `autoFocus` en
nodigt dus uit om er meteen in te typen. Wie dat deed vóórdat React het formulier had overgenomen,
zag bij de eerste re-render naam én webadres leeglopen, de controlled input schreef de lege
React-state over de DOM-waarde heen. Gemeten tegen productie, zonder enige melding. Eén effect bij
het aankoppelen neemt nu over wat er al stond.

**Oriëntatie leverde 2 van de 10 vragen op.** Overweging en Beslissing haalden allebei gewoon 10.
Oorzaak is de merkneutraliteitsregel die precies doet wat hij moet doen: een brede oriëntatievraag
over fietsabonnementen noemt in Nederland vanzelf de marktleider, en dat is hier de klant zelf.
Het probleem zat in de aanvulronde, die wel te horen kreeg dát er vragen ontbraken maar niet dat
de vorige ronde op een BEDRIJFSNAAM sneuvelde, uit een lijst geaccepteerde vragen valt dat niet
af te leiden. Nu staat de reden er expliciet bij, met de verboden namen, en mag een fase drie
rondes in plaats van twee. De klant zag hier niets van: het scherm meldde "22 actief van 22".
⚠️ Dit is de enige reparatie van deze ronde die nog **niet live is nagerekend**, de wachtrij
draait op de productiebranch, dus het effect is pas te meten bij de eerste analyse na de merge.

**En een e-mail die nooit kwam.** "Kom later terug of wacht op de e-mail", op elk voortgangsscherm,
terwijl `EMAILS_ENABLED` uitstaat en op productie uitstond. Er staat nu alleen wat onder alle
omstandigheden waar is. Verder `app/icon.svg` toegevoegd: `/favicon.ico` gaf 404 bij elke
paginaweergave.

Wat déze ronde leert bovenop §7: de bugklasse is opgeschoven. De zeven fouten van juli zaten in de
samenhang tussen taken. Deze vijf zitten in de **randen van het systeem**, wat het open web in de
database duwt, wat het platform met een te lange functie doet, wat de browser doet vóórdat React
er is. Geen enkele was te vinden met een test die de app tegen zichzelf draait; alle vijf lagen
binnen tien minuten open zodra er één echte klant doorheen liep.
## 11. Over naar GPT-5.6 (1 augustus 2026)

De hele app draaide op de GPT-4.1-familie. Nu: **`gpt-5.6-luna`** voor alles wat meet, onderzoekt
en beoordeelt, en **`gpt-5.6-sol`**. Het duurste model dat OpenAI levert, uitsluitend voor het
schrijven en herschrijven van content. Dat laatste is de enige stap waarvan de uitkomst letterlijk
gepubliceerd wordt; daar is de tier het geld waard, overal elders niet.

**Wat er inhoudelijk moest veranderen, en waarom het meer was dan drie strings.**

De GPT-5-familie is een redeneerfamilie. Dat raakt twee dingen die deze app expliciet gebruikte:

- **`temperature` is geen vrije knop meer.** Een GPT-5.6-model accepteert hem alleen bij
  `reasoning.effort: "none"`; bij elke hogere stand is het een unsupported parameter en faalt de
  call. De app zette op 21 plekken een temperatuur, één op één overzetten had dus niet "iets
  slechtere output" opgeleverd maar een 400 op elke onderzoeks-, rapport- en schrijfstap.
- **De tier-splitsing verviel.** `volume` (nano) en `quality` (mini) waren twee modellen; nu wijzen
  ze allebei naar Luna. Het onderscheid dat we ermee maakten, hoeveel mag deze stap kosten en hoe
  zorgvuldig moet hij zijn, zit nu in de redeneerinspanning.

Daarom geven aanroepplekken geen temperatuur meer op maar een **soort werk** (`work:
"deterministic" | "analytical" | "creative" | "content" | "simulation"`), en vertaalt
`resolveTuning()` in `lib/openai/sampling.ts` dat naar de parameters die daadwerkelijk de deur uit
gaan. Eén tabel, met per regel de reden: classificeren krijgt effort `none` + temperatuur 0
(reproduceerbaarheid gaat vóór; één verschoven oordeel verschuift de score), promptgeneratie
effort `none` + temperatuur 0,8 (variatie ís daar het product), onderzoek effort `low`, content
effort `medium`. De effort-standen staan laag omdat één call binnen de 100 s van `TIMEOUT_MS` moet
passen en de meet- en onderzoeksstappen daar web_search bij doen.

**Vangnet (conventie 1).** De regel "temperatuur mag bij effort `none`" is een regel van OpenAI,
niet van ons. Weigert de API hem alsnog, dan herhaalt `structured.ts` die ene call zonder
temperatuur en stuurt hem de rest van het proces niet meer mee. Liever iets meer ruis in de
classificatie dan een meetronde die omvalt nadat hij per vraag al betaald zoekwerk heeft gedaan.

**Kosten.** Twee kanten op. Zoeken werd goedkoper: op een redeneermodel kost web_search $10 per
1000 calls in plaats van $25, en dat was ~90% van een meetronde, 30 vragen gaan van $0,75 naar
$0,30. Daar staat tegenover dat de opgehaalde pagina's nu wél als input worden afgerekend (~$0,05
per ronde op Luna). Netto ruwweg $0,40 in plaats van $0,82. Content werd juist ~5× duurder per
pagina. Beide getallen zijn afgeleid van de gepubliceerde tarieven en **nog niet nagerekend tegen
`ai_calls` op productie**, conventie 10 geldt ook hier.

**Wat dit niet oplost.** De eerste echte call op het nieuwe model is nog niet gemaakt: `npm run
test:openai` maakt betaalde calls en is in deze ronde niet gedraaid. Die rooktest verifieert nu wel
precies de combinaties die de pijplijn verstuurt (effort `none` + temperatuur 0, effort `low`,
effort `medium` op Sol), zodat een geweigerde parameter daar zichtbaar wordt en niet pas in een
meetronde.
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
over alle analyses heen. Bij één analyse was dat zinvol; bij meerdere liep hij op **27 losse
punten** in één kaart. Precies de rommel die het werkmodel (`lib/work.ts`, §9) per analyse juist
had opgelost. De lijst is weg van dit overzicht: dat werk komt uit een analyse en staat daar ook,
in hoofdstuk 03 van het dossier. `/analyses` toont nu alleen nog de drie statusblokken en de
analysenlijst zelf.

Ter compensatie kreeg elke rij in die lijst vier kaartcijfers plus het aantal metingen:
zichtbaarheidsscore, aantal openstaande vragen, aantal voorgestelde en aantal geschreven pagina's,
en "N metingen" (`AnalysisCardMetrics`, `lib/dashboard.ts`). Twee dingen die de moeite van het
uitschrijven waard zijn:

- **Openstaande vragen is afgeleid, niet apart bevraagd.** `visibility_scores.score` is exact
  `genoemd / winnable_runs × 100`; door dat om te keren (`winnable_runs − round(score/100 ×
  winnable_runs)`) volgt het aantal gemiste vragen zonder een extra join op
  `tracking_run_mentions`. Die tabel heeft geen `analysis_id` en zou per analyse een aparte query
  op de laatste week hebben gekost.
- **"Geschreven" en "voorgesteld" gebruiken dezelfde statusgrens als `_chapters/werk.tsx`**: een
  `content_pieces`-rij telt pas als geschreven zodra de status voorbij `briefing` is (die heeft nog
  geen tekst); een aanbeveling telt als "voorgesteld" zolang er geen rij met status ≠ `draft` en
  dezelfde titel bestaat. Twee losse berekeningen voor "is dit al gedaan" hadden hier gegarandeerd
  uit elkaar gelopen.

`components/action-list.tsx` (de oude `ActionList`) is vervallen; `DashboardStats` verhuisde naar
`components/dashboard-stats.tsx`.

---

## 14. Onboarding 2.0, de eerste helft (3 augustus 2026)

De bouwspec (`tasks/onboarding-2.0.md`) is verwijderd nu de bouw af is en er nieuwere lagen
overheen staan. Hieronder wat er gebouwd is en het cijfer dat elke keuze droeg.

**Het cijfer dat de hele ronde droeg: 6.000 tegen 60.** Het profielonderzoek deed één AI-aanroep op
`crawlSite()`, de homepage, afgekapt op 6.000 tekens. De content-inventaris van 60 pagina's draaide
er parallel aan en werd pas ná de aanroep opgeslagen, dus die kwam het onderzoek nooit in. Alles wat
het model over diensten, prijzen, vestigingen en team "wist", kwam uit die ene pagina plus een gok.
`profile_discover` draait nu vóór het onderzoek en levert 60.000 tekens context aan voor ~$0,003 aan
invoer. De duurste kennisbron bleek gratis en werd weggegooid.

**Verkoopgedreven in plaats van self-serve.** De onboarding vroeg vier wizardstappen met elf velden
uit voordat er iets gebeurde. Nu drie velden, webadres, bedrijfsnaam, andere schrijfwijzen, en de
pijplijn doet de rest. De oude kolommen bestaan nog en worden door het onderzoek gevuld. Corrigeren
gebeurt achteraf op de profielpagina, als er iets te corrigeren vált.

**De stafrol als extra policy, niet als herschrijving.** Er staan 19 tabellen met een
`*_select_own`-policy. Postgres OR't permissieve policies, dus één extra policy per tabel doet
hetzelfde als alle 19 herschrijven, maar additief, en met één `drop` per tabel weer weg.
`staff_users` heeft RLS aan en nul policies (zoals `jobs`), en `is_staff()` is daarom
`security definer` met een vaste `search_path`: als aanroeper zou hij die tabel mét RLS lezen en
altijd `false` geven, de hele verbreding zou dan stil niet werken.

**Toewijzen raakt precies twee tabellen.** `user_id` komt alleen voor in `profiles` (0004) en
`analyses` (0001); nagelopen over alle 41 migraties. De rest hangt via `analysis_id` aan de analyse
en verhuist mee met de RLS-join. Faalt de tweede update, dan wordt de eerste teruggedraaid, een
profiel bij de klant en de analyses bij de beheerder is erger dan een mislukte toewijzing.

**Wachtwoordherstel is een route handler, geen pagina.** Het inwisselen van de herstelcode schrijft
een cookie, en een Server Component mag dat niet in Next 15: dat faalt stil in de try/catch van
`lib/supabase/server.ts`, waarna de klant een nieuw wachtwoord intypt dat nergens heen gaat.

**R6.2 opgelost op de plek waar hij thuishoort.** Bol leverde 1 pagina in de inventaris op, HEMA 40
productpagina's; in beide gevallen degradeerde het rapport zonder melding. Het oordeel valt nu in
fase 0, waar constateren nog nul euro kost. Migratie `0033` vervalt daarmee definitief.

**De renderbaarheidstest is de zwaarste bevinding die er bestaat en kost niets.** AI-crawlers voeren
geen JavaScript uit. Boven de 50% JavaScript-pagina's is dat een blocker en geen aandachtspunt: de
site is dan voor een AI-assistent grotendeels leeg, en betere content helpt niets.

**Van "verzin een onderwerp" naar "kies uit wat je aanbiedt".** De aanbodboom
(`profile_offerings`) is bewust een boom en geen `text[]`: een core topic zit op het niveau tússen
categorie en product in, categorieniveau meet een hele markt, productniveau wordt door niemand
gevraagd. `propose_topics` kost ~$0,01 en doet bewust geen meting per voorstel; dat zou 8 × $0,40
zijn vóórdat iemand ja heeft gezegd.

**De enginelaag is bedrading zonder fan-out.** `lib/engines/` is er, de Gemini-adapter is er, de
meetsleutel kent de engine en migratie `0041` dwingt hem af. Wat er bewust nog níét is: uitwaaieren
per engine in de planning. `computeAggregates`, `measurementIsUsable` en
`countOpenPeriodicMeasurements` tellen alle runs van een periode ongeacht engine. Nu per engine
inplannen zou elke vraag dubbel laten meetellen in de score. Het stappenplan staat in
`lib/jobs/queue.ts`, bij de plek waar het moet gebeuren.

**`dedupe` verhuisde naar een eigen module zonder `server-only`.** Die sleutels bepalen of werk
dubbel wordt ingepland; één tekenverschil is het verschil tussen een genegeerde dubbele taak en een
tweede betaalde web-zoekactie per vraag. Ze waren onbereikbaar voor de unittests, en dat viel pas op
toen de engine erbij kwam. Precies conventie 2, twaalf migraties te laat toegepast.

**Aanvulling, later op 3 augustus.** De tweede helft van de ronde: de
LLM-kennisbasislijn met een oordeel dat in code wordt geveld en niet door het
model (`baseline-verdict.ts`. Het model vragen of zijn eigen antwoord klopt is
de meting aan de gemetene vragen), de strategiekaart met contextfactoren die
elk een gevolg in code hebben, en `field-merge.ts`, dat "een mens wint van een
model" afdwingbaar maakt. Dat laatste is wat "onderzoek opnieuw" van een
gevaarlijke knop in een bruikbare verandert.

Eén bevinding onderweg die het noteren waard is: `dedupe` stond in een
`server-only`-module en was daardoor onbereikbaar voor de unittests, twaalf
migraties lang, want conventie 2 bestaat sinds ronde één. Het viel pas op toen
de engine in de sleutel moest en juist die sleutel getoetst wilde worden. Eén
tekenverschil daar is het verschil tussen een genegeerde dubbele taak en een
tweede betaalde web-zoekactie per vraag.

En na de RLS-verbreding meldde de Supabase-linter dat `is_staff()` aanroepbaar
was door `anon`. Onschadelijk, `auth.uid()` is dan null, dus altijd `false`,
maar migratie `0042` zet hem dicht, samen met een `to authenticated` op de 26
stafpolicies. Die twee horen in één migratie: los toegepast levert het intrekken
van de EXECUTE-rechten een "permission denied" op waar nul rijen hoort te staan.


### 3 augustus 2026, de eerste echte onboarding, en wat hij liet zien

Onboarding 2.0 ging naar `main` en draaide daarna één keer volledig op productie:
Fysi-Unique, een fysiotherapiepraktijk in Amersfoort. **7,5 minuut van invoer tot
afgerond dossier, $0,24 van de $2,15.** De keten liep zonder één mislukte taak,
`profile_discover` → `technical_audit` → `profile_research` → `profile_offering` →
`propose_topics` → `profile_market` → `profile_llm_baseline` → `profile_synthesis`.

Wat er goed uit kwam, en waarom het de bouwronde rechtvaardigt: 30 pagina's
gecrawld (was: één homepage van 6000 tekens), een aanbodboom van 20 knopen mét de
tarieven van de tarievenpagina, intake € 59,00, manuele therapie € 57,50,
jaarabonnement medische fitness € 370,00, en met diensten die alleen op diepe
pagina's staan (seksuologie, loopanalyse, inloopspreekuur). Het oude onderzoek zag
daar niets van. Acht core topics, acht concurrenten met onderbouwing, zestien
technische controles waaronder de vier entiteitschecks.

**En zes fouten die geen enkele test had kunnen vangen, want ze zaten er alle zes
tússen.** Conventie 10, opnieuw bevestigd: gebouwd is niet geverifieerd.

1. **De kennistest gaf een vals positief, en dat is de ernstigste die er is.**
   ChatGPT antwoordde twee keer letterlijk *"zonder plaatsnaam of website kan ik
   niet met zekerheid zeggen welke organisatie je bedoelt"*. `admitsUnknown()`
   kende die formulering niet, dus `knowsBrand()` gaf `true`, enkel omdat de
   merknaam in het antwoord stond, en die stond er omdat hij in de **vraag** stond.
   Het `llm_kennis`-facet kwam daardoor uit op "ChatGPT kent Fysi-Unique", en de
   synthese schreef dat over als *"ChatGPT kent het bedrijf al"*. Precies het
   cijfer waar een ondernemer op afgaat, precies de verkeerde kant op.

   *Correctie van 4 augustus:* hier stond eerst dat het **profielscherm** het
   meldde. Dat klopte niet. Het paneel dat die regel toont werd op dat moment
   helemaal niet gerenderd (zie de notitie van 4 augustus hieronder); de onjuiste
   bewering bereikte de klant via de synthesetekst, die wél op het scherm staat.
2. **De 19 gecontroleerde "feiten" waren 17 paginatitels en 2× de merknaam.** De
   `WebPage`-opmaak levert per pagina een `name` op ("Tarieven | Fysi-Unique"), en
   die gingen ongefilterd de controle in. `checkableFacts()` gooit nu
   paginaniveau-opmaak en de merknaam zelf eruit. Bij deze site blijft er dan nul
   over, en dat is het eerlijke antwoord: er staat geen adres, telefoonnummer of
   oprichtingsjaar in de opmaak.
3. **`service_scope`, `service_regions` en `market_language` bleven leeg.** De
   oude wizard vroeg ze aan de klant; de nieuwe onboarding van drie velden doet dat
   niet meer, en het onderzoek leverde ze nooit. Gevolg: `prompts.ts` zet de regel
   "dit is een LOKAAL bedrijf, verwerk de plaatsnaam" alleen neer als bereik én
   regio gevuld zijn, dus een praktijk in Amersfoort had zich gemeten tegen de
   landelijke markt. De kennistest vroeg dan ook "aanbieders van
   sportfysiotherapie **in Nederland**" in plaats van in Amersfoort. Nu in het
   onderzoeksschema, met `'onbekend'` als eerste enum-waarde, structured output
   kiest bij twijfel de eerste, dus die hoort de eerlijkste te zijn, en met
   `resolveScope()` als vangnet: 'lokaal' zonder regio wordt `null`.
4. **Alle acht topics hadden een lege `offering_ids`.** De aanbodlijst in de prompt
   toont elke knoop als "Ouder › Kind" en vraagt de namen letterlijk over te nemen;
   het model deed dat, de koppeling zocht alleen op `o.name`. Acht onderbouwingen
   die op het scherm nergens naar terug te klikken zijn.
5. **`profile_field_sources` bleef leeg, dus de bescherming was inert.** Alleen de
   strategieroute schreef herkomst, en dan nog alleen voor aliassen en werkgebied
   uit de contextfactoren. `PATCH /api/profiles/[id]`, de gewone manier waarop
   iemand een profiel corrigeert, zette `edited_by_user = true` en verder niets.
   `filterProtectedFields()` kon dus nooit iets blokkeren en "onderzoek opnieuw"
   zou elke correctie stil overschrijven: exact het scenario waarvoor migratie
   `0039` gemaakt is.
6. **Twintig grijze "niet vastgesteld"-chips naast een goed onderbouwde
   aanbodboom.** `confidence` stond hard op `null`. Nu deterministisch, dezelfde
   regel als in `synthesis.ts` en verhuisd naar één gedeelde module
   (`quote-check.ts`): staat het citaat letterlijk op de pagina waar de knoop naar
   verwijst, dan is het 1,00. Anders 0,50. Alleen het twijfelgeval valt nog op,
   en dat is wat die chip hoort te doen.

**De hermeting op de gerepareerde code, diezelfde avond.** Tweede schone
onboarding van dezelfde site: **$0,2463**, alle acht taken groen. Vier van de zes
reparaties tekenden zichzelf af, `service_scope = lokaal`, `service_regions =
["Amersfoort"]`, `market_language = "Nederland, Nederlands"`; 22 aanbodknopen
allemaal op `confidence 1.00` (elk citaat letterlijk teruggevonden, dus nul grijze
chips); acht topics met 2–4 aanbodkoppelingen elk in plaats van nul; en de
categorievragen van de kennistest vroegen nu "aanbieders van fysiotherapie **in
Amersfoort**" in plaats van "in Nederland", met FitForum, SMC Amersfoort en
Praktijk Boshuijzen als antwoord.

**En de kennistest liet zien dat reparatie 1 te ver ging.** Met het werkgebied in
de vraag antwoordde het model wél raak, *"Fysi-Unique in Amersfoort is een
fysiotherapiepraktijk (…) Ik kan zonder actuele website-informatie niet met
zekerheid zeggen welke specialisaties zij momenteel aanbieden"*, en dát werd nu
als "kent het merk niet" gemeld. Vals negatief, waar het eerst vals positief was.
De oorzaak: de reparatie nam naast de identiteitszinnen ook losse hedges mee
("niet met zekerheid", "ik weet niet zeker"), en die slaan net zo vaak op een
detail als op het merk.

De grens ligt bij **identiteit**: "ik weet niet wélk bedrijf je bedoelt" is het
tegendeel van kennen; "ik weet de openingstijden niet" is een detail dat
`checkFacts()` afhandelt. De losse hedges zijn eruit, de vier antwoorden uit beide
meetronden staan als testgevallen in `test-unit.ts`, twee die wél en twee die
niet als onbekend mogen tellen. Zonder die tweede ronde was de overcorrectie pas
opgevallen bij een klant die wél bekend is.

De kostenverdeling verraste: `profile_synthesis` is met $0,127 (52%) de duurste
stap, niet de web-zoekacties. Dat is het Sol-model achter `SYNTHESIS_PREMIUM`.
De drie categorievragen van de kennistest samen $0,044; de rest valt in het niet.
Het budget van $2,15 is geen knellende grens. Er is ruimte voor een tweede engine
zonder aan de plafonds te komen.

### 4 augustus 2026, vijf verbeteringen die uit de meetronden zelf kwamen

Niet uit een plan, maar uit wat twee volledige onboardings op productie lieten
zien. Alle vijf kosten vrijwel niets extra aan API-calls; samen brengen ze de
ronde van **$0,2463 naar naar schatting ~$0,247**.

**1. De nulmeting stelde een vraag en gaf geen antwoord.** Het profielscherm zette
boven het categorieblok de kop *"Word je genoemd bij koopvragen?"* en beantwoordde
hem nergens: `askOne()` bouwde alleen een oordeel voor het blok `kent`, en de drie
categorie-antwoorden belandden als ruwe tekst in een uitklapper. Dat terwijl dit
blok **$0,044 van de $0,2463 kost, 18%, de op één na duurste post** van de hele
onboarding, en het precies het cijfer is waar een ondernemer op wacht.

`scoreCategoryAnswer()` beantwoordt hem nu deterministisch met `textContainsName()`
, dezelfde functie die de betaalde meting gebruikt, en om dezelfde reden: de
LLM-beoordeling van `mentioned` gaf daar soms `true` terwijl het merk nergens in
het antwoord stond. Nul kosten. Erbij: welke bekende concurrenten wél genoemd
worden, want *"deze drie kwamen boven, jij niet"* zegt meer dan een nul.

Dat vroeg wel om `cleanCompetitorName()`. `profiles.competitors` is een mengsel:
`market.ts` schrijft er kale namen in, maar `prepare-profile.ts`. Die eerder
draait, zet er de hele onderbouwing in die het onderzoek teruggaf, inclusief
markdown-link. Zo'n regel als naam door een tekstcontrole halen levert altijd
`false` op.

**2. "Kent hij je merk" hing aan één formulering.** Ronde 1 vroeg *"Wat weet je over
Fysi-Unique?"* → het model kon de naam aan geen enkele organisatie koppelen.
Ronde 2 vroeg *"Wat weet je over Fysi-Unique úít Amersfoort?"* → een correcte
omschrijving. Twee woorden verschil, en het was de kopregel van het profielscherm
die omsloeg.

Het blok kostte **$0,0003 voor twee vragen**. Nu zes formuleringen voor ~$0,001,
mét en zónder plaatsnaam, en een verhouding in plaats van een ja of nee. Geen
verzonnen drempel: 0 van de 6 is "kent je niet", 6 van de 6 is "kent je", alles
daartussen is "wisselend", wat het dan ook echt is. Dat verschil is zelf een
bevinding: een merk dat alleen mét plaatsnaam herkend wordt, is niet als entiteit
bekend maar als woordcombinatie.

**3. De koopvragen gingen over de generiekste diensten.** `slice(0, 3)` op
`sort_order`, en die volgorde komt van de site: fysiotherapie, manuele therapie,
sportfysiotherapie, de drie waar élke praktijk op concurreert. Terwijl het
marktonderzoek van dezelfde ronde schreef dat *"vooral de combinatie van
bekkenfysiotherapie, zwangerschapsbegeleiding en seksuologie"* deze praktijk
onderscheidt. Die drie zijn nooit gevraagd; de nulmeting mat de klant op zijn
zwakste punt. `categoryLeaves()` kiest ze nu via de topics, die de boom al op
commerciële relevantie gewogen hebben, en die sinds 3 augustus ook daadwerkelijk
naar de aanbodknopen wijzen.

**4. Feiten kwamen alleen uit JSON-LD.** Na filtering bleven er **nul**
controleerbare feiten over voor Fysi-Unique: de site zet wel `Organization` in
zijn opmaak, maar zonder adres, telefoonnummer of oprichtingsjaar. Het blok "klopt
wat ChatGPT zegt?" had dus niets. Terwijl het `citeert`-antwoord van diezelfde
meting ze letterlijk noemde, *"Henry Dunantstraat 32, 3822 XE"* en *"(033) 455 89
45"*, van de contactpagina die wij zelf gecrawld hadden. Voor het merendeel van
het MKB is dat de normale situatie.

`text-facts.ts` oogst telefoon, adres, e-mail en KvK met reguliere expressies, en
met twee beperkingen die vals alarm voorkomen: alleen canonieke pagina's
(homepage, contact, over-ons) en per soort alleen de waarde die op de meeste
daarvan staat. Bij een gelijkspel: niets. Een verkeerd feit zou ChatGPT's júíste
antwoord als `tegengesproken` markeren, en dat is de melding waar een ondernemer
van schrikt.

**5. Topics verloren hun aanbod bij "onderzoek opnieuw".** De herhaalroute
verwijdert de AI-knopen (moet wel. Anders slaat `buildOfferingTree()` zichzelf
over) en laat de topics staan. `offering_ids` is een `uuid[]` en kan dus geen
foreign key hebben: na één herhaalronde wijst élke koppeling naar een verwijderde
rij. Stil, want er valt niets om. Migratie `0043` zet de namen ernaast; die
overleven een herbouw, en `relinkOfferingIds()` legt de koppeling terug, inclusief
de knopen met bron `klant`, die de herhaalronde laat staan.

Tests: **608 unittests, 42 ketentests.** De ketentest zet de twee stappen achter
elkaar (verwijderen, herbouwen) en controleert dat er ná afloop geen enkele
koppeling meer naar een verdwenen knoop wijst. Precies de samenhang die geen
unittest kan zien.

### 4 augustus 2026, drie panelen die nooit op het scherm stonden

Gevonden bij het bouwen van optimalisatie 1, toen bleek dat het aanbodpaneel
nergens een dekkingschip kon krijgen: **`OfferingsPanel`, `LlmKnowledgePanel` en
`StrategyBox` stonden wél in de imports van `app/(app)/profielen/[id]/page.tsx`
en hun data werd wél opgehaald, maar geen van de drie stond in de render.**

Dat betekent dat de hele opbrengst van blok B, C en D onzichtbaar was: de
aanbodboom van 22 knopen mét tarieven, de kennistest over vijf blokken, en de
strategiekaart met contextfactoren. Het profielscherm toonde alleen de
synthesetekst die er achteraf overheen geschreven was. Alles wat ik in de twee
meetronden van 3 augustus in de database heb nagerekend, klopte, en niets ervan
was voor een klant te zien.

Twee dingen om te onthouden. Ten eerste: `tsc` en `build` waren de hele tijd
schoon. Een ongebruikte import is geen fout, en een component die nergens wordt
aangeroepen compileert prima. Conventie 10 gaat dus ook over de UI, en "de
component bestaat" is geen verificatie.

Ten tweede, en vervelender: dit is de **tweede keer** in dit traject. Op 3
augustus stonden `staleAdviceNotice`, `confidenceLevel` en `describeMerge` in
dezelfde toestand, gebouwd, getest, nergens aangesloten. Toen was de conclusie
"drie dingen die ik te vroeg had afgevinkt". Nu is het een patroon, en het
patroon heeft een oorzaak: er is geen enkele controle die zegt of een geëxporteerd
paneel ook daadwerkelijk in een pagina terechtkomt.

Daarom is bij deze ronde één regel in de verificatie erbij gekomen: **een paneel
telt pas als af wanneer het op de gedeployde pagina is teruggezien**, niet
wanneer het compileert.

### 4 augustus 2026, de vier InSpace-optimalisaties

Uit de analyse van hoe InSpace Nova werkt (`docs/tasks/inspace-optimalisaties-1-4.md`).
**Nul extra API-kosten en geen nieuwe migratie**: alle vier draaien op data die er
al ligt.

**1. Structurele gap-analyse.** Onze aanbevelingen kwamen uit gemiste vragen: 30
vragen gesteld, bij 17 niet genoemd, daar volgen pagina's uit. Dat is reactief, en
de blinde vlek werd pas zichtbaar met de aanbodboom. Levert een klant twaalf
diensten en raakt de meting er toevallig vier, dan hoort hij over acht diensten
niets, ook al heeft hij er geen pagina voor. En dát is juist de reden dat een
assistent hem daar niet kan noemen.

`structure-gap.ts` vergelijkt `profile_offerings` met `profile_pages` en geeft per
onderdeel `eigen_pagina`, `zwak_gedekt` of `ontbreekt`. Drie standen en geen twee,
omdat het verschil het advies stuurt: zwak gedekt wordt *verbeteren*, ontbreekt
wordt *nieuw*. De matching hergebruikt `page-relevance.ts`, een tweede algoritme
zou twee plekken opleveren die het oneens kunnen worden over dezelfde vraag.

Het vangnet: een categorie die zelf kinderen heeft telt niet mee, anders adviseert
de app vijf pagina's waar er één hoort. En `kind: "merk"` valt er helemaal buiten;
een retailer hoeft geen pagina per gevoerd merk. Geen opslag: de uitkomst
verandert zodra er een pagina bijkomt, en een kopie zou een vierde plek zijn die
kan verouderen. Landt in de rapportinvoer. Daar maakt het verschil, en als chip
per knoop in het aanbodpaneel.

**2. Rijkere schema.org en een zichtbare datum.** `schema-jsonld.ts` kende drie
uitkomsten: `FAQPage`, `WebPage`, `Article`. Dat was een gat in ons eigen verhaal:
sinds de entiteitscontrole beoordelen wíj de klant op schemadekking, terwijl onze
eigen pagina's het bij een kaal `WebPage` lieten. Nu volgt het `@type` het
bedrijfsmodel (een landingspagina van een dienstverlener is een `Service`, van een
retailer een `CollectionPage`), komt er een `@graph` met de organisatie erachter
inclusief de `sameAs` die fase 0 al geoogst had, en staan `datePublished` en
`dateModified` erin.

Twee dingen die anders stil misgaan. De validatie accepteerde alles met een
`@context` en een `@type`. Dus ook een `Recipe` op een dienstenpagina; nu moet
het type passen. En onze eigen velden gaan er **altijd** overheen, ook bij een
geldig modelresultaat: een `datePublished` van een jaar geleden op een pagina die
vanmorgen geschreven is, is een versheidssignaal dat tegen de klant werkt.
`withFreshnessLine()` zet de datum ook zichtbaar onder de tekst, want een assistent
citeert uit de lopende tekst en niet uit de JSON-LD. De functie is idempotent, omdat
`content_revise` over bestaande tekst heen draait.

**3 en 4. Duplicatie en leesbaarheid, in een tweede poort.** Het ontwerpprobleem
eerst: `geo_score` wordt berekend uit `checkContentGate()`, dus er twee checks bij
zetten maakt de score van vorige maand onvergelijkbaar met die van vandaag,
terwijl de app juist trends toont. Vandaar `checkQuality()` ernaast: voedt
`review_notes` en `needs_review`, raakt `geo_score` niet aan. Een unittest legt
vast dat die functie geen score teruggeeft waarmee hij erin zou kunnen lekken.

Duplicatie is een echt risico en geen theorie: wij schrijven tot tien pagina's per
merk uit dezelfde feitenkaart, met dezelfde stijlvoorbeelden en dezelfde
merkregels. `similarity.ts` gebruikt Jaccard op woord-**vijf**-grammen, want twee
dienstenpagina's van dezelfde praktijk delen onvermijdelijk hun vakjargon maar
niet hun zinsbouw. Drempel 0,35, bewust ruim, en de gemeten waarde wordt altijd
gelogd zodat hij na tien echte pagina's op data bijgesteld kan worden in plaats van
op gevoel. De vergelijking gaat over álle huidige pagina's van het **profiel**,
niet van één analyse: een merk heeft meerdere analyses en die putten uit dezelfde
feiten.

Leesbaarheid zonder verzonnen Flesch-score. Een getal van 0 tot 100 op Nederlandse
tekst suggereert een precisie die de formule niet heeft, en niemand weet wat 58
betekent, hetzelfde patroon als het verzonnen volumegetal dat migratie `0017`
verving door drie banden. In plaats daarvan vier gemeten grootheden en een
verbeterpunt dat een **aantal** noemt: *"5 zinnen zijn langer dan 30 woorden, knip
ze in tweeën."* Dat kan iemand aanpakken.

Tests: **658 unittests, 42 ketentests.** De ketentest ving onderweg nog iets:
`loadSiblingPages` gebruikte eerst een ingebedde join (`analyses!inner`), en de
shim weigert die met opzet in plaats van iets plausibels terug te geven. Twee
losse queries doen hetzelfde en lezen beter.

**Verificatie van 4 augustus, derde meetronde.** Volledige onboarding op de
gerepareerde code: **$0,2495, zestien AI-aanroepen, acht taken groen.** Wat de
ronde afdekte:

| Wat | Uitkomst |
|---|---|
| Kennistest, zes formuleringen | 6 van de 6 herkend → "kent je merk (6 van de 6)". Geen muntworp meer. |
| Nulmeting | *"genoemd bij 1 van de 3 koopvragen"*. Het getal dat er eerst niet was |
| Wie wél genoemd wordt | SMC Amersfoort, FysioAmersfoort, FyZie, Fysio Atelier, FitForum |
| Koopvragen uit de topics | knie-, nek- en schouderklachten in plaats van de drie generiekste diensten |
| `offering_names` | gevuld naast `offering_ids`, dus de koppeling overleeft een herbouw |

En de tekstfeiten hadden een tweede ronde nodig. De eerste versie vond alléén het
e-mailadres, met drie oorzaken die pas op echte tekst zichtbaar werden:
`crawlPages` bewaart 1500 tekens per pagina en de contactpagina begint met een
navigatiemenu van ruim duizend, dus het telefoonnummer viel buiten beeld. Het
oogsten verhuisde naar de crawler, waar de volledige tekst nog beschikbaar is.
Het telefoonpatroon kende geen haakjes, en "(033) 455 89 45" brak af na drie
cijfers. En het adrespatroon stond de komma alleen vóór de postcode, terwijl deze
site "Henry Dunantstraat 32 3822 XE, **Amersfoort**" schrijft.

Na die reparatie komt er `(033) 455 89 45` en `Henry Dunantstraat 32 3822 XE,
Amersfoort` uit, nagerekend op productie met een gratis herhaling van fase 0.
Het testgeval in `test-unit.ts` is nu letterlijk de voettekst van de site en geen
nette variant ervan; twee tekens verschil was het verschil tussen drie feiten en
één.

### 4 augustus 2026, UX-ronde op de onboarding

Tien bevindingen uit een doorloop van het onboardingscherm tegen
`docs/ux-design.md` en de strategie van InSpace Nova. Alle tien uitgevoerd; geen
migratie, geen API-kosten.

**De profielpagina had geen kop.** Twaalf kaarten, geen `PageHeader`, geen `<h1>`,
en de merknaam pas op ~plek 9 als een regel binnenín de editor. Dit is het scherm
dat de consultant deelt in de demo. Het opende zonder te zeggen over wie het
ging. `/profielen` gebruikte de gedeelde kop wél; de detailpagina was de
uitzondering, en dat is waar drift begint.

**Er was geen hoofdgetal**, terwijl regel 1 van `ux-design.md` dat voorschrijft.
De drie cijfers die ervoor in aanmerking komen, herkenning (6/6), genoemd bij
koopvragen (1/3), diensten zonder eigen pagina (2 van 12), stonden als chip
verspreid over drie panelen. Nu een statrij in de kop, gerekend in
`onboarding-summary.ts`. Met een duidingszin erboven, en die is geen versiering:
"0/3" zonder uitleg leest als een cijfer op een rapport, terwijl het voor vrijwel
elk MKB-merk de normale startsituatie is. Een tegenspraak wint van alles. Dat
is de alarmerendste uitkomst die de onboarding kan opleveren.

**De volgorde was niet die van het gesprek.** `ProfileGaps`. Het huiswerk voor de
klant, stond op plek 3, vóór de kennistest en het aanbod. Dat is de inspanning
vóór de waarde, precies omgekeerd aan bijlage A9. En `AssignBox` stond op plek 4:
een beheerdersactie tussen de bevindingen, op een scherm waar de klant meekijkt
naar de knop waarmee hij wordt overgedragen. Nu vijf blokken in de volgorde van de
demo, met beheer onderaan.

**Zeven panelen verdwenen stil bij lege data** (`return null`). Bij een dunne
crawl, Bol had één pagina, en dat is geen randgeval, zag de klant een half
scherm en wist niet dát er een aanbodanalyse en een kennistest bestonden. Drie
van de zeven hebben nu een lege staat met de reden erbij en de knop die hem
oplost; de andere vier zijn terecht (een strip die niets te melden heeft hoort
weg te zijn).

**Mobiel was niet apart ontworpen.** Over alle panelen samen twee responsive
classes, terwijl §7 letterlijk zegt dat mobiel geen verkleinde desktop is en voor
dichte detailschermen accordion-dicht voorschrijft. Het profielscherm is inmiddels
dichter dan het conceptscherm, dat in datzelfde document als toetssteen geldt.
`ProfileSection` klapt nu in op mobiel, en start bewust open, zodat een blok niet
dichtklapt omdat de bundel nog niet geladen is.

**De aanbodboom stond volledig uitgeklapt**: 22 knopen × vier regels is twee tot
drie schermen scrollen midden in een demo, terwijl de interessante regels juist de
knopen met een dekkingsgat zijn. Nu één scanbare regel per knoop met de details in
een native `<details>`. Geen client-state, want dit paneel is een servercomponent.

**Het wachten was twee ervaringen achter elkaar**: een generiek scherm van een
minuut, dan een stappenlijst. De stappen zaten al ín de status-payload en werden
in het eerste scherm niet gebruikt. En het afrondingsmoment. Het beste moment
van de hele flow, ging ongemarkeerd voorbij: de strip verdween en de panelen
ploften erin. Nu één doorlopende lijst plus een expliciete afronding, alleen voor
wie het heeft zien lopen.

**Twee van de vier `ProfileGaps` waren achterhaald** door de verbeteringen van
dezelfde week: werkgebied en concurrenten worden nu door het onderzoek zelf
gevuld. Eruit, en vervangen door twee die wél uit de nieuwe data volgen, 'lokaal'
zonder plaatsnaam (`resolveScope()` zet dat bewust op null in plaats van te
gokken) en een ontbrekend bedrijfsmodel.

**Er was geen volgende stap.** Nu één primaire actie in de kop, met de titel van
het hoogst geprioriteerde onderwerp erin: *Meet "Knieklachten behandelen"* zegt
meer dan "start een analyse".

**En de strategiekaart is bewust nauwelijks aangeraakt.** Hij stond acht blokken
naar beneden terwijl de consultant er tijdens het uur consultancy in typt; hij is
nu bereikbaar via een springlink in de kop. Het formulier zelf herontwerpen zou
gokwerk zijn zolang er nog geen echt gesprek mee gevoerd is. Dat wachten we af.

Tests: **675 unittests, 42 ketentests.** De rekenkant van de kop staat in een
pure module met de stand van de derde meetronde als testgeval.

### 4 augustus 2026, archiveren in plaats van verwijderen

De eigenaar wilde met een schone lei beginnen: de zeven testmerken en elf
analyses uit beeld, maar wél bewaard. Migratie `0044` zet `archived_at` op
`profiles` en `analyses`.

**Waarom geen `delete`.** `on delete cascade` hangt aan vrijwel alles,
`analyses` → `prompts` → `tracking_runs` → `tracking_run_mentions`, plus
rapporten en contentpagina's. Eén `delete from profiles` had **352 metingen en
32 contentpagina's** weggegooid, en die zijn niet te reconstrueren zonder
opnieuw te betalen. Conventie 4 geldt net zo goed voor data als voor schema.

**Het filter staat op zes plekken, en één ervan kost geld.** De merkenlijst, de
analysenlijst, de telling achter "+ Nieuwe analyse", het werkmodel, de
herinneringsmail, en `/api/cron/tracking`. Zonder dat laatste filter plant de
app elke maand een volledige meetronde in voor een merk dat niemand meer in de
app ziet staan: ~$0,40 per analyse per maand, onzichtbaar, want de uitkomst
verschijnt nergens. Dat is de duurste vorm van "verborgen maar nog actief" die
er is. `lib/archive.ts` is de ene plek die weet wat "actief" betekent; de zes
query's gebruiken hem.

**Bewust niet in RLS.** Een gearchiveerd merk hoort voor de eigenaar bereikbaar
te blijven via zijn directe URL. Het is een back-up, geen verwijdering. In de
policies zetten zou het onbereikbaar maken, en dat is het tegenovergestelde van
wat er gevraagd werd.

De ketentest zet de twee stappen achter elkaar: archiveren, controleren dat de
onderliggende data er nog is, dat geen enkele lijst hem nog telt, dat de
meetronde hem overslaat, en dat dearchiveren werkt.

## 15. De strategie, sales-led, naar het model van InSpace Nova (3 augustus 2026)

De bouwrondes hierboven volgen allemaal uit één beslissing die zelf nergens stond opgeschreven.
Hier staat hij, met wat er wél en niet uit overgenomen is.

### Wat er veranderde

Het product was **self-serve**: wie een account maakte, vulde een wizard van vier stappen en elf
velden in en kreeg daarna een analyse. Dat is losgelaten. Het nieuwe model is **sales-led**:

1. De consultant (voorlopig de eigenaar, het enige beheeraccount) zet het merkprofiel klaar vóór
   het demogesprek. Drie velden, ~7,5 minuut pijplijn, ~$0,25.
2. Het **demogesprek** is een schermdeling waarin hij laat zien wat er gevonden is.
3. Erbij hoort **een uur consultancy**, apart gefactureerd, over de twee dingen die een model niet
   kan weten: welke onderwerpen commercieel tellen, en wat er speelt buiten de website om (een
   nieuwe site, een naamswijziging, een gestopte dienst).
4. Pas ná de verkoop wordt het profiel aan het klantaccount toegewezen.

Dat is geen cosmetische wijziging maar de reden achter vrijwel elke ontwerpkeuze sinds §14: dat de
onboarding van elf velden naar drie ging, dat de pijplijn ~$2 mág kosten, dat het profielscherm
een demo-scherm is en geen formulier, en dat er een superuser bestaat.

### Wat we van InSpace overnemen

| Wat | Hoe het bij ons landt |
|---|---|
| Sales-led met demo en een success manager | De consultant zet klaar, verkoopt en begeleidt (§14, migratie `0038`) |
| Denken in **entiteiten** in plaats van vermeldingen | De kennistest, de naamconsistentiecheck en de `sameAs`-controle vragen "kent een AI-systeem dit als één herkenbaar bedrijf?" |
| **Structuur boven schrijven**, "everyone is building AI that writes blogs" | `structure-gap.ts`: welke diensten missen een eigen pagina, los van wat de meting toevallig vroeg |
| 5–8 **core topics** door een strateeg bepaald | `propose_topics` leidt ze af uit de aanbodboom; de consultant keurt ze goed |
| Volledige schema.org-dekking en een zichtbare `dateModified` | Het `@type` volgt het bedrijfsmodel, met organisatieknoop en datums |

Drie dingen die zij als onderscheidend presenteren hadden wij al: het RAG-anker tegen hallucinatie
(`brand_facts` + de feitenkaart), guardrails vóór generatie (`content-gate.ts`,
`validate-claims.ts`) en answer-first opmaak.

### Wat we bewust NIET overnemen

- **De CMS-koppeling.** Dat is hun moeilijke deel en blijft uitgesteld. Wij leveren
  publicatieklare content; de klant plaatst hem.
- **Echte zoekvolumes.** Dat is hun SEO-verleden. Onze winbaarheidsmeting (`elicit_rate`) is voor
  dit product een beter signaal en bestaat al.
- **Hun prijs.** De onze gaat omhoog, maar blijft er ruim onder.

### Gemini: gebouwd, slapend

Besloten om een tweede engine voor te bereiden zonder dat er een sleutel is. De enginelaag
(`lib/engines/`), de adapter en. Het eigenlijke punt, de idempotentiesleutel mét engine
(migratie `0041`) staan er. Zonder `GEMINI_API_KEY` snijdt `enginesForProfile()` de wens van het
profiel met de beschikbare sleutels en blijft het gedrag ongewijzigd.

Wat er bewust **niet** is: uitwaaieren per engine in de meetplanning. `computeAggregates`,
`measurementIsUsable` en `countOpenPeriodicMeasurements` tellen alle runs van een periode ongeacht
engine; nu per engine inplannen zou elke vraag dubbel laten meetellen in de score. Het stappenplan
staat in `lib/jobs/queue.ts`, bij de plek waar het moet gebeuren.

### Accounts: handmatig, en dat is de bedoeling

Er komt geen uitnodigings-API en geen self-service registratie. De eigenaar maakt een account aan
in het Supabase-dashboard; de app heeft alleen inloggen en wachtwoordherstel nodig. Dat scheelt
half-aangemaakte gebruikers en een e-mailbezorging die de verkoop kan ophouden. De werkwijze staat
in `architecture.md` §11.

Een klant mag alles op zijn eigen profiel, inclusief zelf analyses draaien, behalve profielen van
andere klanten zien. Dat is RLS op `user_id`; de beheerder ziet alles via `staff_users`.

## 16. Documentatie weer op één lijn met de code (4 augustus 2026)

Op 1 augustus is de documentatie geherstructureerd naar progressive disclosure (`b50bdc9`). In de
drie dagen daarna gingen **21 merges** naar `main`, Onboarding 2.0, de vijf verbeterpunten uit de
eerste productieronden, de vier InSpace-optimalisaties, de UX-ronde en het archief. Geen daarvan
raakte de documentatie. Dat is precies hoe een herstructurering ongedaan wordt gemaakt: niet in één
klap, maar in twintig kleine stappen die elk voor zich te klein leken om een MD-bestand voor te
openen.

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

`docs/tasks/inspace-optimalisaties-1-4.md` is verwijderd: gebouwd, dus hij hoort in het logboek en
niet in de takenmap. `onboarding-2.0.md` blijft op dit moment nog staan, met bovenaan de reden, de
verificatietabel heeft nog drie open punten die iets vragen wat er niet is (vier profielen voor een
p95, een `GEMINI_API_KEY`, een contentronde). *(Inmiddels, na §14 hierboven, wél verwijderd: de
verificatietabel is afgerond en de bouwspec staat niet meer in de takenmap.)*

**De les, en hij is dezelfde als bij de code.** Conventie: *verandert het gedrag, werk `docs/` bij in
dezelfde commit.* Die stond er al en werd twintig keer overgeslagen omdat een merge naar `main` geen
poort heeft die ernaar vraagt. De migratie-index bleef als enige bij, en dat is geen toeval: die
heeft er wél een, `supabase/README.md` bijwerken staat in de toepasinstructie van elke migratie. Wat
de andere documenten missen is niet discipline maar zo'n haakje.

---

## 27. De app heet ORBIT ENGINE, en schrijft als Nova (5 augustus 2026)

Tot deze ronde heette het product intern én in de UI "GEO Tracker", een omschrijving, geen naam.
De schrijfstijl was op zichzelf goed (informeel, jargonvrij, eerlijk over onzekerheid) maar had geen
vastgelegde bron: elke tekst was los beoordeeld op "is dit duidelijk", nooit op "klinkt dit als ons".

**Wat er is gebeurd.** De marketingsite en het productverhaal van InSpace Nova (inspace.io) zijn
letterlijk uitgelezen en tot een stijlgids teruggebracht: `docs/schrijfstijl.md`, tien richtlijnen
met de brontekst erbij. Daarna is alle UI-copy daarlangs gelegd, schermen, knoppen, foutmeldingen,
tooltips, lege staten, statuslabels, voortgangsteksten, de twee e-mailsjablonen en de foutteksten
die de API-routes teruggeven.

**De vier veranderingen die het meeste doen:**

1. **ORBIT ENGINE is een handelend onderwerp.** Nova schrijft over zichzelf in de derde persoon, *"Nova
   learns your business first"*. Wij dus ook: "ORBIT ENGINE leest je website uit", niet "de website wordt
   uitgelezen". Dat verving tegelijk de institutionele wij-vorm ("wij meten", "wij schrijven"), die
   in een sales-led product ongemakkelijk dubbelzinnig was: bedoelden we de software of de
   consultant? Nu is dat altijd te zien.
2. **Bewijstaal boven beloftetaal.** Nova's kernclaim is *"Measured, not promised"*. Op de drie
   plekken waar de app een uitspraak doet over effect staat nu de meetlat erbij in plaats van een
   bijvoeglijk naamwoord.
3. **"mislukt" is overal "is niet gelukt" geworden**, inclusief de statuschip (`Mislukt` → `Niet
   gelukt`) en 37 API-routes. "Mislukt" is een oordeel over de gebruiker; "niet gelukt" is een
   mededeling over het systeem, en in vrijwel alle gevallen is het ook feitelijk het systeem.
4. **Het thema is begrensd.** Ruimtemetaforen mogen in de naam, in sfeer-eyebrows en in één
   afsluitende regel van een lege staat. Nooit in een knop, een validatietekst of een foutmelding.
   Nova doet dat zelf ook precies zo: de namen zijn kosmisch (Nova, ORBIT ENGINE, Stratosphere, Milky Way),
   de instructies klinisch (*"Benchmark your rivals"*, *"Crawl, speed & structure"*).

**Wat we bewust NIET overnamen.** Nova's `04 Automated publishing` en de CMS-logo's: die koppeling
hebben wij niet, dus belooft de copy hem nergens. En "volledig autonoom", ORBIT ENGINE vraagt bewust om
goedkeuring vóór de meting en vóór publicatie, dus daar staat "ORBIT ENGINE doet het werk, jij zet de knopen
door".

**De code is niet aangeraakt.** Alleen tekstuele content: geen props, geen routes, geen
variabelenamen, geen JSX-structuur. `lib/crawler.ts` houdt zijn `USER_AGENT` (`GEO-Tracker-Bot/1.0`).
Dat is een functionele identificatie waarop site-eigenaren hun robots.txt kunnen hebben
afgestemd, en hernoemen is daar een gedragswijziging, geen copywijziging.

Vier controles groen: `tsc --noEmit`, 675 unittests, 47 ketentests, productiebuild.

---

## 28. Twee leestekens eruit, want ze verraden de schrijver (5 augustus 2026)

Direct na de ORBIT ENGINE-ronde hierboven kwam de scherpste correctie van dit traject, en hij ging niet
over inhoud maar over interpunctie: **het gedachtestreepje en de schuine streep zijn eruit.**

**De reden is commercieel, niet esthetisch.** Een lezer herkent AI-tekst tegenwoordig aan twee
tekens: het kastlijntje (`—`) waar een komma of een punt hoort, en de schuine streep in "en/of" of
"product/dienst". Voor een product dat content schrijft die de klant onder zijn eigen naam
publiceert, is dat geen stijlkwestie maar een productfout. De pagina die ORBIT ENGINE oplevert moet
overkomen als geschreven door het bedrijf zelf.

**Waar het overal zat.** 2.055 plekken, verdeeld over vier lagen die elk een ander gewicht hebben:

| Laag | Aantal | Waarom het telt |
|---|---|---|
| Zichtbare UI-copy | 267 | De klant leest dit |
| AI-promptteksten in `lib/pipeline/` | 130 | **Het model neemt de stijl over in wat het schrijft** |
| Code-commentaar | 1.278 | Het is de schrijfstijl van het project |
| Documentatie (`.md`) | 526 | Idem, en dit wordt gedeeld |

**De belangrijkste laag is de tweede,** en die was bij het opstellen van de opdracht niet in beeld.
Een schrijfprompt met kastlijntjes erin levert content mét kastlijntjes op: de stijl lekt via het
model het product uit, naar precies de pagina's waar het het meest zichtbaar is. Vandaar dat
`lib/pipeline/content.ts` er een negende schrijfregel bij kreeg, naast de acht bestaande regels over
citeerbaarheid: geen gedachtestreepjes, geen schuine streep tussen woorden, splits de zin of gebruik
een komma of dubbele punt. Conventie 1 van dit project blijft gelden (een promptinstructie is een
intentie), maar hier is het vangnet de menselijke eindredactie in de bibliotheek, niet een
codecontrole: een kastlijntje is geen fout die je automatisch mag wegpoetsen zonder de zin te lezen.

**Drie dingen blijven staan, alle drie functioneel:**

1. `publish-check.ts` en `baseline-verdict.ts` bevatten regexes die kastlijntjes juist herkennen en
   normaliseren in binnenkomende tekst. Die weghalen zou gedrag veranderen.
2. Regel 9 van de schrijfprompt moet het teken bij naam noemen om het te kunnen verbieden.
3. Vier testfixtures simuleren externe invoer, waaronder `sanitizeForPostgres("België — €19,90")`,
   die expliciet toetst dát een kastlijntje uit klantdata bewaard blijft.

**Wat de omzetting leerde.** Een blinde vervanging van `—` door `,` levert slecht Nederlands op. In
ongeveer een derde van de gevallen hoorde er een punt te staan, in een zesde een dubbele punt, en op
de definitielijsten (`` `nu` — er wordt iets van de klant verwacht``) altijd een dubbele punt. De
aanpak werd daarom: een regel die de vorm herkent, daarna met de hand langs elke zin die daarna nog
krom liep. Ongeveer zestig zinnen zijn opnieuw geformuleerd in plaats van omgezet.

Richtlijn 10 in `docs/schrijfstijl.md` legt de regel vast, met de drie uitzonderingen en twee
`grep`-commando's om vóór een commit te controleren.

Vier controles groen: `tsc --noEmit`, 675 unittests, 47 ketentests, productiebuild.

## 29. Een kleur heeft een betekenis, geen naam (6 augustus 2026)

**Aanleiding.** De ontleding van de Nova-app (`tasks/nova-analyse.md`) leverde één vondst op die
niets met functies te maken had: hun designtokens heten naar **betekenis**, niet naar kleur.
`--ds-background-intelligence`, `growth`, `information`, `warning`, `danger`. Elk met een eigen
randkleur, een eigen tekstkleur, en een `foreground-on-{betekenis}` die vastlegt welke tekstkleur op
dat vlak mag. De grafiekkleuren wijzen naar diezelfde tokens, inclusief de as en het raster.

**Wat de opruiming blootlegde.** De drift die §3 van `ux-design.md` beschrijft als opgeruimd, was
volledig teruggegroeid: **13 hardgecodeerde hexwaarden en 22 losse `rgba()`-waarden** over de
componenten. Vier van die kleuren kwamen in geen enkel token voor, drie concurrentkleuren in
`trend-chart.tsx` (`#eb6834`, `#1baf7a`, `#2a78d6`) en een vierde paars in `offsite-panel.tsx`. Vijf
componenten bouwden `.chip-danger`, `.chip-warning`, `.chip-success` en `.chip-neutral` met de hand
na, terwijl die klassen al bestonden. De vorige opruiming telde 30 inline-stijlen over 17 bestanden;
deze telde er 35. Het groeit dus terug op precies dezelfde snelheid, en dat is de eigenlijke les:
een regel zonder controle is een voornemen.

**Twee kleuren bleken fout, niet alleen inconsistent.**

1. `--status-info` was `#8511d9`, exact de merkkleur. Een mededeling was daarmee niet te
   onderscheiden van een merkactie. Nu blauw (`#0069a8`), zoals Nova het splitst in `intelligence`
   en `information`.
2. `--status-warning` was `#b9a27a`, een gedempt brons. Bij Nova is dat de kleur voor *premium*, en
   als tekst op wit haalt het **2,1:1**, ruim onder de drempel van 4,5. Het stond op drie plekken
   als tekstkleur van een waarschuwing. De chips gebruikten allang hun eigen amber (`#8a6100`,
   ruim boven de drempel); die amber is nu de waarheid.

**Wat er staat.** Vijf velden per betekenis (`-solid`, `-on-solid`, `-text`, `-surface`, `-border`),
grafiektokens inclusief `--chart-axis`, `--chart-grid` en `--chart-reference`, randdiktes als
schaal, één schaduwstand, en één doorschijnende paginakleur voor de sticky balken. Die laatste stond
op drie plekken los, met 0,8 en 0,85 door elkaar, op mobiel pal boven elkaar.

**Wat we bewust niet overnamen:** `attention` (roze) en `premium` (brons), want niets in ORBIT ENGINE
betekent dat; de licht- en donkerparen, want er is bewust geen donkere modus; hun negen radii, want
vier volstaan; en hun hexwaarden, want dan wordt ORBIT ENGINE visueel een InSpace-product. De systematiek is
van hen, de kleuren blijven van ons.

**Het vangnet.** Regel 7 in `ux-design.md` met twee `grep`-commando's die vóór een commit nul regels
moeten geven. Zelfde patroon als richtlijn 10 over de gedachtestreepjes (§28): de regel staat in het
document, de controle dwingt hem af. Zonder die tweede helft was dit de derde keer geweest.

Beide controles geven nul. Vier controles groen: `tsc --noEmit`, 675 unittests, 47 ketentests,
productiebuild.

## 30. De vormgeving over op het product van InSpace, niet op hun website (6 augustus 2026)

**De bevinding waar alles op rust.** `designsystem.md` was gebaseerd op de marketingsite
`inspace.io`. Maar InSpace draait een tweede, ingelogde omgeving, `nova.inspace.io`, en die ziet er
fundamenteel anders uit. De website is warm, rond en gloeiend; het product is koel, strak en plat.
Wij bouwden de website na. Wie Nova echt gebruikt, zou ORBIT ENGINE niet als familie herkennen.

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

**Wat er is gebeurd.** De volledige tokenset is vervangen: koele neutralen, zeven betekenissen met
elk vijf velden, zes grafiekkleuren gebonden aan die betekenissen, zes radii, drie randdiktes, één
schaduw. Knoppen van 48 naar 40 pixels, velden van grijs verzonken naar wit met een rand,
kaartpadding van 26 naar 20. Vier ambient gloed-cirkels weg, de ringgloed om de primaire knop weg,
de hover-lift weg, het lijnenraster op de body weg. De merk-gradient stond op vier accentwoorden in
koppen en staat nu alleen nog op het woordmerk.

**Eén bewuste afwijking van Nova.** Zij kennen twee paarse standen en gebruiken de lichte (`#9e21fc`)
als solide vlak. Wit daarop haalt **4,0:1** en zakt daarmee onder de drempel van 4,5 voor knoptekst;
op `#8511d9` is het 5,4:1. Bij hen is de lichte stand te verdedigen omdat dezelfde token ook in
donkere modus dienstdoet, wij hebben alleen licht. Dit kwam pas boven water door het scherm echt te
bekijken in plaats van de waarden over te nemen: de knop stond er neon bij.

**Eén bug onderweg gevonden en gerepareerd.** `--accent-purple-soft` was een lichter paars en werd op
vijf plekken als linkkleur gebruikt. In het nieuwe systeem betekent `soft` een vlaktint (`#f3e6ff`),
dus die vijf links waren wit-op-wit geworden. De token heet nu `--accent-purple-surface` en de links
wijzen naar `--intent-intelligence-text`.

**Wat bewust NIET is overgenomen:** de donkere modus (die blijft uit, maar de tokennamen zijn er nu
op ingericht, dus het is een dag werk in plaats van een week), Nova's negen radii, en hun indeling.
Zijbalknavigatie, klantkiezer en toasts zijn IA-wijzigingen, geen vormgeving; ze staan beschreven in
`tasks/nova-analyse.md` en zijn hier niet aangeraakt.

**Wat open blijft.** De zes grafiekkleuren zijn niet opnieuw gevalideerd op kleurenblindheid; de
vorige set haalde ΔE 9,2 en paars naast roze is nu het zwakste paar. Zolang dat niet is nagemeten
draagt elke lijn een naam aan het uiteinde en staat er een tabel onder. En een knop van 40px haalt de
mobiele tikdoel-eis van 44px niet, dus daar is een `.btn-lg` nodig.

**De naronde vond twee bugs die er al stonden.** Een controle op "verwijst elke `var(--...)` naar een
token dat bestaat" leverde er twee op die **nooit** hebben gewerkt: `var(--danger)` op een
foutmelding, die daardoor in gewone tekstkleur stond, en `var(--accent)` op de gevulde balk van de
briefingvoortgang, die daardoor volledig doorzichtig was. Die balk stond dus altijd op leeg, hoeveel
vragen de klant ook had beantwoord. Geen van beide viel op, want een ontbrekende CSS-variabele geeft
geen fout: hij valt stil terug op niets. Die controle staat nu als derde in `designsystem.md` §11,
naast de twee greps op hexwaarden en `rgba()`.

Diezelfde ronde bracht de paginakoppen van 30 naar 24 pixels (de KPI-cijfers blijven groot, dat is
het hoofdgetal uit `ux-design.md` regel 1), zette de uitleg-popover op de ene schaduw in plaats van
Tailwinds `shadow-lg`, en voegde `--radius-2xs` toe zodat de laatste twee losse pixelwaarden ook een
token hebben.

**Geverifieerd.** Vier controles groen: `tsc --noEmit`, 675 unittests, 47 ketentests, productiebuild.
Beide kleurcontroles geven nul. De inlogpagina is met een echte browser bekeken op 1280 bij 900; de
schermen achter de login vragen een database en zijn dus niet lokaal te renderen. Conventie 10 blijft
dus half openstaan tot iemand ingelogd door de app loopt.

## 31. De grote duidelijkheidsronde: statustaal, foutmeldingen, print, en zes andere blokken (7 augustus 2026)

Een lijst van bijna vijftig kleine en middelgrote punten, in blokken A tot en met H, uit een
vergelijking met InSpace Nova. Blok F (verkoop en klantgesprek) is bewust overgeslagen, dat hoort
niet bij de consultant-gedreven verkoopstrategie van dit product (`logbook.md` §15). De rest is in
zes commits doorgevoerd, elk met alle vier controles groen.

**A, duidelijkheid voor de klant.** De belangrijkste toevoeging is `WhoseTurn`
(`lib/analysis-status.ts`/`lib/profile-status.ts`, uitgewerkt in `ux-design.md` §4): een leesbare
laag naast de technische status, "Wacht op jou" of "ORBIT ENGINE is bezig", naar Nova's tweelaags-
statustaal. Verder: elke pagina een eigen tabbladtitel (`generateMetadata` met een titelsjabloon
dat vanaf `analyses/[id]/layout.tsx` naar alle subroutes cascadeert), server- en netwerkfouten
apart afgehandeld op drie plekken waar ze nog door elkaar liepen (`dossier-box.tsx`,
`briefing-form.tsx`, `profile-editor.tsx` toonden bij een weggevallen verbinding de rauwe
"Failed to fetch" in plaats van iets leesbaars), een "0/100" in het rapportprompt vervangen door
"onbekend" wanneer er nog geen score is (conventie 3), de goedkeuringsbalk kondigt nu aan hoeveel
vragen de meting gaat stellen vóór je bevestigt, publiceren vraagt een bevestiging omdat het twee
hermetingen in de rij zet, en optimistische updates (de tracking-schakelaar, prompt-beheer) draaien
terug bij een mislukte server-call in plaats van een staat te tonen die niet is opgeslagen.

**B, vormgeving.** Vijf ontbrekende `loading.tsx`-skeletons. `SectionErrorBoundary` om elk van de
vier hoofdstukken van het dossier: `app/error.tsx` ving al de hele pagina, maar één hoofdstuk dat
crasht op een onverwachte datavorm hoefde de andere drie niet mee te trekken. Een WCAG-
contrastberekening over alle tekst- en intent-tokens (alles haalt AA, `--text-muted` is bewust
gereserveerd voor bijzaak en al zo gedocumenteerd). Een printstijlblad (`.no-print` in
`globals.css`): het dossier IS het rapport, er is geen aparte printpagina, dus verdwijnt de chrome
(bovenbalk, hoofdstuk-rail, tabbladen, vaste actiebalken) en elke knop op papier. Een deelvoorbeeld
(`app/opengraph-image.tsx`, `next/og`): een link naar ORBIT ENGINE in Slack of e-mail toonde tot dan een
kale URL. En `.btn-lg` (44px, WCAG 2.5.5) naast de bestaande 40px-knoppen, toegepast op de vijf
knoppen die de ÉNE hoofdactie van hun scherm zijn.

**C, schermen en werkwijzen.** Migratie `0045` bracht `taboo_phrases`, `compliance_notes`, de
auteursvelden en de vier tone-of-voice-schuiven op `profiles`; deze ronde bouwde het formulier
ervoor (twee nieuwe secties in `profile-editor.tsx`, met `FORMALITY`/`ENERGY`/`COMPLEXITY`/
`HUMOR`-labels geëxporteerd uit `tone-sliders.ts` zodat de knoptekst en de promptinstructie nooit
uit elkaar kunnen lopen). De reden achter elke contentversie (`versionReasonOf()`, bestond al,
was nog nergens gekoppeld) staat nu bij de versiegeschiedenis. Een overgeslagen profielvraag
verdween voorheen stilletjes uit de lijst; `fact-requests.tsx` toont die groep nu met een
"Overgeslagen"-badge en de kans om hem alsnog te beantwoorden.

**D, vertrouwen en bewijs.** De zichtbaarheidsscore toonde een getal zonder herkomst. `StandChapter`
haalt nu op welke engines voor deze periode bevraagd zijn (uit `tracking_runs`, dat het al jaren
bijhield) en `ScoreCard` toont "Gemeten op 6 augustus via ChatGPT" naast het cijfer. `engineLabel()`
verhuisde van een lokale kopie in `llm-knowledge-panel.tsx` naar `lib/engines/label.ts`, één bron
voor beide plekken.

**E, techniek en betrouwbaarheid.** "Mijn analyses" en "Merken" sorteerden een mislukte analyse of
een mislukt merkonderzoek ergens middenin de lijst; ze staan nu bovenaan met een rode kaart, en de
sortering kijkt naar `whoseTurn === "jij"` in plaats van alleen `actionRequired`. `JobProgress`
kreeg een `attempts`-veld, zodat het wachtscherm "poging 2 van 4" kan zeggen in plaats van een
blanco belofte. En `runWorker()` logt nu wanneer `reclaim_stuck_jobs` iets terugvordert van een
kennelijk vastgelopen vorige aanroep, dat werd al geteld maar kwam nergens in de logs terecht.

**H, kleine dingen.** Drie eerder gebouwde, nog ongebruikte primitieven (`CopyButton`,
`ExternalLink`, `LastUpdated`) daadwerkelijk ingezet op vijf plekken die zelf
`navigator.clipboard` of `target="_blank"` opnieuw uittypten. En een inhoudsopgave voor lange
contentpagina's: `lib/markdown.ts` kreeg `extractHeadings()`, en `renderMarkdown()` zet sindsdien
een `id` op elke kop met hetzelfde ontdubbelalgoritme, zodat de ankers van de inhoudsopgave en de
gerenderde HTML nooit uit de pas kunnen lopen.

**Geverifieerd.** Van 706 naar 713 unittests over de zes commits heen (H voegde de kop-anker-tests
toe), 47 ketentests, `tsc --noEmit` en de productiebuild groen bij elke commit. De content-editie
hieronder volgde de dag erna, met zijn eigen 22 tests erbovenop.

## 32. De content-editie, en waarom hij niet op Nova's oude editor lijkt (8 augustus 2026)

Nova's HUIDIGE generatie heeft geen rijke contenteditor. De contentpagina daar is een read/review-
oppervlak binnen "Strategy": versiegeschiedenis, een contentvoorbeeld met diff (rood is oud, groen is
nieuw), een kopieerknop, FAQ-blokken, schema, afbeeldingsvergroting, en een gemockte search preview
(`docs/tasks/nova-analyse.md` §1.1). Een écht rijke editor, eigen werkbalk, chatassistent per pagina,
sleepbare kalender, clustervisualisatie, bestond in Nova's vóórganger-product en is bewust geschrapt
bij de herbouw. Letterlijk citaat uit de analyse: "Content Assistant, chat per pagina | Weg | Duur,
moeilijk te sturen, en het maakt de kwaliteitscontrole onbetrouwbaar" en "Handmatige editor | Weg |
Elke handmatige bewerking ondermijnt de garanties van het systeem" (§8). Conclusie van de analyse:
"Alles wat weg is, gaf de klant meer knoppen. Wat is gebleven, geeft hem meer duidelijkheid."

Die conclusie is precies conventie 1 van dit project. Dus bewust wél gebouwd: een versiediff, een
search preview, FAQ-editing (bestond nergens, ook niet via de API), een "waarom deze pagina"-
contextpaneel, en een Bewerken/Voorbeeld-toggle in `ContentEditor`. Bewust NIET gebouwd: een
chatgebaseerde AI-editing-assistent (zou `checkContentGate()`/`checkTabooWords()` omzeilen), een
sleepbare kalender, een clustervisualisatie, een WYSIWYG-rich-text-library (zou de bestaande, goed
onderbouwde keuze voor markdown-als-brontekst omkeren), multi-user samenwerking, en een verzonnen
"wint deze vraag al"-percentage per doelvraag (conventie 3: onbekend is een betere waarde dan een
verkeerde).

**Twee randgevallen die het scherpst waren.** Ten eerste: `faq_json` bewerken op een FAQ-pagina moet
`schema_jsonld` meebewegen, anders blijft de gestructureerde data die AI-crawlers lezen de oude
vraag tonen. `validateOrRebuildJsonLd()` zet FAQ-items alleen in `mainEntity` als `type === "faq"`
(niet stringmatchen op de opgeslagen JSON-LD-tekst, dat is fragieler dan het typeveld dat er al
staat). Ten tweede: een naïeve rebuild zou de organisatieknoop (`sameAs`) laten verdwijnen als je
`organization: null` meegeeft. De opbouwlogica daarvoor stond alleen inline in
`loadContentContext()`; die is nu `buildSchemaOrg()` plus `loadSchemaOrg()` in
`lib/pipeline/content.ts`, gebruikt door zowel de generatiepijplijn als de PATCH-route, zodat de
regel op precies één plek staat.

**Waarom de diff een eigen, lazy route kreeg** in plaats van `body_markdown` aan de bestaande
versiegeschiedenis-query toe te voegen: die query is al bewust smal
(`select("id, version, created_at, is_current, revision_note, edited_by_user")`) zodat één
paginaweergave niet de volle tekst van alle versies meestuurt. "Bekijk verschil" is een opt-in
handeling, de kosten (de LCS-diff over twee teksten van 800 tot 1500 woorden) vallen nu pas op het
moment dat erom gevraagd wordt.

**Geen tabbladen.** De contentdetailpagina blijft één doorlopende scroll, zoals het dossier
(`docs/ux-design.md` §5). Wat veranderde is de volgorde: context (`WhyThisPage`) → wat er nu staat
(`SearchPreview`, artikel, FAQ) → kwaliteitscontrole → bewerken → geschiedenis/vergelijken →
publiceren.

**Geverifieerd.** Vier controles groen: `tsc --noEmit`, 735 unittests (22 nieuwe: `slugFrom`/
`suggestedPath`/`resolvedContentUrl`, `diffContent` inclusief de terugval naar alineaniveau, en
`FaqEdit`), 47 ketentests, productiebuild.

---

## Vijf bevindingen uit het eerste echte doorloop op een telefoon (10 augustus 2026)

De eigenaar liep de app voor het eerst helemaal door op een iPhone, met een echte klant erin
(Van den Udenhout). Vijf bevindingen, en ze hangen samen: vier van de vijf gaan over hetzelfde
scherm, het merkdossier.

**1. De pagina was breder dan het toestel.** Niet één kapotte kaart maar één soort inhoud: strings
zonder spatie die niet mogen afbreken. ORBIT ENGINE rendert die op ~15 plekken (URL's, slugs, domeinen).
Een occasion-URL van 100 tekens is bij 14px ongeveer 840px breed en staat in een kaart die op een
telefoon 302px krijgt: 538px hangt buiten beeld. Opgelost met vier regels, van vangnet tot slot op
de deur, uitgeschreven in `docs/ux-design.md` §7. Nagemeten met Playwright op 320/390/430px:
`documentElement.scrollWidth` is nu gelijk aan de viewport, en de sticky balken blijven plakken
(dat laatste is de reden dat `overflow-x: hidden` op `html` staat en niet op `body`).

**2. De drie kerncijfers "sloegen nergens op".** Letterlijk de reactie, en terecht. Er stond
`6/6`, `2/3` en `1`. De 6 was het aantal formuleringen waarin we naar het merk vroegen, de 3 het
aantal koopvragen, en de 1 was geen verhouding maar een aantal diensten. Drie eenheden in dezelfde
vorm, geen enkele benoemd. Nu is het label een hele vraag, staat de noemer ín de waarde (`1/15`) en
legt een `explain`-veld achter een vraagteken uit wat er geteld is. Dat "koopvraag" betekent: een
vraag waar je merknaam níet in voorkomt, stond nergens, terwijl dat de hele clou is.

**3. De uitvraag zat verstopt.** Op twee plekken, allebei onder de vouw: de vragen mét invoerveld
op plek 7 binnen "Profielgegevens", de open punten op plek 5 binnen "Het gesprek". Voor de
gebruiker is dat één ding. Samengevoegd tot `OpenQuestions` op plek 3, met de teller in de kop.

**4. Niemand kon zien wanneer het onderzoek klaar was.** Dit was de scherpste van de vijf, want het
is een ontwerpfout die uit een bewuste keuze volgde: het profiel gaat op status `klaar` na taak 2
van 8, zodat de klant niet op de aanbodboom hoeft te wachten. Daardoor betekende "klaar" voor de
consultant niets, en was er geen enkel moment waarop de app zei: dit dossier is af, je kunt het
delen. Twee dingen gebouwd:

- **Broodroostermeldingen** (`components/toast.tsx`). De app kende alleen kaarten in de pagina, en
  die werken voor een uitslag maar niet voor een gebeurtenis. Vorm en timing komen uit de
  gecompileerde CSS van nova.inspace.io: 0,15s in, 0,12s uit, en een streepje dat leegloopt over de
  levensduur. Dat streepje is het detail dat het af maakt, het zegt "deze melding gaat vanzelf weg"
  zonder één woord uitleg.
- **`assessReadiness()`** (`lib/pipeline/profile-readiness.ts`), Nova's "Review & launch" toegepast:
  zes verplichte onderdelen met een stand per regel, en één zin die zegt of je het scherm kunt
  delen. De belangrijkste ontwerpkeuze zit in wat *niet* blokkeert: openstaande feitvragen tellen
  wel mee als open punt maar niet als tekortkoming. Zonder dat onderscheid staat elk profiel eeuwig
  op 90% omdat de klant drie vragen niet invulde, en dan betekent het balkje niets meer.

**5. Het merkdossier was overweldigend.** Acht blokken, alle acht altijd open, samen meters scroll.
Twee ingrepen: elk blok heeft nu een omschrijving onder de titel (Nova geeft élk blok een `title`
én een `description`, dat is het goedkoopste middel tegen "overweldigend"), en blokken zijn
gesplitst in `verhaal` (open, wat de consultant laat zien) en `naslag` (overal dicht: techniek,
profielgegevens, beheer). Dat haalt ruim de helft van de paginahoogte weg zonder één functie te
kosten.

**De bron voor de Nova-patronen.** Nova's berichtenbestand blijkt volledig in de HTML van de
inlogpagina te zitten: `next-intl` zet de messages in de RSC-payload, en dat is de complete
catalogus van tien namespaces, inclusief schermen waar je alleen ná inloggen komt. Uitgepakt naar
`docs/nova-i18n.json`. Dat bestand is de feitelijke basis onder `docs/Nova.md`.

**Geverifieerd.** Vier controles groen: `tsc --noEmit`, 755 unittests (20 nieuwe: de aangepaste
kerncijfers inclusief hun `explain`, en `assessReadiness`/`readinessHeadline` met de vier gevallen
compleet/open-punten/loopt/kapot), 47 ketentests, productiebuild.

## De richting vastgelegd: Nova gereconstrueerd, vier besluiten, acht fases (10 augustus 2026)

Aansluitend op de vijf bevindingen hierboven: `docs/Nova.md`. De aanleiding was de vraag om Nova
niet alleen te vergelijken maar te **reconstrueren**, en er een bouwplan uit te trekken.

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
waarschuwing: "de verleiding is een lijst van veertig functies, de les uit hun eigen herbouw is dat
er hooguit tien overleven". Het plan dat er nu ligt beslaat 51 dagen, en dat lijkt daar recht tegenin
te gaan. De verzoening staat bovenaan §7: de acht fases voegen bijna geen functies toe maar
**structuur**. Een merk-werkruimte is geen knop, het is de plek waar de bestaande knoppen eindelijk
bij elkaar staan. Van de zes dingen die InSpace in hun herbouw liet vallen staat er geen enkele in
het plan; ze staan in §9.1 met de reden erbij, zodat ze er ook niet via een omweg alsnog in komen.

**Twee correcties op mijn eerste versie van dat document**, allebei gevonden door de eigen map
tegen te lezen in plaats van alleen de bron:

- Ik schreef dat ORBIT ENGINE Nova's tweelaags-statustaal miste. Onjuist: `lib/analysis-status.ts` heeft
  `WhoseTurn` al sinds 7 augustus, en ontleende die toen aan dezelfde bron. Wat wél mist is de
  derde laag (`runningDate`, "Publishes once approved"), en die telt pas als er een plan met
  toekomstige publicatiedata is. Verplaatst naar fase 4.
- Ik zette "quota per maand" als openstaande vraag. Die was al beantwoord: de prijspagina van
  inspace.io noemt 10, 20 en 40 pagina's per maand. `pages_per_month` is dus een eigenschap van het
  abonnement, geen vrij veld.

**De vondst die het document draagt.** Nova gebruikt `next-intl`, en dat zet de volledige
berichtencatalogus in de RSC-payload van de inlogpagina, dus vóór authenticatie. Tien namespaces,
~900 sleutels, uitgepakt naar `docs/nova-i18n.json`. Daarmee is elk scherm, elk invoerveld, elke
status, elke foutmelding en elke bevestigingsdialoog letterlijk bekend, inclusief schermen waar je
alleen ná inloggen komt. Wat er níet in zit staat als openstaande analyse in §10, met per vraag
welke fase erdoor geblokkeerd wordt. De belangrijkste twee gaan over fase 4: hoe er uit de
admin-invoer twaalf maanden pagina's rollen, en hoe de bufferlogica werkt.

**Volgorde.** Fundament, merk-werkruimte, rollen, onboarding-wizard, contentplan, Search Console,
de lus sluiten, i18n en donkere modus, CSM-paneel. Moet je kiezen, doe dan fase 1, 4 en 6: dat zijn
precies de drie die van een meetinstrument een programma maken.

## De strategie uitgepakt, en twee vondsten die het plan raken (10 augustus 2026, tweede ronde)

`docs/Nova.md` §11 en §12. Doel was de vier vragen die het bouwplan blokkeerden. Drie nieuwe
bronnen: de i18n van de oudere `app.inspace.io` (1.469 sleutels, 21 namespaces, dezelfde truc als
bij Nova), de marketingsite en de prijspagina.

**Vier van de zes openstaande vragen zijn beantwoord.** De belangrijkste: hoe er een jaarplan
ontstaat. De oudere app is expliciet waar Nova zwijgt. `creation.subscriptionPlan` ("Subscription
plan 0{plan} · {count} items per month") bewijst dat de quota uit het **abonnement** komt;
`strategy.monthOfTotal` ("You are in contract month {current} of {total}") dat de twaalf maanden de
**contractduur** zijn; en `strategy.annualPlan` plus de vier paginatypen dat het jaarplan een
**verdeling van paginatypen met aantallen** is, geen lijst URL's. Een agent stelt het op, de
strategie is geversioneerd, en purgen laat geplaatste en goedgekeurde content staan.

Gevolg voor ORBIT ENGINE: `propose_topics` kan hierop worden uitgebouwd, er hoeft geen nieuwe zware
pijplijnstap te komen. Wat erbij moet is de verdeling over maanden, paginatypen en funnelfasen met
de quota als randvoorwaarde, en dat is rekenwerk, dus een pure module (conventie 2).

Ook opgelost: "Nova insights" bestaat echt, maar het is **één zin** met een vervolgstap
("Finishing the Bankencollectie funnel unlocks your first fully-ranked topic cluster"). Fase 6 gaat
daardoor van 6 naar 4 dagen. En "domein" is inderdaad een niveau ónder "klant", dus `profiles` moet
in tweeën: account en merk.

**Twee vondsten die verder reiken dan het plan.**

**1. InSpace brengt zelf een product uit dat ORBIT ENGINE heet.** In hun productmenu staat "Nova" (live) en
"ORBIT ENGINE, Binnenkort beschikbaar", met als omschrijving "Een nieuwe manier om te groeien voorbij
zoekmachines" en een pre-registratieknop. Dezelfde naam, dezelfde categorie. §12.1 zet de drie
opties op een rij met een advies (wijzigen, en snel, niet omdat je ongelijk hebt maar omdat je dat
gevecht niet wint van een partij met 400 klanten en negen openstaande vacatures). Besluit ligt bij
de eigenaar; zolang het niet genomen is verandert er niets aan de code.

**2. Nova meet geen AI-zichtbaarheid.** Nul treffers op `citation`, `chatgpt`, `perplexity`, `llm`
en `mention` over 2.447 interfaceteksten van beide apps. De enige "geo"-treffers gaan over
geografische identiteit, niet over Generative Engine Optimization. De "AI-citaties 312" op hun
website hoort bij het product dat nog moet komen.

Dat tweede is de strategisch belangrijkste zin van dit hele onderzoek: **ORBIT ENGINE levert vandaag wat
InSpace pas belooft.** Het gat zit niet in de meetkant, daar loopt ORBIT ENGINE vóór, maar in het programma,
het plan en het portaal eromheen. Dat maakt het advies uit §7 sterker, niet zwakker: doe fase 1, 4
en 6, want dat is de structuur rond een motor die al draait.

Als bijvangst is jouw eigen structuurschets thuisgebracht: Brand Intelligence, buyer persona's,
klantreis, zoekwoordclusters en "SEO + GEO gaps" staan niet in de i18n maar in één visueel blok op
de marketingsite. Het is dus hun belofte, niet aantoonbaar hun app. Wat ervan overgenomen hoort te
worden is de gedachte dat het merkbrein **telbaar** is ("238 zoekopdrachten in kaart, 91 gaten"), en
die getallen heeft ORBIT ENGINE al.

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

*Meerdere websites per klant, plus bureaus, plus twintig klanten in jaar één* maakt de opsplitsing
van `profiles` verplicht in plaats van netjes. Eén platte tabel is nu tegelijk het account en de
website. Dat wordt `accounts` en `brands`, elke `profile_id` wordt een `brand_id`, en dat raakt
vrijwel elke query in `lib/`. Fase 1 ging daardoor van 5 naar 7 dagen en is nu de fase met het
hoogste risico. Het CSM-paneel schoof van plek negen naar plek zes: twintig klanten met meerdere
websites houd je niet meer met SQL bij.

**De veldenlijst (§13) is de winst van deze ronde.** Beide i18n-bestanden uitgekamd op wat InSpace
in de onboarding uitvraagt: ongeveer veertig velden. Naast ORBIT ENGINE's `profiles`-kolommen gelegd blijkt:
veertien heeft ORBIT ENGINE al (de ronde van 7 augustus met migratie `0045` leverde de tone-of-voice-schuiven,
verboden woorden en auteursvelden), elf kan de pijplijn zelf afleiden, elf moet de klant typen, en
vier vervallen (taalkeuze, CMS, auteurspagina, Google Analytics).

Dat laatste getal is het punt: **de klant hoeft er elf in te typen en dat zijn precies de elf die
niemand kan raden**, bedrijfsgegevens en facturatie. De rest staat vooringevuld met het label "uit je
website gehaald" en is corrigeerbaar. InSpace laat de klant twintig minuten uittrekken
(`landingTimeNote`); ORBIT ENGINE kan het in vier stappen omdat het onderzoek vóór de onboarding draait in
plaats van erna. Fase 3 ging daardoor van 8 naar 7 dagen.

Kleinere uitkomsten: één tone-of-voice-schuif ontbreekt nog (`tone_emotional`, vier standen), de
aanspreekvorm van de klant moet een eigen veld worden (ORBIT ENGINE's eigen "je en jij" uit `schrijfstijl.md`
geldt voor de interface, niet voor wat ORBIT ENGINE vóór een advocatenkantoor schrijft), en alleen Nederlands
(besluit 13) laat `next-intl` vervallen, waardoor fase 7 van 5 naar 2 dagen krimpt.

**De naam blijft ORBIT ENGINE.** Het advies was wijzigen omdat InSpace een gelijknamig product aankondigt;
de eigenaar weegt dat anders en kiest houden. Vastgelegd in §12.1 als genomen besluit, niet als open
punt. Wat wel blijft staan als schrijfregel: de eerste vermelding van ORBIT ENGINE zegt altijd wát het meet,
niet alleen hoe het heet.

**Drie laatste besluiten (10 augustus 2026), waarmee het plan compleet is.** Bij opzeggen blijft de
toegang staan tot het einde van de betaalde maand en wordt de opbrengst nog één keer getoond: een
account krijgt een `opgezegd_per`-datum in plaats van dat er iets verwijderd wordt, wat een
uitbreiding is van het patroon dat `lib/archive.ts` al voor merken hanteert. Bij een bureau keurt het
bureau goed, want dat is de contractpartij; doorzetten naar de eindklant is later een uitbreiding.

En er zijn nog geen prijzen per pakket. Dat heeft één concreet gevolg voor de bouw: het opbrengstblok
rekent in aantallen ("340 extra bezoekers, 3 keer vaker genoemd") en niet in geld. Minder
overtuigend, maar eerlijk, en het is conventie 3. Om te voorkomen dat dit later een verbouwing wordt,
krijgt de rekenkant nu al de waarde per bezoeker als **optionele** parameter: `null` toont aantallen,
een bedrag toont geld, en er hoeft geen scherm om zodra de prijzen bekend zijn. Tien minuten nu tegen
een dag later.

## Fase 1 begonnen: de accountlaag staat (10 augustus 2026)

Migratie `0046_accounts`, toegepast op productie en nageteld. `accounts` (de klant of het bureau,
met facturatie, pakket en opzegdatum), `account_users` (koppeltabel met rol) en `profiles.account_id`.
Backfill: elke bestaande eigenaar werd één account met al zijn merken erin, want wie nu onder
dezelfde `user_id` staat hoorde ook bij elkaar. Uitkomst: 1 account, 9 merken gekoppeld, 0 wezen.

**Afgeweken van het eigen plan, en dat is de belangrijkste beslissing van deze ronde.** `docs/Nova.md`
schreef voor dat `profiles` hernoemd zou worden naar `brands`. Bij het natellen bleek dat vijftien
tabellen een `profile_id` dragen, dat alle RLS-regels eraan hangen en dat de code er op ~500 plekken
naar verwijst. Die hernoeming levert nul functionaliteit op: `profiles` ís het merk al (één website,
één dossier, één set metingen) en `lib/nav.ts` zegt in de interface allang "Merken". Wat écht
ontbrak was de laag eróven. Die is er nu, `profiles` bleef staan, en daarmee ging fase 1 van de
risicovolste fase naar een additieve.

**De toegangsregel is drielaags geworden** (`getOwnedProfile`): eerst het account, dan de historische
eigenaar (`profiles.user_id`), dan de beheerder (`isStaff`). Elke laag is een aparte vraag met een
eigen `return`, nooit één samengestelde voorwaarde, want dit is samen met `getOwnedAnalysis` de enige
poort tussen een verzoek en andermans data. Laag 2 blijft bewust bestaan zolang niet is nageteld dat
élk merk een account heeft; hem meteen weghalen zou betekenen dat de backfill foutloos moest zijn
vóórdat er iemand inlogt, en dat is precies het soort aanname waar dit project vangnetten tegen bouwt.
Op RLS-niveau hetzelfde: de twee bestaande policies bleven staan en er kwam er één bij. Policies zijn
een OR van elkaar, dus de verruiming kon niets breken.

`isActiveAccount()` en `monthsSinceStart()` staan in `lib/account-status.ts` en niet in
`lib/accounts.ts`: die laatste heeft `server-only` en dan is de rekenkunde niet te testen vanuit
`scripts/test-unit.ts` (conventie 2). Dat bleek meteen, want de eerste versie stond op de verkeerde
plek en de testrunner viel erover.

`monthsSinceStart` draagt besluit 7: doorlopend opzegbaar, dus geen "contractmaand 4 van 12" zoals
Nova, maar "maand 4 sinds de start". Een teller die zegt hoeveel je nog tegoed hebt suggereert een
contract dat er niet is.

Vier controles groen: `tsc`, 766 unittests (11 nieuwe), 47 ketentests, productiebuild.

**De werkruimte zelf, aansluitend op de accountlaag (10 augustus 2026).** De bovenbalk is een
zijbalk geworden. Aanleiding is besluit 1: zodra de app over één merk tegelijk gaat, komen er twee
soorten navigatie naast elkaar te staan, wat over dít merk gaat en wat over de app gaat. Horizontaal
is dat onderscheid niet te maken zonder scheidingstekens die niets betekenen; verticaal is het één
tussenkopje.

Drie keuzes die het vermelden waard zijn. **De kiezer verdwijnt bij één merk**: dan staat de naam er
als tekst, want een kiezer met één optie belooft een keuze die er niet is. Dat is dezelfde redenering
waarmee `lib/nav.ts` eerder al twee dubbele menu-items opruimde, en Nova doet het ook zo. **Het
zoekveld verschijnt pas vanaf acht merken**, daaronder is het ruis. **De routes zijn niet verhuisd**:
`/profielen/[id]` blijft waar het staat, want er zijn bladwijzers en gedeelde demolinks, en een
werkruimte is context en geen ander adres. `/analyses?merk=` filtert de lijst met een zichtbare chip
en een uitweg terug, want een lijst die stilletjes korter is dan je verwacht leest als data die weg is.

De cookie `orbit_engine_merk` is een voorkeur, nooit een recht: `listBrands()` controleert bij elke aanroep
opnieuw of de gebruiker bij dat merk mag, en de echte poort blijft `getOwnedProfile()`. Een geplakte
cookie levert dus niets op, hij zet hooguit de kiezer in een vreemde staat, en daarom valt
`selectBrand()` stil terug op de merkenlijst als het merk niet klopt.

Nagemeten met Playwright op 390 en 1280: geen horizontale overflow, nul uitstekende elementen, en de
sticky balken blijven plakken. De zijbalk heeft vaste breedtes (240px, ingeklapt 64px) omdat een
balk die meegroeit met de langste merknaam de pagina laat verspringen bij elke wissel.

## Fase 2: uitnodigingen, de enige deur naar binnen (10 augustus 2026)

Migratie `0047_uitnodigingen`, toegepast en geverifieerd op productie. Registreren stond al dicht
(`signupsEnabled` in `lib/config.ts`), maar daarmee was er ook geen wég naar binnen behalve met de
hand een gebruiker aanmaken in Supabase. Besluit 2 maakt dat een blokkade: de klant logt zelf in en
keurt goed.

**Vier eindtoestanden, vier schermen.** Nova heeft er precies deze vier
(`onboarding.activation`), en dat onderscheid is de moeite waard: "deze link is verlopen, vraag een
nieuwe" is een heel ander bericht dan "je account is al actief, log gewoon in". Met één generieke
foutmelding belt de klant, en dat is precies het gesprek dat je niet wilt voeren op de dag dat hij
begint. De volgorde in `inviteState()` is bewust: **ingetrokken wint van verlopen, en verlopen wint
van gebruikt**. Een ingetrokken link mag nooit als "al gebruikt" lezen, want dan denkt de ontvanger
dat hij een account heeft en gaat hij een wachtwoord resetten dat niet bestaat.

**Het token staat niet in de database, alleen zijn SHA-256.** Wie de database kan lezen mag geen
geldige uitnodigingslinks kunnen maken. Dat kost hier niets, want opzoeken gaat op de hash; het ruwe
token bestaat precies één keer, op het moment van aanmaken. Gevolg voor het scherm: de link
verschijnt één keer met de waarschuwing erbij dat hij niet opnieuw te tonen is. Dat is geen
beperking maar het ontwerp.

**`account_invites` heeft nul RLS-policies**, net als `jobs`. Een tabel die alleen de server leest
geeft de client ook geen leesrecht. Nageteld op productie: RLS aan, nul policies, terwijl `accounts`
en `account_users` er elk twee hebben.

**Twee veiligheidskeuzes die uitleg verdienen.** Ten eerste: een uitnodiging voor een adres dat al
een gebruiker heeft, maakt géén nieuw wachtwoord. Dat lijkt onvriendelijk maar het is de enige
veilige variant, anders is een uitnodiging een overnameroute: wie een adres kent, nodigt uit en zet
er een nieuw wachtwoord op. Bij een bureau (besluit 9) is dat geval juist normaal, dezelfde persoon
bij een tweede klant, en dan komt er alleen een lidmaatschap bij. Ten tweede: de uitnodiging wordt
pas afgevinkt nádat het lidmaatschap er staat. Andersom zou een storing halverwege een verbruikte
link zonder toegang opleveren, en dat is niet te herstellen zonder nieuwe uitnodiging.

**Uitnodigen mag alleen een `admin` van het account of een beheerder van ORBIT ENGINE** (`mayInvite`). Een
`member` kan meekijken en goedkeuren maar de kring niet uitbreiden; bij een bureau is dat het
verschil tussen een collega en de contractpartij.

De wachtwoordregels zijn die van Nova (`rule8`, `ruleNumber`, `ruleUppercase`) en vinken live af
terwijl je typt. Ze staan in `lib/invite-rules.ts` zónder `server-only`, zodat de browser en de
server dezelfde functie draaien: een client die iets goedkeurt wat de server weigert is de ergste
variant van dat scherm.

Geen uitnodigingsmail: `EMAILS_ENABLED` staat uit en de eerste klanten komen via een demogesprek.
De link komt op het scherm met een kopieerknop. Dat is niet de armoedige variant maar de
betrouwbare, hij werkt ook als de mail in een spamfilter blijft hangen.

Vier controles groen: `tsc`, 788 unittests (22 nieuwe), 47 ketentests, productiebuild. Op productie
geverifieerd dat de opzoekquery de rij op hash vindt inclusief accountnaam, en dat de vier
eindtoestanden zich gedragen zoals de unittests beschrijven. De vier testrijen die daarvoor zijn
aangemaakt, zijn na afloop weer verwijderd.

**Uitnodigingen beheren, en de grens tussen klant en consultant (10 augustus 2026).** Twee
afrondingen op fase 2.

Openstaande uitnodigingen staan nu op het instellingenscherm, met een knop om ze in te trekken.
Intrekken en niet verwijderen (conventie 8): "deze link werkte ooit en is toen ingetrokken" is
navraagbaar, een verwijderde rij niet, en dan is bij een klant die klaagt dat zijn link niet werkt
de enige mogelijke conclusie: geen idee. Verlopen uitnodigingen blijven in de lijst staan om
dezelfde reden, die verklaren juist waarom iemand niet binnenkomt. De route heet `/revoke` en geen
DELETE, want die methode belooft iets anders dan er gebeurt. In de update staat `eq("account_id")`
naast `eq("id")`, en dat is geen dubbelop maar de echte controle: zonder die regel zou een beheerder
van account A een uitnodiging van account B kunnen intrekken door het id te raden.

**De klantweergave is gegrond in Nova's eigen berichtenbestand, niet in een aanname.** Een
Nova-klant ziet vier bestemmingen (Overview, Strategy, Analytics, Account). Alles wat de CSM óver
een klant vastlegt zit in de aparte `admin`-namespace, inclusief `admin.onboardingProfile`. Er is
geen enkele sleutel waarmee een klant de notities van zijn CSM kan lezen.

Toegepast: **"Het gesprek" is nu afgeschermd op `isStaff()`.** Dat blok bevat aantekeningen óver de
klant, niet vóór hem: wat er speelt, wat gevoelig ligt, welke contextfactoren het advies kleuren.
Dat hoort niet op het scherm van degene over wie het gaat. De rest van het dossier blijft voor
allebei zichtbaar, want het dossier, de nulmeting, het aanbod en de onderwerpen zijn precies wat de
klant komt halen.

De grens loopt langs `isStaff()` en niet langs de accountrol: het gaat om ORBIT ENGINE's eigen team
tegenover iedereen daarbuiten. Een accountbeheerder bij een bureau is nog steeds een klant. En het
afgeschermde blok haalt ook zijn springlink weg, want een link naar een blok dat er niet is, is
zichtbaarder dan het blok zelf.

## Fase 3: het merkprofiel, dertig velden die de klant nakijkt in plaats van invult (10 augustus 2026)

Migratie `0048_merkprofiel_compleet`, toegepast en geverifieerd op productie, plus een wizard van
vijf stappen op `/profielen/[id]/merkprofiel`.

**Dertien nieuwe velden, en dat is minder dan Nova er uitvraagt.** De inventaris in `docs/Nova.md`
§13 legde hun ~40 onboardingvelden naast ORBIT ENGINE's kolommen. Veertien had ORBIT ENGINE al, elf kan de pijplijn
afleiden, vier vervielen (taalkeuze, CMS, auteurspagina, Google Analytics). Wat overbleef zijn deze
dertien. Alles wat al een eigenaar had is er bewust níet nóg een keer bijgezet: `value_props` ís
Nova's "value pillars", `intake_audience` ís de primaire doelgroep, `industry` ís de kerncategorie.
Eén feit heeft één eigenaar, en een tweede kolom met dezelfde betekenis is een kolom die gaat
afwijken. De volledige vertaaltabel staat bovenaan de migratie.

**Het scherm vraagt niets, het laat nakijken.** Dat is het verschil met Nova, en het volgt uit iets
dat ORBIT ENGINE al had: het onderzoek draait hier vóór de kennismaking in plaats van erna. Nova laat hun
klant twintig minuten uittrekken (`landingTimeNote`) voor dertig lege velden. Hier staat het
merendeel al ingevuld, met het label **"uit je website gehaald"** erbij, Nova's `draftedBadge`. De
gegevens daarvoor lagen er al in `profile_field_sources` (migratie 0039); dit is de eerste plek waar
ze zichtbaar worden voor de klant. Een leeg veld dat de pijplijn niet kán vinden krijgt "vul jij in"
in plaats van "niets gevonden": dat verschil is het verschil tussen een tekortkoming van de app en
een vraag aan de klant.

**De schuiven zijn knoppen geworden, geen schuifbalken.** Nova benoemt elke stand (`formality1` tot
`formality3`), en dan is een rij knoppen eerlijker dan een balk: je kiest een woord, geen positie.
De vijfde schuif, de emotionele lading, is de enige met vier standen, net als bij hen.

**Eén veld dat Nova niet heeft en wij wel nodig hadden: de aanspreekvorm.** `docs/schrijfstijl.md`
legt "je en jij" vast, maar dat is een keuze over ORBIT ENGINE's eigen interface. Wat ORBIT ENGINE vóór een
advocatenkantoor schrijft hoort "u" te zeggen. Die twee vielen samen zolang er één regel was; nu
staan ze los.

**⚠️ De verificatie ving een echte bug.** Na het bouwen zijn de 27 wizardsleutels tweemaal
nagelopen: tegen de kolommen op productie (alle 27 bestaan) en tegen de lijst van bewerkbare velden
in de PATCH-route. Daar zat er één niet in: `proof_points`. De route negeerde dat veld dan zonder
fout, dus de klant vulde zijn bewijspunten in, kreeg "opgeslagen" te zien, en de waarde was weg.
Twee lijsten die hetzelfde moeten zeggen is een intentie; de lijst is nu één gedeelde module
(`lib/profile-editable.ts`) met een unittest die controleert dat élk wizardveld erin staat. Conventie
1, en dit is precies waarom die conventie bestaat.

Vier controles groen: `tsc`, 810 unittests (24 nieuwe), 47 ketentests, productiebuild. Nagemeten met
Playwright op 390 en 1280: geen horizontale overflow.

## Fase 4 begonnen: het contentplan als kernobject (10 augustus 2026)

Migratie `0049_contentplan`, toegepast en geverifieerd op productie, plus twee pure modules met 35
nieuwe tests. Dit is het fundament onder besluit 3: twaalf maanden vooruit, pagina's per maand,
goedkeuring per maand.

**Wat dit expliciet níet is: een contract.** Nova zet overal "contract month {current} of {total}",
en dat kan hier niet want de klant kan morgen opzeggen (besluit 7). Er staat daarom geen looptijd in
`content_plans` en geen einddatum, alleen een startdatum. Het plan kijkt wél twaalf maanden vooruit,
want een programma zonder horizon is geen programma. Het verschil zit in de taal, niet in de data.

**De derde statuslaag is er nu ook.** `lib/analysis-status.ts` nam in augustus Nova's technische
status en hun "wie is er aan zet" al over. Wat ontbrak was `runningDate`, en die telt pas als er
pagina's zijn die over zes weken verschijnen: bij een plan van twaalf maanden is het verschil tussen
een lijst en een agenda precies dat je ziet wánneer er iets gebeurt. Eén detail daarin verdient
uitleg: een pagina die op akkoord wacht krijgt géén datum maar "publiceert zodra je akkoord geeft".
Die datum hangt van de klant af, niet van ons, en een datum tonen zou een belofte zijn die wij niet
kunnen waarmaken.

**`buildPlan()` verdeelt, het bedenkt niet.** Uit de analyse in `Nova.md` §11.1 bleek dat Nova een
agent het hele plan laat opstellen. ORBIT ENGINE heeft de bedenkkant al (`propose_topics` levert onderwerpen
mét prioriteit) en miste alleen de verdeling. Dat scheelt een zware AI-stap: deze taak heeft er nul
nodig, het is rekenwerk. Vier regels sturen hem, en de eerste volgt rechtstreeks uit besluit 7:
hoogste prioriteit in de eerste maanden, want een klant die na drie maanden opzegt moet de béste drie
maanden gehad hebben.

**⚠️ De praktijkcheck tegen Van den Udenhout ving een echt probleem.** Het plan is gedraaid met zijn
acht echte onderwerpen en tien pagina's per maand. Uitkomst: 132 pagina's, netjes verdeeld, alle
funnelfasen in elke maand. Maar "Auto financieren" stond twee keer in maand één, met exact dezelfde
titel, omdat acht onderwerpen bij tien plekken al in de eerste maand rondlopen. Een plan waarin twee
regels hetzelfde heten leest als een fout. De werktitel draagt nu de funnelfase als invalshoek
("Auto financieren · Oriëntatie"), en er is een test die bewaakt dat geen twee pagina's in dezelfde
maand dezelfde titel dragen. Dit is precies waarom conventie 10 bestaat: op papier klopte de
verdeling, en pas tegen echte data zag je waaróm hij niet bruikbaar was.

Nog te bouwen in deze fase: de lijst met maandsegmenten, de vier dialogen (goedkeuren, alles
goedkeuren, maand goedkeuren met afwijzen-en-hergenereren, markeren als geplaatst), het herordenen,
de bufferlogica bij verwijderen, en de cron die tien dagen vooruit schrijft.

Vier controles groen: `tsc`, 845 unittests (35 nieuwe), 47 ketentests, productiebuild.

**Fase 4 vervolgd: het plan is bedienbaar (10 augustus 2026).** Op het datamodel van 0049 staan nu
de serverkant (`lib/plans.ts`), drie API-routes, een bevestigingsdialoog en het strategiescherm.

**De bufferlogica werkt zoals Nova hem beschrijft** (`deleteUrl.body`: "A buffer URL for its month
will backfill the slot if one is available"). Een verwijderde pagina gaat op `afgewezen` en verdwijnt
niet (conventie 8), en de eerste reserve van diezelfde maand neemt zijn plek én zijn datum over. Twee
regels eromheen die er niet vanzelf in zitten: een buffer schuift alleen in voor een pagina die nog
niet geschreven wás (bij een geschreven pagina is er niets te vervangen), en de melding zegt
expliciet óf er een reserve gebruikt is. Zonder dat laatste ziet de klant een maandtotaal dat
onveranderd blijft zonder verklaring.

**Twee dingen die bewust níet automatisch gaan.** Een maand afwijzen genereert géén nieuw plan in
dezelfde route: dat zou betekenen dat één klik het hele jaarplan vervangt, inclusief maanden die al
goedgekeurd waren. Twee handelingen, twee bevestigingen. En de quota komt uit het pakket op het
account en nooit uit het verzoek: zou de client dat mogen meesturen, dan is de afspraak een suggestie
en kan iemand met een pakket van 10 er 40 vragen.

**De bevestigingsdialoog heeft Nova's `cannotBeUndone`-blok.** Niet als waarschuwing tússen de
uitleg maar als eigen, omkaderd blok, want een waarschuwing in een alinea wordt gelezen als toon en
een waarschuwing in een kader als feit. Bij "maand goedkeuren" staat er wat het kost: elke pagina die
geschreven wordt kost geld, dus afwijzen is de goedkopere fout. De bewegingen (overlay 0,15s, paneel
vanaf `scale(.96)`) komen uit Nova's gecompileerde CSS.

**Geverifieerd op productie.** Een volledig plan ingevoegd met de vorm die `buildPlan()` oplevert: 12
maanden, 132 pagina's, 12 buffers zonder datum. Alle check-constraints hielden, en het verwijderen
van het plan nam maanden en pagina's mee via de cascade. Daarna is alles weer opgeruimd; er staat nu
niets in die vier tabellen.

Nog open in deze fase: herordenen met slepen, en de cron die tien dagen vooruit schrijft
(`shouldStartWriting()` is er al en getest, de taak eromheen nog niet).

**Het eerste echte plan legde een verdeelfout bloot (11 augustus 2026).** Het pakket van het account
staat op 10 pagina's per maand en Van den Udenhout heeft een plan gekregen: 12 maanden, 132 pagina's,
12 buffers. Bij het nalopen van maand 1 stond "Auto financieren · Oriëntatie" er twee keer in, op
plek 1 en plek 9. Dat is dezelfde fout als bij de praktijkcheck van 10 augustus, maar een laag dieper:
toen kreeg de titel de funnelfase erbij, en dat lost het op zolang het páár verschilt. Hier verschilde
het paar niet. Van den Udenhout heeft acht onderwerpen en er zijn vier fasen, en beide tellers liepen
één omhoog per pagina. 8 is deelbaar door 4, dus na acht pagina's stonden ze allebei weer op hun
beginstand.

**De oplossing is een schuif, geen uitzondering.** Elke keer dat de onderwerpenlijst rondgaat schuift
de fase een extra stap op, met een stapgrootte die zo gekozen is dat het paar pas terugkomt na álle
combinaties: 32 in plaats van 8 bij dit merk. En omdat er merken zijn waar dat rekenkundig niet
uitkan (40 pagina's per maand, 8 onderwerpen, 4 fasen: 41 plekken op 32 combinaties) krijgt de
onvermijdelijke herhaling "(deel 2)" achter de titel. Twee regels die letterlijk hetzelfde heten
leest als een fout in het plan; "(deel 2)" leest als een tweede artikel over hetzelfde, en dat is het.

**Waarom de test dit niet zag, en wat er nu getest wordt.** De unittest hield zeven onderwerpen aan.
Zeven en vier hebben geen deler gemeen, dus daar viel het toevallig goed uit. Het aantal onderwerpen
van een merk is niets om op te vertrouwen, en dus loopt de test nu langs 1 tot en met 16 onderwerpen
maal alle drie de pakketten, met per combinatie de eis dat geen titel twee keer in dezelfde maand
staat. 881 unittests, waarvan 36 nieuw.

**Het plan schrijft zichzelf (11 augustus 2026).** De laatste ontbrekende schakel van fase 4: een
dagelijkse cron (`/api/cron/plan`, pg_cron-taak `aura-plan-writer`, migratie 0050, sinds migratie 0059 `orbit-engine-plan-writer`) zet schrijftaken
klaar voor pagina's van een goedgekeurde maand die binnen tien dagen gepubliceerd moeten worden. De
route plant alleen, de werker schrijft, precies zoals `/api/cron/tracking`.

**Bij het bouwen bleek de echte blokkade een andere dan tien dagen.** Schrijven leunt op een gemeten
analyse: de contentpijplijn gebruikt de gemiste vragen en de winnende antwoorden als briefing.
Zonder meting schrijft het model iets algemeens, en dat is het soort tekst waarvoor niemand betaalt.
Bij Van den Udenhout hebben twee van de acht onderwerpen een analyse, en beide zijn ooit gestart via
de topic-knop. Zes van de tien pagina's in maand 1 kunnen dus vandaag niet geschreven worden, met
pakket 10.

**Dat is geen randgeval maar de normale toestand, en dus krijgt het een plek in het scherm.**
`lib/plan-writing.ts` geeft geen boolean maar een beslissing mét reden, en die reden staat onder de
regel in het plan, in Nova's wie-is-aan-zet-taal: "Start eerst de meting van dit onderwerp, anders
schrijft ORBIT ENGINE zonder cijfers" (bal bij de klant) of "De meting van dit onderwerp loopt nog" (bal bij
ORBIT ENGINE). Blokkades die géén probleem zijn, zoals "nog niet aan de beurt", krijgen bewust geen melding:
een melding bij iets wat gewoon goed gaat, leert mensen meldingen negeren.

**De brug tussen plan en contentpijplijn is één veld.** De pijplijn kent alleen analyses, het plan
alleen merken. `plannedPageId` in de payload van `content_draft` verbindt ze: de handler schrijft
`content_piece_id` terug en zet de pagina op `ter_goedkeuring`, en de werker zet hem op `mislukt`
als het schrijven definitief niet lukt. Dat laatste stond er eerst niet in, en zonder die regel
blijft een pagina op "ORBIT ENGINE is bezig" staan terwijl er niets meer gebeurt: de ergste van alle
statussen, want hij vraagt om geduld dat nergens toe leidt.

**Getest waar de fout zou zitten.** Die brug bestaat uit drie stukken (de cron zet het veld, de
handler koppelt terug, de werker meldt de mislukking) en valt er één weg, dan schrijft ORBIT ENGINE wél maar
loopt het plan achter. Dat is samenhang tussen taken en dus onzichtbaar voor een unittest: er staan
nu vijf ketentests omheen. Eén ervan wees meteen iets aan wat ook in de cron zit: de eigenaar moet
uit `analyses.user_id` komen en niet uit het profiel, want een toegewezen analyse hoort bij de klant
en de contentpijplijn weigert te schrijven voor iemand die geen eigenaar is. 899 unittests, 52
ketentests.

**Fase 8, het CSM-paneel (11 augustus 2026).** Het stond oorspronkelijk achteraan met de redenering
"bij minder dan tien klanten kun je dit met SQL". Besluit 11 haalde die onderuit: twintig klanten in
het eerste jaar, allemaal met mogelijk meerdere websites en deels via bureaus. `/beheer` toont nu
alle merken van alle klanten, gesorteerd op wat het eerst aandacht vraagt. Alleen voor beheerders,
en bij een gewone gebruiker een 404 en geen 403: een 403 bevestigt dat het scherm bestaat.

**Zeven segmenten, maar niet die van Nova.** Nova's zeven gaan over funnels, talen en doellanden
invullen. Die velden vult ORBIT ENGINE zelf in: besluit 13 schrapte meertaligheid en de vier funnelfasen
komen uit `plan-build.ts`. Wat overblijft is de vraag die er wél toe doet, en dat werden er ook
zeven: vastgelopen, onderzoek loopt, wacht op jouw nakijkwerk, nog niet gemeten, wacht op de klant,
geen contentplan, loopt. Elk segment heeft Nova's banner die zegt wát je moet doen, en een eigen
lege staat, want een leeg segment is hier goed nieuws.

**De volgorde van de controles ís de prioriteit.** Een merk valt in het eerste segment dat past, en
een pijplijnfout wint van een openstaand akkoord. Zonder die regel staat een merk in twee lijsten en
telt hij dubbel in elke teller boven de tabel. Er staat een test op die eist dat de segmenten samen
optellen tot het aantal merken; dat is de enige manier om te zien of de tabbladtellers kloppen met
de tabel eronder.

**Zes query's, geen zes per merk.** Dit scherm toont álle merken. Zou het per merk zijn tellers
ophalen, dan is dat bij twintig klanten al honderden ronden naar Supabase op één pagina. Dezelfde
afweging als bij `enqueueMeasurement()`, waar 2×N sequentiële aanroepen ooit de bevestigroute omver
duwden.

**De drempel voor "nagekeken" staat op 80% en niet op 100%.** Van de 27 merkvelden leidt ORBIT ENGINE er 25
zelf af en de laatste paar weet alleen de klant. Op 100 zou élk merk eeuwig in "wacht op jouw
nakijkwerk" blijven staan en werd het segment betekenisloos. 919 unittests.

**Herordenen zonder slepen (11 augustus 2026).** De laatste open post van fase 4. Nova laat je
slepen; dat is op een muis prettig en op een telefoon onbetrouwbaar, want HTML5-drag werkt daar niet
en de vervangers vragen dat je een rij eerst een halve seconde vasthoudt zonder te scrollen. De
eerste klacht van dit hele traject ging over mobiel, dus dat is geen theoretisch bezwaar. Twee
pijltjes doen hetzelfde werk, werken overal, en zijn met het toetsenbord te bedienen.

**Wat er verwisselt is de plek én de datum.** Alleen de plek zou een lijst opleveren waarin de
bovenste pagina later verschijnt dan de onderste, en dan is het geen agenda meer. Alleen de datum
zou de lijst laten verspringen bij de volgende keer verversen. Twee regels eromheen: buffers doen
niet mee (die hebben geen datum om te ruilen) en een geplaatste pagina houdt zijn datum, want die is
de werkelijkheid geworden.

**Eén fout onderweg, gevangen vóór hij bestond.** De pijlen rekenden eerst op de zichtbare lijst.
Staat het filter op "vraagt actie", dan zijn de buren van een pagina meestal onzichtbaar, en dan
springt hij over die buren heen met de datum van de verkeerde pagina. Ze rekenen nu op de volledige
maand. 928 unittests.

**Het CSM-paneel telde mislukkingen die geen mislukkingen meer waren (11 augustus 2026).** Direct
gevonden op productie, bij het eerste merk dat het scherm liet zien. Het merkonderzoek van Van den
Udenhout faalde op 5 en 6 augustus drie keer met "You have no credits remaining", en op 9 augustus
liep precies datzelfde onderzoek gewoon door tot en met de synthese. Het merk is dus af, maar stond
bovenaan onder "Vastgelopen" met een rode teller die nooit meer op nul zou komen. Dat is precies hoe
je iemand leert een teller te negeren, en daarmee was het duurste segment van het scherm waardeloos
geweest.

**De regel is geen tijdvenster maar een feit uit de wachtrij.** Een mislukte taak telt alleen als er
daarná geen geslaagde taak van hetzélfde soort voor dezelfde eigenaar is (`unresolvedFailures()`).
"Alles ouder dan dertig dagen negeren" zou een gok zijn geweest en zou een echt kapotte taak na een
maand laten verdwijnen. Eigenaar is bewust de analyse óf het merk en niet allebei op één hoop: een
mislukte meting van analyse A zegt niets over analyse B van hetzelfde merk. Vier tests, waarvan één
letterlijk de rijen van productie. 932 unittests.

**De contentketen van het plan is met echt geld nagerekend (11 augustus 2026).** Conventie 10:
gebouwd is niet geverifieerd. Maand 1 van Van den Udenhout goedgekeurd op productie en de cron
afgetrapt. De uitkomst: 10 pagina's bekeken, 2 ingepland, 2 geblokkeerd op een lopende meting en 6
op een ontbrekende analyse. Precies de voorspelling, en de eerste keer dat die verdeling uit de
werkelijkheid kwam in plaats van uit een test.

**De brug tussen plan en pijplijn houdt.** `plannedPageId` ging mee in de schrijftaak, de handler
koppelde de tekst terug, de eerste versie haalde de poort niet en ketende naar een herschrijfronde,
en daarna stond de plan-pagina op `ter_goedkeuring` met 878 woorden eronder. Onderweg legde de
werker een tweede zware taak netjes terug in de rij omdat hij niet meer in het tijdbudget paste; dat
zag er even uit als een vastloper maar was precies het ontworpen gedrag.

**Kosten: $0,42 voor anderhalve pagina**, dus ongeveer $0,25 tot $0,30 per pagina inclusief de
herschrijfronde op `gpt-5.6-sol`. Bij pakket 10 is dat ruwweg $3 per maand aan schrijfkosten per
merk. Dat is een bruikbaar getal voor de prijsstelling en het stond nergens eerder.

**Fase 5 begint met het opbrengstblok en niet met Google.** Drie getallen bovenaan het merkdossier:
actief sinds, groei in AI-zichtbaarheid, pagina's gepubliceerd. `docs/Nova.md` §5 noemt dit het
middel dat opzeggen tegenhoudt (besluit 7, doorlopend opzegbaar), en het is vandaag te verifiëren
omdat het aan geen enkele externe koppeling hangt. De waarde per vermelding is optioneel (besluit 16,
migratie 0051): leeg toont aantallen, een bedrag toont geld, dus het scherm hoeft niet om zodra de
prijzen er zijn.

**Twee regels die uit de tests kwamen.** Bij één meting staat er een startpunt en geen groei, want
"0%" zou suggereren dat er niets gebeurde terwijl er nog niets te vergelijken is (conventie 3). En
bij een daling verschijnt er géén bedrag: dat zou een verlies als opbrengst tonen. 945 unittests.

**Fase 5, deel 2: de Search Console-koppeling (11 augustus 2026).** Gebouwd volgens de keuzes die
`docs/tasks/zoekdata-koppeling.md` op 6 augustus al had uitgezocht, dus zonder die afweging opnieuw
te maken: een service account in plaats van OAuth (de `webmasters`-scopes zijn bij Google "sensitive"
en vragen dan een verificatietraject van weken met privacybeleid en demovideo, voor nul extra waarde
bij een handvol MKB-klanten), alleen leesrecht, en `dataState: "final"` omdat Google's verse cijfers
nog herzien worden.

**Geen `googleapis`-pakket.** Dat is tientallen megabytes voor élke Google-API die bestaat, terwijl
hier twee HTTP-verzoeken nodig zijn: een JWT tekenen en hem inruilen voor een toegangstoken. Node
kan RS256 zelf. Een afhankelijkheid die honderd keer groter is dan wat je ervan gebruikt, betaal je
bij elke build en moet je bij elke kwetsbaarheid nakijken.

**Twee regels die uit de vertraging volgen.** Definitieve cijfers lopen twee dagen achter, en Google
corrigeert de dagen daarvóór nog na. Elke ronde haalt daarom een nawerkvenster van tien dagen
opnieuw op, en de unieke sleutel `(profile_id, day, page)` maakt daar een correctie van in plaats van
een dubbele rij. Zonder dat tweede zouden de totalen optellen tot een veelvoud van de waarheid;
zonder het eerste bevriest een half gecorrigeerde dag voor altijd.

**De property-naam is een eigen functie met een eigen test.** Search Console kent twee vormen,
`sc-domain:voorbeeld.nl` en `https://voorbeeld.nl/` mét slotstreep, en allebei zien er anders uit dan
een webadres. Wie het kale domein invult krijgt van Google een 404 zonder uitleg, en dan denkt iemand
dat de koppeling stuk is terwijl er een teken mist. `normalizeProperty()` noemt in dat geval beide
vormen mét het ingetypte domein erin.

**Wat expliciet in het scherm staat.** Google splitst klikken uit AI-antwoorden niet uit: die zitten
ongesplitst in `web`. Dat is precies het cijfer waarvan een klant aanneemt dat het erin zit, en een
product dat AI-zichtbaarheid meet kan die verwarring niet laten bestaan. Die zin staat onder het
koppelblok.

**Wat nog niet geverifieerd is, en waarom.** De sleutel zelf. `GOOGLE_SERVICE_ACCOUNT_JSON` moet
aangemaakt worden in een Google Cloud-project en dat kan alleen de eigenaar. Tot die er is toont het
scherm dat de koppeling niet is ingericht in plaats van te falen, en staat de rest onder test: de
property-controle, het venster, en het gedrag bij 403 en 404. Conventie 10 blijft dus openstaan voor
precies één stap. 960 unittests.

**Fase 6, de lus sluiten: twee van de vier onderdelen (11 augustus 2026).** Vóór het bouwen
nagerekend wat er te verifiëren viel, en dat veranderde de omvang van de fase. `content_impact` heeft
**nul rijen** en er is **nooit een pagina gepubliceerd**. Twee van de vier onderdelen hangen daar
volledig aan: "impact terug in het plan" (een pagina die na 60 dagen niets deed leidt tot een
voorstel) en de automatische controles op gepubliceerde pagina's. Die bouwen zou een onbeproefde laag
op een onbeproefde laag zetten, precies wat conventie 10 verbiedt en wat
`docs/tasks/zoekdata-koppeling.md` §0 al als risico had opgeschreven.

**Wat wél kon, is gebouwd en tegen echte data nagerekend.** De kansenlijst (`lib/opportunities.ts`)
en het inzichtenblok (`lib/insights.ts`). Voor het tweede was er precies één merk met genoeg
geschiedenis: Fysi-Unique, drie meetronden, 18 naar 36 naar 38.

**Die 18 naar 36 is waarom dit blok geen AI-aanroep is.** Het ziet eruit als een verdubbeling en valt
tóch binnen de meetonzekerheid van 23 punten bij dertig vragen. Een model zou daar "je zichtbaarheid
is verdubbeld" van maken, en dat is een leugen met een grafiekje eromheen. De drie zinnen volgen
rechtstreeks uit cijfers die er al staan, dus dit hoort een garantie te zijn en geen intentie
(conventie 1). Nagerekend op productiecijfers: beide overgangen lezen als "gelijk gebleven", met het
getal én de drempel in de zin.

**De sortering van de kansenlijst ging de eerste keer mis en de test ving het.** Sorteren op omvang
zette een aanbeveling van 30% boven "er staan twee geschreven pagina's die nog niet online zijn".
Maar die aanbeveling kost nog een schrijfronde op het duurste model, en die twee pagina's zijn al
geschreven, goedgekeurd en betaald en leveren zolang ze offline staan gegarandeerd nul op. Werk dat
af is gaat vóór werk dat nog moet beginnen; een geblokkeerde AI-crawler gaat vóór allebei, want dan
levert élke pagina niets op.

**De blokkade-teller komt uit de audit zelf en niet uit een eigen regel.** `technical_audits.blockers`
bevat het oordeel al: bij Van den Udenhout staan de zoek-crawlers toe en zijn alleen de
trainings-crawlers geweigerd, wat daar terecht als waarschuwing telt en niet als blokkade. Zelf op
`severity` filteren zou dat onderscheid opnieuw bedenken en vroeg of laat anders uitkomen dan de
auditpagina.

**Eén fout in eigen werk gevangen vóór hij live ging.** De onzekerheid per periode werd eerst met
`Math.random()` benaderd. Dan kan dezelfde meting bij de ene render "gelijk gebleven" zeggen en bij
de volgende "een echte stijging". Hij komt nu uit het werkelijke aantal metingen van die periode.
983 unittests.

**Fase 7, het accountscherm (11 augustus 2026).** Uitgesteld uit fase 3, nu af. Bedrijfsgegevens,
factuuradres en contactpersoon staan bij het ACCOUNT en niet bij het merk, want een bureau met vijf
merken factureert één keer (besluit 9). Het btw-nummer heeft Nova's aparte vinkje "niet van
toepassing": het verschil tussen "nog niet ingevuld" en "bestaat niet" is echt, een stichting hééft
geen btw-nummer, en één leeg veld zou die twee op één hoop gooien en het scherm eeuwig onaf laten
lijken.

**Opzeggen is een datum, geen knop die iets weggooit** (besluit 14). De bevestiging zegt met zoveel
woorden wat er blijft staan en wat er verandert, want "abonnement opzeggen" leest anders als "alles
kwijt".

**Wat een klant NIET zelf mag zetten, met een test eromheen.** Het pakket is een verkoopafspraak, geen
instelling: kon een klant zichzelf op 40 zetten, dan is de afspraak een suggestie. `started_at`,
`cancelled_at` en de waarde per vermelding staan er om dezelfde reden buiten. `lib/account-editable.ts`
is dezelfde constructie als `lib/profile-editable.ts`, en die bestaat omdat daar één veld wél in de
wizard stond en niet in de opslagroute, en dus stilzwijgend niets bewaarde terwijl de melding
"opgeslagen" zei. De test controleert nu beide kanten: elk zichtbaar veld is opslaanbaar, en de
verboden velden zitten er niet in.

**De donkere modus is eerst uitgesteld en daarna geschrapt.** 986 unittests.

**Besluit 17: de donkere modus vervalt (11 augustus 2026).** Niet uitgesteld maar geschrapt; hij
staat nergens meer op een lijst. Het `:root`-blok heeft 107 kleur-tokens die elk een doordachte
tegenhanger nodig hebben, mechanisch omkeren geeft grijze modder, en het resultaat is pas te
beoordelen door elk scherm in beide standen naast elkaar te leggen. Dat is een dag werk plus een
designronde voor de enige fase in het plan met impact "laag", bij een product dat sales-led in een
demogesprek verkocht wordt en dus altijd op één scherm in één stand getoond wordt. Fase 7 krimpt
daarmee van 2 naar 1 dag en het totaal van 47 naar 46. De tokennamen blijven op twee standen
ingericht, maar dat is nu gewoon betere naamgeving en geen voorbereiding meer.

**Het uitnodigingspad nagespeeld, en het legde een echte fout bloot (11 augustus 2026).** Van den
Udenhout wordt binnenkort echt onboard, en het pad dat hij aflegt was nog nooit van begin tot eind
gelopen: uitnodiging aanmaken, link doorsturen, wachtwoord kiezen, binnenkomen, merk zien. Registreren
staat dicht, dus dit is de énige deur naar binnen; er is geen tweede pad dat het opvangt.

**De vondst: `getOwnedAnalysis()` miste de accountlaag.** `getOwnedProfile()` kreeg bij migratie 0046
een derde laag (lid van het account) en deze functie niet. De RLS op `analyses` kreeg hem wél
(`analyses_select_account`), en juist dáárdoor was het bijna onzichtbaar: een uitgenodigde klant zág
zijn analyses gewoon, want lezen loopt over RLS. Maar élke schrijfactie loopt over deze functie,
vragen bevestigen, content laten schrijven, een pagina goedkeuren, archiveren, en die gaven allemaal
404 voor precies de persoon voor wie het product bedoeld is. In Nova's model is "de klant keurt goed"
de hele rol van de klant, en goedkeuren is een schrijfactie. Dit had de eerste dag van de eerste
echte klant geraakt.

**De ketentest kon dit pas zien nadat de harnas zelf gerepareerd was.** Twee gaten:

1. **Geen auth-laag.** `acceptInvite()` maakt de gebruiker aan met `admin.auth.admin.createUser`, en
   dat kon de shim niet. Nu schrijft hij naar de échte `auth.users` van de testdatabase, dus de
   foreign keys en de unieke index op het adres gelden ook echt.
2. **Geneste selects werden STIL weggegooid.** `"*, accounts(name)"` werd simpelweg `*`. Dat is
   precies het "stil afwijken" dat de kop van dat bestand verbiedt, en het kostte meteen een valse
   testfout: `lookupInvite()` leek de accountnaam niet terug te geven terwijl PostgREST hem op
   productie gewoon levert. Ze worden nu echt uitgevoerd, met de koppeling uit de **werkelijke**
   foreign keys van de testdatabase en niet uit een naamconventie: `profile_topics` hangt aan
   `analyses` via `analysis_id`, maar `planned_pages` hangt aan `profile_topics` via `topic_id`, en
   een conventie valt daar om. Wat de shim niet kan (`!inner`, geneste filters, dubbel geneste
   selects) gooit nu mét de reden erin.

**Zeventien nieuwe ketentests**, waarvan de scherpste: een uitgenodigde klant ziet zijn merk én zijn
analyses, en een merk van een ánder account blijft dicht. Die laatste stond er niet voor niets: alle
andere asserties kijken of iemand er wél in komt, en dan blijft een te ruime regel onopgemerkt.
77 ketentests, 986 unittests.

**Elke schrijfroute nagelopen vóór de eerste echte klant (11 augustus 2026).** Alle 44 API-routes in
kaart gebracht met hun bewaker. De uitkomst was geruststellender dan verwacht: 22 routes gaan over
`getOwnedAnalysis` en 15 over `getOwnedProfile`, dus de reparatie van de accountlaag werkt in één
klap door in allemaal. Drie routes hebben geen bewaker, en twee daarvan horen dat zo (`health` en
`invites/accept`, waar het token zélf de autorisatie is).

**De derde legde een tweede echte fout bloot: een nieuw merk kreeg geen account.** Migratie 0046
vulde `account_id` met terugwerkende kracht voor élk bestaand merk, maar `POST /api/profiles` zette
hem niet. Elk merk dat daarna via de app ontstond kwam dus zonder account binnen, en dat is geen
cosmetisch gemis: het contentplan vindt geen pakket (de quota hangt aan het account) en zegt dan
eeuwig "er is nog geen pakket gekozen", een uitgenodigde klant ziet het merk niet omdat dat over laag
1 loopt, en het CSM-paneel toont het zonder klantnaam. Precies het scenario van de eerste echte
onboarding, want die begint met een nieuw merk aanmaken.

`defaultAccountFor()` hanteert dezelfde regel als de backfill: bestaand account gebruiken, bij
meerdere het oudste (dat is je eigen account, een bureau komt er later bij), en anders er één maken op
het e-mailadres met jezelf als beheerder. Faalt zacht naar `null`, want een mislukte accountaanmaak
mag nooit het aanmaken van het merk zelf blokkeren. Op productie stond de teller op nul merken zonder
account, dus dit was puur een toekomstig gat.

**Fase 7 is af: e-mail en wachtwoord wijzigen.** Beide van Nova overgenomen omdat ze allebei een echt
probleem oplossen. Zonder bevestigingsmail kan een tikfout iemand permanent buitensluiten, het oude
adres werkt dan niet meer en het nieuwe bestaat niet; Supabase stuurt die mail zelf naar het nieuwe
adres en het oude blijft werken tot hij bevestigd is. Zonder controle op het huidige wachtwoord is
een openstaande laptop genoeg om een account over te nemen.

**Die controle loopt bewust met de publieke sleutel.** Een wachtwoordcontrole heeft geen enkele
verhoogde bevoegdheid nodig, en een mislukte inlogpoging doen met de sleutel die overal bij mag, is
het verkeerde gereedschap voor een alledaagse handeling. De eerste versie gebruikte de service-role;
dat werkte, maar het is de verkeerde sleutel voor de klus.

**Twee knoppen, geen gezamenlijk formulier.** Ze hebben een andere uitkomst: het adres wijzigen levert
een bevestigingsmail op en verandert nog niets, het wachtwoord wijzigen is meteen klaar. Eén knop voor
twee beloftes is precies hoe iemand denkt dat hij iets deed wat hij niet deed. De wachtwoordregels
staan live onder het veld, dezelfde drie als bij de uitnodiging: twee verschillende sterktes voor
hetzelfde wachtwoord is een verschil dat niemand kan uitleggen. 998 unittests, 82 ketentests.

**Het lanceerplan (11 augustus 2026).** `docs/tasks/lanceerplan.md`: het pad van "gebouwd" naar "Van
den Udenhout is klant", in vijf testsporen over twee weken. Aanleiding: in negen bouwrondes is het
Nova-plan afgebouwd, maar niemand heeft het geheel één keer als klant doorlopen.

**De kern is dat "InSpace-kwaliteit" toetsbaar gemaakt is.** Dat was een gevoel en daar kun je niet op
afvinken. Uit de reconstructie komen vijf eigenschappen die in hun berichtenbestand aantoonbaar zijn
en dus ook in ORBIT ENGINE te controleren: elke toestand een eigen scherm (zij hebben vier lege staten voor
één tabel), elke foutmelding specifiek (zestien in alleen het accountscherm), de taal zegt wie aan
zet is, onomkeerbaar wordt vooraf in een eigen kader benoemd, en bulk is eerlijk over gedeeltelijk
succes. Die vijf zijn de kolom "Nova-kwaliteit" per scherm.

**Met de grens van dat oordeel er expliciet bij.** Ik heb Nova nooit gezien; het beeld komt uit 900
berichtsleutels, hun CSS en hun marketingtekst. Dat is genoeg voor gedrag, toestanden en taal, en
niet voor vormgeving en ritme. Tien schermafdrukken zouden spoor C twee keer zo scherp maken.

**De drie fouten van vandaag zijn in het plan verwerkt als voorspelling.** Ze hebben één patroon: een
laag toegevoegd en één aanroeper vergeten. Daarom jagen spoor B (de rolmatrix, met de "nee"-vakjes
eerst) en spoor D (wedstrijdcondities) expliciet op naden en niet op nieuwe modules.

**Eén som staat er nu vast in plaats van als vermoeden.** De maandelijkse meetronde plant bij twintig
klanten 4.800 taken tegelijk in; bij vijf per worker-ronde en ~18 seconden per meting is dat ongeveer
16 uur. Dat past binnen een etmaal, dus het is geen storing maar een grens die rond dertig klanten in
zicht komt. Uitrekenen nu, oplossen bij klant tien.

**Twee dingen die het plan bewust NIET doet:** geen nieuwe functionaliteit (de twee wachtende
onderdelen zouden bij een klant in maand één toch leeg zijn), en geen prestatieoptimalisatie
(optimaliseren zonder meten is de duurste manier om niets te doen).

**Het lanceerplan kreeg een tweede lat: productiewaardig, los van Nova (11 augustus 2026).** Op
verzoek, en terecht: Nova-pariteit is één maatstaf en Nova is zelf software van mensen die keuzes
maakten onder tijdsdruk. §0b van `lanceerplan.md` heeft zeven eigenschappen die uit eigen oordeel
komen en niet uit hun berichtenbestand. Vier ervan staan op "nee".

**De scherpste vondst zit in die tweede lat en niet in de Nova-vergelijking: er is geen rem op de
uitgaven.** Er is precies één plafond in de hele app, $2,15 voor de onboarding
(`onboarding-budget.ts`). Daarbuiten niets. En op 11 augustus is besloten dat een account-admin zelf
een meting mag starten (~$0,82) en een member een maand mag goedkeuren (~$2,80 aan schrijfwerk). Beide
terecht, want dat ís het product, maar een klant met acht onderwerpen kan op één middag $6,56
uitgeven zonder dat iemand het merkt, en twintig klanten die hun plan goedkeuren is $56 in één nacht.
Een maandplafond per account en een dagplafond als noodrem zijn daarmee lanceervoorwaarden geworden,
en ze staan op maandag van week 1: de rem hoort er eerder te zijn dan de test die hem nodig heeft.

**Eén verbetering op Nova, en het is er een die uit dit besluit volgt.** Bij elke knop die geld kost,
komt te staan wat het kost. Nova doet dat niet, want zij factureren per pakket en de klant ziet nooit
een aanroepprijs. ORBIT ENGINE wel: wie de prijs ziet, klikt bewuster en belt niet achteraf verbaasd.

**Twee dingen rechtgezet die ik eerder te makkelijk had opgeschreven.** Ik kán geen schermafdrukken
maken: van Nova niet (dat zit achter een inlog waar ik geen account voor heb) en van ORBIT ENGINE ook niet,
want de browser komt hier niet door de uitgaande proxy heen, drie configuraties geprobeerd, alle drie
`ERR_CONNECTION_RESET`. `curl` werkt wel, dus HTML en statuscodes kan ik lezen, pixels niet. Daarmee
zijn tien afdrukken van ORBIT ENGINE zelf het enige wat de eigenaar in dit plan moet leveren.

**Search Console en de eerste publicatie zijn van het kritieke pad gehaald.** Er is geen Google-sleutel
en publiceren kan nog niet, en de lancering hangt er niet op: Search Console is een bewijsstuk náást
de AI-meting, en de impactlus heeft pas betekenis als er een pagina live staat, wat bij een klant in
maand één sowieso niet zo is.

**Het proefmerk voor de generale repetitie is gekozen en nagekeken:** `gasservice-brabant.nl`, een
CV- en warmtepompinstallateur uit Den Bosch. Zelfde soort bedrijf en zelfde regio als Van den
Udenhout, andere branche dus geen besmetting, WordPress met 214 links op de homepage, en een
`robots.txt` die alles toestaat zodat de technische audit niet het hele beeld overstemt. Bewust niet
HEMA of Bol: een merk dat elke AI-assistent uit zijn hoofd kent, meet niets.

**Besluit 18: alleen de beheerder start betaald werk (11 augustus 2026).** 's Ochtends was besloten
dat een account-admin zelf een meting mocht starten en een member een maand mocht goedkeuren.
Diezelfde dag teruggedraaid toen de rekensom zichtbaar werd: een klant met acht onderwerpen kon op één
middag $6,56 uitgeven zonder enige rem, en twintig klanten die hun plan goedkeuren is $56 in één
nacht. Het sluit ook beter aan op `Nova.md` §1.2, waar uit hun berichtenbestand blijkt dat de klant
goedkeurt en niet maakt: zijn hele rol past in drie werkwoorden.

**De scheidslijn loopt langs geld en niet langs rol.** Elf routes stellen dezelfde vraag aan dezelfde
functie (`lib/cost-guard.ts`), en de meldingen staan in een pure module ernaast zodat ze te testen
zijn (conventie 2). Gratis handelingen blijven bij de klant: een pagina goedkeuren, als geplaatst
markeren, een feitvraag beantwoorden, het merkprofiel corrigeren. De test die erbij hoort is bewust
een broncodecontrole en geen gedragstest: de fout die je wilt vangen is niet "de controle werkt niet"
maar "er komt een route bij en iemand vergeet hem". Dat is precies hoe `getOwnedAnalysis` de
accountlaag miste.

**En de knop is weg waar het recht weg is.** Op het planscherm ziet een klant geen goedkeurknop meer
maar de zin dat hij zijn consultant akkoord geeft. Een knop tonen die een 403 oplevert is erger dan
geen knop.

**Spoor R: de meting mat de verkeerde vragen, en dat is met cijfers aangetoond.** De eigenaar merkte
op dat Van den Udenhout alleen in Brabant werkt en dat landelijke vragen hem niets zeggen. Nagerekend
op productie, en het is erger dan een smaakkwestie:

| | vragen | metingen | genoemd | score |
|---|---|---|---|---|
| Fysi-Unique, niet-regionaal | 20 | 57 | **0** | **0** |
| Fysi-Unique, regionaal | 10 | 40 | 11 | **28** |

Élke vermelding die dat merk ooit verdiende, kwam uit een regionale vraag. Van 57 betaalde metingen op
landelijke vragen leverde er niet één iets op. Drie gevolgen: twee derde van het meetbudget kocht
niets (en `web_search` is ~94% van de meetkosten), de getoonde score van 18/36/38 was systematisch
lager dan de 28 op de vragen die ertoe doen, en de gap-analyse stelde pagina's voor over een markt
waar de klant niet in zit.

**De oorzaak was conventie 1 in het klein.** Er stónd een regionale regel in `prompts.ts`, en hij
vuurde ook: Van den Udenhout had scope `lokaal` en negen plaatsen. Maar hij zei "verwerk in een deel
van de prompts een plaatsnaam", en dat is een intentie. Uitkomst: 38%. Nu staat er een aantal in de
instructie (minstens 70%) én een deterministisch vangnet erachter dat bijvult tot het klopt, met
dezelfde bijvullus die de merkneutraliteitsregel al had.

**Twee details die het verschil maken tussen werkt en werkt-bijna.** De twaalf provincies staan in de
lijst, want `service_regions` bevat alleen plaatsen terwijl een zoeker net zo vaak "in Brabant" zegt;
zonder die lijst zou precies de vraag waar het om gaat als landelijk tellen. En de woordgrenzen zijn
geen theorie: "Oss" staat letterlijk in de regio's van een Brabantse dealer en zou zonder grens
aanslaan op "grossier". 1032 unittests.

**De drempel ging van 70% naar 100%, en het argument ertegen was zwakker dan het leek.** De eigenaar
draaide dezelfde dag het "70% laat ruimte"-argument terug: een regionale klant wil alleen op
regionaal niveau beoordeeld worden, anders klopt het beeld niet. Dat is de sterkere redenering, want
een score is een **aandeel**. Meng je er vragen doorheen die dit bedrijf per definitie niet kan
winnen, dan is de uitkomst niet "iets te laag" maar onwaar. Dat Van den Udenhout in Drenthe niet
genoemd wordt, is geen tekortkoming die in zijn cijfer thuishoort. `prompts.ts` schrapt daarom na de
bijvulrondes wat er aan landelijke vragen overblijft, in plaats van het te laten staan.

**De 55 vragen zijn uitgezet op productie, en de cijfers eronder verrasten.** Alle 150 vragen blijven
bewaard (`active = false`, conventie 8); alleen de meting verandert. Drie van de vijf analyses stonden
er al goed voor: APK 25 van 30 regionaal, Private Lease Skoda 23, Schadeherstel 25. De twee nieuwste
juist niet: Auto financieren 9 en Auto leasen 13. **Hetzelfde merk, dezelfde prompt, en het model
haalde de ene keer 83% en de andere keer 30%.** Dat is niet een prompt die "meestal wel werkt", dat is
precies waarom een instructie geen garantie is.

De prijs is zichtbaar en eerlijk: met negen vragen is de onzekerheidsband ±15,0 punten in plaats van
±9. Aanvullen tot dertig regionale vragen kost ~$0,001 aan generatie maar ~$0,57 extra per meetronde,
want meten rekent per vraag. Dat is een uitgave en dus een besluit van de eigenaar.

**Het gat boven het vangnet is nog open, en het is het grootste.** Het vangnet hangt aan
`service_scope === "lokaal"`. Op productie staat dat veld bij vier van de negen profielen op `null`,
waaronder Fysi-Unique: de fysiopraktijk in Amersfoort wiens meetcijfers deze hele vondst dróegen. Voor
dat merk zou de garantie dus nog steeds niet gevuurd hebben. `resolveScope()` zet 'onbekend' bewust op
`null` (conventie 3) en dat klopt, maar daarmee is de vraag alleen verplaatst: voor de
promptgeneratie is een leeg bereik niet te onderscheiden van "landelijk", terwijl het "we weten het
niet" betekent, en bij een MKB-klant is lokaal de regel. Staat als R6 in `docs/tasks/lanceerplan.md`.

**En de poort geldt nu ook voor handwerk.** `POST` en `PATCH` op `/api/analyses/[id]/prompts` lieten
een vraag toevoegen of herschrijven zonder enige controle. De generator betaalt drie bijvulrondes voor
de regionale garantie; één tekstveld haalde hem onderuit. `regionGateMessage()` weigert nu, met een
melding die de plaatsen noemt zodat de volgende poging meteen goed is. 1039 unittests.

**R6 dicht: het werkgebied blokkeert nu het dossier.** Het eerste voorstel was een harde stop in de
pijplijn vóór de promptgeneratie. Dat bleek de verkeerde plek: het zou de bestaande profielen met een
leeg bereik laten vastlopen op iets dat in tien seconden te repareren is, en de consultant pas een
melding geven op het moment dat hij er niets meer aan kan doen. De juiste plek is het afrondingsblok,
en wel omdat het product sales-led is: de consultant zet het profiel klaar vóór het demogesprek, en
dat is precies wanneer hij dit ziet en kan zetten. "Werkgebied vastgesteld" is daar nu een blokkerende
regel, en de kop noemt hem bij naam.

`scopeSummary()` staat in `field-merge.ts` naast `resolveScope()`: de een stelt de vraag, de ander
beantwoordt hem. 'lokaal' zonder één regio telt als onbekend, want dat is exact wat `isLokaal()` ervan
maakt. Zou dat als bekend gelden, dan meldt het scherm groen terwijl de promptregel niet vuurt, en dat
is van de twee de ergere fout. De vier profielen op productie met een leeg bereik zijn bewust niet
aangeraakt: dat invullen zou een gok zijn, en conventie 3 zegt dat onbekend beter is dan verkeerd.
1049 unittests.

**F1: het budgetplafond, de tweede rem.** Besluit 18 haalde de klant weg als risicobron, maar niet
het risico. Een beheerder die zich vergist in een lus blaast een rekening net zo hard op, en een cron
die twintig keer vuurt vraagt niemand om toestemming. Tot 11 augustus 2026 was er precies één plafond
in de hele app, en dat gold alleen de onboarding van één merk ($2,15). Alles daarna kon doorlopen.

Nu twee plafonds, want ze vangen verschillende rampen: €50 per account per maand (de klant die
structureel te veel kost) en €150 per dag over alle accounts samen (het ongeluk). De bedragen komen
uit de echte cijfers: een klant met vier onderwerpen kost ruwweg €6 per maand, dus €50 laat een
factor acht ruimte en raakt een normale klant nooit. Twintig goedkeuringen op één dag is ~€52 en past
ruim onder het dagplafond. Elf routes stellen nu allebei de vragen, en de broncodecontrole in
`test-unit.ts` bewaakt dat er geen twaalfde bijkomt die er één vergeet.

**Drie keuzes die de andere kant op vallen dan je zou verwachten.** De rem faalt naar doorlaten en
niet naar blokkeren: bij "wie mag dit" is het ergste geval dat iemand even niets kan, bij "hoeveel is
er over" zou zacht falen één trage query de hele pijplijn laten stilzetten voor alle klanten. Hij is
geen exacte boekhouding: de grens wordt gecontroleerd vóór een taak, niet tijdens, dus een lopende
meetronde wordt niet halverwege afgekapt (een halve analyse is een groter probleem dan een dollar).
En een maand afwijzen gaat om de rem heen, want dat kost niets en een account met een vol plafond
moet zijn maand nog wél kunnen afwijzen.

**Migratie 0053 geeft `ai_calls` een `account_id`,** gevuld door een trigger in de database. Niet in
`ledger.ts`: dat logboek is best-effort en mag geen extra netwerkronde doen om een account op te
zoeken, want een mislukte logregel mag nooit een meting laten falen. Alle 1.140 bestaande rijen zijn
bijgewerkt, nul bleven er onverdeeld. Totaal uitgegeven sinds de start: $13,38.

**En de ketentest bewees meteen twee dingen tegelijk.** Hij viel om op een `.gte` die de shim niet
kende, precies de klasse fout waar die shim voor gewaarschuwd is. Maar de melding eronder liet zien
dat de zachte terugval werkt zoals bedoeld: de handeling ging door, luid gelogd, en niet stil
geblokkeerd. De shim kent nu `gte`, `gt`, `lte`, `lt` en `range`. 1088 unittests, 92 ketentests.

**F3: de tweeling is opgeheven.** `getOwnedProfile` en `getOwnedAnalysis` hadden allebei dezelfde
drie lagen, op twee plekken uitgeschreven. Toen migratie 0046 de accountlaag toevoegde, kreeg de
eerste hem wel en de tweede niet, en dat bleef bijna onzichtbaar doordat lezen over RLS loopt en die
de laag wel had: een uitgenodigde klant zag zijn analyses gewoon staan. Maar élke schrijfactie loopt
over deze controle, dus precies de persoon voor wie het product bedoeld is kon niets bevestigen,
niets laten schrijven en niets goedkeuren.

De reparatie van die dag was de tweede functie bijwerken. `lib/access.ts` is de reparatie van de
oorzaak: de drie lagen staan er één keer, en een vierde laag verandert voortaan één plek. Een
broncodecontrole houdt het zo, want zodra er weer een eigen `isStaff(` of `isMember(` in een van de
twee functies staat, is er een tweede oordeel bijgekomen.

**Wat er bewust niet is samengevoegd:** het ophalen van de rij. Een merk draagt zijn account direct,
een analyse niet, die hangt aan een merk en het merk hangt aan een account. Dat verschil is echt en
moet blijven, want een merk kan bij een toewijzing van account wisselen en dan verhuizen zijn
analyses vanzelf mee. Alleen het OORDEEL was dubbel, niet het opzoeken. 1095 unittests.

**Stap A9 van het lanceerplan is herschreven.** Er stond "als klant: maand goedkeuren, pagina
goedkeuren", en dat kan sinds besluit 18 niet meer. De stap toetst nu het omgekeerde: ziet de klant
een uitleg in plaats van een knop die een foutmelding geeft. Een plan dat nog uitgaat van de oude
rolverdeling toetst het verkeerde en geeft groen licht op iets dat niet meer bestaat.

**F4: verwijderen bestaat nu echt.** Conventie 8 is "alles bewaren" en besluit 14 zegt dat opzeggen
een datum zet en niets weghaalt. Die regels blijven staan, want archiveren is negen van de tien keer
precies wat iemand bedoelt met "verwijder dit". Maar de AVG kent een recht op verwijdering en dat koop
je niet af met een archief. Er is nu een tweede pad, bewust de uitzondering, en bewust omslachtig.

**Drie sloten.** Alleen een beheerder van ORBIT ENGINE: een account-admin mag zijn bedrijfsgegevens wel
wijzigen, maar een wijziging draai je terug en dit niet. Niet je eigen account, want dat verwijdert je
eigen inlog en dat herstel je niet met een backup omdat de sessie dan al weg is. En de naam moet
worden overgetypt, serverkant gecontroleerd, want een bevestiging die je met een rechtstreekse aanroep
kunt overslaan is geen bevestiging.

**Je ziet eerst wat er verdwijnt.** "Dit verwijdert 3 merken, 5 analyses en 412 metingen" is een ander
besluit dan "dit verwijdert een account". De ketentest controleert apart dat het opvragen van dat
overzicht zelf niets weggooit, want een scherm dat alleen kijkt zou anders al kunnen verwijderen.

**De structuur werkte mee, en één ding was al goed geregeld zonder dat het daarvoor bedoeld was.**
Bijna alles hangt met `on delete cascade` aan `profiles`. Maar `profiles.account_id` staat op
`no action`, en daardoor weigert de database een account weg te gooien zolang er merken aan hangen.
Dat maakt "per ongeluk een account verwijderen" onmogelijk in plaats van stil, en het bepaalt de
volgorde: eerst de merken, dan het account, dan de inlogaccounts.

**De inlogaccounts gaan mee, maar alleen van wie nergens anders bij hoort.** Dat is de kern van de
plicht: het dossier weghalen en de inlog laten staan is geen verwijdering. Wie ook lid is van een
ander account houdt zijn inlog, anders sluit het opruimen van klant A per ongeluk klant B buiten.

⚠️ **Twee dingen die eerlijk in de code staan.** Er is geen transactie omheen, want de Supabase-client
praat over HTTP en kent er geen; faalt het halverwege, dan zijn de merken weg en het account nog niet,
en dat is herstelbaar terwijl het omgekeerde dat niet is. En het kostenlogboek van die klant gaat mee,
waardoor het dagplafond die dag iets ruimer staat. Verwaarloosbaar, en het alternatief maakt een
onomkeerbare handeling ingewikkelder. 1116 unittests, 109 ketentests.

**De generale repetitie op `gasservice-brabant.nl` (12 augustus 2026).** Een vers merk, van nul, met
echt geld. De onboarding: **8,0 minuten, $0,235, acht van de acht stappen klaar, nul mislukkingen en
nul herkansingen.** 148 pagina's gelezen, 7 onderwerpen, 17 onderdelen aanbod, 10 concurrenten, 17
technische controlepunten zonder blokkades.

**De R6-zorg bleek kleiner dan gedacht.** Het onderzoek vulde zélf in dat dit een lokaal bedrijf is,
met zeven plaatsen in Brabant. De vier lege werkgebieden die op productie stonden zijn dus oude
gegevens en geen structureel gat. De blokkerende regel blijft nuttig als vangnet, maar hij zal bij een
nieuwe klant zelden aanslaan.

**De regionale regel deed wat hij belooft: 30 van de 30 vragen regionaal**, tegenover 9 van 30 en 13
van 30 bij Van den Udenhout vóór de reparatie.

⚠️ **En de repetitie vond meteen waar hij voor bedoeld was.** Vier van de dertig vragen waren
geforceerd, allemaal in de oriëntatiefase. Het scherpste voorbeeld: "Heeft regelmatig onderhoud
invloed op de levensduur van een cv-ketel in Den Bosch?" De levensduur van een ketel heeft niets met
Den Bosch te maken en niemand stelt die vraag zo. Een AI-assistent antwoordt er algemeen op, noemt
geen enkel bedrijf, en de vraag meet dus niets terwijl hij de score wél omlaag drukt.

Het probleem was niet de drempel maar wát het model met de plaats deed: het plakte hem achter een
informatieve vraag in plaats van de vraag om te bouwen naar het zoeken van een aanbieder. De
instructie noemt nu expliciet een fout en een goed voorbeeld, en zegt dat het model een andere vraag
moet bedenken als lokaal maken niet natuurlijk lukt. Dat blijft een intentie: het vangnet telt of er
een plaats in staat, niet of de vraag natuurlijk klinkt, en dat laatste is niet deterministisch te
meten. Dat hoort in het commentaar te staan in plaats van gesuggereerd te worden dat het afgedekt is.

De beslissings- en overwegingsvragen waren wél goed. "Wie kan mijn cv-ketel in Den Bosch vakkundig
onderhouden?" is precies de vraag waar deze klant gevonden wil worden.

**De meting van de repetitie: score 30, en de keten hield stand.** Dertig vragen, dertig metingen,
nul mislukkingen, 2,2 minuten. Negen vermeldingen op dertig vragen. De hele repetitie (onboarding,
analyse, meting, rapport) kostte **$0,77**, waarvan $0,61 aan `web_search`, onder de geschatte $1,10.

**Drie dingen bleken goed zonder dat er iets voor gerepareerd hoefde te worden.** De concurrentenlijst
bevat alleen echte installateurs: Rijksoverheid werd zestien keer genoemd en de Consumentenbond vijf
keer, maar allebei landen ze in `zijdelings` en niet in de concurrentenlijst. Ik verwachtte daar een
fout en vond er geen. De toelichting per concurrent is bruikbaar in plaats van alleen waar. En het
rapport noemt zijn eigen onzekerheid: "ongeveer 30 op 100, marge ongeveer ±17 punten, zie dit als een
orde van grootte, niet als een exact cijfer". Dat cijfer klopt ook: bij dertig vragen en een score van
30 is de band ±16,4.

Gasservice Brabant staat bij de eerste aanbevelingen, gemiddelde positie 2,9. Van de echte
concurrenten staat alleen Kemkens hoger.

**Wat de repetitie niet kon toetsen.** A1 is niet via de knop in de app gedaan maar met precies de
rijen die de route schrijft, want deze omgeving kan niet inloggen. Daarmee zijn de nieuwe 403
(besluit 18) en 402 (budgetplafond) nog niet in het echt gezien. Datzelfde geldt voor A6 tot en met
A10: het contentplan, de uitnodiging en het klantpad vragen allemaal een ingelogde browser.

**F5, de stille-fout-ronde: vier vondsten, en de eerste raakt de hele pijplijn.** In `lib/` staan 118
queries en 97 schrijfacties zonder foutcontrole. Die allemaal omhullen levert meer ruis dan waarde,
want de meeste lezen één rij waar `null` een echte toestand is. De vraag was dus niet waar een
controle ontbreekt, maar waar een storing leidt tot geld, een verkeerd getal, of stil verlies.

**Elke idempotentiecontrole faalde de verkeerde kant op.** Conventie 9 zegt dat elke stap controleert
of zijn werk al gedaan is vóór een dure aanroep, en dat stond overal als `if ((count ?? 0) > 0)
return`. Gaat die telling stuk, dan is `count` niet een getal maar `null`, en `null ?? 0` is 0, dus
"er staat nog niets", dus de dure aanroep gaat alsnog. De bescherming tegen dubbel betalen faalde
precies op het moment waarop een taak opnieuw geprobeerd wordt, want dat is hetzelfde moment waarop de
database hapert. Het commentaar bij `offering.ts` zei letterlijk "een retry mag geen tweede keer
betaald worden", terwijl de code dat niet waarmaakte. `lib/require-count.ts` gooit nu in plaats van te
gokken, op zeven plekken.

**De duurste zat in de werker.** Het afvinken van een gelukte taak was een kale `await`. Mislukt die
update, dan blijft de taak op `running`, pakt `reclaim_stuck_jobs` hem terug, en wordt het werk
opnieuw gedaan: bij een meting dertig betaalde web-zoekacties voor een uitkomst die er al was. Nu drie
pogingen op de boekhouding en niet op het werk, want het werk is dan al gelukt en opnieuw gooien zou
precies veroorzaken wat we willen voorkomen.

**Een storing die zich voordeed als een afwezigheid.** De Google-sleutel gaf `null` in drie gevallen:
leeg, kapotte JSON, of ontbrekende velden. Eén melding voor alle drie: "de sleutel is nog niet
ingesteld". Bij een kapotte sleutel stuurt die zin je iets instellen dat er al staat. Een verkeerde
diagnose kost meer tijd dan geen diagnose. Nu drie toestanden met drie meldingen.

**En een stille nul die werk liet verdwijnen.** Het aantal beantwoorde feitvragen zit in de
dedupe-sleutel van een contenttaak. Faalt die telling en wordt hij 0, dan botst de sleutel met een
eerdere poging waarin er écht nul antwoorden waren, en wordt de taak als dubbel gezien en niet
ingepland. De klant beantwoordt drie vragen, verwacht een herschreven pagina, en er gebeurt niets.

**Eén plek blijft bewust zacht.** `determineStage()` kiest alleen welk voortgangsscherm getoond wordt,
en dat scherm haalt daarna zelf de stand op. Hard falen zou een zelfherstellend schoonheidsfoutje
inruilen voor een pagina die het niet doet. Die afweging staat in de code, anders repareert iemand hem
later alsnog. 1131 unittests, 109 ketentests.

**F4 heette af en was dat niet.** De veiligheidscontrole van Supabase vond binnen een minuut wat ik
gemist had: migratie 0025 maakte bij een dataopschoning van elke aangeraakte rij een kopie in
`_backup_20260729`, 51 momentopnamen van vragen, entiteiten, geschreven pagina's, rapporten en scores.
Die tabel heeft geen verwijzing naar `profiles`, dus de cascade raakt hem niet. Een "volledig
verwijderde" klant was uit elk scherm verdwenen terwijl zijn teksten er nog stonden, in een tabel die
niemand meer bekijkt. Dat is precies het restant waar de AVG over gaat.

Nu wordt de opruiming vóór de merken gedaan, want daarna zijn de id's zelf verdwenen en is er niets
meer om op te matchen. De ketentest zet er een momentopname neer en controleert dat hij verdwijnt, dus
dit kan niet opnieuw wegglippen.

**Wat de controle verder liet zien.** Geen enkele tabel staat zonder rijbeveiliging, en de tabellen
zonder regels (`jobs`, `account_invites`, `ai_calls`, `staff_users`) zijn juist de dichtgetimmerde:
dat is een gesloten deur, geen open deur. Wel open: bescherming tegen gelekte wachtwoorden staat uit
in Supabase Auth, en drie functies met verhoogde rechten zijn aanroepbaar via de REST-API, waaronder
de trigger die ik vanochtend zelf toevoegde. Die staan in het lanceerplan als openstaand.
110 ketentests.

**De promptverdeling is per analyse instelbaar (12 augustus 2026, migratie 0054).** Standaard blijft
10/10/10, en per analyse kun je dat wijzigen. Per ANALYSE en niet per merk, op verzoek van de
eigenaar en om de juiste reden: de goede verdeling hangt aan het onderwerp, niet aan het bedrijf.
Dezelfde installateur wil bij "cv-ketel onderhoud" vooral beslissingsvragen ("wie kan dit voor mij
doen in Den Bosch") en bij "warmtepomp subsidie" juist oriëntatievragen, want daar is de koper nog
aan het uitzoeken wát hij wil.

**Nul is een keuze en geen leegte.** Een analyse zonder oriëntatievragen is geldig voor een lokale
ondernemer die alleen op koopmomenten beoordeeld wil worden. Overal in de keten is dat expliciet
afgehandeld: `resolveMix` valt per fase apart terug op de standaard en gebruikt geen `??` (dat zou
nul wegrekenen), een fase met nul krijgt géén taak, en de generatie ziet een lege uitkomst dan niet
als storing.

**Het scherm zegt wat het kost vóórdat je op start drukt.** "60 vragen per meetronde, ongeveer $1.44
per maand voor dit onderwerp. De onzekerheidsmarge op de score is dan ongeveer ±11,6 punten." Beide
getallen komen uit echte data: $0,024 per vraag, gemeten over 428 metingen op productie, en de marge
uit dezelfde binomiale rekensom als `lib/stats/uncertainty.ts`. De marge schaalt met de wortel, dus
verdubbelen levert een kwart smallere band en niet de helft. Dat hoort iemand te weten vóór hij het
getal omhoog zet en niet pas op de rekening.

**De generatie is gesplitst in één taak per funnelfase, en dat moest sowieso.** De gezamenlijke taak
liep op productie één keer 228 seconden van de 300 die hij heeft. Met meer vragen per fase zou hij
daar overheen gaan en middenin worden afgekapt. Drie taken van ~76 seconden houdt ruimte over, en het
is bovendien conventie 7: één taak doet hooguit één zware AI-aanroep.

**Twee vallen die de splitsing zelf introduceerde, allebei afgevangen.** De poort naar
klant-goedkeuring mag pas open als álle fasen klaar zijn; zou de eerste fasetaak hem openen, dan ziet
de klant een derde van zijn vragen met de mededeling dat ze klaar zijn. En de controle "is dit een
mislukte voorbereiding of een mislukte meting" keek naar "zijn er al vragen"; slaagt fase één en
mislukt fase twee, dan zíjn er vragen en zou de herkansing afketsen, waarna de analyse voorgoed op
'mislukt' blijft staan met een derde van zijn vragen. Die controle vraagt nu of élke fase die vragen
hoort te hebben, ze ook heeft.

⚠️ **En de ronde van vanochtend had er één gemist.** De idempotentiecontrole in `prepare.ts` die
bepaalt of de vragen al bestaan, stond nog op het oude `if (!count)`. Exact het patroon dat F5 moest
uitroeien: gaat de telling stuk, dan luidt de conclusie "er staat nog niets" en wordt een hele
funnelfase opnieuw gegenereerd en betaald. Nu ook op `requireCount`. 1154 unittests, 119 ketentests.

**De maandmeting heeft een tijdslot gekregen (12 augustus 2026).** De maandelijkse taak keek alleen of
er al een volgende periode bestond, niet of de vorige meting lang genoeg geleden was. Het bewijs stond
in de database: Fysi-Unique had periode 0, 1 en 2 op 30, 30 en 31 juli. Bij die analyse waren dat
handmatige testrondes, maar dezelfde weg staat open voor een echte klant, en daar gebeurt het vanzelf:
onboard je iemand op 28 augustus, dan meet de taak op 1 september alweer. Een volle betaalde ronde
vier dagen later, en een punt op de trendlijn dat vier dagen verandering toont alsof het een maand is.

De grens staat op 21 dagen en niet op 28, omdat een maand 28 tot 31 dagen duurt: bij 28 valt een klant
die op de 3e gemeten is er nét binnen en een klant van de 5e er nét buiten, zonder dat er iets aan hem
anders is. Overslaan kost niets; te vroeg meten kost geld en zet een punt in een grafiek dat er nooit
meer uitgaat. De taak meldt nu ook wát hij oversloeg en waarom, want "waarom is deze klant niet
gemeten" is precies de vraag die je dan stelt.

**Gearchiveerd werk wordt overgeslagen.** De maandronde filtert gearchiveerde analyses al, maar de
taken die er op dat moment al stonden niet. Nu slaat de werker ze over. Dit is geen fout die een klant
kan uitlokken, want archiveren gebeurt met SQL en niet met een knop; het maakt die handmatige actie
wel veilig.

⚠️ **En er is vandaag iets echt kapotgegaan, kort maar volledig.** Migratie 0055 trok het uitvoerrecht
in op vier functies die de veiligheidscontrole van Supabase aanwees als "aanroepbaar via de API".
Drie daarvan worden in RLS-regels gebruikt, en een RLS-regel wordt geëvalueerd namens de bevragende
rol. Zonder dat recht faalt niet de regel maar de héle query: een ingelogde gebruiker kon niets meer
lezen, op 28 tabellen tegelijk. Een paar minuten zo op productie gestaan, meteen teruggedraaid.

De les zit niet in de fout maar in wat eromheen ontbrak: er was geen enkele test die "een ingelogde
gebruiker kan lezen" bewaakte. Die is er nu, en algemener dan het geval dat hem brak: élke functie die
in een RLS-regel voorkomt moet aanroepbaar zijn door `authenticated`. Ik heb die test rood gemaakt om
te bewijzen dat hij de fout vangt, want een test die nooit gefaald heeft bewijst niets.

De melding voor de andere drie blijft dus staan, en dat is een bewuste keuze: ze leunen op
`auth.uid()` en geven een niet-ingelogde bezoeker een lege lijst terug. De nette oplossing is ze naar
een niet-aangeboden schema verplaatsen, maar dat betekent 36 RLS-regels opnieuw aanmaken. Dat is
echt risico voor een melding zonder echt gevolg. 1166 unittests, 125 ketentests.

**De rolmatrix, leeskant: elk tweede teamlid zag een leeg dossier, en geen enkele test kon dat ooit
zien.** Bij het narekenen van wie wat mag zien bleek: `analyses` en `profiles` kennen drie lagen om
te lezen (eigenaar, account, beheerder), maar de 23 tabellen die eraan hangen, de vragen, de
metingen, het rapport, de geschreven pagina's, hadden er maar twee: eigenaar en beheerder. De
accountlaag ontbrak.

De historische eigenaar (`user_id`) is precies de ene gebruiker die "Merk toewijzen" kiest. Elke
volgende collega of bureaumedewerker die je bij hetzelfde account uitnodigt, komt binnen via
`account_users`, en voor hem kwam elk hoofdstuk van het dossier leeg terug. Niet een foutmelding: nul
vragen, geen score, een leeg rapport. Dezelfde soort fout als `getOwnedAnalysis` op 11 augustus, nu op
de leeskant en over 23 tabellen tegelijk in plaats van één functie.

**En geen enkele test kon dit ooit zien, om een structurele reden.** De ketentest draait bewust met de
service-role, die RLS omzeilt, om de pijplijn te kunnen testen. Maar een dossierpagina leest met de
sessie van de klant, dus mét RLS, en die kant werd nergens getoetst. `auth.uid()` gaf in de testopzet
altijd `null` terug, dus zelfs een test die het geprobeerd had, was nergens gekomen.

**Migratie 0056 voegt op 23 tabellen een accountregel toe**, naast de bestaande regels en niet in de
plaats ervan (Postgres combineert regels met OR, hetzelfde patroon als migratie 0038). Getest op
productie met een tijdelijke echte gebruiker: vóór de reparatie 0 vragen zichtbaar voor een teamlid,
erna 30, 30 metingen, het rapport, 52 concurrentregels, 148 pagina's. Een vreemde bleef op 0, dus dit
repareert een deur die te veel dichtzat en opent er geen die open hoort te blijven.

**En de testopzet zelf is voortaan in staat dit na te rekenen.** `auth.uid()` leest nu echt
`request.jwt.claim.sub`, en de test kent voortaan tabelrechten toe zoals Supabase dat buiten onze
migraties om al deed. Een nieuwe ketentest zet vier rollen tegenover elkaar (eigenaar, teamlid,
beheerder, vreemde) en is met opzet rood gemaakt om te bewijzen dat hij dit gat vangt. 1166
unittests, 132 ketentests.

**Wedstrijdcondities: drie situaties nagerekend, één bleek echt kapot.** Aansluitend op de
rolmatrix drie vragen doorgerekend over wat er gebeurt als twee dingen op precies hetzelfde moment
gebeuren, met echte gelijktijdige aanroepen (`Promise.all`) tegen echte Postgres, niet in mijn
hoofd.

Een maand twee keer tegelijk goedkeuren (`approveMonth`) bleek al veilig: de `UPDATE ... WHERE
status <> 'goedgekeurd'` in `lib/plans.ts` laat de database zelf beslissen wie wint, dus precies één
van de twee aanroepen zet `approved_by_user_id`. Dat is bewezen, niet aangenomen.

Een pagina verwijderen (`removePage`) bleek dat niet. De functie las eerst of een pagina nog
`gepland` was, en besliste dáárna, op die verouderde lezing, of de buffer van die maand moest
inschuiven. Precies tussen die lezing en die beslissing kan de content-taak de pagina al naar
`geschreven` hebben gezet: dan schuift de buffer alsnog in voor een plek die al gevuld was, en
staat er een geschreven pagina naast een buffer die er niet had hoeven komen. Voor de klant
betekent dat een maand die stilzwijgend een pagina te veel toont, of een buffer die "verdwenen" is
zonder dat iemand hem gebruikt heeft.

Gerepareerd door dezelfde soort voorwaardelijke `UPDATE` als bij `approveMonth`: de database
beslist met `WHERE status = 'gepland'` op het moment zelf, niet een `SELECT` ervoor. Bij het
nabouwen van de proef kwam er een tweede, kleinere race boven water in dezelfde functie: twee
pagina's die vrijwel gelijktijdig verwijderd worden in dezelfde maand konden dezelfde buffer allebei
claimen, zodat de ene verwijdering denkt dat hij is opgevuld terwijl dat niet zo is. Eén extra
voorwaarde (`is_buffer = true` in de claim-update) sluit ook dat. Beide routes zijn met opzet eerst
rood gemaakt (de guard tijdelijk weggehaald) om te bewijzen dat de proef het gat echt vangt, en
daarna weer dichtgezet.

De derde vraag, of twee tegelijk lopende achtergrondtaken elkaar dezelfde klus kunnen laten doen, was
al gesloten door het werk van eerder deze week: `claim_jobs()` pakt een taak atomisch met een
databaseslot, en dat is al met een ketentest bewezen. 1166 unittests, 145 ketentests.

**De potentiescore: hoeveel is er te winnen, en is dat overal met dezelfde meetlat gemeten.** De
product owner wilde zien wat het advies al impliciet deed: een pagina is pas een grote kans als de
klant er nog niet zichtbaar is ÉN veel mensen ernaar zoeken, niet bij één van de twee alleen. De
eerste helft (zichtbaarheidsgat) stond er al. De tweede (zoekvolume) bestond ook, maar als een losse
gok per analyse: elke analyse kreeg de opdracht "gebruik de volle schaal 0 tot 100" op zijn eigen
dertig vragen, waardoor de zwaarste vraag van een piepklein nichemarktje op precies dezelfde manier
bij 100 uitkwam als de zwaarste vraag van een grote markt. Twee analyses met elk hun eigen 0-100 zijn
niet te vergelijken, en dat is precies wat "eerlijk over analyses heen" moest oplossen.

De oplossing raakt niet de per-analyse-schatting zelf, die blijft bestaan als ruwe invoer
(`prompts.volume_estimate`). Er komt een tweede, nieuwe stap overheen die ALLE onderwerpen van een
merk in één aanroep tegen elkaar afzet, met vier vaste ijkpunten in de instructie ("wasmachine kopen"
is bijna altijd hoog, een specifieke behandelvraag binnen één vakgebied ligt in het midden), zodat de
schaal bij elke herberekening hetzelfde blijft betekenen. Die stap draait zodra een onderwerp zijn
eerste rapport krijgt, en herschrijft dan ALLE onderwerpen van het merk, ook de onderwerpen die zelf
niet veranderd zijn. Bewezen met een ketentest die twee onderwerpen kalibreert (het zwaarste komt op
100), er dan een derde, groter onderwerp bij zet, en narekent dat het EERSTE onderwerp zakt van 100
naar 84, puur omdat er nu een groter onderwerp meedoet: exact het gedrag dat de vraag beschreef.

Drie getallen, niet één, allemaal 0-100: zichtbaarheid, zoekvolume, en de potentie die het product van
de twee is (vermenigvuldigen, niet optellen: een onderwerp waar het merk al overal genoemd wordt heeft
potentie 0, hoe hoog het zoekvolume ook is). Zichtbaar op het analysedossier, bij elke voorgestelde
pagina vóór hij geschreven wordt, en bij elke geschreven pagina in de bibliotheek. Eén addertje
onderweg: de score die al op het scherm stond (`weighted_score`) is zelf al vermenigvuldigd met een
grove volumeschatting, dus de nieuwe "zichtbaarheid" moest een verse, ongewogen telling worden, anders
was zoekvolume twee keer meegeteld in de potentiescore.

Wat nog niet gebouwd is, staat met opzet in `docs/tasks/potentiescore.md` en niet stilzwijgend
weggelaten: de Kansen-lijst sorteert nog niet op dit nieuwe getal, en het contentplan blijft nog de
dag-1-gok van `profile_topics.priority` aanhouden in plaats van mee te bewegen met een score die na
de lancering van een onderwerp blijft veranderen. En de trigger die dit alles in gang zet, ligt in
`generate_report`, een functie die in deze codebase nog geen enkele ketentest heeft: een bestaand gat
dat dit werk erft, niet zelf veroorzaakt. 1191 unittests, 157 ketentests.

**De potentiescore, fase 2 en 3: het getal moest ook ergens iets DOEN, niet alleen staan.** Fase 1
toonde het getal, maar liet de twee plekken waar ORBIT ENGINE zelf al een volgorde koos, de Kansen-lijst en
het contentplan, ongemoeid op hun oude sortering staan: de eerste op een grover, per-analyse gewicht
(`share`), de tweede op de eenmalige dag-1-gok van het model (`profile_topics.priority`). Dat was het
overgebleven gat: een klant kon een hoge potentiescore op een pagina zien staan, en toch zag hij die
pagina niet bovenaan de lijst van wat hij eerst zou moeten doen.

Beide sorteringen kregen de potentiescore als eerste sleutel, met hun oude gedrag als vangnet: mist een
kans of onderwerp de potentiescore nog (dit merk had nog geen enkele profielbrede herberekening), dan
valt de sortering terug op precies wat er vóór vandaag stond. Bewust géén nieuw gedrag voor een merk
dat nog niets gemeten heeft. Voor het contentplan geldt bovendien: dit raakt alleen een NIEUW gebouwd
plan, nooit een jaarplan dat een klant al gezien heeft, dat zou onder hem verschuiven zonder dat hij
iets deed.

Bewezen tot op het niveau van de echte functie, niet alleen de rekenkern: een ketentest roept de echte
`createPlan()` aan tegen een echte Postgres, met twee onderwerpen waarvan het ene de hoogste
dag-1-prioriteit heeft (9) maar amper nog iets oplevert, en het andere de laagste prioriteit (1) maar
de echte kans is (nog nergens zichtbaar, hoog zoekvolume). Het contentplan zet het tweede onderwerp
vooraan.

Bewust laten liggen: de gewogen zichtbaarheidsscore die al maanden op elk scherm staat, laten
overstappen van de grove volumeband naar de nieuwe index. Dat cijfer draagt de trendlijn van elke
klant, en het met terugwerkende kracht laten meebewegen is een eigen afweging die deze bouwronde niet
vanzelf mocht meenemen. 1201 unittests, 160 ketentests.

**Sjabloondetectie: content die technisch past op de site van de klant, niet alleen inhoudelijk klopt
(13 augustus 2026).** ORBIT ENGINE leverde content altijd als platte Markdown/HTML, ongeacht of de klant een
WordPress-site met een FAQ-accordion had of een custom site zonder één uitklapblok. De klant moest dan
zelf ombouwen, precies het "technisch één op één plakbaar" dat het product beloofde niet waarmaakte.

De crawl in fase 0 haalt toch al de ruwe HTML van elke pagina op en gooit die daarna weg; er hoefde dus
niets extra opgehaald te worden, alleen iets extra herkend vóórdat die HTML verdwijnt
(`lib/pipeline/template-detect.ts`): welk CMS de site waarschijnlijk gebruikt (aan concrete
asset-vingerafdrukken, geen gok), of er al FAQ-accordions of citaatblokken zijn, hoe diep de
koppenstructuur gaat. Opgeslagen als een nieuw `profile_facets`-facet `sjabloon`, nul AI-kosten. Een
tweede, aparte module (`lib/pipeline/content-export.ts`) vertaalt daarna dezelfde gegenereerde content
naar die vorm: bij WordPress de hele pagina als Gutenberg-blokken, elders alleen de FAQ als
`<details>`-accordion als de site dat patroon al kent. Geen van beide is een AI-aanroep: de schrijver
levert de inhoud, code levert de garantie over de opmaak (conventie 1). Zonder enig herkend signaal
toont het scherm gewoon de bestaande generieke exportknoppen, geen knop die niets toevoegt (conventie 3).

Terzijde gevonden: `renderMarkdown()` (`lib/markdown.ts`) escapet een regel eerst en herkent de
structuur daarna, en de citaatregex zocht nog naar het kale `>` terwijl dat na het escapen allang
`&gt;` was. Elk citaat dat het schrijvende model ooit met `> ` opmaakte, stond dus als kale tekst
`&gt; ...` op een gepubliceerde pagina in plaats van als opgemaakt citaatblok, sinds de bouw van deze
functie, zonder dat een test dat ooit had gezien. Gerepareerd in dezelfde ronde. 1233 unittests, 160
ketentests.

**Het merkdossier gesplitst in subpagina's, klant-feedback op het scherm zelf (14 augustus 2026).**
`/profielen/[id]/page.tsx` was 525 regels en negen ongelijksoortige blokken: een leesscherm ("wat
weten we"), drie werkschermen ("vul aan", "corrigeer", "wijs toe") en gereedschap ("techniek",
"profielgegevens", "concurrenten", "beheer") stonden allemaal onder elkaar, met een primaire knop
bovenaan die naar een heel ander scherm verwees. De klant die het scherm bij Gasservice Brabant
opende, noemde het letterlijk een vergaarbak.

Elk blok dat geen leesstof was kreeg een eigen subpagina onder "Merkdossier" in de zijbalk (`lib/nav.ts`,
negen kinderen: Merkprofiel, Producten, Aanvullen, Toevoegingen, Search console, Techniek,
Profielgegevens, Concurrenten, Beheer). De zijbalk (`components/sidebar.tsx`) klapt zo'n groep nu
automatisch open zodra je op de hoofdpagina of een van zijn subpagina's zit, en dicht overal elders:
geen knop, geen te onthouden state.

Twee blokken bleken bij nader inzien output van analyses, niet van het merkdossier, en verhuisden mee:
"Onderwerpen om op te meten" (de `TopicsPanel`) werd `/analyses/aanbevolen`, onder "Clusters" (de
zijbalk noemt "Analyses" nu "Clusters"). "Waar begin je" (`OpportunitiesBlock`) is in werkelijkheid geen
output van één analyse maar van `loadLoop()` over ALLE analyses van een merk heen (`lib/insights-data.ts`
deelt die query bewust met "Wat er deze maand gebeurde"); die twee blijven daarom samen, en verhuisden
naar de merk-gefilterde `/analyses`-lijst in plaats van naar één analysescherm. De feitenvragen die uit
een specifieke analyse komen (`fact_requests.analysis_id` gezet, bv. "CV-ketel onderhoud") verschenen
voorheen op het merkscherm; ze staan nu bij hoofdstuk 03 van díe analyse ("Wat je nu moet doen"), naast
de aanbevolen pagina's die ze mogelijk maken. Vragen uit de nulmeting zelf (`analysis_id is null`) bleven
"Aanvullen" onder Merkdossier.

Wat overblijft op `/profielen/[id]` is precies twee dingen: is het dossier compleet
(`ProfileReadinessPanel`, ankers verwijzen nu naar de juiste subpagina's) en wat weet ORBIT ENGINE over de klant
uit de nulmeting (de samenvatting plus de nulmeting per vraag). De primaire knop en de springlinkbalk
bovenaan (`ProfileHero`) zijn weg: beide wezen naar blokken die nu een eigen bestemming in de zijbalk
hebben, dus is een tweede navigatielaag erbovenop overbodig. 1233 unittests, 160 ketentests.

**De rangordetabel: "Jij" hoort niet altijd bovenaan te staan (13 augustus 2026).** Aanleiding was
een screenshot van een concurrent met een nette ranglijst: merk, vermeldingen, positie, aandeel. De
eerste vraag was welke van die cijfers ORBIT ENGINE al had, en het antwoord was: bijna allemaal, alleen
verspreid. `competitor_breakdown` bewaart sinds migratie `0029` al `avg_position` en
`first_mention_count` per concurrent, maar de bestaande balkjes (`CompetitorCard`) lazen daar alleen
`mentions_count` uit.

Belangrijker dan het ontbrekende scherm was een scheve aanname die pas opviel bij het bouwen: de
balk van "Jij" toont het percentage van de hoofdscore (genoemd ÷ **winbare** vragen), de balken van
concurrenten tonen genoemd ÷ **alle gemeten** vragen. Twee verschillende noemers, onzichtbaar zolang
je zelf altijd de eerste rij was. Een rangorde-tabel die belooft "hier sta je écht tussen de rest"
houdt die belofte niet als de rekensom voor jezelf anders is dan voor de rest. `brand-rankings.ts`
rekent daarom iedereen over dezelfde noemer, en "Jij" komt op de plek terecht die de cijfers
aanwijzen: in de testcase staat een concurrent met 18 vermeldingen boven een eigen merk met 8,
precies andersom dan de oude balkjes het altijd toonden.

Bewust een lege cel in plaats van een gegokt getal: het percentage "eigen site als bron gebruikt"
wordt alleen voor het eigen domein gemeten, een concurrent-versie ervan zou een cijfer zijn dat nooit
gemeten is. 1250 unittests, 160 ketentests.

**Diezelfde dag alsnog opgelost: de citatiekolom werkt nu ook voor concurrenten.** "Is dit mogelijk
alsnog te repareren" was de logische vervolgvraag, en het antwoord was ja, zonder dat er ooit een
domein van een concurrent is opgeslagen. `citesOwnSite()` (`lib/entities/normalize.ts`) hergebruikt
de al bestaande merknaam-normalisatie (`isSameEntity()`) om een geciteerd domein tegen een merknaam
te leggen, "coolblue.nl" en "Coolblue" normaliseren toch al allebei naar "coolblue". Migratie `0058`
voegt `competitor_breakdown.citation_count` toe, `measure.ts` vult hem bij elke nieuwe aggregatie.

Twee dingen bewust niet gedaan. Geen backfill van bestaande periodes: dat zou de matchlogica in SQL
moeten naspiegelen, en twee implementaties van dezelfde regel lopen vroeg of laat uiteen. Bestaande
periodes tonen dus een streepje tot de eerstvolgende meting, nooit een 0% die er niet hoort te staan,
en dat onderscheid (nooit berekend versus berekend-en-nul) is in dezelfde ronde ook op "Aanbevolen"
en op het eigen merk toegepast, waar diezelfde stille aanname al langer sluimerde. En geen
ketentest tegen een echte aggregatie: `measure.ts` heeft dat spoor nooit gehad (hetzelfde gat als bij
de generate_report-trigger, fase 1 hierboven), dus dit is getoetst tot op de pure functies, niet
end-to-end op productie. 1257 unittests, 160 ketentests.

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

Dezelfde dag kwam het tweede document van Outer Orbit: de volledige merkstrategie voor de
Nederlandse markt, bedoeld om aan een reclamebureau te overhandigen. Positionering, vier personas,
de tien meest gehoorde bezwaren met hun antwoord, tone of voice, visuele richting, campagnepijlers.
Vastgelegd als `docs/merkstrategie.md`, naast en niet in `visie.md`: het ene document gaat over wat
het product wordt, het andere over hoe het merk daarover praat.

**De aangeleverde tekst had vier fouten die hersteld moesten worden vóór vastlegging**, en de eerste
twee zeggen iets over hoe zo'n document ontstaat. Op twee plekken stond "inORBIT ENGINEtie": een
zoek-en-vervang van "Nova" naar "ORBIT ENGINE" was middenin het woord "innovatie" terechtgekomen,
want daar zitten diezelfde vier letters in. Precies dezelfde valkuil die bij de rebrand van de code
is vermeden door op woordgrenzen te matchen in plaats van op losse letterreeksen.

Ernstiger: op vier plekken (§22.2, §24, §25, §28) heette het eigen merk **InSpace**, terwijl §1 en
§2 consequent Outer Orbit aanhouden. InSpace is in dit project de concurrent, degene wiens twee live
applicaties in `tasks/nova-analyse.md` uit hun eigen berichtenbestand zijn gereconstrueerd. Een
merkdocument dat zijn eigen merk verwart met dat van de concurrent is meer dan een typefout, dus de
correctie is uitgeschreven in §29 van dat document in plaats van stil doorgevoerd.

**Wat het oplevert, is de lijst in §30: vijf plekken waar de merkbelofte iets zegt dat de app niet
waarmaakt.** Twee daarvan waren al bekend uit `visie.md` (doelgroep en autonomiegraad). Twee zijn
groter dan gedacht: het merkverhaal verkoopt SEO én GEO als één geheel terwijl er alleen GEO
gebouwd is, en het belooft op drie plekken publicatie via het CMS. Die koppeling is op 10 augustus
2026 expliciet buiten scope gezet (hierboven, "buiten scope op verzoek"), publiceren gaat met de
hand via "markeer als geplaatst". De app herkent wél welk CMS een site draait, maar schrijft er niet
naartoe. Dat is het verschil tussen een campagne die werkt en een demo die vastloopt op de vraag
"laat maar zien dan".

Het vijfde punt is klein maar het legt iets bloot dat niemand ooit hardop besloten heeft. De
merkstrategie wil minimalistisch en neutral-first, expliciet zonder "neonpaarse AI-gloed". De app
ís al neutral-first, dus dat botst nauwelijks. Maar het hele designsysteem is afgeleid van de
werkomgeving van InSpace Nova (§30 hierboven, peildatum 6 augustus 2026), en dit document
positioneert Outer Orbit juist als iets eigens. Zolang de app eruitziet als een afgeleide van de
concurrent, werkt de vormgeving tegen de positionering in. Dat is een besluit voor de eigenaar en
het staat opgeschreven zodat het gesteld wordt, niet opgelost omdat een AI dat wel handig vond.

## 17 augustus 2026: de appstructuur, fase 1 (adressen en hoofdstukken)

**Wat het probleem was, in cijfers.** De zijbalk toonde een klant 7 regels die uitklapten naar 15
bestemmingen. Eén van die regels, "Mijn merk", had er in zijn eentje negen, en het commentaar in
`lib/nav.ts` noemde die groep zelf al "de vergaarbak die dit oplost alleen verticaal". Alle 27
velden van de merkprofiel-wizard stonden bovendien óók in het profielgegevens-scherm (41 velden):
twee menu-items, twee schermen en twee opslagroutes voor dezelfde kolommen, waarvan het ene scherm
een deelverzameling van het andere was. Er waren 26 schermen en geen enkele startpagina.

**Wat fase 1 doet.** Elk merkscherm staat nu onder `/merk/[id]/` in plaats van onder
`/profielen/[id]/`. Zonder die verhuizing zou "profielen" in de adresbalk staan op een scherm dat
over zoekverkeer gaat. De zijbalk groepeert sinds deze ronde een platte lijst bestemmingen op hun
hoofdstuk (`hoofdstukken()` in `lib/nav.ts`), in de vaste volgorde Overzicht, Strategie, Analytics,
Merkprofiel, Instellingen, met Admin onder een scheidingslijn. Hooguit drie kinderen per kop, en
een kop zonder bestemmingen wordt niet getoond.

**Strategie staat vóór Analytics, en dat is geen cosmetiek.** Wie inlogt wil weten wat hij moet
doen, niet browsen in data. Overzicht draagt het hoofdcijfer al, Analytics is verdieping en
Strategie is handelen. Nova ordent zijn vier bestemmingen om dezelfde reden zo.

**Dertien oude adressen geven een 308.** De eigenaar deelt demolinks naar die adressen, dus een
dood adres kost hier een gesprek en niet alleen een klik. De lijst staat in `lib/redirects.ts` en
niet in de configuratie: hij bepaalt een uitkomst, dus loopt `scripts/test-unit.ts` hem na
(conventie 2). Alle dertien zijn nagelopen tegen een draaiende productiebuild en gaven een echte
308 naar hun eindadres.

**Elke verwijzing wijst naar het EINDadres, niet naar een tussenstation.** Een 308 blijft in de
browsercache staan en is niet terug te nemen, dus `/profielgegevens` wijst nu al naar
`/merkprofiel/bewerken` (waar fase 2 de twee formulieren samenvoegt) en `/producten` naar
`/merkprofiel` (waar het aanbod als blok staat). Dat betekende dat fase 1 de schermen zelf mee moest
verhuizen in plaats van alleen het spoor te leggen: een permanente verwijzing naar een adres dat nog
niet bestaat is geen fundament maar een dood einde. `/merkprofiel/bewerken` toont daarom tijdelijk
twee formulieren, met de reden erbij op het scherm.

**Eén toegangscontrole in plaats van elf.** `app/(app)/merk/[id]/layout.tsx` stelt de rechtenvraag
één keer met `getOwnedProfile()`, dezelfde drie lagen die de schrijfroutes gebruiken. Een gebruiker
die niet bij het merk hoort krijgt een 404 en geen 403: een 403 bevestigt dat het merk bestaat.

**Twee functies uit een servercomponent getrokken naar een pure module**, omdat ze anders niet te
testen waren: `findGaps()` (`lib/profile-gaps.ts`, de open punten op het merkprofiel) en de
doorverwijzingenlijst. Unittests van 1257 naar 1332.

## 17 augustus 2026: de appstructuur, fase 2 (het merkprofiel)

**Twee formulieren voor dezelfde kolommen.** De merkprofiel-wizard had 27 velden en toonde per veld
waar de waarde vandaan kwam. De platte editor ernaast had er 41, zonder herkomst, met een eigen
opslagroute naar precies dezelfde kolommen in `profiles`. Het ene scherm was dus een
deelverzameling van het andere, ze stonden als twee menu-items naast elkaar, en de klant kon niet
zien welk van de twee won.

**De wizard heeft gewonnen, en heeft er veertien velden bij gekregen.** Zeven stappen in plaats van
vijf: Je bedrijf (8), Je merk (3), Je klant (6), Hoe je klinkt (6), Je woorden (5), Wie het schrijft
(7), Waar je om bekend wilt staan (6). Die laatste stap heeft Nova niet, en het is juist de stap die
bepaalt wat een AI-assistent over je kán zeggen: zonder harde cijfers wordt elke tekst algemeen, en
algemeen wordt niet geciteerd.

**41 in, 41 uit, en de test faalt nu in beide richtingen.** Er stond al een test die controleerde
dat elk wizardveld opgeslagen mag worden; die ving op 10 augustus een echte bug (`proof_points`
stond in de wizard en niet in de opslaglijst, de klant kreeg "opgeslagen" te zien en de waarde was
weg). De andere kant ontbrak, en die is sinds deze ronde het gevaarlijkst: nu de platte editor weg
is, is een opslaanbaar veld zonder stap een veld dat de klant nergens meer kan corrigeren. Zonder
foutmelding, want het veld is er gewoon niet meer.

**Twee nieuwe soorten invoer.** Een `keuze` slaat een wóórd op dat in een database-constraint staat
(`lokaal`, `dienstverlener`) in plaats van een nummer, met een test die de waardenlijst tegen de
labels legt: loopt die scheef, dan kiest de klant "Lokaal" en komt er "landelijk" in de database.
En `personas` is het enige veld dat geen tekst of tekstlijst is.

**Wat géén merkveld is, staat buiten de wizard.** Hoe grondig ORBIT ENGINE de site uitleest en de
brontekst die de klant aanlevert zijn gereedschap, geen eigenschap van het merk. Ze staan ingeklapt
onder de wizard. Die grens is wat de teller eerlijk houdt.

**Het merkdossier is nu echt een leesscherm**: dossier, wat AI over je weet, aanbod en concurrenten.
De mijlpalen en de maandinzichten gaan in fase 5 naar Overzicht, en het compleetheidspercentage gaat
in fase 6 naar Admin. Dat laatste is besluit 4: het is een percentage over werk dat de klant niet
doet, en voor de consultant een verkoopinstrument.

**Eén ketentest erbij, en die dekt wat de unittest niet kan.** Een veld kan keurig in een stap
staan, netjes opgeslagen worden, en alsnog nooit bij het model aankomen. De ketentest wijzigt nu
twee merkvelden uit twee verschillende stappen vlak vóór er geschreven wordt, en controleert dat ze
allebei in de schrijfprompt staan. Unittests 1332 naar 1342, ketentests 160 naar 162.

## 17 augustus 2026: de appstructuur, fase 3 (Strategie)

**Eén clusterlijst waar er twee waren.** "Clusters" en "Voorgestelde clusters" stonden als twee
menu-items naast elkaar, voor twee toestanden van hetzelfde ding: een voorstel wordt een cluster
zodra je op "meet dit" klikt. Nu één lijst, lopend bovenaan en voorstellen daaronder op
potentiescore (besluit 6).

**Eén bibliotheek per merk.** Content stond per cluster in een eigen bibliotheek, dus een klant met
vier clusters had vier bibliotheken en nergens een overzicht van wat hij gekocht heeft. Dat is
precies het verkeerde om te versnipperen: het is het eindproduct waar hij voor betaalt (besluit 5).
Met zoeken op titel én adres, filters op type, status en cluster, en paginering vanaf 25 rijen. Op
productie stonden op deze datum 35 contentpagina's, dus die paginering is nu al relevant.

**De terugknop onthoudt waar je vandaan kwam.** Een contentpagina is nu vanaf drie plekken te
bereiken. Zonder herkomst wijst de terugknop altijd naar dezelfde plek, en dan komt de klant uit op
een scherm waar hij niet vandaan kwam. Bewust een parameter (`?van=`) en geen `Referer`-header: die
valt weg bij een bladwijzer en bij strengere browserinstellingen, en juist dán is de terugknop het
enige wat hij heeft.

**De bulkactie, en waarom hij een vierde meldingskleur nodig had.** "Markeer alles als geplaatst"
per maand valt of staat met kwaliteitslat **K5**: eerlijk zijn over gedeeltelijk succes. Lukken er 7
van de 9, dan zegt de melding dat, met welke twee niet en waarom. Zo'n uitkomst in het groen tonen
is oneerlijk want er bleef iets staan, in het rood ook want het meeste ging goed. De
broodroostermelding kende alleen groen, rood en blauw; er is een vierde bijgekomen op
`--intent-warning`, dat letterlijk "kijk hier even naar" betekent.

Drie dingen die de bulkactie bewust níet doet. Hij verzint geen adres voor een pagina die er geen
heeft (conventie 3: dat levert een meting op die nergens over gaat), hij markeert niets wat nog niet
is goedgekeurd, en hij rekent reservepagina's niet mee. Wat al live stond telt als noch succes noch
mislukking, anders leest "3 van de 9" alsof er zes fout gingen terwijl er zes al klaar waren.

**De rem verhuisde binnen de route.** Een maand goedkeuren is de duurste knop van de app (~$2,80) en
mag alleen de beheerder. Markeren als geplaatst kost niets en mag de klant ook (besluit 8). De
rechtencontrole stond bovenaan de route en gold dus voor alles; hij staat nu bij de twee handelingen
die hem nodig hebben. Unittests 1342 naar 1393.

## 17 augustus 2026: de appstructuur, fase 4 (Analytics)

**Drie schermen die er nog niet waren, bijna geheel uit tabellen die al gevuld zijn.** Zichtbaarheid
in AI, Zoekverkeer en Concurrenten. De cijfers stonden er al (14 zichtbaarheidsscores, 343
concurrentrijen, 91 dagen zoekdata), maar er was geen scherm dat ze over de clusters heen bij elkaar
bracht.

**Optellen mag alleen op tellingen, nooit op percentages.** Twee clusters met 40% over 10 vragen en
20% over 90 vragen geven samen geen 30%. Het merkcijfer op Zichtbaarheid weegt daarom op het aantal
gemeten vragen per cluster, en de ranglijst op Concurrenten telt eerst de vermeldingen en de vragen
op en zet er pas dáárna één keer een percentage overheen. Zonder die regel verspringt het merkcijfer
zodra iemand een klein cluster start.

**De noemer van de ranglijst blijft van `brand-rankings.ts`.** Die module bestaat omdat de balk van
"Jij" ooit het percentage van de hoofdscore toonde en de concurrenten dat van alle gemeten vragen,
en dan sta je kunstmatig boven je markt. Er is hier geen tweede telling bijgekomen.

**Een blokkade staat bóven het cijfer dat hij verklaart.** Een dichte robots.txt is de meest
voorkomende reden voor een lage score. Onderaan zetten betekent dat de klant eerst zijn score leest
en pas daarna waarom hij niet kan kloppen. Dat is ook besluit 7: de technische diagnose hoort bij
Analytics en niet bij Instellingen, want daar kijkt niemand als hij zich over zijn cijfer verbaast.

**Eén markering bleek dode code, en dat kwam pas boven water door de test.** De laatste twee dagen
van Google zijn niet definitief, dus de eerste versie markeerde alles ná vandaag min twee. Die
regel sloeg nooit aan: de synchronisatie haalt bewust niets op ná die grens, dus zo'n dag staat
nooit in de database. Het is nu de laatste twee dagen die er wél zijn, en dat werkt ook als de
synchronisatie een week heeft stilgelegen.

**Twee woordenlijsten voor "soort pagina", en de keuze is vastgelegd.** `planned_pages.page_type`
heeft informatief (131), categorie (67) en dienst (66); `content_pieces.type` heeft landing (18),
article (15) en faq (2). Klikken per paginatype gebruikt de eerste, en de contentmix op Overzicht
straks dezelfde. Reden: het contentplan verdeelt op die as, dus een conclusie levert daar meteen een
bijstelling op. Bij "landing tegenover article" stuurt niets.

**De vier kerncijfers zijn nagerekend: 600 klikken en 5.253 vertoningen over 15 juli tot 13
augustus.** ⚠️ Dat is testdata en geen klantdata. Het toetst de rekensom en de vorm, niet de
koppeling. Die is pas geverifieerd als de Google-sleutel er is en er één echte synchronisatie is
gedraaid (conventie 10).

**Nieuw scherm dat niet in de fasering stond: Koppelingen** (`/instellingen/koppelingen`). Het volgt
uit besluit 3b, want zodra Zoekverkeer uitlegt dat er nog geen koppeling is, moet er een knop naast
staan die ergens heen gaat. Alle merken op één pagina: een bureau met vier merken wil in één
oogopslag zien welke er gekoppeld zijn.

Unittests 1393 naar 1437.

## 17 augustus 2026: de appstructuur, fase 5 (Overzicht)

**De startpagina die er nooit was.** Er waren 26 schermen en geen enkele startpagina: `/analyses`
deed half dienst als dashboard, het merkdossier de andere helft, en wie inlogde wist niet waar hij
moest beginnen. `/merk/[id]` beantwoordt nu vier vragen op volgorde: hoe sta ik ervoor, wat wacht op
mij, ligt het plan op schema, waar begin ik. De wortel, de inlogactie en het woordmerk in de
bovenbalk wijzen er sinds deze ronde allemaal heen.

**De review-wachtrij komt terug, en dat draait een besluit terug.** Hij is op 3 augustus 2026 juist
weggehaald omdat hij bij meerdere clusters opliep tot tientallen regels in één kaart, waarmee het
overzicht zélf de rommel werd die het moest oplossen. Wat het deze keer wel kan laten werken is één
harde grens: maximaal vijf regels, alleen de staat `nu`, met een doorklik naar de rest. Loopt hij in
de praktijk tóch vol, dan is de volgende stap hem per cluster te tonen in plaats van opgeteld, niet
hem groter te maken.

**Twee nieuwe blokken, en allebei op dezelfde as als een bestaand scherm.** Funnel-voortgang toont
per fase van de klantreis hoeveel van de geplande pagina's live staan; de contentmix toont hoe het
plan verdeeld is over de paginatypes. Die mix telt op `planned_pages.page_type`, dezelfde as als
"klikken per paginatype" op Zoekverkeer. Twee schermen die "contentmix" zeggen en iets anders tellen
is precies de fout die deze bouwronde opruimt.

**Reservepagina's tellen nergens mee.** Op productie staan 264 geplande pagina's over 2 plannen,
waarvan een deel reserve is om in te schuiven als er iets afvalt. Die horen niet bij het maandtotaal
dat de klant afneemt (migratie 0049), dus ook niet bij de noemer van zijn voortgang. Zonder dat
filter staat een plan van 24 bestelde pagina's op "3 van de 30". Het scherm noemt de reserves apart,
zodat het verschil zichtbaar blijft.

**Een funnel houdt zijn eigen volgorde, ook als een fase leeg is.** Sorteren op aantal maakt van een
reis een ranglijst. En een fase zonder geplande pagina's blijft staan met 0 van 0 in plaats van weg
te vallen: stil verdwijnen is erger dan een leeg vakje, want dan ziet de klant niet dát die fase
bestaat. Een lege fase krijgt geen 0%, want dat suggereert achterstand waar niets gepland is.

**⚠️ Eén afwijking van het uitvoerplan, en met reden.** Dat plan schrijft in §4.1 de
periode-aanduiding "Maand {n} van 12" voor. Besluit 7 maakte het abonnement doorlopend opzegbaar, en
`plan-view.tsx` noemt sindsdien "maand 4 sinds de start", nooit "van 12": een noemer van twaalf is
een belofte over een looptijd die niet is afgesproken. Het overzicht volgt die eerdere beslissing.

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
kostenroute op een adres dat te raden was. Allemaal netjes verstopt, en allemaal bereikbaar. Dan sta
je in een demo één misklik van een ongemakkelijk gesprek af. Alles staat nu op
`/merk/[id]/admin`, met Nova's negen secties als inhoudsopgave zodat je tijdens een demo weet welk
scherm de klant voor zich heeft terwijl jij naar de ruwe laag kijkt.

**Eén echte afscherming erbij die niemand miste.** `/api/analyses/[id]/costs` gaf de eigenaar van
een analyse zijn eigen kostenoverzicht, uitgesplitst per pijplijnstap, met de modelnamen erbij. Geen
enkel scherm linkte ernaartoe, dus het viel niet op, maar het adres was te raden en het antwoord was
volledig. Nu `isStaff`, met een 404 en geen 403.

**Drie lagen bewaken de grens, en dat is geen dubbelop.** De database geeft een klantsessie nul
rijen uit `jobs` en `ai_calls`, ongeacht wat een scherm vraagt. Elke afgeschermde route vraagt
`isStaff()`. En een broncodecontrole leest alle klantschermen na op modelnamen, bedragen,
bewijscitaten en promptinstructies.

**Die derde laag bestaat omdat het uitvoerplan een handmatige doorloop voorschreef.** "Log in als
klantaccount en loop alle dertien bestemmingen af" gebeurt één keer en daarna nooit meer, terwijl
het risico juist bij de vólgende wijziging ontstaat. De controle draait nu bij elke commit, naar het
model van de bestaande broncodecontrole op de twee remmen bij betaald werk.

**Die controle vond meteen twee dingen, en één ervan was een echt lek.** Drie schermen deden
`select("*")` op een tabel met een `raw_json`-kolom. Ze toonden die kolom nergens, maar met een `*`
reist de ruwe modeloutput wél mee in de paginabron. De kolommen staan er nu bij naam.

**De andere vondst was een fout in de controle zelf, en die is leerzaam.** De eerste versie verbood
`profile_field_sources` en `evidence_url` op klantschermen. Allebei te grof: de herkomstchip "uit je
website gehaald" leest die tabel en is juist een klantfunctie (Nova's `draftedBadge`), en
`evidence_url` bestaat op twee tabellen, waarvan er één naar de site van de klant zelf wijst. Een
controle die een goede functie sloopt is erger dan geen controle, dus de regel is aangescherpt tot
wat écht intern is: het bewijscitaat. Unittests 1465 naar 1505, ketentests 162 naar 167.

## 17 augustus 2026: de appstructuur, fase 7 (opruimen) en wat de ronde opleverde

**Het laatste dode hout weg.** `MainNav` had geen enkele importeur meer sinds de zijbalk er kwam, en
`NAV`, de platte bestemmingenlijst van vóór die zijbalk, werd alleen nog gelezen door dat component
en door het profielmenu. Dat menu toonde daarmee een tweede hoofdnavigatie naast de zijbalk, met
andere bestemmingen. Twee menu's met dezelfde belofte lopen gegarandeerd uit elkaar, en dat was hier
al eerder gebeurd. Het profielmenu gaat nu alleen nog over het account.

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
controleren is: `redirects`, `profile-gaps`, `library`, `plan-bulk`, `origin`,
`search-console/metrics`, `plan-progress`, `activity` en `onboarding-insight`. Nul migraties, precies
zoals het plan voorspelde: alles leest uit tabellen die er al stonden.

### Wat deze ronde níet oplost, en dat hoort hier te staan

**De diagnose was "onoverzichtelijk", en die is hier vertaald naar de menustructuur en de
schermindeling.** Als de klacht in werkelijkheid over de hoeveelheid informatie ín een scherm gaat,
dan verplaatst deze ronde dat probleem opnieuw, net zoals de ronde van augustus dat deed. De toets
die daarbij hoort staat nog open: leg de nieuwe indeling voor aan de klant die het merkdossier een
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

`visie.md` en `merkstrategie.md` legden op 17 augustus de bestemming vast, met de afstand tot de
bouw er eerlijk bij (drie punten in `visie.md`, vijf in `merkstrategie.md` §30). Wat er niet stond,
was hoe je die afstand overbrugt. Dat staat nu in
[`tasks/ontwikkelplan-visie.md`](./tasks/ontwikkelplan-visie.md): zeven werkstromen, tien sprints in
vier fases, met per sprint de bestanden, het migratienummer, het verificatiecriterium en de
handelingen die buiten Claude Code om moeten gebeuren.

**De eerste versie zette de CMS-koppeling en de echte zoekvolumes vooraan, omdat de visie ze allebei
vraagt. De eigenaar heeft ze dezelfde dag naar achteren geschoven, en dat is de vier uitgangspunten
waard die nu bovenaan het plan staan:**

1. **Publiceren blijft voorlopig handwerk.** Kopiëren, plakken, de URL invullen, als geplaatst
   markeren. Van den Udenhout is het eerste geval. Pas als die route zich bewezen heeft komt er een
   koppeling, en dat wordt sprint 9 in plaats van sprint 1. Het proces eromheen verandert niet:
   content wordt geschreven, komt door de poorten, wordt goedgekeurd, en pas dan geplaatst.
2. **Echte zoekvolumes schuiven mee naar achteren**, sprint 8. Niet vanwege de prijs, zie hieronder.
3. **De app blijft draaien op alleen de OpenAI-sleutel.** Dit is als harde regel opgeschreven: elke
   externe koppeling is optioneel en stil afwezig, en elke sprint krijgt een test die bewijst dat de
   app zich zonder die sleutel identiek gedraagt. Voor Gemini is dat al zo
   (`enginesForProfile()`); sprint 6 zorgt dat het bij die ene handeling blijft.
4. **De goedkeuringspoort vóór content live gaat verdwijnt nergens**, ook niet in de autonomiesprint.
   Die gaat over meten, onderzoeken, schrijven en voorstellen. De publicatieknop blijft van een mens.

**Wat het herschikken aan het licht bracht, en het corrigeerde een fout in de eerste versie.** Daar
stond dat de CMS-koppeling de effectmeting deblokkeert. Dat klopt niet: `markPublished()` plant de
hermeetgolven al in zodra iemand een URL invult, en `checkPublication()` controleert de pagina
daarna. De hele lus kan met de hand op gang komen. Wat ontbrak was nooit de koppeling, het was **één
echte gepubliceerde pagina**. `content_impact` heeft nul rijen. Daarom is sprint 1 nu geen
bouwsprint maar een doe-sprint: de route echt aflopen en repareren wat er onderweg schuurt.

**Drie cijfers die de volgorde dragen**, alle drie nagerekend en niet uit documentatie overgenomen:

1. **$0,855 per meetronde.** Bij 50 clusters, de omvang die `visie.md` als doelgroep beschrijft, is
   dat ~€43 per maand aan meting alleen, tegen een plafond van €50 per account per maand
   (`lib/spend-rules.ts`). De prijskaart is een hardere grens dan de techniek, en dat is de enige
   conclusie in het hele plan die geen code oplevert.
2. **`dimensions: ["date", "page"]`.** De Search Console-koppeling haalt geen zoekopdrachten op,
   terwijl migratie `0052` zelf al schreef dat die "een tweede tabel waard zijn zodra ze echt
   gebruikt worden". Daarmee ligt de halve SEO-belofte, inclusief posities, gratis binnen bereik.
   Dat maakt sprint 2 de goedkoopste grote stap van het plan.
3. **$0,06 per 1.000 zoektermen.** De prijzen van vier zoekvolumeleveranciers zijn opgezocht en in
   §6 van het plan gezet. Bij 20 merken en 2.500 zoektermen per merk kost een maandelijkse
   verversing ongeveer $3 bij DataForSEO, tegen ~$6.000 per jaar bij Semrush en gratis maar
   onbruikbaar bij Google zelf (zeven brede bakken zonder actieve advertentie-uitgaven). Dat is een
   belangrijk cijfer voor de volgorde: **het uitstellen van sprint 8 is geen bezuiniging.** De rem
   zit op focus en op een leverancier erbij, niet op geld.

**Wat de kalender bepaalt is wachttijd, geen bouwtijd.** Effect meten gebeurt in golven van 30 en 60
dagen na publicatie. De bouwschattingen zijn dagen (de appstructuur was zeven fases op één dag), de
verificatie is maanden. Vandaar dat sprint 1 vooraan staat: de klok gaat pas lopen als er één pagina
live staat, en handmatig publiceren houdt het aantal pagina's laag. Reken op maanden voor de eerste
harde uitspraak over "werkt dit", en dat is de prijs van eerst testen.

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
`.claude/skills/team-session/SKILL.md` bepaalt het onderdeel, zoekt de bestanden op, kiest de
experts, laat ze onafhankelijk analyseren, vat samen, laat alleen bij een echt conflict twee experts
op elkaar reageren, en eindigt met hooguit vijf geprioriteerde verbeteringen. De elf vakgebieden plus
de tegenspraak staan als aparte experts in `.claude/agents/`.

**Drie keuzes, en waarom ze zo uitvielen.**

1. **Geen Agent Teams.** Dat mechanisme geeft elke expert een eigen Claude-sessie die met de andere
   praat, en dat is precies wat een brainstorm nodig lijkt te hebben. Het valt af op drie dingen:
   het staat standaard uit en is experimenteel, het werkt niet in een niet-interactieve sessie
   (Claude Code op het web dus niet), en de melding dat een expert klaar is draagt zijn uitkomst
   níet mee, waardoor de orkestratie stilvalt en gaat pollen. Het enige dat het echt biedt, experts
   die elkaar spreken, kan goedkoper: een expert die al gedraaid heeft kun je opnieuw aanspreken met
   zijn context intact, dus hij hoeft de code geen tweede keer te lezen.
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
veranderde.** Vier van de vijf experts kwamen langs verschillende wegen bij hetzelfde uit: het
profiel gaat op `klaar` na taak 2 van de 8 (`prepare-profile.ts`), waarna het voortgangsscherm stopt
en de gebruiker vijf tot zes minuten op een dossier zit dat er af uitziet maar leeg is. Vier van de
vijf voelt als bewijs. De tegenspreker haalde dat onderuit met het logboek in de hand: twee volledige
onboardings op productie, acht van acht stappen klaar, nul mislukkingen. Elk faalpad in het rapport
was uit de code afgeleid en nooit waargenomen. **Zonder frequentie is prioriteit niet te
onderbouwen**, en die regel staat sindsdien in de skill: een P0 vereist een waargenomen probleem, een
afgeleid faalpad is hooguit P1.

Diezelfde tegenspreker vond wel iets dat wél hard is, en scherper dan het team het bracht: het
commentaar bij `NON_BLOCKING_TYPES` in `lib/jobs/progress.ts` zegt dat bij een mislukte aanbodstap
alleen het dienstenoverzicht en de topics wegvallen, maar `handlers.ts` hangt de marktstap aan de
aanbodstap, en markt draagt de kennistest en de synthese. Het besluit sneuvelt op zijn eigen
argument. Dat is één verplaatste regel, geen nieuw statusmodel, en het staat als openstaand werk in
`docs/tasks/roadmap.md`.

Een Teamsessie wijzigt nooit code. De schrijftools zijn tijdens de sessie weggehaald in plaats van
verboden, want een instructie is een intentie en code is een garantie (conventie 1), en elke expert
draait read-only. Wat je erna laat bouwen is een nieuwe opdracht.

## Twee stille degradaties in het voortgangsscherm (19 augustus 2026)

Twee losse reparaties, geen migratie, uitgevoerd vóór de fases van
onboarding 3.0 omdat ze vandaag al iets verkeerds tonen. Allebei
komen ze uit de Teamsessie over de onboarding, en allebei hebben ze dezelfde vorm: het scherm zegt
"gelukt" waar de code "niets gevonden" bedoelde.

**De vier standen waren er wel, het scherm gebruikte er twee.** `research-steps.ts` kent per
onderzoeksstap vier standen (`klaar`, `bezig`, `wacht`, `overgeslagen`) en waarschuwt in zijn eigen
toelichting dat een stap die niets vond er anders uit moet zien dan een stap die iets vond.
`profile-progress.tsx` sloeg `klaar` en `overgeslagen` allebei plat tot `done: true`, dus een stap
die nul diensten of nul onderwerpen opleverde kreeg hetzelfde groene vinkje als een geslaagde stap.
De vertaling zit nu in `displaySteps()`, puur en getest (conventie 2), en `WorkInProgress` toont een
derde vorm: geen vinkje, een uitroepteken in de waarschuwingskleur, en de chip "niets gevonden". Het
afrondingsblok van het merkdossier deed dit al goed, dus het waren twee schermen die hetzelfde
gegeven verschillend lazen.

**De duurste stap toonde als klaar terwijl er nul vragen gesteld waren.** `llm-baseline.ts` schreef
het facet `llm_kennis` onvoorwaardelijk weg, ook als de budgetpoort alle engines oversloeg. De
samenvatting werd dan "Nog niet vastgesteld wat AI-assistenten over dit merk weten", en dat is een
gevulde tekst; `research-steps.ts` leest precies dat veld en zette de kennistest daarmee op `klaar`.
De regel is nu: geen enkel gemeten antwoord betekent geen samenvatting (`baselineFacetState()` in
`baseline-verdict.ts`, puur en getest). Het facet blijft wél staan, met `alles_overgeslagen` en het
aantal overgeslagen vragen erin, want alles bewaren is conventie 8. Wat er al stond uit een eerdere
ronde telt mee, anders wist een tweede, idempotente ronde de samenvatting van de eerste.

Na deze ronde: 1518 unittests en 167 ketentests groen.

## Onboarding 3.0, fase 1: het fundament onder de commerciële laag (19 augustus 2026)

Migratie `0060`, toegepast op productie en daar nagerekend: vijftien kolommen op `profiles`, één op
`profile_field_sources`, en een vierde herkomst. Nog geen nieuw scherm; dit is de laag waar fase 3
op gaat staan.

**Twaalf commerciële velden en drie contactvelden.** Elk commercieel veld voldoet aan twee eisen:
een website kan het niet zeggen, en er is precies één pijplijnstap die er aantoonbaar beter van
wordt. Die lezer staat per kolom in het commentaar van de migratie, zodat een veld zonder lezer bij
de volgende ronde opvalt. De veldencatalogus gaat daarmee van 41 naar 56, in negen stappen in plaats
van zeven, en de test die in beide richtingen faalt bewaakt dat nog steeds: elk veld in de catalogus
is opslaanbaar, en elk opslaanbaar veld staat in een stap.

**Eén veldenlijst, twee oppervlakken.** `CLIENT_STEPS` (zeven) is wat de klant zelf bewerkt,
`SESSION_STEPS` (negen) is wat de consultant mét de klant doorloopt. De commerciële laag en de
contactpersoon staan bewust níet in de klantwizard, en dat is de enige plek waar de twee
oppervlakken met opzet verschillen: "waar wil je op groeien" is een gesprek, geen invulveld dat
iemand in zijn eentje beantwoordt. Er komt geen tweede formulierdefinitie en geen tweede
opslagroute; het besluit uit `strategy-box.tsx` blijft staan.

**De volledigheidsmeter blijft de 41 klantvelden meten.** Dat is een afwijking van het plan, met
reden: `csm-data.ts` gebruikt 80% van die meter om te bepalen of een dossier deelbaar is in een
demo. Zouden de vijftien nieuwe velden standaard meetellen, dan zakt élk bestaand merk in één klap
onder die grens en staat alles eeuwig in "wacht op jouw nakijkwerk". De meter accepteert nu een
stappenlijst, zodat de sessiepagina van fase 3 zijn eigen telling kan doen.

**De herkomstpoort zat er nog niet.** De opslagroute leidde de herkomst af uit het eigenaarschap:
bewerkte iemand anders dan de eigenaar, dan werd het `gesprek`. Een accountgenoot met schrijfrecht
kon zijn eigen invoer daarmee als gespreksuitkomst wegschrijven, en die is onaantastbaar voor élke
volgende onderzoeksronde (`field-merge.ts` laat alleen `ai` overschrijven). `resolveWriteSource()`
in `lib/profile-source.ts` is nu de enige poort: `gesprek` en `consultant` vereisen staf, iedereen
anders schrijft `klant`, en een onbekende waarde wordt geweigerd in plaats van stil teruggezet.

Na deze ronde: 1544 unittests en 176 ketentests groen, migraties t/m `0060`.

## Onboarding 3.0, fase 2: wat de consultant klaarzet is nu beschermd (19 augustus 2026)

**Eerst het cijfer, want dat bepaalde de omvang.** Fase 2 begon met een telling op productie: hoeveel
merken die ná 3 augustus 2026 zijn aangemaakt eindigen nog steeds zonder bereik. Het antwoord is
**nul van de drie**. De vijf merken zonder bereik dateren allemaal van 30 juli, van vóór de
reparatie in `resolveScope()`, en zijn alle vijf gearchiveerde testmerken. Het bereikveld in het
aanmaakscherm vervalt daarmee: de pijplijn vindt het zelf, en een extra invoerveld zou een
handmatige stap toevoegen aan iets dat werkt.

**De aanmaakroute liet geen spoor na.** `POST /api/profiles` schreef nul rijen in
`profile_field_sources`, terwijl de bijwerkroute dat wél deed. Wat een consultant vóór het gesprek
typte was daarmee niet te onderscheiden van wat het model later vindt, dus `filterProtectedFields()`
blokkeerde niets en het eerste onderzoek mocht het gewoon overschrijven. Precies het scenario
waarvoor migratie `0039` gemaakt is, en precies het scenario dat hij niet dekte. De route legt nu per
gevuld veld een rij vast met bron `consultant`. Alleen gevulde velden: een lege waarde vastleggen als
"door de consultant gezet" zou het onderzoek blokkeren op iets wat er niet is, en dan blijft dat veld
voorgoed leeg.

**Mensinvoer ging langs de normalisatie heen.** Modeluitvoer ging door `resolveScope()` en een
getypte waarde niet, terwijl `service_regions[0]` letterlijk in zes kennistestvragen wordt geplakt.
"  Amersfoort  " kwam er dus zo in te staan, en 'lokaal' zonder één plaatsnaam leverde een bereik op
waar `prompts.ts` niets mee kan. Beide routes normaliseren nu hetzelfde: bij het aanmaken en bij het
onderzoek.

**Een aanname is geen feit, ook niet in de prompt.** Het intakeblok droeg het model op om álles wat
er al stond te RESPECTEREN. Voor wat de klant zelf zei is dat juist; voor een aanname van vóór het
eerste contact legt het het marktonderzoek stil, want een klantwaarde mag niet tegengesproken
worden. Het blok is nu gesplitst in `lib/pipeline/intake-block.ts`, puur en getest: bevestigde
waarden blijven leidend, consultantwaarden gaan mee als startpunt dat het onderzoek expliciet mag
tegenspreken. Ontbreekt de herkomst, dan telt een waarde als bevestigd; een aanname per ongeluk als
feit behandelen kost een verrijking, andersom laat het model de klant tegenspreken en dat is de
duurdere fout.

De ketentest draait dit nu van begin tot eind: een merk aanmaken zoals de route dat doet, het echte
onderzoek erop met een gestubd model dat de consultant met opzet tegenspreekt, en daarna narekenen
wat er in de database staat. De branche, het bereik en de concurrenten van de consultant staan er
nog; de samenvatting en de bewijspunten die hij leeg liet komen wél van het onderzoek.

Na deze ronde: 1566 unittests en 187 ketentests groen.

## Onboarding 3.0, fase 3: de onboardingsessie (19 augustus 2026)

Het scherm waar consultant en klant samen aan tafel zitten:
`/merk/[id]/admin/onboarding`, staf-only, en het enige stafscherm dat bedoeld is om te delen. Nul
migraties.

**De veldweergave is gedeelde code geworden**, en dat is de kern van deze fase.
`brand-field-input.tsx` rendert één veld met zijn label, uitleg, voorbeeld en herkomstchip, en zowel
de klantwizard als de sessie gebruiken hem. Zonder die stap was er een tweede formulier ontstaan met
dezelfde velden, en dat is precies wat `strategy-box.tsx` in 2026 al afwees: een tweede plek waar
iets kan verouderen. De sessie definieert geen enkel veld zelf, en een test faalt als dat verandert.

**Het scherm opent met wat we níet weten.** `profile-gaps.ts` sorteert de open punten nu op gevolg
in plaats van op veldvolgorde: het bereik bovenaan, want dat is het enige punt waarvan de fout pas ná
een betaalde meetronde zichtbaar wordt, en de bewijspunten onderaan, want die raken pas de tekst.
Zonder die volgorde kost het gesprek een uur aan het bevestigen van dingen die al klopten, en dat is
het uur waar de klant voor betaalt.

**Opslaan gaat per veld, niet met een knop onderaan.** Drie standen per veld, en een mislukte opslag
laat de getypte waarde staan met een knop om het opnieuw te proberen. Stil terugdraaien naar de oude
waarde is de duurste fout die dit scherm kan maken: dan typt de consultant het opnieuw zonder te
weten dat het de eerste keer ook al niet lukte. De klantwizard houdt zijn knop, want daar past hij.

**Elk veld kan op niet van toepassing**, via dezelfde route en dezelfde tabel als de herkomst. Geen
tweede opslagroute. Zo'n veld telt als behandeld, valt uit de gatenlijst, en wordt door een
onderzoeksronde niet alsnog gevuld.

**De meter toont drie getallen**: samen bevestigd, door ORBIT ENGINE gevonden, nog open. Een
consultantwaarde telt daarin als gevonden en niet als bevestigd; anders ziet een merk waar nog nooit
iemand mee gesproken is eruit als een merk dat je al hebt doorgenomen.

**`/merk/[id]/admin` heet nu Diagnose** en draagt alleen nog techniek: welke taken draaiden, hoe
lang, wat er faalde, wat het kostte. De volledigheidsmeter en het gespreksblok zijn naar de sessie
verhuisd, want dat is werk en geen diagnose.

⚠️ **Het Admin-hoofdstuk mag voortaan vier bestemmingen hebben in plaats van drie.** Het plan telde
er drie en vergat "Alle merken", dat er al stond. Besloten op 19 augustus 2026 door de eigenaar, na
een keuze tussen samenvoegen en oprekken: drie van de vier gaan over dít merk en de vierde is de
uitgang naar de app als geheel, dus het is geen vergaarbak van vier gelijksoortige regels. Een
vijfde bestaat niet zonder eerst iets samen te voegen, en voor de klanthoofdstukken blijft drie de
grens. Beide grenzen staan in `scripts/test-unit.ts`.

**Wat er nog niet in zit:** de knop "het onderzoek bijwerken" uit het afrondblok. Die hangt aan
`onboarding-refresh.ts`, en dat is fase 4. Het afrondblok toont nu wat er open staat en of het
gesprek is vastgelegd.

Na deze ronde: 1634 unittests en 191 ketentests groen.

## Onboarding 3.0, fase 4: het gesprek verandert de uitkomst (19 augustus 2026)

Zonder deze fase is de onboardingsessie een archief. De consultant legt vast dat het merk landelijk
werkt in plaats van lokaal, en de vragen die de meting straks stelt zijn nog steeds gegenereerd op de
gok van het model. Nul migraties.

**Niet alles opnieuw, maar precies wat er anders van wordt.** `lib/pipeline/onboarding-refresh.ts`
rekent per gewijzigd veld uit welke stappen opnieuw moeten draaien. Van de vijftien velden uit
migratie `0060` veranderen er tien niets aan wat er te ónderzoeken valt; die worden pas bij de
volgende meting of contentronde gelezen. Ze staan expliciet op nul in de tabel in plaats van te
ontbreken, zodat de test kan vaststellen dat dat een keuze was. Een gewijzigd bereik laat de vragen
en de kennistest opnieuw draaien, een gewijzigde concurrent alleen de marktstap.

**De knop staat achter dezelfde kostenpoort als al het andere betaalde werk**, en de raming staat in
het bevestigvenster en niet op het scherm: de klant kijkt mee. Die zin wordt gebouwd in de pure
module, zodat er in het sessiescherm zelf geen bedrag voorkomt en de broncodetest dat kan bewaken.

**Een stap kan nu los draaien.** De onboardingketen zat in de geslaagde tak van elke handler: de
aanbodstap plande de markt in, de markt de kennistest, de kennistest de synthese. Eén gewijzigde
concurrent zou daarmee de twee duurste stappen meeslepen. Een taak krijgt daarom `chain: false` mee
als hij vanuit het gesprek is ingepland.

**En daarmee is het punt uit de Teamsessie ook opgelost.** `profile_offering` telde als
niet-blokkerend omdat de klant bij een mislukking alleen zijn dienstenoverzicht mist, maar diezelfde
stap plande de markt in, en de markt draagt de kennistest en de synthese. Mislukte hij definitief,
dan verdween de halve onderzoeksketen zonder één foutmelding: het besluit sneuvelde op zijn eigen
argument. De opvolger staat nu in `lib/jobs/chain.ts` en die tabel geldt in beide takken, ook als een
stap opgeeft. Een ketenscenario laat een aanbodstap definitief mislukken en kijkt of de markt daarna
alsnog ingepland staat.

**De vragen worden vervangen, niet verwijderd.** Bij een herdraai gaan de oude vragen op inactief.
Een `delete` zou via de foreign key de metingen meenemen, en dan is de trendlijn weg om een correctie
op de vraagstelling. Zelfde aanpak als spoor R. En alleen voor analyses waar nog niets gemeten is:
bij een lopende meting zou een nieuwe vragenset de trendlijn breken, en dat is geen beslissing die
iemand onbedoeld hoort te nemen vanaf een gespreksscherm. Dat is een regel die het plan niet noemt.

**Het verwarringblok van de kennistest vult nu de uitsluitingslijst voor.** Dat blok meet al sinds de
eerste onboarding of de merknaam ambigu is, en bewaarde de uitkomst nergens. De namen worden er
deterministisch uit gelezen (een opsomming is te lezen zonder model, conventie 1) en voorgesteld als
`name_exclusions`, alleen als die lijst nog leeg is: op die lijst staan betekent dat de meting
vermeldingen van dat bedrijf niet meetelt, en een voorstel dat een eerdere correctie overschrijft zou
de score stil verlagen.

**Elf van de twaalf commerciële velden hebben nu een lezer.** De vier sturingsvelden gaan naar de
onderwerpvoorstellen, de groeiregio's naar de vragengeneratie, de bezwaren naar de schrijfopdracht,
het offline bewijs naar de feitenbank met "opgegeven in het gesprek" als bron, de verboden
onderwerpen naar een deterministische controle náást de verboden woorden, de uitsluitingen naar de
vermeldingsclassificatie, en het jaardoel, de seizoenen en de structuurkeuze naar het rapport dat het
contentplan vult.

⚠️ **`deal_value_band` heeft géén lezer gekregen, en dat is een afwijking van het plan.** De migratie
noemt de potentiescore, en dat blijkt bij het bouwen niet te kloppen: die score is per onderwerp en
de waardeklasse is per merk, dus een factor zou élk onderwerp van een merk even hard verschuiven. De
onderlinge volgorde, het enige waar die score voor gebruikt wordt, verandert daar niet van, terwijl
de schaal van 0 tot 100 en de drie banden eronder wél kapotgaan. Het veld wordt vastgelegd en
getoond; een lezer krijgt het pas als er een beslissing is die merken onderling vergelijkt.

Na deze ronde: 1693 unittests en 202 ketentests groen.

## Onboarding 3.0, fase 5: zien waar elk merk staat (19 augustus 2026)

Nul migraties. `/beheer` sorteerde op achterstand, en dat is de vraag van ná de verkoop. De vraag
ervóór, "welk merk kan ik nu demonstreren en welk merk wacht op een gesprek", was nergens te zien,
terwijl het product sales-led is en die vraag het werk van de dag bepaalt.

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
bestaande sortering op achterstand blijft leidend: de fase is een tweede as en geen vervanging.
**Op het merkoverzicht** staat voor staf één regel bovenaan met de fase en de eerstvolgende handeling.
Voor de klant verandert er niets.

Na deze ronde: 1703 unittests en 202 ketentests groen.

## Onboarding 3.0, fase 6: opruimen en op één lijn (19 augustus 2026)

De afsluiting van het traject. Geen nieuw gedrag, wel drie dingen die anders binnen een maand
uiteenlopen.

**Vastgelegd waarom de klant 41 van de 56 velden ziet.** Dat is de enige plek waar het
klantoppervlak en het consultantoppervlak met opzet verschillen, en zonder die reden in het
commentaar herstelt iemand het over drie maanden als een vergeten stap. "Waar wil je op groeien en
waar juist niet" is een gesprek, geen invulveld dat een ondernemer in zijn eentje beantwoordt, en het
antwoord stuurt wat ORBIT ENGINE gaat voorstellen en schrijven.

**`APP_FLOW_DOCUMENTATION.md` heeft een zesde hoofdstuk gekregen**: de onboarding van begin tot eind,
zonder techniek. Van het merk klaarzetten tot een klant die zelfstandig in zijn profiel werkt,
inclusief de zes blokken van het gespreksscherm en de twee dingen die er nog niet in zitten. Dat
laatste met opzet: het document mag nergens beloven wat er niet is.

**Het planbestand is weg.** `docs/tasks/onboarding-3.0.md` is verwijderd nu alle zes de fases
gebouwd zijn, met een regel in de vertaaltabel bovenaan dit logboek zodat de verwijzingen in de code
en in de migratie nergens meer heen wijzen. Dat is de afspraak voor alles in `docs/tasks/`: af is
weg, samengevat hier. `architecture.md` §5 en §11 dragen de sessie en de bijwerkstap nu in de
pijplijntabel en in de klantreis, `ux-design.md` §5 het schermontwerp en de fase van een merk,
`supabase/README.md` de migratie, en `CLAUDE.md` de bijgewerkte tellers.

**Wat het hele traject heeft opgeleverd**, in één alinea: de veldencatalogus ging van 41 naar 56
velden in negen stappen, waarvan er vijftien alleen uit een gesprek kunnen komen. Er is één nieuw
scherm, de onboardingsessie, en dat is het enige stafscherm dat bedoeld is om gedeeld te worden. Wat
daar wordt vastgelegd verandert daadwerkelijk wat de pijplijn daarna doet, en wat er niets aan
verandert draait ook niet opnieuw. De veldweergave is gedeelde code, dus er is geen tweede formulier
ontstaan. En twee stille degradaties die er los van stonden zijn onderweg gerepareerd: een stap die
niets vond toonde als geslaagd, en de duurste stap toonde als klaar terwijl het budget op was.

Eindstand: 1703 unittests en 202 ketentests groen, migraties t/m `0060`, alle vier de vaste
controles groen.

## Het formulier praat de taal van de branche (19 augustus 2026)

Van de 56 velden hebben er 45 een voorbeeld, en die waren stuk voor stuk geschreven vanuit één
fictieve autodealer: "Van Mossel Automotive", "Wij zorgen dat iedereen in de regio zorgeloos kan
rijden", "Sinds 1934, 9 vestigingen, 400 medewerkers". Voor een fysiotherapiepraktijk of een
advocatenkantoor leest dat als een formulier dat voor iemand anders is gemaakt, en dat is precies
het gevoel dat je in een demogesprek niet wilt.

**Dertien branches plus een algemene terugval**, elk met eigen voorbeelden voor 19 velden. 247
teksten in totaal, in `lib/pipeline/brand-examples.ts`. De 19 velden zijn gekozen op één vraag:
verandert het antwoord wezenlijk per branche? Een sitemapadres en een plaatsnaam zien er bij een
tandarts hetzelfde uit als bij een garage, en daar een tweede voorbeeld voor schrijven levert
onderhoud op zonder opbrengst.

**De indeling komt van de concurrent, met drie correcties.** InSpace toont op hun site elf branches
(E-commerce, Leadgeneratie, Maakindustrie, Financieel, Advocaten, Tandartsen, Zorg, Vastgoed,
Automotive, Mode, Sieraden). Die lijst is gemaakt voor landingspagina's op zoekwoorden, niet om een
formulier te vullen, en dat merk je: Mode en Sieraden vullen dezelfde velden in als elke andere
webshop, Tandartsen dezelfde als elke andere zorgverlener, en Leadgeneratie is een kanaal en geen
branche. Samengevoegd tot zes, en er zijn er zeven bij gekomen die het Nederlandse MKB dragen en die
bij hen ontbreken: bouw en installatie, horeca en recreatie, opleiding, persoonlijke verzorging,
transport, software en zakelijke dienstverlening. Een installatiebedrijf is hier een
waarschijnlijker klant dan een juwelier.

**Het langste trefwoord wint, niet het eerste.** Zonder die regel belandt een bouwmarkt bij bouw in
plaats van bij retail en autoschadeherstel bij schade in plaats van bij automotive. Eén regel in
plaats van een zorgvuldig gerangschikte lijst die bij de eerste toevoeging weer omvalt. De
bedrijfsnaam telt mee naast de branchetekst: "Installatiebedrijf Van Dijk" zegt het al in zijn naam,
ook als het onderzoek er "technische dienstverlening" van maakte.

**Past een merk nergens in, dan is er een terugval in twee stappen**: eerst het bedrijfsmodel (een
fabrikant lijkt meer op een fabrikant dan op niets), en anders de algemene voorbeelden die er altijd
al stonden. Nooit een lege plek, en nooit een voorbeeld uit een andere wereld.

⚠️ **Bewust geen voorbeelden per klant laten schrijven door de AI.** Dat kost ongeveer een cent per
merk en klinkt aantrekkelijk, maar het botst op de belangrijkste belofte van dit product: niets in
beeld dat nergens op gebaseerd is. Een verzonnen voorbeeld dat te echt oogt ("Sinds 1998, drie
vestigingen, twaalf therapeuten") laat de klant corrigeren wat wíj bedacht hebben, en dat is precies
het vertrouwen waar alles op drijft. Een vaste lijst kan dat niet: hij is geschreven, nagelezen en
getest, en hij kost niets in gebruik.

Na deze ronde: 1739 unittests en 202 ketentests groen.

## Een voorbeeld alleen waar het iets toevoegt (19 augustus 2026)

Direct na de vorige ronde nagelopen welke velden een voorbeeld verdienen, want een voorbeeld overal
is geen service maar ruis. **Tien van de 45 zijn weggehaald.** De maatstaf: kan de vraag zonder dat
voorbeeld twee kanten op, in lengte, specificiteit of vorm? Zo ja, dan blijft het staan. Zo nee, dan
vertelt het grijze regeltje niets en kost het wel leesbaarheid.

Weg zijn: je eigen bedrijfsnaam, de naam van je auteur, de naam van je contactpersoon, een
e-mailadres, een telefoonnummer, twee plaatsnaamvelden, de naam van een concurrent, de vrije
slotvraag (daar stond een vraag als voorbeeld, geen voorbeeld) en de lijst met schrijfwijzen van je
naam, waar het voorbeeld letterlijk een woord uit de uitleg erboven herhaalde. Bij een lijstveld
verschijnt in plaats daarvan het bestaande "Toevoegen…".

**Twee verzonnen bedrijfsnamen per branche zijn eruit**, 26 teksten in totaal: het merk zelf
("Autobedrijf De Vries") en een concurrent ("Autopalace Zuid"). De tweede was het bezwaarlijkst: een
verzonnen concurrent in een grijs vakje leest als een suggestie van ons over de markt van de klant,
in het scherm waar hij naast je zit.

**En een fout die pas in gebruik zichtbaar wordt.** Bij een lijstveld staat het voorbeeld in het
vakje waar je één regel toevoegt, niet boven de lijst. Daar stonden opsommingen van vier
("Verlichting, meubels, woontextiel, decoratie"), en die lezen als "typ ze allemaal achter elkaar",
waarna het hele aanbod in één regel belandt en de meting één onderwerp ziet in plaats van vier. 28
voorbeelden teruggebracht tot één ding per regel. Een test bewaakt het nu: een voorbeeld bij een
lijstveld heeft minder dan drie komma-onderdelen.

Na deze ronde: 1744 unittests en 202 ketentests groen, 35 velden met een voorbeeld, 247 branchevoorbeelden.

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
productie, telt de sitemap **449 pagina's**. We lazen er 150 en noemden dat "voldoende". Die 150
waren de eerste 150 in sitemapvolgorde, en in die volgorde staat de sectie `/kennis` met 222
artikelen vooraan. Resultaat: van de **26 dienstenpagina's** van dit bedrijf zat er **geen enkele**
bij. Het aanbod van een cv- en warmtepompbedrijf werd afgeleid uit kennisartikelen. Na de wijziging
komen alle 26 binnen, met de homepage vooraan.

Ter vergelijking het andere profiel op productie, udenhout.nl: 130 pagina's, past ruim, en de
selectie is exact wat hij was. Deze wijziging doet niets bij een klant die past, en dat is de
bedoeling.

**Wat de aanleiding was, en waarom het antwoord niet "meer pagina's" is.** De vraag kwam binnen als
"wat als de klant veel meer pagina's heeft". Een Teamsessie met vijf experts kwam op iets anders
uit: het plafond van 150 was niet eens de nauwste doorgang. De aanbod-aanroep mag 55.000 tekens mee
en elke pagina is afgekapt op 1.500, dus er passen er ~35, en welke 35 dat waren besliste één regel:
sorteren op tekstlengte. Omdat élke pagina op 1.500 is afgekapt staan alle langere pagina's precies
gelijk en besliste de volgorde waarin Postgres ze teruggaf. De pagina's die die 1.500 halen zijn
juist de blogartikelen; een dienstenpagina van 900 tekens verloor. Meer pagina's ophalen had daar
niets aan veranderd.

**Zes wijzigingen, in volgorde van hoeveel ze opleveren.**

1. **De sitemaps worden volledig uitgelezen**, parallel in rondes van acht. Bij
   gasservice-brabant.nl kost dat 7,7 seconden voor 449 URL's. Dat is de enige manier om te weten
   hoe groot een site is, en dus de voorwaarde voor al het andere.
2. **De plekken worden over de secties verdeeld** (`url-priority.ts`). Elke sectie krijgt eerst een
   quotum, pas daarna gaan de vrije plekken naar de hoogste score. Zonder dat quotum wint de
   grootste sectie altijd: een blog van 2.000 artikelen bevat gegarandeerd 150 artikelen die net
   hoger scoren dan de onderste dienstenpagina.
3. **Hetzelfde geldt voor de aanbod-aanroep** (`page-select.ts`), om beurten uit elke sectie binnen
   het tekenbudget in plaats van de langste eerst.
4. **`profiles.sitemap_total_urls` en het oordeel `afgekapt`** (migratie `0061`). Dit is het cijfer
   dat nergens bestond, en zonder dat cijfer was de vraag "knelt het plafond?" niet te beantwoorden.
   Het antwoord blijkt ja: 1 van de 3 beoordeelde profielen zat op precies 150.
5. **`profile_pages.source`**, zodat een mens pagina's kan toevoegen die een crawlronde overleven.
6. **De inventaris wordt in blokken van 25 weggeschreven** in plaats van in één alles-of-niets
   insert. Bij swapfiets.nl kostten twee rotte pagina's ooit alle 22; de oorzaak van díé keer is
   verholpen, het patroon was dat niet, en het werd erger naarmate de crawl groeide.

**Eén AI-aanroep erbij, en alleen waar hij iets verandert.** De voorgestelde aanpak was: vraag een
model met web search naar alle dienstenpagina's van de klant. Dat is de dure en onbetrouwbare kant
van een goed idee. Een model dat naar URL's gevraagd wordt vult patronen aan, dus
`/diensten/sportmassage` komt terug ook als de pagina `/behandelingen/massage` heet, en web search kost per
aanroep het twintigvoudige van de tokens hier. De sitemap heeft die URL's al, gratis en zonder
gokken. Wat een model wél toevoegt is het oordeel: van de 60 secties op deze site draagt
`/behandelingen` het aanbod en `/blog` niet. `crawl-focus.ts` stelt precies die vraag, over 40
regels tekst in plaats van 8.000 URL's, voor ~$0,01, en alleen als de site niet past. Alles wat het
model teruggeeft dat niet in de aangeboden lijst stond, verdwijnt in code: verzinnen is hier geen
risico maar een onmogelijkheid (conventie 1).

**Wat er stil afkapte, meldt zich nu.** Drie plekken gooiden zonder een woord dingen weg: de
tekenlimiet van de prompt, de bewijscontrole en `MAX_NODES`. Alle drie zetten ze nu een regel in de
gespreksagenda, en die regels komen uit code en niet uit zelfrapportage van het model: een model dat
niet weet dat er iets is weggegooid kan dat ook niet melden.

**En de URL-laag heeft eindelijk tests.** Die stond in `lib/crawler.ts`, dat begint met
`import "server-only"`, dus `test-unit.ts` kon er niet bij en geen enkele regel was gedekt. Zelfs de
valkuil die het commentaar zélf benoemde (`product-category-sitemap.xml` mag niet als
productsitemap tellen) was onbewaakt. De pure functies staan nu in `lib/crawl-urls.ts`. De
ketentest kreeg er een scenario bij dat een te grote site nabootst en aantoont dat de handmatig
toegevoegde pagina de crawl overleeft; dat is de achtste fout in de samenhang die geen unittest kon
vangen.

**Nog niet gedaan, bewust.** `MAX_NODES` van 60 staat er nog. Of dat plafond knelt is nu meetbaar
(het aantal afgekapte knopen wordt geteld en gemeld) maar nog niet gemeten, en een plafond verhogen
zonder cijfer is een mening. Zie sprint 7 in `tasks/ontwikkelplan-visie.md`.

Na deze ronde: migraties t/m `0061`, 1819 unittests en 211 ketentests groen.

---

## 22 augustus 2026 · Mijn reputatie, sprint R1 tot en met R3

Een **nieuw, apart betaald onderdeel** onder Analytics, dat de vijfde vraag beantwoordt die de app
tot nu toe niet kon beantwoorden: *hoe praat AI over je, waarom, waar komt dat beeld vandaan, en
kiest AI jou of je concurrent als hij ze naast elkaar legt?* De meting zegt of je genoemd wordt, de
kennistest of AI weet wie je bent, het bronnenlandschap welke sites je markt bepalen. Alle drie
gaan over aanwezigheid. Geen van drieën gaat over toon, en een merk kan bij elke koopvraag genoemd
worden en er tegelijk om bekend staan dat de levering altijd te laat is.

Het volledige plan staat in `docs/tasks/mijn-reputatie.md`. Wat hier hoort is waaróm de bouw is
zoals hij is, met de cijfers eronder.

**Dit is de tweede keer dat sentiment gemeten wordt, en de eerste keer leverde het niets op.** Tot
migratie `0029` mat elke meting `sentiment` per vermelding. Uitkomst na **650 gemeten rijen**:
`negative` kwam geen enkele keer voor, `positive` bij precies één analyse. Die 650 rijen waren
antwoorden op koopvragen, en daar somt een assistent bedrijven neutraal in op: er zat geen oordeel
in, dus viel er geen oordeel uit te lezen. Dit onderdeel vraagt er rechtstreeks naar en vraagt
bewust ook naar de andere kant ("waar klagen klanten over"). **Of dat werkelijk variatie oplevert is
een aanname tot sprint R4 hem op een echt merk heeft nagerekend.**

**Het gevaarlijkste dat dit product kan doen, is een onzichtbaar bedrijf geruststellen.** Een
taalmodel is standaard vriendelijk over een bedrijf waar het niets van weet. Zonder rem levert dat
een mooie score op voor een merk waar AI helemaal niets van weet. Daarom staat de toon op het scherm
nooit alleen: er staat altijd de bewijskracht naast, en een antwoord zonder controleerbare bron
telt niet mee in het merkcijfer (`lib/reputation/score.ts`). De verwachting is dat "toon +65,
bewijskracht 10" de meest voorkomende uitslag bij een MKB-bedrijf wordt, en dat is een advies en
geen compliment: reviews verzamelen, want dit cijfer is lucht.

**Het volgorde-effect is de kern van de vergelijking, en het wordt gemeten in plaats van
aangenomen.** Een taalmodel bevoordeelt de partij die het eerst genoemd wordt. Zet je de klant
altijd vooraan, dan bouw je een product dat élke klant een mooie plaats geeft, en dat is erger dan
geen vergelijking. Vier maatregelen, alle vier in code: de volgorde rouleert deterministisch, de
klant staat over twaalf aanbodknopen precies drie keer op elke plek, één vergelijking per knoop
krijgt de chip `indicatief` en drie niet, en `order-bias.ts` telt achteraf hoe vaak de
eerstgenoemde partij ook als eerste geplaatst werd. Bij vier partijen is 25% de verwachting; ligt
het er meer dan twintig punten boven, dan gaan álle plaatsen op indicatief en zegt het scherm dat in
gewone taal.

**Analytics ging naar vier bestemmingen**, met een reden van dezelfde soort als de uitzondering die
Admin op 19 augustus kreeg: de andere drie tonen data die de app sowieso al verzamelt, deze is een
los product dat de klant apart koopt en dat per keer gestart, betaald en gedateerd wordt. Drie plus
een product, zoals Admin drie plus een uitgang is. Vanaf nu bestaat er in geen van beide
hoofdstukken een vijfde zonder eerst iets samen te voegen, en de test faalt voortaan ook als er
stilletjes een derde hoofdstuk bij komt dat er vier mag.

**Twee afwijkingen van het plan**, allebei omdat het plan aantoonbaar de verkeerde uitkomst gaf:

- De rotatie hangt aan de plek van de knoop in de vastgelegde scope en niet aan een hash van het
  knoop-id, zoals §4.4 schreef. Een hash verdeelt de klant *ongeveer* gelijk over de posities: bij
  twaalf knopen kan hij dan vijf keer vooraan en één keer achteraan staan, en dan is de correctie
  precies zo scheef als het effect dat ze moest wegnemen. De plek in de scope doet hetzelfde
  deterministisch én exact.
- De eenduidigheid trekt één standaardfout af en niet 1,96 zoals de 95%-band bij de meting doet.
  Met de volle marge kwam drie keer hetzelfde antwoord op **49** uit, en "49% eenduidig" bij drie
  identieke antwoorden is even misleidend als 100 zou zijn, alleen de andere kant op. Met één
  standaardfout komt hetzelfde geval op 74.

**De ketentests zijn hier het zwaartepunt en niet het sluitstuk.** Zes taaksoorten die op elkaar
wachten is meer samenhang dan enig ander onderdeel van de app heeft, en zeven van de zeven fouten
van het vorige traject zaten in precies die samenhang. Er kwamen **46 ketentests** bij, over onder
meer: de synthese draait als laatste en precies één keer, twee keer starten stelt geen enkele vraag
opnieuw, een mislukte beoordeling wordt opnieuw geprobeerd zonder de dure vraag te herhalen, een
merk zonder concurrenten levert een volledige run zonder vergelijking op met `rank_score` op `null`,
een merk zonder aanbod krijgt een nette weigering, en een budget dat halverwege volloopt offert de
vergelijking en laat de basisanalyse staan.

Daarvoor moest `callPlain()` hetzelfde teststopcontact krijgen dat `callStructured()` al had. Tot nu
had geen enkele ketentest dat nodig: de meting wordt in `test-chain.ts` met voorgebakken rijen in
`tracking_runs` nagebootst. Hier kan dat niet, want dan sla je juist het stuk over dat getest moet
worden.

**Kosten:** de ketentest maakt geen enkele betaalde aanroep, dus die liet €0,00 zien. De geschatte
kostprijs van een echte standaardanalyse is **ongeveer $0,54, dus rond de €0,50**, met een plafond
van €3 hard in code. ⚠️ Dat bedrag is berekend uit de tarieven in `lib/openai/pricing.ts` en is
**niet nagerekend tegen `ai_calls`**: er heeft nog geen enkele echte run gedraaid.

**Wat er nadrukkelijk nog niet gebeurd is** (conventie 10, gebouwd is niet geverifieerd): migratie
`0062` staat nog niet op de productiedatabase, er is geen echte run gedraaid, de vlakheidstoets en
de volgorde-toets uit R4 staan open, en de diepe modus uit R5 doet vandaag hetzelfde als de
standaardmodus. R5 begint pas als R4 goed uitvalt; valt een van beide toetsen verkeerd uit, dan
wordt de meetopzet herzien in plaats van doorgebouwd.

Na deze ronde: migraties t/m `0062` (in de repository, nog niet op productie), 1954 unittests en
257 ketentests groen.


---

## 23 augustus 2026 · Mijn reputatie, sprint R4: de eerste echte run

Eén run op **Van den Udenhout ('s-Hertogenbosch)**, standaardmodus, 34 vragen, nul mislukte taken.
Conventie 10 in de praktijk: dit onderdeel was gebouwd en op 263 ketentests groen, en de eerste
echte run legde **zeven fouten** bloot waarvan er geen enkele door een test gevangen was. Zes
daarvan zaten in code die precies deed wat er beschreven stond; de regel zelf had een gat.

### Wat er gemeten is

| | Geschat | Gemeten |
|---|---|---|
| Aanroepen | 68 | **66** |
| Kosten | $0,54 (uitschieter $0,68) | **$0,75** |
| Doorlooptijd | 6 tot 9 minuten | **31,6 minuten** |

Het AANTAL aanroepen klopte vrijwel precies. De prijs per gegronde vraag niet: $0,021 tot $0,023 in
plaats van $0,015, en dat is exact het risico dat §5 van het plan zelf benoemde, namelijk dat
web-zoeken pagina's ophaalt die als invoer meetellen. De beoordelingen kwamen wél op $0,001 uit,
precies zoals begroot; die goedkope tweede stap is dus echt zo goedkoop als bedoeld, en dat is de
reden dat een mislukte beoordeling opnieuw mag zonder de dure vraag te herhalen. Ruim binnen het
plafond van €3.

⚠️ **De doorlooptijd was drie keer zo lang, en de oorzaak is architectonisch.** De wachtrij doet
**exact één zware taak per minuut**: de werker houdt 220 van zijn 240 seconden vrij voordat hij aan
een zware taak begint (`HEAVY_JOB_RESERVE_MS`), en de cron vuurt één keer per minuut. De aanname
"met de knopen parallel" uit §5 gaat dus niet op. Dat is geen fout van dit onderdeel, en die
reservering staat er met reden: hij is ingevoerd nadat contentgeneratie 504's veroorzaakte. De
schermteksten noemen nu een halfuur.

### De vlakheidstoets is GESLAAGD

Dit was de vraag waar het hele onderdeel op stond of viel, want tot migratie 0029 leverde
sentiment in **650 gemeten rijen geen enkele keer** `negative` op. Nu, over 17 beoordeelde
antwoorden:

| toon | aantal |
|---|---|
| gemengd | 10 |
| overwegend positief | 3 |
| negatief | 1 |
| positief | 0 |
| onbekend | 0 |

Er zit variatie in, en het merkcijfer kwam op **+4 uit, dus neutraal**, niet op een vriendelijke
plus. De bezwaren zijn concreet en herkenbaar: bereikbaarheid, lange wachttijden, onduidelijkheid
over kosten, extra afleveringskosten, klachten over diagnoses. Het mechanisme uit §2.1 werkt: een
vraag die rechtstreeks naar nadelen vraagt, levert nadelen op.

### De volgorde-toets: het vangnet mat zichzelf blind

De meting van het volgorde-effect bleek **kapot**, en dat is de ernstigste vondst. ChatGPT kende
twee van de vier vergeleken partijen niet, en een partij zonder plaats kan nooit eerste worden. Elk
oordeel waarin zo'n partij vooraan stond leverde dus gegarandeerd een misser op:

| | eerste geworden |
|---|---|
| eerstgevraagde was gekend | 7 van 11 = **63,6%** |
| eerstgevraagde was onbekend | 0 van 33 = 0,0% |
| samen (wat de code mat) | 7 van 44 = **21,9%** |

Op 21,9% lijkt vooraan staan zelfs schadelijk. Het echte cijfer is 63,6%, en bij elf waarnemingen
valt dat nog binnen de ruis. Maar de meting mat hoe vaak het model de lokale concurrenten kent, en
niet of vooraan staan loont. Dit getal bepaalt of een plaats als uitslag of als indicatie op het
scherm komt, dus het vangnet maakte zichzelf blind.

### De zeven fouten, en wat ze gemeen hebben

1. **De concurrentkeuze las een kolom die niet bestaat.** Gevonden vóór de run, bij het nakijken van
   het schema. Elke concurrent kreeg nul vermeldingen en de keuze viel stil terug op alfabetische
   volgorde.
2. **Eén vermelding beslechtte de derde plek.** Twee partijen op twee vermeldingen, elf op precies
   één, en daaruit won "Alfa Romeo" omdat de A vooraan staat. Een fabrikant is geen concurrent van
   een dealer. Er staat nu een ondergrens van twee, dezelfde regel die het scherm Concurrenten al
   hanteerde.
3. **Een verzonnen bron verhoogde de bewijskracht.** De ongegronde merkvraag leverde vijf URL's op,
   waaronder `vandenudenhout.nl` terwijl de klant op `udenhout.nl` zit. Die telden mee als externe
   bronnen, en externe bronnen wegen het zwaarst. Het cijfer dat moet voorkomen dat AI aardig doet
   zonder je te kennen, werd opgeblazen door precies dat gevaar.
4. **Een uitspraak over de reviews gold als pluspunt.** "Het beeld is niet uitsluitend negatief" is
   circulair: je sterke punt is dan dát mensen een mening hebben.
5. **Een strategische knoop woog lichter dan opvulling.** De onderwerpprioriteit loopt op 5 tot 7,
   niet op 1 tot 99, terwijl generieke opvulling een vaste 10 kreeg. In de diepe modus zou dat de
   verkeerde acht knopen extra rotaties geven, en dat is exact de fout die de kennistest op
   4 augustus rechtzette.
6. **Het volgorde-effect werd gemaskeerd**, zie hierboven.
7. **Een duel werd als marktpositie gepresenteerd.** Met twee bekende partijen kwam "eerste van
   twee" als HARDE uitslag op het scherm, niet als indicatie: er lagen drie rotaties onder en het
   volgorde-effect viel binnen de marge. Twee partijen is genoeg om een score te berekenen, niet om
   te zeggen waar iemand in zijn markt staat. Een plaats geldt nu pas als uitslag bij minstens drie
   bekende partijen.

Wat ze gemeen hebben: **vijf van de zeven zijn stille degradaties.** Geen foutmelding, geen leeg
scherm, gewoon een verkeerd getal dat er goed uitziet. Precies de soort fout waar dit onderdeel
vangnetten tegen heeft, en ze zaten ín die vangnetten.

### De bevinding die geen fout is, en die het meest voor het product betekent

⚠️ **ChatGPT kent de echte lokale concurrenten van een MKB-bedrijf niet.** Autobedrijf De Twee en
SDL Automotive kwamen in **nul van de acht** oordelen als bekend terug. Alleen de klant zelf en een
autofabrikant bleven over.

Daar zit een bias in die niet voorzien was: als de gemeten concurrenten onbekend zijn, wint in de
vergelijking automatisch de partij die wél bekend is, en dat is bijna altijd een grote naam. Zonder
ondergrens op vermeldingen kiest het systeem dus stelselmatig fabrikanten en ketens als concurrent,
en dan meet blok V de bekendheid van het model in plaats van de markt van de klant.

De reparatie maakt de uitkomst eerlijker maar niet rijker: bij dit merk zal het scherm voortaan
zeggen dat er niet vergeleken kon worden. Dat is de juiste uitkomst, en het is zelf een bevinding
die een consultant kan gebruiken: er valt in deze markt weinig te verliezen op een
vergelijkingsvraag. Maar het betekent wel dat **blok V bij een regionaal MKB-bedrijf vaak leeg zal
blijven**, en dat is iets om te weten voordat de scan als los product verkocht wordt.

### Wat er nog niet gecontroleerd is

De zeven reparaties zijn getest (1996 unittests, 263 ketentests) maar **niet opnieuw op een echte
run nagerekend**. Er is dus geen tweede meting die aantoont dat de bewijskracht nu lager uitkomt,
dat de vergelijking nu terecht wegvalt en dat het volgorde-effect nu 63,6% meldt in plaats van
21,9%. R4 is daarmee geslaagd op zijn twee toetsen, maar de nasleep ervan staat open.

Na deze ronde: migraties t/m `0062` (op productie), 1996 unittests en 263 ketentests groen.


---

## 23 augustus 2026 · Mijn reputatie v2: zeven verbouwingen, en één ervan teruggedraaid

Na sprint R4 lag de vraag voor welke technische optimalisaties de meting beter maken. Zeven
gebouwd, allemaal op dezelfde dag getest op **Gasservice Brabant**. Zes hielden stand, één is binnen
tien minuten door de werkelijkheid onderuitgehaald.

### Wat de run liet zien

| | v1 (Van den Udenhout) | v2 (Gasservice Brabant) |
|---|---|---|
| Doorlooptijd | 31,6 minuten | **9 minuten** |
| Kosten | $0,75 | **$0,48** |
| Mislukte taken | 0 | 0 |

Drie keer sneller en een derde goedkoper, terwijl er wezenlijk meer gemeten wordt. De winst in tijd
komt volledig uit de wachtrij: netwerkgebonden zwaar werk mag nu met drie tegelijk, waar de
reservering van 220 seconden er eerder één per minuut van maakte.

### De marktvraag is de grootste winst

De benoemde vergelijking is niet meer het hoofdmechanisme. In plaats van partijen op te leggen en om
een rangschikking te vragen, staat er nu de vraag die een koper stelt: *"Ik zoek dit in die regio,
welke bedrijven raad je aan?"*

Uitkomst bij Gasservice Brabant: genoemd bij **38% van de koopvragen, gemiddeld op plek 2,6 van 6**.
En ChatGPT noemde **tien lokale installatiebedrijven** die niet in onze opgelegde set stonden:
InstallBrabant, Verhees en Van Dijk, Jos Maas, Sankomij, Schepers, Halteren en vier andere. Van de
drie concurrenten die wíj hadden gekozen komt er maar één ook echt voor als AI zelf mag noemen.

Dat is precies waarvoor dit blok bestaat. Wie AI noemt, ís de concurrent, en die set corrigeert
zichzelf in plaats van te blijven hangen op wat er ooit gemeten is.

### ⚠️ Het gedeelde bewijscorpus voor dienstvragen was een denkfout

De redenering leek sterk: elke dienstvraag deed zijn eigen zoekactie, dus kreeg elke dienst andere
zoekresultaten, en dan weet je bij een verschil tussen twee diensten niet of dat aan de reputatie
ligt of aan de zoekmachine. Eén onderzoeksronde, daarna alle dienstvragen tegen hetzelfde materiaal.

**Alle twaalf dienstvragen antwoordden "geen betrouwbaar beeld op basis van de aangeleverde
onderzoeksresultaten".** Het model deed exact wat het opgedragen kreeg. Maar dat is een meetartefact
en geen bevinding: dezelfde vragen mét eigen zoekactie leverden bij Van den Udenhout antwoorden van
zes- tot tienduizend tekens op met zeven tot elf bronnen.

De fout in de redenering: **verschillende zoekresultaten per dienst zijn niet de ruis maar het
signaal.** Vindt AI niets over je warmtepompen en veel over je cv-ketels, dan is dat een echt
verschil in je reputatie per dienst, en daar betaalt de klant voor. Een gedeeld corpus kan die vraag
per definitie niet beantwoorden, want er zit geen dienstspecifiek materiaal in; en zou je het corpus
wél per dienst vullen, dan zoek je alsnog twaalf keer en is er niets bespaard.

Teruggedraaid. Het corpus blijft als achtergrond meegaan, want de letterlijke reviewcitaten met bron
zijn goed materiaal en ze zijn er toch al.

### Vijf reparaties, waarvan vier veroorzaakt door de nieuwe blokken zelf

1. **De bronnenlijst ging over de markt in plaats van over de klant.** De marktvraag noemt zes
   concurrenten mét hun websites: 113 van de 191 URL's kwamen uit de markt- en vergelijkingsvragen.
   Op het scherm stonden 61 domeinen en een bewijskracht van 100 op 100, terwijl dat cijfer moet
   zeggen hoeveel controleerbare bronnen er onder het oordeel over de KLANT liggen.
2. **Het merkblok stuurde vijftien aanroepen tegelijk weg.** Met drie herhalingen ging het van vijf
   naar vijftien; er kwamen er zeven terug en acht sneuvelden stil in `allSettled`. Dat halveerde
   precies de basis die de herhalingen betrouwbaarder moesten maken.
3. **De onderzoeksstap bewaarde zijn ruwe antwoorden niet.** Hij riep het model rechtstreeks aan, dus
   toen het corpus te dun uitviel was niet vast te stellen of dat kwam doordat er weinig te vinden
   was of doordat de knipstap materiaal weggooide. De duurste stap liet geen spoor na (conventie 8).
4. **Dezelfde partij onder drie schrijfwijzen telde als drie.** "Verhees en Van Dijk
   Installatietechniek", "Verhees en Van Dijk" en "Verhees & Van Dijk".
5. **Een citaat gold als eigenschap.** Bij de zwakke punten stond zowel "afspraken niet nagekomen"
   als "Komen afspraken niet na!". Een lijst met eigenschappen is een agenda om aan te werken; een
   lijst met citaten is een bloemlezing, en daar is het veld `citaten` voor.

### Wat er meteen goed werkte

De ondergrens van twee vermeldingen leverde bij Gasservice Brabant drie echte installatiebedrijven
op (Kemkens, Thermos, De Haas) in plaats van de fabrikant die bij Van den Udenhout uit de
alfabetische tiebreak rolde.

De verdeeldheid doet waarvoor hij gebouwd is. De samenvatting zegt nu: *"Het imago is verdeeld. Bij
7 van de 10 vragen noemt ChatGPT zowel lof als kritiek."* Bij de oude opzet had daar alleen
"neutraal" gestaan, en dat is precies het merk dat je zou missen.

En er staat voor het eerst een betrouwbaarheidsmarge onder het hoofdcijfer, net als bij de meting op
het scherm ernaast.

### De les die twee runs achter elkaar bevestigen

Beide runs legden fouten bloot die geen enkele test had gevangen, en beide keren waren het stille
degradaties: geen foutmelding, gewoon een verkeerd getal dat er goed uitziet. Bij v1 waren het er
zeven, bij v2 vijf, en bij v2 zat er één bij die niet in de uitvoering zat maar in de redenering
eronder.

Wat werkt is de volgorde: bouwen, één echte run, en dan het resultaat regel voor regel nakijken
tegen wat er letterlijk in de antwoorden staat. Elke fout hierboven is zo gevonden, en geen enkele
door de 2052 unittests of de 282 ketentests. Die bewaken dat een reparatie blijft zitten; ze vinden
hem niet.

Na deze ronde: migraties t/m `0063` (op productie), 2052 unittests en 282 ketentests groen.

## 23 augustus 2026: sprint R5, de tweede meting naast de eerste

Het onderdeel Mijn reputatie wordt verkocht op herhaling: over een kwartaal nog een keer, en dan het
verschil. Dat maakt de vergelijking het commercieel belangrijkste stuk van de module én het
gevaarlijkste, want een pijltje omhoog bij een verschil dat ruis is, is een leugen met een grafiekje
eromheen.

De rekenkunde is daarom niet nagebouwd maar hergebruikt: `changeIsMeaningful()` uit
`lib/stats/uncertainty.ts`, dezelfde functie die het dashboard en het periodeverslag gebruiken.
Nieuw is `lib/reputation/compare.ts` met drie sloten, alle drie in code en niet in een prompt:

1. **Een andere meetlat levert nooit het woord "veranderd" op.** Werkt OpenAI het model bij, dan
   verschuift de lat en niet de reputatie. `instrument_version` moet aan beide kanten gelijk zijn.
2. **Geen marge, geen uitspraak.** Zonder standaardfout aan beide kanten valt niet te zeggen of een
   verschil buiten de ruis valt, en dan blijft het leeg (conventie 3).
3. **Een gewijzigde scope levert een kanttekening op.** Andere diensten gemeten betekent een deels
   andere vraag. Daarvoor wordt `scope_json` bij de start vastgelegd.

Het getal waar het om draait: de run op Gasservice Brabant had een toon van 47 met een standaardfout
van 2,6. Twee van zulke metingen naast elkaar hebben een drempel van ongeveer 7 punten. Zeven punten
verschil is dus nog steeds "gelijk gebleven", en dat is de zin die het scherm dan toont. Voor de twee
cijfers zonder standaardfout gelden vaste drempels: tien punten bewijskracht (ruwweg één hele bron
erbij of eraf), en twee van de drie marktantwoorden (één omgeslagen antwoord is 33 procentpunt en dus
ruis).

Daarnaast is de diepe modus aangesloten op de startknop: twaalf aanbodknopen tegenover
vijfentwintig, met per optie wat het kost. Bij een merk met vier diensten levert diep niets extra's
op en dat staat er ook, want een duurdere knop die hetzelfde doet is het snelste wat vertrouwen kost.

Bij het aansluiten bleek de schermtekst nog "ongeveer 34 vragen" te beloven terwijl de herziening van
v2 er ongeveer 50 van maakte. Gecorrigeerd op het scherm, op de knop en in `architecture.md`.

Na deze ronde: 2077 unittests en 287 ketentests groen, migraties t/m `0063`. **Nog te verifiëren op
productie:** twee runs op hetzelfde merk naast elkaar. Er is er één, de tweede moet nog draaien.

## 23 augustus 2026, laat: de tweede run op Gasservice Brabant, en drie fouten in de meting zelf

De run draaide compleet door: 51 van de 51 vragen, geen kanttekeningen, $0,97. Daarmee is bewezen
dat de uitval van de ochtend (3 van de 15 merkbrede vragen, en de samenvatting die niet geschreven
kon worden) aan de bestedingslimiet lag en niet aan de koppeling.

De uitkomst zelf was slecht, en op een manier die alleen zichtbaar wordt door hem naast de vorige te
leggen:

| | ochtend | avond |
|---|---|---|
| toon | 47 | 0 |
| verdeeldheid | 5 | 50 |
| marge op de toon | 2,6 | **0** |
| verdeling | 18× overwegend positief, 1× gemengd | **24× gemengd, verder niets** |

### Fout 1: het vangnet sloeg door, en vlak is vlak

De reparatie van de ochtend zei: lof met twee of meer echte bezwaren erin is geen lof maar een
gemengd beeld. Bij dit merk somt het model in vrijwel elk antwoord meer dan twee bezwaren op, dus
het vangnet vuurt bij élk antwoord. Resultaat: 24 van de 24 antwoorden hetzelfde etiket. Dat is
dezelfde ziekte als 's ochtends, alleen op een ander etiket. Een label dat bij 24 antwoorden nooit
verandert draagt nul informatie, en de toonindex van precies 0 die eruit rolt is geen meting maar
een rekenkundig gevolg.

De diepere oorzaak is niet de drempel maar de bron: het aantal minpunten dat het model opsomt is
deels een gevolg van onze eigen vraagstelling, want wij vrágen om nadelen. Dit is nog niet
gerepareerd; daarvoor moeten eerst de 24 oordelen zelf naast hun antwoorden gelegd worden.

### Fout 2: een marge van nul leest als zekerheid en betekent blindheid

Alle 24 labels gelijk betekent spreiding nul betekent standaardfout nul. Op het scherm staat dan een
cijfer zonder marge, alsof het exact is. Erger: de vergelijking met een volgende meting deelt door
die marge, dus élk verschil zou "echt veranderd" heten.

De ondergrens komt nu uit de schaal zelf. Het model kiest een van de labels en die liggen 50 punten
uit elkaar, dus de echte toon wordt afgerond op de dichtstbijzijnde 50. De spreiding van zo'n
afronding is de stapgrootte gedeeld door de wortel uit 12; bij 24 antwoorden levert dat 2,9 punten
op in plaats van 0.

### Fout 3: de trefkans stond op de verkeerde noemer

`HIT_RATE_MIN_DELTA` was 0,66, gebaseerd op de aanname dat de marktvraag drie keer gesteld wordt. Hij
wordt ook per dienst gesteld, dus het zijn er ongeveer vijftien en de kleinste stap is 7 procentpunt.
De sprong van 0,17 naar 0,36 die deze twee runs lieten zien was daarmee onzichtbaar gebleven, en dat
is nu juist het commercieel scherpste getal van het hele product. De vaste drempel is vervangen door
`binomialStderr()`, dezelfde functie die de zichtbaarheidsscore zijn bandbreedte geeft. Daarvoor moet
de noemer bewaard worden: migratie `0064`.

### Fout 4, en dit is de pijnlijkste: het ophogen van de promptversie was vergeten

`instrument_version` bestaat om precies één ding te voorkomen: dat een wijziging in de meetlat als
een wijziging in de reputatie op het scherm komt. Beide runs staan op `v2`, terwijl de oordeelsregel
er tussenin veranderd is. Zonder ingrijpen zou de app netjes melden dat de reputatie van Gasservice
Brabant met 47 punten is gekelderd. Het merk is niet veranderd, de regel wel.

Opgehoogd naar `v3`, en de eerste ketentest die eraan hangt controleert nu de hele sleutel in plaats
van alleen of er "v2" in staat, zodat vergeten opnieuw rood wordt.

De les van de dag, voor de derde keer op rij: elke fout hierboven is gevonden door de uitkomst van
een echte run regel voor regel na te lopen, en geen enkele door de 2081 unittests of de 287
ketentests.

## 23 augustus 2026, avond: wat de vierentwintig oordelen letterlijk zeiden

De vierentwintig oordelen van de tweede run naast hun bezwarenlijstjes gelegd. Dat weerlegde mijn
eigen eerste conclusie. Ik noemde het vangnet "doorgeslagen", alsof het te streng was afgesteld. Dat
was het niet: het telde de verkeerde dingen mee.

In vrijwel elk bezwarenlijstje stonden twee wezenlijk verschillende soorten door elkaar:

1. **Echte ervaringen**, en die zijn scherp: "scheef aangesloten rookgasafvoer", "geen controle van
   de gasdichtheid volgens de klant", "afspraak bij een gemeld gaslek niet nagekomen", "onverwacht
   hoge reparatierekening zonder voorafgaande prijsindicatie".
2. **Uitspraken over ons eigen bewijs**: "weinig onafhankelijke, dienstspecifieke klantfeedback over
   elektrische warmtepompen", "nauwelijks of geen specifieke ventilatiereviews", "de actuele
   steekproef op Klantenvertellen is klein", "specifieke zonneboilercertificering niet gevonden",
   "de meest inhoudelijke ketelreviews zijn inmiddels zes à zeven jaar oud".

Soort 2 is geen kritiek op het bedrijf. Het is ChatGPT die zegt dat hij niets kon vinden. Zo'n regel
als bezwaar meetellen doet drie dingen fout: hij duwt de toon omlaag zonder aanleiding, hij zet op
het scherm een "zwak punt" waar de ondernemer niets mee kan, en hij verspilt de waardevolste
bevinding die dit product kan opleveren. Want "over vier van je twaalf diensten zegt ChatGPT
letterlijk dat er geen onafhankelijk bewijs te vinden is" is een verkoopgesprek, terwijl "zwak punt:
nauwelijks ventilatiereviews" een raadsel is.

`pointKind()` scheidt ze nu, in code en niet in de prompt (conventie 1), op zinsdelen die letterlijk
uit deze run komen en niet zijn bedacht. Bij twijfel geldt een punt als ervaring, want een echt
bezwaar dat als bewijsopmerking wordt weggezet verdwijnt uit het cijfer en dat is de duurdere fout.

Drie gevolgen:

- **Het vangnet telt alleen nog echte bezwaren.**
- **Er is een spiegel bij gekomen.** Een etiket moet de inhoud volgen in beide richtingen: lof met
  vijf bezwaren is geen lof, en kritiek zonder één concreet bezwaar is geen kritiek. Zonder die
  tweede helft is het vangnet een eenrichtingsklep die het cijfer stelselmatig omlaag duwt, en dan
  is de vleierij vervangen door zwartkijken. Het antwoord dat de doorslag gaf had acht lofpunten en
  als enige bezwaar "de actuele status van de certificering kan niet worden bevestigd".
- **De bewijsopmerkingen worden een eigen bevinding**: staat er bij twee of meer antwoorden zo'n
  regel, dan komt er een kanttekening bij de run die zegt bij hoeveel antwoorden ChatGPT zelf
  aangeeft niets te kunnen vinden, met erbij dat dat over vindbaarheid gaat en niet over kwaliteit.

### Wat dit over de meetopzet zelf zegt

Er zit een aanname onder het hoofdcijfer die deze run onderuit haalt. De standaardfout wordt berekend
uit de spreiding tússen antwoorden, alsof dat vierentwintig onafhankelijke waarnemingen zijn. Dat
zijn het niet: alle vierentwintig antwoorden citeren dezelfde handvol reviews. Dezelfde scheve
rookgasafvoer komt in vijftien antwoorden terug. Vlakheid tussen antwoorden over hetzelfde merk op
hetzelfde moment is dus geen fout in het instrument, het is te verwachten, en een spreiding van nul
betekent niet "zeker" maar "één bron, vierentwintig keer herhaald".

De ondergrens onder de standaardfout vangt de ergste gevolgen daarvan af. De structurele oplossing is
de bewijskracht als maat voor zekerheid gebruiken in plaats van de spreiding tussen antwoorden. Dat
staat nog open.

Promptversie naar `v4`. 2100 unittests en 290 ketentests groen.

## 23 augustus 2026, nacht: de derde run bevestigt de reparaties, en legt een grens bloot

Derde run op Gasservice Brabant, met de reparaties van de vorige twee rondes erin (promptversie
`v4`). Uitkomst: `tone_stderr 3,1`, `market_hit_rate 0,33` op 12 vragen, `evidence_score 99` op 18
onafhankelijke domeinen.

De echte antwoorden nagelezen om zeker te zijn. Twee dingen bevestigd:

- **Geen bewijsopmerking meer tussen de zwakke punten.** Alle bezwaren in deze run zijn echte
  ervaringen: een scheve rookgasafvoer, een niet nagekomen afspraak bij een gaslek, een onverwacht
  hoge rekening zonder prijsindicatie, klachten over facturering en incasso. `pointKind()` doet zijn
  werk.
- **De marge is niet meer nul.** 3,1 punten bij 22 bruikbare antwoorden, precies wat de ondergrens
  uit de vorige ronde voorspelt.

Alle 22 oordelen kregen opnieuw het etiket `gemengd`. Dit keer is dat GEEN fout: elk antwoord noemt
zowel zes tot acht échte sterke punten (deskundige monteurs, netjes werken, snelle service) als
meerdere terugkerende klachten (dezelfde rookgasafvoer, dezelfde gasdruk- en
gasdichtheidscontrole die ontbreekt, dezelfde afspraak bij een gaslek, dezelfde facturerings- en
incassoklacht, in bijna elk antwoord opnieuw). Dat is geen instrument dat blind is voor verschil,
dat is een merk waarbij AI structureel dezelfde combinatie van lof en kritiek naar boven haalt.

Wat het wel blootlegt: `toneScore("gemengd")` is altijd exact 0, of het bezwaar nu één milde
prijsopmerking is of vijf klachten waaronder een veiligheidsgerelateerd punt. Die twee wegen niet
even zwaar, en de schaal ziet het verschil niet. Dat is geen fout van deze ronde maar een grens die
al in `tone.ts` zit sinds het begin (`"Er is geen -1"`). Voor een volgende ronde: het aantal en de
soort bezwaren laten meewegen in het cijfer, niet alleen in het etiket.

Klein openstaand punt: twee van de vijftien merkbrede vragen en één van de drie vergelijkingen
leverden niets op, terwijl de kosten met $0,86 ruim onder het budget van €3 bleven. Dus geen
budgetkwestie meer maar iets aan de kant van OpenAI zelf. Niet dringend, wel iets om te blijven
volgen.

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

**"240% van de gemeten vragen".** De chip bij een kans rekende met `som(prompt_weight)` over de
doelvragen van een aanbeveling. Dat gewicht is volumeband × koopwaarde per vraag, 0,02 tot 1,0
(`lib/pipeline/prompt-weight.ts`), en dus geen aandeel: vier koopklare vragen tellen op tot 2,4. Op
het overzicht van Van den Udenhout stonden zes kansen met 240%, 150%, 120%, 80% en twee keer 50%,
boven een zichtbaarheid van 0%. Een percentage van 240 is geen afronding maar een cijfer dat niet
kán kloppen, en het is precies het getal dat een klant in een gesprek terugvraagt. Er staat nu een
telling: "raakt 4 van de 30 gemeten vragen", met de noemer uit de gewone meting van de laatste
periode (`purpose = 'periodic'`, dezelfde filter als het rapport zelf). De som van de gewichten
blijft bestaan als sorteersleutel, want daarvoor was hij wél bruikbaar, en komt nooit meer in beeld.

**"V1 en V2 hebben gewicht 0,60."** Zo begon vijf van de zes aanbevelingen op datzelfde scherm. Het
rapportmodel krijgt de gemiste vragen aangeleverd als V1, V2, V3 met hun gewicht erbij, en nam die
notatie mee in de zin die de klant leest. De schrijfopdracht in `lib/pipeline/report.ts` verbiedt het
nu, en `lib/recommendation-text.ts` is het vangnet ernaast (conventie 1: een promptinstructie is een
intentie, code is een garantie). Het schrapt hele zinnen en niet losse woorden, want een vraagcode is
meestal het onderwerp van de zin: "V5 is een belangrijke lokale koopvraag met gewicht 0,50" wordt
zonder code "is een belangrijke lokale koopvraag met", en dat is slechter dan niets. Eén uitzondering:
een staartclausule achter een puntkomma wordt geknipt, want daar draagt de kop van de zin de raad.
Op alle zes de teksten van productie blijft precies de zin over die zegt wat de klant moet maken.
Blijft er niets over, dan staat er niets.

**Het scherm zelf: van tien blokken naar zes, en de volgorde om.** "Waar begin je" stond als tiende,
onder vijf blokken toelichting, terwijl `ux-design.md` §5 dit scherm laat beantwoorden wat je nu moet
doen. De volgorde is nu stand, wat op je wacht, waar je begint, en pas daarna de verdieping, op
desktop in twee kolommen. De maandinzichten zijn geen eigen blok meer maar de duiding ín de
stand-kaart, funnel en contentmix zitten in één kaart in plaats van vijf, en het activiteitenblok
staat ingeklapt: het was het langste blok van de pagina en het enige waar geen handeling uit volgt.

**Het hoofdgetal stond er vier keer, in drie schalen.** In de subkop ("in 0% van de vragen"), in de
stand-kaart ("0%"), in de mijlpalen ("0") en in de maandinzichten ("0 van de 100"). `ux-design.md` §1
kent er één. De subkop noemt het niet meer en `lib/insights.ts` laat het weg bij een eerste meting,
want daar staat het cijfer nu vlak boven. Bij twee metingen blijven de getallen staan: die zin gaat
over het verschil en dat is nieuwe informatie.

**De mijlpalen zijn gezakt, niet verdwenen.** Besluit 7 zette ze bewust op het overzicht en dat blijft
zo. Ze stonden alleen pal onder het hoofdcijfer, en in maand 1 zijn alle drie de getallen nul. Drie
nullen onder een zichtbaarheid van 0% doen het tegenovergestelde van wat dat blok moet doen.

**Vier kleinere dingen die er in dezelfde ronde bij hoorden.** De chip achter een werkregel volgt nu de
soort werk: alles stond op amber, waardoor "Bekijk wat er mis is" (een cluster dat niet gelukt is) er
precies zo uitzag als "Nakijken". Elk blok staat in zijn eigen `SectionErrorBoundary`, want acht
databronnen op de startpagina van de klant zonder foutopvang is één onverwachte datavorm van een leeg
scherm af. De laadstaat was drie grijze blokken zonder kop en heeft nu de vorm van de pagina eronder.
En de regel "en nog 7 kansen" wees nergens heen; hij gaat nu naar de clusters, waar die kansen staan.

**Nagerekend tegen de opgeslagen data, niet alleen tegen een test** (conventie 10). De zeven
aanbevelingen van `udenhout.nl · Auto financieren` uit `reports.recommendations_json`, met 46 gemeten
vragen in de laatste periode: de gewichtssommen zijn precies 2,40 · 1,50 · 1,20 · 0,80 · 0,50 · 0,50 ·
0,30, dus exact de percentages die op het scherm stonden. Ze worden nu "raakt 6 van de 46 gemeten
vragen" en zo verder. Bij alle zeven blijft er na het vangnet een bruikbare zin over, en in geen van
de zeven staat nog een vraagcode of een gewicht.

Migraties ongewijzigd (t/m `0064`), 2132 unittests en 290 ketentests groen.

## 24 augustus 2026: het contentplan doorgelicht als scherm, zes ingrepen

Een UX-review van Strategie > Contentplan bij Van den Udenhout, het eerste merk met een vol plan:
120 pagina's, tien per maand, twaalf maanden vooruit. Zes bevindingen, en de eerste twee waren geen
vormkwestie.

**Je kon niet lezen wat je goedkeurde.** Een pagina met de status "wacht op jouw akkoord" toonde een
paarse goedkeurknop en nergens de geschreven tekst. De verwijzing lag er wél
(`planned_pages.content_piece_id`, gevuld door `linkPlannedPage()`), het leesscherm bestond al, en
`lib/origin.ts` had sinds 17 augustus zelfs de herkomstwaarde `plan` klaarstaan voor precies deze
link, met een terugknop die naar het contentplan wijst. Alleen legde niemand hem. De titel is nu een
link en er staat een knop "Lezen" naast "Tekst goedkeuren". Eén pad levert een pagina op die om
akkoord vraagt zonder gekoppelde tekst (`alreadyDone` in `app/api/cron/plan/route.ts` zet alleen de
status om); die regel zegt nu waar de tekst wél staat in plaats van te zwijgen.

**Twee verschillende handelingen heetten allebei "goedkeuren".** Een maand vrijgeven zet betaald
schrijfwerk in gang, een tekst goedkeuren zegt dat hij gepubliceerd mag worden. Op het scherm stond
daardoor een groene chip "Goedgekeurd" op maand 1 met twee amberkleurige rijen "Wacht op jouw
akkoord" eronder. Een maand wordt nu **vrijgegeven**, een tekst **goedgekeurd**.

De andere vier: de maandkop telde het filterresultaat en niet de maand, zodat er "Maand 1 · 2
pagina's" stond bij een plan van tien per maand. Twaalf koppen droegen geen kalendermaand, terwijl
elke pagina een publicatiedatum heeft. De weergave "Alles" was 120 kaarten van gelijk gewicht,
ongeveer twaalf schermlengtes; maanden staan nu dicht behalve de lopende en alles wat om een
handeling vraagt. En "Verwijderen" liep zonder één vraag door, terwijl "markeer als geplaatst" een
volledige bevestiging kreeg, dus de rem zat op de verkeerde knop.

De rekenkunde staat in `lib/plan-overview.ts` (conventie 2: puur, zonder `server-only`), met 26
nieuwe unittests. Geen migratie, geen wijziging aan de pijplijn. De regels die hieruit volgen voor
elke lijst van deze omvang staan in `docs/ux-design.md` §5.

Samen met het merkoverzicht hierboven op main: 2158 unittests en 290 ketentests groen.

## 24 augustus 2026: op "Vraagt jouw input" stonden tien vragen die je niet kon beantwoorden

De aanleiding was één zin bij een schermafdruk: "er zijn 10 open vragen maar ik kan helemaal geen
antwoord geven". Klopte. Het scherm telde in de kop "10 open", toonde tien vragen, en had er nul
invoervelden onder.

**De oorzaak zat niet in het scherm maar in de herkomst van die tien regels.** De synthese schrijft
in `raw_json.gaps` wat het onderzoek niet kon vaststellen, en de prompt zegt er letterlijk bij wat
dat is: "de agenda van het gesprek met de klant". Dat zijn gesprekspunten voor de consultant. Ze
kwamen op het klantscherm terecht als platte tekst naast de feitenvragen, die er wél uitzien als
vragen en er wél een invoerveld bij hebben. Twee soorten regels die er hetzelfde uitzien en zich
tegengesteld gedragen, met een teller erboven die ze bij elkaar optelde.

**De oplossing: een open punt is geen aparte soort, het is een feitenvraag zonder rij.** De synthese
schrijft ze nu weg in `fact_requests` (merkbreed, `analysis_id is null`, `scope: 'merk'`), en dan
pakt het bestaande scherm ze op via de route die er al lag. `lib/pipeline/gap-questions.ts` doet de
normalisatie ervoor: opsomtekens eraf, witruimte samen, hoofdletterongevoelig ontdubbeld, niets
langer dan 200 tekens en hoogstens twaalf. Op productie ging het om drie merken met 12, 10 en 10
open punten; die van Van den Udenhout is de lijst uit de schermafdruk.

**Eén ding gaat er níet mee mee, en dat is de belangrijkste keuze van deze ronde.** Een beantwoorde
feitenvraag wordt óók een regel in `profiles.proof_points`, en zo'n regel krijgt in de feitenbank de
bron "site <url>". Voor een open punt is dat onwaar: de klant vertelde het net, het stond nergens op
zijn site. Erger nog, de synthese vraagt ook naar dingen als "welke drie klantgroepen krijgen komend
jaar de hoogste commerciële prioriteit", en dat hoort geen citeerbare bewering in een gepubliceerde
pagina te worden. Antwoorden op deze vragen slaan die tweede kopie daarom over. Er raakt niets
verloren: `buildFactBase()` leest de beantwoorde vraag zelf al, en dan mét de juiste bron ("klant,
bevestigd <datum>"). Het merkje waaraan de route dat ziet is `raw_json.bron = 'synthese-gap'`.

**Vier kleinere dingen in dezelfde ronde, alle vier fouten en geen smaak.**

- **Een mislukte database-vraag toonde een groene kaart.** Beide queries werden niet op fouten
  gecontroleerd, dus een storing leverde lege data op en lege data betekende "niets open". De klant
  kreeg goed nieuws te zien op het moment dat de app zijn vragen niet kon ophalen.
- **Velden op "niet van toepassing" kwamen terug als open punt.** `findGaps()` werd hier zonder de
  n.v.t.-lijst aangeroepen, terwijl de onboardingsessie hem wel meegaf. Precies waar migratie `0060`
  voor waarschuwde: anders haalt de lijst nooit nul en wordt hij genegeerd.
- **Overgeslagen vragen waren onzichtbaar.** Het scherm heeft een blok "toon wat je oversloeg",
  bedoeld om een vraag alsnog te kunnen beantwoorden, maar de query haalde die rijen niet op. Het
  blok kon dus nooit verschijnen.
- **De open punten werden dubbel geteld.** `assessReadiness()` had er een eigen rij voor naast de
  feitenvragen, gevoed uit `raw_json`. Die telling werd bovendien nooit nul, ook niet nadat de klant
  de vraag beantwoord had. De rij is weg; de vragen tellen nu één keer mee, op de plek waar ze staan.

**En twee dingen aan de vorm, allebei voor desktop.** De vraag staat op `lg` naast het invoerveld in
plaats van erboven, wat bij tien vragen ruim twee schermhoogtes scheelt. En een open punt heeft een
knop "Invullen" gekregen die de stap én het anker draagt (`?stap=bedrijf#veld-anker-aliases`), want
de wizard toont één stap tegelijk: zonder die stap landde de knop bij `proof_points` op een veld dat
niet in beeld stond. Een unittest bewaakt dat elk open punt een bestemming heeft, anders staat de
regel er weer voor niets.

Geen migratie: `fact_requests` had alles al, en de unieke index op (`profile_id`, `question`) maakt
de omzetting vanzelf idempotent. Samen met de twee rondes hierboven op main: 2180 unittests en 303
ketentests groen.

---

## De zijbalk kreeg hiërarchie (24 augustus 2026)

De indeling van de zijbalk klopte al sinds 17 augustus: vijf hoofdstukken met hooguit vier
bestemmingen eronder. De opmaak droeg die indeling alleen niet. Kop en bestemming stonden allebei op
`text-sm`, allebei in grijs, allebei op gewicht 400 tot 500, en het enige verschil tussen "een van de
zes vaste plekken" en "een pagina daarbinnen" was een verticale lijn van 1 pixel. Wie snel keek zag
zestien regels op een rij.

Vijf wijzigingen, elk met één taak. **De kop** gaat naar 15 pixels, gewicht 600 en `--text-primary`.
**Het icoon van de kop** wordt paars in plaats van de kleur van de tekst ernaast: zes tekeningen in
de hele balk, precies de zes vaste plekken, één merkkleur die ze bindt. Dat is de eerste en enige
uitzondering op de regel dat een icoon `currentColor` erft, en hij staat verantwoord in
`designsystem.md` §6b.2; de kleur zit op de ouder, dus `components/icon.tsx` blijft ongewijzigd en de
regel blijft afdwingbaar. **De verticale lijn** verdwijnt: een bestemming springt nu 28 pixels in,
precies de breedte van het icoon plus de tussenruimte, waardoor zijn tekst exact onder de tekst van
zijn kop staat. Die uitlijning zegt hetzelfde als de lijn, zonder dwars door de actieve regel te
lopen. **De actieve regel** wordt paars: `--bg-elevated` (#e7edf2) haalde 1,1:1 met het wit eronder
en werd pas zichtbaar als je ernaar zocht; `--accent-purple-surface` (#f3e6ff) met paarse tekst niet.
En **de ruimte** groeit van 4 naar 20 pixels tussen twee hoofdstukken en van 30 naar 36 pixels per
regel.

Twee dingen die er meteen uit volgden. De kop **kleurt niet meer mee** met de pagina waar je staat:
dat markeerde de kop én de regel eronder, twee markeringen voor één plek, en de kop hoort het vaste
punt te zijn. En het stempel "alleen jij" is een **klein gevuld vlakje** geworden in dezelfde
paarse tint, want los grijs hoofdlettertekst las als een tweede label van de bestemming in plaats
van als een stempel erop. (Het was een pil; bij het samenvoegen met de vormgevingsronde hieronder
is dat `--radius-sm` geworden, want in diezelfde ronde hielden de chips van de app op pilvormig te
zijn en de zijbalk staat naast élk scherm.)

De navigatie zelf is niet aangeraakt: `lib/nav.ts` en `lib/icons.ts` zijn ongewijzigd, dus dezelfde
zes hoofdstukken, dezelfde volgorde en dezelfde tekeningen. Dit ging alleen over hoe ze eruitzien.
Nagemeten in de browser op de echte component, met een tijdelijke previewroute die in dezelfde ronde
weer verwijderd is.

---

## De vormgevingsronde op het overzicht (24 augustus 2026)

Het overzicht was diezelfde dag al opnieuw ingedeeld: stand, wat op je wacht, waar je begint, en pas
daarna de verdieping (`ux-design.md` §5). De volgorde klopte toen, de vorm nog niet. Op het scherm
van Gasservice Brabant stonden **twaalf witte kaarten met een dunne rand onder elkaar**, waarvan de
bovenste toevallig het hoofdgetal van het merk droeg. Wie het scherm scande zag geen hiërarchie: de
zichtbaarheid van 57% had exact dezelfde omlijning als de derde kans van onderen.

**Zes ingrepen, en vier ervan gelden voor de hele app.** Dat is bewust: een vormgevingsregel die
maar op één scherm geldt is geen regel maar een uitzondering, en die groeien vanzelf terug uit
elkaar (§dezelfde reden als bij de 30 handgebouwde inline-stijlen over 17 bestanden).

1. **Een gekleurde stang van 4px links op de kaart met het hoofdgetal** (`.card-rail*`,
   `designsystem.md` §5.5). De tint volgt de eerste zin van `insights()`, dus groen betekent "dit
   cijfer steeg écht, boven de meetruis" en niet "dit is een kaart". Zonder oordeel, bij een eerste
   meting of een verschil binnen de ruis, blijft hij grijs: hij markeert dan wél waar je moet
   kijken en belooft niets over de richting. Ook toegepast op `/merk/[id]/analytics`, waar hetzelfde
   getal staat.
2. **De drie inzichtregels kregen een gekleurde stip en hun zin terug in zwart.** De hele zin stond
   in groen of oranje; drie regels waarvan er twee gekleurd zijn, leest als een foutmelding. Het
   opsomteken zelf was bovendien het letterteken •, en dat is precies de fout die `lib/icons.ts`
   ooit heeft opgeruimd: het kwam uit de tekstlaag, erfde de regelhoogte en zag er per platform
   anders uit. De stip is nu een getekend vlakje met een vaste maat.
3. **Elke regel in "wacht op jou" en "waar begin je" kreeg een icoon.** Twaalf kansen die alleen in
   hun tekst verschilden lieten je drie keer hetzelfde begin lezen ("Maak een nieuwe pagina over…",
   "Verbeter de pagina over…") voordat je het verschil vond. Acht nieuwe betekenissen in
   `lib/icons.ts` (35 in totaal), gekoppeld via `OPPORTUNITY_ICON` (`lib/opportunities.ts`) en
   `workKindIcon` (`lib/work-kind.ts`). Beide koppelingen zijn getest: een handeling zonder
   tekening rendert een gat op precies de plek waar de klant kijkt.
4. **Iconen en de handeling onderaan een kaart staan in de leeskleur, niet in paars.** Paars is in
   dit product de kleur van de primaire knop. Twaalf paarse regels onder elkaar maken van een lijst
   een muur van gelijkwaardige hoofdacties, en trekken de blik naar de linkerrand terwijl de titel
   het antwoord draagt.
5. **De gewichten kregen een schaal** (`designsystem.md` §3.1): 700 voor de paginakop en het
   hoofdgetal, 600 voor kaarttitels, 400 voor lopende tekst. Kaarttitels stonden op 500, precies
   één halve stap boven de zin eronder, en `.stat-value` had helemaal geen gewicht en erfde dus dat
   van de alinea ernaast.
6. **Chips zijn geen pillen meer** maar staan op `--radius-sm` (`designsystem.md` §5.1), en de
   potentiechip is rechts uitgelijnd op de titelregel. Pilvormig was hij het enige ronde element in
   een scherm vol vlakken van 6, 8 en 12 pixels; rechts uitgelijnd staat het getal waarop de lijst
   gesorteerd is in één kolom in plaats van achter elke titel op een andere plek. Eén regel in
   `app/globals.css`, en daarmee in één keer voor alle chips in de app.

**Eén ding verhuisde onderweg.** `WorkKind`, het etiket, `workChipTone()` en de nieuwe
`workKindIcon()` stonden in `lib/work.ts`, en dat bestand begint met `import "server-only"` omdat
het uit vijf tabellen leest. Ze zijn nu `lib/work-kind.ts`, puur en importeerbaar (conventie 2).
Gevolg: `workChipTone()` heeft na drie weken zijn eerste test, en die bewaakt een zichtbaarheidsregel
die er echt toe doet: "bekijk wat er mis is" mag er niet uitzien als "beantwoorden". `lib/work.ts`
geeft alles onveranderd door, dus voor de rest van de app veranderde er geen import.

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
brede kaart die in tweeën valt met een merkpaneel links en het formulier rechts. Dat is gebouwd
zoals gevraagd.

**Waarom dit een uitzondering is en geen koerswijziging.** §9b van `designsystem.md` beschrijft het
open ontwerpbesluit: het hele uiterlijk is afgeleid van de werkomgeving van de concurrent, en dat
botst met de merkstrategie. Dat besluit staat nog steeds open, want het vraagt om merkassets die er
niet zijn. Wat hier gebeurd is, is smaller: één scherm draait in het merkregister in plaats van het
dashboardregister. De redenering is dat het argument voor de vlakke stijl hier niet opgaat. Dat
argument luidt: iemand zit een uur per week in een dashboard en dan vecht sier met inhoud. Op het
inlogscherm zit niemand een uur, en in de sales-led opzet is dit vaak het eerste beeld dat een
prospect in een demogesprek ziet.

**Hoe die uitzondering ingeperkt is**, want anders lekt hij. Alle vorm staat in één blok in
`app/globals.css` onder de kop "HET INLOGTONEEL", elke klasse begint met `.auth-`, en elke kleur
komt uit de bestaande tokens: er is geen enkele nieuwe tint bijgekomen. Wat wél afwijkt van het
dashboardsysteem is opgesomd en beargumenteerd: radius 24 tegenover 12, drie schaduwlagen
tegenover de ene platte, een veld van 44 en een knop van 48 tegenover 40, en het woordmerkverloop
op een tweede plek (de linkerrand van het merkpaneel).

**Wat er meeveranderde en waarom.** De inloglay-out droeg tot nu toe zelf de kop en de kaart. Dat
kon niet blijven: inloggen heeft nu een brede kaart en de andere vier schermen (registreren,
wachtwoord instellen, wachtwoord vergeten, uitnodiging) een smalle, en een lay-out die niet weet
welke route hij dient kan die breedte niet kiezen. De kop is daarom naar `auth-brand.tsx` verhuisd
en de smalle vorm naar `auth-panel.tsx`, zodat de kop nog steeds op één plek staat. De vier andere
schermen kregen zo hetzelfde decor en dezelfde kop, maar hielden hun eigen breedte.

Het formulier is een eigen component geworden (`login-form.tsx`) en niet een derde stand van
`auth-form.tsx`, om dezelfde reden die boven `password-forms.tsx` staat: dit formulier heeft iconen
in het veld, een oogknop, een andere veldhoogte en een eigen afsluiter, en dat er met vlaggen in
wringen levert een component op dat drie vormen kent en geen ervan goed. Registreren blijft op
`auth-form.tsx`.

**De oogknop is de enige toevoeging die niet over vorm gaat.** Een wachtwoordveld dat je niet kunt
teruglezen kost een typefout, en een typefout kost een inlogpoging. Het label zegt wat er gebeurt
als je klikt ("Wachtwoord tonen") en niet wat de stand nu is, want dat laatste leest een
schermlezer voor als een raadsel.

**Nagerekend in de browser** en niet alleen gebouwd: op 390, 768, 1024 en 1440 pixels loopt de
pagina nergens horizontaal over, de oogknop schakelt het veldtype beide kanten op, de twee
verlooptekens hebben elk een eigen id, er is één `h1`, en de console blijft leeg. Op een telefoon
vallen de drie planeten weg: daar staat de kaart over de volle breedte en belandden ze achter het
woordmerk en achter de inlogknop.

---

## Het inlogscherm wordt één kaart, zonder decor (24 augustus 2026, tweede ronde)

De eigenaar leverde een screenshot van een ander inlogscherm aan en vroeg om precies die opmaak, tot
op de pixel, maar dan in de kleuren van ORBIT ENGINE: licht in plaats van donker. Dat is gebouwd en
in de browser nagemeten op 962 pixels breed. De kaart staat op dezelfde hoogtes als het voorbeeld,
met hooguit twee pixels verschil: logo op 152, kopje op 224, titel op 278, eerste veld van 409 tot
457, knop van 594 tot 644, streep op 747, afsluitregel op 783.

**Wat eruit is en waarom.** Het decor van de eerste ronde van vandaag (een verlopende hemel met twee
baanringen, drie planeten en vier stofpunten) is weg, en de brede kaart met het verkooppaneel links
ook. Het voorbeeldscherm heeft één kolom op een rustige ondergrond, en alles wat daarnaast gloeit
trekt het oog weg van de twee velden die hier het werk doen. `auth-background.tsx` en
`orbit-visual.tsx` zijn verwijderd; de git-historie is het archief.

**Wat ervoor in de plaats komt.** Eén component, `auth-card.tsx`, draagt nu alle vijf de
inlogschermen: logo, mono-kopje, titel, ondertitel, formulier, uitweg, afsluitregel. Daarmee
vervallen `auth-panel.tsx` en `auth-brand.tsx`, die alleen bestonden omdat inloggen een brede kaart
had en de rest een smalle. Dat verschil is er niet meer: wie zijn wachtwoord opnieuw aanvraagt heeft
precies hetzelfde nodig als wie inlogt, namelijk één kolom met één handeling erin. Het
wachtwoordherstel-formulier draagt daarom dezelfde maten als het inlogformulier; twee formaten
formulier achter elkaar leest als twee verschillende producten.

**Wat er inhoudelijk veranderde aan de teksten.** Het e-mailveld heet "Werk-e-mailadres" en het
wachtwoordveld heeft een leesbare aanwijzing in plaats van bolletjes. Verplichte velden krijgen een
rood sterretje, wat ze eerder niet hadden. De afsluitregel onder de streep zegt dat de gegevens
versleuteld zijn: geen nieuwe belofte, wel de bevestiging die het voorbeeldscherm op die plek geeft.
De oogknop staat er nog, met dezelfde redenering als vanmorgen, maar toont nu een open oog als het
wachtwoord verborgen is: het pictogram zegt wat de klik doet, net als het label.

---

## Het ontwerpsysteem nagerekend tegen Nova's eigen CSS, en twee standen erbij (24 augustus 2026, derde ronde)

De eigenaar leverde de gecompileerde stylesheet van de NOVA-workspace aan, 93 kB met 381 tokens
erin, en vroeg of de app daar zo veel mogelijk op kon gaan lijken. Dat is een andere vraag dan hij
lijkt, want dit ontwerpsysteem is sinds 6 augustus 2026 al van Nova afgeleid. Alleen: toen uit
**schermafbeeldingen**, en nu lag hun eigen bestand ernaast.

**Het cijfer dat de ronde droeg: 45 van de 46 kleurwaarden in `app/globals.css` bleken letterlijk de
hunne.** De radiusschaal, de randdiktes, de ene schaduw en de breedte van de zijbalk klopten ook al.
De ene afwijking was `#fef3c7` waar zij `#fef3c6` hebben, één cijfer, met het blote oog onzichtbaar.
De afleiding uit screenshots was dus verrassend accuraat, en dat maakte de vier plekken waar hij het
níet was des te bruikbaarder.

**Vier dingen klopten niet.**

1. **De pagina was leiblauw met witte kaarten erop. Bij Nova is de pagina wit.** Hun `body` krijgt
   `--ds-background-neutral`, en dat is `#fff`; het leiblauw is bij hen niet de grond maar de eerste
   stap eróp, voor wat ín een kaart genest zit. Dat is de grootste zichtbare wijziging van deze
   ronde, en er is één token voor bijgekomen (`--bg-muted`) plus drie plekken die op de oude
   paginakleur leunden voor een hover of een veldvulling en die anders wit op wit waren geworden.
2. **Kleine labels waren op 6 augustus van mono naar sans gebracht**, met het argument dat mono in
   labels de "technische read-out"-stijl van de marketingsite was en niet van het product. Dat
   argument kwam uit screenshots en het klopte niet: Nova heeft `type-label` en `type-lead`,
   allebei mono, met 1 respectievelijk 2,25 pixel letterspatiëring. Teruggedraaid, met twee bewuste
   afwijkingen die in `designsystem.md` §3.2 staan.
3. **De focusring was paars.** Bij Nova is hij inktkleur. Dat is niet alleen hun keuze maar ook de
   betere: paars is in deze app óók de kleur van de hoofdknop, en een paarse ring om een paarse knop
   is geen ring.
4. **Donkere modus was op 11 augustus geschrapt** (besluit 17) omdat 107 tokens elk een doordachte
   tegenhanger nodig hebben en mechanisch omkeren grijze modder geeft. Dat argument was juist; de
   aanname eronder is achterhaald. Nova's palet draagt die tegenhangers compleet, tot en met de
   randtinten en alle zeven betekenissen. Er viel dus niets meer af te leiden.

**Wat er verder bijkwam**, allemaal op verzoek van de eigenaar om "alles" gelijk te trekken: de elf
benoemde tekststijlen (waarbij meeviel dat Tailwind's maten en regelhoogtes één op één die van Nova
blijken te zijn, dus de 399 plekken met `text-sm` stonden al goed), Nova's animatieduren van 0,12 en
0,15 en 0,20 seconde in plaats van onze geschatte 0,12 en 0,18 en 0,30, hun radius van 24 pixels,
hun eigen tokens voor de schakelaar, hun paginamarge van 14 mm bij afdrukken, en het uitzetten van
de veerbeweging aan de rand van het scherm.

**De donkere modus en de schakelaar.** De startstand volgt het besturingssysteem en er is bewust
géén knop voor die derde stand: wie zijn laptop 's avonds op donker zet verwacht dat een app dat
volgt. Klikt hij op de schakelaar rechtsboven, dan wint zijn keuze, en die staat in `localStorage`
en niet in de database. Licht of donker is een eigenschap van het scherm waar je op zit en niet van
het account: dezelfde consultant kan op zijn laptop donker willen en op de beamer in een demogesprek
licht.

Op twee plekken is donker niet de spiegel van licht, en allebei omdat het oog in donker anders
werkt. De kaart staat er één stap boven de pagina in plaats van erop samen te vallen, want een rand
van `#27323d` op `#121a22` is bijna niet te zien. En de zes grafiekkleuren wijzen naar de
`-text`-waarden in plaats van naar `-solid`, want `-solid` wordt in donker juist dónkerder (groei
gaat van `#37941c` naar `#2c711a`) en dan verdwijnt de lijn in de achtergrond.

**Wat de meting opleverde dat niemand had bedacht.** Bij het narekenen met Playwright stond een knop
die halverwege de omslag gefotografeerd werd nog volledig op de kleur van de oude stand. Dat is geen
meetfout maar de veertig elementen met een kleurovergang die allemaal tegelijk 120 milliseconden
meeanimeren: het scherm veegt over in plaats van om te klappen. Daar staat nu een klasse
`.thema-wisselt` op die elke overgang tijdens de omslag uitzet.

**Nagerekend**: de tokenlaag, alle primitieven en de inlogroute zijn in beide standen in de browser
bekeken, en de pagina loopt op 390 pixels nergens horizontaal over. De ingelogde schermen zijn dat
**nog niet**, en volgens regel 10 van `CLAUDE.md` is gebouwd niet geverifieerd; `designsystem.md`
§10.3 noemt de vier schermen die na de eerstvolgende deploy in donker langsgelopen moeten worden.

**Wat deze ronde níet oplost, en scherper maakt.** Het open ontwerpbesluit van `designsystem.md`
§9b: dit uiterlijk komt van de concurrent, en de merkstrategie vraagt om een eigen gezicht. Deze
ronde heeft de app verder naar Nova toe gebracht, niet ervandaan. Dat is met open ogen gebeurd en op
verzoek. Het tegenwicht is dat het fundament op één plek blijft zitten: wie het uiterlijk eigen wil
maken vervangt tokens in `app/globals.css` en niet honderdzestig componenten, en die eigenschap is
nu ook in de donkere stand consequent doorgevoerd. Wat er nog steeds niet is, is waar het door
vervangen zou moeten worden: er is geen logo, geen vastgesteld palet en geen typografiekeuze van
Outer Orbit zelf.

---

## De hoofdknop wordt inkt (24 augustus 2026, vierde ronde)

De eigenaar legde het echte inlogscherm van `nova.inspace.io` in donkere modus naast het onze en zag
twee dingen: **hun knop is bijna wit waar de onze paars is**, en **"Wachtwoord vergeten?" krijgt bij
hen een vlak zodra je hem aanwijst.** Allebei terecht, en het tweede legde het eerste pas echt bloot.

**Nagerekend op hun eigen pagina**, niet op een screenshot. Hun knop draagt
`bg-background-neutral-inverse text-foreground-on-neutral hover:bg-background-neutral-inverse-hover`
op `h-10 rounded-md px-4`. Dat is exact onze maatvoering, met een andere kleur. Op dat hele scherm
komt hun merkkleur nul keer voor: het woord "intelligence" staat er geen enkele keer in de opmaak.

**Wat dat betekende voor ons.** Regel 1 van `designsystem.md` §8 zegt dat een kleur een betekenis
heeft en geen naam. Zolang élke hoofdknop paars is, betekent paars "knop" en niet meer "hier doet de
AI iets". De betekenislaag was dus precies op de plek waar hij het meest opvalt niets waard, en dat
was niemand opgevallen omdat het er in de lichte stand goed uitzag.

**Het cijfer dat het beslechtte: de oude paarse knop haalde in donkere modus 2,39:1 tegen zijn eigen
kaart.** Het vlak liep bijna in de achtergrond over. De nieuwe inktknop haalt 13,0:1 in licht en
13,8:1 in donker voor zijn tekst, waar de oude op 6,8:1 zat. De eigenaar zag met het blote oog wat de
rekensom bevestigde.

**Wat er verder uit voortkwam**, allemaal hetzelfde patroon (inkt voor nadruk, kleur voor betekenis):

- **Een derde knop, `.btn-ghost`.** Die bestond niet, en daardoor stonden uitwegen als kale link
  onder een knop van 50 pixels te zweven. Nu hebben ze dezelfde maat en bij hover 5% van de
  inktkleur, precies zoals Nova.
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

**Wat we bewust niet overnamen: hun logo.** Dat is bij hen wit in donkere modus, en de eigenaar
merkte dat op. Hun woordmerk is één vorm die op `currentColor` staat, dus wit is daar de enige
mogelijkheid die er is. Het onze is twee merkkleuren die al meedraaien met de stand, en nu de knop
inkt is, is het woordmerk de laatste plek waar het merk nog kleur heeft. In donker haalt het 6,4:1
(groen) en 3,9:1 (paars) op een woordmerk van deze maat: toegestaan, maar niet ruim. Wit zou 16,3:1
geven. Dat is één regel als het alsnog moet.

> ⚠️ **Teruggedraaid nog dezelfde dag**, op verzoek van de eigenaar. Zie het volgende blok, punt 3:
> het argument hierboven keek naar de kleur en niet naar de maat.

**Nagerekend** in beide standen: de primitieven, het inlogscherm inclusief de hover op de uitweg, en
`scrollWidth` 390 op 390 pixels. De ingelogde schermen wachten nog steeds op de eerstvolgende deploy,
zoals `designsystem.md` §10.3 zegt.

---

## Donker nagekeken met de ogen van Nova (24 augustus 2026)

De donkere stand was er sinds diezelfde ochtend, maar hij was gebouwd en niet bekéken. De eigenaar
legde er schermafbeeldingen naast en stelde één vraag: kloppen de kleuren zoals wij ze toepassen.

**Het palet klopte, de toepassing niet.** Van de 59 donkere kleurwaarden die de app van Nova
overneemt is er geen enkele die afwijkt; dat is narekenbaar tegen hun eigen gecompileerde CSS en het
is nagerekend. Alle vier de problemen die de eigenaar zag zaten dus niet in wélke kleur, maar in
wáár hij stond.

**1. De inlogkaart had geen rand meer.** De grond onder die kaart stond op `--bg-muted`, en dat is in
donker `#27323d`. De kaart zelf is `#17212b` en zijn rand is `#27323d`. De kaart lag dus in een
lichter kader, met een rand in precies de kleur van dat kader: onzichtbaar. De grond heeft nu een
eigen token (`--bg-stage`) dat per stand de andere kant op gaat, `#f8fafc` onder een witte kaart in
licht en `#121a22` onder een donkere in donker.

**2. Dezelfde kaart was een maat te groot**, en dat viel de eigenaar op naast het origineel. Nova's
eigen CSS wijst vijf waarden aan die hier alle vijf ruimer stonden: 560 breed tegen hun 520, 16 rond
tegen hun 12, 52 pixels marge tegen hun 32 en 40, velden van 48 tegen hun 44, en een kop van 28
pixels op gewicht 700 tegen hun 24 op 600. Het cijfer dat het beslechtte: in Nova's gecompileerde CSS
komt geen enkele `rounded-xl` of `rounded-2xl` voor, terwijl die tokens er wél zijn. Twaalf pixels is
in de praktijk hun grootste ronding, tot en met hun inlogscherm.

**3. Het woordmerk is wit geworden in donker.** Dat is een terugdraai van een besluit van dezelfde
ochtend, en de eigenaar had gelijk. Toen luidde het argument: hun logo is één vorm op `currentColor`
dus wit is daar de enige mogelijkheid, terwijl het onze twee merkkleuren draagt en dat na het inkten
van de hoofdknop de laatste plek is waar het merk nog kleur heeft. Wat dat argument oversloeg is de
maat. Het gaat om letters van 17 pixels hoog op een bijna zwarte balk, en een verloop van groen naar
paars over die afstand leest niet als een merk maar als een kleurvlekje. Wit haalt 16,3:1 tegenover
6,4:1 en 3,9:1, en het is het eerste wat het oog raakt bij het openen van de app. Het merkteken
ernaast leest dezelfde tokens uit en wordt dus mee wit.

**4. De zijbalk was de felste kleur van het scherm**, en dat was het zwaarste van de vier. De actieve
regel droeg een paars vlak (`#42006d`) met paarse letters erop (`#ad45ff`): 2,6:1, onder de 4,5 die
leesbare tekst vraagt. Erger dan dat cijfer is wat het met de betekenislaag deed. Paars betekent in
dit systeem "hier doet de AI iets", en zolang de balk het naast élk scherm gebruikt voor "je bent
hier" betekent het dat niet meer. Dat is letterlijk dezelfde redenering die diezelfde ochtend de
hoofdknop van paars naar inkt bracht, en de zijbalk was daarbij overgeslagen. Nu is de actieve regel
een neutraal vlak met gewone tekstkleur, dus wit in donker, met een hover van 5% inkt eronder zodat
"waar je bent" zwaarder weegt dan "waar je overheen zweeft". De vier `alleen jij`-stempels en het
icoon van een ingeklapt hoofdstuk gingen in dezelfde ronde mee.

**Wat er ongevraagd bij kwam, en waarom.** Nova's typografieschaal kent geen enkel gewicht boven 600
en zet élke letterspatiëring op 0. Onze koppen stonden op 24 plekken op `text-2xl font-bold
tracking-tight`. Dat is het soort verschil dat niemand bewust ziet en dat wel bepaalt of een scherm
"van hen" of "van ons" lijkt, dus die 24 koppen gebruiken nu de benoemde klassen. De grote cijfers
blijven op 700: een getal dat het antwoord van het scherm is, is geen tekst.

**Nagerekend.** De inlogroute is in de browser gefotografeerd, licht én donker, op 1280 pixels; de
kaart meet daar 520 breed in beide standen. De vier controles uit `designsystem.md` §11 geven nul
regels, en de uitzondering die daar voor `orbit-mark.tsx` stond is vervallen omdat dat bestand geen
hexwaarden meer heeft. `npx tsc --noEmit`, 2195 unittests, de ketentests en de productiebuild zijn
groen. De ingelogde schermen wachten nog steeds op de eerstvolgende deploy, zoals §10.3 zegt.

**Wat we van Nova's berichtencatalogus meenamen, en wat nog openstaat.** `docs/nova-i18n.json` is op
dezelfde dag doorgelopen op wat het over hun vormgeving verraadt. Drie dingen die wij nog niet doen:
zij zetten de keuze licht/donker/systeem als drieweg-keuze onder "Weergave" in de accountinstellingen
en niet als knop in de balk; elke lege staat is bij hen een titel plus een uitleg en nooit één zin;
en elke onomkeerbare handeling in een dialoog draagt een apart blokje "dit kan niet ongedaan gemaakt
worden" in plaats van een zin in de lopende tekst. Geen van drieën is in deze ronde gebouwd.

---

## De twee andere punten uit Nova's berichtencatalogus doorgevoerd (24 augustus 2026)

Van de drie dingen die de vorige alinea openliet, zijn er nu twee gebouwd. Het drieweg-keuzemenu
voor licht/donker/systeem staat nog open; dat raakt de accountinstellingen en is een eigen stuk werk.

**1. De laatste kale `window.confirm()` is weg.** Het onderzoek bijwerken in de onboardingsessie
(`app/(app)/merk/[id]/_components/onboarding-session.tsx`) was de enige plek in de app die nog een
browsereigen bevestigvenster gebruikte, met alles op één regel: welke stappen opnieuw draaien, wat
dat kost, en "Doorgaan?" achter elkaar. Alle andere onomkeerbare handelingen gebruikten al
`ConfirmDialog` met zijn `irreversible`-blok (`plan-view.tsx`, `account-box.tsx`,
`delete-account-box.tsx`), dus het patroon zelf bestond al en hoefde niet gebouwd te worden. Wat
ontbrak was de laatste plek waar het niet werd toegepast.

`describeRefresh()` in `lib/pipeline/onboarding-refresh.ts` bouwde die ene samengestelde zin. Hij
heet nu `refreshConfirmation()` en levert twee velden: `body` (wat er opnieuw draait) gaat naar de
lopende tekst van het venster, `cost` (het bedrag) gaat naar het aparte blokje. Een consultant die op
"Onderzoek bijwerken" klikt ziet nu hetzelfde soort venster als bij het vrijgeven van een maand
content: een gewone zin, en daaronder in een eigen kader wat hij niet kan terugdraaien.

**2. Vijf kale lege zinnen kregen een tweede zin erbij.** De meeste lege staten in de app bleken al
title+uitleg te zijn, alleen niet altijd met een zichtbare kop erboven: het `mono-label` + `<p>`-
patroon (bijvoorbeeld `zoekverkeer/page.tsx`, `merkprofiel/page.tsx`, `csm-view.tsx` bij "Nog geen
merken") komt op hetzelfde neer als Nova's title/description-paar, en een losse `<p>` met twee zinnen
(bijvoorbeeld `library-list.tsx`, `offerings-panel.tsx`, `loop-blocks.tsx`) ook. Vijf plekken waren
dat niet: één kale zin zonder enige uitleg, echt de "geen analyses"-doodlopende weg uit
`docs/ux-design.md` §4.

- Twee regels in `admin/page.tsx` ("Nog geen herkomst vastgelegd", "Nog geen onderwerp-onderzoek")
  en één in het kostenlogboek eronder kregen een tweede zin die zegt wanneer het blok zich vult.
- `prompts-manager.tsx` zei "Nog geen vragen in deze categorie" terwijl er direct daaronder een
  formulier staat om er een toe te voegen; de zin verwijst er nu naar, hetzelfde patroon als
  `faq-editor.tsx` al gebruikte.
- `answers-view.tsx` zei bij een leeg filter alleen "Geen vragen binnen dit filter" zodra "alleen
  gemist" uitstond; de zin legt nu uit wat je kunt doen om weer iets te zien.

**Wat bewust niet is aangepast.** De lege-segmentteksten in `lib/csm.ts`
("Niets vastgelopen.", "Elk merk heeft minstens één meting.") zijn overal kale zinnen, en dat staat
er met opzet: het commentaar erboven zegt "een leeg segment is goed nieuws", en een leeg CSM-segment
vraagt geen volgende stap, in tegenstelling tot een lege `/analyses`. De zoekresultaten in
`brand-switcher.tsx` ("Geen merk gevonden voor…") zijn ook met opzet kaal: Nova doet dit bij hun
eigen zoeklijstjes (`noClientsMatch`, `noDomainsMatch`) net zo, één zin zonder uitleg. Title plus
uitleg is voor het scherm dat leeg blijft, niet voor een zoekveld dat nul treffers geeft.

Nagerekend: `npx tsc --noEmit`, 2197 unittests (twee nieuwe voor de gesplitste `refreshConfirmation`),
303 ketentests en de productiebuild zijn groen. De vier controles uit `designsystem.md` §11 geven nul
regels.

---

## 25 augustus 2026: ontwerpronde op het merkoverzicht, de landingspagina

Het merkoverzicht kreeg een ontwerpronde. Aanleiding: dit is sinds 17 augustus de bestemming na
inloggen (`app/page.tsx`), en bij een klant met één merk is er geen tussenstap. Het is dus niet een
scherm dat je opzoekt maar het eerste scherm van elke sessie, en dat verandert waar het antwoord op
moet geven. De volledige vormregels staan in `docs/ux-design.md` §5; de ronde zelf, met wat er is
afgewezen, in `docs/tasks/ontwerprondes.md`.

**Wat het scherm mankeerde, in drie zinnen.** Acht blokken van gelijk gewicht, waardoor het antwoord
op zijn eigen titelvraag één getal zonder richting was en de enige echte handeling er kleiner uitzag
dan zes adviezen. De enige kleur die er lag, zes identieke groene potentiechips, beloofde een
rangorde die er niet was, terwijl de gegevens die wél onderscheiden allemaal opgehaald werden en niet
in beeld kwamen. En er stonden drie versies van hetzelfde getal plus één regelrechte tegenspraak op
één scherm.

**Het cijfer dat drie keer anders was.** De standkaart toonde 57%, de duiding eronder "je
zichtbaarheid steeg van 30 naar 60" en het opbrengstblok "+30 punten". Nagerekend op Gasservice
Brabant: de standkaart nam `weighted_score` en woog de clusters op `winnable_runs`,
`lib/insights-data.ts` en `lib/milestones-data.ts` namen allebei de ongewogen `score` en middelden
de clusters ongewogen. Bij één cluster scheelt dat 3 punten, bij meerdere clusters meer.
`lib/brand-score.ts` doet die som nu één keer; alle drie de blokken lezen die uitkomst en de
startpagina heeft haar eigen tweede query op `visibility_scores` niet meer nodig.

**De chip die zes keer 68 zei.** De potentiescore is zichtbaarheidsgat maal zoekvolume, het
zoekvolume hoort bij het onderwerp, en Gasservice Brabant heeft er één. Alle zeven aanbevelingen
kwamen daardoor uit op precies 68 van de 100. Op het scherm stonden zes identieke groene chips op de
meest opvallende plek van elke kaart, terwijl de regel eronder beweerde dat de lijst gesorteerd was
op wat de kansen opleveren. De chip verschijnt nu alleen nog als hij binnen de lijst varieert
(`potentieVarieert`), en op zijn plek staat wat wél verschilt: hoeveel gemeten vragen een kans raakt.
Dat scheelt bovendien het duurste deel van de laadtijd, want die score kostte vier leesqueries per
aanbeveling.

**De tegenspraak.** "1 · Pagina gepubliceerd" stond op hetzelfde scherm als "Nog geen van je 120
geplande pagina's staat live". Allebei waar: de eerste pagina van dit merk is geschreven vóórdat het
contentplan bestond en hangt aan geen enkele planregel. Twee tellingen van hetzelfde ding die elkaar
tegenspreken, en dan gelooft de klant geen van beide. `planRegels()` in `lib/overview.ts` benoemt het
verschil nu.

**Wat de landingspagina-status oplevert aan regels.** Drie, en ze gelden voor elke toekomstige
landingspagina: zeg hoe vers de data is (er wordt maandelijks gemeten en de klant kijkt vaker, dus
zonder meetdatum ziet hij vier keer hetzelfde cijfer zonder te weten dát het hetzelfde is); geef het
scherm precies één primaire knop en zet die bij wat er op de klant wacht; en behandel de half
gevulde staat als de eerste indruk, niet als randgeval. Dat laatste betekent dat de verdiepingslaag
in de eerste maand wegvalt in plaats van drie nullen en vier lege balken te tonen.

Nagerekend: `npx tsc --noEmit`, 2241 unittests (39 nieuwe, voor `brand-score.ts`, `overview.ts` en de
kansenlijst), 303 ketentests en de productiebuild zijn groen. Het resultaat is in beide standen
bekeken op de echte productiedata, in drie staten: het gevulde scherm, een merk met vijf metingen en
de eerste maand.

---

## 26 augustus 2026: het overzicht toont de omvang van het programma

Vervolg op de ontwerpronde van de dag ervoor, en op één punt een correctie daarop door de eigenaar.

**Het zichtbaarheidspercentage is van de startpagina af.** Het stond er als hoofdgetal, met de marge,
het verschil en het verloop eromheen. Het staat nu op Analytics, één klik weg via de knop die er nog
steeds naast staat, en in woorden in de drie duidingszinnen eronder. De reden: de vraag die een
klant bij het inloggen stelt is niet "wat is mijn score" maar "wat loopt er voor mij, en wat staat
er klaar". Vier tellingen in de plaats, over de volle breedte: pagina's gepubliceerd, clusters
actief, nieuwe pagina's voorgesteld, paginaoptimalisaties voorgesteld. Geen van de vier draagt een
vergelijking met een vorige periode, want het zijn standen en geen metingen: het aantal clusters
verandert doordat de eigenaar er een aanzet, niet doordat er gemeten is.

**Het opbrengstblok is verwijderd, en daarmee een deel van besluit 7.** "Actief sinds", "+30 punten"
en "1 pagina gepubliceerd" stonden onderaan het overzicht als het middel dat opzeggen tegenhoudt bij
een doorlopend opzegbaar abonnement. Van die drie is er één overgebleven, bovenaan tussen de vier
programmacijfers. `lib/milestones.ts`, `lib/milestones-data.ts` en
`components/milestones-block.tsx` zijn verwijderd en vervangen door `lib/overview-data.ts`, dat nog
één telling doet. Wat dat betekent, expliciet: het argument "waar betaal ik voor" staat niet meer in
die vorm op de startpagina, en `accounts.value_per_mention_eur` uit besluit 16 wordt daardoor op geen
enkel scherm meer getoond. De kolom blijft bestaan en blijft bewerkbaar; komt er een scherm dat over
rendement gaat, dan hoort hij daar.

**Het contentplan en het activiteitenblok staan nu onder elkaar over de volle breedte.** Ze stonden
op desktop naast elkaar omdat ze allebei smal van inhoud waren, maar het plan is het enige blok met
vier soorten inhoud en werd in een halve kolom geknepen. Over de volle breedte staan de fases en de
contentmix náást elkaar, waardoor die kaart half zo hoog is. Het activiteitenblok toont vijf regels
open en hooguit vijftien in totaal: dezelfde harde grens als op de wachtrij, want `activiteit()`
groepeert per taaksoort en er zijn er 32. Het is het enige blok waar geen handeling uit volgt, dus
het hoort nooit het langste te zijn.

Nagerekend: `npx tsc --noEmit`, 2241 unittests, 303 ketentests en de productiebuild zijn groen. De
mijlpalentests zijn vervangen door tests op de vier nieuwe cijfers, inclusief een grens op de lengte
van de toelichting: drie van de vier kolommen zijn 24 pixels smaller dan de eerste, en een regel die
alleen dáár afbreekt leest als een fout.

---

## 25 augustus 2026: het contentplan wordt een voorraad met twaalf lege maanden

**De aanleiding was één zin van de eigenaar: "ik vind het plannen van content nog heel
onoverzichtelijk".** Wat het narekenen opleverde was erger dan onoverzichtelijk.

Het plan van Gasservice Brabant telde 120 pagina's over twaalf maanden. Die 120 bestonden uit **28
unieke titels**: zeven clusters maal vier funnelfasen, uitgesmeerd over 120 plekken, dus "Cv-ketel
huren · Kiezen" stond er vijf keer in. En van die 120 waren er **17 daadwerkelijk te schrijven**.
Schrijven leunt op de gemiste vragen uit een meting als briefing (`lib/plan-writing.ts`), en van de
zeven clusters is er precies één gemeten. Nog eens 17 pagina's hingen aan "Cv-ketel kopen", een
cluster dat de eigenaar zelf had afgewezen nadat het plan gemaakt was.

Het scherm loog dus twee keer tegelijk: het beloofde variatie die er niet was, en werk dat niet kon
beginnen. De rekenkunde van `buildPlan()` klopte tot achter de komma, inclusief de `funnelShift()`
die eerder een dubbele titel per maand oploste. De aanname eronder klopte niet: dat er genoeg te
schrijven vált zodra er onderwerpen zijn.

**De omkering.** `planned_pages.plan_month_id` mag nu leeg zijn (migratie `0065`), en dát is de
voorraad: een pagina die beschikbaar is maar nog geen maand heeft. Eén tabel voor twee toestanden,
want inplannen mag geen rij verplaatsen: dan verliest een kaart bij elke sleepactie zijn status, zijn
geschreven tekst en zijn geschiedenis. Nu verandert er bij inplannen precies twee dingen, de maand en
de datum.

De voorraad wordt gevuld met **alleen gemeten kansen**: de aanbevelingen uit het laatste rapport van
een gemeten cluster, elk met de reden erbij, de doelvragen die hij raakt, en de potentiescore die over
precies die doelvragen is uitgerekend. Dat is een bewuste versmalling en hij doet op dag één pijn:
Gasservice Brabant gaat van 120 rijen naar **7 kansen uit één cluster**. Dat is de eerlijke stand, en
het scherm maakt er een handeling van in plaats van een leegte: de zes niet-gemeten clusters staan
apart in de zijkolom, met de meting als volgende stap.

`createPlan()` maakt twaalf lege maanden en vult alleen maand 1, met de sterkste kansen tot aan de
quota. Twaalf lege maanden zijn eerlijk maar doen niets; het systeem hoort de eerste zet te doen en
de mens hoort hem te kunnen overrulen (`docs/visie.md`). De rest van het jaar sleept de gebruiker
zelf bij elkaar.

**Vier keuzes van de eigenaar bepaalden de vorm**, en twee ervan gingen tegen mijn advies in. Alleen
gemeten kansen in de voorraad (ik stelde voor er ook cluster × fase-combinaties in te zetten, zodat
de lijst altijd gevuld is). Alles terug naar nul, ook de lopende maand augustus. Een voorzet voor
maand 1. En **geen enkele grens** aan het aantal pagina's per maand: het scherm toont wel hoeveel je
boven je pakket zit, maar houdt niemand tegen.

**Slepen, en waarom `lib/plan-order.ts` toch overeind blijft.** Dat bestand legt uit waarom volgorde
met knoppen gaat en niet met slepen: HTML5-drag doet niets op een telefoon, en de eerste klacht van
dit hele traject ging over mobiel. Die redenering staat nog steeds. Daarom is slepen hier niet de
enige weg: elke kaart draagt ook een keuzelijst "Plan in", en die werkt met een vinger, met een
toetsenbord en met een schermlezer. Slepen is de snelle weg voor wie een muis heeft, geen voorwaarde.

**Twee fouten die onderweg boven kwamen en niets met het ontwerp te maken hadden.** De cron gaf elke
planpagina onvoorwaardelijk `action: "nieuw"` mee aan de schrijfstap; bij Gasservice Brabant hadden
vier van de zeven kansen `verbeteren` moeten zijn, en die zouden dus een tweede pagina hebben
opgeleverd naast de pagina die ze hadden moeten aanvullen. En `loadPlan()` las alle pagina's van het
merk in plaats van die van de lopende planversie, dus na een tweede planversie telde de kop de rijen
van de eerste mee.

Verder: `buildPlan()` is verwijderd (wat overblijft zijn twee constanten in `lib/plan-constants.ts`),
en er is een knop "Opnieuw opzetten" bijgekomen. Die ontbrak: zodra er één plan stond was er geen weg
terug, en het scherm beloofde bij het afwijzen van een maand een nieuw voorstel dat nooit kwam.

Nagerekend: `npx tsc --noEmit`, 2231 unittests, 322 ketentests en de productiebuild zijn groen. De
ketentest zet de volledige keten onder een potentiescore neer (aanbeveling → doelvraag → meting →
vermelding → zoekvolume) en controleert dat de voorzet de hoogste kiest, dat de andere kans in de
voorraad blijft staan, dat drie keer synchroniseren geen enkele dubbele kaart oplevert, en dat een
pagina die al geschreven wordt niet terug de voorraad in kan.

---

## 25 augustus 2026: Instellingen leeg, het profielmenu een uitklapmenu (opdracht van de eigenaar)

**"Koppelingen" verhuisde van Instellingen naar Admin, en alleen de beheerder mag er nog komen.**
Een koppeling met Search Console zet de consultant vóór het demogesprek klaar, de klant maakt hem
nooit zelf (het product is sales-led, besloten 3 augustus 2026). De zijbalk liet de knop tot nu toe
gewoon aan de klant zien, zonder dat hij er iets aan had. `app/(app)/instellingen/koppelingen/page.tsx`
roept nu zelf `isStaff` aan en antwoordt met een 404, net als de andere afgeschermde routes: een
verborgen menu-item is nog steeds een adres dat te raden is. In `lib/nav.ts` is Admin daarmee van
vier naar **vijf** bestemmingen gegaan, drie over dít merk en twee uitgangen naar de app als geheel
("Alle merken", "Koppelingen").

**"Account en team" is uit de zijbalk weg en staat nu als "Mijn account" achter het profiel-icoon.**
Met "Koppelingen" weg had "Instellingen" geen enkele bestemming meer over, en een kop die voorgoed
leeg is, is geen kop: "Instellingen" is uit `HOOFDSTUKKEN` verwijderd. De pagina `/instellingen`
bestaat gewoon nog, alleen de ingang ernaartoe is verhuisd.

**Het profielmenu is geen full-screen sheet meer, maar een klein uitklapmenu** (opdracht van de
eigenaar, met een referentiescreenshot van een taalkiezer als voorbeeld). De sheet naar het
"Pick your orbit"-patroon van InSpace droeg intussen nog maar één link, en een schermvullend paneel
voor één link is zwaarder dan wat het opent. `components/profile-menu.tsx` is herschreven naar
hetzelfde uitklapmenu-patroon als `components/brand-switcher.tsx`: een kaart onder het icoon met
`--shadow-overlay`, gesloten door een klik erbuiten of Escape. Hij toont twee rijen, "Mijn account"
(naar `/instellingen`) en "Uitloggen", plus het e-mailadres. `ACCOUNT_NAV` in `lib/nav.ts` is
daarmee overbodig geworden en is verwijderd: een lijst van één regel hoeft geen apart bestand meer
te delen tussen twee componenten.

Nagerekend: `npx tsc --noEmit`, 2235 unittests, 322 ketentests en de productiebuild zijn groen.

---

## 26 augustus 2026: het contentplan werd leesbaar

De indeling van de dag ervoor was compleet en onleesbaar. Eén regel van maand 1 besloeg vijf regels
tekst en droeg zeven bedieningen, waaronder een keuzelijst van veertig pixels over de volle breedte.
Tien van die blokken, elk in een eigen kaart binnen de kaart van de maand, vulden anderhalf scherm
met tien titels en tien datums.

Wat eraf ging staat per onderdeel in `docs/tasks/ontwerprondes.md`. De kern: de keuzelijst werd een
menu achter drie puntjes, de zin die tien keer stond staat nu één keer boven de maand
(`sharedNotice()`), de statuschip verschijnt alleen nog als een regel afwijkt van de normale gang
van zaken, en de regels zijn platte rijen in plaats van kaarten. Een geplande regel is nu één regel.

**Twee fouten die alleen zichtbaar werden door het scherm echt te renderen.**

De eerste is een valstrik in het ontwerpsysteem zelf. `--color-base` in het `@theme inline`-blok
maakt van `text-base` een KLEURklasse, niet de tekstgrootte die je in elk ander Tailwind-project
krijgt. De kop "Beschikbaar" stond daardoor in de donkere stand in de kleur van de paginagrond, dus
onzichtbaar, terwijl de code prima compileerde en alle 2241 tests groen bleven. De waarschuwing
staat nu bij het token in `app/globals.css` en in `docs/designsystem.md` §3.2. Dezelfde botsing
loert bij `surface`, `elevated`, `ink`, `muted`, `purple`, `green`, `success`, `error`, `warning`
en `info`.

De tweede: `spreadDates()` verdeelde de pagina's van maand 1 over de héle maand, ook als die maand
al half voorbij was. Het plan van Gasservice Brabant werd op 25 augustus opgezet met augustus als
maand 1, dus negen van de tien pagina's kregen een datum die al geweest was en het scherm meldde
negen keer "Stond gepland voor 1 augustus". In de lopende maand begint de spreiding nu morgen.
Twee unittests die op de echte klok leunden zijn tegelijk deterministisch gemaakt: ze waren een
halfjaar lang groen en zouden in augustus 2026 rood zijn geworden zonder dat er iets veranderd was.

Nagerekend: `npx tsc --noEmit`, 2241 unittests, 322 ketentests en de productiebuild zijn groen, en
het scherm is in beide standen bekeken met een gerenderde schermafbeelding van het echte component.

---

## 26 augustus 2026: Mijn reputatie grondig herbouwd als scherm

**De opdracht van de eigenaar: "de klant wil gewoon zien wat zijn reputatie is in AI, verdeeld per
product", met de melding dat het scherm overweldigend en onoverzichtelijk was.** De meetkant is niet
aangeraakt: geen migratie, geen prompt, geen nieuwe AI-aanroep en geen enkel cijfer opnieuw
berekend. Wat er veranderd is, is wat er getoond wordt, in welke volgorde en hoe zwaar. De volledige
indeling staat in `ux-design.md`; hier staat waarom.

**Het scherm ontkende zijn eigen bevinding.** Bovenaan stond de chip "neutraal 0", twee regels lager
de zin "bij 22 van de 22 vragen noemt ChatGPT zowel lof als kritiek". Beide waar: alle 22 bruikbare
oordelen van Gasservice Brabant kregen het etiket `gemengd`, dat scoort altijd exact 0, en 0 heet op
de schaal neutraal. Maar de zwaarste mededeling van het scherm ontkende zo de op één na zwaarste, en
"neutraal" is precies het woord waarbij een ondernemer zijn schouders ophaalt. De kop zegt nu
"verdeeld" zodra de helft of meer van de oordelen gemengd is (`reputationHeadline()`). Dat is de
enige weergaveregel die deze ronde toevoegt, en het cijfer eronder verandert er niet van.

**De beste tabel van de module werd nooit uitgelezen.** `reputation_market` bevat per product wie
ChatGPT aanraadt als een koper vraagt welk bedrijf hij moet hebben, en op welke plek de klant zelf
staat. Het scherm raakte die tabel geen enkele keer aan, terwijl daar het enige cijfer in zit waar
rechtstreeks geld aan hangt. Op de run van 23 augustus stond erin: genoemd bij 4 van de 9 gemeten
producten, niet genoemd bij 5, en bij cv-ketel storing raadt ChatGPT Kemkens, Warmte Centrum
Brabant, VSB, MVS en Van Beek aan. Dat is nu de indeling van het hoofdstuk per product, in drie
groepen, met de groep waar het misgaat bovenaan.

**Twaalf producten, twaalf identieke regels.** Elke regel droeg de badge "1 vraag" en de chip
"neutraal 0", en opengeklapt stond er "ChatGPT geeft een neutrale toon van 0" en verder niets. De
oorzaak: `top_pros` en `top_cons` van een aanbodrij houden alleen punten over die in twee of meer
antwoorden terugkwamen, en er is één vraag per product. Ondertussen lagen er in `reputation_answers`
89 pluspunten en 60 bezwaren klaar, per product, met bron. Het scherm leest ze nu daar, met dezelfde
opschoning als de synthese (`cleanPoints`) en dezelfde scheiding tussen een echt bezwaar en een
opmerking over ons eigen bewijs (`experiencePoints` tegenover `evidenceRemarks`).

**Eén getal is van het scherm af omdat het niet kon kloppen met de lijst eronder.** De steunkaart zei
"gemiddeld op plek 2,3 van 6". Dat gemiddelde loopt over alle marktvragen, ook de merkbrede met zes
partijen, terwijl de vier producten eronder op plek 2 van 3, 2 van 5, 3 van 5 en 2 van 4 staan:
nergens een noemer van 6. `market_position` blijft opgeslagen voor de vergelijking over de tijd.

**Vijf chips werden één meter.** "neutraal 0", "marge ±6", "bewijs 99", "1.7e van 4 · indicatief" en
"eenduidigheid 71" stonden op één rij, in dezelfde vorm en hetzelfde gewicht, terwijl er precies één
hoofdgetal is. De meter toont de schaal zelf, zet de marge als band eromheen en noemt het oordeel in
woorden; de bewijskracht staat als woord ernaast ("stevig onderbouwd") in plaats van als 99 op een
schaal die alleen wij kennen.

**Wat nog steeds openstaat, en het is geen bug maar een productkeuze:** het etiket `gemengd` scoort
altijd exact 0, ongeacht hoeveel of hoe zwaar de bezwaren zijn. Deze ronde maakt dat zichtbaar in
plaats van misleidend, maar lost het niet op. Een volgende ronde zou het aantal en de soort bezwaren
in het cijfer zelf laten meewegen.

**Nagerekend tegen de opgeslagen run en niet alleen tegen tests** (conventie 10). De 12 producten,
46 antwoorden en 61 marktrijen van run `2df64a13` zijn door de nieuwe weergavelaag gehaald: de drie
groepen komen uit op 5, 4 en 3, elke regel levert een eigen zin op met de bedrijven die ChatGPT in
plaats van de klant noemt, en de bezwarentelling onderscheidt "onverwacht hoge kosten" bij 6
producten van "conflict over een afspraak voor een gaslek" bij 4.

Migraties ongewijzigd (t/m `0065`), 2290 unittests en 322 ketentests groen, en de productiebuild is
schoon.

---

## 26 augustus 2026: een hele klant nagebootst, en wat daaruit viel

Er stond nog nooit één klant volledig door de keten heen. Er waren losse verificaties per fase, maar
niemand had de reis van webadres tot gepubliceerde pagina met zoekcijfers achter elkaar gelopen.
Daarom is **Huyberts Keukens** (huyberts.nl, keukenspeciaalzaak in Sint-Oedenrode) er als testklant
doorheen gehaald: aanmaken, onderzoek, demogesprek, cluster, meting, rapport, contentplan, twee
geschreven pagina's, een gefingeerde publicatie met 543 dagen Search Console-cijfers, en de
effectmeting. Kosten van de hele reis: **$2,85 over 216 AI-aanroepen**.

De keten werkt. De commerciële laag uit het gesprek komt terug in het rapport (het noemt het
omzetdoel van de klant), de meting ontdekte concurrenten die het vooronderzoek niet kende (Berkers
Keukens staat vier keer als eerste aanbeveling op positie 1,2 terwijl Huyberts nergens genoemd
wordt), en de geschreven pagina's gebruiken de antwoorden uit het gesprek als feiten. Maar de reis
legde ook zes dingen bloot die geen enkele test kon vangen, want ze zitten allemaal in de samenhang
tussen stappen.

**1. De effectmeting gooide 56 van haar 112 betaalde zoekacties weg.** Twee unieke indexen op
`tracking_runs` spreken elkaar tegen. `tracking_runs_impact_unique_idx` (migratie `0020`) zegt: één
meting per pagina, golf, vraag en doel. `tracking_runs_idem_idx` (migratie `0041`) zegt: één meting
per analyse, vraag, week, engine, herhaling en doel, en die kent `impact_wave` en
`content_piece_id` niet. Een impactmeting draagt week 0 en herhaling 0, dus golf 2 van dezelfde
vraag botst met golf 1, en twee pagina's die dezelfde vraag als doel hebben botsen met elkaar. Het
opslaan mislukt dan **nadat** de web-zoekactie betaald is, en de taak probeert het vier keer.
Veertien taken maal vier pogingen is 56 weggegooide zoekacties, ongeveer $0,86 van de $1,73 die de
metingen kostten. Precies de helft.

**2. Een pagina uit het contentplan kan nooit gemeten worden.** `/api/cron/plan` bouwt zijn
schrijfopdracht uit `planBriefing()` en zet daar `why`, `targetIntent`, `action` en `existingUrl`
bij, maar géén `targets`. `saveTargets()` in `content.ts` schrijft daarom nul rijen in
`content_piece_targets`, en `planImpactWaves()` slaat de effectmeting over met de melding "geen
doelvragen". Fase 5 bestaat dus niet voor pagina's die via het plan geschreven zijn, en dat is sinds
migratie `0065` de normale route. De doelvragen liggen wel klaar: ze staan in
`reports.recommendations_json`, en `planned_pages.source_ref` wijst er met rapport-id plus
volgnummer rechtstreeks naar.

**3. De titel van een geschreven pagina is een opdracht aan de klant.** `content.ts` neemt
`recommendation.title` letterlijk over, en dat is de aanbeveling uit het rapport. De pagina heet nu
"Publiceer een regionale pagina voor keukenrenovatie in Eindhoven". De `meta_title` die het model
zelf schrijft klopt wel ("Keukenrenovatie Eindhoven | Huyberts Keukens").

**4. De potentiescore onderscheidt niets bij een nieuwe klant.** Alle zeven kansen van Huyberts
kregen exact 58. De score is `(1 − zichtbaarheid/100) × zoekvolume` en het zoekvolume is per
onderwerp, dus bij zichtbaarheid nul valt hij voor elke kans van hetzelfde onderwerp gelijk uit.
Juist bij de klant die nog nergens genoemd wordt, en dat is elke nieuwe klant, is er niets te
sorteren.

**5. Een artikel schrijven past niet in het tijdbudget van 105 seconden.** Het tweede artikel (1034
woorden) had vier pogingen nodig voor de schrijfstap en nog eens vier voor de herschrijfstap, elke
keer afgebroken met "Request was aborted". Het lukte uiteindelijk, maar het kostte een halfuur en
zes verspilde aanroepen op het duurste model. De pagina van 574 woorden ging in één keer goed.

**6. Het effectoordeel kan bij een handvol doelvragen nooit iets anders zeggen dan "gelijk".**
`thresholdOf()` rekent een 95%-band over twee binomiale schattingen. Bij twee doelvragen is die band
92 procentpunt breed, bij één doelvraag 136. De Eindhoven-pagina ging van nul naar één van de twee
doelvragen, een stijging van 50 punten, en kreeg "gelijk". Het cijfer is statistisch correct en
tegelijk onbruikbaar: de test kan bij deze aantallen alleen maar "geen verschil" zeggen.

Kleiner, maar genoteerd: de claimvalidator markeert feiten die de klant in het gesprek zelf
bevestigd heeft als "zonder bron" (vier zinnen op de Eindhoven-pagina, waaronder het eigen
montageteam), en `POST /api/profiles/[id]/assign` verplaatst wel `profiles.user_id` en
`analyses.user_id` maar voegt de klant niet toe aan `account_users`, zodat hij binnenkomt via de
oudere eigenaarsregel in plaats van via de accountlaag.

**Wat aan deze testklant niet echt is**, zodat niemand er later conclusies uit trekt die hij niet
draagt: de twee pagina's staan niet op huyberts.nl, dus de publicatiecontrole is met de hand op
geslaagd gezet, en de Search Console-cijfers zijn berekend en niet opgehaald. De hele doorloop is
bovendien op databaseniveau gedaan, waarbij per stap de code van de betreffende route is gelezen en
nagedaan; de schermen zelf zijn niet bediend. Het plan van aanpak voor de zes punten hierboven stond
in `docs/tasks/doorloop-huyberts.md`; wat eruit is gebouwd staat in de alinea hieronder.

---

## 26 augustus 2026: de zes punten uit de doorloop afgewerkt

Alle zes punten uit `docs/tasks/doorloop-huyberts.md` zijn afgehandeld, elk in een eigen commit,
elk nagerekend tegen de echte, opgeslagen data van Huyberts Keukens (conventie 10) en niet alleen
tegen de tests. `npx tsc --noEmit`, de unittests, de ketentests en de productiebuild stonden na elk
punt op groen.

**1. De effectmeting gooide de helft van haar betaalde metingen weg.** Twee tegensprekende unieke
indexen op `tracking_runs` (migratie `0066`): `tracking_runs_idem_idx` kende `impact_wave` en
`content_piece_id` niet, dus golf 2 van een impactmeting botste met golf 1, en twee pagina's met
dezelfde doelvraag botsten met elkaar, ná de betaalde `web_search`. Vervangen door een partiële
index die alleen over periodieke metingen gaat; impact- en controlemetingen vallen nu uitsluitend
onder de bestaande index uit `0020`. `measure.ts` vangt daarnaast een resterende race op de index af
zonder de dure aanroep te herhalen. Op productie geverifieerd: de 14 taken die op de botsing
vastliepen zijn opnieuw ingepland, allemaal geslaagd. `tracking_runs` telt nu 24 impact/control-rijen
voor Huyberts in plaats van 10, en nul gefaalde taken.

**2. Een pagina uit het contentplan kon nooit gemeten worden.** `/api/cron/plan` bouwde de
schrijfopdracht zonder `targets` mee te geven. `targetsFromSourceRef()` (`lib/plan-backlog-data.ts`)
leest de doelvragen nu terug uit het rapport waar `source_ref` (`"<rapport-id>#<volgnummer>"`) naar
wijst, dezelfde sleutel die de contentvoorraad al gebruikt. Geverifieerd: de vijf doelvragen die deze
functie voor de Eindhoven-pagina teruggeeft komen exact overeen met wat er al in
`content_piece_targets` stond voor de pagina's die wél via het goede pad geschreven zijn. Vijf nog
niet geschreven pagina's van Huyberts krijgen hun doelvragen nu wél mee zodra dit op productie
draait.

**3. De titel van een geschreven pagina was een opdracht aan de klant.** `content_pieces.title`
blijft de aanbevelingstitel (de dedupe-sleutel van de schrijftaak, onaangeraakt), maar
`displayTitle()` (`lib/pipeline/slug.ts`) toont overal waar de klant kijkt (kop, browsertab,
bibliotheek, export, voorgestelde URL) de `meta_title` die het model zelf schrijft, met de
aanbevelingstitel als terugval. Geverifieerd: de Eindhoven-pagina toont nu "Keukenrenovatie
Eindhoven | Huyberts Keukens" in plaats van "Publiceer een regionale pagina voor keukenrenovatie in
Eindhoven".

**4. De potentiescore onderscheidde niets bij een nieuwe klant** (ontwerpvraag, voorstel afgestemd
vóór de bouw). Het zoekvolume komt per onderwerp, dus alle kansen van hetzelfde onderwerp deelden
dat getal, en bij een gloednieuwe klant is de zichtbaarheid overal nul. `distributePotentialByWeight()`
(`lib/potential.ts`) herverdeelt de score binnen een groep kansen met een identieke score naar rato
van het gewicht van hun doelvragen, met de zwaarste kans als anker die zijn score behoudt. Nagerekend
op de echte cijfers van Huyberts: zeven keer 58 werd 58, 33, 29, 25, 25, 21, 6. Raakt nooit een kans
die al een eigen, gemeten verschil heeft, zoals bij Gasservice Brabant al deels het geval was.

**5. Een artikel schrijven paste niet altijd in het tijdbudget van 105 seconden** (voorstel: budget
omhoog in plaats van de redeneerinspanning omlaag). Nagemeten op 26 echte schrijf- en
herschrijfaanroepen op productie: de duur hangt niet netjes samen met het aantal woorden, de
redeneertijd van het model domineert de uitschieters. `CALL_BUDGET_MS` naar 150s (was 105s).
`HEAVY_JOB_RESERVE_MS` in `lib/jobs/worker.ts` bleek 2 × het volledige aanroepbudget te reserveren,
ook voor de kritiekaanroep die in de praktijk enkele seconden duurt; herzien naar wat de twee
aanroepen van een zware taak (schrijven + de kritiekaanroep) daadwerkelijk nodig hebben, wat de
reservering zelfs verlaagde (200s) ondanks dat de trage aanroep meer lucht kreeg. Routelimiet (300s)
en werkerbudget (240s) ongewijzigd. `docs/architecture.md` §9 opnieuw doorgerekend. Nog niet te
verifiëren met een echte schrijfronde: dit is codewerk op een branch die nog niet is uitgerold.

**6. Het effectoordeel kon bij weinig doelvragen alleen "gelijk" zeggen** (ontwerpvraag, voorstel
afgestemd vóór de bouw). `minQuestionsForSignal()` (`lib/pipeline/impact-math.ts`) maakt concreet
hoeveel vergelijkbare doelvragen er nodig zouden zijn om een gemeten verschil van toeval te
onderscheiden. Door de fix van punt 1 bleek de Eindhoven-pagina intussen 5 doelvragen te meten in
plaats van de 2 uit het oorspronkelijke voorbeeld, met een verschil van 20%: het scherm zegt nu "met
5 vragen is dit verschil niet te onderscheiden van toeval, daar zijn er minstens 25 voor nodig" in
plaats van de ondoorzichtige melding "binnen de meetruis (55 punten nodig)". De drempel zelf is niet
verlaagd. De structurele oplossing (meer doelvragen per pagina toekennen) is vastgelegd in
`docs/tasks/roadmap.md`, niet meegebouwd.

**Kleiner punt A, de claimvalidator, bleek bij nader onderzoek geen probleem te zijn zoals
omschreven.** De aanname was dat `isGapQuestion()` antwoorden uit het demogesprek als bron uitsluit.
Op de echte data van Huyberts bleek het tegendeel: het feit over het eigen montageteam stond dubbel
op de feitenkaart en was ook echt geciteerd. De werkelijke oorzaak: het model herhaalde hetzelfde
feit in twee andere bewoordingen op de pagina, citeerde het bij de tweede keer correct, en de eerste
formulering haalde de overlapdrempel van 60% met de getagde claim niet. Die drempel verlagen zou de
vangnetten verzwakken die eerder twee echte verzinsels vingen (Van der Valk, Fysi-Unique), voor een
pagina die toch al niet op "moet nagekeken worden" staat. Overgeslagen.

**Kleiner punt B, toewijzen, liet de accountlaag inderdaad links liggen.** `POST
/api/profiles/[id]/assign` verplaatste alleen `profiles.user_id`/`analyses.user_id` (de historische
terugvalregel) en niet `profiles.account_id` (de hoofdregel van de drielaagse toegangscontrole,
`lib/accounts.ts`). De route gebruikt nu `defaultAccountFor()`, dezelfde functie die al voor nieuwe
profielen bestond. Op productie geverifieerd én rechtgezet: Huyberts Keukens (`huyberts@example.com`)
stond met `user_id` wel op zijn eigen account maar met `account_id` nog op het account van de
beheerder; hij heeft nu een eigen account en is daar beheerder van.

`docs/tasks/doorloop-huyberts.md` is verwijderd, alle zes punten zijn hierboven samengevat.

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

Dezelfde dag, na de terugdraai hierboven, is de omzetting opnieuw gevraagd, en nu met twee eisen die
de eerste ronde niet had: de balk moet bij het scrollen aan de bovenkant blijven hangen, en hij moet
altijd zichtbaar zijn en overal bovenop liggen. De code van de eerste ronde is teruggehaald uit de
git-historie (commit `06f66ea`) en op die twee punten uitgebreid.

**Vier losse tabbladen.** Het analysedossier (`app/(app)/analyses/[id]/page.tsx`) toont nog één
hoofdstuk tegelijk (Stand, Waar je mist, Wat je moet doen, Opgeleverd), gestuurd via
`?hoofdstuk=stand|bewijs|werk|resultaat` in de URL. Geen client-side tabstate: elk tabblad blijft
een deelbare link en houdt zijn eigen `Suspense`-grens, want er staat nooit meer dan één hoofdstuk
in de DOM. Acht plekken linkten met een `#hoofdstuk`-anker naar het dossier; die zijn omgezet naar
`?hoofdstuk=...`, want een anker naar een hoofdstuk dat niet gerenderd wordt scrolt nergens heen.
Nieuw component `components/chapter-tabs.tsx`, los van `components/section-rail.tsx`: die laatste
draait ook op het onboardingscherm, dat wél één doorlopende pagina met scroll-spy blijft.

**De kier van vier pixels.** Beide sticky chiprijen stonden op een los getal, `top-[57px]`, terwijl
de bovenbalk 61 pixels hoog is: 36 voor de knoppen, 2 × 12 padding en 1 voor de onderrand. Daar
schoof de pagina-inhoud dus doorheen, tussen de bovenbalk en de balk eronder. De hoogte staat nu in
één token, `--header-h` in `app/globals.css`, en `workspace-chrome.tsx` zet hem óók op de bovenbalk
zelf, zodat de twee getallen niet meer uit elkaar kunnen lopen. Dezelfde variabele bepaalt nu ook
waar een anker binnen een hoofdstuk (`#antwoorden`, `#offsite`) stopt met scrollen; dat stond op
`scroll-mt-24` (96 pixels) terwijl de twee balken samen ongeveer 106 pixels beslaan, dus de kop van
zo'n blok verdween onder de balk.

**De z-index-ladder.** De tabbalk stond op `z-10`, en elk hoofdstuk zet zijn kop en inhoud óók op
`relative z-10` (`components/chapter.tsx`). Bij een gelijke z-index wint wat later in de DOM staat,
dus de hoofdstukinhoud schoof bij het scrollen dwars over de balk heen. De ladder ligt nu vast en
staat in `docs/ux-design.md`: hoofdstukinhoud `z-10`, popovers `z-20`, navigatiebalken `z-30`,
uitklapmenu's `z-40`, dialogen en meldingen `z-50`. De tabbalk zit dus op dezelfde laag als de
bovenbalk, en blijft onder de menu's en dialogen die wél over navigatie heen horen te vallen.

Wat hiermee niet is opgelost, en dat is bekend: de vaste leesvolgorde stand → bewijs → werk →
resultaat, waarbij hoofdstuk 04 het hoofdstuk 01 van de volgende periode voedt, kan een tabbalk niet
uitdrukken. Dat was §9 de reden om er destijds vanaf te stappen. De nummering 01 t/m 04 blijft de
volgorde tonen en hoofdstuk 04 benoemt de terugkoppeling in zijn eigen tekst, maar met één scroll
van meting naar bewijs naar werk lopen kan niet meer; dat zijn nu drie klikken.

## 26 augustus 2026 · Het planscherm: minder blokken, een datum die je zelf zet, en een menu dat niet meer afgeknipt wordt

Vijf ingrepen op `/merk/[id]/strategie/plan`, na een ronde meekijken met de eigenaar.

**Het blok "Nog niet gemeten" is eruit.** Onder de voorraad stond een lijst met de clusters die nog
geen kans konden leveren, met een meetknop erbij. Bij Gasservice Brabant waren dat er zes van de
zeven. Het beantwoordde een echte vraag, maar niet de vraag van dít scherm: hier plan je in, en
welke clusters nog gemeten moeten worden hoort op het clusterscherm. Bovendien stond het ónder een
lijst die zelf al scrollt, dus je zag het pas na de hele voorraad. Weg, inclusief de pure functie
`ongemetenClusters()` die er alleen voor bestond en de vier unittests eromheen.

**Drie teksten die het scherm in zijn eigen woorden lieten praten.** "10 in de voorraad" is
"10 content beschikbaar" geworden, de kop "Beschikbaar" is "In te plannen content", en de lege staat
zegt nu wat er komt te staan in plaats van uit te leggen waarom er niets staat. De paginakop noemt
niet meer links en rechts (dat klopt op een telefoon niet) maar de handeling: plan content op basis
van je clusteranalyses, sleep items naar de maand waarin ze geschreven moeten worden.

**De publicatiedatum is zelf te zetten** (migratie `0067`). De spreiding uit `spreadDates()` verdeelt
tien pagina's netjes over de maand, en dat klopt meestal. Meestal is niet altijd: wie zijn pagina
over de showroomdagen vóór die dagen live wil hebben, kon tot nu toe alleen de hele maand
verschuiven. Klik nu op de datum in de regel, of kies "Datum aanpassen" in het menu. `datumProbleem()`
bewaakt twee grenzen, in de browser en op de server met dezelfde functie (conventie 1): binnen de
kalendermaand van die planmaand, en niet in het verleden.

De valkuil zat niet in het zetten maar in het bewaren. `resequenceMonth()` herberekent na élke
wijziging in een maand alle data, dus zonder de kolom `scheduled_manual` was 18 augustus één
sleepbeweging later weer 15 augustus, precies zoals de spreiding hem uitrekende. De vlag geeft zo'n
dag dezelfde uitzondering die een geplaatste pagina al had. `swapWithNeighbour()` volgt dezelfde
regel, anders verhuist "deze pagina moet op de 18e, want dan is de beurs" naar de buurman. En hij
vervalt zodra de kaart naar een andere maand of terug naar de voorraad gaat: een dag in oktober is
geen dag in november. Alle drie de regels staan als ketentest in `test-chain.ts`, want geen enkele
unittest ziet of de vlag het hele pad van database tot herberekening haalt.

**Het uitklapmenu werd afgeknipt.** De drie puntjes op een planregel openden een menu met
`position: absolute` binnen de maandkaart, en die kaart heeft `overflow-hidden` (anders steken de
rijen door de afgeronde hoek). Op de onderste regels liep het menu dus dood tegen de kaartrand: van
"Verplaats naar" zag je de kop en de helft van de eerste maand. Hetzelfde gold in de voorraadlijst,
die met `overflow-y-auto` scrolt. Het menu hangt nu in een portal op `document.body` met
`position: fixed`, klapt naar boven open als er onderin het scherm geen ruimte is, en sluit bij
scrollen buiten zichzelf. Laag `z-40`, de laag van uitklapmenu's uit de ladder in `ux-design.md`.

## 27 augustus 2026: vier ingrepen uit een structuurreview met verse ogen

Een product- en structuurreview van het klantoppervlak, uitgevoerd zonder de documentatie te lezen,
juist om te zien wat een klant ziet die er ook niet in kijkt. Tien bevindingen, waarvan vier
gebouwd. Ze hebben één ding gemeen: het gaat nergens over ontbrekende functionaliteit, maar over
volgorde, zichtbaarheid en wie welke knop ziet.

**1. De klant zag vier knoppen die hij niet mocht indrukken.** Besluit 18 (11 augustus) zette alle
zes de betaalde handelingen op slot bij de beheerder, en de rekensom eronder klopte: een klant met
acht onderwerpen kon op één middag $6,56 uitgeven. Het gevolg in het scherm was alleen erger dan de
rekening. "Bevestig en start de meting" stond als volle knop onderaan het conceptscherm, "Schrijf
deze pagina's" in hoofdstuk 03, "+ Nieuw cluster" boven Clusters en "+ Nieuw merk" boven Merken, en
alle vier weigerden pas ná de klik. De taak "Bekijk en bevestig het concept" stond bovendien als
tweede regel in zijn eigen werklijst op de startpagina: de app stuurde hem dus actief naar een deur
die op slot zat.

Het slot zit nu per handeling in plaats van per persoon (`STAFF_ONLY_ACTIONS` in
`lib/cost-rules.ts`, `mayTriggerCost(userId, action)` in `lib/cost-guard.ts`). Twee handelingen
blijven van de beheerder omdat het een verkoop is en geen werk binnen het pakket: een nieuw merk
onderzoeken en een reputatieanalyse. Vier zijn van de klant: een cluster starten, de meting
bevestigen, content laten schrijven en een maand van het contentplan vrijgeven. Het budgetplafond
(`lib/spend-limit.ts`, €50 per account per maand) is daarmee de rem die er echt toe doet, en die
gold altijd al voor iedereen. De handeling is een verplicht argument zonder standaardwaarde: wie een
nieuwe dure route toevoegt, moet van de compiler een keuze maken.

De reputatiepagina liet zien hoe het hoort: die vervangt de knop door de zin "dit zet je consultant
voor je in gang". Dat patroon staat nu ook op de twee plekken waar een merk aangemaakt wordt.

**2. Het product is een kringloop, het menu is een kast.** Meten, kansen, plannen, schrijven,
publiceren, hermeten stond in de statussen, in de taken en in de teksten, maar op geen enkel scherm
getekend. De klant wist wél wat hij vandaag moest doen, de werklijst op het overzicht is daar goed
in, maar niet waar het toe leidde. `lib/ronde.ts` rekent de zes stappen uit en `RondeBalk` tekent ze
bovenaan het overzicht, met de stand per stap en één zin die zegt wie er aan zet is. Geen vullende
balk (die belooft een einde dat er niet is), geen "3 van de 10" (een doel dat de klant niet zelf
gesteld heeft, is een verwijt zodra hij het niet haalt), en een stap is pas klaar als er iets
gebeurd is en niet als er iets klaarstaat. Twee van de zes stappen dragen een chip "jij": plannen en
publiceren. Dat is de enige plek waar de arbeidsverdeling in één oogopslag staat.

**Het zichtbaarheidspercentage staat weer op de startpagina**, met marge en verschil. Dat draait de
beslissing van 26 augustus terug, één dag oud: een meetproduct dat opent met vier
productietellingen laat eerst zien hoeveel er gemaakt is, terwijl de klant komt kijken of het wérkt.
De vier tellingen blijven, eronder. De twee vangrails in `test-unit.ts` die het cijfer weghielden,
bewaken nu de omgekeerde afspraak, met dezelfde strengheid: het cijfer komt met zijn marge, en een
verschil binnen die marge heet "gelijk gebleven".

**3. Twee adressenstelsels naast elkaar.** Er waren twee clusterlijsten, `/analyses` over alle
merken heen en die onder het merk zelf, en alleen de tweede stond in het menu. Toch kwam de klant er
voortdurend, want de terugknop boven elk clusterdossier heette "Mijn clusters" en wees hierheen. Wie
aan een tekst van merk A werkte en terugklikte, stond in een lijst waar de clusters van merk B ook
in stonden. En zolang hij in een cluster zat, lichtte er in de hele zijbalk niets op, precies op het
diepste scherm van de app. `/analyses` is nu een doorverwijzing naar de clusters van het actieve
merk, de terugknop heet "Clusters" en wijst naar het merk waar hij vandaan kwam, en `navActief()`
laat dat menu-item oplichten zolang hij ergens onder `/analyses/` zit. De routes zelf zijn niet
verhuisd: dat is een grotere ingreep en dit lost het verdwalen op waar het ontstaat.

**4. Publiceren stond onder acht andere blokken.** Op de contentpagina kwamen eerst de tekst, de
FAQ, de GEO-score, het vrijgavepaneel, de kwaliteitsregel, de editor, het herschrijfvak en de
versiegeschiedenis, en pas daarna het veld voor de link. Terwijl dat de enige handeling op dat
scherm is die het cijfer beweegt: een geschreven pagina die niet online staat, levert per definitie
nul op. Dat teksten bleven liggen was al bekend, er is een herinneringsmail voor gebouwd. Publiceren
staat nu bovenaan, met de publicatiehandleiding ingeklapt eronder en alleen zolang de pagina nog niet
live staat.

**Wat niet gebouwd is, en bewust wacht.** Zes andere bevindingen uit dezelfde review: het contentplan
is een sleepbord voor de consultant dat aan de klant getoond wordt, de app verwijst vijf keer naar
"je consultant" zonder ergens te zeggen wie dat is, Zoekverkeer stuurt de klant met zijn enige knop
naar een scherm dat voor hem niet bestaat (`/instellingen/koppelingen` geeft hem een 404),
"Merkprofiel" is één lade met drie deuren waarvan er twee hetzelfde dossier openen, en er is niets
dat de klant tussen twee metingen terughaalt (één soort herinnering gebouwd, standaard uit).

**Nagekomen op 27 augustus 2026: de leesweergave van het contentplan.** De vijfde bevinding uit
dezelfde review, alsnog gebouwd. Het planscherm bediende twee gebruikers met tegengestelde
behoeften vanaf één scherm: de consultant plant en heeft het sleepbord nodig, de klant plant niet en
wil weten wat er deze maand voor hem geschreven wordt. De klant kreeg het bord, inclusief de uitleg
"sleep beschikbare content items naar de maand waarin ze geschreven moeten worden", en tot vandaag
was de enige knop die er voor hem toe deed ook nog eens niet van hem.

Hij ziet nu deze maand, volgende maand, en de rest van het jaar ingeklapt. Bovenaan één zin over wat
er van hem gevraagd wordt, met de volgorde waarin het werk vastloopt: publiceren gaat voor nakijken,
want een goedgekeurde tekst die niet live staat is al betaald en levert nul op; nakijken gaat voor
vrijgeven, want daar is nog niets voor betaald. De kalender bepaalt welke maand "deze maand" is en
niet de status, anders kijkt een klant die zijn vorige maand liet liggen op 3 september nog steeds
naar augustus.

Eén handeling op dat scherm, en dezelfde als op het bord: een maand vrijgeven, met dezelfde dialoog
en dezelfde route (conventie P2). Alles wat de indeling verandert blijft bij de consultant. Een
broncodecontrole bewaakt dat de leesweergave geen sleepmachinerie krijgt, want dat is precies het
soort ding dat er later per ongeluk in kruipt.

**Bijgesteld op 27 augustus 2026, later diezelfde dag: de klant mag alles behalve twee dingen.** Op
verzoek van de eigenaar is het slot op betaald werk verder open gegaan dan de review voorstelde.
Wat overblijft is één handeling: de reputatieanalyse. Dat is geen stap in de maandelijkse ronde maar
een los product dat apart gekocht wordt, en de knop blijft er staan met een uitnodiging ernaast,
want een verborgen knop verkoopt niets. Een nieuw merk laten onderzoeken kan de klant nu wel, en de
twee schermen waar dat begint (`/merk` en `/analyses/new`) tonen hun knop weer aan iedereen.

Daarnaast is het contentplan geen twee schermen voor twee rollen meer, maar twee weergaven voor
iedereen, met een schakelaar erboven. Hetzelfde plan beantwoordt twee vragen: "welke pagina komt in
welke maand" is een planvraag en daar is het bord voor, "wat gebeurt er deze maand en wat moet ik
doen" is een leesvraag en die stelt de klant het vaakst. De rol bepaalt alleen nog waar je landt, en
een weergave in de URL wint van de rol zodat een gedeelde link bij beiden hetzelfde opent.

De grens ligt daarmee niet meer bij wat geld kost, maar bij **de beheerschermen**: onboarding,
diagnose, toewijzen, alle merken en koppelingen. Die vijf staan achter `isStaff` met een
`notFound()`, en het hele hoofdstuk Admin verschijnt alleen in de zijbalk van staf. Eén doodlopende
weg daarheen is meteen dichtgezet: Zoekverkeer bood de klant als enige knop "Naar de koppeling", en
dat scherm bestaat voor hem niet. Daar staat nu de zin dat zijn consultant de koppeling legt.

**Nagekomen op 27 augustus 2026: één merk tegelijk, en dat is nu een grens in de query.** De
tenancy klopte al: RLS beperkt `profiles` en `analyses` tot je eigen merken plus die van je account
(migratie `0046`), en `getProfile()` leest via die policies, dus een klant die het adres van een
ander merk intikt krijgt een pagina-niet-gevonden. Wat er níet klopte was de laag erboven.
`loadWorkAcross()` haalde élke analyse van de gebruiker op, over al zijn merken heen, en de twee
schermen die hem aanriepen filterden daarna zelf op het merk waar de klant naar keek.

Dat werkte, en dat is precies het probleem: filteren is een intentie, de query is de garantie
(conventie 1). Eén vergeten filter op een volgend scherm en er staan cijfers van een ander merk in
het overzicht van een klant. Bij een bureau met drie merken in één account is dat geen theorie maar
een klantrelatie. De functie heet nu `loadBrandWork()`, het merk is een verplicht argument zonder
standaardwaarde, en hij gaat mee de database in. `loadDashboard()` idem. Wie een nieuw scherm bouwt,
moet van de compiler een merk kiezen.

Twee aggregaten die over merken heen telden zijn meegegaan: `stats` (drie tellingen) en
`biggestChange` (de grootste betekenisvolle verandering), samen met `components/dashboard-stats.tsx`.
Ze werden getoond op de losse clusterlijst, en die is diezelfde dag een doorverwijzing geworden.
Een aggregaat over merken heen dat geen scherm meer heeft, is precies wat er later per ongeluk
terugkomt op een klantscherm.

De merkenlijst `/merk` is het enige klantscherm waar meer dan één merk in beeld kan komen, en dat is
een keuzemenu: namen en status, geen cijfers. Een klant met precies één merk wordt daarvandaan
doorgestuurd naar dat merk zelf, dus in het normale geval ziet hij die lijst nooit.

**27 augustus 2026, verder op de dag: de klantweergave.** Een beheerder kan nu met één knop
rechtsboven in de bovenbalk zien wat een klant ziet, zonder uit te loggen. `lib/staff.ts` splitst het
echte recht (`isStaffAccount()`, de rauwe databasevraag) van het effectieve recht (`isStaff()`, dat
ook de klantweergave meeweegt). Overal in de app waar al `isStaff(user.id)` gevraagd werd, van de
zijbalk tot de vijf beheerschermen tot de sloten in `lib/cost-guard.ts`, geldt de klantweergave nu
vanzelf mee, zonder dat er ergens een tweede controle bij moest.

De garantie zit in de volgorde: `isStaff()` controleert eerst het echte recht en pas dáárna, alleen
als dat er al was, de cookie. Een klant die de cookie zelf zou zetten verandert dus niets, want bij
hem stopt de vraag al bij de eerste stap. De cookie kan met andere woorden nooit rechten geven,
alleen wegnemen, en dat maakt hem ook zonder eigen beveiliging veilig om overal te lezen.

Eén randgeval: rijbeveiliging (RLS) kent de klantweergave niet, dus een leesroute via de gewone
Supabase-client blijft voor een beheerder altijd werken, wat maakt dat je élk merk kunt previewen.
Schrijfroutes lopen via `hasAccess()` en vallen daar wél op `isStaff()` terug, dus een schrijfpoging
op een merk dat niet van jezelf is wordt tijdens de klantweergave net zo geweigerd als bij een echte
klant. Op je eigen testmerk blijft alles werken, want eigendom hangt nooit van staf-rechten af.

Overwogen en afgewezen: een écht tweede klantaccount. Kan niet met hetzelfde e-mailadres (Supabase
staat geen dubbel adres toe), en de knop lost de eigenlijke behoefte beter op: blijven ingelogd als
jezelf en met één klik zien wat een klant ziet, in plaats van steeds in en uit te loggen.

**28 augustus 2026: de werkruimte krijgt haar lichtgrijs terug.** De narekening tegen Nova van 24
augustus 2026 maakte de hele pagina wit, inclusief de ingelogde werkruimte: Nova's eigen `body` is
inderdaad wit. Maar Nova's witte pagina is een pagina zónder zijbalk; zodra kaarten op wit náást een
zijbalk staan, zoals op elk scherm in de werkruimte, valt de rand van die kaarten tegen een even
witte grond weg. De eigenaar zag dat terug als "de achtergrond is nu gewoon wit" op het clusterscherm.
Oplossing is plaatselijk: `<main>` in `components/workspace-chrome.tsx` (de kolom rechts van de
zijbalk, waar elk scherm in landt) kreeg zijn achtergrond terug op `--bg-muted` (`#f8fafc`). De
token `--bg-base` zelf blijft wit, dus de inlogroute en losse pagina's zonder zijbalk veranderen
niet. Zie `docs/designsystem.md` §2.1.

## 28 augustus 2026: de startpagina telt opbrengst, de vragen krijgen een eigen plek, en een pagina wordt pas af als de vragen behandeld zijn

Vier wensen van de eigenaar in één ronde. Ze hangen samen op één punt: wat het product oplevert,
en wat de klant moet leveren om dat op te leveren.

**1. Drie van de vier cijfers op "Hoe sta je ervoor" zijn totalen geworden.** Twee van de vier
kwamen uit de kansenlijst, dus uit voorstellen. Bij Van den Udenhout stond de rij daardoor op
`0 · 0 · 7 · 5` terwijl er nog geen letter geschreven was: een rij die leest als opbrengst en
voornemens telt. De volgorde is nu clusters actief (een stand van nu), pagina's geschreven,
pagina's geoptimaliseerd en gepubliceerd, met de regel "Sinds maart 2026" erboven zodat niemand ze
als maandcijfers leest. De voorstellen staan nog steeds op het scherm, in het kansenblok eronder,
waar ze over werk gaan in plaats van over resultaat.

Twee tellingen zijn daarbij rechtgezet. Een pagina met status `briefing` telt niet meer als
geschreven: die wacht nog op antwoorden, en zonder dat filter liep de teller op bij het indrukken
van de knop. En `gepubliceerd` telt nu alleen de huidige versie, waar een herpublicatie van versie 2
eerder dubbel telde. Bij één live pagina viel dat niet op, bij de eerste herschrijving wel.

**2. "Vraagt jouw input" heet "Openstaande vragen" en staat onder Strategie.** Het scherm toonde
alleen de merkbrede vragen; de vragen uit het rapport van een cluster stonden in hoofdstuk 03 van
dát cluster. Voor de klant is dat één vraag op twee plekken, precies de splitsing die op 17 augustus
2026 al eens is opgeheven. Ze staan nu bij elkaar op `/merk/[id]/strategie/vragen`, met een filter
per cluster en een aparte knop voor de merkvragen. Het oude adres verwijst permanent door, want het
stond in de werklijst en in verstuurde mails.

Het invoerveld is meeverhuisd van één regel naast de vraag naar drie regels eronder, over de volle
breedte. De oude vorm was een keuze voor een korte lijst, en hij kostte de antwoorden: in een regel
van 26rem schrijft niemand op welke garantie hij geeft.

Strategie heeft daarmee vier bestemmingen, waar drie de regel was. De reden is van dezelfde soort
als bij Analytics op 22 augustus: de andere drie tónen wat ORBIT ENGINE deed, dit is de enige plek
in dat hoofdstuk waar de klant zelf iets moet dóén. Merkprofiel houdt er twee over.

**3. Een groene teller in de bovenbalk.** Rechts, links van de themaschakelaar: "3 openstaande
vragen", met een bolletje dat in vier seconden van licht naar donkergroen ademt. Achter het
menu-item staat hetzelfde bolletje zonder getal, want twee keer hetzelfde cijfer op één scherm laat
de lezer zoeken welke de echte is. Bij nul verdwijnt de hele melding: een balk die naast élk scherm
"0 openstaande vragen" meldt, went binnen een dag weg. Bij `prefers-reduced-motion` staat het stil.

Het getal komt uit één loader en één pure optelling (`lib/open-questions.ts` en
`lib/open-questions-count.ts`), gelezen door de bovenbalk, de zijbalk én de paginakop. Drie plekken
die het los uitrekenen lopen gegarandeerd uit elkaar. Het kost twee queries per paginaweergave, en
dat is de prijs van een teller die klopt op het moment dat je hem leest.

**4. De eindpoort: geen definitieve versie zolang er vragen open staan.** Dit is het besluit met de
meeste gevolgen, en het spreekt een eerder besluit tegen. `release-panel.tsx` zei: "Geen muur. Een
gate die je niet kunt passeren is een muur, en muren leveren afgehaakte klanten op in plaats van
betere content." Dat argument blijft gelden voor alles behalve de eindstap: de tekst blijft
leesbaar, kopieerbaar en bewerkbaar, en publiceren doet de klant zelf buiten de app om. Wat op slot
gaat is dat ORBIT ENGINE de pagina afrondt.

De poort staat bewust **niet** vóór het eerste concept. De scherpste vragen ontstaan pas tijdens het
schrijven: de claim-audit leest wat de tekst beweert en vraagt precies dát na. Een poort ervóór zou
vragen om antwoorden die nog niet bestaan. Hij staat dus op de twee momenten waarop een versie
definitief wordt: een nieuwe versie laten schrijven, en vrijgeven.

Wat tegenhoudt zijn de open vragen van dít cluster plus de vragen die aan déze pagina hangen. Een
losse merkvraag uit de onboarding blokkeert niets: die zou anders élke pagina van élk cluster
voorgoed dichtzetten, en dan is de poort geen kwaliteitsmaatregel maar een slot. Overslaan telt als
antwoord, en dat is de uitweg die het geheel leefbaar houdt. Twee lagen, zoals conventie 1 vraagt:
de knop toont de melding, de route weigert met 409.

De ketentest legde meteen een verschil bloot tussen de testshim en de echte database:
`.contains()` castte altijd naar `jsonb`, terwijl `fact_requests.content_piece_ids` een `uuid[]` is.
Postgres gaf daarop geen fout maar nul rijen, en de poort leek gewoon open te staan. Dat is precies
het soort stille afwijking waarvoor de ketentest er is; de shim doet nu een array-vergelijking.

**En één wens bleek al gebouwd.** "Klanten moeten ook content kunnen laten schrijven" is op
27 augustus 2026 al ingevoerd: van de zes betaalde handelingen staat alleen nog de reputatieanalyse
op slot, omdat dat een los product is (`lib/cost-rules.ts`). Er is dus niets veranderd, alleen
nagekeken.

**Ingetrokken tijdens deze ronde, door de eigenaar zelf.** De hernoeming van "clusters" naar
"metingen" (het botste met de maandelijkse meetronde, twee begrippen met dezelfde naam op één
scherm), het weghalen van de rondebalk, en de statuscijfers in de bovenbalk. Ze staan hier omdat de
afweging bewaard hoort te blijven: komt de hernoeming terug, dan hoort de meetronde in dezelfde
ronde een eigen woord te krijgen.

**28 augustus 2026, verder op de dag: een stippenpatroon op de werkruimte.** De eigenaar bracht zelf
CSS voor een stippenpatroon aan, gevonden buiten de app, en vroeg het toe te passen op `<main>` in
`components/workspace-chrome.tsx`, alleen in de lichte stand. De aangeleverde CSS klopte inhoudelijk
maar had één maskerregel uitgecommentarieerd die juist het punt van het effect was: zonder masker
zijn de stippen overal even zichtbaar, terwijl de bedoeling ("in het midden niet zichtbaar, naar
buiten uitlopend") vraagt om precies dat masker aan te zetten. Verwerkt als `.workspace-canvas` in
`app/globals.css`: de stippen zitten op een eigen `::before`-laag, los van de vlakke `--bg-muted`
van het element zelf, want anders veegt het masker ook de bodemkleur mee weg in het midden. In
donker valt het patroon weg. Zie `docs/designsystem.md` §2.1.

**28 augustus 2026, nog verder op de dag: hetzelfde patroon in donker.** Het stippenpatroon stond
alleen in de lichte stand; de eigenaar vroeg om dezelfde toevoeging voor donker, met kleuren die de
achtergrond in zijn geheel ongeveer even donker houden. De lichte stip is één stap dónkerder dan
`--bg-muted`; die richting werkt in donker niet, want een donkerdere stip op een donkere grond
verdwijnt. Nieuw token `--workspace-canvas-dot` wijst nu in licht naar `#e4e9ee` en in donker naar
`--bg-surface-2` (`#43505d`), een stap líchter, want `--bg-elevated` is in de donkere stand toevallig
gelijk aan `--bg-muted` en biedt dus geen tussenstap. Het masker (dekking 0 tot 60%) bleef ongewijzigd
en houdt het effect in allebei de standen even subtiel, dus het vlak wordt in geen van beide standen
merkbaar lichter of donkerder. Zie `docs/designsystem.md` §2.1.

**28 augustus 2026, nog verder op de dag: het patroon in donker weer terug.** De donkere variant
beviel niet, en is dezelfde dag teruggedraaid: `<main>` in de donkere stand is weer een vlak
`--bg-muted`, zonder stippen. Het token `--workspace-canvas-dot` is weer weg; het patroon zelf staat
weer met de letterlijke kleur `#e4e9ee`, precies zoals bij de eerste invoering. Alleen de lichte
stand houdt het stippenpatroon. Zie `docs/designsystem.md` §2.1.

**28 augustus 2026, aan het eind van de dag: de app is traag omdat hij te ver van zijn database
staat.** De eigenaar meldde dat schermen lang laden en knoppen traag reageren. Het eerste dat we
uitsloten was de database zelf: in `pg_stat_statements` staat geen enkele app-query in de top van
de zwaarste verbruikers, en de client-bundel is met 102 kB gedeeld en 104 tot 130 kB per scherm
klein genoeg om geen rol te spelen. De oorzaak zat er tussenin, en op vier plekken tegelijk.

**De grootste: de Vercel-functies stonden in `iad1` (Washington) en het Supabase-project in
`eu-west-1` (Ierland).** Er stond geen `regions` in `vercel.json`, dus koos Vercel zijn standaard.
Elke databasevraag stak daardoor de oceaan over en weer terug, ongeveer 80 milliseconden, terwijl
de vraag zelf in de database rond de één milliseconde kost. Het merkoverzicht stelt er dertien
achter elkaar. `vercel.json` zet nu `"regions": ["dub1"]`, dezelfde AWS-regio als de database.
⚠️ Verhuist het Supabase-project ooit, dan hoort deze regel mee te verhuizen: staan ze uit elkaar,
dan telt geen van de drie andere maatregelen nog op. Zie `docs/architecture.md` §1.

**De tweede: dertien netwerkrondes waar er acht nodig waren.** `supabase.auth.getUser()` is geen
cookie-lezing maar een controle bij de Auth-server van Supabase, en werd drie keer per scherm
gesteld: door de shell, door de merk-layout en door de pagina zelf. Nu één keer, gememoïseerd met
`cache()` van React, dus per verzoek en niet per proces: de controle blijft, de herhaling niet.
Daarnaast stonden in de shell drie onafhankelijke vragen onder elkaar te wachten (werkruimte,
`isStaff`, `isStaffAccount`), stelde de merkenlijst het lidmaatschap en het beheerdersrecht
achter elkaar, en haalde de teller in de bovenbalk eerst het profiel op en pas daarna de twee
vragenlijsten. Alle drie gaan nu tegelijk. De middleware sloeg tot slot `/api/` niet over, terwijl
ze daar niets te doen heeft: dat was een extra ronde naar de Auth-server vóór élke knopklik.

**De derde: achttien schermen zonder wachtvorm.** Elf schermen hadden een `loading.tsx` en achttien
niet, en de achttien zonder waren juist de schermen die in de zijbalk staan. Next.js laat bij een
klik de oude pagina staan tot de nieuwe klaar is, dus daar gebeurde er tussen klik en scherm
niets zichtbaars: geen traag scherm maar een scherm dat lijkt te hangen. Veertien hebben er nu één,
via de gedeelde `PageSkeleton`. De vier die overblijven zijn doorverwijzingen en `/merk/nieuw`, dat
geen enkele query doet; daar zou een wachtvorm oplichten en meteen weer verdwijnen.

**De vierde: dertien knoppen zeiden "klaar" voordat ze het waren.** Het patroon was overal
hetzelfde: `fetch()` naar een API-route, dan `router.refresh()`, en in een `finally` de bezig-stand
weer uit. Maar `router.refresh()` geeft niets terug om op te wachten, dus die `finally` liep af op
het moment dat de aanvraag de deur uit ging. De klant zag de knop terugspringen, het venster
sluiten en de melding verschijnen, en daarna stonden de cijfers er nog een seconde in de oude
stand. Nieuwe hook `useRefresh()` (`components/use-refresh.ts`) zet de verversing in een
`useTransition`, zodat de knop pas loslaat als het scherm klopt. Zie `docs/ux-design.md` §4.

**Nagerekend op productie, dezelfde dag (conventie 10).** De verhuizing naar Dublin is gemeten aan
de werker, die elke minuut draait en daarbij precies twee aanroepen naar Supabase doet
(`claim_jobs` en `reclaim_stuck_jobs`). Het gat tussen die twee in de Supabase-logboeken is dus
elke minuut opnieuw dezelfde meting van hetzelfde werk, en het verschil ertussen is de afstand.

| | Vóór (`iad1`, Washington) | Na (`dub1`, Dublin) |
|---|---|---|
| Metingen | 20 minuten | 12 minuten |
| Mediaan | 451 ms | 125 ms |
| Zonder koude start | | 104 ms |
| Slechtste geval | 866 ms | 293 ms |

De mediaan zakt met 72%, en zonder de koude starts vlak na de deploy met 77%. Het slechtste geval
is bijna drie keer beter, en dat telt zwaarder dan de mediaan: dát is het bezoek waarop een klant
denkt dat de app hangt.

⚠️ **Wat hiermee níét gemeten is.** Deze meting isoleert de afstand tot de database. De drie andere
maatregelen (minder aanroepen achter elkaar, de wachtvormen, de knopfeedback) zijn gecontroleerd met
2495 unittests, 358 ketentests, typecheck en build, maar niet op een echt paginabezoek: de app had
in de zeven dagen ervoor geen enkel bezoek buiten de cron, dus er was geen verkeer om mee te
vergelijken. Ze werken op elkaar in: minder aanroepen telt pas echt op zolang elke aanroep duur is,
en die is nu goedkoop geworden.

Na de deploy gecontroleerd dat de middleware nog doet wat hij moet: `/merk` stuurt een bezoeker
zonder sessie nog steeds naar het inlogscherm, en `/api/health` antwoordt zonder dat de middleware
er nog overheen gaat.

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
