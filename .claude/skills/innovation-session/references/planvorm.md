# Planvorm

Het sjabloon voor het bestand dat een Innovatiesessie oplevert. Gebruikt door de skill
`innovation-session`, fase 6.

## Waar het bestand landt

`docs/tasks/innovatie-<onderwerp>.md`, met een korte onderwerpnaam in kleine letters en
koppeltekens. Bijvoorbeeld `docs/tasks/innovatie-effectmeting.md`.

Dat is dezelfde plek als de rest van het openstaande werk, en het valt onder dezelfde afspraak uit
`CLAUDE.md`: **tijdelijk van aard, af is weg, samengevat in `docs/logbook.md`.**

## Waarvoor het geschreven is

Voor Claude Code, in een volgende sessie, zonder dat de innovatiesessie er nog bij zit. Alles wat
alleen in het gesprek stond is dus verloren, en moet in dit bestand staan. De toets: **kan een
ontwikkelaar die er niet bij was hiermee beginnen zonder één vraag te stellen.**

Toch is het Nederlands en leesbaar voor de eigenaar, want hij moet het goedkeuren voordat er
gebouwd wordt. Geen gedachtestreepjes, geen schuine streep tussen woorden, geen verkooppraat.

## Het sjabloon

```markdown
# Innovatie: <naam van het idee>

**Opgesteld:** <datum> · **Uit:** Innovatiesessie over <onderwerp> ·
**Status:** voorstel, nog niet gebouwd

## 1. Wat we bouwen, in vijf regels

<Wat het is, voor wie, en wat er daarna anders is. Zonder techniek. Als deze vijf regels de eigenaar
niet overtuigen, is de rest van het document vergeefs.>

## 2. Waar we vandaan komen

<De nulmeting uit fase 1, ingekort tot wat nodig is om de keuze te begrijpen: hoe werkt het vandaag,
wat is de beperking, en welk eerder besluit uit `docs/logbook.md` raakt dit. Met vindplaats.>

## 3. Wat dit niet is

<De afbakening, en de ideeën uit de sessie die het niet geworden zijn, met in één regel waarom. Dit
blok voorkomt dat de bouw uitdijt en dat een afgevallen idee later opnieuw wordt bedacht.>

## 4. De stappen

Per stap, en de stappen zijn zo klein dat elke stap los af kan zijn:

### Stap 1: <naam>

- **Wat er verandert:** <in één alinea>
- **Bestanden:** <bestaande bestanden die wijzigen, en nieuwe bestanden met hun pad>
- **Migratie:** <nummer en wat hij toevoegt, of "geen">
- **AI-aanroep:** <welke, welk model, welke redeneerinspanning, geschatte kosten, of "geen">
- **Vangnet in code:** <wat er deterministisch afgedwongen wordt, als een model iets bepaalt
  (conventie 1). Anders "niet van toepassing">
- **Tests:** <welke test in `scripts/test-unit.ts`, welk scenario in `scripts/test-chain.ts`>
- **Verificatiecriterium:** <waaraan je op productie of tegen echte data ziet dat het werkt.
  Een criterium dat je alleen in de code kunt aflezen telt niet, zie conventie 10>

### Stap 2: <naam>

<zelfde vorm>

## 5. Wat de eigenaar zelf moet doen

<Alles buiten Claude Code om: een sleutel regelen, een klant vragen mee te doen, een prijs bepalen,
een tekst goedkeuren. Met per regel wanneer het nodig is, want dit is meestal wat de bouw ophoudt.>

## 6. Wat het kost

<Kosten per klant per maand, of per meetronde, met de aanname eronder. Ook de eenmalige bouwkosten
in dagen. Een schatting mag, mits als schatting gelabeld.>

## 7. Wat er stuk kan

<De drie grootste risico's uit de tegenspraakronde, en per risico wat we doen als het zich voordoet.
Ook: welk bestaand gedrag verandert er voor klanten die er nu al zijn.>

## 8. Waaraan we zien dat het gelukt is

<Eén meetbare uitspraak, met de termijn en het aantal klanten erbij. Niet "de klant begrijpt het
beter", wel "bij drie merken staat er binnen twee weken een gepubliceerde pagina zonder dat de
consultant heeft ingegrepen".>

## 9. Wat er in `docs/` bijgewerkt moet worden

<Welke documenten, en welke sectie. Volgens de tabel in `CLAUDE.md`: gedragswijziging naar
`architecture.md` of `ux-design.md`, nieuwe migratie naar `supabase/README.md`, het besluit zelf
onderaan `docs/logbook.md`.>
```

## Drie eisen aan het resultaat

1. **Elke stap heeft een verificatiecriterium dat buiten de code ligt.** Gebouwd is niet
   geverifieerd, dat is conventie 10 en het is de meest overgeslagen regel van het project.
2. **Geen enkele stap leunt alleen op een promptinstructie.** Bepaalt een model iets, dan staat
   erbij welke code het afdwingt.
3. **Het plan noemt wat het niet doet.** Een plan zonder afbakening groeit tijdens de bouw.
