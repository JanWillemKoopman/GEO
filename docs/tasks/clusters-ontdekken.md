# Clusters ontdekken

> Opgesteld 23 september 2026 op verzoek van de eigenaar. De besluiten staan onderaan
> `docs/logbook.md` (23 september 2026). Fase 0 is gedraaid en fase 1 en 2 zijn samen gebouwd
> (zie "Stand van de bouw" onderaan). **Nog niet nagerekend tegen een echte ronde op productie.**

## Wat de eigenaar wil

Na de onboarding staan er voorgestelde clusters op het clusteroverzicht, en dat blijft zo. Wat
ontbreekt is een plek om daarna gestructureerd méér clusters te vinden die bij het merkprofiel
passen, ze toe te voegen aan het overzicht en te laten meten. Bronnen: Search Console, alle
onboardingsdata, de bestaande clusters, ChatGPT en DataForSEO. Een ronde mag geld en rekentijd kosten.

## Wat er al staat, en waarom dat het ontwerp bepaalt

- **Een kleine versie bestaat al:** de knop "Stel nieuwe clusters voor" (`lib/pipeline/propose-more-topics.ts`,
  alleen voor de consultant, ~$0,02 per ronde). Gebruikt aanbod, gesprek, afgewezen onderwerpen en
  gemeten gemissen, geen zoekdata. In productie één keer gebruikt (`profile_topic_rounds`, 23 september).
  Deze pagina is de volwassen versie ervan; de knop verhuist mee.
- **DataForSEO-zoekvolume stond geparkeerd** (logboek 20 september 2026 (2)). De reden: data die
  niemand las, en fouten op het raakvlak met de potentiescore. Deze pagina is de lezer die ontbrak.
  Twee voorwaarden: een eigen schakelaar, los van `SEARCH_DEMAND_ENABLED`, en zoekdata komt niet in
  `profile_topics.search_volume_*`, de potentiescore of de meetgewichten.
- **Cijfers op productie, 23 september 2026:** 3 merken, 1 met Search Console (Van den Udenhout):
  9.471 zoekopdrachten over 847 pagina's in 90 dagen. 275 zoekopdrachten hebben 100 of meer
  vertoningen, 159 daarvan staan gemiddeld op plek 4 tot 20. 23 voorgestelde onderwerpen, 3 daarvan
  een cluster geworden, 0 afgewezen. 9 lopende clusters.
- **Een cluster kost blijvend geld:** ~$0,82 per maandelijkse meetronde. Bij 50 clusters ~€43 per
  maand, tegen een plafond van €50 per account (`lib/spend-rules.ts`).

## Uitgangspunt

De pagina levert **onderwerpen, geen lijst zoekwoorden** (`docs/visie.md`: "geen keywordtool op
zichzelf"). Elke kaart is een kandidaat-cluster; zoektermen staan eronder als bewijs.

## Wie mag wat (besluit 1)

- De **consultant** start een ontdekkingsronde en zet een kandidaat om in een meting.
- De **klant** ziet de pagina en de kandidaten, en voegt er zelf een toe aan Mijn clusters
  (sinds 23 september 2026 (4); daarvoor klikte hij "Dit wil ik" en voegde de consultant toe). De
  meting daarna start de consultant. Een ronde of meting starten blijft `STAFF_ONLY_ACTIONS`
  (`lib/cost-rules.ts`); er komt een eigen handeling `clusters_ontdekken` bij.

## Zijbalk (besluit 3)

```
Overzicht
Clusters      Clusters ontdekken · Mijn clusters
Strategie     Contentplan · Openstaande vragen · Bibliotheek
Analytics     ...
```

- Nieuwe kop `Clusters` in `HOOFDSTUKKEN` tussen Overzicht en Strategie, met eigen icoon en grens 2
  in `GRENS_PER_HOOFDSTUK`. Strategie gaat van vier naar drie: de regel van 17 augustus klopt weer
  zonder uitzondering. Test in `scripts/test-unit.ts` en `docs/ux-design.md` §5 mee aanpassen.
- "Clusters ontdekken" staat eerst, op verzoek van de eigenaar.
- Adressen: `/merk/[id]/clusters/ontdekken` en `/merk/[id]/clusters`; `/strategie/clusters` stuurt
  door via `lib/redirects.ts`.
- Een menu-item verschijnt pas als het scherm erachter werkt (`lib/nav.ts`).
- "Voorgesteld" op Mijn clusters blijft ongewijzigd; toegevoegde kandidaten landen daar.

## Een ontdekkingsronde

Elke stap is een eigen jobtype (conventie 7) en kijkt eerst of zijn resultaat al bestaat (conventie 9).
Zoekdata wordt 30 dagen gecachet in `keyword_demand`.

| Stap | Wat | Kosten |
|---|---|---|
| 1. Verzamelen | Beginpunten uit aanbodboom × werkgebied, Search Console-zoekopdrachten per pagina, bestaande clusters, vermijdlijst van afgewezen onderwerpen | gratis |
| 2. Verbreden | DataForSEO Labs: zoeksuggesties per beginpunt, waarop de eigen site staat, echte concurrenten (gekozen op omvang, zie fase 0) en waarop zij in de top 20 staan | ~$0,75 (nagemeten) |
| 3. Schiften | Eerst vaste regels (buitenland, concurrentmerken, dubbel, te lang), dan een licht model per zoekterm: past dit bij aanbod en strategie? Gestopte diensten vallen weg | licht model |
| 4. Bundelen | Eén aanroep: 8 tot 15 kandidaat-clusters op het juiste niveau, elk aan een dienst. Code controleert dat elke zoekterm in de invoer stond en telt de volumes zelf op. Overlap met een bestaand cluster wordt "lijkt op …", niet stil weggegooid | zwaar model |
| 5. Scoren | Pure module met tests: vraag, pasvorm, eigen positie, concurrentie, overlap. Uitleg in woorden | gratis |
| 6. AI-check (fase 3) | Drie vragen per kandidaat aan ChatGPT: noemt hij concurrenten, jou of niemand? | ~$0,10 per kandidaat |

Schatting per ronde: $1 tot $1,50 en 5 tot 10 minuten. Het DataForSEO-deel is in fase 0 nagemeten.

**Eerlijkheid in de UI:** Google-zoekvolume is een aanwijzing voor wat mensen aan een AI vragen, geen
meting daarvan. Dat staat zo op het scherm.

## Het scherm

1. ~~**Bronnenbalk**~~: op 23 september 2026 op verzoek van de eigenaar weggehaald. De gebruiker
   wil goede clusters kunnen aanvinken, niet de bronnen nalopen. Ontbreekt een bron, dan zegt de
   ronde dat zelf onder de kandidaten.
2. **Rondeknop** met geschatte kosten en duur, voortgang, pagina mag dicht.
3. **Kandidaten in drie groepen:** Snelle winst (plek 4 tot 20), Nieuw terrein (vraag, geen pagina),
   Concurrent is je voor. Kaart: titel, één zin waarom, drie feiten met hun gevolg, "Toon bewijs".
   Knoppen: Toevoegen aan Mijn clusters · Toevoegen en meten (consultant, via de bestaande startroute)
   · Niet relevant met reden in één klik (doen we niet, te breed, te smal, zit al in een cluster).
   Die reden stuurt volgende rondes en de bestaande voorstelknop. Bij toevoegen staat wat het
   maandelijks gaat kosten.
4. **Eerdere rondes**, met wat er nieuw is sinds de vorige.

## Datamodel (additief)

- `cluster_discovery_runs`: merk, status, kosten, invoer-snapshot, ruwe antwoorden (conventie 8).
- `cluster_discovery_candidates`: ronde, titel, onderbouwing, zoektermen met volume, Search
  Console-bewijs, concurrentbewijs, scoreonderdelen, status, afwijsreden, verwijzing naar voorstel.
- `profile_topics`: herkomst `ontdekking` en verwijzing naar de kandidaat.

## Fasering

| Fase | Wat | Klaar als |
|---|---|---|
| 0. Proefronde (**gedaan**) | `scripts/probe-clusters-ontdekken.ts --betaald` op udenhout.nl, $0,57 | Labs werkt voor NL, echte kosten bekend, eigenaar beoordeelt de uitvoer. Minder dan de helft relevant na schiften: geen pagina op DataForSEO bouwen |
| 1. Zijbalk en pagina | Gratis bronnen: Search Console, onboarding, bestaande clusters, ChatGPT. Stap 1, 3, 4, 5. Levert Snelle winst | Werkt op Van den Udenhout |
| 2. DataForSEO | Stap 2 achter `CLUSTER_DISCOVERY_ENABLED`. Levert Nieuw terrein en Concurrent is je voor | Kosten binnen de schatting |
| 3. AI-check en klantverzoek | Stap 6 en "Dit wil ik" | |

**Af als**, op Van den Udenhout: de eigenaar zou 6 of meer van de beste 10 kandidaten toevoegen, geen
kandidaat is een ongemarkeerd dubbel van een bestaand cluster, en elk getal op een kaart is terug te
vinden in de ruwe data.

**Mee te nemen bij de bouw:** `README.md` noemt zoekwoordenonderzoek en echte zoekvolumes "bewust niet
gebouwd"; dat verandert. Check `docs/merkstrategie.md` §30 op beloftes.

## Uitkomst fase 0 (23 september 2026, $0,57 in totaal)

Gedraaid op udenhout.nl in twee delen: `scripts/probe-clusters-ontdekken.ts --betaald` ($0,35) en een
vervolg met twee betere varianten ($0,22). Ruwe antwoorden in `probe-uitvoer/` (niet in git).

**A. DataForSEO Labs werkt voor Nederland in het Nederlands.** Alle aanroepen gaven status 20000.

**B. De prijs klopt met het ontwikkelplan:** $0,012 per aanroep plus $0,00012 per resultaat, tot op de
cent nagerekend ($0,096 voor 700 resultaten). Een volledige ronde met de werkwijze hieronder kost
~$0,75 aan DataForSEO: eigen zoektermen (700) $0,10, concurrenten zoeken $0,01, drie dealers
(300 elk) $0,14, twintig beginpunten (100 elk) $0,48. Plus de AI-stappen.

**C. Ruis, per bron** (aandeel zoektermen met een woord uit het aanbod, een ondergrens):

| Bron | Uitkomst | Oordeel |
|---|---|---|
| Waarop de eigen site staat | 700 termen, 75% | Bruikbaar. 251 op plek 4 tot 20 (79%), bijvoorbeeld "audi occasions" en "volkswagen occasions" op plek 10 |
| Concurrentiegat met de twee grootste "concurrenten" | viabovag.nl en autowereld.nl, 24% | **Onbruikbaar**: dat zijn portalen, geen dealers. Bovenaan "kenteken checken" (823.000) en "bmw" |
| Concurrentiegat met twee dealergroepen | pouw.nl en dewaalautogroep.nl, 182 termen waar zij in de top 20 staan en udenhout.nl niet | **Sterk**: automodellen die udenhout.nl verkoopt, en "occasion private lease" (22.200 per maand, De Waal op plek 5) |
| Zoekideeën rond de diensten (`keyword_ideas`) | 700 termen, 10% | **Onbruikbaar**: "weer amsterdam", "nederland marokko". Die methode zoekt op categorie, niet op de term |
| Zoeksuggesties per beginpunt (`keyword_suggestions`) | 5 × 100 termen | **Bruikbaar**, met twee soorten ruis die het schiften moet afvangen: homoniemen ("capcut apk" bij "apk") en varianten die dezelfde term zijn ("private lease occasion", "occasion private lease", allebei 22.200) |

**Wat dit aan het ontwerp verandert:**

1. **Echte concurrenten kiezen op omvang, met een vaste regel.** Google noemt eerst portalen
   (viabovag.nl: 59.165 zoektermen, 24 keer udenhout.nl met 2.423). Dealergroepen zitten tussen
   2 en 12 keer (pouw.nl 6.319, broekhuis.nl 28.910). Regel: hooguit 15 keer de eigen omvang, plus een
   lijst met marktplaatsen en sociale media. Puur en testbaar, geen AI nodig.
2. **`keyword_ideas` valt af, `keyword_suggestions` komt ervoor in de plaats.**
3. **Varianten samenvoegen vóór het schiften**: dezelfde woorden in een andere volgorde met hetzelfde
   volume zijn voor Google Ads één term. Anders telt de code 22.200 zes keer op.
4. **Alleen concurrentposities in de top 20 tellen** als "concurrent is je voor".
5. **Het schiften met een AI-model is nodig**, niet alleen een woordenlijst: "capcut apk" bevat een
   aanbodwoord en is toch ruis.

**Stopcriterium gehaald:** na de aanpassingen is in alle drie de bruikbare bronnen ruim meer dan de
helft relevant. DataForSEO blijft in het plan. Nog open: de eigenaar beoordeelt de kandidaten zodra
fase 1 ze als clusters bundelt; losse zoektermen beoordelen zegt weinig over de kaarten.

## Stand van de bouw (23 september 2026)

Fase 1 en 2 zijn samen gebouwd, omdat fase 0 liet zien dat DataForSEO bruikbaar is. Wat er staat:

- **Migratie 0109**, op productie toegepast: `cluster_discovery_runs`, `cluster_discovery_candidates`,
  `profile_topics.discovery_candidate_id` en de herkomst `ontdekking`.
- **Vier taken** in `lib/pipeline/cluster-discovery.ts`: verzamelen (licht model voor de
  beginpunten), verbreden (DataForSEO, geen AI), schiften (licht model), bundelen (één zware aanroep).
  Een stap die definitief opgeeft zet de ronde op mislukt (`scheduleFollowUpAfterFailure`).
- **De rekenkunde** in `lib/cluster-discovery.ts`, met tests: concurrenten kiezen op omvang,
  varianten samenvoegen, voorfilter met een vast deel per bron, alleen bestaande termen, soort,
  score, overlap, de zinnen op de kaart.
- **DataForSEO** in `lib/discovery/labs.ts`, achter `CLUSTER_DISCOVERY_ENABLED` (staat op `true` in
  Vercel, productie en preview). Kosten gaan als `dataforseo_labs` in `ai_calls`, dus het plafond per
  account telt ze mee.
- **De route** `app/api/profiles/[id]/discovery`: ronde starten (consultant, kostenregel
  `clusters_aanvullen`), kandidaat aanvragen of intrekken (klant), toevoegen of afwijzen (consultant).
- **Het scherm** `/merk/[id]/ontdekken`, en in de zijbalk de kop Clusters met "Clusters ontdekken" en
  "Mijn clusters". De oude knop "Stel nieuwe clusters voor" is vervangen door een verwijzing hierheen.

**Afwijkingen van het plan, bewust:**

- **Geen knop "Toevoegen en meten".** Toevoegen zet het onderwerp bij Voorgesteld op Mijn clusters;
  de meting start daar met de bestaande knop, inclusief de verdeling over de funnelfasen. Eén
  manier om een cluster te starten, niet twee.
- **Het adres van Mijn clusters is ongewijzigd** (`/strategie/clusters`, 27 verwijzingen). Clusters
  ontdekken staat op `/merk/[id]/ontdekken`, zodat de mobiele titel niet "Mijn clusters" wordt.
- **Nagerekend op echte data zonder AI** (de antwoorden uit fase 0): de concurrentkeuze geeft
  broekhuis.nl, vanmossel.nl en poncenter.nl (geen enkel portaal); 1.484 termen worden 1.126 na
  het samenvoegen van varianten en 400 na de voorfilter. Puur op volume sorteren gaf de
  concurrenten 220 van die 400 plekken; daarom nu een vast deel per bron.

**Nog open:**

1. **Een echte ronde op Van den Udenhout** zodra dit op `main` staat. Eerder kan niet: de werker op
   productie draait de code van `main` en kent de vier taken nog niet, dus een ronde vanaf een
   testversie zou daar mislukken. Dan het criterium "Af als" hierboven toetsen, met de eigenaar.
2. **De AI-check per kandidaat** (stap 6) is niet gebouwd.
3. **Opruimen** zodra de ronde op productie is nagerekend: de route `topics/refresh` en
   `lib/pipeline/propose-more-topics.ts` worden dan niet meer gebruikt.
