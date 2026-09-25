# De contentketen opnieuw: uitvoeringsplan

**Opgesteld:** 25 september 2026, na een gesprek met de eigenaar en aangescherpt met de feedback van
een senior collega (zelfde dag). **Status: besloten, niets gebouwd.** De voortgang per werkpakket staat
in §12; werk die tabel bij in dezelfde commit als het werk.

Dit document vervangt de keten uit `contentpijplijn-publicatiewaardig.md`. Dat document verdwijnt in
WP1 samen met de code die het beschrijft.

---

## 0. Lees dit eerst (voor elke sessie die hieraan werkt)

**Het principe waar alles uit volgt:**

> Maak de keten niet slimmer door meer beslissingen toe te voegen. Maak hem slimmer door de schrijver
> betere informatie te geven. Minder intelligentie rondom het schrijven, meer intelligentie vóór en
> tijdens het schrijven.

De vorige keten is mislukt doordat elke sessie er een stap, een regel of een beoordelaar bij bouwde,
tot de schrijver gevangen zat. De regels hieronder zijn er om dat te voorkomen.

1. **Lees eerst `CLAUDE.md`, dan dit hele document.** Niet alleen het werkpakket waar je aan
   begint.
2. **Werk precies één werkpakket per sessie**, in de volgorde van §12. Begin niet aan het volgende
   voordat de "klaar als"-lijst van het vorige helemaal gehaald is.
3. **Bouw niets wat niet in dit document staat.** Geen extra AI-aanroep, geen extra controle, geen
   extra taaksoort, geen extra kolom, geen extra regel in de schrijfopdracht. Denk je dat iets nodig
   is, stop dan en vraag de eigenaar. Een toevoeging komt eerst als besluit met datum in §2, pas
   daarna in code.
4. **De verboden in §3 zijn absoluut.** Ze staan er omdat ze in de vorige keten precies zo zijn
   ingeslopen.
5. **Is de kwaliteit tegenvallend?** Verander dan de schrijfopdracht of de invoer van de schrijver
   (WP9). Bouw geen nieuwe stap. Dat is de hele les van de vorige keten.
6. **Gebruik geen oude contentcode.** De nieuwe keten staat in `lib/pagina/` en mag alleen importeren
   uit de lijst in §7.3. Wat daar niet op staat, schrijf je opnieuw en eenvoudig, of je laat het weg.
   Geen compatibiliteitslaag, geen vlag "oude of nieuwe keten", geen hergebruikte kolom met een
   nieuwe betekenis.
7. **Klopt iets in dit document niet meer met de code?** Pas eerst dit document aan (met datum en
   reden), dan pas de code.
8. **Per werkpakket één commit (of een paar),** met `npx tsc --noEmit`, `npm run test:unit`,
   `npm run test:chain` en `npm run build` groen. Werk §12 bij in dezelfde commit.

---

## 1. Het doel en de keten op één whiteboard

**Doel:** een pagina waarvan de ondernemer denkt "dit zet ik zo op mijn site". De keten vraagt zich
niet af "hoe komen we hoger in Google", maar: **als iemand deze vraag heeft, wat is dan de beste
pagina die hij zou kunnen lezen?** Wat daarvoor nodig is, hebben we zelf in de hand: de zoekintentie
volledig beantwoorden, de deelvragen, concrete antwoorden, informatie die alleen dit bedrijf heeft,
een duidelijke opbouw, natuurlijke taal, goede metadata en gestructureerde gegevens. Een
AI-assistent citeert zo'n pagina omdat hij hem kan begrijpen en vertrouwen, niet omdat hij "naar GEO
klinkt".

```
CONTENTVOORSTEL        bestaat: een pagina in het contentplan
      ↓
CONTENT BRIEF          één AI-aanroep met zoeken op het web + bedrijfsinformatie uit code
      ↓
KLANTINPUT             de open vraag (altijd) + hooguit 3 gerichte vragen (alleen als iets echt ontbreekt)
      ↓
SCHRIJVEN              één sterke schrijfbeurt
      ↓
KWALITEITSCONTROLE     code op harde beweringen + één beoordeling
      ↓
HOOGUIT 1x HERSCHRIJVEN  alleen als het duidelijk niet goed is
      ↓
KLANT                  leest, bevestigt gele zinnen, keurt goed
```

Drie tot vier AI-aanroepen per pagina. Binnen een stap mag het technisch ingewikkeld zijn; de
verantwoordelijkheden blijven simpel.

**Waarom opnieuw.** De vorige keten telde zeven taaksoorten voor content, ongeveer 12.700 regels
code en 12 tot 15 AI-aanroepen per pagina. Elke stap haalde alleen weg. De blinde lezer gaf 4,1,
daarna 4,9, daarna 5 en 4, bij een doel van 6,5. Het resultaat was een opsomming van feiten.

**Maatstaf:** zou de ondernemer deze pagina zonder aanpassingen publiceren? We meten door twee teksten
naast elkaar te leggen (de blinde lezer en de eigenaar zelf), nooit met een los cijfer: dat schommelt
6 punten op dezelfde tekst (`kwaliteitsdoorlichting/blinde-lezer-toets/`).

---

## 2. Besluiten van de eigenaar (vast, niet opnieuw bespreken)

| # | Besluit | Datum |
|---|---|---|
| B1 | Een harde bewering zonder bron houdt de pagina niet tegen. Na de controle wordt hij geel op het goedkeuringsscherm; de ondernemer bevestigt of past aan | 25 september 2026 |
| B2 | Alle klantdata ging weg. Uitgevoerd op 25 september 2026: de 6 merken met alles eronder. De klantaccounts, de beheerders, de Sales-module, het zijproject en de kostenlog (`ai_calls`, losgemaakt van de merken) staan er nog | 25 september 2026 |
| B3 | Elke pagina krijgt vast één open vraag (tekst in §6.2). Het antwoord geldt alleen voor die pagina, tenzij de ondernemer aangeeft dat het voor zijn hele bedrijf geldt | 25 september 2026 |
| B4 | Kwaliteit gaat voor, met één grens: onder $0,50 per pagina aan AI-kosten | 25 september 2026 |
| B5 | Er wordt pas geschreven als elke vraag van de pagina beantwoord of overgeslagen is. Geen uiterste datum. Overslaan telt als antwoord | 23 september 2026 (blijft) |
| B6 | Een maand vrijgeven start de voorbereiding van alle pagina's van die maand. Schrijven begint op zijn vroegst 10 dagen voor de publicatiedatum | 23 september 2026 (blijft) |
| B7 | Eén route naar een geschreven pagina: het contentplan. "Schrijf deze pagina" en "genereer alles" in een cluster worden "Zet in het plan" | 25 september 2026 |
| B8 | Eerst de oude contentcode weghalen, dan de nieuwe bouwen. Er is geen periode waarin beide bestaan. Tot WP6 kan de app tijdelijk geen pagina's schrijven; er zijn geen klanten die dat merken | 25 september 2026 |
| B9 | De schrijver hoeft geen bronnen aan te wijzen. Hij krijgt de opdracht niets te verzinnen; de controle daarop gebeurt daarna, buiten het schrijven | 25 september 2026 |
| B10 | Geen woordbudget, ook niet als richtgetal. Het onderwerp bepaalt de lengte | 25 september 2026 |
| B11 | De adviseur mag de open vraag invullen namens de ondernemer, in diens woorden | 25 september 2026 |
| B12 | De plaatsregel (§13.1) blijft een besluit, maar wordt pas na deze ombouw gebouwd | 25 september 2026 (regel zelf: 25 september 2026) |

Wat hiermee vervalt uit eerdere besluiten: de inputpoort van 40 en 70 procent met de keuze "algemeen
schrijven of laten vallen", en de verdeling van het redactionele werk over strategie, schrijven en
eindredactie (`contentpijplijn-publicatiewaardig.md` §2).

---

## 3. Verboden (absoluut)

1. **Hooguit drie soorten AI-aanroep per pagina, plus één herschrijving:** brief, schrijven,
   beoordeling, en hooguit één herschrijving. Een vierde soort bestaat niet.
2. **Niets houdt een geschreven pagina tegen.** Vóór het schrijven wachten we alleen op de vragen en de
   datum (B5, B6). Daarna gaat de pagina altijd naar de klant; harde beweringen zonder bron worden geel
   (B1), de rest is advies.
3. **Geen automatische reparatielus.** Beoordelen, herschrijven, klaar. Nooit een tweede beoordeling
   of een tweede automatische herschrijving.
4. **Geen strategie, contract, verplichte secties, sectiegewichten, voorrangsfeiten, inputpoort,
   onzekerheidspercentage, aparte FAQ-selectie, eigenaarstoets, merkstemtoets, zinnenbeoordelaar of
   woordbudget.** Ook niet onder een andere naam.
5. **Geen cijfer als oordeel.** De beoordeling zegt "goed" of "niet goed" en noemt punten.
6. **Code controleert alleen harde beweringen en mechanische regels** (§6.5). Een instructie over
   stijl, toon of lengte krijgt géén vangnet in code. Dit is de nieuwe lezing van conventie 1 in
   CLAUDE.md.
7. **Geen tweede route naar het schrijven.** Alleen het contentplan plant `pagina_schrijven` in.
8. **De open vraag wordt nooit door een model gemaakt en nooit weggelaten.** Code zet hem klaar.
9. **Geen import van oude contentcode** in `lib/pagina/` (§0 regel 6, §7.3). Een test bewaakt dit.

---

## 4. Buiten de scope (niet aanraken, behalve waar genoemd)

- Onboarding en merkonderzoek (`prepare-profile`, `offering`, `market`, `llm-baseline`, `synthesis`).
  Uitzondering: het tekstvak "Verhalen" (WP4).
- Meting, rapport, aanbevelingen, clusters, analytics.
- Het feitenregister en de conflictcontrole (`feitenregister.ts`, `fact-classify.ts`,
  `conflict-detect.ts`, `conflict-judge.ts`). Uitzondering: de koppeling naar de oude
  paginastrategie gaat eruit (WP1).
- Publiceren, de publicatiecontrole en de nameting na 14 en 28 dagen.
- De Sales-module en het zijproject Solliciteren.
- Het contentplan zelf (maanden, slepen, vrijgeven, data), behalve wat WP1 en WP6 noemen.

---

## 5. De vier soorten informatie voor de schrijver

De schrijver krijgt precies vier blokken, in deze volgorde, en niets anders:

| Blok | Wat | Waar het vandaan komt |
|---|---|---|
| **A. Bedrijfskennis** | Wat we zeker weten over het bedrijf: diensten, plaatsen, prijzen, werkwijze, ervaring, certificeringen, wat het anders doet, de verhalen, de bezwaren van klanten met het antwoord van de ondernemer, de stem | Code, geen AI: het feitenregister (gefilterd per pagina), `profiles.verhalen`, `sales_objections`, de stemvelden, de antwoorden op eerdere merkbrede vragen |
| **B. Klantinput** | Wat de ondernemer over déze pagina vertelde | Het antwoord op de open vraag, letterlijk, plus de antwoorden op de gerichte vragen |
| **C. Externe kennis** | Wat een goede pagina over dit onderwerp inhoudelijk moet behandelen: uitleg, stappen, aandachtspunten, veelgestelde vragen, wat concurrenten goed doen en waar gaten zitten | De content brief (§6.1) |
| **D. Zoekintentie** | Wat de bezoeker probeert te bereiken, in zijn eigen woorden | De content brief, gevoed door de doelvragen van de meting |

Bij "verbeteren" komt daar de huidige tekst van de pagina bij. Meer niet.

---

## 6. De onderdelen in detail

Alle nieuwe code staat in `lib/pagina/`. Eén bestand per verantwoordelijkheid.

### 6.1 De content brief (`pagina_brief`, één taak per pagina)

**Model:** `MODELS.content` (Sol), `webSearch: true`, werksoort `analytical`. Dit is de stap waar de
intelligentie vóór het schrijven zit, dus hier het sterke model. Werkt zoeken op het web niet op Sol,
gebruik dan `MODELS.quality` (Luna) en leg dat vast in §2.

**Invoer:** titel, paginasoort, `targetIntent`, `why`, de doelvragen uit de meting met de winnende
antwoorden (concurrentnamen weggehaald met `redactCompetitors`), merknaam, werkgebied, en blok A
(§5) zodat het model weet wat er al bekend is. Bij `verbeteren`: de huidige sitetekst, opgehaald met
`fetchExistingPage`.

**Uitvoer (zod-schema `ContentBrief`):**

```
zoekintentie: string                                   // in de woorden van de bezoeker
deelvragen: string[]                                   // wat hij verder wil weten
concurrentie: { goed: string[], gaten: string[] }      // zonder bedrijfsnamen
vakkennis: { uitleg: string, bron_url: string }[]
valkuilen: string[]                                    // wat klanten vaak verkeerd begrijpen
ontbreekt: {                                           // 0 tot 3; 0 is prima
  vraag: string, waarom: string,
  antwoord_type: "ja_nee"|"bedrag"|"getal"|"tekst_kort"|"tekst_lang"|"keuze",
  opties: string[] | null, merkbreed: boolean
}[]
```

De opdracht voor `ontbreekt`: alleen informatie over het bedrijf die de pagina echt nodig heeft en die
niet in blok A staat. Geen vraag over algemene vakkennis. Niets vragen is een goede uitkomst.

**Code daarna:** vakkennis zonder geldig `http`-adres valt weg. Bewaar in `content_pieces.brief_json`
één compact object: `{ onderzoek: <de uitvoer>, bedrijf: <de feiten die blok A vormden>, versie }`.
Maak van `ontbreekt` rijen in `fact_requests` (hooguit 3; een vraag die na normaliseren gelijk is aan
een al gestelde vraag van het merk valt weg; `pasSchrijfregelsToe()` over elke tekst). Staat er al een
`brief_json`, dan geen nieuwe aanroep (conventie 9). Daarna de schrijfpoort (§6.8).

**Bij definitief mislukken:** `brief_json` wordt `{ onderzoek: null, bedrijf: ..., versie }`; de pagina
gaat door met alleen de open vraag. Schrijven zonder onderzoek is minder goed, niet kapot.

**Bewust geaccepteerd:** pagina's van dezelfde maand krijgen elk hun eigen brief. Twee pagina's
kunnen daardoor een bijna gelijke vraag krijgen. Gelijke vragen vallen weg in code; een variant in
andere woorden niet. Dat kost de klant hooguit één keer overslaan, en is goedkoper dan een aparte
vragenstap.

### 6.2 Klantinput

**De open vraag** (B3), aangemaakt door code bij het starten van de voorbereiding, vóór de brief,
zodat hij er altijd is:

> **Wat wil je zelf op deze pagina vertellen?**
> Vertel wat jij belangrijk vindt dat een potentiële klant over {onderwerp} weet. Denk aan een
> typische situatie van een klant, een aanpak waar jullie trots op zijn, vragen die je vaak krijgt,
> voorbeelden uit de praktijk, dingen die klanten vaak verkeerd begrijpen, of wat jullie anders doen
> dan anderen.

- Rij in `fact_requests`: `scope = 'pagina'`, `kind = 'aanvulling'`, `answer_type = 'tekst_lang'`,
  `open_vraag = true`, `content_piece_ids = [pagina]`.
- Antwoord tot 3.000 tekens. Wordt niet naar `proof_points` gezet en niet in feiten geknipt; het gaat
  letterlijk naar de schrijver als blok B.
- Op het scherm altijd als eerste, met een groot tekstvak. Overslaan mag.

**De gerichte vragen:** hooguit drie, uit de brief (§6.1). Gewone vragen zoals nu: tot 500 tekens,
merkbreed als het model dat aangaf.

### 6.3 De verhalen van het merk (onboarding)

Eén tekstvak "Verhalen" in het gespreksscherm, dat `profiles.verhalen` vult. Hulptekst: twee of drie
typische klussen; hoe jullie werken, in je eigen woorden; welke bezwaren je altijd hoort en wat je dan
zegt; wat jullie bewust niet doen; waarom je ooit begon. Geen AI. Gaat mee in blok A van elke pagina.

### 6.4 Schrijven (`pagina_schrijven`)

**Model:** Sol, werksoort `redactioneel` (denktijd hoog), **altijd de achtergrondmodus**
(`startStructuredAchtergrond` en `haalStructuredOp`). Een aanroep met denktijd hoog duurde al 179 tot
359 seconden; de routelimiet is 300.

**Invoer:** blok A, B, C en D (§5), plus de titels van de andere pagina's van het merk (om overlap te
voorkomen), plus bij "verbeteren" de huidige sitetekst.

**De schrijfopdracht** staat in één bestand, `lib/pagina/schrijfopdracht.ts`, met een versienummer
(`SCHRIJFOPDRACHT_VERSIE`) dat bij de uitvoer bewaard wordt. Dit is het enige bestand waar je aan
draait om de kwaliteit te verbeteren. De kern, en niet meer dan dat:

> Je bent een ervaren vakschrijver en schrijft een pagina voor de eigen website van dit bedrijf.
> Schrijf de beste pagina die iemand met deze vraag zou kunnen lezen.
>
> Wees inhoudelijk volledig, natuurlijk, concreet en overtuigend. Beantwoord de vraag van de bezoeker
> meteen, en behandel daarna wat hij verder wil weten. Gebruik algemene vakkennis waar die helpt.
> Gebruik wat de ondernemer zelf vertelde: daar zit wat deze pagina anders maakt dan die van een
> concurrent.
>
> Gebruik bedrijfsinformatie betrouwbaar. Verzin geen bedrijfsclaims, cijfers, garanties, prijzen,
> resultaten, certificeringen, termijnen of andere concrete eigenschappen die niet uit de informatie
> hierboven blijken. Weet je iets niet, laat het dan weg; schrijf niet over wat je niet weet.
>
> Schrijf zo uitgebreid als nodig is om de vraag volledig en nuttig te beantwoorden. Voeg geen tekst
> toe alleen om langer te worden, en herhaal niets.
>
> Schrijf in de stem van dit bedrijf. Noem nooit een ander bedrijf bij naam. Schrijf als een vakman,
> niet als een AI die informatie afvinkt.

Daaronder alleen de vaste huisregels die niet over stijl gaan: de verboden onderwerpen en woorden van
het merk, de aanspreekvorm, en de verboden tekens uit `docs/schrijfstijl.md` §10.

**Uitvoer (zod-schema `Pagina`):**

```
titel: string
meta_titel: string
meta_beschrijving: string
tekst_markdown: string
faq: { vraag: string, antwoord: string }[]       // 0 tot 5, alleen als ze iets toevoegen
notitie_voor_ondernemer: string | null            // wat de schrijver nog had willen weten
```

Geen bronverwijzingen (B9).

**Code daarna:** mechanische reparatie (§6.5), gestructureerde gegevens (`structured-data.ts`,
`content-export.ts`), opslaan (`body_markdown`, `meta_title`, `meta_description`, `faq_json`,
`schema_jsonld`, `raw_json` met de volledige ruwe uitvoer en het versienummer), status `draft`, dan
`pagina_controle` inplannen.

### 6.5 De controle in code (puur, zonder `server-only`)

**Mechanische reparatie** (`lib/pagina/mechanisch.ts`): de verboden tekens via `stripProseDashes`,
metatitel en metabeschrijving via `heelMetatitel` en `heelMetabeschrijving`. Repareren, nooit
blokkeren.

**Harde beweringen** (`lib/pagina/harde-beweringen.ts`):
- `vindHardeBeweringen(tekst)`: per zin de harde tokens. Bedragen (€, euro), getallen met eenheid
  (jaar, maanden, weken, dagen, uur, procent, en een getal direct voor een zelfstandig naamwoord),
  jaartallen, en de woorden garantie, gegarandeerd, gecertificeerd, erkend, keurmerk, certificaat,
  lid van, altijd, nooit, binnen, 24/7, de beste, de goedkoopste, de grootste, de enige.
- Geen harde bewering: telefoonnummers (9 of meer cijfers), postcodes, huisnummers direct na een
  straatnaam.
- `zoekBron(token, bronnen)`: gedekt als het token voorkomt in blok A, B of de vakkennis van C, na
  normaliseren (`1.800` is `1800`, `3,5` is `3.5`, `€ 359` is `359 euro`). Een woord als "garantie" is
  gedekt als het in een bron staat samen met minstens één ander inhoudswoord van de zin.
- Uitkomst: per zin `gedekt` of `ongedekt`.
- **Minstens 30 testgevallen**, waaronder de valse alarmen uit §11 en de zinnen uit
  `kwaliteitsdoorlichting` die de vorige keten fout deed.

### 6.6 De kwaliteitscontrole (`pagina_controle`)

Eén taak: eerst de code (§6.5), dan één beoordeling.

**Model:** Sol, werksoort `judging`. **Rol:** een ervaren eindredacteur die weet wat de ondernemer
wil. **Invoer:** de tekst, blok A tot en met D, en de zinnen die de code als `ongedekt` vond.
**Twee vragen:**

- *Klopt het?* Staan er bedrijfsclaims, cijfers, prijzen, garanties, certificeringen of andere
  concrete beweringen in die niet uit de informatie blijken?
- *Is het goed?* Is de hoofdvraag meteen beantwoord; is de zoekintentie afgedekt; is het prettig en
  natuurlijk geschreven; is er genoeg diepgang; is er onnodige herhaling; voelt het als echte content
  en niet als AI-content; staat er iets in dat echt van dit bedrijf komt; heeft de lezer er iets aan?

**Uitvoer:**

```
oordeel: "goed" | "niet_goed"
verzonnen: { zin: string, waarom: string }[]          // letterlijke zinnen
punten: { waar: string, probleem: string, hoe: string }[]   // hooguit 5, concreet
```

**Code daarna:** herschrijven als het oordeel `niet_goed` is, of als er verzonnen of ongedekte
zinnen zijn. Anders: status `ready`, `needs_review = true`. Alles gaat in `content_pieces.controle_json`.
**Bij definitief mislukken:** geen herschrijving; de ongedekte zinnen van de code worden geel; status
`ready`.

### 6.7 Herschrijven (`pagina_herschrijven`)

**Model:** Sol, `redactioneel`, achtergrondmodus. **Invoer:** dezelfde als §6.4, plus de huidige tekst,
plus de punten en de verzonnen zinnen uit de controle. Of, als de klant om een aanpassing vraagt: de
notitie van de klant. **Opdracht:** dezelfde schrijfopdracht, met erbij "Hier is je vorige versie en de
feedback. Schrijf een betere versie."

**Code daarna:** mechanische reparatie en de harde beweringen opnieuw. De nieuwe versie blijft, tenzij
hij meer ongedekte zinnen heeft dan de vorige; dan blijft de vorige, en dat staat in `controle_json`.
Alle zinnen die daarna nog ongedekt zijn of door de controle als verzonnen gemeld waren en er nog
staan, worden geel. Status `ready`. **Geen tweede beoordeling, geen tweede herschrijving.**
Een aanpassing op verzoek van de klant maakt een nieuwe versie (`version + 1`, `supersedes_id`).

### 6.8 De schrijfpoort

Een pure functie in `lib/pagina/schrijfpoort.ts`, met twee regels: `brief_json` bestaat en de pagina
heeft nul open vragen (`openVragenVanPagina()`); en de schrijfdatum is bereikt (10 dagen voor
publicatie). Onbekend telt nooit als nul. Aangeroepen na de brief, na elk antwoord of overgeslagen
vraag (`probeerNaAntwoord`), en elke ochtend door de cron als vangnet.

### 6.9 Het goedkeuringsscherm

Op het paginascherm `/merk/[id]/strategie/bibliotheek/[paginaId]`, stand "Lees en keur goed". Een nieuw,
klein onderdeel `components/pagina/goedkeuren.tsx`; de oude bibliotheekcomponenten gaan in WP1 weg.

- De tekst **opgemaakt** (koppen, lijsten, links), niet als ruwe markdown.
- Bovenaan de notitie van de schrijver, als die er is.
- De gele zinnen geel in de tekst, met per zin "Klopt" en "Pas aan". Bevestigde zinnen gaan in
  `controle_json.bevestigd` via een nieuwe route
  `POST /api/profiles/[id]/paginas/[pieceId]/zinnen` (service role, eigenaarschapscontrole, alleen
  zinnen die echt geel zijn).
- De punten van de controle als "Wat we nog zien", inklapbaar.
- Eén hoofdknop "Keur goed", actief als elke gele zin bevestigd of aangepast is. Een tweede knop
  "Vraag een aanpassing" (tekstvak, start `pagina_herschrijven`). Handmatig bewerken van de tekst.
- Daarna de bestaande publicatiestappen (kopiëren naar de site, adres invullen).
- Geen cijfers, geen tabbladen met bevindingen.

---

## 7. Datamodel en code

### 7.1 Migratie `0115_contentketen_opnieuw.sql` (alleen toevoegen, idempotent)

Controleer eerst het volgende vrije nummer in `supabase/migrations/` en met `list_migrations`.

```sql
alter table content_pieces add column if not exists brief_json jsonb;
alter table content_pieces add column if not exists controle_json jsonb;
alter table fact_requests  add column if not exists open_vraag boolean not null default false;
alter table profiles       add column if not exists verhalen text;
```

`open_vraag` is een kolom en geen nieuwe `kind`, omdat `fact_requests_kind_check` een check-constraint
is die alleen te verruimen is door hem eerst te verwijderen (conventie 4). Werk `supabase/README.md` en
`lib/types/database.ts` bij.

### 7.2 Oude kolommen en tabellen

Blijven in de database staan (conventie 4), maar geen enkele code leest of schrijft ze nog:
`content_pieces.contract_json`, `dossier_json`, `strategy_json`, `edit_log_json`, `readiness_json`,
`quality_json`, `quality_verdict`, `quality_profile`, `writer_brief_json`, `proof_points_json`,
`claims_json`, `critique_raw_json`, `briefing_snapshot_json`, `write_mode`, `geaccepteerde_zinnen`,
`brief_instruction`; de tabellen `content_quality_runs` en `content_quality_reviews`. Een test in
`test-unit.ts` grept dat deze namen buiten `lib/types/database.ts` niet meer voorkomen.

### 7.3 Wat `lib/pagina/` mag importeren (en niets anders)

Algemene infrastructuur, geen contentlogica:

| Wat | Waar |
|---|---|
| Taken, wachtrij, dedupe, herhaalpogingen, "laatste van de batch" | `lib/jobs/queue.ts`, `lib/jobs/dedupe.ts`, `lib/jobs/types.ts` |
| AI-aanroepen, achtergrondmodus, modellen, werksoorten, kostenlog | `lib/openai/*` |
| Database | `lib/supabase/*`, `lib/types/database.ts` |
| Open vragen tellen | `openVragenVanPagina()` in `lib/open-questions.ts` |
| Schrijfregels op tekst naar de klant | `pasSchrijfregelsToe()` in `lib/schrijfregel-vangnet.ts` |
| Concurrentnamen weghalen | `redactCompetitors` in `lib/pipeline/redact.ts` |
| Huidige sitetekst ophalen | `fetchExistingPage` in `lib/pipeline/existing-page-fetch.ts` |
| Stem van het merk als tekst | `merkstemblok` in `lib/pipeline/stemvelden.ts`, `schoneWaardeproposities` in `lib/pipeline/waardeproposities.ts` |
| Verboden tekens, metalengtes | `stripProseDashes` in `lib/pipeline/dash-guard.ts`, `heelMetatitel` en `heelMetabeschrijving` in `lib/pipeline/metatitel.ts` |
| Gestructureerde gegevens, export naar de site | `lib/pipeline/structured-data.ts`, `lib/pipeline/content-export.ts` |

Een test in `test-unit.ts` leest alle bestanden in `lib/pagina/` en faalt bij een import die niet op
deze lijst staat.

### 7.4 Taaksoorten

`pagina_brief`, `pagina_schrijven`, `pagina_controle`, `pagina_herschrijven`. Eigen namen, zodat niets
verward wordt met de oude taken in de geschiedenis. Registreren in `JOB_TYPES`, de lijst met zware
taken, `lib/jobs/progress.ts` en `lib/jobs/dedupe.ts`. Handlers in één bestand
`lib/pagina/taken.ts`, aangeroepen vanuit `lib/jobs/handlers.ts`.

### 7.5 De stand van een pagina

`content_pieces.status`: `briefing` (voorbereiding en vragen), `draft` (schrijven en controle),
`ready` met `needs_review = true` ("Lees en keur goed"), daarna zoals nu. `lib/pagina-stand.ts` leidt
de stand af uit `brief_json`, het aantal open vragen en de status. De standen "keuze" en alles wat op de
inputpoort rust, gaan eruit.

---

## 8. Werkpakketten

Elk werkpakket: wat je doet, wat je niet doet, klaar als.

### WP1. Het oude weghalen (eerst, B8)
Eén of een paar commits, met de typecontrole als gids. Er zijn geen klanten; de app kan na dit
werkpakket tijdelijk geen pagina's schrijven.

**Weg (lib/pipeline):** `adviestoon`, `answer-scope`, `atom-verify`, `bewijspunten`, `briefing`,
`briefing-select`, `claim-extract`, `claim-judge`, `content`, `content-contract`, `content-coverage`,
`content-diff`, `content-gate`, `content-issues`, `content-panel`, `content-plan`,
`content-repair-decision`, `content-sections`, `contract-format`, `editorial-pass`, `evidence-weight`,
`explainer-verify`, `fact-atomise`, `faq-criteria`, `faq-selectie`, `faqblokken`, `feitbehoud`,
`input-coverage`, `input-gate`, `item-dossier`, `kernbewijs`, `klantcitaten`, `manual-edit-checks`,
`onzekerheid`, `page-strategy`, `paginavorm`, `quality-collect`, `quality-dimensions`,
`quality-groups`, `quality-issue`, `quality-profile`, `quality-repair`, `quality-run`,
`quality-score`, `readability`, `redactie-check`, `root-cause`, `sentences`, `similarity`,
`source-analysis`, `strategie-check`, `strategie-opdracht`, `strategie-taak`, `strategie-wacht`,
`version-compare`, `version-reason`, `vraag-judge`, `vraag-samenvoegen`, `writer-brief`.

**Voorwaardelijk weg** (ook buiten de contentketen gebruikt): `factbase`, `factcard` (gebruikt door
`synthesis`), `factstore`, `fact-merge`, `kerncijfers`, `lengtebudget`. Weg als niets buiten de
verwijderde lijst ze nog nodig heeft; anders blijven ze voor de onboarding en importeert
`lib/pagina/` ze niet.

**Weg (lib):** `content-input-gate.ts`, `content-final-gate.ts`, `content-write-gate.ts`,
`countBlockingQuestions()` in `open-questions.ts`, `quality-lab.ts`, `geaccepteerde-zinnen.ts`,
`jobs/content-jobs.ts`, `content-approve.ts` (komt in WP7 eenvoudig terug in `lib/pagina/`).

**Weg (app en components):** `app/(app)/analyses/[id]/briefing/`; onder `/api/analyses/[id]` de
routes `briefing`, `generate`, `generate-all`, `recheck`, `content/[pieceId]/diff`,
`content/[pieceId]/zinnen`; `app/(app)/beheer/kwaliteit/` en `app/api/beheer/kwaliteit/`; de map
`app/(app)/analyses/[id]/bibliotheek/[pieceId]/` op `publish-box.tsx` na (die verhuist in WP7 naar
`components/pagina/`); in `components/`: `quality-panel.tsx`, `geo-scorecard.tsx`,
`improvement-list.tsx`, `version-diff.tsx`.

**Weg (taken):** de handlers en de namen in `JOB_TYPES` van `content_brief`, `content_plan`,
`content_strategy`, `content_draft`, `content_edit`, `content_revise`, `content_recheck`. De koppeling
van `feitenregister.ts` naar `strategie-wacht.ts` gaat eruit: een betwist feit komt gewoon niet in
blok A.

**Weg, en in WP6 opnieuw geschreven:** `lib/plan-write-start.ts` en `lib/plan-writing.ts` in hun
geheel. Daar zit de oude logica in (de opdracht samenstellen, de oude schrijfpoort, de briefing). Het
contentplan (de cron `/api/cron/plan`, het vrijgeven van een maand, inplannen, "nu laten schrijven",
de route achter de antwoorden) roept tot WP6 niets aan; op die plekken staat één regel commentaar met
een verwijzing naar WP6. De knoppen "Schrijf deze pagina" en "genereer alles" in een cluster
verdwijnen; "Zet in het plan" komt in WP6. Het paginascherm toont bij een pagina zonder tekst alleen
de stand.

**Weg (tests):** elk testblok dat een verwijderde module importeert. Niet repareren, weghalen.

**Weg (documenten):** `docs/contentpijplijn-overdracht.md`, `docs/tasks/contentpijplijn-publicatiewaardig.md`,
`docs/tasks/contentpijplijn-werkstand.md`, `docs/tasks/contentpijplijn-herontwerp.md`,
`docs/tasks/vragen-voor-het-schrijven.md`, `docs/tasks/contentkwaliteit-framework.md`,
`docs/tasks/contentkwaliteit-copywriterronde.md`, `docs/tasks/customer-journey-cluster-tot-schrijven.md`,
`docs/tasks/contentflow-een-lijn.md` (de besluiten B5 en B6 staan nu hier). Grep eerst op elke
bestandsnaam, ruim verwijzingen op in dezelfde commit, en zet ze in de vertaaltabel bovenaan
`docs/logbook.md`.

**Bijwerken:** `docs/processtappen-nieuwe-pagina.md` fase 7 tot en met 12 wordt één alinea die naar dit
document verwijst (de stappen volgen in WP10); CLAUDE.md conventie 1 volgens §3 regel 6.

**Klaar als:** geen enkel bestand importeert nog een verwijderd bestand, de vier controles groen, en
`grep -rn "content_strategy\|content_brief\|contract_json\|strategy_json" app lib components scripts`
geeft alleen nog `lib/types/database.ts`.

### WP2. Migratie en typen
- Migratie §7.1 via `apply_migration`. `supabase/README.md` en `lib/types/database.ts` bijwerken.
- De importtest van §7.3 en de kolomtest van §7.2 (die mogen nu al, `lib/pagina/` is nog leeg).
- **Klaar als:** de vier kolommen bestaan in productie, beide tests draaien, alles groen.

### WP3. De controle in code (puur)
- `lib/pagina/harde-beweringen.ts`, `lib/pagina/mechanisch.ts`, en de samenstelling van blok A als pure
  functie in `lib/pagina/bedrijfskennis.ts` (filter per pagina: `geldt_voor` leeg of passend bij titel,
  onderwerp of `targetIntent`; alleen actuele, niet betwiste, niet vervangen feiten; sterk bewijs eerst;
  hooguit 150).
- **Klaar als:** minstens 30 tests voor harde beweringen en tests voor de filter en de reparatie, groen.

### WP4. De open vraag en de verhalen
- Open vraag aanmaken bij het starten van de voorbereiding (§6.2), idempotent: hooguit één rij met
  `open_vraag = true` per pagina.
- `answerFact()` en `/api/profiles/[id]/facts`: bij `open_vraag` tot 3.000 tekens, geen promotie naar
  `proof_points`, niet opknippen.
- Het vragenscherm toont de open vraag als eerste, groot, met de tekst uit §6.2.
- De adviseur kan de open vraag invullen namens de ondernemer, op hetzelfde vragenscherm (hij heeft
  al toegang tot het merk). Het gespreksscherm zegt dat erbij: "Vul de open vraag per pagina samen met
  de ondernemer in, in zijn woorden." Zo hangt het belangrijkste stuk invoer niet af van of de klant
  zelf gaat typen. Geen nieuwe kolom: wie antwoordde, staat al bij het antwoord als dat veld bestaat;
  bestaat het niet, dan komt het er niet bij.
- Het tekstvak "Verhalen" in het gespreksscherm (§6.3).
- **Klaar als:** een ketentest laat zien dat een voorbereide pagina precies één open vraag heeft, ook als
  de brief mislukt; een antwoord van 2.500 tekens wordt bewaard en niet naar `proof_points` gezet.

### WP5. De content brief
- Schema `ContentBrief`, `lib/pagina/brief.ts`, taaksoort `pagina_brief` volgens §6.1.
- **Klaar als:** een ketentest met `__setTestTransport` bewaart `brief_json`, doet bij een tweede run
  geen aanroep, gooit vakkennis zonder adres weg, maakt hooguit 3 vragen en laat een gelijke vraag
  weg, en vraagt daarna de schrijfpoort. Bij definitief mislukken gaat de pagina door met alleen de
  open vraag.

### WP6. Schrijven, en het plan weer aansluiten
- `lib/pagina/schrijfopdracht.ts`, `lib/pagina/schrijven.ts`, taaksoort `pagina_schrijven` met de
  ophaalronde van de achtergrondmodus, volgens §6.4. De schrijfpoort `lib/pagina/schrijfpoort.ts`
  (§6.8).
- Nieuw en klein, in `lib/pagina/start.ts`: `bereidVoor(paginas)` (rij in `content_pieces`, open
  vraag, `pagina_brief` per pagina) en `probeerTeSchrijven(pagina)` (schrijfpoort, dan
  `pagina_schrijven`). Het contentplan roept alleen deze twee aan, op de plekken uit WP1. Niets uit
  het oude `plan-write-start.ts` komt terug; wat de invoer van de brief nodig heeft (titel, soort,
  voor wie, waarom, doelvragen, bestaand adres) leest `start.ts` rechtstreeks van de plan-pagina en de
  aanbeveling.
- "Zet in het plan" in een cluster: de kaart gaat naar de lopende maand via de bestaande actie
  `inplannen`.
- **Klaar als:** een ketentest schrijft een pagina met testtransport, repareert een verboden teken,
  bewaart ruwe uitvoer en versienummer, en plant `pagina_controle` in; een ophaalronde die nog bezig is
  plant zichzelf opnieuw in zonder tweede aanroep; en een test die elke ingang probeert (vrijgeven,
  inplannen in een vrijgegeven maand, antwoord, overslaan, de cron, "nu laten schrijven" van de
  beheerder) laat zien dat er nooit een schrijftaak komt met een open vraag.

### WP7. Controle, herschrijven en goedkeuren
- `lib/pagina/controle.ts` (`pagina_controle`), `lib/pagina/herschrijven.ts` (`pagina_herschrijven`),
  `lib/pagina/goedkeuren.ts`, de route voor gele zinnen, en het scherm `components/pagina/goedkeuren.tsx`
  met de verhuisde `publish-box.tsx` (§6.6, §6.7, §6.9).
- **Klaar als:** ketentests voor: "goed" zonder ongedekte zinnen gaat naar `ready` zonder herschrijving;
  "niet_goed" herschrijft precies één keer; een herschrijving met meer ongedekte zinnen wordt niet
  bewaard; een mislukte controle gaat naar `ready` met gele zinnen; goedkeuren kan pas als alle gele
  zinnen bevestigd zijn; een aanpassing van de klant maakt versie 2 zonder nieuwe beoordeling.

### WP8. Toetsen op een schone lei
- Maak de drie merken van de proefset opnieuw aan (hovenier, installateur, rijschool), laat het
  onderzoek draaien, voer het gesprek in met `kwaliteitsdoorlichting/gesprek-A.json` tot en met `C`,
  vul "Verhalen" uit `waarheidsdossiers.md`, en meet één cluster per merk.
- Zet drie pagina's per merk in het plan met dezelfde `plantitel` als de oude teksten in
  `kwaliteitsdoorlichting/teksten/`. Komt een titel niet uit het rapport, zet de plan-pagina dan als
  testhandeling met SQL klaar. Dat is een testhandeling, geen functie in de app.
- Beantwoord de vragen alleen met wat in `waarheidsdossiers.md` staat; de open vraag in de woorden van
  de ondernemer uit dat dossier; de rest overslaan.
- Winnen van de oude teksten (4 tot 5 op 10) is een te lage lat. Daarom drie vergelijkingen per
  nieuwe tekst, blind en in beide volgordes, met de opdracht uit
  `kwaliteitsdoorlichting/nameting-fase1/A-paar-opdracht.md`:
  1. tegen de oude tekst uit `kwaliteitsdoorlichting/teksten/`;
  2. tegen de huidige pagina van het bedrijf over dit onderwerp (uit `kwaliteitsdoorlichting/sites/`,
     of de pagina die het dichtst in de buurt komt);
  3. tegen de beste pagina van een concurrent over dit onderwerp. Die kiest de eigenaar met de hand
     uit de bronnen die de AI-antwoorden in de meting aanhaalden; de tekst gaat als testmateriaal in
     `kwaliteitsdoorlichting/concurrent/`.
- De eigenaar beoordeelt zes paren zelf, zonder te weten welke welke is, met de vraag "zou jij deze
  op je site zetten?". Controleer met de hand elke harde bewering in de negen teksten tegen het
  waarheidsdossier.
- **Geslaagd als:** nieuw wint van de oude tekst bij minstens 8 van de 9; van de huidige sitepagina bij
  minstens 7 van de 9; van de concurrent bij minstens 5 van de 9; de eigenaar kiest minstens 5 van de
  6 keer nieuw; niet meer fouten in harde beweringen dan de oude teksten; onder $0,50 per pagina
  (gemeten op `ai_calls`). Deze grenzen zijn gekozen, niet geijkt.
- **Niet geslaagd:** ga naar WP9 met deze pagina's. Geen nieuwe stap.
- Leg de uitslag vast in §12 en in `docs/logbook.md`.

### WP9. De verbeterlus (blijvend)
Kwaliteit verbeteren is: `lib/pagina/schrijfopdracht.ts` of de samenstelling van blok A tot en met D
aanpassen, `SCHRIJFOPDRACHT_VERSIE` ophogen, de pagina's van WP8 opnieuw laten schrijven, paarsgewijs
vergelijken met de vorige versie. Een wijziging blijft als hij wint. Geen andere manier.

### WP10. Narekenen en documenteren
- Eén echte maand van één merk door de keten. Meet op `ai_calls` de kosten en de duur per aanroep,
  tel de gele zinnen en hoeveel daarvan vals alarm waren, en kijk of er een pagina blijft hangen.
- Werk de kostenschattingen in de app bij (de tekst bij het vrijgeven van een maand, de kostenrem),
  `docs/architecture.md` §6, `docs/processtappen-nieuwe-pagina.md` en `docs/merkstrategie.md` §30.
- **Klaar als:** de cijfers staan in §12 en in `docs/logbook.md`, en de pagina's staan op "Lees en keur
  goed" zonder handwerk.

---

## 9. Hoe je test zonder echte AI-aanroepen

- Unit: de pure modules (`harde-beweringen`, `mechanisch`, `bedrijfskennis`, `schrijfpoort`,
  `pagina-stand`) en de twee bewakingstests (§7.2, §7.3) in `scripts/test-unit.ts`.
- Keten: `scripts/test-chain.ts` met `__setTestTransport` voor de AI-aanroepen. Per taak: een geslaagd
  pad, een tweede run zonder aanroep (conventie 9), en definitief mislukken.
- Echte aanroepen alleen in WP8, WP9 en WP10, op productie. Deze werkomgeving heeft geen
  OpenAI-sleutel; voor een snelle verbeterlus moet die in de omgevingsinstellingen, of de pagina's
  worden via de app opnieuw geschreven.

---

## 10. Kosten

Geschat op de tarieven in `lib/openai/pricing.ts` (Sol $2 en $10 per miljoen tokens in en uit):
brief met zoeken op het web ongeveer $0,05, schrijven ongeveer $0,10 tot $0,15, controle ongeveer
$0,03, herschrijven (niet altijd) ongeveer $0,10 tot $0,15. Totaal ongeveer $0,18 tot $0,38 per pagina.
**Dit is een schatting**; WP8 en WP10 meten het. B4 is de grens.

---

## 11. Risico's en wat we eraan doen

| # | Risico | Maatregel |
|---|---|---|
| 1 | De oude keten zit in tientallen bestanden (onzekerheid 29, eindpoort 20, contract 17, inputpoort 13) en in 37.500 regels tests | Eerst alles weghalen met de typecontrole als gids (WP1), daarna bouwen op een schone basis |
| 2 | Een volgende sessie hergebruikt oude code of bouwt stappen terug | §0, §3, de importtest (§7.3) en de kolomtest (§7.2) |
| 3 | Eén schrijfbeurt geeft meer verschil tussen twee runs | Zichtbaar in WP8 en WP9. Is het te groot, dan is de eerste stap twee versies schrijven en de controle laten kiezen, als besluit in §2 |
| 4 | Het model verzint toch iets | De controle vindt het (code plus beoordeling), één herschrijving, daarna geel voor de ondernemer |
| 5 | Valse alarmen: telefoonnummer, postcode, "24 uur per dag" uit de open vraag, subsidiebedrag uit vakkennis, "sinds 1990" tegenover "35 jaar" | De eerste vier zijn testgevallen die gedekt of geen harde bewering moeten zijn. Het laatste blijft geel: de ondernemer bevestigt. Een gele zin blokkeert niet (B1). WP10 telt ze |
| 6 | De beoordelaar is mild over tekst van zijn eigen soort | "Goed" of "niet goed" met concrete punten en letterlijke zinnen, geen cijfer; zijn oordeel leidt hooguit tot één herschrijving |
| 7 | De ondernemer keurt goed zonder te lezen | Goedkeuren kan pas na de gele zinnen |
| 8 | Schrijven duurt langer dan de routelimiet van 300 seconden | Achtergrondmodus altijd, voor schrijven en herschrijven |
| 9 | Bijna gelijke vragen tussen pagina's van dezelfde maand | Gelijke vragen vallen weg in code; varianten accepteren we (§6.1) |
| 10 | De kosten zijn geschat | WP8 en WP10 meten; B4 is de grens |
| 11 | Of het beter scoort, blijkt pas weken na publicatie | WP8 meet kwaliteit; de nameting na 14 en 28 dagen blijft het bewijs voor effect |
| 12 | De blinde lezer is ook een model en de proefset is klein | De eigenaar beoordeelt zes paren zelf |
| 13 | Tussen WP1 en WP6 kan de app geen pagina's schrijven | Bewust (B8); er zijn geen klanten |
| 14 | De ondernemer vult de open vraag niet in, en dan mist het belangrijkste stuk invoer | De adviseur vult hem in het gesprek samen met de ondernemer in (WP4) |
| 15 | Een plan met vijf bijna gelijke plaatspagina's levert sjabloonteksten op, hoe goed de schrijver ook is | Buiten deze ombouw; staat als eerste vervolgwerk in §13 |

---

## 12. Stand

| WP | Wat | Stand | Commit en datum |
|---|---|---|---|
| B2 | Klantdata verwijderd | Gedaan: 6 merken met alles eronder; kostenlog bewaard | 25 september 2026 |
| WP1 | Het oude weghalen | Niet begonnen | |
| WP2 | Migratie en typen | Niet begonnen | |
| WP3 | De controle in code | Niet begonnen | |
| WP4 | Open vraag en verhalen | Niet begonnen | |
| WP5 | Content brief | Niet begonnen | |
| WP6 | Schrijven en het plan aansluiten | Niet begonnen | |
| WP7 | Controle, herschrijven en goedkeuren | Niet begonnen | |
| WP8 | Toetsen op een schone lei | Niet begonnen | |
| WP9 | De verbeterlus | Na WP8 | |
| WP10 | Narekenen en documenteren | Niet begonnen | |

---

## 13. Vervolgwerk (na WP10, niet eerder, en niet stil meenemen)

### 13.1 Bijna gelijke plaatspagina's

Van de oude teksten van de rijschool gingen er zes over faalangst, alleen in een andere plaats
(Eindhoven, Best, Helmond, Waalre, Geldrop); bij de hovenier drie keer "complete tuin" in drie plaatsen.
Geen schrijver maakt daar vijf verschillende pagina's van. Dit is een keuze bij het samenstellen van het
plan, niet bij het schrijven.

Het besluit van de eigenaar van 25 september 2026 blijft staan (overgenomen uit
`contentpijplijn-publicatiewaardig.md` §10.1, dat in WP1 verdwijnt; nog niet gebouwd):

| Situatie | Uitkomst |
|---|---|
| Gemeente met minstens 50.000 inwoners (vaste lijst uit CBS-cijfers, in code) | eigen pagina |
| De vestigingsplaats van het bedrijf | eigen pagina |
| De ondernemer levert minstens twee feiten die alleen over deze plaats gaan | eigen pagina |
| Anders | onderdeel van één werkgebiedpagina, met een eigen alinea per plaats |

Dit wordt een pure regel bij het vullen van de voorraad en het plan, geen AI-stap en geen stap in de
contentketen. Het krijgt een eigen plan in `docs/tasks/` als WP10 af is.

