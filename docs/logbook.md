# Logboek, beslissingen en bouwrondes

Waarom het is zoals het is. Chronologisch, met de cijfers die de beslissing droegen.
Voor hoe het werkt: `architecture.md`. Voor wat er nog moet: `tasks/roadmap.md`.

## Verwijzingen uit code naar oude documenten

Code-commentaar en migraties verwijzen op ~500 plekken naar documenten die in dit logboek zijn
opgegaan. Vertaaltabel:

| Verwijzing in code | Wat het was | Nu |
|---|---|---|
| `optimalisatie.md` fase 0–7 | Het optimalisatietraject ná de MVP | §3 hieronder |
| `implementatieplan.md` R0–R8, S1–S8 | Het werkdocument met de stappen | §5–§8 hieronder |
| `abcplan.md` §2/§5/§10/§12 | Het oorspronkelijke MVP-bouwplan + 32 vastgelegde keuzes | §2 hieronder + `architecture.md` |
| `contentbriefing.md` | De specificatie waarop R5 gebouwd is | §6 hieronder |
| `kwaliteitsanalyse-*.md`, `praktijktest-udenhout.md`, `strategie-contentkwaliteit-vervolgstappen.md` | De doorlichtingen | §4, §6, §8 hieronder |
| `designsystem.md`, `ux-*.md` | Design system en UX-analyses | `ux-design.md` |
| `SETUP.md` | Installatie en deploy | `architecture.md` §8–§9 |

De volledige originelen staan in de git-historie (laatste versie: de commit vóór de
documentatie-herstructurering).

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

Volledige bouwspec: [`tasks/onboarding-2.0.md`](./tasks/onboarding-2.0.md). Hieronder wat er
gebouwd is en het cijfer dat elke keuze droeg.

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
niet in de takenmap. `onboarding-2.0.md` blijft staan, met bovenaan de reden, de verificatietabel
heeft nog drie open punten die iets vragen wat er niet is (vier profielen voor een p95, een
`GEMINI_API_KEY`, een contentronde).

**De les, en hij is dezelfde als bij de code.** Conventie: *verandert het gedrag, werk `docs/` bij in
dezelfde commit.* Die stond er al en werd twintig keer overgeslagen omdat een merge naar `main` geen
poort heeft die ernaar vraagt. De migratie-index bleef als enige bij, en dat is geen toeval: die
heeft er wél een, `supabase/README.md` bijwerken staat in de toepasinstructie van elke migratie. Wat
de andere documenten missen is niet discipline maar zo'n haakje.

---

## 27. De app heet Aura, en schrijft als Nova (5 augustus 2026)

Tot deze ronde heette het product intern én in de UI "GEO Tracker", een omschrijving, geen naam.
De schrijfstijl was op zichzelf goed (informeel, jargonvrij, eerlijk over onzekerheid) maar had geen
vastgelegde bron: elke tekst was los beoordeeld op "is dit duidelijk", nooit op "klinkt dit als ons".

**Wat er is gebeurd.** De marketingsite en het productverhaal van InSpace Nova (inspace.io) zijn
letterlijk uitgelezen en tot een stijlgids teruggebracht: `docs/schrijfstijl.md`, tien richtlijnen
met de brontekst erbij. Daarna is alle UI-copy daarlangs gelegd, schermen, knoppen, foutmeldingen,
tooltips, lege staten, statuslabels, voortgangsteksten, de twee e-mailsjablonen en de foutteksten
die de API-routes teruggeven.

**De vier veranderingen die het meeste doen:**

1. **Aura is een handelend onderwerp.** Nova schrijft over zichzelf in de derde persoon, *"Nova
   learns your business first"*. Wij dus ook: "Aura leest je website uit", niet "de website wordt
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
   Nova doet dat zelf ook precies zo: de namen zijn kosmisch (Nova, Aura, Stratosphere, Milky Way),
   de instructies klinisch (*"Benchmark your rivals"*, *"Crawl, speed & structure"*).

**Wat we bewust NIET overnamen.** Nova's `04 Automated publishing` en de CMS-logo's: die koppeling
hebben wij niet, dus belooft de copy hem nergens. En "volledig autonoom", Aura vraagt bewust om
goedkeuring vóór de meting en vóór publicatie, dus daar staat "Aura doet het werk, jij zet de knopen
door".

**De code is niet aangeraakt.** Alleen tekstuele content: geen props, geen routes, geen
variabelenamen, geen JSX-structuur. `lib/crawler.ts` houdt zijn `USER_AGENT` (`GEO-Tracker-Bot/1.0`).
Dat is een functionele identificatie waarop site-eigenaren hun robots.txt kunnen hebben
afgestemd, en hernoemen is daar een gedragswijziging, geen copywijziging.

Vier controles groen: `tsc --noEmit`, 675 unittests, 47 ketentests, productiebuild.

---

## 28. Twee leestekens eruit, want ze verraden de schrijver (5 augustus 2026)

Direct na de Aura-ronde hierboven kwam de scherpste correctie van dit traject, en hij ging niet
over inhoud maar over interpunctie: **het gedachtestreepje en de schuine streep zijn eruit.**

**De reden is commercieel, niet esthetisch.** Een lezer herkent AI-tekst tegenwoordig aan twee
tekens: het kastlijntje (`—`) waar een komma of een punt hoort, en de schuine streep in "en/of" of
"product/dienst". Voor een product dat content schrijft die de klant onder zijn eigen naam
publiceert, is dat geen stijlkwestie maar een productfout. De pagina die Aura oplevert moet
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

**Wat we bewust niet overnamen:** `attention` (roze) en `premium` (brons), want niets in Aura
betekent dat; de licht- en donkerparen, want er is bewust geen donkere modus; hun negen radii, want
vier volstaan; en hun hexwaarden, want dan wordt Aura visueel een InSpace-product. De systematiek is
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
Wij bouwden de website na. Wie Nova echt gebruikt, zou Aura niet als familie herkennen.

Acht verschillen, allemaal nagemeten in hun eigen CSS-bundel:

| | marketingsite | product | Aura nu |
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
laag naast de technische status, "Wacht op jou" of "Aura is bezig", naar Nova's tweelaags-
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
(`app/opengraph-image.tsx`, `next/og`): een link naar Aura in Slack of e-mail toonde tot dan een
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
zonder spatie die niet mogen afbreken. Aura rendert die op ~15 plekken (URL's, slugs, domeinen).
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

- Ik schreef dat Aura Nova's tweelaags-statustaal miste. Onjuist: `lib/analysis-status.ts` heeft
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

Gevolg voor Aura: `propose_topics` kan hierop worden uitgebouwd, er hoeft geen nieuwe zware
pijplijnstap te komen. Wat erbij moet is de verdeling over maanden, paginatypen en funnelfasen met
de quota als randvoorwaarde, en dat is rekenwerk, dus een pure module (conventie 2).

Ook opgelost: "Nova insights" bestaat echt, maar het is **één zin** met een vervolgstap
("Finishing the Bankencollectie funnel unlocks your first fully-ranked topic cluster"). Fase 6 gaat
daardoor van 6 naar 4 dagen. En "domein" is inderdaad een niveau ónder "klant", dus `profiles` moet
in tweeën: account en merk.

**Twee vondsten die verder reiken dan het plan.**

**1. InSpace brengt zelf een product uit dat Aura heet.** In hun productmenu staat "Nova" (live) en
"Aura, Binnenkort beschikbaar", met als omschrijving "Een nieuwe manier om te groeien voorbij
zoekmachines" en een pre-registratieknop. Dezelfde naam, dezelfde categorie. §12.1 zet de drie
opties op een rij met een advies (wijzigen, en snel, niet omdat je ongelijk hebt maar omdat je dat
gevecht niet wint van een partij met 400 klanten en negen openstaande vacatures). Besluit ligt bij
de eigenaar; zolang het niet genomen is verandert er niets aan de code.

**2. Nova meet geen AI-zichtbaarheid.** Nul treffers op `citation`, `chatgpt`, `perplexity`, `llm`
en `mention` over 2.447 interfaceteksten van beide apps. De enige "geo"-treffers gaan over
geografische identiteit, niet over Generative Engine Optimization. De "AI-citaties 312" op hun
website hoort bij het product dat nog moet komen.

Dat tweede is de strategisch belangrijkste zin van dit hele onderzoek: **Aura levert vandaag wat
InSpace pas belooft.** Het gat zit niet in de meetkant, daar loopt Aura vóór, maar in het programma,
het plan en het portaal eromheen. Dat maakt het advies uit §7 sterker, niet zwakker: doe fase 1, 4
en 6, want dat is de structuur rond een motor die al draait.

Als bijvangst is jouw eigen structuurschets thuisgebracht: Brand Intelligence, buyer persona's,
klantreis, zoekwoordclusters en "SEO + GEO gaps" staan niet in de i18n maar in één visueel blok op
de marketingsite. Het is dus hun belofte, niet aantoonbaar hun app. Wat ervan overgenomen hoort te
worden is de gedachte dat het merkbrein **telbaar** is ("238 zoekopdrachten in kaart, 91 gaten"), en
die getallen heeft Aura al.

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
in de onboarding uitvraagt: ongeveer veertig velden. Naast Aura's `profiles`-kolommen gelegd blijkt:
veertien heeft Aura al (de ronde van 7 augustus met migratie `0045` leverde de tone-of-voice-schuiven,
verboden woorden en auteursvelden), elf kan de pijplijn zelf afleiden, elf moet de klant typen, en
vier vervallen (taalkeuze, CMS, auteurspagina, Google Analytics).

Dat laatste getal is het punt: **de klant hoeft er elf in te typen en dat zijn precies de elf die
niemand kan raden**, bedrijfsgegevens en facturatie. De rest staat vooringevuld met het label "uit je
website gehaald" en is corrigeerbaar. InSpace laat de klant twintig minuten uittrekken
(`landingTimeNote`); Aura kan het in vier stappen omdat het onderzoek vóór de onboarding draait in
plaats van erna. Fase 3 ging daardoor van 8 naar 7 dagen.

Kleinere uitkomsten: één tone-of-voice-schuif ontbreekt nog (`tone_emotional`, vier standen), de
aanspreekvorm van de klant moet een eigen veld worden (Aura's eigen "je en jij" uit `schrijfstijl.md`
geldt voor de interface, niet voor wat Aura vóór een advocatenkantoor schrijft), en alleen Nederlands
(besluit 13) laat `next-intl` vervallen, waardoor fase 7 van 5 naar 2 dagen krimpt.

**De naam blijft Aura.** Het advies was wijzigen omdat InSpace een gelijknamig product aankondigt;
de eigenaar weegt dat anders en kiest houden. Vastgelegd in §12.1 als genomen besluit, niet als open
punt. Wat wel blijft staan als schrijfregel: de eerste vermelding van Aura zegt altijd wát het meet,
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

De cookie `aura_merk` is een voorkeur, nooit een recht: `listBrands()` controleert bij elke aanroep
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

**Uitnodigen mag alleen een `admin` van het account of een beheerder van Aura** (`mayInvite`). Een
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

De grens loopt langs `isStaff()` en niet langs de accountrol: het gaat om Aura's eigen team
tegenover iedereen daarbuiten. Een accountbeheerder bij een bureau is nog steeds een klant. En het
afgeschermde blok haalt ook zijn springlink weg, want een link naar een blok dat er niet is, is
zichtbaarder dan het blok zelf.

## Fase 3: het merkprofiel, dertig velden die de klant nakijkt in plaats van invult (10 augustus 2026)

Migratie `0048_merkprofiel_compleet`, toegepast en geverifieerd op productie, plus een wizard van
vijf stappen op `/profielen/[id]/merkprofiel`.

**Dertien nieuwe velden, en dat is minder dan Nova er uitvraagt.** De inventaris in `docs/Nova.md`
§13 legde hun ~40 onboardingvelden naast Aura's kolommen. Veertien had Aura al, elf kan de pijplijn
afleiden, vier vervielen (taalkeuze, CMS, auteurspagina, Google Analytics). Wat overbleef zijn deze
dertien. Alles wat al een eigenaar had is er bewust níet nóg een keer bijgezet: `value_props` ís
Nova's "value pillars", `intake_audience` ís de primaire doelgroep, `industry` ís de kerncategorie.
Eén feit heeft één eigenaar, en een tweede kolom met dezelfde betekenis is een kolom die gaat
afwijken. De volledige vertaaltabel staat bovenaan de migratie.

**Het scherm vraagt niets, het laat nakijken.** Dat is het verschil met Nova, en het volgt uit iets
dat Aura al had: het onderzoek draait hier vóór de kennismaking in plaats van erna. Nova laat hun
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
legt "je en jij" vast, maar dat is een keuze over Aura's eigen interface. Wat Aura vóór een
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
agent het hele plan laat opstellen. Aura heeft de bedenkkant al (`propose_topics` levert onderwerpen
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
dagelijkse cron (`/api/cron/plan`, pg_cron-taak `aura-plan-writer`, migratie 0050) zet schrijftaken
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
schrijft Aura zonder cijfers" (bal bij de klant) of "De meting van dit onderwerp loopt nog" (bal bij
Aura). Blokkades die géén probleem zijn, zoals "nog niet aan de beurt", krijgen bewust geen melding:
een melding bij iets wat gewoon goed gaat, leert mensen meldingen negeren.

**De brug tussen plan en contentpijplijn is één veld.** De pijplijn kent alleen analyses, het plan
alleen merken. `plannedPageId` in de payload van `content_draft` verbindt ze: de handler schrijft
`content_piece_id` terug en zet de pagina op `ter_goedkeuring`, en de werker zet hem op `mislukt`
als het schrijven definitief niet lukt. Dat laatste stond er eerst niet in, en zonder die regel
blijft een pagina op "Aura is bezig" staan terwijl er niets meer gebeurt: de ergste van alle
statussen, want hij vraagt om geduld dat nergens toe leidt.

**Getest waar de fout zou zitten.** Die brug bestaat uit drie stukken (de cron zet het veld, de
handler koppelt terug, de werker meldt de mislukking) en valt er één weg, dan schrijft Aura wél maar
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
invullen. Die velden vult Aura zelf in: besluit 13 schrapte meertaligheid en de vier funnelfasen
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

**De drempel voor "nagekeken" staat op 80% en niet op 100%.** Van de 27 merkvelden leidt Aura er 25
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
en dus ook in Aura te controleren: elke toestand een eigen scherm (zij hebben vier lege staten voor
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
een aanroepprijs. Aura wel: wie de prijs ziet, klikt bewuster en belt niet achteraf verbaasd.

**Twee dingen rechtgezet die ik eerder te makkelijk had opgeschreven.** Ik kán geen schermafdrukken
maken: van Nova niet (dat zit achter een inlog waar ik geen account voor heb) en van Aura ook niet,
want de browser komt hier niet door de uitgaande proxy heen, drie configuraties geprobeerd, alle drie
`ERR_CONNECTION_RESET`. `curl` werkt wel, dus HTML en statuscodes kan ik lezen, pixels niet. Daarmee
zijn tien afdrukken van Aura zelf het enige wat de eigenaar in dit plan moet leveren.

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

**Drie sloten.** Alleen een beheerder van Aura: een account-admin mag zijn bedrijfsgegevens wel
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
