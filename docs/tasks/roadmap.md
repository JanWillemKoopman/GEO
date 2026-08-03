# Roadmap — wat er nog open staat

Op volgorde. Stand: 1 augustus 2026, alles gemerged op `main`, 416 unittests + 25 ketentests groen,
migraties t/m `0037` toegepast (`0033` gereserveerd, nooit gedraaid).

## Nieuw hoofdspoor: Onboarding 2.0 (~15 d)

Volledige bouwspec: [`onboarding-2.0.md`](./onboarding-2.0.md). Besloten 3 augustus 2026.

Het product gaat van self-serve naar **sales-led**: een consultant zet het profiel klaar, de
pipeline doet het onderzoek (~7 min, ≤ $2,15), en het uur consultancy gaat over strategie. De klant
vult nog drie dingen in — webadres, bedrijfsnaam, andere schrijfwijzen. Daarnaast: 5–8 core topics
als expliciete uitkomst, en Gemini erbij als tweede engine in zowel de kennistest als de meting.

Dit spoor absorbeert twee openstaande punten hieronder: **R6.2** (inventariskwaliteit — wordt fase 0
van de nieuwe pijplijn, migratie `0033` vervalt daarmee) en de helft van **R0.5** (`business_model`
gaat de entiteitclassificatie eindelijk sturen).

Punt 0 hieronder blijft er wél vóór gaan: zonder nagerekende GPT-5.6-kosten is de €2-budgetpoort
gebouwd op een schatting.

## 0. De GPT-5.6-overstap natrekken — vóór alles (~$3, een uur)

De modellen zijn omgezet (`logbook.md` §10) en de vier vaste controles zijn groen, maar er is nog
**geen enkele echte call** op GPT-5.6 gemaakt: alle tests draaien op stubs. Wat nagetrokken moet
worden, in deze volgorde:

1. `npm run test:openai` — verifieert de drie parametercombinaties die de pijplijn verstuurt
   (effort `none` + temperatuur 0, effort `low`, effort `medium` op Sol) plus web_search. Faalt de
   eerste met een unsupported-parameter-fout, dan klopt de aanname in `sampling.ts` niet meer en
   moet `WORK.deterministic`/`WORK.creative` de temperatuur laten vallen. (Het vangnet in
   `structured.ts` vangt dat in productie op, maar dan draait de classificatie op de
   modelstandaard — dat wil je weten, niet ontdekken.)
2. `npm run eval:mention -- --compare` — de classificatie draait nu op een ánder model dan waarop de
   mention-prompt is afgeregeld. Drempel 90%; het script vergelijkt Luna tegen Terra.
3. **Doorlooptijd van één `content_draft` meten.** De effort staat op `medium` en niet op `high`
   omdat één call binnen `TIMEOUT_MS` (100 s) moet passen. Blijkt een pagina ruim binnen de tijd
   klaar, dan is `high` de gratis kwaliteitswinst op de duurste stap van het product.
4. **Kosten narekenen tegen `ai_calls`.** De schatting van ~$0,40 per meetronde (was $0,82) komt
   uit de gepubliceerde tarieven, niet uit gemeten data. Let specifiek op de zoekactie-tokens: die
   worden op een redeneermodel wél als input afgerekend en waren op de oude preview gratis.

## 1. Verificatieronde R8 + S1–S8

Zie `verificatie-r8-s8.md`. ~$2, een halve dag. **Gebouwd is niet geverifieerd**: R8 en S1–S8 zijn
met unittests op de echte gevallen getoetst, maar er is nog geen nieuwe pagina mee geschreven op
productie. Dit blokkeert alles hieronder — er is geen zin in nieuwe rondes op een keten waarvan de
vorige ronde niet is nagerekend.

## 2. De rest van R7 — de meetbasis stabiliseren (~2 d)

R7.1 is gebouwd (`0037`). Wat blijft staan: bij 5 winbare vragen is de score formeel nog een getal,
maar zegt hij niets meer. De tellers `elicit_successes`/`elicit_samples` uit `0037` zijn de invoer
om dat zichtbaar te maken.

Neem meteen de ketentest mee naar de meetkant: de opzet staat er, een scenario toevoegen is nu
goedkoop, en `0037` gaf er twee kolommen bij die zich deterministisch laten toetsen.

## 3. R8.9 opnieuw beoordelen (gericht, geen traject)

Na S1 is de vraag alleen nog wat we doen met een klant als Bol, waarvan de crawl één pagina zonder
bruikbare tekst opleverde. Dat is een gerichte vraag over één klanttype, geen onderzoek van 3–5
dagen zoals oorspronkelijk begroot.

Achterliggend punt: koopgids-content is het verkeerde format voor Bol/Coolblue/HEMA-achtige klanten
zonder productfeed.

## 4. R6.2 en R6.3 (3,5 d)

Volledige bouwspec: [`r6-inventaris-en-bronnen.md`](./r6-inventaris-en-bronnen.md).

- **R6.2 — Inventariskwaliteitspoort.** Bol had 1 pagina in de inventaris, HEMA 40 productpagina's;
  in beide gevallen degradeert het rapport zonder foutmelding. Migratie `0033` staat gereserveerd.
- **R6.3 — Brontype als signaal.** Bij Fysi-Unique zijn 8 van de 10 meest geciteerde bronnen
  homepages — dan is "schrijf een lange blogpagina" waarschijnlijk het verkeerde advies.

## 5. Blijvend uitgesteld: R0 — Fundament (8 d)

Volledige bouwspec per stap: [`r0-fundament.md`](./r0-fundament.md).

Hygiëne die in de praktijk niets blokkeerde; R4 bleek prima te bouwen zonder R0.5. Zes stappen:
`existingUrl`-conventie afdwingen · volumekalibratie normaliseren · clusters bruikbaar maken ·
meetbasis-krimp zichtbaar maken · entiteitclassificatie (bedrijfsmodel + productlijnen) · off-site
repareren of uitzetten.

Eén punt is het onthouden waard: **R0.5 is de reden dat de fabrikanten die Bol verkoopt nog steeds
als concurrent meetellen.** De helft van R0.5 is intussen meegelift op R8.5: de kolom
`business_model` bestaat en wordt gevuld; alleen `classify-entities.ts` gebruikt hem nog niet.

## Losse punten

- `npm run eval:mention` is **nooit gedraaid tegen de gewijzigde mention-prompt**. Vereist een
  API-sleutel. `lib/openai/mention-prompt.ts` omschrijft zichzelf als "de meest load-bearing prompt
  van het hele product" — daar hoort een evaluatie bij.
- De kostencijfers in code-commentaar gaan op sommige plekken nog uit van $0,356 per periode. De
  actuele cijfers staan in `architecture.md` §6: op de GPT-4.1-familie ~$0,82 per ronde en ~$1,06
  met herhalingen; na de overstap naar GPT-5.6 naar schatting ~$0,40 — zie punt 0 hierboven, die
  schatting is nog niet nagerekend.
