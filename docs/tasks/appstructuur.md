# Appstructuur: de zijbalk en de schermen opnieuw ingedeeld

**Opgesteld:** 17 augustus 2026. **Status: plan, nog niet gebouwd.**

> Dit document is tijdelijk van aard (`CLAUDE.md`, "Waar documentatie landt"). Zodra een fase af is,
> verdwijnt hij hier en wordt hij samengevat in `docs/logbook.md`. Is alles gebouwd, dan gaat dit
> bestand weg en verhuist het waarom naar `docs/ux-design.md` §5.

---

## 1. Aanleiding

Gebruikers noemen de indeling van de schermen en het menu onoverzichtelijk. Dat is geen indruk maar
een meetbare toestand:

- De zijbalk toont een klant **7 regels die uitklappen naar 15 bestemmingen**. Eén van die regels,
  "Mijn merk", heeft er in zijn eentje **negen**. Het commentaar in `lib/nav.ts` noemt die groep
  zelf al "de vergaarbak die dit oplost alleen verticaal".
- **Alle 27 velden** van de merkprofiel-wizard (`/profielen/[id]/merkprofiel`) staan óók in het
  profielgegevens-scherm (`/profielen/[id]/profielgegevens`, 41 velden). Twee menu-items, twee
  schermen en twee opslagroutes voor dezelfde gegevens, waarvan het ene scherm een deelverzameling
  van het andere is.
- Er zijn **26 schermen** en er is **geen enkele startpagina**. `/analyses` doet half dienst als
  dashboard (drie statusblokken), het merkdossier doet de andere helft (mijlpalen, inzichten). Wie
  inlogt weet niet waar hij moet beginnen.
- Content staat **per cluster** in een eigen bibliotheek. Een klant met vier clusters heeft vier
  bibliotheken en nergens een overzicht van wat hij heeft gekocht.

Dit is de tweede ronde op hetzelfde probleem. In augustus is het merkdossier al opgesplitst van 525
regels naar tien subpagina's, nadat een klant bij Gasservice Brabant het scherm een vergaarbak
noemde. Die splitsing loste de paginalengte op en verplaatste het probleem naar de zijbalk. Deze
ronde lost de indeling zelf op.

## 2. De acht besluiten die dit plan dragen

Vastgelegd door de eigenaar op 17 augustus 2026.

| # | Besluit | Wat het uitsluit |
|---|---|---|
| **1** | **Het clusterdossier blijft heel.** De vier hoofdstukken (Stand, Bewijs, Werk, Resultaat) blijven één scherm in vaste leesvolgorde. De vijf menu-hoofdstukken zijn ingangen op merkniveau, geen ontleding van het dossier | Het dossier opknippen langs de vijf hoofdstukken. Dat zou de herstructurering van augustus terugdraaien, waarbij één stuk werk juist ophield vier schermen te kruisen |
| **2** | **De merk-werkruimte blijft het uitgangspunt.** Alle vijf hoofdstukken gaan over het gekozen merk. "Alle merken" verdwijnt als menu-item en verhuist naar de merkkiezer | Portfolio-eerst. Dat kost een klant met één merk een extra klik bij elke sessie |
| **3** | **Analytics toont alleen wat echt gemeten wordt.** AI-zichtbaarheid met foutmarge, trend, concurrentranglijst, bronnen, en Search Console op paginaniveau | Zoekwoordniveau en een tweede AI-engine. Zie §7 |
| **4** | **De klant ziet wat ORBIT ENGINE weet en hoe zeker dat is, niet hoe ORBIT ENGINE eraan kwam.** Alles wat daarbuiten valt gaat naar Admin | Interne stof alleen wegvouwen. De klant kan het dan nog steeds tegenkomen |
| **5** | **Eén bibliotheek per merk**, met filters op cluster en status. Het cluster houdt zijn eigen lijst als doorklik | Vier bibliotheken bij vier clusters |
| **6** | **Clusters en Voorgestelde clusters worden één lijst**, lopende bovenaan, voorstellen daaronder op potentiescore | Twee menu-items voor twee toestanden van hetzelfde ding |
| **7** | **Techniek hoort bij Analytics**, als diagnose naast het cijfer | Techniek als instelling. De klant kijkt niet in Instellingen als hij zich afvraagt waarom zijn score laag is |
| **8** | **Nieuwe merk-gebonden adressen, oude blijven werken** via doorverwijzing | Bestaande adressen aanhouden. Dan staat "profielen" in de adresbalk van Analytics en Strategie |

## 3. De doelstructuur

```
[ Gasservice Brabant ▾ ]          merkkiezer, met "Alle merken" onderin

  1  OVERZICHT                    /merk/[id]
  2  ANALYTICS
       Zichtbaarheid in AI        /merk/[id]/analytics
       Zoekverkeer                /merk/[id]/analytics/zoekverkeer
       Concurrenten               /merk/[id]/analytics/concurrenten
  3  STRATEGIE
       Contentplan                /merk/[id]/strategie/plan
       Clusters                   /merk/[id]/strategie/clusters
       Bibliotheek                /merk/[id]/strategie/bibliotheek
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
bestemmingen zakt van 15 naar 13, maar daar zit de winst niet. De winst is dat elk hoofdstuk één
vraag beantwoordt:

| Hoofdstuk | De vraag die het beantwoordt |
|---|---|
| Overzicht | Hoe sta ik ervoor en wat moet ik nu doen? |
| Analytics | Wat zeggen de cijfers, en waarom? |
| Strategie | Wat gaan we doen, en wat is er al gemaakt? |
| Merkprofiel | Wie ben ik volgens ORBIT ENGINE, en klopt dat? |
| Instellingen | Hoe is het ingericht? |

**Eén bewuste uitzondering op besluit 8.** Het clusterdossier blijft op `/analyses/[id]` staan en
verhuist niet naar `/merk/[id]/cluster/[analyseId]`. Een cluster is een globaal object met tien diepe
routes eronder (bibliotheek, concept, briefing, antwoorden, rapport, instellingen, en de
contentdetailpagina). Die allemaal verplaatsen raakt de meest gelinkte routes van de app voor alleen
cosmetiek.

## 4. Wat er per scherm gebeurt

De volledige afbeelding van de 26 bestaande schermen. Niets verdwijnt zonder bestemming.

| Vandaag | Straks | Wat er gebeurt |
|---|---|---|
| `/analyses` | Splitst in twee | Statusblokken en biggestChange naar **Overzicht**, de lijst naar **Strategie → Clusters** |
| `/analyses/aanbevolen` | **Strategie → Clusters** | Gaat op in één lijst (besluit 6) |
| `/analyses/new` | Blijft, bereikbaar vanaf Clusters | Flow-scherm, geen menu-item |
| `/analyses/[id]` en zijn 9 subroutes | Blijft ongewijzigd | Besluit 1 |
| `/profielen/[id]` (merkdossier) | **Merkprofiel → Merkdossier** | Krijgt Aanbod en Concurrenten erbij als secties. Mijlpalen en inzichten verhuizen naar Overzicht |
| `/profielen/[id]/producten` | Sectie in Merkdossier | Verdwijnt als menu-item |
| `/profielen/[id]/concurrenten` | Splitst | Het beheer van entiteiten naar Merkdossier, de ranglijst naar **Analytics → Concurrenten** |
| `/profielen/[id]/merkprofiel` | **Merkprofiel → Bewerken** | Samengevoegd met profielgegevens |
| `/profielen/[id]/profielgegevens` | **Merkprofiel → Bewerken** | 27 dubbele velden verdwijnen |
| `/profielen/[id]/aanvullen` (feitenvragen) | **Merkprofiel → Vraagt jouw input** | Samengevoegd |
| `/profielen/[id]/toevoegingen` | Splitst | Open punten naar **Vraagt jouw input**, gespreksnotities naar **Admin** |
| `/profielen/[id]/techniek` | **Analytics → Zichtbaarheid** | Besluit 7 |
| `/profielen/[id]/search-console` | Splitst | Koppelen naar **Instellingen → Koppelingen**, cijfers naar **Analytics → Zoekverkeer** |
| `/profielen/[id]/plan` | **Strategie → Contentplan** | Alleen een ander adres |
| `/profielen/[id]/beheer` (toewijzen) | **Admin → Toewijzen** | Was al alleen voor beheerders |
| `/profielen` (alle merken) | Merkkiezer plus `/beheer` | Besluit 2 |
| `/profielen/nieuw` | Blijft, bereikbaar vanuit de merkkiezer | Flow-scherm |
| `/instellingen` | **Instellingen → Account en team** | Ongewijzigd |
| `/beheer` (CSM) | **Admin → Alle merken** | Ongewijzigd |
| *bestaat niet* | **Overzicht** | Nieuw |
| *bestaat niet* | **Analytics**, drie pagina's | Nieuw, gevoed uit bestaande tabellen |
| *bestaat niet* | **Strategie → Bibliotheek** | Nieuw, merkbreed (besluit 5) |
| *bestaat niet* | **Admin → Onboarding-inzicht** | Nieuw |
| *bestaat niet* | **Instellingen → Koppelingen** | Nieuw, gevuld uit search-console-box |

**Er is geen enkele migratie nodig.** Alle nieuwe schermen lezen uit tabellen die er al staan, en de
samenvoegingen schrijven naar dezelfde kolommen als vandaag. Dat is de belangrijkste reden dat dit
plan in fases geleverd kan worden zonder dat de app tussendoor stuk kan.

## 5. Wat de klant ziet en wat alleen jij ziet

Besluit 4, uitgewerkt. Dit breidt de bestaande tabel in `docs/ux-design.md` §5 uit; de grens loopt
langs `isStaff()`, niet langs de accountrol.

**Blijft bij de klant.** Merk (naam, website, logo), aanbod, doelgroep, positionering, tone of voice,
concurrenten, belangrijkste zoekthema's, datakwaliteit als zekerheidsniveau, openstaande vragen die
áán hem gericht zijn, de technische blokkades op zijn eigen site, en het letterlijke antwoord dat een
AI-assistent gaf. Dat laatste is geen interne stof maar het sterkste bewijsstuk dat het product heeft
(`docs/ux-design.md` §1, "bewijs verslaat cijfer").

**Gaat naar Admin.**

| Wat | Waar het nu staat |
|---|---|
| Technische prompts en instructies | Nergens in de UI, wel in `prompts` en de pijplijncode |
| Interne AI-redeneringen, de ruwe JSON per aanroep | `profile_facets.raw_json`, `ai_calls` |
| Ruwe crawl- en scrapedata | `profile_pages`, `technical_audits.raw_json` |
| Interne scores die niet actiegericht zijn | `ProfileReadinessPanel` (is het dossier compleet, zes onderdelen met percentage) |
| Model- en API-informatie, kosten per aanroep | `ai_calls`, `/api/analyses/[id]/costs` |
| Technische onderzoeksdetails | `topic_research`, `source_landscape`, `profile_field_sources` |
| Gespreksnotities en contextfactoren | `/profielen/[id]/toevoegingen`, al staff-only |
| De takenwachtrij en mislukte taken | `jobs`, nergens zichtbaar |

**Het principe in één zin, over te nemen in `docs/ux-design.md`:** de klant ziet wat ORBIT ENGINE
weet, hoe zeker dat is en wat ermee moet gebeuren, niet hoe ORBIT ENGINE aan die kennis kwam.

**Twee aandachtspunten bij het afschermen.**

1. **`ProfileReadinessPanel` is een grensgeval.** Het zegt of het dossier compleet is, en dat is voor
   jou een verkoopinstrument ("kan ik dit scherm delen"). Voor de klant is het een percentage over
   werk dat hij niet doet. Het gaat naar Admin, maar de openstaande vragen eruit blijven bij de klant
   staan, want die zijn áán hem gericht.
2. **Een afgeschermd blok haalt ook zijn springlink weg.** Die regel staat al in `docs/ux-design.md`
   §5 en geldt hier onverkort: een link naar een blok dat er niet is, is zichtbaarder dan het blok
   zelf.

## 6. Het bouwplan, zeven fases

Elke fase is los te leveren en laat de app werkend achter. **De zijbalk groeit mee:** een hoofdstuk
verschijnt pas in het menu zodra zijn pagina's bestaan. Een kop die naar een leeg scherm wijst is
erger dan een kop die er nog niet is.

Vaste afsluiting van elke fase: `npx tsc --noEmit` · `npm run test:unit` · `npm run test:chain` ·
`npm run build`, alle vier groen, plus de twee kleurcontroles uit `docs/ux-design.md` §2 regel 1.

---

### Fase 1: Fundament, adressen en doorverwijzingen

Geen zichtbare verandering. Dit legt het spoor waar de rest overheen rijdt.

**Bestanden:** `app/(app)/merk/[id]/layout.tsx` (nieuw) · `lib/nav.ts` · `middleware.ts` ·
`lib/workspace.ts`

1. Nieuw routesegment `app/(app)/merk/[id]/` met de toegangscontrole die `/profielen/[id]` nu al
   doet (`getOwnedProfile()`), zodat er geen tweede route naar dezelfde beslissing ontstaat
   (conventie: `lib/staff.ts` is de enige plek die bepaalt wie beheerder is).
2. Doorverwijzingen van elk oud merkadres naar zijn nieuwe. Permanent, zodat bladwijzers en gedeelde
   demolinks blijven werken.
3. `NavItem` krijgt een veld voor het hoofdstuk waar een bestemming onder valt, zodat de zijbalk
   straks vijf koppen kan tonen in plaats van twee groepen.

**Verificatie:** elk van de 11 oude merkadressen onder `/profielen/[id]/` levert een 308 op naar het
juiste nieuwe adres, plus `/profielen` en `/analyses/aanbevolen`. Een
klant die niet bij het merk hoort krijgt op het nieuwe adres dezelfde 404 als op het oude.

---

### Fase 2: MERKPROFIEL, van vijf schermen naar drie

De grootste opruiming en het laagste risico, want er komt geen nieuwe data bij.

**Bestanden:** `app/(app)/merk/[id]/merkprofiel/page.tsx` · `.../bewerken/page.tsx` ·
`.../input/page.tsx` · `lib/profile-editable.ts` · `lib/pipeline/brand-fields.ts` ·
`app/(app)/profielen/[id]/profile-editor.tsx` · `.../merkprofiel/brand-wizard.tsx`

1. **Bewerken:** de wizard en de platte editor worden één scherm. De wizard-vorm wint (vijf stappen:
   je merk, je klant, hoe je klinkt, je woorden, wie het schrijft), want die is op klantfeedback
   ontworpen. De veertien velden die alleen in de platte editor stonden (naam, schrijfwijzen,
   werkgebied, taal, sitemap, bedrijfsmodel, aanbod) krijgen een zesde stap: "je gegevens".
   `EDITABLE_PROFILE_FIELDS` blijft de enige lijst die bepaalt wat opgeslagen mag worden.
2. **Merkdossier:** het leesscherm krijgt Aanbod en Concurrenten erbij als `ProfileSection`, in de
   bestaande vorm `verhaal` (open op desktop). Mijlpalen en inzichten gaan eruit, die horen op
   Overzicht (fase 5). `ProfileReadinessPanel` gaat eruit, die hoort in Admin (fase 6).
3. **Vraagt jouw input:** feitenvragen en de open punten uit het onderzoek op één pagina, met de
   teller in de kop. De gespreksnotities blijven staff-only en verhuizen in fase 6 naar Admin.
4. Zijbalk: hoofdstuk MERKPROFIEL verschijnt met drie kinderen. De negen kinderen van "Mijn merk"
   verdwijnen.

**Verificatie:** een veld dat je in de nieuwe editor wijzigt, komt terug in de content die daarna
geschreven wordt (de bestaande ketentest op `brand_dna` dekt dit). Geen enkel van de 41 bewerkbare
velden is onbereikbaar geworden: tel ze na tegen `EDITABLE_PROFILE_FIELDS`.

---

### Fase 3: STRATEGIE

**Bestanden:** `app/(app)/merk/[id]/strategie/clusters/page.tsx` · `.../bibliotheek/page.tsx` ·
`.../plan/page.tsx` · `lib/dashboard.ts` · `lib/archive.ts`

1. **Clusters:** één lijst. Lopende clusters bovenaan (gesorteerd zoals nu: wat op de klant wacht
   eerst, mislukte bovenaan met een rode kaart), voorgestelde clusters daaronder op potentiescore.
   De bestaande kaartcijfers per cluster blijven (`AnalysisCardMetrics`).
2. **Bibliotheek, merkbreed:** alle `content_pieces` van alle clusters van dit merk, met filters op
   cluster en status. De bestaande bibliotheek per cluster blijft bestaan als doorklik vanuit het
   dossier; dit scherm is de verzamelplek.
3. **Contentplan:** verhuist alleen van adres.
4. Zijbalk: hoofdstuk STRATEGIE verschijnt.

**Verificatie:** de merkbrede bibliotheek toont evenveel pagina's als de som van de bibliotheken per
cluster. Nagerekend op productie: er staan nu 35 content-pagina's, waarvan 1 gepubliceerd.

---

### Fase 4: ANALYTICS

Het hoofdstuk met de meeste nieuwe schermen en de minste nieuwe data. Alles komt uit tabellen die al
gevuld zijn: 14 rapporten, 14 zichtbaarheidsscores, 474 meetronden, 343 concurrentrijen.

**Bestanden:** `app/(app)/merk/[id]/analytics/page.tsx` · `.../zoekverkeer/page.tsx` ·
`.../concurrenten/page.tsx` · `lib/pipeline/brand-rankings.ts` · `components/trend-chart.tsx` ·
`components/audit-panel.tsx`

1. **Zichtbaarheid in AI:** de score over alle clusters van dit merk heen, met foutmarge en
   trendlijn, per cluster uitsplitsbaar. Daaronder de technische diagnose (besluit 7): mogen
   AI-crawlers erin, kloppen de gegevens overal. Een blokkade staat bovenaan, want die verklaart het
   cijfer.
2. **Zoekverkeer:** de Search Console-cijfers per pagina en per dag. ⚠️ Zie §8, de sleutel.
3. **Concurrenten:** de ranglijst over dezelfde noemer (`brand-rankings.ts`, gebouwd op 13 augustus)
   plus het bronnenlandschap.
4. Zijbalk: hoofdstuk ANALYTICS verschijnt.

**Verificatie:** de score op Analytics is identiek aan de score in hoofdstuk 01 van het clusterdossier
voor dezelfde periode. Twee schermen die hetzelfde getal anders berekenen is precies de fout die
`lib/dashboard.ts` ooit oploste.

---

### Fase 5: OVERZICHT

**Bestanden:** `app/(app)/merk/[id]/page.tsx` · `lib/dashboard.ts` · `lib/insights.ts` ·
`lib/milestones.ts` · `lib/opportunities.ts` · `lib/work.ts`

Vier blokken, in deze volgorde:

1. **Hoe sta je ervoor:** het hoofdcijfer met verandering, en de mijlpalen (hoe lang je meedoet,
   hoeveel je zichtbaarheid groeide, hoeveel pagina's er staan).
2. **Wat er nu op jou wacht:** de review-wachtrij. **Maximaal vijf regels**, alleen de staat `nu`,
   gegroepeerd per cluster, met een doorklik naar de rest. Die grens is niet cosmetisch: deze lijst
   stond hier eerder en is op 3 augustus 2026 verwijderd omdat hij bij meerdere clusters opliep tot
   tientallen regels in één kaart, waarmee het overzicht zelf de rommel werd die het moest oplossen
   (`docs/logbook.md` §13). Zonder die grens herhalen we die fout.
3. **Wat ORBIT ENGINE deze week deed:** een chronologische lijst uit de takenwachtrij. ⚠️ Bewust
   **niet** "Engine Pulse" of iets dat autonomie suggereert: het product is sales-led, jij start
   betaald werk en de klant keurt per stap goed. `CLAUDE.md` verbiedt te schrijven dat iets al kan
   wat nog niet gebouwd is.
4. **Waar begin je:** de kansenlijst op potentiescore.
5. Zijbalk: hoofdstuk OVERZICHT verschijnt en wordt de bestemming na inloggen.

**Verificatie:** de teller op Overzicht ("3 wachten op jou") komt overeen met wat je optelt uit de
clusterdossiers. Draai het na op een merk met meerdere lopende clusters.

---

### Fase 6: ADMIN en de afscherming

**Bestanden:** `app/(app)/merk/[id]/admin/page.tsx` · `.../toewijzen/page.tsx` · `lib/nav.ts` ·
`docs/ux-design.md`

1. **Onboarding-inzicht** per merk, alleen voor beheerders, met een 404 en geen 403 voor iedereen
   anders (een 403 bevestigt dat het scherm bestaat). Inhoud: de acht onboardingtaken met hun
   uitkomst, de ruwe JSON per aanroep, het kostenlogboek, het bronnenonderzoek, de herkomst per veld,
   de dossiercompleetheid, en de gespreksnotities.
2. De blokken uit §5 die naar Admin gaan, worden op de klantschermen weggehaald, **inclusief hun
   springlinks**.
3. Zijbalk: de Admin-groep verschijnt onder een scheidingslijn, met het bestaande "alleen jij"-teken
   per regel.

**Verificatie:** log in als een klantaccount en loop alle dertien bestemmingen af. Geen enkele toont
ruwe modeloutput, een promptinstructie, een modelnaam of een bedrag. Dit is een handmatige controle,
en hij hoort in `test-chain.ts` als scenario terug te komen voor de routes die data teruggeven.

---

### Fase 7: Opruimen

**Bestanden:** `app/(app)/profielen/` · `components/main-nav.tsx` · `components/profile-menu.tsx` ·
`lib/nav.ts` · `docs/ux-design.md` · `docs/logbook.md` · `CLAUDE.md`

1. De oude routes onder `/profielen/[id]/` weg, op de doorverwijzingen na.
2. `NAV` (de oude platte lijst) en `MainNav` weg, die wachtten hier al op.
3. `docs/ux-design.md` §5 herschreven naar de nieuwe indeling, met de tabel uit §5 hierboven.
4. Een gedateerde alinea in `docs/logbook.md` met de cijfers die deze ronde droegen.
5. Dit bestand weg.

---

## 7. Wat we bewust niet bouwen, en waarom

| Wat | Waarom niet | Wanneer wel |
|---|---|---|
| Rapportage op zoekwoordniveau | De Search Console-sync haalt bewust alleen pagina's per dag op, geen zoekopdrachten. Dat is een nieuwe tabel plus een uitbreiding van de koppeling, geen schermwerk | Als een eigen bouwronde, na deze |
| Een tweede AI-engine (Perplexity) | Bestaat niet in het product. De enginelaag kent OpenAI en een slapende Gemini. Dit verdubbelt de meetkosten per ronde en vraagt een eigen verificatieronde | Idem |
| Google Analytics-koppeling | Bewust buiten het product gehouden, naar hetzelfde onderscheid dat InSpace maakt: Search Console wel, Analytics niet | Alleen als besluit, niet als menu-item |
| Autonomieniveau, Autopilot-schakelaars | Het product is sales-led: jij start betaald werk (`lib/cost-guard.ts`), de klant keurt per stap goed. Schakelaars beloven autonomie die er niet is | Als de autonomiegraad uit `docs/visie.md` daadwerkelijk gebouwd wordt |
| Netwerkweergave van clusters | Bij de herbouw van hun eigen app hebben InSpace de clustervisualisatie, de kalender, de chatassistent en het puntensysteem allemaal geschrapt. Alles wat weg ging gaf de klant meer knoppen, wat bleef gaf hem meer duidelijkheid | Als een klant er in een gesprek om vraagt |
| Persona's als eigen object | `personas` is vandaag een veld op het profiel, en het wordt gebruikt. Er losse objecten van maken is datamodelwerk zonder aantoonbare vraag | Als het contentplan erop moet sturen |
| Het clusterdossier verhuizen naar `/merk/[id]/...` | Tien diepe routes verplaatsen voor cosmetiek | Niet |

## 8. Risico's en wat er nog onzeker is

**De Google-sleutel is niet ingesteld, en dat raakt fase 4.** Nagerekend op productie op 17 augustus
2026: er staan 91 rijen in `search_console_days`, over 4 pagina's en 30 dagen (15 juli tot 13
augustus), goed voor 600 klikken en 5.253 vertoningen. Maar het foutveld op dat merk zegt letterlijk
*"De Google-sleutel is nog niet ingesteld. Zet GOOGLE_SERVICE_ACCOUNT_JSON in de
omgevingsvariabelen."* Dat is dus testdata, geen klantdata, en er komt niets bij.

Gevolg voor fase 4: **het scherm Zoekverkeer is bouwbaar en tegen die 91 rijen te toetsen, maar hij
is pas geverifieerd zodra de sleutel er is.** Conventie 10: gebouwd is niet geverifieerd. Twee
mogelijkheden, en dit is een keuze voor de eigenaar:

- De sleutel regelen vóór fase 4. Dan is het scherm meteen echt.
- Fase 4 bouwen met het scherm dat eerlijk zegt dat de koppeling nog niet actief is (`gsc_last_error`
  staat er al voor klaar), en het later verifiëren.

**De review-wachtrij draait een eerder besluit terug.** Dat mag, het is bewust, en de grens van vijf
regels is de reden dat het deze keer wel kan. Blijkt hij in de praktijk toch vol te lopen, dan is de
volgende stap hem per cluster te tonen in plaats van opgeteld, niet hem groter te maken.

**De vormgeving botst met de positionering, en dat blijft na deze ronde staan.** Het hele
designsysteem is afgeleid van de werkomgeving van de concurrent, terwijl de merkstrategie Outer Orbit
juist als iets eigens positioneert (`docs/designsystem.md` §9b, het open ontwerpbesluit). Dit plan
verandert de indeling, niet de vormgeving. Zolang dat besluit openstaat, werkt de vormgeving tegen de
positionering in.

**Wat dit plan niet oplost.** De diagnose "onoverzichtelijk" is hier vertaald naar de menustructuur en
de schermindeling. Als de klacht in werkelijkheid over de hoeveelheid informatie ín een scherm gaat,
dan verplaatst dit plan dat probleem opnieuw, net zoals de ronde van augustus dat deed. Eén concrete
toets vooraf: leg de nieuwe indeling voor aan de klant die het merkdossier een vergaarbak noemde,
vóór fase 2 begint.

## 9. Volgorde en omvang

| Fase | Levert | Risico |
|---|---|---|
| 1 · Fundament | Niets zichtbaars, alle adressen kloppen | Laag |
| 2 · Merkprofiel | Vijf schermen worden drie, negen menu-items worden er drie | Laag, geen nieuwe data |
| 3 · Strategie | Eén clusterlijst, één bibliotheek per merk | Laag |
| 4 · Analytics | Drie nieuwe schermen uit bestaande data | Midden, zie §8 |
| 5 · Overzicht | De startpagina die er nooit was | Midden, de wachtrij moet kort blijven |
| 6 · Admin | De scheiding tussen klant en beheerder | Midden, vraagt een handmatige doorloop |
| 7 · Opruimen | Oude routes en documentatie bij | Laag |

Fase 2 en 3 zijn de fases die de klacht direct verlichten. Fase 5 is de fase die het product beter
maakt. Fase 4 hangt aan de Google-sleutel.
