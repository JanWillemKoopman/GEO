# R6.3 — brontype als signaal

**Status:** R6.2 is GEBOUWD (4 augustus 2026), R6.3 staat nog open · **Effort:** 1,5 d

> **R6.2 is opgegaan in fase 0 van Onboarding 2.0.** De inventariskwaliteitspoort draait nu bij
> elke onboarding als onderdeel van `discover.ts`, met `assessInventory()` in
> `lib/pipeline/inventory-quality.ts` en de uitkomst in `profiles.inventory_quality_json`
> (migratie `0039`, niet `0033` — die reservering is daarmee vervallen). Op het scherm staat het
> oordeel bóven de aanbodlijst, want als het aanbod dun is omdat de crawl dun was, is dat de
> eerste zin die je wilt lezen. De beschrijving hieronder is bewaard als achtergrond; de
> uiteindelijke uitwerking staat in `logbook.md` §14.

Wat blijft: R6.3. Hetzelfde patroon — de pijplijn draait door op materiaal dat niet deugt, zonder
dat iemand het merkt.

---

## R6.2 — Inventariskwaliteitspoort (2 d) — GEBOUWD, zie de noot hierboven

**Probleem:** Bol had 1 pagina in de inventaris, HEMA 40 productpagina's. In beide gevallen
degradeert het rapport zonder foutmelding — de nieuw/verbeteren-beslissing rust dan op vrijwel
niets, maar het rapport zegt dat nergens.

**Migratie `0033`** (al gereserveerd, nooit gedraaid):

```sql
alter table public.profiles
  add column if not exists inventory_quality_json jsonb;
```

**Bestanden:** `lib/crawler.ts`, `lib/pipeline/prepare-profile.ts`, `lib/pipeline/report.ts`,
`app/(app)/profielen/[id]/page.tsx`.

**Implementatie**

1. Na de crawl een kwaliteitsoordeel: aantal pagina's, aandeel vermoedelijke productpagina's,
   aandeel met bruikbare tekst.
2. **Generieke productpagina-heuristiek** naast de bestaande Shopify-/Yoast-patronen: URL-diepte ≥4
   segmenten, een artikelnummer-achtig patroon in het laatste segment (`-200302.html` bij HEMA), of
   prijsindicatoren in de tekst.
3. Onder de drempel → waarschuwing op de profielpagina met een concrete handeling ("vul de
   sitemap-URL in" / "verhoog het paginamaximum"), plus een expliciete vermelding in de
   rapportinvoer dat de nieuw/verbeteren-beslissing op dunne grond staat.

**Verificatie:** Bol moet als "onvoldoende" gemarkeerd worden (1 pagina), HEMA als "vervuild"
(overwegend productpagina's), de andere drie als voldoende.

---

## R6.3 — Brontype als signaal (1,5 d)

**Probleem:** bij Fysi-Unique zijn 8 van de 10 meest geciteerde bronnen **homepages**, geen
inhoudelijke pagina's. Citeert de AI het bedrijf zelf en niet een diepe contentpagina, dan is
"schrijf een lange blogpagina" waarschijnlijk het verkeerde advies.

**Bestanden:** `lib/offsite/domain.ts` (of nieuw `lib/pipeline/source-type.ts`),
`lib/pipeline/report.ts`, `lib/pipeline/source-analysis.ts`.

**Implementatie**

1. Classificeer elke geciteerde bron in code: *homepage* (leeg pad of `/`), *inhoudelijke pagina*
   (dieper pad), of *platform/overzicht*.
2. Bereken per analyse de verhouding en geef die mee aan het rapport.
3. Laat het rapport erop sturen: overwegend homepages → het advies gaat richting
   entiteitsherkenning, vindbaarheid en off-site aanwezigheid. Overwegend inhoudelijke pagina's →
   diepe content is wél het middel.
