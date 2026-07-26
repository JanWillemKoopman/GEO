# Modelkeuze — heroverweging op basis van het OpenAI-landschap van juli 2026

> **Status:** onderzoeksdocument, geen vastgelegde beslissing. `abcplan.md` §2 en `README.md` §4 bevatten nog de oorspronkelijke keuze (`gpt-4.1-nano` + `gpt-4.1-mini`). Dit document onderbouwt waarom die keuze herzien moet worden en wat de alternatieven kosten. Pas `abcplan.md` pas aan zodra de nieuwe keuze bewust is vastgelegd.
>
> *Opgesteld 26 juli 2026.*

---

## 0a. Correcties na zelf-factcheck (26 juli 2026)

Twee fouten in eerdere versies van dit document, hier rechtgezet. Beide raken de cijfers hierboven.

### Correctie 1 — het 8.000-token-blok geldt níet voor de GPT-5-familie

Dit document rekende overal met een vast blok van 8.000 search-content-tokens per `web_search`-call. **Dat blok is modelspecifiek: het is gedocumenteerd voor `gpt-4o-mini` en `gpt-4.1-mini`.** Voor andere modellen — inclusief de hele GPT-5-lijn — worden de **werkelijk verbruikte** search-content-tokens afgerekend tegen het inputtarief.

Gevolg: voor het *huidige* plan (GPT-4.1) was de 8k-aanname correct. Voor elk GPT-5-scenario is het een **schatting**, geen tarief. Werkelijk verbruik varieert en is bovendien te sturen met de `search_context_size`-parameter (`low`/`medium`/`high`) — een kostenknop die in §7 ontbrak en die je expliciet moet zetten.

Gevoeligheid van de nulmeting voor deze aanname:

| Config | 4k tokens/call | 8k *(gehanteerd)* | 15k tokens/call |
|--------|---------------|-------------------|-----------------|
| 0 · Huidig plan (4.1) | $0,342 | **$0,355** | $0,379 |
| 1 · Minimale migratie (5.4) | $0,400 | **$0,427** | $0,475 |
| 2 · Aanbevolen (Luna op 3a) | $0,587 | **$0,710** | $0,925 |
| 3 · Max (Sol op 3a) | $1,703 | **$2,306** | $3,361 |

Alle bedragen in dit document hanteren de 8k-kolom. **Lees ze als een middenschatting met een reële bandbreedte, niet als een tarief** — en zet `search_context_size` bewust, want die knop verschuift je kosten meer dan de meeste modelkeuzes. Bij het aanbevolen scenario scheelt `low` versus `high` meer dan een derde van de nulmeting.

*(Het scenario "Sol op 3a" is in de tabel hierboven herrekend en komt nu op $2,31 in plaats van de eerder genoemde ~$1,95; die eerdere waarde rekende de research-tokens verkeerd toe.)*

### Correctie 2 — ik heb de schrijftest te stellig samengevat

Ik schreef: *"GPT-5.5 was de sterkste schrijver, Sol zat er dicht achter, Terra en Luna bleven ver achter."* De eerste helft is te sterk gesteld. Wat de test daadwerkelijk laat zien:

- Gemiddeld over de condities was het tussen GPT-5.5 en Sol **een praktisch gelijkspel** — blinde gemiddelde rang 8,11 tegen 8,58 over 24 teksten.
- **Sol scoorde het best van alle GPT-modellen in de test in totaal.** GPT-5.5 lag alleen vóór in de ruwe conditie.
- Een deel van GPT-5.5's voorsprong kwam doordat het ~50% meer tekst produceerde op dezelfde opdracht.
- Het testdomein was **romanfictie**, geen marketing- of SEO-content.

**Wat wél robuust overeind blijft — en dat is het punt dat de beslissing draagt: Terra en Luna bleven in beide rondes ver achter op schrijfkwaliteit.** Mijn aanbeveling (níet Terra of Luna als schrijfmodel) wordt hierdoor niet zwakker. Maar mijn onderbouwing "kies GPT-5.5 boven Sol" was dat wel — die vervalt. **Sol is de veiliger keuze**, ook omdat de deprecatie-horizon van GPT-5.5 onduidelijk is en de cadans hard loopt (GPT-5.2 verdween binnen maanden na de opvolger). Zie §6b.

---

## 0. Bronvoorbehoud (lees dit eerst)

De officiële OpenAI-pagina's (`platform.openai.com/docs/pricing`, `developers.openai.com/api/docs/deprecations`) waren vanuit deze omgeving **niet direct bereikbaar** — het egress-beleid blokkeerde ze. Alle prijzen, modelnamen en einddatums hieronder komen uit **secundaire bronnen** (prijs-aggregators, vakpers, OpenAI-community). Meerdere bronnen zijn tegen elkaar gelegd en waar ze verschilden staat dat vermeld.

**Verifieer daarom vóór de definitieve beslissing zelf twee dingen op de officiële pagina's:**

1. `developers.openai.com/api/docs/deprecations` — de exacte shutdown-datum van `gpt-4.1-mini` en `gpt-4.1-nano`.
2. `platform.openai.com/docs/pricing` — de exacte tarieven en of prompt-caching/Batch van toepassing zijn.

De **conclusies** hieronder zijn robuust tegen kleine prijsafwijkingen — ze hangen op ordes van grootte, niet op centen.

---

## 1. De kern in vijf zinnen

1. **Je twee gekozen modellen worden binnen ~3 maanden uitgezet.** `gpt-4.1-nano` staat op de shutdown-lijst van 23 oktober 2026; voor de GPT-4.1-familie circuleert 14 oktober 2026 als API-einddatum. Je zou bouwen op een fundament dat verdwijnt vóórdat de MVP goed en wel draait.
2. **De reden waarom je de GPT-5-familie afwees is achterhaald.** De structured-output-problemen die je in §2 noemt waren specifiek voor het eerste `gpt-5-nano`; de huidige generatie (`gpt-5.4-nano/mini`, `gpt-5.6 Luna`) ondersteunt native JSON-schema.
3. **Je optimaliseert de verkeerde variabele.** 87% van de nulmeting (~$0,31 van $0,356) is de vaste `web_search`-fee van $10/1.000 calls. Die is **model-onafhankelijk**. Alle tokens samen kosten $0,045.
4. **Kwaliteit kopen is daardoor spotgoedkoop — behalve op halte 3a.** Alle niet-3a-haltes samen upgraden van 4.1-mini naar 5.4-mini kost ~$0,03 per analyse. Halte 3a is de enige echte kostenknop, doordat de 8.000 search-content-tokens × 30 calls tegen het *input*-tarief van het model worden afgerekend.
5. **Op halte 3a is modelkeuze géén kwaliteitsluxe maar een validiteitsvraag** — zie §5. Dat is het belangrijkste inhoudelijke argument in dit document.

---

## 2. Het OpenAI-landschap op 26 juli 2026

### Huidige familie: GPT-5.6 (uitgebracht 9 juli 2026)

OpenAI heeft de `base`/`mini`/`nano`-naamgeving losgelaten. Het cijfer is nu de generatie, de naam de capaciteitstier:

| Model | In / Uit per 1M | Positionering |
|-------|-----------------|---------------|
| **GPT-5.6 Sol** | $5,00 / $30,00 | Vlaggenschip. Wat ChatGPT Plus/Pro serveert. |
| **GPT-5.6 Terra** | $2,50 / $15,00 | Balans-tier, "everyday work". |
| **GPT-5.6 Luna** | $1,00 / $6,00 | Snelste/goedkoopste van de familie. Hoogvolume, classificatie, extractie. |

Luna is de **bodem** van de 5.6-familie — er is geen 5.6-equivalent van "nano".

### Nog actueel en ondersteund

| Model | In / Uit per 1M | Opmerking |
|-------|-----------------|-----------|
| GPT-5.5 | $5,00 / $30,00 | Vorige vlaggenschip; draait nog als default op ChatGPT Free. |
| GPT-5.4 | $2,50 / $15,00 | Maart 2026. *(Eén bron noemt $10/$30 — waarschijnlijk de Pro-variant; verifiëren.)* |
| **GPT-5.4 mini** | $0,75 / $4,50 | 1,1M context. Structured outputs + web search. |
| **GPT-5.4 nano** | $0,20 / $1,25 | 400K context. Structured outputs + web search. **Goedkoopste optie in het huidige aanbod.** |
| GPT-5.1 | $1,25 / $10,00 | Legacy, niet meer op de hoofd-prijspagina. |

Prompt-caching geeft ~90% korting op herhaalde input-prefixen bij de 5.4-familie; de Batch API halveert alle tarieven (niet bruikbaar voor interactieve haltes, wél voor de wekelijkse cron — zie §7).

### Uitfasering — dit raakt het plan direct

| Model | Status |
|-------|--------|
| `gpt-4.1-nano` | **Op de shutdown-lijst van 23 oktober 2026.** |
| `gpt-4.1-mini` | Uit ChatGPT verwijderd op 13 feb 2026; voor de API-kant circuleert **14 oktober 2026** als cutoff voor de GPT-4.1-lijn. |
| `gpt-4o-mini` | GPT-4o-lijn gaat mee in de oktober-golf. **Vervalt dus ook als fallback** (§2 van `abcplan.md` noemt dit als reserve). |

De April-2026-deprecatiegolf betrof 25+ model-ID's met twee harde datums: 23 juli 2026 (al gepasseerd, vooral Codex-snapshots) en 23 oktober 2026.

> **Consequentie:** de "Fallback-regel" in `abcplan.md` §2 — terugvallen op `gpt-4o-mini` bij schema-problemen — is niet langer uitvoerbaar. Alle drie de genoemde modellen verdwijnen in dezelfde golf.

---

## 3. Beoordeling van de oorspronkelijke keuze

**Wat goed was, en overeind blijft:**

- De **gedifferentieerde strategie per halte** (goedkoop waar het aantal calls de kosten drijft, duurder waar kwaliteit telt) is precies de juiste denkwijze. Die structuur hoeft niet op de schop — alleen de ingevulde modelnamen.
- De **`web_search`-discipline** (alleen aan bij halte 1 en 3a) is de belangrijkste kostenmaatregel in het hele plan. Volledig terecht.
- De **goedkeuringspoort vóór halte 3** beschermt exact de juiste kostenpost.
- De **retry-regel** (3b apart herhalen, nooit 3a) beschermt exact de juiste call.
- Het **voorbehoud** dat je zelf in §2 en §10 opnam ("controleer `platform.openai.com/pricing` vóór een begroting") was terecht — dit document is precies die controle.

**Wat niet meer klopt:**

1. **Beide modellen worden uitgezet** — en de fallback ook. Dit is geen kwaliteitsdiscussie maar een houdbaarheidsprobleem.
2. **Het gpt-5-nano-argument is verlopen.** §2 wijst de GPT-5-lijn af op onbetrouwbare schema-naleving. Dat gold voor het eerste `gpt-5-nano`; `gpt-5.4-nano`, `gpt-5.4-mini` en Luna ondersteunen native JSON-schema. De grond onder dit argument is weg.
3. **De kostenafweging weegt de verkeerde post.** §2 zegt "het prijsverschil tussen nano en mini is in absolute dollars verwaarloosbaar". Dat klopt — maar het geldt veel breder dan je concludeert. Zie §4: de vaste tool-fee overheerst alles.
4. **Kennisafkap.** GPT-4.1 heeft een kennisafkap van medio 2024. Voor een product dat meet hoe merken *nu* in AI-antwoorden voorkomen, is dat een reëel bezwaar — ook al leunt halte 3a grotendeels op `web_search`.

**Samengevat:** de redenering was gezond, maar gebaseerd op een momentopname die inmiddels verlopen is. Het raamwerk houdt; de invulling niet.

---

## 4. De kostenstructuur die alles bepaalt

Nulmeting volgens `abcplan.md` §10, huidig plan:

| Post | Bedrag | Aandeel |
|------|--------|---------|
| `web_search`-fee (31 × $0,01) | **$0,3100** | **87,2%** |
| Alle tokens samen | $0,0454 | 12,8% |
| **Totaal** | **$0,3554** | |

**Twee gevolgen:**

**(a) Buiten halte 3a is modelkeuze financieel irrelevant.** Haltes 1, 2, B1, B2 en 3b kosten samen $0,045 met de huidige modellen. Diezelfde haltes op `gpt-5.4-mini`/`gpt-5.4-nano`: ~$0,056. Een verschil van **iets meer dan één cent per analyse**. Er is geen zinnig kostenargument om hier te beknibbelen.

**(b) Halte 3a is de enige echte knop** — en om een specifieke reden. De `web_search`-tool rekent per call een vast blok van **8.000 search-content-tokens** af tegen het **input-tarief van het gebruikte model**. Bij 30 calls is dat 240.000 input-tokens per analyse, puur zoekresultaat:

| Input-tarief | 240.000 search-tokens |
|--------------|----------------------|
| $0,10 (4.1-nano) | $0,024 |
| $0,20 (5.4-nano) | $0,048 |
| $1,00 (Luna) | $0,240 |
| $2,50 (Terra) | $0,600 |
| $5,00 (Sol) | $1,200 |

Het input-tarief van het 3a-model is dus dé bepalende variabele van het hele kostenplaatje.

---

## 5. Het inhoudelijke argument: halte 3a is een validiteitsvraag

Dit is belangrijker dan de kosten.

Jouw product doet één belegde belofte: *"zo zichtbaar ben je in ChatGPT."* Halte 3a is de meting die die belofte waarmaakt. Als het gesimuleerde antwoord systematisch afwijkt van wat een echte gebruiker ziet, is het hele meetresultaat — de score, de concurrentievergelijking, de gaps, het rapport, de gegenereerde content — gebouwd op een niet-representatieve waarneming. Geen enkele nauwkeurigheid verderop in de pijplijn repareert dat.

**Wat serveert ChatGPT vandaag?**

- **Free:** GPT-5.5
- **Plus/Pro:** GPT-5.6 Sol

**Wat zou je meten met `gpt-4.1-nano`?** Het kleinste model van een generatie die uit ChatGPT is verwijderd. Twee generaties onder wat de goedkoopste betaalde gebruiker krijgt.

Belangrijke nuance, eerlijk gezegd: **een perfecte reproductie is sowieso onmogelijk.** Het ChatGPT-product heeft een eigen system prompt, eigen retrieval-stack en eigen personalisatie die je via de API niet nabootst. Het gaat er niet om de kloof tot nul te brengen — dat kan niet. Het gaat erom hem niet onnodig groot te maken.

`abcplan.md` §2 motiveert nano voor halte 3a met: *"het antwoord leunt vooral op de `web_search`-resultaten, niet op modelcreativiteit."* Dat is deels waar en deels niet. Wat je meet is niet alleen *wat* er gevonden wordt, maar **welke bronnen het model kiest te citeren, welke merken het in het antwoord opneemt, en in welke volgorde** — precies de drie dingen die jouw score, positie-veld en concurrentievergelijking uitmaken. Dat is bij uitstek modelgedrag, niet zoekmachinegedrag.

**Halte 3b (mention-beoordelen) is een ander verhaal.** Dat is een echte classificatietaak op een tekst die je al hebt. Daar is het kleinste betrouwbare model prima, en daar is de nano-redenering uit §2 wél volledig correct.

---

## 6. Scenario's, doorgerekend

Berekend op de exacte tokenaannames uit `abcplan.md` §10, inclusief de vaste `web_search`-fee. De GPT-5.x-modellen zijn reasoning-modellen: hun redeneertokens worden als output afgerekend. Daarvoor is een conservatieve opslag gerekend (×1,5 op output bij lage reasoning-effort, ×1,8–2,0 bij de zwaardere tiers). De ondergrens zonder die opslag staat tussen haakjes.

| # | Scenario | Nulmeting | Per week | Nulmeting + 10 weken |
|---|----------|-----------|----------|----------------------|
| 0 | **Huidig plan** (4.1-nano / 4.1-mini) | $0,355 | $0,333 | **$3,68** |
| 1 | **Minimale migratie** (5.4-nano / 5.4-mini) | $0,428 *($0,411)* | $0,381 | **$4,24** |
| 2 | **Luna-simulatie** — 5.4-nano/5.4-mini, 3a = Luna | $0,710 *($0,665)* | $0,664 | **$7,35** |
| 3 | **Terra-simulatie** — 5.4-nano/5.4-mini, 3a = Terra | $1,295 *($1,142)* | $1,249 | **$13,78** |
| 4 | **Luna overal** | $0,759 *($0,704)* | $0,701 | **$7,76** |
| 5 | **Terra overal** | $1,514 *($1,295)* | $1,369 | **$15,20** |
| 6 | **Sol overal** — kosten spelen geen rol | $2,828 *($2,281)* | $2,528 | **$28,10** |

### Wat de tabel laat zien

- **Scenario 1 kost $0,07 meer per analyse dan nu.** Dat is de prijs van "niet op een uitstervend model bouwen". Verwaarloosbaar.
- **Scenario 2 vs. 4:** Luna overal kost slechts $0,05 meer dan Luna-alleen-op-3a. Zodra je 3a op Luna zet, is de rest van de pijplijn ook op Luna zetten bijna gratis — dat scheelt een modelvariabele in je code.
- **Scenario 6 (Sol overal) is niet aan te raden, óók niet als geld geen rol speelt.** $0,278 daarvan gaat naar halte 3b: een ja/nee-classificatie met een vlaggenschipmodel. Dat is 8× de kosten van scenario 1's héle nulmeting, voor een taak waar het meetbaar niets toevoegt. "Kosten spelen geen rol" is geen reden om het duurste model op de domste taak te zetten.
- **De echte max-kwaliteitsvariant** is scenario 3 of 5 met Sol op alléén halte 3a (~$1,95 nulmeting, ~$21,50 over 10 weken) — alle kwaliteitswinst die ertoe doet, zonder de verspilling van scenario 6.

### Halte C — contentgeneratie

Deze halte is apart uitgewerkt in **§6b** hieronder: de afweging loopt daar precies andersom dan bij halte 3a, en de conclusie wijkt af van de rest van het advies.

---

## 6b. Halte C — contentgeneratie apart bekeken

### Waarom deze halte anders werkt

Bij halte 3a is het **input**-tarief bepalend (8.000 search-tokens × 30 calls). Bij contentgeneratie is het precies omgekeerd: je schrijft veel meer dan je inleest, dus het **output**-tarief domineert. En output is bij elk model 4–6× duurder dan input.

Daar komt bij dat dit de enige halte is waar de klant het resultaat **letterlijk leest en publiceert onder zijn eigen naam**. Bij een score die 3 punten afwijkt merkt niemand iets. Bij een pagina die stroef Nederlands schrijft of een verzonnen statistiek bevat, is het meteen zichtbaar — en het is precies het onderdeel waarop je product beoordeeld wordt.

### Eerst een correctie op de tokenaanname

`abcplan.md` §10 rekent met **~1.100 in / ~1.600 uit** per pagina. Dat is te krap voor het `ContentPiece`-schema uit §8. Dat schema vraagt in één antwoord om: `title`, `metaTitle`, `metaDescription`, **volledige `bodyMarkdown`**, een `faq`-array, een complete `schemaJsonLd`-string, `targetIntent` en `cluster`.

Ruwe verdeling van 1.600 output-tokens:

| Veld | Tokens |
|------|--------|
| JSON-LD (volledig, plakklaar) | ~250 |
| FAQ-array (4–6 vragen) | ~350 |
| Metadata (title, meta, intent, cluster) | ~100 |
| **Overblijvend voor `bodyMarkdown`** | **~900** |

900 tokens is in het Nederlands ongeveer **550–600 woorden**. Dat is een korte blogpost, geen pagina die door een AI-assistent geciteerd gaat worden. Content die daadwerkelijk als bron wordt opgepikt zit eerder op 1.200–2.000 woorden met echte diepgang — dat is het hele punt van de halte.

**Reken daarom met ~2.500 in / ~4.000 uit.** Dat betekent ook dat de $0,003/pagina in §10 er ongeveer een factor 2,5 naast zit, zelfs op hetzelfde model.

### Kosten per pagina

| Model | Uit-tarief | Plan-aanname (1.100/1.600) | **Realistisch (2.500/4.000)** | Realistisch + `web_search` |
|-------|-----------|---------------------------|------------------------------|---------------------------|
| gpt-4.1-mini *(huidig)* | $1,60 | $0,003 | $0,007 | $0,021 |
| gpt-5.4-mini | $4,50 | $0,012 | $0,029 | $0,045 |
| GPT-5.6 Luna | $6,00 | $0,016 | $0,039 | $0,057 |
| **GPT-5.6 Terra** | $15,00 | $0,046 | **$0,114** | **$0,144** |
| **GPT-5.6 Sol** | $30,00 | $0,102 | **$0,253** | **$0,303** |
| **GPT-5.5** | $30,00 | $0,102 | **$0,253** | **$0,303** |

Voor een klant die 10 pagina's laat schrijven: **$0,29 op 5.4-mini, $1,14 op Terra, $2,53 op Sol** — of $3,02 op Sol mét `web_search`.

### De bevinding die mijn eerdere Terra-advies herziet

Een blinde schrijftest (Noren, juli 2026) liet 24 volledige teksten door beoordelaars ranken zonder te weten welk model wat had geschreven. Uitkomst:

> **GPT-5.5 was de sterkste schrijver, Sol zat er het dichtst achter, en Terra en Luna bleven ver achter.**

De test werd nog een tweede keer gedraaid omdat GPT-5.5 in ronde 1 ~50% langer schreef dan de 5.6-tiers; ook na correctie voor lengte, met verse beoordelaars, bleef de volgorde staan. De conclusie van de onderzoekers: *voor schrijven telt de tier die je kiest zwaarder dan de generatie-upgrade.*

**Dat is relevant, want het is contra-intuïtief in twee richtingen:**

1. **Terra is voor schrijfwerk géén "sweet spot".** Het is de aanbeveling die je overal leest — maar die aanbeveling komt uit coding- en tool-benchmarks. Op schrijfkwaliteit valt Terra samen met Luna in de achterhoede.
2. **De nieuwste generatie is hier niet de beste.** GPT-5.5 kost hetzelfde als Sol ($5/$30) en scoorde hoger. Wie blind "het nieuwste" pakt, pakt op deze halte niet het beste.

### Wat er níet deugt aan deze onderbouwing

Dit is de zwakste plek in het hele document en dat hoor je te weten voordat je erop besluit.

1. **Verkeerd domein.** De test ging over **romanfictie**. Prozastem en clichévermijding vertalen redelijk naar merkteksten; structuur, feitelijke dichtheid en schema-correctheid — hier juist doorslaggevend — zijn niet gemeten. Op precies díe eigenschappen kan Sols nieuwere generatie voorliggen op wat de fictietest laat zien.
2. **Niet-neutrale bron.** De test komt van Noren, een partij die zelf schrijfgereedschap verkoopt. De methode (blind, verse beoordelaars, herhaald met lengtecorrectie) is netjes, maar het is geen onafhankelijke benchmark. Eén test, n=24, één leverancier.
3. **Geen enkel Nederlands datapunt.** Zie hieronder — dit is het grootste gat.
4. **Mijn eigen tokenaannames zijn constructies, geen metingen.** De ~4.000 output-tokens heb ik afgeleid uit het `ContentPiece`-schema, niet gemeten. De reasoning-opslag (×1,5–2,0) is een schatting; op Sol is dat ruwweg de helft van de $0,26. Als Sol met lage effort draait, kost een pagina eerder $0,14; met hoge effort eerder $0,40.

**Wat dit betekent voor de beslissing:** de *richting* is robuust — Terra en Luna zakten in beide rondes weg op schrijfkwaliteit, en dat is het enige dat je hier écht moet weten. De *precieze keuze binnen de top* (Sol versus GPT-5.5) rust op te dun bewijs om zonder eigen test vast te leggen. Gelukkig is dat goedkoop op te lossen: zie de testinstructie hieronder.

### Het grootste onbeantwoorde risico: Nederlands

Geen enkele benchmark die ik heb gevonden zegt iets over **Nederlandse** schrijfkwaliteit per tier. Alle vergelijkingen zijn Engelstalig.

Dat is een reëel gat, want jouw klanten zijn Nederlandstalig MKB en het geleverde product ís de tekst. De algemene verwachting is dat de kleinere/gedistilleerde tiers juist op niet-Engelse generatie het eerst inzakken — niet-Engels is een kleiner deel van de trainingsdata en distillatie behoudt vooral de dominante vaardigheden. Stroef, vertaald aanvoelend Nederlands is voor een niet-technische klant onmiddellijk zichtbaar, terwijl het in geen enkele Engelse benchmark opduikt.

**Dit is te testen voor een paar dollar en niet te repareren na oplevering.** Draai je eigen `ContentPiece`-prompt op één echte aanbeveling door 5.4-mini, Luna, Terra, Sol en GPT-5.5, en laat een Nederlandstalige lezer ze blind ranken. Bij ~$0,25 per generatie kost die hele test minder dan twee dollar. Doe dit vóór je een tier vastlegt — hij weegt zwaarder dan alles wat hierboven staat.

### Twee wijzigingen die meer opleveren dan de modelkeuze

**1. Zet `web_search` aan bij contentgeneratie.** §8 legt vast: *"structured output, **geen** `web_search`"*, terwijl dezelfde alinea vraagt om *"concrete datapunten"*. Dat is een tegenstrijdigheid met gevolgen. Concrete datapunten zonder retrieval betekent **verzonnen cijfers** — en die publiceert jouw klant onder zijn eigen naam. Dat is een aansprakelijkheidsrisico, en het ondermijnt bovendien het doel van de halte: AI-assistenten citeren juist bronneerbare, verifieerbare claims. Content zonder verifieerbare feiten wordt niet opgepikt, en dan meet je in week 10 je eigen mislukking.

Kosten: **+$0,03 per pagina.** Voor het wegnemen van hallucinatierisico op het enige artefact dat de klant publiceert.

**2. Splits de halte in twee calls**, net zoals je bij B1→B2 en bij de 5 promptcategorieën al doet — met exact dezelfde onderbouwing als je daar zelf gaf:

- **C1 · Research** (`web_search` aan, Terra volstaat): verzamel feiten, cijfers en bronnen voor het onderwerp. ~$0,066.
- **C2 · Schrijven** (geen search, beste schrijfmodel): schrijf de pagina op basis van C1's feiten + Brand DNA. ~$0,26 op Sol.

Totaal ~$0,33 per pagina. Je scheidt daarmee *feiten verzamelen* van *goed schrijven* — twee taken die verschillende modellen goed doen, en die één call nu tegelijk moet leveren. Het is bovendien precies het patroon dat je in §7 al hebt vastgelegd, dus het past in de bestaande architectuur.

### Advies voor halte C

| | Keuze | Per pagina |
|---|---|---|
| **Aanbevolen** | **C1 research = Terra** (`web_search` aan) → **C2 schrijven = Sol**, ~4.000 output-tokens | **$0,33** |
| **Middenweg** | Terra voor beide calls | $0,18 |
| **Budget / bouwfase** | `gpt-5.4-mini` voor beide calls | $0,06 |
| **Te testen** | GPT-5.5 in plaats van Sol als schrijfmodel — zelfde prijs. Zwakker onderbouwd dan ik eerst schreef (zie hierboven) en met onduidelijke deprecatie-horizon. Alleen kiezen als je eigen Nederlandse test hem wint. | $0,33 |
| **Niet doen** | Luna als schrijfmodel. En Terra alléén als je eigen test hem goedkeurt — "Terra is de sweet spot" komt uit coding-benchmarks en is op schrijfkwaliteit precies de verkeerde conclusie. | |

**Is $0,33 per pagina het waard?** Een klant die tien pagina's laat schrijven kost je **$3,30**. Dat is het volledige tastbare product dat hij meeneemt, waarop hij zijn oordeel over de tool baseert, en waarmee hij bij een collega over je product praat. Op elke realistische verkoopprijs is dit de goedkoopste kwaliteitswinst in het hele plan — goedkoper dan de 10 weken tracking eromheen, en zichtbaarder voor de klant dan wat dan ook.

Dit is ook de enige halte waar ik het **wél** verdedigbaar vind om de duurste tier te nemen zonder verdere afweging. Bij halte 3b was dat verspilling omdat het model daar niets toevoegt; hier voegt het precies het enige toe dat de klant kan beoordelen.

### Kleine technische kanttekening bij het schema

`schemaJsonLd: z.string()` laat het model JSON genereren *binnen* een JSON-string. Dat is een escaping-valkuil die ook goede modellen regelmatig verkeerd doen, en Zod valideert de inhoud niet — je krijgt syntactisch geldige output met kapotte JSON-LD erin. Overweeg het als gestructureerd object te modelleren, of valideer en repareer het server-side met een JSON-LD-parser vóór je `status: "ready"` zet. Dit staat los van de modelkeuze en helpt bij elk model.

### Op schaal — 50 klanten, elk één analyse met wekelijkse tracking aan

| Scenario | API-kosten/maand | Als % van €3.950 omzet (50 × €79) |
|----------|------------------|-----------------------------------|
| 0 · Huidig | ~$72 | 1,8% |
| 1 · Minimale migratie | ~$83 | 2,1% |
| 2 · Luna-simulatie | ~$144 | 3,6% |
| 3 · Terra-simulatie | ~$270 | 6,8% |
| 6 · Sol overal | ~$547 | 13,9% |

Zelfs het duurste scenario blijft binnen een werkbare brutomarge. Bij een SaaS-prijs voor het MKB is API-kosten simpelweg niet de bepalende factor in dit bedrijfsmodel — Supabase, Vercel en je eigen tijd zijn dat wel.

---

## 7. Advies

### Aanbevolen: scenario 2 — Luna-simulatie

| Halte | Model | Waarom |
|-------|-------|--------|
| 1 · Brand DNA | `gpt-5.4-mini` | Eenmalig, kwaliteitsgevoelig. Verschil met nano: ~$0,014. |
| 2 · Prompt-generatie (5×) | `gpt-5.4-mini` | Diversiteit per categorie. Verschil: ~$0,005. |
| **3a · AI-antwoord simuleren** | **`gpt-5.6-luna`** | **De meting zelf. Huidige generatie, redelijk dicht bij wat gebruikers zien, ~$0,24/analyse extra.** |
| 3b · Mention beoordelen | `gpt-5.4-nano` | Echte classificatietaak, 30×/week. Jouw oorspronkelijke redenering klopt hier volledig. |
| B1 · Gap-analyse | `gpt-5.4-mini` | 1× per rapport, vereist redeneren. |
| B2 · Rapport | `gpt-5.4-mini` | Eindproduct dat de klant leest. |
| C · Contentgeneratie | **`gpt-5.6-sol`** (+ Terra research-call, `web_search` aan) | Het tastbare product. ~$0,33/pagina, volledig vraaggestuurd. **Zie §6b — hier geldt een andere afweging dan bij de rest.** |

**Kosten: ~$0,71 per nulmeting, ~$7,35 per analyse inclusief 10 weken tracking.** Ongeveer 2× het huidige plan, in absolute zin ~$3,70 extra per klant over een volledig traject.

**Is dat het waard?** Ja, om drie redenen, in volgorde van gewicht:

1. **Je huidige modellen bestaan over drie maanden niet meer.** Migreren is geen keuze maar een deadline. De vraag is alleen waarnaartoe.
2. **De meerprijs zit vrijwel volledig op halte 3a — precies waar hij inhoudelijk verdedigbaar is.** Je koopt geen "beter model" maar een *geloofwaardiger meting*, en dat is de belofte waar je hele product op rust.
3. **Op elke realistische verkoopprijs is het verschil verwaarloosbaar.** $3,70 extra per klant over 2,5 maand. Als dit je marge breekt, is je prijsstelling het probleem, niet je modelkeuze.

### Wat ik níet zou doen

- **Niet Sol overal (scenario 6).** Het meeste geld gaat naar de domste taken. Zie §6.
- **Niet vasthouden aan de 4.1-familie.** Geen fallback meer beschikbaar, en de deadline loopt.
- **Niet nu al alle prijzen in beton gieten.** Het landschap veranderde drie keer in vier maanden (5.4 in maart, 5.5, 5.6 in juli). Zie de aanbeveling over configureerbaarheid hieronder.

### Als kosten écht geen rol spelen

Zet `gpt-5.6-sol` op **alleen halte 3a en halte C**, en houd de rest op `gpt-5.4-mini`/`gpt-5.4-nano`. Dat is ~$1,95 per nulmeting en ~$21,50 per analyse over 10 weken. Je koopt daarmee de meest representatieve meting die via de API mogelijk is (Sol is exact wat ChatGPT Plus serveert) plus de best mogelijke contentkwaliteit — zonder een vlaggenschipmodel te betalen voor een ja/nee-classificatie.

### Bouwadvies, ongeacht de gekozen variant

1. **Maak het model per halte configureerbaar, niet per volume-/kwaliteitspaar.** `README.md` definieert nu `OPENAI_MODEL_VOLUME` en `OPENAI_MODEL_QUALITY`. Twee buckets zijn te grof gebleken: halte 3a en 3b zitten allebei in "volume" maar verdienen verschillende modellen. Gebruik een expliciete map per halte (`MODEL_BRAND_DNA`, `MODEL_PROMPTS`, `MODEL_SIMULATE`, `MODEL_MENTION`, `MODEL_GAP`, `MODEL_REPORT`, `MODEL_CONTENT`). Bij de volgende generatie — die komt — verschuif je één regel per halte.
2. **Sla het gebruikte model per call op.** `tracking_runs.model_used` bestaat al in §5. Zorg dat élke tabel met AI-output dit heeft. Zonder dat kun je een trendlijn over 10 weken niet interpreteren als je halverwege van model wisselt.
3. **Trendbreuk bij modelwissel is een reëel product-risico.** Je 10-weken-grafiek vergelijkt metingen over tijd. Wissel je halverwege van model, dan kan een sprong in de score een *modelwissel* zijn in plaats van een echte zichtbaarheidsverandering. Overweeg een markering in de grafiek bij een modelwissel, en wissel bij voorkeur niet midden in een lopend traject.
4. **Zet `reasoning_effort` expliciet laag** waar redeneren niets toevoegt (3b, en waarschijnlijk 3a). Reasoning-tokens worden als output afgerekend en zijn de grootste onzekerheid in bovenstaande berekeningen.
5. **Overweeg de Batch API voor de wekelijkse cron.** Halveert de tarieven; de wekelijkse tracking heeft geen realtime-eis. Dit compenseert een groot deel van de meerprijs van scenario 2. Niet bruikbaar voor de nulmeting (die kijkt de klant af).
6. **Prompt-caching op halte 3b.** Systeeminstructie en schema zijn identiek over alle 30 calls; ~90% korting op het herhaalde deel.
7. **Verifieer de deprecatie-datums zelf** (zie §0) en zet een agenda-herinnering ruim vóór 14 oktober 2026.

---

## 8. Wat dit betekent voor `abcplan.md`

Deze secties zijn achterhaald zodra de nieuwe keuze is vastgelegd:

| Locatie | Wat er moet gebeuren |
|---------|---------------------|
| `abcplan.md` §2 (volledig) | Modeltabel, gpt-5-nano-argument en fallback-regel herschrijven. |
| `abcplan.md` §6, §7, §8 | Modelnamen per halte bijwerken (`mini`/`nano` staan door de tekst heen genoemd). |
| `abcplan.md` §9 | Flow-overzicht, modelnamen per stap. |
| `abcplan.md` §10 | Volledige kostentabel herrekenen. |
| `abcplan.md` §11 | Sprint 1 noemt testen met `gpt-4.1-nano` én `gpt-4.1-mini`. |
| `abcplan.md` §12 punt 1 | Vastgelegde keuze "Engine". |
| `README.md` §4 + §6 | Techstack-tabel en de twee env-variabelen. |
| `README.md` §5 | Fase 3 noemt `gpt-4.1-nano` expliciet. |

De **structuur** van §2 (gedifferentieerd per halte, met een expliciete rechtvaardiging per keuze) is goed en kan blijven staan — alleen de ingevulde modellen en bedragen wijzigen.

---

## Bronnen

- [Retiring GPT-4o, GPT-4.1, GPT-4.1 mini, and OpenAI o4-mini in ChatGPT — OpenAI](https://openai.com/index/retiring-gpt-4o-and-older-models/)
- [Deprecations — OpenAI API](https://developers.openai.com/api/docs/deprecations)
- [OpenAI's Biggest Deprecation Wave Yet: 25+ Models Shut Down by October 2026 — TheRouter.ai](https://therouter.ai/news/openai-legacy-model-deprecation-wave-july-october-2026/)
- [AI Model Deprecations 2026: Every Shutdown Date That Matters — benchr](https://benchr.org/deprecations)
- [18 OpenAI models shut down on 23 July 2026 — ecorpit](https://ecorpit.com/openai-model-shutdowns-23-july-2026-migration-map/)
- [OpenAI Retiring GPT-4o, GPT-4.1, and o4-mini: The 2026 Transition Guide — Remio](https://www.remio.ai/post/openai-retiring-gpt-4o-gpt-4-1-and-o4-mini-the-2026-transition-guide)
- [GPT-5.6: Frontier intelligence that scales with your ambition — OpenAI](https://openai.com/index/gpt-5-6/)
- [OpenAI Releases GPT-5.6 (Sol, Terra, Luna) — MarkTechPost](https://www.marktechpost.com/2026/07/09/openai-releases-gpt-5-6-a-three-tier-model-family-with-programmatic-tool-calling/)
- [OpenAI Launches GPT-5.6 With Sol, Terra, And Luna Models — Dataconomy](https://dataconomy.com/2026/07/10/openai-launches-gpt-5-6-with-sol-terra-and-luna-models/)
- [GPT-5.6 Pricing (July 2026): Sol $5, Terra $2.50, Luna $1 per 1M — AI Pricing Guru](https://www.aipricing.guru/openai-pricing/)
- [OpenAI API Pricing (July 2026): GPT-5.6 Sol $5.00/M · GPT-5.6 Terra $2.50/M — TLDL](https://www.tldl.io/resources/openai-api-pricing)
- [OpenAI API Pricing (2026): GPT-5.5, GPT-5.4 and the Full Per-Token Table — Morph](https://www.morphllm.com/openai-api-pricing)
- [GPT-5.4 mini Model — OpenAI API](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
- [GPT-5.4 nano Model — OpenAI API](https://developers.openai.com/api/docs/models/gpt-5.4-nano)
- [GPT-5.4 mini vs GPT-5.6 Luna: Benchmarks, Pricing & Which Is Better in 2026 — LLM Stats](https://llm-stats.com/models/compare/gpt-5.4-mini-vs-gpt-5.6-luna)
- [GPT-5.6 Luna: Complete Specifications, Pricing, API Access & Use Cases — Gate.AI](https://gate.ai/blog/gpt-5-6-luna-openai-specs-pricing-api-use-cases)
- [Web search — OpenAI API](https://developers.openai.com/api/docs/guides/tools-web-search)
- [Heads up: Web Search Tool Billing Can Be Higher Than You Expect — OpenAI Developer Community](https://community.openai.com/t/heads-up-web-search-tool-billing-can-be-higher-than-you-expect-here-s-why/1236954)
- [ChatGPT Plans in 2026: Which Model You Get on Each Tier — FindSkill.ai](https://findskill.ai/blog/chatgpt-plans-which-model-2026/)
- [GPT-5.4 — Wikipedia](https://en.wikipedia.org/wiki/GPT-5.4)
- [GPT-5.6 Writing Test: Sol vs Terra vs Luna (blinde beoordeling, 24 teksten) — Noren](https://usenoren.ai/blog/gpt-5-6-writing-test)
- [GPT-5.6 Sol vs Terra vs Luna: Which Tier Should You Actually Use? — Vellum](https://www.vellum.ai/blog/gpt-5-6-benchmarks-explained)
- [GPT-5.6 Sol, Terra, and Luna: OpenAI's Next-Gen Model Family — DataCamp](https://www.datacamp.com/blog/gpt-5-6-sol-luna-terra)
- [The new GPT-5.6 family: Luna, Terra, Sol — Simon Willison](https://simonwillison.net/2026/Jul/9/gpt-5-6/)

---

*Vervolg: bij akkoord op een scenario worden `abcplan.md` §2/§6–§12 en `README.md` §4–§6 bijgewerkt conform §8.*
