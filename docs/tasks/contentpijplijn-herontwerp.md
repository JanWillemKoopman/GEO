# Herontwerp van de contentpijplijn (advies, 1 september 2026)

Opdracht van de eigenaar: de pijplijn die van een meting een contentpagina maakt kritisch bekijken en
waar nodig opnieuw ontwerpen. Doel: hogere kwaliteit en hardere feitelijkheid, minder wachttijd,
minder werk voor de klant, en pagina's die als een volledige pagina lezen in plaats van als een
verzameling onderbouwde zinnen. Kosten zijn geen beperking zolang de pagina er beter van wordt.

Dit document is advies. Er is nog geen code gewijzigd. De kosten in §3 zijn nagerekend tegen
`ai_calls` op productie en niet geschat; de kwaliteitscijfers komen uit `content_pieces`.

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
| A4 | **Sectiegewijs schrijven, parallel.** Opening plus de secties plus de FAQ als aparte, gelijktijdige aanroepen op de dure tier met effort `high`, gevolgd door één korte naadstap die overgangen en herhaling gladstrijkt. **Dit is de enige aanbeveling die de kosten echt verhoogt (van ongeveer €0,29 naar ongeveer €0,85 per pagina) en wacht daarom tot de app bij meerdere klanten draait.** | Niet-urgent | Groot | Hogere kwaliteit per onderdeel, kortere doorlooptijd, geen timeoutrisico meer |
| A5 | **Beoordelaarspanel, parallel.** Drie gespecialiseerde beoordelaars in plaats van één generalist, elk met een eigen opdracht en eigen bevindingen. Voor nu op de goedkope tier mét redeneertijd (effort `medium` in plaats van `none`): dat kost samen ongeveer $0,008 per pagina. De dure tier is een keuze voor later. | Urgent | Klein | Hogere kwaliteit, strengere en beter bruikbare bevindingen, vrijwel geen extra kosten |
| A6 | **Gerichte reparatie in plaats van volledig herschrijven.** Per bevinding alleen de betrokken sectie herschrijven, daarna dezelfde controle opnieuw op alleen dat punt. Maximaal drie rondes, en stoppen zodra alles groen is. | Urgent | Middelmatig | Minder regressie, minder pagina's met "check nodig", minder handwerk voor de klant |
| A7 | **Bronverificatie op de algemene laag.** Elke feitelijke zin zonder F-nummer krijgt een bron-URL plus een letterlijk citaat, en de code controleert dat het citaat echt op die pagina staat. | Urgent | Middelmatig | Feitelijkheid van de tweede laag, nu volledig onbewaakt |
| A8 | **Vragen per item garanderen.** Minstens één plek per pagina reserveren in de briefing, en de rest verdelen zoals nu. Daarnaast de vragen tonen per pagina in plaats van als één lijst per batch. | Normaal | Klein | Minder generieke pagina's, de klant ziet waar zijn antwoord terechtkomt |
| A9 | **Bronanalyse cachen per cluster.** De uitkomst van `analyzeCitedSources` opslaan met de URL als sleutel, en hergebruiken bij elke pagina en elke ronde. | Normaal | Klein | Lagere kosten, kortere doorlooptijd, minder crawlverkeer |
| A10 | **Contenttaken parallel laten draaien.** `content_draft` en `content_revise` behandelen zoals de reputatietaken: netwerkgebonden, drie tegelijk. Zeker nodig zodra A4 de losse aanroepen kort maakt. | Urgent | Klein | Doorlooptijd van een batch van tien pagina's van tientallen minuten naar enkele minuten |
| A11 | **Evaluatieset voor content.** Tien echte, vastgezette gevallen met hun contract, plus een script dat na elke promptwijziging dekking, bronherleidbaarheid en poortuitslagen naast de vorige stand zet. | Normaal | Middelmatig | Wijzigingen worden aantoonbaar in plaats van aannemelijk |
| A12 | **Regenereren met behoud.** Bij opnieuw genereren de goedgekeurde secties vasthouden en alleen de afgekeurde opnieuw laten schrijven. | Niet-urgent | Middelmatig | Lagere kosten, minder verlies van werk dat al goed was |

### Wat dit kost, nagerekend op productie in plaats van geschat

Mijn eerste schatting van ongeveer twee euro per pagina was te hoog. Ik heb hem vervangen door de
werkelijke cijfers uit `ai_calls`, de tabel waarin elke aanroep zijn kosten wegschrijft.

**Wat een pagina vandaag kost** (de vijf pagina's die op 26 augustus 2026 op de huidige modellen
draaiden):

| Stap | Model | Kosten |
| --- | --- | --- |
| Schrijven | sol | $0,154 |
| Beoordelen | luna | $0,001 |
| Herschrijven | sol | $0,162 |
| Opnieuw beoordelen | luna | $0,001 |
| Bronanalyse plus atomisering | luna | ongeveer $0,003 |
| **Samen** | | **ongeveer $0,32, dus ongeveer €0,29** |

**Waar dat geld zit.** Bijna alles zit in de uitvoertokens van het dure model: gemiddeld 4214
uitvoertokens per schrijfaanroep tegen $30 per miljoen. De invoer is met 5599 tokens goed voor nog geen
zes cent. Alles wat op de goedkope tier draait kost een tiende cent per aanroep, ook mét redeneertijd.

Dat is de sleutel voor de kostenvraag: **onderzoeken, plannen en beoordelen zijn vrijwel gratis, alleen
schrijven is duur.** De aanbevelingen die de pagina compleet maken (het itemdossier, het contract, de
dekkingspoort, het beoordelaarspanel) raken de dure aanroep niet. Wat wél geld kost is A4, en dat is
precies de aanbeveling die kan wachten.

**Twee varianten:**

| | Nu bouwen | Later, bij meerdere klanten |
| --- | --- | --- |
| Onderdelen | A1, A2, A3, A5 op de goedkope tier met redeneertijd, A6, A7, A9, A10 | A4, A5 op de dure tier, A11, A12 |
| Schrijven | één aanroep zoals nu, maar contract-gestuurd | secties parallel, meer redeneertijd |
| Repareren | één gerichte sectie in plaats van de hele pagina opnieuw | idem |
| Kosten per pagina | **ongeveer $0,24, dus ongeveer €0,22** | ongeveer $0,90, dus ongeveer €0,85 |

De "nu"-variant is dus **goedkoper dan vandaag**, ongeveer zeven cent per pagina minder. Dat komt van
één plek: de volledige herschrijving op het dure model ($0,162) verdwijnt en wordt een gerichte
sectiereparatie van ongeveer $0,06. Dat is geen bezuiniging ten koste van kwaliteit maar het gevolg
ervan, want een pagina die de eerste keer tegen een contract geschreven is heeft minder te repareren.
Op de huidige stand kreeg elke pagina de volledige herschrijving: vijf schrijfrondes, vijf
herschrijfrondes.

**Een aanpassing in de tabel hierboven.** A5 wordt in de "nu"-variant drie beoordelaars op de goedkope
tier mét redeneertijd (effort `medium` in plaats van `none`), niet op de dure tier. Dat kost samen
ongeveer $0,008 per pagina en is daarmee vrijwel gratis. De dure tier voor beoordelen is een keuze voor
later, en alleen als de goedkope tier met redeneertijd aantoonbaar tekortschiet.

### Wat de cijfers verder laten zien

Van de 29 afgeronde pagina's in productie staan er **15 op "check nodig"**, dus meer dan de helft. De
gemiddelde pagina is **548 woorden**, terwijl de doelbandbreedte voor een artikel 700 tot 1200 woorden
is. De bronherleidbaarheid is gemiddeld 78,6 procent, en bij de drie gepubliceerde pagina's 52,2
procent. Dat is de rekenkundige versie van "er lijkt iets te ontbreken": de pagina's zijn kort, ruim de
helft vraagt om handwerk van de klant, en van elke twee beweringen is er ongeveer één niet tot een
bevestigd feit te herleiden.

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
2. A2 en A3. Het contract en de poort erop. Dit is de kern van "de pagina voelt compleet", en het kost
   ongeveer een halve cent per pagina.
3. A5 op de goedkope tier met redeneertijd, plus A6. Betere beoordeling en gerichte reparatie. Hier
   daalt de rekening, want de volledige herschrijving op het dure model vervalt.
4. A1 en A7. Het itemdossier en de bronverificatie van de algemene laag, samen ongeveer twee cent.
5. A8. Vragen per item.
6. **Grens van de "nu"-variant.** Wat hierna komt kost echt geld en wacht tot de app bij meerdere
   klanten draait: A4 (sectiegewijs schrijven), A5 op de dure tier, A11 en A12.

### Twee dingen die dit advies niet oplost

- **Conventie 10 geldt hier ook.** Alles hierboven is ontwerp, niet gemeten. Het contract en de
  dekkingspoort moeten tegen echte opgeslagen pagina's nagerekend worden voordat we zeggen dat ze
  werken.
- **Meer volledigheid vergroot het hallucinatierisico.** Een pagina compleet maken betekent meer tekst
  die niet uit de feitenkaart komt. Daarom staat A7 in dezelfde stap als A1 en A2, en niet later: de
  algemene laag mag alleen groeien als hij tegelijk verifieerbaar wordt.
