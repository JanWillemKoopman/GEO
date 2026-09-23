# Contentflow: één pagina, één lijn, eerst alle vragen

> **Status (23 september 2026): fase A tot en met F gebouwd**, zie de alinea van die datum onderaan
> `docs/logbook.md`. Open: §4.4 herinneringsmails, §5 bestaande data (wacht op akkoord eigenaar),
> "Zet in het plan" als knop in een cluster, en de schermafbeeldingen uit §4.6a. Afwijking: geen
> migratie, de standen worden afgeleid (`lib/pagina-stand.ts`), zie het logboek.
>
> **Oorspronkelijke status: nog niet begonnen.** Opgesteld op 23 september 2026 na een analyse van de flow van
> contentplan tot gepubliceerde pagina, met de data van Van den Udenhout als praktijkgeval.
> Uitvoeren in een nieuwe sessie, fase voor fase, in de volgorde van §6. Elke fase is een eigen
> commit met `tsc --noEmit`, `test:unit`, `test:chain` en `build` groen.

## 0. Lees dit eerst (voor de sessie die dit uitvoert)

1. Lees `CLAUDE.md`, daarna §1 tot en met §4 van dit document helemaal.
2. Controleer elke bewering in §2 zelf in de code en in de database (Supabase-project `GEO`,
   `kosauqzjbpweluiqgmwv`) voordat je erop bouwt. Dit document is geschreven op 23 september
   2026; de code kan intussen veranderd zijn. Klopt iets niet meer, pas dan eerst dit document aan.
3. Werk op een feature-branch vanaf `main`. Migratie eerst, dan code, dan UI.
4. Houd §3 (het besluit) heilig. Twijfel je of iets daarmee botst, vraag het de eigenaar.

## 1. Het besluit van de eigenaar

**Er wordt pas geschreven als elke vraag van die pagina beantwoord of overgeslagen is.**

Overslaan is een volwaardige keuze en telt als antwoord (dat was al zo, zie `lib/content-final-gate.ts`
en `zetVastEnMeet()` in `lib/pipeline/content-plan.ts`: een overgeslagen vraag snoeit de sectie
uit het contract). Er is **geen** uiterste datum waarna de app toch schrijft: dat was het eerdere
advies, en de eigenaar heeft het afgewezen. De reden: kwaliteit garanderen, en zeker weten dat de
klant de vragen gezien heeft.

Gevolg dat we eerlijk benoemen: een pagina waarvan niemand de vragen beantwoordt, wordt niet
geschreven en haalt zijn publicatiedatum niet. Dat wordt niet stil gelaten maar zichtbaar
gemaakt (herinnering, "loopt achter", voorstel voor een nieuwe datum). Zie §4.4.

## 2. Hoe het nu werkt (stand 23 september 2026)

Er zijn twee routes naar een geschreven pagina, met elk eigen regels.

**Route 1, vanuit een cluster** (`planContentBriefing()` in `lib/jobs/content-jobs.ts`)
- Klant kiest een aanbeveling. `ensureBriefingPieces()` maakt een rij in `content_pieces` met
  status `briefing`.
- Per pagina een `content_plan`-taak met `voorBriefing`; de laatste start `content_brief`
  (`scheduleBriefingIfLastPlan()` in `lib/jobs/handlers.ts`), die vragen maakt in `fact_requests`.
- De klant beantwoordt op `/analyses/[id]/briefing` en drukt op "Schrijf mijn pagina's"
  (`app/api/analyses/[id]/briefing/route.ts`). Daar zit ook de inputpoort
  (`lib/content-input-gate.ts`, 40 en 70 procent).
- Daarna `content_plan` zonder `voorBriefing`, `content_draft`, eventueel `content_revise`, en
  status `ready`.

**Route 2, vanuit het contentplan** (`app/api/cron/plan/route.ts`, dagelijks 04:00 UTC,
`startPaginaSchrijven()` in `lib/plan-write-start.ts`)
- Pagina in een goedgekeurde maand, datum binnen 10 dagen (`SCHRIJFVOORSPRONG_DAGEN` in
  `lib/plan-status.ts`): `planContentDraft()` start `content_plan` **zonder** `voorBriefing`, en die
  plant meteen `content_draft`. **Geen vragenronde en geen inputpoort.**
- `linkPlannedPage()` zet `planned_pages.status` op `ter_goedkeuring` zodra de tekst er is.

**Problemen die dit plan oplost**
1. Route 2 schrijft zonder vragen. Dat botst direct met het besluit in §1.
2. Twee statuslijsten voor één pagina: `planned_pages.status` (`lib/plan-status.ts`) en
   `content_pieces.status` (`lib/content-status.ts`). Ze houden elkaar niet bij: goedkeuren in de
   bibliotheek (`.../content/[pieceId]/approve`) raakt `planned_pages` niet, goedkeuren in het plan
   (`app/api/profiles/[id]/plan/pages/[pageId]/route.ts`, actie `goedkeuren`) raakt
   `content_pieces.needs_review` niet.
3. **"Markeer als geplaatst" in het plan (`markPosted()` in `lib/plans.ts`) start geen
   publicatiecontrole en geen nameting.** Alleen `markPublished()` in `lib/pipeline/publish.ts`
   doet dat (`verify_publication` en `planImpactWaves()`).
4. Statuslabels kloppen niet: `briefing` heet "Wacht op jouw input" ook als alle vragen
   beantwoord zijn; `ready` heet "Klaar om te publiceren" terwijl `needs_review` nog `true` is.
5. De paginadetail woont onder `/analyses/[id]/bibliotheek/[pieceId]`, en `lib/nav.ts` (rond regel
   551) laat daar "Clusters" oplichten. Het plan linkt niet naar de tekst ("Zoek hem in de
   bibliotheek" in `plan-view.tsx`).
6. Taken van de klant staan op vier plekken: Openstaande vragen, het briefingscherm in een
   cluster, "Tekst klaar voor akkoord" in het plan, vrijgeven en publiceren in de bibliotheek.
7. Plan-pagina's zonder `topic_id` worden elke ochtend stil overgeslagen (`geen_onderwerp`).

**Praktijkgeval Van den Udenhout** (profiel `e0e61ce8-c6f7-485d-84cc-426b1ef26ebc`, gemeten
23 september 2026): pagina `9332a0fb-...` stond op `briefing` met alle vijf vragen beantwoord op
20 september; dezelfde titel stond los in het plan op 28 september; twee `ready`-pagina's hadden
`needs_review = true`; twee septemberpagina's hadden geen `topic_id`. Gebruik dit profiel als
controle na elke fase (lezen, niet schrijven zonder overleg).

## 3. Het nieuwe proces

Elke pagina volgt dezelfde lijn, altijd via het contentplan. Bij elke stand staat wie aan zet is.

| # | Stand (klanttaal) | Aan zet | Wat er gebeurt | Hoe hij verder gaat |
|---|---|---|---|---|
| 1 | Gepland | ORBIT ENGINE | In het plan met een datum | De maand wordt vrijgegeven |
| 2 | Wordt voorbereid | ORBIT ENGINE | Onderzoek, inhoudsopgave (contract), feitenkaart, vragen | Vanzelf als de vragen er zijn (enkele minuten) |
| 3 | Jouw antwoorden nodig | Jij | Vragen van deze pagina beantwoorden of overslaan | **Pas als élke vraag beantwoord of overgeslagen is.** Nul vragen: meteen door naar 4 |
| 4 | Wordt geschreven | ORBIT ENGINE | Schrijven, keuren, herstellen | Vanzelf. Geen extra knop |
| 5 | Lees en keur goed | Jij | Tekst lezen, eventueel bewerken of een aanpassing vragen | "Keur goed" (naar 6) of "Vraag een aanpassing" (terug naar 4) |
| 6 | Zet hem live | Jij | Op de eigen site plaatsen, adres invullen | Adres ingevuld |
| 7 | Staat live, effect wordt gemeten | ORBIT ENGINE | Publicatiecontrole, nameting na 14 en 28 dagen | Vanzelf |
| 8 | Effect bekend | Niemand | Oordeel staat bij de pagina | Eindstand |

Plus twee zijstanden: **Loopt achter** (streefdatum voor de antwoorden gepasseerd, zie §4.4) en
**Mislukt** (bestaat al als `mislukt`).

Waarom de klant na stand 3 geen knop meer hoeft in te drukken: het laatste antwoord of de laatste
overgeslagen vraag ís de handeling. Een extra knop "Schrijf nu" is precies de stille stilstand die
pagina `9332a0fb` liet zien.

### 3.1 Eén vragenmoment per maand (laatste check, 23 september 2026)

De eerste versie van dit plan startte de voorbereiding per pagina, 21 dagen voor zijn datum. Bij de
laatste check afgewezen, omdat het niet voorspelbaar is: bij vijf pagina's per maand druppelen er
dan op vijf verschillende dagen vragen binnen, en de klant weet nooit wanneer hij weer moet kijken.

**Nieuw: vrijgeven van een maand start de voorbereiding van álle pagina's van die maand tegelijk.**
Binnen enkele minuten staan alle vragen van die maand klaar, samengevoegd waar ze overlappen (dat
doet de briefing al per batch). Het ritme voor de klant wordt daarmee één zin:

> **Maand vrijgeven, vragen van die maand beantwoorden, de rest gaat vanzelf.**

Dat is ook hoe de eigenaar het proces zelf beschreef. Wat het kost: de voorbereiding draait nu ook
voor pagina's die pas eind van de maand verschijnen, ongeveer 2 dollarcent per pagina (gemeten
1 september 2026, zie `planContentBriefing()`), tegenover ongeveer $1,10 voor het schrijven.

Om te voorkomen dat teksten weken te vroeg klaarliggen, begint het **schrijven** per pagina niet
eerder dan 10 dagen voor zijn datum, ook als de vragen al eerder beantwoord zijn
(`SCHRIJFVOORSPRONG_DAGEN` blijft). Stand 4 toont dan "Alle vragen gedaan, we schrijven hem vanaf
14 oktober". Dat is geen knop en geen wachten op de klant, alleen een datum.

**Streefdatum voor de antwoorden:** 12 dagen voor de datum van de pagina (10 dagen schrijfvoorsprong
plus 2 dagen marge). Die staat bij elke vraag. Het is een streefdatum en geen uiterste datum: er
wordt nooit geschreven zolang een vraag open staat (besluit §1).

**Bij het vrijgeven** zegt de dialoog vooraf: "Na vrijgeven staan binnen een paar minuten 11 vragen
voor deze 5 pagina's klaar. Beantwoord ze vóór 12 oktober om op schema te blijven."

### 3.2 Regels die de flow voorspelbaar houden

1. **Na stand 3 komen er geen nieuwe vragen bij voor die pagina.** Gecontroleerd op 23 september
   2026: het schrijven en herstellen (`lib/pipeline/content.ts`) maakt geen `fact_requests` aan.
   Wat bij het schrijven nog ontbreekt wordt een opmerking bij het goedkeuren (stand 5), nooit een
   nieuwe vraag die de pagina terugzet. Bewaak dat met een test in `test-chain.ts`.
2. **Een antwoord wijzigen nadat er tekst is** zet de pagina niet stil terug. Op het paginascherm
   verschijnt "Je antwoord is gewijzigd na het schrijven. Tekst bijwerken?" met één knop die de
   bestaande herschrijfroute gebruikt.
3. **Overslaan zegt vooraf wat het kost:** "Dan komt het onderdeel *Wat kost het* niet op de
   pagina." Er is **geen** knop "alles overslaan": het besluit is dat de klant elke vraag gezien
   heeft.
4. **De onderbouwing is zichtbaar tijdens het antwoorden,** niet pas daarna. Zou het overslaan van
   een vraag de pagina onder 40 procent brengen (§4.2 regel 3), dan zegt de overslaanknop dat vóór
   de klik: "Als je dit overslaat, heeft de pagina te weinig om op te schrijven. Je kiest dan
   straks tussen algemeen schrijven of de pagina laten vallen." Zo is die keuze nooit een
   verrassing achteraf.
5. **Een vraag die voor meer pagina's geldt** staat één keer in "Jouw beurt" met "geldt voor 2
   pagina's", en op elk van die paginaschermen. Eén antwoord telt voor beide.
6. **De tekst die de klant ziet noemt altijd de volgende stap en wanneer,** nooit alleen de huidige
   stand (bijvoorbeeld "Aan zet: jij. Nog 2 vragen, daarna schrijven we hem vanaf 14 oktober").

## 4. Ontwerp in detail

### 4.1 Welke vragen tellen voor "alle vragen"

Een vraag telt mee voor pagina P als hij `open` is en **aan P gekoppeld** is
(`fact_requests.content_piece_ids` bevat het id van P). Dat zijn de vragen uit de briefing van P,
inclusief merkbrede vragen die de briefing aan P koppelde.

Niet mee: open vragen van het cluster die aan geen pagina hangen (bijvoorbeeld de zes
`aanvulling`-vragen van "APK Den Bosch" uit een meting). Die gaan over de meting, niet over deze
tekst, en zouden anders elke pagina van het cluster blokkeren.

⚠️ `countBlockingQuestions()` in `lib/open-questions.ts` telt nu wél alle open clustervragen mee
voor de eindpoort. Trek dat recht: **één functie** `openVragenVanPagina(db, pieceId)` die zowel de
schrijfpoort (nieuw) als de eindpoort gebruikt. Leg in `docs/logbook.md` vast dat de eindpoort
daarmee versmalt, met de reden hierboven. Blijf voorzichtig: controleer eerst in de database
hoeveel open vragen `analysis_id` hebben zonder `content_piece_ids` en of daar vragen tussen zitten
die wél een pagina dragen. Als die er zijn, laat de briefing ze voortaan koppelen in plaats van de
poort breed te houden.

### 4.2 De schrijfpoort (nieuw, puur)

Nieuwe pure module `lib/content-write-gate.ts` (geen `server-only`, conventie 2):

```ts
export function schrijfpoort(input: {
  openVragen: number;          // uit openVragenVanPagina
  briefingKlaar: boolean;      // is de vragenstap voor deze pagina gedraaid
  inputOordeel: InputStand | null; // uit lib/content-input-gate.ts, na snoeien
  writeMode: WriteMode;
}): { mag: boolean; reden: "vragen_open" | "briefing_loopt" | "te_weinig_onderbouwd" | null; melding: string }
```

Regels:
1. Briefing nog niet klaar: niet schrijven.
2. `openVragen > 0`: niet schrijven. Melding noemt het aantal en verwijst naar de vragen.
3. Alles beantwoord of overgeslagen, maar de inputpoort zegt `tegenhouden` (onder 40 procent, na
   het snoeien van overgeslagen secties): niet schrijven, stand blijft 3 met de keuze uit de
   bestaande inputpoort: "schrijf hem algemeen" (`write_mode = 'algemeen'`) of "laat hem vallen".
   Dit is een keuze, geen vraag, en hij staat op dezelfde plek als de vragen.
4. Anders: schrijven.

5. Alles gedaan maar de datum ligt verder dan 10 dagen weg: wachten tot de schrijfdatum (§3.1).

Tests in `scripts/test-unit.ts` voor elke regel, ook: nul vragen en `null`-dekking schrijft wel
(conventie 3), overgeslagen telt als beantwoord.

### 4.3 De motor: van laatste antwoord naar schrijven

**Voorbereiden starten (stand 1 naar 2), zie §3.1.** Het vrijgeven van een maand
(`app/api/profiles/[id]/plan/months/[monthId]/route.ts`) start meteen de voorbereiding van alle
pagina's van die maand. Hergebruik route 1: `planContentBriefing()`, één batch per cluster (de
briefing is per analyse), zodat overlappende vragen samengevoegd worden zoals nu. Geef
`plannedPageId` mee in de payload tot en met `content_brief`, zodat de briefing de plan-pagina kan
koppelen. Status plan-pagina: `voorbereiden`. Een pagina die later in een al vrijgegeven maand
komt (slepen, "zo snel mogelijk" uit een cluster) start zijn voorbereiding op dat moment. De
dagelijkse cron vangt pagina's op die hier doorheen glipten.

**Schrijven op tijd (stand 3 naar 4).** De poort uit §4.2 krijgt een vijfde regel: alles gedaan,
maar datum verder dan 10 dagen weg, dan niet nu schrijven en status `vragen_klaar` (label "Alle
vragen gedaan, we schrijven hem vanaf <datum>"). De dagelijkse cron pakt die pagina's op zodra ze
binnen 10 dagen vallen.

**Na de briefing (stand 2 naar 3 of 4).** Aan het eind van `content_brief` per pagina de
schrijfpoort draaien. Nul open vragen en poort open: meteen door naar schrijven. Anders status
`vragen`.

**Na elk antwoord of overgeslagen vraag (stand 3 naar 4).** Elke route die een `fact_request`
op `beantwoord` of `overgeslagen` zet (`lib/facts.ts`, de briefingroute, de route achter
"Openstaande vragen"; grep op `.update(` met `fact_requests`) roept daarna
`probeerTeSchrijven(admin, pieceIds)` aan voor alle pagina's in `content_piece_ids` van die vraag.
Die functie:
1. rekent de schrijfpoort uit;
2. is hij open, dan `planContentDraft()` (dedupe-sleutel met aantal antwoorden bestaat al, dus
   dubbel klikken plant niets dubbel) en status `schrijven`;
3. is hij dicht, dan niets, en het scherm toont waarom.

Zet dezelfde controle ook in de cron als vangnet (conventie 1): elke pagina op `vragen` met nul
open vragen wordt alsnog opgepakt. Zo blijft een pagina nooit hangen omdat een route de aanroep
vergat.

**Route 2 zonder vragen verdwijnt.** `startPaginaSchrijven()` mag niet meer rechtstreeks
`content_draft` laten volgen. De knop "nu laten schrijven" voor de beheerder (drie puntjes in het
plan) start voortaan de voorbereiding; het besluit in §1 geldt ook voor de beheerder. Controleer
met `test-chain.ts` dat geen enkele route `content_draft` kan plannen voor een pagina met open
vragen: maak een scenario dat elke ingang probeert.

**Route 1 wordt een ingang van het plan.** "Schrijf deze pagina" in een cluster wordt "Zet in het
plan", met de keuze "zo snel mogelijk" (in de lopende maand, voorbereiding start direct, ook als
die maand al vrijgegeven is) of een maand kiezen. Bestaande pagina's in `briefing` zonder
plan-pagina: zie §5.

### 4.4 Als niemand antwoordt

Geen automatische uitweg (besluit §1), wel drie zichtbare dingen:
1. **Herinnering.** Hergebruik `app/api/cron/reminders` (bestaat). Eén mail per maand bij het
   klaarstaan van de vragen, en één 3 dagen voor de streefdatum als er nog iets open staat, alleen als `EMAILS_ENABLED`. Zonder mail: melding op "Hoe sta je ervoor".
2. **Loopt achter.** Pure functie `loptAchter(page, nu)`: de streefdatum uit §3.1 (12 dagen voor
   de datum) is voorbij en de pagina staat nog op 3. Chip in het plan en de takenlijst.
3. **Nieuwe datum voorstellen.** Wordt de datum gepasseerd, dan stelt het plan de eerste vrije dag
   voor die haalbaar is (hergebruik de spreiding in `lib/plan-schedule.ts`). De klant bevestigt;
   de app verzet nooit zelf een datum (die is een belofte aan de klant).

### 4.5 Eén status

Migratie (additief, idempotent), volgende vrije nummer (op 23 september 2026 was `0108` de
laatste; controleer):
```sql
alter type <enum van planned_pages.status> add value if not exists 'voorbereiden';
alter type <enum van planned_pages.status> add value if not exists 'vragen';
alter type <enum van planned_pages.status> add value if not exists 'vragen_klaar';
```
(zoek de enumnaam op in `0049_contentplan.sql`; is het een check-constraint, breid die dan uit met
een nieuwe constraint, nooit `drop`). Kolom `planned_pages.vragen_sinds timestamptz null` voor de
herinneringen en "loopt achter".

Pure module `lib/pagina-stand.ts` die uit `planned_pages` plus `content_pieces` (plus aantal open
vragen) **één** stand uit §3 afleidt, met label, wie aan zet is, toon en actie. Dat is de enige
vertaling naar klanttaal. `lib/content-status.ts` en `PLAN_STATUS_META` gaan erin op of lezen
eruit. Uitgangspunten:
- `content_pieces.status = 'briefing'` met nul open vragen is nooit meer "Wacht op jouw input".
- `ready` met `needs_review = true` is "Lees en keur goed", met `false` "Zet hem live".
- `published` zonder golf 2 is stand 7, met oordeel stand 8.

**Synchronisatie in de routes, niet in het scherm:**
- Goedkeuren (`.../approve`) zet ook de plan-pagina op `goedgekeurd`; de plan-actie `goedkeuren`
  zet ook `needs_review = false` (met dezelfde eindpoort).
- **Eén live-handeling:** plan-actie `geplaatst` en `alles_geplaatst` roepen `markPublished()` aan
  als er een `content_piece_id` is, zodat controle en nameting altijd starten; `markPublished()`
  zet de gekoppelde plan-pagina op `geplaatst`. Zonder `content_piece_id` (handmatig geplaatste
  pagina zonder tekst uit ORBIT ENGINE) blijft het alleen de plan-status, en het scherm zegt dat er
  dan geen effectmeting is.
- `linkPlannedPage()` blijft, en krijgt de nieuwe standen.

Tests: elke combinatie van de twee tabellen levert precies één stand (tabel-test in
`test-unit.ts`), en een scenario in `test-chain.ts` dat goedkeuren en plaatsen vanaf beide kanten
dezelfde eindtoestand geeft, inclusief ingeplande golven.

### 4.6 Interface

**Drie schermen, drie vragen, geen overlap.** Dit is de kern van de interface; elke keuze hieronder
volgt eruit.

| Scherm | Beantwoordt | Toont |
|---|---|---|
| Contentplan | *Wanneer* gebeurt er wat? | De agenda. Per maand één knop "Maand vrijgeven", per pagina de stand en de datum. Geen vragen, geen tekst |
| Jouw beurt | *Wat moet ik doen?* | Alleen wat op de klant wacht, vroegste streefdatum eerst. Leeg is een goed teken: "Niets te doen. De volgende vragen komen als je november vrijgeeft." |
| Bibliotheek | *Wat is er?* | Alle pagina's vanaf stand 2, met stand, en per pagina het paginascherm |

"Hoe sta je ervoor" krijgt bovenaan één regel uit "Jouw beurt": "Er wachten 7 vragen op je, beantwoord
ze vóór 12 oktober" met één knop. Staat er niets, dan staat de regel er niet.

**Eén paginascherm, onder de bibliotheek.** Nieuwe route `/merk/[id]/strategie/bibliotheek/[paginaId]`
waarbij `paginaId` het id van de **plan-pagina** is (die bestaat vanaf stand 1; de tekst pas vanaf
stand 4). Het oude adres `/analyses/[id]/bibliotheek/[pieceId]` verwijst door
(`lib/redirects.ts`). Hergebruik de componenten uit `app/(app)/analyses/[id]/bibliotheek/[pieceId]/`
(verhuizen, niet kopiëren). In `lib/nav.ts` licht "Bibliotheek" op. De terugknop gaat naar waar je
vandaan kwam (`?van=plan|bibliotheek|taken`, `?van=plan` bestaat al).

Opbouw van dat scherm, per stand:
- **Bovenaan altijd een standbalk met vijf stappen, niet acht:** Vragen, Schrijven, Goedkeuren,
  Live, Effect. Stand 1 en 2 vallen onder "Vragen" (met "nog niet vrijgegeven" of "wordt
  voorbereid" als onderregel), 7 en 8 onder "Effect". Acht stappen op een telefoonscherm is een
  rij bolletjes die niemand leest. Onder de balk één zin met de volgende stap en wanneer (§3.2 regel
  6), en precies één hoofdknop, die van de klant als hij aan zet is. Zie `docs/designsystem.md` voor
  chips en stappen, `docs/schrijfstijl.md` voor de zinnen.
- Stand 1 en 2: wat er gepland is, waarom deze pagina (de `why` uit de aanbeveling), de datum.
- Stand 3: **de vragen van deze pagina, in het scherm zelf.** Per vraag het antwoordveld
  (`components/antwoordveld.tsx`) en een knop "Overslaan" met de uitleg wat dat betekent ("dit
  onderdeel komt dan niet op de pagina"). Een teller "3 van 5 gedaan". Bij de laatste: "Alles
  gedaan. We beginnen nu met schrijven." Geen losse verzendknop: elk antwoord slaat meteen op,
  zoals op "Openstaande vragen". Hier landt ook de keuze uit §4.2 regel 3. Bij stand 4 met
  `vragen_klaar`: "Alle vragen gedaan. We schrijven hem vanaf 14 oktober."
- Na het laatste antwoord in "Jouw beurt" verdwijnt de pagina uit die lijst met een korte bevestiging
  ("Alles voor *Wat kost wagenparkbeheer* is binnen"), zodat de klant ziet dat zijn werk iets deed.
- Stand 4: "Wordt geschreven", met verwachte duur. Pollen zoals nu.
- Stand 5: de tekst (bestaand canvas en werkblad) met één hoofdknop "Keur goed" en een tweede knop
  "Vraag een aanpassing" (bestaande `revise-box.tsx`, terug naar stand 4). Kwaliteitsbevindingen
  staan erbij als opmerkingen, niet als vragen (§3.2 regel 1).
- Stand 6: kopieerblokken en het adresveld, één hoofdknop "Ik heb hem geplaatst". Onomkeerbaar
  vooraf benoemen (kwaliteitslat K4).
- Stand 7 en 8: live-adres, controle-uitkomst, nameting.

**Eén takenlijst.** "Openstaande vragen" (`/merk/[id]/strategie/vragen`) wordt "Jouw beurt":
- Groepen in deze volgorde: vragen per pagina (met de datum van die pagina, vroegste eerst), teksten
  om goed te keuren, pagina's om live te zetten, en daaronder de losse merk- en clustervragen die
  aan geen pagina hangen.
- Elke regel linkt naar het paginascherm; vragen zijn ook hier direct te beantwoorden of over te
  slaan.
- Het menu houdt vier bestemmingen onder Strategie (`lib/nav.ts`, bewaakt in `test-unit.ts`); dit
  is een hernoeming, geen vijfde. Oude adres verwijst door.
- `lib/wachtrij.ts` en "Hoe sta je ervoor" tellen hieruit: "3 dingen wachten op jou, de eerste
  vóór vrijdag."

**Contentplan.** Elke rij toont de stand uit §4.5 en linkt naar het paginascherm. "Zoek hem in de
bibliotheek" verdwijnt. Bij het vrijgeven van een maand:
- pagina's zonder onderwerp worden niet vrijgegeven; de dialoog vraagt eerst een cluster te
  koppelen (en stelt het passende cluster voor als de titel erop lijkt);
- vallen er pagina's binnen de voorbereidingstermijn, dan zegt de dialoog "voor 3 pagina's krijg
  je vandaag vragen"; liggen er data te dichtbij om nog te halen, dan stelt hij nieuwe data voor.

**Cluster.** "Schrijf deze pagina" en "genereer alles" worden "Zet in het plan"
(`generate-button.tsx`, `generate-all-button.tsx`). Het briefingscherm `/analyses/[id]/briefing`
verwijst door naar "Jouw beurt", gefilterd op dat cluster.

**Bibliotheek.** Toont alle pagina's vanaf stand 2 met de ene stand; filter op stand in plaats
van op de oude status.

### 4.6a Vormgeving: van rommelig naar af

> **Bijgesteld op de avond van 23 september 2026** (`docs/logbook.md`): de bibliotheek toont elke
> pagina vanaf het vrijgeven van zijn maand in drie groepen (wacht op jou, wordt binnenkort
> geschreven, staat live), met per rij één zin over waarop hij wacht. Het paginascherm bestaat alleen
> voor de standen waar de klant iets doet of leest.

Dit onderdeel is net zo zwaar als de motor. De eigenaar beoordeelde op 23 september 2026 drie
schermen als rommelig, onduidelijk en ondermaats. Alles hieronder blijft binnen het bestaande
systeem (`docs/designsystem.md`: OKX-tokens, de drie opmaakstanden van §8, de negen regels van
§11, de primitieven van §9). Er komt geen nieuw visueel idioom, wel strengere toepassing ervan.
Het scherm bouwt voort op `docs/tasks/herontwerp-contentpagina.md` (drie zones, gebouwd op
22 september); waar dit document daarvan afwijkt, staat de reden erbij.

#### Wat er nu mis is (screenshots van 23 september 2026, Van den Udenhout)

**Het paginascherm met een geschreven tekst**
1. Het canvas toont ruwe markdown: `##` voor koppen, een tabel als `| --- |`, links als
   `[tekst](url)`. De "Schrijven"-stand staat standaard aan. Dat oogt als een halffabricaat.
2. Drie namen voor één pagina: de actiebalk toont de opdracht ("Maak één duidelijke pagina over de
   all-in maandprijs..."), de bibliotheek de zoektitel ("Bedrijfswagen leasen vanaf € 359 p/m | Van
   den Udenhout"), het canvas weer de opdracht, afgekapt ("...van een bec").
3. Tegenspraak: de chip zegt "Concept", de bibliotheek "Klaar om te publiceren", de rail "Nog niet
   naar je site" met 5 punten die publicatie tegenhouden, en toch staat de groene hoofdknop "Zet
   deze pagina live" klaar. De bibliotheek zegt 100/100, de rail 74/100.
4. De contextrail is een muur van kleine tekst: vijf tabs die over twee regels breken, elke
   bevinding met dezelfde zin "Deze zin zegt iets over je bedrijf zonder bron" plus twee knoppen.
5. Een uitlegregel in vaktaal bovenaan ("gaat buiten de schrijfpijplijn om").
6. Onderaan drie losse knoppen zonder samenhang: een grijze "Opslaan", "Notitie voor de schrijver
   aanpassen", "Iets aanpassen aan deze tekst".
7. In het menu licht "Clusters" op; bovenin staat "6 openstaande vragen" die niet over deze pagina
   gaan.

**Het paginascherm dat op input wacht**
1. Een leeg wit vlak van 650 pixels hoog met alleen een afgekapte titel.
2. "Er staan geen opmerkingen meer open" met een groen vinkje: valse geruststelling, er is nog niets.
3. De hoofdknop "Zet deze pagina live" op een pagina zonder tekst.
4. Nergens staat wat er aan de hand is, wie aan zet is of wat de volgende stap is.

**De bibliotheek**
1. De kerncijfers spreken de lijst tegen: "Klaar voor vrijgave 0" boven twee rijen "Klaar om te
   publiceren"; "Geschreven 3" terwijl één pagina leeg is.
2. Een zware filterkaart voor drie pagina's.
3. Titels in twee soorten (opdracht en zoektitel door elkaar), een los streepje als score.
4. Geen enkele rij zegt wat de klant nu moet doen.

#### Uitgangspunten voor alle drie

1. **Eén naam per pagina.** Vanaf stand 4 is dat de paginatitel (H1) uit de tekst. Daarvóór de
   werktitel, gemaakt uit de opdracht zonder gebiedende wijs; de opdracht zelf staat onder
   "Waarom deze pagina". De zoektitel (meta title) staat alleen in "Titel en zoekresultaat". Leg
   dit vast in één pure functie `paginaNaam()` en gebruik die overal (plan, bibliotheek, Jouw beurt,
   actiebalk, tabbladtitel).
2. **Eén stand, één kleur, één zin.** De chip komt uit `lib/pagina-stand.ts` (§4.5), overal gelijk.
   Betekenislaag van `designsystem.md` §2.5: wacht op jou = waarschuwing, ORBIT ENGINE bezig =
   informatie, live = succes, mislukt = gevaar. Altijd kleur plus tekst (regel 4).
3. **Eén cijfer per begrip, uit één bron.** Er is één kwaliteitscijfer en dat is overal hetzelfde.
   Zoek uit waar 100 en 74 vandaan komen (vermoedelijk verschillende kolommen of versies) en kies
   er één; de rest verdwijnt uit beeld.
4. **De hoofdknop is de handeling van de huidige stand, en niets anders.** Hooguit één accentknop
   per scherm (regel 8). Kan de handeling niet, dan staat de knop er niet, in plaats van dat hij
   er is en daarna een foutmelding geeft.
5. **Geen leeg vlak zonder uitleg.** Elke stand zonder tekst krijgt een eigen, gevulde weergave
   (§8 hieronder), nooit een leeg canvas.
6. **Geen vaktaal op het scherm.** Grep op "pijplijn", "briefing", "contract", "poort" in de
   schermcomponenten; alles eruit.

#### Het paginascherm (`/merk/[id]/strategie/bibliotheek/[paginaId]`)

Opmaak: stand `werken`, met de drie zones uit het herontwerp (containerquery `.content-zones`,
drempel 1064px). Bovenaan, vóór de zones, over de volle breedte:

```
‹ Bibliotheek                                                      [⋯]
Wat kost wagenparkbeheer bij Van den Udenhout                 (H1, 1 regel, afkappen met … en title-attribuut)
Landingspagina · Wagenparkbeheer voor mkb · gepland 28 september

 ● Vragen ─── ○ Schrijven ─── ○ Goedkeuren ─── ○ Live ─── ○ Effect      (standbalk, §4.6)

┌ Aan zet: jij ─────────────────────────────────────────────────────────┐
│ Nog 2 van de 5 vragen. Daarna schrijven we hem, vanaf 18 september.   │
│                                                   [Naar de vragen ▸]  │  (één accentknop)
└───────────────────────────────────────────────────────────────────────┘
```

De "Aan zet"-kaart is de enige plek met de hoofdknop; de actiebalk bovenin draagt alleen nog terug,
titel en het menu met drie puntjes (versies, opnieuw keuren, archiveren). Daarmee verdwijnt de
tegenspraak uit punt 3: de knop volgt de stand. De kaart gebruikt de stang links (`designsystem.md`
§5.5) in de kleur van de stand.

Daaronder per stand:

| Stand | Hoofdvlak (links, 720px) | Rail (rechts, 320px) |
|---|---|---|
| 1 Gepland | Kaart "Wat deze pagina gaat doen": waarom, voor wie, welke vragen van AI-assistenten hij moet winnen (de doelvragen), datum. | Leeg laten, rail verbergen |
| 2 Wordt voorbereid | Dezelfde kaart met een rustige laadregel "We zoeken uit wat erop moet. Dit duurt een paar minuten." Skeletregels in de vorm van de vragenlijst, geen draaiend icoon | Verborgen |
| 3 Jouw antwoorden nodig | **De vragenlijst**: per vraag een kaart met de vraag (kop), één zin waarom hij ertoe doet ("Nodig voor het onderdeel *Wat kost het*"), het antwoordveld, en rechtsonder een tekstknop "Overslaan". Beantwoord: de kaart klapt in tot één regel met vinkje en het antwoord, met "Wijzig". Voortgang als balk met "3 van 5" boven de lijst | "Wat er op de pagina komt": de inhoudsopgave als lijst, onderdelen die van een open vraag afhangen gemarkeerd. Zo ziet de klant wat een overgeslagen vraag kost |
| 4 Wordt geschreven | Inhoudsopgave als lijst met "Wordt geschreven, meestal binnen 15 minuten" of bij `vragen_klaar` "We schrijven hem vanaf 14 oktober". Geen leeg canvas | Samenvatting van de antwoorden die meegaan |
| 5 Lees en keur goed | **De tekst opgemaakt**, als leesweergave (renderMarkdown, dezelfde als de export). Bewerken is een tweede stand achter de knop "Bewerken" in de werkbalk van het canvas, niet de standaard | Kwaliteit, zie hieronder |
| 6 Zet hem live | De tekst opgemaakt, daarboven een kaart "Zo zet je hem live": 1 kopieer de tekst (knoppen per formaat), 2 plak op je site, 3 vul het adres in (domein vast, alleen het pad invullen) | Kopieerbaar: paginatitel, meta-omschrijving, voorgesteld pad, FAQ, schema |
| 7 en 8 | Live-adres, uitkomst van de controle, nameting (golf 1 en 2) met de uitleg uit `lib/impact-uitleg.ts` | Versies |

**Kwaliteit in de rail, rustig gemaakt:**
- Bovenaan één regel: cijfer plus oordeel ("74 van 100, klaar na 5 kleine punten"), niet drie
  losse getallen.
- Bevindingen **gegroepeerd per soort**, met de telling in de kop ("5 zinnen zonder bron"), niet vijf
  keer dezelfde zin. Per groep één knop "Laat ORBIT ENGINE ze oplossen". Klik op een bevinding
  scrollt naar de zin in de tekst en markeert hem (ankers bestaan al, herontwerp §5.3).
- Zolang er punten zijn die publicatie tegenhouden, heet de hoofdknop in de Aan zet-kaart "Los de 5
  punten op" en niet "Keur goed". Pas als ze weg zijn: "Keur goed".
- De tabs worden een verticale accordeon met vier koppen (Kwaliteit, Waarop dit rust, Waarom deze
  pagina, Versies), zoals het herontwerp al tekende in §3.1. Geen tabs die over twee regels breken.

**De knoppen onderaan** verdwijnen als losse rij. "Opslaan" komt alleen in de werkbalk van het
canvas als er iets gewijzigd is. "Iets aanpassen aan deze tekst" wordt de tweede knop in de Aan
zet-kaart ("Vraag een aanpassing"). "Notitie voor de schrijver" gaat in het menu met drie puntjes.

**Tekstregels op dit scherm:** de uitlegregel in vaktaal verdwijnt; bij bewerken verschijnt één
zin: "Wat je zelf aanpast, controleert ORBIT ENGINE niet opnieuw. Wil je dat wel, kies dan
Opnieuw keuren." Het menu en de bovenbalk tonen alleen vragen van deze pagina.

#### De bibliotheek

- **Kerncijfers die de lijst volgen:** drie tegels uit dezelfde `pagina-stand`: "Wacht op jou",
  "Wordt gemaakt", "Staat live". Klik op een tegel filtert de lijst.
- **Filters licht:** zoekveld en de standfilter als chips in één regel boven de lijst; type en
  cluster in een uitklapper "Meer filters". De filterkaart verdwijnt. Onder 10 pagina's alleen het
  zoekveld.
- **Rij:** links de paginanaam (§ uitgangspunt 1) met daaronder type, cluster, datum; rechts de
  standchip en, als de klant aan zet is, een tekstknop met de handeling ("Beantwoord 2 vragen",
  "Keur goed", "Zet live"). Kwaliteitscijfer alleen vanaf stand 5, nooit een streepje.
- **Volgorde:** eerst wat op de klant wacht (vroegste streefdatum), dan wat ORBIT ENGINE doet, dan
  wat live staat.
- **Lege staat:** "Nog geen pagina's. Ze verschijnen hier zodra je een maand in het contentplan
  vrijgeeft." met een knop naar het contentplan.

#### Jouw beurt

Stand `lezen` (720px): het is een lijst om af te werken, geen dashboard. Kop met één zin ("7 dingen
wachten op je. De eerste vóór 12 oktober."). Groepen als secties met een kleine kop, elke regel een
rij met paginanaam, wat er gevraagd wordt en de streefdatum. Vragen zijn in de lijst zelf te
beantwoorden met hetzelfde kaartje als op het paginascherm (één component, `components/vraagkaart.tsx`,
op basis van `components/antwoordveld.tsx`). Lege staat met het vinkje: "Niets te doen. De volgende
vragen komen als je november vrijgeeft."

#### Het contentplan

Per paginarij: naam, datum, standchip, en bij de klant aan zet dezelfde tekstknop als in de
bibliotheek. De hele rij linkt naar het paginascherm. Per maand in de kop: "5 pagina's · 2 wachten
op jou" en de knop "Maand vrijgeven" alleen bij een maand die nog niet vrij is. De
vrijgeefdialoog uit §3.1 en §4.6 gebruikt de dialoogprimitief uit `designsystem.md` §9.

#### Hoe dit gecontroleerd wordt

- Voor en na: screenshots met Playwright (Chromium staat klaar) van elk paginascherm in elke stand,
  plus bibliotheek, Jouw beurt en contentplan, op 1440px en op 390px breed, licht en donker. Bewaar
  ze in de scratchpad en toon ze aan de eigenaar vóór de merge.
- `designsystem.md` §12 (controle vóór een commit) voor elk gewijzigd bestand: geen hexwaarden,
  geen tweede accentknop, iconen uit `lib/icons.ts`.
- Test in `test-unit.ts`: `paginaNaam()` en per stand precies één hoofdhandeling.

### 4.7 Tekst

Alle nieuwe teksten volgen `docs/schrijfstijl.md`, zonder gedachtestreepjes en zonder "en/of"
(grep-check uit §10 daar). Eén woord per begrip, overal: **voorbereiden**, **vragen**,
**schrijven**, **goedkeuren**, **live zetten**. "Briefing" komt niet op het scherm.

## 5. Bestaande data

Eén eenmalige, additieve migratie of script (eerst tellen en tonen, dan uitvoeren; niets wissen):
1. `content_pieces` op `briefing` zonder plan-pagina: plan-pagina aanmaken in de lopende maand
   (bron `aanbeveling`, `content_piece_id` gezet), of koppelen aan een bestaande plan-pagina met
   dezelfde titel en hetzelfde onderwerp (geval Van den Udenhout, `9332a0fb`).
2. `ready`, `draft` en `published` zonder plan-pagina: zelfde koppeling, status passend.
3. Na de koppeling voor elke pagina op stand 3 `probeerTeSchrijven()` draaien; bij Van den
   Udenhout betekent dat dat `9332a0fb` gaat schrijven (alles beantwoord). **Eerst met de eigenaar
   afstemmen**, want dat kost geld.

Kijk vóór fase 1 of de dagelijkse cron sinds 23 september al pagina's van Van den Udenhout zonder
vragen heeft geschreven (`planned_pages.status`, `jobs` van type `content_draft`); meld het
eigenaar en neem ze mee in deze stap.

## 6. Volgorde van uitvoeren

| Fase | Wat | Waarom eerst |
|---|---|---|
| A | Eén live-handeling (§4.5, laatste blok, alleen het deel `markPublished`) | Klein, en zonder dit meet de eerste echte publicatie niets |
| B | Schrijfpoort en `openVragenVanPagina` (§4.1, §4.2), puur met tests | Fundament voor alles erna |
| C | Migratie standen en kolom, `lib/pagina-stand.ts`, synchronisatie goedkeuren (§4.5) | Eén waarheid voordat de schermen erop bouwen |
| D | Motor (§4.3): cron start voorbereiding, trigger na antwoord, vangnet, route 2 zonder vragen dicht | Hier gaat het besluit van §1 echt gelden |
| E | Paginascherm onder bibliotheek: standbalk, Aan zet-kaart, weergave per stand, rustige kwaliteitsrail (§4.6, §4.6a) | De klant ziet één plek per pagina, en die oogt af |
| E2 | Bibliotheek en Jouw beurt in de nieuwe vormgeving (§4.6a) | Dezelfde taal en dezelfde standen als het paginascherm |
| F | "Jouw beurt", contentplan-rijen, dialoog maand vrijgeven, clusterknoppen | Alle ingangen wijzen naar het paginascherm |
| G | Herinneringen, loopt achter, nieuwe datum (§4.4) | Pas zinvol als D draait |
| H | Bestaande data (§5), na akkoord eigenaar | Laatste, zodat alles wat gekoppeld wordt meteen goed werkt |

Na fase D en na fase H: controleren tegen productie (conventie 10) met het profiel van Van den
Udenhout. Leg de uitkomst vast.

## 7. Documentatie in dezelfde commits

- `docs/logbook.md`: alinea met datum voor het besluit (§1), de versmalde eindpoort (§4.1), de
  termijn van 21 dagen, de ene live-handeling.
- `docs/processtappen-nieuwe-pagina.md`: fase 7 tot en met 14 herschrijven naar de lijn van §3 en
  de peildatum bijwerken.
- `docs/tasks/customer-journey-cluster-tot-schrijven.md`: punt 5 en 6 vervallen door dit werk;
  werk dat document bij of verwijder het als niets meer openstaat (grep eerst op de naam).
- `docs/tasks/ontwikkelplan-visie.md`: "het contentplan als derde ingang" is hiermee gedaan.
- `supabase/README.md`: de nieuwe migratie.
- `docs/merkstrategie.md` §30: controleren of er een belofte over "10 dagen vooraf" of het
  schrijfmoment staat die nu verandert.
- Dit document: status per fase bijhouden, en verwijderen zodra alles af en geverifieerd is.

## 8. Klaar wanneer

- Geen enkele ingang kan schrijven zolang een aan de pagina gekoppelde vraag open staat
  (bewezen in `test-chain.ts`).
- Het laatste antwoord of de laatste overgeslagen vraag start het schrijven zonder extra klik.
- Eén pagina heeft overal dezelfde stand; goedkeuren en live zetten werken vanaf plan en
  bibliotheek gelijk, en live zetten plant altijd controle en nameting.
- Elke klik op een pagina, waar dan ook, komt op hetzelfde scherm, en "Bibliotheek" licht op.
- Geen scherm toont ruwe markdown als standaard, een leeg vlak zonder uitleg, een hoofdknop die
  niet kan, of twee verschillende namen of cijfers voor dezelfde pagina. Gecontroleerd met de
  screenshots uit §4.6a en goedgekeurd door de eigenaar.
- Bij Van den Udenhout is dit nagelopen met echte data en vastgelegd in het logboek.
