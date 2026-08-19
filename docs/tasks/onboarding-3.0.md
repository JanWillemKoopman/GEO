# Onboarding 3.0: pre-boarding, het gesprek, en het volledige profiel

**Opgesteld:** 19 augustus 2026. **Herzien:** 19 augustus 2026, uitgebreid met een kwaliteitsmeting
tegen InSpace Nova (deel A) en het schermontwerp voor de beheerder (deel B).
**Status: bouwplan, nog niets van gebouwd.**

De opdracht: de consultant zet vóór het eerste contact een merk klaar (de pre-boarding), en gaat
daarna mét de klant aan tafel om alles na te lopen, aan te vullen en te verrijken op één plek die
alleen de consultant ziet. Inclusief wat de pijplijn nooit kan ophalen, zoals de strategie van de
klant. Kwaliteit op het niveau van Nova.

---

## 0. Drie aannames uit de opdracht, en hoe ze zich verhouden tot de code

Geen van de drie maakt de opdracht onterecht. Alle drie veranderen wél wat er gebouwd moet worden.

**a. Het volledige profiel op Nova-niveau bestaat al.** `/merk/[id]/merkprofiel/bewerken` rendert
`BrandWizard` met **41 velden in zeven stappen**, per veld een label, een uitleg en een echt
voorbeeld (`lib/pipeline/brand-fields.ts` regel 35 tot 41: die drie lagen zijn letterlijk van Nova
overgenomen), per stap een eigen titel en uitleg (`STEP_META`), een voortgangsteller per stap
(`stepProgress`), en een herkomstchip per veld. `scripts/test-unit.ts` bewaakt in beide richtingen
dat de zeven stappen exact `EDITABLE_PROFILE_FIELDS` dekken. Er hoeft geen formulier gebouwd te
worden.

**b. De velden van Nova zijn al overgenomen.** Migratie `0048` legde Nova's onboarding naast de
kolommen van ORBIT ENGINE: van de ongeveer veertig velden bestonden er veertien al, kon de pijplijn
er elf afleiden, vervielen er vier bewust, en zijn de laatste dertien toen gebouwd. Die telling is
op 19 augustus 2026 nagerekend tegen `docs/nova-i18n.json` zelf en houdt stand. Wat de vergelijking
destijds miste is Nova's tweede invoerlaag aan de kant van de begeleider; die krijgt in deel E een
oordeel per veld.

**c. Een apart gespreksscherm is ooit expliciet afgewezen.** `strategy-box.tsx` regel 19 tot 21:
"Bewust geen apart gespreksscherm: het gesprek gaat over hetzelfde profiel dat hier al staat, en een
tweede scherm met dezelfde velden is een tweede plek waar iets kan verouderen." Dat argument is
juist en blijft staan. Dit plan lost het op zonder het te negeren: **één veldenlijst, drie
oppervlakken.** Er komt geen tweede formulierdefinitie, geen tweede opslagroute en geen tweede
veldenlijst.

---

# DEEL A. Kunnen we echt aan Nova tippen?

De vraag is terecht, want onze aanpak is anders: bij Nova vult de klant zijn onboarding zelf in ná
de verkoop (uitnodiging met wachtwoord, `onboarding.activation` in de JSON; de begeleider
"has nothing to do until the client completes it"), bij ons zet de consultant klaar en doet de
verrijking sámen met de klant.

Kwaliteit van een onboarding zit niet in het aantal velden. Het zit in elf mechanismen. Hieronder
staan ze alle elf, met wat Nova doet, wat wij vandaag hebben, en het oordeel.

| # | Mechanisme | Nova | ORBIT ENGINE vandaag | Oordeel |
|---|---|---|---|---|
| 1 | Veldendekking | ~33 merkvelden plus een account-laag | 41 bewerkbare velden | **Gelijk**, en na fase 1 wint ORBIT met 53 |
| 2 | Drie lagen uitleg per veld (label, betekenis, echt voorbeeld) | `*Desc` en `*Placeholder` bij elk veld | Al overgenomen, `description` en `placeholder` in `brand-fields.ts` | **Gelijk** |
| 3 | Uitleg per stap: waaróm dit blok bestaat | `nav.*Subtitle`, bijvoorbeeld "So everything NOVA writes sounds like your team" | `STEP_META`, bijvoorbeeld "Vijf schuiven bepalen de toon van elke pagina" | **Gelijk** |
| 4 | Tonen waar een waarde vandaan komt | Eén badge: "Drafted from your website" | Vier herkomsten in `profile_field_sources`, met zekerheid, bron-URL en citaat | **ORBIT wint**, en met afstand |
| 5 | Voortgang per stap zichtbaar | Per stap een status | `stepProgress`, `overallProgress` | **Gelijk** |
| 6 | Bewust overslaan, met status | "Skip for now", badge "Skipped", "Skipped, you can add this after launch", "Not completed yet" | Alleen leeg of gevuld | **Nova wint** |
| 7 | Een afsluitmoment | Stap "Review & launch": "One last look before NOVA gets to work", plus "Some required steps aren't complete yet" | Geen enkel moment waarop een profiel "af" is | **Nova wint** |
| 8 | Opslaan tijdens het invullen | "Saving…", "Save & return to review" per stap | Eén opslaanknop plus een waarschuwing bij weglopen | **Nova wint** |
| 9 | Wie vult in, en hoe lang het duurt | De klant, alleen, ~20 minuten vanaf nul | De klant kijkt na wat de pijplijn vond | **ORBIT wint** op tijd, **Nova wint** op de garantie dat elk blok gezien is |
| 10 | Wat er na de onboarding gebeurt | Strategie genereren | Het onderzoek draait al vóór het gesprek, meting volgt | **ORBIT wint** |
| 11 | Bedrijfs- en contactgegevens | Eigen account-stap: contactpersoon, e-mail, telefoon, facturatie, "Prefilled from your contract" | Niets. Er is geen contactpersoon vastgelegd | **Nova wint** |

## Het antwoord

**Ja, we kunnen eraan tippen, en op vier van de elf punten zijn we al beter. Maar niet zonder de
vier punten te repareren waar Nova wint.** Die vier zijn geen smaakverschillen, het zijn de
mechanismen die een onboarding afmaken in plaats van openlaten. Ze staan hieronder als concrete
bouwopdracht, en ze zitten alle vier in de fases van deel F.

**A1. Overslaan met een reden (mechanisme 6).** Vandaag is een leeg veld dubbelzinnig: het kan
"weten we nog niet" betekenen of "niet van toepassing". Een merk zonder auteur heeft geen
auteursbio, en dat is geen gat. Zonder dat onderscheid haalt de volledigheidsmeter nooit 100% en is
hij binnen twee gesprekken waardeloos.
**Oplossing:** een veld kan gemarkeerd worden als **niet van toepassing**, per merk, met wie dat
zette. Technisch een kolom `not_applicable` op `profile_field_sources`, precies de tabel waar
per-veld-metadata al woont. De meter telt dan `gevuld + n.v.t. = behandeld`.

**A2. Een afsluitmoment (mechanisme 7).** Nova heeft "Review & launch". Wij hebben niets: de
pijplijn draait gewoon door en niemand zegt ooit dat het profiel af is.
**Oplossing:** de sessie eindigt met een afrondblok dat drie dingen doet: tonen wat er nog open
staat, het gesprek vastleggen met datum en naam (`profile_strategy.recorded_at` bestaat al), en het
onderzoek bijwerken met wat er net bij kwam (fase 4). Dat is ons equivalent van "launch", en het is
sterker dan dat van Nova omdat er echt iets achteraan draait.

**A3. Opslaan terwijl je praat (mechanisme 8).** De huidige wizard heeft één opslaanknop en een
waarschuwing bij weglopen. Dat past bij een klant die rustig een formulier doorloopt. Het past niet
bij een gesprek dat springt, onderbroken wordt, en waarin de klant halverwege zijn telefoon pakt om
iets op te zoeken.
**Oplossing:** op de sessiepagina slaat elk veld zichzelf op zodra het de focus verlaat, met een
zichtbare stand per veld (opgeslagen, opslaan, mislukt). De klantwizard blijft ongewijzigd, want
daar is de knop juist goed.

**A4. De contactpersoon (mechanisme 11).** Nova legt contactpersoon, e-mail en telefoon vast op de
account-stap. Wij leggen nergens vast met wie we aan tafel zaten. Dat wreekt zich bij de overdracht:
`toewijzen` koppelt een merk aan een account, maar niet aan een mens.
**Oplossing:** drie velden op de sessiepagina, in een eigen blok "Met wie we praten". Facturatie
komt hier níet bij: het product is sales-led en er is bewust geen self-serve betaalstroom.

⚠️ **Wat we bewust níet van Nova overnemen: verplichte stappen.** Nova dwingt af dat elk blok
bekeken is voordat je mag starten ("Some required steps aren't complete yet. Finish them, then
launch."). Bij ons draait het onderzoek al vóór het gesprek, dus er is niets om op te wachten, en
een verplicht veld aan tafel levert een ingevuld vakje op in plaats van kennis. Conventie 3 zegt het
al: onbekend is een betere waarde dan een verkeerde. Wij tonen wat er open staat en blokkeren niets.

---

# DEEL B. De route van de beheerder door de interface

## B1. Hoe die route vandaag loopt

| Stop | Scherm | Wat je er doet |
|---|---|---|
| 1 | `/beheer`, "Waar lopen we achter?" | Alle merken van alle klanten, gesorteerd op wat aandacht vraagt |
| 2 | `/merk/nieuw` | Merk aanmaken, drie velden |
| 3 | `/merk/[id]/merkprofiel` | Kijken wat de pijplijn vond |
| 4 | `/merk/[id]/admin`, "Onboarding-inzicht" | Volledigheid, taken, tijden, en het gespreksblok |
| 5 | `/merk/[id]/admin/toewijzen` | Het merk aan een klantaccount koppelen |

## B2. Vijf knelpunten in die route

1. **Er is geen werkscherm voor het gesprek.** Stop 4 is een inzichtscherm ("wat er onder het
   merkdossier zit"). Het gespreksblok staat er onderaan tussen taaktijden en kostenregels.
2. **De levenscyclus van een merk is nergens zichtbaar.** Op `/beheer` zie je niet welk merk klaar
   is voor een demo, welk merk wacht op een gesprek, en welk merk al is overgedragen. De sortering
   gaat over achterstand op content, niet over de verkoopfase.
3. **Twee schermen met bijna dezelfde naam.** "Onboarding-inzicht" naast een nieuw
   "Onboardingsessie" is vragen om verkeerd klikken, en dat gebeurt straks tijdens een gedeeld
   scherm.
4. **Verrijkingsmateriaal staat op de verkeerde plek.** "Wat je al hebt liggen", waar een klant een
   tarievenpagina of brochure plakt zodat er feiten uit gehaald worden, staat ingeklapt onderaan het
   klantscherm. Het moment waarop dat materiaal er daadwerkelijk is, is precies het gesprek.
5. **Na het gesprek gebeurt er niets.** Wat je vastlegt verandert de onderzoeksuitkomsten niet meer.
   De onderwerpen, de markt en de kennistest zijn dan al gedraaid op wat het model gokte.

## B3. Het nieuwe ontwerp van de route

⚠️ **De belangrijkste ontwerpregel van dit hele plan: de sessiepagina is het enige stafscherm dat
bedoeld is om te delen.** Alle andere stafschermen zijn intern en de zijbalk zet er een teken bij
zodat je ze niet per ongeluk opent tijdens een gedeeld scherm. Dit scherm kijkt de klant mee. Daar
volgt uit, en dit is bindend voor de bouw:

- Geen taaknamen, geen jobtypes, geen foutmeldingen uit de wachtrij.
- Geen bedragen op het scherm. De kostenraming van het bijwerken staat in het bevestigvenster, niet
  in beeld.
- Geen interne begrippen. De tekst volgt `docs/schrijfstijl.md` alsof de klant de lezer is, want dat
  is hij.

**De vier stops worden:**

| Stop | Scherm | Nieuw? | Wat je er doet |
|---|---|---|---|
| 1 | `/beheer` | Uitgebreid | Alle merken, nu met hun fase, en filterbaar op "wacht op een gesprek" |
| 2 | `/merk/nieuw` | Uitgebreid | Pre-boarding: drie velden plus het bereik |
| 3 | `/merk/[id]/admin/onboarding` | **Nieuw** | De sessie met de klant. Het enige deelbare stafscherm |
| 4 | `/merk/[id]/admin/toewijzen` | Ongewijzigd | Overdragen aan het klantaccount |

**En het bestaande `/merk/[id]/admin` wordt hernoemd naar "Diagnose".** Wat er dan op staat is
uitsluitend techniek: welke taken draaiden, hoe lang, wat er faalde, wat het kostte. De
volledigheidsmeter en het gespreksblok verhuizen naar de sessie, want dat is werk en geen diagnose.
Daarmee is de scheiding scherp en zonder overlap:

- **Onboardingsessie** = het werk mét de klant.
- **Diagnose** = wat er technisch gebeurde, alleen voor jou.

⚠️ **Het Admin-hoofdstuk komt hiermee op precies drie bestemmingen**, en dat is het maximum uit
besluit 1 tot en met 8 (`docs/ux-design.md` §5: elk hoofdstuk hooguit drie kinderen). Een vierde
bestemming bestaat dus niet zonder eerst iets samen te voegen. Zet dat in het commentaar van
`lib/nav.ts`, anders is het over drie maanden per ongeluk vier.

## B4. De fase van een merk, afgeleid en niet ingevuld

Knelpunt 2 vraagt om een levenscyclus. Die hoeft **niet opgeslagen** te worden: alle vier de fases
zijn af te leiden uit gegevens die er al liggen. Dat is beter dan een kolom, want een status die je
met de hand bijhoudt loopt achter op de werkelijkheid.

| Fase | Afgeleid uit | Wat jij eraan hebt |
|---|---|---|
| **Voorbereiden** | Er staan nog onderzoekstaken open | Nog niets te doen, laat draaien |
| **Klaar voor het gesprek** | Onderzoek klaar, `profile_strategy.recorded_at` is leeg | Dit merk kun je nu demonstreren |
| **Gesprek gehad** | `recorded_at` is gevuld, `profiles.account_id` is leeg | Verkocht of niet, in elk geval besproken. Klaar om over te dragen |
| **Overgedragen** | `account_id` en `assigned_at` gevuld | De klant werkt er zelf in |

Nieuw bestand: `lib/profile-stage.ts`, puur en zonder `server-only` zodat `scripts/test-unit.ts` hem
kan draaien (conventie 2). Nul migraties.

---

# DEEL C. Het ontwerp: drie momenten, één veldenlijst

| Moment | Wie | Waar | Wat er gebeurt | Herkomst |
|---|---|---|---|---|
| **1. Pre-boarding** | consultant alleen, vóór contact | `/merk/nieuw` | De drie huidige velden, plus uitsluitend wat de meting stuurt | `consultant` |
| **2. Het gesprek** | consultant mét de klant | `/merk/[id]/admin/onboarding` | Alles nalopen, aanvullen, verrijken, en de commerciële laag invullen | `gesprek` |
| **3. Zelf aanvullen** | de klant, daarna | `/merk/[id]/merkprofiel/bewerken` | Ongewijzigd | `klant` |

**De regel eronder:** een veld wordt op één plek gedefinieerd (`lib/pipeline/brand-fields.ts`), door
één route opgeslagen (`PATCH /api/profiles/[id]`), en tegen één lijst gevalideerd
(`EDITABLE_PROFILE_FIELDS`). De drie oppervlakken verschillen alleen in volgorde, in wie er mag, en
in de herkomst die ze wegschrijven.

## Waarom herkomst de spil is

`profile_field_sources` (migratie `0039`) legt per veld vast wie hem zette, met welke zekerheid en
op welk bewijs, en `field-merge.ts` maakt daar de regel "een mens wint van een model" mee
afdwingbaar: **alleen `ai` mag door een volgende onderzoeksronde overschreven worden.**

Er komt één herkomst bij. ⚠️ **`consultant` is niet hetzelfde als `klant`.** Wat de consultant vóór
het gesprek invult is een onderbouwde aanname, geen bevestigd feit. Dat onderscheid is niet
cosmetisch: `profile-research.ts` regel 46 tot 49 instrueert het model letterlijk om door de klant
opgegeven concurrenten, waardeproposities en tone-of-voice te **respecteren** en niets anders te
verzinnen. Een consultant-aanname die als klantwaarde binnenkomt legt daarmee het eigen
marktonderzoek stil. Met een eigen herkomst kan de prompt het verschil maken: een `gesprek`-waarde
is waarheid, een `consultant`-waarde is een startpunt dat het onderzoek mag tegenspreken.

**Wie welke herkomst mag schrijven** wordt afgedwongen in de route, niet in het scherm: `gesprek` en
`consultant` alleen door staf, `klant` door iedereen met schrijfrecht op het merk. Zonder die
controle kan een klant zijn eigen invoer als gespreksuitkomst wegschrijven en daarmee onaantastbaar
maken voor elke volgende onderzoeksronde.

---

# DEEL D. De nieuwe velden

## D1. De commerciële laag: twaalf velden

Elk veld voldoet aan twee eisen: **een website kan het niet zeggen**, en **een pijplijnstap wordt er
aantoonbaar beter van**. Velden die alleen het gesprek helpen maar nergens gelezen worden staan hier
bewust niet in; dat is administratie.

| Veld | Type | Wat het is | Welke stap er beter van wordt |
|---|---|---|---|
| `priority_offerings` | `text[]` | Welke diensten of producten commercieel voorop staan | `propose-topics.ts`, `plan-build.ts`, de potentiescore |
| `deprioritised_offerings` | `text[]` | Waar géén content voor mag komen: te weinig marge, wordt uitgefaseerd | `propose-topics.ts`, `plan-order.ts` |
| `growth_regions` | `text[]` | Waar het merk heen wil, los van waar het nu al werkt | `prompts.ts`, de regionale vragen |
| `target_segments` | `text[]` | De segmenten waar de groei zit, bijvoorbeeld "installateurs met eigen monteurs" | `propose-topics.ts`, `personas` |
| `deal_value_band` | `text` (`onbekend`, `klein`, `midden`, `groot`) | Wat een klant ongeveer waard is | de weging in de potentiescore |
| `seasonality` | `text` | Piek- en dalmomenten in het jaar | `plan-order.ts`, wanneer iets gepubliceerd hoort te worden |
| `sales_objections` | `text[]` | De bezwaren die in elk verkoopgesprek terugkomen | `briefing.ts`, `content.ts`. Het meest ondergewaardeerde veld van de lijst: een AI-antwoord heeft vaak precies de vorm van een bezwaar |
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

## D2. De contactpersoon: drie velden (punt A4)

`contact_name`, `contact_email`, `contact_phone`, alle drie `text`, op `profiles`. Met wie we aan
tafel zaten. Nodig bij de overdracht, en vandaag nergens vastgelegd.

Deze drie tellen **niet** mee in de volledigheidsmeter van het merkprofiel: ze zeggen niets over hoe
goed ORBIT ENGINE het merk kent. Ze staan in een eigen blok en in een eigen stap, en de test die
"alles in de catalogus is opslaanbaar" bewaakt geldt wel gewoon voor ze.

## D3. Niet van toepassing: één kolom (punt A1)

`profile_field_sources.not_applicable boolean not null default false`. Gezet vanaf de sessiepagina,
per veld, met dezelfde `set_by` en `set_at` die er al zijn.

Gevolgen die in code moeten landen:
- De volledigheidsmeter telt `gevuld + n.v.t.` als behandeld.
- `lib/profile-gaps.ts` laat een veld dat op n.v.t. staat weg uit de gatenlijst.
- Een onderzoeksronde vult een n.v.t.-veld **niet** alsnog: het staat op mensbron, dus
  `filterProtectedFields()` beschermt het al. Controleer dat expliciet in een ketentest.

## D4. Waar deze velden landen, en waarom niet in `profile_strategy`

Kolommen op `profiles`, net als de dertien uit `0048`. De reden is de typering: `BrandField.key` is
`keyof Profile` (`brand-fields.ts` regel 76), en dat is precies wat de garantie "alles in de
catalogus is opslaanbaar" mogelijk maakt. Velden uit een andere tabel breken die typering.

De grens met de bestaande tabel wordt daarmee scherp, en die regel hoort in het commentaar van de
migratie:

- **Een blijvende eigenschap van het merk** hoort op `profiles`, ook als een mens hem invulde.
- **Een gebeurtenis met een houdbaarheidsdatum** hoort in `profile_strategy.context_factors`, want
  daar hangt per soort een gevolg aan in code (`context-factors.ts`).
- **De losse gespreksnotitie** blijft `profile_strategy.strategy_notes`.

---

# DEEL E. Nova's tweede invoerlaag: het oordeel per veld

Uit `docs/nova-i18n.json`, de sleutels rond 566 tot 602. De laag die de begeleider bij Nova invult
vóór de strategie gegenereerd wordt, en die in migratie `0048` nooit is beoordeeld.

| Nova-veld | Oordeel | Waarom |
|---|---|---|
| 3 tot 5 funnels | **Niet overnemen** | ORBIT ENGINE leidt dit af: één taak per funnelfase, standaard tien vragen per fase (`lib/prompt-mix.ts`). Zelf laten kiezen is een handmatige stap terug |
| Talen | **Bestaat al** | `market_language` |
| Doelland | **Bestaat al** | `market_language` plus `service_scope` |
| Nieuwe site ja of nee | **Bestaat al** | `context_factors.nieuwe_website`, met gevolg in code |
| Meertalig ja of nee | **Niet overnemen** | Meertaligheid is geschrapt (besluit 13, `docs/tasks/roadmap.md`) |
| Huidige sitestructuur respecteren | **Overnemen** | `respect_site_structure` in D1 |

De vier velden die in `0048` bewust vervielen (taalkeuze, CMS, auteurspagina, Google Analytics)
blijven vervallen. De CMS-koppeling komt terug in sprint 9 van `ontwikkelplan-visie.md`, niet eerder.

---

# DEEL F. De fases

Zes fases, elk los af te ronden en los te verifiëren. De volgorde is niet vrij: fase 1 is de
voorwaarde voor de rest, en fase 2 repareert een gat dat elke extra invoer anders vergroot.

## Fase 1, het fundament

**Doel.** De vijftien nieuwe velden bestaan, staan in de catalogus, en zijn opslaanbaar. Nog geen
nieuw scherm.

**Bestanden.**
- `supabase/migrations/0060_onboarding_3.sql`
  - twaalf commerciële kolommen plus drie contactkolommen op `profiles`, additief en idempotent,
    nullable, met `default '{}'` op de array-velden (zelfde regel als `0048`);
  - `not_applicable boolean not null default false` op `profile_field_sources`;
  - de herkomstconstraint uitgebreid met `consultant`, op **beide** plekken waar hij staat
    (`profile_field_sources` en `profile_offerings`);
  - een `check` op `deal_value_band` met de vier toegestane waarden.
- `lib/types/database.ts`: de vijftien kolommen op `Profile`, plus `not_applicable` en de vierde
  herkomst.
- `lib/profile-editable.ts`: de vijftien toevoegen aan `EDITABLE_PROFILE_FIELDS`.
- `lib/pipeline/brand-fields.ts`: twee nieuwe stappen, `strategie` en `contact`, elk met
  `STEP_META`. Per veld label, uitleg en een echt voorbeeld. `derivable: false` voor alle vijftien,
  want dat is de definitie van deze laag. Plus twee afgeleide lijsten:
  `CLIENT_STEPS` (de zeven bestaande) en `SESSION_STEPS` (alle negen).
- `app/api/profiles/[id]/route.ts`: de nieuwe velden valideren; een optionele `bron` in de body
  (`klant`, `gesprek`, `consultant`), standaard `klant`, en `gesprek` en `consultant` alleen
  toegestaan voor staf; per gewijzigd veld een rij in `profile_field_sources` bijwerken.

**Verificatiecriterium.** `npm run test:unit` faalt in beide richtingen als een veld in de catalogus
staat maar niet in `EDITABLE_PROFILE_FIELDS`, of omgekeerd. De teller die vandaag 41 bewaakt staat
daarna op 56 en blijft sluitend. Een tweede test controleert dat `CLIENT_STEPS` en `SESSION_STEPS`
samen exact `STEP_ORDER` dekken en dat `strategie` en `contact` niet in `CLIENT_STEPS` zitten. Een
niet-staf-gebruiker die `bron: "gesprek"` meestuurt krijgt een 403.

## Fase 2, de pre-boarding

**Doel.** Wat de consultant vóór het gesprek echt kan weten, komt de pijplijn in, veilig.

⚠️ Dit is de fase die de vorige Teamsessie als voorwaarde aanmerkte. Zonder de eerste drie punten
vergroot elk extra invoerveld de opbrengst en het vergiftigingsrisico even hard.

**Meet dit eerst, vóór er iets gebouwd wordt.** Tel hoeveel profielen die ná 3 augustus 2026 zijn
aangemaakt nog steeds op `service_scope = null` eindigen. Het cijfer "vier van de negen" is van
11 augustus en kan profielen bevatten van vóór de reparatie in `resolveScope()`. Is het antwoord
nul, dan vervalt punt 4 hieronder en blijft de rest staan.

**Bestanden.**
1. `app/api/profiles/route.ts`: schrijf bij het aanmaken rijen in `profile_field_sources` met bron
   `consultant`. Vandaag schrijft deze route er nul terwijl de bijwerkroute het wel doet, waardoor
   wat een consultant typt niet te onderscheiden is van modeluitvoer en niet beschermd wordt door
   `filterProtectedFields()`.
2. `lib/pipeline/prepare-profile.ts`: laat mensinvoer dezelfde normalisatie passeren als
   modeluitvoer. Vandaag gaat modeloutput door `resolveScope()` en gaat een getypte waarde er
   ongefilterd langs, terwijl `service_regions[0]` letterlijk in zes kennistestvragen wordt geplakt.
3. `lib/pipeline/profile-research.ts`: splits de instructie. Een `gesprek`-waarde blijft leidend,
   een `consultant`-waarde wordt aangeboden als startpunt dat het onderzoek mag tegenspreken.
4. `app/(app)/merk/nieuw/onboarding-wizard.tsx`: één keuzeveld erbij voor het bereik, met een
   plaatsveld dat alleen bij "lokaal" verschijnt. Meer niet.

⚠️ **Waarom alleen het bereik en niet meer.** Het besluit van elf velden terug naar drie gold ook
voor de consultant: alleen staf kan een merk aanmaken (`mayTriggerCost` is letterlijk `isStaff`).
Het criterium is scherper dan "vooraf of achteraf": **kost het ontdekken van de fout ná de meting
een nieuwe betaalde meetronde?** Bij het bereik is dat zo, want het bepaalt of de vragen regionaal of
landelijk gesteld worden. Bij alle andere velden niet, en die horen dus in het gesprek.

**Verificatiecriterium.** Een nieuw merk aanmaken levert rijen in `profile_field_sources` met bron
`consultant`. Een tweede onderzoeksronde laat die waarden staan. Een ketentest in
`scripts/test-chain.ts` dekt beide.

## Fase 3, de onboardingsessie

**Doel.** Het scherm waar consultant en klant samen aan tafel zitten. Het volledige schermontwerp
staat in deel G.

**Bestanden.**
- `app/(app)/merk/[id]/admin/onboarding/page.tsx`: nieuw, staf-only. Onder `admin/` omdat dat
  segment de afscherming al heeft en een klant er een 404 krijgt in plaats van een 403.
- `app/(app)/merk/[id]/_components/onboarding-session.tsx`: rendert `SESSION_STEPS` met de
  sectie-rail ernaast. **Geen eigen veldendefinities.**
- `app/(app)/merk/[id]/_components/brand-field-input.tsx`: **nieuw, en de sleutel tot dit hele
  plan.** De veldweergave (label, uitleg, voorbeeld, herkomstchip, invoer per soort) komt uit
  `brand-wizard.tsx` en wordt gedeelde code. Wizard en sessie tonen daarna gegarandeerd hetzelfde
  veld. Dit is de enige plek waar dit plan bestaande code herstructureert, en het is precies wat
  voorkomt dat er een tweede formulier ontstaat.
- `app/(app)/merk/[id]/_components/brand-wizard.tsx`: gebruikt voortaan `BrandFieldInput` en
  `CLIENT_STEPS`. Gedrag ongewijzigd voor de klant.
- `lib/profile-gaps.ts`: uitbreiden zodat de gaten gesorteerd kunnen worden op gevolg in plaats van
  op veldvolgorde, en zodat n.v.t.-velden wegvallen.
- `lib/nav.ts`: de derde Admin-bestemming, plus het hernoemen van `admin` naar "Diagnose" en de
  waarschuwing over het maximum van drie.
- `app/(app)/merk/[id]/admin/page.tsx`: `ProfileReadinessPanel` en `StrategyBox` eruit, die
  verhuizen naar de sessie. Wat blijft is techniek.

**Verificatiecriterium.** Een klantaccount dat het adres raadt krijgt een 404. Een veld dat in de
sessie wordt gezet krijgt bron `gesprek` en overleeft een herhaalronde van het onderzoek. Een
unittest controleert dat de sessiepagina geen jobtype, geen bedrag en geen foutcode rendert.

## Fase 4, de lus terug naar de pijplijn

**Doel.** Wat er in het gesprek bij komt, verandert daadwerkelijk de uitkomst. Zonder deze fase is
de sessie een archief.

**Bestanden.**
- `lib/pipeline/onboarding-refresh.ts`: **nieuw en puur.** Invoer: welke velden zijn gewijzigd sinds
  de laatste onderzoeksronde. Uitvoer: welke taken opnieuw moeten draaien, en wat dat ongeveer kost.
  Puur, dus testbaar zonder database (conventie 2), en het is de rekenkern van het afrondblok.
  - bereik of werkgebied gewijzigd, of `growth_regions` gevuld → promptgeneratie en kennistest
  - `priority_offerings`, `deprioritised_offerings`, `target_segments` of `forbidden_topics`
    gewijzigd → onderwerpvoorstellen
  - `competitors` gewijzigd → marktstap
  - `name_exclusions`, `offline_proof`, `sales_objections`, `goal_12m`, contactvelden → **niets**.
    Die worden pas bij de volgende meting of contentronde gelezen, en een herdraai levert er niets
    voor op.
- `app/api/profiles/[id]/refresh/route.ts`: nieuw, achter `mayTriggerCost`, plant precies die taken
  in en niet meer.
- `lib/jobs/handlers.ts`: de betrokken taken moeten los inplanbaar zijn zonder de hele keten.
- `lib/pipeline/llm-baseline.ts`: het verwarringblok wegschrijven als voorstel voor
  `name_exclusions`, zodat de consultant bevestigt in plaats van bedenkt.
- `lib/pipeline/propose-topics.ts`, `market.ts`, `prompts.ts`, `plan-build.ts`, `plan-order.ts`,
  `briefing.ts`, `content.ts`, `content-gate.ts`, `structure-gap.ts`, `factbase.ts`, `measure.ts`:
  de nieuwe velden lezen. Elk veld uit D1 heeft precies één lezer en die staat in de tabel.

⚠️ **De bescherming van `gesprek` is hier de hele grap.** `field-merge.ts` laat alleen `ai`
overschrijven, dus een herhaalronde verrijkt zonder de uitkomst van het gesprek weg te gooien. Die
regel bestaat al en hoeft niet gebouwd te worden, hij moet alleen niet stukgemaakt worden.

**Verificatiecriterium.** Een ketentest waarin een bereikwijziging in de sessie de vragen opnieuw
laat genereren en de kennistest opnieuw laat draaien, terwijl de gesprekswaarden na afloop nog
steeds staan. Een unittest op `onboarding-refresh.ts` die voor elk van de vijftien velden vaststelt
welke taken eruit volgen, inclusief de velden waar dat er nul zijn.

## Fase 5, de route van de beheerder

**Doel.** Knelpunt 2 uit deel B: zien waar elk merk staat.

**Bestanden.**
- `lib/profile-stage.ts`: nieuw en puur, de vier fases uit B4 afgeleid uit bestaande gegevens.
- `lib/csm-data.ts` en `app/(app)/beheer/csm-view.tsx`: de fase als kolom, en een filter "wacht op
  een gesprek". De bestaande sortering op achterstand blijft leidend; de fase is een tweede as en
  geen vervanging.
- `app/(app)/merk/[id]/page.tsx`: voor staf één regel bovenaan met de fase en de eerstvolgende
  handeling, met een link naar de sessie. Voor de klant verandert er niets.

**Verificatiecriterium.** Een unittest per fase-overgang op `profile-stage.ts`, inclusief het geval
dat een merk is overgedragen zonder dat er ooit een gesprek is vastgelegd.

## Fase 6, opruimen en op één lijn

**Doel.** Eén feit, één eigenaar, en de documentatie klopt weer.

**Bestanden.**
- `app/(app)/merk/[id]/merkprofiel/bewerken/page.tsx`: ongewijzigd in werking, maar `strategie` en
  `contact` verschijnen hier **niet**. De commerciële laag is niets voor de klant om alleen in te
  vullen, en dit is de enige plek waar de twee oppervlakken bewust verschillen. Leg dat vast in het
  commentaar, anders herstelt iemand het als een omissie.
- `docs/architecture.md` §5 en §11, `docs/ux-design.md` §5, `supabase/README.md`,
  `docs/logbook.md`.
- Dit bestand gaat weg zodra fase 6 klaar is, samengevat in het logboek. Dat is de afspraak voor
  alles in `docs/tasks/`.

**Verificatiecriterium.** De vier vaste controles groen: `npx tsc --noEmit`, `npm run test:unit`,
`npm run test:chain`, `npm run build`.

---

# DEEL G. Schermspecificatie: de onboardingsessie

Dit is het enige nieuwe scherm. Het wordt gedeeld met de klant, dus de bouw volgt
`docs/ux-design.md` en `docs/schrijfstijl.md` alsof de klant de lezer is.

## G1. Kop

Titel "Onboarding", geen "sessie" en geen "admin" in beeld: de klant leest mee. Eronder één zin met
wat er gaat gebeuren, en rechts de volledigheidsmeter uit G3.

## G2. De opbouw, van boven naar beneden

**1. Wat we nog niet weten.** De gaten, gesorteerd op gevolg en niet op veldvolgorde. Per regel:
het veld, waaróm het uitmaakt in één zin, en een knop die naar het veld springt. Een veld dat op
n.v.t. staat valt hier weg.

⚠️ **Dit blok staat bovenaan en dat is de belangrijkste keuze van het scherm.** Zonder die volgorde
kost het gesprek een uur aan het bevestigen van dingen die al klopten, en dat is precies het uur dat
de klant voor strategie betaalt.

**2. Wat we van je willen weten.** De commerciële laag, de twaalf velden uit D1. Dit is het blok
waar het uur consultancy over gaat, en het enige blok dat helemaal leeg begint.

**3. Wat we al gevonden hebben.** De negen stappen ter controle, elk met zijn eigen titel en uitleg
uit `STEP_META`, elk veld met zijn herkomstchip. Ingeklapt per stap, met de teller ernaast, zodat
een stap die af is niet in de weg zit.

**4. Wat je al hebt liggen.** `DossierBox`, uitgeklapt en niet ingeklapt. Dit is knelpunt 4 uit deel
B: het moment waarop de klant zijn tarievenpagina of brochure daadwerkelijk bij zich heeft, is dit
gesprek. Wat hij plakt wordt bewaard en er worden feiten uit gehaald.

**5. Wat er speelt buiten de website om.** `StrategyBox`, verhuisd van de diagnosepagina. De
gesloten lijst met gebeurtenissen, elk met het gevolg ernaast.

**6. Afronden.** Zie G4.

## G3. De volledigheidsmeter

Drie getallen, geen percentage alleen: **bevestigd in het gesprek**, **gevonden door ORBIT ENGINE**,
**nog open**. Een percentage alleen verbergt precies het verschil dat telt, namelijk hoeveel er
daadwerkelijk door een mens is bevestigd.

De contactvelden tellen niet mee (D2). Velden op n.v.t. tellen als behandeld (D3).

## G4. Afronden, ons equivalent van Nova's "Review & launch"

Eén blok onderaan met drie dingen, in deze volgorde:

1. **Wat er nog open staat**, als korte lijst. Informatief, het blokkeert niets.
2. **Het gesprek vastleggen**: notitie, datum en naam. Vult `profile_strategy.recorded_at` en
   `recorded_by`, en dat is meteen wat de fase in B4 op "gesprek gehad" zet.
3. **Het onderzoek bijwerken**: één knop, die precies de taken opnieuw inplant die van de gewijzigde
   velden afhangen (`onboarding-refresh.ts`). De kostenraming staat in het bevestigvenster en niet
   op het scherm, want de klant kijkt mee.

Is er niets gewijzigd dat een herdraai rechtvaardigt, dan is de knop uit met de reden ernaast: "er
is niets veranderd waar het onderzoek anders van wordt". Een knop die niets doet is erger dan geen
knop.

## G5. Opslaan

Per veld, zodra het de focus verlaat, met bron `gesprek`. Drie standen per veld: opslaan, opgeslagen,
niet gelukt. Geen opslaanknop onderaan en geen waarschuwing bij weglopen: een gesprek wordt
onderbroken, en een half ingevuld formulier dat bij het weglopen verdwijnt is de duurste fout die
dit scherm kan maken.

Mislukt een opslag, dan blijft de waarde in beeld staan met de foutstand erbij en een knop om het
opnieuw te proberen. Nooit stil terugdraaien naar de oude waarde: dan typt de consultant het opnieuw
zonder te weten dat het de eerste keer ook al niet lukte.

## G6. Elk veld kan op "niet van toepassing"

Eén knop per veld. Het veld gaat dan grijs, telt als behandeld, en verdwijnt uit de gatenlijst. Terug
te draaien met dezelfde knop.

## G7. Responsive

Desktop eerst: dit scherm wordt aan een tafel op een laptop gebruikt. De sectie-rail wordt op tablet
en telefoon een horizontale chiprij, gelijk aan het clusterdossier (`docs/ux-design.md` §7).

---

# DEEL H. Wat we bewust niet doen

- **Geen tweede veldenlijst, geen tweede opslagroute.** De reden staat in `strategy-box.tsx` regel
  19 tot 21 en die blijft geldig.
- **Geen verplichte velden en geen blokkerende afronding**, anders dan Nova. Zie de waarschuwing
  onderaan deel A.
- **Geen zelfregistratie voor de klant zoals Nova.** Het product is sales-led.
- **Geen facturatie- of betaalstap.** Nova heeft die; wij factureren buiten de app om.
- **Geen AI-aanroep op de sessiepagina zelf.** Het scherm leest wat er al ligt. Alles wat een
  aanroep kost loopt via het afrondblok, met een raming vooraf en achter de kostenpoort.
- **Geen vierde bestemming onder Admin.** Drie is het maximum, zie B3.
- **Geen meertaligheid, geen CMS-koppeling, geen Google Analytics.** Geschrapt of later, zie deel E.

---

# DEEL I. Risico's

| Risico | Hoe dit plan het afdekt |
|---|---|
| Het gesprek kost een uur aan het bevestigen van dingen die al klopten | Het scherm opent met de gaten, niet met veld 1 (G2) |
| Een consultant-aanname legt het marktonderzoek stil | Eigen herkomst `consultant`, en de onderzoeksprompt behandelt die als startpunt (fase 2) |
| Er ontstaat alsnog een tweede formulier dat gaat verouderen | De veldweergave wordt gedeelde code (`brand-field-input.tsx`), en de test telt in beide richtingen |
| Een klant schrijft zijn eigen invoer weg als gespreksuitkomst en maakt hem daarmee onaantastbaar | De route weigert `gesprek` en `consultant` voor niet-staf (fase 1) |
| Er staat iets interns in beeld tijdens een gedeeld scherm | Bindende regel in B3, plus een test in fase 3 |
| Vijftien velden erbij en niemand leest ze | Elk veld heeft een genoemde lezer. Een veld zonder lezer hoort niet in de tabel |
| De volledigheidsmeter haalt nooit 100% en wordt genegeerd | Niet van toepassing als eigen stand (D3) |
| De herhaalronde overschrijft het gesprek | Bestaat al: alleen `ai` mag overschreven worden. Fase 4 mag die regel niet stukmaken |
| Het cijfer onder fase 2 klopt niet meer | Eerst tellen, dan bouwen |
| Het bijwerken na het gesprek draait onnodig de dure meting | `onboarding-refresh.ts` plant per veld precies de betrokken taken in, en voor vijf velden nul |

---

# DEEL J. Kosten

De sessie zelf kost niets: het scherm leest wat er ligt en doet geen AI-aanroep. De vijftien velden
gaan mee in aanroepen die er toch al zijn, ruwweg 150 tokens extra op een bestaande aanroep, ver
onder een cent.

De enige echte kostenpost is het bijwerken ná het gesprek. Dat is gedeeltelijk opnieuw draaien, geen
volledige onboarding: bij een gewijzigd bereik gaat het om de promptgeneratie en de kennistest. Een
volledige onboarding kost ongeveer $0,25, dus dit blijft daar ruim onder. De knop staat achter
dezelfde kostenpoort als al het andere betaalde werk en toont de raming vooraf.

---

# DEEL K. Volgorde en samenhang met het openstaande werk

Vier verbeteringen uit de Teamsessie over de onboarding staan nog open in `docs/tasks/roadmap.md`.
Twee daarvan raken dezelfde bestanden als dit plan, dus ze horen in dezelfde ronde en niet erachter:

| Openstaand punt | Waar het in dit plan valt |
|---|---|
| De aanbodstap heet niet-blokkerend maar draagt de halve keten | **Fase 4.** Zelfde bestand (`lib/jobs/handlers.ts`), zelfde soort wijziging: een taak los inplanbaar maken van de taak die hem vandaag inplant |
| De vier standen platgeslagen tot één vinkje op het voortgangsscherm | **Los, vóór fase 3.** Raakt `profile-progress.tsx` en niet de sessie |
| De duurste stap toont als geslaagd terwijl het budget op was | **Los, vóór fase 3.** Raakt `research-steps.ts` |
| De strook met lopende stappen boven het dossier | **Los.** Raakt het klantscherm, niet de sessie |

**Aanbevolen volgorde:** eerst de twee losse punten die niets met dit plan te maken hebben (ze zijn
klein en ze repareren iets dat vandaag misgaat), dan fase 1 en 2, dan fase 3, en fase 4 samen met het
ketenpunt uit de roadmap. Fase 5 en 6 kunnen daarna los.
