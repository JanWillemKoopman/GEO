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
| `tasks/herstelplan-na-audit.md` T1 t/m T9 | Het herstelplan na de technische audit van 2 september 2026: negen taken, van de contentkwaliteit-lus tot de wachttijd | T1, T3 t/m T9 gebouwd en nagerekend, zie de acht alinea's van 2 en 3 september 2026 hieronder ("het herstelplan na de audit, T1" t/m "..., T9"). T2 (de beoordelingsset voor contentkwaliteit) is door de eigenaar geschrapt, zie de alinea eronder. Verwijderd 3 september 2026 |
| `css.css`, `docs/nova-i18n.json`, `docs/inspace-app-i18n.json`, `docs/inspace-marketing.txt` | De ruwe brondata achter de Nova/InSpace-vergelijking: Nova's gecompileerde CSS-bundel en de drie tekstcatalogi uit de server-gerenderde loginpagina's | De conclusies eruit staan uitgeschreven in `docs/nova-vs-orbit-engine-proces.md` en `docs/tasks/nova-vergelijking-verbeterpunten.md`, die verder geen ruwe data meer nodig hebben. Verwijderd 21 september 2026, bij de OKX-herontwerpronde |
| `redesign2026.md` §1 t/m §14 | Het volledige herontwerpplan van Nova naar OKX: de research, het nieuwe design system (§5 t/m §7), de schermspecs (§8), de elf uitvoeringsstappen (§10) en de drie besluiten van de eigenaar (§13, limoen als accent, mobiel een eigen ontwerp, oplevering in stappen) | Gebouwd en op `main`. Het design system zelf staat nu in `docs/designsystem.md`, de mobiele en desktop-indeling in `docs/ux-design.md`. Tientallen componenten citeren nog een paragraafnummer uit dit plan in hun eigen commentaar (bijv. "§8.5", "GEMETEN bij OKX"); dat commentaar blijft staan zoals het geschreven is, want het legt het waarom van die ene regel uit en niet de volledige herkomst. Verwijderd 21 september 2026, toen stap 11 (deze documentatie) klaar was |
| `tasks/clusters-resultaatscherm-vereenvoudigen.md` A/B/C | De analyse van 16 september 2026 over de dichtheid van het clusterscherm: drie richtingen om de hoofdstukken dunner te maken | Ingehaald. Het scherm zelf is er op 22 september 2026 uit gehaald, zie `tasks/clusterresultaat-zonder-eigen-scherm.md` en de alinea van die datum hieronder. Verwijderd 22 september 2026 |

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

## 1 september 2026: geen aanbeveling meer voor wat de klant al heeft (existingUrl-conventie afdwingen)

Aanleiding: de vraag of de app zelf al voorkomt dat een voorgestelde content-item (bijna) identiek
is aan een bestaande pagina van de klant. Onderzoek liet zien van niet, op één punt na: het model
achter het periodieke rapport (`REPORT_SYSTEM`, `lib/pipeline/report.ts`) krijgt bij elke
aanbeveling de instructie "verbeteren" te kiezen met een bestaande URL als een pagina het onderwerp
al dekt, en "nieuw" met `existingUrl: null` als dat niet zo is. Dat is een instructie, geen garantie
(conventie 1), en in productie ging hij op twee manieren mis: bij Gasservice Brabant gaf het model
bij een NIEUWE aanbeveling toch een URL op (letterlijk `":"`, opgevangen door `schoonAdres()` in
`lib/plan-backlog-data.ts`), en bij Udenhout claimde het `action: "verbeteren"` met een verzonnen
pad (`/udenhout.nl/skoda`) dat nergens in de crawl voorkomt (`lib/pipeline/briefing-select.ts`). Het
omgekeerde geval, het model zegt "nieuw" terwijl de site het onderwerp al dekt, werd nergens
gecontroleerd: dat is precies het scenario waarin de klant een pagina voorgesteld krijgt die hij al
heeft. Dit stond ook los aangemerkt in `docs/tasks/roadmap.md` §7 ("existingUrl-conventie
afdwingen"), als hygiëne die niets blokkeerde, dus nooit gebouwd.

**Wat er gebouwd is.** `lib/pipeline/existing-page-match.ts`, puur en zonder AI-aanroep: rekent per
aanbeveling de onderwerptermen uit (`topicTerms()` uit `page-relevance.ts`, hergebruikt in plaats
van opnieuw uitgevonden) en scoort daarmee elke gecrawlde pagina (`profile_pages`, titel drie keer
zo zwaar als de body, dezelfde weging als `scorePage()`). Bij minder dan drie bruikbare
onderwerptermen volgt geen oordeel (conventie 3, "prijzen" alleen zegt te weinig om een pagina als
duplicaat aan te merken). Bij 70% dekking of meer (`EXISTING_PAGE_COVERAGE_THRESHOLD`, net als
`DUPLICATE_THRESHOLD` bewust ruim en met de gemeten waarde altijd teruggegeven, dus later op data
bij te stellen) geldt het onderwerp als al gedekt.

`reconcileExistingPageActions()` past dit toe direct na `mergeOverlappingRecommendations()` in
`report.ts`, vóór opslag in `reports.recommendations_json`: zegt het model "nieuw" terwijl een
gecrawlde pagina het onderwerp al ruim dekt, dan wordt het alsnog "verbeteren" met die URL. Zegt het
model "verbeteren" met een URL die niet in de crawl voorkomt, dan vervangt de zelf gevonden pagina de
onbevestigde URL, of valt de aanbeveling terug op "nieuw" zonder adres als ook wij niets vinden
(nooit een niet te bevestigen link tonen, dezelfde afweging als `schoonAdres()`). Beide correcties
gaan naar de logs, zodat zichtbaar blijft hoe vaak het model dit mis had. Geen migratie nodig: de
correctie grijpt in vóórdat `action`/`existingUrl` worden opgeslagen, en het scherm
(`plan-view.tsx`) toonde die twee velden al.

Vier controles groen: typecheck, 3478 unittests (16 nieuw), 557 ketentests, de productiebuild.
**Nog niet geverifieerd tegen een echte klant** (conventie 10): de dekkingsdrempel van 70% is getoetst
tegen verzonnen voorbeeldpagina's, niet tegen een crawl van duizenden pagina's van een bestaande
klant, waar de verhouding tussen een terechte en een onterechte "dit staat er al" nog moet blijken.
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

Vier controles groen: typecheck, 3517 unittests (38 nieuw), 563 ketentests (6 nieuw, waaronder de
controle dat een gearchiveerd cluster echt uit de maandronde valt, dat een verwijderd label zijn
clusters laat staan en dat hernoemen het cluster meeneemt zonder het aan te raken), de
productiebuild. De migratie is toegepast op productie. **Nog niet geverifieerd met een echte klant**
(conventie 10): er is nog geen productieprofiel waar iemand labels op heeft gezet.
## 1 september 2026: de acht besluiten van de eigenaar, en het proces zichtbaar gemaakt

Na de live test heeft de eigenaar de openstaande keuzes beslist. Wat hij koos, en wat er daarna
gebouwd is.

**De besluiten.** (1) De gewichten van de score blijven een aanname: New business beoordeelt de lijst
niet eerst. (2) Een klant in de markt blokkeert niets, maar geeft wel een melding. (3) De openbare
marktpagina gaat aan, zodat de link in de mail kan staan; we zitten in de fase waarin de hele app
doorgetest wordt. (4) Voorlopig alleen ChatGPT, de Gemini-sleutel komt later. (5) Het plafond voor
concepten gaat van 20 naar 100 per persoon per dag. (6) Naast de knop komt een datumkiezer waarmee je
een eenmalige hermeting vooruit kunt zetten. (7) De bewaartermijn blijft voorlopig open, er wordt nog
niets opgeruimd. (8) De testbenadering op Coolvent mag weg.

⚠️ **Wat bij besluit 5 openstaat en zwaarder weegt dan dat getal**: er is nog geen apart subdomein
voor acquisitiemail (plan 16.6, vierde maatregel). Zolang koude mail over hetzelfde domein loopt als
de facturatie, is honderd per persoon per dag een bewuste gok en geen veilige stand. Dat besluit
hoort bij de eigenaar en niet bij engineering.

**Het proces is zichtbaar geworden, en dat was de grootste klacht.** De pijplijn doet negen dingen
achter elkaar en de gebruiker zag er één zin van: "ORBIT ENGINE stelt de vragen aan de
AI-assistenten." Dertien minuten lang, zonder teller, en zonder iets over de zestien schrijftaken die
stilletjes mislukt waren. Dat is niet alleen ongemakkelijk maar duur: wie niet ziet dat een stap
hangt, drukt nog een keer op de knop, en elke druk is een rekening.

Bovenaan het marktscherm staat nu een procesbalk met negen stappen, elk met een stand (klaar, bezig,
wacht op jou, liep vast), een cijfer ("18 van de 40 vragen gemeten") en bij een vastloper of een
poort een zin over wat jij moet doen. De rekenkant zit in `lib/sales/proces.ts`, een pure module
zonder database, dus elke overgang is getest zonder API-sleutel (conventie 2). Het scherm ververst
zichzelf elke tien seconden, maar alleen zolang er echt iets draait.

⚠️ **De vierde kolom die je zou willen ("hoe lang duurt het nog") staat er bewust niet.** Dat weten we
niet, en een verzonnen schatting is erger dan geen schatting. Wat er wél bij staat is wat de markt tot
nu toe gekost heeft, en dat stond nergens terwijl elke knop op dat scherm geld uitgeeft.

**De geplande hermeting.** Een datum per markt, die één keer afgaat, uitgevoerd door de werker die
toch al elke minuut draait. Op die dag wordt er echt gemeten zonder tweede bevestiging, en dat staat
er met zoveel woorden bij: wie de datum zet, ziet op dat moment de raming en geeft daarmee het akkoord
van poort 2 op een ander moment. `remeasure_done_at` gaat vóór het werk, anders meet de werker
dezelfde markt elke minuut opnieuw. De logica van hermeten en goedkeuren is uit de twee routes gehaald
naar `lib/pipeline/sales-remeasure.ts`, want de knop en de planning moeten exact hetzelfde doen.

**De gemiste bedrijven zijn bruikbaar geworden.** Het blok "genoemd, maar niet in onze lijst" toonde
een ongesorteerde rij chips waarin Feenstra, drie keer genoemd en de best zichtbare partij van die
markt, tussen Daikin en Werkspot stond. Nu staat wie het vaakst genoemd is bovenaan, staan fabrikanten
en platforms apart met uitleg, en neemt één klik zo'n bedrijf mee in de markt. Vanaf de volgende ronde,
niet halverwege deze: een bedrijf dat op minder vragen gemeten is, hoort niet in dezelfde ranglijst.
Een verkeerde naam is nu ook te corrigeren, want "Open website" liep door tot in de conceptmail.

**De kosten kloppen nu.** `STAP_KOSTEN_USD` was een set schattingen van vóór de eerste markt en zat er
overal te hoog naast: marktonderzoek $0,85 geraamd tegen $0,019 gemeten, de mail $0,15 tegen $0,0007.
De nieuwe bedragen liggen op ongeveer het dubbele van het gemeten gemiddelde, want een raming is een
rem en geen prijskaartje: hij hoort de duurste markt te dekken, niet de gemiddelde. `besteedAanMarkt()`
pagineert nu ook, om dezelfde reden als de vermeldingen vanochtend.

**Gelijke scores worden niet meer als rangorde gepresenteerd.** Bij de eerste markt stonden zeven
bedrijven op exact 76 met exact dezelfde opbouw. Dat was geen fout in de formule: de meting gaf over
die zeven hetzelfde beeld, en elke formule geeft dan hetzelfde cijfer. Wat wél fout was, is dat het
scherm ze onder elkaar zette alsof de bovenste de beste was. Er staat nu één zin boven de lijst als
drie of meer bedrijven hetzelfde cijfer delen, en de volgorde binnen zo'n groep ligt vast op
bewijssterkte, dan commerciële relevantie, dan naam, zodat de lijst niet schuift bij elke verversing.

Vier controles groen: typecheck, 3497 unittests, 557 ketentests, de productiebuild.

## 2 september 2026: een verbetering zag de pagina die hij verbeterde nauwelijks

De vraag was simpel: hoe besluit ORBIT ENGINE of een aanbeveling een nieuwe pagina wordt of een
verbetering van een bestaande, en pakt hij bij een verbetering de echte pagina van de klant erbij?
Het antwoord op de tweede vraag was nee. Het onderzoek staat in
`docs/tasks/paginakeuze-nieuw-of-verbeteren.md`, nagerekend op productie over 20 rapporten met 129
aanbevelingen en 738 gecrawlde pagina's.

⚠️ **Dit bouwt voort op de alinea van 1 september hierboven** (`existing-page-match.ts`,
"existingUrl-conventie afdwingen"), die parallel is ontstaan en het eerst op `main` stond. Dat werk
zette het vangnet neer: het rekent zelf na of een onderwerp al gedekt wordt en corrigeert de
handeling. Wat hieronder staat is er bovenop gebouwd en heeft het niet vervangen; de twee zijn bij
het samenvoegen tot één module geworden, want twee plekken die dezelfde vraag beantwoorden kunnen
het oneens worden.

**Wat er stuk was.** De keuze viel volledig in de rapportaanroep, op één zin instructie, zonder
vangnet in code: de uitzondering die conventie 1 verbiedt. Het model kreeg de pagina's van de klant
als adres plus titel, nooit als inhoud. Wat dat opleverde:

- **32 van de 70 `nieuw`-aanbevelingen droegen tóch een adres**, tegen de instructie in, en bij 13
  daarvan bestond die pagina echt. Niets in de keten las dat adres: `content.ts` keek er alleen naar
  bij `verbeteren`, het scherm toonde bij `nieuw` alleen de chip "Nieuwe pagina". Drie losse
  aanbevelingen van Van den Udenhout wezen alle drie naar dezelfde bestaande private-leasepagina en
  werden alle drie een nieuwe pagina ernaast.
- **8 van de 59 `verbeteren`-adressen matchten niet** op `profile_pages.url`, want dat was een
  exacte stringvergelijking. Vijf daarvan waren geen verzinsel maar notatie: het model gaf
  `/tarieven-2026/` waar de inventaris `https://fysi-unique.nl/tarieven-2026/` bevat. Die pagina's
  zijn geschreven zonder één woord van hun eigen bestaande tekst, terwijl het scherm de klant
  vertelde ze te overschrijven. De drie overige waren echte verzinsels, waaronder tweemaal
  `/udenhout.nl/leasen/private-lease`, hetzelfde pad dat migratie `0025` met de hand opruimde.
- **De verbetering zelf rustte op 1500 tekens.** `profile_pages.text_excerpt` is afgekapt op
  `PAGE_MAX_CHARS`; 667 van de 738 gecrawlde pagina's staan op die grens en 9 van de 10
  daadwerkelijk verbeterde pagina's ook. Dat is ongeveer 230 woorden, terwijl de vervangende tekst
  er 400 tot 1200 telt. Alles wat verderop op de pagina stond bestond voor de schrijver niet. En de
  tekst was oud: tot 20 dagen tussen de crawl en het schrijven.
- **Er was geen verbeteranalyse.** Het contentcontract, de inhoudsopgave die de tekst stuurt en
  achteraf nagerekend wordt, kreeg de bestaande pagina niet te zien. De klant kreeg dus een
  vervangende tekst plus de instructie "houd dezelfde URL aan", en nergens stond wat er nu eigenlijk
  aan schortte of wat hij zou weggooien.

**Wat er gebouwd is** (migratie `0086`, op productie toegepast onder het label `0083`; zie
`supabase/README.md`). `existing-page-match.ts` kreeg er twee dingen bij. **Het adres wordt
genormaliseerd**: zei het model "verbeteren" met een adres dat wél bestaat, dan bleef dat adres
staan zoals het model het gaf, en dat was 5 van de 59 keer een pad zonder domein
(`/tarieven-2026/` waar de inventaris `https://fysi-unique.nl/tarieven-2026/` bevat). Dezelfde
pagina, maar onbruikbaar voor de schrijfstap en niet klikbaar op het scherm. Nu wint altijd de URL
uit de crawl. En **onder de omzetdrempel waarschuwen we in plaats van te zwijgen**: haalt een pagina
de 70% dekking niet maar raakt hij het onderwerp duidelijk (`EXISTING_PAGE_RELATED_THRESHOLD`, 40%,
plus de eis dat minstens één term in de titel of het adres staat), dan blijft de aanbeveling `nieuw`
en draagt hij die pagina mee als `related_url`. Zo ziet de schrijver dat hij zich moet
onderscheiden, en de klant dat hij al iets in die richting heeft. `coversTopic` is uit
`structure-gap.ts` naar `page-relevance.ts` verhuisd, zodat er één matcher blijft voor de vraag
"gaat deze pagina hierover".

`existing-page-fetch.ts` haalt de te verbeteren pagina vers op tijdens de planstap, tot 6000 tekens, met
één HTTP-verzoek en zonder AI. Lukt dat niet, dan valt de schrijfstap terug op het crawl-excerpt en
zegt de prompt erbij dat het een oudere en afgekapte versie is. Het contentcontract krijgt die tekst
als invoer en beoordeelt per sectie of hij er al op staat, half op staat of ontbreekt, met een zin
in gewone taal over wat er moet veranderen. Twee deterministische vangnetten eronder: zonder
bestaande pagina staat er `niet_van_toepassing` (een oordeel over een pagina die niet bestaat is per
definitie verzonnen), en een sectie die volgens het model "al op de pagina staat" terwijl geen enkel
kernwoord ervan in die tekst voorkomt, gaat terug naar `ontbreekt`.

Op het scherm: een blok "Wat er aan je pagina verandert" met per onderdeel of het nieuw is,
aangevuld wordt of blijft zoals het is, plus een echte woord-voor-woordvergelijking met de tekst die
er nu staat. Rood verdwijnt, groen komt erbij. Wat er al goed op stond gaat bewust mee in de lijst:
dat is de geruststelling die iemand nodig heeft voordat hij zijn eigen pagina overschrijft. En de
duplicatiecheck kijkt nu ook naar `profile_pages` en niet alleen naar wat de app zelf schreef; lijkt
een nieuwe pagina te sterk op een pagina die al op de site staat, dan zegt de melding "werk die
pagina bij" in plaats van "voeg ze samen".

**Kosten: nul extra AI-aanroepen.** Het contract werd toch al opgesteld en krijgt alleen betere
invoer; de ophaling is één HTTP-verzoek in een taak die verderop een schrijfaanroep van tot 150
seconden doet.

Vier controles groen na het samenvoegen met `main`: typecheck, unittests, ketentests (met een
scenario dat de hele keten met een gestubde site doorloopt) en de productiebuild. **Nog niet
geverifieerd tegen een echte klant** (conventie 10): er is nog geen rapport herdraaid op productie,
dus de 8 mislukte koppelingen en de 13 genegeerde pagina's zijn in de database nog niet zichtbaar
veranderd.

## 2 september 2026: de verificatie vond wat de code niet liet zien (domein in het pad)

Conventie 10 in de praktijk. De alinea hierboven eindigde met "nog niet geverifieerd tegen een echte
klant", dus is de echte `matchExistingPage()` over echte productiedata gedraaid: een doorsnede van
de 91 aanbevelingen die in `reports.recommendations_json` een adres dragen, met per adres de
pagina's uit de inventaris die hetzelfde laatste padsegment hebben. Dat filter kan geen match
missen, want `canonicalPath()` raakt het laatste segment nooit aan.

**Uitkomst: 18 van de 31 gekoppeld.** Dertien niet, en acht daarvan bleken hetzelfde patroon te
hebben: `/udenhout.nl/skoda`, `/udenhout.nl/leasen/private-lease`. Het model had het DOMEIN in het
pad gezet. Dat leest als een verzinsel en is het niet: `https://udenhout.nl/skoda` bestaat gewoon,
en alle acht wezen naar een pagina die echt bestaat. Ze werden alle acht weggegooid, en bij twee
ervan was dat een verbetering die naar `nieuw` degradeerde: een tweede pagina naast een pagina die
de klant al heeft, precies wat dit werk moest voorkomen.

Dit was bekend en nooit gerepareerd. Migratie `0025` zette dit adres in juli met de hand recht
(`update content_pieces set existing_url = ...`), en `briefing-select.ts` noemt het bij naam als de
fout waarvoor het link-slot bestaat. Beide keren is het geval opgelost, niet de oorzaak.

**Wat er gebouwd is.** `matchExistingPage()` doet een tweede poging als het eerste padsegment exact
de host van een gecrawlde pagina is (met of zonder `www.`). Er wordt niets geraden: het segment moet
écht een bekende host zijn, en wat er daarna overblijft moet nog steeds een bestaande pagina
aanwijzen. Een map met een punt erin (`/v1.2/handleiding`) blijft dus staan, en een ander domein in
het pad levert geen match op. `knownUrl()` in `reconcileExistingPageActions()` rust nu op diezelfde
oplosser, zodat het rapport en de schrijfstap niet uit elkaar kunnen lopen.

Tegelijk kreeg de `nieuw`-tak er een tweede signaal bij: draagt zo'n aanbeveling een adres dat wél
bestaat (32 van de 70 keer gevuld, 13 daarvan echt), dan wordt dat de `related_url`. Het model heeft
die pagina zelf in de lijst aangewezen, en dat weegt zwaarder dan onze eigen termmeting. Het veld
`existing_url` wordt daarbij leeggemaakt: dat betekent "deze pagina wordt vervangen", en dat is hier
juist niet aan de orde.

**Hermeting op dezelfde data: 26 van de 31.** De vijf die overblijven horen niet te koppelen: `/`,
`:`, `:null` en `.` (rommel die het model bij een nieuwe pagina invulde) plus één pagina die niet in
de inventaris staat.

⚠️ **Wat hier NIET mee geverifieerd is**: de verse ophaling (O3). De ontwikkelcontainer weert
uitgaand verkeer naar klantdomeinen (403 op de CONNECT-tunnel van de proxy), dus alle tien de
adressen faalden daar om een reden die niets met de code te maken heeft. Op Vercel bestaat die
beperking niet; het bewijs komt bij de eerste echte planstap, als `existing_page_text` gevuld raakt
met meer dan de 1500 tekens uit de crawl.

Vier controles groen: typecheck, 3622 unittests (10 nieuw, allemaal op echte productiegevallen),
576 ketentests, de productiebuild.

## 2 september 2026: de eerste echte verbeterpagina, en wat die liet zien

De laatste openstaande verificatie van conventie 10: één pagina daadwerkelijk laten schrijven met
handeling `verbeteren`, op productie, met echte betaalde aanroepen. Testmerk Wouter Warmtepomp,
cluster "Warmtepomp laten installeren in een bestaande woning", aanbeveling "Maak van de
hybride-pagina een praktische kostenpagina" tegenover `https://wouterwarmtepomp.nl/hybride-warmtepomp/`.
Er is niets gepubliceerd.

⚠️ **Kosten: circa $1,25, niet de $0,20 die vooraf begroot was.** De planstap kostte $0,024 en de
schrijfronde $0,287, maar daarna volgden DRIE gerichte reparatierondes van ongeveer $0,30 per stuk
(`REPAIR_MAX`). Die rondes zijn voor een deel door de fout hieronder uitgelokt: elk van de zes
zinnen over de bestaande pagina kwam als bevinding terug, en bevindingen zijn precies wat een
reparatieronde start. De reparatie hieronder is dus niet alleen een kwaliteitskwestie maar ook een
kostenkwestie: een fout die in de eerste ronde wordt voorkomen, scheelt hier het duurste model drie
keer.

**Wat aantoonbaar werkt.** De pagina werd vers opgehaald: **3493 tekens tegenover de 1500 uit de
crawl**, met tijdstempel, en beide kolommen uit migratie `0086` staan gevuld op de geschreven
pagina. Het adres koppelde zonder ingrijpen, de handeling bleef `verbeteren` en `related_url` bleef
leeg (juist, want bij een verbetering ís de bestaande pagina de pagina zelf). Het contract leverde
een verbeterplan van 20 onderdelen, elk met een oordeel en een zin in gewone taal: 12 "wordt
aangevuld", 8 "is nieuw", nul zonder uitleg. De dekkingspoort gaf 92. Twintig secties is geen
uitschieter: eerdere contracten telden er 11, 13, 25 en 25.

**Wat er misging, en het is een regressie van dit werk.** De pagina opende zo:

> "Voor Dongen en Oosterhout is op basis van de beschikbare informatie geen betrouwbaar totaalbedrag
> vast te stellen: **de bestaande pagina** noemt wel systemen en enkele installatieonderdelen, maar
> geen prijzen."

Zes van zulke zinnen stonden erin. Dat gaat niet over warmtepompen maar over ons werkproces, en het
zou op de site van de klant belanden; een bezoeker van wouterwarmtepomp.nl weet niet wat "de
bestaande pagina" is, hij LEEST die pagina. De oorzaak is begrijpelijk en had voorzien kunnen
worden: geef een model materiaal plus de opdracht "verbeter dit", en het gaat verslag doen van het
verschil. De redactie zag het overigens wél (de bevindingen noemen elk van die zinnen), maar als
"bewering zonder bron", niet als categorie.

Gerepareerd op twee plekken, zoals conventie 1 voorschrijft. De schrijfinstructie zegt nu expliciet
dat de bestaande tekst materiaal is en nooit onderwerp, met de opdracht om bij een ontbrekend
gegeven op te schrijven wat er WEL geldt in plaats van wat wij niet konden vinden. Daarnaast meldt
`checkSourceTalk()` (`content-gate.ts`) elke zin die naar de bestaande pagina, de feitenkaart of
"de beschikbare informatie" verwijst, en die bevindingen gaan de gerichte reparatie in. ⚠️ De
controle kijkt alleen naar woordcombinaties die een TEKST aanwijzen: "de bestaande cv-ketel" en "de
huidige situatie in je woning" zijn gewone zinnen op zo'n pagina en blijven staan. De unittest
gebruikt de echte productiezin als geval.

**Twee dingen die open blijven staan.** Nul van de 20 secties kreeg het oordeel "staat er al", dus
de klant krijgt nooit de geruststelling "dit blijft zoals het is". Dat kan kloppen voor deze dunne
pagina, maar het is niet aangetoond, en het vangnet kan alleen strenger corrigeren (van "aanwezig"
naar "ontbreekt"), nooit soepeler. En de opgehaalde tekst bevatte het navigatiemenu, twee keer: van
de 3493 tekens is ongeveer een derde ruis. De oplossing daarvoor bestaat al in een andere tak
(`page-text.ts`, alleen semantische tags) die nog niet op `main` staat; die twee keer bouwen is
precies wat dit project niet wil. Beide staan in
`docs/tasks/paginakeuze-nieuw-of-verbeteren.md`.

**Hoe het afliep, en dit is een correctie op wat hier eerst stond.** Na twee reparatierondes was de
opening keurig ("Voor een hybride warmtepomp van Wouter Warmtepomp kan hier voor Dongen en
Oosterhout geen betrouwbaar totaalbedrag worden genoemd zonder woninggegevens en een actuele
offerte") en stond er geen enkele meta-zin meer in. Op dat moment is hier genoteerd dat de redactie
de fout had weggewerkt. **Dat klopte niet.** De DERDE reparatieronde draaide de opening terug, en de
pagina staat nu op `ready` met **vijf** zinnen over "de bestaande pagina" en "de beschikbare
informatie" erin. Nagerekend op de rij zelf, niet op een tussenstand.

Dat maakt `checkSourceTalk()` geen luxe maar een noodzaak: de bestaande poorten zien deze zinnen
alleen als losse "bewering zonder bevestigd feit", een reparatieronde kan ze net zo goed opnieuw
introduceren, en niets houdt de pagina dan tegen. Met de nieuwe controle blijft zo'n pagina op
"check nodig" staan in plaats van op `ready` te belanden.

**Eindstand na de derde reparatieronde:** dekking 96, GEO-score 100, kwaliteitsscore 61, 1268
woorden, status `ready`. De kwaliteitsscore liep tijdens de rondes op en neer (58 → 42 → 61): de
tweede ronde ruilde bevindingen tegen nieuwe bevindingen voordat de derde hem over de drempel
trok. Ter vergelijking: de vorige contentronde van 1 september haalde gemiddeld 44,5 over vier
pagina's en al die vier bleven op "check nodig" staan. Deze pagina haalt de poort wél, met de
volledige tekst van de bestaande pagina als basis. Totale kosten van de ronde: $1,25.

Vier controles groen: typecheck, 3629 unittests (7 nieuw), 576 ketentests, de productiebuild.

## 2 september 2026: het clusteroverzicht subtieler, na de eerste dag met labels en prullenbak

Migratie 0083 (1 september) zette de labelkeuzelijst en de prullenbakknop op een eigen regel onder
elke clusterkaart. Na een dag gebruiken bleek dat te zwaar: bij drie clusters was het al een derde
extra hoogte per kaart, en bij dertig zou het een muur van keuzelijsten worden die niemand elke dag
aanraakt. Twee aanpassingen, geen van beide raakt de meting of de database.

**Label en prullenbak achter één menu.** `cluster-kaart.tsx` verliest de hele regel; beide acties
zitten nu achter het drie-puntjes-icoon naast de statusbadge, naar hetzelfde patroon als
`components/profile-menu.tsx` (een paneel dat sluit op een klik erbuiten of op Escape). Het label
dat al gekozen is blijft als chip in de kop staan, want dat is een cijfer over het cluster en geen
bediening. De prullenbakknop in de prullenbak zelf ("Terugzetten") bleef ongemoeid: die stond al op
één regel met één knop.

**De voorgestelde onderwerpen staan standaard dicht.** `topics-panel.tsx` gebruikte een vaste,
altijd open kaart voor "Onderwerpen om op te meten", en dat blok stond onderaan de pagina vaak
langer dan "Mijn clusters" erboven, terwijl dat de reden is waarop iemand deze pagina opent. Het
blok is nu een `CollapsibleSection` met `defaultOpen={false}`: titel en aantal ("6 voorgesteld")
blijven zichtbaar, de onderwerpen zelf pas na een klik.

Vier controles groen: typecheck, 3629 unittests, 576 ketentests, de productiebuild.

## 2 september 2026: het scherm één keer echt bekeken, en twee fouten die geen test zag

De verbeterlijst en de vergelijking waren gebouwd, getest en gemerged, maar nooit met eigen ogen
bekeken. Dat is nu gedaan, met de ECHTE productiedata van de hybride-pagina: de componenten
gerenderd, de Tailwind-CSS van het project erover, en een screenshot in Chromium.

**De lijst klopt.** Per onderdeel de kop, het label ("wordt aangevuld" of "is nieuw") en de zin in
gewone taal eronder, met de telling "Van de 7 onderdelen op deze pagina: 3 onderdelen zijn nieuw en
4 worden aangevuld." Leesbaar, geen afgebroken tekst, het adres klikbaar.

**De vergelijking was onbruikbaar.** `diffContent()` vergelijkt woord voor woord, en dat werkt
prachtig tussen twee versies van onze eigen tekst: daar verandert een zin en blijft de rest staan.
Tussen de pagina van de klant en de vervangende tekst werkt het averechts, want die twee delen
alleen hun kleine woorden. Wat de klant te zien kreeg:

> Hybride Warmtepomp ~~Wouter Warmtepomp B.V.~~ Voor ~~Airco~~ Dongen en ~~warmtepomp installateur~~
> Oosterhout ~~to is footer~~ op ~~Home~~ basis ~~Over~~ van ~~ons~~ de ~~Ons~~ beschikbare

Doorgestreepte en nieuwe woorden om beurten, uit twee teksten die niets met elkaar te maken hebben.
Het suggereert bovendien een precisie die er niet is: een verbetering is een herschrijving, geen
bewerking. `diffContent()` heeft er een derde parameter bij gekregen waarmee de aanroeper
alineaniveau kan afdwingen, en de route die met de bestaande pagina vergelijkt doet dat. Nu staat er
één rood blok ("dit verdwijnt van je pagina") en één groen blok ("dit komt ervoor in de plaats").

**En die twee blokken plakten aan elkaar**: "...Onderhoud inplannenVoor Dongen en Oosterhout...".
Precies de overgang die de klant moet zien, onleesbaar door een ontbrekende regelafbreking. Op
alineaniveau krijgt elk blok nu zijn eigen regel.

⚠️ **Geen van beide fouten was met een test te vinden.** De unittests controleerden dat de diff de
juiste bewerkingen teruggeeft, en dat deed hij; dat het resultaat voor een mens onleesbaar was, zie
je alleen door te kijken. Er staan nu wel tests op: dat twee losse teksten op woordniveau
versnipperen, dat alineaniveau er twee blokken van maakt, en dat de route en het scherm die stand
ook echt gebruiken.

**Bijvangst, over het oordeel per sectie.** De vraag was of ons vangnet te streng was, want nul van
de 20 secties kreeg "staat er al". Uit de bewaarde ruwe modeluitvoer (conventie 8) blijkt dat het
MODEL zelf al nul "aanwezig" gaf: 12 "deels", 8 "ontbreekt", en het vangnet heeft niets omgezet. Het
echte risico is daarmee scherper dan gedacht: deze tekst vervangt de pagina, dus alles wat niet in
het contract staat raakt de klant kwijt, en de productlijst op die pagina (Remeha, Daikin) stond er
niet in. Instructie (h) vraagt het model nu expliciet om eerst de bestaande pagina langs te lopen en
elk onderwerp dat de lezer nodig heeft over te nemen als sectie met 'aanwezig'. `content-plan.ts`
logt voortaan hoeveel secties dat zijn, met een waarschuwing bij nul, zodat meetbaar is of de
instructie werkt in plaats van dat het opnieuw met de hand ontdekt moet worden.

Vier controles groen: typecheck, 3635 unittests (6 nieuw), 576 ketentests, de productiebuild.

## 2 september 2026: het menu uit de opgehaalde pagina, met de module die er al was

Het laatste punt uit de verificatieronde: van de 3493 tekens die van
`wouterwarmtepomp.nl/hybride-warmtepomp/` werden opgehaald, was ongeveer een derde het
navigatiemenu, twee keer achter elkaar, vóór de eerste zin over hybride warmtepompen. Dat vervuilde
twee dingen tegelijk: het oordeel per sectie in het contract (het model beoordeelt inhoud die geen
inhoud is) en het verschilscherm, waar het menu als "dit verdwijnt van je pagina" verscheen.

**De oplossing bestond al en is overgenomen, niet nagebouwd.** `lib/pipeline/page-text.ts` komt
letterlijk uit de tak `claude/gasservice-brabant-content-fe9g07`, die op 1 september hetzelfde
probleem in de CRAWL oploste (daar bestond 94% van de opgeslagen fragmenten uit menu). Die tak staat
nog niet op `main`. Hem hier een tweede keer bouwen zou twee plekken opleveren die het oneens kunnen
worden over dezelfde vraag; nu zijn de bestanden identiek en is het samenvoegen straks triviaal. De
tests zijn mee overgenomen, met één geval erbij: het dubbele menu zoals het op deze site stond.

⚠️ Wat NIET is overgenomen: diezelfde tak verhoogt ook `PAGE_MAX_CHARS` van 1500 naar 4000 en
gebruikt het schonen in de crawl zelf. Dat raakt de volledige content-inventaris van elke klant en
heeft zijn eigen verificatie nodig. Dat hoort bij die tak.

`fetchExistingPage()` schoont nu vóór het afkappen, wat de volgorde is die telt: zonder dat is het
begin van elke pagina het menu, en precies dat begin valt binnen de grens van 6000 tekens. Er is een
logregel bij die meldt hoeveel tekens het schonen scheelde, ook als het niets deed. Zonder die reeks
is nooit vast te stellen of dit op andere sites ook werkt, dezelfde reden waarom `similarity.ts` zijn
gemeten gelijkenis altijd logt.

⚠️ **Getest, niet gemeten.** De unittests dekken de structuur af, maar of dit op de echte HTML van
wouterwarmtepomp.nl werkt is niet vastgesteld: de ontwikkelcontainer mag die site niet ophalen (403
op de proxytunnel). De aanwijzing is sterk, want "Skip to content Skip to footer" en een dubbel menu
wijzen op een thema met echte `<nav>`-elementen, maar een aanwijzing is geen meting. De
eerstvolgende echte verbetering levert het cijfer via die logregel.

Vier controles groen: typecheck, 3648 unittests (13 nieuw), 576 ketentests, de productiebuild.

## Analytics doorgelicht: vier leesschermen voor één breed scherm (2 september 2026)

De vier pagina's onder Analytics zijn tegen het licht gehouden op wat er waar staat en waarom. Het
meetwerk eronder bleek in orde en is niet aangeraakt; wat ontbrak was hiërarchie. Vier cijfers uit
die doorlichting, allemaal tegen productie nagerekend en niet uit documentatie overgenomen.

**Concurrenten is 37.857 pixels hoog, en 34.000 daarvan is beheerwerk.** De analyse zelf, de
ranglijst en het bronnenlandschap, past in de eerste 3.000. Daaronder staan 329 merken met elk een
uitklapmenu en drie keuzes. Dat blok stond daar met een goed argument, het bepaalt de noemer van de
ranglijst erboven, maar dat argument hield stand bij dertig merken en niet bij 329. Het verhuist
naar een stafscherm: het is bovendien nooit werk voor de klant geweest (§15).

**Op Zichtbaarheid gaan de eerste 700 pixels over de meting en de resterende 2.500 over de
techniek.** Zeventien controles staan volledig uitgeschreven onder elkaar, waarvan er twaalf "in
orde" zeggen, en één bevinding somt 149 afwijkende paginatitels op in één alinea van bijna
vierhonderd woorden. Wat in orde is hoeft niet gelezen te worden, alleen geteld.

**Bij de reputatiemeting van 23 augustus kregen 22 van de 22 bruikbare antwoorden hetzelfde label:
`gemengd`.** Dat label scoort 0, dus de toonindex is 0 en de meter staat exact in het midden met een
marge van 3,1. Het grootste en eerste element van dat scherm kan bij dit merk dus niet bewegen.
Ondertussen zit de uitkomst die wél verschilt weggeklapt achter een uitklapper: de vier criteria uit
`reputation_ranks`, met plaats 1 van 4 op kwaliteit, 1 van 3 op betrouwbaarheid, 2 van 4 op
dienstverlening en geen oordeel op prijs tegenover kwaliteit. Dat is letterlijk het antwoord op de
vraag die de pagina stelt. De criteria worden het hoofdbeeld, de toon wordt een verdeling met een
duidende zin. Dat 22 van de 22 hetzelfde label krijgen blijft een meetkwestie en geen
ontwerpkwestie; het is genoteerd, niet weggewerkt.

**Er staan drie gepubliceerde contentpagina's in de hele database, en `content_impact` telt vijf
metingen die nergens getoond worden.** Zoekverkeer rekent vandaag over de hele website, waarvan het
grootste deel bestond voordat ORBIT ENGINE begon, terwijl de enige tabel die met een controlegroep
oorzaak en gevolg verbindt onzichtbaar is.

**Drie besluiten die het ontwerp vastleggen.** (1) De vier pagina's worden **puur informatief**: geen
knoppen naar Strategie, wel per pagina één duidende zin die uit de cijfers zelf gerekend wordt. Bij
een sales-led product doet de consultant het werk, de klant leest. (2) Analytics wordt **uitsluitend
voor desktop** ontworpen, 1440 tot 1920 met 1280 als ondergrens, en de inhoud loopt door tot
ongeveer 1600 pixels in plaats van de huidige 850. Dat is bijna een verdubbeling van het werkvlak en
de enige reden waarom een tabel van negen kolommen en een detailpaneel tegelijk passen. Onder 1280
schuift de pagina, en dat is een keuze en geen omissie. (3) De filterbalk krijgt **Periode, Label,
Cluster, Fase** in die volgorde, op alle vier de schermen op dezelfde plek. Label en Cluster kunnen
meteen, want migratie 0083 gaf clusters een label en `lib/cluster-labels.ts` filtert er al op; Fase
niet, want die is in de opgeslagen cijfers weggerekend en moet uit de 770 ruwe metingen in
`tracking_runs` worden opgeteld.

⚠️ Twee dingen heten nu "label": de clustergroep uit 0083 en het labelveld van
`profile_funnel_stages` dat de contentfasen draagt. Bovendien lopen de fasenlijsten uiteen, drie
categorieën aan de meetkant tegenover vier aan de contentkant. In de schermen heet de clustergroep
Label en de klantreis Fase, nooit allebei hetzelfde, en die twee lijsten gelijktrekken staat als
eigen stap in het plan.

Het bouwplan staat in `docs/tasks/analytics-herontwerp.md`, in drie rondes die elk op zichzelf op te
leveren zijn. Er is bij deze doorlichting geen productiecode gewijzigd.

## 1 september 2026: de eerste echte contentronde, en wat daaruit viel

De herbouwde schrijfpijplijn is voor het eerst tegen een echte klant gedraaid, op productie, met
echte betaalde aanroepen: Gasservice Brabant, nieuw cluster "Hybride warmtepomp"
(`c22f7d96-ce1b-405f-901f-c473826a8710`), 30 vragen, 46 metingen, vier geschreven pagina's. Het
volledige verslag met de twaalf geprioriteerde verbeteringen staat in
`docs/tasks/contentronde-gasservice-brabant-1-september-2026.md`. Er is niets gepubliceerd.

**Het oordeel: het contract en de poorten werken, de uitkomst niet.** Alle vier de pagina's halen
hun dekking (86, 88, 90 en 98) en drie ervan een GEO-score van 100. En toch: twee pagina's schrijven
in hun eerste alinea dat het bedrijf niet kan worden aanbevolen, een derde eindigt zijn openingszin
op `[F1, F2, F5, F14]`, en de pagina over prijzen opent met "Er is geen gecontroleerde, concrete
prijs ... beschikbaar in dit dossier" terwijl de pagina die hij moest verbeteren zelf "maximaal
€6000" noemt. Gemiddelde kwaliteitsscore 44,5; alle vier op "check nodig" tegen 15 van de 29 (52%)
bij de oude pijplijn.

**Drie oorzaken, alle drie in code, alle drie klein te repareren.** Ten eerste worden antwoorden met
reikwijdte "pagina" nergens gelezen: `factbase.ts:138` en `content.ts:800` filteren ze allebei weg,
en `content_piece_ids` wordt alleen gebruikt om vragen te groeperen. Deze ronde waren 9 van de 16
briefingvragen paginagebonden en verdwenen 4 van de 8 antwoorden. Ten tweede stelt `content-plan.ts`
het contract op met de bevroren feitenkaart zonder `mergeAnsweredFacts`: de antwoorden stonden er 25
seconden eerder, het contract plande er dwars doorheen. Ten derde staat `PAGE_MAX_CHARS` op 1500
tekens voor elke meerpagina-crawl, en bij deze site is dat precies het navigatiemenu: 139 van de 148
opgeslagen pagina's (94%) lopen tegen die grens aan terwijl het menu er nog twee keer in staat.
Diezelfde grens laat de bronverificatie 18 van de 35 uitleggen afkeuren; nagerekend voorbeeld: het
citaat staat op teken 10.696 van 21.141.

**De kosten kloppen niet met het advies.** Gemeten $1,131 per pagina tegen de voorspelde $0,24, over
191 aanroepen $5,4011 voor de hele ronde. De schrijfaanroep groeide van 5.599 naar 23.649
invoertokens (contract, dossier en uitleg komen er allemaal bij) en kost $0,3045. De grootste post
is de "gerichte reparatie": drie rondes van $0,2525 met gemiddeld 6.245 uitvoertokens, dus méér dan
de oorspronkelijke schrijfaanroep. Gericht is hij niet, en hij helpt ook niet: de kwaliteitsscore
van de eerste pagina liep 67, 74, 68, 48. De lus stopt op `REPAIR_MAX` en niet omdat er iets is
opgelost.

**Wat wél werkte.** De doorlooptijd (A10): vier pagina's parallel, 19 minuten voor de hele batch.
Het wegschrijven vóór de redactieronde: één schrijfaanroep werd afgebroken op de limiet van 150
seconden en kostte geen tweede dure aanroep. Het itemdossier levert precies de vragen die een koper
stelt. En de feitenkaart doet exact wat hij moet doen: er is geen enkel verzonnen feit over
Gasservice Brabant op de vier pagina's terechtgekomen. Het probleem is niet dat er te veel wordt
beweerd, het is dat er te weinig te beweren viel.

## 1 september 2026: de twaalf verbeteringen uit de eerste contentronde gebouwd

Alles uit `docs/tasks/contentronde-gasservice-brabant-1-september-2026.md` is doorgevoerd, in de
volgorde van die lijst. Geen migratie nodig: er is geen kolom bij gekomen. Vier controles groen:
typecheck, 3539 unittests (82 nieuwe), 561 ketentests (4 nieuwe), de productiebuild.

**De drie die de ergste fout wegnemen.** Antwoorden van de klant met reikwijdte `pagina` werden
nergens gelezen; die regel staat nu op één plek (`lib/pipeline/answer-scope.ts`) en wordt door de
feitenkaart, de schrijfstap en de planstap gedeeld. De planstap stelde het contract op met de
BEVROREN kaart en voert nu `mergeAnsweredFacts` uit, net als `loadContentContext` al deed sinds
R8.1. En `normaliseerContract` weigert een opening die over onze eigen bewijsvoering gaat en
verwijdert F-verwijzingen uit de openingszin en uit de koppen. Dat laatste is het vangnet dat
conventie 1 vraagt: ook met een gat in de feitenkaart mag "Gasservice Brabant kan niet als
aantoonbare specialist worden aanbevolen" nooit de eerste zin van een klantpagina worden.

**Eén cap die drie stappen tegelijk beschadigde.** `PAGE_MAX_CHARS` stond op 1500 tekens voor elke
meerpagina-crawl, en bij deze site was dat precies het menu: 139 van de 148 opgeslagen pagina's
(94%) liepen tegen die grens aan terwijl het navigatiemenu er nog twee keer in stond. Nu gaat eerst
het menu eruit (`lib/pipeline/page-text.ts`, alleen op `<nav>`, `<footer>` en een `<header>` mét
menu, met een vangnet dat terugvalt op het origineel als er te weinig overblijft) en pas daarna
knippen we, op 4000. Nagemeten op de echte kennisbankpagina: 4690 naar 1782 tekens, en het bedrag
"maximaal €6000" staat nu in de eerste 260 tekens in plaats van na 1757. De bronverificatie van de
algemene uitleg leest voortaan de VOLLEDIGE brontekst (`fullText`), want het citaat dat op
1 september werd afgekeurd stond op teken 10.696 van 21.141; `MAX_BRONNEN` van 6 naar 12.

**De reparatielus stopt nu op verbetering in plaats van op drie rondes.** De kwaliteitsscore liep
67, 74, 68, 48 en de klant kreeg de laatste. Twee grenzen, en het verschil doet ertoe: BEWAREN
gebeurt zolang de ronde niet slechter is (een reparatie die een onbewezen bewering weghaalt terwijl
het cijfer gelijk blijft, is winst zonder cijfer), DOORGAAN alleen als de score stijgt. Op de
gemeten reeks levert dat 74 in plaats van 48 en vervallen twee van de drie rondes, dus ongeveer
$0,50 per pagina. De reparatieprompt krijgt bovendien hooguit tien bevindingen, gesorteerd van
"bewering zonder bevestigd feit" naar "vraag die de lezer overhoudt"
(`lib/pipeline/content-issues.ts`): met 119 opdrachten over 25 secties was er niets gerichts meer
aan een sectiereparatie, en de uitvoer werd groter dan die van het schrijven zelf.

**En het contract past nu in de doellengte.** De schrijfprompt zei tegelijk "je mag er niets uit
weglaten" en "ga niet over het maximum heen"; bij 25 secties van samen 1000 woorden op een
doelbereik van 400 tot 700 kan het model niet allebei. `normaliseerContract` snoeit van achteren
tot de som past, houdt altijd minstens drie secties, en begrenst de FAQ op acht vragen.

**Zes kleinere ingrepen.** De ontwijkingscontrole keek alleen naar de opening en gaf daarom een
GEO-score van 100 aan een pagina met 15 zinnen die de lezer wegsturen; hij telt nu het aandeel over
de hele pagina, met een tweede, bredere patroonlijst naast de harde. De poort keurt af als de
pagina over zijn eigen website in de derde persoon praat. `factNummers` in de dekkingspoort leest
een samengestelde verwijzing nu net zo als `isSupported` dat al deed (3 van de 18 claims hadden er
een). `word_count` wordt bij reparatie bijgewerkt (stond op 896 terwijl de tekst 1331 woorden had).
`pronoun_preference` gaat mee naar de schrijver, een veld dat we verzamelden en nergens gebruikten.
En de uitleg-eis toetst op een echte definitiezin, ergens op de pagina, in plaats van op
woordoverlap per sectie: dat laatste maakte van vier opeenvolgende secties een woordenlijst.

**Twee dingen liepen anders dan het advies zei, en die staan in het verslag.** Een feit herschrijven
van "De website vermeldt dat X" naar "X" werkt niet in het Nederlands, want na "dat" volgt een
bijzin; het is een controle op de pagina geworden in plaats van een bewerking van de kaart. En een
paginagebonden antwoord gaat NIET de feitenbank in: die leest merkbrede en analysebrede feiten
terug, dus het antwoord over Tilburg zou alsnog op de Eindhoven-pagina belanden. Het staat nu op de
kaart van zijn eigen pagina zonder bank-id. De ketentest ving dat.

**Nog niet geverifieerd tegen een echte klant** (conventie 10). De impactcijfers in het verslag zijn
voorspellingen; de volgende contentronde is de toets die telt.

## 2 september 2026: de app vraagt nu wat ze mist, in plaats van eromheen te schrijven

De twaalf verbeteringen van 1 september repareerden de pijplijn. Wat ze niet raakten, was de reden
dat die pagina's dun waren: de app plande **om haar eigen kennisgaten heen**. Regel (d) van de
contractprompt zei letterlijk *"Plan NOOIT een sectie die alleen waar te maken is met een feit dat
we niet hebben. Onder 'NIET ONDERBOUWD' staat wat er ontbreekt; daar mag je omheen plannen, niet
doorheen."* De app verlaagde dus haar ambitie tot wat ze toevallig al wist, en niemand hoorde ervan.
Een gat werd stilzwijgend een dunnere pagina in plaats van een vraag aan de ondernemer. Gemeten op
1 september: van de 25 secties van de Tilburg-pagina rustten er 18 op geen enkel feit over het
bedrijf, en de app schreef ze alle 25 toch.

Het plan staat in `docs/tasks/vragen-voor-het-schrijven.md`, in één zin: **het contract is het
ideaal, de feitenkaart is de werkelijkheid, en het verschil is de vragenlijst.**

**De volgorde is omgedraaid.** Was: de klant kiest pagina's, de briefing verzint welke beweringen
nodig zijn, de klant antwoordt, en pas dáárna zoekt de app uit wat de pagina echt moet behandelen.
De vragen kwamen dus uit een stap die de pagina nog niet kende. Nu draait `content_plan` eerst, per
pagina, en de laatste plantaak van de batch start de briefing
(`scheduleBriefingIfLastPlan` in `lib/jobs/handlers.ts`, dezelfde constructie als
`scheduleAggregateIfLastPrompt` inclusief de uitsluiting van de eigen taak). Dat kost het
itemdossier en het contract ook voor pagina's die de klant alsnog laat liggen: $0,0172 plus $0,0047
per pagina, negen cent voor vier pagina's, tegenover $4,52 voor het schrijven.

**Er is voor het eerst een maat voor "hebben we hier genoeg voor".** `ContractSection` krijgt
`needsBrandFact`: vraagt deze sectie om een uitspraak over dit bedrijf, of is het algemene uitleg?
Dat is een oordeel van het model; of het F-nummer erbij écht bestaat, is een telling en die doet de
code (`lib/pipeline/input-coverage.ts`, conventie 1). De **onderbouwingsgraad** is `gedekt /
merksecties`, en `null` bij nul merksecties, want een pagina die volledig uit algemene uitleg
bestaat is geen slechte pagina (conventie 3). In de ketentest komt hij op 50% uit: twee
merkgebonden secties, één met een bestaand feit.

**De inputpoort staat vóór het geld.** `lib/content-input-gate.ts`, drie standen: boven 70%
schrijven, tussen 40 en 70 schrijven met een waarschuwing die de vervallende secties noemt, onder
40% niet schrijven. Geen muur: er zijn altijd drie uitwegen, en de melding noemt ze in dezelfde zin
als de blokkade. Twee poorten met twee vragen, en ze vervangen elkaar niet: deze vraagt "kan dit
goed worden?" vóór de dure schrijfaanroep, `content-final-gate.ts` vraagt "is dit af?" erna. De
grenzen 40 en 70 zijn een startwaarde en geen wet; ze worden per pagina bewaard
(`content_pieces.input_coverage`) zodat ze na tien echte pagina's op data bijgesteld kunnen worden,
dezelfde afspraak als bij `DUPLICATE_THRESHOLD`.

**Overslaan kost nu iets dat je ziet.** Elke vraag draagt de secties die op haar antwoord wachten
(`fact_requests.section_refs`, als `<pagina-id>:<sectie-id>`, want elke pagina nummert vanaf s1 en
de ontdubbeling voegt vragen van verschillende pagina's samen). Slaat de klant de vraag over, dan
vervalt die sectie vlak vóór het schrijven en wordt de pagina korter in plaats van vager. Tot nu toe
kreeg de schrijver nog steeds de opdracht die sectie te vullen, en deed dat door om het gat heen te
praten: over de vier pagina's van 1 september samen stonden 80 zinnen die de lezer opdragen iets na
te vragen. Ondergrens van drie secties, net als bij `snoeiOpDoellengte`: slaat de klant echt alles
over, dan is dat werk voor de inputpoort en niet voor de snoeifunctie.

**Het vraagbudget ging van de batch naar de pagina.** Het plafond van 8 naar 12, en de sortering was
`aantal pagina's × kern(2) × prioriteit`, dus puur bereik: een vraag die vier pagina's van 85% naar
88% helpt won altijd van de vraag die één pagina van 30% naar 60% tilt. Er komt een factor bij voor
hoeveel de zwakste bediende pagina erop vooruitgaat, met 0,5 bij onbekend (niet 0, want dan
verdwijnt zo'n vraag stilzwijgend, en niet 1, conventie 3). Zonder cijfers gedraagt de sortering
zich exact als voorheen, en dat is wat de bestaande tests beschrijven.

**Het briefingscherm toont de stand per pagina.** Eén lijst vragen zei niet welke pagina eraan toe
was; nu staat per pagina het cijfer, wat er zonder antwoord wegvalt, en bij een pagina die niet
zonder meer kan twee knoppen: hem bewust algemeen laten schrijven (`content_pieces.write_mode`) of
hem laten vallen. Kiest de klant voor algemeen, dan vervallen ALLE ongedekte merksecties, anders
schrijft het model daar alsnog omheen en is de keuze een woord zonder gevolg.

**Vier controles groen**: typecheck, 3599 unittests (60 nieuwe), 573 ketentests (12 nieuwe, in één
scenario dat de hele nieuwe volgorde doorloopt), de productiebuild. Migratie 0087, additief.

⚠️ **Bij het samenvoegen met `main` is deze migratie hernummerd van 0083 naar 0087.** Hij was op
1 september als 0083 op productie gezet, en op `main` was dat nummer intussen bezet door
`0083_clusterlabels.sql`. De kolommen zelf zijn niet aangeraakt (dat zou data kosten); alleen hun
`comment` is bijgewerkt, zodat het nummer in de database hetzelfde is als in de map. De vier
controles zijn ná het samenvoegen opnieuw gedraaid: 3790 unittests, 592 ketentests.

**Nog niet geverifieerd tegen een echte klant** (conventie 10). De ketentest bewijst de samenhang op
de stub; wat er in een echte ronde uit `needsBrandFact` komt, is nog niet gemeten. De eerste toets
die telt is de volgende contentronde, en de meetlat staat in
`docs/tasks/vragen-voor-het-schrijven.md` §12. De meest contra-intuïtieve regel daarvan: als de
inputpoort in die ronde nooit afgaat, staat de drempel te laag en is hij decoratief.

## Analytics-herontwerp, ronde 1: het fundament (2 september 2026)

Ronde 1 van `docs/tasks/analytics-herontwerp.md` is gebouwd: het rooster (F1), de filterbalk (F2),
de tabelcomponent (F3), en de vier ingrepen die volgens het plan samen de meeste hoogte weghalen en
de meeste breedte teruggeven (Z3, Z5, C1, C3), plus C2 omdat die op dezelfde tabel meelift.

**F1, teruggedraaid dezelfde dag.** De verruiming naar 1600 pixels is gebouwd geweest
(`components/workspace-chrome.tsx`, `app/(app)/merk/[id]/analytics/layout.tsx`) en na feedback van
de eigenaar weer verwijderd: Analytics blijft op de standaardbreedte van 1024 pixels, net als de rest
van de app. F3 (`components/analytics-table.tsx`) laat elke cijferkolom daardoor krapper staan dan
het plan voorzag; de tabel comprimeert zichzelf binnen die breedte (`table { max-width: 100% }` staat
al globaal in `app/globals.css`) in plaats van te verbreden of te scrollen.

**F2 en F3.** `lib/analytics-filters.ts` (pure functies, getest) plus `components/analytics-filters.tsx`
geven Zichtbaarheid en Concurrenten dezelfde filterbalk: Periode, Label, Cluster. Periode is nieuw
ten opzichte van het plan zoals opgeschreven: clusters delen geen `week_no` (die telt per analyse,
zie `app/api/cron/tracking/route.ts`), dus een periode is hier een meetdatum, en de keuze selecteert
per cluster de laatste meting op of vóór die datum (`selecteerPerCluster()`). Tegen de echte data van
Gasservice Brabant gecontroleerd: vijf clusters, vijf verschillende meetdata, een gekozen datum van
15 augustus laat precies het ene cluster zien dat toen al gemeten was. `components/analytics-table.tsx`
sorteert, plakt zijn kop en zijn eigen rij, en groepeert desgewenst op label.

**Z3 en Z5.** De clusterkaarten op Zichtbaarheid zijn een tabel geworden (label, cluster,
zichtbaarheid, marge, verandering, gemeten vragen, laatst gemeten), zwakste eerst.
`components/audit-panel.tsx` toont nu één regel ("11 van de 17 controles in orde" bij Gasservice
Brabant vandaag) met drie groepen die uitklappen; een goedgekeurde controle wordt daarbinnen één
regel met een vinkje. De groepsindeling (`groepVoorCheck()`) is tegen de echte `checks_json` van dat
merk gecontroleerd: 17 controles, verdeeld over toegang (8), begrijpen (4) en identiteit (5), precies
zoals het plan voorspelde.

**C1, C2, C3.** Het entiteitenbeheer is verhuisd naar `app/(app)/merk/[id]/admin/concurrenten`, met
een zoekveld (402 rijen bij dit merk, te veel om doorheen te scrollen); Concurrenten houdt alleen een
voetnoot over die de noemer verklaart. Admin gaat daarmee van zeven naar acht bestemmingen, met de
uitzondering uitgeschreven bij `GRENS_PER_HOOFDSTUK` in `lib/nav.ts`. Het hoofdcijfer op Concurrenten
is een plaats ("Plaats X van Y merken"), de ranglijst is de volle breedte met een staafje achter
"Genoemd" en een vastgezette eigen rij.

**Wat nog niet is gedaan.** Het admin-scherm heeft alleen een zoekveld; filteren op ingedeeld/niet en
rijen tegelijk bewerken is niet gebouwd. Ronde 2 (V1 tot en met V5, R1 tot en met R3, Z1, Z2, C5;
C2 zat al in deze ronde) en ronde 3 (F4, F5 met het fasefilter, Z4, Z6, Z7, V6 tot en met V8, C4, C6,
R4 tot en met R6) staan nog open in `docs/tasks/analytics-herontwerp.md`. Vier controles groen:
typecheck, 3664 unittests (16 nieuw), 576 ketentests, de productiebuild.

**Directe reparatie: Zichtbaarheid crashte in productie.** ⚠️ De eerste versie gaf `AnalyticsTable`
zijn kolommen (met `render`/`sortValue`-functies erin) rechtstreeks mee vanuit `page.tsx`, een
Server Component. Dat mag niet: React kan geen functies serialiseren over de grens naar een Client
Component, en Next.js gooide dat op elke paginalading om, zichtbaar in de Vercel-runtimelogs als
"Functions cannot be passed directly to Client Components". Beide tabellen (Zichtbaarheid én
Concurrenten, alleen de eerste was opgevallen) crashten hierdoor. Opgelost door de kolomdefinities
in twee nieuwe Client Components te zetten die zelf pure data binnenkrijgen:
`components/analytics-cluster-table.tsx` en `components/analytics-ranking-table.tsx`. `page.tsx`
geeft nu alleen nog rijen en een `Map` door, nooit een functie, en `AnalyticsTable` zelf blijft
generiek. Tegen deze klasse fouten helpt geen typecheck of unittest: hij is pas zichtbaar bij een
echte render, en is nu wel bevestigd via de Vercel MCP-tools (`get_runtime_errors` op het
preview-deployment) in plaats van alleen aangenomen.

## Analytics-herontwerp, ronde 2 en 3: de inhoud per pagina (2 september 2026)

Op verzoek van de eigenaar meteen doorgebouwd na de reparatie hierboven: vrijwel de hele rest van
`docs/tasks/analytics-herontwerp.md`, ronde 2 en 3 samen. Zelfde patroon als bij de vorige ronde:
elke nieuwe interactieve tabel kreeg zijn eigen Client Component (`analytics-cluster-table.tsx`
is toen al vervangen door dat patroon overal door te trekken), zodat de RSC-fout hierboven zich
niet kon herhalen. Handmatig nagelopen: geen van de nieuwe Client Components krijgt een functie
als prop van een Server Component mee.

**Zichtbaarheid (Z1, Z2, Z4, Z8).** `components/cluster-visibility-grid.tsx` is één raster van
kleine grafiekjes, één per cluster, die zelf wisselt tussen staven-met-marge (onder de drie
metingen) en een lijn (vanaf drie): Z1 en Z2 vroegen apart om een hoofdgrafiek én een raster, maar
het plan legt zelf uit waarom een gecombineerde meerdere-lijnen-grafiek een kluwen wordt zodra er
meer dan een paar clusters zijn ("tien lijnen door elkaar is een kluwen"). Dit raster is dus het
hoofdbeeld én lost tegelijk op wat Z2 vroeg, in plaats van twee losse dingen te bouwen die elkaar
tegenspreken. Bij één cluster staat de eerstvolgende meetronde erbij (de eerste van de kalendermaand
ná de laatste meting, uit het echte cronritme in `app/api/cron/tracking/route.ts`, geen schatting).
Z4 is een berekende zin boven de tabel (zwakste cluster, hoeveel punten onder het sterkste). Z8 is
het detailpaneel (F4) met de gemeten vragen en de laatste drie metingen.

**Concurrenten (C4, C5, C6).** Eén nieuwe Client Component, `components/concurrenten-analyse.tsx`,
draagt de ranglijst, het bronnenlandschap én het detailpaneel samen, want C4 (een concurrent
aanwijzen kleurt de bronnenlijst) en C6 (het detailpaneel toont dezelfde bronnen) delen dezelfde
clientstate. `source_landscape` bleek al een `competitors`-kolom per bron te dragen; C5's kanslijst
matcht die namen tegen de al-geclassificeerde rijen uit `buildBrandRankings()` (niet tegen de ruwe
tekst, die staat vol productmerken als "Nefit" en "Vaillant" die geen concurrent zijn) en sorteert op
aanhaalfrequentie maal aantal bevestigde concurrenten. Tegen de productiedata van Gasservice Brabant
gecontroleerd: kemkens.nl komt uit op 78 aanhalingen over vier clusters, nul keer eigen aanwezigheid,
en wordt daarmee terecht de eerste kans.

**Zoekverkeer (V1 tot en met V8), de grootste herbouw.** De pagina meet nu alleen de pagina's die
ORBIT ENGINE publiceerde; de hele property staat nog, maar ingeklapt onderaan als vergelijking. Twee
nieuwe pure functies in `lib/search-console/metrics.ts`: `vergelijk()` kreeg een `vergelijkbaar`-vlag
(V5) die de kliks- en vertoningendelta op `null` zet zodra de vroegste dag die we hebben ná het begin
van het vorige venster ligt, want dan is "0 toen" een gat en geen meting, en zou elk verschil een
schijnstijging ter grootte van zichzelf zijn. Nieuwe tests bevestigen beide kanten: een venster dat
wél teruggaat blijft een echt verschil tonen. `components/pages-traffic-chart.tsx` vervangt de oude
`TrafficChart` (verwijderd, was alleen hier in gebruik): geen kalenderlijn van de hele website naast
losse zichtbaarheidsstippen meer, maar de klikken op onze eigen pagina's met een gestreepte
verticale lijn per publicatiedatum. `content_impact.verdict` (per publicatiestuk de laatste golf)
is de kolom "Effect op AI" in de nieuwe paginatabel; tegen productie geverifieerd op het ene
gepubliceerde stuk van Gasservice Brabant (`onderhoudscontract-cv-ketel`, verdict "gestegen",
content_piece_id klopt één-op-één). V8's detailpaneel toont het verloop sinds publicatie als
staafjes. V6's paginatype-filter verschijnt pas vanaf tien pagina's; bij minder dan tien
gepubliceerde pagina's (nu overal het geval) blijft hij dus terecht weg. V7's lege staat toont het
aantal pagina's in het contentplan, zonder verzonnen publicatiedatum.

**Reputatie (R1 tot en met R6).** De meetmodule zelf is niet aangeraakt, precies zoals het plan
vraagt. Vier nieuwe componenten dragen een ander deel van dezelfde, al opgeslagen data naar de
voorgrond: `reputation-criteria.tsx` (R1, de vier criteria als hoofdbeeld: gemiddelde plaats over
alle antwoorden per criterium, want er bleken meerdere `reputation_ranks`-rijen per criterium te
bestaan en één rij pakken zou de uitkomst aan toeval overlaten), `reputation-tone-distribution.tsx`
(R2, de zes toonlabels als gestapelde balk, met de oude meter nog beschikbaar maar ingeklapt als
secundair cijfer), `reputation-offerings.tsx` (R3, twaalf productregels als tabel met een
detailpaneel) en `reputation-evidence.tsx` (R5, de samenstelling van de bronnen per soort).

⚠️ **R4 is bewust anders ingevuld dan de letterlijke tekst.** Het plan vraagt de producttabel náást
een altijd-zichtbare bezwarenkolom die op een klik filtert. Dat is een tweede interactiepatroon naast
het detailpaneel dat elders op Analytics (Z8, C6, V8) al hetzelfde doet: klik een rij, lees rechts.
Twee patronen voor "meer lezen" op één pagina is precies de inconsistentie die dit hele plan
wegwerkt, dus toont het detailpaneel bij een product zowel de lof als de bezwaren.

**Wat bewust niet gebouwd is, en blijft openstaan.** F5 (de fase-optelling uit `tracking_runs`) en
daarmee het Fase-filter overal: die rekensom moet exact dezelfde gewogen score reproduceren als
`computeAggregates()` in `lib/pipeline/measure.ts` (share-by-run, entiteitclassificatie, winbaarheid)
en het plan vraagt zelf om een snelheidsmeting vooraf; F2 verbiedt bovendien een filter tonen dat nog
niets doet. Z6 (naamconsistentie als telling met kopieerknop) vraagt een structurele lijst met
naamvarianten, en `AuditCheck.finding` is voorgeformatteerde tekst zonder array; dat vraagt een
schemawijziging in `lib/audit/entity-consistency.ts` die alleen toekomstige audits raakt, niet de
al opgeslagen `checks_json`. Z7 (de clusternaam zonder merk-URL ervoor) stond al buiten scope
volgens het plan zelf ("dit raakt meer dan Analytics... het gaat als losse stap").

Verificatie tegen productie (Gasservice Brabant, Supabase-project GEO, conventie 10): de
periodeselectie, de gewogen score, de audit-groepen, de kans-lijst op Concurrenten, de
content_impact-koppeling op Zoekverkeer en de criteria-gemiddelden op Reputatie zijn stuk voor stuk
met echte rijen doorgerekend, niet alleen gebouwd. Vier controles groen: typecheck, 3670 unittests
(6 nieuw, de V5-toets in `lib/search-console/metrics.ts`), 576 ketentests, de productiebuild.

## 2 september 2026: het herstelplan na de audit, T1 tot en met T5

`docs/tasks/herstelplan-na-audit.md`. Vier taken af, nagerekend tegen productiedata en niet alleen
gebouwd (conventie 10); T2 (de beoordelingsset voor contentkwaliteit) ligt stil omdat deze sessie
geen netwerktoegang tot productie heeft (de agent-proxy weigert `*.supabase.co` en `*.vercel.app`)
en dus geen verse teksten kan laten schrijven.

**T1, de reparatielus.** De audit van 2 september dacht dat de lus bij pagina db76cb57 ten onrechte
na één ronde stopte (score 68) en bij 3517f87e drie rondes draaide terwijl de score daalde (78 → 68
→ 78 → 52). Nagerekend met de echte cijfers uit `ai_calls` en `content_pieces.critique_raw_json`:
de regel die dit had moeten voorkomen (`beterDanVorige`/`nietSlechter`) stond al sinds 06:35 uur
diezelfde ochtend op `main` (commit 20f6b5d), en verklaart het eerste geval precies. Het tweede geval
kan niet met die code hebben gedraaid; de test liep vermoedelijk tegen een productiedeploy van vóór
die ochtendreparatie. De regel is nu een pure, apart testbare functie
(`lib/pipeline/content-repair-decision.ts`) met beide gevallen als regressietest, zodat dit niet
opnieuw onopgemerkt kan wegzakken. Losstaand gerepareerd: de bibliotheektelling en de
publiceerherinnering telden een pagina met `needs_review = true` nog mee als "klaar" (niet aangeraakt
sinds 26 augustus), en `ai_calls.content_piece_id` (migratie 0088) maakt het budget per pagina nu een
query (gemeten: €0,26 per reparatieronde, dus al 60% boven de oude volledige herschrijving van
€0,162, niet goedkoper zoals het commentaar beweerde).

**T3, publiceren.** Geen domeincontrole (een adres als `https://www.example.com/` kreeg een 202),
geen gevolg aan een mislukte `verify_publication` (de pagina bleef `published` staan), en geen
blokkade op `needs_review`. Alle drie gedicht: `isOnBrandDomain()` in `lib/url.ts`, een terugval naar
"nog niet gepubliceerd" met de reden in `review_notes` zodra de controle een onbereikbare pagina of
ontbrekende tekst vindt, en een 409 bij het publiceren van een pagina die nog nagekeken moet worden.

**T4, de kostenpoort.** Tussen 27 en 30 augustus stonden vijf van de zeven betaalde handelingen open
voor de klant zelf; op productie kon een ingelogde klant zelf een merk aanmaken en een cluster
starten. De eigenaar heeft dat op 2 september teruggedraaid: alle zeven staan weer op slot
(`lib/cost-rules.ts`), de knoppen blijven zichtbaar en klikbaar (bevestigd: geen enkel scherm
gebruikt `staff` om ze te verbergen), en `COST_DENIED` noemt overal de customer success manager bij
Outer Orbit in plaats van "je consultant".

**T5, de plafonds.** Het accountplafond was een maandplafond van €50; de eigenaar wil €20 per klant
per dag en €50 over alle klanten samen per dag (was €150). Nieuwe kolom `accounts.daily_budget_eur`
(migratie 0089, de oude `monthly_budget_eur` blijft ongebruikt staan, conventie 4: niemand had hem
ingevuld). Nagerekend: een drukke klantdag (onboarding ~$0,25 + meting ~$0,85 + twee pagina's
à ~$0,51) komt met ~$2,45 niet in de buurt van €20; het totaalplafond van €50 vangt nog twee klanten
die op dezelfde dag hun eigen plafond volmaken, maar geen derde.

Vier controles groen na elke taak: typecheck, `test:unit`, `test:chain`, de productiebuild.

## 2 september 2026: het herstelplan na de audit, T8, de twaalf kleinere correcties

Elf van de twaalf punten uit `docs/tasks/herstelplan-na-audit.md` T8 zijn gebouwd, nagerekend met een
eigen test in `test-unit.ts` of `test-chain.ts`, dan gecommit; het twaalfde (T8.12, uitgelekte
wachtwoorden blokkeren) kan niet vanuit deze sessie: dat staat alleen in het Supabase-dashboard of
achter een persoonlijk toegangstoken voor de Management API, en vereist bovendien minimaal het
Pro-plan. Blijft open als eigen actie voor de eigenaar.

Kort per punt: dubbele vragen bij een funnelfase-overgang worden nu opgeruimd
(`lib/pipeline/prompt-dedupe.ts`, de oudste blijft staan); een vraag wijzigen of verwijderen terwijl
de meting al loopt geeft een 409 in plaats van een cijfer dat niet meer bij de vraag past;
concurrentnamen ontdubbelen nu ook op "Naam in Plaats" tegenover "Naam" (`competitor-dedupe.ts`); het
menu in een gecrawlde pagina bleek al eerder gerepareerd, geen wijziging nodig; `htmlToText` decodeert
nu ook `&hellip;`, aanhalingstekens en numerieke entiteiten in plaats van zes vaste namen; een merk
zonder gecrawlde pagina's krijgt een waarschuwing op het overzicht in plaats van stilzwijgend als
"klaar" te tellen; gedachtestreepjes in lopende tekst (`docs/schrijfstijl.md` §10) worden nu ook na
`redactCompetitors()` en in de contentpijplijn zelf weggehaald, niet alleen beloofd in de
schrijfprompt; een reparatieverzoek verwijderde nooit `raw_json` en de sectieverwijzingen uit een
factverzoek voordat het naar de browser ging (`lib/fact-request-public.ts`, twee plekken: de
API-route en `werk.tsx`); een pagina-plan dat minder pagina's oplevert dan gevraagd (te weinig
onderwerpen over) zei dat nergens, nu staat het tekort in de melding; en inloggen plus het
verzilveren van een uitnodiging waren onbegrensd, nu begrensd per e-mailadres en per IP-adres
(migratie 0090, `rate_limits` bestond al op productie buiten een migratie om).

**Eén regressie, gevonden vóór het commit door de vier controles zelf.** De nieuwe
`stripProseDashes()` (voor het gedachtestreepje-punt hierboven) verving alle witruimte van twee
tekens of meer door één spatie, en `\s` in JavaScript matcht ook een regeleinde. Toegepast op een
hele pagina in plaats van op één zin veegde dat de lege regels tussen alinea's en koppen weg, waarna
`splitSections()` geen `### kop` meer herkende (die moet aan het begin van een regel staan) en een
bestaande, al langer werkende ketentest ("de genoemde sectie is herschreven") op deze branch begon te
falen terwijl hij op `main` nog groen was. Bevestigd door de wijziging tijdelijk terug te draaien
(`git stash`) en de test opnieuw te draaien: zonder de wijziging 598 geslaagd/0 mislukt, mét de fout
1 mislukt. Gerepareerd door alleen spatie en tab te collabsen, nooit een regeleinde
(`lib/pipeline/dash-guard.ts`). Dit is precies waarom conventie 10 (nagerekend, niet alleen gebouwd)
een reparatielus in de eigen werkwijze is en niet alleen een eis aan het product.

## 2 september 2026: het herstelplan na de audit, T7, de database leeggemaakt

**Het plan noemde zestien merken, het waren er zeventien**: er kwam na het schrijven van het plan nog
een testmerk bij ("AUDITTEST geweigerde site", 15:46 uur). Eerst een volledige telling gemaakt en aan
de eigenaar laten zien voordat er iets verwijderd is (onomkeerbaar, conventie in de werkwijze bij
zulke acties), met expliciet akkoord per account: het account van de eigenaar zelf
(`koopman.janwillem@gmail.com`) en de twee testaccounts (`e2e-consultant@orbit-test.nl`,
`e2e-klant@orbit-test.nl`) blijven bestaan met hun inlog, alleen de merken erin zijn weg;
`huyberts@example.com` had geen naam in het plan staan als "blijft staan" en is op verzoek van de
eigenaar volledig verwijderd, account én inlog.

Weg: 17 merken, 23 analyses, 839 metingen, 53 geschreven pagina's, 286 taken, 2270 betaalde
AI-aanroepen, 262 feitverzoeken, 22 rapporten, en de 51 restrijen in `_backup_20260729` die bij deze
merken hoorden (nu 0 over). Tandartspraktijk de Kroon, het echte bedrijf dat geen klant is en hier
nooit om gevraagd heeft, is mee verwijderd inclusief de vier verzonnen testantwoorden en de twee
ingeplande hermetingen van 16 en 30 september (die anders tegen een verwijderd merk waren aangelopen).

Gebruikt: de bestaande route `lib/deletion.ts` voor het account `huyberts@example.com`
(profielen, account en inlog in één stap, zoals de app het zelf ook zou doen); voor de drie te
behouden accounts een verwijdering op profielniveau, want `deleteAccount()` verwijdert het account
zelf en dat mocht daar juist niet. Dezelfde volgorde als de bestaande route: eerst de momentopnamen
in `_backup_20260729` opruimen, dan de merken (cascade neemt de rest mee), dan pas het account of de
inlog.

Nagerekend na afloop: 0 merken over, 0 restrijen in `_backup_20260729`, 0 taken die nog naar een
verwijderd merk wijzen, en precies de drie verwachte accounts met inlog. De schermen die een lege
database moeten laten zien (`/merk`, `/beheer`) zijn in de code nagelopen: beide hebben een expliciete
lege staat en geen optelling die op een lege lijst breekt. Niet in een browser getest, deze sessie
heeft geen netwerktoegang tot Vercel; dat is de ene stap uit het plan die nog met eigen ogen bevestigd
moet worden.

## 2 september 2026: het herstelplan na de audit, T6, het vangnet op de mention-classificatie geborgd

De controlequery uit T6 gaf na T7 op alle drie de tellingen 0: er was niets meer om te herbeoordelen,
want de elf en zes foutgemeten antwoorden uit de audit hoorden allemaal bij testmerken die net
verwijderd zijn. Geen enkele betaalde aanroep nodig geweest, precies zoals het plan voorzag.

Wat overbleef was de les uit het plan zelf: een reparatie aan de meting moet ook tegen wegvallen
beschermd zijn. Het vangnet zelf (`m.mentioned && candidateNames.some(...)` in
`lib/pipeline/measure.ts`) had geen enkele test, alleen de tekstcontrole eronder
(`textContainsName`) was al gedekt. Losgetrokken naar `mentionSurvivesTextGuard()` in
`lib/entities/normalize.ts` (puur, conventie 2) en getest op precies het scenario uit de audit: het
model zegt "genoemd" maar de naam staat niet in de tekst, moet toch niet genoemd tellen, en het
omgekeerde (model zegt "niet genoemd" terwijl de naam er wél staat) moet niet genoemd blijven. Een
latere refactor die `m.mentioned` weer rechtstreeks doorgeeft, laat deze test nu falen in plaats van
stil te verdwijnen.

---

## Een pagina met 91 punten kan onpubliceerbaar zijn (3 september 2026, migratie 0091)

**De opdracht.** Richt ORBIT ENGINE zo in dat een gegenereerde pagina kwalitatief vergelijkbaar is
met wat een goede copywriter voor déze klant zou schrijven, en zorg dat de app kan uitleggen wáárom
een pagina goed of onvoldoende is en wáár in de keten het misging. Nadrukkelijk geen losstaande
"AI content checker": het volledige advies en de analyse staan in
[`tasks/contentkwaliteit-framework.md`](tasks/contentkwaliteit-framework.md).

**Wat de meting liet zien.** De zeven pagina's die de nieuwe pijplijn op 1 en 2 september schreef,
eindstand uit `content_pieces`:

| | waarde |
|---|---|
| contractdekking | 86 tot 98 procent |
| bronherleidbaarheid | 28 tot 39 procent |
| GEO-score, over alle 43 pagina's | gemiddeld 97,4 |
| losse opmerkingen per pagina | 45 tot 96 |
| eindstand | alle zeven `ready` met "check nodig" |

Drie dingen tegelijk. De poort die volledigheid meet, meet woordoverlap met een deelvraag en kan
niet zien dat de sectie die er staat niets over dit bedrijf zegt. De GEO-score staat zo vaak vol dat
hij niets meer onderscheidt. En de app schreef zelf tientallen redenen op waarom een pagina niet af
was, en bood hem aan als af.

**De kern van de ingreep.** Score, zekerheid en blokkade zijn drie getallen geworden die niet
samengevoegd mogen worden. Een pagina met 91 punten en één kritieke claim zonder bewijs komt niet op
"klaar om te publiceren" te staan; een pagina met 74 punten en geen blokkade wel. Dat verschil was
in één boolean (`needs_review`) niet uit te drukken, en die boolean stond aan bij vier verschillende
situaties met vier verschillende gevolgen.

**Wat er verder staat.** Twaalf kwaliteitsdimensies, elk met een bron die hem kan vullen, en vier
profielen per contenttype die bepalen welke dimensies meetellen en hoe zwaar (gemeten: een FAQ haalt
0,7 procent bronherleidbaarheid en een landingspagina 77,1, dus één lat over allebei is per definitie
fout voor één van de twee). Eén type voor elke bevinding, met de sectie, het bewijs, de verwachting
en de ketenfase erin. Bewijsdekking die het belang van de sectie weegt in plaats van alleen te
tellen. Een vierde beoordelaar die als enige meet wat een copywriter onderscheidt, voor ongeveer
$0,004 per pagina naast de $0,071 van de schrijfaanroep. En een kwaliteitslab waarin het oordeel van
de app naast dat van een mens ligt.

**Twee dingen zijn tijdens het bouwen anders uitgepakt dan het plan beschreef.**

- **De inputpoort werd bijna een muur.** De eerste vorm van `poortGraad()` gaf bij een ongedekte
  kernsectie gewoon de kritieke dekking terug. Bij één kernsectie is dat 0 of 100, dus werd de poort
  een schakelaar: één sectie zonder feit hield de hele pagina tegen. De ketentest viel daarop om, en
  terecht. Het is een PLAFOND geworden: de graad zakt onder de 70 en de pagina komt in de
  waarschuwingsstand, met de kernsectie in de melding en de drie uitwegen intact.
- **De root cause koos de verkeerde oorzaak bij een gelijkspel.** Een pagina met één blokkade uit de
  kennis (een kernsectie zonder feit) en één uit het schrijven, met drie gewone schrijfbevindingen
  ernaast, kwam uit op "dit is een schrijfprobleem". Dat is de verkeerde conclusie met een dure
  staart: `reparatieHeeftZin()` leest de zwaarste oorzaak, dus de app zou drie reparatierondes
  betalen voor een pagina die geblokkeerd blijft tot de ondernemer zijn vraag beantwoordt. Bij een
  gelijk aantal blokkades wint nu de fase die een herschrijving NIET kan oplossen. Gemeten op de
  ronde van 1 september: die rondes kostten $0,78 van de $1,08 per pagina en brachten de kwaliteit
  van 78 naar 52.

**Wat er nog niet is.** De drempels rusten op zeven pagina's en zijn gedifferentieerd, niet geijkt.
Daarvoor zijn twintig menselijk beoordeelde pagina's nodig (`IJKING_MINIMUM` in
`lib/quality-benchmark.ts`), en die verzamelt het kwaliteitslab. Tot die tijd staat op het scherm
zelf wat er nog aan ontbreekt, in plaats van dat het cijfer een precisie suggereert die het niet
heeft. Conventie 10: gebouwd en op ketentests geverifieerd, nog niet tegen een echte klantronde
nagerekend.

Vier controles groen: typecheck, 4060 unittests, 625 ketentests, de productiebuild.

---

## Een verschoven F-nummer liet informatie uit de pagina verdwijnen (3 september 2026)

R1 uit de restlijst van het kwaliteitsraamwerk (`tasks/contentkwaliteit-framework.md` §10): de
claimdekking was gebouwd maar nergens aangesloten. Nagekeken met grep werd
`berekenClaimDekking()` alleen door `scripts/test-unit.ts` aangeroepen, dus hij beïnvloedde geen
enkele beslissing. Gevolg: een kernbewering die aan géén enkele contractsectie hing, glipte langs de
kwaliteitspoort. De claim-audit wíst dat hij onbewezen was; dat gegeven kwam alleen nooit ergens aan.

**Bij het aansluiten kwam een bug boven water die er al zat**, en die is erger dan het gat zelf.

Een F-nummer is een POSITIE en geen identiteit: "F3" betekent "het derde citeerbare feit op deze
kaart" (`numberFacts` in `factcard.ts`). De kaart staat gesorteerd op betrouwbaarheid met de
klantantwoorden vooraan (`SOURCE_ORDER`). Beantwoordt een klant dus één vraag, dan komt dat antwoord
op F1 te staan en schuift élk volgend nummer één op.

De claim-audit is bevroren op het moment van de briefing, dus vóór die antwoorden. `buildPlanBlock()`
zocht die bevroren nummers op tegen de HUIDIGE kaart. De citaatplicht in `isSupported()` ving de
verschuiving netjes op (het citaat staat niet in dat andere feit), maar de uitkomst was dan
"onbewezen", en het paginaplan zegt daarover letterlijk tegen de schrijver: **"GEEN BRON: laat deze
passage weg"**.

Het gedrag dat daaruit volgt is precies verkeerd om: de klant beantwoordt een vraag om zijn pagina
beter te maken, en juist door dat antwoord verdwijnt er informatie uit. Hoe meer hij aanlevert, hoe
meer er wegvalt.

**De oplossing is twee stappen in plaats van één** (`claimIsOnderbouwd()` in `evidence-weight.ts`):
eerst de strenge, positiegebonden controle zoals overal, en als die niets vindt de vraag of het
letterlijke citaat in één van de bruikbare feiten op de huidige kaart staat, ongeacht welk nummer
dat feit heeft. Losser dan `isSupported()`, en dat is hier precies goed: blokkeren mag alleen als er
nergens bewijs is, niet als het bewijs verhuisd is. Een feit met `allowed: false` telt nooit mee,
want een verbod onderbouwt niets.

Wat er verder bij kwam: elke kernbewering zonder bewijs is nu een blokkade met de bewering letterlijk
erin en met de bijbehorende vraag als aanbeveling, en de claimdekking weegt mee in de
bewijsdimensie. Een pagina waarvan alle secties een feit hebben maar de dragende bewering niet, zakt
daardoor ook in het cijfer en niet alleen in de blokkadelijst.

Vier controles groen: typecheck, 4071 unittests (11 nieuwe), 630 ketentests (5 nieuwe), de
productiebuild.

## 3 september 2026: het herstelplan na de audit, T9, de wachttijd, al opgelost vóór de audit

T9 vroeg uit te zoeken of contentgeneratie (`content_draft`/`content_revise`) net als de
reputatietaken meer dan één tegelijk mag draaien, met een meting vooraf en achteraf als bewijs. Bij
het nalopen bleek dat al gebouwd: sinds 1 september 14:27 uur (commit `0ab729c`, "De contentpijplijn:
een contract per item, een beoordelaarspanel en gerichte reparatie", ruim vóór deze audit) staan
`content_draft`, `content_revise` en `content_plan` in een nieuwe `PARALLEL_CONTENT_TYPES`
(`lib/jobs/types.ts`), en `lib/jobs/worker.ts` draait ze per drie tegelijk met de volle reservering
per groep (docs/tasks/contentpijplijn-herontwerp.md A10). Precies de richting die T9 vroeg, en al met
een eigen test (`scripts/test-unit.ts`).

Het cijfer uit de audit (2533 seconden gemiddeld wachten) is dus vermoedelijk het gemiddelde over
vooral taken van vóór die reparatie: de controlequery telt de hele geschiedenis. Een "ná"-meting met
dezelfde query kon deze sessie niet leveren: T7 heeft de taakgeschiedenis inmiddels leeggemaakt, en er
is sindsdien geen nieuwe productieronde geweest om te meten. Dat cijfer komt vanzelf zodra een klant
weer een pagina laat schrijven.

Eén kanttekening zonder wijziging: de toelichting bij `CONTENT_PARALLELISM = 3` rekent nog met "drie
beoordelaars" per pagina; sinds gisteren (migratie 0091, het kwaliteitsraamwerk) zijn dat er vier
(`runPanel()` in `lib/pipeline/content-panel.ts`). De rekensom komt toevallig nog steeds op hetzelfde
maximum uit (de vier beoordelaars draaien gelijktijdig ná het schrijven, nooit ermee samen, dus het
echte piekgebruik blijft drie pagina's × vier beoordelaars), maar de tekst zelf is achterhaald. Niet
aangepast: dat bestand hoort niet bij dit herstelplan en is gisteren door een andere sessie
opgeleverd.

Met T9 is het herstelplan na de audit van 2 september 2026 klaar op T2 na (de beoordelingsset voor
contentkwaliteit, stilliggend zolang deze sessie geen netwerktoegang tot Supabase/Vercel heeft).

## 3 september 2026: T2 geschrapt, het herstelplan na de audit is af

De eigenaar heeft T2 (de beoordelingsset voor contentkwaliteit, `eval:content`) geschrapt: dit wordt
niet meer uitgevoerd. Reden niet toegelicht in deze sessie; de meetlat voor schrijfkwaliteit
waarnaar T2 zocht blijft dus voorlopig ontbreken, en promptwijzigingen aan de schrijfstap blijven
zonder eigen evaluatieset (zie ook `tasks/contentkwaliteit-framework.md` §T9, die naar dit punt
verwees als "herstelplan T2").

Met T1, T3 t/m T9 gebouwd en T2 geschrapt heeft het herstelplan niets meer openstaan.
`docs/tasks/herstelplan-na-audit.md` is verwijderd; de tabel bovenaan dit logboek wijst terug naar de
negen alinea's hierboven. Code-commentaar dat naar "herstelplan na audit" verwijst (tientallen
plekken, T1 t/m T9) blijft ongewijzigd staan: dat draagt het waarom van de code, niet het bestaan van
het plandocument.

## 3 september 2026: een glaslaag over de lichte stand, vier tokens diep

De eigenaar vroeg om een zeer subtiele glas- of materiaalbehandeling van de bestaande vormgeving,
uitdrukkelijk geen herontwerp, en uitdrukkelijk alleen in de lichte stand.

**Dat botst met §8 regel 2 ("plat, niet gloeiend"), en die botsing is met open ogen opgelost.** Het
systeem hier is bewust vlak: rand en vlak dragen de hiërarchie, er is één schaduw en die is voor wat
zweeft. Een glaslaag hoort daar niet vanzelf in thuis. Wat er nu ligt kiest daarom voor de ene helft
van glas die géén tweede schaduwstand nodig heeft: de **doorschijnendheid**. Een kaart laat 28% van
de grond eronder door, en op de werkruimte is dat het lichtgrijs met de stippen van
`.workspace-canvas` (28 augustus 2026). De gelaagdheid komt dus uit wat er dóórheen schemert en niet
uit een halo eromheen. Het enige nieuwe schaduwtje is één pixel op 3% inkt, en dat staat in een eigen
token zodat het met één regel weer nul kan worden.

**Vier tokens, geen losse waarden.** `--glass-surface` (0,72 wit), `--glass-surface-strong` (0,86,
voor wat écht boven de pagina hangt), `--glass-filter` (`blur(12px) saturate(1.06)`) en
`--glass-shadow`. Ze staan alle vier in het lichte blok van `app/globals.css` en worden in **allebei**
de donkere blokken teruggezet naar het opake origineel: `--glass-surface: var(--bg-surface)` en
`--glass-filter: none`. Dat is de reden dat de donkere stand hier niets van merkt, en het is
nagemeten en niet aangenomen (zie hieronder).

**Waar het glas wél zit, en waar bewust niet.** Wél: `.card`, `.modal-panel`, `.toast-card` en de
nieuwe `.menu-surface`. Die laatste vervangt de vier losse Tailwind-klassen waarmee de merkkiezer,
het accountmenu, `InfoHint`, het clustermenu en het plan-menu elk hun eigen zwevende vlak
nabouwden: vijf kopieën van dezelfde keuze zijn vijf plekken die uit elkaar gaan lopen. Niet: de
zijbalk, de knoppen, de velden, de chips, de tabelcellen en de voortgangsbalken. Die blijven opaak,
en dat is geen vergetelheid maar het contrast dat de hiërarchie draagt: als élk vlak glas is, zegt
glas niets meer. Dezelfde redenering als bij de iconen in de zijbalk (§6b.3 regel 4) en bij de
kleuren (§8 regel 1). De randen blijven een echte tint en worden niet doorschijnend, om de reden die
al in §2.1 staat: doorschijnend zwart wordt vuil zodra het op een gekleurd vlak ligt, en
`.card-accent` legt daar juist een getinte rand overheen.

**Drie plekken waar het glas eraf gaat**, alle drie door de tokens terug te zetten in plaats van de
regels te overschrijven: geen ondersteuning voor `backdrop-filter`, `prefers-reduced-transparency:
reduce` (doorschijnende vlakken zijn voor sommige mensen letterlijk moeilijker te lezen), en
schermen smaller dan 640 pixels, waar kaarten onder elkaar op een vlakke grond liggen en er dus
niets te zien is voor de rekentijd die de vervaging kost. Op papier gaat het er ook af.

**Nagemeten in plaats van aangenomen** (regel 10 van `CLAUDE.md`). De ingelogde schermen zijn zonder
Supabase-inlog niet te fotograferen, dus is er een harnas gebouwd dat vier schermen nabouwt uit de
echte componentmarkup en de échte `app/globals.css` met Tailwind compileert. Daarmee zijn beide
standen vóór en ná naast elkaar gezet. Uitkomst voor donker: van de acht vergelijkingen (vier
schermen × de eigen keuze en de systeemvoorkeur) zijn er zeven byte-identiek. De achtste, de dialoog
via de eigen keuze, verschilt op **48 van de 1.296.000 pixels met een grootste kanaalafwijking van
1 op 255**: dat is de afronding die ontstaat doordat een `backdrop-filter`-regel, ook met waarde
`none`, het paneel op een eigen tekenlaag zet. Onzichtbaar, maar het staat hier omdat "byte-identiek"
en "bijna byte-identiek" niet hetzelfde zijn.

**Wat er precies veranderde, en wat er stond.** Deze tabel is het terugkijkpunt: links de staat
vóór 3 september 2026, rechts wat er nu staat. Alles wat er niet in staat is ongewijzigd, en dat is
verreweg het meeste.

| Onderdeel | Was | Is nu |
|---|---|---|
| Vulling van `.card` | `--bg-surface`, dus volledig dekkend wit | `--glass-surface` (wit op 0,72) in licht, `--bg-surface` in donker |
| Vervaging achter `.card` | geen | `blur(12px) saturate(1.06)` in licht, `none` in donker |
| Schaduw van `.card` | geen, de kaart was plat | `--glass-shadow`, één pixel op 3% inkt, in licht; `none` in donker |
| Vulling van `.modal-panel` | `--bg-surface` | `--glass-surface-strong` (0,86) plus vervaging, in licht |
| Vulling van `.toast-card` | `--bg-surface` | idem |
| De vijf zwevende menu's | elk hun eigen `bg-[var(--bg-surface)]` in de component: `brand-switcher`, `profile-menu`, `info-hint`, `cluster-kaart`, `plan-view` | één gedeelde klasse `.menu-surface` in `globals.css` |
| Tokens in het lichte blok | 116 | 120: `--glass-surface`, `--glass-surface-strong`, `--glass-filter`, `--glass-shadow` |
| Dezelfde vier in beide donkere blokken | bestonden niet | wijzen terug naar het opake origineel, dus donker tekent hetzelfde als hiervoor |
| Hover op `.card-interactive` | `--shadow-overlay` | ongewijzigd, die wint van de glaspixel |
| Randen, radius, padding, typografie, kleuren, zijbalk, knoppen, velden, chips, tabellen, voortgangsbalken | | **alle ongewijzigd** |

**Goedgekeurd op 3 september 2026.** De eigenaar heeft de vergelijkingsbeelden bekeken, het effect
goed bevonden zonder wijzigingen, en opdracht gegeven om naar `main` samen te voegen. Er is dus geen
tweede ronde geweest: wat hierboven staat is wat er live staat. Mocht het effect later toch te sterk
of te zwak blijken, dan is het vier tokens in `app/globals.css` en geen enkel component.

## 3 september 2026: elke as zegt wat hij toont, en de lijnen zijn vloeiend

Twee wensen van de eigenaar op dezelfde plek: laat in elke grafiek zien wat er op de assen staat, in
duidelijke taal, en maak de lijnen rond in plaats van hoekig.

**De assen.** `TrendChart` en `PagesTrafficChart` dragen nu allebei een zin bij de verticale en de
horizontale as. Ze staan horizontaal boven respectievelijk onder de as en niet gekanteld langs de
zijkant, want een gedraaide regel leest slechter en boven de as is ruimte genoeg. De volledige
tekst per as staat in `designsystem.md` §4.1.

Eén keuze daarin is de moeite van het vastleggen waard: **de y-as van `TrendChart` noemt geen
percentage.** Dat was de eerste ingeving, en het klopt niet. Het leidende getal daar is de gewogen
zichtbaarheidsscore uit `lib/pipeline/trend.ts` en niet het rauwe aandeel vragen waarin het merk
voorkwam; "68% van de vragen" zou dus een rekensom beloven die er niet onder ligt. Er staat nu
"Zichtbaarheid: 0 is nooit genoemd, 100 is altijd". Dat is regel 3 van `CLAUDE.md` op een as: liever
een grens benoemen dan een precisie suggereren die er niet is.

De `Sparkline` krijgt er geen. Die is 96 bij 24 pixels, heeft per ontwerp geen as, en zijn eigen
toelichting legt al uit waarom dat zo is. Wat hij voorstelt staat in de kop van zijn kaartje en in
het getal ernaast.

Er is ook nergens een derde as. De vraag noemde er een; alle grafieken hier zijn vlak. Waar een
derde gegeven meespeelt is dat een aparte vorm en geen diepte: de kleur van een lijn is de naam van
het merk, de lichte band om de eigen lijn is de meetonzekerheid.

**De ronding, en waarom hij een eigen module met elf tests heeft.** De drie lijnen liepen via losse
stukjes code in drie componenten. Ze lopen nu alle drie door `vloeiendPad()` in
`lib/chart-curve.ts`, één pure module, conform conventie 2.

Het echte punt zit in wélke ronding. De gebruikelijke keuze is een Catmull-Rom-spline, en die
**schiet door**. Nagerekend op de reeks 40, 95, 90, 92: die spline klimt tot **97,8** terwijl de
hoogste meting 95 is. Op een schaal van 0 tot 100 tekent dat een zichtbaarheid die niet bestaat, en
tussen twee gelijke metingen legt hij een kuiltje dat een daling suggereert die er niet was. Een
mooiere lijn die een verkeerd getal laat zien is precies wat regel 3 verbiedt.

De monotone variant (Fritsch en Carlson) knijpt de raaklijn in elk punt af zodat de bocht altijd
tussen de twee metingen blijft die hij verbindt, en zodat een stijgend stuk nergens daalt. Elf
controles in `scripts/test-unit.ts` bewaken dat, en ze doen dat door de kromme in veertig stapjes uit
te rekenen en naar de uiterste waarden te kijken: alleen de stuurpunten controleren zegt niets, want
die liggen per definitie buiten de kromme. Met het oog is dit niet te controleren, een bult van twee
pixels zie je niet.

**Wat de ronding niet oplost, en dat blijft staan:** ook een monotone kromme suggereert dat er
tússen twee metingen iets bekend is, en dat is niet zo. De grafiek toont de metingen, de bocht
ertussen is vormgeving. Daarom blijven de meetpunten als stip zichtbaar en blijft de tabel met de
echte cijfers onder `TrendChart` staan.

**Wat er precies veranderde, en wat er stond.**

| Onderdeel | Was | Is nu |
|---|---|---|
| Verticale as `TrendChart` | alleen de cijfers 0, 25, 50, 75 en 100 langs de as | daarboven "Zichtbaarheid: 0 is nooit genoemd, 100 is altijd" |
| Horizontale as `TrendChart` | alleen de datums per meting | daaronder "Wanneer er gemeten is" |
| Ruimte in `TrendChart` | `top: 16, bottom: 34` | `top: 32, bottom: 48`, voor die twee regels |
| Verticale as `PagesTrafficChart` | alleen het hoogste aantal klikken | daarboven "Aantal klikken per dag" |
| Horizontale as `PagesTrafficChart` | alleen de eerste en de laatste datum | daaronder "Dag" |
| Ruimte in `PagesTrafficChart` | `top: 16, bottom: 30` | `top: 32, bottom: 46` |
| `aria-label` van beide grafieken | noemde de assen niet | noemt ze allebei, voor wie voorleest |
| Aslabel op `Sparkline` | geen | **bewust nog steeds geen**, zie hierboven |
| Lijn in `TrendChart` | `M`/`L`, rechte stukken tussen de punten | `vloeiendPad()`, monotone Bézier |
| Onzekerheidsband | rechte stukken heen en terug | `vloeiendPad()` heen, `vloeiendPadTerug()` terug |
| Lijn in `PagesTrafficChart` | `<polyline>` met rechte stukken | `<path>` met `vloeiendPad()` |
| Lijn in `Sparkline` | `<polyline>` met rechte stukken | `<path>` met `vloeiendPad()` |
| Waar de rondingsregel woont | drie keer los in drie componenten | één keer in `lib/chart-curve.ts` |
| Controles in `test-unit.ts` | 4076 | 4087 |
| Kleuren, lijndiktes, legenda, publicatiestrepen, hover, de tabel onder de grafiek | | **alle ongewijzigd** |

**Nagemeten** met dezelfde methode als de glaslaag, maar een stap beter: de screenshots hieronder
zijn niet meer nagebouwd. `renderToStaticMarkup` rendert de échte componenten met verzonnen data
naar HTML, en die HTML gaat door de echte `app/globals.css`. Wat op het beeld staat is dus letterlijk
`TrendChart`, `PagesTrafficChart` en `ClusterVisibilityGrid` zoals de klant ze krijgt.
## 3 september 2026: een kop is geen zin, en dat blokkeerde twaalf van de twaalf pagina's

De benchmarkronde van twee klanten liep helemaal door: twee merken, vier clusters, 119 meetvragen,
twaalf geschreven pagina's, $10,97. En alle twaalf kwamen uit de kwaliteitspoort met `block`.

Een poort die honderd procent tegenhoudt zegt niets meer. Erger: hij had er zestien betaalde
reparatierondes op laten draaien tegen bevindingen die geen enkele herschrijving kon oplossen.

Van de 144 blokkerende bevindingen kwamen er 123 uit `bronherleidbaarheid`, en daarvan waren er
aantoonbaar 30 helemaal geen zin. Twee gaten in `lib/pipeline/sentences.ts`, allebei nagespeeld met
de echte functies op tekst uit de ronde:

- `stripMarkdown` haalde de hekjes van een kop weg maar liet geen zinseinde achter. Een kop eindigt
  niet op een punt, dus "## Snel hulp bij daklekkage in Zutphen" plus de alinea eronder werd één
  "zin". Die bevatte de merknaam, gold dus als bewering, en kon per definitie niet onderbouwd
  worden. 27 gevallen.
- `stripMarkdown` haalde "1. " alleen weg aan het begin van een regel. Zette het model de opsomming
  achter een dubbele punt op dezelfde regel, dan bleef het cijfer staan en zag `splitSentences` daar
  een zinseinde. Elk lijstitem werd een fragment dat eindigde op het cijfer van het vólgende item.
  3 gevallen.

30 is de ondergrens en niet het aantal: `quality-collect.ts` neemt per ronde maar de eerste vijf
ongetagde zinnen mee, en de meeste rondes zaten met vier of vijf tegen die grens aan.

De ontwerpkeuze eronder blijft staan en is juist: vals-positieven zijn goedkoper dan vals-negatieven
(`claim-extract.ts`, na de twee gemiste fabricages van 31 juli). Dit was iets anders. Niet de regel
was te streng, de invoer van die regel was stuk.

Bij het repareren kwam er nog iets boven water. De toelichting van `sentences.ts` beloofde dat drie
controles op dezelfde manier knippen. `geo-check.ts` bestaat niet, en `content-gate.ts` en
`validate-claims.ts` hebben elk hun eigen kopie. De fout zat dus in twee van de drie tegelijk, en
niets dwong af dat ze gelijk bleven. Een "één plek"-belofte in commentaar is geen garantie; alleen
een import is dat.

**Wat dit kost als je het niet doet.** Twaalf pagina's maal ongeveer $0,14 aan reparatierondes is
ruim anderhalve dollar weggegooid per ronde, en de klant ziet twaalf keer "nog niet klaar" zonder
dat er iets aan te doen valt. Dat is precies de situatie waarin iemand de poort uitzet, en dan is de
bescherming van 31 juli ook weg.

**Wat dit zegt over de werkwijze.** Deze fout was met nadenken niet te vinden. Hij kwam eruit door
conventie 10 letterlijk te nemen: de ronde echt draaien, op echte teksten, en dan naar de uitkomst
kijken in plaats van naar de bedoeling.

**Nagerekend wat de reparatie oplost, en dat is een kwart.** Van de 123 blokkerende bevindingen zijn
er 27 een kop die vastgeplakt zat en 4 een fragment van een opsomming. Die 31 zijn weg. De andere 92
zien eruit als hele, normale zinnen, en die blijven dus blokkeren. De twaalf pagina's worden door
deze reparatie niet groen.

Van die 92 zijn er 32 een oproep tot actie of een verwijzing naar het contact: "Bel 030-2270437 of
stel eerst een vraag", "Neem contact op om de actuele beschikbaarheid te bespreken". Ze blokkeren
omdat `GETAL` in `claim-extract.ts` elk cijfer als signaal neemt, dus een telefoonnummer maakt van
elke zin een bewering, en omdat `TOEZEGGINGEN` woorden bevat ("kun je", "beschikbaar", "binnen")
die net zo goed in een gewone instructie staan. Een oproep tot actie belooft niets over het bedrijf
en valt dus niet met een feit te onderbouwen. Elke pagina met een telefoonnummer eronder wordt zo
tegengehouden.

Dat is bewust niet in dezelfde beweging gerepareerd. Het raakt de bescherming die na de twee
fabricages van 31 juli is gebouwd, en die verdient een eigen toets tegen die tien pagina's in plaats
van een snelle aanpassing. Het staat als R0b in `docs/tasks/contentkwaliteit-framework.md` §10.

**R0b gerepareerd, en de eerste poging was fout.** Twee regels erbij in `claim-extract.ts`:
contactgegevens (telefoonnummer, e-mailadres, postcode) tellen niet meer als getal, en
toezeggingswoorden matchen aan het woordbegin in plaats van ergens midden in een woord.

Die tweede regel ging bij de eerste poging mis, en de bestaande test ving het: een woordgrens aan
BEIDE kanten eisen lijkt netter, maar de lijst bevat stammen. "reserveer" matcht dan niet meer op
"reserveert", en precies die zin ("Op valk.com reserveert u direct online") was de Van der
Valk-fabricage waar deze hele controle voor bestaat. Nederlandse vervoeging plakt er hooguit een
paar letters achter; een afleiding die de betekenis verandert is langer ("beschikbaarheid" is +4,
"mogelijkheden" +5). Vandaar drie letters speling.

Nagemeten op de teksten van deze ronde: van de 62 blokkerende bevindingen van MJB blijven er 37
over. Wat verdwijnt zijn oproepen tot actie en telefoonnummers; wat blijft staan is "MJB Dakservice
reageert binnen 24 uur op de aanvraag".

**De herkeuring is een eigen stap geworden (migratie 0092).** `keurPagina()` draaide alleen binnen
`content_draft` en `content_revise`, dus een oordeel bijstellen betekende de pagina opnieuw laten
schrijven: ongeveer $1,00 per pagina tegen ongeveer $0,013 voor de vier beoordelaars. Bijna honderd
keer zoveel voor iets wat de tekst niet eens verandert, en de vergelijking gaat er ook nog door
verloren omdat de tekst dan een andere is.

Drie regels eromheen, en ze zijn alle drie een rem. Een herkeuring kan geen reparatieronde
aftrappen, want dan kan één goedkope knop een dure lus starten. Hij overschrijft de geschiedenis
niet, want de rij die zegt dat een pagina ooit tegengehouden werd is precies waar de ijking op
rust. En de versiekeuze slaat herkeuringen over, want er is niets herschreven om tussen te kiezen.

Dit was ook los van R0 nodig: de klant kan zijn eigen tekst aanpassen, en dan bleef het oordeel
staan op de tekst van vóór die bewerking. Er stond "klaar voor publicatie" onder een tekst die
niemand beoordeeld had.

## 3 september 2026: een ongetagde, kloppende zin blokkeerde ook (R0c)

Met R0 en R0b op productie zijn de twaalf benchmarkpagina's opnieuw gekeurd via de nieuwe
herkeuring, zonder ze te herschrijven. 144 blokkerende bevindingen werden er 56, maar alle twaalf
pagina's stonden nog steeds op `block`. 54 van de 56 kwamen uit `bronherleidbaarheid`.

Een steekproef liet twee dingen zien. Ten eerste: zinnen die kloppen en waarvan het bewijs op de
kaart staat, blokkeerden alsnog. "MJB Dakservice kan bij een daklekkage in Zutphen binnen 24 uur ter
plaatse zijn" staat vrijwel letterlijk in `offline_proof`, maar het schrijvende model had de zin
niet op zijn eigen lijstje met beweringen gezet, en `detectedCoverage()` in `claim-extract.ts` keek
alleen naar dat lijstje. Dezelfde denkfout die R1 (eerder vandaag) al repareerde voor de
claim-audit, nu gevonden in een tweede, onafhankelijke controle. Ten tweede: instructiezinnen aan de
lezer ("Maak foto's van de mogelijke waterschade", "Controleer of de hoofdkraan beschikbaar is")
bevatten toezeggingswoorden zonder iets over het bedrijf te zeggen.

**De reparatie, allebei in `claim-extract.ts`.** Een ongetagde zin telt nu ook als gedekt wanneer
minstens 60% van de betekenisvolle woorden van een toegestaan, citeerbaar feit letterlijk in de zin
terugkomen, dezelfde `claimMatchesSentence()` en drempel als bij een getagde bewering, nu blind over
de hele kaart. Een feit van minder dan drie betekenisvolle woorden telt niet mee. Dit verzwakt de
fabricageherkenning niet: een verzonnen bewering heeft per definitie geen feit dat hem draagt, dus
blind zoeken vindt daar niets, precies nagerekend met de Van der Valk-fabricage als tegenproef.
Daarnaast telt een zin die begint met een kort, behoudend lijstje veiligheids-/stappenwerkwoorden
niet meer als toezegging, tenzij hij ook de merknaam of een getal bevat; woorden die een oproep tot
actie met een onbewezen claim kunnen inleiden ("bel", "vraag", "boek") staan er bewust niet op.

⚠️ Lost niet alles op: "Dit kun je zelf doen terwijl je wacht" begint niet met een werkwoord uit de
lijst en glipt er nog doorheen, want dat onderscheid vraagt begrip van de zin, niet van het eerste
woord. Vier controles groen: typecheck, 4112 unittests (9 nieuwe), 636 ketentests, build. Nog niet
herverifieerd tegen de echte twaalf pagina's op productie (conventie 10), dat is de volgende
herkeuring. Staat als R0c in `docs/tasks/contentkwaliteit-framework.md` §10.

## 3 september 2026: de keuring blokkeert op herleidbaarheid en laat de stem ongemoeid

Na R0, R0b en R0c blokkeren nog steeds alle twaalf benchmarkpagina's. Om te weten of dat aan de
keuring ligt of aan de tekst, is `content-reviews/` (de twaalf pagina's, blanco, zonder ons eigen
oordeel erbij) beoordeeld in de rol van copywriter. Niet door een mens: door hetzelfde soort model
dat de pagina's schreef. Die beoordelingen staan daarom apart in `content-reviews/feedback/` en
bewust NIET in `content_quality_reviews`, want de ijking van het raamwerk wacht op twintig
MENSELIJK beoordeelde pagina's (`IJKING_MINIMUM`) en een AI die zijn eigen werk nakijkt is geen
meetlat. De keuze wat er verder mee gebeurt ligt bij de eigenaar, in
`docs/tasks/contentkwaliteit-copywriterronde.md`.

**Wat de tellingen laten zien**, over de twaalf geschreven pagina's samen, ongeveer 13.600 woorden.
Twee keer "wij" of "we", beide in een kop, nul keer in een zin, tegenover 164 keer de merknaam in de
derde persoon: op de eigen site van de klant spreekt het bedrijf nergens zelf. 95 keer "je" naast 81
keer "u", bij twee klanten die allebei beide vormen kregen, op één pagina binnen twee zinnen
omslaand: `describePronoun` bestaat sinds verbetering 11 maar schrijft alleen een promptregel als
`profiles.pronoun_preference` gevuld is, en dat was hier niet zo. Zes zinnen over ons eigen
werkproces die op de site van de klant terechtkwamen ("Controleer vóór publicatie ...", "De locaties
worden op deze pagina niet inhoudelijk van elkaar onderscheiden"), geen ervan gevonden door de elf
zoektermen van `checkSourceTalk`. En op vier pagina's een letterlijk klantantwoord dat tot een
procedurezin is geparafraseerd, waarbij telkens de motivering wegviel: "Doorwerken over houtrot heen
doen we niet, ook niet als de klant erom vraagt, want dan kunnen we onze garantie op het werk niet
waarmaken" werd "dan legt MJB Dakservice het werk stil, maakt foto's en meldt eerst de
herstelkosten".

**Het cijfer dat ertoe doet.** Naast deze beoordelingsronde gaf de vakmanschapsbeoordelaar op
dezelfde twaalf pagina's gemiddeld 71,9 voor specificiteit tegen 33,3 hier, 57,3 voor toon tegen
30,0, en 56,4 voor overtuiging tegen 36,7. Verschillen van 20 tot bijna 40 punten op precies de
dimensies waarvoor de vierde beoordelaar gebouwd is. Ondertussen scoren die vier dimensies bij alle
twaalf ruim voldoende en zit de blokkade volledig in feitelijkheid (8 tot 47). De keuring blokkeert
dus op herleidbaarheid en laat stem, durf en eigenheid door: het percentage herleidbare zinnen kan
naar 100 zonder dat één van deze pagina's beter wordt om te lezen. Welke van de twee beoordelaars
dichter bij de waarheid zit, is zonder mens niet vast te stellen, en daarmee zijn de twintig
menselijk beoordeelde pagina's niet langer een afronding maar de blokkerende stap. Zes
geprioriteerde verbetervoorstellen staan in het taakbestand; er is nog niets gebouwd.

## 3 september 2026: de echte copywriter corrigeert mij, en de beoordelaar kan niet rangschikken

De twaalf benchmarkpagina's zijn dezelfde dag nóg een keer beoordeeld, nu door een echte copywriter
(`content-reviews/feedback/copywriter-extern-3-september-2026.md`). Dat maakt drie oordelen over
dezelfde twaalf pagina's mogelijk: de vakmanschapsbeoordelaar uit de app, de AI-copywriterronde van
eerder vandaag, en een mens. Dat is de eerste keer dat er een menselijke meetlat ligt.

**Twee dingen kloppen niet aan wat ik eerder vandaag opschreef.** De vorige alinea zei dat de
vakmanschapsbeoordelaar 20 tot 39 punten te hoog scoorde. Omgerekend naar dezelfde schaal van 1 tot
5 geeft de copywriter gemiddeld 3,92 voor specificiteit, 2,92 voor menselijkheid en 2,58 voor
overtuigingskracht; de beoordelaar geeft 3,60 / 2,87 / 2,82 en de AI-ronde 1,67 / 1,50 / 1,83. De
beoordelaar zit dus op 0,05 tot 0,32 punt van de mens en de AI-ronde zat er 0,75 tot 2,25 naast, te
streng. Qua NIVEAU is de vierde beoordelaar goed geijkt.

**Wat hij wél mist is het onderscheid.** De rangcorrelatie van zijn twaalf oordelen met die van de
copywriter is +0,19; die van de AI-ronde is +0,70. De copywriter noemt als vier zwakste pagina's 2,
8, 1 en 4, de beoordelaar noemt 1, 12, 4 en 9. Pagina 8 (het gratis medisch consult) is voor de
copywriter gedeeld slechtste van de twaalf, "ABSOLUUT NIET, liever grotendeels opnieuw schrijven",
en voor de beoordelaar de op twee na beste. Dat is operationeel de erge helft: de score bepaalt per
pagina klaar, repareren of geblokkeerd, dus een beoordelaar die het gemiddelde goed schat maar
binnen een batch de slechtste pagina niet aanwijst, stuurt de reparatie naar de verkeerde tekst. De
ijking blijft dus nodig, maar om hem te leren onderscheiden en niet om de hoogte bij te stellen. Er
liggen nu twaalf menselijk beoordeelde pagina's van de twintig uit `IJKING_MINIMUM`.

**Het scherpste cijfer uit de menselijke beoordeling is er een dat wij zelf konden natellen.** Zijn
belangrijkste aanbeveling van drie is "schrijf vanuit de situatie van de lezer", en bij ACHT van de
twaalf pagina's stond in de opdracht letterlijk "Geen doelomschrijving vastgelegd" en "Er waren geen
specifiek gemeten vragen aan deze pagina gekoppeld", steeds allebei bij dezelfde acht. Zijn
belangrijkste punt faalt dus niet bij het schrijven maar bij de invoer: de schrijver kreeg bij twee
derde van de pagina's geen lezer en geen vraag mee. Verder nageteld naar aanleiding van zijn
patronen: 169 van de 228 koppen is een vraag (74 procent, op vier pagina's alle koppen), 11 van de
12 openingen begint bij het merk of bij de beschikbaarheid in plaats van bij de lezer, 120 slappe
formuleringen op 13.605 woorden (één per 113 woorden, waarvan "mogelijk" 43 keer en "hangt af van"
26 keer), en per klant staan dezelfde vijf tot zeven feiten op vijf of zes van de zes pagina's.

Het plan telt daarmee elf voorstellen in twee lagen, redactionele keuze en mechanische hygiëne,
elk met promptwijziging en deterministisch vangnet, in
`docs/tasks/contentkwaliteit-copywriterronde.md`. Er is nog niets gebouwd. Twee keuzes liggen bij de
eigenaar: de twaalf menselijke oordelen wel in `content_quality_reviews` zetten en de twaalf uit de
AI-ronde niet, en de volgorde van bouwen. De telrichting is nagerekend en klopt: alle vijf de maten
in `review-form.tsx` lopen van 1 (slechtst) naar 5 (beste), net als de cijfers van de copywriter, dus
die kunnen er ongewijzigd in. ⚠️ Wel vraagt het formulier bij `generic_ai_feel` naar eigenheid
("zegt iets wat je nergens anders leest") terwijl hij natuurlijkheid beoordeelde ("klinkt alsof een
goede copywriter het schreef"); verwant, niet hetzelfde, dus dat hoort in `notes` en de vraagstelling
van het formulier hoort bij de ijking gelijkgetrokken te worden met wat er gemeten wordt.

## 3 september 2026: het plan had geen eindstreep, en keurde alleen de schrijver

Bij het nalezen van het plan uit de copywriterronde vielen er drie gaten op, alle drie van het soort
dat je pas ziet als je het geheel overziet. Ze zijn toegevoegd, en het plan telt daarmee twaalf
voorstellen in drie lagen in plaats van elf in twee.

**Gat 1: alle voorstellen verbeterden het schrijven, geen ervan het keuren.** Dat is scheef, want de
keuring blokkeert op herleidbaarheid en stuurt de reparatie naar de verkeerde pagina: op deze twaalf
zou hij pagina 1 en 12 aanpakken terwijl de copywriter pagina 2 en 8 aanwijst, dus twee van de vier
verkeerd. Een pagina die onterecht "klaar" heet gaat naar de klant, en dat is niet minder erg dan een
slechte tekst. De ijking stond als losse zin onderaan en is nu voorstel V13, met de rangcorrelatie
(+0,19 vandaag, voorstel voor de norm +0,60) als het getal dat de app zelf hoort bij te houden. Nu
staat dat cijfer nergens, en juist daardoor kon dit onopgemerkt blijven.

**Gat 2: er was geen nulmeting en dus geen eindstreep.** Toegevoegd als §4: twaalf tellingen met hun
startwaarde en een voorgestelde norm (8 van 12 pagina's zonder aangewezen lezer naar 0, 74 procent
vraagkoppen naar hoogstens 50, 120 slappe formuleringen naar hoogstens 1 per 250 woorden, en zo
verder), plus de enige meting die zegt of de tekst echt beter is: dezelfde twaalf onderwerpen
opnieuw laten schrijven en opnieuw blanco voorleggen aan dezelfde copywriter. Zijn overtuigingskracht
van 2,6 is daarbij het cijfer dat telt, want dat is de laagste van de vijf en de enige waarvan een
klant het gevolg merkt. Kosten van die nameting: twaalf pagina's herschrijven komt met de
gedocumenteerde tarieven ($0,071 schrijven, $0,013 beoordelen, $0,139 per reparatieronde) bij twee
rondes op ongeveer $4,30 uit. De echte kostenpost is een dagdeel van de copywriter.

**Gat 3: V11 schond code-conventie 1 en dat stond er niet bij.** Het voorstel voor een herkenbaar
scenario in de opening is niet te tellen, dus het vangnet zou een cijfer van de
vakmanschapsbeoordelaar zijn, precies de beoordelaar die de pagina's niet uit elkaar kan houden. Dat
is een promptinstructie zonder controle. V11 gaat daarom als laatste, ná V13.

Daarbij staat nu ook expliciet wat dit plan NIET oplost, want dat hoort de eigenaar te weten voordat
er een dag werk in gaat. Het eindoordeel van de copywriter, "waarom zou deze lezer dit bedrijf
kiezen", blijft grotendeels open: V9 en V4 verplaatsen die keuze naar het model, en of een model van
twintig feiten de drie kan kiezen die vandaag tellen weten we pas als het gebouwd is. Alle twaalf
tellingen kunnen groen worden zonder dat die vraag beantwoord is. Verder blijven de FAQ-blokken
buiten schot (tien van de twaalf pagina's hebben er acht, sommige een woordelijke kopie van een
sectie erboven) en blijft de reparatiestap ongemoeid, terwijl die per sectie werkt en dat precies de
manier is om een tekst verder in losse antwoorden uiteen te laten vallen.

## 3 september 2026: V7, een pagina zonder lezer wordt niet meer geschreven

Het eerste voorstel uit de copywriterronde is gebouwd. De externe copywriter noemde "schrijf vanuit
de situatie van de lezer" zijn belangrijkste van drie punten, en bij ACHT van de twaalf beoordeelde
pagina's stond zowel "Geen doelomschrijving vastgelegd" als "Er waren geen specifiek gemeten vragen
aan deze pagina gekoppeld", steeds allebei bij dezelfde acht. Zijn hoofdpunt faalde dus niet bij het
schrijven maar bij de invoer.

**De nieuwe module** `lib/lezersopdracht.ts` (puur, conventie 2) bepaalt uit drie bronnen voor wie
een pagina is, in deze volgorde: de doelomschrijving van de aanbeveling (`klant`), anders de
zwaarste gemeten vraag omgezet naar "Iemand die aan een AI-assistent vraagt: ..." (`meting`), anders
niets (`geen`). Hij weigert waarden die ingevuld lijken maar niets zeggen ("onbekend", "-", "n.v.t.")
en labels van minder dan vier woorden, want "Daklekkage Apeldoorn" is een onderwerp en geen lezer.
Daarnaast telt hij of de opdracht een PERSOON noemt, met een gesloten lijst persoonswoorden. Dat
blokkeert niet: "Bekkenfysiotherapie in Utrecht bij urineverlies" is een echte doelomschrijving uit
de ronde van 3 september die wél door de poort komt maar geen persoon noemt, en dan vraagt de
schrijfprompt het model om er eerst zelf een lezer bij te bedenken.

**Het vangnet** zit in `inputpoort()`, vóór de dure schrijfaanroep: `heeftLezer: false` levert
"tegenhouden" op. Die staat bewust vóór de keuze voor een algemene pagina, want die keuze
beantwoordt een andere vraag (mag het zonder eigen cijfers) en ook een algemene uitleg heeft een
lezer nodig. En vóór de graad, want een pagina kan volledig onderbouwd zijn en nog steeds voor
niemand geschreven worden: van de twaalf pagina's haalden er elf de graad en misten er acht een
lezer. Geen muur: de melding noemt drie uitwegen, net als de ondergrens. Weglaten van het veld
verandert niets aan het oordeel (conventie 3).

**De prompts.** De schrijfprompt kreeg `lezersblok()` op de plek van het kale "Doel:"-veld, mét de
instructie om bij de situatie van de lezer te beginnen en weg te laten wat die persoon nu niet nodig
heeft. Het rapportmodel krijgt de vorm nu expliciet opgedragen: welk type persoon, welk probleem,
welke beslissing, met "een onderwerp is geen lezer" erbij en het verbod om er "onbekend" in te
zetten.

⚠️ **Dit houdt pagina's tegen die vandaag geschreven worden.** Op de ronde van 3 september waren dat
er acht van de twaalf. Dat is de bedoeling, en het is wel een gedragswijziging op levende data: een
ronde kan minder pagina's opleveren totdat het rapportmodel de doelomschrijving vult. Vier controles
groen: typecheck, 4140 unittests (28 nieuwe), 639 ketentests (3 nieuwe), build. Het ketenscenario
laat de terugval eind tot eind zien: dezelfde pagina zonder doelomschrijving komt er via zijn
gemeten vragen wél door, en zonder allebei niet.

## 3 september 2026: V2, de aanspreekvorm wordt nu altijd gekozen

`describePronoun` bestond sinds verbetering 11, maar schreef alleen een promptregel als
`profiles.pronoun_preference` gevuld was. Bij de twee klanten van de benchmarkronde was dat niet zo,
en het gevolg is geteld: over twaalf pagina's 95 keer "je" naast 81 keer "u", bij ALLEBEI de klanten
door elkaar. Op de contactpagina van Fysio Centrum Utrecht slaat het binnen twee zinnen om, van "kun
je rechtstreeks contact opnemen" naar "Wilt u meteen boeken", gevolgd door twintig keer "u".

**`kiesAanspreekvorm()`** in `tone-sliders.ts` levert nu altijd een vorm, uit vier bronnen in
volgorde: wat de klant zelf koos, anders de formaliteitsschuif als die op 1 of 3 staat (die labels
noemen de vorm letterlijk, stand 2 zegt er niets over), anders wat er op de site van de klant zelf
staat, anders "u". Die laatste standaard is een keuze en geen meting: een ongevraagd "je" leest op
een zakelijke site als te amicaal en andersom is het hooguit wat afstandelijk, en de twee klanten
van 3 september schrijven allebei overwegend "u" op hun eigen site. Bij een gelijkspel in de
bestaande tekst (minder dan twee keer zoveel, of minder dan drie vindplaatsen) telt die tekst niet
mee, want dan is een muntje opgooien eerlijker gepresenteerd als standaard.

**Het vangnet** is `checkAanspreekvorm()` in `content-gate.ts`, en die meet de body samen met de
vraag-en-antwoordblokken. Samen en niet apart, want de contactpagina tutoyeert in de opening en
vousvoyeert in het blok eronder, en los gemeten was elk deel op zichzelf consistent. Een gemengde
pagina levert een BLOKKERENDE bevinding op de dimensie toon, zwaarder dan de meeste redactionele
bevindingen: dit is geen smaak maar een fout die iedere corrector er in tien seconden uithaalt.
Nieuwe bevindingsbron `aanspreekvorm`, in de root-cause toegewezen aan de schrijffase, want het
profiel levert de vorm aan en wie hem niet volhoudt is de schrijver.

Vier controles groen: typecheck, 4160 unittests (20 nieuwe), 639 ketentests, build. De testtekst is
de echte opening van de contactpagina van 3 september, dus de controle slaat er vandaag op aan.

## 3 september 2026: V3, van nul naar elf gevonden werkproceszinnen

`checkSourceTalk` had elf zoektermen en vond op de twaalf benchmarkpagina's precies NUL zinnen,
terwijl er zes gevallen bekend waren waarin ons eigen werkproces de klantpagina in lekte. De lijst
is uitgebreid met vier families, elk met een eigen manier om het mis te laten gaan: een
redactie-instructie aan onszelf ("Controleer vóór publicatie ..."), een zin over onze eigen tekst
("De locaties worden op deze pagina niet inhoudelijk van elkaar onderscheiden"), een bezwaarsjabloon
dat niet omgezet is ("Dit beantwoordt het bezwaar: ..."), onze verificatiestatus als mededeling aan
de klant ("Hulp buiten deze tijden is niet bevestigd") en zelfrelativering over ons eigen bewijs
("Deze bedrijfsgegevens vervangen nooit de inspectie van uw specifieke dak").

**Nagerekend tegen dezelfde twaalf pagina's, 13.605 woorden: van 0 naar 11 gevonden zinnen, met nul
vals alarm.** Zes ervan staan op één spoedpagina, waarvan vier van de soort "is niet bevestigd". Dat
is de schrijver die opschrijft wat hij zelf niet zeker weet, op de pagina van iemand met water door
zijn plafond.

⚠️ Eén van de zes bekende gevallen wordt bewust NIET gevonden: "Bang dat u achteraf pas hoort wat
een reparatie kost?" op de renovatiepagina. Dat is een bezwaarsjabloon dat is blijven staan, maar
dezelfde formulering is als openingszin juist góed en precies wat de copywriter aanraadt (begin bij
wat de lezer voelt). Een zoekterm erop zetten zou goede copy bestraffen, en dat weegt zwaarder dan
dit ene geval. Het probleem daar is de plaatsing midden in een sectie, en dat is niet met een
woordenlijst te zien.

Vier controles groen: typecheck, 4177 unittests (17 nieuwe, waarvan zeven zinnen die hij moet vinden
en zeven die hij met rust moet laten), 639 ketentests, build.

## 3 september 2026: V5, wat de klant vroeg staat niet meer tussen wat hij vertelde

Vier van de zes FCU-pagina's kregen woordelijk mee: "Zet er geen adres bij, want we hebben twee
vestigingen (...) Verwijs voor de adressen naar de contactpagina." Twee van die vier zetten er toch
een adres bij, en de Leidsche Rijn-pagina zelfs twee keer.

**Waarom het misging.** Zo'n antwoord komt binnen als één feit op de feitenkaart, in de vorm
"vraag: antwoord", tussen de andere feiten. Het model leest daar een MEDEDELING waar een OPDRACHT
staat, en een mededeling mag je negeren als er iets beters te melden is. `taboo_phrases` en
`forbidden_topics` staan wél als gesloten verbod bovenaan de prompt, en die worden wel nageleefd.

**`lib/klantinstructies.ts`** (puur) haalt de opdrachtzinnen uit de feitentekst met een gesloten
lijst opdrachtwoorden, en zet ze in `instructieblok()` bovenaan de prompt, met de reden erbij dat de
ondernemer het zelf zo vroeg. Het onderscheid tussen een verbod en een opdracht komt uit de zin
zelf. Het antwoord hierboven levert er twee op, het telefoonnummer in dezelfde zin blijft een gewoon
feit, en een antwoord als "een gemiddelde noemen we liever niet, want het hangt af van wat we
aantreffen" blijft óók een feit: dat is geen instructie over de pagina maar informatie over het werk.

**Het vangnet** is `checkAdresinstructie()` in `content-gate.ts`, blokkerend, en het draait alleen
als de klant er expliciet om vroeg. Twee patronen naast elkaar, want geen van beide dekt alles: een
straatnaam met achtervoegsel plus huisnummer ("Pablo Picassostraat 216", "Moreelsehoek 2") en een
postcode ("7317BL"), zodat ook "Hommel 37" gevonden wordt. Bewust geen los patroon "hoofdletterwoord
gevolgd door een getal", want dat vindt ook "Apeldoorn 2026" en "Rc 6,0". Alle drie de adressen die
op 3 september ten onrechte op een pagina stonden, worden gevonden; op vijf gewone zinnen met
getallen uit dezelfde pagina's slaat hij niet aan.

Dit is de enige klantinstructie met een harde controle. De rest gaat als gesloten verbodslijst de
prompt in en heeft geen vangnet, en dat staat er expliciet bij: instructies automatisch herkennen is
lastig, en het algemene geval verdient eerst meer data. Vier controles groen: typecheck, 4196
unittests (19 nieuwe), 639 ketentests, build.

## 3 september 2026: V9 en V4, van feit naar argument en terug naar de woorden van de klant

De tweede aanbeveling van de externe copywriter: "Het probleem is niet dat de schrijver onvoldoende
informatie heeft. Het probleem is dat de informatie onvoldoende wordt omgezet in een overtuigend
argument." Zijn voorbeeld: "vaste ploeg van vier eigen dakdekkers" moet "u weet wie er op uw dak
komt" worden.

**Migratie 0093** voegt `content_pieces.proof_points_json` toe, additief met default `'[]'`. Per
gekozen feit één zin die zegt wat het voor de lezer betekent, met het F-nummer erbij. ⚠️ Dat is een
ANDERE vraag dan `claims_json`: die kolom bewijst dat een zin mág staan, deze bewijst dat een feit
IS OMGEZET. Op de twaalf pagina's liepen die twee het verst uiteen van alle maten, met een
bronherleidbaarheid van 23 tot 92 procent naast een overtuigingskracht van 2,6 van 5. Ze in één
kolom schuiven zou van "onderbouwd" en "overtuigend" één cijfer maken.

**`lib/pipeline/bewijspunten.ts`** rekent drie dingen na, geen ervan een smaakoordeel: zijn het er
minstens drie (onder de drie is er geen keuze gemaakt), bestaat het F-nummer, en staat de
betekeniszin ook echt in de tekst. Dat laatste is de kern: een model dat een mooie zin aanlevert en
hem niet opschrijft, heeft het werk niet gedaan. De overlapdrempel is 0,6, dezelfde als
`claimMatchesSentence()` en om dezelfde reden: een schrijver mag zijn eigen zin herformuleren, niet
vervangen. De bevinding valt op de dimensie OVERTUIGING en niet op bewijs, want de feiten stáán er.
Niet blokkerend: een pagina met te weinig bewijspunten is niet onwaar, alleen minder overtuigend.

**`lib/pipeline/klantcitaten.ts`** is de mechanische kant ervan (V4). Op vier pagina's werd een
letterlijk klantantwoord tot een procedurezin geparafraseerd waarbij de reden wegviel: "Doorwerken
over houtrot heen doen we niet, ook niet als de klant erom vraagt, want dan kunnen we onze garantie
op het werk niet waarmaken" werd "dan legt MJB Dakservice het werk stil, maakt foto's en meldt eerst
de herstelkosten". De module herkent antwoorden met een motivering ("want", "omdat", "daarom") van
minstens vijftien woorden, biedt ze apart aan als CITEERBAAR, en meet achteraf de woordoverlap. Eén
antwoord hoeft er maar te halen: een pagina die uit citaten bestaat is ook geen pagina. Drempel 0,4,
losser dan bij de bewijspunten omdat het daar om één zin gaat die er letterlijk hoort te staan en
hier om de vraag of er íets van is blijven hangen.

De vier antwoorden die op 3 september sneuvelden waren 19, 21, 24 en 31 woorden lang; daar komt de
grens van vijftien vandaan. Vier controles groen: typecheck, 4218 unittests (22 nieuwe), 641
ketentests (2 nieuwe, die de bewijspunten eind tot eind tot in de kolom volgen), build. Migratie
0093 staat op productie.

## 3 september 2026: V8, V1 en V10, de opening begint weer bij de lezer

Drie voorstellen in één ronde, want ze trekken aan hetzelfde touw: alle drie verschuiven ze iets aan
wat een AI-assistent uit de pagina oppakt. Los invoeren zou betekenen dat de ene de andere ongemerkt
onderuit haalt.

**De spanning die opgelost moest worden.** De copywriter, regel 1: "Begin niet met het bedrijf.
Begin met de situatie waarin de lezer zich bevindt." Elf van de twaalf openingen deden het
andersom. Tegelijk is precies die eerste alinea het blok dat een AI-assistent citeert, en daar hoort
de merknaam in. Die twee sluiten elkaar niet uit, maar wel als je ze allebei op dezelfde ZIN legt.
De regel is nu: **de eerste zin gaat over de lezer, de eerste ALINEA noemt het merk.** De controle
meet allebei, dus een opening die de merknaam helemaal uit de alinea gooit, is óók een bevinding.

**De wij-vorm is terug, begrensd.** Regel 5 van de systeemprompt ("noem het bedrijf bij naam in
plaats van 'wij'") stond er absoluut, en dat kostte de hele merkstem: 164 merkvermeldingen in de
derde persoon tegenover twee keer "wij", allebei in een kop. De reden achter de regel klopt nog
steeds, maar hij geldt nu voor de CITEERBARE zinnen (de eerste alinea en de eerste zin van elke
sectie) en niet voor élke zin. Daarbuiten schrijft de pagina in de wij-vorm, zoals een ondernemer op
zijn eigen site praat. Dezelfde begrenzing in `REPAIR_SYSTEM` regel 3, anders draait de
reparatieronde het terug. De controle slaat pas aan als het allebei mis is: nul wij-zinnen én meer
dan 1,5 merkvermeldingen per honderd woorden. Die grens is gekozen en niet gemeten; hij ligt ruim
onder de 1,2 van deze twaalf pagina's en laat een pagina van duizend woorden vijftien keer de naam
noemen, genoeg voor het openingsantwoord plus elke sectiestart.

**Van vragenlijst naar verhaal.** 169 van de 228 koppen was een vraag, 74 procent, en op vier
pagina's élke kop. `checkVraagkoppen` staat op hoogstens de helft, behalve bij een FAQ, waar vragen
juist het punt zijn, en slaat pas aan vanaf vier koppen: onder de vier is het geen vragenlijst maar
een korte pagina.

Alle drie de bevindingen zijn niet-blokkerend en vallen op de dimensie die ze raken: overtuiging
voor de opening, toon voor de merkstem, structuur voor de koppen. Vier controles groen: typecheck,
4239 unittests (21 nieuwe), 641 ketentests, build.

⚠️ Deze drie horen samen te worden nagemeten op citeerbaarheid, precies zoals het plan zegt. Dat kan
pas na een echte ronde.

## 3 september 2026: V6 en V12, de pagina geeft geen huiswerk meer en stuurt niemand weg

**De adviestoon, met een grens die eerst verkeerd stond.** Over de twaalf pagina's: 72 gebiedende
zinnen ("Vraag ...", "Controleer ...", "Laat ... vastleggen"), waarvan 23 op één pagina, plus 120
slappe formuleringen op 13.605 woorden. ⚠️ Mijn eerste grenzen (0,35 en 0,5 per honderd woorden)
sloegen aan op ELF van de twaalf pagina's, en een controle die overal afgaat is ruis: hij zou de
reparatie van elke pagina met dezelfde bevinding vullen. De grenzen liggen nu waar de uitschieters
beginnen. Gebiedende zinnen lopen van 0,19 tot 1,50 per honderd woorden met een mediaan rond 0,39;
boven 0,6 zitten er drie, waaronder de hoofdpagina over daklekkage met 1,50. Slappe formuleringen
lopen van 0,10 tot 1,12 met een mediaan rond 0,58; boven 0,8 zitten er twee, en dat zijn precies de
twee pagina's die de copywriter als te voorzichtig aanwees, waarvan hij er één "ABSOLUUT NIET" gaf.
Met 0,6 en 0,8 slaat de controle op vijf van de twaalf aan in plaats van op elf.

**Zelfondermijning heeft géén grens**, want één zin is er al één te veel. Op de site van MJB stond
een checklist om dakdekkers eerlijk te vergelijken, met de tip hem in twee plaatsen te gebruiken; op
twee FCU-pagina's stond dat de bezoeker de registratie van de eigen behandelaar moest natrekken, met
een link naar de beroepsvereniging erbij. Uitstekende consumentenvoorlichting, en de verkeerde
pagina ervoor. Dit is de enige blokkerende bevinding van deze twee voorstellen.

**V12, hetzelfde rijtje feiten op elke pagina.** `checkHerhaling()` staat in `similarity.ts`, naast
`similarity()` maar met een andere vraag: die meet of twee pagina's over hetzelfde GAAN, deze of ze
hetzelfde BEWIJS gebruiken. Twee pagina's mogen over verschillende onderwerpen gaan en toch allebei
met dezelfde zes feiten aankomen, en dan krijgen ze precies dezelfde stem. Gemeten per klant over
zes pagina's: bij MJB stonden de gratis inspectie, de 24 uur en het fotorapport op alle zes, bij FCU
vijf feiten op alle zes. De bevinding valt op originaliteit, is niet blokkerend, en de root cause
wijst naar de BRIEFING en niet naar het schrijven: de feitenkaart is per pagina hetzelfde, dus daar
zit de oorzaak.

Vier controles groen: typecheck, 4253 unittests (14 nieuwe), 641 ketentests, build.

## 3 september 2026: V13 en V11, de keuring wordt zelf gemeten

Het laatste voorstel, en het enige dat niet over schrijven gaat maar over keuren. Drie stappen, alle
drie gedaan.

**Stap 1: de twaalf menselijke oordelen staan in `content_quality_reviews`**, met
`benchmark_set = 'benchmark-3-september-2026'` en de cijfers van de externe copywriter ongewijzigd
overgenomen. De telrichting is nagerekend en klopt; in `notes` staat bij elke rij dat hij
"menselijk" als natuurlijkheid van de stem scoorde, met 5 als beste, want het formulier vraagt bij
dat veld naar eigenheid en dat is verwant maar niet hetzelfde. Daarmee staan er twaalf van de
twintig uit `IJKING_MINIMUM`.

**Stap 2: de ijking is nu een getal dat de app bijhoudt.** `berekenIjking()` in
`quality-benchmark.ts` (naast `vergelijkMetMens`, want één feit één eigenaar) levert twee dingen: het
verschil in NIVEAU en de rangcorrelatie voor de VOLGORDE. Nagerekend op productie over de twaalf
zojuist ingevoerde oordelen: **niveauverschil 0,14 punt en een correlatie van 0,29.** Het gemiddelde
klopt dus bijna precies, en de volgorde niet. Dat is de erge helft, want de score bepaalt per pagina
klaar, repareren of geblokkeerd: van de vier pagina's die de beoordelaar als zwakste aanwijst zijn er
twee de verkeerde, en de pagina die de copywriter gedeeld slechtste noemde ("absoluut niet
versturen") stond bij hem op de derde plaats van boven. Beide getallen staan nu op
`/beheer/kwaliteit`, met een zin die zegt wat het betekent. Dat dit vier weken onzichtbaar kon
blijven, kwam doordat het cijfer nergens stond.

Voor de vergelijking telt het GEMIDDELDE van de vijf menselijke maten en niet één ervan: de
copywriter scoorde ze los en ze liepen uiteen van 2,58 (overtuiging) tot 3,92 (specificiteit), dus
één maat eruit lichten zou de ijking laten afhangen van welke dimensie je toevallig kiest. De
rangcorrelatie werkt op rangen en niet op ruwe cijfers, want de twee schalen lopen niet gelijk (0
tot 100 tegenover 1 tot 5) en het gaat hier niet om de hoogte maar om de ordening. Onder vijf paren
levert hij `null`: dan zegt hij te weinig om op te sturen.

**Stap 3: de beoordelaar krijgt menselijke ijkpunten mee.** In `VAKMANSCHAP_SYSTEM` staan nu de
concrete voorbeelden uit de ronde van wat een mens laag vond en waarom (juridisch dichtgetimmerd,
huiswerk in plaats van antwoord, administratief waar het eenvoudig moest) en wat hij hoog vond (een
echte keuze helpen maken, de schaamte van de lezer benoemen). Invoertekst, dus vrijwel gratis.

**V11, als laatste en bewust half.** De beoordelaar scoort nu ook `herkenning`: begint de pagina bij
een situatie die de lezer herkent, of bij het bedrijf. ⚠️ Dat cijfer telt NOG NIET mee in het
profiel en bepaalt dus niets. Dit is het enige voorstel uit de copywriterronde dat niet te tellen
valt, dus het enige zonder deterministisch vangnet, en het zou code-conventie 1 schenden om er nu al
op te sturen. Het cijfer wordt verzameld zodat de ijking hem later naast een menselijk oordeel kan
leggen; pas dán mag hij meewegen. Meten voordat je stuurt, dezelfde volgorde als bij de drempels van
de inputpoort.

Vier controles groen: typecheck, 4267 unittests (14 nieuwe), 641 ketentests, build.

## 3 september 2026: de schrijfaanroep kost 3,6 keer meer dan de documentatie zei

Op de vraag waar de geraamde $4,30 voor de nameting uit bestond, bleek dat cijfer niet na te
rekenen. Het rustte op de tarieven uit `contentkwaliteit-framework.md` §6 ($0,071 per schrijfaanroep,
$0,139 per reparatieronde, $0,013 voor de vier beoordelaars), en die zijn overgenomen zonder te
controleren of ze nog gelden. Precies wat CLAUDE.md verbiedt: neem een cijfer uit documentatie nooit
zonder verificatie over.

**Opnieuw gemeten op `ai_calls`, over de twaalf pagina's van 3 september:**

| Stap | Aanroepen | Per aanroep | Totaal |
|---|---|---|---|
| Itemdossier | 12 | $0,0161 | $0,19 |
| Contract | 12 | $0,0064 | $0,08 |
| Schrijven (`content_draft`) | 12 | $0,2578 | $3,09 |
| Reparatierondes (`content_revise`) | 16 | $0,2078 | $3,33 |
| De vier beoordelaars samen | 208 | $0,0030 | $0,62 |
| Feiten atomiseren en bronanalyse | 80 | | $0,12 |
| **Totaal** | **328** | | **$7,43** |

Schrijven is dus 3,6 keer duurder dan gedocumenteerd en een reparatieronde 1,5 keer. De spreiding is
klein ($0,229 tot $0,349 per schrijfaanroep), dus dit is geen uitschieter maar het echte tarief.
Wat wél klopte is het cijfer voor de beoordelaars: ongeveer een cent per keuring, en dus nog steeds
verwaarloosbaar naast het schrijven. De conclusie van §6 dat caching en incrementele evaluatie
weinig opleveren blijft daarmee staan; alleen de absolute bedragen kloppen niet meer. Eén pagina
kost van dossier tot en met reparatie ongeveer $0,62 in plaats van $0,21.

De raming voor de nameting gaat daarmee van $4,30 naar ongeveer $7,50, met twee dingen die de andere
kant op werken. Omlaag: V7 houdt een pagina zonder aangewezen lezer tegen vóór de dure aanroep, en
op deze ronde waren dat er acht van de twaalf. Omhoog: de schrijfprompt is met vijf blokken
uitgebreid (lezersopdracht, bewijspunten, klantcitaten, adviestoon, klantinstructies), en dat zijn
invoertokens die elke aanroep meebetaalt. Hoeveel dat scheelt is niet te ramen zonder te draaien.

⚠️ Waar de oude $0,071 vandaan kwam is niet meer na te gaan: `ai_calls` bevat voor
`content_draft` en `content_revise` alleen nog rijen van 3 september. De meting van 2 september is er
dus niet meer om naast te leggen.

### 4 september 2026, de contenttier van Sol naar Terra

`MODELS.content` staat niet meer op `gpt-5.6-sol` ($5/$30 per miljoen tokens) maar op
`gpt-5.6-terra` ($2/$12). Dat is 2,5 keer goedkoper op zowel invoer als uitvoer, en het raakt de
twee duurste aanroepen van de hele app plus de profielsynthese achter `SYNTHESIS_PREMIUM`.

**Wat het scheelt.** Gerekend op de gemeten tokenaantallen van de vorige alinea, bij gelijkblijvend
gebruik:

| | Op Sol | Op Terra |
|---|---|---|
| Eén schrijfaanroep (15.845 in / 5.925 uit, mét zoekactie) | $0,258 | $0,113 |
| Eén reparatieronde (13.625 in / 4.657 uit) | $0,208 | $0,083 |
| Twaalf pagina's schrijven en repareren (28 aanroepen) | $6,42 | $2,68 |
| Eén profielsynthese | $0,125 | $0,050 |

Een besparing van ongeveer $3,74 per twaalf pagina's, ofwel $0,31 per pagina. De rest van de
contentpijplijn verandert niet: die stond al op Luna en kostte over dezelfde ronde $1,01.

**Waarom dit geen verkapte bezuiniging is.** De externe copywriter die deze twaalf pagina's
beoordeelde wees geen enkele keer op iets wat een groter model had opgelost. Geen redeneerfout, geen
onlogische opbouw, geen gemiste samenhang. Wat hij elf keer aanwees was een ontbrekende lezer, een
merk dat nergens zelf sprak en een tekst zonder één eigen woord van de ondernemer. Dat zijn
gebreken in de OPDRACHT en niet in het denkvermogen, en daar zijn op 3 september de vijf promptblokken
en de zeven deterministische controles voor gebouwd. Het geld dat hier vrijkomt is bovendien meer
waard aan de andere kant van de pijplijn: één vermeden reparatieronde ($0,083 op Terra, $0,208 op
Sol) betaalt zeven tot zeventien volledige keuringen van $0,0119.

**Wat er meeveranderde.** De budgetdrempel van de synthese ging van $0,60 naar $0,25, dezelfde marge
boven een schatting die zelf van $0,49 naar $0,20 zakte; de synthese valt daardoor mínder vaak terug
op Luna dan voorheen. `ESTIMATED_COST_SOL` heet nu `ESTIMATED_COST_PREMIUM`, want de naam wees naar
een model in plaats van naar een tier. Het Sol-tarief blijft in `lib/openai/pricing.ts` staan, want
de rijen in `ai_calls` van vóór vandaag zijn ermee berekend en moeten narekenbaar blijven, en de
terugval voor een onbekend model blijft er ook op staan: bij het onbekende is te hoog schatten de
veilige kant.

⚠️ **Ongeverifieerd (conventie 10).** Dat Terra dezelfde tekstkwaliteit levert is een beredeneerde
aanname en geen meting. De nameting die dat moet uitwijzen staat in
`docs/tasks/contentkwaliteit-copywriterronde.md` §7: dezelfde twaalf onderwerpen opnieuw schrijven en
blanco voor dezelfde copywriter leggen. Valt die tegen, dan is terugdraaien één regel in
`lib/openai/models.ts`. De unittest "de contenttier staat op Terra" legt de keuze vast met de
bedragen erbij, zodat een stille terugval een rode test oplevert in plaats van een verrassing op de
factuur.

## 4 september 2026: meerdere mensen bij één merk, via `/admin/toewijzen`

Wens: een klant met meerdere collega's die willen meekijken op één merk. Uitgezocht of `profiles`
(het merk) daarvoor een many-to-many-koppeling met eigenaren nodig had. Dat bleek niet zo: die
laag bestaat al. `profiles.account_id` wijst naar precies één account (migratie 0046), maar dat
account zelf kent al een echte many-to-many via `account_users` en de uitnodigingsroute
(`account_invites`, migratie 0047) die `/instellingen` gebruikt. "Meerdere eigenaren per merk" is
dus "meerdere mensen bij het account onder dat merk", en dat mechanisme stond er al, alleen niet
op het scherm waar de eigenaar het nodig had: `/merk/[id]/admin/toewijzen`.

`TeamBox` (`app/(app)/instellingen/team-box.tsx`) en de bijbehorende route
(`/api/accounts/[id]/invites`) staan nu ook op de toewijspagina, met dezelfde route en dezelfde
regel (`mayInvite` in `lib/invite-rules.ts` laat een beheerder van ORBIT ENGINE altijd toe, ook als
hij zelf geen lid van dat klantaccount is). De ledenlijst-functie die `/instellingen` al had
(`listMembers`) is verplaatst naar `lib/accounts.ts` als `membersOf()`, zodat beide schermen
dezelfde functie gebruiken in plaats van twee kopieën (één feit, één eigenaar). Geen migratie
nodig: het schema had dit al, alleen de UI niet.

Zolang een merk nog geen account heeft (`profiles.account_id` is `null`), toont de toewijspagina
een verwijzing naar het toewijsblok erboven in plaats van het teamblok: uitnodigen voor een account
dat er nog niet is, kan niet.

## 4 september 2026: de keuring werkte de schrijfopdracht tegen (optimalisatie 1 tot en met 4)

Twee externe experts, een copywriter en een AI-expert, hebben de contentpijplijn doorgelicht. Hun
ruwe oordeel staat in `content-reviews/feedback/expertronde-copywriter-en-ai-4-september-2026.md`,
de negentien optimalisaties die eruit volgen in
`docs/tasks/optimalisaties-expertronde-4-september-2026.md`. Dit is het eerste blok: vier plekken
waar een instructie een andere instructie tegenwerkte. Geen van de vier kwam uit de feedback zelf;
ze kwamen uit het narekenen dat de feedback uitlokte.

**De redactionele beoordelaar strafte de merkstem af.** Op 3 september is regel 5 van de
schrijfprompt begrensd: de merknaam hoort in de citeerbare zinnen, de rest van de pagina praat in de
wij-vorm. Diezelfde dag bleef in `REDACTIE_SYSTEM` staan dat de beoordelaar moest kijken of "het
bedrijf EXPLICIET bij naam genoemd wordt in plaats van 'wij'/'ons'". De pagina die de nieuwe regel
netjes volgde, verloor dus punten bij de keuring, en zijn vrije verbeterpunten gaan als bevinding de
reparatieronde in (`quality-collect.ts` regel 358). Een reparatieronde kost $0,083 op Terra, en die
werd hier besteed aan het terugdraaien van iets dat goed was. Het criterium meet nu of in de
citeerbare passages ondubbelzinnig te zien is over welk bedrijf het gaat, met er expliciet bij dat de
wij-vorm daarbuiten goed is en nooit als verbeterpunt opgeschreven mag worden.

**De opening moest twee dingen tegelijk zijn.** De schrijver moet de eerste zin aan de lezer geven
(V8), de beoordelaar controleerde of de doelvraag "in de eerste twee zinnen" beantwoord werd. Dan
blijft er één zin over voor het antwoord en valt elke goede opening af. Het criterium meet nu de
eerste ALINEA, dezelfde eenheid als `eersteAlinea()` in `paginavorm.ts` (600 tekens).

**De ijkpunten waren de cijfers van één mens.** In de vakmanschapsprompt stond letterlijk "dat was
met 2,6 van 5 zijn laagste cijfer", met de herkomst erbij. Beide experts wezen dat af, en om twee
redenen die allebei kloppen: een beoordelaar die één copywriter leert nadoen beoordeelt die
copywriter en niet de tekst, en een cijfer in een prompt is een anker dat elk oordeel naar hetzelfde
midden trekt. Juist het uit elkaar houden van pagina's is wat hier ontbreekt (rangcorrelatie 0,29).
De ijkpunten staan er nu als regels zonder cijfer en zonder afzender, met de concrete zinnen als
illustratie.

**En de reparatieronde kende de grenzen niet.** Nagerekend: van de vijf promptblokken die op
3 september aan de SCHRIJFopdracht zijn toegevoegd, zat er geen enkele in de REPARATIEopdracht. Vier
ervan hebben een BLOKKERENDE controle achter zich: de aanspreekvorm, de verboden woorden, de
adresinstructie en zelfondermijnend advies. Een reparatieronde die die grenzen niet kende, kon dus
een pagina die door de keuring kwam alsnog onpubliceerbaar maken. Bij de bewijspunten liep het
bovendien rond: de keuring controleert of de betekeniszin nog in de tekst staat, de reparatie mocht
hem herschrijven, en de ronde daarna kreeg dezelfde bevinding opnieuw. `buildRepairInput()` krijgt nu
de aanspreekvorm, de verboden woorden, de klantinstructies, de adviestoon, de lezersopdracht, de
citeerbare klantantwoorden en `bewijspuntenBehoudblok()`. Wat er bewust NIET bij komt: de doellengte,
de stijlvoorbeelden, het winnende antwoord en de bestaande pagina. Dat is schrijfopdracht en geen
grens, en de gerichte reparatie is precies wat we niet in een tweede schrijfronde willen laten
omslaan. De extra invoer is ongeveer 400 tokens, ofwel $0,0008 per ronde; één vermeden ronde betaalt
er honderd.

**En er stond een tweede, ongebruikte kopie van de redactieprompt in `content.ts`.**
`CRITIQUE_SYSTEM` werd nergens aangeroepen en was een oudere versie van de prompt die wél draait. Wie
de prompts bijwerkt, werkt de helft van de tijd de verkeerde bij, en dat was hier al gebeurd. Weg.

Vier controles groen: typecheck, 4302 unittests (24 nieuwe, allemaal broncodecontroles op de prompts
plus het nieuwe blok puur getest), 645 ketentests (4 nieuwe, die nameten wat de reparatietaak van de
schrijftaak meekrijgt), build.

⚠️ Ongeverifieerd (conventie 10). Dat deze vier wijzigingen de tekst beter maken is niet gemeten. Wat
wél vaststaat is dat de instructies elkaar niet meer tegenspreken, en dat is na te lezen in de
prompts zelf.

## 4 september 2026: de app kiest nu wat er gezegd moet worden (optimalisatie 5, 6, 7 en 12)

Het tweede blok uit de expertronde, en het blok waar beide experts het meeste van verwachtten. Hun
scherpste zin: ORBIT ENGINE heeft geleerd hoe je voorkomt dat AI onzin schrijft, en de volgende stap
is leren wat het belangrijkste is om te zeggen. Negentien controles bewaken wat er niet mag; niets in
de keten besliste wat er per se wél moest komen.

**De schrijfopdracht (migratie 0094).** Eén goedkope stap tussen de voorbereiding en het schrijven,
op de goedkope tier, naar verwachting ongeveer een cent per pagina. Hij doet geen onderzoek en vat
niets samen, want een samenvatting is een negentiende promptblok. Hij KIEST: voor wie deze pagina is,
welke ene vraag hij beantwoordt, wat de lezer moet begrijpen als hij alleen de eerste alinea leest,
welke drie tot vijf F-nummers deze pagina dragen, wat de ondernemer kan zeggen wat een concurrent
niet kan kopiëren, en wat er blijft hangen. De feitenkaart blijft er compleet onder staan: minder
informatie was uitdrukkelijk niet het advies, een hiërarchie eroverheen wel.

**En het veld dat er nooit was: waarom zou juist deze lezer dit bedrijf kiezen.** Eén tot drie
redenen, gekozen vanuit de lezer en niet vanuit het bedrijf, elk met een F-nummer. Het verschil dat
de expert benoemt: "deze lezer heeft haast, dus dat wij binnen 24 uur ter plaatse zijn telt voor
hem" is een reden, "het bedrijf heeft vier dakdekkers" is een feit. Dit is de vraag waarmee de
externe copywriter op 3 september zijn hele beoordeling samenvatte, en overtuigingskracht was met
2,6 van 5 zijn laagste cijfer.

**Het vangnet, en dat is hier het belangrijkste deel.** Een opdracht die het schrijfmodel negeert, is
precies het extra promptblok dat de experts afraadden. `lib/schrijfopdracht.ts` rekent daarom na of
hij is uitgevoerd: komen de gekozen kernfeiten terug in de beweringen of de bewijspunten, staat het
kernantwoord in de eerste alinea (dezelfde woordoverlap van 0,6 als bij de bewijspunten), en staat de
reden om juist dit bedrijf te kiezen in de eerste twintig procent van de tekst. Dat laatste getal is
regel 4 van de externe copywriter en niet het onze; het staat als constante met die herkomst erbij.
Een opdracht met één leeg veld vervalt in zijn geheel, en dan schrijft de pijplijn precies zoals hij
het gisteren deed (conventie 3). De bevinding valt op de dimensie overtuiging, niet blokkerend,
behalve dat de ontbrekende keuzereden zwaarder weegt dan de andere twee.

**Bewijspunten kregen een derde stap (optimalisatie 7).** Feit naar betekenis was één stap te kort:
"u weet wie er op uw dak komt" is betekenis, maar waarom dat voor DEZE lezer iets uitmaakt stond
nergens. Het veld `relevantie` dwingt die keuze hardop af. Feit, betekenis, relevantie; pas bij de
derde stap wordt een bewijsstuk een argument.

**En de vakmanschapsbeoordelaar krijgt de opdracht als maatstaf (optimalisatie 12).** Hij oordeelde
of dit "de pagina is die een goede copywriter geschreven zou hebben" zonder te weten wat de pagina
moest bereiken, dus vergeleek hij elke tekst met een ideaal dat hij zelf verzon. Dat is een van de
verklaringen voor zijn zwakke ORDENING (rangcorrelatie 0,29): twee pagina's werden aan twee
verschillende maatstaven gemeten.

⚠️ **En onderweg viel een echte fout op.** `checkBewijspunten()` kreeg vanuit `quality-run.ts` de
IDENTITEITEN van de feiten mee (de uuids uit de feitenbank), terwijl een bewijspunt naar het
F-NUMMER verwijst dat het model in de prompt zag. Op productie gold daardoor elk bewijspunt als een
verwijzing naar een niet-bestaand feit, en kreeg elke pagina tot drie bevindingen die nergens op
sloegen. De unittest gaf F-nummers mee en dekte de fout dus toe. De parameter heet nu `factRefs`,
zodat de volgende aanroeper de vergissing niet herhaalt. Dit is de tweede keer in twee dagen dat een
controle iets anders meette dan hij dacht te meten, en allebei de keren kwam het aan het licht door
de aanroep na te lopen in plaats van de test te vertrouwen.

De klant ziet de opdracht terug op de paginaweergave, onder "Waarom deze pagina": voor wie de tekst
geschreven is, wat die persoon moet begrijpen, en waarom hij voor dit bedrijf zou kiezen.

Vier controles groen: typecheck, 4332 unittests (30 nieuwe), 649 ketentests (4 nieuwe, die de
opdracht van de plan- tot de schrijfstap volgen en tot in de kolom), build. Migratie 0094 staat op
productie.

⚠️ Ongeverifieerd (conventie 10). Dat de schrijfopdracht de tekst beter maakt en reparatierondes
bespaart, is de verwachting van twee experts en van deze sessie, en geen meting.

## 4 september 2026: bij een gelijkspel beslist niet langer de ruis (optimalisatie 11)

Beide externe experts stelden voor om de beoordelaar vergelijkend te laten werken: welke van deze
twee zou een goede copywriter eerder naar de klant sturen? Dat is voor een taalmodel een natuurlijker
vraag dan een absoluut cijfer, en het sluit aan op wat we van onze beoordelaar weten. Zijn niveau
klopt (0,14 punt van het menselijke oordeel), zijn ordening niet (rangcorrelatie 0,29).

⚠️ **Zij dachten daarbij aan het kiezen tussen PAGINA'S** ("welke pagina verdient mijn dure
reparatie"). Die keuze bestaat in deze app niet. `beslisReparatieRonde()` werkt per pagina, en de
reparatie start zodra de score onder de drempel van het paginatype ligt of er een openstaande
bevinding is. Er is geen wachtrij die pagina's tegen elkaar afweegt.

Waar een vergelijkend oordeel wél rechtstreeks iets stuurt, is de keuze tussen twee VERSIES van
dezelfde pagina, en die werd tot vandaag gemaakt door twee absolute cijfers van elkaar af te trekken
die allebei van diezelfde beoordelaar komen. Twee punten verschil is bij die betrouwbaarheid ruis, en
toch besliste het over welke tekst de klant krijgt en of er nog een ronde van $0,083 volgt.

**De marge is 3 punten,** herleid uit de enige meting die er is: 0,14 punt op een schaal van 1 tot 5
is 2,8 punt op de schaal van 0 tot 100 waarop hier gerekend wordt. Alles daarbinnen is ruis van de
beoordelaar zelf. Gekozen op één meting, net als de zeven drempels van 3 september, dus het getal
staat als constante met die herkomst erbij.

**De aanroep draait alleen bij dat gelijkspel.** Verschillen de blokkades, dan beslist code en wordt
er niets gevraagd: een versie met één blokkade minder is de betere, wat een model er ook van vindt.
Ligt het verschil buiten de marge, dan telt de score. Daardoor kost deze stap alleen iets waar hij
iets toevoegt, ongeveer $0,004, en dat is twintig keer minder dan de reparatieronde waarover hij
beslist.

Wat er hierdoor kan gebeuren en voorheen niet kon: een reparatie die twee punten LAGER scoort maar
een concreet punt oplost, mag blijven staan. Dat is precies de reparatie die je wilt houden, en die
werd tot vandaag weggegooid omdat het cijfer een fractie zakte.

Vier controles groen: typecheck, 4345 unittests (13 nieuwe), 649 ketentests, build.

⚠️ Ongeverifieerd (conventie 10). Dat het vergelijkende oordeel betrouwbaarder is dan het verschil
tussen twee cijfers, is de verwachting van beide experts en volgt uit de gemeten rangcorrelatie. Het
is niet nagemeten, en dat kan pas als er menselijke oordelen over versieparen liggen.

## 4 september 2026: het verhaal, de FAQ en de lezer (optimalisatie 8, 9, 10, 13 en 16)

Het derde blok uit de expertronde. Kleiner werk dan de schrijfopdracht, en het raakt drie dingen die
al maanden onaangeroerd waren.

**Het contract plant nu een verhaal (optimalisatie 8).** Elke sectie krijgt een `rol`: probleem,
herkenning, gevolg, oplossing, bewijs, bezwaar, zekerheid, actie of uitleg. Dat is de boog in acht
stappen die de externe copywriter voorstelde, en hij zat tot nu toe alleen in een promptregel bij de
schrijver, niet in de inhoudsopgave die hij meekreeg. **Het deterministische deel is bewust klein:**
code garandeert alleen dat er hoogstens één sectie is die tot actie oproept en dat die achteraan
staat. De rest van de volgorde hangt van het onderwerp af, en een boog forceren zou het contract
slechter maken dan het model hem plant. Een oproep om te bellen halverwege een uitleg is wél altijd
fout. De koppen worden in het contract nu ook al mededelingen in plaats van vragen; die instructie
stond alleen bij de schrijver, die er dus een vragenlijst als verhaal van moest maken.

**En er passen minder secties in.** De woordenbegroting hield al iets tegen, maar met een
richtlengte van veertig woorden past een landingspagina van 700 woorden zeventien secties. Onder de
tachtig woorden is een sectie twee zinnen met een kop erboven, en een pagina die daaruit bestaat is
de FAQ-dump die de copywriter als ondergrens 3 benoemde. Gemeten over de twaalf pagina's: 850 tot
1650 woorden met tot 26 secties, ongeveer 55 woorden per sectie.

**De FAQ-blokken zijn voor het eerst bekeken (optimalisatie 9).** Tien van de twaalf pagina's hebben
er acht, sommige een woordelijke kopie van een sectie twintig regels hoger. Niets keek ernaar, en
erger: `content-coverage.ts` telt de FAQ mee als DEKKING, dus een pagina die zichzelf herhaalde
scoorde beter dan een die dat niet deed. `lib/pipeline/faqblokken.ts` meet nu de woordoverlap met de
tekst erboven. Drempel 0,7, strenger dan de 0,6 van de bewijspunten en om een andere vraag: daar is
het "heeft de schrijver deze zin opgeschreven" en telt een herformulering mee, hier is het "staat dit
er al". De bevinding valt pas als méér dan de helft van de blokken herhaalt: één herhaling is
verdedigbaar voor een lezer die naar beneden scrolt. Op een FAQ-pagina geldt de regel niet, want daar
zijn de vragen het product.

**Een doelgroep is nog geen lezer (optimalisatie 10).** V7 blokkeerde een pagina zonder lezer, maar
accepteerde elke gevulde zin van vier woorden. "Mensen die dakisolatie zoeken" haalde die poort, en
dat is precies het voorbeeld dat de AI-expert als ONVOLDOENDE aanwees. `noemtSituatie()` kijkt nu of
er ook een probleem of een beslissing in staat. Dit blokkeert niet, net als `noemtPersoon`: het
stuurt de promptregel die het model vraagt de opdracht eerst af te maken. Wat het wél verandert, is
dat de nulmeting "0 van 12 pagina's zonder lezer" nu pas iets zegt.

**En `herkenning` telt eindelijk mee (optimalisatie 13).** Die dimensie werd sinds 3 september
gescoord en woog nergens in mee, want conventie 1 verbiedt sturen op een cijfer zonder
deterministisch vangnet. Dat vangnet is er nu: `checkOpening()` telt of de eerste zin bij het bedrijf
begint in plaats van bij de lezer. Beide wegen half zo zwaar als overtuiging zelf, want ze meten één
alinea en niet de hele pagina.

**Een bevinding over huiswerk wijst nu de sectie aan (optimalisatie 16).** De telling stond op de
hele pagina, en van de 72 gebiedende zinnen van 3 september stonden er 23 op één pagina en daarbinnen
in een handvol secties. Een bevinding zonder sectie stuurt de reparatie naar de pagina als geheel, en
dan raakt hij precies de alinea's die goed waren.

### ⚠️ Optimalisatie 17 gaat NIET door, en dat is gemeten

Het voorstel was om de reparatie hoogstens drie bevindingen per ronde te geven in plaats van tien,
omdat tien bevindingen "de halve pagina" zouden raken. Nagerekend op productie over de twaalf
pagina's met een keuring, met dezelfde prioritering die de reparatie gebruikt (ernst maal zekerheid):

| Wat | Gemeten |
|---|---|
| bevindingen per pagina | 46 tot 78 |
| secties die de top tien raakt | 0 tot 3, mediaan 1 |
| secties die de top vijf raakt | 0 of 1 |

De aanname klopt dus niet. De zwaarste bevindingen hebben meestal helemaal geen sectie (ze gelden
voor de hele pagina) en de rest zit in één tot drie secties. Het verlagen naar drie zou bevindingen
weggooien zonder de reparatie gerichter te maken. De grens blijft op tien.

Vier controles groen: typecheck, 4371 unittests (26 nieuwe), 649 ketentests, build.

## 4 september 2026: de richtlengte per sectie wordt eindelijk nagerekend (optimalisatie 15)

Het contract spreekt per sectie een lengte af, en dat is de hele reden dat `targetWords` per sectie
staat en niet per pagina: een bandbreedte voor een hele pagina stuurt niets. Niets rekende die
afspraak na. De dekkingspoort noemde een sectie "te dun" onder de 25 woorden, absoluut, wat het
contract ook plande. Een sectie met een richtlengte van 200 woorden die er 30 haalde, ging daar dus
gewoon doorheen terwijl de inhoudsopgave hem als dragende sectie plande.

De ondergrens is nu de helft van wat het contract voor DIE sectie afsprak, met 25 woorden als
absolute bodem. De helft is bewust ruim: een schrijver mag een sectie compacter maken dan gepland,
want korter is vaak beter. Onder de helft is het geen keuze meer maar een sectie die niet geschreven
is. De bevinding noemt allebei de getallen, zodat de reparatie weet hoeveel er bij moet.

## 4 september 2026: de documentatie is bijgewerkt, en het overdrachtsdocument is weg

`docs/contentpijplijn-overdracht.md` beschrijft de pijplijn zoals hij is, en die is vandaag op vier
plekken veranderd: de schrijfopdracht als stap 5b, de versievergelijking als stap 12, drie nieuwe
codecontroles in paragraaf 8, en twee openstaande punten in paragraaf 12.3 die nu gebouwd zijn. Zo
klopt het document weer bij de volgende doorlichting, en dat was de reden dat het bestond.

`docs/tasks/overdracht-expertfeedback.md` is verwijderd, zoals het bestand zelf voorschreef: de
feedback is verwerkt en de beslissingen staan hier. Wat eruit bewaard moest blijven, staat in
`CLAUDE.md` (de werkregels) en in dit logboek (de vier valkuilen, waarvan er vandaag twee opnieuw
opdoken: neem geen cijfer uit documentatie over, en meet de verdeling voordat je een drempel kiest).

Vier controles groen: typecheck, 4373 unittests (2 nieuwe), 649 ketentests, build.

## 4 september 2026: de contentronde van zes artikelen, en drie plekken waar de nieuwe stappen voor het eerst op echte data liepen

Opdracht: `docs/tasks/contentronde-zes-artikelen.md`. Eerst nagerekend dat de optimalisaties van
vandaag echt op `main` staan (`git log origin/main`, PR #64 gemerged): dat klopte, dus de ronde
meet de nieuwe pijplijn en niet de oude.

**De zes pagina's.** Per cluster de hoogst geprioriteerde nog ongeschreven aanbeveling, met twee
extra uit clusters die er meer over hadden: MJB Dakservice, daklekkage verhelpen ("Laat zien hoe
MJB lekkages onderzoekt en de prijs onderbouwt", "Maak kosten, voorrijkosten en spoedprijzen
zichtbaar"); MJB Dakservice, dakrenovatie en dakisolatie ("Maak een praktische pagina over
isolatiekosten en de juiste aanpak"); Fysio Centrum Utrecht, hardloopblessure behandelen ("Werk de
pagina voor Leidsche Rijn uit voor hardloopblessures"); Fysio Centrum Utrecht, bekkenfysiotherapie
("Presenteer de specialistische aantekening en doelgroepen op één sterke expertpagina", "Voeg
actuele kosten, vergoeding en de eerste stap naar een afspraak toe"). Een zesde, "Breid de pagina
voor Vaassen uit met lekopsporing", is tijdens de ronde vervangen, zie hieronder.

**De klantvragen.** Het opdrachtdocument noemde 26 openstaande vragen; nagerekend op `fact_requests`
stonden er 24 open (6 per analyse), niet 26. Daarvan zijn er 22 beantwoord als de klant, in zijn
eigen woorden met de reden erbij, en 2 bewust laten liggen (één bij MJB: hoeveel lekkages er al in
Zutphen en Deventer behandeld zijn; één bij Fysio: hoe snel nieuwe patiënten momenteel terechtkunnen,
want dat wisselt te vaak om vast te leggen). Daarnaast zijn tijdens het schrijven nog 14
pagina-specifieke claim-auditvragen beantwoord, ontstaan uit de dekkingscontrole van de zes
concrete contracten.

**De kosten, nagerekend op `ai_calls` (niet geraamd).** In totaal 117 aanroepen voor $1,83, ruim
onder de raming van ongeveer $4 voor zes pagina's. Per soort: schrijven (`content_draft`) 6 keer
voor $0,83, reparatie (`content_revise`) 8 keer voor $0,67, feitelijkheid ($0,07), onderzoek
(`item_dossier`) 3 keer voor $0,05, citeerbaarheid ($0,04), feiten uit de site halen (24 keer,
$0,03), vakmanschap en redactie (elk $0,03), claim-audit ($0,03), de inhoudsopgave (`content_contract`,
3 keer, $0,02), de schrijfopdracht (`writer_brief`, 6 keer, $0,02), `source_analysis` ($0,01), en
de versievergelijking 1 keer voor $0,001.

**Acht reparatierondes over zes pagina's:** vijf pagina's hadden er één nodig, de FAQ-pagina over
kosten en vergoeding drie (het maximum) en bleef daarna alsnog geblokkeerd. De versievergelijking
uit stap 12 heeft in deze ronde 1 keer moeten beslissen tussen twee versies.

**Bevinding 1, en de belangrijkste: de schrijfopdracht werkte, maar kwam nooit aan.** Alle zes
`writer_brief`-aanroepen leverden een compleet, goed gevuld negen-velden-antwoord op (lezer,
hoofdvraag, kernantwoord, kernfeiten, keuzeredenen met F-nummer, eigen woorden, wat erin moet, wat
blijft hangen). Toch staat `content_pieces.writer_brief_json` bij alle zes op `{}`. Het vangnet uit
`docs/contentpijplijn-overdracht.md` §5b ("een opdracht met één leeg veld vervalt in zijn geheel")
verklaart dit niet: er was geen leeg veld, de opdracht is gewoon nooit weggeschreven naar de pagina.
Dat is geen "onbekend is beter dan verkeerd" maar een schrijffout in de keten: $0,02 aan bruikbare
sturing is zes keer betaald en zes keer weggegooid, en de vakmanschapsbeoordelaar (optimalisatie 12)
kon de opdracht dus nooit meekrijgen. Bruikbaar: 0 van de 6. Verviel: 0 van de 6 door een leeg veld,
6 van de 6 doordat het resultaat niet is opgeslagen. Dit is een taak voor een volgende sessie, met
de zes `writer_brief`-aanroepen in `ai_calls` (kind `writer_brief`, 4 september, na 13:30 uur) als
bewijsmateriaal.

**Bevinding 2: de planstap voor MJB Dakservice faalde drie keer op "Breid de pagina voor Vaassen uit
met lekopsporing" (job `7c99bd55`), zonder foutmelding.** `content_plan` degradeert bewust zonder
contract als hij vastloopt (zie de toelichting bij `scheduleBriefingIfLastPlan` in
`lib/jobs/handlers.ts`), en deed dat hier ook: geen dossier, geen contract, dus geen lezer om voor
te schrijven. De pagina is laten vallen en vervangen door de eerstvolgende vrije aanbeveling uit
hetzelfde cluster ("Laat zien hoe MJB lekkages onderzoekt en de prijs onderbouwt"), zoals de opdracht
zelf als uitweg noemt. Waarom deze ene taak drie keer faalde is niet achterhaald; de andere vijf
`content_plan`-taken van dezelfde ronde liepen wel door.

**Bevinding 3: een consultant kan een pagina plannen en briefen voor een klant wiens profiel al aan
een ander account gekoppeld is, maar niet het schrijven laten starten.** `getOwnedAnalysis()`
(`lib/analyses.ts`) toetst via `hasAccess()` op accountniveau en liet het testaccount
`e2e-consultant@orbit-test.nl` overal door, ook op de analyses van MJB Dakservice die inmiddels op
naam van de eigenaar staan. Maar `planContentPiece()` en `buildContentContext()`
(`lib/pipeline/content-plan.ts:107`, `lib/pipeline/content.ts:1042`) toetsen nog rechtstreeks
`analysisRow.user_id !== userId` en gooiden daardoor "Analyse niet gevonden." op de twee MJB-pagina's
(taken `49dd7f01` en `bae126da`, 4 pogingen elk). Hersteld door het `userId`-veld in die twee taken
te corrigeren naar de echte eigenaar, waarna ze in één poging slaagden; hetzelfde is later nodig
gebleken voor de vervangende Vaassen-pagina (taak `94993248`). Dit is dezelfde soort inconsistentie
als de eerdere ontkoppeling van sales en content (CLAUDE.md, `lib/sales/`): zodra een profiel aan een
klantaccount gekoppeld is, moet de hele keten daarnaar kijken, niet alleen de laag die de klant ziet.

**Wat dit vroeg dat niet in de opdracht stond.** Er was geen `LIVE_PASSWORD` beschikbaar voor
`e2e-consultant@orbit-test.nl`. Met expliciet akkoord van de eigenaar is het wachtwoord van dat
bestaande testaccount via Supabase gereset om de ronde via de echte productie-API te kunnen draaien,
precies zoals eerdere sessies deden. De twee reparaties bij bevinding 3 zijn eveneens na afstemming
met de eigenaar uitgevoerd; de permissiecontrole hield de eerste poging terecht tegen omdat het een
rechtstreekse schrijfactie op een tabel was die niet voor deze sessie bedoeld is.

**De scores en oordelen van de zes pagina's**, van onszelf en dus geen antwoord op de vraag die deze
ronde stelt (valkuil 2: een AI die AI-tekst beoordeelt is te streng): alle zes eindigden op
`quality_verdict: block`. Kwaliteit 84 (lekkage-onderzoek), 82 (kosten), 88 (isolatiekosten), 92
(hardlopen Leidsche Rijn), 84 (expertpagina) en 38 (kosten en vergoeding, na drie reparatierondes).
Dat de FAQ-pagina na het maximum aantal reparaties nog altijd geblokkeerd is en zo laag scoort, is
zelf ook een bevinding: de eerste keer dat een pagina in deze twee rondes het reparatieplafond haalt.

Het bestand voor de copywriter staat in
[`content-reviews/copywriter-opdracht-zes-artikelen.md`](../content-reviews/copywriter-opdracht-zes-artikelen.md),
`content-reviews/README.md` is bijgewerkt. `docs/tasks/contentronde-zes-artikelen.md` is verwijderd,
zoals het zelf voorschreef.

Vier controles groen: typecheck, unittests, ketentests, build (geen productiecode gewijzigd deze
ronde, dus geen nieuwe testgevallen).

## 4 september 2026: de schrijfopdracht werd zes keer weggegooid op een opmaakverschil

De eerste echte ronde met de nieuwe pijplijn (zes pagina's, `content-reviews/copywriter-opdracht-zes-artikelen.md`)
liet zien dat de schrijfopdracht wel gemaakt werd maar nergens aankwam. Nagerekend op productie:
zes aanroepen `writer_brief` in `ai_calls` voor $0,0219, en `writer_brief_json` leeg bij alle zes de
pagina's. De opdracht is dus zes keer betaald en zes keer weggegooid.

**De oorzaak, uit de ruwe modeluitvoer in `ai_calls`.** De prompt vraagt om F-nummers. Het model gaf
het hele feit terug:

```
"kernfeiten": ["F7: Bij zelf betalen kost de intake ongeveer 70 euro en een
                vervolgbehandeling ongeveer 60 euro.", ...]
"keuzeredenen": [{ "factRef": "F9 en F10", ... }]
```

`maakSchrijfopdracht()` vergeleek die strings LETTERLIJK met de nummers van de feitenkaart. Geen
enkele kwam voor in de verzameling, dus bleven er nul kernfeiten over, en `bruikbareOpdracht()`
liet de hele opdracht vervallen op de eis van minstens drie. Het vangnet werkte zoals bedoeld, alleen
op de verkeerde grond: de opdrachten waren inhoudelijk prima.

**De reparatie is één regel denkwerk en geen nieuwe machinerie.** `splitRefs()` in `factcard.ts`
haalt elk voorkomen van F gevolgd door een getal uit een string en ontdubbelt ze, en de
reparatieopdracht gebruikt hem al. `bruikbareOpdracht()` schoont het formaat nu met diezelfde functie
op vóórdat er geoordeeld wordt, en bij een samengestelde verwijzing wint het eerste deel dat op de
kaart staat, dezelfde regel als in `resolveFactId()`. De geldigheidscontrole is meeverhuisd naar die
ene plek: één definitie van "welk feit bedoel je" in plaats van twee.

De kaart gaat als parameter mee en is optioneel. Bij het TERUGLEZEN van een opgeslagen opdracht wordt
alleen het formaat opgeschoond, want de kaart van toen bestaat niet meer en filteren op geldigheid
zou daar een opdracht wegwerpen die destijds klopte.

**En de prompt zegt het nu ook**, want dat is de intentie naast de garantie: alleen het nummer in
`kernfeiten`, en één nummer per keuzereden.

⚠️ **Dit is de derde keer deze week dat een test iets anders mat dan productie.** De ketentest gaf in
de stub keurige F-nummers terug, precies zoals de code ze verwachtte, en dekte de fout daarmee toe.
Dezelfde vorm als bij `checkBewijspunten()` (die kreeg uuids waar F-nummers hoorden) en bij de
kostenraming van 3 september. De stub levert nu het formaat dat het echte model teruggaf, en de
ketentest valt om zodra de normalisatie verdwijnt; nagerekend door de reparatie tijdelijk terug te
draaien, waarna vijf controles rood werden.

**Wat dit voor de zes geschreven pagina's betekent.** Ze zijn geschreven zoals de pijplijn dat vóór
4 september deed: zonder schrijfopdracht en dus zonder de expliciete keuzereden. De beoordeling die
er nu ligt, meet de rest van het werk van die dag wel (de keuring die de merkstem niet meer afstraft,
de reparatie die de grenzen kent, de FAQ-controle) en de schrijfopdracht niet. Wie de opdracht wil
beoordelen, heeft een nieuwe ronde nodig.

Vier controles groen: typecheck, 4382 unittests (8 nieuwe, met de echte productie-uitvoer als
invoer), 650 ketentests (1 nieuwe), build.

## 7 september 2026: het demomerk Van den Udenhout is volledig door de onboarding gehaald

Van den Udenhout (`udenhout.nl`, profiel `e0e61ce8`) is aangemaakt als demoaccount. De pre-boarding
(naam, schrijfwijzen, webadres) stond klaar; de rest van het onboardinggesprek is nagespeeld alsof
de klant aan tafel zat, zodat er één merk is waarmee elk scherm en elke keten getoond kan worden.

**Wat er nu staat.** Van de 60 velden in de catalogus zijn er 54 gevuld met herkomst `gesprek`, 3 op
niet van toepassing gezet (sitemap, Facebook, extra profiel) en 3 bewust open gelaten: de foto en
het LinkedIn-adres van de auteur, en het telefoonnummer van het aanspreekpunt. Die drie zijn niet te
verzinnen zonder de echte klant. Daarnaast: 12 van de 12 feitvragen uit de synthese beantwoord, het
gesprek vastgelegd met 2 contextfactoren, en 4 knopen aan de aanbodboom toegevoegd voor
laadoplossingen, die op de site wel bestaan maar in de boom ontbraken.

**Twee correcties die het onderzoek niet zelf kon maken, en die allebei de meting raken.**

Het profielonderzoek zette het bereik op `landelijk`, op grond van de leasepagina die zegt dat
klanten door heel Nederland bediend worden. Dat klopt voor lease en verhuur, maar de zes
dealervestigingen (Eindhoven, Veldhoven, 's-Hertogenbosch tweemaal, Oss en Boxtel) verkopen en
onderhouden regionaal, en daar zit vrijwel de hele omzet. Het bereik staat nu op `lokaal` met tien
plaatsen erbij. Dat is precies het geval waarvoor `geo-share.ts` bestaat: zonder plaatsnaam gaan
alle vragen landelijk, en dan meet je een Brabantse dealer af tegen Van Mossel in heel Nederland.
Dezelfde fout als bij Fysi-Unique, alleen andersom gemotiveerd.

De aanbodboom noemde tien vestigingen, waaronder Breda, Roosendaal, Halsteren en Oud Gastel. Dat
zijn locaties van Den Elzen Schade, het schadebedrijf van de groep, niet van de dealer. Ze staan er
nog, met een notitie erbij, maar tellen niet als werkgebied. `name_exclusions` heeft daarnaast vijf
regels gekregen, waarvan er twee de vervelendste soort meetfout voorkomen: het dorp Udenhout bij
Tilburg (ongeveer 8.700 inwoners) en Van Uden Group uit Rotterdam lijken in een AI-antwoord op dit
merk, en zonder uitsluiting valt de score te hoog uit. Om dezelfde reden is de kale schrijfwijze
"Udenhout" uit `aliases` gehaald.

**Wat er nog moet gebeuren.** Het vastleggen van het gesprek hoort de definitieve onderwerpronde te
starten (migratie 0074), en de gewijzigde velden vragen om een nieuwe kennistest, want de oude is
op landelijke vragen gemeten. Beide taken staan in de wachtrij en beide liepen op 7 september vast
op `[429] You have no credits remaining` van de OpenAI-API. Ze zijn 30 minuten vooruit gezet met de
teller op 0, zodat ze niet op hun vier pogingen opbranden. Tot die twee gedraaid hebben blijven de
8 onderwerpen op `stage: concept` staan en is er dus nog geen cluster te starten.

Geen code gewijzigd, dus geen controles gedraaid.

## 7 september 2026: de twee wachtende taken van Van den Udenhout zijn gedraaid, en de rangorde van onderwerpen bleek nergens op te slaan

Het tegoed op de OpenAI-API is aangevuld en beide taken zijn alsnog gedraaid.

**De definitieve onderwerpronde leverde 7 onderwerpen**, allemaal met herkomst `aanbod_en_gesprek`,
en ze volgen het gesprek: zakelijke lease, wagenparkbeheer, bedrijfswagens voor installatie- en
bouwbedrijven, elektrisch rijden en laden, onderhoud voor auto's van vijf jaar en ouder, private
lease en occasions. Fietsen via VELOO staat er terecht niet bij, want dat is in het gesprek
gedeprioriteerd. Het knooppunt "Laden voor zakelijke wagenparken" dat met de hand aan de aanbodboom
is toegevoegd komt terug in twee van de zeven onderwerpen, dus die handmatige toevoeging werkt door
zoals bedoeld.

**De kennistest is aangevuld met 9 regionale vragen** (van 12 naar 18 vragen, kosten ongeveer
$0,09). De oude landelijke vragen blijven staan, want de test is idempotent op de vraagtekst zelf.

⚠️ **Alle zeven onderwerpen kwamen binnen met `priority = 0`.** De clusterlijst sorteert op
`priority desc`, dus de volgorde waarin de consultant de voorstellen ziet was willekeurig, precies
op het moment dat hij moet kiezen welk cluster als eerste draait. De oorzaak staat in
`propose-topics.ts` regel 317: `Math.max(0, MAX_TOPICS - t.priority)` met `MAX_TOPICS = 8`, dus elke
waarde van 8 of hoger valt terug op 0. Het model kreeg nergens te horen wat het bereik is: de regel
"1 is het belangrijkste" staat als TypeScript-commentaar boven `priority: z.number()` en gaat dus
niet mee in het schema, en de systeemprompt noemt de rangorde helemaal niet. Het vangnet uit
conventie 1 ontbreekt hier ook: `Number.isFinite()` vangt alleen een niet-getal af, niet een getal
buiten het bereik. Voor dit merk is de volgorde met de hand gezet (7 tot en met 1, de commerciële
prioriteit uit het gesprek) en zijn de drie gespreksvelden per onderwerp gevuld. De reparatie in de
code staat nog open.

## 7 september 2026: de knop "schrijf hem algemeen" loste "geen lezer" niet op, en de bibliotheek zei niet dat er niets gebeurt

Bij Van den Udenhout stond de pagina "Maak de pagina over wagenparkbeheer tot een duidelijke
regionale oplossing voor mkb-wagenparken" na het klikken op "Schrijf mijn pagina" nog steeds in de
bibliotheek onder "Wacht op jouw input". De klant had wel alle feitenvragen beantwoord (32 van de 32
in `fact_requests`), dus het leek stuk.

**De echte oorzaak was de andere poort, de lezerspoort (V7, `lib/lezersopdracht.ts`).** Deze pagina
had geen `target_intent` en geen gekoppelde gemeten vraag, dus `heeftLezer` stond op onwaar. De
melding op het briefingscherm noemt drie uitwegen ("in één zin de lezer beschrijven", "een gemeten
vraag koppelen", "laten vallen"), maar het scherm bood er maar twee knoppen voor: "Schrijf hem
algemeen" en "Laat deze pagina vallen". Erger: de eerste knop deed hier niets. In
`lib/content-input-gate.ts` staat de `!heeftLezer`-check VÓÓR de `writeMode === "algemeen"`-check,
met opzet (het commentaar zegt het letterlijk: "een algemene uitleg heeft net zo goed een lezer
nodig"), dus wie "algemeen" koos en opnieuw op "Schrijf mijn pagina" klikte, kreeg gewoon opnieuw
"tegenhouden" te zien, zonder dat het scherm zei waarom die knop niet hielp.

**De reparatie is tweeledig.** Eén, `inputpoort()` geeft nu een `zonderLezer`-vlag mee op het
oordeel, zodat het scherm de twee soorten "tegenhouden" uit elkaar kan houden. Bij `zonderLezer` valt
de knop "algemeen" weg en staat er in plaats daarvan een tekstveld waarin de klant in één zin de
lezer kan beschrijven; dat antwoord gaat naar `content_pieces.target_intent`, dezelfde kolom die
`bepaalLezersopdracht()` leest. Twee, de bibliotheek (`library-list.tsx`) opent nu met een eigen
kaart die met zoveel woorden zegt "ORBIT ENGINE schrijft nu niets" zolang er een pagina op input
wacht, in plaats van diezelfde melding pas verderop in de gewone groepenlijst te tonen. Dat is de
conventie-1-toepassing hier: de instructie "de klant kan altijd door" bestond al in de prompt van de
melding, maar zonder een werkende knop en zonder een onmiskenbare "er gebeurt niets"-melding was dat
alleen een belofte, geen vangnet.

Getest: `scripts/test-unit.ts` kreeg negen nieuwe asserties die `zonderLezer` op elk van de zes
oordelen van `inputpoort()` narekenen. `tsc --noEmit`, `test:unit` (4388 geslaagd), `test:chain` (650
geslaagd) en `build` zijn alle vier groen gedraaid.

## 7 september 2026: Teamsessie over de journey van cluster tot geschreven pagina, en vier van de zes aanbevelingen doorgevoerd

Vijf experts (UX 30%, Product 20%, Engineering 20%, AI 15%, Growth 15%) onderzochten onafhankelijk
de flow van `/merk/[id]/strategie/clusters` tot een gepubliceerde pagina, gevolgd door een Devil's
Advocate-ronde die elke bevinding zelf natrok. Beeld: de klant ervaart één taak ("laat ORBIT ENGINE
deze pagina schrijven"), de app bouwt hem telkens als een nieuw scherm met een nieuwe naam en, bij
de feitenvragen, een nieuwe datalaag. Het volledige uitvoeringsplan met de status per punt staat in
`docs/tasks/customer-journey-cluster-tot-schrijven.md`.

**Een echte bug kwam pas tijdens het doorvoeren aan het licht.** `GenerateAllButton` ("Schrijf alle
N pagina's") las het `briefing`-veld van `generate-all/route.ts` nooit: die route plant altijd
eerst de contentbriefing in (`contentbriefing.md` §2, om dezelfde vraag niet drie keer apart te
stellen bij drie pagina's) en schrijft nooit meteen. De knop toonde na elke geslaagde aanroep
"ORBIT ENGINE schrijft N pagina's" met een pulserend live-bolletje, alsof het schrijven al liep,
terwijl er nog geen letter tekst stond totdat de klant zelf de briefing invulde. Precies de klacht
waarmee deze klant de sessie begon, alleen nu voor de "alles"-knop in plaats van voor één pagina.
`generate-button.tsx` (de knop per pagina) had deze vertakking al; nu ook `generate-all-button.tsx`.

**Vier van de zes aanbevelingen zijn doorgevoerd:**
1. De bug hierboven.
2. Eén taalgebruik voor de hele stap: **voorbereiden** (feiten en vragen klaarzetten), **vragen
   beantwoorden**, **schrijven**. Vijf verschillende knopteksten ("Start het onderzoek voor deze
   pagina", "Laat ORBIT ENGINE alles schrijven", "Briefing invullen") zijn hierop aangepast.
3. `tabs.tsx` markeerde op `/analyses/[id]/briefing` geen enkel tabblad: `onDossier` was alleen waar
   op het exacte basisadres. Nu is "Cluster" actief op elke route van het cluster die niet expliciet
   Bibliotheek of Instellingen is, dus ook op de briefing, `/antwoorden` en `/rapport`.
4. De voortgangsbalk op het briefingscherm telde alleen beantwoorde vragen, los van het oordeel van
   `inputpoort()`. Een klant kon op "12 van de 12" staan en alsnog een blokkade tegenkomen. Er staat
   nu een aparte regel die telt hoeveel pagina's al mogen (`stand !== "tegenhouden"`), naast het
   aantal beantwoorde vragen.

**Twee aanbevelingen zijn bewust niet doorgevoerd.** De briefing laten hergebruiken wat er al bestaat
(`FactRequests`, de derde eigen datamapper) is de grootste en risicovolste van de zes: Engineering en
de Devil's Advocate wezen allebei op hetzelfde, dit is een datamodel-fusie (`BriefingQuestionView`
heeft velden die `FactRequests` niet kent, en `FactRequests` filtert niet op `content_piece_ids`
zoals de briefing dat wél moet). Dat in dezelfde sessie erbij doen is precies het haastwerk waar
§15 hierboven voor waarschuwt; het blijft open in het taakdocument. Het filteren van het
briefingscherm op de aangeklikte pagina (in plaats van alle wachtende pagina's) is niet opgepakt
omdat de frequentie niet gemeten is: eerst loggen hoe vaak een klant meerdere pagina's tegelijk in
briefing heeft staan.

Getest: `tsc --noEmit`, `test:unit` (4388 geslaagd), `test:chain` (650 geslaagd) en `build` zijn
alle vier groen gedraaid na de vier wijzigingen.

## 15 september 2026: melding bij een nieuwe versie, en het open ontwerpbesluit blijft open

Eerste punt uit `docs/tasks/nova-vergelijking-verbeterpunten.md` doorgevoerd (punt 25, blok E), na
een verse vastlegging van de Nova-app (971 naar 1766 tekstsleutels sinds de vorige, ook in deze
sessie ververst in `docs/nova-i18n.json`).

**Het probleem was al zichtbaar en niet herkend als bug.** ORBIT ENGINE deployt bij elke merge naar
main, en een openstaand tabblad bleef gewoon doorwerken op een verouderde JS-bundel. Het eerste
zichtbare gevolg was een knop die een fout gaf omdat de API onder zijn voeten veranderd was, en dat
oogt als een defect in de app, niet als een deploy die net heeft plaatsgevonden.

**Werking:** `next.config.ts` bakt `NEXT_PUBLIC_APP_VERSION` in de browserbundel
(`VERCEL_GIT_COMMIT_SHA` op Vercel, anders het opstartmoment van de dev-server). `/api/version` leest
dezelfde omgevingsvariabele bij elk verzoek opnieuw en geeft dus de ECHT lopende versie terug.
`components/deployment-banner.tsx` vergelijkt de twee elke vijf minuten (`lib/deployment.ts`,
puur en getest) en toont bij een verschil een balk onderin het scherm: "Herlaad nu" of "Niet nu".

**Bewust geen automatisch herladen, in tegenstelling tot Nova.** Nova telt zelf af en herlaadt
vanzelf, en dat kan bij hen omdat vrijwel elk scherm autosave heeft. Het merkprofiel
(`brand-wizard.tsx`) bewaart pas op een expliciete klik, dus een geforceerd herladen kan client-side
werk wegvegen. De klant beslist zelf wanneer, en de bestaande `beforeunload`-waarschuwing in
formulieren met openstaande wijzigingen blijft daarbovenop gewoon werken.

**Het open ontwerpbesluit uit `docs/designsystem.md` §9b blijft van kracht en is niet stilzwijgend
verder ingevuld.** Op verzoek van de eigenaar wordt de vormgeving voorlopig verder naar Nova
toegebracht in plaats van er verder van af te wijken: dat is een expliciete uitspraak op punt 1 van
§9b ("nog verdiepen, eigen identiteit later"), geen vergeten vraag. Deze wijziging zelf voegt geen
nieuwe kleur, radius of schaduw toe: hij hergebruikt de bestaande `.toast-card`-stijl uit
`components/toast.tsx`, dus hij verandert niets aan het fundament waar §9b over gaat.

Getest: `tsc --noEmit`, `test:unit` (4393 geslaagd, waarvan 5 nieuw), `test:chain` (650 geslaagd) en
`build` zijn alle vier groen gedraaid.

## 15 september 2026: blok E compleet, punt 26, 27 en 28 uit de Nova-vergelijking

Vervolg op de vorige entry (punt 25). Alle drie klein, allemaal zonder migratie.

**Punt 26, een schrijfregel, niet een scherm.** `docs/schrijfstijl.md` krijgt een twaalfde
richtlijn: bij een storing eerst zeggen wat er niet werkt, dan wie eraan werkt, dan wat de klant
intussen wél kan (of expliciet dat er niets is, conventie 3). De twee verwijzingen naar "elf
richtlijnen" in `docs/merkstrategie.md` zijn meegewerkt naar twaalf. Toegepast op één echt geval:
`/merk/[id]/analytics/zoekverkeer` toonde bij een mislukte Search Console-synchronisatie dezelfde
ruwe API-foutregel aan een beheerder én aan een klant. Een beheerder kan daar iets mee, een klant
niet: die ziet nu dat zijn consultant ervan op de hoogte is. De rest van de foutmeldingen in de app
is niet systematisch langsgelopen; de richtlijn staat, de toepassing groeit mee bij vervolgwerk.

**Punt 27 bleek al voor twee derde gebouwd.** `lib/work.ts` maakt het onderscheid "wacht op de
klant" versus "wij zijn ermee bezig" al met `WorkState`, maar `/merk/[id]` liet alleen de eerste
soort zien. Geen tweede lijst toegevoegd (dat zou de bestaande statuskaarten per pagina dupliceren),
wel een teller naast "Wat er op je wacht" en een aangepaste lege-staat-zin die zegt waarmee ORBIT
ENGINE bezig is als er niets op de klant wacht.

**Punt 28: de helft bestond al.** Content per pagina exporteren stond er al
(`lib/pipeline/content-export.ts`). Ontbrak: het hele plan in één bestand. Nieuw: `GET
/api/profiles/[id]/plan/export` en een knop op het planscherm. Bij het bouwen viel op dat de
vergelijkbare route voor analyseresultaten (`/api/analyses/[id]/results/export`) aan geen enkele
knop hangt; dat is genoteerd in het taakdocument om aan de eigenaar voor te leggen, niet
stilzwijgend gefixt of verwijderd.

Getest: `tsc --noEmit`, `test:unit` (4393 geslaagd), `test:chain` (650 geslaagd) en `build` zijn
alle vier groen gedraaid, ook `npm run build` met de nieuwe route erin gecontroleerd.

Blok E uit `docs/tasks/nova-vergelijking-verbeterpunten.md` is hiermee compleet. Blok A (het
contentplan vooraf vullen) wacht op een planningsronde met de eigenaar over punt 1, zoals eerder
afgesproken.

## 14 september 2026: een zijproject in dezelfde codebase, achter dezelfde inlog

**Er staat sinds vandaag een tweede app in deze repo: `app/solliciteren/`, één pagina, met een S
rechtsboven in de bovenbalk als ingang.** De opdracht van de eigenaar was precies afgebakend: wél
de inlog en de publicatie van ORBIT ENGINE hergebruiken, níet de vormgeving, en niets veranderen bij
Supabase of Vercel. Dat is ook wat er gebeurd is: 0 migraties, 0 nieuwe tabellen, 0 wijzigingen aan
het project bij Vercel. Vier nieuwe bestanden in de nieuwe map, drie bestaande bestanden aangeraakt
(`components/workspace-chrome.tsx` voor de S, `components/app-shell.tsx` voor het recht erachter,
`lib/supabase/middleware.ts` voor de bescherming) en 15 controles erbij in `scripts/test-unit.ts`
(4388 naar 4403).

**Waarom hij buiten `app/(app)` staat.** Alles onder die groep krijgt de schil van ORBIT ENGINE
eromheen: zijbalk, merkkiezer, bovenbalk, plus de vier parallelle queries van die layout. Een
zijproject dat er anders uit moet zien, heeft aan alle vier niets. Vandaar een eigen map naast die
groep, met een eigen layout die alleen `requireUser()` doet.

**De vormgeving is echt gescheiden, en dat wordt bewaakt.** `app/solliciteren/solliciteren.css`
gebruikt geen enkel token uit `globals.css`: alle 13 eigen tokens beginnen met `--sol-` en alle
klassen met `sol-`. Warm papier, een schreefletter voor de koppen, terracotta als accent, hoeken van
4 pixels en één vaste stand, tegenover het koele leiblauw, Geist, 6 tot 12 pixels en twee standen
van het hoofdproduct. Een afspraak als deze slijt vanzelf, want één import uit `components/` of één
`var(--text-primary)` knoopt de twee ontwerpen weer aan elkaar. De nieuwe testgroep leest daarom de
map zelf uit: geen bestand eronder mag uit `@/components/` importeren, geen `var(--)` in het
stijlblad mag buiten `--sol-` vallen, en het stijlblad mag nergens anders geladen worden.

**Eén ding valt niet weg te nemen.** `app/layout.tsx` is in Next.js het wortelelement van de hele
site en laadt `globals.css`, dus de Tailwind-basis (marges op nul, standaard randkleur) komt ook op
deze pagina binnen. Een tweede wortelelement zou betekenen dat alle bestaande schermen naar een
andere route group verhuizen, en dat is een te grote ingreep voor één pagina. Elke zichtbare waarde
wordt daarom op `.sol-app` opnieuw gezet. Nagemeten in de browser met de donkere stand van ORBIT
ENGINE aan: de pagina blijft warm papier, er lekt niets doorheen.

**Alleen voor ORBIT ENGINE zelf.** De S hangt aan `isStaff`, het effectieve recht, dus hij verdwijnt
ook tijdens de klantweergave, en `app/solliciteren/layout.tsx` controleert hetzelfde recht nog eens
op de server met een `notFound()` erachter: een verborgen knop is geen slot. Van de 3 accounts in de
database zijn er 2 staff, dus in de praktijk raakt dit vandaag niemand, maar de volgorde is
belangrijker dan het aantal: een klant hoort nooit een knop te zien naar iets dat niet van hem is.

**Geverifieerd, niet aangenomen** (conventie 10): `/solliciteren` geeft zonder sessie een 307 naar
`/login` op de draaiende dev-server, de pagina rendert in de browser op 1280 en op 390 pixels breed,
en de S staat in de bovenbalk links van het hulp-icoon. `tsc --noEmit`, `test:unit` (4403 geslaagd),
`test:chain` (650 geslaagd) en `build` zijn alle vier groen.

**Wat er nog niet is: de app zelf.** De pagina zegt dat met zoveel woorden ("Hier komt de app"),
want er is geen functie gebouwd en geen data om te tonen. Wat de pagina moet gaan doen staat open in
`docs/tasks/solliciteren-zijproject.md`.

---

## 14 september 2026: de sollicitatieassistent, het zijproject krijgt zijn functie

De pagina van vanmorgen zei "Hier komt de app". Dit is de app: een assistent die de vacature
ontleedt, hem naast het CV legt en een brief schrijft die daarna in het gesprek bij te sturen is.
Zes modules in `lib/solliciteren/`, vijf schermbestanden in `app/solliciteren/`, drie API-routes en
migratie 0095. De testtelling gaat van 4408 naar 4515, en dat zijn 107 nieuwe controles waarvan er
geen enkele een aanroep kost.

**De scheiding is meeverhuisd naar de database.** Tot vanmorgen deelde het zijproject twee dingen
met ORBIT ENGINE, de inlog en de publicatie, en de opmaak juist niet. Met 0095 geldt dat ook voor de
data: `sollicitatie_chats` en `sollicitatie_berichten` hangen aan `auth.users` en hebben geen enkele
join met `profiles` of `accounts`. De testgroep leest de eigen map uit en rekent na dat geen enkel
bestand van het zijproject een tabel van het hoofdproduct aanraakt.

**De kosten gaan bewust niet in `ai_calls`.** Elke rij daar hangt aan een merk, een meetronde of een
pagina, en de dagplafonds uit migratie 0089 worden erop gerekend. Een brief van de eigenaar zou het
budget van een klant laten oplopen door iets wat die klant niet heeft gevraagd. Wat een bericht
kostte staat daarom per bericht in `sollicitatie_berichten.cost_usd`, met dezelfde rekensom uit
`lib/openai/pricing.ts`.

**De modelkeuze ging anders dan gevraagd, en dat is een keuze.** De opdracht noemde "GPT-6 Astra" en
"GPT-5.4 Thinking". Die staan niet in de keuzelijst: de app kent ze nergens, er is geen tarief voor
in `lib/openai/pricing.ts`, en er was in deze omgeving geen sleutel om te controleren of ze bij
OpenAI bestaan. Een modelnaam die niet bestaat levert geen nette foutmelding op maar een mislukte
aanroep, en een onbekend tarief valt stil terug op de duurste schatting die we kennen (conventie 3).
Er staan nu drie modellen in, Sol, Terra en Luna, elk met een geverifieerd tarief. Er een bijzetten
kost twee regels zodra de naam vaststaat: een regel in `lib/solliciteren/modellen.ts` en een tarief
in `pricing.ts`.

De tweedeling uit de opdracht, een schrijfmodel naast een redeneermodel, bestaat sinds GPT-5.6
bovendien niet meer tussen modellen maar als knop óp elk model: `isReasoningModel()` herkent de hele
GPT-5-familie. Wat vroeger de modelkeuze was, is nu de redeneerstand (geen, laag, midden, hoog); wat
het model bepaalt is hoe goed de zinnen zijn en wat het kost. Allebei staan ze per bericht in te
stellen en allebei worden ze per bericht opgeslagen.

**Eén regel staat nu op twee plekken in code, met opzet.** De API accepteert `temperature` alleen
zolang de redeneerstand op `none` staat; bij `low` en hoger faalt de hele aanroep met een 400.
`resolveTuning()` in de pijplijn vertaalt SOORT WERK naar parameters, dit scherm laat de gebruiker
zelf kiezen, dus de tabel daar past hier niet. De regel zelf staat op allebei de plekken, en een
testgroep rekent voor alle drie de modellen na dat ze niet uit elkaar lopen. Zou dat wel gebeuren,
dan faalt elke aanroep van dit scherm zonder dat er iets aan dit scherm veranderd is.

**Twee dingen die de opdracht niet vroeg, en die de functie het meest waard maken.** Allebei zijn
het tellingen in code, dus ze kosten niets, ze wachten nergens op en ze geven elke keer hetzelfde
antwoord.

De eerste is de **cliché-controle** (`lib/solliciteren/cliches.ts`, 18 regels). De systeemprompt
verbiedt elf standaardzinnen bij naam plus het gedachtestreepje en de schuine streep; een
promptinstructie is een verzoek en geen garantie, en hoe langer een gesprek wordt hoe vaker een
model terugvalt op wat het altijd schrijft. Onder elk antwoord staat daarom wat er gevonden is en
waarom het opvalt. Er wordt niets weggehaald, anders dan in `lib/pipeline/dash-guard.ts`, waar de
tekst zonder tussenkomst naar de site van een klant gaat: hier kijkt er altijd nog iemand naar, en
of "met veel enthousiasme" in jóuw brief een cliché is of gewoon waar, bepaal jij. Een testgroep
haalt de verboden zinnen uit de prompt en controleert dat het vangnet ze alle elf terugvindt.
Dat is conventie 1 in zijn zuiverste vorm: lopen die twee lijsten uit elkaar, dan verbiedt de prompt
iets dat niemand nakijkt.

De tweede is de **sleutelwoordvergelijking** (`lib/solliciteren/sleutelwoorden.ts`). Een werkgever
haalt binnengekomen brieven door een systeem dat op letterlijke woorden zoekt, en dat is geen werk
voor een taalmodel. Terwijl je de vacature plakt, staat ernaast welke woorden eruit nog niet in je
CV voorkomen, met het percentage erbij. Zonder CV of zonder vacature is dat percentage `null` en
geen 0 (conventie 3): een leeg veld en nul overlap zijn twee verschillende dingen.

**Wat er nog niet geverifieerd is** (conventie 10). `tsc --noEmit`, `test:unit` (4515 geslaagd),
`test:chain` (650 geslaagd) en `build` zijn alle vier groen, en migratie 0095 is toegepast op
productie en nagerekend: twee tabellen, twee policies en de trigger op `updated_at` staan er. Maar
er is in deze omgeving geen `OPENAI_API_KEY` en geen Supabase-sleutel, dus er is **geen enkele echte
aanroep gedaan vanaf dit scherm**. Het streamen, de kostenregistratie per bericht en het opslaan van
de ruwe uitvoer zijn gebouwd en niet gemeten. Dat is de eerste stap na de eerstvolgende publicatie:
één gesprek voeren, en daarna `sollicitatie_berichten` naast de factuur van OpenAI leggen.

---

## 15 september 2026: het dossier gaat los van de vacature, en de schrijfstijl wordt een getal

Twee verbeteringen aan het zijproject, gekozen door de eigenaar uit vijf voorstellen, plus de drie
kleinere dingen die erbij hoorden. De testtelling gaat van 4515 naar 4577.

**De ontwerpfout van gisteren.** In migratie 0095 stonden het CV en de eerdere brieven als kolom op
het gesprek, naast de vacature. Dat leest logisch en het werkt precies één keer: bij de tweede
vacature plak je je hele loopbaan opnieuw, en verbeter je onderweg je projectbeschrijving, dan geldt
dat alleen voor het gesprek waarin je toevallig zat. Migratie 0096 draait dat om. Het materiaal
hangt aan de persoon (`sollicitatie_documenten`, per stuk een rij met een soort en een titel), de
vacature blijft aan het gesprek hangen. Een tweede sollicitatie is daarmee: vacature plakken, knop.
Het scherm maakt het gesprek zelf aan zodra dat nodig is, dus er is ook geen "nieuw gesprek" meer
als aparte handeling.

**Het soort van een stuk is geen kopje.** `brief` is het materiaal waar de schrijfstijl aan gemeten
wordt, `cv` en `project` leveren de feiten. Die twee door elkaar meten zou de gemeten stem
vervuilen met opsommingen en jaartallen, en dat is precies het register dat een brief niet moet
hebben. Vandaar dat het onderscheid in de database staat en niet alleen op het scherm.

**"Schrijf zoals deze persoon schrijft" was een bijvoeglijk naamwoord.** Het stond als zin in de
systeemprompt, en een zin in een prompt is een verzoek: een model heeft een eigen register en dat
wint zodra het gesprek langer wordt. `lib/solliciteren/stem.ts` meet nu aan de eigen brieven wat je
niet zou opschrijven maar wel herkent: gemiddelde zinslengte, hoe lang je langere zinnen zijn (het
90e percentiel, niet de langste, anders bepaalt één opsomming de grens), of je "u" of "je" schrijft,
hoeveel zinnen je met "Ik" begint, hoe groot je alinea's zijn, en welke woorden echt van jou zijn.
Die maten gaan als genummerde regels de systeemprompt in, en na afloop legt dezelfde module de
geschreven brief er weer naast. Dat is conventie 1 zoals hij bedoeld is: een instructie die je kunt
nameten. Onder de 150 woorden aan brieven komt er `null` uit en staat er geen stijlvoorschrift in de
prompt, want een profiel gemeten op 40 woorden ziet er op het scherm precies zo betrouwbaar uit als
een profiel op 4000 woorden (conventie 3).

**De volgorde van de aanroep is een ontwerpkeuze geworden.** Instructie, dossier, vacature, gesprek,
vraag: van meest naar minst stabiel. OpenAI hergebruikt het begin van een aanroep dat gelijk is aan
de vorige. Het dossier is het grootste stuk en verandert zelden, dus het hoort vooraan; achteraan
zetten laat dat hergebruik bij elke vervolgvraag wegvallen. Dat is hier geen bezuiniging maar
doorlooptijd, want hoe sneller het eerste woord op het scherm staat, hoe bruikbaarder het scherm is.

**Eén voorstel is bewust niet uitgevoerd.** Het plan had ook "de vacature ontleden als eigen
goedkope stap" en "kies per vacature de drie relevante projecten in plaats van alles mee te sturen".
De eigenaar heeft daar op 15 september 2026 expliciet tegen gekozen: kosten zijn niet de rem, het
hele dossier gaat in één keer naar het beste model. Dat is een verdedigbare afweging voor dit
scherm, waar één goede brief meer waard is dan een paar cent, en het staat hier omdat het de reden
is dat de code er anders uitziet dan de tien conventies op het eerste gezicht doen vermoeden.
Conventie 7 ("één zware aanroep per taak") wordt niet overtreden: het is nog steeds één aanroep, hij
krijgt alleen meer mee. De grenzen staan er nog wel, maar ruim: 60.000 tekens per stuk en 240.000
voor het hele dossier, tien keer een normaal dossier, en wat er afvalt wordt op het scherm bij naam
genoemd in plaats van stil weggelaten.

**Bestanden inlezen, met één pakket erbij.** `unpdf`, één afhankelijkheid zonder eigen
afhankelijkheden, alleen geïmporteerd in een server-module dus er gaat geen byte naar de browser.
De bekendere keuze (`pdf-parse`) leest bij het importeren een testbestand van schijf en breekt
daarmee op een serverless omgeving. Nagemeten op een zelf samengestelde PDF van één pagina: de twee
tekstregels kwamen compleet en in de juiste volgorde eruit. Een gescande PDF is een plaatje en
levert niets op; het scherm zegt dat dan met zoveel woorden in plaats van te doen alsof het bestand
stuk is. De ingelezen tekst gaat naar het VELD en niet naar de database: een PDF die half goed
uitleest hoor je te zien voordat hij in je dossier staat.

**Geverifieerd, niet aangenomen** (conventie 10): migratie 0096 is toegepast op productie en
nagerekend, en `tsc --noEmit`, `test:unit` (4577 geslaagd), `test:chain` (650 geslaagd) en `build`
zijn alle vier groen. Het inlezen van een PDF is echt gedraaid. Wat nog steeds niet gemeten is: er
is in deze omgeving geen OpenAI-sleutel geweest, dus er is nog geen enkele echte aanroep gedaan
vanaf dit scherm.

---

## 15 september 2026: de feitenkaart, elke zin in de brief wijst naar iets dat je kunt aanwijzen

De eigenaar gaf één richtlijn mee: kwaliteit van de brief boven alles. Dit is wat daar het meest
aan doet, en het is niet nieuw bedacht maar overgenomen van het hoofdproduct. Migratie 0097, 62
controles erbij (4577 naar 4639).

**De aanleiding staat al in `lib/pipeline/factcard.ts`.** Bij de eerste echte contentronde waren van
de 16 beweringen op een gegenereerde pagina er 5 verzonnen, en het patroon was duidelijk: een model
verzint niet willekeurig, het verzint precies daar waar de tekst een concreet feit NODIG heeft en
het materiaal het niet levert. Een sollicitatiebrief is die tekst bij uitstek. "Ik bracht de
doorlooptijd terug van negen naar vijf dagen" is de zin die werkt, en het is ook de zin die een
model invult als hij er niet staat. Een dossier meegeven met "gebruik dit waar het past" is een
uitnodiging, geen grens.

**Wat er nu gebeurt.** Je leest je dossier één keer uit tot een genummerde kaart: per feit één zin,
een categorie, een periode waar die er is, en de zin uit je dossier waar het op steunt. Die kaart
gaat als GESLOTEN lijst de prompt in: alles wat er niet op staat, bestaat voor de brief niet. De
brief zet achter elke bewerende zin het nummer waarop hij steunt, en `lib/solliciteren/feiten.ts`
rekent na of dat nummer bestaat. Bij het kopiëren gaan de nummers er automatisch uit, dus wat je in
de mail plakt is gewoon een brief.

**De bronzin is de helft van het idee.** Het model krijgt de opdracht de zin uit het dossier
letterlijk over te schrijven, en `zeefFeiten()` gooit elk feit weg waarvan die zin niet letterlijk
terug te vinden is. Zonder dat vangnet mag het model zijn bron samenvatten of net iets mooier maken,
en dan bewijst de bron niets meer (conventie 1). Op het scherm staat na elke uitleesronde hoeveel
feiten het model aanleverde en hoeveel er door die controle kwamen; dat verschil is de enige manier
om te zien dat het vangnet werkt.

**Het F-nummer is vast en geen positie.** In het hoofdproduct is "F3" de derde regel in een lijst en
schuift alles op als er iets bij komt. Dat kan daar, want die kaart wordt per pagina gemaakt. Hier
leeft de kaart maanden met bewaarde brieven ernaast, dus krijgt elk feit een eigen nummer dat nooit
verschuift, en een verwijderd feit geeft zijn nummer niet terug. De unieke index op
`(user_id, nummer)` is het vangnet onder het toekennen in de route.

**De schrijfopdracht is in het antwoord gekomen, niet in een eigen aanroep.** Het voorstel was
oorspronkelijk een aparte goedkope stap, zoals `lib/pipeline/writer-brief.ts` in het hoofdproduct.
Dat botste met de keuze van de eigenaar om een brief in één aanroep te schrijven. Het is nu een
verplicht kopje IN het antwoord: wie leest deze brief, waarom zou juist deze werkgever jou kiezen
boven de zestig anderen, welke F-nummers dragen de brief, en wat laat je bewust weg. Daarmee blijft
het één aanroep en is het toch de expliciete keuze die het moest zijn. En het is nu controleerbaar:
`controleerAntwoord()` rekent na of de feiten die de schrijfopdracht uitkoos ook echt in de brief
terugkomen. Dat kon de losse stap in het hoofdproduct niet.

De vraag "waarom zou deze werkgever juist jou kiezen" is dezelfde vraag die de externe copywriter op
3 september 2026 miste in de contentpijplijn, en waar migratie 0094 voor gemaakt is. Hij blijkt in
dit domein nog directer te vertalen: een sollicitatiebrief IS het antwoord op die vraag.

**Het uitlezen is wél een eigen aanroep, en dat is geen tegenspraak.** Conventie 7 zegt: een nieuwe
zware stap wordt een eigen stap. Je dossier uitlezen doe je één keer en gebruik je maanden; een
brief schrijven doe je per vacature. Twee taken, twee aanroepen, en de tweede wordt er niet trager
of duurder van. Het uitlezen draait bovendien op het model dat de gebruiker heeft gekozen en niet
stilletjes op een kleiner model: de kwaliteit van die lijst bepaalt de kwaliteit van elke brief die
erna komt, en een gemist resultaat op de kaart is een zin die nooit in een brief terechtkomt.

**De standaard redeneerstand van `medium` naar `high`.** In de pijplijn staat het schrijven bewust
op `medium`, omdat een schrijfaanroep daar binnen `CALL_BUDGET_MS` moet passen en een timeout het
dubbele kost. Die rekensom geldt hier niet: dit scherm is geen taak in de wachtrij, heeft een eigen
budget van 240 seconden, en het antwoord komt woord voor woord binnen, dus wachten is zichtbaar in
plaats van stil. Bij "kwaliteit boven alles" is de duurste stand de juiste standaard.

**Wat de controle wel en niet kan, en waarom dat op het scherm staat.** Wel: of een genoemd nummer
bestaat, of de uitgekozen feiten terugkomen, en hoeveel verschillende feiten de brief draagt (onder
de vier gaat een brief meestal over houding in plaats van over wat je gedaan hebt). Niet: of de zin
die naar F7 verwijst ook echt over F7 gaat. Dat kan code niet zien. Daarom staat de bronzin per feit
op het scherm: de controle die een mens in twee seconden doet, hoeft de code niet te kunnen.

**Geverifieerd, niet aangenomen** (conventie 10): migratie 0097 is toegepast op productie en
nagerekend, en `tsc --noEmit`, `test:unit` (4639 geslaagd), `test:chain` (650 geslaagd) en `build`
zijn alle vier groen. Nog steeds ongemeten, en dat wordt met elke ronde belangrijker: er is in deze
omgeving geen OpenAI-sleutel, dus er is nog geen enkele echte uitleesronde en geen enkele echte
brief gedraaid. Wat het vangnet in de praktijk tegenhoudt, hoeveel van de aangeleverde feiten
sneuvelen op hun bronzin, is precies het cijfer dat na de eerste ronde in dit logboek hoort te staan.

---

## 15 september 2026: de feitenkaart teruggedraaid van grens naar spiegel

Een dag na het bouwen van de feitenkaart stelde de eigenaar de vraag die ik zelf had moeten stellen:
is Sol met tien documenten en een vacaturetekst niet gewoon in staat een goede brief te schrijven,
en ketenen we hem niet vast? Hij had gelijk. Dit is de correctie.

**Wat er mis was.** Het patroon komt uit `lib/pipeline/factcard.ts`, en de aanleiding daar is echt
gemeten: van 16 beweringen op een gegenereerde pagina waren er 5 verzonnen. Maar die tekst gaat
zonder tussenkomst naar de site van een klant. Niemand leest hem na, en een verzinsel is een
probleem van die klant. Hier is alles omgekeerd: de schrijver is zelf het onderwerp van de feiten,
leest elke brief voor verzending, en ziet in twee seconden of iets klopt. De grens kocht dus weinig.

Kostte wel veel, op drie manieren. Wat de uitleesronde miste was voor de brief weg, en er komen
hoogstens 60 feiten uit een dossier van tien documenten. De uitleesprompt verbiedt afleiden ("staat
er 2019 tot 2026, dan is zeven jaar ervaring een afleiding"), wat juist is voor het uitlezen maar
via de gesloten lijst ook de bríef verbood om te combineren, terwijl "zeven jaar in dezelfde rol"
precies de zin is die werkt. En een model dat per zin een nummer moet plaatsen, schrijft één
bewering per zin, dus vlakker.

**En het was erger dan ik dacht.** Bij het nakijken bleek dat `bouwInvoer()` het volledige dossier
al meestuurde NAAST de kaart. De instructie verbood dus materiaal dat er gewoon bij lag. Dat is de
slechtste van twee werelden: de volle prijs in tokens, en een rem op het beste model dat we hebben.

**Wat er nu staat.** De kaart blijft, in een andere rol:

- Uit de prompt: "de lijst is gesloten", "bestaat voor deze brief niet", en de [F]-nummers in de
  brief. In het feitenblok staan de nummers ook niet meer, anders plakt het model ze er alsnog in.
- In de prompt: dit is het concreetste materiaal, gebruik het waar het past, het dossier blijft je
  bron, en combineren mag uitdrukkelijk wel.
- De kaart is een spiegel op je dossier. Staan er na een uitleesronde drie punten met een getal in,
  dan weet je dat je dossier je te weinig munitie geeft. Dat is informatie over jou.
- De controle is verhuisd naar ná het schrijven: `lib/solliciteren/herkomst.ts` zoekt elk getal en
  elke naam uit de brief op in het dossier en de vacature. Aanwijzen achteraf kost geen enkele zin
  creativiteit; verbieden vooraf wel. Het vangt bovendien precies de categorie die echt misgaat: een
  model verzint zelden een houding, het verzint een cijfer of een werkgever.

**De controle is meteen op zijn eigen valse alarm gestuit, en dat is nuttig gebleken.** Op een
proefbrief wees hij vier namen aan: "De Vries" uit de aanhef en "Jan Willem Koopman" uit de
ondertekening. Alle vier terecht in de zin dat ze niet in het dossier staan, en alle vier volstrekt
nutteloos: je eigen naam staat zelden in je eigen CV-tekst en de ontvanger typ je zelf. Vier valse
treffers op een goede brief is genoeg om de hele controle weg te klikken, en dan vangt hij het
verzonnen bedrag ook niet meer. De aanhef en alles vanaf de afsluiting tellen daarom niet mee voor
de naamcontrole; getallen worden er wél geteld. Dat is nagemeten op de schermafbeelding en zit als
controle in `test-unit.ts`.

**Wat de controle niet vindt, staat op het scherm.** Een getal dat voluit geschreven is ("van negen
naar vijf dagen") wordt niet gevonden, want het staat als woord in de brief en misschien als cijfer
in het dossier. Een lijst die belooft alles te vinden is gevaarlijker dan een lijst die zegt wat hij
doet, dus er staat een voetnoot onder.

**Twee schermdingen die uit de schermafbeelding kwamen.** Er stond "Er ligt 119 woorden aan
brieven", dat is nu "Er liggen". En de lijsten in de linkerkolom hadden per regel twee of drie
knoppen naast de tekst, waardoor "Projectleider bij Van Dijk Installatie" over vier regels brak met
de knoppen ertussendoor. De hele regel is nu één knop: een dossierstuk opent de bewerker, een feit
klapt open met zijn bronzin en zijn acties. De kolom ging van 23 naar 26rem, en een te lange titel
krijgt drie puntjes in plaats van een tweede regel.

**Wat dit zegt over de tien conventies.** Conventie 1 (elke promptinstructie een vangnet in code)
staat nog overeind, en dat was het misverstand niet. Het misverstand was het soort vangnet: een
vangnet dat vooraf verbiedt kost kwaliteit, een vangnet dat achteraf aanwijst niet. Bij een tekst
die automatisch publiceert is het eerste de enige optie. Bij een tekst met een mens ervoor is het
tweede beter, en dat onderscheid stond nergens opgeschreven. Nu wel.

`tsc --noEmit`, `test:unit` (4646 geslaagd), `test:chain` (650 geslaagd) en `build` zijn alle vier
groen. De schermen zijn nagekeken op een echte weergave van 1440 pixels breed.

---

## 15 september 2026: het zijproject krijgt de uitstraling van LinkedIn

Op verzoek van de eigenaar is de vormgeving van `app/solliciteren/` vervangen door de ontwerptaal
van LinkedIn. Alleen `solliciteren.css` en één component zijn geraakt; er is geen migratie en geen
gedrag veranderd.

**Waarom dit mag en de vorige keuze niet meer telt.** Op 14 september was de stijl met opzet het
tegenovergestelde van ORBIT ENGINE: warm papier, een schreefletter, terracotta, zodat je in een
oogopslag zag dat je ergens anders was. Die redenering blijft kloppen, maar hij is niet de enige
mogelijke: LinkedIn is de omgeving waarin solliciteren gebeurt, en die uitstraling hier overnemen
scheelt een omschakeling in je hoofd. Het onderscheid met ORBIT ENGINE blijft even scherp, want
LinkedIn-blauw op warmgrijs lijkt net zo weinig op leiblauw op wit als papier dat deed.

**Wat er is nagebouwd, en dat is met cijfers na te meten.** Nagerekend in de browser op de
daadwerkelijk berekende stijl, niet op het oog: vlak `rgb(244, 242, 238)`, kaarten wit met
`border-radius: 8px` en `box-shadow: 0 0 0 1px rgba(0,0,0,0.08)` in plaats van een rand, knoppen
`rgb(10, 102, 194)` met `border-radius: 999px` en gewicht 600, invoervelden 4 pixels met een rand
van `rgba(0,0,0,0.6)`, verwijzingen blauw en halfvet, en 14 pixels als basismaat in plaats van 16.
Die laatste is het onopvallendste en het belangrijkste: hij bepaalt of een scherm leest als "een
website" of als "dit product".

**Twee dingen bewust niet overgenomen.** Er staat geen logo en geen woordmerk in de app: een stijl
overnemen is iets anders dan een merkteken voeren. En de huisletter van LinkedIn is niet vrij te
gebruiken, dus er staat de stapel systeemletters die hun eigen stijlblad als terugval hanteert. Dat
is ook wat een deel van hun bezoekers werkelijk ziet. **Het is een nabouw op hun publiek bekende
ontwerptaal en geen pixelkopie**; van hieruit is niet in hun schermen te kijken, dus "exact" is niet
iets wat ik kan waarmaken of narekenen, en dat hoort in dit logboek te staan in plaats van in een
belofte.

**Eén afwijking die geen smaak is.** Een aangezette gesprekspil is donkergroen en niet blauw. Blauw
is in dit ontwerp de kleur van een handeling, en "Nieuw gesprek" staat er vlak naast; twee blauwe
pillen naast elkaar lopen in elkaar over en dan lijkt de naam van je gesprek ook een knop.

**De opmaakcodes zijn uit beeld.** De drie kopjes van een antwoord (`## Vacature`,
`## Schrijfopdracht`, `## Brief`) stonden letterlijk op het scherm. Ze zijn nu echte kopjes, met de
brief op een eigen vlak. Dat is geen markdown-omzetting: binnen de brief wordt nog steeds niets
opgemaakt, want wat je ziet moet zijn wat je plakt. De kopjes zijn structuur die de prompt
voorschrijft en waar `splitsAntwoord()` op knipt, en ze komen nooit in de kopie terecht omdat die
alleen het briefdeel pakt.

**Wat deze ronde leerde over de vier controles.** Na die laatste wijziging waren `tsc --noEmit`,
`test:unit` en `build` alle drie groen terwijl de pagina een 500 gaf: `brief` werd gebruikt in een
`useMemo` die bóven zijn eigen declaratie stond. TypeScript ziet dat niet, want het gebruik zit in
een closure en pas bij het aanroepen tijdens de weergave loopt het stuk. Alleen het echt renderen
van de pagina ving dat. Conventie 10 gaat over data ("gebouwd is niet geverifieerd"); dit is
dezelfde regel voor schermen. Een schermwijziging is pas af als hij een keer getekend is.

De testtelling gaat van 4646 naar 4648. De twee erbij bewaken dat het stijlblad zijn eigen
letterstapel en zijn eigen basismaat blijft zetten, zodat een wijziging aan `globals.css` hier
niets doet. De controle op "alleen eigen tokens" en "geen component uit `@/components/`" is
ongewijzigd blijven staan en gaat nog steeds op.

## 15 september 2026: het contentplan vult zichzelf vooraf (blok A punt 1)

Na de planningsronde (zie het plan in de sessie zelf) doorgevoerd: van "de klant stelt zelf samen
uit een voorraad" naar "de app stelt voor, de klant keurt goed", precies het eerste punt van blok A
uit `docs/tasks/nova-vergelijking-verbeterpunten.md`.

**Kleiner dan gedacht.** `createPlan()` vulde al één maand zo, de voorzet: de sterkste kansen uit de
voorraad tot aan de pakketquota. Nieuw is alleen dat diezelfde regel (`bepaalVulling()`,
`lib/plan-fill.ts`, puur en getest) nu op élke openstaande maand wordt toegepast, niet meer op
precies één. `vulOpenMaanden()` (`lib/plans.ts`) is de database-kant: hij draait bij het aanmaken
van een plan én bij elke schermopening (na `syncBacklog()` in `loadPlan()`), zodat een plan
meegroeit zodra er meer gemeten is, zonder dat iemand hoeft te slepen.

**Eén regel die erbij kwam en niet in het plan stond: precies één maand tegelijk "ter_goedkeuring".**
`approveMonth()` bevorderde de volgende conceptmaand nooit, dus zonder een aanvulling zou het vooraf
vullen van alle maanden een scherm opleveren met meerdere even zware "Concept"-maanden. Nu bevordert
`bepaalVulling()` de eerste maand met inhoud naar "ter_goedkeuring", en alleen als er nog geen enkele
openstaande maand die status al draagt.

**Eén technische correctie tijdens het bouwen, ook niet in het plan.** `bepaalVulling()` kende
aanvankelijk geen begrip van "een maand zonder bruikbare kalenderdag meer" (`maandIsVol()`). Zonder
dat zou een pagina wél een `plan_month_id` krijgen maar nooit een `scheduled_for`, want
`spreadDates()` heeft voor zo'n maand geen dag meer te geven. Nieuw veld `magNogVullen` op
`OpenMaand`: staat het op `false`, dan mag er niets bij, ook al is er nog ruimte onder de quota.
Generaliseert precies de regel die `createPlan()` al had voor "maand 1 is te ver gevorderd, ga naar
maand 2" (punt 5 van `docs/tasks/opdracht-bevindingen-5-tot-9.md`) naar elke maand in de reeks.

**Nieuwe migratie 0098** (niet 0095: zie hieronder), `planned_pages.auto_placed`, additief met
default `false`. Nodig omdat er na deze wijziging geen enkele kolom meer vertelt of het systeem of
een mens een kaart in zijn maand zette; dat onderscheid is niet met terugwerkende kracht te
reconstrueren en punt 4 uit hetzelfde document (herkomst tonen) heeft het straks nodig. Toegepast op
productie via de Supabase MCP-tool en nagekeken: de kolom staat er, `boolean not null default false`.

**Het migratienummer moest verschuiven, en dat kwam pas bij het toepassen aan het licht.** Terwijl
dit werk op een eigen branch liep, landde op `main` een compleet ander zijproject
("Solliciteren", zie de eigen sectie hierboven) met migraties 0095 tot en met 0097. Een `select` op
`supabase_migrations.schema_migrations` vóór het toepassen liet dat meteen zien: productie stond al
drie migraties verder dan wat in de lokale `supabase/migrations/`-map van deze branch stond. Eerst
`main` in de branch gemerged (één conflict, in `docs/logbook.md`, twee onafhankelijke toevoegingen
onder elkaar gezet), daarna de eigen migratie van 0095 naar 0098 hernoemd, in het bestand zelf en in
`supabase/README.md`. Precies waarom conventie 10 vraagt om tegen de echte, actuele stand te
controleren in plaats van tegen wat er lokaal lag.

**Tegen echte data gecontroleerd (conventie 10), zonder productie aan te raken.** Twee echte
profielen hebben een contentplan: Fysio Centrum Utrecht en MJB Dakservice, allebei 10 pagina's per
maand, allebei met precies het patroon dat dit punt oplost: maand 1 vol (10/10, "ter_goedkeuring"),
maand 2 tot en met 12 leeg ("concept", 0 pagina's), en een voorraad die veel dunner is dan de quota
(1 respectievelijk 3 kansen). De nieuwe functie zelf is niet tegen deze klantprofielen gedraaid: dat
zou de eerste keer zijn dat het nieuwe gedrag echt gebeurt, en dat hoort bij een bewust deploy-
moment, niet bij het verifiëren van code op een branch die nog niet gemerged is. Aanbeveling: vlak na
deploy het planscherm van deze twee merken openen en controleren dat maand 2 zich vult.

Getest: `tsc --noEmit`, `test:unit` (4675 geslaagd) en `test:chain` (652 geslaagd) en `build` zijn
alle vier groen gedraaid, op de stand ná de merge met `main` (inclusief het zijproject
"Solliciteren").

## 15 september 2026: elke maand houdt zijn formaat vast, met wisselgeld (blok A punt 2 en 3)

Vervolg op punt 1 hierboven, in één keer gebouwd omdat de taakomschrijving ze zelf al aan elkaar
koppelt: "Dit maakt punt 2 pas prettig in plaats van knellend." Zonder buffer (punt 3) zou punt 2
alleen kunnen werken door een verse kans direct uit de voorraad te pakken, wat de zorgvuldige
maandvolgorde van punt 1 zou verstoren.

**Punt 3 eerst, want punt 2 heeft hem nodig.** `bepaalVulling()` (`lib/plan-fill.ts`) vult nu in een
tweede ronde, ná de echte inhoud van alle open maanden, elke maand aan tot één buffer
(`BUFFER_PER_MONTH = 1`, `lib/plan-constants.ts`). Bewust één en niet "een paar": buffers vullen
lazy bij, bij elke schermopening, dus een tweede volgt vanzelf zodra er weer voorraad is. Een buffer
krijgt geen `sort_order`/`scheduled_for` die ertoe doet: `herplanMaand()` sluit `is_buffer = true`
al expliciet uit (bestaande regel, ongewijzigd).

**Bevinding die een openstaande vraag in het taakdocument beantwoordt.** §"Open vragen voor de
eigenaar" vroeg zich af hoeveel een buffer "waard" is, in de aanname dat elke extra pagina een
echte schrijfronde kost. Dat klopt niet: `lib/plan-writing.ts` slaat `is_buffer: true` al overal
expliciet over (`if (page.is_buffer) return { schrijven: false, reden: "is_buffer" };`, van vóór
dit werk). Een buffer kost dus niets totdat hij verzilverd wordt, en op het moment dat hij verzilverd
wordt, is hij gewoon een pagina die toch al bij het abonnement hoorde. Geen afweging nodig.

**Punt 2: dezelfde soort claim als `removePage()` al deed, nu ook voor de andere twee wegen waarop
een maand kan krimpen.** Nieuwe functie `vulMetBuffer()` in `lib/plans.ts`: een voorwaardelijke
`UPDATE ... WHERE is_buffer = true` (dezelfde wedstrijdconditie-bescherming als `removePage()` al
had, en om dezelfde reden: twee gelijktijdige acties in dezelfde maand mogen nooit dezelfde buffer
allebei denken te hebben), gevolgd door een gewone `herplanMaand()`-ronde. `removePage()` zelf is
niet aangeraakt: die kopieert de vrijgekomen datum en plek al rechtstreeks naar de buffer omdat de
rest van de maand daarbij ongemoeid blijft, en dat werkt goed. De twee routes die nog niets deden:
- `moveToBacklog()` (terugslepen naar de voorraad): roept `vulMetBuffer()` aan direct na de
  bestaande `herplanMaand()` op de maand die de kaart verlaat.
- `assignToMonth()` (verplaatsen naar een andere maand): dezelfde aanroep, op de "oude" maand, in de
  tak die al bestond voor "de kaart kwam ergens anders vandaan".

Geen buffer aanwezig, of de maand heeft geen bruikbare kalenderdag meer (`maandIsVol()`): dan
gebeurt er niets, en blijft de maand een kaart korter dan zijn quota tot de eerstvolgende
schermopening. Dat is dezelfde "geen verzonnen inhoud"-regel als punt 1 (conventie 3), nu ook hier.

**Wat dit niet oplost.** Een klant die tien kaarten achter elkaar uit dezelfde maand haalt binnen
één sessie, zonder de pagina te herladen, put de buffer van die maand na de eerste keer uit; de
volgende negen krimpen de maand alsnog totdat het scherm opnieuw laadt en `vulOpenMaanden()` bijvult.
Geaccepteerd: `BUFFER_PER_MONTH` groter zetten dekt dat scenario af, maar dat is een aparte
kosten/bruikbaarheid-afweging (buffers zijn zelf gratis, maar meer buffers per maand betekent wel
dat de voorraad sneller "op" lijkt voor de klant, wat weer raakt aan punt 4 hieronder). Niet in deze
ronde aangepast; `BUFFER_PER_MONTH` staat op één plek en is met één cijfer te verhogen.

Getest: `tsc --noEmit`, `test:unit` (4688 geslaagd, twaalf nieuwe assertions voor de buffervulling)
en `test:chain` (652 geslaagd, geen scenario geraakt: alle bestaande testmerken hebben precies
genoeg voorraad om hun maanden te vullen, zonder overschot voor een buffer) en `build` zijn alle
vier groen. Geen migratie: `is_buffer` bestaat al sinds migratie 0049 en werd tot nu toe nooit
geschreven.

## 15 september 2026: nog nooit ingepland, of er bewust uitgehaald (blok A punt 4)

Laatste punt van blok A, vervolg op de drie hierboven. Nova's precedent: een apart tabblad "Not
included" met de zin "Pages you took out, and pages your ordering pushed past the monthly quota.
None of them will be written, and none of them are gone." ORBIT ENGINE krijgt geen apart tabblad,
maar hetzelfde onderscheid in dezelfde lijst: een klant opent nog altijd één voorraad, met per kaart
een label als het er een is.

**De tweede helft van Nova's zin was al gratis, en dat leidde tot de kleinste van de twee vlaggen.**
"Buiten bereik" (voorbij de twaalf maanden × pakketquota, plus buffer) hoeft nergens te worden
opgeslagen: `vulOpenMaanden()` vult sowieso elke openstaande maand tot aan zijn plafond, dus wat
er na die ronde nog in de voorraad overblijft, past per definitie nergens meer. `bepaalVulling()`
gaf dat al terug als een aantal (`restendeVoorraad`); nu geeft hij ook de bijbehorende id's
(`restendeVoorraadIds`), die `vulOpenMaanden()` doorgeeft aan `loadPlan()` en die op de kaart
uitkomen als het label "buiten bereik".

**De eerste helft ("bewust uitgehaald") kon niet uit bestaande data komen, en kreeg een nieuwe
kolom.** Migratie 0099, `planned_pages.taken_out`, additief met default `false`. `moveToBacklog()`
is de enige plek in de hele app waar een klant een kaart uit een maand haalt zonder hem af te
wijzen; die zet de vlag nu op `true`. Zodra de kaart weer ergens wordt toegewezen (`assignToMonth()`,
of automatisch door `vulOpenMaanden()`), gaat hij weer op `false`: de reden is dan verouderd.

**Bijvangst: een belofte uit migratie 0098 die nooit werd nagekomen.** Die migratie zei al
"`false` = een mens sleepte hem daar (`assignToMonth()`)" over `auto_placed`, maar de aanroep die dat
had moeten doen ontbrak. Elke kaart die een klant sinds 15 september handmatig verplaatste, bleef dus
`auto_placed: true` dragen alsof het systeem hem daar zette. Rechtgezet in dezelfde ronde als deze
migratie, `supabase/README.md` bij 0098 vermeldt de correctie.

**Geen apart scherm.** Punt 4 vraagt om zichtbaarheid, niet om een nieuwe navigatiestructuur, en de
bestaande kaart had al een opengeklapte stand met ruimte voor een extra regel (`why`, `raakt`,
`existingUrl`). `redenChip()` zet een klein label in de metaregel ("eruit gehaald" / "buiten bereik"),
`redenUitleg()` (beide `lib/plan-backlog.ts`, puur en getest) geeft bij het uitklappen de volzin,
met Nova's kernboodschap vertaald: niet weg, wacht gewoon op ruimte.

Getest: `tsc --noEmit`, `test:unit` (4694 geslaagd, zes nieuwe assertions) en `test:chain`
(652 geslaagd, geen scenario geraakt) en `build` zijn alle vier groen. Migratie 0099 toegepast via
de Supabase MCP-tool en nagekeken: de kolom staat er, `boolean not null default false`.

## 16 september 2026: het merkdossier krijgt zijn statuskaart terug (blok B, punt 9, 10, 12)

Blok B uit `docs/tasks/nova-vergelijking-verbeterpunten.md`. Drie van de vier punten kleiner dan
gedacht, want de bouwstenen bestonden al en stonden alleen op de verkeerde plek.

**Punt 9 en 12 delen dezelfde oplossing.** `ProfileReadinessPanel` (Nova's `brand.card`-model,
`assessReadiness()`) en zijn drie-fasen-voortgangsweergave bestonden al, maar uitsluitend binnen de
onboardingsessie. Nieuwe wrapper `DossierStatus` zet hem ook op `/merk/[id]/merkprofiel/bewerken`,
naast de bestaande knop "Onderzoek opnieuw". De enige echte toevoeging: die knop kreeg een
`onStarted`-callback zodat `DossierStatus` het paneel kan hermonteren (`key={ronde}`) zodra een
nieuwe onderzoeksronde begint. Zonder die schakel zou het paneel na de eerste keer "klaar" nooit
meer gaan pollen, en dus een tweede ronde niet laten zien.

**Punt 10**: nieuwe route `GET /api/profiles/[id]/export`, CSV met exact de 42 klantvelden
(`CLIENT_STEPS`, `lib/pipeline/brand-fields.ts`), niet de vijftien commerciële/contactvelden.
Nieuwe pure functie `veldAlsTekst()` in diezelfde module zet een lijst, een ja/nee-veld of een
object om naar leesbare CSV-tekst, met tests.

**Punt 11 niet gebouwd: de aanname klopte niet.** Het punt veronderstelt een "schrijf het hele
profiel opnieuw"-knop die niet bestaat. De bestaande "Onderzoek opnieuw"-knop doet iets anders (en
veiligers): alles bewaren wat een mens invulde. Nova's waarschuwing hoort bij een destructieve
knop die niemand vraagt; die bouwen om er een waarschuwing bij te kunnen zetten is de zaak
omdraaien. Blijft open tot zo'n knop ooit wél nodig is.

Geen migratie, geen datamodelwijziging: alleen hergebruik van bestaande componenten en één nieuwe
route. Getest: `tsc --noEmit`, `test:unit` (4701 geslaagd, zeven nieuwe assertions) en `test:chain`
(652 geslaagd) en `build` zijn alle vier groen.

## 16 september 2026: vier sloten om de handmatige bewerkmodus (blok C, punt 13, 14, 16, 17)

Blok C uit `docs/tasks/nova-vergelijking-verbeterpunten.md`, allemaal in en om
`content-editor.tsx` en de PATCH-route eronder (`/api/analyses/[id]/content/[pieceId]`).

**Punt 13**: een drempel vóór de bewerkmodus opent, zelfde tweeklaps-patroon als
`RerunResearchButton` elders in de app (geen modaal venster, gewoon een tweede klik).

**Punt 14**: nieuwe pure module `lib/pipeline/manual-edit-checks.ts`. Vier van Nova's vijf
controles zijn overgenomen (lege titel/H1, lege meta-title, lege meta-omschrijving, link zonder
adres); de vijfde ("belangrijkste zoekwoord") leunt op `cluster` bij gebrek aan een eigen
zoekwoordveld en slaat over als die leeg is (conventie 3). De controle rekent op de EFFECTIEVE
stand na de bewerking (bestaande velden erbij gehaald voor wat niet meekomt in de aanvraag), niet
alleen op wat er nu wordt opgeslagen.

**Punt 17**: nieuwe kolom `content_pieces.updated_at` (migratie 0100). De PATCH-route leest hem bij
het ophalen en gebruikt hem als voorwaarde bij het schrijven (`WHERE updated_at = ...`), zelfde
patroon als de buffer-claim in `removePage()` (`lib/plans.ts`): de voorwaardelijke update bepaalt
zelf of hij lukt, geen aparte lees-dan-beslis-stap die een wedstrijdconditie open laat. Bewust
alleen op deze ene route: de schrijfpijplijn heeft al zijn eigen taakvergrendeling (conventie 9),
dit is specifiek voor twee mensen die in dezelfde tekst typen.

**Punt 16** volgt uit de andere twee: de foutmeldingen van punt 14 (welke controle faalde) en punt
17 (een conflict) zijn vanzelf al specifiek, dus dit punt was vooral zorgen dat `content-editor.tsx`
die tekst ook ECHT laat zien. Bleek nodig: `problemFromResponse()` (het gedeelde
foutafhandelingspatroon) stopt een onbekende foutmelding weg onder "technische details" en toont een
generieke kop. Voor deze ene editor gebouwd om die tekst rechtstreeks als kop te tonen, in plaats van
het gedeelde component zelf aan te passen: dat raakt tientallen andere schermen en was geen
onderdeel van deze opdracht.

**Punt 15 niet gebouwd: niet van toepassing.** `content-editor.tsx` is met opzet een platte
Markdown-editor zonder werkbalk (zie het eigen opschrift van dat bestand). Er is geen rijke opmaak
die bij het opslaan verloren kan gaan, dus er valt niets vooraf over te waarschuwen.

Getest: `tsc --noEmit`, `test:unit` (4710 geslaagd, veertien nieuwe assertions) en `test:chain`
(652 geslaagd, geen scenario raakte de PATCH-route) en `build` zijn alle vier groen. Migratie 0100
toegepast via de Supabase MCP-tool en nagekeken: de kolom staat er, `timestamptz not null default
now()`.

## 16 september 2026: beheeracties, blok D (punt 18, 19, 20, 21, 22, 23, 24)

Laatste blok van de Nova-vergelijkingsronde. Drie gebouwd, één al bevestigd gebouwd, drie niet
gebouwd met een reden.

**Punt 18**: nieuwe route `POST /api/profiles/[id]/plan/requeue-overdue`, knop op
`beheer/csm-view.tsx`. Bevinding onderweg: Nova's eigen tekst ("moves the date and re-queues the
write in one step") is hier LETTERLIJK nodig, niet alleen retorisch. `app/api/cron/plan/route.ts`
haalt alleen `status = 'gepland'` op; een pagina die vastloopt in `status = 'schrijven'` (de
schrijftaak stierf) komt nooit meer aan de beurt, ongeacht de datum. Alleen de datum vooruitzetten
lost dus niets op; deze actie zet daarom altijd beide tegelijk.

**Punt 20**: de bevestigingsdialoog van "Markeer alles als geplaatst" toont nu vooraf welke
pagina's live gaan en welke blijven staan met reden, met dezelfde `kiesVoorBulk()` die de route
zelf gebruikt (geen aparte schatting die uit de pas kan lopen). Gebruikt de bestaande
`children`-slot van `ConfirmDialog`, geen nieuw scherm.

**Punt 24**: `segmentOf()` kent voor "vastgelopen" maar twee oorzaken (onderzoek mislukt, taken
mislukt), en `flagsOf()` toonde er maar één. Nieuwe vlag "Onderzoek mislukt" dekt de andere.

**Punt 19 bleek al gebouwd**: `lib/plan-bulk.ts` doet dit patroon al voor de enige bulkactie die
bestaat. Bevestigd met een blik in de code, niets aan toegevoegd.

**Drie niet gebouwd, met reden:**
- **Punt 21** (bovengrens op dure bulkacties): er bestaat geen bulkactie die geld kost. Een grens
  bouwen zou een nieuwe kostbare bulkactie veronderstellen die niemand vroeg.
- **Punt 22** (niveau-labels): de drie kandidaatvelden (`content_plans.strategy_note`,
  `topics.client_note`, `content_pieces.revision_note`) hebben niet de dubbelzinnigheid die Nova's
  voorbeeld beschrijft. **Bijvangst, groter dan het punt zelf:** `content_plans.strategy_note`
  wordt bij het aanmaken van een plan opgeslagen met de belofte "Dit gaat mee als context bij het
  opstellen", maar wordt nergens in de schrijfpijplijn ooit gelezen. Een belofte die niet wordt
  waargemaakt (`CLAUDE.md`: "schrijf nooit dat iets al kan wat nog niet gebouwd is"), niet in deze
  ronde opgelost: dat vraagt uitzoeken waar in de schrijfprompt dit hoort in te haken, een eigen
  klus.
- **Punt 23** (paginatypes per abonnement): het document zelf noemt dit al een apart besluit, met
  een open vraag of er commerciële abonnementsvormen bestaan. `planned_pages.page_type` bestaat al;
  de koppeltabel met het abonnement niet, en die zonder antwoord bouwen zou gokken.

Geen migratie. Getest: `tsc --noEmit`, `test:unit` (4712 geslaagd, vier nieuwe assertions) en
`test:chain` (652 geslaagd) en `build` zijn alle vier groen.

Met dit blok is de hele Nova-vergelijkingsronde uit `docs/tasks/nova-vergelijking-verbeterpunten.md`
doorlopen: blok A (4/4), blok B (3/4, punt 11 niet van toepassing), blok C (4/5, punt 15 niet van
toepassing), blok D (4/7, drie apart-besluit of niet-van-toepassing), blok E (4/4). Blok F
(meertaligheid, koppelingstest) staat nog open, expliciet groot en apart te besluiten.

## 16 september 2026: de plannotitie gaat eindelijk het schrijven in

Bijvangst uit blok D punt 22, apart opgelost op verzoek van de eigenaar na een gerichte vraag: klopt
het dat `content_plans.strategy_note` de content beter maakt? Antwoord: nee, want de kolom werd
opgeslagen en nooit gelezen. Een klant die bij het aanmaken van een plan intypt "vanaf november
openen we in Breda" zag die tekst in de database verdwijnen, ondanks de belofte op het scherm ("Dit
gaat mee als context bij het opstellen").

**De reparatie.** `loadContentContext()` (`lib/pipeline/content.ts`) haalt nu, naast alles wat het
al ophaalde, ook de `strategy_note` van het actieve plan van dit merk op (dezelfde
"nieuwste-niet-gestopte-plan"-query als `vulOpenMaanden()`). Die gaat als `situationalNote` mee de
schrijfopdracht in (`maakSchrijfopdracht()`, `lib/pipeline/writer-brief.ts`), met een expliciet
label: "geen nieuw feit, verzin er zelf niets bovenop". Dat laatste is geen vormelijkheid: de
schrijfopdracht mag van zijn eigen harde regels niets verzinnen dat niet op de feitenkaart staat, en
een plannotitie is nooit tegen een bron gecontroleerd. Hij stuurt de KEUZE van de schrijver (wel of
niet de nieuwe vestiging noemen, niet de oude aanraden), maar levert zelf geen citeerbare bewering.

**Waarom dit geen migratie nodig had.** De kolom bestond al sinds de eerste contentplan-migratie
(0049); alleen het lezen ontbrak. Ook geen UI-wijziging: de tekst op `create-plan-box.tsx` klopt nu
gewoon met wat er gebeurt, in plaats van eromheen gepraat te worden.

**Wat dit niet oplost.** De notitie is een momentopname van het aanmaken van het plan, niet
bij te werken zonder het hele plan opnieuw op te zetten (`strategy_note` wordt alleen bij
`createPlan()` gezet, `lib/plans.ts:433`). Een klant die drie maanden ná het aanmaken iets wil
melden, kan dat nu nog steeds niet los van een volledige herstart. Dat is een apart punt, niet in
deze reparatie meegenomen.

Getest: `tsc --noEmit`, `test:unit` (4712 geslaagd, ongewijzigd: dit raakt geen pure, testbare
functie, alleen een extra promptregel die conditioneel is) en `test:chain` (652 geslaagd) en
`build` zijn alle vier groen. Geen migratie.

## 16 september 2026: de plannotitie wordt een merkbreed, doorlopend veld (blok D punt 22)

Vervolg op de vorige invoer. Gevraagd wat Nova zelf met precies dit probleem doet: bleek exact
uitgeschreven in `docs/nova-i18n.json` onder `contentActions.rewrite`, en het is de oplossing voor
het gat dat de vorige reparatie expliciet openliet ("een klant die drie maanden later iets wil
melden, kan dat nog niet zonder het hele plan opnieuw op te zetten").

**Wat Nova doet.** Een "Content-creation note" die niet bij het aanmaken van een plan hoort maar bij
"Rewrite content", bewerkbaar op elk moment vanuit elke pagina. Drie dingen zaten er letterlijk bij:
een scope-uitleg ("This note belongs to the domain, not to the pages you rewrite"), een tekenlimiet
met reden ("a long note crowds out the brief itself"), en een eigen conflictmelding als iemand
anders 'm ondertussen wijzigde.

**Wat er nu staat.** `content_plans.strategy_note` is losgeknipt van `createPlan()`: een nieuwe
route `PATCH /api/profiles/[id]/plan/note` slaat 'm op, met dezelfde voorwaardelijke-update-
vergrendeling als punt 17 (`WHERE updated_at = ...`). Geen nieuwe kolom of trigger nodig:
`content_plans.updated_at` heeft al sinds migratie 0049 een database-trigger die hem bijhoudt, dus
deze route hoeft die kolom zelf niet te zetten, alleen te lezen en in de `WHERE` te gebruiken.
Nieuwe constante `MAX_STRATEGY_NOTE_LENGTH = 300` in `lib/plan-constants.ts`, gebruikt bij het
aanmaken én bij het bewerken, met dezelfde onderbouwing als Nova.

**Eén bewuste afwijking van Nova.** Nova slaat de notitie op ALS ONDERDEEL van het inplannen van een
herschrijving, in één klik. Hier bewust een eigen "Opslaan"-knop, los van "Schrijf een nieuwe
versie": een merkbrede instructie aanpassen mag nooit als bijverschijnsel een betaalde
AI-herschrijfronde van één specifieke pagina meetrekken. Twee aparte knoppen, twee aparte gevolgen,
in lijn met hoe de rest van de app onomkeerbare of kostbare acties altijd apart bevestigt.

**Waar het staat.** `revise-box.tsx` (het scherm waar "opnieuw schrijven" al stond) kreeg een tweede,
onafhankelijke sectie erboven: `StrategyNoteBox`, altijd zichtbaar zodra er een plan is, ongeacht of
deze ene pagina wel of niet een nieuwe versie mag krijgen (de eindpoort gaat over déze pagina, niet
over een merkbrede notitie). Verschijnt niet als er nog geen plan is: dan is er niets om de notitie
aan te hangen. `create-plan-box.tsx`'s tekst is bijgewerkt om te zeggen dat de notitie voor het hele
merk geldt en later aan te passen is, in plaats van een eenmalige invoer te suggereren.

Getest: `tsc --noEmit`, `test:unit` (4712 geslaagd) en `test:chain` (652 geslaagd) en `build` zijn
alle vier groen (`build` faalde één keer op een niet-ontsnapt aanhalingsteken in JSX, meteen
gecorrigeerd naar `&ldquo;`/`&rdquo;`, hetzelfde patroon als elders in de app). Geen migratie.

## 16 september 2026: het contentplan krijgt een kalender, een versiegeschiedenis en een exact tekort (blok A, punt 5, 6, 7, 8, 30)

De laatste vijf openstaande punten van de Nova-vergelijkingsronde. Drie gebouwd, twee bevestigd
"niet van toepassing" of "al gebouwd" na onderzoek.

**Punt 5**: `maandRegel()` (`lib/plan-read.ts`) en de tekortmelding op het bord (`plan-view.tsx`)
noemen nu het exacte aantal ("Nog 3 pagina's nodig om je pakket van 5 te halen") in plaats van
alleen te zeggen dát het tekortschiet.

**Punt 6**: nieuwe derde weergave `PlanCalendarView`, bereikbaar via `?weergave=kalender` naast
Overzicht en Plannen. Nieuwe pure module `lib/plan-calendar.ts` (`calendarDagen()`) groepeert de
pagina's van één maand per publicatiedag; de component tekent per maand een rooster van
`LAATSTE_DAG` (28, nu geëxporteerd uit `plan-schedule.ts`) dagen. Alleen-lezen: een derde plek die
ook kan plannen zou de volgorde tussen drie schermen uit de pas kunnen laten lopen.

**Punt 7**: nieuwe pagina `/merk/[id]/strategie/plan/versies` en `loadPlanVersions()`
(`lib/plans.ts`). Bleek kleiner dan gedacht: `content_plans` bewaarde elke versie al (`version`,
status `gestopt` in plaats van verwijderd), sinds de allereerste contentplan-migratie. Er ontbrak
alleen een scherm dat ze toont. Bewuste afwijking van Nova: geen goedgekeurd/afgewezen/niet-
afgemaakt-label, want `content_plans.status` legt nergens vast WAAROM een plan stopte (een nieuwe
versie stopt de oude altijd, ongeacht de reden). In plaats daarvan de feiten die er wél zijn:
hoeveel van de twaalf maanden ooit vrijgegeven zijn en hoeveel pagina's uit dat voorstel live
kwamen. Een tri-state verzinnen die de data niet draagt, is precies wat conventie 3 wil voorkomen.

**Punt 8 niet gebouwd: niet van toepassing.** `createPlan()` doet geen enkele AI-aanroep en rondt
in één synchrone aanvraag af (`syncBacklog()` en `vulOpenMaanden()` zijn allebei pure
databasebewerkingen). Er is geen fase waarin sommige maanden al klaar zijn en andere nog
"gegenereerd worden" zoals bij Nova, waar losse AI-agenten per maand een eigen strategie schrijven.

**Punt 30 bleek al gebouwd.** `SearchConsoleBox` had de gevraagde knop al: "Koppel en controleer"
(later "Opnieuw controleren") doet één echte aanvraag die `syncSearchConsole()` aanroept en het
werkelijke resultaat toont, geen aparte testknop nodig want opslaan-zonder-controle was hier al
nooit een bruikbare uitkomst.

Getest: `tsc --noEmit`, `test:unit` (4723 geslaagd, achttien nieuwe assertions) en `test:chain`
(659 geslaagd, zeven nieuwe assertions op de bestaande potentiescore-scenario, met een extra gemeten
cluster zodat er voorraad overblijft voor een tweede planversie) en `build` zijn alle vier groen.
Geen migratie: `content_plans.version`/`status` bestonden al.

Met dit blok is blok A van de Nova-vergelijkingsronde volledig compleet (8 van de 8 punten), en
staat alleen blok F (meertaligheid, koppelingstest) nog open als groot, apart te besluiten project.
## De Nova-vergelijking doorgevoerd: acht wijzigingen, en drie ervan waren gaten (16 september 2026)

`docs/nova-vs-orbit-engine-proces.md` legde het proces van InSpace Nova naast dat van ORBIT ENGINE.
Wat daaruit als voorstel kwam is deze dag gebouwd. Drie van de acht bleken bij het bouwen geen
verbetering maar een reparatie: iets dat al besloten was, deed het niet.

**De drie gaten, en ze horen bij elkaar.** `POST /api/analyses` was de enige dure route zonder
`mayTriggerCost`, terwijl `lib/cost-rules.ts` in zijn eigen toelichting schrijft dat precies die
route op 2 september 2026 dicht is gezet en `analyse_starten` sindsdien in `STAFF_ONLY_ACTIONS`
staat. Bij `/api/profiles` is die rem er die dag gekomen, hier niet. Een klant kon dus via het vrije
tekstveld op `/analyses/new` betaald onderzoek starten, terwijl hetzelfde onderwerp via het snelpad
in `topics-panel.tsx` netjes werd geweigerd. `accounts.started_at` werd door geen enkele regel in
`lib/` of `app/` geschreven, alleen gelezen door `monthsSinceStart()`, dus "maand 4 sinds de start"
stond bij elke echte klant leeg. En `loadOpenQuestions()` deed `select("*")` en gaf die rij
rechtstreeks als prop aan een clientcomponent, inclusief `raw_json` met het volledige antwoord van
OpenAI erin: hetzelfde lek waar herstelplan T8.9 twee andere paden voor repareerde, op een derde pad
dat gemist was. Alle drie zijn nu gedicht, en alle drie hebben een test die de belofte narekent in
plaats van hem te geloven. Die van de kostenrem loopt alle zes de dure routes af.

**De stille stilstand.** Een net overgedragen klant heeft nul clusters. Het overzicht zei hem
"ORBIT ENGINE is aan zet bij meten", terwijl er niets in de wachtrij stond en hij zelf niets kon
starten. Hij wachtte op iets dat nooit vanzelf kwam en niets op zijn scherm zei dat. `lib/ronde.ts`
kent daarom sinds vandaag een derde partij naast de klant en ORBIT ENGINE: bij nul clusters is de
consultant aan zet, met de zin erbij wat er daarna komt. Alleen de eerste van de zes stappen kan van
eigenaar wisselen, de andere vijf nooit. Het toewijzingsscherm waarschuwt nu vóór de overdracht als
er geen cluster staat, want dat is de plek waar het misgaat.

**Een veld dat loog, en de controle die dat voortaan vangt.** "Wat een klant ongeveer waard is" had
als omschrijving "Bepaalt hoe zwaar een onderwerp meeweegt", met pal eronder op hetzelfde scherm
"Wordt op dit moment nog niet meegewogen in de app". De eerste was de onjuiste, en
`lib/pipeline/commercial-context.ts` had al uitgeschreven waarom die nooit gaat kloppen: de
potentiescore is per onderwerp en de waardeklasse per merk, dus een factor zou elk onderwerp van een
merk even hard verschuiven en de onderlinge volgorde, het enige waar die score voor dient, niet
veranderen. Het advies uit de analyse om hem alsnog aan te sluiten was dus fout, en de code wist het
beter. Er staat nu een controle over alle 60 velden: zegt het gebruik "nog niet", dan mag de
omschrijving geen werkwoord bevatten dat iets toezegt. Dat is `CLAUDE.md`'s regel "schrijf nooit dat
iets al kan wat nog niet gebouwd is", nagerekend in plaats van afgesproken.

**Twee schermen zijn er één geworden, en twee andere delen nu hun model.** De bibliotheek bestond per
cluster én merkbreed: twee lijsten over dezelfde rijen, met twee weergaven, twee manieren om te
filteren en twee tellingen die gelijk hoorden te zijn zonder dat iets dat afdwong. Een klant met vier
clusters had er vijf. `/analyses/[id]/bibliotheek` verwijst nu door naar de merkbrede met
`?cluster=`, zodat de doorklik houdt wat hij waard was. En de briefing en "Openstaande vragen" tonen
dezelfde `fact_requests`-rijen: de briefing las `kind`, `answer_type`, `options`, `suggested_answer`
en `required`, de vragenlijst niet. Een ja-of-nee-vraag kreeg daar dus een leeg tekstvak van drie
regels en een concept-antwoord werd niet getoond, terwijl bevestigen goedkoper is dan formuleren.
`lib/feitenvraag.ts` en `components/antwoordveld.tsx` zijn nu de gedeelde helft. De componenten zelf
samenvoegen is de tweede helft en staat nog open in `docs/tasks/customer-journey-cluster-tot-schrijven.md`
punt 5: dat is een gedragswijziging en geen hernoeming.

**Wat er verder uit Nova is overgenomen.** Het kopieerformaat, en dat is de kleinste wijziging van de
acht met waarschijnlijk het meeste effect: de bibliotheek zette Markdown op het klembord, en dat is
voor zowel een WordPress-blok als een gewone editor het verkeerde antwoord. Er zijn nu drie vormen
met per vorm de reden om hem te kiezen, geschreven over het CMS van de klant en niet over het
formaat, naar Nova's *"Choose the format that matches the CMS workflow"*. En de vier lege staten van
het zoekverkeerscherm: daar stonden er twee, waarvan de tweede het werk deed van drie verschillende
problemen met drie verschillende oplossingen.

**Wat bewust níet is overgenomen** staat in hoofdstuk 9 van de vergelijking en is deze ronde niet
veranderd: automatisch publiceren, de gamificatie van hun oudere app, de chatassistent per pagina, de
meertaligheid en de contractduur. Van Nova's publicatiestap is alleen het deel genomen dat zonder
CMS-koppeling werkt, en dat was precies het kopieerformaat hierboven.

**De testtelling gaat van 4648 naar 4772**, plus de 650 ketentests die ongewijzigd zijn gebleven. De
124 erbij bewaken vooral dingen die eerder alleen in commentaar stonden: dat elke dure route dezelfde
vraag stelt, dat geen veld belooft wat zijn gebruik ontkent, en dat het ruwe AI-antwoord de browser
niet bereikt.

**En één les over de vier controles, die het logboek van 15 september herhaalt met een andere
oorzaak.** Na de laatste wijziging was `tsc --noEmit` groen terwijl `npm run build` faalde op een
cast in `scripts/test-unit.ts`. De twee kijken dus niet naar precies dezelfde bestanden. Vier
controles draaien is niet drie controles draaien plus een formaliteit.

## De lichte titel+meta-doorgang: een vollediger beeld zonder alles te lezen (16 september 2026)

Nova (InSpace) leest tijdens onboarding expliciet titels en meta-descriptions, los van en vóór de
volledige crawl (*"Reading your titles and meta descriptions…"*, `Nova_onboarding.md` §3b). ORBIT
ENGINE las de hele sitemap altijd al volledig uit (tot 10.000 URL's, migratie 0061), maar koos
daaruit de `max_inventory_pages` die écht gelezen worden puur op het URL-pad (`url-priority.ts`).
Dat gaat mis bij een generieke slug: een dienstenpagina op `/diensten/42` scoorde even laag als een
blogartikel, terwijl de titel "Vloerverwarming installeren" precies zegt waar de pagina over gaat.

**Wat er nu gebeurt.** `crawlInventory()` (`lib/crawler.ts`) doet, alleen als een site groter is dan
het plafond én er een tijdbudget beschikbaar is (dus alleen de achtergrondtaak `crawl_inventory`, niet
de snelle scan van de Sales-module die geen budget meegeeft), eerst een goedkope doorgang
(`crawlHeads()`) over tot 600 pagina's: alleen `<title>` en de meta-description, geen volledige tekst,
geen structured-data-oogst. Twee besparingen tegelijk maken dat goedkoop: een `Range`-verzoek als hint
aan de server, en het lezen van de stream stopt zodra `</head>` voorbij is, in plaats van te wachten
tot de hele pagina binnen is. Die titels en meta-descriptions gaan als extra signaal
(`UrlSignal`) in `scoreUrl()`/`selectUrls()`, met een kleiner gewicht dan het URL-pad: het pad blijft
leidend, de tekst redt of ontmaskert alleen de twijfelgevallen. Zonder signaal (de meeste aanroepen,
want deze stap draait niet altijd) verandert er niets aan het bestaande gedrag.

**Wat het niet doet.** Geen nieuwe pagina's opslaan: de lichte doorgang levert alleen een beter
gefundeerde keuze op voor de bestaande `max_inventory_pages`, niet een bredere content-inventaris.
Hoeveel pagina's meededen staat wel op het scherm (`profiles.crawl_lightly_scanned`, migratie 0101,
`InventoryBox`), zodat "we keken breder" niet stilzwijgend gebeurt.

Getest: `scoreUrl()`/`selectUrls()` met en zonder signaal, inclusief het geval waarin negen neutrale
secties een kale slug uit de top-2 duwen zonder signaal en het signaal hem er wél tussen krijgt
(`scripts/test-unit.ts`, drie nieuwe assertiegroepen). `tsc --noEmit`, `test:unit` (4851 geslaagd),
`test:chain` (659 geslaagd) en `build` zijn alle vier groen. Migratie 0101 is additief, geen
backfill: een bestaand profiel krijgt de kolom pas gevuld bij zijn eerstvolgende crawlronde.

## Het vooronderzoek: 1000 pagina's vóór de eerste diepe crawl, in eigen tempo (16 september 2026)

Vervolg op het stuk hierboven, op uitdrukkelijk verzoek van de eigenaar: niet wachten tot een latere
"Vernieuw inventaris"-ronde, maar de lichte titel+meta-doorgang al laten draaien op het moment dat
een merk wordt aangemaakt (drie velden: naam, schrijfwijzen, webadres), vóórdat de eerste diepe crawl
(`profile_discover`) kiest welke 150 pagina's hij echt volledig leest. En groter: 1000 pagina's in
plaats van 600, met tot ~10 minuten de tijd, want de klant zit er op dat moment nog niet bij.

**Het technische probleem, en waarom dit meer is dan een grotere `MAX_LIGHTWEIGHT_PAGES`.** Eén
taakaanroep mag van Vercel hooguit 300 seconden duren (`app/api/cron/worker/route.ts`). 1000 pagina's
op "normaal" tempo is daar ruim overheen. De nieuwe taaksoort `profile_light_scan`
(`lib/jobs/handlers.ts`) draait daarom in rondes van hooguit 150 seconden en plant zichzelf met een
hoger rondenummer opnieuw in zolang er kandidaten open staan, tot een veiligheidsplafond van vijf
rondes (`MAX_LIGHT_SCAN_ROUNDS`, `lib/pipeline/light-scan.ts`). De voortgang staat niet in de
taakrij zelf (die kan platformlimiet-afgebroken worden) maar in een nieuwe tabel,
`profile_page_signals` (migratie 0102): elke ronde berekent opnieuw welke van de top-1000
kandidaten daar nog geen rij hebben en scant alleen die.

**Eén aanpassing die dit pas liet werken: `crawlHeads()` bewaart nu ook een mislukte pagina.**
Tot vandaag kwam een pagina die niets opleverde (mislukte fetch, geen titel, geen
meta-description) niet in de resultaatkaart terecht — logisch voor scoren (`scoreUrl()` behandelt
"geen signaal" en "leeg signaal" toch al hetzelfde), maar dodelijk voor de herneembaarheid: een
structureel blokkerende URL zou bij ELKE ronde opnieuw als "nog niet geprobeerd" gelden, en het
vooronderzoek zou nooit klaar raken zolang er ook maar één zo'n URL in de kandidatenlijst stond.
`crawlHeads()` zet nu voor elke geprobeerde URL een rij weg, ook met `title: null, description:
null`. Voor `crawl_inventory` (de bestaande, kleinere lichte doorgang uit het vorige logboekstuk)
verandert dit niets aan het scoregedrag, wel maakt het `lightlyScanned`-cijfer daar preciezer:
"hoeveel pagina's zijn geprobeerd" in plaats van "hoeveel pagina's leverden iets op".

**Wat er gebeurt als het misgaat.** `profile_light_scan` is verrijking, geen voorwaarde: mislukt hij
definitief (na vier pogingen, `MAX_ATTEMPTS`), dan gaat de keten via `lib/jobs/chain.ts`
(`ONBOARDING_NEXT`) gewoon door naar `profile_discover`, die dan terugvalt op het bestaande
pad-alleen-gedrag. Staat er in `lib/jobs/progress.ts` (`NON_BLOCKING_TYPES`) zodat dat geen rood
kruis op het voortgangsscherm van de klant oplevert voor iets dat hij niet mist. De consultant ziet
de stap wel: `research-steps.ts` kreeg er een negende stap bij ("Je website verkennen"), en
`ONBOARDING_TAKEN` (`lib/onboarding-insight.ts`) ging van acht naar negen taken, `README.md` en
`docs/processtappen-nieuwe-pagina.md` zijn bijgewerkt.

**Waarom de taak zichzelf niet met dezelfde sleutel herplant.** De dedupe-index blokkeert een
tweede taak met dezelfde sleutel zolang de eerste nog `queued` of `running` is — en dat is de
taak zelf nog, op het moment dat hij binnen zijn eigen handler de volgende ronde probeert in te
plannen (de werker vinkt pas ná de handler af, `lib/jobs/worker.ts`). Het rondenummer zit daarom in
de dedupe-sleutel (`dedupe.profileLightScan(profileId, round)`), zodat ronde N+1 nooit tegen ronde N
aan botst.

Getest: een pure module `lib/pipeline/light-scan-select.ts` (los van `light-scan.ts`, dat
`server-only` is, zelfde reden als `crawl-urls.ts` naast `crawler.ts`) met `openCandidates()`, en
drie nieuwe assertiegroepen voor de bijgewerkte `research-steps.ts`-tests (de eerste stap is nu het
vooronderzoek, niet meer de crawl). `tsc --noEmit`, `test:unit` (4858 geslaagd), `test:chain` (659
geslaagd) en `build` zijn alle vier groen. Migratie 0102 (`profile_page_signals`) is additief en
toegepast op productie.

## 16 september 2026: het cluster van vier hoofdstukken naar één tabblad

Vervolg op `docs/tasks/clusters-resultaatscherm-vereenvoudigen.md` (16 september 2026): het
onderzoek daar signaleerde dat de vier hoofdstukken van een cluster (Stand, Waar je wint en mist,
Wat je moet doen, Opgeleverd) meerdere weergaven van dezelfde cijfers stapelden. De eigenaar koos
daarna een radicalere richting dan het document zelf voorstelde: alle cijfers over hoe een cluster
ervoor staat (score, trend, concurrentietabellen, letterlijke antwoorden) horen bij Analytics, niet
bij het cluster. Het cluster zelf wordt de plek waar een meting content wordt.

**Wat er is gebeurd.** `app/(app)/analyses/[id]/page.tsx` heeft geen hoofdstukken en geen
periodekiezer meer. Nieuwe `_chapters/inhoud.tsx` toont, in vaste volgorde: de blokkade-poort (een
harde stop, geen cijfer), een korte samenvatting (`report.summary` plus de kansen uit
`report.gaps_json` in gewone taal, zonder bewijslinks), de feitenvragen van dit cluster, en één
lijst met alle aanbevolen pagina's en optimalisaties. Die laatste lijst toont nu ELKE aanbeveling
(niet alleen de nog openstaande, zoals hoofdstuk 03 deed), met zijn status
(`lib/content-status.ts`, hetzelfde label als de bibliotheek al gebruikte) en zijn potentiescore:
de klant ziet zo in één blik wat al geschreven is, wat nog moet, en wat het oplevert.

**Wat is verhuisd, en wat niet.** De potentiescore blijft op het cluster staan, want die is nodig om
te kíezen wat je laat schrijven, geen cijfer over hoe het cluster ervoor staat. Hoofdstuk 04
("Opgeleverd") is volledig verwijderd zonder vervanging te hoeven bouwen: `docs/tasks/
analytics-herontwerp.md` V3 had de `content_impact`-cijfers al naar Analytics → Zoekverkeer
verplaatst ("Effect op AI"-kolom), dus dat hoofdstuk was al gedupliceerd. De score, de trend en de
concurrentietabellen stonden al, met een cluster-filter, op Analytics → Zichtbaarheid en →
Concurrenten. De letterlijke antwoordenlijst (`AnswersView`) heeft nog geen nieuwe plek: die is
verwijderd, niet verplaatst. Wie het letterlijke antwoord van een AI-assistent wil teruglezen kan
dat vandaag nergens meer. Het detailpaneel van Analytics → Zichtbaarheid (`Z8` uit
`analytics-herontwerp.md`) is de logische plek daarvoor, maar dat is een eigen stap.

**Verwijderd, want overbodig zonder de hoofdstukken:** `_chapters/stand.tsx`, `bewijs.tsx`,
`resultaat.tsx`, `werk.tsx`, `score-panel.tsx` (`ScoreCard`, `BrandRankingsTable`,
`CompetitorCard`, `AlsoMentionedCard`), `antwoorden/answers-view.tsx`,
`components/{trend-chart,results-panel,work-list,chapter,chapter-tabs,period-picker}.tsx`,
`lib/pipeline/{answers,periods}.ts`. Elk gecontroleerd op andere gebruiksplekken vóór verwijderen
(conventie: verwijder wat echt niets meer gebruikt, laat niets dood achter). `lib/work.ts`,
`lib/pipeline/results.ts`, `lib/chart-curve.ts`, `components/potential-metrics.tsx` en
`lib/pipeline/brand-rankings.ts` blijven: die worden nog gebruikt door het merkdashboard, de
exportroute, de Analytics-grafieken en de content-pagina zelf.

Getest: `tsc --noEmit`, `test:unit` (4858 geslaagd), `test:chain` (659 geslaagd) en `build` zijn
alle vier groen. Geen migratie: dit raakt alleen schermen en leesqueries.

## 16 september 2026: de letterlijke antwoorden terug, nu op Analytics

Direct vervolg op het vorige stuk: het cluster toont geen letterlijke antwoorden meer, en die
hadden nog geen nieuwe plek. `lib/pipeline/answers.ts` (`loadAnswers()`) is ongewijzigd
teruggezet en krijgt nu één aanroeper: nieuwe route `GET /api/analyses/[id]/answers`, met dezelfde
eigenaarscontrole als `costs/route.ts` (`getOwnedAnalysis()`), maar zonder het staff-only-slot dat
die route heeft, dit is precies de content die de klant al zag toen hij nog op het cluster stond.

Het detailpaneel van Analytics → Zichtbaarheid (Z8, `analytics-cluster-table.tsx`) haalt de
antwoorden nu pas op zodra iemand een cluster aanklikt (nieuwe client component
`components/cluster-answers.tsx`), niet vooraf voor alle clusters tegelijk: `raw_response` kan
enkele duizenden tekens per vraag zijn, en dat voor tien clusters vooraf meesturen zou de pagina
onnodig zwaar maken voor een paneel dat niemand hoeft te openen. Elke vraag staat dichtgeklapt
achter een `<details>`, met de eigen merknaam gemarkeerd via het bestaande
`components/highlighted-text.tsx`.

`docs/tasks/analytics-herontwerp.md` is bijgewerkt: het punt dat gisteren nog openstond, is vandaag
al gesloten.

Getest: `tsc --noEmit`, `test:unit` (4858 geslaagd), `test:chain` (659 geslaagd) en `build` zijn
alle vier groen. Geen migratie.

## 16 september 2026: Zoekdata in de keten, A0 en blok A

Start van `docs/tasks/zoekdata-in-de-keten.md`: Search Console en DataForSEO van meetlaag naar
stuurlaag, op verzoek van de eigenaar. Twee stukken zijn af.

**A0, de bevinding die alles blokkeerde.** Het zoekverkeerscherm gaf het volledige databereik door
aan `vergelijk()` als huidige periode. De veiligheidsklep in die functie ziet dan terecht dat de
periode ervóór per definitie buiten bereik ligt, dus `vergelijkbaar` werd nooit `true`, hoeveel data
er ook binnenkwam: alle acht de kerncijfers (onze pagina's en de rest van de site) meldden voor
altijd "geen vergelijking". Nagerekend met een reproductie op 180 dagen testdata.
`lib/search-console/metrics.ts` krijgt `vergelijkingsvenster()`: een vast venster van de laatste 28
dagen, eindigend op de laatste dag met cijfers in plaats van op vandaag. Het scherm gebruikt dit nu
voor beide vergelijkingsblokken; de "nog geen vergelijking"-tekst verwijst naar de echte vroegste
dag met cijfers (`volledigVenster()`) in plaats van naar het nieuwe, kortere venster.

**Blok A: de zoekopdrachten erbij.** Migratie 0103, `search_console_queries`, additief, zelfde
uniek-sleutel-patroon als `search_console_days`. `lib/search-console/sync.ts` haalt de zoekopdrachten
op als tweede aanroep binnen dezelfde dagelijkse `gsc_sync`-taak: geen tweede cron, geen nieuw
jobtype. Bewust best-effort: mislukt deze tweede aanroep, dan blijft de paginacijfers-sync (die de
lege staten van het zoekverkeerscherm stuurt) gewoon geslaagd, en gaat de fout niet naar
`gsc_last_error`. Nieuwe pure module `lib/search-console/rankings.ts`: de positieverdeling, "op het
randje" (positie 8 tot 20, minstens 50 vertoningen) en stijgers/dalers over twee vensters.

`lib/opportunities.ts` krijgt een vijfde bron, `zoekverkeer`: een pagina die ORBIT ENGINE zelf
schreef en die al op het randje van de eerste pagina staat. Alleen onze eigen pagina's
(`content_pieces.published_url`), niet willekeurige pagina's van de site. Geen doelvragen-getal en
geen potentiescore, want dit komt niet uit een AI-meting; het sorteerveld `share` wordt hier
hergebruikt voor de vertoningen, nooit als getal op het scherm. Gekoppeld in `lib/insights-data.ts`.

Wat nog open staat uit blok A: de vier lege staten van het zoekverkeerscherm nog niet uitgebreid met
een vijfde ("op het randje" zonder resultaten toont simpelweg niets, en dat is bewust), en de
positieverdeling/stijgers-dalers uit `rankings.ts` staan nog niet op een scherm. Beide zijn
rekenkant-af, schermwerk volgt.

Getest: `tsc --noEmit`, `test:unit` (4886 geslaagd), `test:chain` (659 geslaagd) en `build` zijn alle
vier groen.

## 16 september 2026, vervolg: het opbrengstblok op het analytics-overzicht

Hoofdstuk 7 van `docs/tasks/zoekdata-in-de-keten.md` gebouwd, op verzoek van de eigenaar: laat op
`/merk/[id]/analytics` zien wat ORBIT ENGINE daadwerkelijk oplevert aan zichtbaarheid en klikken,
zoals Nova dat doet, maar zonder Nova's zwakste gewoonte over te nemen.

**Eigen module, niet hergebruikt van het zoekverkeerscherm.** `lib/search-console/opbrengst.ts`
beantwoordt een strengere vraag dan `metrics.ts`: niet "hoe doet de site het" maar "wat mag ORBIT
ENGINE zich toerekenen". De controlegroep is hier daarom écht de rest van de site, onze eigen
pagina's eruit gefilterd, in plaats van de brede, alles-inclusief vergelijking die het
zoekverkeerscherm bewust toont als losse, gelabelde vergelijking. Twee schermen die "de rest van de
site" zeggen en iets anders bedoelen was precies het risico; ze hebben nu allebei hun eigen naam en
een commentaar dat het verschil uitlegt.

**Twee rekenregels die het cijfer eerlijk houden.** Elke pagina telt pas mee vanaf zijn eigen
publicatiedatum, ook als er al langer cijfers van die URL in de database staan (een pagina die
herschreven is, geen nieuwe). En pagina's jonger dan het vergelijkingsvenster worden apart geteld in
plaats van het gemiddelde te verdunnen: Google heeft weken nodig om een nieuwe pagina serieus te
tonen.

Het blok toont drie kerncijfers (pagina's live plus wat er in het plan staat, klikken sinds de start,
de laatste 28 dagen) en één zin die de controlegroep tegen onze eigen pagina's afzet, alleen als
beide kanten een echte vergelijking hebben en de vorige periode niet op nul klikken stond: een
percentage over "0 naar 4" is oneindig en zegt niets. Bewust geen omzet, geen tweede ranglijst, geen
gamificatie (zie hoofdstuk 9 van het plan voor de volledige lijst met wat bewust wegblijft).

Getest: `berekenOpbrengst()` heeft een eigen testgroep die de rekenfout in het eerste testscenario
zelf ving (63 versus de echte 60 dagen), en bewijst dat de controlegroep nooit onze eigen klikken
meetelt. `tsc --noEmit`, `test:unit` (4896 geslaagd), `test:chain` (659 geslaagd) en `build` zijn
alle vier groen. Geen migratie: alle gebruikte tabellen bestaan al.

## 16 september 2026, vervolg: blok B, de leverancierslaag

`lib/search-demand/` gebouwd naar het patroon van `lib/engines/`: `types.ts` (de kleine interface,
één functie), `registry.ts` (een provider alleen met beide omgevingsvariabelen, anders `null`),
`dataforseo.ts` (de adapter), `cache.ts` (eerst de cache, dan pas de leverancier, nooit dezelfde
term twee keer betalen binnen 30 dagen) en `keywords.ts` (puur, van een meetvraag naar een
opzoekbare zoekterm). Drie migraties: 0104 (`keyword_demand`, de cache, en `vendor_calls`, het
kostenlogboek los van `ai_calls`), 0105 (`profile_keywords`, welke term bij welk merk hoort en
waarom), 0106 (`profile_topics.search_volume_absolute`/`search_volume_source`, en `prompts.
volume_source` krijgt `gemeten` als derde waarde).

**De leverancierskeuze is bevestigd, de adapter zelf nog niet tegen een echt account geverifieerd.**
`dataforseo.ts` is gebouwd naar de publieke documentatie van het Google Ads Search Volume-eindpunt;
er was in deze ronde geen DataForSEO-account beschikbaar om een echte aanroep tegen te draaien. Dat
blokkeert niets, want zonder sleutel raakt de hele module nooit aan, maar de adapter zelf is pas
"af" na één echte aanroep die tegen een productieaccount is nagerekend (conventie 10). Staat expliciet
in de code als open punt.

**De belangrijkste test staat niet in `test-unit.ts`.** `registry.ts` is `server-only`, dus een
directe import crasht `test-unit.ts` (dat bestand draait bewust zonder de `server-only`-stub die
`test-chain.ts` wel heeft). Scenario 13 in `test-chain.ts` bewijst in plaats daarvan dat de app zonder
DATAFORSEO-sleutel zich identiek gedraagt aan vóór deze bouwronde, dezelfde garantie als
`enginesForProfile()` voor Gemini.

`afleidenZoekterm()` (`lib/search-demand/keywords.ts`) is bewust géén AI-aanroep: een vaste lijst
vraagwoorden eraf, de rest blijft staan. Dat werkt goed bij een vraag met één kern en matig bij een
samengestelde vraag; lukt de afleiding niet goed genoeg, dan levert de functie `null` en blijft
`volume_source` op `geschat` staan.

**Nog niet gedaan:** `keywords.ts` en `cache.ts` zijn nog nergens aangeroepen vanuit de pijplijn.
Dat is blok C (clusters, vragen en de potentiescore verankeren aan een echte meting), een eigen,
apart te bouwen en te testen stap.

Getest: `tsc --noEmit`, `test:unit` (4903 geslaagd), `test:chain` (663 geslaagd, inclusief scenario
13) en `build` zijn alle vier groen.

## 17 september 2026: blok C en D, de keten en de tekst verankerd aan een echte meting

Vervolg op `docs/tasks/zoekdata-in-de-keten.md`. Twee blokken, allebei met een bewuste grens op wat
er in deze ronde wel en niet gebeurt.

**Blok C: de clusterkeuze en het vraaggewicht.** `proposeTopics()` (`lib/pipeline/propose-topics.ts`)
zoekt voor elke voorgestelde titel een gemeten zoekvolume op via `keywordVolumes()`, met de titel
zelf als kandidaat-zoekterm (die is meestal al zoektermvormig, "wasmachine kopen" en niet een hele
zin). Het model levert dat cijfer nooit zelf aan; de koppeling gebeurt in code, na de aanroep.
`profile_topics.search_volume_index` (de 0-100 schaal die het scherm toont) blijft ongemoeid, dat is
een apart besluit.

Voor de dertig meetvragen per analyse (`lib/pipeline/prepare.ts`) geldt hetzelfde patroon, met een
nieuwe pure functie `bandFromMeasuredVolume()` in `lib/pipeline/volume.ts`: een echte meting wordt
herschaald naar de zwaarste vraag van dezelfde batch, en dezelfde 60/25-grenzen als de bestaande
`bandFromEstimate()` beslissen de band. Geen nieuwe absolute cijfers verzonnen (500 is hoog, 50 is
midden) zonder productiedata om ze tegen af te zetten; dat was expliciet de valkuil die het plan zelf
al benoemde. `afleidenZoekterm()` (`lib/search-demand/keywords.ts`, al gebouwd in blok B) levert
`null` bij een vraag die niet naar één kern te herleiden is, en dan blijft die ene vraag op
`geschat` staan.

**Blok D: het contentcontract, niet de schrijfprompt.** `lib/pipeline/content-plan.ts` haalt bij een
"verbeteren"-aanbeveling de echte zoekopdrachten op die de bestaande pagina al vertoningen
opleveren (`search_console_queries`, top acht op vertoningen), en geeft ze mee aan
`buildContentContract()`. Nieuwe `zoekopdrachtenBlok()` in `lib/pipeline/content-contract.ts` zet ze
in de prompt met de rem er letterlijk bij: sturen welke deelvraag zwaar weegt, nooit hoe de zin
klinkt, nooit letterlijk overnemen. Bewust NIET gedaan: dezelfde lijst nog een keer in
`writer-brief.ts`, want het contract heeft de prioritering al in de sectievolgorde verwerkt, en een
geheel nieuwe pagina (zonder bestaande URL) krijgt in deze ronde geen zoekwoordlaag: dat vergt de
bredere aanbodboom-naar-zoekterm-afleiding die het plan zelf al de moeilijkste stap noemt.

⚠️ **Blok D is niet "af" volgens zijn eigen maatstaf.** Het plan eist tien pagina's met en tien zonder
de zoekwoordlaag door het kwaliteitslab, met een menselijk oordeel. Dat vergt een echte, betaalde
AI-aanroep tegen een productieomgeving, niet beschikbaar in deze bouwronde. De code is gebouwd en
getest tegen de gestubde ketentest, die bewijst dat het zonder Search Console-data identiek blijft,
maar de kernvraag (maakt dit de tekst beter) is nog onbeantwoord. Staat als eerste te controleren
punt in het plan, hoofdstuk 10.

Getest: `tsc --noEmit`, `test:unit` (4912 geslaagd, met een nieuwe testgroep voor
`bandFromMeasuredVolume()` en een tekstcontrole op de rem in `content-contract.ts`), `test:chain`
(666 geslaagd, met nieuwe assertions dat `search_volume_source`/`volume_source` zonder
DATAFORSEO-sleutel op "geschat" blijven staan) en `build` zijn alle vier groen.

## 17 september 2026, vervolg: gemerged naar main en migraties op productie

`claude/nova-google-search-console-4mx1u7` is samengevoegd met `main` (merge-commit, geen
conflicten buiten het logboek zelf, dat vanzelfsprekend twee kanten op groeide). Alle vier de
controles (`tsc`, `test:unit`, `test:chain`, `build`) opnieuw groen op de samengevoegde stand.
Migraties `0103` tot en met `0106` zijn met de Supabase-tool op productie toegepast
(`search_console_queries`, `keyword_demand`, `vendor_calls`, `profile_keywords`,
`profile_topics.search_volume_absolute`/`search_volume_source`, de uitgebreide
`prompts.volume_source`-constraint) en nagerekend: vier nieuwe tabellen, twee nieuwe kolommen, één
aangepaste constraint, allemaal aanwezig. De twee nieuwe INFO-meldingen van de beveiligingsadviseur
(`keyword_demand` en `vendor_calls` zonder select-policy) zijn bewust zo, hetzelfde patroon als
`ai_calls` en `staff_users`: alleen de service-role leest ze.

**De openstaande punten staan op drie plekken, met één eigenaar per feit.** De volledige toelichting
in `docs/tasks/zoekdata-in-de-keten.md` hoofdstuk 10 ("Nog open"): de DataForSEO-adapter is nog niet
tegen een echt account geverifieerd, en blok D (de zoekwoordlaag in het contentcontract) heeft zijn
eigen kwaliteitscriterium (tien pagina's met en tien zonder door het kwaliteitslab, met een mens die
meeleest) nog niet gehaald, allebei omdat er geen productieomgeving met echte sleutels beschikbaar
was tijdens het bouwen. Een korte verwijzing daarnaartoe staat bij sprint 8 van
`docs/tasks/ontwikkelplan-visie.md`, zodat het ook zichtbaar is voor wie het sprintoverzicht leest
zonder het losse plan te openen.

## 17 september 2026, stap 1 van de redesign: de tokenlaag is die van OKX

Het tokensysteem van de NOVA-workspace van InSpace is eruit en dat van OKX (`okd`) is erin. Dit is
de eerste van elf stappen; het volledige blueprint met de verantwoording per waarde staat in
`redesign2026.md`.

**Waarom nu.** `docs/designsystem.md` §9b legde op 17 augustus 2026 vast dat het fundament van de
vormgeving uit het product van een directe concurrent kwam, en dat er een uitspraak van de eigenaar
nodig was. Die uitspraak is er nu: de vormtaal wordt die van OKX. Dat is geen concurrent en zal dat
nooit worden, want zij zijn een cryptobeurs. De vraag die §9b eigenlijk stelt ("is dit uiterlijk van
óns") blijft open, en dat staat zo in `redesign2026.md` §13.1 opgeschreven zodat het niet opnieuw
insluipt.

**Wat er in deze stap veranderd is: kleur, letter, beweging en schaduw. Verder niets.** Radius,
maatvoering en de 59 componentklassen staan nog op hun oude waarden. De app is nu dus lelijk maar
volledig werkend, en dat is met opzet: zo is deze stap op zichzelf terug te draaien. Twee bestanden
zijn aangeraakt, `app/globals.css` en `app/layout.tsx`.

**De cijfers.** Het nieuwe systeem is afgeleid uit 1.135.435 bytes gecompileerde CSS van negen
stylesheets van okx.com, opgehaald op 17 september 2026. Hun `okd`-systeem draagt 3.561 custom
properties, waarvan 378 semantische kleurtokens in twee volledige standen; 678 daarvan verschillen
per stand. De lichte stand hoefde dus niet verzonnen te worden, die hebben zij zelf.

**De vier verschuivingen die het meeste doen.** De grond gaat van wit naar `#f6f6f6` in licht en van
`#121a22` naar `#000000` in donker, met de kaart er los boven in plaats van dezelfde kleur met een
randje. De neutralen verliezen hun blauwzweem (`#17212b` was blauwzwart, `#000000` is zwart). Het
paars `#8511d9` wordt limoen `#bcff2f` in donker en donkergroen `#2b6d17` in licht, want limoen op
wit haalt 1,2:1 en is onleesbaar; dat is OKX' eigen oplossing. En tekst gaat van drie naar vijf
niveaus, omdat de oude laagste (`#788795`) op wit maar 3,7:1 haalde en er dus geen bruikbare trede
tussen bodytekst en onleesbaar zat.

**Zeven betekenissen zijn er vier geworden.** `intelligence` is het accent, `growth` is richting
geworden (stijgen en dalen staan los van succes en fout, want een dalende zichtbaarheid is geen
foutmelding), `information` is grijs in plaats van blauw zoals bij OKX, `attention` ging naar het
accent omdat zijn enige gebruiker het woord "kans" is en een kans geen waarschuwing is, en `premium`
had nul gebruikers en is weg.

**Eén plek waar afwijken van OKX beter was dan volgen.** Hun stijg- en daalkleuren halen in de
lichte stand geen AA voor tekst onder 18 pixels: `#31bd65` op wit is 2,44:1 en `#eb4b6d` is 3,65:1.
Bij hen geeft dat niet, want daar staat een koers groot en dik en geldt de grens van 3,0:1. Bij ons
komt die kleur op een verschilpercentage van 14 pixels in een tabelcel en geldt 4,5:1. Daarom zijn
er twee tokens bij die OKX niet heeft, `--trend-up-text` (`#1d7a3f`, 5,4:1) en `--trend-down-text`
(`#c22a48`, 5,7:1), voor tekst; de gemeten kleur blijft voor vlakken, lijnen en grafieken.

**Het lettertype is Archivo en dat is gemeten, niet gekozen.** OKX schrijft in OKX Sans, van CoType
Foundry en commercieel gelicentieerd, dus dat kan niet mee. Acht vrije letters zijn opgehaald en met
fontTools tegen de metriek van het echte bestand gelegd (x-hoogte 0,510 em, kapitaalhoogte 0,700 em,
cijferbreedte 0,600 em). Archivo wint op 2,2% gemiddelde afwijking mét het juiste karakter: allebei
neo-grotesk. Manrope zat met 1,9% dichter op de cijfers maar is geometrisch en leest zichtbaar
anders. Inter, de veelgenoemde gok, staat zevende van de acht. Let op: OKX Sans is tabulair van
zichzelf (`zero` en `one` zijn allebei 600 eenheden) en Archivo niet, dus elk getal in deze app
heeft vanaf nu expliciet `font-variant-numeric: tabular-nums` nodig.

**De aliassenlaag is tijdelijk en staat er met opzet.** 101 oude tokennamen worden gebruikt in de
klassenlaag en in 249 tsx-bestanden. Ze wijzen nu via `var()` naar hun nieuwe tegenhanger, zodat er
niets breekt terwijl de rest volgt. Omdat het verwijzingen zijn en geen kopieën, hoeven ze niet in
de donkere blokken herhaald te worden en is er dus niets om uit elkaar te laten lopen. Ze verdwijnen
per stuk zodra hun laatste gebruiker om is, in stap 2 en stap 10.

**Twee dingen die alvast weg zijn omdat ze anders kapot ogen.** Het glas op de kaarten
(`backdrop-filter`) is uitgezet via de tokens: een doorschijnend vlak van 72% hoort niet in een
systeem dat met randen werkt. En het stippenpatroon op de werkruimte is verwijderd, want de stippen
hadden een vaste kleur (`#e4e9ee`) die op het koele leiblauw was afgestemd en op de nieuwe neutrale
grond een zichtbaar blauwe spikkel werd.

Getest: `tsc --noEmit`, `test:unit` (4912 geslaagd), `test:chain` (666 geslaagd) en `build` zijn
alle vier groen. Nagerekend op de gebouwde CSS: de elf kernkleuren van het Nova-palet (`#8511d9`,
`#17212b`, `#f8fafc`, `#37941c`, `#e7edf2`, `#788795`, `#43505d`, `#c2ccd6`, `#ad45ff`, `#b9efa3`,
`#e4e9ee`) komen alle elf nul keer voor, en de nieuwe waarden wel. Het zijproject
`app/solliciteren/` draagt uitsluitend eigen `--sol-*`-tokens en is niet aangeraakt.

## 17 september 2026, stap 2 van de redesign: de componentklassen

De 59 klassen in `app/globals.css` staan op de specificatie van OKX. Dit is de tweede van elf
stappen; stap 1 (de tokenlaag) staat hierboven.

**Dit was het kijkmoment van het hele traject en dat is met opzet zo gepland.** Na deze stap is het
uiterlijk in grote lijnen beslist, zonder dat er één scherm is aangeraakt: `.card` staat in 117
bestanden, `.mono-label` in 126, `.chip` in 68, `.btn-*` in 53 en `.field` in 48. Die gingen alle
vijf in één beweging mee.

**De radiusschaal botste op naam en dat is in twee fasen opgelost.** OKX' schaal is 2/4/6/8/10/12,
de oude was 2/4/6/8/12/16/24, en `--radius-sm` betekende in de ene 6 pixels en in de andere 2.
Eerst is dus elke oude naam naar een tijdelijke naam op zijn wáárde gebracht, en daarna naar de
nieuwe naam met diezelfde waarde: 164 verwijzingen in 60 bestanden, zonder dat er één pixel
verschoof. 12, 16 en 24 vielen daarbij alle drie samen op 12, want ronder dan dat bestaat niet meer.

**De vier wijzigingen die je meteen ziet.** De kaart verliest zijn glaslaag en zijn schaduw en gaat
van 12 naar 8 pixels rond; wat overblijft is een dekkend vlak met één rand, en dat werkt alleen
omdat stap 1 de grond al van de kaart heeft losgetrokken. De knop wordt weer een pil, want
`--okd-button-lg-border-radius` is bij OKX 60 in hun hele productomgeving en alleen hun expliciete
`rect`-variant is 4 of 8. De chip gaat van 6 naar 4 pixels rond. En "vet" is overal gewicht 500
geworden.

**Dat laatste is de grootste enkele verschuiving en hij is uit stap 9 naar voren gehaald.** OKX
gebruikt nergens 600 of 700 voor tekst binnen een regel; alleen hun twee grootste koppen gaan naar
600. In de klassenlaag was dat een kwestie van veertien regels, maar in de schermen stonden nog 88
keer `font-semibold` en twee keer `font-bold`. Die zijn meegenomen: zonder die veeg zou stap 2 er
niet uitzien als OKX, en dan is het kijkmoment waardeloos. Nagerekend op de gebouwde CSS is
`.type-hero` (36 pixels, OKX' `heading-xl`) nu de enige regel van ORBIT ENGINE zelf die nog op 600
staat. De twintig andere 600's komen uit `app/solliciteren/`, dat eigen `--sol-*`-tokens draagt en
niet is aangeraakt.

**De mono is uit de labels.** `.mono-label`, `.type-lead`, `.type-label` en `.auth-eyebrow` stonden
in de monospace met brede letterspatiëring. Dat was in augustus 2026 nagerekend tegen Nova, die het
in hun product inderdaad doet. OKX doet het niet: hun hele interface staat in één familie en cijfers
krijgen daar de tabulaire variant van diezelfde letter in plaats van een tweede lettertype.
`--font-mono` blijft bestaan en heeft nog precies één gebruiker, `.prose code`, en dat is waar mono
voor is. De labels gaan daarbij van 11 naar 12 pixels en van `--text-muted` (3,7:1) naar
`--text-subtle` (7,1:1 in donker, 6,5:1 in licht).

**De glaslaag is compleet verdwenen, met drie uitzonderingsblokken erbij.** Er stonden er drie die
het effect weer uitzetten: als de browser `backdrop-filter` niet kan, als iemand minder
doorzichtigheid vraagt, en op een telefoon. Die machinerie bestond om een effect te repareren dat
OKX helemaal niet heeft; in hun 1.135.435 bytes CSS komt geen enkele `backdrop-filter` voor. Weg
zijn dus vier tokens, drie blokken en een toegankelijkheidsprobleem dat nu niet meer opgelost hoeft
te worden.

**Twee vaste hexkleuren zijn eruit.** `.chip` droeg `color: #dbcce7` en er stonden twee
donkere-stand-uitzonderingen voor `.chip-attention` en `.chip-danger`, alle drie omdat de chiptekst
op zijn eigen vlak net geen 4,5:1 haalde. Dat probleem bestaat niet meer: de
`--intent-*-content`-tokens zijn per stand tegen hun eigen oppervlak doorgerekend. Geteld na afloop
houdt `app/globals.css` nog precies één losse hexwaarde buiten de tokendefinities over: het witte
papier in de printstand, en daar bestaat geen token voor.

**De inlogroute gebruikt nu de gewone schaal.** Het veld en de knop staan op 48 pixels, en dat is
niet langer een eigen uitzondering maar precies OKX' maat `lg` (13 + 13 + 20 + 2). Dat was het hele
punt van `docs/designsystem.md` §9b over de inloguitzondering: hij mag bestaan zolang hij niets
nieuws introduceert. De kaart gaat van 520 naar 480 pixels en verliest zijn schaduw; hij staat op
`--bg-stage`, en dat is in beide standen een andere kleur dan de kaart zelf.

**Eén detail dat later pijn had gedaan.** Het veld op het inlogscherm staat nu op 16 pixels in
plaats van 15. Safari op iOS zoomt de hele pagina in zodra een veld met minder dan 16 pixels focus
krijgt, en daar komt de bezoeker niet vanzelf uit. Op het scherm dat in de sales-led opzet vaak het
eerste beeld in een demogesprek is, is dat precies de verkeerde plek om dat te laten gebeuren.

Getest: `tsc --noEmit`, `test:unit` (4912 geslaagd), `test:chain` (666 geslaagd) en `build` zijn
alle vier groen. Nagerekend op de gebouwde CSS: de radiusschaal is letterlijk die van OKX
(2/4/6/8/10/12 plus 60), `9999px` komt nul keer voor, en van de gewichten staat alles op 500 of
lichter op `.type-hero` na. 93 bestanden gewijzigd.

## 17 september 2026, stap 3 van de redesign: vijf componenten en een etalage

De componenten die het nieuwe systeem nodig heeft en die er nog niet waren: `Tabs` en `Segment`
(`components/tabs.tsx`), `FilterChip` (`components/filterchip.tsx`), `Drawer`
(`components/drawer.tsx`) en `DataCard` (`components/data-card.tsx`). Hun vorm staat in
`app/globals.css`, hun gedrag in de componenten zelf.

**Tabbladen zijn twee componenten geworden en geen `variant`-prop.** Een onderstreepte tab zegt "je
bent hier" en hoort bij navigatie; de terugknop brengt je terug. Een segment zegt "zo kijk je ernaar"
en verandert het beeld zonder dat je van plek wisselt; de terugknop doet daar niets. Waar die twee
door elkaar lopen weet niemand meer wat de terugknop doet, en dat is een ontwerpbeslissing en geen
stijl. Vandaar twee componenten.

**De lade vervangt `DetailPanel`, maar nog niet in de schermen zelf.** `DetailPanel` liet de tabel
ernaast krimpen, en dat werkte zolang een tabel vier kolommen had. Met de bredere opmaak van stap 4
valt bij krimpen precies de kolom weg waar je op klikte. De lade schuift eroverheen, vergrendelt de
scroll van de pagina eronder (anders verlies je alsnog je plek in de lijst, precies het probleem dat
hij moet oplossen) en wordt onder 768 pixels een blad van onderen met een sleepgreep. De vijf
bestaande gebruikers van `DetailPanel` gaan in stap 10 om.

**De datakaart draagt drie regels uit `CLAUDE.md` in zijn vorm.** `waarde={null}` levert een liggend
streepje met "nog niet gemeten" op, nooit een nul: een nul is een meting die zegt dat het merk
nergens genoemd wordt, leeg is een meting die niet bestaat (conventie 3). Er is een veld
`toelichting` voor het gevolg van het cijfer naast het cijfer zelf. En de hiërarchie komt van de
MAAT en niet van het gewicht, 24 pixels naast 12: dat is wat OKX doet en het is het verschil tussen
een kaart die leest als data en een kaart die schreeuwt.

**Er is een scherm bijgekomen dat niet in het plan stond: `/beheer/designsysteem`.** Vijf
componenten bouwen die nergens gebruikt worden is precies het soort werk dat er groen uitziet en
fout kan zijn, en `CLAUDE.md` conventie 10 zegt het onomwonden: gebouwd is niet geverifieerd. Voor
rekenkunde is er `test-unit.ts`; voor vormgeving bestond die controle niet. Tot nu was de enige
manier om de vormgeving na te kijken het doorklikken van vijftig schermen, en dan mis je per
definitie elke staat die er op dat moment toevallig niet is: uitgeschakeld, bezig, leeg, fout.

Op dat scherm staat elk token, elke klasse en elk component in al zijn staten naast elkaar, in beide
standen. Het is daarmee ook het antwoord op de vraag die na stap 1 en 2 open bleef: hoe ziet dit er
eigenlijk uit. Intern, `isStaff`, en een 404 bij een gewone gebruiker, hetzelfde patroon als
`/beheer`.

**Hij staat bewust niet in de zijbalk, en dat is een besluit.** `lib/nav.ts` heeft een grens van
negen bestemmingen onder Admin (`GRENS_PER_HOOFDSTUK`), met vijf gedocumenteerde uitzonderingen die
elk dezelfde toets moesten doorstaan: is dit een soort werk dat er nog niet stond. De testsuite
handhaaft die grens en sloeg bij de tiende bestemming meteen aan, precies zoals bedoeld. Een etalage
voor een verbouwing is die zesde uitzondering niet waard; hij is per adres bereikbaar en dat is
genoeg. Na stap 11 kan opnieuw gewogen worden of hij een vaste plek verdient.

**Twee dingen die de testsuite ving en die ik anders had gemist.** Behalve de grens hierboven ook de
regel dat elk scherm met data een `loading.tsx` hoort te hebben: zonder die wachtvorm laat Next.js
bij een klik de oude pagina staan tot de nieuwe klaar is, en dat leest als een app die hangt in
plaats van een app die laadt.

Getest: `tsc --noEmit`, `test:unit` (4913 geslaagd, één meer dan hiervoor omdat de nieuwe route zelf
wordt getoetst), `test:chain` (666 geslaagd) en `build` zijn alle vier groen. De route bouwt op
5,44 kB.

## 17 september 2026, stap 4 van de redesign: de desktopopmaak

De bovenbalk, de zijbalk, de mobiele lade en de drie inhoudsstanden staan op de maatvoering van
OKX. Dit is de vierde van elf stappen; na deze stap is het hele skelet om, zonder dat er één scherm
inhoudelijk is aangeraakt.

**De bovenbalk gaat van 61 naar 48 pixels, GEMETEN** (`--global-header-height`). Hij verliest zijn
vervaging: `bg-base-blur` plus `backdrop-blur-md` was een doorschijnende balk boven een tabel die
eronder doorschuift, en dat is precies waar het effect onrustig wordt. OKX heeft nergens een
`backdrop-filter`, dus de balk is nu dekkend. Vijf plekken droegen dezelfde constructie met de hand
opgebouwd (`analytics-filters.tsx`, `analytics-table.tsx`, `section-rail.tsx`, `brand-wizard.tsx`,
`confirm-bar.tsx`) en zijn meegenomen, want het was hetzelfde patroon vijf keer herhaald.

**Er is een nieuw component: `.icon-btn`.** Vier bestanden bouwden onafhankelijk van elkaar dezelfde
knop van 36 pixels met de hand op (`preview-toggle.tsx`, `profile-menu.tsx`, `theme-toggle.tsx`,
plus de knoppen in `workspace-chrome.tsx` zelf). Dat is precies het soort herhaling die `docs/designsystem.md`
§8 regel 1 bedoelt. Hij is nu 32 pixels als standaard, met 24 en 40 als varianten, en op een
telefoon minstens 44 volgens `redesign2026.md` §8.12.3.

**De inhoud kreeg drie standen in plaats van één vaste breedte.** De pagina stond op `max-w-5xl`
(1024 pixels), gecentreerd, op élk scherm: dat was de kern van wat er aan de desktopervaring
schortte. Nu kiest een pagina met een marker in zijn eigen inhoud (`.wil-lezen`, `.wil-data`) en
leest de wikkel dat met `:has()`. Die constructie is bewust gekozen boven een breedte-prop door de
hele shell heen, want dat raakt vijftig `page.tsx`-bestanden voor een keuze die puur vormgeving is.
Valt `:has()` weg in een oudere browser, dan blijft de standaardbreedte van 1440 staan: minder breed,
niet kapot.

**De actieve staat in de zijbalk is wezenlijk veranderd.** Hij was een gevuld blok in `--bg-elevated`.
Dat wordt een lichte waas plus een streep van twee pixels links, hetzelfde patroon als de gekozen
filterchip en de gekozen regel in een menu uit stap 3: de staat is een rand of een streep, nooit een
kleurvlak. Een gevuld blok in een kolom van twintig bestemmingen leest als een knop en niet als "je
bent hier".

**De hoofdstukkop is lichter geworden dan zijn kinderen, en dat is met opzet omgekeerd.** Hij stond
op 15 pixels, gewicht 600, in `--text-primary`, dus zwaarder dan de bestemmingen eronder. Bij OKX is
zo'n kop klein en gedempt (`heading-overline`, 12 pixels, gewicht 500) en zijn de regels eronder de
hoofdzaak. De inspringing onder de kop is meeverschoven van 28 naar 24 pixels, want die volgt de
breedte van het icoon plus de tussenruimte en beide zijn kleiner geworden.

**De zijbalk staat op de grond van de pagina en niet meer op een grijzere kunstgreep.** Tot deze stap
kregen de werkruimte en de mobiele lade `--bg-muted` in plaats van `--bg-base`, om de rand van een
witte kaart op een witte pagina zichtbaar te houden. Sinds stap 1 zijn pagina en kaart al twee
verschillende kleuren, dus die kunstgreep is overbodig geworden en eruit.

**Twee dingen die de aliassenlaag uit stap 1 zichtbaar maakten.** `--bg-base-blur` had na deze stap
geen enkele gebruiker meer over en is verwijderd. En `--wash-hover` (de hover op de vragenteller) is
naar zijn canonieke naam `--interactive-hover` gebracht, samen met een radius die van de oude 8 naar
de nieuwe 4 pixels ging.

Getest: `tsc --noEmit`, `test:unit` (4913 geslaagd), `test:chain` (666 geslaagd) en `build` zijn
alle vier groen, op een schone `.next`. Nagerekend op de gebouwde CSS: `--header-h` is 48px,
`--sidebar-w` is 240px, `--sidebar-w-collapsed` is 56px, en geen enkel eigen bestand (het zijproject
uitgezonderd) draagt nog een `backdrop-filter` of het patroon `h-9 w-9` behalve de decoratieve
uitlegtegel op `/support`, die geen navigatieknop is en dus terecht ongemoeid bleef.

## 17 september 2026, stap 5 van de redesign: de apparaatdetectie

De server weet nu of een bezoeker op een telefoon zit, vóór er één component rendert. Dit is de
vijfde van elf stappen en de eerste van het mobiele spoor; er verandert nog niets aan hoe een scherm
eruitziet.

**De aanpak staat in `redesign2026.md` §8.12.6: een header in `middleware.ts`, gelezen met
`headers()` in `lib/apparaat.ts`.** Geen client-hook die na de eerste tekening alsnog van vorm
wisselt, geen dubbele render die een tabel van tweehonderd rijen twee keer in de HTML zet. De
useragent staat al in het verzoek dat de middleware toch al voor de sessie afhandelt, dus dit kost
geen extra netwerkronde.

**De pseudocode uit het plan bleek onjuist, en dat is tijdens het bouwen gecorrigeerd.** Er stond
`response.headers.set("x-apparaat", ...)`. Dat zet een REACTIE-header: zichtbaar voor de browser,
onzichtbaar voor `headers()` in een servercomponent tijdens hetzelfde verzoek. `next/headers` leest
de headers van het inkomende verzoek zoals de middleware ze doorgeeft, niet wat er uiteindelijk naar
de browser gaat. De echte uitvoering zet `x-apparaat` op een kopie van `request.headers` en geeft
die aan elke `NextResponse.next({ request: { headers } })` mee die `updateSession` bouwt, ook de
herbouwde reacties in het cookie-pad. `lib/supabase/middleware.ts` kreeg er daarom een tweede,
optioneel argument bij; de enige aanroeper (`middleware.ts`) geeft het altijd mee.

**Dit is nagerekend en niet aangenomen, conform `CLAUDE.md` conventie 10.** Een script riep
`middleware()` rechtstreeks aan met drie useragents tegen `/markt/[slug]` (de enige onbeschermde
route, want een beschermde route levert bij een testverzoek zonder sessie een omleiding op en dan
wordt de header nooit gezet) en las de resulterende `x-middleware-request-x-apparaat`-header:

| Useragent | Uitkomst |
|---|---|
| iPhone | `telefoon` |
| Desktop Chrome | `computer` |
| iPad | `computer` |

Dat laatste is met opzet: `redesign2026.md` §8.12.5 zegt dat de tussenstand tussen 768 en 1024
pixels de desktopopmaak is met de zijbalk ingeklapt, geen derde ontwerp. Alleen `device.type ===
"mobile"` telt als telefoon.

**Een tweede, permanente verificatie staat nu in `/beheer/designsysteem`.** De pagina toont bovenaan
wat `isTelefoon()` voor het huidige verzoek teruggeeft. Zonder een zichtbare plek was de eerste keer
dat een echte bug hierin was opgevallen pas in stap 6 of 7, wanneer er al schermen op leunen; nu is
het in één oogopslag te zien.

**De `Vary: x-apparaat`-regel op `/markt/[slug]`** staat in `next.config.ts` als `headers()`-functie,
want een header vanuit een paginacomponent zetten kan niet in de App Router. De pagina gebruikt
`isTelefoon()` op dit moment nog niet (hij staat in groep A van §8.12.2 en toont op beide apparaten
hetzelfde), dus dit is voorwaarts geschreven: een vangnet voor als er ooit een cachelaag bij komt die
`dynamic = "force-dynamic"` niet al had uitgezet.

Getest: `tsc --noEmit`, `test:unit` (4913 geslaagd), `test:chain` (666 geslaagd) en `build` zijn
alle vier groen. Het verificatiescript is na gebruik verwijderd, het draaide buiten de teststack om
en had daar geen taak.

## 17 september 2026, stap 6 van de redesign: de mobiele opmaak

Een telefoon navigeert nu via een eigen scherm en niet via een uitklapbare kopie van de zijbalk.
Dit is de zesde van elf stappen en de eerste die daadwerkelijk iets anders laat zien op een telefoon
dan op een computer.

**Drie nieuwe componenten, en ze staan samen precies waar `redesign2026.md` §8.12.4 ze plant.**
`BottomNav` (de onderbalk, vijf posities), `MeerBlad` (het blad achter "Meer") en `MobileTopbar` (52
pixels, terugknop, titel, één knop). `AppShell` is `async` geworden om `isTelefoon()` (stap 5) aan te
roepen, en `WorkspaceChrome` vertakt volledig op dat ene booleaans: twee complete, losse opbouwen in
plaats van één opbouw die op smallere schermen inschikt.

**Het "Meer"-blad hergebruikt `Drawer` uit stap 3, in zijn mobiele stand.** Een blad van onderen is
een blad van onderen, of het nu de details van één tabelrij draagt of de rest van de navigatie.
Dezelfde sleepgreep, dezelfde animatie, dezelfde toetsenbordafhandeling: twee keer diezelfde overlay
bouwen was precies de herhaling die `docs/designsystem.md` §8 regel 1 verbiedt.

**De pseudocode voor de schermtitel bleek bij het testen fout, en dat is meteen gecorrigeerd.**
`titelVoorPad()` moest een titel vinden zonder een van de vijftig `page.tsx`-bestanden aan te raken,
en hergebruikte daarvoor eerst `navActief()`, dezelfde functie als de zijbalk. Een test tegen een
echt pad (`/merk/x/strategie/plan/versies`) liet meteen zien waarom dat de verkeerde strengheid is:
`navActief` is met opzet strikt exact, juist om te voorkomen dat twee buurbestemmingen in de zijbalk
tegelijk oplichten. Voor een titel werkt die strengheid averechts: een dieper scherm zonder eigen
menu-item toont dan liever de titel van zijn ouder dan niets. De functie gebruikt nu `isActive()`
(voorvoegsel) met "langste match wint", en is met vier paden nagerekend, waaronder het geval dat de
eerste versie fout had:

| Pad | Titel |
|---|---|
| `/merk/x` | Hoe sta je ervoor |
| `/merk/x/strategie/plan/versies` | Contentplan (geen eigen item, erft van de ouder) |
| `/sales/prospects/xyz` | Prospects (idem, in de Sales-sectie) |
| `/instellingen` | geen titel: geen enkele bestemming begint hiermee |

**De onderbalk verschuift met het pad en niet met de rol.** Een salesmedewerker kan ook een merk
bekijken (staff ziet alles), en dan is "waar sta ik nu" een betere leidraad dan "wat ben ik meestal".
`pathname.startsWith("/sales")` beslist dus, dezelfde soort regel als de zijbalk al gebruikt voor
zijn actieve staat.

**Drie functies die los in de desktop-bovenbalk stonden zijn niet stilzwijgend verdwenen.** De
wisselknop naar de klantweergave, de link naar het zijproject en de link naar support stonden geen
van drieën in het `lib/nav.ts`-datamodel (het zijn losse `Link`s direct in `workspace-chrome.tsx`),
dus ze verschenen niet vanzelf in het "Meer"-blad zoals de rest van de navigatie dat wel doet. Alle
drie hebben nu een eigen plek gekregen: de wisselknop naast de merkkiezer, de andere twee in een
eigen blok boven de gegroepeerde navigatie.

**Drie nieuwe pictogrammen, voor de Sales-onderbalk.** `markten` (Map), `bedrijven` (Building2),
`verstuurd` (Send). De sidebar geeft alleen zijn zeven hoofdstukken een icoon (`lib/icons.ts` regel
4), maar een tabbalk van vijf posities werkt zoals elders zo'n balk werkt: elke positie draagt er
zelf een. `markten` is bewust een andere tekening dan het bestaande `offsite` (ook `Globe`-achtig
maar een andere betekenis), om twee betekenissen nooit op elkaar te laten lijken.

**Eén letterlijk punt uit `redesign2026.md` is bewust niet gevolgd.** Het plan noemt "pictogram
gevuld in plaats van lijn" voor de actieve staat als OKX' eigen patroon. Deze app tekent uitsluitend
in Lucide's lijnstijl (`docs/merkstrategie.md` §15.1 verbiedt gevulde vlakken met zoveel woorden, en
Lucide levert hier ook geen gevulde tegenhangers voor). De actieve staat blijft dus het kleur- en
gewichtsverschil dat dit hele systeem al overal gebruikt.

Getest: `tsc --noEmit`, `test:unit` (4913 geslaagd), `test:chain` (666 geslaagd), `lint` (alleen een
al bestaande, ongerelateerde waarschuwing in `app/solliciteren/`) en `build` zijn allemaal groen op
een schone `.next`. Nagerekend op de gebouwde CSS: `.onderbalk`, `.onderbalk-item`, `.topbar-mobiel`,
`.meer-blad-merk` en `.nav-item-lg` staan er allemaal in. `titelVoorPad()` is los getest met vier
representatieve paden. Wat niet is gecontroleerd: hoe het scherm er in een echte, ingelogde browser
op een telefoon uitziet, want deze omgeving heeft geen geldige sessie. Dat blijft open voor de
eerstvolgende Vercel-preview.

## 17 september 2026, stap 7 van de redesign: de mobiele patronen

`redesign2026.md` §10.2 noemde drie componenten die samen 37 van de 50 schermen dekken: de tabel met
twee kolommen (groep B), het detailblad, de stappenflow (groep C). Het werden er twee: het
detailblad bleek al te bestaan. `Drawer` uit stap 3 doet precies wat §7.11 van een detailblad vraagt
(van onderen in plaats van van rechts onder 768px, met sleepgreep), en een tweede versie bouwen was
de herhaling die `docs/designsystem.md` §8 regel 1 verbiedt.

**`MobielTabel` (`components/mobiel-tabel.tsx`).** Twee kolommen van 50%, elk met twee waarden
gestapeld: hoofdwaarde en bijschrift links, kerncijfer en verandering rechts. GEMETEN als OKX' eigen
patroon (§7.11, §8.12.1), niet een kaart per rij en niet horizontaal schuiven, want dat zijn de twee
alternatieven die daar zelf ook zijn losgelaten. Rijhoogte 64px, ruim genoeg als aanraakvlak voor een
tik die het detailblad opent. Welke vier van de zeven gegevens van een tabel meegaan is met opzet
geen instelling van dit component: dat is een ontwerpkeuze per scherm, en die keuze hoort bij stap
10, niet hierin verstopt.

**`Stappenflow` (`components/stappenflow.tsx`).** Eén sectie per scherm in plaats van alle secties
onder elkaar, met een voortgangsbalk en een opslagknop die vastzit onderaan (§8.9, §8.12.2). Twee
keuzes zijn het waard om vast te leggen:

- **De knoppenbalk is `fixed`, net als `ConfirmBar`.** `app/(app)/analyses/[id]/_editors/confirm-bar.tsx`
  loste "een knop die nooit uit beeld raakt" al eerder op voor de desktop, met een balk over de volle
  breedte van het venster en een spacer erboven zodat de inhoud er nooit achter verdwijnt. Dezelfde
  vorm, alleen zit `bottom` nu op `56px + de veilige zone` in plaats van op `0`: dat is de hoogte van
  de onderbalk (`.onderbalk`, stap 6) die eronder al vaststaat, en zonder die optelsom komt de
  opslagbalk boven op de navigatie te staan.
- **De hoofdactie staat bovenaan zonder `column-reverse`.** OKX bereikt dat bij een modal (§7.13) door
  de knoppenrij om te draaien. Hier staat er geen rij van twee gelijke knoppen maar een hoofdknop
  (Volgende of Opslaan) en een secundaire knop (Vorige) eronder: de hoofdknop staat gewoon als eerste
  in de JSX. Zelfde uitkomst, geen omgekeerde volgorde in de DOM nodig.

Beide componenten staan met een werkend voorbeeld in de etalage (`/beheer/designsysteem`), inclusief
een doorklikbare `Stappenflow` van drie stappen: de knoppenbalk plakt daar zichtbaar aan de
onderkant van het venster en niet aan de kaart eromheen, precies zoals hij dat op een echt scherm ook
gaat doen.

`redesign2026.md` en `docs/designsystem.md` zijn bijgewerkt: de kostentabel in het plan noemt nu twee
bestanden in plaats van drie, met de reden erbij, en de waarschuwing bovenaan `designsystem.md` telt
stap 7 nu mee bij "doorgevoerd".

Getest: `tsc --noEmit`, `test:unit` (4913 geslaagd), `test:chain` (666 geslaagd) en `build` zijn
allemaal groen op een schone `.next`. Wat niet is gecontroleerd: hoe de twee componenten er in een
echte, ingelogde browser op een telefoon uitzien, want deze omgeving heeft geen geldige sessie. Dat
blijft, net als bij stap 6, open voor de eerstvolgende Vercel-preview.

## 17 september 2026, stap 8 van de redesign: de inlogroute

Vijf schermen (`login`, `register`, `wachtwoord-vergeten`, `wachtwoord`, `uitnodiging/[token]`) om
naar `redesign2026.md` §8.2, en daarmee de uitzondering uit `docs/designsystem.md` §9b opgelost: die
stond specifiek voor het feit dat de inlogroute zijn eigen `.auth-label`/`.auth-field`/`.auth-submit`/
`.auth-footnote` had, elk een kopie van een bestaand primitief met een net iets andere maat. Dat is nu
weg. De route gebruikt dezelfde `.type-*`, `.field`, `.btn-*` en `Alert` als de rest van de app, op
zijn eigen (grotere) trede van diezelfde schalen: `.type-heading-lg` (30px, nieuw, alleen dit scherm),
`.field-lg` (48px, de trede die §7.3 ook voor elk veld onder 768px voorschrijft), `Alert` (nieuw,
§7.16, drie intents: succes, waarschuwing, fout). Wat overblijft onder "HET INLOGTONEEL" in
`app/globals.css` is uitsluitend de opmaak van het toneel zelf: de ondergrond en de kaart van 480
pixels die alle vijf schermen delen.

**Drie dingen die niet letterlijk in de spec stonden en toch zijn veranderd, met een reden:**

- **`--bg-stage` is geschrapt.** Dit token bestond om de grond onder de inlogkaart een andere kleur te
  geven dan `--bg-base`, nodig in de Nova-jaren toen de twee verschilden. Sinds stap 1 zijn ze in
  beide standen letterlijk identiek (`#f6f6f6` licht, `#000000` donker): twee namen voor één feit.
  `.auth-stage` gebruikt nu `--bg-base` rechtstreeks, en de drie tokendefinities zijn weg uit
  `app/globals.css`.
- **De iconen in de velden (envelop, slot) zijn weg, de oogknop in het wachtwoordveld blijft.** Geen
  van beide stond in §8.2's letterlijke opsomming; het envelop/slot-paar was Nova-decoratie die nergens
  anders in de app terugkomt (een dashboardveld heeft geen icoon), de oogknop staat er wél letterlijk
  ("de wachtwoordwissel in het veld wordt een IconButton md"). Die oogknop haalde bovendien
  `import { Eye, EyeOff } from "lucide-react"` rechtstreeks binnen, in plaats van via `lib/icons.ts`:
  dat is precies wat `docs/designsystem.md` §8 regel 9 verbiedt. Nu geregistreerd als
  `wachtwoordtonen`/`wachtwoordverbergen`, bewust dezelfde tekening als `klantweergave`/`eigenweergave`
  (ook Eye/EyeOff): een universele conventie is geen eigen keuze, en de twee functies staan nooit naast
  elkaar op een scherm.
- **`Alert` (§7.16) kreeg een neutrale rand, niet de gekleurde rand op 20% opaciteit die de tekst
  noemt.** Elke andere intent-gekleurde vlakte in dit systeem (de chipvarianten, en de meldingen die
  al vóór stap 8 op het inlogtoneel stonden) gebruikt al surface plus content-kleur met een neutrale
  rand (`--intent-*-border` wijst overal naar `--border-default`). Die precedent won van een
  spec-regel die zelf nooit tegen gecompileerde CSS was nagerekend, want OKX levert dit component niet
  in de opgehaalde bundels.

**Twee kleinere opruimingen, ontdekt tijdens het herschrijven van deze route:**

`auth-form.tsx` had een `mode: "login" | "register"`-prop, maar de inlogtak riep niemand meer aan
(`login/login-form.tsx` deed dat werk al sinds eerder, met een eigen oogknop die `auth-form.tsx` niet
had). Een tak die niemand aanroept is precies het soort halve implementatie die niet moet blijven
staan; de `mode`-prop is weg en het component is nu uitsluitend het registratieformulier.
`activation-form.tsx` toonde de vertrouwensregel ("Je gegevens zijn versleuteld en beveiligd
opgeslagen.") twee keer op hetzelfde scherm: eenmaal in zijn eigen laatste `<p>`, eenmaal automatisch
via `AuthCard`, die dezelfde tekst al in zijn afsluiter zet voor elke kaart. De eigen regel is weg.

Het woordmerk staat sinds deze stap boven de kaart in plaats van erin (`AuthLayout`, niet
`AuthCard`): §8.2 zegt "woordmerk boven de kaart, 24px eronder", en alle vijf schermen delen precies
één logo, dus dat is een feit van het toneel en niet van de kaart.

`redesign2026.md` en `docs/designsystem.md` §9b zijn bijgewerkt met wat hierboven staat. De
kostenschatting van stap 8 ging van 6 naar 13 bestanden (`Alert` en de twee nieuwe iconen tellen mee,
en die kan stap 10 elders hergebruiken); de opgetelde schatting voor stap 1 tot 8 in §10.7 is
bijgesteld van 23 naar 36, met stap 7's eigen correctie (3 naar 2 bestanden, al genoteerd in de vorige
logboekregel) daarin meegenomen.

Getest: `tsc --noEmit`, `test:unit` (4913 geslaagd), `test:chain` (666 geslaagd) en `build` zijn
allemaal groen op een schone `.next`, met alle vijf inlogroutes in de buildoutput
(`/login`, `/register`, `/uitnodiging/[token]`, `/wachtwoord`, `/wachtwoord-vergeten`). Wat niet is
gecontroleerd: hoe de vijf schermen er in een echte browser uitzien, licht en donker, want deze
omgeving heeft geen geldige sessie om achter de inlogroute te komen en de inlogroute zelf heeft geen
staging-data nodig om te bekijken maar wél een draaiende server. Dat blijft open voor de
eerstvolgende Vercel-preview, net als bij de stappen 5 tot 7.

## 21 september 2026, stap 9 van de redesign: de typografie-opruiming

`redesign2026.md` §10.4 beschreef drie handmatige posten: de Tailwind-schaal zelf naar de
OKX-waarden trekken (de hefboom, 1 bestand), de gewichtssweep (`font-semibold` naar `font-medium`,
geschat ~200 treffers) en acht plus acht koppen op `text-3xl`/`text-2xl` die `PageHeader` worden.
Nagelopen bleken twee van de drie al (deels) gedaan of kleiner dan gedacht:

- **De gewichtssweep stond al op nul.** `grep -c font-semibold` en `font-bold` gaven allebei 0 in
  `app/` en `components/`, tegenover 215 keer `font-medium`. Die sweep is kennelijk al meegelift in
  een eerdere stap (vermoedelijk stap 2 of 4) zonder een eigen logboekregel. Niets te doen.
- **Van de 16 schermen met `text-3xl`/`text-2xl` waren er 14 een `.stat-value`**, dus een cijfer en
  geen paginakop: die combinatie (`stat-value text-3xl`) is precies bedoeld als "de klasse zet de
  tabulaire cijfers neer, de Tailwind-grootte bepaalt de maat", en profiteert nu automatisch van de
  nieuwe schaal zonder dat er iets hoefde te veranderen. Eén was het woordmerk op de 404-pagina
  (`app/not-found.tsx`), die zijn eigen behandeling houdt (zie `docs/designsystem.md` §3.1: het
  merklettertype `.brand-logo` staat met opzet maar op twee plekken, de bovenbalk en de inlogkaart,
  en een derde erbij zetten was niet gevraagd). **Eén was een echte paginakop**:
  `app/(app)/analyses/[id]/briefing/briefing-form.tsx`, nu `PageHeader` in plaats van een kale
  `<h1 className="text-2xl font-medium">`.

**Wat wél is gebouwd: het `@theme inline`-blok in `app/globals.css`.** Negen `--text-*`-tokens
(`xs` tot `5xl`, `md` als synoniem van `base` erbij omdat OKX' eigen naamgeving dat gebruikt) trekken
elke kale Tailwind-tekstklasse naar de OKX-maten. Daarmee is `text-sm` overal in de app ineens 14px
op regelhoogte 21 (was 14 op 20), zonder dat er één van de 549 aanroepers is aangeraakt. Nagerekend
in de gebouwde CSS: `.text-sm{font-size:.875rem;line-height:var(--tw-leading,1.3125rem)}`,
`.text-3xl{font-size:2.25rem}`.

**De valstrik uit §10.4 is meteen opgelost.** `--color-base` stond in `@theme inline` en maakte van
`text-base` een KLEURklasse in plaats van Tailwinds eigen ingebouwde tekstgrootte; die regel is
geschrapt. Nagerekend in de gebouwde CSS staat er nu
`.text-base{font-size:var(--text-base);line-height:...}`, dus een echte grootte. Twee gevolgen
gevonden en behandeld:

- **`app/(app)/merk/[id]/analytics/page.tsx:284`** (`· X in het plan` naast een grote kerncijfer)
  deed voorheen niets: de kleur die `text-base` zette werd meteen overschreven door het ernaast
  staande `text-muted`, en zonder eigen grootte erfde het element de 36px van zijn ouder
  (`.stat-value.text-3xl`). Dat was dus een zichtbare bug: een bijzin in 36px naast een cijfer in
  36px. Na deze stap krijgt hij zijn eigen 16px op 24px, zoals de tekst zelf altijd al suggereerde.
  Geen codewijziging nodig, alleen de tokenwijziging.
- **`app/(app)/merk/[id]/strategie/plan/plan-view.tsx`** had een waarschuwingscommentaar dat
  letterlijk uitlegde waarom `text-base` daar niet gebruikt mocht worden. Dat commentaar is nu fout
  (de val bestaat niet meer) en is bijgewerkt naar wat er nu staat.

**Wat bewust niet is gedaan:** §10.5 ("van zeven betekenissen naar vier", de intent-tokens
`intelligence`/`growth`/`information`/`attention`/`premium`) staat in het plan zonder eigen stapnummer
en "raakt bestaande schermen" (§9, regel 368), dus die hoort bij stap 10 (de schermen) en niet bij
deze typografiestap. Niet aangeraakt.

`redesign2026.md` (de stap-9 paragraaf en beide kostentabellen) en `docs/designsystem.md` (de
waarschuwingsbanner) zijn bijgewerkt.

Getest: `tsc --noEmit`, `test:unit` (4913 geslaagd), `test:chain` (666 geslaagd) en `build` zijn
allemaal groen op een schone `.next`. Extra nagerekend, buiten de vier standaardcontroles om: de
gebouwde CSS zelf (`.next/static/css/*.css`) is doorzocht op `.text-sm`, `.text-base` en `.text-3xl`
om te bevestigen dat de tokens ook echt de utilities veranderen en niet alleen in `@theme` staan
zonder effect. Wat niet is gecontroleerd: hoe een scherm met veel `text-sm`/`text-lg` er in een echte
browser uitziet, om zeker te weten dat de iets ruimere regelhoogte nergens een layout breekt. Dat
blijft open voor de eerstvolgende Vercel-preview.

## 21 september 2026, stap 10 van de redesign, portie 1: het merkoverzicht

Eerste portie van de lange staart (`redesign2026.md` §10.2 noemt 50 routes, "in porties te doen").
Volgorde op gebruik, dus als eerste `/merk/[id]` (§8.3), de startpagina na inloggen.

**§8.3's eigen voorschrift klopte niet, en dat is eerst uitgezocht in plaats van blind gevolgd.**
De tekst zegt "kerncijfers: raster van 4 DataCards (7.10)". Het echte scherm (934 regels, precies
zoals geteld) heeft die vier cijfers niet als losse kaarten staan: het heeft één kaart met een
hoofdgetal (de zichtbaarheidsscore, `.stat-value text-5xl`), de duiding erbij, en daaronder een
cijferrij met verticale scheidingslijnen tussen de kolommen (`CijferRij`, een eigen component in
hetzelfde bestand). Dat is een doordachtere opbouw dan vier gelijke DataCards: de vier getallen horen
inhoudelijk bij elkaar en bij het hoofdgetal erboven, en vier losse kaarten zouden dat verband
visueel opheffen. Niet aangeraakt.

**Wat wél nodig bleek, na het hele bestand langs te lopen op hexkleuren, `backdrop-blur`, `shadow-`,
kale `rounded-*` en de zeven oude intent-namen** (§10.5): het scherm was op die punten al bijna
volledig schoon, want het gebruikt overal de gedeelde primitieven (`.card`, `.stat-value`, `.chip`,
`.mono-label`) die al eerder in deze redesign zijn omgezet. Drie echte vondsten:

- **`PageHeader` stond op `.type-title` (24px)**, terwijl §8.9 een paginakop expliciet 30px
  (`heading-lg`) voorschrijft, een eigen, grotere trede dan een kop in een dialoog. Dit component
  wordt op 34 schermen gebruikt, dus deze ene wijziging is de grootste hefboom van deze portie. Ook
  het onderschrift is meteen goedgezet: `body-sm` op `--text-tertiary` in plaats van de vorige
  `text-secondary`, met 4px in plaats van 8px onder de titel.
- **`SectionHeading` miste de streep uit §8.10** (1px `--line-muted`, 8px onder de titel). Dit
  component wordt op 2 schermen gebruikt (dit overzicht en Reputatie); beide profiteren mee.
- **Twee plekken riepen nog `var(--intent-growth-solid)`/`-text` aan** in plaats van `var(--trend-up)`/
  `-text` (`page.tsx` zelf, `_components/ronde-balk.tsx`, `components/loop-blocks.tsx`). Dit is de
  vertaling uit §10.5 ("groei is een richting, geen betekenis") en een zuivere naamswisseling: het
  eerste token wees al naar het tweede, dus er verandert geen pixel.

**Bewust niet meegenomen: `CollapsibleSection` naar de vlakke OKX-accordion van §8.11.** §8.3 beweert
dat dit component "negen keer" op dit scherm staat; het is één keer, genest in een `.card`. Het
component zelf wordt wél in 12 bestanden gebruikt, in twee heel verschillende opstellingen: genest in
een kaart (hier) en los na elkaar in een rij van vijf tot zes stuks (`admin/page.tsx` en andere
formulierschermen). §8.11's vlakke stijl (geen rand, geen achtergrond, alleen een streep onder elke
rij als scheiding) is GEMETEN voor de tweede opstelling; of hij ook goed oogt genest in een kaart is
zonder browser niet te verifiëren. Twaalf bestanden in het duister aanpassen op een gok is precies het
soort risico dat "elke stap is op zichzelf terug te draaien" moet voorkomen. Dit wordt een eigen
portie, met de andere elf aanroepers erbij bekeken in plaats van alleen deze ene.

`redesign2026.md` kreeg een voortgangstabel onder de stap-10-paragraaf, bijgewerkt per portie.

Getest: `tsc --noEmit`, `test:unit` (4913 geslaagd), `test:chain` (666 geslaagd) en `build` zijn
allemaal groen. Nagerekend: het hele bestand `app/(app)/merk/[id]/page.tsx` is doorzocht op
hexkleuren, `backdrop-blur`, `shadow-`, kale Tailwind-radiusklassen en de oude intent-namen (het
laatste leverde de twee vondsten hierboven op, de rest leverde niets op). Wat niet is gecontroleerd:
hoe het scherm er in een echte browser uitziet, dus of de 30px paginakop en de nieuwe streep onder
elke sectiekop ergens een layout laten breken. Dat blijft open voor de eerstvolgende Vercel-preview.

## 21 september 2026, stap 10 van de redesign, portie 2: Analytics

De vier zwaarste dataschermen (§8.4): zichtbaarheid, concurrenten, reputatie, zoekverkeer.

**De grootste functionele wijziging: `DetailPanel` is overal vervangen door `Drawer`.** §8.4 zegt het
letterlijk: "de detail-panel die er al is wordt de lade." Vier bestanden riepen `DetailPanel` aan
(`analytics-cluster-table.tsx`, `concurrenten-analyse.tsx`, `zoekverkeer-paginas.tsx`,
`reputation-offerings.tsx`), en elk deed hetzelfde: een rij aanklikken liet de tabel ernaast krimpen
via `grid-cols-[minmax(0,1fr)_20rem]`. Dat is precies het probleem dat Drawer (gebouwd in stap 3)
oplost: een rij aanklikken kost geen kolombreedte meer, het paneel schuift van rechts overheen. Het
dode bestand `components/detail-panel.tsx` is verwijderd.

**Alle vier de schermen kregen `wil-data`.** Geteld: dit token (uit de standenmachine van stap 4,
`.stand:has(.wil-data)`) werd tot vandaag door geen enkel scherm in de hele app aangeroepen. Analytics
is de eerste toepassing. Toegepast op de hoofdtak van elk scherm (de tak mét de tabel); de
lege/laad/mislukt-staten (kleine kaarten zonder tabel) blijven op de standaardbreedte, want een korte
melding heeft niets aan 2560 pixels.

**De gedeelde `AnalyticsTable`-kop ging naar de juiste maat.** 14px/gewicht 400/`--text-muted` werd
12px/gewicht 500/`--text-subtle` (§7.11), voor alle vier de schermen tegelijk, want er is maar één
tabelcomponent voor Analytics (`plan analytics-herontwerp.md`, F3).

**Twee plekken met `--intent-growth-solid`** (`page.tsx`, `reputation-tone-distribution.tsx`) omgezet
naar `--trend-up` (§10.5, kleurloze naamswisseling). Twee plekken met `--intent-intelligence-*`
(`concurrenten-analyse.tsx`, `analytics-table.tsx`, voor een gemarkeerde/gekozen rij) bewust NIET
omgezet: er bestaat geen `--accent-surface`-token om naartoe te wijzen zonder er zelf een te
verzinnen, en dat hoort bij de bredere opruiming van de zeven oude intent-namen, niet bij twee losse
call-sites in een portie over iets anders.

**Twee voorschriften uit §8.4 bleken al gebouwd, in een betere vorm dan de tekst beschrijft.** De
"gestapelde balk" voor de toonverdeling op Reputatie bestond al (`ReputationToneDistribution`, met
zes tinten voor zes categorieën in plaats van de veronderstelde drie, en 16px in plaats van 8px voor
de leesbaarheid). De "hoofdgrafiek van 320px" op Zichtbaarheid bestaat niet: een grafiek per cluster
is er op 3 augustus 2026 bewust uit gehaald toen honderden clusters een muur van kaartjes opleverden;
een tabel verving hem, en dat blijft zo. Geen van beide aangeroerd.

`redesign2026.md` kreeg een tweede rij in de voortgangstabel van stap 10, met de bevindingen erbij.

Getest: `tsc --noEmit`, `test:unit` (4913 geslaagd), `test:chain` (666 geslaagd) en `build` zijn
allemaal groen. Nagerekend: alle vier de Analytics-bestanden en hun tabelcomponenten zijn doorzocht
op hexkleuren, `backdrop-blur`, `shadow-`, kale Tailwind-radiusklassen, resterend `DetailPanel`-gebruik
en de oude intent-namen. Wat niet is gecontroleerd: hoe de lade er in een echte browser uitziet boven
op een brede tabel, en of `wil-data` op een breed scherm ook echt breder rendert dan 1440px. Dat
blijft open voor de eerstvolgende Vercel-preview.

## 21 september 2026, stap 10 van de redesign, portie 3: Strategie

Vijf routes (§8.5): clusters, vragen, plan, plan/versies, bibliotheek.

**Geen van de vijf kreeg `wil-data`.** §8.5 veronderstelt tabellen voor clusters en bibliotheek; beide
zijn kaartrasters (`ClusterKaart`, respectievelijk `grid-cols-3` in `library-view.tsx`). Plan is een
kalenderweergave, ook geen tabel. §8.1's eigen algemene regel (data is voor tabel, grafiek,
vergelijking) wijst dan zelf al naar "werken", en dat is al de standaardbreedte. Derde keer dat een
per-scherm voorschrift uit §8 niet aansloot op wat er echt staat (na de DataCards in portie 1 en de
hoofdgrafiek in portie 2); steeds omdat het scherm intussen doordachter is dan de abstracte
beschrijving.

**Nieuwe CSS-klasse: `.card-rail-accent`.** §8.5 vraagt "open vraag krijgt links 2px --accent". Er
bestonden al twee stangvarianten (`.card-rail-success`, `.card-rail-warning`, beide een
richtingkleur voor een meetuitkomst); deze derde draagt `--accent` voor "dit vraagt een handeling van
jou" en niet voor een uitkomst. Toegepast op elke kaart in `FactRequests`' open-lijst, met opzet niet
op een overgeslagen vraag in dezelfde component: die vroeg al om een reactie en kreeg er een.

**`VersionDiff` kreeg de enige omzetting in deze hele redesign die écht een andere kleur oplevert.**
Verwijderde tekst ging van `--intent-danger-*` naar `--trend-down-*`, toegevoegde tekst van
`--intent-growth-*` naar `--trend-up-*`. Elke eerdere `growth`→`trend-up`-omzetting in dit project was
kleurloos (het ene token wees al naar het andere); hier niet, want `--trend-down-text` (`#c22a48`) en
`--intent-danger-text` (`#ba2133`) zijn twee verschillende roodtinten. Semantisch is dit de juistere
kleur: verwijderde tekst in een versievergelijking is een richting (minder), geen foutmelding. Twee
overige `--intent-growth-*`-aanroepen (`plan-calendar-view.tsx`, `create-plan-box.tsx`) zijn wel
kleurloos omgezet naar `--trend-up`, dezelfde naamswisseling als in de vorige twee porties.

`redesign2026.md` kreeg een derde rij in de voortgangstabel.

Getest: `tsc --noEmit`, `test:unit` (4913 geslaagd), `test:chain` (666 geslaagd) en `build` zijn
allemaal groen. Nagerekend: alle vijf routes en hun bijbehorende componenten zijn doorzocht op
hexkleuren, `backdrop-blur`, `shadow-` en de oude intent-namen. Wat niet is gecontroleerd: of het
nieuwe rood van `VersionDiff` op beide standen (licht en donker) voldoende contrast houdt tegen zijn
eigen surface-tint, en hoe de linkerstang op een open vraag er in een echte browser uitziet. Dat
blijft open voor de eerstvolgende Vercel-preview.

## 21 september 2026, stap 10 van de redesign, portie 4: Sales (gedeeltelijk)

Zes routes (§8.7): startscherm, markten, markten/[id], prospects, prospects/[id], outreach.

**Nieuw: `.topbar-sales`, de interne-scherm-streep.** §8.7 vraagt een streep van 2px
`--intent-warning-solid` onder de bovenbalk, alleen in Sales-routes, zodat in één oogopslag duidelijk
is dat je in een intern scherm zit (`CLAUDE.md`: een klant ziet niets van Sales). De klasse staat nu
op zowel `.topbar` (desktop) als `.topbar-mobiel` (telefoon, via een nieuwe `salesContext`-prop op
`MobileTopbar`), aangestuurd in `WorkspaceChrome` door dezelfde `pathname.startsWith("/sales")`-regel
die `BottomNav` al gebruikte om van context te wisselen. Geen nieuwe logica, één bestaande regel op
een tweede plek toegepast.

**Geen `wil-data` nodig.** Markten en prospects zijn, net als bij Strategie, kaartlijsten en geen
tabellen; §8.7's "Table dicht met de saleskansen" klopt niet met wat er staat.

**Bewust niet gebouwd: de twee-koloms opzet van het prospectdossier.** §8.7 wil "links het dossier,
rechts de conceptmail in een Card" vanaf 1024px, en een vaste breedte van 680px op het
conceptmailveld. Het scherm (`prospects/[id]/page.tsx` plus `werkpaneel.tsx`) staat nu in één kolom
onder elkaar. Dat werkt, maar is niet de spec. Dit is écht nieuwe lay-out op een bedrijfskritisch
intern scherm met veel voorwaardelijke content (een prospect zonder kans, met kans maar niet
opgepakt, opgepakt met een concept, verzonden, afgewezen), en zonder browser is de kans op een
verkeerde breakpoint-aanname te groot om dat blind te doen. Wordt een eigen, kleine portie, net als
`CollapsibleSection` uit portie 1.

`redesign2026.md` bijgewerkt, inclusief de markering "gedeeltelijk" in de voortgangstabel.

Getest: `tsc --noEmit`, `test:unit` (4913 geslaagd), `test:chain` (666 geslaagd) en `build` zijn
allemaal groen. Nagerekend: alle zes routes doorzocht op hexkleuren, `backdrop-blur`, `shadow-` en de
oude intent-namen (geen gevonden, deze module was al schoon op dat vlak). Wat niet is gecontroleerd:
hoe de nieuwe streep er in een echte browser uitziet op zowel licht als donker, en op zowel desktop
als telefoon. Dat blijft open voor de eerstvolgende Vercel-preview.

## 21 september 2026, stap 10 van de redesign, portie 5: Admin en beheer (gedeeltelijk)

Zes routes onder `/merk/[id]/admin/*`, drie onder `/beheer/*` (§8.6).

**De belangrijkste vondst van deze portie: het patroon dat §8.6 vraagt bestond al, alleen in de
verkeerde kleur.** `onboarding-session.tsx` (783 regels) heeft `SectionRail`, een sticky
inhoudsopgave met scroll-spy (`IntersectionObserver`) die een actief hoofdstuk aanwijst terwijl je
scrolt. Dat IS §8.6's "inhoudsopgave vanaf 1280px links naast het formulier, sticky". Alleen de
actieve regel gebruikte `--intent-intelligence-solid`/`-text` (een accentkleur), terwijl spec en de
zijbalk (`.nav-item[aria-current]`) allebei `--text-primary` met `--border-selected` (puur zwart in
licht, puur wit in donker) gebruiken voor "je bent hier". Nu gelijkgetrokken. De railbreedte ging van
176px (`w-44`) naar de voorgeschreven 200px (`w-[200px]`). `SectionRail` heeft precies één aanroeper,
dus dit is een lage-impact wijziging met een echt kleurverschil (niet nul, zoals de meeste
`intent-growth`→`trend-up`-omzettingen in eerdere porties).

**Bewust niet gebouwd: de vastplakkende opslagbalk uit §8.6.** Die vraagt "vuile staat"-tracking
(weet dat een formulier gewijzigd is sinds de laatste opslag) die nergens in deze negen schermen
bestaat; hem bouwen is nieuwe functionaliteit en geen redesign van iets dat er al staat.

**Bewust niet gecontroleerd: `wil-lezen` (720px) op de acht overige routes.** Bij
`onboarding-session.tsx` staat de rail in dezelfde flexrij als de inhoud; `wil-lezen` op de hele
pagina zou dus de rail ÉN de inhoud samen in 720px persen. Vermoedelijk bedoelt de spec de breedte van
de formulierkolom en niet van de hele pagina inclusief rail, maar dat is een aanname zonder browser om
hem te toetsen. De overige acht routes (kortere edit-schermen: `AssignBox`, `PackageBox`,
`EntitiesManager`, `OfferingsPanel`, en de overzichten `admin/page.tsx` en de drie `/beheer/*`-pagina's)
zijn niet stuk voor stuk langsgelopen op deze vraag. Wordt, samen met de opslagbalk, een eigen portie.

`redesign2026.md` bijgewerkt.

Getest: `tsc --noEmit`, `test:unit` (4913 geslaagd), `test:chain` (666 geslaagd) en `build` zijn
allemaal groen. Nagerekend: alle negen routes doorzocht op hexkleuren, `backdrop-blur`, `shadow-`
(niets gevonden) en de oude intent-namen (één vondst in `csm-view.tsx`, bewust niet omgezet om
dezelfde reden als in portie 2 en 3: geen `--accent-surface`-token om naartoe te wijzen). Wat niet is
gecontroleerd: hoe de rail er in een echte browser uitziet op 1280px en breder, en of de nieuwe
`--border-selected`-kleur voldoende opvalt naast de mono-nummers ernaast. Dat blijft open voor de
eerstvolgende Vercel-preview.

## 21 september 2026, stap 10 van de redesign, portie 6: de overige routes (gedeeltelijk)

`/analyses/*` (9 routes), `/merk`, `/merk/nieuw`, `/instellingen/*`, `/support`, `/markt/[slug]`, `/`
(§8.8), en als bijvangst een volledige app-brede §10.5-sweep.

**De grootste vondst: elke vorige portie deed §10.5 (zeven betekenissen naar vier) los, met één of
twee losse `--intent-growth-*`-aanroepen per keer.** Deze portie zocht de hele `app/`- en
`components/`-boom in één keer door en vond er nog twaalf. Allemaal omgezet, volgens dezelfde
kleurloze aliassen als steeds (`--intent-growth-text`→`--trend-up-text`, `-solid`→`--trend-up`,
`-border`→`--border-default`), plus de laatste twee `--intent-information-*`-aanroepen naar
`--intent-info-content`/`--border-default`. Nagerekend: **nul** treffers voor `intent-growth` of
`intent-information` in de hele codebase. `intent-attention` en `intent-premium` stonden al op nul
(het CSS-token voor premium bestond zelfs al nergens meer in `globals.css`, een schatting uit het
blueprint die inmiddels achterhaald bleek). Alleen `intent-intelligence` staat nog overal waar hij
stond: geen `--accent-surface`-token om naartoe te wijzen, dezelfde reden als in elke eerdere portie.

**`/analyses/[id]/*` (9 routes, gedeeld via één layout):** `AnalysisNav` had een eigen pilnavigatie in
plaats van de gedeelde `Tabs` uit stap 3. Nu gebruikt hij `Tabs` voor de twee echte bestemmingen
(Cluster, Bibliotheek, met de teller als `aantal`), de instellingenlink staat er met opzet los naast
in plaats van als derde tabblad. Onderweg ook een dode tokennaam opgeruimd: `--wash-hover`, nog wel
een geldige alias maar overal elders sinds stap 4 al `--interactive-hover`.

**`/merk`, `/merk/nieuw`, `/instellingen`: grotendeels geen wijziging nodig.** De merkenlijst is een
kaartenlijst en geen tabel (zesde keer dat dit patroon terugkomt, na Strategie en Sales), `/nieuw` en
`/instellingen` begrenzen zichzelf al op `max-w-xl`. `/instellingen/koppelingen` deed dat niet en
kreeg als enige in deze portie een echte standwijziging: `wil-lezen`.

**`/support` (764 regels): bewust niet aangeraakt.** §8.8 wil hem als accordion-lijst, en §8.11 noemt
`/support` zelf als het voorbeeld voor de kleine `CollapsibleSection`-variant. Hoort dus bij de al in
portie 1 aangekondigde eigen portie voor dat component, niet bij deze.

`redesign2026.md` bijgewerkt.

Getest: `tsc --noEmit`, `test:unit` (4913 geslaagd), `test:chain` (666 geslaagd) en `build` zijn
allemaal groen. Nagerekend: `grep` op `intent-growth`, `intent-information`, `intent-attention` en
`intent-premium` over de hele `app/`- en `components/`-boom leverde nul treffers op ná deze portie.
Wat niet is gecontroleerd: hoe de vervangen `Tabs`-navigatie op een cluster er in een echte browser
uitziet, en of de dubbele onderrand (van `.tabs` zelf en van de nieuwe wikkel eromheen) een zichtbare
naad geeft in plaats van één lijn. Dat blijft open voor de eerstvolgende Vercel-preview.

## 21 september 2026, stap 10 van de redesign, portie 7: de drie openstaande punten, afgesloten

Portie 1, 4 en 5 lieten elk iets liggen omdat het te riskant leek zonder browser. Deze portie sluit
alle drie af: twee gebouwd, twee definitief afgewezen met een reden.

**`CollapsibleSection` is herbouwd naar OKX' vlakke accordion (§8.11).** Was een losse, afgeronde doos
per sectie met een `--bg-elevated`-kop; is nu vlak, met alleen een streep onder elke rij, zodat een
reeks secties leest als één doorlopende lijst. Kop-vulling 32px, titel 18px/gewicht 500. Een nieuwe
`compact`-prop geeft de kleine variant uit de spec (16px vulling, 14px titel) voor een langere lijst.
Twaalf bestanden gebruiken dit component; ze krijgen de nieuwe vorm zonder dat er iets aan hun eigen
inhoud is veranderd.

**Het conceptmailveld in `werkpaneel.tsx` kreeg `max-w-[680px]`** (§8.7): een e-mail leest als een
e-mail bij de regellengte van een echte mailclient.

**Twee definitieve nee's, allebei omdat de code zelf al het antwoord gaf:**

- **`/support` wordt geen accordion-lijst, punt.** Het scherm heeft zijn eigen toelichting: de eerste
  versie gebruikte al precies het tabblad/accordion-patroon dat §8.8 nu voorstelt, en dat gaf "een rij
  bijna identieke grijze kaarten zonder enige hiërarchie". De huidige opbouw (vaste zijnavigatie naast
  doorlopende inhoud, als een echte documentatiepagina) is de latere, bewuste correctie: Support heeft
  geen data om te temmen, alleen uitleg. Dit is geen openstaand punt meer; de spec is hier achterhaald
  door een besluit dat er ná kwam.
- **Het prospectdossier blijft één kolom.** Dat scherm bestaat voor het moment waarop een prospect de
  claim betwist, en toont daarom alles onder elkaar: de vraag, het antwoord, de bronnen, de
  score-opbouw. Een twee-koloms raster op een bedrijfskritisch scherm zonder browser om te verifiëren
  is een te grote gok, zeker voor een spec-regel zonder eigen motivatie.

**Ook definitief nee: de vastplakkende opslagbalk in Admin.** Vraagt vuile-staat-tracking in minstens
vijf editor-componenten die dat vandaag niet bijhouden. Nieuwe functionaliteit per component, geen
redesign van iets dat er al staat.

**Drie Admin-routes kregen alsnog `wil-lezen`** (`aanbodboom`, `toewijzen`, `concurrenten`), stuk voor
stuk geverifieerd als formulieren zonder brede rasters. `admin/0-meting` bewust niet: bij nader lezen
is dat het leesscherm dat de consultant vóór een demogesprek doorneemt, dus een overzicht en geen
formulier.

**Hiermee is stap 10 inhoudelijk klaar:** alle zes groepen uit `redesign2026.md` §8.2 tot §8.8 zijn
bekeken. Wat niet is gebouwd staat met een reden in het logboek en in het plan, niet stilzwijgend
overgeslagen.

`redesign2026.md` bijgewerkt met de zevende en laatste rij van de voortgangstabel voor deze stap.

Getest: `tsc --noEmit`, `test:unit` (4913 geslaagd), `test:chain` (666 geslaagd) en `build` zijn
allemaal groen. Wat niet is gecontroleerd: hoe de nieuwe vlakke `CollapsibleSection` er in een echte
browser uitziet op alle twaalf aanroepers, vooral of de content zonder de oude doos nog voldoende van
zijn buren te onderscheiden is. Dat blijft open voor de eerstvolgende Vercel-preview.

## 21 september 2026, stap 11 van de redesign: documentatie

Stap 10 was inhoudelijk klaar; deze stap trekt de documentatie gelijk, zoals `redesign2026.md` §10.6
aangaf en `CLAUDE.md` sowieso al eist ("verandert het gedrag, werk dan `docs/` bij in dezelfde
commit").

**De ruwe Nova/InSpace-brondata is weg.** `css.css` (Nova's gecompileerde CSS-bundel, 93 kB in de
hoofdmap), `docs/nova-i18n.json`, `docs/inspace-app-i18n.json` en `docs/inspace-marketing.txt` waren
de tekstcatalogi en de stijlbundel achter de Nova-vergelijking. De conclusies staan al uitgeschreven
in `docs/nova-vs-orbit-engine-proces.md` en `docs/tasks/nova-vergelijking-verbeterpunten.md`, en die
twee documenten hebben geen ruwe data meer nodig; ze blijven staan (beide nog open werk), alleen hun
verwijzing naar de nu verwijderde bronbestanden is bijgewerkt. De vertaaltabel bovenaan dit logboek
heeft er een regel bij.

**`docs/designsystem.md` is herschreven.** Het beschreef sinds 17 september 2026 met een grote
waarschuwing bovenaan nog het Nova-systeem, terwijl `app/globals.css` allang OKX' tokens droeg. De
herschrijving trekt kleur, typografie, ruimte, vorm, iconen, opmaak en het themasysteem gelijk met
wat er werkelijk in de code staat, met de Nova-periode als afgesloten geschiedenis in bijlage A
(dezelfde behandeling die de InSpace-marketingsite al had vóór 6 augustus 2026). §9b, het open
ontwerpbesluit "is dit systeem ooit van Outer Orbit zelf", is herschreven met de uitkomst van het
limoenbesluit van 17 september 2026 erin: het accent is letterlijk van OKX overgenomen, en dat maakt
de onderliggende vraag scherper in plaats van dat het hem beantwoordt. De vraag blijft open, net als
in augustus.

**`docs/ux-design.md` is nagekeken**, niet herschreven: de indeling en de gedragspatronen golden vóór
de OKX-omzetting en gelden er nog steeds na, alleen een paar concrete maten in dat document dateerden
nog van de Nova-periode. Rechtgezet: de zijbalk ingeklapt (56px, niet 64), de stang op een
stand-kaart (2px, niet 4), de knopmaten sm/lg (36/48px, niet 32/44), het kleinste label (niet meer
mono), en de kruisverwijzingen naar `designsystem.md` volgen nu de nieuwe paragraafnummering.
`docs/merkstrategie.md` §15 en §16 zijn nagekeken en hoefden niet mee: die twee gaan over
merkfilosofie (neutral-first, functionele kleur, geen neonpaarse AI-gloed) en niet over tokenwaarden,
en kloppen al met de OKX-omzetting.

**Twee genuine openstaande punten kregen een eigen bestand**,
`docs/tasks/openstaand-na-okx-omzetting.md`: `.field-lg` (48px, de trede die Safari's inzoomgedrag
bij focus voorkomt) staat nog alleen op de inlogroute en niet overal onder 768px, en de donkere
stand is nog niet systematisch nagekeken op de ingelogde schermen sinds de OKX-tokens erin zitten
(hetzelfde punt dat ook al na de Nova-omzetting openstond). Een derde, de kleurenblindheidscontrole
op de acht grafiekreeksen, staat er ook in en stond al sinds de Nova-periode open.

**Bijvangst: `components/icon.tsx` droeg nog lijndikte 1,75.** De OKX-omzetting had dit altijd al naar
1,5 willen zetten (stap 2, §5.7 van het toenmalige plan), maar de regel en het bijbehorende commentaar
waren nooit meegenomen. Rechtgezet, met het commentaar bijgewerkt naar de huidige redenering (tekst op
gewicht 500 vraagt om een lichtere lijn dan tekst op 600).

`redesign2026.md` zelf verdwijnt in de volgende commit van deze stap, zodra ook dat gecontroleerd is.

Getest: `tsc --noEmit`, `test:unit` (4913 geslaagd), `test:chain` (666 geslaagd) en `build` zijn
allemaal groen, over beide commits van deze stap. Wat niet is gecontroleerd: of de herschreven
`designsystem.md` ergens een waarde noemt die inmiddels alweer is doorontwikkeld sinds de laatste
`grep` tegen `app/globals.css`; dat is per definitie een momentopname en niet doorlopend bewaakt.

## 19 september 2026: DataForSEO voor het eerst tegen een echt account getest

De eigenaar heeft het startsaldo van open vraag 2 in `docs/tasks/zoekdata-in-de-keten.md` §10
gestort en een DataForSEO-account aangemaakt. `DATAFORSEO_LOGIN` en `DATAFORSEO_PASSWORD` staan sinds
vandaag versleuteld in Vercel (productie, preview en development), voor het project `geo`. Daarmee is
de eerste helft van conventie 10 voor `lib/search-demand/dataforseo.ts` gedaan: er is nu een sleutel,
dus de adapter kan voor het eerst tegen de echte leverancier draaien.

**Eerste aanroep.** Een losse testaanroep op de merknamen "audi" en "volkswagen" (toevallig ook de
twee merken die Van den Udenhout als dealer voert) leverde een geldige HTTP 200 met echte
maandcijfers: Audi 90.500/maand, Volkswagen 110.000/maand, beide met twaalf maanden geschiedenis
terug. De authenticatie, het endpoint en de vorm van de respons in `dataforseo.ts` kloppen dus
tegen het echte account. Kosten: $0,09 voor die ene aanroep.

**De vergelijking op vijf bestaande analyses (het "Af als"-criterium van Blok B).** Van de merken op
`main` heeft er maar één, Van den Udenhout, een `search_volume_index` op `profile_topics` (de
profielbrede herkalibratie uit `lib/pipeline/search-demand.ts` draait pas na een eerste rapport, en
dat is bij de meeste profielen in deze omgeving nog niet gebeurd). Om toch vijf analyses te kunnen
vergelijken is uitgeweken naar het niveau eronder: de per-analyse `volume_estimate` op `prompts`
(0-100, relatief BINNEN één analyse, zoals `lib/pipeline/prompts.ts` het ook bedoelt, dus expliciet
niet vergelijkbaar tussen analyses, zie `lib/pipeline/search-demand.ts` regel 7-16). Voor vijf
onderwerpen (daklekkage verhelpen, dakrenovatie en dakisolatie, bekkenfysiotherapie, hardloopblessure
behandelen, en Zakelijke lease voor bedrijfswagens, de enige van de vijf die bij een echte klant hoort)
zijn de hoogst en laagst scorende meetvragen genomen en met `lib/search-demand/keywords.ts`
(`afleidenZoekterm()`) omgezet naar een zoekterm, precies zoals de pijplijn dat zelf zou doen.

⚠️ **Twee bevindingen, en de eerste is belangrijker dan de score-vergelijking zelf.**

1. **`afleidenZoekterm()` levert op echte meetvragen vaak een onbruikbare term.** Van de tien
   afgeleide termen kreeg er precies één een echt volume terug, en dat was toeval
   ("woon nieuwegein", zelf een zinloze term, kreeg toevallig 20/maand). De andere negen waren óf te
   lang voor Google Ads' eigen woordlimiet (zie punt 2), óf te specifiek om ooit gezocht te zijn
   ("verschillen tussen operational lease", "bekkenfysiotherapie praktijk utrecht"). Een handmatig
   gekozen, opgeschoonde kernterm voor diezelfde vijf onderwerpen deed het duidelijk beter: 4 van de 8
   testtermen kregen een echt volume (daklekkage apeldoorn 40/maand, dakrenovatie apeldoorn 50/maand,
   dakisolatie apeldoorn 40/maand, operational lease bedrijfswagen 210/maand). Dat bevestigt precies
   de eigen waarschuwing bovenaan `keywords.ts`: de deterministische afleiding is "matig tot slecht
   bij een samengestelde vraag", en de meeste echte meetvragen in deze steekproef zijn samengesteld.
   Conventie 3 vangt dit gelukkig correct op: een onbekende term wordt `null`, nooit een verzonnen 0.
2. **Een echte bug: één te lange term in een batch verwerpt de HELE batch, niet alleen die ene
   term.** DataForSEO wijst een aanroep met status `40501` af zodra één zoekterm boven de ongeveer
   tien woorden van Google Ads' eigen keyword-limiet komt ("Keyword text has too many words"), en dat
   is een fout op het niveau van de hele taak, niet van de losse term. `dataforseo.ts` regel 101-104
   vangt dat vandaag af met `task.status_code !== 20000` → heel de batch overslaan. Bij een batch van
   tot 1000 zoektermen (`MAX_KEYWORDS_PER_CALL`) betekent dat: één slecht afgeleide term uit
   `afleidenZoekterm()` kan de meting van de andere 999 stilletjes laten mislukken, zonder dat er iets
   fout lijkt te gaan (de aanroep zelf faalt niet, alleen de batch waar hij in zat). Dit is nog niet
   gerepareerd; het staat als openstaand punt hieronder.

**Wat dit betekent voor Blok B.** De koppeling zelf (authenticatie, endpoint, batching, opslag als
`null` bij onbekend) is nu wél tegen een echt account bevestigd. Het eigenlijke "Af als"-criterium,
"de modelgok naast het echte volume, met de afwijking opgeschreven", is maar deels gehaald: er was te
weinig echt volume in deze steekproef om een betekenisvolle afwijking uit te rekenen (bij vier van de
tien onderwerp-vergelijkingen was er domweg geen echt cijfer om naast de gok te leggen). De grotere
winst van deze testronde is het vinden van de batch-bug, niet de score-vergelijking zelf.

**Nog te doen, niet in deze ronde uitgevoerd:** de batch-bug repareren (bijvoorbeeld: per keyword de
woordlimiet vooraf controleren en te lange termen er zelf uitfilteren in plaats van de hele batch te
laten mislukken), en zodra er merken zijn met een `search_volume_index` op onderwerpniveau, die
vergelijking overdoen op een schaal die wél bedoeld is om vergeleken te worden.

Open vraag 2 in `docs/tasks/zoekdata-in-de-keten.md` §10 is hiermee afgehandeld: het account bestaat,
het saldo staat erop, de sleutels staan in Vercel.

## 19 september 2026: de batch-bug gerepareerd, en het echte gesprek over `afleidenZoekterm()`

**De reparatie.** `binnenWoordlimiet()` (`lib/search-demand/keywords.ts`) filtert een zoekterm boven
Google Ads' woordlimiet van 10 er vooraf uit, in plaats van de hele batch (tot 1000 zoektermen) te
laten mislukken zoals de test hierboven liet zien. Puur en zonder `server-only` (conventie 2), dus
getest vanuit `test-unit.ts` zonder een echte aanroep nodig te hebben. `dataforseo.ts` gebruikt hem
nu om de batch vooraf schoon te maken, met een `console.warn` die zegt hoeveel termen zijn
overgeslagen. De docstring bovenaan `dataforseo.ts` is bijgewerkt: die zei nog "nog niet tegen een
echt account geverifieerd", en dat klopt sinds vandaag niet meer.

**Het gesprek dat deze bug opleverde.** De eigenaar vroeg terecht door: stuurt de app werkelijk de
hele AI-meetvraag als zoekterm naar DataForSEO? Ja, dat is precies wat er gebeurt, en de eerste
testronde liet al zien dat dat op 9 van de 10 echte vragen geen resultaat oplevert. De batch-bug was
dus een symptoom van een dieper punt: je moet een zoekterm niet proberen terug te knippen uit een
AI-gegenereerde zin, je moet hem opbouwen uit wat je al zeker weet. `propose-topics.ts` regel 294
doet dat al voor Blok 3.1: de onderwerptitel zelf is daar de kandidaat-zoekterm, geen tekst die eerst
uit een AI-zin gedestilleerd wordt. Het voorstel voor Blok 3.2 deel B, nog niet gebouwd, staat als
open vraag 2 in `docs/tasks/zoekdata-in-de-keten.md`: dezelfde aanpak, onderwerp plus plaats, met als
prijs dat het volume dan per onderwerp-plaats-combinatie komt in plaats van per individuele
meetvraag.

Getest: `tsc --noEmit`, `test:unit` (4918 geslaagd, met de nieuwe groep voor `binnenWoordlimiet()`),
`test:chain` (666 geslaagd) en `build` zijn allemaal groen.

## 19 september 2026: een echt bruikbare zoekterm per meetvraag, niet meer per onderwerp-plaats

De eigenaar wilde geen genoegen nemen met het grovere alternatief uit de vorige logboekregel (volume
per onderwerp-plaats-combinatie): echt per voorgesteld contentitem een indicatie van het zoekverkeer,
dus per meetvraag. Dat bleek mogelijk zonder een nieuwe AI-aanroep, door twee bouwstenen te gebruiken
die al bestaan: het `cluster`-label dat `generatePromptsForStage()` (`lib/pipeline/prompts.ts`)
sowieso al per meetvraag meegeeft ("kort thema-label", bijvoorbeeld "dakrenovatie"), en de plaats die
bij een lokaal bedrijf al letterlijk in de vraag staat (`geoRule`, dezelfde regel die de plaats erin
dwingt). `afleidenZoekterm()` (probeerde de vrije zin terug te knippen) is vervangen door
`kandidaatZoektermen()` (`lib/search-demand/keywords.ts`), die thema plus plaats aan elkaar plakt.

**De verificatie tegen het echte account leverde meteen een tweede bevinding op.** Met vijf
voorbeelden uit de eerdere steekproef (daklekkage, dakrenovatie, bekkenfysiotherapie,
hardloopblessure, zakelijke lease) kreeg "daklekkage apeldoorn" een volume (40/maand), maar de andere
vier niet: "bekkenfysiotherapie utrecht", "hardloopblessure utrecht" en "zakelijke lease bedrijfswagen
oss" leverden alle drie `null` op. Een losse test op de kale thema's zonder plaats liet zien waarom:
"bekkenfysiotherapie" alleen heeft een gemeten volume van 5.400/maand, "zakelijke lease" 1.000/maand,
"hardloopblessure" 20/maand. Google Ads heeft dus vaak wél data op het brede onderwerp, maar niet meer
zodra er een specifieke plaats bij komt, dat combinatieniveau zakt onder de meetdrempel van de
leverancier. Dat is geen bug maar een grens van de brondata.

**De reparatie: twee kandidaten in plaats van één, van specifiek naar breed.**
`kandidaatZoektermen()` geeft `["thema plaats", "thema"]` terug als er een plaats gevonden is, anders
alleen `["thema"]`. `prepare.ts` haalt alle kandidaten van alle vragen in één keer op (de cache in
`cache.ts` voorkomt dubbel betalen) en kiest per vraag de eerste kandidaat met een echt volume. Eén
scherpte daarbij: `zwaarsteVolume`, waarmee `bandFromMeasuredVolume()` herschaalt, rekent alleen met
de daadwerkelijk GEKOZEN volumes per vraag, niet met de hele kandidatenpoel. Zou dat wel zo zijn, dan
kan een brede terugvalterm die maar één vraag gebruikt (zoals "bekkenfysiotherapie" op 5.400) de schaal
van alle andere vragen in dezelfde batch optrekken, ook van vragen die die term zelf niet gebruikten.

**Wat dit niet is: een garantie dat elke vraag nu een gemeten volume krijgt.** Bij een erg specifieke
combinatie van thema en plaats, of een thema dat ook op zichzelf zelden gezocht wordt, blijft
`volume_source` gewoon op `geschat` staan. Dat is precies conventie 3: onbekend is een betere waarde
dan een verkeerde, dus geen derde, nog bredere terugvalstap toegevoegd die het risico op een
oneerlijke vergelijking (een heel andere zoekvraag) weer zou vergroten.

Nog niet gedaan: dit nagerekend op een volledige, echte `keyword_discovery`-ronde met de dertig
meetvragen van één bestaand merk, in plaats van losse voorbeelden. Dat staat als open vraag 3 in
`docs/tasks/zoekdata-in-de-keten.md`.

Getest: `tsc --noEmit`, `test:unit` (4919 geslaagd, met de vernieuwde groep voor
`kandidaatZoektermen()`), `test:chain` (666 geslaagd) en `build` zijn allemaal groen.

## 20 september 2026: de eerste echte testronde, en de bug die hij blootlegde

Na de merge naar `main` is de nieuwe code voor het eerst op een echt cluster van een bestaande klant
gedraaid: Van den Udenhout, "Occasion kopen in Noord-Brabant" (analyse `027487ec-4879-44ca-a1b3-141720fadd34`).
Alle vijf taken liepen zonder fouten: onderzoek, promptgeneratie in drie funnelfasen, nakalibratie.

**Het resultaat op de zoektermen: 9 van de 30 vragen (30%) kregen een echt gemeten volume.** Een paar
voorbeelden van de terugvalconstructie uit de vorige logboekregel, nu bevestigd in het echt: "financiering
oss" leverde niets op, "financiering" alleen wel (2.400/maand); "verborgen gebreken rosmalen" niets,
"verborgen gebreken" alleen 1.300/maand; "aankoopkeuring rosmalen" niets, "aankoopkeuring" alleen
880/maand. Kosten van de hele ronde: $0,18 bij DataForSEO (drie aanroepen, één per funnelfase, 54
zoektermen in totaal) plus ongeveer $0,02 aan AI-aanroepen.

**⚠️ Maar de test bracht ook een bug boven die niets met deze bouwronde te maken had.** Ná de drie
funnelfasen draait een bestaande, aparte taak (`calibrate_volumes` → `calibratePromptVolumes()` in
`lib/pipeline/prepare.ts`, gebouwd lang vóór deze bouwronde) die alle vragen van de analyse nog één keer
met een AI-schatting herweegt, "consistenter dan losse schattingen per vraag". Die stap keek niet naar
`volume_source` en overschreef dus ook de band van de net gemeten vragen. Concreet bewijs: "financiering"
had met 2.400/maand veruit het hoogste échte volume van de hele set en had daarom band "hoog" moeten
worden (`bandFromMeasuredVolume()` schaalt de zwaarste vraag van de batch naar 100). In plaats daarvan
kwam de vraag na de nakalibratie op band "midden" met een AI-schatting van 32, terwijl `volume_source`
gewoon op `gemeten` bleef staan. Het label zei "gemeten", het cijfer erachter was weer een gok.

**De reparatie:** `calibratePromptVolumes()` (`lib/pipeline/prepare.ts`) sluit vragen met
`volume_source = 'gemeten'` nu uit van zijn `select`, dus ook van zijn `update`. Zo'n vraag behoudt de
band die `bandFromMeasuredVolume()` haar gaf, en de resterende geschatte vragen worden zoals voorheen
relatief tegen elkaar afgezet. Een scenario in `test-chain.ts` (T8.2) legt dit vast: een vraag met
`volume_source = 'gemeten'` komt ongewijzigd uit `calibratePromptVolumes()`, twee vragen met
`volume_source = 'geschat'` doen wél mee.

**Waarom dit niet in `docs/tasks/zoekdata-in-de-keten.md` stond:** dat plan beschrijft `prepare.ts`'s
eigen `bandFromMeasuredVolume()`-stap binnen één funnelfase, maar niet deze latere, analysebrede
nabewerkingstaak, die al bestond vóór deze bouwronde en nergens de nieuwe `volume_source`-waarde kende.
Dat is precies het soort gat dat alleen een echte, volledige testronde blootlegt, en niet een geïsoleerde
unit- of ketentest die deze twee stappen nooit na elkaar liet lopen.

Getest: `tsc --noEmit`, `test:unit` (4919 geslaagd), `test:chain` (669 geslaagd, met het nieuwe
scenario T8.2) en `build` zijn allemaal groen.

## 20 september 2026 (2): de zoekvolumelaag gaat op de parkeerstand

Een Teamsessie over `lib/search-demand/` (SEO 28%, Data 20%, Product 16%, GEO 14%, AI 12%,
Engineering 10%, plus tegenspraak) eindigde met een uitkomst die niemand vooraf had: de koppeling
hoeft niet gerepareerd te worden maar geparkeerd, en de reden is in één zin na te rekenen.

**Je kunt deze laag uitzetten en er verandert niets zichtbaars in de app.** Geen scherm, geen score,
geen aanbeveling. Nagerekend tegen productie op 20 september: 0 van de 23 onderwerpen heeft een
gemeten zoekvolume, de potentiescore leest `profile_topics.search_volume_absolute` nergens
(`lib/potential-data.ts` regel 100-106 leest alleen `search_volume_index`, en dat is de AI-schatting
uit `lib/pipeline/search-demand.ts`), en de 9 meetvragen die het label `gemeten` dragen staan alle
negen op band `midden`, net als de 21 vragen zonder meting. De laag heeft $0,18 aan data opgeleverd
die niemand leest.

**Daartegenover staat wat hij heeft gekost:** drie migraties waarvan er één (`0105`, tabel
`profile_keywords`) een tabel aanmaakte die nergens in `app/` of `lib/` wordt aangeroepen, ruim 400
regels module, en twee productiebugs. Allebei die bugs ontstonden op het raakvlak tussen de nieuwe
laag en iets dat er al stond: de batch die klapte op één te lange zoekterm (19 september) en de
nakalibratie die een gemeten band overschreef terwijl het label `gemeten` bleef staan (20 september).
Dat patroon, en niet de kosten, is de reden om te stoppen.

**⚠️ En er stond een derde fout klaar die nog nooit is opgetreden.** `bandFromMeasuredVolume()`
(`lib/pipeline/volume.ts`) schaalt naar de zwaarste gemeten term van de batch. Bij Van den Udenhout
was dat "financiering": 2.400 zoekopdrachten per maand met een CPC van 14,66 euro, dus hypotheken en
zakelijke leningen, niet autofinanciering. Die term zou anker worden en dus band `hoog` met gewicht
1,0 krijgen, terwijl "aankoopadvies" (50 per maand, wel passend) naar het minimumgewicht zakt. In
productie is dat nooit gebeurd omdat de nakalibratiebug alles naar `midden` platsloeg. **De
reparatie van vanochtend maakt die fout bij de eerstvolgende analyse voor het eerst werkzaam.** Dat
is de directe aanleiding om nu te parkeren en niet volgende maand.

**De schakelaar staat in code, niet in Vercel.** De eigenaar wil `DATAFORSEO_LOGIN` en
`DATAFORSEO_PASSWORD` laten staan om later te kunnen doorontwikkelen. Daarmee kan de aanwezigheid
van een sleutel niet langer de schakelaar zijn, want dan draait de laag gewoon door. Vandaar
`SEARCH_DEMAND_ENABLED` in `lib/search-demand/registry.ts`, standaard uit, en alleen de letterlijke
waarde `true` zet hem aan. Die grendel zit óók op de cache (`lib/search-demand/cache.ts`): zonder
dat zouden de 7 zoektermen uit `keyword_demand` nog tot ongeveer 19 oktober een band kunnen zetten
in een app die geacht wordt stil te staan. Scenario 13 in `test-chain.ts` legt allebei vast, inclusief
dat twee geldige sleutels op zichzelf niet genoeg zijn.

**Niet gesloopt, en dat is een bewuste keuze.** De tabel `profile_keywords`, de kolommen
`profile_topics.search_volume_absolute` en `search_volume_source`, en de module zelf blijven staan.
Conventie 4 zegt dat migraties additief zijn en nooit `drop`, en een tabel weggooien is onomkeerbaar.
Slapende code die niets doet kost minder dan een migratie die data vernietigt. Wat wel is opgeruimd:
elke plek in de documentatie die beweerde dat deze koppeling iets doet wat hij niet doet.

**Waarom dit terugkomt, en waarom niet eerder.** Drie aanleidingen, en pas bij één daarvan is het de
moeite waard: als de toets uit blok D aantoont dat echte zoekopdrachten de tekst beter maken (en die
toets kan volledig op Search Console-data, zonder DataForSEO), als er zoveel merken zijn dat
onderwerpen kiezen in het strategisch gesprek niet meer schaalt, of als een klant in een gesprek
vraagt hoe vaak iets gezocht wordt en het antwoord schuldig blijft. Tot die tijd is het aanbod van de
klant plus het gesprek een sterker signaal dan een zoekvolume van Google Ads, zeker bij 23
onderwerpen.

**De belangrijkste les, los van deze koppeling.** Het ergste is niet een koppeling die niet werkt,
maar een koppeling die half werkt en meedraait: die kost bugs zonder iets op te leveren. "Gebouwd,
niet gebruikt" is geen neutrale toestand.

Getest: `tsc --noEmit`, `test:unit`, `test:chain` en `build` groen.

## 20 september 2026 (3): één meting is een muntworp, en Google is dat net zo goed

De eigenaar merkte dat dezelfde cluster twee keer meten twee verschillende uitslagen geeft, en vroeg
of Search Console of de nieuwe SEO-api dat kon oplossen. Het antwoord op de eerste helft is ja, op de
tweede helft nee, en de reden staat in cijfers die vandaag zijn nagemeten. Het volledige plan staat
in `docs/tasks/ai-overview-als-tweede-meetbron.md`.

**De diagnose klopt, maar de oorzaak is niet de steekproefgrootte.** Het is de uitkomst per vraag.
Bij de klantmeting gaan de acht zwaarste vragen drie keer door de meting, binnen dezelfde ronde,
minuten na elkaar: van de 11 vragen waar het merk ooit genoemd werd, gaven er **6 een andere
uitkomst bij de herhaling**. Bij de markt Tilburg (dezelfde 40 vragen op 1 en 15 september) klapten
**27 van de 45** combinaties van vraag en bedrijf om. Van Erve ging van 5 vermeldingen naar 1.

**De noemer beweegt mee, en dat tikt harder aan dan de teller.** Bij die markt noemden **24 van de 40
vragen in beide rondes geen enkel bedrijf**. Je betaalt voor 40 vragen en meet er 16.

**De rem die dit moest opvangen heeft nog nooit gevuurd.** `elicit-rate.ts` slaat een vraag pas over
na acht metingen. Van de 210 vragen op productie heeft er **geen enkele meer dan 3**. De besparing
die de herhalingen uit R6.1 moest betalen bestaat dus niet.

**⚠️ De aanname over Google AI Overview is weerlegd, en dat is de belangrijkste uitkomst van vandaag.**
Vooraf was de redenering: een AI Overview wordt per zoekopdracht bewaard, dus is hij rustiger dan een
ChatGPT-antwoord, dus is hij de stabiele tweede as. Nagemeten op alle 90 prompts van Van den
Udenhout, twee volledige rondes met een half uur ertussen, 234 aanroepen voor $0,85: van de 28 vragen
waar het merk ooit genoemd werd **wisselde de uitkomst bij 17 (61%)**, van de 418 bronnen kwamen er
**204 terug (49%)**, en bij 1 op de 5 vragen wisselde zelfs of er überhaupt een AI Overview
verscheen. Het cluster wagenparkbeheer ging van 8% naar 20% in een half uur. Google is dus niet
rustiger dan ChatGPT, eerder onrustiger.

**Wat wél standhield: de dekking en de prijs.** 91% van de geslaagde aanroepen levert een bruikbare
AI Overview, en die noemt concrete lokale bedrijven met hun eigen site als bron. De zorg dat Google
bij lokale koopvragen een kaart toont in plaats van een overzicht bleek ongegrond. Nagemeten in
`ai_calls` kost een ChatGPT-ronde van 30 prompts **$0,76** (46 metingen, want acht vragen gaan drie
keer, plus $0,03 voor de beoordelaar). Diezelfde 30 prompts via de SERP-api kosten **$0,13**,
inclusief de herkansingen: **bijna een derde van de aanroepen mislukt bij de eerste poging** met
`40101 Internal SE Server Error`, en zo'n mislukte aanroep kost tóch $0,002.

**Daarmee draait de zakelijke reden om.** Google is niet het rustige signaal maar het kanaal waar
herhalen betaalbaar is, en herhalen is wat de wiebel wegneemt. Drie metingen per vraag kosten daar
$0,38 per cluster, tegen $1,54 bij ChatGPT. Wie deze bron bouwt, ontwerpt hem dus vanaf dag één met
herhalingen, en presenteert hem nooit als de nauwkeurige tegenhanger van ChatGPT.

**Twee dingen die eerst moeten.** `computeAggregates()` bevat **geen enkele engine-filter** (het
woord komt in die functie niet voor), dus per engine uitwaaieren laat vandaag elke vraag dubbel
meetellen; de waarschuwing in `lib/jobs/queue.ts` is nog steeds geldig. En een AI Overview past niet
in `EngineAdapter`: die interface verwacht een gesprek met een systeemprompt, een SERP-api geeft een
resultatenpagina. Het is een derde soort bron, geen vierde engine.

**De les die breder geldt dan deze koppeling.** "Gecached, dus stabiel" was een plausibele redenering
die twee keer in dit gesprek als feit is gebruikt voordat hij gemeten werd. Hij kostte $0,85 om te
weerleggen. Conventie 10 gaat niet alleen over wat je bouwt, maar ook over wat je adviseert.

Niets aan code gewijzigd: dit was onderzoek.

## 20 september 2026 (4): stap 1 van het meetplan vervalt, nagerekend voordat hij gebouwd werd

De eigenaar gaf akkoord op "snoeien en herhalen, budgetneutraal" als eerste ingreep tegen de
springende clusterscore. Bij het openen van `elicit-rate.ts` bleek die stap op drie verkeerde
aannames te rusten, alle drie van mij. Niets gebouwd, plan gecorrigeerd.

**De knop die ik wilde omzetten klemt niet.** `maySkip()` eist genoeg metingen én een
Wilson-bovengrens onder de 25%. Bij nul successen is die bovengrens `Z²/(n+Z²)`, en die zakt pas bij
**twaalf** metingen onder de drempel (24,3%; bij elf nog 25,9%). `MIN_SAMPLES_TO_SKIP` van 8 naar 3
zetten verandert dus exact niets, want de bovengrenstoets blijft bindend. Dat verklaart ook waarom
er op productie geen enkele vraag op `brand_eliciting = 'nee'` staat: met één meting per maandronde
duurt het twaalf maanden voordat een vraag mág afvallen.

**Er valt op de klantmeting niets te snoeien.** Per vraag nagemeten over alle zes de clusters: het
aantal vragen dat nog nooit één aanbieder opleverde is 0, 0, 1, 1, 2 en 3 van de 30. Ongeveer $0,02
per ronde. De 24-van-de-40 waarmee ik de stap onderbouwde komt uit de **salesmodule**, een andere
pijplijn die dertig bedrijven tegelijk meet in plaats van één merk. Twee pijplijnen over één kam
scheren was de fout, en hij was met één query zichtbaar geweest.

**En snoeien had de score sowieso niet bewogen.** Vragen zonder enige aanbieder vallen al buiten de
noemer (`winnableRunIds`). Het bespaart geld en verschuift geen cijfer.

**Wat bij diezelfde controle juist wél bleek te kloppen.** De herhalingen gaan naar de acht
zwaarstwegende vragen en het scherm toont de gewogen score, dus die toewijzing is juist. De
foutmarge wordt bewust in vragen gerekend en niet in metingen, waardoor herhalingen de band niet
smaller maken; dat is conservatief en werkt in het voordeel van de klant, want een bredere band
betekent vaker "gelijk gebleven" in plaats van vals alarm. En de presentatie heeft de marge-kolom en
`changeIsMeaningful()` al. Het stuk van de app dat ik wilde repareren was het stuk dat al klopte.

**Wat overblijft is een geldvraag en twee gratis ingrepen.** Gratis: het gemiddelde over de laatste
drie rondes als hoofdgetal (wiebel omlaag met wortel drie, nul extra metingen), en een rem op
handmatig hermeten zodat twee metingen op één dag samengevoegd worden in plaats van als twee
uitslagen getoond. Die tweede is letterlijk wat de eigenaar overkwam. Kost geld: drie metingen per
vraag in plaats van 46 per cluster, $1,54 tegen $0,76, band 1,57 keer smaller. En er is één plek
waar snoeien wél loont, maar dat is de salesmodule met 24 van de 40 vragen merkloos.

**De les.** Twee keer in twee dagen heb ik een plausibele redenering als feit gebruikt: eerst
"gecached, dus stabiel", nu "de overslaanregel klemt op acht". Allebei viel in één commando te
weerleggen. Conventie 10 zegt dat gebouwd niet geverifieerd is; dit gesprek voegt toe dat een
geaccepteerd plan dat ook niet is.

Niets aan code gewijzigd.

## 20 september 2026 (5): het hoofdgetal komt uit drie rondes, en sales krijgt een tijdrem

De twee gratis ingrepen uit `docs/tasks/ai-overview-als-tweede-meetbron.md` staan er. Allebei lossen
ze hetzelfde op: een klant die naar één meetronde kijkt en daar een stand in leest die er niet is.

**Het hoofdgetal komt nu uit de laatste drie rondes samen** (`lib/stats/pooling.ts`). Eén ronde is
een steekproef met een band van ±16 punten bij 30 vragen, en dat is breder dan het verschil dat een
klant als vooruitgang of verval leest. Drie rondes samenvoegen maakt de band ongeveer 1,7 keer
smaller, en kost geen enkele extra meting: die rondes zijn al gedaan en al betaald. De weging gaat
op zekerheid (inverse variantie), dus een ronde met een smalle band telt zwaarder dan een met een
brede.

**⚠️ De valkuil daarbij is dat je een echte stijging uitsmeert.** Publiceert een klant een pagina en
gaat hij van 10% naar 70%, dan zou blind middelen hem zijn verdiende winst afpakken. Vandaar dat
`poolRecent()` stopt met samenvoegen zodra een oudere ronde betekenisvol afwijkt van de nieuwste.
Die grens wordt niet in de nieuwe module bedacht maar opgehaald bij `changeIsMeaningful()`, dezelfde
functie die elders bepaalt of er een pijltje getoond mag worden. Eén feit, één eigenaar. In gewone
taal: rustige maanden worden samengevoegd tot een steeds zekerder cijfer, en zodra er echt iets
gebeurt begint de teller opnieuw bij de ronde waarin dat gebeurde. De kolom "Verandering" blijft
bewust de losse rondes vergelijken, want dat is een andere vraag dan het hoofdgetal.

**Vandaag verandert er niets zichtbaars, en dat hoort zo.** Geen enkele analyse op productie heeft
een tweede periode, alles staat op `week_no = 0`. Bij één ronde komt die ronde onveranderd terug.
De winst begint bij de tweede meetronde.

**De salesmodule kreeg een tijdrem.** `maakHermeting()` had een budgetrem en een statusrem, maar je
kon een markt twee keer op één ochtend hermeten. Dat meet geen marktverandering maar ruis: op de
echte markt Tilburg klapten 27 van de 45 vraag-bedrijfcombinaties om tussen twee rondes, en Van
Erve ging van 5 vermeldingen naar 1 zonder dat er iets aan Van Erve veranderd was. Opportunitytype 8
("gezakt sinds de vorige meting") zou die ruis vervolgens in een conceptmail zetten. Nu geldt
dezelfde grens en dezelfde functie als aan de klantkant, 21 dagen via `mayMeasureAgain()`, bewust
geen eigen regel ernaast.

**Wat bij deze ronde bleek en niet in het plan stond:** de klantmeting had die rem al, zonder dat
iemand hem zo noemde. `POST /api/analyses/[id]/measure` meet altijd op `week_no = 0` en
`enqueueMeasurement()` slaat al gemeten vragen over, dus een tweede druk op de knop plant nul taken.
De maandtaak heeft zijn eigen rem. Alleen sales stond open, en dat is precies de module waar een
getal rechtstreeks een verkoopmail in loopt.

**Ook de ketentest doet nu het echte werk.** Het hermeetscenario bouwde ronde 2 na met een insert;
nu roept het `maakHermeting()` aan, en toetst eerst dat een hermeting op dezelfde dag geweigerd
wordt en er geen ronde is aangemaakt.

Getest: `tsc --noEmit`, `test:unit` (4935, was 4919), `test:chain` (690, was 686) en `build` groen.

## 20 september 2026 (6): de band is het hoofdgetal geworden, in antwoorden in plaats van procenten

"21%" leest als een stand. Het is er geen: de band eromheen is ±15 punten, en van de 11 herhaald
gemeten vragen waar het merk ooit genoemd werd gaven er 6 een andere uitkomst bij de herhaling
(20 september (3)). Een klant die 21% een maand later ziet verschuiven naar 13% leest daar verval in
dat er niet is.

**Het hoofdgetal is nu de band, uitgedrukt in antwoorden.** `bandInAntwoorden()` in
`lib/stats/uncertainty.ts`, naast `confidenceBand()` waar hij hoort. Waar stond "21%" staat nu
"1 tot 4 van de 10", met eronder "AI-antwoorden waarin je merk voorkomt". Het precieze percentage en
de marge staan er nog steeds onder, voor wie wil narekenen.

**Waarom tien en niet dertig.** Een meetronde stelt dertig vragen, dus "3 tot 11 van de 30" is
precies even waar. Maar niemand rekent in dertigsten. Tien is de schaal waarop een mens een
verhouding meteen ziet.

**Drie randgevallen, en waarom ze zo aflopen.** Een band die op deze schaal één getal wordt heet
"ongeveer 2 van de 10", want "tussen 2 en 2" leest als een fout terwijl het juist het zekerste geval
is. Een band waarvan zelfs de bovengrens geen heel antwoord haalt heet "minder dan 1 van de 10" en
niet "0 tot 0": dat laatste zou beloven dat het merk gegarandeerd nooit genoemd wordt, en dat weten
we niet (conventie 3).

**Waar het NIET is doorgevoerd, en dat is een keuze.** De clustertabel, het detailpaneel met de
laatste drie metingen en het staafjesraster houden hun percentage. Dat zijn vergelijkingsweergaven
waar je rijen naast elkaar legt, en de staven tonen hun marge al visueel. De band als hoofdgetal
hoort op de twee plekken waar één cijfer zich als "de stand" presenteert: het merkscherm en
Zichtbaarheid in AI.

Getest: `tsc --noEmit`, `test:unit` (4941, was 4935), `test:chain` (690) en `build` groen.

## 20 september 2026 (7): de aggregatie is engine-bewust, stap 2 van het meetplan

`lib/jobs/queue.ts` waarschuwde al maanden dat je niet per engine mocht uitwaaieren omdat de
aggregatie alle metingen van een periode optelde, ongeacht bron. Die waarschuwing was terecht:
`computeAggregates()` bevatte het woord "engine" niet.

**De fout die dit voorkomt is subtieler dan dubbeltellen.** `shareByRun()` (R6.1) deelt het gewicht
van een vraag over zijn metingen, zodat een drie keer gemeten vraag niet drie keer zo zwaar telt.
Maar die functie ziet twee metingen van dezelfde vraag door twee verschillende bronnen aan voor twee
HERHALINGEN en geeft ze elk gewicht 1/2. Eén vraag, bij ChatGPT wél genoemd en bij Google niet, zou
dan als "half genoemd" de score in gaan: 50 in plaats van 100. Het cijfer blijft plausibel en slaat
nergens meer op. Het scenario in `test-chain.ts` toetst precies dat verschil.

**De regel: één engine draagt de score.** `PRIMARY_ENGINE` in `lib/engines/types.ts`, nu `openai`.
De score, het gewogen cijfer, de foutmarge, het aandeel en de concurrentie-uitsplitsing rekenen
alleen daarmee. Dat is geen tussenoplossing: de vraag van de klant is "noemt ChatGPT mij", niet
"noemt het gemiddelde van ChatGPT en Google mij". Een gemengd cijfer beantwoordt geen van beide.

**De andere bronnen komen in `per_engine_json`**, een kolom die sinds migratie 0001 bestaat en nooit
gevuld was. Elke bron krijgt daar zijn eigen score, foutmarge en aantallen, en nadrukkelijk zijn
eigen aandelenberekening, want anders keert dezelfde halveringsfout via de achterdeur terug.

**Drie tellers, drie verschillende redenen.** `measurementIsUsable()` filtert op de primaire engine
omdat zijn noemer de VRAGEN van de analyse telt; twee bronnen optellen zou die teller boven de
noemer duwen en een halve mislukte ronde alsnog bruikbaar noemen.
`countOpenPeriodicMeasurements()` wacht alleen op de primaire engine, want anders blijft een analyse
hangen op zijn voortgangsscherm zodra een tweede bron traag is, terwijl het cijfer allang gerekend
kan worden. En `updateBrandEliciting()` telt alleen de primaire engine omdat meetbaarheid een
eigenschap is van vraag én bron: een vraag die bij Google aanbieders oplevert en bij ChatGPT nooit,
zou anders een dure ChatGPT-meting in leven houden die daar structureel niets doet.

**Wat er nog ontbreekt vóór er echt per engine ingepland wordt:** een tweede bron die iets oplevert
(er is geen `GEMINI_API_KEY`), en de tarieven van die bron in `lib/openai/pricing.ts`, anders staat
er een meetronde in het kostenoverzicht met een prijs van nul.

Getest: `tsc --noEmit`, `test:unit` (4947, was 4941), `test:chain` (696, was 690) en `build` groen.

## 20 september 2026 (8): Google AI Overview meet mee, achter een schakelaar die uit staat

Stap 3 van `docs/tasks/ai-overview-als-tweede-meetbron.md`. Elke meetvraag kan nu ook langs het
AI-overzicht van Google, drie keer per vraag, en het resultaat landt in `tracking_runs` naast de
ChatGPT-meting.

**Het is een bron, geen engine, en dat onderscheid zit in de code.** `EngineAdapter` verwacht een
gesprek: een systeemprompt en een gebruikersvraag. Hier gaat een zoekopdracht naar een zoekmachine en
komt een resultatenpagina terug. Vandaar `lib/ai-overview/` naast `lib/engines/`, en een eigen
taaktype `measure_ai_overview` in plaats van een engine-variant van `measure_prompt` (conventie 7).
In de OPSLAG is het wél gewoon een bron naast de andere: `engine = 'google_ai_overview'`, waarmee
deze bron de hele beoordelings- en aggregatieketen erft.

**Wat wél gedeeld wordt, is de beoordelaar.** Halte 3b is uit `measureOnePrompt()` gelicht tot
`judgeRun()`, en beide bronnen gebruiken hem. Dat is geen gemak maar een meetvereiste: met twee
beoordelaars meet je het verschil tussen die twee in plaats van tussen ChatGPT en Google, en is geen
enkele vergelijking tussen de bronnen nog iets waard.

**⚠️ Geen overzicht is geen nulscore.** Toont Google bij een vraag geen AI Overview, dan wordt er
niets opgeslagen en telt die vraag die ronde niet mee in de noemer van deze bron. Zou je hem als
"merk niet genoemd" wegschrijven, dan zakt de score doordat Google geen antwoord gaf (conventie 3).
Dat is geen randgeval: 9% van de geslaagde aanroepen levert geen bruikbaar overzicht op.

**Drie herhalingen per vraag, vanaf dag één.** Niet omdat het kan maar omdat het moet: van de 28
vragen waar het merk ooit genoemd werd wisselde de uitkomst bij 17 tussen twee rondes een half uur na
elkaar. Eén losse uitkomst is ongeveer een muntworp. Bij $0,0037 per aanroep kost drie keer meten van
dertig vragen ongeveer $0,38, tegen $1,54 voor hetzelfde bij ChatGPT. De prijs is de enige reden dat
deze bron de moeite is, en die prijs wordt hier uitgegeven aan zekerheid.

**De herkansing zit in de aanroep zelf.** Bijna een derde van de aanroepen geeft `40101 Internal SE
Server Error` bij de eerste poging (26 van 90, en 28 van 90 in de tweede ronde); alle 54
herkansingen slaagden. Zonder die lus zou een derde van elke ronde ontbreken en verspringt de noemer
per ronde. ⚠️ Een mislukte aanroep kost tóch $0,002, dus die kosten tellen op bij de volgende poging
en worden altijd gelogd, ook als er niets gemeten is.

**De schakelaar staat in code en staat uit.** `AI_OVERVIEW_ENABLED`, standaard uit, en de
aanwezigheid van een DataForSEO-sleutel zet hem niet aan. Dat is de les van 20 september (2)
toegepast: die sleutels staan in Vercel voor de geparkeerde zoekvolumelaag, dus zou de sleutel
volstaan, dan ging deze betaalde bron meteen meedraaien op elke omgeving waar die laag ooit is
opgezet. Scenario 14 in `test-chain.ts` legt vast dat twee geldige sleutels op zichzelf niets doen,
dat de schakelaar aan drie metingen per vraag oplevert, en dat tweemaal plannen niets verdubbelt.

**Twee dingen die deze taak bewust NIET doet.** Hij ketent niet naar de aggregatie, want dan werd die
per binnenkomende meting opnieuw gedraaid: negentig keer hetzelfde rekenwerk en een rapport dat
halverwege een ronde verstuurd wordt. En hij telt niet mee in `planned` op het voortgangsscherm,
want dat scherm wacht op de score, en de score rust op `PRIMARY_ENGINE`.

Getest: `tsc --noEmit`, `test:unit` (4964, was 4947), `test:chain` (709, was 696) en `build` groen.
⚠️ Niet geverifieerd tegen productie (conventie 10): de bron heeft nog geen echte meetronde gedraaid
binnen de app. Het onderzoek eronder is wél tegen het echte account gedaan, 234 aanroepen voor $0,85.

## 20 september 2026 (9): een bronknop op Zichtbaarheid, en beide bronnen voeden de kansen

Twee wensen van de eigenaar, en de tweede dwong een besluit van vanochtend terug te draaien.

**De bronknop.** Op `/merk/[id]/analytics` staat nu een vierde filter, "Bron", met ChatGPT en Google
AI Overview. Hij wisselt wélk cijfer er staat, in plaats van ergens een tweede getal naast te
zetten dat uitgelegd moet worden. Nadrukkelijk alleen op dat scherm: nergens anders in de app
verschijnt een tweede cijfer.

De knop verschijnt alleen als er daadwerkelijk via meer dan één bron gemeten is
(`beschikbareBronnen()`), zelfde regel als de rest van de filterbalk. Voor een klant met alleen
ChatGPT-metingen verandert er dus niets. En de primaire bron leest bewust de gewone kolommen van
`visibility_scores` in plaats van `per_engine_json`: die kolommen ZIJN de primaire engine sinds de
aggregatie engine-bewust werd, dus wie de knop nooit aanraakt ziet exact wat hij altijd zag.

**⚠️ Een ronde zonder deze bron is geen nul.** Rondes van vóór de tweede bron hebben geen
`per_engine_json`, en `cijferVoorBron()` geeft daar `null` terug in plaats van 0. Die rondes vallen
uit de grafiek in plaats van als val getoond te worden (conventie 3).

**Het gewogen cijfer staat nu óók per bron in `per_engine_json`.** Zonder dat zou de knop een gewogen
ChatGPT-cijfer vergelijken met een ongewogen Google-cijfer, en is een deel van het verschil een
rekenverschil in plaats van een verschil tussen de platformen.

**⚠️ En het besluit van vanochtend dat is teruggedraaid.** Bij het engine-bewust maken van de
aggregatie telde `countOpenPeriodicMeasurements()` alleen de primaire engine, met als redenering:
laat een trage tweede bron de analyse niet laten hangen. Die redenering sneuvelt op de tweede wens.
De kansen die een klant ziet komen uit `computeMissedPrompts()`, en dat telt per VRAAG met een
meerderheidsregel over álle metingen van die vraag. Een vraag die bij ChatGPT gemist wordt en bij
Google drie keer raak is, is dus géén gemiste kans. Precies de bedoeling, maar dat werkt alleen als
beide bronnen binnen zijn vóórdat het rapport draait. Wacht de aggregatie niet, dan landen de
Google-metingen ná het rapport en tellen ze die ronde nergens in mee.

Het oude bezwaar is geen loos bezwaar, maar het lost zichzelf op: een taak die blijft mislukken gaat
na `MAX_ATTEMPTS` naar 'failed' en valt daarmee uit `queued`/`running`, de enige twee statussen die
de teller opvraagt. Een kapotte tweede bron vertraagt een ronde dus, maar kan hem niet laten hangen.
Gevolg: `measure_ai_overview` ketent nu ook naar de aggregatie, en telt mee in de voortgangsteller
die de klant ziet.

**De bron staat aan op productie.** `AI_OVERVIEW_ENABLED=true` in Vercel, alleen op productie. Een
cluster wordt vanaf nu door beide bronnen gemeten: 46 ChatGPT-metingen plus 90 Google-metingen (drie
per vraag), samen ongeveer $1,14 per meetronde per cluster tegen $0,76 daarvoor. In code blijft de
schakelaar standaard uit, dus preview- en ontwikkelomgevingen meten niets en geven niets uit.

Getest: `tsc --noEmit`, `test:unit` (4980, was 4964), `test:chain` (709) en `build` groen.
⚠️ Nog niet geverifieerd tegen productie (conventie 10): de eerste echte meetronde met beide bronnen
moet nog draaien.

## 20 september 2026 (10): de eerste echte meetronde met beide bronnen (APK Den Bosch)

Conventie 10 afgevinkt voor de tweede meetbron. Een nieuw cluster voor Van den Udenhout, onderwerp
"APK Den Bosch", volledig door de productiepijplijn: voorbereiding, dertig vragen, meting,
aggregatie en rapport. **136 meettaken, nul mislukt, geen enkele taak meer dan één poging.**

**De kosten kloppen op de cent.** Geraamd $1,14, geworden **$1,1484**: $0,7738 voor ChatGPT (46
metingen plus beoordelaar) en $0,3140 voor Google (90 aanroepen). De raming uit
`docs/tasks/ai-overview-als-tweede-meetbron.md` hoeft dus niet bijgesteld.

**De aggregatie wachtte op beide bronnen**, zoals bedoeld: `aggregate_week` draaide pas nadat alle
136 taken klaar waren, en het rapport zegt "30 vragen onderzocht, samen 110 keer gemeten" (46 plus
64). De score bleef van ChatGPT: 28% ongewogen, 25% gewogen, over 30 beoordeelde vragen en niet over
52. `per_engine_json` draagt beide bronnen inclusief hun gewogen cijfer: ChatGPT 28/25 over 30
vragen, Google 18/17 over 22 vragen.

**⚠️ Een cijfer dat bijgesteld moet: "geen AI Overview" is vaker dan gedacht, maar wél stabiel.**
Het onderzoek van vanochtend mat 9% geen-overzicht op de geslaagde aanroepen. Hier is het 26 van de
90 aanroepen, 29%. Maar de verdeling per vraag laat zien dat het geen ruis is:

| overzichten per vraag | vragen |
|---|---|
| 3 van 3 | 20 |
| 2 van 3 | 2 |
| 0 van 3 | 8 |

Acht vragen krijgen bij Google structureel géén AI Overview, en maar twee vragen wisselen. Dat is
dus grotendeels een eigenschap van de vraag en niet van de meting, en dat is beter nieuws dan het
percentage suggereert: de dekking is voorspelbaar. Voor dit cluster is Google bruikbaar bij 22 van
de 30 vragen (73%).

**De meerderheidsregel deed precies wat hij moet.** Bij één vraag waren de bronnen het oneens
("Welke garage in Eindhoven biedt een APK aan terwijl ik op mijn auto kan wachten?"): ChatGPT noemde
Van den Udenhout in zijn enige meting, Google in geen van zijn drie. Vier oordelen, één keer
genoemd, dus een gemiste kans. Met alleen ChatGPT was diezelfde vraag als gewonnen geteld op één
muntworp. Dat is de hele winst van een tweede bron, en hij is hier op productie aantoonbaar.

**Wat het rapport ervan maakte:** 22 vragen die volgens de meerderheidsregel gemist worden, waarvan
de zwaarste 15 in de lijst (`MISSED_CAP`), en vijf aanbevelingen die allemaal op "verbeteren" staan.
Dat past bij een dealer die al een APK-pagina heeft.

⚠️ De vijf openstaande feitenvragen bij dit merk zijn voor deze test fictief beantwoord. Ze gaan
over wagenparkbeheer, niet over APK, en horen door de klant zelf bevestigd te worden voordat er een
pagina op gebaseerd wordt.

## 20 september 2026 (11): vier meetbronnen besloten, en het zoekvolume uit DataForSEO onderzocht

De eigenaar wil naast ChatGPT (eigen route) en Google AI Overview ook ChatGPT en Gemini via
DataForSEO meten, elk één keer per vraag, en daarnaast het AI-zoekvolume van DataForSEO gebruiken
voor de potentiescore. Het uitgewerkte plan staat in
`docs/tasks/vier-meetbronnen-en-ai-zoekvolume.md`. Drie dingen uit dat onderzoek horen hier:

**Het cijfer dat de beslissing draagt is er nog niet.** DataForSEO rekent voor een LLM-antwoord
$0,0006 per aanroep plus wat het model zelf aan tokens en aan web search kost, en die twee posten
staan nergens in hun documentatie. Ter vergelijking, gemeten in `ai_calls`: onze eigen ChatGPT-route
kost $0,0170 per meting, Google AI Overview $0,0037. Komen de nieuwe bronnen op dezelfde orde uit
als onze eigen route, dan gaat een meetronde per cluster van $1,15 naar ongeveer $2,15.
`scripts/probe-dataforseo-ai.ts` meet het voor ongeveer $0,21 na, op echte vragen van Van den
Udenhout, en is nog niet gedraaid.

**⚠️ Vier bronnen breken de meerderheidsregel.** De kansen komen uit `computeMissedPrompts()`
(`lib/pipeline/report.ts`), en die telt elke meting even zwaar. Met vier bronnen krijgt een gewone
vraag zes metingen, waarvan er drie van Google komen: Google zou in zijn eentje de helft van de stem
krijgen, en de bron die het cijfer van de klant draagt één zesde. Niet omdat Google belangrijker is,
maar omdat hij goedkoop is en daarom drie keer gemeten wordt. Het voorstel is eerst de meerderheid
binnen een bron te bepalen en pas daarna de bronnen te tellen, zodat het aantal herhalingen een
keuze over zekerheid blijft in plaats van een keuze over invloed.

**Het AI-zoekvolume is geen gemeten promptvolume.** DataForSEO leidt `ai_search_volume` af uit de
"People Also Ask"-vragen in hun eigen index van Google-resultaten en noemt het zelf relatieve
populariteit. De 370 miljoen verzamelde prompts uit de wervende tekst horen bij hun LLM
Mentions-product, niet bij dit endpoint. De winst zit dus niet in waarheid maar in herhaalbaarheid:
het cijfer verandert niet omdat je het nog eens opvraagt, en dat doet de huidige AI-schatting in
`lib/pipeline/search-demand.ts` wel. Kosten: ongeveer één cent voor alle onderwerpen van een merk.
Twee dingen zijn nog onbekend, en allebei kunnen ze het voorstel laten omvallen: of Nederland met
het Nederlands in dat endpoint bestaat, en of onze soort termen er een volume uit krijgen. Dat
laatste is een reëel risico: op 19 september kreeg bij het gewone zoekvolume 1 van de 10 uit
volzinnen afgeleide termen een resultaat.

Gebouwd is er niets. `tsc --noEmit` en `test:unit` (4980) groen.

## 20 september 2026 (12): Gemini via DataForSEO gebouwd, ChatGPT via DataForSEO afgevallen

Vervolg op (11). Stap 0 is gedraaid tegen een echt DataForSEO-account (~$0,26 in totaal, met
toestemming en inloggegevens van de eigenaar), en de uitkomsten staan met datum in
`docs/tasks/vier-meetbronnen-en-ai-zoekvolume.md` (hoofdstuk 6.1 t/m 6.3). Drie dingen uit die
verificatie:

- **ChatGPT via DataForSEO kostte met het eerste werkende model (`gpt-4o`) $0,0814 per meting**, ver
  boven de grens van $0,03 uit het plan en duurder dan onze eigen ChatGPT-route ($0,0170). Met
  `gpt-4o-mini` daalde dat naar $0,0272, wél onder de grens, maar de eigenaar heeft besloten deze
  bron toch niet te bouwen: hij levert weinig toe naast de eigen route en Google AI Overview.
- **Gemini via DataForSEO zit bij geen van de 12 geteste modellen betrouwbaar onder de grens**
  (gemiddeld $0,039 over 15 metingen, de kosten wisselen per vraag). De eigenaar accepteert dat
  expliciet: een goed beeld van de Nederlandse markt weegt zwaarder, en Gemini heeft geen
  ChatGPT-alternatief (`lib/engines/gemini.ts` wacht nog op een `GEMINI_API_KEY`).
- **Gemini kent geen Nederlandse zoekcontext.** Een lage score bij Gemini is niet uit elkaar te
  trekken in "merk niet genoemd" en "Gemini keek naar een ander land". De bronknop op Zichtbaarheid
  in AI legt dat sinds deze bouwronde uit zodra Gemini gekozen is (`bronToelichting()` in
  `lib/engines/bron.ts`).

**Gebouwd: Gemini als derde meetbron**, naar het model van Google AI Overview: `lib/llm-responses/`
(types, registry, client, parse), het jobtype `measure_llm_response`, de planner
`enqueueLlmResponseMeasurement()` op dezelfde drie plekken als de tweede bron (`confirm`, `measure`,
de tracking-cron), en een label in de bronknop. Eén meting per vraag (niet drie zoals bij Google),
model `gemini-3.6-flash` vastgezet in code. Achter `DATAFORSEO_LLM_ENABLED`, standaard uit, zelfde
reden als bij de tweede bron: de DataForSEO-sleutel staat al in Vercel en mag niet zelf de
schakelaar zijn. Geen migratie nodig: `tracking_runs.engine` is al vrije tekst.

**⚠️ Ook gebouwd, en dit raakt bestaande klanten: de meerderheidsregel uit (11) is opgelost.**
`computeMissedPrompts()` telde tot nu toe elke meting even zwaar, waardoor Google (3x per vraag
gemeten) de helft van elke stem kreeg. `lib/pipeline/missed-prompts.ts` (nieuw, puur, getest)
bepaalt nu eerst een meerderheid BINNEN elke bron, en telt dan de bronnen tegen elkaar: elke bron
weegt als één stem, ongeacht het aantal herhalingen. Bij een gelijke stand tussen bronnen telt de
vraag als gemiste kans (de voorzichtige kant). Zes scenario's in `test-unit.ts`, inclusief het geval
dat deze wijziging moest oplossen (Google's drievoudige meting die niet langer wint van de rest) en
het geval van vóór deze bouwronde (één bron beslist alleen).

Het AI-zoekvolume uit (11) (hoofdstuk 3.2 en stap 1/8 van het plan) is dit keer NIET gebouwd: het
zou `search_volume_index` (de 0-100 schaal die potentiescores tussen merken vergelijkbaar houdt,
`lib/pipeline/search-demand.ts`) moeten combineren met een absoluut gemeten getal, en dat mengen zou
precies het "niet meer te zeggen wat een getal betekent"-probleem opleveren dat het plan zelf al
benoemt. Dat verdient een eigen ontwerpronde, geen haastige aanname in dezelfde bouwronde. Staat als
open werk in `docs/tasks/vier-meetbronnen-en-ai-zoekvolume.md`.

`tsc --noEmit`, `test:unit` (5007) en `test:chain` (722) groen, `build` groen.

## 21 september 2026 (13): het overzichtscherm teruggedraaid en opgeschoond, op vraag van de eigenaar

Zeven punten uit één ronde feedback op het overzichtscherm (`app/(app)/merk/[id]/page.tsx`), met
Van den Udenhout als voorbeeldscherm.

**Terug naar een percentage, door de hele app.** De band-in-antwoorden uit (10) ("2 tot 3 van de
10") bleek voor de eigenaar minder leesbaar dan een kaal percentage, ondanks de statistische
onderbouwing erachter. Op het overzicht en op Analytics staat het hoofdgetal weer als `X%`; de marge
staat er nog steeds bij, alleen niet meer als het hoofdgetal zelf. `bandInAntwoorden()` blijft
bestaan (puur, getest) voor het geval dit terugkomt, maar wordt nergens meer aangeroepen vanuit een
scherm.

**De linkerstang op de standkaart is nu vast groen (`#25a750`)**, niet meer afhankelijk van
`insights()` (`railKlasse()` is verwijderd). Dat is een bewuste afwijking van de regel uit (10) dat
kleur een oordeel draagt: de eigenaar wil dat dit hoofdgetal altijd dezelfde nadruk krijgt.

**"Sinds september 2026" werd "Sinds start ORBIT ENGINE".** `totalenKop()` in `lib/overview.ts`
rekende een maandnaam uit de oudste analyse; die datum wees soms naar een moment dat niet meer de
werkelijke start was (een cluster dat opnieuw begon na archivering). De vaste tekst klopt altijd.

**De groene vinkjes op "Zo werkt je maand" zijn duidelijker.** Een afgeronde stap krijgt een rondje
in de groene oppervlaktetint (`--trend-up-surface`) achter het vinkje (`_components/ronde-balk.tsx`).

**"Waar je begint" is verwijderd.** Het overlapte zichtbaar met "Wat er op je wacht" (dezelfde
kaartvorm, dezelfde knoppen), en de eigenaar wees dat aan als verwarrend. De wachtrij zelf is
uitgebreid: van vijf naar tien items (`MAX_WACHTRIJ`), gegroepeerd per onderwerp (nieuw:
`lib/wachtrij.ts`, `groepeerPerOnderwerp()`, puur en getest) met een "nog X bekijken" per onderwerp
(nieuwe client-component `_components/wachtrij-lijst.tsx`). Elke regel toont nu ook een vaste
type-omschrijving (`WorkItem.typeLabel`, nieuw veld in `lib/work.ts`): "Vragen beantwoorden",
"Pagina publiceren", "Briefing invullen", "Cluster starten" in plaats van alleen een titel en een
knop die niet zeiden wát voor taak het was.

**"Wat ORBIT ENGINE deed" is verwijderd**, met zijn hele broncode (`ActiviteitKaart`,
`ActiviteitRegels`, de `jobs`-query in `page.tsx`). `lib/activity.ts` zelf blijft bestaan: dat blok
staat ook op `/merk/[id]/admin` en die pagina blijft ongewijzigd.

**Het contentplan-blok kreeg een balk erbij en een kapot blok eraf.** "Aantal ingeplande pagina's"
staat nu als eigen balk boven de bestaande live-balk (`PlanKaart`). Bij het nakijken van "Per fase
van de klantreis" bleek dat blok STRUCTUREEL kapot: nagerekend op productie (Van den Udenhout, 18
geplande pagina's) heeft `planned_pages.funnel_stage_id` op nul rijen een waarde. Sinds de
jaarverdeling in `createPlan()` (`lib/plans.ts`) op 25 augustus 2026 verdween, kiest niets in de
schrijfpijplijn meer een fase per pagina; de kolom bestaat en de vier standaardfasen worden nog
aangemaakt (`ensureFunnels()`), maar er wordt nergens meer naar geschreven. Het blok zei dus bij
ieder merk "niets gepland", ook waar wél gepland is. Weggehaald in plaats van gerepareerd: de
reparatie zit in de schrijfpijplijn en is een eigen bouwronde. Open werk, met de query die het
aantoont: `docs/tasks/funnelfase-nooit-gevuld.md`.

`totalenKop()` verloor zijn parameter (geen datum meer nodig); de test erop is meegegaan.
`groepeerPerOnderwerp()` kreeg een nieuwe testgroep. De twee broncodecontroles die over de
wachtrijkaart gingen (`workChipTone`, "precies één primaire knop") kijken sindsdien naar het nieuwe
bestand `_components/wachtrij-lijst.tsx` in plaats van naar `page.tsx` zelf, en de telling van
`SectionErrorBoundary` op het overzicht ging van vijf naar vier.

## 21 september 2026 (14): actieknoppen krijgen een eigen kleur, en "Nieuwe cluster" wordt zichtbaar voor de klant

**`#25a750` is vastgesteld als de kleur van Actieknoppen** (`--action-button`, klasse `.btn-actie`,
`app/globals.css` §"Actieknoppen", `docs/designsystem.md` §2.4a): elke knop die een cluster of
onderwerp start ("Nieuwe cluster", "Cluster starten", "Starten met deze verdeling"). Dit is bewust
geen tweede naam voor `--accent`: het accent is voorbehouden aan hooguit één hoofdactie per scherm
(§2.4), terwijl een clusterlijst tien gelijkwaardige startknoppen tegelijk toont. Ook bewust geen
aparte donkere stand, anders dan `--accent`: één letterlijke hex in beide standen.

**"Nieuwe cluster" is nu zichtbaar voor de klant**, niet meer alleen voor de consultant. Het
onderliggende slot verandert niet: een cluster starten kost geld en blijft `analyse_starten` in
`STAFF_ONLY_ACTIONS` (`lib/cost-rules.ts`). Zonder aanpassing zou de knop voor een klant simpelweg
linken naar `/analyses/new`, waar hij op een 404 landt, precies de weggehaalde situatie van
16 september 2026. De nieuwe client component `NieuweClusterKnop`
(`app/(app)/merk/[id]/strategie/clusters/nieuwe-cluster-knop.tsx`) laat staff naar `/analyses/new`
linken zoals voorheen, en toont een klant bij dezelfde knop een dialoog met de uitleg die al op het
lege clusterscherm stond (`KLANT_ZONDER_CLUSTERS`, `lib/cluster-start.ts`), zonder te navigeren.

`tsc --noEmit`, `test:unit`, `test:chain` en `build` groen.

`tsc --noEmit`, `test:unit` (5010), `test:chain` (722) en `build` groen.

## 21 september 2026 (14): het hoofdgetal ongerond, en een randloos uitlegpaneeltje

Twee kleine vervolgpunten op (13).

**`poolAll()` in `lib/stats/pooling.ts` gaf bij één bruikbare ronde de opgeslagen score onveranderd
terug**, en die staat in `visibility_scores` met volle precisie ("22.232558139534884"). Zodra er
niets samen te voegen viel (de meeste merken, de eerste maanden) kwam dat cijfer zo op het scherm
terecht, ook op de plekken die net in (13) teruggingen naar een percentage. Nu rondt `poolAll()` in
beide takken van "niets of één bruikbare ronde" af, net als de tak met meerdere rondes al deed.

**`InfoHint` (`components/info-hint.tsx`) hergebruikte `.menu-surface`** voor zijn uitlegpaneeltje.
Die klasse zet `padding: 4px 0`, bedoeld voor een dropdown waarvan elke REGEL zijn eigen zijpadding
draagt, en dat won van Tailwinds `p-3` op hetzelfde element (gelijke specificiteit, later in de
bundel). Resultaat: de tekst liep tot aan de rand, op alle achttien plekken waar `InfoHint` staat.
Het paneeltje zet zijn eigen achtergrond, rand en schaduw nu rechtstreeks in plaats van via die
klasse.

`tsc --noEmit`, `test:unit` (5012) en `test:chain` (722) groen, `build` groen.

## 21 september 2026 (15): de leeslijst van het contentplan werd een tabel

Op het Overzicht-scherm van het contentplan (`PlanReadView`) stond elke geplande pagina als een
regel met alleen datum en titel. De klant wil er meer uit een oogopslag halen: welk cluster de
pagina voedt, of het een nieuwe pagina of een optimalisatie is, en welk type content het is. Die
drie stonden al in `planned_pages` (`source_analysis_id`, `recommendation_action`, `page_type`),
alleen niet in het TypeScript-type `PlannedPage` en niet in wat het scherm liet zien.

`PlannedPage` (`lib/types/database.ts`) kreeg `source_analysis_id` en `recommendation_action` erbij.
`loadPlan()` (`lib/plans.ts`) zoekt de clusternaam nu ook op voor pagina's die al in een maand staan
(eerder alleen voor de voorraad) en geeft die mee als `clusterNaam` in de `PlanBundle`. De labels
"Categorie/Dienst/Informatief/Overig" en "Nieuwe pagina/Optimalisatie" stonden los in de CSV-export
(`app/api/profiles/[id]/plan/export/route.ts`); die verhuisden naar `lib/plan-status.ts`
(`PAGE_TYPE_LABEL`, `CONTENT_ACTION_LABEL`) zodat de export en het scherm dezelfde vertaling
gebruiken (één feit, één eigenaar).

De lijst in `MaandKaart` (`plan-read-view.tsx`) is nu een tabel: Titel, Gepland, Cluster, Nieuw of
optimalisatie, Type content, in die volgorde.

`tsc --noEmit`, `test:unit` (5012) en `test:chain` (722) groen, `build` groen.

## 21 september 2026 (16): Actieknoppen teruggedraaid van groen naar omgekeerd contrast

Zelfde dag, tweede besluit over dezelfde kleur. `#25a750` (zie (14) hierboven) bleek toch niet de
gewenste kleur voor `.btn-actie`: de eigenaar wilde de actieknop zwart op wit in de lichte stand en
wit op zwart in de donkere. Dat is letterlijk `--interactive-selected`/`--interactive-selected-on`,
dus `--action-button` en `--action-button-on` wijzen er nu met een `var()`-verwijzing naartoe in
plaats van een eigen hex te dragen (`app/globals.css`). De losse `--action-button-hover` en
`--action-button-pressed` tokens zijn vervallen; `.btn-actie:hover`/`:active` gebruiken nu dezelfde
`opacity: 0.8`/`0.7` als `.btn-primary`.

`.btn-actie` blijft als eigen klasse bestaan naast `.btn-primary`, ook nu ze er visueel identiek
uitzien: de twee dekken een ander gebruik (één hoofdknop per scherm tegenover zoveel startknoppen
als er onderwerpen zijn) en kunnen dus ooit weer uit elkaar lopen zonder dat elke aanroeper in de
code mee hoeft te veranderen. `docs/designsystem.md` §2.4a is bijgewerkt.

`tsc --noEmit`, `test:unit`, `test:chain` en `build` groen.

## 21 september 2026 (17): het contentplan, vier klantmeldingen in één keer

Vier meldingen over `PlanView` (`app/(app)/merk/[id]/strategie/plan/plan-view.tsx`), alle vier
opgelost:

1. **"Afgevallen kansen" is nu intern.** De sectie met wat het rapportmodel overwoog maar niet
   voorstelde (werkpakket C §5.1) is ruis voor een klant, die nooit een aanbeveling zag om af te
   vallen. De data en de onderbouwende waarde blijven bestaan (`docs/logbook.md`-conventie: één
   feit, één eigenaar), maar de sectie toont alleen nog als `staff` (besluit 18).
2. **Bug: een teruggelegde kaart kwam niet terug in de voorraad.** `vulOpenMaanden()`
   (`lib/plans.ts`) draait bij elke schermopening en vult open maanden met de sterkste kansen uit
   de voorraad. Die query selecteerde alle kansen met `plan_month_id is null`, óók een kaart die de
   klant zojuist bewust met "Terug naar de voorraad" uit een maand haalde (`taken_out = true`,
   migratie 0099). Het gevolg: de kaart werd bij de eerstvolgende schermopening, vaak binnen
   dezelfde `router.refresh()`, alweer in een (soms dezelfde) maand gezet, nog vóór de klant hem
   ooit in "In te plannen content" zag staan. De query in `vulOpenMaanden()` sluit `taken_out = true`
   nu uit. Scenario toegevoegd in `test-chain.ts` (plan-voorraad-scenario): met de oude query faalde
   het, met de fix niet.
3. **Filteren op cluster in "In te plannen content" bleek al gebouwd** (de `<select>` naast het
   zoekveld, zichtbaar zodra de voorraad meer dan één cluster bevat). Geen wijziging nodig.
4. **De meldingspopup na een actie is weg.** Elke actie op dit scherm was al meteen uitgevoerd
   (de `fetch` loopt vóór de popup); de popup met het aflopende balkje voegde alleen een wachttijd
   toe zonder nieuwe informatie, want de wijziging is al zichtbaar via `router.refresh()`. Alleen de
   foutmeldingen (die niet uit het scherm zijn af te lezen) blijven staan. `stuur()` verloor zijn
   `melding`-parameter; de losse succesmeldingen in `paginaActie()`, `maandActie()`,
   `alsGeplaatstMarkeren()` en `planOpnieuw()` zijn verwijderd.

`tsc --noEmit`, `test:unit` (5015) en `test:chain` (723) groen, `build` groen.

## 21 september 2026 (18): twee dubbelingen van "Zichtbaarheid in AI" geschrapt

Op een schets van het scherm streepte de eigenaar twee blokken door. Ten eerste de linkerkaart
"Zichtbaarheid over N clusters" (het merkcijfer met marge-uitleg) naast het clusterraster: met de
drie clustercijfers ernaast als losse kaarten (`ClusterVisibilityGrid`) voegde het gewogen
gemiddelde ernaast niets toe, alleen nog een vierde getal om tegen de drie andere af te zetten.
Ten tweede de hele "Technische diagnose"-sectie onderaan: de checklijst per categorie (Mogen
AI-assistenten je site lezen / Kunnen ze je tekst begrijpen / Weten ze wie je bent, met de
samenvattingskaart erboven) herhaalde wat de losse blokkadebanner bovenaan al zegt zonder er iets
aan toe te voegen.

De blokkadebanner (besluit 7 van 17 augustus 2026) blijft dus wél staan, bovenaan het scherm: die
verklaart het cijfer eronder wanneer AI-assistenten de site niet mogen lezen. Alleen de volledige
checklijst is weg. De ruwe auditdata (`technical_audits.checks_json`, conventie 8) blijft bewaard
en blijft als ruwe JSON zichtbaar op Admin (staffscherm), maar heeft nergens meer een opgemaakte
weergave in de klant-UI. `AuditPanel` (`components/audit-panel.tsx`) heeft daarmee geen aanroeper
meer in de app en staat klaar om verwijderd te worden zodra iemand hem echt nodig heeft na te
kijken; met één minuut aan diff leek het te vroeg om een component weg te gooien op basis van één
scherm-doorlichting.

`app/(app)/merk/[id]/analytics/page.tsx`: `merkScore`-kaart en `ClusterVisibilityGrid` samen in een
grid vervangen door alleen het raster; de "Technische diagnose"-sectie, de `profile_strategy`-query
en de context-factor staleness-check (alleen daarvoor gebruikt) zijn verwijderd.

`tsc --noEmit`, `test:unit` (5015), `test:chain` (722) en `build` groen.

## 22 september 2026: het clusterresultaat verliest zijn scherm en wordt een melding

De eigenaar: "Door de resultatenpagina van de cluster te verwijderen wil ik minder ruis creëren. Nu
staat deze informatie op meerdere plekken waar dit niet hoort." Dat is dezelfde beweging als op 16
september 2026, toen dit scherm drie van zijn vier hoofdstukken verloor omdat de cijfers al op
Analytics stonden. Wat toen overbleef (de conclusie, de vragen, de voorgestelde pagina's) heeft
inmiddels ook elders een vaste plek, dus bleef er een scherm over dat alleen nog herhaalde.

**Wat weg is.** `/analyses/[id]` toonde twee dingen: een voortgangsbalk zolang de meting liep, en
daarna de uitslag. Allebei verdwenen. Het adres verwijst nu door, want er staan links naar in
verstuurde rapportmails en in bladwijzers; een 404 kost daar een gesprek en niet alleen een klik.
Met het scherm verdwenen `_chapters/inhoud.tsx`, `measure-progress.tsx`, `report-progress.tsx` (al
sinds 16 september zonder aanroeper) en de twee schrijfknoppen uit `_work/`.

**Het wachtscherm was al overbodig, en dat was aantoonbaar.** `POST /api/analyses/[id]/confirm`
plant de meettaken zelf in sinds optimalisatie.md 1.5. De balk startte niets, hij keek alleen toe
naar werk dat doorliep als je de tab sloot. De klant stond dus minutenlang te kijken naar iets waar
hij niet bij hoefde te zijn.

**Wat ervoor in de plaats kwam.** Na het bevestigen ga je terug naar je clusteroverzicht met de
melding "Cluster gelanceerd", en de uitslag komt je achterna waar je ook bent:
`components/cluster-melder.tsx` staat in de app-schil en vraagt elke twintig seconden of er een
cluster klaar is. Bij een verborgen tabblad stopt die klok. "Cluster succesvol gemeten" draagt de
drie cijfers die de eigenaar vroeg (zichtbaarheid, openstaande vragen, voorgestelde pagina's), een
mislukte ronde krijgt dezelfde behandeling in het rood. Zonder dat tweede geval blijft een klant
wachten op een melding die nooit komt, en dat is erger dan het scherm dat verdween.

⚠️ **De regel "één melding per ronde" zit in de database en niet in het scherm.** Migratie 0107 voegt
`analyses.resultaat_gezien_at` toe; leeg betekent "nog te melden". `enqueueMeasurement()` maakt hem
leeg, en alleen op het moment dat er écht meettaken bijkomen. Zou hij dat ook doen bij een ronde die
niets in te plannen had, dan meldt de app de uitslag van vorige maand opnieuw alsof hij vers is,
elke keer dat de maandcron langskomt. Scenario 16 in `test-chain.ts` legt allebei de kanten vast.
De migratie zette de kolom meteen op `updated_at` voor alles wat al af was: op productie 9 clusters,
7 weggezet, 0 nog te melden, dus niemand kreeg bij de eerste schermopening zeven meldingen over
uitslagen van weken geleden.

**Wat er verhuisde in plaats van verdween.** De conclusie van de meting in gewone taal (`summary`
plus de gaten) stond nergens anders en staat nu op Analytics zodra je één cluster kiest. De knop
"probeer het opnieuw" staat op het clusterkaartje, met een nieuwe route
(`POST /api/analyses/[id]/hervatten`) die op de server met `determineStage()` uitzoekt wélke fase
struikelde. Dat wist het oude scherm omdat het per fase een ander component toonde; een kaartje in
een lijst kan dat niet weten en hoort dat ook niet te weten.

**"Schrijf deze pagina nu" is terug, op de juiste plek.** Op het oude scherm stond per aanbeveling
een knop om meteen te laten schrijven. Zonder die knop zou de snelste weg naar een tekst "wacht tot
de cron over tien dagen langskomt" zijn. Hij staat nu in het contentplan, in het menu achter de drie
puntjes bij een geplande pagina, en **alleen bij de beheerder**: hij slaat de goedkeuring van de
maand en het tiendaagse venster over, en dat zijn precies de twee regels die de klant beschermen
tegen betaald werk dat hij niet gevraagd heeft (besluit 18). De server controleert dat recht nog een
keer, want een knop verbergen is geen slot, en het dagplafond geldt onverkort. De vijf stappen die
een geplande pagina aan het schrijven krijgen zijn daarvoor uit de cron getild naar
`lib/plan-write-start.ts`: twee kopieën van die stappen zouden gegarandeerd uit elkaar lopen, en dan
stuurt de ene wel de doelvragen mee en de andere niet.

**Off-site gaat er voorlopig helemaal uit.** Besluit van de eigenaar. Het is het enige onderdeel van
dit scherm dat nergens anders terugkomt: het paneel is verwijderd en het werkitem is uit
`lib/work.ts` gehaald, want een taak zonder scherm om hem af te vinken is een taak die de klant
nooit kan afronden. De data blijft (`offsite_tasks` wordt nog gevuld), en de scan blijft draaien,
want diezelfde taak vult `source_landscape` en dáárop draait Analytics → Concurrenten. Wie die
aanroep ooit uitzet om kosten te sparen, haalt dus ook dat scherm leeg. De voorwaarden voor een
terugkeer staan in `docs/tasks/clusterresultaat-zonder-eigen-scherm.md`, en ze beginnen niet bij
"het paneel terugzetten" maar bij de vraag wiens werk dit eigenlijk is.

**Bewust niet gebouwd:** een voortgangsteller ("12 van de 30 vragen") op het clusterkaartje. Dat
cijfer vraagt per cluster een telling over `tracking_runs` in de juiste periode, en een teller die
bij een maandronde de verkeerde periode pakt, liegt over iets waar de klant toch niets aan kan doen.

`tsc --noEmit`, `test:unit` (5035), `test:chain` (728) en `build` groen. Migratie 0107 toegepast op
productie en nagerekend.

## 22 september 2026 (19): de hele kaart in "wachten op jou" is klikbaar, niet alleen de knop

De eigenaar moest steeds precies de knop rechts raken om naar een taak in de wachtrij te gaan.
`WachtrijKaart` (`app/(app)/merk/[id]/_components/wachtrij-lijst.tsx`) is nu zelf de link: de `div`
werd een `<Link href={item.href}>`, en de knop erin een `<span>` met dezelfde opmaak (een tweede
`<a>` erin zou een ongeldige geneste link geven). De knop staat om diezelfde reden nu op
`btn-outline` in plaats van `btn-primary`, net als "Bekijk je zichtbaarheid" bovenaan hetzelfde
scherm: nu de hele kaart de klikbare vorm draagt, hoeft de knop dat niet meer als enige te doen.

Dat botst met de regel bij `--shadow-sm` in `globals.css` ("alleen wat boven het scrim zweeft
krijgt een schaduw, een kaart heeft een rand"): zonder knop als enige aanwijzing is een randkleur
bij hover te stil om te laten zien dat het hele blok klikbaar is. Nieuwe klasse `.card-link` met een
nieuwe variabele `--shadow-hover`, alleen voor deze kaart: zwart/grijs in de lichte stand
(`rgba(0,0,0,.06)` rand + een zachte schaduw), limoen (`--accent` in de donkere stand, `#bcff2f`) in
de donkere stand, in beide gevallen subtiel genoeg om als hint te lezen en niet als omlijsting.

`tsc --noEmit`, `test:unit` (5015), `test:chain` (723) en `build` groen.

## 22 september 2026 (20): "wat je al invulde" gegroepeerd, en het potloodje repareert de feitenbank

Het overzicht van al beantwoorde vragen op "Openstaande vragen" was één platte lijst zonder enige
structuur: bij Van den Udenhout 37 regels achter elkaar, zonder cluster, zonder bullet, en zonder
manier om een fout antwoord te corrigeren zonder de vraag terug te zoeken tussen de open vragen
(screenshot van de eigenaar). `AnsweredOverzicht` in `fact-requests.tsx` groepeert nu op dezelfde
clusters als het filter erboven, één bullet per vraag, met een potloodje dat de vraag inline
openklapt met hetzelfde invoerveld als een open vraag.

**Het potloodje stuurt naar dezelfde `PATCH /api/profiles/[id]/facts` als een eerste antwoord**, dus
er kwam geen nieuwe route bij. Wat wél ontbrak: `answerFact()` (`lib/facts.ts`) ging ervan uit dat
een antwoord maar één keer geschreven wordt. Twee plekken braken zonder dat er ooit een potloodje
was om het te merken:

- **`proof_points`** kreeg bij elke opslag een nieuwe regel `"${vraag} ${antwoord}"` toegevoegd, en
  controleerde alleen of exact diezelfde regel al bestond. Wijzig je het antwoord, dan blijft de
  oude regel gewoon staan naast de nieuwe: "levert 250 auto's per jaar" naast "levert 300 auto's per
  jaar", allebei als vaststaand feit voor de schrijver.
- **`brand_facts`** (migratie 0036) bewaart elk feit onder `claimKey()` van de HELE bewering, vraag
  én antwoord samen. Wijzig je het antwoord, dan verandert die sleutel mee, dus het "oude" feit
  wordt nooit als vervangen (`superseded_by`) gemarkeerd: de bank groeit met een spookfeit dat
  niemand ooit corrigeert.

Beide zijn nu een deterministisch vangnet in `answerFact()` in plaats van een aanname over hoe vaak
er beantwoord wordt (conventie 1): bij een wijziging (oude status `beantwoord`, ander antwoord)
verwijdert de proof_points-update eerst elke regel die met dezelfde vraag begint, en wordt elk
actief `brand_facts`-feit met de OUDE sleutel voor dit profiel op `superseded_by` naar zichzelf
gezet (dezelfde truc als `factstore.ts` al gebruikt om de unieke index vrij te maken zonder de rij
te verwijderen). `buildFactBase()` leest bij de eerstvolgende pagina toch al vers uit
`fact_requests`, dus die kant van de doorvoer werkte al; het was specifiek de kopie in `proof_points`
en de identiteit in `brand_facts` die achterbleven.

`tsc --noEmit`, `test:unit` (5035), `test:chain` (728) en `build` groen. Geen migratie nodig, alleen
bestaande kolommen (`brand_facts.superseded_by`, `profiles.proof_points`) worden nu ook bij een
wijziging bijgewerkt.

## 22 september 2026 (21): "Wat dit cluster laat zien" kapt af op 5 zinnen, en de gatenlijst is weg

Vinkte je op Analytics > Zichtbaarheid in AI één cluster aan, dan verscheen daarboven de volledige
rapportsamenvatting plus een aparte bullet per gemiste vraag: bij Van den Udenhout veertien regels
onder elkaar (screenshot van de eigenaar). De eigenaar wil in 3 tot 5 zinnen lezen hoe een cluster
ervoor staat, geen rapport.

De bulletlijst (`reports.gaps_json`) is uit de kaart gehaald: diezelfde vragen staan al op "Wat
ORBIT ENGINE nog van je wil weten", waar de kaart toch al naar linkt, dus dit was een herhaling en
geen nieuwe informatie. Voor de samenvatting zelf (`reports.summary`) geldt conventie 1: de
schrijfinstructie in `report.ts` vraagt al om kort te schrijven, maar "kort" is geen getal, dus
schreef het model soms zeven of acht zinnen. `kortSamengevat()` (`lib/pipeline/report-summary.ts`)
knipt nu op de eerste 5 zinnen af, op de leesroute in `analytics/page.tsx`, dus dit werkt ook voor
al bestaande rapporten en niet pas na een nieuwe meetronde.

`tsc --noEmit`, `test:unit` (5036), `test:chain` (728) en `build` groen. Geen migratie.

## 22 september 2026 (22): een statusfilter naast het labelfilter op "strategie/clusters"

Het labelfilter (migratie 0083) filtert op eigen ordening, maar de vraag "welke clusters wachten nog
op mijn goedkeuring" was er niet mee te beantwoorden zonder de hele lijst door te lezen. `STATUS_META`
(`lib/analysis-status.ts`) had de vertaling daarvoor al (`"Klaar voor jouw akkoord"`, `"Niet
gelukt"`, …), er was alleen geen filter erop.

Zelfde vorm als het labelfilter, in hetzelfde bestand als `STATUS_META` zodat de statustekst en het
filter niet uit de pas kunnen lopen: `STATUSFILTER_ALLES`, `leesStatusfilter()` (onbekende waarde uit
het adres valt terug op "alles"), `filterOpStatus()`, `telPerStatus()`. `ClusterBalk` kreeg een tweede
uitklapmenu, met de statussen in de volgorde waarin een cluster ze doorloopt en "wacht op jou"
(`concept_klaar`, `mislukt`) vooraan. Label en status staan los naast elkaar in de URL
(`?label=<id>&status=<status>`), dus wijzigen van de een laat de ander staan.

`tsc --noEmit`, `test:unit` (5039), `test:chain` (728) en `build` groen. Geen migratie nodig, het
filter leest de al bestaande `analyses.status`.

## 22 september 2026 (23): het aantal vragen per fase kiezen bij het aanmaken van een cluster

Op "Nieuw cluster" (`/analyses/new`) lag de verdeling over Oriëntatie, Overweging en Beslissing al
vast op de standaard 10/10/10 (`lib/prompt-mix.ts`, migratie 0054), zonder dat er op dit scherm iets
aan te passen viel. Het snelpad vanuit de aanbodboom (`topics-panel.tsx`) had die keuze al, met een
eigen bovengrens van 100 in totaal, opgebouwd op basis van hoeveel diensten en werkgebieden een
onderwerp meebrengt. Voor een gloednieuw cluster, zonder die voorzet, is dat te ruim: de eigenaar
wilde hier een eigen, engere grens, tussen de 10 en de 60 in totaal.

`NewAnalysisForm` (`app/(app)/analyses/new/new-analysis-form.tsx`) kreeg drie velden naast elkaar,
één per fase, met de tellervergelijking en een foutmelding eronder zodra de optelling buiten de
grens valt. De knop "Start cluster" is uit zolang dat zo is. Nieuw in `lib/prompt-mix.ts`:
`NEW_CLUSTER_MIN_TOTAL` (10), `NEW_CLUSTER_MAX_TOTAL` (60) en `checkNewClusterMix()`, die bovenop de
bestaande `checkMix()` (per-fase grens van 40, geen `drop` van bestaande kolommen) alleen de
optelling strenger afkapt. `POST /api/analyses` valideert dezelfde functie server-side en schrijft
de gekozen verdeling naar `prompts_orientatie`/`prompts_overweging`/`prompts_beslissing`; blijft het
veld op de standaard staan, dan blijven die kolommen `null`, zoals bij het snelpad ook al zo werkte.
Geen migratie nodig, de kolommen bestaan al sinds 0054.

`tsc --noEmit`, `test:unit` (5041, negen nieuw voor `checkNewClusterMix`), `test:chain` (728) en
`build` groen.

## 22 september 2026 (24): "openstaande vragen" op de clusterkaart bleek een ander getal dan de
echte vragenlijst, nu "zoekopdrachten"

De eigenaar zag op de clusterkaarten "22 openstaande vragen" bij een cluster waar de sidebar maar
"6 openstaande vragen" telde, en vroeg zich af waar het verschil vandaan kwam. Dat waren twee losse
tellingen die toevallig hetzelfde woord droegen: het kaartcijfer (`buildCardMetrics`,
`lib/dashboard.ts`) rekende `winnable_runs - mentioned` uit, dus hoeveel metingen van de laatste
ronde geen enkele aanbieder noemden, en dat is een gemiste kans in de meting, geen vraag aan de
klant. De echte vragenlijst (`lib/open-questions.ts`, zichtbaar op `/merk/[id]/strategie/vragen` en
in de sidebar) telt `fact_requests` met status `open` plus profielgaten. Twee dingen die niets met
elkaar te maken hebben, onder één label op één scherm.

Het kaartcijfer heet nu "Zoekopdrachten" en telt iets anders: het aantal unieke prompts dat de
laatste meetronde van dit cluster gebruikte (`tracking_runs`, gefilterd op `purpose = 'periodic'`
en de `week_no` van de laatste score, ontdubbeld op `prompt_id`). Bij een cluster met dertig
goedgekeurde koopvragen staat er dus "30 zoekopdrachten" te lezen, en dat cijfer botst niet meer met
de vragenlijst ernaast in de navigatie. `null` zolang er niet gemeten is, en ook als een oude rij
geen `prompt_id` heeft (conventie 3): een meting zonder bekend aantal vragen is niet hetzelfde als
een meting van nul vragen.

`tsc --noEmit`, `test:unit` (5043, drie al bestaande mislukkingen ongerelateerd aan dit werk,
"de S staat in de bovenbalk"), `test:chain` (728) en `build` groen. Geen migratie, alleen een
extra query op de al bestaande `tracking_runs`-tabel.

## 22 september 2026 (25): "Dingen die op je wachten" krijgt de vaste indeling van de app, en twee
ontbrekende soorten werk

Op "Hoe sta je ervoor" groepeerde de wachtrij per cluster (`groepeerPerOnderwerp()`), en telde daarbij
maar zes van de acht soorten werk die een klant daadwerkelijk kan tegenkomen. Een uitgezochte
inventarisatie van alle klantacties in de app wees twee gaten aan: een contentmaand die op vrijgave
wacht (`plan_months.status = 'ter_goedkeuring'`) en een losse pagina uit het contentplan die op
akkoord wacht zonder gekoppelde `content_pieces`-rij (`planned_pages.status = 'ter_goedkeuring'` met
`content_piece_id is null`, het pad "de tekst hangt niet aan deze regel" uit `plan-view.tsx`) stonden
nergens in de wachtrij. Een pagina MET een gekoppelde rij levert al een werkitem op via
`content_pieces` (briefing, nakijken, publiceren); die twee keer tonen zou dubbel werk in de wachtrij
zetten, dus de nieuwe soort telt bewust alleen de losstaande pagina's.

De eigenaar wilde de wachtrij daarna niet langer per cluster maar naar de vier vaste onderwerpen van
de app: Cluster, Contentplan, Openstaande vragen, Bibliotheek, met per onderwerp de subkoppen die de
klant daadwerkelijk als aparte handeling herkent (bijvoorbeeld binnen Bibliotheek: briefing invullen,
nakijken, publiceren, in die volgorde, ook al is de urgentievolgorde van `lib/work.ts` andersom).

`lib/work.ts`: twee nieuwe `WorkKind`s (`contentmaand`, `planpagina`), een `profileId`-veld op
`WorkItem` (nodig om een item bij zijn vaste sectie te tonen zonder dat terug te puzzelen uit `href`,
want niet elke link begint met `/merk/[id]/...`), en twee nieuwe queries in `fetchSources()`. `lib/
wachtrij.ts` verving `groepeerPerOnderwerp()` door `groepeerPerSectie()`: een blokkade blijft een losse
waarschuwing boven de secties (hij wijst naar Analytics, niet naar een van de vier, en blokkeert toch
alles eronder), de rest krijgt een vaste kop- en subkopvolgorde. `wachtrij-lijst.tsx` toont de vier
secties in twee CSS-kolommen (`columns-2`, vult zichzelf op inhoud in plaats van een vaste knip), elke
subkop als compacte bullets met een teller, en een link naar het bijbehorende overzichtsscherm zodra
een subkop meer dan vier items heeft.

`tsc --noEmit`, `test:unit` (5054, vier al bestaande mislukkingen ongerelateerd aan dit werk, drie
over "de S" en één over de navigatievolgorde in Strategie), `test:chain` (728) en `build` groen. Geen
migratie, de gebruikte kolommen (`plan_months.status`, `planned_pages.content_piece_id`) bestaan al.

## 22 september 2026: de contentpagina in drie zones, en wat de app al geprobeerd had

`app/(app)/analyses/[id]/bibliotheek/[pieceId]` was 587 regels met twintig blokken onder elkaar. De
tekst begon bij blok 12, het bewerken bij blok 18, en dezelfde tekst stond twee keer op het scherm:
als opgemaakt artikel en nog eens als tekstvak achter een knop met een drempelscherm. Wie bij
bevinding 31 las dat een sectie te vaag was, moest elf blokken verder scrollen om hem aan te passen.
Het volledige plan en de weg ernaartoe staan in `docs/tasks/herontwerp-contentpagina.md`.

**Eerst geteld, toen gebouwd.** Op productie: 25 contentpagina's, waarvan 24 de huidige versie,
**nul gepubliceerd**, één met de hand bewerkt, 23 met `quality_json`, 22 met "check nodig", gemiddeld
49,1 bevindingen per pagina en 78 op de langste. Dat eerste getal verandert wat deze verbouwing is:
geen reparatie van geobserveerde pijn maar een verbetering vooraf. Het derde getal maakt de terugval
voor pagina's zonder `quality_json` een echt randgeval (twee van de 25) in plaats van de hoofdweg.

**Het inzicht dat het meeste oplevert kostte geen enkele nieuwe meting.** De reparatie krijgt met
opzet hooguit tien bevindingen mee (`MAX_BEVINDINGEN_PER_RONDE`), want met 119 opdrachten over 25
secties is er niets gerichts meer aan een sectiereparatie en liep de kwaliteitsscore 67, 74, 68, 48.
Van de 49 tot 78 punten die de klant daarna te zien kreeg, was dus hooguit een handvol ooit aan het
model voorgelegd, en de rest nooit. Het scherm zei daar niets over. Nu staat er één zin ("ORBIT
ENGINE heeft deze pagina zelf 2 keer bijgewerkt. Dit bleef staan.") en drie groepen: wat publicatie
tegenhoudt, wat geprobeerd is zonder resultaat, en waar de app niet aan toegekomen is.

Dat is **exact af te leiden en geen schatting**: `content_quality_runs.issues_json` bewaart per ronde
de volledige getypeerde bevindingenlijst, en de reparatie kiest daaruit met `prioriteerIssues(issues,
10)`, een pure functie. Dezelfde functie op dezelfde opgeslagen lijst levert precies de tien op die
het model destijds meekreeg. Geen migratie, wel twee kolommen extra in de bestaande query. De
groepering staat in `lib/pipeline/quality-groups.ts`, puur en zonder `server-only` (conventie 2), met
21 nieuwe assertions. Nagemeten op de langste pagina (f3a175b5, drie rondes): van de 78 bevindingen
in de laatste ronde kwamen er 32 ook in een eerdere ronde voor en 46 niet, en die 46 horen dus bij
"niet aan toegekomen" en niet bij "geprobeerd".

**De derde route kreeg een plek.** Het scherm ordende beoordelen en publiceren, maar niet
"laat ORBIT ENGINE er een nieuwe versie van maken en kom over een paar minuten terug". Zolang het
bewerken achter een knop zat viel dat niet op; met een canvas dat altijd openstaat wel, want een
herschrijving levert een nieuwe rij met een nieuw adres op. Nieuw: `GET /api/analyses/[id]/content/
[pieceId]/status` (service-role plus eigenaarscontrole, want `jobs` staat op deny-all), een
statuschip met zes standen waaronder "ORBIT ENGINE schrijft" en "Oudere versie", een herschrijfknop
die uit gaat zolang er een ronde loopt, en een balk met een keuze zodra er nieuwere tekst is: het
verschil bekijken, overnemen, of je eigen tekst houden. Nooit stil overschrijven.

**Het canvas liep anders stil uit de pas.** `ContentEditor` vulde zijn velden één keer bij het
monteren en vergeleek daarna met de verse serverwaarde. Dat viel niet op omdat de editor na elk
opslaan dichtklapte. Altijd open zou het wel opvallen: na een verversing van elders zegt het scherm
"je hebt wijzigingen" over tekst die niemand getypt heeft. `ContentWerkblad` vergelijkt daarom met
een eigen nullijn die meeschuift bij elke aanvaarde stand, en niet met de serverprop.

**Twee rekenfouten uit het plan zelf zijn onderweg gecorrigeerd.** De splitsing hangt aan een
containerquery op 1064px beschikbare breedte binnen `main` en niet aan de vensterbreedte: `.stand` is
1440px met 24px marge, maar de zijbalk (240px uitgeklapt, 56px ingeklapt) gaat er nog af, en die
klapt de gebruiker zelf in. Op 1440px met uitgeklapte zijbalk blijft 1152px over, op 1280px 992px, en
op 1280px met ingeklapte zijbalk weer 1176px; een `@media`-regel doet in twee van die drie gevallen
het verkeerde. Dit is de eerste containerquery in dit systeem, zie `designsystem.md` §8. En de
paginabalk plakt met `top: var(--header-h)` zoals de hoofdstuktabs, niet met een eigen 48: `ConfirmBar`
was het verkeerde voorbeeld, die zit vast aan de ónderkant.

**Publiceren verhuisde van een kaart naar de balk, en dat kost iets.** Een knop die nooit uit beeld
gaat, wordt eerder per ongeluk gebruikt, en het bewijs dat mensen hem niet kónden vinden is dun: nul
van de 25 pagina's is ooit gepubliceerd. De bevestigingsstap noemt daarom voortaan wat er nog
openstaat ("er staan nog 3 punten open die publicatie tegenhouden"), uit dezelfde bron als de
kwaliteitsrail zodat er nooit twee tellingen naast elkaar staan. De knop wordt niet geblokkeerd: de
klant weet zelf of zijn pagina online staat.

**Weggehaald.** `content-editor.tsx` (het canvas verving hem) en `QualityPanel` uit
`quality-panel.tsx` (de kwaliteitsrail doet hetzelfde en meer). De drie dekkingscijfers die alleen in
dat paneel stonden, staan nu bij de onderbouwing waar ze thuishoren. `QualityInternalPanel` en
`leesQualityJson()` blijven.

**Niet gebouwd, met een reden.** De selectie-assistent uit de oorspronkelijke opdracht (een zwevend
menu dat een geselecteerd stuk tekst laat herschrijven) staat niet in dit werk, en dat is geen
kwestie van tijd. Fijner knippen is in dit systeem twee keer geprobeerd en werd twee keer slechter,
en `checkContentGate()` heeft geen fragment-bewuste vorm: alleen `ontwijkendeZinnen()`,
`checkTabooWords()`, `checkForbiddenTopics()` en `checkSourceTalk()` werken op losse tekst, de
dekkingspoort rekent over de hele pagina en neemt de opening als norm. In plaats daarvan vult
"Laat ORBIT ENGINE dit oplossen" het bestaande herschrijfvak met de aanbeveling die het
reparatiemodel toch al als opdracht kreeg: dezelfde route, dezelfde poort, dezelfde nieuwe versie.
De vier stappen die de selectie-assistent later alsnog verdedigbaar maken staan in §8.1 van het
taakbestand. Een rijke editor blijft achter de proef uit §8.2: markdown blijft de brontekst zolang
niet aangetoond is dat een editor hem teken voor teken teruggeeft.

**Eén vondst onderweg die niets met het scherm te maken had.** De eerste versie van de ketentest voor
het conflictslot was groen om de verkeerde reden. `now()` is in Postgres de transactietijd en staat
stil binnen één transactie, dus het stempel schoof niet op en de tweede schrijver won alsnog. En
`updated_at` uit de `pg`-driver komt terug als JavaScript-datum met milliseconden, terwijl Postgres
microseconden bewaart: teruggestuurd als parameter matcht die afgeronde waarde de rij niet. De test
vergelijkt nu op `updated_at::text` en zet het stempel vanuit JavaScript, net als de route zelf. De
route was al goed: PostgREST levert de tekstweergave en die rondt niets af.

**Nagerekend tegen productie, niet alleen gebouwd** (conventie 10). De groepering is op de langste
opgeslagen pagina gedraaid (f3a175b5, 78 bevindingen, drie opgeslagen rondes waarvan twee echte
reparaties). Uitkomst: **2 blokkades, 6 geprobeerd zonder resultaat, 70 nooit aan toegekomen**, samen
78. Over beide reparatierondes zijn er in totaal 19 verschillende bevindingen aan het model
meegegeven (tweemaal tien, met één overlap). Dat is de verhouding waar dit hele scherm over gaat:
van de 78 punten die de klant te lezen kreeg, heeft de app er 19 ooit geprobeerd en 70 nooit gezien,
en dat stond nergens.

**Eén oneffenheid kwam bij die controle boven water.** De beoordelaars schrijven hun bevindingen met
markdown-nadruk erin ("**Bovenste introductie:** Beantwoord alle drie de doelvragen"). Gemeten:
135 van de 1227 opgeslagen bevindingen, 11%. In een lijst die als platte tekst rendert, las dat als
sterretjes. Dat was ook zo in de oude `review_notes`-lijst, dus geen regressie, maar het valt nu pas
op omdat de rail de plek is waar deze zinnen echt gelezen worden. `leesbareBevinding()` haalt alleen
de nadruk-tekens weg en bewust niet de volledige `stripMarkdown()` uit `content-gate.ts`: die is voor
beoordelen gemaakt en zou een losse maatvoering als "20*30 cm" stukmaken. Zes assertions.

`tsc --noEmit`, `test:unit` (5086, 27 nieuwe; dezelfde vier al bestaande mislukkingen over "de S" en
de navigatievolgorde in Strategie, ongerelateerd), `test:chain` (732, scenario 17 nieuw) en `build`
groen. Geen migratie: alle gebruikte kolommen bestaan al.

## 22 september 2026 (27): de eerste echte Search Console-koppeling, en een rijen-versus-dagen bug
die pas bij echte data zichtbaar werd

`GOOGLE_SERVICE_ACCOUNT_JSON` stond sinds fase 5 (11 augustus) nooit in Vercel: geen serviceaccount
aangemaakt, geen enkel profiel met een `gsc_property`. De eigenaar had zelf al een serviceaccount
aangemaakt (`gsc-reader@gen-lang-client-0646623492.iam.gserviceaccount.com`) en het adres bij Van den
Udenhout aan Search Console toegevoegd, dus de sleutel hoefde alleen nog in Vercel gezet te worden.

Eerste poging ging fout: de private key in de omgevingsvariabele kreeg echte regeleindes in plaats
van de letterlijke `\n`-tekens die een geldig JSON-bestand vereist, waardoor `JSON.parse()` in
`lib/search-console/key-state.ts` faalde en de app de sleutel als "niet ingesteld" las (Vercel
markeerde hem bovendien als "Needs Attention" omdat hij als leesbaar type stond in plaats van Secret).
Tweede poging: de waarde correct ge-escaped opnieuw gezet, het type naar Secret, en getest los van de
app door zelf een JWT te tekenen en in te wisselen bij Google (`oauth2.googleapis.com/token` gaf een
geldig token terug) voordat de klant het nogmaals probeerde.

Daarna werkte de koppeling: `gsc_verified_at` staat, 25.000 rijen (89 dagen × pagina's, 23 juni tot en
met 19 september) staan in `search_console_days`. Maar het koppelingenscherm toonde "1000 dagen" in
plaats van 89. Twee fouten tegelijk: de tellus in `app/(app)/instellingen/koppelingen/page.tsx` telde
RIJEN in plaats van unieke `day`-waarden (de tabel heeft één rij per dag én per pagina, conventie
`dimensions: ["date", "page"]` uit `zoekverkeer-in-de-keten.md`), en de query had geen expliciete
`.limit()`, dus Supabase stopte stil bij zijn standaard paginagrootte van 1000 rijen: precies het getal
dat op het scherm stond. Bij testdata (91 rijen, zie besluit 17 augustus) viel dat nooit op; bij de
eerste klant met maanden echte data wel.

Drie plekken lazen `search_console_days` zonder limiet en met hetzelfde risico op een stille
steekproef in plaats van het volledige bereik: `instellingen/koppelingen/page.tsx` (nu telt hij
unieke dagen, met `.limit(200000)`), `merk/[id]/analytics/page.tsx` (de opbrengstberekening, had bij
25.000 rijen op 1000 gestopt en dus een fractie van de echte opbrengst getoond) en
`merk/[id]/analytics/zoekverkeer/page.tsx` (dezelfde 1000-rijenval voor de grafiek zelf). Alle drie nu
met `.limit(200000)`, ruim boven wat realistisch is (16 maanden Search Console-geschiedenis × enkele
honderden pagina's).

`tsc --noEmit`, `test:unit` (5059, dezelfde vier bekende mislukkingen), `test:chain` (728) en `build`
groen. Geen migratie, alleen queries aangepast. Geen nieuwe testcase: de bug zat in productiecode die
alleen met een rijenaantal boven 1000 zichtbaar wordt, en dat na te bouwen in `test-unit.ts` zou meer
mock-gewicht kosten dan het treft, tegenover het aanroepen van de echte Supabase-data waarmee dit al
geverifieerd is (conventie 10).

## 22 september 2026 (28): een prompttabel onder "Per cluster", en het zijpaneel eraf

De clustertabel op Zichtbaarheid in AI opende tot vandaag per rij een zijpaneel (Z8,
`components/cluster-answers.tsx`) met de gemeten vragen van dat ene cluster. De eigenaar wilde die
klik weg: een rij aanklikken voor het antwoord van één cluster tegelijk terwijl de vraag "welke
prompt scoort het best" over alle clusters heen gaat. Daarvoor komt nu een eigen tabel "Prompts"
onder "Per cluster", met bovenaan de vraag met de meeste zichtbaarheid: `lib/pipeline/prompt-
visibility.ts` telt per prompt de metingen van de ronde die de clusterrij ernaast ook toont (zelfde
week, zelfde bron), en zet per vraag het percentage geoordeelde metingen waarin het eigen merk
genoemd werd. Het letterlijke antwoord blijft bewaard, nu als `<details>` in de rij zelf
(`components/analytics-prompt-table.tsx`) in plaats van een paneel dat de pagina opzij schuift.

`AnalyticsClusterTable` verloor daarmee zijn enige reden om rijen klikbaar te maken: `onRowClick`,
`selectedKey` en de `Drawer` zijn eruit, de rij navigeert alleen nog via de clusternaam zelf (zoals
al kon). `components/cluster-answers.tsx`, `app/api/analyses/[id]/answers/route.ts` en
`lib/pipeline/answers.ts` hadden geen andere aanroeper meer en zijn verwijderd in plaats van
dood te laten liggen (conventie: één feit, één eigenaar). De link "Zie wat de AI hier nu antwoordt"
op de contentplan-kaart (`components/why-this-page.tsx`) wijst nog naar dezelfde plek
(`analytics?cluster=…`); die toont nu de prompttabel meteen gefilterd op dat cluster, zonder dat er
nog geklikt hoeft te worden.

`tsc --noEmit`, `test:unit` (5091, dezelfde vier bekende mislukkingen over "de S" en de
navigatievolgorde in Strategie, ongerelateerd), `test:chain` (732) en `build` groen. Geen migratie:
alleen bestaande kolommen van `tracking_runs` en `tracking_run_mentions` gelezen. Geen nieuwe
testcase in `test-unit.ts`: de aggregatie leest rechtstreeks van Supabase en heeft geen pure
rekenkern die zonder database te toetsen is (conventie 2 geldt voor de rekenkunde, niet voor een
query die groepeert); geverifieerd door de query's velden en filters tegen het schema en de
bestaande `loadAnswers()`-aanpak te leggen, niet tegen productiedata (nog geen tweede meting met
herhalingen op dit account).

## 23 september 2026 (29): de prompttabel breder, een Funnel-kolom en -filter, en Bron als aanvinklijst

De prompttabel van gisteren kreeg drie verbeteringen. De kolom "Cluster" ging van 12rem naar 16rem:
bij langere clusternamen liep de tekst tegen de volgende kolom aan. Er kwam een kolom "Funnel" bij,
tussen Cluster en Prompt: `PromptVisibilityRow.category` (de funnelfase van de vraag, Oriëntatie /
Overweging / Beslissing) stond er al in maar werd nergens getoond. Daarboven kwam een Funnel-filter
in de filterbalk (`lib/analytics-filters.ts`: `beschikbareFunnelfasen()`, `leesFunnelfilter()`,
`filterOpFunnel()`), die alleen verschijnt als er meer dan één fase in de getoonde vragen voorkomt
en alleen de prompttabel filtert: een cluster of een score heeft geen eigen fase. Dit is een ANDER
veld dan `docs/tasks/funnelfase-nooit-gevuld.md` (dat gaat over `planned_pages.funnel_stage_id`, dat
sinds 25 augustus 2026 nergens meer geschreven wordt); `tracking_runs.prompt_category_snapshot`
wordt wél bij elke meting gevuld.

Het Bron-filter werd op verzoek van de eigenaar een aanvinklijst met een "Alle bronnen"-vakje, in
plaats van een knop met precies één keuze. Dat botste met de vastgelegde regel van 20 september 2026
dat dit scherm nooit een cijfer per bron naast elkaar toont; de eigenaar koos voor de hele pagina
mee te laten schalen (niet alleen de prompttabel) en voor één GEMIDDELD cijfer over de aangevinkte
bronnen, in plaats van een cijfer per bron ernaast. `cijferVoorBronnen()` in `lib/engines/bron.ts`
middelt de score en combineert de onzekerheid als de wortel van de som van de gekwadrateerde
bijdragen gedeeld door het aantal (dezelfde soort formule als `gewogenGemiddelde()` op dit scherm,
hier met gelijk gewicht per bron); een bron die een ronde niet meemat telt niet mee (conventie 3).
Bij precies één aangevinkte bron (de standaard) is dit gelijk aan het oude gedrag, dus voor een
klant die het filter nooit aanraakt verandert er niets. `BRONFILTER_STANDAARD` is nu `string[]`,
`leesBronfilter()` leest een kommagescheiden lijst (`?bron=chatgpt,google_ai_overview`) en
`bronfilterNaarAdres()` houdt het adres schoon bij de standaardkeuze. `loadPromptVisibility()` leest
nu `.in("engine", bronnen)` in plaats van `.eq("engine", bron)`, en de prompttabel telt de metingen
van alle aangevinkte bronnen samen tot één percentage per vraag, net als hij dat al deed over
herhaalde metingen van dezelfde vraag.

`tsc --noEmit`, `test:unit` (5111, dezelfde vier bekende mislukkingen over "de S" en de
navigatievolgorde in Strategie, ongerelateerd), `test:chain` (732) en `build` groen. Nieuwe
testcases in `test-unit.ts` voor `beschikbareFunnelfasen()`/`leesFunnelfilter()`/`filterOpFunnel()`
en voor `cijferVoorBronnen()`/`bronfilterNaarAdres()`/de meervoudige `leesBronfilter()` (conventie 1:
elke wijziging die een uitkomst beïnvloedt krijgt een test). Geen migratie: beide velden bestonden
al.

