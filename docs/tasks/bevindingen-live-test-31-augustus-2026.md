# Bevindingen live end-to-end test, 31 augustus 2026

> **Stand op 31 augustus 2026:** punt 1, 2, 4 en 8 zijn opgelost, staan met een test in
> `scripts/test-unit.ts`, en zijn daarna op productie nagelopen in de draaiende app
> (conventie 10). Punt 3, 5, 6, 7 en de kleinere punten staan nog open.
>
> Wat de hercontrole liet zien: de briefingkaart zegt nu "De briefing staat klaar" met een knop
> Briefing invullen; de zin "Uitbreiding richting Oosterhout en Geertruidenberg." voegt niets meer
> toe aan het werkgebied terwijl "Made, Etten-Leur" er wel netjes twee plaatsen bij zet en
> "Gilze en Rijen" heel blijft; het pakket is als beheerder te kiezen in de wizard en aan te passen
> bij Toewijzen, een klant krijgt er een 403 op en een maat van 33 een 400; en het herdraaide
> rapport schrijft "Er zijn 30 vragen onderzocht, samen 46 keer gemeten" in plaats van de eerdere
> 15. Dat herdraaide rapport leverde bovendien 8 aanbevelingen op waar de eerste ronde er 7 gaf,
> wat punt 10 hieronder deels beantwoordt: 7 is geen verborgen grens.

De volledige klantreis is op productie doorlopen met een echt bedrijf, van merk aanmaken tot en met
de contentbriefing. Dit bestand bevat wat er misging. Wat goed ging staat samengevat in
`docs/logbook.md`.

**Testmerk:** Wouter Warmtepomp (`wouterwarmtepomp.nl`), profiel `b3d74993-8940-497d-a7fe-26973d921dda`,
cluster "Warmtepomp laten installeren in een bestaande woning"
(`291ae457-f5aa-4cc8-9ccd-9139898ac2f8`). Kosten van de hele doorloop: $1,36.

⚠️ **Dit merk hoort bij een echt bestaand bedrijf dat geen klant is.** De antwoorden op de
klantvragen en het strategisch gesprek zijn door de tester verzonnen om de keten te kunnen testen.
Ze staan wel in `profile_strategy` en `fact_requests` op productie. Behandel ze niet als feiten over
dat bedrijf en ruim het merk op zodra deze bevindingen verwerkt zijn. Zie de opruimlijst onderaan.

---

## 1. Een pagina in de briefingfase wordt gepresenteerd alsof de tekst klaarstaat

> **Opgelost op 31 augustus 2026.** `lib/work.ts` heeft een eigen tak voor de status `briefing`: de kaart zegt nu "De briefing staat klaar" en wijst naar het briefingscherm, met de urgentie van een feitenvraag. Een unittest leest de broncode en eist voortaan dat élke waarde uit `ContentStatus` een tak heeft, zodat dezelfde fout niet terugkomt bij de volgende status die erbij komt.

**Waar:** `lib/work.ts`, regel 387 tot 415.

**Wat er gebeurt.** Zodra de klant op "Laat ORBIT ENGINE deze pagina schrijven" klikt, ontstaat er
een rij in `content_pieces` met status `briefing`. Er is dan nog geen letter tekst: de briefing moet
eerst ingevuld worden en pas de knop "Schrijf mijn pagina" zet het schrijven in gang. De werklijst
in hoofdstuk 03 toont die pagina op dat moment als:

> De tekst is klaar om te publiceren. Zolang hij niet op je site staat, beweegt je zichtbaarheid
> niet.

met een knop **Publiceren** ernaast.

**Waarom.** `work.ts` kent maar twee bijzondere gevallen: `published_at` gevuld, en status `draft`.
Alles wat daar niet in valt loopt door naar de tak "klaar of gearchiveerd, nog niet gepubliceerd".
`ContentStatus` (`lib/types/database.ts`, regel 35) heeft vijf waarden, waaronder `briefing`, en die
is bij de invoering van de briefingfase (R5.1) niet aan `work.ts` toegevoegd.

**Gevolg.** De klant krijgt een taak voorgeschoteld die hij niet kan uitvoeren, precies in het
scherm dat bedoeld is om te zeggen wat er zonder hem stilligt. Waargenomen op 31 augustus 2026 met
één pagina in de briefingfase.

---

## 2. Een plaatsnaam uit het gesprek komt als hele zin in het werkgebied terecht

> **Opgelost op 31 augustus 2026.** `regionsFromDescription()` accepteert alleen nog wat er als plaatsnaam uitziet: hooguit vier woorden, elk met een hoofdletter behalve de tussenvoegsels, gesplitst op komma's en niet op "en". Daardoor blijven "Gilze en Rijen" en "Bergen op Zoom" heel en levert de zin uit deze test niets meer op. Het gespreksscherm zegt er nu bij dat je alleen plaatsnamen invult.

**Waar:** `lib/pipeline/context-factors.ts`, `extraRegionsFrom()`, regel 142 tot 147.

**Wat er gebeurt.** Bij het vastleggen van het gesprek is een contextfactor van de soort
`nieuwe_regio` ingevuld met de omschrijving "Uitbreiding richting Oosterhout en Geertruidenberg."
De functie neemt de omschrijving letterlijk over als plaatsnaam. `profiles.service_regions` bevatte
daarna dertien waarden, waarvan de laatste een hele zin met een punt erachter was.

**Gevolg.** `service_regions` is geen administratie: de promptgeneratie plakt die plaatsnamen
letterlijk in de lokale meetvragen, en het aantal regio's stuurt ook `suggestPromptMix()` aan. Een
zin op die plek levert onbruikbare meetvragen op en telt bovendien mee als extra regio, wat de
voorgestelde meting duurder maakt.

**Verzachting.** Het veld is zichtbaar en corrigeerbaar via Merkprofiel, Bewerken. Het gaat dus niet
stil verloren, maar iemand moet het wel opmerken. Tijdens deze test is het handmatig teruggezet naar
de twaalf plaatsen die het onderzoek zelf vond.

---

## 3. De verhoudingszin klopt grammaticaal niet zodra een van beide getallen 1 is

**Waar:** `lib/pipeline/recommendation.ts`, `describeActionRatio()`, regel 183 tot 205.

De functie vangt twee randgevallen af: alleen nieuw, en alleen verbeteren. Beide krijgen een eigen
zin met "De ene aanbeveling". Het derde geval, gemengd met precies één aan een kant, valt in de
laatste tak en levert dit op:

> 1 van de 6 aanbevelingen zijn nieuwe pagina's, de andere 5 verbeteren een bestaande pagina die het
> onderwerp al gedeeltelijk dekt.

Twee fouten in één zin: "1 ... zijn" hoort "is" te zijn, en bij één verbetering wordt het "de andere
1 verbeteren". De zin klopt alleen als er aan beide kanten minstens twee staan. In deze meetronde
was de uitkomst 2 nieuw en 5 verbeteren, dus toevallig goed. Dit is precies het randgeval dat het
testplan noemde.

---

## 4. Het rapport noemt een aantal vragen dat niet klopt

> **Opgelost op 31 augustus 2026.** De schrijfinstructie krijgt het aantal onderzochte vragen expliciet mee, en `correctQuestionCount()` zet achteraf recht wat er alsnog uit komt (`lib/pipeline/report-summary.ts`). Een verhouding als "17 van de 30 vragen" blijft ongemoeid, want dat is geen totaal.

**Waar:** de modelgeschreven samenvatting in `reports.summary`.

De alinea "Wat dit betekent" zei:

> Wouter Warmtepomp wordt in deze eerste meting nog niet genoemd bij de 15 onderzochte vragen. [...]
> De meting bestaat uit 30 antwoorden.

Er stonden 30 vragen in het meetplan en er zijn 46 metingen gedaan over die 30 vragen. Het getal 15
klopt niet, en het spreekt de tweede zin in dezelfde alinea tegen. Volgens conventie 1 hoort hier
een deterministisch vangnet onder: het aantal vragen is te tellen en hoeft niet aan het model
gevraagd te worden.

---

## 5. De uitleg bij een marktclaim blijft weg bij de onboardingvragen

**Waar:** `app/api/profiles/[id]/facts/route.ts`, regel 83 tot 96.

De route stopt bij `isGapQuestion(fact.raw_json)` met een `return` vóór `beoordeelClaim()`. Alle
vragen die uit de synthese komen (`raw_json.bron = "synthese-gap"`, in deze test alle tien
onboardingvragen) raken die controle dus nooit.

**Wat wel goed gaat.** Het antwoord "Wij zijn de snelste van de regio en reageren sneller dan elke
concurrent" is niet in `profiles.proof_points` beland. Dat komt doordat gapvragen sowieso nooit
gepromoveerd worden, niet doordat de claimcontrole hem tegenhield. De uitkomst is dus veilig.

**Wat niet goed gaat.** De klant ziet geen uitleg en krijgt geen uitnodiging om er een cijfer of
voorbeeld bij te zetten. Bij een clustervraag uit de briefing werkt dat wel: daar verscheen netjes
"Dit klinkt als een claim over de markt of de concurrentie, geen mededeling over jullie eigen werk."

---

## 6. Het contentplan zet de eerste maand in het verleden

Het plan is op 31 augustus 2026 opgesteld. Alle zeven pagina's van maand 1 kregen publicatiedatum
28 augustus 2026, drie dagen eerder. Het scherm zegt er tegelijk bij dat ORBIT ENGINE tien dagen
voor elke publicatiedatum begint met schrijven, en dat moment is dan al ruim voorbij.

---

## 7. De preview van "Stel nieuwe clusters voor" is niet afgeschermd

**Waar:** `app/api/profiles/[id]/topics/refresh/route.ts`, de `GET`.

De `POST` is correct op slot: het klantaccount kreeg netjes 403 met de melding uit
`COST_DENIED.clusters_aanvullen`, en de knop staat niet op zijn scherm. De `GET` controleert alleen
eigendom, niet de beheerdersrol. Het klantaccount kreeg dus gewoon antwoord:

> {"aanraden":true,"melding":"Dit is de eerste aanvullende ronde voor dit merk.","geschatteKostenUsd":0.02}

Dat kost niets, dus het is geen uitgavelek. Het is wel de regie-informatie die volgens werkpakket A
§3.5 bij de beheerder hoort te blijven.

---

## 8. Kleinere punten

- **"punt(en)" in de schermtekst.** `app/(app)/analyses/[id]/briefing/briefing-form.tsx`, regel 228:
  "en nog 6 punt(en)". De haakjesvorm hoort niet in klanttekst thuis.
- **Twee schrijfwijzen voor getallen in één zin.** Op het scherm "Verdeling aanpassen" staat
  "ongeveer $1.70 per maand" met een punt, en in dezelfde zin "±10,7 punten" met een komma.
- **Het pakket is nergens te kiezen.** *Opgelost op 31 augustus 2026.* Het contentpakket staat nu
  als verplicht veld naast naam en webadres in de pre-boardingwizard, alleen zichtbaar voor de
  beheerder, en is daarna aan te passen op het scherm Toewijzen. `PATCH /api/accounts/[id]`
  weigert de waarde van een klant met een 403, dus de grens zit niet alleen in de weergave
  (conventie 1). Zie `lib/package-sizes.ts`.
- **Het aantal aanbevelingen kwam opnieuw uit op 7.** *Grotendeels weerlegd op 31 augustus 2026.*
  Bij het herdraaien van hetzelfde rapport op dezelfde 30 metingen kwamen er 8 aanbevelingen en 4
  afgevallen kansen uit, waar de eerste ronde 7 en 6 gaf. Het aantal ligt dus niet vast. Wat nog
  open staat is de vraag of het aantal ook echt meebeweegt met de OMVANG van een merk; daarvoor is
  een tweede merk nodig.
- **De herkomst onderscheidt weinig.** Na het gesprek kregen alle zes onderwerpen
  `origin = 'aanbod_en_gesprek'`, ook "Warmtepomp laten installeren in een bestaande woning", dat
  rechtstreeks uit het aanbod komt. Het label zegt daarmee vooral iets over de ronde waarin een
  onderwerp ontstond, niet over waar het inhoudelijk op steunt.

---

## Wat er van deze test op productie is achtergebleven

Niets hiervan is opgeruimd, conform de opdracht. Zeg wat weg mag, dan ruimt de volgende sessie het op.

| Wat | Waar |
|---|---|
| Merk Wouter Warmtepomp, met meting, rapport, contentplan en briefing | profiel `b3d74993-8940-497d-a7fe-26973d921dda` |
| Merk Van Loon Klimaattechniek, een fictief opwarmmerk zonder meting | profiel `a1d095a9-acf8-4a55-b8e3-c6930a0ccad0` |
| Twee inlogaccounts | `e2e-consultant@orbit-test.nl` (beheerder) en `e2e-klant@orbit-test.nl` |
| Een fictieve bedrijfswebsite | Vercel-project `van-loon-klimaattechniek`, aangemaakt om het opwarmmerk iets te laten uitlezen |
| Verzonnen klantantwoorden over een echt bedrijf | `fact_requests` en `profile_strategy` bij het eerste profiel hierboven |
