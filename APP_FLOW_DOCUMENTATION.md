# ORBIT ENGINE, de keten uitgelegd zonder techniek

> **Voor wie dit is.** Sales, management en iedereen die moet kunnen uitleggen wat ORBIT ENGINE
> doet zonder de code te kennen. Dit is het enige document in de repo dat die lezer bedient.
>
> **Wat hier NIET meer staat.** Dit document had ooit ook een technisch hoofdstuk en een
> AI-hoofdstuk. Die zijn op 17 augustus 2026 verwijderd: ze beschreven hetzelfde als
> `docs/architecture.md` en waren negen dagen achterop geraakt, waardoor er twee technische
> waarheden naast elkaar stonden die uit elkaar liepen. Voor techniek is
> [`docs/architecture.md`](./docs/architecture.md) vanaf nu de enige bron. De tabel "Bewust géén
> AI" die hier stond is meeverhuisd naar §6 daarvan.
>
> **Peildatum: 17 augustus 2026.** De kostentabel in §5 is nagerekend tegen de echte
> kostenlogboeken op productie. De rest van dit hoofdstuk beschrijft de vijf fases, en die zijn
> sinds 8 augustus niet veranderd. Wijkt het af van de app, dan is de app leidend.
>
> **Waar het naartoe gaat** staat níet hier maar in [`docs/visie.md`](./docs/visie.md) en
> [`docs/merkstrategie.md`](./docs/merkstrategie.md). Dit document beschrijft wat de app vandaag
> doet, en niets anders.

---

# De keten, en wat elke stap oplevert

## 1. Wat het product doet

Een MKB-ondernemer wil weten of ChatGPT hem noemt wanneer een potentiële klant vraagt
*"welke fysiotherapeut in Tilburg is goed bij rugklachten?"*. GEO Tracker meet dat, laat zien wie
er wél genoemd wordt en waarom, schrijft de pagina's die dat gat moeten dichten, en meet weken
later of het gewerkt heeft.

Het onderscheidende punt is niet het meten maar de **gesloten lus**: meten → verklaren → maken →
publiceren → hermeten met controlegroep. De app doet geen uitspraak over effect zonder die laatste
stap.

## 2. De vijf fases

| # | Fase | Wat de klant doet | Wat de app doet | Wat het oplevert |
|---|---|---|---|---|
| **1** | **Merk klaarzetten** | Vult **drie velden** in: webadres, bedrijfsnaam, andere schrijfwijzen. In het sales-led model doet de consultant dit vóór het demogesprek. | Draait acht taken in ~7,5 minuut (~$0,25): tot 150 pagina's crawlen en harde feiten oogsten, technische audit mét entiteitsconsistentie, merkonderzoek, aanbodboom, 5 tot 8 core topics, marktonderzoek, LLM-kennistest, synthese | Een merkdossier met aanbodboom, kennistest en gespreksagenda, **hergebruikt door alle latere analyses**. Eenmalig werk, blijvend profijt. |
| **2** | **Analyse opstellen** | Kiest een merk + vult een onderwerp in ("wasmachines", "herenkapsel"), optioneel een content-brief | Onderzoekt wat de site over dít onderwerp zegt, wie de concurrenten hier zijn, en genereert 30 realistische koopvragen (10 per funnelfase) + een volume-inschatting | Een concreet, leesbaar meetplan. **Geen black box:** de klant ziet en bewerkt élke vraag vóór er één euro aan meetkosten gemaakt wordt. |
| **3** | **Analyse runnen** | Klikt één keer op *"Bevestig en start meting"* | Stelt alle 30 vragen aan een AI-assistent mét live web search, beoordeelt elk antwoord per merk, aggregeert tot een score met foutmarge, profileert de concurrenten en schrijft een jargonvrij rapport | Het cijfer met betrouwbaarheidsband, de trendlijn, wie er wint en **waarop**, plus concrete gemiste vragen. |
| **4** | **Content genereren** | Kiest welke aanbevolen pagina's geschreven worden, beantwoordt max. 8 korte feitenvragen, geeft de tekst vrij en publiceert hem | Bouwt een feitenkaart, controleert welke beweringen de pagina nodig heeft en niet onderbouwd kunnen worden, schrijft de pagina op het duurste model, laat hem redigeren, herschrijft en keurt hem deterministisch | Publicatieklare pagina's (Markdown, meta-tags, FAQ, JSON-LD) waarin **elke bewering over het bedrijf herleidbaar is tot een bevestigd feit**. |
| **5** | **Resultaten monitoren** | Vult de live-URL in en kijkt terug | Verifieert dat de pagina echt staat, hermeet na 14 en 28 dagen precies de doelvragen **plus een controlegroep**, en velt een statistisch verdict. Maandelijks draait de hele meting opnieuw | Een verdedigbare uitspraak: *"op de vragen waarvoor je publiceerde +18, op de rest +3"*. Geen losse "je score steeg". |

## 3. Waarde per fase, in verkooptaal

- **Fase 1**, *"Eén keer je merk vastleggen, altijd profijt."* Het profiel is accountbreed;
  analyse nummer drie voor dezelfde klant is aanzienlijk goedkoper en sneller dan nummer één.
- **Fase 2**, *"Je ziet precies wat we gaan meten, vóórdat we meten."* De goedkeuringspoort is
  een verkoopargument: geen black box, geen kosten zonder akkoord.
- **Fase 3**, *"Een cijfer met een eerlijke marge."* De app toont de onzekerheid en telt vragen
  waarbij de AI géén enkele aanbieder noemt apart (niet als verlies). Dat maakt het cijfer
  verdedigbaar in plaats van indrukwekkend.
- **Fase 4**, *"Content die niets verzint."* De feitenkaart is een gesloten lijst: staat een feit
  er niet op, dan komt het niet in de tekst. Dat is de belangrijkste bron van vertrouwen bij een
  ondernemer die zijn naam onder de pagina zet.
- **Fase 5**, *"We tonen of het gewerkt heeft, ook als het niet zo is."* De controlegroep maakt
  het verschil tussen marketing en meten.

## 4. Procesflow, klantreis

```mermaid
flowchart TD
    A([Consultant logt in]) --> B[FASE 1 · Merk klaarzetten<br/>drie velden: url, naam, schrijfwijzen]
    B --> B1{{App: 8 taken, ~7,5 min<br/>crawl + audit + onderzoek + aanbodboom<br/>+ topics + markt + kennistest + synthese}}
    B1 --> B2[Merkdossier klaar]
    B2 --> B3[/DEMOGESPREK + uur consultancy<br/>daarna: toewijzen aan klantaccount/]
    B3 --> C

    C[FASE 2 · Analyse opstellen<br/>merk + onderwerp + content-brief]
    C --> C1{{App: onderwerp-onderzoek<br/>+ 30 vragen + volumekalibratie}}
    C1 --> D[/GOEDKEURINGSPOORT<br/>klant beoordeelt en bewerkt/]

    D -->|Bevestig en start meting| E[FASE 3 · Analyse runnen]
    E --> E1{{App: 30x vraag stellen met web search<br/>+ per antwoord merken beoordelen}}
    E1 --> E2{{App: aggregatie, score + marge,<br/>concurrentprofilering, rapport}}
    E2 --> F[Dossier: score, bewijs, gaten, aanbevelingen]

    F --> G[FASE 4 · Content genereren<br/>klant kiest pagina's]
    G --> G1{{App: feitenkaart + claim-audit}}
    G1 --> H[/BRIEFINGPOORT<br/>max 8 feitenvragen aan de klant/]
    H --> H1{{App: schrijven, redigeren,<br/>herschrijven, deterministische poort}}
    H1 --> I[/VRIJGAVE<br/>klant leest en geeft vrij/]
    I --> J[Klant publiceert op eigen site<br/>+ vult live-URL in]

    J --> K[FASE 5 · Resultaten monitoren]
    K --> K1{{App: publicatie verifieren}}
    K1 --> K2{{App: hermeting golf 1 na 14 dagen<br/>golf 2 na 28 dagen + controlegroep}}
    K2 --> L[Verdict: gestegen / gelijk / gedaald]
    L -.maandelijkse meetronde.-> E1
    F -.volgende periode.-> F
```

**Twee bewuste stops.** De pijplijn draait volledig op de server en stopt maar op twee plekken op
de klant: de **goedkeuringspoort** (fase 2 → 3) en de **briefingpoort** (fase 4). Alles daarbuiten
loopt door als de klant zijn browser sluit.

## 5. Wat dit kost per klant

**Nagerekend op productie, 17 augustus 2026**, tegen de 13 meetrondes die in het kostenlogboek
staan. De eerdere schatting in dit document was $0,40 en dat bleek ruim twee keer te laag.

| Post | Werkelijke kosten | Opmerking |
|---|---|---|
| Profielonderzoek | eenmalig ~$0,25 | Gemeten over drie onboardings. Hergebruikt door alle analyses van dat merk |
| **Meetronde (30 vragen)** | **gemiddeld $0,855** | Laagste gemeten $0,50, hoogste $1,56. De spreiding komt doordat web_search per vraag verschilt in hoeveel pagina's het ophaalt |
| Meetronde mét herhalingen | $0,855 plus 8 zwaarste vragen × 3 | Verhoogt de betrouwbaarheid waar het gewicht zit |
| Contentpagina | enkele dubbeltjes | Enige post op het duurste model (`gpt-5.6-sol`), ~5× duurder dan op de vorige modelgeneratie |

**Er is precies één kostenknop die telt.** Van een meetronde zit **98,8%** in het stellen van de
vraag mét web_search (`measure_simulate`); het beoordelen van het antwoord is 1,2%. Zet
`MEASURE_WEB_SEARCH` uit en je betaalt centen in plaats van dollars, maar dan meet je niet meer wat
een echte gebruiker te zien krijgt.

De volledige verdeling en de onderbouwing staan in `docs/architecture.md` §6.
