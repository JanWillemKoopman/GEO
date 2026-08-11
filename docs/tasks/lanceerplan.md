# Lanceerplan: van "gebouwd" naar "Van den Udenhout is klant"

**Opgesteld:** 11 augustus 2026 · **Doel:** officiële lancering en de eerste echte klant over twee
weken · **Vertrekpunt:** `main` op `0a5e74e`, migraties t/m `0052`, 998 unittests, 82 ketentests

In negen bouwrondes is het Nova-plan (`docs/Nova.md`) afgebouwd: de merk-werkruimte, rollen en
uitnodigingen, de merkprofiel-wizard, het contentplan, het CSM-paneel, Search Console, de lus, en het
accountscherm. Wat er niet is gebeurd, is dat iemand het geheel één keer als klant heeft doorlopen.

Dit document is dat plan. Het beantwoordt drie vragen per onderdeel:

1. **Werkt het?** Doet de code wat hij belooft, tegen echte data.
2. **Is het stuk?** Heeft de nieuwe laag iets gebroken dat eerder werkte.
3. **Is dit InSpace-kwaliteit?** Ja of nee, en zo nee: wat er precies aan moet gebeuren.

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

Wat dat gat zou dichten: tien schermafdrukken van Nova in gebruik, met name Overview, Strategy en de
paginadetailpagina. Eén uur van jou, en het maakt spoor C hieronder twee keer zo scherp. Zonder is
spoor C nog steeds waardevol, alleen begrensd tot wat meetbaar is.

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

| Spoor | Vraag | Wie | Duur | Kosten |
|---|---|---|---|---|
| **A** | Werkt de keten van nul tot klant? | ik, jij kijkt mee | 1 dag | ~$3 |
| **B** | Ziet en mag elke rol precies het juiste? | ik | 1 dag | 0 |
| **C** | Haalt elk scherm de vijf eigenschappen van §0? | ik, jij beslist | 2 dagen | 0 |
| **D** | Wat gebeurt er als het misgaat? | ik | 1,5 dag | ~$1 |
| **E** | Kan dit een maand draaien zonder toezicht? | ik | 1 dag | 0 |

Samen 6,5 werkdag, met twee weken kalendertijd eromheen voor jouw beslissingen en de dingen die
alleen jij kunt (de Google-sleutel, de eerste publicatie).

---

## 3. Spoor A: de generale repetitie

**Eén vers merk, van nul, precies zoals bij een echte klant.** Geen bestaande data, geen shortcuts.
Ik doe elke stap en leg per stap vast wat er gebeurde, hoe lang het duurde en wat het kostte.

**Het proefkonijn.** Een echt Nederlands MKB-bedrijf dat lijkt op je doelgroep, niet op Van den
Udenhout zelf: die wil je vers houden voor het echte gesprek. Voorstel: een fysiotherapiepraktijk of
een installatiebedrijf met een gewone site van 30 tot 100 pagina's. Als jij een naam hebt die je
straks tóch wilt benaderen, is dat een dubbelslag.

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
| Maand goedkeuren | ja | ja | ja? **beslissen** | **nee** |
| Bedrijfsgegevens wijzigen | ja | ja | **nee, leest mee** | **nee** |
| Iemand uitnodigen | ja | ja | **nee** | **nee** |
| Uitnodiging intrekken | ja | ja | **nee** | **nee** |
| Merk archiveren | ja | ja? **beslissen** | **nee** | **nee** |
| Analyse starten (kost geld) | ja | ja? **beslissen** | **nee** | **nee** |

**Twee open vragen voor jou**, en ze zijn allebei een productbeslissing en geen bug:

1. **Mag een `member` een maand goedkeuren?** Bij Nova keurt het bureau goed (besluit 15), en een
   member ís vaak dat bureau. Maar goedkeuren zet geld in beweging. Mijn voorstel: **ja**, want de
   rol heet niet voor niets member en de klant kiest zelf wie hij uitnodigt.
2. **Mag een `admin` een analyse starten?** Dat kost ~$0,82 per keer. Mijn voorstel: **ja**, met de
   kosten zichtbaar bij de knop. Een klant die zijn eigen onderwerpen kan meten is het product; een
   klant die daarvoor moet bellen is een dienst.

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

## 8. De twee weken

| Week | Dagen | Wat | Wie |
|---|---|---|---|
| 1 | ma-di | **Spoor A**: de generale repetitie op een vers merk | ik, jij kijkt de uitkomst na |
| 1 | wo | **Spoor B**: de rolmatrix, plus de twee beslissingen uit §4 | ik, jij beslist |
| 1 | do-vr | **Spoor D**: de foutpaden, met D4, D7 en D10 voorop | ik |
| 2 | ma-di | **Spoor C**: de vijf eigenschappen per scherm, plus de taalronde | ik, jij beslist over §5.3 |
| 2 | wo | **Spoor E**: productiegereedheid, en E6 bouwen | ik |
| 2 | do | Alles wat uit A tot E kwam repareren | ik |
| 2 | vr | **Lanceerbesluit** aan de hand van §9 | jij |

**Wat jij deze twee weken moet doen, en wanneer het uiterlijk moet:**

| Wat | Uiterlijk | Waarom |
|---|---|---|
| De Google-sleutel aanmaken | week 1, wo | Anders haalt Search Console de lancering niet |
| Beslissen over de twee rolvragen (§4) | week 1, wo | Spoor B kan niet af zonder |
| Beslissen over de Overview (§5.3) | week 2, ma | Bepaalt of er nog een scherm bij komt |
| Eén pagina echt publiceren | week 2, ma | Deblokkeert de laatste helft van fase 6 |
| Tien schermafdrukken van Nova | week 1, wanneer het uitkomt | Maakt spoor C twee keer zo scherp |

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
- [ ] Een klant kan volledig verwijderd worden (E6)
- [ ] Geen enkele sleutel in de code of in een commit

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
- [ ] De uitnodigingslink is klaar om te versturen

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
