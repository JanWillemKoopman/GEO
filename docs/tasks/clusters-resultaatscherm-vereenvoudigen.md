# Het clusterresultaat overzichtelijker maken

**Opgesteld:** 16 september 2026. **Status: onderzoek en voorstellenlijst, geen bouwopdracht.**
Aanleiding: de eigenaar ervaart het scherm van een cluster, ná het aanmaken en het binnenkomen van
de meting (`/analyses/[id]`), als onoverzichtelijk. Te veel ruis op de tabbladen, meerdere
tabbladen, soms heel lang.

---

## Eerst de aanname corrigeren

De opdracht vroeg om te onderzoeken hoe Nova dit doet, op basis van hun JSON en HTML. Dat lukt maar
gedeeltelijk, en dat moet eerst gezegd worden voordat er iets voorgesteld wordt.

`docs/nova-vs-orbit-engine-proces.md` §0.3 heeft dit al vastgelegd: over 2.440 teksten uit beide
Nova-catalogi staan **nul** treffers op citation, chatgpt, perplexity, llm of generative engine.
Nova meet Google Search Console, geen AI-antwoorden. Hun eenheid is de **pagina** (gepland,
geschreven, geplaatst, gemeten in kliks en positie), niet het **cluster** (een onderwerp met dertig
koopvragen, gemeten op hoe vaak een AI-assistent het merk noemt). Nova heeft dus geen scherm dat
hetzelfde laat zien als `/analyses/[id]`, en er is geen json-sleutel om één-op-één over te nemen.

Wat wel overdraagt: hún manier van informatie ordenen op het scherm dat het dichtst in de buurt komt
(hun overzicht/analyticsscherm, zie `docs/nova-vs-orbit-engine-proces.md` §2.13) en op hun
strategiescherm. Dat scherm houdt zich aan drie regels die op dit clusterscherm allemaal wel eens
losgelaten worden: één cijfer per vraag, uitleg pas op klikken, en nooit twee weergaven van
dezelfde data naast elkaar. Daar gaat de rest van dit document over.

---

## Wat er al goed staat, en niet opnieuw moet

Op 26 augustus 2026 is dit scherm al eens herzien: van vijf gelijkwaardige tabbladen naar vier
hoofdstukken in vaste leesvolgorde (Stand, Waar je wint en mist, Wat je moet doen, Opgeleverd), plus
twee aparte bestemmingen (Bibliotheek, Instellingen). Die stap was terecht en moet blijven staan:
een cluster is een verhaal met een volgorde, geen los te kiezen menu. Zie de toelichting bovenaan
`app/(app)/analyses/[id]/page.tsx`.

Het probleem zit dus niet meer in *hoeveel tabbladen er zijn*. Het zit **in** de tabbladen: te veel
kaarten onder elkaar die (bijna) hetzelfde zeggen, en uitleg die altijd zichtbaar is in plaats van
pas op verzoek.

---

## Waar de ruis concreet zit

**1. Hoofdstuk "Waar je wint en mist" stapelt vijf blokken die alle drie over hetzelfde gaan.**
(`app/(app)/analyses/[id]/_chapters/bewijs.tsx`) Onder elkaar: een tabel met alle merken op een rij
(`BrandRankingsTable`), een tweede kaart met vermoedelijk dezelfde ranglijst als balkjes
(`CompetitorCard`), een derde kaart met genoemde-maar-geen-concurrent-merken (`AlsoMentionedCard`),
de gatenlijst, en daaronder de volledige lijst met elk gemeten antwoord (`AnswersView`, 311 regels).
Drie manieren om naar "wie wordt hier genoemd" te kijken, ná elkaar in plaats van in één blik.

**2. Hoofdstuk "Wat je moet doen" stapelt zes onafhankelijke widgets.** (`_chapters/werk.tsx`) De
blokkade-poort, de werklijst, feitenvragen, de aanbevelingenlijst (met per aanbeveling: een chip,
een potentiescore, de doelvragen eronder, een knop), en het off-site paneel. Alles staat altijd
volledig open. Bij een cluster met tien aanbevelingen is dit een lange scrollpagina met tien keer
dezelfde herhaalde structuur zichtbaar tegelijk.

**3. Het hoofdcijfer zelf draagt te veel tegelijk.** (`score-panel.tsx`, `ScoreCard`) In één kaart:
het hoofdgetal, de foutmarge met eigen uitleg-icoon, de meetdatum en het model, de verandering
tegenover vorige periode, een merkloze-vermeldingenregel, een zichtbaarheidsprofielregel, een lopende
zin die het cijfer herhaalt in woorden, én een tweede (ongewogen) cijfer met zijn eigen uitleg-icoon.
Negen elementen om antwoord te geven op één vraag: hoe sta ik ervoor.

**4. Uitleg staat aan, niet uit.** Bijna elk `mono-label`-kopje heeft een `InfoHint` ernaast, en
die hints zijn vaak twee tot drie zinnen lang. Dat is precies waar Nova het andersom doet: zij
laten het cijfer zelf zien en verstoppen de uitleg achter een klein informatie-icoon dat je alleen
opent als je hem nodig hebt. Hier staat het al zo (een icoon, geen open tekst), dus de losse hints
zijn geen fout, maar het aantal per scherm is hoog: op één hoofdstuk soms vier of vijf.

---

## Wat dit voorstelt, drie richtingen

**A. Eén weergave per vraag, niet twee.** `BrandRankingsTable` en `CompetitorCard` beantwoorden
dezelfde vraag ("hoe sta ik tegenover concurrenten") met een tabel én een kaart. Kies er één, en
gebruik de andere vorm alleen als die iets toont wat de eerste niet kan (bijvoorbeeld: de tabel voor
de cijfers, een klein balkje er *in* diezelfde tabel voor het aandeel, in plaats van een aparte kaart
eronder).

**B. Dichtklappen wat niet meteen om aandacht vraagt.** De volledige antwoordenlijst in
`AnswersView` en de aanbevelingenlijst in `WerkChapter` hoeven niet allemaal open te staan. Toon een
kort overzicht (aantal, belangrijkste patroon) met een "toon alles"-uitklapper, in plaats van de
hele lijst standaard te renderen. Dat lost meteen "soms heel lang" op zonder dat er data verdwijnt.

**C. Het hoofdcijfer terug naar één blik.** Laat `ScoreCard` het cijfer, de marge en de verandering
tonen, en verplaats de rest (de merkloze-vermeldingenregel, het zichtbaarheidsprofiel, het tweede
ongewogen cijfer) naar een "meer details"-uitklapper onder dezelfde kaart, of naar het hoofdstuk
waar ze inhoudelijk al bij horen (het profiel bijvoorbeeld bij Bewijs, niet bij Stand).

---

## Wat dit nadrukkelijk niet is

Geen voorstel om terug te gaan naar minder hoofdstukken: de vier-stappen-indeling uit augustus is
de juiste vorm en lost een ander probleem op (werk dat over tabbladen heen liep). Dit gaat over de
dichtheid **binnen** elk hoofdstuk, niet over het aantal hoofdstukken.

Ook geen concreet ontwerp: dit document zegt wat er te dicht staat en in welke richting het dunner
kan, niet hoe elke kaart er precies uit moet zien. Dat is een eigen stap, met UI-ontwerp erbij,
zodra er een akkoord is over de richting.

---

## Open vraag voor de eigenaar

Welke van de drie richtingen (A, B, C) hierboven eerst? B (dichtklappen van lange lijsten) is het
goedkoopst en raakt geen enkele berekening. A en C raken de opmaak van kaarten die ook elders
(mogelijk) hergebruikt worden en verdienen een aparte controle voordat er gebouwd wordt.
