# Herontwerp van de contentpijplijn (advies, 1 september 2026)

Opdracht van de eigenaar: de pijplijn die van een meting een contentpagina maakt kritisch bekijken en
waar nodig opnieuw ontwerpen. Doel: hogere kwaliteit en hardere feitelijkheid, minder wachttijd,
minder werk voor de klant, en pagina's die als een volledige pagina lezen in plaats van als een
verzameling onderbouwde zinnen. Kosten zijn geen beperking zolang de pagina er beter van wordt.

Dit document is advies. Er is nog geen code gewijzigd.

Gelezen vóór dit advies: `lib/pipeline/content.ts`, `briefing.ts`, `briefing-select.ts`, `factbase.ts`,
`factcard.ts`, `content-gate.ts`, `source-analysis.ts`, `lib/jobs/worker.ts`, `lib/jobs/types.ts`,
`lib/openai/models.ts`, `lib/openai/sampling.ts`, `lib/schemas/content-piece.ts`,
`lib/content-final-gate.ts`, plus de logboekstukken S1, S2, S9 en S10.

---

## 1. Kritische analyse

### Wat er goed staat, en wat we niet moeten aanraken

1. **De feitenkaart als gesloten lijst.** Elke bewering over de klant moet een F-nummer én een
   letterlijk citaat uit dat feit hebben, en `sourceCoverage()` rekent na of dat nummer bestaat. Dat
   is de sterkste hallucinatierem in de hele app en die blijft ongewijzigd.
2. **De deterministische poort naast de zelfbeoordeling.** De contentronde van 31 juli liet zien
   waarom: tien van de tien pagina's gaven zichzelf 100 van de 100, inclusief de pagina waarvan
   dezelfde aanroep in zijn eigen verbeterpunten schreef dat de hoofdvraag niet beantwoord werd.
3. **Alles bevriezen.** De feitenkaart en het paginaplan staan in `briefing_snapshot_json`, de ruwe
   modelantwoorden staan er los naast. Achteraf is te reconstrueren waarop een zin rustte.
4. **De vragenronde.** De klant heeft kennis die nergens op zijn site staat. Dat is het enige
   materiaal waarmee zijn pagina zich onderscheidt van een algemene uitleg.
5. **De richting van S9 en S10.** Clusterbrede input die een specifieke pagina stuurt is een fout, en
   die is op vier plekken al hersteld.

### De zeven knelpunten

**K1. Er is geen paginaplan, alleen een lijst beweringen.**
De claim-audit levert losse claims plus de vraag of ze gedekt zijn. Niemand bepaalt vooraf welke
secties de pagina moet hebben, welke deelvragen erin thuishoren en welke vervolgvraag een lezer daarna
stelt. Volledigheid hangt daarmee volledig aan twee promptregels (regel 6 en 7 in `CONTENT_SYSTEM`) en
aan één boolean van de beoordelaar. Dat is precies de situatie die code-conventie 1 verbiedt: een
promptinstructie zonder deterministisch vangnet. Het is ook de directe verklaring voor het gevoel dat
er iets ontbreekt: er is niets in de pijplijn dat weet wat "compleet" voor deze pagina betekent.

**K2. De feitenkaart begrenst terecht de claims, maar begrenst ongewild ook de pagina.**
De regel "staat het er niet op, dan schrijf je er niet over" is voor beweringen over de klant precies
goed. Alleen bestaat de tweede laag van een goede pagina, de algemene uitleg over het onderwerp, in de
pijplijn nauwelijks. Zoeken naar die uitleg gebeurt alleen als `needsFactFinding` aan staat, en dat
gebeurt bij een dunne feitenlijst of bij de context-gaten die de audit toevallig opmerkte. Een klant
met veel feiten krijgt dus zelden externe uitleg, terwijl juist die laag een pagina compleet maakt.
Gevolg: correcte, dunne pagina's.

**K3. Lengte is gestuurd, dekking niet.**
`TARGET_WORDS` geeft een bandbreedte per type. Er is geen enkele maat die zegt: van de zes deelvragen
die deze pagina moest behandelen zijn er vijf behandeld. Woorden tellen is een slechte proxy voor
volledigheid, en het is de enige die er nu is.

**K4. De beoordeling zit op het goedkoopste model, het schrijven op het duurste.**
De kritiek draait op `MODELS.quality` met werk-soort `deterministic`, dus effort `none` en temperatuur
0. Dat is een niet-redenerende beoordeling van het belangrijkste product van de app. Bij een budget
dat geen beperking is, is dat de meest onlogische besparing in de pijplijn.

**K5. Eén ongerichte herschrijfronde, zonder hercontrole per punt.**
Alle bevindingen (kritiek, GEO-punten, poort, kwaliteit, bronnotities, verboden woorden) gaan als één
lijst naar één aanroep die de héle pagina opnieuw schrijft. Er wordt daarna niet gecontroleerd of elk
punt is opgelost; alleen de eindscores worden opnieuw berekend. Een volledige herschrijving kan
bovendien passages slopen die in ronde 1 juist goed waren. Blijft er iets staan, dan gaat de pagina
met `needs_review` naar de klant, en dat is de frictie die de klant voelt.

**K6. Dubbel en duur voorwerk, dat nergens bewaard wordt.**
`loadContentContext()` draait bij het schrijven én bij het herschrijven. Elke keer crawlt hij tot vier
geciteerde bronpagina's en doet hij daar een extra AI-aanroep overheen (`analyzeCitedSources`). Voor
tien pagina's uit één cluster die grotendeels dezelfde bronnen citeren, betekent dat tot twintig keer
crawlen en twintig aanroepen voor een uitkomst die per bron identiek is. Niets ervan wordt opgeslagen.

**K7. De doorlooptijd komt bijna helemaal uit de wachtrij, niet uit het model.**
`content_draft` en `content_revise` staan in `HEAVY_JOB_TYPES` maar niet in `IO_BOUND_HEAVY_TYPES`.
Ze draaien dus strikt één voor één, met een reservering van 200 seconden per stuk, in een werker die
elke minuut start en 240 seconden mag draaien. Tien pagina's kosten daardoor twintig taken die
nagenoeg allemaal in hun eigen werkerronde vallen. De schrijfaanroep zelf duurde in de nameting op
productie hooguit 98,8 seconden. Het wachten zit in de planning, niet in het model. Precies deze fout
is bij de reputatietaken al eens gerepareerd: die gingen van 31 minuten naar 9.

**Bijkomend, en het punt van de eigenaar:** de vragenronde kent acht plekken per batch en sorteert op
`contentPieceIds.length × required × priority`. Een vraag die vier pagina's dient wint dus altijd van
een vraag die er één scherp maakt. Bij een batch van tien pagina's kan een individuele pagina nul
vragen krijgen terwijl juist die pagina de dunste feitendekking heeft. De vragenronde is daarmee
clusterbreed geoptimaliseerd, en dat is de bron van generieke pagina's.

**Wat er niet is:** een evaluatieset voor content. Voor de meting bestaat `eval:mention`. Voor het
duurste onderdeel van de app is er geen enkele manier om vast te stellen of een promptwijziging de
kwaliteit verbeterde of verslechterde. Elke wijziging in `CONTENT_SYSTEM` is nu een gok met een
overtuigend verhaal eromheen.

---

## 2. Wat hoort bij code, wat hoort bij een model

**Naar code, want het is toetsbaar zonder oordeel:**

| Nu bij het model | Hoort bij code |
| --- | --- |
| "Beantwoord ook de logische vervolgvragen" (promptregel 7) | Dekkingsmeting: staat er voor elke geplande deelvraag een sectie met minstens één antwoordende zin? |
| "Houd je aan de doellengte" | Lengte per sectie afmeten tegen het contract, niet de pagina als geheel |
| FAQ bedenken en niet dubbelen met de body | Ontdubbelen op zinsniveau, dat kan met de bestaande `similarity.ts` |
| Externe uitleg "met bronvermelding" verwerken | URL plus letterlijk citaat verplicht stellen en narekenen, `quote-check.ts` doet dit al voor twee andere stappen |
| Bepalen of alle bevindingen zijn opgelost | Per bevinding een hercontrole draaien, niet de eindscore opnieuw berekenen |

**Naar een model, en dan naar een zwaarder model dan nu:**

| Nu | Beter |
| --- | --- |
| Kritiek op de goedkope tier, effort `none` | Drie parallelle beoordelaars op de dure tier: redactie, feitelijkheid, citeerbaarheid |
| Eén schrijfcall van 700 tot 1200 woorden op effort `medium` | Meerdere korte calls op effort `high`, want geen enkele call hoeft dan nog binnen 150 seconden een hele pagina te maken |
| Geen onderzoek per item | Eén onderzoekstap per contentitem, met web_search, die de deelvragen en de begrippen van dít item ophaalt |

**Weg bij het model, want het is dubbel werk:**
de bronanalyse per pagina en per ronde. Die hoort één keer per cluster gedaan en opgeslagen te worden,
met de URL als sleutel.

---

## 3. Aanbevelingen

| # | Aanbeveling | Urgentie | Omvang | Verwachte impact |
| --- | --- | --- | --- | --- |
| A1 | **Itemdossier per aanbeveling.** Eén onderzoekstap per contentitem (niet per cluster), met web_search, die vastlegt: welke deelvragen een lezer bij deze doelvraag stelt, wat de winnende antwoorden inhoudelijk behandelen, welke algemene begrippen uitleg nodig hebben en welke externe uitleg met bron beschikbaar is. Vervangt de clusterbrede achtergrond als leidende context. | Urgent | Middelmatig | Hogere kwaliteit, einde aan generieke pagina's, meer onderscheid per item |
| A2 | **Contentcontract in plaats van een claimlijst.** Uit A1 plus de claim-audit een inhoudsopgave als data: secties, per sectie de deelvraag die hij beantwoordt, de verplichte F-nummers, de algemene uitleg die erin hoort, en een doellengte. Opgeslagen naast het briefing-snapshot, meegegeven aan de schrijver én aan de poort. | Urgent | Groot | Volledigheid wordt meetbaar, de lezer mist niets meer |
| A3 | **Dekkingspoort op het contract.** Deterministische controle: elke sectie aanwezig, elke deelvraag beantwoord met minstens één losstaande zin, elk verplicht F-nummer gebruikt. Onbehandelde punten worden benoemde bevindingen in plaats van een algemeen "check nodig". | Urgent | Middelmatig | Hogere kwaliteit, minder klantfrictie, harde garantie in plaats van een belofte |
| A4 | **Sectiegewijs schrijven, parallel.** Opening plus de secties plus de FAQ als aparte, gelijktijdige aanroepen op de dure tier met effort `high`, gevolgd door één korte naadstap die overgangen en herhaling gladstrijkt. | Normaal | Groot | Hogere kwaliteit per onderdeel, kortere doorlooptijd, geen timeoutrisico meer |
| A5 | **Beoordelaarspanel op de dure tier, parallel.** Drie gespecialiseerde beoordelaars in plaats van één goedkope generalist, elk met een eigen opdracht en eigen bevindingen. | Urgent | Klein | Hogere kwaliteit, strengere en beter bruikbare bevindingen |
| A6 | **Gerichte reparatie in plaats van volledig herschrijven.** Per bevinding alleen de betrokken sectie herschrijven, daarna dezelfde controle opnieuw op alleen dat punt. Maximaal drie rondes, en stoppen zodra alles groen is. | Urgent | Middelmatig | Minder regressie, minder pagina's met "check nodig", minder handwerk voor de klant |
| A7 | **Bronverificatie op de algemene laag.** Elke feitelijke zin zonder F-nummer krijgt een bron-URL plus een letterlijk citaat, en de code controleert dat het citaat echt op die pagina staat. | Urgent | Middelmatig | Feitelijkheid van de tweede laag, nu volledig onbewaakt |
| A8 | **Vragen per item garanderen.** Minstens één plek per pagina reserveren in de briefing, en de rest verdelen zoals nu. Daarnaast de vragen tonen per pagina in plaats van als één lijst per batch. | Normaal | Klein | Minder generieke pagina's, de klant ziet waar zijn antwoord terechtkomt |
| A9 | **Bronanalyse cachen per cluster.** De uitkomst van `analyzeCitedSources` opslaan met de URL als sleutel, en hergebruiken bij elke pagina en elke ronde. | Normaal | Klein | Lagere kosten, kortere doorlooptijd, minder crawlverkeer |
| A10 | **Contenttaken parallel laten draaien.** `content_draft` en `content_revise` behandelen zoals de reputatietaken: netwerkgebonden, drie tegelijk. Zeker nodig zodra A4 de losse aanroepen kort maakt. | Urgent | Klein | Doorlooptijd van een batch van tien pagina's van tientallen minuten naar enkele minuten |
| A11 | **Evaluatieset voor content.** Tien echte, vastgezette gevallen met hun contract, plus een script dat na elke promptwijziging dekking, bronherleidbaarheid en poortuitslagen naast de vorige stand zet. | Normaal | Middelmatig | Wijzigingen worden aantoonbaar in plaats van aannemelijk |
| A12 | **Regenereren met behoud.** Bij opnieuw genereren de goedgekeurde secties vasthouden en alleen de afgekeurde opnieuw laten schrijven. | Niet-urgent | Middelmatig | Lagere kosten, minder verlies van werk dat al goed was |

### Wat dit kost

Een pagina kost nu grofweg drie aanroepen bij het schrijven (bronanalyse, schrijven, kritiek) en twee
bij het herschrijven, waarvan twee op de dure tier. Na dit voorstel worden het er ongeveer twaalf tot
achttien, waarvan de meeste kort. Ruwe schatting: van enkele dubbeltjes naar ongeveer één tot twee
euro per pagina. Dat is een schatting op basis van de tarieven in `models.ts`, geen meting. Tegenover
een meetronde van ongeveer $0,82 en tegenover het feit dat dit het enige is wat de klant publiceert,
is dat een verantwoorde verschuiving. De doorlooptijd daalt ondanks meer aanroepen, omdat vrijwel
alles parallel kan.

---

## 4. De voorgestelde flow

**Halte 1, kans (ongewijzigd, clusterniveau).** De meting levert gemiste vragen, de rapportage maakt er
aanbevelingen van. Hier hoort het cluster thuis en verder nergens: het cluster kiest de kans, het
schrijft de pagina niet.

**Halte 2, itemdossier (nieuw, per aanbeveling, parallel over de batch).** Voor elk gekozen item één
onderzoekstap met web_search: welke deelvragen horen bij deze doelvraag, wat behandelen de winnende
antwoorden en de geciteerde bronnen inhoudelijk, welke begrippen hebben uitleg nodig, welke externe
uitleg is met bron beschikbaar. Dit is het antwoord op "hoe schrijven we juist dit item zo goed
mogelijk".

**Halte 3, feitenkaart en contract (deels bestaand).** De feitenindex wordt gebouwd zoals nu. De
claim-audit levert de beweringen. Nieuw is dat beide samen met het dossier één contract vormen: de
secties van deze pagina, met per sectie de deelvraag, de verplichte feiten en de uitleg die erin hoort.
Het contract wordt bevroren, net als de kaart nu.

**Halte 4, vragen aan de klant (bestaand, één regel anders).** De ongedekte kernpunten uit het contract
worden vragen. Elke pagina krijgt minstens één eigen plek. De pijplijn wacht hier niet op: het eerste
concept wordt gewoon geschreven, zoals nu ook al bewust gebeurt.

**Halte 5, schrijven (herbouwd).** Niet één aanroep voor een hele pagina, maar de opening, elke sectie
en de FAQ tegelijk, elk met alleen het deel van het contract dat erbij hoort, op de dure tier met meer
redeneertijd. Daarna één korte naadstap voor overgangen, herhaling en toon. De harde regels blijven
letterlijk zoals ze zijn: de feitenkaart is de grens voor alles wat over de klant gaat, en de externe
uitleg krijgt een bron met citaat.

**Halte 6, keuren (parallel).** Code meet het contract na (dekking, losstaande zinnen, merknaam,
cijfers, ontwijking, verboden woorden, gelijkenis met bestaande pagina's, citaten van externe uitleg).
Drie beoordelaars op de dure tier kijken tegelijk naar redactie, feitelijkheid en citeerbaarheid. De
uitkomsten komen samen als bevindingen per sectie, niet als één lijst voor de hele pagina.

**Halte 7, repareren (herbouwd).** Per bevinding een korte aanroep die alleen de betrokken sectie
herschrijft, waarna alleen die controle opnieuw draait. Hooguit drie rondes. Wat daarna nog openstaat
gaat als benoemde punten naar de klant, en de klant ziet welke passage het betreft in plaats van een
algemene waarschuwing.

**Halte 8, afronden (ongewijzigd).** De eindpoort blijft: geen definitieve versie zolang er vragen open
staan, met overslaan als uitweg.

### De volgorde waarin ik dit zou bouwen

1. A10 en A9. Klein, meteen merkbaar in doorlooptijd en kosten, geen risico voor de tekst.
2. A2 en A3. Het contract en de poort erop. Dit is de kern van "de pagina voelt compleet".
3. A5 en A6. Betere beoordeling en gerichte reparatie, bovenop het contract.
4. A1 en A7. Het itemdossier en de bronverificatie van de algemene laag.
5. A4. Sectiegewijs schrijven, de grootste verbouwing, en alleen zinnig als het contract er al ligt.
6. A11, A8, A12.

### Twee dingen die dit advies niet oplost

- **Conventie 10 geldt hier ook.** Alles hierboven is ontwerp, niet gemeten. Het contract en de
  dekkingspoort moeten tegen echte opgeslagen pagina's nagerekend worden voordat we zeggen dat ze
  werken.
- **Meer volledigheid vergroot het hallucinatierisico.** Een pagina compleet maken betekent meer tekst
  die niet uit de feitenkaart komt. Daarom staat A7 in dezelfde stap als A1 en A2, en niet later: de
  algemene laag mag alleen groeien als hij tegelijk verifieerbaar wordt.
