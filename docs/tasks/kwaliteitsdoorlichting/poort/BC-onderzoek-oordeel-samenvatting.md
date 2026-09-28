# Blinde poort, onderzoek merk B (installateur) en C (rijschool), 23 september 2026

| Stap | B oordeel | C oordeel |
|---|---|---|
| S3 merk en markt | met gebreken | met gebreken |
| S4 aanbod | met gebreken ("ventilatie laten schoonmaken" als dienst uit een adviesregel) | met gebreken (losse les € 76 is fout, moet 77 tot 79; theoriecursus als onzeker weggezet) |
| S5 concurrenten | met gebreken (raadt af eigen CO-certificering en 8,1 uit 74 reviews te gebruiken) | met gebreken |
| S6 onderwerpen | **onvoldoende** (herhaalt het menu van de site, zonder plaats of koopvraag; "Waterontharder" als eerste) | met gebreken (automaat als eerste, autisme ontbreekt) |
| S7 AI-kennistest | met gebreken | **onvoldoende** (bij faalangst noemt de AI concurrent Feka, niet opgemerkt) |
| S8 dossier | met gebreken | met gebreken |

## Nagetrokken in wat de app zelf las (`profile_pages`)

**Onterecht (de naslagtekst van de lezer was onvolledig, de app had gelijk):**
- C "werkgebied Best, Geldrop, Helmond, Waalre verzonnen": 4 plaatspagina's op de site (`/rijschool-best/` enzovoort).
- C "stijlvoorbeelden verzonnen": beide zinnen staan in de gelezen pagina's.
- B "Eindhoven staat nergens": in 18 paginatitels.
- B "stijlvoorbeeld verzonnen": de zin staat op 12 pagina's.

**Terecht en nagetrokken:**
- C: "93 procent geslaagd" staat op 3 gelezen pagina's en ontbreekt in merkonderzoek en dossier. Het sterkste bewijs van dit bedrijf valt tussen crawl en dossier weg.
- Alle drie: het dossier telt "herkend bij vijf (A, C) of vier (B) van zes vragen", terwijl meerdere antwoorden zeggen het bedrijf niet te kennen. Systematisch, bij drie van drie merken.
- B: "ventilatiesysteem moet regelmatig worden schoongemaakt" is een advies op de site, geen dienst; de app maakte er een dienst en een onderwerp van.

## Les voor de meting

De eerste twee poorten kregen als naslag mijn eigen, onvolledige kopie van de site. Vier van de
"verzonnen"-oordelen waren daardoor onterecht. Vanaf hier krijgt de lezer als naslag de tekst die de
app zelf las (uit `input_json`), zodat hij de STAP beoordeelt en niet mijn kopie, en elk
"verzonnen"-oordeel wordt nagetrokken voordat het in het verslag komt.
