# Vier meetbronnen, en zoekvolume dat niet meer wiebelt

**Opgesteld:** 20 september 2026. **Status: geverifieerd (hoofdstuk 6), en op 20 september 2026 heeft
de eigenaar de uiteindelijke scope bepaald (hoofdstuk 6.4): Gemini via DataForSEO komt erbij als
DERDE bron, ChatGPT via DataForSEO vervalt. Die derde bron, en de meerderheidsregel uit hoofdstuk 5,
zijn gebouwd en getest (`tsc --noEmit`, `test:unit`, `test:chain`, `build` alle vier groen, zie
`docs/logbook.md` 20 september 2026 (12)). Het AI-zoekvolume (hoofdstuk 3.2, stap 1 en 8) is bewust
NIET gebouwd, zie hoofdstuk 6.4 voor waarom.**

> ⚠️ **Modelkeuze is de knop die werkt bij ChatGPT, niet bij Gemini.** Overstappen op `gpt-4o-mini`
> brengt ChatGPT via DataForSEO van $0,08 naar $0,027 per meting, ruim onder de grens van $0,03. Bij
> Gemini zijn alle 12 modellen getest, en de kosten wisselen vooral per vraag: gemiddeld $0,039, en
> geen enkel model zit daar betrouwbaar onder de grens. Web search uitzetten maakt Gemini wel
> goedkoop ($0,007), maar meet dan iets anders (getrainde kennis in plaats van een antwoord op een
> actuele zoekopdracht). **De eigenaar heeft Gemini desondanks geaccepteerd, en ChatGPT via
> DataForSEO juist laten vallen** (hoofdstuk 6.4): dat laatste levert weinig toe naast de eigen
> ChatGPT-route en Google AI Overview, ook al haalt het de kostengrens wél. Zie hoofdstuk 6.2 voor de
> modelvergelijking en hoofdstuk 6.4 voor het uiteindelijke besluit.

De aanleiding is een wens van de eigenaar: DataForSEO levert niet alleen het Google AI Overview dat
we sinds vandaag meten, maar ook antwoorden van LLM's zelf, en daarnaast een schatting van hoe vaak
een vraag in AI-tools gesteld wordt. Dit document legt vast wat die twee producten werkelijk zijn,
wat ze kosten, wat ze in deze app raken, en in welke volgorde het gebouwd wordt.

---

## 1. Wat er besloten is

De eigenaar heeft op 20 september 2026 vier keuzes gemaakt, later die dag aangescherpt tot een
definitieve scope (hoofdstuk 6.4) nadat de verificatie liet zien wat elke bron werkelijk kost.

1. **Eerst verifiëren tegen de echte api**, met de vragen van Van den Udenhout, daarna pas bouwen.
2. **Eén volledige meting per nieuwe bron**, dus alle dertig vragen, één keer per vraag.
3. **Het AI-zoekvolume gaat mee in dezelfde bouwronde**, niet in een aparte. ⚠️ Teruggedraaid in
   hoofdstuk 6.4: het bleek een eigen ontwerpvraag te raken (hoe een gemeten cijfer en een
   AI-schatting samen de potentiescore dragen zonder ze door elkaar te middelen) die deze bouwronde
   niet moest forceren.
4. **De nieuwe bron krijgt dezelfde plek als Google AI Overview**: hij voedt de kansen en staat in
   de bronknop op Zichtbaarheid in AI.

Een clustermeting komt daarmee op DRIE bronnen, niet vier (hoofdstuk 6.4 legt uit waarom ChatGPT via
DataForSEO afviel):

| # | bron | hoe | status |
|---|---|---|---|
| 1 | ChatGPT | onze eigen OpenAI-route | bestaat |
| 2 | Google AI Overview | DataForSEO SERP-api | bestaat, staat aan op productie |
| 3 | Gemini | DataForSEO LLM Responses | gebouwd, achter `DATAFORSEO_LLM_ENABLED` (standaard uit) |

~~ChatGPT via DataForSEO LLM Responses~~ is onderzocht (hoofdstuk 6.1/6.2) maar niet gebouwd: hij
haalt de kostengrens wel met `gpt-4o-mini` ($0,027 per meting), maar levert weinig toe naast de
eigen ChatGPT-route en Google AI Overview, en de eigenaar heeft ervoor gekozen die derde
ChatGPT-variant niet toe te voegen.

---

## 2. Wat er al staat, en waarom dat gunstig uitpakt

Op 20 september is de aggregatie bronbewust gemaakt, en die verbouwing draagt deze uitbreiding
grotendeels al.

- **Eén bron draagt de score van de klant** (`PRIMARY_ENGINE` in `lib/engines/types.ts`, dus
  ChatGPT via onze eigen route). Elke andere bron landt in `visibility_scores.per_engine_json`.
  Een bron erbij verandert het cijfer van de klant dus niet, en dat is precies de bedoeling: de
  vraag van de klant is "noemt ChatGPT mij", niet "noemt het gemiddelde van vier bronnen mij".
- **De bronknop is één regel per bron** (`BRONNEN` in `lib/engines/bron.ts`).
- **`tracking_runs.engine` is vrije tekst**, geen opsomming met een controle erop. Er is dus geen
  migratie nodig om twee nieuwe bronnamen te mogen opslaan.
- **De beoordelaar is gedeeld.** `judgeRun()` uit `lib/pipeline/measure.ts` leest de tekst van een
  antwoord en bepaalt wie er genoemd wordt, ongeacht welke bron de tekst leverde. Dat moet zo
  blijven, anders meten we het verschil tussen twee beoordelaars in plaats van tussen twee bronnen.
- **`lib/ai-overview/` is het model voor een nieuwe bron**: ophalen, uitpakken, een schakelaar, een
  eigen jobtype. Dat patroon wordt hier herhaald en niet opnieuw bedacht.

Wat er nog niet staat en wel nodig is, staat in hoofdstuk 7.

---

## 3. Wat DataForSEO werkelijk levert

### 3.1 De twee nieuwe meetbronnen

| bron | endpoint |
|---|---|
| ChatGPT | `/v3/ai_optimization/chat_gpt/llm_responses/live` |
| Gemini | `/v3/ai_optimization/gemini/llm_responses/live` |

Beide nemen een vraag, een systeeminstructie, een modelnaam en een schakelaar voor web search. Twee
dingen zijn tegen onze eigen gegevens nagerekend en niet aangenomen:

- **Onze vragen passen.** De limiet is 500 tekens. De 240 vragen die op 20 september 2026 in
  productie staan zijn gemiddeld 117 tekens, de langste 168.
- **Onze instructie past.** `SIMULATE_SYSTEM` in `lib/pipeline/measure.ts` is 327 tekens, tegen een
  limiet van 500. Hij kan dus letterlijk mee, en dat is voorwaarde: een andere instructie zou het
  verschil tussen de bronnen vervuilen met een verschil tussen twee opdrachten.

**⚠️ Het verschil dat de conclusie raakt: alleen ChatGPT kent een locatie.**

| instelling | ChatGPT | Gemini |
|---|---|---|
| `web_search` | ja | ja |
| `force_web_search` | ja | nee |
| `web_search_country_iso_code` | ja | nee |
| `web_search_city` | ja | nee |
| `system_message` | ja, 500 tekens | ja, 500 tekens |
| bronvermeldingen bij het antwoord | ja | ja |

Bij Gemini kun je dus niet zeggen "zoek vanuit Nederland". De taal van de vraag is het enige
Nederlandse signaal dat het model krijgt. Gevolg voor de klant: een lage score bij Gemini is niet
uit elkaar te trekken in "wij worden niet genoemd" en "Gemini keek naar een ander land". Dat hoort
in de uitleg bij die bron te staan, en het is een reden om Gemini nooit het cijfer van de klant te
laten dragen.

Bij ChatGPT is het omgekeerde waar, en dat is winst: `web_search_country_iso_code: "NL"` meet iets
wat we vandaag helemaal niet kunnen meten. Onze eigen route zet de web search-tool aan zonder
locatie mee te geven (`WEB_SEARCH_TOOL` in `lib/openai/structured.ts`). Bron 3 is dus geen kopie
van bron 1, hij is de Nederlandse variant ervan.

### 3.2 Het AI-zoekvolume

`/v3/ai_optimization/ai_keyword_data/keywords_search_volume/live`, tot 1000 zoektermen per aanroep,
met per term een `ai_search_volume` en twaalf maanden historie.

**Wat het niet is.** De tekst waar dit voorstel op rust zegt dat DataForSEO een database van meer
dan 370 miljoen verzamelde LLM-prompts gebruikt. Die claim hoort bij hun LLM Mentions-product en
staat niet in de documentatie van dit endpoint. DataForSEO legt over dít cijfer uit dat het uit een
eigen berekening komt die vooral leunt op de "People Also Ask"-vragen uit hun index van
Google-resultaten, en ze noemen het zelf relatieve populariteit, geen telling van echte prompts.

**Waarom het tóch de moeite is.** Niet omdat het waar is en de huidige schatting niet, maar omdat
het **herhaalbaar** is. Vandaag komt `search_volume_index` uit een AI-aanroep die alle onderwerpen
van een merk tegen elkaar afzet (`lib/pipeline/search-demand.ts`). Dat cijfer kan bij een tweede
aanroep anders uitvallen zonder dat er iets veranderde, dezelfde kwaal als bij de meting zelf. Een
DataForSEO-cijfer verandert niet omdat je het nog eens opvraagt, en het is bovendien vergelijkbaar
tussen merken. Dat is de winst: stabiliteit, niet waarheid.

**De haak die we al kennen.** Bij een term van meerdere woorden telt DataForSEO alleen vragen mee
waarin álle woorden voorkomen. Een meetvraag van 117 tekens komt dan vrijwel zeker op nul uit. Dat
is exact wat op 19 september 2026 bij het gewone zoekvolume gemeten is: van tien uit volzinnen
afgeleide termen kreeg er één een resultaat. De oplossing staat er al,
`kandidaatZoektermen()` in `lib/search-demand/keywords.ts`, die een zoekterm opbouwt uit het
clusterlabel en de plaats in plaats van hem uit de zin te destilleren. Die laag is alleen wel
geparkeerd sinds 20 september (`lib/search-demand/registry.ts`), dus hem weer aanzetten hoort bij
deze beslissing.

---

## 4. Wat het kost

**Wat bekend is, en gemeten:**

| bron | per meting | per cluster van 30 vragen per ronde |
|---|---|---|
| ChatGPT, onze eigen route, met web search | $0,0170 | $0,76 (46 metingen, de acht zwaarste vragen gaan 3x) |
| Google AI Overview | $0,0037 | $0,38 (3 metingen per vraag) |
| **samen, vandaag op productie** | | **$1,15** (nagemeten: $1,1484) |

**Wat onbekend is.** De prijs van de twee nieuwe bronnen is $0,0006 per aanroep plus wat het model
zelf aan tokens rekent plus een toeslag voor web search. Die laatste twee posten staan nergens als
tabel; DataForSEO geeft ze achteraf per aanroep terug in het veld `money_spent`.

**De verwachting, en het is niet meer dan dat:** dezelfde orde als onze eigen ChatGPT-route, want
het is dezelfde soort aanroep met dezelfde dure web search eronder. Dan komt een cluster van $1,15
op ongeveer $2,15 per meetronde. **Dat is bijna een verdubbeling van de duurste stap van het
product, en daarom is stap 0 geen formaliteit.**

Het AI-zoekvolume valt daarbuiten en is verwaarloosbaar: $0,01 per aanroep plus $0,0001 per term,
tot 1000 termen in één aanroep. Alle onderwerpen van een merk kosten daarmee ongeveer één cent.

---

## 5. ⚠️ Het probleem dat vier bronnen maken, en dat nog nergens opgelost is

Dit is de belangrijkste vondst van dit onderzoek, en hij staat niet in de opdracht.

De kansen die de klant leest komen uit `computeMissedPrompts()` in `lib/pipeline/report.ts`. De
regel daar: een vraag is een gemiste kans als het merk **in de meerderheid van zijn beoordeelde
metingen** ontbrak. Die regel telt elke meting even zwaar.

Vandaag valt dat mee. Straks niet:

| bron | metingen per gewone vraag | aandeel in de stem |
|---|---|---|
| ChatGPT, eigen route | 1 | 1 van 6 |
| Google AI Overview | 3 | **3 van 6** |
| ChatGPT via DataForSEO | 1 | 1 van 6 |
| Gemini via DataForSEO | 1 | 1 van 6 |

**Google zou in zijn eentje de helft van elke stem krijgen**, niet omdat hij belangrijker is maar
omdat hij goedkoop is en daarom drie keer gemeten wordt. De bron die het cijfer van de klant draagt
houdt één zesde over. De kansenlijst, en dus welke pagina's er geschreven worden, zou daarmee
feitelijk door Google bepaald worden.

**Het voorstel: eerst binnen een bron, dan tussen de bronnen.** Per bron de meerderheid van zijn
eigen metingen bepalen, dat levert één stem per bron op, en pas daarna de bronnen tellen. Dan
wegen vier bronnen als vier, ongeacht hoe vaak elk van ze gemeten is, en blijft het aantal
herhalingen een keuze over zekerheid in plaats van een keuze over invloed.

Bij een gelijke stand (twee tegen twee) telt de vraag als gemiste kans. Dat is de voorzichtige
kant: een pagina schrijven voor een vraag waar je bij de helft van de assistenten ontbreekt is te
verdedigen, hem overslaan terwijl je bij de helft ontbreekt niet.

Dit is een wijziging in de rekenkunde die de uitkomst voor bestaande klanten verandert. Hij hoort
dus onder test (`test-unit.ts`) en in het logboek, en niet stilletjes mee te liften.

---

## 6. Stap 0: de verificatie

`scripts/probe-dataforseo-ai.ts` staat klaar, typecheckt schoon en draait op de echte vragen van
Van den Udenhout uit productie. Draaien:

```bash
# DATAFORSEO_LOGIN en DATAFORSEO_PASSWORD in .env.local
npx tsx scripts/probe-dataforseo-ai.ts            # A en B, gratis
npx tsx scripts/probe-dataforseo-ai.ts --betaald  # ook C en D, ~$0,21
```

| stap | vraag | kosten | wat het besluit |
|---|---|---|---|
| A | Staat Nederland met het Nederlands in het AI-zoekvolume? | gratis | nee = hoofdstuk 5 van de bouwlijst vervalt |
| B | Welke modellen kunnen web search, en hoe heten ze? | gratis | levert de modelnamen voor de code |
| C | Levert `ai_search_volume` iets op voor volzin, cluster plus plaats, en cluster? | ~$0,01 | bepaalt welke zoekterm de code moet bouwen |
| D | Wat kost één meting via beide nieuwe bronnen echt? | ~$0,20 | bepaalt of er überhaupt gebouwd wordt |

**De afbreekregels, vooraf vastgelegd zodat ze niet achteraf worden opgerekt:**

- **Nederland of Nederlands ontbreekt bij A** → het zoekvolumedeel vervalt, de twee meetbronnen
  gaan gewoon door.
- **Bij C geeft geen enkele vorm een volume** → het zoekvolumedeel vervalt. Dit is een reëel
  scenario: het is precies wat er op 19 september bij het gewone zoekvolume gebeurde.
- **Bij D kost een meting meer dan $0,03** → dan is een bron duurder dan onze eigen ChatGPT-route
  terwijl hij minder oplevert, en gaat hij niet door zonder een expliciet besluit van de eigenaar.
- **Bij D is minder dan 80% van de antwoorden bruikbaar** → eerst uitzoeken waarom, niet bouwen. De
  drempel is dezelfde `MIN_SUCCESS_RATIO` die de meting zelf al hanteert.

De uitkomsten van A tot en met D horen als hoofdstuk aan dit document toegevoegd te worden, met de
datum erbij, zoals hoofdstuk 3 van `ai-overview-als-tweede-meetbron.md` dat doet. Zonder dat
hoofdstuk is dit plan niet af.

### 6.1 Uitkomst van de verificatie (20 september 2026)

Gedraaid met `DATAFORSEO_LOGIN`/`DATAFORSEO_PASSWORD` van de eigenaar, tegen de echte vragen van
Van den Udenhout. Eerst zonder `--betaald` (gratis, A en B), daarna met `--betaald` (C en D).
Totaal afgeschreven bij DataForSEO in deze verificatie: **$0,26** (script $0,1469, plus $0,1166 aan
gerichte vervolgaanroepen om de twee mislukkingen in D te verklaren, zie hieronder).

**A. Nederland en Nederlands in het AI-zoekvolume** ✅ aanwezig. 94 landen, Netherlands zit erbij
met "Dutch (nl)" als taal. De afbreekregel bij A ("Nederland of Nederlands ontbreekt") is dus niet
geraakt: het zoekvolumedeel (hoofdstuk 3.2 en stap 8) blijft overeind.

**B. Modellen met web search.** ChatGPT: 46 modellen, 33 met `web_search_supported: true`. Gemini:
12 modellen, alle 12 met web search. Belangrijke correctie op de aanname in dit document: **niet
elk model met `web_search_supported: true` ondersteunt ook `force_web_search`.** Het script koos
automatisch het eerste model uit de lijst (`o4-mini`, een redeneermodel) en dat gaf bij élke van de
vijf D-vragen de fout `40501 Invalid Field: 'this model does not support 'force_web_search''`, dus
$0,00 kosten maar ook 0 van de 5 bruikbaar. Een gerichte hertest met `gpt-4o` (geen redeneermodel)
werkte wel. **Conclusie: de modelkeuze in stap 2 (`lib/llm-responses/types.ts`) moet een
niet-redenerend model vastzetten (`gpt-4o` is nagemeten), niet het eerste model uit de lijst.**

**C. AI-zoekvolume op onze eigen termen.** Kosten: $0,0112 voor de hele lijst van 12 termen, ruim
onder de "~$0,01" schatting. Raakpercentage exact zoals hoofdstuk 3.2 voorspelde:

| vorm | raak | conclusie |
|---|---|---|
| volzin (de hele meetvraag) | 0 van 3 | zoals verwacht, te specifiek |
| clusterlabel + plaats | 0 van 5 | ook te specifiek, zelfs met plaats erbij |
| clusterlabel alleen | 4 van 4 | dit is de vorm die iets oplevert |

Voorbeeldcijfers op clusterniveau: "occasion kopen" 142, "zakelijke lease" 346 (huidige AI-schatting
was 68), "wagenparkbeheer" 17 (huidige schatting 30), "tweedehands auto kopen" 368. Twaalf maanden
historie is aanwezig. De afbreekregel bij C ("geen enkele vorm geeft een volume") is dus niet
geraakt, maar wel de helft ervan: **alleen de brede clusterterm werkt, dus `kandidaatZoektermen()`
moet in stap 8 bij de brede vorm landen, niet bij de specifieke.** Dat de twee gemeten cijfers ver
afwijken van de bestaande AI-schatting (346 tegen 68, 17 tegen 30) bevestigt ook meteen waarom
hoofdstuk 3.2 dit "stabiliteit, niet waarheid" noemt: het zijn geen vervangingen van hetzelfde
cijfer, het zijn twee verschillende dingen die toevallig dezelfde plek in de UI innemen.

**D. Wat een meting werkelijk kost, en of het antwoord bruikbaar is.** Dit is waar de afbreekregel
raakt. De eerste ronde met de automatisch gekozen modellen gaf op beide bronnen 0 van de 5
bruikbaar: ChatGPT door de `force_web_search`-fout hierboven (B), Gemini omdat alle vijf antwoorden
leeg terugkwamen (0 tekens) terwijl er wel voor $0,01 à $0,04 per aanroep is afgeschreven en de API
`web_search: true` teruggaf. Dat is precies conventie 3 in de praktijk: een leeg antwoord is geen
nulscore, en het script heeft daarom terecht niets als meting geteld.

Om vast te stellen of dat een instelfout was of een echte eigenschap van de bron, zijn er twee
gerichte hertests gedaan (dezelfde vraag, één aanroep per bron, geen batch van vijf):

| bron | model | kosten | tekens terug | bruikbaar |
|---|---|---|---|---|
| ChatGPT, DataForSEO, `force_web_search` aan | `gpt-4o` | **$0,0814** | 1272 (rijk, met vijf lokale autobedrijven en bronvermeldingen) | ja |
| Gemini, DataForSEO | `gemini-3.8-flash` | **$0,0351** | 853 (rijk, met lokale autobedrijven) | ja |

Beide bronnen werken dus wél, en leveren op hun beurt een bruikbaar, Nederlands, op web search
gebaseerd antwoord met concrete lokale bedrijven. Maar geen van beide blijft onder de grens van dit
document:

- **ChatGPT via DataForSEO kost $0,0814 per meting, 4,8 keer de grens van $0,03, en ruim 5 keer
  onze eigen ChatGPT-route ($0,017).** De geforceerde web search met landcode is duur, precies het
  scenario waar hoofdstuk 4 al voor waarschuwde ("een toeslag voor web search", "$0,0006 plus wat
  het model zelf aan tokens rekent" was dus een sterke onderschatting).
- **Gemini via DataForSEO kost $0,0351 per meting**, net boven de grens van $0,03.

**De afbreekregel van hoofdstuk 6 is dus geraakt: "Bij D kost een meting meer dan $0,03 → dan gaat
hij niet door zonder een expliciet besluit van de eigenaar."** De Gemini-flakiness (eerste ronde
leeg, tweede ronde rijk, zelfde instellingen) is bovendien zelf een open vraag: of dat op één losse
meting per vraag (keuze 2 van de eigenaar) een probleem wordt is niet met vijf metingen vast te
stellen.

### 6.2 Kan het goedkoper? (20 september 2026, op verzoek van de eigenaar)

`gpt-4o` en `gemini-3.8-flash` waren in 6.1 de eerste werkende modellen, niet per se de goedkoopste.
Zeven extra gerichte metingen (dezelfde vraag, telkens één aanroep) op goedkopere modelvarianten,
$0,20 aan kosten:

| bron | model | kosten | conclusie |
|---|---|---|---|
| ChatGPT | `gpt-4o-mini` | **$0,0272** | ✅ onder de grens van $0,03 |
| ChatGPT | `gpt-4.1-mini` | $0,0298 | ✅ net onder de grens |
| ChatGPT | `gpt-4.1-nano` | mislukt | ondersteunt `web_search` niet |
| ChatGPT | `gpt-5-mini` | mislukt | ondersteunt `force_web_search` niet |
| Gemini | `gemini-3.5-flash-lite` | $0,0300 | grenswaarde, langer antwoord dan het duurdere model |
| Gemini | `gemini-2.5-flash-lite` | $0,0359 | duurder dan het "gewone" `gemini-3.8-flash` |
| Gemini | `gemini-3.1-flash-lite` | $0,0439 | duurder dan het "gewone" `gemini-3.8-flash` |

**Voor ChatGPT werkt de goedkope-modelroute goed.** `gpt-4o-mini` geeft dezelfde soort rijke,
Nederlandse antwoorden met lokale bedrijven (1735 tekens, tegen 1272 bij `gpt-4o`) voor een derde
van de prijs: **$0,027 in plaats van $0,081, onder de grens van $0,03.** Dat is dan ook het model
dat in stap 2 vastgezet moet worden, niet `gpt-4o`.

**Voor Gemini werkt die route niet.** De "lite"-modellen zijn niet goedkoper in de praktijk, want ze
schrijven juist langere antwoorden (tot 2598 tekens) en de rekening loopt evenredig op. Een aparte
test met een kortere antwoordlimiet (`max_output_tokens: 512` in plaats van 2048) bevestigt dat:
`gemini-3.8-flash` bleef op $0,0326 hangen, nauwelijks lager dan de $0,0351 met de volledige lengte.

**Twee dingen die makkelijk als oplossing lijken, en het niet zijn (nagevraagd door de eigenaar,
20 september 2026, nog eens $0,38 aan verificatie):**

- **Web search uitzetten bij Gemini** (`web_search: false`) kost inderdaad bijna niets ($0,0068
  tegen $0,03+), maar meet dan ook iets anders. Zonder web search geeft Gemini zijn getrainde
  kennis terug in plaats van een antwoord op basis van een actuele zoekopdracht, en dat is precies
  het onderscheid dat hoofdstuk 3 bewaakt: de bron bestaat juist om te zien wat een AI zegt ná een
  websearch. Dit is geen goedkopere versie van dezelfde meting, het is een andere meting.
- **Alle 12 Gemini-modellen zijn getest** (eerst 4, op verzoek van de eigenaar de overige 8 erbij),
  met op de goedkoopste ook twee extra vragen om te zien of het model of de vraag de kosten bepaalt:

  | model | gemeten kosten (één of meer vragen) |
  |---|---|
  | `gemini-3.6-flash` | $0,0201 / $0,0362 / $0,0349 (gemiddeld $0,030, **op de grens**, geen stabiel voordeel) |
  | `gemini-3.5-flash-lite` | $0,0300 (1x gemeten, **op de grens**) |
  | `gemini-3.7-flash` | $0,0334 |
  | `gemini-3.8-flash` | $0,0326 / $0,0351 |
  | `gemini-2.5-flash-lite` | $0,0358 / $0,0359 |
  | `gemini-2.5-flash` | $0,0373 |
  | `gemini-3.1-pro-preview` | $0,0440 |
  | `gemini-3.1-flash-lite` | $0,0439 |
  | `gemini-2.5-pro` | $0,0445 |
  | `gemini-3-flash-preview` | $0,0587 |
  | `gemini-3.5-flash` (geen lite) | $0,0651 |

  De eerste hit op `gemini-3.6-flash` ($0,02) leek een doorbraak, maar bleek ruis: dezelfde model op
  twee andere echte vragen kwam uit op $0,035 à $0,036. **De kosten bij Gemini wisselen dus per
  vraag, niet (alleen) per model**, hetzelfde soort wiebelen dat hoofdstuk 8 al voor de score
  beschrijft, nu ook zichtbaar in de rekening. Over alle vijftien metingen samen ligt het gemiddelde
  op ongeveer $0,039, en geen enkel model zit daar betrouwbaar onder de $0,03.

**Conclusie: bij Gemini lost geen modelkeuze het kostenprobleem structureel op.** De twee beste
kandidaten (`gemini-3.6-flash`, `gemini-3.5-flash-lite`) balanceren op de grens zelf, in plaats van
er ruim onder te zitten zoals `gpt-4o-mini` dat voor ChatGPT doet.

**Gevolg voor het besluit:** met `gpt-4o-mini` in plaats van `gpt-4o` komt een meetronde op
ongeveer **$1,15 + 30×($0,027 + $0,03) ≈ $2,86** in plaats van de eerder berekende $4,60, en dat is
dichter bij de $2,15 uit hoofdstuk 4. ChatGPT via DataForSEO haalt de grens van $0,03 daarmee. Voor
Gemini blijft de keuze open, en is met deze bredere test scherper geworden: **op de grens meedoen
(rond $0,03 tot $0,039 per meting, wetend dat dit per vraag wisselt), of Gemini als vierde bron
laten vallen** en met drie bronnen (eigen ChatGPT-route, Google AI Overview, ChatGPT via
DataForSEO) verdergaan. Dat laatste raakt ook hoofdstuk 5: met drie in plaats van vier bronnen ziet
de stemverdeling er anders uit, al blijft het probleem van hoofdstuk 5 (Google weegt driemaal zo
zwaar als elke andere bron) even relevant.

**Gevolg voor het bouwplan in hoofdstuk 7:** met `gpt-4o-mini` vastgezet en een besluit over Gemini
(meedoen op de grens, of vervallen als vierde bron) kunnen stap 2 tot en met 7 door. Zonder dat
besluit blijven ze geblokkeerd. Stap 1 en stap 8 (de migratie en het zoekvolume) raken deze
afbreekregel niet en kunnen los doorgaan: het zoekvolume-endpoint is apart geprijsd (ongeveer $0,01
per merk, hoofdstuk 4) en heeft geen relatie met de LLM Responses-aanroepen.

### 6.3 Het besluit, en de kosten per 30 prompts op een rij (20 september 2026)

**Besluit van de eigenaar: Gemini blijft de vierde bron**, ook op of net boven de grens van $0,03.
Motivatie: een goed beeld van de Nederlandse markt weegt zwaarder dan het laatste stukje kosten, en
Gemini is precies de bron zonder ChatGPT-alternatief in dit plan. Daarmee is de afbreekregel van
hoofdstuk 6 uitdrukkelijk buiten werking gesteld voor Gemini, niet opgerekt: het is geen aanname dat
de kosten toch wel meevallen, het is een bewuste keuze met de nagemeten cijfers ernaast.

**De kosten per 30 prompts, op gelijke voet (1x per vraag), uit de al gemeten cijfers van 6.1 en
6.2, geen nieuwe aanroepen nodig:**

| bron | per meting | per 30 prompts |
|---|---|---|
| ChatGPT, eigen route | $0,017 | $0,51 |
| Google AI Overview, bij 1x per vraag | $0,0037 | $0,11 |
| ChatGPT via DataForSEO (`gpt-4o-mini`) | $0,027 | $0,82 |
| Gemini via DataForSEO | $0,02 tot $0,065, gemiddeld $0,039 | ongeveer $1,17 (wisselt per vraag) |

**Let op het verschil met hoofdstuk 4:** Google AI Overview draait op productie niet op 1x maar op
3x per vraag ($0,38 per 30 prompts in plaats van $0,11), omdat die herhaling nodig bleek voor de
betrouwbaarheid van juist die bron (dezelfde reden als waarom keuze 2 voor de twee nieuwe bronnen
juist 1x is: minder herhaling, meer wiebelen, en dat is hier bewust geaccepteerd, hoofdstuk 8).

**Een volledige meetronde met alle vier bronnen, op de cadans waarmee elke bron ook echt gaat
draaien** (Google op zijn bestaande 3x, de rest op 1x): $0,38 + $0,51 + $0,82 + $1,17 ≈ **$2,88**
per ronde, tegen de $1,15 van vandaag met twee bronnen en de eerder geraamde $2,15. Dit rekensommetje
ging nog uit van vier bronnen; hoofdstuk 6.4 laat zien wat er overblijft nu ChatGPT via DataForSEO
afvalt.

### 6.4 Het definitieve besluit: DRIE bronnen, niet vier (20 september 2026)

Ná hoofdstuk 6.3 (Gemini blijft, ook boven de kostengrens) heeft de eigenaar de scope van dit hele
plan aangescherpt, met twee gevolgen die allebei in dezelfde alinea van
`docs/logbook.md` (20 september 2026 (12)) staan.

**1. ChatGPT via DataForSEO komt niet.** Hij haalt de kostengrens wél met `gpt-4o-mini` ($0,027 per
meting, hoofdstuk 6.2), maar hij levert weinig toe: het is een derde manier om ChatGPT te bevragen,
naast de eigen route (bron 1) die al bestaat. Gemini heeft dat alternatief niet, dat is precies
waarom hij wél gebouwd wordt: zonder deze weg is er helemaal geen manier om Gemini's beeld van de
Nederlandse markt te meten (`lib/engines/gemini.ts` bestaat wel, maar wacht nog op een
`GEMINI_API_KEY`).

**Gevolg voor de kosten**, met ChatGPT via DataForSEO eruit: een meetronde met de drie werkelijke
bronnen komt op $0,51 (eigen ChatGPT) + $0,38 (Google AI Overview, 3x per vraag) + ongeveer $1,17
(Gemini via DataForSEO, 1x per vraag) ≈ **$2,06 per ronde**, dicht bij de oorspronkelijke raming van
$2,15 uit hoofdstuk 4 en goedkoper dan de $2,88 met vier bronnen uit hoofdstuk 6.3.

**2. Het AI-zoekvolume (hoofdstuk 3.2, keuze 3 van hoofdstuk 1) gaat NIET mee in deze bouwronde.**
Bij het uitwerken van stap 8 bleek de "voorrangsregel" die het plan vraagt (een gemeten cijfer draagt
de potentiescore, anders de bestaande AI-schatting) een echte ontwerpvraag te zijn en geen kwestie
van twee kolommen naast elkaar zetten: `search_volume_index` is een 0-100 schaal die
`recalibrateSearchVolume()` bewust over ALLE onderwerpen van een merk RELATIEF bepaalt, zodat 70 bij
het ene merk hetzelfde betekent als 70 bij het andere (zie de eigen documentatie van die functie).
Een absoluut gemeten `ai_search_volume` (bijvoorbeeld 346 zoekopdrachten per maand) is geen punt op
die schaal; hem er zomaar naast zetten of in omrekenen zonder de vergelijkbaarheid tussen merken te
breken is precies het "nooit door elkaar heen middelen, want dan is niet meer te zeggen wat een
getal betekent"-risico dat hoofdstuk van stap 8 zelf al benoemt. Dat verdient een eigen ontwerpronde
met de eigenaar (waarschijnlijk: laat een gemeten cijfer de relatieve AFWEGING tussen onderwerpen van
hetzelfde merk verschuiven, in plaats van de 0-100 schaal te vervangen), niet een aanname die deze
bouwronde er stiekem doorheen fietst.

**Gevolg:** stap 1 (de migratie voor `ai_search_volume`) en stap 8 (de leverancierslaag en de
voorrangsregel) uit hoofdstuk 7 zijn NIET uitgevoerd. Ze blijven openstaan, zie hoofdstuk 8.

---

## 7. Het bouwplan

> ✅ **Gebouwd op 20 september 2026** (`docs/logbook.md`, 20 september 2026 (12)): stap 2 tot en met
> 7 hieronder, alleen voor Gemini (niet voor ChatGPT via DataForSEO, hoofdstuk 6.4). Stap 1 en 8 (het
> AI-zoekvolume) zijn bewust NIET gebouwd, zie hoofdstuk 6.4 voor de openstaande ontwerpvraag.
> Stap 2's modelkeuze is `gemini-3.6-flash` (hoofdstuk 6.2's meest concurrerende gemiddelde), met de
> kanttekening dat de kosten bij Gemini per vraag wisselen in plaats van stabiel per model te zijn.

De volgorde is die van `CLAUDE.md`: migratie eerst, dan code, dan UI. Elke stap is los af te maken
en los te testen.

### Stap 1: de migratie (alleen voor het zoekvolume) — ❌ niet uitgevoerd, zie hoofdstuk 6.4

De meetbronnen hebben er geen nodig, `tracking_runs.engine` is vrije tekst. Het zoekvolume wel:
`profile_topics` krijgt het gemeten cijfer náást de bestaande schatting, en niet in plaats daarvan.

- `ai_search_volume` (integer, null als er niets gemeten is)
- `ai_search_volume_keyword` (text, welke zoekterm het opleverde, want zonder die term is het
  cijfer niet te controleren)
- `ai_search_volume_raw` (jsonb, de volledige ruwe respons, conventie 8)
- `ai_search_volume_at` (timestamptz, wanneer, want dit cijfer veroudert)

Additief en idempotent, conventie 4. De bestaande `search_volume_index` blijft staan en blijft
gevuld: hij is de terugval als er geen gemeten cijfer is (conventie 3, onbekend is beter dan een
gok, maar een bestaande schatting is beter dan niets).

Daarna de index in `supabase/README.md` bij, in dezelfde commit.

### Stap 2: de bronlaag — ✅ gebouwd, alleen voor Gemini

Een nieuwe map `lib/llm-responses/`, naar het model van `lib/ai-overview/`. Oorspronkelijk gepland
voor twee platformen (ChatGPT en Gemini); na hoofdstuk 6.4 alleen Gemini, dus zonder een
platform-onderscheid in de code:

- `types.ts`: één bronnaam (`dataforseo_gemini`), het aantal metingen per vraag (1, keuze 2 van de
  eigenaar), het aantal herkansingen, en het model (`gemini-3.6-flash`, hoofdstuk 6.2). Puur, dus
  testbaar (conventie 2).
- `registry.ts`: één schakelaar `DATAFORSEO_LLM_ENABLED`, standaard uit, en alleen de letterlijke
  waarde `true` zet hem aan. Zelfde regel en zelfde reden als bij de twee lagen ervoor: de
  DataForSEO-sleutel staat al in Vercel, dus de sleutel mag hier nooit de schakelaar zijn.
- `client.ts`: de aanroep met de herkansing erin. Geen `force_web_search` en geen
  `web_search_country_iso_code`: die velden bestaan niet bij Gemini (hoofdstuk 3.1), en zonder de
  ChatGPT-kant is er ook geen "verschil tussen twee platformen" meer om op één plek te zetten.
- `parse.ts`: de tekst en het aantal bronvermeldingen uit de respons halen, en de drie uitkomsten
  onderscheiden die `lib/ai-overview/types.ts` ook al onderscheidt: gemeten, leeg teruggekomen,
  mislukt. **Een leeg antwoord is geen nulscore maar een meetfout**, en er wordt dan niets
  opgeslagen. `money_spent` op het resultaat is de echte kostenbron, niet `cost` op de taak
  (nagemeten 20 september 2026).

`lib/pipeline/measure-llm-response.ts` is de taakingang, naar het model van
`measure-ai-overview.ts`, met dezelfde gedeelde `judgeRun()` en dezelfde LETTERLIJKE
`SIMULATE_SYSTEM` als de eigen ChatGPT-route (nu geëxporteerd uit `lib/pipeline/measure.ts`).

### Stap 3: het jobtype — ✅ gebouwd

Eén nieuw jobtype `measure_llm_response`. Geen platformveld in de payload: met alleen Gemini is er
niets om tussen te kiezen, en de bron staat toch al vast in `tracking_runs.engine`.

Conventie 7 (één zware AI-aanroep per taak) blijft daarmee overeind, en de taak ketent naar de
aggregatie op dezelfde manier als `measure_ai_overview`, want de kansen wachten op alle bronnen.
`countOpenPeriodicMeasurements()` in `lib/jobs/pending.ts` telt het nieuwe type mee, anders zou de
aggregatie beginnen voordat Gemini binnen is.

### Stap 4: inplannen — ✅ gebouwd

`enqueueLlmResponseMeasurement()` naast `enqueueAiOverviewMeasurement()`, aangeroepen vanuit
dezelfde drie plekken: `confirm`, `measure` en de tracking-cron. Eén meting per vraag.

### Stap 5: de rekenkunde (hoofdstuk 5 van dit document) — ✅ gebouwd

De meerderheidsregel zit in een nieuwe pure module, `lib/pipeline/missed-prompts.ts`
(`bepaalGemisteVragen()`), eerst binnen een bron, dan tussen de bronnen.
`computeMissedPrompts()` in `lib/pipeline/report.ts` roept die aan in plaats van zelf te tellen. Zes
scenario's in `test-unit.ts`: Google's drievoudige meting die niet meer wint van de rest (het
probleem dat dit hoofdstuk beschrijft), een gelijke stand tussen bronnen (telt als gemiste kans), een
bron die voor een vraag niets opleverde, een vraag die maar door één bron gemeten is (die bron
beslist, ongewijzigd gedrag), en een gelijke stand BINNEN één bron (blijft "genoemd" winnen,
ongewijzigd gedrag).

### Stap 6: de UI — ✅ gebouwd

Eén regel erbij in `BRONNEN` (`lib/engines/bron.ts`, label "Gemini"), met labels zoals de klant de
assistenten kent. Geen "engine" in beeld, `docs/schrijfstijl.md` §11. De bronknop en het
analyticsoverzicht pakken de rest vanzelf op, want die lezen `per_engine_json`.

`bronToelichting()` in dezelfde module geeft de zin die uitlegt dat Gemini geen Nederlandse
zoekcontext heeft; `components/analytics-filters.tsx` toont hem onder de bronknop zodra Gemini
gekozen is. Zonder die zin leest een lage score daar als een oordeel over het merk.

### Stap 7: de kosten — niet nodig gebleken

Bij nader onderzoek (20 september 2026) blijkt `/api/analyses/[id]/costs` de werkelijke `cost_usd`
per `ai_calls`-rij optellen, niet een schatting uit `lib/openai/pricing.ts` herberekenen. Die tarieven
worden alleen gebruikt door `lib/engines/openai.ts` en `lib/engines/gemini.ts`, waar de API zelf geen
kosten teruggeeft. DataForSEO geeft de werkelijke uitgave wél terug (`money_spent`), en die staat al
in `ai_calls` via `logAiCall()` in `measure-llm-response.ts`, precies zoals bij de AI Overview-bron.
Er is dus geen post in `pricing.ts` nodig; die zou toch nooit gelezen worden voor deze bron.

### Stap 8: het zoekvolume — ❌ niet uitgevoerd, zie hoofdstuk 6.4

- De leverancierslaag in `lib/search-demand/` uitbreiden met het AI-zoekvolume-endpoint, naast het
  bestaande Google Ads-volume.
- De zoekterm komt uit `kandidaatZoektermen()`, van specifiek naar breed, en de eerste met een echt
  volume wint. Welke term het werd, wordt opgeslagen.
- `recalibrateSearchVolume()` (`lib/pipeline/search-demand.ts`) krijgt een voorrangsregel: is er een
  gemeten cijfer, dan draagt dat de potentiescore; is er geen, dan blijft de bestaande AI-schatting
  staan. Nooit door elkaar heen middelen, want dan is niet meer te zeggen wat een getal betekent.
- De tooltip in de app moet zeggen welke van de twee het is. Een gemeten cijfer en een geschat
  cijfer die er hetzelfde uitzien is precies het soort belofte dat `merkstrategie.md` §30 bijhoudt.

---

## 8. Wat we accepteren, en wat open blijft

**Geaccepteerd:**

- **Eén meting per nieuwe bron wiebelt.** Op 20 september is gemeten dat één losse uitkomst
  ongeveer een muntworp is: bij 17 van de 28 vragen waar het merk ooit genoemd werd, viel de
  uitkomst een half uur later anders uit. Gemini krijgt daarom in de bronknop een cijfer dat
  zichtbaar beweegt. Dat is de prijs van keuze 2, en hij is te verdedigen zolang deze bron het cijfer
  van de klant niet draagt. Wordt het storend, dan is de goedkope uitweg deze bron alleen over de
  zwaarstwegende vragen laten lopen in plaats van over alle dertig.
- **Gemini meet zonder Nederlandse zoekcontext.** Zie hoofdstuk 3.1; de bronknop legt dit sinds deze
  bouwronde uit (`bronToelichting()`).

**Beantwoord door stap 0 (hoofdstuk 6.1 t/m 6.4, 20 september 2026):**

- Wat een meting werkelijk kost, en of dat goedkoper kan: met het juiste model kost ChatGPT via
  DataForSEO **$0,027** (`gpt-4o-mini`, onder de grens van $0,03), maar die bron wordt niet gebouwd
  (hoofdstuk 6.4: te weinig toegevoegde waarde naast bron 1 en 2). Gemini kost gemiddeld **$0,039**,
  boven de grens, en de eigenaar accepteert dat expliciet. Een meetronde met de drie werkelijke
  bronnen komt op ongeveer **$2,06**, dicht bij de verwachte $2,15. Zie hoofdstuk 6.1, 6.2 en 6.4.
- Welke modelnamen we vastzetten: **`gemini-3.6-flash`** (het gunstigste gemiddelde uit hoofdstuk
  6.2, geen duidelijke winnaar want de kosten wisselen vooral per vraag, niet per model). In code
  (`lib/llm-responses/types.ts`), niet in een omgevingsvariabele, zodat een modelwissel een commit is
  en geen instelling.
- Het AI-zoekvolume is gevuld voor Nederlandse termen, maar alleen op het brede clusterlabel (4 van
  4), niet op de volzin of het clusterlabel plus plaats (0 van 8). Zie hoofdstuk 6.1. Nog niet
  gebruikt: zie hoofdstuk 6.4 voor de ontwerpvraag die stap 8 tegenhoudt.

---

## 9. Wanneer dit af is

Gebouwd is niet geverifieerd (conventie 10). Dit werk is pas af als:

1. ✅ **Gedaan, 20 september 2026.** `scripts/probe-dataforseo-ai.ts` heeft gedraaid en de
   uitkomsten staan als hoofdstuk 6.1 t/m 6.4 in dit document, inclusief het definitieve besluit:
   drie bronnen (niet vier), het AI-zoekvolume nog niet gebouwd.
2. ✅ **Gebouwd en getest, 20 september 2026** (`docs/logbook.md`, 20 september 2026 (12)): de
   Gemini-bronlaag (stap 2 t/m 6) en de meerderheidsregel (stap 5), met scenario's in `test-unit.ts`.
   Stap 1, 7 en 8 zijn met reden overgeslagen (7: niet nodig, 1 en 8: uitgesteld, zie hoofdstuk 6.4).
3. **Nog open:** een echt cluster van Van den Udenhout een volledige meetronde over de drie
   werkelijke bronnen heeft gedaan (`DATAFORSEO_LLM_ENABLED=true` gezet op productie), en de
   werkelijke kosten naast de raming van hoofdstuk 6.4 (~$2,06) in het logboek staan, zoals op 20
   september bij het cluster APK Den Bosch gebeurd is voor de eerste twee bronnen.
4. **Nog open:** de kansenlijst van vóór en ná de nieuwe meerderheidsregel naast elkaar gelegd is op
   diezelfde echte data, zodat zichtbaar is wat er voor een bestaande klant verandert. De
   scenario-tests in `test-unit.ts` bewijzen dat de rekenkunde doet wat hoofdstuk 5 vraagt; ze
   bewijzen niet wat er bij een echt cluster daadwerkelijk verschuift.
5. ✅ `tsc --noEmit`, `test:unit` (5007), `test:chain` (722) en `build` staan alle vier groen voor de
   Gemini-bronlaag en de rekenkunde.
6. **Nog open:** het AI-zoekvolume (stap 1 en 8) krijgt zijn eigen ontwerpronde (hoofdstuk 6.4) en
   wordt dan alsnog gebouwd, in een eigen bouwronde.

Punt 3, 4 en 6 staan open. Zodra die rond zijn, gaat dit document eruit en blijft er een alinea met
datum en cijfers onderaan `docs/logbook.md` staan.
