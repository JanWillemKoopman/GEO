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
onder tijdsdruk, en op sommige punten hoort Aura beter te zijn dan zijn voorbeeld. **De scherpste
vondst van dit document zit dan ook niet in de Nova-vergelijking maar in §0b: er zit geen enkele rem
op wat een klant kan uitgeven, en sinds vandaag mag hij zelf de dure knoppen indrukken.**

---

## 0. Wat "InSpace-kwaliteit" hier betekent, in vijf toetsbare eigenschappen

"Kwaliteit gelijktrekken met Nova" is een gevoel, en daar kun je niet op afvinken. Uit de
reconstructie in `Nova.md` §3 en §3.9 komen vijf eigenschappen die stuk voor stuk **waarneembaar** zijn
in hun berichtenbestand, en dus ook in Aura te controleren. Dit is de lat.

| # | Eigenschap | Het bewijs bij Nova | Hoe je hem toetst |
|---|---|---|---|
| **K1** | **Elke toestand heeft een eigen scherm.** Leeg is geen afwezigheid maar een boodschap | Vier verschillende lege staten voor één tabel: geen koppeling, geen geplaatste pagina's, nog aan het verzamelen, geen toegang | Zet het scherm in elke toestand die kan bestaan. Staat er iets, en klopt het? |
| **K2** | **Elke foutmelding is specifiek.** Geen "er ging iets mis" | Zestien eigen foutmeldingen in alleen het accountscherm; vier dialogen met elk een eigen mislukt-titel | Forceer elke fout. Zegt de melding wát er mis is en wie het kan oplossen? |
| **K3** | **De taal zegt wie aan zet is.** Naast de technische status | `runningStatus.waitingInYourCms`, "Waiting for you" | Staat er bij elke wachtende toestand wie er iets moet doen? |
| **K4** | **Onomkeerbaar wordt vooraf benoemd**, in een eigen blok | `cannotBeUndoneDescription` als apart kader, niet als zin in een alinea | Elke handeling die niet terug kan: staat de waarschuwing er, en apart? |
| **K5** | **Bulk is eerlijk over gedeeltelijk succes** | `partialApproval`: "Approved {ok} of {total} items, {failedCount} failed ({reason})" | Laat een bulkactie half mislukken. Wordt dat eerlijk gemeld? |

**Waarom juist deze vijf.** Ze zijn alle vijf te controleren zonder Nova te zien, ze gaan alle vijf
over het moment waarop software vertrouwen wint of verliest, en Aura faalt op minstens drie ervan op
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
- **Van Aura ook niet.** De browser in deze omgeving komt niet door de uitgaande proxy heen; drie
  configuraties geprobeerd, alle drie `ERR_CONNECTION_RESET`. `curl` werkt wél, dus ik kan HTML en
  statuscodes lezen, maar geen pixel zien. Ik beoordeel schermen dus uit de code en het gedrag, niet
  uit hun aanblik.

Dat maakt jouw ogen een onderdeel van dit plan en geen extraatje. Wat ik van je vraag in spoor C:
tien schermafdrukken van **Aura zelf**, na het inloggen, van de schermen in §5. Dat kost je vijf
minuten en het vult precies het gat dat ik niet kan vullen. Nova-afdrukken zijn mooi meegenomen als
je er nog bij kunt; noodzakelijk zijn ze niet, want de vijf eigenschappen hierboven zijn ook zonder
te toetsen.

---

## 0b. De tweede lat: productiewaardig, los van Nova

Nova-pariteit is één maatstaf en niet de enige. Nova is zelf software van mensen die keuzes maakten
onder tijdsdruk, en op sommige punten kan Aura beter zijn dan zijn voorbeeld. Deze zeven punten komen
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
| **P7** | **Geen wedstrijdcondities.** Twee mensen die tegelijk hetzelfde doen | **Onbekend.** Zie D4, D7 en D10 |

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

⚠️ Dit bedrijf weet hier niets van, en dat hoeft ook niet: Aura leest alleen wat publiek op hun site
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
| A9 | Als klant: maand goedkeuren, pagina goedkeuren, feitvraag beantwoorden | Alle drie lukken | De reparatie van `getOwnedAnalysis`, in het echt |
| A10 | Als klant: uitloggen, inloggen, wachtwoord wijzigen | Werkt, en de oude sessie blijft geldig | Fase 7 |

**Wat ik per stap vastleg:** duur, kosten, elke melding die ik zag, elk moment waarop ik moest nadenken
over wat er van me verwacht werd. Dat laatste is de belangrijkste kolom, en hij is alleen bij de
eerste doorloop eerlijk in te vullen.

⚠️ **A2 en A5 kosten samen ongeveer $1,10 per merk.** Dat is het hele budget van dit spoor waard: het
is de enige manier om te weten of de pijplijn na negen bouwrondes nog intact is.

---

## 4. Spoor B: de rolmatrix

Hier jaagt het plan op het patroon uit §1. Vier rollen, en elke rol moet op elk scherm precies het
juiste zien en mogen.

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
Aura daar vanochtend even van afweek en er nu weer op uitkomt, is geen omweg geweest: de rekensom die
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
| **Paginadetail** | Nova heeft versiegeschiedenis, verschil-weergave, kopieerknoppen, FAQ-blok. Aura heeft het meeste, maar niet de "komt eraan"-staat met datum | K1 | 0,5 dag |
| **Merken** `/profielen` | Geen segmenten. Nova groepeert overal | K1 | 0,5 dag |

### 5.3 Het gat dat het grootst is, en waarom het misschien mag blijven

**Nova's Overview bestaat bij Aura niet.** Nova heeft na het inloggen één scherm met vier blokken:
prestatietrend, funnelvoortgang, strategiemix, prestatietabel. Aura stuurt je naar de merkenlijst.

Drie van die vier blokken leunen volledig op Search Console, en die koppeling wacht op de sleutel. Het
vierde, funnelvoortgang, kan wél vandaag. **Mijn advies: bouw de Overview pas ná de eerste klant.**
Bij één klant met één merk is een overzichtsscherm boven een merkenlijst van één regel een scherm
zonder inhoud, en je leert pas van de eerste maanden wat erop hoort. Dit is de enige plek waar ik
bewust van Nova afwijk, en het is omkeerbaar.

### 5.4 De taal, apart getoetst

`docs/schrijfstijl.md` heeft tien richtlijnen en twee `grep`-commando's. Die draaien nu alleen vóór
een commit op nieuwe tekst. **Eén keer de hele app doorlezen op toon** hoort in dit plan: 22 schermen,
elke knop, elke melding, elke lege staat. Een halve dag, en het is het goedkoopste kwaliteitswerk dat
er is. Wat ik zoek: gedachtestreepjes, "en/of", passieve zinnen waar Aura de handelende partij hoort
te zijn, en Engelse resten.

---

## 6. Spoor D: wat er gebeurt als het misgaat

De vrolijke weg is nu getest. Dit spoor gaat over de andere, en het is het spoor waar een echte klant
je product leert kennen.

| # | Scenario | Verwacht gedrag | Nu bekend? |
|---|---|---|---|
| D1 | OpenAI-krediet raakt op halverwege een meting | Taken falen na vier pogingen, analyse op `mislukt`, melding zegt wat er is | Deels: dit gebeurde op 5 augustus |
| D2 | De website van de klant is onbereikbaar tijdens de crawl | Duidelijke melding, doorgaan met `force` | Gebouwd, nooit getest |
| D3 | Een klant keurt een maand af | Plan blijft staan, Aura stelt iets nieuws voor | Gebouwd, nooit getest |
| D4 | Twee mensen keuren dezelfde maand tegelijk goed | Eén wint, de ander krijgt geen fout | **Onbekend** |
| D5 | De klant sluit de tab tijdens de onboarding | Alles loopt door, hij ziet het bij terugkomst | Ontworpen, nooit getest |
| D6 | Search Console: verkeerde property ingevuld | 404 van Google wordt een Nederlandse zin | Gebouwd, wacht op de sleutel |
| D7 | Een pagina wordt geschreven terwijl de klant hem verwijdert | De buffer schuift in, geen spookpagina | **Onbekend** |
| D8 | Uitnodigingslink wordt twee keer geopend | Tweede keer: "al gebruikt" | Getest in de keten |
| D9 | De worker valt om midden in een zware taak | Taak wordt na 5 minuten teruggevorderd | Gebouwd, één keer gezien |
| D10 | Een merk wordt gearchiveerd terwijl er taken lopen | Taken lopen door, niets is zichtbaar | **Onbekend** |

**D4, D7 en D10 zijn de interessantste**, want dat zijn wedstrijdcondities: twee dingen die tegelijk
gebeuren. Die zijn nooit getest en ze zijn precies het soort fout dat pas bij een echte klant opduikt,
op het slechtste moment. Ze horen in de ketentest, want daar kan ik de volgorde afdwingen.

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
   Aura content voor een markt waar de klant niet in zit. Dat is niet alleen nutteloos, het kost ook
   nog ~$0,28 per pagina.

### Wat ik voorstel, en waarom in deze volgorde

Dit is te groot voor een pleister en te belangrijk om na de lancering te doen. **Werk: ongeveer 2
dagen**, en het hoort in week 1.

| # | Wat | Waarom deze en niet iets anders |
|---|---|---|
| R1 | **Een deterministisch vangnet op het aandeel.** Na de generatie tellen hoeveel prompts een bekende plaats of regio bevatten. Onder de drempel: de ontbrekende bijgenereren, niet de hele ronde weggooien | Conventie 1. Dit is exact het patroon van `mention_role: m.mentioned ? m.role : null`: de instructie blijft, de code garandeert |
| R2 | **De drempel is instelbaar per merk en heeft een eerlijke standaard.** Voorstel: bij `scope = lokaal` minstens 70% regionaal | 100% zou fout zijn: ook een lokale ondernemer wint soms een landelijke vraag, en die informatie is wat waard. 70% laat ruimte en verlegt het zwaartepunt |
| R3 | **Bestaande merken opnieuw beoordelen.** Van den Udenhout heeft 60 vragen waarvan 37 landelijk. Die uitzetten is gratis en verhoogt zijn score onmiddellijk naar wat hij werkelijk waard is | De volgende meetronde kost dan een derde minder en meet iets echts |
| R4 | **Het scherm laat het onderscheid zien.** Een chip "regionaal" bij de vraag, en in het rapport de score apart voor regionale vragen | Zonder dit blijft het een verborgen aanname. De klant hoort te zien waarop hij beoordeeld wordt |

⚠️ **R3 raakt de vergelijkbaarheid van de trendlijn.** Zet je vragen uit, dan verandert de noemer, en
dan is periode 3 niet meer met periode 2 te vergelijken. Dat is precies de fout die `logbook.md` in
juli al een keer maakte. De uitweg: de uitgezette vragen blijven staan met `active = false`, en de
trendlijn krijgt een markering op het moment van de wijziging. Bij Van den Udenhout is dat gratis,
want zijn score is nul en er valt niets te breken.

### Wat dit betekent voor `gasservice-brabant.nl`

Dat is óók een lokaal bedrijf, in dezelfde provincie. Spoor A wordt daarmee meteen de proef op de som:
als R1 werkt, hoort minstens 70% van zijn vragen een Brabantse plaats te bevatten, en dat is te tellen
zonder één extra euro uit te geven.

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
| F1 | **Maandplafond per account plus een dagplafond over alles** | P3. Een klant kan sinds vandaag zelf geld uitgeven en er is geen rem | 0,5 dag |
| F2 | **Kosten bij de knop** die geld kost | P3, en het is beter dan Nova | 2 uur |
| F3 | **Eén toegangsfunctie** in plaats van een tweeling | P2. De structuur die de fout van vandaag mogelijk maakte, staat er nog | 0,5 dag |
| F4 | **Een klant volledig verwijderen** | P5, en het is een AVG-plicht zodra er echte bedrijfsgegevens in staan | 0,5 dag |
| F5 | **De stille-fout-ronde**: elke `catch` en elke `?? null` in `lib/` nalopen | P1. Twee van de vijf fouten van vandaag waren precies dit | 0,5 dag |

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
| 1 | di | **Spoor R** afmaken plus **F1**: het budgetplafond | ik |
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
| Tien schermafdrukken van **Aura** na het inloggen | week 2, ma | Ik kan geen pixel zien; dit is het enige gat dat jij moet vullen |
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
- [ ] Een klant kan volledig verwijderd worden (F4)
- [ ] Geen enkele sleutel in de code of in een commit

**Kan het niet op hol slaan** (§0b P3)

- [x] Alleen de beheerder start betaald werk, in elf routes, via één functie (besluit 18)
- [x] Een broncodetest valt zodra er een dure route bijkomt zonder die controle
- [ ] Er is een maandplafond per account, en het staat op een getal dat jij hebt gekozen
- [ ] Er is een dagplafond over alle accounts samen, als noodrem
- [ ] Eén toegangsfunctie in plaats van twee die uit elkaar kunnen drijven (F3)

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
