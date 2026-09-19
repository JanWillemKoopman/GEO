# Contenttype kiezen bij het cluster

**Onderzoek van 19 september 2026.** Aanleiding: de wens om bij het aanmaken van een cluster al op
te geven wat voor soort pagina eruit moet komen (productpagina, productcategorie, nieuwsartikel,
blogpost), zodat er uitsluitend vanuit die gedachte gekeken wordt welke content gemaakt of verbeterd
kan worden, met een optie om de keuze open te laten.

Alle cijfers komen uit de productiedatabase (project `kosauqzjbpweluiqgmwv`), nagerekend op
19 september 2026 over 3 merken, 6 clusters, 6 rapporten met 37 aanbevelingen en 25 teksten
(conventie 10). Dit document beschrijft de bestaande werking en een voorstel. Er is nog niets
gebouwd.

---

## 1. Het contenttype bestaat al, en stuurt meer dan je zou denken

De app kent vier contenttypes: `article`, `faq`, `landing`, `comparison`
(`lib/types/database.ts`). Zestien modules lezen dat type. De belangrijkste:

| Waar | Wat het type bepaalt |
|---|---|
| `content.ts` `TARGET_WORDS` | De doellengte: een FAQ 250 tot 500 woorden, een artikel 700 tot 1200 |
| `content.ts` `TYPE_GUIDANCE` | De schrijfinstructie: overtuigen tegenover uitleggen tegenover vergelijken |
| `content-contract.ts` | De inhoudsopgave, met de vraagkoppen die bij een FAQ juist wél horen |
| `quality-profile.ts` | Welke kwaliteitsdimensies meetellen en waar de publicatiedrempel ligt |
| `schema-jsonld.ts` | Welk schema.org-type de pagina meekrijgt |
| `briefing.ts`, `item-dossier.ts`, `writer-brief.ts`, `slug.ts` | De briefing en het adres |

Daarnaast kent het contentplan vier **paginatypes** (`planned_pages.page_type`: `categorie`,
`dienst`, `informatief`, `overig`, migratie 0049). Dat is een tweede woordenlijst over hetzelfde
onderwerp, met twee vertalingen ertussen: `pageTypeVoor()` in `lib/plan-backlog-data.ts` en
`contentTypeFor()` in `lib/plan-writing.ts`.

De route van een kans naar een tekst loopt zo:

```
meting (30 vragen)
  → rapport: per aanbeveling een `type` uit de vier          reports.recommendations_json
  → voorraad: vertaald naar page_type                        pageTypeVoor()
  → contentplan: maand, datum, goedkeuring
  → schrijftaak: terugvertaald naar ContentType              contentTypeFor()
  → schrijven, keuren, publiceren
```

---

## 2. Drie dingen die vandaag misgaan

### 2.1 Niemand kiest het type, ook het model niet bewust

`REPORT_SYSTEM` in `lib/pipeline/report.ts` is ruim tweeduizend tekens lang en geeft instructies
over bewijs, over de keuze tussen nieuw en verbeteren, over het letterlijk overnemen van adressen,
over het aantal aanbevelingen en over afgewezen kansen. Over `type` staat er **geen enkel woord**.
Het schema (`lib/schemas/report.ts`) staat vier waarden toe en het model kiest er maar een.

Wat dat in de praktijk oplevert, over 37 aanbevelingen:

| type | aantal | aandeel |
|---|---|---|
| `landing` | 21 | 57% |
| `article` | 12 | 32% |
| `faq` | 3 | 8% |
| `comparison` | 1 | 3% |

Bij de 25 geschreven teksten is de verdeling vrijwel gelijk (14 landing, 8 article, 2 faq,
1 comparison). Het type is dus geen keuze maar een bijproduct, terwijl het wel de doellengte, de
inhoudsopgave en de publicatiedrempel bepaalt. Conventie 1 zegt dat elke promptinstructie een
deterministisch vangnet krijgt; hier is er niet eens een instructie.

### 2.2 Twee van de vier types overleven de route naar de schrijver niet

`pageTypeVoor()` en `contentTypeFor()` zijn geen elkaars omgekeerde:

| rapport zegt | voorraad maakt er van | schrijver krijgt |
|---|---|---|
| `landing` | `dienst` | `landing` ✅ |
| `article` | `informatief` | `article` ✅ |
| `faq` | `informatief` | **`article`** ❌ |
| `comparison` | `categorie` | **`landing`** ❌ |

Een aanbeveling voor een FAQ wordt dus geschreven als een artikel van 700 tot 1200 woorden in plaats
van een FAQ van 250 tot 500, met de vraag-antwoordparen op de verkeerde plek en langs het verkeerde
kwaliteitsprofiel. Op productie raakt dat 4 van de 37 aanbevelingen, 11 procent.

Dat geldt alleen voor de route via het contentplan (`app/api/cron/plan/route.ts`), en dat is sinds
migratie 0065 de normale route. De directe knop op het analysescherm
(`app/api/analyses/[id]/generate/route.ts`) geeft het type wel gewoon door.

De reparatie is klein: diezelfde cron leest via `targetsFromSourceRef()` al de exacte aanbeveling
terug uit `reports.recommendations_json` om de doelvragen op te halen. Het `type` staat in dezelfde
rij en wordt alleen niet gelezen.

### 2.3 Het type is nergens zichtbaar en nergens te corrigeren

`page_type` komt in geen enkel scherm voor als kolom of keuze. Het wordt alleen opgeteld: de
contentmix op het merkoverzicht en de kliktabel onder Zoekverkeer. In de kansenlijst en op de
kaarten van de voorraad staat het niet. Wie ziet dat een kans als verkeerd type is weggezet, kan er
niets aan doen.

---

## 3. Wat aan het idee klopt

**De diagnose klopt.** Er zit een stuurknop in de keten die niemand vasthoudt, en die knop bepaalt
hoe de tekst eruitziet. De wens wijst precies dat gat aan.

**De plek klopt half.** Een keuze bij het aanmaken van het cluster heeft een echte werking, want het
cluster bepaalt de dertig vragen die gesteld worden. Er is al een precedent: de verdeling over de
funnelfasen (`prompts_orientatie`, `prompts_overweging`, `prompts_beslissing`, migratie 0054) is een
gestructureerde clusterinstelling die alleen aanpasbaar is zolang de vragen nog niet zijn opgesteld
(`app/api/analyses/[id]/route.ts`). Een contenttype hoort in precies datzelfde vak.

**Er is al een vrij tekstveld dat dit half doet.** `analyses.content_brief` ("Wat voor content wil
je?") gaat mee naar de vraaggeneratie (`prompts.ts`), het onderzoek (`topic-research.ts`), het
rapport (`report.ts`) en de schrijver (`content.ts`). Alle 6 clusters op productie hebben er een,
maar geen enkele is door een mens getypt: `buildTopicBrief()` vult hem automatisch met de drie
gespreksvelden van het onderwerp. Het veld dat de klant zou kunnen gebruiken om te sturen, is in de
praktijk al bezet door gegenereerde tekst. Een gestructureerde keuze ernaast is dus geen tweede
manier om hetzelfde te doen.

---

## 4. Wat aan het idee niet klopt

### 4.1 Productpagina's bestaan niet voor deze app, met opzet

De crawler sluit ze uit. `isProductUrl()` in `lib/crawl-urls.ts` gooit elke URL met `/product/` of
`/products/` weg en `isProductSitemap()` slaat een hele productsitemap over. `looksLikeProductPage()`
in `inventory-quality.ts` merkt een inventaris die voor meer dan 70 procent uit productpagina's
bestaat aan als vervuild, met de reden erbij: dan zie je het assortiment en niet de inhoud waarop
een advies hoort te rusten. `docs/tasks/ontwikkelplan-visie.md` zegt het ook over de publicatiekant:
ORBIT ENGINE schrijft geen productpagina's.

Dat is geen omissie maar een grens. Een productpagina als contenttype aanbieden betekent de
inventaris, de crawl, de nieuw-of-verbeteren-beslissing en de publicatiedoelen allemaal openzetten
voor een soort pagina die het product bewust niet bedient. Dat is een eigen project, geen veld op
een formulier.

**Productcategorie ligt wel binnen de grens**, en met opzet: het commentaar bij `isProductUrl()`
zegt dat `collections` en `product-category` juist bewaard blijven omdat ze waardevol zijn. Dat
type kan dus meteen mee.

### 4.2 Een nieuwsartikel past niet op de meetlat van de app

Alles in de keten hangt aan een gemeten gemiste vraag: de aanbeveling wijst met V-codes aan welke
vragen de pagina moet gaan winnen (`resolveTargets()`), de effectmeting hermeet precies die vragen
(`planImpactWaves()`), en de kwaliteitspoort rekent de dekking na tegen het contract. Een nieuwsitem
heeft geen gemiste vraag om te winnen en geen stabiel effect om te meten: over drie maanden is het
geen nieuws meer, maar de pagina telt dan nog steeds mee in de cijfers.

Een blogpost daarentegen is geen nieuw type maar een andere naam voor wat `article` al is. Daar is
hooguit een woordkeuze te winnen, geen functionaliteit.

### 4.3 "Uitsluitend vanuit deze gedachte" is het risico in dit idee

Het cluster is de meeteenheid, niet de contenteenheid. Uit dertig gemeten vragen komen in de
praktijk drie tot tien kansen, en die zijn van gemengde vorm omdat de vragen van gemengde vorm zijn.
Wie bij het aanmaken kiest voor "blogpost" en de app laat filteren, gooit gemeten vraag weg: de
vragen waarvoor een dienstpagina het antwoord is, verdwijnen dan zonder dat iemand ze ziet. Dat is
in strijd met de reden dat `declinedGaps` bestaat (werkpakket C, migratie 0078): elke afwijzing moet
navolgbaar zijn.

Het onderscheid dat dit oplost:

- **Sturen** betekent dat het type bepaalt in welke vorm een kans een pagina wordt, en dat de
  vragen en de aanbevelingen die kant op neigen. Niets raakt kwijt.
- **Filteren** betekent dat kansen van een andere vorm niet geschreven worden. Dat mag, maar dan
  moeten ze zichtbaar blijven staan, met de reden erbij, precies zoals afgewezen kansen nu.

Voorstel: sturen als gedrag, filteren alleen als zichtbare keuze, nooit stil.

---

## 5. Voorstel in vier stappen

**Stap 1. Repareer de vertaling (klein, geen nieuw begrip).**
`app/api/cron/plan/route.ts` leest het `type` uit de aanbeveling die het toch al ophaalt, en gebruikt
`contentTypeFor(page_type)` alleen nog als terugval voor een pagina zonder bron. Daarmee komen FAQ en
vergelijking weer heel bij de schrijver aan. Test in `test-unit.ts` op de vier types heen en terug.

**Stap 2. Laat het rapport het type bewust kiezen.**
Een blok in `REPORT_SYSTEM` dat per type zegt wanneer je het kiest, plus het vangnet ernaast: is het
gekozen type niet te rijmen met de doelvragen (een FAQ zonder vraagvorm, een vergelijking zonder
alternatieven), dan corrigeert de code. Meetbaar: de verdeling over de vier types vóór en ná, over
dezelfde rapporten.

**Stap 3. Een contentfocus op het cluster, met "open" als standaard.**
Een kolom `content_focus` op `analyses`, leeg toegestaan, met een vocabulaire dat past bij wat de app
werkelijk kan: dienstpagina, productcategorie, artikel of blog, veelgestelde vragen, vergelijking, en
leeg als "laat ORBIT ENGINE kiezen". Leeg is de standaard en het huidige gedrag.

De focus werkt op drie plekken, in deze volgorde van zekerheid:

1. **De vragen** (`prompts.ts`): dezelfde regel als de funnelverdeling, alleen aanpasbaar zolang de
   vragen nog niet zijn opgesteld. Een cluster met focus op productcategorie stelt koopklare vragen,
   een cluster met focus op artikel oriëntatievragen.
2. **De aanbevelingen** (`report.ts`): als voorkeur, niet als verbod. Kansen die beter een andere
   vorm hebben, komen er gewoon uit, met hun eigen type.
3. **De schrijver**: ongewijzigd, want die leest het type al.

**Stap 4. Maak het type zichtbaar en corrigeerbaar op de kans.**
Een regel op de kaart in de voorraad en de kansenlijst, met een keuzemenu. De kolom bestaat al, de
schermen lezen hem alleen niet. Dit is de goedkoopste van de vier en waarschijnlijk de nuttigste:
de consultant die naar de kans kijkt, weet beter dan het model of dit een dienstpagina of een
artikel moet worden.

De volgorde is niet willekeurig. Stap 1 en 4 maken een bestaande functie af en zijn los te
verifiëren. Stap 2 en 3 voegen sturing toe, en die is pas te beoordelen als het type niet meer
onderweg kwijtraakt.

---

## 6. Wat open staat

1. **Filteren of alleen sturen.** Dit document kiest voor sturen. Wordt het toch filteren, dan hoort
   er een tweede lijst bij ("3 kansen vallen buiten je gekozen contenttype"), in dezelfde vorm als
   de afgewezen kansen.
2. **Productpagina's.** Buiten scope zolang de crawl ze uitsluit. Wie ze wil, moet eerst die grens
   willen verleggen, inclusief wat dat doet met de inventariskwaliteit bij een webshop.
3. **Een vijfde type, lokale landingspagina.** `docs/tasks/contentkwaliteit-framework.md` houdt dit
   al vast: de pagina's van Gasservice Brabant voor Tilburg, Oss en Eindhoven zijn feitelijk lokale
   landingspagina's en worden als gewone landingspagina beoordeeld. Dat wachtte op het moment dat
   het rapport een type kan afgeven. Stap 2 is precies dat moment.

---

## 7. Twee knoppen achteraf: opnieuw berekenen of extra ophalen

Vervolgvraag van 19 september: kan er een knop komen die de kansen opnieuw berekent met een
contenttype als insteek, of een knop die er los extra contentideeën bij haalt binnen één gekozen
type?

### 7.1 Opnieuw berekenen kan niet, en dat is geen toeval

Het rapport is de bron van de voorraad, en die bron is met opzet onherhaalbaar per periode:

- **De database staat het niet toe.** `reports` heeft een unieke index op `(analysis_id, week_no)`
  (migratie 0021). Eén rapport per cluster per meetperiode, punt.
- **De code stopt er zelf voor.** `generateReport()` telt eerst of er al een rapport voor deze
  periode is en zet dan de status op gereed zonder één aanroep te doen (conventie 9). De knop
  "rapport opnieuw" op het scherm is een retry voor een mislukt rapport, geen herberekening.
- **Overschrijven zou de audittrail slopen.** Elke aanroep bewaart zijn volledige ruwe JSON naast de
  uitgesplitste kolommen (conventie 8). Het rapport van vandaag is het bewijs onder elke pagina die
  eruit voortkwam.
- **En de voorraad zou dubbel lopen.** Een kaart hangt aan `source_ref`, opgebouwd als
  `<rapport-id>#<volgnummer>`, en `syncBacklog()` verwijdert nooit iets. Een tweede rapport levert
  dus nieuwe sleutels voor dezelfde onderwerpen: alle kansen komen er een tweede keer bij te staan,
  naast de kaarten die al ingepland of geschreven zijn. Op productie heeft geen enkel cluster ooit
  twee rapporten gehad, dus dit pad is nooit gelopen.

Een herberekening zou dus vier ontwerpbesluiten tegelijk moeten terugdraaien. De volgende
meetperiode levert wél een nieuw rapport, en dat is de plek waar een gewijzigde insteek vanzelf
landt.

### 7.2 Extra ophalen kan wel, en er is een sjabloon voor

`lib/pipeline/propose-more-topics.ts` is precies deze knop, maar dan een laag hoger: "Stel nieuwe
clusters voor". De eigenschappen die daar zijn uitgedacht, gelden hier een op een:

- draait op een klik, niet automatisch;
- is ALTIJD aanvullend, verwijdert en vervangt nooit iets;
- gebruikt meer bewijs dan de automatische ronde (de gemeten gaps, de afwijzingsredenen);
- wijst zichzelf af zodra er niets nieuws is, vóór er een dure aanroep gedaan wordt
  (`topic-round-diff.ts`);
- legt elke ronde vast, ook een ronde die niets opleverde.

Een tweede kansenronde erft dat allemaal, plus drie eigen eisen:

1. **Een eigen jobtype** (conventie 7), geen uitbreiding van `generate_report`.
2. **Een eigen sleutelruimte** voor `source_ref`, bijvoorbeeld `ronde:<ronde-id>#<volgnummer>`. De
   ruimte `<rapport-id>#<volgnummer>` is van het rapport en moet dat blijven, anders wijst
   `targetsFromSourceRef()` naar een aanbeveling die er niet is.
3. **Dezelfde vier eisen als het rapport.** Een kans moet nog steeds een gemeten gemis met bewijs
   hebben, iets waars dat de klant erover kan zeggen, geen bestaande pagina die het al dekt en geen
   overlap met een bestaande kans, inclusief de kansen die al in de voorraad staan. Zonder die
   grens levert de ronde onderwerpen zonder meetbare vraag, en dat is precies de algemene tekst
   waar niemand voor betaalt (`lib/plan-writing.ts`).

### 7.3 Is er genoeg over om op te halen? Ja, ruim

Nagerekend op 19 september over de laatste periodieke meting van alle zes de clusters:

| | aantal |
|---|---|
| gemeten vragen | 275 |
| vragen waarin het eigen merk niet genoemd werd | 242 (88%) |
| vragen die door een aanbeveling gedekt zijn | 74 |
| gemiste vragen waar niets mee gebeurd is | 168 |
| daarvan met een opgeschreven reden in `declined_json` | 18 |

Twee derde van de gemeten gemiste vraag is dus nooit een kans geworden, en bij 150 daarvan staat
nergens waarom. Er is materiaal genoeg voor een tweede ronde.

### 7.4 Maar de muur is de feitenkaart, niet het contenttype

Van de 18 afwijzingen die wél zijn opgeschreven, gaan er 11 over ontbrekende feiten ("geen vestiging
in Nieuwegein aangeleverd", "niet bevestigd dat dit wordt aangeboden") en 5 over overlap met een
andere aanbeveling. Geen enkele gaat over de vorm van de pagina.

Dat voorspelt wat een tweede ronde binnen één contenttype oplevert: het type verandert niets aan de
reden dat deze kansen sneuvelden. Twee gevolgen voor het ontwerp:

- **De ronde moet nul mogen teruggeven**, met de reden erbij, precies zoals de clusterronde dat doet.
  Een knop die altijd iets oplevert, levert verzonnen kansen op.
- **Eerst gratis kijken, dan pas betalen.** De 18 afgewezen kansen staan al in de database en worden
  al gelezen (`loadDeclinedOpportunities()`). Filteren op het gekozen type en tonen kost niets. Pas
  als daar niets bruikbaars tussen zit, is een AI-ronde te rechtvaardigen.
- **De echte hefboom ligt bij de feitenvragen.** 11 van de 18 afwijzingen zijn op te lossen met een
  antwoord van de ondernemer, niet met een extra aanroep. `fact_requests` bestaat daar al voor.
