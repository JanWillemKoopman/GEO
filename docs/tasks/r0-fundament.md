# R0, Fundament op orde

**Status:** open, blijvend uitgesteld · **Effort:** ~8 d · **Prioriteit:** laag

Kleine defecten die de latere rondes anders blijven ondermijnen. In de praktijk blokkeerde deze
ronde niets, R4 bleek prima te bouwen zonder R0.5. Eén punt is het onthouden waard: **R0.5 is de
reden dat de fabrikanten die Bol verkoopt nog steeds als concurrent meetellen.**

> **Migratienummers in dit document zijn bijgewerkt.** De oorspronkelijke specs claimden `0027`;
> dat nummer is inmiddels de bewijslaag (R1). Nieuwe migraties uit deze ronde krijgen `0038` en
> verder, `0033` blijft gereserveerd voor R6.2.

De cijfers hieronder komen uit de vijf regressie-analyses van 30 juli 2026 (Coolblue, Bol, HEMA,
Van der Valk, Fysi-Unique). Die hebben opgeslagen `raw_response`-teksten, dus vrijwel elke stap is
zonder nieuwe OpenAI-kosten te verifiëren.

---

## R0.1, `existingUrl`-conventie afdwingen

**Probleem:** drie conventies door elkaar (`""`, `"/"`, relatief pad), en `action: "nieuw"` mét een
verwijzing naar een bestaande, relevante pagina. Bij Fysi-Unique levert dat vier nieuwe pagina's op
naast een bestaande pagina over hetzelfde onderwerp.

**Bestanden:** `lib/pipeline/recommendation.ts` (of nieuw `lib/pipeline/normalize-recommendation.ts`),
`lib/pipeline/report.ts`.

**Implementatie**

1. Nieuwe functie `normalizeRecommendation(rec, pages: ProfilePage[], siteUrl: string)`:
   - Lege string, `"/"` en de kale domeinnaam → `existingUrl: null`.
   - Relatief pad → absoluut maken met de profiel-URL als basis.
   - Daarna matchen tegen `profile_pages.url`. Geen match → `existingUrl: null`.
   - **Match gevonden terwijl `action === "nieuw"` → `action` wordt `"verbeteren"`.** Dat is de
     kern: wijst het model zelf een relevante bestaande pagina aan, dan is het per definitie geen
     nieuwe pagina.
2. Aanroepen in `generateReport()` direct na `resolveTargets()`, vóór het opslaan van
   `recommendations_json`.
3. Log hoeveel aanbevelingen omgezet zijn, zodat het effect zichtbaar is.

**Verificatie:** draai `normalizeRecommendation` als script over de opgeslagen
`recommendations_json` van de vijf regressie-analyses (geen AI-kosten). Verwacht: Fysi-Unique 5 →
minstens 4 omgezet naar `verbeteren`; Coolblue 4 → minstens 2; Van der Valk 6× `"/"` → `null`;
HEMA/Bol `""` → `null`. Plus een unittest met de drie URL-vormen.

**Klaar wanneer:** geen enkele aanbeveling in een nieuw rapport heeft `action: "nieuw"` in
combinatie met een `existingUrl` die matcht met de inventaris.

---

## R0.2, Volumekalibratie normaliseren

**Probleem:** Van der Valk kreeg geen enkele "hoog"-band; het model schaalde absoluut in plaats van
relatief, met een maximum van 50.

**Bestanden:** `lib/pipeline/prompts.ts` (`calibrateVolumes`), `lib/pipeline/volume.ts`.

**Implementatie**

1. Na de kalibratie: herschaal lineair zodat het hoogste antwoord binnen de analyse op 100 uitkomt,
   met behoud van de rangorde. Faalt de call, dan blijft de bestaande terugval van 50 gelden.
2. `bandFromEstimate` blijft ongewijzigd, de banden verdelen zich dan vanzelf goed.
3. Bewaar de ruwe modelwaarde náást de genormaliseerde: `volume_estimate` blijft ruw, de band is
   afgeleid van de genormaliseerde waarde.

**Verificatie:** herbereken over de opgeslagen prompts van Van der Valk. Verwacht minstens één
vraag in de band `hoog`, en de onderlinge rangorde ongewijzigd.

**Klaar wanneer:** elke analyse met ≥10 vragen heeft minstens één vraag in elke band.

---

## R0.3, Clusters bruikbaar maken

**Probleem:** vrijwel één cluster per prompt (30 clusters voor 30 vragen), en vervuilde waarden als
`"aankoopchecklist wasmachines, volumeEstimate=30}]}"`.

**Bestanden:** `lib/pipeline/prompts.ts`, `lib/schemas/prompts.ts`, `lib/jobs/handlers.ts`.
**Migratie:** geen nieuwe kolom nodig (`cluster` bestaat), wel een opschoon-`update` van de
vervuilde waarden, nummer `0038` of later.

**Implementatie**

1. Haal `cluster` uit het per-prompt-schema (`PromptSet`). Het model is er aantoonbaar slecht in.
2. Breid de bestaande `calibrate_volumes`-taak uit tot één call die zowel volume kalibreert **als**
   de vragen in 5–8 thema's groepeert: het model krijgt alle vragen genummerd en geeft per vraag
   een themanummer plus een themalijst terug.
3. Schrijf het themalabel weg in `prompts.cluster`. Cap op 60 tekens; strip alles na een komma
   gevolgd door een sleutelwoord als `volumeEstimate`.

**Verificatie:** na herkalibratie heeft elke regressie-analyse tussen 4 en 9 unieke clusters, en
bevat geen enkele clusterwaarde `{`, `}` of `volumeEstimate`.

**Klaar wanneer:** aantal unieke clusters ≤ 9 per analyse.

---

## R0.4, Meetbasis-krimp zichtbaar maken

**Probleem:** Coolblue kreeg 2 van 10 oriëntatievragen; alleen een `console.warn` vermeldde dat. De
klant ziet een score die op een scheve trechter rust.

**Migratie (nieuw nummer, `0038` of later):**

```sql
alter table public.analyses
  add column if not exists prompt_generation_json jsonb;
```

Met commentaar: per funnelfase gevraagd/geleverd aantal plus de reden van uitval.

**Bestanden:** `lib/pipeline/prompts.ts`, `lib/pipeline/prepare.ts`,
`app/(app)/analyses/[id]/concept/page.tsx`.

**Implementatie**

1. `generateForFunnelStage` geeft naast de prompts terug: gevraagd, geleverd, en hoeveel er op de
   merkneutraliteitsregel sneuvelden, mét de weggegooide teksten, voor diagnose.
2. `generateAnalysisPrompts` schrijft dat samengevat weg in `prompt_generation_json`.
3. Het conceptscherm toont per funnelfase een regel wanneer geleverd < gevraagd, in gewone taal:
   *"Voor Oriëntatie konden we er 2 van de 10 maken, de overige vragen bevatten telkens een
   merknaam die we uit de meting moeten houden. Je kunt hieronder zelf vragen toevoegen."*
4. **Verzacht het filter:** weer een concurrentnaam alleen wanneer die als losstaand woord in de
   vraag staat én de vraag zonder die naam niet zinvol blijft. Laat de aanvulronde het model
   expliciet de weggegooide vragen tonen met de reden, zodat het gericht kan herformuleren in
   plaats van blind opnieuw te proberen.

**Verificatie:** genereer opnieuw voor Coolblue (~$0,01). Verwacht ≥7 van 10 oriëntatievragen
geleverd, en `prompt_generation_json` gevuld met de telling.

**Klaar wanneer:** het conceptscherm vermeldt elke fase waarin minder dan het gevraagde aantal
geleverd is.

---

## R0.5, Entiteitclassificatie: bedrijfsmodel en productlijnen

> **Deels al gebouwd.** De kolom `profiles.business_model` bestaat sinds migratie `0032` (R8.5), en
> `profile-research.ts` bepaalt het model al (`businessModelRule`), `prepare-profile.ts` slaat het
> op met klant-input leidend. **Er is dus geen migratie meer nodig.** Wat rest is stap 2 en 3
> hieronder: `classify-entities.ts` gebruikt `business_model` nog niet.

**Probleem:** bij Bol staan Lenovo, Dell, HP, Apple en ASUS als "concurrent" terwijl het fabrikanten
zijn wier producten bol.com verkoopt, intern tegenstrijdig, want `Apple MacBook Air (M1 of M2)`
staat in dezelfde tabel als `eigen_product`. Daarnaast zijn `Dell` / `Dell XPS` /
`Dell XPS 13 2-in-1` drie losse entiteiten.

**Bestanden:** `lib/pipeline/classify-entities.ts`, `lib/entities/normalize.ts`.

**Implementatie**

1. ~~Bedrijfsmodel bepalen en opslaan~~, gedaan in R8.5.
2. Geef `business_model` mee aan `classify-entities`, met een expliciete regel per model. Voor
   `platform` en `retailer`: *"merken waarvan dit bedrijf de producten verkoopt zijn nooit
   `concurrent` maar `eigen_product`; concurrent is alleen een andere winkel of platform waar
   dezelfde klant hetzelfde zou kunnen kopen."*
3. Productlijn-deduplicatie in `normalizeEntityName`: begint een genormaliseerde naam met die van
   een bestaande entiteit gevolgd door een spatie (`dell xps` ⊃ `dell`), koppel dan aan de
   bestaande entiteit en voeg de langere vorm toe als alias. Alleen toepassen wanneer de basisnaam
   minstens 4 tekens telt, om `HP` ⊃ `HP Envy` te vermijden bij te korte stammen.

**Verificatie:** herclassificeer de entiteiten van Bol (~$0,004; `role_source` op `onbepaald` zetten
en de aggregatie opnieuw draaien). Verwacht: Lenovo/Dell/HP/Apple/ASUS als `eigen_product`;
Coolblue en MediaMarkt blijven `concurrent`; `Dell XPS*` verdwijnt als losse entiteit. Handmatige
oordelen (`role_source = 'handmatig'`) blijven ongemoeid.

**Klaar wanneer:** Bol's share-of-voice-noemer bevat alleen nog echte verkooppunten.

---

## R0.6, Off-site: repareren of uitzetten

**Probleem:** `source_landscape` heeft 25 rijen, `offsite_tasks` is leeg terwijl minstens twee
domeinen aan de drempel voldoen. En als het wél werkte, zou het adviseren *"zorg dat je op
fysioatelieramersfoort.nl staat"*, de website van een directe concurrent.

**Bestanden:** `lib/offsite/scan.ts`, `lib/offsite/landscape.ts`.

**Implementatie**

1. **Eerst diagnose:** waarom levert `createTasks` nul rijen op terwijl de condities gehaald worden?
   Verdachte: de `upsert` met `ignoreDuplicates: true` in combinatie met `.select("id")`, of een
   `own_present` die `null` blijft. Los op wat er ook uitkomt.
2. **Onderscheid brontypes**, nieuw veld op `source_landscape`: is dit domein een *platform*
   (meerdere aanbieders, je kunt er een profiel aanmaken), een *concurrent-eigen site*, of een
   *redactionele bron*? Af te leiden in code: matcht het domein met een bekende concurrent-entiteit
   → concurrent-eigen.
3. **Alleen platforms worden een taak.** Voor een concurrent-eigen domein is de conclusie een heel
   andere, en die hoort in het rapport en niet in een takenlijst: *"je concurrent wordt bij 8 vragen
   via zijn eigen site aangehaald. Dat is een contentsignaal, geen platform waar je op kunt."*

**Verificatie:** draai de scan opnieuw voor Fysi-Unique. Verwacht: geen taak voor
`fysioatelieramersfoort.nl`; wél Wikidata-/Wikipedia-taken als die ontbreken.

**Klaar wanneer:** geen enkele off-site taak verwijst naar het domein van een als concurrent
geclassificeerde entiteit.
