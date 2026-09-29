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

## 5. Meting en rapporten

Gemeten van 05:39 tot 06:53 (samen met klant C, de clusters na elkaar). Eén meettaak bleef na vier
pogingen mislukt (cluster 2); de rapporten kwamen er toch.

| Cluster | Score (marge) | Vragen zonder enige aanbieder | Aanbevelingen |
|---|---|---|---|
| 1, boekhouder met vaste prijs | 22 (8) | 2 | 4 |
| 2, zelf of uitbesteden | 9 (7) | 3 | 3 |
| 3, aangifte inkomstenbelasting | 23 (13) | 16 | 4 |

## 6. Het contentplan (tweede bewuste stop)

| Tijd (UTC) | Stap | Resultaat |
|---|---|---|
| 29-09 07:02 | Plan opgesteld | Negen pagina's in oktober. |
| 29-09 07:02 | Drie terug naar de voorraad | "Vergelijk zelf boekhouden met boekhouding uitbesteden" (cluster 3, prioriteit 3), "Aangiftehulp in februari tot april" (cluster 3, prioriteit 4), "Wat een persoonlijke boekhouder voor je doet" (cluster 1, prioriteit 4). |
| 29-09 07:02 | Oktober vrijgegeven | Zes pagina's in voorbereiding. |

| # | Pagina | Cluster | Keuze | Soort |
|---|---|---|---|---|
| 1 | Maak de vaste all-in prijs en inbegrepen aangiften direct duidelijk (`/prijzen/`) | 1 | prioriteit 1 | verbeteren |
| 2 | Vergelijk zelf boekhouden met uitbesteden | 1 | prioriteit 2 | nieuw |
| 3 | Maak de keuze tussen zelf doen, uitbesteden en combineren concreet | 2 | prioriteit 1 | nieuw |
| 4 | Leg helder uit wat volledig uitbesteden bij Myfinance inhoudt (`/online-boekhouder/`) | 2 | prioriteit 2 | verbeteren |
| 5 | Maak de pagina over aangiftehulp concreet en herkenbaar (kennisbankartikel) | 3 | prioriteit 1 | verbeteren |
| 6 | Leg prijs en inbegrepen hulp bij aangifte duidelijk uit | 3 | prioriteit 2 | nieuw |

⚠️ **Pagina 2 en 3 gaan over bijna hetzelfde** (zelf boekhouden of uitbesteden), elk uit een ander
cluster. De rapporten controleren niet op overlap met een ander cluster, en cluster 1 en 2 lagen
inhoudelijk dicht bij elkaar (een keuze bij het opzetten van deze ronde). Een consultant zou er in
de praktijk één laten vallen; de methode schrijft hier "de twee hoogst geprioriteerde, geen
handmatige selectie op iets anders" voor, dus beide staan erin. Dat maakt ook zichtbaar of de
schrijver twee pagina's over hetzelfde onderwerp van elkaar weet te onderscheiden.

Ook opvallend: de dunne pagina die ik voor cluster 3 in gedachten had (`/functies/jaarafsluiting-en-aangifte/`)
werd niet aanbevolen; het rapport koos een kennisbankartikel over hetzelfde onderwerp. Er zit dus
wel een verbeterpagina in cluster 3, alleen een andere dan verwacht.

## 7. De brief-vragen (§3 stap 6, §3.1)

Zes briefs tussen 07:02 en ongeveer 07:11. 25 unieke vragen (een deel geldt voor meerdere pagina's),
18 beantwoord, 7 overgeslagen, alle via `PATCH /api/profiles/<id>/facts` (HTTP 200). Rijkheid:
10 gemiddeld, 7 overgeslagen, 8 summier. De volledige tekst staat in `payloads/11-antwoorden.json`.

Beantwoord zoals een klant met profiel B dat doet: de werkwijze en de prijzen die op de site staan
(€69,95 all-in, software vanaf €10), zonder klantverhalen. Overgeslagen: vier vragen om een
klantvoorbeeld (profiel B gaf ook geen verhalen in het gesprek), een vraag naar een uiterste
aanlevertermijn, een vraag naar een prijs voor losse aangiftehulp die niet op de site staat, en een
vraag naar de voorwaarden van een lopende actie. Verzonnen bedrijfsregels die als echt kunnen
doorgaan: "een losse aangifte doen we niet", "het zzp-tarief is voor eenmanszaken zonder
personeel", "de tussenvorm prijzen we in het kennismakingsgesprek".

Alle twaalf pagina's (B en C) om 07:12 naar het schrijven: de twee met een publicatiedatum binnen tien
dagen vanzelf, de rest via `actie: schrijf_nu`.

## 8. Het schrijven

Alle zes klaar om 07:19. Vier herschreven en de herschrijving behouden (prijzenpagina, "zelf
boekhouden of uitbesteden", "zelf, combineren of uitbesteden", prijs van aangiftehulp); twee in één
keer goed (volledig uitbesteden, aangiftehulp). Twee pagina's hebben één zin die de klant nog moet
bevestigen. Nagerekend: de tekst in de app is bij alle zes byte voor byte gelijk aan de versie in
het klantdocument; niets gepubliceerd, niets als geplaatst gemarkeerd.

## 9. Kosten, nagerekend op `ai_calls`

| Post | Aanroepen | Werkelijk |
|---|---|---|
| Merkonderzoek | 18 | $0,14 |
| Drie clusters: vragen, meting, rapporten | 832 | $2,91 |
| Zes briefs | 6 | $0,37 |
| Schrijven, controle, herschrijven | 16 | $0,48 |
| **Samen** | 872 | **$3,90** |

## 10. Het klantdocument

`klantdocument-myfinance.md`, gebouwd met sjabloonversie 2 uit `data.json`. Leesdeel 8.642 woorden,
met eerdere versies van vier pagina's in de bijlage. Volgorde per cluster (prijs, zelf of
uitbesteden twee keer, volledig uitbesteden, aangifte twee keer).
