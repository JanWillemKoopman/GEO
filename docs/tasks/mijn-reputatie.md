# Mijn reputatie: productplan en implementatieplan

**Opgesteld:** 22 augustus 2026 · **Status:** plan, er is nog niets van gebouwd ·
**Plaats in de app:** Analytics, vierde bestemming (zie §2.2, daar ligt een besluit voor je klaar)

Dit document beschrijft een **nieuw, apart betaald onderdeel** binnen ORBIT ENGINE. Het beantwoordt
één vraag die de app vandaag niet kan beantwoorden:

> **Hoe staat dit merk bekend in AI, per product en per dienst, en waar haalt AI dat vandaan?**

Niet "word je genoemd" (dat meet de app al), maar **hoe er over je gepraat wordt**: positief,
neutraal of negatief, waarom dat zo is, en op welke bronnen dat oordeel rust.

Een leesbare versie zonder techniek staat ernaast in
[`mijn-reputatie.html`](./mijn-reputatie.html). Dit bestand is leidend: bij een verschil klopt dit
bestand en hoort de HTML bijgewerkt te worden.

---

## Inhoud

1. [Waarom dit een eigen product is](#1-waarom-dit-een-eigen-product-is)
2. [Vijf dingen die eerst gezegd moeten worden](#2-vijf-dingen-die-eerst-gezegd-moeten-worden)
3. [Het product: wat de klant ziet](#3-het-product-wat-de-klant-ziet)
4. [De analyse: wat ORBIT ENGINE precies vraagt](#4-de-analyse-wat-orbit-engine-precies-vraagt)
5. [De rekensom: wat het kost](#5-de-rekensom-wat-het-kost)
6. [Datamodel, migratie 0062](#6-datamodel-migratie-0062)
7. [De taken in de wachtrij](#7-de-taken-in-de-wachtrij)
8. [Implementatie in vijf sprints](#8-implementatie-in-vijf-sprints)
9. [Wat we testen](#9-wat-we-testen)
10. [Het commerciële plaatje](#10-het-commerciële-plaatje)
11. [Fase 2: van inzicht naar verbetering](#11-fase-2-van-inzicht-naar-verbetering)
12. [Wat er bewust niet in zit](#12-wat-er-bewust-niet-in-zit)
13. [Wat jij buiten Claude Code om moet doen](#13-wat-jij-buiten-claude-code-om-moet-doen)

---

## 1. Waarom dit een eigen product is

### 1.1 De app meet vandaag drie dingen, en dit is geen van drieën

| Wat er al is | De vraag die het beantwoordt | Waar |
|---|---|---|
| De meting (`measure_prompt`) | Word je genoemd als iemand een **koopvraag** stelt? | Analytics · Zichtbaarheid in AI |
| De kennistest (`profile_llm_baseline`) | **Weet** een AI-assistent wie je bent, en klopt dat? | Merkprofiel · Merkdossier |
| Het bronnenlandschap (`offsite_scan`) | Welke **sites** bepalen deze markt, en sta jij erop? | Analytics · Concurrenten |

Alle drie gaan over aanwezigheid: sta je er, en klopt wat er staat. Geen van drieën gaat over
**toon**. Een merk kan bij elke koopvraag genoemd worden en er tegelijk bekend om staan dat de
levering altijd te laat is. De app zou dat vandaag niet zien, en het is precies wat een ondernemer
als eerste wil weten.

Mijn reputatie voegt die vierde vraag toe, en hij staat op zichzelf:

> **Hoe praat AI over je, waarom praat AI zo over je, en waar komt dat beeld vandaan?**

### 1.2 Waarom het per product en per dienst moet

Een merkbreed oordeel is voor een MKB-bedrijf te grof om iets mee te doen. Een fysiotherapiepraktijk
kan uitstekend bekendstaan om sportmassage en tegelijk nergens genoemd worden bij
bekkenfysiotherapie. Een installatiebedrijf kan als betrouwbaar gelden voor onderhoud en als duur
voor nieuwbouw. Dat verschil is het advies.

De aanbodboom (`profile_offerings`, migratie 0039) is daar precies voor gebouwd: hij staat er al,
hij is per merk uniek, en hij hangt op de niveaus categorie, dienst en product. Die boom is dus de
as van dit hele product, zoals de opdracht ook vraagt. Er hoeft niets nieuws voor ingevuld te
worden, en dat is belangrijk: dit onderdeel voegt **nul handmatige stappen** toe aan de onboarding.

### 1.3 Waarom het een los product is, en geen extra tabblad

Drie redenen, en ze horen alle drie in de bouw terug te komen:

1. **De klant betaalt er apart voor.** Dus moet het als los ding te starten, te herhalen en te
   dateren zijn, met zijn eigen kosten in de boeken.
2. **Het draait niet mee in de maandelijkse cyclus.** De meting draait periodiek; een reputatiescan
   is een moment, en pas veel later nog een moment.
3. **Het heeft een eigen einduitspraak.** De meting eindigt op een percentage. Dit eindigt op een
   zin: *"AI praat overwegend positief over je, en baseert dat vrijwel volledig op je eigen
   website."* Dat is een ander soort antwoord en het verdient een eigen scherm.

---

## 2. Vijf dingen die eerst gezegd moeten worden

Vier gaan over aannames in de opdracht die niet helemaal kloppen. De vijfde is een besluit dat jij
moet nemen voordat er iets gebouwd wordt.

### 2.1 Sentiment is hier al eens gemeten, en het leverde niets op

⚠️ **Dit is de belangrijkste alinea van het hele document.**

Tot migratie 0029 (juli 2026) mat elke meting `sentiment` per vermelding. Uitkomst na **650
gemeten rijen**: `negative` kwam **geen enkele keer** voor, `positive` bij precies één analyse. Het
veld is toen vervangen door `mention_role` (hoe prominent word je genoemd), en de kolom
`tracking_run_mentions.sentiment` staat er nog maar wordt niet meer gevuld. Zie
`docs/logbook.md` R3.

Als je nu een sentimentanalyse bouwt zonder dat te weten, bouw je dezelfde fout opnieuw.

**Waarom het hier tóch anders uitpakt, en dat is geen hoop maar een mechanisme.** Die 650 metingen
waren geen sentimentmetingen. Het waren antwoorden op koopvragen ("wie is de beste fysiotherapeut in
Tilburg"), en in zo'n antwoord noemt een assistent bedrijven neutraal op. Er zit geen oordeel in,
dus er valt geen oordeel uit te lezen. Sentiment was daar een bijproduct, en een bijproduct van iets
wat het niet meet is altijd vlak.

Mijn reputatie vraagt er **rechtstreeks** naar, en vraagt bewust ook naar de andere kant:

- *"Wat zeggen klanten over X?"*
- *"Wat zijn de nadelen van X? Waar klagen klanten over?"*
- *"Is X betrouwbaar? Waarom wel of niet?"*
- *"X of Y: welke zou je aanraden, en waarom?"*

Dat zijn vragen waar variatie ín zit. Een model dat expliciet naar klachten gevraagd wordt en er
geen vindt, zegt dat, en dat is óók een meetresultaat.

**Het vangnet, want een intentie is geen garantie (conventie 1).** Een taalmodel is standaard
vriendelijk. Vraag je naar een onbekend bedrijf, dan krijg je een welwillend, inhoudsloos antwoord.
Zonder rem levert dat een mooie score op voor een merk waar AI helemaal niets van weet, en dat is de
gevaarlijkste uitkomst die dit product kan geven: een gerustgesteld bedrijf dat onzichtbaar is.

Daarom is de toon **nooit** het enige getal op het scherm. Er staat altijd een tweede naast:
**bewijskracht**, hoeveel echte bronnen er onder dat oordeel liggen. En er is een harde regel in
code:

> **Toon zonder bewijs is geen reputatie.** Levert een antwoord geen enkele controleerbare bron op,
> dan wordt de toon vastgelegd maar telt hij niet mee in het merkcijfer, en het scherm zegt letterlijk
> dat AI hier geen beeld van heeft.

Dat is dezelfde regel als conventie 3: onbekend is een betere waarde dan een verkeerde.

### 2.2 Analytics mag hooguit drie bestemmingen hebben, en dit wordt de vierde

`docs/ux-design.md` §5 en `lib/nav.ts` leggen vast: vijf hoofdstukken, elk **hooguit drie** kinderen.
Admin mocht er op 19 augustus 2026 vier, met een uitgeschreven argument. `scripts/test-unit.ts`
bewaakt beide grenzen, dus deze regel is geen richtlijn maar een test die faalt.

Analytics staat vol: Zichtbaarheid in AI, Zoekverkeer, Concurrenten. Er zijn drie uitwegen.

| | Wat je doet | Wat het kost |
|---|---|---|
| **A. Analytics naar vier** | Mijn reputatie erbij, met een uitgeschreven reden zoals bij Admin | De regel wordt zachter. De volgende uitzondering is makkelijker |
| **B. Concurrenten opnemen in Zichtbaarheid** | Concurrenten wordt een blok op het zichtbaarheidsscherm, Analytics blijft op drie | Een scherm erbij op een pagina die al lang is. Een bestaand adres verhuist |
| **C. Eigen hoofdstuk "Reputatie"** | Zesde kop in de zijbalk | Zes koppen voor één bestemming. Precies de vergaarbak die besluit 1 opruimde |

**Aanbeveling: A.** De reden is dezelfde soort als bij Admin, geen vergaarbak maar iets van een
andere orde: **de andere drie bestemmingen tonen data die de app sowieso al verzamelt, deze is een
los product dat de klant apart koopt.** Drie plus een product, net als Admin drie plus een uitgang
is. Zet die zin in `lib/nav.ts`, in `docs/ux-design.md` §5 en in de bewakende test, precies zoals
dat op 19 augustus is gebeurd.

⚠️ Wat dit besluit betekent: **een vijfde bestaat dan echt niet meer zonder eerst iets samen te
voegen.** Dat is dan geen stijlregel meer maar een grens.

### 2.3 De €3 wordt bij lange na niet opgemaakt, en dat is goed nieuws

Je stelt €3 per analyse beschikbaar. Nagerekend tegen `lib/openai/pricing.ts` landt de volledige
analyse op **ongeveer $0,40, dus rond de €0,37** (§5 heeft de hele som). Dat is geen slordige
schatting: een web-zoekactie kost op een redeneermodel $0,01 vast, en `gpt-5.6-luna` kost
$0,20 per miljoen invoertokens.

Er is dus ruimte over. Die gebruiken we niet door duurder te doen, maar door **dieper te kijken**.
Vandaar twee dieptes, die de beheerder kiest bij het starten:

| Diepte | Aanbodknopen | Herhalingen | Vragen totaal | Kosten |
|---|---|---|---|---|
| **Standaard** | tot 12 | 1 | ± 35 | ± €0,37 |
| **Diep** | tot 25 | 3 op merkniveau, 2 per knoop | ± 95 | ± €1,05 |

Beide blijven ruim onder het plafond. Het plafond van **€3 blijft hard in code staan** als rem, niet
als doel: `lib/reputation/budget.ts` telt vóór elke stap wat er op deze run al is uitgegeven, precies
zoals `lib/pipeline/onboarding-budget.ts` dat voor de onboarding doet. Loopt hij vol, dan wordt de
rest overgeslagen **en wordt dat vastgelegd en getoond**, nooit stil.

### 2.4 "Zoek op Google reviews" kan niet zoals het klinkt

Google heeft geen open API voor reviews van willekeurige bedrijven, en de app heeft geen
Google-sleutel voor de Business Profile API. Wat wél kan, in deze volgorde:

1. **Web-zoeken via het model.** Dat vindt in de praktijk de Google-vermelding, Trustpilot,
   Klantenvertellen, Feedback Company en de branchespecifieke platforms (Zorgkaart Nederland,
   Werkspot, Trustoo). Het model geeft platform, URL, cijfer en aantal terug.
2. **En dan controleren, want een cijfer uit een model is een gok tot het bewezen is.** De gevonden
   URL gaat door de eigen crawler (`fetchText()` in `lib/crawler.ts`, gratis) en door de bestaande
   JSON-LD-oogst (`lib/pipeline/structured-data.ts` leest al `aggregateRating` met `ratingValue` en
   `reviewCount`). Levert dat een hard cijfer op, dan is de bron **bevestigd**. Zo niet, dan staat
   hij er als **onbevestigd**, met die kwalificatie zichtbaar op het scherm.

⚠️ **Wat je daarmee niet krijgt:** de tekst van individuele reviews, en dus ook geen eigen
sentimentanalyse over die teksten. Google's eigen reviewpagina's zijn niet zonder JavaScript te
lezen. Wat we meten is wat **AI over die reviews zegt**, plus het cijfer waar dat op rust. Dat is
precies de vraag die de opdracht stelt ("waar haalt AI deze informatie vandaan"), maar het is
nadrukkelijk niet hetzelfde als een reviewanalyse.

**Later, als het de moeite waard blijkt:** een koppeling met Google Business Profile levert de echte
cijfers en de reviewteksten. Die hoort dan te werken volgens de harde regel uit
`ontwikkelplan-visie.md` §0.3: zonder sleutel gedraagt de app zich exact zoals nu, zonder
waarschuwing en zonder halve functie.

### 2.5 We meten de API, niet de ChatGPT-app die je klant gebruikt

Dat geldt al voor de bestaande meting en het geldt hier ook. ORBIT ENGINE praat met het OpenAI-model
plus web-zoeken. De consumentenversie van ChatGPT heeft eigen geheugen, eigen personalisatie en een
eigen zoeklaag, en kan dus een ander antwoord geven.

Dat hoort **op het scherm te staan**, niet alleen in dit document. Eén regel, in gewone taal:
*"Gemeten bij ChatGPT op 22 augustus. Een antwoord in de app van je klant kan iets afwijken, want
die kent zijn eigen gespreksgeschiedenis."* Dat is richtlijn 8 uit `docs/schrijfstijl.md`, bewijs
boven belofte.

---

## 3. Het product: wat de klant ziet

### 3.1 Drie getallen, en waarom niet één

Eén reputatiecijfer zou liegen. Deze drie samen liegen niet:

| Getal | De vraag | Schaal | Wat "onbekend" doet |
|---|---|---|---|
| **Toon** | Hoe praat AI over je? | -100 tot +100, 0 is neutraal | `null`, niet 0. Nul is neutraal, onbekend is iets anders |
| **Bewijskracht** | Waar rust dat op? | 0 tot 100 | 0 is een echte uitkomst: AI verzint het |
| **Eenduidigheid** | Krijg je elke keer hetzelfde antwoord? | 0 tot 100 | `null` bij één meting, alleen bij diepe modus gevuld |

De **combinatie** is het product. Vier situaties, vier heel verschillende adviezen:

| Toon | Bewijskracht | Wat er staat | Wat de klant moet doen |
|---|---|---|---|
| +70 | 85 | AI is positief over je, op basis van 340 Google-reviews en de vakpers | Vasthouden, en die bronnen benoemen in je content |
| +65 | 10 | AI is aardig tegen je, maar baseert dat op niets | Reviews verzamelen. Dit cijfer is lucht |
| -20 | 70 | AI noemt levertijd en prijs als bezwaar, met bronnen erbij | Dit is de agenda voor het volgende kwartaal |
| `null` | 0 | AI kent je niet | Zichtbaarheid eerst, reputatie later |

⚠️ Rij twee is de meest voorkomende uitkomst bij een MKB-bedrijf, en zonder de tweede kolom zou de
app daar een gerustgesteld bedrijf van maken.

**Hoe de getallen tot stand komen** staat in een pure module, `lib/reputation/score.ts`, zonder
`server-only` en dus testbaar (conventie 2). Het model geeft per antwoord een label en de
onderbouwing; **de code rekent, het model niet**. Precies zoals `baseline-verdict.ts` het oordeel
over de kennistest velt in plaats van het model.

- **Toon** is het gewogen gemiddelde van de toonscores per antwoord (-2 tot +2, geschaald naar
  -100 tot +100). Antwoorden zonder bron wegen mee met factor 0,3: ze zeggen iets, maar minder.
- **Bewijskracht** is samengesteld uit: het aantal unieke bevestigde bronnen, het aandeel bronnen
  dat níet de eigen site is, en de aanwezigheid van reviewplatforms met een gecontroleerd cijfer.
- **Eenduidigheid** is de spreiding over de herhalingen, via `binomialStderr()` en `confidenceBand()`
  uit `lib/stats/uncertainty.ts`, waar de meting ook al mee rekent.

### 3.2 Het scherm, zeven blokken van boven naar beneden

Adres: `/merk/[id]/analytics/reputatie`. Kop: **Mijn reputatie**. Subkop, één zin:
*"Hoe AI over je praat, per dienst, en waar dat beeld vandaan komt."*

**Blok 1 · De uitspraak.** Eén zin in gewone taal, gevolgd door de drie getallen. Bijvoorbeeld:
*"ChatGPT praat overwegend positief over Van den Udenhout en baseert dat vooral op je eigen website.
Er staan 3 reviewplatforms tegenover, en op één daarvan sta je niet."* Daaronder de peildatum en de
engine als mono-label: `ChatGPT · 22 aug 2026 · 35 vragen`.

**Blok 2 · Zonder opzoeken tegenover met opzoeken.** Twee kaarten naast elkaar. Links: wat het model
uit zichzelf over je zegt. Rechts: wat het zegt als het mag zoeken. Het **verschil** is het inzicht.
Weet het model uit zichzelf niets en met zoeken alles, dan is je reputatie volledig afhankelijk van
wat er online staat, en dan is off-site werk het antwoord. Weet het uit zichzelf iets verouderds,
dan is dat een probleem dat je met content niet oplost.

Dit blok leunt op hetzelfde idee als de kennistest (`llm-baseline.ts`, blokken `kent` en `citeert`)
en gebruikt bewust dezelfde woorden op het scherm, zodat een klant die beide ziet niet twee talen
hoeft te leren.

**Blok 3 · Waar AI dit vandaan haalt.** De bronnenlijst, gesorteerd op hoe vaak AI hem aanhaalde.
Per bron: domein, soort (reviewplatform, vakpers, je eigen site, sociale media, register), hoe vaak
aangehaald, en bij reviewplatforms het cijfer met het aantal beoordelingen plus een chip
`bevestigd` of `onbevestigd`. Onderaan één regel die de verhouding samenvat: *"7 van de 11 bronnen
zijn je eigen site."*

**Blok 4 · Per product en dienst.** De kern van het scherm. Eén regel per aanbodknoop, gesorteerd op
toon van laag naar hoog, want het probleem hoort bovenaan:

```
Bekkenfysiotherapie      · toon  +12 · bewijs 20 · "AI noemt je, maar zonder onderbouwing"
Sportmassage             · toon  +68 · bewijs 74 · "Sterk, met 3 externe bronnen"
Dry needling             · toon  null · bewijs  0 · "AI heeft hier geen beeld van"
```

Elke regel klapt open naar: de gestelde vraag, het letterlijke antwoord van AI (ingekort, met een
link naar het volledige antwoord), de genoemde pluspunten, de genoemde minpunten, en de bronnen.
Dat is de eis "geef de klant een score en een korte uitleg", plus de mogelijkheid om na te lezen
waar die score op rust.

**Blok 5 · Sterk en kwetsbaar.** Twee lijsten uit de synthese, elk met het bewijs eronder: welke
eigenschappen AI structureel aan je koppelt, en welke bezwaren terugkomen. Alleen punten die in
**minstens twee** antwoorden voorkomen, anders is het toeval en geen patroon.

**Blok 6 · Wat dit niet is.** Vier regels, klein, altijd zichtbaar: één AI-assistent, één moment,
N vragen, en de opmerking over de consumentenversie van ChatGPT uit §2.5. Dit blok verdwijnt nooit
en wordt nooit ingeklapt.

**Blok 7 · De vervolgstap.** Vandaag één regel: *"Dit scherm laat zien hoe je ervoor staat. Wat je
eraan doet, bepaal je met je consultant."* ⚠️ Er komt **geen** knop die iets belooft wat er niet is.
Fase 2 vult dit blok, zie §11.

### 3.3 De staten, allemaal

`docs/ux-design.md` eist per scherm een lege staat, een laadstaat en een foutstaat. Deze pagina
heeft er zeven.

| Staat | Wanneer | Wat er staat |
|---|---|---|
| **Kan nog niet** | Onboarding niet af | De regels uit `assessReadiness()` die nog open staan, met een springlink erheen. Geen knop |
| **Klaar om te starten, beheerder** | Onboarding af, nog geen run | De knop, met wat het gaat doen, hoe lang het duurt en wat het kost |
| **Klaar om te starten, klant** | Idem, geen beheerder | Wat de analyse oplevert, en: *"Een reputatieanalyse zet je consultant voor je in gang. Laat weten dat je hem wilt, dan plannen we hem in."* De knop staat er niet, uitgeschakeld of wel |
| **Loopt** | Run bezig | Voortgang via `lib/jobs/progress.ts`, met de resterende tijd en welke stap loopt |
| **Klaar** | Run af | De zeven blokken |
| **Budget op** | Plafond geraakt | Wat er wél gemeten is, wat er is overgeslagen, en het cijfer met de kanttekening dat het op minder vragen rust |
| **Mislukt** | Te weinig geslaagde vragen | Geen half cijfer. Wat er misging, en de knop om opnieuw te proberen, alleen voor de beheerder |

⚠️ De **klantstaat** is de belangrijkste van de zeven. De opdracht zegt: andere gebruikers krijgen
een melding dat ze contact moeten opnemen. Dat komt in `lib/cost-rules.ts` als zesde handeling,
`reputatie_starten`, in dezelfde toon als de vijf die er staan: het is geen deur die dichtslaat,
het is werk dat de consultant in gang zet.

### 3.4 Wie mag de knop indrukken

Drie lagen, alle drie bestaand, geen nieuwe rechtenlogica:

1. **Zien** mag iedereen die bij het merk mag (`getOwnedProfile()`, de drie lagen uit
   `lib/access.ts`).
2. **Starten** mag alleen de beheerder (`mayTriggerCost()`, besluit 18). Dat is exact wat de
   opdracht vraagt, en het staat er al.
3. **Doorgaan** mag alleen als het budget het toelaat (`checkBudgetForProfile()` voor het
   maand- en dagplafond, plus de eigen runlimiet van €3).

⚠️ De knop wordt **niet** verborgen voor de klant. Verbergen betekent dat hij niet weet dat dit
bestaat, en dit is een product dat je wilt verkopen. Hij ziet wat het is, wat het oplevert, en bij
wie hij moet zijn.

---

## 4. De analyse: wat ORBIT ENGINE precies vraagt

### 4.1 Eerst kiezen: welke aanbodknopen gaan mee

De aanbodboom mag tot 60 knopen hebben (`MAX_NODES` in `lib/pipeline/offering.ts`). Alles meten is
duur, traag en levert een scherm op dat niemand leest. De selectie gebeurt deterministisch in
`lib/reputation/select-nodes.ts`, puur en testbaar, in deze volgorde:

1. **Wat de consultant als prioriteit invulde** (`profiles.priority_offerings`, migratie 0060) gaat
   altijd mee.
2. **Wat de consultant wegzette** (`profiles.deprioritised_offerings`) gaat er altijd af.
3. **Knopen waar een goedgekeurd onderwerp naar wijst** (via `topic-link.ts`), op de prioriteit die
   `propose_topics` al aan die onderwerpen gaf. Die weging is er al en is per merk gemaakt.
4. **Aanvullen** met knopen van het soort `dienst` en `product` op `sort_order`, en pas als die op
   zijn met `categorie`.
5. **Nooit** de soorten `merk` en `vestiging`. Bij een retailer zijn de gevoerde merken niet zijn
   reputatie maar die van iemand anders, en een vestiging is een plaats, geen dienst.
6. **Afkappen** op 12 (standaard) of 25 (diep).

⚠️ Dezelfde valkuil als bij de kennistest, en die is daar één keer ingelopen: neem **niet** simpelweg
de eerste knopen van de boom. Die volgorde komt van de website en zet de algemeenste diensten
bovenaan, precies waar iedereen op concurreert. `llm-baseline.ts` heeft dat op 4 augustus 2026
rechtgezet door de onderwerpen te laten kiezen; deze selectie doet hetzelfde.

**De selectie wordt vastgelegd** in `reputation_runs.scope_json`. Zonder dat is een herhaling over
drie maanden niet te vergelijken met deze, want dan weet niemand meer of het verschil in de
reputatie zat of in de vraag.

### 4.2 Blok A: merkbreed

Zes tot acht vragen, allemaal met de merknaam erin. De ongegronde vragen meten wat er in het model
zélf zit, de gegronde wat het vindt.

| # | Vraag (naar het Nederlands, met merknaam en plaats ingevuld) | Zoeken | Waarom |
|---|---|---|---|
| A1 | Wat weet je over {merk} in {plaats}? Waar staan ze om bekend? | nee | Het parametrische beeld. Dit is wat er zonder internet over je bestaat |
| A2 | Zelfde vraag | ja | Het verschil met A1 is blok 2 op het scherm |
| A3 | Wat zeggen klanten over {merk}? Noem concrete ervaringen en waar die staan | ja | De kern. Levert de toon en de bronnen |
| A4 | Wat zijn de nadelen van {merk}? Waar zijn klanten ontevreden over? | ja | ⚠️ De belangrijkste vraag van de hele analyse, zie §2.1 |
| A5 | Is {merk} betrouwbaar om zaken mee te doen? Waarom wel of niet? | ja | De koopdrempel, en de vraag die een echte klant stelt |
| A6 | {merk} of {concurrent}: welke zou je aanraden en waarom? | ja | De vergelijking. De concurrent komt uit `analysis_entities` of het marktonderzoek |
| A7 | Zelfde met de tweede concurrent | ja | Eén vergelijking is een anekdote |

In de diepe modus draaien A1, A3 en A4 **drie keer**, om de eenduidigheid te kunnen meten. Dat is
hetzelfde idee als `measureRepeats` bij de meting.

⚠️ **De naamsverwarring hoort erin.** Elke vraag krijgt de uitsluitingen mee die de kennistest al
verzamelt (`profiles.name_exclusions`, migratie 0060): *"Het gaat om het bedrijf in {plaats}, niet
om gelijknamige bedrijven elders."* Zonder dat meet je bij een merk als "Van der Valk" de reputatie
van vijftig anderen mee.

### 4.3 Blok B: per aanbodknoop

Eén gegronde vraag per gekozen knoop, twee in de diepe modus:

- **B1:** *"Wat is de reputatie van {merk} op het gebied van {dienst}? Wat zeggen klanten daarover,
  en waar staat dat?"*
- **B2 (alleen diep):** *"Als iemand {dienst} zoekt in {regio}, hoe verhoudt {merk} zich dan tot de
  alternatieven? Wat is het sterke punt en wat is het zwakke punt?"*

De naam van de knoop gaat er letterlijk in, met zijn omschrijving en doelgroep als context als die
gevuld zijn (`profile_offerings.description`, `.audience`). Zit de knoop onder een categorie, dan
gaat die categorie mee als context, anders wordt "onderhoud" een vraag over onderhoud in het
algemeen.

⚠️ **B2 is nadrukkelijk geen tweede zichtbaarheidsmeting.** De vraag noemt het merk, dus hij meet
niet of je gevonden wordt. Dat doet de meting al, en dat werk hoort niet dubbel gedaan te worden.

**Wat er gratis bij komt.** Waar een aanbodknoop via `topic-link.ts` aan een onderwerp hangt waar
metingen op staan, zet het scherm de zichtbaarheidsscore ernaast. Nul extra kosten, en het is de
zin die de klant het langst onthoudt: *"Je wordt bij 8 van de 30 vragen genoemd, en als je genoemd
wordt is de toon positief."*

### 4.4 Blok C: bronnen en reviews

- **C1 (gegrond):** *"Welke beoordelingen en reviews staan er online over {merk} in {plaats}? Noem
  per platform de naam, de URL, het cijfer en het aantal beoordelingen. Weet je het niet zeker, zeg
  dat dan."*
- **C2 (gegrond):** *"Op welke onafhankelijke websites, vakmedia of vergelijkers wordt {merk}
  genoemd?"*
- **C3 (geen AI):** alle URL's die in **elk** antwoord van deze run zijn aangehaald, gegroepeerd op
  domein met `domainOf()` uit `lib/offsite/domain.ts`, met `IGNORED_DOMAINS` eraf. Puur tellen.
- **C4 (geen AI, wel netwerk):** elke gevonden reviewpagina door `fetchText()` en de JSON-LD-oogst
  van `structured-data.ts`. Levert dat `aggregateRating` op, dan staat het cijfer vast en gaat de
  bron op `bevestigd`.
- **C5 (goedkoop, ongegrond):** één aanroep die alle gevonden domeinen indeelt in reviewplatform,
  vakpers, eigen site, sociale media, register of overig. Eén aanroep voor de hele lijst, niet één
  per domein, precies zoals `lib/offsite/presence.ts` dat doet.

⚠️ **Het vangnet op C1.** Een cijfer zonder URL wordt weggegooid. Een URL waarvan het domein niet in
de bekende platformlijst staat én die bij het ophalen de merknaam niet bevat, wordt weggegooid. Wat
overblijft en niet bevestigd kon worden, staat er als onbevestigd. Dit is hetzelfde patroon als
`validate-claims.ts`: het model levert de kandidaat, de code besluit.

### 4.5 Blok D: de synthese

Eén aanroep op de kwaliteitstier, ongegrond, die alles wat hierboven verzameld is samenvat tot:
de zin voor blok 1, de sterke punten, de kwetsbare punten, en per aanbodknoop de uitleg van één of
twee zinnen.

⚠️ **De synthese rekent niet.** De drie getallen zijn dan al berekend door `lib/reputation/score.ts`
en gaan als gegeven de prompt in. Het model schrijft de uitleg, het bepaalt de uitkomst niet. Zou je
dat omdraaien, dan verschilt het cijfer per keer dat je het vraagt en is geen enkele vergelijking
over de tijd nog iets waard.

De schrijfregels uit `docs/schrijfstijl.md` gaan mee in de prompt, inclusief regel 9 over
gedachtestreepjes, precies zoals `lib/pipeline/content.ts` dat doet. Deze tekst komt op het scherm
van de klant.

### 4.6 De oordeelslaag staat los van de vraag

Per antwoord uit blok A en B draait één **goedkope, ongegronde** beoordeling die het antwoord omzet
in een structuur. Dit is de tweede helft van hetzelfde patroon als halte 3a en 3b van de meting: het
model dat antwoordde, beoordeelt zichzelf niet.

```
toon:            positief | overwegend_positief | neutraal | gemengd | negatief | onbekend
toon_score:      2 | 1 | 0 | 0 | -2 | null      (gemengd is 0 met een vlag, niet hetzelfde als neutraal)
pluspunten:      string[]   wat er letterlijk positief genoemd wordt
minpunten:       string[]   wat er letterlijk negatief genoemd wordt
grondslag:       reviews | eigen_site | pers | sociale_media | geen | onbekend
citaten:         [{ tekst, bron_url }]   letterlijk, om na te kunnen lezen
noemt_merk:      boolean    ging het antwoord überhaupt over dit merk
```

**Drie vangnetten in code** (conventie 1, want een promptinstructie is een intentie):

1. `noemt_merk === false` maakt `toon_score` altijd `null`. Een model dat over een ander bedrijf
   praat, mag geen toon opleveren. Dit is exact de fout die bij `mention_role` is opgetreden:
   structured output kiest bij twijfel de eerste waarde uit de lijst.
2. `grondslag === "geen"` haalt het antwoord uit het merkcijfer, maar bewaart het wel. Zie de harde
   regel in §2.1.
3. Elk citaat waarvan de tekst niet letterlijk in het opgeslagen antwoord voorkomt, gaat eruit. Dat
   is dezelfde controle als `quote-check.ts` doet.

### 4.7 Waar alles blijft staan

Conventie 8: elke aanroep bewaart zijn volledige ruwe JSON naast de uitgesplitste kolommen. Bij dit
product is dat geen boekhouding maar functionaliteit: het scherm laat de klant het letterlijke
antwoord teruglezen, en dat is het verschil tussen een cijfer dat je gelooft en een cijfer waar je
iets mee doet.

---

## 5. De rekensom: wat het kost

Tarieven uit `lib/openai/pricing.ts`, geverifieerd op 1 augustus 2026:
`gpt-5.6-luna` $0,20 per miljoen invoertokens en $1,20 per miljoen uitvoertokens, een web-zoekactie
op een redeneermodel $0,01 per aanroep.

| Soort aanroep | Reken mee | Per stuk |
|---|---|---|
| Gegronde vraag | $0,01 zoekactie + ± 15.000 invoertokens + ± 1.500 uitvoertokens | **$0,015** |
| Ongegronde vraag | ± 1.000 invoer + ± 800 uitvoer | **$0,001** |
| Beoordeling | ± 2.500 invoer + ± 400 uitvoer | **$0,001** |
| Synthese | ± 12.000 invoer + ± 2.500 uitvoer | **$0,006** |

**Standaardmodus:**

| Blok | Aanroepen | Kosten |
|---|---|---|
| A, merkbreed | 1 ongegrond + 6 gegrond | $0,092 |
| A, beoordelingen | 7 | $0,007 |
| B, 12 knopen | 12 gegrond | $0,180 |
| B, beoordelingen | 12 | $0,012 |
| C, bronnen | 2 gegrond + 1 indeling | $0,031 |
| C, controle van reviewpagina's | 0, eigen crawler | $0,000 |
| D, synthese | 1 | $0,006 |
| **Totaal** | **42** | **$0,33, ongeveer €0,31** |

**Diepe modus:** 25 knopen met 2 vragen elk, 3 herhalingen op A1, A3 en A4, samen 95 aanroepen,
**$1,03, ongeveer €0,96**.

⚠️ **Waar de schatting fout kan gaan:** het aantal invoertokens bij een gegronde vraag. Web-zoeken
haalt pagina's op en die tellen als invoer. Bij een merk met veel online aanwezigheid kan dat
oplopen naar 40.000 tokens, en dan wordt een gegronde vraag $0,02 in plaats van $0,015. De diepe
modus komt daarmee op ongeveer €1,40. Nog steeds ruim binnen €3, en het plafond vangt de rest.

**Doorlooptijd.** Een gegronde aanroep duurt 20 tot 40 seconden. Verdeeld over de wachtrij, met de
knopen parallel, landt de standaardmodus op **4 tot 6 minuten** en de diepe op **10 tot 14 minuten**.
Dat past bij de rest van de app: de onboarding doet er ongeveer 7,5 minuut over.

---

## 6. Datamodel, migratie 0062

Additief en idempotent, geen enkele `drop` (conventie 4). Vier tabellen plus één kolom op een
bestaande.

### `reputation_runs`, één rij per analyse

```
id, profile_id, engine (default 'openai'),
depth ('standaard' | 'diep'),
status ('queued' | 'running' | 'klaar' | 'mislukt' | 'budget_op'),
started_by (auth.users), started_at, finished_at,
tone_index numeric null,          -- -100 tot 100, null is onbekend
evidence_score numeric null,      -- 0 tot 100
consistency numeric null,         -- 0 tot 100, alleen bij herhalingen
summary text, strengths text[], weaknesses text[],
questions_planned int, questions_done int,
cost_usd numeric(10,6), budget_eur numeric,
scope_json jsonb,                 -- welke knopen meegingen, en waarom
notes text[]                      -- wat overgeslagen is, en waarom
```

⚠️ `tone_index` is `null` en niet `0` als er geen oordeel te vellen viel. Nul betekent neutraal.
Conventie 3, en dit is precies de plek waar hij het meest kost als je hem vergeet.

### `reputation_answers`, één rij per gestelde vraag

Draagt zowel het ruwe antwoord als het oordeel, net als `tracking_runs` dat doet met `raw_response`
en `mention_json`. Reden: het maakt de beoordeling **opnieuw te proberen zonder de dure vraag
opnieuw te stellen**, en dat is bij de meting de belangrijkste kostenbescherming gebleken.

```
id, run_id, block ('merk'|'aanbod'|'vergelijking'|'bron'),
offering_id null, question text, web_search bool, repeat_index int default 0,
answer_text text, raw_json jsonb, cited_urls text[],
verdict_json jsonb null,          -- null = beoordeling nog niet gelukt, mag opnieuw
tone text null, tone_score int null,
pros text[], cons text[], grounding text null, mentions_brand bool null,
model text, cost_usd numeric(10,6), created_at
unique (run_id, block, offering_id, question, repeat_index)
```

Die unieke sleutel is de idempotentie (conventie 9): een taak die twee keer draait stelt de vraag
één keer.

### `reputation_offering_scores`, één rij per aanbodknoop

```
id, run_id, offering_id, offering_name, offering_kind,
tone_index numeric null, evidence_score numeric null, answers int,
summary text, top_pros text[], top_cons text[], source_domains text[],
visibility_score numeric null     -- uit de bestaande meting, als die er is. Gratis
```

⚠️ `offering_name` staat er **naast** `offering_id`, met opzet. Een herhaalonderzoek kan de
aanbodboom herschrijven en dan wijst het id nergens meer heen. De naam bewaart wat er gemeten is.

### `reputation_sources`, waar AI het vandaan haalt

```
id, run_id, domain, kind ('review'|'vakpers'|'eigen'|'sociaal'|'register'|'overig'),
citations int, url text null,
rating numeric null, rating_count int null,
verified bool default false,      -- door de eigen crawler bevestigd via JSON-LD
first_seen_block text
```

### Eén kolom erbij op `ai_calls`

```
alter table public.ai_calls add column if not exists reputation_run_id uuid
  references public.reputation_runs (id) on delete set null;
```

Zonder deze kolom is niet te tellen wat één run heeft gekost, en dan is het plafond van €3 niet af te
dwingen. Migratie 0053 deed hetzelfde met `account_id`, met dezelfde onderbouwing: een logboek hoort
de dimensie te dragen waarop je afrekent. `CallMeta` in `lib/openai/ledger.ts` krijgt het veld erbij.

### RLS

Alle vier de tabellen: RLS aan, **SELECT-only** policies volgens hetzelfde patroon als
`profile_offerings` (migratie 0056 heeft de accountlaag, 0038 de beheerderslaag). Schrijven gaat
uitsluitend via de service-role key in de API-route en de jobhandlers (conventie 6).

---

## 7. De taken in de wachtrij

Vijf nieuwe taaksoorten in `lib/jobs/types.ts`. Eén taak is hooguit één zwaar blok (conventie 7).

| Taak | Wat hij doet | Zwaar? | Ketent naar |
|---|---|---|---|
| `reputation_start` | Knopen kiezen, run aanmaken, de rest inplannen | nee | alle onderstaande |
| `reputation_brand` | Blok A, 6 tot 8 korte aanroepen parallel, plus de beoordelingen | ja, één blok | telt af |
| `reputation_offering` | Blok B voor **één** knoop, plus de beoordeling | ja, 1 tot 2 aanroepen | telt af |
| `reputation_sources` | Blok C, inclusief de crawl-controle | ja, één blok | telt af |
| `reputation_synthesis` | De getallen rekenen, blok D schrijven, run afsluiten | ja, 1 aanroep | einde |

**Hoe de synthese weet dat hij mag.** Dezelfde constructie als
`scheduleAggregateIfLastPrompt()` in `lib/jobs/handlers.ts`: elke afrondende taak telt hoeveel
antwoorden er nu staan tegenover `questions_planned`, en de laatste plant de synthese in. Eén
dedupe-sleutel per run zorgt dat er nooit twee synthesetaken ontstaan.

**Dedupe-sleutels** in `lib/jobs/dedupe.ts`, puur en getest:

```
reputationStart:     (profileId, runId) => `rep_start:${runId}`
reputationBrand:     (runId) => `rep_brand:${runId}`
reputationOffering:  (runId, offeringId) => `rep_offering:${runId}:${offeringId}`
reputationSources:   (runId) => `rep_sources:${runId}`
reputationSynthesis: (runId) => `rep_synthesis:${runId}`
```

⚠️ De sleutel hangt aan de **run** en niet aan het profiel. Een tweede scan over drie maanden is
nieuw werk en geen duplicaat, en dat moet uit de sleutel blijken.

**De budgetpoort staat vóór elke zware taak**, niet alleen aan het begin. `lib/reputation/budget.ts`
telt de som van `ai_calls.cost_usd` voor deze `reputation_run_id` en vergelijkt met €3. Zit een taak
er niet meer in, dan slaat hij zichzelf over, schrijft dat in `reputation_runs.notes`, en de run gaat
op `budget_op` in plaats van op `klaar`. De klant ziet dan een cijfer met een kanttekening in plaats
van een cijfer dat doet alsof er niets aan de hand was.

---

## 8. Implementatie in vijf sprints

Elke sprint eindigt groen op de vier vaste controles: `npx tsc --noEmit`, `npm run test:unit`,
`npm run test:chain`, `npm run build`.

### Sprint R1 · Het fundament, zonder één AI-aanroep

**Bestanden**

- `supabase/migrations/0062_reputatie.sql`, de vier tabellen, de kolom op `ai_calls`, de RLS
- `lib/types/database.ts`, de vier interfaces
- `lib/reputation/select-nodes.ts`, puur, de selectie uit §4.1
- `lib/reputation/score.ts`, puur, de drie getallen uit §3.1
- `lib/reputation/tone.ts`, puur, de toonschaal en de labels in het Nederlands
- `lib/reputation/sources.ts`, puur, indelen en tellen van domeinen
- `lib/reputation/budget.ts`, het plafond van €3
- `lib/openai/ledger.ts`, `CallMeta` krijgt `reputationRunId`
- `supabase/README.md`, de index bijgewerkt

**Verificatie:** `npm run test:unit` bevat tests die aantonen dat een aanbodboom van 60 knopen tot
12 gekozen knopen leidt met de prioriteiten bovenaan, dat een antwoord zonder bron niet in het
merkcijfer terechtkomt, en dat een run zonder enig bruikbaar antwoord `null` oplevert en niet 0.

### Sprint R2 · De pijplijn

**Bestanden**

- `lib/schemas/reputation.ts`, de Zod-contracten voor de beoordeling, de bronnen en de synthese
- `lib/pipeline/reputation-brand.ts`, blok A
- `lib/pipeline/reputation-offering.ts`, blok B
- `lib/pipeline/reputation-sources.ts`, blok C, inclusief de crawl-controle
- `lib/pipeline/reputation-verdict.ts`, de oordeelslaag plus de drie vangnetten uit §4.6
- `lib/pipeline/reputation-synthesis.ts`, blok D
- `lib/jobs/types.ts`, `lib/jobs/dedupe.ts`, `lib/jobs/handlers.ts`, `lib/jobs/chain.ts`

**Verificatie:** een ketentest in `scripts/test-chain.ts` die een run van start tot synthese draait
tegen echte Postgres met de teststub voor OpenAI, en aantoont dat de synthese pas start als de
laatste knoop klaar is, dat een tweede keer inplannen niets extra's doet, en dat een geraakt
budgetplafond de run op `budget_op` zet met een notitie erbij.

### Sprint R3 · Het scherm

**Bestanden**

- `app/(app)/merk/[id]/analytics/reputatie/page.tsx`, de zeven blokken
- `app/(app)/merk/[id]/analytics/reputatie/loading.tsx`
- `app/(app)/merk/[id]/analytics/reputatie/_components/start-reputation-button.tsx`
- `app/(app)/merk/[id]/analytics/reputatie/_components/tone-chip.tsx`
- `app/(app)/merk/[id]/analytics/reputatie/_components/offering-rows.tsx`
- `app/api/profiles/[id]/reputation/route.ts`, `POST` om te starten, met de drie lagen uit §3.4
- `lib/cost-rules.ts`, de handeling `reputatie_starten` met zijn melding
- `lib/nav.ts` en `docs/ux-design.md` §5, na het besluit uit §2.2
- `scripts/test-unit.ts`, de bewakende navigatietest bijgewerkt

**Verificatie:** de zeven staten uit §3.3 zijn met de hand na te lopen op een merk op productie, en
de klantstaat toont de melding zonder werkende knop. Een niet-beheerder die de route rechtstreeks
aanroept krijgt 403 met dezelfde tekst.

### Sprint R4 · Nagerekend op productie

Conventie 10: gebouwd is niet geverifieerd.

- Eén echte run op een echt merk, in standaardmodus.
- De kosten narekenen tegen `ai_calls` waar `reputation_run_id` gevuld is, en het bedrag naast de
  schatting uit §5 leggen.
- Handmatig controleren of het toonoordeel klopt met wat er in `answer_text` staat, bij minstens
  tien antwoorden. Wijkt het af, dan is dat een promptcorrectie plus een vangnet, geen prompttweak.
- **De vlakheidstoets uit §2.1**: als alle antwoorden positief of neutraal zijn, is dat dan waar of
  is het beleefdheid? Meet dat door één run te draaien op een merk waarvan je weet dat er kritiek
  online staat.

**Verificatie:** een korte notitie in `docs/logbook.md` met de gemeten kosten, de gemeten
doorlooptijd en de uitkomst van de vlakheidstoets. Klopt de toets niet, dan gaat R5 niet door en
wordt de meetopzet herzien.

### Sprint R5 · De diepe modus en de herhaling

- De keuze standaard tegenover diep bij het starten.
- Herhalingen en het eenduidigheidscijfer.
- Een tweede run naast de eerste zetten, met het verschil erbij. `lib/pipeline/period-change.ts`
  rekent al met periodeverschillen en met betekenisvolle verandering; die rekenkunde hoort hier
  hergebruikt, niet nagebouwd.

**Verificatie:** twee runs op hetzelfde merk laten een verschil zien dat volgens
`changeIsMeaningful()` betekenisvol is of expliciet niet, en het scherm zegt welke van de twee.

---

## 9. Wat we testen

**Unit** (`scripts/test-unit.ts`), alles zonder database en zonder sleutel:

- de knopenselectie: prioriteiten bovenaan, weggezette knopen eruit, `merk` en `vestiging` nooit
  erin, afkappen op de juiste grens
- de toonschaal: elk label naar het juiste getal, `onbekend` naar `null`
- het merkcijfer: antwoorden zonder bron wegen lichter, een run zonder bruikbaar antwoord levert
  `null`
- de bewijskracht: alleen eigen site levert een laag getal, ook bij tien vermeldingen
- de domeinindeling: een reviewplatform wordt herkend, de eigen site wordt niet als externe bron
  geteld
- het budget: een taak die er niet meer in past wordt overgeslagen en levert een notitie
- de navigatiegrens: Analytics mag vier, de andere klanthoofdstukken drie

**Keten** (`scripts/test-chain.ts`), echte handlers tegen echte Postgres:

- de volledige keten van start tot synthese, met de synthese als laatste
- twee keer starten levert één run
- een mislukte beoordeling wordt opnieuw geprobeerd zonder de dure vraag opnieuw te stellen
- een geraakt budgetplafond zet de run op `budget_op` en het scherm krijgt een gedeeltelijk resultaat
- een merk zonder aanbodboom levert een nette weigering en geen lege run

⚠️ **Waarom de nadruk op de ketentests.** Zeven van de zeven fouten van het vorige traject zaten in
de samenhang tussen taken en geen enkele unittest kon ze vangen. Dit onderdeel heeft vijf taaksoorten
die op elkaar wachten, dus dat risico is hier groter dan gemiddeld.

---

## 10. Het commerciële plaatje

### Wat het kost en wat het mag opbrengen

| | Bedrag |
|---|---|
| Kostprijs, standaard | ± €0,31 |
| Kostprijs, diep | ± €0,96, uitschieter tot €1,40 |
| Plafond in code | €3,00 |

De kostprijs is dus **niet** wat dit product waard is. Wat je verkoopt is het uur waarin je de
uitkomst bespreekt, en het feit dat niemand anders in Nederland dit cijfer kan leveren.

**Suggestie, geen besluit:** een losse Reputatiescan als eenmalige opdracht, ergens tussen €295 en
€495, inclusief het gesprek waarin je hem doorneemt. Of als vast onderdeel van de instap, waarmee
het demogesprek een cijfer krijgt in plaats van een belofte. Dat past bij sales-led: de scan is dan
het bewijs dat je iets ziet wat de klant zelf niet kan zien.

### Hoe de facturatie loopt

Er is geen self-serve betaalstroom in de app en die komt er in dit plan ook niet. De rem is dat
alleen de beheerder kan starten, en de factuur komt van jou. Dat is precies de bestaande werkwijze
en er hoeft niets voor gebouwd te worden.

⚠️ Wat er wél moet: `reputation_runs.cost_usd` per run zichtbaar op het diagnosescherm onder Admin,
zodat je marge geen aanname is.

### Waar dit past in de verkoop

De scan is de scherpste demo die dit product heeft. De onboarding laat zien wat ORBIT ENGINE **weet**;
de reputatiescan laat zien wat het internet over de klant **zegt**, en die tweede raakt harder. Een
ondernemer die leest dat ChatGPT hem "een prima keuze voor kleine klussen" noemt terwijl hij van
grote projecten leeft, heeft binnen één zin begrepen waarom dit product bestaat.

---

## 11. Fase 2: van inzicht naar verbetering

Nadrukkelijk **niet in dit plan**, en dus ook niet in de app te zien of te beloven. Wel de richting,
zodat fase 1 er niet omheen gebouwd wordt.

1. **Van minpunt naar contentpagina.** Een terugkerend bezwaar is een briefing. De keten
   `content_brief`, `content_draft` en `content_revise` staat er al en neemt een aanbeveling met
   doelvragen aan. Een reputatiebezwaar past in dat formaat.
2. **Van ontbrekende bron naar off-site actie.** `offsite_tasks` bestaat al, met een status. Staat
   de klant niet op het reviewplatform dat AI het vaakst aanhaalt, dan is dat een taak en geen
   observatie.
3. **Van weinig reviews naar reviewacquisitie.** Buiten de app, maar de app kan wel benoemen hoeveel
   er nodig zijn om het beeld te kantelen.
4. **De herhaalmeting als bewijs.** Drie maanden later dezelfde scan, met het verschil ernaast. Dat
   is de enige manier waarop dit product zichzelf terugverdient in de ogen van de klant, en het is
   ook wat `visie.md` bedoelt met een motor die meet en opnieuw optimaliseert.

⚠️ Eén ontwerpregel voor fase 2, nu al: **een advies zonder gemeten bezwaar eronder komt er niet
in.** Anders wordt dit een generator van algemene marketingadviezen, en die zijn gratis.

---

## 12. Wat er bewust niet in zit

| Niet gebouwd | Waarom niet |
|---|---|
| Andere AI-assistenten dan ChatGPT | De opdracht zegt alleen ChatGPT. De enginelaag (`lib/engines/`) is er al, dus Gemini erbij is later één kolom en geen herbouw |
| De teksten van individuele reviews | Niet op te halen zonder koppeling met de platforms zelf. Zie §2.4 |
| Een eigen reputatiescore per concurrent | Verleidelijk, maar het verdubbelt de kosten en de app meet concurrenten al op zichtbaarheid |
| Waarschuwingen bij verslechtering | Vereist herhaling op schema. Dat kan pas als er twee runs bestaan, sprint R5 en verder |
| Zelf betalen in de app | Sales-led, er is geen betaalstroom, en die bouwen voor één product is scheef |
| Reputatie in het maandrapport | Pas als de scan zich bewezen heeft. Een los product moet los te beoordelen zijn |

---

## 13. Wat jij buiten Claude Code om moet doen

1. **Het besluit uit §2.2 nemen:** Analytics naar vier bestemmingen, of Concurrenten opnemen in
   Zichtbaarheid. Zonder dat besluit kan sprint R3 niet af.
2. **De prijs bepalen** (§10). Dat bepaalt niet de bouw, maar wel wat er op het startscherm staat.
3. **Eén testmerk aanwijzen waarvan je weet dat er kritiek online staat.** Dat is de enige manier om
   de vlakheidstoets uit sprint R4 echt te doen. Een merk zonder kritiek bewijst niets.
4. **Controleren of de tarieven in `lib/openai/pricing.ts` nog kloppen** voordat R4 draait. Ze zijn
   op 1 augustus 2026 geverifieerd, en de hele rekensom in §5 hangt eraan.
5. **Beslissen of de diepe modus er komt.** Hij verdubbelt de doorlooptijd en verdrievoudigt de
   kosten, en of dat betere gesprekken oplevert weet je pas na een paar echte scans.

---

## Herkomst van de cijfers in dit document

Alles hieronder is op 22 augustus 2026 tegen de code op `main` gecontroleerd, niet uit documentatie
overgenomen.

| Bewering | Waar het vandaan komt |
|---|---|
| Sentiment kwam in 650 rijen nooit negatief uit | `supabase/migrations/0029_*.sql`, kopregels |
| Web-zoeken kost $0,01 per aanroep op een redeneermodel | `lib/openai/pricing.ts`, `WEB_SEARCH_PER_CALL_REASONING` |
| `gpt-5.6-luna` kost $0,20 en $1,20 per miljoen tokens | `lib/openai/pricing.ts`, `RATES` |
| De aanbodboom telt hooguit 60 knopen | `lib/pipeline/offering.ts`, `MAX_NODES` |
| Alleen de beheerder start betaald werk | `lib/cost-guard.ts`, besluit 18 |
| Analytics heeft drie bestemmingen en dat is een geteste grens | `lib/nav.ts`, `scripts/test-unit.ts`, `docs/ux-design.md` §5 |
| De onboarding kost ongeveer 7,5 minuut | `CLAUDE.md`, kop |
| JSON-LD levert al `aggregateRating` op | `lib/pipeline/structured-data.ts` |
| De laatste migratie is 0061 | `supabase/migrations/` |
