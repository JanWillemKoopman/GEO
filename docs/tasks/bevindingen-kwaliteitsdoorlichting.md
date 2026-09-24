# Bevindingen uit de kwaliteitsdoorlichting, om op te lossen

> **Wat dit is.** De fouten en verbeterpunten die boven kwamen bij het doorlopen van de hele keten op
> productie (`docs/tasks/kwaliteitsdoorlichting-pijplijn.md`), vanaf 23 september 2026, met drie echte
> bedrijven uit de regio Eindhoven. In dit document heten ze A (hovenier, grote site), B (installateur,
> middelgrote site) en C (rijschool). Hun dossiers staan bewust niet in de repo.
>
> **Hoe te gebruiken.** Elk punt heeft wat er misgaat, wat de klant ervan merkt, waar het in de code
> zit, en een voorstel. Is een punt opgelost: de regel "Status" bijwerken met de datum en de PR, en
> een alinea in `docs/logbook.md`. Zijn alle punten opgelost, dan kan dit bestand weg.
>
> **Doorlopend bijgewerkt** zolang de doorloop loopt. Stand: meting van de drie clusters loopt.

## Overzicht

| # | Ernst | Onderwerp | Status |
|---|---|---|---|
| 1 | hoog | Gespreksscherm slaat de waarde van vóór de klik op | ✅ opgelost, PR #108 |
| 2 | hoog | Definitieve onderwerpenronde kan alle onderwerpen wissen | ✅ opgelost, PR #108 |
| 3 | hoog | Het merk zelf komt op de lijst "gelijknamige bedrijven die jij niet bent" | open |
| 4 | hoog | De crawl leest 1 pagina van een site van ~70, zonder waarschuwing | open |
| 5 | hoog | Meetvragen negeren de groeigebieden: de opdracht spreekt zichzelf tegen | open |
| 6 | middel | "Herkend door ChatGPT bij 5 van 6 vragen" telt gokken op de naam als herkenning | open |
| 7 | middel | Het sterkste bewijs van een bedrijf valt tussen crawl en dossier weg | open |
| 8 | middel | Meetvragen: veel dubbel, weinig realistisch, altijd een plaatsnaam | open |
| 9 | middel | Een adviesregel op de site wordt een dienst en een onderwerp | open |
| 10 | middel | Crawl neemt fotopagina's, tag- en auteurspagina's mee | open |
| 11 | middel | Blok met gecontroleerd te bevestigen voorstellen klapt dicht als het "compleet" is | open |
| 12 | laag | Klant ziet "Bevestig en start de meting" maar mag de meting niet starten | open |
| 13 | laag | Klant ziet "Nieuw merk" en het hele formulier, de server weigert pas na verzenden | open |
| 14 | laag | Voortgang zegt "klaar" en "nog minder dan een minuut" terwijl er nog stappen wachten | open |
| 15 | laag | Conceptscherm gaf één keer een foutpagina bij het openen, direct na het afronden | open, niet herhaald |
| 16 | laag | Een taak van een merk stond op "bezig" en daarna weer in de wachtrij met 0 pogingen | open, niet herhaald |

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

**Wat misgaat.** Bij alle drie de merken zette het onderzoek eigen namen op `name_exclusions`. C: drie
schrijfwijzen van de eigen naam, waaronder de naam met de voornaam van de eigenaar erin. B: de eigen
B.V. en de beheer-B.V. A: een tweede website van hetzelfde bedrijf en de eigen B.V.

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

## 7. Het sterkste bewijs van een bedrijf valt tussen crawl en dossier weg

**Wat misgaat.** C noemt "93 procent geslaagd" op drie pagina's die de crawl wel las. Het getal staat
niet in het merkonderzoek en niet in het dossier. Ook de terugbetaling van examengeld en de BOVAG-
cover ontbreken.

**Gevolg.** De schrijver krijgt het argument niet mee dat een lezer het meest overtuigt.

**Voorstel.** Uitzoeken in welke stap het afvalt (onderzoek of dossier; de opname van opdrachten laat
nu zien wat elke stap te lezen kreeg). Een deterministische zoektocht naar percentages, jaartallen en
bedragen in de gelezen pagina's, als vangnet naast de AI.

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

## 9. Een adviesregel op de site wordt een dienst en een onderwerp

**Wat misgaat.** B's site zegt "het ventilatiesysteem moet regelmatig worden schoongemaakt" (advies).
De aanbodboom maakte er de dienst "ventilatie laten schoonmaken" van, en dat werd een onderwerp.

**Gevolg.** Een pagina die iets belooft wat het bedrijf niet doet.

**Voorstel.** In de aanbodstap alleen diensten opnemen met een aanbiedende formulering ("wij …",
"u kunt bij ons …"), en het bewijscitaat daarop controleren.

## 10. Crawl neemt fotopagina's, tag- en auteurspagina's mee

**Wat misgaat.** C: 108 gelezen adressen, waarvan tientallen bijlagepagina's van foto's
(`/whatsapp-image-…/` en dergelijke), `/tag/…`, `/category/…` en `/author/…`.

**Gevolg.** Ze eten de grens van 150 pagina's op en verdunnen het merkonderzoek.

**Voorstel.** In `lib/crawl-urls.ts` WordPress-bijlagen, tags, categorieën en auteurs overslaan.

## 11. Blok met te bevestigen voorstellen klapt dicht als het "compleet" is

**Wat misgaat.** Op het gespreksscherm klapt een blok dicht zodra alle velden gevuld zijn
(`onboarding-session.tsx`, `defaultOpen={!p.compleet}`). Juist in blok 2 zet het onderzoek de
naamuitsluitingen van punt 3. Compleet betekent hier niet gecontroleerd.

**Voorstel.** Velden die door het onderzoek gevuld zijn en nog niet door de consultant bevestigd,
tellen niet als compleet; het blok blijft open met een zichtbare "controleer dit".

## 12. Klant ziet "Bevestig en start de meting" maar mag de meting niet starten

**Wat misgaat.** Het conceptscherm zegt de klant "Bevestigen is genoeg" en toont de knop; na de klik
verschijnt pas een rode regel dat de consultant de meting start.

**Voorstel.** Voor een klant een andere tekst en knop, bijvoorbeeld "Akkoord, laat mijn consultant
starten", of de knop weglaten.

## 13. Klant ziet "Nieuw merk"

**Wat misgaat.** De klant ziet de knop en het hele formulier; `app/api/profiles/route.ts:67` weigert
pas na verzenden (403).

**Voorstel.** Knop en pagina alleen voor beheerders tonen.

## 14. Voortgang zegt "klaar" terwijl er nog stappen wachten

**Wat misgaat.** De statusroute van een merk gaf "klaar" terwijl het aanbod bezig was en vijf stappen
wachtten; de technische controle stond op "wacht" met al een resultaat; de schatting zei "nog minder
dan een minuut" bij acht open stappen.

**Voorstel.** De status afleiden uit de openstaande taken, en de tijdschatting uit het aantal open
stappen.

## 15. Conceptscherm gaf één keer een foutpagina

Direct na het afronden van het cluster gaf `/analyses/[id]/concept` voor de klant één keer "Deze
pagina kon niet geladen worden"; een tweede keer laden werkte. Niet herhaald. Alleen oppakken als het
terugkomt.

## 16. Taak terug in de wachtrij met 0 pogingen

De lichte scan van B stond op "bezig" (gestart 21:28:17) en daarna weer in de wachtrij met 0
pogingen, en liep later gewoon door. Niet herhaald. Alleen oppakken als het terugkomt.

---

## Wat goed ging, om niet kapot te maken

- **Het gesprek heeft aantoonbaar effect.** Na het vastleggen sloten de onderwerpen van alle drie de
  merken aan op de groeidoelen: C ging van "automaat" bovenaan naar "faalangst" en "autisme", B van
  "waterontharder" naar "hybride warmtepomp".
- **De crawl kwam binnen** bij twee van de drie sites die sommige automatische bezoekers weigeren.
