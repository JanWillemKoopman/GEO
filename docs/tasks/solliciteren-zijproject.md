# Zijproject "Solliciteren"

Een eigen app in de codebase van ORBIT ENGINE, opgezet op 14 september 2026 en dezelfde dag gevuld
met zijn functie: een sollicitatieassistent. Op 15 september ging het dossier los van de vacature en
werd de schrijfstijl meetbaar. De achtergrond en de gemaakte keuzes staan in `docs/logbook.md`
(14 en 15 september 2026); dit document gaat alleen over wat er nog open staat.

## Wat er staat

| Onderdeel | Waar | Stand |
|---|---|---|
| De assistent | `app/solliciteren/assistent.tsx` en zes onderdelen ernaast | Werkt, nog niet tegen een echte aanroep gedraaid |
| Het dossier | `sollicitatie_documenten` (0096) plus `dossierpaneel.tsx` | Hangt aan de persoon, blijft staan over gesprekken heen |
| De gemeten stem | `lib/solliciteren/stem.ts` plus `stempaneel.tsx` | Meet aan je eigen brieven, toetst elk antwoord terug |
| Bestanden inlezen | `lib/solliciteren/bestand.ts`, pakket `unpdf` | PDF en tekst, gedraaid op een echte PDF |
| De rekenmodules | `lib/solliciteren/` (modellen, prompt, dossier, stem, cliches, sleutelwoorden, woorden) | Puur en getest, 169 controles in `test-unit.ts` |
| Het schrijven | `app/api/solliciteren/` | Service-role plus eigenaarscontrole, streamt per regel JSON |
| De opslag | Migraties 0095 en 0096 | Toegepast op productie en nagerekend |
| De inlog | `app/solliciteren/layout.tsx` plus `lib/supabase/middleware.ts` | Werkt, zonder sessie een 307 naar `/login` |
| De ingang | De S rechtsboven, `components/workspace-chrome.tsx` | Werkt, alleen zichtbaar voor een account van ORBIT ENGINE zelf |
| De opmaak | `app/solliciteren/solliciteren.css` | Eigen tokens en klassen, bewaakt door `scripts/test-unit.ts` |
| De publicatie | Geen eigen inrichting nodig | Gaat mee met elke publicatie van `main` naar Vercel |

## Wat er nog niet is

**1. Eén echt gesprek, van begin tot eind** (conventie 10). Er is in de bouwomgeving geen
`OPENAI_API_KEY` geweest, dus er is geen enkele echte aanroep gedaan vanaf dit scherm. Drie dingen
zijn daarmee gebouwd en niet gemeten: dat het streamen op Vercel doorkomt zonder dat een
tussenliggende laag het antwoord opspaart, dat `cost_usd` per bericht klopt tegenover de factuur van
OpenAI, en dat een antwoord op redeneerstand `hoog` binnen de 240 seconden van
`lib/solliciteren/gesprek.ts` blijft. Dit is de eerste stap na de eerstvolgende publicatie.

**2. Een feitenkaart van de loopbaan.** Het voorstel dat in september is blijven liggen, en nog
steeds de grootste sprong in kwaliteit: het CV en de projecten eenmalig uitsplitsen naar genummerde
feiten, en elke bewering in de brief laten verwijzen naar een feitnummer dat code kan nakijken.
Precies het patroon van `lib/pipeline/factcard.ts`, `claim-extract.ts` en `validate-claims.ts` in
het hoofdproduct. Gevolg: geen verzonnen jaartal, en de brief wordt concreet in plaats van
bijvoeglijk.

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

**6. Word-bestanden en gescande PDF's.** Een PDF en een tekstbestand worden ingelezen, `.docx` niet,
en een gescande PDF is een plaatje waar geen tekst uit komt. Allebei vragen een heel ander soort
pakket. Het scherm zegt in beide gevallen wat er aan de hand is, dus dit is een gemak en geen gemis.

**7. Een eigen adres, als het ooit een losstaande app wordt.** Hij draait nu op hetzelfde domein en
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
10. De gemeten stem staat in de systeeminstructie en niet bij het materiaal, en zonder gemeten
    brieven staat er niets over stijl in de prompt.
11. Alleen documenten met soort `brief` leveren de stem; het CV en de projecten leveren de feiten.
