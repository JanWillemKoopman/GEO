# Logboek — beslissingen en bouwrondes

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
rapportages, 10+ LLM-engines tegelijk, keyword-research suites, een tweede LLM-provider. Dat is
waar de concurrentie complex en duur wordt.

## 2. De MVP en de vastgelegde keuzes

De keuzes die sindsdien niet meer ter discussie hebben gestaan:

1. **OpenAI-only, drie tiers, vast in code.** Geen env-variabele, geen tweede provider. Op de
   GPT-4.1-familie draaide de meting op mini en niet op nano: met `web_search` faalde nano 10 van
   de 10 keer. Sinds augustus 2026 zijn het GPT-5.6-modellen — zie §10.
2. **Alles bewaren.** Elke AI-call slaat zijn volledige ruwe JSON op náást de uitgesplitste
   kolommen. Volledige audit-trail, geen dataverlies bij toekomstige schemawijzigingen.
3. **Verplichte goedkeuringspoort.** Na onderzoek + prompts stopt de pijplijn tot de klant
   bevestigt. Niets betaalds start zonder klik.
4. **Nooit rechtstreekse client-writes.** Alles via API-routes met service-role + ownership-check.
   RLS werkt op rij-, niet op kolomniveau en kan dus nooit afdwingen wélke velden een klant mag
   wijzigen — dat hoort in de route.
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
    hetzelfde bedrijfsonderzoek over. Onderwerp werd verplicht — zonder onderwerp voegt een analyse
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

## 3. Optimalisatietraject — fase 0 t/m 7 (afgerond)

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
redactie, geen kwaliteitspoort — en door de terechte regel "verzin geen feiten" gedwongen generiek.
Drie inzichten die het ontwerp sindsdien sturen:

1. **Grounding lost de generiek-val op.** "Verzin geen feiten" maakt content generiek zolang de
   schrijver *geen* feiten heeft. Geef hem geverifieerde feiten uit de eigen site en hij kan
   concreet én veilig schrijven.
2. **Kwaliteit is bijna gratis.** Content is vraaggestuurd; een redactielus + premium model kost
   centen per pagina, terwijl content het product is waarvoor concurrenten €1.000+/mnd rekenen.
3. **Symmetrie.** De meting had een review-gate; de content — het echte product — hoort er ook een
   te hebben.

Resultaat: de driestapsredactie (schrijven → kritiek → herschrijven), de premium tier voor
schrijven, `proofPoints`/`styleSamples` als schrijfgrondslag, en programmatische validatie van
`schema_jsonld` in plaats van de LLM-string blind vertrouwen.

## 4. Praktijktest en doorlichting (28–30 juli)

**Van den Udenhout, "Private Lease Skoda"** — de eerste volledige doorloop met een echte klant,
nagerekend tegen de opgeslagen data. Uitkomst: **vijf verzinsels** in de content, precies op de
plekken waar de pagina een concreet feit nodig had. Dat werd de aanleiding voor heel R5.

**Vijf testanalyses** (Bol, Coolblue, HEMA, Van der Valk, Fysi-Unique, 30 juli) tegen de drie
klantdoelen leverden 20 verbeterpunten op. De vier zwaarste werden R1–R4. Deze vijf analyses zijn
sindsdien de **regressieset**: ze hebben opgeslagen `raw_response`-teksten, dus vrijwel elke stap
is zonder nieuwe OpenAI-kosten te verifiëren door de bestaande data opnieuw te verwerken.

## 5. R1–R4, R6.1 — de meetkant repareren

| Ronde | Het probleem, gemeten | De ingreep |
|---|---|---|
| **R1** Bewijslaag | Het rapport verzon welke concurrent een vraag won. | Een deterministisch bewijsdossier uit de database gaat de prompt in; het model verwoordt alleen. Een claimvalidator verwijdert achteraf elke merknaam die niet in het dossier van díe vraag staat, en logt dat in `stripped_claims_json`. |
| **R2** Meetbaarheid | De score telde "de AI noemde niemand" mee als "jij werd niet genoemd". | Per antwoord wordt geteld hoeveel aanbieders er genoemd worden. Alleen winbare vragen tellen mee; structureel merkloze vragen worden bij vervolgperiodes overgeslagen. |
| **R3** Zichtbaarheidsprofiel | `position` stond vol onzin (215 van 521 vermeldingen op 0) en `sentiment` gaf in 650 metingen nooit iets anders dan neutraal. | Positie genormaliseerd (`normalizePosition()`), `sentiment` vervangen door `mention_role`, citaties worden geteld. |
| **R4** Concurrent-intelligence | Concurrenten werden geteld maar niet begrepen. | Nieuwe pijplijnstap destilleert per concurrent waaróm die genoemd wordt, met een letterlijk citaat per eigenschap. |
| **R6.1** Gelaagd hermeten | Eén meting per vraag was te wisselvallig voor een trendlijn. | De zwaarste 8 vragen gaan 3× door de meting; alle aggregatie telt per **vraag** in plaats van per meting. |

**De les uit de verificatieronde, die sindsdien een huisregel is:** het model vulde ondanks een
expliciete instructie bij 10 van 27 niet-genoemde merken tóch een rol in — structured output kiest
bij twijfel de eerste enum-waarde. Een promptinstructie is een intentie; alleen code is een
garantie.

## 6. R5 — de contentbriefing

Het model verzon feiten precies waar de pagina er een nodig had (zie §4). De oplossing is geen
strengere instructie maar een andere volgorde: de app bouwt eerst een **feitenkaart**, laat een
**claim-audit** bepalen welke beweringen daarop niet onderbouwd zijn, stelt de klant maximaal 8
gerichte vragen, en schrijft daarna uitsluitend binnen die kaart — met per bewering het F-nummer
dat hem dekt.

## 7. De contentronde (31 juli) — tien pagina's, vier bugs

Tien pagina's (5 testcases × 2) door de volledige keten geschreven en pagina voor pagina beoordeeld.

- **Direct gerepareerd:** `draftContentPiece()` behandelde een `content_piece` met status
  `'briefing'` als "al af" en sloeg het schrijven stilzwijgend over. Trof potentieel elke "Schrijf
  mijn pagina's"-klik sinds R5.2.
- **De zwaarste vondst van het hele traject:** de antwoorden die de klant in het briefingscherm
  geeft, bereikten de schrijver niet. `loadContentContext()` bouwde wel een lijst `answeredFacts`,
  maar gebruikte hem nergens — de schrijver kreeg uitsluitend de kaart zoals die vóór de antwoorden
  bevroren was. Bewijs: een door de tester met bron bevestigd "nee" op de doelvraag van een
  Fysi-Unique-pagina werd alsnog als "ja" gepubliceerd. Dat is geen losse bug maar het gat waardoor
  R5's kernbelofte niet werkt zodra de klant iets *corrigeert*.
- Drie kleinere bevindingen: multi-ref-claims die de citaatplicht ten onrechte lieten falen, een
  versiesprong die een lege spookrij achterliet, en vaste praktisch-slots die niet passen bij een
  platform of keten.

**R8 loste negen van de tien op.** De belangrijkste:

- **R8.1** — `mergeAnsweredFacts`: de klantantwoorden komen alsnog op de feitenkaart, en een nieuwer
  antwoord verslaat een ouder op basis van de vraag.
- **R8.2 / R8.7 / R8.8** — `content-gate.ts`: deterministische controles vervangen de
  zelfrapportage van het model. Die gaf 100/100 op alle tien pagina's, óók op de pagina waarvan
  dezelfde aanroep in zijn eigen verbeterpunten schreef dat de hoofdvraag niet beantwoord werd.
- **R8.3** — een bewering die op twee bevestigde feiten steunt telt niet langer als onbewezen.
- **R8.4** — bijna-identieke vragen vallen samen (`topicKey`); al gestelde vragen gaan mee de
  claim-audit in.
- **R8.5** — `profiles.business_model` (`0032`) en een vragenset die zich daarop aanpast.
- **R8.6** — het briefingscherm noemt `suggested_answer` een gok, geen voorstel.
- **R8.10** — een verse briefingrij wordt in dezelfde rij geschreven; geen spookversie meer.

**R8.9** (productfeed voor retailers) is bewust een onderzoeksvraag gebleven, geen bouwstap.

## 8. S1–S8 en R7.1 — de laag erboven (31 juli / 1 augustus)

De contentronde vond het gat tussen klant en schrijver; deze doorlichting vond het **plafond
erboven**. De feitenkaart was merkbreed en onderwerp-blind: over vijf analyses stonden er 24
citeerbare feiten op, en géén ervan ging over het onderwerp van de analyse. Voor "wasmachine kopen"
waren dat gratis wassen tussen 12 en 15 uur, cashback op groene stroom en een AirPods-reviewscore.
Het materiaal lág er wel — Coolblue had 10 gecrawlde wasmachine-adviespagina's in `profile_pages`,
waarvan er nul op de kaart kwam terwijl vier Engelstalige duplicaten van de homepage dat wél deden.
Oorzaak: `buildFactBase()` nam de eerste 8 crawlrijen, zonder `order by` en zonder relevantiefilter.

| Stap | Wat het oploste |
|---|---|
| **S1** Onderwerpgerichte, atomaire feitenkaart | Relevantieselectie in code (`page-relevance.ts`) plus één mini-aanroep die letterlijke zinnen met een hard feit eruit haalt (`fact-atomise.ts`, ~$0,004 per batch). Vangnet los in `atom-verify.ts`. |
| **S2** Het paginaplan overleeft de briefing | De claim-audit rekende uit wat elke pagina moet beweren (31 beweringen over vijf batches, 19 onderbouwd) en dat werd weggegooid zodra de vragen gesteld waren. Nu blijft het plan per pagina staan en gaat het als opdracht de schrijfprompt in, met per punt GEDEKT / WEERLEGD / GEEN BRON. |
| **S3** De code bepaalt de noemer | `source_coverage` mat 49 door het model getagde beweringen op ~250 zinnen — één op de vijf — en juist in die andere vier vijfde zaten beide fabricages van de contentronde. `claim-extract.ts` bepaalt nu welke zinnen een bewering zijn; een zin zonder onderbouwde claim telt als ongedekt en komt met naam en toenaam in `review_notes`. |
| **S4** De positioneringsvraag bestaat | `onderscheid` was 0 van de 62 gestelde vragen, waardoor de R8.8-controle op een lege verzameling draaide. Nu een deterministisch slot uit `competitor_breakdown.attributes_json`, met één gereserveerde plek in de acht. Die bewijszinnen gaan nu ook naar de schrijver — die kreeg alleen de woorden "prijs" en "service". |
| **S5** Het merkdossier (`0035`) | Max 8 vragen per batch leverde over vijf testklanten 21 beantwoorde vragen op. Nu kan de klant plakken wat hij al heeft liggen; één mini-aanroep maakt er vraag/antwoordparen van. Het vangnet (`dossier-verify.ts`) gooit elk paar weg waarvan het antwoord niet letterlijk in de aangeleverde tekst staat — "€ 45,00" afronden naar "45 euro" is een andere belofte. De brontekst blijft bewaard met sha256-hash: dezelfde brochure twee keer plakken levert een melding, geen tweede set feiten. |
| **S6** De publicatiepoort (`0034`) | `status: 'ready'` betekende "de pijplijn is klaar" maar werd getoond als "klaar om te publiceren". Nu betekent `needs_review = true` "nog niet vrijgegeven". Bewust géén nieuwe enum-waarde: `content_status` is een Postgres-enum, dus een extra waarde raakt elke plek die op status filtert. `reviewed_at`/`reviewed_by` scheiden "de poort vond niets" van "een mens heeft gekeken" — het paneel toont die derde stand expliciet. |
| **S7** De ketentest | Zeven van de zeven fouten van dit traject zaten in de samenhang tussen taken, en `test-unit.ts` kon ze geen van alle vangen. `npm run test:chain` draait de échte jobhandlers tegen een échte Postgres met dezelfde migraties. Geen Docker, geen Supabase CLI — `initdb` + `pg_ctl` volstaan. Alleen de Supabase-wire-vertaling en OpenAI zijn nagebootst. **Aangetoond dat de test kán falen:** met de reparatie van bug 6 teruggedraaid wordt hij rood op precies die assertie. |
| **S8** De feitenbank (`0036`) | Een F-nummer is een POSITIE, geen identiteit: "F3" betekent "het derde feit in déze lijst". In de ketentest verwees de stub naar F1 en F2, en zodra er vier klantantwoorden bijkwamen werden dat F5 en F6. Daardoor stond hetzelfde feit in élke snapshot opnieuw, was van `claims_json` niet te zeggen naar wélk feit een bewering verwees, en belandden twee tegenstrijdige antwoorden allebei op de kaart. Nu heeft elk feit een `fact_key`, een scope en `superseded_by` in plaats van overschrijven. Tegenspraken komen boven in plaats van dat het model kiest. Fouttolerant: gaat het schrijven stuk, dan werkt de kaart als vóór `0036`. |
| **R7.1** Winbaarheid als kans (`0037`) | `brand_eliciting` was een tekstvlag en `queue.ts` sloeg elke vraag met `'nee'` over, terwijl de onderliggende meting een verhouding is. Op productie: alle **9** prompts op `'nee'` stonden daar op **precies 2 metingen** — bij n=2 en nul successen loopt de bovengrens van het Wilson-interval tot ~0,66. Nu tellen `elicit_successes`/`elicit_samples` mee, vervalt een vraag pas bij ≥8 metingen én een bovengrens onder 0,25, en verschijnt de vlag pas vanaf 3 metingen. Met de huidige stand wordt er dus geen enkele overgeslagen — precies de bedoeling. |

**Volgorde-notitie:** S1 t/m S7 zijn eerst gebouwd zónder migratie, omdat er destijds alleen
leestoegang tot productie was. Dat leverde bruikbare stappen op met drie erkende beperkingen; die
zijn met `0034`–`0036` alsnog opgeheven zodra de schrijfrechten er waren.

## 9. UX-herstructurering

De diagnose was drieledig: de informatiestructuur vertelde niet welk product dit is (van vier
navigatielinks wezen er twee naar dezelfde route), de levenscyclus van een analyse was vier keer
los geïmplementeerd, en er was geen enkele systeem-feedback op routeniveau — geen `loading.tsx`,
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
stubs — profiel aanmaken, 22 vragen laten opstellen, bevestigen, 38 metingen met `web_search`,
rapport, briefing beantwoorden en één pagina laten schrijven. Kosten van de hele run: **$1,03**,
waarvan $0,988 (96%) in de 38 metingen. Dat is precies de verhouding die §3 voorspelde.

> Deze run draaide op de **GPT-4.1-familie**; de migratie naar GPT-5.6 (§11) is er direct
> achteraan gegaan. De bedragen en de modelnamen hieronder gelden dus voor de stand van
> vóór die migratie — de bevindingen zelf staan er los van, want geen ervan gaat over het
> model.

De keten werkt. Wat eruit kwam: score 95 ±13, 68% van de metingen noemt Swapfiets, gemiddelde
positie 1,3, 14× als eerste aanbevolen, en een artikel van 502 woorden waarvan elke concrete
bewering een F-nummer draagt dat naar een echte bron wijst. Nul verzinsels.

Er gingen onderweg vijf dingen stuk. Op volgorde van hoe erg:

**De content-inventaris verdween zonder een woord.** Twee van de 22 gecrawlde pagina's van
swapfiets.nl bevatten een NUL-byte (U+0000). Postgres accepteert dat niet in een `text`-kolom en
PostgREST weigert dan de HÉLE batch-insert — dus twee rotte pagina's kostten alle 22. De fout van
de insert werd nergens gecontroleerd: `refreshInventory()` gaf 22 terug, de route antwoordde
`{"count":22}`, en in `profile_pages` stond nul. Het profiel ging op 'klaar'.

Dit is de duurste soort fout die dit product kan maken, want hij is onzichtbaar en hij vreet aan
het fundament: zonder inventaris is de feitenkaart leeg en wordt content op niets gebouwd. Het
verschil is te meten. Na de reparatie telde de kaart van dezelfde pagina **29 citeerbare feiten,
waarvan er 18 uitsluitend uit de gecrawlde pagina's komen** — inclusief alle prijzen (€19,90 voor
de Original, €23,90 voor de Deluxe 7) en de servicebelofte "binnen 10 minuten gerepareerd of
omgeruild". Zonder de fix had het artikel het over "een vast bedrag per maand" moeten hebben.

Geschoond bij de bron (`lib/pg-text.ts`, puur en getest): `htmlToText()` is het enige punt waar
externe HTML platte tekst wordt, dus daar gaan de NUL-byte en de losse surrogate eruit. En beide
inserts controleren nu hun fout — `prepare-profile` logt hem, `refresh-inventory` gooit hem, want
die route toont de klant een getal en dat mag geen leugen zijn.

**De werker werd door het platform afgekapt.** Twee 504's op `/api/cron/worker` in 24 uur ("Task
timed out after 300 seconds"). Twee rekensommen die niet klopten. De SDK-timeout van 100s geldt
per POGING en de SDK herhaalt ook timeouts, dus met `maxRetries = 3` was de echte bovengrens van
één aanroep 400 seconden — terwijl `HEAVY_JOB_RESERVE_MS` (220s voor twee aanroepen) er
stilzwijgend van uitging dat er niet herhaald werd. En de claimlus keek alleen of het budget nog
niet óp was, niet of het volgende werk er nog ín past: zware taken hadden een reservering, lichte
niet. Nu een totaalbudget van 105s per aanroep via een `AbortSignal` die over alle pogingen heen
geldt, plus een reservering voor allebei de soorten. Afgekapt worden is niet onschuldig: alles wat
op dat moment geclaimd was bleef op 'running' staan tot de reaper het vijf minuten later
terugzette, en zo lang kijkt de klant naar een voortgangsscherm waarachter niets gebeurt.

**Wat je vóór de hydratie typte, was weg.** Het naamveld van de onboarding heeft `autoFocus` en
nodigt dus uit om er meteen in te typen. Wie dat deed vóórdat React het formulier had overgenomen,
zag bij de eerste re-render naam én webadres leeglopen — de controlled input schreef de lege
React-state over de DOM-waarde heen. Gemeten tegen productie, zonder enige melding. Eén effect bij
het aankoppelen neemt nu over wat er al stond.

**Oriëntatie leverde 2 van de 10 vragen op.** Overweging en Beslissing haalden allebei gewoon 10.
Oorzaak is de merkneutraliteitsregel die precies doet wat hij moet doen: een brede oriëntatievraag
over fietsabonnementen noemt in Nederland vanzelf de marktleider, en dat is hier de klant zelf.
Het probleem zat in de aanvulronde, die wel te horen kreeg dát er vragen ontbraken maar niet dat
de vorige ronde op een BEDRIJFSNAAM sneuvelde — uit een lijst geaccepteerde vragen valt dat niet
af te leiden. Nu staat de reden er expliciet bij, met de verboden namen, en mag een fase drie
rondes in plaats van twee. De klant zag hier niets van: het scherm meldde "22 actief van 22".
⚠️ Dit is de enige reparatie van deze ronde die nog **niet live is nagerekend** — de wachtrij
draait op de productiebranch, dus het effect is pas te meten bij de eerste analyse na de merge.

**En een e-mail die nooit kwam.** "Kom later terug of wacht op de e-mail", op elk voortgangsscherm,
terwijl `EMAILS_ENABLED` uitstaat en op productie uitstond. Er staat nu alleen wat onder alle
omstandigheden waar is. Verder `app/icon.svg` toegevoegd: `/favicon.ico` gaf 404 bij elke
paginaweergave.

Wat déze ronde leert bovenop §7: de bugklasse is opgeschoven. De zeven fouten van juli zaten in de
samenhang tussen taken. Deze vijf zitten in de **randen van het systeem** — wat het open web in de
database duwt, wat het platform met een te lange functie doet, wat de browser doet vóórdat React
er is. Geen enkele was te vinden met een test die de app tegen zichzelf draait; alle vijf lagen
binnen tien minuten open zodra er één echte klant doorheen liep.
## 11. Over naar GPT-5.6 (1 augustus 2026)

De hele app draaide op de GPT-4.1-familie. Nu: **`gpt-5.6-luna`** voor alles wat meet, onderzoekt
en beoordeelt, en **`gpt-5.6-sol`** — het duurste model dat OpenAI levert — uitsluitend voor het
schrijven en herschrijven van content. Dat laatste is de enige stap waarvan de uitkomst letterlijk
gepubliceerd wordt; daar is de tier het geld waard, overal elders niet.

**Wat er inhoudelijk moest veranderen, en waarom het meer was dan drie strings.**

De GPT-5-familie is een redeneerfamilie. Dat raakt twee dingen die deze app expliciet gebruikte:

- **`temperature` is geen vrije knop meer.** Een GPT-5.6-model accepteert hem alleen bij
  `reasoning.effort: "none"`; bij elke hogere stand is het een unsupported parameter en faalt de
  call. De app zette op 21 plekken een temperatuur — één op één overzetten had dus niet "iets
  slechtere output" opgeleverd maar een 400 op elke onderzoeks-, rapport- en schrijfstap.
- **De tier-splitsing verviel.** `volume` (nano) en `quality` (mini) waren twee modellen; nu wijzen
  ze allebei naar Luna. Het onderscheid dat we ermee maakten — hoeveel mag deze stap kosten en hoe
  zorgvuldig moet hij zijn — zit nu in de redeneerinspanning.

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
1000 calls in plaats van $25, en dat was ~90% van een meetronde — 30 vragen gaan van $0,75 naar
$0,30. Daar staat tegenover dat de opgehaalde pagina's nu wél als input worden afgerekend (~$0,05
per ronde op Luna). Netto ruwweg $0,40 in plaats van $0,82. Content werd juist ~5× duurder per
pagina. Beide getallen zijn afgeleid van de gepubliceerde tarieven en **nog niet nagerekend tegen
`ai_calls` op productie** — conventie 10 geldt ook hier.

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
  omschrijft zichzelf als "de meest load-bearing prompt van het hele product" — daar hoort een
  evaluatie bij. Vereist een API-sleutel. Sinds de overstap naar GPT-5.6 (§10) weegt dit zwaarder:
  de classificatie draait nu op een ánder model dan waarop de prompt is afgeregeld. Het script
  meet inmiddels met exact de productie-instellingen (effort `none`, temperatuur 0) en vergelijkt
  Luna tegen Terra.
- **De regressieset is vijf analyses van 30 juli 2026.** Na een wijziging moeten de cijfers óf
  gelijk blijven, óf aantoonbaar beter worden om de reden die in de stap staat.

## 13. Analyses-overzicht ontdaan van de opgerolde werklijst (3 augustus 2026)

`/analyses` toonde bovenaan dezelfde "Wat je nu kunt doen"-lijst als het dossier, maar dan opgerold
over alle analyses heen. Bij één analyse was dat zinvol; bij meerdere liep hij op **27 losse
punten** in één kaart — precies de rommel die het werkmodel (`lib/work.ts`, §9) per analyse juist
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
  `tracking_run_mentions` — die tabel heeft geen `analysis_id` en zou per analyse een aparte query
  op de laatste week hebben gekost.
- **"Geschreven" en "voorgesteld" gebruiken dezelfde statusgrens als `_chapters/werk.tsx`**: een
  `content_pieces`-rij telt pas als geschreven zodra de status voorbij `briefing` is (die heeft nog
  geen tekst); een aanbeveling telt als "voorgesteld" zolang er geen rij met status ≠ `draft` en
  dezelfde titel bestaat. Twee losse berekeningen voor "is dit al gedaan" hadden hier gegarandeerd
  uit elkaar gelopen.

`components/action-list.tsx` (de oude `ActionList`) is vervallen; `DashboardStats` verhuisde naar
`components/dashboard-stats.tsx`.

---

## 11. Onboarding 2.0 — de eerste helft (3 augustus 2026)

Volledige bouwspec: [`tasks/onboarding-2.0.md`](./tasks/onboarding-2.0.md). Hieronder wat er
gebouwd is en het cijfer dat elke keuze droeg.

**Het cijfer dat de hele ronde droeg: 6.000 tegen 60.** Het profielonderzoek deed één AI-aanroep op
`crawlSite()` — de homepage, afgekapt op 6.000 tekens. De content-inventaris van 60 pagina's draaide
er parallel aan en werd pas ná de aanroep opgeslagen, dus die kwam het onderzoek nooit in. Alles wat
het model over diensten, prijzen, vestigingen en team "wist", kwam uit die ene pagina plus een gok.
`profile_discover` draait nu vóór het onderzoek en levert 60.000 tekens context aan voor ~$0,003 aan
invoer. De duurste kennisbron bleek gratis en werd weggegooid.

**Verkoopgedreven in plaats van self-serve.** De onboarding vroeg vier wizardstappen met elf velden
uit voordat er iets gebeurde. Nu drie velden — webadres, bedrijfsnaam, andere schrijfwijzen — en de
pijplijn doet de rest. De oude kolommen bestaan nog en worden door het onderzoek gevuld. Corrigeren
gebeurt achteraf op de profielpagina, als er iets te corrigeren vált.

**De stafrol als extra policy, niet als herschrijving.** Er staan 19 tabellen met een
`*_select_own`-policy. Postgres OR't permissieve policies, dus één extra policy per tabel doet
hetzelfde als alle 19 herschrijven — maar additief, en met één `drop` per tabel weer weg.
`staff_users` heeft RLS aan en nul policies (zoals `jobs`), en `is_staff()` is daarom
`security definer` met een vaste `search_path`: als aanroeper zou hij die tabel mét RLS lezen en
altijd `false` geven — de hele verbreding zou dan stil niet werken.

**Toewijzen raakt precies twee tabellen.** `user_id` komt alleen voor in `profiles` (0004) en
`analyses` (0001); nagelopen over alle 41 migraties. De rest hangt via `analysis_id` aan de analyse
en verhuist mee met de RLS-join. Faalt de tweede update, dan wordt de eerste teruggedraaid — een
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
categorie en product in — categorieniveau meet een hele markt, productniveau wordt door niemand
gevraagd. `propose_topics` kost ~$0,01 en doet bewust geen meting per voorstel; dat zou 8 × $0,40
zijn vóórdat iemand ja heeft gezegd.

**De enginelaag is bedrading zonder fan-out.** `lib/engines/` is er, de Gemini-adapter is er, de
meetsleutel kent de engine en migratie `0041` dwingt hem af. Wat er bewust nog níét is: uitwaaieren
per engine in de planning. `computeAggregates`, `measurementIsUsable` en
`countOpenPeriodicMeasurements` tellen alle runs van een periode ongeacht engine — nu per engine
inplannen zou elke vraag dubbel laten meetellen in de score. Het stappenplan staat in
`lib/jobs/queue.ts`, bij de plek waar het moet gebeuren.

**`dedupe` verhuisde naar een eigen module zonder `server-only`.** Die sleutels bepalen of werk
dubbel wordt ingepland; één tekenverschil is het verschil tussen een genegeerde dubbele taak en een
tweede betaalde web-zoekactie per vraag. Ze waren onbereikbaar voor de unittests, en dat viel pas op
toen de engine erbij kwam — precies conventie 2, twaalf migraties te laat toegepast.

**Aanvulling, later op 3 augustus.** De tweede helft van de ronde: de
LLM-kennisbasislijn met een oordeel dat in code wordt geveld en niet door het
model (`baseline-verdict.ts` — het model vragen of zijn eigen antwoord klopt is
de meting aan de gemetene vragen), de strategiekaart met contextfactoren die
elk een gevolg in code hebben, en `field-merge.ts`, dat "een mens wint van een
model" afdwingbaar maakt. Dat laatste is wat "onderzoek opnieuw" van een
gevaarlijke knop in een bruikbare verandert.

Eén bevinding onderweg die het noteren waard is: `dedupe` stond in een
`server-only`-module en was daardoor onbereikbaar voor de unittests — twaalf
migraties lang, want conventie 2 bestaat sinds ronde één. Het viel pas op toen
de engine in de sleutel moest en juist die sleutel getoetst wilde worden. Eén
tekenverschil daar is het verschil tussen een genegeerde dubbele taak en een
tweede betaalde web-zoekactie per vraag.

En na de RLS-verbreding meldde de Supabase-linter dat `is_staff()` aanroepbaar
was door `anon`. Onschadelijk — `auth.uid()` is dan null, dus altijd `false` —
maar migratie `0042` zet hem dicht, samen met een `to authenticated` op de 26
stafpolicies. Die twee horen in één migratie: los toegepast levert het intrekken
van de EXECUTE-rechten een "permission denied" op waar nul rijen hoort te staan.


### 3 augustus 2026 — de eerste echte onboarding, en wat hij liet zien

Onboarding 2.0 ging naar `main` en draaide daarna één keer volledig op productie:
Fysi-Unique, een fysiotherapiepraktijk in Amersfoort. **7,5 minuut van invoer tot
afgerond dossier, $0,24 van de $2,15.** De keten liep zonder één mislukte taak —
`profile_discover` → `technical_audit` → `profile_research` → `profile_offering` →
`propose_topics` → `profile_market` → `profile_llm_baseline` → `profile_synthesis`.

Wat er goed uit kwam, en waarom het de bouwronde rechtvaardigt: 30 pagina's
gecrawld (was: één homepage van 6000 tekens), een aanbodboom van 20 knopen mét de
tarieven van de tarievenpagina — intake € 59,00, manuele therapie € 57,50,
jaarabonnement medische fitness € 370,00 — en met diensten die alleen op diepe
pagina's staan (seksuologie, loopanalyse, inloopspreekuur). Het oude onderzoek zag
daar niets van. Acht core topics, acht concurrenten met onderbouwing, zestien
technische controles waaronder de vier entiteitschecks.

**En zes fouten die geen enkele test had kunnen vangen, want ze zaten er alle zes
tússen.** Conventie 10, opnieuw bevestigd: gebouwd is niet geverifieerd.

1. **De kennistest gaf een vals positief, en dat is de ernstigste die er is.**
   ChatGPT antwoordde twee keer letterlijk *"zonder plaatsnaam of website kan ik
   niet met zekerheid zeggen welke organisatie je bedoelt"*. `admitsUnknown()`
   kende die formulering niet, dus `knowsBrand()` gaf `true` — enkel omdat de
   merknaam in het antwoord stond, en die stond er omdat hij in de **vraag** stond.
   Het `llm_kennis`-facet kwam daardoor uit op "ChatGPT kent Fysi-Unique", en de
   synthese schreef dat over als *"ChatGPT kent het bedrijf al"* — precies het
   cijfer waar een ondernemer op afgaat, precies de verkeerde kant op.

   *Correctie van 4 augustus:* hier stond eerst dat het **profielscherm** het
   meldde. Dat klopte niet. Het paneel dat die regel toont werd op dat moment
   helemaal niet gerenderd (zie de notitie van 4 augustus hieronder); de onjuiste
   bewering bereikte de klant via de synthesetekst, die wél op het scherm staat.
2. **De 19 gecontroleerde "feiten" waren 17 paginatitels en 2× de merknaam.** De
   `WebPage`-opmaak levert per pagina een `name` op ("Tarieven | Fysi-Unique"), en
   die gingen ongefilterd de controle in. `checkableFacts()` gooit nu
   paginaniveau-opmaak en de merknaam zelf eruit. Bij deze site blijft er dan nul
   over — en dat is het eerlijke antwoord: er staat geen adres, telefoonnummer of
   oprichtingsjaar in de opmaak.
3. **`service_scope`, `service_regions` en `market_language` bleven leeg.** De
   oude wizard vroeg ze aan de klant; de nieuwe onboarding van drie velden doet dat
   niet meer, en het onderzoek leverde ze nooit. Gevolg: `prompts.ts` zet de regel
   "dit is een LOKAAL bedrijf, verwerk de plaatsnaam" alleen neer als bereik én
   regio gevuld zijn, dus een praktijk in Amersfoort had zich gemeten tegen de
   landelijke markt. De kennistest vroeg dan ook "aanbieders van
   sportfysiotherapie **in Nederland**" in plaats van in Amersfoort. Nu in het
   onderzoeksschema, met `'onbekend'` als eerste enum-waarde — structured output
   kiest bij twijfel de eerste, dus die hoort de eerlijkste te zijn — en met
   `resolveScope()` als vangnet: 'lokaal' zonder regio wordt `null`.
4. **Alle acht topics hadden een lege `offering_ids`.** De aanbodlijst in de prompt
   toont elke knoop als "Ouder › Kind" en vraagt de namen letterlijk over te nemen;
   het model deed dat, de koppeling zocht alleen op `o.name`. Acht onderbouwingen
   die op het scherm nergens naar terug te klikken zijn.
5. **`profile_field_sources` bleef leeg, dus de bescherming was inert.** Alleen de
   strategieroute schreef herkomst, en dan nog alleen voor aliassen en werkgebied
   uit de contextfactoren. `PATCH /api/profiles/[id]` — de gewone manier waarop
   iemand een profiel corrigeert — zette `edited_by_user = true` en verder niets.
   `filterProtectedFields()` kon dus nooit iets blokkeren en "onderzoek opnieuw"
   zou elke correctie stil overschrijven: exact het scenario waarvoor migratie
   `0039` gemaakt is.
6. **Twintig grijze "niet vastgesteld"-chips naast een goed onderbouwde
   aanbodboom.** `confidence` stond hard op `null`. Nu deterministisch, dezelfde
   regel als in `synthesis.ts` en verhuisd naar één gedeelde module
   (`quote-check.ts`): staat het citaat letterlijk op de pagina waar de knoop naar
   verwijst, dan is het 1,00 — anders 0,50. Alleen het twijfelgeval valt nog op,
   en dat is wat die chip hoort te doen.

**De hermeting op de gerepareerde code, diezelfde avond.** Tweede schone
onboarding van dezelfde site: **$0,2463**, alle acht taken groen. Vier van de zes
reparaties tekenden zichzelf af — `service_scope = lokaal`, `service_regions =
["Amersfoort"]`, `market_language = "Nederland, Nederlands"`; 22 aanbodknopen
allemaal op `confidence 1.00` (elk citaat letterlijk teruggevonden, dus nul grijze
chips); acht topics met 2–4 aanbodkoppelingen elk in plaats van nul; en de
categorievragen van de kennistest vroegen nu "aanbieders van fysiotherapie **in
Amersfoort**" in plaats van "in Nederland", met FitForum, SMC Amersfoort en
Praktijk Boshuijzen als antwoord.

**En de kennistest liet zien dat reparatie 1 te ver ging.** Met het werkgebied in
de vraag antwoordde het model wél raak — *"Fysi-Unique in Amersfoort is een
fysiotherapiepraktijk (…) Ik kan zonder actuele website-informatie niet met
zekerheid zeggen welke specialisaties zij momenteel aanbieden"* — en dát werd nu
als "kent het merk niet" gemeld. Vals negatief, waar het eerst vals positief was.
De oorzaak: de reparatie nam naast de identiteitszinnen ook losse hedges mee
("niet met zekerheid", "ik weet niet zeker"), en die slaan net zo vaak op een
detail als op het merk.

De grens ligt bij **identiteit**: "ik weet niet wélk bedrijf je bedoelt" is het
tegendeel van kennen; "ik weet de openingstijden niet" is een detail dat
`checkFacts()` afhandelt. De losse hedges zijn eruit, de vier antwoorden uit beide
meetronden staan als testgevallen in `test-unit.ts` — twee die wél en twee die
niet als onbekend mogen tellen. Zonder die tweede ronde was de overcorrectie pas
opgevallen bij een klant die wél bekend is.

De kostenverdeling verraste: `profile_synthesis` is met $0,127 (52%) de duurste
stap, niet de web-zoekacties. Dat is het Sol-model achter `SYNTHESIS_PREMIUM`.
De drie categorievragen van de kennistest samen $0,044; de rest valt in het niet.
Het budget van $2,15 is geen knellende grens — er is ruimte voor een tweede engine
zonder aan de plafonds te komen.

### 4 augustus 2026 — vijf verbeteringen die uit de meetronden zelf kwamen

Niet uit een plan, maar uit wat twee volledige onboardings op productie lieten
zien. Alle vijf kosten vrijwel niets extra aan API-calls; samen brengen ze de
ronde van **$0,2463 naar naar schatting ~$0,247**.

**1. De nulmeting stelde een vraag en gaf geen antwoord.** Het profielscherm zette
boven het categorieblok de kop *"Word je genoemd bij koopvragen?"* en beantwoordde
hem nergens: `askOne()` bouwde alleen een oordeel voor het blok `kent`, en de drie
categorie-antwoorden belandden als ruwe tekst in een uitklapper. Dat terwijl dit
blok **$0,044 van de $0,2463 kost — 18%, de op één na duurste post** van de hele
onboarding, en het precies het cijfer is waar een ondernemer op wacht.

`scoreCategoryAnswer()` beantwoordt hem nu deterministisch met `textContainsName()`
— dezelfde functie die de betaalde meting gebruikt, en om dezelfde reden: de
LLM-beoordeling van `mentioned` gaf daar soms `true` terwijl het merk nergens in
het antwoord stond. Nul kosten. Erbij: welke bekende concurrenten wél genoemd
worden, want *"deze drie kwamen boven, jij niet"* zegt meer dan een nul.

Dat vroeg wel om `cleanCompetitorName()`. `profiles.competitors` is een mengsel:
`market.ts` schrijft er kale namen in, maar `prepare-profile.ts` — die eerder
draait — zet er de hele onderbouwing in die het onderzoek teruggaf, inclusief
markdown-link. Zo'n regel als naam door een tekstcontrole halen levert altijd
`false` op.

**2. "Kent hij je merk" hing aan één formulering.** Ronde 1 vroeg *"Wat weet je over
Fysi-Unique?"* → het model kon de naam aan geen enkele organisatie koppelen.
Ronde 2 vroeg *"Wat weet je over Fysi-Unique úít Amersfoort?"* → een correcte
omschrijving. Twee woorden verschil, en het was de kopregel van het profielscherm
die omsloeg.

Het blok kostte **$0,0003 voor twee vragen**. Nu zes formuleringen voor ~$0,001,
mét en zónder plaatsnaam, en een verhouding in plaats van een ja/nee. Geen
verzonnen drempel: 0 van de 6 is "kent je niet", 6 van de 6 is "kent je", alles
daartussen is "wisselend" — wat het dan ook echt is. Dat verschil is zelf een
bevinding: een merk dat alleen mét plaatsnaam herkend wordt, is niet als entiteit
bekend maar als woordcombinatie.

**3. De koopvragen gingen over de generiekste diensten.** `slice(0, 3)` op
`sort_order`, en die volgorde komt van de site: fysiotherapie, manuele therapie,
sportfysiotherapie — de drie waar élke praktijk op concurreert. Terwijl het
marktonderzoek van dezelfde ronde schreef dat *"vooral de combinatie van
bekkenfysiotherapie, zwangerschapsbegeleiding en seksuologie"* deze praktijk
onderscheidt. Die drie zijn nooit gevraagd; de nulmeting mat de klant op zijn
zwakste punt. `categoryLeaves()` kiest ze nu via de topics, die de boom al op
commerciële relevantie gewogen hebben — en die sinds 3 augustus ook daadwerkelijk
naar de aanbodknopen wijzen.

**4. Feiten kwamen alleen uit JSON-LD.** Na filtering bleven er **nul**
controleerbare feiten over voor Fysi-Unique: de site zet wel `Organization` in
zijn opmaak, maar zonder adres, telefoonnummer of oprichtingsjaar. Het blok "klopt
wat ChatGPT zegt?" had dus niets. Terwijl het `citeert`-antwoord van diezelfde
meting ze letterlijk noemde — *"Henry Dunantstraat 32, 3822 XE"* en *"(033) 455 89
45"* — van de contactpagina die wij zelf gecrawld hadden. Voor het merendeel van
het MKB is dat de normale situatie.

`text-facts.ts` oogst telefoon, adres, e-mail en KvK met reguliere expressies, en
met twee beperkingen die vals alarm voorkomen: alleen canonieke pagina's
(homepage, contact, over-ons) en per soort alleen de waarde die op de meeste
daarvan staat. Bij een gelijkspel: niets. Een verkeerd feit zou ChatGPT's júíste
antwoord als `tegengesproken` markeren, en dat is de melding waar een ondernemer
van schrikt.

**5. Topics verloren hun aanbod bij "onderzoek opnieuw".** De herhaalroute
verwijdert de AI-knopen (moet wel — anders slaat `buildOfferingTree()` zichzelf
over) en laat de topics staan. `offering_ids` is een `uuid[]` en kan dus geen
foreign key hebben: na één herhaalronde wijst élke koppeling naar een verwijderde
rij. Stil, want er valt niets om. Migratie `0043` zet de namen ernaast; die
overleven een herbouw, en `relinkOfferingIds()` legt de koppeling terug — inclusief
de knopen met bron `klant`, die de herhaalronde laat staan.

Tests: **608 unittests, 42 ketentests.** De ketentest zet de twee stappen achter
elkaar (verwijderen, herbouwen) en controleert dat er ná afloop geen enkele
koppeling meer naar een verdwenen knoop wijst — precies de samenhang die geen
unittest kan zien.

### 4 augustus 2026 — drie panelen die nooit op het scherm stonden

Gevonden bij het bouwen van optimalisatie 1, toen bleek dat het aanbodpaneel
nergens een dekkingschip kon krijgen: **`OfferingsPanel`, `LlmKnowledgePanel` en
`StrategyBox` stonden wél in de imports van `app/(app)/profielen/[id]/page.tsx`
en hun data werd wél opgehaald — maar geen van de drie stond in de render.**

Dat betekent dat de hele opbrengst van blok B, C en D onzichtbaar was: de
aanbodboom van 22 knopen mét tarieven, de kennistest over vijf blokken, en de
strategiekaart met contextfactoren. Het profielscherm toonde alleen de
synthesetekst die er achteraf overheen geschreven was. Alles wat ik in de twee
meetronden van 3 augustus in de database heb nagerekend, klopte — en niets ervan
was voor een klant te zien.

Twee dingen om te onthouden. Ten eerste: `tsc` en `build` waren de hele tijd
schoon. Een ongebruikte import is geen fout, en een component die nergens wordt
aangeroepen compileert prima. Conventie 10 gaat dus ook over de UI, en "de
component bestaat" is geen verificatie.

Ten tweede, en vervelender: dit is de **tweede keer** in dit traject. Op 3
augustus stonden `staleAdviceNotice`, `confidenceLevel` en `describeMerge` in
dezelfde toestand — gebouwd, getest, nergens aangesloten. Toen was de conclusie
"drie dingen die ik te vroeg had afgevinkt". Nu is het een patroon, en het
patroon heeft een oorzaak: er is geen enkele controle die zegt of een geëxporteerd
paneel ook daadwerkelijk in een pagina terechtkomt.

Daarom is bij deze ronde één regel in de verificatie erbij gekomen: **een paneel
telt pas als af wanneer het op de gedeployde pagina is teruggezien**, niet
wanneer het compileert.

### 4 augustus 2026 — de vier InSpace-optimalisaties

Uit de analyse van hoe InSpace Nova werkt (`docs/tasks/inspace-optimalisaties-1-4.md`).
**Nul extra API-kosten en geen nieuwe migratie**: alle vier draaien op data die er
al ligt.

**1. Structurele gap-analyse.** Onze aanbevelingen kwamen uit gemiste vragen: 30
vragen gesteld, bij 17 niet genoemd, daar volgen pagina's uit. Dat is reactief, en
de blinde vlek werd pas zichtbaar met de aanbodboom. Levert een klant twaalf
diensten en raakt de meting er toevallig vier, dan hoort hij over acht diensten
niets — ook al heeft hij er geen pagina voor, en is dát juist de reden dat een
assistent hem daar niet kan noemen.

`structure-gap.ts` vergelijkt `profile_offerings` met `profile_pages` en geeft per
onderdeel `eigen_pagina`, `zwak_gedekt` of `ontbreekt`. Drie standen en geen twee,
omdat het verschil het advies stuurt: zwak gedekt wordt *verbeteren*, ontbreekt
wordt *nieuw*. De matching hergebruikt `page-relevance.ts` — een tweede algoritme
zou twee plekken opleveren die het oneens kunnen worden over dezelfde vraag.

Het vangnet: een categorie die zelf kinderen heeft telt niet mee, anders adviseert
de app vijf pagina's waar er één hoort. En `kind: "merk"` valt er helemaal buiten;
een retailer hoeft geen pagina per gevoerd merk. Geen opslag: de uitkomst
verandert zodra er een pagina bijkomt, en een kopie zou een vierde plek zijn die
kan verouderen. Landt in de rapportinvoer — daar maakt het verschil — en als chip
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
`@context` en een `@type` — dus ook een `Recipe` op een dienstenpagina; nu moet
het type passen. En onze eigen velden gaan er **altijd** overheen, ook bij een
geldig modelresultaat: een `datePublished` van een jaar geleden op een pagina die
vanmorgen geschreven is, is een versheidssignaal dat tegen de klant werkt.
`withFreshnessLine()` zet de datum ook zichtbaar onder de tekst — een assistent
citeert uit de lopende tekst, niet uit de JSON-LD — en is idempotent, want
`content_revise` draait over bestaande tekst heen.

**3 en 4. Duplicatie en leesbaarheid, in een tweede poort.** Het ontwerpprobleem
eerst: `geo_score` wordt berekend uit `checkContentGate()`, dus er twee checks bij
zetten maakt de score van vorige maand onvergelijkbaar met die van vandaag —
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
betekent — hetzelfde patroon als het verzonnen volumegetal dat migratie `0017`
verving door drie banden. In plaats daarvan vier gemeten grootheden en een
verbeterpunt dat een **aantal** noemt: *"5 zinnen zijn langer dan 30 woorden — knip
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
| Nulmeting | *"genoemd bij 1 van de 3 koopvragen"* — het getal dat er eerst niet was |
| Wie wél genoemd wordt | SMC Amersfoort, FysioAmersfoort, FyZie, Fysio Atelier, FitForum |
| Koopvragen uit de topics | knie-, nek- en schouderklachten in plaats van de drie generiekste diensten |
| `offering_names` | gevuld naast `offering_ids`, dus de koppeling overleeft een herbouw |

En de tekstfeiten hadden een tweede ronde nodig. De eerste versie vond alléén het
e-mailadres, met drie oorzaken die pas op echte tekst zichtbaar werden:
`crawlPages` bewaart 1500 tekens per pagina en de contactpagina begint met een
navigatiemenu van ruim duizend, dus het telefoonnummer viel buiten beeld — het
oogsten verhuisde naar de crawler, waar de volledige tekst nog beschikbaar is.
Het telefoonpatroon kende geen haakjes, en "(033) 455 89 45" brak af na drie
cijfers. En het adrespatroon stond de komma alleen vóór de postcode, terwijl deze
site "Henry Dunantstraat 32 3822 XE, **Amersfoort**" schrijft.

Na die reparatie komt er `(033) 455 89 45` en `Henry Dunantstraat 32 3822 XE,
Amersfoort` uit — nagerekend op productie met een gratis herhaling van fase 0.
Het testgeval in `test-unit.ts` is nu letterlijk de voettekst van de site en geen
nette variant ervan; twee tekens verschil was het verschil tussen drie feiten en
één.
