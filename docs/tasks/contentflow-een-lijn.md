# Contentflow: één pagina, één lijn, eerst alle vragen

> **Status: nog niet begonnen.** Opgesteld op 23 september 2026 na een analyse van de flow van
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
| 1 | Gepland | ORBIT ENGINE | In het plan met een datum | Maand vrijgegeven en datum binnen de voorbereidingstermijn |
| 2 | Wordt voorbereid | ORBIT ENGINE | Onderzoek, inhoudsopgave (contract), feitenkaart, vragen | Vanzelf als de vragen er zijn |
| 3 | Jouw antwoorden nodig | Jij | Vragen van deze pagina beantwoorden of overslaan | **Pas als élke vraag beantwoord of overgeslagen is.** Nul vragen: meteen door naar 4 |
| 4 | Wordt geschreven | ORBIT ENGINE | Schrijven, keuren, herstellen | Vanzelf. Geen extra knop |
| 5 | Lees en keur goed | Jij | Tekst lezen, eventueel bewerken, vrijgeven | Klik op "Keur goed" |
| 6 | Zet hem live | Jij | Op de eigen site plaatsen, adres invullen | Adres ingevuld |
| 7 | Staat live, effect wordt gemeten | ORBIT ENGINE | Publicatiecontrole, nameting na 14 en 28 dagen | Vanzelf |
| 8 | Effect bekend | Niemand | Oordeel staat bij de pagina | Eindstand |

Plus twee zijstanden: **Loopt achter** (datum gepasseerd terwijl stand 3 openstaat, zie §4.4) en
**Mislukt** (bestaat al als `mislukt`).

Waarom de klant na stand 3 geen knop meer hoeft in te drukken: het laatste antwoord of de laatste
overgeslagen vraag ís de handeling. Een extra knop "Schrijf nu" is precies de stille stilstand die
pagina `9332a0fb` liet zien.

**De voorbereidingstermijn wordt 21 dagen** in plaats van 10: tijd voor de klant om te antwoorden
plus ongeveer een dag schrijven en keuren plus tijd om te lezen. Maak het een constante in
`lib/plan-status.ts` met commentaar, en laat de schrijfvoorsprong als begrip verdwijnen (schrijven
start niet meer op een datum maar op het laatste antwoord).

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

Tests in `scripts/test-unit.ts` voor elke regel, ook: nul vragen en `null`-dekking schrijft wel
(conventie 3), overgeslagen telt als beantwoord.

### 4.3 De motor: van laatste antwoord naar schrijven

**Voorbereiden starten (stand 1 naar 2).** De dagelijkse cron (`app/api/cron/plan/route.ts`) kiest
pagina's van goedgekeurde maanden met datum binnen 21 dagen en status `gepland`, en start de
**voorbereiding**, niet het schrijven. Hergebruik route 1: `planContentBriefing()` met de pagina's
van hetzelfde cluster die op dezelfde dag starten als één batch (dan worden overlappende vragen
samengevoegd, zoals nu). Geef `plannedPageId` mee in de payload tot en met `content_brief`, zodat de
briefing de plan-pagina kan koppelen. Status plan-pagina: `voorbereiden`.

Ook direct na het vrijgeven van een maand (`app/api/profiles/[id]/plan/months/[monthId]/route.ts`)
dezelfde functie aanroepen voor pagina's die al binnen de termijn vallen. Anders wacht een maand
die om 10.29 uur vrijgegeven wordt tot de volgende ochtend.

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
1. **Herinnering.** Hergebruik `app/api/cron/reminders` (bestaat). Mail na 3 dagen en na 7 dagen
   op stand 3, alleen als `EMAILS_ENABLED`. Zonder mail: melding op "Hoe sta je ervoor".
2. **Loopt achter.** Pure functie `loptAchter(page, nu)`: datum minus de schrijf- en leestijd (3
   dagen) is voorbij en de pagina staat nog op 3. Chip in het plan en de takenlijst.
3. **Nieuwe datum voorstellen.** Wordt de datum gepasseerd, dan stelt het plan de eerste vrije dag
   voor die haalbaar is (hergebruik de spreiding in `lib/plan-schedule.ts`). De klant bevestigt;
   de app verzet nooit zelf een datum (die is een belofte aan de klant).

### 4.5 Eén status

Migratie (additief, idempotent), volgende vrije nummer (op 23 september 2026 was `0108` de
laatste; controleer):
```sql
alter type <enum van planned_pages.status> add value if not exists 'voorbereiden';
alter type <enum van planned_pages.status> add value if not exists 'vragen';
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

**Eén paginascherm, onder de bibliotheek.** Nieuwe route `/merk/[id]/strategie/bibliotheek/[paginaId]`
waarbij `paginaId` het id van de **plan-pagina** is (die bestaat vanaf stand 1; de tekst pas vanaf
stand 4). Het oude adres `/analyses/[id]/bibliotheek/[pieceId]` verwijst door
(`lib/redirects.ts`). Hergebruik de componenten uit `app/(app)/analyses/[id]/bibliotheek/[pieceId]/`
(verhuizen, niet kopiëren). In `lib/nav.ts` licht "Bibliotheek" op. De terugknop gaat naar waar je
vandaan kwam (`?van=plan|bibliotheek|taken`, `?van=plan` bestaat al).

Opbouw van dat scherm, per stand:
- **Bovenaan altijd een standbalk**: de acht standen als stappen, de huidige gemarkeerd, met één
  zin "Aan zet: jij. Beantwoord of sla de 4 vragen over, daarna schrijven we hem." Zie
  `docs/designsystem.md` voor chips en stappen, `docs/schrijfstijl.md` voor de zinnen.
- Stand 1 en 2: wat er gepland is, waarom deze pagina (de `why` uit de aanbeveling), de datum.
- Stand 3: **de vragen van deze pagina, in het scherm zelf.** Per vraag het antwoordveld
  (`components/antwoordveld.tsx`) en een knop "Overslaan" met de uitleg wat dat betekent ("dit
  onderdeel komt dan niet op de pagina"). Een teller "3 van 5 gedaan". Bij de laatste: "Alles
  gedaan. We beginnen nu met schrijven." Geen losse verzendknop: elk antwoord slaat meteen op,
  zoals op "Openstaande vragen". Hier landt ook de keuze uit §4.2 regel 3.
- Stand 4: "Wordt geschreven", met verwachte duur. Pollen zoals nu.
- Stand 5: de tekst (bestaand canvas en werkblad) met één hoofdknop "Keur goed".
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
| E | Paginascherm onder bibliotheek met standbalk en vragen (§4.6) | De klant ziet één plek per pagina |
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
- Bij Van den Udenhout is dit nagelopen met echte data en vastgelegd in het logboek.
