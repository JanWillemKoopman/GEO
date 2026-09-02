# Ontwikkelplan: van de app van vandaag naar de visie

**Opgesteld:** 18 augustus 2026 · **Herzien:** 18 augustus 2026, na de eerste ronde feedback ·
**Bestemming:** [`../visie.md`](../visie.md) en [`../merkstrategie.md`](../merkstrategie.md)

Dit document beantwoordt één vraag: wat moet er gebouwd en geregeld worden voordat ORBIT ENGINE
werkelijk doet wat de visie en de merkstrategie beloven. Het is opgedeeld in **zeven werkstromen**
(wát er ontbreekt) en **tien sprints** (in welke volgorde je het bouwt). Per sprint staat er wat
Claude Code doet, wat jij buiten Claude Code om moet doen, en waaraan je ziet dat het klaar is.

**Twee dingen die dit document níet is.** Het is geen belofte dat de app dit al kan: zolang een
sprint niet is afgerond blijft `CLAUDE.md`, `architecture.md` en `ux-design.md` de stand van zaken.
En het is geen vervanging van [`roadmap.md`](./roadmap.md): daar staat het oudere, kleinere werk dat
nog open ligt. Dit document staat erboven en verwijst ernaar waar ze elkaar raken.

**Een leesbare versie zonder technische termen** staat naast dit bestand in
[`ontwikkelplan_naar_eindproduct.html`](./ontwikkelplan_naar_eindproduct.html), rechtstreeks in de
browser te openen. Dit bestand hier blijft leidend: bij een verschil tussen de twee is dit de
waarheid, en de HTML-pagina hoort bijgewerkt te worden.

---

## 0. De uitgangspunten, vastgelegd op 18 augustus 2026

Vier keuzes van de eigenaar sturen de hele volgorde hieronder. Ze staan hier bovenaan omdat elke
sprint erop leunt.

### 1. Publiceren blijft voorlopig handwerk, en dat is een testkeuze

De app wordt eerst in de praktijk beproefd met een paar echte contentplannen, met **kopiëren,
plakken, de URL invullen en de pagina als geplaatst markeren**. Van den Udenhout is de eerste:
content uit ORBIT ENGINE, met de hand in het eigen CMS geplaatst. Pas als die route bewezen is komt
er een koppeling.

**Wat dat wél verandert:** de CMS-koppeling schuift naar sprint 9, achteraan.
**Wat dat níet verandert:** het proces eromheen blijft precies hetzelfde. Content wordt geschreven,
beoordeeld door de poorten, goedgekeurd, en pas daarna geplaatst. Alleen de laatste handeling is een
mens met een muis.

⚠️ **Eén ding dat hierdoor rechtgezet wordt.** In de eerste versie van dit plan stond dat de
CMS-koppeling de effectmeting deblokkeert. Dat klopt niet: `markPublished()` plant de hermeetgolven
al in zodra iemand een URL invult, en `checkPublication()` controleert de pagina daarna. De keten
publiceren, controleren en effect meten kan dus volledig met de hand op gang komen. Wat er ontbrak
was niet de koppeling, het was één echte gepubliceerde pagina. Die komt er in sprint 1.

### 2. Echte zoekvolumes schuiven mee naar achteren

Ook een externe koppeling, ook pas nadat de app zich bewezen heeft. Sprint 8.

**Wat dat betekent voor vandaag:** de potentiescore blijft langer rusten op een modelschatting die
alleen binnen één merk vergelijkbaar is. De app zegt dat ook zo, en dat blijft zo tot sprint 8. Het
is een bewuste beperking, geen verborgen fout.

**Wat het kost als je het wel doet:** zie §6. Kort: bij deze omvang een paar dollar per maand. De
rem zit niet op de prijs maar op focus.

### 3. De app blijft draaien op alleen de OpenAI-sleutel

Dit is de hardste regel van het hele plan en hij geldt in **elke** sprint:

> **Elke externe koppeling is optioneel en stil afwezig.** Zonder de sleutel gedraagt de app zich
> exact zoals hij vandaag doet. Geen waarschuwing op het scherm, geen halve functie, geen
> foutmelding. Er is niets stuk, er is alleen iets niet ingericht.

Dat is nu al zo voor Gemini: `enginesForProfile()` (`lib/engines/registry.ts`) snijdt de wens van het
profiel met de sleutels die er werkelijk zijn, en zonder `GEMINI_API_KEY` is de uitkomst
`['openai']`. Sprint 6 zorgt dat het bij die ene handeling blijft: **sleutel erin, engine doet mee.**
Diezelfde regel geldt straks voor de zoekvolumeleverancier (sprint 8) en voor het CMS (sprint 9).

Bij elke sprint hoort daarom een test die bewijst dat de app zich zonder de sleutel identiek
gedraagt. Niet als extraatje: dit is de garantie dat je nooit vastzit aan een leverancier om je eigen
product te kunnen draaien.

### 4. Wat er ondertussen blijft staan

Twee eerdere besluiten blijven overeind: **geen white-label rapportages** (de visie vraagt er nergens
om) en **de goedkeuringspoort vóór content live gaat**. Die laatste verdwijnt in dit hele plan
nergens, ook niet in de autonomiesprint.

**Wat dit kost aan het merkverhaal, en dat hoort gezegd.** `merkstrategie.md` §17 stap 5 en §2.2
beloven publicatie via het CMS. Dat blijft tot sprint 9 onwaar. Zolang dat zo is mag die belofte niet
in een campagne, op de website of in een demo staan. §30 van dat document houdt de lijst bij; punt 1
gaat er als laatste af in plaats van als eerste.

---

## 1. Waar we vandaag staan, nagerekend

Alles in deze tabel is op 18 augustus 2026 tegen de code op `main` gecontroleerd, niet uit
documentatie overgenomen.

| | |
|---|---|
| Tests | 1505 unittests en 167 ketentests, alle groen |
| Migraties | `0001` t/m `0059` (`0033` gereserveerd, nooit gedraaid) |
| Omvang | 413 TypeScript-bestanden, ~73.700 regels |
| Taaksoorten in de wachtrij | 24 |
| Onboarding | 8 taken, ~7,5 minuut, ~$0,25 per merk |
| Meetronde | **$0,855 gemiddeld** over 13 rondes in `ai_calls`, waarvan 98,8% in het stellen van de vraag |
| Crawlplafond | 150 pagina's (`MAX_PAGES_HARD_CAP`), sinds 22 augustus 2026 verdeeld over de secties van de site in plaats van de eerste 150 in sitemapvolgorde |
| Doorvoer werker | 5 lichte taken parallel per ronde, zware taken serieel, één aanroep per minuut |
| Budgetplafond | €50 per account per maand, €150 per dag over alles |

**Wat er werkt, van begin tot eind.** Merk aanmaken uit drie velden, onderzoekspijplijn, aanbodboom,
kennistest, 5-8 voorgestelde onderwerpen, 30 vragen per cluster, goedkeuringspoort, maandelijkse
meting met onzekerheidsmarge, concurrentievergelijking, rangordetabel, rapport met claimvalidatie,
contentbriefing met feitenkaart, schrijven met drietrapsredactie en twee poorten, contentplan van
twaalf maanden met een dagelijkse schrijfronde, potentiescore over alle onderwerpen heen, accounts,
uitnodigingen, rollen, budgetplafond en archivering.

**Ook de handmatige publicatielus staat er al**, en dat is precies de route die nu getest wordt:
kopieerknoppen voor de tekst, de gestructureerde data, de WordPress-blokken en de FAQ
(`content-export.ts`, `content-actions.tsx`), een uitleg wat je ermee doet (`publish-guide.tsx`), een
publicatieveld (`publish-box.tsx`), een controle of de pagina er echt staat (`publish-check.ts`) en
het inplannen van de hermeetgolven (`markPublished()`). **Wat ontbreekt is niet de knop maar het
gebruik:** er is nog nooit één pagina echt doorheen gegaan.

**Wat er niet werkt, en dat zijn precies de drie punten uit de visietabel.**

| | Vandaag | De visie |
|---|---|---|
| Omvang | Alleen GEO. Search Console levert klikken per pagina, verder niets uit de SEO-kant | SEO en GEO als één geheel |
| Autonomie | Goedkeuring per stap, publiceren met de hand | Het systeem beslist en voert uit, de mens houdt richting |
| Doelgroep | MKB, plafonds en cadans op MKB afgesteld | Organisaties met meer kansen dan een team aankan |

---

## 2. Het gat, in zeven werkstromen

### W1. Verificatieschuld

Conventie 10 zegt: gebouwd is niet geverifieerd. De classificatieprompt die zichzelf "de meest
load-bearing prompt van het hele product" noemt is nooit geëvalueerd tegen het model waarop hij nu
draait. De verificatieronde R8 plus S1 tot en met S8 is nooit op productie gedraaid. En één taak per
onboarding valt onverklaard terug van `running` naar `queued`.

### W2. De publicatielus, eerst met de hand

De hele lus staat er en heeft nog nooit gedraaid. Zolang `content_impact` nul rijen heeft is er geen
enkel bewijs dat wat ORBIT ENGINE schrijft ook werkt, en dat is het enige argument dat een klant
uiteindelijk telt. Dit is de eerste werkstroom, niet vanwege techniek maar vanwege bewijs.

### W3. De SEO-helft

De grootste werkstroom, en hij valt in vier stukken die je los kunt bouwen. Drie ervan kosten niets
extra:

1. **Meten wat er in Google gebeurt.** De koppeling met Search Console haalt nu `date` en `page` op,
   geen `query`. Daarmee ligt de hele zoekwoordkant, inclusief posities, gratis binnen handbereik.
2. **De technische kant.** De audit kijkt nu alleen of AI-crawlers binnenkomen. Indexeerbaarheid,
   titels, koppenstructuur, sitemap-gezondheid, interne linkdiepte en snelheid zitten er niet in.
3. **Bestaande pagina's verbeteren.** ORBIT ENGINE schrijft alleen nieuwe pagina's. Stap 7 van de
   cyclus, "verbetert wat minder goed presteert", bestaat nog niet.
4. **Ontdekken waar de vraag zit**, met echte zoekvolumes. Dit is het enige stuk met een externe
   rekening, en het staat daarom achteraan (sprint 8).

### W4. Autonomie tot aan de publicatieknop

De poorten staan er allemaal en ze staan allemaal dicht. Autonomie is hier geen nieuwe motor maar een
schakelaar per stap, plus een besluitenlogboek waarin staat wat ORBIT ENGINE deed, waarom, en hoe je
het terugdraait. **De publicatieknop blijft van een mens**, ook na deze werkstroom.

### W5. Schaal

Vier grenzen die bij tien MKB-klanten niet opvallen en bij één webshop met duizend categoriepagina's
meteen. Het crawlplafond van 150. De doorvoer van de werker. Het budgetplafond van €50 per maand,
terwijl 50 clusters alleen aan meting al ~€43 per maand kosten. En een meetcadans die voor elk
cluster maandelijks is.

### W6. Meer AI-antwoordsystemen

De enginelaag staat er, Gemini slaapt. Het stuk dat expliciet niet gebouwd is, staat als stappenplan
in `lib/jobs/queue.ts`: de meetplanning per engine. Zonder dat telt elke vraag dubbel in de score
zodra er een tweede engine meedoet. Doel van deze werkstroom is niet "meer engines" maar: **de
sleutel toevoegen is genoeg.**

### W7. Merk en vormgeving

Geen code-werkstroom maar hij bepaalt wel wat er in code moet gebeuren. Het designsysteem is afgeleid
van de concurrent (`designsystem.md` §9b). Zolang jij daar geen uitspraak over doet, bakt elke
volgende UI-wijziging die afgeleide verder in.

---

## 3. De sprints, op volgorde

**Vier fases.** Fase A bewijst dat de keten werkt, met de hand. Fase B haalt meer uit wat er al is,
zonder één nieuwe leverancier. Fase C maakt het schaalbaar. Fase D voegt de twee externe koppelingen
toe, pas als de app zich bewezen heeft. Werkstroom W7 loopt er dwars doorheen en wacht op jou.

⚠️ **De doorlooptijd wordt bepaald door wachttijd, niet door bouwtijd.** Effect meten gebeurt in
golven van 30 en 60 dagen na publicatie. Sprint 1 moet daarom als eerste, ook al is hij niet de
grootste: de klok gaat pas lopen als er een pagina live staat. De wachttijd loopt door terwijl je aan
de volgende sprint werkt.

| # | Sprint | Fase | Bouwtijd (schatting) | Wachttijd | Externe sleutel nodig |
|---|---|---|---|---|---|
| 0 | De schuld inlossen | A | 1 dag | geen | Google, gratis |
| 1 | De eerste echte publicatie, met de hand | A | 2-3 dagen | 60 dagen | geen |
| 2 | De SEO-meetlaag | B | 2-3 dagen | 14 dagen | dezelfde Google-sleutel |
| 3 | De technische kant van SEO | B | 2-3 dagen | geen | PageSpeed, gratis |
| 4 | Bestaande pagina's verbeteren | B | 4-5 dagen | 30 dagen | geen |
| 5 | Autonomie tot aan de publicatieknop | B | 3-4 dagen | 30 dagen | geen |
| 6 | De tweede AI-engine, zonder iets om te gooien | C | 3 dagen | 1 meetronde | Gemini, betaald |
| 7 | Schaal | C | 4-5 dagen | 1 volle keten | geen |
| 8 | Echte zoekvolumes via een API | D | 3-4 dagen | geen | zoekdata, betaald |
| 9 | CMS-koppeling: WordPress en Shopify | D | 5-7 dagen | 30 dagen | per klant |
| doorlopend | Eigen vormgeving | W7 | 1-2 dagen | jouw besluit | geen |

De bouwtijdschattingen zijn afgeleid van wat dit project eerder deed: de appstructuur was zeven fases
op één dag, de acht Nova-fases waren twee dagen. Ze zeggen niets over kalendertijd, want de
verificatie is het langzame deel.

---

### Sprint 0. De schuld inlossen

**Waarom eerst.** Er is geen zin in nieuwe rondes op een keten waarvan de vorige ronde niet is
nagerekend. Dit is de goedkoopste sprint en hij bepaalt of de cijfers waarop de rest leunt kloppen.

**Claude Code doet:**

- `npm run eval:mention -- --compare` draaien, drempel 90%. Valt hij lager uit, dan is de
  mention-prompt bijstellen het eerste werk van deze sprint en niet iets voor later.
- De verificatieronde uit [`verificatie-r8-s8.md`](./verificatie-r8-s8.md): vijf testcases, twee
  pagina's per case, ~$2. Uitkomst naar `logbook.md` §8, daarna dat taakbestand verwijderen.
- De doorlooptijd van één `content_draft` meten. Past hij ruim binnen `TIMEOUT_MS` (100 s), dan gaat
  de redeneerinspanning voor content van `medium` naar `high` in `lib/openai/sampling.ts`. Gratis
  kwaliteitswinst op de duurste stap van het product, en de pagina's die je in sprint 1 met de hand
  gaat plaatsen zijn meteen beter.
- Loggen rond de taak die van `running` naar `queued` terugvalt (`lib/jobs/worker.ts`). Eerst
  waarnemen, dan pas repareren. Dit is het verschil tussen de 7,5 minuut die je in een demo belooft
  en 12 minuten.
- Een ketentestscenario voor de aggregatiestap van `measure.ts`. Dat gat staat met naam in
  `architecture.md` §5 en het maakt elke wijziging aan de meetkant riskanter dan nodig.

**Jij doet, buiten Claude Code om:**

1. **Een Google-serviceaccount aanmaken** in Google Cloud, met de Search Console API aan. Download de
   JSON-sleutel. Claude Code kan hem daarna zelf in Vercel zetten, maar hij kan hem niet aanmaken.
2. **Het adres van dat serviceaccount bij Van den Udenhout toevoegen** aan zijn Search
   Console-property, met het recht "Beperkt". ORBIT ENGINE vraagt alleen leesrecht.
3. **~$5 aan API-budget vrijgeven** voor de verificatiecalls.

**Klaar als:** de evaluatie op of boven 90% staat, de verificatieronde in het logboek is verwerkt, en
`search_console_days` rijen bevat voor minstens één echte property.

---

### Sprint 1. De eerste echte publicatie, met de hand

**Waarom dit de eerste bouwsprint is.** De hele publicatielus staat er en heeft nog nooit gedraaid.
Zolang `content_impact` leeg is heeft ORBIT ENGINE geen enkel bewijs dat wat hij schrijft werkt. Deze
sprint is daarom niet "een functie bouwen" maar **de route echt aflopen en repareren wat er onderweg
schuurt**, met Van den Udenhout als eerste geval.

**De route die getest wordt, stap voor stap:** pagina goedkeuren in de bibliotheek → tekst kopiëren →
in het eigen CMS plakken en publiceren → de live-URL terug in ORBIT ENGINE plakken → ORBIT ENGINE
controleert of de pagina er echt staat → de hermeetgolven van 30 en 60 dagen gaan lopen.

**Claude Code doet:**

- **Eerst meelopen, dan pas bouwen.** De eerste pagina gaat er met de bestaande knoppen doorheen en
  elk punt waar het schuurt wordt genoteerd. Pas daarna wordt er iets aangepast. Anders bouwen we aan
  een probleem dat we vermoeden in plaats van aan een probleem dat we zagen.
- **Publiceren onomkeerbaar maken.** Het publicatieveld is nu een vrij URL-veld. Het domein hoort
  vast te staan en alleen het pad bewerkbaar, en de handeling hoort vooraf als onomkeerbaar benoemd
  te worden (kwaliteitslat K4). Dit staat als enige open punt van de vijf Nova-verbeteringen nog in
  `roadmap.md`.
- **Het contentplan als derde ingang naar een geschreven pagina.** `?van=plan` is gebouwd en getest,
  maar het plan linkt nog niet naar de tekst die eruit voortkwam. Wie een maand goedkeurt en daarna
  wil plaatsen, moet nu zoeken.
- **Kopiëren wat je écht nodig hebt.** Vandaag zijn er knoppen voor de tekst, de schema-markup, de
  WordPress-blokken en de FAQ. Wat er per pagina nog los bij hoort, de paginatitel, de
  meta-omschrijving en het voorgestelde pad, komt in dezelfde kopieerbare vorm, zodat plakken één
  handeling is en geen speurtocht.
- **De automatische controles op gepubliceerde pagina's aanzetten** (fase 6 in `roadmap.md`): staat
  hij er nog, is hij gewijzigd, is hij nog bereikbaar voor AI-crawlers. Die konden niet gebouwd
  worden zolang er nul echte gevallen waren.
- **Impact terug in het plan** (ook fase 6): een pagina die na 60 dagen niets deed leidt tot een
  voorstel, een onderwerp dat wél werkte krijgt meer ruimte. Dit is de eerste keer dat de lus
  daadwerkelijk rondgaat.

**Jij doet, buiten Claude Code om:**

1. **Eén pagina van Van den Udenhout echt publiceren.** Er staan er twee klaar. Kopieer de tekst,
   plaats hem in het CMS, en plak de live-URL terug in ORBIT ENGINE.
2. **Noteer wat er onhandig was.** Elk moment waarop je moest zoeken, overtypen of gokken is een
   bouwpunt. Dat is de invoer voor de tweede helft van deze sprint.
3. **Daarna twee tot drie plannen echt doorlopen**, zodat de route niet op één geval rust.

**Klaar als:** één echte pagina live staat, de controle groen is, `content_impact` zijn eerste rijen
heeft en de golf van 60 dagen is ingepland. Vanaf dat moment loopt de klok, en die klok is de reden
dat deze sprint vooraan staat.

---

### Sprint 2. De SEO-meetlaag

**Waarom nu.** De goedkoopste helft van de SEO-belofte, en er komt geen leverancier aan te pas.
Search Console geeft zoekopdrachten en posities gratis weg, en de koppeling staat er al. De migratie
van augustus zegt zelf dat zoekopdrachten "een tweede tabel waard zijn zodra ze echt gebruikt
worden". Dat moment is nu.

**Claude Code doet:**

- **Migratie `0060`:** `search_console_queries` (merk, dag, zoekopdracht, pagina, klikken,
  vertoningen, positie), met dezelfde unieke sleutel-aanpak als `search_console_days`, want Google
  herziet de cijfers van de afgelopen dagen nog na.
- **`lib/search-console/sync.ts`** krijgt een tweede aanroep met `dimensions: ["date", "query",
  "page"]`, met paginering. De bestaande dagelijkse `gsc_sync`-taak doet het werk, er komt geen
  tweede cron bij.
- **`lib/search-console/rankings.ts`**, puur en dus testbaar (conventie 2): de positieverdeling, "op
  het randje" (positie 8 tot 20, waar één zet het meeste oplevert), dalers over twee vensters, en
  stijgers.
- **Analytics → Zoekverkeer** toont posities naast klikken, en de gecombineerde grafiek met
  AI-zichtbaarheid die als open punt in `roadmap.md` (fase 5) staat.
- **De Kansen-lijst krijgt een vierde bron:** een zoekopdracht waarop je bijna scoort is een kans met
  een cijfer eronder, en `lib/opportunities.ts` is er al op gebouwd om bronnen naast elkaar te zetten.
- ⚠️ **Eén eerlijkheidsregel op het scherm.** Gemiddelde positie uit Search Console is geen
  ranktracker. Het is een gemiddelde over apparaten, locaties en dagen. Dat staat erbij, in plaats
  van dat we een precisie suggereren die er niet is (conventie 3).

**Jij doet:** per klant het serviceaccount aan zijn property toevoegen. Verder niets, de sleutel uit
sprint 0 draagt deze hele sprint.

**Klaar als:** de cijfers van één property over hetzelfde venster overeenkomen met wat de klant zelf
in Search Console ziet.

---

### Sprint 3. De technische kant van SEO

**Waarom nu.** De goedkoopste sprint met het meeste demo-effect, en hij kost nul AI-geld. Alles
hieronder is deterministisch en hoort dus in de tabel "Bewust géén AI" van `architecture.md` §6.

**Claude Code doet:**

- **Migratie `0061`:** `page_issues` (merk, URL, soort, ernst, bewijs, gezien op) en een SEO-facet op
  `technical_audits`.
- **`lib/audit/seo/`:** indexeerbaarheid (robots, noindex, canonical), titels en beschrijvingen
  (ontbrekend, dubbel, te lang), koppenstructuur, sitemap-gezondheid, interne linkdiepte,
  dekkingsgraad van gestructureerde data. Op de HTML die de crawler tóch al ophaalt, dus zonder extra
  netwerkverkeer, net zoals `template-detect.ts` het doet.
- **Snelheid via de PageSpeed Insights API.** Gratis, quotum ruim, geen AI.
- **Scherm:** let op de regel van hooguit drie bestemmingen per hoofdstuk (`ux-design.md` §5). Dit
  wordt waarschijnlijk een uitbreiding van het bestaande auditblok en geen vierde menu-item.

**Jij doet:** een PageSpeed Insights API-sleutel aanmaken. Gratis, vijf minuten werk in de Google
Cloud-console.

**Klaar als:** de bevindingen op één echte klantsite met de hand zijn nagelopen tegen de
dekkingsrapportage in Search Console. Vals alarm is hier duurder dan een gemist punt: een klant die
één verzonnen fout ontdekt, gelooft de lijst daarna niet meer.

---

### Sprint 4. Bestaande pagina's verbeteren

**Waarom nu.** Dit is stap 7 van de cyclus, en de enige stap die vandaag helemaal niet bestaat. ORBIT
ENGINE schrijft alleen nieuw. Voor een klant met een bestaande site van duizend pagina's is
verbeteren bijna altijd meer waard dan toevoegen.

**Publiceren blijft ook hier handwerk.** Een herschreven pagina komt uit de app als tekst die de
klant zelf over de bestaande pagina heen zet, met dezelfde kopieerroute als sprint 1. Dat werkt, en
het maakt de stap onmiddellijk bruikbaar zonder koppeling.

**Claude Code doet:**

- **Migratie `0062`:** op `content_pieces` de kolommen `rewrite_of_url` en `rewrite_reason`, plus een
  tabel `internal_link_suggestions`.
- **`lib/pipeline/decay.ts`**, puur: welke bestaande pagina zakt. Op basis van de dag- en
  zoekopdrachtdata uit sprint 2, over twee vensters, met dezelfde onzekerheidsredenering als
  `period-change.ts`. Een daling die binnen de ruis valt is geen daling.
- **Nieuw jobtype `optimize_page`:** de bestaande pagina ophalen, tegen de feitenkaart en de meting
  leggen, en een herschrijfvoorstel maken via dezelfde drietrapsredactie en dezelfde twee poorten die
  nieuwe content al doorlopen. Geen tweede schrijfpad, want dan lopen de kwaliteitsregels uit elkaar.
- **Een verschilweergave tegenover de live-pagina**, zodat de klant ziet wát er verandert voordat hij
  overtypt. `content-diff.ts` doet dit al tussen twee versies; dit is dezelfde module met de
  opgehaalde live-tekst als linkerkant.
- **Interne links:** deterministisch matchen met `page-relevance.ts`, en één AI-aanroep voor de
  ankertekst. Als lijst met bron, doel en voorgestelde tekst, want ook die zet de klant er met de
  hand in.

**Jij doet:** goedkeuren per herschreven pagina, en de wijziging in het CMS doorvoeren.

**Klaar als:** één bestaande pagina van een klant is herschreven, live bijgewerkt, en na 30 dagen een
gemeten uitkomst heeft.

---

### Sprint 5. Autonomie tot aan de publicatieknop

**Waarom nu en niet eerder.** Autonomie zonder effectmeting is een systeem dat zelfstandig handelt
zonder te weten of het werkt. Sprint 1 en 4 leveren die meting.

**De grens die deze sprint niet oversteekt.** Publiceren blijft een menselijke handeling, en content
blijft goedkeuring vragen. Autonomie gaat hier over alles ervóór: meten, onderzoeken, schrijven,
voorstellen, herschrijven. Dat is precies de verhouding die `visie.md` beschrijft: de mens houdt
richting en controle, ORBIT ENGINE doet het werk.

**Claude Code doet:**

- **Migratie `0063`:** op `profiles` de kolommen `autonomy_meten`, `autonomy_schrijven` en
  `autonomy_optimaliseren`, elk met drie standen: `voorstellen`, `uitvoeren_met_melding`,
  `uitvoeren`. Plus een tabel `decisions` (merk, soort, samenvatting, bewijs, genomen op,
  teruggedraaid op, door wie). **Geen `autonomy_publiceren`**, want die stand bestaat niet zolang er
  geen koppeling is, en een schakelaar die niets doet is erger dan geen schakelaar.
- **`lib/autonomy.ts`**, puur: mag deze stap zelfstandig. Eén plek, want de poort zit nu op vijf
  plekken in de pijplijn hardgecodeerd.
- **Het besluitenlogboek als scherm.** Dit is het onderdeel dat autonomie verkoopbaar maakt: niet dat
  ORBIT ENGINE zelfstandig handelt, maar dat je achteraf precies ziet wát hij deed, waarom, en met
  welke knop je het terugdraait.
- **Een wekelijkse samenvatting per mail.** Resend staat er al, `EMAILS_ENABLED` is de schakelaar.
- ⚠️ **De kostenrem blijft staan.** Besluit 18 (alleen de beheerder start betaald werk) en de twee
  budgetplafonds veranderen niet. Autonomie verschuift wie er klikt, niet of er een plafond is.

**Jij doet:** per klant vastleggen welke standen er gelden. Autonomie is tegelijk je sterkste
verkoopargument en je grootste aansprakelijkheid, en het is een verkoopbeslissing per klant en niet
een productinstelling voor iedereen.

**Klaar als:** één merk een volledige maand op `uitvoeren_met_melding` heeft gedraaid, met een
besluitenlogboek dat achteraf navertelt wat er gebeurde, en zonder dat er content buiten de
goedkeuring om klaar kwam te staan.

---

### Sprint 6. De tweede AI-engine, zonder iets om te gooien

**Het doel van deze sprint in één zin:** als de Gemini-sleutel er ooit is, is hem invullen genoeg.

**Claude Code doet:**

- **De meetplanning per engine**, het stuk dat bewust niet gebouwd is en waarvan het stappenplan al
  in `lib/jobs/queue.ts` staat, op de plek waar het moet gebeuren.
- **Migratie `0064`:** aggregatie per engine, zodat er een score per engine bestaat naast de
  gecombineerde. Zonder deze stap telt elke vraag dubbel zodra er een tweede engine meedoet, en dat
  maakt de score stil onwaar.
- **Scherm:** zichtbaarheid per engine. Het verschil tussen twee engines is zelf een inzicht: word je
  in de ene wel en de andere niet genoemd, dan zegt dat iets over welke bronnen elk systeem gebruikt.
- **De test die het uitgangspunt bewaakt:** een ketentestscenario dat bewijst dat de app zonder
  `GEMINI_API_KEY` exact hetzelfde doet als vandaag, inclusief dezelfde score en dezelfde
  taakplanning. Zonder die test verschuift dit gedrag ooit ongemerkt.
- ⚠️ **De grens die op het scherm hoort.** Een antwoord via de API is niet hetzelfde als wat een
  gebruiker in de app van die aanbieder ziet. We meten een benadering. Dat geldt vandaag al voor
  engine één, maar met meerdere engines wordt het een vraag die klanten gaan stellen.

**Jij doet, en pas wanneer je wilt:** een Gemini-sleutel aanschaffen. **Twee engines is twee keer
$0,855 per meetronde.** Dat is een prijskaartvraag, geen technische. Tot die tijd verandert er niets.

**Klaar als:** de app zonder sleutel aantoonbaar identiek draait, en met sleutel één meetronde op
twee engines heeft gedaan met de scores naast elkaar.

---

### Sprint 7. Schaal

**Waarom hier.** Elk punt hieronder is een plafond dat je pas raakt met een grotere klant. Ze nu
weghalen is bouwen voor een klant die er nog niet is. Ze niet weghalen betekent dat de eerste grote
klant het plafond ontdekt in plaats van jij.

**Claude Code doet:**

- ~~**Het crawlplafond.**~~ **Afgerond op 22 augustus 2026**, en anders dan hier bedacht. Het
  plafond van 150 is gebleven; wat veranderde is wélke 150. De sitemaps worden nu volledig
  uitgelezen en de plekken over de secties van de site verdeeld (`url-priority.ts`,
  `page-select.ts`, migratie `0061`). Bij gasservice-brabant.nl, 449 pagina's, leverde de oude
  sitemapvolgorde nul van de 26 dienstenpagina's op en de nieuwe alle 26. Representativiteit was
  inderdaad het doel; een budget per merk bleek er niet voor nodig. Zie `logbook.md`, 22 augustus.
  **Wat hiervan open blijft:** `MAX_NODES` van 60 in de aanbodboom. Hoeveel knopen er afvallen
  wordt sinds deze ronde geteld en gemeld, maar nog niet gemeten op productie, en een plafond
  verhogen zonder cijfer is een mening.
- **De doorvoer.** De werker claimt vijf lichte taken per ronde en draait zware taken serieel, één
  aanroep per minuut. Opties, in volgorde van eenvoud: een prioriteitsveld op `jobs`, een tweede
  pg_cron-taak, meerdere werker-aanroepen naast elkaar.
- **Meetcadans per cluster.** Niet elk onderwerp hoeft maandelijks. Een stabiel onderwerp per
  kwartaal meten scheelt direct geld en zegt niets minder.
- **Migratie `0065`:** pakketten met eigen plafonds. `DAILY_BUDGET_PER_ACCOUNT_EUR` van €20 is een
  MKB-getal. Bij 50 clusters kost alleen de meting al ~€43 per maand, en dan is er nog niets
  geschreven; een groot account loopt dan dagelijks tegen het huidige dagplafond aan.
- **Bulkacties nakijken.** Ze bestaan, maar zijn op tien pagina's getest en niet op honderd.

**Jij doet:**

1. **Vercel Pro.** Het Hobby-plan staat twee cron-taken toe, elk hoogstens dagelijks, en die twee
   zijn bezet.
2. **Het Supabase-plan** nakijken op verbindingen en opslag.
3. **De prijskaart per pakket.** Dit is de kern van deze sprint en het is geen technisch werk.

**Klaar als:** één merk met 25 clusters volledig door de keten is, met de doorlooptijd en de kosten
nagerekend tegen `ai_calls`.

---

### Sprint 8. Echte zoekvolumes via een API

**Waarom achteraan.** Niet vanwege de prijs, want die is verwaarloosbaar (§6), maar omdat het een
leverancier toevoegt aan een product dat zich eerst zonder moet bewijzen. Hierna is de potentiescore
een gemeten getal in plaats van een inschatting, en pas dan klopt de zin "ORBIT ENGINE ontdekt
relevante zoekvraag en long-tail kansen".

**Jij besluit eerst welke bron.** De vergelijking met echte prijzen staat in §6. De aanbeveling is
DataForSEO: betalen per aanroep, geen abonnement, en bij deze omvang een paar dollar per maand.

**Claude Code doet:**

- **`lib/search-demand/`** als leverancierslaag naar het patroon van `lib/engines/`. Zonder sleutel
  gedraagt de app zich exact zoals nu, met de bestaande schatting. Ook hier een test die dat bewijst.
- **Migratie `0066`:** `keyword_demand` als cache per land, taal en zoekterm (volume, concurrentie,
  cpc, bron, opgehaald op), `profile_keywords` als koppeling naar merk en cluster, en op
  `profile_topics` een kolom `volume_source` (`model` of `meting`). Die laatste kolom is de
  belangrijkste van de drie: zonder hem laat het scherm ooit een gok voor een meting doorgaan.
- **De cache is niet optioneel.** Dezelfde zoekterm twee keer ophalen is twee keer betalen voor
  hetzelfde getal, en volumes veranderen maandelijks, niet dagelijks.
- **`lib/pipeline/search-demand.ts`** (bestaat al voor de potentiescore) verankert de
  zoekvolume-index aan echte volumes waar die er zijn, en blijft schatten waar niet.
- **Nieuw jobtype `keyword_discovery`:** uit de aanbodboom, de zoekopdrachten uit sprint 2 en de
  bestaande onderwerpen een zoektermenlijst afleiden, volumes ophalen, clusteren.

**Klaar als:** op de vijf regressie-analyses de modelgok naast het echte volume ligt, met de
afwijking opgeschreven. Dat cijfer is meteen het antwoord op de vraag hoe fout de gok was, en het
hoort in het logboek.

---

### Sprint 9. CMS-koppeling: WordPress en Shopify

**Waarom als laatste.** Omdat de handmatige route eerst bewezen moet zijn. Een koppeling die
publiceert wat niemand heeft nagelopen is sneller fout dan goed. Pas als sprint 1 en 4 hebben
uitgewezen dat de tekst klopt en het proces loopt, is het automatiseren van de laatste handeling een
verbetering in plaats van een risico.

**Wat blijft:** de handmatige route verdwijnt niet. Niet elke klant heeft WordPress of Shopify, en
niet elke klant wil een systeem dat op zijn site schrijft. De koppeling is een extra pad, geen
vervanging.

**Wat er gedeeld is tussen beide CMS'en:**

- **Migratie `0067`:** `cms_connections` (merk, soort, basis-URL, gebruikersnaam, verwijzing naar het
  geheim, status, laatste fout, geverifieerd op) en op `content_pieces` de kolommen `cms_post_id`,
  `cms_url` en `publish_method` (`handmatig` of `cms`).
- ⚠️ **Het geheim van de klant gaat in Supabase Vault**, niet in een gewone kolom. Vault wordt al
  gebruikt voor de cron-geheimen, dus het patroon staat er. Een applicatiewachtwoord of een
  API-token van een klant in platte tekst in de database is de ernstigste fout die deze sprint kan
  maken.
- **`lib/cms/`** naar het patroon van `lib/engines/`: `types.ts`, `registry.ts`, en één bestand per
  CMS. Een adapter doet mee als er een werkende koppeling is, anders niet, en dat is de normale
  toestand en geen storing.
- **Een nieuw jobtype `publish_page`** (conventie 7: een nieuwe zware stap wordt een eigen jobtype).
- **Herpubliceren overschrijft.** Een nieuwe versie schrijft naar dezelfde `cms_post_id` in plaats
  van een tweede pagina te maken. Zonder die regel levert sprint 4 duplicaten op, en dat is precies
  wat de duplicatiepoort in eigen huis moet voorkomen.
- **Altijd eerst als concept.** De koppeling zet een pagina standaard op concept, niet op live. De
  klant drukt op de laatste knop in zijn eigen CMS. Dat kan later per klant opengezet worden, maar
  niet als vertrekpunt.
- **Verificatie na afloop** met de bestaande `checkPublication()`, op de URL die het CMS teruggeeft.

#### WordPress, wat er precies moet gebeuren

| | |
|---|---|
| **Toegang** | Applicatiewachtwoord, ingebouwd in WordPress sinds 5.6. De klant maakt er één aan onder zijn gebruikersprofiel. Het erft de rechten van die gebruiker, dus een account met de rol Auteur of Redacteur volstaat. Geen plugin nodig |
| **Koppeling** | De REST API op `/wp-json/wp/v2/`. Aanmaken met `POST /posts` of `POST /pages`, bijwerken met `POST /posts/{id}`. Basic-authenticatie over HTTPS |
| **Velden** | `title`, `content`, `status` (`draft` of `publish`), `slug`, `excerpt`, `categories`, `tags` |
| **Vorm van de tekst** | Gutenberg-blokken, en die maakt ORBIT ENGINE al: `markdownToGutenbergBlocks()` in `content-export.ts` levert precies dit. Dit is de reden dat WordPress het minste werk is |
| **Gestructureerde data** | Als apart blok mee, of via het `meta`-veld |
| **Het lastige stuk** | De SEO-titel en de meta-omschrijving zitten niet in WordPress zelf maar in Yoast of RankMath. Die velden zijn alleen schrijfbaar als de plugin ze als REST-veld registreert. Reken op een aparte behandeling per plugin, en op klanten waar dit met de hand moet blijven |
| **Waar het misgaat** | Beveiligingsplugins die de REST API dichtzetten, hosters die applicatiewachtwoorden uitschakelen, en sites die nog op de klassieke editor draaien. Die laatste krijgen HTML in plaats van blokken, dus de adapter moet allebei kunnen |
| **Bouwtijd** | 2-3 dagen, het grootste deel zit in de plugin-velden en de foutafhandeling |

#### Shopify, wat er precies moet gebeuren

| | |
|---|---|
| **Toegang** | De klant maakt in zijn winkeladmin een custom app aan en geeft het Admin API-token af. Benodigde rechten: `write_content` en `read_content`. Dat is een andere handeling dan bij WordPress en hij hoort in de handleiding uitgeschreven te worden |
| **Koppeling** | De Admin API (GraphQL). Let op: dit is niet dezelfde API als die voor producten en bestellingen |
| **Waar de content landt** | Twee soorten: een `Page` (een losse pagina zoals "Over ons") en een `Article` onder een `Blog`. ORBIT ENGINE schrijft geen productpagina's, dus dit zijn de twee doelen. Welke van de twee is een keuze per contenttype en hoort in de adapter vast te liggen, niet per pagina gevraagd te worden |
| **Vorm van de tekst** | **HTML, geen blokken.** Shopify kent Gutenberg niet. `content-export.ts` heeft dus een tweede uitvoervorm nodig: schone HTML met koppen, lijsten en de FAQ als `<details>`. Dit is het echte extra werk tegenover WordPress |
| **SEO-velden** | Via de `seo`-velden op het object, of als metafield in de namespace `global` met de sleutels `title_tag` en `description_tag` |
| **Het lastige stuk** | Het thema bepaalt hoe een pagina eruitziet. Een pagina die via de API binnenkomt krijgt het standaardsjabloon, en dat kan er anders uitzien dan de klant verwacht. Dit hoort vooraf besproken, niet achteraf ontdekt |
| **Waar het misgaat** | Een token met te weinig rechten, en de API-versie die Shopify elk kwartaal opschuift. De adapter pint een versie vast en die moet periodiek bijgewerkt worden |
| **Bouwtijd** | 3-4 dagen, waarvan een dag aan de HTML-uitvoervorm |

**Jij doet, buiten Claude Code om:**

1. **Per klant de toegang regelen:** bij WordPress een applicatiewachtwoord, bij Shopify een custom
   app met een token. Allebei via de klant.
2. **Contractueel vastleggen wie tekent voor wat er gepubliceerd wordt.** Een systeem dat op de site
   van een klant schrijft is een aansprakelijkheidsvraag, geen functievraag.
3. **Besluiten of er een derde CMS bij moet.** Webflow en Craft komen het meest voor na deze twee.
   Elk extra CMS is ongeveer twee dagen zodra de laag er staat.

**Klaar als:** één pagina per CMS via de koppeling als concept is aangemaakt, door de klant is
vrijgegeven, de controle groen is, en een herpublicatie dezelfde pagina bijwerkt in plaats van een
tweede aan te maken.

---

### Doorlopend. Eigen vormgeving (jij bent aan zet)

**Dit is het enige onderdeel waar Claude Code niet mee kan beginnen.** `designsystem.md` §9b zegt
precies wat er nodig is, in deze volgorde:

1. **Een uitspraak van jou** of het uiterlijk eigen moet worden. Zolang die uitspraak er niet is,
   bakt elke volgende UI-wijziging de afgeleide van de concurrent verder in.
2. **Als het antwoord ja is: een merktoolkit van een ontwerper.** Logo, kleurenpalet, typografie.
   `merkstrategie.md` §27 heeft de volledige lijst van veertig assets.
3. **Dan pas Claude Code:** de merklaag in `app/globals.css` en `docs/designsystem.md`. Dat is werk in
   de tokens en niet in de componenten, precies omdat de regel "een kleur heeft een betekenis, geen
   naam" consequent is toegepast. Eén tot twee dagen, geen herbouw.

---

## 4. Jouw takenlijst buiten Claude Code, op één plek

Dit is de volledige lijst. Alles wat er niet in staat, kan Claude Code zelf.

| # | Wat | Voor sprint | Kosten | Waarom Claude Code dit niet kan |
|---|---|---|---|---|
| 1 | Google-serviceaccount met Search Console API aanmaken, JSON-sleutel downloaden | 0 | gratis | Vraagt een ingelogde Google Cloud-console |
| 2 | Dat serviceaccount per klant aan zijn property toevoegen, recht "Beperkt" | 0, 2 | gratis | De klant moet het zelf doen of jou toegang geven |
| 3 | ~$5 API-budget vrijgeven voor de verificatieronde | 0 | ~$5 | Jouw rekening |
| 4 | **Eén pagina van Van den Udenhout echt publiceren**, met de hand | 1 | geen | Jij plaatst hem in het CMS. Dit is de handeling waar het hele plan op wacht |
| 5 | Noteren wat er in die route onhandig was | 1 | geen | Alleen jij loopt hem echt af |
| 6 | Twee tot drie contentplannen echt doorlopen | 1 | geen | Klantwerk |
| 7 | PageSpeed Insights API-sleutel aanmaken | 3 | gratis | Google Cloud-console |
| 8 | Per klant de autonomiestanden contractueel vastleggen | 5 | geen | Verkoop, geen instelling |
| 9 | Gemini-sleutel, wanneer je wilt | 6 | ~$0,85 extra per meetronde | Jouw rekening |
| 10 | Vercel Pro en het Supabase-plan | 7 | vanaf ~$20 per maand | Jouw abonnement |
| 11 | Prijskaart per pakket herzien | 7 | geen | De belangrijkste beslissing in dit hele document |
| 12 | Zoekvolumeleverancier kiezen, opwaarderen, voorwaarden nalezen | 8 | $50 startsaldo, daarna een paar dollar per maand (§6) | Een inkoopbeslissing met een juridische kant |
| 13 | Per klant CMS-toegang regelen: applicatiewachtwoord of API-token | 9 | gratis | Loopt via de klant |
| 14 | Vastleggen wie tekent voor wat er gepubliceerd wordt | 9 | geen | Juridisch, geen code |
| 15 | Besluiten of er een derde CMS bij moet | 9 | geen | Hangt aan je klantenbestand |
| 16 | Uitspraak over `designsystem.md` §9b | doorlopend | geen | Een eigenaarsbesluit |
| 17 | Merktoolkit bij een ontwerper laten maken | doorlopend | offerte | Geen code |
| 18 | Cases met echte cijfers en toestemming van de klant | doorlopend | geen | `merkstrategie.md` §21.2 noemt twee cases die nergens in dit systeem voorkomen |

**Wat Claude Code wél zelf kan, zodat je er niet op wacht:** migraties toepassen op productie, deploys
controleren, logs lezen, env-variabelen in Vercel plaatsen zodra jij de waarde hebt,
Supabase-query's draaien om cijfers na te rekenen, en alle code, tests en documentatie. De grens ligt
consequent bij drie dingen: een account aanmaken bij een externe partij, iets betalen, en iets met een
klant afspreken.

---

## 5. Wat er per sprint uit `merkstrategie.md` §30 verdwijnt

§30 is de lijst met verschillen tussen wat het merkverhaal belooft en wat de app doet. Die lijst hoort
korter te worden naarmate er gebouwd wordt, en dit is wanneer.

| §30 | Wat er nu niet klopt | Verdwijnt na |
|---|---|---|
| 1 | ORBIT ENGINE publiceert via het CMS | **sprint 9**, als laatste. Tot dan mag deze belofte nergens naar buiten |
| 2 | SEO én GEO als één geheel | **sprint 2, 3 en 4** voor het meten en verbeteren, **sprint 8** voor het ontdekken van nieuwe vraag |
| 3 | Doelgroep is schaal | **sprint 7**, en dan nog alleen als de prijskaart meebeweegt |
| 4 | Het systeem beslist en handelt autonoom | **sprint 5**, tot aan de publicatieknop. Volledig pas na sprint 9 |
| 5 | Neutral-first zonder gloed en gradient | het doorlopende onderdeel, en dat wacht op jouw uitspraak |

Bij elke sprint hoort dus ook een aanpassing in `visie.md` (de tabel onderaan), `merkstrategie.md`
§30, `README.md` (de lijst "bewust niet gebouwd") en `schrijfstijl.md` (wat we niet overnemen van
Nova). Dat zijn vier plekken die vandaag alle vier hetzelfde zeggen, en die na elke sprint alle vier
moeten meebewegen.

---

## 6. Wat echte zoekvolumes kosten

Opgezocht op 18 augustus 2026. **De uitkomst in één zin: bij deze omvang is het een paar dollar per
maand, en de drempel is niet de prijs maar het startsaldo en een leverancier erbij.**

**De rekenbasis.** Een merk heeft 5-8 clusters. Na het uitbreiden naar long-tail zijn dat naar
schatting 2.000 tot 3.000 zoektermen per merk. De tabel rekent met 2.500 per merk en 20 merken, dus
50.000 zoektermen per volledige verversing. Volumes veranderen maandelijks, niet dagelijks, dus één
verversing per maand volstaat.

| Leverancier | Wat je betaalt | Per 1.000 zoektermen | 20 merken, één keer per maand |
|---|---|---|---|
| **DataForSEO**, Google Ads Search Volume | $0,06 per aanroep van maximaal 1.000 zoektermen. Geen abonnement, wel een startsaldo van $50 | **$0,06** | **~$3 per maand** |
| **DataForSEO Labs**, zoektermen ontdekken | $0,012 per aanroep plus $0,00012 per resultaat | $0,13 | ~$6,60 per maand, en alleen bij een volledige nieuwe ronde |
| **Keywords Everywhere** | vanaf $84 per jaar voor 100.000 credits, 1 credit is 1 zoekterm | $0,84 | 600.000 credits per jaar valt in een fors duurder pakket. Ruim tien keer de prijs per zoekterm |
| **Semrush API** | Business-abonnement $499,95 per maand, API-units apart bij te kopen | niet los te kopen | **~$6.000 per jaar** voordat er één zoekterm is opgehaald |
| **Google Ads Keyword Planner** | gratis | gratis | Gratis, maar zonder actieve advertentie-uitgaven geeft Google zeven brede bakken zoals "1k-10k". Daar is geen potentiescore op te bouwen |

**De aanbeveling: DataForSEO.** Betalen per aanroep, geen maandverplichting, en de kosten schalen mee
met je klantenbestand in plaats van vooruit te lopen. Het startsaldo van $50 is geen abonnement maar
tegoed: je betaalt vooruit voor aanroepen die je daarna verbruikt. Bij 20 merken gaat dat tegoed ruim
een jaar mee.

⚠️ **Lees de voorwaarden na vóór je opwaardeert.** Sommige leveranciers verbieden het doorgeven van
hun zoekvolumes aan derden, en dat is precies wat dit product doet: het toont ze aan de klant. Dat is
een juridische controle, geen technische, en hij kan de leverancierskeuze omgooien.

⚠️ **Search Console is geen vervanging.** Dat geeft de zoekopdrachten waarop de site van de klant nú
al vertoningen krijgt, en dat is gratis en waardevol (sprint 2). Het zegt niets over vraag waarop de
klant nog helemaal niet gevonden wordt, en dat is juist de kant waar de kansen zitten.

Bronnen: [DataForSEO Google Ads API](https://dataforseo.com/pricing/keywords-data/google-ads) ·
[DataForSEO Labs API](https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api) ·
[Keywords Everywhere API](https://keywordseverywhere.com/api-documentation.html) ·
[Semrush API-prijzen](https://thatmarketingbuddy.com/blog/semrush-api-pricing) ·
[Google Ads API, toegangsniveaus](https://developers.google.com/google-ads/api/docs/api-policy/access-levels)

---

## 7. Wat dit plan bewust niet doet

- **Geen white-label rapportages.** De visie vraagt er nergens om.
- **Geen tweede schrijfpad.** Bestaande pagina's verbeteren gebruikt dezelfde redactie en dezelfde
  poorten als nieuwe pagina's. Twee paden lopen gegarandeerd uit elkaar.
- **Geen eigen ranktracker.** Search Console geeft posities gratis.
- **Geen Google Analytics-koppeling.** Search Console wel, Analytics niet. Dat is een gesprek met de
  klant, geen integratie.
- **Geen verplichte tweede sleutel, nergens.** Zie uitgangspunt 3.
- **Geen meertaligheid en geen donkere modus.** Besluit 13 en besluit 17, allebei geschrapt.
- **Geen herbouw van de vormgeving.** Het doorlopende onderdeel vervangt een merklaag, meer niet.

---

## 8. Risico's en aannames, eerlijk opgeschreven

**1. De prijskaart is het echte knelpunt, niet de techniek.** Een meetronde kost $0,855. Een klant
met 50 clusters kost ~€43 per maand aan meting alleen, tegen een plafond van €50 per account per
maand. Elke sprint hierboven maakt het product waardevoller én duurder per klant.

**2. De merkbelofte over publiceren blijft het langst onwaar.** Door de CMS-koppeling naar achteren
te schuiven staat het zwaarste punt uit `merkstrategie.md` §30 als laatste op de lijst. Dat is
verdedigbaar, maar het betekent dat de verkoop tot sprint 9 niets over publiceren mag beloven. Eén
demo waarin dat toch gebeurt is genoeg om het vertrouwen te kosten.

**3. Handmatig publiceren remt het tempo van de bewijsvoering.** Elke pagina kost een menselijke
handeling, dus het aantal gepubliceerde pagina's blijft laag, en effect meten heeft aantallen nodig.
Reken erop dat de eerste harde uitspraak over "werkt dit" maanden duurt in plaats van weken. Dat is
de prijs van eerst testen, en het is een prijs die het waard kan zijn.

**4. Autonomie en het verdienmodel trekken aan elkaar.** Het uur consultancy is onderdeel van de
verkoop. Hoe autonomer het systeem, hoe minder er te bespreken valt. Sprint 5 is daarom per klant
instelbaar en niet productbreed.

**5. De doelgroepverschuiving is niet gratis.** De hele app is gebouwd rond een merk met een
overzichtelijke site. Een webshop met duizend categorieën vraagt een ander soort onderzoek, niet
alleen een hoger plafond.

**6. We meten een benadering.** Wat ORBIT ENGINE meet is wat een model via de API antwoordt, niet wat
een gebruiker in de app van die aanbieder ziet. Met meerdere engines wordt dat een vraag die klanten
gaan stellen.

**7. Alles leunt op vijf regressie-analyses van 30 juli 2026.** Voor de SEO-kant bestaat zo'n set nog
niet. Die ontstaat pas zodra Search Console voor meerdere klanten data levert.

---

## 9. Hoe je hiermee werkt

**Per sprint, in deze volgorde:** eerst de taken uit §4 die bij die sprint horen, dan de bouw, dan de
verificatie op productie, dan de documentatie. Een sprint zonder verificatie op echte data telt niet
als af (conventie 10), en een sprint waarvan de documentatie niet is bijgewerkt levert precies de
wildgroei op die dit project eerder heeft moeten opruimen.

**De vier controles blijven per commit gelden:** `npx tsc --noEmit`, `npm run test:unit`,
`npm run test:chain`, `npm run build`.

**Dit document is tijdelijk.** Elke afgeronde sprint wordt hier weggehaald en samengevat in
`logbook.md`, met de datum en het cijfer dat hem droeg. Staat er niets meer in, dan is de afstand
tussen `visie.md` en de app nul en kan het bestand weg.
