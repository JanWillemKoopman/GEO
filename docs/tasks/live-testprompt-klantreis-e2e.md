# Prompt voor een live end-to-end doorlichting van de klantreis

Geschreven op 2 september 2026, in opdracht van de eigenaar. Kopieer alles onder de streep in een
nieuwe Claude Code sessie die toegang heeft tot productie: een echte `OPENAI_API_KEY`, de
Supabase-MCP en de Vercel-MCP, plus een browser om de app echt te bedienen.

De vorige twee live tests keken elk naar een deel: de klantreis tot en met de briefing op 31
augustus (`bevindingen-live-test-31-augustus-2026.md`) en de Sales-module op 1 september
(`bevindingen-live-test-sales-1-september-2026.md`). Sindsdien zijn de contentpijplijn (migratie
`0082`) en de keuze tussen een nieuwe pagina en een verbetering (migratie `0086`) opnieuw gebouwd.
Die twee zijn gebouwd en niet geverifieerd op een verse klant. Dat is wat deze prompt vraagt.

---

## Opdracht

Doe op productie alsof je een nieuwe klant bent, van het lege scherm tot een gepubliceerde pagina,
en haal alles naar boven wat stuk is. Je krijgt toestemming om echte, betaalde AI-aanroepen te
doen. Reken op ongeveer vier tot zes dollar voor de hele doorloop. Dat is bewust: de app kost geld
zodra hij werkt, en een test met `MEASURE_WEB_SEARCH=false` meet niet wat een klant te zien krijgt.

Het gaat om **twee soorten fouten tegelijk**, en je zoekt ze allebei:

1. **Technisch.** Een taak die faalt, een route die 500 geeft, een klant die iets ziet wat van de
   beheerder is, een cijfer dat niet klopt met de opgeslagen data, een scherm dat blijft hangen.
2. **Wat je alleen ziet door te kijken.** De vergelijking met de bestaande pagina was technisch
   correct en voor een mens onleesbaar. Geen enkele test zag dat. Kijk dus naar elk scherm, niet
   alleen naar het antwoord van de API eronder.

**Lees eerst deze zes dingen, in deze volgorde:**

1. `CLAUDE.md`, voor de conventies en de werkwijze.
2. `APP_FLOW_DOCUMENTATION.md`, de hele keten zonder techniek. Hoofdstuk 6 is de onboarding.
3. `docs/architecture.md`, in elk geval de wachtrij, de rechten en hoofdstuk 6 over de kosten.
4. `docs/tasks/contentpijplijn-herontwerp.md` en `docs/tasks/paginakeuze-nieuw-of-verbeteren.md`,
   want daar zit het nieuwe werk dat nog niet op een verse klant is nagerekend.
5. `docs/tasks/bevindingen-live-test-31-augustus-2026.md`, de vorige ronde. Alles wat daar staat
   hoort nu gerepareerd te zijn. Controleer dat onderweg, want een herhaling van een oude fout is
   een zwaardere bevinding dan een nieuwe.
6. `docs/schrijfstijl.md`, want de helft van wat je gaat zien is tekst.

---

## Stap 0: zorg dat de motor draait, en weet waar je zit

**Test op `main`, tegen de productiedeployment.** Zonder werkende wachtrij gebeurt er niets: de
werker is `/api/cron/worker` en wordt elke minuut aangeroepen door pg_cron in Supabase, niet door
Vercel. Controleer vóór je begint dat er in de laatste minuten taken zijn opgepakt, bijvoorbeeld met
een query op de takentabel. Blijft een taak op `queued` staan, dan test je niets meer en is dat je
eerste bevinding.

Er staat één ding vast dat je niet mag vergeten: **elke code die je zelf wijzigt draait pas mee als
hij op `main` staat.** Repareer je onderweg een fout, dan test je de reparatie of lokaal, of na
akkoord van de eigenaar op `main`. Zet niets stilletjes op productie.

**De accounts.** Gebruik de twee bestaande testaccounts uit de vorige ronde:
`e2e-consultant@orbit-test.nl` (beheerder) en `e2e-klant@orbit-test.nl` (klant). Weet je het
wachtwoord niet, zet het dan opnieuw via Supabase en zeg dat in je verslag. Je hebt ze allebei
nodig: half de test bestaat uit de vraag of de klant precies ziet wat hij mag zien.

**Bedien de app echt in een browser.** Chromium en Playwright staan klaar in deze omgeving
(`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`, niets installeren). Klik de schermen door, maak
screenshots van elk scherm dat je beoordeelt, en kijk zowel op een breed scherm als op 390 pixels
breed. Een API-aanroep is bewijs voor de bedrading, geen bewijs voor het product. Lukt browserwerk
op een scherm niet, zeg dan bij die stap dat je hem via de API hebt gecontroleerd, zodat de eigenaar
weet wat niet met eigen ogen gezien is.

---

## Wat je NIET doet

1. **Raak geen data van echte klanten aan.** Werk uitsluitend met het merk dat je zelf aanmaakt en
   met de twee testaccounts.
2. **Publiceer niets op de website van een ander.** De publicatiestap in de app is het invullen van
   een adres; je zet geen tekst op een site die niet van ons is.
3. **Verstuur geen mail naar een echt bedrijf.** `EMAILS_ENABLED` blijft zoals hij staat.
4. **Verwijder aan het eind niets op eigen initiatief.** Zet in je verslag wat er is blijven staan
   en vraag wat weg mag.
5. **Verzin geen antwoorden alsof ze feiten zijn.** Vul je tijdens het gesprek zelf iets in over een
   bedrijf dat je niet kent, zet er dan bij dat het verzonnen is, zoals in de vorige ronde is
   gedaan. Die antwoorden blijven in de database staan.

---

## Het merk dat je kiest

**Neem een ander merk dan Wouter Warmtepomp.** Dat profiel draagt de geschiedenis van de vorige test
en bewijst niets meer over een verse klant. Kies een echt, klein Nederlands bedrijf uit een andere
branche, met een site van enkele tientallen pagina's en met minstens één pagina die over een
duidelijk onderwerp gaat. Die laatste eis telt: zonder zo'n pagina kun je stap 8 niet doen, want dan
is er niets te verbeteren.

Zet in je verslag welk merk het is en dat het geen klant is.

---

## De negen stappen, en wat je per stap controleert

Bij elke stap horen drie vragen, en die stel je overal:

- **Klopt het gedrag?** Doet de app wat het scherm belooft?
- **Klopt het cijfer?** Reken elk getal dat je op een scherm ziet na tegen de database. Een cijfer
  dat niemand narekent is een bewering.
- **Klopt de tekst?** Nederlands, begrijpelijk zonder techniek, geen gedachtestreepjes, geen
  "en/of", geen "punt(en)", geen modelnaam of bedrag op een scherm waar de klant meekijkt.

### 1. Inloggen en het merk aanmaken

Log in als beheerder en maak het merk aan met de drie velden. Let op:

- Wat gebeurt er bij een adres zonder `https://`, bij een site die niet bestaat, bij een naam met
  een rare tekens erin? Een foutmelding hoort te zeggen wat je moet doen.
- Start de pijplijn meteen, en zie je op het scherm de acht stappen binnenkomen?
- Ververs de pagina halverwege, sluit hem, kom terug. Loopt hij door?
- Klik twee keer snel op de startknop. Ontstaan er twee merken of twee pijplijnen?

### 2. De onderzoekspijplijn van ongeveer 7,5 minuut

- Controleer in de takentabel dat alle acht taken slaagden. Faalt er één, zoek dan uit waarom en
  kijk in de Vercel-logboeken mee.
- Kwam er uit elke stap iets bruikbaars? Een stap die niets vindt hoort dat te zeggen op het scherm,
  met een waarschuwing en niet met een groen vinkje.
- Reken de kosten na in `ai_calls` voor dit profiel en leg ze naast de ~$0,25 uit de documentatie.
- Kijk naar de aanbodboom, de core topics en de kennistest met de ogen van de ondernemer. Klopt het
  wat er staat, en is het te begrijpen?
- Controleer de gecrawlde pagina's: staat er echte tekst in of vooral het navigatiemenu? Dat laatste
  is een bekend punt, zie het logboek van 2 september. Dit is de plek waar het gemeten kan worden.

### 3. Het gesprek, de onboardingsessie

- Loop de zes blokken langs. Vul minstens vijf velden, en klik telkens weg om te zien of het
  opslaan per veld echt werkt. Zet er één op "niet van toepassing".
- Vul een contextfactor met een plaatsnaam in en controleer wat er in `service_regions` belandt. In
  de vorige ronde belandde daar een hele zin. Dat hoort nu niet meer te kunnen.
- Beantwoord één openstaande vraag met een claim zonder onderbouwing ("wij zijn de snelste van de
  regio"). De app hoort uit te leggen wat eraan mist.
- Druk op "onderzoek bijwerken". Klopt de kostenschatting vooraf, gaat alleen dat opnieuw wat door
  het gesprek veranderd is, en blijft staan wat jij hebt ingevuld?

### 4. Overdragen aan de klant

- Stuur de uitnodiging, accepteer hem in een apart browserprofiel als het klantaccount, wijs het
  merk toe.
- Log in als klant en probeer de interne schermen te bereiken door het adres te raden: het
  beheerscherm, de onboardingsessie, de 0-meting, de Sales-module. Elk daarvan hoort "pagina bestaat
  niet" of een 403 te geven, en dat moet in de API zitten en niet alleen in het menu.
- Probeer als klant een handeling die geld kost. Wordt hij geweigerd, en zegt de melding waarom?
- Kijk als klant naar zijn overzicht en zijn merkdossier. Staat er ergens een bedrag, een modelnaam,
  een taaknaam of een technische foutmelding? Dat hoort er niet te staan.

### 5. De analyse opstellen, tot aan de poort

- Stel als klant een analyse op voor één onderwerp uit zijn eigen aanbod.
- Lees de 30 vragen woord voor woord. Zou een klant deze vragen echt typen? Staat de merknaam er
  niet in? Zijn ze niet allemaal hetzelfde? Klopt de verdeling over de funnelfases?
- Bewerk een vraag, verwijder er een, voeg er een toe. Blijft het aantal kloppen en klopt de
  kostenschatting daarna nog?
- Controleer dat er tot hier geen meetkosten zijn gemaakt.

### 6. De meting en het rapport

Bevestig de meting. Dit is de dure stap, ongeveer $0,86.

- Volg de taken. Faalt er een vraag, wordt hij dan opnieuw geprobeerd, en telt hij mee of niet?
- **Reken de score met de hand na.** Pak één merk, tel in de opgeslagen antwoorden hoe vaak het
  genoemd wordt, en leg dat naast het cijfer op het scherm. Klopt de noemer? Tellen antwoorden
  waarin niemand genoemd wordt apart, zoals de documentatie belooft?
- Klik het bewijs door bij drie vragen: kom je uit bij de vraag, het volledige antwoord, de bronnen
  en de datum?
- Lees het rapport als de ondernemer. Klopt elk getal in de tekst met de meting, ook het aantal
  vragen en het aantal metingen? Dat was in de vorige ronde fout.
- Kijk naar de concurrentievergelijking: worden schrijfwijzen van dezelfde naam samengenomen?

### 7. Een nieuwe pagina laten schrijven

Kies een aanbeveling waarvoor een nieuwe pagina nodig is.

- Loop de briefing door. Zijn de feitenvragen echt over deze pagina, of zijn het clustervragen die
  ook bij vier andere pagina's passen? Krijgt een pagina met een dunne feitendekking wel vragen?
- Beantwoord de vragen en laat de pagina schrijven. Meet hoe lang het duurt van de knop tot de
  klaarmelding, en verdeel dat over wachten in de wachtrij en werken van het model.
- Lees de pagina helemaal. Vier vragen: is elke bewering over het bedrijf herleidbaar tot een
  bevestigd feit, leest hij als een pagina en niet als een lijst zinnen, staat er geen zin in over
  "de beschikbare informatie" of "de bestaande pagina", en zou de ondernemer zijn naam eronder
  zetten?
- Kijk naar de scores op het scherm: dekking, GEO-score, kwaliteit. Reken er één na tegen de
  opgeslagen beoordeling. Blijft de pagina op "check nodig" staan, kijk dan of dat terecht is.
- Geef vrij, vul een adres in bij publiceren en kijk wat de app daarna zegt.

### 8. Een bestaande pagina laten verbeteren

Dit is het nieuwste werk in de app en het minst geverifieerd. Kies een aanbeveling met een bestaand
adres eronder.

- Klopt de koppeling met de bestaande pagina? Wijst hij naar de juiste pagina van de klant?
- Werd de echte, verse tekst van die pagina opgehaald, en hoeveel tekens scheelde het schonen van
  het menu? Die logregel staat in de Vercel-logboeken en levert het cijfer dat nog ontbreekt.
- Kijk naar het verbeterplan per onderdeel. Hoeveel onderdelen kregen "staat er al"? In de vorige
  ronde was dat nul van de twintig, en de vraag is of dat bij een dikkere pagina wél gebeurt.
- **De belangrijkste controle:** de nieuwe tekst vervangt de pagina van de klant. Vergelijk beide
  teksten en zoek naar wat de klant kwijtraakt. Verdwijnt er een merknaam, een prijs, een
  productlijst, een adres? Dat is de duurste fout die deze pijplijn kan maken.
- Kijk naar het verschilscherm zelf. Zijn het twee leesbare blokken, "dit verdwijnt" en "dit komt
  ervoor in de plaats", op eigen regels?
- Zoek in de tekst naar zinnen die over de oude pagina gaan in plaats van over het onderwerp.

### 9. Het plan, de bibliotheek en het vervolg

- Bekijk het contentplan. Ligt geen enkele publicatiedatum in het verleden? Klopt de belofte dat
  ORBIT ENGINE tien dagen van tevoren begint?
- Kijk in de werklijst: staat er precies dat wat de klant nu kan doen, en niets wat hij niet kan
  doen? De briefingfase was hier eerder fout.
- Zet de gepubliceerde pagina op een adres en controleer wat de app daarna aankondigt over hermeten.
  Een echte hermeting duurt veertien dagen; controleer in elk geval dat de belofte klopt met wat er
  gepland staat.
- Controleer tot slot de instellingen, de koppelingen en het uitloggen. Ook daar hoort niets stuk te
  zijn.

---

## Onderweg meelopen, niet achteraf

Terwijl je klikt, houd je drie dingen open:

- **De taken.** Faalt er iets stil, dan zie je dat in de takentabel en niet op het scherm.
- **De Vercel-logboeken.** Runtime-fouten en waarschuwingen die niemand op het scherm ziet.
- **De kosten.** Na elke betaalde stap: wat kostte hij echt, en klopt dat met wat het scherm vooraf
  zei?

Draai aan het eind ook de Supabase-adviseurs en zeg wat er uitkomt over rechten en indexen.

---

## Hoe je een bevinding opschrijft

Per bevinding, kort maar volledig:

1. **Wat je deed**, zo precies dat iemand het kan herhalen.
2. **Wat je zag**, met het letterlijke scherm, het cijfer of de foutmelding.
3. **Wat er hoorde te gebeuren**, en waarom.
4. **Waar het zit**, bestand en regel als je het hebt gevonden.
5. **Hoe erg het is:** blokkerend (de klant loopt vast of ziet iets onwaars), hinderlijk (het werkt,
   maar het klopt niet), of een schoonheidsfout.

Zet ze op volgorde van erg naar klein, en zet er de kosten van de hele doorloop bij.

---

## Repareren

Vind je een echte fout, repareer hem op de werklijn van deze sessie, met een test die de fout zou
hebben gevangen, en met de vier controles groen: `npx tsc --noEmit`, `npm run test:unit`,
`npm run test:chain`, `npm run build`. Is het een ontwerpvraag in plaats van een fout, bouw dan
niets en leg hem voor met een voorstel.

**Repareer niet alles onderweg.** Blijf de reis afmaken: een blokkade in stap 4 mag stap 8 niet
kosten. Werk de reparaties op aan het eind, of eerder als een fout de rest van de test tegenhoudt.

---

## Opleveren

1. **Een verslag in het Nederlands**, leesbaar voor de productowner zonder technische kennis, in
   `docs/tasks/bevindingen-live-test-klantreis-<datum>.md`. Per stap: klopte het, en zo niet, wat
   ging er mis. Met de werkelijke kosten en de doorlooptijd per fase.
2. **Wat je gerepareerd hebt**, met de test ernaast.
3. **De documentatie bijgewerkt in dezelfde commit**: een alinea onderaan `docs/logbook.md` met de
   datum en de cijfers die je gemeten hebt, en de stand bovenaan
   `docs/tasks/contentpijplijn-herontwerp.md` en `docs/tasks/paginakeuze-nieuw-of-verbeteren.md` van
   "gebouwd, nog niet geverifieerd" naar wat er nu waar is.
4. **Een opruimlijst**: welk merk, welke accounts en welke rijen er van deze test op productie zijn
   blijven staan, met de vraag wat weg mag.
