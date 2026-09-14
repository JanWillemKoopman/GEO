# Zijproject "Solliciteren"

Een eigen app van één pagina in de codebase van ORBIT ENGINE, opgezet op 14 september 2026. De
achtergrond en de gemaakte keuzes staan in `docs/logbook.md` (14 september 2026); dit document gaat
alleen over wat er nog open staat.

## Wat er staat

| Onderdeel | Waar | Stand |
|---|---|---|
| De pagina | `app/solliciteren/page.tsx` | Leeg scherm met uitleg, nog geen functie |
| De inlog | `app/solliciteren/layout.tsx` plus `lib/supabase/middleware.ts` | Werkt, zonder sessie een 307 naar `/login` |
| De ingang | De S rechtsboven, `components/workspace-chrome.tsx` | Werkt, alleen zichtbaar voor een account van ORBIT ENGINE zelf |
| De opmaak | `app/solliciteren/solliciteren.css` | Eigen tokens en klassen, bewaakt door `scripts/test-unit.ts` |
| De publicatie | Geen eigen inrichting nodig | Gaat mee met elke publicatie van `main` naar Vercel |

## Wat er nog niet is

**1. De functie.** Er is nog niet besloten wat de pagina moet doen. Zolang dat zo is, staat er op
het scherm dat hij leeg is, en dat hoort zo te blijven totdat er echt iets werkt (`CLAUDE.md`:
schrijf nooit dat iets al kan wat nog niet gebouwd is).

**2. Opslag, als de functie die nodig heeft.** Nu bewaart de pagina niets, en dat is de reden dat er
geen migratie bij hoefde. Zodra er iets onthouden moet worden, gelden de gewone regels: een
additieve migratie, RLS erop, en schrijven via een API-route met een expliciete eigendomscontrole
(conventies 4 en 6). Dat is een besluit van de eigenaar, geen gevolg van deze opzet.

**3. Een eigen adres, als het ooit een losstaande app wordt.** Hij draait nu op hetzelfde domein en
in hetzelfde project bij Vercel. Een eigen domein of een eigen project betekent een eigen inlog, en
daarmee vervalt precies het voordeel waarom hij hier is gezet.

## Grenzen die niet vanzelf blijven bestaan

`scripts/test-unit.ts`, groep "het zijproject staat los van ORBIT ENGINE, en zit wel achter dezelfde
inlog", bewaakt vier dingen. Wie ze wil doorbreken, verandert daarmee de afspraak en hoort dat hier
te noteren:

1. Geen bestand onder `app/solliciteren/` importeert uit `@/components/`.
2. Elke `var(--)` in het eigen stijlblad begint met `--sol-`.
3. Het eigen stijlblad wordt nergens anders geladen.
4. De middleware beschermt `/solliciteren`, en de layout controleert de inlog en het recht nog eens.
