# Bevindingen uit de kwaliteitsdoorlichting, om op te lossen

> **Wat dit is.** De fouten en verbeterpunten die boven kwamen bij het doorlopen van de hele keten op
> productie (`docs/tasks/kwaliteitsdoorlichting-pijplijn.md`), vanaf 23 september 2026, met drie echte
> bedrijven uit de regio Eindhoven:
>
> | | Merk | Site | Profiel-id |
> |---|---|---|---|
> | A | Hans Verstraaten Hoveniers (Eindhoven) | hansverstraatenhoveniers.nl, ~70 pagina's | `f14e89ab-6db2-41ea-8bbc-0827d6025470` |
> | B | Wesley Keeris Installatietechniek (Geldrop) | wkinstallatie.nl, ~23 pagina's | `ca8313fb-3c2e-4b37-9985-0f8be8dc6e8b` |
> | C | Autorijschool Pompert (Eindhoven) | autorijschoolpompert.nl, ~15 pagina's in het menu | `467f8307-74dd-4e84-b443-40cc1ce88f9e` |
>
> Clusters: A "Complete tuin laten aanleggen met bestrating" (`2d4ce398-57d6-4f09-9ad3-faab83773870`),
> B "Hybride warmtepomp voor een bestaande woning" (`3dd41da2-ffbc-4676-9bc2-2866807366da`),
> C "Autorijles met faalangst" (`a3419688-ab38-4d8a-b03d-3ab0c78dc968`). Accounts:
> `demo-consultant@example.com` (beheerder) en `demo-klant@example.com` (klant). De data blijft staan.
>
> **Hoe te gebruiken.** Elk punt heeft wat er misgaat, wat de klant ervan merkt, waar het in de code
> zit, en een voorstel. Is een punt opgelost: de regel "Status" bijwerken met de datum en de PR, en
> een alinea in `docs/logbook.md`.
>
> **Stand 25 september 2026:** de hele keten twee keer doorlopen (nulmeting 23/24 september, herhaling
> 24/25 september), 37 teksten blind beoordeeld, proeven met de reparatieknop en een ideale klant
> gedaan. Het eindverslag van de nulmeting staat hieronder; het stap-voor-stapdossier met cijfers in
> `docs/tasks/kwaliteitsdoorlichting-stappen.md`. De uitslag van de herhaling staat bij §"Herhaling"
> verderop en bij de punten 45, 47, 50, 55 tot en met 62. De aanpak om de nog openstaande punten (50,
> 57, 59, 60, 61) op te lossen staat in `docs/tasks/kwaliteitsdoorlichting-reparatieplan.md`. Bij
> het oppakken daarvan (25 september 2026) bleken 60 en 61 onterecht: wat de blinde lezer verzonnen
> of verwisseld noemde, staat op de site of in de antwoorden van de klant (zie bij de punten zelf).

## Verbeterronde vanaf 24 september 2026: besluiten en stand

De eigenaar koos op 24 september 2026 om alle open punten op te lossen, in blokken van één PR per
thema, elk getest en op productie nagerekend, en af te sluiten met een volledige herhaling van de
doorloop met dezelfde drie bedrijven en dezelfde blinde lezers (meetlat: 4,1 op 10).

**Besluiten van de eigenaar (24 september 2026):**

- **48, de merknaam:** niet voor elke alinea in de zichtbare tekst. Gevraagd: kan het anders? Gebouwd
  in blok D: de naam in de meta-title, de eerste alinea en de afsluiting; elders "wij". De koppeling
  voor zoekmachines en AI-assistenten staat in de gestructureerde gegevens van de pagina (`about` en
  `author` naar de organisatie), die de lezer niet ziet.
- **27, groeidoelen:** tellen zwaar. Gebouwd in blok A: twee keer het gewicht van een even zware
  gemiste vraag.
- **31, verbeteringen van één pagina:** hooguit één per pagina per drie maanden. Te bouwen in blok E.
- **42, tegengehouden tekst:** mag aan de klant getoond worden, met een duidelijke melding. Te bouwen
  in blok C.
- **33 en 53:** geen keuze maar een fout; opgelost zonder besluit. 33: de vrijgeefdialoog noemde
  "beantwoord vóór 13 september" op 24 september, omdat de eerste pagina de volgende dag gepland
  stond en de streefdatum twaalf dagen daarvoor ligt. 53: een nieuwe versie van een tekst werd niet
  meer gecontroleerd op wat hij over het bedrijf beweert.

**Stand na de verbeterronde (24 september 2026, eind van de dag):** alle zes blokken live (PR #121
tot en met #127). De afsluiting uit het plan, dezelfde drie bedrijven opnieuw door de keten met
dezelfde blinde lezers, is gedaan op 24/25 september; de uitslag staat in §"Herhaling" hieronder.

| Blok | Punten | Stand |
|---|---|---|
| A, wat de app van de klant weet | 5, 24, 27, 35, 36, 47 | ✅ live, PR #121; 7 schuift naar blok B (crawl) |
| B, wat de app van de site leest | 4, 7, 10, 28, 45 | ✅ live, PR #122; op productie nagerekend: de hovenier had 1 pagina, nu 68 adressen gevonden en na vier aanvulrondes 60 gelezen, met de pagina's voor Best, Nuenen, Geldrop en Veldhoven |
| C, de keuring | 42, 43, 50, 53, 54 | ✅ live, PR #123; 50 wacht op de herhaling (oorzaak al weg via 39) |
| D, schrijfstijl | 46, 48, 49 | ✅ live, PR #124 |
| E, planning | 31, 32, 33 | ✅ live, PR #125 |
| F, kleine punten | 3, 6, 8, 9, 11 tot 18, 23, 38 | ✅ live, PR #126 en #127; 15 en 16 niet herhaald, alleen oppakken bij herhaling |

## Herhaling: dezelfde drie bedrijven opnieuw door de keten (24/25 september 2026)

Zelfde drie merken, dezelfde clusters (met per merk één nieuw cluster erbij, gekoppeld aan het
groeidoel uit het gesprek), dezelfde blinde lezers, dezelfde meetlat als de nulmeting.

| Maat | Nulmeting (16 teksten) | Herhaling (21 teksten) |
|---|---|---|
| Gemiddeld copywritercijfer | 4,1 op 10 | **4,9 op 10** |
| Ondernemer publiceert: zo / met aanpassingen / nee | 0 / 11 / 5 | 4 / 11 / 6 |
| Bezoeker neemt contact op: ja / misschien / nee | 3 / 12 / 1 | 12 / 9 / 0 |
| Nieuwe tekst beter dan de huidige pagina | 11 van 15 | 10 van 10 |
| Past niet bij het adres | 5 van 16 | **0 van 21** |
| Niveau professionele copywriter | bij geen van de drie | nog steeds niet; C komt het dichtst in de buurt |

**De vier getoetste punten:** 45 (functie van de pagina) en 47 (sterkste bewijs) zijn bevestigd
opgelost. 17 (Gemini-limiet) faalde opnieuw volledig bij drie merken tegelijk, waarna de eigenaar
Gemini als meetbron op 25 september heeft uitgezet in productie (punt 55). 50 (de reparatieknop)
viel terug via een nieuwe route: een volledige herschrijving nam een juist klantfeit niet meer over
(punt 62). Onderweg vier nieuwe bevindingen (58 tot en met 61) en een tijdelijk, vermoedelijk
ongerelateerd productieprobleem met de edge-middleware.

**Wat na de herhaling nog open staat:** 50 en 55 (allebei hierboven), 57 (deels, twaalf
bijna-identieke vervolgvragen op één pagina), 58 en 59 (crawldekking en de bronherleidbaarheidscontrole),
60 en 61 (een verzonnen certificering en verwisselde cijfers), 15 en 16 (eenmalig, niet teruggekomen),
en de wisselproef met een ideale klant (niet meegenomen in deze herhaling).

## Eindverslag: de vijf verbeteringen die het meest opleveren

**De uitkomst in één alinea.** Drie echte bedrijven zijn op 23 en 24 september 2026 door de hele keten
gegaan, van merk aanmaken tot 16 geschreven pagina's. Drie onafhankelijke blinde lezers gaven de
teksten gemiddeld een **4,1 op 10** als copywriter. Geen enkele tekst zou de ondernemer zonder
aanpassing publiceren. Wel is de nieuwe tekst in 11 van de 15 vergelijkingen beter dan wat er nu op
de site staat. De teksten beginnen dus boven de huidige sites, maar ver onder een professionele
copywriter. Van de 54 bevindingen zijn er 18 opgelost en live gezet (PR #108 tot en met #119).
De rest staat hieronder, per punt met de plek in de code.

**De vijf, op volgorde van wat ze opleveren voor de tekst:**

1. **Wat de klant weet, moet de tekst bereiken.** Het sterkste bewijs (93 procent geslaagd, 1.800
   onderhoudscontracten, twaalf monteurs) stond op de feitenkaart en kwam in geen enkele tekst
   (punt 47). Het rapport kent de groeidoelen niet (27), de meetvragen negeren de groeiplaatsen (5),
   en de klant krijgt vragen die hij al beantwoordde (35). Opgelost in deze doorloop: antwoorden
   dekken nu hun bewering (39), blijven bij hun pagina (41), en de opmerking bij een nieuwe versie
   bereikt de schrijver (52). **Open:** het onderscheidende bewijs uit het gesprek een vaste plek in
   elke pagina geven, en groeidoelen en groeiplaatsen meenemen in meting en rapport.
2. **De app moet de site kennen voordat hij iets "verbetert".** De hovenier: 1 van ~70 pagina's
   gelezen (4), dus "nieuwe pagina voor Best" terwijl die bestaat. De rijschool: de hoofdpagina uit het
   menu ontbrak, fotobijlagen niet (10, 28). Gevolg: een "verbetering" vervangt de functie van de
   pagina (de homepage wordt Helmond, de prijzenpagina wordt een losse les, 45), en drie teksten voor
   één adres (31).
3. **De keuring moet meten wat een lezer merkt.** Alle 16 teksten werden tegengehouden, grotendeels om
   redenen die niet klopten (39, 40, 43, opgelost of deels), terwijl wat de blinde lezers als eerste
   noemden (herhaling, gelekte bronzinnen, ontbrekend bewijs, verkeerde pagina op het adres) er niet of
   nauwelijks in stond. De klant krijgt "tekst is klaar, keur hem goed" bij een tegengehouden tekst
   (42), omschreven klantfeiten tellen als "zonder bron" (54), en een nieuwe versie wordt niet meer op
   onderbouwing getoetst (53).
4. **Schrijven als het bedrijf, niet als een formulier.** Bedrijfsnaam voor elke alinea en dezelfde
   feiten drie tot vier keer (48; de naam is een bewuste regel en een afweging voor de eigenaar),
   "bespreek dat vooraf" waar een vraag overgeslagen werd (49), en één keer een belofte van de site
   omgedraaid (46).
5. **Het plan moet uitvoerbaar zijn.** Eén adres, één tekst (31); een plan dat op de 24e start, vraagt
   antwoorden vóór de 13e (33); "opnieuw opzetten" werkt niet bij een nieuwe klant (32).

**Buiten de tekst, wel dringend:** de Gemini-meting viel volledig uit op een limiet van de leverancier
(17), en de crawl leest bij sommige sites maar één pagina zonder waarschuwing (4).

**Hoe de meetlat werkte.** Elke bewering van een blinde lezer is nagerekend voordat hij hier staat.
Drie klopten niet (de CO-certificering en Eindhoven staan wél op de site van de installateur, de
telefoonnummers van de rijschool ook) en zijn niet meegeteld. Omgekeerd vond de lezer dingen die de
keuring van de app niet zag, en die bij narekenen klopten (de omgedraaide 4-urenbelofte, de gelekte
bronzinnen, het ontbrekende bewijs).

## Overzicht

| # | Ernst | Onderwerp | Status |
|---|---|---|---|
| 1 | hoog | Gespreksscherm slaat de waarde van vóór de klik op | ✅ opgelost, PR #108 |
| 2 | hoog | Definitieve onderwerpenronde kan alle onderwerpen wissen | ✅ opgelost, PR #108 |
| 3 | hoog | Het merk zelf komt op de lijst "gelijknamige bedrijven die jij niet bent" | ✅ opgelost, verbeterronde blok F |
| 4 | hoog | De crawl leest 1 pagina van een site van ~70, zonder waarschuwing | ✅ opgelost, verbeterronde blok B |
| 5 | hoog | Meetvragen negeren de groeigebieden: de opdracht spreekt zichzelf tegen | ✅ opgelost, verbeterronde blok A; bevestigd bij de herhaling (groeiplaatsen Best, Nuenen, Son en Breugel, Veldhoven kwamen letterlijk terug in de nieuwe meetvragen van alle drie de merken) |
| 6 | middel | "Herkend door ChatGPT bij 5 van 6 vragen" telt gokken op de naam als herkenning | ✅ opgelost, verbeterronde blok F |
| 7 | middel | Het sterkste bewijs van een bedrijf valt tussen crawl en dossier weg | ✅ opgelost, verbeterronde blok B (vangnet op de feitenkaart; het merkonderzoek zelf niet aangepast) |
| 8 | middel | Meetvragen: veel dubbel, weinig realistisch, altijd een plaatsnaam | ✅ deels opgelost, verbeterronde blok F (dubbel en bezwaren; "altijd een plaatsnaam" is een bewuste regel) |
| 9 | middel | Een adviesregel op de site wordt een dienst en een onderwerp | ✅ opgelost, verbeterronde blok F |
| 10 | middel | Crawl neemt fotopagina's, tag- en auteurspagina's mee | ✅ opgelost, verbeterronde blok B |
| 11 | middel | Blok met gecontroleerd te bevestigen voorstellen klapt dicht als het "compleet" is | ✅ opgelost, verbeterronde blok F |
| 12 | laag | Klant ziet "Bevestig en start de meting" maar mag de meting niet starten | ✅ opgelost, verbeterronde blok F |
| 13 | laag | Klant ziet "Nieuw merk" en het hele formulier, de server weigert pas na verzenden | ✅ al opgelost door de UX-audit van 23 september (P1.3), op productie nagekeken |
| 14 | laag | Voortgang zegt "klaar" en "nog minder dan een minuut" terwijl er nog stappen wachten | ✅ opgelost, verbeterronde blok F |
| 15 | laag | Conceptscherm gaf één keer een foutpagina bij het openen, direct na het afronden | open, niet herhaald |
| 16 | laag | Een taak van een merk stond op "bezig" en daarna weer in de wachtrij met 0 pogingen | open, niet herhaald |
| 17 | hoog | Gemini-meting viel volledig uit op een limiet van de leverancier | ⚠️ open, spreiding gebouwd in blok F maar bij de herhaling opnieuw volledig uitgevallen bij alle drie de merken, zie punt 55 |
| 18 | laag | Beoordeling "genoemd of niet" geeft soms platte tekst in plaats van JSON, en de mislukte uitvoer wordt niet bewaard | ✅ vastleggen opgelost, verbeterronde blok F; het aandeel is nu te meten |
| 19 | **hoog** | Een definitief mislukte Gemini- of Google-meting laat de analyse eeuwig op "meten" staan | ✅ opgelost, PR #110 |
| 20 | **hoog** | Het rapport schrapt elke zin over welke concurrent een vraag wint, ook de juiste | ✅ opgelost, PR #111 en #112 |
| 21 | middel | Een eigen product ("Hybride warmtepomp") telde in de naamcontrole als concurrent | ✅ opgelost, PR #112 |
| 22 | **hoog** | Het rapport zegt "niet genoemd, 0 op 100" terwijl Google het merk wel noemde | ✅ opgelost, PR #111 en #112 |
| 23 | laag | Hetzelfde bedrijf staat twee keer in het namenregister, met en zonder "(VSB)" | ✅ opgelost voor nieuwe namen, verbeterronde blok F; de twee bestaande rijen zijn niet samengevoegd |
| 24 | laag | De rapportinstructie zegt niet of prioriteit 1 de belangrijkste is; de hovenier kreeg 6 tot 10 met de belangrijkste pagina's op 10 | ✅ opgelost, verbeterronde blok A; bevestigd bij de herhaling |
| 25 | middel | Een klaar cluster (status "gereed") heeft geen link op zijn kaart | ✅ opgelost, PR #113 |
| 26 | **hoog** | De consultant ziet de clusters van een klantmerk niet en krijgt "Start het eerste cluster" | ✅ opgelost, PR #116 |
| 27 | **hoog** | Het rapport kent de groeidoelen en feiten uit het gesprek niet | ✅ opgelost, verbeterronde blok A; bevestigd bij de herhaling (bij alle drie de merken staat het expliciete groeidoel op prioriteit 1, met actie "verbeteren" op de bestaande pagina) |
| 28 | **hoog** | De site-inventaris mist de hoofdpagina uit het menu en bevat fotobijlagen; het rapport adviseert een fotopagina te verbeteren | ✅ opgelost, verbeterronde blok B |
| 29 | middel | Het planscherm zegt de klant "stel je het plan zelf op", maar alleen de consultant mag het | ✅ opgelost, PR #114 |
| 30 | **hoog** | Het plan gaf de zwaarste gemiste vraag potentie 0 en zette die pagina achteraan | ✅ opgelost, PR #114 (nog niet op een nieuw plan nagerekend, zie 32) |
| 31 | **hoog** | Het plan zet vier verbeteringen van dezelfde pagina in dezelfde week | ✅ opgelost, verbeterronde blok E (besluit eigenaar: één per drie maanden) |
| 32 | **hoog** | "Opnieuw opzetten" van het plan faalt als alle kansen al in het huidige plan staan, en laat ze anders achter | ✅ opgelost, verbeterronde blok E; bevestigd bij de herhaling (drie keer foutloos opnieuw opgezet) |
| 33 | middel | Een plan dat laat in de maand start, vraagt de klant zijn vragen te beantwoorden vóór een datum in het verleden | ✅ opgelost, verbeterronde blok E; bevestigd bij de herhaling (streefdata lagen steeds in de toekomst) |
| 34 | laag | De klant leest "wacht op jouw vrijgave" en in hetzelfde blok dat de consultant goedkeurt | ✅ opgelost, PR #116 |
| 35 | **hoog** | Vragen die het gesprek al beantwoordde, blijven openstaan voor de klant | ✅ opgelost, verbeterronde blok A (streng: alleen als het gesprek de hele vraag dekt) |
| 36 | middel | Elk rapport zet zijn eigen vragen klaar; alleen letterlijk gelijke vragen worden samengevoegd | ⚠️ grotendeels opgelost, verbeterronde blok A; bij de herhaling kwamen opnieuw sterk anders geformuleerde varianten door, nu met 12 tegelijk over één pagina, zie punt 57 |
| 37 | laag | Een vraag aan de klant bevat "en" en "of" met een schuine streep ertussen | ✅ opgelost, PR #116 |
| 38 | middel | Het laatste antwoord van een pagina laat de klant 9 tot 30 seconden wachten | ✅ opgelost, verbeterronde blok F |
| 39 | **hoog** | Een beantwoorde vraag maakt de bewering erachter nooit "onderbouwd": de keuring blijft "beantwoord deze vraag" zeggen | ✅ opgelost, PR #115 |
| 40 | **hoog** | De keuring van een pagina blokkeert op beweringen van andere pagina's van hetzelfde merk | ✅ opgelost, PR #115 |
| 41 | middel | Antwoorden van de klant op paginavragen worden opgeslagen als feit van de site | ✅ opgelost, PR #115 |
| 42 | **hoog** | De klant krijgt "Tekst is klaar, keur hem goed" bij een tekst die de eigen keuring tegenhoudt | ✅ opgelost, verbeterronde blok C (besluit eigenaar: tonen met duidelijke melding) |
| 43 | middel | De keuring noemt het bedrag van de klant "in strijd met de instructie", omdat de opzet van vóór zijn antwoord is | ✅ opgelost, verbeterronde blok C |
| 44 | laag | Een tegengehouden pagina staat voor de klant als "Alle gegevens bekend, wordt nu geschreven" | ✅ opgelost, PR #116 |
| 45 | **hoog** | Een "verbetering" vervangt de functie van de bestaande pagina (homepage wordt Helmond, prijzenpagina wordt losse les bij faalangst) | ✅ opgelost, verbeterronde blok B; bevestigd bij de herhaling: "past niet bij het adres" ging van 5 van 16 (nulmeting) naar 0 van 21 |
| 46 | **hoog** | De tekst draait een belofte van de site om: "binnen 4 uur een scherpe offerte" wordt "geen termijn voor de offerte" | ✅ opgelost, verbeterronde blok D (instructie plus controle op de zinsvorm; of een bewering met zijn bron overeenkomt, meet de app nog niet) |
| 47 | **hoog** | Het sterkste bewijs van de klant staat in geen enkele tekst, hoewel het op de feitenkaart staat | ✅ grotendeels opgelost, verbeterronde blok A; bevestigd bij de herhaling: 19 van de 21 nieuwe teksten bevatten minstens één sterk klantfeit |
| 48 | **hoog** | De teksten lezen als een formulier: bedrijfsnaam voor elke alinea, dezelfde feiten drie tot vier keer, voorbehouden, zinnen uit de bronnen | ✅ opgelost, verbeterronde blok D (besluit eigenaar: naam niet voor elke alinea) |
| 49 | middel | Waar de klant een vraag oversloeg, wijkt de tekst uit naar "bespreek dat vooraf" in plaats van het onderwerp los te laten | ✅ opgelost, verbeterronde blok D |
| 50 | **hoog** | De reparatieknop van de klant haalde een juist klantfeit uit de tekst | ✅ opgelost in code met punt 62, PR #133 (reparatieplan blok H, 25 september 2026) |
| 51 | middel | Na een nieuwe versie staat een pagina twee keer in de bibliotheek | ✅ opgelost, PR #117 en de volgende |
| 52 | **hoog** | De opmerking van de klant bij "Schrijf een nieuwe versie" bereikte de schrijver niet | ✅ opgelost, PR #119, nagerekend op productie |
| 53 | middel | Een nieuwe versie verliest het beweringenplan, en wordt daarna niet meer op onderbouwing getoetst | ✅ opgelost, verbeterronde blok C |
| 54 | middel | Een zin met een omschreven klantfeit telt als "zin zonder bron" | ✅ grotendeels opgelost, verbeterronde blok C |
| 55 | **hoog** | Bij drie merken tegelijk meten faalt de Gemini-meting nog steeds volledig op de leverancierslimiet, ondanks de spreiding van blok F | open, herhaling 24/25 september 2026 |
| 56 | **hoog** | Een analyse wordt al na de eerste mislukte rapportpoging op "vastgelopen" gezet en toont de klant een foutmelding, terwijl de taak zelf nog drie keer op de achtergrond opnieuw probeert (tot 30 minuten) | open, herhaling 24/25 september 2026 |
| 57 | middel | Bij één pagina kwamen na het beantwoorden van de eerste vragen 12 nieuwe vervolgvragen over hetzelfde onderwerp (wat zit inbegrepen bij een ketelvervanging), in steeds andere bewoordingen | ✅ opgelost in code, PR #134 (reparatieplan blok I, 25 september 2026); het oordeel van het model is nog niet op een echte voorbereidingsronde nagerekend |
| 58 | laag | De crawl van een grote site (~70 pagina's) las dit keer maar 33 van de 68 pagina's, ook na een extra aanvulronde, tegen 60 van de 68 bij de nulmeting; de site reageerde traag | open, lijkt aan de externe site te liggen en niet aan de code, herhaling 24/25 september 2026 |
| 59 | **hoog** | De bronherleidbaarheidscontrole blokkeert op zinnen die geen bewering over het bedrijf zijn (een datumstempel, een veiligheidsinstructie, een definitie); 20 van de 21 nieuwe pagina's kregen "block" | ✅ opgelost, PR #132 (reparatieplan blok G, 25 september 2026), op productie nagerekend: 3 van 3 herkeurde pagina's van 5 naar 0, 1 en 4 blokkades, resterende 4 grotendeels opgelost in punt 64 |
| 60 | **hoog** | Een verzonnen veiligheidscertificering ("CO-gecertificeerd volgens de Gasketelwet") staat op alle 7 van de 7 nieuwe pagina's van de installateur; de keuring hield hem niet tegen | ❌ onterecht bij narekenen: de certificering staat letterlijk op de site; wel een vangnet voor keurmerken gebouwd, PR #132 |
| 61 | middel | Twee echte cijfers uit dezelfde feitenkaart verwisseld (intake € 50 wordt € 80 op minstens 2 van de 8 pagina's), en een groeiwens ("willen groeien in Son en Breugel") werd een bevestigde aanwezigheidsclaim | ❌ onterecht bij narekenen: de site noemt een intake van € 50 (kantoor) én € 80 (auto), en de klant antwoordde "ja" op Son en Breugel |
| 62 | **hoog** | De reparatieknop ("los alles op") haalt bij een volledige herschrijving een juist klantfeit weg dat niet eens gemeld was, en lost soms zelfs de gemelde punten zelf niet op | ✅ opgelost in code, PR #133 (reparatieplan blok H, 25 september 2026); nameting op productie volgt na de merge |
| 63 | laag | Feiten van de site bevatten letterlijke HTML-codes ("offici&euml;le", "&euro; 50") | ✅ opgelost, PR #132 (reparatieplan blok G, 25 september 2026) |
| 64 | middel | Na blok G bleven op productie zinnen tegenhouden waarin "ons" lijdend voorwerp is ("Vertel ons bij je aanvraag ..."), en een zin met twee bedragen uit twee feiten | ✅ opgelost, PR #133 (reparatieplan blok H, 25 september 2026) |
| 65 | middel | Een feit dat bij een nieuwe versie verdween, werd bij de versie daarna niet meer gemist: de keuring vergeleek alleen met de direct vorige versie | ✅ opgelost, PR #134 (reparatieplan blok I, 25 september 2026) |

---

## 1. Gespreksscherm slaat de waarde van vóór de klik op ✅

**Wat misging.** Bij een lijstveld of keuzeknop las `bewaarVeld()` in
`app/(app)/merk/[id]/_components/onboarding-session.tsx` de waarde uit de vorige weergave. Bij A
ging van 7 van 7 lijsten het laatste punt verloren en bleven 3 van 3 keuzes leeg, terwijl het scherm
"door jou vastgelegd" toonde.

**Status.** Opgelost op 23 september 2026 (PR #108), nagemeten: na de reparatie alle lijsten
volledig en alle keuzes gevuld bij A, B en C.

## 2. Definitieve onderwerpenronde kan alle onderwerpen wissen ✅

**Wat misging.** Het model gaf als prioriteit 0,95; `proposeTopics()` maakte daar 7,05 van in een
integerkolom; de insert mislukte nadat de concepten al gewist waren. A had nul onderwerpen, de taak
stond op "klaar".

**Status.** Opgelost op 23 september 2026 (PR #108): volgorde uit de positie in de lijst
(`lib/topic-volgorde.ts`), concepten terug bij een mislukte opslag, en de taak mislukt zichtbaar.
Nagemeten: A heeft na het gesprek vijf onderwerpen.

## 3. Het merk zelf komt op de lijst "gelijknamige bedrijven die jij niet bent"

**Wat misgaat.** Bij alle drie de merken zette het onderzoek eigen namen op `name_exclusions`. C:
"Autorijschool Pompert / Pompert", "Rijschool Peter Pompert", "Pompert Autorijschool". B: "Wesley Keeris
Installatiebedrijf B.V", "Wesley Keeris Beheer B.V". A: "Hovenier Eindhoven / hoveniereindhoven.nl" (een tweede
site van hetzelfde bedrijf) en "Hoveniersbedrijf Hans Verstraaten B.V".

**Gevolg.** De meting geeft deze lijst mee als "andere bedrijven" (`lib/pipeline/measure.ts:1123`,
`ownExclusions` naar `judgeRun()`). Vermeldingen van het merk zelf kunnen daardoor niet meetellen: de
score valt te laag uit, en elke pagina lijkt minder effect te hebben dan hij heeft.

**Oorzaak.** `extractConfusions()` in `lib/pipeline/baseline-verdict.ts` (rond regel 576) neemt elk
opsommingspunt uit het antwoord op de verwarringsvraag en filtert alleen een naam die exact gelijk
is aan de eigen naam of een alias. Het model somt ook schrijfwijzen en handelsnamen van het bedrijf
zelf op. Het veld wordt in `lib/pipeline/llm-baseline.ts:415` automatisch gevuld.

**Voorstel.** Een kandidaat die de volledige merknaam bevat, of die de AI zelf omschrijft als "ook
een handelsnaam van" of "dezelfde", niet opnemen. En deze voorstellen niet in het veld zelf zetten,
maar als voorstel dat de consultant moet bevestigen (zie punt 11). In dit document gecorrigeerd met
de hand, als consultant.

**Opgelost (24 september 2026, verbeterronde blok F).** `isEigenSchrijfwijze()`
(`lib/pipeline/baseline-verdict.ts`): een kandidaat waarvan elk woord bij een eigen naam hoort of een
rechtsvorm is ("Pompert Autorijschool", "Wesley Keeris Beheer B.V", "Hoveniersbedrijf Hans Verstraaten
B.V"), komt niet meer op de lijst. Met een woord dat niet bij het merk hoort ("Rijschool Peter
Pompert", "Pompert Bouw") blijft hij staan: dat kan een echte andere partij zijn. De meting filtert
de lijst ook bij profielen die al gevuld zijn, dus zonder de data aan te passen.

## 4. De crawl leest 1 pagina van een site van ~70, zonder waarschuwing

**Wat misgaat.** Bij A las de crawl alleen de homepage (`profile_pages`: 1). De sitemap is gezond en
bereikbaar vanaf hier, ook met de user-agent van de crawler; `robots.txt` staat alles toe. Er staat
geen fout in de Vercel-logs.

**Gevolg.** Het merkonderzoek kreeg 4.929 tekens sitetekst (C: 61.945). De aanbodboom werd bepaald op
1.354 invoertokens en mist volgens de blinde lezer ongeveer vijftien diensten met een eigen pagina.
Het voortgangsscherm meldt "1 pagina's gevonden" als gewoon resultaat.

**Oorzaak.** Nog niet vastgesteld. Vermoeden: de site weigert verzoeken van datacenter-IP's (Vercel)
en `collectPageUrls()` in `lib/crawler.ts:379` valt dan stil terug op de links van de homepage.

**Voorstel.** Eerst loggen wat `fetchText()` op de sitemap krijgt (status, lengte) zodat de oorzaak
zichtbaar wordt. Daarna: een waarschuwing op het scherm als de crawl veel minder pagina's vindt dan
de lichte scan of de sitemap aankondigt, met de uitweg "sitemap handmatig opgeven".

**Opgelost (24 september 2026, verbeterronde blok B).** Oorzaak gevonden, en het was niet de
blokkade van datacenter-IP's: de site is traag. Gemeten vanaf hier deed hij 5 tot 12 seconden over
elke sitemap en 4 tot 10 over een pagina, en acht pagina's tegelijk kostten elk 30 seconden (de
server werkt ze na elkaar af). Met een wachttijd van 12 seconden viel de sitemap weg, haalde de
terugval op links de homepage ook niet, en bleef er één pagina over. Nu: sitemaps en robots.txt
krijgen 30 seconden (`SITEMAP_TIMEOUT_MS`), een pagina 25 bij de ontdekkingsstap, de crawl vraagt
minder tegelijk zodra een batch een time-out geeft (`volgendeBatchgrootte()`), en er is een
tijdbudget van 180 seconden in plaats van doorlopen tot de taak wordt afgekapt. Wat niet op tijd
kwam, leest een aanvulronde daarna rustig bij (`crawl_inventory`, modus "meer", tempo
"langzaam", hooguit vier rondes), en het scherm zegt "je site reageerde traag" in plaats van te
zwijgen of JavaScript de schuld te geven. Lokaal nagemeten: 102 adressen gevonden in plaats van 1,
28 gelezen binnen het budget, de rest voor de aanvulronde.

## 5. Meetvragen negeren de groeigebieden: de opdracht spreekt zichzelf tegen

**Wat misgaat.** B wil groeien in Mierlo, Heeze-Leende en Nuenen: 0 van de 30 meetvragen noemt een
van die plaatsen. C: Veldhoven en Son en Breugel 0 keer.

**Gevolg.** De meting zegt niets over de gebieden waar de klant wil groeien, dus ook de aanbevolen
pagina's en de nameting niet.

**Oorzaak, gevonden via de opname van opdrachten (migratie 0112).** De opdracht aan het model bevat
eerst, in hoofdletters: "Dit is een LOKAAL bedrijf dat UITSLUITEND werkt in: Geldrop, Eindhoven. ALLE
10 vragen moeten een van deze plaatsen bevatten", en direct daarna, zacht: "Dit bedrijf WIL groeien
in: Mierlo, Heeze-Leende, Nuenen … stel over deze plaatsen een deel van de vragen". Alle 7 aanroepen
kregen beide regels; het model volgde de harde. Plek: `lib/pipeline/prompts.ts:311-322` en
`growthRegionsRule()` in `lib/pipeline/commercial-context.ts:133`. Er is geen telling in code
(conventie 1).

**Voorstel.** De groeiplaatsen opnemen in de lijst toegestane plaatsen van de lokale regel, met een
aantal ("minstens 3 van de 10 vragen over …"), en in code tellen: haalt een ronde het minimum niet,
dan opnieuw of aanvullen.

**Opgelost (24 september 2026, verbeterronde blok A).** De groeiplaatsen horen nu bij de toegestane
plaatsen van de lokale regel (`toegestanePlaatsen()` in `lib/pipeline/geo-share.ts`), de opdracht
vraagt een aantal ("MINSTENS 3 van de 10 vragen") in plaats van "een deel", en de generator telt na
(`groeiBalans()`): haalt een funnelfase het niet, dan vraagt hij gericht bij en ruilt de laatste
vraag zonder groeiplaats in. Ook een handgeschreven vraag over een groeiplaats mag nu. Nog na te
rekenen op een nieuwe meting.

## 6. "Herkend door ChatGPT bij 5 van 6 vragen" telt gokken op de naam als herkenning

**Wat misgaat.** Bij alle drie de merken meldt het dossier een hoge herkenning (5, 4 en 5 van 6),
terwijl meerdere antwoorden zeggen het bedrijf niet te kennen of alleen uit de naam afleiden wat het
doet ("lijkt de naam van een hoveniersbedrijf in Eindhoven te zijn").

**Gevolg.** De klant leest dat ChatGPT hem al kent. De teksten pakken het echte probleem, onbekendheid,
daardoor niet aan.

**Oorzaak.** `knowsBrand()` in `lib/pipeline/baseline-verdict.ts:207` telt een antwoord als herkend
zodra de merknaam erin staat en geen zin uit `UNKNOWN_PHRASES` voorkomt. Gokken op basis van de naam
staat niet in die lijst.

**Voorstel.** "lijkt … te zijn", "op basis van de naam", "vermoedelijk" en "ik kan niet bevestigen
wat voor bedrijf" toevoegen, met tests op de antwoorden van deze doorloop. Voorzichtig: de lijst is
eerder te ruim geweest (zie het commentaar boven `UNKNOWN_PHRASES`).

**Opgelost (24 september 2026, verbeterronde blok F).** Op de achttien echte antwoorden van de
kennistest bleek meer mis dan de doorlichting noemde: "Ik heb geen betrouwbare, actuele informatie
over X" telde als herkenning, omdat de komma "geen betrouwbare informatie" brak. Nu vallen ook die
vorm, "op basis van de (bedrijfs)naam", "de naam suggereert", "de naam verwijst naar" en "X lijkt een
lokale rijschool" (een soort bedrijf direct na "lijkt een") onder niet kennen. Op de opgeslagen
antwoorden gaat de herkenning (hovenier, installateur, rijschool) van 5, 4 en 5 van 6 naar 2, 0 en 2 van 6, nagerekend met de nieuwe regel. Een test uit augustus
(Fysi-Unique, "lijkt een fysiotherapiepraktijk in Amersfoort te zijn") is bewust omgedraaid: dat is
dezelfde gok, de soort uit de naam en de plaats uit de vraag.

## 7. Het sterkste bewijs van een bedrijf valt tussen crawl en dossier weg

**Wat misgaat.** C noemt "93 procent geslaagd" op drie pagina's die de crawl wel las. Het getal staat
niet in het merkonderzoek en niet in het dossier. Ook de terugbetaling van examengeld en de BOVAG-
cover ontbreken.

**Gevolg.** De schrijver krijgt het argument niet mee dat een lezer het meest overtuigt.

**Voorstel.** Uitzoeken in welke stap het afvalt (onderzoek of dossier; de opname van opdrachten laat
nu zien wat elke stap te lezen kreeg). Een deterministische zoektocht naar percentages, jaartallen en
bedragen in de gelezen pagina's, als vangnet naast de AI.

**Opgelost als vangnet (24 september 2026, verbeterronde blok B).** `vindKerncijfers()`
(`lib/pipeline/kerncijfers.ts`) zoekt in alle gelezen pagina's zinnen met een percentage, een aantal
klanten of projecten, jaren ervaring of een beoordeling, alleen als ze over het bedrijf zelf gaan
(homepage, "wij", "onze" of de merknaam), en zet ze als citeerbaar sitefeit op de feitenkaart. Op de
opgeslagen pagina's van de rijschool levert dat "Lovende reviews op Google en een
slagingspercentage van 93%" op, bij de hovenier "35+ jaar ervaring". Het merkonderzoek zelf is niet
aangepast; waarom het het getal miste, is niet verder uitgezocht.

## 8. Meetvragen: veel dubbel, weinig realistisch, altijd een plaatsnaam

**Wat misgaat.** Volgens de blinde lezer klinken 12, 10 en 17 van de 30 vragen als echte vragen aan
ChatGPT; 14 tot 16 per merk zijn in feite dubbel; alle 90 bevatten een plaatsnaam. Ontbrekende soorten:
vragen zonder plaats of met "in de buurt", prijs per eenheid, reviews, en de bezwaren uit het gesprek
(B: subsidie, besparing, geluid; C: het faalangstexamen van het CBR).

**Gevolg.** De score meet vooral kunstmatig gerichte, lokale naamvragen, en 30 vragen zijn in de
praktijk er 15.

**Voorstel.** Een ontdubbeling in code op betekenis (dezelfde vraag met een andere plaats telt als
één), een minimum aantal vragen zonder plaatsnaam, en de bezwaren uit het gesprek als bron voor
oriëntatievragen. Te meten tegen de blinde lezer.

**Deels opgelost (24 september 2026, verbeterronde blok F).** Dezelfde vraag met een andere
plaatsnaam telt als dubbel (`vraagZonderPlaats()` in `lib/pipeline/geo-share.ts`), gemeten tegen de
vragen die blijven staan: een vraag over een groeiplaats naast dezelfde vraag over het huidige
werkgebied mag wel, want die meet een andere markt (punt 5). De twijfels uit het verkoopgesprek zijn
nu een bron voor de oriëntatie- en overwegingsvragen. Niet veranderd: dat elke vraag een plaats of
"in de buurt" noemt. Dat is een bewuste regel van 11 augustus 2026 (`REGIO_DREMPEL`, een score is een
aandeel, en een landelijke vraag kan een lokaal bedrijf niet winnen). Of de vragen realistischer
klinken, meet de herhaling met de blinde lezer.

## 9. Een adviesregel op de site wordt een dienst en een onderwerp

**Wat misgaat.** B's site zegt "het ventilatiesysteem moet regelmatig worden schoongemaakt" (advies).
De aanbodboom maakte er de dienst "ventilatie laten schoonmaken" van, en dat werd een onderwerp.

**Gevolg.** Een pagina die iets belooft wat het bedrijf niet doet.

**Voorstel.** In de aanbodstap alleen diensten opnemen met een aanbiedende formulering ("wij …",
"u kunt bij ons …"), en het bewijscitaat daarop controleren.

**Opgelost (24 september 2026, verbeterronde blok F).** De aanbodstap krijgt de regel dat een
advies geen dienst is, en `isAdviesCitaat()` (`lib/pipeline/aanbod-citaat.ts`) haalt een dienst eruit
waarvan het bewijscitaat een advies is zonder enig teken van aanbod. Op de echte aanbodboom van de
drie merken valt precies één knoop af: "Mechanische ventilatie schoonmaken".

## 10. Crawl neemt fotopagina's, tag- en auteurspagina's mee

**Wat misgaat.** C: 108 gelezen adressen, waarvan tientallen bijlagepagina's van foto's
(`/whatsapp-image-…/`, `/cbr-peter-pompert-2/`), `/tag/…`, `/category/…` en `/author/…`.

**Gevolg.** Ze eten de grens van 150 pagina's op en verdunnen het merkonderzoek.

**Voorstel.** In `lib/crawl-urls.ts` WordPress-bijlagen, tags, categorieën en auteurs overslaan.

**Opgelost (24 september 2026, verbeterronde blok B).** Archief- en bijlageadressen gaan er vóór het
ophalen uit (`isArchiefOfBijlage()` in `lib/crawl-urls.ts`: tags, categorieën, auteurs, bestanden,
fotonamen onder een bericht), de archiefsitemaps van Yoast worden niet meer geopend, en een bijlage
met een gewone naam valt na het ophalen alsnog af op de klasse `single-attachment` in `<body>`. Bij
de rijschool gaat de lijst van 109 naar 76 adressen.

## 11. Blok met te bevestigen voorstellen klapt dicht als het "compleet" is

**Wat misgaat.** Op het gespreksscherm klapt een blok dicht zodra alle velden gevuld zijn
(`onboarding-session.tsx`, `defaultOpen={!p.compleet}`). Juist in blok 2 zet het onderzoek de
naamuitsluitingen van punt 3. Compleet betekent hier niet gecontroleerd.

**Voorstel.** Velden die door het onderzoek gevuld zijn en nog niet door de consultant bevestigd,
tellen niet als compleet; het blok blijft open met een zichtbare "controleer dit".

**Opgelost (24 september 2026, verbeterronde blok F).** Een veld dat het onderzoek vulde en dat
nog niemand in het gesprek langsliep, telt niet als compleet: het blok blijft open met "3 van de 4
ingevuld, 2 nog te controleren". Een veld aanklikken en verlaten telt als gecontroleerd, want dan
wordt het opgeslagen met het gesprek als bron.

## 12. Klant ziet "Bevestig en start de meting" maar mag de meting niet starten

**Wat misgaat.** Het conceptscherm zegt de klant "Bevestigen is genoeg" en toont de knop; na de klik
verschijnt pas een rode regel dat de consultant de meting start.

**Voorstel.** Voor een klant een andere tekst en knop, bijvoorbeeld "Akkoord, laat mijn consultant
starten", of de knop weglaten.

**Opgelost (24 september 2026, verbeterronde blok F).** Wie de meting niet mag starten, ziet op
het conceptscherm "Je consultant start de meting" en de uitleg in plaats van de knop.

## 13. Klant ziet "Nieuw merk"

**Wat misgaat.** De klant ziet de knop en het hele formulier; `app/api/profiles/route.ts:67` weigert
pas na verzenden (403).

**Voorstel.** Knop en pagina alleen voor beheerders tonen.

**Al opgelost** door de UX-audit van 23 september 2026 (P1.3): de klant ziet "Nieuw merk
aanvragen" en op `/merk/nieuw` de uitleg in plaats van het formulier. Op productie nagekeken als klant
op 24 september.

## 14. Voortgang zegt "klaar" terwijl er nog stappen wachten

**Wat misgaat.** De statusroute van een merk gaf "klaar" terwijl het aanbod bezig was en vijf stappen
wachtten; de technische controle stond op "wacht" met al een resultaat; de schatting zei "nog minder
dan een minuut" bij acht open stappen.

**Voorstel.** De status afleiden uit de openstaande taken, en de tijdschatting uit het aantal open
stappen.

**Opgelost (24 september 2026, verbeterronde blok F).** Een stap met een resultaat staat niet meer
op "wacht" (de technische controle loopt naast de keten), de tijdschatting telt de stappen die pas
na de vorige worden ingepland mee, en de statusroute zegt apart of het onderzoek nog loopt
(`onderzoekLoopt`). Het veld `status` blijft "klaar" na de tweede stap, omdat het profiel dan al
bruikbaar is en het wachtscherm daarop doorschakelt.

## 15. Conceptscherm gaf één keer een foutpagina

Direct na het afronden van het cluster gaf `/analyses/[id]/concept` voor de klant één keer "Deze
pagina kon niet geladen worden"; een tweede keer laden werkte. Niet herhaald. Alleen oppakken als het
terugkomt.

## 16. Taak terug in de wachtrij met 0 pogingen

De lichte scan van B stond op "bezig" (gestart 21:28:17) en daarna weer in de wachtrij met 0
pogingen, en liep later gewoon door. Niet herhaald. Alleen oppakken als het terugkomt.

## 17. Gemini-meting viel volledig uit op een limiet van de leverancier

**Wat misgaat.** Alle 90 Gemini-aanroepen via DataForSEO (30 per cluster, A, B en C) gaven bij de
eerste poging "3rd Party API Service Unavailable (rate_limit_exceeded)" (`jobs.last_error`, type
`measure_llm_response`; `ai_calls.raw_json` bij A: 30 van 30 "mislukt"). De drie clusters werden
kort na elkaar gemeten. De Google AI-overzichten liepen via dezelfde leverancier wel, met 12
"Internal SE Server Error" die bij de tweede poging meestal lukten.

**Gevolg.** Een van de meetbronnen ontbreekt. Nog na te gaan: lukt de herhaling, en zegt het rapport
dat Gemini ontbrak, of rekent het stil zonder?

**Voorstel.** Gemini-verzoeken spreiden (een maximum per minuut in de takenlaag) en in het rapport
zichtbaar maken welke bronnen meetelden.

**Gespreid (24 september 2026, verbeterronde blok F).** Gemini-taken krijgen vier seconden tussen
elkaar, en een nieuwe reeks sluit aan achter wat er al klaarstaat, ook van een ander cluster
(`spreidTijden()` in `lib/jobs/spreiding.ts`). Dertig vragen duren zo twee minuten. De limiet van de
leverancier is niet gepubliceerd; of vier seconden genoeg is, zegt de volgende meting. Welke bronnen
meetelden, zegt het rapport sinds PR #111 al.

## 18. Beoordeling "genoemd of niet" geeft soms platte tekst in plaats van JSON

**Wat misgaat.** Een handvol taken (`measure_prompt` en `measure_ai_overview`, samen minstens 5 van
ruim 400 beoordelingen) faalde met "Unexpected token 'W', "We need ou"… is not valid JSON" of
"We need id…". De beoordeling draait op GPT-6 Luna met redeneerinspanning `none`
(`work: "deterministic"`, `lib/pipeline/measure.ts:314`); het model begon met hardop denken in
plaats van met het JSON-antwoord. Sinds 23 september 2026 op GPT-6; niet bekend of het daarvoor ook
gebeurde.

**Gevolg.** Klein: de takenlaag probeert opnieuw. Maar de mislukte uitvoer wordt nergens bewaard,
want de fout valt vóór `recordUsage()` in `callStructured()`; deze aanroepen kosten wel geld en staan
niet in `ai_calls`.

**Voorstel.** In `callStructured()` ook een mislukte parse loggen (met de ruwe tekst), zodat het
aandeel meetbaar wordt; nagaan of het vaker gebeurt op GPT-6 Luna met `none` dan op de vorige Luna.

**Vastleggen opgelost (24 september 2026, verbeterronde blok F).** Een aanroep waarvan het antwoord
geen geldige JSON is, komt nu in `ai_calls` met `raw_json = { mislukt: true, fout }` en de volledige
invoer; kosten en tokens zijn dan onbekend. Daarmee is het aandeel te meten. De oorzaak zelf (hardop
denken bij redeneerinspanning `none`) is niet aangepakt.

## 19. Een definitief mislukte Gemini- of Google-meting laat de analyse eeuwig op "meten" staan ✅

**Wat misging.** Sinds 20 september 2026 wacht de aggregatie op alle drie de meetbronnen
(`scheduleAggregateIfLastPrompt()` in `lib/jobs/handlers.ts`). Maar `scheduleFollowUpAfterFailure()`
plande de aggregatie na een definitief opgegeven taak alleen in voor `measure_prompt`. Op 24
september gaven alle 90 Gemini-taken van A, B en C op (punt 17), en alle drie de analyses bleven op
"meten" staan: geen rapport, geen pagina's, geen melding.

**Status.** Opgelost: de tak kent nu alle drie de meetsoorten, met een unittest en een
ketentestscenario. De drie vastgelopen analyses zijn na de reparatie met de hand aangezet.

## 20. Het rapport schrapt elke zin over welke concurrent een vraag wint, ook de juiste ✅

**Wat misging.** Het bewijsdossier dat het rapportmodel krijgt, noemt de gemiste vragen V1, V2,
enzovoort, zonder meet-id. Het schema vraagt per gap wel om meet-id's (`evidenceRunIds`). Het model
gaf dus codes ("V1") terug (hovenier, rijschool) of een lege lijst (installateur). De naamcontrole
(`validateReportClaims()` in `lib/pipeline/report.ts`) zocht die codes als meet-id op, vond niets, en
had dus bij elke gap een lege lijst toegestane namen. Gevolg: elke zin met een concurrentnaam ging
eruit. Vandaag 17 (A), 17 (B) en 15 (C) zinnen, in `reports.stripped_claims_json`, alle 49 met
`supportedNames: []`. Juist het deel van het rapport dat de klant het meest wil lezen ("wie staat er
wel, en waarom") verdween.

**Nagerekend.** Met de reparatie had 47 van de 49 zinnen mogen blijven staan: de genoemde naam stond
echt onder die vraag in het dossier. De overige 2 zijn punt 21.

**Oplossing.** `resolveGapEvidence()` (`lib/pipeline/evidence-format.ts`) vertaalt codes naar
meet-id's vóór de naamcontrole, met als terugval de codes in de clusternaam en daarna de dossiervragen
met dezelfde clusternaam. `schoonGapCluster()` haalt ook de code voor de clusternaam weg: alle 15 gaps
van de rijschool begonnen met "V1" plus een kastlijntje, zichtbaar voor de klant.

## 21. Een eigen product telde in de naamcontrole als concurrent ✅

**Wat misging.** Bij de installateur werd twee keer een zin geschrapt omdat "Hybride warmtepomp" als
naam in het entiteitenregister van het profiel staat. Elke zin die het product noemt, telt daardoor
als een bewering over een concurrent. **Waar te zoeken:** de indeling van namen (`classify_entities`)
en `looksLikeBrandName()` in `lib/pipeline/evidence.ts`, die dit filter voor het dossier wel heeft
maar niet voor `knownNames` in de naamcontrole.

**Oorzaak en oplossing.** De naam staat in het register met de rol `eigen_product`: terecht, het is
het product van de klant zelf. `loadKnownBrandNames()` nam die rol mee als naam om te controleren.
Een eigen product is geen bewering over een concurrent, dus die rol valt er nu uit.

## 23. Hetzelfde bedrijf staat twee keer in het namenregister

Bij de installateur staan "Verwarming Service Brabant" en "Verwarming Service Brabant (VSB)" als twee
concurrenten, en ook "VSB Hybride" (als niet relevant). Het gevolg voor het rapport (een juiste zin
geschrapt) is opgevangen: de naamcontrole negeert nu een toevoeging tussen haakjes. De dubbeling zelf
staat nog open en telt de vermeldingen van dat bedrijf over twee namen uit. **Waar te zoeken:**
`isSameEntity()` in `lib/entities/normalize.ts`.

**Opgelost voor nieuwe namen (24 september 2026, verbeterronde blok F).** `normalizeEntityName()`
haalt een toevoeging tussen haakjes achteraan weg, dus "Verwarming Service Brabant (VSB)" valt samen
met "Verwarming Service Brabant". De twee rijen die er al staan, zijn niet samengevoegd: dat vraagt
het omhangen van alle vermeldingen en is een onomkeerbare datawijziging.

## 22. Het rapport zegt "niet genoemd, 0 op 100" terwijl Google het merk wel noemde ✅

**Wat misging.** Het rijschoolrapport opende met "Pompert werd niet genoemd bij de 30 onderzochte
vragen. De zichtbaarheid is daarmee ongeveer 0 op 100". In de meting stond Pompert in 17 van de 74
AI-overzichten van Google (score 23). Het rapportmodel kreeg alleen het ChatGPT-cijfer en kon het
verschil niet weten. De klant leest in de eerste zin dat hij onzichtbaar is, en dat klopt niet.

**Oplossing.** De schrijfinstructie zegt nu welke andere bronnen het merk wel noemden (zonder hun
cijfer, want de eigenaar wil naast de ChatGPT-score nergens een tweede getal), en `vulBronnenAan()`
(`lib/pipeline/report-summary.ts`) zet er één zin achter als de samenvatting toch "niet genoemd" zegt
zonder ChatGPT erbij.

**Nagerekend op productie (24 september 2026).** De drie rapporten opnieuw gemaakt (de oude staan
bewaard als periode -1). Geschrapte zinnen: van 17, 17 en 15 naar 0, 5 en 0; de 5 waren punt 21 (4)
en punt 23 (1), die daarna ook opgelost zijn. Geen gap meer zonder bewijs (was 15 van 15 bij de
installateur). De samenvatting van alle drie noemt nu dat de score over ChatGPT gaat en dat Google het
merk wel noemde. Bij de rijschool stond de rechtzetting er toen twee keer in (model en vangnet); het
vangnet zwijgt nu als de samenvatting de bron al noemt.

## 24. Prioriteit van de aanbevelingen heeft geen afgesproken richting

De code (`mergeOverlappingRecommendations()`, de rapportmail) leest "laagste getal is het
belangrijkst". De instructie aan het model zegt daar niets over. Installateur en rijschool kregen
1 tot en met 5 en 1 tot en met 8; de hovenier kreeg 9, 10, 10, 7 en 6, met de twee pagina's waar
de ondernemer op wil groeien (Best en Nuenen) op 10, dus achteraan. Gevolg nu klein: het getal
bepaalt alleen de top 3 in de rapportmail (standaard uit) en welke van twee dubbele adviezen blijft.
**Richting:** de volgorde uit de meting afleiden (som van de gewichten van de doelvragen), zoals
bij punt 2, en het getal van het model alleen als tweede sleutel.

**Opgelost (24 september 2026, verbeterronde blok A).** `rangschikAanbevelingen()`
(`lib/pipeline/recommendation.ts`) bepaalt de volgorde: het gewicht van de gemiste vragen, keer twee
bij een groeidoel, het getal van het model alleen als tweede sleutel, en daarna opnieuw genummerd
met 1 als belangrijkste. De instructie zegt dat nu ook. Nagerekend op het opgeslagen rapport van de
hovenier: Best en Nuenen gaan van 10 naar 1 en 2.

## 25. Een klaar cluster heeft geen link op zijn kaart ✅

`cluster-kaart.tsx` gaf de kop en de links "Cijfers van dit cluster" en "Pagina's van dit cluster"
alleen bij status "gemeten". Na het rapport is de status "gereed", de eindtoestand. De klant zag bij
alle drie de merken een kaart waar niets op te klikken viel, behalve het menu met de drie puntjes.
Opgelost: "gereed" hoort er nu bij.

## 26. De consultant ziet de clusters van een klantmerk niet

`loadBrandWork()` (`lib/work.ts`) en de prullenbak op de clusterpagina filteren op
`user_id = de ingelogde gebruiker`. De database laat een consultant alles lezen, maar dit extra
filter verbergt precies de clusters van de klant: bij alle drie de merken zag de consultant
"Alle clusters (0)" en de knop "Start het eerste cluster", terwijl er een gereed cluster was. Een
consultant die daarop klikt, start een tweede cluster en betaalt de meting dubbel. **Waarom nog
niet opgelost:** het raakt aan wie wat mag zien. De veilige richting is filteren op merk en de
toegang aan de database laten (die staat dat al goed toe), maar dat verdient een eigen controle
van alle plekken die `loadBrandWork()` gebruiken (`app/(app)/merk/[id]/page.tsx` en de
clusterpagina).

**Opgelost (24 september 2026).** `loadBrandWork()` en de prullenbak filteren alleen nog op het merk.
Wie wat mag zien bepaalt de database al (`analyses_select_own`, `_account`, `_staff`); het extra
filter verborg de clusters ook voor een collega die als lid in het account zit.

## 27. Het rapport kent de groeidoelen en feiten uit het gesprek niet

**Gezien.** Drie blinde lezers (stap 13) kwamen onafhankelijk op hetzelfde uit: het rapport stuurt
op wat de meting laat zien, niet op wat de ondernemer wil. De rijschool kreeg pagina's voor Helmond,
Waalre en Geldrop (geen groeiplaatsen) en niets over autisme en ADHD (zijn eerste groeidoel). De
installateur kreeg niets over Mierlo en Nuenen (zijn groeiplaatsen) en niets over ketelvervanging en
het onderhoudscontract (zijn tweede groeidoel). Adviezen zeggen "noem alleen bedragen die je kunt
onderbouwen" terwijl de ondernemer die bedragen in het gesprek al gaf.

**Nagerekend.** In de invoer van het installateursrapport komen "Mierlo", "1.800", "Remeha",
"24 uur", "4.500" en "VvE" nul keer voor. `generateReport()` haalt `profile_strategy` op, maar geeft
alleen `context_factors` door (`lib/pipeline/report.ts`, de `strategyRow`).

**Richting.** De groeidoelen, groeiplaatsen, klantgroepen en verboden onderwerpen uit het gesprek
horen in de rapportinvoer, als weegfactor bij de volgorde en als filter (geen advies over een
verboden onderwerp). Het deel van punt 5 (de meetvragen negeren de groeiplaatsen) zit hier
stroomopwaarts van: vraagt de meting niet naar Mierlo, dan kan het rapport er ook niets over zeggen.

**Opgelost (24 september 2026, verbeterronde blok A).** De rapportinvoer krijgt de groeidoelen,
groeiplaatsen, klantgroepen, het aanbod dat de klant niet wil, de verboden onderwerpen en het bewijs
uit het gesprek (`reportSteering()` in `lib/pipeline/commercial-context.ts`). De weging staat in code:
een aanbeveling die een groeiplaats of een kernwoord van het groeiaanbod raakt, telt dubbel, en een
aanbeveling over aanbod dat de klant niet wil, gaat eruit (zie punt 24). Kanttekening uit het
narekenen: bij een cluster dat zelf over het groeiaanbod gaat (warmtepomp, faalangst) raken bijna
alle aanbevelingen het kernwoord, en dan beslissen vooral de groeiplaatsen. Dat de rijschool geen
pagina voor Veldhoven kreeg, komt door punt 5: de meting vroeg er niet naar.

## 28. De site-inventaris mist de hoofdpagina uit het menu en bevat fotobijlagen

**Gezien bij de rijschool.** De pagina `/rijles-met-faalangst-autisme/` staat in het hoofdmenu en is
de belangrijkste pagina voor het cluster, maar zit niet tussen de 108 pagina's die de app van de
site kent. Wel bekend: vijf fotobijlagepagina's (`/cbr-peter-pompert-2/` tot en met `-5/`) en een
tagpagina. Het rapport adviseert daardoor de blog "angst voor autorijden" als faalangstpagina, en
wil een fotobijlage (`/autorijschool-pompert/cbr-peter-pompert-2/`) "verbeteren" met uitleg over het
faalangstexamen. **Bij de hovenier** kende de app één pagina (punt 4), dus adviseerde het rapport
"nieuwe pagina voor Best" en "voor Nuenen" terwijl `/hovenier-in-best/` en `/hovenier-in-nuenen/`
bestaan. Punt 4 en 10 hebben hier dus een direct zichtbaar gevolg in het advies aan de klant.

**Opgelost (24 september 2026, verbeterronde blok B).** De sitemap van de rijschool miste de
pagina's uit het hoofdmenu, waaronder de faalangstpagina die het hele cluster draagt. De app leest
nu ook het menu van de homepage (`menuLinks()`: binnen `<nav>` en `<header>`, en de menu-items van
WordPress, want daar stond het menu van de rijschool) en zet die pagina's vooraan bij het kiezen
(`metMenuVoorrang()`). Lokaal nagemeten: 18 menupagina's, de faalangstpagina op plek 10 van 150.

## 29. Het planscherm belooft de klant iets wat hij niet mag ✅

Als klant stond er "Zodra hieronder alles klaarstaat, stel je het plan zelf op" met een actieve knop
"Stel het contentplan op". Klikken gaf een 403 met de melding dat de consultant het schrijven in gang
zet (`content_schrijven` in `lib/cost-rules.ts`, sinds 2 september 2026 alleen voor de consultant).
Het scherm zei het dus pas achteraf. Nu staat de melding er vooraf, zoals bij "Geef deze maand vrij"
sinds de UX-audit van 23 september.

## 30. Het plan gaf de zwaarste gemiste vraag potentie 0 ✅

`loadPotentialForTargets()` (`lib/potential-data.ts`) telde een vraag als "genoemd" zodra het merk
in één meting van één bron stond. Het rapport gebruikt een meerderheidsregel (eerst per bron over de
herhalingen, dan één stem per bron, `lib/pipeline/missed-prompts.ts`). Bij de installateur noemde
ChatGPT hem bij de zwaarste vraag ("Welke installateur in Geldrop kan een hybride warmtepomp in mijn
bestaande woning plaatsen?", gewicht 0,50) in een van de drie herhalingen en Google in geen van de
drie. Het rapport: gemist, en de eerste aanbeveling. Het plan: potentie 0, dus de laatste pagina van
de maand. Bij de hovenier kregen twee pagina's om dezelfde reden 0. Nu volgt de potentie dezelfde
regel (`genoemdPerVraag()`).

## 31. Het plan zet vier verbeteringen van dezelfde pagina in dezelfde week

Bij de installateur gaan vier van de vijf geplande pagina's over `https://www.wkinstallatie.nl/warmtepomp`
(keuzehulp, controle vooraf, prijs, lokaal voor Geldrop), gepland op 25, 26, 27 en 28 september. Elk
wordt een aparte verbeteropdracht voor dezelfde pagina: vier herschrijvingen die elkaar overschrijven
of een klant die er zelf één pagina van moet maken. Bij de hovenier twee verbeteringen van de
homepage op dezelfde dag. De drie blinde lezers van stap 13 raadden alle drie aparte pagina's per
vraag aan. **Richting:** `mergeOverlappingRecommendations()` voegt adviezen al samen; dezelfde
`existingUrl` hoort daar als samenvoegreden bij, of het rapport moet bij een tweede advies voor
dezelfde pagina een nieuwe pagina voorstellen.

**Opgelost (24 september 2026, verbeterronde blok E, besluit eigenaar).** Twee lagen. In het
rapport blijft per bestaande pagina één verbetering over; de volgende wordt een nieuwe pagina met die
pagina als verwante pagina (`eenVerbeteringPerAdres()`). In het plan zit er minstens drie maanden
tussen twee verbeteringen van dezelfde pagina, ook over vrijgegeven maanden heen
(`VERBETER_TUSSENRUIMTE_MAANDEN` in `lib/plan-fill.ts`); een tweede schuift door naar een latere
maand, en past hij niet meer, dan blijft hij in de voorraad.

## 32. "Opnieuw opzetten" faalt, of laat de kansen van het oude plan achter

**Gezien.** Na de reparatie van punt 30 wilde ik het plan van de hovenier opnieuw opzetten om de
nieuwe volgorde na te rekenen. Het venster belooft "Je krijgt twaalf verse maanden terug, meteen
gevuld met de sterkste kansen uit je voorraad". De server antwoordde 422: "Er zijn nog geen gemeten
kansen om in te plannen." Het oude plan bleef ongewijzigd staan (geen schade).

**Oorzaak.** `createPlan()` (`lib/plans.ts`) telt als voorraad alleen `planned_pages` zonder maand
(`plan_month_id is null`). De vijf kansen van de hovenier stonden al in maand 1 van het huidige plan
en tellen dus niet. Bij een nieuwe klant staat alles in het eerste plan, dus faalt opnieuw opzetten
altijd. Is er wel losse voorraad, dan lukt het, maar de kansen in de niet vrijgegeven maanden van het
oude plan blijven daar hangen: `syncBacklog()` maakt ze niet opnieuw aan omdat ze al bestaan.

**Richting.** Bij opnieuw opzetten de pagina's uit de nog niet vrijgegeven maanden van het oude plan,
zonder tekst, terugzetten in de voorraad (maand en datum leeg) voordat de voorraad geteld wordt. Het
oude plan houdt dan zijn maanden maar niet die pagina's; het venster moet dat dan ook zo zeggen.

**Opgelost (24 september 2026, verbeterronde blok E).** Bij opnieuw opzetten gaan de pagina's uit
de nog niet vrijgegeven maanden van het lopende plan, zonder tekst en nog niet begonnen, eerst terug
naar de voorraad (`zetOudPlanTerug()` in `lib/plans.ts`); een vrijgegeven maand blijft staan. Het
venster zegt dat nu ook. De ketentest geeft zonder de reparatie precies de melding van productie
("Er zijn nog geen gemeten kansen om in te plannen").

## 33. Een deadline in het verleden

Het vrijgeefvenster zei op 24 september: "Beantwoord ze graag vóór 13 september om op schema te
blijven." Het plan zette de eerste pagina op 25 september; met tien dagen schrijftijd en twee dagen
voor de vragen lag de deadline elf dagen terug. Details in stap 15 van
`docs/tasks/kwaliteitsdoorlichting-stappen.md`.

**Opgelost (24 september 2026, verbeterronde blok E).** De vrijgeefdialoog noemt nooit meer een
datum in het verleden: ligt de streefdatum al achter ons, dan staat er "Beantwoord ze zo snel
mogelijk: de eerste pagina staat op 25 september, en we schrijven pas als de vragen gedaan zijn.
Die datum schuift dus mee." (`streefzin()` in `lib/pagina-stand.ts`). Wat niet veranderd is: het
plan zet de eerste pagina in de lopende maand nog steeds vanaf morgen. Of die eerste datum pas
twaalf dagen na vrijgeven hoort te liggen, is een planningsvraag die de dialoog nu eerlijk maakt
maar niet beslist.

## 34. "Wacht op jouw vrijgave" terwijl de consultant vrijgeeft

Op het planscherm van de klant staat bovenaan "Deze maand wacht op jouw vrijgave. Daarna begint ORBIT
ENGINE te schrijven." en onderaan hetzelfde blok "Deze maand goedkeuren doet je consultant bij Outer
Orbit samen met jou." Beter: "Deze maand wacht op vrijgave door je consultant. Laat weten of je
akkoord bent."

## 35. Vragen die het gesprek al beantwoordde, blijven openstaan

Bij de installateur vraagt de app de klant onder "Vragen over je merk": "Hoeveel eigen monteurs werken
er momenteel bij het bedrijf?", "Kunnen klanten buiten kantoortijden een storing melden?", "Biedt u
onderhoudscontracten aan?" en "In welke plaatsen buiten Geldrop en Eindhoven neemt u opdrachten
aan?". Alle vier staan in het gesprek (`profiles.offline_proof`: "Twaalf monteurs in dienst",
"binnen 24 uur bij een storing, ook in het weekend", "Meer dan 1.800 onderhoudscontracten";
`profiles.growth_regions`: Mierlo, Heeze-Leende, Nuenen). De vragen zijn om 21:41 gemaakt tijdens het
onderzoek, het gesprek is om 22:00 opgeslagen (`profile_field_sources.set_at`), en niets sluit een
vraag af die het gesprek beantwoordt. Bij de rapportvragen hetzelfde: "Welke plaatsen bedient Wesley,
specifiek Geldrop, Mierlo en Nuenen?". **Gevolg:** de klant typt opnieuw wat hij net vertelde, en
leest daaruit dat er niet geluisterd is. **Richting:** na het opslaan van het gesprek de open
merkvragen langs de ingevulde velden leggen en een beantwoorde vraag sluiten met het antwoord uit het
gesprek.

**Opgelost (24 september 2026, verbeterronde blok A).** Bij het opslaan van het gesprek sluit
`sluitVragenUitGesprek()` (`lib/vraag-sluiten.ts`) de open merkvragen die het gesprek beantwoordt,
met status `verlopen` en het antwoord erbij; het merkonderzoek en het rapport stellen zulke vragen
niet meer (`filterNieuweMerkvragen()`). Bewust streng (`lib/vraag-dekking.ts`): alleen als elk
inhoudswoord van de vraag in één gespreksfeit terugkomt. Op de echte vragen van de installateur gaan
de monteursvraag en de plaatsvraag dicht; "onderhoudscontracten voor cv-ketels, warmtepompen of
airco's" en "storing buiten kantoortijden" blijven open, want het gesprek zegt niet voor welke
toestellen of op welke tijden. Paginavragen blijven altijd open: die hangen aan een bewering.

## 36. Elk rapport zet zijn eigen vragen klaar

`saveFactRequests()` (`lib/pipeline/report.ts`) bewaart de feitvragen van het rapport per merk, met
een unieke sleutel op de letterlijke vraagtekst. Een nieuw rapport (volgende periode, of opnieuw
gemaakt) formuleert dezelfde vraag net anders en zet hem er dus opnieuw bij. Na drie rapportversies
had de installateur vier varianten van "welke controles doet u bij een woningbezoek" en drie van
"welke merken levert u". Ook zonder herhaling overlappen de rapportvragen met de vragen per pagina
("Wat is doorgaans de wachttijd voor een eerste gesprek" en "Wat is de gebruikelijke wachttijd voor
een eerste gesprek en voor de start van tuinaanleg" stonden allebei bij de hovenier). Voor de
doorlichting zijn de vragen van de twee gearchiveerde rapportversies op `verlopen` gezet (31 rijen,
niets verwijderd).

**Grotendeels opgelost (24 september 2026, verbeterronde blok A).** Een nieuwe rapportvraag wordt
vergeleken met alle vragen die al bij het merk staan, ook beantwoorde en overgeslagen
(`zelfdeVraag()` in `lib/vraag-dekking.ts`). Herkend: dezelfde vraag korter gesteld, en dezelfde
vraag met een ander slot ("welke merken en modellen hybride warmtepompen"). Niet herkend: twee
vragen die hetzelfde bedoelen met andere woorden ("woningopname" tegenover "woningbezoek"). Dat
vraagt een taalmodel en blijft voorlopig liggen: liever één vraag dubbel dan een terechte vraag
weggelaten.

## 37. "En" en "of" met een schuine streep in een vraag aan de klant

"Voor welke begeleidingsvragen hebben instructeurs specifieke ervaring of scholing: faalangst, ADD,
ADHD" met daarna "en" en "of" met een schuine streep, en dan "autisme?". De schrijfregels
(`docs/schrijfstijl.md` §10) verbieden die combinatie overal; de
vraagtekst komt rechtstreeks uit het model zonder controle. Hetzelfde vangnet als voor de
gedachtestreepjes hoort ook over vraagteksten te gaan.

## 38. Het laatste antwoord van een pagina laat de klant wachten

Gemeten over 70 antwoorden: een gewoon antwoord kost 0,3 tot 1,3 seconden. Het laatste antwoord van
een pagina kost 9 tot 18 seconden, en het allereerste van de hovenier meer dan 30. De route
(`app/api/profiles/[id]/facts/route.ts`) roept na het opslaan `probeerNaAntwoord()` aan, en die
beoordeelt voor elke gekoppelde pagina de onderbouwing en start het schrijven, binnen dezelfde klik.
Een vraag die aan vijf pagina's hangt, doet dat vijf keer. **Richting:** het opslaan meteen
bevestigen en de beoordeling als taak inplannen.

**Opgelost (24 september 2026, verbeterronde blok F).** De route bevestigt het antwoord meteen en
doet het beoordelen en klaarzetten van het schrijven daarna (`after()` van Next.js, met ruimte tot
60 seconden).

## 39. Een beantwoorde vraag maakt de bewering erachter nooit "onderbouwd"

**Gezien bij de hovenier, pagina Best.** De klant beantwoordde de prijsband ("meestal tussen 12.000 en
35.000 euro"), de duur ("2 tot 3 weken uitvoering") en bestraten in de winter ("Ja"). De schrijver
gebruikte prijs en duur. Toch staan ze in de keuring als "Deze pagina leunt op een bewering die we
niet kunnen onderbouwen", met als oplossing "Beantwoord deze vraag: Hebben jullie een prijsvoorbeeld
of prijsband...". Dezelfde vraag die de klant net beantwoordde.

**Oorzaak.** `claimIsOnderbouwd()` (`lib/pipeline/evidence-weight.ts`) herkent een bewering alleen via
het bronnummer (`sourceRef`) of het citaat (`supportQuote`) dat de claim-audit tijdens de voorbereiding
meegaf. Een bewering zonder bron op dat moment heeft geen van beide; juist die wordt een vraag aan de
klant. Het antwoord komt als feit binnen (`brand_facts.origin_fact_request_id` wijst naar de vraag),
maar niets legt de lijn terug naar de bewering. `buildPlanBlock()` (`lib/pipeline/content.ts`) zegt de
schrijver daardoor ook "GEEN BRON: laat deze passage weg" over precies wat de klant aanleverde.
**Richting:** de vraag draagt al een `claim_key`; een feit uit een beantwoorde vraag dekt de bewering
met dezelfde sleutel.

**Opgelost (24 september 2026).** Een feit uit een beantwoorde vraag draagt nu de sleutel van de
bewering mee (`FactItem.claimKey`, gevuld in `buildFactBase()`), en `claimIsOnderbouwd()` telt een
bewering als gedekt als een toegestaan feit dezelfde sleutel heeft (`feitUitAntwoord()` in
`lib/pipeline/evidence-weight.ts`). Een "nee" van de klant wordt in de schrijfopdracht een verbod.
Ketentest: antwoord op een paginavraag, daarna is de bewering onderbouwd.

## 40. De keuring blokkeert op beweringen van andere pagina's

In de keuring van de pagina voor Best staan blokkades als "nodig voor: De pagina moet laten zien dat
één hovenier ontwerp, bestrating en aanleg kan combineren voor een tuin in Nuenen" en "De bezoeker
vraagt om een ongeveer-bedrag voor ontwerp en aanleg" (bestrating in Eindhoven). **Oorzaak:**
`paginaVanClaim()` in `lib/pipeline/briefing.ts` koppelt een bewering die op geen enkele doelvraag
matcht bewust aan alle pagina's van de batch ("kost hooguit een dubbele vraag"). Dat is goed voor het
stellen van vragen, maar het paginaplan dat dezelfde koppeling gebruikt, gaat naar de schrijver en de
keuring, en daar wordt een bewering van een andere pagina een blokkade. Dezelfde bewering stond vier
keer in één keuring.

**Opgelost (24 september 2026).** Het paginaplan koppelt nu strikt (`claimHoortBijPagina()` in
`lib/pipeline/briefing.ts`): via de sectieverwijzing, anders via de doelvraag, en anders niet. Het
stellen van vragen houdt de ruime koppeling, want daar kost een dubbele vraag weinig.

## 41. Antwoorden van de klant opgeslagen als feit van de site

In `brand_facts` staan de antwoorden op de paginavragen van de hovenier met `kind = site` en `source =
"site hansverstraatenhoveniers.nl"`, als aan elkaar geplakte vraag en antwoord ("Leggen jullie
bestrating ook in de winter aan? Ja, in de winter doen we vooral bestrating en ontwerp"). De
antwoorden op de merk- en rapportvragen staan wel goed als `kind = klant`, "klant, bevestigd
24-9-2026". Verkeerde herkomst maakt de audit-trail onbetrouwbaar en laat een schrijver een klantfeit
als sitefeit citeren.

**Oorzaak en oplossing (24 september 2026).** `answerFact()` (`lib/facts.ts`) zette elk antwoord als
"vraag + antwoord" ook in `profiles.proof_points`, en `buildFactBase()` labelt die lijst als "site" en
zet hem merkbreed op elke kaart. Zo kwam een antwoord dat bij één pagina hoort op alle pagina's. Nu
gaat een antwoord op een vraag uit de voorbereiding (met `claim_key`) of een paginavraag niet meer naar
`proof_points` (`moetNaarProofPoints()` in `lib/proof-point-regel.ts`); het bereikt de schrijver al met
de bron "klant, bevestigd" en alleen bij zijn eigen pagina. **Niet teruggedraaid:** de 12 regels die
de doorlichting al in `proof_points` van de drie merken zette, blijven staan.

## 42. "Tekst is klaar, keur hem goed" bij een tegengehouden tekst

Vier teksten van de hovenier stonden op `ready` met `quality_verdict = block` (100 procent zeker). De
klant ziet in de bibliotheek "Tekst is klaar: lees hem en keur hem goed" met "Kwaliteit 65 tot 73 op
100", en op de pagina "Er staan nog 15 punten open" met de knoppen "Los de 15 punten op" en "Keur toch
goed". Twaalf van die vijftien kan hij niet oplossen (punt 39 en 40). Gevolg: óf hij keurt toch goed en
leert dat de punten niets betekenen, óf hij blijft hangen.

**Opgelost (24 september 2026, verbeterronde blok C).** Besluit van de eigenaar: tonen mag, met een
duidelijke melding. De bibliotheek leest nu het oordeel van de keuring (`quality_verdict`), en bij
"block" staat er "Tekst is klaar, maar onze controle houdt hem tegen: bekijk eerst de punten" in
plaats van "keur hem goed", met als volgende stap "Bekijk de punten" en de zin dat de klant hem
bewust toch kan goedkeuren als hij vindt dat de punten niet kloppen (`lib/pagina-stand.ts`).

## 43. Het bedrag van de klant "in strijd met de instructie"

De opzet van de pagina (`contract_json`) is gemaakt vóór de klant zijn prijsband gaf en zegt daarom
"geen prijsbedragen noemen". De schrijver kreeg daarna wel de prijsband en gebruikte hem. De keuring
toetst tegen de oude opzet: "De genoemde prijsband is in strijd met de instructie om geen
prijsbedragen op te nemen", en hetzelfde voor de doorlooptijd. De opzet hoort na de antwoorden bij te
werken, of de keuring hoort de feitenkaart boven de opzet te laten gaan.

**Opgelost (24 september 2026, verbeterronde blok C).** `contractMetFeiten()`
(`lib/pipeline/contract-format.ts`) haalt een verbod uit de opzet weg als een later klantfeit het
tegenspreekt: "geen prijsbedragen" valt weg zodra de klant een bedrag gaf, "geen vaste
doorlooptijd" zodra hij een termijn gaf. Voor de schrijver én voor de keuring; een sitefeit met een
bedrag heft het verbod niet op, alleen de klant zelf.

## 44. Tegengehouden pagina: "Alle gegevens bekend, wordt nu geschreven"

"Leg op de bestaande pagina uit welke plaatsen en projecten het bedrijf bedient" werd niet geschreven
omdat de dekking 33 procent was (`te_weinig_onderbouwd`). De bibliotheek toont de klant "Alle
gegevens bekend, wordt nu geschreven". De melding uit `schrijfpoort()` ("er is te weinig over je
bedrijf bekend... kies of we hem algemeen schrijven") bereikt dat scherm niet.

## 45. Een "verbetering" vervangt de functie van de bestaande pagina

Het advies was "Maak de bestaande hoofdpagina concreter over complete tuinen en bestrating", met
`existing_url = https://hansverstraatenhoveniers.nl`. De geschreven tekst heet "Complete tuin met
bestrating in Helmond | Hans Verstraaten", opent met "Wil je jouw tuin in Helmond helemaal
vernieuwen" en de doelgroep (`target_intent`) is "Een huiseigenaar in Helmond". Wie hem publiceert
op het adres waar hij voor bedoeld is, vervangt de homepage van een hovenier met zeven werkplaatsen
en vijftien diensten door een pagina over één plaats en één dienst. **Oorzaak, vermoedelijk:** de
zwaarste doelvraag van dit advies ging over Helmond, en de opzet (`content_contract`) neemt de
doelvraag als onderwerp en niet het soort pagina. Het rapport koos "verbeter de homepage" omdat de
app maar één pagina van de site kende (punt 4).

**Het is een patroon, geen uitzondering.** Bij de rijschool werd de prijzenpagina
(`/prijzen-lespakketten/`) "Losse rijles bij faalangst in Eindhoven": proefles, automaat en de prijs
van de simulatorcursus staan er niet meer in. De pagina "Wat kan ik verwachten tijdens mijn eerste
rijles" werd een tekst over de intake. Bij de installateur werd `/warmtepomp` drie keer herschreven,
elke keer rond een andere doelvraag (punt 31). De blinde lezers zeiden bij 5 van de 16 teksten "past
niet bij het adres". **Richting:** bij "verbeteren" hoort de huidige functie van de pagina (wat er nu
op staat en waarom) een vaste eis in de opzet te zijn, en de doelvraag een aanvulling.

**Opgelost (24 september 2026, verbeterronde blok B).** Twee lagen (`lib/pipeline/paginafunctie.ts`).
De homepage, de contactpagina en de pagina over het bedrijf worden nooit meer vervangen door een
onderwerppagina: een aanbeveling die er een aanwijst, wordt een nieuwe pagina met die pagina als
verwante pagina. Bij elke andere verbetering krijgen de opzet en de schrijver de functie van de
pagina als vaste eis bovenaan ("Dit is de PRIJZENPAGINA. Alle prijzen en pakketten die er nu op
staan, blijven erop"), met de doelvraag als sectie en niet als nieuw onderwerp. Nog na te rekenen
op een nieuwe tekst.

## 46. De tekst draait een belofte van de site om

De site: "wij doen ons best om je binnen 4 uur te voorzien van een scherpe offerte". De nieuwe tekst
(Helmond, punt 45): "Voor een offerteaanvraag noemt onze contactpagina een beoogde reactietijd van
binnen 4 uur. Dat is geen termijn voor het ontwerp of de offerte." Waarschijnlijk een voorzichtige
herformulering door het model, maar het resultaat spreekt de ondernemer tegen, en juist in de richting
die hem een verkoopargument kost. De keuring van de app zag dit niet: ze toetst of een bewering een
bron heeft, niet of hij met die bron overeenkomt.

**Opgelost (24 september 2026, verbeterronde blok D).** De schrijfopdracht zegt nu dat een belofte
van het bedrijf wordt overgenomen zoals hij op de kaart staat, zonder voorbehoud dat hem afzwakt, en
`checkVoorbehoud()` (`lib/pipeline/adviestoon.ts`) vangt de vorm ervan ("is geen termijn", "beoogde
reactietijd"), als bevinding "hoog". Wat nog niet bestaat: een controle of een bewering met zijn
bron overeenkomt in plaats van alleen of hij een bron heeft.

## 47. Het sterkste bewijs staat in geen enkele tekst

De rijschool: "Slagingspercentage 93 procent bij de eerste poging over 2025" (tegen ongeveer 50 procent
bij het CBR) staat als bevestigd klantfeit in `brand_facts` en op de feitenkaart van alle acht
pagina's. Het komt in geen enkele tekst voor, net als de 108 Google-recensies. De installateur:
"Meer dan 1.800 onderhoudscontracten" en "Twaalf monteurs in dienst" op de feitenkaart van alle
vier de pagina's, in geen enkele tekst, ook niet op de onderhoudspagina. **Oorzaak:** de app kiest per
pagina vijf bewijspunten (`proof_points_json`) op "wat de lezer zich afvraagt", en die gaan over het
proces ("je kunt vooraf vertellen wat je spannend vindt", "intakekosten terug"). Het onderscheidende
cijfer valt buiten de vijf en de schrijfopdracht (`writer_brief_json`) noemt het niet. Alle drie de
blinde lezers noemden dit als eerste wat een ondernemer zou toevoegen. **Richting:** de sterkste
onderscheidende feiten van het merk (uit het gesprek: `offline_proof`) horen een vaste plek in elke
pagina te hebben, los van de vijf gekozen punten.

**Opgelost (24 september 2026, verbeterronde blok A).** De feiten uit het gesprek krijgen een eigen
blok in de schrijfopdracht ("HET STERKSTE BEWIJS VAN DIT BEDRIJF"), bovenop de vijf bewijspunten, en
de keuring telt na of er minstens één met het getal in de tekst staat (`lib/pipeline/kernbewijs.ts`,
een bevinding "hoog", niet blokkerend). Bij het bouwen kwam een tweede gat boven: een pagina schrijft
tegen de kaart die tijdens de voorbereiding bevroren is, dus bewijs dat daarna in het gesprek werd
opgeslagen, bereikte die pagina nooit, ook niet bij een nieuwe versie. `metGespreksbewijs()` voegt het
nu alsnog toe, met een identiteit uit de feitenbank. Nog na te rekenen op een nieuwe tekst.

## 48. De teksten lezen als een formulier

Drie blinde lezers, onafhankelijk, over 16 teksten (gemiddeld cijfer 4,1 op 10, zie stap 19 tot en met
23 in `docs/tasks/kwaliteitsdoorlichting-stappen.md`):
- Bijna elke alinea begint met de volledige bedrijfsnaam ("Hans Verstraaten Hoveniers verzorgt...",
  "Bij Autorijschool Pompert...", "Wesley Keeris Installatietechniek biedt..."). Waarschijnlijk een
  bijwerking van de regel dat elke bewering herleidbaar moet zijn: de schrijver zet de naam ervoor
  om te laten zien over wie het gaat.
- Dezelfde twee of drie feiten staan drie tot vier keer op één pagina (prijsband en terugkomafspraak
  bij de hovenier, "isolatie, radiatoren en leeftijd van de ketel" meer dan tien keer op één pagina van
  de installateur, "75 minuten" en "rustige routes" bij de rijschool).
- Zinnen uit de bronnen lekken op de pagina: "Voor het ontwerp is hier geen vaste duur genoemd" (twee
  teksten), "DUBOkeur wordt ook genoemd", "Het genoemde onderhoudscontract kost", "Dat zijn de drie
  onderdelen die wij voor dit bezoek noemen". Nagerekend in de opgeslagen teksten.
- Voorbehouden als hoofdtoon: "Dat wij die andere punten tijdens dit adviesbezoek controleren, zeggen
  we hiermee niet toe", "daarover doen we geen algemene toezegging", "Vraag bij uw aanvraag welke
  controles de beurt omvat". Het bedrijf klinkt als een buitenstaander.
- Clichés die de schrijfstijl van de klant tegenspreken: "We staan graag voor je klaar!" (hovenier,
  "geen verkooppraat"), "Een goed werkende verwarmingsinstallatie is onmisbaar".
- Kromme koppen: "Beoordeel ervaring aan projecten en duidelijke afspraken", "Een onderhoudsbeurt
  hoort beide toestellen te benoemen".

De keuring van de app vond wel herhaling in het vraag-en-antwoordblok, maar niet de herhaling in de
tekst, de naam voor elke alinea of de gelekte bronzinnen.

**Deels opgelost (24 september 2026).** De gelekte bronzinnen: `checkSourceTalk()`
(`lib/pipeline/content-gate.ts`) had een lijst met zulke formuleringen, maar juist deze vormen
ontbraken. Familie 6 voegt de letterlijke gevonden zinnen toe ("geen vaste duur genoemd", "wordt ook
genoemd", "het genoemde", "zeggen we hiermee niet toe", "geen algemene toezegging" en drie meer), met
een test op de echte zinnen en een test dat een gewone zin er niet onder valt.

**Een afweging voor de eigenaar, niet gerepareerd:** de naam voor elke alinea is geen fout van de
schrijver maar een bewuste regel. `checkMerkstem()` (`lib/pipeline/paginavorm.ts`) zegt: "houd de
merknaam in het openingsantwoord en de eerste zin van elke sectie", omdat een AI-assistent die "wij"
leest niet weet welk bedrijf hij moet citeren. De drie blinde lezers noemden precies die herhaling als
eerste reden dat de tekst als een formulier leest. Keuze: de naam in het openingsantwoord en in de
zinnen die een feit geven (die citeert een assistent), en elders "wij". Dat vraagt een aanpassing van
de schrijfregel en van `checkMerkstem()`, en een meting of de citeerbaarheid daaronder lijdt. **Richting:** een deterministische controle
op (1) het aantal alinea's dat met de merknaam begint, (2) dezelfde bewering vaker dan twee keer, (3)
woorden als "genoemd", "volgens de bron", "zeggen we niet toe".

**Opgelost (24 september 2026, verbeterronde blok D, besluit eigenaar).** De naam staat in de
schrijfregel nu alleen nog in de eerste alinea en de afsluiting, nooit aan het begin van een alinea;
de reparatieronde volgt dezelfde regel. De koppeling tussen pagina en bedrijf die een AI-assistent
nodig heeft, staat in de gestructureerde gegevens (`about` en `author` in `lib/schema-jsonld.ts`).
Twee nieuwe tellingen in de keuring: alinea's die met de naam beginnen (`checkMerkstem`, meer dan
één is een bevinding) en hetzelfde feit vaker dan twee keer op één pagina
(`checkHerhalingOpPagina()`, ook op getallen, want "12.000 tot 35.000" was het echte voorbeeld).
Nog te meten: of de citeerbaarheid in AI-antwoorden hieronder lijdt; dat hoort bij de nameting van
de herhaling.

## 49. Een overgeslagen vraag wordt "bespreek dat vooraf"

Waar de realistische klant een vraag oversloeg (garantie, extra grondwerk, wat de controle kost), laat
de tekst het onderwerp niet weg maar vult het met "bespreek vooraf", "vraag na" of "daarover doen we
geen toezegging". De lezer leest daaruit dat het bedrijf het zelf niet weet. Bij de hovenier kende de
ondernemer de garantie wel (één jaar op aanplant, vijf jaar op bestrating), maar hij werd er niet naar
gevraagd; de tekst "Bespreek garantieafspraken voordat de aanleg begint" is dan het slechtste van twee
werelden. De schrijfopdracht zegt "GEEN BRON: laat deze passage weg" (punt 39); de schrijver doet
iets anders.

**Kanttekening bij de blinde lezers.** Hun oordelen zijn nagerekend voordat ze hier staan. Twee
"ernstige" punten over de installateur klopten niet: de CO-certificering volgens de Gasketelwet staat
wél op zijn site, en Eindhoven staat in elke paginatitel van zijn site ("Geldrop - Eindhoven"). Het
waarheidsdossier was op die twee punten onvolledig. Ook de telefoonnummers van de rijschool staan wel op
de site. Die punten zijn niet meegeteld.

**Opgelost (24 september 2026, verbeterronde blok D).** De toonregel zegt nu: geen feit, dan het
onderwerp weglaten, en nooit "bespreek dat vooraf" of "vraag dat na". `checkVoorbehoud()` vangt de
zinnen die het toch doen, met de echte zinnen uit de doorlichting als test.

## 50. De reparatieknop haalde een juist klantfeit uit de tekst

Als klant op de pagina voor Best "laat ORBIT ENGINE ze alle 15 in één keer oplossen" gekozen. De
reparatieopdracht aan de schrijver bevatte de blokkades van punt 39 en 40 letterlijk: "Deze pagina
leunt op een bewering die we niet kunnen onderbouwen: Het bedrijf verzorgt tuinontwerp, tuinrenovatie
en tuinbestrating. Onderbouw hem, of haal hem uit de pagina." De nieuwe versie (score 86, nog steeds
tegengehouden) mist de doorlooptijd die de klant gaf ("2 tot 3 weken uitvoering"); de bedrijfsnaam
staat er nog steeds 9 keer in. Een klant die op de knop vertrouwt, krijgt een slechtere tekst. De
oorzaak is punt 39 en 40, opgelost in PR #115; na die reparatie zou dezelfde klik deze blokkades niet
meer meekrijgen. **Nog na te rekenen** op een nieuwe keuring.

## 51. Na een nieuwe versie staat een pagina twee keer in de bibliotheek

`persistDraft()` (`lib/pipeline/content.ts`) vlagt bij een nieuwe versie de oude rij af en voegt een
nieuwe toe, maar `planned_pages.content_piece_id` bleef naar de oude rij wijzen. De bibliotheek van de
hovenier toonde daarna 7 regels voor 5 pagina's: "Maak een pagina voor complete tuinaanleg in Best"
(plantaak, datum, geen score) en "Complete tuinaanleg in Best" (geen datum, score 75). Opgelost: de
plantaak verhuist mee naar de nieuwe versie, met een ketentest. Hetzelfde gold voor
`fact_requests.content_piece_ids`: de vragen van een pagina wezen na een nieuwe versie naar de oude
rij. Die verhuizen nu ook mee. In de ketentest vielen daardoor geen antwoorden van de kaart (die route
bouwt voort op de kaart van de vorige versie), maar op productie wel: bij een nieuwe versie draait de
voorbereiding opnieuw en bouwt de kaart via `buildFactBase()` met het id van de huidige versie. Bij de
hovenier misten versie 3 en 4 van Best daardoor de doorlooptijd die de klant opgaf ("2 tot 3 weken"),
een antwoord op een paginavraag die nog naar versie 1 wees. De vragen van de hovenier zijn met de hand
rechtgezet; nieuwe versies verhuizen ze sinds PR #118 zelf.

**Ook gevonden bij het repareren van punt 39:** de schrijfronde bouwt zijn feitenkaart via
`mergeAnsweredFacts()`, die de sleutel van de bewering niet meenam. De reparatie van PR #115 werkte
daardoor alleen in `buildFactBase()` en niet in de schrijfronde en de keuring daarna. Nu gaat de
sleutel ook daar mee (`AnsweredFactInput.claimKey`).

## 52. De opmerking van de klant bereikte de schrijver niet

**Gezien.** Proef met een ideale klant op de pagina voor Nuenen: via "Laat ORBIT ENGINE iets aanpassen"
gaf hij zes feiten op die hij paraat heeft (garantie 1 en 5 jaar, eerste gesprek gratis, 3D-ontwerp
450 euro verrekend bij opdracht, klinkers en keramische tegels, vaste ploeg van vijf man, betaling 30,
60 en 10 procent). In de nieuwe versie kwam er één terecht (de ploeg). In de invoer van de
schrijfaanroep (`content_draft`) kwam "450" nul keer voor; alleen de reparatieronde daarna kreeg de
opmerking. **Oorzaak:** `revisionNote` ging alleen naar `buildRepairInput()`, niet naar
`buildContentInput()`, en de feiten erin stonden niet op de feitenkaart, dus de reparatieronde mocht ze
ook niet gebruiken. **Opgelost:** de schrijfopdracht krijgt de opmerking bovenaan, en
`metKlantopmerking()` (`lib/pipeline/factcard.ts`) zet hem als citeerbaar klantfeit op de kaart.
Ketentest op de echte schrijfopdracht. **Nagerekend op productie:** de volgende versie kreeg de
opmerking wel in de schrijfaanroep en gebruikte 2 van de 6 feiten (was 1). Dat de rest achterblijft,
komt waarschijnlijk door de opzet van de pagina, die van vóór de opmerking is (zie de wisselproeven in
`docs/tasks/kwaliteitsdoorlichting-stappen.md`).

## 53. Een nieuwe versie verliest het beweringenplan

De eerste versies van de hovenier hadden een claimdekking (27,6) en bewijsblokkades; elke nieuwe
versie (via de reparatieknop of "Schrijf een nieuwe versie") had `claimdekking` leeg en nul
bewijsblokkades. `briefing_snapshot_json` van de nieuwe versie bevat alleen `facts`, `writtenAt` en
`recommendation`, geen `plan`: de voorbereiding die bij een nieuwe versie opnieuw draait
(`content_plan`), schrijft een snapshot zonder het plan uit de claim-audit. Gevolg: de nieuwe versie
wordt niet meer getoetst op wat hij over het bedrijf beweert. Dat oogt als verbetering (minder
blokkades), maar is een gat in de keuring. **Richting:** het plan van de vorige versie meenemen naar de
snapshot van de nieuwe.

**Opgelost (24 september 2026, verbeterronde blok C).** `buildDraftRow()` neemt het beweringenplan
en de algemene context-gaten mee in de snapshot van elke versie. De ketentest laat het verschil
zien: zonder de reparatie bevat de snapshot van de derde versie alleen `facts`, `writtenAt` en
`recommendation`, met de reparatie ook `plan`.

## 54. Een omschreven klantfeit telt als "zin zonder bron"

Versie 2, 3 en 4 van de pagina voor Best hadden elk 5 blokkerende punten, allemaal "Deze zin zegt iets
over je bedrijf zonder bron", en een deel daarvan zijn juiste klantfeiten in eigen woorden: "Reken
meestal op €12.000 tot €35.000", "Eén vaste ploeg verzorgt het hele tuinproject", "Wij verzorgen ook de
afvoer zelf". De controle op bronherleidbaarheid (`content_factuality` en de koppeling van zinnen aan
F-nummers) herkent een parafrase van een feit dat op de kaart staat niet. Gevolg: dezelfde blokkade
blijft bij elke versie terugkomen en de klant krijgt hem niet weg. **Waar te zoeken:** de
bronherleidbaarheidscontrole in `lib/pipeline/quality-run.ts` en `sourceCoverage()` in
`lib/pipeline/factcard.ts`.

---

**Grotendeels opgelost (24 september 2026, verbeterronde blok C).** De bronherleidbaarheid herkent
nu een zin die een feit in eigen woorden weergeeft (`zinParafraseertFeit()` in
`lib/pipeline/claim-extract.ts`), langs twee strenge wegen: alle getallen van de zin staan in één
feit (bij één getal ook een gedeeld woord), of bij een feit van de klant delen zin en feit minstens
twee kernwoorden die samen 40% van de zin zijn. Op de echte zinnen: "Reken meestal op €12.000 tot
€35.000" en "Eén vaste ploeg verzorgt het hele tuinproject" zijn gedekt, "de goedkoopste hovenier
van Eindhoven" en een verzonnen termijn niet. "Wij verzorgen ook de afvoer zelf" blijft een
grensgeval: één gedeeld woord is te weinig om zeker te zijn.

---

## 55. De Gemini-meting valt nog steeds volledig uit bij drie merken tegelijk

Gevonden bij de herhaling van 24/25 september 2026, precies de proef die punt 17 moest afsluiten.
Bij alle drie de merken tegelijk een cluster laten meten: bij elk van de drie merken zijn **alle 30
Gemini-metingen mislukt**, met `last_error` steeds "Gemini-via-DataForSEO ophalen mislukt ...: 3rd
Party API Service Unavailable (rate_limit_exceeded)". De primaire meting bij ChatGPT (`measure_prompt`)
bleef vrijwel foutloos (43 tot 45 van de 46 gelukt per merk), dus de klant krijgt gewoon een score en
een rapport; het is de secundaire Gemini-bron die telkens volledig wegvalt.

De spreiding uit blok F (`GEMINI_AFSTAND_MS = 4_000` in `lib/jobs/spreiding.ts`, "4 seconden is 15 per
minuut") is dus niet genoeg: de aanname over de leverancierslimiet ("gekozen en niet gemeten") lijkt
te optimistisch, zeker met drie merken kort na elkaar. **Waar te zoeken:** `enqueueLlmResponseMeasurement()`
in `lib/jobs/queue.ts` en `spreidTijden()`/`GEMINI_AFSTAND_MS` in `lib/jobs/spreiding.ts`.
**Voorstel:** de afstand vergroten (of configureerbaar maken) en/of de retries van
`measure_llm_response` een langere backoff geven dan de andere taaktypes, zodat een taak die op de
limiet loopt niet binnen dezelfde uitbarsting nog drie keer opnieuw op diezelfde limiet knalt. Dit is
een aparte bron (`AI_OVERVIEW_ENGINE`/Gemini is optioneel per `CLAUDE.md`), dus geen dringende
blokkade voor de klant, maar de meting mist wel een compleet beeld.

## 56. Een analyse toont al "vastgelopen" bij de eerste mislukte rapportpoging, niet pas na de laatste

Gevonden toen het OpenAI-tegoed tijdens de herhaling tijdelijk op was: alle drie de analyses
kregen meteen bij de eerste `generate_report`-poging de status `mislukt`
(`lib/pipeline/report.ts`, regel 1129: `await admin.from("analyses").update({ status: "mislukt" })`
in de catch-tak van `generateReport()`), en de klant zag meteen "De meting van [merk] is vastgelopen"
(`maakMelding()` in `lib/cluster-melding.ts`). Maar de taak zelf was pas bij poging 1 van de 4
(`MAX_ATTEMPTS = 4` in `lib/jobs/types.ts`, met een backoff van 2, 4, 8 en 16 minuten via
`backoffMinutes()`) en zou zonder ingrijpen op eigen kracht tot drie keer opnieuw hebben geprobeerd,
in totaal bijna 30 minuten lang. Bij een taak die op de laatste poging alsnog lukt (bijvoorbeeld een
kortstondige storing bij de leverancier) staat de analyse dus onterecht op "vastgelopen" terwijl de
taak zelf gewoon doorwerkt en het achteraf zelf herstelt (`status` gaat terug naar `gereed`
bij een geslaagde `generateReport()`, regel 762 en 1083). De klant ziet in de tussentijd een
foutmelding en een "opnieuw proberen"-knop voor iets dat vanzelf goed komt.

**Waar te zoeken:** de catch-tak van `generateReport()` in `lib/pipeline/report.ts` (regel 1129) zet
de analyse te vroeg op `mislukt`; dat hoort pas te gebeuren als de taak zijn `MAX_ATTEMPTS` heeft
opgebruikt (zoals `handleFailure()` in `lib/jobs/worker.ts` dat via `markOwnerFailed()` al voor
andere blokkerende taaktypes doet). **Voorstel:** de status-update in de catch-tak van
`generateReport()` alleen laten lopen als dit al de laatste toegestane poging is (`job.attempts >=
MAX_ATTEMPTS`, net als `handleFailure()`), of de statuswijziging helemaal overlaten aan de worker in
plaats van aan de pijplijnfunctie zelf.

## 57. Twaalf bijna-dezelfde vervolgvragen over één onderwerp

Gevonden bij de herhaling: nadat de eerste feitenvragen van de installateur beantwoord waren, kwamen
er voor dezelfde pagina (ketelvervanging) in één keer 12 nieuwe vragen bij die vrijwel allemaal
hetzelfde vragen, in andere bewoordingen: "Welke werkzaamheden zijn standaard inbegrepen bij een
ketelvervanging?", "Welke werkzaamheden voert u zelf uit bij een volledige ketelvervanging?", "Welke
onderdelen haalt u los en sluit u weer aan bij ketelvervanging?", "Sluit u bij ketelvervanging de
bestaande radiatoren en thermostaat weer aan?", "Voert u de oude ketel af na vervanging?" zijn in de
kern allemaal dezelfde vraag ("wat zit er bij het werk inbegrepen"). Dit is het deel van punt 36 dat
bij de verbeterronde bewust openstond ("sterk anders geformuleerde varianten komen nog door,
verbeterronde blok A") en blijkt bij deze herhaling nog steeds voor te komen, en dan niet incidenteel
maar met 12 vragen tegelijk over één pagina. **Waar te zoeken:** het samenvoegen van vragen gebeurt
in dezelfde route als punt 36 (`lib/facts.ts`/de aanmaak van `fact_requests`, zie de reparatie van
punt 35/36 in blok A). **Voorstel:** dit is nu genoeg materiaal om de samenvoegcontrole te verscherpen
van "letterlijk gelijk" naar een semantische vergelijking (bijvoorbeeld dezelfde aanpak als
`zinParafraseertFeit()` bij punt 54, of een aparte modelaanroep die vraagt "zijn dit dezelfde vraag").

**Opgelost in code (25 september 2026, reparatieplan blok I, PR #134).** De vragen ontstaan niet in
`lib/facts.ts` maar in de voorbereiding (`runBriefing()` in `lib/pipeline/briefing.ts`), en nagerekend op
productie bleken acht van de twaalf een variant van een vraag die de klant diezelfde ochtend al had
overgeslagen ("Wat zit bij een standaard ketelvervanging inbegrepen ..."). De claim-audit kreeg die
vraag mee met de opdracht hem "ook niet in andere bewoordingen" opnieuw te stellen; de instructie
alleen werkte dus niet. Nu legt de voorbereiding de nieuwe vragen, vóór ze worden opgeslagen, in één
kleine modelaanroep naast de bestaande vragen van het merk (`lib/pipeline/vraag-judge.ts`): vraagt
deze in essentie hetzelfde als een bestaande of een eerdere nieuwe vraag. De code past dat toe
(`voegVragenSamen()` in `lib/pipeline/vraag-samenvoegen.ts`): een variant van een beantwoorde of
overgeslagen vraag vervalt, een variant van een open vraag geeft die vraag de nieuwe pagina's en
secties erbij, en varianten onderling worden één vraag. Vaste slotvragen en de onderscheidsvraag
voegen nooit samen. Eenheids- en ketentest op de acht echte vragen plus de overgeslagen vraag: van
negen naar drie verschillende vragen, waarvan er één nieuw wordt gesteld (die over de offerte). De
keten toetst de bedrading met een vast oordeel; **of het echte model dezelfde groepen maakt, is nog
niet nagerekend**: opnieuw voorbereiden op productie kan bij een pagina zonder vragen meteen het
schrijven starten, en dat is niet gedaan om een test.

## 58. Een trage site levert dit keer veel minder gelezen pagina's op dan bij de nulmeting

Bij de herhaling reageerde de site van de hovenier trager dan bij de nulmeting: van de 68 gevonden
pagina's zijn er dit keer, ook na een extra handmatige aanvulronde boven op de vier automatische,
maar 33 gelezen (`inventory_quality_json.verdict = "afgekapt"`), tegen 60 van de 68 bij de
nulmeting. De vier aanvulrondes zijn een harde grens (`MAX_AANVULRONDES = 4` in
`lib/jobs/handlers.ts`, "genoeg voor de ~70 pagina's van de hovenier"), en die aanname klopte deze
keer niet. Dit lijkt aan de externe site te liggen (die op een ander moment sneller of trager
reageert) en niet aan een fout in de code, maar het raakt wel de betrouwbaarheid van punt 45 (de app
moet de bestaande site kennen voordat hij een pagina "verbetert"): met minder dan de helft van de
site gelezen is het risico groter dat een aanbeveling de functie van een onbekende bestaande pagina
over het hoofd ziet. **Voorstel, als dit vaker voorkomt:** `MAX_AANVULRONDES` optioneel maken zodat de
consultant handmatig kan doorgaan tot de dekking voldoende is, in plaats van na vier rondes te stoppen
ongeacht de dekking.

## 59. De bronherleidbaarheidscontrole blokkeert nog op zinnen die geen bewering over het bedrijf zijn

Gevonden bij de herhaling: van de 21 nieuw geschreven pagina's kregen er 20 het oordeel "block", en bij
19 daarvan komt minstens één reden van `bronherleidbaarheid` ("Deze zin zegt iets over je bedrijf
zonder bron"), terwijl de aangewezen zin vaak helemaal geen bewering over het bedrijf is:

- Een datumstempel: **"Laatst bijgewerkt: 25 september 2026."** (drie keer gevonden, bij drie
  verschillende merken).
- Algemene veiligheidsinstructies, los van het bedrijf: **"Gaat een koolmonoxidemelder af of is er
  direct gevaar, verlaat dan de woning en bel 112."**
- Een definitie die niets over het bedrijf zegt: **"ASS verwijst naar autisme binnen het spectrum;
  AD(H)D omvat ADD en ADHD."**
- Een retorisch antwoord: **"Nee, dat kun je niet in het algemeen zeggen."**
- Een verwijzing naar een derde partij: **"Voor vragen over een gezondheidsverklaring... kun je de
  actuele informatie van het CBR raadplegen."**

Dit is een gekend en met opzet niet volledig opgelost gat: `isInstructieAanLezer()` in
`lib/pipeline/claim-extract.ts` (3 september 2026) filtert al zinnen die met een instructiewerkwoord
beginnen ("Maak foto's van de lekkage"), met de expliciete kanttekening in de code dat dit "niet elke
instructiezin oplost" omdat het onderscheid "begrip van de zin vraagt, niet van het eerste woord". De
herhaling laat zien hoe groot dat gat in de praktijk is: het is nu de belangrijkste reden waarom bijna
elke nieuwe pagina in deze ronde "block" kreeg, ook pagina's met een score van 74 tot 83 op 100.
**Waar te zoeken:** `detectClaimSentences()` en `isInstructieAanLezer()` in
`lib/pipeline/claim-extract.ts`. **Voorstel:** de herkenning van "is dit een bewering over het
bedrijf" uitbreiden voorbij het eerste woord van de zin, bijvoorbeeld met een korte modelaanroep die
alleen die ja/nee-vraag stelt per kandidaatzin (dezelfde soort aanpak als `zinParafraseertFeit()` bij
punt 54), en in elk geval datumstempels ("Laatst bijgewerkt: ...") en verwijzingen naar een externe
partij (CBR, hulpdiensten) categorisch uitsluiten.

**Opgelost in code (25 september 2026, reparatieplan blok G, PR #132).** Twee lagen. (1) De code
laat een datumstempel en een verwijzing naar een externe partij (112, CBR, RVO, de gemeente) niet meer
als bewering tellen, zolang de zin geen merknaam, wij-vorm of ander getal heeft
(`isGeenBewering()` in `lib/pipeline/claim-extract.ts`). (2) Wat de woordvergelijking daarna nog niet
rond krijgt, gaat in één modelaanroep per keuring naar de zinnenbeoordelaar
(`lib/pipeline/claim-judge.ts`): is dit een controleerbare bewering over het bedrijf, en welk feit
onderbouwt hem exact. De code controleert dat antwoord: een zin met merknaam, wij-vorm of bedrag mag
het model niet wegzetten, en een aangewezen feit telt alleen als de getallen van de zin erin staan en
zin en feit een kernwoord delen (`verwerkZinOordelen()`). Van de 67 tegengehouden zinnen van de
herhaling vallen er 6 op de eerste laag weg, 14 kan alleen een feit nog vrijspreken, en 47 legt de
code aan het model voor. Eenheidstests op de vijf voorbeeldzinnen hierboven en op de echte feiten van
de rijschool en de installateur. **Op productie nagerekend (25 september 2026)** met een herkeuring van drie bestaande pagina's, één per
merk, zonder de tekst te veranderen: de zwemvijverpagina van de hovenier van 5 naar 1 blokkade
(bronherleidbaarheid 40 naar 80), de pagina "repareren of vervangen" van de installateur van 5 naar 0
(van tegengehouden naar goed, bronherleidbaarheid 31 naar 100), en de prijzenpagina van de rijschool
van 5 naar 4. Van de 27 voorgelegde zinnen sprak de beoordelaar er 19 vrij als geen bewering en koppelde
hij er 3 aan een feit. De aanroep kost gemeten $0,0010 per keuring (`ai_calls`). Drie van de vier
blokkades die bij de rijschool bleven staan, kwamen door het vangnet zelf; zie punt 64.

## 60. Een verzonnen veiligheidscertificering op alle zeven nieuwe pagina's van één merk

Gevonden door de blinde lezer van de herhaling, nagerekend tegen het waarheidsdossier: alle zeven
nieuwe pagina's van de installateur beweren dat het bedrijf **"CO-gecertificeerd is volgens de
Gasketelwet"**, op één pagina zelfs met een verwijzing naar een concreet "Register
gasverbrandingsinstallaties" om het te controleren. Het waarheidsdossier noemt alleen "Erkend
installateur (InstallQ)"; een CO-certificering volgens de Gasketelwet staat nergens, niet op de
site en niet in het gesprek. Dit is geen parafrase van een bestaand feit (zoals bij punt 54) maar een
volledig verzonnen, en voor een installatiebedrijf gevoelig, veiligheidskeurmerk, dat bovendien
consequent terugkomt: alle 7 van de 7 pagina's.

Daarnaast bevestigde het narekenen drie kleinere feiten uit hetzelfde oordeel: twee pagina's noemen
"Eindhoven" als werkgebied terwijl het dossier alleen Geldrop als vestigingsplaats en Mierlo,
Heeze-Leende en Nuenen als groeiplaatsen noemt; vier pagina's plakken de levertijd en installatieduur
van de hybride warmtepomp ("twee tot vier weken", "installatie in één dag") zonder onderbouwing op
gewone ketelvervanging, waar het dossier daar niets specifieks over zegt; en meerdere pagina's noemen
Intergas en Vaillant als ketelmerken naast de bevestigde Nefit en Remeha. Op één pagina staat
bovendien herhaaldelijk "gratis adviesbezoek", terwijl "gratis" (behalve bij de offerte) op de
verboden-woordenlijst van de ondernemer staat (besluit eigenaar, punt 48).

**Waarom dit langs de keuring komt.** De bronherleidbaarheidscontrole (punt 54, 59) toetst of een zin
een feit op de kaart *parafraseert*; een verzonnen certificering die er zelfstandig, zelfverzekerd en
vakkundig klinkend uitziet, wordt niet als "zin zonder bron" gemarkeerd zolang de zin op zichzelf
grammaticaal een bewering met een bron lijkt te zijn, of samenvalt met een naastgelegen wél-onderbouwde
zin over InstallQ. Dat is een ander gat dan punt 59: daar wordt een niet-bewering onterecht
tegengehouden, hier wordt een onterechte bewering onterecht doorgelaten.

**Voorstel:** een tweede, strengere controle specifiek voor keurmerken, certificeringen en wettelijke
kwalificaties (een korte lijst met veelvoorkomende woorden als "gecertificeerd", "erkend volgens",
"keurmerk", "wettelijk") die *altijd* een letterlijke matching regel op de feitenkaart vereist, zonder
de coulance van `zinParafraseertFeit()`: een verzonnen keurmerk is nooit een parafrase, het is een
ander feit.

**Onterecht bij narekenen (25 september 2026).** Het "waarheidsdossier" van de blinde lezer was
onvollediger dan de feitenkaart van de app. De site van de installateur zegt op /ketelvervanging
letterlijk "Ons bedrijf beschikt over een officiële CO-certificering volgens de Gasketelwet", en dat
feit staat zes keer op de kaart (`brand_facts`, bron "site /ketelvervanging"). Hetzelfde geldt voor
de kleinere punten: Intergas en Vaillant staan op dezelfde pagina, Eindhoven staat in het klantantwoord
"buiten Geldrop en Eindhoven", het gratis adviesbezoek in een klantantwoord van 25 september, en
"gratis" staat niet op de verbodenlijst van dit merk (die noemt "de beste" en "goedkoop"). Het eindverslag
van de nulmeting had dezelfde vergissing al eens weggestreept. Alleen de levertijd van de hybride
warmtepomp op een pagina over ketelvervanging blijft een terecht, klein punt. Toch gebouwd, als
vangnet (PR #132): een zin met een keurmerkwoord is alleen gedekt als één feit alle keurmerkwoorden
bevat, op stam ("certificering" dekt "gecertificeerd"), bovenop de gewone dekking
(`keurmerkKern()`). De echte Gasketelwet-zin gaat erdoor, "erkend installatiebedrijf en
VCA-gecertificeerd" naast alleen het feit "allround erkend installatiebedrijf" niet.

## 61. Twee echte cijfers uit dezelfde feitenkaart verwisseld

Gevonden door de blinde lezer van de herhaling bij de rijschool, nagerekend tegen het
waarheidsdossier: minstens twee van de acht nieuwe pagina's noemen "€ 80" als prijs voor de intake
van 60 minuten. Het dossier noemt voor de intake van 60 minuten € 50; € 80 is de prijs van "losse les
60 minuten". Dit is geen verzonnen getal (beide bedragen staan op de feitenkaart) maar een
**verwisseling tussen twee echte cijfers**, wat het onopvallender maakt dan een volledig verzonnen
bedrag: een controle die alleen toetst "komt dit getal ergens op de kaart voor" zou dit niet
opmerken, want € 80 staat er wél, alleen bij een andere dienst.

Bij dezelfde herhaling, nu bij de hovenier: één pagina beweert "Wij nemen opdrachten aan in Son en
Breugel", terwijl het gesprek Son en Breugel alleen noemt als plaats "waar je nog weinig zit"
(groeiwens, geen bevestigd werkgebied). Dit ontstond waarschijnlijk uit het antwoord dat de klant in
deze herhaling zelf gaf op de vraag "Nemen jullie ook opdrachten aan in Son en Breugel?" ("Ja, dat is
juist een van de plaatsen waar we willen groeien"): de nuance "willen groeien" is onderweg naar de
tekst weggevallen en werd een kale, bevestigde aanwezigheidsclaim.

**Waar te zoeken:** `zinParafraseertFeit()` in `lib/pipeline/claim-extract.ts` matcht op gedeelde
getallen en kernwoorden, maar controleert niet of het getal bij het JUISTE feit (dezelfde dienst,
dezelfde voorwaarde) hoort; en de omzetting van een klantantwoord naar een feit op de kaart (`lib/facts.ts`)
lijkt een hedge als "willen groeien" niet consequent te bewaren richting de schrijver.
**Voorstel:** bij de getallenmatch in `zinParafraseertFeit()` ook een gedeeld kernwoord tussen zin en
feit eisen wanneer er meerdere prijzen voor vergelijkbare diensten op de kaart staan (zoals hier
"intake" tegenover "losse les"), niet alleen bij één los getal; en bij het promoveren van een
klantantwoord naar een feit een woord als "willen" of "streven naar" laten meetellen als onderdeel van
het feit zelf, niet alleen van het antwoord.

**Onterecht bij narekenen (25 september 2026).** De prijslijst op
autorijschoolpompert.nl/prijzen-lespakketten noemt "Intake (kantoor) van 60 minuten € 50,-" én
"Intake (auto) van 60 minuten € 80,-", en de kaart heeft het feit "Een vrijblijvende intake in de auto
duurt 60 minuten en kost € 80". De zin "De intake staat vermeld voor € 50 en € 80" klopt dus. En op
de vraag "Nemen jullie ook opdrachten aan in Son en Breugel?" antwoordde de hovenier "Ja, Son en
Breugel is juist een van de plaatsen waar we willen groeien": "wij nemen opdrachten aan in Son en
Breugel" is dan geen verloren nuance maar het antwoord. Geen codewijziging.

## 62. De reparatieknop haalt opnieuw een juist klantfeit uit de tekst (punt 50, teruggevallen)

Getoetst bij de herhaling, op de pagina "Vergelijk een nieuwe ketel met een hybride warmtepomp" van
de installateur (tegengehouden op 5 punten, geen van de 5 over de monteurs). Versie 1 bevatte de
zin "U kiest daarbij voor een installatiebedrijf met twaalf monteurs in dienst" (feit F-nummer,
klopt met het gesprek: "Twaalf monteurs in dienst"). Na "laat ORBIT ENGINE ze alle 5 in één keer
oplossen" verving de app de hele pagina door versie 2, waarin **"monteurs" nul keer voorkomt**: het
juiste klantfeit is verdwenen, niet als correctie van een van de 5 gemelde punten (dat feit stond
niet in de revisienota) maar als bijvangst van een volledige herschrijving.

Erger nog: de herschrijving loste niet eens alle 5 gemelde punten zelf op. De revisienota vroeg
uitdrukkelijk om de zin "Woont u in Nuenen, dan valt uw woonplaats binnen ons werkgebied voor
warmtepompen" te onderbouwen of te schrappen; in versie 2 staat exact diezelfde zin, woord voor
woord, nog steeds onopgelost.

Dit is dezelfde soort fout als de oorspronkelijke bevinding 50 (nulmeting), met een andere route
ernaartoe: destijds haalde de keuring een juist antwoord van de klant onterecht neer als
"onderbouwing ontbreekt", en werd het feit bij een verbetering meegesleept. Punt 39 loste dat
specifieke mechanisme op (een beantwoorde vraag maakt een bewering wél onderbouwd). Hier is de
oorzaak breder: "los alles op" vraagt de schrijver om een VOLLEDIGE nieuwe versie van de hele pagina
("ORBIT ENGINE schrijft één nieuwe versie van de hele tekst met deze 5 punten erin"), niet om een
gerichte reparatie van alleen de 5 gemelde zinnen. Bij een volledige herschrijving is er geen garantie
dat de schrijver dezelfde feiten weer kiest, ook al staan ze nog gewoon op de feitenkaart.
**Waar te zoeken:** de content_plan/content_draft-taken die `los-alles-op` (`regenerate: true`) in
`lib/jobs/content-jobs.ts` en de bijbehorende route inplant. **Voorstel:** ofwel de revisienota
expliciet laten zeggen "behoud alle overige feiten die al in de tekst stonden en nog kloppen", ofwel
"los alles op" een gerichte zin-voor-zin reparatie laten doen (zoals de "stap voor stap"-wizard al
per punt aanbiedt) in plaats van een volledige herschrijving, en na de herschrijving controleren of
elk feit dat in de vorige versie stond en niet als probleem gemeld was, nog in de nieuwe versie
voorkomt.

## 63. Feiten van de site bevatten letterlijke HTML-codes

Gevonden bij het narekenen van punt 60 en 61: op de feitenkaart van de installateur staat "Ons
bedrijf beschikt over een offici&euml;le CO-certificering", en bij de rijschool "Meer info over de
intake &euro; 50". `htmlToText()` in `lib/pipeline/html-text.ts` kende het euroteken en de letters
met een accent niet. Gevolg: zo'n feit leest slordig in de prompt, en de keuring herkent "&euro;"
niet als bedrag.

**Opgelost (25 september 2026, reparatieplan blok G, PR #132).** Het euroteken en alle letters met
trema, accent aigu, grave, circonflexe, cedille of tilde worden nu omgezet. Feiten die al op de kaart
staan, worden bij de volgende crawl van het merk vervangen.

**Opgelost in code (25 september 2026, reparatieplan blok H, PR #133).** Nagerekend op de twee echte
versies: versie 2 miste niet één maar drie juiste feiten die geen van de vijf gemelde punten raakten
(twaalf monteurs, de levertijd van twee tot vier weken, het jaarlijkse onderhoudscontract). De oorzaak:
bij "los alles op" kreeg de schrijver de vorige tekst niet te zien. Twee reparaties
(`lib/pipeline/feitbehoud.ts`): (1) de schrijver krijgt bij een nieuwe versie de feiten van de vorige
mee, met de opdracht ze allemaal te behouden, behalve wat de nota zelf aanwijst; (2) na het schrijven,
bij elke reparatieronde en bij een herkeuring telt de code na of die feiten er nog staan. Ontbreekt er
een, dan is dat een blokkerende bevinding ("Dit feit stond in de vorige versie en is verdwenen"), die
de reparatieronde terug kan zetten. Op de twee echte versies vindt die controle precies de drie
verdwenen feiten en niets anders; wat alleen in de gegevens voor zoekmachines stond (adres,
telefoonnummer) telt niet mee. Dat de Nuenen-zin bleef staan, was geen fout van de schrijver: die zin
klopt (klantantwoord "ook Mierlo, Nuenen en Heeze-Leende"), en sinds blok G houdt de keuring hem niet
meer tegen. **Nog na te rekenen op productie.**

## 64. Twee gevallen die het vangnet van blok G te streng maakte

Gevonden bij de nameting van blok G op productie (prijzenpagina van de rijschool, 4 blokkades over):
(1) drie zinnen hielden tegen omdat ze "ons" bevatten, terwijl "ons" daar lijdend voorwerp is in een
oproep aan de lezer: "Vertel ons bij je aanvraag hoe vaak je zou willen lessen", "kun je ons vragen
welke intake-afspraak mogelijk is". (2) "De intake staat vermeld voor € 50 en € 80" klopt, maar de
twee bedragen staan als twee feiten op de kaart, en de code eiste dat één feit alle getallen droeg.

**Opgelost (25 september 2026, reparatieplan blok H, PR #133).** Alleen "wij", "we" en "onze" maken
een zin nog tot een bewering die het model niet mag wegzetten (`magGeenBeweringZijn()`), en de
zinnenbeoordelaar mag twee feiten aanwijzen die een zin samen dragen; elk getal moet dan in een van
beide staan (`feitenOnderbouwenZin()`). Een verzonnen bedrag blijft tegenhouden.

## 65. Een verdwenen feit werd na één versie vergeten

Gevonden bij het narekenen van blok H op productie. De keuring vergelijkt een nieuwe versie met de
versie die hij vervangt. Versie 2 van de hybride-pagina miste drie feiten van versie 1, en de keuring
meldde dat terecht. Maar bij "los alles op" op versie 2 zou versie 3 alleen met versie 2 vergeleken
worden, waarin die drie feiten al niet meer stonden: zet de schrijver ze niet terug, dan zag niemand
het meer.

**Opgelost (25 september 2026, reparatieplan blok I, PR #134).** De keuring bewaart het hele
verdwenen feit, en de volgende versie neemt het over in de lijst van wat er moet staan, tot het terug
is of de klant het feit intussen ontkende (`alVerloren` in `bepaalTeBehouden()`).

## Wat goed ging, om niet kapot te maken

- **Het gesprek heeft aantoonbaar effect.** Na het vastleggen sloten de onderwerpen van alle drie de
  merken aan op de groeidoelen: C ging van "automaat" bovenaan naar "faalangst" en "autisme", B van
  "waterontharder" naar "hybride warmtepomp".
- **De antwoorden van de klant komen in de tekst.** Prijsband, doorlooptijd, de gratis
  terugkomafspraak na zes weken, de vaste ploeg van vijf man, het 3D-ontwerp boven 15.000 euro en de
  4,9 uit 5 van de hovenier staan letterlijk en correct in de geschreven pagina's.
- **Verboden woorden worden gerespecteerd.** "goedkoopste", "tuinman" en "onderhoudsvrij" komen in
  geen van de vier teksten van de hovenier voor.
- **De schrijfrem werkt.** Een pagina met 33 procent onderbouwing werd niet geschreven.
- **De vragen zeggen waarom ze gesteld worden**, met bij elke vraag een knop "Overslaan" en uitleg wat
  er dan met de tekst gebeurt.
- **De naamcontrole onder het rapport** houdt na de reparatie van punt 20 alleen nog zinnen tegen die
  het bewijs niet draagt (0 onterecht geschrapt bij de herhaling).
- **De crawl kwam binnen** bij twee van de drie sites die sommige automatische bezoekers weigeren.
