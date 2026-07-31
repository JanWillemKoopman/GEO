# Strategie — significante vervolgstappen voor contentkwaliteit

> **Uitgangspunt.** De 10 punten uit R8 (`implementatieplan.md`) worden allemaal doorgevoerd —
> dit document gaat daar niet overheen, maar bouwt erop voort. Dit zijn geen kleine
> aantekeningen maar structurele keuzes: elk raakt hoe een schakel in de keten werkt, niet
> alleen een detail erin. Beoordeeld vanuit vier invalshoeken: **AI/GEO-expert**,
> **copywriter**, **senior softwareontwikkelaar**, **klant**. Harde randvoorwaarde: geen enkel
> voorstel verhoogt het aantal getrackte prompts per analyse boven de bestaande 30.
>
> **Leeswijzer.** Zes voorstellen, aflopend geprioriteerd naar wat ik het eerst zou doorvoeren.
> Bij elk voorstel: de kern, vanuit welke invalshoek(en) het overtuigt, en waarom het groter is
> dan een R8-punt.

---

## 1. De feitenkaart wordt een levende bron, geen momentopname

**De kern.** R8.1 lost het gevonden symptoom op (klantantwoorden bereiken de schrijver niet),
maar de onderliggende architectuurkeuze — "bevries de feitenkaart bij de claim-audit, gebruik
die bevroren versie bij het schrijven" — blijft dan intact. Die keuze is de reden dat het
symptoom kón ontstaan: een momentopname van vóór de antwoorden wordt behandeld als de bron van
waarheid ná de antwoorden. Ik zou de rol van `briefing_snapshot_json` omdraaien: het wordt een
**auditspoor** (wat wist het model toen de vragen gesteld werden), niet de **invoer** voor het
schrijven. Vlak vóór `content_draft` daadwerkelijk schrijft, wordt de feitenkaart **opnieuw**
samengesteld (dezelfde `buildFactBase()`-logica die nu al bestaat, gewoon op het juiste moment
aangeroepen) — inclusief alles wat de klant inmiddels beantwoord heeft, mét de dan-geldende
antwoorden, niet de antwoorden van het moment van de audit.

**Waarom dit groter is dan R8.1.** R8.1 kan technisch als een pleister worden gebouwd (voeg
`answeredFacts` toe aan de bestaande bevroren lijst) zonder de onderliggende aanname te
heroverwegen. Die aanname — "bevriezen = goed, want herhaalbaar" — klopt voor een auditspoor,
maar niet voor de daadwerkelijke schrijfbron. Zonder deze herziening duikt dezelfde bugklasse
op zodra er een tweede plek komt die op "de bevroren kaart" vertrouwt (bijvoorbeeld
R8.7/R8.8: als de doelvraag-echo-check ook tegen de bevroren kaart valideert in plaats van
tegen de actuele feiten, ontstaat exact hetzelfde probleem in een nieuwe check).

**Vanuit welke invalshoek.** Senior developer (het is een cache-invalidatie-probleem, en de
juiste oplossing is de cache-laag zelf herzien, niet elke consument ervan patchen) en klant
(een klant die een feit corrigeert, verwacht dat élke pagina die er ooit weer opnieuw op
schrijft — ook bij een toekomstige herschrijfronde — het bijgewerkte antwoord gebruikt, niet
alleen de eerste keer).

**Effort:** 2-3 dagen (groter dan R8.1's 1,5 dag, omdat het de aanroeptiming en niet alleen de
inhoud verandert). **Kosten:** geen nieuwe AI-aanroep.

---

## 2. Eén contentsjabloon vervangen door contentarchetypes per intentie én stijl

**De kern.** Alle 10 testpagina's — van Bol tot Fysi-Unique — hebben dezelfde skeletvorm: vet
TL;DR-openingszin, bullet-lijst met voordelen, kopje "Waarom kiezen voor [merk]?", FAQ,
call-to-action. Dat is geen toeval maar het gevolg van één systeeminstructie
(`CONTENT_SYSTEM`) die voor elk contenttype en elke funnelfase dezelfde structuurregels
oplegt. Het gevolg: een oriëntatievraag ("wat moet ik weten voordat ik kies") en een
beslissingsvraag ("waar koop ik het nu") krijgen dezelfde vorm, terwijl ze een fundamenteel
ander soort antwoord verdienen. En `style_samples` (letterlijke stijlvoorbeelden uit de eigen
site) worden wel meegegeven als instructie, maar nergens afgedwongen — in geen van de 10
pagina's is een herkenbare stijlkenmerk van het brondbedrijf terug te vinden.

**Wat ik zou bouwen:**
1. **Losse structuursjablonen per (contenttype × funnelfase-intentie)** in plaats van één
   `CONTENT_SYSTEM` met universele regels — een oriëntatieartikel krijgt een uitleg-structuur,
   een beslissingslanding een actiegerichte structuur, zonder dat beide dezelfde
   "Waarom kiezen voor..."-sectie hoeven te hebben.
2. **Stijl afdwingen in code, niet alleen als instructie.** Een simpele, goedkope
   lexicale-overlapcontrole (geen AI-aanroep): bevat de tekst minstens N woorden/uitdrukkingen
   die letterlijk uit `style_samples` komen? Zo niet, terug naar de redactieronde met een
   concrete instructie welke stijlkenmerken ontbreken — hetzelfde principe als de
   citaatplicht (R5.3), toegepast op toon in plaats van op feiten.

**Vanuit welke invalshoek.** Copywriter (dit is precies het soort onderscheid dat een
menselijke tekstschrijver vanzelfsprekend maakt, en waar deze tool nu op faalt) en GEO-expert
(een AI-assistent citeert eerder een antwoord dat qua vorm bij de vraag past — een
FAQ-antwoord op een oriëntatievraag oogt anders dan een productaanbeveling op een
koopvraag).

**Effort:** 3-4 dagen. **Kosten:** neutraal (zelfde aanroepen, andere prompt-inhoud + een
code-check zonder AI).

---

## 3. Een productfeed-route voor klanten zonder één eigen aanbod

**De kern.** Dit bouwt R8.9 (nu een onderzoeksvraag) om tot een concreet voorstel: **ja,
bouwen**, in een beperkte vorm. Bol, Coolblue en HEMA zijn geen uitzondering maar een hele
klantcategorie (retailers/platforms/ketens) waarvoor "schrijf een koopgids-artikel" het
verkeerde middel is zolang er geen concrete producten in de tekst mogen staan. De
crawl-infrastructuur die dit zou voeden **bestaat al**: `crawlInventory()` (halte 6.3) haalt
per klant al categorie-/productpagina's binnen, inclusief titel en tekstfragment. Wat ontbreekt
is een stap die deze pagina's herkent als **citeerbare productfeiten** (naam, eventueel prijs
indien zichtbaar in het tekstfragment, URL) in plaats van ze alleen te gebruiken als generieke
achtergrondtekst.

**Wat ik zou bouwen (beperkt, niet een volledige live-productkoppeling):**
1. Bij het opbouwen van de feitenkaart (`buildFactBase()`): als het bedrijfsmodel
   `retailer`/`platform` is (R0.5/R8.5) én de doelvraag concreet om producten vraagt, haal
   dan de meest relevante gecrawlde categorie-/productpagina's op (al aanwezig in
   `profile_pages`) en maak daar citeerbare feiten van — "Op [categoriepagina] X staan onder
   andere [namen die letterlijk op de pagina staan]" — in plaats van dit als niet-citeerbare
   achtergrond te behandelen (zoals nu gebeurt met sitetekst-blokken, R5.3).
2. Geen prijzen of specificaties verzinnen die niet letterlijk in het gecrawlde fragment staan
   — dezelfde citaatplicht als overal elders in R5.
3. Bewust **geen** live API-koppeling per klant in deze fase — dat is een grotere, aparte
   investering die pas de moeite waard is als deze beperkte versie al waarde bewijst.

**Vanuit welke invalshoek.** GEO-expert (concurrenten die nu al genoemd worden — Microsoft
Surface, Lenovo IdeaPad Slim 3x — winnen precies omdat ze een naam durven noemen; zonder dit
wint een retailer-klant deze categorie vragen structureel nooit) en klant (Bol/Coolblue/HEMA
betalen voor content die zichtbaarheid oplevert; twee feitelijk perfecte maar productloze
pagina's leveren dat aantoonbaar niet).

**Effort:** 4-5 dagen (crawl-data is er, de koppeling naar de feitenkaart en de
bedrijfsmodel-afhankelijke logica is nieuw). **Kosten:** vrijwel nul — hergebruikt bestaande
crawldata, geen nieuwe AI-aanroep. **Randvoorwaarde gerespecteerd:** raakt het aantal
getrackte prompts (30) niet — dit verandert alleen wélke feiten beschikbaar zijn bij het
schrijven.

---

## 4. Een publicatiepoort, symmetrisch aan de bestaande meetgoedkeuringspoort

**De kern.** De app kent al één bewezen patroon voor "stop bewust, laat de klant kijken vóór
er iets onomkeerbaars gebeurt": het conceptscherm vóór de meting start (halte 6.8). Voor
content bestaat dat niet — `status: 'ready'` is de eindstand, zonder dat de klant ooit ziet
welke feiten gebruikt zijn of welke claim mogelijk niet klopte. Uit deze contentronde: een
pagina met een intern gevonden probleem (Coolblue, `needs_review = true` met een concrete
reden) haalde toch `status: 'ready'` omdat `quality_score` boven de drempel bleef.

**Wat ik zou bouwen.** Een contentversie van hetzelfde patroon: vóórdat een pagina als "klaar
om te kopiëren" telt, ziet de klant (in de Content Bibliotheek, niet als aparte blokkerende
stap voor de hele analyse):
1. **De feitenkaart die daadwerkelijk gebruikt is** voor déze pagina — traceerbaarheid die nu
   alleen in de database bestaat (`briefing_snapshot_json`), niet in de UI.
2. **Elke onbeantwoorde verplichte vraag en elke door de redactie gevlagde claim**, expliciet,
   met de exacte zin waar het om gaat — niet weggestopt in `review_notes` die de klant
   misschien nooit opent.
3. Een expliciete bevestiging ("Ik heb dit gecontroleerd") vóórdat de pagina als publiceerbaar
   getoond wordt — geen harde blokkade (conform het bestaande principe dat de klant altijd door
   moet kunnen, `README.md` §2), maar wel een zichtbare stap in plaats van een stille status.

**Vanuit welke invalshoek.** Klant (vertrouwen is het product bij een tool die beweert een
contentspecialist te vervangen — een klant die zelf de Fysi-Unique-tegenspraak had ontdekt ná
publicatie, was het vertrouwen in de hele tool kwijt) en senior developer (dit hergebruikt een
bestaand, al gevalideerd UI-patroon in plaats van een nieuw concept te verzinnen).

**Effort:** 2,5 dagen. **Kosten:** geen nieuwe AI-aanroep.

---

## 5. Eén geïntegreerde ketentest, niet alleen losse pure-functie-tests

**De kern.** `scripts/test-unit.ts` (250 tests) toetst pure functies uitstekend — en dat is
precies waarom de bugs uit deze contentronde er niet in zaten: geen van de vier (de
briefing-statusbug, de versiesprong, de dode `answeredFacts`, de multi-ref-citaatplicht) zit in
een pure functie. Ze zitten allemaal in de **samenhang** tussen taken: wat de ene taak
opslaat en wat de volgende taak daarvan leest. Dit is nu de **vijfde keer** in dit traject dat
een fout van precies deze soort gevonden wordt (R1: bewijs zonder koppeling; R5-verificatie:
een controle die het verkeerde controleerde; deze ronde: twee keer een sluipende
aanname-mismatch tussen taken).

**Wat ik zou bouwen.** Eén test-suite die de **echte jobhandlers** (`lib/jobs/handlers.ts`)
end-to-end doorloopt tegen een geseede, wegwerpbare Supabase-testomgeving (of een lokale
Postgres via de Supabase CLI), met een **gestubde OpenAI-client** die vaste, realistische
structured-output-antwoorden teruggeeft in plaats van echte AI-aanroepen te doen (dus geen
kosten). Minimaal scenario: profiel → analyse → meting → rapport → content_brief → antwoord
beantwoorden → content_draft → content_revise, met asserties op elke tussenstatus. Dat scenario
had elk van de vier bugs uit deze ronde automatisch gevangen, ruim vóór een handmatige
productieronde daarvoor nodig was.

**Vanuit welke invalshoek.** Senior developer (dit is de structurele oplossing voor een
terugkerende bugklasse, niet een eenmalige fix) — en indirect de klant, want elke bug in deze
categorie die nu gevonden wordt, is een bug die eerder ongemerkt op productie stond.

**Effort:** 3-4 dagen (eenmalig opzetten van de testomgeving/stub is de grootste kostenpost;
nieuwe scenario's toevoegen daarna is goedkoop). **Kosten:** geen AI-kosten (gestubde client).

---

## 6. De al bestaande periodieke meting hergebruiken als goedkope contentfeedback

**De kern.** De app meet toch al maandelijks opnieuw (halte 6.17) en bewaart het volledige
ruwe AI-antwoord per vraag (`tracking_runs.raw_response`). Op dit moment wordt die informatie
maar één keer gebruikt: als "winnend concurrent-antwoord" op het moment van schrijven. Zodra
een pagina gepubliceerd is, verandert er niets meer aan wat de klant te zien krijgt totdat de
twee impact-golven (14/28 dagen, halte 6.15) een oordeel geven — en die golven zijn, zoals R6.1
liet zien, al ruis-gevoelig bij een enkele periode.

**Wat ik zou bouwen.** Bij elke reguliere periodieke meting (die toch al draait, geen extra
AI-aanroep, geen extra prompt): als een van de gemeten vragen een doelvraag is van een
**gepubliceerde** pagina, vergelijk het nieuwe `raw_response` met het antwoord waarop de pagina
destijds geschreven is. Verandert het antwoord van "concurrent X wint" naar "nog steeds
concurrent X, met een net iets ander argument" — signaleer dat als "deze pagina is mogelijk
verouderd" in de Content Bibliotheek. Dit is geen nieuwe meting en geen nieuwe prompt; het is
een extra, goedkope interpretatie van metingen die al plaatsvinden.

**Vanuit welke invalshoek.** GEO-expert (GEO is per definitie een bewegend doel — wat een
AI-assistent vandaag citeert, citeert hij over drie maanden misschien niet meer — en dit sluit
die lus met infrastructuur die er al is) en klant (een abonnement dat impliciet belooft
"we houden dit voor je in de gaten" in plaats van "we schrijven het één keer en laten het
liggen"). **Respecteert de 30-prompts-grens expliciet**: er komt geen vraag bij, alleen een
nieuwe interpretatie van bestaande metingen.

**Effort:** 2 dagen. **Kosten:** nul — hergebruikt reeds uitgevoerde metingen.

---

## Wat ik het eerst zou doen, en waarom

Als ik moest kiezen: **1 → 4 → 2**, dan pas 3, 5 en 6.

- **1 eerst**, omdat elke andere verbetering op een feitenkaart bouwt die nu aantoonbaar het
  verkeerde moment bevriest — inclusief voorstel 3 (de productfeed erin) en R8.7/R8.8 (de
  doelvraag- en onderscheid-checks), die anders tegen dezelfde verouderde kaart valideren.
- **4 direct daarna**, omdat het de enige van de zes is die het vertrouwen van de klant
  rechtstreeks raakt, en omdat de contentronde liet zien dat een intern gevonden probleem
  (Coolblue) zonder deze poort gewoon "klaar" wordt.
- **2 als derde**, omdat het de meeste concurrentiële afstand oplevert (elke concurrent uit
  `concurrenten.md` kan een generieke koopgids laten schrijven; weinigen doen dat met
  afgedwongen merkstem per funnelfase).
- **3, 5 en 6** zijn elk substantieel maar minder urgent: 3 raakt een specifiek klantsegment
  (niet elke klant is een retailer), 5 is investering in toekomstige snelheid van vinden in
  plaats van een directe kwaliteitswinst voor de klant vandaag, en 6 is waardevol maar
  afhankelijk van gepubliceerde pagina's — er zijn er nu nog geen.
