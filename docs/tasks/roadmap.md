# Roadmap — wat er nog open staat

Op volgorde. Stand: 1 augustus 2026, alles gemerged op `main`, 384 unittests + 25 ketentests groen,
migraties t/m `0037` toegepast (`0033` gereserveerd, nooit gedraaid).

## 1. Verificatieronde R8 + S1–S8 — eerst

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
  actuele cijfers staan in `architecture.md` §6: ~$0,82 per ronde, ~$1,06 met herhalingen.
