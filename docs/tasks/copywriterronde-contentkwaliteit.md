# Copywriterronde: contentkwaliteit extern laten toetsen

> **Wat dit is.** Uitvoeringsplan voor een grondige kwaliteitstest van de contentketen (fase 5 tot en
> met 17 uit `zo-werkt-orbit-engine.md`), met een externe copywriter als beoordelaar in plaats van een
> interne blinde lezer. Status: nog niet uitgevoerd. Verwijder dit document zodra de ronde is
> gedraaid, de feedback verwerkt is, en de aanvaarde wijzigingen in `docs/logbook.md` staan.
>
> **Verhouding tot eerder werk.** Er is al een interne kwaliteitsdoorlichting gedraaid met drie merken
> en Claude als "blinde lezer" (`docs/tasks/kwaliteitsdoorlichting-stappen.md`,
> `docs/tasks/bevindingen-kwaliteitsdoorlichting.md`). Die test is waardevol maar heeft een blinde
> vlek: een AI-beoordelaar deelt de aannames van de AI-schrijver. Deze ronde vult dat aan met een
> menselijke vakschrijver die niets van de pijplijn weet en alleen het resultaat beoordeelt zoals een
> klant of een lezer dat zou doen. Beide toetsen blijven bestaan, dit is geen vervanging.

---

## 0. De grens die deze ronde niet overschrijdt

De vorige contentketen is stukgelopen doordat elke verbeterronde er een stap, een controle of een
beoordelaar bij bouwde. `contentketen-opnieuw.md` §3 trekt daar nu een harde lijn onder, en die lijn
geldt onverkort voor alles wat uit deze copywriterronde volgt:

- Hooguit drie soorten AI-aanroep per pagina plus één herschrijving (brief, schrijven, beoordeling,
  één herschrijving). Geen vierde soort.
- Geen cijfer als oordeel over een tekst, geen SEO-score, geen leesbaarheidsscore, geen enkele andere
  score op de tekst zelf.
- Code controleert alleen harde beweringen en mechanische regels. Stijl, toon en lengte krijgen geen
  vangnet in code.
- Geen extra controlelaag, geen automatische reparatielus, geen tweede beoordeling.

Elke verbetering die uit deze ronde komt, is dus een wijziging **binnen** een bestaande stap (een
promptregel scherper maken, een controle preciezer maken), nooit een nieuwe stap. Waar een bevinding
lijkt te vragen om iets dat hier tegenaan botst, wordt dat expliciet zo gerapporteerd in plaats van
gebouwd (§7).

---

## 1. Doel en maatstaf

Doel: vaststellen waar de pijplijn structureel kwaliteit laat liggen bij het schrijven van pagina's,
op basis van een externe, onafhankelijke beoordeling, en dat omzetten in gerichte verbeteringen aan
bestaande stappen. Niet: elk los artikel individueel oplappen.

De maatstaf sluit aan bij wat de app zelf al als "goed" hanteert (hoofdstuk 16 van
`zo-werkt-orbit-engine.md`): klopt het, en is het goed. De copywriter krijgt een iets fijnmaziger
versie van diezelfde twee vragen (§5).

---

## 2. De matrix: 3 klanten, 3 clusters, 2 artikelen per cluster

18 content-items, bewust gekozen op variatie in plaats van willekeur. Meer clusters of meer artikelen
per klant voegt vooral herhaling toe; meer *soorten* situaties leggen meer bloot. Waar een cluster
extra veelbelovend blijkt (zie §3), mag die naar 3 artikelen groeien (27 als bovengrens).

### 2.1 De drie klantprofielen

Kies per profiel een echt bestaand, te verifiëren bedrijf (zoals in `benchmarkronde-twee-klanten.md`
§2), niet overlappend met de merken die al in de database staan (installateur, fysiotherapie,
autodealer, retail, dakdekker, tweede fysiopraktijk). Elk profiel test een ander deel van de keten:

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

---

## 3. Hoe de ronde in de app wordt uitgevoerd

Via de gewone weg, niet rechtstreeks in de database. Reden: zie `benchmarkronde-twee-klanten.md` §0,
onverkort van toepassing. Een merk dat via SQL ontstaat heeft geen onderzoek, geen feitenlaag en geen
van de stappen waar deze test juist over gaat.

Volgorde per klant:

1. Merk aanmaken (drie velden), onderzoek laten doorlopen (ongeveer 7,5 minuut).
2. Het gesprek invullen volgens het profiel uit §2.1, met bron `gesprek`.
3. Drie clusters aanmaken volgens §2.2, meetvragen nalopen en bevestigen (eerste bewuste stop, één
   per cluster).
4. Wachten op meting en rapport.
5. Per cluster de twee hoogst geprioriteerde aanbevelingen kiezen, in het contentplan inplannen, de
   maand vrijgeven (tweede bewuste stop).
6. De brief-vragen beantwoorden zoals de klant uit het profiel dat zou doen: bij klant A uitgebreid en
   concreet, bij klant C kort en met bewust overgeslagen vragen waar de klant het antwoord niet zou
   weten. Nooit een cijfer of feit verzinnen dat niet in het profiel staat; een overgeslagen vraag is
   een geldig resultaat.
7. Laten schrijven, de eerste versie en (als die er is) de herschreven versie bewaren vóór ze in het
   goedkeuringsscherm verdwijnen (§4 heeft ze allebei nodig).

⚠️ **Kosten en dagplafond.** Drie klanten op één dag onder één account loopt tegen het plafond van
€20 per klantaccount aan. Spreid over meerdere accounts of meerdere dagen. Ruwe schatting op basis van
de tarieven in hoofdstuk 25 en de werkelijke uitkomst van de vorige benchmarkronde (die met 12
pagina's op ongeveer €11 uitkwam, hoger dan de theoretische €0,10 tot €0,17 per pagina door
reparatierondes):

| Post | Ongeveer | Aantal | Totaal |
|---|---|---|---|
| Merkonderzoek | $0,25 | 3 | $0,75 |
| Meetronde per cluster | $0,82 | 9 | $7,38 |
| Pagina schrijven, controleren, eventueel herschrijven | $0,90 (realistisch, zie boven) | 18 | $16,20 |
| **Samen** | | | **ongeveer $24, zo'n €22** |

Dat past onder het plafond van €50 over alle accounts samen, maar niet ruim. Bewaar budget voor de
verificatieronde in §8 door die kleiner te houden dan deze eerste ronde.

---

## 4. Het klantdocument voor de copywriter

Eén Markdown-bestand per klant, zelfstandig leesbaar, letterlijk door te sturen zonder verdere
toelichting. Het bevat de beoordelingsinstructie zelf, zodat de copywriter niets anders nodig heeft.

Sjabloon (met `[...]` als plek om in te vullen):

```markdown
# Contentbeoordeling: [bedrijfsnaam]

Dit document bevat [n] pagina's die automatisch zijn opgesteld voor dit bedrijf, met de
achtergrondinformatie waarmee ze zijn geschreven. We willen weten of ze goed genoeg zijn om
zonder verdere bewerking op de eigen website van het bedrijf te zetten, en waar niet.

**Wat we vragen.** Lees per pagina de tekst en beoordeel hem op de vijf punten onder aan elke
pagina. Vul een cijfer van 1 (helemaal niet) tot 5 (helemaal wel) in, met een korte reden. Een
paar zinnen per punt is genoeg; wat je zou aanpassen is waardevoller dan het cijfer zelf.

Onderaan dit document staat ruimte voor een algemene indruk over alle [n] pagina's van dit
bedrijf samen: valt je iets op dat vaker terugkomt?

Stuur dit document na het invullen gewoon terug, met je opmerkingen erin.

---

## Over dit bedrijf
- Sector: [...]
- Werkgebied: [...]
- Voor wie: [doelgroepen uit target_segments]
- Toon: [samenvatting van tone_of_voice]

---

## Pagina 1: [titel]

**Waarvoor deze pagina bedoeld is:** [zoekintentie, in gewone taal]
**Voor wie:** [de één-zin-doelgroep uit het rapport]

### Wat het bedrijf zelf heeft aangeleverd
[het antwoord op de open vraag, letterlijk, plus de antwoorden op de gerichte vragen]

### De tekst (eerste versie)
[eerste schrijfversie]

### De tekst (na controle en eventuele herschrijving, dit is de definitieve versie)
[definitieve versie, of "gelijk aan de eerste versie, geen herschrijving nodig"]

### Jouw beoordeling
| Punt | Cijfer (1-5) | Toelichting |
|---|---|---|
| Klopt het, staat er niets wat feitelijk onjuist aanvoelt? | | |
| Klinkt het als dit specifieke bedrijf, niet als een generieke tekst die op elk bedrijf in de branche past? | | |
| Beantwoordt de eerste alinea de vraag van de bezoeker meteen? | | |
| Is er echte diepgang (een concreet voorbeeld, vakkennis), of blijft het oppervlakkig? | | |
| Zou je deze tekst zo op de site zetten, zonder herschrijven? | | |

*(herhaal dit blok per pagina)*

---

## Algemene indruk over alle pagina's van [bedrijfsnaam] samen
[open vraag: wat valt op, wat komt vaker terug, wat zou je als eerste aanpakken]
```

⚠️ Geef de copywriter geen inzage in de interne stapnamen ("brief", "controle", "herschrijving") of
in het feit dat dit AI-gegenereerd is, tenzij dat voor de opdracht nodig is. Hij moet oordelen als een
lezer of als de ondernemer, niet als tester van een AI-systeem. Noem het "automatisch opgesteld" en
niet meer dan dat.

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
# Copywriterronde [datum]: bevindingen en patronen

## 1. De matrix en de scores
| Klant | Cluster | Pagina | Klopt | Klinkt eigen | Direct antwoord | Diepgang | Direct plaatsbaar | Gemiddeld |
|---|---|---|---|---|---|---|---|---|
| A | ... | ... | | | | | | |
(18 rijen)

## 2. Patronen (wat op meerdere pagina's terugkomt)
### Patroon 1: [korte beschrijving]
- Komt voor bij: [x van 18 pagina's, welke klanten/clusters]
- Bewijs: [twee of drie letterlijke citaten uit de copywriterfeedback]
- Vermoedelijke oorzaak: [welke stap: brief, schrijfopdracht, controle, herschrijving]
- Soort: feitelijk/mechanisch, of stijl/toon (zie §0 en §7 van dit plan)

(herhaal per patroon, hooguit 5, geprioriteerd op hoeveel pagina's het raakt)

## 3. Conclusie
[maximaal vijf voorstellen, elk gekoppeld aan precies één bestaande stap]
```

Beperk dit tot **hooguit vijf patronen**, geprioriteerd op hoeveel content-items ze raken. Dat is
dezelfde discipline als de Teamsessie-skill al hanteert, en voorkomt dat een enkel opvallend slecht
artikel de agenda gaat bepalen.

---

## 7. Hoe dit naar Claude Code gaat

Geef Claude Code niet de ruwe copywriterfeedback, maar het patronen-document uit §6. Vraag er
expliciet bij:

> Kijk per patroon in welke bestaande stap dit ontstaat, en stel een wijziging voor die **binnen**
> die stap blijft: een scherpere instructie in een bestaande prompt, of een preciezere controle in
> bestaande code. Geen nieuwe stap, geen nieuwe AI-aanroep, geen score op de tekst, geen extra
> controlelaag (`contentketen-opnieuw.md` §3). Past een patroon daar niet in, meld dat expliciet in
> plaats van het toch te bouwen.

Dat laatste is belangrijk: een patroon dat lijkt te vragen om bijvoorbeeld een vierde AI-aanroep of
een score, is geen instructie om die grens te doorbreken maar een signaal dat het probleem elders moet
worden opgelost (vaak: betere input verzamelen in het gesprek, in plaats van een nieuwe stap na het
schrijven).

---

## 8. Verifiëren dat een wijziging echt helpt

Geen enkele wijziging telt als klaar op gevoel. Na een geaccepteerde wijziging:

1. Voeg een testgeval toe aan `test-unit.ts` (voor een mechanische regel) of `test-chain.ts` (voor
   iets dat de samenhang tussen stappen raakt), met een van de voorbeelden uit het patronen-document
   als vast geval.
2. Draai een kleinere herhaling: minstens de clusters waar het patroon het sterkst speelde (niet per
   se alle 18 opnieuw), met dezelfde copywriter en hetzelfde beoordelingsformulier uit §4.
3. Leg de oude en nieuwe versie naast elkaar, met dezelfde criteria.
4. Is het patroon weg zonder dat een ander criterium zakt, log de wijziging met datum en het
   voor/na-cijfer in `docs/logbook.md`. Zo niet, dan is de wijziging niet de oplossing en blijft het
   patroon open voor de volgende ronde.

Gebruik `MEASURE_WEB_SEARCH=false` voor deze herhalingsronde als er nieuwe metingen nodig zijn; voor
de eerste, echte ronde in §3 blijft die aan, anders zijn de aanbevelingen niet realistisch.

---

## 9. Voortgang

| Stap | Status |
|---|---|
| Drie klantprofielen gekozen en geverifieerd (§2.1) | Nog te doen |
| Klanten aangemaakt, gesprekken ingevuld (§3) | Nog te doen |
| Clusters gemeten, content vrijgegeven en geschreven (§3) | Nog te doen |
| Drie klantdocumenten opgesteld (§4) | Nog te doen |
| Terug van de copywriter | Nog te doen |
| Patronen-document gemaakt (§6) | Nog te doen |
| Voorgelegd aan Claude Code (§7) | Nog te doen |
| Wijzigingen geverifieerd en gelogd (§8) | Nog te doen |
