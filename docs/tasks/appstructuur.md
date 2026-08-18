# Appstructuur: de zijbalk en de schermen opnieuw ingedeeld

**Opgesteld:** 17 augustus 2026. **Status: plan, goedgekeurd, nog niet gebouwd.**

> **Dit document is een uitvoeropdracht, geen notitie.** Het is geschreven zodat een sessie die
> verder niets van dit traject weet het van begin tot eind kan uitvoeren. Alle achtergrond die
> daarvoor nodig is staat erin: de besluiten met hun reden, de blokken per scherm, de tabellen en
> kolommen die de data leveren, de bestaande functies die je moet hergebruiken, en per fase wat er
> geverifieerd moet worden.
>
> Zodra een fase af is, verdwijnt hij hier en wordt hij samengevat in `docs/logbook.md`. Is alles
> gebouwd, dan gaat dit bestand weg en verhuist het waarom naar `docs/ux-design.md` §5.

---

## 0. Hoe je dit document uitvoert

**Lees eerst deze vier bestanden**, in deze volgorde. Ze bepalen samen wat "goed" betekent in dit
project en dit document herhaalt ze niet:

1. `CLAUDE.md`, de werkinstructie. Let op de tien code-conventies en de schrijfregels
2. `docs/ux-design.md`, hoe je een scherm bouwt. §1 productregels, §4 lege staten en fouten, §5 de
   huidige navigatie, §7 responsive
3. `docs/schrijfstijl.md`, hoe de teksten klinken
4. `docs/architecture.md` §6 als je aan de meetkant of de kosten komt

**Vaste afsluiting van elke fase**, alle vier groen, geen uitzonderingen:

```bash
npx tsc --noEmit
npm run test:unit
npm run test:chain
npm run build
```

Plus de twee kleurcontroles uit `docs/ux-design.md` §2 regel 1, die nul regels moeten geven:

```bash
grep -rnE "#[0-9a-fA-F]{6}\b" app components lib --include="*.tsx" --include="*.ts" \
  | grep -v themeColor | grep -v "lib/email/"
grep -rnE "rgba?\([0-9]" app components lib --include="*.tsx" --include="*.ts" | grep -v "lib/email/"
```

En de twee schrijfcontroles (geen gedachtestreepjes, zie `docs/schrijfstijl.md` richtlijn 10).

**Volgorde.** De fases zijn afhankelijk van elkaar en moeten op volgorde. Fase 1 legt het spoor,
fase 7 ruimt op. Elke fase laat de app werkend achter en is los te deployen.

**Verwachting over doorlooptijd.** Zeven fases in één sessie is ambitieus. De fasegrenzen zijn
bewust de plek waar je kunt stoppen en later hervatten: na elke fase is de app compleet, groen en
deploybaar. Werk je in meerdere sessies, begin dan met deze paragraaf en de fase waar je gebleven
bent.

**Eén regel die alles overstemt.** Dit plan verandert de indeling van bestaande functionaliteit en
voegt op vier plekken iets toe. Het verandert **niets** aan de pijplijn, de meting, de kosten of de
AI-aanroepen. Kom je in de verleiding daar iets te "verbeteren", doe het niet, en meld het.

---

## 1. Aanleiding

Gebruikers noemen de indeling van de schermen en het menu onoverzichtelijk. Dat is geen indruk maar
een meetbare toestand:

- De zijbalk toont een klant **7 regels die uitklappen naar 15 bestemmingen**. Eén van die regels,
  "Mijn merk", heeft er in zijn eentje **negen**. Het commentaar in `lib/nav.ts` noemt die groep
  zelf al "de vergaarbak die dit oplost alleen verticaal"
- **Alle 27 velden** van de merkprofiel-wizard (`/profielen/[id]/merkprofiel`) staan óók in het
  profielgegevens-scherm (`/profielen/[id]/profielgegevens`, 41 velden). Twee menu-items, twee
  schermen en twee opslagroutes voor dezelfde gegevens, waarvan het ene scherm een deelverzameling
  van het andere is
- Er zijn **26 schermen** en er is **geen enkele startpagina**. `/analyses` doet half dienst als
  dashboard, het merkdossier doet de andere helft. Wie inlogt weet niet waar hij moet beginnen
- Content staat **per cluster** in een eigen bibliotheek. Een klant met vier clusters heeft vier
  bibliotheken en nergens een overzicht van wat hij heeft gekocht

Dit is de tweede ronde op hetzelfde probleem. In augustus is het merkdossier al opgesplitst van 525
regels naar tien subpagina's, nadat een klant bij Gasservice Brabant het scherm een vergaarbak
noemde. Die splitsing loste de paginalengte op en verplaatste het probleem naar de zijbalk. Deze
ronde lost de indeling zelf op.

---

## 2. De besluiten die dit plan dragen

Vastgelegd door de eigenaar op 17 augustus 2026. **Draai geen van deze besluiten terug zonder
overleg**; ze zijn met argumenten genomen en de reden staat erbij.

| # | Besluit | Wat het uitsluit |
|---|---|---|
| **1** | **Het clusterdossier blijft heel.** De vier hoofdstukken (Stand, Bewijs, Werk, Resultaat) blijven één scherm in vaste leesvolgorde. De vijf menu-hoofdstukken zijn ingangen op merkniveau, geen ontleding van het dossier | Het dossier opknippen. Dat zou de herstructurering van augustus terugdraaien, waarbij één stuk werk juist ophield vier schermen te kruisen |
| **2** | **De merk-werkruimte blijft het uitgangspunt.** Alle hoofdstukken gaan over het gekozen merk. "Alle merken" verdwijnt als menu-item en verhuist naar de merkkiezer | Portfolio-eerst. Dat kost een klant met één merk een extra klik bij elke sessie |
| **3** | **Analytics toont alleen wat echt gemeten wordt** | Zoekwoordniveau en een tweede AI-engine. Zie §8 |
| **3b** | **De Search Console-schermen worden volledig gebouwd**, inclusief grafieken, ook al is de Google-sleutel er nog niet. Die sleutel is een losse to-do (§9) en blokkeert de bouw niet | Wachten met bouwen tot de sleutel er is |
| **4** | **De klant ziet wat ORBIT ENGINE weet en hoe zeker dat is, niet hoe ORBIT ENGINE eraan kwam.** Alles daarbuiten gaat naar Admin | Interne stof alleen wegvouwen. De klant kan het dan nog steeds tegenkomen |
| **5** | **Eén bibliotheek per merk**, met filters. Het cluster houdt zijn eigen lijst als doorklik | Vier bibliotheken bij vier clusters |
| **6** | **Clusters en Voorgestelde clusters worden één lijst**, lopende bovenaan, voorstellen daaronder op potentiescore | Twee menu-items voor twee toestanden van hetzelfde ding |
| **7** | **Techniek hoort bij Analytics**, als diagnose naast het cijfer | Techniek als instelling. De klant kijkt niet in Instellingen als hij zich afvraagt waarom zijn score laag is |
| **8** | **Nieuwe merk-gebonden adressen, oude blijven werken** via doorverwijzing | Bestaande adressen aanhouden. Dan staat "profielen" in de adresbalk van Analytics en Strategie |

### De tien aanscherpingen uit de Nova-analyse (17 augustus 2026)

Het berichtenbestand van de concurrent (`docs/nova-i18n.json`, 971 teksten in tien secties) is
uitgelezen om hun menu en pagina-indeling te reconstrueren. **Hun menu heeft vier bestemmingen:**
Overview, Strategy, Analytics, Account, plus een afgeschermde `admin`-sectie.

⚠️ **Het meeste van Nova is in dit project al overgenomen** en hoeft niet opnieuw: de drie
statuslagen (`lib/plan-status.ts` noemt Nova bij naam), de herkomstchip per veld in de
merkprofiel-wizard, de segmentfilter op het contentplan, de reservepagina's, de mijlpalen, de vijf
toonschuiven, de verboden woorden, de versievergelijking, en de bevestiging bij onomkeerbare
handelingen. **Bouw die niet opnieuw.**

Wat wél nieuw is, is hieronder verwerkt in de schermbeschrijvingen van §4. De nummers zijn die van
de besluitenlijst van 17 augustus, zodat je ze kunt terugvinden:

| # | Aanscherping | Landt in |
|---|---|---|
| 1 | Funnel-voortgang als blok (geplaatst van gepland per funnelfase) | Overzicht, fase 5 |
| 2 | Contentmix als blok (verdeling paginatypes in het plan) | Overzicht, fase 5 |
| 3 | Naast de best presterende pagina ook de **zwakst** presterende tonen | Analytics, fase 4 |
| 4 | Klikken per paginatype | Analytics, fase 4 |
| 6 | Zoeken, filteren en pagineren op de merkbrede bibliotheek | Strategie, fase 3 |
| 7 | Bulkactie "markeer alles als geplaatst" | Strategie, fase 3 |
| 8 | Herkomst onthouden op de contentdetailpagina | Strategie, fase 3 |
| 9 | Zevenstappen-wizard naar Nova's indeling, met "waar je om bekend wilt staan" als eigen stap | Merkprofiel, fase 2 |
| 10 | Nova's negen secties als inhoudsopgave voor het Admin-scherm | Admin, fase 6 |
| 11 | **Strategie vóór Analytics** in de zijbalk, zoals Nova | Fase 1 |

**Waarom 11 (de volgorde) meer is dan cosmetiek.** Wie inlogt wil weten wat hij moet doen, niet
browsen in data. Overzicht draagt het hoofdcijfer al; Analytics is verdieping, Strategie is
handelen. De wachtrij op Overzicht wijst naar Strategie, dus die hoort ernaast te staan.

---

## 3. De doelstructuur

```
[ Gasservice Brabant ▾ ]          merkkiezer, met "Alle merken" onderin

  1  OVERZICHT                    /merk/[id]
  2  STRATEGIE
       Contentplan                /merk/[id]/strategie/plan
       Clusters                   /merk/[id]/strategie/clusters
       Bibliotheek                /merk/[id]/strategie/bibliotheek
  3  ANALYTICS
       Zichtbaarheid in AI        /merk/[id]/analytics
       Zoekverkeer                /merk/[id]/analytics/zoekverkeer
       Concurrenten               /merk/[id]/analytics/concurrenten
  4  MERKPROFIEL
       Merkdossier                /merk/[id]/merkprofiel
       Bewerken                   /merk/[id]/merkprofiel/bewerken
       Vraagt jouw input          /merk/[id]/merkprofiel/input
  5  INSTELLINGEN
       Account en team            /instellingen
       Koppelingen                /instellingen/koppelingen
  ─────────────────────────────   alleen zichtbaar voor beheerders
  ADMIN
       Onboarding-inzicht         /merk/[id]/admin
       Alle merken                /beheer
       Toewijzen                  /merk/[id]/admin/toewijzen
```

**Van 7 regels met één bak van negen naar 5 regels met hooguit drie kinderen.** Het aantal
bestemmingen zakt van 15 naar 13, maar daar zit de winst niet. Elk hoofdstuk beantwoordt één vraag:

| Hoofdstuk | De vraag |
|---|---|
| Overzicht | Hoe sta ik ervoor en wat moet ik nu doen? |
| Strategie | Wat gaan we doen, en wat is er al gemaakt? |
| Analytics | Wat zeggen de cijfers, en waarom? |
| Merkprofiel | Wie ben ik volgens ORBIT ENGINE, en klopt dat? |
| Instellingen | Hoe is het ingericht? |

**Eén bewuste uitzondering op besluit 8.** Het clusterdossier blijft op `/analyses/[id]` en verhuist
niet. Een cluster is een globaal object met tien diepe routes eronder (bibliotheek, concept,
briefing, antwoorden, rapport, instellingen, contentdetail). Die allemaal verplaatsen raakt de meest
gelinkte routes van de app voor alleen cosmetiek.

---

## 4. Wat er op elk scherm staat

Dit is het hart van het document. Per scherm de blokken in leesvolgorde, met de databron erbij.
Blokken gemarkeerd met **NIEUW** bestaan nog niet; de rest verhuist of blijft.

### 4.1 OVERZICHT · `/merk/[id]`

De startpagina na inloggen. Vier vragen, in deze volgorde: hoe sta ik ervoor, wat wacht op mij, ligt
het plan op schema, waar begin ik.

| # | Blok | Inhoud | Bron |
|---|---|---|---|
| 1 | Kop | Merknaam, één duidingszin, en als er een contentplan is de periode-aanduiding "Maand {n} van 12" | `profiles`, `content_plans`, `plan_months` |
| 2 | Hoe sta je ervoor | Het hoofdcijfer met verandering, plus de drie mijlpalen: hoe lang je meedoet, hoeveel je zichtbaarheid groeide, hoeveel pagina's er staan | `visibility_scores`, `loadMilestones()` |
| 3 | Wat er nu op jou wacht | De review-wachtrij, **maximaal vijf regels** | `loadWorkAcross()`, staat `nu` |
| 4 | **NIEUW** Funnel-voortgang | Per funnelfase "3 van 8 geplaatst", met een balk. Fases in hun eigen volgorde | `profile_funnel_stages` (label, sort_order) × `planned_pages` (funnel_stage_id, posted_at) |
| 5 | **NIEUW** Contentmix | Verdeling van de geplande pagina's over de paginatypes | `planned_pages.page_type` |
| 6 | Wat ORBIT ENGINE deze week deed | Chronologische lijst van afgeronde taken | `jobs` |
| 7 | Waar begin je | De kansenlijst, gesorteerd op potentiescore | `opportunities()` uit `loadLoop()` |

**Vier regels die dit scherm eerlijk houden.**

1. **De wachtrij blijft kort, en dat is niet cosmetisch.** Deze lijst stond hier eerder en is op
   3 augustus 2026 verwijderd omdat hij bij meerdere clusters opliep tot tientallen regels in één
   kaart, waarmee het overzicht zélf de rommel werd die het moest oplossen (`docs/logbook.md` §13).
   Harde grens: maximaal vijf regels, alleen de staat `nu`, gegroepeerd per cluster, met een
   doorklik naar de rest. Zonder die grens herhalen we de fout.
2. **Blok 6 heet niet "Engine Pulse" en suggereert geen autonomie.** Het product is sales-led: de
   beheerder start betaald werk, de klant keurt per stap goed. `CLAUDE.md` verbiedt te schrijven dat
   iets al kan wat niet gebouwd is. De kop is *"Wat ORBIT ENGINE deze week deed"*, en de inhoud komt
   uit de takenwachtrij, niet uit een animatie.
3. **Blok 4 en 5 verdwijnen niet als er geen plan is.** Ze tonen dan waarom ze leeg zijn en wat de
   volgende stap is (`docs/ux-design.md` §4). Stil verdwijnen is erger dan een dood einde.
4. **Mijlpalen verhuizen hierheen vanaf het merkdossier.** `MilestonesBlock` en `InsightsBlock`
   staan nu op `/profielen/[id]`; die haal je daar weg in fase 2 en zet je hier neer in fase 5.

### 4.2 STRATEGIE

#### 4.2a Contentplan · `/merk/[id]/strategie/plan`

Verhuist ongewijzigd, met één toevoeging. Het bestaande scherm (`PlanView`, 575 regels) heeft al de
maandgroepering, de segmentfilter (actie, alles, gepland, live), goedkeuren per maand, en herordenen
met pijltjes.

- **NIEUW (punt 7): bulkactie "markeer alles als geplaatst"** per maand, naast de bestaande
  maandgoedkeuring. ⚠️ Kwaliteitslat **K5** uit `docs/logbook.md` eist dat een bulkactie eerlijk is
  over gedeeltelijk succes: lukken er 7 van de 9, dan zegt de melding dat, met welke twee niet.
  Bouw dat mee, niet erna.

#### 4.2b Clusters · `/merk/[id]/strategie/clusters`

Eén lijst waar er nu twee schermen zijn (besluit 6).

| # | Blok | Inhoud | Bron |
|---|---|---|---|
| 1 | Storingen | Mislukte clusters bovenaan in een rode kaart | `analyses.status = 'mislukt'` |
| 2 | Mijn clusters | Lopende clusters, gesorteerd op wie aan zet is, met de vier kaartcijfers | `loadDashboard()`, `AnalysisCardMetrics` |
| 3 | Voorgestelde clusters | Onderwerpen uit de nulmeting die nog niet gemeten zijn, op potentiescore | `profile_topics` |

De bestaande sorteerregel blijft: wat op de klant wacht eerst. Zie `app/(app)/analyses/page.tsx`.

#### 4.2c Bibliotheek · `/merk/[id]/strategie/bibliotheek` **NIEUW**

Alle geschreven content van het merk op één plek, over clusters heen. Dit is het eindproduct waar de
klant voor betaalt.

| # | Blok | Inhoud | Bron |
|---|---|---|---|
| 1 | Kerncijfers | Aantal geschreven, klaar voor vrijgave, gepubliceerd | `content_pieces` |
| 2 | **NIEUW (punt 6)** Filterbalk | Zoeken op titel of URL, filter op type, filter op status, filter op cluster | idem |
| 3 | Tabel | Titel, type, cluster, status, GEO-score, datum. Gesorteerd op datum aflopend | idem |

**Twee dingen die je hier goed moet doen.**

- **Paginering vanaf 25 rijen.** Nova doet dit met "toon {n} per pagina". Bij 35 pagina's op
  productie is dat nu al relevant.
- **NIEUW (punt 8): herkomst onthouden.** Een contentpagina wordt straks vanuit drie plekken
  bereikt: het clusterdossier, deze bibliotheek en het contentplan. Zonder herkomst wijst de
  terugknop altijd naar dezelfde plek. Nova lost dit op met een `origin`-parameter (`strategy` of
  `analytics`); doe hetzelfde met `?van=bibliotheek|cluster|plan` en laat de terugknop en het
  kruimelpad die volgen. Valt de parameter weg, dan is het clusterdossier de veilige terugval.

De bestaande bibliotheek per cluster (`/analyses/[id]/bibliotheek`) **blijft bestaan** als doorklik
vanuit het dossier. Dit scherm is de verzamelplek, niet de vervanging.

### 4.3 ANALYTICS

#### 4.3a Zichtbaarheid in AI · `/merk/[id]/analytics`

| # | Blok | Inhoud | Bron |
|---|---|---|---|
| 1 | Blokkade, alleen als die er is | "AI-assistenten mogen je site niet lezen", met de handeling erbij. Staat bovenaan want het verklaart het cijfer | `technical_audits.blockers` |
| 2 | De score | Zichtbaarheid over alle clusters van dit merk, met foutmarge | `visibility_scores` |
| 3 | Trendlijn | Verloop over de periodes, per cluster uitsplitsbaar | `visibility_scores` per `analysis_id` |
| 4 | Per cluster | Tabel: cluster, score, verandering, aantal metingen | `loadDashboard()` |
| 5 | Technische diagnose | De volledige audit: crawlertoegang en entiteitsconsistentie (besluit 7, verhuist van `/profielen/[id]/techniek`) | `technical_audits`, `AuditPanel` |

#### 4.3b Zoekverkeer · `/merk/[id]/analytics/zoekverkeer`

Besluit 3b: volledig bouwen, ook zolang de sleutel ontbreekt.

**Wat de tabel heeft, en dus wat je kunt tonen.** `search_console_days` bevat per rij: `profile_id`,
`day`, `page`, `clicks`, `impressions`, `position`. CTR is daaruit te rekenen (klikken gedeeld door
vertoningen) en die rekensom hoort in een pure module zodat hij te testen is (conventie 2). Wat er
**niet** in zit: zoekopdrachten, apparaten, landen. Elk voorstel voor een zoekwoordgrafiek loopt
daarom op niets uit tot de koppeling uitgebreid wordt, zie §8.

| # | Blok | Inhoud | Bron |
|---|---|---|---|
| 1 | Vier kerncijfers | Klikken, vertoningen, CTR, gemiddelde positie, elk met de verandering ten opzichte van het vorige even lange venster | `search_console_days` |
| 2 | Verloop over tijd | Klikken en vertoningen op twee assen, per dag. Op mobiel kernwaarde plus sparkline | idem |
| 3 | **Klikken naast AI-zichtbaarheid** | De kliklijn uit Google en de zichtbaarheidslijn uit de metingen in één grafiek. Het enige beeld dat het hele verhaal van het product in één keer vertelt, en waar de roadmap sinds 11 augustus op wacht | `search_console_days` + `visibility_scores` |
| 4 | **NIEUW (punt 3)** Beste en zwakste pagina | Twee kaarten naast elkaar. De zwakste is de actiegerichte helft: dat is de pagina die een herschrijving verdient, en die knop bestaat al (`revise-box.tsx`) | `search_console_days` × `content_pieces.published_url` |
| 5 | **NIEUW (punt 4)** Klikken per paginatype | Welk soort content levert verkeer op. Dit is het cijfer dat het contentplan van volgend jaar hoort te sturen | zie de waarschuwing hieronder |
| 6 | Pagina's | Tabel per pagina: klikken, vertoningen, CTR, positie, sorteerbaar. Pagina's die ORBIT ENGINE schreef krijgen een markering | `search_console_days` + `content_pieces.published_url` |

⚠️ **Twee woordenlijsten voor "soort pagina", en dat raakt blok 5 direct.** Nagerekend op productie:

- `planned_pages.page_type` bevat **informatief** (131), **categorie** (67), **dienst** (66)
- `content_pieces.type` bevat **landing** (18), **article** (15), **faq** (2)

Dat zijn twee onafhankelijke vocabulaires voor hetzelfde begrip. Kies vóór je begint welke van de
twee blok 5 gebruikt, en gebruik dezelfde in blok 5 van Overzicht (§4.1 blok 5). **Aanbeveling:**
`planned_pages.page_type`, want dat is de as waarop het contentplan zelf verdeelt, en dus de as
waarop een conclusie ook een handeling oplevert. Leg de keuze vast in een commentaarregel bij de
rekenfunctie, met deze cijfers erbij.

**Vier regels die het scherm eerlijk houden.**

1. **De grafiek in blok 3 kent twee tijdschalen.** Google levert per dag, de meting per periode. De
   zichtbaarheidslijn wordt dus getekend als punten met een lijn ertussen, niet als een doorlopende
   dagcurve die precisie suggereert die er niet is.
2. **Google splitst klikken uit AI-antwoorden niet uit.** Die zitten in het gewone totaal. Dat staat
   met zoveel woorden op het scherm, anders leest een klant de kliklijn als AI-effect.
3. **Definitieve cijfers lopen twee dagen achter.** De laatste twee dagen worden gemarkeerd als nog
   niet definitief; dat gedrag zit al in `lib/search-console/window.ts`.
4. **Geen koppeling betekent geen lege grafiek maar uitleg.** Zonder gekoppelde property toont het
   scherm wat de koppeling oplevert en de knop ernaartoe. Mislukt de synchronisatie, dan staat de
   reden er in gewone taal uit `profiles.gsc_last_error`. Beide gevallen staan nu al in de database:
   het ene merk heeft geen property, het andere heeft er wel een en een foutmelding erbij.

#### 4.3c Concurrenten · `/merk/[id]/analytics/concurrenten`

| # | Blok | Inhoud | Bron |
|---|---|---|---|
| 1 | Ranglijst | Alle merken over dezelfde noemer, met vermeldingen, positie, aandeel en citaties | `competitor_breakdown`, `lib/pipeline/brand-rankings.ts` |
| 2 | Bronnenlandschap | Welke bronnen de AI aanhaalt | `source_landscape` |
| 3 | Entiteitenbeheer | Welke genoemde merken echte concurrenten zijn (verhuist van `/profielen/[id]/concurrenten`) | `entities`, `EntitiesManager` |

⚠️ **De noemer is hier al een keer misgegaan.** `brand-rankings.ts` rekent iedereen over dezelfde
noemer omdat de balk van "Jij" eerder het percentage van de hoofdscore toonde en de concurrenten dat
van alle gemeten vragen. Gebruik die module, bouw geen tweede telling.

### 4.4 MERKPROFIEL

#### 4.4a Merkdossier · `/merk/[id]/merkprofiel`

Het leesscherm dat de consultant deelt in de demo. Geen sectie-rail: de blokken hebben geen vaste
chronologie.

| # | Blok | Inhoud | Bron |
|---|---|---|---|
| 1 | Kop | Merknaam, website, één duidingszin | `ProfileHero`, `onboardingHeadline()` |
| 2 | Het dossier | Wat ORBIT ENGINE van de site begreep, in gewone taal, met zekerheidsniveau | `profile_facets` facet `synthese` |
| 3 | Wat AI-assistenten over je weten | De nulmeting per vraag, met het letterlijke antwoord | `profile_llm_baseline`, `LlmKnowledgePanel` |
| 4 | Aanbod | Producten en diensten zoals gevonden, en welke nog geen eigen pagina hebben (verhuist van `/producten`) | `profile_offerings`, `OfferingsPanel` |
| 5 | Concurrenten | De lijst zoals de klant hem kent, lezend. Het beheer zit bij Analytics | `entities` |

⚠️ **`ProfileReadinessPanel` gaat hier wég** en verhuist naar Admin (§4.6). Het is een percentage
over werk dat de klant niet doet, en voor de consultant een verkoopinstrument ("kan ik dit scherm
delen"). Verwijder ook de springlink ernaartoe: een link naar een blok dat er niet is, is
zichtbaarder dan het blok zelf (`docs/ux-design.md` §5).

#### 4.4b Bewerken · `/merk/[id]/merkprofiel/bewerken`

**Hier voegen we twee schermen samen tot één, en dit is de fase met het hoogste risico op stille
data-verlies.** De wizardvorm wint (die is op klantfeedback ontworpen); de veertien velden die
alleen in de platte editor stonden krijgen een plek in de nieuwe stappenindeling.

**Zeven stappen, naar Nova's indeling (aanscherping 9).** Nova scheidt zes merkblokken plus een
bedrijfsblok; onze wizard had er vijf en de rest zat in een tweede scherm. De nieuwe indeling:

| # | Stap | Velden |
|---|---|---|
| 1 | **Je bedrijf** | `name`, `aliases`, `industry`, `business_model`, `service_scope`, `service_regions`, `market_language`, `sitemap_url` |
| 2 | **Je merk** | `brand_mission`, `brand_positioning`, `value_props` |
| 3 | **Je klant** | `intake_audience`, `audience_secondary`, `audience_knowledge_level`, `personas`, `differentiator`, `competitors` |
| 4 | **Hoe je klinkt** | `tone_formality`, `tone_energy`, `tone_complexity`, `tone_humor`, `tone_emotional`, `tone_of_voice` |
| 5 | **Je woorden** | `signature_phrases`, `taboo_phrases`, `pronoun_preference`, `identity_keywords`, `compliance_notes` |
| 6 | **Wie het schrijft** | `author_name`, `author_role`, `author_bio`, `author_photo_url`, `author_linkedin_url`, `author_facebook_url`, `author_other_url` |
| 7 | **Waar je om bekend wilt staan** | `usp`, `key_messages`, `proof_points`, `products`, `summary`, `intake_description` |

**Dat is 8 + 3 + 6 + 6 + 5 + 7 + 6 = 41 velden, precies de inhoud van `EDITABLE_PROFILE_FIELDS`.**
Tel dat na vóór je commit. Eén veld dat nergens landt is een veld dat de klant niet meer kan
corrigeren, en dat merkt niemand tot de volgende contentronde.

**Wat je hergebruikt en niet opnieuw bouwt:**

- `EDITABLE_PROFILE_FIELDS` in `lib/profile-editable.ts` blijft de enige lijst die bepaalt wat
  opgeslagen mag worden. Verandert die lijst niet, dan verandert de opslagroute niet
- `BRAND_FIELDS`, `STEP_META` en `STEP_ORDER` in `lib/pipeline/brand-fields.ts` breid je uit van
  vijf naar zeven stappen. Elk veld krijgt daar zijn label, uitleg en een écht voorbeeld
- De herkomstchip per veld ("van je website gehaald") bestaat al en blijft werken zolang de sleutel
  in `BRAND_FIELDS` de kolomnaam in `profiles` is. Dat is Nova's `draftedBadge`, en het is de reden
  dat de klant geen leeg formulier van veertig velden ziet maar veertig velden die hij mág nakijken
- De vijf toonschuiven met hun labels bestaan al

#### 4.4c Vraagt jouw input · `/merk/[id]/merkprofiel/input`

Feitenvragen en open punten samen, want voor de klant is dat één ding: "moet ik iets aanvullen".

| # | Blok | Inhoud | Bron |
|---|---|---|---|
| 1 | Feitenvragen | Vragen met een invulveld, met de teller in de kop | `fact_requests` waar `analysis_id is null` |
| 2 | Openstaande punten | Wat het onderzoek niet met zekerheid kon vaststellen, met per punt wat het verbetert | `profile_facets.raw_json.gaps` + `findGaps()` |

⚠️ De gespreksnotities (`StrategyBox`) die nu onderaan `/toevoegingen` staan gaan **niet** mee. Die
verhuizen naar Admin. Ze zijn nu al staff-only; die afscherming blijft, alleen de plek verandert.

⚠️ Feitenvragen die uit een specifieke analyse komen (`fact_requests.analysis_id` gezet) horen
**niet** hier maar bij hoofdstuk 03 van dat cluster. Die scheiding is op 14 augustus bewust
aangebracht; laat hem staan.

### 4.5 INSTELLINGEN

| Pagina | Inhoud |
|---|---|
| Account en team · `/instellingen` | Beveiliging (e-mail, wachtwoord), bedrijfsgegevens per account, teamleden en uitnodigingen. Ongewijzigd |
| Koppelingen · `/instellingen/koppelingen` **NIEUW** | De Search Console-koppeling: het service-account-adres, de verificatieknop, en de status per merk. Verhuist het instelgedeelte van `/profielen/[id]/search-console`; de cijfers gaan naar Analytics |

**Bewust niet overgenomen van Nova.** Nova zet de Search Console- en CMS-koppeling in de
onboardingflow, omdat hun klant die zelf invult. Bij ons zet de consultant het klaar vóór het
demogesprek, dus horen koppelingen bij Instellingen. Nova's Account-scherm heeft ook geen team en
geen pakket; het onze wel, omdat wij bureaus bedienen (besluit 9).

### 4.6 ADMIN, alleen voor beheerders

#### 4.6a Onboarding-inzicht · `/merk/[id]/admin`

⚠️ Bij een gewone gebruiker een **404 en geen 403**. Een 403 bevestigt dat het scherm bestaat. Zie
`app/(app)/beheer/page.tsx` voor het bestaande patroon.

**Aanscherping 10: neem Nova's negen secties over als inhoudsopgave**, in deze volgorde, want het is
dezelfde volgorde die de klant zelf ziet. In een demo weet je dan precies welk scherm hij voor zich
heeft, met de ruwe laag eronder:

Bedrijf · Contact · Talen · Positionering · Doelgroep · Stem · Woorden · Auteur · Onderwerpen

Daaronder de laag die de klant nooit ziet:

| Blok | Inhoud | Bron |
|---|---|---|
| Is het dossier compleet | Zes verplichte onderdelen met een stand per regel (verhuist van het merkdossier) | `ProfileReadinessPanel` |
| De acht onboardingtaken | Per taak de uitkomst en de doorlooptijd | `jobs` |
| Ruwe modeloutput per stap | De volledige JSON per aanroep | `profile_facets.raw_json`, `technical_audits.raw_json` |
| Kostenlogboek | Per aanroep model, tokens en bedrag | `ai_calls` |
| Herkomst per veld | Waar elk profielveld vandaan komt, met bewijs | `profile_field_sources` |
| Bronnenonderzoek | Het onderwerp-onderzoek achter de vragen | `topic_research` |
| Het gesprek | Notities en contextfactoren (verhuist van `/toevoegingen`) | `profile_strategy`, `StrategyBox` |

#### 4.6b Alle merken · `/beheer`

Ongewijzigd. Het bestaande CSM-paneel met de zeven segmenten.

#### 4.6c Toewijzen · `/merk/[id]/admin/toewijzen`

Ongewijzigd, alleen een ander adres.

---

## 5. Wat de klant ziet en wat alleen jij ziet

Besluit 4, uitgewerkt. De grens loopt langs `isStaff()` (`lib/staff.ts`), **niet** langs de
accountrol: het gaat om het eigen team tegenover iedereen daarbuiten. Een accountbeheerder bij een
bureau is nog steeds een klant.

**Blijft bij de klant.** Merk (naam, website, logo), aanbod, doelgroep, positionering, tone of
voice, concurrenten, belangrijkste zoekthema's, datakwaliteit als zekerheidsniveau, openstaande
vragen die áán hem gericht zijn, de technische blokkades op zijn eigen site, en het letterlijke
antwoord dat een AI-assistent gaf. Dat laatste is geen interne stof maar het sterkste bewijsstuk dat
het product heeft (`docs/ux-design.md` §1, "bewijs verslaat cijfer").

**Gaat naar Admin.**

| Wat | Waar het nu staat |
|---|---|
| Technische prompts en instructies | `prompts`, de pijplijncode |
| Interne AI-redeneringen, de ruwe JSON per aanroep | `profile_facets.raw_json`, `ai_calls` |
| Ruwe crawl- en scrapedata | `profile_pages`, `technical_audits.raw_json` |
| Interne scores die niet actiegericht zijn | `ProfileReadinessPanel` |
| Model- en API-informatie, kosten per aanroep | `ai_calls`, `/api/analyses/[id]/costs` |
| Technische onderzoeksdetails | `topic_research`, `source_landscape`, `profile_field_sources` |
| Gespreksnotities en contextfactoren | `/profielen/[id]/toevoegingen`, al staff-only |
| De takenwachtrij en mislukte taken | `jobs` |

**Het principe in één zin, over te nemen in `docs/ux-design.md`:** de klant ziet wat ORBIT ENGINE
weet, hoe zeker dat is en wat ermee moet gebeuren, niet hoe ORBIT ENGINE aan die kennis kwam.

---

## 6. Het bouwplan, zeven fases

**De zijbalk groeit mee:** een hoofdstuk verschijnt pas in het menu zodra zijn pagina's bestaan. Een
kop die naar een leeg scherm wijst is erger dan een kop die er nog niet is.

### ~~Fase 1: Fundament, adressen en doorverwijzingen~~ · AF (17 augustus 2026)

Samengevat in `docs/logbook.md`. Eén afwijking van het plan, en de reden staat daar: fase 1 heeft de
schermen zelf mee moeten verhuizen in plaats van alleen het spoor te leggen, omdat een permanente
verwijzing (308) naar een adres dat nog niet bestaat geen fundament is maar een dood einde. Daardoor
is fase 1 wél zichtbaar: de zijbalk toont nu de hoofdstukken. Wat elke volgende fase daaraan
toevoegt staat hieronder per fase.

### ~~Fase 2: MERKPROFIEL, van vijf schermen naar drie~~ · AF (17 augustus 2026)

Samengevat in `docs/logbook.md`. `ProfileReadinessPanel` staat nu nergens meer op een scherm; hij
wacht op fase 6, die hem op het Admin-scherm zet.

### ~~Fase 3: STRATEGIE~~ · AF (17 augustus 2026)

Samengevat in `docs/logbook.md`. De contentdetailpagina is nog vanaf twee van de drie plekken te
bereiken: het contentplan linkt er nog niet heen, dus `?van=plan` is wel gebouwd en getest maar nog
niet in gebruik.

### ~~Fase 4: ANALYTICS~~ · AF (17 augustus 2026)

Samengevat in `docs/logbook.md`. Eén scherm erbij dat niet in de fasering stond:
`/instellingen/koppelingen` (§4.5), omdat Zoekverkeer zonder koppeling naar een knop wijst die
ergens heen moet. De koppeling zelf is nog niet geverifieerd: dat kan pas als de Google-sleutel er
is (§9) en er één echte synchronisatie gedraaid heeft.

### Fase 5: OVERZICHT

**Bestanden:** `app/(app)/merk/[id]/page.tsx` · `lib/dashboard.ts` · `lib/insights.ts` ·
`lib/milestones.ts` · `lib/opportunities.ts` · `lib/work.ts` · twee nieuwe pure modules voor
funnel-voortgang en contentmix

Zeven blokken (§4.1), waarvan blok 4 en 5 nieuw. Daarna wordt dit de bestemming na inloggen.

**Verificatie:**
- De teller op Overzicht ("3 wachten op jou") komt overeen met wat je optelt uit de clusterdossiers.
  Draai het na op een merk met meerdere lopende clusters
- Funnel-voortgang telt bij een plan van 12 maanden op tot het totaal aantal geplande pagina's,
  reservepagina's uitgezonderd (`planned_pages.is_buffer`). Op productie staan 264 geplande
  pagina's over 2 plannen
- Beide nieuwe rekenmodules krijgen unittests

### Fase 6: ADMIN en de afscherming

**Bestanden:** `app/(app)/merk/[id]/admin/page.tsx` · `.../toewijzen/page.tsx` · `lib/nav.ts` ·
`docs/ux-design.md`

1. **Onboarding-inzicht** met Nova's negen secties plus de ruwe laag (§4.6a)
2. De blokken uit §5 die naar Admin gaan worden op de klantschermen weggehaald, **inclusief hun
   springlinks**
3. Zijbalk: de Admin-groep verschijnt onder een scheidingslijn, met het bestaande "alleen
   jij"-teken per regel

**Verificatie:** log in als klantaccount en loop alle dertien bestemmingen af. Geen enkele toont
ruwe modeloutput, een promptinstructie, een modelnaam of een bedrag. Dit is een handmatige controle,
en hij hoort in `scripts/test-chain.ts` terug te komen als scenario voor de routes die data
teruggeven.

### Fase 7: Opruimen

**Bestanden:** `app/(app)/profielen/` · `components/main-nav.tsx` · `components/profile-menu.tsx` ·
`lib/nav.ts` · `docs/ux-design.md` · `docs/logbook.md` · `CLAUDE.md`

1. De oude routes onder `/profielen/[id]/` weg, op de doorverwijzingen na
2. `NAV` (de oude platte lijst) en `MainNav` weg; die wachtten hier al op
3. `docs/ux-design.md` §5 herschreven naar de nieuwe indeling, met de tabel uit §5 hierboven
4. Een gedateerde alinea in `docs/logbook.md` met de cijfers die deze ronde droegen
5. Dit bestand weg

---

## 7. Technische naslag

Alles wat je nodig hebt om te bouwen zonder eerst de codebase te doorzoeken. **Geverifieerd op
productie op 17 augustus 2026.**

### 7.1 Er is geen enkele migratie nodig

Alle nieuwe schermen lezen uit tabellen die er al staan, en de samenvoegingen schrijven naar dezelfde
kolommen als vandaag. Dat is de belangrijkste reden dat dit in zeven losse stukken geleverd kan
worden zonder dat de app tussendoor stuk kan. Kom je tot de conclusie dat je tóch een migratie nodig
hebt, stop dan en meld het: dat betekent dat een aanname in dit plan niet klopt.

### 7.2 Tabellen en kolommen die dit plan gebruikt

| Tabel | Kolommen die ertoe doen | Rijen op productie |
|---|---|---|
| `profiles` | 41 bewerkbare velden, `gsc_property`, `gsc_last_error`, `archived_at`, `account_id` | 10 (3 actief) |
| `planned_pages` | `plan_month_id`, `page_type`, `funnel_stage_id`, `status`, `is_buffer`, `sort_order`, `posted_at`, `posted_url`, `content_piece_id` | 264 |
| `profile_funnel_stages` | `label`, `sort_order` | 4 fases per merk |
| `content_pieces` | `analysis_id`, `type`, `title`, `status`, `geo_score`, `published_url`, `version`, `is_current` | 35 (1 gepubliceerd) |
| `search_console_days` | `profile_id`, `day`, `page`, `clicks`, `impressions`, `position` | 91 (testdata) |
| `visibility_scores` | `analysis_id`, `week_no`, `score`, `score_stderr`, `weighted_score` | 14 |
| `competitor_breakdown` | `mentions_count`, `avg_position`, `first_mention_count`, `citation_count` | 343 |
| `profile_field_sources` | `field`, `source`, `confidence`, `evidence_url`, `evidence_quote` | per merk |
| `jobs` | type, status, timestamps | 682 |
| `ai_calls` | model, tokens, kosten | 1331 |

**Waardenlijsten, nagerekend:**

- `planned_pages.page_type`: `informatief`, `categorie`, `dienst`
- `planned_pages.status`: `gepland`, `ter_goedkeuring` (en verder de statussen in `lib/plan-status.ts`)
- `content_pieces.type`: `landing`, `article`, `faq`
- Funnelfases zoals een merk ze heeft: Oriëntatie, Vergelijken, Kiezen, Klant blijven

### 7.3 Bestaande functies die je hergebruikt

**Bouw geen tweede versie van deze.** Elke regel hieronder is een plek waar de app al één antwoord
geeft; een tweede telling die iets anders zegt is de fout die dit plan juist opruimt.

| Functie | Bestand | Waarvoor |
|---|---|---|
| `getProfile`, `getOwnedProfile` | `lib/profiles.ts` | Merk ophalen, gememoïseerd, met toegangscontrole |
| `getAnalysis`, `getOwnedAnalysis` | `lib/analyses.ts` | Idem voor clusters |
| `isStaff` | `lib/staff.ts` | De enige plek die bepaalt wie beheerder is |
| `loadDashboard` | `lib/dashboard.ts` | Cijfers over clusters heen plus kaartcijfers per cluster |
| `loadWorkAcross`, `loadWork`, `countNow`, `sortWork`, `groupWork` | `lib/work.ts` | Het werkmodel: staten `nu`, `loopt`, `wacht`, `klaar` |
| `loadLoop` | `lib/insights-data.ts` | Inzichten en kansen per merk, één query voor beide |
| `loadMilestones` | `lib/milestones-data.ts` | De drie mijlpaalgetallen |
| `opportunities`, `shareLabel` | `lib/opportunities.ts` | De kansenlijst, gesorteerd |
| `potentialScore`, `potentialBand`, `potentialExplanation` | `lib/potential.ts` | De potentiescore, 0 tot 100 |
| `loadPlan`, `approveMonth`, `markPosted`, `removePage` | `lib/plans.ts` | Het contentplan en zijn handelingen |
| `PLAN_STATUS_META` | `lib/plan-status.ts` | De drie statuslagen per geplande pagina |
| `STATUS_META` | `lib/analysis-status.ts` | Idem per cluster |
| `activeOnly` | `lib/archive.ts` | Gearchiveerde merken en clusters uit beeld houden |
| `syncSearchConsole`, `syncWindow` | `lib/search-console/` | De Google-koppeling en het meetvenster |
| `loadCsmBrands`, `totals` | `lib/csm-data.ts`, `lib/csm.ts` | Het beheerscherm |
| `BRAND_FIELDS`, `STEP_META`, `STEP_ORDER` | `lib/pipeline/brand-fields.ts` | De wizardvelden met label, uitleg en voorbeeld |
| `EDITABLE_PROFILE_FIELDS` | `lib/profile-editable.ts` | Wat opgeslagen mag worden |

### 7.4 Componenten die je hergebruikt

`PageHeader`, `EmptyState`, `Chapter`, `SectionRail`, `ProfileSection`, `StatusBadge`,
`ProfileStatusBadge`, `ConfidenceChip`, `InfoHint`, `LastUpdated`, `CopyButton`, `ExternalLink`,
`TrendChart`, `PotentialMetrics`, `PotentialInline`, `AuditPanel`, `EntitiesManager`,
`OfferingsPanel`, `LlmKnowledgePanel`, `MilestonesBlock`, `InsightsBlock`, `WorkList`,
`SectionErrorBoundary`, `ConfirmDialog`, `ToastProvider`, `useToast`, `Skeleton`.

Eén variant per patroon, geen lokale kopieën. Zie de tabel in `docs/ux-design.md` §3.

### 7.5 Vijf valkuilen die dit project eerder heeft geraakt

1. **Een kleur buiten `globals.css`.** Elke hexwaarde of `rgba()` in een component mist de volgende
   paletwijziging. Er stonden er ooit 30 over 17 bestanden. De twee greps in §0 houden dit tegen
2. **Twee tellingen van hetzelfde getal.** De concurrentbalken rekenden ooit met een andere noemer
   dan de eigen balk. Gebruik altijd de module uit §7.3
3. **Een lege staat die stil verdwijnt.** Een paneel zonder data toont waaróm het leeg is en wat de
   volgende stap is. Stil verdwijnen is erger dan een dood einde: de klant weet dan niet dat de
   functie bestaat
4. **Een optimistische update die niet terugdraait.** Een schakelaar die meteen van stand verandert
   moet bij een mislukte server-call de oude waarde herstellen én dat zeggen
5. **Niets is breder dan het scherm.** URL's, slugs en domeinen krijgen `.break-url`. Controle:
   `document.documentElement.scrollWidth === document.documentElement.clientWidth` op 390px breed

---

## 8. Wat we bewust niet bouwen, en waarom

| Wat | Waarom niet | Wanneer wel |
|---|---|---|
| Rapportage op zoekwoordniveau | De Search Console-sync haalt bewust alleen pagina's per dag op, geen zoekopdrachten. Dat is een nieuwe tabel plus een uitbreiding van de koppeling, geen schermwerk | Als een eigen bouwronde, na deze |
| Vergelijking met dezelfde periode vorig jaar | Nova heeft dit en het is sterk, maar het vraagt twaalf maanden Google-data en die is er niet | Zodra er een jaar aan echte cijfers ligt |
| Een tweede AI-engine (Perplexity) | Bestaat niet in het product. De enginelaag kent OpenAI en een slapende Gemini. Verdubbelt de meetkosten en vraagt een eigen verificatieronde | Als eigen besluit |
| Google Analytics-koppeling | Bewust buiten het product gehouden, naar hetzelfde onderscheid dat InSpace maakt: Search Console wel, Analytics niet | Alleen als besluit, niet als menu-item |
| Autonomieniveau, Autopilot-schakelaars | Het product is sales-led: de beheerder start betaald werk (`lib/cost-guard.ts`), de klant keurt per stap goed. Schakelaars beloven autonomie die er niet is | Als de autonomiegraad uit `docs/visie.md` gebouwd wordt |
| Netwerkweergave van clusters | Bij de herbouw van hun eigen app hebben InSpace de clustervisualisatie, de kalender, de chatassistent en het puntensysteem allemaal geschrapt. Alles wat weg ging gaf de klant meer knoppen, wat bleef gaf hem meer duidelijkheid | Als een klant er in een gesprek om vraagt |
| Persona's als eigen object | `personas` is een veld op het profiel en wordt gebruikt. Er losse objecten van maken is datamodelwerk zonder aantoonbare vraag | Als het contentplan erop moet sturen |
| Meertaligheid, donkere modus | Geschrapt, niet uitgesteld (besluit 13 en 17) | Niet |
| Het clusterdossier verhuizen naar `/merk/[id]/...` | Tien diepe routes verplaatsen voor cosmetiek | Niet |

---

## 9. Risico's en wat er nog onzeker is

### ✅ To-do voor de eigenaar: de Google-sleutel

Nagerekend op productie: er staan 91 rijen in `search_console_days`, over 4 pagina's en 30 dagen
(15 juli tot 13 augustus), goed voor 600 klikken en 5.253 vertoningen. Maar het foutveld op dat merk
zegt letterlijk *"De Google-sleutel is nog niet ingesteld. Zet GOOGLE_SERVICE_ACCOUNT_JSON in de
omgevingsvariabelen."* Dat is dus testdata, geen klantdata, en er komt niets bij.

Drie handelingen, en pas daarna staat er klantdata in het scherm:

1. Een service account aanmaken in Google Cloud met de Search Console API aan, en de JSON-sleutel
   downloaden
2. Die JSON als `GOOGLE_SERVICE_ACCOUNT_JSON` in de omgevingsvariabelen van Vercel zetten. Het
   e-mailadres van dat account is in de app zichtbaar op het koppelscherm (`serviceAccountEmail()`)
3. Dat e-mailadres bij de klant als gebruiker toevoegen aan zijn Search Console-property. De klant
   doet dat zelf, dat is de hele reden dat het een service account is en geen OAuth-koppeling

Daarna draait de dagelijkse taak `gsc_sync` vanzelf. Kosten: nul, er zit geen AI-aanroep in.

### De overige risico's

**De review-wachtrij draait een eerder besluit terug.** Dat mag, het is bewust, en de grens van vijf
regels is de reden dat het deze keer wel kan. Blijkt hij in de praktijk toch vol te lopen, dan is de
volgende stap hem per cluster te tonen in plaats van opgeteld, niet hem groter te maken.

**De twee vocabulaires voor paginatype.** Zie de waarschuwing bij §4.3b blok 5. Kies één as, leg de
keuze vast in commentaar, en gebruik dezelfde as op Overzicht en op Analytics. Twee schermen die
"contentmix" zeggen en iets anders tellen is precies de fout die dit plan opruimt.

**De vormgeving botst met de positionering, en dat blijft na deze ronde staan.** Het hele
designsysteem is afgeleid van de werkomgeving van de concurrent, terwijl de merkstrategie Outer
Orbit juist als iets eigens positioneert (`docs/designsystem.md` §9b, het open ontwerpbesluit). Dit
plan verandert de indeling, niet de vormgeving. Zolang dat besluit openstaat, werkt de vormgeving
tegen de positionering in.

**Wat dit plan niet oplost.** De diagnose "onoverzichtelijk" is hier vertaald naar de menustructuur
en de schermindeling. Als de klacht in werkelijkheid over de hoeveelheid informatie ín een scherm
gaat, dan verplaatst dit plan dat probleem opnieuw, net zoals de ronde van augustus dat deed. Eén
concrete toets vooraf: leg de nieuwe indeling voor aan de klant die het merkdossier een vergaarbak
noemde, vóór fase 2 begint.

---

## 10. Volgorde en risico per fase

| Fase | Levert | Risico |
|---|---|---|
| 1 · Fundament | Niets zichtbaars, alle adressen kloppen | Laag |
| 2 · Merkprofiel | Vijf schermen worden drie, negen menu-items worden er drie, 41 velden in zeven stappen | **Hoogste**, stil dataverlies |
| 3 · Strategie | Eén clusterlijst, één bibliotheek per merk met filters, bulkactie | Laag |
| 4 · Analytics | Drie nieuwe schermen, waarvan Zoekverkeer met zes blokken | Midden, de koppeling pas te verifiëren na de sleutel |
| 5 · Overzicht | De startpagina die er nooit was, met funnel en contentmix | Midden, de wachtrij moet kort blijven |
| 6 · Admin | De scheiding tussen klant en beheerder | **Hoog**, vraagt een handmatige doorloop |
| 7 · Opruimen | Oude routes en documentatie bij | Laag |

Fase 2 en 3 verlichten de klacht direct. Fase 5 maakt het product beter. Fase 2 en 6 zijn de fases
waar een fout onzichtbaar is; neem daar de tijd voor de verificatie die erbij staat.
