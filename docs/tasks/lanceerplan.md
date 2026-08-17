# Lanceerplan: van "gebouwd" naar "Van den Udenhout is klant"

**Opgesteld:** 11 augustus 2026 · **Doel:** officiële lancering en de eerste echte klant over twee
weken · **Vertrekpunt:** `main` op `0a5e74e`, migraties t/m `0052`, 998 unittests, 82 ketentests

In negen bouwrondes is het Nova-plan (`docs/Nova.md`) afgebouwd: de merk-werkruimte, rollen en
uitnodigingen, de merkprofiel-wizard, het contentplan, het CSM-paneel, Search Console, de lus, en het
accountscherm. Wat er niet is gebeurd, is dat iemand het geheel één keer als klant heeft doorlopen.

Dit document is dat plan. Het beantwoordt vier vragen per onderdeel:

1. **Werkt het?** Doet de code wat hij belooft, tegen echte data.
2. **Is het stuk?** Heeft de nieuwe laag iets gebroken dat eerder werkte.
3. **Is dit InSpace-kwaliteit?** Ja of nee, en zo nee: wat er precies aan moet gebeuren (§0).
4. **Is dit productiewaardig?** Los van Nova, als bouwer van deze app: kan dit een maand draaien met
   echte klanten en echt geld (§0b).

Die vierde vraag is de belangrijkste toevoeging. Nova is zelf software van mensen die keuzes maakten
onder tijdsdruk, en op sommige punten hoort ORBIT ENGINE beter te zijn dan zijn voorbeeld. **De scherpste
vondst van dit document zit dan ook niet in de Nova-vergelijking maar in §0b: er zit geen enkele rem
op wat een klant kan uitgeven, en sinds vandaag mag hij zelf de dure knoppen indrukken.**

---

## 0. Wat "InSpace-kwaliteit" hier betekent, in vijf toetsbare eigenschappen

"Kwaliteit gelijktrekken met Nova" is een gevoel, en daar kun je niet op afvinken. Uit de
reconstructie in `Nova.md` §3 en §3.9 komen vijf eigenschappen die stuk voor stuk **waarneembaar** zijn
in hun berichtenbestand, en dus ook in ORBIT ENGINE te controleren. Dit is de lat.

| # | Eigenschap | Het bewijs bij Nova | Hoe je hem toetst |
|---|---|---|---|
| **K1** | **Elke toestand heeft een eigen scherm.** Leeg is geen afwezigheid maar een boodschap | Vier verschillende lege staten voor één tabel: geen koppeling, geen geplaatste pagina's, nog aan het verzamelen, geen toegang | Zet het scherm in elke toestand die kan bestaan. Staat er iets, en klopt het? |
| **K2** | **Elke foutmelding is specifiek.** Geen "er ging iets mis" | Zestien eigen foutmeldingen in alleen het accountscherm; vier dialogen met elk een eigen mislukt-titel | Forceer elke fout. Zegt de melding wát er mis is en wie het kan oplossen? |
| **K3** | **De taal zegt wie aan zet is.** Naast de technische status | `runningStatus.waitingInYourCms`, "Waiting for you" | Staat er bij elke wachtende toestand wie er iets moet doen? |
| **K4** | **Onomkeerbaar wordt vooraf benoemd**, in een eigen blok | `cannotBeUndoneDescription` als apart kader, niet als zin in een alinea | Elke handeling die niet terug kan: staat de waarschuwing er, en apart? |
| **K5** | **Bulk is eerlijk over gedeeltelijk succes** | `partialApproval`: "Approved {ok} of {total} items, {failedCount} failed ({reason})" | Laat een bulkactie half mislukken. Wordt dat eerlijk gemeld? |

**Waarom juist deze vijf.** Ze zijn alle vijf te controleren zonder Nova te zien, ze gaan alle vijf
over het moment waarop software vertrouwen wint of verliest, en ORBIT ENGINE faalt op minstens drie ervan op
plekken die we al kennen. Ze vormen samen de kolom "Nova-kwaliteit" in elke tabel hieronder.

### De grens van mijn oordeel

⚠️ **Ik heb Nova nooit gezien.** Mijn hele beeld komt uit hun berichtenbestand (900 sleutels), hun
gecompileerde CSS en hun marketingtekst. Dat is genoeg om gedrag, toestanden en taal te
reconstrueren, en niet genoeg om over vormgeving, ritme en gevoel te oordelen. Waar ik hieronder
"Nova-kwaliteit: nee" schrijf, gaat dat over een **aantoonbaar ontbrekende toestand, melding of
regel**, nooit over smaak.

**En ik kan die schermafdrukken niet zelf maken.** Twee losse redenen, allebei hard:

- **Van Nova niet**, want Nova zit achter een inlog op `nova.inspace.io` en ik heb geen account.
  Alles wat ik van hun product weet, komt uit bestanden die zij publiek serveren.
- **Van ORBIT ENGINE ook niet.** De browser in deze omgeving komt niet door de uitgaande proxy heen; drie
  configuraties geprobeerd, alle drie `ERR_CONNECTION_RESET`. `curl` werkt wél, dus ik kan HTML en
  statuscodes lezen, maar geen pixel zien. Ik beoordeel schermen dus uit de code en het gedrag, niet
  uit hun aanblik.

Dat maakt jouw ogen een onderdeel van dit plan en geen extraatje. Wat ik van je vraag in spoor C:
tien schermafdrukken van **ORBIT ENGINE zelf**, na het inloggen, van de schermen in §5. Dat kost je vijf
minuten en het vult precies het gat dat ik niet kan vullen. Nova-afdrukken zijn mooi meegenomen als
je er nog bij kunt; noodzakelijk zijn ze niet, want de vijf eigenschappen hierboven zijn ook zonder
te toetsen.

---

## 0b. De tweede lat: productiewaardig, los van Nova

Nova-pariteit is één maatstaf en niet de enige. Nova is zelf software van mensen die keuzes maakten
onder tijdsdruk, en op sommige punten kan ORBIT ENGINE beter zijn dan zijn voorbeeld. Deze zeven punten komen
niet uit hun berichtenbestand maar uit mijn eigen oordeel als bouwer van deze app, en ze bepalen of
dit een maand kan draaien met echte klanten en echt geld.

| # | Eigenschap | Stand vandaag |
|---|---|---|
| **P1** | **Geen stille fout.** Elke `catch` die slikt en elke `?? null` die een storing als "leeg" toont, is een fout die je pas maanden later ontdekt | **Deels.** De shim gooide geneste selects stil weg, de onzekerheid werd met `Math.random()` benaderd. Beide gerepareerd, nooit systematisch nagelopen |
| **P2** | **Eén waarheid, geen tweeling.** Twee functies die hetzelfde zouden moeten doen, drijven uit elkaar | **Nee.** `getOwnedProfile` en `getOwnedAnalysis` dreven precies zo uit elkaar. Gerepareerd, maar de structuur die het herhaalt staat er nog |
| **P3** | **Kosten hebben een plafond.** Geen enkel pad waarlangs iemand ongelimiteerd geld kan uitgeven | **Nee, en dit is nu dringend.** Zie hieronder |
| **P4** | **Waarneembaar bij storing.** Als het om drie uur 's nachts breekt, zie je dat dan | **Nee.** Alles gaat naar `console.log` in Vercel. Er is geen melding, geen drempel, niemand die iets hoort |
| **P5** | **Herstelbaar.** Backups, en een klant volledig kunnen verwijderen | **Deels.** Supabase maakt backups; een klant verwijderen kan niet |
| **P6** | **Grenzen getest.** Nul onderwerpen, 150 pagina's, een merknaam van 200 tekens | **Nee.** Nooit gedaan |
| **P7** | ~~**Geen wedstrijdcondities.** Twee mensen die tegelijk hetzelfde doen~~ | **Af.** Zie D4, D7 en D10 hieronder |

### P3: besluit 18, en de eerste helft is gebouwd

Er is één kostenplafond in de hele app: de onboarding stopt bij $2,15 per merk
(`lib/pipeline/onboarding-budget.ts`). Daarbuiten was er niets, terwijl de klant sinds de ochtend van
11 augustus zelf een meting mocht starten en een maand mocht goedkeuren. De rekensom eronder:

| Handeling | Kosten per klik |
|---|---|
| Onderzoek bij een nieuw merk | ~$0,25 |
| Analyse starten | ~$0,82 |
| Maand goedkeuren, 10 pagina's | ~$2,80 |
| Pagina opnieuw laten schrijven | ~$0,28 |

Een klant met acht onderwerpen die op één middag alles start, geeft $6,56 uit zonder dat iemand het
merkt. Twintig klanten die hun plan goedkeuren, is $56 in één nacht.

**Besluit 18 (11 augustus 2026): alleen de beheerder start betaald werk.** Het besluit van diezelfde
ochtend is teruggedraaid toen de som zichtbaar werd. Dat past ook beter bij hoe dit verkocht wordt:
de consultant zet klaar, de klant kijkt na en geeft akkoord. Akkoord geven is gratis; het in gang
zetten van betaald werk is een handeling van de eigenaar.

**Gebouwd op 11 augustus** (`lib/cost-guard.ts` plus `lib/cost-rules.ts`): elf dure routes stellen
dezelfde vraag aan dezelfde functie, elke geweigerde handeling heeft een eigen Nederlandse zin die
zegt bij wie de klant moet zijn, en de knoppen die geld kosten staan er voor een klant niet meer. Er
is een broncodetest die valt zodra er een dure route bijkomt zonder de controle: dat is de fout die
je wilt vangen, niet "de controle werkt niet" maar "iemand vergat hem".

**Wat er nog moet, en het blijft nodig ook al mag de klant nu niets:**

1. **Een maandplafond per account** (halve dag). Ook een beheerder vergist zich, en één fout in een
   lus is duurder dan alle klantklikken bij elkaar.
2. **Een dagplafond over alle accounts** (twee uur). De noodrem, los van wie de knop indrukte.

Zonder die twee zou ik nog steeds niet lanceren. De rem die er nu is, gaat over wie; de rem die nog
moet komen, gaat over hoeveel.

### P2 verdient een structurele oplossing en geen tweede pleister

`getOwnedProfile` en `getOwnedAnalysis` waren twee functies die dezelfde vraag beantwoordden ("mag
deze gebruiker hierbij") over twee objecten die aan elkaar hangen. Ze dreven uit elkaar en dat kostte
een fout die pas de eerste klant zou raken.

De patch van vandaag herstelt de gelijkheid en niet de oorzaak. **Voorstel (een halve dag):** één
`mayAccess(userId, { profile })`-functie met de drie lagen, en `getOwnedAnalysis` haalt zijn merk op
en stelt diezelfde vraag. Dan is er nog één plek waar de regel staat, en de volgende laag kan niet
meer half doorgevoerd worden. Plus een test die de twee functies naast elkaar zet met dezelfde
gebruiker en dezelfde verwachting; die had de fout van vandaag gevangen.

---

## 1. Wat de fouten van vandaag voorspellen over de fouten van morgen

Op 11 augustus zijn drie echte fouten gevonden, en ze hebben **één patroon**. Dat patroon bepaalt
waar spoor A tot en met E het scherpst moeten kijken.

| Fout | Wat er gebeurde | Het patroon |
|---|---|---|
| `getOwnedAnalysis` miste de accountlaag | Migratie 0046 gaf `getOwnedProfile` een derde laag; de zusterfunctie kreeg hem niet | **Een laag toegevoegd, één aanroeper vergeten** |
| Een nieuw merk kreeg geen account | 0046 vulde `account_id` met terugwerkende kracht, de aanmaakroute zette hem niet | Idem |
| Het CSM-paneel telde opgeloste mislukkingen | Nieuw scherm las een oude tabel zonder de historie te wegen | **Nieuw scherm, oude data, verkeerde aanname** |

Twee bijvangsten uit dezelfde dag, allebei in nieuw werk en allebei door een test gevangen: de
kansenlijst sorteerde betaald werk onder onbetaald werk, en de meetonzekerheid werd met
`Math.random()` benaderd waardoor hetzelfde cijfer per keer anders kon lezen.

**De conclusie voor dit plan.** De gevaarlijke plekken zijn niet de nieuwe modules, want die zijn met
tests gebouwd. Ze zitten op de **naden**: waar een nieuwe laag een oude aanroeper heeft, waar een
nieuw scherm oude data leest, en waar twee functies hetzelfde zouden moeten doen maar los zijn
gegroeid. Spoor B en D gaan daar expliciet op jagen.

---

## 2. Vijf sporen, en wat ze elk uitsluiten

| Spoor | Vraag | Toetst | Wie | Duur | Kosten |
|---|---|---|---|---|---|
| **A** | Werkt de keten van nul tot klant? | werkt het | ik | 1 dag | ~$3 |
| **B** | Ziet en mag elke rol precies het juiste? | K3, P2 | ik | 1 dag | 0 |
| **C** | Haalt elk scherm de lat van §0? | K1 t/m K5 | ik, jij levert tien afdrukken | 2 dagen | 0 |
| **D** | Wat gebeurt er als het misgaat? | K2, P1, P7 | ik | 1,5 dag | ~$1 |
| **E** | Kan dit een maand draaien zonder toezicht? | P3 t/m P6 | ik | 1,5 dag | 0 |
| **F** | De ingenieursschuld inlossen | P2, P3 | ik | 1 dag | 0 |
| **R** | **De meting meet de verkeerde vragen** (§6b) | de kern van het product | ik | 2 dagen | 0 |

Samen 10 werkdagen. **Spoor R is nieuw en het is het zwaarste punt van dit document**: bij een lokale
ondernemer koopt twee derde van het meetbudget niets en is de score systematisch te laag. Zie §6b. **Search Console en de eerste publicatie staan bewust NIET op het kritieke pad**:
je hebt geen Google-sleutel en publiceren kan nog niet, en daar hoeft de lancering niet op te wachten.
Beide onderdelen zijn gebouwd en getest voor zover dat zonder kan; ze gaan aan zodra het kan.

---

## 3. Spoor A: de generale repetitie

**Eén vers merk, van nul, precies zoals bij een echte klant.** Geen bestaande data, geen shortcuts.
Ik doe elke stap en leg per stap vast wat er gebeurde, hoe lang het duurde en wat het kostte.

**Het proefkonijn: `gasservice-brabant.nl`.** Een CV- en warmtepompinstallateur uit Den Bosch. Ik heb
hem gekozen en nagekeken, en dit zijn de redenen:

- **Zelfde soort bedrijf en zelfde regio als Van den Udenhout**, andere branche. Wat de pijplijn hier
  moeilijk vindt, vindt hij daar ook moeilijk, zonder dat er iets van het echte dossier besmet raakt.
- **De site is er een van de goede maat.** WordPress met Yoast, 214 links op de homepage, dus tientallen
  pagina's. Groot genoeg om de crawler serieus te belasten, klein genoeg om binnen het budget te blijven.
- **`robots.txt` staat alles toe**, dus de technische audit levert een schone uitslag en niet een
  scherm vol blokkades dat de rest van de test overstemt.
- **Het is niet HEMA, Bol of Coolblue.** Die staan al als proef in de database, en een merk dat elke
  AI-assistent uit zijn hoofd kent, meet niets: de score zegt dan meer over de bekendheid dan over
  het product.

⚠️ Dit bedrijf weet hier niets van, en dat hoeft ook niet: ORBIT ENGINE leest alleen wat publiek op hun site
staat, precies zoals elke zoekmachine. Er wordt niets naar hen verstuurd en niets over hen
gepubliceerd. Zodra het merk zijn werk gedaan heeft, archiveer ik het.

| # | Stap | Verwachte uitkomst | Wat het bewijst |
|---|---|---|---|
| A1 | Merk aanmaken via `/profielen/nieuw` | Profiel op `bezig`, account gekoppeld, acht taken in de rij | De fout van vandaag (geen `account_id`) is écht weg |
| A2 | De onboarding uitzitten | ~7,5 minuut, acht taken klaar, profiel op `klaar`, ~$0,25 | De pijplijn draait nog na alle wijzigingen |
| A3 | Het merkdossier lezen als consultant | Opbrengstblok, inzichten, kansen, vragen, alles gevuld of met uitleg waarom niet | De vier nieuwe blokken van fase 5 en 6 werken op verse data |
| A4 | Merkprofiel nalopen in de wizard | 27 velden, voortgang klopt, alles wat je wijzigt komt terug | Fase 3, en het `proof_points`-vangnet |
| A5 | Eén onderwerp starten en meten | Analyse `concept_klaar`, vragen bevestigen, meting draait, ~$0,82 | De duurste keten, ongewijzigd sinds augustus |
| A6 | Pakket zetten en plan opstellen | 12 maanden, 132 pagina's, maand 1 ter goedkeuring | Fase 4 op verse data |
| A7 | Maand 1 goedkeuren, cron aftrappen | Pagina's van gemeten onderwerpen gaan schrijven, de rest zegt waarom niet | De brug plan-naar-pijplijn |
| A8 | Uitnodiging maken, link openen in een privévenster, wachtwoord zetten | Klant komt binnen en ziet zijn merk | Het pad van fase 2, nu met een echte browser |
| A9 | Als klant: feitvraag beantwoorden, en kijken wat er NIET staat | De feitvraag lukt. De knoppen die geld kosten staan er niet, met een zin die zegt waarom | Besluit 18 en de reparatie van de rechtencontrole, in het echt |
| A10 | Als klant: uitloggen, inloggen, wachtwoord wijzigen | Werkt, en de oude sessie blijft geldig | Fase 7 |

⚠️ **A9 is op 11 augustus 2026 herschreven.** Er stond "als klant: maand goedkeuren, pagina
goedkeuren". Dat kan sinds besluit 18 niet meer, en dat is precies wat deze stap nu moet aantonen:
niet dat de klant het kan, maar dat hij een uitleg ziet in plaats van een knop die een foutmelding
geeft. Een knop tonen die 403 oplevert is erger dan geen knop.

**Wat ik per stap vastleg:** duur, kosten, elke melding die ik zag, elk moment waarop ik moest nadenken
over wat er van me verwacht werd. Dat laatste is de belangrijkste kolom, en hij is alleen bij de
eerste doorloop eerlijk in te vullen.

### De uitslag van A1 tot en met A5, gedraaid op 12 augustus 2026

| Stap | Uitkomst | Oordeel |
|---|---|---|
| A1 Merk aanmaken | Profiel op `bezig`, account gekoppeld, acht taken in de rij | Goed, maar niet via de knop gedaan, zie hieronder |
| A2 Onboarding | **8,0 minuten, $0,235**, acht van de acht klaar, nul mislukkingen, nul herkansingen, 148 pagina's | Goed, en precies op de verwachte $0,25 en 7,5 minuut |
| A3 Merkdossier | 7 onderwerpen, 17 onderdelen aanbod, 10 concurrenten, 17 technische controlepunten, nul blokkades | Goed |
| A4 Werkgebied | `lokaal` met zeven Brabantse plaatsen, door het onderzoek zélf ingevuld | Goed, en het ontkracht de R6-zorg |
| A5 Meten | 30 vragen, **30 van 30 regionaal**, 30 metingen, nul mislukkingen, 2,2 minuten, score **30** met 9 vermeldingen | Goed, ná één reparatie |

**Totale kosten van de repetitie: $0,77**, waarvan $0,61 aan `web_search`. Onder de geschatte $1,10.

⚠️ **A1 is niet via de knop gedaan.** Mijn omgeving kan niet inloggen op de app, dus het merk is
aangemaakt met precies de rijen die de route zelf schrijft. Wat daarmee níet getoetst is: de route
zelf, en dus ook de nieuwe 403 (besluit 18) en 402 (budgetplafond) in het echt. Dat blijft staan voor
jou, en het is één klik.

#### De vondst van A5, en waarom hij de repetitie zijn geld waard maakte

De regionale regel haalde meteen 30 van de 30. Maar **vier van die dertig vragen waren geforceerd**,
allemaal in de oriëntatiefase. Het scherpste voorbeeld:

> "Heeft regelmatig onderhoud invloed op de levensduur van een cv-ketel in Den Bosch?"

De levensduur van een ketel heeft niets met Den Bosch te maken en niemand stelt die vraag zo. Een
AI-assistent antwoordt er algemeen op, noemt geen enkel bedrijf, en de vraag meet dus niets terwijl
hij de score wél omlaag drukt.

Het probleem was niet de drempel maar wát het model met de plaats deed: hij werd achter een
informatieve vraag geplakt in plaats van dat de vraag omgebouwd werd naar het zoeken van een
aanbieder. Na de reparatie van de instructie, dezelfde funnelfase:

> "Waar moet ik op letten bij het kiezen van een bedrijf voor cv-ketelonderhoud in Den Bosch?"

Alle tien de oriëntatievragen gaan nu over het vinden of kiezen van een installateur. Opnieuw
genereren kostte $0,0225, dus de correctie was praktisch gratis vergeleken met de $0,53 aan meten die
erop volgde. **Dit is precies waarvoor spoor A bestaat: het kwam niet uit een test, het kwam uit
kijken naar wat er werkelijk uitrolde.**

⚠️ De reparatie is een promptinstructie en géén garantie, en dat staat ook zo in de code. Het vangnet
kan tellen óf er een plaats in staat, niet óf de vraag natuurlijk klinkt. Dat laatste is niet
deterministisch te meten, en dan hoort dat opgeschreven te worden in plaats van gesuggereerd.

#### Wat er goed bleek zonder dat het gerepareerd hoefde

- **De concurrentenlijst bevat alleen echte installateurs.** Rijksoverheid (16 keer genoemd), de
  Consumentenbond en ketelmerken als Remeha en Vaillant komen er terecht niet in. Ze landen in
  `zijdelings genoemd`, precies waar ze horen. Ik verwachtte hier een fout en vond er geen.
- **De toelichting per concurrent is bruikbaar**, niet alleen waar: "Lixus wordt genoemd vanwege
  ervaring met alle merken en vanwege onderhoud, reparatie en rookgasmeting in Eindhoven."
- **Het rapport zegt eerlijk hoe zeker het is.** "Ongeveer 30 op 100, marge ongeveer ±17 punten, zie
  dit als een orde van grootte, niet als een exact cijfer." Dat is de K-lat gehaald zonder dat er iets
  voor aangepast hoefde te worden.
- **Gasservice Brabant staat bij de eerste aanbevelingen**, met een gemiddelde positie van 2,9. Van de
  echte concurrenten staat alleen Kemkens hoger.

### Wie doet welke stap, en wanneer dit kan

**A1 tot en met A7 kan ik alleen doen, zonder jou.** Ze lopen allemaal via de app en de pijplijn.
Kosten samen ~$1,10, doorlooptijd ongeveer een half uur, waarvan de onboarding ~7,5 minuut wachten is
en de meetronde het meeste van de rest.

**A8 tot en met A10 kan ik niet doen en jij wel.** Ze vragen een echte browser: een uitnodigingslink
openen in een privévenster, een wachtwoord zetten, in- en uitloggen. De browser in mijn omgeving komt
niet door de uitgaande proxy heen (drie configuraties geprobeerd, alle drie een verbroken verbinding),
dus ik kan wel HTML en statuscodes lezen maar geen scherm bedienen. Dat kost jou ongeveer een kwartier.

**Er is geen technische reden om te wachten.** Alles wat spoor A nodig heeft, staat sinds 11 augustus
2026 op productie: de regionale regel, de kostenrem, het budgetplafond en de blokkerende
werkgebiedregel. Het enige dat nodig is, is akkoord om ~$1,10 uit te geven.

⚠️ **A2 en A5 kosten samen ongeveer $1,10 per merk.** Dat is het hele budget van dit spoor waard: het
is de enige manier om te weten of de pijplijn na negen bouwrondes nog intact is.

---

## 4. Spoor B: de rolmatrix

Hier jaagt het plan op het patroon uit §1. Vier rollen, en elke rol moet op elk scherm precies het
juiste zien en mogen.

**Af, leeskant. Gevonden: een echt gat, niet een randgeval.** Bij het narekenen bleek dat
`analyses` en `profiles` een leesregel voor het hele account hebben (`readable_profile_ids()`,
migratie 0046), maar de 23 tabellen die aan een merk of analyse hangen (`prompts`, `reports`,
`visibility_scores`, `content_pieces`, `profile_topics`, en twintig andere) alleen een regel voor
de historische eigenaar en de beheerder. Zodra je een tweede persoon bij een klantaccount
uitnodigt, de collega, het bureau, komt hij binnen via `account_users` en niet via `user_id`. Het
dossier zelf toont hij nog wel (`analyses`/`profiles` kende hem al), maar elk hoofdstuk erbinnen
leest rechtstreeks met zijn sessie: nul vragen, geen score, een leeg rapport. Niet een foutmelding,
gewoon niets. **Elk tweede teamlid dat ooit wordt uitgenodigd, liep hier middenin.**

Gerepareerd in migratie `0056_leesregels_account.sql`: één extra leesregel per tabel naast de
bestaande (Postgres combineert met OR, dus niets bestaands verandert), gebouwd op dezelfde
`readable_profile_ids()`. Bewezen op productie zelf (met een echte tweede gebruiker, vóór en na de
migratie) én met een permanente ketentest die vier rollen (eigenaar, teamlid, beheerder, vreemde)
tegen echte RLS-regels in echte Postgres laat lezen. Diezelfde test dwong een langer openstaande
tekortkoming in de testopstelling zelf open: `auth.uid()` gaf in de ketentest altijd `null` terug,
dus geen enkele eerdere test kon ooit "de juiste persoon ziet het, de verkeerde niet" controleren.
Nu leest hij, net als op productie, `request.jwt.claim.sub`.

| Rol | Wie | Hoe hij binnenkomt |
|---|---|---|
| **Beheerder** | jij | `staff_users`, ziet alles |
| **Account-admin** | de klant zelf | uitnodiging met rol `admin` |
| **Account-member** | een collega of het bureau | uitnodiging met rol `member` |
| **Vreemde** | iemand van een ander account | eigen account, eigen merk |

**De matrix.** Twintig schermen maal vier rollen is tachtig vakjes, en de meeste zijn saai. Wat telt
zijn de vakjes waar het antwoord "nee" hoort te zijn, want dáár blijft een te ruime regel onopgemerkt:
alle andere tests kijken of iemand er wél in komt.

| Scherm of handeling | Beheerder | Admin | Member | Vreemde |
|---|---|---|---|---|
| `/beheer` (CSM-paneel) | ja | **nee, 404** | **nee, 404** | **nee, 404** |
| Merkdossier van eigen merk | ja | ja | ja | **nee** |
| Merk toewijzen aan een account | ja | **nee** | **nee** | **nee** |
| Contentplan lezen | ja | ja | ja | **nee** |
| Maand goedkeuren (kost ~$2,80) | ja | **nee** (besluit 18) | **nee** | **nee** |
| Bedrijfsgegevens wijzigen | ja | ja | **nee, leest mee** | **nee** |
| Iemand uitnodigen | ja | ja | **nee** | **nee** |
| Uitnodiging intrekken | ja | ja | **nee** | **nee** |
| Merk archiveren | ja | ja | **nee** | **nee** |
| Analyse starten (kost ~$0,82) | ja | **nee** (besluit 18) | **nee** | **nee** |
| Een merk aanmaken (kost ~$0,25) | ja | **nee** | **nee** | **nee** |
| Pagina goedkeuren (gratis) | ja | ja | ja | **nee** |
| Pagina als geplaatst markeren (gratis) | ja | ja | ja | **nee** |
| Feitvraag beantwoorden (gratis) | ja | ja | ja | **nee** |

**De scheidslijn is besluit 18 en hij loopt langs geld, niet langs rol.** Alles wat een betaalde
AI-aanroep in gang zet, doet de beheerder. Alles wat gratis is en over beoordelen gaat, doet de klant:
een pagina goedkeuren, een pagina als geplaatst markeren, een feitvraag beantwoorden, het merkprofiel
corrigeren.

Dat is precies de rolverdeling die `Nova.md` §1.2 uit hun berichtenbestand haalde: **de klant keurt
goed, hij maakt niet.** Zijn hele rol past bij Nova in drie werkwoorden, goedkeuren, afwijzen en
bevestigen dat het live staat, en er is nergens een sleutel waarmee hij zelf iets laat schrijven. Dat
ORBIT ENGINE daar vanochtend even van afweek en er nu weer op uitkomt, is geen omweg geweest: de rekensom die
het besluit terugdraaide, staat nu op papier.

⚠️ **Wat dit spoor daarom extra moet toetsen:** de klant mag geen knop zíen die hij niet mag
indrukken. Een knop die een 403 oplevert is erger dan geen knop. Op het planscherm is dat gebouwd (de
maandknop is voor de klant een zin die zegt dat hij zijn consultant akkoord geeft); de andere schermen
moeten nog na.

**Hoe ik dit test.** In de ketentest, met echte gebruikers in echte Postgres, want dan draait elke
regel écht en niet in mijn hoofd. Per vakje één assertie, en de "nee"-vakjes eerst.

---

## 5. Spoor C: de Nova-vergelijking, scherm voor scherm

Per scherm de vijf eigenschappen uit §0. Hieronder mijn **voorlopige** oordeel op basis van wat er nu
staat, zodat je ziet waar het werk zit. Het definitieve oordeel komt uit de doorloop.

### 5.1 De schermen die er goed voor staan

| Scherm | K1 leeg | K2 fout | K3 wie | K4 onomkeer | K5 bulk | Oordeel |
|---|---|---|---|---|---|---|
| Contentplan (`/profielen/[id]/plan`) | ja | ja | ja | ja | n.v.t. | **Nova-waardig** |
| Uitnodigingen (instellingen) | ja | ja | ja | ja | n.v.t. | **Nova-waardig** |
| CSM-paneel (`/beheer`) | ja, per segment | ja | ja, via segment | n.v.t. | n.v.t. | **Nova-waardig** |

Het contentplan is het beste scherm van de app en haalt de lat op alle punten: lege staat met de
twee voorwaarden erin, blokkade-uitleg per regel, wie-aan-zet in de chip, en `cannotBeUndone` als
eigen kader bij plaatsen en bij maandgoedkeuring.

### 5.2 De schermen waar werk zit

| Scherm | Wat ontbreekt | Welke eigenschap | Werk |
|---|---|---|---|
| **Merkdossier** | Het is lang. Nova's Overview heeft vier blokken; dit heeft er nu negen | K1, indirect | 0,5 dag: volgorde en inklappen |
| **Analyselijst** `/analyses` | Eén lege staat voor drie situaties (nooit gemeten, alles gearchiveerd, geen toegang) | K1 | 0,5 dag |
| **Bibliotheek** `/analyses/[id]/bibliotheek` | Geen bulkactie, dus ook geen eerlijk gedeeltelijk succes | K5 | 1 dag |
| **Paginadetail** | Nova heeft versiegeschiedenis, verschil-weergave, kopieerknoppen, FAQ-blok. ORBIT ENGINE heeft het meeste, maar niet de "komt eraan"-staat met datum | K1 | 0,5 dag |
| **Merken** `/profielen` | Geen segmenten. Nova groepeert overal | K1 | 0,5 dag |

### 5.3 Het gat dat het grootst is, en waarom het misschien mag blijven

**Nova's Overview bestaat bij ORBIT ENGINE niet.** Nova heeft na het inloggen één scherm met vier blokken:
prestatietrend, funnelvoortgang, strategiemix, prestatietabel. ORBIT ENGINE stuurt je naar de merkenlijst.

Drie van die vier blokken leunen volledig op Search Console, en die koppeling wacht op de sleutel. Het
vierde, funnelvoortgang, kan wél vandaag. **Mijn advies: bouw de Overview pas ná de eerste klant.**
Bij één klant met één merk is een overzichtsscherm boven een merkenlijst van één regel een scherm
zonder inhoud, en je leert pas van de eerste maanden wat erop hoort. Dit is de enige plek waar ik
bewust van Nova afwijk, en het is omkeerbaar.

### 5.4 De taal, apart getoetst

`docs/schrijfstijl.md` heeft tien richtlijnen en twee `grep`-commando's. Die draaien nu alleen vóór
een commit op nieuwe tekst. **Eén keer de hele app doorlezen op toon** hoort in dit plan: 22 schermen,
elke knop, elke melding, elke lege staat. Een halve dag, en het is het goedkoopste kwaliteitswerk dat
er is. Wat ik zoek: gedachtestreepjes, "en/of", passieve zinnen waar ORBIT ENGINE de handelende partij hoort
te zijn, en Engelse resten.

---

## 6. Spoor D: wat er gebeurt als het misgaat

De vrolijke weg is nu getest. Dit spoor gaat over de andere, en het is het spoor waar een echte klant
je product leert kennen.

| # | Scenario | Verwacht gedrag | Nu bekend? |
|---|---|---|---|
| D1 | OpenAI-krediet raakt op halverwege een meting | Taken falen na vier pogingen, analyse op `mislukt`, melding zegt wat er is | Deels: dit gebeurde op 5 augustus |
| D2 | De website van de klant is onbereikbaar tijdens de crawl | Duidelijke melding, doorgaan met `force` | Gebouwd, nooit getest |
| D3 | Een klant keurt een maand af | Plan blijft staan, ORBIT ENGINE stelt iets nieuws voor | Gebouwd, nooit getest |
| D4 | Twee mensen keuren dezelfde maand tegelijk goed | Eén wint, de ander krijgt geen fout | **Was al veilig, nu bewezen.** `approveMonth()` gebruikt een voorwaardelijke atomaire update; de database beslist de wedstrijd, niet de applicatiecode |
| D5 | De klant sluit de tab tijdens de onboarding | Alles loopt door, hij ziet het bij terugkomst | Ontworpen, nooit getest |
| D6 | Search Console: verkeerde property ingevuld | 404 van Google wordt een Nederlandse zin | Gebouwd, wacht op de sleutel |
| D7 | Een pagina wordt geschreven terwijl de klant hem verwijdert | De buffer schuift in, geen spookpagina | **Was stuk, nu gerepareerd.** `removePage()` besliste op een lezing van vóór de race of de buffer moest inschuiven. Gerepareerd: de voorwaardelijke update zelf bepaalt het, op het moment van schrijven |
| D8 | Uitnodigingslink wordt twee keer geopend | Tweede keer: "al gebruikt" | Getest in de keten |
| D9 | De worker valt om midden in een zware taak | Taak wordt na 5 minuten teruggevorderd | Gebouwd, één keer gezien |
| D10 | Een merk wordt gearchiveerd terwijl er taken lopen | Taken lopen door, niets is zichtbaar | **Af**, gerepareerd op 12 augustus toen dit spoor voor het eerst werd opgepakt: de werker controleert per taak, vlak vóór hij hem uitvoert, of het merk of de analyse gearchiveerd is |

**D4, D7 en D10 waren de interessantste, en D7 bleek ook echt stuk.** Wedstrijdcondities zijn
precies het soort fout dat pas bij een echte klant opduikt, op het slechtste moment, en ze zijn met
een gewone test niet te vinden: een tester doet nooit twee dingen op exact hetzelfde moment.

**D4 (twee goedkeuringen tegelijk) bleek al veilig.** `approveMonth()` gebruikt een voorwaardelijke
`UPDATE ... WHERE status <> 'goedgekeurd'`: Postgres serialiseert de twee gelijktijdige updates zelf,
en de tweede vindt de rij al gewijzigd en doet niets. Geen fout voor de tweede klikker, geen dubbele
facturatie. Nu bewezen met een ketentest die twee écht gelijktijdige aanroepen afdwingt
(`Promise.all`), niet aangenomen.

**D7 (verwijderen tijdens schrijven) was stuk.** `removePage()` las eerst de status van de pagina en
besliste dáárna, op die verouderde lezing, of de buffer moest inschuiven. Precies tussen die lezing en
die beslissing kan de content-taak de pagina op `ter_goedkeuring` gezet hebben: dan schuift de buffer
alsnog in voor een slot dat al gevuld was, en staat er een verweesde geschreven pagina naast een
buffer die er niet had hoeven komen. Gerepareerd door de voorwaardelijke update zelf te laten bepalen
of de buffer inschuift (hetzelfde patroon als `approveMonth`), en meteen een tweede, verwante race
gedicht: twee gelijktijdige verwijderingen die om dezelfde ene buffer streden, konden hem allebei
claimen. Beide vastgelegd in een ketentest die eerst bewijst dat de fout zonder de guard optreedt
("2 claims op één buffer"), en dan dat de guard hem voorkomt.

**D10 (archiveren tijdens lopende taken) was al gerepareerd** in dezelfde ronde als F5, eerder op 12
augustus: de werker controleert per taak, vlak vóór hij hem uitvoert, of het merk of de analyse
gearchiveerd is. Die controle zit op het laatst mogelijke moment vóór er geld wordt uitgegeven, dus de
volgorde waarin archiveren en inplannen gebeuren maakt niet uit.

---

## 6b. De scherpste inhoudelijke vondst: de meting meet de verkeerde vragen

Dit spoor stond niet in de eerste versie van dit plan. Het komt uit een observatie van de eigenaar op
11 augustus, en het onderzoek eronder maakt het het zwaarste punt van het hele document.

### De observatie

Van den Udenhout werkt alleen in Brabant. Dat ze in de elf andere provincies niet gevonden worden,
maakt hen niets uit. "Bij welke autodealer kan ik terecht voor mijn Volkswagen" is voor hen een
oninteressante vraag; "bij welke autodealer **in Brabant**" is de vraag waar hun omzet aan hangt.

### Wat de code doet, en waarom dat niet genoeg is

Er ís een regionale regel (`lib/pipeline/prompts.ts`). Hij vuurt als het merk op `service_scope =
lokaal` staat en er regio's bekend zijn, en luidt: *"verwerk in een deel van de prompts een van deze
plaatsen of regio's."* Bij Van den Udenhout stond de scope goed en waren er negen plaatsen bekend, dus
de regel deed wat hij moest doen.

**En toch bevat maar 38% van zijn zestig vragen een plaatsnaam.** "Een deel" is een intentie, en
conventie 1 van deze codebase zegt precies wat daar mis mee is: *een promptinstructie is een intentie,
code is een garantie.* Er staat geen enkel deterministisch vangnet achter. Wat er ontstond:

> "Waar moet ik op letten als ik aanbieders van private lease **in Nederland** met elkaar vergelijk?"

Dat is niet alleen niet-regionaal, dat is actief landelijk.

### Het bewijs dat dit geen smaakkwestie is

Fysi-Unique is het enige merk met genoeg meetgeschiedenis (drie ronden). Een fysiopraktijk in
Amersfoort, net zo lokaal als Van den Udenhout. De uitsplitsing van al zijn metingen:

| Soort vraag | Vragen | Metingen | Genoemd | Score |
|---|---|---|---|---|
| **Niet-regionaal** | 20 | 57 | **0** | **0** |
| **Regionaal** | 10 | 40 | 11 | **28** |

**Elke vermelding die dit merk ooit verdiende, kwam uit een regionale vraag.** Van 57 betaalde
metingen op landelijke vragen leverde er niet één iets op.

### Drie gevolgen, en ze zijn alle drie ernstig

1. **Twee derde van het meetbudget koopt niets.** 57 van de 97 metingen gingen over vragen die dit
   merk structureel niet kan winnen. Bij ~$0,026 per meting is dat ~$1,50 per ronde per analyse, en
   `web_search` is ~94% van de meetkosten. Dit is de grootste kostenpost van het hele product, en
   twee derde ervan is weggegooid.

2. **De score is systematisch te laag, en niet een beetje.** De klant zag 18, 36 en 38. Op de vragen
   die er voor hem toe doen was het 28 in dezelfde periode. Het getal waar het hele product op rust,
   wordt verdund door vragen die per definitie verloren zijn. Een lokale ondernemer kan bij dit
   ontwerp nooit hoog scoren, hoe goed hij het ook doet.

3. **De aanbevelingen wijzen de verkeerde kant op.** De gap-analyse leest de gemiste vragen en stelt
   pagina's voor. Bij 62% landelijke vragen komen daar landelijke onderwerpen uit, en dan schrijft
   ORBIT ENGINE content voor een markt waar de klant niet in zit. Dat is niet alleen nutteloos, het kost ook
   nog ~$0,28 per pagina.

### Wat ik voorstel, en waarom in deze volgorde

Dit is te groot voor een pleister en te belangrijk om na de lancering te doen. **Werk: ongeveer 2
dagen**, en het hoort in week 1.

| # | Wat | Waarom deze en niet iets anders | Stand |
|---|---|---|---|
| R1 | **Een deterministisch vangnet op het aandeel.** Na de generatie tellen hoeveel prompts een bekende plaats of regio bevatten. Onder de drempel: de ontbrekende bijgenereren, niet de hele ronde weggooien | Conventie 1. Dit is exact het patroon van `mention_role: m.mentioned ? m.role : null`: de instructie blijft, de code garandeert | **Af.** `lib/pipeline/geo-share.ts` plus de bijvullus in `prompts.ts` |
| R2 | **De drempel bij `scope = lokaal`: alle vragen regionaal** | Zie hieronder, dit is teruggedraaid van 70% naar 100% | **Af.** `REGIO_DREMPEL = 1.0` |
| R2b | **De poort geldt ook voor handgeschreven vragen.** `POST` en `PATCH` op `/api/analyses/[id]/prompts` weigeren een vraag zonder plaats bij een lokaal merk | De generator betaalt drie bijvulrondes voor de garantie; één tekstveld haalde hem onderuit | **Af.** `regionGateMessage()` |
| R3 | **Bestaande merken opnieuw beoordelen** | Uitzetten is gratis en meet daarna iets echts | **Af.** 55 vragen uitgezet, zie hieronder |
| R4 | **Het scherm laat het onderscheid zien.** Een chip "regionaal" bij de vraag, en in het rapport de score apart voor regionale vragen | Zonder dit blijft het een verborgen aanname. De klant hoort te zien waarop hij beoordeeld wordt | Open, ~halve dag |
| R5 | **De trendlijn markeren waar de vragenset wijzigde** | Zie de waarschuwing hieronder | Open |
| R6 | **`service_scope` mag niet stil leeg blijven** | Zie "het gat boven het vangnet" | **Af.** Blokkerende regel in het afrondingsblok |

#### Waarom de drempel van 70% naar 100% ging

De eerste versie stond op 70%, met het argument dat een lokale ondernemer ook af en toe een
landelijke vraag wint en dat dát informatie is. Teruggedraaid op 11 augustus 2026, op instructie van
de eigenaar, en de reden is beter dan het argument was: **een score is een aandeel.** Meng je er
vragen doorheen die dit bedrijf per definitie niet kan winnen, dan is de uitkomst niet "iets te laag"
maar onwaar. Dat Van den Udenhout in Drenthe niet genoemd wordt, hoort niet in zijn cijfer te zitten.

#### Wat R3 opleverde, met de cijfers

Uitgevoerd op productie, 11 augustus 2026. Alle 150 vragen blijven bewaard (`active = false`,
conventie 8); alleen wat er gemeten wordt verandert.

| Analyse | Actief vóór | Actief ná | Onzekerheidsband ná |
|---|---|---|---|
| APK | 30 | 25 | ±9,0 pp |
| Private Lease Skoda | 30 | 23 | ±9,4 pp |
| Schadeherstel | 30 | 25 | ±9,0 pp |
| Auto financieren | 30 | **9** | **±15,0 pp** |
| Auto leasen | 30 | **13** | ±12,5 pp |

Drie van de vijf stonden er al goed voor (23 tot 25 regionaal van de 30). De twee nieuwste juist
niet, en dat is de vondst achter de vondst: **hetzelfde merk, dezelfde prompt, twee heel andere
uitkomsten.** Het model haalde de ene keer 83% en de andere keer 30%. Precies waarom een instructie
geen garantie is.

⚠️ **Twee gevolgen die aandacht nodig hebben.** De trendlijn van "Auto financieren" verspringt: de
noemer gaat van 30 naar 9 en periode 3 is niet meer met periode 2 te vergelijken (R5). En met negen
vragen is de band ±15 punten, bijna twee keer zo breed als bij dertig. Aanvullen tot dertig
regionale vragen kost verwaarloosbaar weinig aan generatie (~$0,001) maar wél ~$0,57 extra per
meetronde, want meten is per vraag. Dat is een uitgave, dus een besluit van de eigenaar en niet van
de code.

#### Het gat boven het vangnet (R6)

Het hele vangnet hangt aan `isLokaal()`, en die kijkt naar `service_scope === "lokaal"`. Op
productie staat dat veld bij **vier van de negen profielen op `null`**, waaronder Fysi-Unique: een
fysiopraktijk in Amersfoort, het merk waarvan de meetcijfers deze hele vondst dróegen. Voor dat merk
zou de garantie dus nog steeds niet gevuurd hebben.

`resolveScope()` in `field-merge.ts` doet het goed en zet 'onbekend' bewust op `null` (conventie 3),
maar daarmee is de vraag alleen verplaatst: een leeg bereik is voor de promptgeneratie niet te
onderscheiden van "landelijk", terwijl het "we weten het niet" betekent. Bij een MKB-klant is
"lokaal" de regel en niet de uitzondering, dus de verkeerde kant om stil op terug te vallen.

**Opgelost, en niet waar ik het eerst zocht.** Het eerste voorstel was een harde stop in de
pijplijn, vóór de promptgeneratie. Dat is bij nader inzien de verkeerde plek: het zou de bestaande
profielen met een leeg bereik laten vastlopen op iets dat in tien seconden te repareren is, en het
zou de consultant pas een melding geven op het moment dat hij er niets meer aan kan doen.

De juiste plek is het afrondingsblok (`profile-readiness.ts`), en wel omdat het product sales-led is:
de consultant zet het profiel klaar vóór het demogesprek, en dat is precies het moment waarop hij dit
ziet en kan zetten. "Werkgebied vastgesteld" is nu een **blokkerende** regel: zonder bereik is het
dossier niet af, staat het in de kop bij naam genoemd, en deelt de consultant het scherm niet.

`scopeSummary()` in `field-merge.ts` stelt de vraag, naast `resolveScope()` die hem beantwoordt.
'lokaal' zonder één regio telt als onbekend, want dat is exact wat `isLokaal()` ervan maakt. Zou dat
als "bekend" gelden, dan meldt het scherm groen terwijl de promptregel niet vuurt, en dat is de ergste
van de twee fouten.

⚠️ **De vier profielen op productie zijn bewust niet aangeraakt.** Hun bereik invullen zou een gok
zijn, en conventie 3 zegt dat onbekend beter is dan verkeerd. Ze staan nu in het afrondingsblok als
onvolledig, wat ze ook zijn.

### Wat dit betekent voor `gasservice-brabant.nl`

Dat is óók een lokaal bedrijf, in dezelfde provincie. Spoor A wordt daarmee meteen de proef op de
som: als R1 en R2 werken, hoort **elke** vraag een Brabantse plaats of de provincie te bevatten, en
dat is te tellen zonder één extra euro uit te geven. En de eerste controle van spoor A is niet de
prompts maar R6: staat `service_scope` op `lokaal` en staan de plaatsen erin?

---

## 7. Spoor E: kan dit een maand draaien zonder toezicht?

| # | Vraag | Hoe ik het toets |
|---|---|---|
| E1 | Wat kost één klant per maand echt? | Optellen uit `ai_calls`: onboarding, meting per onderwerp, 10 pagina's schrijven. Nu bekend: ~$0,28 per pagina, ~$0,82 per meetronde, ~$0,25 onboarding |
| E2 | Loopt de wachtrij vol bij twintig klanten? | Rekenen: 20 klanten maal 8 onderwerpen maal 30 vragen is 4.800 meettaken op de eerste van de maand. Bij één worker per minuut is dat te veel |
| E3 | Draaien alle drie de crons? | `cron.job_run_details` nalezen over zeven dagen |
| E4 | Lekt er iets? | Elke tabel: RLS aan, policies kloppen, `jobs` en `account_invites` nul policies |
| E5 | Wat als Supabase een uur plat ligt? | De app moet een nette melding geven, geen stacktrace |
| E6 | Kun je een klant volledig verwijderen? | AVG-vraag. Nu: nee, er is geen route voor |
| E7 | Staan de env-variabelen goed op productie? | `EMAILS_ENABLED`, `MEASURE_WEB_SEARCH`, de cron-secrets, de vault-geheimen |

⚠️ **E2 is de enige die nu al zorgelijk is, en de som staat hier vast zodat hij niet later opnieuw
bedacht wordt.** De meetronde plant op de eerste van de maand alle taken tegelijk in: 20 klanten maal
8 onderwerpen maal 30 vragen is **4.800 meettaken**. De worker draait elke minuut, claimt er vijf per
ronde en werkt lichte taken parallel af binnen een budget van 240 seconden. Een meting duurt ~18
seconden, dus vijf tegelijk is ruwweg vijf taken per minuut: **4.800 taken is dan ongeveer 16 uur**.

Dat past nog binnen een etmaal, en het is dus geen storing maar een grens die in zicht komt. Bij één
klant zijn het 240 taken en 50 minuten. De klip ligt rond de dertig klanten, en de oplossing is
bekend en niet moeilijk (`CLAIM_BATCH` omhoog, of de ronde over drie dagen spreiden). **Nu uitrekenen
en opschrijven, oplossen bij klant tien.** Dit hoort in `docs/architecture.md` §9 zodat het geen
verrassing is.

**E6 is een lanceervoorwaarde en geen luxe.** Zodra er een echte klant is met echte bedrijfsgegevens,
moet je hem kunnen verwijderen als hij daarom vraagt. Er is nu een archief (migratie 0044) en dat is
iets anders. Werk: een halve dag, en het hoort vóór de lancering.

---

## 7b. Spoor F: de ingenieursschuld inlossen

Dit spoor bouwt, de andere vijf toetsen. Het staat er omdat vier van de zeven punten uit §0b nu op
"nee" staan, en drie daarvan zijn met een dag werk op "ja" te krijgen.

| # | Wat | Waarom nu | Werk |
|---|---|---|---|
| F1 | ~~**Maandplafond per account plus een dagplafond over alles**~~ | P3 | **Af.** Zie hieronder |
| F2 | **Kosten bij de knop** die geld kost | P3, en het is beter dan Nova | 2 uur |
| F3 | ~~**Eén toegangsfunctie** in plaats van een tweeling~~ | P2 | **Af.** `lib/access.ts`, zie hieronder |
| F4 | ~~**Een klant volledig verwijderen**~~ | P5, AVG-plicht | **Af.** Zie hieronder |
| F5 | ~~**De stille-fout-ronde**: elke `catch` en elke `?? null` in `lib/` nalopen~~ | P1 | **Af.** Zie hieronder |

#### F1 is af, en hier staat wat hij doet

Gebouwd op 11 augustus 2026: `lib/spend-rules.ts` (puur, de bedragen en de meldingen),
`lib/spend-limit.ts` (het opzoekwerk) en migratie `0053`.

**Twee plafonds, want ze vangen verschillende rampen.** Het maandplafond per account (€50 standaard,
per account te overschrijven) vangt de klant die structureel te veel kost. Het dagplafond over alle
accounts samen (€150) vangt het ongeluk: een lus die doordraait, een cron die twintig keer vuurt.
Eén plafond zou altijd één van die twee missen. Beide instelbaar via `MONTHLY_BUDGET_EUR` en
`DAILY_BUDGET_EUR`.

**De bedragen staan waar ze op gekozen zijn.** Een klant met vier onderwerpen kost ~$3,30 per maand
aan metingen plus ~$2,80 aan tien pagina's, ruwweg €6. Het plafond van €50 laat daarmee een factor
acht ruimte: het raakt een normale klant nooit en stopt een ontspoorde wel. Twintig klanten die op
één dag hun maand goedgekeurd krijgen is ~€52 en past ruim onder het dagplafond.

**Het blokkeert hard**, met status 402 en een melding die drie dingen noemt: wat er staat, wat het
plafond is, en waar je het verhoogt. Dat derde is geen beleefdheid maar de reden dat het een rem is
en geen storing.

⚠️ **Drie dingen die bewust anders zijn dan je zou verwachten.**

- **De rem faalt naar "doorlaten", niet naar "blokkeren".** Dat is de andere kant op dan
  `mayTriggerCost`, en met reden: bij de vraag "wie" is het ergste geval dat iemand even niets kan,
  bij de vraag "hoeveel" zou zacht falen betekenen dat één trage query de hele pijplijn stilzet voor
  alle klanten, inclusief werk dat allang betaald is. Het wordt wel gelogd, want een rem die stil
  niet werkt is erger dan geen rem. **Dat gedrag is meteen getest ook**: de ketentest liet de shim
  crashen op een ontbrekende `.gte`, en de rem liet het werk keurig door met een luide melding.
- **Het is geen exacte boekhouding.** De grens wordt gecontroleerd vóór een taak begint, niet
  tijdens. Een meetronde die al loopt wordt niet halverwege afgekapt, dus een enkele ronde kan het
  plafond met ~$1 overschrijden. Halverwege stoppen laat een analyse in een halve toestand achter, en
  dat is een groter probleem dan een dollar.
- **Afwijzen valt er niet onder.** Een maand goedkeuren zet ~$2,80 in gang en gaat door de rem; die
  maand afwijzen kost niets en gaat eromheen. Een account met een vol plafond moet zijn maand nog wél
  kunnen afwijzen.

**Waar het geld op geboekt wordt.** `ai_calls` kende alleen `analysis_id` en `profile_id`, en optellen
per account zou bij elke dure handeling een drieweg-join kosten. Migratie 0053 geeft de tabel een
`account_id`, gevuld door een trigger in de database en niet door `ledger.ts`: dat logboek is
best-effort en mag geen extra netwerkronde doen, want een mislukte logregel mag nooit een meting laten
falen. Alle 1.140 bestaande rijen zijn bijgewerkt, nul bleven er onverdeeld.

**Waar dit niet in zit.** De worker. Een taak die al in de wachtrij staat, draait door: de rem zit op
de elf routes die werk in gang zetten, niet op de uitvoering. Dat is bewust (zie "geen exacte
boekhouding"), maar het betekent dat een wachtrij die vollopen is vóór het plafond bereikt wordt,
alsnog leegloopt.

#### F3 is af: het oordeel staat nog op één plek

`lib/access.ts` beantwoordt sinds 11 augustus 2026 als enige de vraag "mag deze gebruiker hierbij".
De drie lagen (zit je in het account, ben je de historische eigenaar, ben je beheerder van ORBIT ENGINE)
staan daar één keer. `getOwnedProfile` en `getOwnedAnalysis` zoeken alleen nog de rij op en vragen
het oordeel.

**Wat er bewust NIET samengevoegd is:** het ophalen zelf. Een merk draagt zijn account direct, een
analyse niet: die hangt aan een merk en het merk hangt aan een account. Dat verschil is echt en moet
blijven, want een merk kan bij een toewijzing van account wisselen en dan verhuizen zijn analyses
vanzelf mee. Het samenvoegen van dát verschil zou een fout zijn geweest, geen opruiming.

Een broncodecontrole in `scripts/test-unit.ts` houdt het zo: staat er ooit weer een eigen
`isStaff(` of `isMember(` in een van de twee functies, dan is er een tweede oordeel bijgekomen en
valt de test om. Dat is de fout die migratie 0046 maakte, en die kostte de eerste uitgenodigde klant
elke schrijfactie die het product voor hem bedoelde.

#### F4 is af: verwijderen bestaat nu echt, en het is met opzet omslachtig

Conventie 8 is "alles bewaren" en besluit 14 zegt dat opzeggen een datum zet en niets verwijdert.
Die regels blijven staan: archiveren is het normale pad. Maar de AVG kent een recht op verwijdering
en dat koop je niet af met een archief, dus er is nu een tweede pad, en dat is bewust de uitzondering.

**Drie sloten voordat er iets weggaat.** Alleen een beheerder van ORBIT ENGINE (een account-admin mag zijn
bedrijfsgegevens wél wijzigen, maar een wijziging draai je terug en dit niet). Niet je eigen account,
want dat verwijdert je eigen inlog en dat herstel je niet met een backup omdat de sessie dan al weg
is. En de naam moet worden overgetypt, serverkant gecontroleerd: een bevestiging die je met een
rechtstreekse aanroep kunt overslaan, is geen bevestiging.

**Je ziet eerst wat er verdwijnt, met aantallen.** "Dit verwijdert 3 merken, 5 analyses en 412
metingen" is een ander besluit dan "dit verwijdert een account". Het opvragen van dat overzicht
verandert niets, en de ketentest bewijst dat ook apart.

**Wat de database doet, en waarom dat goed uitkwam.** Bijna alles hangt met `on delete cascade` aan
`profiles`, dus één merk verwijderen neemt zijn analyses, vragen, metingen, content, plannen en taken
mee. Eén verband is bewust géén cascade: `profiles.account_id` staat op `no action`, waardoor de
database weigert een account weg te gooien zolang er merken aan hangen. Dat maakt "per ongeluk een
account verwijderen" onmogelijk in plaats van stil.

**De inlogaccounts gaan mee, maar alleen van wie nergens anders bij hoort.** Dat is de kern van de
plicht: het dossier weghalen en de inlog laten staan is geen verwijdering. Wie ook lid is van een
ander account houdt zijn inlog, anders sluit het opruimen van klant A per ongeluk klant B buiten. Een
beheerder van ORBIT ENGINE raakt zijn inlog nooit kwijt.

⚠️ **Correctie van 12 augustus, ná de veiligheidscontrole.** F4 heette af terwijl hij dat niet was.
Migratie `0025` maakte bij een dataopschoning van elke aangeraakte rij een kopie in
`_backup_20260729`: 51 momentopnamen van vragen, entiteiten, geschreven pagina's, rapporten en
scores. Die tabel heeft géén verwijzing naar `profiles`, dus de cascade raakt hem niet. De klant was
uit elk scherm verdwenen en zijn teksten stonden er nog, in een tabel die niemand meer bekijkt.
Precies het restant waar de AVG over gaat. Nu opgeruimd vóór de merken (daarna zijn de id's weg om op
te matchen), en de ketentest zet er een momentopname neer en controleert dat hij verdwijnt.

**Wat dit zegt over de rest van dit document:** "af" betekent hier "gebouwd en getest", niet "elke
tabel in de database is nagelopen". De veiligheidscontrole van Supabase vond dit binnen een minuut,
en die had ik eerder moeten draaien.

⚠️ **Twee dingen die eerlijk benoemd moeten worden.** Er is geen transactie omheen, want de
Supabase-client praat over HTTP en kent er geen. Faalt het halverwege, dan zijn de merken weg en het
account nog niet; dat is herstelbaar (het account is dan leeg en opnieuw te verwijderen) en het
omgekeerde zou erger zijn. En het kostenlogboek van die klant gaat mee, waardoor het dagplafond die
dag iets ruimer staat. Verwaarloosbaar in bedrag, en het alternatief maakt een onomkeerbare handeling
ingewikkelder. Ingewikkeld en onomkeerbaar is een slechte combinatie.

#### F5 is af, en de vondst was groter dan verwacht

**De aanpak: sorteren op gevolg, niet op aantal.** In `lib/` staan 118 queries zonder foutcontrole en
97 schrijfacties zonder foutcontrole. Die allemaal mechanisch omhullen levert meer ruis dan waarde:
de meeste lezen één rij waar `null` een echte toestand is die het scherm ook netjes toont. De vraag
was dus niet "waar ontbreekt een controle" maar "waar leidt een storing tot geld, een verkeerd getal,
of stil verlies".

**Vondst 1: elke idempotentiecontrole faalde de verkeerde kant op.** Conventie 9 zegt dat elke stap
controleert of zijn werk al gedaan is vóór een dure aanroep. Overal stond dat zo:

```ts
const { count } = await admin.from("profile_offerings").select(...);
if ((count ?? 0) > 0) return;   // al gedaan, niets doen
```

Gaat die telling stuk, dan is `count` niet een getal maar `null`, en `null ?? 0` is 0, dus "er staat
nog niets", dus de dure aanroep gaat alsnog. **De bescherming tegen dubbel betalen faalde precies op
het moment waarop een taak opnieuw geprobeerd wordt**, want dat is hetzelfde moment waarop de database
hapert. Het commentaar bij `offering.ts` zei letterlijk "een retry mag geen tweede keer betaald
worden", terwijl de code dat niet waarmaakte.

`lib/require-count.ts` maakt hier één functie van die gooit in plaats van gokt. Toegepast op zeven
plekken: de aanbodboom, de onderwerpen, de vragen, het rapport, de effectmeting, de technische
controle en de contenttaken.

**Vondst 2: de duurste stille fout zat in de werker.** Het afvinken van een gelukte taak stond er als
een kale `await` zonder foutcontrole. Mislukt die update, dan blijft de taak op `running`, pakt
`reclaim_stuck_jobs` hem later terug, en wordt het werk **opnieuw** gedaan. Bij een meting is dat
dertig betaalde web-zoekacties voor een uitkomst die er al was. Nu drie pogingen, en daarna een harde
logregel die uitlegt waarom er dubbel betaald gaat worden.

**Vondst 3: een storing die zich voordeed als een afwezigheid.** De Google-sleutel gaf `null` terug in
drie verschillende gevallen: de variabele is leeg, de JSON is kapot, of er ontbreken velden. De
aanroeper maakte daar één melding van: "de sleutel is nog niet ingesteld, zet hem in de
omgevingsvariabelen". Bij een kapotte sleutel stuurt die zin je dus iets instellen dat er al staat.
Dat is geen onhandige tekst maar een verkeerde diagnose, en die kost meer tijd dan geen diagnose.
`lib/search-console/key-state.ts` kent nu drie toestanden met drie meldingen.

**Vondst 4: een stille nul die werk liet verdwijnen.** Het aantal beantwoorde feitvragen zit in de
dedupe-sleutel van een contenttaak. Faalt die telling en wordt hij 0, dan is de sleutel gelijk aan die
van een eerdere poging waarin er écht nul antwoorden waren. De taak wordt dan als dubbel gezien en
niet ingepland: **de klant heeft net drie vragen beantwoord, verwacht een herschreven pagina, en er
gebeurt niets.** Geen foutmelding, geen taak, niets om terug te vinden.

**Eén plek blijft bewust zacht, en dat staat in de code.** `determineStage()` kiest alleen wélk
voortgangsscherm getoond wordt, en dat scherm haalt daarna zelf de stand op. Faalt de telling, dan zie
je een tel lang het verkeerde scherm en corrigeert het zichzelf. Hard falen zou dat inruilen voor een
pagina die het helemaal niet doet. Die afweging hoort opgeschreven te worden, anders "repareert"
iemand hem later alsnog.

⚠️ **Wat deze ronde niet gedaan heeft.** De ruim negentig statuswijzigingen zonder foutcontrole zijn
bekeken maar niet allemaal omhuld. De ergste gevolgen daarvan (een klant die naar een eeuwig draaiend
voortgangsscherm kijkt) zijn echt maar zelfherstellend zodra de volgende taak draait, en het
alternatief is een helper langs negentig plekken. Dat is een opruimronde en geen lanceervoorwaarde.

**F1 tot en met F4 zijn lanceervoorwaarden.** F5 is dat niet, en hij levert waarschijnlijk het meeste
op per uur: het is de enige die zoekt naar fouten die nog niemand gezien heeft.

**Wat P4 betreft (waarneembaarheid) doe ik bewust niets.** Een meldingssysteem bouwen voor één klant
is gereedschap voor een probleem dat je nog niet hebt. Het alternatief kost niets: zet één keer per
week `/beheer` open en kijk of de teller "pijplijnfouten" op nul staat. Dat scherm is er precies voor.
Zodra er vijf klanten zijn, hoort P4 alsnog gebouwd te worden.

---

## 8. De twee weken

| Week | Dagen | Wat | Wie |
|---|---|---|---|
| 1 | ma | **Spoor R**: het regionale vangnet (§6b). Vóór spoor A, want anders meet de repetitie de verkeerde vragen | ik |
| 1 | di | ~~**Spoor R** afmaken plus **F1**: het budgetplafond~~ **Allebei af op 11 augustus.** R4 en R5 staan nog open | ik |
| 1 | wo-do | **Spoor A**: de generale repetitie op `gasservice-brabant.nl` | ik, jij leest de uitkomst |
| 1 | vr | **Spoor B**: de rolmatrix, met de "nee"-vakjes eerst | ik |
| 2 | ma | **Spoor D**: de foutpaden, met D4, D7 en D10 voorop | ik |
| 2 | di | **Spoor D** afmaken plus **F3** (één toegangsfunctie) | ik |
| 2 | wo | **Spoor C**: de lat per scherm, plus de taalronde | ik, jij levert de afdrukken |
| 2 | do | **Spoor E** en **F4**, plus alles repareren wat A tot D opleverde | ik |
| 2 | vr | **Lanceerbesluit** aan de hand van §9 | jij |

**Spoor R staat vóór spoor A, met opzet.** De generale repetitie draait op een lokaal Brabants
bedrijf. Zonder het regionale vangnet meet die repetitie precies de vragen waarvan we nu weten dat ze
niets opleveren, en dan betaal ik $0,82 om te bewijzen wat ik al weet. F1 staat er direct achter om
dezelfde reden: de rem hoort er eerder te zijn dan de test die hem nodig heeft.

**Wat jij deze twee weken moet doen:**

| Wat | Uiterlijk | Waarom |
|---|---|---|
| Tien schermafdrukken van **ORBIT ENGINE** na het inloggen | week 2, ma | Ik kan geen pixel zien; dit is het enige gat dat jij moet vullen |
| Beslissen over de Overview (§5.3) | week 2, ma | Mijn advies: pas ná de eerste klant |
| Het maandbudget per account bepalen | week 1, wo | Ik bouw de rem, jij bepaalt het getal |

**Wat er NIET op deze lijst staat, en waarom dat goed is:** de Google-sleutel en de eerste publicatie.
Je hebt ze allebei niet, en de lancering hangt er niet op. Search Console is een bewijsstuk náást de
AI-meting en geen voorwaarde ervoor; de impactlus heeft pas betekenis als er een pagina live staat en
dat is bij een klant in maand één sowieso niet zo. Ze gaan aan zodra het kan, en tot die tijd zeggen
de schermen zelf netjes waarom ze leeg zijn.

---

## 9. De afvinklijst voor het lanceerbesluit

Geen enkel punt hieronder is onderhandelbaar op de dag zelf. Wie op vrijdag nog "dat lossen we
maandag op" zegt, lanceert niet.

**Werkt het**

- [ ] Spoor A volledig doorlopen op een vers merk, elke stap geslaagd
- [ ] De vier vaste controles groen: `npx tsc --noEmit`, `npm run test:unit`, `npm run test:chain`, `npm run build`
- [ ] Geen enkele onopgeloste mislukte taak op productie (`unresolvedFailures` op nul)
- [ ] Alle drie de crons hebben zeven dagen achter elkaar gedraaid

**Is het veilig**

- [ ] De rolmatrix uit §4 klopt, inclusief elk "nee"-vakje
- [ ] Elke tabel heeft RLS aan; `jobs` en `account_invites` hebben nul policies
- [x] Een klant kan volledig verwijderd worden (F4)
- [ ] Geen enkele sleutel in de code of in een commit

**Kan het niet op hol slaan** (§0b P3)

- [x] Alleen de beheerder start betaald werk, in elf routes, via één functie (besluit 18)
- [x] Een broncodetest valt zodra er een dure route bijkomt zonder die controle
- [ ] Er is een maandplafond per account, en het staat op een getal dat jij hebt gekozen
- [ ] Er is een dagplafond over alle accounts samen, als noodrem
- [x] Eén toegangsfunctie in plaats van twee die uit elkaar kunnen drijven (F3)

**Meet het de juiste vragen** (§6b, en dit is de zwaarste)

- [ ] Bij een lokaal merk bevat minstens 70% van de vragen een plaats of regio, en dat is een garantie in code en geen instructie aan het model
- [ ] Van den Udenhout is opnieuw beoordeeld: de landelijke vragen staan uit
- [ ] Het scherm laat zien welke vragen regionaal zijn
- [ ] De trendlijn is gemarkeerd op het moment dat de vragenset wijzigde

**Is het Nova-waardig**

- [ ] Elk scherm haalt K1 tot en met K5, of de afwijking staat in dit document met een reden
- [ ] De taalronde is gedaan op alle 22 schermen
- [ ] Geen gedachtestreepjes, geen "en/of", geen Engelse resten

**Kun je het uitleggen**

- [ ] De kosten per klant per maand staan op papier (E1)
- [ ] Je weet wat er gebeurt bij twintig klanten (E2), ook al is het nog niet opgelost
- [ ] `APP_FLOW_DOCUMENTATION.md` klopt weer met wat de app doet

**Klaar voor Van den Udenhout**

- [ ] Zijn merkdossier is compleet: alle acht onderwerpen gemeten
- [ ] Zijn contentplan staat, maand 1 goedgekeurd, de eerste pagina's geschreven
- [ ] De dubbele profielen zijn opgeruimd
- [ ] Het proefmerk `gasservice-brabant.nl` is gearchiveerd
- [ ] De uitnodigingslink is klaar om te versturen

---

## 9b. Wat ik zou tegenhouden op vrijdag, en wat niet

Om te voorkomen dat "productiewaardig" een gevoel blijft: dit is waar ik hard op ben en waar niet.

**Ik zou de lancering tegenhouden voor:**

- Een ontbrekende kostenrem (F1). Eén fout in een lus kost dan honderden euro's voordat iemand kijkt.
- Een klant die niet verwijderd kan worden (F4). Dat is een wettelijke plicht, geen functie.
- Eén "nee"-vakje in de rolmatrix dat "ja" blijkt. Dat is een datalek in wording.
- Spoor A dat niet volledig doorloopt. Als de keten op een vers merk struikelt, struikelt hij bij de
  klant ook.

**Ik zou de lancering NIET tegenhouden voor:**

- Search Console. Een bewijsstuk náást de meting, en de klant heeft in maand één nog geen kliks.
- De impactlus. Zonder gepubliceerde pagina heeft hij niets te tonen.
- Nova's Overview-scherm. Bij één klant met één merk is dat een scherm zonder inhoud.
- Een scherm dat één van de vijf eigenschappen mist op een plek die de klant zelden ziet. Noteren,
  na de lancering oplossen.
- Waarneembaarheid (P4). Bij één klant is `/beheer` één keer per week openen goed genoeg, en
  gereedschap bouwen voor een probleem dat je nog niet hebt, is de duurste vorm van uitstel.

---

## 10. Wat dit plan bewust niet doet

**Geen nieuwe functionaliteit.** Alles wat hierboven staat is testen, repareren en gelijktrekken. De
twee onderdelen die nog op iets wachten (het analysescherm met kliks, en impact terug in het plan)
blijven wachten. Ze zijn geen lanceervoorwaarde: een klant die in maand één binnenkomt heeft nog geen
gepubliceerde pagina en nog geen kliks, dus die schermen zouden leeg zijn.

**Geen prestatieoptimalisatie.** E2 wordt uitgerekend en opgeschreven, niet opgelost. Bij één klant is
er niets te optimaliseren, en optimaliseren zonder meten is de duurste manier om niets te doen.

**Geen marketingsite.** Vastgesteld op 10 augustus en het geldt nog steeds: dit plan gaat uitsluitend
over de applicatie achter de inlog.
