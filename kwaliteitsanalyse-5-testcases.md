# Kwaliteitsanalyse — 5 praktijkanalyses tegen de klantdoelen

> **Wat dit document is.** Een grondige doorlichting van vijf echte analyses die op 30 juli 2026
> volledig door de productie-pijplijn zijn gehaald (Coolblue, Bol, HEMA, Van der Valk,
> Fysi-Unique). Elke bevinding hieronder is nagerekend tegen de opgeslagen data in Supabase —
> waar een cijfer staat, is dat een query-uitkomst, geen indruk. De query's staan er telkens
> beknopt bij zodat iedereen ze zelf kan herhalen.
>
> **Waartegen we toetsen** — de drie klantdoelen:
> 1. **Invoer** — de klant vult zijn gegevens in en krijgt een meetplan dat klopt.
> 2. **Inzicht** — de klant ziet scherp hoe hij én zijn concurrenten presteren in AI-antwoorden:
>    waar hij wint, waar hij steken laat vallen, waar kansen liggen.
> 3. **Contentgrondstof** — die informatie is goed genoeg om er ijzersterke, op de analyse
>    aansluitende content mee te schrijven die de klant aantoonbaar zichtbaarder maakt.
>
> **Peildatum:** 30 juli 2026 · branch `main` · Supabase-project `GEO` (`kosauqzjbpweluiqgmwv`).
> Fase C (contentgeneratie) is in deze ronde bewust niet gedraaid; waar dit document daarover
> uitspraken doet, gaat het over de *input* die Fase C zou krijgen, niet over geproduceerde content.

---

## 0. De testset

| Bedrijf | Onderwerp | Waarom deze case |
|---|---|---|
| Coolblue | wasmachine kopen | Grote webshop, brede categorie, sterke merkbekendheid |
| Bol | de beste laptop voor studenten | Platform/marktplaats — stresstest voor "wie is concurrent?" |
| HEMA | verjaardagscadeau onder de 20 euro | Vaag, niet-transactioneel onderwerp zonder duidelijke productpagina |
| Van der Valk | vergaderlocatie boeken | B2B-intentie binnen een consumentenmerk |
| Fysi-Unique | hardloopblessure behandelen | Lokale mkb'er (fysiopraktijk Amersfoort), kleine site |

**Uitkomst technisch:** alle 5 doorliepen de volledige keten (profiel → onderzoek → prompts →
meting → aggregatie → rapport) met **nul definitief mislukte taken**. 141 metingen, 236
AI-aanroepen. De machinerie is stabiel; de bevindingen hieronder gaan vrijwel allemaal over
*inhoudelijke* kwaliteit, niet over storingen.

**Kosten:** $4,17 totaal = **$0,83 per analyse**, waarvan **88% ($3,65) in de simulatiecall**
(halte 3a, `web_search`). Dat is ruim 2× de $0,356 uit `abcplan.md` §10 — verklaarbaar doordat
3a inmiddels op `gpt-4.1-mini` draait in plaats van nano.

| Halte | Calls | Kosten | Aandeel |
|---|---|---|---|
| `measure_simulate` (3a) | 141 | $3,654 | 88% |
| `topic_research` | 5 | $0,137 | 3% |
| `profile_research` | 5 | $0,132 | 3% |
| `source_presence` (off-site) | 5 | $0,129 | 3% |
| `prompts` | 17 | $0,031 | <1% |
| `measure_mention` (3b) | 141 | $0,023 | <1% |
| overig (classificatie, gap, rapport, volume) | 27 | $0,058 | 1% |

---

## 1. Doel 1 — Invoer & meetplan

### 1.1 De meetbasis krimpt stil, en scheef

Coolblue kreeg **22 prompts in plaats van 30**. De verdeling laat zien waar het misgaat:

| Bedrijf | Oriëntatie | Overweging | Beslissing | Totaal |
|---|---|---|---|---|
| Coolblue | **2** | 10 | 10 | **22** |
| Bol | 10 | **9** | 10 | 29 |
| Fysi-Unique / HEMA / Van der Valk | 10 | 10 | 10 | 30 |

Acht van de tien oriëntatievragen van Coolblue sneuvelden op het merkneutraliteitsfilter
(`containsForbidden`, `lib/pipeline/prompts.ts`). De verboden tokens komen uit de
concurrentenlijst van het profiel — voor Coolblue: Bol.com, MediaMarkt, Wehkamp, Amazon. Juist
in de oriëntatiefase ("waar koop ik het beste een wasmachine") is de neiging van het model om
winkels te noemen het grootst, dus dáár bijt de regel het hardst. Na twee aanvulrondes geeft de
code het op met alleen een `console.warn`.

**Waarom dit ertoe doet:** de score van Coolblue (36) rust op een meetbasis waarin de bovenkant
van de funnel vrijwel ontbreekt — 2 van de 22 vragen. Niets in de UI, het rapport of de mail
vertelt de klant dat. De trechter die het product belooft te meten, is voor deze klant geen
trechter meer.

### 1.2 Volumekalibratie werkt, maar niet overal

Vier van de vijf analyses kregen alle drie de volumebanden (hoog/midden/laag). **Van der Valk
kreeg geen enkele "hoog"** — alle 30 vragen zijn als laag/midden geschat, met een maximum van
50 op de 0-100-schaal. De kalibratie is bedoeld als *relatieve* rangschikking binnen één
analyse ("gebruik de VOLLE schaal"), maar het model schaalde hier absoluut. Gevolg: Van der
Valks gewogen score (8) is structureel gedrukt zonder dat daar een inhoudelijke reden voor is.

### 1.3 Het cluster-veld doet niets

| Bedrijf | Prompts | Unieke clusters |
|---|---|---|
| Bol | 29 | 29 |
| Coolblue | 22 | 22 |
| Fysi-Unique | 30 | 30 |
| HEMA | 30 | 29 |
| Van der Valk | 30 | 30 |

Vrijwel **één cluster per prompt**. Het veld is bedoeld om vragen en content te groeperen
(`abcplan.md` §12.30), maar groepeert niets. Erger: sommige clusterwaarden zijn vervuild met
losse tekst uit het model, bijvoorbeeld `"aankoopchecklist wasmachines, volumeEstimate=30}]}"`
en `"batterijduur laptops student 2.0: 75"` — het model schrijft zijn eigen redeneerresten in
het veld. Daarmee is elke latere groepering op cluster onbruikbaar.

### 1.4 Profielonderzoek: wisselvallig, maar de meting corrigeert

Fysi-Unique's profiel-concurrenten zijn **generieke omschrijvingen in plaats van bedrijven**:
"Fysiotherapiepraktijk Amersfoort", "Sportfysiotherapie Amersfoort", "Bekkenfysiotherapie
Amersfoort". Dat zijn geen concurrenten, dat zijn zoekwoorden. De *meting* vond wél de echte
praktijken (Fysio Atelier Amersfoort, Het Centrum – Vondelplein, FysioNieuwland). Het
ontdek-mechanisme uit migratie 0026 vangt de zwakte van het profielonderzoek dus op — dat werkt
zoals bedoeld.

Twee losse rariteiten: Bol's concurrentenlijst bevat **"Bol.com Marketplace"** (het bedrijf als
concurrent van zichzelf), en HEMA's lijst (Blokker, Action, H&M, Zara, Primark) is
bedrijfsbreed en voor "verjaardagscadeau onder 20 euro" maar half relevant.

**Let op de tweede functie van deze lijst:** hij bepaalt óók welke woorden uit de prompts
geweerd worden (§1.1). Een generieke "concurrent" als *"Sportfysiotherapie Amersfoort"* is
daarmee een verboden token — dat het hier goed ging, komt doordat de filter op hele
woordgroepen matcht en niet op losse woorden.

---

## 2. Doel 2 — Inzicht in eigen prestatie en die van concurrenten

### 2.1 De belangrijkste bevinding: merkloze vragen vervuilen de score

Bij **13 tot 30% van alle metingen noemt het AI-antwoord geen enkel bedrijf.** Het zijn
"hoe kies ik"-antwoorden: stappenplannen, criteria, tips. In de huidige berekening tellen die
volledig mee als *"eigen merk niet genoemd"* — en dus als gemiste kans.

| Bedrijf | Metingen | Antwoord zonder énig merk | Score nu | Score alleen over merkvragen |
|---|---|---|---|---|
| Coolblue | 22 | 3 (14%) | 36 | 32 |
| Bol | 29 | 7 (24%) | 17 | 9 |
| Fysi-Unique | 30 | 9 (30%) | 10 | 14 |
| HEMA | 30 | 4 (13%) | 10 | 4 |
| Van der Valk | 30 | 9 (30%) | 7 | 5 |

Per funnelfase: Overweging is het ergst (31% merkloos), Beslissing 20%, Oriëntatie 17%.

Een concreet voorbeeld — Van der Valk, vraag *"Hoe kan ik een geschikte vergaderlocatie vinden
die ook catering aanbiedt?"*. Het volledige AI-antwoord (1.346 tekens) noemt geen enkele
vergaderlocatie, alleen zoekplatforms (Meetingselect, Eventbrite, Venuefinder). Twintig van de
dertig Van der Valk-vragen zijn van dit type: *"Hoe belangrijk is de bereikbaarheid van een
vergaderlocatie?"*, *"Welke faciliteiten zijn essentieel?"*, *"Wat zijn tips om een inspirerende
locatie te kiezen?"* — vragen waarop geen enkel merk het antwoord kán zijn.

**Waarom dit het hart van het product raakt:** de score meet nu twee onvergelijkbare dingen door
elkaar heen. (a) *"Er worden merken genoemd en jij zit er niet bij"* — een echte gemiste kans.
(b) *"Er wordt niemand genoemd"* — geen kans, maar wel geteld als misser. De klant kan uit één
getal niet afleiden welk deel van zijn "onzichtbaarheid" hij überhaupt kan beïnvloeden.

### 2.2 Het rapport verzint bewijs

Van der Valk, aanbeveling met prioriteit 1, letterlijk uit `reports.recommendations_json`:

> *"Deze vraag (V1) is zeer populair en koopgericht. **Concurrenten zoals Het Oude Raadhuis
> Hoofddorp en Dotslash Utrecht scoren hier wel**, Van der Valk niet."*

De bijbehorende meting (`tracking_runs.id = ccc43406-…`) is nagetrokken. Het antwoord op *"Wat
is de beste manier om een vergaderlocatie te boeken die flexibel is qua opstelling?"* bevat
**precies één mention-rij: `Van der Valk: false`**. Geen Oude Raadhuis, geen Dotslash — het
antwoord noemt alleen Meetingselect, Eventective, Booking.com en Airbnb.

De bewering is dus onjuist. De oorzaak is aanwijsbaar in `lib/pipeline/report.ts`: het
gemiste-vragenblok (`buildMissedBlock`) geeft het model per vraag alleen code, gewicht,
categorie, cluster en tekst — **géén `runId`**. De concurrentiedata eronder geeft wél
`winning_run_ids` per concurrent. Het model kan die twee dus niet aan elkaar koppelen, en vult
het gat met een plausibele gok.

Dit is de ernstigste bevinding in dit document: de klant krijgt onderbouwing voorgeschoteld die
verifieerbaar niet klopt, op de plek waar het product zijn geloofwaardigheid moet verdienen.

### 2.3 Sentiment levert nul informatie op

| Bedrijf | Voorkomende sentimenten |
|---|---|
| Coolblue, Bol, HEMA, Van der Valk | **alleen `neutral`** |
| Fysi-Unique | `neutral`, `positive` |

Over 650 mention-rijen komt **`negative` geen enkele keer voor**, en `positive` slechts bij één
analyse. Dat is ook logisch: AI-assistenten schrijven zelden negatief over een bedrijf in een
adviesantwoord. De feature staat prominent in de README ("Sentiment & bronnen: positief/
neutraal/negatief per vermelding") maar voegt in de praktijk niets toe aan het inzicht — en
kost wel schema-ruimte en modelaandacht in elke 3b-call.

### 2.4 Positie wordt geregistreerd maar nergens gebruikt

Alle 650 mention-rijen hebben een `position` ingevuld (100% dekking). Die waarde komt in geen
enkele score, geen rapport en geen aanbeveling terug. Terwijl "wij worden als 5e genoemd, de
concurrent als 1e" precies het soort inzicht is waar doel 2 om vraagt — genoemd worden ná drie
concurrenten is iets heel anders dan als eerste genoemd worden.

### 2.5 Geciteerd worden telt niet mee als zichtbaarheid

| Bedrijf | Genoemd in tekst | Eigen site als bron geciteerd | Geciteerd maar niet als vermelding geteld |
|---|---|---|---|
| Coolblue | 8 | 4 | 1 |
| Fysi-Unique | 3 | 4 | 1 |
| Bol / HEMA / Van der Valk | 5 / 3 / 2 | 0 | 0 |

Fysi-Unique wordt **vaker als bron geciteerd (4×) dan als merk genoemd (3×)**. Voor GEO is
geciteerd worden minstens zo waardevol als genoemd worden — het is letterlijk de link waarop de
gebruiker doorklikt. De huidige score negeert dat volledig.

### 2.6 Wat de klant over concurrenten te zien krijgt is dun

`competitor_breakdown` bevat per concurrent: aantal vermeldingen, verdeling per funnelfase, top
5 geciteerde bronnen, en winnende/verliezende run-ID's. Wat er **niet** in zit is precies wat
doel 2 vraagt: *waarom* wint die concurrent. Er is geen veld voor "op welke eigenschap wordt hij
genoemd" (prijs? locatie? specialisme? beschikbaarheid?), geen positievergelijking, en geen
onderscheid tussen "1× genoemd in een lange lijst" en "als eerste aanbevolen".

Daar komt de staartverdeling bovenop. Bij HEMA staan **34 "merken" in de vergelijkingsbasis**,
waarvan 24 met precies één vermelding — van Kruidvat en IKEA tot `sannessieraden.com`,
`bulbby.com` en `cadeauxfolies.fr`. Dat is geen concurrentiebeeld, dat is een lijst toevallige
vermeldingen. Voor de klant is "je hebt 34 concurrenten" een misleidende conclusie.

### 2.7 Entiteitclassificatie: Bol legt de zwakte bloot

Bol's top-"concurrenten": **Lenovo (7), Dell (7), HP (6), Apple (6), ASUS (5)**. Dat zijn
fabrikanten wier laptops bol.com verkoopt — geen concurrenten. Het is bovendien intern
tegenstrijdig: `Apple` staat als *concurrent*, terwijl `Apple MacBook Air (M1 of M2)` in
dezelfde tabel als *eigen_product* staat met als reden *"Productcategorie die Bol verkoopt"*.

Daarnaast worden productvarianten niet samengevoegd: `Dell` / `Dell XPS` / `Dell XPS 13 2-in-1`
zijn drie entiteiten, net als `Lenovo` / `Lenovo ThinkPad` / `Lenovo Yoga-serie`. De
normalisatie in `lib/entities/normalize.ts` dedupliceert schrijfwijzen ("coolblue.nl" →
"Coolblue") maar niet merk-plus-productlijn.

Gevolg: Bol's share of voice van 8% heeft een noemer van 30 "merken" die grotendeels geen
concurrent zijn. Dat cijfer is niet te vertrouwen. (Het `niet_relevant`-vangnet werkt overigens
prima — "muismuis", "browsertabs" en "notities maken" zijn correct weggefilterd.)

### 2.8 Gap-analyse en rapport lopen uiteen

| Bedrijf | Gaps (B1) | Aanbevelingen (B2) |
|---|---|---|
| HEMA | 1 | 7 |
| Van der Valk | 2 | 7 |
| Coolblue | 3 | 6 |
| Bol | 4 | 7 |
| Fysi-Unique | 5 | 7 |

Consistent meer aanbevelingen dan gaps. B2 vaart vrijwel volledig op de gemiste-vragenlijst en
nauwelijks op de gap-analyse van B1 — die kost $0,003 per analyse en levert output waarvan het
grootste deel ongebruikt blijft.

---

## 3. Doel 3 — Is dit goede grondstof voor content?

### 3.1 Bronnen: te dun, en van het verkeerde soort

Slechts **17 tot 30% van de vermeldingen heeft een geciteerde bron**:

| Bedrijf | Mentions | Met bron | Dekking |
|---|---|---|---|
| Coolblue | 78 | 35 | 45% |
| Fysi-Unique | 128 | 40 | 31% |
| HEMA | 223 | 67 | 30% |
| Van der Valk | 82 | 18 | 22% |
| Bol | 139 | 23 | 17% |

Belangrijker nog is *wat voor* bronnen het zijn. Fysi-Unique's meest geciteerde bronnen:

```
https://www.fysioatelieramersfoort.nl/?utm_source=openai      8×
https://www.hetcentrumvondelplein.nl/?utm_source=openai       5×
https://www.fysio-groen.nl/?utm_source=openai                 4×
http://www.fysi-unique.nl/?utm_source=openai                  4×   ← de klant zelf
https://www.fysiotherapiedeessen.nl/hardloopblessure/         1×   ← inhoudelijke pagina
```

Op twee na zijn het **homepages**, geen inhoudelijke pagina's. Dat is een fundamenteel signaal
voor de contentstrategie: bij lokale zoekvragen citeert de AI het bedrijf zélf (de homepage als
entiteit), niet een diepe blogpagina over hardloopblessures. De aanbeveling *"maak een
uitgebreide pagina over behandelopties"* gaat daar dus niet automatisch aan helpen — het gaat
eerder om herkend worden als entiteit in de regio.

Het product meet dit onderscheid nu niet, en het rapport redeneert er niet mee. (De
`utm_source=openai`-parameter bevestigt overigens dat `web_search` echt gedraaid heeft — de
meting is in dat opzicht valide.)

### 3.2 Content wordt voorgesteld voor vragen die niemand kan winnen

De gewichtsprioritering vangt dit grotendeels op — 0 tot 20% van de doelvragen achter een
aanbeveling is "kansloos" (een vraag waar geen enkel merk in het antwoord voorkwam):

| Bedrijf | Doelvragen | Waarvan zonder énig merk in het antwoord |
|---|---|---|
| Coolblue / Bol | 7 / 9 | 0 |
| HEMA | 8 | 1 (13%) |
| Van der Valk | 7 | 1 (14%) |
| Fysi-Unique | 10 | 2 (20%) |

Maar het gaat wél mis op de plek waar het het meest kost: **Van der Valks aanbeveling met
prioriteit 1** is gebouwd op precies zo'n vraag (zie §2.2). De duurste contentcall van het
product (`gpt-4.1`) zou dus als eerste een pagina schrijven voor een vraag waarop AI-assistenten
structureel geen enkel bedrijf noemen.

### 3.3 Dubbele content in de maak

**Fysi-Unique krijgt vier aanbevelingen voor een nieuwe pagina, alle vier met
`existingUrl: /fysiotherapie-bij-hardloopklachten-in-amersfoort/`.** Het model wijst zelf een
relevante bestaande pagina aan, kiest tóch `action: "nieuw"`, en `lib/pipeline/content.ts`
negeert die URL (de bestaande tekst wordt alleen geladen bij `action === "verbeteren"`). Voor
een praktijk met 30 pagina's betekent dat vier nieuwe pagina's naast een pagina die al over
hetzelfde onderwerp gaat — kannibalisatie op de eigen site. Coolblue heeft hetzelfde patroon 2×.

Daarbij worden drie verschillende conventies door elkaar gebruikt voor "geen bestaande pagina":

| Vorm | Waar | Matcht met `profile_pages`? |
|---|---|---|
| `""` (lege string) | HEMA 6×, Bol 6× | n.v.t. |
| `"/"` | Van der Valk 6× | nee |
| relatief pad (`/advies/…`) | Coolblue 4×, Fysi-Unique 5× | **nee** |
| absolute URL | alle 5 `verbeteren`-aanbevelingen | **ja, 5 van 5** |

De `verbeteren`-flow werkt dus correct — élke `verbeteren`-aanbeveling had een absolute URL die
netjes matchte met de inventaris. Het probleem zit uitsluitend in de `nieuw`+URL-combinatie.

### 3.4 De content-inventaris bepaalt stil de rapportkwaliteit

- **Bol: 1 pagina in de inventaris** (alleen `https://bol.com`). De crawler komt er niet in.
  Gevolg: 6 van de 7 aanbevelingen zijn "nieuw" zonder onderbouwing, en de enige
  `verbeteren`-aanbeveling luidt *"voeg een sectie toe op de homepage"* — logisch, want dat is
  de enige pagina die de app kent.
- **HEMA: 40 pagina's, maar het zijn productpagina's.** Voorbeeld uit de inventaris:
  `/dames/lingerie/zwarte-bh-met-bijpassende-slip-200302.html`. De productpagina-uitsluiting uit
  `abcplan.md` §12.23 is gebouwd op Shopify- en Yoast-patronen en herkent HEMA's URL-structuur
  niet. Gevolg: de enige `verbeteren`-aanbeveling is *"promoot de taartversiering-dino-pagina
  als cadeau-optie"* — een advies dat rechtstreeks voortkomt uit een vervuilde inventaris.

In beide gevallen degradeert de output zonder één foutmelding. Voor Fase C is dit direct
schadelijk: de "verbeteren"-route heeft dan geen bruikbare basistekst.

### 3.5 Wat er wél goed staat voor Fase C

- **`proof_points`: 4–5 per profiel, `style_samples`: 3 per profiel** — bij alle vijf gevuld.
  De schrijf-grondslag is er dus.
- **17 feitenvragen** aangemaakt over de vijf analyses; die zijn precies bedoeld om de dunne
  feitenbasis aan te vullen (`optimalisatie.md` 4.6).
- **Doelvragen-koppeling werkt**: elke aanbeveling draagt echte `promptId`/`runId`-verwijzingen,
  waardoor effectmeting later mogelijk is.
- **Technische audit: 5 audits, 0 blockers** — geen van de vijf sites weert AI-crawlers, dus de
  contentpoort staat terecht open.

### 3.6 Off-site levert niets op — en zou het verkeerde opleveren

`source_landscape` bevat 25 rijen, maar `offsite_tasks` is **leeg (0 rijen)**. Terwijl de
drempel (`prompt_count >= 3` én `own_present = false`) bij minstens twee domeinen gehaald wordt:
`fysioatelieramersfoort.nl` (8 vragen, niet aanwezig) en `hetcentrumvondelplein.nl` (6, niet
aanwezig). Er hadden ook Wikidata-/Wikipedia-taken moeten ontstaan. Er is dus een defect in
`createTasks` (`lib/offsite/scan.ts`).

Maar als het wél had gewerkt, was de uitkomst onbruikbaar geweest: de taak zou luiden *"Zorg dat
Fysi-Unique op fysioatelieramersfoort.nl staat"* — de website van een directe concurrent. De
logica maakt geen onderscheid tussen **platforms** (waar je een profiel kunt aanmaken) en
**concurrent-eigen domeinen** (waar dat per definitie niet kan). Twee problemen dus: de feature
is stuk, en het ontwerp erachter klopt niet voor dit type bron.

---

## 4. Verbeterpunten, geprioriteerd

De volgorde is: eerst wat de geloofwaardigheid van het product raakt, dan wat de kwaliteit van
de content bepaalt, dan de rest.

### Prioriteit 1 — geloofwaardigheid (nu direct fout richting klant)

**V1. Geef het rapport verifieerbaar bewijs, of laat het zwijgen.**
Neem de `runId` op in het gemiste-vragenblok (`buildMissedBlock`, `lib/pipeline/report.ts`) en
geef per gemiste vraag expliciet mee *welke merken er in dat specifieke antwoord wél stonden*.
Instrueer het model dat het alleen concurrenten bij naam mag noemen als die in de meegegeven
lijst voor díe vraag staan. Overweeg een deterministische nacontrole: elke concurrentnaam in een
`why`-veld moet voorkomen in de mentions van de gekoppelde run, anders wordt de zin gestript.
*Raakt: doel 2 en 3. Bewijs: §2.2.*

**V2. Splits "niet genoemd" in twee categorieën.**
Voeg per meting een afgeleide vlag toe: *waren er überhaupt merken in dit antwoord?* Presenteer
de score dan als twee getallen — zichtbaarheid over merkgevoelige vragen, plus een apart cijfer
"vragen waar AI geen enkel merk noemt". Dat tweede getal is zelf waardevol inzicht (het zegt:
hier valt met content niets te winnen, of juist: hier is nog geen enkele partij de standaard).
*Raakt: doel 2 en 3. Bewijs: §2.1, 13–30% van alle metingen.*

**V3. Sluit kansloze vragen uit van contentaanbevelingen.**
Een vraag waar geen enkel merk genoemd wordt, mag geen doelvraag van een contentpagina zijn —
zeker niet op prioriteit 1. Filter ze uit `computeMissedPrompts` of geef ze het laagste gewicht.
*Raakt: doel 3. Bewijs: §3.2, Van der Valk prioriteit 1.*

### Prioriteit 2 — kwaliteit van de meetbasis

**V4. Maak het krimpen van de meetbasis zichtbaar en herstelbaar.**
Leg per funnelfase vast hoeveel vragen gevraagd en hoeveel geleverd zijn, toon dat in het
conceptscherm ("we konden er maar 2 van 10 maken voor Oriëntatie — hier is waarom"), en laat de
klant zelf vragen bijmaken. Overweeg daarnaast het filter te verzachten: een concurrentnaam
alleen weren als die *als aanbieder* in de vraag staat, niet als losse woordcombinatie.
*Raakt: doel 1 en 2. Bewijs: §1.1, Coolblue 2/10 Oriëntatie.*

**V5. Beoordeel prompts vooraf op merkgevoeligheid.**
Voeg aan de promptgeneratie een expliciete instructie toe dat een vraag zo geformuleerd moet
zijn dat een AI-assistent er *aanbieders* bij noemt ("waar/wie/welke aanbieder"), en weer
zuivere "hoe/wat"-adviesvragen — of markeer ze als niet-meetbaar. Twintig van de dertig Van der
Valk-vragen zouden hierop afvallen.
*Raakt: doel 1 en 2. Bewijs: §2.1.*

**V6. Repareer de volumekalibratie.**
Dwing af dat de hoogste vraag in elke analyse ook echt de hoogste band krijgt (normaliseer de
uitkomst in code in plaats van het model op zijn woord te geloven).
*Raakt: doel 1 en 2. Bewijs: §1.2, Van der Valk max 50.*

**V7. Maak clusters weer clusters.**
Laat het cluster niet per prompt vrij invullen maar kies uit een korte, per analyse vooraf
bepaalde lijst (5–8 thema's), of cluster achteraf in code. Strip daarnaast de vervuilde waarden.
*Raakt: doel 2 en 3. Bewijs: §1.3.*

### Prioriteit 3 — rijker inzicht (het "goed beeld" uit doel 2)

**V8. Gebruik `position` — die staat er al.**
100% van de mentions heeft een positie. Toon "gemiddelde positie waarop jij genoemd wordt versus
je concurrenten" en laat het rapport erop sturen. Dit is inzicht dat nu gratis op de plank ligt.
*Raakt: doel 2. Bewijs: §2.4.*

**V9. Meet geciteerd worden als aparte vorm van zichtbaarheid.**
Bepaal per meting of het eigen domein in `cited_sources` voorkomt en rapporteer dat naast de
vermeldingsscore. Fysi-Unique wordt vaker geciteerd dan genoemd — dat is nu onzichtbaar.
*Raakt: doel 2 en 3. Bewijs: §2.5.*

**V10. Snoei de concurrentenlijst en verrijk de overgeblevenen.**
Toon alleen concurrenten boven een minimum aantal vermeldingen (bijvoorbeeld ≥2, of top 8) en
zet de rest onder "ook genoemd". Voeg per overgebleven concurrent toe *waaróm* die genoemd
wordt — een korte, uit de antwoorden afgeleide typering (prijs / locatie / specialisme /
beschikbaarheid). Dat is wat de klant echt wil weten.
*Raakt: doel 2 en 3. Bewijs: §2.6, HEMA 34 merken waarvan 24 met één vermelding.*

**V11. Verbeter de entiteitclassificatie voor platforms en productlijnen.**
Geef de classificatie expliciet mee welk bedrijfsmodel de klant heeft (retailer / platform /
dienstverlener) — voor een platform als Bol zijn fabrikanten per definitie geen concurrent.
Voeg daarnaast merk-plus-productlijn-deduplicatie toe ("Dell XPS 13 2-in-1" → "Dell").
*Raakt: doel 2. Bewijs: §2.7.*

**V12. Vervang of schrap sentiment.**
`negative` komt in 650 rijen geen enkele keer voor. Schrap het veld, of vervang het door iets
dat wél varieert en ertoe doet: *in welke rol* wordt het merk genoemd (eerste aanbeveling /
één van meerdere opties / zijdelings).
*Raakt: doel 2. Bewijs: §2.3.*

### Prioriteit 4 — contentgrondstof

**V13. Los de `existingUrl`-chaos op.**
Dwing één conventie af (absolute URL of `null`), valideer in code tegen `profile_pages`, en —
belangrijker — behandel `action: "nieuw"` mét een matchende bestaande URL als een fout: dat hoort
`verbeteren` te zijn. Dit voorkomt vier dubbele pagina's bij één klant.
*Raakt: doel 3. Bewijs: §3.3.*

**V14. Bewaak de content-inventaris.**
Signaleer expliciet wanneer de inventaris te dun is (Bol: 1 pagina) of overwegend uit
productpagina's bestaat (HEMA), en blokkeer of waarschuw vóór het rapport in plaats van stil te
degraderen. Breid de productpagina-uitsluiting uit met een generieke heuristiek (URL-diepte,
prijsindicatoren in de tekst) in plaats van alleen Shopify-/Yoast-patronen.
*Raakt: doel 1 en 3. Bewijs: §3.4.*

**V15. Maak van het bron-type een sturend signaal.**
Onderscheid homepages van inhoudelijke pagina's in `cited_sources` en laat het rapport daarop
adviseren. Wordt in deze markt vooral de homepage geciteerd, dan is "schrijf een lange
blogpagina" het verkeerde advies en gaat het om entiteitsherkenning en vindbaarheid.
*Raakt: doel 3. Bewijs: §3.1, Fysi-Unique 8 van 10 bronnen zijn homepages.*

**V16. Verhoog de brondekking of erken de ondergrens.**
Met 17–30% dekking is de bronanalyse voor Fase C mager. Onderzoek of de simulatiecall om
expliciete bronvermelding kan vragen, of accepteer de ondergrens en laat het rapport zeggen
wanneer het advies op weinig bronbewijs rust.
*Raakt: doel 3. Bewijs: §3.1.*

### Prioriteit 5 — opruimen

**V17. Repareer of deactiveer de off-site taken.** De feature levert nul taken op ondanks
voldoende data, en zou bij reparatie onbruikbaar advies geven voor concurrent-eigen domeinen.
Onderscheid platforms van concurrent-websites vóórdat dit weer aan gaat. *Bewijs: §3.6.*

**V18. Heroverweeg de B1-gap-analyse.** B2 gebruikt de output nauwelijks (1 gap → 7
aanbevelingen bij HEMA). Ofwel B1 echt leidend maken in B2, ofwel samenvoegen en een call
besparen. *Bewijs: §2.8.*

**V19. Actualiseer de kostenbegroting.** `abcplan.md` §10 gaat uit van $0,356 per analyse; de
werkelijkheid is $0,83 doordat 3a op `mini` draait. 88% zit in die ene call. *Bewijs: §0.*

**V20. Corrigeer de documentatie.** `abcplan.md` beschrijft nog 5 promptcategorieën en een
optioneel onderwerp-veld; de code heeft 3 funnelfasen en een verplicht onderwerp. Zie
`GEO-EINDE-TOT-EINDE-PROCES.md` voor de feitelijke stand.

---

## 5. Wat deze ronde niet gedekt heeft

- **Fase C (contentgeneratie), publicatie, verificatie en effectmeting** zijn bewust niet
  gedraaid. Daarmee is de kwaliteit van het eindproduct — inclusief de GEO-kwaliteitspoort en
  het premium schrijfmodel — nog onbeproefd.
- **Meerdere meetperiodes**: alles is nulmeting (`week_no = 0`). Trend, periodevergelijking en
  de rapport-mail zijn niet getest.
- **Herhaalbaarheid**: elke vraag is één keer gemeten. Hoeveel de score schommelt bij herhaling
  is niet vastgesteld — relevant, want de 95%-marge is bij 30 vragen ongeveer ±18 punten.

Voor een vervolgronde is **Fysi-Unique** de beste kandidaat: complete inventaris, echte
concurrenten, scherpe doelvragen en een klein genoege site om de output handmatig te kunnen
beoordelen.
