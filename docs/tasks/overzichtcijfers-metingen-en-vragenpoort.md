# Overzichtcijfers, hernoeming naar metingen, vragenpagina en de contentpoort

Opdracht van de eigenaar, 28 augustus 2026. Vier losse wensen die elkaar op één punt raken: de
klant moet zien wat het programma tot nu toe heeft opgeleverd, en hij moet zijn input geleverd
hebben voordat ORBIT ENGINE gaat schrijven.

**Uit de opdracht gehaald, bewust:** het verplaatsen van de rondebalk (het blok "Zo werkt je
maand") naar de bovenbalk. De eigenaar is daar op 28 augustus 2026 zelf van teruggekomen. De
rondebalk blijft staan zoals hij is, en de bovenbalk krijgt geen cijfers. Raak
`app/(app)/merk/[id]/_components/ronde-balk.tsx` en `components/workspace-chrome.tsx` dus niet aan,
behalve waar de hernoeming in blok B daarom vraagt.

---

## 0. Vier beslissingen die vóór de bouw genomen moeten worden

Deze staan hier apart omdat ze de uitkomst veranderen. Elk punt heeft een aanbeveling; is er geen
weerwoord van de eigenaar, dan bouwt Claude Code de aanbeveling.

### D1. "Meting" gaat twee dingen tegelijk betekenen

De app kent nu drie begrippen die alle drie het woord meting willen:

| Begrip | Waar het staat | Nu |
|---|---|---|
| Een onderwerp waarop we zichtbaarheid volgen | `analyses`-rij, `/analyses/[id]` | "cluster" |
| Een maandelijkse meetronde over dat onderwerp | `tracking_runs`, rondebalk, kopregel | "meting" |
| Een groep vragen bínnen een meetronde | `prompts.cluster`, `content_pieces.cluster` | "cluster" |

Wordt het eerste begrip "meting", dan staat op de startpagina straks "3 metingen actief" (drie
onderwerpen) direct naast "0 metingen" in de rondebalk (nul meetrondes). Dat zijn twee
verschillende getallen onder dezelfde naam op één scherm.

**Aanbeveling:** het eerste begrip wordt **meting**, zoals gevraagd. Het tweede begrip heet vanaf
nu overal **meetronde** ("nog geen meetronde", "2 meetrondes", "de volgende meetronde draait op
1 september"). Het derde begrip blijft in de UI **onderwerp** heten en verandert niet van kolomnaam
in de database. Zonder die tweede verschuiving is de hernoeming een verslechtering, geen
verbetering.

### D2. Er zijn straks twee vragenschermen

"Vraagt jouw input" (`/merk/[id]/merkprofiel/input`) bestaat al en toont de merkbrede vragen. De
nieuwe pagina toont de vragen per meting. Voor de klant is dat één vraag ("moet ik nog iets
aanvullen?") op twee plekken, precies het probleem dat op 17 augustus 2026 al eens is opgelost door
twee vragenschermen samen te voegen.

Daar komt bij: elk klanthoofdstuk in de zijbalk mag hooguit drie bestemmingen hebben
(`scripts/test-unit.ts` bewaakt dat, alleen Analytics mag er vier en Admin vijf). Strategie zou er
met een vierde regel overheen gaan.

**Aanbeveling:** één vragenpagina onder Strategie, met de merkbrede vragen als aparte sectie
onderaan. "Vraagt jouw input" verdwijnt uit het menu en wordt een 308 naar de nieuwe pagina.
Merkprofiel houdt dan twee bestemmingen over, Strategie krijgt er vier, en die uitzondering wordt
in `lib/nav.ts` en in de test uitgeschreven met dezelfde onderbouwing als bij Analytics: drie
bestemmingen die tonen wat ORBIT ENGINE deed, plus één plek waar de klant zelf iets moet doen.

**Alternatief als de eigenaar de scheiding wil houden:** de nieuwe pagina toont alleen
meting-vragen, "Vraagt jouw input" blijft bestaan, en Strategie gaat óók naar vier. Het menu wordt
er niet korter van en de klant heeft twee plekken waar vragen kunnen staan.

### D3. Welke vragen houden het schrijven tegen

Er zijn drie soorten openstaande vragen, en ze ontstaan op verschillende momenten:

1. **Vragen uit het rapport van een meting** (`fact_requests` mét `analysis_id`). Bestaan al
   voordat iemand op schrijven klikt.
2. **Merkbrede vragen** uit de onboarding en de synthese (`fact_requests` zonder `analysis_id`).
3. **Briefingvragen**, die de claim-audit pas maakt **nadat** je op schrijven klikt
   (`lib/pipeline/briefing.ts`). Die kunnen per definitie niet vóór de klik beantwoord zijn.

**Aanbeveling:** soort 1 blokkeert. Soort 2 blokkeert niet, want een merkbrede vraag die niemand
beantwoordt zou dan élke meting voorgoed dichtzetten. Soort 3 houdt de bestaande werkwijze: de
briefing vraagt door en heeft zijn eigen uitweg.

**Een vraag "overslaan" telt als beantwoord.** Zonder die uitweg kan een klant die een cijfer
gewoon niet heeft nooit meer content krijgen, en dan is de poort geen kwaliteitsmaatregel maar een
slot. Overslaan is een expliciete handeling die als rij wordt vastgelegd, dus het blijft zichtbaar
wie wat liet liggen.

### D4. De poort raakt vooral de consultant, niet de klant

Betaald werk starten mag alleen de beheerder (besluit 18, `lib/cost-guard.ts`). De klant kan de
schrijfknop dus sowieso niet indrukken. De poort betekent in de praktijk: **de consultant kan niet
laten schrijven zolang de klant zijn vragen niet beantwoord heeft.** Dat is precies de bedoeling
achter de wens, maar het is geen rem op de klant. Het gevolg is dat de melding bij de knop twee
lezers heeft, en dat de tekst dus zowel voor de consultant als in een gedeeld scherm moet kloppen.

**Aanbeveling:** de melding noemt geen namen en geen rollen. Hij zegt wat er open staat, bij welke
meting, en linkt naar de vragenpagina met dat filter al aan.

---

## Blok A. De vier cijfers op "Hoe sta je ervoor"

**Wens:** drie van de vier cijfers worden totalen sinds de start van de klant, het aantal actieve
metingen blijft een stand van nu en gaat naar voren, en de labels veranderen.

### De nieuwe rij, in deze volgorde

| # | Label | Wat het telt | Toelichting eronder |
|---|---|---|---|
| 1 | Metingen actief | Actieve, niet gearchiveerde `analyses` van dit merk. Stand van nu | `Nu gevolgd` |
| 2 | Pagina's geschreven | Alle geschreven nieuwe pagina's, all-time | `Nieuwe pagina's` |
| 3 | Pagina's geoptimaliseerd | Alle geschreven verbeteringen aan bestaande pagina's, all-time | `Bestaande pagina's` |
| 4 | Gepubliceerd | Van 2 en 3 samen: wat live staat, all-time | `Live op je site` |

Enkelvoud en meervoud blijven, zoals nu: "1 meting actief", "1 pagina geschreven".

**Twee dingen om te controleren bij het bouwen.** De toelichtingsregel mag hooguit 23 tekens zijn
(`scripts/test-unit.ts` bewaakt dat, zie het commentaar bij `OverzichtCijfer.detail`: vier kolommen
op 940 pixels). En "Pagina's geoptimaliseerd" is met 24 tekens het langste label dat de rij ooit
gedragen heeft; loopt het over twee regels en staat de rij daardoor scheef, meld dat dan met een
voorstel in plaats van het label stilletjes in te korten.

Cijfer 4 heet in de opdracht "Pagina's en optimalisaties gepubliceerd". Dat past niet in een kolom
van 190 pixels. Het label wordt **Gepubliceerd** en de kop boven de rij vertelt de rest.

### Dat het totalen zijn, moet op het scherm staan

Boven de rij komt één regel, in `mono-label`, zonder icoon:

> `Sinds de start van je programma`

Staat de startdatum vast (de aanmaakdatum van de oudste actieve meting, anders die van het
merkprofiel), dan wordt het `Sinds maart 2026`. Concreter is beter, en de datum is er al: er komt
geen query bij, `loadBrandWork` haalt de analyses toch al op.

⚠️ Cijfer 1 valt daar niet onder. Dat is een stand van nu, geen totaal. Dat verschil moet uit het
scherm zelf blijken en niet uit een voetnoot: de toelichting onder cijfer 1 zegt "Nu gevolgd",
de andere drie zeggen wat ze tellen. Kan de bouwer dat visueel niet rustig krijgen, dan liever een
dunne scheidingslijn tussen kolom 1 en 2 dan een uitleg in kleine letters.

### Bestanden

- `lib/overview.ts`, `overzichtCijfers()`. Nieuwe parameters (`metingen`, `geschreven`,
  `geoptimaliseerd`, `gepubliceerd`), nieuwe volgorde, nieuwe labels. Blijft puur, dus testbaar
  (conventie 2). Het commentaar boven de functie legt uit waaróm drie van de vier totalen zijn:
  de klant wil bij het inloggen zien wat het product heeft opgeleverd, niet wat er deze maand
  toevallig gebeurde.
- `lib/overview-data.ts`. `loadGepubliceerd()` wordt `loadContentTotalen()` en geeft drie getallen
  terug in één query over `content_pieces`, gefilterd op de actieve analyses van dit merk:
  - `geschreven`: `action = 'nieuw'`, `is_current = true`, `status <> 'briefing'`
  - `geoptimaliseerd`: idem met `action = 'verbeteren'`
  - `gepubliceerd`: `published_at is not null`, `is_current = true`
- `app/(app)/merk/[id]/page.tsx`. Roept de nieuwe loader aan en geeft de vier getallen door. De
  kansentellingen (`nieuwe_pagina`, `pagina_bijwerken` uit `lus.opportunities`) verdwijnen uit deze
  rij. Ze blijven wel in het kansenblok eronder staan, dus er gaat geen informatie verloren.
- `scripts/test-unit.ts`. Het blok rond regel 6420 herschrijven: vier cijfers, nieuwe volgorde,
  enkelvoud en meervoud, lengte van de toelichting, en de nieuwe controle dat geen enkel label of
  toelichting het woord "deze maand" bevat (het zijn totalen).

### Twee dingen die hierbij rechtgezet worden

1. **`status = 'briefing'` telt niet mee als geschreven.** Een pagina die op vragen wacht is niet
   geschreven. Zonder dit filter zou de teller oplopen op het moment dat iemand op de knop drukt,
   en dat is precies het soort cijfer dat de klant één keer betrapt en daarna nooit meer gelooft.
2. **`is_current = true` bij gepubliceerd.** `loadGepubliceerd()` doet dat nu niet. Een pagina die
   in versie 2 opnieuw gepubliceerd is, telt daardoor twee keer. Bij Gasservice Brabant valt dat
   niet op omdat er één pagina live staat; bij de eerste klant met een herschrijving wel.

### Verificatie

- `npm run test:unit` groen, met de herschreven testen.
- Tegen echte data (conventie 10): op productie het merk Gasservice Brabant openen en de vier
  getallen naast een `select action, status, is_current, published_at from content_pieces` leggen.
  De vier cijfers moeten precies uit die rijen te herleiden zijn.
- Cijfer 4 is nooit groter dan cijfer 2 plus cijfer 3. Is dat wel zo, dan telt de query versies
  dubbel.

---

## Blok B. "Cluster" wordt overal "meting"

**Wens:** het begrip cluster verdwijnt uit de app.

### Wat wél en wat niet hernoemd wordt

**Wel:** alle zichtbare tekst waar "cluster" een `analyses`-rij bedoelt. Paginakoppen, menu-item,
lege staten, knoppen ("Meting starten"), filterlabels, foutmeldingen, `metadata.title`, en de
promptteksten waarin het woord naar de klant terugkomt.

**Niet:** de tabelnaam `analyses`, de kolom `analysis_id`, variabelenamen in code, en het veld
`prompts.cluster` / `content_pieces.cluster`. Dat laatste is een **ander** begrip: een groep vragen
bínnen een meting. In de UI heet dat vanaf nu **onderwerp**. Een zoek-en-vervang over het hele
project maakt hier gegarandeerd fouten, want beide betekenissen staan soms in hetzelfde bestand
(`library-view.tsx` heeft een filter "Cluster" dat de meting bedoelt, en een regel `{r.cluster}`
die het vragencluster bedoelt).

### De route

`/merk/[id]/strategie/clusters` wordt `/merk/[id]/strategie/metingen`, met een permanente
doorverwijzing in `lib/redirects.ts`. Het clusterdossier blijft op `/analyses/[id]` staan; dat is
de bewust vastgelegde uitzondering (zie het commentaar boven `ClustersPage`) en tien diepe routes
verplaatsen voor alleen een woord is de moeite niet waard. Wel meeveranderen:

- `lib/nav.ts`, `navActief()`: de regel die op `/strategie/clusters` eindigt.
- `app/(app)/analyses/new/page.tsx`: "Nieuw cluster" wordt "Nieuwe meting".
- `scripts/test-unit.ts`: de navigatietesten rond regel 6398 gebruiken het oude pad.

### De meetronde krijgt zijn eigen woord (zie D1)

Overal waar "meting" nu een maandelijkse ronde bedoelt, wordt het **meetronde**:

- `lib/ronde.ts`, de stand van de fase Meten: "nog geen meetronde", "1 meetronde", "n meetrondes".
- `lib/overview.ts`, `versheidsregel()`: "De eerste meetronde draait op 1 september."
- Analytics, waar "over 30 vragen gemeten" staat: die tekst klopt en blijft.

### Bestanden

Ongeveer 25 bestanden met zichtbare tekst. De grootste: `strategie/clusters/page.tsx`,
`analytics/page.tsx`, `analytics/concurrenten/page.tsx`, `strategie/bibliotheek/`,
`strategie/plan/plan-view.tsx`, `merk/[id]/page.tsx`, `_components/topics-panel.tsx`,
`_components/assign-box.tsx`, `components/why-this-page.tsx`, `lib/nav.ts`, `lib/overview.ts`,
`lib/ronde.ts`, plus `lib/plans.ts` en `lib/plan-backlog.ts` waar de tekst naar de klant gaat.

Werkwijze: loop `grep -rin "cluster" --include=*.tsx --include=*.ts` regel voor regel af en
beslis per regel welk van de drie begrippen er staat. Commentaarregels die de geschiedenis
uitleggen mogen het woord cluster houden; het waarom van een keuze verandert niet doordat het
label verandert (zelfde regel als bij de verwijzingen naar verwijderde documenten).

### Documentatie

- `docs/schrijfstijl.md`: woordenlijst uitbreiden met cluster → meting, meting → meetronde,
  vragencluster → onderwerp. Dit is de plek waar de app-brede woordkeuze thuishoort.
- `docs/architecture.md` en `docs/ux-design.md`: de plekken waar "cluster" als klantterm staat.
- `docs/logbook.md`: één alinea met datum, de drie begrippen en waarom het tweede meeschoof.

### Verificatie

- `grep -rin "cluster" app/ components/` levert alleen nog treffers op in commentaar en in code die
  het vragencluster bedoelt.
- Het oude adres `/merk/<id>/strategie/clusters` komt met een 308 uit op `/strategie/metingen`.
- `npm run test:unit` en `npm run test:chain` groen.

---

## Blok C. Nieuwe pagina: openstaande vragen per meting

**Wens:** één pagina, volledig gewijd aan de vragen die uit de metingen komen, filterbaar per
meting, met ruimte om te antwoorden. Verder niets.

### Plaats in het menu

Strategie wordt: **Metingen, Openstaande vragen, Contentplan, Bibliotheek**. Dat is de gevraagde
omdraaiing van Contentplan en Metingen, plus de nieuwe pagina ertussen. Zie D2 voor waarom dit
hoofdstuk daarmee op vier bestemmingen komt en wat er met "Vraagt jouw input" gebeurt.

Het menu-item krijgt een teller zodra er iets open staat, net zoals "Vraagt jouw input" die nu in
zijn paginakop heeft. Een vragenpagina zonder teller wordt niet bezocht.

### De pagina

Adres: `/merk/[id]/strategie/vragen`.

Inhoud, en niets anders:

1. **Kop** met het aantal openstaande vragen en één zin waarom het uitmaakt: ORBIT ENGINE schrijft
   pas als de vragen beantwoord zijn, en een antwoord verbetert élke volgende pagina, niet alleen
   de eerstvolgende.
2. **Filter per meting**, als chips met het aantal open vragen erachter. Bij één meting valt het
   filter weg: een filter met één knop is een knop die niets doet.
3. **De vragen zelf**, gegroepeerd per meting, elk met het invoerveld en de knop "Overslaan" die er
   nu ook al zijn. Beantwoorde en overgeslagen vragen staan ingeklapt onderaan, terug te halen.
4. **Lege staat** als er niets open staat: "Je hebt alles beantwoord", met de link naar de meting
   waar het werk klaarligt.

Geen kansenlijst, geen rapportfragmenten, geen contentplan op deze pagina.

### Bestanden

- `app/(app)/merk/[id]/strategie/vragen/page.tsx`, servercomponent. Haalt `fact_requests` op voor
  dit merk met een `analysis_id` uit de actieve metingen, plus (bij D2-aanbeveling) de merkbrede
  rijen, en haalt de namen van de metingen op voor de groepskoppen.
- `app/(app)/merk/[id]/strategie/vragen/vragen-view.tsx`, clientcomponent voor het filter.
- `app/(app)/merk/[id]/_components/fact-requests.tsx` wordt hergebruikt en krijgt een optionele
  groepskop. Niet kopiëren: dit component draagt de bestaande logica voor antwoorden, overslaan en
  het verversen van de teller, en twee kopieën lopen gegarandeerd uit elkaar.
- `app/api/profiles/[id]/facts/route.ts` blijft ongewijzigd. Die route werkt al op elke rij van dit
  merk, ook rijen met een `analysis_id`, en controleert het eigenaarschap. Wel nakijken of het
  antwoord van een meting-vraag óók in `profiles.proof_points` hoort te landen, zoals nu bij
  merkbrede vragen gebeurt; het antwoord op "hoeveel monteurs heb je" is niet minder waar omdat de
  vraag uit één meting kwam.
- `lib/nav.ts`: volgorde en het nieuwe item.
- `lib/redirects.ts`: 308 van `/merk/:id/merkprofiel/input` naar de nieuwe pagina (bij D2).
- `lib/work.ts`: de werklijst verwijst nu naar `/merkprofiel/input` en moet mee.

### Verificatie

- Een merk met vragen in twee metingen toont beide groepen, en het filter laat er precies één over.
- Een vraag beantwoorden werkt de teller in de kop én in het menu bij zonder herladen.
- `npm run test:chain` krijgt een scenario: rij aanmaken met `analysis_id`, ophalen via dezelfde
  query als de pagina, beantwoorden via de route, controleren dat de status omslaat.

---

## Blok D. De contentpoort: geen tekst zonder antwoorden

**Wens:** content kan pas geschreven worden als alle openstaande vragen van die meting beantwoord
zijn. Klikt iemand toch, dan verschijnt een melding.

### ⚠️ Dit draait een vastgelegd besluit terug, en dat hoort opgeschreven te worden

`app/api/analyses/[id]/briefing/route.ts` zegt met zoveel woorden: "Er is altijd een uitweg. De
klant kan altijd door; wat hij overslaat kost hem geen pagina maar een passage." Dat was een
bewuste keuze, en de nieuwe poort spreekt hem tegen.

De redenering van de eigenaar is verdedigbaar: een pagina zonder klantfeiten is algemene tekst, en
algemene tekst is precies wat een AI-assistent niet citeert. Maar het besluit mag niet stilletjes
omvallen. Het wordt dus zo opgelost dat beide waar blijven:

- **Vóór het schrijven** (deze nieuwe poort): de vragen die al bestonden moeten behandeld zijn.
  Behandeld betekent beantwoord óf bewust overgeslagen, zie D3.
- **Tijdens de briefing** (bestaand): daar blijft de uitweg. Die vragen ontstaan pas ná de klik, en
  een poort die vraagt om iets wat nog niet bestond is een dood einde.

`docs/logbook.md` krijgt hier een alinea over, met de tegenspraak erin benoemd. Anders leest iemand
over een half jaar het commentaar in de briefingroute en denkt dat de poort een fout is.

### Waar de poort komt te staan

Twee lagen, conform conventie 1 (een melding is een intentie, code is een garantie):

1. **De knop.** `app/(app)/analyses/[id]/_chapters/werk.tsx` haalt de feitenvragen van deze meting
   al op. Het aantal openstaande gaat als property naar `GenerateButton` en `GenerateAllButton`.
   De knop wordt **niet uitgeschakeld**: een grijze knop legt niets uit. Hij blijft klikbaar en
   toont bij een klik een melding met het aantal open vragen en een knop naar de vragenpagina met
   het filter op deze meting.
2. **De route.** `app/api/analyses/[id]/generate` en `.../generate-all` weigeren met status 409 en
   een Nederlandse melding zolang er openstaande vragen bij deze meting horen. Zonder deze laag is
   de poort een suggestie: de route is met een enkele `fetch` te omzeilen, en er hangt echt geld
   aan een schrijfronde.

### Bestanden

- `lib/content-questions-gate.ts`, nieuw en puur (conventie 2, zonder `server-only`):
  `contentPoort({ openVragen, metingNaam })` geeft terug of het mag en welke melding erbij hoort.
  De tekst van de melding hoort hier, niet in de component, want dan is hij testbaar.
- `app/(app)/analyses/[id]/_chapters/werk.tsx`: telling doorgeven.
- `app/(app)/analyses/[id]/_work/generate-button.tsx` en `generate-all-button.tsx`: de melding.
- `app/api/analyses/[id]/generate/route.ts` en `generate-all/route.ts`: de controle, ná de
  eigenaarscontrole en vóór `mayTriggerCost`, zodat de duurste controles niet onnodig draaien.
- `scripts/test-unit.ts`: de pure functie, inclusief de grensgevallen nul vragen, alleen
  overgeslagen vragen, en één open vraag.
- `scripts/test-chain.ts`: een scenario met een open vraag bij een meting. Schrijven weigeren met
  409, vraag beantwoorden, schrijven lukt. Dit hoort in de ketentest en niet in de unittest: het
  gaat over de samenhang tussen twee taken, en dat is precies waar de zeven fouten van dit traject
  zaten.

### Verificatie

- Een meting met één open vraag: de knop toont de melding, de route geeft 409, er komt geen taak in
  de wachtrij (controleren in `jobs`).
- Diezelfde vraag overslaan: schrijven lukt.
- Een meting zonder vragen: er verandert niets aan het huidige gedrag.

---

## Volgorde van uitvoeren

De blokken raken elkaar, dus de volgorde is niet vrij.

1. **Blok B eerst** (hernoeming), want blok C zet een nieuw menu-item tussen items die dan al hun
   nieuwe naam hebben, en blok A schrijft labels die het woord meting gebruiken. Andersom herschrijf
   je dezelfde regels twee keer.
2. **Blok A**, want die staat los van C en D en is het snelst zichtbaar voor de eigenaar.
3. **Blok C**, want de melding uit blok D linkt naar de pagina uit blok C.
4. **Blok D** als laatste.

Elk blok is een eigen commit, met de bijbehorende documentatie in diezelfde commit.

**Geen migratie nodig.** Alle gegevens bestaan al: `content_pieces.action`, `published_at`,
`is_current` en `fact_requests.analysis_id` zijn er sinds migratie 0019 tot en met 0024. Blijkt bij
het bouwen tóch een kolom te ontbreken, dan additief en idempotent, en de index in
`supabase/README.md` bijwerken.

## Vaste controle vóór elke commit

`npx tsc --noEmit` · `npm run test:unit` · `npm run test:chain` · `npm run build`. Alle vier groen.

## Documentatie in dezelfde ronde

| Wat | Waarheen |
|---|---|
| De drie begrippen en de nieuwe woordkeuze | `docs/schrijfstijl.md`, woordenlijst |
| Vier cijfers als totalen, en waarom cijfer 1 dat niet is | `docs/ux-design.md` en het commentaar in `lib/overview.ts` |
| De nieuwe pagina en het vierde menu-item onder Strategie | `docs/ux-design.md` §5 en `lib/nav.ts` |
| De contentpoort, mét de tegenspraak met het besluit over de uitweg | `docs/logbook.md`, met datum |
| De hernoeming en de route-doorverwijzing | `docs/architecture.md` |
| Deze taak, zodra hij af is | Weg uit `docs/tasks/`, samengevat in `docs/logbook.md` |
