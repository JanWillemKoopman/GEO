# Ontwikkelplan: van de app van vandaag naar de visie

**Opgesteld:** 18 augustus 2026 · **Status:** voorstel, wacht op vier besluiten van de eigenaar
(§0 en §7) · **Bestemming:** [`../visie.md`](../visie.md) en [`../merkstrategie.md`](../merkstrategie.md)

Dit document beantwoordt één vraag: wat moet er gebouwd en geregeld worden voordat ORBIT ENGINE
werkelijk doet wat de visie en de merkstrategie beloven. Het is opgedeeld in **zeven werkstromen**
(wát er ontbreekt) en **tien sprints** (in welke volgorde je het bouwt). Per sprint staat er wat
Claude Code doet, wat jij buiten Claude Code om moet doen, en waaraan je ziet dat het klaar is.

**Twee dingen die dit document níet is.** Het is geen belofte dat de app dit al kan: zolang een
sprint niet is afgerond blijft `CLAUDE.md`, `architecture.md` en `ux-design.md` de stand van zaken.
En het is geen vervanging van [`roadmap.md`](./roadmap.md): daar staat het oudere, kleinere werk dat
nog open ligt. Dit document staat erboven en verwijst ernaar waar ze elkaar raken.

---

## 0. Lees dit eerst: drie eerdere besluiten gaan hier onderuit

De visie vraagt om drie dingen die eerder, met argumenten, zijn afgewezen. Dat is geen fout in de
visie en het was geen fout in die besluiten. Het betekent wel dat je ze bewust terugdraait in plaats
van er stilzwijgend overheen te bouwen.

| Wat er toen besloten is | Waar het staat | Waarom het nu terug moet |
|---|---|---|
| **Geen CMS-koppeling.** "Wij leveren publicatieklare content, de klant plaatst hem" | `logbook.md` §15, `schrijfstijl.md` (wat we niet overnemen van Nova) | Publiceren is stap 5 van de cyclus in `merkstrategie.md` §17 en het zwaarste gat in §30. Zonder koppeling is "voert het werk uit" niet waar |
| **Geen echte zoekvolumes.** "Onze winbaarheidsmeting is voor dit product een beter signaal" | `logbook.md` §15 | Zonder zoekvraagdata is er geen SEO-helft. De potentiescore rust nu op een modelgok die alleen bínnen één merk vergelijkbaar is |
| **Meerdere engines geparkeerd** | `logbook.md` §3 ("Geparkeerd") en §15 (Gemini gebouwd maar slapend) | GEO gaat over AI-antwoorden, niet over de antwoorden van één leverancier. Een score op één engine is een score op één markt |

**Eén afwijzing blijft staan:** white-label rapportages. Die vraagt de visie nergens, en het is waar
de concurrentie duur wordt.

**Wat hier níet in zit en wel een besluit van jou vraagt.** De visie richt zich op organisaties met
schaal, de bouw op het MKB. Dat is geen technische keuze maar een verkoopkeuze, en hij bepaalt de
volgorde hieronder. Zie §7.

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
| Crawlplafond | 150 pagina's (`MAX_PAGES_HARD_CAP`) |
| Doorvoer werker | 5 lichte taken parallel per ronde, zware taken serieel, één aanroep per minuut |
| Budgetplafond | €50 per account per maand, €150 per dag over alles |

**Wat er werkt, van begin tot eind.** Merk aanmaken uit drie velden, onderzoekspijplijn, aanbodboom,
kennistest, 5-8 voorgestelde onderwerpen, 30 vragen per cluster, goedkeuringspoort, maandelijkse
meting met onzekerheidsmarge, concurrentievergelijking, rangordetabel, rapport met claimvalidatie,
contentbriefing met feitenkaart, schrijven met drietrapsredactie en twee poorten, contentplan van
twaalf maanden met een dagelijkse schrijfronde, potentiescore over alle onderwerpen heen, accounts,
uitnodigingen, rollen, budgetplafond en archivering.

**Wat er niet werkt, en dat zijn precies de drie punten uit de visietabel.**

| | Vandaag | De visie |
|---|---|---|
| Omvang | Alleen GEO. Search Console levert klikken per pagina, verder niets uit de SEO-kant | SEO en GEO als één geheel |
| Autonomie | Goedkeuring per stap, publiceren met de hand | Het systeem beslist en voert uit, de mens houdt richting |
| Doelgroep | MKB, plafonds en cadans op MKB afgesteld | Organisaties met meer kansen dan een team aankan |

**En één ding dat nergens in een tabel staat maar de hele keten blokkeert.** Er is nooit één pagina
echt gepubliceerd. `content_impact` heeft nul rijen, `verifyPublication()` heeft nul echte gevallen
gezien. De laatste drie stappen van de cyclus (publiceren, meten, optimaliseren) hebben dus nog nooit
met echte data gedraaid.

---

## 2. Het gat, in zeven werkstromen

### W1. Verificatieschuld

Conventie 10 zegt: gebouwd is niet geverifieerd. Er staat schuld open die nieuwe bouw onbetrouwbaar
maakt. De classificatieprompt die zichzelf "de meest load-bearing prompt van het hele product"
noemt is nooit geëvalueerd tegen het model waarop hij nu draait. De verificatieronde R8 plus S1 tot
en met S8 is nooit op productie gedraaid. En één taak per onboarding valt onverklaard terug van
`running` naar `queued`.

### W2. Publiceren

ORBIT ENGINE herkent al wélk CMS een site gebruikt (`template-detect.ts`) en levert al
WordPress-blokken op (`content-export.ts`). Wat ontbreekt is de laatste stap: er ook naartoe
schrijven. Dit is het enige gat dat, eenmaal gedicht, drie andere dingen tegelijk deblokkeert:
effectmeting, automatische publicatiecontrole en het optimaliseren van bestaande pagina's.

### W3. De SEO-helft

De grootste werkstroom, en hij valt in vier stukken die je los kunt bouwen:

1. **Meten wat er in Google gebeurt.** De koppeling met Search Console haalt nu `date` en `page` op,
   geen `query`. Daarmee ligt de hele zoekwoordkant, inclusief posities, gratis binnen handbereik.
2. **Ontdekken waar de vraag zit.** Echte zoekvolumes uit een externe bron. Dit is het enige punt in
   het hele plan dat een terugkerende rekening met zich meebrengt.
3. **De technische kant.** De audit kijkt nu alleen of AI-crawlers binnenkomen. Indexeerbaarheid,
   titels, koppenstructuur, sitemap-gezondheid, interne linkdiepte en snelheid zitten er niet in.
4. **Bestaande pagina's verbeteren.** ORBIT ENGINE schrijft alleen nieuwe pagina's. Stap 7 van de
   cyclus, "verbetert wat minder goed presteert", bestaat nog niet.

### W4. Autonomie

De poorten staan er allemaal en ze staan allemaal dicht. Autonomie is hier geen nieuwe motor maar
een schakelaar per stap, plus het enige wat autonomie draaglijk maakt: een besluitenlogboek waarin
staat wat ORBIT ENGINE deed, waarom, en hoe je het terugdraait.

### W5. Schaal

Vier harde grenzen die bij tien MKB-klanten niet opvallen en bij één webshop met duizend
categoriepagina's meteen. Het crawlplafond van 150. De doorvoer van de werker. Het budgetplafond van
€50 per maand, terwijl 50 clusters alleen aan meting al ~€43 per maand kosten. En een meetcadans die
voor elk cluster maandelijks is.

### W6. Meer AI-antwoordsystemen

De enginelaag staat er, Gemini slaapt. Het stuk dat expliciet niet gebouwd is, staat als stappenplan
in `lib/jobs/queue.ts`: de meetplanning per engine. Zonder dat telt elke vraag dubbel in de score
zodra er een tweede engine meedoet.

### W7. Merk en vormgeving

Geen code-werkstroom maar hij bepaalt wel wat er in code moet gebeuren. Het designsysteem is
afgeleid van de concurrent (`designsystem.md` §9b). Zolang jij daar geen uitspraak over doet, bakt
elke volgende UI-wijziging die afgeleide verder in.

---

## 3. De sprints, op volgorde

**Drie fases.** Fase A maakt waar wat het product vandaag al belooft. Fase B bouwt de tweede helft
van de propositie. Fase C maakt het schaalbaar en autonoom. Werkstroom W7 loopt er dwars doorheen en
wacht op jou.

⚠️ **De doorlooptijd wordt niet bepaald door bouwtijd maar door wachttijd.** Effect meten na
publicatie gebeurt in golven van 30 en 60 dagen. Sprint 1 moet daarom vroeg starten, ook al is hij
niet de grootste. De kolom "wachttijd" hieronder is de tijd die verstrijkt vóórdat een sprint
geverifieerd kan heten, en die tijd loopt door terwijl je aan de volgende sprint werkt.

| # | Sprint | Fase | Bouwtijd (schatting) | Wachttijd | Blokkeert |
|---|---|---|---|---|---|
| 0 | De schuld inlossen | A | 1 dag | geen | alles |
| 1 | Publiceren zonder handwerk | A | 3-4 dagen | 60 dagen | 5, 6 |
| 2 | De SEO-meetlaag | B | 2-3 dagen | 14 dagen | 3, 5 |
| 3 | Kansen uit echte zoekvraag | B | 3-4 dagen | geen | 8 |
| 4 | De technische kant van SEO | B | 2-3 dagen | geen | niets |
| 5 | Bestaande pagina's verbeteren | B | 4-5 dagen | 30 dagen | 6 |
| 6 | Autonomie | C | 3-4 dagen | 30 dagen | niets |
| 7 | Meer AI-antwoordsystemen | C | 3 dagen | 1 meetronde | niets |
| 8 | Schaal | C | 4-5 dagen | 1 volle keten | niets |
| 9 | Eigen vormgeving | doorlopend | 1-2 dagen | jouw besluit | niets |

De bouwtijdschattingen zijn afgeleid van wat dit project eerder deed: de appstructuur was zeven
fases op één dag, de acht Nova-fases waren twee dagen. Ze zeggen niets over kalendertijd, want de
verificatie is het langzame deel.

---

### Sprint 0. De schuld inlossen

**Waarom eerst.** Er is geen zin in nieuwe rondes op een keten waarvan de vorige ronde niet is
nagerekend. Dit is de goedkoopste sprint van allemaal en hij bepaalt of de cijfers waarop de rest
leunt kloppen.

**Claude Code doet:**

- `npm run eval:mention -- --compare` draaien, drempel 90%. Valt hij lager uit, dan is de
  mention-prompt bijstellen het eerste werk van deze sprint en niet iets voor later.
- De verificatieronde uit [`verificatie-r8-s8.md`](./verificatie-r8-s8.md): vijf testcases, twee
  pagina's per case, ~$2. Uitkomst naar `logbook.md` §8, daarna dat taakbestand verwijderen.
- De doorlooptijd van één `content_draft` meten. Past hij ruim binnen `TIMEOUT_MS` (100 s), dan gaat
  de redeneerinspanning voor content van `medium` naar `high` in `lib/openai/sampling.ts`. Dat is
  gratis kwaliteitswinst op de duurste stap van het product.
- Loggen rond de taak die van `running` naar `queued` terugvalt (`lib/jobs/worker.ts`). Eerst
  waarnemen, dan pas repareren. Dit is het verschil tussen de 7,5 minuut die je in een demo belooft
  en 12 minuten.
- Een ketentestscenario voor de aggregatiestap van `measure.ts`. Dat gat staat met naam in
  `architecture.md` §5 en het maakt elke wijziging aan de meetkant riskanter dan nodig.

**Jij doet, buiten Claude Code om:**

1. **Een Google-serviceaccount aanmaken** in Google Cloud, met de Search Console API aan. Download
   de JSON-sleutel. Claude Code kan hem daarna zelf in Vercel zetten, maar hij kan hem niet
   aanmaken.
2. **Het e-mailadres van dat serviceaccount bij één klant toevoegen** aan zijn Search
   Console-property, met het recht "Beperkt". ORBIT ENGINE vraagt alleen leesrecht.
3. **Kiezen welke klant als eerste een pagina echt publiceert.** Van den Udenhout heeft twee
   geschreven pagina's klaarstaan. Zolang er nul gepubliceerde pagina's zijn, is een derde van de
   cyclus onbewezen.
4. **~$5 aan API-budget vrijgeven** voor de verificatiecalls.

**Klaar als:** de evaluatie op of boven 90% staat, de verificatieronde in het logboek is verwerkt,
en `search_console_days` rijen bevat voor minstens één echte property.

---

### Sprint 1. Publiceren zonder handwerk

**Waarom nu.** Dit is punt 1 uit `merkstrategie.md` §30, het enige met ernst "hoog" dat een
controleerbare productclaim is. En het is de flessenhals: effectmeting, publicatiecontrole en het
optimaliseren van bestaande pagina's wachten er alle drie op.

**Claude Code doet:**

- **Migratie `0060`:** `cms_connections` (merk, soort, basis-URL, gebruikersnaam, verwijzing naar het
  geheim in Supabase Vault, status, laatste fout, geverifieerd op) en op `content_pieces` de kolommen
  `cms_post_id`, `cms_url` en `publish_method` (`handmatig` of `cms`).
  ⚠️ Het wachtwoord van de klant gaat in **Supabase Vault**, niet in een gewone kolom. Vault wordt al
  gebruikt voor de cron-geheimen, dus het patroon staat er.
- **`lib/cms/`**, naar het patroon van `lib/engines/`: `types.ts`, `wordpress.ts`, `registry.ts`. Een
  adapter doet mee als er een werkende koppeling is, anders niet, en dat is de normale toestand en
  geen storing.
- **Een nieuw jobtype `publish_page`** (conventie 7: een nieuwe zware stap wordt een eigen jobtype).
- **De bestaande export is de payload.** `buildTemplateExport()` levert al Gutenberg-blokken op. Die
  gaan nu de WordPress-API in in plaats van een downloadknop.
- **Herpubliceren overschrijft.** Een nieuwe versie schrijft naar dezelfde `cms_post_id` in plaats
  van een tweede pagina te maken. Zonder die regel levert sprint 5 duplicaten op, en dat is precies
  wat de duplicatiepoort in eigen huis moet voorkomen.
- **Route en poorten:** publiceren loopt via de bestaande route met eigenaarscontrole en kostenrem
  (conventie 6). Publiceren is onomkeerbaar en wordt vooraf als zodanig benoemd (kwaliteitslat K4).
- **Schermen:** Instellingen → Koppelingen krijgt een CMS-blok naast Search Console. De
  publicatiekaart krijgt een knop naast het handmatige URL-veld, dat blijft bestaan voor klanten
  zonder koppeling.
- **Documentatie in dezelfde ronde:** `architecture.md` §3 en §5 stap 17, `supabase/README.md`,
  `merkstrategie.md` §30 (punt 1 vervalt), `README.md` (uit de lijst "bewust niet gebouwd"), en
  `schrijfstijl.md`, waar nu nog staat dat de copy nergens een koppeling belooft.

**Jij doet, buiten Claude Code om:**

1. **Kies de eerste WordPress-klant** en vraag een applicatiewachtwoord aan met de kleinst mogelijke
   rol. Auteur volstaat als ORBIT ENGINE als concept publiceert, Redacteur als hij direct live mag.
   Begin met concept.
2. **Leg contractueel vast wie waarvoor tekent.** Een systeem dat zelfstandig op de site van een
   klant schrijft is een aansprakelijkheidsvraag, geen functievraag. Dit is het moment om dat te
   regelen, niet na de eerste fout.
3. **Bepaal of Shopify en Webflow erbij moeten.** Dit plan bouwt alleen WordPress, omdat dat het
   grootste bereik heeft en de export er al voor bestaat. Een tweede adapter is ongeveer een dag,
   maar alleen zinvol als er een klant met dat CMS is.

**Klaar als:** één echte pagina op de site van een klant staat, aangemaakt door ORBIT ENGINE,
`verifyPublication()` groen, en `content_impact` zijn eerste rij heeft met de golf van 30 dagen
ingepland.

---

### Sprint 2. De SEO-meetlaag

**Waarom nu.** De goedkoopste helft van de SEO-belofte. Search Console geeft posities en
zoekopdrachten gratis weg, en de koppeling staat er al. De migratie van augustus zegt zelf dat
zoekopdrachten "een tweede tabel waard zijn zodra ze echt gebruikt worden". Dat moment is nu.

**Claude Code doet:**

- **Migratie `0061`:** `search_console_queries` (merk, dag, zoekopdracht, pagina, klikken,
  vertoningen, positie), met dezelfde unieke sleutel-aanpak als `search_console_days`, want Google
  herziet de cijfers van de afgelopen dagen nog na.
- **`lib/search-console/sync.ts`** krijgt een tweede aanroep met `dimensions: ["date", "query",
  "page"]`, met paginering. De bestaande dagelijkse `gsc_sync`-taak doet het werk, er komt geen
  tweede cron bij.
- **`lib/search-console/rankings.ts`**, puur en dus testbaar (conventie 2): de positieverdeling,
  "op het randje" (positie 8 tot 20, waar één zet het meeste oplevert), dalers over twee vensters, en
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

### Sprint 3. Kansen uit echte zoekvraag

**Waarom nu.** Hierna is de potentiescore een gemeten getal in plaats van een gekalibreerde
inschatting, en pas dan klopt de zin "ORBIT ENGINE ontdekt relevante zoekvraag en long-tail kansen".

⚠️ **Dit is de enige sprint met een terugkerende rekening**, en hij begint met een besluit van jou.

**Jij besluit eerst, buiten Claude Code om:**

| Optie | Kosten | Voordeel | Nadeel |
|---|---|---|---|
| **DataForSEO** (aanbevolen) | betalen per aanroep, geen abonnement, tientallen euro's per maand bij dit volume | Nederlandse data, geen minimum, past bij een portefeuille die nog groeit | Nog een leverancier om te beheren |
| **Google Ads Keyword Planner** via de API | gratis | Van de bron zelf | Vereist een Ads-account met echte uitgaven, anders krijg je alleen brede bandbreedtes in plaats van getallen |
| **Semrush of Ahrefs** | vanaf ~€100 tot €500 per maand | Rijkere data, ook concurrentiedata | Abonnementsprijs die niet meebeweegt met het aantal klanten |

**Lees de voorwaarden na vóór je tekent.** Sommige leveranciers verbieden het doorgeven van hun
zoekvolumes aan derden, en dat is precies wat dit product doet: het toont ze aan de klant. Dat is een
juridische controle, geen technische.

**Claude Code doet, zodra de bron gekozen is:**

- **Migratie `0062`:** `keyword_demand` als cache per land, taal en zoekterm (volume, concurrentie,
  cpc, bron, opgehaald op), `profile_keywords` als koppeling naar merk en cluster, en op
  `profile_topics` een kolom `volume_source` (`model` of `meting`). Die laatste kolom is de
  belangrijkste van de drie: zonder hem laat het scherm ooit een gok voor een meting doorgaan.
- **`lib/search-demand/`** als leverancierslaag naar het patroon van `lib/engines/`. Zonder sleutel
  gedraagt de app zich exact zoals nu. Dat is geen degradatiepad maar de normale toestand.
- **`lib/pipeline/search-demand.ts`** (bestaat al voor de potentiescore) verankert de
  zoekvolume-index aan echte volumes waar die er zijn, en blijft schatten waar niet.
- **Nieuw jobtype `keyword_discovery`:** uit de aanbodboom, de zoekopdrachten uit sprint 2 en de
  bestaande onderwerpen een zoektermenlijst afleiden, volumes ophalen, clusteren.
- **Schermen:** Clusters en het contentplan tonen echte volumes met hun herkomst erbij.

**Klaar als:** op de vijf regressie-analyses de modelgok naast het echte volume ligt, met de
afwijking opgeschreven. Dat cijfer is meteen het antwoord op de vraag hoe fout de gok was, en het
hoort in het logboek.

---

### Sprint 4. De technische kant van SEO

**Waarom nu.** De goedkoopste sprint met het meeste demo-effect, en hij kost nul AI-geld. Alles
hieronder is deterministisch en hoort dus in de tabel "Bewust géén AI" van `architecture.md` §6.

**Claude Code doet:**

- **Migratie `0063`:** `page_issues` (merk, URL, soort, ernst, bewijs, gezien op) en een SEO-facet
  op `technical_audits`.
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

### Sprint 5. Bestaande pagina's verbeteren

**Waarom nu.** Dit is stap 7 van de cyclus, en de enige stap die vandaag helemaal niet bestaat.
ORBIT ENGINE schrijft alleen nieuw. Voor een klant met een bestaande site van duizend pagina's is
verbeteren bijna altijd meer waard dan toevoegen.

**Claude Code doet:**

- **Migratie `0064`:** op `content_pieces` de kolommen `rewrite_of_url` en `rewrite_reason`, plus een
  tabel `internal_link_suggestions`.
- **`lib/pipeline/decay.ts`**, puur: welke bestaande pagina zakt. Op basis van de dag- en
  zoekopdrachtdata uit sprint 2, over twee vensters, met dezelfde onzekerheidsredenering als
  `period-change.ts`. Een daling die binnen de ruis valt is geen daling.
- **Nieuw jobtype `optimize_page`:** de bestaande pagina ophalen, tegen de feitenkaart en de meting
  leggen, en een herschrijfvoorstel maken via dezelfde drietrapsredactie en dezelfde twee poorten die
  nieuwe content al doorlopen. Geen tweede schrijfpad, want dan lopen de kwaliteitsregels uit elkaar.
- **Interne links:** deterministisch matchen met `page-relevance.ts`, en één AI-aanroep voor de
  ankertekst. Publiceren via de adapter uit sprint 1.
- **De lus terug in het plan:** een pagina die na 60 dagen niets deed leidt tot een voorstel, een
  onderwerp dat wél werkte krijgt meer ruimte. Dat staat als fase 6 in `roadmap.md` te wachten op de
  eerste publicatie, en die is er na sprint 1.

**Jij doet:** goedkeuren per herschreven pagina, zolang de autonomie uit staat. Sprint 6 verandert
dat.

**Klaar als:** één bestaande pagina van een klant is herschreven, gepubliceerd via de koppeling, en
na 30 dagen in `content_impact` een uitkomst heeft.

---

### Sprint 6. Autonomie

**Waarom nu en niet eerder.** Autonomie zonder werkende publicatie is autonomie over niets. En
autonomie zonder effectmeting is een systeem dat zelfstandig handelt zonder te weten of het werkt.
Daarom staat deze sprint achter 1 en 5.

**Claude Code doet:**

- **Migratie `0065`:** op `profiles` vier kolommen, `autonomy_meten`, `autonomy_schrijven`,
  `autonomy_publiceren` en `autonomy_optimaliseren`, elk met drie standen: `voorstellen`,
  `uitvoeren_met_melding`, `uitvoeren`. Plus een tabel `decisions` (merk, soort, samenvatting,
  bewijs, genomen op, teruggedraaid op, door wie).
- **`lib/autonomy.ts`**, puur: mag deze stap zelfstandig. Eén plek, want de poort zit nu op vijf
  plekken in de pijplijn hardgecodeerd. Elke poort leest die module in plaats van zelf te beslissen.
- **Het besluitenlogboek als scherm.** Dit is het onderdeel dat autonomie verkoopbaar maakt: niet dat
  ORBIT ENGINE zelfstandig handelt, maar dat je achteraf precies ziet wát hij deed, waarom, en met
  welke knop je het terugdraait.
- **Een wekelijkse samenvatting per mail.** Resend staat er al, `EMAILS_ENABLED` is de schakelaar.
- ⚠️ **De kostenrem blijft staan.** Besluit 18 (alleen de beheerder start betaald werk) en de twee
  budgetplafonds veranderen niet. Autonomie verschuift wie er klikt, niet of er een plafond is. Een
  systeem dat zelfstandig geld uitgeeft zonder plafond is geen autonomie maar een lek.

**Jij doet:** per klant in het contract vastleggen welke standen er gelden. Autonomie is tegelijk je
sterkste verkoopargument en je grootste aansprakelijkheid, en het is een verkoopbeslissing per klant
en niet een productinstelling voor iedereen.

**Klaar als:** één merk een volledige maand op `uitvoeren_met_melding` heeft gedraaid zonder dat er
iets live ging dat niet door de bestaande poorten kwam.

---

### Sprint 7. Meer AI-antwoordsystemen

**Claude Code doet:**

- **De meetplanning per engine**, het stuk dat bewust niet gebouwd is en waarvan het stappenplan al
  in `lib/jobs/queue.ts` staat, op de plek waar het moet gebeuren.
- **Migratie `0066`:** aggregatie per engine, zodat er een score per engine bestaat naast de
  gecombineerde. Zonder deze stap telt elke vraag dubbel zodra er een tweede engine meedoet, en dat
  maakt de score stil onwaar.
- **Gemini wakker maken**, en een Perplexity-adapter erbij als je die sleutel neemt.
- **Scherm:** zichtbaarheid per engine. Het verschil tussen twee engines is zelf een inzicht: word je
  in de ene wel en de andere niet genoemd, dan zegt dat iets over welke bronnen elk systeem gebruikt.
- ⚠️ **De grens die op het scherm hoort.** Een antwoord via de API is niet hetzelfde als wat een
  gebruiker in de app van die aanbieder ziet. We meten een benadering. Dat geldt vandaag al voor
  engine één, maar met meerdere engines wordt het een vraag die klanten gaan stellen.

**Jij doet:** `GEMINI_API_KEY` en eventueel een Perplexity-sleutel aanschaffen, en akkoord geven op
het kostengevolg. **Twee engines is twee keer $0,855 per meetronde.** Dat is een prijskaartvraag, geen
technische.

**Klaar als:** één meetronde op twee engines gedraaid is, met de scores naast elkaar en de
gecombineerde score nagerekend tegen `ai_calls`.

---

### Sprint 8. Schaal

**Waarom als laatste.** Elk punt hieronder is een plafond dat je pas raakt met een grotere klant.
Ze nu weghalen is bouwen voor een klant die er nog niet is. Ze níet weghalen vóór die klant er is,
betekent dat de eerste grote klant het plafond ontdekt in plaats van jij.

**Claude Code doet:**

- **Het crawlplafond.** `MAX_PAGES_HARD_CAP` van 150 naar een budget per merk, met sitemap-sampling
  voor grote webshops: een steekproef per categorie in plaats van alles ophalen. Bij duizenden
  pagina's is volledigheid niet het doel, representativiteit wel.
- **De doorvoer.** De werker claimt vijf lichte taken per ronde en draait zware taken serieel, één
  aanroep per minuut. Dat is het plafond bij tientallen clusters per merk. Opties, in volgorde van
  eenvoud: een prioriteitsveld op `jobs`, een tweede pg_cron-taak, meerdere werker-aanroepen naast
  elkaar.
- **Meetcadans per cluster.** Niet elk onderwerp hoeft maandelijks. Een stabiel onderwerp per
  kwartaal meten scheelt direct geld en zegt niets minder.
- **Migratie `0067`:** pakketten met eigen plafonds. `MONTHLY_BUDGET_EUR` van €50 is een MKB-getal.
  Bij 50 clusters kost alleen de meting al ~€43 per maand, en dan is er nog niets geschreven.
- **Bulkacties nakijken.** Ze bestaan, maar zijn op tien pagina's getest en niet op honderd.

**Jij doet:**

1. **Vercel Pro.** Het Hobby-plan staat twee cron-taken toe, elk hoogstens dagelijks, en die twee
   zijn bezet. Meer doorvoer betekent een ander plan.
2. **Het Supabase-plan** nakijken op verbindingen en opslag.
3. **De prijskaart per pakket.** Dit is de kern van deze sprint en het is geen technisch werk: de
   kosten per klant schalen mee met het aantal clusters, het aantal engines en het aantal pagina's.
   Zolang de prijs dat niet volgt, kost je beste klant je het meeste geld.

**Klaar als:** één merk met 25 clusters volledig door de keten is, met de doorlooptijd en de kosten
nagerekend tegen `ai_calls`.

---

### Sprint 9. Eigen vormgeving (doorlopend, jij bent aan zet)

**Dit is de enige sprint waar Claude Code niet mee kan beginnen.** `designsystem.md` §9b zegt precies
wat er nodig is, in deze volgorde:

1. **Een uitspraak van jou** of het uiterlijk eigen moet worden. Zolang die uitspraak er niet is,
   bakt elke volgende UI-wijziging de afgeleide van de concurrent verder in.
2. **Als het antwoord ja is: een merktoolkit van een ontwerper.** Logo, kleurenpalet, typografie.
   `merkstrategie.md` §27 heeft de volledige lijst van veertig assets. Zonder die drie is er niets om
   het huidige systeem door te vervangen.
3. **Dan pas Claude Code:** de merklaag in `app/globals.css` en `docs/designsystem.md`. Dat is werk in
   de tokens en niet in de componenten, precies omdat de regel "een kleur heeft een betekenis, geen
   naam" consequent is toegepast. Eén tot twee dagen, geen herbouw.

**Klaar als:** dezelfde schermen een nieuwe merklaag dragen zonder dat er één component is aangepast.

---

## 4. Jouw takenlijst buiten Claude Code, op één plek

Dit is de volledige lijst. Alles wat er niet in staat, kan Claude Code zelf.

| # | Wat | Voor sprint | Kosten | Waarom Claude Code dit niet kan |
|---|---|---|---|---|
| 1 | Google-serviceaccount met Search Console API aanmaken, JSON-sleutel downloaden | 0 | gratis | Vraagt een ingelogde Google Cloud-console |
| 2 | Dat serviceaccount per klant aan zijn property toevoegen, recht "Beperkt" | 0, 2 | gratis | De klant moet het zelf doen of jou toegang geven |
| 3 | Kiezen welke klant als eerste een pagina publiceert | 0 | geen | Een klantafspraak |
| 4 | ~$5 API-budget vrijgeven voor de verificatieronde | 0 | ~$5 | Jouw rekening |
| 5 | WordPress-applicatiewachtwoord bij de eerste klant regelen | 1 | gratis | Loopt via de klant |
| 6 | Contractueel vastleggen wie tekent voor wat er gepubliceerd wordt | 1 | geen | Juridisch, geen code |
| 7 | Besluiten of Shopify en Webflow erbij moeten | 1 | geen | Hangt aan je klantenbestand |
| 8 | Zoekvolumeleverancier kiezen, contract, voorwaarden nalezen | 3 | vanaf ~€30 per maand | Een inkoopbeslissing met een juridische kant |
| 9 | PageSpeed Insights API-sleutel aanmaken | 4 | gratis | Google Cloud-console |
| 10 | Per klant de autonomiestanden contractueel vastleggen | 6 | geen | Verkoop, geen instelling |
| 11 | `GEMINI_API_KEY` en eventueel Perplexity, plus akkoord op dubbele meetkosten | 7 | ~$0,85 extra per meetronde per engine | Jouw rekening |
| 12 | Vercel Pro en het Supabase-plan | 8 | ~$20 per maand en hoger | Jouw abonnement |
| 13 | Prijskaart per pakket herzien | 8 | geen | De belangrijkste beslissing in dit hele document |
| 14 | Uitspraak over `designsystem.md` §9b | 9 | geen | Een eigenaarsbesluit |
| 15 | Merktoolkit bij een ontwerper laten maken | 9 | offerte | Geen code |
| 16 | Cases met echte cijfers en toestemming van de klant | doorlopend | geen | `merkstrategie.md` §21.2 noemt twee cases die nergens in dit systeem voorkomen |

**Wat Claude Code wél zelf kan, zodat je er niet op wacht:** migraties toepassen op productie,
deploys controleren, logs lezen, env-variabelen in Vercel plaatsen zodra jij de waarde hebt,
Supabase-query's draaien om cijfers na te rekenen, en alle code, tests en documentatie. De grens ligt
consequent bij drie dingen: een account aanmaken bij een externe partij, iets betalen, en iets met
een klant afspreken.

---

## 5. Wat er per sprint uit `merkstrategie.md` §30 verdwijnt

§30 is de lijst met verschillen tussen wat het merkverhaal belooft en wat de app doet. Die lijst
hoort korter te worden naarmate er gebouwd wordt, en dit is wanneer.

| §30 | Wat er nu niet klopt | Verdwijnt na |
|---|---|---|
| 1 | ORBIT ENGINE publiceert via het CMS | **sprint 1** |
| 2 | SEO én GEO als één geheel | **sprint 2 tot en met 5**, en pas na 5 helemaal: meten alleen is nog geen uitvoering |
| 3 | Doelgroep is schaal | **sprint 8**, en dan nog alleen als de prijskaart meebeweegt |
| 4 | Het systeem beslist en handelt autonoom | **sprint 6** |
| 5 | Neutral-first zonder gloed en gradient | **sprint 9**, en dat wacht op jouw uitspraak |

Bij elke sprint hoort dus ook een aanpassing in `visie.md` (de tabel onderaan), `merkstrategie.md`
§30, `README.md` (de lijst "bewust niet gebouwd") en `schrijfstijl.md` (wat we niet overnemen van
Nova). Dat zijn vier plekken die vandaag alle vier hetzelfde zeggen, en die na elke sprint alle vier
moeten meebewegen. Anders belooft de app iets dat de documentatie ontkent, of andersom.

---

## 6. Wat dit plan bewust niet doet

- **Geen white-label rapportages.** De visie vraagt er nergens om.
- **Geen tweede schrijfpad.** Bestaande pagina's verbeteren gebruikt dezelfde redactie en dezelfde
  poorten als nieuwe pagina's. Twee paden lopen gegarandeerd uit elkaar.
- **Geen eigen ranktracker.** Search Console geeft posities gratis. Een eigen tracker bouwen is
  maanden werk om een cijfer te krijgen dat je al hebt.
- **Geen Google Analytics-koppeling.** Dat onderscheid is overgenomen van InSpace en het is het
  juiste: Search Console wel, Analytics niet. Analytics is een gesprek met de klant, geen integratie.
- **Geen meertaligheid en geen donkere modus.** Besluit 13 en besluit 17, allebei geschrapt en niet
  uitgesteld.
- **Geen herbouw van de vormgeving.** Sprint 9 vervangt een merklaag, meer niet.

---

## 7. Risico's en aannames, eerlijk opgeschreven

**1. De prijskaart is het echte knelpunt, niet de techniek.** Een meetronde kost $0,855. Een klant
met 50 clusters kost ~€43 per maand aan meting alleen, plus content op het duurste model. Het huidige
plafond is €50 per account per maand. Elke sprint hierboven maakt het product waardevoller én
duurder per klant. Als er één ding vóór sprint 8 moet gebeuren in plaats van erin, is het dit.

**2. Autonomie en het verdienmodel trekken aan elkaar.** Het product is sales-led, en het uur
consultancy is onderdeel van de verkoop. Hoe autonomer het systeem, hoe minder er te bespreken valt.
Dat is geen argument tegen autonomie, wel een argument om het per klant te verkopen in plaats van als
productstand. Sprint 6 is daar op ontworpen.

**3. De doelgroepverschuiving is niet gratis.** De hele app is gebouwd rond een merk met een
overzichtelijke site: 150 pagina's crawlen, 5-8 onderwerpen, 30 vragen per onderwerp. Een webshop met
duizend categorieën vraagt een ander soort onderzoek, niet alleen een hoger plafond. Sprint 8 haalt
de plafonds weg. Of de aanpak zelf klopt voor die klant, blijkt pas bij de eerste.

**4. Zoekvolumedata mag je misschien niet doorgeven.** Zie sprint 3. Dit is een contractcontrole en
hij kan de leverancierskeuze omgooien.

**5. We meten nog steeds een benadering.** Wat ORBIT ENGINE meet is wat een model via de API
antwoordt, niet wat een gebruiker in de app van die aanbieder ziet. Dat geldt vandaag ook al. Met
meerdere engines wordt het een vraag die klanten gaan stellen, en het antwoord hoort op het scherm te
staan voordat iemand het vraagt.

**6. Alles hierboven leunt op vijf regressie-analyses van 30 juli 2026.** Coolblue, Bol, HEMA, Van
der Valk en Fysi-Unique. Dat is de enige echte data waartegen dit project zijn wijzigingen toetst.
Voor de SEO-kant bestaat zo'n set nog niet: die begint pas te ontstaan zodra Search Console voor
meerdere klanten data levert. Tot die tijd is elke SEO-uitkomst geverifieerd op één property, en dat
is dun.

---

## 8. Hoe je hiermee werkt

**Per sprint, in deze volgorde:** eerst de taken uit §4 die bij die sprint horen, dan de bouw, dan de
verificatie op productie, dan de documentatie. Een sprint zonder verificatie op echte data telt niet
als af (conventie 10), en een sprint waarvan de documentatie niet is bijgewerkt levert precies de
wildgroei op die dit project eerder heeft moeten opruimen.

**De vier controles blijven per commit gelden:** `npx tsc --noEmit`, `npm run test:unit`,
`npm run test:chain`, `npm run build`.

**Dit document is tijdelijk.** Elke afgeronde sprint wordt hier weggehaald en samengevat in
`logbook.md`, met de datum en het cijfer dat hem droeg. Staat er niets meer in, dan is de afstand
tussen `visie.md` en de app nul en kan het bestand weg.
