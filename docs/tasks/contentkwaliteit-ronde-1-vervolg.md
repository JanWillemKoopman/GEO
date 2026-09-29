# Contentkwaliteit ronde 1: van achttien pagina's naar verbeteringen

> **Wat dit is.** Het plan voor alles wat na 29 september 2026 nog moet gebeuren met de eerste
> ronde van `docs/contentkwaliteit-testmethode.md`: versturen, feedback verwerken, patronen
> vaststellen, verbeteren en verifiëren. Plus de waarnemingen die tijdens het uitvoeren opvielen,
> met per waarneming wat we ermee doen en wanneer. Dit bestand verdwijnt zodra de ronde is afgerond;
> de uitkomst gaat dan als rij naar §9 van de methode en als alinea naar `docs/logbook.md`.
>
> **Wie wat doet.** De eigenaar: versturen, contact met de copywriter, besluiten. Claude Code:
> voorbereiden, analyseren, voorstellen, bouwen na akkoord, verifiëren.

---

## 0. Waar we staan (29 september 2026)

> **Bijgewerkt 29 september 2026:** de feedback op alle drie de documenten is binnen
> (`content-reviews/ronde-1-feedback/`). Stap 2 en 3 zijn gedaan; het concept voor stap 4 staat in
> `content-reviews/ronde-1-patronen.md`, met de ingevulde matrix. Open: of de beoordeling door een
> mens of door een AI is gedaan, en de publiceer-keuzes van klant B.

De drie klanten zijn doorlopen via de gewone routes van de app, achttien pagina's zijn geschreven,
niets is gepubliceerd. Alle drie de klantdocumenten zijn gebouwd met sjabloonversie 2 van §4.

| Klant | Profiel | Bedrijf | Pagina's | Kosten (`ai_calls`) | Map |
|---|---|---|---|---|---|
| A | rijk, lokaal | Slotenspecialist van Kessel, Houten | 6 | $4,34 | `content-reviews/fase1-klant-a/` |
| B | gemiddeld, landelijk | Myfinance, Hilversum | 6 | $3,90 | `content-reviews/fase2-klant-b/` |
| C | zwak, lokaal | Ongediertebestrijding De Waard, Streefkerk | 6 | $3,96 | `content-reviews/fase2-klant-c/` |
| **Samen** | | | **18** | **$12,20** | |

Per map: het klantdocument (voor de copywriter), `uitvoeringslog.md` (intern: elke stap en elk
verzonnen antwoord met zijn rijkheid), `data.json` en `payloads/` (de ruwe gegevens).

**Eén afwijking van de methode in de volgorde.** §2 wilde klant A eerst alleen naar de copywriter
sturen en pas daarna B en C draaien. Samen met de eigenaar is besloten B en C meteen te draaien,
omdat het maken van de pagina's niet afhangt van het sjabloon: het sjabloon raakt alleen het
document, en dat is zonder kosten opnieuw op te bouwen. Zegt de copywriter bij A iets over het
sjabloon, dan bouwen we de documenten van B en C opnieuw op vóór ze de deur uit gaan (stap 1).

---

## 1. Wat vastligt tot de feedback binnen is

**De schrijfpijplijn blijft ongewijzigd** tot de drie ingevulde documenten terug zijn en het
patronen-document (stap 4) klaar is. Reden: de achttien pagina's moeten allemaal met dezelfde
versie van de keten gemaakt zijn, en de verificatie in §8 vergelijkt oud met nieuw. Een wijziging
tussendoor maakt beide onmogelijk. Dat geldt ook voor de waarnemingen in §3 hieronder: het zijn
vermoedens die we tegen de feedback leggen, geen reparaties die al klaarliggen.

Uitzondering: een fout die niets met de kwaliteit van de tekst te maken heeft en de keten stuk
maakt (een pagina die niet geschreven kan worden) mag altijd gerepareerd worden. Daar is in deze
ronde niets van gebleken.

---

## 2. De stappen, in volgorde

### Stap 1. Versturen (eigenaar)

- [ ] **Eerst A, dan B en C, of alle drie tegelijk.** Tegelijk is sneller. Eerst A is
  voorzichtiger: dan kan een opmerking over het sjabloon nog verwerkt worden in B en C. Advies:
  **eerst A**, met de vraag of het document duidelijk genoeg is, en B en C zodra hij met A begonnen
  is en niets terugvraagt.
- [ ] **Wat je verstuurt:** per klant alleen het klantdocument. Niet het uitvoeringslog, niet de
  andere bestanden: de copywriter oordeelt als lezer, niet als tester (§4, laatste opmerking).
  - A: `content-reviews/fase1-klant-a/klantdocument-slotenspecialist-van-kessel.md`
  - B: `content-reviews/fase2-klant-b/klantdocument-myfinance.md`
  - C: `content-reviews/fase2-klant-c/klantdocument-ongediertebestrijding-de-waard.md`
- [ ] **Wat je erbij zegt:** zo weinig mogelijk, want het document moet zelfstandig werken. Wel
  praktisch: de verwachte tijd (een paar uur per document), wanneer je het terug wilt, en dat hij
  het bestand gewoon ingevuld terugstuurt. Vraag hem expliciet te noteren waar hij iets niet
  begreep of had willen vragen; dat is de toets van het sjabloon.
- [ ] **Noteer** de verzenddatum per document in §9 van de methode.

*Klaar als:* drie documenten verstuurd, datum genoteerd.

### Stap 2. De toets van het sjabloon (eigenaar en Claude Code, zodra A terug is)

De drie vragen uit §2 fase 1 van de methode, nu beantwoord met de echte copywriter:

- [ ] Moest hij iets terugvragen, of liep hij ergens op vast?
- [ ] Is de feedback specifiek (wat hij zou aanpassen of toevoegen), of vooral cijfers?
- [ ] Hoeveel tijd kostte het hem per document?

Blijkt het sjabloon op een punt niet te werken: aanpassen in §4 als versie 3, vastleggen in §9, en
de nog niet verstuurde documenten opnieuw opbouwen met `content-reviews/maak_klantdocument.py`
(kost niets, geen nieuwe AI-aanroepen).

*Klaar als:* de drie vragen beantwoord in §9; eventueel versie 3 vastgelegd.

### Stap 3. Feedback binnenhalen (Claude Code)

- [ ] De ingevulde documenten in de repo zetten, naast het origineel, als
  `klantdocument-...-ingevuld.md` in dezelfde map.
- [ ] Per pagina de cijfers, de publiceer-keuze en de schets overnemen in één tabel (de matrix van
  §6 punt 1), samen met de interne gegevens uit de logs: inputrijkheid, of de pagina herschreven
  is, of het een nieuwe pagina of een verbeterpagina is.

De matrix staat hieronder al voorbereid; alleen de kolommen van de copywriter zijn nog leeg.

| # | Klant | Cluster | Pagina | Soort | Input (open vraag, gerichte vragen beantwoord) | Herschreven | Copywriter (6 cijfers) | Publiceerbaar |
|---|---|---|---|---|---|---|---|---|
| A1 | A | slim slot | Tedee PRO laten monteren zonder zelf aan de cilinder te werken | verbeteren | rijk; 5 van 6 | ja | | |
| A2 | A | buitengesloten | Buitengesloten in Utrecht? Noodopening met prijs en aankomsttijd vooraf | verbeteren | rijk; 4 van 4 | ja | | |
| A3 | A | inbraakbeveiliging | Je voordeur beter beveiligen: wat moet er echt vervangen worden? | verbeteren | rijk; 4 van 4 | ja | | |
| A4 | A | buitengesloten | Buitengesloten in Houten? Spreek vooraf de totaalprijs af | verbeteren | rijk; 4 van 4 | nee | | |
| A5 | A | inbraakbeveiliging | Slotenmaker in Nieuwegein: hulp en kosten vooraf | verbeteren | rijk; 9 van 9 | ja | | |
| A6 | A | buitengesloten (aanvulling) | Spoedhulp bij een defect slot in IJsselstein | nieuw | gemiddeld; 7 van 7 | ja, weggegooid | | |
| B1 | B | vaste prijs | Online boekhouder voor zzp'ers: vaste maandprijs inclusief aangiften | verbeteren | gemiddeld; 5 van 7 | ja | | |
| B2 | B | vaste prijs | Zelf boekhouden of uitbesteden: wat past bij jou? | nieuw | summier; 6 van 7 | ja | | |
| B3 | B | zelf of uitbesteden | Zelf boekhouden, combineren of uitbesteden? | nieuw | gemiddeld; 4 van 5 | ja | | |
| B4 | B | zelf of uitbesteden | Boekhouding volledig uitbesteden | verbeteren | gemiddeld; 7 van 8 | nee | | |
| B5 | B | inkomstenbelasting | Aangifte inkomstenbelasting voor zzp'ers | verbeteren | gemiddeld; 4 van 6 | nee | | |
| B6 | B | inkomstenbelasting | Wat kost hulp bij je aangifte inkomstenbelasting als zzp'er? | nieuw | summier; 4 van 7 | ja | | |
| C1 | C | wespennest | Wespenbestrijding: een afspraak maken en weten wat het kost | verbeteren | summier; 3 van 7 | nee | | |
| C2 | C | Aziatische hoornaar | Aziatische hoornaar in de Krimpenerwaard: wat doet u bij een nest? | verbeteren | summier; 1 van 4 | nee | | |
| C3 | C | Aziatische hoornaar | Determinatie: gratis beoordeling van een mogelijk hoornaarnest | verbeteren | summier; 2 van 7 | nee | | |
| C4 | C | mollen | Wat kost mollenbestrijding? | verbeteren | leeg; 1 van 5 | ja | | |
| C5 | C | mollen | Mollenbestrijding aanvragen voor uw tuin | nieuw | summier; 2 van 8 | nee | | |
| C6 | C | mollen (aanvulling) | Mollen in de tuin: zelf iets doen of hulp inschakelen? | verbeteren | leeg; 2 van 6 | nee | | |

"Input" is de rijkheid van wat de klant aanleverde voor deze pagina, uit de logs (§2.1 en §3.1 van
de methode). Het precieze antwoord per vraag staat in `payloads/11-antwoorden*.json` per klant.

*Klaar als:* de matrix is compleet ingevuld en in dit bestand of in het patronen-document gezet.

### Stap 4. Het patronen-document (eigenaar en Claude Code samen, §6 van de methode)

- [ ] Patronen zoeken met de zeef van §6: **een patroon telt alleen als het bij minstens twee van de
  drie klanten voorkomt**, ongeacht de inputrijkheid. Hooguit vijf, "geen overtuigend patroon" is
  een geldige uitkomst.
- [ ] Bij elk patroon de inputrijkheid ernaast leggen: een klacht die ook bij rijke input (A)
  opduikt, wijst naar de pijplijn; een klacht die alleen bij C opduikt, eerst naar de input.
- [ ] De waarnemingen uit §3 hieronder erbij houden: bevestigt de copywriter er een, dan is de
  vermoedelijke oorzaak al beschreven. Bevestigt hij er geen, dan laten we die waarneming los. We
  bouwen niets op een vermoeden dat de copywriter niet deelt.
- [ ] Opslaan als `content-reviews/ronde-1-patronen.md` volgens het sjabloon in §6.

*Klaar als:* het patronen-document staat, met hooguit vijf patronen, elk gekoppeld aan één
bestaande stap, of met de conclusie dat er geen overtuigend patroon is.

### Stap 5. Verbeteren (Claude Code, na akkoord van de eigenaar, §7 van de methode)

De verbeterpunten staan in §7 hieronder (K1 tot en met K5), met de volgorde en de toetsen.

- [ ] Per patroon eerst nalezen hoe de betrokken stap nu is ingericht (instructie, prompt,
  controle, bestand), en een wijziging voorstellen **binnen** die stap: geen nieuwe stap, geen
  nieuwe AI-aanroep, geen score op de tekst, geen extra controlelaag (§0 en §7).
- [ ] Raakt een voorstel de grens van `docs/tasks/contentketen-opnieuw.md` §3, of is iets nieuws
  nodig, dan leggen we dat apart voor als afwijking, met onderbouwing. Niet stil bouwen.
- [ ] Per geaccepteerde wijziging een testgeval in `scripts/test-unit.ts` (mechanische regel) of
  `scripts/test-chain.ts` (samenhang tussen stappen), met een voorbeeld uit het patronen-document
  als vast geval.

*Klaar als:* elke geaccepteerde wijziging is gebouwd, getest (de vier controles groen) en op een
branch gezet.

### Stap 6. Verifiëren (Claude Code en eigenaar, §8 van de methode)

- [ ] Een kleinere herhaling: minstens de clusters waar het patroon het sterkst speelde, met
  dezelfde copywriter en hetzelfde formulier. De clusters, het gesprek en de klantantwoorden staan
  nog in de app en in de payloads.
- [ ] ⚠️ **Nog uit te zoeken vóór deze stap:** of de app een al geschreven pagina opnieuw kan laten
  schrijven met de gewijzigde keten, met dezelfde brief en dezelfde antwoorden. De klantknop
  "Vraag een aanpassing" doet iets anders (een nieuwe versie op basis van een notitie) en telt
  daarom niet. Kan het niet, dan zijn er twee wegen: de nog niet gekozen aanbevelingen uit dezelfde
  rapporten laten schrijven (geen nieuwe meting, wel andere pagina's), of een nieuw cluster met
  meting (duurder, ongeveer $1 per cluster). Die keuze maken we samen bij het plannen van stap 6.
- [ ] Oud en nieuw naast elkaar, met dezelfde criteria.
- [ ] Is het patroon weg zonder dat een ander criterium zakt: vastleggen in `docs/logbook.md` met
  datum en het cijfer van voor en na. Zo niet: de wijziging is niet de oplossing.
- [ ] **Stopregel:** hooguit twee verificatiepogingen per patroon. Lukt het niet, dan gaat het als
  "nog niet opgelost" naar §9.

*Klaar als:* elk patroon is geverifieerd of expliciet als "nog niet opgelost" vastgelegd.

### Stap 7. Afronden (eigenaar en Claude Code)

- [ ] §9 van de methode bijwerken: de patronen, de uitkomst.
- [ ] Een alinea met datum en cijfers onderaan `docs/logbook.md`.
- [ ] De branch `claude/contentkwaliteit-fase1-klant-a` samenvoegen met `main` (de eigenaar
  beslist; hij bevat alleen documenten en testgegevens, geen productiecode).
- [ ] De opruimbesluiten uit §5 hieronder nemen.
- [ ] Dit bestand verwijderen, en verwijzingen ernaar in dezelfde commit opruimen.

---

## 3. Wat opviel tijdens de uitvoering: vermoedens om tegen de feedback te leggen

Elk punt hieronder is een waarneming van Claude Code bij het draaien van de ronde, **geen
vastgesteld probleem**. Per punt: wat er gebeurde, bij welke klant, welke bestaande stap het raakt,
en hoe we het straks beoordelen. De punten die over de tekst zelf gaan (groep 1) wachten op de
copywriter. De punten over de meting en het onderzoek (groep 2) hebben geen copywriter nodig om
waar te zijn, maar raken wel de input van een volgende ronde; zie stap 6.

### Groep 1. Over de teksten en de weg ernaartoe

| # | Waarneming | Waar gezien | Bestaande stap | Wat de copywriter zou zien als het klopt |
|---|---|---|---|---|
| 1.1 | **De herschrijving maakt teksten soms slechter.** Bij A2 vielen drie bruikbare veelgestelde vragen weg en kwam er een vreemde bij ("Zijn €141 en €171 ook de prijzen voor een noodopening?"), plus defensieve zinnen ("geen aankomsttijd die we kunnen toezeggen zonder je te spreken"). Herschreven werd bij A 5 van 6, bij B 4 van 6, bij C 1 van 6. | A2, mogelijk meer | De controle en de herschrijving (hoofdstuk 16) | Lagere cijfers bij "leest lekker" of "compleet" bij herschreven pagina's dan bij niet herschreven; opmerkingen over omslachtige of voorzichtige zinnen. Vergelijk in de bijlage de eerdere versie. |
| 1.2 | **De taal van de app belandt in de klanttekst.** C4 zegt letterlijk: "voor mollenbestrijding door Ongediertebestrijding De Waard is geen tarief of richtprijs bevestigd". | C4, mogelijk meer bij C | Het schrijven (hoofdstuk 15), de instructie over wat je niet weet | Opmerkingen bij "klinkt eigen" of "leest lekker" over vreemde, ambtelijke zinnen. |
| 1.3 | **Pagina's over een onderwerp waarover de klant niets weet.** C4 heet "Wat kost mollenbestrijding?" maar kan geen prijs noemen, omdat de klant die niet gaf. De aanbeveling ("maak concreet over prijzen") ging uit van input die er niet was. | C4, C1 | Het rapport en de kansen (hoofdstuk 11): "de klant kan er iets echts over zeggen" | "Vindt een bezoeker wat hij zoekt": laag. "Onder de maat" als publiceer-keuze. |
| 1.4 | **Twee pagina's over bijna hetzelfde onderwerp.** B2 en B3 gaan allebei over "zelf boekhouden of uitbesteden", elk uit een ander cluster. Ook bij A werden plaatspagina's (Zeist, Nieuwegein) door twee clusters aanbevolen. Het rapport kijkt niet naar overlap met een ander cluster. | B2 en B3; A-rapporten | Het rapport (hoofdstuk 11) en het contentplan (hoofdstuk 12) | Een opmerking in de algemene indruk van B dat twee pagina's elkaar herhalen. |
| 1.5 | **Dezelfde vraag twee keer aan de klant, alleen met een plaatsnaam erin.** Bij A stelde de brief voor IJsselstein vier vragen die eerder die avond al voor andere pagina's beantwoord waren. De ontdubbeling tussen briefs mist zulke herformuleringen. | A6 | Een pagina voorbereiden (hoofdstuk 13), de ontdubbeling | Niet direct zichtbaar voor de copywriter; wel voor de klant (ergernis). Beoordelen op de gegevens, niet op de feedback. |
| 1.6 | **De zwakste klant kreeg de meeste vragen.** C 31 vragen, A 28, B 25. Een klant die weinig tijd heeft, haakt daarbij eerder af dan dat hij netjes overslaat. | C | Een pagina voorbereiden (hoofdstuk 13), het aantal vragen | Niet zichtbaar voor de copywriter. Een vraag voor het gesprek met de eigenaar, niet voor de patronen. |
| 1.7 | **Een bezwaar of verkoopargument uit het gesprek komt te vaak terug in de meetvragen.** Bij A spiegelden twee van de vijf uitgezette vragen een werkwijze uit het gesprek ("welke slotenmaker vraagt om bewijs dat ik er woon"); bij B kwam "te laat aanleveren" vijf keer terug in 90 vragen. | A, B | Een cluster opzetten (hoofdstuk 9), de meetvragen | Niet zichtbaar voor de copywriter. Beoordelen op de gegevens: hoe vaak komt één bezwaar voor per cluster. |

### Groep 2. Over het onderzoek en de meting

| # | Waarneming | Waar gezien | Bestaande stap | Gevolg |
|---|---|---|---|---|
| 2.1 | **Meettaken die geen geldige JSON teruggeven** ("We need ou..."), vooral bij Google AI Overview. Na vier pogingen definitief mislukt: A 3, B 1, C 5. | A, B, C | De meting (hoofdstuk 10) | Die vragen tellen niet mee in de score en het rapport. Kost ook herkansingen. |
| 2.2 | **Een cluster met maar één aanbeveling** als het merk er al goed scoort (A slim slot, score 36; C wespen, score 33). | A, C | Het rapport (hoofdstuk 11) | Vooral een punt voor de testmethode (is opgelost in §2.3); in de app is het terecht gedrag. |
| 2.3 | **Het werkgebied werd een lijst regio's in plaats van plaatsen** ("Alblasserwaard", "regio Gouda"). Alle 90 meetvragen van C noemen daardoor een regio, en zo praat een echte gebruiker zelden. | C | Het onderzoek, "het bedrijf leren kennen" (hoofdstuk 6) | Minder realistische meetvragen bij een klant met een dun gesprek, want daar vult niemand het aan. |
| 2.4 | **Myfinance werd ingedeeld als "fabrikant"**, omdat het ook software maakt, terwijl de clusters over de dienstverlening gingen. Het bedrijfsmodel stuurt welke vragen de brief stelt. | B | Het onderzoek, het aanbod (hoofdstuk 6) | Mogelijk vragen die minder passen bij een dienstverlener. Klein. |
| 2.5 | **Stemvoorbeelden worden afgekapt op 2.000 tekens.** Bij A alle drie. | A | Het gesprek, stemvoorbeelden (hoofdstuk 7) | De schrijver ziet maar een deel van de stem. Of dat uitmaakt, zegt "klinkt eigen" bij A. |

**Hoe we groep 2 aanpakken.** Deze punten zijn los van de copywriter te onderzoeken en raken de
tekst niet direct. Maar een wijziging in de meting of het onderzoek verandert wel de rapporten, en
dus welke pagina's worden aanbevolen. Daarom: **niet aanpakken vóór de verificatie van stap 6 klaar
is**, en daarna als losse taak, elk met een eigen verificatie op opgeslagen data (conventie 10).
Punt 2.1 is de meest concrete: nagaan welke instructie bij Google AI Overview tot een antwoord in
gewone tekst leidt, en of de bestaande herkansing dat kan opvangen. Punt 2.2 is al verwerkt in de
methode.

---

## 4. Wat al is aangepast in de methode, en wat nog open staat

**Al gedaan (29 september 2026, samen met de eigenaar):**
- Sjabloonversie 2 in §4: koppen zonder interne stapnamen, alleen de definitieve versie
  beoordelen (eerdere in een bijlage), een regel "Huidige pagina" bij verbeterpagina's, toon uit de
  stemvoorbeelden, een zin over feiten in de rubriek, een schets bij elke pagina die niet "ja, zo"
  is.
- §2.3: minder dan twee aanbevelingen in een cluster, dan aanvullen uit een ander cluster, bij
  voorkeur met het pad dat nog ontbreekt.
- §3: de kostenschatting op de werkelijke cijfers ($0,20 per pagina in plaats van $0,90), de stap
  "Nu laten schrijven" en waar de eerste versie terug te vinden is.

**Nog open, voor te leggen aan de eigenaar bij stap 7:**

| # | Voorstel | Waarom |
|---|---|---|
| M1 | In §2.2 een regel: kies de drie clusters zo dat ze inhoudelijk niet op elkaar lijken. | Bij B lagen cluster 1 (boekhouder met vaste prijs) en cluster 2 (zelf of uitbesteden) te dicht bij elkaar; dat leverde twee bijna gelijke pagina's op (waarneming 1.4). Deels een fout in de opzet van deze ronde, niet van de app. |
| M2 | In §3 bij de tweede bewuste stop: de consultant mag een aanbeveling vervangen die overlapt met een al gekozen pagina uit een ander cluster, en noteert dat. | Nu verbiedt §3 elke selectie op iets anders dan prioriteit, ook als twee pagina's hetzelfde worden. Een echte consultant zou dat niet laten gebeuren. |
| M3 | In §2 de volgorde van fase 1 en fase 2 aanpassen aan wat hier werkte: pagina's maken hangt niet af van het sjabloon, dus alle klanten mogen tegelijk draaien; alleen het versturen van de documenten gaat in fases. | Bespaart een wachtronde zonder risico, omdat een document zonder kosten opnieuw op te bouwen is. |
| M4 | In §3.1 vastleggen hoe een klant met profiel C met veel vragen omgaat (overslaan, of een deel onbeantwoord laten liggen). | Nu is "overslaan" een aanname (waarneming 1.6). In de app wacht een pagina met een open vraag, zonder uiterste datum. |
| M5 | Een klein script dat `data.json` rechtstreeks uit de app samenstelt (via de beheerroute voor het AI-spoor en een leesroute voor de vragen). | Nu is de koppeling van vragen aan pagina's met de hand overgenomen uit databasevragen. Werkt, maar is foutgevoelig bij een volgende ronde. |

---

## 5. Opruimen en beheer (besluiten voor de eigenaar)

| # | Wat | Voorstel |
|---|---|---|
| O1 | **De drie testmerken staan op productie**, op het account van `e2e-consultant@orbit-test.nl`, met hun plannen en geschreven pagina's (status "Lees en keur goed"). | Laten staan tot stap 6 klaar is, want de verificatie gebruikt dezelfde clusters en antwoorden. Daarna archiveren via de app, niet verwijderen (verwijderen is onomkeerbaar). |
| O2 | **Het wachtwoord van `e2e-consultant@orbit-test.nl` is opnieuw gezet** (28 september, via Supabase), omdat er geen stond in de omgeving van de sessie. Het staat alleen in `.env.local` van die sessie en verdwijnt met de sessie. | Voor een volgende ronde het wachtwoord bewaren als geheime waarde in de instellingen van de omgeving (niet in de repo), zodat het niet elke keer opnieuw gezet hoeft te worden. |
| O3 | **Het testaccount heeft een pakket van 10 pagina's per maand.** Het plan zette daardoor steeds meer pagina's in oktober dan nodig, en die moesten met de hand terug naar de voorraad. | Laten zo; is in de logs beschreven. Hooguit in §3 van de methode één zin. |
| O4 | **De branch** `claude/contentkwaliteit-fase1-klant-a` bevat de hele ronde (A, B en C) en de methodewijzigingen. | Samenvoegen met `main` zodra de eigenaar het goed vindt; geen productiecode, dus geen risico voor de app. |

---

## 6. Kosten en tijd van het vervolg

| Stap | Wat het kost | Tijd |
|---|---|---|
| 1 tot en met 3 | Geen AI-kosten; de tijd van de copywriter | Een paar uur per document voor de copywriter; een uur voor stap 3 |
| 4 | Geen AI-kosten | Een sessie samen |
| 5 | Geen AI-kosten, alleen bouwtijd | Hangt af van de patronen |
| 6 | Zonder nieuwe meting ongeveer $0,20 per pagina, dus rond $1 per patroon per poging (twee clusters, twee pagina's). Met een nieuwe meting komt daar ongeveer $1 per cluster bij (zie de open vraag in stap 6) | Een uur in de app per poging, plus opnieuw de copywriter voor alleen die pagina's |
| Totaal verificatie | Bij hooguit vijf patronen en hooguit twee pogingen: onder de $10 zonder nieuwe meting, onder de $30 met | De copywriter is de grootste post |

De meting was ruim driekwart van de kosten van de eerste ronde. Kan de verificatie zonder nieuwe
meting (de open vraag in stap 6), dan is een verificatieronde veel goedkoper dan de eerste ronde.

---

## 7. De verbeterpunten uit de vijf patronen (29 september 2026, na de feedback)

> Samengesteld uit de vijf patronen in `content-reviews/ronde-1-patronen.md`, de vijf voorstellen
> uit het concept daarvan (V1 tot en met V5), de waarnemingen in §3 hierboven en de
> methodevoorstellen in §4. Wat hetzelfde probleem raakt, is samengevoegd tot één verbeterpunt.
> Dit is de enige lijst: het patronen-document verwijst hiernaar. Nog geen besluit; na akkoord
> volgt stap 5.
>
> **Uitgangspunt** (§0 en §7 van de methode): geen nieuwe stap, geen nieuwe AI-aanroep, geen score
> op de tekst. Liever een bestaande stap strakker of eenvoudiger maken, en liever iets weghalen dan
> iets toevoegen. De schrijf- en controleopdrachten bevatten al "herhaal niets", "vakkennis als
> algemene uitleg" en "weet je iets niet, laat het weg". Nog meer regels erbij is dus waarschijnlijk
> niet de oplossing; eerder moet iets weg dat de andere kant op trekt.

### 7.1 Een correctie op het concept

In het concept stond dat de prijs van €79,95 bij Myfinance (B1) nergens vandaan kwam. Dat klopt
niet. De pagina `myfinance.nl/online-boekhouder/boekhouder-zzp/` zegt letterlijk "Vanaf € 69,95 per
maand excl. btw · excl. Compleet pakket (€ 10,- p/m)". Het verzonnen klantantwoord uit deze test
("€69,95 all-in") sprak de site tegen. Wat er echt misging:
- het webonderzoek van de **brief** zette een bedrijfsspecifiek bedrag in zijn vakkennis ("Bij
  Myfinance noemt de zzp-dienstpagina € 69,95 ... samen € 79,95"), buiten de kennislaag om, waar
  tegenstrijdige feiten normaal worden tegengehouden tot de consultant kiest;
- de **controle in code** telt die vakkennis mee als bron (`lib/pagina/harde-beweringen.ts`: "alle
  tekst van blok A, B en de vakkennis van C"), dus het bedrag gold als gedekt;
- de **beoordeling** gaf het verbeterpunt "geef direct de bijbehorende totaalprijzen", en de
  **herschrijving** maakte van een voorbehoud een stellig totaal.

Patroon 1 blijft dus staan, maar de oorzaak is een lek in de feitenstroom, niet een verzonnen
bedrag.

### 7.2 Hoe de bronnen zijn samengevoegd

| Bron | Gaat op in |
|---|---|
| Patroon 1 (harde bewering buiten de bedrijfsinput), V1, V2 (deels), de €79,95 | K1 en K4 |
| Patroon 2 (herhaling, defensieve zinnen), V2, V3 (deels), waarneming 1.1 (herschrijving maakt het soms slechter) | K4 en K3 |
| Patroon 3 (overlap in de set), V4, waarneming 1.4, methodevoorstellen M1 en M2 | K2 |
| Patroon 4 (pagina rond ontbrekende informatie), V5, waarneming 1.2 (app-taal in de tekst) en 1.3 | K3 |
| Patroon 5 (veel algemene vakkennis), V3 (deels) | K1 en K3 |
| De toets van het sjabloon (§1b van het patronen-document) | K5 |
| Waarneming 1.5, 1.6, 1.7 en groep 2 | Niet uit de patronen; blijven in §3 en gaan mee in de pijplijnanalyse (§8) |
| De klantclaim "agressiever dan een gewone wesp" (C2) | Geen verbeterpunt: de klant is leidend en keurt de tekst zelf goed |

### 7.3 De verbeterpunten, in de volgorde van de keten

#### K1. Bedrijfsfeiten komen alleen uit de kennislaag (de brief en de controle in code)
*Patronen 1 en 5. Vereenvoudigt: één route voor bedrijfsfeiten in plaats van twee.*

- **Wat er nu gebeurt:** de brief zoekt op het web en levert vakkennis met een bronadres. Die
  vakkennis mag ook over het bedrijf zelf gaan (een prijs van de eigen site), en de controle in
  code telt alle vakkennis mee als bron voor zinnen over het bedrijf. Zo komt een bedrijfsfeit
  binnen zonder de kennislaag, en dus zonder de controle op tegenstrijdigheden.
- **Wat beter kan, binnen de bestaande stappen:**
  1. In de opschoning na de brief (`lib/pagina/brief-regels.ts`, waar vakkennis zonder bron al
     wegvalt): vakkennis waarvan het bronadres op het eigen domein van het merk staat, of die het
     merk bij naam noemt, valt weg. Wat het bedrijf zelf zegt, hoort in de kennislaag, waar het
     onderzoek het al vandaan haalt. Deterministisch, conventie 1.
  2. In de controle in code (`lib/pagina/harde-beweringen.ts`): voor een zin **over het bedrijf**
     tellen alleen de bedrijfskennis en wat de ondernemer vertelde als bron (blok A en B), niet de
     vakkennis. Algemene uitleg met een getal (de "3 mm" bij A3) blijft mogen, want die zin gaat
     niet over het bedrijf.
- **Wat het oplost:** de €79,95 was dan geel geworden en de tegenspraak met het klantantwoord was
  zichtbaar geweest. De "3 mm" wordt niet verboden, maar valt niet meer samen met een bedrijfsclaim.
- **Raakt contentketen-opnieuw §3?** Nee: harde feiten, controle in code, bestaande filters.

#### K2. De aanbevelingen van een merk als één set bekijken (het rapport en het contentplan)
*Patroon 3. Geen nieuwe stap; een bestaande regel ("overlapt niet met een andere") geldt voortaan
over alle clusters van het merk.*

- **Wat er nu gebeurt:** elk rapport kijkt alleen naar zijn eigen cluster. Daardoor kwamen bij A
  twee plaatspagina's (Zeist, Nieuwegein) uit twee rapporten tegelijk, bij B twee pagina's over
  "zelf boekhouden of uitbesteden", en binnen één rapport ook pagina's die elkaars doel delen (B5 met
  B6, C4 met C5 en C6).
- **Wat beter kan:**
  1. Het rapport krijgt de titels en doelen van de open aanbevelingen van hetzelfde merk mee als
     invoer, in dezelfde aanroep, met de bestaande regel dat een nieuwe aanbeveling daar niet mee
     mag overlappen. Geen extra aanroep.
  2. In code, bij het vastleggen van de kansen: twee kansen die dezelfde bestaande pagina willen
     verbeteren, worden één kans met het bewijs van beide clusters. Deterministisch.
  3. Voor de testmethode (M2 in §4): bij de tweede bewuste stop mag de consultant een aanbeveling
     vervangen die overlapt met een al gekozen pagina, en noteert dat.
- **Raakt §3?** Nee.

#### K3. Schrijven met wat er is, niet rond wat ontbreekt (de schrijfopdracht)
*Patronen 2, 4 en 5, waarnemingen 1.2 en 1.3. Liever iets weghalen uit de opdracht dan iets
toevoegen.*

- **Wat er nu gebeurt:** de opdracht zegt "wees inhoudelijk volledig" en "schrijf zo uitgebreid als
  nodig is", en tegelijk "herhaal niets" en "weet je iets niet, laat het weg". In de praktijk wint
  volledigheid: dezelfde kernboodschap drie keer, vakkennis als opvulling, en bij een open kernvraag
  een pagina die uitlegt wat de lezer zelf moet navragen (C4, C1, B6). Bij C4 belandde zelfs de taal
  van de app in de tekst ("geen tarief of richtprijs bevestigd").
- **Wat beter kan, allemaal in de bestaande opdracht (`lib/pagina/schrijfopdracht.ts`):**
  1. "Wees inhoudelijk volledig" vervangen door een maatstaf vanuit de lezer: zo kort als kan voor
     wat deze bezoeker wil weten. Weghalen wat nu naar lengte trekt, in plaats van een extra regel
     tegen herhaling.
  2. Als de ondernemer de kernvraag van de pagina niet beantwoordde (de prijs op een prijspagina),
     kiest de schrijver een titel en invalshoek die hij wel kan waarmaken, en schrijft hij geen
     alinea's over wat de lezer zelf moet navragen of wat er niet bekend is. Nog uit te zoeken in de
     pijplijnanalyse: of de schrijver nu kan zien welke vraag de kernvraag was en dat die
     overgeslagen is.
  3. Vakkennis alleen gebruiken waar die de keuze van de lezer helpt. Dit hoort samen met K1: minder
     vakkennis die over het bedrijf gaat, dus minder om op te vullen.
- **Raakt §3?** Nee, dit is stijl en invalshoek in de opdracht, geen controle in code. Alleen punt 2
  raakt de vraag welke pagina's er komen; dat is voor de eigenaar als het verder gaat dan de titel.

#### K4. De controle beoordeelt, maar voegt niets toe (de beoordeling en de herschrijving)
*Patronen 1 en 2, waarneming 1.1. Vereenvoudigt; mogelijk ook minder aanroepen.*

- **Wat er nu gebeurt:** de beoordeling vraagt onder meer "is er genoeg diepgang?" en geeft
  verbeterpunten als "geef direct de totaalprijzen". De herschrijving voert die uit en voegt daarmee
  voorbehouden en nieuwe beweringen toe. Vijf van de zes pagina's van A en vier van de zes van B
  werden herschreven. Herschreven pagina's scoren gemiddeld lager op "leest lekker" (3,6 tegen 4,0)
  en op kwaliteit (3,4 tegen 3,9). Dat is een aanwijzing, geen bewijs.
- **Wat beter kan, in `lib/pagina/controle-regels.ts`:**
  1. Een verbeterpunt mag iets schrappen, corrigeren of verplaatsen, maar niets laten toevoegen wat
     niet in de informatie staat (geen nieuw bedrag, geen totaal, geen nieuwe belofte).
  2. De vraag "is er genoeg diepgang?" weghalen uit de beoordeling: die trekt de tekst langer, en
     volledigheid is al de taak van de schrijver.
  3. **Voor besluit door de eigenaar:** alleen herschrijven bij een feitelijk probleem (verzonnen,
     onbewezen of verboden zinnen), en bij alleen het oordeel "niet goed" de punten aan de
     ondernemer laten zien in plaats van automatisch te herschrijven. Dat haalt een aanroep weg in
     de meeste gevallen, maar wijzigt besluit §6.6 van `docs/tasks/contentketen-opnieuw.md` (de
     beslisregel `moetHerschrijven`). Eerst toets T1 hieronder.
- **Raakt §3?** Punt 1 en 2 niet. Punt 3 wel, daarom een besluit voor de eigenaar.

#### K5. Sjabloonversie 3 voor een volgende ronde (de testmethode, geen pijplijn)
*De toets van het sjabloon.*

1. Eén keer per klant een kort blok "Wat de schrijver al over het bedrijf wist": de feiten van de
   site en de kern van het gesprek. Anders meet "klopt het" vooral wat het document laat zien; in
   deze ronde drukte dat de score van de rijkste klant.
2. De publiceer-keuze als kolom in de beoordelingstabel, niet als losse vakjes (bij B niet ingevuld).
3. Vragen om de bestede tijd per document.

### 7.4 Eerst toetsen, dan bouwen

| Toets | Wat | Kost | Beslist over |
|---|---|---|---|
| **T1** | Dezelfde beoordelaar krijgt voor A2, B1, B2, B3 en B6 de eerste en de herschreven versie naast elkaar, met hetzelfde formulier. De eerste versies staan al in de bijlagen. | Geen AI-kosten | K4 punt 3: is herschrijven op stijl een verbetering of een verslechtering? |
| **T2** | Na het bouwen van K1 tot en met K4: dezelfde pagina's opnieuw laten schrijven met dezelfde brief en antwoorden, en voorleggen aan dezelfde beoordelaar (stap 6). | Rond $0,20 per pagina, als opnieuw schrijven kan (open vraag in stap 6) | Of de patronen weg zijn zonder dat een ander criterium zakt |

⚠️ Hangt af van het antwoord op de vraag of de beoordeling door een mens of door een AI is gedaan
(open punt in het patronen-document). Was het een AI, dan is T1 bij dezelfde AI goedkoop maar deelt
hij de blinde vlek; een menselijke beoordelaar blijft dan nodig voor het eindoordeel.

### 7.5 Volgorde en relatie met de pijplijnanalyse

1. **Eerst de grondige pijplijnanalyse** (§8), op basis van de drie klanten, negen clusters en achttien
   pagina's uit deze ronde. De verbeterpunten hierboven zijn daar de startlijst voor, geen
   eindlijst: de analyse kan ze aanscherpen, samenvoegen of laten vallen.
2. Daarna T1.
3. Dan bouwen, in deze volgorde: K1 (feiten, grootste risico en deterministisch), K4 punt 1 en 2,
   K2, K3. K4 punt 3 alleen na T1 en een besluit.
4. Dan T2 en de verificatie van stap 6.

## 8. Volgende stap na akkoord: de grondige pijplijnanalyse

Na akkoord op §7 volgt een analyse van de hele keten, stap voor stap, op de echte gegevens van deze
ronde: drie merken, negen clusters, achttien pagina's. Per stap de invoer en de uitvoer naast
elkaar (alles staat in `ai_calls` en via `GET /api/beheer/spoor/<profiel>`), met de vraag: wat maakt
deze stap beter, eenvoudiger of overbodig, zodat de pagina aan het eind ijzersterk is? Van merk
aanmaken en het onderzoek, via het gesprek, de meetvragen, de meting en het rapport, tot de brief,
het schrijven, de controle en de herschrijving. Dezelfde spelregels als hierboven: bestaande stappen
verbeteren, geen stappen erbij. De opzet van die analyse wordt een eigen document zodra de eigenaar
akkoord geeft.
