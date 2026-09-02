# Herstelplan ORBIT ENGINE, na de technische audit van 2 september 2026

> ## Startprompt voor een nieuwe sessie
>
> Plak dit in een lege sessie op deze repo:
>
> ```
> Lees docs/tasks/herstelplan-na-audit.md en voer het uit.
> Werk op één branch vanaf main en doe de taken op volgorde.
> Stel mij vragen via een keuzevraag met opties zodra je twijfelt of een beslissing
> de uitkomst wezenlijk verandert. Zet niets op main zonder mijn akkoord.
> Je mag maximaal 10 euro aan echte AI-kosten maken. Wordt het meer, meld het eerst.
> ```

---

## 1. Waar dit over gaat

**Het doel van ORBIT ENGINE, in de woorden van de eigenaar:** teksten schrijven van het niveau dat
een copywriter of contentmarketeer zelf zou leveren, klaar om zonder herschrijven naar de klant te
sturen. De vergelijking is InSpace Nova (inspace.io), waar een team van vijf engineers aan werkt.
Publiceren gaat bij ons niet automatisch, de rest is grotendeels hetzelfde. **Het is geslaagd als
het hele proces klopt: kansen worden gevonden, daar wordt content voor geschreven, en die content is
goed genoeg om een groot deel van het werk van een copywriter over te nemen.**

**Wat er op 2 september 2026 is vastgesteld.** De hele klantreis is die dag op productie doorlopen
als externe partij: merk aanmaken, onderzoek, meting van dertig vragen, rapport, een verbeterde
pagina, een nieuwe pagina en publiceren. Kosten $2,85. Er is toen niets gerepareerd, alleen gemeten.
De keten liep zonder één mislukte taak, de zichtbaarheidsscore bleek met de hand na te rekenen, en
de rechten zijn dicht. Wat niet klopt staat hieronder. Het volledige bewijs per punt staat in
`docs/tasks/technische-audit-2-september-2026.md`.

**De volgorde in dit plan volgt de eigenaar:** een tekst met een fout erin is het ergst, daarna een
verkeerd cijfer, daarna vertraging.

---

## 2. Kaders, vastgelegd door de eigenaar op 2 september 2026

Dit zijn geen aannames maar besluiten. Ze sturen de taken hieronder.

1. **Er zijn nog geen echte klanten.** Alle merken in de database komen uit oudere
   ontwikkelrondes toen de app anders werkte, en zijn niet representatief. Ze mogen weg, zie T7.
2. **Een klant mag alles inzien en alles aanklikken, behalve knoppen die echt AI aanroepen en geld
   kosten.** Klikt hij daar toch op, dan krijgt hij een melding dat zijn customer success manager
   bij Outer Orbit dit voor hem doet.
3. **Content moet direct door kunnen naar de klant.** Niet "bijna goed" met een redactieronde van
   een mens erachter.
4. **Kosten.** Maximaal **€20 per dag per klant** en **€50 per dag over alle accounts samen**, met
   een duidelijke melding zodra dat plafond geraakt wordt. Deze bedragen gaan omhoog als de app
   opschaalt, en dat zegt de eigenaar zelf.
5. **Eén contentpagina kost een euro of minder.** Een reparatieronde die de tekst slechter maakt is
   per definitie een fout, geen normale uitkomst.
6. **Tijd is ondergeschikt aan kwaliteit.** Wachten mag, onnodig wachten niet.
7. **Testbudget voor deze reparatieronde: €10.** Wordt het meer, eerst melden.
8. **Stel vragen zodra je twijfelt**, als keuzevraag met opties, niet als open vraag.
9. **Alles in één keer**, niet in losse stukjes opleveren.

---

## 3. Wat je moet weten voordat je begint

- **Werk op één branch vanaf `main`.** `main` is productie op Vercel.
- **Vóór elke commit vier controles groen**: `npx tsc --noEmit`, `npm run test:unit`,
  `npm run test:chain`, `npm run build`. Draai eerst `npm install`.
- **De conventies staan in `CLAUDE.md`.** De drie die hier het vaakst tellen: elke promptinstructie
  krijgt een deterministisch vangnet in code (1), onbekend is beter dan verkeerd (3), en gebouwd is
  niet geverifieerd (10).
- **Elke wijziging die een uitkomst beïnvloedt krijgt een test** in `scripts/test-unit.ts`, elke
  wijziging in de samenhang tussen taken een scenario in `scripts/test-chain.ts`.
- **Productie**: `https://geo-ten-blush.vercel.app`. Database: Supabase-project
  `kosauqzjbpweluiqgmwv` (naam GEO). Migraties via de Supabase MCP-tool `apply_migration`, additief
  en idempotent, nooit `drop`.
- **De motor is een wachtrij.** `/api/cron/worker` wordt elke minuut aangeroepen door pg_cron in
  Supabase, niet door Vercel. Code draait pas mee op productie als hij op `main` staat.
- **Testaccounts**: `e2e-consultant@orbit-test.nl` (beheerder) en `e2e-klant@orbit-test.nl` (klant),
  wachtwoord `OrbitAudit!2026-x7`. Werkt dat niet, zet het opnieuw via Supabase.
- **Live testen kost geld**: onboarding ongeveer $0,25, meting van dertig vragen ongeveer $0,85,
  contentpagina ongeveer $1,00. Houd het totaal onder de €10.

**De app bedienen zonder browser.** Log in bij de Supabase Auth-API met wachtwoord, zet de sessie in
een cookie met de naam `sb-kosauqzjbpweluiqgmwv-auth-token` en de waarde
`base64-<sessie-JSON in base64url>`, en stuur die mee met curl. Zo zijn alle serverroutes te testen
als beheerder én als klant.

---

## T1. Een tekst die niet klopt mag nooit "klaar" heten

**Dit is het belangrijkste punt van het hele plan**, want de eigenaar noemt een fout in een tekst het
ergste dat er kan gebeuren, en de content moet direct naar de klant kunnen.

### Wat er nu gebeurt

Twee pagina's geschreven op 2 september, allebei op productie:

| | verbeterde pagina | nieuwe pagina |
|---|---|---|
| eindstand | `ready` | `ready` |
| `needs_review` | waar | waar |
| kwaliteitsscore (drempel 80) | **52** | **68** |
| openstaande opmerkingen | **71** | **72** |
| reparatierondes (max 3) | 3 | **1** |
| kosten | $1,08 | ongeveer $0,60 |

Beide pagina's worden dus als af aangeboden terwijl de app zelf tientallen redenen heeft
opgeschreven waarom ze het niet zijn. Eén van die opmerkingen zegt dat er een ánder bedrijf
("Infomedics") in de tekst staat dat eruit moet.

Bij de verbeterde pagina maakten de drie reparatierondes het **slechter**: de kwaliteitsscore ging
van 78 naar 52, het aantal opmerkingen van 70 naar 71, het aantal woorden bleef exact 1386, en die
rondes kostten **$0,78** van de $1,08. Bij de nieuwe pagina stopte de lus al **na één ronde** terwijl
er drie mogen, met score 68 onder de drempel van 80. Er bestaat geen taak
`content_revise:db76cb57-2689-4a7e-8c4a-93fff417e1b5:r1`, terwijl de andere pagina wel netjes een
`:r1` en `:r2` kreeg.

### Waar het zit

`lib/pipeline/content.ts`. Regel 104 `REVIEW_THRESHOLD = 80`, regel 112 `GEO_THRESHOLD = 60`,
regel 123 `COVERAGE_THRESHOLD = 85`, regel 135 `REPAIR_MAX = 3`. De stand wordt gezet op regel 1922
en regel 2196, allebei als `nogEenRonde ? "draft" : "ready"`. De beslissing om door te gaan staat op
regel 2136.

### Wat je doet

1. **Zoek eerst uit waarom de lus na één ronde stopte** bij score 68. Dat is een tegenspraak met de
   eigen regel op regel 2136 en de oorzaak is niet bekend. Begin hier, want de rest van deze taak
   bouwt erop.
2. **Voeg een derde eindstand toe.** Een pagina waarvan `needs_review` waar is komt niet op `ready`
   maar op een stand die op het scherm leest als "check nodig". Kijk in `lib/types/database.ts` bij
   `ContentStatus` of er al een geschikte waarde is. Er is een unittest die eist dat élke waarde uit
   `ContentStatus` een tak heeft in `lib/work.ts`; die moet mee.
3. **Stop de reparatielus zodra de kwaliteit niet meer stijgt**, en bewaar de béste versie in plaats
   van de laatste. Een ronde die het slechter maakt is volgens de eigenaar een fout: log hem als
   waarschuwing zodat hij meetbaar is en niet stil gebeurt.
4. **Werk het commentaar bij `REPAIR_MAX` bij** (regel 127 tot 135). Daar staat dat drie gerichte
   reparaties samen goedkoper zijn dan één volledige herschrijving van $0,162. Gemeten is **$0,26
   per ronde**, dus één ronde kost al 60% meer dan wat vervangen werd. Corrigeer ook de kostenraming
   waar die hardgecodeerd staat.
5. **Bewaak het budget per pagina.** Eén pagina hoort een euro of minder te kosten. Meet het, en zeg
   het in je verslag als je er structureel overheen gaat.

### Hoe je aantoont dat het werkt

- Unittest: een reeks rondes met dalende kwaliteitsscore stopt en bewaart de beste versie.
- Unittest: een pagina met een score onder de drempel na ronde 1 krijgt een ronde 2.
- Ketentest: een pagina met openstaande opmerkingen eindigt op "check nodig" en niet op `ready`.
- Op productie: schrijf één pagina en toon aan dat de eindstand klopt met de opmerkingen eronder.

---

## T2. Maak contentkwaliteit meetbaar

**Waarom dit erin staat.** Voor de meting bestaat een evaluatieset (`npm run eval:mention`). Voor
het duurste en belangrijkste onderdeel van de app, het schrijven, bestaat er niets. Elke wijziging
aan de schrijfinstructie is daardoor een gok met een overtuigend verhaal eromheen. Zonder maatstaf
kan niemand aantonen dat T1 de kwaliteit echt verbeterde.

De eigenaar heeft gekozen voor **allebei**: hij beoordeelt eerst zelf verse teksten, en dat oordeel
wordt daarna de meetlat.

### Wat je doet

1. **Laat de app vijf verse teksten schrijven** voor één echt merk, over vijf verschillende
   onderwerpen. Kosten ongeveer $5, dus dit is het grootste deel van het testbudget van €10. Doe dit
   ná T1, zodat je meet wat je gerepareerd hebt.
2. **Leg ze aan de eigenaar voor** met per tekst één vraag: zou je deze zonder aanpassing naar een
   klant sturen, ja of nee, en zo nee, wat is het eerste dat je zou veranderen. Stel dat als
   keuzevraag met opties, niet als open vraag.
3. **Maak van zijn antwoorden een vaste beoordelingsset**, in dezelfde vorm als de bestaande
   `eval:mention`: per tekst wat er goed is en wat er fout is, met een score die je opnieuw kunt
   draaien. Zet er een commando bij, bijvoorbeeld `npm run eval:content`.
4. **Draai die set vóór en ná elke wijziging** aan het schrijfproces, en zet de twee cijfers naast
   elkaar in je verslag.

### Waar je op moet letten bij het beoordelen

Uit de audit kwamen vier dingen die een lezer meteen ziet en die dus in de beoordelingsset horen:

- **Andere bedrijven in de tekst.** Er stond "Infomedics" in een pagina van een tandartspraktijk.
- **De titel is de interne opdrachtzin.** `content_pieces.title` was "Maak de pagina over
  tandartsangst de duidelijke startpagina voor angst". Dat is de aanbeveling aan onszelf, geen
  paginatitel. De `meta_title` was wel goed.
- **Te veel slagen om de arm.** Zinnen als "niet bevestigd" en "dat stemt u af met de praktijk"
  stonden er tientallen keren in, omdat de feitenkaart dun was. Een copywriter schrijft die zinnen
  niet, die stelt een vraag of laat het onderwerp weg.
- **Herhaling.** De eigen beoordelaar merkte op dat drie secties dezelfde belofte herhaalden.

---

## T3. Publiceren op elk willekeurig adres

### Wat er nu gebeurt

Bij het vastleggen wordt alleen de vórm van het adres gecontroleerd. De pagina komt meteen op
`published`. Op productie aangetoond: een adres dat niet bestaat gaf **202**, en
`https://www.example.com/` gaf ook **202**, op een pagina die op dat moment 71 openstaande
opmerkingen had.

Er draait wel een echte controle, ongeveer veertig seconden later, en die doet het goed. Voor
example.com schreef hij weg: `"reachable": true, "textFound": false, "textMatchRatio": 0` met de
melding "De pagina bestaat, maar we vinden er geen enkele zin uit onze tekst op." **Met die uitkomst
gebeurt vervolgens niets**: de stand blijft `published`.

### Waar het zit

`app/api/analyses/[id]/content/[pieceId]/publish/route.ts` (de `POST`) en `lib/pipeline/publish.ts`
regel 32 (`markPublished`). De controle zelf is de taak `verify_publication` en werkt naar behoren.

### Wat je doet

1. Weiger een adres dat niet op het domein van het merk staat. Het domein staat in `profiles.url`.
   Let op `www` en subdomeinen.
2. Laat de uitkomst van `verify_publication` iets doen: is de pagina onbereikbaar of staat onze
   tekst er niet op, zet de pagina dan terug op "nog niet gepubliceerd" met de reden erbij.
3. Zorg dat een pagina met `needs_review` niet gepubliceerd kan worden. Dat is de andere kant van T1.

### Hoe je aantoont dat het werkt

Unittest op de domeincontrole met `www`, een subdomein, een ander domein en een adres met een pad.
Ketentest die de controle laat mislukken en eist dat de stand terugvalt.

---

## T4. De kostenpoort, precies zoals de eigenaar hem wil

### De regel

Een klant mag alles inzien en alles aanklikken. Drukt hij op een knop die echt AI aanroept en geld
kost, dan gebeurt er niets en krijgt hij een melding dat zijn **customer success manager bij Outer
Orbit** dit voor hem doet.

### Wat er nu gebeurt

Elke ingelogde klant kan zelf een merk aanmaken en een cluster starten, en dat zet allebei betaald
werk in gang. Aangetoond op productie: als `e2e-klant@orbit-test.nl` gaf `POST /api/profiles` een
**201** en de volledige onderzoekspijplijn liep. Hetzelfde geldt voor `POST /api/analyses`.

### Waar het zit

`lib/cost-rules.ts` regel 71: in `STAFF_ONLY_ACTIONS` staan alleen `reputatie_starten` en
`clusters_aanvullen`. De andere vijf staan open. `lib/cost-guard.ts` leest die lijst en is de enige
plek waar dit besluit hoort te staan. In `app/api/profiles/route.ts` regel 61 staat commentaar dat
zegt dat alleen de beheerder betaald werk start, wat de code op dit moment niet afdwingt.

### Wat je doet

1. Zet **alle** handelingen in `STAFF_ONLY_ACTIONS`: `merk_onderzoeken`, `analyse_starten`,
   `meting_starten`, `content_schrijven`, `plan_goedkeuren`, `reputatie_starten` en
   `clusters_aanvullen`.
2. Herschrijf de teksten in `COST_DENIED` naar de formulering van de eigenaar. Ze zeggen nu "je
   consultant"; dat wordt de customer success manager bij Outer Orbit. Houd ze uitnodigend, niet
   afwijzend: de klant mag weten dat de functie bestaat.
3. Zorg dat de klant de knop wél ziet en kan indrukken, en dan de melding krijgt. Dat is de wens van
   de eigenaar en het verkoopt de functie. Verberg de knoppen dus niet.
4. Haal het misleidende commentaar in `app/api/profiles/route.ts` regel 61 weg en zet er neer wat er
   na jouw wijziging echt gebeurt.
5. Controleer dat élke route die geld kost `mayTriggerCost` aanroept. Er bestaat al een unittest die
   dat patroon per bestand afdwingt; zoek in `scripts/test-unit.ts` op `mayTriggerCost`.

### Hoe je aantoont dat het werkt

Unittest: `actionNeedsStaff` geeft `true` voor alle zeven. Live met het klantaccount: elke dure
route geeft **403** met de juiste melding, en dezelfde route als beheerder werkt gewoon.

---

## T5. De uitgavenplafonds omzetten naar de bedragen van de eigenaar

### Wat er nu staat

`lib/spend-rules.ts` regel 78 en 79: **€50 per maand per account** en **€150 per dag** over alles
heen. De eigenaar wil iets anders: **€20 per dag per klant** en **€50 per dag over alle accounts
samen**, met een duidelijke melding zodra het plafond geraakt wordt.

### Wat je doet

1. Zet het maandplafond per account om naar een **dagplafond** per account van €20, en het
   dagplafond over alles heen naar €50. Let op: dit verandert de betekenis van de teller, dus de
   optelling in `lib/spend-limit.ts` moet mee.
2. Schrijf een melding die zegt wat er aan de hand is en wat je eraan doet, niet alleen dat er iets
   geweigerd is. De beheerder moet weten of hij moet wachten tot morgen of iemand moet bellen.
3. Laat de bedragen instelbaar blijven via omgevingsvariabelen, met deze waarden als standaard. De
   eigenaar geeft zelf aan wanneer ze omhoog gaan.
4. Reken na wat dit betekent: een onboarding kost ongeveer $0,25, een meting van dertig vragen
   ongeveer $0,85, een pagina ongeveer $1,00. Bij €20 per dag past dat ruim, maar zeg het in je
   verslag als een normale werkdag van een klant tegen het plafond aan loopt.

### Hoe je aantoont dat het werkt

Unittests op de grensgevallen: net onder het plafond mag door, net erover wordt geweigerd met de
juiste melding, en het dagplafond over alle accounts wint van het plafond per account.

---

## T6. Zorg dat de cijfers kloppen, en houd dat zo

### Wat er aan de hand was

Op 30 augustus 2026 is er een vangnet bijgekomen dat een vermelding alleen telt als de merknaam echt
in het antwoord staat (`lib/pipeline/measure.ts`, de regel met `candidateNames.some(...)`). De
metingen van vóór die datum zijn nooit opnieuw beoordeeld. Over alle 774 gemeten antwoorden op
productie: **elf** tellen als vermelding terwijl de naam nergens in het antwoord staat, en **zes**
noemen het merk letterlijk en tellen niet mee. Ná 30 augustus: nul van beide, over 260 antwoorden.

**Door T7 wordt dit grotendeels vanzelf opgelost**, want al die metingen horen bij testmerken die
weg mogen. Wat blijft staan is de les: een reparatie aan de meting moet ook gelden voor wat er al
gemeten is.

### Wat je doet

1. Voer T7 uit (opruimen). Draai daarna de controlequery hieronder en kijk of er nog iets overblijft.
2. Blijft er iets over, herbeoordeel dat met een eenmalig script dat de opgeslagen `raw_response`
   opnieuw door dezelfde functie haalt en `tracking_run_mentions` bijwerkt. **Er is geen enkele
   betaalde aanroep nodig**: alle ruwe antwoorden staan er nog.
3. Zet er een test op die borgt dat het vangnet blijft werken, zodat dit niet nog eens ongemerkt
   wegvalt.

### De controle

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

⚠️ Eén valkuil: het merk `gasservice-brabant.nl` heet naar zijn domein terwijl de antwoorden
"Gasservice Brabant" schrijven. Die gevallen zijn terecht en geen fout.

---

## T7. De database leegmaken

**Besloten door de eigenaar op 2 september 2026:** er zijn nog geen echte klanten, alle merken komen
uit oudere ontwikkelrondes toen de app anders werkte, en ze mogen allemaal weg. Wat blijft staan zijn
de twee inlogaccounts.

### Wat je doet

1. **Maak eerst een lijst** van wat je gaat verwijderen en laat die zien: hoeveel merken, metingen,
   rapporten, teksten en taken. Verwijderen kan niet terug.
2. **Kijk of er een bestaande verwijderroute is.** Er is een `lib/deletion.ts` en een `DELETE` op
   `/api/accounts/[id]`. Gebruik wat er al is in plaats van met de hand tabellen leeg te maken: dan
   test je meteen of het opruimen zelf werkt. Werkt het niet goed, dan is dát een bevinding.
3. **Verwijder alle merken**, inclusief die van vandaag. Er zijn er zestien.
4. **Laat staan**: de accounts `e2e-consultant@orbit-test.nl` en `e2e-klant@orbit-test.nl` met hun
   inloggegevens.
5. **Ruim ook op**: de tabel `_backup_20260729` (51 rijen, restant van een oude migratie), na
   toestemming.
6. **Controleer daarna** dat de app niet stukgaat op een lege database: het overzicht, het
   merkenscherm en de werklijst horen een nette lege staat te tonen, geen foutmelding.

### Let op, twee dingen die vandaag zijn ingepland

- **Twee hermetingen staan klaar voor 16 en 30 september** bij pagina
  `db76cb57-2689-4a7e-8c4a-93fff417e1b5`. Die kosten geld als ze draaien en ze verwijzen naar een
  merk dat je gaat weggooien. Verwijder ze mee, anders lopen ze straks vast.
- **De pagina die als gepubliceerd staat op `https://www.example.com/`** hoort bij hetzelfde merk en
  gaat dus vanzelf mee.

⚠️ **Eén merk verdient een aparte notitie.** Tandartspraktijk de Kroon (Noordwijk) is een echt
bedrijf dat geen klant is en dat hier nooit om gevraagd heeft. Bij dat profiel staan vier verzonnen
antwoorden op feitenvragen, elk beginnend met "TESTANTWOORD (niet feitelijk)". Die zijn tijdens de
audit ingevuld om de keten te kunnen testen. Verwijder dit merk in elk geval, en benader het bedrijf
niet.

---

## T8. De kleinere correcties

Elk punt is klein op zichzelf. Doe ze in dezelfde branch, met per punt een test.

1. **Dubbele meetvragen.** In één meting van dertig vragen zaten er twee **letterlijk identiek**,
   omdat de ontdubbeling per funnelfase gebeurt en niet over de hele set. `lib/pipeline/prompts.ts`
   regel 334: de verzameling `seen` wordt per fase aangemaakt. Til hem op naar het niveau van de hele
   analyse. Gevolg nu: de klant betaalt twee keer voor dezelfde vraag en die vraag weegt dubbel in
   zijn score.

2. **Een vraag wijzigen of verwijderen tijdens een lopende meting** wordt geaccepteerd met een
   **200**. Op productie aangetoond: twee al betaalde metingen bleven achter zonder vraag, en de
   score werd berekend over **31** groepen terwijl de klant **29** vragen had. De score kwam op 14,00
   in plaats van 14,94, terwijl het rapport eronder "In 29 onderzochte vragen" schrijft. Weiger
   wijzigen en verwijderen zodra de meting loopt, in
   `app/api/analyses/[id]/prompts/[promptId]/route.ts` (`PATCH` regel 49, `DELETE` regel 104).

3. **Concurrenten dubbelen.** Na één onboarding stonden er negen concurrenten in het profiel waarvan
   er vier dubbel waren: "Cleyburch Tandartsen" naast "Cleyburch Tandartsen in Noordwijk", en zo ook
   Dental4U, MondCleanic en De Voorstraat. `lib/pipeline/market.ts` regel 241 voegt samen met
   `new Set` op de exacte tekst. Ontdubbel op een genormaliseerde naam. Deze lijst stuurt de
   beoordeling van elke meting aan.

4. **Het menu in de crawl.** Van alle 51 gecrawlde pagina's begon er 51 met het navigatiemenu, dat
   gemiddeld eindigde op teken **698** van de 1500 die bewaard worden. Dat is 46,5% ruis in de
   inventaris die het rapport, de gap-analyse en de paginakoppeling voedt. De oplossing bestaat al:
   `stripChrome()` in `lib/pipeline/page-text.ts` regel 94, nu alleen gebruikt bij het ophalen van
   een bestaande pagina. Gebruik hem ook in de crawl, in `lib/crawler.ts`, vóór het afkappen op
   `PAGE_MAX_CHARS` (regel 66). ⚠️ Dit raakt de inventaris van elke klant: meet op minstens twee
   echte sites hoeveel het scheelt en of er geen inhoud sneuvelt.

5. **HTML-entiteiten.** `htmlToText()` in `lib/crawler.ts` regel 103 decodeert zes namen en geen
   enkele numerieke code, dus `&#8220;` blijft staan. Op productie: **76 van de 790** gecrawlde
   pagina's. Het staat ook in `evidence_quote`, de tekst waarmee een bewering letterlijk onderbouwd
   moet worden.

6. **Nul pagina's gemeld als waarschuwing.** Bij een merk waarvan de site niet te crawlen was meldde
   de technische controle: "Geen enkele van de 0 gecontroleerde pagina's heeft schema.org-opmaak",
   als waarschuwing. Bij nul pagina's hoort de stand onbekend te zijn, zoals de controle ernaast het
   wel goed doet. Conventie 3.

7. **Een leeg merk heet "klaar".** Datzelfde merk kreeg `status = 'klaar'` met nul gecrawlde
   pagina's, nul aanbodregels, nul onderwerpen en nul feiten, terwijl het profiel er gevuld uitzag
   met branche, werkgebieden en concurrenten uit web-zoekacties. Voor een consultant die dit vóór een
   demogesprek klaarzet is dat de gevaarlijkste vorm. Geef zo'n merk een zichtbare stand die zegt dat
   de site niet gelezen kon worden.

8. **Een weggelaten concurrentnaam laat een kapotte zin achter.** Een vraag die de klant te zien
   kreeg luidde: *"...met argumenten als 'een andere aanbieder – Noordwijkerhout — heeft een speciale
   angsttandarts'..."*. De naam is weg, de gedachtestreepjes en de plaatsnaam niet. Twee dingen mis:
   een onleesbare zin, en gedachtestreepjes die volgens `docs/schrijfstijl.md` nergens mogen staan.
   Zet er een vangnet op dat gedachtestreepjes uit modeltekst haalt voordat de klant hem ziet.

9. **Modeluitvoer naar de browser.** Het antwoord van `PATCH /api/profiles/[id]/facts` bevat de
   complete `raw_json` van de vraag, inclusief het antwoord-id van OpenAI. Stuur alleen terug wat het
   scherm nodig heeft.

10. **Een pakket van tien levert een plan van vijf.** Het account stond op tien pagina's per maand,
    de meting leverde vijf aanbevelingen, en het plan zette er vijf in maand 1 zonder ergens te
    melden dat er vijf ontbreken.

11. **Geen enkele snelheidsbegrenzing.** De tabel `rate_limits` bestaat, is leeg, en het woord komt
    in de hele code niet voor. Inloggen en het verzilveren van een uitnodiging zijn onbegrensd. Zet er
    minstens op die twee routes een begrenzing op.

12. **Zet de controle op gelekte wachtwoorden aan** in Supabase Auth. Staat nu uit.

---

## T9. De wachttijd, als laatste

De eigenaar zegt: tijd maakt niet zoveel uit, als het maar goed gebeurt en niet onnodig lang duurt.
Daarom staat dit onderaan. Doe het pas als T1 tot en met T8 af zijn, en bij voorkeur in een eigen
branch met eigen verificatie.

**Wat er nu gebeurt**, gemeten over alle taken op productie:

| Taak | wachten | werken |
|---|---|---|
| `content_draft` (41 stuks) | **2533 s** gemiddeld | 38 s gemiddeld |
| `content_revise` (41 stuks) | 137 s | 71 s |
| `measure_prompt` (789 stuks) | 735 s | 18 s |

Een klant wacht bij het schrijven van een pagina dus gemiddeld tweeënveertig minuten op achtendertig
seconden werk. **Dat is het onnodige wachten waar de eigenaar het over heeft.**

**Waar het zit.** `lib/jobs/worker.ts` regel 120: `CLAIM_BATCH = 5` taken per ronde, met 200 van de
240 seconden vrijgehouden voor een zware taak. De werker start elke minuut. `content_draft` en
`content_revise` staan in `HEAVY_JOB_TYPES` maar niet in `IO_BOUND_HEAVY_TYPES`
(`lib/jobs/types.ts`), dus ze draaien strikt één voor één.

**Richting.** Zoek uit of contentgeneratie in `IO_BOUND_HEAVY_TYPES` past en of de werker meer taken
per ronde mag claimen. Meet vooraf en achteraf met dezelfde query, zodat er een cijfer ligt.

---

## 4. Wanneer is dit af

1. **T1 tot en met T8 zitten in de code**, elk met een test die de fout zou hebben gevangen, en de
   vier controles staan groen.
2. **De beoordelingsset uit T2 bestaat en is gedraaid**, met een cijfer vóór en ná de reparaties uit
   T1, en de eigenaar heeft vijf verse teksten beoordeeld.
3. **Op productie nagelopen met de twee testaccounts** (conventie 10): een klant krijgt de melding
   over zijn customer success manager op elke dure knop, een pagina met openstaande opmerkingen is
   niet te publiceren, publiceren op een vreemd domein wordt geweigerd, en het dagplafond werkt.
4. **De database is leeg** op de twee testaccounts na, en de app toont nette lege schermen.
5. **De kosten zijn gemeten**: wat kost een pagina nu echt, en zit dat onder de euro.
6. **`docs/logbook.md` heeft er een alinea bij**, onderaan, met de datum en de cijfers die je
   gemeten hebt. `docs/tasks/technische-audit-2-september-2026.md` krijgt per opgelost punt een regel
   met de stand. Dit plan gaat weg zodra alles erin af is.

**Het echte doel blijft T2.** De rest van dit plan zorgt dat de app niets stuk of duur doet. T2 is
het enige onderdeel dat aantoont dat de content goed genoeg is om het werk van een copywriter over
te nemen, en dat is waar de eigenaar dit product op afrekent.
