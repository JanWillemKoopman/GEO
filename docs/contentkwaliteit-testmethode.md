# Contentkwaliteit testen: de standaardmethode

> **Wat dit is.** De vaste, herhaalbare methode om te testen of de contentketen (hoofdstuk 5 tot en
> met 17 van `zo-werkt-orbit-engine.md`) goede, klantgerichte pagina's schrijft, met een externe
> copywriter als beoordelaar. Dit is geen eenmalige actie: elke ronde (een nieuwe klant, een nieuwe
> versie van de pijplijn, een verificatie na een wijziging) volgt dezelfde stappen, zodat de
> uitkomsten van verschillende rondes met elkaar te vergelijken zijn. §9 houdt de rondes bij.
>
> **Verhouding tot eerder werk.** Er is al een interne kwaliteitsdoorlichting gedraaid met drie merken
> en Claude als "blinde lezer" (`docs/tasks/kwaliteitsdoorlichting-stappen.md`,
> `docs/tasks/bevindingen-kwaliteitsdoorlichting.md`). Die test is waardevol maar heeft een blinde
> vlek: een AI-beoordelaar deelt de aannames van de AI-schrijver. Deze methode vult dat aan met een
> menselijke vakschrijver die niets van de pijplijn weet en alleen het resultaat beoordeelt zoals een
> klant of een lezer dat zou doen. Beide toetsen blijven bestaan, dit is geen vervanging.
>
> **Wie voert wat uit.** Claude Code doorloopt §2 tot en met §4 zelfstandig: klant zoeken en
> aanmaken, gesprek invullen, cluster opzetten, meetvragen goedkeuren, contentplan vrijgeven,
> brief-vragen beantwoorden, laten schrijven, klantdocumenten opstellen. Er is geen echte testklant
> beschikbaar, dus Claude Code speelt onvermijdelijk ook de rol van de klant, met de zorgvuldigheid
> uit §3.1. §5 tot en met §8 (versturen naar de copywriter, feedback verwerken, aan Claude Code
> voorleggen, verifiëren) blijven bij de eigenaar.

---

## 0. Het uitgangspunt, en waar het geen harde regel is

De vorige contentketen is stukgelopen doordat elke verbeterronde er een stap, een controle of een
beoordelaar bij bouwde, tot de schrijver vastzat. Daarom is het **uitgangspunt** van deze methode:
kijk eerst hoe de bestaande stappen precies zijn ingericht (welke instructie, welke prompt, welke
controle) en maak die beter, in plaats van er een nieuwe stap naast te zetten. Dat is de
standaardaanpak, niet alleen bij twijfel.

Dit is bewust geen absoluut verbod. Als een bevinding overtuigend laat zien dat er zonder een nieuwe
stap, een nieuwe AI-aanroep of iets anders nieuws geen wezenlijke kwaliteitsverbetering te halen is,
mag dat gebouwd worden. De lat daarvoor ligt hoog: het moet aantoonbaar zijn, met de verificatie uit
§8 (voor en na dezelfde criteria bij dezelfde copywriter), niet een aanname dat het wel zal helpen.
Bij twijfel geldt het uitgangspunt: eerst proberen binnen een bestaande stap op te lossen, en alleen
naar iets nieuws grijpen als dat écht niet werkt.

`docs/tasks/contentketen-opnieuw.md` §3 blijft daarnaast gelden als de eigen, eerder vastgelegde
grens van de contentketen (bijvoorbeeld: geen cijfer als oordeel over een tekst, code controleert
alleen harde beweringen en mechanische regels, niet stijl of toon). Die grens gaat over hoe de
contentketen als geheel is ontworpen en staat los van deze methode; wijk je daar toch van af, dan is
dat een besluit voor de eigenaar, net als elke wijziging aan die grens.

---

## 1. Doel en maatstaf

Doel: vaststellen waar de pijplijn structureel kwaliteit laat liggen bij het schrijven van pagina's,
op basis van een externe, onafhankelijke beoordeling, en dat omzetten in gerichte verbeteringen aan
bestaande stappen. Niet: elk los artikel individueel oplappen.

**De maatstaf ligt hoog, met opzet.** De copywriter vergelijkt niet met "is dit oké voor
automatisch gegenereerde tekst", maar met het niveau van een professionele copywriter die de klant
zelf zou inhuren om deze pagina te schrijven. De hoofdvraag is telkens: zou je dit publiceren op de
website van de klant? Zo niet, is het met wat bijschaven en finetuning te redden, of zit het echt
onder de maat en zou een vakschrijver hier opnieuw beginnen? Dat onderscheid (bijna klaar versus
fundamenteel niet goed) is minstens zo belangrijk als het cijfer zelf, want het bepaalt of een
patroon om een kleine bijsturing vraagt of om iets groters.

De copywriter beoordeelt vanuit het perspectief van de klant en de bezoeker, niet vanuit de
pijplijn: is dit de kwaliteit van een vakcopywriter, is de pagina compleet (mist er iets relevants,
ook als dat niet direct uit de meetvraag komt waarvoor de pagina is voorgesteld), en vindt een
bezoeker snel waarvoor hij komt (§4).

---

## 2. De matrix, in twee fases

18 content-items over drie klanten, bewust gekozen op variatie in plaats van willekeur. Meer
clusters of meer artikelen per klant voegt vooral herhaling toe; meer *soorten* situaties leggen
meer bloot.

**Waarom in fases.** Dit is de eerste keer dat deze methode draait. Het klantdocument-sjabloon
(§4), de rubriek en de kosten- en tijdschatting zijn nog niet in de praktijk getoetst. Alles in één
keer draaien is een gok op de opzet zelf: blijkt de rubriek onduidelijk of het sjabloon onhandig,
dan is dat pas ontdekt na de volle ronde en het volle budget.

### Fase 1: pilot met klant A

Doorloop §3 en §4 volledig, maar alleen voor klant A (3 clusters, 2 artikelen, 6 content-items).
Stuur dat ene klantdocument naar de copywriter en beoordeel, vóór je verder gaat met klant B en C:
- Is het klantdocument-sjabloon zelfstandig genoeg, of moet de copywriter iets terugvragen?
- Is de rubriek duidelijk, levert ze bruikbare, specifieke feedback op (niet alleen cijfers)?
- Kloppen de kosten en de doorlooptijd ongeveer met de schatting in §3?

Pas het sjabloon of de rubriek aan waar dat uit blijkt, en leg die aanpassing vast in de
uitvoeringslog (§9), zodat een latere ronde weet welke versie is gebruikt.

### Fase 2: klant B en C

Zelfde methode, met het (eventueel bijgewerkte) sjabloon uit fase 1.

### Toekomstige rondes

Deze methode is de standaard om een nieuwe klant, een nieuwe pijplijnversie, of een verificatie na
een wijziging te testen (zie ook `CLAUDE.md`). Herhaal §2 tot en met §8 ongewijzigd; alleen de
klantprofielen en het aantal klanten per ronde mogen verschillen naar wat er getest moet worden. Een
verificatieronde (§8) mag kleiner zijn, bijvoorbeeld één klant of één cluster in plaats van de volle
matrix.

### 2.1 De drie klantprofielen

**Claude Code zoekt en kiest de drie bedrijven zelf**, zonder dat de eigenaar namen aanlevert. Dat
moeten wel **echt bestaande** bedrijven zijn: het onderzoek in hoofdstuk 6 leest de echte website
uit (aanbod, feiten, structuur), en een verzonnen bedrijf zonder site levert daar niets op.

**Het gesprek, de brief-antwoorden en dus de klant zelf worden door Claude Code verzonnen.** Dat is
geen tekortkoming die weggewerkt moet worden, het is de realiteit zolang er geen echte testklant
beschikbaar is. Wat daarbij hard staat, om te voorkomen dat de uitkomst zichzelf bevestigt:

- **Houd per item bij hoe rijk of specifiek het verzonnen antwoord daadwerkelijk was**, op een
  simpele schaal (rijk, gemiddeld, summier), los van het profiel-niveau van de klant als geheel. Een
  klant met het profiel "rijk" kan bij één brief-vraag toch een dun antwoord krijgen, en dat moet
  apart geregistreerd worden. Dit log is voor intern gebruik, niet voor de copywriter, en is nodig om
  in §6 een inputprobleem te kunnen onderscheiden van een pijplijnprobleem: klinkt een pagina
  generiek terwijl de verzonnen input juist rijk en specifiek was, dan is dat een sterke aanwijzing
  voor een echt probleem in de schrijf- of briefstap. Klinkt een pagina generiek terwijl de input
  zelf al dun was, dan zegt dat vooral iets over deze test, niet over de pijplijn.

Voor elk van de drie bedrijven controleert Claude Code zelf, vóór het aanmaken:
- het bestaat echt en de website is bereikbaar (met een korte controle, geen aanname);
- het overlapt niet met de merken die al in de database staan (installateur, fysiotherapie,
  autodealer, retail, dakdekker, tweede fysiopraktijk, en de eventuele bedrijven van een eerdere
  ronde van deze methode);
- het past bij het profiel in de tabel (sector, lokaal of landelijk, aard van het aanbod).

Elk profiel test een ander deel van de keten:

| Profiel | Gesprek (hoofdstuk 7) | Werkgebied | Waarom dit profiel |
|---|---|---|---|
| **Klant A: rijk** | Uitgebreid ingevuld: volle "Verhalen", 2 tot 3 stemvoorbeelden, concrete bezwaren en bewijs | Lokaal | Beste-geval scenario. Toetst of de pijplijn goede input ook echt benut. |
| **Klant B: gemiddeld** | Redelijk ingevuld, maar geen stemvoorbeelden en een kort "Verhalen"-veld | Landelijk | Realistisch gemiddelde. De meeste echte klanten zitten hier, niet bij A. |
| **Klant C: zwak** | Bewust summier: "Verhalen" leeg of één regel, weinig antwoorden op de brief-vragen in stap 14 | Lokaal | Test hoe de pijplijn degradeert bij zwakke input. Dit scenario komt in de praktijk zeker voor en moet netjes verlopen, niet naar een onbruikbare pagina leiden. |

⚠️ Klant C is geen kunstgreep om de app te laten falen. Het is een realistisch scenario (drukke
ondernemer die weinig tijd in het gesprek steekt), en de vraag is juist of de pijplijn daar
verantwoord mee omgaat: liever een kortere, feitelijk juiste pagina dan een lange met verzonnen
diepgang.

### 2.2 De drie clusters per klant

Ook hier op verschil kiezen, niet op wat het makkelijkst een cluster oplevert:

1. Een cluster met een spoed- of hoge-koopintentie-vraag (korte klantreis, veel concreet bewijs nodig).
2. Een cluster met een overwogen aankoop (lange klantreis, meer uitlegbehoefte).
3. Een cluster waarvan de klant al een bestaande, zwakke pagina heeft, zodat er minstens één
   verbeterpagina in de matrix zit naast nieuwe pagina's (hoofdstuk 11 en 13 behandelen die twee
   paden apart, en de brief krijgt dan andere input).

### 2.3 De twee artikelen per cluster

Beide uit hetzelfde rapport, in dezelfde maand vrijgegeven, zodat ze na elkaar voorbereid worden
(hoofdstuk 13: "de pagina's van een maand worden na elkaar voorbereid"). Dat test specifiek of het
tweede artikel niet op het eerste gaat lijken, wat een bekend risico is.

**Minder dan twee aanbevelingen in een cluster** (besloten 29 september 2026, na fase 1). Scoort een
merk in een cluster al goed, dan levert het rapport soms maar één aanbeveling op; bij klant A
gebeurde dat in het cluster over slimme sloten. Verzin dan niets, maar vul aan met een aanbeveling
uit een ander cluster van hetzelfde merk. Kies daarbij bij voorkeur het pad dat nog ontbreekt in de
matrix van deze klant (een nieuwe pagina of een verbeterpagina, §2.2 punt 3), en anders de
eerstvolgende op prioriteit. Noteer de aanvulling in het log; de toets "lijkt het tweede artikel op
het eerste" vervalt dan voor dat cluster.

---

## 3. Hoe een ronde in de app wordt uitgevoerd, volledig door Claude Code

Via de gewone weg, niet rechtstreeks in de database. Reden: zie `docs/tasks/benchmarkronde-twee-klanten.md`
§0, onverkort van toepassing. Een merk dat via SQL ontstaat heeft geen onderzoek, geen feitenlaag en
geen van de stappen waar deze test juist over gaat. Dat betekent hier: via de echte routes van de app
(zoals `scripts/live.ts` dat al doet, ingelogd als een testconsultant-account), niet via een losse
migratie of een handmatige insert.

**Geen mens tussendoor.** Normaal wisselen bij deze reis een consultant en een klant elkaar af.
Claude Code speelt hier allebei de rollen, per stap:

| Stap | Rol die Claude Code speelt | Zorgvuldigheid die daarbij hoort |
|---|---|---|
| Merk aanmaken | consultant | Alleen de drie velden, zie §2.1 voor de bedrijfskeuze |
| Gesprek invullen | consultant én klant | Antwoorden passen bij het profiel (§2.1), zie §3.1 voor hoe te verzinnen |
| Meetvragen goedkeuren | consultant | **Eerst kritisch lezen** voordat bevestigd wordt: geen eigen merknaam, geen concurrent bij naam, past het werkgebied? Dit is precies de controle die een consultant hoort te doen, dus overslaan is geen optie |
| Contentplan vrijgeven | consultant | De twee hoogst geprioriteerde aanbevelingen per cluster, geen handmatige selectie op iets anders |
| Brief-vragen beantwoorden | klant | Zie §3.1 |
| Beoordelen of het artikel goed genoeg is om te bewaren | (geen rol, dit doet de app zelf) | Niet ingrijpen: het is juist de bedoeling dat de pijplijn zelf beoordeelt en desnoods herschrijft |

Volgorde per klant:

1. Merk aanmaken (drie velden), onderzoek laten doorlopen (ongeveer 7,5 minuut).
2. Het gesprek invullen volgens het profiel uit §2.1, met bron `gesprek`.
3. Drie clusters aanmaken volgens §2.2, meetvragen kritisch nalezen en bevestigen (eerste bewuste
   stop, één per cluster).
4. Wachten op meting en rapport.
5. Per cluster de twee hoogst geprioriteerde aanbevelingen kiezen, in het contentplan inplannen, de
   maand vrijgeven (tweede bewuste stop).
6. De brief-vragen beantwoorden zoals de klant uit het profiel dat zou doen: bij klant A uitgebreid en
   concreet, bij klant C kort en met bewust overgeslagen vragen waar de klant het antwoord niet zou
   weten. Nooit een cijfer of feit verzinnen dat niet in het profiel staat; een overgeslagen vraag is
   een geldig resultaat.
7. Laten schrijven. De herschrijving overschrijft de eerste versie in de app, maar beide blijven
   volledig bewaard in de AI-registratie en zijn op te halen via `GET /api/beheer/spoor/<profiel>`
   (§4 en §6 hebben ze allebei nodig). Liggen publicatiedata verder dan tien dagen weg, gebruik dan
   "Nu laten schrijven" (`actie: schrijf_nu`); die slaat alleen de datum over, nooit de vragen.
8. Elke stap loggen (welk merk, welk cluster, welke keuze, met tijdstip, en de inputrijkheid per
   antwoord uit §2.1), net als in `docs/tasks/benchmarkronde-twee-klanten.md` §7, zodat achteraf te
   zien is wat er gebeurd is en waarom.

### 3.1 Hoe Claude Code creatief invult zonder een echte klant

- **De website is de enige harde bron.** Alles wat de app zelf uit de site haalt (aanbod, feiten,
  contactgegevens) blijft ongewijzigd; daar wordt niets aan toegevoegd of verzonnen.
- **Het gesprek en de brief-vragen zijn waar de creativiteit nodig is**, want die vragen precies naar
  wat niet op een website staat (bezwaren, doelen, tarieven, verhalen). Verzin daar plausibele
  antwoorden die passen bij de sector en bij het profiel (rijk, gemiddeld, zwak uit §2.1).
- **Elk verzonnen antwoord wordt gelogd**, met erbij hoe rijk het antwoord is (§2.1). Dat log is voor
  intern gebruik en gaat niet mee naar de copywriter (§4 vraagt hem als lezer te oordelen, niet als
  tester van een AI-systeem).
- **Nooit publiceren.** De geschreven artikelen zijn testmateriaal over een echt bestaand bedrijf met
  deels verzonnen specifieke feiten (prijzen, garanties, bedrijfsregels). Ze gaan nooit online, worden
  niet als "live" gemarkeerd in de app, en er wordt geen echte e-mail naar het bedrijf of een
  contactpersoon verstuurd (staat toch al standaard uit, `EMAILS_ENABLED`).
- **Bij twijfel: overslaan, niet gokken.** Een brief-vraag waarvan geen redelijk antwoord te verzinnen
  is zonder een concreet cijfer te verzinnen dat als echt zou kunnen doorgaan (bijvoorbeeld een exacte
  prijs), wordt overgeslagen. Dat is bovendien realistischer: een echte klant slaat zulke vragen ook
  wel eens over.

⚠️ **Kosten en dagplafond.** Er is een plafond van €20 per klantaccount en €50 over alle accounts
per dag. De schatting hieronder is sinds 29 september 2026 gebaseerd op wat fase 1 werkelijk kostte,
nagerekend op `ai_calls` (klant A: $4,34 voor merk, drie clusters en zes pagina's). De eerdere
schatting van $0,90 per pagina kwam uit de benchmarkronde met de oude contentketen en zijn
reparatierondes; de huidige keten (hooguit één herschrijving) kost ongeveer $0,20 per pagina.

| Post | Werkelijk bij klant A | Aantal in de volle matrix | Totaal |
|---|---|---|---|
| Merkonderzoek | $0,13 (kleine site; reken op $0,15 tot $0,25) | 3 | ongeveer $0,60 |
| Meetronde per cluster, met Google AI Overview en herkansingen | ongeveer $1,00 | 9 | ongeveer $9 |
| Pagina: brief, schrijven, controle, eventueel herschrijven | ongeveer $0,20 | 18 | ongeveer $3,60 |
| **Samen** | | | **ongeveer $13, zo'n €12** |

Twee klanten (fase 2) komen daarmee op ongeveer $9, zo'n €8. Dat past onder één account op één dag,
met ruimte voor een herkansing. De meting is nu verreweg de grootste post (ongeveer 70 procent).

**Doorlooptijd in de app bij klant A**: 76 minuten van merk aanmaken tot zes pagina's klaar, waarvan
46 minuten meting (de clusters worden na elkaar gemeten, ongeveer tien minuten per cluster plus
herkansingen). Het handwerk eromheen (bedrijf kiezen, gesprek en antwoorden verzinnen, meetvragen
nalezen) kost meer tijd dan de app. **De tijd van de copywriter** is de grootste kostenpost van een
ronde: reken op een paar uur per klantdocument (zes pagina's, eerdere versies in een bijlage).

---

## 4. Het klantdocument voor de copywriter

Eén Markdown-bestand per klant, zelfstandig leesbaar, letterlijk door te sturen zonder verdere
toelichting. Het bevat de beoordelingsinstructie zelf, zodat de copywriter niets anders nodig heeft.
Het document wordt gebouwd met `content-reviews/maak_klantdocument.py` uit één databestand, zodat
elke klant precies hetzelfde sjabloon krijgt.

**Versie 2 (29 september 2026).** Bijgewerkt na fase 1 met klant A; de wijzigingen staan in §9. In het
kort: de koppen noemen geen interne stappen meer, de copywriter beoordeelt alleen de definitieve
versie (de eerste staat in een bijlage), bij een verbeterpagina staat de huidige pagina erbij, de toon
komt uit de stemvoorbeelden, en de rubriek zegt hoe met feiten om te gaan en wanneer een schets
gevraagd wordt.

Sjabloon (met `[...]` als plek om in te vullen):

```markdown
# Contentbeoordeling: [bedrijfsnaam]

Dit document bevat [n] pagina's die automatisch zijn opgesteld voor dit bedrijf, met de
achtergrondinformatie waarmee ze zijn geschreven. We willen weten of ze goed genoeg zijn om
zonder verdere bewerking op de eigen website van het bedrijf te zetten, en waar niet.

**De maatstaf.** Beoordeel elke pagina op het niveau van een professionele copywriter die dit
bedrijf zelf zou inhuren om deze pagina te schrijven. Dat is een hoge lat, met opzet.

**Hoe we willen dat je leest.** Lees elke pagina zoals je dat als vakcopywriter zou doen voor een
opdrachtgever, niet als een checklist. Vraag je bij elke pagina eerst af: wat is het doel van deze
pagina, en wie leest hem? Vind je daarna alles wat je zou verwachten, of mis je iets dat er wel op
had moeten staan, ook als dat niet met zoveel woorden gevraagd werd? En is het geschreven op het
niveau dat jij als copywriter zou opleveren?

**Wat je per pagina krijgt.** Waarvoor de pagina bedoeld is en voor wie, wat het bedrijf zelf heeft
aangeleverd, en de tekst zoals hij op de site zou komen, inclusief de veelgestelde vragen en de titel
en omschrijving voor zoekmachines. Is het een bestaande pagina die herschreven is, dan staat het adres
van de huidige pagina erbij, zodat je kunt vergelijken. Achteraan staat een bijlage met eerdere
versies; die hoef je niet te lezen.

**Over de feiten.** Ga ervan uit dat klopt wat het bedrijf zelf heeft aangeleverd (prijzen,
werkwijze, voorbeelden). Let wel op of de tekst iets beweert wat daar niet uit volgt, of wat je als
copywriter niet zou durven publiceren zonder het na te vragen.

**Wat we vragen.** Beoordeel elke pagina op de punten onder aan die pagina. Vul een cijfer van 1
(helemaal niet) tot 5 (helemaal wel) in, met een korte reden. Een paar zinnen per punt is genoeg;
wat je zou aanpassen of toevoegen is waardevoller dan het cijfer zelf.

Bij elke pagina die je niet "ja, zo" zou publiceren, vragen we je iets extra's: een paar zinnen over
wat jij daar zelf anders zou schrijven of toevoegen. Geen volledige herschrijving, alleen een schets
waar wij mee verder kunnen.

Onderaan dit document staat ruimte voor een algemene indruk over alle [n] pagina's van dit
bedrijf samen: valt je iets op dat vaker terugkomt?

Stuur dit document na het invullen gewoon terug, met je opmerkingen erin.

---

## Over dit bedrijf
- Sector: [...]
- Werkgebied: [...]
- Voor wie: [de klantgroepen uit het gesprek]
- Toon: [één zin samenvatting, met de adressen van de stemvoorbeelden: "zoals op ..."; zonder
  stemvoorbeelden: de homepage]

---

## Pagina 1: [titel van de geschreven pagina, niet de titel van de aanbeveling]

**Waarvoor deze pagina bedoeld is:** [wat de pagina moet bereiken, in gewone taal; geen opdrachtvorm]
**Voor wie:** [de één-zin-lezer uit het rapport]
**Huidige pagina:** [adres van de bestaande pagina die deze tekst vervangt, of: "nieuwe pagina, bestaat
nog niet op de site"]

### Wat het bedrijf zelf heeft aangeleverd
[het antwoord op de open vraag, letterlijk, plus de gerichte vragen met de antwoorden; een
overgeslagen vraag als "niet beantwoord"]

### De tekst
[de definitieve versie: tekst, veelgestelde vragen, titel en omschrijving voor zoekmachines; koppen
in de tekst drie niveaus lager dan in het origineel, zodat ze onder deze kop blijven]

### Jouw beoordeling
| Punt | Cijfer (1-5) | Toelichting |
|---|---|---|
| **Heeft dit de kwaliteit van een copywriter die een pagina schrijft voor een klant?** (de hoofdvraag) | | |
| Is de pagina compleet? Mis je iets dat op een goede pagina over dit onderwerp had moeten staan, ook als daar niet letterlijk naar gevraagd werd? Wat dan? | | |
| Vindt een bezoeker met dit doel op deze pagina wat hij zoekt, en snel? | | |
| Leest het lekker: prettige opbouw, geen rommelige zinnen, geen herhaling? | | |
| Klopt het: staat er niets in wat niet volgt uit wat het bedrijf aanleverde, of wat feitelijk onjuist aanvoelt? | | |
| Klinkt het als dit specifieke bedrijf, niet als een generieke tekst die op elk bedrijf in de branche past? | | |

**Zou je dit publiceren op de website van dit bedrijf?**
- [ ] Ja, zo
- [ ] Nee, maar met wat bijschaven en finetuning kan het wel
- [ ] Nee, dit zit onder de maat en ik zou opnieuw beginnen

*(niet "ja, zo"? Schets hier in een paar zinnen wat jij zelf zou schrijven of toevoegen)*

*(herhaal dit blok per pagina)*

---

## Algemene indruk over alle pagina's van [bedrijfsnaam] samen
[open vraag: wat valt op, wat komt vaker terug, wat zou je als eerste aanpakken]

---

## Bijlage: eerdere versies
Alleen ter vergelijking, je hoeft dit niet te lezen of te beoordelen.

### Pagina 1: eerdere versie
[de eerste versie, alleen als die afwijkt van de tekst hierboven]
```

⚠️ Geef de copywriter geen inzage in de interne stapnamen ("brief", "controle", "herschrijving") of
in het feit dat dit AI-gegenereerd is, tenzij dat voor de opdracht nodig is. Hij moet oordelen als een
lezer of als de ondernemer, niet als tester van een AI-systeem. Noem het "automatisch opgesteld" en
niet meer dan dat. De gerichte vragen staan erbij zoals het bedrijf ze kreeg; dat daarin soms "de
schrijver" staat, is aanvaard (fase 1), het verandert het oordeel niet.

**Waarom de eerste versie toch bewaard wordt.** De copywriter beoordeelt hem niet, maar voor het
patronen-document (§6) is het verschil tussen de eerste en de definitieve versie wel nodig: het laat
zien wat de herschrijving deed. De herschrijving overschrijft de tekst in de app, maar elke aanroep
bewaart zijn volledige uitvoer; beide versies zijn op te halen via `GET /api/beheer/spoor/<profiel>`.

---

## 5. Wat er terugkomt

Drie ingevulde klantdocumenten (hetzelfde bestand, aangevuld). Dat is bewust niet één document van de
copywriter met scores over alle klanten heen: het cross-klant patroon herkennen is onze taak, niet
die van de copywriter, want dat vraagt kennis van de pijplijn die hij niet heeft en ook niet zou
moeten hebben (§4, laatste opmerking).

---

## 6. Het ene patronen-document (door ons gemaakt, niet door de copywriter)

Na ontvangst van de drie ingevulde documenten maken wij, in overleg met Claude Code, één document dat
alles samenbrengt. Dit is het document dat naar de pijplijnwijzigingen leidt.

Sjabloon:

```markdown
# Ronde [nummer], [datum]: bevindingen en patronen

## 1. De matrix en de scores
| Klant | Cluster | Pagina | Copywriter-kwaliteit | Compleet | Vindt doel snel | Leest lekker | Klopt | Klinkt eigen | Publiceerbaar (ja/bijschaven/onder de maat) | Inputrijkheid (intern) |
|---|---|---|---|---|---|---|---|---|---|---|
| A | ... | ... | | | | | | | | |
(rijen naar aantal items in deze ronde)

## 2. Patronen (wat op meerdere pagina's terugkomt)
### Patroon 1: [korte beschrijving]
- Komt voor bij: [x van y pagina's, welke klanten/clusters]
- Komt voor ongeacht inputrijkheid: [ja/nee, met welke bewijs]
- Bewijs: [twee of drie letterlijke citaten uit de copywriterfeedback, inclusief wat er volgens de
  copywriter concreet ontbrak als het om een volledigheidspunt gaat]
- Vermoedelijke oorzaak: [welke stap: brief, schrijfopdracht, controle, herschrijving, of het gesprek
  zelf (te weinig input verzameld)]
- Soort: feitelijk/mechanisch, stijl/toon, of ontbrekende inhoud/volledigheid (zie §0 en §7)

(herhaal per patroon, hooguit 5, geprioriteerd op hoeveel pagina's het raakt)

## 3. Conclusie
[maximaal vijf voorstellen, elk gekoppeld aan precies één bestaande stap, of expliciet: geen
overtuigend patroon gevonden in deze ronde]
```

**Een patroon telt alleen als het bij minstens twee van de drie klantprofielen voorkomt, ongeacht
hoe rijk de input daar was.** Dat is de sterkste zeef tegen een verkeerde diagnose: een klacht die
alleen bij klant C (de bewust zwakke input) opduikt, zegt vaker iets over die zwakke input dan over
de pijplijn, en hoort dus niet zonder meer als algemeen pijplijnprobleem naar Claude Code.

**"Geen overtuigend patroon" is een geldige uitkomst.** Forceer geen vijf patronen als er met deze
hoeveelheid items geen vijf te onderbouwen zijn. Een geforceerd patroon uit ruis is precies het
soort fout die deze methode moet voorkomen, niet herhalen. Beperk tot **hooguit vijf patronen**,
geprioriteerd op hoeveel content-items ze raken, en niet minder streng als het er minder zijn.

---

## 7. Hoe dit naar Claude Code gaat

Geef Claude Code niet de ruwe copywriterfeedback, maar het patronen-document uit §6. Vraag er
expliciet bij:

> Kijk per patroon eerst hoe de betrokken stap nu precies is ingericht (welke instructie, welke
> prompt, welke controle, in welk bestand), en stel daarna een wijziging voor. Uitgangspunt: die
> wijziging blijft **binnen** de bestaande stap (een scherpere instructie in een bestaande prompt,
> een preciezere controle in bestaande code), geen nieuwe stap, geen nieuwe AI-aanroep, geen score op
> de tekst, geen extra controlelaag. Alleen als je met de verificatie uit §8 aantoonbaar kunt maken
> dat een bestaande stap het probleem niet kan oplossen en iets nieuws wel, mag je iets nieuws
> voorstellen; leg dat dan expliciet als afwijking voor, met de onderbouwing, in plaats van het
> stilzwijgend te bouwen. `docs/tasks/contentketen-opnieuw.md` §3 blijft de grens van de contentketen
> zelf: raakt een voorstel daaraan, dan is dat altijd een besluit voor de eigenaar.

Een patroon over ontbrekende inhoud (§4: "compleet") wijst niet automatisch naar een nieuwe stap. Kijk
eerst of de content brief (hoofdstuk 13) of het gesprek (hoofdstuk 7) die inhoud al had kunnen
signaleren en gewoon niet meegaf aan de schrijver; dat is dan een bestaande stap die scherper moet,
niet een nieuwe.

---

## 8. Verifiëren dat een wijziging echt helpt

Geen enkele wijziging telt als klaar op gevoel. Na een geaccepteerde wijziging:

1. Voeg een testgeval toe aan `test-unit.ts` (voor een mechanische regel) of `test-chain.ts` (voor
   iets dat de samenhang tussen stappen raakt), met een van de voorbeelden uit het patronen-document
   als vast geval.
2. Draai een kleinere herhaling: minstens de clusters waar het patroon het sterkst speelde (niet per
   se de hele matrix opnieuw), met dezelfde copywriter en hetzelfde beoordelingsformulier uit §4.
3. Leg de oude en nieuwe versie naast elkaar, met dezelfde criteria.
4. Is het patroon weg zonder dat een ander criterium zakt, log de wijziging met datum en het
   voor/na-cijfer in `docs/logbook.md`. Zo niet, dan is de wijziging niet de oplossing.

**Stopregel.** Een patroon krijgt in één ronde hooguit **twee** verificatiepogingen. Lukt het dan nog
niet, dan wordt het patroon expliciet als "nog niet opgelost" naar de uitvoeringslog (§9) geschreven
en gaat het naar een bewust gepland vervolg, in plaats van in een open lus te blijven proberen. Dat
is dezelfde discipline die deze methode zelf aan de pijplijn oplegt.

Gebruik `MEASURE_WEB_SEARCH=false` voor deze herhalingsronde als er nieuwe metingen nodig zijn; voor
een eerste, echte ronde uit §3 blijft die aan, anders zijn de aanbevelingen niet realistisch.

---

## 9. Uitvoeringslog

Elke ronde krijgt hier een rij, ook toekomstige rondes met nieuwe klanten of een verificatie na een
wijziging. Zo blijft te zien welke sjabloonversie gebruikt is en of een patroon al eens is
aangepakt.

| Ronde | Datum | Wat getest werd | Sjabloonversie of -wijziging | Belangrijkste patronen | Uitkomst |
|---|---|---|---|---|---|
| 1 (fase 1, pilot) | 28 en 29 september 2026 | Klant A (Slotenspecialist van Kessel, Houten), 3 clusters, 6 pagina's, $4,34; uitvoering en log in `content-reviews/fase1-klant-a/` | Opgesteld met versie 1. Daarna versie 2 van §4: koppen zonder interne stapnamen, alleen de definitieve versie beoordelen (eerdere in een bijlage), regel "Huidige pagina" bij verbeterpagina's, toon uit de stemvoorbeelden, zin over feiten in de rubriek, schets bij elke pagina die niet "ja, zo" is. Het document van klant A is met versie 2 opnieuw opgebouwd vóór het versturen. Ook §2.3 aangevuld (minder dan twee aanbevelingen) en de kostenschatting in §3 bijgewerkt | Wacht op de copywriter | Wacht op de copywriter |
| 2 (fase 2) | 29 september 2026 | Klant B (Myfinance, landelijk) en C (Ongediertebestrijding De Waard, Streefkerk), 3 clusters elk, 12 pagina's, $7,86; uitvoering en logs in `content-reviews/fase2-klant-b/` en `fase2-klant-c/`. Het wespencluster van C gaf één aanbeveling en is aangevuld volgens §2.3 | Versie 2 van §4 | Wacht op de copywriter | Wacht op de copywriter |
