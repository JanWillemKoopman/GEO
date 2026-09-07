# De journey van cluster tot geschreven pagina vereenvoudigen

Vervolg op de Teamsessie van 7 september 2026 (zie `docs/logbook.md`, alinea van die datum met
kop "de knop 'schrijf hem algemeen'..." en de teamsessie-uitkomst erna). Dit document is het
uitvoeringsplan; de teamsessie zelf staat niet apart opgeslagen, de aanbevelingen hieronder zijn
eruit overgenomen.

## Waarom dit document bestaat

Vijf experts (UX, Product, Engineering, AI, Growth) onderzochten onafhankelijk de flow van
`/merk/[id]/strategie/clusters` tot een gepubliceerde pagina in de Bibliotheek, gevolgd door een
Devil's Advocate-ronde die elke bevinding zelf natrok in de code. Kernbeeld: de klant ervaart één
doorlopende taak ("laat ORBIT ENGINE deze pagina schrijven"), maar de app bouwt hem telkens opnieuw
als een nieuw scherm met een nieuwe naam en, bij de feitenvragen, een nieuwe datalaag.

## Status

| # | Wat | Prioriteit | Status |
|---|---|---|---|
| 1 | `GenerateAllButton` beweert te schrijven terwijl hij alleen de briefing inplant | P0 (bug, tijdens uitvoering ontdekt) | Gedaan |
| 2 | Eén taalgebruik voor de hele stap, op elke knop en kop | P0 | Gedaan |
| 3 | `/briefing` licht geen tabblad op in de buitenste navigatie | P1 | Gedaan |
| 4 | Voortgangsbalk op het briefingscherm toont ook de paginastand | P1 | Gedaan |
| 5 | De briefing hergebruikt `FactRequests` in plaats van zijn eigen mapper | P0 | **Nog niet gedaan**, zie hieronder |
| 6 | Klikken op één aanbeveling opent een briefingscherm met alle wachtende pagina's | P2 | Niet opgepakt, ontbrekende meting |

## Wat er per punt is gedaan

**1. `GenerateAllButton` loog over wat er gebeurde.** `generate-all/route.ts` regel 74-83 stuurt
altijd `{ briefing: true, ... }` terug: de route plant nooit meteen een schrijfronde in, hij zet de
batch klaar voor de briefing (`planContentBriefing`, per `contentbriefing.md` §2, want drie keer
dezelfde vraag beantwoorden bij drie losse pagina's is precies de wrijving die `README.md` §2
verbiedt). `GenerateAllButton` las dat veld nooit: elke geslaagde aanroep viel in de
`state === "queued"`-tak, die "ORBIT ENGINE schrijft N pagina's" toont met een pulserend live-bolletje
en een link naar de bibliotheek. Dat is precies de klacht waarmee deze sessie begon, alleen dan voor
de knop "alles" in plaats van voor één pagina: de klant klikt, ziet "schrijft", en er gebeurt niets
totdat hij zelf de briefing invult. `generate-button.tsx` had deze tak (`state === "briefing"`) al
wél; `generate-all-button.tsx` kreeg hem nu ook.

**2. Eén taalgebruik.** Vijf plekken gebruikten vijf woorden voor dezelfde stap: "Start het
onderzoek voor deze pagina", "Laat ORBIT ENGINE alles schrijven", "Briefing invullen", "Schrijf mijn
pagina's", "Beantwoord de vragen", "Wacht op jouw input". Nu consequent: **voorbereiden** (de
feitenkaart en vragen klaarzetten, nog geen tekst), **vragen beantwoorden** (de klant vult aan),
**schrijven** (de echte, betaalde AI-ronde). Zie de aangepaste bestanden hieronder.

**3. Tabblad.** `AnalysisNav` in `tabs.tsx` markeerde `/briefing` nergens: `onDossier` en `onLibrary`
waren daar allebei onwaar. De briefing hoort bij het voorbereiden van pagina's in dit cluster, dus
"Cluster" blijft nu actief op elke route die met `/analyses/[id]` begint en niet expliciet
Bibliotheek of Instellingen is.

**4. Voortgangsbalk.** De balk op het briefingscherm telde alleen beantwoorde vragen, los van het
oordeel van de schrijfpoort (`inputpoort()` in `lib/content-input-gate.ts`). Een klant kon op 100%
staan en alsnog een geblokkeerde pagina hebben. Elke paginakaart in `PaginaStanden` had dat oordeel
al (`pagina.stand`); nu telt de kop van het scherm ook hoeveel pagina's al mogen (`stand !==
"tegenhouden"`) naast het aantal beantwoorde vragen, zodat "alles beantwoord" en "alles kan
geschreven worden" niet meer twee verschillende, onzichtbare tellingen zijn.

## Wat bewust nog niet is gedaan

**5. De briefing hergebruikt `FactRequests` nog niet.** Dit is de grootste en risicovolste
aanbeveling uit de teamsessie, en zowel Engineering als de Devil's Advocate wezen op hetzelfde: dit
is geen route-verplaatsing maar een datamodel-fusie. `briefing-form.tsx` heeft een eigen
`BriefingQuestionView` met velden die `FactRequests` niet kent (`answerType`, `options`,
`suggestedAnswer`, `affects`, groepering op `kind`), en `FactRequests` filtert weer niet op
`content_piece_ids` zoals de briefing dat wél moet doen (anders lekken feiten van
niet-geselecteerde pagina's mee, het risico dat de Devil's Advocate expliciet noemde). Dit in één
sessie "er even bij doen" naast de vier punten hierboven is precies het soort haastwerk waar
`docs/logbook.md` §15 voor waarschuwt. Dit blijft als open punt in dit document staan tot het apart
wordt opgepakt: eerst een gedeeld datamodel voor een feitenvraag-met-invoerveld ontwerpen dat alle
drie de schermen (`werk.tsx`, `strategie/vragen/page.tsx`, `briefing-form.tsx`) kunnen gebruiken,
dan pas de briefing daarop overzetten.

**6. Eén klik op één aanbeveling, alle pagina's op het scherm.** Niet opgepakt: de ernst hangt af van
hoe vaak een klant meerdere pagina's tegelijk in status `briefing` heeft staan, en dat is niet
gemeten. Eerst loggen hoe vaak dat voorkomt, dan pas beslissen of het scherm op de aangeklikte
pagina moet filteren.

## Controles

`tsc --noEmit`, `test:unit`, `test:chain` en `build` moeten na elke wijziging groen blijven
(zie de commit(s) bij dit document voor de uitkomst).
