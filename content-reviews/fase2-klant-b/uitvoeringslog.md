# Uitvoeringslog, contentkwaliteit fase 2, klant B

Intern document, niet voor de copywriter. Volgt `docs/contentkwaliteit-testmethode.md` §3 en §3.1,
met sjabloonversie 2 van §4. Uitgevoerd door Claude Code op 29 september 2026 via `npm run live`
als `e2e-consultant@orbit-test.nl` tegen productie. Klant C draaide dezelfde dag onder hetzelfde
account (`../fase2-klant-c/`).

## 1. De bedrijfskeuze (§2.1, profiel B: gemiddeld, landelijk)

**Gekozen: Myfinance, Hilversum** (`myfinance.nl`). Online boekhoudprogramma met sinds ongeveer vijf
jaar een eigen boekhoudservice voor zzp en mkb, landelijk en volledig online.

Controles vóór het aanmaken (29 september 2026):
- **Bestaat echt, site bereikbaar**: HTTP 200, 222 adressen in de sitemap, geen blokkade voor
  automatische bezoekers.
- **Geen overlap**: geen boekhouder of administratiekantoor in de database (daar staan hovenier,
  installateur, rijschool, fysiotherapie twee keer, autodealer twee keer, slotenmaker).
- **Past bij profiel B**: landelijk, geen vestiging die ertoe doet voor de klant. Concreet bewijs op
  de site: vast all-in tarief vanaf €69,95 per maand, zelf boekhouden vanaf €10, reactie binnen één
  werkdag, software sinds 2016, geen externe investeerders.
- **Clusters (§2.2)**: een beslisvraag met hoge koopintentie (boekhouder met vaste prijs), een
  overwogen keuze (zelf boekhouden of uitbesteden) en een dunne bestaande pagina
  (`/functies/jaarafsluiting-en-aangifte/`, 212 woorden).

Afgevallen: twee kleinere zzp-boekhouders (`zzp-boekhouder.nl`, `boekhouder-zzp.nl`). Hun sites
geven automatische bezoekers een lege pagina (HTTP 202), en dan kan het onderzoek van de app niets
lezen. Finnerz weigert automatische bezoekers (HTTP 403).

## 2. Stappen

| Tijd (UTC) | Stap | Resultaat |
|---|---|---|
| 29-09 05:20 | `POST /api/profiles` met naam, webadres en drie schrijfwijzen | HTTP 201, profiel `57077730-47d2-427f-be4e-d5aeb766a259`. |
| 29-09 05:20 tot 05:30 | Onderzoek | Negen stappen, nul mislukt. 150 van 214 pagina's gelezen, 12 producten en 7 diensten, 7 concurrenten, 7 voorgestelde onderwerpen. Bedrijfsmodel door het onderzoek vastgesteld als "fabrikant" (het maakt ook de software); als consultant bewust laten staan. Werkgebied landelijk, geen plaatsen. Kennistest: ChatGPT kent Myfinance, genoemd bij 1 van 3 koopvragen. |
| 29-09 05:31 | `PATCH` gesprek met bron `gesprek`, `PUT` gesprek vastleggen | HTTP 200 beide (`payloads/02` en `03`). |
| 29-09 05:31 | Drie clusters (`payloads/04` tot en met `06`) | HTTP 201. |
| 29-09 05:33 tot 05:36 | Meetvragen klaar | 30 per cluster. |
| 29-09 05:39 | Vijf vragen uitgezet, drie clusters bevestigd | Meting op 28, 29 en 28 vragen. |

## 3. Het gesprek (§2.1 profiel B, §3.1)

Gemiddeld ingevuld, zoals het profiel vraagt: de commerciële velden redelijk, **geen
stemvoorbeelden**, en "Verhalen" in twee zinnen. Contactpersoon leeg.

| Veld | Wat er verzonnen is | Rijkheid |
|---|---|---|
| `priority_offerings` | Online boekhouder met vast tarief, aangifte inkomstenbelasting, btw-aangifte | gemiddeld |
| `deprioritised_offerings` | Prognoses | summier |
| `target_segments` | Zzp'ers zonder personeel, starters, zzp'ers die nu zelf boeken | gemiddeld |
| `deal_value_band` | klein | summier |
| `seasonality` | Februari tot april, en rond de btw-deadlines | gemiddeld |
| `sales_objections` | Drie: onpersoonlijk, zelf is goedkoper, te laat aanleveren | gemiddeld |
| `forbidden_topics` | Constructies om belasting te ontwijken, beloftes over teruggave | gemiddeld |
| `offline_proof` | Boekhouders werken zelf met het programma; geen externe investeerders (beide al op de site) | summier |
| `goal_12m` | Vaker gekozen dan een lokaal administratiekantoor | gemiddeld |
| `taboo_phrases` | Twee | summier |
| `verhalen` | Twee zinnen: zzp'ers die na een jaar zelf boeken in april in de stress schieten | summier |
| `stem_voorbeelden` | Geen | (bewust leeg) |

## 4. De meetvragen (eerste bewuste stop)

| Cluster | Analyse-id | Soort (§2.2) |
|---|---|---|
| Online boekhouder voor zzp met vaste prijs per maand | `4af6d255-e0fb-4e80-a71d-1da582780570` | 1, hoge koopintentie |
| Zelf boekhouden of uitbesteden als zzp'er | `80762217-efb2-4b2a-91b3-b16f93f9eca5` | 2, overwogen |
| Aangifte inkomstenbelasting laten doen als zzp'er | `2e897d88-09d8-416d-8ca0-617a76bbf523` | 3, bestaande zwakke pagina |

Harde regels in orde: geen merknaam, geen concurrent bij naam; landelijk, dus geen plaatsnamen.
Uitgezet:

| Cluster | Vraag | Reden |
|---|---|---|
| 1 | "Als ik mijn administratie soms te laat aanlever, kan ik dan beter kiezen voor ... of voor losse hulp?" | Gekunstelde variant van het bezwaar "te laat aanleveren", dat in de drie clusters samen vijf keer terugkwam. |
| 1 | "Wat is voor een zzp'er voordeliger: zelf boekhouden met software of een online boekhouder?" | Hoort bij cluster 2, en staat daar vrijwel letterlijk ook. |
| 2 | "Wat gebeurt er als ik mijn bonnetjes ... te laat aanlever bij een online boekhouder, en betaal ik dan extra?" | Letterlijk dubbel met een andere vraag in hetzelfde cluster. |
| 3 | "Wat gebeurt er als ik mijn administratie te laat aanlever bij een boekhouder voor mijn zzp-aangifte ...?" | Letterlijk dubbel met een andere vraag in hetzelfde cluster. |
| 3 | "Hoe boek ik een boekhouder die mijn zakelijke administratie gebruikt om mijn aangifte ... te verzorgen?" | Krom; zo vraagt niemand het. |

Zelfde waarneming als bij klant A: een bezwaar uit het gesprek komt in de meetvragen te vaak terug
(hier "te laat aanleveren", vijf keer in 90 vragen).
