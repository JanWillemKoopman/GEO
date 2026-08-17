# Schrijfstijl van ORBIT ENGINE

> De huisstijl van de teksten in de app, afgeleid van **InSpace Nova** (inspace.io, augustus 2026).
> Nova is het referentiepunt: alles wat we schrijven moet klinken alsof het uit dezelfde koker komt.
> Dit document is leidend voor UI-copy, net zoals `docs/designsystem.md` leidend is voor de vormgeving.

---

## Het uitgangspunt

**Duidelijkheid wint altijd.** Het space-thema verrijkt het product, maar mag nooit tussen de
gebruiker en zijn taak gaan staan. Nova doet dit zelf ook precies zo: het thema zit in de *namen*
(Nova, ORBIT ENGINE, InSpace, "Stratosphere", "Milky Way", "Universe Access", "Growth lab") en nooit in de
instructies. Hun eigen uitlegcopy is nuchter, kort en jargonvrij: *"Vergelijk je concurrenten"*,
*"Volg rankings live"*, *"Crawl, snelheid & structuur"*.

Vertaald naar één regel: **kosmisch in de naamgeving, klinisch helder in de aanwijzing.**

---

## De elf richtlijnen

### 1. Je en jij, nooit u
Nova spreekt de ondernemer consequent informeel aan: *"Nova laat je zichtbaarheid groeien"*,
*"Vergelijk je concurrenten"*, *"Schaal je organische groei"*. Wij ook. Geen "uw account", wel
"je account".

### 2. Korte, stellende zinnen, en de drieslag als signatuur
Nova's ritme is drie korte beats: *"Meer zichtbaarheid. Meer verkeer. Meer klanten."* ·
*"Echte merken. Echte groei."* · *"Research, strategie, content, publicatie, optimalisatie."*
Zet punten waar je een komma zou willen. Eén gedachte per zin.

### 3. ORBIT ENGINE is een handelend onderwerp, geen "systeem"
Nova schrijft over zichzelf in de derde persoon, als iets dat werkt: *"Nova leert eerst je bedrijf
kennen"*, *"Het schrijft de content"*, *"Nova blijft kijken naar rankings"*. Dus: **"ORBIT ENGINE leest je
website uit"**, niet "de website wordt uitgelezen". Actief, met ORBIT ENGINE of jij als onderwerp, nooit
lijdend.

### 4. Kop is de belofte, subkop is één zin uitleg
Nova's vaste bouwsteen is een naam met een one-liner eronder: *"Concurrentie Analyse: vergelijk je
concurrenten"*, *"Technische Optimalisatie: crawl, snelheid en structuur"*. Elke kaart, elk
hoofdstuk en elke lege staat volgt dat: een korte titel met daaronder precies één regel die zegt
wat je eraan hebt.

### 5. Genummerde stappen voor alles wat een volgorde heeft
Nova nummert zijn proces `01` tot `06`, elk met een vette titel plus een cursieve belofte:
*"01 Brand intelligence: Nova learns your business first"*. Onze hoofdstukken 01 tot 04 en de
onderzoeksstappen gebruiken hetzelfde patroon. De volgorde ís de uitleg.

### 6. Mono-labels: kort, feitelijk, met `·` als scheider
Nova's read-out-taal: *"NOVA · Autonoom · live"*, *"yourbrand.com · always on"*, *"Queue · 7 pages"*,
*"Continuous optimization · live"*. Labels zijn een zelfstandig naamwoord plus een status,
gescheiden door een punt-midden. Geen zinnen in een label.

### 7. Cijfers krijgen een richting mee
Nova toont nooit een kaal getal: *"Pagina's live **1.248** ↑ +12 deze week"*, *"Gem. positie **14,6**
↑ verbetert"*, *"AI-citaties **312** ↑ groeit"*. Label, waarde, en wat het doet. Weten we de richting
niet, dan zeggen we dat. We gokken hem niet.

### 8. Bewijs boven belofte
*"Gemeten, niet beloofd"* is Nova's kernclaim (*"Measured, not promised"* · *"The receipts"*). Wij
schrijven dus "3× aangetoond, toon het bewijs", niet "wij denken dat". Geen superlatieven, geen
uitroeptekens, geen "geweldig". Zelfvertrouwen komt uit het cijfer, niet uit het bijvoeglijk naamwoord.

### 9. Oud versus nieuw als uitlegtruc
Waar iets nieuw of contra-intuïtief is, gebruikt Nova een contrast: *"Vroeger was het doel hoog
ranken. Nu is het aanbevolen worden."* · *"Oude situatie: ranken met keywords. Nieuwe situatie: hét
relevante antwoord zijn."* Handig in lege staten en uitleg-tooltips.

### 10. Geen gedachtestreepjes en geen schuine strepen

**Dit is de enige richtlijn die over leestekens gaat, en hij is hard.** Twee tekens verraden
AI-tekst op afstand, en allebei komen ze in ons product niet meer voor:

| Nooit | Wel |
|---|---|
| `—` en `–` in lopende tekst | een komma, een dubbele punt, een puntkomma, of gewoon twee zinnen |
| `en/of`, `product/dienst`, `ja/nee` | "en of", "product of dienst", "ja of nee" |

Bij twijfel: knip de zin doormidden. Een gedachtestreepje staat er bijna altijd omdat de schrijver
twee gedachten in één zin wilde proppen, en dat is precies wat richtlijn 2 al verbiedt.

Vier uitzonderingen, alle vier functioneel en geen ervan zichtbaar als stijl:

- **Het koppelteken in een samenstelling** (`AI-assistent`, `merk-DNA`) is gewoon goed Nederlands.
- **Paden en breuken** (`/analyses`, `6/6`, `78/100`, `application/json`) zijn geen leestekens maar
  notatie.
- **Getal- en paragraafbereiken** (`5–8 onderwerpen`, `§2–§3`, `migraties 0034–0037`, `28–30 juli`)
  zijn notatie, geen zinsbouw. Toegevoegd op 17 augustus 2026 na telling: van de 37 kastlijntjes in
  de documentatie waren er 24 zo'n bereik en nul een gedachtestreepje in lopende tekst. De regel
  beschreef dus iets anders dan hij bedoelde. **In lopende tekst blijft het verbod absoluut.**
- **Code die kastlijntjes juist herkent** (`publish-check.ts`, `baseline-verdict.ts` normaliseren
  ze in binnenkomende tekst) en **regel 9 van de schrijfprompt**, die het teken bij naam moet
  noemen om het te kunnen verbieden.

Die schrijfprompt is het belangrijkste onderdeel van deze richtlijn: `lib/pipeline/content.ts`
draagt het model expliciet op om beide tekens weg te laten. Zonder die regel schrijft ORBIT ENGINE pagina's
die er voor de lezer van de klant uitzien als AI-tekst, en dan lekt de stijl het product uit.

### 11. Vaste woordenlijst, één woord per begrip
| Gebruik dit | Niet dit |
|---|---|
| ORBIT ENGINE | GEO Tracker, "de app", "het systeem", "de tool" |
| zichtbaarheid, AI-zichtbaarheid | vindbaarheid, exposure |
| AI-antwoorden, AI-assistenten | LLM's, chatbots, engines |
| vermelding, genoemd worden | mention, citation |
| vragen (die ORBIT ENGINE aan de AI stelt) | prompts, queries |
| merk | klantprofiel, account, klant |
| merkdossier | brand DNA, knowledge base |
| meting, meetronde | run, tracking cycle |
| concurrent | rival, competitor |
| onderzoek | scan, crawl (behalve in technische audit-context) |
| niet gelukt | mislukt |

---

## Wat we bewust NIET overnemen van Nova

- **Automatisch publiceren naar een CMS.** Nova's `04 Automated publishing` en de CMS-logo's
  (Shopify, WordPress, …) hebben wij niet. ORBIT ENGINE schrijft de pagina en levert hem klaar op; de klant
  plaatst hem zelf. De copy belooft dus nergens een koppeling.
- **"Volledig autonoom".** ORBIT ENGINE vraagt bewust om goedkeuring vóór er gemeten en gepubliceerd wordt.
  Waar Nova "autonomous" zegt, zeggen wij "ORBIT ENGINE doet het werk, jij zet de knopen door".
- **Klassieke SEO-taal** (rankings, keywords, posities in Google). ORBIT ENGINE is een GEO-product: het gaat
  om genoemd worden in AI-antwoorden.

---

## Het thema doseren

Ruimtemetaforen mogen op precies drie plekken, en verder nergens:

1. **De naam zelf**, dus ORBIT ENGINE, en het gradient-woord in een kop.
2. **Sfeer-eyebrows boven een sectie**: korte mono-labels die niets hoeven uit te leggen.
3. **Een enkele afsluitende regel** in een lege staat of succesmelding.

Nooit in: knoplabels, foutmeldingen, formuliervelden, validatieteksten, tooltips en
voortgangsmeldingen. Daar staat de gebruiker midden in een taak, en dan is een metafoor ruis.
Een knop heet **"Start het onderzoek"**, niet "Lanceer de sonde".

---

## Controleren vóór je commit

```bash
# Geen gedachtestreepjes in code of documentatie.
# De treffers die overblijven staan in docs/schrijfstijl.md onder de drie uitzonderingen.
grep -rn "—" app components lib scripts docs *.md --include="*.ts" --include="*.tsx" --include="*.md"

# Geen schuine streep tussen twee Nederlandse woorden.
grep -rnE "[a-zà-ÿ]{2,}/[a-zà-ÿ]{2,}" app components lib --include="*.ts" --include="*.tsx"
```
