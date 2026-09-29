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
