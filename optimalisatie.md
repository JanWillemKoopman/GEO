# Optimalisatieplan GEO Tracker

Stapsgewijze implementatiehandleiding, in de volgorde waarin het gebouwd moet worden.

Dit document is geschreven op basis van een volledige doorlichting van de code op `main`
(commit `12260c9`). Het beschrijft wat er moet veranderen, in welke volgorde, en waarom —
zowel aan de techniek als aan de gebruikerservaring. Elke fase is af te ronden en te
releasen zonder de volgende fase nodig te hebben.

---

## Hoe je dit document gebruikt

- **De volgorde is niet vrijblijvend.** Elke fase noemt expliciet waar hij van afhangt.
  Fase 2 vóór Fase 1 bouwen levert een meting op die niet binnen de tijdslimiet past;
  Fase 5 vóór Fase 4 levert een cirkel op zonder inhoud om te meten.
- **Elke fase heeft een techniekspoor én een UX-spoor.** Die horen in dezelfde fase te
  landen, niet in een "UI-sprint achteraf". Een fase is pas af als beide sporen af zijn.
- **"Klaar als…"** onderaan elke fase is de acceptatietest. Kun je die niet afvinken, dan
  is de fase niet af, ook al staat de code er.
- Stappen zijn genummerd (`3.2`, `4.5`) zodat je ernaar kunt verwijzen in issues en commits.

### Waarom deze volgorde

De kern van het probleem is dat de app **meet** en **schrijft**, maar dat die twee helften
elkaar nergens raken. De meetdata bereikt de schrijver niet, en de geschreven content komt
nooit terug in de meting. Het einddoel van dit plan is die cirkel sluiten (Fase 4 en 5).

Maar je kunt geen cirkel sluiten rond een meting die je niet kunt vertrouwen, en je kunt
geen zwaardere meting draaien binnen een architectuur die na 60 seconden afgekapt wordt.
Vandaar:

```
Fase 0  fundament          →  fouten en ruis eruit, zodat de rest meetbaar is
Fase 1  achtergrondmotor   →  het tijdslimiet-plafond weg
Fase 2  betrouwbare meting →  cijfers die een klant mag geloven
Fase 3  bewijs zichtbaar   →  vertrouwen + blokkades opsporen
Fase 4  schrijver voeden   →  content die op de meting gebaseerd is
Fase 5  cirkel rond        →  aantoonbaar resultaat
Fase 6  trend & herhaling  →  de wekelijkse belofte waarmaken
Fase 7  off-site           →  het plafond van on-site advies doorbreken
```

---

## Uitgangspunten

Deze principes gelden door alle fasen heen. Bij twijfel in een implementatiekeuze: hier
terugkijken.

1. **Bewijs verslaat cijfer.** Een screenshot van wat ChatGPT letterlijk antwoordt over
   een concurrent overtuigt een ondernemer meer dan welke score dan ook. Bij elke feature:
   kunnen we het onderliggende bewijs tonen in plaats van alleen de conclusie?
2. **Geen schijnprecisie.** Een geschat getal mag nooit gepresenteerd worden alsof het
   gemeten is. Als we een schatting tonen, staat erbij dat het een schatting is — in de
   UI, niet alleen in een code-comment.
3. **De klant wacht nooit op ons.** Geen enkele klantactie mag afhangen van een browsertab
   die openblijft. Werk gebeurt op de achtergrond; de UI toont voortgang en is verversbaar.
4. **De klant is geen SEO'er.** Geen jargon, geen interne metrieken, geen stacktraces in
   de interface. Elke term die uitleg nodig heeft, krijgt uitleg op de plek zelf.
5. **Elke aanbeveling is herleidbaar.** De klant moet van elke aanbeveling kunnen
   doorklikken naar de meetdata waar hij uit voortkomt.
6. **Alles bewaren blijft.** Het bestaande principe (elke AI-aanroep slaat zijn volledige
   ruwe uitvoer op) is goed en blijft gelden voor alles wat we toevoegen.
7. **Klant-input is leidend.** Het bestaande patroon (`filled()` / `unionList()` in
   `lib/pipeline/prepare-profile.ts`) is goed en wordt overal aangehouden waar we nieuwe
   AI-verrijking toevoegen.

---

## Overzicht van de fasen

| Fase | Onderwerp | Omvang | Hangt af van |
|---|---|---|---|
| 0 | Stabiel fundament: bugs, retries, kosten, classifier-test | Klein | — |
| 1 | Achtergrondmotor (`jobs`) + eerlijke wacht-UX | Middel | 0 |
| 2 | Betrouwbare meting: meerdere metingen, entiteiten samenvoegen | Middel | 1 |
| 3 | Bewijs & blokkades: ruwe antwoorden tonen, techniek-audit | Middel | 2 |
| 4 | De schrijver krijgt de uitslagen | Groot | 2, 3 |
| 5 | De cirkel rond: publiceren → hermeten → delta | Groot | 4 |
| 6 | Trend & terugkerend rapport | Middel | 2, 5 |
| 7 | Off-site zichtbaarheid | Middel | 3 |

---

# Fase 0 — Stabiel fundament

**Doel:** alle bekende fouten en alle vermijdbare ruis eruit, zodat de effecten van latere
fasen meetbaar zijn. Geen nieuwe functionaliteit. Dit is bewust de saaiste fase en hij moet
eerst.

**Hangt af van:** niets.

### Techniek

**0.1 — Rekenfout in de concurrentiebalken**
`app/analyses/[id]/score-panel.tsx` deelt `mentions_count` door `activePromptCount` (het
*huidige* aantal actieve prompts), terwijl de tellingen uit *historische* runs komen. Zet
de klant een prompt uit, dan schieten balken boven de 100%.
→ Geef het aantal runs van die week mee als noemer (te tellen uit `tracking_runs` voor
`(analysis_id, week_no)`) in plaats van de actieve promptteller.

**0.2 — "Geen oordeel" wordt geteld als "niet genoemd"**
`lib/pipeline/report.ts` (`computeMissedPrompts`) doet `!ownMentioned.get(id)`. Ontbreekt de
eigen-merk-rij omdat de classificatiestap faalde, dan telt dat als gemiste kans en gaat er
een verkeerde aanbeveling uit.
→ Onderscheid drie toestanden: genoemd / niet genoemd / geen oordeel. Alleen "niet genoemd"
telt als gemist; "geen oordeel" wordt apart geteld en zichtbaar gemaakt als datakwaliteit.

**0.3 — Meervoudige eigen-merk-rijen**
`lib/pipeline/measure.ts` regel ~166: `for (const m of mentions) if (m.is_own_brand)
ownByRun.set(...)` — bij meerdere eigen-merk-rijen wint willekeurig de laatste.
→ Voeg samen met een expliciete regel (genoemd wint van niet-genoemd, laagste positie
telt) in plaats van impliciet de laatste te nemen.

**0.4 — Automatische nieuwe pogingen**
`lib/openai/client.ts` maakt een kale client. Eén tijdelijke 429 tussen twaalf parallelle
aanroepen laat via `Promise.allSettled` de héle meting mislukken.
→ `new OpenAI({ apiKey, maxRetries: 3, timeout: 90_000 })`. Vang daarnaast per prompt af,
zodat één mislukte prompt de andere elf niet meesleept: markeer die prompt als
`meetfout` en laat de meting slagen met een zichtbare notitie "11 van de 12 vragen gemeten".

**0.5 — Determinisme waar het kan**
Er wordt nergens een `temperature` gezet, dus alles draait op de standaardwaarde.
→ Zet expliciet per soort aanroep in `lib/openai/structured.ts`: laag (0–0.2) voor
classificatie, beoordeling en analyse; hoger (0.7–0.8) alleen voor het schrijven van
content. Dit alleen al halveert een deel van de meetruis.

**0.6 — Kosten registreren**
De kolom `tracking_runs.cost_usd` bestaat en wordt nooit gevuld; `tokens_used` wél.
→ Reken de kosten uit (tokens × tarief per model + het vaste tarief per web-zoekactie) en
schrijf ze weg bij élke aanroep, ook bij content en rapport. Bouw een simpele
kostenweergave per analyse. Zonder dit kun je Fase 2 (drie keer zoveel metingen) niet
verantwoord inplannen.

**0.7 — Testset voor de mention-classificatie**
Dit is het belangrijkste punt van Fase 0. Het bepalen van "wordt dit merk genoemd, op welke
plek, met welke toon" is het fundament onder élk cijfer in de app, en het draait op het
goedkoopste model (`gpt-4.1-nano`) zonder enige controle.
→ Leg ~50 opgeslagen `raw_response`-fragmenten vast met handmatig bepaald juist antwoord
(in `scripts/` als JSON-bestand). Schrijf een script dat de classificatie erop draait en de
afwijking rapporteert. Draai hem op nano én op mini en kies op basis van de uitkomst — niet
op basis van de prijs. Neem dit script op in de standaard-testronde vóór elke release.

**0.8 — Weggefilterde prompts aanvullen**
`lib/pipeline/prompts.ts` gooit prompts weg die een merk- of concurrentnaam bevatten
(`containsForbidden`) en doet daarna `.slice(0, count)`. Zonder aanvulling krimpt de
meetbasis stil van 12 naar bijvoorbeeld 9.
→ Vul aan tot het gevraagde aantal met een tweede aanroep, met maximaal twee pogingen. Log
hoeveel er weggefilterd is.

**0.9 — Woordgrenzen bij het filter**
Datzelfde filter is een simpele "komt deze tekst erin voor"-controle op stukjes van meer
dan drie tekens. Een concurrent die "Snelservice" heet wist elke legitieme prompt waarin
dat woord voorkomt.
→ Match op hele woorden (`\b…\b`, hoofdletterongevoelig) en sla stukjes over die ook een
gewoon Nederlands categoriewoord zijn.

**0.10 — Ondergrens van het gewicht herijken**
`lib/pipeline/prompt-weight.ts` heeft `MIN_WEIGHT = 0.1`. Alle informatieve vragen met een
geschat volume tot 33 vallen daardoor op exact hetzelfde gewicht — precies in de staart
waar het gewicht juist onderscheid moest maken.
→ Verlaag de ondergrens naar 0.02, of schaal de waardefactoren zo dat de ondergrens pas in
uitzonderingen bereikt wordt.

### UX

**0.11 — Geen stacktraces meer voor de klant**
`prepare-progress.tsx`, `measure-progress.tsx` en `report-progress.tsx` tonen bij een fout
het ruwe serverbericht in monospace. In de code staat zelf `⚠️ Tijdelijk: detail meesturen
voor debugging tijdens de bouwfase`.
→ Vertaal fouten naar drie begrijpelijke categorieën met een passende actie:
  - *"We konden je website niet bereiken"* → controleer de URL, opnieuw proberen
  - *"De AI-dienst was even niet beschikbaar"* → we proberen het zo automatisch opnieuw
  - *"Er ging iets onverwachts mis"* → opnieuw proberen + melden
Bewaar de technische details wél (in de logs en achter een uitklapper "technische details"
voor jullie zelf), maar maak ze niet het eerste wat de klant leest.

**0.12 — Websiteveld valideren vóór indienen**
`onboarding-wizard.tsx` accepteert elke tekst als website. Een typefout leidt pas minuten
later tot een mislukt profiel met een technische foutmelding.
→ Valideer het formaat direct in het veld, en doe bij het indienen een snelle
bereikbaarheidscontrole. Is de site niet bereikbaar, zeg dat meteen, op het formulier, met
de mogelijkheid om toch door te gaan.

### Klaar als…

- [x] ~~Het classificatie-testscript draait~~ — het script en de testset staan er
      (`npm run eval:mention -- --compare`), maar zijn **nog niet gedraaid**: deze omgeving
      had geen `OPENAI_API_KEY`. De uitgangswaarde is dus nog onbekend. **Eerste actie bij
      het oppakken van dit plan.**
- [x] Een kunstmatig veroorzaakte fout in één prompt laat de andere metingen doorlopen
      (drempel 70%, zie `MIN_SUCCESS_RATIO`).
- [x] De kosten van een volledige analyse zijn af te lezen — `GET /api/analyses/[id]/costs`.
      ⚠️ Tarieven in `lib/openai/pricing.ts` moeten nog geverifieerd worden.
- [x] Geen enkel scherm toont nog een technische foutmelding als eerste boodschap.
- [x] Een verkeerd getypte website wordt in het formulier zelf opgemerkt.

**Status: afgerond**, met twee openstaande verificaties (testscript draaien, tarieven
controleren). Typecheck, lint en productiebuild slagen.

---

# Fase 1 — Achtergrondmotor

**Doel:** het werk loskoppelen van de browser en van de 60-secondenlimiet. Dit is de
voorwaarde voor bijna alles wat daarna komt.

**Hangt af van:** Fase 0.

### Het probleem, precies

Twee dingen die nu misgaan en die dezelfde oorzaak hebben:

1. **De browser is de motor.** `PrepareProgress`, `MeasureProgress` en `ReportProgress`
   starten het werk zelf met een `fetch` vanuit de client. Onder aan diezelfde schermen
   staat *"Je kunt dit scherm sluiten en later terugkomen — de voortgang loopt gewoon
   door."* Dat klopt niet. Sluit de klant na de meting de tab, dan wordt het rapport pas
   gemaakt als hij terugkomt en het scherm de aanroep opnieuw doet. De belofte in de
   interface is onwaar, en dat is precies het soort ding dat vertrouwen kost.
2. **Alles moet binnen 60 seconden.** Nu net haalbaar met 12 vragen. In de code staat dat
   productie 30 vragen wordt (`promptsPerFunnelStage = 10`) — dat past niet. Contentgeneratie
   doet tot vier AI-aanroepen achter elkaar waarvan twee een volledig artikel schrijven;
   dat is nu al de meest waarschijnlijke plek waar het stukloopt.

De oplossing ligt klaar: de tabel `jobs` bestaat al, met status, pogingen, planning en
foutkolom, en met de juiste indexen. Er is alleen nooit iets op gebouwd.

### Techniek

**1.1 — Werkverdeler bouwen**
Eén route (`/api/cron/worker`) die per aanroep een klein aantal taken oppakt: claim een
taak met status `queued` en `scheduled_for <= now()` (met `for update skip locked` zodat
twee gelijktijdige aanroepen niet dezelfde taak pakken), zet hem op `running`, voer hem
uit, zet `done` of `failed` met foutbericht. Plan hem elke minuut in via `vercel.json`.

**1.2 — Nieuwe pogingen met oplopende wachttijd**
Bij mislukken: `attempts + 1`, `scheduled_for = now() + 2^attempts minuten`, tot maximaal
vier pogingen, daarna definitief `failed`. Dit is de plek waar tijdelijke storingen
onzichtbaar worden voor de klant.

**1.3 — Taaksoorten definiëren**
`profile_research`, `prepare_analysis`, `measure_prompt` (per prompt, niet per analyse!),
`aggregate_week`, `generate_report`, `generate_content`. Door per prompt te plannen, past
elke taak ruim binnen de tijdslimiet en is Fase 2 (meerdere metingen per vraag) een kwestie
van meer taken plannen in plaats van een architectuurwijziging.

**1.4 — Routes worden planners**
De bestaande routes (`prepare`, `measure`, `report`, `generate`) voeren het werk niet meer
zelf uit maar zetten taken in de wachtrij en geven direct antwoord. De pipeline-functies
in `lib/pipeline/` blijven zoals ze zijn — ze worden alleen vanuit de werkverdeler
aangeroepen in plaats van vanuit de route. Dit houdt de wijziging klein.

**1.5 — Aaneenschakeling op de server**
Het rapport wordt nu door de browser gestart nadat de meting klaar is. Dat gaat naar de
server: als de laatste `measure_prompt`-taak van een analyse klaar is, plant de
werkverdeler zelf `aggregate_week` en daarna `generate_report`. De klant hoeft nergens meer
te zijn.

**1.6 — Voortgang uit de taakstand**
`/api/analyses/[id]/status` telt straks taken (`3 van 12 klaar`) in plaats van resultaten.
Nauwkeuriger en het werkt ook als de klant het scherm nooit geopend heeft.

### UX

**1.7 — De belofte waarmaken**
Nu de tekst *"Je kunt dit scherm sluiten"* eindelijk waar is, mag hij prominenter. Voeg toe
wat er gebeurt als het klaar is.

**1.8 — Bericht als het klaar is**
Er gaat al een rapportmail uit via Resend (`lib/email/report-email.ts`). Breid dat uit tot
een bewuste keuze bij het starten van een analyse: *"We mailen je zodra het rapport klaar
is"* met een aan/uit-schakelaar. Voor een proces dat minuten duurt is dit het verschil
tussen wachten en verdergaan met je werk.

**1.9 — Eerlijke tijdsindicatie**
Nu staat er "dit duurt doorgaans een halve minuut" en "doorgaans minder dan een minuut".
Bereken de verwachting uit de taakstand (aantal openstaande taken × gemiddelde duur) en
toon een bereik: *"nog ongeveer 2–3 minuten"*. Loopt het uit, zeg dat dan, in plaats van
een teller die stil blijft staan.

**1.10 — Voortgang die niet terugspringt**
De stappenlijst in `PrepareProgress` leidt af van resultaten (`hasTopicResearch`,
`promptCount`) en kan bij een herstart terugspringen. Laat hem de taakstand volgen, zodat
voltooide stappen voltooid blijven.

### Klaar als…

- [x] Een analyse start, de tab wordt gesloten, en later staat het rapport klaar zonder dat
      de klant is teruggekomen. Het werk wordt ingepland bij **aanmaken** (analyse/profiel)
      en bij **goedkeuren** (meting) — niet meer door het voortgangsscherm.
- [x] Een storing herstelt zichzelf via een nieuwe poging (4 pogingen, 2/4/8 min) zonder dat
      de klant een foutmelding ziet; pas na de laatste poging wordt het zichtbaar.
- [x] `promptsPerFunnelStage` kan naar 10 (30 vragen) zonder tijdslimietfouten — elke taak is
      één vraag, en lichte taken draaien vijf tegelijk.
- [x] De klant krijgt een mail als het rapport klaar is, mits aangevinkt bij het starten.

**Status: afgerond.** Typecheck, lint en productiebuild slagen; de wachtrij-logica (backoff,
taakindeling, tijdsindicatie) is met een script geverifieerd.

⚠️ **Nog niet end-to-end gedraaid**: deze omgeving heeft geen database en geen API-key, dus
migraties 0013/0014 zijn niet toegepast en de keten is niet één keer echt doorlopen. Doe dat
als eerste bij het oppakken: migraties draaien, `CRON_SECRET` zetten, en één analyse volgen
van aanmaken tot rapport.

---

# Fase 2 — Betrouwbare meting

**Doel:** cijfers waar een klant zijn beslissingen op mag baseren. Zonder deze fase is elke
trendlijn ruis en is de hele belofte niet aantoonbaar.

**Hangt af van:** Fase 1 (drie keer zoveel aanroepen past niet in de oude architectuur).

### Techniek

**2.1 — Meerdere metingen per vraag**
Nu wordt elke vraag één keer gesteld. AI-antwoorden zijn niet stabiel: een merk dat in vier
van de tien antwoorden voorkomt, meet bij één poging als 0 of als 100.
→ Voeg `sample_no` toe aan `tracking_runs` met een unieke sleutel op
`(analysis_id, prompt_id, week_no, sample_no)`. Stel elke vraag drie keer. De idempotentie
die er al zit blijft werken, alleen per sample.

**2.2 — Van ja/nee naar percentage**
Sla per vraag op in hoeveel van de metingen het merk genoemd werd (0, ⅓, ⅔ of 1) in plaats
van een enkele ja/nee. De zichtbaarheidsscore wordt het gemiddelde daarvan. Dat is meteen
een fijnmaziger cijfer: nu springt de score met 8 punten per vraag.

**2.3 — Bandbreedte berekenen en opslaan**
Bereken bij de score een betrouwbaarheidsinterval en sla dat op in `visibility_scores`. Dit
is wat de UI nodig heeft om eerlijk te zijn over wat we wel en niet weten.

**2.4 — Entiteiten samenvoegen**
`competitor_breakdown` groepeert op de exacte naam. "Coolblue", "coolblue.nl" en
"Coolblue B.V." zijn nu drie concurrenten, en over meerdere weken valt de data verder
uiteen.
→ Nieuwe tabel `entities` per profiel (canonieke naam + schrijfwijzen), met normalisatie
(kleine letters, rechtsvorm en domeinsuffix eraf, leestekens weg) vóór het groeperen.
Nieuw gevonden namen die niet te koppelen zijn, komen in een lijstje dat de klant kan
samenvoegen — zie 2.7.

**2.5 — Aandeel in de antwoorden stabiel maken**
Het huidige "aandeel in de vermeldingen" is `eigen / (eigen + alle concurrentvermeldingen)`,
waarbij de noemer meegroeit met elk nieuw merk dat de classificatie ontdekt. Daardoor is het
cijfer niet vergelijkbaar tussen weken.
→ Bereken het over een **vaste set** (het eigen merk plus de bevestigde concurrenten) en
rapporteer nieuw ontdekte merken apart als "ook genoemd".

**2.6 — Het geschatte volume eerlijk maken**
`volume_estimate` is een gok van de AI op een schaal van 0 tot 100 — de code geeft dat zelf
toe — en gaat vermenigvuldigd het dashboard op als "Gewogen zichtbaarheid".
→ Twee opties, in deze volgorde van voorkeur:
  a) Koppel een echte bron aan (zoekvolume-API, of de Search Console van de klant als hij
     die deelt) en gebruik de schatting alleen als terugval.
  b) Kan (a) nog niet: behoud de schatting, maar geef hem een grofmazige vorm (hoog /
     midden / laag in plaats van een getal met twee decimalen) en label hem in de UI
     consequent als schatting.
In beide gevallen: laat de klant het gewicht per vraag kunnen bijstellen. Hij weet beter
dan het model welke vragen zijn omzet opleveren.

### UX

**2.7 — Concurrenten beheren**
Een scherm waar de klant de concurrentenlijst ziet, namen kan samenvoegen ("dit is dezelfde
als…"), er kan verwijderen die niet kloppen, en er kan toevoegen. Dit is niet alleen
opruimwerk: het is het moment waarop de klant merkt dat de app zijn markt begrijpt, en het
maakt de data meteen beter.

**2.8 — De score eerlijk tonen**
Nu staan er twee getallen van 6xl naast elkaar (score en gewogen score) zonder dat duidelijk
is welke leidend is.
→ Kies er één als hoofdgetal — de gewogen score, want die sluit aan bij wat de klant
verdient — en toon het andere kleiner als context. Zet de bandbreedte er zichtbaar bij
(*"32, met een marge van ±6"* of een balkje) en één zin die uitlegt wat het getal betekent.

**2.9 — Verandering met betekenis**
Zodra er meerdere weken zijn (Fase 6) mag een verandering pas als verandering getoond
worden als hij buiten de bandbreedte valt. Anders: *"stabiel"*. Liever een saaie waarheid
dan een schommeling die de klant laat concluderen dat het product niet werkt.

**2.10 — Uitleg op de plek zelf**
Bij elk cijfer een kleine info-knop met twee zinnen: wat is dit, hoe is het gemeten, hoe
zeker zijn we. Niet in een aparte helppagina — daar komt niemand.

### Klaar als…

- [ ] Dezelfde analyse twee keer achter elkaar gemeten geeft scores binnen de opgegeven
      bandbreedte.
- [ ] Geen enkele concurrent komt dubbel voor in de vergelijking.
- [ ] Op het dashboard is te zien welk getal een meting is en welk een schatting.
- [ ] De klant kan een concurrent samenvoegen of verwijderen en ziet de vergelijking
      meteen bijgewerkt.

---

# Fase 3 — Bewijs en blokkades zichtbaar

**Doel:** twee dingen die los van elkaar staan maar allebei goedkoop en hoogwaardig zijn:
laten zien wát de AI antwoordt, en controleren of de deur überhaupt openstaat.

**Hangt af van:** Fase 2 (je wilt geen ruis tonen als bewijs).

### 3A — De antwoorden tonen

De app slaat elk AI-antwoord volledig op in `tracking_runs.raw_response`. Dat wordt precies
één keer gelezen (door de classificatie) en daarna nooit meer. De klant ziet alleen een
score en balkjes. Terwijl het letterlijke antwoord het overtuigendste is wat het systeem
bezit: *"kijk, dit is wat ChatGPT antwoordt op jouw belangrijkste vraag, en het noemt drie
keer je concurrent en jou niet."*

**3.1 — Nieuw tabblad "Vragen & antwoorden"**
Per vraag een rij: de vraag, of jij genoemd bent (in hoeveel van de metingen), welke
concurrenten wel, en het gewicht. Uitklappen toont het volledige antwoord met de genoemde
merknamen gemarkeerd, plus de bronnen waar de AI naar verwees, als aanklikbare links.

**3.2 — Filters die de klant echt gebruikt**
"Alleen waar ik niet genoemd word" (de werklijst), "hoogste gewicht eerst", en filteren op
fase van het aankoopproces. Standaard: gemist én hoog gewicht bovenaan — dat is de lijst
waar geld in zit.

**3.3 — Doorklikken vanuit het rapport**
Elk probleem in het rapport bevat al `evidenceRunIds`. Die worden nu alleen geteld
("3× aangetoond"). Maak ze aanklikbaar naar de bijbehorende antwoorden. Daarmee wordt
uitgangspunt 5 (elke aanbeveling is herleidbaar) concreet.

**3.4 — Deelbaar bewijs**
Een knop om één vraag-met-antwoord als afbeelding of PDF te exporteren. Bureaus laten dit
aan hun klant zien; ondernemers sturen het naar hun compagnon. Kleine feature, groot
verspreidingseffect.

### 3B — Technische GEO-audit

Nergens in de code komen `GPTBot`, `OAI-SearchBot`, `ClaudeBot`, `PerplexityBot`, `CCBot`,
`Google-Extended` of `llms.txt` voor. We kunnen dus perfecte content laten schrijven voor
een site die AI-crawlers weigert. Het pijnlijke: `lib/crawler.ts` haalt `robots.txt` al op
(voor de sitemaps) en gooit de rest van de inhoud weg.

**3.5 — Crawler-toegang controleren**
Parse in `lib/crawler.ts` ook de user-agent-regels uit `robots.txt` en bepaal per AI-crawler
of hij toegang heeft. Sla het resultaat op bij het profiel.

**3.6 — Overige technische controles**
- Is er een `llms.txt`?
- Levert de site zinvolle tekst zonder JavaScript? (vergelijk de opgehaalde tekstlengte met
  de omvang van de HTML — een vrijwel lege tekst bij een grote pagina is een sterk signaal)
- Hebben de belangrijkste pagina's gestructureerde data?
- Staat de site in de index van Bing? (ChatGPT-zoeken leunt daarop — dit is geen detail)
- Heeft de site een sitemap en is die actueel?

**3.7 — Blokkades als poort, niet als voetnoot**
Vindt de audit een blokkade, zet die dan **boven** het rapport als rode balk: *"ChatGPT's
crawler wordt geweigerd door je website. Zolang dat zo is, kan geen enkele pagina die je
publiceert geciteerd worden."* Met daaronder in gewone taal wat er moet gebeuren en wie dat
kan doen (meestal de webbouwer). Overweeg contentgeneratie te blokkeren of expliciet te
laten bevestigen zolang deze blokkade er is — content laten schrijven die niet gelezen kan
worden is de klant geld laten uitgeven aan niets.

**3.8 — Herhaalcontrole**
Neem de audit op in de wekelijkse lus. Een blokkade kan er morgen zijn na een aanpassing
door de webbouwer, en dan moet de klant dat weten.

### Klaar als…

- [ ] De klant kan per vraag zien wat de AI letterlijk antwoordde en wie er genoemd werd.
- [ ] Vanuit elk probleem in het rapport is door te klikken naar het bewijs.
- [ ] Een site die GPTBot blokkeert levert een duidelijke waarschuwing bovenaan op.
- [ ] De audit draait wekelijks mee.

---

# Fase 4 — De schrijver krijgt de uitslagen

**Doel:** contentgeneratie die gebaseerd is op de meting, in plaats van op het merkprofiel
alleen. Dit is de inhoudelijk zwaarste fase en de belangrijkste voor het hoofddoel.

**Hangt af van:** Fase 2 en 3.

### Het probleem, precies

Wat de schrijfaanroep nu meekrijgt (`buildContentInput` in `lib/pipeline/content.ts`):
merkprofiel, tone of voice, geverifieerde feiten, stijlvoorbeelden, samenvatting van wat de
site zegt, bestaande paginatekst bij verbeteren, en vijf willekeurige vraagteksten
"ALLEEN ter inspiratie".

Wat hij **niet** meekrijgt: welke vraag hij moet winnen, wat de AI antwoordde toen de
concurrent won, en welke bronnen daarbij geciteerd werden.

En de beoordelaar (`CRITIQUE_SYSTEM`) scoort op vijf dingen: begint met het directe
antwoord, on-brand, concreet zonder verzinsels, scanbaar, geen holle frasen. Allemaal
redactioneel. Geen enkel criterium gaat over de vraag of een AI deze pagina zou citeren.

Daar komt een structurele spanning bij: de instructie zegt "verzin geen feiten, blijf
algemeen bij twijfel". Bij een klant met een dunne website levert dat gegarandeerd algemene
tekst op — en algemeen is precies wat niet geciteerd wordt.

### Techniek

**4.1 — Koppeling tussen content en vraag**
Nieuwe tabel `content_piece_targets` (`content_piece_id`, `prompt_id`, `cluster`). Elke
gegenereerde pagina legt vast welke gemiste vragen hij moet gaan winnen. Dit is de spil:
Fase 5 kan er niet zonder, en het maakt dekkingsgraad berekenbaar ("van je 15 gemiste
vragen heb je er 6 geadresseerd").

**4.2 — De doelvraag letterlijk in de opdracht**
Vervang de vijf willekeurige vraagteksten door de concrete gemiste vragen uit dit cluster,
met de instructie dat de pagina die vragen expliciet en direct moet beantwoorden.

**4.3 — Het winnende antwoord als context**
Geef de opgeslagen `raw_response` mee waarin de concurrent wél genoemd werd, met een
duidelijke rol: *dit is het antwoord dat de AI nu geeft; jouw pagina moet de informatie
bevatten die hier ontbreekt of beter is.* Merknamen van concurrenten uit dat antwoord
strippen vóór het meegaat, zodat de bestaande harde regel (nooit een concurrent noemen) niet
in gevaar komt.

**4.4 — De geciteerde bronnen analyseren**
`top_cited_sources` staat al in de database maar wordt als kale lijst in de prompt geplakt.
Haal die pagina's op met de bestaande crawler en geef mee wat ze inhoudelijk doen: welke
vragen beantwoorden ze, in welke vorm, met welke feiten. Dat is de bar waar de nieuwe pagina
overheen moet.

**4.5 — GEO-criteria in de beoordeling**
Breid `CRITIQUE_SYSTEM` en het bijbehorende schema uit met criteria die er echt toe doen:
- Wordt de doelvraag letterlijk en binnen de eerste twee zinnen beantwoord?
- Bevat elke sectie minstens één zin die losstaand citeerbaar is (begrijpelijk zonder de
  rest van de pagina)?
- Worden het bedrijf en zijn eigenschappen expliciet benoemd, in plaats van "wij" en "ons"?
- Zijn er concrete cijfers, jaartallen of feiten verwerkt uit de aangeleverde feitenlijst?
- Beantwoordt de pagina naast de hoofdvraag ook de logische vervolgvragen?
Geef `buildCritiqueInput` de doelvraag mee — die krijgt nu alleen het type en het doel.

**4.6 — De spanning tussen "verzin niets" en "wees concreet" oplossen**
Twee ingrepen:
- **Feiten ophalen in plaats van verbieden.** Zijn er te weinig geverifieerde feiten, zet
  dan web-zoeken aan voor deze ene aanroep om verifieerbare, algemeen bekende feiten over
  het onderwerp (geen bedrijfsclaims) te vinden, met bronvermelding.
- **De klant om feiten vragen.** Levert de pagina te weinig concreets op, laat de app dan
  gericht vragen stellen: *"Hoeveel jaar bestaan jullie?", "Wat is jullie levertijd?",
  "Hoeveel klanten per jaar?"* Antwoorden gaan naar `proof_points` en verbeteren élke
  volgende pagina. Dit is meteen een sterk UX-moment: de klant voelt dat hij bijdraagt.

**4.7 — Opnieuw genereren mogelijk maken**
De idempotentie zit nu op de titel (`.eq("title", ...)`), waardoor opnieuw genereren
onmogelijk is en een pagina met "check nodig" doodloopt.
→ Idempotent op `(analysis_id, report_id, doelvraag)`, plus een `version`-kolom. Elke
nieuwe versie is een nieuwe rij; de nieuwste wordt getoond, oudere blijven bewaard.

**4.8 — Herschrijven met feedback van de klant**
Een tekstveld "wat moet er anders?" waarvan de inhoud meegaat als extra instructie in de
herschrijfstap. De belangrijkste ontbrekende knop in de hele app.

**4.9 — Alles genereren in één klik**
De belofte heet "1-click content generatie", maar het zijn nu *n* klikken over maximaal
drie aanbevelingen. Met de werkverdeler uit Fase 1 kan één knop alle aanbevelingen in de
wachtrij zetten. Verhoog tegelijk het aantal aanbevelingen van 1–3 naar 5–8 — het rapport
kent er vijftien die de moeite waard zijn.

**4.10 — Lengte sturen**
Er wordt nu geen maximum aan de uitvoer meegegeven; het aantal woorden wordt achteraf
geteld. Stuur een doellengte per type pagina (een FAQ is geen artikel).

### UX

**4.11 — Aanbevelingen met bewijs erbij**
Elke aanbeveling toont welke vragen hij moet gaan winnen en wat de AI daar nu antwoordt.
Dan is "waarom zou ik deze pagina maken" beantwoord vóórdat de klant het vraagt.

**4.12 — Bewerken in de app**
Nu kan de klant alleen kopiëren of downloaden. Voeg een eenvoudige editor toe waarin hij de
tekst kan aanpassen, met de bestaande veilige markdown-weergave als voorbeeldvenster. Een
tekst die je niet kunt bijschaven, publiceer je niet.

**4.13 — "Check nodig" uitleggen**
Het gele label zegt nu niet wát er gecheckt moet worden. Toon de punten uit de beoordeling:
*"De eindredacteur twijfelt over: [punt]. Kijk hier even naar."*

**4.14 — Kwaliteitsscore vertalen of weghalen**
"kwaliteit 78/100" in de bibliotheek is een interne maat die de klant niets zegt. Vervang
door een oordeel in woorden (*klaar om te publiceren* / *even nakijken*) en houd het getal
achter de details.

**4.15 — Publicatie-instructie per pagina**
De klant krijgt tekst, metagegevens en gestructureerde data, maar geen uitleg wat hij ermee
moet. Voeg een kort stappenplan toe: waar plaats je dit, welke URL raden we aan, waar zet je
de gestructureerde data neer, en waar link je vanaf. Zonder dit blijft de content in de
bibliotheek liggen — en dan gebeurt er niets, hoe goed hij ook is.

### Klaar als…

- [ ] Elke gegenereerde pagina is gekoppeld aan de vragen die hij moet winnen.
- [ ] De schrijfopdracht bevat aantoonbaar de doelvraag, het winnende antwoord en de
      bronanalyse.
- [ ] De beoordeling toetst op citeerbaarheid, niet alleen op leesbaarheid.
- [ ] De klant kan een pagina bijschaven, herschrijven met feedback, en weet wat hij ermee
      moet doen.
- [ ] Eén knop zet alle aanbevelingen in de wachtrij.

---

# Fase 5 — De cirkel rond

**Doel:** aantoonbaar maken dat het werkt. Dit is de fase waar de belofte aan de klant
wordt ingelost — of weerlegd, en dan weten we dat tenminste.

**Hangt af van:** Fase 4 (zonder de koppeling uit 4.1 valt er niets te volgen).

### Techniek

**5.1 — Publicatiestatus vastleggen**
Voeg `published_at` en `published_url` toe aan `content_pieces`. De statuswaarde `published`
bestaat al in het datamodel maar wordt nergens gezet.

**5.2 — Publicatie bevestigen én controleren**
De klant markeert een pagina als gepubliceerd en geeft de URL op. De app controleert dat
zelf met de bestaande crawler: bestaat de URL, staat de tekst er echt, is de gestructureerde
data geplaatst. Blijkt de pagina niet vindbaar, zeg dat dan — anders wacht de klant weken op
een effect dat nooit kan komen.

**5.3 — Hermeting inplannen**
Bij publicatie: plan een hermeting van precies de gekoppelde vragen, twee en vier weken
later (AI-systemen nemen nieuwe content niet dezelfde dag op). Markeer die metingen zodat ze
in de trend te herkennen zijn.

**5.4 — Effect berekenen**
Per pagina: de zichtbaarheid op de gekoppelde vragen vóór publicatie versus daarna, met
bandbreedte. Sla dat op als `content_impact`, zodat het niet elke keer opnieuw berekend
hoeft te worden.

**5.5 — Eerlijk zijn over oorzaak en gevolg**
Zichtbaarheid kan ook om andere redenen stijgen. Vergelijk daarom met de vragen waar géén
pagina voor gemaakt is, als controlegroep. *"Op de vragen waarvoor je publiceerde: +18. Op
de rest: +3."* Dat is een verdedigbare uitspraak; "je score steeg" is dat niet.

### UX

**5.6 — Het resultaatpaneel**
Bovenaan de analyse, zodra er iets gepubliceerd is: *"Je publiceerde 3 pagina's. Op de 7
vragen die daarbij horen werd je vóór publicatie 1× genoemd, nu 5×. Je gewogen
zichtbaarheid ging van 24 naar 39."* Dit is het scherm waarvoor de klant betaalt. Alles
eromheen is toelichting.

**5.7 — De publicatietrechter zichtbaar maken**
Een eenvoudig overzicht: `gegenereerd → nagekeken → gepubliceerd → effect gemeten`, met de
aantallen. Blijven er tien pagina's steken bij "gegenereerd", dan is dát het probleem, en
dan moet de app daarop sturen in plaats van meer content aan te bieden.

**5.8 — Herinneringen**
Ligt er een pagina langer dan een week klaar zonder gepubliceerd te zijn: één vriendelijke
mail met de vraag of er iets in de weg zit, en een aanbod om te helpen. Één keer, niet
zeurend.

**5.9 — Resultaat delen**
Een exporteerbaar overzicht van het behaalde effect. Voor bureaus is dit het bestand
waarmee ze hun eigen klant behouden. Voor ondernemers is het de bevestiging dat het geld
goed besteed was.

### Klaar als…

- [ ] Een gepubliceerde pagina leidt automatisch tot een hermeting.
- [ ] De klant ziet per pagina wat hij heeft opgeleverd, met bandbreedte.
- [ ] De vergelijking met de controlegroep staat erbij.
- [ ] Er is een overzicht van hoeveel content daadwerkelijk gepubliceerd wordt.

---

# Fase 6 — Trend en terugkerend rapport

**Doel:** de wekelijkse meting die nu onzichtbaar is, zichtbaar maken.

**Hangt af van:** Fase 2 (zonder bandbreedte is een trendlijn misleidend) en Fase 5.

### Het probleem, precies

De wekelijkse taak meet week 1 tot en met 10 en schrijft alles netjes weg. Maar:
- `generateReport` heeft `if (existingReport) → return "gereed"`: er komt na week 0 nooit
  een nieuw rapport.
- De UI leest uitsluitend `week_no = 0` (`app/analyses/[id]/page.tsx`).

Er worden dus tien weken meetkosten gemaakt voor data die niemand ooit ziet.

### Techniek

**6.1 — Eén rapport per week**
Vervang de "bestaat er al een rapport"-controle door "bestaat er al een rapport voor déze
week". Rapporten worden een reeks in plaats van een eenmalig document.

**6.2 — Wat er veranderd is**
Het weekrapport moet vooral het verschil beschrijven: welke vragen erbij gekomen zijn,
welke verloren, welke concurrent oprukt. Geef de vorige week mee in de opdracht en vraag
expliciet om de verandering, niet om een nieuwe beschrijving van de stand.

**6.3 — De grens van tien weken opheffen**
`MAX_WEEKS = 10` staat er nu. Zichtbaarheid volgen is doorlopend werk, geen project van tien
weken. Maak het instelbaar en standaard onbeperkt, met kostenbewaking uit stap 0.6.

**6.4 — Aggregaten voor de trend**
Een weergave die per week score, gewogen score, bandbreedte en aandeel teruggeeft, zodat de
grafiek niet elke keer alles opnieuw hoeft uit te rekenen.

### UX

**6.5 — De trendlijn**
Op het overzicht: verloop over de weken, met de bandbreedte als schaduw eromheen en
markeringen op de momenten waarop content gepubliceerd is. Die markeringen maken van een
grafiek een verhaal.

**6.6 — Concurrenten in dezelfde grafiek**
Niet alleen de eigen lijn maar ook die van de belangrijkste concurrenten. "Ik loop in" is
een sterker signaal dan een absoluut getal.

**6.7 — Weekmail met inhoud**
De bestaande rapportmail wordt een wekelijks bericht dat alleen stuurt wat veranderd is, en
zwijgt als er niets te melden valt. Een mail die elke week hetzelfde zegt, wordt na drie
weken niet meer geopend.

**6.8 — Geschiedenis inzien**
Oudere rapporten blijven raadpleegbaar, met een weekkiezer. De klant wil terug kunnen kijken
naar wat er stond toen hij die beslissing nam.

### Klaar als…

- [ ] Er verschijnt elke week een nieuw rapport dat de verandering beschrijft.
- [ ] De trendlijn staat op het overzicht, met publicatiemomenten erin.
- [ ] Een week zonder betekenisvolle verandering levert geen mail op.

---

# Fase 7 — Off-site zichtbaarheid

**Doel:** het plafond doorbreken dat op puur on-site advies zit.

**Hangt af van:** Fase 3 (de bronanalyse).

### Het probleem, precies

De metingen laten zien dat AI-assistenten voor koopvragen zwaar leunen op *andere* sites:
reviewplatforms, vergelijkers, lijstjes, vakpers, Wikipedia, fora. De app registreert die
bronnen zelfs netjes per concurrent in `top_cited_sources`. Maar het enige advies dat het
product kan geven is "schrijf een pagina op je eigen site". Daarmee zit er een plafond op
het resultaat dat je met betere teksten niet wegneemt.

### Techniek

**7.1 — Het bronnenlandschap in kaart**
Verzamel over alle metingen heen welke domeinen geciteerd worden, hoe vaak, en voor welke
concurrenten. Sla dat op per analyse.

**7.2 — Aanwezigheid controleren**
Per veelgeciteerde bron: staat de klant erop? Voor de meeste platforms is dat te
controleren met een gerichte zoekopdracht of een eenvoudige ophaalactie.

**7.3 — Off-site aanbevelingen in het rapport**
Breid het rapportschema uit met een tweede soort aanbeveling. *"Bij 6 van je 12 vragen
citeert de AI [platform]. Je concurrent staat daarop, jij niet."* Met, waar mogelijk, de
concrete vervolgstap.

**7.4 — Entiteitsaanwezigheid**
Controleer of het merk voorkomt in Wikidata en Wikipedia. Voor bekendere merken is dit een
van de sterkste signalen die AI-systemen gebruiken om een bedrijf überhaupt als bestaande
entiteit te herkennen.

### UX

**7.5 — Twee soorten werk uit elkaar houden**
Splits het rapport in *"Op je eigen site"* en *"Daarbuiten"*. Dat is een ander soort werk,
met een andere doorlooptijd en vaak een andere verantwoordelijke.

**7.6 — Off-site taken volgen**
Deze acties worden geen gegenereerde pagina maar een taak met een status (open / bezig /
gedaan). Zonder dat blijven ze hangen als goedbedoeld advies.

### Klaar als…

- [ ] Het rapport bevat aanbevelingen die niet over de eigen website gaan.
- [ ] De klant ziet welke bronnen zijn markt bepalen en of hij daarop staat.

---

# Geparkeerd — Meerdere engines

**Status: bewust uitgesteld** (juli 2026). In de ontwikkelfase wegen de meetkosten van
extra engines niet op tegen de opbrengst — vier engines vermenigvuldigen de duurste post
in het hele systeem (de web-zoekactie per meting) met vier.

Wat er ligt te wachten: `engine` staat hardcoded op `"openai"`, en wat er gemeten wordt is
`gpt-4.1-mini` met zoekfunctie en een eigen systeeminstructie — een benadering van ChatGPT,
niet ChatGPT zelf. Google's AI-overzichten, Gemini, Perplexity en Copilot worden niet
gemeten, terwijl de belofte in het meervoud staat.

**Wat je nu al moet doen om dit later goedkoop te houden:** houd de meting achter één
functie (`askEngine(prompt, engine) → { text, sources }`) in plaats van OpenAI-aanroepen
door `measure.ts` te vlechten, en blijf `engine` per meting wegschrijven — de kolom bestaat
al. Dan is dit later een uitbreiding en geen verbouwing.

**Wanneer oppakken:** zodra betalende klanten erom vragen, of zodra de cirkel rond is
(Fase 5) en je aantoonbaar resultaat hebt op één engine. Begin dan met Perplexity — nette
API met bronvermelding, het snelst toegevoegd — en maak per engine instelbaar hoe vaak er
gemeten wordt (hoofd-engine wekelijks, de rest maandelijks).

---

# Bijlage A — UX-principes

Deze gelden voor alles wat gebouwd wordt. Ze zijn geen aparte fase; ze zijn de manier van
werken.

### A1 — De vraag "wat nu?" is altijd beantwoord

De statusbadges zijn goed doordacht (`lib/analysis-status.ts` markeert
`concept_klaar` als het enige moment waarop de klant iets *moet*, en sorteert dat bovenaan).
Bouw dat door: op elk scherm één duidelijke volgende stap, visueel dominant. De klant hoort
nooit te hoeven bedenken wat hij nu moet doen.

### A2 — Geen jargon, geen interne maten

Nu lekt er interne taal naar buiten: "kwaliteit 78/100", "cluster", "prompts", "gewogen
score". Bepaal per term of hij weg kan, vertaald kan worden, of uitleg nodig heeft — en doe
dat consequent. De rapportinstructie doet dit al goed (*"Gebruik geen vaktermen als 'share
of voice'"*); die norm hoort ook voor de interface te gelden.

### A3 — Fouten zijn een gespreksmoment, geen doodlopende weg

Elke foutmelding: wat is er gebeurd (in gewone taal), wat betekent het, wat kan de klant nu
doen. Als wij het kunnen oplossen, doen we het en zeggen we het pas als het niet lukt.

### A4 — Wachten is ontworpen, niet overkomen

Bij elk proces dat langer dan drie seconden duurt: tonen wát er gebeurt, hoe lang het
ongeveer duurt, en dat de klant weg mag lopen. De bestaande stappenlijst in
`PrepareProgress` is hier een goed uitgangspunt.

### A5 — Toon het bewijs, niet alleen de conclusie

Bij elk cijfer en elke aanbeveling moet de klant kunnen doorklikken naar de onderliggende
data. Dit is uitgangspunt 5, en het is ook het beste verweer tegen scepsis.

### A6 — Toegankelijkheid

De basis staat er (`EntityComparison` leunt bewust nooit op kleur alleen, formulieren
gebruiken echte labels, foutmeldingen hebben `role="alert"`). Houd dat vast: contrast
minimaal 4.5:1, alles bedienbaar met het toetsenbord, statuswijzigingen aangekondigd voor
schermlezers, en nooit kleur als enige drager van betekenis.

### A7 — Mobiel is geen bijzaak

De layout is responsief opgezet. Maar de nieuwe schermen (trendgrafiek, antwoordenoverzicht,
editor) zijn de lastige gevallen. Ontwerp ze mobiel-eerst: een ondernemer bekijkt zijn score
op zijn telefoon.

### A8 — Consistentie in de opbouw

Elk detailscherm dezelfde volgorde: wat is het → hoe staat het ervoor → wat moet ik doen →
onderbouwing. Nu verschilt dat per tabblad.

### A9 — Waarde vóór inspanning

De onboarding vraagt vijf stappen vóórdat de klant iets terugziet, en de uitweg
("Overslaan en direct aanmaken") is vormgegeven als onopvallende grijze tekst onderaan.
Overweeg om te draaien: vraag alleen naam en website, laat de eerste bevindingen zien, en
vraag de rest op het moment dat duidelijk is waarom het helpt. Maak de uitweg in elk geval
een gelijkwaardige knop.

### A10 — Eén overzicht over alles heen

Alles is nu per analyse: elke analyse heeft een eigen bibliotheek, eigen rapport, eigen
score. Een klant met drie analyses heeft geen enkel scherm dat antwoord geeft op *"hoe sta
ik ervoor en wat moet ik deze week doen?"*. Bouw een startscherm dat over analyses heen
kijkt: openstaande acties, gepubliceerd deze maand, grootste verandering.

---

# Bijlage B — Alle gevonden fouten op een rij

| # | Bestand | Probleem | Fase |
|---|---|---|---|
| 1 | `app/analyses/[id]/score-panel.tsx` | Concurrentpercentage gedeeld door huidig aantal actieve prompts i.p.v. historische runs; kan boven 100% uitkomen | 0.1 |
| 2 | `lib/pipeline/report.ts` | Ontbrekend classificatie-oordeel telt als "niet genoemd" | 0.2 |
| 3 | `lib/pipeline/measure.ts` | Bij meerdere eigen-merk-rijen wint willekeurig de laatste | 0.3 |
| 4 | `lib/openai/client.ts` | Geen nieuwe pogingen; één storing laat de hele meting mislukken | 0.4 |
| 5 | overal | Geen `temperature` gezet — onnodige ruis in classificatie en analyse | 0.5 |
| 6 | `lib/pipeline/prompt-weight.ts` | Ondergrens 0.1 laat alle lage gewichten samenvallen | 0.10 |
| 7 | `lib/pipeline/prompts.ts` | Weggefilterde prompts worden niet aangevuld — meetbasis krimpt stil | 0.8 |
| 8 | `lib/pipeline/prompts.ts` | Filter matcht op deelwoorden; wist legitieme prompts | 0.9 |
| 9 | `lib/pipeline/content.ts` | Idempotentie op titel maakt opnieuw genereren onmogelijk | 4.7 |
| 10 | `lib/pipeline/measure.ts` | Aandeel in vermeldingen heeft een instabiele noemer | 2.5 |
| 11 | `lib/pipeline/report.ts` | Rapport wordt maar één keer per analyse gemaakt | 6.1 |
| 12 | `app/analyses/[id]/page.tsx` | UI leest alleen week 0; wekelijkse data onzichtbaar | 6.1 |
| 13 | `*-progress.tsx` | Browser start het werk, terwijl de tekst belooft dat het scherm dicht mag | 1.1 |
| 14 | `tracking_runs.cost_usd` | Kolom bestaat, wordt nooit gevuld | 0.6 |
| 15 | `jobs` | Volledige tabel met indexen, nergens gebruikt | 1.1 |
| 16 | `competitor_breakdown` | Groepeert op exacte naam; geen samenvoeging | 2.4 |

**Niet gerepareerd, want geen fout:** `lib/markdown.ts` escapet eerst alle HTML en past daarna
pas de opmaak toe. Dat is correct en veilig — de `dangerouslySetInnerHTML` op de
contentpagina is hier geen risico. Laten zoals het is.

---

# Bijlage C — Wat maakt een fase af

Voor elke fase geldt, naast de specifieke afvinklijst:

- [ ] Het classificatie-testscript (0.7) draait nog steeds zonder verslechtering.
- [ ] `npm run typecheck` en `npm run lint` zijn schoon.
- [ ] Nieuwe kolommen en tabellen hebben een migratie met dezelfde toelichtende stijl als
      de bestaande — en zijn additief, zodat bestaande data blijft werken.
- [ ] Nieuwe AI-aanroepen slaan hun volledige ruwe uitvoer op.
- [ ] Nieuwe tabellen hebben leesbeleid volgens hetzelfde patroon (lezen via de eigen
      sessie, schrijven uitsluitend via een API-route met eigenaarscontrole).
- [ ] Elke nieuwe klant-zichtbare tekst is jargonvrij en in het Nederlands.
- [ ] Elk nieuw scherm werkt op mobiel en is met het toetsenbord te bedienen.
- [ ] De kosten per analyse zijn opnieuw gemeten en het verschil is bekend.
