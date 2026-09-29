# Soorten pagina en de zoekresultaten van Google: wat nog openstaat

**Opgesteld:** 29 september 2026. De besluiten staan in `docs/tasks/contentketen-opnieuw.md` §2
(B33, B34, B35), het waarom met de cijfers in `docs/logbook.md` (29 september 2026 (3)). Dit bestand
bevat alleen wat nog moet gebeuren; het verdwijnt als alles hieronder af is.

## 1. Live

Sinds 29 september 2026 op productie (`main`, commit 53e4e84), met `BRIEF_ZOEKRESULTATEN_ENABLED=true`
in Vercel. Een preview heeft de schakelaar niet, en draait dus zonder zoekresultaten.

## 2. De vorm van de respons controleren (conventie 10)

Het AI-overzicht en de statuscode zijn op 20 september 2026 tegen het echte account nagemeten. De
velden van `organic`, `people_also_ask` en `related_searches` in `lib/ai-overview/parse-serp.ts`
komen uit de documentatie van DataForSEO.

Controle na de eerste brief van een artikel, gids, FAQ of vergelijking op productie:

```sql
select raw_json->'pagina' from ai_calls
 where kind = 'pagina_zoekresultaten' order by created_at desc limit 8;
```

Klaar als per zoekopdracht organische resultaten met titel, adres en fragment staan, en bij een
vraag in gewone woorden de vragen van "Andere mensen vroegen ook". Staat er niets terwijl de
aanroep geslaagd is, bewaar dan één ruwe respons als testgeval in `scripts/test-unit.ts` en pas de
module aan.

## 3. Meten of het de tekst beter maakt

Volgens `docs/contentkwaliteit-testmethode.md`: twee artikelen of gidsen met en zonder zoekresultaten
(de schakelaar uit en aan, dezelfde antwoorden van de ondernemer), plus twee dienstpagina's als
controle, die niet mogen veranderen. De maatstaf is publiceerbaarheid (§1 van de contentketen). Valt
het tegen, dan verandert de invoer of de opdracht, en komt er geen stap bij (B15).

## 4. Kleine punten, bewust nog niet gebouwd

- **De soort op de plankaart en het kennisgat.** Kiest de consultant een andere soort, dan houdt het
  kennisgat (N6) de soort van de oorspronkelijke kans aan (`kansen.ruw.type`). Het gat verschilt per
  soort alleen in prijs en termijn; bijwerken als het in de praktijk verwart.
- **Een herhaalde brief haalt de zoekresultaten opnieuw op.** Mislukt de brief na het ophalen, dan kost
  de volgende poging nog eens ongeveer $0,03. Een eigen opslag is meer code dan dat waard is.
- **Het rapport kiest geen gids.** De soorten van het rapport zijn de vier oude; `gids` kiest de
  consultant. Het rapport ook gidsen laten voorstellen verandert de aanbevelingen, en is een eigen besluit.
