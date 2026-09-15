# Zijproject "Solliciteren"

Een eigen app in de codebase van ORBIT ENGINE, opgezet op 14 september 2026 en dezelfde dag gevuld
met zijn functie: een sollicitatieassistent. Op 15 september ging het dossier los van de vacature, werd de
schrijfstijl meetbaar en kwam de feitenkaart erbij. De achtergrond en de gemaakte keuzes staan in `docs/logbook.md`
(14 en 15 september 2026); dit document gaat alleen over wat er nog open staat.

## Wat er staat

| Onderdeel | Waar | Stand |
|---|---|---|
| De assistent | `app/solliciteren/assistent.tsx` en zes onderdelen ernaast | Werkt, nog niet tegen een echte aanroep gedraaid |
| Het dossier | `sollicitatie_documenten` (0096) plus `dossierpaneel.tsx` | Hangt aan de persoon, blijft staan over gesprekken heen |
| De gemeten stem | `lib/solliciteren/stem.ts` plus `stempaneel.tsx` | Meet aan je eigen brieven, toetst elk antwoord terug |
| De feitenkaart | Migratie 0097, `lib/solliciteren/feiten.ts`, `feitenpaneel.tsx` | Spiegel op je dossier, bronzin per feit. Geen gesloten lijst meer |
| De herkomstcontrole | `lib/solliciteren/herkomst.ts` | Zoekt getallen en namen uit de brief op in dossier en vacature |
| Bestanden inlezen | `lib/solliciteren/bestand.ts`, pakket `unpdf` | PDF en tekst, gedraaid op een echte PDF |
| De rekenmodules | `lib/solliciteren/` (modellen, prompt, dossier, feiten, herkomst, stem, cliches, sleutelwoorden, woorden) | Puur en getest, 238 controles in `test-unit.ts` |
| Het schrijven | `app/api/solliciteren/` | Service-role plus eigenaarscontrole, streamt per regel JSON |
| De opslag | Migraties 0095, 0096 en 0097 | Toegepast op productie en nagerekend |
| De inlog | `app/solliciteren/layout.tsx` plus `lib/supabase/middleware.ts` | Werkt, zonder sessie een 307 naar `/login` |
| De ingang | De S rechtsboven, `components/workspace-chrome.tsx` | Werkt, alleen zichtbaar voor een account van ORBIT ENGINE zelf |
| De opmaak | `app/solliciteren/solliciteren.css` | Nagebouwde stijl van LinkedIn, eigen tokens, bewaakt door `scripts/test-unit.ts` |
| De publicatie | Geen eigen inrichting nodig | Gaat mee met elke publicatie van `main` naar Vercel |

## Wat er nog niet is

**1. Eén echte ronde, van uitlezen tot brief** (conventie 10). Er is in de bouwomgeving geen
`OPENAI_API_KEY` geweest, dus er is geen enkele echte aanroep gedaan vanaf dit scherm. Vier dingen
zijn daarmee gebouwd en niet gemeten:

- dat het streamen op Vercel doorkomt zonder dat een tussenliggende laag het antwoord opspaart;
- dat `cost_usd` per bericht klopt tegenover de factuur van OpenAI;
- dat een antwoord op redeneerstand `hoog`, nu de standaard, binnen de 240 seconden van
  `lib/solliciteren/gesprek.ts` blijft;
- **hoeveel van de aangeleverde feiten sneuvelen op hun bronzin**, en **hoe vaak de herkomstcontrole
  na de eerste echte brief nog aanslaat.** Dat tweede is het cijfer dat zegt of de omkering van
  15 september klopte: slaat hij zelden aan, dan schrijft Sol met het volledige dossier inderdaad
  betrouwbaar en was de gesloten lijst onnodig. Slaat hij vaak aan, dan moeten we opnieuw kijken.

Dit is de eerste stap na de eerstvolgende publicatie.

**2. Een oordeel over de brief, naast de controles.** De vier controles onder een antwoord
(standaardzinnen, stem, herkomst, sleutelwoorden) wijzen allemaal aan wat er MIS kan zijn. Niets beoordeelt
of de brief overtuigt. Het hoofdproduct heeft daar een beoordelaarspanel voor
(`docs/tasks/contentpijplijn-herontwerp.md` A5) dat nagemeten de goedkoopste stap van de hele
pijplijn is. Hier zou dat een tweede aanroep zijn na de brief, en dat botst niet met de keuze van
15 september: die ging over het schrijven zelf in één aanroep, niet over wat erna komt. Wel eerst
één echte ronde draaien, anders bouw je een beoordelaar zonder te weten wat hij moet afkeuren.

**3. Onthouden wat werkte.** Per gesprek één veld: geen reactie, uitgenodigd, afgewezen. Na vijftien
brieven weet de app welke drie een uitnodiging opleverden. Het enige punt dat beter wordt naarmate
je het langer gebruikt, en daarom pas zinvol na een paar weken echt gebruik.

**4. Een model erbij, zodra er een naam vaststaat.** De keuzelijst heeft drie modellen met een
geverifieerd tarief. "GPT-6 Astra" en "GPT-5.4 Thinking" uit de oorspronkelijke opdracht staan er
niet in, om de reden die in `lib/solliciteren/modellen.ts` staat. Er een bijzetten kost twee regels:
een regel in die tabel en een tarief in `lib/openai/pricing.ts`. De schermen en de routes veranderen
niet mee.

**5. Een brief uit het gesprek lichten.** Nu kopieer je het hele antwoord, analyse en al. Een knop
die alleen de brief pakt vraagt dat het model zijn brief herkenbaar afbakent, en dat is een
promptafspraak die een vangnet in code nodig heeft (conventie 1). Pas de moeite waard als blijkt dat
het kopiëren in de praktijk stoort.

**6. De nabouw van LinkedIn is op hun publieke ontwerptaal gemaakt.** Vlak, kaarten, knoppen,
invoervelden en maatvoering zijn nagemeten in de browser en kloppen. Wat niet na te meten valt is of
het ook echt hetzelfde is als hun huidige schermen: daar is van hieruit niet in te kijken. Hun
huisletter is bovendien niet vrij te gebruiken, dus er staat de systeemstapel. Wie het dichterbij
wil brengen, moet met een echt scherm ernaast vergelijken.

**7. Word-bestanden en gescande PDF's.** Een PDF en een tekstbestand worden ingelezen, `.docx` niet,
en een gescande PDF is een plaatje waar geen tekst uit komt. Allebei vragen een heel ander soort
pakket. Het scherm zegt in beide gevallen wat er aan de hand is, dus dit is een gemak en geen gemis.

**8. Een eigen adres, als het ooit een losstaande app wordt.** Hij draait nu op hetzelfde domein en
in hetzelfde project bij Vercel. Een eigen domein of een eigen project betekent een eigen inlog, en
daarmee vervalt precies het voordeel waarom hij hier is gezet.

## Grenzen die niet vanzelf blijven bestaan

`scripts/test-unit.ts` bewaakt twee groepen afspraken. Wie ze wil doorbreken, verandert daarmee de
afspraak en hoort dat hier te noteren.

De groep "het zijproject staat los van ORBIT ENGINE, en zit wel achter dezelfde inlog":

1. Geen bestand onder `app/solliciteren/` importeert uit `@/components/`.
2. Elke `var(--)` in het eigen stijlblad begint met `--sol-`.
3. Het eigen stijlblad wordt nergens anders geladen.
4. De middleware beschermt `/solliciteren`, en de layout controleert de inlog en het recht nog eens.

De negen groepen die met "de assistent" beginnen:

5. Elke standaardzin die de systeemprompt bij naam verbiedt, wordt door `cliches.ts` ook echt
   gevonden. Lopen die twee lijsten uit elkaar, dan verbiedt de prompt iets dat niemand nakijkt.
6. `bepaalParameters()` en `resolveTuning()` volgen dezelfde regel van de API: temperatuur mag
   alleen mee zolang de redeneerstand op `none` staat.
7. Elk model in de keuzelijst heeft een tarief in `lib/openai/pricing.ts`.
8. Elke route van het zijproject doet een expliciete eigenaarscontrole, en geen enkel bestand
   eronder raakt een tabel van ORBIT ENGINE aan.
9. Het dossier gaat in de aanroep vóór de vacature. Die volgorde bepaalt of OpenAI het begin van de
   aanroep kan hergebruiken, en dus hoe snel het eerste woord op het scherm staat.
9b. **De feitenkaart is geen gesloten lijst.** Het feitenblok zegt niet dat de rest niet bestaat, er
    staan geen F-nummers in, en de prompt vraagt niet om verwijzingen in de brief. Dat is op
    15 september 2026 bewust teruggedraaid (zie het logboek); het terugzetten zou het beste model
    weer vastzetten op wat de uitleesronde toevallig gevonden heeft.
10. De gemeten stem staat in de systeeminstructie en niet bij het materiaal, en zonder gemeten
    brieven staat er niets over stijl in de prompt.
11. Alleen documenten met soort `brief` leveren de stem; het CV en de projecten leveren de feiten.
