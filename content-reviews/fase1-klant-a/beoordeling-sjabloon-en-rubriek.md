# Fase 1: werken het sjabloon en de rubriek?

> **Verwerkt op 29 september 2026** in versie 2 van §4 van de methode, samen met de eigenaar. Het
> klantdocument is daarmee opnieuw opgebouwd; "Hoe ingevuld" onderaan geldt voor versie 1.

Eigen oordeel van Claude Code na het opstellen van het klantdocument voor Slotenspecialist van
Kessel, 29 september 2026. Beantwoordt de drie vragen uit `docs/contentkwaliteit-testmethode.md`
§2 (fase 1). Het sjabloon zelf is **niet** gewijzigd; dit zijn voorstellen om samen door te lopen.

⚠️ De echte toets is wat de copywriter terugstuurt: of hij iets moet terugvragen en of de feedback
specifiek is, weten we pas daarna. Dit oordeel gaat over wat bij het invullen al zichtbaar werd.

## Kort

Het sjabloon werkt: het document is in één keer te bouwen, leest als een opdracht en vraagt de
copywriter geen kennis van de app. Vier punten verdienen aanpassing vóór klant B en C, allemaal
klein, maar omdat ze het sjabloon raken horen ze in §4 en niet in een eenmalige uitzondering. Twee
daarvan heb ik in dit document al opgevangen bij het invullen (zie "Hoe ingevuld"), zodat het
document nu verstuurd kan worden.

## 1. Is het sjabloon zelfstandig genoeg?

Grotendeels. Vier plekken waar een copywriter kan vastlopen of een verkeerd beeld krijgt:

**a. De koppen noemen de interne stappen die §4 zelf verbiedt.** Het sjabloon schrijft "De tekst
(na controle en eventuele herschrijving, dit is de definitieve versie)", terwijl de waarschuwing
onder het sjabloon zegt: geen "controle" of "herschrijving" noemen. Het sjabloon spreekt zichzelf
tegen. *Voorstel:* "De tekst, eerste versie" en "De tekst, definitieve versie".

**b. Niet gezegd welke versie hij beoordeelt.** Het document bevat per pagina twee volledige teksten
(bij vier van de zes echt verschillend). De rubriek staat eronder zonder te zeggen of hij de
definitieve beoordeelt, de eerste, of het verschil. Dat verdubbelt ook het leeswerk: het document
telt ruim 17.000 woorden. *Voorstel:* één zin boven de rubriek, "beoordeel de definitieve versie",
en de eerste versies naar een bijlage achteraan, alleen ter vergelijking. Dan wordt het leeswerk
ongeveer de helft.

**c. Bij een verbeterpagina ontbreekt de huidige pagina.** Vijf van de zes pagina's zijn een
herschreven versie van een bestaande pagina. Of een verbetering goed is, kun je alleen zien naast
wat er stond, en het sjabloon heeft daar geen veld voor. *Voorstel:* een regel "Huidige pagina:
[adres], of: nieuwe pagina".

**d. De bron voor "Toon" bestaat niet meer.** Het sjabloon zegt "samenvatting van tone_of_voice",
maar dat veld is sinds 25 september leeg (de stemvoorbeelden vervangen het, besluit B14 van
`docs/tasks/contentketen-opnieuw.md`). *Voorstel:* "Toon: zoals op [de adressen van de
stemvoorbeelden]", eventueel met één zin samenvatting.

Kleinere punten, niet blokkerend:
- **"Waarvoor bedoeld" en "Voor wie" zijn hetzelfde gegeven.** Beide komen uit de ene zin over de
  lezer uit het rapport; ingevuld volgens het sjabloon staan er twee identieke regels.
- **"[titel]" is dubbelzinnig.** De titel van de aanbeveling is een opdracht ("Maak de
  noodopeningspagina concreet over ..."), geen paginatitel. Ik heb de titel van de geschreven pagina
  gebruikt; het sjabloon zou dat moeten zeggen.
- **Het sjabloon zegt niet of de veelgestelde vragen en de titel en omschrijving voor zoekmachines
  meegaan.** Ze staan op de pagina en de klant keurt ze goed, dus ik heb ze opgenomen.
- **De aangeleverde antwoorden verraden een beetje het systeem.** De vragen zelf staan erbij zoals
  de klant ze kreeg, bijvoorbeeld "Welke actuele totaalprijs mag de schrijver noemen ...". Dat is
  geen probleem voor het oordeel, maar wel een kleine inbreuk op "noem het automatisch opgesteld en
  niet meer dan dat".

## 2. Is de rubriek duidelijk?

De zes punten en de publiceer-vraag zijn helder, en de drie antwoorden op de publiceer-vraag (ja,
bijschaven, onder de maat) maken precies het onderscheid dat §1 wil. Drie punten om aan te scherpen:

- **"Klopt het" is voor een buitenstaander niet te toetsen.** De copywriter weet niet welke feiten
  echt zijn. *Voorstel:* één zin: "ga ervan uit dat wat het bedrijf aanleverde klopt; beoordeel of
  de tekst daarbuiten iets beweert wat je niet zou durven publiceren". Dan meet dit punt wat we
  willen weten (verzint de tekst iets?) in plaats van een gok over slotenmakerstarieven.
- **"Bij de laagst scorende pagina's" heeft geen grens.** *Voorstel:* "bij elke pagina die je niet
  met 'ja, zo' zou publiceren".
- **Zes cijfers maal zes pagina's is 36 cijfers.** Dat is werkbaar, maar het sjabloon zegt zelf dat
  de toelichting waardevoller is dan het cijfer. Ik zou het zo laten; alleen noemen als de
  copywriter erover klaagt.

## 3. Kloppen kosten en doorlooptijd met de schatting?

**Kosten: de helft van de schatting.** Werkelijk $4,34 (ongeveer €4), geschat €7 à €8. Per post,
nagerekend op `ai_calls`:

| Post | Werkelijk | Schatting §3 | Verschil |
|---|---|---|---|
| Merkonderzoek | $0,13 | $0,25 | kleinere site |
| Meting, drie clusters | $2,99 | $2,46 | iets duurder door herkansingen en Google AI Overview |
| Zes pagina's (brief, schrijven, controle, herschrijven) | $1,21 ($0,20 per pagina) | $5,40 ($0,90 per pagina) | ruim vier keer goedkoper |

De €0,90 per pagina kwam uit de benchmarkronde met de oude keten en zijn reparatierondes. De nieuwe
keten (hooguit één herschrijving) kost ongeveer $0,20 per pagina. *Voorstel:* in §3 de schatting per
pagina naar ongeveer $0,25 en per meetronde naar $1,00. Voor fase 2 (klant B en C, zes clusters,
twaalf pagina's) komt dat op ongeveer $0,25 + $6 + $3 = rond $9, zo'n €8. Past onder één
klantaccount op één dag, maar spreiden blijft verstandig omdat een tweede poging dan ook past.

**Doorlooptijd in de app: 76 minuten** voor merk, drie clusters en zes pagina's, waarvan 46 minuten
meting. De methode noemt geen totale doorlooptijd, alleen de 7,5 minuut onderzoek; die klopte
(6 minuten). Het handwerk eromheen (bedrijf zoeken en controleren, gesprek en 28 brief-antwoorden
verzinnen, 90 meetvragen nalezen, document bouwen) kostte meer tijd dan de app.

**Wat de schatting mist: de tijd van de copywriter.** Het document is ruim 17.000 woorden. Met
beide versies volledig lezen en invullen is dat een halve werkdag of meer; met de eerste versies in
een bijlage (voorstel 1b) ongeveer de helft. Dat bepaalt de kosten van een ronde meer dan de $4.

## 4. Wat de methode zelf nog niet voorziet

- **Minder dan twee aanbevelingen in een cluster.** Cluster 2 (slim slot) gaf er één, omdat het merk
  daar al goed scoort. §2.3 gaat uit van twee per cluster en zegt niet wat er dan moet. Ik heb, naar
  het precedent van de benchmarkronde, aangevuld uit een ander cluster. *Voorstel:* dat als regel in
  §2.3 zetten.
- **Geen nieuwe pagina in de rapporten.** Elf van de twaalf aanbevelingen waren verbeterpagina's.
  §2.2 wil beide paden in de matrix, maar "de twee hoogst geprioriteerde" (§3) kan dat onmogelijk
  maken. Ik heb de aanvulling bewust op de enige nieuwe pagina laten vallen. *Voorstel:* in §3 één
  zin dat de aanvulling bij voorkeur het ontbrekende pad vult.

## Hoe ingevuld, waar het sjabloon niet genoeg zei

Zodat een volgende ronde weet wat er in dit document anders is dan het letterlijke sjabloon:
- Paginatitel: de titel van de geschreven pagina, niet die van de aanbeveling.
- "Waarvoor bedoeld": de aanbeveling in gewone taal, plus bij een verbeterpagina het adres van de
  huidige pagina ("die kun je ter vergelijking openen").
- "Toon": samengevat uit de stemvoorbeelden, met hun adressen.
- In beide versies staan ook de veelgestelde vragen en de titel en omschrijving voor zoekmachines.
- Koppen in de paginateksten drie niveaus lager, zodat ze niet groter worden weergegeven dan
  "Pagina n".

De sjabloontekst zelf (inleiding, rubriek, publiceer-vraag, slotvraag) is letterlijk overgenomen,
inclusief de koppen uit punt 1a.
