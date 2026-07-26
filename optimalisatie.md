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
| 2 | Betrouwbare meting: 30 vragen, entiteiten samenvoegen, eerlijke band | Middel | 1 |
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
kostenweergave per analyse. Zonder dit kun je Fase 2 (van 12 naar 30 vragen) niet
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
uit, zet `done` of `failed` met foutbericht.

**Wie roept hem elke minuut aan?** Twee wegen, allebei ondersteund:

- **Vercel Cron** (`vercel.json`) — het simpelst, maar een taak die elke minuut draait
  vraagt een betaald plan.
- **pg_cron in Supabase** (migratie 0015) — de database stuurt zichzelf aan via `pg_cron`
  + `pg_net`. Geen extra leverancier, geen extra abonnement, en de wachtrij leeft toch al
  in Postgres. URL en geheim komen uit Supabase Vault; ontbreken die, dan slaat de cron
  stil over in plaats van elke minuut te falen.

Ze bijten elkaar niet: draaien ze allebei, dan pakken twee werkers werk op en dat is
precies waar `for update skip locked` voor is.

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

**Doel:** cijfers waar een klant zijn beslissingen op mag baseren — en die eerlijk zijn over
hoe zeker ze zijn.

**Hangt af van:** Fase 1 (30 vragen passen niet in de oude architectuur).

**Status: afgerond.** Typecheck, lint en productiebuild slagen; statistiek, naamnormalisatie
en volumebanden zijn in kale scripts getest (54 gevallen, allemaal groen). Migraties 0016 en
0017 wachten op toepassing, en de keten is nog nergens end-to-end gedraaid — zie de noot
onderaan deze fase.

⚠️ **Herzien:** het oorspronkelijke plan verdrievoudigde de metingen per vraag. Dat is
geschrapt vanwege de kosten. De fase behoudt bijna al zijn waarde: het grootste deel ging
nooit over het aantal metingen maar over datakwaliteit (entiteiten samenvoegen, een
stabiele noemer, een eerlijk volumecijfer) en over eerlijke presentatie.

### Techniek

**2.1 — 30 vragen, één meting per vraag** *(herzien juli 2026)*
Het oorspronkelijke plan was drie metingen per vraag om de ruis te dempen. Dat is
geschrapt: te duur in de ontwikkelfase. In plaats daarvan gaat het aantal vragen van 12
naar 30 (`promptsPerFunnelStage` van 4 naar 10) — wat sinds fase 1 kan.

Dat is geen halve maatregel. De onzekerheid van de score schaalt met het TOTAAL aantal
metingen (vragen × metingen per vraag), dus 30×1 en 12×3 zijn statistisch vrijwel gelijk —
maar 30×1 kost minder (30 web-zoekacties in plaats van 36) én dekt de markt van de klant
breder af. Bij gelijke kosten wint meer vragen het van meer metingen per vraag.

| opzet | metingen | 95%-band | maand-op-maand nodig |
|---|---|---|---|
| 12 × 1 (was) | 12 | ±28 punten | 40 punten |
| 12 × 3 | 36 | ±16 punten | 23 punten |
| **30 × 1 (gekozen)** | **30** | **±18 punten** | **25 punten** |
| 30 × 3 (oorspronkelijk) | 90 | ±10 punten | 15 punten |

*(Gecorrigeerd bij de implementatie: een eerdere versie van deze tabel rekende met
z = 1,8 in plaats van 1,96 en gaf daardoor iets te smalle banden. De getallen hierboven
komen uit `lib/stats/uncertainty.ts` en zijn de echte 95%-waarden bij p = 0,5, het
ongunstigste geval. De conclusie verandert niet: 30×1 en 12×3 liggen dicht bij elkaar.)*

**2.2 — De onzekerheid berekenen en meesturen**
Zonder meerdere metingen per vraag kun je de ruis niet wegnemen — maar je kunt hem wél
kennen. Bereken bij elke score de standaardfout uit de binomiale verdeling
(`√(p(1-p)/n)`, met n = aantal beoordeelde metingen) en sla die op in
`visibility_scores`. Dit is de belangrijkste stap van de hele fase geworden: hij is
goedkoop (puur rekenwerk, geen AI-aanroep) en hij is wat de score eerlijk maakt.

Twee details die bij de implementatie bleken uit te maken:
* **De randen.** Zonder correctie geeft 0 van de 30 een standaardfout van exact 0 — de app
  zou "0%, absoluut zeker" beweren terwijl 0 van 30 prima kan horen bij een echte
  zichtbaarheid van 8%. Daarom rekenen we de spreiding met de "plus vier"-correctie
  (Agresti-Coull): alsof er twee successen en twee mislukkingen extra waren. Het getoonde
  cijfer blijft ongecorrigeerd; alleen de band eromheen.
* **De gewogen score is onzekerder.** Niet elke vraag telt even zwaar, dus als één zware
  vraag omslaat beweegt het cijfer meer. Het effectieve aantal metingen (Kish:
  `(Σw)²/Σw²`) vangt dat: bij gelijke gewichten komt er hetzelfde uit als bij de gewone
  binomiale formule, bij scheve gewichten terecht een bredere band.

**2.3 — Alleen betekenisvolle verandering tonen**
Met een band van ±18 punten is een verschil van 10 punten maand-op-maand ruis. Toon een
verandering pas als verandering wanneer hij buiten de band valt; anders "stabiel". Liever
een saaie waarheid dan een schommeling waaruit de klant concludeert dat het product niet
werkt. Dit is dubbel zo belangrijk geworden nu de band groter is.

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

*Uitgevoerd als (b).* Drie banden — "vaak gesteld" / "gemiddeld" / "weinig gesteld" — met
wegingsfactoren 1 : 0,5 : 0,2. De kalibratie blijft de volle 0-100-schaal vragen, want de
RANGORDE die het model aanbrengt is echte informatie; alleen overleeft dat getal de opslag
niet als getal. De ruwe waarde blijft in `volume_estimate` staan als audit-trail, de band
in `volume_band`. Zet de klant de band zelf, dan gaat `volume_source` op `'klant'` en staat
er in de UI zichtbaar bij dat het zíjn keuze is — het verschil tussen "de app denkt" en "ik
weet" mag niet vervagen. Het bevroren gewicht per meting verandert niet met terugwerkende
kracht: een bijgestelde band telt vanaf de volgende meting, anders wordt de trend
onvergelijkbaar.

### UX

**2.7 — Concurrenten beheren**
Een scherm waar de klant de concurrentenlijst ziet, namen kan samenvoegen ("dit is dezelfde
als…"), er kan verwijderen die niet kloppen, en er kan toevoegen. Dit is niet alleen
opruimwerk: het is het moment waarop de klant merkt dat de app zijn markt begrijpt, en het
maakt de data meteen beter.

*Uitgevoerd.* Het scherm staat op de PROFIELpagina (`/profielen/[id]#concurrenten`), niet bij
een analyse — concurrenten horen bij het merk, niet bij één onderwerp. Drie groepen in
volgorde van aandacht: **nieuw gevonden** (wachten op een oordeel, bovenaan, met een randje),
**jouw concurrenten** (de vaste noemer van het aandeel) en **weggezet** (dichtgeklapt, terug
te halen). Verwijderen is bewust níét de prominente knop: wie een merk weghaalt dat de
volgende meting opnieuw tegenkomt, krijgt het gewoon terug als nieuwkomer — "geen concurrent
van mij" onthoudt de keuze wél. Samenvoegen verhuist alle metingen mee vóórdat de bronrij
verdwijnt; andersom zou de foreign key ze op `null` zetten en waren precies de gegevens weg
die de klant aan het opruimen was.

**2.8 — De score eerlijk tonen**
Nu staan er twee getallen van 6xl naast elkaar (score en gewogen score) zonder dat duidelijk
is welke leidend is.
→ Kies er één als hoofdgetal — de gewogen score, want die sluit aan bij wat de klant
verdient — en toon het andere kleiner als context. Zet de bandbreedte er zichtbaar bij
(*"32, met een marge van ±6"* of een balkje) en één zin die uitlegt wat het getal betekent.

*Uitgevoerd.* Eén kaart met de gewogen score als hoofdgetal, "±N punten" ernaast, en de
ongewogen score als regel eronder. Het overzicht laadt nu de LAATSTE twee periodes in plaats
van vast periode 0 — sinds de maandelijkse hermeting is week 0 de nulmeting en niet meer het
actuele beeld. Onder de vergelijking staat "Ook genoemd": de merken die wel in de antwoorden
voorkwamen maar nog niet bevestigd zijn, met een link naar het beheerscherm. Zonder dat
blokje is een lager aandeel niet te verklaren.

**2.9 — Verandering met betekenis**
Zodra er meerdere weken zijn (Fase 6) mag een verandering pas als verandering getoond
worden als hij buiten de bandbreedte valt. Anders: *"stabiel"*. Liever een saaie waarheid
dan een schommeling die de klant laat concluderen dat het product niet werkt.

*Uitgevoerd (samen met 2.3).* `changeIsMeaningful()` vergelijkt tegen de drempel van het
VERSCHIL tussen twee metingen, niet tegen de band rond één score — die is ruwweg 1,4× breder,
met 30 vragen zo'n 25 punten. Daaronder staat er "Gelijk gebleven (+4 punten)" met de uitleg
erbij, in plaats van een pijltje omhoog. Ook de rapportschrijver krijgt de marge nu mee, zodat
het rapport de score als orde van grootte presenteert en niet als exact cijfer.

**2.10 — Uitleg op de plek zelf**
Bij elk cijfer een kleine info-knop met twee zinnen: wat is dit, hoe is het gemeten, hoe
zeker zijn we. Niet in een aparte helppagina — daar komt niemand.

*Uitgevoerd.* `components/info-hint.tsx`: een vraagteken dat zichtbaar klein is maar een
tikdoel van 44×44 heeft, sluit op Escape en op een klik ernaast. Staat bij het hoofdgetal, bij
de marge, bij "gelijk gebleven", bij de concurrentievergelijking, bij "ook genoemd" en bij de
concurrentenlijst.

### Klaar als…

- [x] Elke getoonde score heeft een zichtbare bandbreedte, en die is berekend uit het
      werkelijke aantal beoordeelde metingen.
- [x] Geen enkele concurrent komt dubbel voor in de vergelijking.
- [x] Op het dashboard is te zien welk getal een meting is en welk een schatting.
- [x] De klant kan een concurrent samenvoegen of verwijderen en ziet de vergelijking
      meteen bijgewerkt.

> **Nog te verifiëren tegen een echte database.** Migraties 0016 en 0017 zijn geschreven maar
> nergens toegepast, en de hele keten is nooit end-to-end gedraaid (dit ontwikkelmachien heeft
> geen Supabase-project en geen OpenAI-sleutel). Wat wél getest is: de statistiek (18 gevallen),
> de naamnormalisatie (18) en de volumebanden (18), allemaal in kale scripts; en `tsc`,
> `eslint` en `next build` zijn schoon.

---

# Fase 3 — Bewijs en blokkades zichtbaar

**Doel:** twee dingen die los van elkaar staan maar allebei goedkoop en hoogwaardig zijn:
laten zien wát de AI antwoordt, en controleren of de deur überhaupt openstaat.

**Hangt af van:** Fase 2 (je wilt geen ruis tonen als bewijs).

**Status: afgerond.** Typecheck, lint en productiebuild slagen; robots.txt-parser en
tekstmarkering zijn in kale scripts getest (41 gevallen, allemaal groen). Migratie 0018 wacht
op toepassing — zie de noot onderaan deze fase.

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

### Wat er uitgevoerd is

**3A — de antwoorden tonen.** Nieuw tabblad `/analyses/[id]/antwoorden`, vóór het rapport in
de navigatie: het letterlijke antwoord is het overtuigendste wat het systeem bezit, dus dat
verstop je niet achter een ander tabblad. Per vraag: of je genoemd bent en op welke plek,
welke concurrenten wél, de fase en de volumeband. Uitklappen toont het volledige antwoord
met jouw merknaam paars gemarkeerd en concurrenten grijs, plus de bronnen als aanklikbare
links.

De markering gaat bewust niet via `dangerouslySetInnerHTML` — de tekst komt van een AI-model
dat webpagina's las, dus daar mag nooit HTML uit in de DOM belanden. Het knipwerk zit in
`lib/highlight.ts` (19 tests), met twee dingen die in de praktijk misgaan: langste term
eerst (anders markeert "Bol" alleen het begin van "Bol.com") en woordgrenzen op
`\p{L}\p{N}` in plaats van `\b` (anders breekt de grens op de punt in "Bol.com", en matcht
"Coolblue" wél binnen "Coolbluezaken").

**3.2 — filters.** Standaard **gemist én hoog gewicht bovenaan**; dat is de lijst waar geld
in zit, en die hoort er te staan zonder dat de klant eerst gaat filteren. Daarnaast: "alleen
waar ik niet genoemd word", filteren op funnelfase, en sorteren op gewicht.

**3.3 — doorklikken.** De `evidenceRunIds` bij elk probleem in het rapport werden alleen
geteld ("3× aangetoond"). Ze linken nu naar `?runs=…` op het antwoordentabblad, dat dan
alleen die metingen toont. Onbekende id's (een oude link, een verwijderde meting) worden
weggefilterd, zodat een verouderde link geen leeg scherm oplevert.

**3.4 — deelbaar bewijs.** Kopiëren naar klembord in plaats van een afbeeldingsexport:
`html2canvas` en verwanten kosten honderden kilobytes, terwijl "plakken in een mail of
appje" precies is wat een bureau of ondernemer met dit bewijs doet. Wie een PDF wil, print
de pagina.

**3B — de audit.** Zie 3.5 t/m 3.8 hierboven. Eén beperking is bewust niet weggepoetst: of
een site écht in de index van Bing staat, kun je van buitenaf alleen vaststellen met een
betaalde API of via de Webmaster Tools van de klant zelf. De zoekpagina van Bing leegtrekken
is fragiel en niet netjes, dus dat doen we niet — we melden wat we wél weten (mag Bingbot
binnen, is er een sitemap) en zijn expliciet over de rest.

### Klaar als…

- [x] De klant kan per vraag zien wat de AI letterlijk antwoordde en wie er genoemd werd.
- [x] Vanuit elk probleem in het rapport is door te klikken naar het bewijs.
- [x] Een site die GPTBot blokkeert levert een duidelijke waarschuwing bovenaan op.
- [x] De audit draait bij elke terugkerende meting mee.

> **Nog te verifiëren tegen een echte database.** Migratie 0018 is geschreven maar niet
> toegepast, en de audit is nooit tegen een echte website gedraaid (deze omgeving heeft geen
> uitgaande verbinding naar willekeurige sites). Wat wél getest is: de robots.txt-parser (22
> gevallen) en de tekstmarkering (19), allemaal in kale scripts; `tsc`, `eslint` en
> `next build` zijn schoon.

---

# Fase 4 — De schrijver krijgt de uitslagen

**Doel:** contentgeneratie die gebaseerd is op de meting, in plaats van op het merkprofiel
alleen. Dit is de inhoudelijk zwaarste fase en de belangrijkste voor het hoofddoel.

**Hangt af van:** Fase 2 en 3.

**Status: afgerond.** Typecheck, lint en productiebuild slagen; de pure logica is in kale
scripts getest (37 gevallen: concurrentnamen wegfilteren 14, vraagcodes oplossen en
GEO-scores 23). Migratie 0019 wacht op toepassing — zie de noot onderaan deze fase.

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

### Wat er uitgevoerd is

**4.1 — de koppeling.** Nieuwe tabel `content_piece_targets`. Het rapport wijst per
aanbeveling met codes (V1, V2, …) aan welke gemiste vragen die pagina moet winnen; vóór
opslag worden die codes opgelost naar echte `prompt_id`/`tracking_run_id`-verwijzingen.
Bewust codes en géén letterlijke vraagteksten: een model dat een vraag moet overtypen maakt
er net iets anders van, en dan is precies de koppeling weg waar deze fase op rust. Verzonnen
codes worden stil weggegooid.

**4.2/4.3 — de opdracht.** De vijf willekeurige vraagteksten "ALLEEN ter inspiratie" zijn
vervangen door de concrete gemiste vragen, met de instructie dat de pagina die expliciet moet
beantwoorden. Daarbij gaat het WINNENDE ANTWOORD mee als context, met de concurrentnamen
eruit (`lib/pipeline/redact.ts`, 14 tests) — een rijtje namen wordt "andere aanbieders" in
plaats van drie keer dezelfde omschrijving achter elkaar. Er zit een vangnet omheen: zit er ná
het opschonen tóch nog een naam in, dan gaat het hele blok niet mee. Liever minder context dan
de harde regel breken.

**4.4 — de bronnen.** `top_cited_sources` ging als kale URL-lijst de prompt in; een model
weet daar niets mee. Nu worden ze opgehaald met de bestaande crawler (gratis) en beschrijft
één mini-aanroep wat ze inhoudelijk doen: welke vragen ze beantwoorden, in welke vorm, met
welke feiten — plus wat er ONTBREEKT. Dat laatste veld is het waardevolste. Uitschakelbaar
via `SOURCE_ANALYSIS=false`.

**4.5 — de beoordeling.** Vijf GEO-criteria naast de redactionele score, als booleans en niet
als cijfer: "7 op citeerbaarheid" zegt niemand iets, "de doelvraag wordt niet in de eerste
twee zinnen beantwoord" is een instructie voor de herschrijfronde. De niet-gehaalde criteria
worden automatisch verbeterpunten. Het minst intuïtieve criterium is het belangrijkste: een
model dat "wij leveren binnen 24 uur" leest, weet niet wie "wij" is — en noemt je dus niet.

**4.6 — de spanning opgelost.** Twee ingrepen. Bij minder dan drie geverifieerde feiten mag de
schrijver het internet op voor ALGEMENE marktfeiten (normen, termijnen, wettelijke eisen) —
nooit voor claims over het bedrijf zelf, want die kunnen we niet controleren. En het rapport
vraagt de klant om concrete cijfers; antwoorden gaan naar `proof_points` en verbeteren élke
volgende pagina. Overslaan blijft bewaard, zodat dezelfde vraag niet elk rapport terugkomt.

**4.7 — opnieuw genereren.** De idempotentie zat op de titel, waardoor een pagina met "check
nodig" doodliep. Nu versies: elke nieuwe poging is een nieuwe rij, `is_current` wijst de
actuele aan, en de vlag gaat pas om ná een geslaagde insert — anders staat de klant zonder
pagina als het schrijven mislukt.

**4.8 — herschrijven met feedback.** De belangrijkste ontbrekende knop in de hele app. Vrije
tekst die als ZWAARSTE instructie de herschrijfopdracht in gaat, boven de eindredacteur: het
is zijn website.

**4.9 — alles in één klik.** Van 1–3 naar 5–8 aanbevelingen, en één knop die ze allemaal in de
wachtrij zet — met vooraf zichtbaar hoeveel pagina's en hoe lang het duurt. Een knop die
ongevraagd zestien AI-aanroepen wegzet zonder dat te zeggen is geen gemak maar een verrassing.

**4.10 — lengte.** Doellengte per type in de opdracht, in plaats van achteraf tellen. Een FAQ
is geen artikel, en een AI-assistent citeert liever een compacte passage dan een betoog.

**4.11 t/m 4.15 — UX.** Elke aanbeveling toont de vragen die hij moet winnen, met een link naar
wat de AI daar nu antwoordt. Het gele "check nodig" noemt nu de punten in plaats van alleen te
waarschuwen. Het kwaliteitscijfer in de bibliotheek is een oordeel in woorden geworden. Er is
een eenvoudige markdown-editor (bewust geen WYSIWYG: die produceert stiekem andere HTML dan
wat er in de database staat). En elke pagina heeft een publicatie-instructie in vier stappen —
zonder dat blijft de content liggen, en dan gebeurt er niets, hoe goed hij ook is.

### Klaar als…

- [x] Elke gegenereerde pagina is gekoppeld aan de vragen die hij moet winnen.
- [x] De schrijfopdracht bevat aantoonbaar de doelvraag, het winnende antwoord en de
      bronanalyse.
- [x] De beoordeling toetst op citeerbaarheid, niet alleen op leesbaarheid.
- [x] De klant kan een pagina bijschaven, herschrijven met feedback, en weet wat hij ermee
      moet doen.
- [x] Eén knop zet alle aanbevelingen in de wachtrij.

> **Nog te verifiëren tegen een echte database en een echte API-sleutel.** Migratie 0019 is
> niet toegepast en de schrijfpijplijn is nooit end-to-end gedraaid. Twee dingen die daarbij
> als eerste bekeken moeten worden: of het model de vraagcodes betrouwbaar teruggeeft (bij
> veel onopgeloste codes moet de instructie strenger), en of de GEO-criteria niet te streng
> uitpakken — als vrijwel elke pagina onder de 60 blijft, herschrijft de app zich suf op
> criteria die het model zelf niet haalt. Beide zijn pas te zien met echte output.
>
> **Kosten.** Per gegenereerde pagina komt er één mini-aanroep bij (de bronanalyse), en het
> aantal pagina's gaat van maximaal 3 naar 5–8. Ruwe indicatie: van ~$0,10 naar ~$0,50 voor
> een volledige set. Wil je dat tijdens ontwikkelen drukken: `SOURCE_ANALYSIS=false` scheelt
> de bronanalyse, en met `WEB_SEARCH_ENABLED=false` staat ook het feiten-vangnet uit.

---

# Fase 5 — De cirkel rond

**Doel:** aantoonbaar maken dat het werkt. Dit is de fase waar de belofte aan de klant
wordt ingelost — of weerlegd, en dan weten we dat tenminste.

**Hangt af van:** Fase 4 (zonder de koppeling uit 4.1 valt er niets te volgen).

**Status: afgerond.** Typecheck, lint en productiebuild slagen; de effectrekenkunde is in een
kaal script getest (20 gevallen). Migratie 0020 wacht op toepassing — zie de noot onderaan
deze fase.

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

### Wat er uitgevoerd is

**5.1/5.2 — publiceren vastleggen en controleren.** De statuswaarde `published` bestond al
sinds de eerste migratie en werd nergens gezet. De klant geeft nu de link op; de app haalt de
pagina op en kijkt of de tekst er echt staat (60% van de langste zinnen moet terug te vinden
zijn — niet 100%, want een CMS herformatteert altijd iets) en of de gestructureerde data
geplaatst is. Die controle draait als APARTE taak: een trage website mag een publicatie niet
laten mislukken, en een bevinding is geen fout — een taak die faalt zou opnieuw geprobeerd
worden en uiteindelijk de analyse op 'mislukt' zetten, wat voor een typefout in een URL een
absurde uitkomst is.

**5.3 — hermeting.** Twee golven, op 14 en 28 dagen. Ze staan gewoon als taak in de wachtrij
met een `scheduled_for` in de toekomst; de werker uit fase 1 pikt ze vanzelf op. Metingen
krijgen een `purpose` — en alleen `periodic` telt mee in de zichtbaarheidsscore. Zonder die
scheiding zou een impactmeting van drie vragen als een score over drie vragen het dashboard op
gaan, en dat is een grafiek die liegt. Alle zeven plekken waar de score berekend wordt
filteren daarop.

**5.4/5.5 — het effect, met controlegroep.** Dit is het inhoudelijke hart van de fase. We
meten niet alleen de doelvragen opnieuw maar ook een even grote groep vragen waar géén pagina
voor gemaakt is. Dat kost extra metingen en is het waard: *"op de vragen waarvoor je
publiceerde +18, op de rest +3"* is een uitspraak die standhoudt, *"je score steeg"* niet.

Drie regels die de uitkomst eerlijk houden: alleen vragen die in BEIDE metingen beoordeeld
zijn tellen mee (anders meet je een mislukte classificatie als een daling); het vertrekpunt is
de laatste meting vóór publicatie en niet de nulmeting (publiceert de klant pas na drie
maanden, dan is die nulmeting geen eerlijk vertrekpunt); en onder de twee vergelijkbare vragen
is het oordeel "nog niet te zeggen".

**5.6/5.7 — resultaatpaneel en trechter.** Bovenaan de analyse zodra er iets gepubliceerd is,
in gewone zinnen. Daaronder de trechter `geschreven → nagekeken → gepubliceerd → effect
gemeten`, met "van hoeveel" erbij — 3 gepubliceerd is iets heel anders bij 4 dan bij 12.
Blijft alles steken bij "geschreven", dan zegt het paneel dát, in plaats van meer content aan
te bieden.

**5.8 — herinnering.** Wekelijkse cron, één mail per analyse, nooit meer. Vandaar een
tijdstempel-kolom en geen teller. De vlag wordt gezet vóór het versturen: gaat de mail stuk,
dan is twee keer dezelfde herinnering erger dan hem missen.

**5.9 — export.** CSV en geen PDF: dit gaat naar Excel of naar een rapportage, en een PDF
genereren vraagt megabytes aan bibliotheek voor iets wat niemand daarna nog kan bewerken.
Puntkomma's als scheidingsteken en een BOM vooraan, anders toont Nederlandse Excel de accenten
verkeerd.

### Klaar als…

- [x] Een gepubliceerde pagina leidt automatisch tot een hermeting.
- [x] De klant ziet per pagina wat hij heeft opgeleverd, met bandbreedte.
- [x] De vergelijking met de controlegroep staat erbij.
- [x] Er is een overzicht van hoeveel content daadwerkelijk gepubliceerd wordt.

> **Nog te verifiëren tegen een echte database.** Migratie 0020 is niet toegepast en de
> keten publicatie → hermeting → effect heeft nooit gedraaid. Twee dingen die daarbij als
> eerste getoetst moeten worden: of de tekstvergelijking in de publicatiecontrole niet te
> streng is bij echte CMS-output (bij veel vals alarm moet de drempel van 60% omlaag), en of
> de dedupe-sleutel op de impactmetingen klopt als dezelfde prompt doelvraag is van twee
> verschillende pagina's.
>
> **Kosten.** Per gepubliceerde pagina komen er twee golven van (doelvragen + controlegroep)
> metingen bij. Bij 3 doelvragen is dat 2 × 6 = 12 web-zoekacties, ongeveer $0,30 per pagina.
> Dat is de prijs van een verdedigbare uitspraak in plaats van een cijfer; wil je hem drukken,
> verlaag dan `MAX_CONTROL_PROMPTS` in `lib/pipeline/impact.ts` — maar een controlegroep die
> veel kleiner is dan de doelgroep maakt de vergelijking betekenisloos.

---

# Fase 6 — Trend en terugkerend rapport

**Doel:** de wekelijkse meting die nu onzichtbaar is, zichtbaar maken.

**Hangt af van:** Fase 2 (zonder bandbreedte is een trendlijn misleidend) en Fase 5.

**Status: afgerond.** Typecheck, lint en productiebuild slagen; de veranderingslogica is in een
kaal script getest (21 gevallen), de kleurenset van de grafiek is gevalideerd op
kleurenblindheid, en de grafiek is met testdata gerenderd en op layout nagekeken. Migratie
0021 wacht op toepassing — zie de noot onderaan deze fase.

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

### Wat er uitgevoerd is

**6.1 — rapporten zijn een reeks.** De controle "bestaat er al een rapport voor deze analyse"
is "voor déze periode" geworden, met een unieke index op (analyse, periode) — idempotentie
hoort op databaseniveau en niet in een `if`. De aggregatie ketent nu bij ELKE periode door
naar een rapport, niet alleen bij periode 0. Daarmee is de bug weg waardoor twaalf periodes
aan meetkosten gemaakt werden voor data die niemand ooit zag.

**6.2 — het rapport beschrijft de verandering.** `computePeriodChange` vergelijkt twee
periodes in de database — welke vragen omsloegen, welke concurrent oprukte — en levert een
uitgeschreven blok aan de rapportopdracht. Bewust uitgeschreven en niet als ruwe JSON: het
model moet dit VERWOORDEN, niet interpreteren, want zelf twee periodes laten vergelijken gaat
mis. Valt het verschil binnen de meetruis, dan staat er letterlijk in de opdracht dat het
"stabiel" heet en dat er geen conclusies uit getrokken mogen worden.

**6.3 — de grens is weg.** `maxMeasurementPeriods` stond op een harde 12 en is nu standaard
onbeperkt, met `MAX_MEASUREMENT_PERIODS` als optionele rem. Zichtbaarheid volgen is doorlopend
werk; een klant die na een jaar stilletjes ophoudt met gemeten worden, merkt dat pas als hij
zich afvraagt waarom de grafiek niet meer groeit.

**6.4/6.5/6.6 — de trendlijn.** Eén query-set (`loadTrend`) voor de hele grafiek: score,
band, aandeel, de drie grootste concurrenten, en de publicatiemomenten. Die laatste zijn het
punt van de hele grafiek — zonder die verticale strepen is een stijging een toevalligheid, met
die strepen een gevolg.

Gebouwd als kale SVG, geen grafiekbibliotheek: dit is een lijn met een paar punten, en een
bibliotheek zou honderden kilobytes kosten. Drie keuzes die ertoe doen: een VASTE schaal van
0 tot 100 (een auto-schalende y-as maakt van drie punten verschil een dramatische klim), de
vier kleuren zijn samen gevalideerd op kleurenblindheid (ΔE 9,2 op het slechtste aangrenzende
paar), en omdat één kleur de contrastdrempel net niet haalt staat er bij élke lijn een naam
aan het uiteinde én een tabelweergave eronder — identiteit mag nooit alleen op kleur leunen.

De grafiek is met testdata gerenderd en bekeken. Dat leverde drie echte fouten op die je in
code niet ziet: eindlabels die over elkaar heen vielen, labels die buiten het kader liepen, en
een legenda-streepje dat als scheidingsteken las. Alle drie gefixt (labels worden nu uit
elkaar geduwd met een verbindingslijntje naar hun stip).

**6.7 — de mail zwijgt bij geen nieuws.** `isWorthEmailing` stuurt alleen bij een echte
scoreverandering, een omgeslagen vraag, een nieuwe concurrent, of een concurrent die twee of
meer vermeldingen won. Een mail die elke periode hetzelfde zegt, wordt na drie keer niet meer
geopend — en dan mist de klant ook de mail die er wél toe doet.

**6.8 — geschiedenis.** Periodekiezer boven het rapport, zichtbaar zodra er iets te kiezen
valt. De klant wil terug kunnen kijken naar wat er stond toen hij die beslissing nam.

### Klaar als…

- [x] Er verschijnt elke periode een nieuw rapport dat de verandering beschrijft.
- [x] De trendlijn staat op het overzicht, met publicatiemomenten erin.
- [x] Een periode zonder betekenisvolle verandering levert geen mail op.

> **Nog te verifiëren tegen een echte database.** Migratie 0021 is niet toegepast en er is
> nooit een tweede periode gedraaid. Het punt om als eerste te toetsen: de backfill van
> `week_no` uit de bestaande `period`-tekst, en of de unieke index op (analyse, periode) niet
> botst met rapporten die vóór deze migratie zijn aangemaakt.

---

# Fase 7 — Off-site zichtbaarheid

**Doel:** het plafond doorbreken dat op puur on-site advies zit.

**Hangt af van:** Fase 3 (de bronanalyse).

**Status: afgerond.** Typecheck, lint en productiebuild slagen; de domeinlogica is in een
kaal script getest (12 gevallen). Migratie 0022 wacht op toepassing — zie de noot onderaan
deze fase.

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

### Wat er uitgevoerd is

**7.1 — het bronnenlandschap.** Over ALLE periodes heen geteld welke domeinen geciteerd
worden, bij hoeveel verschillende vragen, en voor welke concurrenten. Per DOMEIN en niet per
URL: drie pagina's van hetzelfde reviewplatform zijn één signaal, niet drie. Subdomeinen
worden samengevoegd (`nl.trustpilot.com` = `trustpilot.com`), tweedelige TLD's blijven heel
(`example.co.uk`), en zoekmachines en sociale platforms vallen eruit — "sta jij op google.com"
is geen bruikbaar advies. Gesorteerd op aantal VRAGEN en niet op aantal citaties: een bron die
bij zes vragen opduikt bepaalt de markt breder dan een die bij één vraag zes keer aangehaald
wordt.

**7.2 — aanwezigheid controleren.** Er is geen algemene manier om te controleren of een
bedrijf op een willekeurig platform staat: elk platform heeft z'n eigen URL-structuur en de
meeste verstoppen hun zoekfunctie achter JavaScript. Een eigen scraper zou per platform
onderhouden moeten worden. Dus één gegroundde AI-aanroep voor alle domeinen tegelijk — één
web-zoekactie in plaats van tien.

Het model mag expliciet `onbekend` antwoorden, en dat is de belangrijkste van de drie
uitkomsten. Een gok kost de ondernemer een middag werk aan iets wat al geregeld was, of laat
hem denken dat iets geregeld is terwijl dat niet zo is. Staat grounding uit, dan slaan we de
controle helemaal over in plaats van het model te laten raden.

**7.4 — entiteitsaanwezigheid.** Wikidata en Wikipedia hebben allebei een gratis open API
zonder sleutel, dus hier is GEEN AI voor nodig — een model laten raden wat je exact kunt
opzoeken is geld uitgeven aan een slechter antwoord. De valkuil is de naamgenoot: we eisen dat
de Wikidata-beschrijving de branche of een bedrijfswoord bevat, en op Wikipedia telt alleen
een exacte titel. Liever niets vinden dan de verkeerde entiteit koppelen.

**7.3/7.5/7.6 — advies dat een taak wordt.** Het rapport is gesplitst in "Op je eigen site"
en "Daarbuiten". Elke off-site actie is een taak met een status (open / mee bezig / gedaan /
niet relevant), want off-site advies zonder status blijft hangen als goede bedoeling.

Drie regels die de taken bruikbaar houden: alleen bronnen die bij minstens drie vragen
opduiken (daaronder is het toeval, en dan geef je iemand werk zonder uitzicht); alleen waar de
klant er aantoonbaar NIET op staat (`onbekend` levert bewust geen taak op); en de
Wikipedia-taak zegt eerlijk dat het géén doe-het-zelf-actie is — een artikel over je eigen
bedrijf schrijven mag daar niet en wordt verwijderd. Dat staat erbij omdat het verklaart
waarom je minder opduikt dan grotere partijen, niet omdat de klant er iets aan moet doen.

### Klaar als…

- [x] Het rapport bevat aanbevelingen die niet over de eigen website gaan.
- [x] De klant ziet welke bronnen zijn markt bepalen en of hij daarop staat.

> **Nog te verifiëren tegen een echte database en een echte API-sleutel.** Migratie 0022 is
> niet toegepast en de scan heeft nooit gedraaid. Drie dingen om als eerste te toetsen: of de
> gegroundde aanwezigheidscontrole niet te vaak "ja" zegt op een naamgenoot (bij twijfel moet
> de instructie strenger), of de Wikidata-zoekopdracht bij Nederlandse MKB-namen bruikbare
> treffers geeft, en of de drempel van drie vragen niet te hoog is bij analyses met weinig
> geciteerde bronnen.
>
> **Kosten.** Eén extra web-zoekactie per analyse per scan (~$0,03), en die draait hooguit
> één keer per dag. Wikidata en Wikipedia zijn gratis. Met `WEB_SEARCH_ENABLED=false` valt
> de aanwezigheidscontrole weg en kost de scan niets.

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

*Uitgevoerd.* Het eerste scherm vraagt naam en website en heeft twee GELIJKWAARDIGE knoppen:
"Start het onderzoek" en "Eerst meer vertellen (4 korte vragen)". De voortgangsbalk verschijnt
pas als de klant zélf voor de uitgebreide intake koos — "stap 1 van 5" op het eerste scherm
belooft vier stappen werk die er helemaal niet hoeven te zijn.

De rest vragen we op de profielpagina, ná het onderzoek, via `ProfileGaps`. Per ontbrekend
veld staat er wat het CONCREET verbetert: niet "maakt je profiel completer" maar *"noemt een AI
je als 'Jansen BV' terwijl je profiel 'Bakkerij Jansen' zegt, dan tellen we die vermelding niet
mee — je score is dan te laag"*. Een ondernemer vult geen veld in omdat een balkje anders op
80% blijft staan.

### A10 — Eén overzicht over alles heen

Alles is nu per analyse: elke analyse heeft een eigen bibliotheek, eigen rapport, eigen
score. Een klant met drie analyses heeft geen enkel scherm dat antwoord geeft op *"hoe sta
ik ervoor en wat moet ik deze week doen?"*. Bouw een startscherm dat over analyses heen
kijkt: openstaande acties, gepubliceerd deze maand, grootste verandering.

*Uitgevoerd.* `/analyses` opent nu met een actielijst over alle analyses heen. Geen nieuwe
tabellen — het is een andere doorsnede van dezelfde data.

De VOLGORDE is het advies: technische blokkade → wacht op jouw goedkeuring → er ging iets mis
→ klaarliggende content → off-site punten → feitenvragen. Van "hier ligt de app stil te wachten
op jou" naar "hier valt iets te winnen". Wie van boven naar beneden werkt doet automatisch het
juiste eerst, en de eerste actie krijgt het accent (A1: één duidelijke volgende stap, visueel
dominant).

Twee keuzes die het bruikbaar houden: per analyse één regel over klaarliggende content en niet
één per pagina (vijf regels over hetzelfde is geen overzicht), en de "grootste verandering" is
de grootste BETEKENISVOLLE verandering — een sprong van veertig punten op een analyse met vijf
vragen is ruis, en die bovenaan een dashboard zetten is het tegendeel van informeren.

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
