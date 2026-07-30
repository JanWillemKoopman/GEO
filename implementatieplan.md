# Implementatieplan — doorontwikkeling GEO Tracker

> **Wat dit document is.** Het werkdocument waarmee de verbeteringen uit
> [`kwaliteitsanalyse-5-testcases.md`](./kwaliteitsanalyse-5-testcases.md) stap voor stap
> geïmplementeerd worden. Elke stap is los opleverbaar, heeft een eigen verificatie en kan
> zelfstandig naar productie. Wie een stap oppakt, hoeft alleen dat blok te lezen.
>
> **Hoe je dit gebruikt.** Werk de stappen in volgorde af. Vink af in de voortgangstabel in §2.
> Wijkt de implementatie af van wat hier staat, pas dan dit document aan — het moet blijven
> kloppen met de code, net als [`GEO-EINDE-TOT-EINDE-PROCES.md`](./GEO-EINDE-TOT-EINDE-PROCES.md).
>
> **Onderbouwing.** De bevindingen waar dit plan op rust staan in
> [`kwaliteitsanalyse-5-testcases.md`](./kwaliteitsanalyse-5-testcases.md); verwijzingen als
> "§2.2" hieronder wijzen naar dat document.

---

## 1. Werkwijze

### 1.1 Per stap

1. Branch vanaf `main`: `feature/<stapcode>-<korte-naam>`, bijvoorbeeld `feature/R1.1-bewijsdossier`.
2. Migratie eerst (indien van toepassing), daarna code, daarna UI.
3. `npm run build` en `npm run test:unit` moeten slagen.
4. Verificatie uit het stapblok uitvoeren — dit is geen formaliteit, elke stap heeft een
   concreet meetbaar criterium.
5. Deze `implementatieplan.md` bijwerken (vinkje + eventuele afwijking).

### 1.2 De regressieset

Er staan vijf volledig doorgerekende analyses in productie van 30 juli 2026. Die vormen de
**referentiemeting** voor elke stap: na een wijziging moeten de cijfers óf gelijk blijven, óf
aantoonbaar beter worden om de reden die in de stap staat.

| Bedrijf | Analyse-ID | Onderwerp | Kernwaarden nulmeting |
|---|---|---|---|
| Coolblue | `de8f2204-6505-48c0-9d89-93f96c40ceb4` | wasmachine kopen | score 36 · 22 vragen · 3 merkloos |
| Bol | `62aebcce-373e-48e7-a4f9-bc1a4821875d` | beste laptop voor studenten | score 17 · 29 vragen · 7 merkloos |
| HEMA | `49fa376e-8b23-4d2e-8c7e-669213898bef` | verjaardagscadeau <€20 | score 10 · 30 vragen · 4 merkloos |
| Van der Valk | `d08b3db5-a64b-4645-ab4f-ae53f00bbbcd` | vergaderlocatie boeken | score 7 · 30 vragen · 9 merkloos |
| Fysi-Unique | `850c8998-b143-4203-af76-243b4f9bee51` | hardloopblessure behandelen | score 10 · 30 vragen · 9 merkloos |

**Belangrijk:** deze analyses hebben opgeslagen `raw_response`-teksten. Vrijwel elke stap
hieronder kan daarom **zonder nieuwe OpenAI-kosten** geverifieerd worden door de bestaande data
opnieuw te verwerken. Alleen stappen die de simulatiecall (3a) of promptgeneratie raken, hebben
verse metingen nodig.

### 1.3 Gereserveerde migratienummers

Laatst toegepaste migratie is `0026`. Hieronder vooraf vastgelegd om botsingen te voorkomen:

| Nr | Ronde | Inhoud | Status |
|---|---|---|---|
| `0027` | R1 | `reports.stripped_claims_json` (bewijslaag) | ✅ toegepast |
| `0028` | R0 | Promptgeneratie-telemetrie, `profiles.business_model` | gereserveerd |
| `0029` | R2 | Meetbaarheid (`brands_in_answer`, `brand_eliciting`, score-splitsing) | gereserveerd |
| `0030` | R3 | Zichtbaarheidsprofiel (rol, positie-aggregatie, citatiescore) | gereserveerd |
| `0031` | R4 | Concurrent-intelligence | gereserveerd |
| `0032` | R6 | Herhaalmeting + inventariskwaliteit | gereserveerd |

R5 heeft geen nieuwe migratie nodig — die draait op het schema uit `0024`, dat al is toegepast.

> **Afwijking:** R1 is als eerste opgeleverd en heeft daarom `0027` gekregen; de rest is één
> nummer opgeschoven. R1 bleek wél een migratie nodig te hebben (de audit-trail van gestripte
> beweringen), anders dan bij het opstellen van dit plan gedacht.

### 1.4 Huisregels uit de codebase

- **Schrijven loopt nooit rechtstreeks vanaf de client** — altijd via een API-route met
  service-role + ownership-check (`abcplan.md` §12.20).
- **Eén taak = hooguit één zware AI-aanroep** (`lib/jobs/types.ts`). Nieuwe zware stappen worden
  een eigen jobtype, geen uitbreiding van een bestaande.
- **Alles bewaren**: elke AI-call slaat zijn volledige ruwe output op (`abcplan.md` §5).
- **Migraties zijn additief en herhaalbaar** (`if not exists`), met uitleg bovenaan in het
  commentaarformaat van `0026`.
- **Idempotentie**: elke pijplijnstap controleert of z'n resultaat al bestaat vóór een dure call.

---

## 2. Voortgang

| Stap | Omschrijving | Effort | Status |
|---|---|---|---|
| R0.1 | `existingUrl`-conventie afdwingen | 1 d | ☐ |
| R0.2 | Volumekalibratie normaliseren | 0,5 d | ☐ |
| R0.3 | Clusters bruikbaar maken | 1,5 d | ☐ |
| R0.4 | Meetbasis-krimp zichtbaar maken | 1,5 d | ☐ |
| R0.5 | Entiteitclassificatie: bedrijfsmodel + productlijnen | 2 d | ☐ |
| R0.6 | Off-site: repareren of uitzetten | 1,5 d | ☐ |
| R1.1 | Bewijsdossier in code | 2 d | ✅ |
| R1.2 | Rapportprompt: verwoorden, niet afleiden | 1 d | ✅ |
| R1.3 | Claimvalidator | 1,5 d | ✅ |
| R2.1 | Merken-per-antwoord vastleggen | 1 d | ✅ |
| R2.2 | Score splitsen | 2 d | ✅ |
| R2.3 | Kansloze vragen uit contentadvies | 1 d | ✅ |
| R2.4 | Vervolgmetingen inperken | 1,5 d | ✅ |
| R2.5 | UI: tweede getal | 1,5 d | ✅ |
| R3.1 | Mention-schema: rol i.p.v. sentiment | 1,5 d | ✅ |
| R3.2 | Positie- en citatie-aggregatie | 2 d | ✅ |
| R3.3 | UI: zichtbaarheidsprofiel | 2 d | ✅ |
| R4.1 | Concurrent-snoei | 1 d | ✅ |
| R4.2 | Concurrentprofilering (nieuwe stap) | 3 d | ✅ |
| R4.3 | Doorgeven aan rapport en content | 1,5 d | ✅ |
| R5.1 | Feitenindex + claim-audit | 3 d | ☐ |
| R5.2 | Briefingscherm | 3 d | ☐ |
| R5.3 | Schrijfcontract | 2,5 d | ☐ |
| R6.1 | Gelaagd hermeten | 2 d | ☐ |
| R6.2 | Inventariskwaliteitspoort | 2 d | ☐ |
| R6.3 | Brontype als signaal | 1,5 d | ☐ |

**Totaal: circa 46 dagen.** Volgorde-afhankelijkheden: R1 en R2 zijn onafhankelijk van elkaar en
kunnen parallel. R3 bouwt op R2.1. R4 bouwt op R0.5. R5 bouwt op R1 (het bewijsdossier is input
voor de brief). R6 kan op elk moment.

---

## R0 — Fundament op orde

Kleine defecten die de latere rondes anders blijven ondermijnen.

### R0.1 — `existingUrl`-conventie afdwingen

**Probleem** (§3.3): drie conventies door elkaar (`""`, `"/"`, relatief pad), en `action: "nieuw"`
mét een verwijzing naar een bestaande, relevante pagina. Bij Fysi-Unique levert dat vier nieuwe
pagina's op naast een bestaande pagina over hetzelfde onderwerp.

**Bestanden:** `lib/pipeline/recommendation.ts` (of nieuw `lib/pipeline/normalize-recommendation.ts`),
`lib/pipeline/report.ts`.

**Implementatie**

1. Nieuwe functie `normalizeRecommendation(rec, pages: ProfilePage[], siteUrl: string)`:
   - Lege string, `"/"` en de kale domeinnaam → `existingUrl: null`.
   - Relatief pad → absoluut maken met de profiel-URL als basis.
   - Daarna matchen tegen `profile_pages.url`. Geen match → `existingUrl: null`.
   - **Match gevonden terwijl `action === "nieuw"` → `action` wordt `"verbeteren"`.** Dat is de
     kern: als het model zelf een relevante bestaande pagina aanwijst, is dat per definitie geen
     nieuwe pagina.
2. Aanroepen in `generateReport()` direct na `resolveTargets()`, vóór het opslaan van
   `recommendations_json`.
3. Loggen hoeveel aanbevelingen omgezet zijn, zodat we het effect kunnen zien.

**Verificatie**
- Draai `normalizeRecommendation` over de opgeslagen `recommendations_json` van de vijf
  regressie-analyses (kan als script, zonder AI-kosten).
- Verwacht: Fysi-Unique 5 → minstens 4 omgezet naar `verbeteren`; Coolblue 4 → minstens 2;
  Van der Valk 6× `"/"` → `null`; HEMA/Bol `""` → `null`.
- Unit test in `scripts/test-unit.ts` met de drie URL-vormen.

**Klaar wanneer:** geen enkele aanbeveling in een nieuw rapport heeft `action: "nieuw"` in
combinatie met een `existingUrl` die matcht met de inventaris.

---

### R0.2 — Volumekalibratie normaliseren

**Probleem** (§1.2): Van der Valk kreeg geen enkele "hoog"-band; het model schaalde absoluut in
plaats van relatief, met een maximum van 50.

**Bestanden:** `lib/pipeline/prompts.ts` (`calibrateVolumes`), `lib/pipeline/volume.ts`.

**Implementatie**

1. Na ontvangst van de kalibratie: herschaal de waarden zodat het hoogste antwoord binnen de
   analyse op 100 uitkomt (lineair, met behoud van de rangorde). Faalt de call, dan blijft de
   bestaande terugval van 50 gelden.
2. `bandFromEstimate` blijft ongewijzigd — de banden worden nu vanzelf goed verdeeld.
3. Bewaar de ruwe modelwaarde náást de genormaliseerde (`volume_estimate` blijft ruw; de band is
   afgeleid van de genormaliseerde waarde).

**Verificatie:** herbereken over de opgeslagen prompts van Van der Valk. Verwacht: minstens één
vraag in de band `hoog`, en de onderlinge rangorde ongewijzigd.

**Klaar wanneer:** elke analyse met ≥10 vragen heeft minstens één vraag in elke band.

---

### R0.3 — Clusters bruikbaar maken

**Probleem** (§1.3): vrijwel één cluster per prompt (30 clusters voor 30 vragen), en vervuilde
waarden als `"aankoopchecklist wasmachines, volumeEstimate=30}]}"`.

**Bestanden:** `lib/pipeline/prompts.ts`, `lib/schemas/prompts.ts`, `lib/jobs/handlers.ts`.

**Implementatie**

1. Haal `cluster` uit het per-prompt-schema (`PromptSet`) — het model is er aantoonbaar slecht in.
2. Breid de bestaande `calibrate_volumes`-taak uit tot één call die zowel volume kalibreert
   **als** de vragen in 5–8 thema's groepeert: het model krijgt alle vragen genummerd en geeft
   per vraag een themanummer plus een themalijst terug.
3. Schrijf het themalabel weg in `prompts.cluster`. Cap op 60 tekens; strip alles na een komma
   gevolgd door een sleutelwoord als `volumeEstimate`.
4. Migratie is niet nodig (kolom bestaat), maar ruim de bestaande vervuilde waarden op met een
   `update` in `0027`.

**Verificatie:** na herkalibratie heeft elke regressie-analyse tussen 4 en 9 unieke clusters, en
geen enkele clusterwaarde bevat `{`, `}` of `volumeEstimate`.

**Klaar wanneer:** aantal unieke clusters ≤ 9 per analyse.

---

### R0.4 — Meetbasis-krimp zichtbaar maken

**Probleem** (§1.1): Coolblue kreeg 2 van 10 oriëntatievragen; alleen een `console.warn`
vermeldde dat. De klant ziet een score die op een scheve trechter rust.

**Migratie `0027`** — voegt toe aan `analyses`:
```sql
alter table public.analyses
  add column if not exists prompt_generation_json jsonb;
```
Met commentaar: per funnelfase gevraagd/geleverd aantal plus de reden van uitval.

**Bestanden:** `lib/pipeline/prompts.ts`, `lib/pipeline/prepare.ts`,
`app/(app)/analyses/[id]/concept/page.tsx`.

**Implementatie**

1. `generateForFunnelStage` geeft naast de prompts ook terug: gevraagd, geleverd, en hoeveel er
   op de merkneutraliteitsregel sneuvelden (mét de weggegooide teksten, voor diagnose).
2. `generateAnalysisPrompts` schrijft dat samengevat weg in `prompt_generation_json`.
3. Conceptscherm toont per funnelfase een regel wanneer geleverd < gevraagd, in gewone taal:
   *"Voor Oriëntatie konden we er 2 van de 10 maken — de overige vragen bevatten telkens een
   merknaam die we uit de meting moeten houden. Je kunt hieronder zelf vragen toevoegen."*
4. **Verzacht het filter**: weer een concurrentnaam alleen wanneer die als losstaand woord in de
   vraag staat én de vraag zonder die naam niet zinvol blijft. Concreet: laat de aanvulronde het
   model expliciet de weggegooide vragen tonen met de reden, zodat het gericht kan herformuleren
   in plaats van blind opnieuw te proberen.

**Verificatie:** genereer opnieuw voor Coolblue (kost ~$0,01). Verwacht: ≥7 van 10 oriëntatie-
vragen geleverd, en `prompt_generation_json` gevuld met de telling.

**Klaar wanneer:** het conceptscherm vermeldt elke fase waarin minder dan het gevraagde aantal
geleverd is.

---

### R0.5 — Entiteitclassificatie: bedrijfsmodel en productlijnen

**Probleem** (§2.7): bij Bol staan Lenovo, Dell, HP, Apple en ASUS als "concurrent" terwijl het
fabrikanten zijn wier producten bol.com verkoopt — intern tegenstrijdig, want
`Apple MacBook Air (M1 of M2)` staat in dezelfde tabel als `eigen_product`. Daarnaast zijn
`Dell` / `Dell XPS` / `Dell XPS 13 2-in-1` drie losse entiteiten.

**Migratie `0027`** (zelfde bestand als R0.4) — voegt toe aan `profiles`:
```sql
alter table public.profiles
  add column if not exists business_model text;
-- check: 'retailer' | 'platform' | 'dienstverlener' | 'fabrikant' | 'overig'
```

**Bestanden:** `lib/pipeline/classify-entities.ts`, `lib/entities/normalize.ts`,
`lib/pipeline/profile-research.ts`, `lib/schemas/profile.ts`.

**Implementatie**

1. Laat het profielonderzoek het bedrijfsmodel bepalen (extra veld in `ProfileResearch`), en sla
   het op. Klant kan het aanpassen op de profielpagina.
2. Geef het mee aan `classify-entities`, met een expliciete regel per model. Voor `platform` en
   `retailer`: *"merken waarvan dit bedrijf de producten verkoopt zijn nooit `concurrent`, maar
   `eigen_product`; concurrent is alleen een andere winkel/platform waar dezelfde klant hetzelfde
   zou kunnen kopen."*
3. Productlijn-deduplicatie in `normalizeEntityName`: als een genormaliseerde naam begint met de
   genormaliseerde naam van een bestaande entiteit gevolgd door een spatie
   (`dell xps` ⊃ `dell`), koppel aan de bestaande entiteit en voeg de langere vorm toe als alias.
   Alleen toepassen wanneer de basisnaam minstens 4 tekens telt, om `HP` ⊃ `HP Envy` te vermijden
   bij te korte stammen.

**Verificatie:** herclassificeer de entiteiten van Bol (kost ~$0,004, `role_source` op
`onbepaald` zetten en de aggregatie opnieuw draaien). Verwacht: Lenovo/Dell/HP/Apple/ASUS als
`eigen_product`; Coolblue en MediaMarkt blijven `concurrent`; `Dell XPS*` verdwijnt als losse
entiteit. Handmatige oordelen (`role_source = 'handmatig'`) blijven ongemoeid.

**Klaar wanneer:** Bol's share-of-voice-noemer bevat alleen nog echte verkooppunten.

---

### R0.6 — Off-site: repareren of uitzetten

**Probleem** (§3.6): `source_landscape` heeft 25 rijen, `offsite_tasks` is leeg terwijl minstens
twee domeinen aan de drempel voldoen. En als het wél werkte, zou het adviseren *"zorg dat je op
fysioatelieramersfoort.nl staat"* — de website van een directe concurrent.

**Bestanden:** `lib/offsite/scan.ts`, `lib/offsite/landscape.ts`.

**Implementatie**

1. **Eerst diagnose**: waarom levert `createTasks` nul rijen op terwijl de condities gehaald
   worden? Verdachte: de `upsert` met `ignoreDuplicates: true` in combinatie met `.select("id")`,
   of een `own_present`-waarde die `null` blijft. Los op wat er ook uitkomt.
2. **Onderscheid brontypes** — nieuw veld op `source_landscape`: is dit domein een *platform*
   (meerdere aanbieders, je kunt er een profiel aanmaken), een *concurrent-eigen site*, of een
   *redactionele bron*? Af te leiden in code: matcht het domein met een bekende
   concurrent-entiteit → concurrent-eigen.
3. **Alleen platforms worden een taak.** Voor een concurrent-eigen domein is de conclusie een
   heel andere en die hoort in het rapport, niet in een takenlijst: *"je concurrent wordt bij 8
   vragen via zijn eigen site aangehaald — dat is een contentsignaal, geen platform waar je op
   kunt."*

**Verificatie:** draai de scan opnieuw voor Fysi-Unique. Verwacht: geen taak voor
`fysioatelieramersfoort.nl`; wél Wikidata-/Wikipedia-taken als die ontbreken.

**Klaar wanneer:** geen enkele off-site taak verwijst naar het domein van een als concurrent
geclassificeerde entiteit.

---

## R1 — Bewijslaag: een rapport dat niet kán liegen

**De kern** (§2.2): het rapport beweerde dat twee concurrenten "wel scoren" op een vraag waarvan
het antwoord geen enkel bedrijf noemt. Oorzaak: `buildMissedBlock` geeft per gemiste vraag geen
`runId` mee, terwijl de concurrentiedata wél run-ID's bevat. Het model kan de koppeling niet
leggen en gokt.

### R1.1 — Bewijsdossier in code

**Bestanden:** `lib/pipeline/report.ts`, nieuw `lib/pipeline/evidence.ts`.

**Implementatie**

1. Nieuwe functie `buildEvidenceDossier(admin, analysisId, weekNo, missed): Promise<EvidenceEntry[]>`
   in `lib/pipeline/evidence.ts`. Per gemiste vraag levert die deterministisch:
   ```ts
   interface EvidenceEntry {
     code: string;              // V1, V2, …
     runId: string;
     promptText: string;
     weight: number;
     brandsInAnswer: {          // uitsluitend wat in DIT antwoord stond
       name: string;            // canonieke entiteitsnaam
       role: string;            // concurrent | vergelijker | …
       position: number | null;
       citedSources: string[];
     }[];
     answerExcerpt: string;     // eerste ~400 tekens van raw_response
   }
   ```
2. `buildGapInput` en `buildReportInput` gebruiken dit dossier in plaats van het huidige
   `buildMissedBlock`. Elke gemiste vraag krijgt zijn eigen blok met de merken die er
   daadwerkelijk in stonden — of expliciet: *"in dit antwoord werd geen enkel bedrijf genoemd."*
3. De geaggregeerde `competitor_breakdown` blijft meegaan als marktbeeld, maar met een expliciet
   label dat het over de hele meting gaat en niet over een specifieke vraag.

**Verificatie:** bouw het dossier voor Van der Valk (geen AI-kosten). Verwacht: bij V1
(`ccc43406-…`) staat `brandsInAnswer: []` en de expliciete zin dat er geen bedrijf genoemd werd.

**Klaar wanneer:** elke gemiste vraag in de rapportinvoer draagt zijn eigen, uit de database
afgeleide merkenlijst.

> **✅ Opgeleverd.** `lib/pipeline/evidence.ts` (query's) + `lib/pipeline/evidence-format.ts`
> (opmaak, puur en getest — zelfde splitsing als `period-change` / `period-change-format`).
> 15 nieuwe eenheidstests.
>
> **Uitkomst van de verificatie op Van der Valk** — de oorzaak is nu volledig zichtbaar:
>
> | Vraag | Bedrijven in dát antwoord |
> |---|---|
> | **V1** — *"Wat is de beste manier om een vergaderlocatie te boeken…"* | **geen enkel** |
> | **V5** — *"Welke vergaderlocaties zijn beschikbaar voor 20 personen…"* | Dotslash Utrecht, Het Oude Raadhuis Hoofddorp, ZiPPERZ |
>
> Het rapport plakte de namen van **V5** op **V1**. Met het dossier staat per vraag apart wat
> erin zat, dus die verwisseling kan niet meer ontstaan.
>
> **Afwijking van het plan — rolfilter toegevoegd.** De verificatie bracht iets aan het licht
> dat vooraf niet voorzien was: de mention-classificatie pikt naast bedrijven ook gewone
> woorden op als entiteit ("vergaderlocatie", "locatie", "hotel", "Nederland"). Die worden
> verderop correct als `niet_relevant` geclassificeerd, maar zouden in het dossier ten onrechte
> doorgaan voor een genoemd bedrijf — precies het misverstand dat dit dossier moet uitbannen.
> Daarom telt alleen `concurrent`, `vergelijker`, `brancheorganisatie` en `eigen_product` mee
> (`RELEVANTE_ROLLEN`). Nog niet geclassificeerde namen blijven wél staan: die stonden echt in
> het antwoord en weglaten zou het dossier onvolledig maken. Effect: bij Van der Valk tonen 8
> van de 15 gemiste vragen nu correct "geen enkel bedrijf" in plaats van een rommelnaam.

### R1.2 — Rapportprompt: verwoorden, niet afleiden

**Bestanden:** `lib/pipeline/report.ts` (`GAP_SYSTEM`, `REPORT_SYSTEM`).

**Implementatie**

1. Voeg aan beide systeeminstructies een harde regel toe: *"Noem een concurrent alleen bij naam
   in verband met een specifieke vraag als die naam in het bewijsdossier van díe vraag staat.
   Staat er `geen enkel bedrijf genoemd`, dan is dat je conclusie — verzin geen concurrent
   erbij."*
2. Splits de taak expliciet: het marktbeeld mag over de hele meting gaan, uitspraken over een
   specifieke vraag uitsluitend uit het dossier.

**Verificatie:** genereer het rapport van Van der Valk opnieuw (~$0,004). De aanbeveling bij V1
mag geen concurrentnaam meer noemen.

> **✅ Opgeleverd** (code). Beide systeeminstructies hebben een `BEWIJSREGEL` gekregen. Uit
> `REPORT_SYSTEM` is bovendien de zinsnede *"Noem in elk probleem expliciet welke concurrent het
> betreft"* verwijderd: die dwóng het model een naam te noemen, óók als het dossier er geen gaf —
> wat precies de aanleiding was om er dan maar een te verzinnen. De concurrentiedata staat nu
> onder een expliciete kop `MARKTBEELD over de HELE meting` met de instructie dat die nooit
> gebruikt mag worden om te zeggen wie een specifieke vraag wint.
>
> **Nog te doen:** het rapport daadwerkelijk opnieuw genereren om te bevestigen dat de
> V1-aanbeveling geen concurrentnaam meer noemt. Dat kost ~$0,004 en vereist een draaiende
> werker; te doen zodra R1.3 (de validator) er ook is, dan toetst één run beide stappen.

### R1.3 — Claimvalidator

**Bestanden:** nieuw `lib/pipeline/validate-claims.ts`, aangeroepen in `report.ts`.

**Implementatie**

1. Na het parsen van de B2-output: voor elk `why`- en `problem`-veld, zoek entiteitsnamen
   (uit `entities` van dit profiel) die erin voorkomen. Controleer of die naam voorkomt in de
   `brandsInAnswer` van de gekoppelde doelvraag.
2. Niet-onderbouwde naam → verwijder de zin waarin hij staat (zinsgrens op `.`), en log het in
   een nieuw veld `reports.stripped_claims_json`. Blijft er een leeg veld over, val terug op een
   neutrale formulering.
3. Unit tests in `scripts/test-unit.ts`: onderbouwde claim blijft staan, niet-onderbouwde
   verdwijnt, zin met twee namen waarvan één onderbouwd wordt correct behandeld.

**Verificatie:** draai over de vijf bestaande rapporten (geen AI-kosten). Verwacht: minstens de
Van der Valk-claim over "Het Oude Raadhuis Hoofddorp en Dotslash Utrecht" wordt gestript.

**Klaar wanneer:** geen enkel rapport bevat een concurrentnaam bij een vraag waarin die
concurrent niet gemeten is. `stripped_claims_json` is leeg bij een gezond rapport — is dat
structureel niet zo, dan is dat een signaal dat R1.2 nog niet streng genoeg is.

> **✅ Opgeleverd.** `lib/pipeline/validate-claims.ts` (puur, getest) +
> `validateReportClaims()` in `report.ts` (het stuk dat de database nodig heeft).
> Migratie `0027_bewijslaag.sql` is **toegepast op productie**. 18 nieuwe eenheidstests.
>
> **Verificatie op echte rapporttekst** — vier gevallen uit de opgeslagen rapporten, met de
> werkelijke toegestane namen per doelvraag:
>
> | Geval | Verwacht | Uitkomst |
> |---|---|---|
> | Van der Valk #1 — *"Het Oude Raadhuis Hoofddorp en Dotslash Utrecht scoren hier wel"* (0 bedrijven in dat antwoord) | strippen | ✅ gestript |
> | Van der Valk #2 — geen namen in de tekst | ongemoeid | ✅ ongemoeid |
> | Coolblue #1 — *"Expert, Bemmel en Kroon en Flevo Witgoed scoren hier wel"* (alle drie onderbouwd) | ongemoeid | ✅ ongemoeid |
> | Coolblue #3 — *"Bol.com scoort hier"* (0 bedrijven in dat antwoord) | strippen | ✅ gestript |
>
> Coolblue #3 was een **tweede geval van dezelfde fout**, niet eerder opgemerkt in de
> kwaliteitsanalyse. Het patroon komt dus vaker voor dan het ene Van der Valk-geval.
>
> **Bug gevonden én gefixt tijdens de verificatie.** De eerste zinssplitser brak naïef op elke
> punt, waardoor `Bol.com` uiteenviel in `Bol.` + `com`. Geen van beide helften bevatte de
> merknaam nog, dus de validator zag hem niet en liet de onjuiste bewering staan — precies het
> geval dat hij moest vangen. Een punt telt nu alleen als zinseinde wanneer er witruimte of het
> einde van de tekst op volgt; domeinnamen en getallen als `3.5` blijven heel. Geborgd met
> eigen tests.
>
> **Waarom een hele zin en niet alleen de naam:** een zin met één onderbouwde en één
> niet-onderbouwde naam gaat er in z'n geheel uit. Dat kost een correcte mededeling, maar de
> twee zijn niet te scheiden zonder de zin te herschrijven — en dat moet dit stukje code niet
> willen.

---

## R2 — Meetbaarheid als eerste-klas begrip

**De kern** (§2.1): 13–30% van de metingen levert een antwoord op zonder één bedrijfsnaam. Die
tellen nu als "jij werd niet genoemd" en worden contentadvies. De score meet daardoor twee
onvergelijkbare dingen door elkaar.

### R2.1 — Merken-per-antwoord vastleggen

**Migratie `0028`:**
```sql
alter table public.tracking_runs
  add column if not exists brands_in_answer integer;

alter table public.prompts
  add column if not exists brand_eliciting text;  -- 'ja' | 'nee' | 'onbekend'
```

**Bestanden:** `lib/pipeline/measure.ts`.

**Implementatie**

1. In `measureOnePrompt`, direct na het wegschrijven van `tracking_run_mentions`: tel de rijen
   met `is_own_brand = false AND mentioned = true` en schrijf dat naar
   `tracking_runs.brands_in_answer`. Geen extra AI-call — de data is er al.
2. Vulling met terugwerkende kracht in de migratie zelf voor bestaande metingen, zodat de
   regressieset meteen bruikbaar is.
3. `prompts.brand_eliciting` wordt afgeleid tijdens de aggregatie: `nee` zodra een vraag in twee
   opeenvolgende periodes 0 merken opleverde, anders `ja`. Bij één periode: `onbekend`.

**Verificatie:** na de migratie moet gelden — Van der Valk 9 runs met `brands_in_answer = 0`,
Fysi-Unique 9, Bol 7, HEMA 4, Coolblue 3. Exact die aantallen uit §2.1.

### R2.2 — Score splitsen

**Migratie `0028`** (zelfde bestand):
```sql
alter table public.visibility_scores
  add column if not exists brandless_runs integer,
  add column if not exists winnable_runs  integer;
```

**Bestanden:** `lib/pipeline/measure.ts` (`computeAggregates`).

**Implementatie**

1. `score`, `weighted_score` en `share_of_voice` worden voortaan berekend over **alleen de runs
   met `brands_in_answer > 0`**. Dat is het hoofdgetal: zichtbaarheid waar zichtbaarheid mogelijk
   is.
2. `brandless_runs` en `winnable_runs` worden apart opgeslagen.
3. `judged_runs` blijft wat het is (beoordeelde metingen) — niet verwarren met `winnable_runs`.
4. `score_stderr` wordt berekend over `winnable_runs`, niet over alle runs. Kleinere noemer
   betekent een bredere band; dat is eerlijker en moet zo getoond worden.

**Verificatie:** herbereken de aggregatie over de vijf analyses (geen AI-kosten). Verwachte
nieuwe scores uit §2.1: Coolblue 32, Bol 9, Fysi-Unique 14, HEMA 4, Van der Valk 5.

> **Let op:** dit verandert historische cijfers. Voor de vijf testanalyses is dat prima. Zou dit
> bij echte klanten gebeuren, dan alleen vooruitwerkend toepassen of expliciet communiceren.

### R2.3 — Kansloze vragen uit contentadvies

**Bestanden:** `lib/pipeline/report.ts` (`computeMissedPrompts`).

**Implementatie**

1. Vragen met `brands_in_answer = 0` krijgen geen plek in de gemiste-vragenlijst — er valt niets
   te winnen waar niemand genoemd wordt.
2. Ze verschijnen apart in de rapportinvoer als *"open terrein"*: vragen waar nog geen enkele
   partij de standaard is. Dat is een aparte strategische categorie die het rapport mag benoemen,
   maar níét als gemiste kans en niet als contentdoelvraag op prioriteit 1.

**Verificatie:** genereer de rapporten opnieuw (~$0,02 totaal). Verwacht: 0 doelvragen met
`brands_in_answer = 0` (nu: Fysi-Unique 2, HEMA 1, Van der Valk 1 — waaronder diens prioriteit 1).

### R2.4 — Vervolgmetingen inperken

**Bestanden:** `lib/jobs/queue.ts` (`enqueueMeasurement`), `app/api/cron/tracking/route.ts`.

**Implementatie**

1. Bij `weekNo > 0`: sla vragen met `brand_eliciting = 'nee'` over. De nulmeting meet altijd
   alles — je moet meten om te wéten.
2. Elke vierde periode toch één keer volledig meten, zodat een markt die verandert (er ontstaat
   wél een standaardpartij) opgemerkt wordt.
3. Log hoeveel vragen overgeslagen zijn; toon dat bij de analyse.

**Verificatie:** unit test op de selectielogica. Kostenverwachting: −20 tot −25% per
vervolgperiode (≈ −$0,18 per analyse).

### R2.5 — UI: het tweede getal

**Bestanden:** `app/(app)/analyses/[id]/page.tsx`, `score-panel.tsx`,
`app/(app)/analyses/[id]/_chapters/stand.tsx`.

**Implementatie**

1. Hoofdgetal blijft één getal — dat is het ontwerpprincipe (`README.md` §2). Eronder één regel:
   *"Bij 9 van je 30 vragen noemt de AI helemaal geen bedrijf. Daar valt nu niets te winnen —
   maar ook nog niets te verliezen."*
2. In de Antwoorden-tab een filter/markering voor merkloze antwoorden.

**Verificatie:** visuele controle op alle vijf analyses; de tekst moet kloppen met de opgeslagen
`brandless_runs`.

---

### ✅ R2 opgeleverd — uitkomst en twee correcties op dit plan

Migratie `0028_meetbaarheid.sql` toegepast op productie. Code in `lib/pipeline/measure.ts`
(telling + score + `brand_eliciting`), `lib/pipeline/report.ts` (R2.3), `lib/jobs/queue.ts`
(R2.4) en `score-panel.tsx` (R2.5).

**Correctie 1 — het eigen merk telt mee als aanbieder.** Dit plan schreef voor om alleen
ándere merken te tellen. Uit de data bleek dat er antwoorden zijn waarin uitsluitend de klant
genoemd wordt: 3× bij Bol, 2× bij Coolblue en HEMA, 1× bij Van der Valk. Dat zijn zuivere
winsten — de AI noemt één aanbieder en dat ben jij. Met de plan-definitie waren die als
"merkloos" buiten de score gevallen en had de klant een overwinning verloren. `brands_in_answer`
telt daarom álle aanbieders inclusief het eigen merk; een vraag is meetbaar zodra er één
aanbieder genoemd wordt, wie dat ook is.

**Correctie 2 — het rolfilter maakt het probleem grόter dan gedacht.** De mention-classificatie
pikt naast bedrijven ook gewone woorden op als entiteit: bij Coolblue "voorlader", "bovenlader",
"wasmachine", "fabrieksgarantie"; bij Van der Valk "hotel", "locatie", "vergaderlocatie". Die
zijn correct als `niet_relevant` geclassificeerd en tellen dus niet als aanbieder. Steekproef op
alle gevallen die daardoor omslaan bevestigt dat het zonder uitzondering echte rommel is; de
enige drie randgevallen (Adobe Creative Suite, Chrome OS, skodafinancialservices.nl) zijn
terecht uitgesloten. **Gevolg: de kwaliteitsanalyse onderschatte het probleem** — die telde
"voorlader" nog als merk mee. De werkelijke cijfers:

| Bedrijf | Beoordeeld | Merkloos | Meetbaar | Score vóór → ná | Gewogen vóór → ná |
|---|---|---|---|---|---|
| Coolblue | 22 | **10 (45%)** | 12 | 36 → **67** | 52 → **68** |
| Bol | 29 | **12 (41%)** | 17 | 17 → **29** | 17 → **24** |
| Fysi-Unique | 30 | **13 (43%)** | 17 | 10 → **18** | 10 → **18** |
| HEMA | 30 | 3 (10%) | 27 | 10 → **11** | 12 → **12** |
| Van der Valk | 30 | **17 (57%)** | 13 | 7 → **15** | 8 → **18** |

De scores gaan fors omhoog omdat de klant niet langer wordt afgerekend op vragen waarop geen
enkel bedrijf genoemd wordt. HEMA verandert nauwelijks — daar noemt de AI vrijwel altijd wél
aanbieders, en die score van 10 was dus al eerlijk. Dat verschil tussen HEMA en Van der Valk is
precies het inzicht dat R2 toevoegt: bij de één is onzichtbaarheid een probleem, bij de ander
een eigenschap van de markt.

**Verificatie R2.4:** na één meetperiode staat elke vraag op `ja` of `onbekend`, geen enkele op
`nee`. Correct — `nee` vereist twee metingen zonder aanbieder, dus er wordt nu nog niets
overgeslagen. Dat is pas bij periode 2 te toetsen.

**Nog open:** de scores van de vijf testanalyses zijn met SQL bijgewerkt volgens exact dezelfde
logica als de code. Zodra er een nieuwe meetronde draait, moet de code dezelfde waarden
opleveren — dat is de sluitende bevestiging.

---

## R3 — Zichtbaarheidsprofiel

**De kern** (§2.3–2.5): `position` is 100% gevuld en wordt nergens gebruikt; geciteerd worden
telt niet mee terwijl Fysi-Unique vaker geciteerd (4×) dan genoemd (3×) wordt; sentiment levert
in 650 rijen geen enkele `negative` op.

### R3.1 — Rol in plaats van sentiment

**Migratie `0029`:**
```sql
alter table public.tracking_run_mentions
  add column if not exists mention_role text;  -- 'eerste_aanbeveling' | 'een_van_meerdere' | 'zijdelings'
```
`sentiment` blijft voorlopig staan (additief principe) maar wordt niet meer gevuld of getoond.

**Bestanden:** `lib/schemas/mention.ts`, `lib/openai/mention-prompt.ts`,
`lib/pipeline/measure.ts`, `scripts/eval-mention.ts`.

**Implementatie**

1. Vervang `sentiment` in het `Mention`-schema door `role` met de drie waarden.
2. Werk `buildMentionUser` bij: leg uit wat de drie rollen betekenen. **Let op de waarschuwing
   bovenaan `mention-prompt.ts`** — dit is de meest load-bearing prompt van het product, en
   `scripts/eval-mention.ts` moet exact dezelfde prompt testen.
3. Draai `npm run eval:mention` vóór en ná de wijziging om te bevestigen dat `mentioned` en
   `position` er niet op achteruitgaan.

**Verificatie:** hermeet 3b over de opgeslagen `raw_response` van één analyse (~$0,005 — 3a wordt
niet herhaald). Verwacht: alle drie de rollen komen voor.

### R3.2 — Positie- en citatie-aggregatie

**Migratie `0029`** (zelfde bestand):
```sql
alter table public.visibility_scores
  add column if not exists avg_position       numeric,
  add column if not exists citation_count     integer,
  add column if not exists first_mention_count integer;
```

**Bestanden:** `lib/pipeline/measure.ts` (`computeAggregates`).

**Implementatie**

1. `avg_position`: gemiddelde positie over de runs waarin het eigen merk genoemd wordt.
2. `citation_count`: aantal runs waarin het eigen domein voorkomt in `cited_sources` van welke
   mention dan ook. Domeinvergelijking via de bestaande `lib/offsite/domain.ts`-helper, en
   `utm_source`-achtige parameters negeren.
3. `first_mention_count`: aantal runs met `mention_role = 'eerste_aanbeveling'`.
4. Zelfde drie waarden per concurrent in `competitor_breakdown`, zodat vergelijken mogelijk is.

**Verificatie:** herbereken over de vijf analyses. Verwacht (§2.5): Coolblue `citation_count` 4,
Fysi-Unique 4, overige 0.

### R3.3 — UI: het profiel

**Bestanden:** `app/(app)/analyses/[id]/score-panel.tsx`, `_chapters/stand.tsx`.

**Implementatie:** vier meetbare dimensies onder het hoofdgetal — genoemd, gemiddelde positie,
geciteerd, eerste aanbeveling — elk met de concurrentvergelijking ernaast. Ontwerp volgens
[`designsystem.md`](./designsystem.md).

**Klaar wanneer:** de klant kan zien dat hij bijvoorbeeld "even vaak genoemd wordt als
concurrent X, maar structureel later in het antwoord".

---

### ✅ R3 opgeleverd — en een kapot veld gevonden dat al maanden meeliep

Migratie `0029_zichtbaarheidsprofiel.sql` toegepast op productie. Code in
`lib/schemas/mention.ts`, `lib/openai/mention-prompt.ts`, `lib/pipeline/measure.ts`, nieuw
`lib/pipeline/position.ts`, `scripts/eval-mention.ts` en `score-panel.tsx`. 12 nieuwe tests.

**`position` was onbruikbaar en niemand wist het.** Het veld zat vanaf de eerste migratie in
het schema, maar de prompt legde nergens uit hóé er geteld moest worden. Het model deed dus
maar wat. Verdeling over de eerste vijf analyses:

| Positie | Aantal vermeldingen |
|---|---|
| **−1** | 2 |
| **0** | **215** |
| 1 t/m 10 | 304 |

Dat is geen conventie maar een mengsel van 0-based en 1-based, plus een enkele onzinwaarde.
Zolang het veld nergens gebruikt werd viel dat niet op — en R3 wilde het juist gaan gebruiken.
Twee ingrepen: de prompt zegt nu expliciet *"tel vanaf 1, gebruik nooit 0 of negatief"*, en
`normalizePosition()` is het vangnet daaronder. Onbruikbare waarden worden `null`, niet
verschoven of gegokt: uit een mengsel is achteraf niet te herleiden of "0" *eerste plek* of
*geen idee* betekende, en onbekend is een betere waarde dan een verkeerde.

**Gevolg voor de historie:** `avg_position` en `first_mention_count` blijven leeg voor de
bestaande metingen. Ze zijn niet met terugwerkende kracht te redden — daarvoor zou de
3b-beoordeling opnieuw moeten draaien. Vanaf de eerstvolgende meting kloppen ze.

**`citation_count` kon wél met terugwerkende kracht**, want dat komt uit `cited_sources` en dat
veld is altijd betrouwbaar geweest:

| Bedrijf | Genoemd in tekst | Eigen site als bron geciteerd |
|---|---|---|
| Coolblue | 8 | **5** |
| Fysi-Unique | 3 | **4** |
| Bol / HEMA / Van der Valk | 5 / 3 / 2 | 0 |

Fysi-Unique wordt dus vaker geciteerd dan genoemd. Dat was tot nu toe volledig onzichtbaar,
terwijl het de link is waarop iemand doorklikt.

**Sentiment is uitgezet.** In 650 rijen kwam `negative` geen enkele keer voor, en het bleek
bovendien **nergens in de applicatie getoond te worden** — het kostte bij elke meting
modelaandacht zonder ooit iets te zeggen. `mention_role` neemt zijn plaats in
(`eerste_aanbeveling` / `een_van_meerdere` / `zijdelings`). De kolom `sentiment` blijft bestaan
voor de historie, maar wordt niet meer gevuld.

**Let op bij R3.1:** `lib/openai/mention-prompt.ts` is de meest load-bearing prompt van het
product, en `scripts/eval-mention.ts` is meegewijzigd zodat de evaluatie exact dezelfde prompt
blijft toetsen. Draai `npm run eval:mention` vóór en ná de eerstvolgende echte meting om te
bevestigen dat `mentioned` en `position` er niet op achteruit gaan — dat kost een paar cent en
is de enige manier om dit hard te maken.

---

## R4 — Concurrent-intelligence

**De kern** (§2.6): de klant ziet alleen een aantal vermeldingen per concurrent. Bij HEMA staan
34 "merken" waarvan 24 met precies één vermelding. Nergens staat *waarom* een concurrent genoemd
wordt — precies wat doel 2 belooft en wat de content in doel 3 nodig heeft.

### R4.1 — Concurrent-snoei

**Bestanden:** `lib/pipeline/measure.ts` (`computeAggregates`), UI-componenten.

**Implementatie:** alleen entiteiten met ≥2 vermeldingen óf in de top 8 komen in
`competitor_breakdown`. De rest gaat naar een aparte, ingeklapte "ook genoemd"-weergave.

**Verificatie:** HEMA gaat van 34 naar ≤8 in de hoofdvergelijking.

### R4.2 — Concurrentprofilering (nieuwe pijplijnstap)

**Migratie `0030`:**
```sql
alter table public.competitor_breakdown
  add column if not exists attributes_json jsonb,
  add column if not exists why_summary     text;
```

**Bestanden:** nieuw `lib/pipeline/competitor-intel.ts`, nieuw
`lib/schemas/competitor-profile.ts`, `lib/jobs/types.ts`, `lib/jobs/handlers.ts`.

**Implementatie**

1. Nieuw jobtype `profile_competitors`, ingepland door `aggregate_week` ná `computeAggregates`
   en vóór `generate_report`. Het rapport heeft de uitkomst nodig.
2. Eén call (`gpt-4.1-mini`, geen web_search, temperatuur 0,2) over de antwoordfragmenten waarin
   de top-concurrenten genoemd worden. Per concurrent: op welke eigenschappen wordt hij genoemd
   (prijs, locatie, specialisme, snelheid, beschikbaarheid, reviews, assortiment), met per
   eigenschap een letterlijk citaat als bewijs.
3. Output naar `attributes_json` + een leesbare `why_summary`. Ruwe output bewaren
   (`abcplan.md` §5).
4. Zware taak → toevoegen aan `HEAVY_JOB_TYPES`.

**Verificatie:** draai voor Fysi-Unique (~$0,005). Verwacht een uitspraak in de trant van *"Fysio
Atelier wordt in 8 vragen genoemd, vrijwel altijd om zijn sportspecialisatie en centrale
ligging"*, met citaten die letterlijk in de opgeslagen antwoorden voorkomen.

### R4.3 — Doorgeven aan rapport en content

**Bestanden:** `lib/pipeline/report.ts`, `lib/pipeline/content.ts`.

**Implementatie**

1. `why_summary` en `attributes_json` mee in de B1/B2-invoer, zodat het rapport kan zeggen
   waaróp de klant verliest.
2. Mee in de contentinvoer als expliciete lat: *"de concurrent wordt genoemd om zijn
   sportspecialisatie — jouw pagina moet daar minstens zo concreet in zijn."* De harde regel dat
   concurrenten nooit bij naam in klantcontent staan blijft onverkort gelden; alleen de
   *eigenschap* gaat mee, nooit de naam.

**Verificatie:** controleer dat er geen concurrentnaam in de contentinvoer lekt — bestaande
`redactCompetitors`/`containsCompetitor` uit `lib/pipeline/redact.ts` hergebruiken.

---

### ✅ R4 opgeleverd — en een derde soort markt ontdekt

Migratie `0030_concurrent_intelligence.sql` toegepast op productie. Nieuw:
`lib/pipeline/competitor-intel.ts`, `lib/schemas/competitor-profile.ts`, jobtype
`profile_competitors` (geketend tussen aggregatie en rapport). Aangepast: `report.ts` (het
"waarom" gaat mee de gap-analyse in), `content.ts` (de eigenschappen als lat) en
`score-panel.tsx`.

**De snoei doet wat hij moet doen:**

| Bedrijf | Getoond vóór | Getoond ná | Met 1 vermelding | Profileerbaar (≥2) |
|---|---|---|---|---|
| HEMA | 33 | **8** | 24 | 9 |
| Bol | 29 | **8** | 21 | 8 |
| Fysi-Unique | 19 | **6** | 13 | 6 |
| Van der Valk | 18 | **0** | 18 | **0** |
| Coolblue | 11 | **2** | 9 | 2 |

**Afwijking van het plan — een derde geval.** Het plan kende twee situaties: er zijn
concurrenten, of er zijn er geen. Van der Valk bleek een derde: **18 concurrenten, allemaal
precies één keer genoemd.** Mijn eerste regel toonde dan de "top 3", maar dat suggereert een
rangorde die er niet is — en de bijschrift "één vermelding is toeval" spreekt zichzelf tegen als
je er tóch drie laat zien.

Dat is geen weergaveprobleem maar een bevinding: er is in die markt geen vaste favoriet. De
kaart zegt dat nu met zoveel woorden — *"de AI noemde 18 verschillende partijen, elk één keer.
Er is hier dus geen vaste favoriet die je moet verslaan; dat maakt het makkelijker om er zelf
één te worden."* Voor Van der Valk is dat waardevoller dan welke balkengrafiek dan ook.

**Waarom de eigenschappen een gesloten lijst zijn.** `COMPETITOR_ATTRIBUTES` is vast (prijs,
locatie, specialisme, assortiment, snelheid, beschikbaarheid, service, reputatie, ervaring,
duurzaamheid) en geen vrije tekst. Bij de promptgeneratie liep het vrije `cluster`-veld juist uit
de hand — daar kwam één cluster per vraag uit, mét modelruis als `volumeEstimate: 75` ín het
veld (zie R0.3). Een vaste set houdt de uitkomsten vergelijkbaar tussen concurrenten én tussen
periodes, en dat is wat een klant nodig heeft om te zien of hij terrein wint.

**Naar de content gaat alleen de eigenschap, nooit de naam.** De schrijfprompt krijgt "de AI
noemt anderen op: locatie, specialisme" als lat, niet wie dat zijn. De harde regel dat
klantcontent nooit een concurrent noemt blijft daarmee onaangetast.

**Nog open:** de profilering zelf is nog niet gedraaid — dat vereist een werker met een
API-sleutel. Van de vijf testanalyses zijn er vier profileerbaar (Van der Valk niet, zie boven).
Kosten: ~$0,005 per analyse.

---

## R5 — Contentbriefing als klantgate

**Dit is de uitwerking van een bestaande spec.** [`contentbriefing.md`](./contentbriefing.md)
beschrijft deze stap volledig (halte 5b), en het datamodel is al toegepast in migratie `0024`:
`fact_requests` heeft `scope`, `kind`, `answer_type`, `options`, `claim_key`, `fact_ref`,
`verify_after`; `content_pieces` heeft `claims_json`, `briefing_snapshot_json`,
`brief_instruction`, `source_coverage`; en `content_status` kent de waarde `briefing`.

**In onze vijf testanalyses stond geen van die kolommen gevuld** — de code ontbreekt dus nog.
R5 is het implementeren van die spec; **volg `contentbriefing.md` §3, §9 en §13 als
bronwaarheid** en werk dit blok bij als de spec afwijkt.

### R5.1 — Feitenindex + claim-audit

Volgens `contentbriefing.md` §3.1–3.4.

**Bestanden:** nieuw `lib/pipeline/briefing.ts`, nieuw `lib/schemas/claim-audit.ts`,
`lib/jobs/types.ts`, `lib/jobs/handlers.ts`.

**Implementatie**

1. Nieuw jobtype `content_brief`, ingepland door de generate-route in plaats van direct
   `content_draft`.
2. Feitenindex opbouwen (geen AI-call): `proof_points`, beantwoorde `fact_requests`,
   `topic_research`, en de bestaande paginatekst bij `verbeteren`.
3. Claim-audit (één mini-call): welke beweringen zou de pagina moeten doen, en welke daarvan zijn
   nog niet onderbouwd? Vaste slots per contenttype erbij (§3.3).
4. Openstaande vragen wegschrijven als `fact_requests` met `scope`, `kind` en `answer_type`,
   ontdubbeld op `claim_key` — de unieke index uit `0024` doet dat werk al.
5. `content_pieces`-rij aanmaken met `status = 'briefing'` en `briefing_snapshot_json` gevuld.

**Verificatie:** draai voor één Fysi-Unique-aanbeveling (~$0,003). Verwacht: 3–6 vragen, elk
herleidbaar naar een concrete claim, en geen dubbele vraag met een al beantwoorde
`fact_request`.

### R5.2 — Briefingscherm

Volgens `contentbriefing.md` §8.

**Bestanden:** nieuw `app/(app)/analyses/[id]/bibliotheek/[pieceId]/briefing.tsx` (of eigen
route), nieuwe API-route voor het beantwoorden van vragen.

**Implementatie**

1. De klant ziet: wat er geschreven gaat worden, welke doelvraag het moet winnen, welke feiten we
   al hebben, en de openstaande vragen — met per vraag het juiste invoertype (`answer_type`).
2. Verplicht/optioneel volgens §6; overslaan mag, maar dan wordt de claim niet gemaakt in plaats
   van verzonnen.
3. Knop "Schrijf de pagina" plant pas dán `content_draft` in.
4. Mobiel expliciet meenemen — dit is na het conceptscherm het tweede informatiedichte scherm
   (`designsystem.md` §C).

**Verificatie:** volledige doorloop voor één pagina, inclusief het overslaan van een optionele
vraag.

### R5.3 — Schrijfcontract

Volgens `contentbriefing.md` §9.

**Bestanden:** `lib/pipeline/content.ts`.

**Implementatie**

1. De schrijfcall krijgt de bevestigde feiten als **enige** toegestane bron voor concrete
   beweringen, plus expliciet welke claims *niet* onderbouwd zijn en dus niet gemaakt mogen
   worden.
2. `claims_json` vullen: per bewering in de tekst de bron (`fact_ref`).
3. `source_coverage` berekenen: welk deel van de concrete beweringen herleidbaar is.
4. De redactiestap (`CRITIQUE_SYSTEM`) controleert hierop mee.

**Verificatie:** genereer één pagina voor Fysi-Unique (~$0,05) en controleer elke concrete
bewering handmatig tegen `claims_json` — dezelfde methode als de audit in `contentbriefing.md`
§1. Doel: **nul verzonnen feiten**, tegen 5 verzinsels in de Udenhout-test.

---

## R6 — Betrouwbaarheid en grondstofbewaking

### R6.1 — Gelaagd hermeten

**Probleem** (§5, kwaliteitsanalyse): elke vraag wordt één keer gemeten; de 95%-marge is bij 30
vragen ongeveer ±18 punten. Een verschil tussen twee periodes is dus meestal ruis.

**Migratie `0031`:**
```sql
alter table public.tracking_runs
  add column if not exists repeat_index integer not null default 0;
```
De bestaande unieke sleutel (analyse, prompt, periode, purpose) moet `repeat_index` mee gaan
nemen — **let op: dit raakt de idempotentie van `measureOnePrompt`**, dus zorgvuldig aanpassen.

**Bestanden:** `lib/jobs/queue.ts`, `lib/pipeline/measure.ts`, `lib/stats/uncertainty.ts`.

**Implementatie**

1. De 8 zwaarstwegende vragen per analyse worden 3× gemeten, de rest 1×.
2. Aggregatie middelt per vraag vóór het optellen — anders wegen herhaalde vragen zwaarder.
3. `score_stderr` houdt rekening met de herhalingen.

**Kosten:** +16 metingen per periode ≈ **+$0,41**, deels gecompenseerd door R2.4 (−$0,18).
Maak het aantal herhalingen configureerbaar in `lib/config.ts` zodat het per omgeving te temperen
is.

**Verificatie:** meet Fysi-Unique's top-8 driemaal (~$0,42) en bepaal de spreiding. Dat getal is
tegelijk het antwoord op de vraag hoe betrouwbaar de huidige eenmalige meting is — waardevolle
kennis, los van deze stap.

### R6.2 — Inventariskwaliteitspoort

**Probleem** (§3.4): Bol had 1 pagina in de inventaris, HEMA 40 productpagina's. In beide
gevallen degradeert het rapport zonder foutmelding.

**Migratie `0031`** (zelfde bestand):
```sql
alter table public.profiles
  add column if not exists inventory_quality_json jsonb;
```

**Bestanden:** `lib/crawler.ts`, `lib/pipeline/prepare-profile.ts`, `lib/pipeline/report.ts`,
`app/(app)/profielen/[id]/page.tsx`.

**Implementatie**

1. Na de crawl een kwaliteitsoordeel: aantal pagina's, aandeel vermoedelijke productpagina's,
   aandeel met bruikbare tekst.
2. **Generieke productpagina-heuristiek** naast de bestaande Shopify-/Yoast-patronen: URL-diepte
   ≥4 segmenten, een artikelnummer-achtig patroon in het laatste segment
   (`-200302.html` bij HEMA), of prijsindicatoren in de tekst.
3. Onder de drempel → waarschuwing op de profielpagina met een concrete handeling ("vul de
   sitemap-URL in" / "verhoog het paginamaximum"), en een expliciete vermelding in de
   rapportinvoer dat de nieuw/verbeteren-beslissing op dunne grond staat.

**Verificatie:** Bol moet als "onvoldoende" gemarkeerd worden (1 pagina), HEMA als "vervuild"
(overwegend productpagina's), de andere drie als voldoende.

### R6.3 — Brontype als signaal

**Probleem** (§3.1): bij Fysi-Unique zijn 8 van de 10 meest geciteerde bronnen **homepages**, geen
inhoudelijke pagina's. Als de AI het bedrijf zelf citeert en niet een diepe contentpagina, dan is
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

**Verificatie:** Fysi-Unique moet als "overwegend homepages" uitkomen (8 van 10) en het rapport
moet daar aantoonbaar anders op adviseren dan nu.

---

## 7. Kostenoverzicht

Basis: $0,0259 per meting (gemeten, 141 calls). Huidige situatie: **$0,83 per analyse**.

| Stap | Effect per analyse |
|---|---|
| R1.1–R1.3 | +$0,002 (rijkere rapportprompt) |
| R2.4 | −$0,18 per vervolgperiode |
| R4.2 | +$0,005 |
| R5.1 | +$0,003 per pagina; bespaart een mislukte `gpt-4.1`-ronde (~$0,05) |
| R6.1 | +$0,41 per periode (configureerbaar) |
| Overige stappen | neutraal |

**Eindbeeld:** nulmeting ongeveer gelijk (~$0,85); vervolgperiode met R6.1 aan ongeveer $1,06, met
R6.1 uit ongeveer $0,65 — dus lager dan nu. De kostenparagraaf in `abcplan.md` §10 (die nog
uitgaat van $0,356) moet bijgewerkt worden zodra R2.4 en R6.1 staan.

---

## 8. Wat dit plan niet dekt

- **Meerdere meetperiodes in de praktijk.** Alles in de regressieset is nulmeting; trend,
  periodevergelijking en de rapport-mail zijn ongetest. Verdient een eigen testronde zodra R2 en
  R6 staan.
- **Een tweede LLM-engine.** Blijft buiten scope (`abcplan.md` §13).
- **CMS-publicatie (fase D).** Ongewijzigd: de klant publiceert zelf.
- **De leerlus.** Terugkoppelen van gemeten effect naar toekomstige aanbevelingen is pas zinvol
  bij tientallen gepubliceerde pagina's. Richting, geen sprint.
