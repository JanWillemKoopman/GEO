# Clusters ontdekken

> Opgesteld 23 september 2026 op verzoek van de eigenaar. De drie besluiten staan onderaan
> `docs/logbook.md` (23 september 2026). Niets hiervan is gebouwd behalve het proefscript van fase 0.

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
- De **klant** ziet de pagina en de kandidaten, en kan op "Dit wil ik" klikken. Dat komt bij de
  consultant binnen als verzoek. Een ronde of meting starten blijft `STAFF_ONLY_ACTIONS`
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
| 2. Verbreden | DataForSEO Labs: zoekideeën rond de beginpunten, waarop de eigen site staat, echte concurrenten volgens Google en waarop zij staan | ~$0,40 tot $0,80 |
| 3. Schiften | Eerst vaste regels (buitenland, concurrentmerken, dubbel, te lang), dan een licht model per zoekterm: past dit bij aanbod en strategie? Gestopte diensten vallen weg | licht model |
| 4. Bundelen | Eén aanroep: 8 tot 15 kandidaat-clusters op het juiste niveau, elk aan een dienst. Code controleert dat elke zoekterm in de invoer stond en telt de volumes zelf op. Overlap met een bestaand cluster wordt "lijkt op …", niet stil weggegooid | zwaar model |
| 5. Scoren | Pure module met tests: vraag, pasvorm, eigen positie, concurrentie, overlap. Uitleg in woorden | gratis |
| 6. AI-check (fase 3) | Drie vragen per kandidaat aan ChatGPT: noemt hij concurrenten, jou of niemand? | ~$0,10 per kandidaat |

Schatting per ronde: $1 tot $1,50 en 5 tot 10 minuten. Fase 0 meet dit na.

**Eerlijkheid in de UI:** Google-zoekvolume is een aanwijzing voor wat mensen aan een AI vragen, geen
meting daarvan. Dat staat zo op het scherm.

## Het scherm

1. **Bronnenbalk:** per bron wat er gebruikt wordt; bij een ontbrekende bron wat dat kost
   ("Search Console is niet gekoppeld, dus de snelle winst valt weg").
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
| 0. Proefronde | `scripts/probe-clusters-ontdekken.ts --betaald` op udenhout.nl (~$0,50) | Labs werkt voor NL, echte kosten bekend, eigenaar beoordeelt de uitvoer. Minder dan de helft relevant na schiften: geen pagina op DataForSEO bouwen |
| 1. Zijbalk en pagina | Gratis bronnen: Search Console, onboarding, bestaande clusters, ChatGPT. Stap 1, 3, 4, 5. Levert Snelle winst | Werkt op Van den Udenhout |
| 2. DataForSEO | Stap 2 achter `CLUSTER_DISCOVERY_ENABLED`. Levert Nieuw terrein en Concurrent is je voor | Kosten binnen de schatting |
| 3. AI-check en klantverzoek | Stap 6 en "Dit wil ik" | |

**Af als**, op Van den Udenhout: de eigenaar zou 6 of meer van de beste 10 kandidaten toevoegen, geen
kandidaat is een ongemarkeerd dubbel van een bestaand cluster, en elk getal op een kaart is terug te
vinden in de ruwe data.

**Mee te nemen bij de bouw:** `README.md` noemt zoekwoordenonderzoek en echte zoekvolumes "bewust niet
gebouwd"; dat verandert. Check `docs/merkstrategie.md` §30 op beloftes.

## Stand fase 0

Het script staat klaar maar is nog niet gedraaid: de DataForSEO-sleutels staan in Vercel en niet in
de ontwikkelomgeving. Draaien kan lokaal met de sleutels in `.env.local`, of hier nadat de sleutels
als geheim aan de cloudomgeving zijn toegevoegd.
