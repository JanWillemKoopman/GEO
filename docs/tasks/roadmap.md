# Roadmap, wat er nog open staat

Op volgorde. **Stand: 17 augustus 2026**, 1257 unittests + 160 ketentests groen, migraties t/m
`0059` toegepast (`0033` gereserveerd, nooit gedraaid, vervangen door `0039`). De punten hieronder
zelf zijn niet allemaal opnieuw doorgelopen sinds 11 augustus; alleen de teller en de nieuwe regel
bij "Afgerond sinds de vorige stand" zijn bijgewerkt. Voor wat er sindsdien is gebouwd (de
potentiescore), zie `potentiescore.md` en `logbook.md`.

> ⚠️ **Het achtfasenplan uit `Nova.md` is afgebouwd** (fundament, merk-werkruimte, rollen en
> uitnodigingen, onboarding-wizard, contentplan, CSM-paneel, Search Console, de lus sluiten,
> accountscherm), zie `docs/logbook.md` voor per fase wat er gebouwd is. Het document zelf is
> 17 augustus 2026 verwijderd, het was zijn doel voorbij. Wat hieronder staat is ouder werk dat toen
> nog open stond; per punt is aangegeven of het al is opgegaan in een van die fases.
>
> **De richting nu staat in [`../visie.md`](../visie.md).** Dat document is een bestemming, geen
> bouwopdracht: het beschrijft waar ORBIT ENGINE naartoe groeit, niet wat er als eerstvolgende al
> gepland staat. Voor dat laatste is dit bestand leidend.
>
> ⚠️ Twee dingen die in oudere alinea's hieronder nog wél genoemd worden, zijn geschrapt en géén
> werk meer: **meertaligheid** (besluit 13) en de **donkere modus** (besluit 17).

## Afgerond sinds de vorige stand

- **De potentiescore** (13 augustus, migratie `0057`): zichtbaarheidsgat × zoekvolume, één getal
  dat over alle onderwerpen van een merk eerlijk vergelijkbaar is, in drie fases gebouwd en op
  productie geverifieerd. Zichtbaar op het analysedossier en bij elke pagina, en stuurt sinds fase
  2 en 3 ook de volgorde van de Kansen-lijst en het contentplan. Volledige bouwspec en
  verificatietabel: `potentiescore.md`.
- **De acht Nova-fases** (10-11 augustus): merk-werkruimte, rollen en uitnodigingen,
  merkprofiel-wizard, contentplan, CSM-paneel, Search Console, de lus gesloten, accountscherm.
  Migraties `0046` t/m `0052`. Zie `logbook.md`.
- **Besluit 18, de kostenrem**: alleen de beheerder start betaald werk (`lib/cost-guard.ts`).
- **Spoor R, de regionale vragen**: een lokaal merk wordt uitsluitend op regionale vragen beoordeeld.
  Vangnet in `lib/pipeline/geo-share.ts`, poort op handmatige invoer, en 55 landelijke vragen van
  Van den Udenhout uitgezet. Open blijft R4 (het onderscheid tonen in het scherm) en R5 (de trendlijn
  markeren waar de vragenset wijzigde).
- **F1, het budgetplafond** (migratie `0053`): €50 per account per maand en €150 per dag over alles.

- **Onboarding 2.0**, gebouwd én op productie geverifieerd in drie meetronden
  ($0,2438 / $0,2463 / $0,2495, ~7,5 minuut, acht taken). Zie `logbook.md` §14 en de dagnotities van
  3–4 augustus. De bouwspec (`onboarding-2.0.md`) is verwijderd nu de bouw af is en er nieuwere
  lagen overheen staan (accounts, uitnodigingen, besluit 18); wat nog telt staat hierboven en in
  `logbook.md`.
- **De vier InSpace-optimalisaties**, structurele gap-analyse, rijkere schema.org, duplicatie- en
  leesbaarheidscontrole. Bouwspec verwijderd, samengevat in `logbook.md`.
- **De UX-ronde op de onboarding**, tien bevindingen, alle tien uitgevoerd.
- **R6.2**, opgegaan in fase 0 van de nieuwe onboarding.
- **Archiveren** (migratie `0044`): de zeven testmerken en elf analyses staan uit beeld maar in de
  database.
- **De vormgeving over op het NOVA-systeem** (6 augustus): tokens, componenten en het `docs/
  designsystem.md`-brondocument. Zie `logbook.md` §29-30.
- **De grote duidelijkheidsronde** (7 augustus): bijna vijftig punten uit een vergelijking met
  Nova, in blokken A t/m H (statustaal, foutmeldingen, print/PDF, deelvoorbeeld, schrijfregels-UI,
  meetdatum+model, centrale foutmeldingenplek, inhoudsopgave). Migratie `0045`
  (`taboo_phrases`/`compliance_notes`/auteursvelden/tone-sliders) hoort hierbij. Zie `logbook.md`
  §31.
- **De content-editie** (8 augustus): versiediff, search preview, FAQ-editing, een "waarom deze
  pagina"-paneel en een Bewerken/Voorbeeld-toggle op de contentdetailpagina, naar Nova's
  contentreview-oppervlak. Zie `logbook.md` §32.

## 0. De GPT-5.6-overstap natrekken, grotendeels gedaan (~$1, een half uur)

⚠️ **Bijgewerkt op 4 augustus 2026.** Dit punt begon met "er is nog geen enkele echte call op
GPT-5.6 gemaakt". Dat klopt niet meer: drie volledige onboardings op productie hebben samen ruim
veertig echte aanroepen gedaan over alle drie de effort-niveaus, mét `web_search`, zonder één
parameterfout. Wat daarmee is afgetekend:

- **De parametercombinaties werken.** Effort `none` met temperatuur 0 (classificatie en
  promptgeneratie), `low` (onderzoek en rapport) en `medium` op Sol (synthese) draaiden alle drie.
  Het vangnet in `structured.ts` is niet één keer aangesproken.
- **De kosten zijn gemeten.** Een volledige onboarding kost **$0,2438 / $0,2463 / $0,2495** over
  drie ronden, opvallend stabiel, en 11% van het plafond van $2,15. De duurste post is niet
  `web_search` maar de synthese op Sol: $0,127, 52% van het totaal.

Wat nog openstaat:

1. ~~De MEETRONDE is nog niet nagerekend op GPT-5.6.~~ **Gedaan op 17 augustus 2026.** De schatting
   van ~$0,40 was ruim twee keer te laag: over de 13 meetrondes in `ai_calls` is het gemiddelde
   **$0,855** (laagste $0,50, hoogste $1,56). De verdeling is schever dan gedacht, `measure_simulate`
   is 98,8% en `measure_mention` 1,2%. Cijfers en onderbouwing in `architecture.md` §6.
2. **`npm run eval:mention -- --compare`**, de classificatie draait op een ánder model dan waarop
   de mention-prompt is afgeregeld. Drempel 90%.
3. **Doorlooptijd van één `content_draft` meten.** De effort staat op `medium` en niet op `high`
   omdat één call binnen `TIMEOUT_MS` (100 s) moet passen. Blijkt een pagina ruim binnen de tijd
   klaar, dan is `high` de gratis kwaliteitswinst op de duurste stap van het product.

## 1. Verificatieronde R8 + S1–S8

Zie `verificatie-r8-s8.md`. ~$2, een halve dag. **Gebouwd is niet geverifieerd**: R8 en S1–S8 zijn
met unittests op de echte gevallen getoetst, maar er is nog geen nieuwe pagina mee geschreven op
productie. Dit blokkeert alles hieronder. Er is geen zin in nieuwe rondes op een keten waarvan de
vorige ronde niet is nagerekend.

## 2. De rest van R7, de meetbasis stabiliseren (~2 d)

R7.1 is gebouwd (`0037`). Wat blijft staan: bij 5 winbare vragen is de score formeel nog een getal,
maar zegt hij niets meer. De tellers `elicit_successes`/`elicit_samples` uit `0037` zijn de invoer
om dat zichtbaar te maken.

Neem meteen de ketentest mee naar de meetkant: de opzet staat er, een scenario toevoegen is nu
goedkoop, en `0037` gaf er twee kolommen bij die zich deterministisch laten toetsen.

## 3. R8.9 opnieuw beoordelen (gericht, geen traject)

Na S1 is de vraag alleen nog wat we doen met een klant als Bol, waarvan de crawl één pagina zonder
bruikbare tekst opleverde. Dat is een gerichte vraag over één klanttype, geen onderzoek van 3–5
dagen zoals oorspronkelijk begroot.

Achterliggend punt: koopgids-content is het verkeerde format voor Bol/Coolblue/HEMA-achtige klanten
zonder productfeed.

## 4. R6.3, brontype als signaal (1,5 d)

Volledige bouwspec: [`r6-inventaris-en-bronnen.md`](./r6-inventaris-en-bronnen.md). R6.2 is
gebouwd als fase 0 van de onboarding.

Bij Fysi-Unique zijn 8 van de 10 meest geciteerde bronnen homepages. Dan is "schrijf een lange
blogpagina" waarschijnlijk het verkeerde advies.

## 5. Search Console koppelen: GEBOUWD op 11 augustus, wacht nu op de Google-sleutel

⚠️ **Dit punt is achterhaald sinds de acht Nova-fases.** Het onderzoek hieronder was de aanleiding,
maar de koppeling zelf is inmiddels gebouwd: het scherm, de controle, de dagelijkse `gsc_sync`-taak
(migratie `0052`, `lib/search-console/`) en het gedrag bij 403 en 404. Zie de actuele stand onderaan
dit document bij **"Fase 5, wat er wacht op de Google-sleutel"**, en `logbook.md` (Fase 5, deel 2,
11 augustus). Wat volgt is de oorspronkelijke onderzoeksvraag, met historische waarde voor het
"waarom zo", niet meer als openstaand werk.

Het onderzoeksdocument is 17 augustus 2026 verwijderd: de koppeling is gebouwd en de twee regels
die eruit kwamen staan nu in `lib/search-console/window.ts` zelf.

De korte versie: InSpace koppelt bij Nova de Search Console van de klant via een service account dat
de klant zelf als gebruiker aan zijn property toevoegt, niet via OAuth, en dat draagt hun hele
klantdashboard. Google Analytics houden ze bewust buiten het product; dat is een afspraak met de
customer success manager, geen integratie. Voor ORBIT ENGINE is hetzelfde onderscheid het juiste: GSC wel,
GA niet. Kosten nul, want geen enkele AI-aanroep.

De derde waarde uit het onderzoek, "de publicatiecontrole weet nu of een pagina geïndexeerd is",
staat nog steeds achter dezelfde blokkade als bij het schrijven van dit punt: nagerekend op de
productiedatabase staan er content-pagina's op `ready` en nul gepubliceerd. Geen enkele
`published_url`, geen enkele rij in `content_impact`. De keten publiceren, controleren en effect
meten heeft dus nog nooit met echte data gedraaid, zie Fase 6 verderop in dit document.

## 6. De tien dingen uit Nova die ORBIT ENGINE beter maken (~4 d)

De ontleding van de InSpace-apps (IA, functiematrix, statusmachines, flows, 44 detailvondsten,
gereconstrueerd uit 2.447 letterlijke interfaceteksten) is samengevat in `logbook.md` §29 en §30.
Het losse analysedocument is 17 augustus 2026 verwijderd, de conclusies zijn gebouwd.

Voorstel was één ronde van vijf punten, in deze volgorde: statustaal in twee lagen (een leesbare
staat naast de technische, "Wacht op jou" tegenover `briefing`), lege staten die de oorzaak noemen
in plaats van alleen leeg te zijn, verboden woorden plus compliance-aantekeningen naar de
schrijfprompt en de claimvalidator, faders voor de tone of voice in plaats van één vrij tekstveld,
en publiceren onomkeerbaar maken met het domein vast en alleen het pad bewerkbaar.

⚠️ **Drie van de vijf zijn intussen gebouwd**, via de grote duidelijkheidsronde (7 augustus,
migratie `0045`) en niet apart als "Nova-punt" afgevinkt: statustaal in twee lagen, verboden woorden
plus compliance-aantekeningen (`taboo_phrases`/`compliance_notes`), en de tone-of-voice-faders
(`tone_formality`/`tone_energy`/`tone_complexity`/`tone_humor`). **Nog open:** publiceren
onomkeerbaar maken, het publicatieveld in `publish-box.tsx` is nu nog gewoon een vrij URL-veld. Lege
staten met oorzaak: `components/empty-state.tsx` bracht één consistente vorm met verplichte
volgende-stap-knop, maar of elke lege staat ook de oorzaak benoemt is niet apart nagelopen.

**Wat we bewust niet overnemen** staat in §6.2 van dat document, met de reden erbij. De sterkste is
niet van ons maar van hen: bij de herbouw van hun eigen app zijn de kalender, de chatassistent, de
handmatige editor, de clustervisualisatie en het puntensysteem allemaal gesneuveld. Alles wat weg
is gaf de klant meer knoppen; wat bleef geeft hem meer duidelijkheid.

## 7. Blijvend uitgesteld: R0, Fundament (8 d)

De losse bouwspec is 17 augustus 2026 verwijderd: nul codebestanden verwezen ernaar en de zes
stappen zijn nooit gebouwd. Wat eronder stond, staat hier.

Hygiëne die in de praktijk niets blokkeerde; R4 bleek prima te bouwen zonder R0.5. Zes stappen:
`existingUrl`-conventie afdwingen · volumekalibratie normaliseren · clusters bruikbaar maken ·
meetbasis-krimp zichtbaar maken · entiteitclassificatie (bedrijfsmodel + productlijnen) · off-site
repareren of uitzetten.

Eén punt is het onthouden waard: **R0.5 is de reden dat de fabrikanten die Bol verkoopt nog steeds
als concurrent meetellen.** De helft van R0.5 is intussen meegelift op R8.5: de kolom
`business_model` bestaat en wordt gevuld; alleen `classify-entities.ts` gebruikt hem nog niet.

## 8. Wat de UX-ronde bewust heeft laten liggen

- **De strategiekaart als gespreksinstrument** (`strategy-box.tsx`). Nu bereikbaar via een
  springlink, verder onaangeraakt. Herontwerpen vraagt eerst drie echte consultancygesprekken,
  anders is het gokwerk. ~halve dag zodra die ervaring er is.
- **De drempels van de kwaliteitspoort afstellen op data.** `DUPLICATE_THRESHOLD` staat op 0,35 en
  de leesbaarheidsgrenzen op 20/25 woorden per zin; allebei ruim gekozen. De gemeten waarden worden
  gelogd, dus na tien echte pagina's kan dit op data in plaats van op gevoel.
- **`SYNTHESIS_PREMIUM` narekenen.** De synthese op Sol is met $0,127 goed voor 52% van de
  onboardingkosten. De schakelaar bestaat; de vergelijking met Luna vraagt vijf profielen.

## 9. Eén taak per onboarding viel terug van `running` naar `queued`

Gezien in beide meetronden van 3 augustus, sneller dan de reclaim-drempel van vijf minuten. Dus er
speelt iets anders. Kostte in ronde 2 minuten stilstand. Eerst loggen, dan pas repareren. Dit is het
verschil tussen de 7,5 minuut die je in een demo belooft en 12 minuten.

## Losse punten

- `npm run eval:mention` is **nooit gedraaid tegen de gewijzigde mention-prompt**. Vereist een
  API-sleutel. `lib/openai/mention-prompt.ts` omschrijft zichzelf als "de meest load-bearing prompt
  van het hele product". Daar hoort een evaluatie bij.
- De kostencijfers in code-commentaar gaan op sommige plekken nog uit van $0,356 per periode. De
  actuele cijfers staan in `architecture.md` §6: op de GPT-4.1-familie ~$0,82 per ronde en ~$1,06
  met herhalingen; na de overstap naar GPT-5.6 naar schatting ~$0,40, zie punt 0 hierboven, die
  schatting is nog niet nagerekend.

## Fase 6, wat er nog wacht op de eerste publicatie (11 augustus 2026)

Twee onderdelen van "de lus sluiten" zijn bewust niet gebouwd, omdat er niets is om ze tegen na te
rekenen:

| Wat | Waarom het wacht | Wanneer het kan |
|---|---|---|
| Impact terug in het plan: een pagina die na 60 dagen niets deed leidt tot een voorstel, een onderwerp dat wél werkte krijgt meer ruimte | `content_impact` heeft nul rijen, want er is nog nooit een pagina gepubliceerd | Zodra één echte pagina live staat, plus de golven van 30 en 60 dagen |
| Automatische controles op gepubliceerde pagina's: staat hij er nog, is hij gewijzigd, is hij nog vindbaar voor AI-crawlers | Zelfde reden. `verifyPublication()` heeft nul echte gevallen gezien | Zodra één echte pagina live staat |

De goedkoopste manier om dit te deblokkeren: één van de twee geschreven pagina's van Van den Udenhout
echt publiceren en in het plan als geplaatst markeren. Daarna draait de keten publiceren, controleren,
effect meten voor het eerst van begin tot eind.

## Fase 5, wat er wacht op de Google-sleutel (11 augustus 2026)

| Wat | Waarom het wacht |
|---|---|
| Het analysescherm met kliks naast AI-zichtbaarheid in één grafiek | Er is nog geen enkele rij in `search_console_days`, want `GOOGLE_SERVICE_ACCOUNT_JSON` is nog niet ingesteld. Een grafiek met één lege lijn is niet na te rekenen |

De koppeling zelf staat er wél: het scherm, de controle, de dagelijkse taak en het gedrag bij 403 en
404. Zodra de sleutel er is en één property gekoppeld is, is dat scherm ongeveer een halve dag werk
en meteen te verifiëren.

## Fase 7 (11 augustus 2026): af

Bedrijfsgegevens, het btw-vinkje, het pakket, opzeggen als datum (besluit 14), en e-mail en wachtwoord
wijzigen. **De donkere modus is geschrapt, niet uitgesteld** (besluit 17); hij staat nergens meer op
een lijst.

## Het lanceerplan

Het losse lanceerplan van 11 augustus is op 17 augustus 2026 verwijderd: de sporen zijn afgelopen
en de tweeweekse planning was verstreken. Wat blijvend geldt zijn de twee kwaliteitslatten,
**K1 t/m K5** (elke toestand een eigen scherm, elke foutmelding specifiek, de taal zegt wie aan zet
is, onomkeerbaar vooraf benoemd, bulk eerlijk over half succes) en **P1 t/m P7** (geen stille fout,
geen tweelingen, kosten met een plafond, waarneembaar bij storing, herstelbaar, grenzen getest).
Beide staan voluit in `docs/logbook.md`, en twaalf codebestanden verwijzen ernaar.

## Wat er nog open staat, en waarop het wacht

| Wat | Wacht op |
|---|---|
| Het analysescherm met kliks naast AI-zichtbaarheid (fase 5) | `GOOGLE_SERVICE_ACCOUNT_JSON` |
| Impact terug in het plan (fase 6) | de eerste écht gepubliceerde pagina |
| Automatische controles op gepubliceerde pagina's (fase 6) | idem |

Alles wat zónder die twee kan, is gebouwd en getest.
