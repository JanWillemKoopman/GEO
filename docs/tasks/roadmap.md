# Roadmap, wat er nog open staat

Op volgorde. **Stand: 11 augustus 2026**, 1088 unittests + 92 ketentests groen, migraties t/m `0053`
toegepast (`0033` gereserveerd, nooit gedraaid, vervangen door `0039`).

> ⚠️ **Het pad naar de lancering staat in [`lanceerplan.md`](./lanceerplan.md), niet hier.** Dat
> document heeft de zes testsporen (A tot en met F plus R), de afvinklijst voor het lanceerbesluit en
> de tweeweekse planning. Wat hieronder staat is het oudere werk. **Lees het lanceerplan eerst.**

> ⚠️ **De richting van het product staat sinds 10 augustus 2026 in [`../Nova.md`](../Nova.md).**
> Dat document bevat vier vastgelegde besluiten (merk-werkruimte, klantportaal met admin,
> twaalfmaandsplan als kernobject, Search Console naast AI-zichtbaarheid) en een bouwplan van acht
> fases, ongeveer 51 dagen. **Lees dat eerst.** Wat hieronder staat is het oude werk dat nog open
> stond; per punt is aangegeven of het opgaat in een fase van dat plan.
>
> De volgorde daar is: fundament, merk-werkruimte, rollen en uitnodigingen, onboarding-wizard,
> contentplan, CSM-paneel, Search Console, de lus sluiten, accountscherm. Moet je kiezen,
> doe dan fase 1, 4 en 6.
>
> ⚠️ Twee dingen die in oudere alinea's hieronder nog wél genoemd worden, zijn geschrapt en géén
> werk meer: **meertaligheid** (besluit 13) en de **donkere modus** (besluit 17).

## Afgerond sinds de vorige stand

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
  3–4 augustus. De bouwspec staat nog in [`onboarding-2.0.md`](./onboarding-2.0.md) omdat de
  verificatietabel daar nog open punten heeft.
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

1. **De MEETRONDE is nog niet nagerekend** op GPT-5.6. De cijfers hierboven gaan over de
   onboarding; de schatting van ~$0,40 per meetronde (was $0,82) komt nog steeds uit de
   gepubliceerde tarieven. Let specifiek op de zoekactie-tokens: die worden op een redeneermodel
   wél als input afgerekend en waren op de oude preview gratis.
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

## 5. Search Console koppelen, onderzocht en klaar om in te plannen (~5 d)

Volledig onderzoek, ontwerp en verificatiecriteria:
[`zoekdata-koppeling.md`](./zoekdata-koppeling.md). Uitgezocht op 6 augustus 2026, nog niets gebouwd.

De korte versie: InSpace koppelt bij Nova de Search Console van de klant via een service account dat
de klant zelf als gebruiker aan zijn property toevoegt, niet via OAuth, en dat draagt hun hele
klantdashboard. Google Analytics houden ze bewust buiten het product; dat is een afspraak met de
customer success manager, geen integratie. Voor Aura is hetzelfde onderscheid het juiste: GSC wel,
GA niet.

Waarde voor ons zit op drie plekken, oplopend: de publicatiecontrole weet nu niet of een pagina
geïndexeerd is, de effectmeting krijgt een tweede onafhankelijke as naast de AI-zichtbaarheid, en de
30 vragen per analyse kunnen op echte zoekopdrachten met vertoningen rusten in plaats van op een
schatting van het model. Kosten nul, want geen enkele AI-aanroep.

**Staat achter punt 0 en 1**, en er is een derde blokkade die zwaarder weegt: nagerekend op de
productiedatabase staan er 32 contentpagina's, waarvan 21 op `ready`, en **nul gepubliceerd**. Geen
enkele `published_url`, geen enkele rij in `content_impact`. De keten publiceren, controleren en
effect meten heeft dus nog nooit met echte data gedraaid, en dat is precies de keten waar de
sterkste toepassing van Search Console aan hangt.

## 6. De tien dingen uit Nova die Aura beter maken (~4 d)

Volledige ontleding van de InSpace-apps, met IA, functiematrix, statusmachines, flows en 44
detailvondsten: [`nova-analyse.md`](./nova-analyse.md). Gereconstrueerd uit 2.447 letterlijke
interfaceteksten die beide apps publiek in hun inlogpagina zetten.

Voorstel is één ronde van vijf punten, in deze volgorde: statustaal in twee lagen (een leesbare
staat naast de technische, "Wacht op jou" tegenover `briefing`), lege staten die de oorzaak noemen
in plaats van alleen leeg te zijn, verboden woorden plus compliance-aantekeningen naar de
schrijfprompt en de claimvalidator, faders voor de tone of voice in plaats van één vrij tekstveld,
en publiceren onomkeerbaar maken met het domein vast en alleen het pad bewerkbaar.

**Wat we bewust niet overnemen** staat in §6.2 van dat document, met de reden erbij. De sterkste is
niet van ons maar van hen: bij de herbouw van hun eigen app zijn de kalender, de chatassistent, de
handmatige editor, de clustervisualisatie en het puntensysteem allemaal gesneuveld. Alles wat weg
is gaf de klant meer knoppen; wat bleef geeft hem meer duidelijkheid.

## 7. Blijvend uitgesteld: R0, Fundament (8 d)

Volledige bouwspec per stap: [`r0-fundament.md`](./r0-fundament.md).

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

> **Vóór de lancering en de eerste echte klant geldt [`lanceerplan.md`](./lanceerplan.md).** Dat
> document toetst in vijf sporen of alles werkt, of er niets gebroken is, en of elk scherm de vijf
> eigenschappen haalt die "InSpace-kwaliteit" toetsbaar maken. Inclusief de afvinklijst waarmee het
> lanceerbesluit genomen wordt.

## Wat er nog open staat, en waarop het wacht

| Wat | Wacht op |
|---|---|
| Het analysescherm met kliks naast AI-zichtbaarheid (fase 5) | `GOOGLE_SERVICE_ACCOUNT_JSON` |
| Impact terug in het plan (fase 6) | de eerste écht gepubliceerde pagina |
| Automatische controles op gepubliceerde pagina's (fase 6) | idem |

Alles wat zónder die twee kan, is gebouwd en getest.
