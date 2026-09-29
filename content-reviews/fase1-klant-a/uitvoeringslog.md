# Uitvoeringslog, contentkwaliteit fase 1 (klant A)

Intern document, niet voor de copywriter. Volgt `docs/contentkwaliteit-testmethode.md` §3 (stap 8)
en §3.1: elke stap met tijdstip, elke keuze, en elk verzonnen antwoord met zijn inputrijkheid
(rijk, gemiddeld, summier).

Uitgevoerd door Claude Code, 28 en 29 september 2026, via `npm run live` (`scripts/live.ts`) als
`e2e-consultant@orbit-test.nl` tegen productie (`https://geo-ten-blush.vercel.app`). Niets
rechtstreeks in de database geschreven, behalve de wachtwoordreset hieronder.

## 0. Voorbereiding

| Tijd (UTC) | Stap | Toelichting |
|---|---|---|
| 28-09 22:32 | Dagverbruik gecontroleerd | $2,83 over alle accounts vandaag, ruim onder de plafonds (€20 per account, €50 samen). |
| 28-09 22:34 | Wachtwoord van `e2e-consultant@orbit-test.nl` opnieuw gezet via Supabase | Er stond geen `LIVE_PASSWORD` in deze omgeving. Zelfde werkwijze als de ronde van 4 september (`docs/logbook.md`). Het nieuwe wachtwoord staat alleen in `.env.local`, buiten git. |
| 28-09 22:35 | Branch `claude/contentkwaliteit-fase1-klant-a` | Voor dit log, de payloads en het klantdocument. Geen productiecode gewijzigd. |

## 1. De bedrijfskeuze (§2.1)

**Gekozen: Slotenspecialist van Kessel, Houten** (`slotenspecialistvankessel.nl`).

Controles vóór het aanmaken:
- **Bestaat echt, site bereikbaar**: HTTP 200 op 28 september 2026, 29 pagina's in de sitemap,
  robots.txt staat alles toe. KvK 42023906, Tingietersgilde 16 in Houten, 030-2660400.
- **Geen overlap** met wat in de database staat: hovenier, installateur, rijschool, fysiotherapie,
  autodealer (twee keer). Ook niet met de eerdere rondes (dakdekker, tweede fysiopraktijk, retail).
- **Past bij profiel A** (rijk, lokaal): werkt vanuit Houten binnen ongeveer een uur rijden
  (Houten, Utrecht, Nieuwegein, Zeist, Bunnik, IJsselstein, Vianen). Veel concreet bewijs op de site
  zelf: vaste prijzen per klus (€98,50 voorrijden en arbeid, cilinders €141 en €171), 5,0 uit ruim
  290 Google-reviews, NSSG en European Locksmith Federation, familiebedrijf sinds 1999, overgenomen
  door de zoon in 2020, en een openlijk uitgelegde keuze om géén PKVW-keurmerk te voeren. Dat geeft
  een rijk gesprek een geloofwaardige basis.
- **Geschikt voor de drie clusters uit §2.2**: een echte spoedvraag (buitengesloten), een overwogen
  aankoop met veel uitlegbehoefte (slim deurslot), en een dunne bestaande dienstpagina
  (`inbraakbeveiliging.html`, 366 woorden, grotendeels algemene zinnen).

Overwogen en afgevallen: Lockit Rotterdam (sterk, maar meer een grote winkel dan een ambachtelijk
verhaal) en diverse "slotenmaker [plaats]"-sites die bij nader inzien landelijke doorschakelpartijen
zijn. Die laatste passen niet bij "lokaal".

## 2. Stappen

| Tijd (UTC) | Stap | Resultaat |
|---|---|---|
| 28-09 22:36 | `POST /api/profiles` met naam, webadres en vier andere schrijfwijzen | HTTP 201, profiel `7f889ffa-2d1b-4984-9822-105a1f8dea5f`. Onderzoek start vanzelf. |
| 28-09 22:36 tot 22:42 | Onderzoek liep vanzelf door | Negen stappen, nul mislukt, ongeveer zes minuten. 29 pagina's, 13 diensten, 8 voorgestelde onderwerpen, 4 concurrenten (U-Sloten, LockTight en twee "Slotenmaker Utrecht"-sites). Kennistest: ChatGPT herkent het merk bij 3 van 6 vragen en noemt het bij 3 van 3 koopvragen. Vier open punten voor het gesprek: prijzen van advies, montage en reparaties; het assortiment; het werkgebied per plaats; de prijs van het slimme slot. |
| 28-09 22:43 | `PATCH /api/profiles/<id>` met bron `gesprek` | HTTP 200. Alle commerciële velden, "Verhalen" (3.169 tekens), drie stemvoorbeelden. Payload: `payloads/02-gesprek.json`. |
| 28-09 22:43 | `PUT /api/profiles/<id>/strategy` | HTTP 200, gesprek vastgelegd met een korte consultantnotitie (`payloads/03-gesprek-vastleggen.json`). Geen contextfactoren. |
| 28-09 22:44 | Controle op de opgeslagen velden | Alle drie de stemvoorbeelden opgehaald zonder fout; elk is afgekapt op 2.000 tekens. Aanspreekvorm "je" (de site gebruikt overal "je"). |

## 3. Het gesprek: wat van de site komt en wat verzonnen is (§3.1)

Contactpersoon bewust leeg gelaten, net als in de benchmarkronde: een naam en e-mailadres
verzinnen bij een echt bedrijf hoort niet in een testronde.

**Van de site overgenomen, niet verzonnen**: oprichting 1999 door Emiel, overname 2020 door Jesse,
NSSG en ELF, geen PKVW en de reden daarvoor (Emiel gaf zelf PKVW-cursussen), de vaste prijs van
€98,50 voorrijden en arbeid, alleen cilinders vanaf SKG**, KFV in de bus en Fuhr en BUVA in de
werkplaats, Tedee PRO alleen met montage, gratis deurcheck, werkgebied binnen ongeveer een uur rijden.

**Verzonnen, met inputrijkheid per veld:**

| Veld | Wat er verzonnen is | Rijkheid |
|---|---|---|
| `priority_offerings` | Vier diensten, keuze en volgorde van de klant | rijk |
| `deprioritised_offerings` | Kluisservice en auto opening, met reden | gemiddeld |
| `growth_regions` | Utrecht, Nieuwegein, Zeist, Leidsche Rijn (alle vier al in het werkgebied van de site) | gemiddeld |
| `target_segments` | Vier groepen, waaronder "voordeur van vóór 2000" | rijk |
| `deal_value_band` | klein | summier |
| `seasonality` | Pieken rond feestdagen en zomervakantie, najaar voor beveiliging | gemiddeld |
| `sales_objections` | Vijf letterlijke bezwaren, waaronder de ervaring met een doorschakelpartij en "geen PKVW, is dat veilig?" | rijk |
| `forbidden_topics` | Openen zonder bewijs van bewoning, verzekeringskorting, alarm en camera's | rijk |
| `offline_proof` | Jesse liep mee vanaf zijn zestiende, legitimatie bij elke opening, prijs aan de telefoon blijft staan (de laatste twee sluiten aan op de site, de eerste is verzonnen) | rijk |
| `name_exclusions` | Slotenmakers "in Kessel" (Limburg) en Kessel-Lo, gevonden met een zoekopdracht | gemiddeld |
| `goal_12m` | Net zo bekend in Utrecht en Nieuwegein als in Houten | rijk |
| `taboo_phrases` | Vijf woorden, waaronder "binnen 15 minuten", "100% inbraakveilig", "vanaf 49 euro" | rijk |
| `differentiator` | Vaste prijs, geen uurtarief, de vakman die je spreekt komt ook (volgt de site) | rijk |
| `verhalen`, oorsprong | Garagebox met bus en sleutelmachine, eerst werk voor aannemers en corporaties | rijk |
| `verhalen`, klus 1 | Buitensluiting in Houten-Zuid om half elf 's avonds, €135 (binnen de avondbandbreedte van de site), veertig minuten, pick-set, daarna SKG***-cilinder | rijk |
| `verhalen`, klus 2 | VvE in Nieuwegein, zestien deuren met een meerpuntssluiting die niet meer gemaakt wordt, gerepareerd in plaats van vervangen | rijk |
| `verhalen`, klus 3 | Kerntrekinbraak in Zeist, dezelfde avond SKG***-cilinder met kerntrekbeveiliging | rijk |
| `verhalen`, werkwijze en twijfel | "Stuur een foto via WhatsApp", liever repareren | rijk |
| `verhalen`, bewust niet | Geen alarm, geen merkloze cilinders, geen opening zonder bewijs, geen PKVW | rijk |
| `verhalen`, tip | Cilinder die uit het beslag steekt | gemiddeld |
| `verhalen`, open punten van het onderzoek | Advies en montage tegen hetzelfde vaste tarief plus materiaal (afgeleid van de tarievenpagina, geen nieuw bedrag); Tedee-prijs pas na een foto (bewust geen bedrag verzonnen); werkgebied; assortiment | gemiddeld |

## 4. De clusters en de meetvragen (§2.2, eerste bewuste stop)

| Tijd (UTC) | Stap | Resultaat |
|---|---|---|
| 28-09 22:44 | Drie clusters via `POST /api/analyses`, elk met een content-brief in de woorden van de klant (`payloads/04` tot en met `06`) | HTTP 201 alle drie. |
| 28-09 22:46 | Meetvragen klaar | 30 per cluster, status "concept klaar", in ongeveer 2,5 minuut. |
| 28-09 22:46 | Alle 90 vragen gelezen | Zie hieronder. |
| 28-09 22:47 | Vijf vragen uitgezet via `PATCH .../prompts/<id>` met `active: false` | HTTP 200 alle vijf. |
| 28-09 22:47 | `POST /api/analyses/<id>/confirm` voor alle drie | Meting gestart op 28, 29 en 28 vragen (128, 132 en 128 metingen ingepland). |

| Cluster | Analyse-id | Soort (§2.2) | Waarom dit cluster |
|---|---|---|---|
| Buitengesloten? Deur laten openen | `05e92973-ea28-4304-ab4d-460bdbfb8fca` | 1, spoed | Korte klantreis, de koopvraag waarbij doorschakelpartijen met lokprijzen concurreren; veel concreet bewijs nodig (prijs vooraf, aankomsttijd). |
| Slim slot laten installeren voor toegang zonder gewone sleutel | `c93282b8-debe-40be-b271-60921b0ee6e3` | 2, overwogen | Lange oriëntatie met veel twijfels (veiligheid, batterij, zelf monteren), en de site noemt geen prijs. |
| Woning beter beveiligen tegen inbraak | `2920c40d-6d78-43f8-a2d5-ef6d2e65b5ac` | 3, bestaande zwakke pagina | `inbraakbeveiliging.html` bestaat, heeft 366 woorden en vooral algemene zinnen. |

**De controle van de consultant.** Harde regels in orde bij alle 90: geen eigen merknaam, geen
concurrent bij naam, elke vraag noemt een plaats uit het werkgebied (inclusief De Bilt en Maarssen,
die het onderzoek aan het werkgebied toevoegde en die binnen een uur rijden liggen), en elk cluster
heeft minstens één vraag over een bezwaar uit het gesprek. Uitgezet:

| Cluster | Vraag | Reden |
|---|---|---|
| 1 | "Welke slotenmaker in IJsselstein vraagt om bewijs dat ik op het adres woon voordat hij mijn deur opent?" | Spiegelt een werkwijze uit het gesprek terug die een echte gebruiker niet als zoekvraag stelt. Laat je hem staan, dan meet de ronde deels zijn eigen gesprek. |
| 1 | "Wie kan in Nieuwegein snel een deur openen en vraagt vooraf om bewijs dat ik er woon?" | Zelfde reden. |
| 2 | "Welk type specialist kan in Leidsche Rijn beoordelen of mijn cilinder en veiligheidsbeslag geschikt zijn voor een slim slot?" | Vijfde variant van dezelfde vraag (geschiktheid van cilinder en beslag). |
| 3 | "Kan ik in Nieuwegein zelf een slim slot op mijn voordeur monteren, of is professionele montage verstandiger ...?" | Hoort bij cluster 2; zou twee rapporten naar dezelfde pagina laten wijzen. |
| 3 | "Als een slotenmaker in Zeist zegt dat mijn deur opengeboord moet worden om de beveiliging te verbeteren ...?" | Inhoudelijk onlogisch: openboren hoort bij een noodopening, niet bij beveiligen. |

Wat opviel en de moeite van het onthouden waard is: het gesprek werkt zichtbaar door in de meting.
Het bezwaar "ik heb 400 euro betaald aan een slotenmaker die zich als lokaal voordeed" komt in
cluster 1 en 3 bijna letterlijk terug, net als "is SKG*** niet overdreven voor een rijtjeswoning" en
de PKVW-vraag. Dat is precies de bedoeling (§9 van `zo-werkt-orbit-engine.md`: minstens één
bezwaarvraag), maar het laat ook zien hoe makkelijk een verkoopargument in de meetlat sluipt: twee
van de vijf uitgezette vragen hadden die oorsprong.

## 5. De meting en de rapporten

| Tijd (UTC) | Stap | Resultaat |
|---|---|---|
| 28-09 22:47 tot 23:33 | Meting | De clusters werden na elkaar gemeten, ongeveer tien minuten per cluster, plus herkansingen. |
| 28-09 22:5x | Herkansingen | Tien meettaken (vooral Google AI Overview) kregen van het model een antwoord dat geen geldige JSON was ("We need ou..."). Zeven lukten bij een herkansing; drie in cluster 2 bleven na vier pogingen mislukt. Het rapport kwam er toch. Niet ingegrepen. |
| 28-09 23:21 | Rapport cluster 1 | Score 21 (marge 8), 7 aanbevelingen. |
| 28-09 23:22 | Rapport cluster 3 | Score 19 (marge 8), 4 aanbevelingen. |
| 28-09 23:31 | Rapport cluster 2 | Score 36 (marge 11), 10 vragen waarop de AI geen enkele aanbieder noemt, **1 aanbeveling**. |

**Bevinding over de rapporten.** Van de twaalf aanbevelingen zijn er elf "verbeter een bestaande
pagina", en daarvan zeven een plaatspagina (Houten, Leidsche Rijn, Zeist twee keer, Nieuwegein twee
keer, Bunnik, Utrecht). Twee plaatspagina's (Zeist en Nieuwegein) worden door twee clusters tegelijk
aanbevolen, elk met een andere invalshoek. Er is precies één nieuwe pagina aanbevolen (IJsselstein).

## 6. Het contentplan (tweede bewuste stop)

| Tijd (UTC) | Stap | Resultaat |
|---|---|---|
| 28-09 23:38 | `POST /api/profiles/<id>/plan` | Plan met tien pagina's in oktober (pakket van het testaccount is 10 per maand). |
| 28-09 23:38 | Vier niet-gekozen pagina's terug naar de voorraad (`actie: naar_voorraad`) | Zeist, Leidsche Rijn, Bunnik, Utrecht. Oktober bevat daarna precies de zes gekozen pagina's, met publicatiedata 1, 6, 12, 17, 23 en 28 oktober. |
| 28-09 23:38 | Maand oktober vrijgegeven (`actie: goedkeuren`) | HTTP 200, zes pagina's in voorbereiding. |

**De selectie.**

| # | Pagina | Cluster | Keuze | Soort |
|---|---|---|---|---|
| 1 | Maak de Tedee PRO-pagina het duidelijke antwoord op twijfels over slim slot en montage | 2 | prioriteit 1 (de enige) | verbeteren |
| 2 | Maak de noodopeningspagina concreet over prijs, aankomsttijd en werkwijze | 1 | prioriteit 1 | verbeteren |
| 3 | Maak de pagina over inbraakbeveiliging echt praktisch | 3 | prioriteit 1 | verbeteren (de dunne pagina uit §2.2) |
| 4 | Versterk de spoedpagina voor Houten met vooraf afgesproken totaalprijs | 1 | prioriteit 2 | verbeteren |
| 5 | Maak de pagina voor Nieuwegein duidelijker over hulp en kosten | 3 | prioriteit 2 | verbeteren |
| 6 | Maak een aparte pagina over spoedhulp bij een defect slot in IJsselstein | 1 | aanvulling, prioriteit 6 | nieuw |

⚠️ **Twee afwijkingen van de methode, allebei bewust.**
1. **Cluster 2 heeft maar één pagina.** Het rapport gaf maar één aanbeveling (het merk scoort daar
   al het best). Naar het precedent van de benchmarkronde (§5 daarvan) is er niets verzonnen en is
   aangevuld uit een ander cluster van hetzelfde merk. De test uit §2.3 ("lijkt het tweede artikel op
   het eerste?") kan voor cluster 2 dus niet; voor cluster 1 en 3 wel.
2. **De aanvulling is niet de eerstvolgende op prioriteit.** Dat zouden de Leidsche Rijn-pagina
   (cluster 1) of de Zeist-pagina (cluster 3) zijn, allebei prioriteit 3 en allebei weer een
   verbeterpagina. Gekozen is de enige nieuwe pagina uit alle drie de rapporten, omdat §2.2 juist
   wil dat beide paden (nieuwe pagina en verbeterpagina, hoofdstuk 11 en 13) in de matrix zitten.
   Zonder deze keuze waren het zes verbeterpagina's geweest. Het gevolg: cluster 1 levert drie
   pagina's, cluster 3 twee, cluster 2 één.

## 7. De brief-vragen (§3 stap 6, §3.1)

| Tijd (UTC) | Stap | Resultaat |
|---|---|---|
| 28-09 23:39 tot 23:44 | Zes briefs gemaakt, na elkaar | $0,06 tot $0,09 per brief. Vragen per pagina (inclusief de vaste open vraag): Tedee 7, noodopening 5, inbraakbeveiliging 5, Houten 5, Nieuwegein 10, IJsselstein 5. Acht vragen gelden voor twee of drie pagina's tegelijk. |
| 28-09 23:45 | 23 antwoorden via `PATCH /api/profiles/<id>/facts` | 22 beantwoord, 1 overgeslagen, alle HTTP 200. |
| 28-09 23:47 | 5 antwoorden voor IJsselstein | Alle HTTP 200. |
| 28-09 23:47 | Tedee en noodopening gingen vanzelf schrijven (publicatiedatum binnen tien dagen); de andere vier via `actie: schrijf_nu` | HTTP 200. |

**Bevinding over de briefs.** De vier gerichte vragen voor IJsselstein zijn inhoudelijk dezelfde als
vragen die eerder die avond al voor de noodopening, Houten en Nieuwegein gesteld en beantwoord waren
(prijs, werkwijze bij een defect slot, wanneer niet), alleen met de plaatsnaam erin. De ontdubbeling
tussen briefs (hoofdstuk 13: "zo ziet elke volgende brief welke vragen er al gesteld zijn") vangt een
herformulering met een plaatsnaam niet. Een echte klant krijgt dan twee keer dezelfde vraag; ik heb
ze als klant korter beantwoord, en dat is in de rijkheid hieronder te zien.

**Elk antwoord, met rijkheid.** De volledige tekst staat in `payloads/11-antwoorden.json` en
`payloads/12-antwoorden-ijsselstein.json`. "Van de site" betekent dat de feiten in het antwoord
letterlijk op de site staan; de rest is verzonnen in de stem van Jesse van Kessel.

| Pagina | Vraag (soort) | Rijkheid | Wat is verzonnen |
|---|---|---|---|
| Tedee | open vraag | rijk | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| Tedee | praktijk | rijk | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| Tedee | prijs | gemiddeld | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| Tedee | werkwijze | rijk | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| Tedee | werkwijze | gemiddeld | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| Tedee | voor wie niet | rijk | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| Tedee | termijn | overgeslagen | Alleen te beantwoorden met een verzonnen duur en wachttijd, die als echte termijn zou kunnen doorgaan. |
| Noodopening | open vraag | rijk | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| Noodopening, Houten, Nieuwegein | prijs (van de site) | rijk | feiten van de site, verwoording verzonnen |
| Noodopening | praktijk | rijk | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| Noodopening, Houten, Nieuwegein | werkwijze | rijk | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| Noodopening, Houten | voor wie niet | rijk | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| Inbraakbeveiliging | open vraag | rijk | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| Inbraakbeveiliging, Nieuwegein | werkwijze | rijk | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| Inbraakbeveiliging, Nieuwegein | praktijk | rijk | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| Inbraakbeveiliging, Nieuwegein | prijs | gemiddeld | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| Inbraakbeveiliging, Nieuwegein | onderscheid (van de site) | rijk | feiten van de site, verwoording verzonnen |
| Houten | open vraag | rijk | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| Houten | werkwijze | rijk | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| Nieuwegein | open vraag | rijk | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| Nieuwegein | praktijk | rijk | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| Nieuwegein | termijn | summier | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| Nieuwegein | voor wie niet | rijk | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| IJsselstein | open vraag | gemiddeld | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| IJsselstein | praktijk | rijk | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| IJsselstein | prijs (van de site) | gemiddeld | feiten van de site, verwoording verzonnen |
| IJsselstein | werkwijze | gemiddeld | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |
| IJsselstein | voor wie niet | summier | verhaal, werkwijze of voorbeeld verzonnen, geen nieuwe bedragen |

Overgeslagen: één vraag (Tedee, montageduur en wachttijd), omdat er alleen met een verzonnen termijn
op te antwoorden viel. Twee prijsvragen (veiligheidsbeslag en Tedee) zijn wel beantwoord, maar
zonder bedrag: met de prijsopbouw en waar de prijs van afhangt. Dat is wat deze klant volgens het
gesprek ook echt zou zeggen ("prijs pas na een foto").

Enkele concrete details in de verhalen zijn verzonnen en zouden bij publicatie als echt kunnen
doorgaan: "veertig minuten" (twee keer), "tien minuten werk", "Nieuwegein is een kwartiertje
rijden", de Tedee-batterijmelding en het opladen, en het voorbeeld van €171 in Nieuwegein (dat
bedrag zelf staat op de site). Dat is de reden dat deze pagina's nooit gepubliceerd worden (§3.1).


## 8. Het schrijven

| Tijd (UTC) | Pagina | Verloop | Behouden versie | Woorden | Te bevestigen zinnen |
|---|---|---|---|---|---|
| 28-09 23:48 tot 23:50 | Tedee PRO | oordeel "niet goed", herschreven | herschreven | 805 | 0 |
| 28-09 23:48 tot 23:49 | Noodopening | oordeel "goed", maar één onbewezen zin, herschreven | herschreven | 566 | 0 |
| 28-09 23:49 tot 23:52 | Inbraakbeveiliging | oordeel "niet goed", herschreven | herschreven (2 onbewezen zinnen in plaats van 3) | 967 | 2 |
| 28-09 23:50 | Houten | oordeel "goed", geen herschrijving | eerste | 582 | 0 |
| 28-09 23:50 tot 23:52 | Nieuwegein | oordeel "niet goed", herschreven | herschreven (1 in plaats van 2) | 770 | 1 |
| 28-09 23:49 tot 23:52 | IJsselstein | oordeel "niet goed", herschreven | **eerste**: de herschrijving had één onbewezen zin meer en is weggegooid | 663 | 0 |

Alle zes staan op "Lees en keur goed". Niets goedgekeurd, niets als geplaatst gemarkeerd, niets
gepubliceerd (nagerekend: `published_at`, `published_url`, `posted_at` en `posted_url` leeg bij
alle zes). E-mail staat standaard uit; er is geen contactpersoon ingevuld.

**De eerste versie bleef bewaard, ook waar hij in de app overschreven werd.** De herschrijving
schrijft over dezelfde rij heen, maar elke aanroep bewaart zijn volledige uitvoer (conventie 8).
Nagerekend: de opgeslagen tekst is bij alle zes byte voor byte gelijk aan de uitvoer van de
behouden versie. Beide versies zijn opgehaald via `GET /api/beheer/spoor/<profiel>` (de
beheerroute voor precies dit doel), niet met de hand overgenomen.

## 9. Kosten en doorlooptijd, nagerekend op `ai_calls`

| Post | Aanroepen | Werkelijk | Schatting §3 (voor een derde van de matrix) |
|---|---|---|---|
| Merkonderzoek | 18 | $0,13 | $0,25 |
| Drie clusters: vragen, meting (ChatGPT en Google AI Overview), rapporten | 832 | $2,99 (ongeveer $1,00 per cluster) | $2,46 ($0,82 per cluster) |
| Zes briefs | 6 | $0,43 ($0,07 per pagina) | in de $0,90 per pagina |
| Zes keer schrijven, zes controles, vijf herschrijvingen | 17 | $0,78 ($0,13 per pagina) | in de $0,90 per pagina |
| **Samen** | 873 | **$4,34** | $8,11 (ongeveer €7 à €8) |

Daarnaast 14 aanroepen zonder merkverwijzing op hetzelfde account ($0,007, vragenkalibratie); met
die erbij $4,35. Geen andere kosten op dit account in dezelfde periode.

Het dagplafond is nooit in de buurt gekomen: ruim onder €20 voor dit account, en rond $7 over alle
accounts samen op 28 september.

**Doorlooptijd in de app**: 76 minuten van merk aanmaken (22:36) tot zes pagina's klaar (23:52).
Daarvan onderzoek 6 minuten, meetvragen 2,5 minuut, meting en rapporten 46 minuten (inclusief
herkansingen), briefs 5 minuten, schrijven 5 minuten. Het werk eromheen (bedrijf kiezen, gesprek en
antwoorden verzinnen, vragen nalezen, document bouwen) kostte meer tijd dan de app zelf.

## 10. Bevindingen over de pijplijn, voor later (niet opgelost, niet aangeraakt)

Dit zijn waarnemingen tijdens de uitvoering, geen oordeel over de teksten. Die komt van de
copywriter.

1. **Cluster 2 leverde één aanbeveling.** Het merk scoort daar al het best (36, met 10 vragen waarop
   de AI geen aanbieder noemt). Voor een testmatrix met "twee per cluster" is dat een realistisch
   risico dat §2.3 niet benoemt.
2. **Elf van de twaalf aanbevelingen zijn verbeterpagina's**, zeven daarvan een plaatspagina, en
   twee plaatspagina's worden door twee clusters tegelijk aanbevolen.
3. **De ontdubbeling tussen briefs mist herformuleringen met een plaatsnaam** (§7 hierboven).
4. **Tien meettaken kregen een antwoord dat geen geldige JSON was** ("We need ou..."), vooral bij
   Google AI Overview; drie bleven na vier pogingen mislukt.
5. **Vijf van de zes pagina's werden herschreven**, één herschrijving werd weggegooid. Bij het zelf
   lezen van pagina 2 viel op dat de herschrijving drie bruikbare veelgestelde vragen liet vallen en
   één vreemde toevoegde ("Zijn €141 en €171 ook de prijzen voor een noodopening?"), en dat er
   defensieve zinnen bij kwamen ("geen aankomsttijd die we kunnen toezeggen zonder je te spreken").
   Of dat de copywriter ook opvalt, is precies wat de ronde moet uitwijzen.

## 11. Sjabloon versie 2 (29 september 2026)

Na overleg met de eigenaar zijn de voorstellen uit `beoordeling-sjabloon-en-rubriek.md` verwerkt in
§4 van de methode (versie 2), plus de regel voor clusters met minder dan twee aanbevelingen in §2.3.
Het klantdocument is met versie 2 opnieuw opgebouwd uit hetzelfde `data.json`, zonder nieuwe
AI-aanroepen: leesdeel 13.013 woorden (was 17.251), eerdere versies van vier pagina's in een
bijlage. Het script staat nu op `content-reviews/maak_klantdocument.py`, gedeeld met klant B en C.
