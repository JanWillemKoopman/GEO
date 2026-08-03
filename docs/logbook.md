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
