# Live end-to-end test Sales-module, 1 september 2026

**Wat er getest is.** Eén echte markt, van begin tot eind, op de productieomgeving
(`geo-ten-blush.vercel.app` en het Supabase-project GEO), met echte betaalde AI-aanroepen en echte
bedrijven. De markt is **Warmtepomp Eindhoven** (`3b15f714-023f-4499-bbeb-ae9c394a8559`), aangemaakt
door de eigenaar op 1 september 2026, doorgemeten door de tester op dezelfde dag.

**Werkwijze.** Ingelogd als `e2e-consultant@orbit-test.nl`, het bestaande beheerdersaccount uit de
vorige testronde. Dat account is automatisch sales admin. Alle handelingen zijn via de echte
schermen en de echte API-routes gedaan, met één uitzondering die hieronder expliciet benoemd staat.

**Werkelijke kosten: $0,60 voor de hele markt**, ongeveer 56 eurocent. Het plafond van tien euro per
markt is dus ruim achttien keer zo hoog als wat een markt kost.

**Eindoordeel: 🔴 nog niet geschikt voor daadwerkelijk salesgebruik.** Het belangrijkste scherm van
de module is leeg terwijl de database gevuld is, en de meting meet iets anders dan de markt waar hij
over gaat. Beide oorzaken zijn gevonden, bewezen en klein te repareren. De onderbouwing staat
hieronder.

---

## 1. Wat er precies gebeurd is, stap voor stap

| Stap | Wat de tester deed | Uitkomst | Kosten |
|---|---|---|---|
| Markt en onderzoek | Al gedaan door de eigenaar om 09:02 | 52 bedrijven gevonden | $0,02 |
| Poort 1, bedrijvenlijst | 9 niet-bedrijven weggehaald via de knop Weghalen | 43 bedrijven over, route werkt | gratis |
| Crawl en vragen | Al gedaan door de eigenaar om 09:54 | 8 intenties, 40 vragen | $0,003 |
| Poort 2, meting goedkeuren | Knop op het marktscherm, raming € 1,11 | 40 metingen ingepland | |
| De meting | 40 vragen aan ChatGPT, met beoordeling per antwoord | klaar in 13 minuten | $0,56 |
| Kansen bepalen | Automatisch | 43 kansen, allemaal van hetzelfde type | gratis |
| Uitleg en haak schrijven | Automatisch | **16 van de 16 taken definitief mislukt** | gratis |
| Kans oppakken | Knop op het scherm | **werkt niet, 404** | |
| Contactpersoon en conceptmail | Handmatig in gang gezet, zie hieronder | contact gevonden, mail uit sjabloon | $0,015 |
| Werkstroom | Afwijzen zonder reden, verstuurd melden | beide gedragen zich goed | gratis |
| Rapporttekst | Knop op het marktscherm | tekst geschreven, niet gepubliceerd | $0,0004 |
| Hermeting | **niet gedraaid**, zie hoofdstuk 7 | | |

**De ene handmatige ingreep.** Omdat de knop "Kans oppakken" een fout geeft (bevinding P0-1), is de
toewijzing van één kans met de hand in de database gezet, zodat de contactstap en de conceptmail
alsnog echt konden draaien. Zonder dat was de belangrijkste commerciële vraag van deze test niet te
beantwoorden. De eigenaar heeft daar toestemming voor gegeven.

**Wat er niet gebeurd is.** Er is geen mail naar een prospect gegaan, er is geen openbare pagina
online gezet, en er is niets aangeraakt in de omgeving van bestaande klanten.

---

## 2. Het belangrijkste in vijf zinnen

1. Het Opportunities-scherm zegt "Nog geen kansen gevonden" terwijl er 43 kansen in de database
   staan, en de knop om een kans op te pakken geeft "Deze kans bestaat niet".
2. Slechts 3 van de 40 vragen noemen Eindhoven, waardoor 38 antwoorden over Nederland in het
   algemeen gaan en 42 van de 43 bedrijven op nul vermeldingen uitkomen.
3. Daardoor is elke kans van hetzelfde soort ("Onzichtbaar") met dezelfde zin eronder, en staan er
   zeven bedrijven met exact dezelfde score van 76 bovenaan.
4. Eén bedrijf dat de AI wél noemde, staat op het scherm en in het rapport op nul, doordat de
   optelling stilletjes stopt na duizend rijen.
5. Wat goed werkt, is de bewaking: elk cijfer dat het model verzint wordt geweigerd, en dat gebeurde
   bij twee van de twee geschreven teksten.

---

## 3. Geprioriteerde bevindingen

### P0, kritiek en blokkerend

#### P0-1 Het Opportunities-scherm is leeg en een kans oppakken kan niet

**Waarneming.** Na een afgeronde meting met 43 kansen in `sales_opportunities` toont
`/sales/opportunities` de lege staat "Nog geen kansen gevonden. ORBIT ENGINE vult dit scherm nadat
een markt gemeten is." Een POST naar `/api/sales/opportunities/<id>/assign` antwoordt
`{"error":"Deze kans bestaat niet."}` met code 404, terwijl die kans bestaat. De 16 taken die de
uitleg en de haak moesten schrijven, zijn na vier pogingen definitief mislukt met dezelfde melding.

**Oorzaak, bewezen.** De tabel `sales_opportunities` verwijst twee keer naar `sales_companies`: één
keer voor het bedrijf zelf en één keer voor de concurrent. De database weet daardoor niet welke van
de twee bedoeld wordt in een gecombineerde uitvraag, en weigert hem:

```
PGRST201: Could not embed because more than one relationship was found
for 'sales_opportunities' and 'sales_companies'
```

Dat antwoord is live nagespeeld tegen productie. De code vangt de fout niet op: hij leest alleen de
gegevens en niet de foutmelding, en concludeert daarna dat de rij niet bestaat.

**Waar.** `app/(app)/sales/opportunities/page.tsx` regel 45,
`app/api/sales/opportunities/[id]/assign/route.ts` regel 44, `lib/pipeline/sales-explain.ts` regel
45. Drie plekken, dezelfde fout.

**Impact.** Het belangrijkste scherm van de module, plus de hele werkstroom erachter. Een New
Business Manager komt niet verder dan de markt.

**Oplossing.** De verwijzing benoemen: `sales_companies!sales_opportunities_company_id_fkey(name)`.
En overal waar `.select()` staat de foutmelding uitlezen in plaats van weggooien, zodat een storing
nooit meer als "bestaat niet" op het scherm komt.

#### P0-2 De vragen meten Nederland en niet Eindhoven

**Waarneming.** Van de 40 gemeten vragen noemen er 3 de plaats. In 2 van de 40 antwoorden komt
überhaupt een bedrijf uit de markt voor, en die twee horen bij vragen die Eindhoven wél noemden. Een
voorbeeld van wat er misgaat, letterlijk uit de meting:

> Vraag: "Welke installateur kan bij mij in de buurt een warmtepomp goed installeren?"
> Antwoord: "Om een goede installateur bij jou in de buurt te vinden, heb ik je postcode of
> woonplaats nodig."

Dat antwoord noemt geen enkel bedrijf, en telt vervolgens mee als bewijs dat 43 bedrijven onzichtbaar
zijn.

**Oorzaak.** De instructie aan het model zegt letterlijk: "De plaats mag erin als een klant hem er
echt bij zou typen. Niet in elke vraag." (`lib/sales/questions.ts` regel 133). Er is geen
deterministisch vangnet dat controleert of er genoeg vragen overblijven die een lokaal antwoord
kunnen uitlokken. Dat is precies conventie 1 uit `CLAUDE.md`, die hier niet is toegepast.

**Impact.** Dit is de duurste stap van de module, en hij meet de verkeerde vraag. Alles wat erna
komt, de score, de kans, de haak, de mail en het rapport, rust op deze meting.

**Oplossing.** De plaats verplicht stellen in elke vraag van de fases Selecteren en Contact opnemen,
dat in code afdwingen na het schrijven, en een vraag zonder plaats in die fases herschrijven in
plaats van accepteren. Overweeg daarnaast een vangnet op de uitkomst: levert een ronde minder dan
bijvoorbeeld vijf antwoorden met een bedrijfsnaam op, dan is dat een storingsmelding en geen
marktbeeld.

#### P0-3 De optelling stopt stil na duizend rijen

**Waarneming.** DBS Installatietechniek is in de meting genoemd. Het fragment staat opgeslagen:

> "DBS Installatietechniek, interessant als je specifiek Mitsubishi Heavy Industries wilt. Het
> bedrijf vermeldt STEK-gecertificeerde monteurs, onderhoud en meer dan twintig jaar ervaring."

Toch staat DBS op het marktscherm op "0 van de 40", staat hij zo in het openbare rapport, en zegt
zijn kans "wordt bij 0 van de 40 gemeten vragen genoemd".

**Oorzaak, bewezen.** 43 bedrijven maal 40 antwoorden is 1720 rijen met vermeldingen. De
optelstap haalt ze in één keer op, en de database geeft er standaard maximaal duizend terug. De
vermelding van Van Beek stond op rij 466 en telt mee. Die van DBS stond op rij 1652 en verdween.

**Waar.** `lib/pipeline/sales-aggregate.ts` regel 79. Dezelfde constructie staat in
`lib/pipeline/sales-detect.ts` regel 196. In `lib/spend-limit.ts` regel 77 doet de app het wél goed,
met paginering, dus het patroon is bekend in deze codebase.

**Impact.** Elke markt met meer dan ongeveer 25 bedrijven verliest meetgegevens, en juist de laatst
gemeten vragen. Het verificatiecriterium uit het plan, "de cijfers zijn met de hand na te rekenen",
faalt hier hard. Erger: een verkoper zou tegen DBS zeggen dat hij nul keer genoemd wordt, terwijl het
eigen systeem het tegendeel heeft opgeslagen.

**Oplossing.** Pagineren zoals in `lib/spend-limit.ts`, of de optelling in de database doen. En een
test die 1500 vermeldingen aanmaakt en controleert dat ze allemaal meetellen.

#### P0-4 De publicatiedrempel kijkt naar het aantal bedrijven en niet naar zichtbaarheid

**Waarneming.** De drempel weigert publicatie onder de vijf zichtbare bedrijven. "Zichtbaar"
betekent in de code "niet verwijderd op verzoek" (`lib/sales/report.ts`, `publiekeBedrijven`), en
niet "minstens één keer genoemd". Deze markt heeft 43 bedrijven waarvan er één is genoemd, en zou
dus gepubliceerd kunnen worden.

**Impact.** Dan staat er een openbare pagina online met 42 echte bedrijven op nul, met twee
vermeldingen die "Open website" heten, en met minstens één cijfer waarvan intern vaststaat dat het
onjuist is (zie P0-3). Dat is precies het scenario dat het plan wil voorkomen.

**Oplossing.** De drempel laten tellen hoeveel bedrijven daadwerkelijk genoemd zijn, en publicatie
weigeren als de markt geen marktbeeld oplevert maar een lijst nullen. De pagina is niet online gezet
tijdens deze test.

---

### P1, belangrijk voor product en sales

#### P1-5 De marktontdekking ziet linkteksten aan voor bedrijven

Van de 52 gevonden bedrijven waren er 9 helemaal geen bedrijf in deze markt: Fraudehelpdesk,
"Het weer" (knmi.nl), "Lees meer over deze doeleinden" (cookiedatabase.org), MKB Nederland, MKB
Servicedesk, OpenStreetMap, Rijksdienst voor ondernemend Nederland, "Update mijn webbrowser"
(outdatedbrowser.com) en "Website door Bonsai media". Ze stonden alle negen op "gaat mee".

Erger dan de ruis is de naamgeving: twee echte installateurs (klima-techniek.nl en
comfortairsolutions.nl) heten in het systeem **"Open website"**, omdat dat de tekst van de link op de
bronpagina was. Die naam loopt door tot in de kans, de score, de conceptmail en het openbare rapport.

**Oplossing.** Een uitsluitingslijst voor bekende bronnen en overheidssites, een controle op
linkteksten die geen bedrijfsnaam kunnen zijn ("Open website", "Lees meer", "Update"), en een
mogelijkheid om een naam te corrigeren in plaats van alleen te verwijderen.

#### P1-6 De contactpersoon klopt niet en komt niet in de mail terecht

Gevonden voor Coolvent: "D. Satram", functie "eigenaar van JS Montage Eindhoven", adres
`info@coolvent.nl`, gevonden op de pagina met leveringsvoorwaarden. De functie noemt dus een ander
bedrijf, en het adres is een algemeen adres dat als "gevonden" is gelabeld en daarmee door de regel
"geen mail naar een algemeen adres" heen glipt. Op het scherm staat het zonder enige waarschuwing.

Tegelijk staat `contact_id` op de outreach leeg en begint de conceptmail met "Beste,". De hele
belofte van de module, een persoonlijk eerste contact, komt niet uit de bus.

**Oplossing.** De gevonden persoon koppelen aan de outreach en meegeven aan de mailprompt. Een
functie die een andere bedrijfsnaam bevat, weigeren. Een `info@`-adres altijd als algemeen
markeren, ook als het letterlijk op de site staat.

#### P1-7 Het Overzicht-scherm is een placeholder

`/sales` toont een vaste lege staat met de tekst "Er is nog geen markt gemeten, dus er zijn nog geen
kansen om op te pakken." Die tekst is nu aantoonbaar onwaar: er is een markt gemeten. Het scherm
haalt geen gegevens op; de vier blokken uit het plan (mijn werk vandaag, nieuw beschikbaar, wat er
terugkomt, mijn cijfers) bestaan niet. Voor een New Business Manager is dit het startscherm.

#### P1-8 Beide door AI geschreven teksten zijn afgekeurd, en dat is niet zichtbaar

De conceptmail en de gespreksvoorbereiding zijn allebei door de getallencontrole tegengehouden,
waarna de mail terugviel op het sjabloon en de gespreksvoorbereiding helemaal niet is opgeslagen. De
reden staat in een notitieveld dat op geen enkel scherm getoond wordt:

> "De gespreksvoorbereiding is niet opgeslagen: Er horen drie openingen bij: geen reactie, interesse
> en scepsis."

De verkoper ziet dus geen belvoorbereiding en leest nergens waarom. De haak is bij alle 43 kansen
het sjabloon, omdat de schrijfstap nooit gedraaid heeft (P0-1). Op de vraag uit de testopdracht
"domineert het sjabloon?" is het antwoord: 100 procent.

De mail zelf, letterlijk zoals hij klaarstaat:

> Onderwerp: Coolvent in AI-antwoorden over Warmtepomp Eindhoven
>
> Beste,
>
> Wij hebben gemeten wat AI-assistenten antwoorden op vragen over Warmtepomp Eindhoven. Coolvent
> wordt bij 0 van de 40 gemeten vragen genoemd door de AI-assistenten in deze markt.
>
> Dat zegt niets over de kwaliteit van jullie werk. Het zegt iets over wat een AI-assistent over
> jullie weet, en dat is iets anders.
>
> Heb je tien minuten deze week om er even naar te kijken?
>
> [jouw naam] (e2e-consultant@orbit-test.nl)

Geen naam, geen concurrent, geen dienst, geen bron, en een ondertekening met een plaatshouder plus
een intern mailadres. Dat is de linkerkolom van de tabel in plan 16.1, de kolom die "waardeloos"
heet.

#### P1-9 De score kan niet kiezen

De zeven hoogste kansen hebben allemaal exact score 76, met exact dezelfde opbouw. Het verschil in
de lijst wordt bepaald door "kan dit bedrijf klant worden" en "kunnen wij dit oplossen", twee
onderdelen die uit de website komen. Feitelijk sorteert de lijst dus op websitekwaliteit en niet op
GEO-kans.

Daarbij krijgt elk bedrijf 20 van de 20 punten voor bewijssterkte, terwijl het bewijs bestaat uit
veertig vragen waarvan er 37 niet over de lokale markt gingen. Een volle score voor afwezigheid is
misleidend richting de verkoper.

#### P1-10 De ruwe uitvoer van een AI-aanroep wordt niet bewaard

`ai_calls` bewaart model, tokens en kosten, maar niet het antwoord zelf. De afgekeurde conceptmail is
daardoor nergens meer terug te lezen. Conventie 8 en plan 15.3 beloven het tegenovergestelde, en juist
bij een afkeuring wil je kunnen zien wat er stond. Bij de metingen gaat het wel goed:
`sales_answers.raw` is gevuld.

#### P1-11 De bewijstabel is leeg

`sales_evidence` bevat nul rijen. Op het dossier staat daarom: "Bij dit soort kans is de afwezigheid
het bewijs: dit bedrijf komt in geen van de gemeten antwoorden voor. De vragen staan bij de markt."
Doorklikken naar vraag, antwoord en bron, de kern van hoofdstuk 15 van het plan, kan dus niet. Voor
een verkoper die aan de telefoon "dat kan niet kloppen" te horen krijgt, is dat het moment waarop hij
niets heeft.

---

### P2, verbeteringen

| Nr | Bevinding | Waarom het telt |
|---|---|---|
| P2-12 | De kosten staan nergens op het scherm. `sales_markets.cost_cents` blijft nul, want niets schrijft die kolom. De raming van $0,03 per vraag is ruim twee keer de werkelijke $0,014, en de raming voor het marktonderzoek is $0,85 tegen $0,02 werkelijk, dus 42 keer te hoog | De sales admin keurt kosten goed op basis van een getal dat structureel te hoog is, en ziet achteraf nooit wat het werd |
| P2-13 | Tijdens het meten staat er alleen "De meting loopt". Geen teller, geen indicatie. Het duurde 13 minuten | Een gebruiker weet niet of het werkt of hangt |
| P2-14 | Het blok "Genoemd, maar niet in onze lijst" gooit fabrikanten (Daikin, Vaillant, LG), energiebedrijven (Eneco, Essent), platforms (Werkspot, Trustoo) en echte concurrenten (Feenstra, Kemkens, Breman, Climotec) door elkaar, zonder aantallen en zonder knop om er een aan de markt toe te voegen | Feenstra werd drie keer genoemd en is daarmee de best zichtbare speler in deze markt. Hij staat niet in de lijst, dus het type "Concurrent loopt voor" kan nooit tegen de echte marktleider afgaan |
| P2-15 | Er draait één AI-assistent, want er is geen sleutel voor de tweede. Het scherm zegt dat eerlijk | Het type "Verschil tussen assistenten" kan in de praktijk nooit ontstaan, en dat is een van de acht types |
| P2-16 | Een bedrijfsnaam corrigeren of een gemist bedrijf toevoegen kan niet | Zie "Open website" en Feenstra |
| P2-17 | Tekstfouten: "3% (± 11% )", "Gemeten in ronde 1 op 1-9-2026 .", "Warmtepomp in Eindhoven , 15 km", en in het rapport "worden er 1 minstens één keer genoemd" en "welke Warmtepomp in Eindhoven daarbij genoemd worden" | De branche wordt als losse tekst in zinnen geplakt. Op een openbare pagina leest dat als slordig |
| P2-18 | De markten-lijst toont geen aantal bedrijven, geen aantal kansen, geen meetdatum en geen kosten | Plan 5.4 vraagt daar juist om |
| P2-19 | Een marge van ± 11 procentpunt naast een waarde van 3 procent wordt getoond zonder de conclusie dat dit verschil niets betekent | De cijfers zien er preciezer uit dan ze zijn |

### P3, klein

- **P3-20** De eerste onderzoekstaak van deze markt is mislukt met "Onbekende taaksoort:
  `sales_market_discover`", omdat de draaiende versie de nieuwe taaksoort nog niet kende. Dat is
  precies de valkuil die in de testopdracht beschreven staat. De taak staat nu als mislukt in de
  wachtrij zonder dat iemand daar iets van ziet.
- **P3-21** "Ik heb hem verstuurd" kan aangeklikt worden zonder dat er ooit een mail is geweest. Dat
  is bewust zo, maar er staat geen enkele bevestigingsvraag omheen.
- **P3-22** `sales_users` is leeg. De salesrol zonder beheerdersrechten is dus nog nooit in gebruik
  geweest, en het onderscheid tussen sales en sales admin is in de praktijk niet getoetst.

---

## 4. De kwaliteit van de GEO-uitkomst zelf

**Is de informatie relevant voor de markt?** Deels. De acht intenties die de module zelf voorstelde
zijn goed: warmtepompinstallatie, hybride, all-electric, advies, service, cv-ketelvervanging,
ventilatie en airconditioning. Dat is precies hoe deze markt in elkaar zit. De veertig vragen zijn
in normaal Nederlands geschreven, bevatten geen bedrijfsnamen en zijn onderling verschillend. Als
vragenlijst is dit goed werk.

**Zijn de resultaten betrouwbaar?** Nee, niet in deze vorm. 38 van de 40 antwoorden gaan over
Nederland in het algemeen, dus de uitspraak "dit bedrijf wordt niet genoemd in deze markt" is niet
gemeten. Er is geen hallucinatie aangetroffen, en dat is een compliment: het beoordelende model heeft
nul keer een rol toegekend aan een bedrijf dat niet genoemd werd, en de controle daarop
(`mentioned = false` met een rol erbij) geeft nul rijen. De fout zit niet in het verzinnen, maar in
het meten.

**Zijn bedrijven correct herkend?** Grotendeels wel, met de uitzonderingen uit P1-5. Van de 43
bedrijven hebben er 24 geen website. Dat is met opzet, het plan zoekt juist die bedrijven, maar het
betekent wel dat meer dan de helft van de lijst commercieel zwak is.

**Is duidelijk wat gemeten is en wat interpretatie is?** Ja, en dat is het sterkste punt van de hele
module. Het marktscherm opent met een eerlijk blok "Wat het onderzoek zelf niet zeker wist", inclusief
de zin dat "regio Eindhoven" niet gelijk is aan een vestiging binnen vijftien kilometer. Bij de haak
staat letterlijk: "Deze zin komt uit het vaste sjabloon en is niet apart geschreven." Dat is precies
de toon die het merkverhaal belooft.

**Kloppen de bronnen?** De aangehaalde bronnen per antwoord worden opgeslagen (milieucentraal.nl,
eigenhuis.nl en zo verder) en het volledige antwoord blijft bewaard. De koppeling van bron naar
bedrijf komt alleen niet op het scherm, omdat de bewijstabel leeg is.

---

## 5. De commerciële vertaalslag

De keten die het plan belooft is: analyse, inzicht, interessante prospect, salesargument, mogelijke
outreach. Zo ver kwam die keten in de praktijk:

| Schakel | Werkt hij? |
|---|---|
| Analyse | ja, technisch af, maar hij meet de verkeerde vraag |
| Inzicht | nee, er is één inzicht voor 43 bedrijven: "je wordt niet genoemd" |
| Interessante prospect | nee, het scherm dat prospects toont is leeg |
| Salesargument | nee, één sjabloonzin, zonder concurrent en zonder dienst |
| Outreach | half, er staat een mail klaar zonder naam en zonder onderbouwing |

**Kan een New Business Manager hiermee interessante prospects herkennen?** Nee. Hij komt niet
voorbij het lege Opportunities-scherm, en zou hij dat wel doen, dan ziet hij zeven bedrijven met
hetzelfde cijfer en dezelfde reden.

**Is duidelijk waarom een prospect interessant is?** Alleen in de vorm "hij is onzichtbaar". Dat is
precies de zwakste van de acht types, en het plan zegt daar zelf over dat het "een toestand is waar
een ondernemer al jaren mee leeft zonder het te weten". Er is geen concurrent bij naam, geen gemiste
dienst, geen daling en geen onjuistheid: van de acht bedachte types is er in de praktijk één
gevonden, 43 keer.

**Geeft de tool genoeg voor een persoonlijke boodschap?** Nee. Geen naam in de aanhef, een functie
die naar een ander bedrijf verwijst, geen belvoorbereiding, en een cijfer dat de prospect binnen twee
minuten zelf kan weerleggen door ChatGPT te vragen wie er in Eindhoven warmtepompen plaatst.

**Sluit dit aan bij het in kaart brengen van lokale spelers?** Het fundament wel. De ontdekking vond
52 partijen, inclusief bedrijven zonder website, met per bedrijf de vindplaats en de zekerheid. Dat
is precies wat je wilt. Maar de meting bevestigt dat lokale beeld niet, en de tien echte lokale
namen die de AI zelf noemde (Feenstra, Kemkens, Climotec, Energiewacht, HanVos Warmtepompen en
anderen) belanden in een ongesorteerde lijst waar niets mee kan.

**Bespaart het tijd?** Vandaag niet. Een verkoper is met een halfuur handwerk verder dan met deze
uitkomst. Na herstel van P0-1 tot en met P0-3 verandert dat oordeel waarschijnlijk wel, want dan
levert dezelfde meting voor 56 eurocent een lijst met namen, concurrenten en bewijs op.

---

## 6. Wat goed werkt en moet blijven

1. **De poorten.** Poort 1 en poort 2 doen precies wat ze moeten: de keten stopt echt, en er wordt
   geen euro uitgegeven zonder dat een mens erop klikt. De raming staat ervoor.
2. **De getallencontrole.** Twee van de twee door AI geschreven teksten zijn tegengehouden omdat er
   een getal in stond dat niet uit de meting kwam. Dat is vervelend voor de kwaliteit van de mail, en
   het is precies waarom dit vangnet bestaat. Zonder deze controle was er een verkoopmail met een
   verzonnen cijfer klaargezet.
3. **Het vangnet op de rollen.** Nul rijen met een rol bij een bedrijf dat niet genoemd is, over 1720
   beoordelingen.
4. **De scheiding met de klantomgeving.** Een klantaccount krijgt op `/sales`, `/sales/opportunities`
   en `/sales/markten` netjes een 404, niet een 403 die het bestaan verraadt.
5. **De eerlijkheid in de teksten.** De onzekerheidsalinea bij het marktonderzoek, de zin bij de
   sjabloonhaak, en de mededeling dat er geen contactpersoon gevonden is in plaats van een gegokt
   adres. Dit is de toon waar het merk om vraagt.
6. **Het uitleggen van de score.** Het prospectdossier laat elk onderdeel apart zien met een zin in
   gewone taal ("Hoeveel er te winnen valt", "Of er een concurrent tegenover staat"). Zodra de
   invoer klopt, is dit een scherm waar een verkoper iets aan heeft.
7. **De werkstroom.** Afwijzen zonder reden wordt geweigerd met een uitleg die klopt. Het
   Outreach-scherm toont een trechter die cumulatief telt en zegt dat er ook bij.
8. **De kosten.** 56 eurocent voor een hele markt van 43 bedrijven en 40 vragen. Dat is ruim onder
   het plafond, en het maakt hermeten goedkoop.

---

## 7. Wat niet getest is, en waarom

- **De hermeting (sprint 7).** Niet gedraaid. Een tweede ronde kost opnieuw ongeveer 55 dollarcent en
  zou hier niets kunnen opleveren: met nul vermeldingen in ronde één is een daling per definitie niet
  te meten. Wel nagelezen in de code: `/api/sales/markets/<id>/remeasure` kopieert de vragen exact
  naar een nieuwe ronde met hetzelfde gewicht, wat het plan ook eist.
- **Publicatie van de openbare pagina.** Bewust niet gedaan, zie P0-4. De tekst is wel geschreven en
  beoordeeld.
- **De uitsluiting van klanten en concurrenten van klanten.** Er zat geen klant van Outer Orbit in
  deze markt, dus die regel is niet in werking getreden. Er staan wel twee installatiebedrijven in de
  klantomgeving (Gasservice Brabant en Wouter Warmtepomp), maar geen van beide zit in Eindhoven. De
  koppeling gaat alleen op exact domein, dus een klant die de ontdekking mist, levert ook geen
  waarschuwing op. Dat is een aandachtspunt voor de volgende markt.
- **De salesrol zonder beheerdersrechten.** Zie P3-22.
- **Het oordeel van New business.** De testopdracht vraagt om een echt oordeel van iemand die de
  markt kent, over de bedrijvenlijst en over de top tien en bodem tien. Dat oordeel kan een tester
  niet vervangen, en met 43 identieke kansen is er op dit moment ook niets zinnigs aan voor te
  leggen. Dit blijft openstaan tot na het herstel van P0-2.

---

## 8. Scores

| Onderdeel | Score | Toelichting |
|---|---|---|
| UX en gebruiksvriendelijkheid | **5** / 10 | De schermen die werken zijn goed geschreven en eerlijk. Het startscherm is een placeholder en het belangrijkste scherm is leeg |
| Technische kwaliteit | **4** / 10 | De opzet, de conventies en het commentaar zijn van hoog niveau. Er staan drie datafouten op productie die geen enkele test ving, en foutmeldingen worden weggegooid |
| Kwaliteit van de AI-output | **3** / 10 | Goede vragen, geen hallucinaties, maar de meting meet de verkeerde vraag en alle geschreven teksten vielen terug op een sjabloon |
| Commerciële bruikbaarheid | **2** / 10 | Eén reden, 43 keer, zonder naam en zonder bewijs om door te klikken |
| Potentie voor New Business | **7** / 10 | Het ontwerp klopt, de kosten zijn laag, en de vier grootste problemen zijn scherp begrensd |

---

## 9. Eindoordeel

### 🔴 Nog niet geschikt voor daadwerkelijk salesgebruik

**"Als ik morgen een New Business Manager deze tool geef, kan hij er dan betere prospects mee vinden
en benaderen?"**

Nee. Hij opent de module, ziet op het startscherm dat er nog geen werk is, klikt naar Opportunities
en leest dat er nog geen kansen gevonden zijn. Zou hij die twee schermen omzeilen, dan vindt hij
43 bedrijven met dezelfde score, dezelfde reden en dezelfde zin, over een meting die niet over
Eindhoven ging. De eerste prospect die terugbelt met "ik ben net zelf ChatGPT gaan vragen en ik werd
gewoon genoemd" heeft dan gelijk, want minstens één keer heeft ons eigen systeem dat opgeslagen en
niet meegeteld.

Dat oordeel gaat over de huidige stand, niet over het idee. Wat er ligt is geen wankel prototype: de
poorten werken, de bewaking werkt, de kosten zijn een fractie van de begroting, de teksten zijn
eerlijk, en de scheiding met de klantomgeving is dicht. De module faalt op vier scherp aanwijsbare
punten, en alle vier zijn ze klein in regels code.

### Wat absoluut opgelost moet worden

1. **P0-1**, de dubbele verwijzing naar `sales_companies` op drie plekken, plus het uitlezen van
   foutmeldingen in plaats van ze weggooien. Zonder dit werkt de module niet.
2. **P0-2**, de plaats in de vragen, met een controle in code en niet alleen een instructie in de
   prompt.
3. **P0-3**, de duizend-rijengrens in de optelling, met een test die eroverheen gaat.
4. **P0-4**, de publicatiedrempel op zichtbaarheid in plaats van op aantal.

### Wat als eerste verbeterd moet worden, daarna

5. De contactpersoon koppelen aan de mail, met een controle op de functie en op algemene adressen
   (P1-6).
6. Het Overzicht-scherm echt vullen (P1-7).
7. De ruis en de foutieve namen uit de bedrijvenlijst halen, en namen kunnen corrigeren (P1-5).
8. De bewijstabel vullen, zodat doorklikken naar vraag en antwoord echt werkt (P1-11).
9. De bedrijven die de AI zelf noemde bruikbaar maken: sorteren op aantal, fabrikanten en platforms
   eruit, en met één klik toe te voegen aan de markt (P2-14). Feenstra hoort in deze markt te staan.

### Is de module na die verbeteringen klaar?

Waarschijnlijk niet in één keer, en de reden is P0-2. Zodra de vragen wél lokaal meten, ontstaan er
voor het eerst echte vermeldingen, en dan pas kunnen de andere zeven kanstypes aanslaan. Dat is het
moment waarop de score voor het eerst iets te kiezen heeft, en waarop New business zinnig kan zeggen
of de top tien klopt. Reken daarom op deze volgorde:

1. De vier P0's herstellen. Kosten: code, geen geld.
2. Dezelfde markt opnieuw meten met de gecorrigeerde vragen. Kosten: ongeveer 60 eurocent.
3. Dan pas de top tien en de bodem tien aan New business voorleggen, en de gewichten kalibreren.
4. Daarna de P1's, in de volgorde hierboven.

Na stap 3 is er voor het eerst een eerlijk antwoord mogelijk op de vraag of de GEO Opportunity Score
doet wat hij belooft. Op dit moment is die vraag niet beantwoord, want hij is nog nooit met echte
verschillen gevoed.

---

## 10. Wat er op productie is achtergebleven

| Wat | Waar |
|---|---|
| Markt Warmtepomp Eindhoven, ronde 1, klaar gemeten | `3b15f714-023f-4499-bbeb-ae9c394a8559` |
| 43 bedrijven, 40 vragen, 40 antwoorden, 1720 vermeldingen | zelfde markt |
| 43 kansen, allemaal type Onzichtbaar, allemaal met een sjabloonhaak | `sales_opportunities` |
| 16 definitief mislukte taken `sales_opportunity_explain` | `jobs` |
| Eén outreach op Coolvent, met de hand aangemaakt, status `gemaild` gezet zonder dat er iets verstuurd is | `4242e5bc-5766-4f28-8343-4c99b92f3042` |
| Eén contactpersoon bij Coolvent, met een functie die naar een ander bedrijf verwijst | `sales_contacts` |
| Eén rapporttekst, niet gepubliceerd | `sales_market_reports` |
| 9 bedrijven op "gaat niet mee" met reden | `sales_market_companies` |

Deze markt kan blijven staan: hij is de natuurlijke basis voor de hermeting na herstel van de P0's.
Wil de eigenaar hem toch opruimen, dan is dat één handeling, maar dan verdwijnt ook het bewijs onder
deze bevindingen. De testoutreach op Coolvent mag wel weg zodra de bevindingen verwerkt zijn: die
staat op "gemaild" terwijl er niets verstuurd is, en dat vervuilt de trechter.

⚠️ **Coolvent, DBS Installatietechniek, Van Beek Installaties en de 40 andere bedrijven in deze markt
zijn echte bedrijven die hier niet om gevraagd hebben.** Er is niets naar ze verstuurd en er staat
niets over ze online. Houd dat zo tot de meting klopt.
