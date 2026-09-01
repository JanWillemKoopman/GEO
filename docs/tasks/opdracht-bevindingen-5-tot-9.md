# Opdracht: bevinding 5 tot en met 9 uit de live doorloop

Dit bestand is bedoeld om **letterlijk als opdracht in een nieuwe Claude Code-sessie** geplakt te
worden. Het is zelfdragend: alles wat je nodig hebt staat erin, inclusief de besluiten die al
genomen zijn. Er staan geen open vragen in. Wijk je toch af, zeg dat dan met redenen in plaats van
het stil te doen.

Voorwerk: de eerste live doorloop van de hele klantreis op 31 augustus 2026 leverde tien
bevindingen op. Vier daarvan zijn al opgelost en live geverifieerd. Dit zijn de vijf die overblijven
en die de eigenaar nu wil laten uitvoeren.

---

## 0. Voordat je begint

Lees in deze volgorde:

1. `CLAUDE.md`, de werkinstructie en de tien code-conventies. Alles hieronder gaat ervan uit dat je
   die volgt, in het bijzonder conventie 1 (een promptinstructie is een intentie, code is een
   garantie), conventie 2 (rekenkunde in een pure module zonder `server-only`), conventie 3
   (onbekend is beter dan een verkeerde waarde) en conventie 10 (gebouwd is niet geverifieerd).
2. `docs/tasks/bevindingen-live-test-31-augustus-2026.md`, het volledige verslag van de doorloop.
   De nummers hieronder verwijzen naar de nummering in dat bestand.
3. `docs/schrijfstijl.md` voor elke regel tekst die een klant leest.

**Branch.** Werk op `claude/bevindingen-5-9` en vertak vanaf de actuele `main`. `main` is de
productiebranch; niet rechtstreeks pushen zonder dat de eigenaar dat vraagt.

**De vaste controle vóór elke commit**, alle vier moeten groen zijn:

```bash
npx tsc --noEmit
npm run test:unit      # nu 2606 tests
npm run test:chain     # nu 382 tests
npm run build
```

---

## 1. Leidende principes voor deze ronde

De eigenaar heeft deze drie expliciet meegegeven. Ze gelden bij élke keuze hieronder.

1. **Kwaliteit gaat vóór zuinigheid.** Kost een goede oplossing een extra AI-aanroep of een duurdere
   route, neem die dan, mits het aantoonbaar de uitkomst voor de klant verbetert. Meld wat het per
   ronde extra kost, zodat het naderhand na te rekenen is in `ai_calls`.
2. **De app moet stabiel draaien.** Geen wijziging die een bestaande klant kan laten vastlopen. Elk
   nieuw gedrag krijgt een terugvalpad, en elk bestaand merk moet blijven werken zonder handmatige
   ingreep. Bij twijfel: het bestaande gedrag behouden en het nieuwe alleen laten gelden voor wat er
   ná deze wijziging ontstaat.
3. **Beslis zelf, vraag niet.** De keuzes staan hieronder al gemaakt. Kom je iets tegen waar deze
   opdracht geen antwoord op geeft, kies dan de optie die het minst van de klant vraagt en het meest
   deterministisch is, bouw hem, en benoem hem in je eindverslag.

---

## 2. Punt 5: het contentplan begint in het verleden

### Wat er misging

Het contentplan is op 31 augustus 2026 opgesteld. Alle zeven pagina's van maand 1 kregen
publicatiedatum **28 augustus 2026**, drie dagen eerder. Het scherm belooft er tegelijk bij dat
ORBIT ENGINE tien dagen voor elke publicatiedatum begint met schrijven, en dat moment was dus al
ruim voorbij op het moment dat de klant het plan voor het eerst zag.

### De oorzaak, al opgezocht

`lib/plan-schedule.ts`, `spreadDates()`. De functie doet al het goede voor de lopende maand: de
vroegste bruikbare dag is morgen in plaats van de eerste van de maand (dat was een eerdere
reparatie, zie het commentaar erboven over Gasservice Brabant). Maar er staat een klem overheen:

```ts
const eersteDag = isRunningMonth(startedOn, monthNumber, now)
  ? Math.min(LAATSTE_DAG, now.getDate() + 1)   // LAATSTE_DAG = 28
  : 1;
```

Op 31 augustus wordt `now.getDate() + 1` gelijk aan 32, en `Math.min(28, 32)` klemt dat terug naar
dag 28. Dat is drie dagen in het verleden. Hetzelfde gebeurt bij elk plan dat op de 28e of later
wordt opgesteld, en bij een plan van de 27e komt alles op één hoop op dag 28.

`LAATSTE_DAG` staat op 28 zodat februari geen uitzondering is. Die reden blijft geldig, dus die
constante blijft staan.

### Het besluit

**Een publicatiedatum ligt nooit in het verleden, en nooit op vandaag.** Is er in de lopende maand
geen bruikbare dag meer over, dan blijft maand 1 leeg en beginnen de pagina's in maand 2. Dat is
eerlijker dan een planning die opent met achterstand.

Concreet:

- `spreadDates()` geeft een **lege lijst** terug zodra de vroegste bruikbare dag in de lopende maand
  voorbij `LAATSTE_DAG` valt. Geen klem meer die terugvalt in het verleden.
- De code die het plan opstelt vangt die lege lijst op en zet die pagina's in de eerstvolgende maand
  waar wél ruimte is. Zoek uit waar dat gebeurt (begin bij `lib/plan-backlog-data.ts` en de route
  `app/api/profiles/[id]/plan/route.ts`) en zorg dat een pagina nooit zonder datum in een maand
  achterblijft.
- Het planscherm zegt in dat geval met zoveel woorden waarom maand 1 leeg is, bijvoorbeeld: "Deze
  maand is te ver gevorderd om nog te publiceren, dus je plan begint volgende maand." Eén zin, in de
  huisstijl, geen uitroepteken.

**Daarnaast, en dit is de kwaliteitskeuze:** de belofte "ORBIT ENGINE begint tien dagen voor elke
publicatiedatum met schrijven" klopt niet als een pagina over drie dagen live moet. Laat die zin
zich aanpassen aan wat er werkelijk gebeurt. Zit er minder dan tien dagen tussen vandaag en de
eerste publicatiedatum, dan zegt het scherm dat ORBIT ENGINE begint zodra de maand is vrijgegeven.
Bouw dat als pure functie naast `spreadDates()`, zodat het scherm en de test dezelfde zin lezen.

### Verificatiecriterium

- Unittest: `spreadDates("2026-08-01", 1, 7, new Date("2026-08-31"))` levert een lege lijst op.
- Unittest: op 2026-08-20 levert dezelfde aanroep zeven data op die allemaal ná 2026-08-20 liggen en
  binnen dag 28 vallen.
- Unittest: er komt nooit een datum uit die vóór `now` ligt, voor elke dag van de maand 1 tot en met
  31, bij 1 tot en met 20 pagina's. Draai dat als een lus, niet als drie losse gevallen.
- Live: stel op de testklant een nieuw contentplan op en controleer dat er geen enkele datum in het
  verleden staat.

---

## 3. Punt 6: de uitleg bij een marktclaim blijft weg bij de onboardingvragen

### Wat er misging

Op de vraag "Binnen hoeveel uur wordt normaal gereageerd op een storing?" is geantwoord: *"Wij zijn
de snelste van de regio en reageren sneller dan elke concurrent."* Dat antwoord is **niet** als
vaststaand feit opgeslagen, dus er kan geen tekst mee geschreven worden. Zo hoort het.

Maar de klant zag geen enkele uitleg en kreeg dus ook niet de kans om er een cijfer bij te zetten.
En juist dat cijfer maakt een tekst citeerbaar, wat het hele doel van die vragen is.

### De oorzaak, al opgezocht

`app/api/profiles/[id]/facts/route.ts`. De volgorde klopt niet:

```ts
if (isGapQuestion(fact.raw_json)) return NextResponse.json(updated);   // ← stopt hier
...
const oordeel = beoordeelClaim(answer);
if (!oordeel.aangenomen) {
  return NextResponse.json({ ...updated, needsEvidence: true, evidenceHint: MARKTCLAIM_UITLEG });
}
```

Vragen die uit de synthese komen dragen `raw_json.bron = "synthese-gap"`. In de doorloop waren dat
alle tien de onboardingvragen. Die raken `beoordeelClaim()` dus nooit. Bij een clustervraag uit de
briefing werkt het wél: daar verscheen netjes "Dit klinkt als een claim over de markt of de
concurrentie, geen mededeling over jullie eigen werk."

### Het besluit

**Het oordeel over de claim komt vóór de vertakking, de promotie naar `proof_points` blijft erna.**
Dat zijn twee verschillende dingen die nu per ongeluk aan elkaar hangen:

- *Zie de klant de uitleg?* Ja, altijd, ongeacht waar de vraag vandaan komt.
- *Gaat het antwoord naar `proof_points`?* Nee bij een gapvraag (dat blijft precies zoals het is, en
  de reden staat uitgeschreven in het commentaar bij `isGapQuestion`), en bij de rest alleen als de
  claim wordt aangenomen.

Herschrijf de route zo dat die twee besluiten los van elkaar staan en allebei uit één plek komen.
Laat het commentaar uitleggen waarom ze los staan, met de datum en het voorbeeld erbij.

**De kwaliteitskeuze erbovenop:** de melding is nu een algemene uitleg. Maak hem bruikbaar door te
zeggen wát er ontbreekt. Breid `lib/pipeline/claim-plausibility.ts` uit met een functie die
teruggeeft welk soort onderbouwing mist (een cijfer, een bron, of een voorbeeld) op basis van
hetzelfde woordpatroon dat de claim herkende. Puur en deterministisch, geen AI-aanroep: dit is
precies het soort ding waarvan conventie 1 zegt dat het in code hoort. De klant leest dan
bijvoorbeeld "Noem er een cijfer bij, dan mag deze zin in je teksten" in plaats van een algemene
waarschuwing.

### Verificatiecriterium

- Unittest: een gapvraag met een superlatief levert `needsEvidence: true` op en verandert
  `proof_points` niet.
- Unittest: een gapvraag met een gewoon antwoord levert geen `needsEvidence` op en verandert
  `proof_points` niet.
- Unittest: een clustervraag met een superlatief levert `needsEvidence: true` op en verandert
  `proof_points` niet.
- Unittest: een clustervraag met een gewoon antwoord komt wél in `proof_points`.
- Ketentest in `scripts/test-chain.ts`: dezelfde vier gevallen tegen de echte route en de echte
  database, want dit is samenhang tussen route en tabel en dat is precies waar unittests blind zijn.
- Live: beantwoord op de testklant een openstaande onboardingvraag met een superlatief en
  controleer dat de uitleg op het scherm verschijnt.

---

## 4. Punt 7: de verhoudingszin klopt niet zodra een van beide getallen 1 is

### Wat er misging

`lib/pipeline/recommendation.ts`, `describeActionRatio()`. De functie vangt twee randgevallen af
(alleen nieuw, alleen verbeteren) en laat het derde lopen. Bij precies één aan een kant staat er:

> 1 van de 6 aanbevelingen **zijn** nieuwe pagina's, de andere 5 verbeteren een bestaande pagina.

Twee fouten in één zin: "1 ... zijn" hoort "is" te zijn, en bij één verbetering wordt het "de andere
**1 verbeteren**". De zin klopt alleen als er aan beide kanten minstens twee staan. In de doorloop
was het toevallig 2 en 5, dus hij viel niet op.

### Het besluit

Herschrijf de functie zodat **alle vier de combinaties** goed lopen: veel/veel, één/veel, veel/één
en één/één. Gebruik daarvoor een klein, puur hulpstuk voor enkelvoud en meervoud in plaats van vier
losse takken met geplakte zinnen; dat is de vorm die bij de volgende wijziging niet opnieuw omvalt.

Let op de telwoorden: "1 van de 6" leest slechter dan "Eén van de zes". Kies in deze zin voor
uitgeschreven telwoorden tot en met twaalf, zoals `docs/schrijfstijl.md` voorschrijft, en cijfers
daarboven.

### Verificatiecriterium

Unittest met alle combinaties van nieuw en verbeteren van 0 tot en met 3, plus 1 op 7 en 7 op 1.
Elke uitkomst moet een lopende Nederlandse zin zijn. Controleer expliciet dat er nergens "1 ... zijn"
of "de andere 1 verbeteren" in voorkomt.

---

## 5. Punt 8: de vooruitblik van de beheerdersknop is niet afgeschermd

### Wat er misging

`app/api/profiles/[id]/topics/refresh/route.ts`. De `POST` is correct op slot: het klantaccount
kreeg netjes 403 met de melding uit `COST_DENIED.clusters_aanvullen`, en de knop staat niet op zijn
scherm. De `GET` ernaast controleert alleen eigendom en niet de beheerdersrol. Het klantaccount
kreeg gewoon antwoord:

```json
{"aanraden":true,"melding":"Dit is de eerste aanvullende ronde voor dit merk.","geschatteKostenUsd":0.02}
```

Dat kost niets, dus het is geen uitgavelek. Het is wel de regie-informatie die volgens werkpakket A
§3.5 van `docs/optimalisatielab-orbit-engine.md` bij de beheerder hoort te blijven.

### Het besluit

Zet dezelfde controle op de `GET` als op de `POST`: `mayTriggerCost(user.id, "clusters_aanvullen")`,
en bij weigering een 403 met exact dezelfde melding. Eén regel, en de twee helften van dezelfde knop
zijn dan niet meer verschillend afgeschermd.

**Dit is veilig, al nagetrokken:** `TopicRefreshButton` is de enige aanroeper van die `GET`
(`app/(app)/merk/[id]/_components/topic-refresh-button.tsx`, regel 32), en die component wordt
alleen gerenderd als `staff` waar is (`topics-panel.tsx`, regel 498). Een klant komt er dus nooit
langs en ziet geen foutmelding.

**De kwaliteitskeuze erbovenop:** voeg een unittest toe die de bron van beide routehelften leest en
eist dat elke exportfunctie in dat bestand `mayTriggerCost` aanroept. Dat is hetzelfde patroon dat
bij punt 1 van de vorige ronde is gebruikt voor `ContentStatus`, en het vangt de volgende helft die
iemand erbij zet.

### Verificatiecriterium

- Live: roep de `GET` aan met het klantaccount en controleer dat er een 403 uitkomt met dezelfde
  tekst als bij de `POST`.
- Live: roep hem aan met het beheerdersaccount en controleer dat de vooruitblik gewoon werkt.
- Live: open de clusterpagina als beheerder en controleer dat de knop nog steeds zijn kostenindicatie
  toont, dus dat de afscherming niets kapot maakte.

---

## 6. Punt 9: twee schrijffouten in klanttekst

### Wat er misging

1. `app/(app)/analyses/[id]/briefing/briefing-form.tsx`, regel 228: op het briefingscherm staat
   letterlijk **"en nog 6 punt(en)"**. Die haakjesvorm hoort niet in klanttekst.
2. Op het scherm "Verdeling aanpassen" staat in één zin **"ongeveer $1.70 per maand"** met een punt,
   naast **"±10,7 punten"** met een komma. Twee schrijfwijzen voor een getal in dezelfde zin.

### Het besluit

**Voor de eerste:** los het enkelvoud en meervoud echt op, net als bij punt 7. Er staat elders in
de app al vaker een keuze tussen "punt" en "punten"; maak er één pure hulpfunctie van als die er nog
niet is, en gebruik hem overal. Grep op `(en)` en op andere haakjesmeervouden en ruim ze in dezelfde
ronde op; het is dezelfde fout op meerdere plekken.

**Voor de tweede:** bedragen krijgen de Nederlandse schrijfwijze, dus een komma als decimaalteken.
De functie `euro()` in `lib/prompt-mix.ts` (regel 174) is de bron van die zin. Verplaats hem naar
`lib/format.ts` naast `formatNumber()`, geef hem een naam die klopt met wat hij doet (hij toont
dollars, geen euro's) en laat hem "$1,70" opleveren. Zoek daarna álle plekken waar een bedrag naar
een scherm gaat en laat ze door diezelfde functie lopen. Begin bij:

- `lib/prompt-mix.ts`, `describeMix()` en de weigeringsmelding bij `MAX_TOTAL`
- `lib/pipeline/onboarding-refresh.ts`, regel 173
- de kostenindicatie bij "Stel nieuwe clusters voor"

**Let op, dit breekt bestaande tests.** `scripts/test-unit.ts` controleert op regel 7631 en 7639 de
letterlijke teksten `$0.72` en `$1.44`. Die horen mee te veranderen naar de nieuwe schrijfwijze. Dat
is geen test die je omzeilt maar een test die je bijwerkt, en de wijziging is precies waarvoor hij
er staat.

**Wat NIET verandert:** bedragen in logregels en in `console.warn` blijven zoals ze zijn. Die zijn
voor jou en niet voor de klant, en daar is een punt gebruikelijker.

### Verificatiecriterium

- Unittest: de bedragfunctie levert "$1,70" op, en "$0,72" bij 30 vragen.
- Unittest: er staat nergens meer een haakjesmeervoud in klanttekst. Doe dat als broncodetest over
  `app/(app)` en `lib/`, met een korte lijst uitzonderingen als die echt nodig blijkt.
- Live: open het scherm "Verdeling aanpassen" en controleer dat bedrag en marge dezelfde
  schrijfwijze hebben.

---

## 7. De testomgeving die al voor je klaarstaat

De eigenaar wil dat deze accounts en merken **blijven staan** voor toekomstige tests. Ruim ze niet
op en maak geen nieuwe aan als deze volstaan.

| Wat | Waarde |
|---|---|
| Live app | `https://geo-ten-blush.vercel.app` |
| Beheerdersaccount | `e2e-consultant@orbit-test.nl` |
| Klantaccount | `e2e-klant@orbit-test.nl` |
| Wachtwoord (beide) | `OrbitE2E!2026-test` |
| Testmerk | Wouter Warmtepomp, profiel `b3d74993-8940-497d-a7fe-26973d921dda` |
| Cluster met meting en rapport | `291ae457-f5aa-4cc8-9ccd-9139898ac2f8` |
| Klantaccount-id | `cf3567db-25ca-4063-b3e3-6504836f99b1` |
| Tweede testmerk (fictief, alleen onboarding) | `a1d095a9-acf8-4a55-b8e3-c6930a0ccad0` |
| Supabase-project | `kosauqzjbpweluiqgmwv` (GEO) |

**Stand van dat merk op 31 augustus 2026:** pakket 20 pagina's per maand, contentplan op tempo 10,
2 pagina's ingepland en 5 in de voorraad, 30 openstaande klantvragen, 1 contentitem in de
briefingfase, en een rapport met 8 aanbevelingen en 4 afgevallen kansen.

⚠️ **Wouter Warmtepomp is een echt bestaand bedrijf dat geen klant is.** Het strategisch gesprek en
een paar klantantwoorden zijn door de vorige tester verzonnen om de keten te kunnen testen.
Behandel ze niet als feiten over dat bedrijf, verstuur er niets over naar buiten, en gebruik het merk
alleen binnen deze omgeving.

### Hoe je de app bedient

De app draait achter een agent-proxy en Chromium heeft daar één eigenaardigheid bij. Zonder deze
vlag krijg je `ERR_CONNECTION_RESET` en denk je ten onrechte dat de site plat ligt:

```js
import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  proxy: { server: process.env.HTTPS_PROXY },
  args: ['--ssl-version-max=tls1.2'],   // ⚠️ zonder dit werkt de verbinding niet
});
```

Inloggen gaat via `/login` met een gewoon e-mail- en wachtwoordveld. Bewaar daarna
`context.storageState()` in een bestand, dan hoef je maar één keer in te loggen per account.

Een API-route aanroepen mét sessie doe je het makkelijkst door in de pagina te evalueren:

```js
await page.evaluate(() => fetch('/api/...', { method: 'POST', ... }).then(r => r.text()));
```

### Hoe het werk op de achtergrond loopt

De wachtrij wordt elke minuut afgewerkt door een pg_cron-taak in Supabase die
`/api/cron/worker` aanroept. Je hoeft niets te starten en niets te porren: taken lopen vanzelf.
Volgen doe je met een query op `public.jobs`. Let op dat je de klok van de database gebruikt
(`now()`) en niet je eigen gevoel voor verstreken tijd; dat leidde de vorige sessie bijna tot een
verkeerde conclusie over een vastgelopen taak.

---

## 8. Wat je oplevert

1. **Code**, op de branch, met per wijziging commentaar dat het waaróm uitlegt met het cijfer of het
   voorbeeld erbij. Dat is de huisstijl van dit project, zie de bestaande bestanden.
2. **Tests**, zoals per punt hierboven beschreven. Een wijziging die de uitkomst beïnvloedt krijgt
   een unittest; een wijziging in de samenhang tussen route en database krijgt een ketentest.
3. **Live nagelopen**, want gebouwd is niet geverifieerd. De branchpreview zit achter een
   Vercel-login waar je niet in komt, dus vraag de eigenaar om akkoord voordat je naar `main` duwt,
   en controleer het daarna op `https://geo-ten-blush.vercel.app` met de accounts hierboven.
4. **Documentatie in dezelfde ronde**:
   - `docs/tasks/bevindingen-live-test-31-augustus-2026.md`: zet per punt wat er opgelost is, in
     dezelfde vorm als bij de eerder opgeloste punten.
   - `docs/logbook.md`: één alinea onderaan, met datum en met de cijfers die de keuze droegen.
   - `docs/architecture.md` alleen als het gedrag van de code verandert, en werk dan de peildatum
     bovenaan bij.
5. **Een verslag in het Nederlands**, te volgen zonder technische kennis, dat per punt zegt wat er
   nu anders is voor de klant en wat dat betekent. Geen gedachtestreepjes, geen schuine streep
   tussen woorden, en zeg het als iets niet gelukt is in plaats van het weg te schrijven.

---

## 9. Wat je NIET doet

- **Geen migratie** tenzij je aantoont dat het echt niet zonder kan. Geen van deze vijf punten raakt
  het datamodel.
- **De testaccounts en testmerken blijven staan.** Ze zijn er voor toekomstige tests.
- **Niets aanraken van de andere merken** in de database. Er staan echte klanten tussen.
- **Punt 10, 11 en 12 uit de optimalisatielijst laat je liggen** (de meetsuggestie op de startknop,
  de verzadigingsregel en een tweede meetronde bij een ander merk). Die vragen een apart besluit van
  de eigenaar over meetkosten en horen niet in deze ronde.
- **Geen dure meetronde starten.** Een rapport herdraaien mag (dat kost ongeveer een cent en is de
  manier om punt 5 en 7 live te zien), een volledige meting starten niet.
