# Herstelplan na de technische audit van 2 september 2026

> ## Startprompt voor een nieuwe sessie
>
> Plak dit in een lege sessie op deze repo:
>
> ```
> Lees docs/tasks/herstelplan-na-audit.md en voer het uit, te beginnen bij hoofdstuk 0.
> Stel mij eerst de vier beslissingen uit hoofdstuk 0 en wacht op mijn antwoord.
> Werk daarna op een branch vanaf main, taak voor taak, en houd je aan CLAUDE.md.
> Zet niets op main zonder mijn akkoord, en vraag budget voordat je live test.
> ```


> **Wat dit document is.** Een uitvoerbaar plan voor een sessie die niets van de audit weet. Alles
> wat je nodig hebt staat hieronder: wat er mis is, waar het zit, wat je moet doen en hoe je
> aantoont dat het werkt. Het volledige bewijs per bevinding staat in
> `docs/tasks/technische-audit-2-september-2026.md`. Lees dat als je twijfelt over het waarom, maar
> je kunt dit plan uitvoeren zonder het te openen.
>
> **Herkomst.** Op 2 september 2026 is de hele klantreis op productie doorlopen als externe partij:
> merk aanmaken, onderzoek, meting van dertig vragen, rapport, een verbeterde pagina, een nieuwe
> pagina en publiceren. Kosten van die doorloop: $2,85. Er is toen niets gerepareerd, alleen
> vastgesteld. Dit plan is de reparatie.

---

## 0. Eerst dit: vier beslissingen van de eigenaar

**Vraag deze vier dingen aan de eigenaar (Jan Willem) vóór je begint, in één bericht.** Bij elke
vraag staat het voorstel dat de audit deed. Zegt hij "doe je voorstel", dan geldt de standaardkeuze
en kun je meteen door.

| # | Vraag | Standaardkeuze |
|---|---|---|
| 1 | Mag een klant zelf betaald werk starten, zoals een merk aanmaken en een cluster starten? | **Nee.** Op slot, alleen de beheerder. |
| 2 | Mag een tekst die de eigen controle niet haalt gepubliceerd worden? | **Nee.** Zo'n tekst krijgt een eigen stand en de publicatiestap weigert. |
| 3 | Mag er gepubliceerd worden op een adres buiten het eigen domein van de klant? | **Nee.** Alleen het eigen domein. |
| 4 | Mag de historische meetdata herberekend worden, ook al veranderen daardoor cijfers die eerder getoond zijn? | **Ja.** Een fout cijfer is erger dan een gewijzigd cijfer. |

Zegt hij bij vraag 1 "ja, dat mag blijven", sla dan taak T1 over en haal in plaats daarvan alleen
het misleidende commentaar en de dode tekst weg (staat bij T1 onderaan).

---

## 1. Wat je moet weten voordat je begint

- **Werk op een eigen branch vanaf `main`.** `main` is productie op Vercel.
- **Vóór elke commit vier controles groen**: `npx tsc --noEmit`, `npm run test:unit`,
  `npm run test:chain`, `npm run build`. Draai eerst `npm install`.
- **De conventies staan in `CLAUDE.md`.** De twee die in dit plan het vaakst terugkomen: elke
  promptinstructie krijgt een deterministisch vangnet in code (conventie 1), en onbekend is een
  betere waarde dan een verkeerde (conventie 3).
- **Elke wijziging die een uitkomst beïnvloedt krijgt een test** in `scripts/test-unit.ts`, elke
  wijziging in de samenhang tussen taken een scenario in `scripts/test-chain.ts`.
- **Productie is bereikbaar** op `https://geo-ten-blush.vercel.app`. De database is het
  Supabase-project `kosauqzjbpweluiqgmwv` (naam: GEO). Migraties gaan via de Supabase MCP-tool
  `apply_migration`, additief en idempotent, nooit `drop`.
- **De motor is een wachtrij.** `/api/cron/worker` wordt elke minuut aangeroepen door pg_cron in
  Supabase, niet door Vercel. Een reparatie in de code draait pas mee op productie als hij op `main`
  staat. Zet niets op `main` zonder akkoord van de eigenaar.
- **Testaccounts die klaarstaan**: `e2e-consultant@orbit-test.nl` (beheerder) en
  `e2e-klant@orbit-test.nl` (klant). Wachtwoord van beide is op 2 september gezet op
  `OrbitAudit!2026-x7`. Werkt dat niet, zet het opnieuw via het Supabase-dashboard.
- **Live testen kost echt geld.** Een onboarding ongeveer $0,25, een meting van dertig vragen
  ongeveer $0,85, een contentpagina ongeveer $1,00. Vraag een budget voor je begint.

**Handige manier om de app als klant te bedienen zonder browser.** Log in bij de Supabase Auth-API
met wachtwoord, stop de sessie in een cookie met de naam `sb-kosauqzjbpweluiqgmwv-auth-token` en de
waarde `base64-<de sessie-JSON in base64url>`, en stuur die cookie mee met curl naar
`https://geo-ten-blush.vercel.app`. Zo zijn alle serverroutes te testen als beheerder én als klant.

---

## 2. De taken, in volgorde

Doe ze in deze volgorde. T1 tot en met T3 zijn de veiligheidsknoppen en horen in één branch. T4 is
losstaand en kost niets. T5 is opruimwerk. T6 is een eigen project.

---

### T1. Zet de kostenpoort dicht

**Wat er nu gebeurt.** Elke ingelogde klant kan een merk aanmaken en een cluster starten, en dat zet
allebei betaald AI-werk in gang. Aangetoond op productie: ingelogd als `e2e-klant@orbit-test.nl` gaf
`POST /api/profiles` met `{"name":"Test","url":"example.com"}` een **201** en de volledige
onderzoekspijplijn liep. Hetzelfde geldt voor `POST /api/analyses`. De enige rem is het plafond van
€50 per maand per account en €150 per dag over alles heen (`lib/spend-rules.ts`).

**Waar het zit.** `lib/cost-rules.ts` regel 71: in `STAFF_ONLY_ACTIONS` staan alleen
`reputatie_starten` en `clusters_aanvullen`. De andere handelingen (`merk_onderzoeken`,
`analyse_starten`, `meting_starten`, `content_schrijven`, `plan_goedkeuren`) staan open voor
iedereen. `lib/cost-guard.ts` leest die lijst en is de enige plek waar dit besluit hoort te staan.

**Wat je doet.**
1. Voeg `merk_onderzoeken` en `analyse_starten` toe aan `STAFF_ONLY_ACTIONS`. Laat
   `meting_starten`, `content_schrijven` en `plan_goedkeuren` staan zoals ze zijn: dat is werk
   binnen een merk dat de klant al gekocht heeft, en de weigerteksten in `COST_DENIED` zijn daar op
   geschreven.
2. Haal het misleidende commentaar weg in `app/api/profiles/route.ts` regel 61. Daar staat "Betaald
   werk start alleen de beheerder" terwijl de code dat op dit moment niet afdwingt. Vervang het door
   wat er na jouw wijziging echt gebeurt.
3. Controleer dat elke route die geld kost `mayTriggerCost` aanroept. Er is al een unittest die dit
   patroon per bestand afdwingt; zoek in `scripts/test-unit.ts` op `mayTriggerCost` en breid hem uit
   als er routes ontbreken.

**Hoe je aantoont dat het werkt.**
- Unittest: `actionNeedsStaff("merk_onderzoeken")` en `actionNeedsStaff("analyse_starten")` geven
  `true`, de andere drie `false`.
- Live, ná akkoord om naar `main` te gaan: als klant `POST /api/profiles` hoort **403** te geven met
  de tekst uit `COST_DENIED.merk_onderzoeken`, en als beheerder nog steeds **201**.

**Wat je niet doet.** Niet de knop verbergen en het daarbij laten. De grens hoort in de server te
zitten, niet in het scherm.

---

### T2. Een tekst die de controle niet haalt mag niet "klaar" heten

Dit zijn twee dingen die samenhangen. Doe ze samen.

#### T2a. De stand "klaar" liegt

**Wat er nu gebeurt.** Een pagina krijgt de stand `ready` zodra de reparatierondes op zijn, ongeacht
wat er nog openstaat. Op productie gemeten: pagina `3517f87e-b030-4f25-ba07-5a45857f56e3` staat op
`ready` met `needs_review = true`, een kwaliteitsscore van 52 waar de drempel 80 is, en
**eenenzeventig** openstaande opmerkingen. Eén van die opmerkingen zegt dat er een ander bedrijf in
de tekst staat dat eruit moet.

**Waar het zit.** `lib/pipeline/content.ts` regel 1922 en regel 2196: beide zetten
`status: nogEenRonde ? "draft" : "ready"`. De drempels staan op regel 104 (`REVIEW_THRESHOLD = 80`),
112 (`GEO_THRESHOLD = 60`), 123 (`COVERAGE_THRESHOLD = 85`) en 135 (`REPAIR_MAX = 3`).

**Wat je doet.** Voeg een derde uitkomst toe naast `draft` en `ready`. Een pagina waarvan
`needs_review` waar is, komt niet op `ready` maar op een eigen stand die op het scherm leest als
"check nodig". Kijk eerst in `lib/types/database.ts` bij `ContentStatus` welke waarden er al zijn en
of er al een geschikte bestaat; er is een unittest die eist dat élke waarde uit `ContentStatus` een
tak heeft in `lib/work.ts`, dus die moet je meenemen.

#### T2b. De reparatielus stopt soms te vroeg, en kost meer dan hij oplevert

**Wat er nu gebeurt.** Twee dingen die allebei op productie gemeten zijn.

*Te vroeg gestopt.* Pagina `db76cb57-2689-4a7e-8c4a-93fff417e1b5` staat op `ready` met een
kwaliteitsscore van **68** terwijl de drempel 80 is, met tweeënzeventig openstaande opmerkingen, na
**één** reparatieronde terwijl er drie mogen. Er bestaat geen taak met de sleutel
`content_revise:db76cb57-2689-4a7e-8c4a-93fff417e1b5:r1`, terwijl een andere pagina van dezelfde
middag wel netjes een `:r1` en een `:r2` kreeg. Volgens regel 2136 hoort de lus door te gaan zolang
de score te laag is en er nog rondes over zijn. **De oorzaak is niet uitgezocht.** Dat is jouw
eerste taak hier: zoek uit waarom `nogEenRonde` onwaar werd bij score 68 en ronde 1.

*Duurder en slechter.* Bij de andere pagina draaiden wel drie rondes. Resultaat: de kwaliteitsscore
ging van 78 naar 52, het aantal opmerkingen van 70 naar 71, het aantal woorden bleef exact 1386, en
de rondes kostten samen **$0,78** van de **$1,08** die de pagina in totaal kostte. Het commentaar bij
`REPAIR_MAX` (regel 127 tot 135) zegt dat één volledige herschrijving $0,162 kostte en dat drie
gerichte reparaties samen goedkoper zijn. Gemeten is **$0,26 per ronde**, dus één ronde kost al 60%
meer dan de herschrijving die vervangen werd.

**Wat je doet.**
1. Zoek de oorzaak van de te vroeg gestopte lus en repareer die.
2. Laat de lus stoppen zodra de kwaliteitsscore niet meer stijgt ten opzichte van de vorige ronde.
   Een ronde die het slechter maakt is weggegooid geld.
3. Bewaar de beste versie, niet de laatste. Nu overschrijft elke ronde de vorige.
4. Werk het commentaar bij `REPAIR_MAX` bij met de gemeten cijfers, en corrigeer de kostenraming als
   die ergens hardgecodeerd staat.

**Hoe je aantoont dat het werkt.** Een unittest die een reeks rondes met dalende kwaliteitsscore
naspeelt en eist dat de lus stopt en de beste versie bewaart. Plus een ketentest die aantoont dat een
pagina met een te lage score na ronde 1 een ronde 2 krijgt.

---

### T3. Publiceren op elk willekeurig adres

**Wat er nu gebeurt.** Bij het vastleggen wordt alleen de vorm van het adres gecontroleerd. De
pagina komt meteen op `published`. Op productie aangetoond met twee aanroepen op dezelfde pagina:
een adres dat niet bestaat gaf **202**, en `https://www.example.com/` gaf ook **202**.

Ongeveer veertig seconden later draait er wel een echte controle, en die doet het goed. Voor
example.com schreef hij weg: `"reachable": true, "textFound": false, "textMatchRatio": 0` met de
melding "De pagina bestaat, maar we vinden er geen enkele zin uit onze tekst op." **Met die uitkomst
gebeurt vervolgens niets**: de stand blijft `published`.

**Waar het zit.** `app/api/analyses/[id]/content/[pieceId]/publish/route.ts` (de `POST`) en
`lib/pipeline/publish.ts` regel 32 (`markPublished`). De controle zelf zit in de taak
`verify_publication` en werkt naar behoren.

**Wat je doet.**
1. Weiger een adres dat niet op het domein van het merk staat. Het domein staat in `profiles.url`.
   Let op subdomeinen en op `www`.
2. Laat de uitkomst van `verify_publication` iets doen: is de pagina niet bereikbaar, of staat onze
   tekst er niet op, zet de pagina dan terug op "nog niet gepubliceerd" met de reden erbij, in plaats
   van alleen een opmerking achter te laten.
3. Controleer of `content_pieces.status` niet op `published` kan komen zolang `needs_review` waar is
   (dat is de andere kant van T2a).

**Hoe je aantoont dat het werkt.** Unittest op de domeincontrole met de randgevallen `www`,
subdomein, ander domein, en een adres met een pad. Ketentest die de controle laat mislukken en eist
dat de stand terugvalt.

---

### T4. Zet de oude meetgegevens recht

**Wat er nu gebeurt.** Op 30 augustus 2026 is er een vangnet bijgekomen dat een vermelding alleen
telt als de merknaam echt in het antwoord staat (`lib/pipeline/measure.ts`, de regel met
`candidateNames.some(...)`). De metingen van vóór die datum zijn nooit opnieuw beoordeeld.

**Wat dat kost aan waarheid.** Over alle 774 gemeten antwoorden op productie, gecontroleerd op
woordniveau tegen merknaam en schrijfwijzen:

- **elf antwoorden** tellen als vermelding terwijl de naam nergens in het antwoord staat, verdeeld
  over Swapfiets (5), Bol (3), Van den Udenhout (2) en Coolblue (1), allemaal tussen 28 juli en
  1 augustus;
- **zes antwoorden** noemen het merk letterlijk en tellen niet mee, waaronder "biedt Fysi-Unique
  effectieve behandelingen aan" en "Bij Coolblue is deze machine momenteel geprijsd op €1.699,-";
- ná 30 augustus: nul van beide, over 260 antwoorden. Het vangnet werkt dus.

**Wat je doet.** Schrijf een eenmalig script (bijvoorbeeld `scripts/herbeoordeel-metingen.ts`) dat
per rij in `tracking_runs` van vóór 30 augustus 2026 de opgeslagen `raw_response` en `mention_json`
opnieuw door dezelfde functie haalt die de meting nu gebruikt, `tracking_run_mentions` bijwerkt, en
daarna de aggregatie opnieuw draait zodat `visibility_scores` klopt. **Er is geen enkele betaalde
AI-aanroep nodig**: alle ruwe antwoorden staan er nog.

Draai hem eerst in een stand die alleen rapporteert wat er zou veranderen, laat dat aan de eigenaar
zien, en pas daarna echt.

**Hoe je aantoont dat het werkt.** Na afloop moet deze controle nul opleveren voor beide kolommen:

```sql
with r as (
  select t.id, p.name as merk,
    exists (select 1 from public.tracking_run_mentions m
             where m.tracking_run_id=t.id and m.is_own_brand and m.mentioned) as geteld,
    (t.raw_response ~* ('\m'||regexp_replace(regexp_replace(p.name,'\.(nl|com)$',''),
        '([.^$*+?()\[\]{}|\\-])','\\\1','g')||'\M')) as naam_woord,
    exists (select 1 from unnest(coalesce(p.aliases,'{}'::text[])) al
             where t.raw_response ~* ('\m'||regexp_replace(al,'([.^$*+?()\[\]{}|\\-])','\\\1','g')||'\M')) as alias_woord
  from public.tracking_runs t
  join public.analyses a on a.id=t.analysis_id
  join public.profiles p on p.id=a.profile_id
  where t.raw_response is not null and t.mention_json ? 'mentions')
select count(*) filter (where (naam_woord or alias_woord) and not geteld) as gemist,
       count(*) filter (where not (naam_woord or alias_woord) and geteld) as geteld_zonder_naam
from r;
```

⚠️ Eén valkuil: het merk `gasservice-brabant.nl` heet in de database naar zijn domein terwijl de
antwoorden "Gasservice Brabant" schrijven. Die vier gevallen zijn terecht en geen fout. Reken dat na
voordat je iets aanpast.

---

### T5. De kleinere correcties

Elk punt hieronder is klein op zichzelf. Doe ze in één branch, met per punt een test.

1. **Dubbele meetvragen.** In één meting van dertig vragen zaten er twee **letterlijk identiek**,
   omdat de ontdubbeling per funnelfase gebeurt en niet over de hele set. `lib/pipeline/prompts.ts`
   regel 334: de verzameling `seen` wordt per fase aangemaakt. Til hem op naar het niveau van de hele
   analyse. Gevolg nu: de klant betaalt twee keer voor dezelfde vraag en die vraag weegt dubbel in
   zijn score.

2. **Concurrenten dubbelen.** Na één onboarding stonden er negen concurrenten in het profiel waarvan
   er vier dubbel waren: "Cleyburch Tandartsen" naast "Cleyburch Tandartsen in Noordwijk", en zo ook
   Dental4U, MondCleanic en De Voorstraat. `lib/pipeline/market.ts` regel 241 voegt samen met
   `new Set` op de exacte tekst. Ontdubbel op een genormaliseerde naam. Deze lijst stuurt de
   beoordeling van elke meting aan, dus dit is meer dan cosmetisch.

3. **Het menu in de crawl.** Van alle 51 gecrawlde pagina's van het testmerk begon er 51 met het
   navigatiemenu, dat gemiddeld eindigde op teken **698** van de 1500 die bewaard worden. Dat is
   46,5% ruis in de inventaris die het rapport, de gap-analyse en de paginakoppeling voedt. De
   oplossing bestaat al: `stripChrome()` in `lib/pipeline/page-text.ts` regel 94, nu alleen gebruikt
   bij het ophalen van een bestaande pagina. Gebruik hem ook in de crawl, in `lib/crawler.ts`, vóór
   het afkappen op `PAGE_MAX_CHARS` (regel 66). ⚠️ Dit raakt de inventaris van elke klant: reken na
   op minstens twee echte sites hoeveel tekens het scheelt en of er geen inhoud sneuvelt.

4. **HTML-entiteiten.** `htmlToText()` in `lib/crawler.ts` regel 103 decodeert zes namen en geen
   enkele numerieke code, dus `&#8220;` blijft staan. Op productie: **76 van de 790** gecrawlde
   pagina's. Het staat ook in `evidence_quote`, de tekst waarmee een bewering letterlijk onderbouwd
   moet worden. Decodeer numerieke codes en de gangbare Nederlandse namen.

5. **Nul pagina's melden als waarschuwing.** Bij een merk waarvan de site niet te crawlen was meldde
   de technische controle: "Geen enkele van de 0 gecontroleerde pagina's heeft schema.org-opmaak",
   als **waarschuwing**. Bij nul pagina's hoort de stand onbekend te zijn, precies zoals de controle
   ernaast het wel goed doet ("We konden je homepage niet ophalen, dus dit konden we niet
   controleren"). Conventie 3.

6. **Een leeg merk heet "klaar".** Datzelfde merk kreeg `status = 'klaar'` met nul gecrawlde
   pagina's, nul aanbodregels, nul onderwerpen en nul feiten, terwijl het profiel er gevuld uitzag
   met branche, werkgebieden en concurrenten uit web-zoekacties. Voor een consultant die dit vóór een
   demogesprek klaarzet is dat de gevaarlijkste vorm. Zorg dat een merk zonder gecrawlde pagina's een
   zichtbare stand krijgt die zegt dat de site niet gelezen kon worden.

7. **De pagina draagt de interne opdrachtzin als titel.** `content_pieces.title` was "Maak de pagina
   over tandartsangst de duidelijke startpagina voor angst". Dat is de aanbeveling aan onszelf, niet
   de titel van een pagina. De `meta_title` was wel goed. Laat de schrijfstap een echte paginatitel
   maken en bewaar de aanbevelingszin apart.

8. **Een weggelaten concurrentnaam laat een kapotte zin achter.** Een vraag die de klant te zien
   krijgt luidde: *"...met argumenten als 'een andere aanbieder – Noordwijkerhout — heeft een
   speciale angsttandarts'..."*. De naam is weggehaald, de gedachtestreepjes en de plaatsnaam niet.
   Twee dingen mis: een onleesbare zin, en gedachtestreepjes die volgens `docs/schrijfstijl.md`
   nergens mogen staan. Ruim de zin op bij het redigeren en zet er een vangnet op dat
   gedachtestreepjes uit modeltekst haalt voordat de klant hem ziet.

9. **Modeluitvoer naar de browser.** Het antwoord van `PATCH /api/profiles/[id]/facts` bevat de
   complete `raw_json` van de vraag, inclusief het antwoord-id van OpenAI en de instellingen van de
   aanroep. Stuur alleen terug wat het scherm nodig heeft.

10. **Een vraag wijzigen of verwijderen tijdens een lopende meting.** Dat wordt nu geaccepteerd met
    een **200**. Op productie aangetoond: twee al betaalde metingen bleven achter zonder vraag
    (`prompt_id = null`), en de score werd berekend over **31** groepen terwijl de klant **29** vragen
    heeft. De score kwam daardoor op 14,00 in plaats van 14,94, en het rapport eronder schrijft
    ondertussen "In 29 onderzochte vragen". Weiger wijzigen en verwijderen zodra de meting loopt, in
    `app/api/analyses/[id]/prompts/[promptId]/route.ts` (`PATCH` op regel 49, `DELETE` op regel 104).

11. **Een pakket van tien levert een plan van vijf.** Het account stond op tien pagina's per maand,
    de meting leverde vijf aanbevelingen, en het plan zette er vijf in maand 1 zonder ergens te
    melden dat er vijf ontbreken. Zet er een zin bij die zegt hoeveel er zijn en waarom.

12. **Geen enkele snelheidsbegrenzing.** De tabel `rate_limits` bestaat, is leeg, en het woord komt
    in de hele code niet voor. Inloggen en het verzilveren van een uitnodiging zijn onbegrensd. Zet
    er minstens op die twee routes een begrenzing op.

13. **Opruimen in de database.** De tabel `_backup_20260729` staat nog op productie met 51 rijen.
    Vraag of hij weg mag. Zet daarnaast de controle op gelekte wachtwoorden aan in Supabase Auth.

---

### T6. De wachttijd, als eigen project

**Niet in dezelfde branch doen.** Dit is sleutelen aan de motor en verdient eigen verificatie.

**Wat er nu gebeurt.** Gemeten over alle taken op productie:

| Taak | wachten | werken |
|---|---|---|
| `content_draft` (41 stuks) | **2533 s** gemiddeld | 38 s gemiddeld |
| `content_revise` (41 stuks) | 137 s | 71 s |
| `measure_prompt` (789 stuks) | 735 s | 18 s |

Een klant wacht bij het schrijven van een pagina dus gemiddeld tweeënveertig minuten op achtendertig
seconden werk. Bij de onboarding was 215 van de 317 seconden wachten op de volgende werkerronde.

**Waar het zit.** `lib/jobs/worker.ts` regel 120: `CLAIM_BATCH = 5` taken per ronde, met 200 van de
240 seconden vrijgehouden voor een zware taak. De werker start elke minuut. `content_draft` en
`content_revise` staan in `HEAVY_JOB_TYPES` maar niet in `IO_BOUND_HEAVY_TYPES`
(`lib/jobs/types.ts`), dus ze draaien strikt één voor één.

**Richting.** Zoek uit of contentgeneratie in `IO_BOUND_HEAVY_TYPES` past, en of de werker vaker mag
starten of meer taken per ronde mag claimen. Meet vooraf en achteraf met dezelfde query, zodat er een
cijfer ligt en geen gevoel.

---

## 3. De testrommel op productie

Dit staat er van de audit van 2 september. Vraag de eigenaar wat weg mag en ruim dan pas op.

| Wat | Waar |
|---|---|
| Merk Tandartspraktijk de Kroon, met meting, rapport en twee pagina's | profiel `cdff2bca-e567-44c0-ad12-3c183ba1aa3b` |
| Merk "Test" op example.com, aangemaakt vanaf het klantaccount | profiel `a15fecfc-cb71-4ad4-82d8-3b669c6aff9f` |
| Merk "AUDITTEST geweigerde site", nul gecrawlde pagina's | profiel `79fd089e-74ba-40ab-bad5-ebae7ead4ae9` |
| Cluster "AUDITTEST kostencontrole klant" op Wouter Warmtepomp | analyse `a0d9426f-1d43-4b5a-86d2-d1baaf4ebdbf` |
| Pagina die als gepubliceerd staat op `https://www.example.com/` | stuk `3517f87e-b030-4f25-ba07-5a45857f56e3` |
| Twee hermetingen, ingepland op 16 en 30 september, die geld kosten als ze draaien | taken `measure_impact` bij stuk `db76cb57-2689-4a7e-8c4a-93fff417e1b5` |
| Contentpakket van het consultantaccount op 10 pagina's per maand gezet | account `0f0c0adf-a98f-422c-83ae-b6830187c7a5` |

⚠️ **Tandartspraktijk de Kroon is een echt bedrijf dat geen klant is en dat hier niet om gevraagd
heeft.** Vier antwoorden op feitenvragen bij dat profiel zijn verzonnen om de keten te kunnen testen
en beginnen allemaal met "TESTANTWOORD (niet feitelijk)". Behandel ze niet als feiten over dat
bedrijf en benader het bedrijf niet.

💡 **De twee hermetingen zijn de moeite waard om te laten staan.** Draaien ze op 16 en 30 september,
dan bewijzen ze gratis dat de gesloten lus van meten, publiceren en hermeten echt werkt. Dat is het
enige deel van de belofte dat nog niet met eigen ogen gezien is.

---

## 4. Wanneer is dit af

- T1 tot en met T3 zitten in de code, hebben elk een test die de fout zou hebben gevangen, en de
  vier controles staan groen.
- T4 is gedraaid en de controlequery hierboven geeft nul op beide kolommen.
- T5 is punt voor punt afgewerkt of expliciet doorgeschoven, met de reden erbij.
- Op productie is met de twee testaccounts nagelopen dat een klant een **403** krijgt op het
  aanmaken van een merk, dat een pagina met openstaande opmerkingen niet te publiceren is, en dat
  publiceren op een vreemd domein geweigerd wordt (conventie 10: gebouwd is niet geverifieerd).
- `docs/logbook.md` heeft er een alinea bij, onderaan, met de datum en de cijfers die je gemeten
  hebt. `docs/tasks/technische-audit-2-september-2026.md` krijgt per opgelost punt een regel met de
  stand. Dit plan gaat weg zodra alles erin af is.
