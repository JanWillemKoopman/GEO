# Ronde 1, 29 september 2026: bevindingen en patronen (concept)

> **Status: concept van Claude Code, nog niet samen doorgelopen** (stap 4 van
> `docs/tasks/contentkwaliteit-ronde-1-vervolg.md`). Opgesteld volgens het sjabloon in §6 van
> `docs/contentkwaliteit-testmethode.md`, uit de feedback in `ronde-1-feedback/` en de interne logs
> per klant. Elke bewering die de beoordelaar "niet aangeleverd" noemde, is nagelopen op de site en
> in het gesprek (§1c).
>
> ⚠️ **Twee open punten vóór we dit vaststellen.**
> 1. **Wie heeft beoordeeld?** De feedback begint met "Ik heb de prompt uitgevoerd zoals hij in de
>    bijlage staat", noemt het document "de beoordelingsprompt" en haalt actuele bronnen aan (NVWA,
>    Milieu Centraal, de gemeente Krimpenerwaard). Dat wijst op een AI-model, eventueel met een mens
>    erbij. De methode gebruikt juist een menselijke vakschrijver omdat een AI-beoordelaar de
>    aannames van de AI-schrijver deelt (inleiding van de methode). Was het een AI, dan is deze
>    ronde nuttig maar geen vervanging voor het menselijke oordeel, net zoals de eerdere
>    AI-beoordelingen in `feedback/` apart gehouden zijn.
> 2. **Bij klant B is de publiceer-keuze bij geen enkele pagina aangevinkt.** Bij A staat hij in de
>    samenvattende tabel, bij C vetgedrukt. Voor B staat hieronder wat de toelichting erover zegt.

---

## 1. De matrix en de scores

Cijfers 1 tot 5. Input is de rijkheid van wat de klant voor deze pagina aanleverde (uit de logs).

| # | Pagina | Kwaliteit | Compleet | Vindt doel | Leest lekker | Klopt | Eigen | Publiceerbaar | Input | Herschreven |
|---|---|---|---|---|---|---|---|---|---|---|
| A1 | Tedee PRO laten monteren | 4 | 4 | 4 | 4 | 4 | 5 | bijschaven | rijk | ja |
| A2 | Noodopening Utrecht | 4 | 4 | 5 | 4 | 3 | 5 | bijschaven | rijk | ja |
| A3 | Voordeur beter beveiligen | 4 | 5 | 4 | 3 | 3 | 5 | bijschaven | rijk | ja |
| A4 | Buitengesloten in Houten | 4 | 5 | 5 | 4 | 4 | 5 | bijschaven | rijk | nee |
| A5 | Slotenmaker Nieuwegein | 4 | 4 | 4 | 4 | 3 | 5 | bijschaven | rijk | ja |
| A6 | Defect slot IJsselstein (nieuw) | 3 | 4 | 4 | 4 | 2 | 5 | bijschaven, eerst inhoud opschonen | gemiddeld | weggegooid |
| B1 | Vaste maandprijs | 3 | 3 | 4 | 3 | 2 | 2 | *niet aangevinkt*; "niet publiceren tot de prijs eenduidig is" | gemiddeld | ja |
| B2 | Zelf boekhouden of uitbesteden (nieuw) | 3 | 4 | 5 | 3 | 2 | 3 | *niet aangevinkt* | summier | ja |
| B3 | Zelf, combineren of uitbesteden (nieuw) | 3 | 3 | 4 | 3 | 3 | 2 | *niet aangevinkt*; "eigen doel geven naast B2" | gemiddeld | ja |
| B4 | Volledig uitbesteden | 4 | 4 | 5 | 4 | 3 | 3 | *niet aangevinkt*; "grotendeels behouden" | gemiddeld | nee |
| B5 | Aangifte inkomstenbelasting | 4 | 3 | 4 | 4 | 4 | 3 | *niet aangevinkt* | gemiddeld | nee |
| B6 | Kosten aangiftehulp (nieuw) | 3 | 3 | 5 | 4 | 4 | 2 | *niet aangevinkt*; "samenvoegen met B5" | summier | ja |
| C1 | Wespenbestrijding | 4 | 3 | 4 | 4 | 4 | 3 | bijschaven | summier | nee |
| C2 | Aziatische hoornaar Krimpenerwaard | 4 | 3 | 4 | 4 | 3 | 4 | bijschaven | summier | nee |
| C3 | Gratis determinatie | 4 | 4 | 5 | 4 | 5 | 4 | **ja, zo** | summier | nee |
| C4 | Wat kost mollenbestrijding? | 3 | 1 | 1 | 4 | 5 | 2 | **opnieuw beginnen** | leeg | ja |
| C5 | Mollenbestrijding aanvragen (nieuw) | 4 | 3 | 4 | 4 | 5 | 3 | bijschaven | summier | nee |
| C6 | Mollen: zelf doen of hulp | 4 | 4 | 4 | 4 | 4 | 3 | bijschaven | leeg | nee |

**Gemiddelden**

| | Kwaliteit | Compleet | Vindt doel | Leest lekker | Klopt | Eigen | Alles |
|---|---|---|---|---|---|---|---|
| A (rijk) | 3,8 | 4,3 | 4,3 | 3,8 | 3,2 | **5,0** | 4,1 |
| B (gemiddeld) | 3,3 | 3,3 | 4,5 | 3,5 | 3,0 | **2,5** | 3,4 |
| C (zwak) | 3,8 | 3,0 | 3,7 | 4,0 | **4,3** | 3,2 | 3,7 |
| Alle 18 | 3,7 | 3,6 | 4,2 | 3,8 | 3,5 | 3,6 | |

Publiceerbaar (A en C, 12 pagina's): 1 keer "ja, zo", 10 keer "bijschaven", 1 keer "opnieuw
beginnen". De beoordelaar zegt bij alle drie de klanten uitdrukkelijk dat opnieuw schrijven niet
nodig is; de winst zit in redactie en in de keuzes vooraf.

### 1b. De toets van het sjabloon (stap 2 van het plan)

- **Terugvragen:** niets teruggevraagd; alle drie de documenten zijn volledig ingevuld. De bijlage
  met eerdere versies is bij A uitdrukkelijk buiten beschouwing gelaten, zoals gevraagd.
- **Specifiek genoeg:** ja. Bij elke pagina een concrete schets, vaak met een voorgestelde opbouw.
- **Wat niet werkte:**
  1. **"Klopt het" werd gelezen als "staat het in de antwoorden op de vragen van deze pagina".**
     Het document laat per pagina alleen die antwoorden zien, niet wat de schrijver verder over het
     bedrijf wist (de feiten van de site en het gesprek). Daardoor werden feiten van het bedrijf
     zelf als verzonnen aangemerkt (§1c). Dit drukt vooral de score van A, de klant met de meeste
     eigen feiten: "klopt" 3,2 bij A tegen 4,3 bij C.
  2. **De publiceer-keuze is bij B niet ingevuld.** Keuzevakjes in een Markdown-bestand zijn
     onhandig; bij C is de keuze vetgedrukt, bij A in een eigen tabel gezet.
  3. **Tijd per document:** niet vermeld.

### 1c. Nagelopen: wat de beoordelaar "niet aangeleverd" noemde

| Bewering | Pagina | Waar het vandaan komt | Oordeel |
|---|---|---|---|
| "We zijn 24/7 bereikbaar" | A2 en meer | Site van Van Kessel (homepage, dienstpagina's) | Geen fout; het document liet het niet zien |
| KFV in de bus, Fuhr en BUVA in de werkplaats | A6 | Site (meerpuntssluitingpagina) en het gesprek | Geen fout; het document liet het niet zien |
| Deur geopend met een pickset | A4 | Het gesprek ("Verhalen", klus in Houten-Zuid) | Geen fout; het document liet het niet zien |
| "Maximaal 3 mm uitsteken volgens de PKVW-beveiligingsrichtlijn" | A3 | Vakkennis uit het onderzoek van de brief (algemene kennis met bronadres), niet van het bedrijf | Terecht punt: stellig gebracht zonder dat het bedrijf het zei |
| SKG-specificaties "vrij stellig" | A3, A5 | Deels site, deels vakkennis uit de brief | Deels terecht |
| "We zien regelmatig zzp'ers die na een jaar overstappen" | B2 | Het gesprek ("Verhalen": zzp'ers die na een jaar zelf boeken in april in de stress schieten) | Geen verzinsel, wel een verbreding: "regelmatig" en "overstappen" staan er niet letterlijk |
| Bezoek aan het kantoor in Hilversum op afspraak | B1 | Site van Myfinance ("waar je op afspraak welkom bent") | Geen fout |
| **€69,95 + €10 software = "vanaf €79,95"** | B1 | **Nergens.** De klant zei "€69,95 all-in"; de site noemt beide bedragen apart | **Echte fout**, zie patroon 1 |
| "Die beesten zijn agressiever dan een gewone wesp" | C2 | Letterlijk het antwoord van de klant | Terecht punt, maar de klant zei het; volgens de NVWA feitelijk te stellig |

---

## 2. Patronen (wat bij minstens twee van de drie klanten terugkomt)

### Patroon 1: een harde bewering die niet uit de bedrijfsinput volgt
- **Komt voor bij:** A (A3 stellige vakkennis), B (B1 de prijs, B2), C (C2, via de klant).
  Na aftrek van wat wel van het bedrijf kwam (§1c) blijft één echte fout over (B1) en een groep
  stellig gebrachte vakkennis (A3, A5, B2).
- **Ongeacht inputrijkheid:** ja; bij de rijke klant A net zo goed als bij B.
- **Bewijs:**
  - "In de aangeleverde informatie is € 69,95 het all-in tarief voor volledig uitbesteden, terwijl
    de tekst € 69,95 boekhoudservice plus € 10 software als totaal presenteert. [...] Dat is de
    belangrijkste publicatieblokkade in de hele set." (B)
  - "De passage over de PKVW-beveiligingsrichtlijn, de grens van 3 mm en de precieze werking van
    SKG***-onderdelen zijn veel specifieker dan de informatie die het bedrijf zelf heeft
    aangeleverd." (A3)
  - "Een model moet bij ontbrekende bedrijfsinformatie liever schrijven: 'Dat hangt af van het
    onderdeel.'" (A, algemeen)
- **Vermoedelijke oorzaak, nagerekend voor B1:** de **controle** (hoofdstuk 16) gaf zelf het
  verbeterpunt "geef direct de bijbehorende totaalprijzen", en de **herschrijving** voerde dat uit:
  de eerste versie hield het nog als voorbehoud ("tel je dit pakket apart op, dan is de som..."),
  de herschreven versie maakte er een stellig totaal van ("dat totaal bestaat uit"). De controle in
  de code markeerde €83,45 als onbewezen, maar €79,95 niet. **Waarom niet, is nog niet uitgezocht.**
  Voor A3 en A5: de schrijfopdracht (hoofdstuk 15) geeft vakkennis uit het onderzoek mee met de
  waarschuwing dat het algemene kennis is, en de schrijver brengt het toch als stellige bewering.
- **Soort:** feitelijk (bedragen, termijnen, normen). Valt onder conventie 1: harde feiten krijgen
  een vangnet in code.

### Patroon 2: herhaling, overuitleg en voorzichtige, defensieve zinnen
- **Komt voor bij:** alle drie.
- **Ongeacht inputrijkheid:** ja.
- **Bewijs:**
  - "Vrijwel iedere pagina gebruikt dezelfde kernboodschap [...] Maar nu wordt hij soms op drie of
    vier verschillende plekken op dezelfde pagina opnieuw uitgesproken. [...] de tekst is inhoudelijk
    correct, maar blijft uitleggen nadat het punt al gemaakt is." (A)
  - "Er wordt veel geschreven om uitzonderingen, verantwoordelijkheden en randgevallen af te dekken.
    Dat maakt de copy betrouwbaar, maar ook wat stroef." (B)
  - "De nieuwe teksten zijn veel netter, maar af en toe bijna administratief: 'Een verzonden e-mail
    is dus niet automatisch een bevestigde afspraak.'" (C)
- **Aanwijzing voor de oorzaak:** herschreven pagina's scoren lager op "leest lekker" (gemiddeld 3,6
  tegen 4,0) en op kwaliteit (3,4 tegen 3,9). Bij B is het het duidelijkst: de vier herschreven
  pagina's krijgen allemaal een 3 voor kwaliteit, de twee niet herschreven een 4. ⚠️ Dit is een
  aanwijzing, geen bewijs: het zijn achttien pagina's, en wat herschreven wordt verschilt ook per
  onderwerp. Vermoedelijke stap: **de controle en de herschrijving** (hoofdstuk 16), die
  verbeterpunten als "maak duidelijk dat..." en "voeg toe dat..." opleveren, waarna de tekst
  voorbehouden erbij krijgt en niets kwijtraakt. Past bij waarneming 1.1 in het plan (A2).
- **Soort:** stijl en toon. Volgens `docs/tasks/contentketen-opnieuw.md` §3 dus **geen** controle in
  code, hooguit een scherpere instructie in een bestaande opdracht.

### Patroon 3: pagina's binnen één set overlappen en hebben geen eigen doel
- **Komt voor bij:** B (B2 met B3, B5 met B6) en C (C2 met C3, C4 met C5 en C6). Bij A alleen een
  pagina met twee doelen (A5), geen overlap.
- **Ongeacht inputrijkheid:** ja, B en C verschillen in rijkheid.
- **Bewijs:**
  - "Pagina's 2 en 3 liggen te dicht bij elkaar. [...] Pagina's 5 en 6 hebben hetzelfde probleem.
    De zesde pagina is nu vooral een verkorte versie van pagina 5." (B)
  - "Er zit overlap tussen [...] Pagina 4: wat kost mollenbestrijding? Pagina 5: mollenbestrijding
    aanvragen Pagina 6: zelf doen of hulp inschakelen. [...] elke pagina moet een duidelijk eigen
    doel hebben." (C)
- **Vermoedelijke oorzaak:** **het rapport en de kansen** (hoofdstuk 11): een aanbeveling mag niet
  overlappen met een andere, maar B5 en B6 komen uit hetzelfde rapport, en C4, C5 en C6 ook
  (aanvulling meegerekend). Tussen clusters wordt niet op overlap gekeken (B2 met B3). ⚠️ Een deel
  komt door de opzet van deze ronde: cluster 1 en 2 van B lagen te dicht bij elkaar
  (methodevoorstel M1 in het plan), en de regel "de twee hoogst geprioriteerde" liet geen ruimte om
  een overlappende te vervangen (M2).
- **Soort:** ontbrekende inhoud en volledigheid van de set.

### Patroon 4: een pagina gebouwd rond informatie die de klant niet gaf
- **Komt voor bij:** C (C4 "opnieuw beginnen", C1), B (B6, B5 zonder deadline). Bij A in lichte mate
  (A1 mist de montageduur, maar de pagina staat).
- **Ongeacht inputrijkheid:** nee, dit hangt per definitie samen met ontbrekende input. Het telt
  toch, omdat de keuze om de pagina zo te maken van de keten komt en niet van de klant.
- **Bewijs:**
  - "De titel belooft informatie over kosten, terwijl de tekst juist uitlegt waarom er geen prijs
    wordt gegeven." (C4)
  - "De teksten zeggen vaak 'vraag ernaar' [...] het voelt al snel alsof de schrijver voor het
    bedrijf niet kan beantwoorden wat de klant wil weten." (C)
  - "Een professionele copywriter zou op dat moment niet nóg meer tekst schrijven, maar teruggaan
    naar de opdrachtgever en extra informatie ophalen." (C)
- **Vermoedelijke oorzaak:** de kern van de pagina (de prijs) was een vraag aan de klant, de klant
  sloeg die over, en de pagina werd toch geschreven met de oorspronkelijke titel en opzet.
  Betrokken stappen: **het rapport** ("de klant kan er iets echts over zeggen", hoofdstuk 11) en
  **het schrijven** (wat de schrijver doet als de kernvraag van de pagina open blijft, hoofdstuk
  15). Positief: er is nergens een prijs verzonnen ("klopt" 5 bij C4).
- **Soort:** ontbrekende inhoud. §7 van de methode: kijk eerst of de brief of het gesprek dit al kon
  signaleren.

### Patroon 5: veel algemene vakkennis, weinig van het bedrijf zelf
- **Komt voor bij:** A (A3 "bijna een technische richtlijn", A1, A6), C (C6 "encyclopedisch", C4
  "opvulling met algemeen consumentenadvies"), B (B5 de uitleg over DigiD en fiscaliteit).
- **Ongeacht inputrijkheid:** deels. Bij A komt het naast veel eigen inhoud voor, bij C in plaats
  van eigen inhoud.
- **Bewijs:**
  - "Technische details zijn nuttig als ze een beslissing helpen nemen. Ze worden minder nuttig
    wanneer ze vooral laten zien dat de schrijver veel weet." (A)
  - "De pagina heeft te weinig eigen informatie en vult dat op met algemeen consumentenadvies." (C4)
  - "Gebruik de DigiD- en fiscale uitleg alleen waar die de keuze of voorbereiding echt helpt." (B5)
- **Vermoedelijke oorzaak:** het onderzoek in **de brief** (hoofdstuk 13) levert vakkennis, en **de
  schrijfopdracht** (hoofdstuk 15) geeft die mee als "wat een goede pagina behandelt". Hangt samen
  met patroon 1 (vakkennis die stellig wordt) en patroon 4 (vakkennis als opvulling).
- **Soort:** stijl en volledigheid.

### Geen patroon, wel een uitkomst: de keten benut rijke input
"Klinkt het als dit bedrijf" volgt de inputrijkheid bijna precies: A 5,0, C 3,2, B 2,5. Bij A:
"Dit is een van de sterkste punten. De tekst voelt niet als 'een willekeurige slotenmaker die Tedee
verkoopt'." Dat is precies de vraag die profiel A moest beantwoorden: gebruikt de keten goede input
ook echt? Ja. En bij de zwakste input (C) verzint de keten het minst ("klopt" 4,3: "opvallend
terughoudend met onbewezen claims"). Volgens §6 is een klacht die met de input meebeweegt een
inputprobleem, geen pijplijnprobleem.

---

## 3. Conclusie (concept, samen te bespreken)

Hooguit vijf voorstellen, elk bij één bestaande stap. Nog geen besluit; na akkoord volgt stap 5 van
het plan (per voorstel eerst nalezen hoe de stap nu is ingericht).

| # | Voorstel | Stap | Patroon | Aard |
|---|---|---|---|---|
| V1 | **Uitzoeken waarom €79,95 niet als onbewezen bedrag werd gemarkeerd**, en de controle in code zo maken dat een bedrag dat niet letterlijk in de input staat (ook een optelling van twee bedragen) altijd geel wordt. | De controle in code (hoofdstuk 16) | 1 | Feitelijk; conventie 1 |
| V2 | **De beoordeling mag geen verbeterpunt geven dat een feit toevoegt** (een totaalprijs, een termijn) dat niet in de input staat; alleen verbeterpunten over wat er al is. | De beoordeling in de controle (hoofdstuk 16) | 1, 2 | Instructie in een bestaande opdracht |
| V3 | **In de schrijf- en herschrijfopdracht:** een kernboodschap één keer goed zeggen in plaats van op elke plek; vakkennis alleen gebruiken als die de keuze van de lezer helpt, en nooit als stellige norm zonder bron van het bedrijf. | Het schrijven en herschrijven (hoofdstuk 15 en 16) | 2, 5, deels 1 | Instructie in een bestaande opdracht; geen code (contentketen-opnieuw §3) |
| V4 | **Overlap binnen en tussen rapporten voorkomen**: een aanbeveling die hetzelfde doel dient als een andere aanbeveling van hetzelfde merk valt af of wordt samengevoegd. | Het rapport en de kansen (hoofdstuk 11) | 3 | Bestaande regel scherper, over clusters heen |
| V5 | **Een pagina waarvan de kernvraag onbeantwoord blijft, niet schrijven met een titel die dat antwoord belooft.** Eerst uitzoeken of de brief die kernvraag als zodanig kan markeren en de schrijver dan een andere invalshoek kiest, zonder nieuwe stap. | De brief en het schrijven (hoofdstuk 13 en 15) | 4 | Nog uit te werken; mogelijk raakt dit de grens van contentketen-opnieuw §3, dan besluit de eigenaar |

**Los daarvan, geen pijplijnwijziging:** sjabloonversie 3 voor een volgende ronde. Laat in het
document zien wat de schrijver al over het bedrijf wist (de feiten van de site en uit het gesprek,
kort, één keer per klant). Zet de publiceer-keuze in de beoordelingstabel in plaats van als losse
vakjes. Vraag om de bestede tijd. Anders meet "klopt het" vooral wat het document laat zien.

**Een goedkope eerste verificatie van patroon 2** (vóór er iets gebouwd wordt): de bijlage bevat al
de eerdere versies van negen pagina's. Leg bij dezelfde beoordelaar voor B1, B2, B3, B6 en A2 de
eerste en de herschreven versie naast elkaar, met hetzelfde formulier. Is de eerste versie beter,
dan is dat direct bewijs voor V2 en V3, zonder nieuwe AI-kosten.
