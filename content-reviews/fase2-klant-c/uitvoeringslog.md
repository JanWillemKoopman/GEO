# Uitvoeringslog, contentkwaliteit fase 2, klant C

Intern document, niet voor de copywriter. Volgt `docs/contentkwaliteit-testmethode.md` §3 en §3.1,
met sjabloonversie 2 van §4. Uitgevoerd door Claude Code op 29 september 2026 via `npm run live`
als `e2e-consultant@orbit-test.nl` tegen productie. Klant B draaide dezelfde dag onder hetzelfde
account (`../fase2-klant-b/`).

## 1. De bedrijfskeuze (§2.1, profiel C: zwak, lokaal)

**Gekozen: Ongediertebestrijding De Waard, Streefkerk** (`ongediertebestrijdingdewaard.nl`).
Eenmanszaak van Egbert Noorland, gecertificeerd ongediertebestrijder, gericht op wespen en mollen.

Controles vóór het aanmaken (29 september 2026):
- **Bestaat echt, site bereikbaar**: HTTP 200. Kleine site zonder sitemap: homepage, twee
  dienstpagina's, nieuwsberichten per dorp, tips, contact. Adres Nieuwe Veer 36, Streefkerk.
- **Geen overlap** met de merken in de database of met klant A en B.
- **Past bij profiel C**: lokaal (Alblasserwaard, Krimpenerwaard, Vijfheerenlanden, regio Gouda,
  Gorinchem en Drechtsteden). Weinig concreet bewijs op de site: geen prijzen, geen reviewscore,
  wel "met garantie" bij wespen en een certificering. Past bij een drukke ondernemer die weinig tijd
  in het gesprek steekt.
- **Clusters (§2.2)**: spoed (wespennest), een onderwerp met veel uitlegbehoefte (Aziatische
  hoornaar, alleen nieuwsberichten op de site) en een dunne bestaande pagina
  (`/diensten/mollenbestrijding/`, 184 woorden).

## 2. Stappen

| Tijd (UTC) | Stap | Resultaat |
|---|---|---|
| 29-09 05:20 | `POST /api/profiles` met naam, webadres en twee schrijfwijzen | HTTP 201, profiel `4a110630-f5c2-4482-9b15-10236bd0cf74`. |
| 29-09 05:20 tot 05:30 | Onderzoek | Negen stappen, nul mislukt. 18 pagina's, 3 diensten, 5 concurrenten, 5 voorgestelde onderwerpen (Aziatische hoornaar er niet bij). Geen gestructureerde data; één pagina toont zijn tekst pas via JavaScript. Werkgebied als zes regio's (Alblasserwaard, Krimpenerwaard, Vijfheerenlanden, regio Gouda, regio Gorinchem, regio Drechtsteden), geen plaatsen. Kennistest: herkend bij 2 van 6 vragen, genoemd bij 2 van 3 koopvragen. |
| 29-09 05:31 | `PATCH` gesprek met bron `gesprek`, `PUT` gesprek vastleggen | HTTP 200 beide (`payloads/02` en `03`). |
| 29-09 05:31 | Drie clusters (`payloads/04` tot en met `06`); Aziatische hoornaar zelf ingetypt | HTTP 201. |
| 29-09 05:34 tot 05:39 | Meetvragen klaar | 30 per cluster. |
| 29-09 05:39 | Twee vragen uitgezet, drie clusters bevestigd | Meting op 30, 29 en 29 vragen. |

## 3. Het gesprek (§2.1 profiel C, §3.1)

Bewust summier, als een drukke ondernemer die vijf minuten aan de telefoon zit. Het werkgebied uit
het onderzoek (regio's, geen plaatsen) is niet aangevuld: dat is precies wat bij zo'n gesprek
gebeurt. Contactpersoon leeg, geen stemvoorbeelden, geen verboden woorden of onderwerpen, geen
aanspreekvorm gekozen.

| Veld | Wat er verzonnen is | Rijkheid |
|---|---|---|
| `priority_offerings` | Alleen "wespennesten bestrijden" | summier |
| `target_segments` | Particulieren met een wespennest | summier |
| `deal_value_band` | klein | summier |
| `sales_objections` | "Is het niet duur?" | summier |
| `verhalen` | Eén regel: "Bel gewoon, dan kom ik kijken." | summier |
| Content-brief clusters | Wespen: één zin. Hoornaar en mollen: leeg | summier |

## 4. De meetvragen (eerste bewuste stop)

| Cluster | Analyse-id | Soort (§2.2) |
|---|---|---|
| Wespennest laten bestrijden | `f7cd54b4-e2ba-43e8-ade0-04f8aa0f06cd` | 1, spoed |
| Nest van de Aziatische hoornaar laten bestrijden | `e1b48d37-66bb-4236-9ec9-0754ae64947a` | 2, veel uitlegbehoefte |
| Mollen in tuin of terrein bestrijden | `03d6694e-d35f-441e-b474-034bc894ab75` | 3, bestaande zwakke pagina |

Harde regels in orde. **Opvallend**: omdat het werkgebied uit regio's bestaat, noemen alle 90 vragen
een regio ("in de Vijfheerenlanden", "in de regio Drechtsteden") en geen dorp. Zo praat een echte
gebruiker zelden. Bewust laten staan: het is het directe gevolg van summiere input, en dat is wat
profiel C test. Uitgezet:

| Cluster | Vraag | Reden |
|---|---|---|
| 2 | "Hoe snel kan een bestrijder in de regio Gouda meestal komen als er een nest ... in de tuin zit?" | Dubbel met dezelfde vraag voor de regio Gorinchem. |
| 3 | "Welke specialist in de Krimpenerwaard kan mollen bestrijden op een bedrijfsterrein zonder het hele terrein om te spitten?" | Krom. |

## 5. Meting en rapporten

Gemeten van 05:39 tot 06:53 (samen met klant B). Vijf meettaken bleven na vier pogingen mislukt
(mollencluster); het rapport kwam er toch.

| Cluster | Score (marge) | Vragen zonder enige aanbieder | Aanbevelingen |
|---|---|---|---|
| 1, wespennest | 33 (9) | 1 | **1** |
| 2, Aziatische hoornaar | 40 (10) | 6 | 2 |
| 3, mollen | 35 (9) | 2 | 3 |

## 6. Het contentplan (tweede bewuste stop)

| Tijd (UTC) | Stap | Resultaat |
|---|---|---|
| 29-09 07:02 | Plan opgesteld | Zes pagina's in oktober, precies de zes aanbevelingen. |
| 29-09 07:02 | Oktober vrijgegeven | Zes pagina's in voorbereiding. |

| # | Pagina | Cluster | Keuze | Soort |
|---|---|---|---|---|
| 1 | Maak de wespenpagina concreter over boeken, kiezen en kosten | 1 | prioriteit 1 (de enige) | verbeteren |
| 2 | Maak de informatie over Aziatische hoornaars in de Krimpenerwaard concreter (een nieuwsbericht) | 2 | prioriteit 1 | verbeteren |
| 3 | Breid de pagina over determinatie uit met gratis beoordeling van mogelijke hoornaarnesten | 2 | prioriteit 2 | verbeteren |
| 4 | Maak de pagina over mollenbestrijding concreet over prijzen | 3 | prioriteit 1 | verbeteren (de dunne pagina uit §2.2) |
| 5 | Maak duidelijk hoe klanten hulp kunnen aanvragen voor mollenbestrijding | 3 | prioriteit 2 | nieuw |
| 6 | Leg uit wanneer zelf bestrijden wel of niet verstandig is (`/tips/`) | 3 | aanvulling, prioriteit 3 | verbeteren |

**Aanvulling volgens §2.3 (versie van 29 september).** Het wespencluster gaf één aanbeveling.
Beide paden zaten al in de matrix (nieuw bij mollen), dus de aanvulling is de eerstvolgende op
prioriteit: de enige overgebleven aanbeveling, uit het mollencluster. De toets "lijkt het tweede
artikel op het eerste" vervalt voor het wespencluster.

Opvallend: twee pagina's (1 en 4) hebben "concreet over prijzen" of "kosten" als opdracht, terwijl
de klant in het gesprek niets over prijzen zei en de site geen prijs noemt. Dat wordt dus een vraag
aan de klant, en bij dit profiel een vraag die overgeslagen wordt (§3 stap 6).

## 7. De brief-vragen (§3 stap 6, §3.1)

Zes briefs tussen 07:02 en ongeveer 07:11. 31 unieke vragen (een deel geldt voor meerdere pagina's),
11 beantwoord, 20 overgeslagen, alle via `PATCH /api/profiles/<id>/facts` (HTTP 200). Rijkheid:
20 overgeslagen, 11 summier. De volledige tekst staat in `payloads/11-antwoorden.json`.

Beantwoord zoals een drukke ondernemer met profiel C: één zin per antwoord, en alleen waar hij het
antwoord zonder nadenken weet. Alles wat aansluit op de site ("dezelfde dag", nabehandeling, gratis
foto's bekijken). Overgeslagen: alle prijsvragen (vijf), alle vragen om een klantvoorbeeld of om
toestemming voor foto's en reacties, alle termijnvragen, en twee van de zes open vragen (mollen en
zelf bestrijden).

**Waarneming.** De briefs stelden bij profiel C samen 31 vragen, meer dan bij klant A (28) en B (25),
terwijl juist deze klant het minst wil invullen. Een echte klant met dit profiel haakt bij zoveel
vragen af; dat hij "overslaan" kiest in plaats van niets te doen is hier een aanname.

## 8. Het schrijven

Alle zes klaar om 07:16. Vijf in één keer goed; alleen de pagina over de kosten van mollenbestrijding
is herschreven (oordeel "niet goed") en die herschrijving is behouden. Geen zinnen die de klant nog
moet bevestigen. Nagerekend: de tekst in de app is bij alle zes byte voor byte gelijk aan de versie
in het klantdocument; niets gepubliceerd, niets als geplaatst gemarkeerd.

**Hoe de pijplijn met de dunne input omging.** Er staat in geen van de zes teksten een bedrag, ook
niet op de twee pagina's die de opdracht "concreet over prijzen" of "kosten" hadden: de app heeft
niets verzonnen waar de klant geen antwoord gaf. De pagina's zijn korter (272 tot 551 woorden, bij
A en B 300 tot 970). Wel belandt de taal van de app in de tekst: de prijzenpagina zegt letterlijk
"voor mollenbestrijding door Ongediertebestrijding De Waard is geen tarief of richtprijs
bevestigd". Een pagina met als titel "Wat kost mollenbestrijding?" die geen prijs noemt, is
bovendien de vraag of die pagina er had moeten komen.

## 9. Kosten, nagerekend op `ai_calls`

| Post | Aanroepen | Werkelijk |
|---|---|---|
| Merkonderzoek | 18 | $0,14 |
| Drie clusters: vragen, meting, rapporten | 868 | $3,14 |
| Zes briefs | 6 | $0,38 |
| Schrijven, controle, herschrijven | 13 | $0,30 |
| **Samen** | 905 | **$3,96** |

Klant B en C samen $7,86; het testaccount kwam op 29 september op $7,88 in totaal (met een paar
kleine aanroepen zonder merkverwijzing). Ruim onder de €20 per account en €50 over alle accounts.
Doorlooptijd in de app voor B en C samen: van 05:20 tot 07:19, ongeveer twee uur, waarvan 75 minuten
meting.

## 10. Het klantdocument

`klantdocument-ongediertebestrijding-de-waard.md`, gebouwd met sjabloonversie 2 uit `data.json`.
Leesdeel 6.820 woorden; één eerdere versie in de bijlage. 26 keer "niet beantwoord" bij de
aangeleverde informatie, en dat is ook wat de copywriter moet zien: hij beoordeelt de tekst tegen
wat de klant werkelijk aanleverde.
