# Nieuw of verbeteren: hoe die keuze valt, en waar hij lekt

> **Stand op 2 september 2026: alle zes de optimalisaties zijn gebouwd en staan op `main`**
> (migratie `0086`, op productie toegepast onder het label `0083`; zie `docs/logbook.md`, alinea van
> 2 september). Bij het samenvoegen zijn ze verweven met `existing-page-match.ts`, dat op 1
> september parallel op `main` landde en dezelfde beslissing narekent.
>
> **De adreskoppeling is tegen productiedata geverifieerd** (conventie 10). De echte
> `matchExistingPage()` is gedraaid over een doorsnede van de 91 aanbevelingen die in productie een
> adres dragen, met per adres de pagina's uit de inventaris die hetzelfde laatste padsegment hebben
> (`canonicalPath()` raakt dat segment nooit aan, dus dat filter kan geen match missen). Uitkomst op
> 31 gevallen: **18 gekoppeld vóór de verificatie, 26 erna**. Die meting bracht een gat aan het licht
> dat in de code niet zichtbaar was, zie hieronder bij O1. De vijf die overblijven horen niet te
> koppelen: `/`, `:`, `:null` en `.` (rommel die het model bij een nieuwe pagina invulde) en één
> pagina die niet in de inventaris staat.
>
> **Nog niet geverifieerd:** de verse ophaling (O3) tegen echte klantsites. De ontwikkelcontainer
> weert uitgaand verkeer naar die domeinen (de proxy geeft 403 op de CONNECT-tunnel), dus alle tien
> de adressen faalden daar om een reden die niets met de code te maken heeft. Op Vercel bestaat die
> beperking niet. Het bewijs komt bij de eerste echte planstap: dan hoort `existing_page_text`
> gevuld te raken met meer dan de 1500 tekens uit de crawl. Ook nog open: één pagina laten schrijven
> met handeling `verbeteren` om te zien of het verbeterplan op het scherm klopt met wat er
> werkelijk op die pagina staat.

**Onderzoek van 1 september 2026.** Aanleiding: de vraag hoe ORBIT ENGINE besluit of een
aanbeveling een nieuwe pagina wordt of een verbetering van een bestaande, of dat betrouwbaarder
kan, en of bij een verbetering de echte huidige tekst van de klant erbij gepakt wordt.

Alle cijfers hieronder komen uit de productiedatabase (project `kosauqzjbpweluiqgmwv`), nagerekend
op 1 september 2026 over 20 rapporten met 129 aanbevelingen en 738 gecrawlde pagina's
(conventie 10).

---

## 1. Hoe de keuze nu valt

De beslissing valt op één plek, in één modelaanroep, in één zin instructie.

`lib/pipeline/report.ts` bouwt de invoer voor de rapportcall (B2). Daarin gaat een lijst van
maximaal 150 regels mee (`REPORT_PAGES_CAP`), en elke regel bevat het adres van een gecrawlde
pagina plus de titel:

```
- https://klant.nl/warmtepomp-tilburg/ · "Warmtepomp Tilburg | Klant"
```

De tekst van die pagina's gaat **niet** mee. `buildPagesBlock()` gebruikt alleen `url` en `title`
uit `profile_pages`, terwijl `text_excerpt` in dezelfde rij staat.

De instructie eromheen (`REPORT_SYSTEM`) zegt: bepaal per aanbeveling of dit een bestaande pagina
verbetert (kies dan de meest relevante URL uit de lijst) of dat er een nieuwe pagina nodig is
(`existingUrl = null`), en kies alleen verbeteren als een pagina uit de lijst daadwerkelijk over
hetzelfde onderwerp gaat. Wat eruit komt (`action` en `existingUrl`) wordt letterlijk opgeslagen in
`reports.recommendations_json`, en gaat daarvandaan ongewijzigd naar `content_pieces`,
`planned_pages` en het scherm.

**Er zit geen enkele controle tussen.** `resolveTargets()` en `mergeOverlappingRecommendations()`
raken `action` en `existingUrl` niet aan, `validateReportClaims()` controleert alleen
concurrentnamen, en het Zod-schema laat elke string toe. Dat is een uitzondering op conventie 1
(elke promptinstructie krijgt een deterministisch vangnet): de keuze die bepaalt of de klant een
pagina bijwerkt of een tweede pagina naast een bestaande zet, rust volledig op wat het model belooft
te doen.

Er is één plek die de keuze wél deterministisch benadert, en die wordt er niet voor gebruikt:
`assessStructureCoverage()` in `lib/pipeline/structure-gap.ts` bepaalt per dienst met
termvergelijking of er een eigen pagina is (`eigen_pagina`), of de dienst alleen zijdelings
voorkomt (`zwak_gedekt`), of hij nergens staat (`ontbreekt`). Precies de drie uitkomsten die de
handeling bepalen. Die analyse gaat als **tekstblok in de prompt** mee en niet als besluit.

---

## 2. Wat de productiedata laat zien

### 2.1 De verhouding

| | aantal | met `existingUrl` |
|---|---|---|
| `nieuw` | 70 | 32 |
| `verbeteren` | 59 | 59 |

Verbeteren is dus geen randgeval: bijna de helft van al het werk dat de app voorstelt gaat over een
pagina die de klant al heeft.

### 2.2 Achtenveertig procent van de nieuwe pagina's draagt een adres dat niemand leest

32 van de 70 aanbevelingen met `action = "nieuw"` hebben tóch een `existingUrl`. Dat is in strijd
met de instructie ("action = nieuw, existingUrl = null") en er is geen vangnet dat het wegpoetst.
Wat er in staat loopt uiteen van rommel (`""`, `"/"`, `"."`) tot een echt bestaande pagina:

- `/fysiotherapie-bij-hardloopklachten-in-amersfoort/` bij de aanbeveling "Pagina over preventieve
  begeleiding na herstel van hardloopblessures **uitbreiden of toevoegen**", handeling `nieuw`.
- `/advies/wasmachine-kopen-waar-op-letten.html` bij "Vergelijkingspagina met actuele aanbiedingen
  voor energiezuinige wasmachines", handeling `nieuw`.
- Drie losse `nieuw`-aanbevelingen die alle drie naar dezelfde bestaande pagina
  `https://www.udenhout.nl/acties/skoda-private-lease` wijzen.

**13 van die 32 adressen bestaan echt** (gematcht op pad tegen `profile_pages`). Dat zijn dertien
keer dat het model zelf een bestaande pagina aanwees en de app er niets mee deed:
`lib/pipeline/content.ts` regel 839 leest `existingUrl` alleen als `action === "verbeteren"`, en
`werk.tsx` toont bij `nieuw` alleen de chip "Nieuwe pagina". De klant ziet nooit dat er al iets
stond.

### 2.3 Veertien procent van de verbeteringen vindt zijn eigen pagina niet terug

De koppeling in `content.ts` is een exacte stringvergelijking:

```ts
.eq("profile_id", analysis.profile_id)
.eq("url", recommendation.existingUrl)
```

Van de 59 verbeter-adressen staan er 51 exact zo in de inventaris. Op **pad** vergeleken worden het
er 56. Het verschil van vijf is puur notatie: het model gaf `/tarieven-2026/` terug waar de
inventaris `https://fysi-unique.nl/tarieven-2026/` bevat. Die vijf pagina's zijn geschreven zonder
één woord van de bestaande tekst, terwijl de pagina gewoon in de database stond.

De overige drie zijn echte verzinsels, waaronder tweemaal `/udenhout.nl/leasen/private-lease`, een
pad met het domein erin dat nooit heeft bestaan. Dat is dezelfde fout die migratie 0025 met de hand
opruimde en die `linkSlot()` in `briefing-select.ts` bij naam noemt. Hij is nooit structureel
verholpen.

In beide gevallen faalt het stil. `existingPage` wordt `null`, de schrijver krijgt geen bestaande
tekst, en `content_pieces.action` blijft op `verbeteren` staan. Het scherm zegt daarna tegen de
klant:

> Deze tekst is bedoeld als vervanging voor `<adres>`. Houd dezelfde URL aan, want die heeft al
> waarde opgebouwd.

Een vervanging schrijven zonder het origineel gelezen te hebben, met een instructie aan de klant om
het origineel te overschrijven. Dat is de gevaarlijkste toestand die deze keten kent.

---

## 3. Wat er bij een verbetering wél meegaat, en hoe weinig dat is

`buildContentInput()` in `lib/pipeline/content.ts` regel 526:

```
BESTAANDE PAGINA om te verbeteren of aan te vullen (<url>). Bouw hierop voort, herschrijf niet
vanaf nul, behoud wat al goed is en vul alleen de ontbrekende delen aan:
"""<text_excerpt>"""
```

Drie dingen kloppen daar niet aan.

**De tekst is afgekapt op 1500 tekens.** `PAGE_MAX_CHARS` in `lib/crawler.ts` kapt elke pagina van
de inventaris af, want er gaan er 150 tegelijk het model in. Van de 738 gecrawlde pagina's op
productie zitten er **667 (90%) op die grens**, en van de tien pagina's die daadwerkelijk verbeterd
zijn zitten er **negen op precies 1500 tekens**. Dat is ongeveer 230 woorden. De pagina die ervoor
in de plaats komt is er 400 tot 1200. De app schrijft dus een vervanging die langer is dan de
representatie van het origineel die hij gelezen heeft, en alles wat op de bestaande pagina onder
die 230 woorden staat (prijstabellen, veelgestelde vragen, voorwaarden, klantverhalen) bestaat voor
de schrijver niet.

**De tekst is oud.** Het excerpt komt uit de laatste crawl, niet uit een verse ophaling. Gemeten
over de tien verbeterde pagina's: tot **20 dagen** tussen de crawl en het schrijven.

**Er is geen verbeteranalyse.** Nergens in de keten wordt de bestaande tekst vergeleken met wat de
pagina zou moeten bevatten. De claim-audit, het contentcontract (`content-contract.ts`) en het
itemdossier krijgen de bestaande pagina **niet** te zien: `ContractInput` heeft geen veld ervoor.
De inhoudsopgave wordt dus opgesteld alsof de pagina nog niet bestaat, en pas de schrijfcall krijgt
er 1500 tekens bij met de vraag om erop voort te bouwen. Wat er concreet verbeterd moet worden,
staat nergens: niet als lijst voor de klant, niet als opdracht voor het model, en niet als
controle achteraf.

Het antwoord op de vraag is daarmee: **nee.** De volledige huidige content wordt niet meegenomen,
en er wordt niet aangegeven wat er verbeterd moet worden. Er is één ruwe brok verouderde,
afgekapte tekst en een zin die vraagt om er rekening mee te houden.

Ter vergelijking: `content-diff.ts` kan woord voor woord verschillen tonen en dat gebeurt ook, maar
alleen tussen twee door ons geschreven versies. De vergelijking die er het meest toe doet, tussen
de pagina die live staat en de pagina die hem vervangt, wordt niet gemaakt.

---

## 4. Twee gaten die hieruit volgen

**Kannibalisatie wordt niet gemeten.** `mostSimilar()` in de kwaliteitspoort vergelijkt de nieuwe
tekst alleen met `content_pieces` van hetzelfde merk, dus met wat de app zelf eerder schreef. De
echte site (`profile_pages`) doet niet mee. Kiest het model onterecht `nieuw` terwijl de klant al
een pagina over het onderwerp heeft, dan merkt geen enkele controle dat, en de app levert twee
pagina's die om dezelfde vraag concurreren. `similarity.ts` schrijft zelf op waarom dat erg is:
"twee pagina's die hetzelfde zeggen concurreren met elkaar om dezelfde vraag, en geen van beide
wordt de duidelijke bron".

**De klant kan de keuze niet corrigeren.** `werk.tsx` toont de handeling als vaststaand feit, met
een knop Schrijven ernaast. De generatieroute accepteert wel een andere `action` in de body
(`app/api/analyses/[id]/generate/route.ts` regel 111), maar geen enkel scherm biedt hem aan. De
ondernemer die weet dat hij die pagina al heeft, kan dat nergens zeggen.

---

## 5. Optimalisaties, op volgorde van wat ze opleveren

### O1. Koppel de bestaande pagina deterministisch, op pad in plaats van op string

Eén functie in `lib/pipeline/` die een door het model genoemd adres oplost tegen `profile_pages`,
via `canonicalPath()` uit `page-relevance.ts` (die kent al taalsegmenten en trailing slashes).
Draait direct na `resolveTargets()` in `report.ts`, vóór opslag:

- adres matcht op pad, dan `existingUrl` normaliseren naar de echte URL uit de inventaris;
- adres matcht niet, dan `action` terugzetten op `nieuw` en `existingUrl` op `null`, met een regel
  in de log zodat te tellen is hoe vaak het model een pagina verzint;
- `action = "nieuw"` met een adres dat wél matcht, dan is dat een signaal, geen ruis. Zie O2.

Repareert nu meteen 5 van de 59 verbeteringen en haalt 3 verzonnen adressen weg. Kosten: nul,
puur rekenwerk. Test in `test-unit.ts`, want dit is pure logica (conventie 2).

**Wat de verificatie daar bovenop vond (2 september 2026).** Acht van de 91 adressen in productie
hebben de vorm `/udenhout.nl/skoda`: het model zette het DOMEIN in het pad. Dat leest als een
verzinsel en is het niet, want `https://udenhout.nl/skoda` bestaat gewoon. Alle acht wezen naar een
pagina die echt bestaat, en alle acht werden weggegooid; bij twee ervan was dat een verbetering die
naar `nieuw` degradeerde, en dus een tweede pagina naast een pagina die de klant al heeft. Migratie
`0025` heeft precies dit adres ooit met de hand rechtgezet en `briefing-select.ts` noemt het bij
naam, maar niets repareerde het. `matchExistingPage()` doet nu een tweede poging als het eerste
padsegment exact de host van een gecrawlde pagina is. Er wordt niets geraden: wat er na dat segment
overblijft moet nog steeds een bestaande pagina aanwijzen.

### O2. Laat het model niet meer alleen beslissen: leg de structurele dekking ernaast

`assessStructureCoverage()` geeft nu al per dienst `eigen_pagina`, `zwak_gedekt` of `ontbreekt`.
Draai dezelfde vergelijking per aanbeveling, met de titel en de doelvragen als termen (dat is precies
waar `selectRelevantPages()` en `scorePage()` voor gemaakt zijn), en zet de uitkomst naast het
oordeel van het model:

| model zegt | code vindt | uitkomst |
|---|---|---|
| verbeteren | een pagina met dezelfde termen in titel of adres | verbeteren, dat is dezelfde conclusie |
| nieuw | een pagina met dezelfde termen in titel of adres | **markeren**: sterke kandidaat om te verbeteren |
| verbeteren | niets dat scoort | terug naar nieuw (O1 doet dit al bij een onvindbaar adres) |
| nieuw | niets | nieuw |

De 13 gevallen uit §2.2 vallen precies in de tweede rij. Ze hoeven niet automatisch omgezet te
worden: het minimum is dat de aanbeveling de gevonden pagina meedraagt, zodat de schrijfstap en het
scherm weten dat er al iets staat. Dit is het vangnet dat conventie 1 vraagt.

### O3. Haal bij een verbetering de echte pagina vers en volledig op

`fetchText()` plus `htmlToText()` uit `lib/crawler.ts` doen dit al in `publish-check.ts`: één HTTP
verzoek, geen AI-kosten, geen nieuwe afhankelijkheid. Bij het starten van een contentopdracht met
`action = "verbeteren"`:

- haal de pagina op het moment van schrijven op, tot 6000 tekens in plaats van 1500;
- lukt dat niet (404, 403, time-out), val terug op het excerpt en zet dat in de log, of beter: zet
  de opdracht om naar `nieuw` als de pagina niet meer bestaat, want dan is verbeteren onmogelijk;
- bewaar de opgehaalde tekst bij het contentstuk, zodat de vergelijking van O5 en de audit-trail
  hem later terug kunnen vinden (conventie 8).

Dit verandert de kwaliteit van elke verbetering, en verbeteringen zijn 46% van het werk.

### O4. Geef het contentcontract de bestaande pagina, niet alleen de schrijfcall

`ContractInput` in `content-contract.ts` krijgt een veld voor de huidige tekst en per sectie een
oordeel: staat dit er al, staat het er half, of ontbreekt het. De inhoudsopgave wordt dan een
verbeterplan in plaats van een plan voor een pagina die al bestaat. De dekkingspoort
(`content-coverage.ts`) rekent dezelfde lijst na, dus de controle achteraf komt er gratis bij. Geen
extra AI-aanroep: het contract wordt toch al opgesteld, hij krijgt alleen betere invoer.

### O5. Toon de klant wat er verandert, en wat er verdwijnt

Twee dingen, allebei op het contentscherm bij `action = "verbeteren"`:

1. **Een verbeterlijst.** Wat de pagina nu mist en straks wel heeft, in gewone taal, uit het
   contract van O4. Dat is het antwoord op de vraag "wat moet ik hier nu mee" dat de klant nu niet
   krijgt.
2. **Een echte vergelijking.** `diffContent()` bestaat al en werkt op twee strings. Voer hem de
   opgehaalde tekst uit O3 en de nieuwe tekst, en de klant ziet in rood wat er van zijn pagina af
   gaat. Zeker zolang er geen koppeling met een CMS is en de klant zelf kopieert en plakt, is dat
   het verschil tussen "vervangen" en "per ongeluk je prijstabel weggooien".

De zin "Deze tekst is bedoeld als vervanging" in `publish-guide.tsx` hoort pas te staan als dit er
is. Nu belooft hij meer dan de keten waarmaakt (`merkstrategie.md` §30).

### O6. Laat de duplicatiecheck ook de echte site zien

`loadSiblingPages()` in `content.ts` vult `mostSimilar()` alleen met eigen contentstukken. Voeg de
gecrawlde pagina's van hetzelfde profiel toe, met een aparte melding: lijkt een als `nieuw`
geschreven pagina te sterk op een pagina die al op de site staat, dan is dat geen kwaliteitsfout in
de tekst maar een verkeerde handeling. Vangt precies het geval dat O2 vooraf probeert te
voorkomen, en doet dat achteraf op de tekst zelf.

---

## 6. Wat dit niet oplost

De onderliggende beperking blijft dat de rapportcall de paginalijst als adres plus titel ziet en
niet als inhoud. Dat is een bewuste kostenkeuze (150 pagina's × 1500 tekens past niet in één
prompt) en O2 is de goedkope manier om er omheen te werken. Wil je de beslissing echt op inhoud
laten rusten, dan hoort daar een aparte, goedkope stap bij die per aanbeveling de vijf best
scorende pagina's beoordeelt. Dat is een eigen jobtype (conventie 7) en pas de moeite als O1 tot
en met O3 de fout niet ver genoeg terugbrengen.
