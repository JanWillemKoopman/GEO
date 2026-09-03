# De copywriterronde: wat de twaalf pagina's opleverden, en twee keuzes

**Status:** twee keuzes liggen bij de eigenaar, er is nog niets gebouwd. Opgesteld 3 september 2026.

Op 3 september is `content-reviews/` (twaalf pagina's uit de benchmarkronde, blanco aangeboden aan
een copywriter) beoordeeld door een AI in de rol van copywriter. De twaalf beoordelingen staan in
`content-reviews/feedback/`, de negen terugkerende patronen in
`content-reviews/feedback/patronen.md`. Dit document bevat alleen wat daaruit volgt voor de app.

## 1. De eerste keuze: wat doen we met deze beoordelingen

Het Kwaliteitslab verzamelt menselijke oordelen omdat een AI-evaluator niet de enige definitie van
kwaliteit mag worden. De ijking van het raamwerk wacht op twintig menselijk beoordeelde pagina's
(`IJKING_MINIMUM`, §R5 van `contentkwaliteit-framework.md`). Deze twaalf zijn niet menselijk.

Ze staan daarom bewust NIET in `content_quality_reviews`. Er zijn drie mogelijkheden:

| | Wat het betekent | Risico |
|---|---|---|
| **A. Los laten staan** (voorstel) | De beoordelingen blijven markdown in `content-reviews/feedback/`, buiten de database. De ijking wacht op echte mensen. | Geen. De analyse is bruikbaar zonder dat er een cijfer van in de app komt. |
| **B. Apart gelabeld opslaan** | Wel in `content_quality_reviews`, met `reviewer_name` als AI en een nieuwe kolom of `benchmark_set` die het scheidt. Nooit meetellen in `IJKING_MINIMUM`. | Iemand vergeet de scheiding, of een latere query telt ze mee. Kost een migratie. |
| **C. Gewoon meetellen** | | De ijking meet dan of het model het eens is met zichzelf. Af te raden. |

**Voorstel: A.** De waarde van deze ronde zit in de patronen en de tellingen, niet in de cijfers.
De cijfers zelf zijn precies het deel waarvoor een mens nodig is.

Wat ik er wel bij wil leggen, en dat is de reden dat de vraag niet triviaal is:

### De vakmanschapsbeoordelaar scoort deze twaalf pagina's veel hoger dan ik

Gemeten in `content_quality_runs` (de herkeuring van 3 september, twaalf pagina's), naast mijn eigen
cijfers omgerekend naar dezelfde schaal van 0 tot 100:

| Dimensie | De vakmanschapsbeoordelaar | Deze beoordelingsronde | Verschil |
|---|---|---|---|
| specificiteit (gaat het over dit bedrijf) | 71,9 | 33,3 | **38,6** |
| toon (klinkt het als dit bedrijf) | 57,3 | 30,0 | **27,3** |
| overtuiging (zet het aan tot contact) | 56,4 | 36,7 | **19,8** |

De laagste specificiteitsscore die de beoordelaar gaf, is 59. Op de pagina waar het bedrijf
nul keer "wij" zegt, geen enkele therapeut bij naam noemt, en het onderscheidende antwoord van de
klant niet gebruikt is, geeft hij 69.

Dat is geen bewijs dat ik gelijk heb en hij niet. Het is wel het bewijs dat de dimensie waar dit
hele raamwerk om gebouwd is (specificiteit, in de code beschreven als "generiek AI-gehalte met een
andere naam") op dit moment niet meet wat ze moet meten, en dat er geen enkele manier is om te
weten wie van ons tweeën dichter bij de waarheid zit zonder een mens. **Dat maakt de ijking geen
afronding maar de blokkerende stap.**

Ondertussen zit alle blokkade ergens anders. Van de twaalf herkeuringen:

- score 61 tot 73, alle twaalf `block`;
- feitelijkheid 8 tot 47, en dat is wat de blokkade veroorzaakt;
- specificiteit, toon, diepgang en overtuiging halen overal een ruime voldoende.

Met andere woorden: de keuring blokkeert op herleidbaarheid, en laat op stem, durf en eigenheid
alles door. Precies de negen patronen uit `patronen.md` zou deze keuring goedkeuren.

## 2. De tweede keuze: welke verbeteringen bouwen we

Zes voorstellen, op volgorde van opbrengst gedeeld door risico. Elk voorstel heeft een
promptwijziging én een deterministisch vangnet, conform code-conventie 1. Alle zes zijn te
verifiëren tegen de twaalf bestaande pagina's, want die liggen er al: dat is de testverzameling.

### V1. Het bedrijf mag weer "wij" zeggen (grootste opbrengst)

**Wat er nu gebeurt.** Twee keer "wij" in 13.600 woorden, beide in een kop, tegenover 164 keer de
merknaam in de derde persoon. De oorzaak is de regel in `lib/pipeline/content.ts` en `REPAIR_SYSTEM`
regel 3: noem het bedrijf bij naam, niet "wij". Die regel is er met reden: een AI-assistent die
"wij" leest, weet niet welk merk hij moet citeren.

**Wat ik voorstel.** De regel begrenzen in plaats van schrappen. De merknaam is verplicht in de
zinnen die een AI-assistent oplicht: het openingsantwoord en de eerste zin van elke sectie. Dat is
precies de verzameling die `content-coverage.ts` al per sectie nagaat, dus het vangnet bestaat
half. In de rest van de tekst is de wij-vorm toegestaan en gewenst.

**Vangnet.** Een bevinding wanneer een pagina nul zinnen in de eerste persoon heeft én meer dan één
merknaamvermelding per honderd woorden. Beide getallen zijn te tellen, gratis, en beide staan
hierboven gemeten.

**Risico.** Middel. Dit raakt de GEO-kern en moet met een echte meting na afloop bevestigd worden:
als de merknaam in de citeerbare zinnen blijft staan, hoort de citeerbaarheid gelijk te blijven.
Niet bouwen zonder die nameting.

### V2. De aanspreekvorm wordt altijd gekozen (goedkoopst, hardste bewijs)

**Wat er nu gebeurt.** 95 keer "je" en 81 keer "u" over twaalf pagina's, bij twee klanten die
allebei allebei de vormen kregen. Op de contactpagina van Fysio Centrum Utrecht slaat het binnen
twee zinnen om. `describePronoun` in `lib/pipeline/tone-sliders.ts` lost dit al op, maar schrijft
alleen een promptregel als `profiles.pronoun_preference` gevuld is, en dat was hier niet zo.

**Wat ik voorstel.** Nooit meer leeg: is het veld niet gevuld, leid de vorm dan af uit de bestaande
paginatekst van de klant (tel "je" tegen "u" in `existing-page-fetch`) en anders uit
`tone_formality`. Leg vast welke bron gebruikt is, zodat het naderhand na te rekenen is.

**Vangnet.** Een blokkerende bevinding zodra één pagina zowel "je" of "jouw" als "u" of "uw" bevat.
Dat is een regel code en het vindt vandaag onmiddellijk één van de twaalf pagina's.

**Risico.** Laag. Dit is het goedkoopste voorstel van de zes en het repareert een fout die iedere
lezer ziet.

### V3. Het vangnet tegen werkproces-praat verbreden

**Wat er nu gebeurt.** `checkSourceTalk` in `content-gate.ts` heeft elf zoektermen en vindt geen
van de zes zinnen die op vijf verschillende pagina's zijn blijven staan, waaronder:

> "Controleer vóór publicatie (...) de actuele inschrijving van de behandelaar"
>
> "De locaties worden op deze pagina niet inhoudelijk van elkaar onderscheiden."
>
> "Dit beantwoordt het bezwaar: 'Ik hoor pas achteraf wat het kost.'"

**Wat ik voorstel.** De lijst uitbreiden met vier families: redactie-instructies ("vóór publicatie",
"deze pagina" in combinatie met een werkwoord over de tekst zelf), bezwaarsjablonen ("dit
beantwoordt het bezwaar", "bang dat"), verificatiestatus ("niet bevestigd", "is niet beschikbaar"
bij een gegeven over het bedrijf) en zelfrelativering ("deze bedrijfsgegevens vervangen").

**Vangnet.** Dit ís het vangnet. De test is meetbaar: de uitgebreide controle moet deze zes zinnen
vinden en niet aanslaan op de rest van de 13.600 woorden.

**Risico.** Laag, mits de test op de volledige twaalf pagina's draait om vals alarm uit te sluiten.

### V4. Wat de klant zelf zei, blijft staan zoals hij het zei

**Wat er nu gebeurt.** Op vier pagina's is een letterlijk klantantwoord geparafraseerd tot een
procedurezin, waarbij de motivering wegviel. Het duidelijkst:

> Klant: "Doorwerken over houtrot heen doen we niet, ook niet als de klant erom vraagt, want dan
> kunnen we onze garantie op het werk niet waarmaken."
>
> Pagina: "Wordt tijdens isolatiewerk schade gevonden, dan legt MJB Dakservice het werk stil, maakt
> foto's en meldt eerst de herstelkosten."

Het feit overleeft, de reden sneuvelt, en de reden was het enige dat geen concurrent kan kopiëren.

**Wat ik voorstel.** Klantantwoorden die langer zijn dan ongeveer vijftien woorden en een
motivering bevatten ("want", "omdat", "daarom"), apart aanbieden in de prompt als CITEERBAAR, met
de opdracht er minstens één vrijwel letterlijk over te nemen.

**Vangnet.** Meet de woordoverlap tussen de pagina en de langste klantantwoorden. Nul overlap bij
een klant die zulke antwoorden gaf, is een bevinding. Ruw, maar het onderscheidt "gebruikt" van
"weggeparafraseerd", en dat is precies het verschil dat we willen zien.

**Risico.** Middel. Letterlijk overnemen botst met de spreektaal van een ondernemer, dus dit vraagt
oordeel over waar een citaat wél en niet past. Hier zit de meeste opbrengst en het meeste ontwerp.

### V5. Een instructie van de klant is een verbod, geen feit

**Wat er nu gebeurt.** Vier FCU-pagina's kregen mee: "Zet er geen adres bij (...) Verwijs voor de
adressen naar de contactpagina." Twee van die vier zetten er toch een adres bij. Zulke antwoorden
komen nu binnen als gewone feiten, terwijl het instructies zijn.

**Wat ik voorstel.** Antwoorden die een instructie zijn, herkennen en in hetzelfde blok zetten als
`taboo_phrases`: een gesloten verbodslijst bovenaan de prompt, niet een feit tussen de feiten.

**Vangnet.** Per verbod een controle waar dat kan. Voor het adresgeval: bevat de pagina een
straatnaam met huisnummer terwijl de klant om geen adres vroeg, dan is dat een blokkerende
bevinding. Dat vindt vandaag twee van de twaalf pagina's.

**Risico.** Laag voor het adresgeval, hoger voor het algemene geval: instructies automatisch
herkennen is lastig. Ik zou beginnen met de vragen waarvan we wéten dat ze instructies opleveren,
en niet met een classificatie.

### V6. De pagina adviseert niet, hij helpt kiezen

**Wat er nu gebeurt.** 72 zinnen die beginnen met "Vraag", "Controleer", "Laat", "Bespreek" of
"Leg", waarvan 23 op één pagina. Op drie pagina's slaat dat door tot tekst die tegen de klant werkt:
een checklist om dakdekkers te vergelijken, en twee keer de oproep de registratie van de eigen
therapeut na te trekken.

**Wat ik voorstel.** Twee dingen. In de prompt: op de site van de klant vergelijk je niet met de
markt en zaai je geen twijfel over de eigen deskundigheid. In de code: een bovengrens op het aantal
gebiedende zinnen per honderd woorden.

**Risico.** Middel. Een deel van die zinnen is terechte voorzichtigheid, zeker in de zorg. De grens
moet dus ruim, en de blokkade hoort bij het doorslaan te liggen en niet bij de eerste.

## 3. Wat ik zou doen

V2 en V3 eerst: samen ongeveer een dag werk, allebei met een test die vandaag aanslaat op deze
twaalf pagina's, en allebei zonder risico voor de GEO-prestaties. Daarna V1, met een nameting op
citeerbaarheid. V4 en V5 daarna. V6 het laatst, want die vraagt het meeste oordeel over waar de
grens ligt.

En ongeacht wat er gebouwd wordt: **de twintig menselijk beoordeelde pagina's zijn nu de
blokkerende stap.** De cijfers hierboven laten zien dat de vakmanschapsbeoordelaar en deze
beoordelingsronde bijna veertig punten uiteenlopen op de dimensie waar alles om draait, en zonder
mens is er geen manier om te weten wie er dichter bij zit.
