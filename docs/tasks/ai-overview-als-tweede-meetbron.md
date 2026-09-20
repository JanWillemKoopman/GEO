# Google AI Overview als tweede meetbron, en de wiebel van één meting

**Opgesteld:** 20 september 2026. **Status: onderzocht en nagemeten, nog niet gebouwd.**

De aanleiding is een vraag van de eigenaar: dezelfde cluster twee keer meten met een half uur ertussen
geeft twee verschillende uitslagen, en de klant leest dat als achteruitgang. Dit document legt vast
wat er daadwerkelijk aan de hand is, wat er tegen een echte api is nagemeten, en welke volgorde van
bouwen daaruit volgt.

Alle cijfers hieronder komen uit productie of uit echte betaalde aanroepen op 20 september 2026.
Niets is overgenomen uit documentatie zonder verificatie (conventie 10).

---

## 1. Het probleem: een vermelding is vandaag ongeveer een muntworp

Niet de steekproef van dertig vragen is het probleem, maar de uitkomst per vraag.

**Klantmeting** (`tracking_runs`, de acht zwaarste vragen gaan drie keer door de meting, binnen
dezelfde ronde, minuten na elkaar): van de 11 vragen waar het merk ooit genoemd werd, gaven er **6
een andere uitkomst bij de herhaling**. Zelfde vraag, zelfde minuut, ander resultaat.

**Salesmeting** (markt Tilburg, dezelfde 40 vragen op 1 en 15 september): van de 45 combinaties van
vraag en bedrijf waar het bedrijf minstens één keer genoemd werd, **klapten er 27 om**. Slechts 18
stonden er beide keren in. Installatiebedrijf P. van Erve ging van 5 vermeldingen naar 1, Oostelbos
van 3 naar 0.

**De noemer beweegt mee.** De score is vermeldingen gedeeld door de vragen waarin überhaupt een
aanbieder genoemd werd. Bij de markt Tilburg noemden **24 van de 40 vragen in beide rondes geen
enkel bedrijf**. Je betaalt voor 40 vragen en meet er feitelijk 16. Verspringt dat aantal, dan
verspringt het percentage zonder dat er één vermelding veranderd is.

**De rem die dit moest opvangen heeft nog nooit gevuurd.** `lib/pipeline/elicit-rate.ts` slaat een
vraag pas over na acht metingen (`MIN_SAMPLES_TO_SKIP`). Van de 210 vragen op productie heeft er
**geen enkele meer dan 3 metingen**. De besparing die de herhalingen uit R6.1 moest betalen bestaat
dus niet.

---

## 2. Wat er al goed staat

De onzekerheidsband is er en wordt getoond: `lib/stats/uncertainty.ts` levert hem, en
`components/analytics-cluster-table.tsx`, `app/(app)/merk/[id]/page.tsx`,
`app/(app)/merk/[id]/analytics/page.tsx` en `lib/pipeline/trend.ts` gebruiken hem.

Wat ontbreekt is niet de band maar de omgang ermee: het getal bovenaan leest als een hard cijfer, en
daar gaat de klant op af.

---

## 3. Wat er tegen de echte api is nagemeten

De DataForSEO-sleutels stonden al in Vercel (de zoekvolumelaag is geparkeerd, zie
`docs/logbook.md` 20 september 2026 (2)). Voor dit onderzoek is een ander product van datzelfde
account gebruikt: `/v3/serp/google/organic/live/advanced` met `load_async_ai_overview: true`.

**De meetopzet:** alle 90 prompts van Van den Udenhout (drie clusters van 30), twee volledige rondes,
een half uur ertussen. 234 aanroepen, $0,85.

### 3.1 Hoe vaak krijgen we een AI Overview?

| | ronde 1 | ronde 2 |
|---|---|---|
| prompts verstuurd | 90 | 90 |
| geslaagde aanroepen | 85 | 82 |
| AI Overview aanwezig | 78 (92% van geslaagd) | 78 (95% van geslaagd) |
| daarvan bruikbaar (niet leeg) | 77 (**91%** van geslaagd) | 75 (**91%** van geslaagd) |
| geen AI Overview | 7 | 4 |
| leeg teruggekomen | 1 | 3 |
| mislukt na herkansing | 5 | 8 |

**Het antwoord: 91% van de geslaagde aanroepen levert een bruikbare AI Overview.** Reken je tegen
alle 30 verstuurde prompts, dan is het 83 tot 86%, want een paar aanroepen blijven ook na herkansing
stuk.

De 12-vragen pilot gaf 92%, en dat hield stand op 90 vragen. De dekking valt niet weg bij lokale
koopvragen, wat vooraf de grootste zorg was.

### 3.2 Bijna een derde van de aanroepen mislukt bij de eerste poging

26 van 90 in ronde 1, 28 van 90 in ronde 2, allemaal `40101 Internal SE Server Error`. Alle 54
slaagden bij de tweede poging. **Een mislukte aanroep kost wél geld: $0,002.** Een herkansingslus is
dus voorwaarde, en de verspilling hoort in de kostenraming.

### 3.3 Wat het kost, 30 prompts, één ronde

**Huidige methode (ChatGPT), nagemeten in `ai_calls` op de echte clusters van Van den Udenhout:**

| stap | aanroepen | kosten |
|---|---|---|
| `measure_simulate` (mét web_search) | 46 | $0,726 |
| `measure_mention` (de beoordelaar) | 46 | $0,030 |
| **totaal per cluster van 30 prompts** | **92** | **$0,76** |

Het zijn 46 metingen en geen 30, want de acht zwaarstwegende vragen gaan drie keer (R6.1). Per unieke
vraag is dat $0,025, per losse meting $0,017. Gemeten over beide clusters: $0,756 en $0,770.

**Via de SERP-api (Google AI Overview):**

| post | bedrag |
|---|---|
| geslaagde aanroep | $0,0037 gemiddeld |
| mislukte aanroep | $0,002 |
| 30 prompts, één meting per vraag, inclusief de herkansingen die je echt nodig hebt | **$0,13** |

Dat cijfer is niet gerekend maar gemeten: ronde 1 kostte 116 aanroepen voor 90 prompts ($0,376),
ronde 2 kostte 118 aanroepen ($0,375). Per 30 prompts is dat beide keren $0,125.

**De vergelijking:**

| | ChatGPT | Google AI Overview |
|---|---|---|
| 30 prompts, één meting per vraag | $0,51 | $0,13 |
| 30 prompts zoals de app het nu doet (46 metingen) | $0,76 | n.v.t. |
| 30 prompts, drie metingen per vraag | $1,54 | $0,38 |
| 30 prompts, vijf metingen per vraag | $2,56 | $0,63 |

**Google is ongeveer vier keer goedkoper per meting.** Dat is minder dan de factor zeven uit de
pilot, want daar zat de herkansingsverspilling nog niet in.

### 3.4 De score van Van den Udenhout, Google naast ChatGPT

| cluster | Google AI Overview | ChatGPT |
|---|---|---|
| Occasion kopen in Noord-Brabant | 30% | nog niet gemeten |
| Wagenparkbeheer voor mkb-bedrijven | 8% (ronde 1), 20% (ronde 2) | 13% |
| Zakelijke lease voor bedrijfswagens | 45% | 21% |

Bij zakelijke lease is Van den Udenhout op Google **ruim twee keer zo zichtbaar** als in ChatGPT,
vooral bij beslissingsvragen. Bij wagenparkbeheer is hij op beide platformen vrijwel onzichtbaar.
In de bronnen over alle antwoorden staat `udenhout.nl` 11 keer, achter `mkblease.nl` (14) en voor
`maasdekoninglease.nl` (10).

⚠️ Deze percentages zijn bepaald met een grove detectie (de merknaam in de tekst plus het eigen
domein in de bronnen), niet met `lib/openai/mention-prompt.ts`. De richting klopt, het precieze
getal kan een paar punten schelen.

### 3.5 ⚠️ De aanname die is weerlegd: Google is NIET stabieler

Vooraf was de redenering dat een AI Overview per zoekopdracht wordt bewaard en daardoor rustiger is
dan een ChatGPT-antwoord. **Dat klopt niet.** Twee rondes, dezelfde 90 vragen, een half uur ertussen:

- Van de 28 vragen waar Van den Udenhout minstens één keer genoemd werd, **wisselde de uitkomst bij
  17. Dat is 61%.**
- Van de 418 bronnen uit ronde 1 kwamen er **204 terug: 49%**.
- Zelfs **óf** er een AI Overview verschijnt wisselt: bij 1 op de 5 vragen was hij de ene keer er wel
  en de andere keer niet. Dezelfde bewegende noemer als bij ChatGPT.

Het cluster wagenparkbeheer laat het in het klein zien: 2 vermeldingen in ronde 1, 5 een half uur
later. Van 8% naar 20%, zonder dat er iets veranderd is.

**Gevolg voor het ontwerp:** Google AI Overview is geen rustiger signaal en mag ook nooit zo worden
gepresenteerd. De enige zakelijke reden om het te bouwen is de prijs, plus de dekking van een tweede
platform waar de klant aantoonbaar anders scoort.

---

## 4. Wat er moet gebeuren, in deze volgorde

### Stap 1: snoeien en herhalen bij ChatGPT (lost de wiebel op, budgetneutraal)

`MIN_SAMPLES_TO_SKIP` van 8 naar 3, zodat vragen die niets opleveren er daadwerkelijk uit gaan, en
dat budget naar herhalingen van de vragen die wél iets opleveren. Bij de markt Tilburg zaten 24 van
de 40 vragen in de categorie "noemt nooit iemand"; die kosten daar $0,58 per ronde en leveren niets.

⚠️ Let op de andere kant van die knop: `elicit-rate.ts` legt in zijn eigen toelichting uit waaróm 8
er staat (bij 0 van 2 is de bovengrens nog 66%). Van 8 naar 3 mag alleen als de bovengrenstoets
blijft staan, anders komt de fout van R2.1 terug.

### Stap 2: de aggregatie engine-bewust maken (voorwaarde, anders telt alles dubbel)

Nagerekend op 20 september 2026: `computeAggregates()` in `lib/pipeline/measure.ts` bevat **geen
enkele engine-filter**, het woord "engine" komt in die functie niet voor. Hetzelfde geldt voor
`measurementIsUsable` en `countOpenPeriodicMeasurements`. De waarschuwing die al in
`lib/jobs/queue.ts` staat is dus nog steeds geldig.

Zou je nu per engine uitwaaieren, dan telt elke vraag dubbel mee in de score en klopt de foutmarge
niet meer. `visibility_scores.per_engine_json` bestaat sinds migratie 0001 en is nooit gevuld; dat is
de plek waar de uitsplitsing hoort.

**Niet blenden tot één cijfer.** Twee platformen naast elkaar tonen. Een gemengd getal betekent geen
van beide dingen, en de vraag waar de klant op afgaat ("noemt ChatGPT mij") wordt er juist troebeler
van.

### Stap 3: Google AI Overview als derde soort bron, mét herhalingen vanaf dag één

⚠️ **Een AI Overview past niet in `EngineAdapter`.** Die interface verwacht een gesprek: een
systeemprompt en een gebruikersvraag (`lib/engines/types.ts`). De SERP-api geeft een
zoekresultatenpagina terug, zonder systeemprompt en zonder gesprek. Erin wringen breekt de betekenis
die dat bestand expliciet vastlegt. Dit is een derde soort bron, naast de engines en Search Console,
en verdient een eigen plek.

Wel hergebruiken: **dezelfde beoordelaar**. `lib/openai/mention-prompt.ts` over de AI Overview-tekst,
anders meet je het verschil tussen twee beoordelaars in plaats van tussen twee platformen. Dat is
dezelfde regel die `lib/engines/types.ts` al stelt. De beoordeling kost $0,00066 per stuk, dus 30
beoordelingen kosten $0,02; dat verandert de rekensom in §3.3 nauwelijks.

**Ontwerp vanaf het begin met drie metingen per vraag** ($0,38 per cluster). Niet één meting met een
tweede mening ernaast, maar drie metingen die samen één cijfer met een echte band vormen. Dat is het
enige ontwerp dat past bij wat §3.5 laat zien.

Verder nodig:
- een herkansingslus, want 30% mislukt bij de eerste poging (§3.2);
- een lege AI Overview is een **niet-meting**, geen nulscore (conventie 3);
- geen AI Overview aanwezig is óók een niet-meting, geen nulscore;
- een eigen schakelaar, standaard uit, zelfde patroon als `SEARCH_DEMAND_ENABLED`.

### Stap 4: presentatie

Het gemiddelde over de laatste drie rondes als hoofdgetal, de losse ronde als stip eromheen. En de
band als hoofdgetal in plaats van het punt: "tussen 1 en 3 van de 10 antwoorden" in plaats van "21%".

---

## 5. Af als

- Twee opeenvolgende metingen van dezelfde cluster, zonder tussentijdse verandering, geven een
  verschil dat binnen de getoonde band valt, en het scherm zegt dat ook.
- De aggregatie telt per engine en per bron, aantoonbaar met een scenario in `test-chain.ts`.
- De AI Overview-meting draait met drie herhalingen en een herkansingslus, en een lege of ontbrekende
  overview landt als onbekend en niet als nul.
- ⚠️ Nog te doen vóór stap 3 gebouwd wordt: dit onderzoek herhalen over meerdere dagen. Twee rondes
  op één ochtend is geen maandcijfer.
