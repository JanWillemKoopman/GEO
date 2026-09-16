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
| 5 | De briefing hergebruikt `FactRequests` in plaats van zijn eigen mapper | P0 | **Half gedaan** (16 september 2026): het gedeelde model staat er, de componenten zijn nog twee. Zie hieronder |
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

**5. De briefing en de vragenlijst delen nu hun model, nog niet hun component.**

Op 16 september 2026 is de eerste helft gedaan, en precies in de volgorde die
hieronder gevraagd werd: eerst het gedeelde model, dan pas de schermen.

Wat er staat: `lib/feitenvraag.ts` legt vast welk invoerveld bij welk
`answer_type` hoort, welke kop bij welke `kind`, en in welke volgorde de soorten
op het scherm komen. `components/antwoordveld.tsx` tekent dat veld. Beide
schermen gebruiken allebei. De volgorde en de kopteksten zijn ongewijzigd
overgenomen uit `briefing-form.tsx`, want die staan al bij klanten op het
scherm.

Wat dat opleverde, en het was meer dan opruimen: `fact-requests.tsx` las
`kind`, `answer_type`, `options`, `suggested_answer` en `required` helemaal
niet. Een ja-of-nee-vraag kreeg op "Openstaande vragen" dus een leeg tekstvak
van drie regels, een vraag met een concept-antwoord toonde die gok niet, en een
vraag waar een kernsectie op wacht zag eruit als elke andere. Dat is geen
opmaakverschil; het bepaalt of iemand een vraag beantwoordt.

Bijvangst van dezelfde ronde: `loadOpenQuestions()` deed `select("*")` en gaf
die rij rechtstreeks als prop aan een clientcomponent, inclusief `raw_json` met
het volledige antwoord van OpenAI erin. Dat is het lek waar herstelplan T8.9
twee andere paden voor repareerde; dit derde pad was gemist. De schoonmaak zit
nu in de loader, zodat elke volgende lezer hem vanzelf krijgt.

**Wat er nog staat.** De twee componenten zelf. `briefing-form.tsx` heeft een
eigen verzendknop die de schrijfronde start, een voortgangsbalk over de
paginastanden en het tegenspraakblok; `fact-requests.tsx` slaat per vraag
meteen op. Die samenvoegen is geen hernoeming maar een gedragswijziging, en de
waarschuwing van de Devil's Advocate geldt nog steeds: `FactRequests` filtert
niet op `content_piece_ids`, dus zonder dat filter lekken feiten van
niet-geselecteerde pagina's mee. Die stap vraagt een doorklik in een draaiende
app en hoort dus apart, niet als staart aan een andere ronde.

**6. Eén klik op één aanbeveling, alle pagina's op het scherm.** Niet opgepakt: de ernst hangt af van
hoe vaak een klant meerdere pagina's tegelijk in status `briefing` heeft staan, en dat is niet
gemeten. Eerst loggen hoe vaak dat voorkomt, dan pas beslissen of het scherm op de aangeklikte
pagina moet filteren.

## Controles

`tsc --noEmit`, `test:unit`, `test:chain` en `build` moeten na elke wijziging groen blijven
(zie de commit(s) bij dit document voor de uitkomst).
