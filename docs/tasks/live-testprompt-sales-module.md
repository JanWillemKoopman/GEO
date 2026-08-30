# Prompt voor een live end-to-end test van de Sales-module

Kopieer alles onder de streep in een nieuwe Claude Code sessie die wél toegang heeft tot een echte
`OPENAI_API_KEY` en een echte `SUPABASE_SERVICE_ROLE_KEY`. Deze taak is bewust niet uitvoerbaar in
de sessie waarin hij is geschreven: die had geen credentials en kon dus geen enkele betaalde
aanroep doen.

De module is volledig gebouwd en staat op de werklijn `claude/new-business-sales-tab-status-o97ccf`
(zeven sprints, migraties `0068` tot en met `0074`, alle vier de controles groen). Wat er níet is
gebeurd, is precies wat deze prompt vraagt: één echte markt van begin tot eind.

---

## Opdracht

Je krijgt toestemming om echte, betaalde OpenAI-aanroepen te doen. Er mogen echte kosten gemaakt
worden, dat is bewust. Het doel is één volledige, live doorloop van de GEO Prospect Engine op een
echte markt met echte bedrijven, om te controleren of hij onder echte omstandigheden doet wat hij
belooft. De unit- en ketentests zijn groen, maar die draaien op gestubde AI-antwoorden: ze bewijzen
dat de bedrading klopt, niet dat de uitkomst klopt.

**Lees eerst deze drie dingen, in deze volgorde:**

1. `CLAUDE.md`, voor de projectconventies en de werkwijze.
2. `docs/tasks/geo-prospect-engine.md`, het volledige plan. Hoofdstuk 22 bevat de
   verificatiecriteria per sprint, en dat is waar je op afgerekend wordt.
3. De vier logboekstukken van 29 augustus 2026 onderaan `docs/logbook.md`: wat er gebouwd is en
   welke keuzes eronder liggen.

---

## Stap 0: zorg eerst dat de wachtrij draait

⚠️ **Dit is de valkuil die de hele test stilletjes laat mislukken.** De Sales-module hangt aan de
bestaande taakwachtrij, en die wachtrij staat in dezelfde database als productie. De werker die hem
leegdraait, draait de code van de deployment die hij bedient. Pikt een werker met de code van `main`
een taak op van het type `sales_market_intents`, dan gooit `runJob()` "Onbekende taaksoort" en
faalt de taak na vier pogingen. De keten lijkt dan te hangen terwijl er niets mis is met de code.

Kies dus één van deze twee, en zeg in je verslag welke:

- **Samenvoegen met `main` en daarna live testen.** Dan kent de draaiende werker alle taaksoorten.
  De klant ziet niets van deze module (hij zit achter de salesrol), en de migraties staan al op
  productie, dus dit is een kleinere stap dan hij lijkt. Dit is de route die een echte end-to-end
  test oplevert.
- **Lokaal draaien tegen de productiedatabase**, met een eigen werkerlus die `runJob()` aanroept.
  Houd er dan rekening mee dat een werker op productie dezelfde taken kan oppakken en laten falen.

Controleer voordat je verder gaat dat er een werker loopt die de taak `sales_market_discover`
aankan. Zonder dat komt er niets van de grond.

**Je hebt de salesrol nodig.** Een beheerder (`staff_users`) is automatisch ook sales admin, dus als
je met het beheerdersaccount werkt hoef je niets in te stellen. Werk je met een ander account, zet
er dan een rij voor in `sales_users` via het Supabase-dashboard: die tabel heeft bewust nul
leesregels en is niet vanuit de app te vullen.

---

## Wat je NIET doet

Deze module gaat over echte bedrijven die er niet om gevraagd hebben. Vier grenzen, en ze zijn hard:

1. **Verstuur geen enkele mail naar een prospect.** De app kan het niet en jij doet het ook niet.
   De test eindigt bij "concept gelezen en beoordeeld". Zet de stand desnoods op `gemaild` om de
   werkstroom te toetsen, maar er gaat niets de deur uit.
2. **Publiceer geen openbare marktpagina zonder expliciete toestemming** van de eigenaar
   (Jan Willem). Het rapport schrijven mag wel: dat is een aparte handeling en de pagina blijft dan
   offline. Publiceer je hem na toestemming toch, haal hem dan na de controle meteen weer weg en
   zeg dat in je verslag.
3. **Raak geen data van bestaande klanten aan.** Werk uitsluitend met de markt die je zelf
   aanmaakt.
4. **Verwijder na afloop niets op eigen initiatief.** Vraag eerst of de testmarkt mag blijven
   staan: hij is straks de basis voor de hermeting uit stap 7.

---

## De markt die je kiest

Neem een echte, lokale markt met genoeg aanbieders om iets over te kunnen zeggen: bijvoorbeeld
makelaars in Eindhoven, het voorbeeld dat het plan zelf gebruikt. Twee dingen om op te letten:

- Minstens acht tot tien bedrijven, anders valt de publicatiedrempel (vijf zichtbare bedrijven) er
  al bijna doorheen en toets je stap 6 niet echt.
- Zit er een bestaande klant van Outer Orbit in die markt, dan hoort de module dat zelf te zien en
  te waarschuwen. Dat is een van de dingen die je juist wilt testen, dus wees daar niet bang voor.

---

## Stappen en wat te controleren

De nummers volgen de sprints uit hoofdstuk 22 van het plan. Het verificatiecriterium staat er per
stap bij; dat is de vraag die je moet beantwoorden.

### 1. De markt aanmaken en ontdekken (sprint 1 en 2)

Maak de markt aan via `/sales/markten` en druk op "Start het onderzoek" (ongeveer 75 cent).

- **Criterium:** New business kijkt naar de gevonden bedrijvenlijst en zegt of hij klopt. Minstens
  80% van de bedrijven die zij zelf kennen zit erin. Vraag dat oordeel echt op bij iemand die de
  markt kent, en schrijf het antwoord op.
- Controleer per bedrijf de zekerheid en de vindplaats. Klik een paar vindplaatsen aan: staat het
  bedrijf daar echt?
- Controleer of platforms en vergelijkingssites eruit gefilterd zijn (Funda hoort geen prospect te
  zijn) en of een bedrijf zonder website er wél in staat. Dat laatste is met opzet: dat is precies
  de prospect die deze module zoekt.
- Zit er een klant van Outer Orbit in de markt, controleer dan dat hij uitgesloten is met de reden
  erbij, en dat de markt een waarschuwing toont.

### 2. Poort 1, de crawl en de vragen (sprint 3)

Keur de bedrijvenlijst goed. Daarna leest ORBIT ENGINE de sites uit, bepaalt de intenties en
schrijft de vragen. Dat kost samen ongeveer 25 cent.

- Controleer dat elke intentie minstens vijf vragen kreeg. Onder dat aantal kan er niets over een
  intentie gezegd worden, en dan is opportunitytype 3 zinloos.
- **Lees de veertig vragen zelf.** Zijn dit vragen die een klant echt zou typen? Staat er geen
  bedrijfsnaam in (dan meet je of de AI die naam herhaalt)? Zijn ze niet allemaal varianten van
  dezelfde vraag?
- Controleer dat de kostenraming bij poort 2 in de buurt komt van wat het straks werkelijk wordt.

### 3. De meting (sprint 3)

Keur de meting goed. Dit is de dure stap: ongeveer 1,20 euro per AI-assistent bij veertig vragen.

- **Criterium:** de zichtbaarheidscijfers zijn met de hand na te rekenen uit de opgeslagen
  antwoorden. Doe dat ook echt: pak één bedrijf, tel in `sales_answers` hoe vaak het genoemd wordt,
  en leg dat naast `sales_company_scores`. Klopt de noemer (antwoorden, geen vragen)?
- Controleer `sales_answers.unknown_names`: bedrijven die de AI noemde en die niet in onze lijst
  stonden. Zijn dat echte bedrijven die we gemist hebben, of verzint het model namen? Beide zijn
  informatie en horen in je verslag.
- Controleer dat geen enkel niet-genoemd bedrijf een rol heeft gekregen (`sales_mentions`
  waar `mentioned = false` en `mention_role is not null` hoort nul rijen te zijn).
- Draaide er meer dan één engine, controleer dan dat het verschil tussen de engines plausibel is en
  niet het gevolg van een half mislukte meting.

### 4. De kansen (sprint 4)

- **Criterium:** New business beoordeelt de top tien en de bodem tien en is het met minstens acht
  van de tien eens. Elke keer dat zij het oneens zijn is een kalibratiepunt: schrijf op wélk bedrijf
  en waaróm, want dat verandert een gewicht in `lib/sales/opportunity-score.ts`.
- Controleer op het prospectdossier of de opbouw van de score klopt met wat je van het bedrijf ziet.
- Klik het bewijs door: kom je uit bij de vraag, het volledige antwoord, de bronnen en de datum?
- Tel hoeveel kansen er per type zijn. Let vooral op deze twee, want daar zit de meeste twijfel:
  - **Intent gap** verschijnt alleen als een woord uit het intentielabel ook in de gecrawlde
    secties van de site voorkomt. Goed mogelijk dat dit in de praktijk bijna nooit aanslaat. Zo ja,
    zeg dat: dan is de woordvergelijking te streng en moet die slimmer.
  - **Information gap** detecteert alleen het geval "het antwoord zet dit bedrijf in een andere
    plaats". Bewust smal gebouwd. Kijk of je in de antwoorden andere onjuistheden ziet die we nu
    missen, en of het de moeite waard is die alsnog te bouwen.

### 5. De haak en de mail (sprint 5)

Pak één kans op. Dat zet de contactstap en het concept in gang, samen ongeveer 20 cent.

- **Criterium:** een salesmedewerker leest tien conceptmails en zegt van minstens acht: deze zou ik
  versturen. Laat ze echt lezen door iemand die verkoopt.
- Tel in `sales_opportunities` hoe vaak `hook_source` op `model` staat en hoe vaak op `sjabloon`.
  Domineert het sjabloon, dan verwerpt de getallencontrole te veel of stuurt de prompt verkeerd.
  Dat is een bevinding en geen storing, maar hij moet wel op tafel.
- Controleer de gevonden contactpersoon: is dit echt degene die over de commercie gaat, en bestaat
  het mailadres? Kijk of er iemand tussen zit die eruit gefilterd had moeten worden.
- Controleer de belvoorbereiding op de twee cijfers, de drie openingen en het blok "wat je niet moet
  zeggen". Klopt elk getal met de meting?
- Toets de werkstroom: wijs een kans af zonder reden (moet geweigerd worden), en probeer hetzelfde
  bedrijf een tweede keer op te pakken (moet ook geweigerd worden).

### 6. Het publieke rapport (sprint 6)

Laat de tekst schrijven via de knop op het marktscherm (ongeveer 35 cent). **Publiceren alleen na
toestemming.**

- **Criterium:** het rapport staat online, een prospect heeft de link geopend, en er is geen verzoek
  tot verwijdering geweest dat we niet konden honoreren. Dat eerste en tweede vraagt tijd; toets in
  elk geval of de pagina klopt en of verwijderen werkt.
- Lees de tekst als de ondernemer over wie het gaat. Staat er een oordeel in over een bedrijf? Dat
  hoort geweigerd te zijn.
- Controleer `sales_market_reports.bron`: kwam de tekst uit het model of uit het sjabloon?
- Test het verwijderverzoek op één bedrijf en controleer dat hij van de pagina verdwijnt, op
  niet-benaderen komt te staan, en dat een lopende outreach stopt.

### 7. De hermeting (sprint 7)

- **Criterium:** er komen belaanleidingen uit de verandering zelf, en New business bevestigt dat een
  daling een beter gesprek oplevert dan een statische observatie. Een echte hermeting vraagt tijd
  tussen twee rondes; kun je die niet afwachten, draai dan één hermeting direct achter elkaar en
  controleer in elk geval dat:
  - de tweede ronde exact dezelfde vragen stelt, met hetzelfde gewicht;
  - er géén verlies gemeld wordt bij bedrijven die gelijk gebleven zijn (een daling die er niet is,
    is de fout die een verkoper voor schut zet);
  - de kansen van ronde één naar hun opvolger wijzen.

---

## De kosten narekenen

De bedragen in `lib/sales/budget.ts` zijn schattingen: er was nog geen enkele markt gedraaid toen ze
opgeschreven werden. Reken ze na tegen het echte kostenlogboek:

```sql
select kind, count(*) as aanroepen, round(sum(cost_usd)::numeric, 4) as usd
  from public.ai_calls
 where sales_market_id = '<het id van je markt>'
 group by kind order by usd desc;
```

Zit een stap er structureel naast, corrigeer dan `STAP_KOSTEN_USD` en zeg in je verslag wat er
veranderd is. Controleer ook of het plafond van tien euro per markt ruim genoeg is voor veertig
vragen op twee engines, en of het te ruim is.

---

## Opleveren

**Een kort verslag in het Nederlands, leesbaar voor de productowner zonder technische kennis.** Per
stap hierboven: klopte het gedrag, en zo niet, wat ging er mis (met de concrete waarneming en het
bestand, niet alleen "werkt niet"). Zet de werkelijk gemaakte kosten erbij.

Daarnaast drie dingen:

1. **De kalibratiepunten.** Elk oordeel van New business waar de score het niet mee eens was, met
   het bedrijf erbij. Dat is de enige manier waarop de gewichten beter worden.
2. **Wat je gerepareerd hebt.** Vind je een echte fout, repareer hem op dezelfde werklijn, met de
   vier controles groen (`npx tsc --noEmit`, `npm run test:unit`, `npm run test:chain`,
   `npm run build`) en met een test die de fout zou hebben gevangen. Is het een ontwerpvraag in
   plaats van een fout, bouw dan niets en leg hem voor.
3. **De documentatie bijgewerkt**, in dezelfde commit: een alinea onderaan `docs/logbook.md` met de
   datum en de cijfers die je gemeten hebt, en de standregel bovenaan hoofdstuk 22 van
   `docs/tasks/geo-prospect-engine.md` van "gebouwd, nog niet geverifieerd" naar wat er nu waar is.

Pas als die stand klopt, is deze module af. Nu is hij alleen gebouwd.
