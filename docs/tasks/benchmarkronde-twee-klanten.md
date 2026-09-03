# Benchmarkronde: twee nieuwe klanten, vier clusters, twaalf pagina's

Opdracht van de eigenaar (3 september 2026): zet twee nieuwe klanten op in de live app, elk met twee
clusters en drie pagina's per cluster, samen twaalf pagina's. Niet rechtstreeks in de database maar
via de gewone weg, zoals het bij een echte klant ook gaat, met een consultant die zich als klant
gedraagt en de commerciële laag invult. De kwaliteitsbeoordeling zelf komt later.

Dit document is het klantdossier waarmee die ronde uitgevoerd wordt: welke bedrijven, wat er per veld
ingevuld wordt, welke clusters, en hoe de twaalf pagina's tot stand komen.

---

## 0. Hoe deze ronde uitgevoerd wordt

Via `npm run live` (`scripts/live.ts`), dat inlogt als `e2e-consultant@orbit-test.nl` en de gewone
serverroutes aanroept. Dus precies de weg die een klant met een browser ook aflegt, alleen zonder
browser.

Er stond hier eerst dat de live app onbereikbaar was. Dat klopte niet: het adres dat toen getest
werd (`geo-janwillemkoopmans-projects.vercel.app`) staat achter Vercel Deployment Protection, maar
productie is `https://geo-ten-blush.vercel.app` en die is gewoon bereikbaar.

⚠️ Rechtstreeks rijen in de database zetten is bewust GEEN optie. De eigenaar vroeg expliciet om de
gewone weg, en terecht: een merk dat via SQL ontstaat heeft geen crawl, geen onderzoekstaken, geen
feitenkaart en dus geen enkele van de dingen waar de kwaliteitsmeting straks over gaat. Dan meet de
benchmark zichzelf.

### Wat er staat (3 september 2026)

| Merk | Profiel-id |
|---|---|
| MJB Dakservice | `e1fe7b94-ead1-4020-a8ed-216905c042c8` |
| Fysio Centrum Utrecht | `58f2da3a-b068-479c-82a3-a7952e32e9ee` |

Allebei aangemaakt via `POST /api/profiles` (HTTP 201), de vijftien velden uit §3 daarna gezet via
`PATCH /api/profiles/<id>` met bron `gesprek`. De contactpersoon is bewust leeg gelaten: een naam en
een e-mailadres verzinnen bij een echt bestaand bedrijf hoort niet in een testronde thuis.

Het onderzoek liep voor allebei helemaal door, acht taken, nul mislukt. MJB: 64 pagina's gecrawld,
14 diensten, 7 onderwerpen, dossier compleet, $0,30. Fysio: 78 pagina's, 24 diensten, 6 onderwerpen,
dossier compleet, $0,25.

| Cluster | Analyse-id |
|---|---|
| MJB, daklekkage verhelpen | `8f301aef-8a5c-4130-91ae-5be720601448` |
| MJB, dakrenovatie en dakisolatie | `467968f3-ab2e-413c-8f2a-c94357f497bd` |
| Fysio, bekkenfysiotherapie | `9013d0fd-ee98-4dce-92b2-35c6a440c8ff` |
| Fysio, hardloopblessure behandelen | `ec7d3329-4893-4ee3-9034-cbdf611cfdf5` |

Alle vier de clusters kregen dertig meetvragen. Bij het nalopen is er één uitgezet, in het cluster
daklekkage: "Welke dakdekker in Zutphen kan een lekkage aan een bedrijfspand snel beoordelen en
repareren?" MJB richt zich blijkens `target_segments` op particuliere woningeigenaren en op VvE's,
niet op bedrijfspanden. De meting draait dus op 29, 30, 30 en 30 vragen.

Wat opviel bij het nalopen, en wat de moeite van het onthouden waard is: geen van de honderdtwintig
vragen ging over asbest of over subsidie, terwijl dat de twee verboden onderwerpen van MJB zijn. De
vragen namen ook de plaatsnamen uit de groeiregio's over (Deventer, Zutphen, Zwolle bij MJB;
Nieuwegein, Vleuten, Overvecht bij Fysio), dus het gesprek werkt aantoonbaar door in de meting.

---

## 1. ⚠️ Wat "alleen aanmaken, het onderzoek komt later" in de praktijk betekent

De keten laat zich hier niet in tweeën knippen, en dat is geen tekortkoming maar het ontwerp.

- **Een merk aanmaken start meteen betaald onderzoek.** `POST /api/profiles` zet acht
  onderzoekstaken klaar (fase 2, ongeveer 7,5 minuut, ongeveer $0,25 per merk). Er is geen stand
  waarin een merk bestaat zonder dat onderzoek.
- **Een pagina bestaat niet zonder meting.** De pagina's die geschreven worden komen uit de
  aanbevelingen van het rapport, en dat rapport komt uit de meting van dertig vragen per cluster
  (fase 5 en 6). Er is geen pad naar een geschreven pagina dat de meting overslaat.

"Het onderzoek komt later" leest daarom als: de KWALITEITSbeoordeling komt later. De twaalf pagina's
moeten wel echt geschreven zijn, anders is er niets om te beoordelen.

### Wat de ronde kost

Nagerekend op `ai_calls`, niet geschat:

| Post | Per stuk | Aantal | Totaal |
|---|---|---|---|
| Merkonderzoek (acht taken) | ~$0,25 | 2 merken | $0,50 |
| Meetronde (30 vragen, met websearch) | ~$0,82 | 4 clusters | $3,28 |
| Pagina schrijven en keuren | ~$1,00 | 12 pagina's | ~$12,00 |
| | | **samen** | **ongeveer $16** |

Dat is ongeveer €15. Tegen de plafonds uit het herstelplan (€20 per klant per dag, €50 over alle
accounts per dag) past dat, mits de twee merken op verschillende dagen of onder verschillende
accounts draaien. Zet je beide merken op één dag onder één account, dan zit je rond de €15 op een
plafond van €20 en is er weinig ruimte over voor een herstelronde.

**Doorlooptijd.** Vier clusters van dertig vragen zijn 120 meettaken, en de werker draait één keer
per minuut. Met het schrijven erbij is dit een ronde van enkele uren, geen minuten. Twee bewuste
stops onderbreken hem bovendien: "Bevestig en start meting" en "Schrijf mijn pagina's".

---

## 2. De twee klanten

Allebei echt bestaand, allebei geverifieerd op hun eigen site (3 september 2026), allebei precies de
doelgroep uit `CLAUDE.md`: regionaal MKB met diensten, waar iemand een AI-assistent een koopvraag
over stelt. Bewust twee verschillende sectoren, zodat de benchmark niet één soort pagina meet.

Ze overlappen ook niet met de merken die al in de database staan: die zijn installateur, fysio,
autodealer en retail.

### Klant A: MJB Dakservice (Apeldoorn)

Dakdekkersbedrijf, 25 jaar, werkgebied Apeldoorn met een straal van vijftig kilometer. Gekozen omdat
dit het scherpste GEO-profiel van de twee is: "daklekkage" is een spoedvraag die mensen letterlijk
aan een AI-assistent stellen, en het bedrijf heeft ongewoon veel concreet bewijs op de site staan
(garantietermijnen, certificering, aantallen). Dat maakt hem geschikt om te meten of ORBIT ENGINE dat
bewijs ook echt gebruikt.

| Veld bij aanmaken | Waarde |
|---|---|
| Bedrijfsnaam | MJB Dakservice |
| Webadres | mjbdakservice.nl |
| Andere schrijfwijzen | MJB Dak Service, MJB Dakservice Apeldoorn, MJB |

### Klant B: Fysio Centrum Utrecht

Fysiotherapiepraktijk met twee vestigingen (Utrecht Centraal en Leidsche Rijn), tien jaar actief,
met specialisaties die de meeste praktijken niet hebben (bekkenfysiotherapie, kaakfysiotherapie,
dry needling). Gekozen als tegenhanger van A: hier is de koopvraag geen spoed maar een keuze, en de
onderscheidende informatie zit in de specialisaties in plaats van in garanties.

| Veld bij aanmaken | Waarde |
|---|---|
| Bedrijfsnaam | Fysio Centrum Utrecht |
| Webadres | fysiocentrumutrecht.nl |
| Andere schrijfwijzen | Fysiocentrum Utrecht, Fysio Centrum Leidsche Rijn, FCU |

⚠️ **Let op bij de aliassen van B.** De praktijk hoort bij Fysio Centrum Amsterdam. Dat is een ander
merk en hoort dus in `name_exclusions` en niet in `aliases`, anders telt de meting straks
vermeldingen van Amsterdam mee als winst voor Utrecht.

---

## 3. Het gesprek met de klant, per merk ingevuld

Dit is het deel waarin de consultant zich als klant gedraagt (fase 3, stap 22). Deze vijftien velden
zijn per definitie niet uit een website af te leiden; ze komen uit het gesprek. Waar hieronder iets
staat dat niet op de site te vinden is, is dat een aanname die als zodanig is ingevuld, precies zoals
een echte klant het zou vertellen.

### Klant A: MJB Dakservice

| Veld | Ingevulde waarde |
|---|---|
| `priority_offerings` | Daklekkage verhelpen; dakrenovatie; dakisolatie |
| `deprioritised_offerings` | Dakgoot reparatie (te klein om op te sturen, komt vanzelf mee) |
| `growth_regions` | Deventer; Zutphen; Zwolle |
| `target_segments` | Particuliere woningeigenaren met een koophuis van vóór 1995; VvE's van kleine complexen |
| `deal_value_band` | midden |
| `seasonality` | Piek in het najaar en na een storm; januari en februari zijn rustig |
| `sales_objections` | "Een dakdekker is duur en je weet nooit of het echt nodig was"; "ik hoor pas achteraf wat het kost"; "de vorige dakdekker liet rommel achter" |
| `forbidden_topics` | Asbestsanering (doen we niet zelf en willen we niet mee geassocieerd worden); subsidieadvies (regelingen veranderen te snel) |
| `offline_proof` | Vaste ploeg van vier eigen dakdekkers, geen onderaanneming; binnen 24 uur ter plaatse bij een lekkage; werkt met een vaste leverancier waardoor materiaal binnen een dag beschikbaar is |
| `name_exclusions` | MJB Bouw (Amersfoort); MJB Installatietechniek |
| `respect_site_structure` | ja |
| `goal_12m` | Over een jaar bellen mensen in Deventer en Zutphen ons net zo vanzelfsprekend als in Apeldoorn |
| `taboo_phrases` | spotgoedkoop; gegarandeerd de goedkoopste; bodemprijs |
| Tone of voice | Nuchter en concreet, geen verkooptaal. Een dakdekker die uitlegt wat hij ziet. Formaliteit 2, energie 2, complexiteit 1, humor 1 |
| Contactpersoon | (in te vullen door de consultant bij het echte gesprek) |

### Klant B: Fysio Centrum Utrecht

| Veld | Ingevulde waarde |
|---|---|
| `priority_offerings` | Bekkenfysiotherapie; sportrevalidatie; manuele therapie |
| `deprioritised_offerings` | Medical taping (losse behandeling, geen traject) |
| `growth_regions` | Utrecht Overvecht; Nieuwegein; Vleuten |
| `target_segments` | Hardlopers en amateursporters tussen 25 en 45; vrouwen met bekkenklachten na een zwangerschap; kantoormedewerkers met nek- en schouderklachten |
| `deal_value_band` | klein |
| `seasonality` | Januari is de drukste maand (goede voornemens), zomer is rustig, september trekt weer aan |
| `sales_objections` | "Ik weet niet of ik een verwijzing van de huisarts nodig heb"; "wordt dit vergoed en gaat het van mijn eigen risico af"; "ik heb geen tijd voor twaalf afspraken" |
| `forbidden_topics` | Uitspraken over hersteltermijnen per aandoening (verschilt per persoon, en het wekt verwachtingen die we niet waar kunnen maken) |
| `offline_proof` | Bekkenfysiotherapeut met een eigen aantekening, in de regio zeldzaam; gratis medisch consult vóór de eerste afspraak; contracten met alle zorgverzekeraars; een psycholoog in hetzelfde team, waardoor pijn en belasting samen behandeld kunnen worden |
| `name_exclusions` | Fysio Centrum Amsterdam; Fysio Utrecht; FysioDomstad |
| `respect_site_structure` | ja |
| `goal_12m` | Over een jaar is de praktijk in Utrecht en Leidsche Rijn hét adres voor bekkenklachten, en niet één van de vijftien |
| `taboo_phrases` | genezen; gegarandeerd klachtenvrij; snelste hersteltijd |
| Tone of voice | Rustig, uitleggend, zonder medisch jargon. Iemand die de tijd neemt. Formaliteit 2, energie 1, complexiteit 2, humor 1 |
| Contactpersoon | (in te vullen door de consultant bij het echte gesprek) |

⚠️ **De verboden onderwerpen zijn met opzet scherp gekozen.** Ze zijn allebei deterministisch na te
rekenen (`checkForbiddenTopics`), dus deze ronde toetst meteen of dat vangnet werkt op echte tekst.
Bij B is het bovendien inhoudelijk juist: een uitspraak over hersteltermijnen is precies het soort
belofte dat een zorgverlener niet wil doen.

---

## 4. De vier clusters

Per merk twee, en bewust van verschillende aard, zodat de vier meetrondes niet vier keer hetzelfde
soort vraag opleveren.

| Merk | Cluster | Waarom dit cluster |
|---|---|---|
| MJB Dakservice | daklekkage verhelpen | Spoedvraag met hoge koopintentie. Dit is de vraag die iemand letterlijk aan een AI-assistent stelt terwijl er een emmer onder het lek staat. |
| MJB Dakservice | dakrenovatie en dakisolatie | Overwogen aankoop, langere oriëntatie, meer kennisvragen. Toetst het andere uiterste van de klantreis. |
| Fysio Centrum Utrecht | bekkenfysiotherapie | De specialisatie die de praktijk onderscheidt. Toetst of ORBIT ENGINE die onderscheidende informatie ook echt gebruikt. |
| Fysio Centrum Utrecht | hardloopblessure behandelen | Breed en concurrerend. Toetst het tegenovergestelde: kan de app opvallen op een onderwerp waar iedereen over schrijft. |

Content-brief per cluster: wat de klant zelf over dit onderwerp zou zeggen, plus het werkgebied en
de onderwerpen die hij niet wil. Dat is genoeg sturing zonder de aanbevelingen vooraf dicht te
timmeren.

⚠️ Hier stond eerst dat de kolom "waarom dit cluster" letterlijk overgenomen moest worden. Dat is bij
het uitvoeren niet gedaan, met opzet: die zinnen ("toetst of ORBIT ENGINE ...") zijn testtaal, en
een klant typt dat nooit. Ze zouden bovendien als context de prompt in gaan waarmee de meetvragen
gemaakt worden, en dan meet de benchmark deels zijn eigen bedoeling. De ingevulde briefs staan
hieronder.

| Cluster | Content-brief zoals ingevuld |
|---|---|
| daklekkage verhelpen | Dit is onze belangrijkste spoedvraag. Mensen zoeken hierop met een emmer onder het lek, dus ze willen vooral weten hoe snel we er kunnen zijn en wat het ongeveer gaat kosten. Werkgebied is Apeldoorn met een straal van ongeveer vijftig kilometer. Niets over asbest en niets over subsidies. |
| dakrenovatie en dakisolatie | Hier denken mensen langer over na. Ze willen eerst begrijpen waar ze aan beginnen: wanneer een dak echt vervangen moet worden, wat isolatie oplevert en wat het verschil is tussen de materialen. Werkgebied is Apeldoorn met een straal van ongeveer vijftig kilometer. Niets over asbest en niets over subsidies. |
| bekkenfysiotherapie | Hier onderscheiden we ons echt: we hebben een bekkenfysiotherapeut met een eigen aantekening en dat is in deze regio zeldzaam. Veel mensen weten niet dat deze behandeling bestaat, of denken dat ze een verwijzing van de huisarts nodig hebben. Vestigingen zijn Utrecht Centraal en Leidsche Rijn. Doe geen uitspraken over hoe lang herstel duurt. |
| hardloopblessure behandelen | Hier schrijft iedereen over, dus we moeten iets te vertellen hebben dat een ander niet heeft. Denk aan het gratis medisch consult voor de eerste afspraak en aan de psycholoog die bij ons in het team zit. Vestigingen zijn Utrecht Centraal en Leidsche Rijn. Doe geen uitspraken over hersteltermijnen. |

---

## 5. Hoe de twaalf pagina's tot stand komen

⚠️ **De paginatitels staan hier bewust niet in, en dat is geen nalatigheid.** Welke pagina's er nodig
zijn, komt uit de meting: het rapport (fase 6) leidt de aanbevelingen af uit de vragen waarop het
merk gemist werd, plus de structurele gaten uit de aanbodboom. Titels vooraf verzinnen zou precies
de stap overslaan die deze benchmark moet meten.

Wat er wél vastligt is de SELECTIE: uit elk rapport worden de **drie hoogst geprioriteerde
aanbevelingen** gekozen. Vier clusters maal drie is twaalf pagina's, en elk cluster heeft er dus
minstens één, zoals de opdracht vraagt.

Levert een rapport minder dan drie bruikbare aanbevelingen op, dan is dat een uitkomst en geen
probleem dat weggewerkt moet worden: noteer het en vul aan uit het andere cluster van hetzelfde merk.
Een aanbeveling die er niet is, verzinnen we niet.

### De volgorde per merk

1. Merk aanmaken (drie velden), onderzoek loopt vanzelf, ongeveer 7,5 minuut wachten.
2. De vijftien commerciële velden invullen uit §3, met bron `gesprek`.
3. Cluster 1 aanmaken met de content-brief uit §4.
4. De dertig meetvragen nalopen en bevestigen. **Eerste bewuste stop.**
5. Wachten tot de meting en het rapport klaar zijn.
6. Drie aanbevelingen kiezen, briefing beantwoorden. **Tweede bewuste stop.**
7. "Schrijf mijn pagina's".
8. Stap 3 tot en met 7 herhalen voor cluster 2.

### Wat er bij het beantwoorden van de briefing geldt

Acteer als de klant, niet als de app. Beantwoord wat een dakdekker of een fysiotherapeut echt zou
weten, sla over wat hij niet zou weten, en verzin geen cijfers om de dekking op te krikken. Een
overgeslagen vraag is een geldig antwoord en laat zijn sectie vervallen; dat is precies het gedrag
dat deze ronde moet laten zien.

---

## 6. Waar de benchmark daarna op wacht

De twaalf pagina's krijgen in het Kwaliteitslab het label `benchmark_set = "start-12"`. Samen met de
acht pagina's die er al staan komt de teller daarmee op twintig, en dat is het aantal waarop de
drempels van het kwaliteitsraamwerk voor het eerst op data bijgesteld mogen worden
(`IJKING_MINIMUM` in `lib/quality-benchmark.ts`).

⚠️ Die twintig gelden alleen als ze ook menselijk beoordeeld zijn. Twaalf ongelezen pagina's tellen
nergens in mee.

---

## 7. Hoe de ronde werkelijk verliep (3 september 2026)

### De meting

Vier rapporten, nul mislukte taken, $3,30 samen. De raming in §1 was $3,28, dus die klopte.

### De selectie

Elk rapport leverde meer dan drie aanbevelingen op (7, 6, 6 en 5), dus de regel uit §5 kon
onverkort: de drie hoogst geprioriteerde per cluster, samen twaalf. Aanvullen uit een ander cluster
was niet nodig.

### De briefing, en waar ik als klant iets verzon

Drieëntwintig vragen. Eenentwintig beantwoord, twee bewust overgeslagen.

⚠️ **Niet elk antwoord is een geverifieerd feit over deze bedrijven.** Wat uit hun eigen site kwam,
is echt: het werkgebied van vijftig kilometer rond Apeldoorn, de vaste ploeg, de garantie op
materiaal en apart op werk, de twee vestigingen van de fysiopraktijk, het telefoonnummer
030-2270437, het gratis medisch consult, de contracten met alle zorgverzekeraars. Verzonnen zijn de
bedrijfsregels en de bedragen: de reparatie vanaf ongeveer €250, exclusief btw, geen voorrijkosten
binnen vijfentwintig kilometer, geen spoed 's nachts. Dat mocht van de opdrachtgever ("soms zal je
je creativiteit moeten gebruiken"), maar het betekent dat deze twaalf pagina's meten hoe goed
ORBIT ENGINE met een gegeven antwoord omgaat, en niet of het antwoord over MJB waar is. Publiceren
kan dus niet zonder de echte cijfers.

De twee overgeslagen vragen zijn met opzet gekozen op de plek waar verzinnen het minst te
verdedigen viel: "heb je een eigen cijfer of klantverhaal dat nog niet op je site staat" en "wat
kost een eerste fysiotherapieafspraak zonder aanvullende verzekering". Eén per merk, zodat bij
allebei zichtbaar wordt wat er met een openstaande vraag gebeurt.

### Wat de inputpoort deed

Geen enkele van de twaalf werd tegengehouden. Twee kregen een waarschuwing, allebei op precies het
onderwerp waar ik als klant niets over zei:

| Pagina | Waarschuwing | Graad |
|---|---|---|
| Verbeter de hoofdpagina over daklekkage voor spoed en kosten | "Wat zit er in de prijs?" | 69 |
| Maak renovatie en isolatie één duidelijk stappenplan | "Wat kost dakrenovatie met nieuwe pannen en isolatie?" | 69 |

Dat is het gedrag dat het raamwerk belooft: de pagina mag geschreven worden, maar heet pas klaar
voor publicatie als de klant die ene vraag beantwoordt.

### De uitkomst: twaalf pagina's, twaalf keer geblokkeerd

Twaalf concepten, zestien reparatierondes, nul mislukte taken, $10,97 voor de hele ronde (raming
$16). Scores tussen 62 en 88.

En alle twaalf staan op `verdict: block`. Dat is geen strenge poort maar een kapotte: hij houdt
alles tegen en zegt daarmee niets. De oorzaak is nagerekend en staat als **R0** in
`docs/tasks/contentkwaliteit-framework.md` §10: de zinnenknipper plakt koppen aan alinea's vast en
knipt opsommingen op de cijfers doormidden, waarna die fragmenten als onbewezen bewering blokkeren.

⚠️ **Deze twaalf pagina's zijn daarom nog geen ijkset.** Ze moeten opnieuw gekeurd worden nadat R0
gerepareerd is. De TEKSTEN blijven bruikbaar, want die zijn niet door de fout beïnvloed; alleen de
oordelen erover zijn dat wel.
