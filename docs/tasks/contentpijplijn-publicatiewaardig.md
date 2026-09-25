# Van vindbare tekst naar publicatiewaardige tekst: plan voor de contentpijplijn

**Opgesteld:** 25 september 2026, op verzoek van de eigenaar, naar aanleiding van externe feedback op
de teksten voor Hans Verstraaten Hoveniers, Wesley Keeris Installatietechniek en Autorijschool
Pompert.

**Status: in aanbouw, fase 1.** Per werkpakket staat de stand onder "Stand van de bouw" aan het
eind van §13. De eigenaar heeft op
25 september 2026 de keuzes gemaakt die in §2 staan. Er gaat geen losse proef of modelvergelijking
aan de bouw vooraf; elke fase wordt wel, zoals conventie 10 vraagt, na de bouw nagerekend op echte
data (§14).

**Leeswijzer.** §0 is het plan op één pagina. §1 is de diagnose met het bewijs uit de echte teksten.
§2 tot en met §12 beschrijven de nieuwe keten, onderdeel voor onderdeel. §13 is het bouwplan in
werkpakketten, met per pakket de bestanden, de migratie, de tests en wanneer het af is. §14 zegt
wanneer een pagina publicatiewaardig is.

**Waar het op rust.** De code van de hele keten (`lib/pipeline/content.ts`, `content-contract.ts`,
`item-dossier.ts`, `writer-brief.ts`, `content-panel.ts`, `factcard.ts`, `fact-merge.ts`,
`adviestoon.ts`, `similarity.ts`, `contract-format.ts`, `brand-fields.ts`, `lib/jobs/handlers.ts`,
`lib/jobs/content-jobs.ts`, `lib/openai/models.ts` en `sampling.ts`), de productiedatabase van
25 september 2026 (de 10 huidige teksten van de hovenier en de 11 van de installateur, hun
schrijfopdrachten, contracten, feitenkaarten, merkdossiers en `ai_calls`), en de proefset van de
kwaliteitsdoorlichting (`docs/tasks/kwaliteitsdoorlichting/`). De teksten die als bijlage bij de
opdracht hoorden, zijn niet aangekomen; de huidige versies uit `content_pieces` zijn gebruikt. Van de
genoemde plaatspagina's staan daar Best en Nuenen (hovenier) en Geldrop (installateur); Helmond en
Veldhoven komen voor in de hoofdpagina en de zwemvijverpagina. Elk citaat hieronder staat letterlijk
in een opgeslagen tekst.

---

## 0. Het plan op één pagina

**Het probleem.** De teksten zijn feitelijk betrouwbaar, maar te lang, te voorzichtig, schrijven als
een consumentengids, klinken bij elke klant hetzelfde en lijken per plaats op elkaar. Na tientallen
reparaties sinds 3 september gaf de blinde lezer een 4,9 op 10, en de ondernemer zou 4 van de 21
teksten zonder aanpassing publiceren.

**De oorzaak** zit niet in het schrijven maar in de opdracht aan de schrijver (§1):

1. De inhoudsopgave is een verplichte checklist uit onderzoek dat niets van het bedrijf weet.
2. Voor een ontbrekend feit krijgt de schrijver tegenstrijdige opdrachten, en de enige uitweg is het
   gat opschrijven ("is niet vastgelegd").
3. Onzekerheid heeft geen andere uitgang dan de tekst.
4. Bronconflicten worden niet herkend.
5. De keuze wat er op de pagina komt, maakt het goedkoopste model; de dure schrijver voert uit.
6. De schrijfstijl in het merkdossier is één zin, en de voorbeeldzinnen werken tegen die zin in.
7. Elke pagina wordt los geschreven.

**De oplossing** in zes onderdelen:

| # | Onderdeel | Wat het oplost | Paragraaf |
|---|---|---|---|
| 1 | **Paginastrategie** op GPT-6 Sol met extra denktijd: kiest wat er op de pagina komt en vooral wat niet, geeft elke onzekerheid een bestemming en zet een lengtebudget | checklist, lengte, consumentengids, indekken | §5, §7 |
| 2 | **Feitenregister met conflictpoort**: tegenstrijdige feiten gaan naar de adviseur, nooit naar de lezer | "spreekt elkaar tegen", omgedraaide beloftes | §8 |
| 3 | **Schrijfstijl in het merkdossier**, volledig ingevuld en goedgekeurd door de adviseur, gebruikt door schrijver, redacteur en een eigen beoordelaar | dezelfde AI-stem bij elke klant | §9 |
| 4 | **Eindredactie** op GPT-6 Sol met extra denktijd: schrapt, haalt onnodige relativering en herhaling weg, zet de tekst op de merkstem | relativering, herhaling, lengte | §5 |
| 5 | **Eigenaarstoets en merkstemtoets** op GPT-6 Sol: vergelijkend oordeel of de ondernemer dit zou publiceren | de keuring beloont nu het verkeerde | §12 |
| 6 | **Portfolio per plan**: elke pagina een eigen hoek; grote steden een eigen pagina, kleine plaatsen zo nodig één werkgebiedpagina | plaatspagina's als template | §10 |

**Kosten:** een artikel ongeveer $0,37, een landingspagina ongeveer $0,30, in het ongunstigste geval
ongeveer $0,50. Nu is dat ongeveer $0,16 tot $0,18. Een plan van twaalf artikelen komt op ongeveer
$4,50 (§4).

**Bouwen in drie fases** (§13): fase 1 haalt het indekken, de checklist, de consumentengids en de
conflicten weg; fase 2 brengt de merkstem en de nieuwe keuring; fase 3 de portfolio over pagina's
heen en het opruimen van wat vervalt.

---

## 1. Diagnose van de huidige pipeline

### 1.1 De keten zoals hij nu loopt

Wat er per pagina gebeurt, in volgorde, met wat elke stap krijgt en oplevert. Kosten gemeten op
`ai_calls` voor de hovenier en de installateur vanaf 24 september 2026.

| Stap | Code | Model en denktijd | Krijgt | Levert | Kosten per keer |
|---|---|---|---|---|---|
| Aanbeveling | `report.ts` | luna | meting, gemiste vragen | titel (een opdracht als "Maak een pagina voor complete tuinaanleg in Best"), type, lezer, doelvragen | gedeeld per analyse |
| Feiten uit de site | `fact-atomise.ts` | luna, geen | 1.500 tekens per sitepagina | letterlijke feitzinnen | $0,0004 |
| Onderzoek per pagina | `item-dossier.ts` | luna, low, met web | titel, doelvraag, branche, winnend AI-antwoord. **Bewust niets over het bedrijf** | deelvragen, vervolgvragen, twijfels, uitleg met bron | $0,012 |
| Contract | `content-contract.ts` | luna, low | dossier, hele feitenkaart (44 feiten bij de hovenier, 84 bij de installateur), bestaande pagina | secties met vraag, feiten, lengte, belang, FAQ-vragen | $0,003 |
| Claim-audit en vragen | `briefing.ts` | luna, geen | contract, feitenkaart | welke beweringen gedekt zijn, vragen aan de klant | $0,004 per batch |
| Schrijfopdracht | `writer-brief.ts` | luna, low | kaart, contract, doelvragen, waardeproposities, bezwaren | lezer, hoofdvraag, kernantwoord, kernfeiten, keuzeredenen, moet erin, niet doen | $0,001 |
| Schrijven | `content.ts` | **sol, medium** | systeemprompt van elf regels plus achttien blokken, ongeveer 14.000 tokens | tekst, FAQ, meta, JSON-LD, claims, bewijspunten | $0,071 |
| Vier beoordelaars | `content-panel.ts` | luna, medium | tekst plus kaart of contract | scores, ongedekte zinnen, onbeantwoorde vragen | samen $0,006 |
| Controles in code | `content-gate.ts` en twaalf modules | geen AI | tekst | ongeveer 25 tellingen, 6 soorten blokkade | gratis |
| Reparatie, tot 3 keer | `content.ts`, `quality-repair.ts` | sol, medium | bevindingen per sectie, kaart, contract | vervangen secties | $0,057 per ronde |

Per geschreven versie kostte dat samen gemiddeld ongeveer $0,18 ($4,96 voor 28 schrijfaanroepen).

Wat dit schema laat zien, is waar het gewicht ligt. **De beslissingen die de pagina bepalen**
(welke secties, welke feiten, wat de hoofdboodschap is) vallen in twee stappen van samen een halve
cent, op het goedkoopste model. **De dure stap voert uit.** Een copywriter werkt andersom: het
meeste denkwerk zit in wat hij weglaat.

### 1.2 Tien oorzaken, gekoppeld aan de negen gemelde problemen

#### O1. Het contract is een verplichte checklist, opgebouwd uit onderzoek zonder bedrijf
*Veroorzaakt probleem 1 (te veel informatie), 4 (consumentenadviseur) en 9 (lengte).*

Vijf schakels versterken elkaar, en geen enkele schakel remt:

- **Het onderzoek weet niets van het bedrijf.** `item-dossier.ts` regel (a): "Alles wat je oplevert
  gaat over het ONDERWERP in het algemeen, nooit over een specifiek bedrijf." De deelvragen die
  eruit komen zijn dus de vragen van iemand die aanbieders vergelijkt: hoe lees ik een offerte, wat
  is meerwerk, hoe vergelijk ik prijzen.
- **Het contract moet alles opnemen.** `content-contract.ts` harde regel (a): "De pagina moet
  COMPLEET aanvoelen: een lezer mag na afloop geen voor de hand liggende vraag meer overhouden.
  Neem daarom ook de vervolgvragen en de twijfels uit het dossier op." Regel (d): "Laat een sectie
  dus NIET weg omdat het bewijs ontbreekt."
- **De schrijver mag niets weglaten.** `formatContract()`: "Alles wat hier staat MOET erop komen, in
  deze volgorde." Systeemregel 10: "Je mag er niets uit weglaten."
- **De keuring telt het na.** De dekkingspoort eist 85 procent van de secties, elke sectie moet de
  helft van zijn richtlengte halen, en de citeerbaarheidsbeoordelaar krijgt als "belangrijkste deel
  van je werk" de vragen die een lezer na de pagina nog overhoudt.
- **Niets meet te veel.** Er is een ondergrens per sectie en geen bovengrens die werkt. De doellengte
  per type (landing 400 tot 700) staat in de prompt, maar het contract telt tien secties op.

Gemeten op de huidige teksten: de installateur gemiddeld 980 woorden over 10,3 secties, de hovenier
881 woorden over 9,5 secties. De kostenpagina van de installateur heeft twaalf secties, waarvan het
contract er acht markeerde als "geen uitspraak over dit bedrijf nodig": "Vergelijk offertes op
dezelfde onderdelen", "Extra werk kan de afgesproken prijs verhogen", "Bij een gedeelde afvoer moet
ook het gebouwbeheer betrokken zijn". Dat is een consumentengids, en hij staat er omdat het contract
het zo voorschreef.

Bij de hovenier (pagina Best) is het patroon hetzelfde: "Een bruikbare offerte benoemt werk,
hoeveelheden en kosten", "Vergelijk dezelfde werkzaamheden en afwerking", met zinnen als "Een lager
bedrag voor ander werk vertelt je weinig over de kosten van jouw tuin."

De externe copywriter schreef op 3 september al "schrap 25 tot 40 procent van de informatie en maak
de rest sterker" (V10 in `contentkwaliteit-copywriterronde.md`). Wat er toen gebouwd is (een
verhaalboog en stellende koppen) veranderde de vorm, niet de hoeveelheid, omdat de vijf schakels
hierboven bleven staan.

#### O2. Tegenstrijdige opdrachten over een ontbrekend feit
*Veroorzaakt probleem 2 (indekken) en 5 (zichzelf klein maken).*

Neem een sectie waarvoor geen feit bestaat, bijvoorbeeld wat er in de installatieprijs zit. De
schrijver krijgt dan tegelijk:

| Van | De opdracht |
|---|---|
| het contract | deze sectie MOET erop, ongeveer 80 woorden, "geslaagd als" er iets over de inhoud van de prijs staat |
| de feitenkaart | "Staat iets niet op de kaart, dan schrijf je er niet over" |
| het paginaplan | "GEEN BRON: laat deze passage weg" |
| de schrijfopdracht | "Maak expliciet dat de beschikbare informatie niet benoemt wat precies standaard in de installatieprijs zit" (letterlijk, installateur, kostenpagina) |
| de feitelijkheidsbeoordelaar | noem "elke ALGEMENE uitleg die als belofte van dit bedrijf gelezen kan worden", en "bij twijfel noem je de zin" |
| de reparatie | "kun je hem niet oplossen met wat er op de kaart staat, laat de passage dan weg of schrijf hem algemener"; bij ontbrekend bewijs "nuanceer hem of laat hem weg" |

Weglaten kan niet (contract en dekkingspoort), een bewering doen kan niet (kaart en keuring). Wat
overblijft: over het onderwerp schrijven en erbij zeggen dat het niet vaststaat. Daarom staat er:

- "De beschikbare prijsinformatie benoemt niet welke werkzaamheden standaard in de installatieprijs
  zitten of wanneer extra kosten gelden." (installateur, kosten)
- "Welke controles standaard tijdens een ketelbezoek plaatsvinden en hoe het benodigde vermogen
  precies wordt berekend, is niet vastgelegd." (installateur, woningbezoek)
- "Welke van deze punten tijdens een ketelbezoek worden bekeken, staat niet als vaste werkwijze
  vast." (idem)
- "Dit is een lijst met nuttige gegevens, geen toezegging over documenten die wij standaard
  verstrekken." (idem)
- "Deze pagina geeft geen bevestigde lokale eis voor Best." (hovenier, FAQ bij Best)

Het tweede mechanisme is de keuring op beloftes. Elke algemene zin die een belofte zou kunnen zijn,
wordt gemeld; de goedkoopste reparatie is er een voorbehoud achter zetten. Zo ontstaat de
relativering van sterke bewijsstukken:

- "Wij hebben meer dan 35 jaar ervaring, maar dat zegt op zichzelf niets over het aantal zwemvijvers
  dat we hebben aangelegd." (hovenier, zwemvijverspecialist of hovenier)
- "Onze CO-certificering volgens de Gasketelwet is hierboven genoemd; die zegt op zichzelf niets over
  welke afzonderlijke werkzaamheden in een installatieprijs zijn opgenomen." (installateur, kosten)
- "Wesley Keeris Installatietechniek geeft een levertijd van 2 tot 4 weken en een installatieduur van
  1 dag op; dat is een eerste beeld van de planning, geen garantie voor iedere woning." (Geldrop)

Het derde mechanisme zit al in het merkprofiel. De waardeproposities die het onderzoek opstelde,
dragen hun eigen voorbehoud: "Meer dan 35 jaar ervaring, volgens de website", "De klant wordt naar
eigen zeggen van A tot Z ontzorgd", "de website zegt te streven naar verzending binnen 4 uur". Die
gaan letterlijk de schrijfprompt in als "waarom klanten kiezen". Een schrijver die "volgens de
website" leest, neemt die afstand over.

Een ruwe telling op de huidige teksten (een vaste lijst indekformuleringen zoals "niet automatisch",
"geen garantie", "zegt op zichzelf niets", "beschikbare informatie", "hangt af van"): 63 bij de
installateur en 61 bij de hovenier, ongeveer zes per pagina. Daarnaast 71 en 50 adviesformuleringen
("vergelijk", "controleer", "laat vooraf bevestigen", "bespreek").

De lijsten in `adviestoon.ts` (`SLAP`, `VOORBEHOUD`) en de families in `checkSourceTalk()` vangen de
formuleringen die eerder zijn gezien. "Valt niet af te leiden", "zegt op zichzelf niets" en "staat
niet als vaste werkwijze vast" staan er niet in. Een nieuwe lijst vangt de volgende ronde weer niet,
zolang de opdracht die het gat afdwingt blijft staan.

#### O3. Er is geen plek voor "dit lossen wij intern op" of "dit is niet belangrijk"
*Veroorzaakt probleem 2 (type A belandt in type B).*

Een feit heeft op de kaart drie standen: bruikbaar, verboden, achtergrond. Een onderwerp in het
contract heeft twee: merkgebonden of algemeen. Er bestaat geen stand die zegt:

- **A. Onbekend, intern oplossen.** Wij weten het niet, de klant wel. Dit hoort een vraag aan de
  ondernemer te worden, en tot die beantwoord is zwijgt de tekst erover.
- **B. Uitleggen aan de lezer.** De lezer beslist verkeerd als hij het niet weet, en het bedrijf wil
  dat zeggen. Voorbeeld: een prijs is een bandbreedte.
- **C. Niet relevant genoeg.** Weglaten, zonder vraag en zonder zin.

De vragenronde (`briefing.ts`) doet A al gedeeltelijk: onbewezen beweringen worden vragen aan de
klant. Maar een overgeslagen of niet gestelde vraag komt daarna als "GEEN BRON" terug in de
schrijfprompt, en het contract eist de sectie nog steeds. Bij de hovenier kende de ondernemer de
garantie (één jaar op aanplant, vijf jaar op bestrating volgens het waarheidsdossier), maar de vraag
werd niet gesteld; de tekst werd "Bespreek garantieafspraken voordat de aanleg begint" (punt 49 van
de doorlichting).

#### O4. Bronconflicten worden niet herkend en niet tegengehouden
*Veroorzaakt probleem 3.*

`planFactMerge()` in `fact-merge.ts` herkent tegenspraak alleen als twee feiten dezelfde `factKey`
hebben. Die sleutel wordt uit de tekst afgeleid, dus twee zinnen over dezelfde prijs in een andere
formulering krijgen verschillende sleutels en staan allebei op de kaart. `describeContradictions()`
filtert daarnaast bewust de sitewijzigingen eruit en toont alleen wat de klant zelf anders
beantwoordde, op het briefingscherm, zonder iets tegen te houden.

Gevolg bij de rijschool (herhaling van de doorlichting): "De beschikbare informatie over de
intakeprijs spreekt elkaar tegen, dus hier noemen we geen actueel bedrag" en "in de aangeleverde
prijsinformatie staan twee verschillende bedragen voor de intake". Nagerekend in de opgeslagen
sitetekst (`kwaliteitsdoorlichting/sites/pompert.txt`) is dit geen echte tegenspraak: de prijslijst
noemt een intake op kantoor van € 50 en een intake in de auto van € 80. Bij het uitlezen van de site
viel dat onderscheid weg, en op de kaart stonden twee intakeprijzen zonder uitleg. Een andere tekst
van dezelfde ronde koos er zelf één ("De intake kost € 80"). Dat maakt het punt scherper: de keten
kan een echt conflict niet onderscheiden van verloren context, en heeft voor geen van beide een
route buiten de tekst om. De schrijver deed wat hij kon met twee F-nummers die elkaar leken tegen te
spreken; de fout zit in dat hij ze allebei kreeg, zonder dat iemand ernaar keek.

Bij de hovenier is een zachtere variant te zien: de site belooft "binnen 4 uur te voorzien van een
scherpe offerte", het onderzoek maakte daar "streeft naar verzending binnen 4 uur" van, en een
tekst draaide het om tot "Dat is geen termijn voor het ontwerp of de offerte" (punt 46).

#### O5. De redactionele beslissing is goedkoop, vrijblijvend en komt na het contract
*Veroorzaakt probleem 1 en 5.*

De schrijfopdracht (`writer-brief.ts`, sinds 4 september) was het juiste idee: een stap die kiest.
Drie dingen houden hem klein:

- **Hij komt ná het contract** en krijgt het als "de structuur, jij levert de richting". Hij kan
  geen sectie schrappen. Op de kostenpagina van de installateur koos hij vier kernfeiten, en het
  contract hield twaalf secties.
- **Hij draait op het goedkoopste model** met weinig denktijd ($0,0011 per pagina). Op dat model
  neemt hij de toon van de feitenkaart over, inclusief de afstand: zie het kernantwoord van de
  kostenpagina, "De beschikbare informatie specificeert niet welke onderdelen van het werk standaard
  in die prijs zitten".
- **Hij is één blok van achttien** in de schrijfprompt. Wat de schrijver ook krijgt: "DIT IS HET
  CONTRACT VOOR DEZE PAGINA. Alles wat hier staat MOET erop komen." Bij een botsing wint de
  opdracht met de controle erachter, en dat is het contract.

#### O6. De merkstem is te dun om iets te sturen
*Veroorzaakt probleem 6.*

Wat de schrijver over de stem krijgt: het vrije veld `tone_of_voice` ("Nuchter en vakkundig,
Brabants hartelijk, geen verkooppraat"), vier schuiven die bij alle drie de klanten leeg zijn, de
aanspreekvorm, verboden woorden, en drie `style_samples` die van de site komen. Voor de hovenier:

- "Wij staan graag voor je klaar!"
- "Tijdens een kennismakingsgesprek bespreken we graag de mogelijkheden voor jouw tuin."
- "Ben jij benieuwd wat we voor jou kunnen betekenen? Vraag een gratis offerte aan ..."

Dat zijn de generieke zinnen van een sitebouwer, geen stem, en de schrijver doet ze trouw na: "Wij
staan graag voor je klaar" staat onder de pagina voor Best, en de blinde lezer noemde het "Cliché,
botst met 'geen verkooppraat'". Voor de installateur staat "Een goed werkende verwarmingsinstallatie
is onmisbaar voor een comfortabel en energiezuinig huis" in een tekst die "zakelijk" moest zijn.

Wat er wel verzameld wordt en nergens de schrijfopdracht in gaat (`brand-fields.ts`, "wordt op dit
moment niet in de teksten gebruikt"): `brand_positioning`, `differentiator`, `usp`, `key_messages`,
`signature_phrases`, `identity_keywords`, `personas`, `audience_knowledge_level`, `tone_emotional`.
En de meest authentieke bron van de stem, de letterlijke antwoorden van de ondernemer in het gesprek
en in de vragenronde, wordt alleen gebruikt als bewijs (`klantcitaten.ts`), niet als maatstaf voor
hoe het bedrijf praat.

De enige controles op stem zijn de aanspreekvorm, verboden woorden, merknaam aan het begin van een
alinea, en één cijfer "toon" van de vakmanschapsbeoordelaar, die geen stemprofiel heeft om tegen te
meten.

#### O7. Elke pagina wordt los geschreven
*Veroorzaakt probleem 7.*

De schrijver krijgt `relatedPageWarning()` (een adres) en verder niets van de andere pagina's.
Best en Nuenen kregen dezelfde kaart van 44 feiten, een vergelijkbare schrijfopdracht, en schreven:

| Best | Nuenen |
|---|---|
| "Hans Verstraaten Hoveniers werkt in Best en verzorgt een complete tuin van ontwerp tot oplevering zelf" | "Hans Verstraaten Hoveniers werkt in Nuenen en verzorgt bij een complete tuin zelf het ontwerp, grondwerk, de bestrating, beplanting en afvoer" |
| "We werken met een vaste ploeg van vijf man en huren geen zzp'ers in." | "We werken met een vaste ploeg van vijf man, zonder inhuur van zzp'ers." |
| "## Reken meestal op €12.000 tot €35.000 voor aanleg met bestrating" | "## Reken meestal op €12.000 tot €35.000 voor aanleg met bestrating" |
| "## Vergelijk dezelfde werkzaamheden en afwerking" | "## Vergelijk offertes op dezelfde werkzaamheden en hoeveelheden" |

Wat er over Best of Nuenen zelf in staat: de plaatsnaam. Geen project, geen wijk, geen afstand, geen
reden waarom deze pagina bestaat naast de andere. Dat kan ook niet, want er staat geen enkel lokaal
feit op de kaart en niemand heeft de ondernemer ernaar gevraagd.

`similarity.ts` vergelijkt achteraf op letterlijke reeksen van vijf woorden (drempel 0,35). Twee
pagina's met dezelfde opbouw en andere zinnen komen daar ruim onder. De controle meet hergebruik van
zinnen, niet hergebruik van de pagina.

De bron van deze plaatspagina's ligt nog eerder: de meetvragen bevatten vrijwel altijd een plaatsnaam
(punt 8 van de doorlichting), dus elke gemiste vraag in een andere plaats wordt een aanbeveling
voor een plaatspagina.

#### O8. De FAQ is per ontwerp een restcategorie
*Veroorzaakt probleem 8.*

Het contract vraagt om FAQ-vragen met de regel "Vraag NIET na wat er in de secties hierboven al
beantwoord wordt." Wat in de FAQ komt is dus per definitie wat niet in de tekst paste. Omdat die
vragen uit het algemene onderzoek komen, is er meestal geen feit bij, en dan wordt het antwoord een
voorbehoud:

- "Welke regels gelden in Best voor het afvoeren van regenwater bij een grotendeels betegelde tuin?"
  Antwoord: "Dat hangt af van de actuele regels en het concrete plan. Deze pagina geeft geen
  bevestigde lokale eis voor Best. Controleer de geldende regels voordat je de indeling definitief
  maakt." (hovenier, Best)
- "Hoeveel moet ik aanbetalen voor tuinaanleg?" Antwoord: "Een vast aanbetalingsbedrag voor een
  tuinproject wordt hier niet genoemd." (idem)
- "Wat is op de lange termijn voordeliger: een cv-ketel kopen of huren?" op een pagina van een
  bedrijf dat geen huur aanbiedt (installateur, kosten).

Daarnaast herhaalt de FAQ de tekst waar het wel een feit heeft: bij Nuenen staat de prijsband in de
opening, in een eigen sectie, in de laatste sectie en in de FAQ.

#### O9. Lengte is een uitkomst van de checklist, niet van een besluit
*Veroorzaakt probleem 9.*

`TARGET_WORDS` zet per type een bandbreedte, het contract verdeelt die over secties, de keuring
bewaakt de ondergrens per sectie. Niemand beslist "deze pagina heeft vijf feiten en drie echte
vragen, dus 450 woorden is genoeg". Omdat het contract geen ondergrens kent voor het aantal secties
en de schrijver er niets uit mag halen, is de uitkomst altijd de bovenkant.

#### O10. De keuring beschermt, maar trekt niet
*Versterkt alle bovenstaande.*

De zes blokkades gaan allemaal over veiligheid (verboden woord, verboden onderwerp, concurrent,
kernbewering zonder bewijs, bewering zonder bron, duplicaat). Kwaliteit van de copy verlaagt alleen
een score. De reparatie werkt de blokkades het eerst af, en die los je op door af te zwakken.
Tegelijk weten we uit de doorlichting dat een losse beoordelaar geen betrouwbaar absoluut cijfer
geeft maar wel betrouwbaar vergelijkt (`kwaliteitsdoorlichting/blinde-lezer-toets/README.md`), en
dat de vakmanschapsbeoordelaar een rangcorrelatie van +0,29 had met een echte copywriter. De score
waarop de reparatielus stuurt, is dus het minst betrouwbare getal in de keten.

### 1.3 Wat goed is en moet blijven

Dit plan gooit het fundament niet weg. Deze onderdelen werken en zijn precies wat een gewone
AI-schrijftool mist:

- **De gesloten feitenkaart met citaatplicht** (`claims` met F-nummer en letterlijk fragment, door
  code nagerekend). De twee zwaarste meldingen van verzonnen feiten in de herhaling (punt 60 en 61)
  bleken bij narekenen op de site of in de antwoorden van de klant te staan.
- **Uitleg met nagerekende bron** (`explainer-verify.ts`).
- **Reparatie per sectie** in plaats van de hele pagina, met behoud van wat goed was.
- **Bevroren momentopnames** van kaart, plan en opdracht per versie (conventie 8).
- **De vragenronde aan de ondernemer** als route voor wat alleen hij weet.
- **Klantcitaten, bewijspunten en kernbewijs** als bouwstenen.
- **De proefset met blinde lezers** (`docs/tasks/kwaliteitsdoorlichting/`): de enige meetlat die
  meet wat een lezer merkt. Die wordt in dit plan de acceptatietest.

---

## 2. Besluiten van de eigenaar (25 september 2026)

| # | Besluit | Gevolg in dit plan |
|---|---|---|
| 1 | Al het redactionele werk (paginastrategie, schrijven, eindredactie) op **GPT-6 Sol** | geen nieuw model; Sol is de tier die het schrijven nu al gebruikt (`MODELS.content`) |
| 2 | De beperkingen die de kwaliteit kunnen drukken weghalen: **eigenaarstoets en merkstemtoets op Sol**, **extra denktijd voor strategie en eindredactie** | §4; ongeveer $0,37 per artikel |
| 3 | Geen losse proef en geen vergelijking met een duurder model vooraf | fase 0 vervalt; de nareken-plicht per fase blijft (conventie 10) |
| 4 | Een **werkgebiedpagina** mag geadviseerd worden; **grote steden** houden een eigen pagina: een gemeente vanaf **50.000 inwoners** | §10 |
| 5 | De **schrijfstijl hoort duidelijk in het merkdossier**; nagekeken voor de drie klanten | §9; de controle laat zien dat het merkdossier de lading nu niet dekt |
| 6 | Een **bronconflict** houdt een pagina alleen tegen als het betwiste feit op die pagina nodig is | §8 |

**Nog open, met een voorstel:** wie conflicten afhandelt en de stemvoorstellen goedkeurt. Dit plan
legt dat bij de adviseur (sales-led, zoals het hele merkprofiel), ongeveer een kwartier tot een half
uur per merk vóór de eerste pagina. De klant ziet het conflictscherm niet.

---

## 3. De nieuwe keten

Het uitgangspunt: **eerst beslissen, dan schrijven, dan redigeren, dan pas keuren.** Elke beslissing
wordt een object dat de volgende stap krijgt en dat code kan narekenen. De vangnetten in code
verschuiven daarmee van "komt deze formulering voor" naar "is de beslissing uitgevoerd": staat er een
onderwerp dat was uitgesloten, wordt een feit genoemd dat intern open staat.

### 3.1 Drie lagen

**Laag 1, per merk** (eenmalig, bijgewerkt bij wijzigingen): het feitenregister met soort en waarde
per feit, de conflictdetectie, de bewijsbank, en de schrijfstijl in het merkdossier.

**Laag 2, per plan:** de portfolio. Welke pagina welke taak heeft, welke hoek, welk bewijs voorop, en
of een plaats een eigen pagina krijgt.

**Laag 3, per pagina:** onderzoek, paginastrategie, schrijven, eindredactie, keuring, en zo nodig
reparatie.

### 3.2 De taken per pagina, oud en nieuw

De voorbereiding vóór de vragen aan de klant blijft zoals hij is: `content_plan` met `voorBriefing`
maakt het itemdossier en het contract, en `content_brief` maakt daar de vragen aan de klant van. Het
contract krijgt daarmee één rol: het **ideaal waar de vragen uit komen**. Het gaat niet meer als
verplichte inhoudsopgave naar de schrijver.

Het schrijven, na de antwoorden:

| Nu | Nieuw |
|---|---|
| `content_plan` (hergebruikt dossier en contract) | `content_plan` (ongewijzigd, hergebruikt dossier en contract) |
| | **`content_strategy`** (nieuw): paginastrategie op Sol met extra denktijd; de conflictpoort en de strategiecontroles in code |
| `content_draft`: schrijfopdracht (luna) plus schrijven (Sol) plus volledige keuring | `content_draft`: schrijven (Sol) plus de feitcontrole in code, **zonder** keuring door beoordelaars |
| | **`content_edit`** (nieuw): eindredactie op Sol met extra denktijd, daarna de volledige keuring |
| `content_revise` (tot 3 rondes) | `content_revise` (tot 2 rondes), gestuurd door de bevindingen van eigenaarstoets en redactie |

Waarom zo: conventie 7 (één zware aanroep per taak). De strategie en de eindredactie zijn elk een
zware Sol-aanroep en krijgen dus een eigen taak. De keuring verhuist van na het schrijven naar na de
redactie: een oordeel over een tekst die de redacteur daarna toch verandert, is weggegooid geld.
`content_edit` heeft daarmee dezelfde vorm als `content_draft` nu (één zware aanroep plus de keuring),
en past in dezelfde tijdreserve van de werker (`HEAVY_JOB_RESERVE_MS` in `lib/jobs/worker.ts`).

### 3.3 Wat er per taak gebeurt

1. **`content_plan`** (bestaat): itemdossier (luna met web) en contract. Het dossier labelt vragen
   voortaan als beslisvraag, oriëntatievraag of randvraag.
2. **`content_strategy`** (nieuw): leest register, bewijsbank, schrijfstijl, portfoliotoewijzing,
   dossier, contract, antwoorden van de klant, bestaande pagina en zusterpagina's, en levert de
   `PageStrategy` (§6). Code controleert de strategie (§5, L5) en de conflictpoort (§8). Faalt de
   poort, dan wordt er niet geschreven en krijgt de adviseur een melding met het conflict.
3. **`content_draft`**: schrijft op basis van de strategie, met alleen de gekozen feiten. Daarna de
   feitcontrole in code (beweringen tegen het register, uitgesloten onderwerpen, intern open punten,
   bronpraat).
4. **`content_edit`** (nieuw): eindredactie, daarna de vangnetten op de redactie (geen nieuw feit,
   geen kernfeit weg, lengte naar het budget), daarna de volledige keuring (§12).
5. **`content_revise`**: alleen als de keuring het vraagt, hoogstens twee rondes. Wat daarna nog open
   staat, is bijna altijd een ontbrekend feit en gaat als vraag naar de ondernemer, zoals nu.

---

## 4. Modellen, denktijd en kosten

### 4.1 Welk model waarvoor

| Stap | Model | Denktijd | Waarom |
|---|---|---|---|
| Paginastrategie | GPT-6 Sol | hoog | de moeilijkste denkstap: uit tientallen feiten kiezen en bepalen wat weg mag |
| Schrijven | GPT-6 Sol | medium (zoals nu) | de opdracht wordt beter en korter; het schrijven zelf was niet het probleem |
| Eindredactie | GPT-6 Sol | hoog | de hele tekst overzien: herhaling, relativering, stem, lengte |
| Reparatie | GPT-6 Sol | medium (zoals nu) | gerichte sectiereparatie |
| Eigenaarstoets | GPT-6 Sol | medium | beslist mee of een pagina publicatiewaardig is; het goedkope model was aantoonbaar te mild |
| Merkstemtoets | GPT-6 Sol | medium | toon is een fijnmazig oordeel |
| Stemvoorstel voor het merkdossier | GPT-6 Sol | hoog | eenmalig per merk |
| Portfolio per plan | GPT-6 Sol | hoog | eenmalig per plan |
| Itemdossier, feiten indelen, conflicten beoordelen, FAQ-selectie, feitelijkheid, citeerbaarheid | luna | zoals nu | mechanisch werk dat code narekent |

In de code: `MODELS.content` (Sol) wordt de tier voor al het redactionele werk en de twee
Sol-beoordelaars. Er komt geen vierde tier bij (CLAUDE.md: drie tiers vast). Het commentaar in
`lib/openai/models.ts` dat de contenttier "uitsluitend het schrijven" noemt, wordt bijgewerkt. In
`lib/openai/sampling.ts` komt één nieuwe werksoort, `redactioneel`, met denktijd hoog, voor de
strategie, de eindredactie, het stemvoorstel en de portfolio.

### 4.2 Kosten per artikel

Geschat op de huidige tokengroottes uit `ai_calls` (schrijven nu gemiddeld 14.100 tokens in en 4.300
uit, $0,071; een reparatieronde $0,057).

| Stap | Model | Per artikel |
|---|---|---|
| Paginastrategie | Sol, hoog | $0,085 |
| Schrijven | Sol, medium | $0,065 |
| Eindredactie | Sol, hoog | $0,08 |
| Reparatie (gemiddeld een halve ronde) | Sol, medium | $0,03 |
| Eigenaarstoets | Sol, medium | $0,04 |
| Merkstemtoets | Sol, medium | $0,035 |
| Itemdossier, feitcontrole, FAQ en overige beoordelaars | luna | $0,03 |
| Aandeel van het werk per merk en per plan | Sol, hoog | $0,005 |
| **Totaal** | | **ongeveer $0,37** |

Een landingspagina is korter en komt op ongeveer $0,30. Een plan van twaalf artikelen kost ongeveer
$4,50, tegen ongeveer $2 nu; één artikel kost minder dan de helft van één meetronde ($0,82).

**Wat de uitkomst kan verschuiven.** Blijven de reparaties even vaak nodig als nu (1,3 ronde per
pagina), of worden artikelen langer dan het budget, dan komt het uit op ongeveer $0,50. Dat de
eindredacteur het grootste deel van de reparaties overneemt, is een verwachting. Na fase 1 worden de
kosten per pagina nagerekend op `ai_calls` en komen ze in `docs/architecture.md` §6.

**Wat nu gemeten is, ter vergelijking:** een artikel gemiddeld $0,155 en een landingspagina $0,142
over de pagina's van de hovenier en de installateur sinds 24 september 2026 (aanroepen met een
`content_piece_id`); met het voorwerk dat niet aan één pagina hangt ongeveer $0,16 tot $0,18.

### 4.3 Doorlooptijd en de tijdslimiet

Per pagina komen er twee zware aanroepen bij, dus een pagina duurt enkele minuten langer. Dat voelt
niemand, want het draait op de achtergrond.

**Het echte aandachtspunt is de tijdslimiet per aanroep** (150 seconden, `CALL_BUDGET_MS` in
`lib/openai/client.ts`). Het schrijven staat op medium omdat hoog daar tegenaan zat; de traagste
geslaagde schrijfaanroep op medium duurde 98,8 seconden. De strategie en de eindredactie op hoog
maken minder tekst dan de schrijver, maar denken langer. Maatregel bij de bouw, geen losse proef:

- elke aanroep van `content_strategy` en `content_edit` legt zijn duur vast;
- komt één van beide in productie boven 120 seconden, dan gaat die aanroep in de achtergrondmodus van
  de API (de taak start de aanroep, een vervolgtaak haalt het resultaat op), zodat een time-out nooit
  de duurste aanroep dubbel laat betalen.

---

## 5. De LLM-stappen in detail

### L1. Feiten indelen (per merk, per batch nieuwe feiten)
- **Doet:** geeft elk feit een soort, een genormaliseerde waarde en een geldigheid.
- **Krijgt:** de feiten uit `brand_facts`, met de zin en de pagina waar ze vandaan komen.
- **Levert:** per feit `soort`, `waarde`, `eenheid`, `geldtVoor`, en of het bewijs kan zijn.
- **Model:** luna. **Vangnet:** een getal in `waarde` moet in de feittekst staan; anders blijft de
  waarde leeg (conventie 3).
- **Waarom:** zonder soort en waarde is geen conflict te vinden en geen feit te kiezen.

### L2. Conflict beoordelen (per kandidaat-paar)
- **Doet:** beslist of twee feiten van dezelfde soort elkaar echt tegenspreken.
- **Krijgt:** de twee feiten met bron, datum en de zin eromheen.
- **Levert:** `echtConflict`, een uitleg in één zin voor de adviseur, een voorstel welke bron
  waarschijnlijk klopt (nooit automatisch toegepast), of `varianten` als het twee verschillende dingen
  zijn.
- **Model:** luna.
- **Waarom:** code vindt kandidaten, maar ziet niet dat de intake van € 50 op kantoor en die van € 80
  in de auto bij de rijschool twee producten zijn. Zonder deze stap wordt de poort vals alarm.

### L3. Stemvoorstel voor het merkdossier (per merk, eenmalig)
- **Doet:** stelt voor elk leeg of dun stemveld van het merkdossier een waarde voor (§9).
- **Krijgt:** de hele sitetekst die de crawl las, de gespreksnotities, alle letterlijke antwoorden van
  de ondernemer, de bestaande stemvelden, de verboden woorden.
- **Levert:** een voorstel per veld, met goede en foute voorbeeldzinnen die het zelf schrijft uit
  bestaande feiten, en per regel de bron.
- **Model:** Sol, denktijd hoog.
- **Na afloop:** de adviseur keurt goed in het merkdossier; een voorstel dat niet is goedgekeurd, gaat
  niet mee in het schrijven.

### L4. Portfolio (per plan)
- **Doet:** geeft elke pagina van een plan een eigen taak binnen het geheel (§10).
- **Krijgt:** alle geplande pagina's met doelvragen en lezer, de bestaande sitepagina's, de bewijsbank,
  het werkgebied, de groeiplaatsen, en de uitkomst van de plaatsregel (§10.1).
- **Levert:** per pagina een `PageAssignment` (§6), met het advies schrijven, samenvoegen, of eerst een
  vraag aan de ondernemer.
- **Model:** Sol, denktijd hoog.

### L5. Paginastrategie (per pagina), de belangrijkste nieuwe stap
- **Doet:** de redactionele keuze die nu over contract en schrijfopdracht verdeeld is, en die nu door
  het goedkoopste model gemaakt wordt.
- **Krijgt:** de toewijzing uit L4, het dossier met gelabelde vragen, het contract als lijst van
  mogelijke onderwerpen (niet als opdracht), het feitenregister met soort en stand, de bewijsbank, de
  schrijfstijl, de antwoorden van de klant, de bestaande pagina, de doelvragen uit de meting, het
  winnende AI-antwoord zonder namen, de bezwaren uit het verkoopgesprek, en per zusterpagina de hoek
  en de gekozen feiten.
- **Levert:** `PageStrategy` (§6).
- **Model:** Sol, denktijd hoog.
- **Vangnet in code:** elk gekozen feit staat in het register en is niet betwist; elke bestemming B
  heeft een reden uit de gesloten lijst van §7.2; het lengtebudget valt binnen de grenzen van §7.4;
  een kernonderwerp zonder feit en zonder vaste vakkennis is een vraag aan de ondernemer en geen
  sectie; er staan hoogstens zes prioriteitsfeiten in.
- **Vervangt:** de schrijfopdracht (`writer-brief.ts`) en de rol van het contract als opdracht.

### L6. FAQ-selectie (per pagina)
- **Doet:** kiest nul tot vijf vragen die echt iets toevoegen (§11).
- **Krijgt:** de strategie, de kandidaatvragen (bezwaren, gemeten vragen, dossier, vervolgvragen uit
  eerdere keuringen), het register.
- **Levert:** per kandidaat houden of afwijzen, met de reden en voor een gehouden vraag het feit of de
  vakkennis waarop het antwoord rust.
- **Model:** luna. **Vangnet:** code gooit elke vraag weg zonder onderbouwing of met grote overlap met
  een sectie.
- **Plek:** een eigen aanroep binnen `content_strategy`, na de strategie. Luna is licht genoeg om naast
  de ene zware aanroep te passen.

### L7. Schrijven (per pagina)
- **Krijgt:** de strategie, de opbouw die code uit de strategie afleidt, alleen de gekozen feiten met
  F-nummer, de goedgekeurde FAQ met onderbouwing, de schrijfstijl met voorbeelden, de harde regels die
  blijven (feiten, concurrenten, leestekens, naam in de eerste alinea en de afsluiting).
- **Levert:** zoals nu (tekst, FAQ, meta, JSON-LD, claims, bewijspunten), plus `weggelaten`: welke
  opbouwpunten hij niet kon schrijven en waarom.
- **Model:** Sol, denktijd medium.
- **Wat verdwijnt uit de opdracht:** "alles wat hier staat MOET erop" en "je mag er niets uit
  weglaten", de hele feitenkaart van 44 tot 84 regels (die gaat alleen nog naar de feitcontrole), het
  paginaplan met "GEEN BRON", en de meeste van de achttien blokken; wat er van die blokken toe doet,
  zit in de strategie.

### L8. Eindredactie (per pagina, één ronde)
- **Doet:** wat een eindredacteur doet: de tekst beter maken zonder feiten toe te voegen.
- **Krijgt:** de tekst, de strategie, de schrijfstijl, de gekozen feiten, de bevindingen van de
  feitcontrole.
- **Levert:** de geredigeerde tekst en een logboek per wijziging: wat, waarom (overbodige
  relativering, herhaling, adviestoon, stem, lengte, helderheid), en of het een feit raakte.
- **Model:** Sol, denktijd hoog.
- **Vangnet in code:** geen nieuwe bewering zonder feit (dezelfde controle als nu), geen kernfeit
  weg (`feitbehoud.ts` bestaat), lengte naar het budget en niet erboven.

### L9. Merkstemtoets (per versie)
- **Doet:** legt de tekst naast de schrijfstijl in het merkdossier.
- **Levert:** per stemregel gehaald of niet, met de zin uit de tekst; de drie zinnen die het verst van
  de stem af staan, met een voorstel.
- **Model:** Sol, denktijd medium.

### L10. Eigenaarstoets (per versie)
- **Doet:** leest de pagina als de ondernemer. Zou hij dit zonder aanpassing publiceren, en wat zou hij
  als eerste veranderen?
- **Krijgt:** de tekst, de schrijfstijl, het bewijs, en de huidige sitepagina of de vorige versie.
- **Levert:** een vergelijkend oordeel (nieuw beter, gelijk, slechter), publiceerbaar ja of nee, en de
  eerste wijziging die de ondernemer zou maken, met de sectie.
- **Model:** Sol, denktijd medium.
- **Waarom vergelijkend:** de blinde-lezertoets van de doorlichting liet zien dat een lezer
  betrouwbaar vergelijkt en geen betrouwbaar los cijfer geeft.

### Wat blijft, wat vervalt
- **Blijft (luna):** itemdossier, claim-audit en vragen, feitelijkheidsbeoordelaar (gericht op de
  feitcontrole), citeerbaarheidsbeoordelaar (zijn "wat houdt de lezer nog over" wordt invoer voor FAQ
  en volgende strategie, geen opdracht om secties toe te voegen), zinnenbeoordelaar, versievergelijking.
- **Vervalt:** de schrijfopdracht als losse stap (gaat op in L5); de redactiebeoordelaar en de
  vakmanschapsbeoordelaar (gaan op in L9 en L10).

---

## 6. De gestructureerde objecten

Elk object wordt als JSON bewaard naast de pagina of het merk (conventie 8), zodat achteraf bij elke
zin te zien is welke beslissing hem veroorzaakte. Elk krijgt een Zod-schema in `lib/schemas/`.

### FactRecord (uitbreiding van `brand_facts`)
| Veld | Betekenis |
|---|---|
| `soort` | prijs, termijn, plaats, werkgebied, dienst, product, certificering, garantie, werkwijze, cijfer, openingstijd, contact |
| `waarde` | genormaliseerd, bijvoorbeeld `{min: 2200, max: 3200, eenheid: "EUR"}` of `{min: 2, max: 4, eenheid: "week"}` |
| `geldt_voor` | merk, een dienst, een plaats |
| `stand` | bevestigd door de klant, van de site, uit onderzoek, betwist |
| `bewijskracht` | geen, gewoon, sterk (35 jaar, eigen ploeg, 1.800 contracten) |

### FactConflict (nieuwe tabel)
| Veld | Betekenis |
|---|---|
| `feit_ids` | de twee of meer feiten |
| `soort` | zoals bij FactRecord |
| `ernst` | blokkerend of waarschuwing (§8.2) |
| `uitleg`, `voorstel` | voor de adviseur |
| `oplossing`, `opgelost_door`, `opgelost_op` | welk feit geldt; tot dan staat het feit op "betwist" |

### PageAssignment (per pagina, uit de portfolio)
| Veld | Betekenis |
|---|---|
| `primaireIntentie` | de ene zoekintentie die deze URL bedient |
| `paginadoel` | informeren, overtuigen, kiezen helpen, contact opleveren |
| `hoek` | waarom deze pagina naast de andere bestaat, in één zin |
| `voorrangsbewijs` | welke bewijsstukken hier voorop gaan |
| `nietHier` | onderwerpen die op een andere pagina staan, met die pagina |
| `interneLinks` | naar welke pagina's, met welke aanleiding |
| `advies` | schrijven, samenvoegen met pagina X, of eerst vraag Y aan de ondernemer |

### PageStrategy (per pagina, uit L5)
| Veld | Betekenis |
|---|---|
| `zoekintentie` | informeren, vergelijken, kopen, lokaal vinden |
| `lezer` | één persoon in één situatie |
| `fase` | oriëntatie, overweging, beslissing |
| `paginadoel` | wat de lezer na afloop doet |
| `kernboodschap` | wat blijft hangen, in één zin |
| `openingsantwoord` | het antwoord op de hoofdvraag in hoogstens twee zinnen |
| `hoek` | uit de toewijzing, eventueel aangescherpt |
| `prioriteitsfeiten` | drie tot zes feit-id's, elk met de betekenis voor deze lezer |
| `optioneleFeiten` | mag, hoeft niet |
| `uitgeslotenFeiten` | met reden: elders gedekt, niet relevant, betwist |
| `onderwerpen` | per onderwerp opnemen, weglaten of eerst vragen; bij opnemen de bron (feit of vaste vakkennis) en een woordbudget |
| `onzekerheden` | per open punt de bestemming A, B of C (§7.1); bij B de reden en de formulering |
| `bezwaar` | het bezwaar uit het verkoopgesprek dat deze pagina wegneemt, als dat er is |
| `lengtebudget` | woorden, met de onderbouwing (§7.4) |
| `oproep` | wat de lezer moet doen, in de woorden van het merk |
| `gevoelig` | onderwerpen waar nuance wel moet (veiligheid, wet, zorg), met de nuance |
| `faq` | de uitkomst van L6 |

### EditorialLog (per versie, uit L8)
Per wijziging: `was`, `wordt`, `soort` (relativering, herhaling, adviestoon, stem, lengte, helderheid),
`raaktFeit`.

### ReadinessReport (per versie, uit de keuring)
Zie §12.3.

**Waarom dit de kwaliteit voorspelbaarder maakt.** Elke fout wordt aanwijsbaar: staat er een
consumentenadviessectie, dan is in de strategie te zien of die daar gekozen is of dat de schrijver
hem bedacht. En de vangnetten controleren beslissingen in plaats van formuleringen; een beslissing
heeft maar één vorm, een formulering duizend. De schrijver krijgt de beslissingen en voorbeelden, niet
de velden als invullijst, zodat de tekst geen formulier wordt.

---

## 7. Onzekerheid, nuance en wat er op de pagina komt

### 7.1 Drie bestemmingen voor onzekerheid
- **A. Intern oplossen.** Wij weten het niet, de ondernemer wel. Het wordt een vraag aan de
  ondernemer via de bestaande vragenroute, en de tekst zwijgt erover tot er een antwoord is. Dit is
  de standaard voor alles wat over het bedrijf gaat.
- **B. Uitleggen aan de lezer.** Alleen met een reden uit §7.2, één keer, in de formulering die de
  strategie vastlegt.
- **C. Weglaten.** Niet relevant genoeg voor deze lezer. Geen vraag en geen zin.

Een punt met bestemming A of C dat toch als zin in de tekst staat, is een blokkade (§12.1).

### 7.2 Noodzakelijke nuance tegenover overbodige relativering
Een voorbehoud mag alleen bij één van deze vijf redenen, en dan één keer per feit:
1. **Geld:** de lezer begroot anders verkeerd. Een bandbreedte is al een voorbehoud; één korte reden
   van de spreiding is genoeg ("vooral de stenen maken het verschil").
2. **Veiligheid:** gas, elektra, bouwkundig.
3. **Wet en regels:** vergunning, subsidievoorwaarden. Eén verwijzing naar de officiële bron.
4. **Zorg en gezondheid.**
5. **De klant wil het:** een voorbehoud dat de ondernemer zelf opgaf.

Nooit: een voorbehoud direct na een bewijsstuk ("35 jaar ervaring, maar dat zegt op zichzelf niets"),
een voorbehoud over wat wij niet weten ("is niet vastgelegd"), een voorbehoud dat een belofte van de
site omdraait, en een voorbehoud op algemene uitleg die niemand als belofte leest.

### 7.3 Welke feiten op de pagina komen
Een feit komt erop als het minstens één van deze drie doet:
1. **Een beslisvraag beantwoorden** (prijs, termijn, werkgebied, of dit bedrijf het doet).
2. **Bewijs zijn dat voor deze lezer telt** (eigen ploeg voor wie onderaannemers vreest,
   storingsdienst voor wie een oude ketel heeft).
3. **Een bezwaar wegnemen** uit het verkoopgesprek ("Hoe lang lig ik met een kale tuin?": uitvoering
   in twee tot drie weken).

En het staat niet als hoofdpunt op een zusterpagina, tenzij het voor deze lezer net zo zwaar weegt.
Bewijs wordt standaard stellig gebracht: de klant heeft het bevestigd of het staat op zijn eigen site.
Algemene uitleg mag, maar alleen als de lezer hem nodig heeft om een feit te begrijpen.

### 7.4 Lengte volgt uit de inhoud
De strategie zet een budget met onderbouwing:
- **Vertrekpunt per paginadoel:** lokale landingspagina 350 tot 550 woorden, dienstpagina 450 tot 750,
  uitlegartikel 600 tot 1.100, vergelijking 500 tot 900.
- **Plus** ongeveer 80 woorden per extra beslisvraag met een feit, ongeveer 50 per uitleg die nodig is
  om een feit te begrijpen.
- **Min** wat de bestaande site al goed zegt en waar alleen naar gelinkt hoeft te worden, en wat een
  zusterpagina behandelt.
- **Plafond:** vertrekpunt plus 30 procent; daarboven moet de strategie zeggen waarom.

De getallen zijn een startwaarde (gekozen, niet geijkt) en worden na fase 1 bijgesteld op de
nameting. `TARGET_WORDS` in `content.ts` wordt daarmee het vertrekpunt en niet meer de opdracht. Voor
GEO is korter geen verlies: een assistent citeert een korte, stellige, concrete zin, en de beste
citeerbare zin die de blinde lezer bij Best aanwees was precies zo'n zin.

---

## 8. Bronconflicten

### 8.1 Hoe een conflict gevonden wordt
1. Code vergelijkt feiten van dezelfde soort en hetzelfde onderwerp op hun waarde (twee
   intakeprijzen, twee levertijden, twee werkgebieden).
2. Elk kandidaat-paar gaat naar L2: echt conflict, of twee varianten van iets anders.
3. Een echt conflict komt in `fact_conflicts`; het feit krijgt de stand "betwist".
4. **Automatisch oplossen** alleen bij een eenduidige rangorde: een antwoord van de klant gaat vóór
   de site, en een recentere pagina van de eigen site vóór een oudere. Ook dan ziet de adviseur een
   melding.

### 8.2 Wanneer een conflict tegenhoudt
**Besluit van de eigenaar:** alleen als het betwiste feit op deze pagina nodig is (het staat in de
prioriteitsfeiten van de strategie, of het onderwerp kan niet zonder). Anders laat de strategie het
feit weg, schrijft de pagina door, en krijgt het merk een waarschuwing.

| Soort | Houdt tegen als het nodig is | Reden |
|---|---|---|
| Prijzen en tarieven | ja | de lezer begroot erop |
| Openingstijden | ja | een lezer komt voor een dichte deur |
| Adres, vestigingen, contactgegevens | ja | een assistent die twee adressen ziet, vertrouwt geen van beide |
| Werkgebied | ja, op pagina's over die plaats | het doel van een plaatspagina |
| Diensten (wel of niet aangeboden) | ja, op pagina's over die dienst | een pagina voor een dienst die niet bestaat |
| Certificeringen en keurmerken | ja | juridisch risico |
| Garanties | ja | juridisch risico en een belofte die de ondernemer moet nakomen |
| Termijnen | ja als het een prioriteitsfeit is | de 4-urenbelofte van de hovenier |
| Cijfers als bewijs | ja als het een bewijsstuk op de pagina is | "35 jaar" tegenover "30 jaar" ondermijnt het bewijs |
| Productinformatie | alleen op een productpagina | minder kritisch |
| Werkwijze | alleen als het een prioriteitsfeit is | vaak twee beschrijvingen van hetzelfde |

### 8.3 Wat de adviseur ziet
Een conflictlijst bij het merk, alleen voor medewerkers: per conflict de twee zinnen met bron en
datum, het voorstel van L2, en drie knoppen: dit geldt, dat geldt, vraag het de ondernemer. De keuze
wordt een bevestigd feit, het andere feit krijgt de stand "vervangen". Een pagina die op het conflict
wacht, start vanzelf opnieuw bij `content_strategy` zodra het is opgelost.

---

## 9. De schrijfstijl in het merkdossier

### 9.1 Wat er in het merkdossier moet staan
**Besluit van de eigenaar:** de schrijfstijl hoort duidelijk in het merkdossier, niet in een apart,
onzichtbaar object. Een deel van de velden bestaat al in `lib/pipeline/brand-fields.ts` maar gaat nu
niet mee in het schrijven; die worden aangesloten. Wat ontbreekt, komt erbij.

| Veld | Wat het vastlegt | Nu |
|---|---|---|
| `tone_of_voice` | de toon in één of twee zinnen | bestaat, gaat mee |
| `pronoun_preference` | je of u | bestaat, gaat mee |
| `tone_formality`, `tone_energy`, `tone_complexity`, `tone_humor`, `tone_emotional` | de vijf schuiven | bestaan; vier gaan mee als ze gevuld zijn, emotie niet |
| `audience_knowledge_level` | hoeveel vakkennis de lezer heeft, en dus hoeveel uitleg | bestaat, gaat niet mee |
| `signature_phrases` | uitdrukkingen die het bedrijf zelf gebruikt | bestaat, gaat niet mee |
| `identity_keywords` | woorden die het bedrijf typeren | bestaat, gaat niet mee |
| `differentiator`, `usp`, `key_messages` | waarin het bedrijf verschilt, wat elke tekst mag uitstralen | bestaan, gaan niet mee |
| `taboo_phrases` | verboden woorden | bestaat, gaat mee |
| `style_samples` | voorbeeldzinnen | bestaat, gaat mee; moet uit het gesprek komen of goedgekeurd zijn |

Nieuw in het merkdossier:

| Veld | Wat het vastlegt |
|---|---|
| `voice_self_reference` | hoe het bedrijf zichzelf noemt in de lopende tekst: "we", "wij", "onze ploeg", de voornaam |
| `voice_sentence_length` | doelgemiddelde en maximum aantal woorden per zin |
| `voice_directness` | antwoord eerst of aanloop; hoeveel voorbehoud past |
| `voice_commercial` | hoe hard mag worden aangeprezen, en welke woorden te veel verkoop zijn |
| `voice_assertiveness` | hoe bewijs wordt gebracht (feitelijk, trots, bescheiden) |
| `voice_cta_style` | hoe een oproep tot contact klinkt, met twee of drie voorbeelden |
| `voice_cliches` | clichés die bij deze stem niet passen, als aanvulling op de verboden woorden |
| `voice_good_examples` | vijf tot twintig zinnen in deze stem, gebouwd op echte feiten van dit bedrijf |
| `voice_bad_examples` | vijf tot tien zinnen die niet passen, met de verbeterde versie |
| `voice_approved_at`, `voice_approved_by` | wanneer en door wie de stem is goedgekeurd |

**De rangorde van bronnen** bij een voorstel: wat de ondernemer zelf zegt (gesprek, antwoorden) weegt
het zwaarst, dan de toon die hij opgaf, dan de sitetekst. Sitetekst is vaak door een webbureau
geschreven en is bewijs, geen wet.

### 9.2 Hoe het gevuld wordt
1. L3 stelt voor elk leeg of dun stemveld een waarde voor.
2. De adviseur keurt goed, past aan, of laat leeg, in het merkdossier. Ongeveer een kwartier per merk.
   Een voorstel dat niet is goedgekeurd, gaat niet mee.
3. Het merkdossier toont een waarschuwing zolang de stem onder een minimum zit (toon, aanspreekvorm,
   kennisniveau, zelfbenoeming, stelligheid, minstens vijf goede en vijf foute zinnen). Het schrijven
   gaat door, maar de adviseur ziet dat de stem nog niet is vastgelegd.
4. Elke handmatige aanpassing in een tekst wordt als paar (was, werd) bewaard. Vanaf vijf paren stelt
   L3 een bijwerking van de stemvelden voor (fase 3).

### 9.3 Waar de stem gebruikt wordt
- De **strategie** krijgt commercieel, stelligheid en oproep.
- De **schrijver** en de **redacteur** krijgen alle stemvelden met de goede en foute zinnen; voorbeelden
  sturen een model sterker dan bijvoeglijke naamwoorden.
- De **merkstemtoets** toetst er regel voor regel tegen.
- **Code** meet wat meetbaar is: zinslengte tegen het doel, aanspreekvorm, verboden woorden en
  clichés, hoe vaak de naam valt.

### 9.4 Controle van het merkdossier van de drie klanten (25 september 2026)

| Veld | Autorijschool Pompert | Hans Verstraaten Hoveniers | Wesley Keeris Installatietechniek |
|---|---|---|---|
| Toon | "Warm, geruststellend, eerlijk, zonder beloftes die we niet waar kunnen maken." | "Nuchter en vakkundig, Brabants hartelijk, geen verkooppraat." | "Zakelijk en betrouwbaar, geen vakjargon zonder uitleg." |
| Aanspreekvorm | je | je | u |
| Vijf schuiven | leeg | leeg | leeg |
| Kennisniveau doelgroep | leeg | leeg | leeg |
| Eigen uitdrukkingen, kernwoorden | leeg | leeg | leeg |
| Onderscheid, USP, kernboodschappen | leeg | leeg | leeg |
| Verboden woorden | 3 | 3 | 2 |
| Voorbeeldzinnen | 3 uitroepen van de site ("Voor ons ben je geen nummer.", "Denk niet in beperkingen, maar in mogelijkheden!") | 3 sitezinnen, waaronder "Wij staan graag voor je klaar!" | 3 sitezinnen, waaronder "Service, vakmanschap en nauwkeurigheid staan bij ons hoog in het vaandel." en een zin met "m.b.t." |
| Persona's | 4, door het onderzoek gemaakt | 3, door het onderzoek gemaakt | 3, door het onderzoek gemaakt |

**Conclusie: het merkdossier dekt de lading niet.** De hele stem rust op één zin per klant. De
voorbeeldzinnen werken bij twee van de drie klanten tegen de opgegeven toon in: "Wij staan graag voor
je klaar!" is de verkooppraat die de hovenier niet wil, en de schrijver nam die zin over op de pagina
voor Best; "hoog in het vaandel" en "m.b.t." zijn het tegendeel van zakelijk zonder jargon. Bij de
installateur, die "geen vakjargon zonder uitleg" vraagt, ontbreekt juist het kennisniveau van de
lezer. **Actie in fase 1 (werkpakket 1):** de adviseur vult de stemvelden van deze drie klanten aan.

### 9.5 Hoe dat er voor twee klanten uit kan zien
Ter illustratie, alleen op bestaande feiten; het echte voorstel komt uit L3 en de adviseur.

**Hans Verstraaten Hoveniers.** Je-vorm; "we" en "onze ploeg"; korte zinnen, gemiddeld 12 tot 14
woorden; antwoord eerst; warm door directheid en gastvrijheid, niet door uitroeptekens of dialect;
bewijs feitelijk en zonder voorbehoud; prijs één keer als bandbreedte met de reden van de spreiding;
geen "ontzorgen", geen "van A tot Z", geen "wij staan graag voor je klaar"; oproep als uitnodiging.

> Nu: "Tuinaanleg met bestrating kost bij ons meestal €12.000 tot €35.000; het gekozen materiaal
> heeft invloed op de prijs. Dat bedrag is een eerste houvast, geen offerte voor jouw tuin."
>
> In deze stem: "Een complete tuin met bestrating kost bij ons meestal tussen de € 12.000 en
> € 35.000. Vooral de stenen die je kiest maken het verschil."

**Wesley Keeris Installatietechniek.** U-vorm; "wij"; middellange zinnen; elke vakterm in dezelfde zin
uitgelegd; zakelijk, geen gevoelswoorden ("zorgeloos", "behaaglijk"); bewijs met cijfers en stellig
(twaalf monteurs, meer dan 1.800 onderhoudscontracten, CO-gecertificeerd volgens de Gasketelwet);
oproep concreet (telefoonnummer en contactpagina).

> Nu: "U wilt uw cv-ketel in Geldrop vervangen en zoekt vóór een offerte een bruikbare
> prijsindicatie: Wesley Keeris Installatietechniek noemt € 2.200 tot € 3.200 inclusief
> installatie. Dat is een eerste houvast, geen prijs voor uw specifieke woning. De beschikbare
> prijsinformatie benoemt niet welke werkzaamheden standaard in de installatieprijs zitten ..."
>
> In deze stem: "Een nieuwe cv-ketel kost bij Wesley Keeris Installatietechniek tussen de € 2.200 en
> € 3.200, inclusief installatie. Welke ketel bij uw woning past, bepalen we samen op basis van uw
> woning, uw energieverbruik en uw wensen. De levertijd is 2 tot 4 weken; de installatie zelf duurt
> één dag."

Wat er precies in de installatieprijs zit, is in die tweede versie geen zin meer maar een vraag aan
de ondernemer (bestemming A).

---

## 10. Plaatspagina's en uniciteit

### 10.1 De plaatsregel
**Besluit van de eigenaar:** een werkgebiedpagina mag geadviseerd worden, maar grote steden houden een
eigen pagina. De regel in code (`lib/plaatsregel.ts`, puur):

| Situatie | Uitkomst |
|---|---|
| Gemeente met minstens 50.000 inwoners (vaste lijst uit CBS-cijfers, in de code) | eigen pagina |
| De vestigingsplaats van het bedrijf | eigen pagina |
| De ondernemer levert minstens twee feiten die alleen over deze plaats gaan | eigen pagina |
| Anders | onderdeel van één werkgebiedpagina, met een eigen alinea en kop per plaats |

De grens van 50.000 inwoners is een besluit van de eigenaar (25 september 2026). In de regio van de
drie klanten vallen Eindhoven, Helmond, Tilburg en 's-Hertogenbosch erboven; Veldhoven (ruim 45.000),
Best, Geldrop, Nuenen en Son en Breugel eronder. Die krijgen alleen een eigen pagina met lokale
feiten of als het de vestigingsplaats is, en anders een alinea op de werkgebiedpagina. De lijst in
code wordt eens per jaar bijgewerkt met de CBS-cijfers. Ook een stadspagina krijgt een eigen hoek; zonder lokaal feit vraagt
de portfolio de ondernemer eerst naar projecten in die stad.

### 10.2 Wat een plaatspagina uniek maakt
- **Echte lokale feiten** van de ondernemer: projecten in die plaats, hoe vaak hij er werkt, hoe snel
  hij er is. De portfolio maakt er een vraag van ("Welke tuinen heb je in Best aangelegd die we mogen
  noemen?").
- **Verifieerbare lokale context** met bron, alleen als die voor de dienst uitmaakt. Nooit gegokt.
- **Een andere lezer of vraag** per plaats, als de meting die laat zien.

### 10.3 Wat de portfolio verdeelt
- **Onderwerpen:** de prijsuitleg uitgebreid op één pagina, op de andere één zin met een link.
- **Bewijs:** niet elke pagina opent met dezelfde ploeg van vijf man.
- **Intentie:** elke URL krijgt één primaire intentie in een register per merk. Een nieuwe pagina met
  dezelfde primaire intentie als een bestaande is een verbetering of een samenvoeging, geen nieuwe
  pagina.

### 10.4 Overlap bewaken
- **Vóór het schrijven:** de strategie krijgt per zusterpagina de hoek en de gekozen feiten mee.
- **Na het schrijven:** naast de bestaande vijfwoordreeksen (`similarity.ts`) een vergelijking op
  dezelfde prioriteitsfeiten (uit de strategie) en dezelfde opbouw (koppen en secties). Hoge overlap
  op beide is een waarschuwing met de zusterpagina erbij.
- **Zoekintenties niet verliezen:** de meetvragen van plaatsen in een werkgebiedpagina blijven aan die
  pagina gekoppeld, zodat de nameting laat zien of het merk er even vaak genoemd wordt.

---

## 11. De FAQ

**Bronnen van vragen,** in volgorde van waarde: bezwaren uit het verkoopgesprek, gemeten vragen
waarop het merk ontbrak, vervolgvragen uit eerdere keuringen, en pas daarna het algemene dossier.

**Een vraag blijft alleen als hij aan alle vier voldoet:**
1. Een echte lezer van deze pagina stelt hem, in de fase waarin hij is.
2. De tekst beantwoordt hem niet al (code meet overlap met de secties).
3. Het antwoord rust op een feit uit het register of op vaste vakkennis met bron.
4. Het antwoord helpt de lezer richting dit bedrijf, of neemt een drempel weg.

Een vraag zonder onderbouwing wordt een vraag aan de ondernemer, geen voorbehoud. Nul vragen is een
geldige uitkomst; hoogstens vijf. Antwoorden: eerste zin het antwoord, hoogstens twee zinnen
toelichting, 30 tot 80 woorden, geen herhaling van een zin uit de tekst.

**Wat dit oplost:** "Welke regels gelden in Best voor het afvoeren van regenwater" en "Hoeveel moet
ik aanbetalen" vallen af op criterium 3; "kopen of huren" valt af op criterium 4 bij een bedrijf dat
niet verhuurt; "Hoe lang lig ik met een kale tuin?" komt erin.

De contractregel "Vraag NIET na wat er in de secties hierboven al beantwoord wordt", die de FAQ tot
restcategorie maakte, vervalt.

---

## 12. Keuring en publicatiepoort

### 12.1 Harde blokkades (de pagina gaat niet naar "klaar")

| Blokkade | Nu |
|---|---|
| Een bewering over het bedrijf zonder feit in het register | bestaat |
| Een betwist feit op de pagina | nieuw |
| Een punt met bestemming A of C staat als zin in de tekst | nieuw |
| Een zin over bronnen of het werkproces ("de beschikbare informatie", "niet vastgelegd", "wordt hier niet genoemd") | bestaat als waarschuwing, wordt blokkade |
| Een uitgesloten onderwerp staat erin | nieuw |
| Verboden woord, verboden onderwerp, concurrent bij naam, adres tegen de instructie in | bestaat |
| De lezer wordt aangezet om aanbieders te vergelijken of het bedrijf na te trekken | bestaat |
| Gemengde aanspreekvorm | bestaat |
| Een prioriteitsfeit uit de strategie ontbreekt | bestaat als bevinding, wordt blokkade |
| Een feit van de vorige versie is verdwenen (`feitbehoud.ts`) | bestaat |
| De eigenaarstoets zegt twee keer op rij "niet publiceren" | nieuw |

### 12.2 Waarschuwingen (de pagina mag door, met een zichtbare melding)
- Lengte meer dan 15 procent boven het budget.
- Meer dan één voorbehoud buiten §7.2, of een voorbehoud direct na een bewijsstuk.
- Hetzelfde feit vaker dan twee keer (bestaat).
- Meer dan één gebiedende zin per 200 woorden die de lezer iets laat regelen.
- Een bewijsstuk uit het voorrangsbewijs ontbreekt.
- De merkstemtoets meldt een stemregel als niet gehaald.
- Hoge overlap met een zusterpagina (§10.4).
- Een FAQ-antwoord korter dan 25 woorden of zonder feit.
- De stem in het merkdossier is niet goedgekeurd.

### 12.3 De publicatiegereedheid (intern, niet voor de klant)

| Dimensie | Gemeten door |
|---|---|
| Feitelijke zekerheid | feitcontrole in code: aandeel beweringen met een bevestigd feit |
| Volledigheid van de bronnen | strategie tegen register: alle kernonderwerpen onderbouwd of bewust weggelaten |
| Merkfit | L9 |
| Natuurlijkheid | L10, plus tellingen in code op voorbehoud, adviestoon en bronpraat |
| Redundantie | code: herhaalde feiten, overlap tussen secties en met de FAQ |
| Specificiteit | L10: zou deze pagina op de site van een concurrent kunnen staan |
| Nut | citeerbaarheidsbeoordelaar: worden de beslisvragen beantwoord |
| Commerciële relevantie | L10: weet de lezer waarom hij dit bedrijf kiest |
| Leesbaarheid | code: zinslengte tegen het stemprofiel, alinealengte |
| SEO | code: titel, meta, kop, intentie, interne links |
| GEO | code plus beoordelaar: openingsantwoord, losstaande zinnen, concrete cijfers, organisatie in de gestructureerde data |
| Publicatiegereedheid | de poort: geen blokkade, en de eigenaarstoets zegt ja |

**Meerdere beoordelaars, geen enkel cijfer.** Eén aanroep die alles deed, gaf in deze app al eens 100
van de 100 op een pagina waarvan dezelfde aanroep schreef dat de hoofdvraag niet beantwoord werd.
Specialisten met één vraag en een eigen maatstaf (stem, register, strategie) geven oordelen die je
kunt narekenen, en het doorslaggevende oordeel is vergelijkend. De bestaande twaalf dimensies en vier
profielen (`quality-dimensions.ts`, `quality-profile.ts`) blijven de administratie; de poort beslist
op blokkades plus het oordeel van L10.

### 12.4 De reparatie
- Gestuurd door de bevindingen van L10 en L9 en de blokkades, in die volgorde van gewicht.
- Bij ontbrekend bewijs is weglaten de enige route; de instructie "nuanceer" in de reparatieopdracht
  (`content.ts`, `REPAIR_SYSTEM` en `quality-repair.ts`) vervalt.
- Hoogstens twee rondes (`REPAIR_MAX` van 3 naar 2); daarna gaat wat openstaat als vraag naar de
  ondernemer, zoals nu.

---

## 13. Het bouwplan

Werkwijze per werkpakket, volgens CLAUDE.md: branch vanaf `main`, migratie eerst, dan code, dan
scherm. Elke wijziging die een uitkomst beïnvloedt krijgt een test in `scripts/test-unit.ts`, elke
wijziging in de samenhang tussen taken een scenario in `scripts/test-chain.ts`. Vóór elke commit
`tsc --noEmit`, `test:unit`, `test:chain` en `build`. Migraties additief en idempotent, via
`apply_migration`, met een regel in `supabase/README.md`. Rekenwerk in pure modules zonder
`server-only` (conventie 2). Elke nieuwe AI-aanroep bewaart zijn ruwe JSON (conventie 8) en controleert
eerst of zijn resultaat al bestaat (conventie 9). De volgende vrije migratie is `0113`.

**Twee aandachtspunten die bij de bouw horen** (geen losse proef, wel verplicht in het werk):

1. **De tijdslimiet per aanroep.** Strategie en eindredactie draaien op Sol met extra denktijd, en een
   aanroep mag hoogstens 150 seconden duren (`CALL_BUDGET_MS`). Daarom legt elke aanroep van
   `content_strategy` en `content_edit` zijn duur vast in de log en in `ai_calls`. De aanroep wordt
   vanaf het begin zo gebouwd dat hij in de achtergrondmodus van de API kan draaien: de taak start de
   aanroep, een vervolgtaak haalt het resultaat op. Die modus gaat aan zodra een van beide in
   productie boven 120 seconden komt, zodat een time-out nooit de duurste aanroep dubbel laat betalen.
   Dit hoort bij WP3 en WP5.
2. **De grens voor grote steden staat op 50.000 inwoners** (besluit eigenaar). De lijst komt uit de
   CBS-cijfers en staat vast in `lib/plaatsregel.ts`; hij wordt eens per jaar bijgewerkt. Dit hoort
   bij WP12.

### Fase 1. De grootste problemen weg

**WP1. De invoer opschonen en de stem van de drie klanten aanvullen**
- *Wat:* de waardeproposities zonder herkomsttaal ("volgens de website", "naar eigen zeggen") en
  zonder dubbelingen de schrijfopdracht in; de bron verbeteren waar ze gemaakt worden. De bestaande
  stemvelden (`audience_knowledge_level`, `signature_phrases`, `identity_keywords`, `differentiator`,
  `usp`, `key_messages`) gaan mee in de schrijfopdracht. De adviseur vult voor de drie klanten de
  stemvelden aan en vervangt de voorbeeldzinnen (§9.4).
- *Bestanden:* nieuw `lib/pipeline/waardeproposities.ts` (puur, opschonen en ontdubbelen); aanpassen
  `lib/pipeline/content.ts` (`buildContentInput`), de prompt die `value_props` maakt
  (`prepare-profile.ts` en het onderzoek dat hem voedt), `brand-fields.ts` (de tekst "gaat niet mee"
  bijwerken).
- *Tests:* unit op het opschonen met de echte zinnen van de drie klanten.
- *Klaar als:* de schrijfopdracht van een echte pagina van elk van de drie merken geen herkomsttaal
  meer bevat en de stemvelden erin staan.

**WP2. Feitenregister en conflictpoort**
- *Wat:* soort, waarde, geldigheid, stand en bewijskracht per feit (L1); conflictdetectie in code plus
  L2; de conflictlijst voor de adviseur; de poort in `content_strategy`.
- *Migratie `0113_feitsoort_en_conflicten.sql`:* kolommen op `brand_facts` (`soort`, `waarde jsonb`,
  `geldt_voor`, `stand`, `bewijskracht`); tabel `fact_conflicts` met RLS alleen voor medewerkers.
- *Bestanden:* nieuw `lib/pipeline/fact-classify.ts` (L1), `lib/pipeline/conflict-detect.ts` (puur,
  kandidaten op soort en waarde), `lib/pipeline/conflict-judge.ts` (L2),
  `lib/schemas/fact-classification.ts`, `lib/schemas/conflict-judge.ts`; aanpassen `factstore.ts`,
  `fact-merge.ts`; scherm bij het merk voor medewerkers (onder `app/(app)/merk/[id]/admin/`) plus een
  API-route met ownership-check (conventie 6).
- *Tests:* unit op kandidaatdetectie (de twee intakeprijzen van de rijschool worden kandidaat, L2 met
  een vast oordeel maakt er varianten van); keten: een pagina met een betwist prioriteitsfeit wordt
  niet geschreven en start opnieuw na oplossing; een betwist feit dat niet nodig is laat de pagina door.
- *Klaar als:* op de feitenbanken van de drie merken gedraaid, en elk gevonden conflict met de hand
  nagelopen.

**WP3. De paginastrategie**
- *Wat:* taaksoort `content_strategy` met L5 (en L6 erbij, zie WP7); de vangnetten op de strategie;
  de werksoort `redactioneel` (Sol, denktijd hoog); de duurmeting per aanroep.
- *Migratie `0114_paginastrategie_en_redactie.sql`:* op `content_pieces` de kolommen `strategy_json`,
  `edit_log_json`, `readiness_json`.
- *Bestanden:* nieuw `lib/pipeline/page-strategy.ts`, `lib/schemas/page-strategy.ts`,
  `lib/pipeline/strategie-check.ts` (puur), `lib/lengtebudget.ts` (puur), de achtergrondmodus in
  `lib/openai/structured.ts` en `lib/openai/client.ts`; aanpassen
  `lib/jobs/types.ts`, `lib/jobs/handlers.ts` (`content_plan` plant `content_strategy` in plaats van
  `content_draft`), `lib/jobs/dedupe.ts`, `lib/openai/sampling.ts`, `lib/openai/models.ts`
  (commentaar); de schrijfopdracht (`writer-brief.ts`) blijft staan als terugval tot WP16.
- *Tests:* unit op elk vangnet (onbestaand feit, betwist feit, bestemming B zonder reden, budget buiten
  grenzen, meer dan zes prioriteitsfeiten); keten: `content_plan` → `content_strategy` →
  `content_draft`, en hervatten zonder dubbele aanroep.
- *Klaar als:* de strategie voor de kostenpagina van de installateur en de pagina voor Best geen
  consumentenadviessecties meer kiest en een budget onder de 800 woorden zet; de duur van elke
  strategieaanroep vastligt; en de achtergrondmodus werkt (aanroep starten, resultaat in een
  vervolgtaak ophalen, zonder dubbele betaling bij opnieuw proberen).

**WP4. De schrijver op de strategie**
- *Wat:* de schrijfopdracht wordt de strategie plus de afgeleide opbouw plus alleen de gekozen feiten;
  weglaten mag en wordt vastgelegd in `weggelaten`; de dekkingscontrole meet de gekozen onderwerpen en
  de uitgesloten onderwerpen in plaats van 85 procent van het contract.
- *Bestanden:* aanpassen `lib/pipeline/content.ts` (`CONTENT_SYSTEM` regel 10 en 11,
  `buildContentInput`, `buildPlanBlock` vervalt als opdracht), `lib/pipeline/contract-format.ts`
  (`formatContract` gaat niet meer naar de schrijver), `lib/pipeline/content-coverage.ts`,
  `lib/schemas/content-piece.ts` (`weggelaten`); `content_draft` roept de beoordelaars niet meer aan.
- *Tests:* unit op de nieuwe dekking; keten: een onderwerp zonder bron komt niet in de tekst en geeft
  geen blokkade.
- *Klaar als:* de schrijfinvoer van een echte pagina minder dan 9.000 tokens is (nu gemiddeld 14.100)
  en de tekst geen sectie heeft die niet in de strategie staat.

**WP5. De eindredactie**
- *Wat:* taaksoort `content_edit` met L8, de vangnetten op de redactie, en de volledige keuring
  daarna (verhuist uit `content_draft`).
- *Bestanden:* nieuw `lib/pipeline/editorial-pass.ts`, `lib/schemas/editorial-pass.ts`,
  `lib/pipeline/redactie-check.ts` (puur), de achtergrondmodus uit WP3; aanpassen `lib/jobs/handlers.ts` (`content_draft` →
  `content_edit` → eventueel `content_revise`), `lib/pipeline/quality-run.ts`.
- *Tests:* unit: een redactie die een nieuw bedrag toevoegt wordt teruggedraaid naar de vorige versie;
  een verdwenen kernfeit is een blokkade; keten: draft → edit → revise, en hervatten na een time-out.
- *Klaar als:* "maar dat zegt op zichzelf niets over het aantal zwemvijvers" en de prijsband vier keer
  op Nuenen bij een nieuwe versie weg zijn, en de duur van elke redactieaanroep vastligt, met dezelfde
  achtergrondmodus als bij WP3.

**WP6. Onzekerheid en bronpraat als blokkade**
- *Wat:* de bestemmingen A, B en C uit de strategie worden nagerekend in de tekst; bronpraat wordt een
  blokkade; de reparatie verliest "nuanceer"; `REPAIR_MAX` naar 2.
- *Bestanden:* nieuw `lib/pipeline/onzekerheid.ts` (puur); aanpassen `content-gate.ts`
  (`checkSourceTalk` naar blokkade), `quality-issue.ts`, `quality-repair.ts`, `content.ts`
  (`REPAIR_SYSTEM`, `REPAIR_MAX`), `content-panel.ts` (de feitelijkheidsbeoordelaar jaagt niet meer
  los op "algemene uitleg die als belofte gelezen kan worden"; die vraag gaat met een gesloten
  definitie naar de feitcontrole).
- *Tests:* unit met de echte zinnen uit §1 ("is niet vastgelegd", "staat niet als vaste werkwijze
  vast", "valt niet af te leiden", "De beschikbare prijsinformatie benoemt niet").
- *Klaar als:* geen van de zinnen uit de tabel in §14.3 in een nieuwe versie terugkomt, ook niet in
  andere woorden (nagelopen door de eigenaarstoets en met de hand).

**WP7. De FAQ volgens de vier criteria**
- *Wat:* L6 in `content_strategy`; de filter in code; de contractregel die de FAQ tot restcategorie
  maakte vervalt.
- *Bestanden:* nieuw `lib/pipeline/faq-selectie.ts`, `lib/pipeline/faq-criteria.ts` (puur),
  `lib/schemas/faq-selection.ts`; aanpassen `content-contract.ts` (regel 3), `faqblokken.ts`.
- *Tests:* unit met de FAQ-vragen van Best en de kostenpagina.
- *Klaar als:* geen FAQ-antwoord meer zonder feit of vaste vakkennis.

**Einde fase 1:** documentatie bijwerken (§15), een logboekalinea met de cijfers, en de nareken-plicht
uit §14.2.

### Fase 2. De stem en de keuring

**WP8. De schrijfstijl in het merkdossier**
- *Wat:* de nieuwe stemvelden (§9.1), L3 als voorstel, goedkeuring door de adviseur, de waarschuwing
  bij een dunne stem, en de meetbare stemregels in code.
- *Migratie `0115_schrijfstijl_merkdossier.sql`:* de `voice_`-kolommen op `profiles`.
- *Bestanden:* nieuw `lib/pipeline/voice-proposal.ts` (L3), `lib/schemas/voice-proposal.ts`,
  `lib/stemregels.ts` (puur: zinslengte, clichés, naam, aanspreekvorm); aanpassen `brand-fields.ts`,
  `lib/profile-editable.ts`, het merkprofielscherm (`app/(app)/merk/[id]/merkprofiel/`), de
  schrijfopdracht en de redactie.
- *Tests:* unit op de stemregels; keten: een voorstel dat niet is goedgekeurd gaat niet mee.
- *Klaar als:* de drie klanten een goedgekeurde stem hebben en "Wij staan graag voor je klaar" niet
  meer op een nieuwe pagina van de hovenier staat.

**WP9. Eigenaarstoets en merkstemtoets op Sol, en de poort daarop**
- *Wat:* L9 en L10 vervangen de redactie- en vakmanschapsbeoordelaar; de poort beslist op blokkades
  plus L10; de reparatie stuurt op L10 en L9.
- *Bestanden:* aanpassen `lib/pipeline/content-panel.ts`, `lib/schemas/content-panel.ts`,
  `quality-run.ts`, `quality-score.ts`, `quality-dimensions.ts` (de bronnen per dimensie),
  `content-repair-decision.ts`.
- *Tests:* unit op de poortbeslissing; keten: twee keer "niet publiceren" is een blokkade.
- *Klaar als:* de eigenaarstoets op de pagina's van de doorlichting dezelfde volgorde geeft als de
  blinde lezers (rangcorrelatie minstens 0,6).

**WP10. Bewijsbank en stelligheid**
- *Wat:* de bewijsbank uit het register; standaard stellig; de voorrang per pagina.
- *Bestanden:* aanpassen `kernbewijs.ts`, `bewijspunten.ts`, de strategie.
- *Klaar als:* twaalf monteurs en 1.800 onderhoudscontracten op de Geldrop-pagina van de installateur
  staan, zonder voorbehoud erachter.

**WP11. Zusterpagina's in de strategie en de overlapcontrole**
- *Wat:* de strategie krijgt hoek en gekozen feiten van de zusterpagina's; de overlapcontrole op feiten
  en opbouw.
- *Bestanden:* aanpassen `page-strategy.ts`, `similarity.ts` (of een nieuwe pure module ernaast).
- *Klaar als:* Best en Nuenen bij een nieuwe versie een andere opbouw en ander voorrangsbewijs hebben.

**Einde fase 2:** documentatie, logboek, nareken-plicht.

### Fase 3. Over pagina's heen, en opruimen

**WP12. Portfolio en plaatsregel**
- *Wat:* L4 per plan, de plaatsregel (§10.1), het intentieregister per merk, het advies samenvoegen
  of eerst vragen, en de werkgebiedpagina als paginasoort.
- *Migratie `0116_portfolio.sql`:* `assignment_json` op `planned_pages`, en een intentiekolom per
  pagina.
- *Bestanden:* nieuw `lib/pipeline/portfolio.ts`, `lib/schemas/portfolio.ts`, `lib/plaatsregel.ts`
  (puur, met de vaste CBS-lijst); aanpassen `content-plan.ts`, `plan-fill.ts`, `recommendation.ts`,
  het planscherm.
- *Klaar als:* een plan met Best, Nuenen, Son en Breugel en Eindhoven één werkgebiedpagina en één
  Eindhoven-pagina oplevert, of losse pagina's met elk een lokaal feit.

**WP13. Lokale vragen aan de ondernemer** vanuit de portfolio, via de bestaande vragenroute.

**WP14. Leren van handmatige aanpassingen:** de paren (was, werd) bewaren en L3 een bijwerking laten
voorstellen.

**WP15. Getallen bijstellen:** lengtebudget en drempels op de gemeten rondes. De grens van 50.000
inwoners is een besluit van de eigenaar en verandert alleen op zijn verzoek.

**WP16. Opruimen:** de schrijfopdracht (`writer-brief.ts`, `schrijfopdracht.ts`) vervalt als stap; de
kolom `writer_brief_json` blijft bestaan voor oude pagina's (additief, nooit `drop`); de
formuleringlijsten (`SLAP`, `VOORBEHOUD`, de families van `checkSourceTalk`) terug naar een klein
vangnet; `docs/contentpijplijn-overdracht.md` herschrijven.

### Stand van de bouw

| Werkpakket | Stand |
|---|---|
| WP3 | Code klaar, migratie `0114` op productie (25 september 2026): taak `content_strategy` tussen plannen en schrijven, L5 op Sol met denktijd hoog (werksoort `redactioneel`), de controles in code, de conflictpoort met wachten en vanzelf herstarten, de duur van elke aanroep in `ai_calls.duration_ms`, en de achtergrondmodus (starten, in een vervolgtaak ophalen, nooit dubbel starten), die aangaat zodra een aanroep boven 120 seconden komt. De strategie wordt bewaard maar stuurt de schrijver pas vanaf WP4. Afwijking: het dossier labelt zijn vragen nog niet als beslis-, oriëntatie- of randvraag; de strategie doet die weging zelf. "Klaar als" (geen consumentenadviessecties en een budget onder de 800 woorden op de kostenpagina van de installateur en op Best, en de gemeten duur) kan pas na merge worden nagerekend |
| WP2 | Code klaar, migratie `0113` op productie (25 september 2026): feiten indelen (L1), kandidaat-conflicten in code, beoordelen (L2), het conflictscherm `admin/feiten`, en betwiste feiten van de kaart. De poort per pagina (`houdtPaginaTegen()`) wordt in WP3 aangesloten. "Klaar als" pas na de eerste run op de drie merken en het nalopen van elk gevonden conflict; dat kan pas als de code op productie staat |

### Volgorde en afhankelijkheden
WP1 en WP2 kunnen parallel. WP3 hangt aan WP2 (de poort) en levert wat WP4, WP5, WP6 en WP7 nodig
hebben. WP8 kan starten zodra fase 1 staat; WP9 hangt aan WP8 (de stem is de maatstaf). WP12 hangt aan
WP3 en WP11.

---

## 14. Wanneer een pagina publicatiewaardig is

### 14.1 De toets
**Zou de ondernemer deze pagina zonder aanvullende copywriting op zijn eigen website publiceren?**
Per versie beantwoord door de eigenaarstoets, en na elke fase door de blinde lezers van de
doorlichting. Een pagina is publicatiewaardig als het antwoord "zo" is en de poort geen blokkade
heeft.

**Juist**
1. Elke bewering over het bedrijf rust op een feit uit het register.
2. Geen betwist feit.
3. Geen zin over bronnen, informatie of het werkproces.

**Gekozen**
4. De opening beantwoordt de hoofdvraag in hoogstens twee zinnen, met een concreet feit.
5. De lezer weet binnen de eerste vijfde van de tekst waarom hij dit bedrijf zou kiezen.
6. Elke sectie hoort bij een onderwerp dat de strategie koos; geen uitgesloten onderwerp.
7. Lengte binnen het budget, hoogstens 15 procent erboven.
8. Geen feit vaker dan twee keer; de prijs hoogstens één keer met toelichting.

**Stellig waar het kan**
9. Het voorrangsbewijs staat erin, zonder voorbehoud erachter.
10. Hoogstens één voorbehoud buiten §7.2, en geen voorbehoud direct na een bewijsstuk.
11. Geen zin die de lezer aanzet om aanbieders te vergelijken, offertes na te lopen of het bedrijf na
    te trekken.

**Van dit bedrijf**
12. Aanspreekvorm consistent.
13. De merkstemtoets meldt geen stemregel als duidelijk niet gehaald.
14. Geen cliché uit de stemvelden.
15. De naam in de eerste alinea en de afsluiting, niet aan het begin van andere alinea's.
16. De eigenaarstoets vindt hem beter dan de huidige sitepagina of de vorige versie.

**Uniek en nuttig**
17. Een plaatspagina voldoet aan de plaatsregel en heeft een eigen hoek.
18. Geen hoge overlap met een zusterpagina op feiten en opbouw tegelijk.
19. Elke FAQ-vraag voldoet aan de vier criteria van §11.

**Vindbaar**
20. Metatitel en -beschrijving binnen de grenzen, met plaats en dienst waar dat de intentie is.
21. Minstens één losstaand citeerbare zin per sectie, met een concreet feit.
22. De organisatie in de gestructureerde gegevens.

### 14.2 De nareken-plicht per fase
Geen losse proef vooraf (besluit eigenaar). Wel, na elke fase, zoals conventie 10 vraagt: dezelfde
drie merken van de doorlichting opnieuw door de keten, met hetzelfde waarheidsdossier, dezelfde
antwoorden van de klant en dezelfde blinde lezers en vragenlijst
(`docs/tasks/kwaliteitsdoorlichting/`), en de kosten per pagina nagerekend op `ai_calls`.

| Maat | Nulmeting | Nu | Na fase 1 | Na fase 2 | Na fase 3 |
|---|---|---|---|---|---|
| Gemiddeld copywritercijfer | 4,1 | 4,9 | 6,5 of hoger | 7,0 of hoger | 7,5 of hoger |
| Ondernemer publiceert zo | 0 van 16 | 4 van 21 | de helft | 70 procent | 80 procent |
| Ondernemer publiceert niet | 5 van 16 | 6 van 21 | hoogstens 2 | 0 | 0 |
| Zinnen over bronnen of werkproces | niet geteld | ruwe telling 61 en 63 indekformuleringen bij hovenier en installateur | 0 | 0 | 0 |
| Kosten per artikel | | ongeveer $0,16 tot $0,18 | ongeveer $0,37 | ongeveer $0,37 | ongeveer $0,37 |

### 14.3 De zinnen die weg moeten

| Tekst | Zin | Werkpakket |
|---|---|---|
| Installateur, kosten | "De beschikbare prijsinformatie benoemt niet welke werkzaamheden standaard in de installatieprijs zitten" | WP3, WP6 |
| Installateur, kosten | "die zegt op zichzelf niets over welke afzonderlijke werkzaamheden in een installatieprijs zijn opgenomen" | WP5, WP10 |
| Installateur, woningbezoek | "Welke van deze punten tijdens een ketelbezoek worden bekeken, staat niet als vaste werkwijze vast." | WP4, WP6 |
| Installateur, Geldrop | "dat is een eerste beeld van de planning, geen garantie voor iedere woning" | WP5, WP10 |
| Installateur, Geldrop | twaalf monteurs en 1.800 contracten ontbreken | WP10 |
| Hovenier, Best | "Vergelijk dezelfde werkzaamheden en afwerking" als sectie | WP3 |
| Hovenier, Best | FAQ over regenwater en aanbetaling | WP7 |
| Hovenier, Best | "Wij staan graag voor je klaar." | WP1, WP8 |
| Hovenier, Nuenen | de prijsband vier keer | WP5 |
| Hovenier, Best en Nuenen | dezelfde opbouw en dezelfde feiten | WP11, WP12 |
| Hovenier, zwemvijver | "Wij hebben meer dan 35 jaar ervaring, maar dat zegt op zichzelf niets ..." | WP5, WP10 |
| Rijschool, intake | "De beschikbare informatie over de intakeprijs spreekt elkaar tegen" | WP2 |

---

## 15. Documentatie die meegaat

Per fase, in dezelfde commit als de code (CLAUDE.md):
- `docs/logbook.md`: een alinea met datum en cijfers per afgeronde fase.
- `docs/architecture.md`: de nieuwe taaksoorten, de AI-aanroepen en de kostenrekensom in §6.
- `docs/processtappen-nieuwe-pagina.md`: fase 9 tot en met 11 herschrijven naar strategie, schrijven,
  redactie en keuring.
- `docs/contentpijplijn-overdracht.md`: bijwerken in WP16.
- `supabase/README.md`: de migraties `0113` tot en met `0116`.
- `docs/merkstrategie.md` §30: nagaan of een belofte over teksten verandert.
- Dit document gaat uit `docs/tasks/` zodra fase 3 af is; de besluiten staan dan in het logboek.

---

## 16. Risico's en maatregelen

| Risico | Maatregel |
|---|---|
| De strategie of de redactie op denktijd hoog loopt tegen de tijdslimiet van 150 seconden | duurmeting per aanroep; boven 120 seconden de achtergrondmodus van de API (§4.3) |
| De redacteur haalt een juist feit weg (zoals de reparatieknop bij punt 50 en 62) | `feitbehoud.ts` en de kernfeitcontrole op elke redactie; een verdwenen feit is een blokkade |
| Kortere pagina's worden minder vaak geciteerd | de nameting na publicatie per pagina (bestaat); de lengtegetallen zijn een startwaarde (WP15) |
| Een werkgebiedpagina werkt in AI-antwoorden slechter dan losse plaatspagina's | meetvragen blijven per plaats gekoppeld; grote steden houden altijd een eigen pagina |
| De adviseur heeft geen tijd voor stem en conflicten | een voorstel om goed te keuren in plaats van een leeg formulier; waarschuwing in plaats van blokkade bij een dunne stem |
| Sol beoordeelt tekst in zijn eigen stijl te gunstig | vaste lijsten per toets, een vergelijkend oordeel, en de blinde lezers als onafhankelijke nareken-plicht per fase |
| Kosten lopen op boven $0,50 per artikel | de kostencontrole per pagina bestaat (`bewaakPaginaBudget` in `content.ts`, drempel €1); de rekensom na fase 1 in `architecture.md` §6 |
