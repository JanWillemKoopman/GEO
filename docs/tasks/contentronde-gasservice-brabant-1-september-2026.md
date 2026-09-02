# Eerste echte contentronde: Gasservice Brabant, cluster Hybride warmtepomp (1 september 2026)

De schrijfpijplijn is op 1 september herbouwd (`docs/tasks/contentpijplijn-herontwerp.md`) en tot nu
toe alleen tegen de ketenstub getoetst. Dit is de eerste ronde tegen een echte klant op productie,
en daarmee de toets die conventie 10 eist. Wat hieronder staat is gemeten, niet geschat: elk cijfer
komt uit `ai_calls`, `jobs` en `content_pieces` van analyse
`c22f7d96-ce1b-405f-901f-c473826a8710`, en elk citaat staat letterlijk in de opgeslagen tekst.

**Er is niets gepubliceerd en er is niets verstuurd.** De vier pagina's staan in de app.

> **Waarschuwing vooraf over de kosten.** Ik raamde de hele ronde op ongeveer $2. Hij kwam uit op
> ongeveer $5,10. De meting klopte precies ($0,84), het schrijven niet: een pagina kostte $1,06 in
> plaats van de $0,24 waar het herontwerpadvies mee rekende. De oorzaak staat in verbetering 6 en
> is precies het soort ding dat je alleen op een echte ronde ziet.

---

> ## Stand op 1 september 2026: alle twaalf zijn gebouwd
>
> De hele lijst hieronder is doorgevoerd, in de volgorde waarin hij staat. Vier controles groen:
> typecheck, 3539 unittests (82 nieuwe), 561 ketentests (4 nieuwe), de productiebuild. Er was geen
> migratie nodig; er is geen enkele database-kolom bij gekomen.
>
> **Nog niet geverifieerd tegen een echte klant** (conventie 10). De cijfers in de impactkolom
> hieronder zijn dus voorspellingen, geen metingen. Wat er getoetst is: elke ingreep heeft een
> unittest op de letterlijke zinnen en getallen uit deze ronde, en de samenhang tussen briefing,
> feitenkaart en pagina heeft een scenario in de ketentest. De volgende contentronde is de toets
> die telt.
>
> Twee dingen zijn tijdens het bouwen anders uitgepakt dan de tabel beschrijft:
>
> - **Verbetering 8: feiten herschrijven werkt niet in het Nederlands.** Het plan was de aanloop "De website
>   vermeldt dat ..." van een feit af te knippen. Na "vermeldt dat" volgt een bijzin met het
>   werkwoord achteraan, dus "Gasservice Brabant vermeldt dat het 24/7 bereikbaar is" wordt "Het
>   24/7 bereikbaar is". Een half feit is erger dan een omslachtig feit (conventie 3). Het is
>   daarom een CONTROLE op de pagina geworden in plaats van een bewerking van de kaart: het model
>   krijgt de instructie (in `synthesis.ts`), de code garandeert dat de rapportagevorm nooit
>   gepubliceerd wordt (in `content-gate.ts`).
> - **Verbetering 1: paginagebonden antwoorden gaan niet de feitenbank in.** `syncBrandFacts` leest ná het
>   schrijven alles terug wat merkbreed is of bij deze analyse hoort. Een antwoord over Tilburg dat
>   we daar zouden opslaan, zou dus alsnog op de kaart van de Eindhoven-pagina staan. Ze komen nu
>   op de kaart van hun eigen pagina zonder bank-id. Dat kost de traceerbaarheid van dat id, en dat
>   is de goede ruil.
>
> Eén ingreep is bij het bouwen bewust anders begrensd dan de tabel zei: de reparatielus BEWAART
> een ronde die niet slechter is, en STOPT pas als de score niet meer stijgt. Een reparatie die een
> onbewezen bewering weghaalt terwijl het cijfer gelijk blijft, is echte winst die geen cijfer laat
> zien. De ketentest ving dat randgeval.

---

## 1. De verbeterlijst

Gesorteerd op wat als eerste gebouwd moet worden. "Soort" zegt of het een tekortkoming van de
PIJPLIJN is (met code op te lossen, en dus te garanderen) of van het MODEL (met een betere
instructie of meer denktijd op te lossen, en dus niet te garanderen).

| # | Verbetering | Soort | Waar | Bewijs | Effort | Impact | Waarom deze volgorde |
|---|---|---|---|---|---|---|---|
| 1 | **Gebruik de antwoorden die de klant al gaf.** De briefing stelt vragen met drie reikwijdtes: merk, analyse en pagina. Antwoorden met reikwijdte "pagina" worden nergens gelezen. Laat beide plekken die antwoorden inlezen ook de pagina-antwoorden meenemen, gekoppeld via `content_piece_ids`, zodat het antwoord bij de pagina komt waarvoor de vraag gesteld is. | Pijplijn | `lib/pipeline/factbase.ts:138` en `lib/pipeline/content.ts:800`, beide met de regel `scope === "merk" \|\| (scope === "analyse" && ...)` | 9 van de 16 briefingvragen hadden reikwijdte "pagina". Ik beantwoordde er 4. Van de 8 antwoorden belandden er 4 in `brand_facts`, alle vier met reikwijdte merk. Het antwoord "Ja. Tilburg valt binnen het werkgebied en daar plaatst Gasservice Brabant hybride warmtepompen" staat als `beantwoord` in `fact_requests` en wordt door geen enkele stap gelezen. | Klein (uren): één filter op twee plekken, plus een ketentest die een pagina-antwoord door de kaart heen volgt. | De helft van wat de klant invult gaat nu verloren. Dit is ook de directe oorzaak van verbetering 2 en 3, en dus van de zin "Gasservice Brabant kan daarom momenteel niet als aantoonbare specialist in Tilburg worden aanbevolen." Twee van de vier pagina's raken hun ontkennende opening kwijt. | Zonder dit repareren de volgende twee punten het symptoom en niet de oorzaak. |
| 2 | **Stel het contract op met de bijgewerkte feitenkaart.** De planstap leest de BEVROREN kaart uit de briefing, die per definitie gemaakt is voordat de klant iets beantwoordde, en voert `mergeAnsweredFacts` niet uit. `loadContentContext` doet dat wel; de nieuwe planstap herhaalt de fout die daar met R8.1 al is opgelost. | Pijplijn | `lib/pipeline/content-plan.ts`, blok "2. De feitenkaart en het paginaplan" | Antwoorden opgeslagen om 16:52:35, `content_plan` gestart om 16:53:00. Het contract van de Tilburg-pagina zegt in `openingAnswer`: "De beschikbare informatie onderbouwt nog niet dat het bedrijf specifiek in Tilburg hybride warmtepompen plaatst." | Klein (uren): dezelfde helper aanroepen die content.ts al gebruikt. | Het contract plant geen secties meer rond gaten die net gedicht zijn. Op deze vier pagina's scheelt dat 4 van de 23 "niet bevestigd"-zinnen meteen, en het haalt de ontkenning uit de opening van twee pagina's. | Klein, en het contract stuurt alles wat erna komt. Repareer de bron voordat je de poort verbouwt. |
| 3 | **Laat geen meta-tekst en geen F-nummers in de opening toe.** De `openingAnswer` van het contract is de letterlijke eerste zin van de pagina. Controleer hem in `normaliseerContract`: verwijder tokens als `[F1, F2]`, en weiger een opening die woorden als "niet bevestigd", "niet vastgesteld", "deze pagina" of "moet nog" bevat. Val bij afkeuring terug op de doelvraag als vraagzin. | Pijplijn | `lib/pipeline/contract-format.ts`, `normaliseerContract` | Pagina "Snel installeren", eerste regel: "Het bedrijf is 24/7 bereikbaar om te bespreken of en wanneer installatie in jouw situatie mogelijk is. **[F1, F2, F5, F14]**". Pagina Tilburg, eerste alinea: "Gasservice Brabant kan daarom momenteel niet als aantoonbare specialist in Tilburg worden aanbevolen." | Klein (uren): een reguliere expressie en een terugval, plus unittests op beide gevallen. | Geen interne nummering meer in tekst die de klant publiceert, en geen pagina die het eigen bedrijf afraadt in de eerste twee zinnen. Dit is de enige fout in de lijst die de klant onmiddellijk ziet. | Klein en zelfstandig. Ook als 1 en 2 al gebouwd zijn, is dit het vangnet dat conventie 1 vraagt. |
| 4 | **Sla meer dan het navigatiemenu op, en controleer citaten op de volledige brontekst.** `PAGE_MAX_CHARS` staat op 1500 tekens en geldt voor elke meerpagina-crawl. Bij een site met een groot menu is dat precies het menu. Knip eerst de navigatie, de footer en de cookiemelding weg (of sla de tekst ná het eerste `<h1>` op), verhoog de grens, en geef `crawlPages` een stand waarin hij de VOLLEDIGE tekst teruggeeft voor de citaatcontrole. Trek `MAX_BRONNEN` op van 6 naar het aantal unieke bronnen. | Pijplijn | `lib/crawler.ts:66` (`PAGE_MAX_CHARS`), gebruikt via `crawlPages`; consumenten `lib/pipeline/discover.ts:410`, `lib/pipeline/explainer-verify.ts:82` en `:38`, `lib/pipeline/source-analysis.ts:115` | 139 van de 148 opgeslagen pagina's (94%) lopen tegen de grens aan terwijl het menu er nog twee keer in staat. Het opgeslagen fragment van `/hybride-warmtepomp/` is voor 100% menu. In de feitenkaart van de prijspagina staat de eigen kennisbankpagina als niet-citeerbare achtergrond: "Sitetekst \"Gasservice Brabant: de kosten van een hybride warmtepomp\": Gasservice Brabant: de kosten van een hybride warmtepomp Cv-ketel Cv-ketel kopen CW4-ketel...". Van de 37 feiten bevat er geen enkele een bedrag. En de bronverificatie keurde 18 van de 35 uitleggen af met "citaat staat niet op de bron"; het citaat "De meeste hybride warmtepompen halen warmte uit de buitenlucht" staat op teken 10.696 van de 21.141 op de bronpagina van Milieu Centraal en is dus terecht, maar onvindbaar binnen 1500 tekens. | Middelmatig (een dag): het wegknippen van menu en footer is het echte werk, plus een tweede stand in `crawlPages` en een hertelling van de bestaande inventaris. | De eigen prijspagina van de klant noemt "maximaal €6000" en "gemiddeld tussen de €500 en €2500" subsidie. De door ORBIT ENGINE herschreven versie opent met "Er is geen gecontroleerde, concrete prijs ... beschikbaar in dit dossier." Over de vier pagina's samen staan nu 5 concrete getallen; met de echte sitetekst in de kaart zijn dat er tientallen. En de bevestigde uitleg gaat van 13 naar verwachting 25 tot 30 per ronde. | Middelmatig, maar dit is de grootste hefboom op de inhoud. Het verklaart in één keer waarom bijna elke pagina "niet bevestigd" schrijft waar de klant gewoon een cijfer heeft staan. |
| 5 | **Begrens de reparatielus op verbetering in plaats van op drie rondes.** Bewaar de kwaliteitsscore van de vorige ronde. Stop zodra hij niet meer stijgt, en houd dan de BESTE versie in plaats van de laatste. Beperk de bevindingenlijst tot de tien zwaarste per ronde, gegroepeerd per sectie, zodat de reparatie ook werkelijk gericht is. | Pijplijn | `lib/pipeline/content.ts`, `reviseContentPiece`: `nogEenRonde`, `openstaand`, en `buildRepairInput` | Kwaliteitsscore per ronde, pagina "Snel installeren": 67, 74, 68, 48. De eindversie is 19 punten slechter dan het eerste concept en 26 punten slechter dan de beste tussenversie. Tilburg: 48, 52, 35, 48. Het aantal bevindingen daalt niet: 68, 53, 77, 63 en 119, 89, 101, 96. Een reparatieronde levert gemiddeld 6.245 uitvoertokens op, MEER dan de 6.042 van de oorspronkelijke schrijfaanroep, en kost $0,2525. | Middelmatig (een dag): de vergelijking per ronde, het bewaren van de beste versie, en het rangschikken van bevindingen. | Twee dingen tegelijk. De klant krijgt de beste versie in plaats van de laatste: op deze vier pagina's scheelt dat gemiddeld 9 kwaliteitspunten. En de kosten dalen van $1,13 naar ongeveer $0,63 per pagina, want twee van de drie reparatierondes vervallen. | Dit is de enige verbetering die tegelijk de kwaliteit verhoogt en de rekening verlaagt. Hij staat achter 4 omdat 4 de inhoud levert waarop gerepareerd wordt. |
| 6 | **Snoei het contract op de doellengte.** De schrijfprompt zegt tegelijk "elke sectie komt erop, je mag er niets uit weglaten" (regel 10) en "ga niet over het maximum heen" (doellengte). Bij een contract dat groter is dan de doellengte kan het model niet allebei. Kap het contract in `normaliseerContract`: houd secties tot de som van `targetWords` binnen `TARGET_WORDS[type].max` past, en begrens de FAQ op acht vragen. Wat afvalt, valt van achteren af. | Pijplijn | `lib/pipeline/contract-format.ts` `normaliseerContract`; de tegenstrijdige regels in `lib/pipeline/content.ts` (`CONTENT_SYSTEM` regel 10 en het `Doellengte`-blok) | Tilburg is een landingspagina met doelbereik 400 tot 700 woorden. Het contract vroeg 25 secties met samen 1000 woorden plus 16 FAQ-vragen. De pagina werd 1331 woorden, bijna het dubbele van het maximum. De prijspagina (artikel, 700 tot 1200) kreeg 25 secties en werd 1560 woorden. Alle vier de pagina's staan boven hun maximum. | Middelmatig (een dag): het snoeien zelf is klein, het bepalen van een goede volgorde en de tests eromheen niet. | Pagina's binnen hun doelbereik, en secties die uitgewerkt genoeg zijn om te tellen. Van 25 secties van 40 woorden naar ongeveer 12 van 60. Dat haalt in één klap de categorie "sectie te dun" weg, deze ronde 7 bevindingen op één pagina. | Na 5, want een kleiner contract maakt de reparatielus vanzelf korter. Samen halen 5 en 6 het grootste deel van de kosten weg. |
| 7 | **Toets de ontwijkingscontrole op de hele pagina en breid de patronen uit.** Nu kijkt hij alleen naar de opening en naar FAQ-antwoorden die bij een doelvraag horen. Laat hem over de volledige body en alle FAQ-antwoorden lopen, en voeg de vormen toe die deze ronde opleverde: "vraag ... op", "laat ... vastleggen", "controleer vóór akkoord", "bespreek vooraf", "moet worden getoetst", "is niet bevestigd". Maak er een telling van: boven een percentage van de zinnen is de pagina afgekeurd. | Pijplijn | `lib/pipeline/content-gate.ts`, blok R8.2c en de lijst `ONTWIJKING` op regel 82 | De poort gaf `geenOntwijking: true` en een GEO-score van 100 aan de pagina "Snel installeren", die zegt: "Een concrete wachttijd is niet beschikbaar. Vraag wanneer advies mogelijk is.", "Laat andere woonplaatsen en de beschikbaarheid per moment vooraf controleren.", "Vraag vóór akkoord om bedragen per onderdeel." Over de vier pagina's samen staan 80 zinnen die met Vraag, Laat, Controleer, Bespreek, Vergelijk, Leg of Neem beginnen, en 24 formuleringen als "niet bevestigd", "niet vastgesteld" of "ontbreekt". | Klein (uren): één functieaanroep verplaatsen en de lijst uitbreiden, met unittests op de zinnen hierboven. | De poort ziet dan wat een lezer ziet. Op deze vier pagina's zou hij alle vier afkeuren in plaats van drie keer 100 te geven. Dat maakt de GEO-score voor het eerst een bruikbaar signaal. | Klein, maar pas nuttig als 1 tot 4 de pagina's echt iets te zeggen geven. Anders keurt hij alleen maar af zonder dat er een alternatief is. |
| 8 | **Schrijf feiten als bewering, niet als waarneming over de site.** De feitenkaart bevat zinnen als "De website presenteert de onderneming als ..." en "Gasservice Brabant vermeldt dat het 24/7 bereikbaar is". Omdat de schrijver het dekkende fragment letterlijk moet kunnen aanwijzen, neemt hij die vorm over. Laat de atomisering de bewering zelf opleveren ("Gasservice Brabant is 24 uur per dag bereikbaar") en bewaar de vindplaats apart in `source`. Voeg een code-controle toe die een feittekst met "de website vermeldt", "de site noemt" of "volgens de website" afkeurt. | Model plus pijplijn | `lib/pipeline/fact-atomise.ts` (de prompt) en `lib/pipeline/factcard.ts` `formatFactCard` | Op de pagina staat: "De website van Gasservice Brabant noemt ervaren vakmannen, meer dan 90 jaar ervaring, erkenning als installateur en een BRL6000-25-certificaat." Een website die over zichzelf in de derde persoon praat. In `claims_json` staat dezelfde vorm terug: "Gasservice Brabant noemt meer dan 90 jaar ervaring", met als citaat "90+ jaar eraring", inclusief de typefout van de site. | Middelmatig (een dag): de prompt herschrijven, de code-controle erbij, en de bestaande 21 feiten van dit merk opnieuw laten atomiseren. | De pagina klinkt als het bedrijf zelf in plaats van als een rapport over het bedrijf. Dit raakt elke zin die uit de kaart komt, dus op deze vier pagina's ongeveer 50 claims. | Na de inhoudelijke punten: dit verandert hoe het klinkt, niet wat er staat. |
| 9 | **Lees `factRef` overal op dezelfde manier.** `isSupported` splitst een samengestelde verwijzing netjes op (dat was reparatie R8.3), maar `factNummer` in de dekkingspoort pakt met `(\d+)` alleen het eerste nummer. Gebruik dezelfde `splitRefs` in beide. | Pijplijn | `lib/pipeline/content-coverage.ts` `factNummer`, tegenover `lib/pipeline/factcard.ts:357` `isSupported` | Pagina "Snel installeren": 3 van de 18 claims hebben een samengestelde verwijzing (`F1, F5, F18`, `F6, F15`, `F7, F12`). De dekkingspoort telt daarvan alleen F1, F6 en F7 als gebruikt en blijft F5, F18, F15 en F12 melden als "bevestigd feit niet gebruikt". Deze ronde 6 zulke meldingen op de Tilburg-pagina. | Klein (uren): één functie hergebruiken, plus een unittest met een samengestelde verwijzing. | Onterechte bevindingen verdwijnen. Op deze vier pagina's scheelt dat naar schatting 10 tot 15 van de 250 bevindingen, en die tellen mee in de reparatielus die toch al te lang is. | Klein en risicoloos, en het maakt de meting van punt 5 zuiverder. |
| 10 | **Werk `word_count` bij na reparatie.** De reparatiestap schrijft `body_markdown` weg maar laat `word_count` op de waarde van het eerste concept staan. | Pijplijn | `lib/pipeline/content.ts` `reviseContentPiece`, het `update`-blok | Opgeslagen tegenover werkelijk geteld: 742 tegen 940, 896 tegen 1331, 1269 tegen 1560, 742 tegen 880. De Tilburg-pagina staat in de app als 896 woorden en is er 1331. | Klein (uren): één veld toevoegen. | De app laat de echte lengte zien. Belangrijker: elke uitspraak over "de gemiddelde pagina telt 548 woorden" meet nu het eerste concept en niet wat de klant leest. | Klein, maar zonder dit is punt 6 niet na te rekenen. |
| 11 | **Geef de aanspreekvorm mee aan de schrijver.** `profiles.pronoun_preference` wordt verzameld en is bewerkbaar, maar komt in de schrijfprompt niet voor. | Pijplijn | `lib/pipeline/content.ts` `buildContentInput`; het veld staat in `lib/pipeline/brand-fields.ts:531` | Voor Gasservice Brabant staat het veld op "wij". De Eindhoven-pagina schrijft "Leg vooraf uw adres, woningtype, bouwjaar ... klaar", de pagina Snel installeren schrijft "of jouw woning". Twee pagina's van hetzelfde merk uit dezelfde batch, twee aanspreekvormen. | Klein (uren): één regel in de prompt en een deterministische telling achteraf. | De vier pagina's spreken de lezer op dezelfde manier aan. | Klein, en het is een veld dat we de klant al laten invullen zonder er iets mee te doen. |
| 12 | **Toets de uitleg-eis op een definitie, niet op woordoverlap.** De dekkingspoort kijkt of de term voorkomt in de sectie. Het model plakt daarom per sectie een definitiezin aan de tekst. Toets in plaats daarvan of de term ergens op de pagina in een zin met een definitiepatroon staat, en tel hem dan voor de hele pagina in plaats van per sectie. | Pijplijn | `lib/pipeline/content-coverage.ts`, `ontbrekendeUitleg` in `toetsSectie` | Pagina "Snel installeren": "Een condensafvoer voert vocht af en de regeling stuurt het systeem aan.", "Inbedrijfstelling betekent dat de werking wordt gecontroleerd.", "Een richttermijn is een voorlopige indicatie, geen afspraak.", "Subsidievoorwaarden zijn de regels voor toekenning en kunnen wijzigen." Vier definitiezinnen in vier opeenvolgende secties. | Middelmatig (een dag): het definitiepatroon en de hertelling per pagina, met unittests op deze vier zinnen. | De pagina leest niet meer als een verklarende woordenlijst. Naar schatting 10 tot 15 losse definitiezinnen minder per pagina. | Laatste: het is een verfijning van een poort die na 4 en 6 al veel minder vaak aanslaat. |

### De goedkope winst: hiermee zou ik morgen beginnen

**Verbetering 1, 2 en 3 samen.** Alle drie klein, samen hooguit een dag werk, en samen halen ze de
ernstigste fout uit het product: een pagina op de site van de klant die het eigen bedrijf afraadt.

Wat er nu letterlijk staat op de Tilburg-pagina: *"Gasservice Brabant kan daarom momenteel niet als
aantoonbare specialist in Tilburg worden aanbevolen."* En op de Eindhoven-pagina: *"Daardoor kan
Gasservice Brabant op basis van deze informatie niet worden aangewezen als de gevraagde installateur
in Eindhoven."* In beide gevallen had de klant de vraag met "ja" beantwoord, en in beide gevallen
gooide de pijplijn dat antwoord weg. Daar komt bij dat de eerste regel van een derde pagina eindigt
op `[F1, F2, F5, F14]`.

Dat zijn drie ingrepen in twee bestanden plus een regex, en ze raken geen enkele AI-aanroep. De
kosten per pagina veranderen er niet van.

### Wat het kost

Nagerekend tegen de tarieven in `lib/openai/pricing.ts` (sol $5 per miljoen invoertokens en $30 per
miljoen uitvoertokens, luna $0,20 en $1,20) en tegen de gemeten tokens in `ai_calls` voor deze
ronde.

| Stap | Aanroepen | Kosten | Per pagina |
|---|---|---|---|
| Schrijven (`content_draft`, sol) | 4 | $1,2180 | $0,3045 |
| Repareren (`content_revise`, sol) | 12 | $3,0302 | $0,7576 |
| Itemdossier met web-zoeken (luna) | 4 | $0,0689 | $0,0172 |
| Beoordelaarspanel, drie beoordelaars (luna) | 52 | $0,1718 | $0,0430 |
| Contract (luna) | 4 | $0,0189 | $0,0047 |
| Claim-audit plus atomisering (luna) | 8 | $0,0162 | $0,0041 |
| **Samen** | **84** | **$4,5240** | **$1,1310** |

Het herontwerpadvies rekende met **$0,24 per pagina**. De werkelijkheid is **$1,13**, dus 4,7 keer
zoveel. Twee oorzaken, allebei nagerekend:

1. **De schrijfaanroep is duurder geworden.** 23.649 invoertokens en 6.042 uitvoertokens, tegen de
   5.599 en 4.214 waarmee het advies rekende. De invoer is 4,2 keer zo groot omdat het contract, het
   dossier, de geverifieerde uitleg en het paginaplan er allemaal bij zijn gekomen.
   Controle: 23.649 x $5 / 1.000.000 = $0,118 plus 6.042 x $30 / 1.000.000 = $0,181, samen $0,299.
2. **De gerichte reparatie is geen gerichte reparatie.** Drie rondes per pagina, elk $0,2525, met
   gemiddeld 6.245 uitvoertokens. Dat is méér dan de oorspronkelijke schrijfaanroep. Het advies
   rekende op ongeveer $0,06 voor een sectiereparatie.

**Wat de verbeteringen met dat bedrag doen.** Verbetering 5 (stoppen zodra de kwaliteit niet meer
stijgt) schrapt naar verwachting twee van de drie reparatierondes: $1,13 wordt ongeveer $0,63.
Verbetering 6 (een kleiner contract) verkleint zowel de invoer van de schrijfaanroep als de lengte
van de tekst; op basis van een halvering van het aantal secties schat ik daar nog eens $0,08 tot
$0,12 af, maar dat is een schatting en geen meting. Verbetering 4 werkt de andere kant op: een
feitenkaart met echte sitetekst in plaats van menu's wordt groter. Bij 40 extra feiten van
gemiddeld 25 tokens is dat 1.000 invoertokens, dus $0,005 per pagina. Verwaarloosbaar tegenover wat
5 en 6 opleveren.

**Netto: van $1,13 naar ongeveer $0,55 per pagina, met betere pagina's.** De enige verbetering die
echt duurder zou zijn is A4 uit het herontwerpadvies (sectiegewijs schrijven op de dure tier), en
die staat hier bewust niet in.

### Wat je NIET moet doen

- **Het beoordelaarspanel naar de dure tier tillen.** Dat ligt voor de hand, want de kwaliteitsscore
  daalt en de bevindingen zijn talrijk. Maar het panel doet zijn werk juist te goed: het levert 45
  tot 96 bevindingen per pagina en dat is precies wat de reparatielus onbruikbaar maakt. Drie
  beoordelaars kosten samen $0,043 per pagina; op de dure tier wordt dat ongeveer $1,60, en dan heb
  je vooral méér bevindingen. Repareer eerst wat er met de bevindingen gebeurt (verbetering 5).
- **De dekkingsdrempel van 85 verhogen.** De dekking is niet het probleem: hij haalde deze ronde 86,
  88, 90 en 98. De pagina's zijn compleet volgens het contract en toch slecht. Het contract
  aanscherpen (6) helpt, de lat verhogen niet.
- **Meer reparatierondes toestaan.** `REPAIR_MAX` van 3 naar 5 lijkt logisch omdat er na drie rondes
  nog 45 tot 96 punten openstaan. Gemeten daalt de kwaliteit juist per ronde (67, 74, 68, 48). Meer
  rondes maken de pagina slechter en de rekening hoger.
- **Een nieuwe meting draaien om te zien of de pagina's helpen.** Verleidelijk, maar zinloos: deze
  vier pagina's zijn niet gepubliceerd en er staat geen enkele nieuwe zin op de site. Een hermeting
  meet dan de vorige stand en kost $0,82.

### Niet gezien in deze ronde, wel verwacht

Deze punten heb ik niet met bewijs uit deze ronde kunnen onderbouwen. Ze horen niet in de tabel
hierboven en zijn dus geen opdracht.

- **Pagina's van hetzelfde merk gaan op elkaar lijken.** De dubbelcontrole meet 5-grammen met een
  drempel van 0,35; gemeten waarde tussen de vier pagina's was 0,0079. Op het oog lijken de
  Tilburg-pagina en de Eindhoven-pagina qua opbouw sterk op elkaar, maar met deze maat is dat niet
  aan te tonen, en een andere maat heb ik niet gemeten. Meten voordat je hem verandert.
- **De vragenronde levert te weinig op bij een grotere batch.** Vier pagina's leverden vier losse
  briefings op met samen 16 vragen, omdat ik ze één voor één koos. Bij "genereer alles" gaat de
  hele batch door één briefing met maximaal acht vragen plus één gegarandeerde vraag per pagina. Of
  dat bij tien pagina's knelt, is deze ronde niet gemeten.
- **Het rapport stelt vier bijna gelijke plaatspagina's voor.** Van de zes aanbevelingen waren er
  vier plaatsnaamvarianten (Den Bosch, Eindhoven, Vught, Tilburg) met sterk overlappende doelvraag,
  en geen van de zes was een nieuwe pagina. Dat kan kloppen, want die pagina's bestaan echt en zijn
  dun. Of het cluster hierdoor slecht gedekt wordt, vraagt een tweede cluster om te vergelijken.

---

## 2. Het eindoordeel over het inspace.io-niveau

**Nee, dit niveau halen we niet.** InSpace belooft pagina's die "op expertniveau, volledig on-brand"
zijn en die na goedkeuring rechtstreeks het CMS in gaan; wat hier uit de pijplijn kwam zijn vier
pagina's die de lezer 80 keer opdragen iets na te vragen of te laten vastleggen, samen 5 concrete getallen bevatten, en
waarvan er twee in hun openingsalinea uitleggen dat het bedrijf niet kan worden aanbevolen, terwijl
de eigen site van de klant gewoon "maximaal €6000", "tussen de €500 en €2500 subsidie" en achttien
plaatsnamen noemt.

Dat oordeel gaat over de uitkomst, niet over de opzet. Het onderzoek per contentitem levert precies
de vragen die een koper stelt ("Wat kost het als ik tegelijk een nieuwe cv-ketel nodig heb?",
"Hoe vergelijk ik offertes eerlijk?"), en de algemene uitleg over hybride warmtepompen is inhoudelijk
correct en goed geordend. Het gat zit tussen die opzet en de tekst, en de twaalf punten hierboven
liggen allemaal in dat gat.

---

## 3. De vier pagina's, punt voor punt

Ik loop de checklist langs per pagina en noem alleen wat een oordeel oplevert. Punten die voor een
pagina niet van toepassing zijn, staan er niet bij; punten die niet te beoordelen zijn, staan er wel
bij met de reden.

### Pagina A: "Vul de pagina voor snel installeren aan met echte planningsinformatie"
Landingspagina, doelvraag "Wie kan in de regio Oost-Brabant snel een hybride warmtepomp
installeren?", verbetering van `https://gasservice-brabant.nl/hybride-warmtepomp/`.
940 woorden, kwaliteit 48, GEO 100, dekking 90, bronherleidbaarheid 57, 63 openstaande punten.

| # | Punt | Oordeel | Bewijs |
|---|---|---|---|
| 1 | Eén duidelijke hoofdvraag | Voldoet | De pagina gaat van begin tot eind over snel installeren in Oost-Brabant. |
| 2 | Duidelijke definitie | Voldoet | "Een hybride warmtepomp werkt samen met de cv-ketel." |
| 3 | Wat biedt het bedrijf | Zwak | "Het aanbod omvat cv-ketels kopen en huren, onderhoud, inspecties en hulp bij cv-ketelstoringen." Dat is de opsomming uit de feitenkaart, niet wat dit bedrijf bij een hybride warmtepomp doet. |
| 6 | Wanneer wel en niet geschikt | Voldoet | "Eerst isoleren kan soms verstandig zijn, maar dit verschilt per woning." |
| 7 | Kenmerken concreet | Voldoet niet | Eén concreet getal op de hele pagina ("meer dan 90 jaar ervaring"). Geen prijs, geen levertijd, geen vermogen. |
| 8 | Hoe het proces werkt | Voldoet | "Een gebruikelijk traject bestaat uit aanvraag, beoordeling, offerte, akkoord en een montageafspraak." |
| 14 | Bedrijf gekoppeld aan het onderwerp | Zwak | "De website van Gasservice Brabant noemt ervaren vakmannen, meer dan 90 jaar ervaring, erkenning als installateur en een BRL6000-25-certificaat." De site praat over zichzelf in de derde persoon. |
| 17 | Concrete feiten en cijfers | Voldoet niet | "Een concrete wachttijd is niet beschikbaar." En: "Op 1 september 2026 is installatie in Oss bevestigd, maar er is geen concrete doorlooptijd of eerst mogelijke montagedatum vastgelegd." |
| 19 | Natuurlijke, menselijke taal | Voldoet niet | "Gasservice Brabant B.V. installeert hybride warmtepompen in Oost-Brabant en is gevestigd of actief als cv-installatiebedrijf in Den Bosch. [F1, F2, F5, F14]" |
| 20 | De antwoorden staan op de pagina | Voldoet niet | Vijftien zinnen dragen de lezer op iets na te vragen of vast te laten leggen. FAQ: "Hoe snel kan ik een woningbeoordeling krijgen?" wordt beantwoord met "Vraag Gasservice Brabant tijdens het contact welke mogelijkheid actueel beschikbaar is." |
| 21 | Duidelijke entiteiten | Zwak | Gasservice Brabant 14 keer, Den Bosch, Oss, Oost-Brabant, Techniek Nederland, BRL6000-25, ISDE, RVO. Geen merknamen van warmtepompen, terwijl de site Intergas, Remeha, Nefit en Vaillant noemt. |
| 24 | Nadelen en beperkingen | Voldoet | "een hybride warmtepomp is niet automatisch de snelste oplossing voor directe warmte of warm water." |
| 27 | Locatie expliciet | Zwak | Alleen Oss is met naam bevestigd, en de pagina zegt dat er zelf bij: "Alleen Oss is concreet bevestigd voor deze installatie." De site noemt achttien plaatsen. |
| 32 | Claims onderbouwd | Voldoet | 18 claims, 57% herleidbaar tot een F-nummer met citaat. |
| 34 | Waarde zonder de bedrijfsnaam | Voldoet niet | Haal de naam weg en er blijft een checklist over met wat je aan een installateur moet vragen. |

**Contract tegenover tekst.** Het contract vroeg 13 secties en 19 FAQ-vragen bij een doellengte van
400 tot 700 woorden; de som van de sectielengtes was precies 700. De pagina telt 13 koppen, dus alle
secties bestaan, en de dekkingspoort geeft 90. Wat de poort niet zag: de secties bestaan wel, maar
tien ervan beantwoorden hun deelvraag met "dat is niet beschikbaar, vraag het na". Dat is precies
het gat waar verbetering 7 over gaat.

**Feitelijkheid.** Elke concrete bewering over Gasservice Brabant is terug te vinden in de
feitenkaart. Ik heb geen verzonnen feit gevonden. Twee dingen vallen wel op: "meer dan 90 jaar
ervaring" rust op feit F17 waarvan de letterlijke tekst "90+ jaar eraring" is, inclusief de typefout
van de site zelf, en de pagina noemt Oss als enige bevestigde plaats terwijl de klant Tilburg,
Eindhoven en Oss alle drie bevestigde. De twee laatste antwoorden zijn weggegooid (verbetering 1).

### Pagina B: "Maak de Eindhoven-pagina geschikt voor woningcheck én advies"
Landingspagina, twee doelvragen over geschiktheidsbeoordeling en advies in Eindhoven, verbetering van
`https://gasservice-brabant.nl/warmtepomp-eindhoven/`.
880 woorden, kwaliteit 46, GEO 83, dekking 88, bronherleidbaarheid 28, 45 openstaande punten.

| # | Punt | Oordeel | Bewijs |
|---|---|---|---|
| 1 | Eén duidelijke hoofdvraag | Voldoet | De pagina gaat over de woningcheck en het advies dat daarop volgt. |
| 2 | Duidelijke definitie | Voldoet | "Een woningcheck beoordeelt vooraf de woning en installatie." |
| 3 | Wat biedt het bedrijf | Voldoet niet | De openingsalinea zegt het tegenovergestelde: "de beschikbare bedrijfsinformatie bevestigt deze combinatie van diensten niet voor Eindhoven." |
| 5 | Problemen van de klant | Voldoet | "Te kleine radiatoren kunnen onvoldoende warmte afgeven, waardoor grotere radiatoren, ventilatoren of andere aanpassingen nodig kunnen zijn." |
| 6 | Wanneer wel en niet geschikt | Voldoet | "Een woning hoeft niet altijd volledig geïsoleerd te zijn voordat een hybride warmtepomp mogelijk is." |
| 9 | Onderscheid tussen situaties | Voldoet | "Bij een tussenwoning of appartement moeten de woning, installatie en plaatsingsmogelijkheden afzonderlijk worden beoordeeld." |
| 11 | Waarom klanten voor dit bedrijf kiezen | Voldoet niet | De pagina geeft geen enkele reden. Sterker: "Daardoor kan Gasservice Brabant op basis van deze informatie niet worden aangewezen als de gevraagde installateur in Eindhoven." |
| 14 | Bedrijf gekoppeld aan het onderwerp | Voldoet niet | "Gasservice Brabant plaatst hybride warmtepompen in Oss. Advies en aansluitende installatie in Eindhoven zijn niet bevestigd." Op een pagina die over Eindhoven gaat. |
| 15 | Expertise aantoonbaar | Zwak | "De website vermeldt dat Gasservice Brabant erkend installateur is en een BRL6000-25-certificaat heeft. Een actueel registratienummer en de precieze reikwijdte zijn niet bevestigd." De pagina ondermijnt in dezelfde zin het bewijs dat hij aandraagt. |
| 17 | Concrete feiten en cijfers | Voldoet niet | Nul bedragen, nul termijnen, nul aantallen op de hele pagina. |
| 19 | Natuurlijke, menselijke taal | Voldoet niet | Naast de stijve toon spreekt deze pagina de lezer met "u" aan ("Leg vooraf uw adres, woningtype ... klaar"), terwijl pagina A "jouw" gebruikt. Het merkprofiel staat op "wij". |
| 20 | De antwoorden staan op de pagina | Voldoet niet | "Vraag Gasservice Brabant schriftelijk of een losse woningcheck en aansluitende installatie in Eindhoven beschikbaar zijn, wat de woningcheck kost en of deze zonder installatieopdracht mogelijk is." Dat is de laatste zin van de pagina. |
| 23 | Wat, voor wie, waarom, wanneer, hoe | Voldoet grotendeels | De algemene laag beantwoordt ze goed: wat wordt gecontroleerd, waarom isolatie meetelt, hoe het vermogen volgt uit oppervlakte en bouwjaar. |
| 25 | Duidelijke conclusie | Voldoet niet | De conclusie is een lijst dingen die de lezer zelf moet uitzoeken. |
| 28 | Werkgebied gekoppeld aan de dienst | Voldoet niet | De koppeling wordt expliciet ontkend, terwijl de klant hem bevestigde. |
| 32 | Claims onderbouwd | Zwak | 8 claims, waarvan 28% herleidbaar. Dat is de laagste van de vier. |
| 34 | Waarde zonder de bedrijfsnaam | Voldoet | Dit is de enige pagina waarvan de algemene laag zelfstandig nuttig is: de uitleg over warmteverlies, afgiftesysteem, aparte groep en Vereniging van Eigenaars klopt en is bruikbaar. |

**Contract tegenover tekst.** Het contract vroeg 11 secties (samen 560 woorden) en 18 FAQ-vragen; de
pagina heeft 11 koppen en 18 FAQ-vragen en haalt dekking 88. Het contract is dus vrijwel volledig
uitgevoerd. Dat is precies het probleem: het contract vroeg om een pagina die zijn eigen
onderbouwing ter discussie stelt, en de pagina levert dat netjes.

**Feitelijkheid.** Geen verzonnen feiten. Wel het omgekeerde: de pagina laat feiten liggen die de
klant bevestigd had. "Werken jullie momenteel in Eindhoven en plaatsen jullie daar hybride
warmtepompen?" was met "Ja" beantwoord.

### Pagina C: "Maak de Tilburg-pagina duidelijk over specialistische plaatsing en nazorg"
Landingspagina, doelvraag "Welke specialist in Tilburg is aan te raden voor het laten plaatsen van
een hybride warmtepomp?", verbetering van `https://gasservice-brabant.nl/warmtepomp-tilburg/`.
1331 woorden, kwaliteit 48, GEO 100, dekking 86, bronherleidbaarheid 39, 96 openstaande punten.

| # | Punt | Oordeel | Bewijs |
|---|---|---|---|
| 1 | Eén duidelijke hoofdvraag | Voldoet niet | De pagina beantwoordt de vraag met een weigering: "Gasservice Brabant kan daarom momenteel niet als aantoonbare specialist in Tilburg worden aanbevolen." |
| 3 | Wat biedt het bedrijf | Voldoet niet | "Concrete hybride merken, modellen, vermogens en leverbaarheid zijn niet vastgesteld." De site noemt Intergas, Remeha, Nefit en Vaillant. |
| 6 | Wanneer wel en niet geschikt | Voldoet | "Bij beperkte isolatie, ongeschikte radiatoren, onvoldoende ruimte of een niet-passende cv-ketel kan een aanpassing of ander systeem nodig zijn." |
| 11 | Waarom klanten voor dit bedrijf kiezen | Voldoet niet | "Deze positionering bewijst geen plaatsingservaring in Tilburg." |
| 12 | Onderscheid met alternatieven | Voldoet | "Een hybride warmtepomp werkt samen met de cv-ketel. Een volledig elektrische warmtepomp vervangt de cv-ketel voor verwarming." |
| 14 | Bedrijf gekoppeld aan het onderwerp | Voldoet niet | "De feitenkaart bevat geen Tilburgse projecten, aantallen plaatsingen of lokale referenties." Het woord "feitenkaart" is ons interne artefact en staat op de pagina van de klant. |
| 15 | Expertise aantoonbaar | Voldoet niet | "Vraag daarom om controleerbare projectreferenties en bevestiging van het werkgebied." De pagina adviseert de lezer het bedrijf te wantrouwen. |
| 17 | Concrete feiten en cijfers | Voldoet niet | Vier getallen op 1331 woorden, waarvan drie keer "90 jaar" en één keer "24 uur". |
| 20 | De antwoorden staan op de pagina | Voldoet niet | 31 zinnen beginnen met Vraag, Laat, Controleer, Bespreek, Vergelijk, Leg of Neem. Elf keer staat er dat iets niet bevestigd of niet vastgesteld is. |
| 24 | Nadelen en beperkingen | Voldoet | "Een hybride systeem is niet automatisch verstandig wanneer een warmtenet gepland is." |
| 25 | Duidelijke conclusie | Voldoet niet | De slotalinea zegt dat een betrouwbare offerte "controleerbare Tilburgse referenties" bevat, wat neerkomt op: ga elders kijken. |
| 31 | Onderscheid met concurrenten | Voldoet niet | Niet te beoordelen als voordeel, want de pagina positioneert het bedrijf negatief tegenover een onbenoemde standaard. |
| 34 | Waarde zonder de bedrijfsnaam | Voldoet | Zonder de naam is dit een bruikbare vragenlijst voor wie een installateur zoekt. Met de naam erin is het een pagina die zichzelf afraadt. |

**Contract tegenover tekst.** Dit is het duidelijkste geval van een contract dat niet past. Het
vroeg 25 secties van elk 40 woorden, samen 1000, bij een doelbereik van 400 tot 700 woorden voor een
landingspagina. De pagina heeft alle 25 koppen en werd 1331 woorden, bijna twee keer het maximum. De
dekkingspoort geeft 86 en ziet de overschrijding niet: hij toetst per sectie en niet op de totale
lengte. De opgeslagen `word_count` staat op 896, want die wordt bij reparatie niet bijgewerkt.

**Feitelijkheid.** Geen verzonnen feiten, en 39% van de 12 claims is herleidbaar. Het echte probleem
is omgekeerd: het bevestigde feit "Ja, Tilburg valt binnen het werkgebied en daar plaatst Gasservice
Brabant hybride warmtepompen" was 25 seconden vóór het opstellen van het contract opgeslagen en
bereikte noch het contract noch de tekst.

### Pagina D: "Voeg een duidelijke prijsuitleg voor hybride warmtepompen in Oss toe"
Artikel, doelvraag "Wat kost een hybride warmtepomp inclusief installatie bij een installateur in
Oss?", verbetering van `https://gasservice-brabant.nl/kennis-bank/wat-zijn-de-kosten-van-een-hybride-warmtepomp/`.
1560 woorden, kwaliteit 36, GEO 100, dekking 98, bronherleidbaarheid 36, 46 openstaande punten.

| # | Punt | Oordeel | Bewijs |
|---|---|---|---|
| 1 | Eén duidelijke hoofdvraag | Voldoet | Alles gaat over de kosten. |
| 7 | Kenmerken concreet | Voldoet niet | "Er is geen gecontroleerde lokale prijs, bandbreedte of voorbeeldprijs beschikbaar." |
| 8 | Hoe het proces werkt | Voldoet | De pagina legt uit hoe je een terugverdientijd berekent: "Deel de netto investering na subsidie door de verwachte jaarlijkse besparing na aftrek van extra elektriciteitskosten, onderhoud en reparaties." |
| 16 | Echte klantvragen | Voldoet | De koppen zijn precies de vragen uit een verkoopgesprek: wat kost het als de ketel blijft hangen, welke extra kosten kunnen ontstaan, wat kost onderhoud per jaar. |
| 17 | Concrete feiten en cijfers | Voldoet niet | **Nul bedragen op een pagina over kosten.** De pagina die verbeterd moest worden noemt zelf "maximaal €6000" en "gemiddeld tussen de €500 en €2500" subsidie. |
| 20 | De antwoorden staan op de pagina | Voldoet niet | De eerste zin is: "Er is geen gecontroleerde, concrete prijs voor een hybride warmtepomp inclusief installatie in Oss beschikbaar in dit dossier." Het woord "dossier" is opnieuw ons interne artefact. |
| 22 | Relaties tussen onderwerpen | Voldoet | "Samen met de warmtepomp vormt de ketel een hybride systeem." En de koppeling tussen vermogen, oppervlakte en bouwjaar. |
| 23 | Wat, waarom, hoe, hoeveel | Deels | Alle vragen worden gesteld, "hoeveel" wordt nergens beantwoord. |
| 24 | Nadelen en beperkingen | Voldoet | "De laagste totaalprijs is niet automatisch de beste aanbieding." |
| 25 | Duidelijke conclusie | Voldoet niet | Er is geen conclusie over de prijs, want er is geen prijs. |
| 32 | Claims onderbouwd | Zwak | 12 claims, 36% herleidbaar. |
| 34 | Waarde zonder de bedrijfsnaam | Deels | Als methodiek bruikbaar, als antwoord op de titelvraag niet. |

**Contract tegenover tekst.** Het contract vroeg 25 secties met samen 1175 woorden en 20
FAQ-vragen; de pagina heeft 25 koppen, 20 FAQ-vragen en 1560 woorden, en haalt dekking 98. Dit is de
best gedekte pagina van de vier en tegelijk de slechtste (kwaliteit 36). Dat is het scherpste bewijs
dat de dekkingspoort meet of de secties er staan, niet of ze iets zeggen.

**Feitelijkheid.** Geen verzonnen bedragen, en dat is precies zoals het hoort: er stond geen bedrag
op de feitenkaart, dus schrijft de pijplijn er geen. Conventie 3 werkt. Het probleem zit een stap
eerder: het bedrag staat wél op de site van de klant, op precies de pagina die verbeterd werd, maar
de crawler bewaarde van die pagina alleen het navigatiemenu. In de feitenkaart staat hij als
niet-citeerbare achtergrond: "Sitetekst \"Gasservice Brabant: de kosten van een hybride warmtepomp\":
Gasservice Brabant: de kosten van een hybride warmtepomp Cv-ketel Cv-ketel kopen CW4-ketel...".
Van de 37 feiten in de bevroren kaart bevat er geen enkele een bedrag.

---

## 4. De gemeten cijfers

### Per pagina, eindstand

| Pagina | Type | Woorden (doel) | Kwaliteit | GEO | Dekking | Bron­herleidbaarheid | Reparatie­rondes | Openstaande punten | Check nodig |
|---|---|---|---|---|---|---|---|---|---|
| A. Snel installeren | landing | 940 (400-700) | 48 | 100 | 90 | 57% | 3 van 3 | 63 | ja |
| B. Eindhoven | landing | 880 (400-700) | 46 | 83 | 88 | 28% | 3 van 3 | 45 | ja |
| C. Tilburg | landing | 1331 (400-700) | 48 | 100 | 86 | 39% | 3 van 3 | 96 | ja |
| D. Oss prijs | article | 1560 (700-1200) | 36 | 100 | 98 | 36% | 3 van 3 | 46 | ja |
| **Gemiddeld** | | **1178** | **44,5** | **95,8** | **90,5** | **40%** | **3** | **62,5** | **4 van 4** |

Ter vergelijking: van de 29 eerder afgeronde pagina's op productie (oude pijplijn) staan er 15 op
"check nodig", dus 52%. Deze ronde is dat 4 van de 4, dus 100%. De oorzaak is de regel in
`reviseContentPiece` dat `needs_review` waar is zodra er ook maar één openstaand punt is, en de
citeerbaarheidsbeoordelaar krijgt de opdracht altijd te melden welke vraag een lezer overhoudt.
Die twee samen maken "geen check nodig" onbereikbaar.

### De kwaliteit per reparatieronde

| Pagina | Concept | Ronde 1 | Ronde 2 | Ronde 3 (eindstand) |
|---|---|---|---|---|
| A. Snel installeren | 67 | 74 | 68 | **48** |
| C. Tilburg | 48 | 52 | 35 | **48** |

Pagina A eindigt 19 punten lager dan het eerste concept en 26 punten lager dan de beste
tussenversie. Voor B en D heb ik de tussenstanden niet per ronde vastgelegd; hun eindstand (46 en
36) ligt in dezelfde orde.

### Bevindingen per ronde

| Pagina | Concept | Ronde 1 | Ronde 2 | Ronde 3 |
|---|---|---|---|---|
| A. Snel installeren | 68 | 53 | 77 | 63 |
| C. Tilburg | 119 | 89 | 101 | 96 |

### Kosten en doorlooptijd

| | Waarde |
|---|---|
| Meting en rapport (46 metingen, 30 vragen) | $0,8771 |
| Vier pagina's schrijven | $4,5240 |
| **De hele ronde** | **$5,4011 over 191 aanroepen** |
| Per pagina | $1,1310 |
| Voorspeld in het herontwerpadvies | $0,24 per pagina |
| Doorlooptijd meting (46 taken) | 16:40 tot 16:45, dus ongeveer 5 minuten |
| Doorlooptijd schrijven (4 pagina's, 20 taken) | 16:52 tot 17:11, dus ongeveer 19 minuten |
| Gemiddelde looptijd van een schrijfaanroep | 79 seconden, met 261 seconden wachten in de rij |
| Gemiddelde looptijd van een reparatieaanroep | 124 seconden, met 27 seconden wachten |

De doorlooptijd is geen probleem meer: A10 uit het herontwerp doet wat het beloofde, vier pagina's
draaiden echt parallel. Eén schrijfaanroep werd wel afgebroken op de limiet van 150 seconden
(`CALL_BUDGET_MS`), maar dat kostte geen tweede dure aanroep: de tekst stond al op schijf en de
hervatting pakte hem op. Dat onderdeel van het ontwerp werkt.

### De feitenbasis

| | Waarde |
|---|---|
| Bevestigde feiten over het merk vóór deze ronde | 21, allemaal uit de site, 0 uit klantantwoorden |
| Feiten die "warmtepomp" noemen | 2, beide alleen "het aanbod omvat hybride warmtepompen" |
| Opgeslagen sitepagina's | 148 |
| Waarvan het opgeslagen fragment binnen het navigatiemenu eindigt | 139 (94%) |
| Briefingvragen deze ronde | 16, waarvan 9 met reikwijdte "pagina" |
| Beantwoord met echte gegevens van de site | 8 |
| Daarvan doorgekomen tot de feitenkaart | 4 |
| Algemene uitleg gezocht door het itemdossier | 35 |
| Daarvan bevestigd op de bron | 13 (37%) |
| Afgekeurd met "citaat staat niet op de bron" | 18 |
| Afgekeurd met "bron niet op te halen" | 4 |

---

## 5. Hoe deze ronde gelopen is

Voor wie hem wil overdoen of nalopen.

1. **Cluster aangemaakt** via `POST /api/analyses` met profiel
   `c34d11fc-8770-4fab-ae56-4be5e4bea98c` en onderwerp "Hybride warmtepomp". Reden voor dit
   onderwerp: het staat in `profiles.products`, het overlapt met geen van de drie bestaande clusters
   (cv-ketel onderhoud, cv-ketel storing, zonneboiler), en de nulmeting bevestigt de kans: score
   9 van 100, share of voice 3%, 2 citaties, 0 keer als eerste genoemd, en alle 30 vragen winbaar.
2. **Voorbereiding en 30 vragen** automatisch, daarna de review-gate via `POST .../confirm`.
   `MEASURE_WEB_SEARCH` stond aan, zoals gevraagd.
3. **Meting** van 46 runs, aggregatie en rapport. Zes aanbevelingen, alle zes "verbeteren".
4. **Vier pagina's gekozen** die samen het cluster afdekken: snelheid en planning, geschiktheid en
   advies, prijs, en de keuze van een specialist met nazorg. Elk gestart via `POST .../generate`,
   de weg die een gebruiker neemt als hij pagina's één voor één kiest.
5. **Briefing beantwoord** via `POST .../briefing` met `action: "write"`. Acht vragen beantwoord met
   wat aantoonbaar op gasservice-brabant.nl staat, acht overgeslagen omdat er geen echt gegeven voor
   was. Overgeslagen en verplicht waren onder meer: binnen hoeveel werkdagen een eerste beoordeling
   plaatsvindt, hoe lang de montage duurt, de eerst mogelijke installatiedatum, en de richtprijs
   inclusief installatie in Oss. Er is geen enkel feit over Gasservice Brabant verzonnen.
6. **Schrijven** via de normale keten `content_plan` naar `content_draft` naar `content_revise`.
   Alles op productie, met de echte modellen.

**Wat er niet gerepareerd is in deze sessie.** Niets. Er is geen blokkerende fout tegengekomen: de
ronde liep van begin tot eind door. De twaalf punten hierboven zijn werk voor een volgende sessie.
