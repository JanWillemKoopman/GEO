# Zes punten uit de doorloop van Huyberts Keukens

Op 26 augustus 2026 is één klant volledig door de keten gehaald, van webadres tot gepubliceerde
pagina met zoekcijfers. Het verslag met de cijfers staat in `docs/logbook.md`. Dit document is het
werk dat daaruit volgt: zes punten, op volgorde van schade, elk met de bestanden, de aanpak en het
verificatiecriterium.

De testklant blijft staan zolang dit werk loopt, want hij is het bewijsmateriaal:

| | |
|---|---|
| Merk | Huyberts Keukens, `6bcf277b-3692-4808-aebe-87380429333d` |
| Cluster | Bestaande keuken renoveren, `7d54743b-410f-492c-a11a-add3d14e8567` |
| Klantaccount | `huyberts@example.com` |
| Pagina Eindhoven | `44684282-5de4-487b-b505-a77b7d174851` |
| Pagina kosten | `f92f0bf9-b513-4b59-bdc5-eb9488172599` |

⚠️ Twee dingen aan deze klant zijn gefingeerd en mogen nooit als echt gelezen worden: de twee
pagina's staan niet op huyberts.nl (de publicatiecontrole is met de hand op geslaagd gezet) en de
543 dagen Search Console-cijfers zijn berekend, niet opgehaald.

---

## 1. De effectmeting gooit de helft van haar betaalde metingen weg

**Wat er gebeurt.** Twee unieke indexen op `tracking_runs` spreken elkaar tegen.

- `tracking_runs_impact_unique_idx` (migratie `0020`) staat één meting toe per
  (`content_piece_id`, `impact_wave`, `prompt_id`, `purpose`). Dat is de bedoeling.
- `tracking_runs_idem_idx` (migratie `0041`) staat één meting toe per
  (`analysis_id`, `prompt_id`, `week_no`, `engine`, `repeat_index`, `purpose`) en kent
  `impact_wave` en `content_piece_id` niet.

Een impactmeting draagt `week_no` van de laatste periode en `repeat_index = 0`. Golf 2 van dezelfde
vraag botst daardoor met golf 1, en twee pagina's die dezelfde vraag als doel hebben botsen met
elkaar. De insert in `lib/pipeline/measure.ts` faalt met "Opslaan van 3a mislukt", en dat gebeurt
**na** de betaalde `web_search`. De taak probeert het vier keer (`MAX_ATTEMPTS`).

**Gemeten bij Huyberts:** 14 taken maal 4 pogingen is 56 weggegooide zoekacties, ongeveer $0,86 van
de $1,73 aan meetkosten. Precies de helft van alle 112 zoekacties.

**Aanpak.** Migratie `0066`: vervang `tracking_runs_idem_idx` door een index die de impactkolommen
meeneemt, of maak hem partieel op `content_piece_id is null` zodat impact- en controlemetingen
uitsluitend door de index uit `0020` beheerst worden. De tweede vorm is de kleinste wijziging en
laat de periodieke metingen ongemoeid. Additief en idempotent volgens `supabase/README.md`: eerst de
nieuwe index aanmaken, dan pas de oude laten vallen, en vooraf tellen of er dubbelen zijn.

⚠️ Kijk in dezelfde ronde of het opslaan van 3a de dure aanroep kan overslaan bij een botsing. Nu
kost elke botsing vier zoekacties voordat de taak definitief opgeeft.

**Bestanden.** `supabase/migrations/0066_*.sql`, `supabase/README.md`, `lib/pipeline/measure.ts`.

**Verificatie.** Plan voor de testklant beide golven van beide pagina's opnieuw in en tel de rijen in
`tracking_runs` met `purpose in ('impact','control')`. Er horen er 24 te staan in plaats van 10, en
`jobs` met status `failed` hoort op nul te blijven. Plus een ketentest in `scripts/test-chain.ts`
die twee golven voor dezelfde vraag meet en controleert dat beide bewaard worden.

---

## 2. Een pagina uit het contentplan kan nooit gemeten worden

**Wat er gebeurt.** `app/api/cron/plan/route.ts` bouwt de schrijfopdracht uit `planBriefing()` en
vult `why`, `targetIntent`, `action` en `existingUrl` aan, maar zet geen `targets`. `saveTargets()`
in `lib/pipeline/content.ts` schrijft daardoor nul rijen in `content_piece_targets`, en
`planImpactWaves()` in `lib/pipeline/impact.ts` slaat de effectmeting over met de melding "geen
doelvragen". Fase 5 bestaat dus niet voor pagina's die via het contentplan geschreven zijn, en dat
is sinds migratie `0065` de normale route.

**Aanpak.** De doelvragen liggen klaar. `planned_pages.source_ref` is `<rapport-id>#<volgnummer>` en
wijst rechtstreeks naar het element in `reports.recommendations_json` waar de `targets` in staan. De
plan-route leest dat rapport en geeft de `targets` mee in de payload van `content_draft`.

**Bestanden.** `app/api/cron/plan/route.ts`, eventueel een leesfunctie in `lib/plan-writing.ts`.

**Verificatie.** Laat de plan-route een pagina inplannen voor de testklant en controleer dat
`content_piece_targets` gevuld is en dat `planImpactWaves()` twee golven plant. Plus een ketentest
die de weg van kans naar geschreven pagina naar doelvragen afloopt.

---

## 3. De titel van een geschreven pagina is een opdracht aan de klant

**Wat er gebeurt.** `lib/pipeline/content.ts` neemt `recommendation.title` letterlijk over als
`content_pieces.title`, en dat is de aanbeveling uit het rapport. De pagina van de testklant heet
"Publiceer een regionale pagina voor keukenrenovatie in Eindhoven". De `meta_title` die het model
zelf schrijft klopt wel: "Keukenrenovatie Eindhoven | Huyberts Keukens".

**Aanpak.** Twee keuzes, en de eerste is te verkiezen omdat hij niets aan de schrijfstap verandert:
laat het scherm en de export de `meta_title` tonen zodra die er is, met de aanbevelingstitel als
terugval en als label in het plan. Of laat het model een echte paginatitel teruggeven naast de
meta-titel. Kies er één en leg de reden vast.

⚠️ De aanbevelingstitel is wel de sleutel van de dedupe (`dedupe.contentDraft`) en de koppeling met
de plankaart. Die mag niet mee veranderen.

**Bestanden.** `lib/pipeline/content.ts`, `app/(app)/analyses/[id]/`, `lib/pipeline/content-export.ts`,
`lib/pipeline/slug.ts`.

**Verificatie.** De contentpagina van de testklant toont "Keukenrenovatie Eindhoven" als titel en de
voorgestelde URL is daarvan afgeleid, niet van de opdrachtzin.

---

## 4. De potentiescore onderscheidt niets bij een nieuwe klant

**Wat er gebeurt.** `potentialScore()` in `lib/potential.ts` is
`(1 − zichtbaarheid/100) × zoekvolume`. Het zoekvolume komt per onderwerp uit
`profile_topics.search_volume_index`, dus alle kansen van hetzelfde onderwerp delen dat getal. Is de
zichtbaarheid bij elke kans nul, en dat is bij elke nieuwe klant zo, dan krijgt elke kans dezelfde
score. Alle zeven kansen van Huyberts kwamen op 58 uit.

**Aanpak.** Dit is een ontwerpvraag en geen bug, dus eerst beslissen. De onderliggende cijfers die
wél verschillen liggen er al: het aantal doelvragen per kans (`target_count`, 1 tot 8 bij Huyberts)
en het opgetelde gewicht van die vragen (`target_weight`, 0,3 tot 3,0). Een score die het gemiste
gewicht meeneemt in plaats van alleen de zichtbaarheid onderscheidt wél. Reken de nieuwe vorm eerst
na op de opgeslagen data van Huyberts en Gasservice Brabant voordat er iets verandert; conventie 10
geldt hier zwaar, want dit getal bepaalt de volgorde van het werk van een klant.

**Bestanden.** `lib/potential.ts`, `lib/potential-data.ts`, `lib/plan-backlog.ts`, plus de
schermen die de band tonen.

**Verificatie.** De zeven kansen van de testklant krijgen zeven onderscheidende scores en de
volgorde is uit te leggen in één zin aan de klant.

---

## 5. Een artikel schrijven past niet in het tijdbudget

**Wat er gebeurt.** `CALL_BUDGET_MS` in `lib/openai/client.ts` staat op 105 seconden en geldt over
alle pogingen heen. Het tweede artikel van de testklant (1034 woorden) haalde dat niet: vier
pogingen voor de schrijfstap en vier voor de herschrijfstap, elke keer "Request was aborted". Het
lukte uiteindelijk, maar kostte een halfuur en zes verspilde aanroepen op het duurste model. De
pagina van 574 woorden ging in één keer goed.

**Aanpak.** Meet eerst hoe lang de schrijfaanroep echt duurt bij 600, 900 en 1200 woorden, want zonder
die getallen is elke wijziging een gok. Daarna één van drie: de redeneerinspanning voor
`content` terug van `medium` naar `low` (`lib/openai/sampling.ts`), het budget omhoog, of de
schrijfstap opknippen. ⚠️ Het budget omhoog raakt de hele rij tijdgrenzen in
`docs/architecture.md` §9: routelimiet 300s, werkerbudget 240s, zware taak 220s, twee aanroepen per
zware taak. Reken die rij opnieuw door en werk de tabel bij, of de werker wordt door Vercel afgekapt
en blijven taken op 'running' staan.

**Bestanden.** `lib/openai/client.ts`, `lib/openai/sampling.ts`, `lib/jobs/worker.ts`,
`docs/architecture.md` §9.

**Verificatie.** Drie artikelen van rond de 1000 woorden schrijven zonder één "Request was aborted",
en de doorgerekende tijdrij staat bijgewerkt in `docs/architecture.md`.

---

## 6. Het effectoordeel kan bij weinig doelvragen alleen "gelijk" zeggen

**Wat er gebeurt.** `thresholdOf()` in `lib/pipeline/impact-math.ts` rekent een 95%-band over twee
binomiale schattingen. Bij twee doelvragen is die band 92 procentpunt breed, bij één doelvraag 136.
De Eindhoven-pagina van de testklant ging van nul naar één van de twee doelvragen, een stijging van
50 punten, en kreeg het oordeel "gelijk". Het cijfer is statistisch correct en tegelijk onbruikbaar:
bij deze aantallen kan de toets nooit iets anders zeggen.

**Aanpak.** Niet de drempel verlagen, want dan meldt de app winst die er niet is (conventie 3). Twee
richtingen die wel kunnen: meer doelvragen per pagina meenemen (bij Huyberts had de kostenpagina er
één, terwijl het rapport er meer aanwees die erop passen), of het scherm laten zeggen wat er aan de
hand is in plaats van "gelijk". "Met twee vragen is dit verschil niet te onderscheiden van toeval,
daar zijn er minstens acht voor nodig" is een bruikbaar antwoord; "gelijk" is dat niet.

**Bestanden.** `lib/pipeline/impact-math.ts`, `lib/pipeline/impact.ts`, het effectscherm,
`docs/ux-design.md`.

**Verificatie.** Het effectscherm van de testklant legt uit waarom er nog geen uitspraak is, met het
benodigde aantal vragen erbij, en claimt nergens winst.

---

## Twee kleinere punten, in dezelfde ronde mee te nemen

**De claimvalidator kent het gesprek niet.** Vier zinnen op de Eindhoven-pagina zijn gemarkeerd als
"uitspraak over het bedrijf zonder bron", waaronder "de montage wordt verzorgd door het eigen
montageteam". Dat feit heeft de klant in het demogesprek zelf bevestigd. Antwoorden op vragen uit de
synthese belanden bewust niet in `proof_points` (zie `isGapQuestion()` in `gap-questions.ts`), maar
de validator zou ze wel als bron moeten accepteren. Nu zet `needs_review` op waar bij een pagina die
in orde is, en dat leert de klant de melding negeren.

**Toewijzen laat de accountlaag links liggen.** `POST /api/profiles/[id]/assign` verplaatst
`profiles.user_id` en `analyses.user_id`, maar voegt de klant niet toe aan `account_users` en laat
`profiles.account_id` op het account van de beheerder staan. De klant komt daardoor binnen via de
oudere eigenaarsregel (laag 2 in `lib/accounts.ts`) in plaats van via de accountlaag die daar
bovenop gebouwd is. Beslis of dat zo hoort en leg het vast, of vul het aan.
