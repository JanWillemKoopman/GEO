# Onboarding 3.0: pre-boarding, het gesprek, en het volledige profiel

**Opgesteld:** 19 augustus 2026. **Status: bouwplan, nog niets van gebouwd.**

De opdracht van de eigenaar: de consultant zet vóór het eerste contact een merk klaar (de
pre-boarding), en gaat daarna mét de klant aan tafel om alles na te lopen, aan te vullen en te
verrijken op één plek die alleen de consultant ziet. Inclusief wat de pijplijn nooit kan ophalen,
zoals de strategie van de klant. Kwaliteit op het niveau van InSpace Nova.

Dit document zegt eerst wat er al staat, want dat is meer dan verwacht, en beschrijft daarna wat er
gebouwd wordt in vijf fases.

---

## 1. Drie aannames uit de opdracht, en hoe ze zich verhouden tot de code

Geen van de drie maakt de opdracht onterecht. Alle drie veranderen wél wat er gebouwd moet worden.

**a. "Een volledig profiel zoals bij Nova" bestaat al.** `/merk/[id]/merkprofiel/bewerken` rendert
`BrandWizard` met **41 velden in zeven stappen**, per veld een label, een uitleg en een echt
voorbeeld (`lib/pipeline/brand-fields.ts` regel 35 tot 41: die drie lagen zijn letterlijk van Nova
overgenomen), plus een herkomstchip die toont of de waarde uit de website komt, van de klant, of uit
het gesprek. `scripts/test-unit.ts` bewaakt in beide richtingen dat de zeven stappen exact
`EDITABLE_PROFILE_FIELDS` dekken. Er hoeft dus geen formulier gebouwd te worden.

**b. "Alle velden die Nova uitvraagt meenemen" is al gebeurd.** Migratie `0048` legde Nova's
onboarding naast de kolommen van ORBIT ENGINE: van de ongeveer veertig velden bestonden er veertien
al, kon de pijplijn er elf afleiden, vervielen er vier bewust, en zijn de laatste dertien toen
gebouwd. Die telling is op 19 augustus 2026 nagerekend tegen `docs/nova-i18n.json` zelf en houdt
stand. Wat de vergelijking destijds **wel** miste, is Nova's tweede invoerlaag aan de kant van de
begeleider. Die staat in §5 hieronder, met per veld een oordeel.

**c. Een apart gespreksscherm is ooit expliciet afgewezen.** `strategy-box.tsx` regel 19 tot 21:
"Bewust geen apart gespreksscherm: het gesprek gaat over hetzelfde profiel dat hier al staat, en een
tweede scherm met dezelfde velden is een tweede plek waar iets kan verouderen." Dat argument is
juist en blijft staan. Dit plan lost het op zonder het te negeren: **één veldenlijst, drie
oppervlakken.** Er komt geen tweede formulierdefinitie, geen tweede opslagroute en geen tweede
lijst met velden. Het gespreksscherm rendert dezelfde catalogus, in een andere volgorde, achter een
ander slot, en schrijft een andere herkomst weg.

**Wat Nova doet, en waarom wij het anders doen.** In `nova-i18n.json` vult de klant zijn onboarding
zelf in ná de verkoop, via een uitnodiging met wachtwoord; de begeleider bereidt voor en wacht
("nothing for you to do until the client completes it"). De opdracht hier is bewust anders: de
consultant zet klaar en doet de verrijking sámen met de klant. Dat is geen kopie van Nova maar een
betere variant, want de klant hoeft geen veertig velden alleen in te vullen en de consultant heeft
in het uur consultancy iets om over te praten in plaats van een leeg formulier.

---

## 2. Wat er dan wél ontbreekt

Vier dingen, en dat is precies de omvang van dit plan.

1. **De commerciële laag.** Alle 41 velden gaan over wie het merk ís en hoe het klínkt. Geen enkel
   veld gaat over wat het merk wil **verkopen**, waar het wil **groeien**, en waar het juist géén
   content voor wil. Nova heeft die laag ook niet. Dit is het deel waar het uur consultancy over
   gaat en waar geen crawler bij kan.
2. **Het moment.** Er is geen oppervlak waarop een consultant met een klant aan tafel het profiel
   doorloopt. `/merk/[id]/admin` bestaat en is staf-only, maar is een **inzichtscherm** ("wat er
   onder het merkdossier zit"), geen werkscherm.
3. **De pre-boarding gebruikt zijn eigen leiding niet.** `app/api/profiles/route.ts` accepteert bij
   het aanmaken al tien velden meer dan het scherm verstuurt, en `prepare-profile.ts` geeft ze door
   aan het onderzoek. Het aanmaakscherm stuurt alleen naam, webadres en naamvarianten.
4. **De lus terug ontbreekt.** Wat in het gesprek wordt vastgelegd, verandert niets meer aan de
   onderzoeksuitkomsten die er al liggen. De onderwerpen, de markt en de kennistest zijn dan al
   gedraaid op wat het model gokte.

---

## 3. Het ontwerp: drie momenten, één veldenlijst

| Moment | Wie | Waar | Wat er gebeurt | Herkomst die wordt weggeschreven |
|---|---|---|---|---|
| **1. Pre-boarding** | consultant alleen, vóór contact | `/merk/nieuw` | De drie huidige velden, plus uitsluitend wat de meting stuurt en wat een consultant vooraf echt kan weten | `consultant` |
| **2. Het gesprek** | consultant mét de klant | `/merk/[id]/admin/onboarding` (staf-only) | Alles nalopen, aanvullen, en de commerciële laag invullen | `gesprek` |
| **3. Zelf aanvullen** | de klant, daarna | `/merk/[id]/merkprofiel/bewerken` | Ongewijzigd. Blijft bestaan voor wat de klant later zelf bijwerkt | `klant` |

**De regel eronder:** een veld wordt op één plek gedefinieerd (`lib/pipeline/brand-fields.ts`), door
één route opgeslagen (`PATCH /api/profiles/[id]`), en tegen één lijst gevalideerd
(`EDITABLE_PROFILE_FIELDS`). De drie oppervlakken verschillen alleen in volgorde, in wie er mag, en
in de herkomst die ze wegschrijven.

### Waarom herkomst de spil van dit plan is

`profile_field_sources` (migratie `0039`) legt per veld vast wie hem zette, met welke zekerheid en
op welk bewijs, en `field-merge.ts` maakt daar de regel "een mens wint van een model" mee
afdwingbaar: **alleen `ai` mag door een volgende onderzoeksronde overschreven worden.** Dat is de
reden dat het gesprek geen eenmalige invuloefening is maar iets dat blijft staan.

Vandaag kent die tabel drie herkomsten: `ai`, `klant`, `gesprek`. Er komt er één bij.

⚠️ **`consultant` is niet hetzelfde als `klant`.** Wat de consultant vóór het gesprek invult is een
onderbouwde aanname, geen bevestigd feit. Dat onderscheid is niet cosmetisch: `profile-research.ts`
regel 46 tot 49 instrueert het model letterlijk om door de klant opgegeven concurrenten,
waardeproposities en tone-of-voice te **respecteren** en niets anders te verzinnen. Zou een
consultant-aanname als klantwaarde binnenkomen, dan legt die aanname het eigen marktonderzoek stil.
Met een eigen herkomst kan de prompt het verschil maken: een `gesprek`-waarde is waarheid, een
`consultant`-waarde is een startpunt dat geverifieerd mag worden.

### Waarom één lange pagina en geen wizard

De klant doorloopt een wizard omdat hij één keer van voor naar achter gaat. Een gesprek gaat niet
van voor naar achter: het springt. De sessiepagina wordt daarom één pagina met een sectie-rail
(`components/section-rail.tsx`, hetzelfde patroon als het clusterdossier), alle groepen tegelijk in
beeld, en opslaan per veld in plaats van per stap.

⚠️ **De pagina opent met de gaten, niet met veld 1.** Bovenaan staat "wat ORBIT ENGINE niet weet":
de velden die leeg zijn of alleen door het model zijn ingevuld, gesorteerd op wat ze stukmaken als
ze fout staan. Daaronder pas de volledige lijst ter controle. Zonder die volgorde kost het gesprek
een uur aan het bevestigen van dingen die al klopten, en dat is precies het uur dat de klant betaalt
voor strategie.

---

## 4. De nieuwe velden: de commerciële laag

Twaalf velden. Elk voldoet aan twee eisen: **een website kan het niet zeggen**, en **een
pijplijnstap wordt er aantoonbaar beter van**. Velden die alleen het gesprek helpen maar nergens
gelezen worden, staan hier bewust niet in; dat is administratie.

| Veld | Type | Wat het is | Welke stap er beter van wordt |
|---|---|---|---|
| `priority_offerings` | `text[]` | Welke diensten of producten commercieel voorop staan | `propose-topics.ts`, `plan-build.ts`, de potentiescore |
| `deprioritised_offerings` | `text[]` | Waar géén content voor mag komen: te weinig marge, wordt uitgefaseerd | `propose-topics.ts`, `plan-order.ts` |
| `growth_regions` | `text[]` | Waar het merk heen wil, los van waar het nu al werkt | `prompts.ts`, de regionale vragen |
| `target_segments` | `text[]` | De segmenten waar de groei zit, bijvoorbeeld "installateurs met eigen monteurs" | `propose-topics.ts`, `personas` |
| `deal_value_band` | `text` (`onbekend`, `klein`, `midden`, `groot`) | Wat een klant ongeveer waard is | de weging in de potentiescore |
| `seasonality` | `text` | Piek- en dalmomenten in het jaar | `plan-order.ts`, wanneer iets gepubliceerd hoort te worden |
| `sales_objections` | `text[]` | De bezwaren die in elk verkoopgesprek terugkomen | `briefing.ts` en `content.ts`. Dit is het meest ondergewaardeerde veld van de lijst: een AI-antwoord heeft vaak precies de vorm van een bezwaar |
| `forbidden_topics` | `text[]` | Onderwerpen waar niet over geschreven mag worden, juridisch of concurrentiegevoelig | `content-gate.ts`, `propose-topics.ts` |
| `offline_proof` | `text[]` | Bewijs dat nergens op de site staat: certificeringen, cases, cijfers | de feitenbank, `factbase.ts` |
| `name_exclusions` | `text[]` | Gelijknamige bedrijven die níet dit merk zijn | `measure.ts`, de vermeldingsclassificatie |
| `respect_site_structure` | `boolean` | Mag het advies nieuwe pagina's voorstellen, of moet het binnen de bestaande structuur blijven | `structure-gap.ts`, `plan-build.ts` |
| `goal_12m` | `text` | Wat het merk over twaalf maanden bereikt wil hebben | `plan-build.ts`, en de duiding in het rapport |

⚠️ **`offline_proof` staat naast `proof_points` en vervangt hem niet.** `proof_points` is per
definitie uit de site geëxtraheerd zonder klant-invoer (`prepare-profile.ts` regel 233 tot 236: dat
is de grondslag onder contentkwaliteit A2). Ze door elkaar halen breekt de belofte dat elk
proof point letterlijk op een bronpagina staat.

⚠️ **`name_exclusions` is de tegenhanger van `aliases`** en komt uit de vergelijking met Nova: wij
meten vermeldingen en Nova niet, dus wij hebben een uitsluitingslijst nodig die zij niet kennen. De
kennistest meet die verwarring vandaag al (`llm-baseline.ts`, het blok `verwarring`) maar bewaart
hem nergens. Fase 4 vult dit veld daarom **automatisch voor** uit die meting, zodat de consultant
bevestigt in plaats van bedenkt.

### Waar deze velden landen, en waarom niet in `profile_strategy`

Kolommen op `profiles`, net als de dertien uit `0048`. De reden is de typering: `BrandField.key` is
`keyof Profile` (`brand-fields.ts` regel 76), en dat is precies wat de garantie "alles in de
catalogus is opslaanbaar" mogelijk maakt. Velden uit een andere tabel zouden die typering breken.

De grens met de bestaande tabel wordt daarmee scherp, en die regel hoort in het commentaar van de
migratie:

- **Een blijvende eigenschap van het merk** hoort op `profiles`. Ook als een mens hem invulde.
- **Een gebeurtenis met een houdbaarheidsdatum** hoort in `profile_strategy.context_factors`, want
  daar hangt per soort een gevolg aan in code (`context-factors.ts`), zoals de houdbaarheidsmelding
  bij een nieuwe website.
- **De losse gespreksnotitie** blijft `profile_strategy.strategy_notes`.

---

## 5. Nova's tweede invoerlaag: het oordeel per veld

Uit `docs/nova-i18n.json`, de sleutels rond 566 tot 602. Dit is de laag die de begeleider bij Nova
invult vóór de strategie gegenereerd wordt, en die in migratie `0048` nooit is beoordeeld.

| Nova-veld | Oordeel | Waarom |
|---|---|---|
| 3 tot 5 funnels | **Niet overnemen** | ORBIT ENGINE leidt dit af: één taak per funnelfase, standaard tien vragen per fase (`lib/prompt-mix.ts`). Zelf laten kiezen is een handmatige stap terug |
| Talen | **Bestaat al** | `market_language` |
| Doelland | **Bestaat al** | `market_language` plus `service_scope` |
| Nieuwe site ja of nee | **Bestaat al** | `context_factors.nieuwe_website`, met gevolg in code |
| Meertalig ja of nee | **Niet overnemen** | Meertaligheid is geschrapt (besluit 13, `docs/tasks/roadmap.md`) |
| Huidige sitestructuur respecteren | **Overnemen** | Staat als `respect_site_structure` in de tabel hierboven. Bepaalt of het advies nieuwe pagina's mag voorstellen |

De vier velden die in `0048` bewust vervielen (taalkeuze, CMS, auteurspagina, Google Analytics)
blijven vervallen. De CMS-koppeling komt terug in sprint 9 van `ontwikkelplan-visie.md` en niet
eerder.

---

## 6. De fases

Elke fase is los af te ronden en los te verifiëren. De volgorde is niet vrij: fase 1 is de
voorwaarde voor de rest, en fase 2 repareert een gat dat elke extra invoer anders vergroot.

### Fase 1, het fundament

**Doel.** De twaalf velden bestaan, staan in de catalogus, en zijn opslaanbaar. Nog geen nieuw
scherm.

**Bestanden.**
- `supabase/migrations/0060_onboarding_3.sql`: de twaalf kolommen, additief en idempotent, allemaal
  nullable behalve de array-velden (die krijgen `default '{}'`, zelfde regel als `0048`). Plus de
  uitbreiding van de herkomstconstraint met `consultant`, op beide plekken waar hij staat
  (`profile_field_sources` en `profile_offerings`).
- `lib/types/database.ts`: de twaalf kolommen op `Profile`, plus `ProfileFieldSource` uitbreiden.
- `lib/profile-editable.ts`: de twaalf toevoegen aan `EDITABLE_PROFILE_FIELDS`.
- `lib/pipeline/brand-fields.ts`: een achtste stap `strategie`, met per veld label, uitleg en een
  echt voorbeeld. `derivable: false` voor alle twaalf, want dat is de definitie van deze laag.
- `app/api/profiles/[id]/route.ts`: de nieuwe velden valideren, en de herkomst wegschrijven met de
  meegegeven bron.

**Verificatiecriterium.** `npm run test:unit` faalt in beide richtingen als een veld in de catalogus
staat maar niet in `EDITABLE_PROFILE_FIELDS`, of omgekeerd. De bestaande test die "41 in, 41 uit"
bewaakt telt na deze fase 53 en blijft in beide richtingen sluitend.

### Fase 2, de pre-boarding

**Doel.** Wat de consultant vóór het gesprek echt kan weten, komt de pijplijn in, veilig.

⚠️ Dit is de fase die de vorige Teamsessie als voorwaarde aanmerkte. Zonder de eerste twee punten
hieronder vergroot elk extra invoerveld de opbrengst en het vergiftigingsrisico even hard.

**Bestanden.**
- `app/api/profiles/route.ts`: schrijf bij het aanmaken rijen in `profile_field_sources` met bron
  `consultant`. Vandaag schrijft deze route er nul, terwijl de bijwerkroute het wel doet, waardoor
  wat een consultant typt niet te onderscheiden is van modeluitvoer en niet beschermd wordt door
  `filterProtectedFields()`.
- `lib/pipeline/prepare-profile.ts`: laat mensinvoer dezelfde normalisatie passeren als
  modeluitvoer. Vandaag gaat modeloutput door `resolveScope()` en gaat een getypte waarde er
  ongefilterd langs, terwijl `service_regions[0]` letterlijk in zes kennistestvragen wordt geplakt.
- `lib/pipeline/profile-research.ts`: splits de instructie. Een `gesprek`-waarde blijft leidend, een
  `consultant`-waarde wordt aangeboden als startpunt dat het onderzoek mag tegenspreken.
- `app/(app)/merk/nieuw/onboarding-wizard.tsx`: één keuzeveld erbij voor het bereik, met een
  plaatsveld dat alleen bij "lokaal" verschijnt. Meer niet.

⚠️ **Waarom alleen het bereik en niet meer.** Het besluit van elf velden terug naar drie gold ook
voor de consultant: alleen staf kan een merk aanmaken (`mayTriggerCost` is letterlijk `isStaff`).
Het criterium uit de Teamsessie is scherper dan "vooraf of achteraf": **kost het ontdekken van de
fout ná de meting een nieuwe betaalde meetronde?** Bij het bereik is dat zo, want het bepaalt of de
vragen regionaal of landelijk gesteld worden. Bij alle andere velden niet, want die zijn ná de
pijplijn gratis te corrigeren, en die horen dus in het gesprek.

**Verificatiecriterium.** Een nieuw merk aanmaken levert rijen in `profile_field_sources` met bron
`consultant`. Een tweede onderzoeksronde laat die waarden staan. Een ketentest in
`scripts/test-chain.ts` dekt beide.

**Meet dit eerst.** Vóór het bereikveld gebouwd wordt: tel hoeveel profielen die ná 3 augustus 2026
zijn aangemaakt nog steeds op `service_scope = null` eindigen. Het cijfer "vier van de negen" is van
11 augustus en kan profielen bevatten van vóór de reparatie in `resolveScope()`. Is het antwoord
nul, dan vervalt het vierde punt van deze fase en blijft de rest staan.

### Fase 3, de onboardingsessie

**Doel.** Het scherm waar consultant en klant samen aan tafel zitten.

**Bestanden.**
- `app/(app)/merk/[id]/admin/onboarding/page.tsx`: nieuw, staf-only. Onder `admin/` omdat dat
  segment de afscherming al heeft en de klant er een 404 krijgt in plaats van een 403.
- `app/(app)/merk/[id]/_components/onboarding-session.tsx`: rendert `BRAND_FIELDS` gegroepeerd, met
  de sectie-rail ernaast. **Geen eigen veldendefinities.**
- `app/(app)/merk/[id]/_components/brand-wizard.tsx`: de veldweergave eruit trekken naar een
  gedeelde component, zodat wizard en sessie dezelfde invoervelden tonen. Dit is de enige plek waar
  dit plan bestaande code herstructureert, en het is precies wat voorkomt dat er een tweede
  formulier ontstaat.
- `lib/profile-gaps.ts`: uitbreiden zodat "wat ORBIT ENGINE niet weet" gesorteerd kan worden op
  gevolg, niet op veldvolgorde.
- `lib/nav.ts`: de bestemming toevoegen onder Admin.

**Wat er op het scherm staat, in deze volgorde.**
1. **De gaten.** Leeg of alleen door het model ingevuld, gesorteerd op wat het stukmaakt.
2. **De commerciële laag.** De twaalf nieuwe velden. Dit is waar het uur consultancy over gaat.
3. **De 41 ter controle**, per groep, elk met zijn herkomstchip.
4. **De voortgangsmeter**: hoeveel velden bevestigd in het gesprek, hoeveel van het model, hoeveel
   leeg. Dit is wat "volledig profiel" meetbaar maakt in plaats van gevoelsmatig.

**Opslaan.** Per veld, met bron `gesprek` en `set_by` op de ingelogde consultant. Geen
opslaanknop onderaan: een gesprek wordt onderbroken, en een half ingevuld formulier dat bij het
weglopen verdwijnt is de duurste fout die dit scherm kan maken.

**Verificatiecriterium.** Een klantaccount dat het adres raadt krijgt een 404. Een veld dat in de
sessie wordt gezet krijgt bron `gesprek` en overleeft een herhaalronde van het onderzoek.

### Fase 4, de lus terug naar de pijplijn

**Doel.** Wat er in het gesprek bij komt, verandert daadwerkelijk de uitkomst.

Zonder deze fase is de sessie een archief. De onderwerpen, de markt en de kennistest zijn dan al
gedraaid op wat het model gokte, en de nieuwe kennis verandert daar niets meer aan.

**Bestanden.**
- `app/(app)/merk/[id]/admin/onboarding/page.tsx`: een knop "onderzoek bijwerken met wat we net
  hebben vastgelegd", met een kostenraming ernaast en achter `mayTriggerCost`.
- `lib/jobs/handlers.ts`: alleen de stappen opnieuw inplannen die van de gewijzigde velden afhangen.
  Bij een gewijzigd bereik zijn dat de vragen en de kennistest, bij gewijzigde prioriteiten de
  onderwerpen, bij een gewijzigde uitsluitingslijst niets dat opnieuw hoeft.
- `lib/pipeline/llm-baseline.ts`: het verwarringblok wegschrijven als voorstel voor
  `name_exclusions`, zodat de consultant bevestigt in plaats van bedenkt.
- `lib/pipeline/propose-topics.ts`, `market.ts`, `plan-build.ts`, `briefing.ts`, `content.ts`: de
  nieuwe velden lezen. Elk veld uit §4 heeft precies één lezer, en die staat in de tabel.

⚠️ **De bescherming van `gesprek` is hier de hele grap.** `field-merge.ts` laat alleen `ai`
overschrijven, dus een herhaalronde verrijkt zonder de uitkomst van het gesprek weg te gooien. Die
regel bestaat al en hoeft niet gebouwd te worden, hij moet alleen niet stukgemaakt worden.

**Verificatiecriterium.** Een ketentest waarin een bereikwijziging in de sessie de vragen opnieuw
laat genereren, de kennistest opnieuw laat draaien, en de gesprekswaarden na afloop nog steeds staan.

### Fase 5, opruimen en op één lijn

**Doel.** Eén feit, één eigenaar, en de documentatie klopt weer.

**Bestanden.**
- `app/(app)/merk/[id]/admin/page.tsx`: `StrategyBox` verhuist naar de sessiepagina. Op het
  inzichtscherm blijft een verwijzing staan, geen tweede invoerplek.
- `app/(app)/merk/[id]/merkprofiel/bewerken/page.tsx`: ongewijzigd in werking, maar de achtste stap
  verschijnt hier **niet**. De commerciële laag is niets voor de klant om alleen in te vullen, en
  het is de enige plek waar de twee oppervlakken bewust verschillen. Leg dat vast in het commentaar,
  anders herstelt iemand het als een omissie.
- `docs/architecture.md` §5 en §11, `docs/ux-design.md` §5, `supabase/README.md`, `docs/logbook.md`.
- `docs/tasks/onboarding-3.0.md`: dit bestand gaat weg zodra fase 5 klaar is, samengevat in het
  logboek. Dat is de afspraak voor alles in `docs/tasks/`.

**Verificatiecriterium.** De vier vaste controles groen: `npx tsc --noEmit`, `npm run test:unit`,
`npm run test:chain`, `npm run build`.

---

## 7. Wat we bewust niet doen

- **Geen tweede veldenlijst, geen tweede opslagroute.** De reden staat in `strategy-box.tsx` regel
  19 tot 21 en die blijft geldig.
- **Geen verplichte velden in de sessie.** Onbekend is een betere waarde dan een verkeerde
  (conventie 3). Een verplicht veld aan tafel levert een ingevuld vakje op, geen kennis.
- **Geen zelfregistratie voor de klant zoals Nova.** Het product is sales-led. De klant vult niets
  alleen in wat hij niet begrijpt.
- **Geen AI-aanroep in de sessie.** Het scherm leest wat er al ligt. Wie de sessie een suggestie wil
  laten doen, doet dat via de bestaande stappen in fase 4, met een kostenraming ervoor.
- **Geen meertaligheid, geen CMS-koppeling, geen Google Analytics.** Geschrapt of later, zie §5.

---

## 8. Risico's

| Risico | Hoe dit plan het afdekt |
|---|---|
| Het gesprek kost een uur aan het bevestigen van dingen die al klopten | De pagina opent met de gaten, niet met veld 1 |
| Een consultant-aanname legt het marktonderzoek stil | Eigen herkomst `consultant`, en de onderzoeksprompt behandelt die als startpunt in plaats van als waarheid (fase 2) |
| Er ontstaat alsnog een tweede formulier dat gaat verouderen | De veldweergave wordt gedeelde code, en de test telt in beide richtingen |
| Twaalf velden erbij en niemand leest ze | Elk veld in §4 heeft een genoemde lezer. Een veld zonder lezer hoort niet in de tabel |
| De herhaalronde overschrijft het gesprek | Bestaat al: alleen `ai` mag overschreven worden. Fase 4 mag die regel niet stukmaken |
| Het cijfer onder fase 2 klopt niet meer | Eerst tellen, dan bouwen. Staat als eerste stap in fase 2 |

---

## 9. Kosten

De sessie zelf kost niets: het scherm leest wat er ligt en doet geen AI-aanroep. De twaalf velden
gaan mee in aanroepen die er toch al zijn, ruwweg 150 tokens extra op een bestaande aanroep, ver
onder een cent.

De enige echte kostenpost is fase 4, het bijwerken van het onderzoek ná het gesprek. Dat is
gedeeltelijk opnieuw draaien, geen volledige onboarding: bij een gewijzigd bereik gaat het om de
promptgeneratie en de kennistest. Een volledige onboarding kost ongeveer $0,25, dus dit blijft daar
ruim onder. De knop staat achter dezelfde kostenpoort als al het andere betaalde werk, en toont de
raming vooraf.
